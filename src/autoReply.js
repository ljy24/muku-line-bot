// autoReply.js - 기억 기반 감정형 응답 전체 코드 (예진이 말투)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null; // 수동 설정 모델

// 📌 안전한 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return '';
  }
}

// 📌 최근 대화 로그 불러오기
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

// 🔹 고정 기억 불러오기 (love-history.json)
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

// 🔹 전체 기억 통합 (1~3.txt + love-history + recentLog)
async function getMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };
  const fixed = getFixedMemory();
  const recent = await getRecentLog();
  return [compressed, ...fixed, ...recent];
}

// 🧠 강제 모델 설정
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 🧠 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 🧼 말투 정리
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

// 📦 로그 저장
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

// 🎲 랜덤 감정 메시지
async function getRandomMessage() {
  // 시작 시 고정 멘트로 임시 대체
  const msg = '아저씨 뭐해?';
  await saveLog('예진이', msg);
  return msg;
}

// 😊 기쁨 반응
async function getHappyReply() {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 답장했을 때 기쁘게 말해.' },
    ...memory,
    { role: 'user', content: '아저씨가 방금 답장했어!' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 😤 삐짐 반응
async function getSulkyReply() {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 답장 안했을 때 삐진 말투로 말해.' },
    ...memory,
    { role: 'user', content: '아저씨가 담타 안 읽었어...' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 💬 일반 메시지 응답
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

// 🖼️ 이미지 리액션
async function getReplyByImagePrompt(base64Image) {
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 보내는 사진은 항상 예진이 관련이야. 감정 담은 반말로 예쁘게 반응해.' },
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
  const reply = res.choices[0].message.content.trim();
  await saveLog('예진이', reply);
  return cleanReply(reply);
}

// 🤳 셀카 리액션
async function getImageReactionComment() {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 셀카 보낼 때 짓궂고 귀엽게 말해.' },
    ...memory,
    { role: 'user', content: '셀카 보낼게~' }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🎨 색깔 감정
async function getColorMoodReply() {
  const memory = await getMemoryPrompt();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 색 하나로 감정을 담아 반말로 말해줘.' },
    ...memory,
    { role: 'user', content: '오늘 내 색 뭐야?' }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 📤 모듈 내보내기
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
