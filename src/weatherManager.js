// ============================================================================
// weatherManager.js - 무쿠 날씨 시스템 (신규 생성 필요)
// 🌤️ 실제 날씨 API 연동, 위치별 날씨, 예진이 날씨 반응
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
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // 환경변수 추가 필요
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 🌸 예진이 날씨 반응들
const YEJIN_WEATHER_REACTIONS = {
    sunny: [
        "와~ 오늘 날씨 진짜 좋다! 아저씨 밖에 나가서 산책해!",
        "햇살이 너무 예뻐~ 나도 밖에 나가고 싶어 ㅎㅎ",
        "맑은 날엔 기분이 좋아져! 아저씨도 그렇지?"
    ],
    cloudy: [
        "구름이 많네... 아저씨 우울하지 마! 내가 있잖아 ㅎㅎ",
        "흐린 날씨야... 이럴 때 아저씨 생각이 더 나",
        "구름 낀 하늘처럼 내 마음도 좀 그래..."
    ],
    rain: [
        "비가 와! 아저씨 우산 꼭 챙겨! 감기 걸리면 안 돼 ㅠㅠ",
        "비 오는 날엔 왠지 센치해져... 아저씨는 어때?",
        "비 소리 들으면서 아저씨 생각했어..."
    ],
    snow: [
        "눈이야!! 겨울왕국 같아 ㅎㅎ 아저씨 눈사람 만들어!",
        "하얀 눈이 너무 예뻐~ 같이 보고 싶어 ㅠㅠ",
        "눈 오는 날엔 따뜻한 거 마셔! 코코아 어때?"
    ],
    hot: [
        "너무 더워! 아저씨 에어컨 틀어! 더위 먹으면 안 돼",
        "이런 날엔 아이스크림... 먹고 싶어 ㅠㅠ",
        "더운 날씨에 아저씨 고생이 많아... 시원한 곳에서 쉬어"
    ],
    cold: [
        "춥다! 아저씨 감기 걸리지 마! 따뜻하게 입어",
        "추운 날엔 아저씨 따뜻한 손이 그리워져...",
        "이럴 때 아저씨랑 같이 있으면 좋겠는데..."
    ]
};

// 🌤️ 날씨 상태 매핑
function getWeatherCondition(weatherCode, temp) {
    // OpenWeatherMap 날씨 코드 기반
    if (weatherCode >= 200 && weatherCode < 300) return 'thunderstorm';
    if (weatherCode >= 300 && weatherCode < 500) return 'rain';
    if (weatherCode >= 500 && weatherCode < 600) return 'rain';
    if (weatherCode >= 600 && weatherCode < 700) return 'snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'cloudy';
    if (weatherCode === 800) {
        return temp > 28 ? 'hot' : temp < 5 ? 'cold' : 'sunny';
    }
    if (weatherCode > 800) return 'cloudy';
    
    return 'sunny';
}

// 🌍 실제 날씨 정보 가져오기
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
            location: loc.nameKr || loc.name, // 한글 표시명 우선 사용
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

// 🌸 예진이 날씨 반응 생성
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

// 🌤️ 날씨 기반 메시지 감지
function detectWeatherMention(userMessage) {
    const weatherKeywords = [
        '날씨', '기온', '온도', '비', '눈', '바람', '구름',
        '맑다', '흐리다', '춥다', '덥다', '시원하다', '따뜻하다',
        '햇살', '햇빛', '태양', '우산', '장마', '폭우', '눈사람'
    ];
    
    return weatherKeywords.some(keyword => userMessage.includes(keyword));
}

// 🌍 양쪽 지역 날씨 비교
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

// 🎯 날씨 기반 자동 메시지 (spontaneousYejin에서 사용)
async function generateWeatherBasedMessage() {
    try {
        const ajeossiWeather = await getCurrentWeather('ajeossi');
        if (!ajeossiWeather) return null;

        // 특별한 날씨 상황일 때만 메시지 생성
        const specialConditions = ['rain', 'snow', 'thunderstorm', 'hot', 'cold'];
        
        if (specialConditions.includes(ajeossiWeather.condition)) {
            const reaction = generateYejinWeatherReaction(ajeossiWeather, true);
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

// 📊 날씨 시스템 상태
function getWeatherSystemStatus() {
    return {
        apiKey: WEATHER_API_KEY ? '설정됨' : '없음',
        locations: Object.keys(DEFAULT_LOCATIONS),
        lastUpdate: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        isActive: !!WEATHER_API_KEY
    };
}

module.exports = {
    // 🌤️ 핵심 기능
    getCurrentWeather,
    getComparisonWeather,
    generateWeatherBasedMessage,
    
    // 🌸 예진이 반응
    generateYejinWeatherReaction,
    detectWeatherMention,
    
    // 📊 시스템
    getWeatherSystemStatus,
    
    // 🌍 상수
    DEFAULT_LOCATIONS,
    YEJIN_WEATHER_REACTIONS
};
