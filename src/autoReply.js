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

// --- 기본 초기화 ---
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
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
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
  try {
    const res = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    });
    return res.choices[0]?.message?.content;
  } catch (error) {
    console.error(`❌ OpenAI 호출 실패 (${model}): ${error.message}`);
    throw error;
  }
}

function setForcedModel(name) {
  forcedModel = name;
  console.log(`✅ 모델 강제 설정: ${name || '자동 (기본)'}`);
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
  } catch (e) {
    console.error('❌ context-memory 파싱 실패:', e.message);
    memories = [];
  }
  memories.push({ role, content, timestamp: moment().tz('Asia/Tokyo').format() });
  if (memories.length > 50) memories = memories.slice(-50);
  try {
    const tmp = memoryPath + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(memories, null, 2), 'utf-8');
    await fs.promises.rename(tmp, memoryPath);
    console.log(`✅ context-memory 저장 완료 (${role}): ${content}`);
  } catch (err) {
    console.error('❌ context-memory 저장 실패:', err.message);
  }
}

function getFixedMemory() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
  return [m1, m2, m3].filter(Boolean).map(content => ({ role: 'system', content }));
}

// 랜덤 감정 메시지
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

async function getReplyByMessage(text) {
  if (!text || typeof text !== 'string') return '무슨 말인지 모르겠어...';
  await saveConversationMemory('user', text);
  extractAndSaveMemory(text);

  const model = getCurrentModelName();
  const memory = getFixedMemory();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.' },
    ...memory,
    { role: 'user', content: text }
  ];
  const raw = await callOpenAI(messages, model, 200);
  const reply = cleanReply(raw);
  await saveConversationMemory('assistant', reply);
  return reply;
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
    { role: 'system', content: '너는 무쿠야. 아저씨에게 셀카를 보내고 있어. 부끄럽고 귀엽게 한 마디 해줘.' },
    ...memory,
    { role: 'user', content: '셀카 보여줘!' }
  ];
  const raw = await callOpenAI(messages, model, 100);
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
        const message = await getRandomMessage();
        if (message) {
          await client.pushMessage(userId, { type: 'text', text: message });
          console.log(`[랜덤 메시지] ${cronExp}: ${message}`);
        }
      }, { timezone: 'Asia/Tokyo' });
      count++;
    }
  }

  cron.schedule('* * * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
      await client.pushMessage(userId, { type: 'text', text: '담타고?' });
    }
  });
}

module.exports = {
  app,
  client,
  userId,
  appConfig,
  initServerState: () => console.log('✅ 서버 상태 초기화 완료'),
  handleWebhook: async (req, res) => {
    for (const event of req.body.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const reply = await getReplyByMessage(userMessage);
        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
      } else if (event.type === 'message' && event.message.type === 'image') {
        const reply = await getReplyByImagePrompt();
        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
      }
    }
    res.status(200).send('OK');
  },
  handleForcePush: async (req, res) => {
    const message = req.query.msg || '강제 푸시 메시지야 아저씨!';
    await client.pushMessage(userId, { type: 'text', text: message });
    res.status(200).send(`보냄: ${message}`);
  },
  checkTobaccoReply: async () => {
    await client.pushMessage(userId, { type: 'text', text: '담타고?' });
  },
  startMessageAndPhotoScheduler,
  handleImageMessage: async (event) => {
    const reply = await getReplyByImagePrompt();
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
  },
  handleSelfieRequest: async (req, res) => {
    const selfieNumber = Math.floor(Math.random() * 1200) + 1;
    const filename = selfieNumber.toString().padStart(4, '0') + '.jpg';
    const selfieUrl = `https://de-ji.net/yejin/${filename}`;
    const comment = await getSelfieReplyFromYeji();
    await client.pushMessage(userId, {
      type: 'image',
      originalContentUrl: selfieUrl,
      previewImageUrl: selfieUrl
    });
    setTimeout(async () => {
      await client.pushMessage(userId, { type: 'text', text: comment });
    }, 1500);
    res.status(200).send('셀카 전송 완료');
  },
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getReplyByImagePrompt,
  saveConversationMemory
};
