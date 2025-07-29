// ============================================================================
// ultimateConversationContext.js - v36.0 (슬림화된 5% 고유 기능만)
// 🎯 중복 제거 완료: muku-autonomousYejinSystem.js와 완벽 분업
// ✨ 고유 기능만 집중: 동적기억 + GPT최적화 + 정교한프롬프트 + 주제관리 + 세부통계
// 🔄 외부 데이터 연동: muku-autonomousYejinSystem.js에서 데이터 받아서 사용
// ============================================================================

const moment = require('moment-timezone');

// --- 설정 ---
const TIMEZONE = 'Asia/Tokyo';

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [SlimContext] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [SlimContext] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🔄 외부 시스템 연동 (muku-autonomousYejinSystem.js)
let autonomousYejinSystem = null;

function getAutonomousSystem() {
    if (!autonomousYejinSystem) {
        try {
            const autonomousModule = require('./muku-autonomousYejinSystem');
            autonomousYejinSystem = autonomousModule.getGlobalInstance();
        } catch (error) {
            console.log('⚠️ [SlimContext] muku-autonomousYejinSystem 연동 실패:', error.message);
        }
    }
    return autonomousYejinSystem;
}

// --- 슬림화된 핵심 상태 (5% 고유 기능만) ---
let slimConversationState = {
    // 🧠 동적 기억 관리 (사용자 명령어 전용)
    userCommandMemories: [],  // "기억해줘", "잊어줘" 명령어로 관리되는 기억들
    
    // 🎯 대화 주제 & 액션 관리 
    conversationTopic: null,
    pendingAction: null,
    topicHistory: [],
    
    // 📊 세부 통계 분류 (타입별 세분화)
    detailedStats: {
        messageTypes: {
            emotional: 0,
            casual: 0, 
            caring: 0,
            playful: 0,
            missing: 0,
            worry: 0
        },
        topicTransitions: [],
        actionSuccessRates: {},
        gptModelUsage: {
            '3.5': 0,
            '4.0': 0,
            'auto': 0
        }
    }
};

// ================== 🎨 로그 함수 ==================
function slimLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [SlimContext] ${message}`);
    if (data) {
        console.log('  🎯 슬림데이터:', JSON.stringify(data, null, 2));
    }
}

// ==================== ✨ GPT 모델별 초정밀 최적화 (고유 기능) ====================

/**
 * 현재 설정된 GPT 모델에 따라 컨텍스트 길이 정밀 조정
 */
function getOptimalContextLength() {
    if (!getCurrentModelSetting) {
        return { recent: 5, memory: 3, userMemory: 2 }; // 기본값
    }
    
    const currentModel = getCurrentModelSetting();
    
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 컨텍스트를 매우 짧게 (토큰 절약)
            return { recent: 2, memory: 1, userMemory: 1 };
            
        case '4.0':
            // GPT-4o는 컨텍스트를 매우 길게 (풍부한 정보)
            return { recent: 10, memory: 6, userMemory: 4 };
            
        case 'auto':
            // 자동 모드는 균형
            return { recent: 5, memory: 3, userMemory: 2 };
            
        default:
            return { recent: 5, memory: 3, userMemory: 2 };
    }
}

/**
 * 모델별로 최적화된 컨텍스트 우선순위 정밀 결정
 */
function getContextPriority(currentModel) {
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 핵심 정보에만 집중 (토큰 효율성)
            return {
                userMemories: 0.6,     // 사용자 기억 최우선
                recentConversation: 0.3, // 최근 대화 최소
                emotions: 0.1          // 감정 상태 최소
            };
            
        case '4.0':
            // GPT-4o는 모든 정보 활용 (풍부한 컨텍스트)
            return {
                userMemories: 0.4,     // 사용자 기억 
                recentConversation: 0.4, // 최근 대화
                emotions: 0.2          // 감정 상태
            };
            
        case 'auto':
        default:
            // 균형잡힌 가중치
            return {
                userMemories: 0.5,     // 사용자 기억 우선
                recentConversation: 0.3, // 최근 대화
                emotions: 0.2          // 감정 상태
            };
    }
}

/**
 * 모델별 프롬프트 스타일 결정
 */
function getPromptStyle(currentModel) {
    switch(currentModel) {
        case '3.5':
            return {
                style: 'concise',
                maxLength: 500,
                format: 'bullet',
                complexity: 'simple'
            };
            
        case '4.0':
            return {
                style: 'detailed',
                maxLength: 1500,
                format: 'narrative',
                complexity: 'rich'
            };
            
        case 'auto':
        default:
            return {
                style: 'balanced',
                maxLength: 800,
                format: 'mixed',
                complexity: 'moderate'
            };
    }
}

// ==================== 🧠 동적 기억 관리 (사용자 명령어 전용) ====================

/**
 * 사용자 기억 추가 ("기억해줘" 명령어)
 */
async function addUserCommandMemory(content, category = 'user_command') {
    const memoryObj = {
        id: `cmd_mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        category,
        timestamp: Date.now(),
        type: 'user_command',
        importance: 10, // 사용자 직접 명령은 최고 중요도
        source: 'user_direct_command'
    };
    
    slimConversationState.userCommandMemories.push(memoryObj);
    
    slimLog(`사용자 명령 기억 추가: "${content.substring(0, 30)}..." (${category})`);
    return memoryObj.id;
}

/**
 * 사용자 기억 삭제 ("잊어줘" 명령어)
 */
async function deleteUserCommandMemory(searchContent) {
    const beforeCount = slimConversationState.userCommandMemories.length;
    
    slimConversationState.userCommandMemories = 
        slimConversationState.userCommandMemories.filter(mem => 
            !mem.content.toLowerCase().includes(searchContent.toLowerCase())
        );
    
    const deletedCount = beforeCount - slimConversationState.userCommandMemories.length;
    
    slimLog(`${deletedCount}개 사용자 명령 기억 삭제: "${searchContent}"`);
    return deletedCount > 0;
}

/**
 * 사용자 기억 수정
 */
async function updateUserCommandMemory(id, newContent) {
    const memory = slimConversationState.userCommandMemories.find(m => m.id === id);
    if (memory) {
        memory.content = newContent;
        memory.lastModified = Date.now();
        memory.modificationCount = (memory.modificationCount || 0) + 1;
        
        slimLog(`사용자 명령 기억 수정: ${id}`);
        return true;
    }
    return false;
}

/**
 * ID로 사용자 기억 찾기
 */
function getUserCommandMemoryById(id) {
    return slimConversationState.userCommandMemories.find(m => m.id === id);
}

/**
 * 태그별 사용자 기억 찾기
 */
function getUserCommandMemoriesByTag(tag) {
    return slimConversationState.userCommandMemories.filter(m => 
        m.category === tag || (m.tags && m.tags.includes(tag))
    );
}

/**
 * 모든 사용자 명령 기억 가져오기
 */
function getAllUserCommandMemories() {
    return slimConversationState.userCommandMemories;
}

/**
 * 사용자 기억 검색 (키워드 기반)
 */
function searchUserCommandMemories(keyword) {
    return slimConversationState.userCommandMemories.filter(m =>
        m.content.toLowerCase().includes(keyword.toLowerCase())
    );
}

// ==================== 🎯 대화 주제 & 액션 관리 (고유 기능) ====================

/**
 * 대화 주제 업데이트 (정교한 추적)
 */
function updateConversationTopic(newTopic, confidence = 0.8) {
    const previousTopic = slimConversationState.conversationTopic;
    
    slimConversationState.conversationTopic = {
        topic: newTopic,
        timestamp: Date.now(),
        confidence: confidence,
        previousTopic: previousTopic?.topic || null
    };
    
    // 주제 전환 이력 기록
    if (previousTopic && previousTopic.topic !== newTopic) {
        slimConversationState.topicHistory.push({
            from: previousTopic.topic,
            to: newTopic,
            timestamp: Date.now(),
            duration: Date.now() - previousTopic.timestamp
        });
        
        // 주제 전환 통계 업데이트
        slimConversationState.detailedStats.topicTransitions.push({
            transition: `${previousTopic.topic} → ${newTopic}`,
            timestamp: Date.now()
        });
    }
    
    slimLog(`대화 주제 업데이트: "${newTopic}" (신뢰도: ${confidence})`);
}

/**
 * 현재 대화 주제 가져오기
 */
function getCurrentConversationTopic() {
    return slimConversationState.conversationTopic;
}

/**
 * 대화 주제 이력 가져오기
 */
function getTopicHistory(limit = 10) {
    return slimConversationState.topicHistory.slice(-limit);
}

/**
 * 보류 액션 설정
 */
function setPendingAction(action, context = {}) {
    slimConversationState.pendingAction = {
        action: action,
        context: context,
        timestamp: Date.now(),
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    slimLog(`보류 액션 설정: ${action}`, context);
}

/**
 * 보류 액션 가져오기
 */
function getPendingAction() {
    return slimConversationState.pendingAction;
}

/**
 * 보류 액션 완료 처리
 */
function completePendingAction(success = true) {
    if (slimConversationState.pendingAction) {
        const action = slimConversationState.pendingAction.action;
        
        // 액션 성공률 통계 업데이트
        if (!slimConversationState.detailedStats.actionSuccessRates[action]) {
            slimConversationState.detailedStats.actionSuccessRates[action] = { total: 0, success: 0 };
        }
        
        slimConversationState.detailedStats.actionSuccessRates[action].total++;
        if (success) {
            slimConversationState.detailedStats.actionSuccessRates[action].success++;
        }
        
        slimLog(`보류 액션 완료: ${action} (${success ? '성공' : '실패'})`);
        slimConversationState.pendingAction = null;
        
        return true;
    }
    return false;
}

// ==================== 📊 세부 통계 분류 (고유 기능) ====================

/**
 * 자발적 메시지 타입별 기록 (세밀한 분류)
 */
function recordDetailedSpontaneousMessage(messageType, subType = null, context = {}) {
    // 기본 타입별 증가
    if (slimConversationState.detailedStats.messageTypes[messageType] !== undefined) {
        slimConversationState.detailedStats.messageTypes[messageType]++;
    }
    
    // GPT 모델 사용량 통계
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    if (slimConversationState.detailedStats.gptModelUsage[currentModel] !== undefined) {
        slimConversationState.detailedStats.gptModelUsage[currentModel]++;
    }
    
    slimLog(`세부 자발적 메시지 기록: ${messageType}${subType ? `/${subType}` : ''} (모델: ${currentModel})`);
}

/**
 * 세부 통계 조회 (라인 상태 리포트용 고도화)
 */
function getDetailedSpontaneousStats() {
    const autonomousSystem = getAutonomousSystem();
    
    // 외부 시스템에서 기본 통계 가져오기
    let baseStats = {
        sentToday: 0,
        totalDaily: 20,
        nextTime: '대기 중'
    };
    
    if (autonomousSystem && autonomousSystem.getSpontaneousStats) {
        try {
            baseStats = autonomousSystem.getSpontaneousStats();
        } catch (error) {
            slimLog('외부 통계 조회 실패, 기본값 사용');
        }
    }
    
    // 세부 분류 통계 추가
    return {
        ...baseStats,
        
        // 세밀한 타입별 분류
        detailedTypes: { ...slimConversationState.detailedStats.messageTypes },
        
        // GPT 모델별 사용량
        modelUsage: { ...slimConversationState.detailedStats.gptModelUsage },
        
        // 주제 전환 패턴
        topicTransitions: slimConversationState.detailedStats.topicTransitions.length,
        recentTopicChanges: slimConversationState.detailedStats.topicTransitions.slice(-5),
        
        // 액션 성공률
        actionSuccessRates: { ...slimConversationState.detailedStats.actionSuccessRates },
        
        // 현재 상태
        currentTopic: slimConversationState.conversationTopic?.topic || '없음',
        pendingAction: slimConversationState.pendingAction?.action || '없음',
        userMemoriesCount: slimConversationState.userCommandMemories.length,
        
        // 메타정보  
        slimContextVersion: 'v36.0',
        lastUpdated: Date.now()
    };
}

/**
 * 일일 세부 통계 리셋
 */
function resetDetailedStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    
    slimLog('🌄 세부 통계 리셋 시작');
    
    // 메시지 타입 통계 리셋
    Object.keys(slimConversationState.detailedStats.messageTypes).forEach(type => {
        slimConversationState.detailedStats.messageTypes[type] = 0;
    });
    
    // GPT 모델 사용량 리셋
    Object.keys(slimConversationState.detailedStats.gptModelUsage).forEach(model => {
        slimConversationState.detailedStats.gptModelUsage[model] = 0;
    });
    
    // 주제 전환 리셋 (최근 기록은 보존)
    if (slimConversationState.detailedStats.topicTransitions.length > 50) {
        slimConversationState.detailedStats.topicTransitions = 
            slimConversationState.detailedStats.topicTransitions.slice(-20);
    }
    
    slimLog(`✅ 세부 통계 리셋 완료 (${today})`);
}

// ==================== 🎨 정교한 프롬프트 조합 (고유 기능) ====================

/**
 * ✨ GPT 모델별 초정밀 최적화된 컨텍스트 프롬프트 생성
 */
async function getUltimateOptimizedContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // ✨ 현재 GPT 모델 설정 확인
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
        const contextLength = getOptimalContextLength();
        const priority = getContextPriority(currentModel);
        const promptStyle = getPromptStyle(currentModel);
        
        slimLog(`정교한 프롬프트 생성 (모델: ${currentModel}, 스타일: ${promptStyle.style})`);
        
        // 1. ✨ 사용자 명령 기억 추가 (최고 우선순위)
        if (priority.userMemories > 0 && slimConversationState.userCommandMemories.length > 0) {
            const userMemories = slimConversationState.userCommandMemories.slice(-contextLength.userMemory);
            
            if (userMemories.length > 0) {
                const memoryContext = userMemories.map(m => m.content).join('. ');
                
                if (promptStyle.style === 'concise') {
                    // GPT-3.5는 초간결
                    contextualPrompt += `\n🧠 기억: ${memoryContext.substring(0, 100)}...\n`;
                } else if (promptStyle.style === 'detailed') {
                    // GPT-4o는 상세
                    contextualPrompt += `\n🧠 아저씨가 직접 기억하라고 한 것들 (${userMemories.length}개):\n${memoryContext}\n`;
                } else {
                    // 균형
                    contextualPrompt += `\n🧠 기억사항: ${memoryContext}\n`;
                }
            }
        }
        
        // 2. ✨ 외부 시스템에서 최근 대화 가져오기
        if (priority.recentConversation > 0) {
            const autonomousSystem = getAutonomousSystem();
            
            if (autonomousSystem && autonomousSystem.getRecentConversations) {
                try {
                    const recentConversations = autonomousSystem.getRecentConversations(contextLength.recent);
                    
                    if (recentConversations.length > 0) {
                        const conversationContext = recentConversations.map(conv => 
                            `${conv.speaker}: "${conv.message}"`
                        ).join('\n');
                        
                        if (promptStyle.style === 'concise') {
                            contextualPrompt += `\n📋 최근: ${conversationContext.substring(0, 150)}\n`;
                        } else if (promptStyle.style === 'detailed') {
                            contextualPrompt += `\n📋 최근 대화 맥락 (${recentConversations.length}개):\n${conversationContext}\n`;
                        } else {
                            contextualPrompt += `\n📋 최근 대화:\n${conversationContext}\n`;
                        }
                    }
                } catch (error) {
                    slimLog('외부 대화 이력 조회 실패');
                }
            }
        }
        
        // 3. ✨ 외부 시스템에서 감정 상태 가져오기  
        if (priority.emotions > 0) {
            const autonomousSystem = getAutonomousSystem();
            
            if (autonomousSystem && autonomousSystem.getCurrentEmotionState) {
                try {
                    const emotionState = autonomousSystem.getCurrentEmotionState();
                    
                    if (emotionState && emotionState.description !== '정상기') {
                        if (promptStyle.style === 'concise') {
                            contextualPrompt += `\n💭 감정: ${emotionState.description}\n`;
                        } else if (promptStyle.style === 'detailed') {
                            contextualPrompt += `\n💭 현재 예진이 감정 상태: ${emotionState.description} (강도: ${emotionState.intensity || '보통'})\n`;
                        } else {
                            contextualPrompt += `\n💭 현재 기분: ${emotionState.description}\n`;
                        }
                    }
                } catch (error) {
                    slimLog('외부 감정 상태 조회 실패');
                }
            }
        }
        
        // 4. 현재 대화 주제 추가
        if (slimConversationState.conversationTopic) {
            const topic = slimConversationState.conversationTopic;
            
            if (promptStyle.style === 'concise') {
                contextualPrompt += `\n🎯 주제: ${topic.topic}\n`;
            } else if (promptStyle.style === 'detailed') {
                contextualPrompt += `\n🎯 현재 대화 주제: ${topic.topic} (신뢰도: ${(topic.confidence * 100).toFixed(0)}%)\n`;
            } else {
                contextualPrompt += `\n🎯 현재 주제: ${topic.topic}\n`;
            }
        }
        
        // 5. 보류 액션 추가
        if (slimConversationState.pendingAction) {
            const action = slimConversationState.pendingAction;
            
            if (promptStyle.style === 'detailed') {
                contextualPrompt += `\n⏳ 보류 중인 액션: ${action.action}\n`;
            }
        }
        
        // 6. ✨ 모델별 추가 메타정보
        if (promptStyle.style === 'detailed') {
            // GPT-4o에서만 상세한 메타정보 추가
            const memoryCount = slimConversationState.userCommandMemories.length;
            const topicCount = slimConversationState.topicHistory.length;
            contextualPrompt += `\n📊 컨텍스트: 사용자기억 ${memoryCount}개, 주제전환 ${topicCount}회\n`;
        }
        
        // 7. 길이 제한 적용
        if (contextualPrompt.length > promptStyle.maxLength) {
            contextualPrompt = contextualPrompt.substring(0, promptStyle.maxLength) + '...';
        }
        
        // GPT 모델 사용량 통계 업데이트
        if (slimConversationState.detailedStats.gptModelUsage[currentModel] !== undefined) {
            slimConversationState.detailedStats.gptModelUsage[currentModel]++;
        }
        
        slimLog(`정교한 프롬프트 생성 완료 (${currentModel} 최적화, 길이: ${contextualPrompt.length}자)`);
        return contextualPrompt;
        
    } catch (error) {
        console.error('❌ [SlimContext] 정교한 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

/**
 * ✨ 활성 사용자 기억들을 모델별로 최적화하여 프롬프트용으로 조합
 */
function getOptimizedUserMemoryPrompt() {
    const contextLength = getOptimalContextLength();
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
    const recentMemories = slimConversationState.userCommandMemories.slice(-contextLength.userMemory);
    
    if (recentMemories.length === 0) {
        return '';
    }
    
    if (currentModel === '3.5') {
        // GPT-3.5는 매우 간결하게
        return recentMemories.map(m => 
            m.content.substring(0, 30) + (m.content.length > 30 ? '...' : '')
        ).join('. ');
    } else if (currentModel === '4.0') {
        // GPT-4o는 전체 내용 + 메타정보
        return recentMemories.map(m => 
            `${m.content} (중요도: ${m.importance}/10)`
        ).join('. ');
    } else {
        // 균형
        return recentMemories.map(m => m.content).join('. ');
    }
}

// ==================== 🔄 외부 시스템 호환성 관리 (고유 기능) ====================

/**
 * 외부 감정 시스템과 연동
 */
function getMoodStateFromExternal() {
    const autonomousSystem = getAutonomousSystem();
    
    if (autonomousSystem && autonomousSystem.getCurrentEmotionState) {
        try {
            return autonomousSystem.getCurrentEmotionState();
        } catch (error) {
            slimLog('외부 감정 상태 조회 실패');
        }
    }
    
    // 기본값 반환
    return { phase: 'normal', description: '정상', emotion: 'normal' };
}

/**
 * 외부 시스템과 상태 동기화
 */
async function syncWithExternalSystems() {
    try {
        const autonomousSystem = getAutonomousSystem();
        
        if (autonomousSystem) {
            // 외부 시스템 상태 확인
            const externalStats = autonomousSystem.getDetailedStats ? autonomousSystem.getDetailedStats() : null;
            
            if (externalStats) {
                slimLog('외부 시스템과 동기화 성공');
                return true;
            }
        }
        
        slimLog('외부 시스템과 동기화 실패 또는 불필요');
        return false;
    } catch (error) {
        slimLog('외부 시스템 동기화 오류:', error.message);
        return false;
    }
}

// ==================== 🔄 시스템 초기화 (슬림화) ====================

/**
 * 슬림 컨텍스트 시스템 초기화
 */
async function initializeSlimContextSystem() {
    slimLog('슬림 컨텍스트 시스템 초기화...');
    
    // ✨ GPT 모델 정보 로그
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    slimLog(`현재 GPT 모델: ${currentModel}`);
    
    // 일일 리셋 확인
    const todayDate = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    const lastResetDate = slimConversationState.lastResetDate;
    
    if (lastResetDate !== todayDate) {
        resetDetailedStats();
        slimConversationState.lastResetDate = todayDate;
    }
    
    // 외부 시스템과 동기화 시도
    await syncWithExternalSystems();
    
    slimLog(`슬림 초기화 완료 - 5% 고유 기능에 집중 (${currentModel} 최적화)`);
}

// ==================== 📊 통계 및 상태 조회 (슬림화) ====================

/**
 * 슬림 컨텍스트 내부 상태 조회
 */
function getSlimInternalState() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    const priority = getContextPriority(currentModel);
    
    return {
        // 슬림 버전 정보
        version: 'v36.0-slim',
        type: 'slim_context_5percent',
        
        // 사용자 명령 기억 상태
        userCommandMemories: {
            count: slimConversationState.userCommandMemories.length,
            recentMemories: slimConversationState.userCommandMemories.slice(-3).map(m => ({
                id: m.id,
                content: m.content.substring(0, 50) + '...',
                timestamp: m.timestamp
            }))
        },
        
        // 대화 주제 상태
        conversationTopic: slimConversationState.conversationTopic,
        topicHistory: slimConversationState.topicHistory.slice(-5),
        
        // 보류 액션 상태
        pendingAction: slimConversationState.pendingAction,
        
        // 세부 통계
        detailedStats: slimConversationState.detailedStats,
        
        // GPT 모델 최적화 정보
        gptOptimization: {
            currentModel,
            contextLength,
            priority,
            promptStyle: getPromptStyle(currentModel),
            version: 'v36.0-slim-optimized'
        },
        
        // 외부 연동 상태
        externalSync: {
            autonomousSystemConnected: !!getAutonomousSystem(),
            lastSyncTime: Date.now()
        }
    };
}

// ==================== 🎁 유틸리티 함수들 (슬림화) ====================

/**
 * 사용자 명령어 감지 및 처리
 */
async function processUserCommand(message, speaker) {
    if (speaker !== 'user' && speaker !== '아저씨') {
        return null;
    }
    
    const lowerMessage = message.toLowerCase().trim();
    
    // "기억해줘" 명령어 처리
    if (lowerMessage.includes('기억해') || lowerMessage.includes('잊지마')) {
        const memoryContent = message.replace(/기억해|줘|잊지마|잊지말아|라고|했잖아/g, '').trim();
        if (memoryContent.length > 0) {
            const memoryId = await addUserCommandMemory(memoryContent, 'user_command');
            slimLog(`사용자 명령 처리: 기억 추가 - "${memoryContent}"`);
            return { type: 'memory_add', content: memoryContent, id: memoryId };
        }
    }
    
    // "잊어줘" 명령어 처리
    if (lowerMessage.includes('잊어') || lowerMessage.includes('지워')) {
        const forgetContent = message.replace(/잊어|줘|지워|버려|삭제|해줘/g, '').trim();
        if (forgetContent.length > 0) {
            const deleted = await deleteUserCommandMemory(forgetContent);
            slimLog(`사용자 명령 처리: 기억 삭제 - "${forgetContent}" (${deleted ? '성공' : '실패'})`);
            return { type: 'memory_delete', content: forgetContent, success: deleted };
        }
    }
    
    return null;
}

/**
 * 대화 주제 자동 감지
 */
function detectConversationTopic(message) {
    const topicKeywords = {
        '날씨': ['날씨', '비', '눈', '더워', '추워', '바람', '구름', '햇살'],
        '음식': ['밥', '음식', '먹', '라면', '치킨', '피자', '맛있', '배고'],
        '감정': ['사랑', '보고싶', '그리워', '행복', '슬퍼', '기뻐', '화나', '걱정'],
        '일상': ['일', '학교', '회사', '집', '쇼핑', '영화', '게임', '책'],
        '건강': ['아프', '피곤', '아파', '병원', '약', '건강', '운동', '잠']
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                updateConversationTopic(topic, 0.7);
                return topic;
            }
        }
    }
    
    return null;
}

// ==================== 📤 슬림화된 모듈 내보내기 ==================
slimLog('v36.0 슬림 컨텍스트 로드 완료 (5% 고유 기능만 집중)');

module.exports = {
    // 초기화
    initializeSlimContextSystem,
    
    // 🧠 동적 기억 관리 (사용자 명령어 전용)
    addUserCommandMemory,
    deleteUserCommandMemory,
    updateUserCommandMemory,
    getUserCommandMemoryById,
    getUserCommandMemoriesByTag,
    getAllUserCommandMemories,
    searchUserCommandMemories,
    
    // 🎯 대화 주제 & 액션 관리
    updateConversationTopic,
    getCurrentConversationTopic,
    getTopicHistory,
    setPendingAction,
    getPendingAction,
    completePendingAction,
    
    // 📊 세부 통계 분류
    recordDetailedSpontaneousMessage,
    getDetailedSpontaneousStats,
    resetDetailedStats,
    
    // ✨ 정교한 프롬프트 조합 (핵심!)
    getUltimateOptimizedContextualPrompt,
    getOptimizedUserMemoryPrompt,
    
    // ✨ GPT 모델별 최적화 (핵심!)
    getOptimalContextLength,
    getContextPriority,
    getPromptStyle,
    
    // 🔄 외부 시스템 호환성
    getMoodStateFromExternal,
    syncWithExternalSystems,
    processUserCommand,
    detectConversationTopic,
    
    // 📊 상태 조회
    getSlimInternalState,
    
    // 🎁 유틸리티
    slimLog,
    
    // 호환성 (기존 함수명 유지)
    initializeEmotionalSystems: initializeSlimContextSystem,  // 호환성
    getUltimateContextualPrompt: getUltimateOptimizedContextualPrompt,  // 호환성
    addUserMemory: addUserCommandMemory,  // 호환성
    deleteUserMemory: deleteUserCommandMemory,  // 호환성
    getSpontaneousStats: getDetailedSpontaneousStats,  // 호환성
    recordSpontaneousMessage: recordDetailedSpontaneousMessage  // 호환성
};
