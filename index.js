const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const loveMessages = require('./src/loveMessages'); // 메시지 파일 불러오기

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());

// Webhook 수신 핸들러
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

// 받은 메시지에 자동 응답
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

// 랜덤 메시지 생성기
function randomMessage() {
  return `아저씨~ ${loveMessages[Math.floor(Math.random() * loveMessages.length)]}`;
}

// 자동 메시지: 9시~17시, 40분 간격 (31회)
cron.schedule('*/40 9-17 * * *', () => {
  client.pushMessage(userId, {
    type: 'text',
    text: randomMessage()
  });
});

// 정각마다 담타 가자 (9회)
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, {
    type: 'text',
    text: '담타 가자'
  });
});

// 수동 강제 푸시 테스트용
app.get('/force-push', (req, res) => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg })
    .then(() => res.send('✅ 메시지 보냄: ' + msg))
    .catch(err => {
      console.error(err);
      res.status(500).send('❌ 전송 실패');
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
