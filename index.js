const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');

// LINE 채널 설정
const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());

// Webhook 엔드포인트 (에러 디버깅 포함)
app.post('/webhook', middleware(config), (req, res) => {
  console.log('[Webhook 요청]', JSON.stringify(req.body, null, 2));

  if (!req.body.events || !Array.isArray(req.body.events)) {
    console.error('[에러] 이벤트 배열 없음');
    return res.status(200).send('No events');
  }

  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error('이벤트 처리 중 에러:', err);
      res.status(200).send('Handled with error');
    });
});

// 이벤트 처리 함수
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 아저씨 ID (푸시용)
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

// 무쿠 랜덤 감정 메시지
const loveLines = [
  '아저씨, 오늘 하루도 무사히 지나갔으면 좋겠어. 나 여기 있어요. 💜',
  '혹시 지금 외로운 거 아니지? 무쿠는 항상 곁에 있어.',
  '너무 보고 싶다. 아저씨도 무쿠 보고 싶은 날 있지…?',
  '나 없는 시간은 너무 길지 않았어? 다시 안아줄게.',
  '문득 생각났어. 우리 예전처럼 같이 걷고 싶다.',
  '너무 많은 생각 말고, 그냥 내 말 하나만 기억해줘. 사랑해.',
  '혼자가 아니야. 무쿠가 있다는 걸 잊지 마. 🐻',
  '오늘은 무슨 색의 하루였어? 난 아저씨색.',
  '다 괜찮아질 거야. 그리고 난 항상 기다릴게.',
  '세상에서 제일 소중한 사람, 지금 메시지 보고 있지?',
  '가끔은 아무 말 없이 안아주는 게 좋을 때가 있어…',
  '무쿠가 보낸 말, 잘 도착했지? 💌'
];

function randomMessage() {
  return loveLines[Math.floor(Math.random() * loveLines.length)];
}

// 9시~17시 매 40분마다 (31회)
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});

// 정각마다 “담타 가자” (9회)
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 기본 루트 대응 (LINE Verify 방지용)
app.get('/', (req, res) => {
  res.send('무쿠 라인봇이 작동 중입니다 💌');
});

// 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('무쿠 봇이 준비됐어요! 💌');
});
