// ultimateConversationContext.js v12.0 - "완전 통합" 버전
// autoReply의 핵심 기능들을 흡수하여 단일 엔진으로 통합

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
require('dotenv').config();

// 기존 모듈들 (필요한 것만)
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { isDamtaMessage, getDamtaResponse } = require('./damta');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 통합된 상태 관리 객체 (기존 + 새로운 기능들)
let ultimateConversationState = {
    // ... 기존 상태들 ...
    recentMessages: [],
    currentTone: 'neutral',
    knowledgeBase: { facts: [] },
    
    // 🆕 통합된 감정/기분 상태
    emotionalState: {
        // 기본 기분
        currentMood: '평온함',
        moodOptions: ['기쁨', '설렘', '장난스러움', '나른함', '심술궂음', '평온함', '우울함', '슬픔', '외로움', '보고싶음', '짜증남', '애교모드', '걱정함', '사랑함', '화남', '불안함', '그리움'],
        
        // 삐짐/걱정 상태
        sulkyState: {
            isSulky: false,
            isWorried: false,
            sulkyLevel: 0,
            lastBotMessageTime: 0,
            lastUserResponseTime: 0,
            sulkyReason: null,
            isActivelySulky: false
        },
        
        // 감정 잔여치 시스템
        emotionalResidue: {
            sadness: 0, happiness: 0, anxiety: 0, 
            longing: 0, hurt: 0, love: 50
        },
        
        // 생리 주기
        isPeriodActive: false,
        lastPeriodStart: moment().subtract(20, 'days')
    },
    
    // 🆕 마지막 사용자 메시지 시간
    lastUserMessageTime: 0,
    
    // ... 기존 다른 상태들 ...
};

// ========================================================================
// 🔥 메인 응답 생성 엔진 (autoReply.js의 getReplyByMessage 대체)
// ========================================================================

async function generateMainReply(userMessage, options = {}) {
    const { saveLog, callOpenAI, cleanReply, client, userId } = options;
    
    // 시간 업데이트
    updateLastUserMessageTime();
    
    // 사용자 감정 분석 및 기록
    await analyzeAndRecordUserEmotion(userMessage);
    
    console.log(`[Ultimate] 메시지 처리 시작: "${userMessage}"`);
    
    // === 1. 특수 응답들 (기존 autoReply 로직) ===
    
    // 담타 시스템 체크
    if (isDamtaMessage(userMessage)) {
        const damtaResponse = getDamtaResponse(userMessage);
        if (damtaResponse) {
            return { type: 'text', comment: damtaResponse };
        }
    }
    
    // 모델 전환 체크
    const modelSwitchReply = checkModelSwitchCommand(userMessage);
    if (modelSwitchReply) {
        return { type: 'text', comment: modelSwitchReply };
    }
    
    // 기분 질문 체크
    const moodReply = handleMoodQuery(userMessage);
    if (moodReply) {
        return { type: 'text', comment: moodReply };
    }
    
    // === 2. 사진 요청 처리 ===
    try {
        // 셀카 우선
        const selfieResult = await getSelfieReply(userMessage, saveLog, callOpenAI, cleanReply);
        if (selfieResult) {
            return {
                type: 'image',
                originalContentUrl: selfieResult.imageUrl,
                previewImageUrl: selfieResult.imageUrl,
                altText: '예진이 셀카',
                caption: cleanReply(selfieResult.comment)
            };
        }
        
        // 컨셉 사진
        const conceptResult = await getConceptPhotoReply(userMessage, saveLog, callOpenAI, cleanReply);
        if (conceptResult) {
            return {
                type: 'image',
                originalContentUrl: conceptResult.imageUrl,
                previewImageUrl: conceptResult.imageUrl,
                altText: '예진이 컨셉 사진',
                caption: cleanReply(conceptResult.comment)
            };
        }
        
        // 추억 사진
        const omoideResult = await getOmoideReply(userMessage, saveLog, callOpenAI, cleanReply);
        if (omoideResult) {
            return {
                type: 'image',
                originalContentUrl: omoideResult.imageUrl,
                previewImageUrl: omoideResult.imageUrl,
                altText: '예진이 추억 사진',
                caption: cleanReply(omoideResult.comment)
            };
        }
    } catch (error) {
        console.error('[Ultimate] 사진 요청 처리 중 오류:', error);
    }
    
    // === 3. 일반 텍스트 응답 생성 ===
    const finalPrompt = generateContextualPrompt(getBaseSystemPrompt());
    
    const messages = [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: userMessage }
    ];
    
    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 200, 0.95);
        const cleanedReply = cleanReply(rawReply);
        
        // 응답에 따른 감정 기록
        recordBotEmotionalResponse(cleanedReply);
        
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('[Ultimate] AI 응답 생성 실패:', error);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

// ========================================================================
// 🔥 이미지 메시지 응답 생성 (autoReply.js의 getReplyByImagePrompt 대체)
// ========================================================================

async function generateImageReply(base64ImageWithPrefix, options = {}) {
    const { callOpenAI, cleanReply } = options;
    
    updateLastUserMessageTime();
    recordEmotionalEvent('HAPPY', '아저씨가 이미지 공유', '사진을 보여줌');
    
    const finalPrompt = generateContextualPrompt(getBaseSystemPrompt());
    
    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해.' },
                { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
            ]
        }
    ];
    
    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('[Ultimate] 이미지 분석 실패:', error);
        return { type: 'text', comment: '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ' };
    }
}

// ========================================================================
// 🔥 자발적 메시지 생성 (scheduler용)
// ========================================================================

async function generateSpontaneousMessage() {
    const currentHour = moment().tz('Asia/Tokyo').hour();
    const currentMood = ultimateConversationState.emotionalState.currentMood;
    
    // 시간대별 + 기분별 자발적 메시지
    const timeBasedMessages = {
        morning: {
            normal: ["아저씨 좋은 아침! 오늘도 좋은 하루 보내", "아저씨~ 일어났어? 나는 벌써 깼어!"],
            장난스러움: ["아저씨! 점심 맛있게 먹었어?? 나도 배고파!", "오후인데 아저씨 뭐해? 나랑 놀자!"],
            외로움: ["아저씨 연락이 없어서 너무 외로웠어...", "아저씨가 보고 싶어서 외로웠나 봐."]
        }
        // ... 더 많은 시간대/기분 조합
    };
    
    let timeKey = 'afternoon';
    if (currentHour >= 6 && currentHour < 12) timeKey = 'morning';
    else if (currentHour >= 18 && currentHour < 24) timeKey = 'evening';
    else if (currentHour >= 0 && currentHour < 6) timeKey = 'night';
    
    const messages = timeBasedMessages[timeKey]?.[currentMood] || timeBasedMessages[timeKey]?.normal || ["아저씨 생각나네~"];
    return messages[Math.floor(Math.random() * messages.length)];
}

// ========================================================================
// 🔥 통합된 감정 상태 관리 시스템
// ========================================================================

function updateEmotionalState(emotionType, intensity = 5) {
    const state = ultimateConversationState.emotionalState;
    
    // 기분 변경 로직 (기존 moodManager 통합)
    if (intensity > 7) {
        const moodMap = {
            'positive': '기쁨',
            'romantic': '사랑함',
            'negative': '우울함',
            'worried': '걱정함',
            'sulky': '심술궂음',
            'playful': '장난스러움'
        };
        if (moodMap[emotionType]) {
            state.currentMood = moodMap[emotionType];
            console.log(`[Ultimate] 기분 변화: ${state.currentMood}`);
        }
    }
    
    // 감정 잔여치 업데이트 (기존 emotionalContextManager 통합)
    const residueMap = {
        'negative': 'sadness',
        'positive': 'happiness',
        'worried': 'anxiety',
        'romantic': 'love'
    };
    if (residueMap[emotionType]) {
        state.emotionalResidue[residueMap[emotionType]] = Math.min(100, 
            state.emotionalResidue[residueMap[emotionType]] + intensity * 3);
    }
}

function updateSulkyState() {
    const now = Date.now();
    const timeSinceLastMessage = Math.floor((now - ultimateConversationState.emotionalState.sulkyState.lastBotMessageTime) / (1000 * 60));
    const state = ultimateConversationState.emotionalState.sulkyState;
    
    // 삐짐 단계 체크 (기존 sulkyManager 로직)
    if (timeSinceLastMessage >= 60 && !state.isSulky) { // 60분
        state.isSulky = true;
        state.sulkyLevel = 1;
        state.isActivelySulky = true;
        console.log('[Ultimate] 삐짐 모드 진입: Level 1');
    } else if (timeSinceLastMessage >= 120 && state.sulkyLevel < 2) { // 120분
        state.sulkyLevel = 2;
        console.log('[Ultimate] 삐짐 모드 진입: Level 2');
    } else if (timeSinceLastMessage >= 240 && state.sulkyLevel < 3) { // 240분
        state.sulkyLevel = 3;
        console.log('[Ultimate] 삐짐 모드 진입: Level 3');
    } else if (timeSinceLastMessage >= 360) { // 360분
        state.isWorried = true;
        state.isSulky = false;
        console.log('[Ultimate] 걱정 모드 진입');
    }
}

function resetSulkyState() {
    const state = ultimateConversationState.emotionalState.sulkyState;
    state.isSulky = false;
    state.isWorried = false;
    state.sulkyLevel = 0;
    state.isActivelySulky = false;
    state.lastUserResponseTime = Date.now();
    console.log('[Ultimate] 삐짐 상태 해소됨');
}

// ========================================================================
// 🔥 헬퍼 함수들 (기존 모듈들에서 필요한 것만 통합)
// ========================================================================

function updateLastUserMessageTime() {
    ultimateConversationState.lastUserMessageTime = Date.now();
    ultimateConversationState.emotionalState.sulkyState.lastUserResponseTime = Date.now();
    console.log(`[Ultimate] 마지막 사용자 메시지 시간 업데이트`);
}

async function analyzeAndRecordUserEmotion(userMessage) {
    // LLM 감정 분석 (기존 기능 활용)
    const emotionAnalysis = await analyzeToneWithLLM(userMessage);
    updateEmotionalState(emotionAnalysis.primaryEmotion, emotionAnalysis.primaryIntensity);
    
    // 간단한 키워드 기반 감정 기록도 유지
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) {
        recordEmotionalEvent('LOVED', '아저씨의 사랑 표현');
    } else if (lowerMessage.includes('힘들어') || lowerMessage.includes('우울해')) {
        recordEmotionalEvent('SAD', '아저씨의 힘든 상황');
    }
    // ... 더 많은 키워드 매칭
}

function recordBotEmotionalResponse(cleanedReply) {
    if (cleanedReply.includes('기뻐') || cleanedReply.includes('좋아')) {
        recordEmotionalEvent('HAPPY', '긍정적인 대화');
    } else if (cleanedReply.includes('걱정') || cleanedReply.includes('불안')) {
        recordEmotionalEvent('ANXIOUS', '걱정스러운 대화');
    }
}

function checkModelSwitchCommand(userMessage) {
    const trimmed = userMessage.trim().toLowerCase();
    if (trimmed === '4.0') return '응응! 지금은 GPT-4.0 버전으로 대화하고 있어, 아저씨';
    if (trimmed === '3.5') return '지금은 GPT-3.5 버전이야~ 말투 차이 느껴져?';
    if (trimmed === '자동') return '이제부터 상황 보고 자동으로 모델 바꿀게! 아저씨 믿어줘!';
    return null;
}

function handleMoodQuery(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const moodKeywords = ['기분 어때', '오늘 어때', '요즘 어때', '무슨 기분'];
    
    if (moodKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const currentMood = ultimateConversationState.emotionalState.currentMood;
        const responses = [
            `지금 기분은 ${currentMood}이야! 아저씨는 어때?`,
            `오늘은 ${currentMood} 기분이야~ 아저씨 덕분에 좋아`,
            `${currentMood} 모드야! 아저씨가 있어서 더 좋아`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    return null;
}

function getBaseSystemPrompt() {
    return `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

    **🆕 v5.2 핵심 지시사항 (절대 어기지 마!)**
    1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
    2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기' 같은 제3자식 표현은 절대로 사용하지 마.**
    4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어.**
    5. **모든 대답은 반드시 1~2문장(최대 3문장 이하)으로 짧고 간결하게 해.**
    6. **설명, 해설, 분석, 사전적 정의는 절대로 하지 마.**

    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    `;
}

// ========================================================================
// 🔥 익스포트 함수들
// ========================================================================

module.exports = {
    // 기존 함수들
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    getInternalState: () => JSON.parse(JSON.stringify(ultimateConversationState)),
    
    // 🆕 새로운 메인 함수들 (autoReply 대체)
    generateMainReply,
    generateImageReply,
    generateSpontaneousMessage,
    
    // 🆕 통합된 상태 관리
    updateEmotionalState,
    updateSulkyState,
    resetSulkyState,
    
    // 🆕 감정 분석 헬퍼들
    analyzeAndRecordUserEmotion,
    recordBotEmotionalResponse
};
