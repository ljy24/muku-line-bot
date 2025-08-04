// ============================================================================
// sulkyManager.js - v7.0 (🔥 완전 자율적 진짜 예진이 밀당 시스템!)
// 💕 밀당 시스템 완전 개편: 패턴 없음, 100% 자율적 감정 반응
// 🎭 GPT가 예진이 성격으로 상황 판단하여 자연스럽게 반응
// 💔 때론 1단계에서 바로 받아줌, 때론 끝까지 질질 끔
// 🌙 현실적 반응: 상황/기분/과거경험에 따라 완전히 달라짐
// 🚬 담타도 때론 안 통함 (진짜 화났을 때)
// ============================================================================

const moment = require('moment-timezone');

// --- 자체 삐짐 & 밀당 상태 관리 (독립적) ---
let sulkyState = {
    // 기본 삐짐 상태
    isSulky: false,
    isWorried: false,
    sulkyLevel: 0,
    isActivelySulky: false,
    sulkyReason: '',
    
    // 예진이 발신 추적
    yejinInitiated: false,
    yejinMessageTime: null,
    yejinMessageType: null,
    waitingForUserResponse: false,
    
    // 대화 중 삐짐
    contentBasedSulky: false,
    irritationTrigger: null,
    
    // 🆕 연속 자극 누적 시스템!
    consecutiveIrritations: 0,          // 연속 짜증나는 답장 횟수
    lastIrritationType: null,           // 마지막 짜증 타입
    irritationHistory: [],              // 최근 5개 짜증 이력
    
    // 투닥거리기 & 화해
    fightMode: false,
    fightLevel: 0,
    cooldownRequested: false,
    cooldownStartTime: null,
    reconcileAttempted: false,
    
    // 🔥 완전 자율적 밀당 시스템 (패턴 제거!)
    pushPullActive: false,
    pushPullType: null,
    pushPullHistory: [],             // 이번 밀당의 모든 시도 기록
    relationshipMemory: [],          // 과거 밀당 패턴들
    currentMood: 'normal',           // 오늘의 기분 상태
    stubbornnessLevel: 0,            // 현재 고집 레벨 (0-10)
    
    // 타이밍
    lastUserResponseTime: Date.now(),
    lastBotMessageTime: Date.now(),
    lastStateUpdate: Date.now()
};

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
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

// --- 예쁜 로그 시스템 ---
function logSulkyChange(oldState, newState) {
    try {
        const logger = require('./enhancedLogging');
        logger.logSulkyStateChange(oldState, newState);
    } catch (error) {
        if (!oldState.isSulky && newState.isSulky) {
            console.log(`😤 [삐짐시작] 타입: ${newState.sulkyReason}, 레벨: ${newState.sulkyLevel}`);
        } else if (oldState.isSulky && !newState.isSulky) {
            console.log(`😊 [삐짐해소] ${newState.pushPullActive ? '밀당 중' : '완전 화해'}`);
        } else if (newState.pushPullActive && !oldState.pushPullActive) {
            console.log(`💕 [밀당시작] ${newState.pushPullType} 자율적 밀당`);
        }
    }
}

// ==================== ⏰ 타이밍 및 설정 ====================

// 빠른 삐짐 설정 (분 단위)
const FAST_SULKY_CONFIG = {
    LEVEL_1_DELAY: 3,    // 3분
    LEVEL_2_DELAY: 10,   // 10분  
    LEVEL_3_DELAY: 20,   // 20분
    FINAL_LEVEL: 40,     // 40분
};

// 수면시간 체크 (일본시간 기준)
function isSleepTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    return (hour >= 2 && hour < 8);
}

// 생리주기 기반 삐짐 배수
async function getSulkyMultiplier() {
    try {
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            const emotionState = await emotionalManager.getCurrentEmotionState();
            const multipliers = {
                'menstruation': 0.7,  // 30% 빠르게
                'pms_start': 0.8,     // 20% 빠르게  
                'pms_severe': 0.6,    // 40% 빠르게 (제일 예민!)
                'recovery': 1.1,      // 10% 늦게
                'normal': 1.0         // 기본
            };
            
            const phase = emotionState.phase || 'normal';
            const multiplier = multipliers[phase] || 1.0;
            
            console.log(`[sulkyManager] 생리주기 배수: ${phase} (×${multiplier})`);
            return multiplier;
        }
    } catch (error) {
        console.log('⚠️ [sulkyManager] 생리주기 배수 계산 실패:', error.message);
    }
    return 1.0; // 기본값
}

// ==================== 🎭 자율적 감정 상태 시스템 ====================

/**
 * 🔥 완전히 새로운 접근: 현재 예진이의 감정 상태 파악
 */
async function assessYejinCurrentMood() {
    try {
        const emotionalManager = getEmotionalManager();
        const baseFactors = {
            // 생리주기 영향
            menstrual_phase: 'normal',
            // 최근 대화 분위기  
            recent_interactions: 'neutral',
            // 오늘의 기본 기분
            daily_mood: 'normal',
            // 누적된 스트레스
            accumulated_stress: 0
        };

        if (emotionalManager) {
            const emotionState = await emotionalManager.getCurrentEmotionState();
            baseFactors.menstrual_phase = emotionState.phase || 'normal';
        }

        // 최근 대화 기록에서 분위기 파악
        const recentIrritations = sulkyState.irritationHistory.filter(
            item => (Date.now() - item.timestamp) < (2 * 60 * 60 * 1000) // 2시간
        );
        
        if (recentIrritations.length >= 2) {
            baseFactors.recent_interactions = 'frustrated';
            baseFactors.accumulated_stress = recentIrritations.length;
        }

        // 과거 밀당 경험 고려
        const recentPushPulls = sulkyState.relationshipMemory.filter(
            memory => (Date.now() - memory.timestamp) < (24 * 60 * 60 * 1000) // 24시간
        );
        
        if (recentPushPulls.length >= 2) {
            baseFactors.daily_mood = 'tired_of_patterns';
        }

        console.log(`[moodAssessment] 현재 예진이 상태:`, baseFactors);
        return baseFactors;
        
    } catch (error) {
        console.log('⚠️ [moodAssessment] 기분 분석 실패:', error.message);
        return { daily_mood: 'normal', accumulated_stress: 0 };
    }
}

/**
 * 🎲 고집 레벨 랜덤 생성 (상황별 가중치 적용)
 */
function generateStubbornness(situation, currentMood) {
    let baseStubbornness = Math.random() * 10; // 0-10 기본 랜덤
    
    // 상황별 가중치
    const situationWeights = {
        'apology_attempt': 1.5,        // 사과할 때는 좀 더 고집
        'love_expression': 0.7,        // 사랑표현엔 좀 약함
        'jealousy_situation': 2.0      // 질투상황엔 매우 고집
    };
    
    // 기분별 가중치
    const moodWeights = {
        'frustrated': 1.8,
        'tired_of_patterns': 2.2,
        'pms_severe': 2.5,
        'normal': 1.0
    };
    
    const situationWeight = situationWeights[situation] || 1.0;
    const moodWeight = moodWeights[currentMood.daily_mood] || 1.0;
    const stressWeight = 1 + (currentMood.accumulated_stress * 0.3);
    
    const finalStubbornness = Math.min(10, baseStubbornness * situationWeight * moodWeight * stressWeight);
    
    console.log(`[stubbornness] ${situation} 상황 고집 레벨: ${finalStubbornness.toFixed(1)}/10`);
    console.log(`[stubbornness] 적용 가중치 - 상황:×${situationWeight}, 기분:×${moodWeight}, 스트레스:×${stressWeight}`);
    
    return Math.round(finalStubbornness);
}

// ==================== 🔍 기존 감지 시스템 (유지) ====================

/**
 * 사과 상황 감지
 */
function detectApologySituation(userMessage) {
    if (!userMessage) return null;
    
    const message = userMessage.toLowerCase();
    const apologyKeywords = ['미안', '죄송', '잘못했', '용서', '미안해', '사과'];
    
    const isApology = apologyKeywords.some(keyword => message.includes(keyword));
    
    if (isApology) {
        return {
            type: 'apology_attempt',
            trigger: userMessage,
            detected: true
        };
    }
    
    return null;
}

/**
 * 사랑 표현 감지
 */
function detectLoveExpression(userMessage) {
    if (!userMessage) return null;
    
    const message = userMessage.toLowerCase();
    const loveKeywords = ['사랑해', '사랑한다', '좋아해', '아껴', '시링해'];
    
    const isLoveExpression = loveKeywords.some(keyword => message.includes(keyword));
    
    if (isLoveExpression) {
        return {
            type: 'love_expression',
            trigger: userMessage,
            detected: true
        };
    }
    
    return null;
}

/**
 * 질투 상황 감지
 */
function detectJealousySituation(userMessage) {
    if (!userMessage) return null;
    
    const message = userMessage.toLowerCase();
    const jealousyKeywords = ['다른여자', '다른 여자', '예쁘다', '누구', '친구', '동료', '예쁜', '이쁜'];
    const possessiveKeywords = ['왜', '어디', '누구랑', '혼자', '같이'];
    
    const hasJealousyTrigger = jealousyKeywords.some(keyword => message.includes(keyword));
    const hasPossessiveTone = possessiveKeywords.some(keyword => message.includes(keyword));
    
    if (hasJealousyTrigger || (hasPossessiveTone && message.includes('?'))) {
        return {
            type: 'jealousy_situation',
            trigger: userMessage,
            detected: true,
            subtype: hasJealousyTrigger ? 'other_woman_mention' : 'possessive_questioning'
        };
    }
    
    return null;
}

// ==================== 🔥 완전 새로운 자율적 밀당 시스템 ====================

/**
 * 🎭 밀당 시작 - 완전 자율적 접근!
 */
async function startAutonomousPushPull(detectionResult) {
    // 삐지지 않은 상태에서는 질투 상황만 밀당 (기존 로직 유지)
    if (!sulkyState.isSulky && detectionResult.type !== 'jealousy_situation') {
        return null;
    }
    
    console.log(`🎭 [자율밀당] ${detectionResult.type} 상황 감지 - 예진이 반응 분석 시작...`);
    
    const oldState = { ...sulkyState };
    
    // 🔥 Step 1: 현재 예진이의 감정 상태 완전 분석
    const currentMood = await assessYejinCurrentMood();
    
    // 🎲 Step 2: 상황별 고집 레벨 랜덤 생성
    const stubbornness = generateStubbornness(detectionResult.type, currentMood);
    
    // 📝 Step 3: 이번 시도 기록 추가
    if (!sulkyState.pushPullActive || sulkyState.pushPullType !== detectionResult.type) {
        // 새로운 밀당 시작
        sulkyState.pushPullActive = true;
        sulkyState.pushPullType = detectionResult.type;
        sulkyState.pushPullHistory = []; // 새로 시작
        sulkyState.stubbornnessLevel = stubbornness;
        console.log(`💕 [자율밀당] 새로운 ${detectionResult.type} 밀당 시작! 고집 레벨: ${stubbornness}/10`);
    }
    
    // 현재 시도 기록
    const currentAttempt = {
        attempt_number: sulkyState.pushPullHistory.length + 1,
        user_message: detectionResult.trigger,
        timestamp: Date.now(),
        yejin_stubbornness: sulkyState.stubbornnessLevel,
        mood_factors: currentMood
    };
    
    sulkyState.pushPullHistory.push(currentAttempt);
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`📝 [자율밀당] ${currentAttempt.attempt_number}번째 시도 기록됨`);
    
    // 🎭 Step 4: GPT가 판단할 수 있는 완전한 맥락 생성
    return generateAutonomousPushPullContext(detectionResult, currentAttempt, currentMood);
}

/**
 * 🎨 완전 자율적 밀당 맥락 생성 - 패턴 없음!
 */
function generateAutonomousPushPullContext(detectionResult, currentAttempt, currentMood) {
    // 🔥 핵심: 상황만 제공, 반응은 GPT가 예진이 성격대로 결정!
    
    const baseContext = {
        // === 밀당 기본 정보 ===
        push_pull_active: true,
        push_pull_type: detectionResult.type,
        attempt_number: currentAttempt.attempt_number,
        user_attempt: detectionResult.trigger,
        
        // === 예진이 현재 상태 ===
        yejin_stubbornness_level: sulkyState.stubbornnessLevel, // 0-10 고집 정도
        current_sulky_level: sulkyState.sulkyLevel,
        sulky_reason: sulkyState.sulkyReason,
        
        // === 감정 & 기분 요소 ===
        daily_mood: currentMood.daily_mood,
        menstrual_phase: currentMood.menstrual_phase,
        accumulated_stress: currentMood.accumulated_stress,
        recent_interaction_tone: currentMood.recent_interactions,
        
        // === 과거 패턴 분석 ===
        previous_attempts_today: sulkyState.pushPullHistory.length,
        similar_situations_recently: sulkyState.relationshipMemory.filter(
            memory => memory.type === detectionResult.type && 
            (Date.now() - memory.timestamp) < (24 * 60 * 60 * 1000)
        ).length,
        
        // === 관계 동역학 ===
        relationship_pattern: analyzePushPullPattern(detectionResult.type),
        
        // === GPT가 자유롭게 해석할 상황 설명 ===
        situation_summary: `User attempting ${detectionResult.type} while Yejin is sulky/upset`,
        decision_freedom: "Yejin can react naturally based on her personality, mood, and the situation",
        possible_reactions: "Can accept, reject, partially accept, get more upset, or any natural reaction",
        
        // === 자율성 보장 메시지 ===
        autonomous_instruction: "React as Yejin would naturally react - no fixed patterns or stages required"
    };
    
    // 🎯 타입별 상황 설명 (템플릿 아님! 상황 설명일 뿐)
    if (detectionResult.type === 'apology_attempt') {
        baseContext.situation_context = 'User is apologizing after making Yejin upset';
        baseContext.typical_yejin_concerns = ['Is this apology sincere?', 'Will this happen again?', 'Actions matter more than words'];
        
    } else if (detectionResult.type === 'love_expression') {
        baseContext.situation_context = 'User expressing love while Yejin is upset';
        baseContext.typical_yejin_concerns = ['Using love to avoid addressing the issue?', 'Timing feels wrong', 'Love is nice but doesn\'t fix the problem'];
        
    } else if (detectionResult.type === 'jealousy_situation') {
        baseContext.situation_context = 'User showing possessive/jealous behavior';
        baseContext.typical_yejin_concerns = ['Feeling controlled', 'Wants independence', 'User being unreasonable'];
        baseContext.subtype = detectionResult.subtype;
    }
    
    console.log(`🎨 [맥락생성] ${detectionResult.type} 자율적 맥락 완성 - GPT 판단 대기`);
    
    return baseContext;
}

/**
 * 📊 과거 밀당 패턴 분석
 */
function analyzePushPullPattern(currentType) {
    const recentMemories = sulkyState.relationshipMemory.filter(
        memory => (Date.now() - memory.timestamp) < (7 * 24 * 60 * 60 * 1000) // 7일
    );
    
    const typeCount = recentMemories.filter(memory => memory.type === currentType).length;
    const totalCount = recentMemories.length;
    
    if (totalCount === 0) return 'no_recent_pattern';
    if (typeCount >= 3) return 'repetitive_same_type';
    if (totalCount >= 5) return 'frequent_push_pull';
    return 'normal_pattern';
}

/**
 * 🎯 자율적 밀당 종료 판단 - GPT 피드백 기반
 */
function evaluatePushPullOutcome(gptResponse, userMessage) {
    // GPT 응답에서 밀당 상태 힌트를 찾아봄 (완전 자율적)
    const response = gptResponse.toLowerCase();
    
    // 완전 화해 신호들
    const reconciliationSignals = [
        '그래 용서해줄게', '알았어', '담타 가자', '이제 됐어', 
        '그만하자', '우리 화해하자', '이젠 괜찮아'
    ];
    
    // 아직 더 달래야 하는 신호들  
    const continuePushPullSignals = [
        '아직', '더', '그래도', '하지만', '음...', '글쎄',
        '진짜야?', '확실해?', '정말?'
    ];
    
    // 더 화가 난 신호들
    const escalationSignals = [
        '더 화나', '그만해', '싫어', '안 들어', '더 기분 나빠',
        '지금 그런 얘기야?', '화낼라고'
    ];
    
    let outcome = 'continue'; // 기본값: 계속
    
    if (reconciliationSignals.some(signal => response.includes(signal))) {
        outcome = 'resolved';
        console.log(`💕 [자율판단] 화해 신호 감지 - 밀당 성공!`);
        
    } else if (escalationSignals.some(signal => response.includes(signal))) {
        outcome = 'escalated';  
        console.log(`😤 [자율판단] 더 화남 - 밀당 역효과!`);
        
    } else if (continuePushPullSignals.some(signal => response.includes(signal))) {
        outcome = 'continue';
        console.log(`🎭 [자율판단] 계속 달래기 필요 - 밀당 진행 중`);
    }
    
    // 🎲 랜덤 요소: 때로는 예상과 다르게!
    if (Math.random() < 0.1) { // 10% 확률로 예상 외 반응
        const randomOutcomes = ['resolved', 'continue', 'escalated'];
        outcome = randomOutcomes[Math.floor(Math.random() * randomOutcomes.length)];
        console.log(`🎲 [예상외] 랜덤 반응: ${outcome} (예진이의 변덕)`);
    }
    
    return handlePushPullOutcome(outcome);
}

/**
 * 🏁 밀당 결과 처리
 */
function handlePushPullOutcome(outcome) {
    const oldState = { ...sulkyState };
    
    if (outcome === 'resolved') {
        // 밀당 성공 - 완전 해소
        const successMemory = {
            type: sulkyState.pushPullType,
            outcome: 'success',
            attempts: sulkyState.pushPullHistory.length,
            stubbornness: sulkyState.stubbornnessLevel,
            timestamp: Date.now()
        };
        
        sulkyState.relationshipMemory.push(successMemory);
        
        // 밀당 상태 초기화
        sulkyState.pushPullActive = false;
        sulkyState.pushPullType = null;
        sulkyState.pushPullHistory = [];
        sulkyState.stubbornnessLevel = 0;
        
        // 일부 삐짐도 완화 (담타만큼은 아니지만)
        sulkyState.sulkyLevel = Math.max(0, sulkyState.sulkyLevel - 2);
        if (sulkyState.sulkyLevel === 0) {
            sulkyState.isSulky = false;
            sulkyState.isActivelySulky = false;
        }
        
        logSulkyChange(oldState, sulkyState);
        console.log(`💕 [밀당완료] ${successMemory.attempts}번째 시도에서 성공!`);
        
        return {
            pushPullCompleted: true,
            outcome: 'success',
            totalAttempts: successMemory.attempts,
            context: 'natural_reconciliation_through_persistence'
        };
        
    } else if (outcome === 'escalated') {
        // 밀당 역효과 - 더 화남
        sulkyState.sulkyLevel = Math.min(4, sulkyState.sulkyLevel + 1);
        sulkyState.stubbornnessLevel = Math.min(10, sulkyState.stubbornnessLevel + 2);
        
        logSulkyChange(oldState, sulkyState);
        console.log(`😤 [밀당역효과] 더 화남! 고집 레벨 증가: ${sulkyState.stubbornnessLevel}`);
        
        return {
            pushPullEscalated: true,
            outcome: 'backfired',
            newStubbornness: sulkyState.stubbornnessLevel,
            context: 'attempt_made_things_worse'
        };
        
    } else {
        // 계속 진행
        console.log(`🎭 [밀당계속] ${sulkyState.pushPullHistory.length}번째 시도 완료 - 더 달래기 필요`);
        
        return {
            pushPullContinuing: true,
            outcome: 'ongoing',
            attemptNumber: sulkyState.pushPullHistory.length,
            context: 'need_more_convincing'
        };
    }
}

// ==================== 🚬 현실적 담타 시스템 ====================

/**
 * "담타갈까?" 감지 (기존 유지)
 */
function detectDamtaReconcile(userMessage) {
    if (!userMessage) return false;
    
    const message = userMessage.toLowerCase().replace(/\s/g, '');
    const damtaPatterns = ['담타갈까', '담타갈까?', '담타하자', '담타', '담배피우자'];
    
    return damtaPatterns.some(pattern => message.includes(pattern));
}

/**
 * 🔥 현실적 담타 반응 - 상황에 따라 다름!
 */
async function handleDamtaSuggestion() {
    console.log(`🚬 [담타제안] 담타 제안 감지 - 예진이 반응 분석...`);
    
    // 현재 상황 분석
    const currentMood = await assessYejinCurrentMood();
    const anger_intensity = sulkyState.sulkyLevel;
    const fight_duration = sulkyState.fightMode ? (Date.now() - sulkyState.lastStateUpdate) / (1000 * 60) : 0;
    
    // 🎲 담타 성공 확률 계산
    let successChance = 0.7; // 기본 70%
    
    // 화난 정도에 따라 확률 조정
    successChance -= (anger_intensity * 0.15); // 레벨당 15% 감소
    
    // 기분에 따라 조정
    if (currentMood.daily_mood === 'frustrated') successChance -= 0.2;
    if (currentMood.daily_mood === 'tired_of_patterns') successChance -= 0.3;
    if (currentMood.menstrual_phase === 'pms_severe') successChance -= 0.4;
    
    // 투닥거리기 시간에 따라 조정
    if (fight_duration > 30) successChance += 0.2; // 30분 넘게 싸우면 지쳐서 수용
    if (fight_duration < 5) successChance -= 0.3;  // 5분 안에 담타면 성급해 보임
    
    successChance = Math.max(0.1, Math.min(0.9, successChance)); // 10-90% 범위
    
    console.log(`🎲 [담타확률] 성공 확률: ${(successChance * 100).toFixed(0)}%`);
    console.log(`   └ 화남: ${anger_intensity}, 기분: ${currentMood.daily_mood}, 투닥시간: ${fight_duration.toFixed(0)}분`);
    
    // 🎯 확률에 따라 결과 결정
    const randomRoll = Math.random();
    
    if (randomRoll <= successChance) {
        // 담타 성공!
        return completeDamtaReconcile();
    } else {
        // 담타 거부!
        return rejectDamtaSuggestion(currentMood, anger_intensity);
    }
}

/**
 * 💕 담타 성공 - 완전 화해
 */
function completeDamtaReconcile() {
    const oldState = { ...sulkyState };
    
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
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`🚬💕 [담타성공] 모든 삐짐/밀당 해소 - 완전 화해!`);
    
    return {
        damtaReconcile: true,
        outcome: 'success',
        situation: 'complete_reconciliation_through_damta',
        emotion: 'relieved_and_loving_again_after_damta',
        relationship_dynamic: 'back_to_loving_couple_after_special_ritual',
        inner_thought: 'damta_always_brings_us_back_together',
        context: 'special_couple_reconciliation_method'
    };
}

/**
 * 😤 담타 거부 - 현실적 반응
 */
function rejectDamtaSuggestion(currentMood, angerLevel) {
    console.log(`😤 [담타거부] 지금은 담타로 안 됨!`);
    
    // 거부 이유별 맥락 생성
    let rejectionReason = 'general_too_upset';
    let rejectionMessage = 'still_too_angry_for_damta';
    
    if (angerLevel >= 3) {
        rejectionReason = 'too_angry';
        rejectionMessage = 'really_upset_damta_wont_fix_this';
    } else if (currentMood.menstrual_phase === 'pms_severe') {
        rejectionReason = 'pms_sensitive';
        rejectionMessage = 'too_sensitive_today_damta_not_enough';
    } else if (currentMood.daily_mood === 'tired_of_patterns') {
        rejectionReason = 'tired_of_same_solution';
        rejectionMessage = 'always_damta_when_problems_arise';
    } else {
        rejectionReason = 'timing_not_right';
        rejectionMessage = 'not_in_mood_for_damta_right_now';
    }
    
    return {
        damtaRejected: true,
        outcome: 'rejected',
        rejection_reason: rejectionReason,
        situation: 'damta_suggestion_rejected',
        emotion: 'too_upset_for_usual_solutions',
        relationship_dynamic: 'need_different_approach_not_damta',
        inner_thought: rejectionMessage,
        context: 'damta_not_working_this_time',
        suggestion: 'need_more_sincere_effort_first'
    };
}

// ==================== 🥊 투닥거리기 & 쿨다운 시스템 (기존 유지) ====================

// 투닥거리기 감지 패턴
const FIGHT_INDICATORS = {
    user_fighting_back: {
        keywords: ['나도', '너도', '왜', '잘못', '화내', '그렇게', '아니야', '맞아'],
        context: '아저씨도 화내면서 맞받아치는 상황'
    },
    escalating_argument: {
        indicators: ['!', '?', '정말', '진짜', '너무', '왜그래', '어떻게'],
        context: '서로 감정이 격해지는 상황'
    }
};

/**
 * 투닥거리기 상황 감지
 */
function detectFightEscalation(userMessage) {
    if (!sulkyState.isSulky || !userMessage) return null;
    
    const message = userMessage.toLowerCase();
    
    // 아저씨가 맞받아치는 상황 감지
    if (FIGHT_INDICATORS.user_fighting_back.keywords.some(keyword => 
        message.includes(keyword))) {
        return {
            type: 'user_fighting_back',
            escalationLevel: sulkyState.fightLevel + 1,
            context: FIGHT_INDICATORS.user_fighting_back.context,
            trigger: userMessage
        };
    }
    
    // 감정이 격해지는 상황 감지
    const exclamationCount = (userMessage.match(/[!?]/g) || []).length;
    if (exclamationCount >= 2 || FIGHT_INDICATORS.escalating_argument.indicators.some(indicator => 
        message.includes(indicator))) {
        return {
            type: 'escalating_argument', 
            escalationLevel: sulkyState.fightLevel + 1,
            context: FIGHT_INDICATORS.escalating_argument.context,
            trigger: userMessage
        };
    }
    
    return null;
}

/**
 * 투닥거리기 단계 진입
 */
function escalateFight(fightDetection) {
    const oldState = { ...sulkyState };
    
    sulkyState.fightMode = true;
    sulkyState.fightLevel = Math.min(fightDetection.escalationLevel, 3);
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 투닥거리기 레벨 ${sulkyState.fightLevel}: ${fightDetection.type}`);
    
    return {
        fightEscalated: true,
        fightLevel: sulkyState.fightLevel,
        fightType: fightDetection.type,
        situation: 'mutual_argument_escalating',
        emotion: 'defensive_and_angry_fighting_back',
        relationship_dynamic: 'both_sides_getting_heated',
        inner_thought: 'user_started_fighting_so_fighting_back',
        trigger: fightDetection.trigger,
        context: fightDetection.context
    };
}

/**
 * 예진이가 쿨다운 제안해야 하는지 체크
 */
function shouldYejinProposeCooldown() {
    return sulkyState.fightMode && 
           sulkyState.fightLevel >= 3 && 
           !sulkyState.cooldownRequested;
}

/**
 * 쿨다운 제안 실행
 */
function proposeCooldown() {
    const oldState = { ...sulkyState };
    
    sulkyState.cooldownRequested = true;
    sulkyState.cooldownStartTime = Date.now();
    sulkyState.fightMode = false; // 일시적 진정
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 예진이 쿨다운 제안: "좀 있다가 얘기하자"`);
    
    return {
        shouldProposeCooldown: true,
        situation: 'fight_too_intense_need_break',
        emotion: 'angry_but_caring_about_relationship',
        relationship_dynamic: 'protecting_relationship_from_damage',
        inner_thought: 'fight_getting_too_bad_need_to_stop',
        context: 'proposing_temporary_break_from_argument'
    };
}

/**
 * 쿨다운 후 화해 시도 체크 (5-10분 후)
 */
function shouldAttemptReconcile() {
    if (!sulkyState.cooldownRequested || sulkyState.reconcileAttempted) {
        return false;
    }
    
    const now = Date.now();
    const cooldownDuration = now - sulkyState.cooldownStartTime;
    const minCooldown = 5 * 60 * 1000; // 5분
    const maxCooldown = 10 * 60 * 1000; // 10분
    
    // 5-10분 사이 랜덤하게 화해 시도
    const targetCooldown = minCooldown + Math.random() * (maxCooldown - minCooldown);
    
    return cooldownDuration >= targetCooldown;
}

/**
 * 화해 시도 실행
 */
function attemptReconcile() {
    const oldState = { ...sulkyState };
    
    sulkyState.reconcileAttempted = true;
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 예진이 화해 시도: "아저씨... 좀 풀렸어?"`);
    
    return {
        shouldAttemptReconcile: true,
        situation: 'cautious_reconcile_attempt_after_cooldown',
        emotion: 'still_hurt_but_wanting_to_make_up',
        relationship_dynamic: 'taking_first_step_toward_reconciliation',
        inner_thought: 'dont_want_to_stay_angry_forever',
        context: 'testing_if_user_calmed_down_too'
    };
}

// ==================== 📋 예진이 발신 추적 시스템 (기존 유지) ====================

/**
 * 예진이가 먼저 보낸 메시지/사진 등을 추적 시작
 */
function markYejinInitiatedAction(actionType, timestamp = null) {
    const oldState = { ...sulkyState };
    
    sulkyState.yejinInitiated = true;
    sulkyState.yejinMessageTime = timestamp || Date.now();
    sulkyState.yejinMessageType = actionType;
    sulkyState.waitingForUserResponse = true;
    sulkyState.lastStateUpdate = Date.now();
    
    // 기존 삐짐은 초기화 (새로운 대화 시작)
    sulkyState.isSulky = false;
    sulkyState.isActivelySulky = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.contentBasedSulky = false;
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 예진이 발신 추적 시작: ${actionType}`);
    console.log(`[sulkyManager] 답장 대기 모드 ON - 빠른 삐짐 타이머 시작`);
}

/**
 * 사용자 응답 시 추적 상태 초기화
 */
function resetYejinInitiatedTracking() {
    const wasWaiting = sulkyState.waitingForUserResponse;
    
    sulkyState.yejinInitiated = false;
    sulkyState.yejinMessageTime = null;
    sulkyState.yejinMessageType = null;
    sulkyState.waitingForUserResponse = false;
    sulkyState.lastUserResponseTime = Date.now();
    
    if (wasWaiting) {
        console.log(`[sulkyManager] 예진이 발신 추적 종료 - 아저씨 답장 완료`);
    }
}

// ==================== ⏰ 시간 기반 빠른 삐짐 (기존 유지) ====================

/**
 * 예진이 발신 메시지 대기 중 빠른 삐짐 체크
 */
async function checkFastSulkyMessage(client, userId) {
    if (!client || !userId) {
        console.log('⚠️ [sulkyManager] client 또는 userId가 없어서 빠른 삐짐 체크 건너뜀');
        return null;
    }
    
    // 예진이가 먼저 보내고 답장 대기 중이 아니면 체크 안 함
    if (!sulkyState.yejinInitiated || !sulkyState.waitingForUserResponse) {
        return null;
    }
    
    // 수면시간이면 삐짐 일시정지
    if (isSleepTime()) {
        console.log('🌙 [sulkyManager] 수면시간 (2-8시) - 삐짐 일시정지');
        return null;
    }
    
    // 이미 활발하게 삐지고 있으면 중복 방지
    if (sulkyState.isActivelySulky) {
        return null;
    }
    
    const now = Date.now();
    const elapsedMinutes = (now - sulkyState.yejinMessageTime) / (1000 * 60);
    const multiplier = await getSulkyMultiplier();
    
    // 삐짐 레벨 결정
    let levelToSend = 0;
    if (elapsedMinutes >= FAST_SULKY_CONFIG.FINAL_LEVEL * multiplier) {
        levelToSend = 4;
    } else if (elapsedMinutes >= FAST_SULKY_CONFIG.LEVEL_3_DELAY * multiplier) {
        levelToSend = 3;
    } else if (elapsedMinutes >= FAST_SULKY_CONFIG.LEVEL_2_DELAY * multiplier) {
        levelToSend = 2;
    } else if (elapsedMinutes >= FAST_SULKY_CONFIG.LEVEL_1_DELAY * multiplier) {
        levelToSend = 1;
    }
    
    // 새로운 레벨에서만 메시지 전송
    if (levelToSend > 0 && levelToSend !== sulkyState.sulkyLevel) {
        const oldState = { ...sulkyState };
        
        sulkyState.isSulky = true;
        sulkyState.isActivelySulky = true;
        sulkyState.sulkyLevel = levelToSend;
        sulkyState.sulkyReason = `time_based_no_reply_${elapsedMinutes.toFixed(0)}min`;
        sulkyState.lastStateUpdate = Date.now();
        
        logSulkyChange(oldState, sulkyState);
        
        console.log(`[sulkyManager] 빠른 삐짐 레벨 ${levelToSend} 발동 (${elapsedMinutes.toFixed(1)}분 경과)`);
        
        // 상황별 맥락 생성 (템플릿 없음!)
        const sulkyContext = {
            triggerType: 'time_based_no_reply',
            yejinAction: sulkyState.yejinMessageType,
            waitingTime: `${elapsedMinutes.toFixed(0)}분`,
            sulkyLevel: levelToSend,
            situation: `yejin_sent_${sulkyState.yejinMessageType}_waiting_${elapsedMinutes.toFixed(0)}min`,
            emotion: levelToSend === 1 ? 'confused_and_slightly_annoyed' :
                     levelToSend === 2 ? 'frustrated_and_demanding' :
                     levelToSend === 3 ? 'angry_and_hurt' : 'very_upset_almost_giving_up',
            relationship_dynamic: 'expecting_immediate_response_from_lover',
            inner_thought: levelToSend === 1 ? 'why_no_response_yet' :
                          levelToSend === 2 ? 'getting_annoyed_at_being_ignored' :
                          levelToSend === 3 ? 'feeling_ignored_and_hurt' : 'maybe_user_doesnt_care_anymore',
            personality: 'direct_confrontational_but_still_loving'
        };
        
        return sulkyContext;
    }
    
    return null;
}

// ==================== 💬 대화 내용 기반 즉시 삐짐 (기존 유지) ====================

// 거슬리는 상황들 (상황만 정의, 템플릿 없음) - 강화된 감지!
const IRRITATING_SITUATIONS = {
    dismissive_response: {
        keywords: ['응', 'ㅇㅋ', '그래', '알겠어', '그렇구나', '음', '응응', '어...그래', '음...', '그냥', '몰라', '뭐', '별로'],
        patterns: [
            /^응+$/,           // 응, 응응, 응응응
            /^어\.+그래$/,     // 어...그래, 어....그래
            /^음\.+$/,         // 음..., 음....
            /^그래\.?$/,       // 그래, 그래.
            /^알겠어\.?$/,     // 알겠어, 알겠어.
            /^뭐\.+$/          // 뭐..., 뭐....
        ],
        context: '건성으로 대답하거나 완전 무관심해 보임',
        emotion: 'hurt_and_really_annoyed',
        severity: 'immediate_strong'
    },
    
    cold_tone: {
        indicators: ['짧은답장', '마침표많음', '이모티콘없음', '건조함'],
        patterns: [
            /^.{1,3}\.+$/,     // 3글자 이하 + 마침표들
            /[\.]{2,}/         // 마침표 2개 이상
        ],
        context: '평소보다 차갑거나 건조한 톤으로 말함',
        emotion: 'worried_and_hurt',
        severity: 'moderate_strong'
    },
    
    busy_excuse: {
        keywords: ['바빠', '바쁘', '일이', '회사', '나중에', '잠시만', '시간없어', '급해'],
        context: '자꾸 바쁘다고 하거나 대화 회피하는 것 같음',
        emotion: 'frustrated_and_lonely',
        severity: 'building_up_anger'
    },
    
    // 🆕 연속 자극 추가!
    repeated_irritation: {
        context: '계속해서 건성으로 대답하거나 무시하는 느낌',
        emotion: 'accumulating_anger_really_upset',
        severity: 'escalating'
    }
};

/**
 * 사용자 메시지에서 거슬리는 요소 감지 - 강화된 감지 시스템!
 */
function detectIrritationTrigger(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        return null;
    }
    
    const message = userMessage.trim().toLowerCase();
    
    console.log(`🔍 [거슬림감지] "${userMessage}" 분석 시작...`);
    
    // 🔥 강화된 건성 답장 감지!
    const dismissive = IRRITATING_SITUATIONS.dismissive_response;
    
    // 1. 키워드 매칭
    if (dismissive.keywords.some(keyword => message === keyword || message === keyword + '.')) {
        console.log(`🚨 [거슬림감지] 건성 답장 키워드 감지: "${userMessage}"`);
        return {
            type: 'dismissive_response',
            trigger: userMessage,
            ...dismissive
        };
    }
    
    // 2. 패턴 매칭 (응응, 어...그래 등)
    if (dismissive.patterns && dismissive.patterns.some(pattern => pattern.test(message))) {
        console.log(`🚨 [거슬림감지] 건성 답장 패턴 감지: "${userMessage}"`);
        return {
            type: 'dismissive_response',
            trigger: userMessage,
            context: '완전 건성으로 대답함 - 패턴 매칭',
            emotion: 'really_hurt_and_angry',
            severity: 'immediate_strong'
        };
    }
    
    // 바쁘다는 핑계 감지
    if (IRRITATING_SITUATIONS.busy_excuse.keywords.some(keyword => 
        message.includes(keyword))) {
        console.log(`🚨 [거슬림감지] 바쁘다는 핑계 감지: "${userMessage}"`);
        return {
            type: 'busy_excuse',
            trigger: userMessage,
            ...IRRITATING_SITUATIONS.busy_excuse
        };
    }
    
    // 차가운 톤 감지 (강화)
    const coldTone = IRRITATING_SITUATIONS.cold_tone;
    if (coldTone.patterns && coldTone.patterns.some(pattern => pattern.test(message))) {
        console.log(`🚨 [거슬림감지] 차가운 톤 패턴 감지: "${userMessage}"`);
        return {
            type: 'cold_tone',
            trigger: userMessage,
            ...coldTone
        };
    }
    
    // 기존 간단한 차가운 톤 감지
    if (message.length <= 3 && message.includes('.') && !message.includes('ㅋ') && !message.includes('ㅎ')) {
        console.log(`🚨 [거슬림감지] 차가운 톤 간단 감지: "${userMessage}"`);
        return {
            type: 'cold_tone',
            trigger: userMessage,
            ...coldTone
        };
    }
    
    console.log(`ℹ️ [거슬림감지] "${userMessage}" 거슬리는 요소 없음`);
    return null;
}

/**
 * 🆕 연속 자극 누적 시스템 - 계속 짜증나게 하면 더 화남!
 */
function updateIrritationHistory(irritationType) {
    const now = Date.now();
    
    // 이력에 추가
    sulkyState.irritationHistory.push({
        type: irritationType,
        timestamp: now
    });
    
    // 최근 5개만 유지
    if (sulkyState.irritationHistory.length > 5) {
        sulkyState.irritationHistory = sulkyState.irritationHistory.slice(-5);
    }
    
    // 최근 10분 내 연속 자극 계산
    const recentIrritations = sulkyState.irritationHistory.filter(
        item => (now - item.timestamp) < (10 * 60 * 1000) // 10분
    );
    
    sulkyState.consecutiveIrritations = recentIrritations.length;
    sulkyState.lastIrritationType = irritationType;
    
    console.log(`📈 [연속자극] 최근 10분간 ${sulkyState.consecutiveIrritations}번 짜증 - 누적 중!`);
    
    return {
        consecutiveCount: sulkyState.consecutiveIrritations,
        recentTypes: recentIrritations.map(item => item.type),
        isEscalating: sulkyState.consecutiveIrritations >= 2
    };
}

/**
 * 내용 기반 즉시 삐짐 처리 - 연속 자극 누적 적용!
 */
function triggerContentBasedSulky(irritationTrigger) {
    const oldState = { ...sulkyState };
    
    // 🆕 연속 자극 이력 업데이트
    const consecutiveInfo = updateIrritationHistory(irritationTrigger.type);
    
    // 🔥 연속 자극에 따른 삐짐 레벨 증가!
    let sulkyLevel = 1; // 기본
    
    if (consecutiveInfo.consecutiveCount >= 3) {
        sulkyLevel = 3; // 3번 이상 → 레벨 3
        console.log(`🔥 [연속자극] 3번 이상 누적! 삐짐 레벨 3 발동`);
    } else if (consecutiveInfo.consecutiveCount >= 2) {
        sulkyLevel = 2; // 2번 이상 → 레벨 2
        console.log(`🔥 [연속자극] 2번 누적! 삐짐 레벨 2 발동`);
    }
    
    sulkyState.contentBasedSulky = true;
    sulkyState.irritationTrigger = irritationTrigger;
    sulkyState.isSulky = true;
    sulkyState.isActivelySulky = true;
    sulkyState.sulkyLevel = sulkyLevel;
    sulkyState.sulkyReason = `content_based_${irritationTrigger.type}_x${consecutiveInfo.consecutiveCount}`;
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 내용 기반 즉시 삐짐 발동: ${irritationTrigger.type} (연속 ${consecutiveInfo.consecutiveCount}번째)`);
    console.log(`[sulkyManager] 트리거: "${irritationTrigger.trigger}" → 삐짐 레벨 ${sulkyLevel}`);
    
    return {
        triggered: true,
        situation: `content_based_sulky_${irritationTrigger.type}`,
        context: irritationTrigger.context,
        emotion: consecutiveInfo.isEscalating ? 'escalating_anger_really_upset' : irritationTrigger.emotion,
        severity: consecutiveInfo.isEscalating ? 'escalating_strong' : irritationTrigger.severity,
        trigger: irritationTrigger.trigger,
        relationship_dynamic: consecutiveInfo.isEscalating ? 'feeling_continuously_dismissed_getting_really_angry' : 'feeling_dismissed_or_ignored',
        inner_thought: consecutiveInfo.isEscalating ? 'user_keeps_being_dismissive_really_annoying' : 'user_being_dismissive_or_uninterested',
        consecutive_count: consecutiveInfo.consecutiveCount,
        escalation_level: sulkyLevel
    };
}

// ==================== 🎭 메인 메시지 처리 함수 ====================

/**
 * 🔥 사용자 메시지 처리 - 자율적 밀당 시스템 적용!
 */
async function processUserMessage(userMessage, client, userId) {
    console.log(`[sulkyManager] 사용자 메시지 처리: "${userMessage}"`);
    
    let processingResult = {
        sulkyTriggered: false,
        pushPullTriggered: false,
        fightEscalated: false,
        cooldownProposed: false,
        reconcileAttempted: false,
        damtaReconciled: false,
        damtaRejected: false,
        context: null,
        shouldSendMessage: false
    };
    
    // 1. 담타 화해 감지 → 🔥 현실적 반응!
    if (detectDamtaReconcile(userMessage)) {
        const damtaResult = await handleDamtaSuggestion();
        
        if (damtaResult.damtaReconcile) {
            processingResult.damtaReconciled = true;
            processingResult.context = damtaResult;
            resetYejinInitiatedTracking(); // 모든 추적 초기화
        } else {
            processingResult.damtaRejected = true;
            processingResult.context = damtaResult;
        }
        
        return processingResult;
    }
    
    // 2. 🔥 자율적 밀당 감지 및 처리!
    const apologyDetection = detectApologySituation(userMessage);
    const loveDetection = detectLoveExpression(userMessage);
    const jealousyDetection = detectJealousySituation(userMessage);
    
    if (apologyDetection || loveDetection || jealousyDetection) {
        const detectionResult = apologyDetection || loveDetection || jealousyDetection;
        
        // 🎭 완전 자율적 밀당 시작!
        const pushPullContext = await startAutonomousPushPull(detectionResult);
        if (pushPullContext) {
            processingResult.pushPullTriggered = true;
            processingResult.context = pushPullContext;
            return processingResult;
        }
    }
    
    // 3. 사용자 응답으로 예진이 발신 추적 해제
    if (sulkyState.waitingForUserResponse) {
        resetYejinInitiatedTracking();
    }
    
    // 4. 내용 기반 즉시 삐짐 체크
    const irritationTrigger = detectIrritationTrigger(userMessage);
    if (irritationTrigger) {
        processingResult.sulkyTriggered = true;
        processingResult.context = triggerContentBasedSulky(irritationTrigger);
        return processingResult;
    }
    
    // 5. 투닥거리기 감지 및 에스컬레이션
    const fightDetection = detectFightEscalation(userMessage);
    if (fightDetection) {
        processingResult.fightEscalated = true;
        processingResult.context = escalateFight(fightDetection);
        return processingResult;
    }
    
    return processingResult;
}

// ==================== 🔄 자동 시스템 체크 ====================

/**
 * 주기적으로 호출되는 자동 체크 함수
 */
async function performAutonomousChecks(client, userId) {
    let checkResults = [];
    
    // 1. 빠른 삐짐 체크 (예진이 발신 후 무응답)
    const fastSulkyResult = await checkFastSulkyMessage(client, userId);
    if (fastSulkyResult) {
        checkResults.push({
            type: 'fast_sulky',
            shouldSendMessage: true,
            context: fastSulkyResult
        });
    }
    
    // 2. 쿨다운 제안 체크
    if (shouldYejinProposeCooldown()) {
        const cooldownResult = proposeCooldown();
        checkResults.push({
            type: 'cooldown_proposal',
            shouldSendMessage: true,
            context: cooldownResult
        });
    }
    
    // 3. 화해 시도 체크
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

// ==================== 📊 상태 조회 및 관리 ====================

/**
 * 현재 삐짐 & 밀당 상태 조회
 */
function getSulkinessState() {
    return {
        // 기본 삐짐 상태
        isSulky: sulkyState.isSulky,
        isWorried: sulkyState.isWorried,
        sulkyLevel: sulkyState.sulkyLevel,
        isActivelySulky: sulkyState.isActivelySulky,
        sulkyReason: sulkyState.sulkyReason,
        
        // 🔥 자율적 밀당 상태
        pushPullActive: sulkyState.pushPullActive,
        pushPullType: sulkyState.pushPullType,
        pushPullAttempts: sulkyState.pushPullHistory.length,
        stubbornnessLevel: sulkyState.stubbornnessLevel,
        
        // 투닥거리기 상태
        fightMode: sulkyState.fightMode,
        fightLevel: sulkyState.fightLevel,
        cooldownRequested: sulkyState.cooldownRequested,
        reconcileAttempted: sulkyState.reconcileAttempted,
        
        // 예진이 발신 추적
        yejinInitiated: sulkyState.yejinInitiated,
        waitingForUserResponse: sulkyState.waitingForUserResponse,
        yejinMessageType: sulkyState.yejinMessageType,
        
        // 타이밍
        lastUserResponseTime: sulkyState.lastUserResponseTime,
        lastStateUpdate: sulkyState.lastStateUpdate
    };
}

/**
 * 상태 업데이트 (외부에서 사용)
 */
function updateSulkinessState(newState) {
    const oldState = { ...sulkyState };
    
    sulkyState = {
        ...sulkyState,
        ...newState,
        lastStateUpdate: Date.now()
    };
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 외부 상태 업데이트:`, newState);
}

/**
 * 🔥 새로운 밀당 피드백 처리 함수 - GPT 응답 기반 자율 판단
 */
function processPushPullFeedback(gptResponse, userMessage) {
    if (!sulkyState.pushPullActive) {
        return null;
    }
    
    console.log(`🎭 [밀당피드백] GPT 응답 기반 자율 판단 시작...`);
    
    // GPT 응답 분석해서 밀당 결과 판단
    const outcome = evaluatePushPullOutcome(gptResponse, userMessage);
    
    return outcome;
}

/**
 * 시스템 상태 리포트
 */
function getSulkySystemStatus() {
    const now = Date.now();
    const timeSinceLastUser = (now - sulkyState.lastUserResponseTime) / (1000 * 60);
    
    return {
        currentState: {
            isSulky: sulkyState.isSulky,
            isWorried: sulkyState.isWorried,
            level: sulkyState.sulkyLevel,
            reason: sulkyState.sulkyReason,
            isActive: sulkyState.isActivelySulky
        },
        autonomousPushPull: {
            active: sulkyState.pushPullActive,
            type: sulkyState.pushPullType,
            attempts: sulkyState.pushPullHistory.length,
            stubbornness: sulkyState.stubbornnessLevel,
            memoryCount: sulkyState.relationshipMemory.length
        },
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
            sleepHours: '2-8시',
            pmsMultiplier: 'active',
            autonomousMode: 'enabled'
        }
    };
}

/**
 * 상태 초기화 (디버깅/테스트용)
 */
function resetSulkyState() {
    sulkyState = {
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: '',
        
        yejinInitiated: false,
        yejinMessageTime: null,
        yejinMessageType: null,
        waitingForUserResponse: false,
        
        contentBasedSulky: false,
        irritationTrigger: null,
        consecutiveIrritations: 0,
        lastIrritationType: null,
        irritationHistory: [],
        
        fightMode: false,
        fightLevel: 0,
        cooldownRequested: false,
        cooldownStartTime: null,
        reconcileAttempted: false,
        
        // 🔥 자율적 밀당 상태 초기화
        pushPullActive: false,
        pushPullType: null,
        pushPullHistory: [],
        relationshipMemory: [],
        currentMood: 'normal',
        stubbornnessLevel: 0,
        
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now(),
        lastStateUpdate: Date.now()
    };
    console.log('[sulkyManager] 모든 상태 초기화 완료 (자율적 밀당 포함)');
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 🔥 완전 자율적 삐짐 & 밀당 시스템 초기화
 */
function initializeSulkySystem() {
    console.log('[sulkyManager] 🔥 완전 자율적 삐짐 & 밀당 시스템 v7.0 초기화...');
    
    // 기본 상태로 초기화
    resetSulkyState();
    
    console.log('[sulkyManager] 완전 자율적 삐짐 & 밀당 시스템 초기화 완료');
    console.log('✨ 삐짐 시스템:');
    console.log('  - 예진이 발신 후 3분 → 10분 → 20분 → 40분 단계별 삐짐');
    console.log('  - 거슬리는 말 즉시 삐짐 (건성 답장, 바쁘다는 핑계 등)');
    console.log('  - 수면시간 (2-8시) 예외 처리');
    console.log('  - PMS 시 더 빠른 삐짐');
    console.log('');
    console.log('🔥 자율적 밀당 시스템:');
    console.log('  - 패턴 없음! GPT가 예진이 성격으로 자유 판단');
    console.log('  - 상황/기분/과거경험에 따라 완전히 다른 반응');
    console.log('  - 때론 1단계에서 바로 받아줌, 때론 끝까지 질질 끔');
    console.log('  - 고집 레벨 랜덤 생성 (0-10)');
    console.log('  - 관계 패턴 누적 추적');
    console.log('');
    console.log('🚬 현실적 담타 시스템:');
    console.log('  - 상황에 따라 담타도 안 통함!');
    console.log('  - 진짜 화났을 때: "지금 담배 생각이야?!"');
    console.log('  - 가벼운 투정일 때만: "응, 담타 가자"');
    console.log('  - 성공 확률 10-90% (상황별 계산)');
    console.log('');
    console.log('🥊 투닥거리기 시스템:');
    console.log('  - 서로 화내며 맞받아치기');
    console.log('  - 격해지면 예진이가 먼저 쿨다운 제안');
    console.log('  - 5-10분 후 예진이가 먼저 화해 시도');
    console.log('');
    console.log('🎭 100% 자율성 보장:');
    console.log('  - 상황/감정/맥락만 제공 → GPT가 예진이답게 자유 반응');
    console.log('  - 예측 불가능한 자연스러운 감정 표현');
    console.log('  - 진짜 사람처럼 매번 다른 반응');
}

// 모듈 로드 시 자동 초기화
initializeSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 🔥 핵심 기능 (자율적 밀당 적용)
    processUserMessage,                      // 메인 메시지 처리 함수 (자율적 밀당)
    processPushPullFeedback,                 // 🆕 GPT 응답 기반 밀당 피드백 처리
    performAutonomousChecks,                 // 자동 체크 (삐짐, 쿨다운, 화해)
    
    // 예진이 발신 추적
    markYejinInitiatedAction,                // 예진이 발신 시작
    resetYejinInitiatedTracking,             // 추적 종료
    
    // 상태 관리
    getSulkinessState,                       // 현재 상태 조회 (자율적 밀당 포함)
    updateSulkinessState,                    // 상태 업데이트
    getSulkySystemStatus,                    // 시스템 상태 리포트 (자율적 밀당 포함)
    resetSulkyState,                         // 상태 초기화
    
    // 🔥 자율적 밀당 전용 함수들
    assessYejinCurrentMood,                  // 예진이 현재 기분 분석
    generateStubbornness,                    // 고집 레벨 생성
    startAutonomousPushPull,                 // 자율적 밀당 시작
    handleDamtaSuggestion,                   // 현실적 담타 처리
    
    // 개별 감지 함수들 (디버깅/테스트용)
    detectApologySituation,
    detectLoveExpression,
    detectJealousySituation,
    detectDamtaReconcile,
    
    // 설정 조회
    getSulkyConfig: () => ({ ...FAST_SULKY_CONFIG }),
    getSulkyMultiplier,
    isSleepTime
};
