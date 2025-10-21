const express = require('express');
const router = express.Router();
const { getInfo } = require('../controllers/infoController');

// POST /api/info - returns basic metadata for a given URL
router.post('/', getInfo);

module.exports = router;