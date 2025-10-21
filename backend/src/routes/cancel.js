const express = require('express');
const router = express.Router();
const { cancelTask } = require('../controllers/cancelController');

router.post('/', cancelTask);

module.exports = router;