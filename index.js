const { getReplyByMessage, getRandomMessage } = require('./src/autoReply');
const { Client } = require('@line/bot-sdk');
const cron = require('node-cron');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 1. 9시~18시 정각마다 "담타고?", "담타 가자" 번갈아 전송
for (let h = 9; h <= 18; h++) {
  cron.schedule(`0 ${h} * * *`, async () => {
    const msg = h % 2 === 0 ? "담타고?" : "담타 가자";
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[담타메시지] ${h}시: ${msg}`);
  });
}

// 2. 하루 6번 랜덤 감정 메시지 (9~18시 사이 랜덤 시간에!)
function randomUniqueTimes(count, start = 9, end = 18) {
  const slots = [];
  while (slots.length < count) {
    const h = Math.floor(Math.random() * (end - start + 1)) + start;
    const m = Math.floor(Math.random() * 60);
    const key = `${h}:${m}`;
    if (!slots.includes(key)) slots.push(key);
  }
  return slots;
}
const times = randomUniqueTimes(6); // 예: ["9:15", "11:48", ...]
for (const t of times) {
  const [hour, min] = t.split(':');
  cron.schedule(`${min} ${hour} * * *`, async () => {
    const msg = await getRandomMessage();
    if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[랜덤감정] ${hour}시${min}분: ${msg}`);
  });
}

// 3. (서버 깨우기용)
const express = require('express');
const app = express();
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));
app.listen(process.env.PORT || 3000, () => {
  console.log('무쿠 서버 스타트!');
});
