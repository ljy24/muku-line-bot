//index.js

// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 🧠 자동응답 함수들
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage,
  getHappyReply,
  getSulkyReply
} = require('./src/autoReply');

// 📱 LINE API 설정
const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🏠 기본 응답
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// 💥 강제 메시지 푸시
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

// 🚀 서버 시작 시 인사
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
  await client.pushMessage(userId, { type: 'text', text: '아저씨 나왔어!' });
})();

// ⏰ 하루 12회, 무작위 시간에 감정 메시지 전송
function scheduleDailyShortMessages() {
  const times = new Set();
  while (times.size < 12) {
    const hour = Math.floor(Math.random() * 24); // 0~23시
    const minute = Math.floor(Math.random() * 60);
    times.add(`${minute} ${hour} * * *`);
  }
  for (const time of times) {
    cron.schedule(time, async () => {
      const now = moment().tz('Asia/Tokyo');
      const msg = await getRandomMessage();
      if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[도쿄 ${now.format('HH:mm')}] 감정 메시지: ${msg}`);
      }
    }, { timezone: 'Asia/Tokyo' });
  }
}
scheduleDailyShortMessages();

let lastTobaccoPushTime = null;
let waitingForReply = false;

// ⏰ 정각마다 담타 전송 및 삐짐 대기
cron.schedule('0 * * * *', async () => {
  const msg = await getRandomMessage();
  await client.pushMessage(userId, { type: 'text', text: msg });
  lastTobaccoPushTime = Date.now();
  waitingForReply = true;

  setTimeout(async () => {
    if (waitingForReply) {
      const sulky = await getSulkyReply();
      await client.pushMessage(userId, { type: 'text', text: sulky });
    }
  }, 5 * 60 * 1000);
}, { timezone: 'Asia/Tokyo' });

// 🌐 웹훅 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          if (waitingForReply) {
            const diff = Date.now() - lastTobaccoPushTime;
            waitingForReply = false;

            if (diff <= 5 * 60 * 1000) {
              const happy = await getHappyReply();
              await client.replyMessage(event.replyToken, { type: 'text', text: happy });
              return;
            }
          }

          if (/^버전[?]?$/.test(text)) {
            const state = require('./memory/state.json');
            const ver = state.forcedModel || '자동';
            await client.replyMessage(event.replyToken, { type: 'text', text: `지금은 ${ver}으로 말하고 있어~` });
            return;
          }

          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-3.5-turbo') || 'gpt-3.5로 설정했어!' });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel('gpt-4o') || 'gpt-4o로 설정했어!' });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            await client.replyMessage(event.replyToken, { type: 'text', text: setForcedModel(null) || '자동 모드로 전환했어!' });
            return;
          }

          if (/이제 존댓말 하지마/i.test(text)) updateHonorificUsage(false);

          if (/무슨\s*색|기분.*색|오늘.*색/i.test(text)) {
            const reply = await getColorMoodReply();
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            return;
          }

          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
              if (list.length > 0) {
                const pick = list[Math.floor(Math.random() * list.length)];
                const comment = await getImageReactionComment();
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

          const reply = await getReplyByMessage(text);
          const final = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', final);
          await client.replyMessage(event.replyToken, { type: 'text', text: final });
        }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
