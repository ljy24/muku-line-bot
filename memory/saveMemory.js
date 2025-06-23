// 📁 src/memory/saveMemory.js

const fs = require('fs');
const path = require('path');

function saveMemory(message) {
  const date = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const dir = path.join(__dirname, 'logs');
  const filePath = path.join(dir, `${date}.json`);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir); // logs 폴더 없으면 생성
  }

  let memory = [];
  if (fs.existsSync(filePath)) {
    memory = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  memory.push({
    timestamp: new Date().toISOString(),
    text: message
  });

  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
}

module.exports = saveMemory;
