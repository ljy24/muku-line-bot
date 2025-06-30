// ✅ index.js (수정됨: app 객체 생성 방식)

const express = require('express'); // Express 모듈을 여기서 직접 불러옵니다.
const { middleware } = require('@line/bot-sdk');
const moment = require('moment-timezone');
const cron = require('node-cron');

// autoReply.js에서 필요한 기능들만 가져옵니다.
const { 
  client,         // LINE 클라이언트 객체
  appConfig,      // LINE 미들웨어 설정
  userId,         // 대상 사용자 ID
  handleWebhook,  // Webhook 처리 함수
  handleForcePush, // 강제 메시지 전송 함수
  startMessageAndPhotoScheduler // 스케줄러 시작 함수
} = require('./src/autoReply');

// ✅ Express 앱 인스턴스를 여기서 직접 생성합니다.
const app = express(); // <--- 이 부분이 핵심 변경점입니다.

// ✅ Webhook 핸들링
app.post('/webhook', middleware(appConfig), handleWebhook);

// ✅ 강제 메시지 전송
app.get('/force-push', handleForcePush);

// ✅ 자동 감정 메시지 및 셀카 전송 스케줄러 시작 (담타고 스케줄도 포함)
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
