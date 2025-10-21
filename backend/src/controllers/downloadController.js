const { v4: uuidv4 } = require('uuid'); const { v4: uuidv4 } = require('uuid');

const { downloadFile } = require('../services/downloadService'); const path = require('path');

const { downloadFile } = require('../services/downloadService');

async function startDownload(req, res) {

  try {
    async function startDownload(req, res) {

      const { url, name, format } = req.body || {}; try {

        if (!url) return res.status(400).json({ error: 'url required' }); const { url, name, format } = req.body || {};

        if (!url) return res.status(400).json({ error: 'url required' });

        const baseName = name && name.trim() ? name.trim() : `video_${Date.now()}`;

        const outFormat = format && format.trim() ? format.trim() : 'mp4'; const baseName = name && name.trim() ? name.trim() : `video_${Date.now()}`;

        const outFormat = format && format.trim() ? format.trim() : 'mp4';

        const taskId = uuidv4();

        const taskId = uuidv4();

        try {

          const result = await downloadFile(url, { name: baseName, format: outFormat }); try {

            const result = await downloadFile(url, { name: baseName, format: outFormat });

            res.json({

              taskId, res.json({

                status: 'success', taskId,

                fileUrl: result.fileUrl, status: 'success',

                message: 'Download completed'        fileUrl: result.fileUrl,

              }); message: 'Download completed'

            } catch (error) { });

            res.status(500).json({} catch (error) {

              taskId, res.status(500).json({

                status: 'error', taskId,

                message: error.message        status: 'error',

              }); message: error.message

            }
          });

        } catch (error) {
          progress: 0,

            res.status(500).json({ error: error.message }); message: 'Queued',

  } outFile: outPath,

}      tempFile: tempPath,

        pid: null,

          module.exports = {
            process: null

  startDownload
          };

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