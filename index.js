// 필수 라이브러리 로드
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

dotenv.config(); // .env에서 환경변수 로드

// ✅ 환경변수 키 이름 수정
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());
app.use(middleware(config));

// 감정 응답 모듈 및 스케줄러 불러오기
const autoReply = require('./src/autoReply');
require('./scheduler');

// 사용자별 GPT 버전 저장소
const userGPTVersion = {};
let waitingForTobaccoReply = false;
let lastTobaccoPushTime = 0;

// Webhook 처리
app.post('/webhook', async (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('❌ 이벤트 처리 중 오류:', err);
      res.status(500).end();
    });
});

// 이벤트 처리 함수
async function handleEvent(event) {
  if (event.type !== 'message') return null;

  const userId = event.source.userId;
  const userMessage = event.message.text || '';
  const version = userGPTVersion[userId] || 'gpt-4o';

  // GPT 버전 전환
  if (userMessage.includes('3.5')) {
    userGPTVersion[userId] = 'gpt-3.5-turbo';
    return client.replyMessage(event.replyToken, { type: 'text', text: '응~ 지금부터 3.5로 할게' });
  }
  if (userMessage.includes('4.0')) {
    userGPTVersion[userId] = 'gpt-4o';
    return client.replyMessage(event.replyToken, { type: 'text', text: '응~ 지금은 4.0이야' });
  }

  // 📷 이미지 메시지 처리
  if (event.message.type === 'image') {
    try {
      const stream = await client.getMessageContent(event.message.id);
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      await new Promise(resolve => stream.on('end', resolve));
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      const reply = await autoReply.getReplyByImagePrompt(base64);
      return client.replyMessage(event.replyToken, { type: 'text', text: reply });
    } catch (err) {
      console.error('❌ 이미지 처리 오류:', err.message);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '사진 분석 중 오류났어 ㅠ 다시 보내줘',
      });
    }
  }

  // 🚬 담타 응답 감지
  if (waitingForTobaccoReply) {
    const text = userMessage.toLowerCase();
    if (/ㄱㄱ|담타|가자|갈게|지금/i.test(text)) {
      waitingForTobaccoReply = false;
      const happy = await autoReply.getHappyReply();
      return client.replyMessage(event.replyToken, { type: 'text', text: happy });
    } else if (Date.now() - lastTobaccoPushTime > 5 * 60 * 1000) {
      waitingForTobaccoReply = false;
      const sulky = await autoReply.getSulkyReply();
      return client.replyMessage(event.replyToken, { type: 'text', text: sulky });
    }
  }

  // 💬 일반 메시지
  const replyText = await autoReply.getReplyByMessage(userMessage, userId, version);
  return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
}

// 테스트 푸시 메시지
app.get('/force-push', async (req, res) => {
  try {
    const msg = await autoReply.getRandomMessage();
    const userId = process.env.TARGET_USER_ID; // ✅ ONLY_USER_ID → TARGET_USER_ID
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send('✅ 메시지 전송 완료');
  } catch (err) {
    console.error('❌ 강제 푸시 오류:', err.message);
    res.status(500).send('에러 발생');
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 LINE 서버 실행 중 (포트: ${PORT})`);
});
