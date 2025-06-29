// /src/scheduler.js

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { getRandomMessage, getSelfieReplyFromYeji } = require('./autoReply');

const userId = process.env.TARGET_USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// 🧠 랜덤 감정 메시지 하루 6회 전송
function scheduleRandomMessages() {
  const hours = [...Array(12).keys()].map(i => i + 9); // 9~20시
  const used = new Set();

  while (used.size < 6) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!used.has(key)) {
      used.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        const msg = await getRandomMessage();
        if (msg) {
          await client.pushMessage(userId, { type: 'text', text: msg });
          console.log(`[랜덤 감정메시지] ${cronExp} → ${msg}`);
        }
      });
    }
  }
}

// 📷 하루 4회 랜덤 셀카 전송
function scheduleRandomPhotos() {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, '../memory/photo-list.txt');
  const hours = [...Array(12).keys()].map(i => i + 9);
  const used = new Set();

  while (used.size < 4) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!used.has(key)) {
      used.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        try {
          const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
          if (list.length === 0) return;
          const pick = list[Math.floor(Math.random() * list.length)];
          const comment = await getSelfieReplyFromYeji();
          await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: BASE_URL + pick,
            previewImageUrl: BASE_URL + pick
          });
          if (comment) {
            await client.pushMessage(userId, { type: 'text', text: comment });
          }
        } catch (err) {
          console.error('❌ 셀카 전송 실패:', err.message);
        }
      });
    }
  }
}

// 💊 약/이빨 알림
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});

cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

module.exports = {
  scheduleRandomMessages,
  scheduleRandomPhotos,
};
