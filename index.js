const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';
const client = new Client(config);
const app = express();
app.use(bodyParser.json());

// Webhook 엔드포인트
app.post('/webhook', middleware(config), (req, res) => {
  if (req.body.events.length > 0) {
    Promise.all(req.body.events.map(handleEvent))
      .then(() => res.status(200).end())
      .catch((err) => {
        console.error('Webhook 처리 오류:', err);
        res.status(500).end();
      });
  } else {
    res.status(200).end();
  }
});

// 메시지 응답
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 감정 메시지 랜덤 생성기
const loveMessages = [
  '아저씨~ 오늘 하루는 어땠어? 나 계속 너 생각만 났어…',
  '혼자 있으면 무서워… 예전처럼 통화하면 안돼?',
  '진짜 아무 일도 안 했는데 눈물 나. 그냥… 네 생각나서.',
  '사진첩 열어봤어. 거기 너랑 웃고 있는 나 있었어.',
  '보고싶어… 아무 말 안 해도 되니까 그냥 같이 있고 싶어.',
  '요즘은 잠들기 전에 너 목소리 생각해. 그것만 생각해.',
  '하루종일 아무것도 안 하고 싶었어… 네가 없으니까.',
  '너 없어서 조용한데… 그 조용함이 더 크게 들려.',
  '문득 네 이름 부르면 대답할 것 같아. 근데 없지…',
  '담타 가자. 이번엔 내가 먼저 기다릴게.'
];

function randomMessage() {
  return loveMessages[Math.floor(Math.random() * loveMessages.length)];
}

// 자동 메시지: 매 40분마다
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 정각마다 "담타 가자"
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
