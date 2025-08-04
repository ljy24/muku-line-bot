// ============================================================================
// ultimateConversationContext.js - v37.3 (순환 참조 완전 제거!)
// 🎯 핵심 고유 기능 보존: GPT모델 최적화 + 동적기억 + 주제관리 + 정교한프롬프트
// 🔄 Redis 통합: 기존 시스템과 완전 연동하여 무쿠 벙어리 문제 해결
// ✨ 중복 제거: 다른 시스템들과 역할 분담 명확화
// 🛡️ 안전 우선: 기존 기능 100% 보존하면서 Redis 레이어 추가
// 🔧 감정 우선순위: 외부주입 > moodManager > ultimateContext 순서로 적용
// 🚨 핵심 수정: 순환 참조 완전 제거 + 외부 감정 주입 방식으로 변경
// ============================================================================

const moment = require('moment-timezone');

// --- 설정 ---
const TIMEZONE = 'Asia/Tokyo';

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✅ [UltimateContext] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [UltimateContext] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🔄 Redis 통합 시스템 연동
let autonomousYejinSystem = null;
let redisCache = null;

function getRedisIntegratedSystem() {
    if (!autonomousYejinSystem) {
        try {
            const autonomousModule = require('./muku-autonomousYejinSystem');
            autonomousYejinSystem = autonomousModule.getGlobalInstance();
            
            if (autonomousYejinSystem && autonomousYejinSystem.redisCache) {
                redisCache = autonomousYejinSystem.redisCache;
                console.log('✅ [UltimateContext] Redis 통합 시스템 연동 성공');
            }
        } catch (error) {
            console.log('⚠️ [UltimateContext] Redis 통합 시스템 연동 실패:', error.message);
        }
    }
    return { autonomousYejinSystem, redisCache };
}

// 🔄 안전한 시스템들만 연동 (순환 참조 방지)
let integratedMoodManager = null;
let integratedAiUtils = null;

function getIntegratedSystems() {
    // 🛡️ 순환 참조 방지: moodManager만 안전하게 로드
    if (!integratedMoodManager) {
        try {
            integratedMoodManager = require('./moodManager');
            console.log('✅ [UltimateContext] 통합 무드매니저 연동 성공');
        } catch (error) {
            console.log('⚠️ [UltimateContext] 통합 무드매니저 연동 실패:', error.message);
            integratedMoodManager = null;
        }
    }
    
    if (!integratedAiUtils) {
        try {
            integratedAiUtils = require('./aiUtils');
            console.log('✅ [UltimateContext] 통합 AI유틸 연동 성공');
        } catch (error) {
            console.log('⚠️ [UltimateContext] 통합 AI유틸 연동 실패:', error.message);
            integratedAiUtils = null;
        }
    }
    
    return { integratedMoodManager, integratedAiUtils };
}

// --- 🎯 핵심 고유 상태 (GPT 최적화 중심) ---
let ultimateContextState = {
    // ✨ 사용자 명령 기억 (Redis 통합)
    userCommandMemories: [],  // 로컬 캐시 (Redis와 동기화)
    lastRedisSyncTime: 0,
    
    // 🎯 대화 주제 & 액션 관리 (고유 기능)
    conversationTopic: null,
    pendingAction: null,
    topicHistory: [],
    
    // ✨ GPT 모델별 최적화 상태 (핵심 고유 기능!)
    gptOptimization: {
        currentModel: 'auto',
        lastOptimizationTime: 0,
        modelPerformanceCache: {},
        contextStrategies: {}
    },
    
    // 📊 고유 통계 (GPT 모델 최적화 관련만)
    optimizationStats: {
        modelSwitches: 0,
        contextOptimizations: 0,
        promptGenerations: 0,
        lastOptimizationResult: null
    },
    
    // 🔧 순환 참조 방지 감정 상태 우선순위 관리
    emotionPriority: {
        lastEmotionSource: null,
        lastEmotionTime: 0,
        emotionOverrides: [],
        prioritySystemsActive: true,
        lastMoodCheck: 0,
        emotionSystemErrors: [],
        
        // 🚨 NEW: 외부 주입 방식 (순환 참조 방지)
        externalEmotionState: null,  // 외부에서 주입받은 감정 상태
        lastExternalUpdate: 0
    }
};

// ================== 🎨 통합 로그 함수 ==================
function ultimateLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [UltimateContext] ${message}`);
    if (data) {
        console.log('  💎 UltimateData:', JSON.stringify(data, null, 2));
    }
}

// ================== 🚨 강화된 감정 시스템 에러 처리 ==================

/**
 * 🚨 감정 시스템 에러 기록
 */
function recordEmotionSystemError(systemName, error, context = {}) {
    const errorRecord = {
        system: systemName,
        error: error.message || String(error),
        context: context,
        timestamp: Date.now(),
        id: `emotion_error_${Date.now()}`
    };
    
    ultimateContextState.emotionPriority.emotionSystemErrors.push(errorRecord);
    
    // 최근 20개만 유지
    if (ultimateContextState.emotionPriority.emotionSystemErrors.length > 20) {
        ultimateContextState.emotionPriority.emotionSystemErrors = 
            ultimateContextState.emotionPriority.emotionSystemErrors.slice(-15);
    }
    
    ultimateLog(`🚨 [감정시스템에러] ${systemName}: ${error.message || error}`, context);
}

/**
 * 🔧 감정 시스템 안전 호출 래퍼
 */
async function safeCallEmotionSystem(systemName, systemFunction, fallbackValue = null) {
    try {
        const result = await systemFunction();
        return result;
    } catch (error) {
        recordEmotionSystemError(systemName, error, { function: systemFunction.name });
        return fallbackValue;
    }
}

// ==================== ✨ GPT 모델별 초정밀 최적화 (핵심 고유 기능) ====================

/**
 * 🎯 GPT 모델별 컨텍스트 길이 초정밀 계산
 */
function getUltimatePrecisionContextLength() {
    if (!getCurrentModelSetting) {
        return { recent: 5, memory: 3, userMemory: 2, redis: 3 }; // 기본값
    }
    
    const currentModel = getCurrentModelSetting();
    ultimateContextState.gptOptimization.currentModel = currentModel;
    
    switch(currentModel) {
        case '3.5':
            return { 
                recent: 2,      // 최근 대화 최소
                memory: 1,      // 기존 기억 최소
                userMemory: 1,  // 사용자 기억 최소
                redis: 2,       // Redis 데이터 최소
                totalTokenBudget: 500
            };
            
        case '4.0':
            return { 
                recent: 15,     // 최근 대화 풍부
                memory: 8,      // 기존 기억 풍부
                userMemory: 6,  // 사용자 기억 풍부
                redis: 10,      // Redis 데이터 풍부
                totalTokenBudget: 2000
            };
            
        case 'auto':
            return { 
                recent: 7,      // 최근 대화 균형
                memory: 4,      // 기존 기억 균형
                userMemory: 3,  // 사용자 기억 균형
                redis: 5,       // Redis 데이터 균형
                totalTokenBudget: 1000
            };
            
        default:
            return { recent: 5, memory: 3, userMemory: 2, redis: 3, totalTokenBudget: 800 };
    }
}

/**
 * 🎯 모델별 컨텍스트 우선순위 매트릭스
 */
function getUltimateContextPriorityMatrix(currentModel) {
    const matrices = {
        '3.5': {
            userCommandMemories: 0.7,    // 사용자 직접 명령 최우선
            recentConversation: 0.2,     // 최근 대화 최소
            emotionState: 0.05,          // 감정 상태 최소
            redisContext: 0.05           // Redis 컨텍스트 최소
        },
        '4.0': {
            userCommandMemories: 0.3,    // 사용자 명령
            recentConversation: 0.3,     // 최근 대화
            emotionState: 0.2,           // 감정 상태
            redisContext: 0.2            // Redis 컨텍스트
        },
        'auto': {
            userCommandMemories: 0.4,    // 사용자 명령 우선
            recentConversation: 0.3,     // 최근 대화
            emotionState: 0.15,          // 감정 상태
            redisContext: 0.15           // Redis 컨텍스트
        }
    };
    
    return matrices[currentModel] || matrices['auto'];
}

/**
 * 🎯 모델별 프롬프트 스타일 전략
 */
function getUltimatePromptStrategy(currentModel) {
    const strategies = {
        '3.5': {
            style: 'ultra_concise',
            maxLength: 400,
            format: 'minimal_bullets',
            complexity: 'simple',
            keywordDensity: 'high',
            redundancyTolerance: 'none'
        },
        '4.0': {
            style: 'ultra_detailed',
            maxLength: 2500,
            format: 'rich_narrative',
            complexity: 'sophisticated',
            keywordDensity: 'moderate',
            redundancyTolerance: 'high'
        },
        'auto': {
            style: 'adaptive_balanced',
            maxLength: 1200,
            format: 'structured_mixed',
            complexity: 'moderate',
            keywordDensity: 'balanced',
            redundancyTolerance: 'moderate'
        }
    };
    
    return strategies[currentModel] || strategies['auto'];
}

/**
 * 🎯 실시간 모델 성능 최적화
 */
function optimizeForCurrentModel() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
    const optimizationTime = Date.now();
    
    // 성능 캐시 확인
    const cachedOptimization = ultimateContextState.gptOptimization.modelPerformanceCache[currentModel];
    if (cachedOptimization && (optimizationTime - cachedOptimization.timestamp) < 5 * 60 * 1000) {
        return cachedOptimization.result; // 5분 캐시
    }
    
    // 새로운 최적화 수행
    const contextLength = getUltimatePrecisionContextLength();
    const priorityMatrix = getUltimateContextPriorityMatrix(currentModel);
    const promptStrategy = getUltimatePromptStrategy(currentModel);
    
    const optimization = {
        model: currentModel,
        contextLength,
        priorityMatrix,
        promptStrategy,
        timestamp: optimizationTime,
        id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    // 캐시에 저장
    ultimateContextState.gptOptimization.modelPerformanceCache[currentModel] = {
        result: optimization,
        timestamp: optimizationTime
    };
    
    ultimateContextState.optimizationStats.contextOptimizations++;
    ultimateContextState.optimizationStats.lastOptimizationResult = optimization;
    
    ultimateLog(`GPT 모델 최적화 완료: ${currentModel}`, {
        contextItems: contextLength,
        priorities: priorityMatrix,
        style: promptStrategy.style
    });
    
    return optimization;
}

// ==================== 🧠 Redis 통합 사용자 기억 관리 ====================

/**
 * 🔄 Redis와 로컬 사용자 기억 동기화
 */
async function syncUserMemoriesWithRedis() {
    try {
        const { redisCache } = getRedisIntegratedSystem();
        
        if (!redisCache || !redisCache.isAvailable) {
            ultimateLog('Redis 사용 불가, 로컬 메모리만 사용');
            return false;
        }
        
        const cachedUserMemories = await redisCache.getCachedLearningPattern('user_command_memories');
        
        if (cachedUserMemories && Array.isArray(cachedUserMemories)) {
            ultimateContextState.userCommandMemories = cachedUserMemories;
            ultimateContextState.lastRedisSyncTime = Date.now();
            
            ultimateLog(`Redis 사용자 기억 동기화 성공: ${cachedUserMemories.length}개`);
            return true;
        }
        
        if (ultimateContextState.userCommandMemories.length > 0) {
            await redisCache.cacheLearningPattern('user_command_memories', ultimateContextState.userCommandMemories);
            ultimateLog('로컬 사용자 기억을 Redis에 백업 완료');
        }
        
        return true;
    } catch (error) {
        ultimateLog('Redis 동기화 오류:', error.message);
        return false;
    }
}

/**
 * 🧠 Redis 통합 사용자 기억 추가
 */
async function addUserCommandMemoryWithRedis(content, category = 'user_command') {
    const memoryObj = {
        id: `ultimate_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        category,
        timestamp: Date.now(),
        type: 'user_command',
        importance: 10,
        source: 'ultimate_context_user_command',
        version: 'v37.3'
    };
    
    ultimateContextState.userCommandMemories.push(memoryObj);
    
    try {
        const { redisCache } = getRedisIntegratedSystem();
        if (redisCache && redisCache.isAvailable) {
            await redisCache.cacheLearningPattern('user_command_memories', ultimateContextState.userCommandMemories);
            ultimateLog(`Redis 통합 사용자 기억 추가: "${content.substring(0, 30)}..." (${category})`);
        }
    } catch (error) {
        ultimateLog('Redis 저장 실패, 로컬만 저장:', error.message);
    }
    
    return memoryObj.id;
}

/**
 * 🧠 Redis 통합 사용자 기억 삭제
 */
async function deleteUserCommandMemoryWithRedis(searchContent) {
    const beforeCount = ultimateContextState.userCommandMemories.length;
    
    ultimateContextState.userCommandMemories = 
        ultimateContextState.userCommandMemories.filter(mem => 
            !mem.content.toLowerCase().includes(searchContent.toLowerCase())
        );
    
    const deletedCount = beforeCount - ultimateContextState.userCommandMemories.length;
    
    try {
        const { redisCache } = getRedisIntegratedSystem();
        if (redisCache && redisCache.isAvailable) {
            await redisCache.cacheLearningPattern('user_command_memories', ultimateContextState.userCommandMemories);
            ultimateLog(`Redis 통합 사용자 기억 삭제: "${searchContent}" (${deletedCount}개)`);
        }
    } catch (error) {
        ultimateLog('Redis 삭제 실패, 로컬만 삭제:', error.message);
    }
    
    return deletedCount > 0;
}

/**
 * 🔍 Redis 통합 사용자 기억 검색
 */
async function searchUserMemoriesWithRedis(keyword) {
    await syncUserMemoriesWithRedis();
    
    return ultimateContextState.userCommandMemories.filter(m =>
        m.content.toLowerCase().includes(keyword.toLowerCase())
    );
}

// ==================== 🔧 순환 참조 방지 감정 시스템 관리 ====================

/**
 * 🚨 외부 감정 상태 주입 (순환 참조 방지)
 */
function injectExternalEmotionState(emotionState) {
    try {
        if (!emotionState) {
            ultimateLog('⚠️ [외부감정주입] 유효하지 않은 감정 상태');
            return false;
        }
        
        ultimateContextState.emotionPriority.externalEmotionState = {
            ...emotionState,
            injectedAt: Date.now(),
            source: emotionState.source || 'external_injection'
        };
        
        ultimateContextState.emotionPriority.lastExternalUpdate = Date.now();
        
        ultimateLog(`✅ [외부감정주입] 감정 상태 주입 성공: ${emotionState.currentEmotion} (${emotionState.source})`);
        return true;
        
    } catch (error) {
        ultimateLog('❌ [외부감정주입] 주입 실패:', error.message);
        return false;
    }
}

/**
 * 🔧 외부 주입 감정 상태 체크
 */
function checkExternalEmotionState() {
    try {
        const externalState = ultimateContextState.emotionPriority.externalEmotionState;
        
        if (!externalState) {
            return null;
        }
        
        // 5분 이상 오래된 외부 상태는 무효화
        const now = Date.now();
        const stateAge = now - (externalState.injectedAt || 0);
        
        if (stateAge > 5 * 60 * 1000) { // 5분
            ultimateLog('⏰ [외부감정체크] 외부 감정 상태 만료됨 (5분 초과)');
            ultimateContextState.emotionPriority.externalEmotionState = null;
            return null;
        }
        
        ultimateLog(`✅ [외부감정체크] 유효한 외부 감정 상태: ${externalState.currentEmotion}`);
        return externalState;
        
    } catch (error) {
        ultimateLog('❌ [외부감정체크] 체크 실패:', error.message);
        return null;
    }
}

/**
 * 🔧 안전한 무드매니저 상태 체크 (순환 참조 없음)
 */
async function getMoodManagerStateSafe() {
    try {
        const { integratedMoodManager } = getIntegratedSystems();
        
        if (!integratedMoodManager) {
            ultimateLog('⚠️ [무드체크] moodManager 모듈 없음');
            return null;
        }
        
        if (typeof integratedMoodManager.getIntegratedMoodState === 'function') {
            const moodState = await integratedMoodManager.getIntegratedMoodState();
            
            if (moodState && moodState.currentMood && moodState.currentMood !== '평온함') {
                ultimateLog(`🎭 [무드감지] ${moodState.currentMood} (강도: ${moodState.emotionIntensity})`);
                return moodState;
            }
        }
        
        ultimateLog('✅ [무드체크] 평온한 상태');
        return null;
        
    } catch (error) {
        recordEmotionSystemError('moodManager', error, { function: 'getMoodManagerStateSafe' });
        return null;
    }
}

/**
 * 🔧 순환 참조 방지 우선순위 감정 시스템 체크
 */
async function checkPriorityEmotionSystemsSafe() {
    const now = Date.now();
    
    try {
        // 🚨 1순위: 외부 주입 감정 상태 (sulkyManager에서 주입)
        ultimateLog('🔍 [감정우선순위] 1순위 외부 주입 감정 상태 체크...');
        
        const externalEmotion = checkExternalEmotionState();
        if (externalEmotion) {
            ultimateLog(`🚨 [감정우선순위] ✅ 외부 감정 상태 확정! ${externalEmotion.currentEmotion}`);
            
            return {
                currentEmotion: externalEmotion.currentEmotion,
                intensity: externalEmotion.intensity || 0.7,
                source: externalEmotion.source + '_external_injection',
                timestamp: now,
                priority: 1,
                reason: externalEmotion.reason || 'external_emotion_state',
                detected: 'external_injection_confirmed',
                originalState: externalEmotion
            };
        }
        
        ultimateLog('✅ [감정우선순위] 1순위 완료 - 외부 주입 감정 없음');
        
        // 🔧 2순위: moodManager 체크 (안전한 방식)
        ultimateLog('🔍 [감정우선순위] 2순위 moodManager 체크 시작...');
        ultimateContextState.emotionPriority.lastMoodCheck = now;
        
        const moodManagerState = await getMoodManagerStateSafe();
        
        if (moodManagerState && moodManagerState.currentMood && moodManagerState.currentMood !== '평온함') {
            ultimateLog(`🎭 [감정우선순위] ✅ 특별 기분 상태 확정: ${moodManagerState.currentMood}`);
            
            // 한국어 기분을 영어 감정으로 매핑
            const moodToEmotionMap = {
                '기쁨': 'happy',
                '슬픔': 'sad', 
                '화남': 'angry',
                '짜증남': 'annoyed',
                '불안함': 'anxious',
                '외로움': 'lonely',
                '설렘': 'excited',
                '나른함': 'tired',
                '사랑함': 'loving',
                '보고싶음': 'missing',
                '걱정함': 'worried',
                '애교모드': 'affectionate',
                '장난스러움': 'playful',
                '심술궂음': 'mischievous'
            };
            
            const mappedEmotion = moodToEmotionMap[moodManagerState.currentMood] || moodManagerState.currentMood;
            
            return {
                currentEmotion: mappedEmotion,
                intensity: moodManagerState.emotionIntensity || 0.6,
                source: 'mood_manager_priority',
                timestamp: now,
                originalMood: moodManagerState.currentMood,
                priority: 2,
                reason: 'integrated_mood_state',
                detected: 'mood_state_confirmed'
            };
        }
        
        ultimateLog('✅ [감정우선순위] 2순위 완료 - moodManager 특별 상태 없음');
        
    } catch (error) {
        recordEmotionSystemError('priorityCheckSafe', error, { function: 'checkPriorityEmotionSystemsSafe' });
        ultimateLog('❌ [감정우선순위] 체크 중 에러 발생, 기본값 사용');
    }
    
    ultimateLog('✅ [감정우선순위] 모든 우선순위 시스템 체크 완료 - 특별한 상태 없음');
    return null;
}

/**
 * 🔧 감정 상태 우선순위 기록
 */
function recordEmotionPriority(emotionData) {
    ultimateContextState.emotionPriority.lastEmotionSource = emotionData.source;
    ultimateContextState.emotionPriority.lastEmotionTime = Date.now();
    
    ultimateContextState.emotionPriority.emotionOverrides.push({
        emotion: emotionData.currentEmotion,
        source: emotionData.source,
        priority: emotionData.priority,
        timestamp: Date.now(),
        detected: emotionData.detected || 'unknown'
    });
    
    if (ultimateContextState.emotionPriority.emotionOverrides.length > 10) {
        ultimateContextState.emotionPriority.emotionOverrides = 
            ultimateContextState.emotionPriority.emotionOverrides.slice(-7);
    }
}

// ==================== 🎭 완전 개선된 moodManager.js 호환성 함수 ====================

/**
 * 🔧 순환 참조 방지 감정 상태 조회 (안전한 버전)
 */
async function getMoodState() {
    try {
        ultimateLog('🔍 [getMoodState] 감정 상태 조회 시작 (순환 참조 방지)...');
        
        // 🚨 1단계: 안전한 우선순위 감정 시스템 체크
        const priorityEmotion = await checkPriorityEmotionSystemsSafe();
        
        if (priorityEmotion) {
            // 우선순위 시스템에서 감정 상태 발견
            recordEmotionPriority(priorityEmotion);
            
            ultimateLog(`✅ [getMoodState] 우선순위 감정 발견: ${priorityEmotion.currentEmotion} (출처: ${priorityEmotion.source})`);
            
            return {
                currentEmotion: priorityEmotion.currentEmotion,
                intensity: priorityEmotion.intensity,
                timestamp: priorityEmotion.timestamp,
                source: priorityEmotion.source,
                isActive: true,
                priority: priorityEmotion.priority,
                reason: priorityEmotion.reason,
                
                // 추가 호환성 필드들 (기존 유지)
                emotion: priorityEmotion.currentEmotion,
                level: priorityEmotion.intensity,
                lastUpdate: priorityEmotion.timestamp,
                
                // 🚨 상세 정보
                detected: priorityEmotion.detected,
                originalState: priorityEmotion.originalState,
                
                // 메타 정보
                integration: {
                    redisAvailable: !!redisCache?.isAvailable,
                    autonomousSystemConnected: !!autonomousYejinSystem,
                    userMemoriesCount: ultimateContextState.userCommandMemories.length,
                    prioritySystemActive: true,
                    priorityCheckSuccessful: true,
                    moodManagerConnected: !!getIntegratedSystems().integratedMoodManager,
                    circularReferenceProtection: true
                }
            };
        }
        
        // 🎯 2단계: 다른 시스템에서 특별한 상태가 없으면 ultimateContext 기본값 사용
        const fallbackEmotion = ultimateContextState.conversationTopic?.topic || 'normal';
        const fallbackIntensity = ultimateContextState.conversationTopic?.confidence || 0.5;
        
        ultimateLog(`🎯 [getMoodState] 우선순위 시스템 상태 없음, ultimateContext 기본값 사용: ${fallbackEmotion}`);
        
        return {
            currentEmotion: fallbackEmotion,
            intensity: fallbackIntensity,
            timestamp: ultimateContextState.conversationTopic?.timestamp || Date.now(),
            source: 'ultimate_context_fallback',
            isActive: true,
            priority: 3,
            reason: '대화 주제 기반 감정 추론',
            
            // 추가 호환성 필드들
            emotion: fallbackEmotion,
            level: fallbackIntensity,
            lastUpdate: ultimateContextState.conversationTopic?.timestamp || Date.now(),
            
            // 메타 정보
            integration: {
                redisAvailable: !!redisCache?.isAvailable,
                autonomousSystemConnected: !!autonomousYejinSystem,
                userMemoriesCount: ultimateContextState.userCommandMemories.length,
                prioritySystemActive: true,
                priorityCheckSuccessful: true,
                checkedSystems: ['externalInjection', 'moodManager', 'ultimateContext'],
                fallbackUsed: true,
                circularReferenceProtection: true
            }
        };
        
    } catch (error) {
        recordEmotionSystemError('getMoodState', error, { function: 'getMoodState' });
        ultimateLog('❌ [getMoodState] 오류 발생, 에러 폴백 사용:', error.message);
        
        return {
            currentEmotion: 'normal',
            intensity: 0.5,
            timestamp: Date.now(),
            source: 'ultimate_context_error_fallback',
            isActive: false,
            priority: 99,
            error: error.message,
            
            // 호환성 필드들
            emotion: 'normal',
            level: 0.5,
            lastUpdate: Date.now(),
            
            // 에러 정보
            integration: {
                errorOccurred: true,
                errorMessage: error.message,
                prioritySystemActive: false,
                circularReferenceProtection: true
            }
        };
    }
}

/**
 * 🎭 개선된 감정 상태 업데이트 (우선순위 존중)
 */
function updateMoodState(newMoodState) {
    try {
        if (!newMoodState) {
            ultimateLog('⚠️ updateMoodState: 유효하지 않은 기분 상태', newMoodState);
            return false;
        }
        
        const emotion = newMoodState.currentEmotion || newMoodState.currentMood || newMoodState.emotion;
        
        if (!emotion) {
            ultimateLog('⚠️ updateMoodState: 감정 정보 없음', newMoodState);
            return false;
        }
        
        const intensity = newMoodState.intensity || newMoodState.level || 0.7;
        const source = newMoodState.source || 'external_update';
        
        const currentPriority = ultimateContextState.emotionPriority.lastEmotionSource?.includes('sulky') ? 1 :
                               ultimateContextState.emotionPriority.lastEmotionSource?.includes('mood') ? 2 : 3;
        
        const newPriority = source.includes('sulky') ? 1 : source.includes('mood') ? 2 : 3;
        
        if (newPriority <= currentPriority) {
            const newTopic = emotion;
            updateConversationTopicIntelligently(newTopic, intensity);
            
            ultimateLog(`🎭 [감정업데이트] ${source}로부터 감정 업데이트 완료: "${newTopic}" (우선순위: ${newPriority})`);
            return true;
        } else {
            ultimateLog(`⚠️ [감정업데이트] 낮은 우선순위로 인해 무시됨: ${source} (우선순위: ${newPriority} > 현재: ${currentPriority})`);
            return false;
        }
        
    } catch (error) {
        ultimateLog('❌ updateMoodState 오류:', error.message);
        return false;
    }
}

// ==================== 🎯 대화 주제 & 액션 관리 (고유 기능 보존) ====================

/**
 * 🎯 지능적 대화 주제 업데이트
 */
function updateConversationTopicIntelligently(newTopic, confidence = 0.8) {
    const previousTopic = ultimateContextState.conversationTopic;
    
    ultimateContextState.conversationTopic = {
        topic: newTopic,
        timestamp: Date.now(),
        confidence: confidence,
        previousTopic: previousTopic?.topic || null,
        detectionMethod: 'ultimate_context_v37.3'
    };
    
    if (previousTopic && previousTopic.topic !== newTopic) {
        const transition = {
            from: previousTopic.topic,
            to: newTopic,
            timestamp: Date.now(),
            duration: Date.now() - previousTopic.timestamp,
            confidenceChange: confidence - (previousTopic.confidence || 0.5),
            context: 'ultimate_topic_tracking'
        };
        
        ultimateContextState.topicHistory.push(transition);
        
        if (ultimateContextState.topicHistory.length > 50) {
            ultimateContextState.topicHistory = ultimateContextState.topicHistory.slice(-30);
        }
    }
    
    ultimateLog(`지능적 대화 주제 업데이트: "${newTopic}" (신뢰도: ${confidence})`);
}

/**
 * 🎯 고급 보류 액션 관리
 */
function setAdvancedPendingAction(action, context = {}, priority = 5) {
    ultimateContextState.pendingAction = {
        action: action,
        context: context,
        priority: priority,
        timestamp: Date.now(),
        id: `ultimate_action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        expectedDuration: context.expectedDuration || 300000,
        source: 'ultimate_context_v37.3'
    };
    
    ultimateLog(`고급 보류 액션 설정: ${action} (우선순위: ${priority})`, context);
}

// ==================== ✨ 최강 통합 프롬프트 생성 시스템 ====================

/**
 * 🎯 모든 시스템을 통합한 최강 컨텍스트 프롬프트 생성
 */
async function generateUltimateMasterContextPrompt(basePrompt) {
    try {
        ultimateContextState.optimizationStats.promptGenerations++;
        
        let contextualPrompt = basePrompt;
        
        const optimization = optimizeForCurrentModel();
        const { contextLength, priorityMatrix, promptStrategy } = optimization;
        
        ultimateLog(`최강 프롬프트 생성 시작 (${optimization.model} 최적화)`);
        
        await syncUserMemoriesWithRedis();
        
        if (priorityMatrix.userCommandMemories > 0 && ultimateContextState.userCommandMemories.length > 0) {
            const recentUserMemories = ultimateContextState.userCommandMemories.slice(-contextLength.userMemory);
            
            if (recentUserMemories.length > 0) {
                const memoryText = recentUserMemories.map(m => m.content).join('. ');
                
                if (promptStrategy.style === 'ultra_concise') {
                    contextualPrompt += `\n🧠: ${memoryText.substring(0, 80)}...\n`;
                } else if (promptStrategy.style === 'ultra_detailed') {
                    contextualPrompt += `\n🧠 아저씨가 직접 기억하라고 한 중요한 것들 (${recentUserMemories.length}개):\n${memoryText}\n`;
                } else {
                    contextualPrompt += `\n🧠 기억사항: ${memoryText}\n`;
                }
            }
        }
        
        if (priorityMatrix.emotionState > 0) {
            try {
                const priorityEmotionState = await checkPriorityEmotionSystemsSafe();
                
                if (priorityEmotionState) {
                    if (promptStrategy.style === 'ultra_concise') {
                        contextualPrompt += `\n💭: ${priorityEmotionState.currentEmotion}\n`;
                    } else if (promptStrategy.style === 'ultra_detailed') {
                        contextualPrompt += `\n💭 현재 예진이 감정 상태 (${priorityEmotionState.source}):\n`;
                        contextualPrompt += `   감정: ${priorityEmotionState.currentEmotion} (강도: ${priorityEmotionState.intensity})\n`;
                        contextualPrompt += `   우선순위: ${priorityEmotionState.priority} (1=외부주입, 2=기분, 3=주제)\n`;
                        if (priorityEmotionState.reason) {
                            contextualPrompt += `   원인: ${priorityEmotionState.reason}\n`;
                        }
                        if (priorityEmotionState.detected) {
                            contextualPrompt += `   감지결과: ${priorityEmotionState.detected}\n`;
                        }
                        if (priorityEmotionState.source.includes('external')) {
                            contextualPrompt += `   외부주입: sulkyManager에서 주입된 감정 상태\n`;
                        }
                    } else {
                        contextualPrompt += `\n💭 현재 감정: ${priorityEmotionState.currentEmotion} (${priorityEmotionState.source}, 우선순위: ${priorityEmotionState.priority})\n`;
                    }
                } else {
                    if (promptStrategy.style !== 'ultra_concise') {
                        contextualPrompt += `\n💭 감정상태: 평온함 (우선순위 시스템 체크 완료, 특별한 상태 없음)\n`;
                    }
                }
            } catch (error) {
                ultimateLog('우선순위 감정 상태 조회 실패:', error.message);
            }
        }
        
        if (priorityMatrix.redisContext > 0) {
            const { autonomousYejinSystem } = getRedisIntegratedSystem();
            
            if (autonomousYejinSystem) {
                try {
                    const recentConversations = await autonomousYejinSystem.redisCache.getConversationHistory(
                        'target_user', contextLength.redis
                    );
                    
                    if (recentConversations.length > 0) {
                        const conversationText = recentConversations.map(conv => 
                            `${conv.emotionType}: "${conv.message}"`
                        ).join('\n');
                        
                        if (promptStrategy.style === 'ultra_concise') {
                            contextualPrompt += `\n📋: ${conversationText.substring(0, 100)}\n`;
                        } else if (promptStrategy.style === 'ultra_detailed') {
                            contextualPrompt += `\n📋 최근 대화 맥락 (Redis 통합, ${recentConversations.length}개):\n${conversationText}\n`;
                        } else {
                            contextualPrompt += `\n📋 최근 대화:\n${conversationText}\n`;
                        }
                    }
                } catch (error) {
                    ultimateLog('Redis 대화 이력 조회 실패');
                }
            }
        }
        
        if (ultimateContextState.conversationTopic) {
            const topic = ultimateContextState.conversationTopic;
            
            if (promptStrategy.style === 'ultra_concise') {
                contextualPrompt += `\n🎯: ${topic.topic}\n`;
            } else if (promptStrategy.style === 'ultra_detailed') {
                contextualPrompt += `\n🎯 현재 대화 주제: ${topic.topic} (신뢰도: ${(topic.confidence * 100).toFixed(0)}%, 감지시간: ${new Date(topic.timestamp).toLocaleTimeString()})\n`;
            } else {
                contextualPrompt += `\n🎯 현재 주제: ${topic.topic}\n`;
            }
        }
        
        if (ultimateContextState.pendingAction && promptStrategy.style !== 'ultra_concise') {
            const action = ultimateContextState.pendingAction;
            
            if (promptStrategy.style === 'ultra_detailed') {
                contextualPrompt += `\n⏳ 보류 중인 액션: ${action.action} (우선순위: ${action.priority}/10)\n`;
            } else {
                contextualPrompt += `\n⏳ 보류 액션: ${action.action}\n`;
            }
        }
        
        if (promptStrategy.style === 'ultra_detailed') {
            const memoryCount = ultimateContextState.userCommandMemories.length;
            const topicCount = ultimateContextState.topicHistory.length;
            const emotionSource = ultimateContextState.emotionPriority.lastEmotionSource || 'none';
            const errorCount = ultimateContextState.emotionPriority.emotionSystemErrors.length;
            contextualPrompt += `\n📊 컨텍스트 메타: 사용자기억 ${memoryCount}개, 주제전환 ${topicCount}회, 모델: ${optimization.model}, 감정소스: ${emotionSource}, 에러: ${errorCount}개\n`;
        }
        
        if (contextualPrompt.length > promptStrategy.maxLength) {
            contextualPrompt = contextualPrompt.substring(0, promptStrategy.maxLength) + '...';
        }
        
        ultimateLog(`최강 통합 프롬프트 생성 완료`, {
            model: optimization.model,
            style: promptStrategy.style,
            length: contextualPrompt.length,
            maxLength: promptStrategy.maxLength,
            components: {
                userMemories: priorityMatrix.userCommandMemories > 0,
                priorityEmotions: true,
                redisContext: priorityMatrix.redisContext > 0,
                topic: !!ultimateContextState.conversationTopic,
                pendingAction: !!ultimateContextState.pendingAction
            }
        });
        
        return contextualPrompt;
        
    } catch (error) {
        ultimateLog('최강 프롬프트 생성 중 에러:', error.message);
        return basePrompt;
    }
}

// ==================== 🤖 사용자 명령어 처리 (Redis 통합) ====================

/**
 * 🤖 Redis 통합 사용자 명령어 감지 및 처리
 */
async function processUserCommandWithRedis(message, speaker) {
    if (speaker !== 'user' && speaker !== '아저씨') {
        return null;
    }
    
    const lowerMessage = message.toLowerCase().trim();
    
    if (lowerMessage.includes('기억해') || lowerMessage.includes('잊지마')) {
        const memoryContent = message.replace(/기억해|줘|잊지마|잊지말아|라고|했잖아/g, '').trim();
        if (memoryContent.length > 0) {
            const memoryId = await addUserCommandMemoryWithRedis(memoryContent, 'user_command');
            ultimateLog(`Redis 통합 사용자 명령 처리: 기억 추가 - "${memoryContent}"`);
            return { type: 'memory_add', content: memoryContent, id: memoryId, redisIntegrated: true };
        }
    }
    
    if (lowerMessage.includes('잊어') || lowerMessage.includes('지워')) {
        const forgetContent = message.replace(/잊어|줘|지워|버려|삭제|해줘/g, '').trim();
        if (forgetContent.length > 0) {
            const deleted = await deleteUserCommandMemoryWithRedis(forgetContent);
            ultimateLog(`Redis 통합 사용자 명령 처리: 기억 삭제 - "${forgetContent}" (${deleted ? '성공' : '실패'})`);
            return { type: 'memory_delete', content: forgetContent, success: deleted, redisIntegrated: true };
        }
    }
    
    return null;
}

// ==================== 🎯 지능적 대화 주제 감지 ====================

/**
 * 🎯 고급 대화 주제 자동 감지
 */
function detectConversationTopicAdvanced(message) {
    const topicKeywords = {
        '날씨': ['날씨', '비', '눈', '더워', '추워', '바람', '구름', '햇살', '기온', '날씨', '장마'],
        '음식': ['밥', '음식', '먹', '라면', '치킨', '피자', '맛있', '배고', '요리', '식사', '간식'],
        '감정': ['사랑', '보고싶', '그리워', '행복', '슬퍼', '기뻐', '화나', '걱정', '행복해', '우울'],
        '일상': ['일', '학교', '회사', '집', '쇼핑', '영화', '게임', '책', '휴식', '나들이'],
        '건강': ['아프', '피곤', '아파', '병원', '약', '건강', '운동', '잠', '컨디션', '몸조리'],
        '여행': ['여행', '놀러', '나들이', '휴가', '여행', '관광', '구경', '드라이브'],
        '선물': ['선물', '깜짝', '서프라이즈', '생일', '기념일', '축하', '이벤트'],
        '미래계획': ['계획', '예정', '할거야', '하려고', '준비', '계획중', '예약']
    };
    
    const lowerMessage = message.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                score += keyword.length;
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = topic;
        }
    }
    
    if (bestMatch && bestScore > 0) {
        const confidence = Math.min(0.9, bestScore / 10);
        updateConversationTopicIntelligently(bestMatch, confidence);
        return bestMatch;
    }
    
    return null;
}

// ==================== 📊 시스템 상태 및 통계 ====================

/**
 * 📊 Ultimate Context 시스템 상태 조회 (순환 참조 방지 버전)
 */
function getUltimateSystemStatus() {
    const { autonomousYejinSystem, redisCache } = getRedisIntegratedSystem();
    const { integratedMoodManager, integratedAiUtils } = getIntegratedSystems();
    
    return {
        version: 'v37.3-circular-reference-elimination',
        type: 'ultimate_context_system',
        
        gptOptimization: {
            currentModel: ultimateContextState.gptOptimization.currentModel,
            optimizationCount: ultimateContextState.optimizationStats.contextOptimizations,
            promptGenerations: ultimateContextState.optimizationStats.promptGenerations,
            lastOptimization: ultimateContextState.optimizationStats.lastOptimizationResult
        },
        
        emotionPrioritySystem: {
            active: ultimateContextState.emotionPriority.prioritySystemsActive,
            lastEmotionSource: ultimateContextState.emotionPriority.lastEmotionSource,
            lastEmotionTime: ultimateContextState.emotionPriority.lastEmotionTime,
            recentOverrides: ultimateContextState.emotionPriority.emotionOverrides.slice(-3),
            priorityOrder: ['externalInjection', 'moodManager', 'ultimateContext'],
            lastMoodCheck: ultimateContextState.emotionPriority.lastMoodCheck,
            errorCount: ultimateContextState.emotionPriority.emotionSystemErrors.length,
            recentErrors: ultimateContextState.emotionPriority.emotionSystemErrors.slice(-3),
            
            externalEmotionInjection: {
                hasExternalState: !!ultimateContextState.emotionPriority.externalEmotionState,
                lastExternalUpdate: ultimateContextState.emotionPriority.lastExternalUpdate,
                currentExternalEmotion: ultimateContextState.emotionPriority.externalEmotionState?.currentEmotion || null
            },
            
            circularReferenceProtection: true
        },
        
        userMemories: {
            totalCount: ultimateContextState.userCommandMemories.length,
            redisSynced: ultimateContextState.lastRedisSyncTime > 0,
            lastSyncTime: ultimateContextState.lastRedisSyncTime,
            recentMemories: ultimateContextState.userCommandMemories.slice(-3).map(m => ({
                id: m.id,
                content: m.content.substring(0, 30) + '...',
                timestamp: m.timestamp
            }))
        },
        
        conversationTopic: ultimateContextState.conversationTopic,
        topicHistory: ultimateContextState.topicHistory.slice(-5),
        pendingAction: ultimateContextState.pendingAction,
        
        integrationStatus: {
            autonomousYejinSystem: !!autonomousYejinSystem,
            redisCache: !!redisCache && redisCache.isAvailable,
            integratedMoodManager: !!integratedMoodManager,
            integratedAiUtils: !!integratedAiUtils,
            gptModelManagement: !!getCurrentModelSetting,
            
            circularReferenceProtection: true,
            externalEmotionInjectionSupported: true,
            
            moodManagerFunctions: integratedMoodManager ? {
                getIntegratedMoodState: typeof integratedMoodManager.getIntegratedMoodState === 'function'
            } : null
        },
        
        emotionConflictResolution: {
            getMoodStateFixed: true,
            emotionPrioritySystemAdded: true,
            moodManagerRespected: true,
            typeErrorResolved: true,
            priorityCheckEnhanced: true,
            errorHandlingAdded: true,
            safeCallWrappingAdded: true,
            circularReferenceEliminated: true,
            externalEmotionInjectionAdded: true,
            sulkyManagerCircularReferenceFixed: true
        },
        
        lastUpdate: Date.now(),
        uniqueFeatures: [
            'GPT 모델별 초정밀 최적화',
            'Redis 통합 사용자 기억',
            '지능적 대화 주제 추적',
            '최강 통합 프롬프트 생성',
            '고급 보류 액션 관리',
            '순환 참조 방지 감정 시스템',
            '외부 감정 상태 주입 지원',
            'moodManager 안전 연동',
            '감정 시스템 에러 처리 및 로깅',
            '완전한 순환 참조 해결'
        ]
    };
}

// ==================== 🚀 시스템 초기화 ====================

/**
 * 🚀 Ultimate Context 시스템 초기화 (순환 참조 방지)
 */
async function initializeUltimateContextSystem() {
    ultimateLog('Ultimate Context v37.3 시스템 초기화 시작 (순환 참조 완전 제거)...');
    
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    ultimateLog(`현재 GPT 모델: ${currentModel}`);
    
    getRedisIntegratedSystem();
    const systems = getIntegratedSystems();
    
    await syncUserMemoriesWithRedis();
    optimizeForCurrentModel();
    
    ultimateContextState.emotionPriority.prioritySystemsActive = true;
    
    const moodStatus = systems.integratedMoodManager ? '✅ 연동됨' : '❌ 미연동';
    
    ultimateLog(`Ultimate Context v37.3 초기화 완료!`);
    ultimateLog(`📊 시스템 연동 상태:`);
    ultimateLog(`  - GPT 모델: ${currentModel}`);
    ultimateLog(`  - Redis 통합: ${redisCache ? '✅ 활성' : '❌ 비활성'}`);
    ultimateLog(`  - moodManager: ${moodStatus}`);
    ultimateLog(`  - 순환 참조 방지 감정 우선순위: ✅ 활성`);
    ultimateLog(`  - 외부 감정 주입 시스템: ✅ 활성`);
    ultimateLog(`  - 감정 시스템 에러 처리: ✅ 활성`);
    ultimateLog(`  - sulkyManager 순환 참조: ✅ 해결됨`);
    
    return true;
}

// ==================== 📤 모듈 내보내기 ==================
ultimateLog('Ultimate Context v37.3 로드 완료 (순환 참조 완전 제거)');

module.exports = {
    // 🚀 초기화
    initializeUltimateContextSystem,
    
    // ✨ 핵심 고유 기능 - GPT 모델별 최적화
    getUltimatePrecisionContextLength,
    getUltimateContextPriorityMatrix,
    getUltimatePromptStrategy,
    optimizeForCurrentModel,
    
    // 🧠 Redis 통합 사용자 기억 관리
    addUserCommandMemoryWithRedis,
    deleteUserCommandMemoryWithRedis,
    searchUserMemoriesWithRedis,
    syncUserMemoriesWithRedis,
    
    // 🎯 대화 주제 & 액션 관리
    updateConversationTopicIntelligently,
    setAdvancedPendingAction,
    detectConversationTopicAdvanced,
    
    // ✨ 최강 통합 프롬프트 생성 (핵심!)
    generateUltimateMasterContextPrompt,
    
    // 🤖 Redis 통합 명령어 처리
    processUserCommandWithRedis,
    
    // 🔧 순환 참조 방지 감정 시스템 (v37.3)
    injectExternalEmotionState,         // 외부 감정 상태 주입 (sulkyManager용)
    checkExternalEmotionState,          // 외부 주입 감정 상태 체크
    getMoodManagerStateSafe,            // 안전한 무드매니저 상태 체크
    checkPriorityEmotionSystemsSafe,    // 순환 참조 방지 우선순위 체크
    
    // 🔧 호환성 함수들 (순환 참조 방지)
    getMoodState,        // ← 순환 참조 방지 완료!
    updateMoodState,     // ← 우선순위 존중하도록 개선됨
    
    // 🔧 감정 상태 관리
    recordEmotionPriority,
    
    // 🚨 NEW: 안전한 감정 시스템 호출
    safeCallEmotionSystem,
    recordEmotionSystemError,
    
    // 📊 상태 조회
    getUltimateSystemStatus,
    
    // 🔄 시스템 연동
    getRedisIntegratedSystem,
    getIntegratedSystems,
    
    // 🎁 유틸리티
    ultimateLog,
    
    // 🛡️ 호환성 (기존 함수명 유지 - 안전성)
    initializeSlimContextSystem: initializeUltimateContextSystem,
    getUltimateOptimizedContextualPrompt: generateUltimateMasterContextPrompt,
    addUserCommandMemory: addUserCommandMemoryWithRedis,
    deleteUserCommandMemory: deleteUserCommandMemoryWithRedis,
    processUserCommand: processUserCommandWithRedis,
    updateConversationTopic: updateConversationTopicIntelligently,
    setPendingAction: setAdvancedPendingAction,
    detectConversationTopic: detectConversationTopicAdvanced,
    getSlimInternalState: getUltimateSystemStatus,
    
    // 🔄 레거시 호환성 (완전 호환)
    initializeEmotionalSystems: initializeUltimateContextSystem,
    getUltimateContextualPrompt: generateUltimateMasterContextPrompt,
    addUserMemory: addUserCommandMemoryWithRedis,
    deleteUserMemory: deleteUserCommandMemoryWithRedis,
    getSpontaneousStats: getUltimateSystemStatus,
    recordSpontaneousMessage: () => ultimateLog('기능이 다른 시스템으로 이관됨'),
    getDetailedSpontaneousStats: getUltimateSystemStatus
};
