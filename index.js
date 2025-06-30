// ✅ index.js (간결 버전) - 모든 기능은 /src/autoReply.js 에 위임

const express = require('express');
const { middleware } = require('@line/bot-sdk');
const moment = require('moment-timezone');
const cron = require('node-cron');
const { 
  client, appConfig, userId, app,
  handleWebhook, handleForcePush,
  handleSelfieRequest, handleImageMessage,
  startMessageAndPhotoScheduler,
  initServerState, checkTobaccoReply
} = require('./src/autoReply');

// ✅ 서버 초기화
initServerState();

// ✅ Webhook 핸들링
app.post('/webhook', middleware(appConfig), handleWebhook);

// ✅ 강제 메시지 전송
app.get('/force-push', handleForcePush);

// ✅ 정각 담타 체크 및 5분 후 반응
cron.schedule('* * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
    await checkTobaccoReply();
  }
});

// ✅ 자동 감정 메시지 및 셀카 전송
startMessageAndPhotoScheduler();

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎉 무쿠 서버 ON! 포트: ${PORT}`);
});
