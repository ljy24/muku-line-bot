const express = require('express');
const line = require('@line/bot-sdk');
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getFaceMatch,
  getFaceReactionPrompt,
  getRandomTobaccoMessage,
  getHappyReply,
  getSulkyReply
} = require('./autoReply');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const FIXED_USER_ID = process.env.TARGET_USER_ID;

const client = new line.Client(config);
const userGPTVersion = {}; // userId: 'gpt-3.5' | 'gpt-4.0'
const waitingForResponse = {};

app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() => res.end());
});

async function handleEvent(event) {
  const userId = event.source.userId;

  // 텍스트 메시지
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text.trim();

    // GPT 버전 변경
    if (userMessage === '3.5') {
      userGPTVersion[userId] = 'gpt-3.5';
      return replyText(event.replyToken, '응, 이제 3.5로 말할게 아저씨!');
    }
    if (userMessage === '4.0') {
      userGPTVersion[userId] = 'gpt-4.0';
      return replyText(event.replyToken, '응응, 4.0으로 바꿨지롱! 🫶');
    }

    // 담타 응답 감지
    if (waitingForResponse[userId]) {
      const diff = Date.now() - waitingForResponse[userId];
      delete waitingForResponse[userId];

      const reply = diff <= 5 * 60 * 1000 ? await getHappyReply() : await getSulkyReply();
      return replyText(event.replyToken, reply);
    }

    const version = userGPTVersion[userId] || 'gpt-4.0';
    const reply = await getReplyByMessage(userMessage, userId, version);
    return replyText(event.replyToken, reply);
  }

  // 이미지 메시지
  if (event.type === 'message' && event.message.type === 'image') {
    const stream = await client.getMessageContent(event.message.id);
    const chunks = [];
    for await (let chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');

    const reply = await getReplyByImagePrompt(base64Image);
    return replyText(event.replyToken, reply);
  }

  return Promise.resolve(null);
}

// 정각마다 담타 알림
setInterval(async () => {
  const now = new Date();
  if (now.getMinutes() === 0) {
    const message = await getRandomTobaccoMessage();

    waitingForResponse[FIXED_USER_ID] = Date.now();

    await client.pushMessage(FIXED_USER_ID, {
      type: 'text',
      text: message
    });
  }
}, 60 * 1000);

function replyText(token, text) {
  return client.replyMessage(token, {
    type: 'text',
    text
  });
}

app.listen(PORT, () => {
  console.log(`무쿠 LINE 서버 실행중 (포트 ${PORT})`);
});