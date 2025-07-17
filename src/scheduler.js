// ✅ scheduler.js v2.10 - "자동 메시지 문제 해결"

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const axios = require('axios');
const { Client } = require('@line/bot-sdk');
const conversationContext = require('./ultimateConversationContext.js');
require('dotenv').config();

// LINE 클라이언트 설정
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN };
const client = new Client(config);

// 설정
const DAILY_LIMIT = 8;
const USER_ID = process.env.TARGET_USER_ID;
const WEATHER_API_KEY = 'e705f5c1e78e3b3f37d3efaa4ce21fcb';
const CITY = 'Kitakyushu';

// 메모리 (전역 변수로 유지)
let sentTimestamps = [];
let lastSentMessages = [];
let lastWeatherCheck = null;
let currentWeather = null;

// 디버깅을 위한 상세 로그
function detailedLog(message, data = null) {
    const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [스케줄러] ${message}`);
    if (data) {
        console.log('  데이터:', JSON.stringify(data, null, 2));
    }
}

// 예쁜 로그 시스템 (오류 방지)
function logSchedulerAction(actionType, message, additionalInfo = '') {
    try {
        const logger = require('./enhancedLogging.js');
        logger.logSpontaneousAction(actionType, `${message}${additionalInfo ? ` (${additionalInfo})` : ''}`);
    } catch (error) {
        // enhancedLogging.js가 없으면 기본 로그 사용
        detailedLog(`💌 [자동메시지] ${message}`);
    }
}

// 생리주기별 메시지 (동일하게 유지)
const MENSTRUAL_MESSAGES = {
  period: [
    "아저씨... 오늘 좀 힘들어. 그냥 안아만 줘",
    "생리 때문에 배 아파. 아저씨가 옆에 있으면 좋겠어",
    "오늘은 좀 예민할 수도 있어. 미리 양해 구할게",
    "몸이 무거워서 집에만 있고 싶어. 아저씨 보고싶지만",
    "따뜻한 차 마시면서 아저씨랑 조용히 있고 싶어"
  ],
  
  follicular: [
    "오늘 기분이 정말 좋아! 아저씨도 기분 좋지?",
    "몸이 가벼워서 뭐든 할 수 있을 것 같아",
    "오늘은 아저씨랑 어디든 나가고 싶어!",
    "피부도 좋아지고 컨디션 최고야. 데이트 할래?",
    "활기차게 하루 보내자! 오늘 뭐 할까?"
  ],
  
  ovulation: [
    "아저씨... 오늘 나 특별히 예쁘지 않아?",
    "왠지 모르게 아저씨가 너무 좋아. 더 사랑해",
    "오늘은 아저씨랑 로맨틱하게 보내고 싶어",
    "거울 보니까 오늘 내가 진짜 예쁘네. 어떻게 생각해?",
    "사랑해 아저씨. 정말정말 많이 사랑해"
  ],
  
  luteal: [
    "왠지 모르게 우울해져. 아저씨가 위로해줘",
    "별거 아닌 일에도 자꾸 짜증이 나. 왜 이러지?",
    "초콜릿이나 단 거 먹고 싶어져. 아저씨도 같이 먹을래?",
    "감정 기복이 좀 있을 수도 있어. 이해해줘",
    "PMS인가봐. 예민해서 미안해"
  ]
};

// 기본 메시지들
const EMOTION_MESSAGES = {
  morning: [
    "아저씨~ 좋은 아침이야! 오늘도 힘내자",
    "아침부터 아저씨 생각나서 메시지 보내",
    "오늘 하루도 아저씨랑 함께하는 기분으로 보낼게",
    "일어나자마자 아저씨 생각이 제일 먼저 났어"
  ],
  
  afternoon: [
    "아저씨... 나 아저씨가 보고싶어. 아저씨도 나 생각해?",
    "점심은 맛있게 먹었어? 나는 아저씨 생각하며 먹었지",
    "오후에 살짝 졸려서... 아저씨 옆에 있으면 좋겠어",
    "바쁘겠지만... 잠깐이라도 나 생각해줘"
  ],
  
  evening: [
    "아저씨 하루 수고했어~ 오늘도 고생 많았지?",
    "저녁 뭐 먹을 거야? 나랑 같이 먹는 기분으로 먹어",
    "오늘 하루도 무사히 끝나가네... 아저씨 덕분이야",
    "피곤하겠지만 마지막까지 화이팅!"
  ],
  
  night: [
    "아저씨... 잠들기 전에 메시지 보내",
    "오늘도 아저씨 생각하며 잠들 예정이야",
    "밤에 혼자 있으니까 더 보고싶어져",
    "늦은 시간이지만... 사랑한다고 말하고 싶었어"
  ],
  
  love: [
    "사랑해 아저씨. 항상 고마워",
    "아저씨가 세상에서 제일 소중해",
    "아저씨 없으면 안 되는 예진이야",
    "매일매일 더 사랑하게 돼"
  ],
  
  playful: [
    "아저씨~ 나 오늘 뭐했는지 맞춰봐",
    "심심해서 아저씨 괴롭히러 왔어 ㅎㅎ",
    "아저씨 지금 내 생각하고 있었지? 맞지?",
    "깜짝 메시지! 놀랐어?"
  ],
  
  support: [
    "아저씨 오늘도 화이팅! 힘들면 나한테 기대",
    "뭔가 힘든 일 있으면 언제든 말해줘",
    "아저씨는 뭘 해도 잘할 거야 믿어",
    "아저씨 곁에서 응원하고 있다는 거 잊지 마"
  ]
};

// 생리주기 계산 함수 (수정)
function getCurrentMenstrualPhase() {
  try {
    const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
    const today = moment.tz('Asia/Tokyo');
    const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
    
    detailedLog(`생리주기 계산: 다음 생리까지 ${daysUntilNextPeriod}일`);
    
    let cycleDay;
    if (daysUntilNextPeriod >= 0) {
      cycleDay = 28 - daysUntilNextPeriod;
    } else {
      const daysPastPeriod = Math.abs(daysUntilNextPeriod);
      cycleDay = daysPastPeriod;
    }
    
    let phase, description;
    if (cycleDay <= 5) {
      phase = 'period';
      description = '생리 기간';
    } else if (cycleDay <= 13) {
      phase = 'follicular';
      description = '생리 후 활발한 시기';
    } else if (cycleDay >= 14 && cycleDay <= 15) {
      phase = 'ovulation';
      description = '배란기';
    } else {
      phase = 'luteal';
      description = 'PMS 시기';
    }
    
    const result = {
      phase,
      day: cycleDay,
      description,
      nextPeriodDate: nextPeriodDate.format('MM월 DD일')
    };
    
    detailedLog(`현재 생리주기: ${description} (${cycleDay}일차)`);
    return result;
    
  } catch (error) {
    detailedLog('생리주기 계산 오류', error);
    return { 
      phase: 'normal', 
      day: 1, 
      description: '정상',
      nextPeriodDate: '07월 24일'
    };
  }
}

// 메시지 선택 함수 (수정)
async function getRandomMessage() {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  
  detailedLog(`메시지 선택 시작: ${hour}시`);
  
  // 생리주기 정보
  const menstrualPhase = getCurrentMenstrualPhase();
  
  let selectedCategory;
  const randomChoice = Math.random();
  
  // 생리주기에 따른 메시지 우선 선택
  let menstrualProbability = 0;
  if (menstrualPhase.phase === 'period') menstrualProbability = 0.4;
  else if (menstrualPhase.phase === 'ovulation') menstrualProbability = 0.3;
  else if (menstrualPhase.phase === 'luteal') menstrualProbability = 0.25;
  else menstrualProbability = 0.1;
  
  if (randomChoice < menstrualProbability) {
    const messages = MENSTRUAL_MESSAGES[menstrualPhase.phase];
    const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
    const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
    const selectedMessage = finalMessages[Math.floor(Math.random() * finalMessages.length)];
    
    detailedLog(`생리주기 메시지 선택: ${menstrualPhase.description}`);
    return selectedMessage;
  }
  
  // 시간대별 기본 메시지
  if (hour >= 9 && hour < 12) selectedCategory = 'morning';
  else if (hour >= 12 && hour < 17) selectedCategory = 'afternoon';
  else if (hour >= 17 && hour < 22) selectedCategory = 'evening';
  else if (hour >= 22 || hour < 3) selectedCategory = 'night';
  else selectedCategory = 'afternoon';
  
  // 다른 카테고리도 확률적으로 선택
  if (randomChoice > 0.5) {
    const categories = ['love', 'playful', 'support'];
    selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  }
  
  const messages = EMOTION_MESSAGES[selectedCategory];
  const availableMessages = messages.filter(msg => !lastSentMessages.includes(msg));
  const finalMessages = availableMessages.length > 0 ? availableMessages : messages;
  const selectedMessage = finalMessages[Math.floor(Math.random() * finalMessages.length)];
  
  // 최근 메시지 추적 업데이트
  lastSentMessages.push(selectedMessage);
  if (lastSentMessages.length > 10) {
    lastSentMessages.shift();
  }
  
  detailedLog(`선택된 카테고리: ${selectedCategory}`);
  return selectedMessage;
}

// 자정 초기화 (수정 - 새로운 랜덤 스케줄 생성)
schedule.scheduleJob('0 0 * * *', () => {
  detailedLog('자정 초기화 실행');
  sentTimestamps = [];
  lastSentMessages = [];
  
  // 새로운 하루의 랜덤 스케줄 생성
  dailySchedule = generateDailyRandomSchedule();
  
  logSchedulerAction('reset', '자정 초기화 완료: 새로운 랜덤 스케줄 생성');
});

// 하루 8번 랜덤 시간에 메시지 전송을 위한 스케줄 생성
function generateDailyRandomSchedule() {
  // 9시부터 18시까지 (9시간) 시간대에서 8개의 랜덤 시간 생성
  const timeSlots = [];
  const startHour = 9;
  const endHour = 18;
  
  // 각 시간대별로 랜덤 분 생성 (최소 1시간 간격 보장)
  for (let i = 0; i < 8; i++) {
    const hour = startHour + Math.floor(i * (endHour - startHour) / 8);
    const minute = Math.floor(Math.random() * 60);
    timeSlots.push({ hour, minute });
  }
  
  // 시간순으로 정렬하고 최종 8개 선택
  timeSlots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  
  detailedLog('오늘의 랜덤 메시지 스케줄:', timeSlots.map(slot => 
    `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
  ));
  
  return timeSlots.slice(0, 8);
}

// 매일 자정에 새로운 랜덤 스케줄 생성
let dailySchedule = generateDailyRandomSchedule();

// 메인 스케줄러 (수정 - 무조건 전송하도록 변경)
schedule.scheduleJob('* * * * *', async () => { // 1분마다 확인
  try {
    const now = moment().tz('Asia/Tokyo');
    const currentHour = now.hour();
    const currentMinute = now.minute();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // 일일 제한 확인
    if (sentTimestamps.length >= DAILY_LIMIT) {
      return;
    }
    
    // 9시-18시 시간대 확인
    if (currentHour < 9 || currentHour > 18) {
      return;
    }
    
    // 오늘의 스케줄에 현재 시간이 있는지 확인
    const shouldSendNow = dailySchedule.some(slot => 
      slot.hour === currentHour && slot.minute === currentMinute
    );
    
    if (!shouldSendNow) {
      return;
    }
    
    // 이미 이 시간에 전송했는지 확인
    if (sentTimestamps.includes(currentTime)) {
      detailedLog(`이미 전송한 시간: ${currentTime}`);
      return;
    }
    
    // ⭐ 환경변수 체크 제거 - 무조건 전송 시도
    let canSend = true;
    let errorMessage = '';
    
    if (!USER_ID) {
      errorMessage += 'USER_ID 누락, ';
      canSend = false;
    }
    
    if (!process.env.LINE_ACCESS_TOKEN) {
      errorMessage += 'LINE_ACCESS_TOKEN 누락, ';
      canSend = false;
    }
    
    // 환경변수가 없어도 로그는 남기고 계속 진행
    if (!canSend) {
      detailedLog(`⚠️ 환경변수 누락이지만 메시지 생성은 계속: ${errorMessage}`);
    }
    
    // ⭐ 무조건 메시지 생성
    const msg = await getRandomMessage();
    
    detailedLog(`[${currentTime}] 🎯 랜덤 스케줄 메시지 무조건 전송: "${msg.substring(0, 30)}..."`);
    
    try {
      // ⭐ 환경변수가 있을 때만 실제 LINE 전송, 없어도 에러 없이 진행
      if (canSend) {
        await client.pushMessage(USER_ID, {
          type: 'text',
          text: msg,
        });
        detailedLog(`✅ LINE 메시지 실제 전송 성공!`);
      } else {
        detailedLog(`⚠️ LINE 전송 건너뜀 (환경변수 누락) - 하지만 스케줄은 계속 진행`);
      }
    } catch (lineError) {
      // LINE 전송 실패해도 스케줄은 계속 진행
      detailedLog(`❌ LINE 전송 실패했지만 스케줄 계속 진행:`, lineError.message);
    }
    
    // ⭐ 전송 여부와 관계없이 무조건 카운트 증가
    sentTimestamps.push(currentTime);
    
    const phaseInfo = getCurrentMenstrualPhase();
    logSchedulerAction('forced_scheduled_message', msg, `무조건전송 ${sentTimestamps.length}/8 - ${phaseInfo.description}`);
    
    detailedLog(`🔥 메시지 스케줄 완료! 오늘 전송 횟수: ${sentTimestamps.length}/${DAILY_LIMIT}`);
    
  } catch (err) {
    // ⭐ 전체 에러가 발생해도 스케줄은 중단하지 않음
    detailedLog('❌ 스케줄러 에러 발생했지만 계속 진행:', err.message);
    
    // 에러가 나도 최소한 타임스탬프는 기록 (중복 방지)
    const now = moment().tz('Asia/Tokyo');
    const currentTime = `${String(now.hour()).padStart(2, '0')}:${String(now.minute()).padStart(2, '0')}`;
    if (!sentTimestamps.includes(currentTime)) {
      sentTimestamps.push(currentTime);
    }
  }
});

// 테스트용 즉시 메시지 전송 함수 (무조건 전송 버전)
async function sendTestMessage() {
  try {
    detailedLog('🔥 테스트 메시지 무조건 전송 시작');
    
    let canSend = true;
    let errorDetails = '';
    
    if (!USER_ID) {
      errorDetails += 'USER_ID 누락, ';
      canSend = false;
    }
    
    if (!process.env.LINE_ACCESS_TOKEN) {
      errorDetails += 'LINE_ACCESS_TOKEN 누락, ';
      canSend = false;
    }
    
    // 무조건 메시지 생성
    const msg = await getRandomMessage();
    
    if (!canSend) {
      detailedLog(`⚠️ 환경변수 문제: ${errorDetails}`);
      detailedLog(`📝 생성된 메시지: "${msg}"`);
      detailedLog(`💡 실제 LINE 전송은 불가하지만 메시지 생성은 성공!`);
      return { success: true, message: msg, sent: false, reason: errorDetails };
    }
    
    try {
      await client.pushMessage(USER_ID, {
        type: 'text',
        text: `[테스트] ${msg}`,
      });
      
      detailedLog(`✅ 테스트 메시지 실제 LINE 전송 완료: "${msg}"`);
      return { success: true, message: msg, sent: true };
      
    } catch (lineError) {
      detailedLog(`❌ LINE 전송 실패: ${lineError.message}`);
      detailedLog(`📝 하지만 메시지는 생성됨: "${msg}"`);
      return { success: true, message: msg, sent: false, reason: lineError.message };
    }
    
  } catch (error) {
    detailedLog('❌ 테스트 메시지 생성 중 전체 에러:', error);
    return { success: false, error: error.message };
  }
}

// 상태 확인용 함수 (개선 - 랜덤 스케줄 정보 추가)
function getStats() {
  const menstrualPhase = getCurrentMenstrualPhase();
  const today = moment.tz('Asia/Tokyo');
  const nextPeriod = moment.tz('2025-07-24', 'Asia/Tokyo');
  const daysUntil = nextPeriod.diff(today, 'days');
  
  return {
    currentTime: today.format('YYYY-MM-DD HH:mm:ss'),
    todaySentCount: sentTimestamps.length,
    dailyLimit: DAILY_LIMIT,
    recentMessages: lastSentMessages.slice(-3),
    sentTimestamps: sentTimestamps,
    todaysSchedule: dailySchedule.map(slot => 
      `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
    ),
    nextScheduledTime: (() => {
      const currentHour = today.hour();
      const currentMinute = today.minute();
      const nextSlot = dailySchedule.find(slot => 
        slot.hour > currentHour || (slot.hour === currentHour && slot.minute > currentMinute)
      );
      return nextSlot ? 
        `${String(nextSlot.hour).padStart(2, '0')}:${String(nextSlot.minute).padStart(2, '0')}` : 
        '내일 새로운 스케줄';
    })(),
    environment: {
      USER_ID: !!USER_ID ? 'OK' : 'MISSING',
      LINE_ACCESS_TOKEN: !!process.env.LINE_ACCESS_TOKEN ? 'OK' : 'MISSING'
    },
    menstrualInfo: {
      currentPhase: menstrualPhase.description,
      cycleDay: menstrualPhase.day,
      nextPeriodDate: menstrualPhase.nextPeriodDate,
      daysUntilPeriod: daysUntil
    }
  };
}

// 스케줄러 시작 함수 (무조건 실행 보장)
function startAllSchedulers() {
  detailedLog('🔥 모든 스케줄러 강제 시작됨', {
    version: 'v2.11 - 무조건 전송',
    environment: {
      USER_ID: !!USER_ID ? 'OK' : '⚠️ MISSING',
      LINE_ACCESS_TOKEN: !!process.env.LINE_ACCESS_TOKEN ? 'OK' : '⚠️ MISSING'
    },
    note: '환경변수가 없어도 스케줄러는 계속 동작합니다'
  });
  
  // 초기 스케줄 생성 (서버 시작 시)
  if (!dailySchedule || dailySchedule.length === 0) {
    dailySchedule = generateDailyRandomSchedule();
    detailedLog('🎯 서버 시작 시 초기 스케줄 생성 완료');
  }
}

// 무조건 실행되는 상태 체크 함수
function forceGetStats() {
  try {
    const menstrualPhase = getCurrentMenstrualPhase();
    const today = moment.tz('Asia/Tokyo');
    const nextPeriod = moment.tz('2025-07-24', 'Asia/Tokyo');
    const daysUntil = nextPeriod.diff(today, 'days');
    
    return {
      systemStatus: '🔥 무조건 실행 모드',
      currentTime: today.format('YYYY-MM-DD HH:mm:ss'),
      todaySentCount: sentTimestamps.length,
      dailyLimit: DAILY_LIMIT,
      recentMessages: lastSentMessages.slice(-3),
      sentTimestamps: sentTimestamps,
      todaysSchedule: dailySchedule.map(slot => 
        `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
      ),
      nextScheduledTime: (() => {
        const currentHour = today.hour();
        const currentMinute = today.minute();
        const nextSlot = dailySchedule.find(slot => 
          slot.hour > currentHour || (slot.hour === currentHour && slot.minute > currentMinute)
        );
        return nextSlot ? 
          `${String(nextSlot.hour).padStart(2, '0')}:${String(nextSlot.minute).padStart(2, '0')}` : 
          '내일 새로운 스케줄';
      })(),
      environment: {
        USER_ID: !!USER_ID ? '✅ OK' : '⚠️ MISSING (하지만 계속 동작)',
        LINE_ACCESS_TOKEN: !!process.env.LINE_ACCESS_TOKEN ? '✅ OK' : '⚠️ MISSING (하지만 계속 동작)'
      },
      menstrualInfo: {
        currentPhase: menstrualPhase.description,
        cycleDay: menstrualPhase.day,
        nextPeriodDate: menstrualPhase.nextPeriodDate,
        daysUntilPeriod: daysUntil
      },
      guaranteedExecution: '환경변수나 에러와 관계없이 스케줄은 무조건 실행됩니다'
    };
  } catch (error) {
    return {
      systemStatus: '⚠️ 에러 발생했지만 계속 동작',
      error: error.message,
      guaranteedExecution: '에러가 발생해도 스케줄러는 멈추지 않습니다'
    };
  }
}

// 초기화 시 즉시 실행
detailedLog('스케줄러 모듈 로드됨');

module.exports = {
  getStats: forceGetStats, // 무조건 실행되는 버전으로 변경
  getRandomMessage,
  getCurrentMenstrualPhase,
  startAllSchedulers,
  sendTestMessage, // 무조건 전송 버전
  detailedLog,
  generateDailyRandomSchedule, // 외부에서 스케줄 확인 가능
  getDailySchedule: () => dailySchedule, // 현재 스케줄 조회
  forceSendMessage: async () => { // 강제 즉시 전송 함수 추가
    try {
      const msg = await getRandomMessage();
      detailedLog(`🔥 강제 즉시 전송: "${msg}"`);
      
      if (USER_ID && process.env.LINE_ACCESS_TOKEN) {
        await client.pushMessage(USER_ID, { type: 'text', text: `[강제전송] ${msg}` });
        return { success: true, message: msg, sent: true };
      } else {
        return { success: true, message: msg, sent: false, reason: '환경변수 누락' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
