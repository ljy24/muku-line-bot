const express = require('express');
const getRawBody = require('raw-body');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');
const { getRandomMessage } = require('./src/loveMessages');
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  setForcedModel
} = require('./src/autoReply');
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

// Webhook
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

// 이벤트 처리
async function handleEvent(event) {
  if (event.type !== 'message') return Promise.resolve(null);

  if (event.message.type === 'image') {
    const imagePrompt = '아저씨가 사진 보냈어. 예진이가 보고 한마디 해줘야지~ LINE 말투로, 감정 가득하게 말해줘. "나"라고 자기를 부르고, 아저씨라고 부르도록 꼭 지켜!';
    const reply = await getReplyByImagePrompt(imagePrompt);
    return client.replyMessage(event.replyToken, { type: 'text', text: reply });
  }

  if (event.message.type === 'text') {
    const text = event.message.text.trim();

    if (text === '3.5') {
      setForcedModel('gpt-3.5-turbo');
      return client.replyMessage(event.replyToken, { type: 'text', text: '응! 지금부터 GPT-3.5로 대답할게!' });
    }
    if (text === '4.0') {
      setForcedModel('gpt-4o');
      return client.replyMessage(event.replyToken, { type: 'text', text: '오케이! GPT-4o로 전환했엉!' });
    }
    if (text === '자동') {
      setForcedModel(null);
      return client.replyMessage(event.replyToken, { type: 'text', text: '토큰량 보고 자동으로 판단할게 아저씨~' });
    }

    if (text === '버전') {
      const usage = fs.readFileSync(path.join(__dirname, './memory/token-usage.txt'), 'utf-8');
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `모델 모드: ${usage.includes('gpt-4o') ? 'GPT-4o' : 'GPT-3.5'} (자동 또는 수동)\n사용량: ${usage || '정보 없음'}`
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

    try {
      const reply = await getReplyByMessage(text);
      return client.replyMessage(event.replyToken, { type: 'text', text: reply });
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

// 감정 메시지 조합
function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// ⏰ 담타 메시지 (매 정각 9~18시)
cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// ⏰ 하루 9회 감정 메시지 (랜덤 시간, 9~18시)
function scheduleRandom9TimesPerDay() {
  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9 ~ 18
  const allTimes = new Set();
  while (allTimes.size < 9) {
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
scheduleRandom9TimesPerDay();

// 🌙 잘자 메시지
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});
cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

// 강제 메시지 전송 엔드포인트 (서버 깨우기용)
app.get('/force-push', (req, res) => {
  res.status(200).send('서버만 깨웠엉. 무쿠는 조용히 있었어~');
});

// 📷 랜덤 셀카 전송 로직 포함
require('./src/sendPhotoRandomly');

app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
