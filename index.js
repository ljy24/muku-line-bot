// ✅ index.js - 모든 기능은 /src/autoReply.js 에서 수행

const express = require('express');
const { middleware } = require('@line/bot-sdk'); // middleware만 여기서 필요
const moment = require('moment-timezone');
const cron = require('node-cron');
const {
  handleWebhook,
  handleForcePush,
  checkTobaccoReply,
  startMessageAndPhotoScheduler
} = require('./src/autoReply'); // autoReply.js에서 함수들만 가져옴
require('dotenv').config(); // .env 파일에서 환경 변수 로드

// ✅ Express 앱 인스턴스 생성
const app = express(); // 여기서 app 객체를 초기화합니다.

// ✅ LINE Bot SDK 설정
// appConfig는 index.js에서 직접 정의합니다.
const appConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

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
