require('dotenv').config();
const express = require('express');
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('Downloader backend listening on port', PORT);
});