require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const config = require('./src/config');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads')));

// Constants
const DOWNLOAD_DIR = path.join(__dirname, config.downloadDir || 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// In-memory task storage
const tasks = {};

// Routes
app.post('/api/download', async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const taskId = uuidv4();
    const outputFile = path.join(DOWNLOAD_DIR, `${name || 'video_' + Date.now()}.mp4`);

    tasks[taskId] = {
      status: 'pending',
      progress: 0,
      message: 'Starting download...',
      outFile: outputFile
    };

    // Return task ID immediately
    res.json({ taskId });

    // Start download process
    const ffmpeg = spawn('ffmpeg', [
      '-i', url,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      outputFile
    ]);

    tasks[taskId].status = 'downloading';
    tasks[taskId].process = ffmpeg;

    ffmpeg.on('error', (err) => {
      tasks[taskId].status = 'error';
      tasks[taskId].message = err.message;
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        tasks[taskId].status = 'completed';
        tasks[taskId].progress = 100;
        tasks[taskId].message = 'Download completed';
      } else {
        tasks[taskId].status = 'error';
        tasks[taskId].message = `Process exited with code ${code}`;
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate format endpoint - verifica se a URL/filename tem uma extensão
// compatível com os formatos do servidor e se é audio/video
app.post('/api/validate-format', (req, res) => {
  try {
    const { url, format } = req.body || {};
    if (!url && !format) return res.status(400).json({ error: 'url or format required' });

    const extFromUrl = (u) => {
      if (!u) return null;
      const clean = u.split('?')[0];
      const base = require('path').basename(clean);
      const idx = base.lastIndexOf('.');
      if (idx === -1) return null;
      return base.slice(idx + 1).toLowerCase();
    };

    const ext = (format && typeof format === 'string') ? format.toLowerCase() : extFromUrl(url);

    // minimal internal map of extension -> media type
    const mediaMap = {
      mp4: 'video', mkv: 'video', webm: 'video', ts: 'video', m3u8: 'video', mov: 'video', avi: 'video', mpg: 'video', mpeg: 'video', flv: 'video', mp3: 'audio', wav: 'audio', aac: 'audio', m4a: 'audio', ogg: 'audio', oga: 'audio', opus: 'audio'
    };

    const allowedFormats = Array.isArray(config.formats) ? config.formats.map(f => String(f).toLowerCase()) : [];

    const fileType = ext ? (mediaMap[ext] || null) : null;

    const isAllowedByConfig = ext ? allowedFormats.includes(ext) : false;

    // Only allow if extension is recognized as audio or video AND allowed by config
    const allowed = !!(fileType && (fileType === 'audio' || fileType === 'video') && isAllowedByConfig);

    res.json({ allowed, ext, fileType, allowedFormats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress/:taskId', (req, res) => {
  const task = tasks[req.params.taskId];
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  // Adiciona fileUrl se o download estiver completo
  let response = { ...task };
  if (task.status === 'completed' && task.outFile) {
    response.fileUrl = `/api/downloads/${require('path').basename(task.outFile)}`;
  }
  res.json(response);
});

// Config endpoint - retorna configurações do servidor para o frontend
app.get('/api/config', (req, res) => {
  try {
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Info endpoint
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // For now, just return basic info
    res.json({
      title: 'Video',
      format: 'mp4',
      thumbnailUrl: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = config.port || process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Downloader backend listening on port', PORT);
});