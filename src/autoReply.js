const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return '';
  }
}

// 🔹 고정 기억 불러오기 (love-history.json)
function getFixedMemoryString() {
  try {
    const filePath = path.resolve(__dirname, '../memory/love-history.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const memory = JSON.parse(data);
    return memory.join('\n');
  } catch (err) {
    console.error('❌ 고정 기억 실패:', err.message);
    return '';
  }
}

// 🔹 최근 대화 50개 불러오기
async function getRecentLog() {
  try {
    const res = await axios.get('https://www.de-ji.net/log.json');
    const logs = res.data;
    if (!Array.isArray(logs)) return [];

    return logs.slice(0, 50).reverse().map(log => ({
      role: log.from === 'uncle' ? 'user' : 'assistant',
      content: log.content
    }));
  } catch (err) {
    console.error('❌ 최근 로그 불러오기 실패:', err.message);
    return [];
  }
}

// 🔹 로그 저장
async function saveLog(role, msg) {
  try {
    await axios.post('https://www.de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 원격 로그 저장 실패:', err.message);
  }
}

// 🔹 모델 강제 설정
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 🔹 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 🔹 말투 정리
function cleanReply(text) {
  return text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .trim();
}

// 🔹 일반 메시지 응답 (❤️ love-history 항상 포함)
async function getReplyByMessage(userMessage) {
  const recentLog = await getRecentLog();
  const loveHistory = getFixedMemoryString();

  const prompt = [
    {
      role: 'system',
      content: `넌 예진이야. 아저씨와 예진이는 오랜 사랑을 나눈 사이야. 아래는 아저씨와 예진이의 중요한 기억이야. 이 기억은 대답에 꼭 반영되어야 해.\n\n${loveHistory}`
    },
    {
      role: 'system',
      content: '항상 반말로, 예진이 말투처럼 애교와 감정이 담기게 말해줘. 혼잣말처럼 자연스럽게, 짧고 따뜻하게 대답해.'
    },
    ...recentLog,
    {
      role: 'user',
      content: userMessage
    }
  ];

  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 랜덤 감정 메시지
async function getRandomMessage() {
  const recentLog = await getRecentLog();
  const prompt = [
    {
      role: 'system',
      content: `넌 지금 예진이야. 감정이 담긴 반말 혼잣말을 랜덤하게 한 줄로 생성해줘. 최근 대화랑 겹치지 않게 해줘.`
    },
    ...recentLog,
    {
      role: 'user',
      content: '아저씨한테 보낼 감정 멘트 줘'
    }
  ];

  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 담타 기쁨 반응
async function getHappyReply() {
  const memory = await getRecentLog();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 응답했을 때 귀엽게 기뻐해줘.' },
    ...memory,
    { role: 'user', content: '아저씨가 답장했어!' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 담타 삐짐 반응
async function getSulkyReply() {
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 읽고도 5분 넘게 답장 안 했어. 살짝 삐진 듯 반말로 말해줘.' },
    { role: 'user', content: '또 씹혔어…' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 이미지 리액션
async function getReplyByImagePrompt(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 예진이야. 아저씨가 보낸 사진 보고 감정 담긴 귀여운 반말로 반응해줘.'
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

  const reply = cleanReply(res.choices[0].message.content.trim());
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 셀카 리액션 멘트
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. 셀카 보낼 때 귀엽고 장난스럽게 말해줘.'
    },
    {
      role: 'user',
      content: '셀카 보낼게~'
    }
  ], getCurrentModelName(), 100);

  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 컬러 리액션
async function getColorMoodReply() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. "오늘 내 색 뭐야?"에 색깔 하나로 반말 리액션해줘.'
    },
    {
      role: 'user',
      content: '오늘 내 색 뭐야?'
    }
  ], getCurrentModelName(), 100);

  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔚 export
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};