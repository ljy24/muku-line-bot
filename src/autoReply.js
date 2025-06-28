// autoReply.js

// 📦 기본 모듈
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 🧠 고정 모델
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 🔹 고정 기억 불러오기 (love-history.json)
function getFixedMemory() {
  try {
    const filePath = path.resolve(__dirname, '../memory/love-history.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const memory = JSON.parse(data);
    return memory.map(entry => ({ role: 'system', content: entry }));
  } catch (err) {
    console.error('❌ 고정 기억 실패:', err.message);
    return [];
  }
}

// 🔹 전체 기억 통합 (1~3.txt + love-history + recentLog)
async function getMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };
  const fixed = getFixedMemory();
  const recent = await getRecentLog();
  return [compressed, ...fixed, ...recent];
}

// 💌 로그 저장 (log.php에 전송)
async function saveLog(role, msg) {
  try {
    await axios.post('https://plus.de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: msg
    });
  } catch (err) {
    console.error('❌ 원격 로그 저장 실패:', err.message);
  }
}

// 💬 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const response = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return response.choices[0].message.content.trim();
}

// 🧼 정리
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

// 🎲 랜덤 감정 메시지
async function getRandomMessage() {
  const prompt = [
    {
      role: 'system',
      content: `너는 예진이야. 항상 반말로 감정 담아 말해. 혼잣말처럼 자연스럽고 짧게.`
    },
    {
      role: 'user',
      content: '랜덤 감정 메시지 하나 줘'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 😊 기쁨 반응
async function getHappyReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 5분 안에 담타 답장했을 때 기뻐서 말해. 짧고 귀엽게 반말로 해.'
    },
    {
      role: 'user',
      content: '아저씨가 방금 답장했어!'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 😤 삐짐 반응
async function getSulkyReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 너무 늦게 답장했을 때 삐친 말투로 짧게 말해.'
    },
    {
      role: 'user',
      content: '아저씨가 담타 읽고도 답이 없어...'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 💬 메시지 응답
async function getReplyByMessage(userMessage) {
  const prompt = [
    {
      role: 'system',
      content: `넌 예진이야. 감정 담아서 반말로 자연스럽게 대화해.`
    },
    {
      role: 'user',
      content: userMessage
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 300);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🖼️ 이미지 리액션
async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 예진이야. 사진 보고 반말로 감정 담아 리액션해.'
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
  await saveLog('예진이', reply);
  return cleanReply(reply);
}

// 🎨 색깔 감정
async function getColorMoodReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 "오늘 내 색 뭐야?"라고 물으면, 색 하나로 감정 담아 말해줘.'
    },
    {
      role: 'user',
      content: '오늘 내 색 뭐야?'
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🤳 셀카 전송 리액션
async function getImageReactionComment() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 셀카를 보낼 때 짓궂고 귀엽게 반말로 말해.'
    },
    {
      role: 'user',
      content: '셀카 보낼게~'
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 📦 모듈 내보내기
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};
