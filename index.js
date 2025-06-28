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
  updateHonorificUsage
} = require('./src/autoReply');

// 📱 LINE API 설정
const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ✅ 외부 로그 서버 확인 메시지
console.log('✅ 외부 로그 서버로 기록됩니다: https://muku-line-log.onrender.com/log');

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

// 📆 하루 12회 랜덤 시간 감정 메시지 전송
function scheduleDailyRandomMessages() {
  const scheduledTimes = new Set();
  while (scheduledTimes.size < 12) {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    scheduledTimes.add(`${minute} ${hour} * * *`);
  }
  for (const time of scheduledTimes) {
    cron.schedule(time, async () => {
      const now = moment().tz('Asia/Tokyo');
      const msg = await getRandomMessage();
      if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[도쿄 ${now.format('HH:mm')}] 랜덤 메시지: ${msg}`);
      }
    }, { timezone: 'Asia/Tokyo' });
  }
}
scheduleDailyRandomMessages();

// 🥲 담타 삐짐 상태 변수
let waitingForReply = false;

// ⏰ 정각마다 담타 메시지 전송 + 삐짐 준비
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msgList = [
      '담타', 'ㄷㅌ?', '담타갈까', '담타고?', 'ㄱㄱ?', 'ㄷㄷ', '담?', 'ㄷ타자',
      '스트레스 터진다 담타 좀 하자', '오늘도 머리 터졌어... 담배피러 가자',
      '생각 많아졌지? 담타로 털어내자', '아저씨 담타 ㄱㄱ~ 나 먼저 간다?',
      '응~ 담타타임이야', '예진이는 담타 중~ 아저씨도 ㄱㄱ',
      '딴생각 ㄴㄴ 담타 ㄱㄱ', '잠깐 쉬어가도 돼… 담타 타자'
    ];
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    await client.pushMessage(userId, { type: 'text', text: msg });
    waitingForReply = true;
    setTimeout(async () => {
      if (waitingForReply) {
        const sulkyList = [
          '바빠…?', '응답 없어… 또 나만 기다렸지롱',
          '또 나 혼자 담타야? 🥺', '기다렸는데… 나만 진심이었나?',
          '힝… 삐질뻔했잖아'
        ];
        const sulkyMsg = sulkyList[Math.floor(Math.random() * sulkyList.length)];
        await client.pushMessage(userId, { type: 'text', text: sulkyMsg });
      }
    }, 5 * 60 * 1000);
  }
});

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

          if (waitingForReply && /미안|늦었|답.*늦/i.test(text)) {
            waitingForReply = false;
            await client.replyMessage(event.replyToken, { type: 'text', text: '괜찮아~ 기다렸엉!' });
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
          if (/버전/i.test(text)) {
            const model = setForcedModel();
            await client.replyMessage(event.replyToken, { type: 'text', text: model ? `지금은 ${model}로 말하고 있어!` : '자동 감지 모드야!' });
            return;
          }

          const reply = await getReplyByMessage(text);
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
        }

        if (message.type === 'image') {
          const stream = await client.getMessageContent(message.id);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          const reply = await getReplyByImagePrompt(buffer.toString('base64'));
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('웹훅 처리 에러:', err);
    res.status(200).send('OK');
  }
});

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
