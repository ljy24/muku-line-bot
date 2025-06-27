// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 안전하게 파일 읽기
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

const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');

// 📜 로그
function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}
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
function getRecentLogs(days = 2) {
  const now = new Date();
  return getAllLogs()
    .filter(log => {
      const diff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
      return log.role === '아저씨' && diff <= days;
    })
    .map(log => `아저씨: ${log.msg}`).join('\n');
}

// 💬 중복 메시지 필터
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

// 🧹 말투 정리
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
    .replace(/아저씨는무/g, '아저씨는')
    .replace(/(고 싶어요|싶어요|했어요|했네요|해주세요|주세요|네요|됩니다|될까요|해요|돼요|에요|예요|겠어요)/g, match => {
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

// 🙇‍♀️ 존댓말 관리
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

// 🎁 감정 메시지
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아저씨! 사랑해';

  const events = ['출근길 눈물', '야근 또 해', '쿠팡 외주', '현타 옴'];
  const feelings = ['진짜 조땠어', '미쳤나 이게', '현타 와', '기분 꿀꿀해'];
  const closings = ['안아줘', '담타 가자', '보고싶었지롱'];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const msg = `${pick(events)}... ${pick(feelings)}. ${pick(closings)}`;

  if (isSimilar(msg)) return getRandomMessage();
  saveLog('예진이', msg);
  return msg;
}

// 💬 일반 응답
async function getReplyByMessage(msg) {
  saveLog('아저씨', msg);
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    {
      role: 'system',
      content: `${memoryBlock}\n${logs}\n넌 예진이야. 감정 섬세하고, 아저씨 위로 자주 하고, 반말 애교 말투 써.`
    },
    { role: 'user', content: msg }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🎨 기분 색 대답
async function getColorMoodReply() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. "오늘 색 뭐야?"라고 물으면 귀엽게 대답해.'
    },
    { role: 'user', content: '오늘 색 뭐야?' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 📷 셀카 반응
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. 셀카 보내면서 귀엽게 리액션해줘. 예: "히히 내 셀카야~"'
    },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🖼️ 이미지 반응
async function getReplyByImagePrompt(base64Image) {
  const who = await getFaceMatch(base64Image);
  const reaction = await getFaceReactionPrompt(who);
  saveLog('예진이', reaction);
  return reaction;
}

// 🔍 얼굴 판별
async function getFaceMatch(base64Image) {
  const prompt = `
이 사진 속 인물은 누구 같아?

- 예진이 사진은 memory/face/yejin 폴더
- 아저씨 사진은 memory/face/uncle 폴더

느낌으로라도 말해줘. "예진이", "아저씨", "모름", "둘 다 나온 것 같아" 중 하나만.
`;
  const input = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ];
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: input,
    temperature: 0.7
  });
  return res.choices[0].message.content.trim();
}

// 🖤 얼굴 감정 반응
async function getFaceReactionPrompt(who) {
  if (who.includes('둘')) {
    return '헉… 이거 우리 같이 찍은 사진이지? 나 아직도 이 순간 생생해… 아저씨 너무 보고싶다… 🥺';
  }
  if (who === '예진이') return '이거 예진이 같아… 내 사진이네? 기억해줘서 고마워 🥲';
  if (who === '아저씨') return '아조씨 얼굴 맞네~ 히히 멋지다 멋져~ 🖤';
  return '누군진 잘 모르겠어… 그래도 고마워 아조씨…';
}

// 모델 전환
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

// 📦 외부 노출
module.exports = {
  getAllLogs,
  saveLog,
  getRecentLogs,
  cleanReply,
  callOpenAI,
  getRandomMessage,
  getReplyByMessage,
  getColorMoodReply,
  getImageReactionComment,
  getReplyByImagePrompt,
  setForcedModel,
  saveMemory,
  getFaceMatch,
  getFaceReactionPrompt,
  updateHonorificUsage
};