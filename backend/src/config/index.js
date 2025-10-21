require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  downloadDir: process.env.DOWNLOAD_DIR || 'downloads',
  logDir: process.env.LOG_DIR || 'logs',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  // Frontend-related configuration
  formats: process.env.FORMATS ? process.env.FORMATS.split(',') : ['mp4','mkv', 'webm', 'mp3', "m3u8"],
  // defaultFormat can be a simple value or an object with rules
  defaultFormat: process.env.DEFAULT_FORMAT || 'mp4',
  ui: {
    downloadButtonText: process.env.UI_DOWNLOAD_TEXT || '⬇️ Download',
    manualDownloadText: process.env.UI_MANUAL_DOWNLOAD_TEXT || '📥 Baixar Arquivo',
    anotherDownloadText: process.env.UI_ANOTHER_DOWNLOAD_TEXT || '⚡ Fazer outro download'
  },
  // If true, frontend may auto-trigger download when server completes
  autoDownload: process.env.AUTO_DOWNLOAD === 'true' || false,
};

module.exports = config;