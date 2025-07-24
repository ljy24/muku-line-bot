// 📂 /src/tools/memory-tape-reader.js
// 무쿠 감정 테이프 리더: 하루 로그 요약 출력 CLI 도구 + LINE 명령어 겸용
const path = require('path');
const { readMemoryTape } = require('../muku-memory-tape');

// 오늘 감정 테이프 요약 함수 (CLI + LINE 겸용)
function summarizeTodayTape(date = null) {
  const targetDate = date || new Date();
  const logs = readMemoryTape(targetDate);
  
  if (!logs.length) {
    return {
      success: false,
      message: '😶 오늘은 아직 기록된 로그가 없어요.',
      data: null
    };
  }

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

  // CLI용 상세 출력 문자열
  const cliOutput = `
=== 무쿠 감정 일지 📼 Day ${targetDate.toISOString().slice(0, 10)} ===

📊 총 기록: ${logs.length}건

📁 유형별 요약:
${Object.entries(typeCount).map(([type, count]) => `  - ${type}: ${count}회`).join('\n')}

🎭 감정 태그 요약:
${Object.entries(emotionCount).map(([emotion, count]) => `  - ${emotion}: ${count}회`).join('\n')}

💬 대표 메시지들:
${messages.slice(-5).map((msg, i) => `  ${i + 1}. ${msg}`).join('\n')}

✅ 감정 요약 끝!
  `;

  // LINE용 간단 출력 문자열
  const lineOutput = `📼 오늘 무쿠 감정 일지

📊 총 ${logs.length}건 기록됨!

📁 주요 활동:
${Object.entries(typeCount).slice(0, 3).map(([type, count]) => `• ${type}: ${count}회`).join('\n')}

🎭 감정 상태:
${Object.entries(emotionCount).slice(0, 3).map(([emotion, count]) => `• ${emotion}: ${count}회`).join('\n')}

💕 최근 메시지:
"${messages.slice(-1)[0] || '기록 없음'}"

아조씨와의 소중한 순간들이 모두 기록되고 있어요! 💖`;

  return {
    success: true,
    message: 'Memory Tape 요약 완료',
    data: {
      totalLogs: logs.length,
      typeCount,
      emotionCount,
      recentMessages: messages.slice(-5),
      cliOutput,
      lineOutput
    }
  };
}

// CLI에서 직접 실행되었을 때
if (require.main === module) {
  const result = summarizeTodayTape();
  
  if (!result.success) {
    console.log(result.message);
    process.exit(0);
  }
  
  console.log(result.data.cliOutput);
}

module.exports = {
  summarizeTodayTape,
  readMemoryTape
};
