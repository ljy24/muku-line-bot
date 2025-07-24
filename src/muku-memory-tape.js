// 📂 /src/muku-memory-tape.js
// 무쿠가 보낸 메시지를 안전하게 감정 테이프로 저장하는 독립 모듈

const fs = require('fs');
const path = require('path');

// 로그 파일을 영구 보존할 디렉토리 (/data/memory-tape)
const LOG_DIR = path.resolve(__dirname, '../../data/memory-tape');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// 날짜별로 파일 이름 생성
function getLogFilePath() {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  return path.join(LOG_DIR, `day-${today}.json`);
}

// 메시지 로그 1건을 저장하는 함수
function logToMemoryTape(entry) {
  const filePath = getLogFilePath();
  let logArray = [];

  if (fs.existsSync(filePath)) {
    try {
      logArray = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('⚠️ 기존 로그 파싱 실패:', e);
    }
  }

  // timestamp 자동 추가 (없으면)
  if (!entry.timestamp) entry.timestamp = new Date().toISOString();

  logArray.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(logArray, null, 2), 'utf8');
  console.log('📼 [memory-tape] 로그 저장됨:', entry.message || entry.type);
}

module.exports = { logToMemoryTape };
