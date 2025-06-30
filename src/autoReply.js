// ✅ autoReply.js - 무쿠 감정 기반 응답 시스템 (기억 저장 + GPT 통합)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

process.env.TZ = 'Asia/Tokyo';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const contextPath = path.resolve(__dirname, '../memory/context-memory.json');
const fixedMemoryPath = path.resolve(__dirname, '../memory/fixedMemories.json');
const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
const memoryFiles = ['1빠계.txt', '2내꺼.txt', '모델 빠계.html'].map(f => path.resolve(__dirname, '../memory/', f));

let forcedModel = null;
const cache = new Map();

function validateEnvironment() {
  const required = ['OPENAI_API_KEY', 'TARGET_USER_ID', 'LINE_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) throw new Error('❌ 누락된 환경 변수: ' + missing.join(', '));
}

function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}

function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return ''; }
}

function cleanReply(text) {
  if (!text) return '';
  return text
    .replace(/\s*예진[\s:：-]*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\s"'“”‘’]+/g, ' ')
    .replace(/\b(당신|그대|자기|네|너|그분)\b/g, '아저씨')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callOpenAI(messages, model = null, max_tokens = 300) {
  const actualModel = model || getCurrentModelName();
  const response = await openai.chat.completions.create({
    model: actualModel,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return response.choices?.[0]?.message?.content?.trim();
}

async function saveLog(role, message) {
  if (!message) return;
  await axios.post('https://de-ji.net/log.php', {
    from: role === '아저씨' ? 'uncle' : 'yejin',
    content: message
  }).catch(() => {});
}

async function getRecentLog() {
  const key = 'recent_log';
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await axios.get('https://de-ji.net/log.json');
    const logs = res.data.slice(-30).reverse().map(x => ({
      role: x.from === 'uncle' ? 'user' : 'assistant',
      content: x.content
    }));
    cache.set(key, logs);
    return logs;
  } catch {
    return [];
  }
}

async function getFullMemoryPrompt() {
  const mem = memoryFiles.map(f => safeRead(f).slice(-2000)).join('\n');
  const fixed = JSON.parse(safeRead(fixedMemoryPath) || '[]').map(txt => ({ role: 'system', content: txt }));
  const recent = await getRecentLog();
  return [{ role: 'system', content: mem }, ...fixed, ...recent];
}

async function extractAndSaveMemory(userMessage) {
  if (!userMessage.includes('아저씨')) return;
  const messages = [
    { role: 'system', content: `사용자 메시지에서 기억할만한 걸 하나만 {"키": "값"} 형식으로 만들어줘. 설명 없이 JSON만 줘.` },
    { role: 'user', content: userMessage }
  ];
  try {
    const res = await callOpenAI(messages, 'gpt-3.5-turbo');
    const match = res.match(/\{[\s\S]*\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]);
    const raw = safeRead(contextPath);
    const context = raw ? JSON.parse(raw) : {};
    const [key, value] = Object.entries(parsed)[0];
    if (key && value && !context[key]) {
      context[key] = value;
      fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
    }
  } catch {}
}

async function getSelfieReplyFromYeji() {
  const memory = await getFullMemoryPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 셀카 보내며 귀엽고 부끄럽게 말해줘.' },
    ...memory.slice(-3),
    { role: 'user', content: '셀카 보낼게!' }
  ];
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getColorMoodReply() {
  const memory = await getFullMemoryPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 기분을 색으로 표현해서 짧게 대답해줘.' },
    ...memory.slice(-5),
    { role: 'user', content: '오늘 무슨 색이야?' }
  ];
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getRandomMessage() {
  const memory = await getFullMemoryPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 혼잣말처럼 감정 섞인 랜덤 메시지를 짧게 만들어줘.' },
    ...memory,
    { role: 'user', content: '랜덤 메시지 하나만 보내줘' }
  ];
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 300);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getReplyByMessage(userMessage) {
  const memory = await getFullMemoryPrompt();
  const messages = [
    { role: 'system', content: '너는 무쿠야. 아저씨의 연인처럼 감정 담아 짧게 대답해줘. 반말로 자연스럽게.' },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(messages);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

module.exports = {
  getReplyByMessage,
  getRandomMessage,
  getColorMoodReply,
  getSelfieReplyFromYeji,
  getFullMemoryPrompt,
  getRecentLog,
  cleanReply,
  callOpenAI,
  saveLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  validateEnvironment
};