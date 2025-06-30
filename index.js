// ✅ index.js (최종 버전) - 모든 기능은 /src/autoReply.js 에 위임

const express = require('express'); // Express를 직접 가져옵니다. (Express app 인스턴스 생성을 위해)
const { middleware } = require('@line/bot-sdk'); // LINE 미들웨어만 가져옵니다.

// autoReply.js에서 필요한 모든 함수와 객체를 구조 분해 할당으로 가져옵니다.
// 이 목록은 autoReply.js의 module.exports와 일치해야 합니다.
const {
  client, // LINE 클라이언트 (필요시)
  appConfig, // LINE 미들웨어 설정
  userId, // 타겟 유저 ID (필요시)
  app, // Express 앱 인스턴스
  initServerState, // 서버 초기화 함수
  handleWebhook, // 웹훅 요청 처리 함수
  handleForcePush, // 강제 메시지 푸시 함수
  checkTobaccoReply, // 담배 메시지 확인 및 전송 함수 (cron job에서 호출)
  startMessageAndPhotoScheduler, // 랜덤 메시지 및 사진 스케줄러 시작 함수
  // handleSelfieRequest, handleImageMessage는 웹훅 내부에서 처리되거나 직접 호출될 필요가 없으므로 여기서는 import하지 않습니다.
} = require('./src/autoReply'); // autoReply.js가 src 디렉토리에 있으므로 경로를 명확히 합니다.

// --- Express 앱 설정 및 라우트 ---
// Express 앱 인스턴스는 autoReply.js에서 생성되어 내보내지므로 여기서는 가져다 씁니다.

// ✅ 서버 초기화 함수 호출
// 서버가 시작될 때 한 번 실행되어야 하는 초기화 로직입니다.
initServerState();

// ✅ Webhook 핸들링 라우트
// LINE 플랫폼으로부터 오는 모든 이벤트를 처리합니다.
app.post('/webhook', middleware(appConfig), handleWebhook);

// ✅ 강제 메시지 전송 라우트 (GET 요청으로 특정 메시지를 강제로 보내는 기능)
// 예: http://localhost:3000/force-push?msg=테스트메시지
app.get('/force-push', handleForcePush);

// --- 스케줄링된 작업 ---
// `node-cron` 모듈은 `autoReply.js`에서 직접 불러와 스케줄링 로직을 실행하도록 변경합니다.
// `index.js`는 `autoReply.js`에 있는 스케줄러 시작 함수만 호출합니다.

// ✅ 정각 담타 체크 및 5분 후 반응 (cron 스케줄러는 autoReply.js로 이동)
// 이 부분의 cron.schedule은 이제 autoReply.js 내부로 이동합니다.
// index.js에서는 단지 모든 스케줄러를 시작하는 함수만 호출합니다.

// ✅ 자동 감정 메시지 및 셀카 전송 스케줄러 시작
// autoReply.js에서 정의된 스케줄러 시작 함수를 호출합니다.
startMessageAndPhotoScheduler();


// ✅ 서버 실행
// 환경 변수에서 포트를 가져오거나 기본값 3000을 사용합니다.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎉 무쿠 서버 ON! 포트: ${PORT}`);
});
