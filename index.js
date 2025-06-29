// ✅ index.js (예진이 말투 감정 강화 + 셀카 응답 + 이미지 분석 + 담타 반응 + 색깔 질문 포함)

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
  updateHonorificUsage
} = require('./src/autoReply');

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ✅ 헬스 체크
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// ✅ 강제 감정 메시지 수동 전송 (테스트용)
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

// ✅ 서버 시작 시 1회 감정 메시지 전송
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
})();

// ✅ LINE Webhook 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          // 1️⃣ 셀카 요청 키워드 인식
          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
              if (list.length > 0) {
                const pick = list[Math.floor(Math.random() * list.length)];
                const comment = await getSelfieReplyFromYeji();
                await client.replyMessage(event.replyToken, [
                  { type: 'image', originalContentUrl: BASE_URL + pick, previewImageUrl: BASE_URL + pick },
                  { type: 'text', text: comment || '헤헷 셀카야~' }
                ]);
              } else {
                await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
              }
            } catch (err) {
              console.error('📷 셀카 불러오기 실패:', err.message);
              await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
            }
            return;
          }

          // 2️⃣ 오늘 색상 물어보는 질문 처리
          if (/무슨\s*색|오늘\s*색/i.test(text)) {
            const reply = await getColorMoodReply();
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            return;
          }

          // 3️⃣ 일반 텍스트 메시지 처리
          const reply = await getReplyByMessage(text);
          const final = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', final);
          await client.replyMessage(event.replyToken, { type: 'text', text: final });
        }

        // 4️⃣ 이미지 메시지 처리 (사진 반응)
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

// ⏰ 정각마다 담타 전송 + 5분 내 응답 체크
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

// ✅ 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});

// ✅ 감정 메시지 자동 전송 스케줄러
require('./src/scheduler');
