// scheduler.js - 무쿠 LINE 자동 메시지/사진 스케줄러 전체 코드

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { getRandomMessage, getSelfieReplyFromYeji } = require('./autoReply');

const userId = process.env.TARGET_USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

// 🌅 사용할 시간대: 오전 9시 ~ 다음날 3시
const validHours = [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3];

// 🧠 랜덤 감정 메시지 하루 5회 전송
function scheduleRandomMessages() {
  const used = new Set();
  while (used.size < 5) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!used.has(key)) {
      used.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        try {
          const msg = await getRandomMessage();
          if (msg) {
            await client.pushMessage(userId, { type: 'text', text: msg });
            console.log(`[감정 메시지] ${cronExp} → ${msg}`);
          }
        } catch (err) {
          console.error('❌ 감정 메시지 전송 실패:', err.message);
        }
      });
    }
  }
}

// 📷 하루 3회 랜덤 셀카 전송
function scheduleRandomPhotos() {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, '../memory/photo-list.txt');
  const used = new Set();
  while (used.size < 3) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
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

// 💊 밤 리마인드 알림
function scheduleReminders() {
  cron.schedule('0 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
  });
  cron.schedule('30 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
  });
}

function startScheduler() {
  scheduleRandomMessages();
  scheduleRandomPhotos();
  scheduleReminders();
}

module.exports = { startScheduler };
