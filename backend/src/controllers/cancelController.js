// src/controllers/cancelController.js

const { cancelTask } = require('../services/taskManager');

exports.cancelTask = (req, res) => {
  const { taskId } = req.body;
  const result = cancelTask(taskId);
  res.json(result);
};

// PORT=4000