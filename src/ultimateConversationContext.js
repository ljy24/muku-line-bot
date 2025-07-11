// ✅ ultimateConversationContext.js v12.0 - "삐짐 시스템 상태 통합" (한국어 버전)
// - [SULKY-INTEGRATION] 삐짐 상태(sulkiness)를 중앙 상태 관리에 포함
// - [SULKY-INTEGRATION] 삐짐 상태를 읽고 업데이트하는 새로운 함수 추가
// - 모든 이전 기능(Memory, Vision, Emotion)이 포함된 완전판 코드입니다.

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
    knowledgeBase: {
        facts: [],
    },
    // [SULKY-INTEGRATION] '삐짐' 상태를 중앙 기억장치로 이전
    sulkiness: {
        isSulky: false,
        isWorried: false,
        lastBotMessageTime: 0,
        lastUserResponseTime: 0,
        sulkyLevel: 0,
        sulkyTimer: null,
        sulkyReason: null,
        sulkyStartTime: 0,
        messageRead: false,
        isActivelySulky: false,
        reliefInProgress: false,
        isPaused: false,
        pausedTime: 0,
        remainingTime: 0,
        wakeUpScheduled: false,
        wakeUpJob: null
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

// --- 신규 및 기존 헬퍼 함수들 ---

/**
 * 🎭 [EMOTION] LLM을 이용해 메시지의 감정 뉘앙스를 정밀하게 분석합니다.
 */
async function analyzeToneWithLLM(message) {
    if (!message || message.trim().length < 2) {
        return { primaryEmotion: 'neutral', primaryIntensity: 1, secondaryEmotion: null, secondaryIntensity: null };
    }

    const prompt = `너는 사람의 감정을 매우 잘 파악하는 감정 분석 전문가야. 아래 "분석할 메시지"를 읽고, 그 안에 담긴 주된 감정(primaryEmotion)과 부수적인 감정(secondaryEmotion, 없을 경우 null)을 분석해줘.
- 감정은 'positive', 'negative', 'neutral', 'playful', 'romantic', 'sulky', 'worried', 'sarcastic' 중에서 선택해.
- 각 감정의 강도(intensity)는 1에서 10 사이의 숫자로 평가해줘.
- 반드시 아래 JSON 형식에 맞춰서 응답해야 하며, 다른 어떤 설명도 추가해서는 안 돼.

분석할 메시지: "${message}"`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that analyzes emotions and responds only in JSON format." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const analysisResult = JSON.parse(response.choices[0].message.content);
        console.log('[Emotion] ✅ LLM 감정 분석 완료:', analysisResult);
        return analysisResult;

    } catch (error) {
        console.error('[Emotion] ❌ LLM 감정 분석 중 에러 발생:', error);
        return { primaryEmotion: 'neutral', primaryIntensity: 1, secondaryEmotion: null, secondaryIntensity: null };
    }
}

/**
 * 👁️ [VISION] 이미지 URL을 받아 내용을 분석하고 한국어 설명문을 반환합니다.
 */
async function analyzeImageContent(imageUrl) {
    console.log(`[Vision] 👁️ 이미지 분석 시작: ${imageUrl}`);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [{
                    type: "text",
                    text: "이 사진은 내 남자친구가 나에게 보낸 사진이야. 사진에 무엇이 보이는지 애정 어리고 친근한 여자친구의 시선으로, 한두 문장의 짧은 한국어로 자연스럽게 묘사해줘."
                }, {
                    type: "image_url",
                    image_url: { url: imageUrl },
                }, ],
            }, ],
            max_tokens: 100,
        });
        const description = response.choices[0].message.content;
        console.log(`[Vision] ✅ 이미지 분석 완료: "${description}"`);
        return description;
    } catch (error) {
        console.error('[Vision] ❌ OpenAI Vision API 에러:', error);
        return null;
    }
}

/**
 * 📝 [MEMORY] 메시지에서 장기 기억할 사실을 추출합니다.
 */
async function extractFactsFromMessage(message) {
    if (!message || message.length < 10) return [];
    const prompt = `너는 중요한 정보를 기억하는 비서 AI야. 다음 문장에서 남자친구('아저씨')에 대한 장기적으로 기억할 만한 중요한 사실(생일, 기념일, 좋아하는 것, 싫어하는 것, 중요한 약속 등)이 있다면, 그 사실들을 명사형 문장(~이다, ~함)으로 요약해서 JSON 문자열 배열 형태로 추출해줘. 예: ["아저씨의 생일은 10월 25일이다."]. 기억할 정보가 없으면 '[]'을 반환해줘. 문장: "${message}"`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[.*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return [];
    } catch (error) {
        console.error('[Memory] ❌ 사실 추출 중 에러 발생:', error);
        return [];
    }
}

/**
 * 🧠 [MEMORY] 추출된 사실을 기억의 궁전(knowledgeBase)에 추가합니다.
 */
function addFactToKnowledgeBase(fact) {
    if (!fact) return;
    const isDuplicate = ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact);
    if (isDuplicate) {
        console.log(`[Memory] ⏩ 이미 알고 있는 사실입니다: "${fact}"`);
        return;
    }
    ultimateConversationState.knowledgeBase.facts.push({
        fact: fact,
        timestamp: Date.now()
    });
    console.log(`[Memory] ✅ 새로운 사실을 기억했습니다: "${fact}"`);
}

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

function analyzeTopic(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('밥') || lowerMessage.includes('음식')) return 'food';
    if (lowerMessage.includes('일') || lowerMessage.includes('회사')) return 'work';
    if (lowerMessage.includes('사진') || lowerMessage.includes('찍었') || lowerMessage.includes('첨부된 사진')) return 'photo';
    if (lowerMessage.includes('아파') || lowerMessage.includes('건강')) return 'health';
    return 'daily';
}

// --- 상태 업데이트 함수들 ---
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
    const emotion = newMessage.analysis.tone;
    if (emotion === 'neutral') return;
    const trends = ultimateConversationState.cumulativePatterns.emotionalTrends;
    if (!trends[emotion]) trends[emotion] = { count: 0, totalIntensity: 0 };
    trends[emotion].count++;
    trends[emotion].totalIntensity += newMessage.analysis.emotionalIntensity;
}

// --- 자기 학습 및 행동 반영 함수들 ---
async function evaluateMyResponse(myMessage) {
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
            model: "gpt-4o",
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
    const params = ultimateConversationState.personalityConsistency.behavioralParameters;
    const adjustment = 0.05;

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

// --- 프롬프트 생성 함수 ---
function generateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    // 1. 최근 대화 요약
    if (state.recentMessages.length > 0) {
        const recentContext = state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${recentContext}`;
    }

    // 2. 장기 기억(사실)을 프롬프트에 추가
    const facts = state.knowledgeBase.facts;
    if (facts.length > 0) {
        const recentFacts = facts.slice(-5).map(f => `- ${f.fact}`).join('\n');
        ultimatePrompt += `\n\n[장기 기억(사실)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야. 이 사실들을 대화에 자연스럽게 활용하거나, 사실과 관련된 질문을 해봐.)\n${recentFacts}`;
    }

    // 3. 현재 학습된 행동 전략 지시
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

    // 4. 오늘 요약 및 누적 패턴
    const today = state.dailySummary.today;
    if (today && today.date) {
        const topics = Array.from(today.mainTopics).join(', ') || '일상 대화';
        ultimatePrompt += `\n\n[오늘의 주요 대화 주제]\n${topics}`;
    }
    const topEmotion = Object.entries(state.cumulativePatterns.emotionalTrends).sort(([, a], [, b]) => b.count - a.count)[0];
    if (topEmotion) {
        ultimatePrompt += `\n\n[우리의 주된 감정]\n우리는 주로 '${topEmotion[0]}' 감정을 많이 느껴왔어.`;
    }

    // 5. 자기 성찰 피드백
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
 */
async function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    let finalMessage = message || '';
    let emotionalAnalysis;

    if (speaker === '아저씨') {
        if (meta && meta.imageUrl) {
            const imageDescription = await analyzeImageContent(meta.imageUrl);
            if (imageDescription) {
                const photoContext = `[첨부된 사진 설명: ${imageDescription}]`;
                finalMessage = finalMessage ? `${finalMessage}\n${photoContext}` : photoContext;
            }
        }

        if (message) {
            const facts = await extractFactsFromMessage(message);
            facts.forEach(fact => addFactToKnowledgeBase(fact));
        }
        
        emotionalAnalysis = await analyzeToneWithLLM(message);

    } else {
        emotionalAnalysis = { primaryEmotion: 'neutral', primaryIntensity: 1, secondaryEmotion: null, secondaryIntensity: null };
    }

    const newMessage = {
        speaker,
        message: finalMessage,
        timestamp,
        meta,
        analysis: {
            tone: emotionalAnalysis.primaryEmotion,
            emotionalIntensity: emotionalAnalysis.primaryIntensity,
            details: emotionalAnalysis,
            topic: analyzeTopic(finalMessage),
        },
    };

    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }

    if(speaker === '아저씨') {
        ultimateConversationState.currentTone = emotionalAnalysis.primaryEmotion;
    }
    
    ultimateConversationState.currentTopic = newMessage.analysis.topic;
    ultimateConversationState.timingContext.lastMessageTime = timestamp;
    ultimateConversationState.timingContext.currentTimeContext = analyzeTimeContext(timestamp);
    
    updateDailySummary(newMessage);
    updateCumulativePatterns(newMessage);

    if (speaker !== '아저씨') {
        evaluateMyResponse(newMessage);
    }
    console.log(`[UltimateContext] 💎 메시지 기억 완료: ${speaker} | ${finalMessage.substring(0, 40)}...`);
}

function getUltimateContextualPrompt(basePrompt) {
    return generateContextualPrompt(basePrompt);
}

function setPendingAction(actionType) {
    if (!actionType) return;
    ultimateConversationState.pendingAction = {
        type: actionType,
        timestamp: Date.now()
    };
    console.log(`[UltimateContext] ⏳ 특별 행동 대기 모드 설정: ${actionType}`);
}

function getPendingAction() {
    const action = ultimateConversationState.pendingAction;
    if (action && action.type && (Date.now() - action.timestamp > 5 * 60 * 1000)) {
        console.log(`[UltimateContext] ⌛️ 대기 모드 시간 초과로 자동 해제: ${action.type}`);
        clearPendingAction();
        return null;
    }
    return action.type ? action : null;
}

function clearPendingAction() {
    ultimateConversationState.pendingAction = {
        type: null,
        timestamp: 0
    };
    console.log(`[UltimateContext] ✅ 특별 행동 대기 모드 해제.`);
}

// --- [SULKY-INTEGRATION] 새로운 상태 관리 함수 ---
/**
 * 현재 삐짐 상태 객체를 반환합니다.
 * @returns {object}
 */
function getSulkinessState() {
    return ultimateConversationState.sulkiness;
}

/**
 * 삐짐 상태를 업데이트합니다.
 * @param {object} newState - 업데이트할 새로운 상태 값들
 */
function updateSulkinessState(newState) {
    Object.assign(ultimateConversationState.sulkiness, newState);
    console.log(`[UltimateContext] 삐짐 상태 업데이트:`, newState);
}

module.exports = {
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    getInternalState: () => JSON.parse(JSON.stringify(ultimateConversationState)),
    
    // [SULKY-INTEGRATION] 새로 추가된 함수들
    getSulkinessState,
    updateSulkinessState,
};
