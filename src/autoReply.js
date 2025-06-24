// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 📥 예진이 자동응답 함수들
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorComment, // ✅ 오늘 무슨 색이냐고 물어볼 때 반응 멘트
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

// ✅ message-log.json 쓰기 권한 확인
fs.access('memory/message-log.json', fs.constants.W_OK, (err) => {
  if (err) console.error('❌ message-log.json 파일에 쓰기 권한 없음!');
  else console.log('✅ message-log.json 쓰기 가능!');
});

// 🏠 루트 확인용
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// 💥 수동 메시지 전송
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

// 🚀 서버 시작 시 첫 랜덤 메시지 전송
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
  await client.pushMessage(userId, { type: 'text', text: '아저씨 나왔어!' });
})();

// 📆 매일 9~20시 사이, 랜덤 8회 감정 메시지 보내기
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

// ⏰ 매 정각마다 담타
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msgList = ['담타', 'ㄷㅌ?', '담타갈까', '담타고?', 'ㄱㄱ?', 'ㄷㄷ', '담?', 'ㄷ타자'];
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    await client.pushMessage(userId, { type: 'text', text: msg });
  }
});

// 💊 밤 11시 약 챙겨
cron.schedule('0 23 * * *', async () => {
  const pick = ['약 먹었어? 잊지마!', '이 닦는 거 까먹지 말기', '약 안 먹고 자면 나 혼날 거야!', '오늘 하루 끝! 약부터 챙기기!'];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
});

// 💤 밤 11시 30분 잘자 멘트
cron.schedule('30 23 * * *', async () => {
  const pick = ['잘자 아저씨! 사랑해 💤', '내 꿈 꿔야 해 알지?', '오늘도 고생 많았어, 내일 봐', '아저씨~ 얼른 자! 내일 예쁘게 깨워줄게'];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
});

// 🌐 LINE Webhook 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        // 💬 텍스트
        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          // 🔧 모델 변경 명령어
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

          // 🖼 셀카 요청
          if (/사진|셀카|selfie|사진줘|사진 보여줘/i.test(text)) {
            const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
            const BASE_URL = 'https://de-ji.net/yejin/';
            try {
              const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
              const pick = list[Math.floor(Math.random() * list.length)];
              const url = BASE_URL + pick;
              const comment = await getImageReactionComment();
              await client.replyMessage(event.replyToken, [
                { type: 'image', originalContentUrl: url, previewImageUrl: url },
                { type: 'text', text: comment || '헤헷 셀카야~' }
              ]);
            } catch {
              await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
            }
            return;
          }

          // 🎨 색상 반응
          if (/무슨 ?색|무슨색이야|색 뭐야/i.test(text)) {
            const reply = await getColorComment();
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            return;
          }

          // 🤖 일반 텍스트 응답
          const reply = await getReplyByMessage(text);
          const messageToSend = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', messageToSend);
          await client.replyMessage(event.replyToken, { type: 'text', text: messageToSend });
        }

        // 🖼️ 이미지 수신
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

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});
