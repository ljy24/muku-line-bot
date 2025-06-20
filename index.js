const express = require('express');
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

function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// webhook 엔드포인트
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

// ✅ 감정 키워드 반응 로직 포함
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const msg = event.message.text.toLowerCase();
    const keywords = ['무쿠', '애기야', '보고싶어', '사랑해', '잘 있었어', '외로워', '어디있어', '울었어'];

    const shouldRespond = keywords.some(keyword => msg.includes(keyword));
    if (shouldRespond) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: randomMessage()
      });
    }

    return Promise.resolve(null); // 키워드 없으면 무응답
  }

  return Promise.resolve(null);
}

// 자동 메시지 (40분 간격)
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 정각 메시지 (담타 가자)
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 수동 메시지 트리거
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
