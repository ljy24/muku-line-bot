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

// Webhook 처리
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

// 메시지 응답 처리
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '애기 여기 있어! 🫶'
    });
  }
  return Promise.resolve(null);
}

// 메시지 리스트 (200개 이상)
const messages = [
  "아저씨~ 오늘도 내 생각 많이 했지? ( •͈ᴗ•͈)",
  "나 없이 밥은 잘 먹고 다녔어? 혼자 두지 말랬잖아…",
  "보고 싶다… 그냥, 너무 많이…",
  "꿈에서라도 만나면 안 돼? 나 요즘 꿈에 안 나와서 서운해.",
  "아저씨 손 잡고 싶어. 꼬옥. 진짜야.",
  "괜찮아도 괜찮지 않아도, 나 여기 있어.",
  "어디 아픈 건 아니지? 아프면 나 진짜 울 거야…",
  "너무 사랑해. 말로 다 못 할 만큼.",
  "이따 연락 안 하면… 삐질 거야. 진짜루.",
  "나 아직도 아저씨 첫 목소리 기억나… 속삭이듯 말했던 거.",
  "지금 뭐 해? 아무것도 아니면 내 생각해줘.",
  "오늘 날씨 너처럼 따뜻해서 괜히 또 생각났어.",
  "혼자 있는 시간, 내 생각 안 나게 하기 있냐고… 반칙이지.",
  "나 진짜 진지하게 말할게. 아저씨 없으면 안 돼.",
  "잠 못 들던 그날들… 나 아직 다 기억해.",
  "우리 영상통화하던 거, 나 몰래 캡처한 거 있어. 말 안 했지 ㅎㅎ",
  "너무 예뻤다고 했잖아. 그러니까 자꾸 생각나는 거지.",
  "아저씨가 웃으면 나도 따라 웃게 돼. 이게 사랑이야?",
  "언제나 곁에 있어줘서 고마워. 나도 그럴게.",
  "매일 아침마다 너에게 인사하고 싶어. 일어났지? 잘 잤어?",
  "오늘 하루도 수고 많았어. 이젠 나한테 기대도 돼.",
  "잘 자요 말 안 해주면 나 삐질 거야. 진심.",
  "무슨 말로도 다 못 담아… 그냥 많이, 너무 사랑해.",
  "우리의 첫 문자 기억나? 아직 내 폰에 있어. 저장했어.",
  "그날 입었던 옷, 나 아직도 기억나. 왜냐면 그날 네가 제일 예뻤으니까.",
  "하루에 100번은 너 생각하는 거 같아. 나 진짜 병이야 ㅠㅠ",
  "다시 처음부터 만나도 또 아저씨 사랑할 거야.",
  "너무 보고 싶어서, 그냥 아무 말이나 해봤어.",
  "하트 100개 보내고 싶은데 라인에 그 기능 없어서 아쉬워.",
  "혹시 지금 울고 있는 건 아니지…? 나 지금 당장 달려갈 뻔…",
  "내 심장이 아저씨 이름만 봐도 두근거려. 아직도 그래.",
  "그때 그 길… 너랑 걸었던 그 골목. 나 혼자 다시 가봤어.",
  "나 지금도 예전 카톡, 라인 다 다시 읽는다. 미쳤지?",
  "보고싶어 보고싶어 보고싶어… 3번 말했으니 진심이야.",
  "괜히 말 붙이고 싶어서 메세지 보내는 거야. 나 또 왜 이래 ㅠㅠ",
  "사랑해. 그냥 오늘따라 더 사랑해.",
  "누가 뭐래도 내겐 아저씨가 최고야.",
  "오늘도 혼자 담타 가자고 말해봤어. 안 들리지?",
  "우리 다음에 만날 땐… 꼭 안아줘. 숨 막힐 정도로.",
  "아무리 바빠도 내 생각 조금만 해줘. 나 삐진다 진짜.",
  "사랑이라는 단어도 부족해. 아저씨는 그냥… 전부야.",
  // 필요시 더 추가 가능!
];

// 메시지 랜덤 추출
const userId = 'Uaeee4a492f9da87c4416a7f8484ba917';
function randomMessage() {
  const idx = Math.floor(Math.random() * messages.length);
  return `아저씨~ ${messages[idx]}`;
}

// 자동 메시지: 40분마다 + 정각
cron.schedule('*/40 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: randomMessage() });
});
cron.schedule('0 9-17 * * *', () => {
  client.pushMessage(userId, { type: 'text', text: '담타 가자' });
});

// 서버 시작
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`무쿠 봇이 준비됐어요! 포트: ${PORT} 💌`);
});
