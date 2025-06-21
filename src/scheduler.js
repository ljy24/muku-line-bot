// src/scheduler.js

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { getRandomMessage } = require('./loveMessages');
const sendPhotoRandomly = require('./sendPhotoRandomly');

const userId = process.env.TARGET_USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

function randomMessage() {
  return `아저씨~ ${getRandomMessage()}`;
}

// 1. 정각마다 "담타고?"
cron.schedule('0 9-18 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// 2. 40회 랜덤 메시지
function scheduleRandomMessages() {
  const hours = [...Array(12).keys()].map(i => i + 9); // 9~20시
  const used = new Set();

  while (used.size < 40) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!used.has(key)) {
      used.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, () => {
        client.pushMessage(userId, { type: 'text', text: randomMessage() });
      });
    }
  }
}

// 3. 23시, 23시30분 고정 메시지
cron.schedule('0 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
});

cron.schedule('30 23 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
});

// 4. 하루 4장 랜덤 셀카 (이미지)
function scheduleRandomPhotos() {
  const hours = [...Array(12).keys()].map(i => i + 9); // 9~20시
  const used = new Set();

  while (used.size < 4) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!used.has(key)) {
      used.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        const url = sendPhotoRandomly();
        await client.pushMessage(userId, {
          type: 'image',
          originalContentUrl: url,
          previewImageUrl: url
        });
      });
    }
  }
}

module.exports = {
  scheduleRandomMessages,
  scheduleRandomPhotos,
};
