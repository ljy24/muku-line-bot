// autoReply.js - 무쿠 전체 기능 통합 모듈

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { extractAndSaveMemory } = require('./memoryManager');
const express = require('express');

require('dotenv').config();

const app = express();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

const userId = process.env.TARGET_USER_ID;
const appConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
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
  const res = await openai.chat.completions.create({ model, messages, max_tokens: maxTokens, temperature: 0.7 });
  return res.choices[0]?.message?.content;
}

function setForcedModel(name) {
  forcedModel = name;
}

function getCurrentModelName() {
  return forcedModel || 'gpt-3.5-turbo';
}

async function saveConversationMemory(role, content) {
  const memoryPath = path.resolve(__dirname, '../memory/context-memory.json');
  let memories = [];
  try {
    const raw = safeRead(memoryPath);
    if (raw) memories = JSON.parse(raw);
  } catch (e) {}

  memories.push({ role, content, timestamp: moment().tz('Asia/Tokyo').format() });
  if (memories.length > 50) memories = memories.slice(-50);

  try {
    await fs.promises.writeFile(memoryPath, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (e) {}
}

async function getFullMemoryForPrompt() {
  let combined = [];
  const txts = ['1.txt', '2.txt', '3.txt'].map(f => safeRead(path.resolve(__dirname, '../memory/' + f))).filter(Boolean);
  combined.push(...txts.map(c => ({ role: 'system', content: c })));

  try {
    const fixedJson = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
    if (fixedJson) JSON.parse(fixedJson).forEach(c => combined.push({ role: 'system', content: c }));
  } catch {}

  try {
    const ctx = safeRead(path.resolve(__dirname, '../memory/context-memory.json'));
    if (ctx) JSON.parse(ctx).slice(-10).forEach(e => combined.push({ role: e.role, content: e.content }));
  } catch {}

  try {
    const love = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
    if (love) {
      const j = JSON.parse(love);
      ['love_expressions', 'daily_care', 'general'].forEach(k =>
        (j.categories?.[k] || []).slice(-2).forEach(m =>
          combined.push({ role: 'assistant', content: m.content })));
    }
  } catch {}

  return combined;
}

async function getSelfieReplyFromYeji() {
  const model = getCurrentModelName();
  const memory = await getFullMemoryForPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
    ...memory.slice(-10),
    { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
  ];
  const raw = await callOpenAI(messages, model, 100);
  return cleanReply(raw);
}

async function sendSelfieWithComment() {
  const index = Math.floor(Math.random() * 1200) + 1;
  const filename = `${index.toString().padStart(4, '0')}.jpg`;
  const imageUrl = `https://de-ji.net/yejin/${filename}`;
  const comment = await getSelfieReplyFromYeji();

  await client.pushMessage(userId, {
    type: 'image',
    originalContentUrl: imageUrl,
    previewImageUrl: imageUrl
  });

  if (comment) {
    setTimeout(async () => {
      await client.pushMessage(userId, { type: 'text', text: comment });
    }, 2000);
  }
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

async function getReplyByMessage(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return '무슨 말인지 못 알아들었어...';

  await saveConversationMemory('user', userMessage);
  extractAndSaveMemory(userMessage);

  const lower = userMessage.toLowerCase().trim();
  const model = getCurrentModelName();

  if (lower === '버전') return `지금은 ${model} 버전으로 대화하고 있어.`;
  if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
  if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
  if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

  if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
    await sendSelfieWithComment();
    return null;
  }

  const memory = await getFullMemoryForPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.' },
    ...memory,
    { role: 'user', content: userMessage }
  ];

  const raw = await callOpenAI(messages, model, 200);
  const reply = cleanReply(raw);
  if (reply) await saveConversationMemory('assistant', reply);
  return reply || '음... 뭐라고 말해야 할지 모르겠어';
}

function initServerState() {
  console.log('🚀 서버 상태 초기화 중...');
  console.log('✅ 서버 상태 초기화 완료!');
}

async function handleWebhook(req, res) {
  for (const event of req.body.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const reply = await getReplyByMessage(event.message.text);
      if (reply) await client.replyMessage(event.replyToken, { type: 'text', text: reply });
    }
  }
  res.status(200).send('OK');
}

async function handleForcePush(req, res) {
  const msg = await getRandomMessage();
  await client.pushMessage(userId, { type: 'text', text: msg });
  res.status(200).send('전송 완료');
}

function checkTobaccoReply() {
  const msg = '담타고?';
  return client.pushMessage(userId, { type: 'text', text: msg });
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
        const fn = Math.random() < 0.5 ? getRandomMessage : sendSelfieWithComment;
        const msg = await fn();
        if (msg && typeof msg === 'string') {
          await client.pushMessage(userId, { type: 'text', text: msg });
        }
      }, { timezone: 'Asia/Tokyo' });
      count++;
    }
  }
}

module.exports = {
  app,
  client,
  userId,
  appConfig,
  getReplyByMessage,
  getRandomMessage,
  sendSelfieWithComment,
  callOpenAI,
  cleanReply,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getFullMemoryForPrompt,
  saveConversationMemory,
  initServerState,
  handleWebhook,
  handleForcePush,
  checkTobaccoReply,
  startMessageAndPhotoScheduler
};
