/**
 * Backend minimal para gerenciar downloads via ffmpeg
 * Rotas:
 *  POST /api/download  { url, name, format }
 *  GET  /api/progress/:taskId
 *  POST /api/cancel    { taskId }
 *
 * Observações: para simplicidade, as tasks são mantidas em memória.
 * Para produção, persista em DB e trate reinícios/crash.
 */
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
// Optional helpers
let ytdl;
try {
  ytdl = require('ytdl-core');
} catch (e) {
  // will handle if not installed
  ytdl = null;
}
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;
const ROOT = path.resolve(__dirname);
const DOWNLOAD_DIR = path.join(ROOT, 'downloads');
const LOG_DIR = path.join(ROOT, 'logs');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true});
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true});

// in-memory tasks: { taskId: { process, status, progress, message, outFile } }
const tasks = {};

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\\n';
  fs.appendFileSync(path.join(LOG_DIR, 'server.log'), line);
}

// Utility: ensure unique filename (base name without ext)
function uniquePath(dir, baseName, ext) {
  let candidate = path.join(dir, `${baseName}.${ext}`);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName}_${i}.${ext}`);
    i++;
  }
  return candidate;
}

// Parse simple duration strings HH:MM:SS
function parseDurationStr(s) {
  const m = s.match(/(\d+):(\d+):(\d+)/);
  if (!m) return null;
  return parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]);
}

// POST /api/download
app.post('/api/download', async (req, res) => {
  try {
    const { url, name, format } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });

    // detect extension from URL (naive)
    const urlLower = url.toLowerCase();
    let ext = 'mp4'; // default guess
    if (urlLower.includes('.m3u8')) ext = 'm3u8';
    else if (urlLower.includes('.m3u')) ext = 'm3u';
    else {
      const parts = urlLower.split('?')[0].split('.');
      if (parts.length > 1) ext = parts[parts.length-1];
    }

    // Decide base name
    const baseName = name && name.trim() ? name.trim() : `video_${Date.now()}`;
    const tempExt = (ext === 'm3u8' || ext === 'm3u') ? 'ts' : ext;
    const tempPath = uniquePath(DOWNLOAD_DIR, baseName + '_tmp', tempExt);
    // output file: convert to requested format if given, else keep original ext or mp4
    const outFormat = format && format.trim() ? format.trim() : (ext === 'm3u8' ? 'mp4' : ext);
    const outPath = uniquePath(DOWNLOAD_DIR, baseName, outFormat);

    const taskId = uuidv4();
    tasks[taskId] = {
      status: 'pending',
      progress: 0,
      message: 'Queued',
      outFile: outPath,
      tempFile: tempPath,
      pid: null
    };

    res.json({ taskId });

    // Start ffmpeg in background (no await)
    // Build ffmpeg command:
    // -i <url> -c copy -bsf:a aac_adtstoasc -progress pipe:2 -nostats <tempPath>
    const args = ['-y', '-i', url, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-progress', 'pipe:2', '-nostats', tempPath];
    log(`Starting ffmpeg for task ${taskId}: ffmpeg ${args.join(' ')}`);
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    tasks[taskId].process = proc;
    tasks[taskId].status = 'running';
    tasks[taskId].message = 'Starting';
    tasks[taskId].pid = proc.pid;

    // try to extract duration line from stderr or logs
    let durationSeconds = null;
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk) => {
      // ffmpeg with -progress pipe:2 writes lines like "out_time_ms=12345" to stderr when using pipe:2
      const lines = chunk.toString().split(/\\r?\\n/);
      lines.forEach(l => {
        if (!l) return;
        // extract out_time_ms
        const m = l.match(/out_time_ms=(\\d+)/);
        if (m) {
          const out_ms = parseInt(m[1], 10);
          if (durationSeconds) {
            const p = Math.floor((out_ms / 1_000_000) / durationSeconds * 100);
            tasks[taskId].progress = Math.min(Math.max(p, 0), 100);
            tasks[taskId].message = `Downloading (${tasks[taskId].progress}%)`;
          } else {
            // we may not know duration; set progress based on chunks received
            tasks[taskId].progress = Math.min(tasks[taskId].progress + 1, 99);
            tasks[taskId].message = 'Downloading';
          }
        }
        // try to parse Duration lines (from other ffmpeg outputs)
        const md = l.match(/Duration: (\\d+:\\d{2}:\\d{2})/);
        if (md && !durationSeconds) {
          durationSeconds = parseDurationStr(md[1]);
        }
      });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        tasks[taskId].progress = 95;
        tasks[taskId].message = 'Finalizing/Converting';
        // If outFormat is different from temp ext, convert
        const tempExt = path.extname(tempPath).replace('.', '');
        if (outFormat !== tempExt) {
          // Run conversion: ffmpeg -i tempPath -c copy outPath
          try {
            const args2 = ['-y', '-i', tempPath, '-c', 'copy', outPath];
            log(`Converting ${tempPath} -> ${outPath}`);
            const proc2 = spawn('ffmpeg', args2, { stdio: ['ignore', 'inherit', 'inherit'] });
            proc2.on('close', (c2) => {
              if (c2 === 0) {
                tasks[taskId].progress = 100;
                tasks[taskId].status = 'done';
                tasks[taskId].message = 'Completed';
                // remove temp file if exists
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e){}
                log(`Task ${taskId} completed. Output: ${outPath}`);
              } else {
                tasks[taskId].status = 'error';
                tasks[taskId].message = 'Conversion failed';
                log(`Task ${taskId} conversion failed: exit ${c2}`);
              }
            });
          } catch (e) {
            tasks[taskId].status = 'error';
            tasks[taskId].message = 'Conversion exception';
            log(`Exception converting task ${taskId}: ${e.toString()}`);
          }
        } else {
          // no conversion required: rename tempPath -> outPath
          try {
            fs.renameSync(tempPath, outPath);
            tasks[taskId].progress = 100;
            tasks[taskId].status = 'done';
            tasks[taskId].message = 'Completed';
            log(`Task ${taskId} finished and saved to ${outPath}`);
          } catch (e) {
            tasks[taskId].status = 'error';
            tasks[taskId].message = 'Saving output failed';
            log(`Error moving temp file for ${taskId}: ${e}`);
          }
        }
      } else {
        tasks[taskId].status = 'error';
        tasks[taskId].message = 'ffmpeg failed';
        log(`ffmpeg exit code ${code} for task ${taskId}`);
      }
    });

  } catch (err) {
    log('Error in /api/download: ' + err.toString());
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/info - returns basic metadata for a given URL
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });

    // Heuristic: if YouTube URL and ytdl available, use it to get formats and thumbnails
    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
    if (isYouTube && ytdl) {
      try {
        const info = await ytdl.getInfo(url);
        // pick best thumbnail
        const thumbs = info.videoDetails.thumbnails || [];
        const thumb = thumbs[thumbs.length - 1] || thumbs[0] || null;
        // pick audio/video format (best)
        const formats = info.formats || [];
        const best = formats.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
        return res.json({
          title: info.videoDetails.title || null,
          format: best ? (best.container || null) : null,
          mimeType: best ? best.mimeType || null : null,
          thumbnailUrl: thumb ? thumb.url : null
        });
      } catch (e) {
        // fallback to HEAD
      }
    }

    // Fallback: try HEAD to get content-type and guess format from URL
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const ct = head.headers.get('content-type');
      // guess ext from url path
      const parts = url.split('?')[0].split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1] : null;
      return res.json({
        title: null,
        format: ext,
        mimeType: ct,
        thumbnailUrl: null
      });
    } catch (e) {
      return res.status(500).json({ error: 'failed to fetch info' });
    }
  } catch (err) {
    log('Error in /api/info: ' + err.toString());
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/progress/:taskId
app.get('/api/progress/:taskId', (req, res) => {
  const tid = req.params.taskId;
  const t = tasks[tid];
  if (!t) return res.status(404).json({ error: 'task not found' });
  res.json({
    status: t.status,
    progress: t.progress || 0,
    message: t.message || '',
    outFile: t.outFile || ''
  });
});

// POST /api/cancel
app.post('/api/cancel', (req, res) => {
  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  const t = tasks[taskId];
  if (!t) return res.status(404).json({ error: 'task not found' });
  try {
    if (t.process && !t.process.killed) {
      t.process.kill('SIGINT');
      t.status = 'cancelled';
      t.message = 'Cancelled by user';
      log(`Task ${taskId} cancelled by user`);
      return res.json({ ok: true });
    } else {
      return res.status(400).json({ error: 'no running process' });
    }
  } catch (e) {
    log(`Error cancelling ${taskId}: ${e}`);
    return res.status(500).json({ error: 'cancel failed' });
  }
});

app.listen(PORT, () => {
  console.log('Downloader backend listening on port', PORT);
  log('Server started on port ' + PORT);
});
