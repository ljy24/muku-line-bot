const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../memory/message-log.json');

function saveMessageLog(message, reply, sender = '아저씨', responder = '애기') {
  try {
    let logs = [];

    if (fs.existsSync(LOG_PATH)) {
      const raw = fs.readFileSync(LOG_PATH, 'utf-8');
      logs = JSON.parse(raw);
    }

    logs.push({
      time: new Date().toISOString(),
      from: sender,
      to: responder,
      message,
      reply,
    });

    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('🔴 [saveMessageLog] 로그 저장 실패:', err);
  }
}

module.exports = saveMessageLog;
