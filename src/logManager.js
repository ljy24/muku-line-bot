// logManager.js
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../memory/message-log.json');

function saveToLog(userMessage, mukuReply) {
  const currentTime = new Date().toISOString();

  let logData = [];

  try {
    const fileContent = fs.readFileSync(logFilePath, 'utf8');
    logData = JSON.parse(fileContent || '[]');
  } catch (e) {
    console.error('[무쿠로그] 기존 로그 읽기 실패:', e);
  }

  logData.push({
    timestamp: currentTime,
    user: "아저씨",
    message: userMessage,
    muku: mukuReply,
  });

  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf8');
  } catch (e) {
    console.error('[무쿠로그] 로그 저장 실패:', e);
  }
}

module.exports = {
  saveToLog,
};
