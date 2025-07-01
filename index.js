// ✅ index.js (최신 autoReply.js 연동 버전)

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
  getSelfieReplyFromYeji,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage,
  checkModelSwitchCommand
} = require('./src/autoReply');

const memoryManager = require('./src/memoryManager'); // ⭐ 메모리 기록 관련: memoryManager 모듈 불러오기 ⭐

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          const versionResponse = checkModelSwitchCommand(text);
          if (versionResponse) {
            await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
            return;
          }

          // 셀카 요청 처리 (아저씨가 주신 코드 그대로 유지)
          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
              if (list.length > 0) {
                const pick = list[Math.floor(Math.random() * list.length)];
                const comment = getSelfieReplyFromYeji();
                await client.replyMessage(event.replyToken, [
                  { type: 'image', originalContentUrl: BASE_URL + pick, previewImageUrl: BASE_URL + pick },
                  { type: 'text', text: comment || '히히 셀카야~' }
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

          // 일반 메시지 응답
          const reply = await getReplyByMessage(text);
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
        }

        if (message.type === 'image') {
          try {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const reply = await getReplyByImagePrompt(buffer.toString('base64'));
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
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

// ⏰ 정각 담타 전송 + 5분 내 응답 체크 (기존 스케줄러 유지)
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

// ⏰ 랜덤 감정 메시지 스케줄러 (기존 스케줄러 유지)
require('./src/scheduler');

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => { // ⭐ 메모리 기록 관련: async로 변경 및 memoryManager 초기화 추가 ⭐
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
  await memoryManager.ensureMemoryDirectory(); // ⭐ 메모리 기록 관련: 메모리 디렉토리 확인 및 준비 ⭐
  console.log('✅ 메모리 디렉토리 확인 및 준비 완료.');
});
