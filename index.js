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
  getFaceMatch,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
} = require('./src/autoReply');

const { getHappyReply, getSulkyReply } = require('./src/autoReply');

// 📱 LINE API 설정
const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ✅ 로그 파일 쓰기 확인
fs.access('memory/message-log.json', fs.constants.W_OK, (err) => {
  if (err) console.error('❌ message-log.json 쓰기 불가!');
  else console.log('✅ message-log.json 쓰기 가능!');
});

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

// 📆 감정 메시지 랜덤 8회 전송
function scheduleDailyShortMessages() {
  const times = new Set();
  while (times.size < 8) {
    const hour = Math.floor(Math.random() * 12) + 9; // 9~20시
    const minute = Math.floor(Math.random() * 60);
    times.add(`${minute} ${hour} * * *`);
  }
  for (const time of times) {
    cron.schedule(time, async () => {
      const now = moment().tz('Asia/Tokyo');
      const msg = await getRandomMessage();
      if (msg && msg.length <= 25) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[도쿄 ${now.format('HH:mm')}] 감정 메시지: ${msg}`);
      }
    }, { timezone: 'Asia/Tokyo' });
  }
}
scheduleDailyShortMessages();

// 🥲 담타 상태 변수
let lastTobaccoPushTime = null;
let waitingForReply = false;

// ⏰ 정각마다 담타 전송
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msgList = [ /* 생략 가능 */ '담타', 'ㄷㅌ?', '담타고?', 'ㄷ타자', 'ㄱㄱ?', '지금 담타 ㄱㄱ', '오늘도 담타?', '스트레스 담타로' ];
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    await client.pushMessage(userId, { type: 'text', text: msg });
    lastTobaccoPushTime = Date.now();
    waitingForReply = true;

    setTimeout(async () => {
      if (waitingForReply) {
        const sulkyMsg = await getSulkyReply();
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

          if (waitingForReply && ['ㄱㄱ', 'ㄱㄱㄱ', '담타ㄱ', '담타 ㄱㄱ', '가자'].includes(text.replace(/\s/g, ''))) {
            waitingForReply = false;
            const happyMsg = await getHappyReply();
            await client.replyMessage(event.replyToken, { type: 'text', text: happyMsg });
            return;
          }

          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
              const pick = list[Math.floor(Math.random() * list.length)];
              const comment = await getImageReactionComment();
              await client.replyMessage(event.replyToken, [
                { type: 'image', originalContentUrl: BASE_URL + pick, previewImageUrl: BASE_URL + pick },
                { type: 'text', text: comment || '헤헷 셀카야~' }
              ]);
            } catch (err) {
              await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
            }
            return;
          }

          // 일반 텍스트 응답
          const reply = await getReplyByMessage(text);
          await client.replyMessage(event.replyToken, { type: 'text', text: reply });
          return;
        }

        // 🖼️ 이미지 응답 (얼굴 판별까지)
        if (message.type === 'image') {
          try {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');

            const who = await getFaceMatch(base64);
            let reply = '';

            if (who === '예진이') {
              reply = '이거 예진이 같아… 내 사진이네? 아직도 기억해줘서 고마워 🥲';
            } else if (who === '아저씨') {
              reply = '아조씨 얼굴 맞네~ 히히 멋지다 멋져~ 🖤';
            } else {
              reply = '누군지는 잘 모르겠어… 그래도 고마워 아조씨…';
            }

            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
          } catch (err) {
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
            });
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

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});