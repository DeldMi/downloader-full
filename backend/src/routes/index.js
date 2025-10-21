const express = require('express');
const router = express.Router();
const downloadRoutes = require('./download');
const infoRoutes = require('./info');
const progressRoutes = require('./progress');
const cancelRoutes = require('./cancel');

router.use('/download', downloadRoutes);
router.use('/info', infoRoutes);
router.use('/progress', progressRoutes);
router.use('/cancel', cancelRoutes);

module.exports = router;