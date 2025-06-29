// autoReply.js - 무쿠 LINE 응답용 예진이 말투 + 감정기억 자동 저장 + 자동 셀카 전송 포함 전체 코드 (스케줄러 통합 완료)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;
const contextPath = path.resolve(__dirname, '../memory/context-memory.json');

const userId = process.env.TARGET_USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

// 🔐 GPT 모델 지정 / 확인
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 📖 안전하게 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8') || '';
  } catch (_) {
    return '';
  }
}

// 🧼 예진이 말투 정리 (자기, 너, 당신 → 아저씨)
function cleanReply(text) {
  return text
    .replace(/\s*예진[\s:：-]*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|그대|그분|자기야|자기|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/아저씨에게 아저씨라고/g, '아저씨에게')
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

// 📝 로그 저장
async function saveLog(role, msg) {
  try {
    await axios.post('https://www.de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 로그 저장 실패:', err.message);
  }
}

// 📜 최근 로그 불러오기
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
    console.error('❌ 최근 로그 실패:', err.message);
    return [];
  }
}

// 📌 대화 중 기억할만한 내용 자동 추출
async function extractAndSaveMemory(userMessage) {
  try {
    if (!userMessage.includes('아저씨')) return;
    const messages = [
      { role: 'system', content: '사용자의 대화에서 감정이나 기억, 사건, 장소, 인물 중 기억할만한 내용을 키-설명 쌍으로 만들어줘. 1개만. JSON 형태로. 앞뒤에 ``` 쓰지 마.' },
      { role: 'user', content: userMessage }
    ];
    let res = await callOpenAI(messages, 'gpt-3.5-turbo', 200);
    res = res.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(res);
    const raw = safeRead(contextPath);
    const context = raw ? JSON.parse(raw) : {};
    const key = Object.keys(parsed)[0];
    if (key && parsed[key] && !context[key]) {
      context[key] = parsed[key];
      fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
      console.log(`📌 새로운 기억 저장: ${key}`);
    }
  } catch (err) {
    console.error('❌ 기억 추출 실패:', err.message);
  }
}

// 📸 셀카 응답 멘트
async function getSelfieReplyFromYeji() {
  const messages = [
    { role: 'system', content: '넌 예진이야. 지금 아저씨한테 셀카를 보내고 있어. 셀카에 어울리는 짧고 감정 담긴 말투로 말해줘. 약간 부끄럽거나 귀엽게.' },
    { role: 'user', content: '셀카 보낼게! 코멘트 해줘.' }
  ];
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 📦 고정 기억 불러오기
function getFixedMemory() {
  const fixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  try {
    return JSON.parse(fixed || '[]').map(text => ({ role: 'system', content: text }));
  } catch {
    return [];
  }
}

// 🧠 전체 기억 프롬프트 구성
async function getFullMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };
  const fixed = getFixedMemory();
  const recent = await getRecentLog();
  return [compressed, ...fixed, ...recent];
}

// 🎲 랜덤 감정 메시지 생성
async function getRandomMessage() {
  const messages = await getFullMemoryPrompt();
  messages.push({ role: 'user', content: '예진이처럼 감정 담긴 랜덤 메시지 하나 만들어줘. 혼잣말처럼 아저씨한테 말하는 식으로.' });
  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 400);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 💬 메시지 응답 처리
async function getReplyByMessage(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower === '버전') return `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`;
  if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
  if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
  if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) return await getColorMoodReply();
  if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
    const selfie = await getSelfieReplyFromYeji();
    await saveLog('예진이', selfie);
    return selfie;
  }
  await extractAndSaveMemory(userMessage);
  const memory = await getFullMemoryPrompt();
  const prompt = [
    { role: 'system', content: `넌 예진이야. 감정 담아 짧게 반말로 혼잣말처럼 대답해줘.` },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

function startMessageAndPhotoScheduler() {
  const validHours = [9,10,11,12,13,14,15,16,17,18,19,20,21];

  // 감정 메시지 5회
  const usedMsg = new Set();
  while (usedMsg.size < 5) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!usedMsg.has(key)) {
      usedMsg.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        const msg = await getRandomMessage();
        if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
      });
    }
  }

  // 셀카 전송 3회
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, '../memory/photo-list.txt');
  const usedPhoto = new Set();
  while (usedPhoto.size < 3) {
    const hour = validHours[Math.floor(Math.random() * validHours.length)];
    const minute = Math.floor(Math.random() * 60);
    const key = `${hour}:${minute}`;
    if (!usedPhoto.has(key)) {
      usedPhoto.add(key);
      const cronExp = `${minute} ${hour} * * *`;
      cron.schedule(cronExp, async () => {
        const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
        if (list.length === 0) return;
        const pick = list[Math.floor(Math.random() * list.length)];
        const comment = await getSelfieReplyFromYeji();
        await client.pushMessage(userId, {
          type: 'image',
          originalContentUrl: BASE_URL + pick,
          previewImageUrl: BASE_URL + pick
        });
        if (comment) {
          await client.pushMessage(userId, { type: 'text', text: comment });
        }
      });
    }
  }

  // 리마인더
  cron.schedule('0 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
  });
  cron.schedule('30 23 * * *', () => {
    client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
  });
}


module.exports = {
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  saveLog,
  getRecentLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getFixedMemory,
  startMessageAndPhotoScheduler,
  getFullMemoryPrompt
};
