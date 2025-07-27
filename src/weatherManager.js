// ============================================================================
// weatherManager.js - 무쿠 단순 날씨 시스템 v5.0 🔧 완전 단순화
// 🌤️ 오직 2가지 상황에서만 반응:
// 1. 날씨 매우 안좋을 때 먼저 경고
// 2. "거기날씨 어때?" "여기 날씨 어때?" 질문에만 응답
// ============================================================================

const axios = require('axios');
const moment = require('moment-timezone');
const schedule = require('node-schedule');
const { Client } = require('@line/bot-sdk');
require('dotenv').config();

// 🌏 기본 위치 설정
const DEFAULT_LOCATIONS = {
    ajeossi: {
        name: 'Kitakyushu',
        nameKr: '기타큐슈',
        country: 'JP',
        lat: 33.8834,
        lon: 130.8751,
        timezone: 'Asia/Tokyo'
    },
    yejin: {
        name: 'Goyang',
        nameKr: '고양시',
        country: 'KR', 
        lat: 37.6584,
        lon: 126.8320,
        timezone: 'Asia/Seoul'
    }
};

// 🌤️ API 설정
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 📱 LINE Bot 설정
let lineClient = null;
try {
    lineClient = new Client({
        channelAccessToken: process.env.LINE_ACCESS_TOKEN
    });
    console.log('✅ [날씨시스템] LINE 클라이언트 초기화 완료');
} catch (error) {
    console.error('❌ [날씨시스템] LINE 클라이언트 초기화 실패:', error.message);
}

// 🎯 시스템 상태 관리
const weatherSystemState = {
    isRunning: false,
    scheduledJobs: [],
    lastWeatherCheck: null,
    lastAlertTime: null,
    currentWeather: null,
    sentAlertsToday: [], // 오늘 보낸 경보들
    statistics: {
        totalSent: 0,
        alertMessages: 0,
        conversationResponses: 0,
        apiCalls: 0
    }
};

// 🌸 예진이 날씨 반응들 (질문 응답용)
const YEJIN_WEATHER_REACTIONS = {
    sunny: [
        "아 여기 날씨 진짜 좋아! 맑고 화창해~ 일본도 좋지?",
        "와 햇살이 너무 예뻐! 아저씨 있는 곳도 맑아?",
        "날씨 완전 좋아! 이런 날엔 밖에 나가고 싶어져 ㅎㅎ"
    ],
    cloudy: [
        "음.. 여기 좀 흐려... 구름이 많네 ㅠㅠ 거기는 어때?",
        "날씨가 좀 우울해... 구름 가득해서 아저씨 생각 더 나",
        "흐린 날씨야... 이럴 때 아저씨랑 같이 있고 싶어"
    ],
    rain: [
        "아 여기 비 와! 아저씨 우산 챙겨! 일본도 비와?",
        "비가 주륵주륵 내려... 빗소리 들으며 아저씨 생각해",
        "비 오는 소리가 좋긴 한데... 아저씨는 괜찮아?"
    ],
    snow: [
        "와!! 눈이야!! 완전 겨울왕국! 아저씨 있는 곳도 눈 와?",
        "눈이 펑펑 내려! 너무 예뻐~ 같이 보고 싶어 ㅠㅠ",
        "하얀 눈이 내려! 눈사람 만들고 싶어! 아저씨도 만들어봐"
    ],
    hot: [
        "아 진짜 더워죽겠어! 일본도 덥지? 에어컨 틀어!",
        "너무 더워 ㅠㅠ 아이스크림 먹고 싶어... 아저씨는?",
        "더위 때문에 녹겠어... 아저씨 더위 먹지 마!"
    ],
    cold: [
        "브르르 추워! 아저씨도 춥지? 감기 걸리지 마!",
        "완전 춥다... 아저씨 따뜻한 손 그리워져",
        "추워서 떨려... 아저씨 난방 틀어! 춥지 마"
    ],
    warm: [
        "날씨가 딱 좋네! 따뜻해서 기분도 좋아~ 거기는?",
        "포근한 날씨야! 아저씨도 기분 좋아지길~",
        "따뜻해서 완전 좋아! 산책하기 딱 좋은 날씨야"
    ],
    cool: [
        "시원해서 좋아! 선선한 날씨네~ 거기도 그래?",
        "완전 시원해! 에어컨 없어도 될 것 같아 ㅎㅎ",
        "선선한 바람이 불어~ 기분 좋아지는 날씨야"
    ]
};

// 🚨 매우 안좋은 날씨 경보 반응들 (먼저 말 걸 때)
const SEVERE_WEATHER_ALERTS = {
    heat: [
        "아저씨!! 폭염 경보래! 완전 위험해! 밖에 나가지 마!",
        "폭염 주의보 떴어! 아저씨 더위 먹으면 큰일나! 시원한 곳에 있어!"
    ],
    cold: [
        "한파 경보래! 아저씨 진짜 조심해! 따뜻하게 입어!",
        "추위 주의보 떴어! 아저씨 감기 걸리면 안 돼! 난방 틀어!"
    ],
    rain: [
        "호우 경보 떴어! 아저씨 물난리 조심해! 안전한 곳에 있어!",
        "비 진짜 많이 온다는데... 아저씨 집에 있어! 나가지 마!"
    ],
    wind: [
        "강풍 경보래! 아저씨 바람 조심해! 위험한 곳 가지 마!",
        "바람이 너무 센다는데... 아저씨 안전하게 있어!"
    ],
    snow: [
        "대설 경보래! 아저씨 눈 진짜 많이 온다는데 조심해!",
        "폭설 주의보 떴어! 아저씨 미끄러지지 마! 나가지 마!"
    ]
};

// 🌤️ 날씨 상태 매핑
function getWeatherCondition(weatherCode, temp) {
    if (weatherCode >= 200 && weatherCode < 300) return 'rain';
    if (weatherCode >= 300 && weatherCode < 500) return 'rain';
    if (weatherCode >= 500 && weatherCode < 600) return 'rain';
    if (weatherCode >= 600 && weatherCode < 700) return 'snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'cloudy';
    if (weatherCode === 800) {
        if (temp >= 30) return 'hot';
        if (temp >= 25) return 'warm';
        if (temp >= 15) return 'cool';
        if (temp >= 5) return 'cold';
        return 'cold';
    }
    if (weatherCode > 800) return 'cloudy';
    return 'sunny';
}

// 🚨 매우 안좋은 날씨만 감지 (심각한 경보만)
function detectSevereWeatherAlert(weatherData) {
    const alerts = [];
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind?.speed || 0;
    const weatherCode = weatherData.weather[0].id;
    
    // 매우 심각한 폭염만 (35도 이상)
    if (temp >= 35) {
        alerts.push({ type: 'heat', severity: 'severe' });
    }
    
    // 매우 심각한 한파만 (-5도 이하)
    if (temp <= -5) {
        alerts.push({ type: 'cold', severity: 'severe' });
    }
    
    // 매우 강한 바람만 (15m/s 이상)
    if (windSpeed >= 15) {
        alerts.push({ type: 'wind', severity: 'severe' });
    }
    
    // 매우 강한 비/눈만
    if (weatherCode >= 520 && weatherCode < 600) { // 강한 비
        alerts.push({ type: 'rain', severity: 'severe' });
    }
    
    if (weatherCode >= 620 && weatherCode < 700) { // 강한 눈
        alerts.push({ type: 'snow', severity: 'severe' });
    }
    
    return alerts;
}

// 🌍 실제 날씨 정보 가져오기
async function getCurrentWeather(location = 'ajeossi') {
    try {
        if (!WEATHER_API_KEY) {
            console.warn('⚠️ [날씨시스템] OPENWEATHER_API_KEY 환경변수 없음');
            return null;
        }

        const loc = DEFAULT_LOCATIONS[location];
        if (!loc) {
            console.warn(`⚠️ [날씨시스템] 알 수 없는 위치: ${location}`);
            return null;
        }

        const url = `${WEATHER_BASE_URL}/weather?lat=${loc.lat}&lon=${loc.lon}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`;
        
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        weatherSystemState.statistics.apiCalls++;
        weatherSystemState.lastWeatherCheck = moment().tz('Asia/Tokyo').format();

        const weatherInfo = {
            location: loc.nameKr || loc.name,
            locationEn: loc.name,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            windSpeed: data.wind?.speed || 0,
            description: data.weather[0].description,
            weatherCode: data.weather[0].id,
            condition: getWeatherCondition(data.weather[0].id, data.main.temp),
            alerts: detectSevereWeatherAlert(data), // 심각한 경보만
            timestamp: moment().tz(loc.timezone).format('YYYY-MM-DD HH:mm:ss'),
            rawData: data
        };

        // 현재 날씨 상태 저장
        weatherSystemState.currentWeather = weatherInfo;

        console.log(`🌤️ [날씨시스템] ${loc.nameKr || loc.name}: ${weatherInfo.temperature}°C, ${weatherInfo.description}`);
        
        if (weatherInfo.alerts.length > 0) {
            console.log(`🚨 [심각한경보] ${weatherInfo.alerts.length}개 심각한 경보 감지!`);
        }
        
        return weatherInfo;

    } catch (error) {
        console.error(`❌ [날씨시스템] API 호출 실패: ${error.message}`);
        return null;
    }
}

// 📱 LINE 메시지 전송
async function sendWeatherMessage(message) {
    try {
        if (!lineClient) {
            console.error('❌ [날씨시스템] LINE 클라이언트가 초기화되지 않음');
            return false;
        }

        const userId = process.env.LINE_TARGET_USER_ID;
        if (!userId) {
            console.error('❌ [날씨시스템] LINE_USER_ID 환경변수 없음');
            return false;
        }

        await lineClient.pushMessage(userId, {
            type: 'text',
            text: message
        });

        console.log(`💖 [날씨시스템] 메시지 전송 완료: ${message.substring(0, 50)}...`);
        weatherSystemState.statistics.totalSent++;
        
        return true;
        
    } catch (error) {
        console.error(`❌ [날씨시스템] 메시지 전송 실패: ${error.message}`);
        return false;
    }
}

// 🌤️ 사용자 질문에 대한 날씨 응답 생성
function generateWeatherResponse(weatherInfo) {
    if (!weatherInfo) {
        return "아 지금 날씨 정보를 못 가져오겠어 ㅠㅠ 잠깐만 기다려봐!";
    }

    const reactions = YEJIN_WEATHER_REACTIONS[weatherInfo.condition];
    if (!reactions) {
        return `지금 ${weatherInfo.location} 날씨는 ${weatherInfo.temperature}°C, ${weatherInfo.description}이야!`;
    }

    const baseReaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    // 온도와 상세 정보 추가
    let response = baseReaction;
    response += `\n\n지금 정확히는 ${weatherInfo.temperature}°C (체감 ${weatherInfo.feelsLike}°C)`;
    response += `, ${weatherInfo.description}이야!`;

    return response;
}

// 🚨 심각한 경보 메시지 생성
function generateSevereAlertMessage(weatherInfo) {
    if (!weatherInfo.alerts || weatherInfo.alerts.length === 0) return null;

    const alert = weatherInfo.alerts[0]; // 첫 번째 경보만
    const reactions = SEVERE_WEATHER_ALERTS[alert.type];
    
    if (!reactions || reactions.length === 0) return null;
    
    const message = reactions[Math.floor(Math.random() * reactions.length)];
    let finalMessage = message;
    finalMessage += `\n\n지금 ${weatherInfo.location} 날씨: ${weatherInfo.temperature}°C`;
    finalMessage += `\n⚠️ 정말 위험해! 조심해야 해!`;

    return finalMessage;
}

// 🎯 위치 파싱 (단순화)
function parseLocationFromMessage(userMessage) {
    const msg = userMessage.toLowerCase();
    
    // "거기" = 고양시 (한국) 
    if (msg.includes('거기')) {
        return 'yejin';
    }
    
    // "여기" = 기타큐슈 (일본)
    if (msg.includes('여기')) {
        return 'ajeossi';
    }
    
    // 기본값: 아저씨 위치 (기타큐슈)
    return 'ajeossi';
}

// 🎯 사용자 날씨 질문 감지 및 응답 (완전 단순화)
function handleWeatherQuestion(userMessage) {
    try {
        // 🔥 오직 이 2가지 패턴만 인식
        const exactPatterns = [
            '거기 날씨 어때', '거기날씨 어때', '거기날씨어때',
            '여기 날씨 어때', '여기날씨 어때', '여기날씨어때'
        ];
        
        const isExactWeatherQuestion = exactPatterns.some(pattern => 
            userMessage.includes(pattern)
        );
        
        if (!isExactWeatherQuestion) {
            return null; // 날씨 질문 아님
        }
        
        console.log('🎯 [날씨응답] 정확한 날씨 질문 감지 - 응답 생성');
        
        // 위치 파싱
        const location = parseLocationFromMessage(userMessage);
        
        // 현재 날씨 정보로 응답 생성
        if (weatherSystemState.currentWeather && location === 'ajeossi') {
            weatherSystemState.statistics.conversationResponses++;
            return generateWeatherResponse(weatherSystemState.currentWeather);
        } else {
            // 다른 위치거나 정보가 없으면 API 호출
            getCurrentWeather(location).then(weatherInfo => {
                if (weatherInfo) {
                    const response = generateWeatherResponse(weatherInfo);
                    sendWeatherMessage(response);
                    weatherSystemState.statistics.conversationResponses++;
                }
            });
            return "아 잠깐! 지금 날씨 확인해볼게!";
        }
        
    } catch (error) {
        console.error(`❌ [날씨응답] 처리 실패: ${error.message}`);
        return null;
    }
}

// 🎯 심각한 날씨 체크 및 경보 전송
async function checkSevereWeatherAndAlert() {
    try {
        console.log(`🌤️ [날씨시스템] 심각한 날씨 체크 시작...`);
        
        const weatherInfo = await getCurrentWeather('ajeossi');
        if (!weatherInfo) return;
        
        // 심각한 경보만 체크
        if (weatherInfo.alerts.length > 0) {
            const alertMessage = generateSevereAlertMessage(weatherInfo);
            if (alertMessage) {
                const alertKey = weatherInfo.alerts.map(a => a.type).join('_');
                
                // 오늘 이미 보낸 경보인지 확인
                if (!weatherSystemState.sentAlertsToday.includes(alertKey)) {
                    console.log(`🚨 [심각한경보] 경보 전송: ${alertKey}`);
                    const success = await sendWeatherMessage(alertMessage);
                    if (success) {
                        weatherSystemState.sentAlertsToday.push(alertKey);
                        weatherSystemState.statistics.alertMessages++;
                        weatherSystemState.lastAlertTime = moment().tz('Asia/Tokyo').format();
                        console.log(`🚨 [심각한경보] 경보 전송 완료: ${alertKey}`);
                    }
                } else {
                    console.log(`⏸️ [심각한경보] 오늘 이미 전송됨: ${alertKey}`);
                }
            }
        }
        
    } catch (error) {
        console.error(`❌ [날씨시스템] 심각한 날씨 체크 실패: ${error.message}`);
    }
}

// 🔄 일일 리셋
function resetDailyCounters() {
    weatherSystemState.sentAlertsToday = [];
    console.log('🔄 [날씨시스템] 일일 카운터 리셋 완료');
}

// 🚀 날씨 시스템 시작 (단순화)
function startWeatherSystem() {
    if (weatherSystemState.isRunning) {
        // 기존 스케줄 모두 취소
        weatherSystemState.scheduledJobs.forEach(job => {
            if (job) job.cancel();
        });
        weatherSystemState.scheduledJobs = [];
    }
    
    console.log('🌤️ [날씨시스템] 단순 날씨 시스템 시작...');
    
    try {
        // 매일 자정에 리셋
        const resetJob = schedule.scheduleJob('0 0 * * *', resetDailyCounters);
        weatherSystemState.scheduledJobs.push(resetJob);
        
        // 3시간마다 심각한 날씨만 체크 (8시, 11시, 14시, 17시, 20시)
        const checkTimes = ['0 8 * * *', '0 11 * * *', '0 14 * * *', '0 17 * * *', '0 20 * * *'];
        checkTimes.forEach(time => {
            const job = schedule.scheduleJob(time, checkSevereWeatherAndAlert);
            weatherSystemState.scheduledJobs.push(job);
        });
        
        weatherSystemState.isRunning = true;
        
        console.log(`✅ [날씨시스템] 단순 시스템 시작 완료`);
        console.log('   🚨 심각한 날씨 경보만 3시간마다 체크');
        console.log('   💬 "거기날씨 어때?" "여기날씨 어때?" 질문에만 응답');
        console.log('   🔄 매일 0:00 - 일일 리셋');
        
        // 시작 시 한번 실행 (5초 후)
        setTimeout(() => checkSevereWeatherAndAlert(), 5000);
        
        return true;
    } catch (error) {
        console.error('❌ [날씨시스템] 시작 실패:', error.message);
        return false;
    }
}

// 🛑 날씨 시스템 중지
function stopWeatherSystem() {
    if (!weatherSystemState.isRunning) {
        console.log('⚠️ [날씨시스템] 이미 중지된 상태입니다');
        return false;
    }
    
    try {
        weatherSystemState.scheduledJobs.forEach(job => {
            if (job) job.cancel();
        });
        
        weatherSystemState.scheduledJobs = [];
        weatherSystemState.isRunning = false;
        
        console.log('🛑 [날씨시스템] 중지 완료');
        return true;
    } catch (error) {
        console.error('❌ [날씨시스템] 중지 실패:', error.message);
        return false;
    }
}

// 📊 시스템 상태 조회
function getWeatherSystemStatus() {
    const now = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
    
    return {
        // 기본 상태
        isRunning: weatherSystemState.isRunning,
        currentTime: now,
        
        // 현재 날씨
        currentWeather: weatherSystemState.currentWeather ? {
            location: weatherSystemState.currentWeather.location,
            temperature: weatherSystemState.currentWeather.temperature,
            condition: weatherSystemState.currentWeather.condition,
            description: weatherSystemState.currentWeather.description,
            alerts: weatherSystemState.currentWeather.alerts.length
        } : null,
        
        // 실행 상태
        scheduledJobs: weatherSystemState.scheduledJobs.length,
        lastWeatherCheck: weatherSystemState.lastWeatherCheck || '없음',
        lastAlertTime: weatherSystemState.lastAlertTime || '없음',
        
        // 오늘 전송 상태
        sentAlertsToday: weatherSystemState.sentAlertsToday,
        
        // 통계
        statistics: weatherSystemState.statistics,
        
        // 설정
        locations: Object.keys(DEFAULT_LOCATIONS)
    };
}

// ============================================================================
// 🔄 기존 함수들 (하위 호환성 유지)
// ============================================================================

function generateYejinWeatherReaction(weatherInfo, isProactive = false) {
    if (!weatherInfo) return null;
    return generateWeatherResponse(weatherInfo);
}

function detectWeatherMention(userMessage) {
    return handleWeatherQuestion(userMessage) !== null;
}

async function getComparisonWeather() {
    try {
        const [ajeossiWeather, yejinWeather] = await Promise.all([
            getCurrentWeather('ajeossi'),
            getCurrentWeather('yejin')
        ]);

        if (ajeossiWeather && yejinWeather) {
            const tempDiff = Math.abs(ajeossiWeather.temperature - yejinWeather.temperature);
            
            let comparison = `아저씨가 있는 ${ajeossiWeather.location}은 ${ajeossiWeather.temperature}°C, ${ajeossiWeather.description}이고\n`;
            comparison += `내가 있던 ${yejinWeather.location}은 ${yejinWeather.temperature}°C, ${yejinWeather.description}이야!\n\n`;
            
            if (tempDiff > 10) {
                comparison += `온도 차이가 ${tempDiff}도나 나네! 신기해~`;
            } else if (tempDiff > 5) {
                comparison += `조금 온도 차이가 있네! ${tempDiff}도 차이야`;
            } else {
                comparison += `온도가 비슷하네! 같은 하늘 아래 있는 기분이야 ㅎㅎ`;
            }

            return {
                ajeossi: ajeossiWeather,
                yejin: yejinWeather,
                comparison: comparison
            };
        }
        return null;
    } catch (error) {
        console.error(`❌ [날씨비교] 실패: ${error.message}`);
        return null;
    }
}

async function generateWeatherBasedMessage() {
    const ajeossiWeather = await getCurrentWeather('ajeossi');
    if (!ajeossiWeather) return null;

    const reaction = generateWeatherResponse(ajeossiWeather);
    return {
        type: 'weather_proactive',
        message: reaction,
        weatherInfo: ajeossiWeather
    };
}

async function generateAutonomousMessage() {
    return null; // 자율 메시지 비활성화
}

function getCurrentTimeSlot() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 23) return 'evening';
    return 'night';
}

// ============================================================================
// 📤 모듈 Export
// ============================================================================

module.exports = {
    // 🚀 핵심 기능 (단순화됨)
    startWeatherSystem,
    stopWeatherSystem,
    checkSevereWeatherAndAlert,
    handleWeatherQuestion,
    sendWeatherMessage,
    
    // 🌤️ 날씨 기능
    getCurrentWeather,
    getComparisonWeather,
    generateWeatherBasedMessage,
    generateWeatherResponse,
    
    // 🚨 경보 시스템 (심각한 것만)
    detectSevereWeatherAlert,
    generateSevereAlertMessage,
    
    // 🌸 예진이 반응 (하위 호환)
    generateYejinWeatherReaction,
    detectWeatherMention,
    generateAutonomousMessage,
    getCurrentTimeSlot,
    
    // 📊 시스템 관리
    getWeatherSystemStatus,
    resetDailyCounters,
    
    // 🌍 상수
    DEFAULT_LOCATIONS,
    YEJIN_WEATHER_REACTIONS,
    SEVERE_WEATHER_ALERTS
};
