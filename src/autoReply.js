const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

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

// 📖 기억 데이터 불러오기
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 📁 경로 설정
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

// 📅 최근 대화 로그 필터링
function getRecentLogs(days = 2) {
  const now = new Date();
  return getAllLogs().filter(log => {
    const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
    return log.role === '아저씨' && diff <= days;
  }).map(log => `아저씨: ${log.msg}`).join('\n');
}

// 🧠 비슷한 문장 판단
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

// 💬 말투 정리
function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/애기[야]?:?/gi, '')
    .replace(/당신|너|네가|널/g, '아저씨')
    .trim();

  out = out.replace(/(고 싶어요|싶어요|했어요|했네요|하시겠어요|해주세요|주세요|네요|됩니다|할까요|될까요|해요|돼요|에요|예요|겠어요|되겠어요)/g, match => {
    switch (match) {
      case '고 싶어요': case '싶어요': return '싶어';
      case '했어요': case '했네요': return '했어';
      case '해주세요': case '주세요': return '줘';
      case '네요': case '되네요': return '네';
      case '됩니다': case '입니다': return '야';
      case '할까요': case '될까요': return '할까';
      case '해요': case '돼요': case '에요': case '예요': return '야';
      case '겠어요': case '되겠어요': return '겠다';
      default: return '';
    }
  });

  return out.replace(/(\w+)요\b/g, '$1').trim();
}

// 🌡️ 존댓말 상태 로드/저장
function loadHonorificUsage() {
  if (!fs.existsSync(statePath)) return { honorific: false };
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return { honorific: false };
  }
}

function saveMemory(input) {
  const state = loadHonorificUsage();
  fs.writeFileSync(statePath, JSON.stringify({ ...state, lastInput: input }, null, 2));
}

function updateHonorificUsage(useHonorific) {
  const state = loadHonorificUsage();
  fs.writeFileSync(statePath, JSON.stringify({ ...state, honorific: useHonorific }, null, 2));
}

// 📡 OpenAI 호출
async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 🌈 색깔 리액션 멘트 생성 (오늘 무슨 색이야?)
async function getColorMoodReply() {
  const prompt = [
    {
      role: 'system',
      content: `예진이가 아저씨에게 오늘 무슨 색 같냐고 물어보면 귀엽고 짓궂게 대답해. 반말로 20자 이내. '시파', '임마', '조땠어' 같은 말 가끔 써도 돼.`
    },
    {
      role: 'user',
      content: '내가 오늘 무슨 색이야?'
    }
  ];
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: prompt,
    temperature: 0.9,
    max_tokens: 50
  });
  return res.choices[0].message.content.trim();
}

// 🔧 모델 강제 설정
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

// 🧩 외부로 내보낼 함수들
module.exports = {
  getAllLogs,
  saveLog,
  getRecentLogs,
  cleanReply,
  callOpenAI,
  getRandomMessage,
  getReplyByMessage,
  getImageReactionComment,
  getColorMoodReply, // ← 🎨 오늘 색깔 멘트 export
  setForcedModel,
  saveMemory,
  updateHonorificUsage
};
