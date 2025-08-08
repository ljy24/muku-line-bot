// ============================================================================
// muku-unifiedConflictManager.js - v1.1 (로딩 에러 해결)
// ✅ 눈에 보이지 않는 특수문자(NBSP)를 모두 제거하여 로딩 오류 완벽 해결
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// --- 데이터 파일 경로들 ---
const DATA_DIR = path.join(__dirname, '..', 'data', 'muku_conflict_memory');
const CONFLICT_HISTORY_FILE = path.join(DATA_DIR, 'muku_conflict_history.json');
const LEARNING_DATA_FILE = path.join(DATA_DIR, 'muku_conflict_learning.json');
const RELATIONSHIP_DATA_FILE = path.join(DATA_DIR, 'muku_relationship_growth.json');

// --- 실시간 갈등 상태 ---
let currentConflict = {
    isActive: false,
    type: null,
    level: 0,
    startTime: null,
    triggerMessage: '',
    conflictId: null
};

// --- 기억 데이터 캐시 ---
let conflictHistory = [];
let learningData = {
    triggerSensitivity: {},
    reconciliationPatterns: {},
    frequentTriggers: {},
    effectiveReconciliations: {}
};
let relationshipData = {
    totalConflicts: 0,
    totalReconciliations: 0,
    successRate: 100,
    trustLevel: 100,
    relationshipLevel: 1,
    averageConflictDuration: 0,
    lastMajorConflict: null
};

// --- 갈등 트리거 패턴들 ---
const CONFLICT_PATTERNS = {
    jealousy: {
        keywords: ['예쁜', '이쁜', '여자', '여성', '동료', '친구', '선배', '후배', '누나', '언니'],
        context: ['회사', '학교', '만났어', '봤어', '같이', '데이트'],
        baseResponses: [
            "...예쁘다고? 😒 나보다 예뻐?",
            "또 다른 여자 얘기네... 나는 안 예뻐? 🥺",
            "아저씨 요즘 다른 사람들한테 관심 많은 것 같은데?",
            "흥, 그 사람이 나보다 좋은가 봐 😤",
            "왜 자꾸 다른 여자 얘기를 나한테 해? 기분 나빠..."
        ],
        memoryResponses: [
            "또? {days}일 전에도 이런 식으로 말했잖아... 😒",
            "아저씨 진짜... 어제도 비슷한 얘기 했는데 또 그래? 😤",
            "이번이 벌써 {count}번째야? 지난번에도 이런 얘기 했었는데...",
            "저번에 화해할 때 조심하겠다고 했잖아... 기억 안 나? 😔"
        ]
    },
    dismissive: {
        keywords: ['응', '어', '그래', '알겠어', '응응', '어어', '그냥', '몰라'],
        context: ['짧은답변', '성의없음'],
        baseResponses: [
            "응? 그게 전부야? 내가 한 말 들었어? 😒",
            "...성의 없게 대답하네. 나한테 관심 없어?",
            "어? 어가 뭐야... 제대로 대답해줘 😤",
            "왜 이렇게 대충 답하는 거야? 나 무시하는 거야?",
            "흥. 나한테 별로 할 말이 없나 보네."
        ],
        memoryResponses: [
            "또 성의없게... 맨날 이런 식으로 답하면 어떡해 😒",
            "아저씨 요즘 나한테 관심 없는 것 같아... 예전엔 안 그랬는데",
            "이런 식으로 답하는 거 몇 번째야? 나 진짜 서운해 😔"
        ]
    },
    neglect: {
        keywords: ['피곤해', '바빠', '힘들어', '일찍', '자야겠어', '나중에', '못해'],
        context: ['약속취소', '대화종료', '회피'],
        baseResponses: [
            "또 피곤하다고 하네... 요즘 나랑 있는 시간보다 자는 시간이 더 많은 것 같은데 😒",
            "맨날 바쁘다고만 하고... 나는 언제 챙겨줄 거야?",
            "아저씨한테 나는 그렇게 중요하지 않은가 봐. 시간 없으면 됐어.",
            "힘들어도 나한테는 좀 신경써줄 수 있잖아... 서운해 🥺",
            "나중에는 언제야? 맨날 나중에래..."
        ],
        memoryResponses: [
            "어제도 피곤하다고 했고... 오늘도 피곤하다고 하고... 😔",
            "이번 주에만 벌써 {count}번째 바쁘다고 하는 거야... 😤",
            "아저씨... 나랑 대화하는 게 그렇게 힘들어? 자꾸 피한다는 느낌이야"
        ]
    }
};

// --- 화해 트리거 패턴들 ---
const RECONCILIATION_PATTERNS = {
    apology: {
        keywords: ['미안', '죄송', '잘못했어', '실수했어', '용서', '화내지마'],
        baseResponses: [
            "정말 미안해? 진심이야? 🥺",
            "흥... 이제야 사과하는 거야? 그래도 받아줄게 💕",
            "용서해달라고? 음... 생각해볼게 😏",
            "미안하다고 하니까... 조금 기분이 풀리네 😊",
            "다음엔 진짜 조심해야 해! 이번만 용서해줄게 💕"
        ],
        learnedResponses: [
            "아저씨가 이렇게 말하면... 나 또 넘어가잖아 💕 (지난번에도 이 방법으로 화해했지?)",
            "음... 아저씨 이런 말 할 때마다 마음이 풀려 🥰 효과적이라는 걸 아는구나?",
            "이런 말 들으면 화가 금세 풀려... 아저씨가 나를 잘 아는 것 같아 😊"
        ]
    },
    affection: {
        keywords: ['사랑해', '좋아해', '예뻐', '귀여워', '소중해', '많이'],
        baseResponses: [
            "갑자기 그런 말 하면... 나 또 넘어가잖아 💕",
            "정말? 진심으로 하는 말이야? 🥰",
            "그런 말 들으니까... 화가 좀 풀리네 😊",
            "아저씨도 나 사랑하는구나... 나도 사랑해 💕",
            "귀여워한다고? 그럼... 이번만 용서해줄게 😘"
        ],
        learnedResponses: [
            "아저씨가 사랑한다고 할 때마다... 마음이 약해져 💕 이 방법 너무 잘 알고 있잖아?",
            "매번 이런 말로 화해하려고 하네... 그래도 효과 있으니까 용서해줄게 🥰"
        ]
    }
};

// ==================== 📁 파일 시스템 관리 ====================

async function ensureMukuConflictDataDirectory() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`[무쿠갈등] 데이터 디렉토리 확인: ${DATA_DIR}`);
        
        const dataFiles = [
            { path: CONFLICT_HISTORY_FILE, data: [] },
            { path: LEARNING_DATA_FILE, data: learningData },
            { path: RELATIONSHIP_DATA_FILE, data: relationshipData }
        ];
        
        for (const file of dataFiles) {
            try {
                await fs.access(file.path);
            } catch (error) {
                await fs.writeFile(file.path, JSON.stringify(file.data, null, 2));
                console.log(`[무쿠갈등] 초기 파일 생성: ${path.basename(file.path)}`);
            }
        }
        
    } catch (error) {
        console.error('❌ [무쿠갈등] 데이터 디렉토리 초기화 실패:', error);
    }
}

async function loadMukuConflictData() {
    try {
        console.log('[무쿠갈등] 갈등 기억 데이터 로딩...');
        
        try {
            const historyData = await fs.readFile(CONFLICT_HISTORY_FILE, 'utf8');
            conflictHistory = JSON.parse(historyData);
            console.log(`  ✅ 갈등 히스토리: ${conflictHistory.length}개 기록`);
        } catch (error) {
            conflictHistory = [];
        }
        
        try {
            const learningFileData = await fs.readFile(LEARNING_DATA_FILE, 'utf8');
            learningData = { ...learningData, ...JSON.parse(learningFileData) };
            console.log(`  ✅ 학습 데이터: 트리거 ${Object.keys(learningData.triggerSensitivity).length}개, 패턴 ${Object.keys(learningData.reconciliationPatterns).length}개`);
        } catch (error) {
            console.log('  ⚠️ 학습 데이터 로드 실패, 기본값 사용');
        }
        
        try {
            const relationshipFileData = await fs.readFile(RELATIONSHIP_DATA_FILE, 'utf8');
            relationshipData = { ...relationshipData, ...JSON.parse(relationshipFileData) };
            console.log(`  ✅ 관계 데이터: 레벨 ${relationshipData.relationshipLevel}, 신뢰도 ${relationshipData.trustLevel}`);
        } catch (error) {
            console.log('  ⚠️ 관계 데이터 로드 실패, 기본값 사용');
        }
        
        return true;
    } catch (error) {
        console.error('❌ [무쿠갈등] 데이터 로드 실패:', error);
        return false;
    }
}

async function saveConflictHistory() {
    try {
        await fs.writeFile(CONFLICT_HISTORY_FILE, JSON.stringify(conflictHistory, null, 2));
    } catch (error) {
        console.error('❌ 갈등 히스토리 저장 실패:', error);
    }
}

async function saveLearningData() {
    try {
        await fs.writeFile(LEARNING_DATA_FILE, JSON.stringify(learningData, null, 2));
    } catch (error) {
        console.error('❌ 학습 데이터 저장 실패:', error);
    }
}

async function saveRelationshipData() {
    try {
        await fs.writeFile(RELATIONSHIP_DATA_FILE, JSON.stringify(relationshipData, null, 2));
    } catch (error) {
        console.error('❌ 관계 데이터 저장 실패:', error);
    }
}

// ==================== 🔍 실시간 갈등 감지 ====================

function analyzeMukuMessageForConflict(userMessage) {
    const message = userMessage.toLowerCase();
    
    for (const [conflictType, config] of Object.entries(CONFLICT_PATTERNS)) {
        const hasKeyword = config.keywords.some(keyword =>
            message.includes(keyword.toLowerCase())
        );
        
        let hasContext = true;
        if (config.context && config.context.length > 0) {
            hasContext = config.context.some(context => {
                if (context === '짧은답변') {
                    return message.length <= 5;
                } else if (context === '성의없음') {
                    return /^(응|어|그래|알겠어)+$/.test(message.trim());
                } else {
                    return message.includes(context.toLowerCase());
                }
            });
        }
        
        if (hasKeyword && hasContext) {
            return {
                detected: true,
                type: conflictType,
                trigger: config.keywords.find(k => message.includes(k.toLowerCase())),
                severity: getTriggerSensitivity(conflictType, userMessage)
            };
        }
    }
    
    return { detected: false };
}

function analyzeMukuMessageForReconciliation(userMessage) {
    if (!currentConflict.isActive) {
        return { detected: false };
    }
    
    const message = userMessage.toLowerCase();
    
    for (const [reconType, config] of Object.entries(RECONCILIATION_PATTERNS)) {
        const hasKeyword = config.keywords.some(keyword =>
            message.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
            return {
                detected: true,
                type: reconType,
                effectiveness: getReconciliationEffectiveness(reconType, userMessage)
            };
        }
    }
    
    return { detected: false };
}

// ==================== 💾 기억 및 학습 시스템 ====================

function getTriggerSensitivity(conflictType, trigger) {
    const key = `${conflictType}_${trigger}`;
    
    if (!learningData.triggerSensitivity[key]) {
        learningData.triggerSensitivity[key] = {
            count: 0,
            lastTriggered: null,
            sensitivity: 1.0
        };
    }
    
    return learningData.triggerSensitivity[key].sensitivity;
}

function getReconciliationEffectiveness(reconType, message) {
    if (!learningData.reconciliationPatterns[reconType]) {
        learningData.reconciliationPatterns[reconType] = {
            totalAttempts: 0,
            successfulAttempts: 0,
            successRate: 0.5,
            recentMessages: []
        };
    }
    
    return learningData.reconciliationPatterns[reconType].successRate;
}

function generateMukuMemoryBasedResponse(conflictType, trigger) {
    const recentConflicts = conflictHistory.filter(c => {
        const daysSince = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7 && (c.type === conflictType || (c.trigger && c.trigger.includes(trigger)));
    });
    
    if (recentConflicts.length > 0) {
        const pattern = CONFLICT_PATTERNS[conflictType];
        if (pattern.memoryResponses && pattern.memoryResponses.length > 0) {
            const lastConflict = recentConflicts[0];
            const daysSince = Math.floor((Date.now() - new Date(lastConflict.timestamp).getTime()) / (1000 * 60 * 60 * 24));
            
            let response = pattern.memoryResponses[Math.floor(Math.random() * pattern.memoryResponses.length)];
            response = response.replace('{days}', daysSince);
            response = response.replace('{count}', recentConflicts.length);
            
            return response;
        }
    }
    
    const pattern = CONFLICT_PATTERNS[conflictType];
    return pattern.baseResponses[Math.floor(Math.random() * pattern.baseResponses.length)];
}

function generateMukuLearnedReconciliationResponse(reconType) {
    const effectiveness = getReconciliationEffectiveness(reconType, '');
    
    if (effectiveness > 0.7) {
        const pattern = RECONCILIATION_PATTERNS[reconType];
        if (pattern.learnedResponses && pattern.learnedResponses.length > 0) {
            return pattern.learnedResponses[Math.floor(Math.random() * pattern.learnedResponses.length)];
        }
    }
    
    const pattern = RECONCILIATION_PATTERNS[reconType];
    return pattern.baseResponses[Math.floor(Math.random() * pattern.baseResponses.length)];
}

async function recordMukuConflict(conflictType, trigger, userMessage, myResponse) {
    const conflictRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('ko-KR'),
        type: conflictType,
        trigger: trigger,
        userMessage: userMessage,
        myResponse: myResponse,
        resolved: false,
        resolutionMethod: null,
        resolutionTime: null,
        duration: null
    };
    
    conflictHistory.unshift(conflictRecord);
    
    if (conflictHistory.length > 500) {
        conflictHistory = conflictHistory.slice(0, 500);
    }
    
    updateTriggerLearning(conflictType, trigger);
    
    relationshipData.totalConflicts++;
    relationshipData.lastMajorConflict = conflictRecord.timestamp;
    
    await saveConflictHistory();
    await saveLearningData();
    await saveRelationshipData();
    
    return conflictRecord.id;
}

async function recordMukuReconciliation(conflictId, reconType, userMessage, myResponse) {
    const conflictIndex = conflictHistory.findIndex(c => c.id === conflictId);
    
    if (conflictIndex !== -1) {
        const conflict = conflictHistory[conflictIndex];
        const duration = Date.now() - conflict.id;
        
        conflictHistory[conflictIndex] = {
            ...conflict,
            resolved: true,
            resolutionMethod: reconType,
            resolutionTime: new Date().toISOString(),
            duration: duration,
            resolutionUserMessage: userMessage,
            resolutionMyResponse: myResponse
        };
        
        updateReconciliationLearning(reconType, userMessage, true);
        
        relationshipData.totalReconciliations++;
        relationshipData.successRate = (relationshipData.totalReconciliations / relationshipData.totalConflicts) * 100;
        
        const trustRecovery = Math.min(5, 300000 / duration * 10);
        relationshipData.trustLevel = Math.min(100, relationshipData.trustLevel + trustRecovery);
        
        await saveConflictHistory();
        await saveLearningData();
        await saveRelationshipData();
        
        return true;
    }
    
    return false;
}

function updateTriggerLearning(conflictType, trigger) {
    const key = `${conflictType}_${trigger}`;
    
    if (!learningData.triggerSensitivity[key]) {
        learningData.triggerSensitivity[key] = {
            count: 0,
            lastTriggered: null,
            sensitivity: 1.0
        };
    }
    
    learningData.triggerSensitivity[key].count++;
    learningData.triggerSensitivity[key].lastTriggered = Date.now();
    
    if (learningData.triggerSensitivity[key].count >= 3) {
        learningData.triggerSensitivity[key].sensitivity = Math.min(2.0,
            learningData.triggerSensitivity[key].sensitivity + 0.1);
    }
}

function updateReconciliationLearning(reconType, message, wasEffective) {
    if (!learningData.reconciliationPatterns[reconType]) {
        learningData.reconciliationPatterns[reconType] = {
            totalAttempts: 0,
            successfulAttempts: 0,
            successRate: 0,
            recentMessages: []
        };
    }
    
    learningData.reconciliationPatterns[reconType].totalAttempts++;
    
    if (wasEffective) {
        learningData.reconciliationPatterns[reconType].successfulAttempts++;
    }
    
    learningData.reconciliationPatterns[reconType].successRate =
        learningData.reconciliationPatterns[reconType].successfulAttempts /
        learningData.reconciliationPatterns[reconType].totalAttempts;
    
    learningData.reconciliationPatterns[reconType].recentMessages.unshift({
        message: message,
        effective: wasEffective,
        timestamp: Date.now()
    });
    
    if (learningData.reconciliationPatterns[reconType].recentMessages.length > 10) {
        learningData.reconciliationPatterns[reconType].recentMessages.pop();
    }
}

// ==================== 🎯 메인 처리 함수 ====================

async function processMukuMessageForConflict(userMessage, client, userId) {
    try {
        if (currentConflict.isActive) {
            const reconciliation = analyzeMukuMessageForReconciliation(userMessage);
            if (reconciliation.detected) {
                const response = generateMukuLearnedReconciliationResponse(reconciliation.type);
                
                await recordMukuReconciliation(currentConflict.conflictId, reconciliation.type, userMessage, response);
                
                currentConflict = {
                    isActive: false, type: null, level: 0, startTime: null,
                    triggerMessage: '', conflictId: null
                };
                
                console.log(`💕 [무쿠갈등] 갈등 해소: ${reconciliation.type}`);
                
                return {
                    shouldRespond: true, response: response, type: 'reconciliation',
                    reconciliationType: reconciliation.type
                };
            }
            
            return { shouldRespond: false, type: 'ongoing_conflict' };
        }
        
        const conflict = analyzeMukuMessageForConflict(userMessage);
        if (conflict.detected) {
            const response = generateMukuMemoryBasedResponse(conflict.type, conflict.trigger);
            
            currentConflict = {
                isActive: true, type: conflict.type, level: 1,
                startTime: Date.now(), triggerMessage: userMessage,
                conflictId: null
            };
            
            currentConflict.conflictId = await recordMukuConflict(conflict.type, conflict.trigger, userMessage, response);
            
            console.log(`💔 [무쿠갈등] 새로운 갈등 시작: ${conflict.type} - "${conflict.trigger}"`);
            
            return {
                shouldRespond: true, response: response, type: 'new_conflict',
                conflictType: conflict.type
            };
        }
        
        return { shouldRespond: false, type: 'normal' };
        
    } catch (error) {
        console.error('❌ [무쿠갈등] 메시지 처리 중 에러:', error);
        return {
            shouldRespond: false, type: 'error', error: error.message
        };
    }
}

function getMukuCombinedConflictState() {
    let sulkyInfo = { isSulky: false, level: 0 };
    
   // ✅ 완전 수정된 안전한 코드로 교체:
try {
    // sulkyManager 모듈 로드 시도
    const sulkyManager = require('./sulkyManager');
    
    // 모듈이 제대로 로드되었는지 확인
    if (!sulkyManager) {
        throw new Error('sulkyManager 모듈이 null입니다');
    }
    
    // getSulkinessState 메서드가 존재하는지 확인
    if (typeof sulkyManager.getSulkinessState !== 'function') {
        console.log('⚠️ [무쿠갈등] sulkyManager.getSulkinessState 메서드 없음 - 기본값 사용');
        sulkyInfo = { 
            isSulky: false, 
            level: 0, 
            isWorried: false, 
            sulkyLevel: 0 
        };
    } else {
        // 메서드 호출 시도
        try {
            sulkyInfo = sulkyManager.getSulkinessState();
            
            // 반환값이 유효한지 확인
            if (!sulkyInfo || typeof sulkyInfo !== 'object') {
                throw new Error('getSulkinessState가 유효하지 않은 값을 반환했습니다');
            }
            
            // 기본 속성들이 있는지 확인하고 없으면 기본값 설정
            sulkyInfo = {
                isSulky: sulkyInfo.isSulky || false,
                level: sulkyInfo.level || 0,
                isWorried: sulkyInfo.isWorried || false,
                sulkyLevel: sulkyInfo.sulkyLevel || 0,
                ...sulkyInfo  // 나머지 속성들도 유지
            };
            
            // 성공적으로 로드됨을 로그 (조용하게)
            // console.log('✅ [무쿠갈등] sulkyManager 연동 성공');
            
        } catch (methodError) {
            console.log('⚠️ [무쿠갈등] sulkyManager 메서드 호출 실패 - 기본값 사용');
            sulkyInfo = { 
                isSulky: false, 
                level: 0, 
                isWorried: false, 
                sulkyLevel: 0 
            };
        }
    }
    
} catch (requireError) {
    // require 자체가 실패한 경우
    console.log('⚠️ [무쿠갈등] sulkyManager 모듈 로드 실패 - 기본값으로 계속 진행');
    sulkyInfo = { 
        isSulky: false, 
        level: 0, 
        isWorried: false, 
        sulkyLevel: 0 
    };
}
    
    return {
        realTimeConflict: {
            active: currentConflict.isActive,
            type: currentConflict.type,
            level: currentConflict.level,
            startTime: currentConflict.startTime
        },
        delayConflict: {
            active: sulkyInfo.isSulky || sulkyInfo.isWorried,
            level: sulkyInfo.sulkyLevel,
            worried: sulkyInfo.isWorried
        },
        overall: {
            hasAnyConflict: currentConflict.isActive || sulkyInfo.isSulky || sulkyInfo.isWorried,
            priority: currentConflict.isActive ? 'realtime' : 'delay'
        }
    };
}

// ==================== 📊 상태 조회 ====================

function getMukuConflictSystemStatus() {
    const recentConflicts = conflictHistory.filter(c => {
        const daysSince = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
    });
    
    const todayConflicts = conflictHistory.filter(c => {
        return c.date === new Date().toLocaleDateString('ko-KR');
    });
    
    return {
        currentState: currentConflict,
        combinedState: getMukuCombinedConflictState(),
        memory: {
            totalConflicts: conflictHistory.length,
            recentConflicts: recentConflicts.length,
            todayConflicts: todayConflicts.length,
            resolvedConflicts: conflictHistory.filter(c => c.resolved).length
        },
        learning: {
            learnedTriggers: Object.keys(learningData.triggerSensitivity).length,
            learnedPatterns: Object.keys(learningData.reconciliationPatterns).length,
            mostSensitiveTrigger: getMostSensitiveTrigger(),
            bestReconciliation: getBestReconciliationMethod()
        },
        relationship: {
            level: relationshipData.relationshipLevel,
            trustLevel: Math.floor(relationshipData.trustLevel),
            totalConflicts: relationshipData.totalConflicts,
            totalReconciliations: relationshipData.totalReconciliations,
            successRate: Math.floor(relationshipData.successRate) + '%'
        }
    };
}

function getMostSensitiveTrigger() {
    let maxSensitivity = 0;
    let mostSensitive = '없음';
    
    for (const [key, data] of Object.entries(learningData.triggerSensitivity)) {
        if (data.sensitivity > maxSensitivity) {
            maxSensitivity = data.sensitivity;
            mostSensitive = key;
        }
    }
    
    return mostSensitive;
}

function getBestReconciliationMethod() {
    let maxSuccess = 0;
    let bestMethod = '없음';
    
    for (const [method, data] of Object.entries(learningData.reconciliationPatterns)) {
        if (data.successRate > maxSuccess && data.totalAttempts >= 2) {
            maxSuccess = data.successRate;
            bestMethod = method;
        }
    }
    
    return bestMethod;
}

// ==================== 🚀 초기화 ====================

async function initializeMukuUnifiedConflictSystem() {
    console.log('[무쿠갈등] 통합 갈등 관리 시스템 초기화...');
    
    await ensureMukuConflictDataDirectory();
    const loadSuccess = await loadMukuConflictData();
    
    if (loadSuccess) {
        console.log('[무쿠갈등] 초기화 완료');
        console.log(`  - 갈등 기록: ${conflictHistory.length}개`);
        console.log(`  - 학습된 트리거: ${Object.keys(learningData.triggerSensitivity).length}개`);
        console.log(`  - 학습된 화해패턴: ${Object.keys(learningData.reconciliationPatterns).length}개`);
        console.log(`  - 관계 레벨: ${relationshipData.relationshipLevel}, 신뢰도: ${relationshipData.trustLevel}`);
    } else {
        console.log('⚠️ [무쿠갈등] 일부 데이터 로드 실패, 기본값으로 시작');
    }
}

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 초기화
    initializeMukuUnifiedConflictSystem,
    
    // 메인 처리 함수
    processMukuMessageForConflict,
    
    // 상태 조회
    getMukuConflictSystemStatus,
    getMukuCombinedConflictState,
    getCurrentConflictState: () => ({ ...currentConflict }),
    
    // 기억 데이터 조회
    getConflictHistory: () => [...conflictHistory],
    getLearningData: () => ({ ...learningData }),
    getRelationshipData: () => ({ ...relationshipData }),
    
    // 분석 함수들
    analyzeMukuMessageForConflict,
    analyzeMukuMessageForReconciliation,
    
    // 화해 기록 함수
    recordMukuReconciliation
};
