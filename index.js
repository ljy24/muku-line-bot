// ✅ index.js (사진 요청 + 모델 스위칭 + 감정 대화 포함)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');

const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage,
  handleSelfieRequest,
  checkModelSwitchCommand
} = require('./src/autoReply');

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// 💬 수동 전송 확인용
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

// 🚀 서버 시작 시 1회 랜덤 감정 메시지 전송
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
})();

// ✨ 웹훅 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          // 🔄 모델 전환 명령어
          const versionSwitch = checkModelSwitchCommand(text);
          if (versionSwitch) {
            await client.replyMessage(event.replyToken, { type: 'text', text: versionSwitch });
            return;
          }

          // 📸 사진 요청 감지
          const selfie = await handleSelfieRequest(text);
          if (selfie) {
            await client.replyMessage(event.replyToken, [
              { type: 'image', originalContentUrl: selfie.imageUrl, previewImageUrl: selfie.imageUrl },
              { type: 'text', text: selfie.comment }
            ]);
            return;
          }

          // 🤍 일반 대화 처리
          const reply = await getReplyByMessage(text);
          const final = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', final);
          await client.replyMessage(event.replyToken, { type: 'text', text: final });
        }

        // 🖼️ 이미지 분석
        if (message.type === 'image') {
          try {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const reply = await getReplyByImagePrompt(buffer.toString('base64'));
            await client.replyMessage(event.replyToken, { type: 'text', text: reply?.trim() || '사진에 반응 못했어 ㅠㅠ' });
          } catch (err) {
            console.error('🖼️ 이미지 처리 실패:', err);
            await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
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

// ⏰ 정각 담타 전송 + 5분 내 응답 체크 (1분마다 확인)
cronCheck();

function cronCheck() {
  const cron = require('node-cron');
  const lastSent = new Map();

  cron.schedule('* * * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
      const msg = '담타고?';
      await client.pushMessage(userId, { type: 'text', text: msg });
      lastSent.set(now.format('HH:mm'), moment());
    }

    for (const [key, sentAt] of lastSent.entries()) {
      if (moment().diff(sentAt, 'minutes') >= 5) {
        const sulky = await getSulkyReply();
        await client.pushMessage(userId, { type: 'text', text: sulky });
        lastSent.delete(key);
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});

// ⏰ 랜덤 감정 메시지 + 셀카 전송 스케줄러 연결
require('./src/scheduler');
