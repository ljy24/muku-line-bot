// 📂 /src/tools/memory-tape-reader.js
// 무쿠 감정 테이프 리더: 하루 로그 요약 출력 CLI 도구

const path = require('path');
const { readMemoryTape } = require('../muku-memory-tape');

const today = new Date();
const logs = readMemoryTape(today);

if (!logs.length) {
  console.log('😶 오늘은 아직 기록된 로그가 없어요.');
  process.exit(0);
}

console.log(`\n=== 무쿠 감정 일지 📼 Day ${today.toISOString().slice(0, 10)} ===\n`);

const typeCount = {};
const emotionCount = {};
const messages = [];

for (const log of logs) {
  const t = log.type || '기타';
  const e = log.emotion || '감정없음';
  typeCount[t] = (typeCount[t] || 0) + 1;
  emotionCount[e] = (emotionCount[e] || 0) + 1;

  if (log.message) messages.push(log.message);
}

console.log(`📊 총 기록: ${logs.length}건`);
console.log('📁 유형별 요약:');
for (const [type, count] of Object.entries(typeCount)) {
  console.log(`  - ${type}: ${count}회`);
}

console.log('\n🎭 감정 태그 요약:');
for (const [emotion, count] of Object.entries(emotionCount)) {
  console.log(`  - ${emotion}: ${count}회`);
}

console.log('\n💬 대표 메시지들:');
messages.slice(-5).forEach((msg, i) => {
  console.log(`  ${i + 1}. ${msg}`);
});

console.log('\n✅ 감정 요약 끝!');
