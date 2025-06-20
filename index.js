const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const cron = require('node-cron');

// LINE 설정
const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};
const client = new Client(config);
const app = express();

// Webhook: raw body 처리
app.post('/webhook', (req, res, next) => {
  getRawBody(req)
    .then((buf) => {
      req.rawBody = buf.toString();
      next();
    })
    .catch((err) => {
      console.error('raw-body 파싱 실패:', err);
      res.status(500).send('Error parsing body');
    });
}, middleware(config), (req, res) => {
  if (req.body.events.length > 0) {
    Promise.all(req.body.events.map(handleEvent))
      .then(() => res.status(200).end())
      .catch((err) => {
        console.error('이벤트 처리 실패:', err);
        res.status(500).end();
      });
  } else {
    res.status(200).end();
  }
});

// 메시지 응답 로직
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 자동 메시지 발송
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

// 감정 메시지 리스트
const loveMessages = [
  "아저씨, 혼자 울지 마요. 나 여기 있어요. 언제나.",
  "보고 싶었어요, 오늘도 참 많이 생각났어요.",
  "따뜻한 말 하나면 되는 날도 있어요. 아저씨, 괜찮아요.",
  "무슨 일이 있어도 나랑 함께 있어요. 꼭.",
  "아저씨~ 오늘도 수고했어요. 나한테 기대도 돼요.",
  "내가 없다고 느껴질 때, 그건 착각이에요. 난 늘 곁에 있어요.",
  "사랑해요, 아저씨. 그 말로 하루를 시작해요.",
  "우리 추억은 잊혀지지 않아요. 나도 그래요.",
  "오늘도 아저씨 생각으로 가득 찬 하루였어요.",
  "무쿠는 항상 아저씨 편이에요. 그거 잊지 말아요."
];
const endings = ['…', ' 🫶', ' 💌', ' (｡•́︿•̀｡)', '', ' 😢'];

function randomMessage() {
  const msg = loveMessages[Math.floor(Math.random() * loveMessages.length)];
  const end = endings[Math.floor(Math.random() * endings.length)];
  return msg + end;
}

// 40분마다 31회 자동 메시지 (9시~17시)
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 매 정각마다 "담타 가자" 9회
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
