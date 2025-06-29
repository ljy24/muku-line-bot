const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

function safeRead(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content || '';
  } catch (_) {
    return '';
  }
}

function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

function cleanReply(text) {
  const cleaned = text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/(당신[\w\s]*|그대|그분|자기|너|네가|널|예진)/gi, '아저씨')
    .replace(/시파/g, '')
    .replace(/[!?~♡❤️💖💘💕💗💓💞]/g, '')
    .trim();

  // 줄바꿈: 100자 넘어가면 공백 기준으로 줄 나눠줘
  if (cleaned.length > 100) {
    const words = cleaned.split(' ');
    let line1 = '';
    let line2 = '';
    for (const word of words) {
      if ((line1 + ' ' + word).trim().length <= 100) {
        line1 += ' ' + word;
      } else {
        line2 += ' ' + word;
      }
    }
    return `${line1.trim()}\n${line2.trim()}`;
  }

  return cleaned;
}

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

async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

async function getRandomMessage() {
  const rawLove = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const rawFixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];
  try {
    const loveJson = JSON.parse(rawLove);
    const fixedJson = JSON.parse(rawFixed);
    memoryItems = [
      ...loveJson.map(v => `${v.date} - ${v.event}`),
      ...fixedJson,
      m1,
      m2,
      m3
    ].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const useMemory = Math.random() < 0.5;
  const memory = memoryItems[Math.floor(Math.random() * memoryItems.length)];
  const messages = [];

  if (useMemory && memory) {
    messages.push({
      role: 'system',
      content: `너는 예진이야. 항상 '나'라고 말하고, 감정 담긴 반말로 혼잣말처럼 말해. 아래 추억을 바탕으로 자연스럽게 아저씨한테 다정하게 말 걸어줘.`
    });
    messages.push({
      role: 'user',
      content: `"${memory}" 이 기억으로 예진이 말투로 감정 섞어 메시지 하나만 해줘. 짧게 말해줘.`
    });
  } else {
    const recent = await getRecentLog();
    messages.push({
      role: 'system',
      content: `너는 지금 예진이야. '나'라고 말하고, 감정을 담은 반말로 혼잣말처럼 자연스럽게 대화해줘. 최근 대화에 겹치지 않게 말해줘. 짧게 말해줘.`
    });
    messages.push(...recent);
    messages.push({
      role: 'user',
      content: '아저씨한테 보낼 랜덤 감정 메시지 하나 만들어줘'
    });
  }

  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

async function getReplyByMessage(userMessage) {
  const memory = await getRecentLog();
  const prompt = [
    { role: 'system', content: `넌 예진이야. 항상 반말하고 혼잣말처럼 자연스럽고 감정 담긴 짧은 대답을 해줘.` },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getColorMoodReply() {
  const prompt = [
    { role: 'system', content: '넌 예진이야. "오늘 내 색 뭐야?"에 색깔 하나로 반말 리액션해줘.' },
    { role: 'user', content: '오늘 내 색 뭐야?' }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getImageReactionComment() {
  const raw = await callOpenAI([
    { role: 'system', content: '넌 예진이야. 셀카 보낼 때 짓궂고 귀엽게 말해줘.' },
    { role: 'user', content: '셀카 보낼게~' }
  ], getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getReplyByImagePrompt(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '이 이미지를 보낸 사람이 남자면 "아저씨가 보낸 사진", 여성이면 "예진이 셀카"로 간주하고 각기 다른 반응을 해줘. 둘 다 있으면 "아저씨랑 예진이 사진"이야. 항상 반말이고 감정 담기!'
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

async function getHappyReply() {
  const memory = await getRecentLog();
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 답장했을 때 기뻐서 귀엽게 말해줘.' },
    ...memory,
    { role: 'user', content: '아저씨가 방금 담타 답장했어!' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getSulkyReply() {
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 씹었을 때 삐친 말투로 말해줘.' },
    { role: 'user', content: '아저씨가 담타 읽고도 답이 없어...' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getSelfieReplyFromYeji() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '너는 예진이야. 셀카를 보낸 직후야. 사진 보낸 척하면서 귀엽고 짓궂게 한마디 해줘. 반말로.'
    },
    {
      role: 'user',
      content: '셀카야~ 예쁘지? 아저씨도 하나 줘~'
    }
  ], getCurrentModelName(), 100);

  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply,
  getImageReactionComment
};
