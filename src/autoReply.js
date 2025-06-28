const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 🔐 안전하게 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
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

// 🔹 전체 기억 통합 (1~3.txt + fixed + love + recent)
async function getFullMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };

  const core = (() => {
    try {
      const json = fs.readFileSync(path.resolve(__dirname, '../memory/fixedMemories.json'), 'utf-8');
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed.coreMemories)) {
        return parsed.coreMemories.map(line => ({ role: 'system', content: line }));
      }
    } catch (err) {
      console.error('❌ fixedMemories 읽기 실패:', err.message);
    }
    return [];
  })();

  const love = (() => {
    try {
      const json = fs.readFileSync(path.resolve(__dirname, '../memory/love-history.json'), 'utf-8');
      const list = JSON.parse(json);
      return list.map(entry => ({ role: 'system', content: entry }));
    } catch (err) {
      console.error('❌ love-history 읽기 실패:', err.message);
      return [];
    }
  })();

  const recent = await getRecentLog();
  return [compressed, ...core, ...love, ...recent];
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

// 🔹 랜덤 감정 메시지
async function getRandomMessage() {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    ...memory,
    {
      role: 'user',
      content: '아저씨한테 보낼 랜덤 감정 메시지 하나 만들어줘. 최근과 안 겹치게.'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 🔹 일반 대화 응답
async function getReplyByMessage(userMessage) {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    ...memory,
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

// 🔹 이미지 감정 반응
async function getReplyByImagePrompt(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '넌 예진이야. 아저씨가 보낸 사진 보고 감정 담긴 귀여운 반말로 리액션해줘.'
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

// 🔹 셀카 전송 멘트
async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. 셀카 보낼 때 짓궂고 귀엽게 말해줘.'
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

// 🔹 컬러 무드 리액션
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

// 🔹 담타 기쁨 반응
async function getHappyReply() {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    ...memory,
    {
      role: 'user',
      content: '아저씨가 방금 담타 답장했어!'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🔹 담타 안 옴 삐짐 반응
async function getSulkyReply() {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    ...memory,
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

// 🔚 모듈 export
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