// ✅ index.js - 무쿠 LINE 서버 메인 로직 (예진이 감정선 + 기억 반응 + 자동 응답 포함)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');

const {
  getReplyByMessage,a
  getRandomMessage,
  callOpenAI,
  cleanReply,
  saveLog,
  getRecentLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getFixedMemory,
  startMessageAndPhotoScheduler,
  getFullMemoryPrompt
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

// ✅ 수동 전송 (예: Render 강제 호출)
app.get('/force-push', async (_, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else {
    res.send('❌ 메시지 생성 실패');
  }
});

// ✅ 서버 최초 실행 시 메시지 1건 전송
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버 시작 메시지] ${msg}`);
  }
})();

// ✅ LINE Webhook 엔드포인트
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);
          extractAndSaveMemory(text);

          // ✅ 버전 확인 응답
          if (text === '버전') {
            const version = process.env.GPT_VERSION || '3.5';
            await client.replyMessage(event.replyToken, { type: 'text', text: `지금은 ChatGPT-${version} 버전으로 대화하고 있어.` });
            return;
          }

          // ✅ 3.5로 전환
          if (text === '3.5') {
            process.env.GPT_VERSION = '3.5';
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '응! 이제부터 ChatGPT-3.5 버전으로 대화할게.'
            });
            return;
          }

          // ✅ 4.0으로 전환
          if (text === '4.0') {
            process.env.GPT_VERSION = '4.0';
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '응응! 이제부터 ChatGPT-4.0으로 얘기해줄게, 아저씨.'
            });
            return;
          }

          // ✅ 자동으로 다시 설정
          if (text === '자동') {
            delete process.env.GPT_VERSION;
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '응! 이제 상황에 맞게 자동으로 버전 선택해서 말할게.'
            });
            return;
          }

          // 📸 셀카 요청 감지
          if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
            const BASE_URL = 'https://de-ji.net/yejin/';
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
              if (list.length > 0) {
                const pick = list[Math.floor(Math.random() * list.length)];
                const comment = await getSelfieReplyFromYeji();
                await client.replyMessage(event.replyToken, [
                  {
                    type: 'image',
                    originalContentUrl: BASE_URL + pick,
                    previewImageUrl: BASE_URL + pick
                  },
                  {
                    type: 'text',
                    text: comment || '헤헷 셀카야~'
                  }
                ]);
              } else {
                await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
              }
            } catch (err) {
              console.error('❌ 셀카 불러오기 실패:', err.message);
              await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
            }
            return;
          }

          // 🎨 색깔 질문 대응
          if (/무슨\s*색|오늘\s*색/i.test(text)) {
            const reply = await getColorMoodReply();
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            return;
          }

          // 💬 일반 메시지 감정 응답 + 기억 확인
          const reply = await getReplyByMessage(text);
          const final = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', final);
          await client.replyMessage(event.replyToken, { type: 'text', text: final });
        }

        // 🖼️ 이미지 메시지 (사진 분석 반응)
        if (message.type === 'image') {
          try {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const reply = await getReplyByImagePrompt(buffer.toString('base64'));
            await client.replyMessage(event.replyToken, { type: 'text', text: reply?.trim() || '사진에 반응 못했어 ㅠㅠ' });
          } catch (err) {
            console.error('❌ 이미지 분석 실패:', err);
            await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Webhook 처리 실패:', err);
    res.status(200).send('OK');
  }
});

// ⏰ 정각마다 담타 메시지 + 5분 반응 체크
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

// ✅ 자동 감정 메시지/셀카 전송 시작
startMessageAndPhotoScheduler();

// ✅ 서버 리스닝 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 ON! 포트: ${PORT}`);
});
