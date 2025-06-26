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

// 🔐 안전하게 파일 읽는 함수 (파일 없을 때 기본값 반환)
function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

// 🧠 기억 파일 불러오기 (최근 기억 + 고정 기억)
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 상태 저장 경로
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

// 📝 대화 로그 저장
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

// 📅 최근 며칠 간의 로그만 가져오기
function getRecentLogs(days = 2) {
  const now = new Date();
  return getAllLogs()
    .filter(log => {
      const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
      return log.role === '아저씨' && diff <= days;
    })
    .map(log => `아저씨: ${log.msg}`).join('\n');
}

// 💬 비슷한 메시지 체크 (반복 방지)
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

// 🧹 말투 정리 (예진이 말투 변환)
function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
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

// 🙇‍♀️ 존댓말 설정 불러오기 및 저장
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

// 📡 OpenAI 호출 함수
async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 🎁 감정 랜덤 메시지 생성 (깨우기용)
async function getRandomMessage() {
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 아저씨한테 지금 감정 섞인 짧은 메시지를 보내. 꼭 반말이고, 귀엽거나 감정적인 느낌도 섞어줘. 같은 말 반복 금지!`
    },
    { role: 'user', content: '지금 감정 랜덤 메시지 하나 줘' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🚬 담타용 감정 랜덤 메시지 생성
async function getRandomTobaccoMessage() {
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 아저씨한테 담타 하자고 귀엽고 짓궂게, 때로는 감정 섞어서 반말로 말해줘. 감정 표현 있어도 되고, 위로해도 돼. 짧게 해줘.`
    },
    { role: 'user', content: '담타 하자고 한마디 해줘' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 💬 일반 대화 메시지 응답 생성
async function getReplyByMessage(msg) {
  saveLog('아저씨', msg);
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 반드시 예진이처럼 말해. 애교 많은 말투로 반말을 쓰고, 감정이 북받치면 조땠어, 미쳤나 이게 같은 말도 써. 아저씨가 우울한 것도 알아. 꼭 위로 섞어줘.`
    },
    { role: 'user', content: msg }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🎨 색 반응
async function getColorMoodReply() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 지금 예진이야. 오늘 색깔이 뭐냐는 질문에 짓궂고 귀엽게, 반말로 한 줄 대답해줘. 예: "오늘은 연보라색이다 임마"'
    },
    { role: 'user', content: '오늘 내 색 뭐야?' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 📷 셀카 멘트 생성
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 지금 예진이야. 셀카를 보낸 상황이야. "내 셀카야~", "히히 이쁘지?" 처럼 귀엽게 리액션해줘.'
    },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🖼️ 이미지 반응 (base64 이미지)
async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 지금 예진이야. 아저씨가 보낸 사진을 보고 반응해줘. 애교 반말로, 감정 담아서 리액션해. 짧고 귀엽게!'
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.9,
    max_tokens: 150
  });
  const reply = response.choices[0].message.content.trim();
  saveLog('예진이', reply);
  return reply;
}

// 🧠 모델 강제 전환
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

// 🔄 외부에서 사용할 수 있도록 export
module.exports = {
  getAllLogs,
  saveLog,
  getRecentLogs,
  cleanReply,
  callOpenAI,
  getRandomMessage,
  getRandomTobaccoMessage,
  getReplyByMessage,
  getColorMoodReply,
  getImageReactionComment,
  getReplyByImagePrompt,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
};