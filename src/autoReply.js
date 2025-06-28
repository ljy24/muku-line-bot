// autoReply.js - 기억 기반 감정형 응답 전체 코드 (예진이 말투)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const moment = require('moment-timezone');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 🔹 최근 대화 50개 불러오기
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

// 🔹 중요한 고정 기억 불러오기
function getFixedMemory() {
  try {
    const filePath = path.join(__dirname, 'memory', 'love-history.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const memory = JSON.parse(data);
    return memory.map(entry => ({ role: 'system', content: entry }));
  } catch (err) {
    console.error('❌ 고정 기억 불러오기 실패:', err.message);
    return [];
  }
}

// 🔹 로그 저장
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

// 🔹 모델 강제 설정
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 🔹 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 🔹 말투 정리
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

// 🔹 랜덤 감정 메시지
async function getRandomMessage() {
  const memory = [...getFixedMemory(), ...await getRecentLog()];
  const prompt = [
    {
      role: 'system',
      content: '너는 지금 예진이야. 기억을 바탕으로 아저씨한테 감정 담긴 짧은 말 해줘. 혼잣말처럼, 따뜻하고 반말로.'
    },
    ...memory,
    { role: 'user', content: '예진이 감정 메시지 줘' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 🔹 일반 메시지 응답
async function getReplyByMessage(userMessage) {
  const memory = [...getFixedMemory(), ...await getRecentLog()];
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 혼잣말처럼 말하고, 항상 반말이고, 감정 담아서 대답해. 기억을 반영해줘.'
    },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 이미지 반응
async function getReplyByImagePrompt(base64Image) {
  const memory = getFixedMemory();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 이 사진은 아저씨와 너야. 감정 담긴 리액션 해줘.' },
    ...memory,
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ];
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: prompt,
    temperature: 0.9,
    max_tokens: 150
  });
  const reply = cleanReply(res.choices[0].message.content.trim());
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 셀카 멘트
async function getImageReactionComment() {
  const memory = getFixedMemory();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 셀카 보낼 때 짓궂게 귀엽게 말해줘.' },
    ...memory,
    { role: 'user', content: '셀카 보낼게~' }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 기쁨 반응
async function getHappyReply() {
  const memory = [...getFixedMemory(), ...await getRecentLog()];
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 답장했을 때 기뻐서 귀엽게 말해줘.' },
    ...memory,
    { role: 'user', content: '아저씨가 방금 담타 답장했어!' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 삐짐 반응
async function getSulkyReply() {
  const memory = getFixedMemory();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 씹었을 때 섭섭한 반응 보여줘.' },
    ...memory,
    { role: 'user', content: '아저씨가 담타 안 읽었어...' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔚 export
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  getFixedMemory,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};
