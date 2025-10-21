const express = require('express');
const router = express.Router();
const { downloadFile } = require('../controllers/downloadController');

// POST /api/download
router.post('/', downloadFile);

// Export the router
module.exports = router;