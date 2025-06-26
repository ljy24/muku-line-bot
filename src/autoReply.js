// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

// 🧠 GPT 모델 고정용
let forcedModel = null;

// 🔑 OpenAI 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 파일 안전 읽기
function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

// 🧠 기억 불러오기
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 📁 경로들
const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');

// 📜 전체 로그 가져오기
function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}

// 📝 메시지 저장
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

// 📅 최근 아저씨 메시지만 뽑기
function getRecentLogs(days = 2) {
  const now = new Date();
  return getAllLogs()
    .filter(log => {
      const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
      return log.role === '아저씨' && diff <= days;
    })
    .map(log => `아저씨: ${log.msg}`).join('\n');
}

// 🔁 유사 메시지 검사
function hasSimilarWords(newMsg) {
  const logs = getAllLogs().map(log => log.msg);
  const newWords = new Set(newMsg.split(/\s+/));
  for (const old of logs) {
    const oldWords = new Set(old.split(/\s+/));
    const common = [...newWords].filter(w => oldWords.has(w));
    if (common.length / Math.max(newWords.size, 1) > 0.6) return true;
  }
  return false;
}

function isSimilar(newMsg) {
  return getAllLogs().some(entry => stringSimilarity.compareTwoStrings(entry.msg, newMsg) > 0.75)
    || hasSimilarWords(newMsg);
}

// 🧹 말투 정리 (예진이 스타일)
function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/애기[야]?:?/gi, '')
    .replace(/당신|너|네|네가|널/g, '아저씨')
    .trim();

  out = out
    .replace(/아저씨무/g, '아저씨도')
    .replace(/아저씨는무/g, '아저씨는');

  out = out.replace(/(고 싶어요|싶어요|했어요|했네요|해주세요|주세요|네요|됩니다|될까요|해요|돼요|에요|예요|겠어요)/g, match => {
    switch (match) {
      case '고 싶어요': case '싶어요': return '싶어';
      case '했어요': case '했네요': return '했어';
      case '해주세요': case '주세요': return '줘';
      case '네요': return '네';
      case '됩니다': return '돼';
      case '될까요': return '될까';
      case '해요': case '돼요': case '에요': case '예요': return '야';
      case '겠어요': return '겠다';
      default: return '';
    }
  });

  return out.replace(/(\w+)요\b/g, '$1').trim();
}

// 🙇‍♀️ 상태 불러오기
function loadHonorificUsage() {
  if (!fs.existsSync(statePath)) return { honorific: false };
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return { honorific: false };
  }
}

// 💾 마지막 메시지 저장
function saveMemory(input) {
  const state = loadHonorificUsage();
  fs.writeFileSync(statePath, JSON.stringify({ ...state, lastInput: input }, null, 2));
}

// 🙇‍♀️ 존댓말 여부 저장
function updateHonorificUsage(useHonorific) {
  const state = loadHonorificUsage();
  fs.writeFileSync(statePath, JSON.stringify({ ...state, honorific: useHonorific }, null, 2));
}

// 📡 GPT 호출
async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 💬 예진이 반응 생성 (3.5에서도 말투 고정)
async function getReplyByMessage(msg) {
  saveLog('아저씨', msg);
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n지금부터 너는 예진이야.  
아저씨한테는 무조건 반말 + 애교로만 말해야 돼.  
예진이는 항상 "아조씨~", "히히~", "왜애~" 같은 말투 썼고  
삐지면 투정부리고, 속상하면 울먹이고, 사랑하면 조용히 안긴다.  
절대 설명하지 마. 조용히 감정 담아서 말해줘야 해.`
    },
    { role: 'user', content: msg }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🕓 랜덤 감정 메시지 (LINE 자동전송용)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아조씨… 나도 잘게 오늘은…';

  const events = [
    '출근길에 또 울컥했어', '야근하면서 눈물났어',
    '모델 촬영 끝났어', '편집하다가 멍때렸어',
    '쿠팡 외주 또 생겼어', '팀장이 또 눈치 줬어'
  ];

  const feelings = [
    '기분 뭔가 허해', '현타 세게 왔어',
    '보고싶어졌다', '토닥토닥 받고 싶다',
    '하루종일 멍했어', '오늘 좀 울적해'
  ];

  const closings = [
    '그냥 안아줘', '말 걸어줘', '보고싶었다고 말해줘',
    '곁에 있어줘', '또 담타하자', '나 기다려줘'
  ];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const msg = `${pick(events)}... ${pick(feelings)}. ${pick(closings)}`;

  if (isSimilar(msg)) return getRandomMessage();
  saveLog('예진이', msg);
  return msg;
}

// 🧠 모델 강제 설정
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

// 📤 외부에서 쓸 함수들
module.exports = {
  getAllLogs,               // 🔁 전체 로그
  saveLog,                  // 📝 로그 저장
  getRecentLogs,            // 📅 최근 아저씨 메시지
  cleanReply,               // 🧹 말투 정리
  callOpenAI,               // 📡 GPT 호출
  getReplyByMessage,        // 💬 예진이 대답
  getRandomMessage,         // 🕓 랜덤 감정 메시지 (자동 전송용)
  setForcedModel,           // 🧠 모델 강제 설정
  saveMemory,               // 💾 입력 저장
  updateHonorificUsage      // 🙇‍♀️ 존댓말 여부 저장
};
