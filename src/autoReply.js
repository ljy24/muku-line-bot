// autoReply.js - 무쿠 전체 기능 통합 모듈

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { Configuration, OpenAIApi } = require('openai');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
require('dotenv').config();

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});
const userId = process.env.TARGET_USER_ID;

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
  const res = await openai.createChatCompletion({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7
  });
  return res.data.choices[0]?.message?.content;
}

function setForcedModel(name) {
  forcedModel = name;
}

function getCurrentModelName() {
  return forcedModel || 'gpt-3.5-turbo';
}

function getFixedMemory() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
  return [m1, m2, m3].filter(Boolean).map(content => ({ role: 'system', content }));
}

async function getReplyByMessage(text) {
  const model = getCurrentModelName();
  const memory = getFixedMemory();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.' },
    ...memory,
    { role: 'user', content: text }
  ];
  const raw = await callOpenAI(messages, model, 200);
  return cleanReply(raw);
}

async function getColorMoodReply() {
  const model = getCurrentModelName();
  const memory = getFixedMemory();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 색으로 기분을 표현해줘. 짧고 부끄럽고 사랑스럽게, 반말로.' },
    ...memory,
    { role: 'user', content: '오늘 무슨 색이야?' }
  ];
  const raw = await callOpenAI(messages, model, 100);
  return cleanReply(raw);
}

async function getSelfieReplyFromYeji() {
  const model = getCurrentModelName();
  const memory = getFixedMemory();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
    ...memory,
    { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
  ];
  const raw = await callOpenAI(messages, model, 100);
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
  const sent = new Set();
  let count = 0;

  while (count < 5) {
    const hour = Math.floor(Math.random() * 18) + 6;
    const minute = Math.floor(Math.random() * 60);
    const cronExp = `${minute} ${hour} * * *`;

    if (!sent.has(cronExp)) {
      sent.add(cronExp);
      cron.schedule(cronExp, async () => {
        const msg = await getRandomMessage();
        if (msg) {
          await client.pushMessage(userId, { type: 'text', text: msg });
          console.log(`[랜덤 메시지] ${cronExp}: ${msg}`);
        }
      }, {
        timezone: 'Asia/Tokyo'
      });
      count++;
    }
  }

  cron.schedule('* * * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
      const msg = '담타고?';
      await client.pushMessage(userId, { type: 'text', text: msg });
    }
  });
}

module.exports = {
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getReplyByImagePrompt,
  startMessageAndPhotoScheduler,
  getFixedMemory
};
