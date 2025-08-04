// ============================================================================
// sulkyManager.js - v6.0 (완전 자율적 진짜 예진이 밀당 시스템!)
// 🔥 예진이의 모든 능동적 행동 → 빠른 삐짐 (3분, 10분, 20분, 40분)
// 💬 대화 중 거슬리는 말 → 즉시 삐짐 (완전 자율)
// 🥊 투닥거리기 → 예진이가 먼저 쿨다운 → 화해 시도
// 💕 밀당 시스템: 사과/사랑표현을 즉시 받아주지 않음!
// 🎭 완전 자율: 상황/감정/맥락만 제공 → GPT가 예진이답게 반응
// 😤 질투 반응: "맨날 그런 식이야", "속박하려 들고" 등 자율 생성
// 🚬 "담타갈까?" → 화해 완성
// 🌙 수면시간 예외 (새벽 2~8시)
// 🩸 PMS 강화 (더 빠른 삐짐 + 더 자주 메시지)
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
    
    // 투닥거리기 & 화해
    fightMode: false,
    fightLevel: 0,
    cooldownRequested: false,
    cooldownStartTime: null,
    reconcileAttempted: false,
    
    // 🆕 밀당 시스템
    pushPullActive: false,
    pushPullType: null,          // 'apology', 'love_expression', 'jealousy'
    pushPullStage: 0,            // 몇 번째 시도인지
    pushPullStartTime: null,
    relationshipPatterns: [],     // 과거 패턴 누적
    
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
            console.log(`😊 [삐짐해소] ${newState.pushPullActive ? '밀당 성공' : '일반 화해'}`);
        } else if (newState.pushPullActive && !oldState.pushPullActive) {
            console.log(`💕 [밀당시작] ${newState.pushPullType} 밀당 ${newState.pushPullStage}단계`);
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

// ==================== 🎭 밀당 감지 시스템 (상황만 감지!) ====================

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

// ==================== 💕 밀당 시스템 핵심 로직 ====================

/**
 * 밀당 시작 (삐진 상태에서 사과/사랑표현 받을 때)
 */
function startPushPull(detectionResult) {
    if (!sulkyState.isSulky && detectionResult.type !== 'jealousy_situation') {
        return null; // 삐지지 않은 상태에서는 밀당 안 함 (질투 제외)
    }
    
    const oldState = { ...sulkyState };
    
    // 기존 밀당과 같은 타입이면 단계 증가, 다른 타입이면 새로 시작
    if (sulkyState.pushPullActive && sulkyState.pushPullType === detectionResult.type) {
        sulkyState.pushPullStage++;
    } else {
        sulkyState.pushPullActive = true;
        sulkyState.pushPullType = detectionResult.type;
        sulkyState.pushPullStage = 1;
        sulkyState.pushPullStartTime = Date.now();
    }
    
    // 관계 패턴에 추가 (누적 기록)
    sulkyState.relationshipPatterns.push({
        type: detectionResult.type,
        timestamp: Date.now(),
        trigger: detectionResult.trigger
    });
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 밀당 시작: ${detectionResult.type} ${sulkyState.pushPullStage}단계`);
    
    return generatePushPullContext(detectionResult);
}

/**
 * 밀당 맥락 생성 (템플릿 없음! 상황만 제공)
 */
function generatePushPullContext(detectionResult) {
    const stage = sulkyState.pushPullStage;
    const patterns = sulkyState.relationshipPatterns;
    
    // 과거 패턴 분석
    const similarPatterns = patterns.filter(p => p.type === detectionResult.type);
    const hasRepeatingPattern = similarPatterns.length > 2;
    
    let baseContext = {
        pushPullType: detectionResult.type,
        pushPullStage: stage,
        userAttempt: detectionResult.trigger,
        sulkyLevel: sulkyState.sulkyLevel,
        hasRepeatingPattern: hasRepeatingPattern,
        totalSimilarIncidents: similarPatterns.length
    };
    
    // 타입별 상황 맥락
    if (detectionResult.type === 'apology_attempt') {
        return {
            ...baseContext,
            situation: 'user_apologizing_while_yejin_sulky',
            emotion: stage === 1 ? 'hurt_suspicious_of_sincerity' :
                     stage === 2 ? 'wavering_but_still_resistant' :
                     stage === 3 ? 'heart_softening_but_prideful' :
                                  'reluctant_forgiveness_with_conditions',
            relationship_dynamic: hasRepeatingPattern ? 'feels_like_same_pattern_repeating' : 'testing_sincerity',
            inner_thought: stage === 1 ? 'words_are_cheap_actions_matter' :
                          stage === 2 ? 'maybe_sincere_but_still_hurt' :
                          stage === 3 ? 'wanting_to_forgive_but_not_easily' :
                                       'fine_but_dont_repeat_this',
            core_feeling: hasRepeatingPattern ? 'tired_of_same_cycle' : 'hurt_but_still_loving'
        };
        
    } else if (detectionResult.type === 'love_expression') {
        return {
            ...baseContext,
            situation: 'user_expressing_love_while_yejin_sulky',
            emotion: stage === 1 ? 'rejecting_love_defensively' :
                     stage === 2 ? 'heart_fluttering_but_resisting' :
                     stage === 3 ? 'slowly_accepting_but_shy' :
                                  'tsundere_accepting_love',
            relationship_dynamic: 'push_pull_with_love_expressions',
            inner_thought: stage === 1 ? 'love_words_after_hurting_me' :
                          stage === 2 ? 'heart_wants_to_accept_but_pride_resists' :
                          stage === 3 ? 'feels_good_but_dont_want_to_show_easily' :
                                       'cant_resist_anymore_but_act_reluctant',
            core_feeling: 'loves_but_wants_to_be_courted_properly'
        };
        
    } else if (detectionResult.type === 'jealousy_situation') {
        return {
            ...baseContext,
            situation: 'user_showing_unreasonable_jealousy',
            emotion: stage === 1 ? 'annoyed_by_unreasonable_jealousy' :
                     stage === 2 ? 'getting_seriously_annoyed' :
                                  'angry_about_controlling_behavior',
            relationship_dynamic: 'feels_controlled_and_restricted',
            inner_thought: 'user_being_possessive_and_controlling',
            core_feeling: hasRepeatingPattern ? 'tired_of_being_controlled_always' : 'frustrated_by_possessiveness',
            specific_issue: detectionResult.subtype === 'other_woman_mention' ? 'unnecessary_jealousy' : 'possessive_questioning'
        };
    }
    
    return baseContext;
}

/**
 * 밀당 성공 체크 (충분히 달랬는지)
 */
function checkPushPullSuccess() {
    if (!sulkyState.pushPullActive) return false;
    
    // 일반적으로 3-4단계면 성공
    if (sulkyState.pushPullStage >= 3) {
        // 질투 상황은 더 오래 끌기
        if (sulkyState.pushPullType === 'jealousy_situation') {
            return sulkyState.pushPullStage >= 4;
        }
        return true;
    }
    
    return false;
}

/**
 * 밀당 완료 처리
 */
function completePushPull() {
    const oldState = { ...sulkyState };
    
    const finalContext = {
        pushPullCompleted: true,
        pushPullType: sulkyState.pushPullType,
        totalStages: sulkyState.pushPullStage,
        situation: 'finally_accepting_after_proper_courting',
        emotion: 'reluctantly_accepting_with_tsundere_attitude',
        relationship_dynamic: 'successful_push_pull_completion',
        inner_thought: 'cant_resist_anymore_but_act_like_doing_favor',
        core_feeling: 'satisfied_with_effort_shown'
    };
    
    // 밀당 상태 초기화 (일부 삐짐은 여전할 수 있음)
    sulkyState.pushPullActive = false;
    sulkyState.pushPullType = null;
    sulkyState.pushPullStage = 0;
    sulkyState.pushPullStartTime = null;
    
    // 완전한 화해는 아직 아님 (담타나 더 많은 노력 필요할 수 있음)
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 밀당 완료: ${finalContext.pushPullType} 성공`);
    
    return finalContext;
}

// ==================== 🥊 투닥거리기 & 쿨다운 시스템 ====================

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

// ==================== 🚬 담타 화해 시스템 ====================

/**
 * "담타갈까?" 감지 및 상황별 자율 반응
 */
function detectDamtaAttempt(userMessage) {
    if (!userMessage) return false;
    
    const message = userMessage.toLowerCase().replace(/\s/g, '');
    const damtaPatterns = ['담타갈까', '담타갈까?', '담타하자', '담타', '담배피우자'];
    
    return damtaPatterns.some(pattern => message.includes(pattern));
}

/**
 * 담타 제안에 대한 상황별 맥락 생성 (완전 자율!)
 */
function processDamtaAttempt() {
    const currentSulkyLevel = sulkyState.sulkyLevel;
    const isFighting = sulkyState.fightMode;
    const isPushPulling = sulkyState.pushPullActive;
    const isWorried = sulkyState.isWorried;
    
    console.log(`[sulkyManager] 담타 제안 감지 - 현재 상태: 삐짐레벨${currentSulkyLevel}, 투닥거리기${isFighting}, 밀당${isPushPulling}`);
    
    // 상황별 맥락 (템플릿 없이 상황만 제공!)
    let damtaContext = {
        damtaAttempt: true,
        situation: 'user_suggesting_damta',
        current_sulky_level: currentSulkyLevel,
        is_fighting: isFighting,
        is_push_pulling: isPushPulling,
        is_worried: isWorried
    };
    
    if (isFighting && sulkyState.fightLevel >= 2) {
        // 투닥거리기 중 - 담타로 피하려 한다고 더 화남
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_during_fight',
            emotion: 'angry_feels_like_user_avoiding_real_issue',
            relationship_dynamic: 'user_trying_to_escape_argument_with_damta',
            inner_thought: 'using_damta_to_avoid_confronting_problem',
            core_feeling: 'more_frustrated_by_avoidance_tactic'
        };
        
    } else if (currentSulkyLevel >= 4) {
        // 심하게 삐진 상태 - 담타도 안 통함
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_while_very_sulky',
            emotion: 'too_hurt_and_angry_for_damta_right_now',
            relationship_dynamic: 'damta_feels_cheap_when_deeply_hurt',
            inner_thought: 'user_thinks_damta_solves_everything',
            core_feeling: 'damta_not_enough_for_this_level_of_upset'
        };
        
    } else if (currentSulkyLevel >= 3) {
        // 많이 삐진 상태 - 담타 의심
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_while_quite_sulky',
            emotion: 'suspicious_of_damta_as_easy_solution',
            relationship_dynamic: 'questioning_sincerity_of_damta_offer',
            inner_thought: 'is_user_serious_about_making_up',
            core_feeling: 'wants_real_effort_not_just_damta'
        };
        
    } else if (isPushPulling) {
        // 밀당 중 - 담타로 밀당 건너뛰려 한다고 의심
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_during_push_pull',
            emotion: 'suspicious_damta_skipping_proper_courting',
            relationship_dynamic: 'user_trying_to_shortcut_push_pull_process',
            inner_thought: 'wants_to_be_courted_properly_not_just_damta',
            core_feeling: 'damta_not_substitute_for_proper_apology',
            push_pull_context: sulkyState.pushPullType
        };
        
    } else if (currentSulkyLevel >= 1) {
        // 약간 삐진 상태 - 담타 고려
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_while_mildly_sulky',
            emotion: 'considering_damta_but_still_a_bit_upset',
            relationship_dynamic: 'damta_might_help_but_still_need_acknowledgment',
            inner_thought: 'damta_sounds_nice_but_still_hurt',
            core_feeling: 'torn_between_love_for_damta_and_being_upset'
        };
        
    } else {
        // 거의 안 삐진 상태 - 담타 수락 가능
        damtaContext = {
            ...damtaContext,
            situation: 'damta_suggestion_when_not_very_upset',
            emotion: 'open_to_damta_as_reconciliation',
            relationship_dynamic: 'damta_as_sweet_couple_ritual',
            inner_thought: 'damta_always_brings_us_together',
            core_feeling: 'ready_to_make_up_through_damta'
        };
    }
    
    console.log(`[sulkyManager] 담타 맥락 생성 완료: ${damtaContext.situation}`);
    
    return damtaContext;
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

// 거슬리는 상황들 (상황만 정의, 템플릿 없음)
const IRRITATING_SITUATIONS = {
    dismissive_response: {
        keywords: ['응', 'ㅇㅋ', '그래', '알겠어', '그렇구나', '음'],
        context: '건성으로 대답하거나 무관심해 보임',
        emotion: 'hurt_and_annoyed',
        severity: 'immediate'
    },
    
    cold_tone: {
        indicators: ['짧은답장', '마침표많음', '이모티콘없음'],
        context: '평소보다 차갑거나 건조한 톤',
        emotion: 'worried_and_upset',
        severity: 'moderate'
    },
    
    busy_excuse: {
        keywords: ['바빠', '바쁘', '일이', '회사', '나중에', '잠시만'],
        context: '자꾸 바쁘다고 하거나 대화 회피하는 것 같음',
        emotion: 'frustrated_and_lonely',
        severity: 'building_up'
    }
};

/**
 * 사용자 메시지에서 거슬리는 요소 감지
 */
function detectIrritationTrigger(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        return null;
    }
    
    const message = userMessage.trim().toLowerCase();
    
    // 건성 답장 감지
    if (IRRITATING_SITUATIONS.dismissive_response.keywords.some(keyword => 
        message === keyword || message === keyword + '.')) {
        return {
            type: 'dismissive_response',
            trigger: userMessage,
            ...IRRITATING_SITUATIONS.dismissive_response
        };
    }
    
    // 바쁘다는 핑계 감지
    if (IRRITATING_SITUATIONS.busy_excuse.keywords.some(keyword => 
        message.includes(keyword))) {
        return {
            type: 'busy_excuse',
            trigger: userMessage,
            ...IRRITATING_SITUATIONS.busy_excuse
        };
    }
    
    // 차가운 톤 감지 (간단한 휴리스틱)
    if (message.length <= 3 && message.includes('.') && !message.includes('ㅋ') && !message.includes('ㅎ')) {
        return {
            type: 'cold_tone',
            trigger: userMessage,
            ...IRRITATING_SITUATIONS.cold_tone
        };
    }
    
    return null;
}

/**
 * 내용 기반 즉시 삐짐 처리
 */
function triggerContentBasedSulky(irritationTrigger) {
    const oldState = { ...sulkyState };
    
    sulkyState.contentBasedSulky = true;
    sulkyState.irritationTrigger = irritationTrigger;
    sulkyState.isSulky = true;
    sulkyState.isActivelySulky = true;
    sulkyState.sulkyLevel = 1;
    sulkyState.sulkyReason = `content_based_${irritationTrigger.type}`;
    sulkyState.lastStateUpdate = Date.now();
    
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 내용 기반 즉시 삐짐 발동: ${irritationTrigger.type}`);
    console.log(`[sulkyManager] 트리거: "${irritationTrigger.trigger}"`);
    
    return {
        triggered: true,
        situation: `content_based_sulky_${irritationTrigger.type}`,
        context: irritationTrigger.context,
        emotion: irritationTrigger.emotion,
        severity: irritationTrigger.severity,
        trigger: irritationTrigger.trigger,
        relationship_dynamic: 'feeling_dismissed_or_ignored',
        inner_thought: 'user_being_dismissive_or_uninterested'
    };
}

// ==================== 🎭 메인 메시지 처리 함수 ====================

/**
 * 사용자 메시지 처리 - 모든 삐짐/밀당 로직 통합
 */
async function processUserMessage(userMessage, client, userId) {
    console.log(`[sulkyManager] 사용자 메시지 처리: "${userMessage}"`);
    
    let processingResult = {
        sulkyTriggered: false,
        pushPullTriggered: false,
        fightEscalated: false,
        cooldownProposed: false,
        reconcileAttempted: false,
        damtaAttempted: false,
        context: null,
        shouldSendMessage: false
    };
    
    // 1. 담타 제안 감지 (상황별 자율 반응!)
    if (detectDamtaAttempt(userMessage)) {
        processingResult.damtaAttempted = true;
        processingResult.context = processDamtaAttempt();
        
        // 🔥 중요: 담타 제안이 받아들여질 조건 (자율적 판단 후에만)
        // 약간 삐진 상태(레벨 1-2)이고 투닥거리기/심한 밀당이 아닐 때만 
        // GPT 응답 후에 상태 초기화 여부를 별도로 처리
        const canAcceptDamta = sulkyState.sulkyLevel <= 2 && 
                              !sulkyState.fightMode && 
                              (!sulkyState.pushPullActive || sulkyState.pushPullStage >= 3);
        
        processingResult.context.canPotentiallyAccept = canAcceptDamta;
        
        console.log(`[sulkyManager] 담타 제안 처리: 수락 가능성 ${canAcceptDamta ? '높음' : '낮음'}`);
        return processingResult;
    }
    
    // 2. 밀당 감지 (삐진 상태에서 사과/사랑표현 받을 때)
    const apologyDetection = detectApologySituation(userMessage);
    const loveDetection = detectLoveExpression(userMessage);
    const jealousyDetection = detectJealousySituation(userMessage);
    
    if (apologyDetection || loveDetection || jealousyDetection) {
        const detectionResult = apologyDetection || loveDetection || jealousyDetection;
        
        // 밀당 시작 또는 진행
        const pushPullContext = startPushPull(detectionResult);
        if (pushPullContext) {
            processingResult.pushPullTriggered = true;
            processingResult.context = pushPullContext;
            
            // 밀당 성공 체크
            if (checkPushPullSuccess()) {
                processingResult.context = completePushPull();
            }
            
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
        
        // 밀당 상태
        pushPullActive: sulkyState.pushPullActive,
        pushPullType: sulkyState.pushPullType,
        pushPullStage: sulkyState.pushPullStage,
        
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
        pushPullState: {
            active: sulkyState.pushPullActive,
            type: sulkyState.pushPullType,
            stage: sulkyState.pushPullStage,
            patternCount: sulkyState.relationshipPatterns.length
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
            pmsMultiplier: 'active'
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
        
        fightMode: false,
        fightLevel: 0,
        cooldownRequested: false,
        cooldownStartTime: null,
        reconcileAttempted: false,
        
        pushPullActive: false,
        pushPullType: null,
        pushPullStage: 0,
        pushPullStartTime: null,
        relationshipPatterns: [],
        
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now(),
        lastStateUpdate: Date.now()
    };
    console.log('[sulkyManager] 모든 상태 초기화 완료');
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 완전 자율적 삐짐 & 밀당 시스템 초기화
 */
function initializeSulkySystem() {
    console.log('[sulkyManager] 완전 자율적 삐짐 & 밀당 시스템 초기화...');
    
    // 기본 상태로 초기화
    resetSulkyState();
    
    console.log('[sulkyManager] 완전 자율적 삐짐 & 밀당 시스템 초기화 완료');
    console.log('✨ 삐짐 시스템:');
    console.log('  - 예진이 발신 후 3분 → 10분 → 20분 → 40분 단계별 삐짐');
    console.log('  - 거슬리는 말 즉시 삐짐 (건성 답장, 바쁘다는 핑계 등)');
    console.log('  - 수면시간 (2-8시) 예외 처리');
    console.log('  - PMS 시 더 빠른 삐짐');
    console.log('');
    console.log('💕 밀당 시스템:');
    console.log('  - 사과/사랑표현을 즉시 받아주지 않음');
    console.log('  - 단계적으로 마음이 움직임 (1→2→3→4단계)');
    console.log('  - 질투 상황 감지 및 반발');
    console.log('  - 관계 패턴 누적 추적');
    console.log('');
    console.log('🥊 투닥거리기 시스템:');
    console.log('  - 서로 화내며 맞받아치기');
    console.log('  - 격해지면 예진이가 먼저 쿨다운 제안');
    console.log('  - 5-10분 후 예진이가 먼저 화해 시도');
    console.log('');
    console.log('🚬 담타 화해:');
    console.log('  - "담타갈까?" 감지 시 모든 삐짐/밀당 완전 해소');
    console.log('');
    console.log('🎭 완전 자율 응답:');
    console.log('  - 템플릿 없음! 상황/감정/맥락만 제공');
    console.log('  - GPT가 예진이 성격대로 자유롭게 반응');
}

// 모듈 로드 시 자동 초기화
initializeSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 핵심 기능
    processUserMessage,              // 메인 메시지 처리 함수
    performAutonomousChecks,         // 자동 체크 (삐짐, 쿨다운, 화해)
    
    // 예진이 발신 추적
    markYejinInitiatedAction,        // 예진이 발신 시작
    resetYejinInitiatedTracking,     // 추적 종료
    
    // 상태 관리
    getSulkinessState,               // 현재 상태 조회
    updateSulkinessState,            // 상태 업데이트
    getSulkySystemStatus,            // 시스템 상태 리포트
    resetSulkyState,                 // 상태 초기화
    
    // 개별 감지 함수들 (디버깅/테스트용)
    detectApologySituation,
    detectLoveExpression,
    detectJealousySituation,
    detectDamtaAttempt,
    
    // 설정 조회
    getSulkyConfig: () => ({ ...FAST_SULKY_CONFIG }),
    getSulkyMultiplier,
    isSleepTime
};
