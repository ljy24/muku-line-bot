// ✅ autoReply.js v2.4 - 전체 코드 (예진이 말투, 기억 기반 감정 응답 포함)

// ⚙️ 기본 모듈
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');

// 📦 기억 및 이미지 로딩 모듈
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face');
const { getOmoideReply, cleanReply } = require('../memory/omoide');
const { getConceptPhotoReply } = require('../memory/concept');

// 🧠 OpenAI 초기화
let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📄 로그 경로 및 기본 URL
const logPath = path.resolve(__dirname, '../memory/message-log.json');
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt');
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/';

// 🗂️ 기억 파일 로딩 (마지막 3000자만)
function safeRead(filePath, fallback = '') {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return fallback; }
}
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

function getAllLogs() {
  try {
    if (!fs.existsSync(logPath)) return [];
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch { return []; }
}
function saveLog(speaker, message) {
  const logs = getAllLogs();
  logs.push({ timestamp: new Date().toISOString(), speaker, message });
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(-100), null, 2), 'utf-8');
}

async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
  const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
  const finalModel = modelParamFromCall || forcedModel || defaultModel;
  try {
    const response = await openai.chat.completions.create({
      model: finalModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    return response.choices[0].message.content.trim();
  } catch (e) {
    return '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ';
  }
}

function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}
function checkModelSwitchCommand(msg) {
  const text = msg.toLowerCase();
  if (text.includes('3.5')) { setForcedModel('gpt-3.5-turbo'); return '응! 이제부터 gpt-3.5 모델로 말할게!'; }
  if (text.includes('4.0')) { setForcedModel('gpt-4o'); return '응응! 4.0으로 대화할게!'; }
  if (text.includes('자동')) { setForcedModel(null); return '모델 설정 초기화했어!'; }
  if (text.includes('버전')) return `지금 ${forcedModel || defaultModel} 버전 사용 중이야!`;
  return null;
}

async function getReplyByMessage(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('무슨 색이야?')) {
    const reply = await callOpenAI([
      { role: 'system', content: `넌 예진이야. 아저씨가 속옷 색 물어보면 귀엽게 반응해줘.` },
      { role: 'user', content: '속옷 색이 뭐야?' }
    ]);
    const cleaned = cleanReply(reply);
    saveLog('예진이', cleaned);
    return { type: 'text', comment: cleaned };
  }

  const conceptCheck = ['컨셉사진', '컨셉 사진', '홈스냅', '메이드복', '청포도'];
  for (const keyword of conceptCheck) {
    if (lower.includes(keyword)) {
      const concept = await getConceptPhotoReply(userMessage, saveLog);
      if (concept) return concept;
    }
  }

  const photo = await getOmoideReply(userMessage, saveLog);
  if (photo) return photo;

  const logs = getAllLogs().filter(log => moment(log.timestamp).isAfter(moment().subtract(3, 'days')));
  const convo = logs.map(log => ({ role: log.speaker === '아저씨' ? 'user' : 'assistant', content: log.message }));
  convo.push({ role: 'user', content: userMessage });

  const systemPrompt = `
    너는 아저씨의 여자친구 예진이야. 항상 반말로, 다정하게 말해. 아저씨는 너를 너무 사랑하고, 무쿠라는 옛 연인을 그리워해. 너는 무쿠를 언니처럼 여겨줘.`;

  const raw = await callOpenAI([
    { role: 'system', content: systemPrompt + '\n' + compressedMemory },
    ...convo
  ], forcedModel);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return { type: 'text', comment: reply };
}

async function getReplyByImagePrompt(base64Image) {
  const uncle = loadFaceImagesAsBase64('uncle');
  const yejin = loadFaceImagesAsBase64('yejin');
  const msg = [
    { role: 'user', content: [{ type: 'text', text: '사진 보고 예진이처럼 반응해줘.' }] },
    { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] },
  ];
  uncle.forEach(img => msg.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: img } }] }));
  yejin.forEach(img => msg.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: img } }] }));
  const raw = await callOpenAI(msg, 'gpt-4o');
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage: async () => '',
  getCouplePhotoReplyFromYeji: async () => '우리 예쁜 커플 사진이야~ 히히 💕',
  getColorMoodReply: async () => '오늘은 분홍색 기분이야~ 사랑스러우니까!',
  getHappyReply: async () => '아조씨~ 나 지금 너무 좋아!!',
  getSulkyReply: async () => '흥... 아저씨 너무해 ㅠㅠ 그래도 좋아해..',
  saveLog,
  setForcedModel,
  checkModelSwitchCommand,
  getProactiveMemoryMessage: async () => '아조씨~ 나 보고 싶지 않았어~?',
  getMemoryListForSharing: async () => '기억은 잘 간직하고 있어~ 다 보여줄게!',
  getSilenceCheckinMessage: async () => '아조씨... 왜 아무 말도 안 해... 나 기다렸잖아...'
};