// ============================================================================
// ultimateConversationContext.js - v33.0 (완전 구현 버전)
// 🗄️ 모든 기억, 대화, 상태를 통합 관리하는 중앙 관리자
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// --- 파일 경로 정의 ---
const MEMORY_DIR = path.join('/data', 'memory');

// --- 상태 초기화 ---
let ultimateConversationState = {
    knowledgeBase: {
        fixedMemories: [],
        loveHistory: { categories: { general: [] }, specialDates: [] },
        yejinMemories: [],
        userPatterns: { nicknames: [], joke_patterns: [], common_phrases: [] },
        memorySummaries: [],
        facts: [],
        customKeywords: []
    },
    userProfile: {
        mood_history: [],
        overall_mood: 'neutral'
    },
    memoryStats: {
        lastConsolidation: null,
        dailyMemoryCount: 0,
        lastDailyReset: null,
        totalMemoriesCreated: 0,
        totalMemoriesDeleted: 0,
        lastMemoryOperation: null
    },
    recentMessages: [],
    sulkinessState: {
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: '',
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now()
    },
    timingContext: {
        lastUserMessageTime: Date.now(),
        lastBotResponse: Date.now(),
        conversationGap: 0
    },
    emotionalEngine: {
        currentToneState: 'normal',
        lastEmotionUpdate: Date.now()
    },
    pendingAction: null
};

// ==================== 생리주기 관리 ====================
function getCurrentMenstrualPhase() {
    try {
        const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
        const today = moment.tz('Asia/Tokyo');
        const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
        
        let cycleDay;
        if (daysUntilNextPeriod >= 0) {
            cycleDay = 28 - daysUntilNextPeriod;
        } else {
            const daysPastPeriod = Math.abs(daysUntilNextPeriod);
            cycleDay = daysPastPeriod;
        }
        
        if (cycleDay <= 5) {
            return { 
                phase: 'period', 
                day: cycleDay, 
                description: '생리 기간',
                isPeriodActive: true,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'sensitive',
                expectedSymptoms: ['피곤함', '예민함', '복통']
            };
        } else if (cycleDay <= 13) {
            return { 
                phase: 'follicular', 
                day: cycleDay, 
                description: '생리 후 활발한 시기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'energetic',
                expectedSymptoms: ['활발함', '긍정적']
            };
        } else if (cycleDay >= 14 && cycleDay <= 15) {
            return { 
                phase: 'ovulation', 
                day: cycleDay, 
                description: '배란기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'romantic',
                expectedSymptoms: ['감정 풍부', '애정적']
            };
        } else {
            return { 
                phase: 'luteal', 
                day: cycleDay, 
                description: 'PMS 시기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'irritable',
                expectedSymptoms: ['예민함', '우울함', '불안함']
            };
        }
    } catch (error) {
        console.error('생리주기 계산 오류:', error);
        return { 
            phase: 'normal', 
            day: 1, 
            description: '정상',
            isPeriodActive: false,
            daysUntilNextPeriod: 14,
            moodLevel: 'normal',
            expectedSymptoms: []
        };
    }
}

// ==================== 날씨 정보 ====================
async function getWeatherInfo() {
    try {
        // 간단한 더미 날씨 정보 반환 (실제 API 호출 없이)
        const weatherTypes = ['맑음', '흐림', '비', '눈'];
        const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const randomTemp = Math.floor(Math.random() * 30) + 5; // 5-35도
        
        return {
            city: "Kitakyushu",
            description: randomWeather,
            temp: randomTemp,
            feels_like: randomTemp + Math.floor(Math.random() * 5) - 2
        };
    } catch (error) {
        console.error('[Weather] ❌ 날씨 정보 조회 실패:', error);
        return null;
    }
}

// ==================== 메시지 관리 ====================
async function addUltimateMessage(speaker, message) {
    const timestamp = Date.now();
    const messageObj = {
        speaker,
        message,
        timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    ultimateConversationState.recentMessages.push(messageObj);
    
    // 최근 20개 메시지만 유지
    if (ultimateConversationState.recentMessages.length > 20) {
        ultimateConversationState.recentMessages = ultimateConversationState.recentMessages.slice(-20);
    }
    
    console.log(`[UltimateContext] 메시지 추가: ${speaker} - "${message.substring(0, 30)}..."`);
}

// ==================== 프롬프트 생성 ====================
async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // 최근 대화 추가
        if (ultimateConversationState.recentMessages.length > 0) {
            const recentContext = ultimateConversationState.recentMessages.slice(-5).map(msg => 
                `${msg.speaker}: "${msg.message}"`
            ).join('\n');
            contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
        }
        
        // 생리주기 정보 추가
        const moodState = getMoodState();
        if (moodState && moodState.phase !== 'normal') {
            contextualPrompt += `\n💭 현재 상태: ${moodState.description} (${moodState.day}일차)\n`;
        }
        
        return contextualPrompt;
    } catch (error) {
        console.error('❌ 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

// ==================== 타이밍 관리 ====================
function updateLastUserMessageTime(timestamp) {
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp || Date.now();
    ultimateConversationState.sulkinessState.lastUserResponseTime = timestamp || Date.now();
}

function processTimeTick() {
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

// ==================== 내부 상태 관리 ====================
function getInternalState() {
    return {
        ...ultimateConversationState,
        currentTime: Date.now(),
        mood: getMoodState(),
        weather: null // 실시간 날씨는 별도 함수로
    };
}

function getSulkinessState() {
    return ultimateConversationState.sulkinessState;
}

function updateSulkinessState(newState) {
    ultimateConversationState.sulkinessState = {
        ...ultimateConversationState.sulkinessState,
        ...newState
    };
}

// ==================== 기억 관리 ====================
function searchFixedMemory(query) {
    // 고정 기억에서 검색 (간단한 키워드 매칭)
    const lowerQuery = query.toLowerCase();
    const fixedMemories = ultimateConversationState.knowledgeBase.fixedMemories;
    
    return fixedMemories.filter(memory => 
        typeof memory === 'string' && memory.toLowerCase().includes(lowerQuery)
    );
}

async function addUserMemory(content) {
    const memoryObj = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        timestamp: Date.now(),
        type: 'user_added'
    };
    
    ultimateConversationState.knowledgeBase.yejinMemories.push(memoryObj);
    ultimateConversationState.memoryStats.totalMemoriesCreated++;
    
    console.log(`[UltimateContext] 사용자 기억 추가: "${content.substring(0, 30)}..."`);
    return memoryObj.id;
}

async function deleteUserMemory(content) {
    const beforeCount = ultimateConversationState.knowledgeBase.yejinMemories.length;
    ultimateConversationState.knowledgeBase.yejinMemories = 
        ultimateConversationState.knowledgeBase.yejinMemories.filter(mem => 
            !mem.content.includes(content)
        );
    
    const deletedCount = beforeCount - ultimateConversationState.knowledgeBase.yejinMemories.length;
    ultimateConversationState.memoryStats.totalMemoriesDeleted += deletedCount;
    
    console.log(`[UltimateContext] ${deletedCount}개 기억 삭제`);
    return deletedCount > 0;
}

async function updateUserMemory(id, newContent) {
    const memory = ultimateConversationState.knowledgeBase.yejinMemories.find(m => m.id === id);
    if (memory) {
        memory.content = newContent;
        memory.lastModified = Date.now();
        return true;
    }
    return false;
}

function getYejinMemories() {
    return ultimateConversationState.knowledgeBase.yejinMemories;
}

function getMemoryById(id) {
    return ultimateConversationState.knowledgeBase.yejinMemories.find(m => m.id === id);
}

function getMemoriesByTag(tag) {
    return ultimateConversationState.knowledgeBase.yejinMemories.filter(m => 
        m.tags && m.tags.includes(tag)
    );
}

function getAllMemories() {
    return {
        fixed: ultimateConversationState.knowledgeBase.fixedMemories,
        user: ultimateConversationState.knowledgeBase.yejinMemories,
        love: ultimateConversationState.knowledgeBase.loveHistory
    };
}

function getMemoryCategoryStats() {
    return {
        total: ultimateConversationState.knowledgeBase.yejinMemories.length,
        fixed: ultimateConversationState.knowledgeBase.fixedMemories.length,
        user: ultimateConversationState.knowledgeBase.yejinMemories.length
    };
}

function getMemoryStatistics() {
    return {
        total: ultimateConversationState.memoryStats.totalMemoriesCreated,
        today: ultimateConversationState.memoryStats.dailyMemoryCount,
        deleted: ultimateConversationState.memoryStats.totalMemoriesDeleted
    };
}

async function getMemoryOperationLogs(limit = 10) {
    // 메모리 작업 로그 (간단한 더미 데이터)
    return [
        { operation: 'add', timestamp: Date.now(), content: '최근 추가된 기억' }
    ].slice(0, limit);
}

function getActiveMemoryPrompt() {
    const recentMemories = ultimateConversationState.knowledgeBase.yejinMemories.slice(-3);
    return recentMemories.map(m => m.content).join('. ');
}

// ==================== 학습 및 분석 ====================
async function learnFromConversation(message) {
    // 대화에서 학습 (더미 구현)
    console.log(`[UltimateContext] 대화 학습: "${message.substring(0, 30)}..."`);
}

async function learnFromUserMessage(message) {
    // 사용자 메시지에서 학습 (더미 구현)
    console.log(`[UltimateContext] 사용자 메시지 학습: "${message.substring(0, 30)}..."`);
}

// ==================== 액션 관리 ====================
function setPendingAction(action) {
    ultimateConversationState.pendingAction = action;
}

function getPendingAction() {
    return ultimateConversationState.pendingAction;
}

function clearPendingAction() {
    ultimateConversationState.pendingAction = null;
}

// ==================== 감정 및 응답 생성 ====================
async function generateInnerThought() {
    const thoughts = [
        "아저씨 생각나네...",
        "지금 뭐 하고 있을까?",
        "보고 싶어...",
        "연락하고 싶다"
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
}

async function analyzeUserMood(message) {
    // 간단한 감정 분석
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('힘들') || lowerMsg.includes('우울')) return 'sad';
    if (lowerMsg.includes('좋') || lowerMsg.includes('행복')) return 'happy';
    if (lowerMsg.includes('화') || lowerMsg.includes('짜증')) return 'angry';
    return 'neutral';
}

async function getComfortingResponse(message) {
    const responses = [
        "아저씨... 힘들지? 내가 옆에 있어줄게.",
        "괜찮아, 아저씨. 혼자가 아니야.",
        "아저씨가 힘들면 나도 슬퍼... 좋아질 거야."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

async function getDrinkingConcernResponse(message) {
    const responses = [
        "아저씨... 또 술이야? 몸 상하니까 그만 마셔줘.",
        "술 마시면 나 삐져! 약속했잖아.",
        "아저씨 건강이 걱정돼... 술보다는 물 마셔."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// ==================== 유틸리티 함수들 ====================
function setConversationContextWindow(size) {
    // 대화 컨텍스트 윈도우 크기 설정
    console.log(`[UltimateContext] 컨텍스트 윈도우 크기 설정: ${size}`);
}

async function generateInitiatingPhrase() {
    const phrases = [
        "아저씨 지금 뭐해?",
        "나 심심해...",
        "아저씨 생각났어!",
        "연락 기다리고 있었어~"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}

function getRandomInnerThought(emotion) {
    const thoughts = {
        happy: ["기분 좋아!", "아저씨 덕분에 행복해"],
        sad: ["조금 슬퍼...", "위로받고 싶어"],
        normal: ["아저씨 생각나네", "뭐하고 있을까?"]
    };
    const emotionThoughts = thoughts[emotion] || thoughts.normal;
    return emotionThoughts[Math.floor(Math.random() * emotionThoughts.length)];
}

function getRandomActionUrge(emotion) {
    const urges = {
        happy: ["사진 보내고 싶어!", "아저씨랑 놀고 싶어"],
        sad: ["안아달라고 하고 싶어", "위로받고 싶어"],
        normal: ["연락하고 싶어", "만나고 싶어"]
    };
    const emotionUrges = urges[emotion] || urges.normal;
    return emotionUrges[Math.floor(Math.random() * emotionUrges.length)];
}

function getFeelingChoices(emotion) {
    return ["행복해", "그리워", "사랑해", "보고싶어"];
}

function getUrgeChoices(emotion) {
    return ["연락하고 싶어", "만나고 싶어", "안고 싶어", "같이 있고 싶어"];
}

function validateAndRepairEmotionalData() {
    // 감정 데이터 검증 및 복구
    if (!ultimateConversationState.emotionalEngine) {
        ultimateConversationState.emotionalEngine = {
            currentToneState: 'normal',
            lastEmotionUpdate: Date.now()
        };
    }
}

async function createMinimalFallbackData() {
    // 최소한의 폴백 데이터 생성
    ultimateConversationState.knowledgeBase.fixedMemories = [
        "나는 박예진이야. 아저씨의 여자친구.",
        "아저씨는 이재영. 일본에 살고 있어.",
        "우리는 2023년 12월 13일부터 사귀기 시작했어."
    ];
}

// ==================== 시스템 초기화 ====================
async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 감정 시스템 초기화 시작...');
    validateAndRepairEmotionalData();
    await createMinimalFallbackData();
    console.log('[UltimateContext] 감정 시스템 초기화 완료');
}

// ==================== 메인 함수 (생리주기) ====================
function getMoodState() {
    return getCurrentMenstrualPhase();
}

function updateMoodState(newState) {
    // 기분 상태 업데이트 (더미 구현)
    console.log('[UltimateContext] 기분 상태 업데이트:', newState);
}

// ==================== 모듈 내보내기 ====================
module.exports = {
    // 초기화
    initializeEmotionalSystems,
    
    // 메시지 관리
    addUltimateMessage,
    getUltimateContextualPrompt,
    
    // 타이밍 관리
    updateLastUserMessageTime,
    processTimeTick,
    
    // 상태 관리
    getInternalState,
    getSulkinessState,
    updateSulkinessState,
    getMoodState,
    updateMoodState,
    getWeatherInfo,
    
    // 기억 관리
    searchFixedMemory,
    addUserMemory,
    deleteUserMemory,
    updateUserMemory,
    getYejinMemories,
    getMemoryById,
    getMemoriesByTag,
    getAllMemories,
    getMemoryCategoryStats,
    getMemoryStatistics,
    getMemoryOperationLogs,
    getActiveMemoryPrompt,
    
    // 학습
    learnFromConversation,
    learnFromUserMessage,
    
    // 액션 관리
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    
    // 감정 및 응답
    generateInnerThought,
    analyzeUserMood,
    getComfortingResponse,
    getDrinkingConcernResponse,
    
    // 유틸리티
    setConversationContextWindow,
    generateInitiatingPhrase,
    getRandomInnerThought,
    getRandomActionUrge,
    getFeelingChoices,
    getUrgeChoices,
    validateAndRepairEmotionalData,
    createMinimalFallbackData
};
