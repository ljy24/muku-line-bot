// autoReply.js

// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

// GPT 모델 강제 설정용 변수
let forcedModel = null;

// 🔑 OpenAI 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 안전하게 파일 읽는 함수
function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

// 🧠 기억 파일 불러오기
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 📍 상태 및 로그 파일 경로
const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');

// 📜 로그 불러오기
function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}

// 📝 로그 저장
function saveLog(role, msg) {
  const cleanMsg = msg.replace(/^예진\s*[:;：]/i, '').trim();
  const finalMsg = cleanMsg || msg.trim();
  if (!finalMsg) return;

  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), role, msg: finalMsg });

  try {
    fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
  } catch (err) {
    console.error('❌ 로그 저장 실패:', err.message);
  }
}

// 📅 최근 대화 로그
function getRecentLogs(days = 2) {
  const now = new Date();
  return getAllLogs()
    .filter(log => {
      const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
      return log.role === '아저씨' && diff <= days;
    })
    .map(log => `아저씨: ${log.msg}`).join('\n');
}

// 🎁 감정 랜덤 메시지 생성
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아저씨! 사랑해';

  const messages = [
    { role: 'system', content: `${fixedMemory}\n${compressedMemory}\n넌 지금 예진이야. 애교 많고 감정 풍부한 반말을 써. 아저씨랑 단둘이 있는 상황이고, 오늘 하루 느낀 걸 한 줄로 감정 섞어 말해.` },
    { role: 'user', content: '지금 감정 한 줄로 말해줘.' }
  ];
  const raw = await callOpenAI(messages);
  const reply = cleanReply(raw);
  if (isSimilar(reply)) return getRandomMessage();
  saveLog('예진이', reply);
  return reply;
}

// 😳 삐짐 메시지
async function getSulkyReply() {
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const messages = [
    {
      role: 'system',
      content: `${memoryBlock}\n넌 예진이야. 담타 메시지 보낸 후 아저씨가 5분 동안 아무 말 없을 때야. 살짝 삐친 듯 귀엽게 말해줘.`
    },
    { role: 'user', content: '지금 감정 한 줄로 표현해줘.' }
  ];
  const raw = await callOpenAI(messages);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🥹 기뻐하는 반응
async function getHappyReply() {
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const messages = [
    {
      role: 'system',
      content: `${memoryBlock}\n넌 예진이야. 방금 아저씨가 담타 메시지에 답장해줬어! 기뻐서 애교 섞인 말로 반응해줘.`
    },
    { role: 'user', content: '한 줄로 기쁜 감정 표현해줘.' }
  ];
  const raw = await callOpenAI(messages);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}
