const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  analyzeEmotion,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
} = require('./src/autoReply');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// --- Express 기본 라우터 ---
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// /force-push: 랜덤 감정 메시지 즉시 전송
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`랜덤 메시지 발송: ${msg}`);
  } else {
    res.send('메시지 생성 실패');
  }
});

// webhook
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();

          // 모델 고정 명령어 처리
          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-3.5-turbo') });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-4o') });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel(null) });
            return;
          }

          // 존댓말 모드 해제
          if (/이제 존댓말 하지마/i.test(text)) {
            updateHonorificUsage(false);
          }

          // 사진 요청 키워드
          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'src/memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            let list = [];
            try {
              list = fs.readFileSync(photoListPath, 'utf-8')
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean);
            } catch {}

            if (list.length > 0) {
              const pick = list[Math.floor(Math.random() * list.length)];
              const url = BASE_URL + pick;
              await client.replyMessage(event.replyToken, {
                type: 'image',
                originalContentUrl: url,
                previewImageUrl: url
              });
            } else {
              await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
            }
            return;
          }

          // 일반 대화 처리
          const reply = await getReplyByMessage(text);
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
        }

        if (message.type === 'image') {
          const messageId = message.id;
          try {
            const stream = await client.getMessageContent(messageId);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const base64Image = buffer.toString('base64');
            const reply = await getReplyByImagePrompt('사진이 도착했어', base64Image);
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
          } catch (err) {
            console.error('이미지 처리 오류:', err);
            await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 발생했어 ㅠㅠ' });
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('웹훅 처리 에러:', err);
    res.status(200).send('OK');
  }
});

// --- 서버 실행 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
