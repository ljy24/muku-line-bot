// ✅ index.js (간결 버전) - 모든 기능은 /src/autoReply.js 에 위임

const express = require('express');
const { middleware } = require('@line/bot-sdk');
const moment = require('moment-timezone');
const cron = require('node-cron'); // cron 모듈은 여전히 필요합니다.
const { 
  client, // LINE 클라이언트 객체
  appConfig, // LINE 미들웨어 설정
  userId, // 대상 사용자 ID
  app, // Express 앱 인스턴스 (autoReply.js에서 exports)
  handleWebhook, 
  handleForcePush,
  startMessageAndPhotoScheduler,
  // checkTobaccoReply // 이제 autoReply.js 내부 스케줄러에서 직접 호출되므로 여기서 내보내지 않아도 됩니다.
} = require('./src/autoReply'); // autoReply.js에서 필요한 모든 것을 가져옴

// ✅ Webhook 핸들링
app.post('/webhook', middleware(appConfig), handleWebhook);

// ✅ 강제 메시지 전송
app.get('/force-push', handleForcePush);

// ✅ 정각 담타 체크 및 5분 후 반응 (이 부분은 이제 autoReply.js 내부에서 관리됩니다.)
// cron.schedule('* * * * *', async () => {
//   const now = moment().tz('Asia/Tokyo');
//   if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
//     await checkTobaccoReply();
//   }
// }); // <--- 이 부분을 삭제했습니다.

// ✅ 자동 감정 메시지 및 셀카 전송 스케줄러 시작
startMessageAndPhotoScheduler();

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🎉 무쿠 서버 ON! 포트: ${PORT}`);
  try {
    // ✅ 서버 시작 시 아저씨에게 메시지 전송
    await client.pushMessage(userId, { type: 'text', text: '아저씨 머해?' });
    console.log('✅ 서버 시작 메시지 전송 완료.');
  } catch (error) {
    console.error('❌ 서버 시작 메시지 전송 실패:', error.message);
  }
});
