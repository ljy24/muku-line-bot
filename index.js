// ✅ index.js - 무쿠 LINE 서버 메인 로직 (셀카 처리 포함 최신 완성 버전)

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
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
} = require('./src/autoReply');

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (_, res) => res.send('무쿠 서버 실행 중 🐣'));

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message') {
        const msg = event.message;
        if (msg.type === 'text') await handleTextMessage(event, msg.text);
        if (msg.type === 'image') await handleImageMessage(event, msg.id);
      }
    }
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook 에러:', err);
    res.status(500).end();
  }
});

async function handleTextMessage(event, text) {
  try {
    const lower = text.toLowerCase().trim();
    await saveLog('아저씨', text);

    if (lower === '버전') return reply(event, `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`);
    if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return reply(event, '응, 이제부터 3.5로 대화할게.'); }
    if (lower === '4.0') { setForcedModel('gpt-4o'); return reply(event, '응, 이제부터 4.0으로 바꿨어!'); }
    if (lower === '자동') { setForcedModel(null); return reply(event, '응, 상황에 맞게 자동으로 바꿔서 말할게!'); }

    if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
      await handleSelfieRequest(event);
      return;
    }

    if (/무슨\s*색|오늘\s*색|색이 뭐야/i.test(text)) {
      const mood = await getColorMoodReply();
      return reply(event, mood);
    }

    const res = await getReplyByMessage(text);
    await reply(event, res);
  } catch (err) {
    console.error('❌ 텍스트 처리 실패:', err);
    await reply(event, '에러났어 ㅠㅠ 다시 말해줄래?');
  }
}

async function handleImageMessage(event, messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');
    const res = await getReplyByImagePrompt(base64Image);
    await reply(event, res);
  } catch (err) {
    console.error('❌ 이미지 처리 실패:', err);
    await reply(event, '사진 읽는 중 오류났어 ㅠㅠ');
  }
}

async function handleSelfieRequest(event) {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const listPath = path.join(__dirname, 'memory/photo-list.txt');

  try {
    if (!fs.existsSync(listPath)) return reply(event, '셀카 목록이 없어 ㅠㅠ');
    const list = fs.readFileSync(listPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
    if (list.length === 0) return reply(event, '셀카가 비어있어 ㅠㅠ');
    const selected = list[Math.floor(Math.random() * list.length)];
    const comment = await getImageReactionComment();
    await client.replyMessage(event.replyToken, [
      { type: 'image', originalContentUrl: BASE_URL + selected, previewImageUrl: BASE_URL + selected },
      { type: 'text', text: comment }
    ]);
  } catch (err) {
    console.error('❌ 셀카 처리 실패:', err);
    await reply(event, '사진 불러오기 실패했어 ㅠㅠ');
  }
}

async function reply(event, text) {
  if (!text) return;
  await client.replyMessage(event.replyToken, { type: 'text', text });
  await saveLog('예진이', text);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 서버 실행됨 포트: ${PORT}`);
});