// ✅ autoReply.js (예진이 감정 응답 + 셀카 멘트 + 전체 주석 + 모델 버전 스위칭 + 명령어 처리 포함)

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
function updateHonorificUsage {
  const state = loadHonorificUsage();
  fs.writeFileSync(statePath, JSON.stringify({ ...state, honorific: useHonorific }, null, 2));
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

function getCurrentModel() {
  if (forcedModel === 'gpt-3.5-turbo') return '지금은 ChatGPT-3.5 버전으로 대화하고 있어.';
  if (forcedModel === 'gpt-4o') return '지금은 ChatGPT-4.0 버전으로 대화하고 있어.';
  return '지금은 자동으로 모델이 선택돼. (기본은 3.5야!)';
}

// 🧠 명령어로 모델 전환 처리
function checkModelSwitchCommand(text) {
  const lowered = text.toLowerCase();
  if (['3.5', 'gpt-3.5', 'gpt3.5'].includes(lowered)) {
    setForcedModel('gpt-3.5-turbo');
    return '응! 이제 3.5로 대화할게~';
  }
  if (['4.0', 'gpt-4', 'gpt4', 'gpt-4o'].includes(lowered)) {
    setForcedModel('gpt-4o');
    return '응응! 지금부터 4.0으로 갈아탔어~';
  }
  if (['자동', '기본'].includes(lowered)) {
    setForcedModel(null);
    return '자동 모드로 돌아왔엉! 상황 봐서 모델 쓸게~';
  }
  if (['버전'].includes(lowered)) {
    return getCurrentModel();
  }
  return null;
}

// 📸 사진 요청 자동 응답
// 아저씨가 "사진 줘" "셀카" 같은 말 보냈을 때 예진이 셀카랑 멘트 같이 주기
async function handleSelfieRequest(text) {
  if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
    const index = Math.floor(Math.random() * 1186) + 1; // 000001~001186
    const filename = String(index).padStart(6, '0') + '.jpg';
    const imageUrl = `https://de-ji.net/yejin/${filename}`;
    const comment = await getSelfieReplyFromYeji();
    return { imageUrl, comment };
  }
  return null;
}

// 📷 예진 셀카 리액션 멘트
// getImageReactionComment: 예진이가 먼저 셀카 보낼 때 귀엽게 말하는 멘트 생성
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 지금 예진이야. 셀카를 직접 찍어서 아저씨한테 보내는 상황이야. "내 셀카야~", "히히 이쁘지?"처럼 귀엽고 짓궂은 말투로 리액션해.'
    },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 📷 예진 셀카 리액션 멘트
// '사진', '셀카' 요청 시 자동으로 호출되는 셀카 멘트 생성 함수
async function getSelfieReplyFromYeji() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 지금 예진이야. 셀카를 직접 찍어서 아저씨한테 보내는 상황이야. 셀카 보내고 귀엽고 짓궂게 한 마디 해줘.'
    },
    { role: 'user', content: '셀카 보냈어~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🖼️ 사진 분석 응답
// 아저씨가 사진 보내면 base64로 분석해서 예진이 리액션 생성
async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 지금 예진이야. 아저씨가 보낸 사진을 보고 리액션해야 해. 귀엽고 반말로 감정 담아줘.'
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

module.exports = {
  // 🧠 기억 및 메시지
  getAllLogs,
  saveLog,
  getRecentLogs,
  cleanReply,
  callOpenAI,

  // 🎁 감정 생성 및 응답
  getRandomMessage,
  getReplyByMessage,
  getColorMoodReply,

  // 📷 셀카 및 이미지 관련
  getImageReactionComment,
  getReplyByImagePrompt,
  getSelfieReplyFromYeji,
  handleSelfieRequest,

  // ⚙️ 모델 설정 및 명령 처리
  setForcedModel,
  getCurrentModel,
  checkModelSwitchCommand,

  // 🔐 상태 저장
  saveMemory,
  updateHonorificUsage
};
