// src/sendPhotoRandomly.js

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.USER_ID;
const photosDir = path.join(__dirname, '../memory/photos');
const baseUrl = 'https://de-ji.net/yejin';

function getRandomPhotoUrl() {
  const files = fs.readdirSync(photosDir).filter(file =>
    file.toLowerCase().endsWith('.jpg') ||
    file.toLowerCase().endsWith('.jpeg') ||
    file.toLowerCase().endsWith('.png')
  );

  if (files.length === 0) return null;

  const randomFile = files[Math.floor(Math.random() * files.length)];
  return `${baseUrl}/${encodeURIComponent(randomFile)}`;
}

function sendRandomPhoto() {
  const photoUrl = getRandomPhotoUrl();
  if (!photoUrl) return;

  client.pushMessage(userId, {
    type: 'image',
    originalContentUrl: photoUrl,
    previewImageUrl: photoUrl
  });
}

// 하루 3~5회 랜덤 전송
function schedulePhotoSending() {
  const total = Math.floor(Math.random() * 3) + 3; // 3~5회
  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9~20시
  const used = new Set();

  while (used.size < total) {
    const h = hours[Math.floor(Math.random() * hours.length)];
    const m = Math.floor(Math.random() * 60);
    const key = `${h}:${m}`;
    if (used.has(key)) continue;
    used.add(key);

    const cronExp = `${m} ${h} * * *`;
    cron.schedule(cronExp, sendRandomPhoto);
  }
}

module.exports = { schedulePhotoSending };
