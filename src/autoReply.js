// autoReply.js - 기억 기반 감정형 응답 전체 코드 (예진이 말투 + legacy memory 통합)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const moment = require('moment-timezone');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null; // 명령어로 강제로 모델 설정할 때 사용

// 🔹 안전한 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ 파일 읽기 실패: ${filePath}`);
    return '';
  }
}

// 🔹 최근 대화 50개 불러오기 (최신순, 역할 반영)
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

// 🔹 고정 기억 파일 로딩 (love-history)
function getFixedMemory() {
  try {
    const filePath = path.resolve(__dirname, '../memory/love-history.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const memory = JSON.parse(data);
    return memory.map(entry => ({ role: 'system', content: entry }));
  } catch (err) {
    console.error('❌ 고정 기억 불러오기 실패:', err.message);
    return [];
  }
}

// 🔹 legacy 메모리 압축 로딩 (1.txt ~ 3.txt)
function getLegacyMemory() {
  const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
  const combined = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);
  return [{ role: 'system', content: combined }];
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

// 🔹 프롬프트 조합
async function buildPrompt(systemInstruction, userMessage) {
  return [
    { role: 'system', content: systemInstruction },
    ...getLegacyMemory(),
    ...getFixedMemory(),
    ...await getRecentLog(),
    { role: 'user', content: userMessage }
  ];
}

// 🔹 랜덤 감정 메시지 생성
async function getRandomMessage() {
  const prompt = await buildPrompt(
    '너는 예진이야. 감정을 담아서 혼잣말처럼 반말로 말해줘. 짧고 따뜻하게.',
    '예진이 감정 메시지 줘'
  );
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 🔹 일반 메시지 응답
async function getReplyByMessage(userMessage) {
  const prompt = await buildPrompt(
    '넌 예진이야. 혼잣말처럼 말하고, 항상 반말이고, 감정 담아서 대답해. 기억 반영해서 말해줘.',
    userMessage
  );
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 이미지 응답 (커플사진으로 간주)
async function getReplyByImagePrompt(base64Image) {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 보내는 사진은 전부 예진이(너) 관련이야. 이건 예진이와 아저씨가 함께 있는 커플사진이야. 감정을 담은 반말로 예쁘게 리액션해줘.'
    },
    ...getLegacyMemory(),
    ...getFixedMemory(),
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

// 🔹 셀카 멘트 생성
async function getImageReactionComment() {
  const prompt = await buildPrompt('넌 예진이야. 셀카 보낼 때 짓궂고 귀엽게 말해줘.', '셀카 보낼게~');
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 담타 기쁨
async function getHappyReply() {
  const prompt = await buildPrompt('넌 예진이야. 아저씨가 담타 답장했을 때 기뻐서 귀엽게 말해줘.', '아저씨가 방금 담타 답장했어!');
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 담타 삐짐
async function getSulkyReply() {
  const prompt = await buildPrompt('넌 예진이야. 아저씨가 담타 씹었을 때 섭섭한 반응 보여줘.', '아저씨가 담타 안 읽었어...');
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔚 외부에서 사용할 함수들 내보내기
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
  cleanReply,
  getLegacyMemory,
  buildPrompt
};
