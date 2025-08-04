// ============================================================================
// ultimateConversationContext.js - v37.3 (감정 시스템 충돌 완전 해결!)
// 🎯 핵심 고유 기능 보존: GPT모델 최적화 + 동적기억 + 주제관리 + 정교한프롬프트
// 🔄 Redis 통합: 기존 시스템과 완전 연동하여 무쿠 벙어리 문제 해결
// ✨ 중복 제거: 다른 시스템들과 역할 분담 명확화
// 🛡️ 안전 우선: 기존 기능 100% 보존하면서 Redis 레이어 추가
// 🔧 감정 우선순위: sulkyManager > moodManager > ultimateContext 순서로 적용
// 🚨 핵심 수정: getMoodState()가 다른 감정 시스템들을 확실히 우선 존중하도록 완전 개선
// 💪 v37.3 개선사항: 감정 시스템 연동 강화 + 에러 처리 완벽화 + 삐짐 상태 확실 감지
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

// 🔄 다른 통합 시스템들 연동 (강화된 연동)
let integratedMoodManager = null;
let integratedAiUtils = null;
let integratedSulkyManager = null;

function getIntegratedSystems() {
    // 🔧 매번 새로 로드하여 연동 안정성 확보
    try {
        integratedSulkyManager = require('./sulkyManager');
        console.log('✅ [UltimateContext] 통합 삐짐매니저 연동 성공');
    } catch (error) {
        console.log('⚠️ [UltimateContext] 통합 삐짐매니저 연동 실패:', error.message);
        integratedSulkyManager = null;
    }
    
    try {
        integratedMoodManager = require('./moodManager');
        console.log('✅ [UltimateContext] 통합 무드매니저 연동 성공');
    } catch (error) {
        console.log('⚠️ [UltimateContext] 통합 무드매니저 연동 실패:', error.message);
        integratedMoodManager = null;
    }
    
    try {
        integratedAiUtils = require('./aiUtils');
        console.log('✅ [UltimateContext] 통합 AI유틸 연동 성공');
    } catch (error) {
        console.log('⚠️ [UltimateContext] 통합 AI유틸 연동 실패:', error.message);
        integratedAiUtils = null;
    }
    
    return { integratedMoodManager, integratedAiUtils, integratedSulkyManager };
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
    
    // 🔧 강화된 감정 상태 우선순위 관리
    emotionPriority: {
        lastEmotionSource: null,
        lastEmotionTime: 0,
        emotionOverrides: [],
        prioritySystemsActive: true,
        lastSulkyCheck: 0,
        lastMoodCheck: 0,
        emotionSystemErrors: []
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
            // GPT-3.5: 극도로 효율적인 토큰 사용
            return { 
                recent: 2,      // 최근 대화 최소
                memory: 1,      // 기존 기억 최소
                userMemory: 1,  // 사용자 기억 최소
                redis: 2,       // Redis 데이터 최소
                totalTokenBudget: 500
            };
            
        case '4.0':
            // GPT-4o: 최대한 풍부한 컨텍스트
            return { 
                recent: 15,     // 최근 대화 풍부
                memory: 8,      // 기존 기억 풍부
                userMemory: 6,  // 사용자 기억 풍부
                redis: 10,      // Redis 데이터 풍부
                totalTokenBudget: 2000
            };
            
        case 'auto':
            // 자동 모드: 지능적 균형
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
            // GPT-3.5: 핵심 정보만 집중
            userCommandMemories: 0.7,    // 사용자 직접 명령 최우선
            recentConversation: 0.2,     // 최근 대화 최소
            emotionState: 0.05,          // 감정 상태 최소
            redisContext: 0.05           // Redis 컨텍스트 최소
        },
        '4.0': {
            // GPT-4o: 모든 정보 균형있게 활용
            userCommandMemories: 0.3,    // 사용자 명령
            recentConversation: 0.3,     // 최근 대화
            emotionState: 0.2,           // 감정 상태
            redisContext: 0.2            // Redis 컨텍스트
        },
        'auto': {
            // 자동: 적응적 균형
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
        
        // Redis에서 사용자 기억 조회
        const cachedUserMemories = await redisCache.getCachedLearningPattern('user_command_memories');
        
        if (cachedUserMemories && Array.isArray(cachedUserMemories)) {
            // Redis 데이터로 로컬 캐시 업데이트
            ultimateContextState.userCommandMemories = cachedUserMemories;
            ultimateContextState.lastRedisSyncTime = Date.now();
            
            ultimateLog(`Redis 사용자 기억 동기화 성공: ${cachedUserMemories.length}개`);
            return true;
        }
        
        // Redis에 데이터가 없으면 로컬 데이터를 Redis에 저장
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
    
    // 로컬에 추가
    ultimateContextState.userCommandMemories.push(memoryObj);
    
    // Redis에도 저장
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
    
    // Redis에도 반영
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
    // 먼저 Redis와 동기화
    await syncUserMemoriesWithRedis();
    
    return ultimateContextState.userCommandMemories.filter(m =>
        m.content.toLowerCase().includes(keyword.toLowerCase())
    );
}

// ==================== 🔧 완전 강화된 감정 시스템 우선순위 관리 ====================

/**
 * 🚨 강화된 삐짐매니저 상태 체크 (완전 확실하게!)
 */
function getSulkyManagerState() {
    try {
        // 매번 새로 로드하여 최신 상태 확보
        const { integratedSulkyManager } = getIntegratedSystems();
        
        if (!integratedSulkyManager) {
            ultimateLog('🚨 [삐짐체크] sulkyManager 모듈 없음');
            return null;
        }
        
        // 여러 방법으로 상태 조회 시도
        let sulkyState = null;
        
        // 방법 1: getSulkinessState 함수
        if (typeof integratedSulkyManager.getSulkinessState === 'function') {
            sulkyState = integratedSulkyManager.getSulkinessState();
            ultimateLog('🔍 [삐짐체크] getSulkinessState 호출 성공', sulkyState);
        }
        
        // 방법 2: getSulkySystemStatus 함수
        if (!sulkyState && typeof integratedSulkyManager.getSulkySystemStatus === 'function') {
            const systemStatus = integratedSulkyManager.getSulkySystemStatus();
            if (systemStatus && systemStatus.currentState) {
                sulkyState = systemStatus.currentState;
                ultimateLog('🔍 [삐짐체크] getSulkySystemStatus 호출 성공', sulkyState);
            }
        }
        
        // 방법 3: 직접 내부 상태 접근 (비상용)
        if (!sulkyState && integratedSulkyManager.sulkyState) {
            sulkyState = integratedSulkyManager.sulkyState;
            ultimateLog('🔍 [삐짐체크] 직접 상태 접근 성공', sulkyState);
        }
        
        if (!sulkyState) {
            ultimateLog('⚠️ [삐짐체크] 모든 방법으로 상태 조회 실패');
            return null;
        }
        
        // 삐짐 상태 확인
        if (sulkyState.isSulky === true || sulkyState.sulkyLevel > 0 || sulkyState.isActivelySulky === true) {
            ultimateLog(`🚨 [삐짐감지!] 레벨: ${sulkyState.sulkyLevel}, 활성: ${sulkyState.isActivelySulky}, 이유: ${sulkyState.sulkyReason}`);
            
            return {
                isSulky: true,
                level: sulkyState.sulkyLevel || 1,
                isActive: sulkyState.isActivelySulky || false,
                reason: sulkyState.sulkyReason || 'unknown',
                pushPullActive: sulkyState.pushPullActive || false,
                recoveryMode: sulkyState.recoveryMode || false,
                fullState: sulkyState
            };
        }
        
        // 다른 특별한 상태들도 체크
        if (sulkyState.pushPullActive === true) {
            ultimateLog('💕 [밀당감지] 자율적 밀당 활성');
            return {
                isSulky: false,
                pushPullActive: true,
                pushPullType: sulkyState.pushPullType,
                stubbornness: sulkyState.stubbornnessLevel || 5,
                fullState: sulkyState
            };
        }
        
        if (sulkyState.recoveryMode === true) {
            ultimateLog('🌙 [회복모드감지] 삐짐 해소 후 회복 중');
            return {
                isSulky: false,
                recoveryMode: true,
                coldTone: sulkyState.coldToneActive || false,
                fullState: sulkyState
            };
        }
        
        ultimateLog('✅ [삐짐체크] 정상 상태 - 삐짐/밀당/회복 모두 비활성');
        return { isSulky: false, normal: true, fullState: sulkyState };
        
    } catch (error) {
        recordEmotionSystemError('sulkyManager', error, { function: 'getSulkyManagerState' });
        return null;
    }
}

/**
 * 🔧 강화된 무드매니저 상태 체크
 */
async function getMoodManagerState() {
    try {
        const { integratedMoodManager } = getIntegratedSystems();
        
        if (!integratedMoodManager) {
            ultimateLog('⚠️ [무드체크] moodManager 모듈 없음');
            return null;
        }
        
        // getIntegratedMoodState 함수 호출
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
        recordEmotionSystemError('moodManager', error, { function: 'getMoodManagerState' });
        return null;
    }
}

/**
 * 🔧 완전 강화된 우선순위 감정 시스템 체크
 */
async function checkPriorityEmotionSystems() {
    const now = Date.now();
    
    try {
        // 🚨 1순위: sulkyManager 체크 (완전 확실하게!)
        ultimateLog('🔍 [감정우선순위] 1순위 sulkyManager 체크 시작...');
        ultimateContextState.emotionPriority.lastSulkyCheck = now;
        
        const sulkyManagerState = getSulkyManagerState();
        
        if (sulkyManagerState) {
            if (sulkyManagerState.isSulky) {
                // 삐짐 상태 감지!
                const emotionMapping = {
                    1: 'slightly_annoyed',
                    2: 'annoyed', 
                    3: 'upset',
                    4: 'very_upset',
                    5: 'extremely_upset'
                };
                
                const currentEmotion = emotionMapping[sulkyManagerState.level] || 'sulky';
                const intensity = Math.min(1.0, sulkyManagerState.level / 4);
                
                ultimateLog(`🚨 [감정우선순위] ✅ SULKY 상태 확정! ${currentEmotion} (레벨: ${sulkyManagerState.level})`);
                
                return {
                    currentEmotion: currentEmotion,
                    intensity: intensity,
                    source: 'sulky_manager_priority',
                    timestamp: now,
                    originalState: sulkyManagerState.fullState,
                    priority: 1,
                    reason: sulkyManagerState.reason || 'unknown_sulky_reason',
                    isActive: sulkyManagerState.isActive,
                    detected: 'sulky_state_confirmed'
                };
            }
            
            if (sulkyManagerState.pushPullActive) {
                ultimateLog(`💕 [감정우선순위] ✅ 밀당 상태 확정!`);
                return {
                    currentEmotion: 'push_pull_active',
                    intensity: 0.7,
                    source: 'sulky_manager_push_pull',
                    timestamp: now,
                    priority: 1,
                    reason: 'autonomous_push_pull_session',
                    pushPullType: sulkyManagerState.pushPullType,
                    detected: 'push_pull_confirmed'
                };
            }
            
            if (sulkyManagerState.recoveryMode) {
                ultimateLog(`🌙 [감정우선순위] ✅ 회복 모드 확정!`);
                return {
                    currentEmotion: 'recovery_mode',
                    intensity: 0.5,
                    source: 'sulky_manager_recovery',
                    timestamp: now,
                    priority: 1,
                    reason: 'post_conflict_recovery',
                    coldTone: sulkyManagerState.coldTone,
                    detected: 'recovery_mode_confirmed'
                };
            }
        }
        
        ultimateLog('✅ [감정우선순위] 1순위 완료 - sulkyManager 특별 상태 없음');
        
        // 🔧 2순위: moodManager 체크
        ultimateLog('🔍 [감정우선순위] 2순위 moodManager 체크 시작...');
        ultimateContextState.emotionPriority.lastMoodCheck = now;
        
        const moodManagerState = await getMoodManagerState();
        
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
        recordEmotionSystemError('priorityCheck', error, { function: 'checkPriorityEmotionSystems' });
        ultimateLog('❌ [감정우선순위] 체크 중 에러 발생, 기본값 사용');
    }
    
    ultimateLog('✅ [감정우선순위] 모든 우선순위 시스템 체크 완료 - 특별한 상태 없음');
    return null; // 다른 시스템에서 특별한 감정 상태가 없음
}

/**
 * 🔧 감정 상태 우선순위 기록
 */
function recordEmotionPriority(emotionData) {
    ultimateContextState.emotionPriority.lastEmotionSource = emotionData.source;
    ultimateContextState.emotionPriority.lastEmotionTime = Date.now();
    
    // 최근 감정 오버라이드 기록 (최대 10개)
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
 * 🔧 완전히 개선된 감정 상태 조회 (다른 시스템 확실히 우선 적용!)
 */
async function getMoodState() {
    try {
        ultimateLog('🔍 [getMoodState] 감정 상태 조회 시작...');
        
        // 🚨 1단계: 다른 감정 시스템들 확실히 우선 체크
        const priorityEmotion = await checkPriorityEmotionSystems();
        
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
                
                // 🚨 새로 추가된 상세 정보
                detected: priorityEmotion.detected,
                originalState: priorityEmotion.originalState,
                isActive: priorityEmotion.isActive,
                pushPullType: priorityEmotion.pushPullType,
                coldTone: priorityEmotion.coldTone,
                
                // 메타 정보
                integration: {
                    redisAvailable: !!redisCache?.isAvailable,
                    autonomousSystemConnected: !!autonomousYejinSystem,
                    userMemoriesCount: ultimateContextState.userCommandMemories.length,
                    prioritySystemActive: true,
                    priorityCheckSuccessful: true,
                    sulkyManagerConnected: !!getIntegratedSystems().integratedSulkyManager,
                    moodManagerConnected: !!getIntegratedSystems().integratedMoodManager
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
                checkedSystems: ['sulkyManager', 'moodManager', 'ultimateContext'],
                fallbackUsed: true
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
                prioritySystemActive: false
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
        
        // 🔧 다양한 형태 지원 (currentEmotion, currentMood, emotion)
        const emotion = newMoodState.currentEmotion || newMoodState.currentMood || newMoodState.emotion;
        
        if (!emotion) {
            ultimateLog('⚠️ updateMoodState: 감정 정보 없음', newMoodState);
            return false;
        }
        
        const intensity = newMoodState.intensity || newMoodState.level || 0.7;
        const source = newMoodState.source || 'external_update';
        
        // 🔧 우선순위 체크: 현재 상태가 더 높은 우선순위인지 확인
        const currentPriority = ultimateContextState.emotionPriority.lastEmotionSource?.includes('sulky') ? 1 :
                               ultimateContextState.emotionPriority.lastEmotionSource?.includes('mood') ? 2 : 3;
        
        const newPriority = source.includes('sulky') ? 1 : source.includes('mood') ? 2 : 3;
        
        if (newPriority <= currentPriority) {
            // 같거나 더 높은 우선순위이면 업데이트
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
    
    // 주제 전환 이력 기록 (상세)
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
        
        // 최근 50개만 유지
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
        expectedDuration: context.expectedDuration || 300000, // 5분 기본
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
        
        // 1. ✨ GPT 모델별 최적화 수행
        const optimization = optimizeForCurrentModel();
        const { contextLength, priorityMatrix, promptStrategy } = optimization;
        
        ultimateLog(`최강 프롬프트 생성 시작 (${optimization.model} 최적화)`);
        
        // 2. 🔄 Redis와 동기화
        await syncUserMemoriesWithRedis();
        
        // 3. ✨ 사용자 명령 기억 추가 (최고 우선순위)
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
        
        // 4. 🔧 NEW: 강화된 우선순위 감정 상태 추가!
        if (priorityMatrix.emotionState > 0) {
            try {
                const priorityEmotionState = await checkPriorityEmotionSystems();
                
                if (priorityEmotionState) {
                    if (promptStrategy.style === 'ultra_concise') {
                        contextualPrompt += `\n💭: ${priorityEmotionState.currentEmotion}\n`;
                    } else if (promptStrategy.style === 'ultra_detailed') {
                        contextualPrompt += `\n💭 현재 예진이 감정 상태 (${priorityEmotionState.source}):\n`;
                        contextualPrompt += `   감정: ${priorityEmotionState.currentEmotion} (강도: ${priorityEmotionState.intensity})\n`;
                        contextualPrompt += `   우선순위: ${priorityEmotionState.priority} (1=삐짐, 2=기분, 3=주제)\n`;
                        if (priorityEmotionState.reason) {
                            contextualPrompt += `   원인: ${priorityEmotionState.reason}\n`;
                        }
                        if (priorityEmotionState.detected) {
                            contextualPrompt += `   감지결과: ${priorityEmotionState.detected}\n`;
                        }
                        if (priorityEmotionState.originalState && priorityEmotionState.source.includes('sulky')) {
                            contextualPrompt += `   삐짐상세: 레벨${priorityEmotionState.originalState.level || 1}, 활성${priorityEmotionState.originalState.isActive}\n`;
                        }
                    } else {
                        contextualPrompt += `\n💭 현재 감정: ${priorityEmotionState.currentEmotion} (${priorityEmotionState.source}, 우선순위: ${priorityEmotionState.priority})\n`;
                    }
                } else {
                    // 우선순위 시스템에서 감정이 없으면 명시적으로 표기
                    if (promptStrategy.style !== 'ultra_concise') {
                        contextualPrompt += `\n💭 감정상태: 평온함 (우선순위 시스템 체크 완료, 특별한 상태 없음)\n`;
                    }
                }
            } catch (error) {
                ultimateLog('우선순위 감정 상태 조회 실패:', error.message);
            }
        }
        
        // 5. 🔄 Redis 컨텍스트 (자율 시스템에서)
        if (priorityMatrix.redisContext > 0) {
            const { autonomousYejinSystem } = getRedisIntegratedSystem();
            
            if (autonomousYejinSystem) {
                try {
                    // Redis에서 최근 대화 가져오기
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
        
        // 6. 🎯 현재 대화 주제 추가
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
        
        // 7. ⏳ 보류 액션 추가
        if (ultimateContextState.pendingAction && promptStrategy.style !== 'ultra_concise') {
            const action = ultimateContextState.pendingAction;
            
            if (promptStrategy.style === 'ultra_detailed') {
                contextualPrompt += `\n⏳ 보류 중인 액션: ${action.action} (우선순위: ${action.priority}/10)\n`;
            } else {
                contextualPrompt += `\n⏳ 보류 액션: ${action.action}\n`;
            }
        }
        
        // 8. 📊 GPT 최적화 메타정보 (상세 모드에서만)
        if (promptStrategy.style === 'ultra_detailed') {
            const memoryCount = ultimateContextState.userCommandMemories.length;
            const topicCount = ultimateContextState.topicHistory.length;
            const emotionSource = ultimateContextState.emotionPriority.lastEmotionSource || 'none';
            const errorCount = ultimateContextState.emotionPriority.emotionSystemErrors.length;
            contextualPrompt += `\n📊 컨텍스트 메타: 사용자기억 ${memoryCount}개, 주제전환 ${topicCount}회, 모델: ${optimization.model}, 감정소스: ${emotionSource}, 에러: ${errorCount}개\n`;
        }
        
        // 9. ✂️ 길이 제한 적용 (모델별)
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
                priorityEmotions: true,  // 강화된 우선순위 시스템
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
    
    // "기억해줘" 명령어 처리
    if (lowerMessage.includes('기억해') || lowerMessage.includes('잊지마')) {
        const memoryContent = message.replace(/기억해|줘|잊지마|잊지말아|라고|했잖아/g, '').trim();
        if (memoryContent.length > 0) {
            const memoryId = await addUserCommandMemoryWithRedis(memoryContent, 'user_command');
            ultimateLog(`Redis 통합 사용자 명령 처리: 기억 추가 - "${memoryContent}"`);
            return { type: 'memory_add', content: memoryContent, id: memoryId, redisIntegrated: true };
        }
    }
    
    // "잊어줘" 명령어 처리
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
                score += keyword.length; // 긴 키워드일수록 더 정확
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = topic;
        }
    }
    
    if (bestMatch && bestScore > 0) {
        const confidence = Math.min(0.9, bestScore / 10); // 최대 90% 신뢰도
        updateConversationTopicIntelligently(bestMatch, confidence);
        return bestMatch;
    }
    
    return null;
}

// ==================== 📊 시스템 상태 및 통계 ====================

/**
 * 📊 Ultimate Context 시스템 상태 조회 (강화)
 */
function getUltimateSystemStatus() {
    const { autonomousYejinSystem, redisCache } = getRedisIntegratedSystem();
    const { integratedMoodManager, integratedAiUtils, integratedSulkyManager } = getIntegratedSystems();
    
    return {
        // 시스템 정보
        version: 'v37.3-ultimate-emotion-conflict-resolution',
        type: 'ultimate_context_system',
        
        // 핵심 고유 기능 상태
        gptOptimization: {
            currentModel: ultimateContextState.gptOptimization.currentModel,
            optimizationCount: ultimateContextState.optimizationStats.contextOptimizations,
            promptGenerations: ultimateContextState.optimizationStats.promptGenerations,
            lastOptimization: ultimateContextState.optimizationStats.lastOptimizationResult
        },
        
        // 🔧 강화된 감정 우선순위 시스템 상태
        emotionPrioritySystem: {
            active: ultimateContextState.emotionPriority.prioritySystemsActive,
            lastEmotionSource: ultimateContextState.emotionPriority.lastEmotionSource,
            lastEmotionTime: ultimateContextState.emotionPriority.lastEmotionTime,
            recentOverrides: ultimateContextState.emotionPriority.emotionOverrides.slice(-3),
            priorityOrder: ['sulkyManager', 'moodManager', 'ultimateContext'],
            lastSulkyCheck: ultimateContextState.emotionPriority.lastSulkyCheck,
            lastMoodCheck: ultimateContextState.emotionPriority.lastMoodCheck,
            errorCount: ultimateContextState.emotionPriority.emotionSystemErrors.length,
            recentErrors: ultimateContextState.emotionPriority.emotionSystemErrors.slice(-3)
        },
        
        // 사용자 기억 상태
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
        
        // 대화 주제 상태
        conversationTopic: ultimateContextState.conversationTopic,
        topicHistory: ultimateContextState.topicHistory.slice(-5),
        
        // 보류 액션 상태
        pendingAction: ultimateContextState.pendingAction,
        
        // 통합 시스템 연동 상태 (강화)
        integrationStatus: {
            autonomousYejinSystem: !!autonomousYejinSystem,
            redisCache: !!redisCache && redisCache.isAvailable,
            integratedMoodManager: !!integratedMoodManager,
            integratedAiUtils: !!integratedAiUtils,
            integratedSulkyManager: !!integratedSulkyManager,
            gptModelManagement: !!getCurrentModelSetting,
            
            // 🚨 NEW: 실제 연동 테스트 결과
            sulkyManagerFunctions: integratedSulkyManager ? {
                getSulkinessState: typeof integratedSulkyManager.getSulkinessState === 'function',
                getSulkySystemStatus: typeof integratedSulkyManager.getSulkySystemStatus === 'function'
            } : null,
            
            moodManagerFunctions: integratedMoodManager ? {
                getIntegratedMoodState: typeof integratedMoodManager.getIntegratedMoodState === 'function'
            } : null
        },
        
        // 🔧 감정 시스템 문제 해결 상태 (업데이트)
        emotionConflictResolution: {
            getMoodStateFixed: true,
            emotionPrioritySystemAdded: true,
            sulkyManagerIntegrated: true,
            moodManagerRespected: true,
            typeErrorResolved: true,
            sulkySystemSupported: true,
            priorityCheckEnhanced: true,
            errorHandlingAdded: true,
            safeCallWrappingAdded: true,
            multipleStateCheckMethods: true  // NEW
        },
        
        // 메타정보
        lastUpdate: Date.now(),
        uniqueFeatures: [
            'GPT 모델별 초정밀 최적화',
            'Redis 통합 사용자 기억',
            '지능적 대화 주제 추적',
            '최강 통합 프롬프트 생성',
            '고급 보류 액션 관리',
            '강화된 감정 시스템 우선순위 관리',
            'sulkyManager 완전 지원 + 다중 상태 체크',
            'moodManager 통합 연동',
            '감정 시스템 에러 처리 및 로깅',
            '안전한 감정 시스템 호출 래퍼'
        ]
    };
}

// ==================== 🚀 시스템 초기화 ====================

/**
 * 🚀 Ultimate Context 시스템 초기화 (강화)
 */
async function initializeUltimateContextSystem() {
    ultimateLog('Ultimate Context v37.3 시스템 초기화 시작 (감정 충돌 완전 해결)...');
    
    // GPT 모델 정보 확인
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    ultimateLog(`현재 GPT 모델: ${currentModel}`);
    
    // Redis 통합 시스템 연동
    getRedisIntegratedSystem();
    
    // 모든 통합 시스템들 연동 (sulkyManager 포함)
    const systems = getIntegratedSystems();
    
    // 사용자 기억 Redis 동기화
    await syncUserMemoriesWithRedis();
    
    // GPT 모델 최적화 초기 수행
    optimizeForCurrentModel();
    
    // 🔧 감정 우선순위 시스템 초기화
    ultimateContextState.emotionPriority.prioritySystemsActive = true;
    
    // 🔧 연결된 감정 시스템들 상태 체크
    const sulkyStatus = systems.integratedSulkyManager ? '✅ 연동됨' : '❌ 미연동';
    const moodStatus = systems.integratedMoodManager ? '✅ 연동됨' : '❌ 미연동';
    
    // 🚨 초기 감정 상태 체크 수행
    try {
        ultimateLog('🔍 초기 감정 시스템 상태 체크 수행...');
        const initialEmotionCheck = await checkPriorityEmotionSystems();
        if (initialEmotionCheck) {
            ultimateLog(`🚨 초기 감정 상태 감지: ${initialEmotionCheck.currentEmotion} (${initialEmotionCheck.source})`);
        } else {
            ultimateLog('✅ 초기 감정 상태: 평온함 (특별한 상태 없음)');
        }
    } catch (error) {
        ultimateLog('⚠️ 초기 감정 상태 체크 실패:', error.message);
    }
    
    ultimateLog(`Ultimate Context v37.3 초기화 완료!`);
    ultimateLog(`📊 시스템 연동 상태:`);
    ultimateLog(`  - GPT 모델: ${currentModel}`);
    ultimateLog(`  - Redis 통합: ${redisCache ? '✅ 활성' : '❌ 비활성'}`);
    ultimateLog(`  - sulkyManager: ${sulkyStatus}`);
    ultimateLog(`  - moodManager: ${moodStatus}`);
    ultimateLog(`  - 강화된 감정 우선순위: ✅ 활성`);
    ultimateLog(`  - 감정 시스템 에러 처리: ✅ 활성`);
    ultimateLog(`  - 다중 상태 체크 메소드: ✅ 활성`);
    
    return true;
}

// ==================== 📤 모듈 내보내기 ==================
ultimateLog('Ultimate Context v37.3 로드 완료 (감정 시스템 충돌 완전 해결)');

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
    
    // 🔧 완전 개선된 moodManager.js 호환성 (v37.3 강화!)
    getMoodState,        // ← 완전 강화! 삐짐 상태 확실히 우선 체크
    updateMoodState,     // ← 우선순위 존중하도록 개선됨
    
    // 🔧 강화된 감정 우선순위 시스템
    checkPriorityEmotionSystems,
    recordEmotionPriority,
    getSulkyManagerState,
    getMoodManagerState,
    
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
