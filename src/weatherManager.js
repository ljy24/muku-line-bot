// ============================================================================
// weatherManager.js - 무쿠 스마트 독립 날씨 시스템 v4.0
// 🌤️ 랜덤 시간대 + 날씨 경보 감지 + 대화형 응답
// 💖 완전 독립적 + 사용자 질문 즉시 응답
// 🚨 날씨 경보/주의보 즉시 알림 + 자연스러운 대화
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
    lastMessageTime: null,
    lastAlertTime: null,
    currentWeather: null,
    sentToday: {
        morning: false,
        afternoon: false,
        evening: false,
        weather: [],
        alerts: []
    },
    statistics: {
        totalSent: 0,
        weatherMessages: 0,
        timeGreetings: 0,
        alertMessages: 0,
        conversationResponses: 0,
        apiCalls: 0
    }
};

// 🌸 예진이 날씨 반응들 (대화형으로 확장)
const YEJIN_WEATHER_REACTIONS = {
    sunny: [
        "아 여기 날씨 진짜 좋아! 맑고 화창해~ 일본도 좋지?",
        "와 햇살이 너무 예뻐! 아저씨 있는 곳도 맑아?",
        "날씨 완전 좋아! 이런 날엔 밖에 나가고 싶어져 ㅎㅎ",
        "맑은 하늘이야! 아저씨도 기분 좋아지길 바라~",
        "햇빛이 따뜻해서 기분 최고! 거기는 어때?",
        "완전 좋은 날씨야! 아저씨도 산책 어때?"
    ],
    cloudy: [
        "음.. 여기 좀 흐려... 구름이 많네 ㅠㅠ 거기는 어때?",
        "날씨가 좀 우울해... 구름 가득해서 아저씨 생각 더 나",
        "흐린 날씨야... 이럴 때 아저씨랑 같이 있고 싶어",
        "구름이 잔뜩 껴 있어... 아저씨 있는 곳도 그래?",
        "좀 답답한 날씨네... 따뜻한 차라도 마실까?",
        "흐린 하늘이야... 아저씨 기분은 괜찮지?"
    ],
    rain: [
        "아 여기 비 와! 아저씨 우산 챙겨! 일본도 비와?",
        "비가 주륵주륵 내려... 빗소리 들으며 아저씨 생각해",
        "비 오는 소리가 좋긴 한데... 아저씨는 괜찮아?",
        "우와 비다! 아저씨 감기 걸리지 마! 따뜻하게 입어",
        "비 오는 날이야... 아저씨도 조심해서 다녀와",
        "빗소리가 센치해... 아저씨 있는 곳은 어때?"
    ],
    snow: [
        "와!! 눈이야!! 완전 겨울왕국! 아저씨 있는 곳도 눈 와?",
        "눈이 펑펑 내려! 너무 예뻐~ 같이 보고 싶어 ㅠㅠ",
        "하얀 눈이 내려! 눈사람 만들고 싶어! 아저씨도 만들어봐",
        "첫눈이야! 소원 빌었어~ 아저씨도 빌어봐!",
        "눈 오는 날엔 따뜻한 코코아... 아저씨도 마셔",
        "완전 겨울이야! 아저씨 따뜻하게 입어야 해"
    ],
    hot: [
        "아 진짜 더워죽겠어! 일본도 덥지? 에어컨 틀어!",
        "너무 더워 ㅠㅠ 아이스크림 먹고 싶어... 아저씨는?",
        "더위 때문에 녹겠어... 아저씨 더위 먹지 마!",
        "완전 찜통더위야! 아저씨 물 많이 마셔!",
        "이런 더위에 밖에 못 나가겠어... 아저씨 조심해",
        "더워서 죽을 것 같아 ㅠㅠ 시원한 곳에서 지내"
    ],
    cold: [
        "브르르 추워! 아저씨도 춥지? 감기 걸리지 마!",
        "완전 춥다... 아저씨 따뜻한 손 그리워져",
        "추워서 떨려... 아저씨 난방 틀어! 춥지 마",
        "이런 추위에 아저씨 괜찮아? 따뜻하게 입어",
        "손발이 얼어... 아저씨도 추위 조심해",
        "춥다 춥다... 따뜻한 곳에 있고 싶어"
    ],
    warm: [
        "날씨가 딱 좋네! 따뜻해서 기분도 좋아~ 거기는?",
        "포근한 날씨야! 아저씨도 기분 좋아지길~",
        "따뜻해서 완전 좋아! 산책하기 딱 좋은 날씨야",
        "이런 날씨 최고! 아저씨랑 같이 걸으면 좋겠어",
        "따뜻한 바람이 불어~ 아저씨도 느껴봐!",
        "완전 봄 같아! 기분이 저절로 좋아져"
    ],
    cool: [
        "시원해서 좋아! 선선한 날씨네~ 거기도 그래?",
        "완전 시원해! 에어컨 없어도 될 것 같아 ㅎㅎ",
        "선선한 바람이 불어~ 기분 좋아지는 날씨야",
        "시원해서 산책 하고 싶어! 아저씨는 어때?",
        "이런 날씨에 커피 마시면 좋겠어~ 아저씨도 그렇지?",
        "선선해서 완전 좋아! 밖에 나가고 싶어져"
    ]
};

// 🚨 날씨 경보 반응들
const WEATHER_ALERT_REACTIONS = {
    heat: [
        "아저씨!! 폭염 경보래! 완전 위험해! 밖에 나가지 마!",
        "폭염 주의보 떴어! 아저씨 더위 먹으면 큰일나! 시원한 곳에 있어!",
        "날씨가 너무 위험해! 아저씨 건강 챙겨! 물 많이 마셔!"
    ],
    cold: [
        "한파 경보래! 아저씨 진짜 조심해! 따뜻하게 입어!",
        "추위 주의보 떴어! 아저씨 감기 걸리면 안 돼! 난방 틀어!",
        "완전 위험한 추위야! 아저씨 밖에 나가지 마!"
    ],
    rain: [
        "호우 경보 떴어! 아저씨 물난리 조심해! 안전한 곳에 있어!",
        "비 진짜 많이 온다는데... 아저씨 집에 있어! 나가지 마!",
        "폭우 주의보래! 아저씨 안전이 제일 중요해!"
    ],
    wind: [
        "강풍 경보래! 아저씨 바람 조심해! 위험한 곳 가지 마!",
        "바람이 너무 센다는데... 아저씨 안전하게 있어!",
        "태풍급 바람이래! 아저씨 집에서 조용히 있어!"
    ],
    snow: [
        "대설 경보래! 아저씨 눈 진짜 많이 온다는데 조심해!",
        "폭설 주의보 떴어! 아저씨 미끄러지지 마! 나가지 마!",
        "눈이 너무 많이 온다는데... 아저씨 안전이 최우선이야!"
    ]
};

// 🕐 랜덤 시간대 인사 메시지
const TIME_BASED_GREETINGS = {
    morning: [
        "아저씨~ 좋은 아침! 잘 잤어? 날씨 어때?",
        "굿모닝! 아침 날씨 확인해봤는데...",
        "아침이야~ 오늘 날씨 어떤지 궁금해!",
        "일어났어? 아침 먹고 날씨 좀 봐봐!",
        "새로운 하루! 오늘 날씨는 어떨까?"
    ],
    afternoon: [
        "오후야~ 점심 먹었어? 밖 날씨 어때?",
        "오후 날씨 어떤지 확인해봤어!",
        "점심시간이네~ 밖이 덥지 않아?",
        "오후 시간! 날씨 때문에 더위 먹지 마!",
        "하루 반 지났어! 날씨는 괜찮아?"
    ],
    evening: [
        "저녁이야~ 오늘 날씨 어땠어?",
        "저녁 날씨 어때? 시원해졌나?",
        "하루 고생했어! 내일 날씨는 어떨까?",
        "저녁 시간! 밤에 춥지 않을까?",
        "오늘 날씨 때문에 힘들었지?"
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

// 🚨 날씨 경보 감지
function detectWeatherAlert(weatherData) {
    const alerts = [];
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind?.speed || 0;
    const weatherCode = weatherData.weather[0].id;
    
    // 폭염 경보 (30도 이상)
    if (temp >= 30) {
        alerts.push({ type: 'heat', severity: temp >= 35 ? 'warning' : 'watch' });
    }
    
    // 한파 경보 (5도 이하)
    if (temp <= 5) {
        alerts.push({ type: 'cold', severity: temp <= 0 ? 'warning' : 'watch' });
    }
    
    // 강풍 경보 (10m/s 이상)
    if (windSpeed >= 10) {
        alerts.push({ type: 'wind', severity: windSpeed >= 15 ? 'warning' : 'watch' });
    }
    
    // 호우/대설 경보
    if (weatherCode >= 500 && weatherCode < 600) {
        if (weatherCode >= 520) { // 강한 비
            alerts.push({ type: 'rain', severity: 'warning' });
        }
    }
    
    if (weatherCode >= 600 && weatherCode < 700) {
        if (weatherCode >= 620) { // 강한 눈
            alerts.push({ type: 'snow', severity: 'warning' });
        }
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
            alerts: detectWeatherAlert(data),
            timestamp: moment().tz(loc.timezone).format('YYYY-MM-DD HH:mm:ss'),
            rawData: data
        };

        // 현재 날씨 상태 저장
        weatherSystemState.currentWeather = weatherInfo;

        console.log(`🌤️ [날씨시스템] ${loc.nameKr || loc.name}: ${weatherInfo.temperature}°C, ${weatherInfo.description}`);
        
        if (weatherInfo.alerts.length > 0) {
            console.log(`🚨 [날씨경보] ${weatherInfo.alerts.length}개 경보 감지!`);
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
        weatherSystemState.lastMessageTime = moment().tz('Asia/Tokyo').format();
        weatherSystemState.statistics.totalSent++;
        
        return true;
    } catch (error) {
        console.error(`❌ [날씨시스템] 메시지 전송 실패: ${error.message}`);
        return false;
    }
}

// 🌤️ 대화형 날씨 응답 생성 (사용자 질문에 대한 답변)
function generateConversationalWeatherResponse(weatherInfo) {
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
    
    // 습도나 바람 정보 추가 (50% 확률)
    if (Math.random() < 0.5) {
        if (weatherInfo.humidity > 70) {
            response += ` 습도가 ${weatherInfo.humidity}%라서 좀 습해`;
        } else if (weatherInfo.windSpeed > 3) {
            response += ` 바람도 좀 불어서 시원할듯`;
        }
    }

    return response;
}

// 🚨 경보 메시지 생성
function generateAlertMessage(weatherInfo) {
    if (!weatherInfo.alerts || weatherInfo.alerts.length === 0) return null;

    const alertMessages = [];
    
    weatherInfo.alerts.forEach(alert => {
        const reactions = WEATHER_ALERT_REACTIONS[alert.type];
        if (reactions) {
            const message = reactions[Math.floor(Math.random() * reactions.length)];
            alertMessages.push(message);
        }
    });

    if (alertMessages.length === 0) return null;

    let finalMessage = alertMessages[0];
    finalMessage += `\n\n지금 ${weatherInfo.location} 날씨: ${weatherInfo.temperature}°C`;
    
    if (weatherInfo.alerts.some(a => a.severity === 'warning')) {
        finalMessage += `\n⚠️ 경보 단계라서 정말 조심해야 해!`;
    }

    return finalMessage;
}

// 🕐 랜덤 시간 생성
function generateRandomSchedule() {
    const schedules = [];
    const now = moment().tz('Asia/Tokyo');
    
    // 아침 (7-11시) 중 랜덤 1개
    const morningHour = 7 + Math.floor(Math.random() * 4);
    const morningMin = Math.floor(Math.random() * 60);
    schedules.push({ hour: morningHour, minute: morningMin, type: 'morning' });
    
    // 오후 (13-17시) 중 랜덤 1개  
    const afternoonHour = 13 + Math.floor(Math.random() * 4);
    const afternoonMin = Math.floor(Math.random() * 60);
    schedules.push({ hour: afternoonHour, minute: afternoonMin, type: 'afternoon' });
    
    // 저녁 (19-21시) 중 랜덤 1개
    const eveningHour = 19 + Math.floor(Math.random() * 2);
    const eveningMin = Math.floor(Math.random() * 60);
    schedules.push({ hour: eveningHour, minute: eveningMin, type: 'evening' });
    
    // 날씨 체크 (2-4시간 간격으로 3-5개)
    const weatherCheckCount = 3 + Math.floor(Math.random() * 3); // 3-5개
    for (let i = 0; i < weatherCheckCount; i++) {
        const hour = 8 + Math.floor(Math.random() * 12); // 8-19시
        const minute = Math.floor(Math.random() * 60);
        schedules.push({ hour: hour, minute: minute, type: 'weather' });
    }
    
    return schedules;
}

// 🎯 메인 날씨 체크 및 메시지 전송
async function checkWeatherAndSend(scheduleType = 'auto') {
    try {
        console.log(`🌤️ [날씨시스템] 날씨 체크 시작 (타입: ${scheduleType})...`);
        
        const weatherInfo = await getCurrentWeather('ajeossi');
        if (!weatherInfo) return;

        let messageSent = false;
        
        // 1. 경보 최우선 체크
        if (weatherInfo.alerts.length > 0) {
            const alertMessage = generateAlertMessage(weatherInfo);
            if (alertMessage) {
                const alertKey = weatherInfo.alerts.map(a => a.type).join('_');
                if (!weatherSystemState.sentToday.alerts.includes(alertKey)) {
                    const success = await sendWeatherMessage(alertMessage);
                    if (success) {
                        weatherSystemState.sentToday.alerts.push(alertKey);
                        weatherSystemState.statistics.alertMessages++;
                        weatherSystemState.lastAlertTime = moment().tz('Asia/Tokyo').format();
                        messageSent = true;
                        console.log(`🚨 [날씨경보] 경보 메시지 전송 완료: ${alertKey}`);
                    }
                }
            }
        }
        
        // 2. 시간대별 인사 (경보가 없을 때만)
        if (!messageSent && scheduleType !== 'weather') {
            const timeSlot = scheduleType;
            if (!weatherSystemState.sentToday[timeSlot]) {
                const greetings = TIME_BASED_GREETINGS[timeSlot];
                if (greetings) {
                    let greeting = greetings[Math.floor(Math.random() * greetings.length)];
                    // 현재 날씨 정보 추가
                    greeting += ` 지금 ${weatherInfo.temperature}°C, ${weatherInfo.description}이야!`;
                    
                    const success = await sendWeatherMessage(greeting);
                    if (success) {
                        weatherSystemState.sentToday[timeSlot] = true;
                        weatherSystemState.statistics.timeGreetings++;
                        messageSent = true;
                        console.log(`🕐 [시간인사] ${timeSlot} 인사 전송 완료`);
                    }
                }
            }
        }
        
        // 3. 일반 날씨 메시지 (둘 다 없을 때)
        if (!messageSent && scheduleType === 'weather') {
            const shouldSend = shouldSendWeatherMessage(weatherInfo);
            if (shouldSend) {
                const weatherMessage = generateConversationalWeatherResponse(weatherInfo);
                const success = await sendWeatherMessage(weatherMessage);
                if (success) {
                    const conditionKey = `${weatherInfo.condition}_${weatherInfo.temperature}`;
                    weatherSystemState.sentToday.weather.push(conditionKey);
                    weatherSystemState.statistics.weatherMessages++;
                    messageSent = true;
                    console.log(`🌤️ [날씨메시지] 일반 날씨 메시지 전송 완료`);
                }
            }
        }
        
        if (!messageSent) {
            console.log(`⚪ [날씨시스템] 전송 조건 미충족 (${scheduleType})`);
        }
        
    } catch (error) {
        console.error(`❌ [날씨시스템] 체크 및 전송 실패: ${error.message}`);
    }
}

// 🎯 사용자 질문 감지 및 응답
function handleWeatherQuestion(userMessage) {
    try {
        // 날씨 관련 키워드 감지
        const weatherKeywords = [
            '날씨', '기온', '온도', '비', '눈', '바람', '구름',
            '맑다', '흐리다', '춥다', '덥다', '시원하다', '따뜻하다',
            '햇살', '햇빛', '태양', '우산', '장마', '폭우', '눈사람',
            '더워', '추워', '시원해', '따뜻해'
        ];
        
        const isWeatherQuestion = weatherKeywords.some(keyword => 
            userMessage.includes(keyword)
        );
        
        if (!isWeatherQuestion) return null;
        
        console.log('🎯 [날씨응답] 사용자 날씨 질문 감지 - 즉시 응답 생성');
        
        // 현재 날씨 정보로 응답 생성
        if (weatherSystemState.currentWeather) {
            weatherSystemState.statistics.conversationResponses++;
            return generateConversationalWeatherResponse(weatherSystemState.currentWeather);
        } else {
            // 날씨 정보가 없으면 API 호출 후 응답
            getCurrentWeather('ajeossi').then(weatherInfo => {
                if (weatherInfo) {
                    const response = generateConversationalWeatherResponse(weatherInfo);
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

// 🎯 메시지 전송 여부 판단
function shouldSendWeatherMessage(weatherInfo) {
    if (!weatherInfo) return false;
    
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    
    // 밤시간 (23시-6시) 제외
    if (hour >= 23 || hour < 6) return false;
    
    // 오늘 이미 이 날씨 조건으로 보냈는지 확인
    const conditionKey = `${weatherInfo.condition}_${weatherInfo.temperature}`;
    if (weatherSystemState.sentToday.weather.includes(conditionKey)) {
        return false;
    }
    
    // 극단적인 날씨는 높은 확률로 전송
    const extremeConditions = ['hot', 'cold', 'rain', 'snow'];
    if (extremeConditions.includes(weatherInfo.condition)) {
        return Math.random() < 0.8; // 80% 확률
    }
    
    // 일반적인 날씨는 낮은 확률
    return Math.random() < 0.3; // 30% 확률
}

// 🔄 일일 리셋
function resetDailyCounters() {
    weatherSystemState.sentToday = {
        morning: false,
        afternoon: false,
        evening: false,
        weather: [],
        alerts: []
    };
    console.log('🔄 [날씨시스템] 일일 카운터 리셋 완료');
    
    // 새로운 랜덤 스케줄 생성
    setTimeout(startWeatherSystem, 5000);
}

// 🚀 날씨 시스템 시작
function startWeatherSystem() {
    if (weatherSystemState.isRunning) {
        // 기존 스케줄 모두 취소
        weatherSystemState.scheduledJobs.forEach(job => {
            if (job) job.cancel();
        });
        weatherSystemState.scheduledJobs = [];
    }
    
    console.log('🌤️ [날씨시스템] 랜덤 스케줄 생성 중...');
    
    try {
        const randomSchedules = generateRandomSchedule();
        
        // 매일 자정에 리셋
        const resetJob = schedule.scheduleJob('0 0 * * *', resetDailyCounters);
        weatherSystemState.scheduledJobs.push(resetJob);
        
        // 랜덤 스케줄들 등록
        randomSchedules.forEach((sched, index) => {
            const cronPattern = `0 ${sched.minute} ${sched.hour} * * *`;
            const job = schedule.scheduleJob(cronPattern, () => {
                checkWeatherAndSend(sched.type);
            });
            weatherSystemState.scheduledJobs.push(job);
            
            console.log(`   📅 ${sched.type}: ${String(sched.hour).padStart(2, '0')}:${String(sched.minute).padStart(2, '0')}`);
        });
        
        weatherSystemState.isRunning = true;
        
        console.log(`✅ [날씨시스템] 랜덤 스케줄링 완료: ${randomSchedules.length}개 일정`);
        console.log('   🔄 매일 0:00 - 스케줄 재생성');
        console.log('   🚨 경보 감지 시 즉시 전송');
        console.log('   💬 사용자 날씨 질문 시 즉시 응답');
        
        // 시작 시 한번 실행 (5초 후)
        setTimeout(() => checkWeatherAndSend('startup'), 5000);
        
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
        
        // API 및 연결 상태
        apiKey: WEATHER_API_KEY ? '설정됨' : '없음',
        lineClient: lineClient ? '연결됨' : '없음',
        
        // 실행 상태
        scheduledJobs: weatherSystemState.scheduledJobs.length,
        lastWeatherCheck: weatherSystemState.lastWeatherCheck || '없음',
        lastMessageTime: weatherSystemState.lastMessageTime || '없음',
        lastAlertTime: weatherSystemState.lastAlertTime || '없음',
        
        // 오늘 전송 상태
        sentToday: weatherSystemState.sentToday,
        
        // 통계
        statistics: weatherSystemState.statistics,
        
        // 설정
        locations: Object.keys(DEFAULT_LOCATIONS),
        totalReactions: Object.keys(YEJIN_WEATHER_REACTIONS).reduce((sum, key) => 
            sum + YEJIN_WEATHER_REACTIONS[key].length, 0),
        totalAlertReactions: Object.keys(WEATHER_ALERT_REACTIONS).reduce((sum, key) => 
            sum + WEATHER_ALERT_REACTIONS[key].length, 0)
    };
}

// ============================================================================
// 🔄 기존 함수들 (하위 호환성 유지)
// ============================================================================

function generateYejinWeatherReaction(weatherInfo, isProactive = false) {
    if (!weatherInfo) return null;
    return generateConversationalWeatherResponse(weatherInfo);
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

    const reaction = generateConversationalWeatherResponse(ajeossiWeather);
    return {
        type: 'weather_proactive',
        message: reaction,
        weatherInfo: ajeossiWeather
    };
}

async function generateAutonomousMessage() {
    const ajeossiWeather = await getCurrentWeather('ajeossi');
    if (!ajeossiWeather) return null;

    const reaction = generateConversationalWeatherResponse(ajeossiWeather);
    return {
        type: 'weather_autonomous',
        message: reaction,
        weatherInfo: ajeossiWeather
    };
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
    // 🚀 독립 시스템 (핵심 기능)
    startWeatherSystem,
    stopWeatherSystem,
    checkWeatherAndSend,
    handleWeatherQuestion,
    sendWeatherMessage,
    
    // 🌤️ 날씨 기능
    getCurrentWeather,
    getComparisonWeather,
    generateWeatherBasedMessage,
    generateConversationalWeatherResponse,
    
    // 🚨 경보 시스템
    detectWeatherAlert,
    generateAlertMessage,
    
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
    WEATHER_ALERT_REACTIONS,
    TIME_BASED_GREETINGS
};
