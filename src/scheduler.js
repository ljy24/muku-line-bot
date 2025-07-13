// ✅ scheduler.js - 최종 수정본

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const axios = require('axios');
const { Client } = require('@line/bot-sdk'); // 💡 [수정] Client 클래스를 직접 가져옵니다.
const conversationContext = require('./ultimateConversationContext.js');
require('dotenv').config();

// ==================== ⚙️ 설정 ====================

// 💡 [수정] LINE 클라이언트 인스턴스를 생성합니다.
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
});

const DAILY_LIMIT = 8;
const USER_ID = process.env.TARGET_USER_ID; // 💡 [수정] index.js와 변수 이름 통일
const WEATHER_API_KEY = 'e705f5c1e78e3b3f37d3efaa4ce21fcb';
const CITY = 'Kitakyushu';

// ==================== 🧠 메모리 ====================

let sentTimestamps = [];
let lastSentMessages = [];
let lastWeatherCheck = null;
let currentWeather = null;

// ==================== 💬 메시지 모음 ====================

// [생리주기별 메시지, 날씨별 메시지, 기본 메시지]
// (이전 코드와 동일하므로 공간을 위해 생략합니다. 실제 코드에는 이 부분에 메시지 객체들이 있어야 합니다.)
const MENSTRUAL_MESSAGES = { /* ... 이전 코드와 동일 ... */ };
const WEATHER_MESSAGES = { /* ... 이전 코드와 동일 ... */ };
const EMOTION_MESSAGES = { /* ... 이전 코드와 동일 ... */ };


// ==================== 🛠️ 헬퍼 함수 ====================

/**
 * 메시지 목록에서 이전에 보내지 않은 메시지를 랜덤하게 선택합니다.
 * @param {string[]} messages - 메시지 후보 배열
 * @param {string[]} lastSent - 최근에 보낸 메시지 배열
 * @returns {string} 선택된 메시지
 */
function selectRandomUniqueMessage(messages, lastSent) {
    const availableMessages = messages.filter(msg => !lastSent.includes(msg));
    const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
    const randomIndex = Math.floor(Math.random() * finalMessages.length);
    const selectedMessage = finalMessages[randomIndex];

    // 최근 메시지 추적
    lastSent.push(selectedMessage);
    if (lastSent.length > 10) {
        lastSent.shift();
    }
    return selectedMessage;
}

// ==================== 🔬 핵심 로직 함수 ====================

// 생리주기 단계 계산
function getCurrentMenstrualPhase() {
  try {
    const moodState = conversationContext.getMoodState();
    const lastPeriodStart = moment(moodState.lastPeriodStartDate);
    const today = moment();
    const daysSinceLastPeriod = today.diff(lastPeriodStart, 'days');
    const cycleDay = (daysSinceLastPeriod % 28) + 1;

    if (cycleDay <= 5) return { phase: 'period', day: cycleDay, description: '생리 기간' };
    if (cycleDay <= 13) return { phase: 'follicular', day: cycleDay, description: '생리 후 활발한 시기' };
    if (cycleDay >= 13 && cycleDay <= 15) return { phase: 'ovulation', day: cycleDay, description: '배란기' };
    return { phase: 'luteal', day: cycleDay, description: 'PMS 시기' };
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
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric`);
    lastWeatherCheck = now;
    currentWeather = {
      condition: response.data.weather[0].main.toLowerCase(),
      description: response.data.weather[0].description,
      temp: Math.round(response.data.main.temp),
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
  const { condition, temp } = weather;
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
  return 'afternoon'; // 기본값
}

// 메시지 선택 로직 (개선된 버전)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  const menstrualPhase = getCurrentMenstrualPhase();
  const weather = await getWeatherInfo();
  const weatherCategory = getWeatherCategory(weather);

  const randomChoice = Math.random();

  // 1. 생리주기 메시지 선택 (가장 높은 우선순위)
  let menstrualProbability = 0.1; // 기본 10%
  if (menstrualPhase.phase === 'period') menstrualProbability = 0.5;
  else if (menstrualPhase.phase === 'ovulation') menstrualProbability = 0.4;
  else if (menstrualPhase.phase === 'luteal') menstrualProbability = 0.3;

  if (randomChoice < menstrualProbability) {
    return selectRandomUniqueMessage(MENSTRUAL_MESSAGES[menstrualPhase.phase], lastSentMessages);
  }

  // 2. 날씨 메시지 선택
  if (weatherCategory && randomChoice < (menstrualProbability + 0.25)) {
    return selectRandomUniqueMessage(WEATHER_MESSAGES[weatherCategory], lastSentMessages);
  }

  // 3. 일반 감정/시간대별 메시지 선택
  let selectedCategory;
  if (menstrualPhase.phase === 'period') {
    selectedCategory = (Math.random() < 0.7) ? 'support' : getMessageCategoryByTime(hour);
  } else if (menstrualPhase.phase === 'ovulation') {
    const r = Math.random();
    selectedCategory = (r < 0.6) ? 'love' : (r < 0.8) ? 'playful' : getMessageCategoryByTime(hour);
  } else {
    const r = Math.random();
    selectedCategory = (r < 0.4) ? getMessageCategoryByTime(hour) : (r < 0.6) ? 'love' : (r < 0.8) ? 'playful' : 'support';
  }
  
  return selectRandomUniqueMessage(EMOTION_MESSAGES[selectedCategory], lastSentMessages);
}

// ==================== ⏰ 스케줄러 ====================

// 자정 초기화
schedule.scheduleJob('0 0 * * *', { timezone: 'Asia/Tokyo' }, () => {
  sentTimestamps = [];
  lastSentMessages = [];
  console.log('🔄 자정 초기화: 예진이 감정 메시지 카운터가 리셋되었습니다.');
});

// 5분마다 실행되는 메인 스케줄러
schedule.scheduleJob('*/5 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();

  if (sentTimestamps.length >= DAILY_LIMIT) return;
  if (!((hour >= 9 && hour < 24) || (hour >= 0 && hour < 3))) return;

  const menstrualPhase = getCurrentMenstrualPhase();
  let sendProbability = 0.25; // 기본 확률

  // 시간대별 확률 조정
  if (hour >= 12 && hour < 17) sendProbability = 0.35;
  if (hour >= 19 && hour < 22) sendProbability = 0.4;

  // 생리주기별 확률 조정
  if (menstrualPhase.phase === 'period') sendProbability *= 1.2;
  else if (menstrualPhase.phase === 'ovulation') sendProbability *= 1.3;
  else if (menstrualPhase.phase === 'luteal') sendProbability *= 1.1;

  if (Math.random() > sendProbability) return;

  try {
    const msg = await getRandomMessage();
    if (!USER_ID) {
      console.error('❌ 전송 실패: USER_ID가 설정되지 않았습니다. .env 파일을 확인하세요.');
      return;
    }
    
    await client.pushMessage(USER_ID, { type: 'text', text: msg });

    const currentTimestamp = now.format('HH:mm');
    sentTimestamps.push(currentTimestamp);

    console.log(`💌 [예진이 감정 메시지] ${currentTimestamp} (${menstrualPhase.description}) → ${msg}`);
    console.log(`   (오늘 전송 횟수: ${sentTimestamps.length}/${DAILY_LIMIT})`);

  } catch (err) {
    console.error('❌ 자동 감정 메시지 전송 오류:', err.response ? err.response.data : err.message);
  }
});

// ==================== 📤 외부 노출 함수 ====================

function getStats() {
  return {
    todaySentCount: sentTimestamps.length,
    dailyLimit: DAILY_LIMIT,
    recentMessages: lastSentMessages.slice(-5),
    currentWeather: currentWeather,
    menstrualPhase: getCurrentMenstrualPhase(),
  };
}

module.exports = {
  getStats
};

console.log('💖 예진이 자동 감정 메시지 스케줄러가 시작되었습니다.');
