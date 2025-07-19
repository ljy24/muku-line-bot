// ============================================================================
// ultimateConversationContext.js - v35.0 (실제 통계 추적 시스템 추가)
// 🗄️ 동적 기억과 대화 컨텍스트 전문 관리자
// ✅ 중복 기능 완전 제거: 생리주기, 날씨, 고정기억, 시간관리
// 🎯 핵심 역할에만 집중: 동적기억 + 대화흐름 + 컨텍스트 조합
// ✨ GPT 모델 버전 전환: index.js의 설정에 따라 컨텍스트 최적화
// ⭐️ getSpontaneousStats() 함수 추가 - 라인 상태 리포트용 자발적 메시지 통계
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [UltimateContext] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [UltimateContext] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// --- 설정 ---
const TIMEZONE = 'Asia/Tokyo';
const MEMORY_DIR = path.join('/data', 'memory');
const DAILY_SPONTANEOUS_TARGET = 20; // 하루 자발적 메시지 목표

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

// --- 핵심 상태 관리 (동적 기억 + 대화 컨텍스트 + ⭐️ 자발적 메시지 통계) ---
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
    
    // ⭐️ 자발적 메시지 통계 추가!
    spontaneousMessages: {
        sentToday: 0,                    // 오늘 보낸 자발적 메시지 수
        totalDaily: DAILY_SPONTANEOUS_TARGET, // 하루 목표
        sentTimes: [],                   // 실제 전송된 시간들
        lastSentTime: null,              // 마지막 전송 시간
        nextScheduledTime: null,         // 다음 예정 시간
        messageTypes: {                  // 메시지 타입별 통계
            emotional: 0,                // 감성 메시지
            casual: 0,                   // 일상 메시지
            caring: 0,                   // 걱정/관심 메시지
            playful: 0                   // 장난스러운 메시지
        },
        lastResetDate: null             // 마지막 리셋 날짜
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

// ================== 🎨 로그 함수 ==================
function contextLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [UltimateContext] ${message}`);
    if (data) {
        console.log('  🗄️ 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== ✨ GPT 모델별 컨텍스트 최적화 ==================

/**
 * 현재 설정된 GPT 모델에 따라 컨텍스트 길이 조정
 */
function getOptimalContextLength() {
    if (!getCurrentModelSetting) {
        return { recent: 5, memory: 3 }; // 기본값
    }
    
    const currentModel = getCurrentModelSetting();
    
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 컨텍스트를 짧게
            return { recent: 3, memory: 2 };
            
        case '4.0':
            // GPT-4o는 컨텍스트를 길게
            return { recent: 7, memory: 4 };
            
        case 'auto':
            // 자동 모드는 중간
            return { recent: 5, memory: 3 };
            
        default:
            return { recent: 5, memory: 3 };
    }
}

/**
 * 모델별로 최적화된 컨텍스트 우선순위 결정
 */
function getContextPriority(currentModel) {
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 간결한 정보에 집중
            return {
                recentMessages: 0.5,    // 최근 대화 가중치
                emotions: 0.3,          // 감정 상태 가중치
                memories: 0.2           // 기억 가중치
            };
            
        case '4.0':
            // GPT-4o는 풍부한 컨텍스트 활용
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
            
        case 'auto':
        default:
            // 균형잡힌 가중치
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
    }
}

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
    
    // ✨ 모델별 최적화된 메시지 보관 개수
    const contextLength = getOptimalContextLength();
    const maxMessages = contextLength.recent * 3; // 여유분 포함
    
    if (ultimateConversationState.conversationContext.recentMessages.length > maxMessages) {
        ultimateConversationState.conversationContext.recentMessages = 
            ultimateConversationState.conversationContext.recentMessages.slice(-maxMessages);
    }
    
    // 사용자 메시지인 경우 타이밍 업데이트
    if (speaker === 'user' || speaker === '아저씨') {
        updateLastUserMessageTime(timestamp);
    }
    
    contextLog(`메시지 추가: ${speaker} - "${message.substring(0, 30)}..."`);
    
    // 대화에서 자동 학습
    await learnFromConversation(speaker, message);
}

/**
 * 최근 대화 내용 가져오기 (모델별 최적화)
 */
function getRecentMessages(limit = null) {
    const contextLength = getOptimalContextLength();
    const actualLimit = limit || contextLength.recent;
    
    return ultimateConversationState.conversationContext.recentMessages.slice(-actualLimit);
}

/**
 * 대화 주제 업데이트
 */
function updateConversationTopic(topic) {
    ultimateConversationState.conversationContext.currentTopic = topic;
    ultimateConversationState.conversationContext.lastTopicChange = Date.now();
    contextLog(`대화 주제 업데이트: ${topic}`);
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
    
    contextLog(`사용자 기억 추가: "${content.substring(0, 30)}..." (${category})`);
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
    
    contextLog(`${deletedCount}개 사용자 기억 삭제`);
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
        contextLog(`기억 수정: ${id}`);
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

// ==================== ⭐️ 자발적 메시지 통계 관리 (새로 추가!) ====================

/**
 * ⭐️ 자발적 메시지 전송 기록
 */
function recordSpontaneousMessage(messageType = 'casual') {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    
    // 전송 횟수 증가
    ultimateConversationState.spontaneousMessages.sentToday++;
    
    // 전송 시간 기록
    ultimateConversationState.spontaneousMessages.sentTimes.push(timeString);
    ultimateConversationState.spontaneousMessages.lastSentTime = sentTime.valueOf();
    
    // 메시지 타입별 통계
    if (ultimateConversationState.spontaneousMessages.messageTypes[messageType] !== undefined) {
        ultimateConversationState.spontaneousMessages.messageTypes[messageType]++;
    }
    
    contextLog(`자발적 메시지 기록: ${messageType} (${timeString}) - 총 ${ultimateConversationState.spontaneousMessages.sentToday}건`);
}

/**
 * ⭐️ 다음 자발적 메시지 시간 설정
 */
function setNextSpontaneousTime(nextTime) {
    ultimateConversationState.spontaneousMessages.nextScheduledTime = nextTime;
    
    const timeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
    contextLog(`다음 자발적 메시지 시간 설정: ${timeString}`);
}

/**
 * ⭐️ 자발적 메시지 통계 조회 (라인 상태 리포트용!)
 */
function getSpontaneousStats() {
    const nextTime = ultimateConversationState.spontaneousMessages.nextScheduledTime;
    let nextTimeString = '대기 중';
    
    if (nextTime) {
        nextTimeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
    }
    
    return {
        // 라인 상태 리포트용 핵심 정보
        sentToday: ultimateConversationState.spontaneousMessages.sentToday,
        totalDaily: ultimateConversationState.spontaneousMessages.totalDaily,
        nextTime: nextTimeString,
        
        // 상세 정보
        progress: `${ultimateConversationState.spontaneousMessages.sentToday}/${ultimateConversationState.spontaneousMessages.totalDaily}`,
        sentTimes: ultimateConversationState.spontaneousMessages.sentTimes,
        lastSentTime: ultimateConversationState.spontaneousMessages.lastSentTime ? 
            moment(ultimateConversationState.spontaneousMessages.lastSentTime).tz(TIMEZONE).format('HH:mm') : null,
        
        // 메시지 타입별 통계
        messageTypes: { ...ultimateConversationState.spontaneousMessages.messageTypes },
        
        // 시스템 상태
        isActive: ultimateConversationState.spontaneousMessages.sentToday < ultimateConversationState.spontaneousMessages.totalDaily,
        remainingToday: ultimateConversationState.spontaneousMessages.totalDaily - ultimateConversationState.spontaneousMessages.sentToday,
        
        // GPT 모델 정보
        currentGptModel: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'
    };
}

/**
 * ⭐️ 일일 자발적 메시지 통계 리셋
 */
function resetSpontaneousStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    
    contextLog('🌄 자발적 메시지 통계 리셋 시작');
    
    ultimateConversationState.spontaneousMessages.sentToday = 0;
    ultimateConversationState.spontaneousMessages.sentTimes = [];
    ultimateConversationState.spontaneousMessages.lastSentTime = null;
    ultimateConversationState.spontaneousMessages.nextScheduledTime = null;
    ultimateConversationState.spontaneousMessages.lastResetDate = today;
    
    // 메시지 타입별 통계 리셋
    Object.keys(ultimateConversationState.spontaneousMessages.messageTypes).forEach(type => {
        ultimateConversationState.spontaneousMessages.messageTypes[type] = 0;
    });
    
    contextLog(`✅ 자발적 메시지 통계 리셋 완료 (${today})`);
}

// ==================== 🎯 컨텍스트 조합 및 프롬프트 생성 ====================

/**
 * ✨ 모든 정보를 조합하여 GPT 모델별 최적화된 컨텍스트 프롬프트 생성
 */
async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // ✨ 현재 GPT 모델 설정 확인
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
        const contextLength = getOptimalContextLength();
        const priority = getContextPriority(currentModel);
        
        contextLog(`컨텍스트 생성 (모델: ${currentModel}, 우선순위: 메시지=${priority.recentMessages}, 감정=${priority.emotions}, 기억=${priority.memories})`);
        
        // 1. ✨ 모델별 최적화된 최근 대화 추가
        const recentMessages = getRecentMessages(contextLength.recent);
        if (recentMessages.length > 0 && priority.recentMessages > 0) {
            const recentContext = recentMessages.map(msg => 
                `${msg.speaker}: "${msg.message}"`
            ).join('\n');
            
            if (currentModel === '3.5') {
                // GPT-3.5는 간결하게
                contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
            } else {
                // GPT-4o는 풍부하게
                contextualPrompt += `\n\n📋 최근 대화 (${recentMessages.length}개):\n${recentContext}\n`;
            }
        }
        
        // 2. ✨ 모델별 감정 상태 정보 추가
        if (priority.emotions > 0) {
            const emotionalManager = getEmotionalManager();
            if (emotionalManager && emotionalManager.getCurrentEmotionState) {
                try {
                    const emotionState = emotionalManager.getCurrentEmotionState();
                    if (emotionState.description !== '정상기') {
                        if (currentModel === '3.5') {
                            // GPT-3.5는 핵심만
                            contextualPrompt += `\n💭 현재: ${emotionState.description}\n`;
                        } else {
                            // GPT-4o는 상세하게
                            contextualPrompt += `\n💭 현재 감정: ${emotionState.description} (${emotionState.cycleDay}일차)\n`;
                        }
                    }
                } catch (error) {
                    contextLog('감정 상태 조회 실패:', error.message);
                }
            }
        }
        
        // 3. ✨ 모델별 동적 기억 추가
        if (priority.memories > 0) {
            const memoryCount = contextLength.memory;
            const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-memoryCount);
            
            if (recentMemories.length > 0) {
                const memoryContext = recentMemories.map(m => m.content).join('. ');
                
                if (currentModel === '3.5') {
                    // GPT-3.5는 간단하게
                    contextualPrompt += `\n🧠 기억: ${memoryContext}\n`;
                } else {
                    // GPT-4o는 상세하게
                    contextualPrompt += `\n🧠 최근 기억 (${recentMemories.length}개): ${memoryContext}\n`;
                }
            }
        }
        
        // 4. 현재 대화 주제 추가 (모든 모델에서 사용)
        if (ultimateConversationState.conversationContext.currentTopic) {
            contextualPrompt += `\n🎯 현재 주제: ${ultimateConversationState.conversationContext.currentTopic}\n`;
        }
        
        // 5. ✨ 모델별 추가 메타정보
        if (currentModel === '4.0') {
            // GPT-4o에서만 상세한 메타정보 추가
            const messageCount = ultimateConversationState.conversationContext.recentMessages.length;
            const memoryCount = ultimateConversationState.dynamicMemories.userMemories.length;
            contextualPrompt += `\n📊 컨텍스트: 메시지 ${messageCount}개, 기억 ${memoryCount}개\n`;
        }
        
        contextLog(`컨텍스트 생성 완료 (${currentModel} 최적화, 길이: ${contextualPrompt.length}자)`);
        return contextualPrompt;
        
    } catch (error) {
        console.error('❌ [UltimateContext] 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

/**
 * ✨ 활성 기억들을 모델별로 최적화하여 프롬프트용으로 조합
 */
function getActiveMemoryPrompt() {
    const contextLength = getOptimalContextLength();
    const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-contextLength.memory);
    
    if (!getCurrentModelSetting) {
        return recentMemories.map(m => m.content).join('. ');
    }
    
    const currentModel = getCurrentModelSetting();
    
    if (currentModel === '3.5') {
        // GPT-3.5는 간결하게
        return recentMemories.map(m => m.content.substring(0, 50)).join('. ');
    } else {
        // GPT-4o는 전체 내용
        return recentMemories.map(m => m.content).join('. ');
    }
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
                
                contextLog(`자동 학습: "${message.substring(0, 30)}..."`);
            }
        }
    } catch (error) {
        contextLog('대화 학습 중 에러:', error.message);
    }
}

/**
 * 사용자 메시지에서 학습
 */
async function learnFromUserMessage(message) {
    const mood = await analyzeUserMood(message);
    
    // 감정 상태가 특별한 경우 기록
    if (mood !== 'neutral') {
        contextLog(`사용자 감정 감지: ${mood} - "${message.substring(0, 30)}..."`);
    }
}

// ==================== 📊 통계 및 상태 조회 ====================

/**
 * ✨ GPT 모델 정보를 포함한 기억 통계
 */
function getMemoryStatistics() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    
    return {
        user: ultimateConversationState.memoryStats.totalUserMemories,
        conversation: ultimateConversationState.memoryStats.totalConversationMemories,
        today: ultimateConversationState.memoryStats.todayMemoryCount,
        total: ultimateConversationState.memoryStats.totalUserMemories + 
               ultimateConversationState.memoryStats.totalConversationMemories,
        // ✨ GPT 모델 정보 추가
        currentGptModel: currentModel,
        contextOptimization: {
            recentMessages: contextLength.recent,
            memoryCount: contextLength.memory,
            optimizedFor: currentModel
        }
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
 * ✨ GPT 모델 정보를 포함한 내부 상태 조회 (디버깅용)
 */
function getInternalState() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    const priority = getContextPriority(currentModel);
    
    return {
        conversationContext: ultimateConversationState.conversationContext,
        memoryStats: ultimateConversationState.memoryStats,
        timingContext: ultimateConversationState.timingContext,
        emotionalSync: ultimateConversationState.emotionalSync,
        spontaneousMessages: ultimateConversationState.spontaneousMessages, // ⭐️ 추가!
        currentTime: Date.now(),
        // ✨ GPT 모델 최적화 정보 추가
        gptOptimization: {
            currentModel,
            contextLength,
            priority,
            version: 'v35.0-with-spontaneous-stats'
        }
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
    contextLog('동적 기억 및 대화 컨텍스트 시스템 초기화...');
    
    // ✨ GPT 모델 정보 로그
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    contextLog(`현재 GPT 모델: ${currentModel}`);
    
    // 디렉토리 생성
    try {
        const fs = require('fs');
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
    } catch (error) {
        contextLog('디렉토리 생성 실패:', error.message);
    }
    
    // 일일 리셋 확인
    const today = new Date().toDateString();
    if (ultimateConversationState.memoryStats.lastDailyReset !== today) {
        ultimateConversationState.memoryStats.todayMemoryCount = 0;
        ultimateConversationState.memoryStats.lastDailyReset = today;
    }
    
    // ⭐️ 자발적 메시지 통계 일일 리셋 확인
    const todayDate = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    if (ultimateConversationState.spontaneousMessages.lastResetDate !== todayDate) {
        resetSpontaneousStats();
    }
    
    contextLog(`초기화 완료 - 동적 기억과 대화 컨텍스트에 집중 (${currentModel} 최적화)`);
}

// ==================== 🎁 유틸리티 함수들 ====================

/**
 * ✨ 모델별 대화 컨텍스트 윈도우 크기 설정
 */
function setConversationContextWindow(size) {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
    contextLog(`컨텍스트 윈도우 크기: ${size} (모델: ${currentModel})`);
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

// ==================== 📤 모듈 내보내기 ==================
contextLog('v35.0 로드 완료 (GPT 모델 버전 전환 + 자발적 메시지 통계 지원)');

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
    
    // ⭐️ 자발적 메시지 통계 관리 (새로 추가!)
    recordSpontaneousMessage,
    setNextSpontaneousTime,
    getSpontaneousStats,        // ⭐️ 라인 상태 리포트용 핵심 함수!
    resetSpontaneousStats,
    
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
    
    // ✨ GPT 모델 최적화 함수들 추가
    getOptimalContextLength,
    getContextPriority,
    
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
