const path = require('path');
const axios = require('axios');
const config = require('../config');
const { fetchOpenGraph } = require('../utils/fetchOpenGraph');

// Mapeamento de extensões comuns
const formatMap = {
    'm3u8': 'mp4',
    'm3u': 'mp4',
    'ts': 'mp4',
    'mp3': 'mp3',
    'wav': 'mp3'
};

// Helper para extrair extensão da URL
const extFromUrl = (url) => {
    try {
        const clean = url.split('?')[0];
        const ext = path.extname(clean).toLowerCase().slice(1);
        return ext || null;
    } catch {
        return null;
    }
};

// Helper para detectar tipo de mídia
const detectMimeType = async (url) => {
    try {
        const response = await axios.head(url);
        return response.headers['content-type'] || null;
    } catch {
        return null;
    }
};

// Determina o melhor formato baseado na URL e tipo MIME
const determineBestFormat = (url, mimeType) => {
    // 1. Tentar pela extensão da URL
    const urlExt = extFromUrl(url);
    if (urlExt) {
        // Verificar se é uma extensão mapeada
        const mappedFormat = formatMap[urlExt];
        if (mappedFormat && config.formats.includes(mappedFormat)) {
            return mappedFormat;
        }
        // Verificar se a própria extensão é um formato válido
        if (config.formats.includes(urlExt)) {
            return urlExt;
        }
    }

    // 2. Tentar pelo MIME type
    if (mimeType) {
        if (mimeType.startsWith('video/')) {
            return config.formats.find(f => ['mp4', 'mkv', 'webm'].includes(f)) || config.defaultFormat;
        }
        if (mimeType.startsWith('audio/')) {
            return config.formats.find(f => ['mp3', 'aac', 'wav', 'm4a'].includes(f)) || config.defaultFormat;
        }
    }

    // 3. Fallback para o formato padrão
    return config.defaultFormat;
};

exports.getInfo = async ({ url }) => {
    if (!url) {
        throw new Error('URL é obrigatória');
    }

    // Detectar MIME type
    const mimeType = await detectMimeType(url);

    // Buscar metadados OpenGraph
    const ogData = await fetchOpenGraph(url);

    // Determinar melhor formato
    const detectedFormat = determineBestFormat(url, mimeType);

    return {
        title: ogData?.title || null,
        format: detectedFormat,
        mimeType: mimeType,
        thumbnailUrl: ogData?.image || null,
        validFormats: config.formats,
        type: url.toLowerCase().includes('m3u8') ? 'playlist' : 'file'
    };
};