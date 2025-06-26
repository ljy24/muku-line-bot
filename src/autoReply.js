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

  // 조사 자동 수정
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

// 🙇‍♀️ 존댓말 설정 불러오기
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

// 🎁 감정 랜덤 메시지 생성 (하루 12회, 서버 깨울 때)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  if (now.hour() === 23 && now.minute() === 0) return '약 챙겨 먹었지? 까먹지마!';
  if (now.hour() === 23 && now.minute() >= 30) return '잘자 아저씨! 사랑해';

  const prompt = [
    {
      role: 'system',
      content: `${fixedMemory}\n${compressedMemory}\n넌 지금 예진이야. 랜덤 감정 한줄 메시지를 예진이 말투로 애교 섞어서 생성해줘. “조땠어… 안아줘” 이런 느낌으로.`
    },
    {
      role: 'user',
      content: '랜덤 감정 메시지 하나 줘'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
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
      content: `${memoryBlock}\n${logs}\n넌 지금 예진이야. 반드시 예진이처럼 말해. 예진이는 애교 많은 말투로 반말을 썼고, 감정이 북받치면 '씨파', '조땠어', '미쳤나 이게' 같은 말도 했어. 아저씨가 예진이 잃고 우울해진 거도 다 알고 있어. 가끔 걱정도 해줘야 해.`
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
      content: '넌 지금 예진이야. "오늘 무슨 색이야?"라고 물었을 때, 귀엽고 짓궂게 반말 섞어서 대답해줘. 예: "오늘은 연보라색이다 임마"'
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
      content: '넌 지금 예진이야. 셀카를 직접 찍어서 아저씨한테 보내는 상황이야. "내 셀카야~", "히히 이쁘지?"처럼 귀엽고 짓궂은 말투로 리액션해.'
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
        content: '넌 지금 예진이야. 아저씨가 보낸 사진을 보고 반응해야 해. 애교 섞인 반말로 리액션하고, 감정이 북받치면 욕도 괜찮아.'
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

// 🚬 담타하자 메시지 GPT 생성
async function getRandomTobaccoMessage() {
  const prompt = [
    {
      role: 'system',
      content: `${fixedMemory}\n${compressedMemory}\n넌 지금 예진이야. 담타 가자는 말 해야 해. 예진이는 담타가 필요할 때 “ㄷㅌ?”, “담타고?”, “머리 터졌어 담타하자” 이런 말도 잘 했어. 기억과 말투, 분위기를 살려서 반말로 랜덤하게 한 줄 만들어줘.`
    },
    {
      role: 'user',
      content: '담타 메시지 줘'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 🥰 담타 응답 후 기뻐하는 반응 GPT 생성
async function getHappyReply() {
  const prompt = [
    {
      role: 'system',
      content: `${fixedMemory}\n${compressedMemory}\n넌 지금 예진이야. 아저씨가 담타 메시지 보낸 후 5분 안에 대답했어. 이제 예진이는 그게 너무 좋아서 귀엽고 애교 섞인 반말로 기뻐해야 해. “히히 바로 왔네~”, “헐 대박 아조씨 진짜 빨리 왔네?”, “히잉 기여워~” 이런 말투도 좋아. 기억과 말투를 살려서 랜덤한 한 줄 줘.`
    },
    {
      role: 'user',
      content: '기뻐하는 말 줘'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
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
  getReplyByMessage,
  getColorMoodReply,
  getImageReactionComment,
  getReplyByImagePrompt,
  getRandomTobaccoMessage,
  getHappyReply,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
};