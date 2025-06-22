// src/sendPhotoRandomly.js – 예진이 셀카 전용 리액션 포함 (GPT Vision 제거)

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { getRandomMessage } = require('./autoReply');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;
const photoListPath = path.join(__dirname, '../memory/photo-list.txt');
const BASE_URL = 'https://de-ji.net/yejin/';

function getPhotoList() {
  try {
    const data = fs.readFileSync(photoListPath, 'utf-8');
    return data
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(item => (item.startsWith('http') ? item : BASE_URL + item));
  } catch (err) {
    console.error('사진 리스트를 불러오는 데 실패했어요:', err);
    return [];
  }
}

function getRandomPhotoUrl() {
  const photos = getPhotoList();
  if (photos.length === 0) return null;
  const index = Math.floor(Math.random() * photos.length);
  return photos[index];
}

function scheduleRandomPhotoSendings(timesPerDay = 1) {
  const hours = [...Array(10).keys()].map(i => i + 9); // 9~18시
  const scheduled = new Set();

  while (scheduled.size < timesPerDay) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!scheduled.has(key)) {
      scheduled.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        const photoUrl = getRandomPhotoUrl();
        if (!photoUrl) return;

        const reply = await getRandomMessage(); // GPT-3.5로 감정 문장 생성

        await client.pushMessage(userId, {
          type: 'text',
          text: reply
        });

        await client.pushMessage(userId, {
          type: 'image',
          originalContentUrl: photoUrl,
          previewImageUrl: photoUrl
        });

        console.log(`[사진 전송] ${cronExp} → ${photoUrl}`);
      });
    }
  }
}

scheduleRandomPhotoSendings();
