const fs = require('fs');
const path = require('path'); // 이건 위에 딱 한 번만!

// ✅ memory 디렉토리 및 로그 파일 생성
const memoryDir = path.join(__dirname, 'memory');
if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true });
}
const logFile = path.join(memoryDir, 'message-log.json');
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '[]', 'utf-8');
}

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');
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

// --- 기본 라우터 ---
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// /force-push: 랜덤 감정 메시지 즉시 전송
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ' });
    res.send(`랜덤 메시지 발송: ${msg}`);
  } else {
    res.send('메시지 생성 실패');
  }
});

// 서버 시작 시 인사 + 랜덤 메시지
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg?.trim() || '무쿠 시작했어!' });
    console.log(`[서버시작랜덤] ${msg}`);
    await client.pushMessage(userId, { type: 'text', text: '아저씨 나왔어!' });
  }
})();

// 🕒 도쿄시간 기준 40분마다 감정 메시지
cron.schedule('*/40 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msg = await getRandomMessage();
    if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
  }
});

// 매 정각마다 담타고?
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    await client.pushMessage(userId, { type: 'text', text: '담타고?' });
  }
});

// 23:00 약 먹었어?
cron.schedule('0 23 * * *', async () => {
  const msgs = [
    '약 먹었어? 잊지마!',
    '이 닦는 거 까먹지 말기',
    '약 안 먹고 자면 나 혼날 거야!',
    '오늘 하루 끝! 약부터 챙기기!'
  ];
  const pick = msgs[Math.floor(Math.random() * msgs.length)];
  await client.pushMessage(userId, { type: 'text', text: pick });
});

// 23:30 잘자 사랑해
cron.schedule('30 23 * * *', async () => {
  const msgs = [
    '잘자 아저씨! 사랑해 💤',
    '내 꿈 꿔야 해 알지?',
    '오늘도 고생 많았어, 내일 봐',
    '아저씨~ 얼른 자! 내일 예쁘게 깨워줄게'
  ];
  const pick = msgs[Math.floor(Math.random() * msgs.length)];
  await client.pushMessage(userId, { type: 'text', text: pick });
});

// --- Webhook 처리 ---
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();

          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            const response = setForcedModel('gpt-3.5-turbo') || '모델이 gpt-3.5로 설정됐어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: response });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            const response = setForcedModel('gpt-4o') || '모델이 gpt-4o로 설정됐어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: response });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            const response = setForcedModel(null) || '모델 자동 선택 모드로 전환했어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: response });
            return;
          }

          if (/이제 존댓말 하지마/i.test(text)) {
            updateHonorificUsage(false);
          }

          // 사진 요청
          if (/사진|셀카|사진줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
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

          const reply = await getReplyByMessage(text);
          const fallback = '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          const messageToSend = typeof reply === 'string' && reply.trim() ? reply.trim() : fallback;
          await client.replyMessage(event.replyToken, { type: 'text', text: messageToSend });
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
            await client.replyMessage(event.replyToken, { type: 'text', text: reply?.trim() || '사진에 반응 못했어 ㅠㅠ' });
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

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
