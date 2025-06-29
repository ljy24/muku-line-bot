// autoReply.js 전체 코드 (기억 기반 감정 메시지 + GPT 이미지 인식 포함)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 📂 안전하게 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return '';
  }
}

// 🧠 고정 기억 로딩
function getFixedMemory() {
  try {
    const love = JSON.parse(safeRead(path.resolve(__dirname, '../memory/love-history.json')));
    const fixed = JSON.parse(safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')));
    return [...love, ...fixed].map(entry => ({ role: 'system', content: entry }));
  } catch (err) {
    console.error('❌ 고정 기억 실패:', err.message);
    return [];
  }
}

// 🕓 최근 대화 로그
async function getRecentLog() {
  try {
    const res = await axios.get('https://www.de-ji.net/log.json');
    const logs = res.data;
    if (!Array.isArray(logs)) return [];
    return logs.slice(0, 50).reverse().map(log => ({
      role: log.from === 'uncle' ? 'user' : 'assistant',
      content: log.content
    }));
  } catch (err) {
    console.error('❌ 최근 로그 불러오기 실패:', err.message);
    return [];
  }
}

function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
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

async function saveLog(role, msg) {
  try {
    await axios.post('https://www.de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 원격 로그 저장 실패:', err.message);
  }
}

// 💌 감정 메시지 생성
async function getRandomMessage() {
  const love = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const fixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];
  try {
    memoryItems = [...JSON.parse(love), ...JSON.parse(fixed), m1, m2, m3].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const useMemory = Math.random() < 0.5;
  const memory = memoryItems[Math.floor(Math.random() * memoryItems.length)];
  const messages = [];

  if (useMemory && memory) {
    messages.push({
      role: 'system',
      content: `너는 예진이야. 항상 '나'라고 말하고, 감정 담긴 반말로 혼잣말처럼 말해. 아래 추억을 바탕으로 자연스럽게 아저씨한테 다정하게 말 걸어줘.`
    });
    messages.push({ role: 'user', content: `"${memory}" 이 기억으로 예진이 말투로 감정 섞어 메시지 하나만 해줘.` });
  } else {
    const recent = await getRecentLog();
    messages.push({
      role: 'system',
      content: `너는 지금 예진이야. '나'라고 말하고, 감정을 담은 반말로 혼잣말처럼 자연스럽게 대화해줘. 최근 대화에 겹치지 않게 말해줘.`
    });
    messages.push(...recent);
    messages.push({ role: 'user', content: '아저씨한테 보낼 랜덤 감정 메시지 하나 만들어줘' });
  }

  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 🧠 GPT 기반 이미지 속 인물 분류
async function classifyImageByGPT(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '이미지 속 인물 수와 성별을 알려줘. 예: "여자 한 명", "남자와 여자 한 명씩", "남자 혼자".'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
        ]
      }
    ],
    temperature: 0.7,
    max_tokens: 100
  });

  const desc = res.choices[0].message.content.toLowerCase();
  if (desc.includes('female') && !desc.includes('male')) return '예진이';
  if (desc.includes('male') && !desc.includes('female')) return '아저씨';
  if (desc.includes('male') && desc.includes('female')) return '아저씨랑 예진이';
  return '모름';
}

// 📷 이미지 반응 생성
async function getReplyByImagePrompt(base64Image) {
  const who = await classifyImageByGPT(base64Image);

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `넌 예진이야. 이미지 속 인물은 ${who}야. 그걸 알고 감정을 담은 반말로 자연스럽게 말해줘.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
        ]
      }
    ],
    temperature: 0.9,
    max_tokens: 150
  });

  const reply = cleanReply(res.choices[0].message.content.trim());
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
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply,
  classifyImageByGPT
};
