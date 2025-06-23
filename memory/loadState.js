// 📁 src/memory/loadState.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'state.json');

function loadState() {
  if (!fs.existsSync(filePath)) {
    return { useHonorific: true }; // 기본값: 존댓말 ON
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

module.exports = loadState;
