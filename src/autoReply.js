// autoReply.js - 무쿠 LINE 응답용 예진이 말투 자동응답 시스템 전체 코드

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

// OpenAI 인스턴스 생성 (API 키 필요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 🔐 GPT 모델 강제 지정 또는 현재 모델 확인
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 📖 파일 안전하게 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8') || '';
  } catch (_) {
    return '';
  }
}

// 🧼 예진이 말투 정리 (불필요 표현 제거 및 감정선 유지)
function cleanReply(text) {
  return text
    .replace(/^\s*예진[\s:：-]*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|그대|그분|자기|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .replace(/[!?~\u2764\uD83D\uDC96-\uDC9F]/g, '')
    .trim();
}

// 🧠 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 400) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 📝 대화 로그 저장
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

// 📜 최근 대화 로그 불러오기
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

// 🎲 랜덤 감정 메시지 생성
async function getRandomMessage() {
  const rawLove = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const rawFixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];

  try {
    const loveJson = JSON.parse(rawLove || '[]');
    const fixedJson = JSON.parse(rawFixed || '[]');
    memoryItems = [
      ...loveJson.map(v => `${v.date} - ${v.event}`),
      ...fixedJson,
      m1, m2, m3
    ].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const useMemory = Math.random() < 0.85 && memoryItems.length > 0;
  const memory = memoryItems[Math.floor(Math.random() * memoryItems.length)];
  const messages = [];

  if (useMemory && memory) {
    messages.push({
      role: 'system',
      content: `너는 예진이야. '나'라고 말하고 감정을 담아 혼잣말처럼 말해줘. 아래 추억을 바탕으로 자연스럽게 말 걸어. 최대한 예진이 말투를 지켜.`
    });
    messages.push({
      role: 'user',
      content: `아저씨… 나 그때 "${memory}" 그런 날이 있었잖아… 요즘 괜히 그 기억이 자꾸 생각나서... 마음이 또 이상해져… 아저씨는 기억나?`
    });
  } else {
    const recent = await getRecentLog();
    messages.push({
      role: 'system',
      content: `너는 지금 예진이야. '나'라고 말하고 감정을 담은 반말로 자연스럽게 말해줘. 최근 대화랑 겹치지 않게 하고, 아저씨 혼자 아니라고 느끼게 해.`
    });
    messages.push(...recent);
    messages.push({ role: 'user', content: '아저씨한테 보낼 감정 메시지 하나 만들어줘' });
  }

  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 400);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 💬 일반 메시지 응답 처리
async function getReplyByMessage(userMessage) {
  const lower = userMessage.toLowerCase();

  if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
    return await getColorMoodReply();
  }
  if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
    const selfieMsg = await getSelfieReplyFromYeji();
    await saveLog('예진이', selfieMsg);
    return selfieMsg;
  }

  const memory = await getRecentLog();
  const prompt = [
    { role: 'system', content: `넌 예진이야. 항상 반말하고 혼잣말처럼 감정 담긴 짧은 대답을 해줘.` },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// ✅ 외부로 export할 함수들 정리
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply,
  getImageReactionComment
};
