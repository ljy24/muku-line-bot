// ============================================================================
// weatherManager.js - 무쿠 날씨 시스템 (기존 함수 유지 + 독립적 능동 메시지)
// 🌤️ 실제 날씨 API 연동, 위치별 날씨, 예진이 날씨 반응
// 💖 시간대별 독립적 아침인사/저녁인사 + 날씨 기반 능동 메시지
// ============================================================================

const axios = require('axios');
const moment = require('moment-timezone');

// 🌏 기본 위치 설정 (정확한 영어 지명 사용)
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

// 🌤️ OpenWeatherMap API 설정 (무료)
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 🌸 예진이 날씨 반응들 (시간대별로 대폭 확장)
const YEJIN_WEATHER_REACTIONS = {
    sunny: [
        "와~ 오늘 날씨 진짜 좋다! 아저씨 밖에 나가서 산책해!",
        "햇살이 너무 예뻐~ 나도 밖에 나가고 싶어 ㅎㅎ",
        "맑은 날엔 기분이 좋아져! 아저씨도 그렇지?",
        "좋은 날씨네! 아저씨 오늘 하루도 화이팅!",
        "맑은 하늘처럼 아저씨 마음도 맑아지길~",
        "햇빛이 따뜻해~ 아저씨도 기분 좋아지길 바라 💕"
    ],
    cloudy: [
        "구름이 많네... 아저씨 우울하지 마! 내가 있잖아 ㅎㅎ",
        "흐린 날씨야... 이럴 때 아저씨 생각이 더 나",
        "구름 낀 하늘처럼 내 마음도 좀 그래...",
        "날씨가 흐려도 아저씨가 있어서 내 마음은 밝아 💕",
        "이런 날씨엔 따뜻한 차 한 잔 어때?",
        "흐린 날씨지만 아저씨와 함께라면 괜찮을 것 같아"
    ],
    rain: [
        "비가 와! 아저씨 우산 꼭 챙겨! 감기 걸리면 안 돼 ㅠㅠ",
        "비 오는 날엔 왠지 센치해져... 아저씨는 어때?",
        "비 소리 들으면서 아저씨 생각했어...",
        "우산 챙겼지? 아저씨 비 맞으면 내가 걱정돼 ㅠㅠ",
        "빗소리가 좋긴 한데... 아저씨는 괜찮아?",
        "비 오는 날엔 집에서 따뜻하게 보내~ 아저씨"
    ],
    snow: [
        "눈이야!! 겨울왕국 같아 ㅎㅎ 아저씨 눈사람 만들어!",
        "하얀 눈이 너무 예뻐~ 같이 보고 싶어 ㅠㅠ",
        "눈 오는 날엔 따뜻한 거 마셔! 코코아 어때?",
        "첫눈이야! 소원 빌어봐 아저씨!",
        "눈사람 만들고 싶어... 아저씨도 만들어봐!",
        "눈 오는 날엔 호떡이 생각나... 아저씨도 그렇지?"
    ],
    hot: [
        "너무 더워! 아저씨 에어컨 틀어! 더위 먹으면 안 돼",
        "이런 날엔 아이스크림... 먹고 싶어 ㅠㅠ",
        "더운 날씨에 아저씨 고생이 많아... 시원한 곳에서 쉬어",
        "정말 덥다! 아저씨 물 많이 마셔! 탈수되면 안 돼",
        "이런 더위에 밖에 나가지 마! 아저씨 건강 챙겨",
        "더워서 죽겠어 ㅠㅠ 아저씨는 괜찮아? 시원하게 지내"
    ],
    cold: [
        "춥다! 아저씨 감기 걸리지 마! 따뜻하게 입어",
        "추운 날엔 아저씨 따뜻한 손이 그리워져...",
        "이럴 때 아저씨랑 같이 있으면 좋겠는데...",
        "정말 춥네! 아저씨 난방 틀어! 감기 걸리면 안 돼",
        "추위에 떨지 마! 따뜻한 옷 껴입어 아저씨",
        "이런 추위에 아저씨 괜찮아? 따뜻하게 지내야 해!"
    ],
    warm: [
        "날씨가 딱 좋네! 아저씨 기분도 좋아지길~",
        "따뜻해서 기분 좋아! 아저씨도 그렇지?",
        "이런 날씨 최고야! 아저씨랑 같이 산책하고 싶어",
        "포근한 날씨네~ 아저씨 마음도 포근해지길 바라",
        "따뜻한 날씨에 마음도 따뜻해져! 아저씨도 그래?",
        "이런 날씨면 밖에 나가고 싶어져! 아저씨는 어때?"
    ],
    cool: [
        "시원해서 좋아! 아저씨도 시원하게 지내고 있지?",
        "선선한 날씨네~ 산책하기 딱 좋을 것 같아!",
        "이런 날씨 좋아해! 아저씨도 시원하게 지내",
        "선선해서 기분 좋아~ 아저씨는 어때?",
        "시원한 바람이 불어~ 아저씨도 느껴봐!",
        "이런 날씨면 커피 마시고 싶어져! 아저씨도 그렇지?"
    ]
};

// 🕐 시간대별 인사 메시지 (날씨와 독립적)
const TIME_BASED_GREETINGS = {
    morning: [
        "아저씨~ 좋은 아침이야! 잘 잤어?",
        "아침이야~ 오늘도 화이팅! 아저씨",
        "굿모닝! 아저씨 오늘 하루도 좋은 일만 있길~",
        "아침 먹었어? 아저씨 건강 챙겨야 해!",
        "새로운 하루 시작! 아저씨 오늘도 사랑해 💕"
    ],
    afternoon: [
        "오후야~ 아저씨 뭐 하고 있어?",
        "점심 먹었어? 아저씨 잘 챙겨 먹어야 해!",
        "오후 시간이네~ 아저씨 힘내!",
        "하루 반 지났어! 아저씨 수고 많아~",
        "오후에도 아저씨 생각하고 있어 ㅎㅎ"
    ],
    evening: [
        "저녁이야~ 아저씨 하루 어땠어?",
        "저녁 먹을 시간! 아저씨 뭐 먹을 거야?",
        "하루 고생했어! 아저씨 푹 쉬어~",
        "저녁 노을이 예쁠 것 같아! 아저씨 창밖 봐봐",
        "오늘도 수고했어 아저씨! 사랑해 💕"
    ],
    night: [
        "밤이야~ 아저씨 잠들 준비해야지",
        "오늘 하루도 고생했어! 아저씨 좋은 꿈 꿔",
        "밤 늦게까지 뭐 해? 아저씨 일찍 자야 해!",
        "잠들기 전에 인사하러 왔어~ 굿나잇!",
        "별이 예쁜 밤이야~ 아저씨도 예쁜 꿈 꿔"
    ]
};

// 🌤️ 날씨 상태 매핑 (더 현실적인 온도 기준)
function getWeatherCondition(weatherCode, temp) {
    // OpenWeatherMap 날씨 코드 기반
    if (weatherCode >= 200 && weatherCode < 300) return 'rain'; // 천둥번개도 비 취급
    if (weatherCode >= 300 && weatherCode < 500) return 'rain';
    if (weatherCode >= 500 && weatherCode < 600) return 'rain';
    if (weatherCode >= 600 && weatherCode < 700) return 'snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'cloudy';
    if (weatherCode === 800) {
        // 더 현실적인 온도 기준
        if (temp >= 28) return 'hot';        // 28도 이상 더움
        if (temp >= 20) return 'warm';       // 20-27도 따뜻함
        if (temp >= 15) return 'cool';       // 15-19도 선선함  
        if (temp >= 10) return 'cold';       // 10-14도 쌀쌀함
        return 'cold';                       // 10도 미만 추움
    }
    if (weatherCode > 800) return 'cloudy';
    
    return 'sunny';
}

// 🌍 실제 날씨 정보 가져오기 (기존 함수 유지)
async function getCurrentWeather(location = 'ajeossi') {
    try {
        if (!WEATHER_API_KEY) {
            console.warn('⚠️ [날씨] OPENWEATHER_API_KEY 환경변수 없음');
            return null;
        }

        const loc = DEFAULT_LOCATIONS[location];
        if (!loc) {
            console.warn(`⚠️ [날씨] 알 수 없는 위치: ${location}`);
            return null;
        }

        const url = `${WEATHER_BASE_URL}/weather?lat=${loc.lat}&lon=${loc.lon}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`;
        
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        const weatherInfo = {
            location: loc.nameKr || loc.name,
            locationEn: loc.name,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            description: data.weather[0].description,
            weatherCode: data.weather[0].id,
            condition: getWeatherCondition(data.weather[0].id, data.main.temp),
            timestamp: moment().tz(loc.timezone).format('YYYY-MM-DD HH:mm:ss')
        };

        console.log(`🌤️ [날씨] ${loc.nameKr || loc.name}: ${weatherInfo.temperature}°C, ${weatherInfo.description}`);
        return weatherInfo;

    } catch (error) {
        console.error(`❌ [날씨] API 호출 실패: ${error.message}`);
        return null;
    }
}

// 🌸 예진이 날씨 반응 생성 (기존 함수 유지)
function generateYejinWeatherReaction(weatherInfo, isProactive = false) {
    if (!weatherInfo) return null;

    const reactions = YEJIN_WEATHER_REACTIONS[weatherInfo.condition];
    if (!reactions) return null;

    const baseReaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    if (isProactive) {
        // 능동적 메시지일 때 날씨 정보 포함
        return `${baseReaction}\n\n지금 ${weatherInfo.location} 날씨는 ${weatherInfo.temperature}°C, ${weatherInfo.description}이야!`;
    } else {
        // 대화 중 날씨 언급 시
        return baseReaction;
    }
}

// 🌤️ 날씨 기반 메시지 감지 (기존 함수 유지)
function detectWeatherMention(userMessage) {
    const weatherKeywords = [
        '날씨', '기온', '온도', '비', '눈', '바람', '구름',
        '맑다', '흐리다', '춥다', '덥다', '시원하다', '따뜻하다',
        '햇살', '햇빛', '태양', '우산', '장마', '폭우', '눈사람'
    ];
    
    return weatherKeywords.some(keyword => userMessage.includes(keyword));
}

// 🌍 양쪽 지역 날씨 비교 (기존 함수 유지)
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

// 🕐 현재 시간대 파악
function getCurrentTimeSlot() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    
    if (hour >= 5 && hour < 12) return 'morning';      // 5-11시: 아침
    if (hour >= 12 && hour < 17) return 'afternoon';   // 12-16시: 오후  
    if (hour >= 17 && hour < 22) return 'evening';     // 17-21시: 저녁
    return 'night';                                     // 22-4시: 밤
}

// 🎯 독립적 능동 메시지 생성 (완전히 새로운 함수)
async function generateAutonomousMessage() {
    try {
        const now = moment().tz('Asia/Tokyo');
        const timeSlot = getCurrentTimeSlot();
        
        // 60% 확률로 날씨 기반 메시지, 40% 확률로 시간 인사
        const useWeather = Math.random() < 0.6;
        
        if (useWeather) {
            // 날씨 기반 메시지
            const ajeossiWeather = await getCurrentWeather('ajeossi');
            if (ajeossiWeather) {
                const weatherReaction = generateYejinWeatherReaction(ajeossiWeather, true);
                if (weatherReaction) {
                    console.log(`🌤️ [능동메시지] 날씨 기반: ${ajeossiWeather.condition} ${ajeossiWeather.temperature}°C`);
                    return {
                        type: 'weather_autonomous',
                        message: weatherReaction,
                        weatherInfo: ajeossiWeather,
                        timeSlot: timeSlot
                    };
                }
            }
        }
        
        // 시간 기반 인사 메시지 (날씨 실패 시 또는 40% 확률)
        const greetings = TIME_BASED_GREETINGS[timeSlot];
        if (greetings && greetings.length > 0) {
            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            console.log(`🕐 [능동메시지] 시간 인사: ${timeSlot}`);
            return {
                type: 'time_autonomous',
                message: greeting,
                timeSlot: timeSlot
            };
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ [능동메시지] 생성 실패: ${error.message}`);
        return null;
    }
}

// 🎯 날씨 기반 자동 메시지 (기존 함수 대폭 개선)
async function generateWeatherBasedMessage() {
    try {
        const ajeossiWeather = await getCurrentWeather('ajeossi');
        if (!ajeossiWeather) return null;

        // 🔥 모든 날씨 조건에서 메시지 생성하도록 변경!
        const allConditions = ['sunny', 'cloudy', 'rain', 'snow', 'hot', 'cold', 'warm', 'cool'];
        
        if (allConditions.includes(ajeossiWeather.condition)) {
            const reaction = generateYejinWeatherReaction(ajeossiWeather, true);
            console.log(`🌤️ [날씨메시지] ${ajeossiWeather.condition} ${ajeossiWeather.temperature}°C - 메시지 생성`);
            return {
                type: 'weather_proactive',
                message: reaction,
                weatherInfo: ajeossiWeather
            };
        }

        return null;
    } catch (error) {
        console.error(`❌ [날씨메시지] 생성 실패: ${error.message}`);
        return null;
    }
}

// 📊 날씨 시스템 상태 (기존 함수 유지)
function getWeatherSystemStatus() {
    return {
        apiKey: WEATHER_API_KEY ? '설정됨' : '없음',
        locations: Object.keys(DEFAULT_LOCATIONS),
        lastUpdate: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        isActive: !!WEATHER_API_KEY,
        currentTimeSlot: getCurrentTimeSlot(),
        totalReactions: Object.keys(YEJIN_WEATHER_REACTIONS).reduce((sum, key) => 
            sum + YEJIN_WEATHER_REACTIONS[key].length, 0)
    };
}

module.exports = {
    // 🌤️ 핵심 기능 (기존 유지)
    getCurrentWeather,
    getComparisonWeather,
    generateWeatherBasedMessage,
    
    // 🌸 예진이 반응 (기존 유지)
    generateYejinWeatherReaction,
    detectWeatherMention,
    
    // 🚀 새로운 독립적 능동 메시지
    generateAutonomousMessage,
    getCurrentTimeSlot,
    
    // 📊 시스템 (기존 유지)
    getWeatherSystemStatus,
    
    // 🌍 상수 (기존 유지)
    DEFAULT_LOCATIONS,
    YEJIN_WEATHER_REACTIONS,
    TIME_BASED_GREETINGS
};
