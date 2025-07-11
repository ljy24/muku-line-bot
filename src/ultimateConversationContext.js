// src/ultimateConversationContext.js v5.2 - 최종 수정본
// 🆕 모든 에러 해결 및 안전성 강화 (옵셔널 체이닝 적용)
// 🛠️ 모든 핵심 함수 완벽 구현 및 모듈화

const moment = require('moment-timezone'); // Moment.js 라이브러리 (날짜/시간 처리)
const {
    OpenAI
} = require('openai'); // OpenAI API 클라이언트 (LLM 평가용)
require('dotenv').config(); // .env 파일 로드

// OpenAI 클라이언트 초기화 (LLM 평가용)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🧠 최고 수준의 대화 맥락 상태 관리 객체
let ultimateConversationState = {
    // 📝 확장된 단기 기억 (30개)
    recentMessages: [], // 최근 30개 메시지 객체 저장
    currentTone: 'neutral', // 현재 대화 톤
    currentTopic: null, // 현재 주제

    // 📊 하루/세션 요약 시스템
    dailySummary: {
        today: {
            date: null,
            mainTopics: [],
            emotionalHighlights: [],
            conversationCount: 0,
            totalMessages: 0,
            timeSpread: {
                start: null,
                end: null
            },
            moodProgression: [],
            specialMoments: [],
            unfinishedBusiness: []
        },
        yesterday: null, // 어제 요약 (비교용)
        weeklyPattern: {} // 주간 패턴
    },

    // 🔄 누적 감정 & 패턴 분석
    cumulativePatterns: {
        emotionalTrends: {}, // 감정별 누적 기록
        topicAffinities: {}, // 주제별 선호도
        communicationRhythms: {},
        relationshipDynamics: {},
        personalGrowth: [],
        conflictResolutionStyle: {},
        intimacyLevels: []
    },

    // ⏰ 실시간 타이밍 & 컨텍스트
    timingContext: {
        lastMessageTime: 0, // '모든' 마지막 메시지 타임스탬프
        lastUserMessageTime: 0, // [수정] '아저씨의' 마지막 메시지 타임스탬프
        responseDelayPattern: [],
        timeOfDayMoods: {},
        silentPeriods: [],
        rapidFireSessions: [],
        weekdayVsWeekend: {},
        seasonalMoods: {},
        currentTimeContext: {
            timeOfDay: null,
            isWorkHours: false,
            dayOfWeek: null,
            isHoliday: false,
            weatherMood: null
        }
    },

    // 🌊 자연스러운 전환 & 연결 시스템
    transitionSystem: {
        pendingTopics: [],
        naturalBridges: [],
        conversationSeeds: [],
        callbackReferences: [],
        runningJokes: [],
        sharedMemories: [],
        emotionalCarryovers: []
    },

    // 🎭 예진이의 개성 & 일관성 (페르소나 유지 및 진화)
    personalityConsistency: {
        frequentPhrases: {},
        emotionalReactionStyle: {},
        topicReactionMemory: {},
        speechPatternEvolution: [],
        characterTraits: {},
        quirksAndHabits: [],
        personalBoundaries: [],
        selfEvaluations: [],
        lastSelfReflectionTime: 0
    }
};

// LLM을 활용한 평가 활성화 플래그
const LLM_BASED_EVALUATION = false;

// --- 헬퍼 및 분석 함수들 ---

function analyzeTimeContext(timestamp) {
    const moment_time = moment(timestamp).tz('Asia/Tokyo');
    const hour = moment_time.hour();
    const dayOfWeek = moment_time.format('dddd');
    const isWeekend = ['Saturday', 'Sunday'].includes(dayOfWeek);

    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = '아침';
    else if (hour >= 12 && hour < 18) timeOfDay = '낮';
    else if (hour >= 18 && hour < 22) timeOfDay = '저녁';
    else if (hour >= 22 || hour < 2) timeOfDay = '밤';
    else timeOfDay = '새벽';

    return {
        hour,
        timeOfDay,
        dayOfWeek,
        isWeekend,
        isWorkHours: hour >= 9 && hour <= 18 && !isWeekend,
        contextualTime: `${timeOfDay} (${hour}시)`
    };
}

function analyzeTone(message) {
    const TONE_PATTERNS = {
        playful: {
            keywords: ['ㅋㅋ', 'ㅎㅎ', '자랑', '찍는다', '헐', '뭐야', '어머', '진짜?', '대박'],
            patterns: /[ㅋㅎ]+|자랑|찍는다|헐|뭐야|어머|진짜\?|대박/g
        },
        romantic: {
            keywords: ['사랑해', '좋아해', '아저씨', '내꺼', '우리', '함께', '같이', '두근', '설레'],
            patterns: /사랑해|좋아해|아저씨|내꺼|우리|함께|같이|두근|설레/g
        },
        sulky: {
            keywords: ['삐졌어', '화나', '서운해', '무시', '답장', '왜', '흥', '칫', '짜증'],
            patterns: /삐졌어|화나|서운해|무시|답장|왜|흥|칫|짜증/g
        },
        worried: {
            keywords: ['걱정', '무슨일', '괜찮', '안전', '어디야', '뭐해', '불안', '초조'],
            patterns: /걱정|무슨일|괜찮|안전|어디야|뭐해|불안|초조/g
        },
        excited: {
            keywords: ['와', '우와', '대박', '진짜', '완전', '너무', '최고', '신나', '행복'],
            patterns: /와+|우와|대박|진짜|완전|너무|최고|신나|행복/g
        },
        nostalgic: {
            keywords: ['보고싶어', '그리워', '예전에', '기억나', '추억', '그때', '옛날', '아련'],
            patterns: /보고싶어|그리워|예전에|기억나|추억|그때|옛날|아련/g
        }
    };
    let maxScore = 0;
    let detectedTone = 'neutral';
    const lowerMessage = message.toLowerCase();
    for (const [tone, config] of Object.entries(TONE_PATTERNS)) {
        let score = 0;
        config.keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score += 2;
        });
        if (config.patterns) {
            const matches = lowerMessage.match(config.patterns);
            if (matches) score += matches.length;
        }
        if (score > maxScore) {
            maxScore = score;
            detectedTone = tone;
        }
    }
    return maxScore > 0 ? detectedTone : 'neutral';
}

function analyzeTopic(message) {
    const TOPIC_PATTERNS = {
        food: ['먹었어', '음식', '밥', '요리', '맛있', '배고파', '식당', '디저트', '카페'],
        work: ['일', '회사', '업무', '바빠', '피곤', '회의', '출근', '퇴근', '프로젝트'],
        health: ['운동', '다이어트', '아파', '건강', '병원', '약', '몸', '컨디션'],
        daily: ['오늘', '어제', '내일', '날씨', '집', '잠', '일어나', '일상'],
        relationship: ['친구', '가족', '엄마', '아빠', '사람들', '만나', '우리', '연애'],
        hobby: ['게임', '영화', '음악', '책', '여행', '쇼핑', '사진', '취미'],
        future: ['계획', '예정', '할거야', '갈거야', '생각중', '고민', '미래'],
        photo: ['사진', '찍는', '찍었', '보여줘', '셀카', '컨셉', '추억', '앨범', '화보', '필름', '카메라', '작가', '모델'],
        finance: ['돈', '월급', '세금', '주식', '투자', '부자', '재테크'],
        fashion: ['옷', '스타일', '코트', '원피스', '패딩', '신발', '모자']
    };
    let maxScore = 0;
    let detectedTopic = 'general';
    const lowerMessage = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
        let score = 0;
        keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score++;
        });
        if (score > maxScore) {
            maxScore = score;
            detectedTopic = topic;
        }
    }
    return maxScore > 0 ? detectedTopic : 'general';
}

function analyzeToneAdvanced(message) {
    const basicTone = analyzeTone(message);
    return {
        primary: basicTone,
        secondary: [], // For future expansion
        intensity: calculateEmotionalIntensity(message, basicTone),
    };
}

function analyzeTopicAdvanced(message) {
    const primaryTopic = analyzeTopic(message);
    return {
        primary: primaryTopic,
        secondary: [], // For future expansion
    };
}

function calculateEmotionalIntensity(message, emotionalTone) {
    let intensity = 1;
    const toneIntensities = {
        'playful': 3,
        'romantic': 8,
        'sulky': 7,
        'worried': 6,
        'excited': 7,
        'nostalgic': 6,
        'neutral': 1
    };
    intensity = toneIntensities[emotionalTone] || 1;
    if (message.length > 50) intensity += 1;
    if (message.includes('!!!')) intensity += 1;
    if (/[ㅋㅎ]{3,}/.test(message)) intensity += 1;
    return Math.min(10, Math.max(1, intensity));
}

function calculateResponseSpeed(currentTimestamp) {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return 'normal';
    const lastMessage = recent[recent.length - 1];
    const seconds = Math.floor((currentTimestamp - lastMessage.timestamp) / 1000);
    if (seconds < 5) return 'instant';
    if (seconds < 30) return 'quick';
    if (seconds < 120) return 'normal';
    if (seconds < 600) return 'delayed';
    return 'slow';
}

function extractPersonalityMarkers(message) {
    const markers = [];
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('아저씨')) markers.push('애칭_사용');
    if (/[ㅋㅎ]+/.test(lowerMessage)) markers.push('웃음_표현');
    if (/[~]+/.test(lowerMessage)) markers.push('애교_톤');
    if (/[?!]{2,}/.test(lowerMessage)) markers.push('강조_표현');
    if (lowerMessage.includes('사랑') || lowerMessage.includes('좋아해')) markers.push('애정_표현');
    if (lowerMessage.includes('삐졌') || lowerMessage.includes('화났') || lowerMessage.includes('서운')) markers.push('투정_표현');
    if (lowerMessage.includes('ㅠㅠ') || lowerMessage.includes('힝')) markers.push('슬픔/애교_이모지');
    return markers;
}

function determineConversationRole(message, speaker) {
    const lowerMessage = message.toLowerCase();
    if (speaker === '아저씨') {
        if (lowerMessage.includes('?')) return 'questioning';
        return 'commenting';
    } else { // 예진이
        if (lowerMessage.includes('?')) return 'asking_back';
        if (/[ㅋㅎ]+/.test(lowerMessage)) return 'playful_response';
        if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'affectionate_response';
        const recent = ultimateConversationState.recentMessages;
        if (recent.length > 0 && recent[recent.length - 1].speaker !== '예진이') {
            const prevMsg = recent[recent.length - 1];
            // [수정] 옵셔널 체이닝(?.)으로 안정성 강화
            if (prevMsg.messageAnalysis?.conversationRole !== 'questioning' &&
                prevMsg.messageAnalysis?.conversationRole !== 'asking_back') {
                return 'initiating_new';
            }
        }
        return 'responding';
    }
}

// --- 상태 업데이트 핵심 함수들 ---

function updateDailySummary(newMessage) {
    const todayDate = moment(newMessage.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD');
    const summary = ultimateConversationState.dailySummary.today;

    if (summary.date && summary.date !== todayDate) {
        ultimateConversationState.dailySummary.yesterday = { ...summary
        };
        resetDailySummary();
    }
    if (!summary.date) {
        summary.date = todayDate;
        summary.timeSpread.start = newMessage.timestamp;
    }

    summary.timeSpread.end = newMessage.timestamp;
    summary.totalMessages++;

    const topic = newMessage.messageAnalysis.topic.primary;
    if (topic !== 'general' && !summary.mainTopics.includes(topic)) {
        summary.mainTopics.push(topic);
    }
}

function updateCumulativePatterns(newMessage) {
    const patterns = ultimateConversationState.cumulativePatterns;
    const emotion = newMessage.messageAnalysis.tone.primary;
    const intensity = newMessage.messageAnalysis.emotionalIntensity;

    if (emotion === 'neutral') return;

    if (!patterns.emotionalTrends[emotion]) {
        patterns.emotionalTrends[emotion] = {
            totalCount: 0,
            totalIntensity: 0,
            averageIntensity: 0
        };
    }
    const trend = patterns.emotionalTrends[emotion];
    trend.totalCount++;
    trend.totalIntensity += intensity;
    trend.averageIntensity = trend.totalIntensity / trend.totalCount;
}

/**
 * [신규] 아저씨가 마지막으로 메시지를 보낸 시간을 업데이트합니다.
 */
function updateLastUserMessageTime(timestamp) {
    if (!timestamp) return;
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
    console.log(`[UltimateContext] 🙋‍♂️ 아저씨 마지막 메시지 시간 업데이트: ${moment(timestamp).format('HH:mm:ss')}`);
}

function updateTimingContext(newMessage) {
    ultimateConversationState.timingContext.lastMessageTime = newMessage.timestamp;
    ultimateConversationState.timingContext.currentTimeContext = newMessage.timeInfo;
}

async function evaluateMyResponse(myMessage) {
    if (LLM_BASED_EVALUATION) {
        // LLM 기반 평가 로직 (필요시 구현)
        console.log('[Self-Evaluation] LLM 평가는 현재 비활성화 상태입니다.');
    } else {
        // 규칙 기반 평가 로직
        const score = (myMessage.message.includes('아저씨') ? 3 : 0) + (myMessage.messageAnalysis.emotionalIntensity);
        const feedback = score > 7 ? '아주 좋은 반응이었어!' : '평범한 반응이었네.';
        ultimateConversationState.personalityConsistency.selfEvaluations.push({
            score: Math.min(10, score),
            feedback: feedback
        });
    }
}


// --- 요약 및 프롬프트 생성 함수들 ---

function generateRecentConversationSummary() {
    const recent = ultimateConversationState.recentMessages.slice(-8);
    if (recent.length === 0) return null;
    return recent.map(msg =>
        `${msg.speaker}: "${msg.message.length > 40 ? msg.message.substring(0, 40) + '...' : msg.message}" (톤: ${msg.messageAnalysis.tone.primary})`
    ).join('\n');
}

function generateTodaySummary() {
    const today = ultimateConversationState.dailySummary.today;
    if (!today.date) return null;
    const topics = today.mainTopics.length > 0 ? today.mainTopics.join(', ') : '일상 대화';
    const timeSpan = today.timeSpread.start ? `${moment(today.timeSpread.start).format('HH:mm')}~${moment(today.timeSpread.end).format('HH:mm')}` : "정보 없음";
    return `오늘 주제: ${topics}, 대화 시간: ${timeSpan}, 총 ${today.totalMessages}개 메시지`;
}

function generatePersonalityGuide() {
    let guide = '예진이 특유의 애교 있고 사랑스러운 말투와 아저씨에 대한 애정을 자연스럽게 표현해줘.';
    const recentMessages = ultimateConversationState.recentMessages.filter(m => m.speaker === '예진이').slice(-10);
    if (recentMessages.length >= 5) {
        const avgAegyo = recentMessages.reduce((sum, msg) => sum + (extractPersonalityMarkers(msg.message).includes('애교_톤') ? 1 : 0), 0) / recentMessages.length;
        if (avgAegyo < 0.3) {
            guide += ` **최근 내 말투에서 애교가 부족했어! 이번엔 애교를 듬뿍 담아줘.**`;
        }
    }
    return guide;
}

// --- 상태 관리 함수들 ---

function resetDailySummary() {
    ultimateConversationState.dailySummary.today = {
        date: null,
        mainTopics: [],
        emotionalHighlights: [],
        conversationCount: 0,
        totalMessages: 0,
        timeSpread: {
            start: null,
            end: null
        },
        moodProgression: [],
        specialMoments: [],
        unfinishedBusiness: []
    };
}

function resetUltimateState() {
    console.log('[UltimateContext] 🔄 전체 상태 리셋');
    ultimateConversationState.recentMessages = [];
    ultimateConversationState.currentTone = 'neutral';
    ultimateConversationState.currentTopic = null;
    resetDailySummary();
    ultimateConversationState.cumulativePatterns = {
        emotionalTrends: {},
        topicAffinities: {}
    };
    ultimateConversationState.timingContext = {
        ...ultimateConversationState.timingContext,
        lastMessageTime: 0,
        lastUserMessageTime: 0,
        currentTimeContext: {}
    };
    ultimateConversationState.personalityConsistency.selfEvaluations = [];
}

/**
 * [신규] 대화 시스템 초기화 함수
 */
function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 모든 감정 시스템을 초기화합니다...');
    resetUltimateState();
    console.log('[UltimateContext] ✅ 초기화 완료. 시스템이 준비되었습니다.');
}


// =========================================================================
// ========================= 🚀 EXPORT되는 메인 함수들 🚀 =======================
// =========================================================================

/**
 * 🧠 대화 메시지를 추가하고 모든 컨텍스트 상태를 업데이트합니다.
 * @param {string} speaker 화자 ('아저씨' 또는 '예진이')
 * @param {string} message 메시지 내용
 * @param {object} meta 메시지 메타데이터 (e.g., 사진 정보)
 */
function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    const timeInfo = analyzeTimeContext(timestamp);

    const messageAnalysis = {
        tone: analyzeToneAdvanced(message),
        topic: analyzeTopicAdvanced(message),
        emotionalIntensity: 0,
        responseSpeed: calculateResponseSpeed(timestamp),
        personalityMarkers: extractPersonalityMarkers(message),
        conversationRole: determineConversationRole(message, speaker)
    };
    messageAnalysis.emotionalIntensity = calculateEmotionalIntensity(message, messageAnalysis.tone.primary);

    const enhancedMessage = {
        speaker,
        message,
        timestamp,
        timeInfo,
        messageAnalysis,
        meta
    };

    ultimateConversationState.recentMessages.push(enhancedMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }

    // 상태 업데이트 함수 호출
    updateDailySummary(enhancedMessage);
    updateCumulativePatterns(enhancedMessage);
    updateTimingContext(enhancedMessage);

    if (speaker === '예진이') {
        evaluateMyResponse(enhancedMessage);
    }
    console.log(`[UltimateContext] 💎 메시지 저장: ${speaker} | ${message.substring(0,20)}...`);
    return enhancedMessage;
}

/**
 * 🤖 현재 맥락에 맞는 LLM 프롬프트를 생성합니다.
 * @param {string} basePrompt 기본 페르소나 및 지시 프롬프트
 * @returns {string} 모든 맥락 정보가 포함된 확장된 프롬프트
 */
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;

    const contextPrompts = {
        "최근 대화 흐름": generateRecentConversationSummary(),
        "오늘 대화 요약": generateTodaySummary(),
        "개성 유지 가이드": generatePersonalityGuide(),
    };

    for (const [title, content] of Object.entries(contextPrompts)) {
        if (content) {
            ultimatePrompt += `\n\n[${title}]\n${content}`;
        }
    }

    ultimatePrompt += "\n\n[최종 지시]: 위의 모든 맥락과 지시사항을 종합하여 가장 예진이스럽고 사람다운 답변을 해줘.";
    return ultimatePrompt;
}


module.exports = {
    // 🎯 메인 함수 (입력/출력)
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,

    // 📊 상태 관리
    resetUltimateState,
    getUltimateStateSummary: () => JSON.stringify(ultimateConversationState, null, 2), // 디버그용

    // ⚡ 실시간 정보 조회
    get currentState() {
        return {
            recentMessageCount: ultimateConversationState.recentMessages.length,
            currentTone: ultimateConversationState.currentTone,
            currentTopic: ultimateConversationState.currentTopic,
            todayMessageCount: ultimateConversationState.dailySummary.today.totalMessages,
        };
    }
};
