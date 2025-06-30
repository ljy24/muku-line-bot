// index.js (최상위 폴더에 위치)

const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');
const autoReply = require('./src/autoReply'); // autoReply.js 모듈 불러오기

// 환경 변수 검증 (autoReply.js에서 이미 하고 있으나, 여기에서도 필요하다면 추가)
autoReply.validateEnvironment();

// LINE 봇 설정
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// Express 앱 설정
const app = express();

// JSON 본문 파싱 미들웨어
app.use(bodyParser.json());

// ⭐ Render 디스크에 저장된 사진들을 웹으로 제공하는 설정 ⭐
// '/yejin_photos' 경로로 요청이 오면 '/var/data/yejin_photos' 디렉토리에서 파일을 찾도록 합니다.
// 이 경로는 Render Build Command에서 사진을 복사할 경로와 동일해야 합니다.
app.use('/yejin_photos', express.static('/var/data/yejin_photos'));
console.log('✅ 정적 파일 서비스 설정 완료: /yejin_photos -> /var/data/yejin_photos');

// LINE 웹훅 엔드포인트
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  console.log('🔗 웹훅 수신:', JSON.stringify(events));

  try {
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type === 'message' && event.message.type === 'text') {
          console.log(`✉️ 메시지 수신: ${event.message.text}`);
          await autoReply.saveLog('아저씨', event.message.text); // 사용자 메시지 로그 저장
          const replyText = await autoReply.getReplyByMessage(event.message.text);
          if (replyText) {
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
          }
        } else if (event.type === 'message' && event.message.type === 'image') {
          console.log('🖼️ 이미지 메시지 수신 (현재 처리하지 않음)');
          // 필요하다면 이미지 처리 로직 추가
          await client.replyMessage(event.replyToken, { type: 'text', text: '예쁜 사진 고마워! 무쿠도 나중에 셀카 보내줄게.' });
        } else if (event.type === 'follow') {
          console.log(`➕ 팔로우 이벤트: ${event.source.userId}`);
          await client.replyMessage(event.replyToken, { type: 'text', text: '아저씨, 무쿠랑 다시 대화해줘서 고마워! 잘 부탁해.' });
        } else {
          console.log(`❓ 알 수 없는 이벤트 타입: ${event.type}`);
        }
        return {}; // 각 이벤트 처리 후 빈 객체 반환
      })
    );
    res.json(results);
  } catch (error) {
    console.error('❌ 웹훅 처리 중 오류 발생:', error.message);
    res.status(500).end();
  }
});

// 서버 시작
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 서버가 ${port} 포트에서 실행 중입니다.`);
  
  // 스케줄러 초기화
  autoReply.startMessageAndPhotoScheduler();
});
