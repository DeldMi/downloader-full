// src/services/httpFallbackService.js

const fetch = require('node-fetch');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const fs = require('fs');

async function httpFallbackDownload(url, tempPath) {
  try {
    const headResp = await fetch(url, { method: 'HEAD', timeout: 10000 });
    const contentType = headResp.headers.get('content-type');

    if (contentType && (contentType.startsWith('video/') || contentType.includes('application/octet-stream'))) {
      const getResp = await fetch(url);
      if (!getResp.ok) {
        throw new Error(`HTTP download failed: ${getResp.status}`);
      }

      await streamPipeline(getResp.body, fs.createWriteStream(tempPath));
      return true;
    } else {
      throw new Error('URL not a direct video resource');
    }
  } catch (error) {
    throw new Error(`Fallback download exception: ${error.message}`);
  }
}

module.exports = {
  httpFallbackDownload,
};