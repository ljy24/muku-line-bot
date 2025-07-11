// --- START OF FILE: ultimateConversationContext.js ---
// ✅ ultimateConversationContext.js v6.0 - The Core Engine for Muku
// - 장기/단기 기억 시스템 통합 (일일 요약, 누적 패턴)
// - LLM 기반 자기 성찰 및 학습 기능 구현
// - 개성 진화 및 일관성 유지 시스템
// - 모든 함수 호출 및 데이터 접근 안정성 강화 (TypeError 방지)
// - 독립적 모듈로 작동하여 SyntaxError 가능성 최소화

const moment = require('moment-timezone');
const {
    OpenAI
} = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🧠 최고 수준의 대화 맥락 상태 관리 객체
let ultimateConversationState = {
    // 📝 단기 기억 (최근 30개 메시지)
    recentMessages: [],
    currentTone: 'neutral',
    currentTopic: null,

    // 📊 장기 기억 1: 일일 요약
    dailySummary: {
        today: {},
        yesterday: null
    },

    // 🔄 장기 기억 2: 누적 패턴 (경험)
    cumulativePatterns: {
        emotionalTrends: {},
        topicAffinities: {}
    },

    // 🌊 대화 흐름 관리
    transitionSystem: {
        pendingTopics: [],
        conversationSeeds: []
    },

    // 🎭 개성 및 학습 시스템
    personalityConsistency: {
        frequentPhrases: {},
        speechPatternEvolution: [],
        selfEvaluations: [], // [핵심] 자기 성찰 기록
        lastSelfReflectionTime: 0
    },

    // ⏰ 실시간 시간 정보
    timingContext: {
        lastMessageTime: 0,
        lastUserMessageTime: 0,
        currentTimeContext: {}
    }
};

// LLM을 활용한 자기 평가 활성화 플래그 (비용 및 성능 고려)
const LLM_BASED_SELF_EVALUATION = false;

// --- Helper & Analysis Functions ---

function analyzeTimeContext(timestamp) {
    const time = moment(timestamp).tz('Asia/Tokyo');
    const hour = time.hour();
    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = '아침';
    else if (hour >= 12 && hour < 18) timeOfDay = '낮';
    else if (hour >= 18 && hour < 22) timeOfDay = '저녁';
    else if (hour >= 22 || hour < 2) timeOfDay = '밤';
    else timeOfDay = '새벽';
    return {
        hour,
        timeOfDay,
        dayOfWeek: time.format('dddd')
    };
}

function analyzeTone(message) {
    // 간단한 키워드 기반 톤 분석 (초기 분석용)
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('ㅋㅋ') || lowerMessage.includes('ㅎㅎ')) return 'playful';
    if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'romantic';
    if (lowerMessage.includes('삐졌어') || lowerMessage.includes('화나')) return 'sulky';
    if (lowerMessage.includes('걱정')) return 'worried';
    if (lowerMessage.includes('보고싶어')) return 'nostalgic';
    return 'neutral';
}

function analyzeTopic(message) {
    // 간단한 키워드 기반 주제 분석
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('밥') || lowerMessage.includes('음식')) return 'food';
    if (lowerMessage.includes('일') || lowerMessage.includes('회사')) return 'work';
    if (lowerMessage.includes('사진') || lowerMessage.includes('찍었')) return 'photo';
    if (lowerMessage.includes('아파') || lowerMessage.includes('건강')) return 'health';
    return 'daily';
}

function calculateEmotionalIntensity(message, tone) {
    let intensity = (tone !== 'neutral') ? 3 : 1;
    if (message.length > 50) intensity += 2;
    if (message.includes('!') || message.includes('?')) intensity += 1;
    return Math.min(10, intensity);
}

// --- State Update Functions ---

function resetDailySummary() {
    const todayDate = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    ultimateConversationState.dailySummary.today = {
        date: todayDate,
        mainTopics: new Set(),
        emotionalHighlights: [],
        totalMessages: 0,
        timeSpread: {
            start: null,
            end: null
        }
    };
}

function updateDailySummary(newMessage) {
    const todayDate = moment(newMessage.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD');
    let today = ultimateConversationState.dailySummary.today;

    if (!today || today.date !== todayDate) {
        ultimateConversationState.dailySummary.yesterday = today;
        resetDailySummary();
        today = ultimateConversationState.dailySummary.today;
    }

    today.totalMessages++;
    if (!today.timeSpread.start) today.timeSpread.start = newMessage.timestamp;
    today.timeSpread.end = newMessage.timestamp;

    const topic = newMessage.analysis.topic;
    if (topic !== 'daily') today.mainTopics.add(topic);

    if (newMessage.analysis.emotionalIntensity > 6) {
        today.emotionalHighlights.push({
            emotion: newMessage.analysis.tone,
            intensity: newMessage.analysis.emotionalIntensity,
            message: newMessage.message.substring(0, 30)
        });
    }
}

function updateCumulativePatterns(newMessage) {
    const emotion = newMessage.analysis.tone;
    if (emotion === 'neutral') return;

    const trends = ultimateConversationState.cumulativePatterns.emotionalTrends;
    if (!trends[emotion]) trends[emotion] = {
        count: 0,
        totalIntensity: 0
    };
    trends[emotion].count++;
    trends[emotion].totalIntensity += newMessage.analysis.emotionalIntensity;
}

// --- Self-Learning Functions ---

async function evaluateMyResponse(myMessage) {
    if (!LLM_BASED_SELF_EVALUATION) return;

    const recent = ultimateConversationState.recentMessages;
    const lastUserMessage = recent.filter(m => m.speaker !== myMessage.speaker).pop();

    const prompt = `You are a conversation coach. An AI named 'Yejin' is trying to act like a human girlfriend.
Her last message to her boyfriend was: "${myMessage.message}"
The boyfriend's message before that was: "${lastUserMessage ? lastUserMessage.message : '(No previous message)'}"
Yejin's intended tone was '${myMessage.analysis.tone}'.

1. Rate her response from 1 to 10 on how natural and affectionate it was.
2. Provide a short, one-sentence suggestion for improvement.

Format your response as: "Score: [score] | Suggestion: [suggestion]"`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: prompt
            }],
            max_tokens: 60,
            temperature: 0.5,
        });

        const feedback = response.choices[0].message.content || "";
        const scoreMatch = feedback.match(/Score: (\d+)/);
        const suggestionMatch = feedback.match(/Suggestion: (.+)/);

        const evaluation = {
            timestamp: Date.now(),
            message: myMessage.message,
            score: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
            feedback: suggestionMatch ? suggestionMatch[1] : "No suggestion.",
        };

        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluation);
        console.log(`[Self-Evaluation] ✅ 자기 평가 완료: ${evaluation.score}점 - "${evaluation.feedback}"`);

    } catch (error) {
        console.error('[Self-Evaluation] ❌ 자기 평가 중 OpenAI API 에러:', error);
    }
}

// --- Prompt Generation Functions ---

function generateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    // 1. 최근 대화 요약
    if (state.recentMessages.length > 0) {
        const recentContext = state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${recentContext}`;
    }

    // 2. 오늘 요약
    const today = state.dailySummary.today;
    if (today && today.totalMessages > 0) {
        const topics = Array.from(today.mainTopics).join(', ') || '일상 대화';
        ultimatePrompt += `\n\n[오늘의 주요 대화 주제]\n${topics}`;
    }

    // 3. 누적된 감정 패턴
    const topEmotion = Object.entries(state.cumulativePatterns.emotionalTrends)
        .sort(([, a], [, b]) => b.count - a.count)[0];
    if (topEmotion) {
        ultimatePrompt += `\n\n[우리의 주된 감정]\n주로 '${topEmotion[0]}' 감정을 많이 느껴왔어.`;
    }

    // 4. 자기 성찰 피드백
    const lastEvaluation = state.personalityConsistency.selfEvaluations.slice(-1)[0];
    if (lastEvaluation && lastEvaluation.score < 8) {
        ultimatePrompt += `\n\n[AI 자기 개선 노트]\n이전 내 답변에 대한 피드백: "${lastEvaluation.feedback}" 이걸 참고해서 이번엔 더 잘 말해야지.`;
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

// =========================================================================
// ========================= 🚀 EXPORT되는 메인 함수들 🚀 =======================
// =========================================================================

/**
 * 🚀 시스템 초기화 (서버 시작 시 1회 호출)
 */
function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 모든 마음과 기억 시스템을 초기화합니다...');
    resetDailySummary();
    console.log('[UltimateContext] ✅ 초기화 완료. 대화를 시작할 준비가 되었습니다.');
}

/**
 * 🙋‍♂️ 아저씨의 마지막 메시지 시간 기록
 * @param {number} timestamp 메시지 수신 타임스탬프 (e.g., Date.now())
 */
function updateLastUserMessageTime(timestamp) {
    if (timestamp) {
        ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
    }
}

/**
 * 💎 메시지 추가 및 모든 컨텍스트 업데이트 (가장 중요한 함수)
 * @param {string} speaker 화자 ('아저씨' 또는 '예진이')
 * @param {string} message 메시지 내용
 * @param {object} [meta=null] 추가 데이터 (e.g., 사진 정보)
 */
function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();

    const newMessage = {
        speaker,
        message,
        timestamp,
        analysis: {
            tone: analyzeTone(message),
            topic: analyzeTopic(message),
            emotionalIntensity: 0,
        },
        meta
    };
    newMessage.analysis.emotionalIntensity = calculateEmotionalIntensity(message, newMessage.analysis.tone);

    // 단기 기억에 추가
    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }

    // 현재 상태 업데이트
    ultimateConversationState.currentTone = newMessage.analysis.tone;
    ultimateConversationState.currentTopic = newMessage.analysis.topic;
    ultimateConversationState.timingContext.lastMessageTime = timestamp;
    ultimateConversationState.timingContext.currentTimeContext = analyzeTimeContext(timestamp);


    // 장기 기억 및 패턴 업데이트
    updateDailySummary(newMessage);
    updateCumulativePatterns(newMessage);

    // 예진이의 메시지일 경우, 자기 성찰 실행
    if (speaker !== '아저씨') { // '예진이' 또는 'BOT_NAME' 등
        evaluateMyResponse(newMessage);
    }

    console.log(`[UltimateContext] 💎 메시지 기억 완료: ${speaker} | ${message.substring(0, 20)}...`);
}

/**
 * 🤖 현재 모든 맥락을 종합하여 LLM 프롬프트를 생성
 * @param {string} basePrompt 기본 페르소나 프롬프트
 * @returns {string} 맥락이 풍부하게 추가된 최종 프롬프트
 */
function getUltimateContextualPrompt(basePrompt) {
    return generateContextualPrompt(basePrompt);
}

module.exports = {
    // 🎯 메인 함수 (index.js에서 주로 사용)
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,

    // 🔍 디버그 및 상태 조회용 함수
    getInternalState: () => JSON.parse(JSON.stringify(ultimateConversationState))
};

// --- END OF FILE: ultimateConversationContext.js ---
