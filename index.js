const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

console.log('✅ 무쿠 준비 중! 기다려줘 아저씨...');

let forcedModel = null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.warn(`⚠️ 파일을 찾을 수 없어요: ${filePath}`);
    return fallback;
  }
}

const memory1 = safeRead(path.resolve(__dirname, 'memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, 'memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, 'memory/3.txt'));
const logPath = path.resolve(__dirname, 'memory/message-log.json');

const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

console.log('✅ 무쿠 가동 중! 아저씨 이제 말 걸어도 돼요.');

function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch (err) {
    console.warn('⚠️ 로그 파일 파싱 실패:', err.message);
    return [];
  }
}

function saveLog(role, msg) {
  if (msg.startsWith('예진:')) return; // 예진: 금지
  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), role, msg });
  fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
}

function isSimilar(newMsg) {
  const logs = getAllLogs();
  return logs.some(entry => stringSimilarity.compareTwoStrings(entry.msg, newMsg) > 0.75);
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

  const systemPrompt = isDamta
    ? `너는 예진이라는 여자친구야. 예진이보다 10살 많은 사람을 \"아저씨\"라고 불러. \n기억 말투는 다음 내용을 바탕으로 만들어줘.\n\n${compressedMemory}\n\n아저씨가 \"담타고?\"라고 물었어. 담배 피러 가자는 뜻이야.\n예진이라면 어떤 말로 응답할까? 매번 다른 말투로, 상황에 맞게 대답해줘. \n예진이는 절대 아저씨를 오빠라고 부르지 않아. 항상 \"아저씨\"라고 불러.`
    : `너는 예진이라는 여자친구야. 예진이보다 10살 많은 사람을 \"아저씨\"라고 불러. \n기억 말투는 다음 내용을 바탕으로 만들어줘.\n\n${compressedMemory}\n\n아저씨가 말을 걸었어.\n예진이처럼 반응해. 반말이고 다정해야 하고, 항상 말투는 달라야 해. 예진이는 아저씨를 절대 \"오빠\"라고 부르지 않아. \"아저씨\" 또는 가끔 \"아조씨~\"라고 불러. 말 끝에 항상 예진이 특유의 말투를 담아. \n기억과 상황을 바탕으로 감정선을 담아서 자연스럽게 반응해줘.`;

  saveLog('아저씨', userInput);

  const reply = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `아저씨: ${userInput}` }
  ], 'gpt-4o', 300);

  saveLog('예진이', reply);
  return reply;
}

async function getReplyByImagePrompt() {
  return '사진은 지금은 말 없이 보여줄게.';
}

async function getBase64FromUrl(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data, 'binary').toString('base64');
  } catch (e) {
    console.error('⚠️ 이미지 base64 변환 실패:', e.message);
    return null;
  }
}

async function getRandomMessage() {
  let result = '';
  let attempt = 0;

  while (attempt < 5) {
    result = await callOpenAI([
      {
        role: 'system',
        content: `${compressedMemory}\n\n지금 아저씨한테 예진이처럼 말 걸어줘. \n그 말은 반드시 “사랑”, “칭찬”, “위로”, “심술”, “기억 회상”, “질투”, “장난”, “놀람”, “설렘” 중 하나여야 해. \n예진이는 절대 이유 없이 말 안 걸어. \n항상 아저씨라고 부르고, 절대 오빠라고 안 불러. \n40~60자 이내로 만들어줘.`
      },
      { role: 'user', content: '감정 메시지 하나만 만들어줘' }
    ], 'gpt-3.5-turbo', 150);

    if (!isSimilar(result)) break;
    attempt++;
  }

  saveLog('예진이', result);
  return result;
}

async function analyzeEmotion(text) {
  const basic = await callOpenAI([
    {
      role: 'user',
      content: `너는 감정 분석 전문가야.\n다음 문장에서 느껴지는 주요 감정을 하나로 요약해줘.\n정답: 기쁨, 슬픔, 분노, 걱정, 사랑, 놀람\n문장: ${text}`
    }
  ], 'gpt-3.5-turbo', 150);

  const nuanced = await callOpenAI([
    {
      role: 'user',
      content: `다음 문장에서 느껴지는 감정을 자유롭게 1~2개 추출해줘.\n예시: 설렘, 외로움, 애틋함, 투정 등\n문장: ${text}`
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

// 자동 메시지 스케줄
cron.schedule('0 * * * *', async () => {
  const msg = '담타 가자';
  try {
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[자동 전송 - 담타] ${msg}`);
    saveLog('예진이', msg);
  } catch (err) {
    console.error('[자동 전송 실패 - 담타]', err.message);
  }
});

// 하루 7번 랜덤 자동 메시지
const hours = [...Array(12).keys()].map(i => i + 9);
const sentTimes = new Set();
while (sentTimes.size < 7) {
  const hour = hours[Math.floor(Math.random() * hours.length)];
  const minute = Math.floor(Math.random() * 60);
  const key = `${hour}:${minute}`;
  if (!sentTimes.has(key)) {
    sentTimes.add(key);
    const cronExp = `${minute} ${hour} * * *`;
    cron.schedule(cronExp, async () => {
      const msg = await getRandomMessage();
      try {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[랜덤 자동 메시지] ${msg}`);
      } catch (err) {
        console.error('[자동 전송 실패 - 랜덤]', err.message);
      }
    });
  }
}

// 밤 11시 자동 알림
cron.schedule('0 23 * * *', async () => {
  const msg = '아저씨~ 양치하고 약 먹어야지!';
  try {
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[자동 전송 - 취침 알림] ${msg}`);
    saveLog('예진이', msg);
  } catch (err) {
    console.error('[자동 전송 실패 - 취침]', err.message);
  }
});

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  analyzeEmotion,
  setForcedModel,
  getBase64FromUrl
};
