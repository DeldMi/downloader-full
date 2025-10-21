const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n';
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'server.log'), line);
  } catch (e) {
    console.warn('Log write failed', e);
  }
}

module.exports = {
  log,
};