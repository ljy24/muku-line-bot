// 파일 경로: /index.js
// 파일 이름: index.js
// 버전: v1.4
// 변경 내용: 모든 require 경로를 /src 하위로 정정하고, 주석 재정비

require('dotenv').config(); // .env 환경변수 로드

const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// LINE API 설정 (.env에서 가져옴)
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// ✅ 모듈들 경로 명확하게 지정
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getRandomTobaccoMessage,
  getHappyReply,
  getSulkyReply,
  getColorMoodReply,
  getAppropriateModel,
} = require('./src/autoReply');

const omoide = require('./src/omoide');
const scheduler = require('./src/scheduler');
const checkUsage = require('./src/checkUsage');

// ✅ 기본 설정
app.use(bodyParser.json());
app.use(middleware(config));

// ✅ LINE Webhook 핸들링
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(
      events.map(async (event) => {
        // 메시지 타입에 따라 분기 처리
        if (event.type === 'message') {
          const message = event.message;
          const userId = event.source.userId;

          // 텍스트 메시지 처리
          if (message.type === 'text') {
            const userText = message.text;

            // 버전 요청 처리
            if (userText.trim() === '버전') {
              const version = getAppropriateModel();
              return client.replyMessage(event.replyToken, {
                type: 'text',
                text: `지금은 ${version} 버전으로 대화하고 있어.`,
              });
            }

            // 셀카 요청이면 셀카 + 멘트 전송
            if (/사진|셀카|얼굴|보고싶어/.test(userText)) {
              const photoUrl = await omoide.sendSelfie(); // 예진이 셀카
              const comment = await omoide.getImageReactionComment(); // 감정 멘트
              await client.replyMessage(event.replyToken, [
                { type: 'image', originalContentUrl: photoUrl, previewImageUrl: photoUrl },
                { type: 'text', text: comment },
              ]);
              return;
            }

            // 감정 메시지 응답 (GPT)
            const reply = await getReplyByMessage(userText);
            return client.replyMessage(event.replyToken, {
              type: 'text',
              text: reply,
            });
          }

          // 이미지 메시지 처리
          if (message.type === 'image') {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            const base64Image = buffer.toString('base64');

            const reply = await getReplyByImagePrompt(base64Image);
            return client.replyMessage(event.replyToken, {
              type: 'text',
              text: reply,
            });
          }
        }

        return null;
      })
    );
    res.status(200).json(results);
  } catch (err) {
    console.error('Webhook 처리 중 오류:', err);
    res.sendStatus(500);
  }
});

// ✅ 강제 푸시 메시지 (랜덤 감정 메시지 전송용)
app.get('/force-push', async (req, res) => {
  try {
    const message = await getRandomMessage();
    const userId = process.env.USER_ID;
    await client.pushMessage(userId, { type: 'text', text: message });
    res.status(200).send('Message pushed.');
  } catch (err) {
    console.error('force-push 에러:', err);
    res.sendStatus(500);
  }
});

// ✅ 포트 설정 (Render 환경 고려)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 서버 작동 중: http://localhost:${port}`);
});
