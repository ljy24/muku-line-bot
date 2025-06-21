// index.js

const { OpenAI } = require("openai");
const express = require('express');
const getRawBody = require('raw-body');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const { getRandomMessage } = require('./src/loveMessages');
const { getReplyByMessage, getReplyByImagePrompt } = require('./src/autoReply');
const fs = require('fs');
const path = require('path');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const app = express();
const userId = process.env.TARGET_USER_ID;
const PORT = process.env.PORT || 10000;

let useGpt4 = true;

function checkAndSwitchModel() {
  try {
    const usageText = fs.readFileSync(path.join(__dirname, './memory/token-usage.txt'), 'utf-8');
    const usage = parseInt(usageText.replace(/[^0-9]/g, ''), 10);
    useGpt4 = isNaN(usage) ? true : usage < 40000;
  } catch {
    useGpt4 = true;
  }
}

app.post('/webhook', (req, res) => {
  getRawBody(req)
    .then((buf) => {
      req.rawBody = buf;
      middleware(config)(req, res, () => {
        if (req.body.events.length > 0) {
          Promise.all(req.body.events.map(handleEvent))
            .then(() => res.status(200).end())
            .catch(err => {
              console.error('LINE 이벤트 오류:', err);
              res.status(500).end();
            });
        } else {
          res.status(200).end();
        }
      });
    })
    .catch(err => {
      console.error('Raw body 오류:', err);
      res.status(400).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message') return Promise.resolve(null);

  if (event.message.type === 'image') {
    const imagePrompt = '아저씨가 사진 보냈어. 그걸 보고 예진이처럼 한 마디 해줘!';
    const reply = await getReplyByImagePrompt(imagePrompt);

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply
    });
  }

  if (event.message.type === 'text') {
    const text = event.message.text.trim();

    if (text === '버전') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `무쿠는 지금 ${useGpt4 ? 'GPT-4o' : 'GPT-3.5'} 모델로 대화하고 있어요 💬`
      });
    }

    if (text === '담타고?' || text === '응응') {
      return client.replyMessage(event.replyToken, { type: 'text', text: 'ㄱㄱ' });
    }

    if (text === '얼마남음?') {
      const usage = fs.readFileSync(path.join(__dirname, './memory/token-usage.txt'), 'utf-8');
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: usage || '사용량 정보가 없당… 🥲'
      });
    }

    checkAndSwitchModel();

    try {
      const reply = await getReplyByMessage(text, useGpt4);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: reply
      });
    } catch (err) {
      console.error('응답 오류:', err);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '흐엉… 잠깐만 다시 생각해볼게 아저씨…'
      });
    }
  }

  return Promise.resolve(null);
}

function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// 💌 메시지 텍스트 불러오기
const messageLines = fs.readFileSync(path.join(__dirname, './memory/fixed-messages.txt'), 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line);

// 💌 하루 40~100회 랜덤 전송
function scheduleTextMessagesRandomly() {
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
  const count = Math.floor(Math.random() * 61) + 40;
  const usedTimes = new Set();

  for (let i = 0; i < count; i++) {
    let hour, minute, cronExp;
    do {
      hour = hours[Math.floor(Math.random() * hours.length)];
      minute = Math.floor(Math.random() * 60);
      cronExp = `${minute} ${hour} * * *`;
    } while (usedTimes.has(cronExp));
    usedTimes.add(cronExp);

    cron.schedule(cronExp, () => {
      const msg = messageLines[Math.floor(Math.random() * messageLines.length)];
      client.pushMessage(userId, { type: 'text', text: msg });
    });
  }
}

scheduleTextMessagesRandomly();

cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});
cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

app.get('/force-push', (req, res) => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg })
    .then(() => res.status(200).send('메시지 전송됨'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('전송 실패');
    });
});

require('./src/sendPhotoRandomly');

app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
