// src/services/ffmpegService.js

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let FFMPEG_AVAILABLE = true;
let FFMPEG_PATH = 'ffmpeg';

function checkFfmpegAvailability() {
  try {
    const chk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (chk.error || chk.status !== 0) {
      if (fs.existsSync('/usr/bin/ffmpeg')) {
        FFMPEG_AVAILABLE = true;
        FFMPEG_PATH = '/usr/bin/ffmpeg';
      } else {
        FFMPEG_AVAILABLE = false;
      }
    }
  } catch (e) {
    FFMPEG_AVAILABLE = false;
  }
}

function getFfmpegPath() {
  return FFMPEG_PATH;
}

function isFfmpegAvailable() {
  return FFMPEG_AVAILABLE;
}

module.exports = {
  checkFfmpegAvailability,
  getFfmpegPath,
  isFfmpegAvailable,
};