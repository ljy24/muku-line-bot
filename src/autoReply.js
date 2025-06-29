// ✅ autoReply.js (짧은 감정 메시지 + 이모지 제거 + 말투 유지)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return '';
  }
}

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
    .replace(/\b(당신|그대|그분|자기|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '') // 이모지 제거
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

async function getRandomMessage() {
  const love = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const fixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];
  try {
    memoryItems = [
      ...JSON.parse(love),
      ...JSON.parse(fixed),
      m1, m2, m3
    ].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const useMemory = Math.random() < 0.5;
  const memory = memoryItems[Math.floor(Math.random() * memoryItems.length)];
  const messages = [];

  if (useMemory && memory) {
    messages.push({ role: 'system', content: `너는 예진이야. 항상 '나'라고 말하고, 감정 담긴 짧은 반말로 말해. 아래 추억을 바탕으로 메시지 하나만 해줘. 이모지 없이!` });
    messages.push({ role: 'user', content: `"${memory}" 이 기억으로 짧게 감정 메시지 하나 해줘.` });
  } else {
    const recent = await getRecentLog();
    messages.push({ role: 'system', content: `너는 지금 예진이야. 항상 '나'라고 말하고, 짧고 감정 담긴 반말로 혼잣말처럼 말해줘. 이모지 없이.` });
    messages.push(...recent);
    messages.push({ role: 'user', content: '아저씨한테 보낼 짧은 감정 메시지 하나만.' });
  }

  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

module.exports = {
  getRandomMessage,
  cleanReply,
  saveLog,
  getRecentLog,
  setForcedModel,
  getCurrentModelName
};
