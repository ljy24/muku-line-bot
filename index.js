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
  checkModelSwitchCommand,
  getProactiveMemoryMessage // ⭐ 새로 추가된 함수 불러오기 ⭐
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

          // ⭐ 사용자 메시지에서 기억 추출 및 저장 ⭐
          await memoryManager.extractAndSaveMemory(text);
          console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료`); // 호출 확인용 로그

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


// ⭐ 새로 추가된 코드: 무쿠가 하루 약 3번 기억 기반으로 먼저 메시지 보내기 (랜덤 타이밍) ⭐
// 매 3시간마다 (오전 9시부터 오후 9시까지) 실행되며, 60% 확률로 메시지 전송
// 이렇게 하면 하루 평균 5번의 시도 중 3번 정도 메시지를 보내게 되어,
// 매번 다른 타이밍에 말을 걸어오는 효과를 줍니다.
cron.schedule('0 */3 9-21 * * *', async () => { // 매 3시간마다 9시, 12시, 15시, 18시, 21시 정각 (일본 표준시 기준)
  // 60% 확률로 메시지 전송 (5번의 기회 중 3번 정도 성공)
  if (Math.random() < 0.6) {
    try {
      console.log(`[Scheduler] 무쿠의 기억 기반 선제적 메시지 전송 시도 (시간: ${moment().tz('Asia/Tokyo').format('HH:mm')})`);
      const proactiveMessage = await getProactiveMemoryMessage(); // autoReply.js에서 새로 만든 함수 호출
      if (proactiveMessage) {
        await client.pushMessage(userId, { type: 'text', text: proactiveMessage });
        console.log(`[Scheduler] 무쿠의 선제적 메시지 전송 성공: ${proactiveMessage}`);
        saveLog('예진이', proactiveMessage); // 예진이 답변 로그 저장
      } else {
        console.log('[Scheduler] 생성된 선제적 메시지가 없습니다.');
      }
    } catch (error) {
      console.error('❌ [Scheduler Error] 선제적 메시지 전송 실패:', error);
    }
  } else {
    console.log(`[Scheduler] 무쿠의 선제적 메시지 전송 시도 (시간: ${moment().tz('Asia/Tokyo').format('HH:mm')}) - 이번에는 건너뛰기.`);
  }
}, {
  scheduled: true,
  timezone: "Asia/Tokyo" // 일본 표준시 (JST) 기준으로 스케줄 설정
});
// ⭐ 새로 추가된 코드 끝 ⭐


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
  await memoryManager.ensureMemoryDirectory();
  console.log('✅ 메모리 디렉토리 확인 및 준비 완료.');
});
