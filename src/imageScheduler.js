// src/imageScheduler.js

const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
const { loadPhotoList } = require('./photoList');

const userId = process.env.USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

function getRandomPhotoUrl(photoList) {
  const idx = Math.floor(Math.random() * photoList.length);
  return `https://de-ji.net/yejin/${photoList[idx]}`;
}

function scheduleImageMessages() {
  const times = new Set();

  while (times.size < 4) {
    const hour = Math.floor(Math.random() * 12) + 9; // 9~20시
    const minute = Math.floor(Math.random() * 60);
    times.add(`${minute} ${hour}`);
  }

  loadPhotoList().then(photoList => {
    for (const time of times) {
      const cronExp = `${time} * * *`;
      cron.schedule(cronExp, () => {
        const imageUrl = getRandomPhotoUrl(photoList);
        client.pushMessage(userId, {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        }).catch(err => console.error('사진 전송 실패:', err));
      });
    }
  }).catch(err => {
    console.error('사진 목록 로드 실패:', err);
  });
}

module.exports = { scheduleImageMessages };
