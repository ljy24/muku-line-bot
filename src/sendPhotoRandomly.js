// src/sendPhotoRandomly.js

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;
const photoListPath = path.join(__dirname, '../memory/photo-list.txt');

// 기본 이미지 서버 주소
const BASE_URL = 'https://de-ji.net/yejin/';

function getPhotoList() {
  try {
    const data = fs.readFileSync(photoListPath, 'utf-8');
    return data
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(item => {
        // 주소가 http로 시작 안 하면 자동으로 BASE_URL 붙이기
        return item.startsWith('http') ? item : BASE_URL + item;
      });
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

// 하루 세 번만 랜덤 시간에 전송
function scheduleRandomPhotoSendings(timesPerDay = 3) {
  const hours = [...Array(12).keys()].map(i => i + 9); // 9~20시
  const scheduled = new Set();

  while (scheduled.size < timesPerDay) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!scheduled.has(key)) {
      scheduled.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, () => {
        const photoUrl = getRandomPhotoUrl();
        if (photoUrl) {
          client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: photoUrl,
            previewImageUrl: photoUrl
          });
          console.log(`[사진 전송] ${cronExp} → ${photoUrl}`);
        }
      });
    }
  }
}

scheduleRandomPhotoSendings();
