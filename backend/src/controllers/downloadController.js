// src/controllers/downloadController.js

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { streamPipeline } = require('../services/httpFallbackService');
const { log } = require('../utils/logger');
const { uniquePath, parseDurationStr } = require('../utils/helpers');
const { downloadFile } = require('../services/downloadService');

let FFMPEG_AVAILABLE = true;
let FFMPEG_PATH = 'ffmpeg';

try {
  const chk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (chk.error || chk.status !== 0) {
    if (fs.existsSync('/usr/bin/ffmpeg')) {
      FFMPEG_AVAILABLE = true;
      FFMPEG_PATH = '/usr/bin/ffmpeg';
    } else {
      FFMPEG_AVAILABLE = false;
      log('ffmpeg not found in PATH; downloads disabled');
    }
  }
} catch (e) {
  FFMPEG_AVAILABLE = false;
  log('ffmpeg check failed: ' + e.toString());
}

const tasks = {};

async function startDownload(req, res) {
  try {
    const { url, name, format } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });

    const urlLower = url.toLowerCase();
    let ext = 'mp4';
    if (urlLower.includes('.m3u8')) ext = 'm3u8';
    else if (urlLower.includes('.m3u')) ext = 'm3u';
    else {
      const parts = urlLower.split('?')[0].split('.');
      if (parts.length > 1) ext = parts[parts.length - 1];
    }

    const baseName = name && name.trim() ? name.trim() : `video_${Date.now()}`;
    const tempExt = (ext === 'm3u8' || ext === 'm3u') ? 'ts' : ext;
    const tempPath = uniquePath(path.join(__dirname, '../downloads'), baseName + '_tmp', tempExt);
    const outFormat = format && format.trim() ? format.trim() : (ext === 'm3u8' ? 'mp4' : ext);
    const outPath = uniquePath(path.join(__dirname, '../downloads'), baseName, outFormat);

    const taskId = uuidv4();
    tasks[taskId] = {
      status: 'pending',
      progress: 0,
      message: 'Queued',
      outFile: outPath,
      tempFile: tempPath,
      pid: null,
      process: null
    };

    res.json({ taskId });

    if (!FFMPEG_AVAILABLE) {
      // Handle HTTP fallback logic
      await handleHttpFallback(url, taskId, tempPath, outPath);
      return;
    }

    // Start ffmpeg process
    await startFfmpegProcess(url, taskId, tempPath, outPath, outFormat);
  } catch (err) {
    log('Error in startDownload: ' + err.toString());
    return res.status(500).json({ error: 'internal error' });
  }
}

async function handleHttpFallback(url, taskId, tempPath, outPath) {
  // Implement HTTP fallback logic here
}

async function startFfmpegProcess(url, taskId, tempPath, outPath, outFormat) {
  // Implement ffmpeg process logic here
}

exports.downloadFile = async (req, res) => {
  try {
    const result = await downloadFile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  startDownload,
};