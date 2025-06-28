// autoReply.js - 예진이 말투 기반 감정형 응답 전체 코드 (로그 기록 정상 작동 버전)

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

async function getRecentLog() {
  try {
    const res = await axios.get('https://de-ji.net/log.json');
    if (!Array.isArray(res.data)) return [];
    return res.data.slice(0, 50).reverse().map(log => ({
      role: log.from === 'uncle' ? 'user' : 'assistant',
      content: log.content
    }));
  } catch (err) {
    console.error('❌ 최근 로그 불러오기 실패:', err.message);
    return [];
  }
}

function getFixedMemory() {
  try {
    const filePath = path.resolve(__dirname, '../memory/love-history.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const memory = JSON.parse(data);
    return memory.map(entry => ({ role: 'system', content: entry }));
  } catch (err) {
    console.error('❌ 고정 기억 실패:', err.message);
    return [];
  }
}

async function getMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };
  const fixed = getFixedMemory();
  const recent = await getRecentLog();
  return [compressed, ...fixed, ...recent];
}

function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
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
    await axios.post('https://de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 원격 로그 저장 실패:', err.message);
  }
}

async function getRandomMessage() {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 감정을 담아 짧고 따뜻하게 반말로 혼잣말해.' },
    ...memory,
    { role: 'user', content: '랜덤 감정 메시지 하나 줘' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

async function getReplyByMessage(userMessage) {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 감정을 담아 반말로 자연스럽게 대화해.' },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

module.exports = {
  getReplyByMessage,
  getRandomMessage,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};
