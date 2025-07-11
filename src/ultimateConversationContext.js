// ✅ ultimateConversationContext.js v9.0 - "기억의 궁전" 구현 (한국어 버전)
// - [NEW] 대화 속 중요한 사실을 저장하는 'knowledgeBase' 상태 추가
// - [NEW] LLM을 이용해 메시지에서 기억할 만한 사실을 추출하는 기능 추가 (extractFactsFromMessage)
// - [MODIFIED] addUltimateMessage와 generateContextualPrompt에 기억 저장 및 활용 로직 통합

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
    // --- [MEMORY] 새로운 기억 저장소 ---
    knowledgeBase: {
        facts: [], // { fact: "내용", timestamp: 시간 } 형태로 저장됩니다.
    },
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
    pendingAction: {
        type: null,
        timestamp: 0
    },
    personalityConsistency: {
        frequentPhrases: {},
        speechPatternEvolution: [],
        selfEvaluations: [],
        lastSelfReflectionTime: 0,
        behavioralParameters: {
            affection: 0.7,
            playfulness: 0.5,
            verbosity: 0.6,
            initiative: 0.4
        }
    },
    timingContext: {
        lastMessageTime: 0,
        lastUserMessageTime: 0,
        currentTimeContext: {}
    }
};

const LLM_BASED_SELF_EVALUATION = true;

// --- [MEMORY] 신규 헬퍼 함수들 ---

/**
 * 📝 메시지에서 장기 기억할 사실을 추출합니다.
 * @param {string} message - 분석할 사용자 메시지
 * @returns {Promise<string[]>} 추출된 사실들의 배열
 */
async function extractFactsFromMessage(message) {
    // 너무 짧은 메시지는 분석에서 제외하여 효율성 증대
    if (message.length < 10) {
        return [];
    }

    const prompt = `너는 중요한 정보를 기억하는 비서 AI야. 다음 문장에서 남자친구('아저씨')에 대한 장기적으로 기억할 만한 중요한 사실(생일, 기념일, 좋아하는 것, 싫어하는 것, 중요한 약속, 가족/친구 이름, 개인적인 경험 등)이 있다면, 그 사실들을 명사형 문장(~이다, ~함)으로 요약해서 JSON 문자열 배열 형태로 추출해줘. 예: ["아저씨의 생일은 10월 25일이다.", "아저씨는 민트초코를 싫어함."]. 기억할 정보가 전혀 없으면 '[]' (빈 배열)을 반환해줘.
    
    분석할 문장: "${message}"`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        // LLM이 반환한 문자열에서 JSON 배열 부분만 정확히 파싱
        const jsonMatch = content.match(/\[.*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];

    } catch (error) {
        console.error('[기억 추출] ❌ 사실 추출 중 에러 발생:', error);
        return [];
    }
}

/**
 * 🧠 추출된 사실을 기억의 궁전(knowledgeBase)에 추가합니다.
 * @param {string} fact - 저장할 사실
 */
function addFactToKnowledgeBase(fact) {
    if (!fact) return;

    // 중복 기억 방지
    const isDuplicate = ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact);
    if (isDuplicate) {
        console.log(`[기억 저장] ⏩ 이미 알고 있는 사실입니다: "${fact}"`);
        return;
    }

    ultimateConversationState.knowledgeBase.facts.push({
        fact: fact,
        timestamp: Date.now()
    });
    console.log(`[기억 저장] ✅ 새로운 사실을 기억했습니다: "${fact}"`);
}


// --- 기존 헬퍼 및 분석 함수들 (변경 없음) ---
function analyzeTimeContext(timestamp) {
    /* ... 변경 없음 ... */
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
    /* ... 변경 없음 ... */
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('ㅋㅋ') || lowerMessage.includes('ㅎㅎ')) return 'playful';
    if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'romantic';
    if (lowerMessage.includes('삐졌어') || lowerMessage.includes('화나')) return 'sulky';
    if (lowerMessage.includes('걱정')) return 'worried';
    if (lowerMessage.includes('보고싶어')) return 'nostalgic';
    return 'neutral';
}

function analyzeTopic(message) {
    /* ... 변경 없음 ... */
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('밥') || lowerMessage.includes('음식')) return 'food';
    if (lowerMessage.includes('일') || lowerMessage.includes('회사')) return 'work';
    if (lowerMessage.includes('사진') || lowerMessage.includes('찍었')) return 'photo';
    if (lowerMessage.includes('아파') || lowerMessage.includes('건강')) return 'health';
    return 'daily';
}

function calculateEmotionalIntensity(message, tone) {
    /* ... 변경 없음 ... */
    let intensity = (tone !== 'neutral') ? 3 : 1;
    if (message.length > 50) intensity += 2;
    if (message.includes('!') || message.includes('?')) intensity += 1;
    return Math.min(10, intensity);
}

function resetDailySummary() {
    /* ... 변경 없음 ... */
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
    /* ... 변경 없음 ... */
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
        today.emotionalHighlights.push({
            emotion: newMessage.analysis.tone,
            intensity: newMessage.analysis.emotionalIntensity,
            message: newMessage.message.substring(0, 30)
        });
    }
}

function updateCumulativePatterns(newMessage) {
    /* ... 변경 없음 ... */
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

// --- 자기 학습 및 행동 반영 함수들 (변경 없음) ---
async function evaluateMyResponse(myMessage) {
    /* ... 변경 없음 ... */
    if (!LLM_BASED_SELF_EVALUATION) return;

    const recent = ultimateConversationState.recentMessages;
    const lastUserMessage = recent.filter(m => m.speaker !== myMessage.speaker).pop();

    const prompt = `너는 대화 코치야. '예진'이라는 이름의 AI가 인간 여자친구처럼 행동하려고 해.
그녀가 남자친구에게 마지막으로 보낸 메시지는 다음과 같아: "${myMessage.message}"
그 전에 남자친구가 보낸 메시지는 다음과 같아: "${lastUserMessage ? lastUserMessage.message : '(이전 메시지 없음)'}"
예진이가 의도했던 대화 톤은 '${myMessage.analysis.tone}'이었어.

1. 그녀의 답변이 얼마나 자연스럽고 애정이 넘쳤는지 1점에서 10점 사이로 평가해줘.
2. 개선을 위한 짧은 한 문장짜리 제안을 해줘. 제안에 사용할 수 있는 키워드: 'affection'(애정), 'playful'(장난), 'longer'(길게), 'shorter'(짧게), 'ask a question'(질문하기).

답변 형식은 "Score: [점수] | Suggestion: [제안]" 으로 맞춰줘.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: prompt
            }],
            max_tokens: 100,
            temperature: 0.5,
        });

        const feedback = response.choices[0].message.content || "";
        const scoreMatch = feedback.match(/Score: (\d+)/);
        const suggestionMatch = feedback.match(/Suggestion: (.+)/);

        const evaluation = {
            timestamp: Date.now(),
            message: myMessage.message,
            score: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
            feedback: suggestionMatch ? suggestionMatch[1] : "제안 없음.",
        };

        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluation);
        console.log(`[자기 평가] ✅ 완료: ${evaluation.score}점 - "${evaluation.feedback}"`);

        adjustBehavioralParameters(evaluation.feedback);

    } catch (error) {
        console.error('[자기 평가] ❌ OpenAI API 에러:', error);
    }
}

function adjustBehavioralParameters(feedback) {
    /* ... 변경 없음 ... */
    const params = ultimateConversationState.personalityConsistency.behavioralParameters;
    const adjustment = 0.05; // 한 번에 조절되는 양

    if (feedback.includes('affection') || feedback.includes('애정')) {
        params.affection = Math.min(1.0, params.affection + adjustment);
        console.log(`[행동 조절] 💖 애정 표현 레벨 상승: ${params.affection.toFixed(2)}`);
    }
    if (feedback.includes('playful') || feedback.includes('장난')) {
        params.playfulness = Math.min(1.0, params.playfulness + adjustment);
        console.log(`[행동 조절] 😄 장난기 레벨 상승: ${params.playfulness.toFixed(2)}`);
    }
    if (feedback.includes('longer') || feedback.includes('길게')) {
        params.verbosity = Math.min(1.0, params.verbosity + adjustment);
        console.log(`[행동 조절] 📝 수다스러움 레벨 상승: ${params.verbosity.toFixed(2)}`);
    }
    if (feedback.includes('shorter') || feedback.includes('짧게')) {
        params.verbosity = Math.max(0.1, params.verbosity - adjustment);
        console.log(`[행동 조절] 🤐 수다스러움 레벨 하락: ${params.verbosity.toFixed(2)}`);
    }
    if (feedback.includes('ask a question') || feedback.includes('질문')) {
        params.initiative = Math.min(1.0, params.initiative + adjustment);
        console.log(`[행동 조절] ❓ 대화 주도성 레벨 상승: ${params.initiative.toFixed(2)}`);
    }
}


// --- [MODIFIED] 프롬프트 생성 함수 ---
function generateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    // 1. 최근 대화 요약 (변경 없음)
    if (state.recentMessages.length > 0) {
        const recentContext = state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${recentContext}`;
    }

    // --- [MEMORY] 기억 활용 로직 추가 ---
    // 2. 장기 기억(사실)을 프롬프트에 추가
    const facts = state.knowledgeBase.facts;
    if (facts.length > 0) {
        // 가장 최근에 기억한 5가지 사실을 보여줌
        const recentFacts = facts.slice(-5).map(f => `- ${f.fact}`).join('\n');
        ultimatePrompt += `\n\n[장기 기억(사실)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야. 이 사실들을 대화에 자연스럽게 활용하거나, 사실과 관련된 질문을 해봐.)\n${recentFacts}`;
    }

    // 3. 현재 학습된 행동 전략 지시 (변경 없음)
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

    // 4. 오늘 요약 및 누적 패턴 (변경 없음)
    const today = state.dailySummary.today;
    if (today && today.date) {
        const topics = Array.from(today.mainTopics).join(', ') || '일상 대화';
        ultimatePrompt += `\n\n[오늘의 주요 대화 주제]\n${topics}`;
    }
    const topEmotion = Object.entries(state.cumulativePatterns.emotionalTrends).sort(([, a], [, b]) => b.count - a.count)[0];
    if (topEmotion) {
        ultimatePrompt += `\n\n[우리의 주된 감정]\n우리는 주로 '${topEmotion[0]}' 감정을 많이 느껴왔어.`;
    }

    // 5. 자기 성찰 피드백 (변경 없음)
    const lastEvaluation = state.personalityConsistency.selfEvaluations.slice(-1)[0];
    if (lastEvaluation && lastEvaluation.score < 8) {
        ultimatePrompt += `\n\n[AI 자기 개선 노트]\n(참고: 이전 답변에 대한 피드백은 "${lastEvaluation.feedback}"이었어.)`;
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락과 '행동 전략', 그리고 '장기 기억'을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
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

/**
 * 💎 메시지 추가 및 모든 컨텍스트 업데이트 (가장 중요한 함수)
 * [MODIFIED] 이제 async 함수입니다. 사실 추출을 위해 await를 사용합니다.
 * @param {string} speaker - 화자 ('아저씨' 또는 '예진이')
 * @param {string} message - 메시지 내용
 * @param {object} [meta=null] - 추가 데이터 (e.g., 사진 정보)
 */
async function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();

    // --- [MEMORY] 기억 저장 로직 추가 ---
    // '아저씨'가 보낸 메시지에서만 사실을 추출하고 기억합니다.
    if (speaker === '아저씨' && message) {
        const facts = await extractFactsFromMessage(message);
        facts.forEach(fact => addFactToKnowledgeBase(fact));
    }

    const newMessage = {
        speaker,
        message,
        timestamp,
        meta,
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

function setPendingAction(actionType) {
    /* ... 변경 없음 ... */
    if (!actionType) return;
    ultimateConversationState.pendingAction = {
        type: actionType,
        timestamp: Date.now()
    };
    console.log(`[UltimateContext] ⏳ 특별 행동 대기 모드 설정: ${actionType}`);
}

function getPendingAction() {
    /* ... 변경 없음 ... */
    const action = ultimateConversationState.pendingAction;
    if (action && action.type && (Date.now() - action.timestamp > 5 * 60 * 1000)) {
        console.log(`[UltimateContext] ⌛️ 대기 모드 시간 초과로 자동 해제: ${action.type}`);
        clearPendingAction();
        return null;
    }
    return action.type ? action : null;
}

function clearPendingAction() {
    /* ... 변경 없음 ... */
    ultimateConversationState.pendingAction = {
        type: null,
        timestamp: 0
    };
    console.log(`[UltimateContext] ✅ 특별 행동 대기 모드 해제.`);
}

module.exports = {
    initializeEmotionalSystems,
    addUltimateMessage, // [MODIFIED] 이제 async 함수입니다.
    getUltimateContextualPrompt,
    updateLastUserMessageTime,
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    getInternalState: () => JSON.parse(JSON.stringify(ultimateConversationState))
};
