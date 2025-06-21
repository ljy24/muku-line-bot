require('dotenv').config();
const { OpenAI } = require("openai");
const express = require('express');
const getRawBody = require('raw-body');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const path = require('path');
const { getRandomMessage } = require('./src/loveMessages');
const { getReplyByMessage } = require('./src/autoReply');
const { getRemainingBudgetMessage } = require('./src/checkUsage');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const app = express();
const userId = process.env.TARGET_USER_ID;

// 웹훅
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

// 핸들러
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    if (text === '담타고?' || text === '응응') {
      return client.replyMessage(event.replyToken, { type: 'text', text: 'ㄱㄱ' });
    }

    if (text.includes('얼마')) {
      const msg = getRemainingBudgetMessage();
      return client.replyMessage(event.replyToken, { type: 'text', text: msg });
    }

    const reply = await getReplyByMessage(text);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply
    });
  }
  return Promise.resolve(null);
}

// 랜덤 메시지
function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// 스케줄 1: 담타고?
cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// 스케줄 2: 랜덤 메시지 40회
function scheduleRandom40TimesPerDay() {
  const hours = [...Array(12).keys()].map(i => i + 9);
  const allTimes = new Set();

  while (allTimes.size < 40) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!allTimes.has(key)) {
      allTimes.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, () => {
        const msg = randomMessage();
        client.pushMessage(userId, { type: 'text', text: msg });
      });
    }
  }
}
scheduleRandom40TimesPerDay();

// 스케줄 3: 23시 약먹고 자자
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});

// 스케줄 4: 23시 30분 잘자~
cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

// 수동 전송 엔드포인트
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
