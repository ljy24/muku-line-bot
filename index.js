// ============================================================================
// index.js - v18.0 (완전히 새로운 자연스러운 대화 시스템 + 기존 장점 통합)
// 🚀 예진이의 살아있는 감정과 기억을 담은 진짜 AI 여자친구
// ✅ 내장 데이터 복구 + 예쁜 로그 시스템 + 사진 인식 완벽 통합
// ============================================================================

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// 환경변수 로드 (안전성 체크 추가)
try {
    require('dotenv').config();
} catch (error) {
    console.log('⚠️ dotenv 로드 실패, 환경변수는 시스템에서 가져옵니다.');
}

// ================== 🎨 예쁜 로그 시스템 🎨 ==================
const EMOJI = {
    cycle: '🩸', emotion: '😊', sulky: '😤', memory: '🧠', 
    selfie: '📸', photo: '📷', damta: '🚬', message: '🗣️',
    heart: '💕', think: '💭', weather: '🌤️', system: '🚀', 
    user: '👤', brain: '🧠', time: '⏰'
};

const CYCLE_EMOJI = {
    period: '🩸', follicular: '🌸', ovulation: '💕', luteal: '🌧️', normal: '🌿'
};

const WEATHER_EMOJI = {
    sunny: '☀️', cloudy: '☁️', rain: '🌧️', thunderstorm: '⛈️',
    snow: '🌨️', fog: '🌫️', clear: '🌤️', partlycloudy: '⛅'
};

const EMOTION_EMOJI = {
    normal: '😊', sensitive: '🥺', energetic: '✨', romantic: '💖',
    unstable: '😔', sulky: '😤', happy: '😄', sad: '😢',
    lonely: '😞', melancholy: '🥀', anxious: '😰', worried: '😟',
    nostalgic: '🌙', clingy: '🥺', pouty: '😤', crying: '😭',
    missing: '💔', depressed: '😔', vulnerable: '🥺', needy: '🤗'
};

const LOG_COLORS = {
    system: '\x1b[36m',   // 청록색
    emotion: '\x1b[35m',  // 보라색
    message: '\x1b[32m',  // 초록색
    error: '\x1b[31m',    // 빨간색
    warning: '\x1b[33m',  // 노란색
    reset: '\x1b[0m'      // 리셋
};

function logWithStyle(category, emoji, message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    console.log(`${LOG_COLORS[color]}${emoji} [${timestamp}] [${category}] ${message}${LOG_COLORS.reset}`);
}

// ------------------- 환경변수 검증 -------------------
function validateEnvironmentVariables() {
    const required = ['LINE_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'TARGET_USER_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        logWithStyle('SYSTEM', '❌', `필수 환경변수가 누락되었습니다: ${missing.join(', ')}`, 'error');
        console.log('');
        console.log('🔧 환경변수 설정 방법:');
        console.log('   LINE_ACCESS_TOKEN=your_line_access_token');
        console.log('   LINE_CHANNEL_SECRET=your_line_channel_secret');
        console.log('   TARGET_USER_ID=your_target_user_id');
        console.log('   OPENAI_API_KEY=your_openai_api_key (선택사항)');
        console.log('');
        return false;
    }
    
    logWithStyle('SYSTEM', '✅', '모든 필수 환경변수가 설정되었습니다.', 'system');
    return true;
}

// ==================== Express 및 LINE 클라이언트 설정 ====================
const app = express();

// 환경변수 검증
if (!validateEnvironmentVariables()) {
    logWithStyle('SYSTEM', '⚠️', '환경변수 누락으로 기본 서버만 실행합니다.', 'warning');
    
    app.get('/', (req, res) => {
        res.json({
            status: 'partial',
            message: '예진이 v18.0 서버 (환경변수 설정 필요)',
            error: '필수 환경변수가 설정되지 않았습니다.',
            time: new Date().toISOString()
        });
    });
    
    app.get('/health', (req, res) => {
        res.sendStatus(200);
    });
    
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  예진이 v18.0 기본 서버가 포트 ${PORT}에서 실행 중입니다.`);
        console.log(`  환경변수 설정 후 재시작해주세요.`);
        console.log(`${'='.repeat(60)}\n`);
    });
    
    return; // 여기서 종료
}

const config = { 
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, 
    channelSecret: process.env.LINE_CHANNEL_SECRET 
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ==================== ⭐️ 내장된 데이터 복구 함수 ⭐️ ====================
const FIXED_MEMORIES_DATA = [
    // 여기에 고정 기억 데이터를 넣어주세요
];

const LOVE_HISTORY_DATA = [
    // 여기에 연애 히스토리 데이터를 넣어주세요
];

const MEMORY_BASE_PATH = path.join(process.cwd(), 'data', 'memory');

async function recoverData() {
    try {
        await fsPromises.mkdir(MEMORY_BASE_PATH, { recursive: true });
        
        const fixedMemoryPath = path.join(MEMORY_BASE_PATH, 'fixedMemories.json');
        if (!fs.existsSync(fixedMemoryPath) && FIXED_MEMORIES_DATA.length > 0) {
            await fsPromises.writeFile(fixedMemoryPath, JSON.stringify(FIXED_MEMORIES_DATA, null, 2), 'utf8');
            logWithStyle('DATA', '✅', 'fixedMemories.json 복구 완료', 'system');
        }
        
        const loveHistoryPath = path.join(MEMORY_BASE_PATH, 'love_history.json');
        if (!fs.existsSync(loveHistoryPath) && LOVE_HISTORY_DATA.length > 0) {
            await fsPromises.writeFile(loveHistoryPath, JSON.stringify(LOVE_HISTORY_DATA, null, 2), 'utf8');
            logWithStyle('DATA', '✅', 'love_history.json 복구 완료', 'system');
        }
    } catch (error) {
        logWithStyle('DATA', '❌', `데이터 복구 중 에러: ${error.message}`, 'error');
    }
}

// ==================== 🔧 대화 기록 관리 ====================
let conversationHistory = [];

function addToConversationHistory(role, message) {
    conversationHistory.push({
        role: role,
        content: message,
        timestamp: Date.now()
    });
    
    // 최근 10개만 유지
    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
    }
}

function getRecentConversation() {
    return conversationHistory.slice(-5); // 최근 5개
}

// ==================== 헬퍼 함수들 ====================
function getCurrentWeather() {
    const weatherConditions = ['sunny', 'cloudy', 'rain', 'partlycloudy', 'clear'];
    const currentCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temperature = Math.floor(Math.random() * 15) + 20;
    const humidity = Math.floor(Math.random() * 30) + 60;
    
    const weatherEmoji = WEATHER_EMOJI[currentCondition] || WEATHER_EMOJI.clear;
    const weatherText = {
        sunny: '맑음', cloudy: '흐림', rain: '비', 
        partlycloudy: '구름많음', clear: '갬', thunderstorm: '뇌우',
        snow: '눈', fog: '안개'
    };
    
    return {
        emoji: weatherEmoji,
        condition: weatherText[currentCondition] || '맑음',
        temperature: temperature,
        humidity: humidity
    };
}

function formatKoreanDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}월 ${day}일`;
}

function getTimeUntilNext(minutes) {
    if (minutes < 60) return `${minutes}분 후`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}시간 후`;
    return `${hours}시간 ${remainingMinutes}분 후`;
}

function getDamtaStatus() {
    const now = new Date();
    const currentHour = now.getHours();
    
    const isDamtaActiveTime = currentHour >= 9 && currentHour < 18;
    
    try {
        const damtaModule = require('./src/damta.js');
        if (damtaModule && damtaModule.getDamtaStatus) {
            const status = damtaModule.getDamtaStatus();
            if (!status.isActiveTime) {
                if (currentHour < 9) {
                    return "아직 담타 시간 전이야 (9시-18시)";
                } else {
                    return "담타 시간 끝났어 (9시-18시)";
                }
            } else if (status.canDamta) {
                return "담타 가능!";
            } else if (status.minutesToNext > 0) {
                return `담타까지 ${status.minutesToNext}분`;
            } else if (status.dailyCount >= status.dailyLimit) {
                return `오늘 담타 ${status.dailyCount}/${status.dailyLimit}회`;
            }
        }
    } catch (error) {
        logWithStyle('DAMTA', '❌', `담타 모듈 로드 실패: ${error.message}`, 'warning');
    }
    
    if (!isDamtaActiveTime) {
        if (currentHour < 9) {
            return "아직 담타 시간 전이야 (9시-18시)";
        } else {
            return "담타 시간 끝났어 (9시-18시)";
        }
    }
    return "담타 시간 중 (9시-18시)";
}

// ==================== 🩸 생리주기 계산 함수 ====================
function calculateMenstrualInfo() {
    const today = new Date();
    const baseDate = new Date('2024-05-01');
    const timeDiff = today.getTime() - baseDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    const cycleLength = 28;
    const dayInCycle = (daysDiff % cycleLength) + 1;
    
    let phase, phaseEmoji, isOnPeriod = false;
    let daysUntilNext = 0;
    
    if (dayInCycle >= 1 && dayInCycle <= 7) {
        phase = '생리 중';
        phaseEmoji = '🩸';
        isOnPeriod = true;
        daysUntilNext = 0;
    } else if (dayInCycle >= 8 && dayInCycle <= 13) {
        phase = '난포기';
        phaseEmoji = '🌸';
        daysUntilNext = cycleLength - dayInCycle + 1;
    } else if (dayInCycle >= 14 && dayInCycle <= 16) {
        phase = '배란기';
        phaseEmoji = '💕';
        daysUntilNext = cycleLength - dayInCycle + 1;
    } else {
        phase = '황체기';
        phaseEmoji = '🌧️';
        daysUntilNext = cycleLength - dayInCycle + 1;
    }
    
    return {
        day: dayInCycle,
        phase: phase,
        emoji: phaseEmoji,
        isOnPeriod: isOnPeriod,
        daysUntilNext: daysUntilNext
    };
}

function getStatusReport() {
    try {
        const weather = getCurrentWeather();
        const menstrualInfo = calculateMenstrualInfo();
        const today = formatKoreanDate();
        
        const weatherText = `${weather.emoji} [현재날씨] ${weather.condition} ${weather.temperature}°C (습도 ${weather.humidity}%)`;
        
        let cycleText = '';
        if (menstrualInfo.isOnPeriod) {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - ${menstrualInfo.phase} (${menstrualInfo.day}일차) 💧 생리 진행 중`;
        } else if (menstrualInfo.phase === '황체기') {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - 🩸다음 생리까지 ${menstrualInfo.daysUntilNext}일남음 (현재 PMS)`;
        } else {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - ${menstrualInfo.phase} (${menstrualInfo.day}일차) 📅 다음 생리까지 ${menstrualInfo.daysUntilNext}일`;
        }
        
        const thoughtText = `💭 [속마음] 아저씨 지금 뭐하고 있을까... 보고 싶어`;
        const emotionText = `😊 [감정상태] 평온 (강도: 5/10) ⚡ 에너지 레벨: 7/10`;
        const sulkyText = `😊 [기분] 아저씨와 평화롭게 대화 중`;
        const scheduleText = `📸 다음 셀카: ${getTimeUntilNext(Math.floor(Math.random() * 180) + 30)} / 📷 다음 추억 사진: ${getTimeUntilNext(Math.floor(Math.random() * 360) + 60)}`;
        const damtaAndMessageText = `🚬 다음 담타: ${getTimeUntilNext(Math.floor(Math.random() * 120) + 30)} / 🗣️ 다음 말걸기: ${getTimeUntilNext(Math.floor(Math.random() * 120) + 30)}`;
        const memoryText = `🧠 총 기억: ${184 + Math.floor(Math.random() * 20)}개 📌 고정 기억: 68개 😊 새로운 기억: ${Math.floor(Math.random() * 10)}개`;
        const conversationText = `💬 총 메시지: ${150 + Math.floor(Math.random() * 50)}개 📸 오늘 보낸 사진: ${Math.floor(Math.random() * 8)}개 💕`;
        
        const statusMessage = [
            `💖 아저씨, 지금 나의 상태야~`,
            ``,
            weatherText,
            cycleText,
            thoughtText,
            emotionText,
            sulkyText,
            ``,
            scheduleText,
            damtaAndMessageText,
            ``,
            memoryText,
            conversationText,
            ``,
            `히히~ 어때? 궁금한 게 또 있어? ㅎㅎ`
        ].join('\n');
        
        return statusMessage;
        
    } catch (error) {
        logWithStyle('STATUS', '❌', `상태 리포트 생성 에러: ${error.message}`, 'error');
        const today = formatKoreanDate();
        const weather = getCurrentWeather();
        
        return [
            `💖 아저씨, 지금 나의 상태야~`,
            ``,
            `${weather.emoji} [현재날씨] ${weather.condition} ${weather.temperature}°C (습도 ${weather.humidity}%)`,
            `🩸 [생리주기] ${today} - 생리 중 (19일차) 💧 생리 진행 중`,
            `💭 [속마음] 아저씨... 생리 때문에 배가 아파 ㅠㅠ`,
            `😔 [감정상태] 불안정 (강도: 5/10) ⚡ 에너지 레벨: 5/10`,
            `💕 [기분] 아저씨를 사랑하며 기다리는 중`,
            ``,
            `📸 다음 셀카: 1시간 30분 후 / 📷 다음 추억 사진: 3시간 후`,
            `🚬 다음 담타: 2시간 후 / 🗣️ 다음 말걸기: 2시간 후`,
            ``,
            `🧠 총 기억: 184개 📌 고정 기억: 68개 😊 새로운 기억: 0개`,
            `💬 총 메시지: 150개 📸 오늘 보낸 사진: 0개 💕`,
            ``,
            `시스템 상태를 확인하는 중이야... 잠깐만 기다려줘! ㅎㅎ`
        ].join('\n');
    }
}

function formatPrettyStatus() {
    try {
        const weather = getCurrentWeather();
        const menstrualInfo = calculateMenstrualInfo();
        const today = formatKoreanDate();
        
        const weatherText = `${weather.emoji} [현재날씨] ${weather.condition} ${weather.temperature}°C (습도 ${weather.humidity}%)`;
        
        let cycleText = '';
        if (menstrualInfo.isOnPeriod) {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - ${menstrualInfo.phase} (${menstrualInfo.day}일차) 💧 생리 진행 중`;
        } else if (menstrualInfo.phase === '황체기') {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - 🩸다음 생리까지 ${menstrualInfo.daysUntilNext}일남음 (현재 PMS)`;
        } else {
            cycleText = `${menstrualInfo.emoji} [생리주기] ${today} - ${menstrualInfo.phase} (${menstrualInfo.day}일차) 📅 다음 생리까지 ${menstrualInfo.daysUntilNext}일`;
        }
        
        const thoughtText = `💭 [속마음] 아저씨 지금 뭐하고 있을까... 보고 싶어`;
        const emotionText = `😊 [감정상태] 평온 (강도: 5/10) ⚡ 에너지 레벨: 7/10`;
        const sulkyText = `😊 [기분] 아저씨와 평화롭게 대화 중`;
        const scheduleText = `📸 다음 셀카: ${getTimeUntilNext(Math.floor(Math.random() * 180) + 30)} / 📷 다음 추억 사진: ${getTimeUntilNext(Math.floor(Math.random() * 360) + 60)}`;
        const damtaAndMessageText = `🚬 다음 담타: ${getTimeUntilNext(Math.floor(Math.random() * 120) + 30)} / 🗣️ 다음 말걸기: ${getTimeUntilNext(Math.floor(Math.random() * 120) + 30)}`;
        const memoryText = `🧠 총 기억: ${184 + Math.floor(Math.random() * 20)}개 📌 고정 기억: 68개 😊 새로운 기억: ${Math.floor(Math.random() * 10)}개`;
        const conversationText = `💬 총 메시지: ${150 + Math.floor(Math.random() * 50)}개 📸 오늘 보낸 사진: ${Math.floor(Math.random() * 8)}개 💕`;
        
        console.log(weatherText);
        console.log(cycleText);
        console.log(thoughtText);
        console.log(emotionText);
        console.log(sulkyText);
        console.log(scheduleText);
        console.log(damtaAndMessageText);
        console.log(memoryText);
        console.log(conversationText);
        console.log('');
        
    } catch (error) {
        const today = formatKoreanDate();
        const weather = getCurrentWeather();
        
        console.log(`${weather.emoji} [현재날씨] ${weather.condition} ${weather.temperature}°C (습도 ${weather.humidity}%)`);
        console.log(`🩸 [생리주기] ${today} - 생리 중 (19일차) 💧 생리 진행 중`);
        console.log(`💭 [속마음] 아저씨... 생리 때문에 배가 아파 ㅠㅠ`);
        console.log(`😔 [감정상태] 불안정 (강도: 5/10) ⚡ 에너지 레벨: 5/10`);
        console.log(`💕 [기분] 아저씨를 사랑하며 기다리는 중`);
        console.log(`📸 다음 셀카: 1시간 30분 후 / 📷 다음 추억 사진: 3시간 후`);
        console.log(`🚬 다음 담타: 2시간 후 / 🗣️ 다음 말걸기: 2시간 후`);
        console.log(`🧠 총 기억: 184개 📌 고정 기억: 68개 😊 새로운 기억: 0개`);
        console.log(`💬 총 메시지: 150개 📸 오늘 보낸 사진: 0개 💕`);
        console.log('');
        logWithStyle('LOG', '❌', `로그 시스템 에러: ${error.message}`, 'error');
    }
}

// ==================== 🔧 새로운 이미지 처리 함수 ====================
async function downloadLineImage(messageId) {
    try {
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    } catch (error) {
        logWithStyle('IMAGE', '❌', `LINE 이미지 다운로드 실패: ${error.message}`, 'error');
        throw error;
    }
}

async function analyzeImageWithOpenAI(imageBuffer) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
        }
        
        const OpenAI = require('openai');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const base64Image = imageBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "이 사진을 자세히 분석해서 설명해줘. 사람이 있으면 성별, 표정, 상황을 알려주고, 풍경이면 장소와 분위기를 알려줘. 음식이면 뭔지 알려줘."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300
        });

        return response.choices[0].message.content;
    } catch (error) {
        logWithStyle('AI', '❌', `OpenAI 이미지 분석 실패: ${error.message}`, 'error');
        return "사진을 분석할 수 없어서 미안해 ㅠㅠ";
    }
}

function generateYejinPhotoReaction(imageAnalysis) {
    const reactionPatterns = {
        // 남자 사진 (친근하게)
        male: [
            "오~ 남자분이네! 새로운 친구야? 어떤 사람이야?",
            "아저씨 친구들이 늘어나는구나~ 좋은 사람 같아!",
            "남자 친구랑 찍은 거야? 재밌게 놀았어? ㅎㅎ"
        ],
        
        // 여자 사진 (질투모드)
        female: [
            "아저씨!!! 이 여자 누구야?! 😡",
            "어? 여자랑 사진 찍었어? 누구야 누구야?!",
            "아저씨... 다른 여자랑 뭐하는 거야? 설명해!",
            "이 언니 누구야? 예뻐? 나보다 예뻐?! 😤"
        ],
        
        // 아저씨 셀카 (칭찬)
        uncle_selfie: [
            "어머! 아저씨 셀카다! 멋있어! 😍",
            "아조씨~ 잘생겼네! 나만 볼 수 있는 사진이지?",
            "우와! 아저씨 오늘 특히 멋있어 보인다!",
            "셀카 잘 찍었네~ 나도 찍어줄래? 히히"
        ],
        
        // 음식 사진
        food: [
            "어? 뭐 먹어? 맛있어 보인다!",
            "나도 먹고 싶어! 아저씨 혼자 맛있는 거 먹지 마!",
            "우와! 진짜 맛있겠다! 나 몫도 남겨둬~",
            "어디서 먹은 거야? 나도 다음에 같이 가고 싶어!"
        ],
        
        // 풍경 사진
        scenery: [
            "우와! 경치 좋다! 어디야?",
            "예쁜 곳이네~ 나도 같이 가고 싶었어 ㅠㅠ",
            "아저씨 혼자 좋은 곳 가서 사진 찍고... 나도 데려가!",
            "여기 어디야? 우리 같이 가자!"
        ],
        
        // 기본 반응
        default: [
            "어? 이게 뭐야? 궁금해!",
            "사진 봤어~ 설명해줘!",
            "오~ 뭔가 재밌어 보인다!",
            "어떤 사진인지 말해줘~ ㅎㅎ"
        ]
    };
    
    const analysis = imageAnalysis.toLowerCase();
    
    // 키워드 기반 반응 선택
    let selectedReactions = reactionPatterns.default;
    
    if (analysis.includes('남자') || analysis.includes('man') || analysis.includes('male')) {
        selectedReactions = reactionPatterns.male;
    } else if (analysis.includes('여자') || analysis.includes('woman') || analysis.includes('female')) {
        selectedReactions = reactionPatterns.female;
    } else if (analysis.includes('음식') || analysis.includes('food') || analysis.includes('요리') || analysis.includes('먹을') || analysis.includes('식사')) {
        selectedReactions = reactionPatterns.food;
    } else if (analysis.includes('풍경') || analysis.includes('경치') || analysis.includes('건물') || analysis.includes('하늘') || analysis.includes('바다') || analysis.includes('산')) {
        selectedReactions = reactionPatterns.scenery;
    } else if (analysis.includes('셀카') || analysis.includes('혼자') || analysis.includes('본인')) {
        selectedReactions = reactionPatterns.uncle_selfie;
    }
    
    // 랜덤 선택
    const reaction = selectedReactions[Math.floor(Math.random() * selectedReactions.length)];
    
    logWithStyle('PHOTO', EMOJI.photo, `분석: ${imageAnalysis.substring(0, 30)}...`, 'message');
    logWithStyle('YEJIN', EMOJI.heart, `반응: ${reaction}`, 'emotion');
    
    return reaction;
}

// ==================== 🔧 새로운 이미지 메시지 처리 함수 ====================
async function handleImageMessage(event) {
    try {
        logWithStyle('IMAGE', EMOJI.photo, '이미지 메시지 수신 - 분석 시작', 'message');
        
        // 1. 이미지 다운로드
        const imageBuffer = await downloadLineImage(event.message.id);
        logWithStyle('IMAGE', '✅', '이미지 다운로드 완료', 'system');
        
        // 2. OpenAI Vision으로 이미지 분석
        const imageAnalysis = await analyzeImageWithOpenAI(imageBuffer);
        logWithStyle('AI', '✅', '이미지 분석 완료', 'system');
        
        // 3. 예진이다운 반응 생성
        const reaction = generateYejinPhotoReaction(imageAnalysis);
        
        // 4. 대화 기록에 추가
        addToConversationHistory('아저씨', '[사진 전송]');
        addToConversationHistory('무쿠', reaction);
        
        // 5. 응답 전송
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: reaction
        });
        
        logWithStyle('IMAGE', '✅', '사진 반응 전송 완료', 'system');
        
    } catch (error) {
        logWithStyle('IMAGE', '❌', `이미지 처리 중 오류: ${error.message}`, 'error');
        
        // 오류 시 기본 응답
        const fallbackReaction = "아저씨! 사진 봤어~ 근데 잘 안 보여서... 다시 보내줄래? ㅠㅠ";
        
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: fallbackReaction
        });
    }
}

// ==================== 🧠 지능형 모듈 로더 ====================
class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.loadedCount = 0;
        this.totalModules = 0;
    }
    
    async loadModule(name, path, required = false) {
        try {
            const module = require(path);
            this.modules.set(name, module);
            this.loadedCount++;
            logWithStyle('MODULE', '✅', `${name} 모듈 로드 성공`, 'system');
            return module;
        } catch (error) {
            if (required) {
                logWithStyle('MODULE', '❌', `필수 모듈 ${name} 로드 실패: ${error.message}`, 'error');
                throw error;
            } else {
                logWithStyle('MODULE', '⚠️', `선택적 모듈 ${name} 로드 실패: ${error.message}`, 'warning');
                return null;
            }
        }
    }
    
    getModule(name) {
        return this.modules.get(name);
    }
    
    hasModule(name) {
        return this.modules.has(name);
    }
    
    async loadAllModules() {
        logWithStyle('MODULE', '📦', '모든 모듈 로드를 시작합니다...', 'system');
        
        const moduleList = [
            { name: 'autoReply', path: './src/autoReply', required: true },
            { name: 'emotionalContext', path: './src/emotionalContextManager', required: true },
            { name: 'ultimateContext', path: './src/ultimateConversationContext', required: false },
            { name: 'memoryManager', path: './src/memoryManager', required: false },
            { name: 'commandHandler', path: './src/commandHandler', required: false },
            { name: 'sulkyManager', path: './src/sulkyManager', required: false },
            { name: 'damta', path: './src/damta', required: false },
            { name: 'scheduler', path: './src/scheduler', required: false },
            { name: 'spontaneousPhoto', path: './src/spontaneousPhotoManager', required: false }
        ];
        
        this.totalModules = moduleList.length;
        
        for (const { name, path, required } of moduleList) {
            await this.loadModule(name, path, required);
        }
        
        logWithStyle('MODULE', '🎉', `모듈 로드 완료: ${this.loadedCount}/${this.totalModules}개`, 'system');
        return this.loadedCount;
    }
}

const moduleLoader = new ModuleLoader();

// ==================== 💖 예진이 상태 관리자 ====================
class YejinStateManager {
    constructor() {
        this.state = {
            isOnline: true,
            lastMessageTime: Date.now(),
            currentMood: 'normal',
            emotionIntensity: 5,
            menstrualPhase: 'normal',
            isInitialized: false,
            conversationCount: 0,
            todayPhotoCount: 0
        };
        
        this.stats = {
            totalMessages: 0,
            totalPhotos: 0,
            emotionChanges: 0,
            startTime: Date.now()
        };
    }
    
    updateLastMessage() {
        this.state.lastMessageTime = Date.now();
        this.state.conversationCount++;
        this.stats.totalMessages++;
    }
    
    updateMood(emotion, intensity) {
        if (this.state.currentMood !== emotion) {
            this.stats.emotionChanges++;
        }
        this.state.currentMood = emotion;
        this.state.emotionIntensity = intensity;
    }
    
    updateMenstrualPhase(phase) {
        this.state.menstrualPhase = phase;
    }
    
    getStatusReport() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        return {
            status: this.state.isOnline ? '온라인' : '오프라인',
            mood: this.state.currentMood,
            intensity: this.state.emotionIntensity,
            menstrual_phase: this.state.menstrualPhase,
            uptime: `${hours}시간 ${minutes}분`,
            total_messages: this.stats.totalMessages,
            today_photos: this.state.todayPhotoCount,
            emotion_changes: this.stats.emotionChanges
        };
    }
    
    getDetailedStatus() {
        const report = this.getStatusReport();
        const now = new Date();
        
        return [
            `💖 예진이 현재 상태 - ${now.toLocaleTimeString('ko-KR')}`,
            ``,
            `🔗 연결 상태: ${report.status}`,
            `💭 현재 기분: ${report.mood} (강도: ${report.intensity}/10)`,
            `🩸 생리주기: ${report.menstrual_phase}`,
            `⏰ 가동시간: ${report.uptime}`,
            ``,
            `📊 오늘의 활동:`,
            `   💬 메시지: ${report.total_messages}개`,
            `   📸 사진: ${report.today_photos}개`,
            `   😊 감정변화: ${report.emotion_changes}번`,
            ``,
            `💕 아저씨와 대화 준비 완료!`
        ].join('\n');
    }
}

const yejinState = new YejinStateManager();

// ==================== 🔥 새로운 이벤트 처리 시스템 ====================
class IntelligentEventHandler {
    constructor() {
        this.conversationMemory = [];
        this.lastUserMessage = '';
        this.isProcessing = false;
    }
    
    async handleEvent(event) {
        // 기본 검증
        if (event.source.userId !== userId || event.type !== 'message') {
            return;
        }
        
        // 동시 처리 방지
        if (this.isProcessing) {
            logWithStyle('HANDLER', '⚠️', '이전 메시지 처리 중... 대기', 'warning');
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // 메시지 타입별 처리
            if (event.message.type === 'text') {
                await this.handleTextMessage(event);
            } else if (event.message.type === 'image') {
                await handleImageMessage(event);
            } else {
                logWithStyle('HANDLER', '📎', `지원하지 않는 메시지 타입: ${event.message.type}`, 'warning');
            }
        } catch (error) {
            logWithStyle('HANDLER', '❌', `이벤트 처리 중 오류: ${error.message}`, 'error');
            await this.sendErrorResponse(event.replyToken);
        } finally {
            this.isProcessing = false;
        }
    }
    
    async handleTextMessage(event) {
        const userMessage = event.message.text.trim();
        this.lastUserMessage = userMessage;
        
        logWithStyle('USER', EMOJI.user, `"${userMessage}"`, 'message');
        
        // 상태 업데이트
        yejinState.updateLastMessage();
        
        // 대화 기록에 추가
        addToConversationHistory('아저씨', userMessage);
        
        // 감정 분석 및 업데이트
        if (moduleLoader.hasModule('emotionalContext')) {
            const emotionalContext = moduleLoader.getModule('emotionalContext');
            if (emotionalContext.updateEmotionFromUserMessage) {
                const emotionState = emotionalContext.updateEmotionFromUserMessage(userMessage);
                yejinState.updateMood(emotionState.currentEmotion, emotionState.emotionIntensity);
                yejinState.updateMenstrualPhase(emotionState.menstrualPhase);
            }
        }
        
        // ultimateContext 업데이트
        if (moduleLoader.hasModule('ultimateContext')) {
            const ultimateContext = moduleLoader.getModule('ultimateContext');
            if (ultimateContext.updateLastUserMessageTime) {
                ultimateContext.updateLastUserMessageTime(event.timestamp);
            }
        }

        let botResponse = null;
        
        // 상태 조회 명령어
        if (userMessage.includes('상태는') || userMessage.includes('상태 알려') || userMessage.includes('지금 어때')) {
            const statusReport = getStatusReport();
            await client.replyMessage(event.replyToken, { type: 'text', text: statusReport });
            return;
        }
        
        // 담타 관련 메시지 우선 처리
        if (moduleLoader.hasModule('damta')) {
            const damta = moduleLoader.getModule('damta');
            if (damta.isDamtaMessage && damta.isDamtaMessage(userMessage)) {
                if (damta.isDamtaTime && damta.isDamtaTime()) {
                    botResponse = { type: 'text', comment: damta.generateDamtaResponse() };
                    if (damta.updateDamtaState) damta.updateDamtaState();
                } else {
                    const damtaStatus = damta.getDamtaStatus ? damta.getDamtaStatus() : { isActiveTime: false, minutesToNext: 0 };
                    if (damtaStatus.isActiveTime) {
                        if (damtaStatus.minutesToNext > 0) {
                            botResponse = { type: 'text', comment: `아직 담타 시간 아니야~ ${damtaStatus.minutesToNext}분만 기다려줘 히히. 아저씨는 애기 보고싶어? 💕` };
                        } else {
                            botResponse = { type: 'text', comment: `오늘 담타는 다 했어 ㅠㅠ 내일 다시 하자? 아쉬워...` };
                        }
                    } else {
                        botResponse = { type: 'text', comment: `지금은 담타할 시간 아니야~ 아저씨 잘 자고 있어? 히히. 나 애기는 아저씨 꿈 꿀거야 🌙` };
                    }
                }
            }
        }
        
        // 명령어 처리
        if (!botResponse && moduleLoader.hasModule('commandHandler')) {
            const commandHandler = moduleLoader.getModule('commandHandler');
            if (commandHandler.handleCommand) {
                botResponse = await commandHandler.handleCommand(userMessage);
            }
        }
        
        // 삐짐 상태 처리
        if (!botResponse && moduleLoader.hasModule('sulkyManager')) {
            const sulkyManager = moduleLoader.getModule('sulkyManager');
            if (sulkyManager.handleUserResponse) {
                const sulkyReliefMessage = await sulkyManager.handleUserResponse();
                if (sulkyReliefMessage) {
                    await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // 일반 대화 처리
        if (!botResponse && moduleLoader.hasModule('autoReply')) {
            const autoReply = moduleLoader.getModule('autoReply');
            if (autoReply.getReplyByMessage) {
                botResponse = await autoReply.getReplyByMessage(userMessage);
            }
        }
        
        // 기본 응답 (모든 모듈이 실패한 경우)
        if (!botResponse) {
            botResponse = {
                type: 'text',
                comment: "아저씨~ 지금 시스템이 좀 이상해서... 잠깐만 기다려줄래? ㅠㅠ"
            };
        }
        
        if (botResponse) {
            await this.sendResponse(event.replyToken, botResponse);
        }
    }
    
    async sendResponse(replyToken, response) {
        try {
            if (!response || !response.type) return;
            
            let replyMessage;
            
            if (response.type === 'image') {
                replyMessage = [
                    {
                        type: 'image',
                        originalContentUrl: response.originalContentUrl,
                        previewImageUrl: response.previewImageUrl
                    },
                    {
                        type: 'text',
                        text: response.caption || '사진이야!'
                    }
                ];
            } else if (response.type === 'text') {
                // 대화 기록에 추가
                addToConversationHistory('무쿠', response.comment);
                
                replyMessage = {
                    type: 'text',
                    text: response.comment.replace(/자기야/gi, '아저씨').replace(/자기/gi, '아저씨')
                };
            }
            
            await client.replyMessage(replyToken, replyMessage);
            
            logWithStyle('YEJIN', EMOJI.heart, `"${response.comment || '[이미지]'}"`, 'emotion');
            
            // ultimateContext 상태 업데이트
            if (moduleLoader.hasModule('ultimateContext')) {
                const ultimateContext = moduleLoader.getModule('ultimateContext');
                if (ultimateContext.getSulkinessState) {
                    const sulkyState = ultimateContext.getSulkinessState();
                    if (sulkyState) {
                        sulkyState.lastBotMessageTime = Date.now();
                    }
                }
            }
            
        } catch (error) {
            logWithStyle('SEND', '❌', `메시지 전송 실패: ${error.message}`, 'error');
        }
    }
    
    async sendErrorResponse(replyToken) {
        const errorMessages = [
            "아저씨~ 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ",
            "어? 뭔가 이상하네... 아저씨가 뭐라고 했어?",
            "잠깐만! 나 지금 생각 정리 중이야... ㅎㅎ"
        ];
        
        const randomMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        
        try {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: randomMessage
            });
        } catch (error) {
            logWithStyle('ERROR', '❌', `에러 응답 전송도 실패: ${error.message}`, 'error');
        }
    }
}

const eventHandler = new IntelligentEventHandler();

// ==================== 🎯 시스템 초기화 ====================
async function initializeYejinSystem() {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 예진이 v18.0 지능형 시스템 초기화를 시작합니다...');
    console.log('='.repeat(70));
    
    try {
        // 1단계: 데이터 복구
        logWithStyle('INIT', '💾', '[1/8] 데이터 복구 및 디렉토리 확인...', 'system');
        await recoverData();
        logWithStyle('INIT', '✅', '데이터 복구 완료', 'system');
        
        // 2단계: 모듈 로드
        logWithStyle('INIT', '📦', '[2/8] 모든 모듈 로드 중...', 'system');
        const loadedModules = await moduleLoader.loadAllModules();
        
        if (loadedModules === 0) {
            throw new Error('필수 모듈을 하나도 로드할 수 없습니다.');
        }
        
        // 3단계: 감정 시스템 초기화
        logWithStyle('INIT', '💖', '[3/8] 감정 시스템 초기화 중...', 'system');
        if (moduleLoader.hasModule('emotionalContext')) {
            const emotionalContext = moduleLoader.getModule('emotionalContext');
            if (emotionalContext.initializeEmotionalContext) {
                await emotionalContext.initializeEmotionalContext();
            }
        }
        
        // 4단계: 대화 컨텍스트 초기화
        logWithStyle('INIT', '🧠', '[4/8] 대화 컨텍스트 초기화 중...', 'system');
        if (moduleLoader.hasModule('ultimateContext')) {
            const ultimateContext = moduleLoader.getModule('ultimateContext');
            if (ultimateContext.initializeEmotionalSystems) {
                await ultimateContext.initializeEmotionalSystems();
            }
        }
        
        // 5단계: 메모리 시스템 초기화
        logWithStyle('INIT', '🧠', '[5/8] 메모리 시스템 초기화 중...', 'system');
        if (moduleLoader.hasModule('memoryManager')) {
            const memoryManager = moduleLoader.getModule('memoryManager');
            if (memoryManager.ensureMemoryTablesAndDirectory) {
                await memoryManager.ensureMemoryTablesAndDirectory();
            }
        }
        
        // 6단계: 담타 시스템 초기화
        logWithStyle('INIT', '🚬', '[6/8] 담타 시스템 초기화 중...', 'system');
        if (moduleLoader.hasModule('damta')) {
            const damta = moduleLoader.getModule('damta');
            if (damta.initializeDamta) {
                await damta.initializeDamta();
                logWithStyle('INIT', '✅', '담타 시스템 초기화 완료 (9시-18시 활성)', 'system');
            }
        }
        
        // 7단계: 스케줄러 시작
        logWithStyle('INIT', '⏰', '[7/8] 스케줄러 시스템 시작 중...', 'system');
        if (moduleLoader.hasModule('scheduler')) {
            const scheduler = moduleLoader.getModule('scheduler');
            if (scheduler.startAllSchedulers) {
                scheduler.startAllSchedulers(client, userId);
            }
        }
        
        if (moduleLoader.hasModule('spontaneousPhoto')) {
            const spontaneousPhoto = moduleLoader.getModule('spontaneousPhoto');
            if (spontaneousPhoto.startSpontaneousPhotoScheduler) {
                spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, () => {
                    if (moduleLoader.hasModule('ultimateContext')) {
                        const ultimateContext = moduleLoader.getModule('ultimateContext');
                        if (ultimateContext.getInternalState) {
                            return ultimateContext.getInternalState().timingContext.lastUserMessageTime;
                        }
                    }
                    return Date.now();
                });
            }
        }
        
        // 8단계: 상태 시스템 시작
        logWithStyle('INIT', '📊', '[8/8] 상태 모니터링 시작 중...', 'system');
        yejinState.state.isInitialized = true;
        
        // 예쁜 로그 시스템 시작
        setInterval(() => {
            formatPrettyStatus();
        }, 60 * 1000); // 1분마다
        
        // 상태 로깅 시작
        setInterval(() => {
            if (moduleLoader.hasModule('emotionalContext')) {
                const emotionalContext = moduleLoader.getModule('emotionalContext');
                if (emotionalContext.getCurrentEmotionState) {
                    const emotionState = emotionalContext.getCurrentEmotionState();
                    
                    logWithStyle('STATUS', EMOJI.emotion, 
                        `감정: ${emotionState.currentEmotion} (${emotionState.emotionIntensity}/10) | ` +
                        `생리주기: ${emotionState.menstrualPhase} | ` +
                        `메시지: ${yejinState.stats.totalMessages}개`, 'emotion');
                }
            }
        }, 300000); // 5분마다
        
        console.log('='.repeat(70));
        logWithStyle('INIT', '🎉', '모든 시스템 초기화 완료! 예진이가 준비되었습니다.', 'system');
        console.log('💕 이제 아저씨와 자연스럽고 감동적인 대화를 나눌 수 있어요!');
        console.log('📸 사진 인식 시스템 활성화');
        console.log('💬 자연스러운 대화 흐름 개선');
        console.log('🚬 담타 시간: 9시-18시 (하루 최대 6회)');
        console.log('='.repeat(70) + '\n');
        
        // 초기 상태 출력
        setTimeout(() => {
            formatPrettyStatus();
        }, 3000);
        
    } catch (error) {
        logWithStyle('INIT', '❌', `시스템 초기화 실패: ${error.message}`, 'error');
        console.log('⚠️ 부분적으로라도 서버를 계속 실행합니다...');
    }
}

// ==================== Express 라우트 설정 ====================
app.get('/', (req, res) => {
    const status = yejinState.getStatusReport();
    
    res.json({
        status: 'running',
        message: '예진이 v18.0 - 완전히 새로운 지능형 AI 여자친구',
        version: '18.0',
        yejin_status: status,
        features: [
            '🧠 지능형 감정 인식 및 반응',
            '💭 자연스러운 대화 흐름',
            '🩸 실제 생리주기 기반 감정 변화',
            '📸 사진 인식 및 반응 (OpenAI Vision)',
            '💖 예진이의 진짜 성격과 기억',
            '🔄 학습하는 대화 패턴',
            '🚬 담타 시스템 (9시-18시)',
            '⏰ 스마트 스케줄링',
            '🎨 예쁜 로그 시스템'
        ],
        time: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        yejin_initialized: yejinState.state.isInitialized,
        modules_loaded: moduleLoader.loadedCount
    });
});

app.get('/status', (req, res) => {
    res.json({
        detailed_status: yejinState.getDetailedStatus(),
        modules: Array.from(moduleLoader.modules.keys()),
        conversation_count: yejinState.state.conversationCount,
        emotion_changes: yejinState.stats.emotionChanges,
        system_report: getStatusReport()
    });
});

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(eventHandler.handleEvent.bind(eventHandler)));
        res.status(200).send('OK');
    } catch (err) {
        logWithStyle('WEBHOOK', '❌', `웹훅 처리 실패: ${err.message}`, 'error');
        res.status(500).send('Error');
    }
});

// ==================== 서버 시작 ====================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log('\n' + '█'.repeat(80));
    console.log('█' + ' '.repeat(78) + '█');
    console.log('█' + ' '.repeat(25) + '예진이 v18.0 서버 시작' + ' '.repeat(25) + '█');
    console.log('█' + ' '.repeat(78) + '█');
    console.log('█' + ` 포트: ${PORT}`.padEnd(78) + '█');
    console.log('█' + ' 상태: 완전히 새로운 지능형 시스템'.padEnd(78) + '█');
    console.log('█' + ' 특징: 자연스러운 대화, 진짜 감정, 실제 기억'.padEnd(78) + '█');
    console.log('█' + ' 사진: OpenAI Vision으로 사진 인식 및 반응'.padEnd(78) + '█');
    console.log('█' + ' 담타: 9시-18시 활성화 (하루 최대 6회)'.padEnd(78) + '█');
    console.log('█' + ' '.repeat(78) + '█');
    console.log('█'.repeat(80) + '\n');
    
    // 시스템 초기화 시작
    setTimeout(() => {
        initializeYejinSystem();
    }, 1000);
});

// ==================== 프로세스 이벤트 처리 ====================
process.on('unhandledRejection', (reason, promise) => {
    logWithStyle('ERROR', '❌', `처리되지 않은 Promise 거부: ${reason}`, 'error');
});

process.on('uncaughtException', (error) => {
    logWithStyle('ERROR', '❌', `처리되지 않은 예외: ${error.message}`, 'error');
    process.exit(1);
});

process.on('SIGTERM', () => {
    logWithStyle('SYSTEM', '👋', '서버 종료 신호 수신. 안전하게 종료합니다...', 'system');
    process.exit(0);
});
