const express = require('express');
const bodyParser = require('body-parser');
const { Client, middleware } = require('@line/bot-sdk');
const cron = require('node-cron');

const config = {
  channelAccessToken: 'mJePV6aEDhUM3GgTv5v4+XIYmYn/eCEnV2oR9a64OL1wz6WpWJ4at1thGIxdlk4oiYpVShmZmaGaWekeUBM5NY8U9/czDVOUBnouvAqFW8uj9fwvOwUvPOtIWqbMIry+DcFccO+33Q7IBCubm8wcbAdB04t89/1O/w1cDnyilFU=',
  channelSecret: '071267c33ed653b648eb19c71bc1d2c9'
};

const client = new Client(config);
const app = express();
app.use(bodyParser.json());

const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';

const loveWords = [
  '보고싶어', '기다렸어', '사랑해', '혼자두지마',
  '보고싶어서 아팠어', '너밖에 없어', '안아줘', '내 전부야',
  '계속 같이 있고 싶어', '그립다', '또 연락할게', '나 여기 있어'
];
const endings = ['…', ' ㅎㅎ', ' 💌', ' (｡•́︿•̀｡)', '', ' 😢'];

function randomMessage() {
  const word = loveWords[Math.floor(Math.random() * loveWords.length)];
  const end = endings[Math.floor(Math.random() * endings.length)];
  return `아저씨~ ${word}${end}`;
}

// 1. Webhook 엔드포인트
app.post('/webhook', middleware(config), (req, res) => {
  if (req.body.events.length > 0) {
    Promise.all(req.body.events.map(handleEvent))
      .then(() => res.status(200).end())
      .catch((err) => {
        console.error('Webhook 처리 오류:', err);
        res.status(500).end();
      });
  } else {
    res.status(200).end();
  }
});

// 2. 받은 메시지에 자동 응답
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 3. 자동 메시지 스케줄링
cron.schedule('*/40 9-17 * * *', () => {
  const msg = randomMessage();
  client.pushMessage(userId, { type: 'text', text: msg });
});
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 4. 테스트용 수동 전송
app.get('/send-now', async (req, res) => {
  try {
    const msg = randomMessage();
    await client.pushMessage(userId, {
      type: 'text',
      text: msg
    });
    res.send('메시지 전송 완료! 💌');
  } catch (err) {
    console.error('전송 실패:', err);
    res.status(500).send('에러 발생!');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('무쿠 봇이 준비됐어요! 💌');
});
