// src/photoList.js

const fs = require('fs');
const path = require('path');

const listPath = path.join(__dirname, '../memory/photo-list.txt');

function getPhotoList() {
  if (!fs.existsSync(listPath)) return [];
  const raw = fs.readFileSync(listPath, 'utf8');
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

module.exports = { getPhotoList };
