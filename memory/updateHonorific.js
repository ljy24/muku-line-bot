// 📁 src/memory/updateHonorific.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'state.json');

function updateHonorificUsage(useHonorific) {
  const state = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    : {};

  state.useHonorific = useHonorific;
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

module.exports = updateHonorificUsage;
