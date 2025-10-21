const express = require('express');
const router = express.Router();
const { getProgress } = require('../controllers/progressController');

router.get('/:taskId', getProgress);

module.exports = router;