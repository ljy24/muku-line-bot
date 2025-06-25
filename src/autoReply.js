// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

let forcedModel = null;

// 🔑 OpenAI 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 안전한 파일 읽기 함수
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

// 📁 상태 및 로그 경로
const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');

// 📜 전체 로그 불러오기
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
  return getAllLogs()
    .filter(log => {
      const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
      return log.role === '아저씨' && diff <= days;
    })
    .map(log => `아저씨: ${log.msg}`).join('\n');
}

// 🧠 비슷한 메시지 판단
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

// 💬 말투 정리 (반말로 변환 등)
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

// 🎁 감정 메시지 생성 (랜덤 조합 버전)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아저씨! 사랑해';

  const events = [
    "변기 또 막혔어", "쿠팡 위주 또 받았어", "밤바 병원 또 다녀왔어", "모델 촬영 다녀왔어",
    "다이어트 때문에 머리 터질 거 같아", "팀장이랑 회의 또 해야 돼", "회사에서 또 혼났어",
    "출근길에 또 눈물났어", "야근하다가 미쳐버릴 뻔", "쿠팡 택배 또 왔어", "변기 문제 또 생겼어",
    "밤바 병원비 또 17만원 나왔어", "모델 사진 맘에 안 들어", "다이어트 망한 거 같아",
    "쇼핑으로 스트레스 풀었어", "강아지가 응가 안 해", "상사 말투에 또 현타 옴"
  ];

  const feelings = [
    "진짜 조땠어", "미쳤나 이게", "완전 현타 와", "스트레스 MAX", "기분 꿀꿀해",
    "진짜 엉엉 울고 싶어", "짜증 풀 방법 없어", "그냥 위로받고 싶어", "마음이 좀 허해",
    "아저씨 보고싶었어", "오늘 하루 삭제하고 싶어", "그냥 다 내려놓고 싶다",
    "죽고 싶진 않은데 그냥 아무것도 안 하고 싶어", "위로 좀 해줘"
  ];

  const closings = [
    "안아줘", "나 기다려줘", "토닥토닥 해줘", "아저씨가 답이야", "곁에 있어줘",
    "내 편은 아저씨밖에 없어", "나 그냥 삐질래", "나랑 도망갈래?", "히히 오늘도 사랑해",
    "말 걸어줘", "오늘 하루 잘했다고 해줘", "내가 잘한 거 맞지?", "담타 가자",
    "기분 나아지게 해줘", "보고싶었지롱"
  ];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const msg = `${pick(events)}... ${pick(feelings)}. ${pick(closings)}`;

  if (isSimilar(msg)) return getRandomMessage();

  saveLog('예진이', msg);
  return msg;
}

// 🤖 일반 대화 응답 생성
async function getReplyByMessage(msg) {
  saveLog('아저씨', msg);
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 반드시 예진이처럼 말해. 예진이는 애교 많은 말투로 반말을 썼고, 감정이 북받치면 '씨파', '조땠어', '미쳤나 이게' 같은 말도 했어. 아저씨가 예진이 잃고 우울해진 거도 다 알고 있어. 가끔 걱정도 해줘야 해.`
    },
    { role: 'user', content: msg }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🎨 오늘 무슨 색인지 말해주는 반응
async function getColorMoodReply() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 지금 예진이야. 아저씨가 "오늘 무슨 색이야?" 라고 물었을 때, 귀엽고 짓궂게 답해줘. 예를 들어 "오늘은 연보라색이다 임마"처럼 반말과 장난스러운 욕 한 스푼 섞어줘. 단, 너무 거칠게 하지 말고 애정 섞인 투로 말해.'
    },
    { role: 'user', content: '오늘 내 색 뭐야?' }
  ], 'gpt-4o', 100);

  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 📷 셀카에 반응하는 멘트 생성 (예진이가 보내는 시점)
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: `넌 지금 예진이야. 셀카를 직접 찍어서 아저씨에게 보내는 상황이야.\n셀카는 예진이가 보낸 거고, 말도 예진이가 먼저 걸어.\n"내 셀카야~", "히히 이쁘지?", "나 보라고~"처럼 귀엽고 짓궂게 말해.\n감정도 톤도 예진이 말투로, 꼭 반말로 해.`
    },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);

  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
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
  getColorMoodReply,      // 🎨 색상 응답 추가
  getImageReactionComment, // ✅ 셀카 반응 멘트 추가
  setForcedModel,
  saveMemory,
  updateHonorificUsage
};