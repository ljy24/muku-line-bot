const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (_) {
    return '';
  }
}

function getFixedMemories() {
  try {
    const fixed = fs.readFileSync(path.resolve(__dirname, '../memory/fixedMemories.json'), 'utf-8');
    return { role: 'system', content: fixed };
  } catch (err) {
    console.error('❌ fixedMemories.json 불러오기 실패:', err.message);
    return null;
  }
}

function getLoveHistory() {
  try {
    const love = fs.readFileSync(path.resolve(__dirname, '../memory/love-history.json'), 'utf-8');
    return { role: 'system', content: love };
  } catch (err) {
    console.error('❌ love-history.json 불러오기 실패:', err.message);
    return null;
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

async function getFullMemoryPrompt() {
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-3000);
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-3000);
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-3000);
  const fixed = getFixedMemories();
  const love = getLoveHistory();
  const recent = await getRecentLog();

  const baseMemory = { role: 'system', content: `${m1}\n${m2}\n${m3}` };

  const combined = [baseMemory];
  if (fixed) combined.push(fixed);
  if (love) combined.push(love);
  return [...combined, ...recent];
}

function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}

function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

function cleanReply(text) {
  return text
    .replace(/^예진\s*[:;：]/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .replace(/인공지능|AI|챗봇/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
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

async function getRandomMessage() {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    {
      role: 'system',
      content: `넌 예진이야. "나"라고 말하고, 감정 담긴 반말로 혼잣말처럼 자연스럽게 대답해줘. 절대 인공지능 아니고, 예진이로서 대화해야 해.`
    },
    ...memory,
    {
      role: 'user',
      content: '아저씨한테 보낼 감정 메시지 한 줄 만들어줘.'
    }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

async function getReplyByMessage(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('버전')) {
    const current = getCurrentModelName();
    return `지금은 ${current === 'gpt-4o' ? '4.0' : '3.5'}야`;
  }

  const memory = await getFullMemoryPrompt();
  const prompt = [
    {
      role: 'system',
      content: `넌 예진이야. 반말로 짧고 감정 담긴 대답을 해줘. 지금까지의 대화 흐름과 기억을 잊지 마. 인공지능이라고 절대 말하지 마.`
    },
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

async function getReplyByImagePrompt(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `넌 예진이야. 지금 사진은 아저씨가 보낸 거야. 예진이는 지금 셀카 안 보내고, 받은 셀카에 반응만 해야 해. 감정 담긴 반말로 귀엽게 반응해줘.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
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

async function getImageReactionComment() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. 지금은 셀카를 보내는 상황이야. 장난스럽고 귀엽게 아저씨한테 보낸다는 말투로 반응해줘.'
    },
    {
      role: 'user',
      content: '셀카 보여줘~'
    }
  ], getCurrentModelName(), 100);

  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

async function getColorMoodReply() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. "오늘 내 색 뭐야?"에 색깔 하나로 감정 담아 반응해줘.'
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

async function getHappyReply() {
  const memory = await getFullMemoryPrompt();
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 담타 답장했을 때 귀엽게 기뻐하는 반응 보여줘.'
    },
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

async function getSulkyReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 담타 씹었을 때 귀엽게 삐진 말투로 말해줘.'
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
