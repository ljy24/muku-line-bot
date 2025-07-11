// --- START OF FILE: ultimateConversationContext.js ---
// ✅ ultimateConversationContext.js v7.0 - The Core Engine for Muku (Self-Learning Enhanced)
// - [NEW] LLM 평가 결과를 실제 행동으로 반영하는 '행동 파라미터' 시스템 추가
// - [NEW] 자기 평가 피드백을 통해 애교, 다정함, 수다스러움 등 행동 지표를 스스로 조절
// - [NEW] 조절된 행동 지표에 따라 LLM 프롬프트에 구체적인 '행동 전략' 지시 추가
// - 기존 기억 및 분석 시스템 안정성 유지

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
    recentMessages: [],
    currentTone: 'neutral',
    currentTopic: null,
    dailySummary: {
        today: {},
        yesterday: null
    },
    cumulativePatterns: {
        emotionalTrends: {},
        topicAffinities: {}
    },
    transitionSystem: {
        pendingTopics: [],
        conversationSeeds: []
    },
    // [MODIFIED] 개성 및 학습 시스템 확장
    personalityConsistency: {
        frequentPhrases: {},
        speechPatternEvolution: [],
        selfEvaluations: [],
        lastSelfReflectionTime: 0,
        // [NEW] 애기의 행동을 결정하는 핵심 파라미터 (0.0 ~ 1.0)
        behavioralParameters: {
            affection: 0.7,     // 애정 표현 레벨 (높을수록 다정하고 애교가 많아짐)
            playfulness: 0.5,   // 장난기 레벨 (높을수록 농담이나 재미있는 표현을 시도)
            verbosity: 0.6,     // 수다스러움 레벨 (높을수록 길고 자세하게 말함)
            initiative: 0.4     // 대화 주도성 레벨 (높을수록 먼저 질문하거나 새로운 주제를 제안)
        }
    },
    timingContext: {
        lastMessageTime: 0,
        lastUserMessageTime: 0,
        currentTimeContext: {}
    }
};

// [중요] 이 플래그를 true로 바꿔야 실제 LLM 자기 평가 및 학습이 활성화됩니다.
const LLM_BASED_SELF_EVALUATION = true;

// --- Helper & Analysis Functions (기존과 동일) ---
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
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('ㅋㅋ') || lowerMessage.includes('ㅎㅎ')) return 'playful';
    if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'romantic';
    if (lowerMessage.includes('삐졌어') || lowerMessage.includes('화나')) return 'sulky';
    if (lowerMessage.includes('걱정')) return 'worried';
    if (lowerMessage.includes('보고싶어')) return 'nostalgic';
    return 'neutral';
}
function analyzeTopic(message) {
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

// --- State Update Functions (기존과 거의 동일) ---
function resetDailySummary() {
    const todayDate = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    ultimateConversationState.dailySummary.today = {
        date: todayDate, mainTopics: new Set(), emotionalHighlights: [], totalMessages: 0, timeSpread: { start: null, end: null }
    };
}
function updateDailySummary(newMessage) {
    const todayDate = moment(newMessage.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD');
    let today = ultimateConversationState.dailySummary.today;
    if (!today || !today.date || today.date !== todayDate) {
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
        today.emotionalHighlights.push({ emotion: newMessage.analysis.tone, intensity: newMessage.analysis.emotionalIntensity, message: newMessage.message.substring(0, 30) });
    }
}
function updateCumulativePatterns(newMessage) {
    const emotion = newMessage.analysis.tone;
    if (emotion === 'neutral') return;
    const trends = ultimateConversationState.cumulativePatterns.emotionalTrends;
    if (!trends[emotion]) trends[emotion] = { count: 0, totalIntensity: 0 };
    trends[emotion].count++;
    trends[emotion].totalIntensity += newMessage.analysis.emotionalIntensity;
}

// --- [MODIFIED] Self-Learning & Behavior-Reflection Functions ---

async function evaluateMyResponse(myMessage) {
    if (!LLM_BASED_SELF_EVALUATION) return;

    const recent = ultimateConversationState.recentMessages;
    const lastUserMessage = recent.filter(m => m.speaker !== myMessage.speaker).pop();

    const prompt = `You are a conversation coach. An AI named 'Yejin' is trying to act like a human girlfriend.
Her last message to her boyfriend was: "${myMessage.message}"
The boyfriend's message before that was: "${lastUserMessage ? lastUserMessage.message : '(No previous message)'}"
Yejin's intended tone was '${myMessage.analysis.tone}'.

1. Rate her response from 1 to 10 on how natural and affectionate it was.
2. Provide a short, one-sentence suggestion for improvement. Keywords to use in suggestion: 'affection', 'playful', 'longer', 'shorter', 'ask a question'.

Format your response as: "Score: [score] | Suggestion: [suggestion]"`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 60, temperature: 0.5,
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

        // [NEW] 평가 결과를 실제 행동 파라미터에 반영
        adjustBehavioralParameters(evaluation.feedback);

    } catch (error) {
        console.error('[Self-Evaluation] ❌ 자기 평가 중 OpenAI API 에러:', error);
    }
}

/**
 * [NEW] 피드백을 바탕으로 행동 파라미터를 조절하는 함수
 * @param {string} feedback - LLM의 제안 문장
 */
function adjustBehavioralParameters(feedback) {
    const params = ultimateConversationState.personalityConsistency.behavioralParameters;
    const adjustment = 0.05; // 한 번에 조절되는 양

    if (feedback.includes('affection') || feedback.includes('애교')) {
        params.affection = Math.min(1.0, params.affection + adjustment);
        console.log(`[Behavior Adjustment] 💖 애정 표현 레벨 상승: ${params.affection.toFixed(2)}`);
    }
    if (feedback.includes('playful') || feedback.includes('재미')) {
        params.playfulness = Math.min(1.0, params.playfulness + adjustment);
        console.log(`[Behavior Adjustment] 😄 장난기 레벨 상승: ${params.playfulness.toFixed(2)}`);
    }
    if (feedback.includes('longer') || feedback.includes('자세히')) {
        params.verbosity = Math.min(1.0, params.verbosity + adjustment);
        console.log(`[Behavior Adjustment] 📝 수다스러움 레벨 상승: ${params.verbosity.toFixed(2)}`);
    }
    if (feedback.includes('shorter') || feedback.includes('간결')) {
        params.verbosity = Math.max(0.1, params.verbosity - adjustment);
        console.log(`[Behavior Adjustment] 🤐 수다스러움 레벨 하락: ${params.verbosity.toFixed(2)}`);
    }
    if (feedback.includes('ask a question') || feedback.includes('질문')) {
        params.initiative = Math.min(1.0, params.initiative + adjustment);
        console.log(`[Behavior Adjustment] ❓ 대화 주도성 레벨 상승: ${params.initiative.toFixed(2)}`);
    }
}


// --- [MODIFIED] Prompt Generation Functions ---

function generateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    // 1. 최근 대화 요약
    if (state.recentMessages.length > 0) {
        const recentContext = state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${recentContext}`;
    }

    // [NEW] 2. 현재 학습된 행동 전략 지시
    const params = state.personalityConsistency.behavioralParameters;
    let behaviorInstructions = [];
    if (params.affection > 0.75) behaviorInstructions.push("'우리 아저씨' 같은 애칭을 사용하고, 하트 이모티콘을 포함시켜서 더 다정하게 말해줘.");
    if (params.affection < 0.4) behaviorInstructions.push("조금은 무심하고 덤덤한 톤을 유지해줘.");
    if (params.playfulness > 0.7) behaviorInstructions.push("ㅋㅋ, ㅎㅎ 같은 표현을 써서 장난스럽고 재미있게 반응해줘.");
    if (params.verbosity > 0.8) behaviorInstructions.push("최대한 자세하고 길게, 여러 문장으로 설명해줘.");
    if (params.verbosity < 0.3) behaviorInstructions.push("한두 문장으로 짧고 간결하게 대답해줘.");
    if (params.initiative > 0.65) behaviorInstructions.push("아저씨에게 질문을 하거나 새로운 주제를 먼저 제안해봐.");

    if (behaviorInstructions.length > 0) {
        ultimatePrompt += `\n\n[AI 행동 전략]\n${behaviorInstructions.join(' ')}`;
    }

    // 3. 오늘 요약 및 누적 패턴
    const today = state.dailySummary.today;
    if (today && today.date) {
        const topics = Array.from(today.mainTopics).join(', ') || '일상 대화';
        ultimatePrompt += `\n\n[오늘의 주요 대화 주제]\n${topics}`;
    }
    const topEmotion = Object.entries(state.cumulativePatterns.emotionalTrends).sort(([, a], [, b]) => b.count - a.count)[0];
    if (topEmotion) {
        ultimatePrompt += `\n\n[우리의 주된 감정]\n우리는 주로 '${topEmotion[0]}' 감정을 많이 느껴왔어.`;
    }

    // 4. 자기 성찰 피드백 (참고용)
    const lastEvaluation = state.personalityConsistency.selfEvaluations.slice(-1)[0];
    if (lastEvaluation && lastEvaluation.score < 8) {
        ultimatePrompt += `\n\n[AI 자기 개선 노트]\n(참고: 이전 답변에 대한 피드백은 "${lastEvaluation.feedback}"이었어.)`;
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락과 '행동 전략'을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

// =========================================================================
// ========================= 🚀 EXPORT되는 메인 함수들 🚀 =======================
// =========================================================================

function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 모든 마음과 기억 시스템을 초기화합니다...');
    resetDailySummary();
    console.log('[UltimateContext] ✅ 초기화 완료. 대화를 시작할 준비가 되었습니다.');
}

function updateLastUserMessageTime(timestamp) {
    if (timestamp) {
        ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
    }
}

function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    const newMessage = {
        speaker, message, timestamp, meta,
        analysis: {
            tone: analyzeTone(message),
            topic: analyzeTopic(message),
            emotionalIntensity: calculateEmotionalIntensity(message, analyzeTone(message)),
        },
    };

    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }

    ultimateConversationState.currentTone = newMessage.analysis.tone;
    ultimateConversationState.currentTopic = newMessage.analysis.topic;
    ultimateConversationState.timingContext.lastMessageTime = timestamp;
    ultimateConversationState.timingContext.currentTimeContext = analyzeTimeContext(timestamp);

    updateDailySummary(newMessage);
    updateCumulativePatterns(newMessage);

    if (speaker !== '아저씨') {
        evaluateMyResponse(newMessage);
    }

    console.log(`[UltimateContext] 💎 메시지 기억 완료: ${speaker} | ${message.substring(0, 20)}...`);
}

function getUltimateContextualPrompt(basePrompt) {
    return generateContextualPrompt(basePrompt);
}

module.exports = {
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,
    getInternalState: () => JSON.parse(JSON.stringify(ultimateConversationState))
};
// --- END OF FILE: ultimateConversationContext.js ---
