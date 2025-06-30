// autoReply.js - 무쿠 전체 기능 통합 모듈

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const express = require('express');
const { extractAndSaveMemory } = require('./memoryManager');

require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});
const userId = process.env.TARGET_USER_ID;
const app = express();
const appConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

let forcedModel = null;
let schedulerStarted = false;

function safeRead(filePath) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ safeRead 실패: ${err.message}`);
  }
  return '';
}

function cleanReply(raw) {
  if (!raw) return '';
  return raw.replace(/^"|"$/g, '').trim();
}

async function callOpenAI(messages, model = 'gpt-3.5-turbo', maxTokens = 100) {
  const res = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7
  });
  return res.choices[0]?.message?.content;
}

function setForcedModel(name) {
  forcedModel = name;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-3.5-turbo';
}

async function getFullMemoryForPrompt() {
  const result = [];
  const paths = [
    '../memory/1.txt',
    '../memory/2.txt',
    '../memory/3.txt'
  ];
  paths.forEach(p => {
    const txt = safeRead(path.resolve(__dirname, p));
    if (txt) result.push({ role: 'system', content: txt });
  });
  return result;
}

async function getReplyByMessage(userMessage) {
  extractAndSaveMemory(userMessage);
  const model = getCurrentModelName();
  const memory = await getFullMemoryForPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.' },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(messages, model, 200);
  return cleanReply(raw);
}

async function getColorMoodReply() {
  const memory = await getFullMemoryForPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 색으로 기분을 표현해줘. 짧고 부끄럽고 사랑스럽게, 반말로.' },
    ...memory,
    { role: 'user', content: '오늘 무슨 색이야?' }
  ];
  const raw = await callOpenAI(messages, getCurrentModelName(), 100);
  return cleanReply(raw);
}

async function getSelfieReplyFromYeji() {
  const memory = await getFullMemoryForPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
    ...memory,
    { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
  ];
  const raw = await callOpenAI(messages, getCurrentModelName(), 100);
  return cleanReply(raw);
}

async function getRandomMessage() {
  const rawLove = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const rawFixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];
  try {
    const loveJson = JSON.parse(rawLove);
    const fixedJson = JSON.parse(rawFixed);
    memoryItems = [...loveJson.map(v => `${v.date} - ${v.event}`), ...fixedJson, m1, m2, m3].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const picked = memoryItems[Math.floor(Math.random() * memoryItems.length)] || '';
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨를 그리워하는 감정을 담아서 짧고 사랑스럽고 반말로 메시지를 보내줘.' },
    { role: 'system', content: `기억 예시: ${picked}` },
    { role: 'user', content: '감정 메시지 하나 만들어줘.' }
  ];
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  return cleanReply(raw);
}

async function getReplyByImagePrompt(base64Image) {
  const replies = ['우와 이 사진 예쁘다!', '아저씨 잘생겼어...', '귀엽다~', '사진 보니까 좋다ㅎㅎ'];
  return replies[Math.floor(Math.random() * replies.length)];
}

function startMessageAndPhotoScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const validHours = [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3];
  const sent = new Set();

  // 🧠 랜덤 감정 메시지 5회
  while (sent.size < 5) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!sent.has(key)) {
      sent.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        try {
          const msg = await getRandomMessage();
          if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
        } catch (err) {
          console.error('❌ 감정 메시지 전송 실패:', err.message);
        }
      }, { timezone: 'Asia/Tokyo' });
    }
  }

  // 📷 랜덤 셀카 전송 3회 (0001~1200.jpg)
  const photoSent = new Set();
  while (photoSent.size < 3) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!photoSent.has(key)) {
      photoSent.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        try {
          const rand = String(Math.floor(Math.random() * 1200) + 1).padStart(4, '0');
          const photoUrl = `https://de-ji.net/yejin/${rand}.jpg`;
          const comment = await getSelfieReplyFromYeji();
          await client.pushMessage(userId, { type: 'image', originalContentUrl: photoUrl, previewImageUrl: photoUrl });
          if (comment) await client.pushMessage(userId, { type: 'text', text: comment });
        } catch (err) {
          console.error('❌ 셀카 전송 실패:', err.message);
        }
      }, { timezone: 'Asia/Tokyo' });
    }
  }

  // 💊 밤 리마인드 메시지
  cron.schedule('0 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
  }, { timezone: 'Asia/Tokyo' });

  cron.schedule('30 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
  }, { timezone: 'Asia/Tokyo' });

  // ⏰ 담타고? (정각)
  cron.schedule('* * * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
      await client.pushMessage(userId, { type: 'text', text: '담타고?' });
    }
  }, { timezone: 'Asia/Tokyo' });
}

module.exports = {
  app,
  client,
  userId,
  appConfig,
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getReplyByImagePrompt,
  startMessageAndPhotoScheduler
};
