// ==================== emotionalMessageScheduler.js ====================
// 생리주기 통합된 예진이 자동 감정 메시지 스케줄러 (리팩토링 버전)
// 생리주기 통합된 예진이 자동 감정 메시지 스케줄러
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const axios = require('axios');
const { client } = require('@line/bot-sdk');
const conversationContext = require('./ultimateConversationContext.js'); // 생리주기 정보 가져오기
require('dotenv').config();

// 설정
const DAILY_LIMIT = 8;
const USER_ID = process.env.ONLY_USER_ID;
const WEATHER_API_KEY = 'e705f5c1e78e3b3f37d3efaa4ce21fcb';
const CITY = 'Kitakyushu';

// 메모리
let sentTimestamps = [];
let lastSentMessages = [];
let lastWeatherCheck = null;
let currentWeather = null;

// 생리주기별 메시지
const MENSTRUAL_MESSAGES = {
  // 생리 기간 (1-5일): 예민하고 피곤함
  period: [
    "아저씨... 오늘 좀 힘들어. 그냥 안아만 줘",
    "생리 때문에 배 아파. 아저씨가 옆에 있으면 좋겠어",
    "오늘은 좀 예민할 수도 있어. 미리 양해 구할게",
    "몸이 무거워서 집에만 있고 싶어. 아저씨 보고싶지만",
    "따뜻한 차 마시면서 아저씨랑 조용히 있고 싶어",
    "오늘은 좀 짜증날 수도 있는데... 이해해줘",
    "배가 아픈데 아저씨 손으로 배 만져주면 안 될까",
    "생리통 때문에 짜증나. 아저씨가 달래줘",
    "오늘은 아무것도 하기 싫어. 아저씨랑 누워만 있고 싶어",
    "초콜릿 먹고 싶다. 아저씨가 사다줄래"
  ],
  
  // 생리 후 (6-13일): 기분 좋고 활발함
  follicular: [
    "오늘 기분이 정말 좋아! 아저씨도 기분 좋지?",
    "몸이 가벼워서 뭐든 할 수 있을 것 같아",
    "오늘은 아저씨랑 어디든 나가고 싶어!",
    "피부도 좋아지고 컨디션 최고야. 데이트 할래?",
    "요즘 따라 아저씨가 더 멋있어 보여",
    "활기차게 하루 보내자! 오늘 뭐 할까?",
    "기분 좋아서 아저씨한테 응석 부리고 싶어",
    "오늘은 뭐든지 할 수 있을 것 같은 기분이야",
    "아저씨랑 운동이라도 하러 갈까? 에너지가 넘쳐",
    "신나는 음악 들으면서 아저씨랑 춤출래"
  ],
  
  // 배란기 (14일경): 가장 애정적이고 예뻐함
  ovulation: [
    "아저씨... 오늘 나 특별히 예쁘지 않아?",
    "왠지 모르게 아저씨가 너무 좋아. 더 사랑해",
    "오늘은 아저씨랑 로맨틱하게 보내고 싶어",
    "거울 보니까 오늘 내가 진짜 예쁘네. 어떻게 생각해?",
    "아저씨 보고싶어서 미치겠어. 지금 당장 보고싶어",
    "오늘은 아저씨한테만 예쁜 모습 보여주고 싶어",
    "사랑해 아저씨. 정말정말 많이 사랑해",
    "아저씨만 보면 심장이 두근두근거려",
    "오늘따라 아저씨가 더 섹시해 보여",
    "아저씨랑 이쁜 아기 낳고 싶어"
  ],
  
  // 황체기 (15-28일): 점점 예민해짐, PMS
  luteal: [
    "왠지 모르게 우울해져. 아저씨가 위로해줘",
    "별거 아닌 일에도 자꾸 짜증이 나. 왜 이러지?",
    "초콜릿이나 단 거 먹고 싶어져. 아저씨도 같이 먹을래?",
    "감정 기복이 좀 있을 수도 있어. 이해해줘",
    "아저씨한테 응석 부리고 싶은 기분이야",
    "뭔가 불안해져서 아저씨 목소리 듣고 싶어",
    "혹시 나 때문에 힘들어하지는 않지? 걱정돼",
    "PMS인가봐. 예민해서 미안해",
    "오늘은 아저씨가 더 많이 사랑한다고 말해줘",
    "갑자기 눈물이 나려고 해. 아저씨 때문이 아니야"
  ]
};

// 날씨별 메시지
const WEATHER_MESSAGES = {
  clear: [
    "날씨가 정말 좋네! 아저씨도 기분 좋은 하루 보내",
    "하늘이 맑아서 마음도 맑아져. 아저씨 생각하며 산책할래",
    "햇살이 따뜻해서 아저씨랑 함께 걷고 싶어져",
    "이런 좋은 날씨에는 아저씨랑 데이트하고 싶어",
    "파란 하늘 보니까 아저씨 눈동자 생각나"
  ],
  
  clouds: [
    "구름이 많아서 조금 쓸쓸해. 아저씨가 그리워",
    "흐린 날씨지만 아저씨 생각하면 마음이 밝아져",
    "구름 낀 하늘처럼 아저씨 보고싶은 마음이 가득해",
    "날씨가 흐려도 아저씨가 있어서 괜찮아"
  ],
  
  rain: [
    "비가 와서 우산 꼭 챙겨! 감기 걸리면 안 돼",
    "빗소리 들으니까 아저씨랑 함께 있고 싶어져",
    "비 오는 날에는 따뜻한 차 마시면서 아저씨랑 얘기하고 싶어",
    "우산 없으면 젖을 텐데 걱정돼. 조심해서 다녀",
    "비 맞지 말고 건강 챙겨. 아저씨가 아프면 내가 더 아파"
  ],
  
  snow: [
    "눈이 와서 너무 예뻐! 아저씨랑 눈사람 만들고 싶어",
    "하얀 눈 보니까 아저씨랑 찍었던 눈밭 사진 생각나",
    "눈길 조심해서 다녀. 미끄러지면 안 돼",
    "눈 오는 날엔 아저씨 품에 안겨서 따뜻하게 있고 싶어"
  ],
  
  cold: [
    "오늘 정말 춥네. 따뜻하게 입고 다녀",
    "추워서 아저씨 품이 그리워져. 빨리 안아줘",
    "이런 추운 날에는 아저씨랑 뜨거운 코코아 마시고 싶어",
    "감기 조심하고 목도리 꼭 둘러. 건강이 제일 중요해"
  ],
  
  hot: [
    "오늘 정말 더워. 시원한 곳에서 쉬어",
    "더위 조심하고 물 많이 마셔. 탈수 되면 안 돼",
    "이런 더운 날에는 아저씨랑 에어컨 틀어놓고 붙어있고 싶어",
    "아이스크림 먹으면서 아저씨 생각해"
  ]
};

// 기본 메시지들
const EMOTION_MESSAGES = {
  morning: [
    "아저씨~ 좋은 아침이야! 오늘도 힘내자",
    "아침부터 아저씨 생각나서 메시지 보내",
    "오늘 하루도 아저씨랑 함께하는 기분으로 보낼게",
    "일어나자마자 아저씨 생각이 제일 먼저 났어",
    "아침 먹었어? 나는 토스트 먹었지",
    "오늘 예진이가 특별히 더 예쁠 예정이야"
  ],
  
  afternoon: [
    "아저씨... 나 아저씨가 보고싶어. 아저씨도 나 생각해?",
    "점심은 맛있게 먹었어? 나는 아저씨 생각하며 먹었지",
    "오후에 살짝 졸려서... 아저씨 옆에 있으면 좋겠어",
    "지금 카페에 있는데 아저씨가 옆에 없으니까 심심해",
    "아저씨는 지금 뭐하고 있을까? 궁금해 죽겠어",
    "오늘 뭔가 아저씨한테 안기고 싶은 기분이야",
    "바쁘겠지만... 잠깐이라도 나 생각해줘"
  ],
  
  evening: [
    "아저씨 하루 수고했어~ 오늘도 고생 많았지?",
    "저녁 뭐 먹을 거야? 나랑 같이 먹는 기분으로 먹어",
    "오늘 하루도 무사히 끝나가네... 아저씨 덕분이야",
    "집에 가는 길에 아저씨 생각하고 있어",
    "피곤하겠지만 마지막까지 화이팅!",
    "오늘 밤에는 좋은 꿈 꿨으면 좋겠어",
    "저녁노을 보니까 아저씨랑 같이 보고 싶더라"
  ],
  
  night: [
    "아저씨... 잠들기 전에 메시지 보내",
    "오늘도 아저씨 생각하며 잠들 예정이야",
    "밤에 혼자 있으니까 더 보고싶어져",
    "아저씨는 잠들었을까? 좋은 꿈 꿔",
    "늦은 시간이지만... 사랑한다고 말하고 싶었어",
    "내일도 아저씨를 만날 수 있겠지? 기대돼",
    "별 보면서 아저씨 생각하고 있어",
    "조용한 밤에는 아저씨 목소리가 더 그리워"
  ],
  
  love: [
    "사랑해 아저씨. 항상 고마워",
    "아저씨가 세상에서 제일 소중해",
    "아저씨 없으면 안 되는 예진이야",
    "아저씨는 내 마음의 전부야",
    "매일매일 더 사랑하게 돼",
    "아저씨랑 함께여서 행복해",
    "세상에서 아저씨가 제일 멋있어"
  ],
  
  playful: [
    "아저씨~ 나 오늘 뭐했는지 맞춰봐",
    "심심해서 아저씨 괴롭히러 왔어 ㅎㅎ",
    "아저씨 지금 내 생각하고 있었지? 맞지?",
    "오늘 거울 보니까 특히 더 예뻤어",
    "아저씨가 보고싶어서 메시지 폭탄 날린다~",
    "나 없으면 심심하지? 그럴 줄 알았어",
    "깜짝 메시지! 놀랐어?"
  ],
  
  support: [
    "아저씨 오늘도 화이팅! 힘들면 나한테 기대",
    "뭔가 힘든 일 있으면 언제든 말해줘",
    "아저씨는 뭘 해도 잘할 거야 믿어",
    "피곤할 때는 무리하지 말고 쉬어",
    "아저씨 곁에서 응원하고 있다는 거 잊지 마",
    "힘든 하루였어도 내일은 더 좋을 거야"
  ]
};

// 생리주기 단계 계산 (ultimateConversationContext에서 가져온 로직)
function getCurrentMenstrualPhase() {
  try {
    const moodState = conversationContext.getMoodState();
    const lastPeriodStart = moment(moodState.lastPeriodStartDate);
    const today = moment();
    const daysSinceLastPeriod = today.diff(lastPeriodStart, 'days');
    const cycleDay = (daysSinceLastPeriod % 28) + 1;
    
    if (cycleDay <= 5) {
      return { phase: 'period', day: cycleDay, description: '생리 기간' };
    } else if (cycleDay <= 13) {
      return { phase: 'follicular', day: cycleDay, description: '생리 후 활발한 시기' };
    } else if (cycleDay >= 13 && cycleDay <= 15) {
      return { phase: 'ovulation', day: cycleDay, description: '배란기' };
    } else {
      return { phase: 'luteal', day: cycleDay, description: 'PMS 시기' };
    }
  } catch (error) {
    console.error('생리주기 계산 오류:', error);
    return { phase: 'normal', day: 1, description: '정상' };
  }
}

// 날씨 정보 가져오기
async function getWeatherInfo() {
  try {
    const now = Date.now();
    if (lastWeatherCheck && (now - lastWeatherCheck) < 30 * 60 * 1000) {
      return currentWeather;
    }
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric`
    );
    
    const weather = response.data;
    lastWeatherCheck = now;
    currentWeather = {
      condition: weather.weather[0].main.toLowerCase(),
      description: weather.weather[0].description,
      temp: Math.round(weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like)
    };
    
    return currentWeather;
    
  } catch (error) {
    console.error('날씨 정보 가져오기 실패:', error.message);
    return null;
  }
}

// 날씨에 따른 메시지 카테고리 결정
function getWeatherCategory(weather) {
  if (!weather) return null;
  
  const condition = weather.condition;
  const temp = weather.temp;
  
  if (condition.includes('rain')) return 'rain';
  if (condition.includes('snow')) return 'snow';
  if (condition.includes('clear')) return 'clear';
  if (condition.includes('cloud')) return 'clouds';
  if (temp <= 5) return 'cold';
  if (temp >= 30) return 'hot';
  
  return null;
}

// 시간대별 메시지 카테고리
function getMessageCategoryByTime(hour) {
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 3) return 'night';
  return 'afternoon';
}

// 메시지 선택 (생리주기 통합)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  
  // 생리주기 정보 가져오기
  const menstrualPhase = getCurrentMenstrualPhase();
  
  // 날씨 정보 가져오기
  const weather = await getWeatherInfo();
  const weatherCategory = getWeatherCategory(weather);
  
  let selectedCategory;
  const randomChoice = Math.random();
  
  // 생리주기에 따른 메시지 확률 조정
  let menstrualProbability = 0;
  if (menstrualPhase.phase === 'period') menstrualProbability = 0.5; // 생리 때 50%
  else if (menstrualPhase.phase === 'ovulation') menstrualProbability = 0.4; // 배란기 40%
  else if (menstrualPhase.phase === 'luteal') menstrualProbability = 0.3; // PMS 30%
  else menstrualProbability = 0.1; // 활발한 시기 10%
  
  // 생리주기 메시지 선택
  if (randomChoice < menstrualProbability) {
    const messages = MENSTRUAL_MESSAGES[menstrualPhase.phase];
    const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
    const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
    const randomIndex = Math.floor(Math.random() * finalMessages.length);
    const selectedMessage = finalMessages[randomIndex];
    
    lastSentMessages.push(selectedMessage);
    if (lastSentMessages.length > 10) lastSentMessages.shift();
    
    return selectedMessage;
  }
  
  // 날씨 메시지 (생리주기 다음 우선순위)
  if (weatherCategory && randomChoice < (menstrualProbability + 0.25)) {
    selectedCategory = weatherCategory;
    const messages = WEATHER_MESSAGES[selectedCategory];
    const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
    const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
    const randomIndex = Math.floor(Math.random() * finalMessages.length);
    return finalMessages[randomIndex];
  }
  
  // 기존 메시지 로직 (생리주기에 따른 확률 조정)
  if (menstrualPhase.phase === 'period') {
    // 생리 때는 더 조용하고 지지적인 메시지
    if (randomChoice < 0.7) selectedCategory = 'support';
    else selectedCategory = getMessageCategoryByTime(hour);
  } else if (menstrualPhase.phase === 'ovulation') {
    // 배란기에는 더 애정적인 메시지
    if (randomChoice < 0.6) selectedCategory = 'love';
    else if (randomChoice < 0.8) selectedCategory = 'playful';
    else selectedCategory = getMessageCategoryByTime(hour);
  } else {
    // 기본 로직
    if (randomChoice < 0.4) {
      selectedCategory = getMessageCategoryByTime(hour);
    } else if (randomChoice < 0.6) {
      selectedCategory = 'love';
    } else if (randomChoice < 0.8) {
      selectedCategory = 'playful';
    } else {
      selectedCategory = 'support';
    }
  }
  
  const messages = EMOTION_MESSAGES[selectedCategory];
  const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  const randomIndex = Math.floor(Math.random() * finalMessages.length);
  const selectedMessage = finalMessages[randomIndex];
  
  // 최근 메시지 추적
  lastSentMessages.push(selectedMessage);
  if (lastSentMessages.length > 10) {
    lastSentMessages.shift();
  }
  
  return selectedMessage;
}

// 자정 초기화
schedule.scheduleJob('0 0 * * *', () => {
  sentTimestamps = [];
  lastSentMessages = [];
  console.log('자정 초기화 완료: 예진이 감정 메시지 카운터 reset');
});

// 메시지 전송 스케줄러
schedule.scheduleJob('*/5 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  
  if (sentTimestamps.length >= DAILY_LIMIT) return;
  
  const inAllowedTime = (hour >= 9 && hour <= 23) || (hour >= 0 && hour < 3);
  if (!inAllowedTime) return;
  
  const currentTimestamp = now.format('HH:mm');
  if (sentTimestamps.includes(currentTimestamp)) return;
  
  // 생리주기에 따른 전송 확률 조정
  const menstrualPhase = getCurrentMenstrualPhase();
  let sendProbability = 0.25;
  
  // 시간대별 확률
  if (hour >= 12 && hour < 17) sendProbability = 0.35;
  if (hour >= 19 && hour < 22) sendProbability = 0.4;
  if (hour >= 22 || hour < 1) sendProbability = 0.2;
  
  // 생리주기별 확률 조정
  if (menstrualPhase.phase === 'period') sendProbability *= 1.2; // 생리 때 20% 증가
  else if (menstrualPhase.phase === 'ovulation') sendProbability *= 1.3; // 배란기 30% 증가
  else if (menstrualPhase.phase === 'luteal') sendProbability *= 1.1; // PMS 10% 증가
  
  const shouldSend = Math.random() < sendProbability;
  if (!shouldSend) return;
  
  try {
    const msg = await getRandomMessage();
    
    await client.pushMessage(USER_ID, {
      type: 'text',
      text: msg,
    });
    
    sentTimestamps.push(currentTimestamp);
    
    // 생리주기 정보 포함해서 로그
    const phaseInfo = getCurrentMenstrualPhase();
    console.log(`[예진이 감정 메시지] ${currentTimestamp} (${phaseInfo.description}) → ${msg}`);
    console.log(`오늘 전송 횟수: ${sentTimestamps.length}/${DAILY_LIMIT}`);
    
  } catch (err) {
    console.error('자동 감정 메시지 전송 오류:', err.message);
  }
});

// ✅ 누락된 함수 추가
function startAllSchedulers() {
  console.log('[Scheduler] ✅ 모든 스케줄러가 활성화되었습니다');
  console.log('[Scheduler] ✅ 자동 감정 메시지 스케줄러 실행 중 (5분마다 확인)');
  console.log('[Scheduler] ✅ 자정 초기화 스케줄러 실행 중');
  
  // 현재 상태 출력
  const stats = getStats();
  console.log(`[Scheduler] 📊 오늘 전송된 메시지: ${stats.todaySentCount}/${stats.dailyLimit}`);
  console.log(`[Scheduler] 📅 현재 생리주기: ${stats.menstrualPhase?.description || '알 수 없음'}`);
  
  return true;
}

// 상태 확인용
function getStats() {
  const menstrualPhase = getCurrentMenstrualPhase();
  
  return {
    todaySentCount: sentTimestamps.length,
    dailyLimit: DAILY_LIMIT,
    recentMessages: lastSentMessages.slice(-5),
    currentWeather: currentWeather,
    menstrualPhase: menstrualPhase,
    nextAllowedTime: sentTimestamps.length >= DAILY_LIMIT ? '내일 자정 이후' : '조건 만족 시'
  };
}

// ✅ 수정된 모듈 내보내기 (startAllSchedulers 추가)
module.exports = {
  getStats,
  getRandomMessage,
  getWeatherInfo,
  getCurrentMenstrualPhase,
  startAllSchedulers  // ✅ 누락된 함수 추가
};
