require('dotenv').config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const express = require('express');
const getRawBody = require('raw-body');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const { getRandomMessage } = require('./src/loveMessages');
const { getReplyByMessage } = require('./src/autoReply'); // 감정 기반 응답

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

// 🔁 웹훅 이벤트 수신
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

// 🤖 메시지 응답 핸들러
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    // 1. 특정 키워드 자동응답
    if (text === '담타고?') {
      return client.replyMessage(event.replyToken, { type: 'text', text: 'ㄱㄱ' });
    }

    if (text === '응응') {
      return client.replyMessage(event.replyToken, { type: 'text', text: 'ㄱㄱ' });
    }

    // 2. 감정 분석 기반 응답
    const reply = getReplyByMessage(text);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply
    });
  }
  return Promise.resolve(null);
}

// 🌸 랜덤 감정 메시지 생성
function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// 🎯 스케줄 1: 담타고? (매일 9~18시 정각)
cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// 🎯 스케줄 2: 랜덤 감정 메시지 (40분 간격, 9시~22시)
cron.schedule('*/40 9-22 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 🎯 스케줄 3: 23시 – 약먹고 이빨닦고 자자
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});

// 🎯 스케줄 4: 23시 30분 – 잘자 사랑해 아저씨
cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

// 💻 수동 전송 트리거
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
