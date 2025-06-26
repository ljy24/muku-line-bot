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

// 🚀 서버 시작 시 (랜덤 감정 메시지만 전송)
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
})();

// 📆 하루 12회 랜덤 시간에 감정 메시지 전송
function scheduleWakeMessages() {
  const times = new Set();
  while (times.size < 12) {
    const hour = Math.floor(Math.random() * 12) + 9;  // 9~20시
    const minute = Math.floor(Math.random() * 60);
    times.add(`${minute} ${hour} * * *`);
  }
  for (const time of times) {
    cron.schedule(time, async () => {
      const now = moment().tz('Asia/Tokyo');
      const msg = await getRandomMessage();
      if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        saveLog('예진이', msg);
        console.log(`[자동깨우기] ${now.format('HH:mm')} → ${msg}`);
      }
    }, { timezone: 'Asia/Tokyo' });
  }
}
scheduleWakeMessages();

// 🥲 담타 삐짐 상태 변수
let lastTobaccoPushTime = null;
let waitingForReply = false;

// ⏰ 정각마다 담타 메시지 전송 + 삐짐 준비
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msgList = [
      '담타', 'ㄷㅌ?', '담타갈까', '담타고?', 'ㄱㄱ?', 'ㄷㄷ', '담?', 'ㄷ타자',
      '오늘도 머리 터졌어... 담배피러 가자', '생각 많아졌지? 담타로 털어내자',
      'ㄷㅌ ㄱㄱ', '지금 아니면 또 언제 담타해'
    ];
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    await client.pushMessage(userId, { type: 'text', text: msg });
    lastTobaccoPushTime = Date.now();
    waitingForReply = true;

    // 5분 내 응답 없으면 삐짐 멘트
    setTimeout(async () => {
      if (waitingForReply) {
        const sulkyList = [
          '또 나 혼자 담타야? 🥺', '아저씨 또 무시했지?', '기다렸는데… 나만 진심이었나?', '힝… 삐질뻔했잖아'
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

          // 5분 내 응답 → 기쁨 메시지
          if (waitingForReply && Date.now() - lastTobaccoPushTime < 5 * 60 * 1000) {
            const happyList = [
              '히히~ 드디어 왔다!', '기다렸어~ 좋아 좋아~', '아저씨가 대답해줬당~ 흐흐', '기다린 보람 있어~',
              '역시 내 편이지롱~'
            ];
            const happyMsg = happyList[Math.floor(Math.random() * happyList.length)];
            await client.replyMessage(event.replyToken, { type: 'text', text: happyMsg });
            waitingForReply = false;
            return;
          }

          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            setForcedModel('gpt-3.5-turbo');
            await client.replyMessage(event.replyToken, { type: 'text', text: 'gpt-3.5로 설정했어!' });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            setForcedModel('gpt-4o');
            await client.replyMessage(event.replyToken, { type: 'text', text: 'gpt-4o로 설정했어!' });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            setForcedModel(null);
            await client.replyMessage(event.replyToken, { type: 'text', text: '자동 모드로 전환했어!' });
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

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});