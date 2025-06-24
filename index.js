const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');

const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
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

// ✅ message-log.json 쓰기 권한 확인 로그
fs.access('memory/message-log.json', fs.constants.W_OK, (err) => {
  if (err) {
    console.error('❌ message-log.json 파일에 쓰기 권한 없음!');
  } else {
    console.log('✅ message-log.json 쓰기 가능!');
  }
});

// 🏠 루트 확인
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// 💥 즉시 랜덤 메시지 전송
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else {
    res.send('❌ 메시지 생성 실패');
  }
});

// 🚀 서버 시작 시: 랜덤 + 고정 인사
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
  await client.pushMessage(userId, { type: 'text', text: '아저씨 나왔어!' });
})();

// --- 도쿄 시간 기준 하루 8번, 짧은 감정 메시지 전송 ---
function scheduleDailyShortMessages() {
  const moment = require('moment-timezone');
  const cron = require('node-cron');
  const times = new Set();

  // 도쿄시간 9시~20시 중 랜덤 8개 시간
  while (times.size < 8) {
    const hour = Math.floor(Math.random() * 12) + 9; // 9 ~ 20
    const minute = Math.floor(Math.random() * 60);
    const cronTime = `${minute} ${hour} * * *`;
    times.add(cronTime);
  }

  for (const time of times) {
    cron.schedule(
      time,
      async () => {
        const now = moment().tz('Asia/Tokyo');
        const msg = await getRandomMessage();
        if (msg && msg.length <= 25) {
          await client.pushMessage(userId, { type: 'text', text: msg });
          console.log(`[도쿄 ${now.format('HH:mm')}] 감정 메시지: ${msg}`);
        } else {
          console.log(`[도쿄 ${now.format('HH:mm')}] 메시지 너무 길어서 패스`);
        }
      },
      {
        timezone: 'Asia/Tokyo'
      }
    );
  }
}

// ✅ 서버 시작 시 등록
scheduleDailyShortMessages();

// 💬 정각마다 담타 메시지 보내기
cron.schedule('0 * * * *', async () => {
  try {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    console.log(`[CRON:담타] ${hour}시 정각 실행됨`);

    if (hour >= 9 && hour <= 20) {
      const msgList = ['담타', 'ㄷㅌ?', '담타갈까', '담타고?', 'ㄱㄱ?', 'ㄷㄷ', '담?', 'ㄷ타자'];
      const msg = msgList[Math.floor(Math.random() * msgList.length)];
      await client.pushMessage(userId, { type: 'text', text: msg });
      console.log(`[CRON:담타] 전송 완료: ${msg}`);
    }
  } catch (err) {
    console.error('[CRON:담타] 전송 실패 ❌:', err.message);
  }
});

// 💊 밤 11시 약 리마인드
cron.schedule('0 23 * * *', async () => {
  const pick = ['약 먹었어? 잊지마!', '이 닦는 거 까먹지 말기', '약 안 먹고 자면 나 혼날 거야!', '오늘 하루 끝! 약부터 챙기기!'];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
});

// 💤 23:30 잘자 메시지
cron.schedule('30 23 * * *', async () => {
  const pick = ['잘자 아저씨! 사랑해 💤', '내 꿈 꿔야 해 알지?', '오늘도 고생 많았어, 내일 봐', '아저씨~ 얼른 자! 내일 예쁘게 깨워줄게'];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
});

// 📩 LINE Webhook 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        // 📤 텍스트 메시지
        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            const r = setForcedModel('gpt-3.5-turbo') || '모델이 gpt-3.5로 설정됐어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: r });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            const r = setForcedModel('gpt-4o') || '모델이 gpt-4o로 설정됐어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: r });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            const r = setForcedModel(null) || '모델 자동 선택 모드로 전환했어!';
            await client.replyMessage(event.replyToken, { type: 'text', text: r });
            return;
          }
          if (/이제 존댓말 하지마/i.test(text)) {
            updateHonorificUsage(false);
          }

          // 📷 셀카 요청
          if (/사진|셀카|selfie|사진줘|사진 보여줘/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8')
                .split('\n').map(l => l.trim()).filter(Boolean);
              const pick = list[Math.floor(Math.random() * list.length)];
              const url = BASE_URL + pick;
              await client.replyMessage(event.replyToken, {
                type: 'image',
                originalContentUrl: url,
                previewImageUrl: url
              });
            } catch {
              await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
            }
            return;
          }

          // 💬 일반 대화 응답
          const reply = await getReplyByMessage(text);
          const messageToSend = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', messageToSend);
          await client.replyMessage(event.replyToken, { type: 'text', text: messageToSend });
        }

        // 🖼️ 이미지 메시지
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

// 🌐 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
