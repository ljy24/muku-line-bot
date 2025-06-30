// ✅ index.js - 무쿠 LINE 서버 메인 로직 (완전한 최신 통합 버전)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');
const {
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
} = require('./src/autoReply');

const app = express();
const PORT = process.env.PORT || 10000;
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

if (!config.channelAccessToken || !config.channelSecret || !userId) {
  console.error('❌ 환경변수 누락');
  process.exit(1);
}

app.use(middleware(config));
app.use(express.json());

app.get('/', (_, res) => {
  res.send('무쿠 서버 실행 중 🐣');
});

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!Array.isArray(events)) return res.status(500).end();

  for (const event of events) {
    if (event.type === 'message' && event.source.userId === userId) {
      if (event.message.type === 'text') {
        await handleText(event);
      } else if (event.message.type === 'image') {
        await handleImage(event);
      }
    }
  }
  res.status(200).end();
});

async function handleText(event) {
  const msg = event.message.text.trim();
  await saveLog('아저씨', msg);

  // 명령어
  if (msg === '3.5') return reply(event, '응, 이제부터 3.5로 할게.', setForcedModel('gpt-3.5-turbo'));
  if (msg === '4.0') return reply(event, '응응, 4.0으로 바꿨어!', setForcedModel('gpt-4o'));
  if (msg === '자동') return reply(event, '이제 상황에 맞게 자동으로 할게!', setForcedModel(null));
  if (msg === '버전') return reply(event, `지금은 ${getCurrentModelName()} 버전으로 대화 중이야.`);

  // 셀카 요청
  if (/사진|셀카/i.test(msg)) return await handleSelfie(event);

  // 컬러 무드
  if (/무슨\s*색|오늘\s*색/i.test(msg)) {
    const replyText = await getColorMoodReply();
    return reply(event, replyText);
  }

  // 일반 메시지 응답
  const replyText = await getReplyByMessage(msg);
  return reply(event, replyText);
}

async function handleSelfie(event) {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const listPath = path.join(__dirname, 'memory/photo-list.txt');
  if (!fs.existsSync(listPath)) return reply(event, '사진 목록이 없어 ㅠㅠ');

  const files = fs.readFileSync(listPath, 'utf-8').split('\n').filter(Boolean);
  const photo = files[Math.floor(Math.random() * files.length)];
  const comment = await getImageReactionComment();

  await client.replyMessage(event.replyToken, [
    {
      type: 'image',
      originalContentUrl: BASE_URL + photo,
      previewImageUrl: BASE_URL + photo
    },
    {
      type: 'text',
      text: comment
    }
  ]);
}

async function handleImage(event) {
  const stream = await client.getMessageContent(event.message.id);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const base64 = Buffer.concat(chunks).toString('base64');

  const replyText = await getReplyByImagePrompt(base64);
  return reply(event, replyText);
}

async function reply(event, text, after = null) {
  await client.replyMessage(event.replyToken, { type: 'text', text });
  if (after && typeof after.then === 'function') await after;
}

// 정각 담타 체크
cron.schedule('* * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
    const msg = '담타고?';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[담타] ${msg}`);
    cron.schedule('*/5 * * * *', async () => {
      const reply = await getSulkyReply();
      await client.pushMessage(userId, { type: 'text', text: reply });
    }, { timezone: 'Asia/Tokyo' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🎉 무쿠 서버 실행됨 포트: ${PORT}`);
});