// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');

let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt');
const BASE_SELFIE_URL = 'https://de-ji.net/yejin/';

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

function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/애기[야]?:?/gi, '')
    .replace(/당신|너|네|네가|널/g, '아저씨')
    .trim();

  out = out.replace(/아저씨무/g, '아저씨도').replace(/아저씨는무/g, '아저씨는');

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

function checkModelSwitchCommand(text) {
  if (text === '3.5') return setForcedModel('gpt-3.5-turbo'), '이제 3.5로 대답할게!';
  if (text === '4.0') return setForcedModel('gpt-4o'), '이제 4.0으로 대답할게!';
  if (text === '자동') return setForcedModel(null), '이제 자동으로 모델 고를게!';
  if (text === '버전') return `지금은 ${(forcedModel || 'gpt-3.5-turbo')} 버전으로 대화하고 있어.`;
  return null;
}

async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아저씨! 사랑해';

  const events = ['팀장이랑 회의 또 해야 돼', '출근길에 또 눈물났어', '야근하다가 미쳐버릴 뻔'];
  const feelings = ['진짜 조땠어', '기분 꿀꿀해', '마음이 좀 허해'];
  const closings = ['안아줘', '곁에 있어줘', '보고싶었지롱'];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const msg = `${pick(events)}... ${pick(feelings)}. ${pick(closings)}`;
  if (isSimilar(msg)) return getRandomMessage();
  saveLog('예진이', msg);
  return msg;
}

async function getReplyByMessage(msg) {
  const versionSet = checkModelSwitchCommand(msg);
  if (versionSet) return versionSet;

  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;
  const logs = getRecentLogs(2);
  const prompt = [
    { role: 'system', content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 예진이처럼 말해.` },
    { role: 'user', content: msg }
  ];
  const raw = await callOpenAI(prompt, 'gpt-4o');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

async function getColorMoodReply() {
  const raw = await callOpenAI([
    { role: 'system', content: '넌 예진이야. 색 질문에 귀엽게 대답해.' },
    { role: 'user', content: '오늘 내 색 뭐야?' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

async function getImageReactionComment() {
  const raw = await callOpenAI([
    { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '넌 예진이야. 사진 보고 반응해.' },
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

function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

function getSelfieReplyFromYeji() {
  const comments = ['히히 내 셀카야~', '예쁘지? 흐흐', '아저씨 보라고 찍었지롱'];
  return comments[Math.floor(Math.random() * comments.length)];
}

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
  getSelfieReplyFromYeji,
  setForcedModel,
  saveMemory,
  updateHonorificUsage,
  checkModelSwitchCommand
};
