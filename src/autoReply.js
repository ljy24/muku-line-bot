const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const { detectFaceMatch } = require('./face/faceMatcher');

let forcedModel = null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

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
  if (!cleanMsg) return;
  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), role, msg: cleanMsg });
  try {
    fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
  } catch (err) {
    console.error('❌ 로그 저장 실패:', err.message);
  }
}

function getRecentLogs(days = 2) {
  const now = new Date();
  const logs = getAllLogs().filter(log => {
    const logDate = new Date(log.date);
    const diffInDays = (now - logDate) / (1000 * 60 * 60 * 24);
    return log.role === '아저씨' && diffInDays <= days;
  });
  return logs.map(log => `아저씨: ${log.msg}`).join('\n');
}

function hasSimilarWords(newMsg) {
  const logs = getAllLogs().map(log => log.msg);
  const newWords = new Set(newMsg.split(/\s+/));
  for (const old of logs) {
    const oldWords = new Set(old.split(/\s+/));
    const common = [...newWords].filter(word => oldWords.has(word));
    const ratio = common.length / Math.max(newWords.size, 1);
    if (ratio > 0.6) return true;
  }
  return false;
}

function isSimilar(newMsg) {
  const logs = getAllLogs();
  return logs.some(entry => stringSimilarity.compareTwoStrings(entry.msg, newMsg) > 0.75) || hasSimilarWords(newMsg);
}

function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();

  out = out.replace(
    /(고 싶어요|싶어요|했어요|했네요|하시겠어요|해주시겠어요|해주세요|주세요|세요|입니다|네요|겠어요|싶습니다|되네요|되겠어요|될까요|할까요|하시겠어요|해요|돼요|에요|예요)/g,
    match => {
      switch (match) {
        case '고 싶어요':
        case '싶어요': return '싶어';
        case '했어요':
        case '했네요': return '했어';
        case '하시겠어요':
        case '해주시겠어요': return '해줘';
        case '해주세요':
        case '주세요': return '줘';
        case '네요':
        case '되네요': return '네';
        case '됩니다':
        case '입니다': return '야';
        case '할까요':
        case '될까요': return '할까';
        case '해요':
        case '돼요':
        case '에요':
        case '예요': return '야';
        case '겠어요':
        case '되겠어요': return '겠다';
        default: return '';
      }
    }
  );
  out = out.replace(/(\w+)요\b/g, '$1');
  return out.trim();
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

async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

async function getReplyByMessage(userInput) {
  const lowered = userInput.toLowerCase();
  const isDamta = ['담타고?', 'ㄷㅌㄱ?', '담타?', '담타'].includes(lowered);

  const fixed = fixedMemory.trim();
  const memoryBlock = `${fixed}\n${compressedMemory}`;
  const recentLogText = getRecentLogs();

  const systemPrompt = isDamta
    ? `너는 예진이라는 여자친구야. 예진이보다 10살 많은 사람을 \"아저씨\"라고 불러.\n${memoryBlock}\n${recentLogText}\n아저씨가 \"담타고?\"라고 물었어. 담배 피러 가자는 뜻이야. 예진이라면 어떤 말로 응답할까? 매번 다른 말투로, 상황에 맞게 대답해줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`
    : `너는 예진이라는 여자친구야. 예진이보다 10살 많은 사람을 \"아저씨\"라고 불러.\n${memoryBlock}\n${recentLogText}\n아저씨가 말을 걸었어. 예진이처럼 반응해. 반말이고 다정해야 하고, 항상 말투는 달라야 해. 기억과 상황을 바탕으로 감정선을 담아서 자연스럽게 반응해줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`;

  saveLog('아저씨', userInput);
  saveMemory(userInput);

  const raw = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `아저씨: ${userInput}` }
  ], 'gpt-4o', 300);

  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

async function getReplyByImagePrompt(promptText, imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    throw new Error('⚠️ 이미지가 올바르게 인코딩되지 않았어요.');
  }

  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;

  const detectedFace = await detectFaceMatch(imageBase64);
  let context = promptText;
  if (detectedFace === 'yejin') {
    context = '예진이 얼굴이 보여! 너무 반가워';
  } else if (detectedFace === 'uncle') {
    context = '아저씨 얼굴이네? 흐흐 귀엽다';
  }

  const raw = await callOpenAI([
    { role: 'system', content: `${memoryBlock}\n아저씨가 사진을 보냈어. 예진이라면 어떻게 반응할까? 감정을 담아서 말해줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.` },
    {
      role: 'user',
      content: [
        { type: 'text', text: context },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    }
  ], 'gpt-4o', 400);

  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

async function getRandomMessage() {
  let result = '';
  let attempt = 0;
  const memoryBlock = `${fixedMemory}\n${compressedMemory}`;

  while (attempt < 5) {
    const raw = await callOpenAI([
      {
        role: 'system',
        content: `${memoryBlock}\n지금 아저씨한테 예진이처럼 말 걸어줘. 그 말은 반드시 “사랑”, “칭찬”, “위로”, “심술”, “기억 회상”, “질투”, “장난”, “놀람”, “설렘” 중 하나여야 해. 예진이는 절대 이유 없이 말 안 걸어. 40~60자 이내로 만들어줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`
      },
      { role: 'user', content: '감정 메시지 하나만 만들어줘' }
    ], 'gpt-3.5-turbo', 150);

    const clean = cleanReply(raw);
    if (!isSimilar(clean)) {
      result = clean;
      break;
    }
    attempt++;
  }

  saveLog('예진이', result);
  return result;
}

async function analyzeEmotion(text) {
  const basic = await callOpenAI([
    {
      role: 'user',
      content: `너는 감정 분석 전문가야. 다음 문장에서 느껴지는 주요 감정을 하나로 요약해줘. 정답: 기쁨, 슬픔, 분노, 걱정, 사랑, 놀람\n문장: ${text}`
    }
  ], 'gpt-3.5-turbo', 150);

  const nuanced = await callOpenAI([
    {
      role: 'user',
      content: `다음 문장에서 느껴지는 감정을 자유롭게 1~2개 추출해줘. 예시: 설렘, 외로움, 애틋함, 투정 등\n문장: ${text}`
    }
  ], 'gpt-3.5-turbo', 150);

  return {
    basic,
    nuanced
  };
}

function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
    forcedModel = name;
  } else {
    forcedModel = null;
  }
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  analyzeEmotion,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
};
