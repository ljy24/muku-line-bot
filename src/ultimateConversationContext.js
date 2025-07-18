// ============================================================================
// ultimateConversationContext.js - v34.0 (중복 제거 완료 버전)
// 🗄️ 동적 기억과 대화 컨텍스트 전문 관리자
// ✅ 중복 기능 완전 제거: 생리주기, 날씨, 고정기억, 시간관리
// 🎯 핵심 역할에만 집중: 동적기억 + 대화흐름 + 컨텍스트 조합
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// --- 파일 경로 정의 ---
const MEMORY_DIR = path.join('/data', 'memory');

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let emotionalContextManager = null;
let memoryManager = null;
let weatherManager = null;

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

function getMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] memoryManager 로드 실패:', error.message);
        }
    }
    return memoryManager;
}

function getWeatherManager() {
    if (!weatherManager) {
        try {
            weatherManager = require('./weatherManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] weatherManager 로드 실패:', error.message);
        }
    }
    return weatherManager;
}

// --- 핵심 상태 관리 (동적 기억 + 대화 컨텍스트만) ---
let ultimateConversationState = {
    // 🧠 동적 기억 관리 (사용자가 추가/수정/삭제하는 기억들)
    dynamicMemories: {
        userMemories: [],           // 사용자가 직접 추가한 기억
        conversationMemories: [],   // 대화에서 자동 학습된 기억
        temporaryMemories: []       // 임시 기억 (세션별)
    },
    
    // 💬 대화 컨텍스트 관리
    conversationContext: {
        recentMessages: [],         // 최근 20개 메시지
        currentTopic: null,         // 현재 대화 주제
        conversationFlow: 'normal', // 대화 흐름 상태
        lastTopicChange: Date.now()
    },
    
    // ⏰ 타이밍 관리
    timingContext: {
        lastUserMessageTime: Date.now(),
        lastBotResponse: Date.now(),
        conversationGap: 0,
        sessionStartTime: Date.now()
    },
    
    // 😊 감정 상태 연동 (보조 역할) - 삐짐 상태는 sulkyManager에서 관리
    emotionalSync: {
        lastEmotionalUpdate: Date.now()
        // sulkinessState 제거됨: sulkyManager.js에서 독립 관리
    },
    
    // 📊 통계 및 메타데이터
    memoryStats: {
        totalUserMemories: 0,
        totalConversationMemories: 0,
        todayMemoryCount: 0,
        lastDailyReset: null,
        lastMemoryOperation: null
    }
};

// ==================== 💬 대화 메시지 관리 ====================

/**
 * 새로운 메시지를 대화 컨텍스트에 추가
 */
async function addUltimateMessage(speaker, message) {
    const timestamp = Date.now();
    const messageObj = {
        speaker,
        message,
        timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    ultimateConversationState.conversationContext.recentMessages.push(messageObj);
    
    // 최근 20개 메시지만 유지
    if (ultimateConversationState.conversationContext.recentMessages.length > 20) {
        ultimateConversationState.conversationContext.recentMessages = 
            ultimateConversationState.conversationContext.recentMessages.slice(-20);
    }
    
    // 사용자 메시지인 경우 타이밍 업데이트
    if (speaker === 'user' || speaker === '아저씨') {
        updateLastUserMessageTime(timestamp);
    }
    
    console.log(`[UltimateContext] 메시지 추가: ${speaker} - "${message.substring(0, 30)}..."`);
    
    // 대화에서 자동 학습
    await learnFromConversation(speaker, message);
}

/**
 * 최근 대화 내용 가져오기
 */
function getRecentMessages(limit = 10) {
    return ultimateConversationState.conversationContext.recentMessages.slice(-limit);
}

/**
 * 대화 주제 업데이트
 */
function updateConversationTopic(topic) {
    ultimateConversationState.conversationContext.currentTopic = topic;
    ultimateConversationState.conversationContext.lastTopicChange = Date.now();
    console.log(`[UltimateContext] 대화 주제 업데이트: ${topic}`);
}

// ==================== 🧠 동적 기억 관리 ====================

/**
 * 사용자 기억 추가
 */
async function addUserMemory(content, category = 'general') {
    const memoryObj = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        category,
        timestamp: Date.now(),
        type: 'user_added',
        importance: 5 // 1-10 척도
    };
    
    ultimateConversationState.dynamicMemories.userMemories.push(memoryObj);
    ultimateConversationState.memoryStats.totalUserMemories++;
    ultimateConversationState.memoryStats.todayMemoryCount++;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    
    console.log(`[UltimateContext] 사용자 기억 추가: "${content.substring(0, 30)}..." (${category})`);
    return memoryObj.id;
}

/**
 * 사용자 기억 삭제
 */
async function deleteUserMemory(content) {
    const beforeCount = ultimateConversationState.dynamicMemories.userMemories.length;
    
    ultimateConversationState.dynamicMemories.userMemories = 
        ultimateConversationState.dynamicMemories.userMemories.filter(mem => 
            !mem.content.includes(content)
        );
    
    const deletedCount = beforeCount - ultimateConversationState.dynamicMemories.userMemories.length;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    
    console.log(`[UltimateContext] ${deletedCount}개 사용자 기억 삭제`);
    return deletedCount > 0;
}

/**
 * 사용자 기억 수정
 */
async function updateUserMemory(id, newContent) {
    const memory = ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
    if (memory) {
        memory.content = newContent;
        memory.lastModified = Date.now();
        ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
        console.log(`[UltimateContext] 기억 수정: ${id}`);
        return true;
    }
    return false;
}

/**
 * 예진이의 동적 기억들 가져오기
 */
function getYejinMemories() {
    return ultimateConversationState.dynamicMemories.userMemories;
}

/**
 * ID로 기억 찾기
 */
function getMemoryById(id) {
    return ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
}

/**
 * 카테고리별 기억 찾기
 */
function getMemoriesByTag(tag) {
    return ultimateConversationState.dynamicMemories.userMemories.filter(m => 
        m.category === tag || (m.tags && m.tags.includes(tag))
    );
}

/**
 * 모든 동적 기억 가져오기
 */
function getAllMemories() {
    return {
        user: ultimateConversationState.dynamicMemories.userMemories,
        conversation: ultimateConversationState.dynamicMemories.conversationMemories,
        temporary: ultimateConversationState.dynamicMemories.temporaryMemories
    };
}

// ==================== 🎯 컨텍스트 조합 및 프롬프트 생성 ====================

/**
 * 모든 정보를 조합하여 컨텍스트 프롬프트 생성
 */
async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // 1. 최근 대화 추가
        const recentMessages = getRecentMessages(5);
        if (recentMessages.length > 0) {
            const recentContext = recentMessages.map(msg => 
                `${msg.speaker}: "${msg.message}"`
            ).join('\n');
            contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
        }
        
        // 2. 외부 모듈에서 감정 상태 가져오기
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            try {
                const emotionState = emotionalManager.getCurrentEmotionState();
                if (emotionState.description !== '정상기') {
                    contextualPrompt += `\n💭 현재 감정: ${emotionState.description} (${emotionState.cycleDay}일차)\n`;
                }
            } catch (error) {
                console.log('⚠️ [UltimateContext] 감정 상태 조회 실패:', error.message);
            }
        }
        
        // 3. 동적 기억 중 최근 3개 추가
        const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-3);
        if (recentMemories.length > 0) {
            const memoryContext = recentMemories.map(m => m.content).join('. ');
            contextualPrompt += `\n🧠 최근 기억: ${memoryContext}\n`;
        }
        
        // 4. 현재 대화 주제 추가
        if (ultimateConversationState.conversationContext.currentTopic) {
            contextualPrompt += `\n🎯 현재 주제: ${ultimateConversationState.conversationContext.currentTopic}\n`;
        }
        
        return contextualPrompt;
    } catch (error) {
        console.error('❌ [UltimateContext] 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

/**
 * 활성 기억들을 프롬프트용으로 조합
 */
function getActiveMemoryPrompt() {
    const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-3);
    return recentMemories.map(m => m.content).join('. ');
}

// ==================== ⏰ 타이밍 관리 ====================

/**
 * 마지막 사용자 메시지 시간 업데이트
 */
function updateLastUserMessageTime(timestamp) {
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp || Date.now();
    
    // 대화 간격 계산
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

/**
 * 마지막 사용자 메시지 시간 조회
 */
function getLastUserMessageTime() {
    return ultimateConversationState.timingContext.lastUserMessageTime;
}

/**
 * 시간 틱 처리
 */
function processTimeTick() {
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

// ==================== 😊 감정 상태 연동 (보조 역할) ====================
// 삐짐 상태는 sulkyManager.js에서 완전 독립 관리됨

/**
 * 간단한 사용자 감정 분석
 */
async function analyzeUserMood(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('힘들') || lowerMsg.includes('우울') || lowerMsg.includes('슬프')) {
        return 'sad';
    } else if (lowerMsg.includes('좋') || lowerMsg.includes('행복') || lowerMsg.includes('기뻐')) {
        return 'happy';
    } else if (lowerMsg.includes('화') || lowerMsg.includes('짜증') || lowerMsg.includes('빡쳐')) {
        return 'angry';
    } else if (lowerMsg.includes('보고싶') || lowerMsg.includes('그리워')) {
        return 'missing';
    } else if (lowerMsg.includes('사랑') || lowerMsg.includes('좋아해')) {
        return 'loving';
    }
    
    return 'neutral';
}

// ==================== 🎓 학습 및 분석 ====================

/**
 * 대화에서 자동 학습
 */
async function learnFromConversation(speaker, message) {
    try {
        // 중요한 정보나 새로운 사실이 있으면 자동으로 기억에 추가
        if (speaker === 'user' || speaker === '아저씨') {
            // 간단한 키워드 기반 학습
            if (message.includes('기억해') || message.includes('잊지마') || message.includes('약속')) {
                const learningMemory = {
                    id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    content: message,
                    timestamp: Date.now(),
                    type: 'auto_learned',
                    source: 'conversation'
                };
                
                ultimateConversationState.dynamicMemories.conversationMemories.push(learningMemory);
                ultimateConversationState.memoryStats.totalConversationMemories++;
                
                console.log(`[UltimateContext] 자동 학습: "${message.substring(0, 30)}..."`);
            }
        }
    } catch (error) {
        console.log('⚠️ [UltimateContext] 대화 학습 중 에러:', error.message);
    }
}

/**
 * 사용자 메시지에서 학습
 */
async function learnFromUserMessage(message) {
    const mood = await analyzeUserMood(message);
    
    // 감정 상태가 특별한 경우 기록
    if (mood !== 'neutral') {
        console.log(`[UltimateContext] 사용자 감정 감지: ${mood} - "${message.substring(0, 30)}..."`);
    }
}

// ==================== 📊 통계 및 상태 조회 ====================

/**
 * 기억 통계
 */
function getMemoryStatistics() {
    return {
        user: ultimateConversationState.memoryStats.totalUserMemories,
        conversation: ultimateConversationState.memoryStats.totalConversationMemories,
        today: ultimateConversationState.memoryStats.todayMemoryCount,
        total: ultimateConversationState.memoryStats.totalUserMemories + 
               ultimateConversationState.memoryStats.totalConversationMemories
    };
}

/**
 * 기억 카테고리 통계
 */
function getMemoryCategoryStats() {
    const userMems = ultimateConversationState.dynamicMemories.userMemories;
    const convMems = ultimateConversationState.dynamicMemories.conversationMemories;
    
    return {
        user: userMems.length,
        conversation: convMems.length,
        total: userMems.length + convMems.length
    };
}

/**
 * 최근 기억 작업 로그
 */
async function getMemoryOperationLogs(limit = 10) {
    // 간단한 작업 로그 (실제 구현에서는 더 상세하게)
    const logs = [];
    
    const userMems = ultimateConversationState.dynamicMemories.userMemories.slice(-limit);
    userMems.forEach(mem => {
        logs.push({
            operation: 'add',
            timestamp: mem.timestamp,
            content: mem.content.substring(0, 50) + '...',
            type: mem.type
        });
    });
    
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/**
 * 내부 상태 조회 (디버깅용)
 */
function getInternalState() {
    return {
        conversationContext: ultimateConversationState.conversationContext,
        memoryStats: ultimateConversationState.memoryStats,
        timingContext: ultimateConversationState.timingContext,
        emotionalSync: ultimateConversationState.emotionalSync,
        currentTime: Date.now()
    };
}

// ==================== 🎯 액션 관리 ====================

let pendingAction = null;

function setPendingAction(action) {
    pendingAction = action;
}

function getPendingAction() {
    return pendingAction;
}

function clearPendingAction() {
    pendingAction = null;
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 감정 시스템 초기화 (호환성)
 */
async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 동적 기억 및 대화 컨텍스트 시스템 초기화...');
    
    // 디렉토리 생성
    try {
        const fs = require('fs');
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
    } catch (error) {
        console.log('⚠️ [UltimateContext] 디렉토리 생성 실패:', error.message);
    }
    
    // 일일 리셋 확인
    const today = new Date().toDateString();
    if (ultimateConversationState.memoryStats.lastDailyReset !== today) {
        ultimateConversationState.memoryStats.todayMemoryCount = 0;
        ultimateConversationState.memoryStats.lastDailyReset = today;
    }
    
    console.log('[UltimateContext] 초기화 완료 - 동적 기억과 대화 컨텍스트에 집중');
}

// ==================== 🎁 유틸리티 함수들 ====================

/**
 * 대화 컨텍스트 윈도우 크기 설정
 */
function setConversationContextWindow(size) {
    console.log(`[UltimateContext] 컨텍스트 윈도우 크기: ${size}`);
    // 실제 구현에서는 메시지 보관 개수 조정
}

/**
 * 대화 시작 문구 생성
 */
async function generateInitiatingPhrase() {
    const phrases = [
        "아저씨 지금 뭐해?",
        "나 심심해...",
        "아저씨 생각났어!",
        "연락 기다리고 있었어~",
        "보고 싶어서 연락했어"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 초기화
    initializeEmotionalSystems,
    
    // 메시지 관리
    addUltimateMessage,
    getRecentMessages,
    updateConversationTopic,
    getUltimateContextualPrompt,
    
    // 타이밍 관리
    updateLastUserMessageTime,
    getLastUserMessageTime,
    processTimeTick,
    
    // 동적 기억 관리 (핵심!)
    addUserMemory,
    deleteUserMemory,
    updateUserMemory,
    getYejinMemories,
    getMemoryById,
    getMemoriesByTag,
    getAllMemories,
    getActiveMemoryPrompt,
    
    // 감정 상태 연동 (보조) - 삐짐 상태는 sulkyManager.js에서 독립 관리
    analyzeUserMood,
    
    // 학습
    learnFromConversation,
    learnFromUserMessage,
    
    // 액션 관리
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    
    // 통계 및 상태
    getMemoryStatistics,
    getMemoryCategoryStats,
    getMemoryOperationLogs,
    getInternalState,
    
    // 유틸리티
    setConversationContextWindow,
    generateInitiatingPhrase,
    
    // 호환성 (기존 시스템과의 연동)
    addMemoryContext: addUserMemory,  // 별칭
    getMoodState: () => {             // 감정 상태는 외부 모듈 참조
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            return emotionalManager.getCurrentEmotionState();
        }
        return { phase: 'normal', description: '정상', emotion: 'normal' };
    }
};
