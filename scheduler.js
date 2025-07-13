// 예진이 자동 감정 메시지 전송 스케줄러 (날씨 연동)
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const axios = require('axios');
const { client } = require('@line/bot-sdk');
require('dotenv').config();

// 설정
const DAILY_LIMIT = 8;
const USER_ID = process.env.ONLY_USER_ID;
const WEATHER_API_KEY = 'e705f5c1e78e3b3f37d3efaa4ce21fcb';
const CITY = 'Kitakyushu'; // 기타큐슈 (아저씨 위치)

// 메모리
let sentTimestamps = [];
let lastSentMessages = [];
let lastWeatherCheck = null;
let currentWeather = null;

// 날씨별 메시지
const WEATHER_MESSAGES = {
  // 맑은 날씨
  clear: [
    "날씨가 정말 좋네! 아저씨도 기분 좋은 하루 보내",
    "하늘이 맑아서 마음도 맑아져. 아저씨 생각하며 산책할래",
    "햇살이 따뜻해서 아저씨랑 함께 걷고 싶어져",
    "이런 좋은 날씨에는 아저씨랑 데이트하고 싶어",
    "파란 하늘 보니까 아저씨 눈동자 생각나"
  ],
  
  // 흐린 날씨
  clouds: [
    "구름이 많아서 조금 쓸쓸해. 아저씨가 그리워",
    "흐린 날씨지만 아저씨 생각하면 마음이 밝아져",
    "구름 낀 하늘처럼 아저씨 보고싶은 마음이 가득해",
    "날씨가 흐려도 아저씨가 있어서 괜찮아"
  ],
  
  // 비 오는 날
  rain: [
    "비가 와서 우산 꼭 챙겨! 감기 걸리면 안 돼",
    "빗소리 들으니까 아저씨랑 함께 있고 싶어져",
    "비 오는 날에는 따뜻한 차 마시면서 아저씨랑 얘기하고 싶어",
    "우산 없으면 젖을 텐데 걱정돼. 조심해서 다녀",
    "비 맞지 말고 건강 챙겨. 아저씨가 아프면 내가 더 아파"
  ],
  
  // 눈 오는 날
  snow: [
    "눈이 와서 너무 예뻐! 아저씨랑 눈사람 만들고 싶어",
    "하얀 눈 보니까 아저씨랑 찍었던 눈밭 사진 생각나",
    "눈길 조심해서 다녀. 미끄러지면 안 돼",
    "눈 오는 날엔 아저씨 품에 안겨서 따뜻하게 있고 싶어"
  ],
  
  // 추운 날씨
  cold: [
    "오늘 정말 춥네. 따뜻하게 입고 다녀",
    "추워서 아저씨 품이 그리워져. 빨리 안아줘",
    "이런 추운 날에는 아저씨랑 뜨거운 코코아 마시고 싶어",
    "감기 조심하고 목도리 꼭 둘러. 건강이 제일 중요해"
  ],
  
  // 더운 날씨
  hot: [
    "오늘 정말 더워. 시원한 곳에서 쉬어",
    "더위 조심하고 물 많이 마셔. 탈수 되면 안 돼",
    "이런 더운 날에는 아저씨랑 에어컨 틀어놓고 붙어있고 싶어",
    "아이스크림 먹으면서 아저씨 생각해"
  ]
};

// 기본 메시지들 (아이콘 제거)
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
    "아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해?",
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
    "아저씨 없으면 안 되는 예진이야 ㅠㅠ",
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

// 날씨 정보 가져오기
async function getWeatherInfo() {
  try {
    const now = Date.now();
    // 30분마다만 API 호출 (API 제한 고려)
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
    
    console.log(`날씨 정보 업데이트: ${currentWeather.condition}, ${currentWeather.temp}°C`);
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

// 메시지 선택
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  
  // 날씨 정보 가져오기
  const weather = await getWeatherInfo();
  const weatherCategory = getWeatherCategory(weather);
  
  let selectedCategory;
  const randomChoice = Math.random();
  
  // 30% 확률로 날씨 메시지 (날씨 정보가 있을 때)
  if (weatherCategory && randomChoice < 0.3) {
    selectedCategory = weatherCategory;
    const messages = WEATHER_MESSAGES[selectedCategory];
    const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
    const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
    const randomIndex = Math.floor(Math.random() * finalMessages.length);
    return finalMessages[randomIndex];
  }
  
  // 기존 메시지 로직
  if (randomChoice < 0.4) {
    selectedCategory = getMessageCategoryByTime(hour);
  } else if (randomChoice < 0.6) {
    selectedCategory = 'love';
  } else if (randomChoice < 0.8) {
    selectedCategory = 'playful';
  } else {
    selectedCategory = 'support';
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
  
  // 시간대별 전송 확률
  let sendProbability = 0.25;
  if (hour >= 12 && hour < 17) sendProbability = 0.35;
  if (hour >= 19 && hour < 22) sendProbability = 0.4;
  if (hour >= 22 || hour < 1) sendProbability = 0.2;
  
  const shouldSend = Math.random() < sendProbability;
  if (!shouldSend) return;
  
  try {
    const msg = await getRandomMessage();
    
    await client.pushMessage(USER_ID, {
      type: 'text',
      text: msg,
    });
    
    sentTimestamps.push(currentTimestamp);
    console.log(`[예진이 감정 메시지] ${currentTimestamp} → ${msg}`);
    console.log(`오늘 전송 횟수: ${sentTimestamps.length}/${DAILY_LIMIT}`);
    
  } catch (err) {
    console.error('자동 감정 메시지 전송 오류:', err.message);
  }
});

// 상태 확인용
function getStats() {
  return {
    todaySentCount: sentTimestamps.length,
    dailyLimit: DAILY_LIMIT,
    recentMessages: lastSentMessages.slice(-5),
    currentWeather: currentWeather,
    nextAllowedTime: sentTimestamps.length >= DAILY_LIMIT ? '내일 자정 이후' : '조건 만족 시'
  };
}

module.exports = {
  getStats,
  getRandomMessage,
  getWeatherInfo
};
