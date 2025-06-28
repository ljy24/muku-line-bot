//index.js

// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 🧠 자동응답 함수들
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
} = require('./src/autoReply');

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

fs.access('memory/message-log.json', fs.constants.W_OK, (err) => {
  if (err) console.error('❌ message-log.json 쓰기 불가!');
  else console.log('✅ message-log.json 쓰기 가능!');
});

app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage('gpt-4o');
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

(async () => {
  const msg = await getRandomMessage('gpt-4o');
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
  await client.pushMessage(userId, { type: 'text', text: '아저씨 나왔어!' });
})();

// 하루 12번 아무 시간에 랜덤 메시지
function scheduleRandomMessages() {
  const sentTimes = new Set();
  while (sentTimes.size < 12) {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    sentTimes.add(`${minute} ${hour} * * *`);
  }
  for (const time of sentTimes) {
    cron.schedule(time, async () => {
      const version = 'gpt-4o';
      const msg = await getRandomMessage(version);
      if (msg && msg.length <= 50) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        saveLog('예진이', msg);
      }
    });
  }
}
scheduleRandomMessages();

let waitingForReply = false;
cron.schedule('0 * * * *', async () => {
  const msgList = [...]; // 기존 담타 리스트 유지
  const msg = msgList[Math.floor(Math.random() * msgList.length)];
  await client.pushMessage(userId, { type: 'text', text: msg });
  saveLog('예진이', msg);
  waitingForReply = true;
  setTimeout(async () => {
    if (waitingForReply) {
      const sulkyList = [...];
      const sulkyMsg = sulkyList[Math.floor(Math.random() * sulkyList.length)];
      await client.pushMessage(userId, { type: 'text', text: sulkyMsg });
      saveLog('예진이', sulkyMsg);
    }
  }, 5 * 60 * 1000);
});

cron.schedule('0 23 * * *', async () => {
  const pick = [...];
  const msg = pick[Math.floor(Math.random() * pick.length)];
  await client.pushMessage(userId, { type: 'text', text: msg });
  saveLog('예진이', msg);
}, { timezone: 'Asia/Tokyo' });

cron.schedule('30 23 * * *', async () => {
  const pick = [...];
  const msg = pick[Math.floor(Math.random() * pick.length)];
  await client.pushMessage(userId, { type: 'text', text: msg });
  saveLog('예진이', msg);
}, { timezone: 'Asia/Tokyo' });

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;
        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          if (/버전\??$/.test(text)) {
            const current = process.env.FORCED_MODEL || 'gpt-4o';
            await client.replyMessage(event.replyToken, { type: 'text', text: `지금은 ${current}이야!` });
            return;
          }

          if (/^3\.5$/.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-3.5-turbo') || '응 3.5로 말할게!' });
            return;
          }
          if (/^4\.0$/.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-4o') || '응 4.0으로 말할게!' });
            return;
          }

          if (/존댓말.*하지마/.test(text)) updateHonorificUsage(false);

          const model = process.env.FORCED_MODEL || 'gpt-4o';
          const reply = await getReplyByMessage(text, model);
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
          return;
        }

        if (message.type === 'image') {
          const stream = await client.getMessageContent(message.id);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          const reply = await getReplyByImagePrompt(buffer.toString('base64'));
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
          saveLog('예진이', reply);
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('웹훅 처리 에러:', err);
    res.status(200).send('OK');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
