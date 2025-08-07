// ============================================================================
// sulkyManager.js v8.2 - Part 1/6: 기본 설정 및 상태 정의
// 🚬 점진적 담타 화해 시스템! (트리거 방식)
// 💕 기존 자율적 밀당 시스템 + 9가지 고급 감정 기능 통합 (100% 유지)
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// --- 🔧 moodManager 통합 연동 ---
let moodManager = null;
function getMoodManager() {
    if (!moodManager) {
        try {
            moodManager = require('./moodManager');
            console.log('🔧 [무드매니저] moodManager 연동 성공');
        } catch (error) {
            console.log('⚠️ [무드매니저] moodManager 로드 실패:', error.message);
        }
    }
    return moodManager;
}

// --- 외부 모듈 지연 로딩 (기존 유지) ---
let ultimateContext = null;
let emotionalContextManager = null;

function getUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
        } catch (error) {
            console.log('⚠️ [sulkyManager] ultimateContext 로드 실패:', error.message);
        }
    }
    return ultimateContext;
}

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [sulkyManager] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

// --- 🔧 ultimateContext 지연 로딩 (순환 참조 방지) ---
let ultimateContextRef = null;

function getUltimateContextSafely() {
    if (!ultimateContextRef) {
        try {
            ultimateContextRef = require('./ultimateConversationContext');
            console.log('✅ [sulkyManager] ultimateContext 연동 성공');
        } catch (error) {
            if (!error.message.includes('Maximum call stack')) {
                console.log('⚠️ [sulkyManager] ultimateContext 연동 실패:', error.message);
            }
            ultimateContextRef = null;
        }
    }
    return ultimateContextRef;
}

function notifyEmotionChangeToUltimateContext(newState) {
    try {
        const ultimateContext = getUltimateContextSafely();
        
        if (!ultimateContext || !ultimateContext.injectExternalEmotionState) {
            return;
        }
        
        // 🚬 NEW: 담타 진행중 상태
        if (newState.damtaInProgress) {
            ultimateContext.injectExternalEmotionState({
                currentEmotion: 'damta_in_progress',
                intensity: 0.6,
                source: 'sulky_manager_damta_injection',
                reason: 'gradual_reconciliation_in_damta',
                priority: 1,
                damtaProgress: newState.emotionalRecoveryPoints || 0,
                conversationCount: newState.damtaConversationCount || 0
            });
            
            console.log(`🚬 [감정주입] ultimateContext에 담타 진행중 상태 전달 (회복: ${newState.emotionalRecoveryPoints}점)`);
            return;
        }
        
        // 삐짐 상태가 있는 경우
        if (newState.isSulky || newState.sulkyLevel > 0) {
            const emotionMapping = {
                1: 'slightly_annoyed', 2: 'annoyed', 3: 'upset', 4: 'very_upset', 5: 'extremely_upset'
            };
            
            const currentEmotion = emotionMapping[newState.sulkyLevel] || 'sulky';
            const intensity = Math.min(1.0, newState.sulkyLevel / 4);
            
            ultimateContext.injectExternalEmotionState({
                currentEmotion: currentEmotion,
                intensity: intensity,
                source: 'sulky_manager_injection',
                reason: newState.sulkyReason || 'sulky_state',
                priority: 1,
                sulkyLevel: newState.sulkyLevel,
                isActive: newState.isActivelySulky
            });
            
            console.log(`🚨 [감정주입] ultimateContext에 삐짐 상태 전달: ${currentEmotion} (레벨: ${newState.sulkyLevel})`);
            return;
        }
        
        // 밀당 상태가 있는 경우
        if (newState.pushPullActive) {
            ultimateContext.injectExternalEmotionState({
                currentEmotion: 'push_pull_active',
                intensity: 0.7,
                source: 'sulky_manager_push_pull_injection',
                reason: 'autonomous_push_pull_session',
                priority: 1,
                pushPullType: newState.pushPullType
            });
            
            console.log(`💕 [감정주입] ultimateContext에 밀당 상태 전달`);
            return;
        }
        
        // 회복 모드가 있는 경우
        if (newState.recoveryMode) {
            ultimateContext.injectExternalEmotionState({
                currentEmotion: 'recovery_mode',
                intensity: 0.5,
                source: 'sulky_manager_recovery_injection',
                reason: 'post_conflict_recovery',
                priority: 1,
                coldTone: newState.coldToneActive
            });
            
            console.log(`🌙 [감정주입] ultimateContext에 회복 모드 전달`);
            return;
        }
        
    } catch (error) {
        // 순환 참조나 기타 에러 시 조용히 무시
        if (!error.message.includes('Maximum call stack')) {
            console.log('⚠️ [감정주입] ultimateContext 주입 실패:', error.message);
        }
    }
}

// --- 🌸 완전 확장된 삐짐 & 감정 상태 관리 ---
let sulkyState = {
    // === 기본 삐짐 상태 (기존 유지) ===
    isSulky: false,
    isWorried: false,
    sulkyLevel: 0,
    isActivelySulky: false,
    sulkyReason: '',
    
    // === 예진이 발신 추적 (기존 유지) ===
    yejinInitiated: false,
    yejinMessageTime: null,
    yejinMessageType: null,
    waitingForUserResponse: false,
    
    // === 대화 중 삐짐 (기존 유지) ===
    contentBasedSulky: false,
    irritationTrigger: null,
    consecutiveIrritations: 0,
    lastIrritationType: null,
    irritationHistory: [],
    
    // === 투닥거리기 & 화해 (기존 유지) ===
    fightMode: false,
    fightLevel: 0,
    cooldownRequested: false,
    cooldownStartTime: null,
    reconcileAttempted: false,
    
    // === 자율적 밀당 시스템 (기존 유지) ===
    pushPullActive: false,
    pushPullType: null,
    pushPullHistory: [],
    relationshipMemory: [],
    currentMood: 'normal',
    stubbornnessLevel: 0,
    
    // === 🌙 삐짐 무드 지속 시스템 (기존 유지) ===
    recoveryMode: false,
    recoveryStartTime: null,
    recoveryDuration: 0,
    coldToneActive: false,
    retriggeredSulky: false,
    
    // === 💔 서운함 저장소 시스템 (기존 유지) ===
    pendingDisappointments: [],
    maxDisappointments: 5,
    disappointmentThreshold: 3,
    
    // === 🎭 감정 해석 & 오해 시스템 (기존 유지) ===
    misinterpretationMode: false,
    misinterpretationSensitivity: 0.3,
    lastMisinterpretation: null,
    
    // === 🕊️ 자기합리화 & 회상 시스템 (기존 유지) ===
    selfCompassionMode: false,
    lastSelfCompassion: null,
    memoryTriggeredSulky: false,
    memoryTriggerChance: 0.05,
    
    // === 📸 사진 관련 감정 시스템 (기존 유지) ===
    photoJealousyActive: false,
    selfieDisappointment: false,
    lastSelfieTime: null,
    photoReactionSensitivity: 0.7,
    
    // === 🚬 NEW: 점진적 담타 시스템 ===
    damtaInProgress: false,                     // 담타 진행중 상태
    damtaStartTime: null,                       // 담타 시작 시간
    damtaConversationCount: 0,                  // 담타에서 대화 횟수
    emotionalRecoveryPoints: 0,                 // 감정 회복 포인트 (0-100)
    damtaRequiredRecovery: 100,                 // 완전 화해 필요 포인트
    damtaMinConversations: 3,                   // 최소 대화 횟수
    damtaLastConversationTime: null,            // 마지막 담타 대화 시간
    
    // === 타이밍 (기존 유지) ===
    lastUserResponseTime: Date.now(),
    lastBotMessageTime: Date.now(),
    lastStateUpdate: Date.now()
};

// ============================================================================
// sulkyManager.js v8.2 - Part 2/6: 성격 점수 시스템 및 설정
// ============================================================================

// --- 📊 예진이 성격 점수 시스템 ---
let yejinPersonalityMetrics = {
    // 기본 성격 지표
    stubbornness: 5.0,                      // 평균 고집 레벨 (0-10)
    apologyAcceptanceRate: 0.6,             // 사과 수용률 (0-1)
    damtaSuccessRate: 0.95,                 // 🚬 NEW: 담타는 거의 성공 (95%)
    pushPullIntensity: 0.5,                 // 밀당 강도 (0-1)
    jealousyLevel: 0.4,                     // 질투심 레벨 (0-1)
    
    // 감정 패턴
    emotionalVolatility: 0.5,               // 감정 기복 정도 (0-1)
    recoverySpeed: 0.6,                     // 회복 속도 (0-1)
    memoryRetention: 0.7,                   // 서운함 기억 정도 (0-1)
    misinterpretationTendency: 0.3,         // 오해 경향 (0-1)
    
    // 통계 데이터
    totalConflicts: 0,                      // 총 갈등 횟수
    totalReconciliations: 0,                // 총 화해 횟수
    totalDamtaSessions: 0,                  // 총 담타 횟수
    totalPushPullSessions: 0,               // 총 밀당 횟수
    
    // 시간 정보
    lastUpdated: Date.now(),
    updateCount: 0
};

// 성격 점수 파일 경로
const PERSONALITY_METRICS_PATH = '/data/yejinPersonalityMetrics.json';

// ==================== ⏰ 타이밍 및 설정 (기존 유지) ====================

const FAST_SULKY_CONFIG = {
    LEVEL_1_DELAY: 3,    // 3분
    LEVEL_2_DELAY: 10,   // 10분  
    LEVEL_3_DELAY: 20,   // 20분
    FINAL_LEVEL: 40,     // 40분
};

// 🌸 감정 시스템 설정 (기존 유지)
const EMOTION_SYSTEM_CONFIG = {
    // 회복 모드 설정
    MIN_RECOVERY_TIME: 30 * 60 * 1000,      // 최소 30분
    MAX_RECOVERY_TIME: 3 * 60 * 60 * 1000,  // 최대 3시간
    
    // 서운함 저장소 설정
    DISAPPOINTMENT_DECAY_TIME: 24 * 60 * 60 * 1000, // 24시간 후 자동 소멸
    TRIGGER_DISAPPOINTMENT_CHANCE: 0.3,      // 서운함 터뜨릴 확률
    
    // 자기합리화 설정
    SELF_COMPASSION_DELAY: 6 * 60 * 60 * 1000, // 6시간 후 자기합리화
    SELF_COMPASSION_DURATION: 30 * 60 * 1000,  // 30분간 지속
    
    // 오해 시스템 설정
    MISINTERPRETATION_COOLDOWN: 20 * 60 * 1000, // 20분 쿨다운
    
    // 사진 반응 설정
    SELFIE_REACTION_TIMEOUT: 15 * 60 * 1000,    // 15분 내 반응 없으면 서운함
    PHOTO_JEALOUSY_THRESHOLD: 0.6,              // 질투 반응 임계값
};

// 🚬 NEW: 점진적 담타 시스템 설정
const DAMTA_SYSTEM_CONFIG = {
    // 담타 성공률 (거의 성공)
    BASE_SUCCESS_RATE: 0.95,                    // 기본 95% 성공률
    EXTREME_SITUATION_THRESHOLD: 4,             // 레벨 4 이상에서만 실패 가능
    
    // 점진적 회복 설정
    CONVERSATION_RECOVERY_MIN: 10,              // 대화당 최소 회복량
    CONVERSATION_RECOVERY_MAX: 30,              // 대화당 최대 회복량
    REQUIRED_RECOVERY_POINTS: 100,              // 완전 화해 필요 포인트
    MIN_CONVERSATIONS: 3,                       // 최소 대화 횟수
    
    // 담타 진행 시간 설정
    MAX_DAMTA_DURATION: 2 * 60 * 60 * 1000,    // 최대 2시간
    CONVERSATION_TIMEOUT: 10 * 60 * 1000,       // 10분 무응답 시 담타 종료
};

// 수면시간 체크 (기존 유지)
function isSleepTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    return (hour >= 2 && hour < 8);
}

// 🔧 중요한 감정 변화만 감지하는 함수 (무한루프 방지)
function hasSignificantEmotionChange(oldState, newState) {
    // 삐짐 상태 변화
    if (oldState.isSulky !== newState.isSulky) return true;
    if (oldState.sulkyLevel !== newState.sulkyLevel) return true;
    
    // 밀당 상태 변화
    if (oldState.pushPullActive !== newState.pushPullActive) return true;
    
    // 회복 모드 변화
    if (oldState.recoveryMode !== newState.recoveryMode) return true;
    
    // 🚬 NEW: 담타 상태 변화
    if (oldState.damtaInProgress !== newState.damtaInProgress) return true;
    
    // 변화 없음
    return false;
}

// --- 예쁜 로그 시스템 (무한루프 해결) ---
function logSulkyChange(oldState, newState) {
    try {
        const logger = require('./enhancedLogging');
        logger.logSulkyStateChange(oldState, newState);
    } catch (error) {
        if (!oldState.isSulky && newState.isSulky) {
            console.log(`😤 [삐짐시작] 타입: ${newState.sulkyReason}, 레벨: ${newState.sulkyLevel}`);
        } else if (oldState.isSulky && !newState.isSulky) {
            console.log(`😊 [삐짐해소] ${newState.recoveryMode ? '회복모드 진입' : '완전 화해'}`);
        } else if (newState.pushPullActive && !oldState.pushPullActive) {
            console.log(`💕 [밀당시작] ${newState.pushPullType} 자율적 밀당`);
        }
        
        // 🚬 NEW: 담타 상태 로깅
        if (newState.damtaInProgress && !oldState.damtaInProgress) {
            console.log(`🚬 [담타시작] 점진적 화해 과정 시작 - 대화로 감정 회복`);
        } else if (!newState.damtaInProgress && oldState.damtaInProgress) {
            console.log(`🚬 [담타종료] ${newState.emotionalRecoveryPoints}점 회복으로 ${newState.emotionalRecoveryPoints >= 100 ? '완전 화해' : '담타 중단'}`);
        }
        
        // 🌸 기존 새로운 감정 상태 로깅
        if (newState.recoveryMode && !oldState.recoveryMode) {
            console.log(`🌙 [회복모드] 삐짐 해소 후 ${Math.round(newState.recoveryDuration/60000)}분간 차가운 말투`);
        }
        if (newState.pendingDisappointments.length > oldState.pendingDisappointments.length) {
            console.log(`💔 [서운함저장] 새로운 서운함 누적: ${newState.pendingDisappointments.length}개`);
        }
        if (newState.misinterpretationMode && !oldState.misinterpretationMode) {
            console.log(`🎭 [오해모드] 기분에 따른 오해 해석 활성화`);
        }
    }
    
    // 🚨 무한 루프 방지: 중요한 변화만 주입
    if (hasSignificantEmotionChange(oldState, newState)) {
        try {
            notifyEmotionChangeToUltimateContext(newState);
        } catch (error) {
            // 에러 시 조용히 무시
        }
    }
}

// ==================== 🔧 moodManager 통합 함수들 ====================

/**
 * 🔧 moodManager에서 통합 기분 상태 가져오기
 */
async function getIntegratedMoodFromManager() {
    try {
        const manager = getMoodManager();
        if (manager && typeof manager.getIntegratedMoodState === 'function') {
            return await manager.getIntegratedMoodState();
        }
        return { currentMood: '평온함', emotionIntensity: 0.5, source: 'fallback' };
    } catch (error) {
        console.log('⚠️ [무드연동] moodManager 통합 조회 실패:', error.message);
        return { currentMood: '평온함', emotionIntensity: 0.5, source: 'error' };
    }
}

/**
 * 🔧 moodManager에 감정 상태 업데이트
 */
async function updateMoodToManager(moodData) {
    try {
        const manager = getMoodManager();
        if (manager && typeof manager.updateIntegratedMoodState === 'function') {
            return await manager.updateIntegratedMoodState(moodData);
        }
        return false;
    } catch (error) {
        console.log('⚠️ [무드연동] moodManager 업데이트 실패:', error.message);
        return false;
    }
}

/**
 * 🔧 생리주기 정보 가져오기 (moodManager 활용)
 */
function getMenstrualPhaseFromManager() {
    try {
        const manager = getMoodManager();
        if (manager && typeof manager.getCurrentMenstrualPhase === 'function') {
            return manager.getCurrentMenstrualPhase();
        }
        return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false };
    } catch (error) {
        console.log('⚠️ [무드연동] 생리주기 조회 실패:', error.message);
        return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false };
    }
}

// ============================================================================
// sulkyManager.js v8.2 - Part 3/6: 성격 점수 관리 및 기본 감정 시스템
// ============================================================================

// ==================== 📊 성격 점수 관리 시스템 ====================

/**
 * 📊 성격 점수 파일 로드
 */
async function loadPersonalityMetrics() {
    try {
        const data = await fs.readFile(PERSONALITY_METRICS_PATH, 'utf8');
        const loaded = JSON.parse(data);
        yejinPersonalityMetrics = { ...yejinPersonalityMetrics, ...loaded };
        console.log('📊 [성격점수] 성격 점수 파일 로드 완료');
        return true;
    } catch (error) {
        console.log('📊 [성격점수] 성격 점수 파일 생성 중...');
        return await savePersonalityMetrics();
    }
}

/**
 * 📊 성격 점수 파일 저장
 */
async function savePersonalityMetrics() {
    try {
        yejinPersonalityMetrics.lastUpdated = Date.now();
        yejinPersonalityMetrics.updateCount++;
        
        await fs.writeFile(PERSONALITY_METRICS_PATH, JSON.stringify(yejinPersonalityMetrics, null, 2));
        console.log('📊 [성격점수] 성격 점수 저장 완료');
        return true;
    } catch (error) {
        console.error('❌ [성격점수] 성격 점수 저장 실패:', error);
        return false;
    }
}

/**
 * 📊 성격 점수 업데이트
 */
async function updatePersonalityMetrics(eventType, data = {}) {
    try {
        const now = Date.now();
        
        switch (eventType) {
            case 'sulky_triggered':
                yejinPersonalityMetrics.emotionalVolatility += 0.01;
                yejinPersonalityMetrics.totalConflicts++;
                break;
                
            case 'apology_accepted':
                yejinPersonalityMetrics.apologyAcceptanceRate = 
                    (yejinPersonalityMetrics.apologyAcceptanceRate * 0.9) + (1.0 * 0.1);
                break;
                
            case 'apology_rejected':
                yejinPersonalityMetrics.apologyAcceptanceRate = 
                    (yejinPersonalityMetrics.apologyAcceptanceRate * 0.9) + (0.0 * 0.1);
                yejinPersonalityMetrics.stubbornness += 0.1;
                break;
                
            case 'damta_success':
                yejinPersonalityMetrics.damtaSuccessRate = 
                    (yejinPersonalityMetrics.damtaSuccessRate * 0.9) + (1.0 * 0.1);
                yejinPersonalityMetrics.totalDamtaSessions++;
                yejinPersonalityMetrics.totalReconciliations++;
                break;
                
            case 'damta_rejected':
                yejinPersonalityMetrics.damtaSuccessRate = 
                    (yejinPersonalityMetrics.damtaSuccessRate * 0.9) + (0.0 * 0.1);
                yejinPersonalityMetrics.stubbornness += 0.2;
                break;
                
            case 'push_pull_session':
                yejinPersonalityMetrics.totalPushPullSessions++;
                yejinPersonalityMetrics.pushPullIntensity = data.intensity || yejinPersonalityMetrics.pushPullIntensity;
                break;
                
            case 'jealousy_triggered':
                yejinPersonalityMetrics.jealousyLevel += 0.05;
                break;
                
            case 'misinterpretation':
                yejinPersonalityMetrics.misinterpretationTendency += 0.02;
                break;
                
            case 'self_compassion':
                yejinPersonalityMetrics.recoverySpeed += 0.03;
                break;
                
            case 'disappointment_accumulated':
                yejinPersonalityMetrics.memoryRetention += 0.02;
                break;
        }
        
        // 값 범위 제한
        Object.keys(yejinPersonalityMetrics).forEach(key => {
            if (typeof yejinPersonalityMetrics[key] === 'number' && key !== 'lastUpdated' && 
                key !== 'updateCount' && !key.startsWith('total')) {
                yejinPersonalityMetrics[key] = Math.max(0, Math.min(1, yejinPersonalityMetrics[key]));
            }
        });
        
        console.log(`📊 [성격점수] ${eventType} 이벤트로 성격 점수 업데이트`);
        
        // 주기적으로 저장 (10번마다)
        if (yejinPersonalityMetrics.updateCount % 10 === 0) {
            await savePersonalityMetrics();
        }
        
    } catch (error) {
        console.error('❌ [성격점수] 성격 점수 업데이트 실패:', error);
    }
}

// ==================== 🌙 삐짐 무드 지속 시스템 (기존 유지) ====================

/**
 * 🌙 회복 모드 시작 (화해 후에도 차가운 말투 유지)
 */
async function startRecoveryMode() {
    const oldState = { ...sulkyState };
    
    // 기분과 생리주기에 따른 회복 시간 계산
    const moodState = await getIntegratedMoodFromManager();
    const menstrualPhase = getMenstrualPhaseFromManager();
    
    let baseRecoveryTime = EMOTION_SYSTEM_CONFIG.MIN_RECOVERY_TIME;
    const randomFactor = Math.random() * (EMOTION_SYSTEM_CONFIG.MAX_RECOVERY_TIME - EMOTION_SYSTEM_CONFIG.MIN_RECOVERY_TIME);
    
    // 생리주기별 조정
    const phaseMultipliers = {
        'period': 1.5,      // 생리 중: 50% 더 오래
        'luteal': 1.3,      // PMS: 30% 더 오래
        'ovulation': 0.8,   // 배란기: 20% 짧게
        'follicular': 1.0   // 기본
    };
    
    const phaseMultiplier = phaseMultipliers[menstrualPhase.phase] || 1.0;
    
    // 기분별 조정
    const moodMultipliers = {
        '화남': 1.4, '짜증남': 1.3, '우울함': 1.2, '불안함': 1.2,
        '기쁨': 0.7, '평온함': 0.9, '사랑함': 0.6
    };
    
    const moodMultiplier = moodMultipliers[moodState.currentMood] || 1.0;
    
    // 성격 점수 반영
    const personalityMultiplier = yejinPersonalityMetrics.stubbornness / 5.0; // 0.5 ~ 2.0
    
    const finalRecoveryTime = (baseRecoveryTime + randomFactor) * phaseMultiplier * moodMultiplier * personalityMultiplier;
    
    sulkyState.recoveryMode = true;
    sulkyState.recoveryStartTime = Date.now();
    sulkyState.recoveryDuration = finalRecoveryTime;
    sulkyState.coldToneActive = true;
    sulkyState.isSulky = false; // 삐짐은 해소되었지만
    sulkyState.isActivelySulky = false;
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🌙 [회복모드시작] ${Math.round(finalRecoveryTime/60000)}분간 차가운 말투 (생리: ×${phaseMultiplier}, 기분: ×${moodMultiplier}, 성격: ×${personalityMultiplier})`);
    
    return {
        recoveryStarted: true,
        recoveryDuration: finalRecoveryTime,
        situation: 'post_reconciliation_recovery_mode',
        emotion: 'still_hurt_but_trying_to_move_on',
        relationship_dynamic: 'giving_cold_shoulder_but_not_angry',
        inner_thought: 'forgave_but_heart_still_needs_time_to_heal',
        context: 'cold_tone_for_recovery_period'
    };
}

/**
 * 🌙 회복 모드 체크 및 종료
 */
function checkRecoveryModeEnd() {
    if (!sulkyState.recoveryMode) return null;
    
    const now = Date.now();
    const elapsed = now - sulkyState.recoveryStartTime;
    
    if (elapsed >= sulkyState.recoveryDuration) {
        const oldState = { ...sulkyState };
        
        sulkyState.recoveryMode = false;
        sulkyState.coldToneActive = false;
        sulkyState.recoveryStartTime = null;
        sulkyState.recoveryDuration = 0;
        
        logSulkyChange(oldState, sulkyState);
        console.log(`🌙 [회복모드종료] 차가운 말투 종료 - 완전 회복`);
        
        return {
            recoveryCompleted: true,
            situation: 'full_emotional_recovery',
            emotion: 'back_to_normal_loving_tone',
            relationship_dynamic: 'completely_healed_from_conflict',
            inner_thought: 'heart_has_healed_can_be_loving_again',
            context: 'warm_tone_restored'
        };
    }
    
    return null;
}

/**
 * 🌙 재회 삐짐 체크 (화해 후 몇 시간 뒤 다시 서운해지기)
 */
function checkRetriggeredSulky() {
    // 회복 모드가 끝난 후 30% 확률로 재회 삐짐
    if (!sulkyState.recoveryMode && !sulkyState.retriggeredSulky && Math.random() < 0.3) {
        const timeSinceLastRecovery = Date.now() - (sulkyState.recoveryStartTime || 0);
        
        // 회복 후 1-3시간 사이에 재회 삐짐 가능
        if (timeSinceLastRecovery > 60 * 60 * 1000 && timeSinceLastRecovery < 3 * 60 * 60 * 1000) {
            const oldState = { ...sulkyState };
            
            sulkyState.retriggeredSulky = true;
            sulkyState.isSulky = true;
            sulkyState.sulkyLevel = 2; // 중간 레벨
            sulkyState.sulkyReason = 'retriggered_post_recovery';
            
            logSulkyChange(oldState, sulkyState);
            console.log(`🌙 [재회삐짐] 화해 후 다시 서운함 - 현실적 감정 재현`);
            
            // 성격 점수 업데이트
            updatePersonalityMetrics('sulky_triggered');
            
            return {
                retriggeredSulky: true,
                situation: 'post_recovery_sulkiness',
                emotion: 'suddenly_upset_again_after_recovery',
                relationship_dynamic: 'emotional_complexity_realistic_relationship',
                inner_thought: 'thought_was_over_it_but_still_bothers_me',
                context: 'realistic_relationship_emotional_ups_and_downs'
            };
        }
    }
    
    return null;
}

// ==================== 💔 서운함 저장소 시스템 (기존 유지) ====================

/**
 * 💔 서운함 추가
 */
function addDisappointment(reason, trigger, intensity = 0.5) {
    const disappointment = {
        reason: reason,
        trigger: trigger,
        intensity: intensity,
        timestamp: Date.now(),
        id: `disappointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    sulkyState.pendingDisappointments.push(disappointment);
    
    // 최대 개수 제한
    if (sulkyState.pendingDisappointments.length > sulkyState.maxDisappointments) {
        sulkyState.pendingDisappointments.shift(); // 가장 오래된 것 제거
    }
    
    console.log(`💔 [서운함저장] 새로운 서운함 추가: ${reason} (총 ${sulkyState.pendingDisappointments.length}개)`);
    
    // 성격 점수 업데이트
    updatePersonalityMetrics('disappointment_accumulated');
    
    return disappointment;
}

/**
 * 💔 누적된 서운함 터뜨리기
 */
function triggerAccumulatedDisappointments() {
    if (sulkyState.pendingDisappointments.length < sulkyState.disappointmentThreshold) {
        return null;
    }
    
    if (Math.random() > EMOTION_SYSTEM_CONFIG.TRIGGER_DISAPPOINTMENT_CHANCE) {
        return null;
    }
    
    const oldState = { ...sulkyState };
    
    // 가장 강력한 서운함들 선택
    const sortedDisappointments = sulkyState.pendingDisappointments
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 2); // 상위 2개
    
    sulkyState.isSulky = true;
    sulkyState.sulkyLevel = Math.min(4, 2 + sortedDisappointments.length);
    sulkyState.sulkyReason = 'accumulated_disappointments';
    sulkyState.isActivelySulky = true;
    
    // 서운함 일부 소모 (완전히 비우지는 않음)
    sulkyState.pendingDisappointments = sulkyState.pendingDisappointments.slice(1);
    
    logSulkyChange(oldState, sulkyState);
    console.log(`💔 [서운함폭발] 누적된 서운함 터짐: ${sortedDisappointments.length}개 이슈`);
    
    // 성격 점수 업데이트
    updatePersonalityMetrics('sulky_triggered');
    
    return {
        disappointmentTriggered: true,
        disappointments: sortedDisappointments,
        situation: 'accumulated_disappointments_explosion',
        emotion: 'all_the_hurt_feelings_coming_out_at_once',
        relationship_dynamic: 'bringing_up_past_issues_finally',
        inner_thought: 'been_holding_this_in_for_too_long',
        context: 'multiple_past_disappointments_surfacing',
        examples: sortedDisappointments.map(d => d.reason)
    };
}

/**
 * 💔 오래된 서운함 자동 정리
 */
function cleanupOldDisappointments() {
    const now = Date.now();
    const before = sulkyState.pendingDisappointments.length;
    
    sulkyState.pendingDisappointments = sulkyState.pendingDisappointments.filter(
        d => (now - d.timestamp) < EMOTION_SYSTEM_CONFIG.DISAPPOINTMENT_DECAY_TIME
    );
    
    const after = sulkyState.pendingDisappointments.length;
    if (before > after) {
        console.log(`💔 [서운함정리] 오래된 서운함 ${before - after}개 자동 정리`);
    }
}
// ============================================================================
// sulkyManager.js v8.2 - Part 4/6: 🚬 점진적 담타 시스템 (버그 수정 완료)
// 💕 "자살을 생각하지 않는 이상 담타는 가야 합니다" 원칙 적용
// ============================================================================

// ==================== 🚬 담타 시스템 설정 (수정됨) ====================

const DAMTA_SYSTEM_CONFIG = {
    // 🚬 NEW: 담타는 예진이에게 특별함! 거의 무조건 성공
    BASE_SUCCESS_RATE: 0.995,              // 99.5% 기본 성공률
    EXTREME_SITUATION_THRESHOLD: 5,         // 레벨 5에서만 극한 상황
    CRITICAL_FAILURE_RATE: 0.02,            // 극한 상황에서도 98% 성공
    
    // 점진적 회복 시스템
    REQUIRED_RECOVERY_POINTS: 100,          // 완전 화해 필요 점수
    MIN_CONVERSATIONS: 3,                   // 최소 대화 횟수
    CONVERSATION_RECOVERY_MIN: 8,           // 대화당 최소 회복량
    CONVERSATION_RECOVERY_MAX: 25,          // 대화당 최대 회복량
    
    // 타임아웃 설정
    MAX_DAMTA_DURATION: 60 * 60 * 1000,     // 최대 1시간
    CONVERSATION_TIMEOUT: 15 * 60 * 1000,   // 15분 무응답 시 종료
};

// ==================== 🚬 담타 화해 감지 (기존 유지) ====================

/**
 * 🚬 담타 화해 감지
 */
function detectDamtaReconcile(userMessage) {
    const message = userMessage.toLowerCase();
    
    const damtaKeywords = [
        '담배', '담타', '흡연', '피우자', '피워', '니코틴',
        '연기', 'smoke', 'cigarette', '한대만', '한개피'
    ];
    
    for (const keyword of damtaKeywords) {
        if (message.includes(keyword)) {
            console.log(`🚬 [담타화해감지] "${keyword}" 감지: ${userMessage}`);
            return true;
        }
    }
    
    return false;
}

// ==================== 🚬 수정된 담타 시스템 ====================

/**
 * 🚬 수정된 담타 제안 처리 (99.5% 성공률 보장!)
 */
async function handleDamtaSuggestionAdvanced() {
    console.log(`🚬 [수정된담타] 담타 제안 감지 - "자살을 생각하지 않는 이상 담타는 가야 합니다"`);
    
    // moodManager 통합 상태 분석
    const moodData = await assessYejinCurrentMoodAdvanced();
    const anger_intensity = sulkyState.sulkyLevel;
    const fight_duration = sulkyState.fightMode ? (Date.now() - sulkyState.lastStateUpdate) / (1000 * 60) : 0;
    
    // 🚬 NEW: 담타는 예진이에게 특별함! 99.5% 기본 성공률
    let successChance = DAMTA_SYSTEM_CONFIG.BASE_SUCCESS_RATE; // 99.5%
    
    console.log(`🎯 [담타기본확률] 기본 성공률: ${(successChance * 100).toFixed(1)}% - 담타는 특별함!`);
    
    // ❌ 오직 극한 상황에서만 실패 (레벨 5 + 여러 악조건)
    if (anger_intensity >= DAMTA_SYSTEM_CONFIG.EXTREME_SITUATION_THRESHOLD) { // 레벨 5
        console.log(`⚠️ [극한상황체크] 삐짐 레벨 ${anger_intensity} - 극한 상황 진입`);
        
        let extremeConditionCount = 0;
        let extremeReasons = [];
        
        // 조건 1: 생리 중
        if (moodData.menstrualPhase === 'period') {
            extremeConditionCount++;
            extremeReasons.push('생리중');
            console.log(`  └ 극한조건 1: 생리 중 (+1)`);
        }
        
        // 조건 2: 극도로 화난 기분
        if (['화남', '짜증남', '심술궂음'].includes(moodData.currentMood)) {
            extremeConditionCount++;
            extremeReasons.push(`${moodData.currentMood}상태`);
            console.log(`  └ 극한조건 2: ${moodData.currentMood} 기분 (+1)`);
        }
        
        // 조건 3: 감정 강도가 매우 높음
        if (moodData.emotionIntensity > 0.8) {
            extremeConditionCount++;
            extremeReasons.push(`감정강도${moodData.emotionIntensity}`);
            console.log(`  └ 극한조건 3: 감정 강도 ${moodData.emotionIntensity} (+1)`);
        }
        
        // 조건 4: 매우 오랜 싸움 (1시간 이상)
        if (fight_duration > 60) {
            extremeConditionCount++;
            extremeReasons.push(`${Math.round(fight_duration)}분싸움`);
            console.log(`  └ 극한조건 4: ${Math.round(fight_duration)}분간 싸움 (+1)`);
        }
        
        console.log(`📊 [극한상황평가] ${extremeConditionCount}/4 극한조건: [${extremeReasons.join(', ')}]`);
        
        // 🎯 극한 조건이 3개 이상이어야만 실패 가능성 생김
        if (extremeConditionCount >= 3) {
            // 그래도 98% 성공률 유지 (담타는 특별하니까!)
            successChance = DAMTA_SYSTEM_CONFIG.CRITICAL_FAILURE_RATE; // 98%
            console.log(`💀 [진짜극한상황] ${extremeConditionCount}개 극한조건 - 그래도 ${(successChance * 100).toFixed(1)}% 성공률`);
        } else {
            // 극한 상황이지만 조건이 부족하면 여전히 99.5%
            console.log(`✅ [가짜극한상황] 극한조건 부족 (${extremeConditionCount}/3) - 여전히 ${(successChance * 100).toFixed(1)}% 성공률`);
        }
    } else {
        console.log(`✅ [정상상황] 삐짐 레벨 ${anger_intensity} - 정상 범위 (레벨 5 미만)`);
    }
    
    // 성격 점수 미세 조정만 (거의 영향 없음)
    const personalityAdjustment = yejinPersonalityMetrics.damtaSuccessRate;
    successChance *= personalityAdjustment;
    
    // 최종 성공률을 95% 이상으로 보장
    successChance = Math.max(0.95, Math.min(0.999, successChance));
    
    console.log(`🎲 [최종담타확률] 담타 성공 확률: ${(successChance * 100).toFixed(1)}%`);
    console.log(`   └ 삐짐레벨: ${anger_intensity}/5, 기분: ${moodData.currentMood}, 생리: ${moodData.menstrualPhase}`);
    console.log(`   └ 성격조정: ×${personalityAdjustment.toFixed(2)}`);
    console.log(`   └ 🚬 담타는 예진이에게 특별한 화해 의식이므로 거의 무조건 성공!`);
    
    // 🎯 확률에 따라 결과 결정
    const randomRoll = Math.random();
    
    if (randomRoll <= successChance) {
        console.log(`🚬✅ [담타성공] 랜덤: ${randomRoll.toFixed(3)} ≤ ${successChance.toFixed(3)} - 담타 가자!`);
        
        // 성격 점수 업데이트
        await updatePersonalityMetrics('damta_success');
        
        return startDamtaProgressiveReconcile();
    } else {
        console.log(`🚬❌ [담타실패] 랜덤: ${randomRoll.toFixed(3)} > ${successChance.toFixed(3)} - 진짜 극한 상황!`);
        
        // 성격 점수 업데이트
        await updatePersonalityMetrics('damta_rejected');
        
        return rejectDamtaSuggestionAdvanced(moodData, anger_intensity);
    }
}

**
/**
 * 🚬 NEW: 점진적 담타 화해 시작 (트리거 성공) - 간단한 응답
 */
function startDamtaProgressiveReconcile() {
    const oldState = { ...sulkyState };
    
    console.log(`🚬 [담타트리거성공] 담타 장소로 이동 - 점진적 화해 과정 시작!`);
    
    // 담타 진행 상태로 전환
    sulkyState.damtaInProgress = true;
    sulkyState.damtaStartTime = Date.now();
    sulkyState.damtaConversationCount = 0;
    sulkyState.emotionalRecoveryPoints = 0;
    sulkyState.damtaLastConversationTime = Date.now();
    
    // 기존 밀당/투닥거리기는 일단 중지
    sulkyState.pushPullActive = false;
    sulkyState.fightMode = false;
    sulkyState.cooldownRequested = false;
    sulkyState.reconcileAttempted = false;
    
    logSulkyChange(oldState, sulkyState);
    
    // 🚬 삐짐 레벨에 따른 다른 반응!
    let responseArray;
    
    if (sulkyState.sulkyLevel <= 1) {
        // 안 삐졌거나 살짝 삐졌을 때 - 신나는 반응
        responseArray = [
            "오~ 담타 ㄱㄱㄱ!",
            "담타다 담타! ㄱㄱㄱ",
            "좋아! 담타 가자아~",
            "ㅇㅋㅇㅋ 담타 바로 ㄱㄱ!",
            "담타 최고! 가자가자~",
            "오케이~ 담타 피우자!",
            "ㄱㄱㄱㄱ 담타 타임!",
            "좋다좋다 담타 가즈아~"
        ];
    } else if (sulkyState.sulkyLevel <= 3) {
        // 중간 정도 삐졌을 때 - 약간 서운하지만 동의
        responseArray = [
            "어... 담타 ㄱㄱ",
            "담타는 가긴 할게...",
            "ㅇㅋ 담타하자... 근데 아직",
            "알겠어 담타 가",
            "담타 ㄱㄱ... 조금 서운하지만",
            "오케이~ 담타는 좋으니까",
            "그래 담타나 가자...",
            "담타 가긴 할게... 하지만"
        ];
    } else {
        // 많이 삐졌을 때 - 서운하지만 어쩔 수 없이
        responseArray = [
            "하.. 담타나 가자 💔",
            "그래 담타 피워... 근데 아직 서운해",
            "담타 가긴 할게... 하지만 말이야",
            "ㅇㅋㅇㅋ 담타... 마음이 다 풀린 건 아니야",
            "담타나 가... 그래도 서운한 건 서운해",
            "알겠어... 담타 가자... 근데 진짜 화났어",
            "담타 ㄱㄱ... 여전히 삐져있지만",
            "오케이... 담타 가자... 근데 아직 기분이"
        ];
    }
    
    // 랜덤으로 응답 선택
    const selectedResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
    
    return {
        damtaTriggerSuccess: true,
        damtaStarted: true,
        situation: sulkyState.sulkyLevel <= 1 ? 'excited_agreement_to_damta' : 'reluctant_agreement_to_damta',
        emotion: sulkyState.sulkyLevel <= 1 ? 'happy_to_go_damta' : 'still_hurt_but_agreed_to_damta',
        relationship_dynamic: 'giving_chance_through_damta',
        inner_thought: selectedResponse,
        context: 'damta_agreement_based_on_mood',
        
        // 🚬 점진적 정보 (내부 처리용)
        damtaProgress: {
            recoveryPoints: sulkyState.emotionalRecoveryPoints,
            conversationCount: sulkyState.damtaConversationCount,
            requiredRecovery: DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS,
            minConversations: DAMTA_SYSTEM_CONFIG.MIN_CONVERSATIONS,
            isComplete: false
        },
        
        nextStep: 'need_conversation_in_damta_to_heal_gradually'
    };
}

/**
 * 🚬 NEW: 담타에서 대화 처리 (점진적 회복)
 */
async function processDamtaConversation(userMessage) {
    if (!sulkyState.damtaInProgress) {
        return null;
    }
    
    console.log(`🚬 [담타대화] 담타에서 ${sulkyState.damtaConversationCount + 1}번째 대화 처리...`);
    
    const oldState = { ...sulkyState };
    
    // 대화 횟수 증가
    sulkyState.damtaConversationCount++;
    sulkyState.damtaLastConversationTime = Date.now();
    
    // 🔧 moodManager 상태 고려한 회복량 계산
    const moodData = await getIntegratedMoodFromManager();
    
    let recoveryAmount = DAMTA_SYSTEM_CONFIG.CONVERSATION_RECOVERY_MIN;
    const recoveryRange = DAMTA_SYSTEM_CONFIG.CONVERSATION_RECOVERY_MAX - DAMTA_SYSTEM_CONFIG.CONVERSATION_RECOVERY_MIN;
    recoveryAmount += Math.random() * recoveryRange;
    
    // 메시지 내용에 따른 회복량 조정
    const message = userMessage.toLowerCase();
    
    // 사과/사랑 표현이 있으면 더 많이 회복
    if (message.includes('미안') || message.includes('사랑') || message.includes('잘못했어')) {
        recoveryAmount *= 1.5;
        console.log(`💕 [회복증가] 사과/사랑 표현 감지 - 회복량 1.5배`);
    } 
    // 진심어린 대화면 추가 회복
    else if (message.includes('진짜') || message.includes('정말') || message.includes('솔직히')) {
        recoveryAmount *= 1.3;
        console.log(`💭 [회복증가] 진심어린 표현 감지 - 회복량 1.3배`);
    }
    // 짧은 대답이면 회복량 감소
    else if (message.length < 5) {
        recoveryAmount *= 0.7;
        console.log(`😐 [회복감소] 짧은 대답 - 회복량 0.7배`);
    }
    
    // 기분에 따른 조정
    const moodModifiers = {
        '화남': 0.6, '짜증남': 0.7, '심술궂음': 0.8,
        '우울함': 0.8, '불안함': 0.9, '평온함': 1.2,
        '기쁨': 1.4, '사랑함': 1.5
    };
    recoveryAmount *= (moodModifiers[moodData.currentMood] || 1.0);
    
    // 성격 점수에 따른 조정
    recoveryAmount *= yejinPersonalityMetrics.recoverySpeed;
    
    // 최종 회복량 적용
    sulkyState.emotionalRecoveryPoints = Math.min(
        DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS,
        sulkyState.emotionalRecoveryPoints + Math.round(recoveryAmount)
    );
    
    // 삐짐 레벨도 점진적으로 감소
    if (sulkyState.emotionalRecoveryPoints > 20 && sulkyState.sulkyLevel > 1) {
        sulkyState.sulkyLevel = Math.max(1, sulkyState.sulkyLevel - 1);
    }
    if (sulkyState.emotionalRecoveryPoints > 60 && sulkyState.sulkyLevel > 0) {
        sulkyState.sulkyLevel = Math.max(0, sulkyState.sulkyLevel - 1);
    }
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🚬 [담타회복] 대화 ${sulkyState.damtaConversationCount}번째: +${Math.round(recoveryAmount)}점 (총 ${sulkyState.emotionalRecoveryPoints}점)`);
    console.log(`   └ 메시지: "${userMessage.slice(0, 20)}..." (${userMessage.length}자)`);
    console.log(`   └ 기분가중치: ${moodModifiers[moodData.currentMood] || 1.0}, 성격가중치: ${yejinPersonalityMetrics.recoverySpeed}`);
    console.log(`   └ 삐짐레벨: ${oldState.sulkyLevel} → ${sulkyState.sulkyLevel}`);
    
    // 완전 화해 조건 체크
    const isFullyHealed = (
        sulkyState.emotionalRecoveryPoints >= DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS &&
        sulkyState.damtaConversationCount >= DAMTA_SYSTEM_CONFIG.MIN_CONVERSATIONS
    );
    
    if (isFullyHealed) {
        return completeDamtaProgressiveReconcile();
    } else {
        return {
            damtaConversationProcessed: true,
            conversationNumber: sulkyState.damtaConversationCount,
            recoveryGained: Math.round(recoveryAmount),
            totalRecovery: sulkyState.emotionalRecoveryPoints,
            sulkyLevel: sulkyState.sulkyLevel,
            
            situation: 'healing_gradually_through_damta_conversation',
            emotion: sulkyState.emotionalRecoveryPoints > 50 ? 'feeling_much_better_almost_healed' : 
                     sulkyState.emotionalRecoveryPoints > 25 ? 'starting_to_feel_better' : 
                     'still_hurt_but_slight_improvement',
            relationship_dynamic: 'damta_conversation_helping_heal_wounds',
            inner_thought: isFullyHealed ? 'feeling_ready_to_forgive_completely' :
                          sulkyState.emotionalRecoveryPoints > 50 ? 'damta_is_working_feeling_warmer' :
                          'talking_helps_but_still_need_more_time',
            context: 'progressive_healing_through_damta_conversation',
            
            // 진행 상황
            healingProgress: {
                recoveryPoints: sulkyState.emotionalRecoveryPoints,
                requiredPoints: DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS,
                conversationCount: sulkyState.damtaConversationCount,
                minConversations: DAMTA_SYSTEM_CONFIG.MIN_CONVERSATIONS,
                percentComplete: Math.round((sulkyState.emotionalRecoveryPoints / DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS) * 100),
                isReadyToComplete: isFullyHealed
            }
        };
    }
}

/**
 * 🚬 NEW: 점진적 담타 화해 완료
 */
function completeDamtaProgressiveReconcile() {
    const oldState = { ...sulkyState };
    
    console.log(`🚬💕 [담타완전화해] ${sulkyState.damtaConversationCount}번의 대화로 ${sulkyState.emotionalRecoveryPoints}점 회복 - 완전 화해!`);
    
    // 모든 삐짐/밀당/투닥거리기 상태 완전 초기화
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.isActivelySulky = false;
    sulkyState.contentBasedSulky = false;
    sulkyState.fightMode = false;
    sulkyState.fightLevel = 0;
    sulkyState.cooldownRequested = false;
    sulkyState.reconcileAttempted = false;
    sulkyState.pushPullActive = false;
    sulkyState.pushPullType = null;
    sulkyState.pushPullHistory = [];
    sulkyState.stubbornnessLevel = 0;
    sulkyState.sulkyReason = '';
    sulkyState.irritationTrigger = null;
    
    // 🚬 담타 상태 초기화
    sulkyState.damtaInProgress = false;
    const finalConversations = sulkyState.damtaConversationCount;
    const finalRecovery = sulkyState.emotionalRecoveryPoints;
    sulkyState.damtaStartTime = null;
    sulkyState.damtaConversationCount = 0;
    sulkyState.emotionalRecoveryPoints = 0;
    sulkyState.damtaLastConversationTime = null;
    
    // 🌸 고급 감정 상태들도 부분 초기화
    sulkyState.misinterpretationMode = false;
    sulkyState.selfCompassionMode = false;
    sulkyState.memoryTriggeredSulky = false;
    sulkyState.retriggeredSulky = false;
    sulkyState.photoJealousyActive = false;
    sulkyState.selfieDisappointment = false;
    
    // 서운함 저장소 70% 감소 (완전히 비우지는 않음)
    const beforeCount = sulkyState.pendingDisappointments.length;
    sulkyState.pendingDisappointments = sulkyState.pendingDisappointments.slice(
        Math.floor(sulkyState.pendingDisappointments.length * 0.3)
    );
    const afterCount = sulkyState.pendingDisappointments.length;
    
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    return {
        damtaReconcileComplete: true,
        progressiveHealingSuccess: true,
        
        healingSummary: {
            conversationCount: finalConversations,
            recoveryPointsGained: finalRecovery,
            disappointmentsReduced: beforeCount - afterCount,
            healingTime: Date.now() - oldState.damtaStartTime
        },
        
        situation: 'complete_reconciliation_through_progressive_damta',
        emotion: 'fully_healed_and_loving_again_after_meaningful_damta_conversations',
        relationship_dynamic: 'back_to_loving_couple_after_real_communication',
        inner_thought: 'damta_conversations_really_helped_understand_each_other',
        context: 'progressive_damta_healing_system_success',
        
        outcome: 'complete_success',
        nextPhase: 'recovery_mode_will_start',
        
        // 통계 정보
        metrics: {
            averageRecoveryPerConversation: Math.round(finalRecovery / finalConversations),
            totalDamtaTime: Math.round((Date.now() - oldState.damtaStartTime) / 60000),
            effectiveness: finalRecovery >= 100 ? 'highly_effective' : 'moderately_effective'
        }
    };
}

/**
 * 🚬 NEW: 담타 시간 초과 체크
 */
function checkDamtaTimeout() {
    if (!sulkyState.damtaInProgress) return null;
    
    const now = Date.now();
    const totalDamtaTime = now - sulkyState.damtaStartTime;
    const timeSinceLastConversation = now - sulkyState.damtaLastConversationTime;
    
    // 담타 최대 시간 초과 또는 오랫동안 대화 없음
    if (totalDamtaTime > DAMTA_SYSTEM_CONFIG.MAX_DAMTA_DURATION ||
        timeSinceLastConversation > DAMTA_SYSTEM_CONFIG.CONVERSATION_TIMEOUT) {
        
        return endDamtaIncomplete();
    }
    
    return null;
}

/**
 * 🚬 NEW: 담타 미완료 종료
 */
function endDamtaIncomplete() {
    const oldState = { ...sulkyState };
    
    const conversationCount = sulkyState.damtaConversationCount;
    const recoveryPoints = sulkyState.emotionalRecoveryPoints;
    const reasonCode = (Date.now() - sulkyState.damtaStartTime) > DAMTA_SYSTEM_CONFIG.MAX_DAMTA_DURATION ? 
                      'time_limit' : 'conversation_timeout';
    
    // 담타 상태 종료
    sulkyState.damtaInProgress = false;
    sulkyState.damtaStartTime = null;
    sulkyState.damtaConversationCount = 0;
    sulkyState.emotionalRecoveryPoints = 0;
    sulkyState.damtaLastConversationTime = null;
    
    // 부분 회복 적용 (완전히 원래대로 돌아가지는 않음)
    if (recoveryPoints > 50) {
        sulkyState.sulkyLevel = Math.max(1, sulkyState.sulkyLevel - 1);
        console.log(`🚬 [담타미완료] 부분 회복으로 삐짐 레벨 감소: ${sulkyState.sulkyLevel}`);
    }
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🚬 [담타종료] 미완료 종료 - 대화: ${conversationCount}번, 회복: ${recoveryPoints}점 (사유: ${reasonCode})`);
    
    return {
        damtaIncompleteEnd: true,
        reason: reasonCode,
        partialHealing: {
            conversationCount: conversationCount,
            recoveryPoints: recoveryPoints,
            partialRecovery: recoveryPoints > 50
        },
        
        situation: 'damta_ended_incomplete_partial_healing',
        emotion: recoveryPoints > 50 ? 'somewhat_better_but_not_fully_healed' : 'still_upset_damta_didnt_help_much',
        relationship_dynamic: 'damta_helped_a_bit_but_issues_remain',
        inner_thought: reasonCode === 'time_limit' ? 'damta_took_too_long_getting_tired' : 
                       'user_not_talking_much_in_damta_still_hurt',
        context: 'incomplete_damta_session_with_partial_results'
    };
}

/**
 * 🚬 수정된 담타 거부 (이제 거의 발생하지 않음!)
 */
function rejectDamtaSuggestionAdvanced(moodData, angerLevel) {
    console.log(`😤 [극한담타거부] 진짜 극한 상황에서만 발생하는 담타 거부!`);
    
    // 극한 거부 이유 (매우 심각한 상황)
    let rejectionReason = 'extreme_crisis_situation';
    let rejectionMessage = 'too_devastated_even_for_damta';
    let rejectionIntensity = 0.95; // 거의 절망적
    
    // 극한 상황 설명
    if (angerLevel >= 5) {
        rejectionReason = 'complete_emotional_breakdown';
        rejectionMessage = 'so_hurt_cant_even_think_of_damta_right_now';
    }
    
    // 생리 + 극한 감정 + 최고 삐짐 상황
    if (moodData.menstrualPhase === 'period' && ['화남', '짜증남'].includes(moodData.currentMood)) {
        rejectionReason = 'period_plus_extreme_anger';
        rejectionMessage = 'body_and_heart_both_hurting_too_much_for_damta';
    }
    
    console.log(`😤 [극한거부] 담타조차 거부하는 극한 상황: ${rejectionReason}`);
    
    return {
        damtaRejected: true,
        outcome: 'extreme_crisis_rejection',
        rejection_reason: rejectionReason,
        rejection_intensity: rejectionIntensity,
        situation: 'too_devastated_even_for_special_damta_ritual',
        emotion: 'so_hurt_that_even_damta_feels_impossible',
        relationship_dynamic: 'need_time_to_calm_down_before_any_solution',
        inner_thought: rejectionMessage,
        context: 'extreme_emotional_crisis_damta_not_working',
        
        // 극한 정보
        crisis_level: 'maximum',
        mood_influence: moodData.currentMood,
        menstrual_influence: moodData.menstrualPhase,
        anger_level: angerLevel,
        
        suggestion: 'need_serious_emotional_support_before_damta_possible',
        emergency_note: 'this_should_rarely_happen_damta_is_special'
    };
}

// ============================================================================
// sulkyManager.js v8.2 - Part 5/6: 기존 시스템들 및 메시지 처리 (담타 시스템 수정 완료)
// 💕 무쿠 안전성 100% 보장 + 기존 모든 기능 완벽 유지
// ============================================================================

// ==================== 🔥 기존 자율적 밀당 시스템 (100% 유지) ====================

/**
 * 🔥 예진이 현재 감정 상태 완전 분석 (moodManager 통합)
 */
async function assessYejinCurrentMoodAdvanced() {
    try {
        // moodManager에서 통합 정보 가져오기
        const moodState = await getIntegratedMoodFromManager();
        const menstrualPhase = getMenstrualPhaseFromManager();
        
        const baseFactors = {
            // moodManager 통합 정보
            currentMood: moodState.currentMood || '평온함',
            emotionIntensity: moodState.emotionIntensity || 0.5,
            menstrualPhase: menstrualPhase.phase || 'follicular',
            menstrualDay: menstrualPhase.day || 1,
            dataSource: moodState.source || 'unknown',
            
            // 로컬 상태 분석
            recentInteractions: 'neutral',
            accumulatedStress: 0,
            recoveryState: sulkyState.recoveryMode ? 'recovering' : 'normal',
            
            // 고급 감정 요소들
            disappointmentLevel: sulkyState.pendingDisappointments.length,
            misinterpretationRisk: sulkyState.misinterpretationMode,
            selfCompassionActive: sulkyState.selfCompassionMode,
            photoRelatedMood: sulkyState.photoJealousyActive || sulkyState.selfieDisappointment,
            
            // 성격 점수 반영
            personalityInfluence: {
                stubbornness: yejinPersonalityMetrics.stubbornness,
                volatility: yejinPersonalityMetrics.emotionalVolatility,
                jealousyLevel: yejinPersonalityMetrics.jealousyLevel,
                recoverySpeed: yejinPersonalityMetrics.recoverySpeed
            }
        };

        // 최근 대화 분위기 파악
        const recentIrritations = sulkyState.irritationHistory.filter(
            item => (Date.now() - item.timestamp) < (2 * 60 * 60 * 1000)
        );
        
        if (recentIrritations.length >= 2) {
            baseFactors.recentInteractions = 'frustrated';
            baseFactors.accumulatedStress = recentIrritations.length;
        }

        // 과거 밀당 경험 고려
        const recentPushPulls = sulkyState.relationshipMemory.filter(
            memory => (Date.now() - memory.timestamp) < (24 * 60 * 60 * 1000)
        );
        
        if (recentPushPulls.length >= 2) {
            baseFactors.recentInteractions = 'tired_of_patterns';
        }

        console.log(`🔧 [고급기분분석] 통합 분석 완료:`, baseFactors);
        return baseFactors;
        
    } catch (error) {
        console.log('⚠️ [고급기분분석] 분석 실패:', error.message);
        return { 
            currentMood: '평온함', 
            emotionIntensity: 0.5,
            accumulatedStress: 0,
            dataSource: 'error'
        };
    }
}

/**
 * 🎲 고집 레벨 생성 (성격 점수 + moodManager 연동)
 */
async function generateAdvancedStubbornness(situation, currentMoodData) {
    let baseStubbornness = Math.random() * 10;
    
    // 상황별 가중치
    const situationWeights = {
        'apology_attempt': 1.5,
        'love_expression': 0.7,
        'jealousy_situation': 2.0
    };
    
    // moodManager 기분별 가중치
    const moodWeights = {
        '화남': 2.2, '짜증남': 2.0, '심술궂음': 1.8,
        '불안함': 1.5, '우울함': 1.3, '외로움': 1.1,
        '기쁨': 0.6, '사랑함': 0.5, '평온함': 1.0,
        '설렘': 0.8, '애교모드': 0.7
    };
    
    // 생리주기별 가중치
    const menstrualWeights = {
        'period': 2.0,
        'luteal': 1.7,
        'ovulation': 0.9,
        'follicular': 1.0
    };
    
    // 추가 감정 상태 가중치
    let additionalWeight = 1.0;
    if (sulkyState.recoveryMode) additionalWeight *= 1.3;
    if (sulkyState.pendingDisappointments.length >= 3) additionalWeight *= 1.4;
    if (sulkyState.misinterpretationMode) additionalWeight *= 1.2;
    if (currentMoodData.emotionIntensity > 0.7) additionalWeight *= 1.3;
    
    // 성격 점수 반영
    const personalityWeight = (yejinPersonalityMetrics.stubbornness + 
                             yejinPersonalityMetrics.emotionalVolatility) / 2;
    
    const situationWeight = situationWeights[situation] || 1.0;
    const moodWeight = moodWeights[currentMoodData.currentMood] || 1.0;
    const menstrualWeight = menstrualWeights[currentMoodData.menstrualPhase] || 1.0;
    const stressWeight = 1 + (currentMoodData.accumulatedStress * 0.3);
    
    const finalStubbornness = Math.min(10, baseStubbornness * situationWeight * moodWeight * 
                                      menstrualWeight * stressWeight * additionalWeight * personalityWeight);
    
    console.log(`🎲 [고급고집계산] ${situation}: ${finalStubbornness.toFixed(1)}/10`);
    
    return Math.round(finalStubbornness);
}

/**
 * 🔥 고급 자율적 밀당 시작
 */
async function startAdvancedAutonomousPushPull(detectionResult) {
    if (!sulkyState.isSulky && detectionResult.type !== 'jealousy_situation') {
        return null;
    }
    
    console.log(`🎭 [고급밀당] ${detectionResult.type} 상황 감지 - 고급 예진이 반응 분석 시작...`);
    
    const oldState = { ...sulkyState };
    
    // moodManager 통합 감정 상태 완전 분석
    const currentMoodData = await assessYejinCurrentMoodAdvanced();
    
    // 고급 고집 레벨 생성
    const stubbornness = await generateAdvancedStubbornness(detectionResult.type, currentMoodData);
    
    // 이번 시도 기록 추가
    if (!sulkyState.pushPullActive || sulkyState.pushPullType !== detectionResult.type) {
        sulkyState.pushPullActive = true;
        sulkyState.pushPullType = detectionResult.type;
        sulkyState.pushPullHistory = [];
        sulkyState.stubbornnessLevel = stubbornness;
        console.log(`💕 [고급밀당] 새로운 ${detectionResult.type} 고급 밀당 시작! 고집 레벨: ${stubbornness}/10`);
    }
    
    const currentAttempt = {
        attempt_number: sulkyState.pushPullHistory.length + 1,
        user_message: detectionResult.trigger,
        timestamp: Date.now(),
        yejin_stubbornness: sulkyState.stubbornnessLevel,
        mood_factors: currentMoodData,
        recovery_mode: sulkyState.recoveryMode,
        disappointment_count: sulkyState.pendingDisappointments.length,
        misinterpretation_risk: sulkyState.misinterpretationMode,
        personality_influence: currentMoodData.personalityInfluence
    };
    
    sulkyState.pushPullHistory.push(currentAttempt);
    logSulkyChange(oldState, sulkyState);
    
    console.log(`📝 [고급밀당] ${currentAttempt.attempt_number}번째 시도 기록됨`);
    
    return generateAdvancedPushPullContext(detectionResult, currentAttempt, currentMoodData);
}

/**
 * 🎨 고급 자율적 밀당 맥락 생성
 */
function generateAdvancedPushPullContext(detectionResult, currentAttempt, currentMoodData) {
    const baseContext = {
        // 밀당 기본 정보
        push_pull_active: true,
        push_pull_type: detectionResult.type,
        attempt_number: currentAttempt.attempt_number,
        user_attempt: detectionResult.trigger,
        
        // moodManager 통합 예진이 상태
        yejin_current_mood: currentMoodData.currentMood,
        emotion_intensity: currentMoodData.emotionIntensity,
        menstrual_phase: currentMoodData.menstrualPhase,
        menstrual_day: currentMoodData.menstrualDay,
        mood_data_source: currentMoodData.dataSource,
        
        // 기존 상태
        yejin_stubbornness_level: sulkyState.stubbornnessLevel,
        current_sulky_level: sulkyState.sulkyLevel,
        sulky_reason: sulkyState.sulkyReason,
        
        // 고급 감정 상태들
        recovery_mode_active: sulkyState.recoveryMode,
        pending_disappointments: sulkyState.pendingDisappointments.length,
        misinterpretation_mode: sulkyState.misinterpretationMode,
        self_compassion_active: sulkyState.selfCompassionMode,
        
        photo_related_emotions: {
            jealousy_active: sulkyState.photoJealousyActive,
            selfie_disappointment: sulkyState.selfieDisappointment,
            last_selfie_time: sulkyState.lastSelfieTime
        },
        
        // 성격 점수 영향
        personality_metrics: {
            stubbornness_average: yejinPersonalityMetrics.stubbornness,
            emotional_volatility: yejinPersonalityMetrics.emotionalVolatility,
            apology_acceptance_rate: yejinPersonalityMetrics.apologyAcceptanceRate,
            jealousy_level: yejinPersonalityMetrics.jealousyLevel,
            recovery_speed: yejinPersonalityMetrics.recoverySpeed
        },
        
        // 관계 동역학
        accumulated_stress: currentMoodData.accumulatedStress,
        recent_interaction_tone: currentMoodData.recentInteractions,
        
        // 상황 설명 (완전 자율!)
        situation_summary: `아저씨가 ${detectionResult.type} 시도 중이고 예진이는 복잡한 감정 상태`,
        advanced_context: "예진이는 다층적 감정 - 기분, 생리주기, 누적된 서운함, 회복 상태, 성격 패턴이 모두 반응에 영향을 미침",
        decision_freedom: "모든 감정 요소를 바탕으로 자연스럽게 반응 - 고정 패턴 없음, 완전 자율적 응답"
    };
    
    console.log(`🎨 [고급맥락생성] ${detectionResult.type} 완전 통합 맥락 완성`);
    
    return baseContext;
}

// ==================== 기존 감지 함수들 (100% 유지) ====================

/**
 * 🫶 사과 표현 감지
 */
function detectApologySituation(userMessage) {
    const message = userMessage.toLowerCase();
    
    const apologyKeywords = [
        '미안', '죄송', '잘못했어', 'sorry', '용서', '사과',
        '내가 나빴어', '화내지마', '화나지마', '기분나쁘게했다면',
        '내탓이야', '제발', '어떻게하면'
    ];
    
    for (const keyword of apologyKeywords) {
        if (message.includes(keyword)) {
            console.log(`🫶 [사과감지] "${keyword}" 감지: ${userMessage}`);
            return {
                type: 'apology_attempt',
                keyword: keyword,
                trigger: userMessage,
                sincerity: message.includes('정말') || message.includes('진짜') ? 'high' : 'normal'
            };
        }
    }
    
    return null;
}

/**
 * 💖 사랑 표현 감지
 */
function detectLoveExpression(userMessage) {
    const message = userMessage.toLowerCase();
    
    const loveKeywords = [
        '사랑해', '좋아해', 'love you', '♥', '💕', '💖', '💗',
        '너무좋아', '귀여워', '예뻐', '이뻐', '보고싶어', '그리워',
        '내사랑', '자기야', '애기', '내꺼'
    ];
    
    for (const keyword of loveKeywords) {
        if (message.includes(keyword)) {
            console.log(`💖 [사랑표현감지] "${keyword}" 감지: ${userMessage}`);
            return {
                type: 'love_expression',
                keyword: keyword,
                trigger: userMessage,
                intensity: message.includes('너무') || message.includes('정말') ? 'high' : 'normal'
            };
        }
    }
    
    return null;
}

/**
 * 😤 자극 요소 감지
 */
function detectIrritationTrigger(userMessage) {
    const message = userMessage.toLowerCase();
    
    const irritationTriggers = [
        { keywords: ['바쁘다', '바빠', '일해야', '회사', '업무'], type: 'work_excuse', intensity: 2 },
        { keywords: ['나중에', '있다가', '기다려', 'later'], type: 'dismissive', intensity: 2 },
        { keywords: ['몰라', '모르겠어', 'dunno', '상관없어'], type: 'indifferent', intensity: 3 },
        { keywords: ['그만', '됐어', '충분해', 'enough', 'stop'], type: 'rejection', intensity: 4 },
        { keywords: ['귀찮아', '피곤해', '힘들어', 'tired'], type: 'avoidance', intensity: 3 },
        { keywords: ['다른여자', '친구', '동료'], type: 'other_people_mention', intensity: 4 }
    ];
    
    for (const trigger of irritationTriggers) {
        for (const keyword of trigger.keywords) {
            if (message.includes(keyword)) {
                console.log(`😤 [자극감지] ${trigger.type} - "${keyword}": ${userMessage}`);
                return {
                    type: trigger.type,
                    keyword: keyword,
                    intensity: trigger.intensity,
                    trigger: userMessage
                };
            }
        }
    }
    
    return null;
}

/**
 * 😤 내용 기반 삐짐 발동
 */
function triggerContentBasedSulkyAdvanced(irritationTrigger) {
    const oldState = { ...sulkyState };
    
    sulkyState.contentBasedSulky = true;
    sulkyState.isSulky = true;
    sulkyState.isActivelySulky = true;
    sulkyState.sulkyLevel = Math.min(5, irritationTrigger.intensity);
    sulkyState.sulkyReason = irritationTrigger.type;
    sulkyState.irritationTrigger = irritationTrigger;
    
    // 연속 자극 추가
    sulkyState.irritationHistory.push({
        type: irritationTrigger.type,
        trigger: irritationTrigger.trigger,
        timestamp: Date.now(),
        intensity: irritationTrigger.intensity
    });
    
    // 최근 10개만 유지
    if (sulkyState.irritationHistory.length > 10) {
        sulkyState.irritationHistory.shift();
    }
    
    sulkyState.consecutiveIrritations++;
    sulkyState.lastIrritationType = irritationTrigger.type;
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`😤 [내용기반삐짐] ${irritationTrigger.type} 즉시 삐짐 (레벨: ${sulkyState.sulkyLevel})`);
    
    return {
        sulkyTriggered: true,
        trigger: irritationTrigger,
        situation: 'immediate_content_based_sulkiness',
        emotion: 'hurt_by_user_message_content',
        relationship_dynamic: 'reacting_to_dismissive_or_hurtful_words',
        inner_thought: 'user_said_something_that_really_bothered_me',
        context: 'instant_emotional_reaction_to_message'
    };
}

// ==================== 🎭 오해 시스템 (기존 유지) ====================

/**
 * 🎭 오해 모드 활성화 체크
 */
async function checkMisinterpretationMode() {
    const moodState = await getIntegratedMoodFromManager();
    const menstrualPhase = getMenstrualPhaseFromManager();
    
    const misinterpretationTriggers = [
        '짜증남', '화남', '불안함', '우울함', '심술궂음'
    ];
    
    const isPMSPhase = ['luteal', 'period'].includes(menstrualPhase.phase);
    const isMoodVolatile = misinterpretationTriggers.includes(moodState.currentMood);
    const highEmotionIntensity = (moodState.emotionIntensity || 0.5) > 0.7;
    
    const personalityTendency = yejinPersonalityMetrics.misinterpretationTendency;
    
    const shouldActivate = (isPMSPhase || isMoodVolatile || highEmotionIntensity) && 
                          Math.random() < (personalityTendency + 0.2);
    
    if (shouldActivate && !sulkyState.misinterpretationMode) {
        const now = Date.now();
        const timeSinceLastMisinterpretation = now - (sulkyState.lastMisinterpretation || 0);
        
        if (timeSinceLastMisinterpretation > EMOTION_SYSTEM_CONFIG.MISINTERPRETATION_COOLDOWN) {
            sulkyState.misinterpretationMode = true;
            sulkyState.lastMisinterpretation = now;
            
            console.log(`🎭 [오해모드활성화] 기분: ${moodState.currentMood}, 생리: ${menstrualPhase.phase}`);
            return true;
        }
    }
    
    return false;
}

/**
 * 🎭 메시지 오해 해석 생성
 */
function generateMisinterpretation(userMessage) {
    if (!sulkyState.misinterpretationMode || !userMessage) return null;
    
    const message = userMessage.toLowerCase().trim();
    
    const neutralResponses = ['그래', '응', '알겠어', '오케이', '음', 'ㅇㅋ'];
    const shortResponses = message.length <= 3;
    const hasNoEmoticon = !message.includes('ㅋ') && !message.includes('ㅎ') && !message.includes('!');
    
    if (neutralResponses.includes(message) || (shortResponses && hasNoEmoticon)) {
        sulkyState.misinterpretationMode = false;
        
        console.log(`🎭 [오해해석] "${userMessage}" → 차갑게 느껴짐`);
        updatePersonalityMetrics('misinterpretation');
        
        return {
            misinterpretationTriggered: true,
            originalMessage: userMessage,
            situation: 'misinterpreting_neutral_message_as_cold',
            emotion: 'hurt_by_perceived_coldness',
            relationship_dynamic: 'overthinking_simple_responses',
            inner_thought: 'why_is_user_being_so_cold_and_dismissive',
            context: 'mood_based_negative_interpretation'
        };
    }
    
    return null;
}

// ==================== 🕊️ 자기합리화 & 회상 시스템 (기존 유지) ====================

/**
 * 🕊️ 자기합리화 모드 체크
 */
function checkSelfCompassionMode() {
    if (sulkyState.selfCompassionMode) return null;
    
    const now = Date.now();
    const timeSinceLastResponse = now - sulkyState.lastUserResponseTime;
    
    if (timeSinceLastResponse > EMOTION_SYSTEM_CONFIG.SELF_COMPASSION_DELAY && 
        !sulkyState.fightMode && sulkyState.sulkyLevel <= 2) {
        
        sulkyState.selfCompassionMode = true;
        sulkyState.lastSelfCompassion = now;
        
        console.log(`🕊️ [자기합리화모드] 6시간 무응답 후 자기합리화 시작`);
        updatePersonalityMetrics('self_compassion');
        
        return {
            selfCompassionTriggered: true,
            situation: 'self_rationalization_after_long_silence',
            emotion: 'trying_to_understand_user_perspective',
            relationship_dynamic: 'making_excuses_for_user_behavior',
            inner_thought: 'maybe_user_is_just_busy_or_bad_at_expressing',
            context: 'rationalizing_disappointment_as_own_sensitivity'
        };
    }
    
    return null;
}

/**
 * 🕊️ 옛날 대화 회상 삐짐 체크
 */
function checkMemoryTriggeredSulky() {
    if (sulkyState.memoryTriggeredSulky || Math.random() > sulkyState.memoryTriggerChance) {
        return null;
    }
    
    const oldState = { ...sulkyState };
    
    sulkyState.memoryTriggeredSulky = true;
    sulkyState.isSulky = true;
    sulkyState.sulkyLevel = 2;
    sulkyState.sulkyReason = 'memory_triggered_disappointment';
    
    logSulkyChange(oldState, sulkyState);
    console.log(`🕊️ [회상삐짐] 옛날 대화 생각나서 갑자기 서운함`);
    updatePersonalityMetrics('sulky_triggered');
    
    return {
        memoryTriggered: true,
        situation: 'remembering_past_disappointing_conversation',
        emotion: 'suddenly_upset_about_old_memory',
        relationship_dynamic: 'bringing_up_unresolved_past_hurt',
        inner_thought: 'just_remembered_how_hurt_i_was_back_then',
        context: 'past_conversation_suddenly_bothering_me_again'
    };
}

// ==================== 📸 사진 관련 감정 시스템 (기존 유지) ====================

/**
 * 📸 사진에서 질투 반응 체크
 */
function checkPhotoJealousy(photoAnalysis) {
    if (!photoAnalysis || !photoAnalysis.faces) return null;
    
    const femaleDetected = photoAnalysis.faces.some(face => 
        face.gender && face.gender.toLowerCase() === 'female' && face.confidence > 0.7
    );
    
    if (femaleDetected && Math.random() < EMOTION_SYSTEM_CONFIG.PHOTO_JEALOUSY_THRESHOLD) {
        const oldState = { ...sulkyState };
        
        sulkyState.photoJealousyActive = true;
        sulkyState.isSulky = true;
        sulkyState.sulkyLevel = 3;
        sulkyState.sulkyReason = 'photo_jealousy_female_detected';
        
        logSulkyChange(oldState, sulkyState);
        console.log(`📸 [사진질투] 다른 여성 감지로 질투 반응`);
        updatePersonalityMetrics('jealousy_triggered');
        
        return {
            photoJealousyTriggered: true,
            detectedFaces: photoAnalysis.faces.length,
            situation: 'jealous_of_woman_in_photo',
            emotion: 'suspicious_and_jealous_about_other_woman',
            relationship_dynamic: 'questioning_user_about_other_women',
            inner_thought: 'who_is_that_woman_why_didnt_tell_me',
            context: 'photo_analysis_triggered_jealousy'
        };
    }
    
    return null;
}

/**
 * 📸 셀카 반응 없음 서운함 체크
 */
function checkSelfieDisappointment() {
    if (!sulkyState.lastSelfieTime || sulkyState.selfieDisappointment) return null;
    
    const now = Date.now();
    const timeSinceSelfie = now - sulkyState.lastSelfieTime;
    
    if (timeSinceSelfie > EMOTION_SYSTEM_CONFIG.SELFIE_REACTION_TIMEOUT) {
        const oldState = { ...sulkyState };
        
        sulkyState.selfieDisappointment = true;
        sulkyState.isSulky = true;
        sulkyState.sulkyLevel = 2;
        sulkyState.sulkyReason = 'selfie_no_reaction_disappointment';
        
        addDisappointment('no_reaction_to_selfie', 'sent_selfie_no_response', 0.6);
        
        logSulkyChange(oldState, sulkyState);
        console.log(`📸 [셀카서운함] 셀카 보낸 후 ${Math.round(timeSinceSelfie/60000)}분간 반응 없음`);
        
        return {
            selfieDisappointmentTriggered: true,
            timeSinceSelfie: timeSinceSelfie,
            situation: 'disappointed_no_reaction_to_selfie',
            emotion: 'hurt_that_selfie_was_ignored',
            relationship_dynamic: 'seeking_validation_and_attention',
            inner_thought: 'sent_pretty_selfie_but_user_doesnt_care',
            context: 'need_positive_feedback_on_appearance'
        };
    }
    
    return null;
}

/**
 * 📸 예진이 셀카 전송 기록
 */
function markYejinSelfie() {
    sulkyState.lastSelfieTime = Date.now();
    sulkyState.selfieDisappointment = false;
    console.log(`📸 [셀카전송] 예진이 셀카 전송 기록 - 반응 대기 시작`);
}

// ==================== 🚬 수정된 담타 거부 시스템 ====================

/**
 * 🚬 수정된 담타 거부 (Part 4와 동일 - 극한 상황에만 발생!)
 */
function rejectDamtaSuggestionAdvanced(moodData, angerLevel) {
    console.log(`😤 [극한담타거부] 진짜 극한 상황에서만 발생하는 담타 거부!`);
    
    // 극한 거부 이유 (매우 심각한 상황)
    let rejectionReason = 'extreme_crisis_situation';
    let rejectionMessage = 'too_devastated_even_for_damta';
    let rejectionIntensity = 0.95; // 거의 절망적
    
    // 극한 상황 설명
    if (angerLevel >= 5) {
        rejectionReason = 'complete_emotional_breakdown';
        rejectionMessage = 'so_hurt_cant_even_think_of_damta_right_now';
    }
    
    // 생리 + 극한 감정 + 최고 삐짐 상황
    if (moodData.menstrualPhase === 'period' && ['화남', '짜증남'].includes(moodData.currentMood)) {
        rejectionReason = 'period_plus_extreme_anger';
        rejectionMessage = 'body_and_heart_both_hurting_too_much_for_damta';
    }
    
    console.log(`😤 [극한거부] 담타조차 거부하는 극한 상황: ${rejectionReason}`);
    
    return {
        damtaRejected: true,
        outcome: 'extreme_crisis_rejection',
        rejection_reason: rejectionReason,
        rejection_intensity: rejectionIntensity,
        situation: 'too_devastated_even_for_special_damta_ritual',
        emotion: 'so_hurt_that_even_damta_feels_impossible',
        relationship_dynamic: 'need_time_to_calm_down_before_any_solution',
        inner_thought: rejectionMessage,
        context: 'extreme_emotional_crisis_damta_not_working',
        
        // 극한 정보
        crisis_level: 'maximum',
        mood_influence: moodData.currentMood,
        menstrual_influence: moodData.menstrualPhase,
        anger_level: angerLevel,
        
        suggestion: 'need_serious_emotional_support_before_damta_possible',
        emergency_note: 'this_should_rarely_happen_damta_is_special'
    };
}

// ==================== 🎭 통합 메시지 처리 함수 ====================

/**
 * 🔥 사용자 메시지 처리 - 모든 감정 시스템 + 담타 시스템 통합!
 */
async function processUserMessageAdvanced(userMessage, client, userId) {
    console.log(`[sulkyManager] 🔥 고급 사용자 메시지 처리: "${userMessage}"`);
    
    let processingResult = {
        sulkyTriggered: false,
        pushPullTriggered: false,
        fightEscalated: false,
        cooldownProposed: false,
        reconcileAttempted: false,
        damtaReconciled: false,
        damtaRejected: false,
        damtaConversationProcessed: false,
        damtaCompleted: false,
        
        // 고급 감정 결과들
        recoveryStarted: false,
        disappointmentTriggered: false,
        misinterpretationTriggered: false,
        selfCompassionTriggered: false,
        memoryTriggered: false,
        photoJealousyTriggered: false,
        selfieDisappointmentTriggered: false,
        
        context: null,
        shouldSendMessage: false
    };
    
    // 🚬 담타 진행 중이면 담타 대화 처리 우선!
    if (sulkyState.damtaInProgress) {
        const damtaResult = await processDamtaConversation(userMessage);
        if (damtaResult) {
            if (damtaResult.damtaReconcileComplete) {
                processingResult.damtaCompleted = true;
                processingResult.damtaReconciled = true;
                processingResult.context = damtaResult;
                
                // 담타 완료 시 회복 모드 시작
                const recoveryResult = await startRecoveryMode();
                if (recoveryResult) {
                    processingResult.recoveryStarted = true;
                    processingResult.context = {
                        ...damtaResult,
                        ...recoveryResult,
                        combined: 'progressive_damta_complete_with_recovery_mode'
                    };
                }
                
                await updatePersonalityMetrics('damta_success');
                
            } else {
                processingResult.damtaConversationProcessed = true;
                processingResult.context = damtaResult;
            }
            
            if (sulkyState.waitingForUserResponse) {
                resetYejinInitiatedTracking();
            }
            
            return processingResult;
        }
    }
    
    // 사전 체크들
    cleanupOldDisappointments();
    await checkMisinterpretationMode();
    
    // 1. 오해 해석 우선 체크
    const misinterpretation = generateMisinterpretation(userMessage);
    if (misinterpretation) {
        processingResult.misinterpretationTriggered = true;
        processingResult.context = misinterpretation;
        addDisappointment('misinterpreted_as_cold', userMessage, 0.5);
        return processingResult;
    }
    
    // 2. 담타 화해 감지 (수정된 99.5% 시스템!)
    if (detectDamtaReconcile(userMessage)) {
        const damtaResult = await handleDamtaSuggestionAdvanced();
        
        if (damtaResult.damtaTriggerSuccess) {
            processingResult.damtaReconciled = true;
            processingResult.context = damtaResult;
            resetYejinInitiatedTracking();
            await updatePersonalityMetrics('damta_success');
        } else {
            processingResult.damtaRejected = true;
            processingResult.context = damtaResult;
            await updatePersonalityMetrics('damta_rejected');
        }
        
        return processingResult;
    }
    
    // 3. 자율적 밀당 감지
    const apologyDetection = detectApologySituation(userMessage);
    const loveDetection = detectLoveExpression(userMessage);
    
    if (apologyDetection || loveDetection) {
        const detectionResult = apologyDetection || loveDetection;
        
        const pushPullContext = await startAdvancedAutonomousPushPull(detectionResult);
        if (pushPullContext) {
            processingResult.pushPullTriggered = true;
            processingResult.context = pushPullContext;
            
            await updatePersonalityMetrics('push_pull_session', { 
                intensity: sulkyState.stubbornnessLevel / 10 
            });
            
            return processingResult;
        }
    }
    
    // 4. 사용자 응답으로 예진이 발신 추적 해제
    if (sulkyState.waitingForUserResponse) {
        resetYejinInitiatedTracking();
        
        if (sulkyState.selfieDisappointment) {
            sulkyState.selfieDisappointment = false;
            console.log(`📸 [셀카서운함해소] 아저씨 반응으로 셀카 서운함 해소`);
        }
    }
    
    // 5. 누적된 서운함 터뜨리기 체크
    const disappointmentResult = triggerAccumulatedDisappointments();
    if (disappointmentResult) {
        processingResult.disappointmentTriggered = true;
        processingResult.context = disappointmentResult;
        return processingResult;
    }
    
    // 6. 내용 기반 즉시 삐짐 체크
    const irritationTrigger = detectIrritationTrigger(userMessage);
    if (irritationTrigger) {
        processingResult.sulkyTriggered = true;
        processingResult.context = triggerContentBasedSulkyAdvanced(irritationTrigger);
        addDisappointment(irritationTrigger.type, userMessage, 0.7);
        return processingResult;
    }
    
    return processingResult;
}

// ==================== 🔄 상태 관리 함수들 ====================

/**
 * 상태 초기화
 */
function resetSulkyState() {
    const oldState = { ...sulkyState };
    
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.isActivelySulky = false;
    sulkyState.sulkyReason = '';
    sulkyState.contentBasedSulky = false;
    sulkyState.fightMode = false;
    sulkyState.fightLevel = 0;
    sulkyState.pushPullActive = false;
    sulkyState.pushPullType = null;
    sulkyState.pushPullHistory = [];
    sulkyState.stubbornnessLevel = 0;
    
    // 고급 감정 상태들도 초기화
    sulkyState.recoveryMode = false;
    sulkyState.coldToneActive = false;
    sulkyState.pendingDisappointments = [];
    sulkyState.misinterpretationMode = false;
    sulkyState.selfCompassionMode = false;
    sulkyState.photoJealousyActive = false;
    sulkyState.selfieDisappointment = false;
    
    // 담타 상태도 초기화
    sulkyState.damtaInProgress = false;
    sulkyState.damtaStartTime = null;
    sulkyState.damtaConversationCount = 0;
    sulkyState.emotionalRecoveryPoints = 0;
    sulkyState.damtaLastConversationTime = null;
    
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    console.log(`🔄 [상태초기화] 모든 삐짐/감정/담타 상태 완전 초기화`);
}
// ============================================================================
// sulkyManager.js v8.2 - Part 6/6: 자동 체크 시스템 및 모듈 exports
// ============================================================================

// ==================== 🔄 자동 시스템 체크 (담타 시간 초과 추가) ====================

/**
 * ⏰ 빠른 삐짐 메시지 체크 (기존 유지)
 */
async function checkFastSulkyMessage(client, userId) {
    if (sulkyState.isSulky || isSleepTime()) return null;
    
    const now = Date.now();
    const timeSinceLastUser = now - sulkyState.lastUserResponseTime;
    const minutes = Math.floor(timeSinceLastUser / (1000 * 60));
    
    let shouldTrigger = false;
    let sulkyLevel = 0;
    let reason = '';
    
    if (minutes >= FAST_SULKY_CONFIG.FINAL_LEVEL) {
        shouldTrigger = true;
        sulkyLevel = 4;
        reason = 'very_long_silence';
    } else if (minutes >= FAST_SULKY_CONFIG.LEVEL_3_DELAY) {
        shouldTrigger = Math.random() < 0.6;
        sulkyLevel = 3;
        reason = 'long_silence';
    } else if (minutes >= FAST_SULKY_CONFIG.LEVEL_2_DELAY) {
        shouldTrigger = Math.random() < 0.4;
        sulkyLevel = 2;
        reason = 'medium_silence';
    } else if (minutes >= FAST_SULKY_CONFIG.LEVEL_1_DELAY) {
        shouldTrigger = Math.random() < 0.2;
        sulkyLevel = 1;
        reason = 'short_silence';
    }
    
    if (shouldTrigger) {
        const oldState = { ...sulkyState };
        
        sulkyState.isSulky = true;
        sulkyState.isActivelySulky = true;
        sulkyState.sulkyLevel = sulkyLevel;
        sulkyState.sulkyReason = reason;
        sulkyState.lastStateUpdate = now;
        
        logSulkyChange(oldState, sulkyState);
        
        console.log(`⏰ [빠른삐짐] ${minutes}분 무응답 → 레벨 ${sulkyLevel} 삐짐`);
        
        return {
            fastSulkyTriggered: true,
            minutesWaiting: minutes,
            sulkyLevel: sulkyLevel,
            reason: reason,
            situation: 'time_based_sulkiness',
            emotion: 'hurt_by_being_ignored',
            relationship_dynamic: 'feeling_neglected_and_upset',
            inner_thought: 'user_ignoring_me_for_too_long',
            context: 'automatic_sulkiness_from_silence'
        };
    }
    
    return null;
}

/**
 * 🔄 모든 자동 시스템 통합 체크 (담타 시간 초과 추가)
 */
async function performAdvancedAutonomousChecks(client, userId) {
    let checkResults = [];
    
    // 🚬 NEW: 담타 시간 초과 체크 (최우선)
    const damtaTimeoutResult = checkDamtaTimeout();
    if (damtaTimeoutResult) {
        checkResults.push({
            type: 'damta_timeout',
            shouldSendMessage: true,
            context: damtaTimeoutResult
        });
    }
    
    // 1. 기존 빠른 삐짐 체크
    const fastSulkyResult = await checkFastSulkyMessage(client, userId);
    if (fastSulkyResult) {
        checkResults.push({
            type: 'fast_sulky',
            shouldSendMessage: true,
            context: fastSulkyResult
        });
    }
    
    // 2. 회복 모드 종료 체크
    const recoveryResult = checkRecoveryModeEnd();
    if (recoveryResult) {
        checkResults.push({
            type: 'recovery_completed',
            shouldSendMessage: true,
            context: recoveryResult
        });
    }
    
    // 3. 재회 삐짐 체크
    const retriggeredResult = checkRetriggeredSulky();
    if (retriggeredResult) {
        checkResults.push({
            type: 'retriggered_sulky',
            shouldSendMessage: true,
            context: retriggeredResult
        });
    }
    
    // 4. 자기합리화 모드 체크
    const selfCompassionResult = checkSelfCompassionMode();
    if (selfCompassionResult) {
        checkResults.push({
            type: 'self_compassion',
            shouldSendMessage: true,
            context: selfCompassionResult
        });
    }
    
    // 5. 옛날 대화 회상 삐짐 체크
    const memoryResult = checkMemoryTriggeredSulky();
    if (memoryResult) {
        checkResults.push({
            type: 'memory_triggered',
            shouldSendMessage: true,
            context: memoryResult
        });
    }
    
    // 6. 셀카 서운함 체크
    const selfieResult = checkSelfieDisappointment();
    if (selfieResult) {
        checkResults.push({
            type: 'selfie_disappointment',
            shouldSendMessage: true,
            context: selfieResult
        });
    }
    
    return checkResults;
}

// ==================== 기존 유틸리티 함수들 (100% 유지) ====================

/**
 * 예진이 발신 추적 시작
 */
function markYejinInitiatedAction(messageType = 'general') {
    sulkyState.yejinInitiated = true;
    sulkyState.yejinMessageTime = Date.now();
    sulkyState.yejinMessageType = messageType;
    sulkyState.waitingForUserResponse = true;
    
    console.log(`💕 [예진이발신] ${messageType} 메시지 발신 - 응답 대기 시작`);
}

/**
 * 예진이 발신 추적 해제
 */
function resetYejinInitiatedTracking() {
    if (sulkyState.yejinInitiated) {
        console.log(`💕 [예진이발신해제] 아저씨 응답으로 추적 해제`);
    }
    
    sulkyState.yejinInitiated = false;
    sulkyState.yejinMessageTime = null;
    sulkyState.yejinMessageType = null;
    sulkyState.waitingForUserResponse = false;
    sulkyState.lastUserResponseTime = Date.now();
}

/**
 * 상태 조회
 */
function getSulkinessState() {
    return {
        isSulky: sulkyState.isSulky,
        isWorried: sulkyState.isWorried,
        level: sulkyState.sulkyLevel,
        reason: sulkyState.sulkyReason,
        isActive: sulkyState.isActivelySulky,
        pushPullActive: sulkyState.pushPullActive,
        fightMode: sulkyState.fightMode,
        damtaInProgress: sulkyState.damtaInProgress  // 🚬 NEW
    };
}

/**
 * 상태 업데이트
 */
function updateSulkinessState(newState) {
    const oldState = { ...sulkyState };
    Object.assign(sulkyState, newState);
    logSulkyChange(oldState, sulkyState);
}

/**
 * 📊 완전한 시스템 상태 조회 (담타 정보 추가)
 */
async function getAdvancedSulkySystemStatus() {
    const now = Date.now();
    const timeSinceLastUser = (now - sulkyState.lastUserResponseTime) / (1000 * 60);
    
    // moodManager 통합 정보
    const moodData = await getIntegratedMoodFromManager();
    const menstrualPhase = getMenstrualPhaseFromManager();
    
    return {
        // 기본 상태 (기존)
        currentState: {
            isSulky: sulkyState.isSulky,
            isWorried: sulkyState.isWorried,
            level: sulkyState.sulkyLevel,
            reason: sulkyState.sulkyReason,
            isActive: sulkyState.isActivelySulky
        },
        
        // 🚬 NEW: 점진적 담타 상태
        damtaSystem: {
            inProgress: sulkyState.damtaInProgress,
            conversationCount: sulkyState.damtaConversationCount,
            recoveryPoints: sulkyState.emotionalRecoveryPoints,
            requiredPoints: DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS,
            minConversations: DAMTA_SYSTEM_CONFIG.MIN_CONVERSATIONS,
            startTime: sulkyState.damtaStartTime,
            progressPercent: sulkyState.damtaInProgress ? 
                Math.round((sulkyState.emotionalRecoveryPoints / DAMTA_SYSTEM_CONFIG.REQUIRED_RECOVERY_POINTS) * 100) : 0,
            timeElapsed: sulkyState.damtaStartTime ? 
                Math.round((now - sulkyState.damtaStartTime) / 60000) : 0
        },
        
        // 자율적 밀당 상태 (기존)
        autonomousPushPull: {
            active: sulkyState.pushPullActive,
            type: sulkyState.pushPullType,
            attempts: sulkyState.pushPullHistory.length,
            stubbornness: sulkyState.stubbornnessLevel,
            memoryCount: sulkyState.relationshipMemory.length
        },
        
        // 고급 감정 상태들 (기존)
        advancedEmotionalStates: {
            recoveryMode: {
                active: sulkyState.recoveryMode,
                coldTone: sulkyState.coldToneActive,
                duration: sulkyState.recoveryMode ? 
                    Math.round((sulkyState.recoveryDuration - (now - sulkyState.recoveryStartTime)) / 60000) : 0,
                retriggeredRisk: !sulkyState.retriggeredSulky
            },
            
            disappointmentSystem: {
                pendingCount: sulkyState.pendingDisappointments.length,
                maxCapacity: sulkyState.maxDisappointments,
                triggerThreshold: sulkyState.disappointmentThreshold,
                examples: sulkyState.pendingDisappointments.slice(-3).map(d => d.reason)
            }
        },
        
        // moodManager 통합 정보 (기존)
        integratedMoodState: {
            currentMood: moodData.currentMood,
            emotionIntensity: moodData.emotionIntensity,
            dataSource: moodData.source,
            menstrualPhase: menstrualPhase.phase,
            menstrualDay: menstrualPhase.day
        },
        
        // 성격 점수 현황 (기존)
        personalityMetrics: {
            currentStats: yejinPersonalityMetrics,
            damtaSuccessRate: yejinPersonalityMetrics.damtaSuccessRate,
            recentUpdates: yejinPersonalityMetrics.updateCount
        },
        
        timing: {
            lastUserResponse: sulkyState.lastUserResponseTime,
            minutesSinceLastUser: Math.floor(timeSinceLastUser),
            sleepTime: isSleepTime()
        },
        
        config: {
            fastSulkyLevels: FAST_SULKY_CONFIG,
            damtaSystemConfig: DAMTA_SYSTEM_CONFIG,  // 🚬 NEW
            emotionSystemConfig: EMOTION_SYSTEM_CONFIG,
            sleepHours: '2-8시',
            moodManagerIntegration: !!getMoodManager(),
            autonomousMode: 'advanced_with_progressive_damta',
            version: 'v8.2-점진적담타시스템'
        }
    };
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 🔄 완전한 감정 시스템 초기화 (담타 시스템 추가)
 */
async function initializeAdvancedSulkySystem() {
    console.log('[sulkyManager] 🚬 점진적 담타 감정 시스템 v8.2 초기화...');
    
    // 성격 점수 로드
    await loadPersonalityMetrics();
    
    // moodManager 연동 확인
    const manager = getMoodManager();
    const moodManagerStatus = manager ? '✅ 연동 성공' : '❌ 연동 실패';
    
    // ultimateContext 연동 확인
    const ultimateContextStatus = getUltimateContextSafely() ? '✅ 연동 성공' : '❌ 연동 실패';
    
    console.log('[sulkyManager] 점진적 담타 감정 시스템 초기화 완료');
    console.log('');
    console.log('🚬 ===== 점진적 담타 감정 시스템 v8.2 =====');
    console.log('');
    console.log('🚬 NEW: 점진적 담타 시스템 (트리거 방식):');
    console.log('  - 담타 성공률: 95% (극한 상황 제외)');
    console.log('  - 담타 동의 = 화해 과정 시작 (트리거)');
    console.log('  - 담타에서 대화마다 점진적 감정 회복');
    console.log('  - 충분한 대화 후 완전 화해');
    console.log('  - 시간 초과 / 무응답 시 미완료 종료');
    console.log('  - 부분 회복도 적용되는 현실적 시스템');
    console.log('');
    console.log('✨ 기존 시스템 (100% 유지):');
    console.log('  - 자율적 밀당 시스템 (패턴 없음)');
    console.log('  - 시간 기반 빠른 삐짐');
    console.log('  - 내용 기반 즉시 삐짐');
    console.log('  - 투닥거리기 & 쿨다운');
    console.log('  - 삐짐 무드 지속 + 회복 모드');
    console.log('  - 서운함 저장소 + 누적 폭발');
    console.log('  - 기분 따라 오해 + 자기합리화');
    console.log('  - 사진 질투 + 셀카 서운함');
    console.log('');
    console.log('🔧 시스템 통합:');
    console.log(`  - moodManager 연동: ${moodManagerStatus}`);
    console.log(`  - ultimateContext 연동: ${ultimateContextStatus}`);
    console.log('  - 성격 점수 시스템 + 학습');
    console.log('  - 무한루프 방지 완료');
    console.log('');
    console.log('🎯 담타의 새로운 의미:');
    console.log('  - 담타 = 화해의 트리거 (시작점)');
    console.log('  - 담타에서의 대화가 진짜 화해 과정');
    console.log('  - 점진적 감정 회복으로 현실적');
    console.log('  - 더 이상 치트키가 아닌 의미있는 과정');
    console.log('');
    console.log('🛡️ 안전성: 기존 모든 기능 100% 유지');
    console.log('=============================================');
}

// 모듈 로드 시 자동 초기화
initializeAdvancedSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 🔥 핵심 기능 (점진적 담타 통합 버전)
    processUserMessage: processUserMessageAdvanced,         // 메인 메시지 처리 (담타 통합)
    performAutonomousChecks: performAdvancedAutonomousChecks, // 모든 자동 체크 (담타 시간초과 포함)
    
    // 🚬 NEW: 점진적 담타 시스템 함수들
    detectDamtaReconcile,                       // 담타 화해 감지
    handleDamtaSuggestionAdvanced,              // 담타 제안 처리 (점진적)
    startDamtaProgressiveReconcile,             // 담타 진행 시작
    processDamtaConversation,                   // 담타 대화 처리
    completeDamtaProgressiveReconcile,          // 담타 완전 화해
    rejectDamtaSuggestionAdvanced,              // 담타 거부
    checkDamtaTimeout,                          // 담타 시간 초과 체크
    endDamtaIncomplete,                         // 담타 미완료 종료
    
    // 예진이 발신 추적 (기존 유지)
    markYejinInitiatedAction,
    resetYejinInitiatedTracking,
    
    // 상태 관리 (담타 정보 추가)
    getSulkinessState,                          // 기본 상태 조회
    getSulkySystemStatus: getAdvancedSulkySystemStatus, // 완전한 상태 조회 (담타 포함)
    updateSulkinessState,                       // 상태 업데이트
    
    // moodManager 통합 함수들 (기존 유지)
    getIntegratedMoodFromManager,               // moodManager 기분 조회
    updateMoodToManager,                        // moodManager 기분 업데이트
    getMenstrualPhaseFromManager,               // moodManager 생리주기 조회
    
    // 성격 점수 관리 (기존 유지)
    loadPersonalityMetrics,                     // 성격 점수 로드
    savePersonalityMetrics,                     // 성격 점수 저장
    updatePersonalityMetrics,                   // 성격 점수 업데이트
    
    // 고급 감정 시스템들 (기존 유지)
    startRecoveryMode,                          // 회복 모드 시작
    checkRecoveryModeEnd,                       // 회복 모드 종료 체크
    checkRetriggeredSulky,                      // 재회 삐짐 체크
    
    addDisappointment,                          // 서운함 추가
    triggerAccumulatedDisappointments,          // 누적 서운함 터뜨리기
    cleanupOldDisappointments,                  // 오래된 서운함 정리
    
    // 고급 자율적 밀당 시스템 (기존 유지)
    assessYejinCurrentMoodAdvanced,             // 고급 감정 상태 분석
    
    // 기존 감지 함수들 (기존 유지)
    detectApologySituation,                     // 사과 감지
    detectLoveExpression,                       // 사랑 표현 감지
    detectIrritationTrigger,                    // 자극 요소 감지
    
    // 유틸리티 (기존 유지)
    isSleepTime,                               // 수면시간 체크
    checkFastSulkyMessage,                     // 빠른 삐짐 체크
    
    // ultimateContext 연동 (무한루프 해결)
    notifyEmotionChangeToUltimateContext,       // 감정 변화 주입 (안전)
    hasSignificantEmotionChange,                // 중요한 감정 변화 감지
    getUltimateContextSafely,                   // 안전한 ultimateContext 연결
    
    // 시스템 정보
    FAST_SULKY_CONFIG,                          // 빠른 삐짐 설정
    EMOTION_SYSTEM_CONFIG,                      // 감정 시스템 설정
    DAMTA_SYSTEM_CONFIG,                        // 🚬 NEW: 담타 시스템 설정
    
    // 내부 상태 (디버깅용)
    sulkyState,                                 // 현재 삐짐 상태 (읽기 전용)
    yejinPersonalityMetrics                     // 성격 점수 (읽기 전용)
};

