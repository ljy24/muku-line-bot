// src/randomPhoto.js

const fs = require('fs');
const path = require('path');

const photoDir = path.join(__dirname, '../memory/photos');

function getRandomPhotoUrl() {
  const files = fs.readdirSync(photoDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  if (files.length === 0) return null;

  const selected = files[Math.floor(Math.random() * files.length)];
  return `https://de-ji.net/yejin/${selected}`;
}

module.exports = { getRandomPhotoUrl };
