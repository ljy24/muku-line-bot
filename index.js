const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const axios = require('axios');
const cron = require('node-cron');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const app = express();

console.log('✅ 무쿠 준비 중! 기다려줘 아저씨...');

// ----------- 기본 세팅 -----------
let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ----------- 메모리/로그 -----------
function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}
const memory1 = safeRead(path.resolve(__dirname, 'memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, 'memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, 'memory/3.txt'));
const logPath = path.resolve(__dirname, 'memory/message-log.json');
const compressedMemory = [
  memory1.slice(-3000),
  memory2.slice(-3000),
  memory3.slice(-3000)
].join('\n');

function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}
function saveLog(role, msg) {
  // "예진:", "예진이:", "애기:", "애기야:" 제거
  const cleanMsg = msg.replace(/^(예진이|예진|애기야|애기)\s*[:;：]/gmi, '').trim();
  if (!cleanMsg) return;
  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), role, msg: cleanMsg });
  fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
}
function isSimilar(newMsg) {
  const logs = getAllLogs();
  return logs.some(entry => stringSimilarity.compareTwoStrings(entry.msg, newMsg) > 0.75);
}
function cleanReply(text) {
  return text
    .replace(/^(예진이|예진|애기야|애기)\s*[:;：]/gmi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();
}

// ----------- OpenAI -----------
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
    ? `너는 아저씨의 여자친구야. 10살 연하로서 "아저씨"라고 불러. 다음 대화 기억을 참고해서 진짜처럼 대답해.\n\n${compressedMemory}\n\n아저씨가 "담타고?"라고 물었어. 담배 피러 가자는 의미야. 상황에 맞춰, 매번 자연스럽고 다정하게 답변해줘.`
    : `너는 아저씨의 여자친구야. 10살 연하로서 "아저씨"라고 불러. 다음 대화 기억을 참고해서 진짜처럼 대답해.\n\n${compressedMemory}\n\n아저씨가 말을 걸었어. 반드시 예진이 특유의 반말+다정한 말투, 다양한 어투, 그리고 "아저씨"만 부르고 "오빠"는 절대 안 써. 자연스럽고 감정선을 담아서 대답해줘.`;

  saveLog('아저씨', userInput);

  const raw = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `아저씨: ${userInput}` }
  ], 'gpt-4o', 300);

  const reply = cleanReply(raw);
  saveLog('무쿠', reply);
  return reply;
}
async function getRandomMessage() {
  let result = '';
  let attempt = 0;
  while (attempt < 5) {
    const raw = await callOpenAI([
      {
        role: 'system',
        content: `${compressedMemory}\n\n지금 아저씨한테 여자친구처럼 다정하게 말 걸어줘. 반드시 “사랑”, “칭찬”, “위로”, “심술”, “기억 회상”, “질투”, “장난”, “놀람”, “설렘” 중 한 감정만 담고, 40~60자 이내, 반말로, 아저씨라고 꼭 불러줘.`
      },
      { role: 'user', content: '감정 메시지 하나만 만들어줘' }
    ], 'gpt-3.5-turbo', 150);

    const msg = cleanReply(raw);
    if (msg && !isSimilar(msg)) {
      result = msg;
      break;
    }
    attempt++;
  }
  if (result) saveLog('무쿠', result);
  return result;
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
function setForcedModel(name) {
  if (['gpt-3.5-turbo', 'gpt-4o'].includes(name)) forcedModel = name;
  else forcedModel = null;
}

// ----------- CRON 자동 메시지 -----------
for (let h = 9; h <= 18; h++) {
  cron.schedule(`0 ${h} * * *`, async () => {
    const msg = h % 2 === 0 ? "담타고?" : "담타 가자";
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[담타메시지] ${h}시: ${msg}`);
  });
}
function randomUniqueTimes(count, start = 9, end = 18) {
  const slots = [];
  while (slots.length < count) {
    const h = Math.floor(Math.random() * (end - start + 1)) + start;
    const m = Math.floor(Math.random() * 60);
    const key = `${h}:${m}`;
    if (!slots.includes(key)) slots.push(key);
  }
  return slots;
}
const times = randomUniqueTimes(6);
for (const t of times) {
  const [hour, min] = t.split(':');
  cron.schedule(`${min} ${hour} * * *`, async () => {
    const msg = await getRandomMessage();
    if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[랜덤감정] ${hour}시${min}분: ${msg}`);
  });
}

// ----------- Express 서버 -----------
// (!!! webhook에선 express.json() 사용 금지 !!!)

app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const reply = await getReplyByMessage(event.message.text);
        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('웹훅 처리 에러:', err);
    res.status(200).send('OK'); // 에러여도 200!
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('무쿠 서버 스타트!');
});

// 필요시 내보내기
module.exports = {
  getReplyByMessage,
  getRandomMessage,
  getReplyByImagePrompt,
  getBase64FromUrl,
  setForcedModel,
  saveLog,
  getAllLogs
};
