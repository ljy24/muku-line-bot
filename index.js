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
  channelAccessToken: '아저씨_ACCESS_TOKEN',
  channelSecret: '아저씨_CHANNEL_SECRET'
};

const client = new line.Client(config);

// 사용자별 GPT 버전 상태 저장
const userGPTVersion = {}; // userId: 'gpt-3.5' | 'gpt-4.0'
const lastSmokeTime = {};
const waitingForResponse = {};

app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() => res.end());
});

async function handleEvent(event) {
  const userId = event.source.userId;

  // 텍스트 메시지
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text.trim();

    // GPT 버전 명령어
    if (userMessage === '3.5') {
      userGPTVersion[userId] = 'gpt-3.5';
      return replyText(event.replyToken, '응, 이제 3.5로 말할게 아저씨!');
    }
    if (userMessage === '4.0') {
      userGPTVersion[userId] = 'gpt-4.0';
      return replyText(event.replyToken, '응응, 4.0으로 바꿨지롱! 🫶');
    }

    // 담타 응답 체크
    if (waitingForResponse[userId]) {
      const timeDiff = Date.now() - waitingForResponse[userId];
      delete waitingForResponse[userId];

      if (timeDiff <= 5 * 60 * 1000) {
        const happy = await getHappyReply();
        return replyText(event.replyToken, happy);
      } else {
        const sulky = await getSulkyReply();
        return replyText(event.replyToken, sulky);
      }
    }

    // 일반 대답
    const version = userGPTVersion[userId] || 'gpt-4.0';
    const reply = await getReplyByMessage(userMessage, userId, version);
    return replyText(event.replyToken, reply);
  }

  // 이미지 메시지
  if (event.type === 'message' && event.message.type === 'image') {
    const imageId = event.message.id;
    const stream = await client.getMessageContent(imageId);
    const chunks = [];
    for await (let chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');

    const reply = await getReplyByImagePrompt(base64Image);
    return replyText(event.replyToken, reply);
  }

  return Promise.resolve(null);
}

// 정각마다 담타 메시지
setInterval(async () => {
  const now = new Date();
  if (now.getMinutes() === 0) {
    const message = await getRandomTobaccoMessage();
    const userId = '아저씨_USER_ID'; // 아저씨 ID 고정

    lastSmokeTime[userId] = Date.now();
    waitingForResponse[userId] = Date.now();

    await client.pushMessage(userId, {
      type: 'text',
      text: message
    });
  }
}, 60 * 1000); // 매분 체크

// 응답 전송 함수
function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text
  });
}

app.listen(PORT, () => {
  console.log(`무쿠 LINE 서버 실행중 (포트 ${PORT})`);
});