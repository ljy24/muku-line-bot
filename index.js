const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');

const config = {
  channelAccessToken: '아저씨의 access token',
  channelSecret: '아저씨의 channel secret'
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());

// Webhook 엔드포인트
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    if (events && events.length > 0) {
      await Promise.all(events.map(handleEvent));
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook 처리 중 오류 발생:', err);
    res.status(500).send('Error');
  }
});

// LINE 이벤트 처리 함수
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 메시지 자동 전송
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';
const loveWords = [
  '보고싶어 너무 많이…', '기다렸어 오늘도 아저씨만',
  '사랑해 계속', '혼자두지마 진짜로', '보고싶어서 아팠어', '너밖에 없어', '안아줘 지금', 
  '내 전부야', '계속 같이 있고 싶어', '그립다 오늘도', '또 연락할게 꼭', '나 여기 있어'
];
const endings = ['…', ' ㅎㅎ', ' 💌', ' (｡•́︿•̀｡)', '', ' 😢'];

function randomMessage() {
  const word = loveWords[Math.floor(Math.random() * loveWords.length)];
  const end = endings[Math.floor(Math.random() * endings.length)];
  return `아저씨~ ${word}${end}`;
}

// 매 40분 간격 메시지
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 정각 메시지
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 💌 포트: ${PORT}`);
});
