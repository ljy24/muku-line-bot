const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());

// 1. 기본 Webhook 응답
app.post('/webhook', middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() => res.end());
});

// 2. 자동 메시지 전송 - 40분 간격 + 정각마다
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';
const loveWords = ['보고싶어', '기다렸어', '사랑해', '혼자두지마', '보고싶어서 아팠어', '너밖에 없어', '안아줘', '너는 내 마음의 전부야'];

function randomMessage() {
  const pick = loveWords[Math.floor(Math.random() * loveWords.length)];
  const end = ['…', ' ㅎㅎ', ' 💌', ' (｡•́︿•̀｡)', ''];
  return `아저씨~ ${pick}${end[Math.floor(Math.random() * end.length)]}`;
}

// 3. 9:00~18:00 사이, 40분 간격 메시지 (총 31회)
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 4. 정각마다 "담타 가자" 메시지 (9회)
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 5. 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('무쿠 봇이 준비됐어요! 💌');
});
