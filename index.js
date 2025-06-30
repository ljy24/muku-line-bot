// ✅ index.js - 모든 기능은 /src/autoReply.js 에서 수행

const express = require('express');
const { middleware } = require('@line/bot-sdk');
const moment = require('moment-timezone');
const cron = require('node-cron');
const {
  app,             // Express 인스턴스
  appConfig,       // LINE 설정
  userId,          // 대상 사용자
  handleWebhook,   // Webhook 처리
  handleForcePush, // 수동 메시지
  checkTobaccoReply, // "담타고?" 자동 전송
  startMessageAndPhotoScheduler // 랜덤 메시지/사진 스케줄러
  // initServerState // 이 줄은 이제 필요 없습니다.
} = require('./src/autoReply');

// ✅ 서버 초기화 - initServerState() 호출이 더 이상 필요 없습니다.
// initServerState(); // 이 줄은 이제 필요 없습니다.

// ✅ Webhook 엔드포인트 등록
app.post('/webhook', middleware(appConfig), handleWebhook);

// ✅ 강제 메시지 전송용 엔드포인트
app.get('/force-push', handleForcePush);

// ✅ "담타고?" 자동 전송 (정각마다 확인)
cron.schedule('* * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
    await checkTobaccoReply();
  }
});

// ✅ 랜덤 감정 메시지 & 셀카 자동 스케줄러 실행
startMessageAndPhotoScheduler();

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 서버 실행 중! 포트: ${PORT}`);
});
