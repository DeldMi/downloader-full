const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { uniquePath } = require('../utils/helpers');
const { log } = require('../utils/logger');
const { streamPipeline } = require('./httpFallbackService');
const fetch = require('node-fetch');

const DOWNLOAD_DIR = path.join(__dirname, '../../downloads');

async function downloadFile(url, options = {}) {
    const { name, format } = options;

    try {
        const fileName = name || `video_${Date.now()}.${format || 'mp4'}`;
        const filePath = uniquePath(DOWNLOAD_DIR, fileName);

        if (url.toLowerCase().includes('.m3u8')) {
            // HLS stream download usando ffmpeg
            return new Promise((resolve, reject) => {
                const ffmpeg = spawn('ffmpeg', [
                    '-i', url,
                    '-c', 'copy',
                    '-bsf:a', 'aac_adtstoasc',
                    filePath
                ]);

                ffmpeg.stderr.on('data', (data) => {
                    log(`ffmpeg: ${data}`);
                });

                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        const fileUrl = `/downloads/${path.basename(filePath)}`;
                        resolve({
                            status: 'success',
                            filePath,
                            fileUrl
                        });
                    } else {
                        reject(new Error(`FFmpeg process exited with code ${code}`));
                    }
                });

                ffmpeg.on('error', (err) => {
                    reject(new Error(`FFmpeg error: ${err.message}`));
                });
            });
        } else {
            // Direct download para outros tipos
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            await streamPipeline(response.body, fs.createWriteStream(filePath));

            const fileUrl = `/api/downloads/${path.basename(filePath)}`;
            return {
                status: 'success',
                filePath,
                fileUrl
            };
        }
    } catch (error) {
        log(`Download error: ${error.message}`);
        throw error;
    }
}

module.exports = {
    downloadFile
};