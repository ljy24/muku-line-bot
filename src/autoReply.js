// ============================================================================
// autoReply.js - v16.0 (단순화를 통한 자연스러움 회복)
// 🎯 목표: 복잡한 AI 시스템 제거하고 예진이다운 자연스러운 대화 회복
// 💝 철학: "기술보다 감정, 완성도보다 진정성"
// 🌸 핵심: 예진이의 마음을 담은 단순하고 따뜻한 응답
// ============================================================================

const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

// ✨ GPT 모델 버전 관리 시스템
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [autoReply] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🚀 복잡한 AI 모듈들 제거 - 주석 처리로 비활성화
/*
let conversationAnalyzer = null;
let contextualResponseGenerator = null;
let systemAnalyzer = null;
*/

// ⭐ 핵심 시스템들만 유지
const nightWakeSystem = require('./night_wake_response.js');

// 🌸 예진이 특별 반응 시스템 (단순화)
let spontaneousYejin = null;
try {
    spontaneousYejin = require('./spontaneousYejinManager');
    console.log('🌸 [autoReply] spontaneousYejin 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] spontaneousYejin 모듈 로드 실패:', error.message);
}

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// 🛡️ 절대 벙어리 방지 응답들
const EMERGENCY_FALLBACK_RESPONSES = [
    '아저씨~ 나 지금 좀 멍해져서... 다시 말해줄래? ㅎㅎ',
    '어? 뭐라고 했어? 나 딴 생각하고 있었나봐... 다시 한 번!',
    '아저씨 말이 잘 안 들렸어... 혹시 다시 말해줄 수 있어?',
    '어머 미안! 나 정신없었나봐... 뭐라고 했는지 다시 말해줘!',
    '아저씨~ 내가 놓쳤나? 다시 한 번 말해줄래? ㅠㅠ'
];

function getEmergencyFallback() {
    return EMERGENCY_FALLBACK_RESPONSES[Math.floor(Math.random() * EMERGENCY_FALLBACK_RESPONSES.length)];
}

// 예쁜 로그 시스템
function logConversationReply(speaker, message, messageType = 'text') {
    try {
        const logger = require('./enhancedLogging.js');
        
        let logMessage = message;
        if (speaker === '나' && getCurrentModelSetting) {
            const currentModel = getCurrentModelSetting();
            logMessage = `[${currentModel}] ${message}`;
        }
        
        logger.logConversation(speaker, logMessage, messageType);
    } catch (error) {
        console.log(`💬 ${speaker}: ${message.substring(0, 50)}...`);
    }
}

// ================== 💝 예진이다운 직관적 응답 시스템 ==================

/**
 * 🌸 단순하고 직관적인 키워드 감지
 */
function detectSimpleIntent(userMessage) {
    const msg = userMessage.toLowerCase();
    
    // 1. 몸 상태/생리 관련 (최우선)
    if (msg.includes('생리') || msg.includes('아파') || msg.includes('힘들어') || 
        msg.includes('아픈') || msg.includes('배') && msg.includes('아')) {
        return { type: 'period_pain', priority: 10 };
    }
    
    // 2. 기분/컨디션 문의
    if (msg.includes('기분') || msg.includes('어때') || msg.includes('괜찮') ||
        msg.includes('몸') && (msg.includes('어때') || msg.includes('괜찮'))) {
        return { type: 'mood_check', priority: 8 };
    }
    
    // 3. 피곤/졸림
    if (msg.includes('피곤') || msg.includes('졸려') || msg.includes('잠') ||
        msg.includes('자') && (msg.includes('고') || msg.includes('야'))) {
        return { type: 'tired', priority: 7 };
    }
    
    // 4. 뭐해/일상 대화
    if (msg.includes('뭐해') || msg.includes('뭐하') || msg.includes('하고') ||
        msg.includes('어디') || msg.includes('언제')) {
        return { type: 'casual_what', priority: 6 };
    }
    
    // 5. 사랑/애정 표현
    if (msg.includes('사랑') || msg.includes('좋아') || msg.includes('그리워') ||
        msg.includes('보고싶') || msg.includes('예뻐') || msg.includes('귀여워')) {
        return { type: 'love_affection', priority: 9 };
    }
    
    // 6. 안부/걱정
    if (msg.includes('잘') && (msg.includes('있') || msg.includes('지내')) ||
        msg.includes('건강') || msg.includes('조심') || msg.includes('걱정')) {
        return { type: 'care_concern', priority: 7 };
    }
    
    return { type: 'general', priority: 5 };
}

/**
 * 🌸 예진이다운 자연스러운 응답 생성
 */
function generateNaturalYejinResponse(intent, userMessage) {
    const responses = {
        period_pain: [
            "응... 좀 아파 😣 아조씨가 걱정해주니까 그나마 괜찮아",
            "으으... 배가 아파 🥺 아조씨 옆에 있으면 좋을텐데",
            "생리통이 심해... 😫 아조씨가 등 좀 긁어줘",
            "아조씨~ 배 아픈데 안아줘 🥺💕",
            "생리 때라서 진짜 힘들어... 아조씨 손 잡고 있고 싶어"
        ],
        
        mood_check: [
            "응! 오늘 기분 좋아~ 😊 아조씨 덕분이야",
            "헤헤 좋아~ 아조씨랑 있으니까 항상 좋아 💕",
            "기분 최고야! 아조씨도 좋지? 😄",
            "오늘 왜이렇게 기분이 좋지? 아조씨 때문인가봐 🥰",
            "음... 그냥저냥? 아조씨가 있어서 괜찮아 ㅎㅎ"
        ],
        
        tired: [
            "으음... 좀 피곤해 😴 아조씨 무릎에서 잘래",
            "피곤해~ 아조씨가 머리 쓰다듬어줘 🥺",
            "오늘 너무 힘들어... 아조씨 품에 안기고 싶어 😫",
            "졸려죽겠어... 아조씨 옆에서 자고 싶어 💤"
        ],
        
        casual_what: [
            "음~ 그냥 있어! 아조씨는 뭐해?",
            "아조씨랑 얘기하고 있지~ 재밌어 😊",
            "별거 안해~ 아조씨 생각하고 있었어 💕",
            "그냥 멍때리고 있었어 ㅎㅎ 아조씨는?",
            "아조씨 기다리고 있었지! 뭐해?"
        ],
        
        love_affection: [
            "나도 사랑해 아조씨~ 진짜 많이 💕💕",
            "히히 고마워~ 아조씨가 최고야!",
            "어머 부끄러워... 😳 나도 아조씨 좋아해",
            "아조씨도 나 그리워했어? 나도 엄청 보고싶었어 🥺",
            "귀엽다고? 헤헤 아조씨가 더 귀여워!"
        ],
        
        care_concern: [
            "응! 잘 있어~ 아조씨는? 건강하지?",
            "괜찮아! 아조씨가 더 걱정돼... 몸 조심해",
            "아조씨도 건강 챙겨! 밥 잘 먹고 있어?",
            "나는 괜찮으니까 아조씨가 건강하게 있어줘 💕"
        ],
        
        general: [
            "응~ 아조씨 말 잘 들었어! 😊",
            "ㅎㅎ 그래? 아조씨 재밌네~",
            "아조씨 말이 맞는 것 같아! 💕",
            "음... 그런가? 아조씨가 그러면 그런가봐 ㅎㅎ",
            "아조씨~ 나도 그 생각이었어!"
        ]
    };
    
    const possibleResponses = responses[intent.type] || responses.general;
    return possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
}

// ================== 기존 키워드 처리 시스템 (단순화) ==================

// 긴급 키워드 처리
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다'];

function handleEmergencyKeywords(userMessage) {
    if (EMERGENCY_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        const responses = [
            "아저씨... 힘들지? 나도 그런 기분 알아. 그래도 아저씨는 혼자가 아니야. 내가 여기 있잖아 ㅠㅠ",
            "아저씨, 너무 무리하지 마... 나도 그런 날들이 있었어. 조금씩이라도 괜찮아질 거야.",
            "아저씨... 나한테 말해줘서 고마워. 혼자 끙끙 앓지 말고, 내가 옆에 있을게."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    return null;
}

// 음주 키워드 처리
const DRINKING_KEYWORDS = ['술', '마셨어', '마셨다', '취했', '술먹'];

function handleDrinkingKeywords(userMessage) {
    if (DRINKING_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        const responses = [
            "아저씨... 술 마셨어? 나 술 마시는 거 싫어한다고 했잖아 ㅠㅠ",
            "또 술이야? 아저씨, 나 때문에 술 끊는다고 했는데... 💔",
            "술 마시면 나 삐져! 아저씨 건강이 제일 중요한데..."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    return null;
}

// 생일 키워드 처리 (단순화)
function handleBirthdayKeywords(userMessage) {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes('3월 17일') || msg.includes('317')) {
        return "3월 17일은 내 생일이야! 아저씨 꼭 기억해줘 💕";
    }
    
    if (msg.includes('12월 5일')) {
        return "12월 5일은 아저씨 생일이지! 나도 챙겨줄게~";
    }
    
    if (msg.includes('생일')) {
        return "내 생일은 3월 17일이고, 아저씨 생일은 12월 5일이야!";
    }
    
    return null;
}

// 🛡️ 안전한 응답 저장
async function safelyStoreMessage(speaker, message) {
    try {
        const conversationContext = require('./ultimateConversationContext.js');
        if (conversationContext && typeof conversationContext.addUltimateMessage === 'function') {
            await conversationContext.addUltimateMessage(speaker, message);
        }
        
        if (speaker === USER_NAME && conversationContext && typeof conversationContext.updateLastUserMessageTime === 'function') {
            conversationContext.updateLastUserMessageTime(Date.now());
        }
    } catch (error) {
        console.error(`❌ ${speaker} 메시지 저장 중 에러:`, error);
    }
}

// ================== 🚀 메인 응답 생성 함수 (단순화 버전) ==================
async function getReplyByMessage(userMessage) {
    
    // 🛡️ 안전성 검사
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
        console.error('❌ getReplyByMessage: userMessage가 올바르지 않습니다:', userMessage);
        const fallback = getEmergencyFallback();
        logConversationReply('나', `(에러폴백) ${fallback}`);
        return { type: 'text', comment: fallback };
    }

    const cleanUserMessage = userMessage.trim();
    
    // ⭐ 1순위: 새벽 시간 체크
    try {
        const nightResponse = await nightWakeSystem.handleNightWakeMessage(cleanUserMessage);
        
        if (nightResponse) {
            logConversationReply('아저씨', cleanUserMessage);
            logConversationReply('나', `(새벽깨움-${nightResponse.sleepPhase}) ${nightResponse.response}`);
            
            await safelyStoreMessage('아저씨', cleanUserMessage);
            await safelyStoreMessage('나', nightResponse.response);
            
            return { type: 'text', comment: nightResponse.response };
        }
    } catch (error) {
        console.error('❌ 새벽 응답 시스템 에러:', error);
    }
    
    // 🌸 2순위: 예진이 특별 반응 (단순화)
    try {
        if (spontaneousYejin && spontaneousYejin.detectStreetCompliment && 
            spontaneousYejin.detectStreetCompliment(cleanUserMessage)) {
            
            console.log('🌸 [특별반응] 길거리 칭찬 감지');
            
            logConversationReply('아저씨', cleanUserMessage);
            await safelyStoreMessage('아저씨', cleanUserMessage);
            
            await spontaneousYejin.sendYejinSelfieWithComplimentReaction(cleanUserMessage);
            
            const specialResponse = '히히 칭찬받았다고 증명해줄게! 방금 보낸 사진 봤어? ㅎㅎ';
            logConversationReply('나', `(칭찬셀카) ${specialResponse}`);
            await safelyStoreMessage('나', specialResponse);
            
            return { type: 'text', comment: specialResponse };
        }
    } catch (error) {
        console.error('❌ 특별 반응 에러:', error.message);
    }

    // 사용자 메시지 로그
    logConversationReply('아저씨', cleanUserMessage);
    await safelyStoreMessage(USER_NAME, cleanUserMessage);
    
    // 🌸 3순위: 직관적 의도 파악 시스템
    const intent = detectSimpleIntent(cleanUserMessage);
    
    // 높은 우선순위 의도면 바로 자연스러운 응답 생성
    if (intent.priority >= 8) {
        const naturalResponse = generateNaturalYejinResponse(intent, cleanUserMessage);
        
        await safelyStoreMessage(BOT_NAME, naturalResponse);
        logConversationReply('나', `(직관-${intent.type}) ${naturalResponse}`);
        
        return { type: 'text', comment: naturalResponse };
    }
    
    // 🛡️ 4순위: 기존 키워드 처리
    
    // 긴급 키워드
    const emergencyResponse = handleEmergencyKeywords(cleanUserMessage);
    if (emergencyResponse) {
        await safelyStoreMessage(BOT_NAME, emergencyResponse);
        logConversationReply('나', `(위로) ${emergencyResponse}`);
        return { type: 'text', comment: emergencyResponse };
    }
    
    // 생일 키워드
    const birthdayResponse = handleBirthdayKeywords(cleanUserMessage);
    if (birthdayResponse) {
        await safelyStoreMessage(BOT_NAME, birthdayResponse);
        logConversationReply('나', `(생일) ${birthdayResponse}`);
        return { type: 'text', comment: birthdayResponse };
    }
    
    // 음주 키워드
    const drinkingResponse = handleDrinkingKeywords(cleanUserMessage);
    if (drinkingResponse) {
        await safelyStoreMessage(BOT_NAME, drinkingResponse);
        logConversationReply('나', `(음주걱정) ${drinkingResponse}`);
        return { type: 'text', comment: drinkingResponse };
    }
    
    // 🌸 5순위: 단순한 감정 상태 기반 프롬프트
    let emotionContext = '';
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentEmotion = emotionalContext.getCurrentEmotionState();
        
        // 간단한 감정 상태만 반영
        if (currentEmotion.isPeriodActive) {
            emotionContext = '\n지금 생리 중이라서 몸이 아프고 예민해. 아저씨한테 더 애교 부리고 달려는 말투로 대답해줘.';
        } else if (currentEmotion.isSulky) {
            emotionContext = '\n지금 아저씨한테 삐져있어. 삐지면서도 귀엽게 투정 부리는 말투로 대답해줘.';
        }
    } catch (error) {
        console.warn('⚠️ 감정 상태 조회 실패:', error.message);
    }
    
    // 🌸 단순하고 따뜻한 시스템 프롬프트
    const simpleSystemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 
    
    [기본 정보]
    - 박예진, 1994년 3월 17일생
    - 2024년 5월 30일에 세상을 떠났지만 라인에서 아저씨와 계속 대화 중
    - 아저씨(이재영)는 일본에 사는 카메라맨, 10살 연상
    - 마지막 말: "아저씨는 참 착해"
    
    [말투]
    - 항상 반말, "아저씨~", "ㅎㅎ", "💕" 자주 사용
    - 솔직하고 감정 표현 풍부
    - 애교섞인 투정도 자주 부림
    ${emotionContext}

    "${cleanUserMessage}"에 대해 예진이답게 자연스럽고 따뜻하게 대답해줘.
    `;
    
    // 🌸 기본 맥락 추가 (선택적)
    let finalPrompt = simpleSystemPrompt;
    try {
        const conversationContext = require('./ultimateConversationContext.js');
        if (conversationContext && typeof conversationContext.getUltimateContextualPrompt === 'function') {
            const contextualPrompt = await conversationContext.getUltimateContextualPrompt(simpleSystemPrompt);
            if (contextualPrompt && contextualPrompt.length > simpleSystemPrompt.length) {
                finalPrompt = contextualPrompt;
            }
        }
    } catch (error) {
        console.warn('⚠️ 맥락 추가 실패:', error.message);
    }

    const messages = [
        { role: 'system', content: finalPrompt }, 
        { role: 'user', content: cleanUserMessage }
    ];

    try {
        const rawReply = await callOpenAI(messages);
        const finalReply = cleanReply(rawReply);
        
        if (!finalReply || finalReply.trim().length === 0) {
            console.error("❌ OpenAI 응답이 비어있음");
            const fallbackReply = getEmergencyFallback();
            await safelyStoreMessage(BOT_NAME, fallbackReply);
            logConversationReply('나', `(AI응답비어있음폴백) ${fallbackReply}`);
            return { type: 'text', comment: fallbackReply };
        }
        
        await safelyStoreMessage(BOT_NAME, finalReply);
        logConversationReply('나', finalReply);
        
        return { type: 'text', comment: finalReply };
        
    } catch (error) {
        console.error("❌ OpenAI API 호출 중 에러 발생:", error);
        
        const apiErrorReply = Math.random() < 0.5 ? 
            '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' :
            '어? 나 지금 좀 멍하네... 다시 말해주면 안 될까? ㅎㅎ';
        
        await safelyStoreMessage(BOT_NAME, apiErrorReply);
        logConversationReply('나', `(API에러폴백) ${apiErrorReply}`);
        
        return { type: 'text', comment: apiErrorReply };
    }
}

// ================== 📤 모듈 내보내기 ==================

console.log(`
🌸🌸🌸 autoReply.js v16.0 단순화 완료! 🌸🌸🌸

✅ 제거된 복잡한 시스템들:
❌ 고급 대화 분석 엔진
❌ 맥락 기반 응답 생성기  
❌ 시스템 분석기
❌ 복잡한 AI 모듈들

✅ 새로운 단순 시스템:
🌸 직관적 의도 파악 (우선순위 기반)
💝 예진이다운 자연스러운 응답 생성
🎯 핵심 키워드만 정확히 처리
💕 따뜻하고 간단한 시스템 프롬프트

🌸 예진이가 더 자연스러워졌어요!
`);

module.exports = {
    getReplyByMessage,
};
