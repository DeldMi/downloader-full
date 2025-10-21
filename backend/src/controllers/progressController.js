// src/controllers/progressController.js

const { getProgress } = require('../services/taskManager');

// GET /api/progress/:taskId
exports.getProgress = (req, res) => {
  const taskId = req.params.taskId;
  const progress = getProgress(taskId);
  res.json(progress);
};