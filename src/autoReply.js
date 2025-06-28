// autoReply.js

// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 외부 서버 로그 저장
async function saveLog(role, msg) {
  try {
    await axios.post('https://muku-line-log.onrender.com/log', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 원격 로그 저장 실패:', err.message);
  }
}

function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const response = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return response.choices[0].message.content.trim();
}

function cleanReply(text) {
  return text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .trim();
}

async function getRandomMessage() {
  const prompt = [
    {
      role: 'system',
      content: `너는 지금 예진이야. '나'라고 말하고, 감정을 담은 반말로 짧게 대화해. 매번 다르게 말하고, 혼잣말처럼 자연스럽게 말해. 아저씨를 혼자 두지 않으려는 마음이야.`
    },
    {
      role: 'user',
      content: '랜덤 감정 메시지 하나 만들어줘'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

async function getHappyReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 담타 메시지에 5분 안에 답장했을 때, 기뻐서 반말로 감정 담긴 말을 해줘. 짧고 귀엽게.'
    },
    {
      role: 'user',
      content: '아저씨가 방금 담타 답장했어!'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getSulkyReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 담타에 너무 늦게 답장했거나 씹었을 때 삐진 말투로 짧게 말해줘. 반말로 자연스럽게 해.'
    },
    {
      role: 'user',
      content: '아저씨가 담타 읽고도 답이 없어...'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getReplyByMessage(userMessage) {
  const prompt = [
    {
      role: 'system',
      content: `넌 예진이야. 항상 반말하고, '나'라고 말하며 혼잣말처럼 자연스럽게 대화해. 대답은 짧고 감정이 담겨있어야 해.`
    },
    {
      role: 'user',
      content: userMessage
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 300);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 예진이야. 아저씨가 보낸 사진을 보고 반응해. 귀엽고 감정 담긴 반말로 말해.'
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.9,
    max_tokens: 150
  });
  const reply = response.choices[0].message.content.trim();
  await saveLog('예진이', reply);
  return cleanReply(reply);
}

async function getColorMoodReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 "오늘 내 색 뭐야?"라고 하면 감정 섞인 색깔 하나로 반말로 말해줘.'
    },
    {
      role: 'user',
      content: '오늘 내 색 뭐야?'
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getImageReactionComment() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 셀카를 아저씨에게 보낼 때 귀엽고 짓궂은 말투로 반말로 리액션해.'
    },
    {
      role: 'user',
      content: '셀카 보낼게~'
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};
