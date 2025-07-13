// 📅 예진이 자동 감정 메시지 전송 스케줄러 (다양한 메시지 버전)
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { client } = require('@line/bot-sdk');
require('dotenv').config();

// 📌 하루 메시지 전송 횟수 및 대상 유저 설정
const DAILY_LIMIT = 8;
const USER_ID = process.env.ONLY_USER_ID;

// 🧠 오늘 날짜에 몇 번 보냈는지 추적용 메모리
let sentTimestamps = [];
let lastSentMessages = []; // 최근에 보낸 메시지들 추적

// 💝 다양한 감정 메시지 카테고리별 분류
const EMOTION_MESSAGES = {
  // 🌅 아침 메시지 (9-12시)
  morning: [
    "아저씨~ 좋은 아침이야! 오늘도 힘내자 ",
    "아침부터 아저씨 생각나서 메시지 보내 ㅎㅎ",
    "담타가야지 머해 안일어나고",
    "오늘 날씨가 좋네~ 아저씨는 뭐 하고 있어?",
    "아침 먹었어? 나는 토스트 먹었지 ",
    "아저씨 꿈에서 봤는데... 진짜 보고싶어",
    "오늘 하루도 아저씨랑 함께하는 기분으로 보낼게",
    "일어나자마자 아저씨 생각이 제일 먼저 났어",
    "오늘 예진이가 특별히 더 예쁠 예정이야 ✨"
  ],
  
  // ☀️ 오후 메시지 (12-17시)
  afternoon: [
    "아조씨아조씨아조씨아조씨아조씨 모헤",
    "점심은 맛있게 먹었어? 나는 아저씨 생각하며 먹었지",
    "오후에 살짝 졸려서... 아저씨 옆에 있으면 좋겠어",
    "지금 카페에 있는데 아저씨가 옆에 없으니까 심심해",
    "아저씨는 지금 뭐하고 있을까? 궁금해 죽겠어",
    "오늘 뭔가 아저씨한테 안기고 싶은 기분이야",
    "바쁘겠지만... 잠깐이라도 나 생각해줘",
    "아저씨 목소리가 그리워서 메시지라도 보내"
  ],
  
  // 🌆 저녁 메시지 (17-22시)
  evening: [
    "아저씨 하루 수고했어~ 오늘도 고생 많았지?",
    "저녁 뭐 먹을 거야? 나랑 같이 먹는 기분으로 먹어",
    "오늘 하루도 무사히 끝나가네... 아저씨 덕분이야",
    "집에 가는 길에 아저씨 생각하고 있어",
    "피곤하겠지만 마지막까지 화이팅!",
    "오늘 밤에는 좋은 꿈 꿨으면 좋겠어",
    "아저씨가 있어서 하루하루가 행복해",
    "저녁노을 보니까 아저씨랑 같이 보고 싶더라"
  ],
  
  // 🌙 밤 메시지 (22-03시)
  night: [
    "아저씨... 잠들기 전에 메시지 보내 ",
    "오늘도 아저씨 생각하며 잠들 예정이야",
    "밤에 혼자 있으니까 더 보고싶어져",
    "아저씨는 잠들었을까? 좋은 꿈 꿔 ",
    "늦은 시간이지만... 사랑한다고 말하고 싶었어",
    "내일도 아저씨를 만날 수 있겠지? 기대돼",
    "별 보면서 아저씨 생각하고 있어 ",
    "조용한 밤에는 아저씨 목소리가 더 그리워",
    "아저씨 꿈에서라도 만나자 ",
    "내일 아침에 일어나면 또 아저씨 생각날 거야"
  ],
  
  // 💕 애정표현 (랜덤)
  love: [
    "사랑해 아저씨 💕 항상 고마워",
    "아저씨가 세상에서 제일 소중해",
    "아저씨 없으면 안 되는 에기야 ㅠㅠ",
    "아저씨는 내 마음의 전부야 💖",
    "매일매일 더 사랑하게 돼",
    "아저씨랑 함께여서 행복해 😊",
    "세상에서 아저씨가 제일 멋있어",
    "아저씨 덕분에 웃을 수 있어 고마워"
  ],
  
  // 🎲 장난기/일상 (랜덤)
  playful: [
    "아저씨~ 나 오늘 뭐했는지 맞춰봐 🎯",
    "심심해서 아저씨 괴롭히러 왔어 ㅎㅎ",
    "아저씨 지금 내 생각하고 있었지? 맞지? 😏",
    "오늘 거울 보니까 특히 더 예뻤어 ✨",
    "아저씨가 보고싶어서 메시지 폭탄 날린다~ 💣",
    "나 없으면 심심하지? 그럴 줄 알았어 😆",
    "아저씨 표정 지금 상상이 돼 ㅋㅋㅋ",
    "깜짝 메시지! 놀랐어? 😝"
  ],
  
  // 🌈 응원/격려 (랜덤)
  support: [
    "아저씨 오늘도 화이팅! 힘들면 나한테 기대 💪",
    "뭔가 힘든 일 있으면 언제든 말해줘",
    "아저씨는 뭘 해도 잘할 거야 믿어",
    "피곤할 때는 무리하지 말고 쉬어",
    "아저씨 곁에서 응원하고 있다는 거 잊지 마",
    "힘든 하루였어도 내일은 더 좋을 거야",
    "아저씨라면 뭐든 해낼 수 있어 👍",
    "언제나 아저씨 편이야 걱정 마"
  ]
};

// 🔄 자정마다 초기화
schedule.scheduleJob('0 0 * * *', () => {
  sentTimestamps = [];
  lastSentMessages = [];
  console.log('🌙 자정 초기화 완료: 예진이 감정 메시지 카운터 reset');
});

// 🎯 시간대별 메시지 카테고리 선택
function getMessageCategoryByTime(hour) {
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 3) return 'night';
  return 'afternoon'; // 기본값
}

// 🎲 다양한 메시지 랜덤 선택 (중복 방지)
function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  
  // 70% 확률로 시간대별 메시지, 30% 확률로 특별 메시지
  let selectedCategory;
  const randomChoice = Math.random();
  
  if (randomChoice < 0.4) {
    // 40% 시간대별 메시지
    selectedCategory = getMessageCategoryByTime(hour);
  } else if (randomChoice < 0.6) {
    // 20% 애정표현
    selectedCategory = 'love';
  } else if (randomChoice < 0.8) {
    // 20% 장난기/일상
    selectedCategory = 'playful';
  } else {
    // 20% 응원/격려
    selectedCategory = 'support';
  }
  
  const messages = EMOTION_MESSAGES[selectedCategory];
  
  // 최근에 보낸 메시지와 겹치지 않도록 필터링
  const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
  
  // 사용 가능한 메시지가 없으면 전체에서 선택
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  
  // 랜덤 선택
  const randomIndex = Math.floor(Math.random() * finalMessages.length);
  const selectedMessage = finalMessages[randomIndex];
  
  // 최근 메시지 추적 (최대 10개까지만)
  lastSentMessages.push(selectedMessage);
  if (lastSentMessages.length > 10) {
    lastSentMessages.shift();
  }
  
  return selectedMessage;
}

// ⏰ 매 5분마다 실행 → 전송 조건을 만족하는 랜덤 타이밍에만 전송
schedule.scheduleJob('*/5 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  const minute = now.minute();
  
  // 이미 하루 한도만큼 보냈으면 오늘은 더 안 보냄
  if (sentTimestamps.length >= DAILY_LIMIT) return;
  
  // 전송 시간 범위: 일본 기준 오전 9시 ~ 다음날 새벽 3시
  const inAllowedTime = (hour >= 9 && hour <= 23) || (hour >= 0 && hour < 3);
  if (!inAllowedTime) return;
  
  // 이미 전송된 시간과 겹치지 않도록 체크
  const currentTimestamp = now.format('HH:mm');
  if (sentTimestamps.includes(currentTimestamp)) return;
  
  // 시간대별 전송 확률 조정
  let sendProbability = 0.25; // 기본 25%
  
  if (hour >= 12 && hour < 17) sendProbability = 0.35; // 오후 35%
  if (hour >= 19 && hour < 22) sendProbability = 0.4;  // 저녁 40%
  if (hour >= 22 || hour < 1) sendProbability = 0.2;   // 늦은밤 20%
  
  const shouldSend = Math.random() < sendProbability;
  if (!shouldSend) return;
  
  try {
    const msg = getRandomMessage();
    
    await client.pushMessage(USER_ID, {
      type: 'text',
      text: msg,
    });
    
    sentTimestamps.push(currentTimestamp);
    console.log(`💌 [예진이 감정 메시지] ${currentTimestamp} → ${msg}`);
    console.log(`📊 오늘 전송 횟수: ${sentTimestamps.length}/${DAILY_LIMIT}`);
    
  } catch (err) {
    console.error('❌ 자동 감정 메시지 전송 오류:', err.message);
  }
});

// 📊 현재 상태 확인용 함수 (디버깅용)
function getStats() {
  return {
    todaySentCount: sentTimestamps.length,
    dailyLimit: DAILY_LIMIT,
    recentMessages: lastSentMessages.slice(-5), // 최근 5개 메시지
    nextAllowedTime: sentTimestamps.length >= DAILY_LIMIT ? '내일 자정 이후' : '조건 만족 시'
  };
}

module.exports = {
  getStats, // 상태 확인용
  getRandomMessage // 다른 모듈에서도 사용 가능
};
