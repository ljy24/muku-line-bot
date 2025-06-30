// ✅ index.js - 무쿠 LINE 서버 메인 로직 (최신 완전체)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const {
  getReplyByMessage,
  getRandomMessage,
  getReplyByImagePrompt,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
} = require('./autoReply');

// ✅ LINE 설정
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const app = express();
app.use(middleware(config));
app.use(express.json());

const userId = process.env.TARGET_USER_ID;
const BASE_IMAGE_URL = 'https://de-ji.net/yejin/';

// ✅ 메시지 응답 처리
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;

      // GPT 버전 명령
      if (userMessage === '3.5') {
        setForcedModel('gpt-3.5-turbo');
        return replyText(event.replyToken, '응, 이제부터 3.5로 대화할게.');
      }
      if (userMessage === '4.0') {
        setForcedModel('gpt-4o');
        return replyText(event.replyToken, '응, 이제부터 4.0으로 바꿨어!');
      }
      if (userMessage === '자동') {
        setForcedModel(null);
        return replyText(event.replyToken, '응, 상황에 맞게 자동으로 바꿔서 말할게!');
      }

      // 색깔 응답
      if (/색\s*이\s*뭐야|오늘.*색/i.test(userMessage)) {
        const reply = await getColorMoodReply();
        return replyText(event.replyToken, reply);
      }

      // 셀카 요청 처리
      if (/사진|셀카|selfie/i.test(userMessage)) {
        const imgUrl = await pickRandomImage();
        const comment = await getImageReactionComment();
        await replyImage(event.replyToken, imgUrl);
        return replyText(event.replyToken, comment);
      }

      // 일반 메시지
      const reply = await getReplyByMessage(userMessage);
      return replyText(event.replyToken, reply);
    }

    // 이미지 메시지
    if (event.type === 'message' && event.message.type === 'image') {
      const messageId = event.message.id;
      const stream = await client.getMessageContent(messageId);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const base64 = Buffer.concat(chunks).toString('base64');
      const reply = await getReplyByImagePrompt(base64);
      return replyText(event.replyToken, reply);
    }
  }
  res.sendStatus(200);
});

// ✅ 유틸 함수
function replyText(replyToken, text) {
  return client.replyMessage(replyToken, [{ type: 'text', text }]);
}

function replyImage(replyToken, imageUrl) {
  return client.replyMessage(replyToken, [{
    type: 'image',
    originalContentUrl: imageUrl,
    previewImageUrl: imageUrl
  }]);
}

// ✅ 셀카 사진 랜덤 선택
async function pickRandomImage() {
  const listPath = path.join(__dirname, 'memory/photo-list.txt');
  if (!fs.existsSync(listPath)) return BASE_IMAGE_URL + '00001.jpg';

  const list = fs.readFileSync(listPath, 'utf-8')
    .split('\n')
    .map(x => x.trim())
    .filter(x => x);

  const randomFile = list[Math.floor(Math.random() * list.length)];
  return BASE_IMAGE_URL + randomFile;
}

// ✅ 담타 알림
cron.schedule('0 * * * *', async () => {
  await client.pushMessage(userId, { type: 'text', text: '담타고?' });
});

// ✅ 담타 무시 5분 후 삐짐 반응
cron.schedule('5 * * * *', async () => {
  const sulky = await getSulkyReply();
  await client.pushMessage(userId, { type: 'text', text: sulky });
});

// ✅ 무쿠 랜덤 감정 메시지 5회 (09:00~24:00 랜덤)
const randomHours = [9, 11, 13, 17, 21];
for (const hour of randomHours) {
  cron.schedule(`0 ${hour} * * *`, async () => {
    const msg = await getRandomMessage();
    if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
  });
}

// ✅ 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 서버 실행됨 포트: ${PORT}`);
});