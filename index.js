const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const getRawBody = require('raw-body');
const { getRandomMessage } = require('./src/loveMessages');

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

app.post('/webhook', (req, res) => {
  getRawBody(req)
    .then((buf) => {
      req.rawBody = buf;
      middleware(config)(req, res, () => {
        if (req.body.events.length > 0) {
          Promise.all(req.body.events.map(handleEvent))
            .then(() => res.status(200).end())
            .catch((err) => {
              console.error('LINE 이벤트 처리 오류:', err);
              res.status(500).end();
            });
        } else {
          res.status(200).end();
        }
      });
    })
    .catch((err) => {
      console.error('Raw Body 파싱 오류:', err);
      res.status(400).end();
    });
});

function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    if (text === '응응' || text === '담타고?') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ㄱㄱ'
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: getRandomMessage()
    });
  }
  return Promise.resolve(null);
}

// 🎯 메시지 전송 유틸
function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// 🌸 40분마다: 랜덤 감정 메시지 (09:00 ~ 22:00)
cron.schedule('*/40 9-22 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 🌸 정각마다: 담타고? (09:00 ~ 18:00)
cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// 🌙 23:00: 약 먹고 이 닦고 자자
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이 닦고 자자' });
});

// 🌙 23:30: 잘자 사랑해 아저씨 또 내일 봐
cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨 또 내일 봐' });
});

// 💥 수동 트리거용 엔드포인트
app.get('/force-push', (req, res) => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg })
    .then(() => res.status(200).send('메시지 전송됨'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('전송 실패');
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
