require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  downloadDir: process.env.DOWNLOAD_DIR || 'downloads',
  logDir: process.env.LOG_DIR || 'logs',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
};

module.exports = config;