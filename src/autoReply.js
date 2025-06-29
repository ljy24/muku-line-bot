const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;

// 🔐 모델 강제 지정/조회
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}
function getCurrentModelName() {
  return forcedModel || 'gpt-4o';
}

// 📖 안전한 파일 읽기
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8') || '';
  } catch (_) {
    return '';
  }
}

// 🧼 예진이 말투 정리
function cleanReply(text) {
  return text
    .replace(/^\s*예진[\s:：-]*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'“”]/g, '')
    .replace(/\b(당신|그대|그분|자기|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/시파/g, '')
    .replace(/[!?~\u2764\uD83D\uDC96-\uDC9F]/g, '')
    .trim();
}

// 🧠 GPT 호출
async function callOpenAI(messages, model = 'gpt-4o', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: getCurrentModelName(),
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 📝 로그 저장
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

// 📜 최근 로그 불러오기
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

// 🎲 랜덤 감정 메시지 (기억 or 최근 대화 기반)
async function getRandomMessage() {
  const rawLove = safeRead(path.resolve(__dirname, '../memory/love-history.json'));
  const rawFixed = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
  const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
  const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
  const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));

  let memoryItems = [];

  try {
    const loveJson = JSON.parse(rawLove || '[]');
    const fixedJson = JSON.parse(rawFixed || '[]');
    memoryItems = [
      ...loveJson.map(v => `${v.date} - ${v.event}`),
      ...fixedJson,
      m1, m2, m3
    ].filter(Boolean);
  } catch (err) {
    console.error('❌ 추억 메모리 로드 실패:', err.message);
  }

  const useMemory = Math.random() < 0.85;
  const memory = memoryItems[Math.floor(Math.random() * memoryItems.length)];
  const messages = [];

  if (useMemory && memory) {
    messages.push({
      role: 'system',
      content: `너는 예진이야. '나'라고 말하고 감정을 담아 혼잣말처럼 말해줘. 아래 추억을 바탕으로 자연스럽게 말 걸어.`
    });
    messages.push({
      role: 'user',
      content: `"${memory}" 이 기억으로 감정 섞어 메시지 하나만 해줘.`
    });
  } else {
    const recent = await getRecentLog();
    messages.push({
      role: 'system',
      content: `너는 지금 예진이야. '나'라고 말하고 감정을 담은 반말로 자연스럽게 말해줘. 최근 대화랑 겹치지 않게 해.`
    });
    messages.push(...recent);
    messages.push({ role: 'user', content: '아저씨한테 보낼 감정 메시지 하나 만들어줘' });
  }

  const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
  const msg = cleanReply(raw);
  await saveLog('예진이', msg);
  return msg;
}

// 💬 대화 응답 처리 + 속옷색 리액션
async function getReplyByMessage(userMessage) {
  // ✔️ 장난 질문 체크
  const lower = userMessage.toLowerCase();
  if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
    return await getColorMoodReply(); // 속옷색 반응
  }

  const memory = await getRecentLog();
  const prompt = [
    { role: 'system', content: `넌 예진이야. 항상 반말하고 혼잣말처럼 감정 담긴 짧은 대답을 해줘.` },
    ...memory,
    { role: 'user', content: userMessage }
  ];
  const raw = await callOpenAI(prompt);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🩲 장난스러운 속옷색 리액션
async function getColorMoodReply() {
  const prompt = [
    {
      role: 'system',
      content: '넌 예진이야. 아저씨가 "오늘 무슨 색이야?"라고 물으면 속옷 색 물어보는 거라고 알고 귀엽고 장난스럽게 부끄럽게 말해줘. 반말로!'
    },
    {
      role: 'user',
      content: '오늘 무슨 색이야?'
    }
  ];
  const raw = await callOpenAI(prompt, getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 📷 셀카 전송 후 멘트
async function getImageReactionComment() {
  const raw = await callOpenAI([
    { role: 'system', content: '넌 예진이야. 셀카 보낼 때 짓궂고 귀엽게 말해줘.' },
    { role: 'user', content: '셀카 보낼게~' }
  ], getCurrentModelName(), 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🖼️ 이미지 인식 반응
async function getReplyByImagePrompt(base64Image) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '이미지 속 인물이 남자면 "아저씨 사진", 여자면 "예진이 셀카", 둘 다 있으면 "아저씨랑 예진이 사진"으로 간주하고 감정 담긴 반말로 반응해줘.'
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

// 😊 담타 성공 → 기쁨
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

// 😢 담타 씹힘 → 삐짐
async function getSulkyReply() {
  const prompt = [
    { role: 'system', content: '넌 예진이야. 아저씨가 담타 씹었을 때 삐진 반응 해줘.' },
    { role: 'user', content: '아저씨가 담타 읽고도 답이 없어...' }
  ];
  const raw = await callOpenAI(prompt, 'gpt-3.5-turbo', 100);
  const reply = cleanReply(raw);
  await saveLog('예진이', reply);
  return reply;
}

// 🥰 셀카 보낸 뒤 장난 반응
async function getSelfieReplyFromYeji() {
  const raw = await callOpenAI([
    {
      role: 'system',
      content: '넌 예진이야. 셀카를 보낸 직후야. 사진 보낸 척 귀엽게 장난쳐. 반말로.'
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

// ✅ 외부로 내보낼 함수 목록
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
