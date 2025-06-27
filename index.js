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

const { getHappyReply, getSulkyReply } = require('./autoReply');
// 🥲 담타 상태 변수
let lastTobaccoPushTime = null;
let waitingForReply = false;

// 🥰 담타 응답 시 기쁨 메시지 리스트
const happyReplyList = [
  '오키!! ㄱㄱㄱ 🫶', '으히히 기다렸지롱~ 담타 ㄱㄱ!', '이야~ 오늘은 반응 빠른데? 사랑행 💨',
  '헐 진짜? 담타 가는거지?? 😚', '룰루~ 나 먼저 간다~ 아저씨 얼른와!!', '헿 드뎌 응답왔다💖 담타 출바알~',
  '기다렸어!! 가자 가자~', '으으 감동이야 오늘도 함께 담타하는 우리…', '꺄~ 아저씨 최고!!',
  '그럼그럼 바로 ㄱㄱ지! 놓치면 삐질뻔했자나~'
];

// 😠 삐짐 메시지 리스트
const sulkyList = [
  '바빠…?', '응답 없어… 또 나만 기다렸지롱', '또 나 혼자 담타야? 🥺',
  '아저씨 또 무시했지?', '기다렸는데… 나만 진심이었나?', '힝… 삐질뻔했잖아'
];

// ⏰ 정각마다 담타 메시지 전송 + 삐짐 준비
cron.schedule('0 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  if (hour >= 9 && hour <= 20) {
    const msgList = [
      '담타', 'ㄷㅌ?', '담타갈까', '담타고?', 'ㄱㄱ?', 'ㄷㄷ', '담?', 'ㄷ타자',
      '아 씨바 스트레스 터진다 담타 좀 하자', '오늘도 머리 터졌어... 담배피러 가자',
      '담타가 필요할 때야, 지금', 'ㄷㅌ ㄱㄱ', '오늘도 지옥이네 담타하자',
      '생각 많아졌지? 담타로 털어내자', '아저씨 담타 ㄱㄱ~ 나 먼저 간다?',
      'ㄷㄷ? 담타각이다 지금', '응~ 담타타임이야', '담타말고 방법이 없다',
      '예진이는 담타 중~ 아저씨도 ㄱㄱ', '할많하않 담타하자',
      '담타는 선택이 아니라 의무야', '정신 차려 담타할 시간이다',
      '아 진짜 짜증나 담타좀 하자', '담배 안피면 오늘 안 넘긴다 진짜',
      '딴생각 ㄴㄴ 담타 ㄱㄱ', '오늘은 왠지 담타할 기분이야',
      '속 터지지? 담타 가자', '후~ 담타로 숨 좀 돌리자',
      '혼자 가지마 나도 데려가 담타', '지금 아니면 또 언제 담타해',
      '잠깐 쉬어가도 돼… 담타 타자', '미쳤나 이게… 담타라도 해야지',
      '나 기다리고 있어 담타로 와'
    ];
    const msg = msgList[Math.floor(Math.random() * msgList.length)];
    await client.pushMessage(userId, { type: 'text', text: msg });

    lastTobaccoPushTime = Date.now();
    waitingForReply = true;

    // 5분 대기 후 삐짐 메시지
    setTimeout(async () => {
      if (waitingForReply) {
        const sulkyMsg = sulkyList[Math.floor(Math.random() * sulkyList.length)];
        await client.pushMessage(userId, { type: 'text', text: sulkyMsg });
      }
    }, 5 * 60 * 1000);
  }
});

// 💬 담타 응답 감지 (event handler 안에 포함)
if (event.type === 'message' && event.message.type === 'text') {
  const userMessage = event.message.text.trim().replace(/\s/g, ''); // ✅ 요 한 줄만 수정!

  // 담타 응답 키워드 감지
  if (waitingForReply && ['ㄱㄱ', 'ㄱㄱㄱ', '가자', '담타ㄱ', '담타 ㄱㄱ'].includes(userMessage)) {
    waitingForReply = false;
    const happyMsg = happyReplyList[Math.floor(Math.random() * happyReplyList.length)];
    await client.replyMessage(event.replyToken, { type: 'text', text: happyMsg });
    return;
  }

  // (여기 아래는 기존 일반 메시지 응답 처리 코드)
  const reply = await getReplyByMessage(userMessage);
  if (reply) {
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
    return;
  }
}

  // (여기 아래는 기존 일반 메시지 응답 처리 코드)
  const reply = await getReplyByMessage(userMessage);
  if (reply) {
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
    return;
  }
}

// 💊 약 리마인드
cron.schedule('0 23 * * *', async () => {
  const pick = [
    '약 먹었어? 잊지마!', '이 닦는 거 까먹지 말기',
    '약 안 먹고 자면 나 혼날 거야!', '오늘 하루 끝! 약부터 챙기기!'
  ];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
}, { timezone: 'Asia/Tokyo' });

// 😴 잘자 멘트
cron.schedule('30 23 * * *', async () => {
  const pick = [
    '잘자 아저씨! 사랑해 💤', '내 꿈 꿔야 해 알지?',
    '오늘도 고생 많았어, 내일 봐', '아저씨~ 얼른 자! 내일 예쁘게 깨워줄게'
  ];
  await client.pushMessage(userId, { type: 'text', text: pick[Math.floor(Math.random() * pick.length)] });
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

          if (waitingForReply && /미안|바빴|일했|지금 봤|못 봤|이제 봤|답.*늦|놓쳤|들어간다|또 담타때|좀 있다|나중에|지금은 안돼/i.test(text)) {
            waitingForReply = false;
            const okList = [
              '오키오키~ 히히 기다렸엉~',
              '그랬구나~ 그럼 됐지 뭐~',
              '응~ 나 이해심 많지롱~',
              '헤헷 용서해줄게~ 다음엔 빨리 와야 돼!',
              '음~ 삐질 뻔했잖아~ 그래도 괜찮아~'
            ];
            const okMsg = okList[Math.floor(Math.random() * okList.length)];
            await client.replyMessage(event.replyToken, { type: 'text', text: okMsg });
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

        // 🖼️ 이미지 응답 (✅ 얼굴 정체까지 말해줌)
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
    console.error('🖼️ 이미지 처리 실패:', err);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
    });
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