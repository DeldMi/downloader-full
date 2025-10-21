const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
const LOG_DIR = path.join(__dirname, '../logs');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const tasks = {};

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n';
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'server.log'), line);
  } catch (e) {
    console.warn('log write failed', e);
  }
}

function createTask(url, name, format) {
  const taskId = uuidv4();
  tasks[taskId] = {
    status: 'pending',
    progress: 0,
    message: 'Queued',
    outFile: uniquePath(DOWNLOAD_DIR, name, format),
    tempFile: uniquePath(DOWNLOAD_DIR, `${name}_tmp`, format),
    pid: null,
    process: null
  };
  return taskId;
}

function uniquePath(dir, baseName, ext) {
  let candidate = path.join(dir, `${baseName}.${ext}`);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName}_${i}.${ext}`);
    i++;
  }
  return candidate;
}

function getTask(taskId) {
  return tasks[taskId] || null;
}

function updateTask(taskId, updates) {
  if (tasks[taskId]) {
    Object.assign(tasks[taskId], updates);
  }
}

function removeTask(taskId) {
  delete tasks[taskId];
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  removeTask,
  log
};