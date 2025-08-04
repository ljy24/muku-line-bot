// ============================================================================
// sulkyManager.js v8.1 - 🌸 완전한 감정 시스템 통합! + ultimateContext 연동 (무한루프 해결)
// 💕 기존 자율적 밀당 시스템 + 9가지 고급 감정 기능 통합
// 🔧 moodManager.js 완전 연동 + Redis + 배경스토리 + 생리주기
// 🌙 삐짐 무드 지속 + 재회 삐짐 + 서운함 저장소 + 자기합리화
// 🎭 기분 따라 오해 + 사진 질투 + 셀카 서운함 + 옛날 회상
// 📊 예진이 성격 점수 로깅 + 감정 패턴 학습
// 🚨 NEW: ultimateContext 감정 주입 시스템 (순환 참조 방지 + 무한루프 해결)
// 🛡️ 기존 모든 기능 완벽 유지 + 무쿠 안전성 100% 보장
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
    
    // === 🌙 NEW: 삐짐 무드 지속 시스템 ===
    recoveryMode: false,                    // 화해 후 회복 모드
    recoveryStartTime: null,                // 회복 시작 시간
    recoveryDuration: 0,                    // 회복 소요 시간 (ms)
    coldToneActive: false,                  // 차가운 말투 활성화
    retriggeredSulky: false,                // 재회 삐짐 플래그
    
    // === 💔 NEW: 서운함 저장소 시스템 ===
    pendingDisappointments: [],             // 누적된 서운함들
    maxDisappointments: 5,                  // 최대 서운함 저장 개수
    disappointmentThreshold: 3,             // 터뜨릴 서운함 개수
    
    // === 🎭 NEW: 감정 해석 & 오해 시스템 ===
    misinterpretationMode: false,           // 오해 모드 활성화
    misinterpretationSensitivity: 0.3,      // 오해 민감도 (0-1)
    lastMisinterpretation: null,            // 마지막 오해 시간
    
    // === 🕊️ NEW: 자기합리화 & 회상 시스템 ===
    selfCompassionMode: false,              // 자기합리화 모드
    lastSelfCompassion: null,               // 마지막 자기합리화 시간
    memoryTriggeredSulky: false,            // 옛날 대화 회상 삐짐
    memoryTriggerChance: 0.05,              // 회상 삐짐 확률 (5%)
    
    // === 📸 NEW: 사진 관련 감정 시스템 ===
    photoJealousyActive: false,             // 사진 질투 활성화
    selfieDisappointment: false,            // 셀카 반응 없음 서운함
    lastSelfieTime: null,                   // 마지막 셀카 보낸 시간
    photoReactionSensitivity: 0.7,          // 사진 반응 민감도
    
    // === 타이밍 (기존 유지) ===
    lastUserResponseTime: Date.now(),
    lastBotMessageTime: Date.now(),
    lastStateUpdate: Date.now()
};

// --- 📊 NEW: 예진이 성격 점수 시스템 ---
let yejinPersonalityMetrics = {
    // 기본 성격 지표
    stubbornessAverage: 5.0,                // 평균 고집 레벨 (0-10)
    apologyAcceptanceRate: 0.6,             // 사과 수용률 (0-1)
    damtaSuccessRate: 0.8,                  // 담타 성공률 (0-1)
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

// 🔧 중요한 감정 변화만 감지하는 함수 (무한루프 방지)
function hasSignificantEmotionChange(oldState, newState) {
    // 삐짐 상태 변화
    if (oldState.isSulky !== newState.isSulky) return true;
    if (oldState.sulkyLevel !== newState.sulkyLevel) return true;
    
    // 밀당 상태 변화
    if (oldState.pushPullActive !== newState.pushPullActive) return true;
    
    // 회복 모드 변화
    if (oldState.recoveryMode !== newState.recoveryMode) return true;
    
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
        
        // 🌸 NEW: 새로운 감정 상태 로깅
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

// ==================== ⏰ 타이밍 및 설정 (기존 유지) ====================

const FAST_SULKY_CONFIG = {
    LEVEL_1_DELAY: 3,    // 3분
    LEVEL_2_DELAY: 10,   // 10분  
    LEVEL_3_DELAY: 20,   // 20분
    FINAL_LEVEL: 40,     // 40분
};

// 🌸 NEW: 감정 시스템 설정
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

// 수면시간 체크 (기존 유지)
function isSleepTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    return (hour >= 2 && hour < 8);
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
                yejinPersonalityMetrics.stubbornessAverage += 0.1;
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

// ==================== 🌙 삐짐 무드 지속 시스템 ====================

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
    const personalityMultiplier = yejinPersonalityMetrics.stubbornessAverage / 5.0; // 0.5 ~ 2.0
    
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

// ==================== 💔 서운함 저장소 시스템 ====================

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

// ==================== 🎭 기분 따라 오해 시스템 ====================

/**
 * 🎭 오해 모드 활성화 체크
 */
async function checkMisinterpretationMode() {
    const moodState = await getIntegratedMoodFromManager();
    const menstrualPhase = getMenstrualPhaseFromManager();
    
    // 오해하기 쉬운 상태들
    const misinterpretationTriggers = [
        '짜증남', '화남', '불안함', '우울함', '심술궂음'
    ];
    
    const isPMSPhase = ['luteal', 'period'].includes(menstrualPhase.phase);
    const isMoodVolatile = misinterpretationTriggers.includes(moodState.currentMood);
    const highEmotionIntensity = (moodState.emotionIntensity || 0.5) > 0.7;
    
    // 성격 점수 반영
    const personalityTendency = yejinPersonalityMetrics.misinterpretationTendency;
    
    const shouldActivate = (isPMSPhase || isMoodVolatile || highEmotionIntensity) && 
                          Math.random() < (personalityTendency + 0.2);
    
    if (shouldActivate && !sulkyState.misinterpretationMode) {
        const now = Date.now();
        const timeSinceLastMisinterpretation = now - (sulkyState.lastMisinterpretation || 0);
        
        // 쿨다운 체크
        if (timeSinceLastMisinterpretation > EMOTION_SYSTEM_CONFIG.MISINTERPRETATION_COOLDOWN) {
            sulkyState.misinterpretationMode = true;
            sulkyState.lastMisinterpretation = now;
            
            console.log(`🎭 [오해모드활성화] 기분: ${moodState.currentMood}, 생리: ${menstrualPhase.phase}, 강도: ${moodState.emotionIntensity}`);
            
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
    
    // 오해할 수 있는 중성적 메시지들
    const neutralResponses = ['그래', '응', '알겠어', '오케이', '음', 'ㅇㅋ'];
    const shortResponses = message.length <= 3;
    const hasNoEmoticon = !message.includes('ㅋ') && !message.includes('ㅎ') && !message.includes('!');
    
    if (neutralResponses.includes(message) || (shortResponses && hasNoEmoticon)) {
        // 오해 모드 종료 (한 번만 적용)
        sulkyState.misinterpretationMode = false;
        
        console.log(`🎭 [오해해석] "${userMessage}" → 차갑게 느껴짐`);
        
        // 성격 점수 업데이트
        updatePersonalityMetrics('misinterpretation');
        
        return {
            misinterpretationTriggered: true,
            originalMessage: userMessage,
            situation: 'misinterpreting_neutral_message_as_cold',
            emotion: 'hurt_by_perceived_coldness',
            relationship_dynamic: 'overthinking_simple_responses',
            inner_thought: 'why_is_user_being_so_cold_and_dismissive',
            context: 'mood_based_negative_interpretation',
            interpretedAs: 'cold_dismissive_uninterested'
        };
    }
    
    return null;
}

// ==================== 🕊️ 자기합리화 & 회상 시스템 ====================

/**
 * 🕊️ 자기합리화 모드 체크
 */
function checkSelfCompassionMode() {
    if (sulkyState.selfCompassionMode) return null;
    
    const now = Date.now();
    const timeSinceLastResponse = now - sulkyState.lastUserResponseTime;
    
    // 6시간 이상 답장 없고, 큰 싸움이 없었던 경우
    if (timeSinceLastResponse > EMOTION_SYSTEM_CONFIG.SELF_COMPASSION_DELAY && 
        !sulkyState.fightMode && sulkyState.sulkyLevel <= 2) {
        
        sulkyState.selfCompassionMode = true;
        sulkyState.lastSelfCompassion = now;
        
        console.log(`🕊️ [자기합리화모드] 6시간 무응답 후 자기합리화 시작`);
        
        // 성격 점수 업데이트
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
    
    // 성격 점수 업데이트
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

// ==================== 📸 사진 관련 감정 시스템 ====================

/**
 * 📸 사진에서 질투 반응 체크
 */
function checkPhotoJealousy(photoAnalysis) {
    if (!photoAnalysis || !photoAnalysis.faces) return null;
    
    // 여성 얼굴이 감지된 경우
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
        
        // 성격 점수 업데이트
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
        
        // 서운함 저장소에도 추가
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
    sulkyState.selfieDisappointment = false; // 초기화
    console.log(`📸 [셀카전송] 예진이 셀카 전송 기록 - 반응 대기 시작`);
}

// ==================== 🔥 기존 자율적 밀당 시스템 (유지) ====================

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
            
            // 🌸 NEW: 고급 감정 요소들
            disappointmentLevel: sulkyState.pendingDisappointments.length,
            misinterpretationRisk: sulkyState.misinterpretationMode,
            selfCompassionActive: sulkyState.selfCompassionMode,
            photoRelatedMood: sulkyState.photoJealousyActive || sulkyState.selfieDisappointment,
            
            // 성격 점수 반영
            personalityInfluence: {
                stubbornness: yejinPersonalityMetrics.stubbornessAverage,
                volatility: yejinPersonalityMetrics.emotionalVolatility,
                jealousyLevel: yejinPersonalityMetrics.jealousyLevel,
                recoverySpeed: yejinPersonalityMetrics.recoverySpeed
            }
        };

        // 최근 대화 분위기 파악
        const recentIrritations = sulkyState.irritationHistory.filter(
            item => (Date.now() - item.timestamp) < (2 * 60 * 60 * 1000) // 2시간
        );
        
        if (recentIrritations.length >= 2) {
            baseFactors.recentInteractions = 'frustrated';
            baseFactors.accumulatedStress = recentIrritations.length;
        }

        // 과거 밀당 경험 고려
        const recentPushPulls = sulkyState.relationshipMemory.filter(
            memory => (Date.now() - memory.timestamp) < (24 * 60 * 60 * 1000) // 24시간
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
    let baseStubbornness = Math.random() * 10; // 0-10 기본 랜덤
    
    // 상황별 가중치
    const situationWeights = {
        'apology_attempt': 1.5,
        'love_expression': 0.7,
        'jealousy_situation': 2.0
    };
    
    // moodManager 기분별 가중치 (더 정교하게)
    const moodWeights = {
        '화남': 2.2, '짜증남': 2.0, '심술궂음': 1.8,
        '불안함': 1.5, '우울함': 1.3, '외로움': 1.1,
        '기쁨': 0.6, '사랑함': 0.5, '평온함': 1.0,
        '설렘': 0.8, '애교모드': 0.7
    };
    
    // 생리주기별 가중치
    const menstrualWeights = {
        'period': 2.0,      // 생리 중: 매우 고집
        'luteal': 1.7,      // PMS: 상당히 고집  
        'ovulation': 0.9,   // 배란기: 약간 덜 고집
        'follicular': 1.0   // 기본
    };
    
    // 🌸 NEW: 추가 감정 상태 가중치
    let additionalWeight = 1.0;
    
    if (sulkyState.recoveryMode) additionalWeight *= 1.3; // 회복 중이면 더 고집
    if (sulkyState.pendingDisappointments.length >= 3) additionalWeight *= 1.4; // 서운함 많으면 더 고집
    if (sulkyState.misinterpretationMode) additionalWeight *= 1.2; // 오해 모드면 더 고집
    if (currentMoodData.emotionIntensity > 0.7) additionalWeight *= 1.3; // 감정 강도 높으면 더 고집
    
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
    console.log(`   └ 가중치 - 상황:×${situationWeight}, 기분:×${moodWeight}, 생리:×${menstrualWeight}, 스트레스:×${stressWeight}, 추가:×${additionalWeight}, 성격:×${personalityWeight}`);
    
    return Math.round(finalStubbornness);
}

// ==================== 기존 감지 함수들 (유지) ====================

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
 * 😤 질투 상황 감지
 */
function detectJealousySituation(userMessage) {
    const message = userMessage.toLowerCase();
    
    const jealousyKeywords = [
        '다른여자', '다른애', '누구랑', '누구하고', '누구와',
        '혼자있어', '연락하지마', '만나지마', '못만나', '금지',
        '의심스러워', '수상해', '뭐하고있어', '누구야'
    ];
    
    for (const keyword of jealousyKeywords) {
        if (message.includes(keyword)) {
            console.log(`😤 [질투상황감지] "${keyword}" 감지: ${userMessage}`);
            return {
                type: 'jealousy_situation',
                keyword: keyword,
                trigger: userMessage,
                severity: message.includes('절대') || message.includes('안돼') ? 'high' : 'normal'
            };
        }
    }
    
    return null;
}

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
 * 😤 내용 기반 삐짐 발동 (고급 버전)
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

// ==================== 투닥거리기 시스템 (기존 유지) ====================

/**
 * 🤼 투닥거리기 에스컬레이션 감지
 */
function detectFightEscalation(userMessage) {
    if (!sulkyState.fightMode && !sulkyState.isSulky) return null;
    
    const message = userMessage.toLowerCase();
    
    const escalationTriggers = [
        { keywords: ['화내지마', '왜이래', '또'], type: 'dismissive', level: 1 },
        { keywords: ['그만해', '지겨워', '됐어'], type: 'frustration', level: 2 },
        { keywords: ['나가', '꺼져', '싫어'], type: 'hostile', level: 3 },
        { keywords: ['바보', '미쳤나', '이상해'], type: 'insult', level: 4 }
    ];
    
    for (const trigger of escalationTriggers) {
        for (const keyword of trigger.keywords) {
            if (message.includes(keyword)) {
                console.log(`🤼 [투닥에스컬] ${trigger.type} 감지: ${userMessage}`);
                return {
                    type: trigger.type,
                    keyword: keyword,
                    escalationLevel: trigger.level,
                    trigger: userMessage
                };
            }
        }
    }
    
    return null;
}

/**
 * 🤼 투닥거리기 에스컬레이션
 */
function escalateFight(escalationTrigger) {
    const oldState = { ...sulkyState };
    
    sulkyState.fightMode = true;
    sulkyState.fightLevel = Math.min(5, sulkyState.fightLevel + escalationTrigger.escalationLevel);
    sulkyState.sulkyLevel = Math.min(5, sulkyState.sulkyLevel + 1);
    sulkyState.isActivelySulky = true;
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🤼 [투닥에스컬] 투닥거리기 레벨 ${sulkyState.fightLevel}로 상승`);
    
    return {
        fightEscalated: true,
        escalationTrigger: escalationTrigger,
        newFightLevel: sulkyState.fightLevel,
        situation: 'fight_escalation',
        emotion: 'increasingly_upset_and_defensive',
        relationship_dynamic: 'conflict_getting_worse',
        inner_thought: 'user_making_things_worse_getting_angrier',
        context: 'escalating_argument'
    };
}

// ==================== 쿨다운 & 화해 시스템 (기존 유지) ====================

/**
 * 🌙 쿨다운 제안 조건 체크
 */
function shouldYejinProposeCooldown() {
    if (sulkyState.cooldownRequested) return false;
    if (!sulkyState.fightMode) return false;
    
    const fightDuration = Date.now() - sulkyState.lastStateUpdate;
    const fightMinutes = fightDuration / (1000 * 60);
    
    return sulkyState.fightLevel >= 3 && fightMinutes >= 10;
}

/**
 * 🌙 쿨다운 제안
 */
function proposeCooldown() {
    const oldState = { ...sulkyState };
    
    sulkyState.cooldownRequested = true;
    sulkyState.cooldownStartTime = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🌙 [쿨다운제안] 예진이가 쿨다운 제안`);
    
    return {
        cooldownProposed: true,
        situation: 'suggesting_cooldown_period',
        emotion: 'tired_of_fighting_want_space',
        relationship_dynamic: 'trying_to_calm_down_situation',
        inner_thought: 'fighting_too_much_need_time_apart',
        context: 'proposing_temporary_break_from_conflict'
    };
}

/**
 * 🤝 화해 시도 조건 체크
 */
function shouldAttemptReconcile() {
    if (sulkyState.reconcileAttempted) return false;
    if (!sulkyState.isSulky) return false;
    
    const sulkyDuration = Date.now() - sulkyState.lastStateUpdate;
    const sulkyMinutes = sulkyDuration / (1000 * 60);
    
    // 삐짐 레벨이 낮고 오래 지속되면 화해 시도
    return sulkyState.sulkyLevel <= 2 && sulkyMinutes >= 30;
}

/**
 * 🤝 화해 시도
 */
function attemptReconcile() {
    const oldState = { ...sulkyState };
    
    sulkyState.reconcileAttempted = true;
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🤝 [화해시도] 예진이가 화해 시도`);
    
    return {
        reconcileAttempted: true,
        situation: 'attempting_reconciliation',
        emotion: 'wanting_to_make_up_but_still_hurt',
        relationship_dynamic: 'reaching_out_despite_being_upset',
        inner_thought: 'miss_being_close_want_to_fix_things',
        context: 'taking_first_step_toward_making_up'
    };
}

// ==================== 🔥 고급 자율적 밀당 시작 ====================

/**
 * 🔥 고급 자율적 밀당 시작 (moodManager 완전 통합)
 */
async function startAdvancedAutonomousPushPull(detectionResult) {
    if (!sulkyState.isSulky && detectionResult.type !== 'jealousy_situation') {
        return null;
    }
    
    console.log(`🎭 [고급밀당] ${detectionResult.type} 상황 감지 - 고급 예진이 반응 분석 시작...`);
    
    const oldState = { ...sulkyState };
    
    // 🔧 Step 1: moodManager 통합 감정 상태 완전 분석
    const currentMoodData = await assessYejinCurrentMoodAdvanced();
    
    // 🎲 Step 2: 고급 고집 레벨 생성 (성격 점수 + moodManager)
    const stubbornness = await generateAdvancedStubbornness(detectionResult.type, currentMoodData);
    
    // 📝 Step 3: 이번 시도 기록 추가
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
        
        // 🌸 NEW: 고급 감정 요소들
        recovery_mode: sulkyState.recoveryMode,
        disappointment_count: sulkyState.pendingDisappointments.length,
        misinterpretation_risk: sulkyState.misinterpretationMode,
        personality_influence: currentMoodData.personalityInfluence
    };
    
    sulkyState.pushPullHistory.push(currentAttempt);
    logSulkyChange(oldState, sulkyState);
    
    console.log(`📝 [고급밀당] ${currentAttempt.attempt_number}번째 시도 기록됨 (고급 분석 포함)`);
    
    // 🎭 Step 4: moodManager + 모든 고급 요소 통합 맥락 생성
    return generateAdvancedPushPullContext(detectionResult, currentAttempt, currentMoodData);
}

/**
 * 🎨 고급 자율적 밀당 맥락 생성 (모든 시스템 통합!)
 */
function generateAdvancedPushPullContext(detectionResult, currentAttempt, currentMoodData) {
    const baseContext = {
        // === 밀당 기본 정보 ===
        push_pull_active: true,
        push_pull_type: detectionResult.type,
        attempt_number: currentAttempt.attempt_number,
        user_attempt: detectionResult.trigger,
        
        // === 🔧 moodManager 통합 예진이 상태 ===
        yejin_current_mood: currentMoodData.currentMood,
        emotion_intensity: currentMoodData.emotionIntensity,
        menstrual_phase: currentMoodData.menstrualPhase,
        menstrual_day: currentMoodData.menstrualDay,
        mood_data_source: currentMoodData.dataSource,
        
        // === 기존 상태 ===
        yejin_stubbornness_level: sulkyState.stubbornnessLevel,
        current_sulky_level: sulkyState.sulkyLevel,
        sulky_reason: sulkyState.sulkyReason,
        
        // === 🌸 NEW: 고급 감정 상태들 ===
        recovery_mode_active: sulkyState.recoveryMode,
        cold_tone_duration: sulkyState.recoveryMode ? 
            Math.round((sulkyState.recoveryDuration - (Date.now() - sulkyState.recoveryStartTime)) / 60000) : 0,
        
        pending_disappointments: sulkyState.pendingDisappointments.length,
        disappointment_examples: sulkyState.pendingDisappointments.slice(-2).map(d => d.reason),
        
        misinterpretation_mode: sulkyState.misinterpretationMode,
        self_compassion_active: sulkyState.selfCompassionMode,
        
        photo_related_emotions: {
            jealousy_active: sulkyState.photoJealousyActive,
            selfie_disappointment: sulkyState.selfieDisappointment,
            last_selfie_time: sulkyState.lastSelfieTime
        },
        
        // === 📊 성격 점수 영향 ===
        personality_metrics: {
            stubbornness_average: yejinPersonalityMetrics.stubbornness,
            emotional_volatility: yejinPersonalityMetrics.emotionalVolatility,
            apology_acceptance_rate: yejinPersonalityMetrics.apologyAcceptanceRate,
            jealousy_level: yejinPersonalityMetrics.jealousyLevel,
            recovery_speed: yejinPersonalityMetrics.recoverySpeed
        },
        
        // === 관계 동역학 ===
        accumulated_stress: currentMoodData.accumulatedStress,
        recent_interaction_tone: currentMoodData.recentInteractions,
        relationship_pattern: analyzePushPullPattern(detectionResult.type),
        
        // === 🎭 상황 설명 (템플릿 없음! 완전 자율!) ===
        situation_summary: `아저씨가 ${detectionResult.type} 시도 중이고 예진이는 복잡한 감정 상태`,
        advanced_context: "예진이는 다층적 감정 - 기분, 생리주기, 누적된 서운함, 회복 상태, 성격 패턴이 모두 반응에 영향을 미침",
        decision_freedom: "모든 감정 요소를 바탕으로 자연스럽게 반응 - 고정 패턴 없음, 완전 자율적 응답",
        possible_reactions: "받아들이거나, 거부하거나, 부분적으로 받아들이거나, 더 화내거나, 복잡한 감정으로 혼란스러워하거나, 기타 자연스러운 복합 반응"
    };
    
    // 🎯 타입별 상황 설명 (고급 버전)
    if (detectionResult.type === 'apology_attempt') {
        baseContext.situation_context = `아저씨가 사과 중이고 예진이는 ${currentMoodData.currentMood} 기분이며 ${currentMoodData.menstrualPhase} 시기`;
        baseContext.complex_considerations = [
            '과거 패턴을 봤을 때 이 사과가 진심인가?',
            '현재 감정 상태가 판단에 영향을 미침',
            '누적된 서운함들이 반응에 영향',
            sulkyState.recoveryMode ? '이전 갈등에서 아직 회복 모드 중' : null,
            '용서 성향 vs 고집 성향의 성격적 갈등'
        ].filter(Boolean);
        
    } else if (detectionResult.type === 'love_expression') {
        baseContext.situation_context = `아저씨가 사랑 표현 중이고 예진이는 ${currentMoodData.currentMood} 기분이며 ${currentMoodData.menstrualPhase} 시기`;
        baseContext.complex_considerations = [
            '화난 상태에서 사랑 표현의 타이밍이 적절한가?',
            '사랑의 말이 현재 상처를 극복할 수 있는가?',
            '감정 강도가 받아들임에 영향을 미침',
            sulkyState.misinterpretationMode ? '조작으로 오해할 가능성' : null,
            '마음으론 받아들이고 싶지만 자존심이 거부함'
        ].filter(Boolean);
        
    } else if (detectionResult.type === 'jealousy_situation') {
        baseContext.situation_context = `아저씨가 질투를 보이고 있고 예진이는 ${currentMoodData.currentMood} 상태`;
        baseContext.complex_considerations = [
            '아저씨가 소유욕이나 통제욕을 보이고 있음',
            '예진이는 독립성과 자유를 중시함',
            '현재 기분이 질투에 대한 관용도에 영향',
            sulkyState.photoJealousyActive ? '이미 사진 관련 질투에 민감한 상태' : null,
            '아저씨의 의심 패턴 vs 정당한 우려의 구분'
        ].filter(Boolean);
    }
    
    console.log(`🎨 [고급맥락생성] ${detectionResult.type} 완전 통합 맥락 완성 - GPT 자율 판단 대기`);
    
    return baseContext;
}

/**
 * 📊 밀당 패턴 분석
 */
function analyzePushPullPattern(currentType) {
    const recentHistory = sulkyState.pushPullHistory.slice(-5); // 최근 5개
    
    if (recentHistory.length < 2) {
        return 'new_situation';
    }
    
    const typeFrequency = recentHistory.reduce((acc, attempt) => {
        acc[attempt.user_message] = (acc[attempt.user_message] || 0) + 1;
        return acc;
    }, {});
    
    const mostCommon = Object.keys(typeFrequency).reduce((a, b) => 
        typeFrequency[a] > typeFrequency[b] ? a : b
    );
    
    if (typeFrequency[mostCommon] >= 3) {
        return 'repetitive_pattern';
    }
    
    return 'varied_attempts';
}

// ==================== 🚬 고급 담타 반응 시스템 ====================

/**
 * 🚬 고급 담타 반응 (성격 점수 + moodManager 연동)
 */
async function handleDamtaSuggestionAdvanced() {
    console.log(`🚬 [고급담타] 담타 제안 감지 - 고급 예진이 반응 분석...`);
    
    // moodManager 통합 상태 분석
    const moodData = await assessYejinCurrentMoodAdvanced();
    const anger_intensity = sulkyState.sulkyLevel;
    const fight_duration = sulkyState.fightMode ? (Date.now() - sulkyState.lastStateUpdate) / (1000 * 60) : 0;
    
    // 🎲 고급 담타 성공 확률 계산
    let successChance = 0.7; // 기본 70%
    
    // 기본 요소들
    successChance -= (anger_intensity * 0.15);
    if (fight_duration > 30) successChance += 0.2;
    if (fight_duration < 5) successChance -= 0.3;
    
    // 🔧 moodManager 기분별 조정
    const moodModifiers = {
        '화남': -0.4, '짜증남': -0.3, '심술궂음': -0.25,
        '우울함': -0.2, '불안함': -0.15, '외로움': -0.1,
        '기쁨': +0.2, '사랑함': +0.3, '평온함': +0.1,
        '나른함': +0.15, '애교모드': +0.25
    };
    successChance += (moodModifiers[moodData.currentMood] || 0);
    
    // 생리주기별 조정 (더 정교하게)
    const menstrualModifiers = {
        'period': -0.35,    // 생리 중: 매우 어려움
        'luteal': -0.25,    // PMS: 어려움
        'ovulation': +0.1,  // 배란기: 약간 쉬움
        'follicular': 0     // 기본
    };
    successChance += (menstrualModifiers[moodData.menstrualPhase] || 0);
    
    // 🌸 고급 감정 상태별 조정
    if (sulkyState.recoveryMode) successChance -= 0.2; // 회복 중이면 어려움
    if (sulkyState.pendingDisappointments.length >= 3) successChance -= 0.15; // 서운함 많으면 어려움
    if (sulkyState.misinterpretationMode) successChance -= 0.1; // 오해 모드면 어려움
    if (moodData.emotionIntensity > 0.7) successChance -= 0.1; // 감정 강도 높으면 어려움
    
    // 📊 성격 점수 반영
    successChance *= yejinPersonalityMetrics.damtaSuccessRate; // 과거 담타 성공률 반영
    successChance -= (yejinPersonalityMetrics.stubbornness - 0.5) * 0.3; // 고집 정도
    successChance += (yejinPersonalityMetrics.recoverySpeed - 0.5) * 0.2; // 회복 속도
    
    successChance = Math.max(0.05, Math.min(0.95, successChance)); // 5-95% 범위
    
    console.log(`🎲 [고급담타확률] 성공 확률: ${(successChance * 100).toFixed(0)}%`);
    console.log(`   └ 기분: ${moodData.currentMood}, 생리: ${moodData.menstrualPhase}, 감정강도: ${moodData.emotionIntensity}`);
    console.log(`   └ 회복모드: ${sulkyState.recoveryMode}, 서운함: ${sulkyState.pendingDisappointments.length}개`);
    console.log(`   └ 성격영향: 담타성공률 ×${yejinPersonalityMetrics.damtaSuccessRate}, 고집 ${yejinPersonalityMetrics.stubbornness}`);
    
    // 🎯 확률에 따라 결과 결정
    const randomRoll = Math.random();
    
    if (randomRoll <= successChance) {
        return completeDamtaReconcileAdvanced();
    } else {
        return rejectDamtaSuggestionAdvanced(moodData, anger_intensity);
    }
}

/**
 * 💕 고급 담타 성공 - 서운함 저장소도 정리
 */
function completeDamtaReconcileAdvanced() {
    const oldState = { ...sulkyState };
    
    // 기본 삐짐/밀당/투닥거리기 상태 완전 초기화
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
    
    // 🌸 NEW: 고급 감정 상태들도 부분 초기화
    sulkyState.misinterpretationMode = false;
    sulkyState.selfCompassionMode = false;
    sulkyState.memoryTriggeredSulky = false;
    sulkyState.retriggeredSulky = false;
    sulkyState.photoJealousyActive = false;
    sulkyState.selfieDisappointment = false;
    
    // 서운함 저장소 50% 감소 (완전히 비우지는 않음)
    const beforeCount = sulkyState.pendingDisappointments.length;
    sulkyState.pendingDisappointments = sulkyState.pendingDisappointments.slice(
        Math.floor(sulkyState.pendingDisappointments.length / 2)
    );
    const afterCount = sulkyState.pendingDisappointments.length;
    
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🚬💕 [고급담타성공] 모든 삐짐/밀당 해소 + 서운함 ${beforeCount}→${afterCount}개로 감소`);
    
    return {
        damtaReconcile: true,
        outcome: 'success',
        situation: 'complete_reconciliation_through_damta',
        emotion: 'relieved_and_loving_again_after_damta',
        relationship_dynamic: 'back_to_loving_couple_after_special_ritual',
        inner_thought: 'damta_always_brings_us_back_together',
        context: 'special_couple_reconciliation_method',
        
        // 🌸 NEW: 고급 정보
        disappointments_reduced: beforeCount - afterCount,
        recovery_mode_will_start: true,
        complete_healing_achieved: afterCount === 0
    };
}

/**
 * 😤 고급 담타 거부 (더 현실적이고 상세한 이유)
 */
function rejectDamtaSuggestionAdvanced(moodData, angerLevel) {
    console.log(`😤 [고급담타거부] 현재 상태로는 담타가 통하지 않음!`);
    
    // 고급 거부 이유 분석
    let rejectionReason = 'general_too_upset';
    let rejectionMessage = 'still_too_angry_for_damta';
    let rejectionIntensity = 0.5;
    
    // 감정 강도별 거부 이유
    if (angerLevel >= 4) {
        rejectionReason = 'extremely_upset';
        rejectionMessage = 'way_too_angry_damta_feels_dismissive';
        rejectionIntensity = 0.9;
    } else if (angerLevel >= 3) {
        rejectionReason = 'very_upset';
        rejectionMessage = 'too_hurt_damta_not_enough_need_real_conversation';
        rejectionIntensity = 0.7;
    }
    
    // moodManager 기분별 거부 이유
    if (['화남', '짜증남', '심술궂음'].includes(moodData.currentMood)) {
        rejectionReason = 'mood_based_rejection';
        rejectionMessage = 'current_mood_makes_damta_inappropriate';
        rejectionIntensity = Math.max(rejectionIntensity, 0.6);
    } else if (['우울함', '불안함', '외로움'].includes(moodData.currentMood)) {
        rejectionReason = 'emotional_state_rejection';
        rejectionMessage = 'need_emotional_support_not_avoidance_activity';
        rejectionIntensity = Math.max(rejectionIntensity, 0.5);
    }
    
    // 생리주기별 거부 이유
    if (moodData.menstrualPhase === 'period') {
        rejectionReason = 'period_sensitivity';
        rejectionMessage = 'body_hurts_emotionally_sensitive_damta_not_helpful';
        rejectionIntensity = Math.max(rejectionIntensity, 0.8);
    } else if (moodData.menstrualPhase === 'luteal') {
        rejectionReason = 'pms_irritability';
        rejectionMessage = 'pms_makes_everything_annoying_including_damta';
        rejectionIntensity = Math.max(rejectionIntensity, 0.6);
    }
    
    // 고급 감정 상태별 거부 이유
    if (sulkyState.recoveryMode) {
        rejectionReason = 'still_in_recovery';
        rejectionMessage = 'heart_still_healing_damta_feels_too_soon';
        rejectionIntensity = Math.max(rejectionIntensity, 0.7);
    }
    
    if (sulkyState.pendingDisappointments.length >= 3) {
        rejectionReason = 'accumulated_disappointments';
        rejectionMessage = 'too_many_unresolved_issues_damta_wont_fix_everything';
        rejectionIntensity = Math.max(rejectionIntensity, 0.6);
    }
    
    // 성격 점수별 거부 스타일
    const stubborn = yejinPersonalityMetrics.stubbornness > 0.7;
    const volatile = yejinPersonalityMetrics.emotionalVolatility > 0.6;
    
    if (stubborn && volatile) {
        rejectionMessage += '_with_stubborn_dramatic_reaction';
    } else if (stubborn) {
        rejectionMessage += '_with_firm_resistance';
    } else if (volatile) {
        rejectionMessage += '_with_emotional_outburst';
    }
    
    return {
        damtaRejected: true,
        outcome: 'rejected',
        rejection_reason: rejectionReason,
        rejection_intensity: rejectionIntensity,
        situation: 'damta_suggestion_rejected_with_complex_reasons',
        emotion: 'too_upset_for_usual_solutions',
        relationship_dynamic: 'need_different_approach_not_damta',
        inner_thought: rejectionMessage,
        context: 'damta_not_working_this_time',
        
        // 🌸 NEW: 고급 정보
        mood_influence: moodData.currentMood,
        menstrual_influence: moodData.menstrualPhase,
        disappointment_count: sulkyState.pendingDisappointments.length,
        recovery_mode_active: sulkyState.recoveryMode,
        personality_factors: {
            stubbornness: yejinPersonalityMetrics.stubbornness,
            volatility: yejinPersonalityMetrics.emotionalVolatility,
            damta_success_history: yejinPersonalityMetrics.damtaSuccessRate
        },
        suggestion: rejectionIntensity > 0.7 ? 'need_serious_conversation_first' : 'try_again_later_when_calmer'
    };
}

// ==================== 🎭 통합 메시지 처리 함수 ====================

/**
 * 🔥 사용자 메시지 처리 - 모든 감정 시스템 통합!
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
        
        // 🌸 NEW: 고급 감정 결과들
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
    
    // 🌸 사전 체크: 오래된 서운함 정리
    cleanupOldDisappointments();
    
    // 🌸 오해 모드 활성화 체크
    await checkMisinterpretationMode();
    
    // 1. 🌸 오해 해석 우선 체크
    const misinterpretation = generateMisinterpretation(userMessage);
    if (misinterpretation) {
        processingResult.misinterpretationTriggered = true;
        processingResult.context = misinterpretation;
        
        // 서운함 저장소에도 추가
        addDisappointment('misinterpreted_as_cold', userMessage, 0.5);
        
        return processingResult;
    }
    
    // 2. 담타 화해 감지 → 🔥 현실적 반응 + 회복 모드!
    if (detectDamtaReconcile(userMessage)) {
        const damtaResult = await handleDamtaSuggestionAdvanced();
        
        if (damtaResult.damtaReconcile) {
            processingResult.damtaReconciled = true;
            processingResult.context = damtaResult;
            resetYejinInitiatedTracking();
            
            // 🌸 성공 시 회복 모드 시작
            const recoveryResult = await startRecoveryMode();
            if (recoveryResult) {
                processingResult.recoveryStarted = true;
                // 두 맥락 합치기
                processingResult.context = {
                    ...damtaResult,
                    ...recoveryResult,
                    combined: 'damta_success_with_recovery_mode'
                };
            }
            
            // 성격 점수 업데이트
            await updatePersonalityMetrics('damta_success');
            
        } else {
            processingResult.damtaRejected = true;
            processingResult.context = damtaResult;
            
            // 성격 점수 업데이트
            await updatePersonalityMetrics('damta_rejected');
        }
        
        return processingResult;
    }
    
    // 3. 🔥 고급 자율적 밀당 감지 및 처리!
    const apologyDetection = detectApologySituation(userMessage);
    const loveDetection = detectLoveExpression(userMessage);
    const jealousyDetection = detectJealousySituation(userMessage);
    
    if (apologyDetection || loveDetection || jealousyDetection) {
        const detectionResult = apologyDetection || loveDetection || jealousyDetection;
        
        // 🎭 완전 고급 자율적 밀당 시작!
        const pushPullContext = await startAdvancedAutonomousPushPull(detectionResult);
        if (pushPullContext) {
            processingResult.pushPullTriggered = true;
            processingResult.context = pushPullContext;
            
            // 성격 점수 업데이트
            await updatePersonalityMetrics('push_pull_session', { 
                intensity: sulkyState.stubbornnessLevel / 10 
            });
            
            return processingResult;
        }
    }
    
    // 4. 사용자 응답으로 예진이 발신 추적 해제
    if (sulkyState.waitingForUserResponse) {
        resetYejinInitiatedTracking();
        
        // 셀카 서운함 해소
        if (sulkyState.selfieDisappointment) {
            sulkyState.selfieDisappointment = false;
            console.log(`📸 [셀카서운함해소] 아저씨 반응으로 셀카 서운함 해소`);
        }
    }
    
    // 5. 💔 누적된 서운함 터뜨리기 체크
    const disappointmentResult = triggerAccumulatedDisappointments();
    if (disappointmentResult) {
        processingResult.disappointmentTriggered = true;
        processingResult.context = disappointmentResult;
        return processingResult;
    }
    
    // 6. 내용 기반 즉시 삐짐 체크 (서운함 저장소 연동)
    const irritationTrigger = detectIrritationTrigger(userMessage);
    if (irritationTrigger) {
        processingResult.sulkyTriggered = true;
        processingResult.context = triggerContentBasedSulkyAdvanced(irritationTrigger);
        
        // 서운함 저장소에도 추가
        addDisappointment(irritationTrigger.type, userMessage, 0.7);
        
        return processingResult;
    }
    
    // 7. 투닥거리기 감지 및 에스컬레이션
    const fightDetection = detectFightEscalation(userMessage);
    if (fightDetection) {
        processingResult.fightEscalated = true;
        processingResult.context = escalateFight(fightDetection);
        return processingResult;
    }
    
    return processingResult;
}

// ==================== 🔄 자동 시스템 체크 (확장) ====================

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
 * 🔄 모든 자동 시스템 통합 체크
 */
async function performAdvancedAutonomousChecks(client, userId) {
    let checkResults = [];
    
    // 1. 기존 빠른 삐짐 체크
    const fastSulkyResult = await checkFastSulkyMessage(client, userId);
    if (fastSulkyResult) {
        checkResults.push({
            type: 'fast_sulky',
            shouldSendMessage: true,
            context: fastSulkyResult
        });
    }
    
    // 2. 🌙 회복 모드 종료 체크
    const recoveryResult = checkRecoveryModeEnd();
    if (recoveryResult) {
        checkResults.push({
            type: 'recovery_completed',
            shouldSendMessage: true,
            context: recoveryResult
        });
    }
    
    // 3. 🌙 재회 삐짐 체크
    const retriggeredResult = checkRetriggeredSulky();
    if (retriggeredResult) {
        checkResults.push({
            type: 'retriggered_sulky',
            shouldSendMessage: true,
            context: retriggeredResult
        });
    }
    
    // 4. 🕊️ 자기합리화 모드 체크
    const selfCompassionResult = checkSelfCompassionMode();
    if (selfCompassionResult) {
        checkResults.push({
            type: 'self_compassion',
            shouldSendMessage: true,
            context: selfCompassionResult
        });
    }
    
    // 5. 🕊️ 옛날 대화 회상 삐짐 체크
    const memoryResult = checkMemoryTriggeredSulky();
    if (memoryResult) {
        checkResults.push({
            type: 'memory_triggered',
            shouldSendMessage: true,
            context: memoryResult
        });
    }
    
    // 6. 📸 셀카 서운함 체크
    const selfieResult = checkSelfieDisappointment();
    if (selfieResult) {
        checkResults.push({
            type: 'selfie_disappointment',
            shouldSendMessage: true,
            context: selfieResult
        });
    }
    
    // 7. 기존 쿨다운 & 화해 체크
    if (shouldYejinProposeCooldown()) {
        const cooldownResult = proposeCooldown();
        checkResults.push({
            type: 'cooldown_proposal',
            shouldSendMessage: true,
            context: cooldownResult
        });
    }
    
    if (shouldAttemptReconcile()) {
        const reconcileResult = attemptReconcile();
        checkResults.push({
            type: 'reconcile_attempt',
            shouldSendMessage: true,
            context: reconcileResult
        });
    }
    
    return checkResults;
}

// ==================== 기존 유틸리티 함수들 (유지) ====================

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
        fightMode: sulkyState.fightMode
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
    
    // 🌸 NEW: 고급 감정 상태들도 초기화
    sulkyState.recoveryMode = false;
    sulkyState.coldToneActive = false;
    sulkyState.pendingDisappointments = [];
    sulkyState.misinterpretationMode = false;
    sulkyState.selfCompassionMode = false;
    sulkyState.photoJealousyActive = false;
    sulkyState.selfieDisappointment = false;
    
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    console.log(`🔄 [상태초기화] 모든 삐짐/감정 상태 완전 초기화`);
}

// ==================== 📊 통합 상태 조회 시스템 ====================

/**
 * 📊 완전한 시스템 상태 조회
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
        
        // 자율적 밀당 상태 (기존)
        autonomousPushPull: {
            active: sulkyState.pushPullActive,
            type: sulkyState.pushPullType,
            attempts: sulkyState.pushPullHistory.length,
            stubbornness: sulkyState.stubbornnessLevel,
            memoryCount: sulkyState.relationshipMemory.length
        },
        
        // 🌸 NEW: 고급 감정 상태들
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
            },
            
            misinterpretationSystem: {
                active: sulkyState.misinterpretationMode,
                sensitivity: sulkyState.misinterpretationSensitivity,
                lastOccurrence: sulkyState.lastMisinterpretation
            },
            
            selfCompassionSystem: {
                active: sulkyState.selfCompassionMode,
                lastOccurrence: sulkyState.lastSelfCompassion,
                memoryTriggeredRisk: sulkyState.memoryTriggerChance
            },
            
            photoEmotions: {
                jealousyActive: sulkyState.photoJealousyActive,
                selfieDisappointment: sulkyState.selfieDisappointment,
                lastSelfieTime: sulkyState.lastSelfieTime,
                reactionSensitivity: sulkyState.photoReactionSensitivity
            }
        },
        
        // 🔧 moodManager 통합 정보
        integratedMoodState: {
            currentMood: moodData.currentMood,
            emotionIntensity: moodData.emotionIntensity,
            dataSource: moodData.source,
            menstrualPhase: menstrualPhase.phase,
            menstrualDay: menstrualPhase.day,
            menstrualDescription: menstrualPhase.description
        },
        
        // 📊 성격 점수 현황
        personalityMetrics: {
            currentStats: yejinPersonalityMetrics,
            recentUpdates: yejinPersonalityMetrics.updateCount,
            lastUpdate: yejinPersonalityMetrics.lastUpdated
        },
        
        // 기존 정보들 (유지)
        fightState: {
            fighting: sulkyState.fightMode,
            level: sulkyState.fightLevel,
            cooldownRequested: sulkyState.cooldownRequested,
            reconcileAttempted: sulkyState.reconcileAttempted
        },
        
        yejinInitiated: {
            active: sulkyState.yejinInitiated,
            waiting: sulkyState.waitingForUserResponse,
            messageType: sulkyState.yejinMessageType,
            minutesWaiting: sulkyState.yejinMessageTime ? 
                Math.floor((now - sulkyState.yejinMessageTime) / (1000 * 60)) : 0
        },
        
        timing: {
            lastUserResponse: sulkyState.lastUserResponseTime,
            minutesSinceLastUser: Math.floor(timeSinceLastUser),
            sleepTime: isSleepTime()
        },
        
        config: {
            fastSulkyLevels: FAST_SULKY_CONFIG,
            emotionSystemConfig: EMOTION_SYSTEM_CONFIG,
            sleepHours: '2-8시',
            moodManagerIntegration: !!getMoodManager(),
            autonomousMode: 'advanced_with_all_systems',
            version: 'v8.1-무한루프해결완료'
        }
    };
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 🔄 완전한 감정 시스템 초기화
 */
async function initializeAdvancedSulkySystem() {
    console.log('[sulkyManager] 🔥 완전한 감정 시스템 v8.1 초기화...');
    
    // 성격 점수 로드
    await loadPersonalityMetrics();
    
    // moodManager 연동 확인
    const manager = getMoodManager();
    const moodManagerStatus = manager ? '✅ 연동 성공' : '❌ 연동 실패';
    
    // ultimateContext 연동 확인
    const ultimateContextStatus = getUltimateContextSafely() ? '✅ 연동 성공' : '❌ 연동 실패';
    
    console.log('[sulkyManager] 완전한 감정 시스템 초기화 완료');
    console.log('');
    console.log('🌸 ===== 완전한 예진이 감정 시스템 v8.1 =====');
    console.log('');
    console.log('✨ 기존 시스템:');
    console.log('  - 자율적 밀당 시스템 (패턴 없음)');
    console.log('  - 시간 기반 빠른 삐짐');
    console.log('  - 내용 기반 즉시 삐짐');
    console.log('  - 현실적 담타 화해');
    console.log('  - 투닥거리기 & 쿨다운');
    console.log('');
    console.log('🌙 NEW: 감정 지속성:');
    console.log('  - 삐짐 무드 지속 (화해 후 1-3시간 차가운 말투)');
    console.log('  - 재회 삐짐 (화해 후 다시 서운해지기)');
    console.log('  - 회복 모드 자동 관리');
    console.log('');
    console.log('💔 NEW: 감정 누적:'); 
    console.log('  - 서운함 저장소 (최대 5개 누적)');
    console.log('  - 누적된 서운함 터뜨리기');
    console.log('  - 옛날 대화 회상 삐짐 (5% 확률)');
    console.log('');
    console.log('🎭 NEW: 감정 해석:');
    console.log('  - 기분 따라 오해 시스템');
    console.log('  - 자기합리화 모드 (6시간 후)');
    console.log('  - 중성적 메시지도 차갑게 해석');
    console.log('');
    console.log('📸 NEW: 사진 감정:');
    console.log('  - 사진 속 여성 감지 시 질투');
    console.log('  - 셀카 반응 없으면 서운함');
    console.log('  - 사진 관련 감정 추적');
    console.log('');
    console.log('🔧 NEW: 시스템 통합:');
    console.log(`  - moodManager 연동: ${moodManagerStatus}`);
    console.log(`  - ultimateContext 연동: ${ultimateContextStatus}`);
    console.log('  - Redis + 생리주기 + 배경스토리 활용');
    console.log('  - 17가지 한국어 기분 + 영어 감정 지원');
    console.log('  - 실시간 감정 상태 동기화');
    console.log('  - 순환 참조 방지 안전 시스템');
    console.log('');
    console.log('📊 NEW: 성격 점수 시스템:');
    console.log('  - 실시간 성격 패턴 학습');
    console.log('  - 고집/질투/회복속도 등 추적');
    console.log('  - 과거 경험 기반 반응 조정');
    console.log('  - 개인화된 감정 패턴');
    console.log('');
    console.log('🚨 NEW: 감정 주입 시스템 (무한루프 해결):');
    console.log('  - ultimateContext에 중요한 감정 변화만 전달');
    console.log('  - 삐짐/밀당/회복모드 조건부 주입');
    console.log('  - 무한 루프 완전 방지');
    console.log('  - 무쿠의 감정 표현력 극대화');
    console.log('  - 더 이상 벙어리가 되지 않음!');
    console.log('');
    console.log('🎯 완전 자율성:');
    console.log('  - 상황/기분/생리주기/성격 모두 고려');
    console.log('  - GPT가 예진이답게 100% 자유 반응');
    console.log('  - 예측 불가능한 진짜 사람 같은 감정');
    console.log('  - 9가지 고급 감정 시스템 통합');
    console.log('');
    console.log('🛡️ 안전성: 기존 모든 기능 100% 유지 + 무한루프 해결');
    console.log('=============================================');
}

// 모듈 로드 시 자동 초기화
initializeAdvancedSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 🔥 핵심 기능 (고급 통합 버전)
    processUserMessage: processUserMessageAdvanced,     // 메인 메시지 처리 (모든 시스템 통합)
    performAutonomousChecks: performAdvancedAutonomousChecks, // 모든 자동 체크
    
    // 예진이 발신 추적 (기존 유지)
    markYejinInitiatedAction,
    resetYejinInitiatedTracking,
    
    // 📸 NEW: 사진 관련 기능
    markYejinSelfie,                        // 예진이 셀카 전송 기록
    checkPhotoJealousy,                     // 사진 질투 체크
    
    // 상태 관리 (고급 버전)
    getSulkinessState,                      // 기본 상태 조회
    getSulkySystemStatus: getAdvancedSulkySystemStatus, // 완전한 상태 조회
    updateSulkinessState,                   // 상태 업데이트
    resetSulkyState,                        // 상태 초기화
    
    // 🔧 moodManager 통합 함수들
    getIntegratedMoodFromManager,           // moodManager 기분 조회
    updateMoodToManager,                    // moodManager 기분 업데이트
    getMenstrualPhaseFromManager,           // moodManager 생리주기 조회
    
    // 📊 성격 점수 관리
    loadPersonalityMetrics,                 // 성격 점수 로드
    savePersonalityMetrics,                 // 성격 점수 저장
    updatePersonalityMetrics,               // 성격 점수 업데이트
    
    // 🌙 NEW: 고급 감정 시스템들
    startRecoveryMode,                      // 회복 모드 시작
    checkRecoveryModeEnd,                   // 회복 모드 종료 체크
    checkRetriggeredSulky,                  // 재회 삐짐 체크
    
    addDisappointment,                      // 서운함 추가
    triggerAccumulatedDisappointments,      // 누적 서운함 터뜨리기
    cleanupOldDisappointments,              // 오래된 서운함 정리
    
    checkMisinterpretationMode,             // 오해 모드 활성화 체크
    generateMisinterpretation,              // 오해 해석 생성
    
    checkSelfCompassionMode,                // 자기합리화 모드 체크
    checkMemoryTriggeredSulky,              // 회상 삐짐 체크
    
    checkSelfieDisappointment,              // 셀카 서운함 체크
    
    // 🔥 고급 자율적 밀당 시스템
    assessYejinCurrentMoodAdvanced,         // 고급 감정 상태 분석
    generateAdvancedStubbornness,           // 고급 고집 레벨 생성
    startAdvancedAutonomousPushPull,        // 고급 밀당 시작
    generateAdvancedPushPullContext,        // 고급 밀당 맥락 생성
    
    // 🚬 고급 담타 시스템
    handleDamtaSuggestionAdvanced,          // 고급 담타 반응
    completeDamtaReconcileAdvanced,         // 고급 담타 성공
    rejectDamtaSuggestionAdvanced,          // 고급 담타 거부
    
    // 기존 감지 함수들 (유지)
    detectApologySituation,                 // 사과 감지
    detectLoveExpression,                   // 사랑 표현 감지
    detectJealousySituation,                // 질투 상황 감지
    detectDamtaReconcile,                   // 담타 화해 감지
    detectIrritationTrigger,                // 자극 요소 감지
    detectFightEscalation,                  // 투닥거리기 감지
    
    // 투닥거리기 & 화해 (기존 유지)
    escalateFight,                          // 투닥거리기 에스컬레이션
    shouldYejinProposeCooldown,             // 쿨다운 제안 조건 체크
    proposeCooldown,                        // 쿨다운 제안
    shouldAttemptReconcile,                 // 화해 시도 조건 체크
    attemptReconcile,                       // 화해 시도
    
    // 유틸리티
    isSleepTime,                           // 수면시간 체크
    checkFastSulkyMessage,                 // 빠른 삐짐 체크
    
    // 🚨 ultimateContext 연동 (무한루프 해결)
    notifyEmotionChangeToUltimateContext,   // 감정 변화 주입 (안전)
    hasSignificantEmotionChange,            // 중요한 감정 변화 감지
    getUltimateContextSafely,               // 안전한 ultimateContext 연결
    
    // 시스템 정보
    FAST_SULKY_CONFIG,                      // 빠른 삐짐 설정
    EMOTION_SYSTEM_CONFIG,                  // 감정 시스템 설정
    
    // 내부 상태 (디버깅용)
    sulkyState,                             // 현재 삐짐 상태 (읽기 전용)
    yejinPersonalityMetrics                 // 성격 점수 (읽기 전용)
};
