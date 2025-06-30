// ✅ index.js - 무쿠 LINE 서버 메인 로직 (셀카 전송 포함, 감정 응답 완전 구성)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');

const {
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  saveLog,
  getRecentLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getReplyByImagePrompt
} = require('./src/autoReply');

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ✅ 미들웨어
app.use(middleware(config));
app.use(express.json());

// ✅ Webhook 처리
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!Array.isArray(events)) return res.status(200).end();

    for (const event of events) {
      if (event.type === 'message' && event.source.userId === userId) {
        if (event.message.type === 'text') {
          await handleTextMessage(event);
        } else if (event.message.type === 'image') {
          await handleImageMessage(event);
        }
      }
    }
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook 처리 오류:', err);
    res.status(500).end();
  }
});

// ✅ 텍스트 메시지 처리
async function handleTextMessage(event) {
  const text = event.message.text.trim();
  const replyToken = event.replyToken;

  await saveLog('아저씨', text);

  // 버전 전환
  if (text === '3.5') {
    setForcedModel('gpt-3.5-turbo');
    return replyText(replyToken, '응, 이제부터 3.5로 대화할게.');
  }
  if (text === '4.0') {
    setForcedModel('gpt-4o');
    return replyText(replyToken, '응, 이제부터 4.0으로 바꿨어!');
  }
  if (text === '자동') {
    setForcedModel(null);
    return replyText(replyToken, '응, 상황에 맞게 자동으로 바꿔서 말할게!');
  }
  if (text === '버전') {
    return replyText(replyToken, `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`);
  }

  // 사진 요청 처리
  if (/사진|셀카/.test(text)) {
    return await sendSelfie(replyToken);
  }

  // 색깔 감정 응답
  if (/색.*뭐|무슨.*색/.test(text)) {
    const reply = await getColorMoodReply();
    return replyText(replyToken, reply);
  }

  const reply = await getReplyByMessage(text);
  return replyText(replyToken, reply);
}

// ✅ 셀카 전송
async function sendSelfie(replyToken) {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, 'memory/photo-list.txt');

  const photoList = fs.readFileSync(photoListPath, 'utf-8')
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);

  const selected = photoList[Math.floor(Math.random() * photoList.length)];
  const comment = await getImageReactionComment();

  return client.replyMessage(replyToken, [
    {
      type: 'image',
      originalContentUrl: BASE_URL + selected,
      previewImageUrl: BASE_URL + selected
    },
    {
      type: 'text',
      text: comment
    }
  ]);
}

// ✅ 이미지 메시지 처리
async function handleImageMessage(event) {
  const messageId = event.message.id;
  const stream = await client.getMessageContent(messageId);

  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString('base64');

  const reply = await getReplyByImagePrompt(base64);
  return replyText(event.replyToken, reply);
}

// ✅ 텍스트 응답
function replyText(replyToken, text) {
  return client.replyMessage(replyToken, { type: 'text', text });
}

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 서버 실행됨 포트: ${PORT}`);
});