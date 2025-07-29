// ============================================================================
// commandHandler.js - v5.0 (통합 시스템 연동 + 중복 해결 완성)
// 🎯 핵심 고유 기능 보존: 명령어라우팅 + 디스크관리 + 나이트모드톤 + 이미지라우팅
// 🔄 통합 시스템 연동: moodManager + ultimateContext + emotionalContext + Redis
// 🛡️ 안전 우선: 기존 기능 100% 보존하면서 통합 레이어 추가
// 💖 무쿠 벙어리 방지: 모든 처리 결과 Redis 연동으로 다른 시스템과 공유
// ============================================================================

const path = require('path');
const fs = require('fs');

// 🔄 통합 시스템들 연동
let integratedSystems = {
    moodManager: null,
    ultimateContext: null,
    emotionalContext: null,
    autonomousSystem: null,
    aiUtils: null
};

/**
 * 🔄 통합 시스템들 로딩 (안전한 방식)
 */
function loadIntegratedSystems() {
    // moodManager (통합 감정 관리)
    if (!integratedSystems.moodManager) {
        try {
            integratedSystems.moodManager = require('./moodManager');
            console.log('[CommandHandler] ✅ 통합 무드매니저 연동 성공');
        } catch (error) {
            console.log('[CommandHandler] ⚠️ 통합 무드매니저 연동 실패:', error.message);
        }
    }
    
    // ultimateConversationContext (GPT 최적화 + 사용자 기억)
    if (!integratedSystems.ultimateContext) {
        try {
            integratedSystems.ultimateContext = require('./ultimateConversationContext');
            console.log('[CommandHandler] ✅ Ultimate Context 연동 성공');
        } catch (error) {
            console.log('[CommandHandler] ⚠️ Ultimate Context 연동 실패:', error.message);
        }
    }
    
    // emotionalContextManager (세밀한 감정 분석)
    if (!integratedSystems.emotionalContext) {
        try {
            integratedSystems.emotionalContext = require('./emotionalContextManager');
            console.log('[CommandHandler] ✅ 감정 컨텍스트 매니저 연동 성공');
        } catch (error) {
            console.log('[CommandHandler] ⚠️ 감정 컨텍스트 매니저 연동 실패:', error.message);
        }
    }
    
    // muku-autonomousYejinSystem (Redis 중앙)
    if (!integratedSystems.autonomousSystem) {
        try {
            const autonomousModule = require('./muku-autonomousYejinSystem');
            integratedSystems.autonomousSystem = autonomousModule.getGlobalInstance();
            console.log('[CommandHandler] ✅ 자율 시스템 연동 성공');
        } catch (error) {
            console.log('[CommandHandler] ⚠️ 자율 시스템 연동 실패:', error.message);
        }
    }
    
    // aiUtils (AI 중앙 관리)
    if (!integratedSystems.aiUtils) {
        try {
            integratedSystems.aiUtils = require('./aiUtils');
            console.log('[CommandHandler] ✅ AI 유틸 연동 성공');
        } catch (error) {
            console.log('[CommandHandler] ⚠️ AI 유틸 연동 실패:', error.message);
        }
    }
    
    return integratedSystems;
}

// ⭐ 새벽응답+알람 시스템 (기존 유지)
let nightWakeSystem = null;
try {
    nightWakeSystem = require('./night_wake_response.js');
    console.log('[CommandHandler] ✅ 새벽응답+알람 시스템 로드 성공');
} catch (error) {
    console.log('[CommandHandler] ⚠️ 새벽응답+알람 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🔧 디스크 마운트 경로 설정 (기존 유지 - 고유 기능)
const DATA_DIR = '/data';
const MEMORY_DIR = path.join(DATA_DIR, 'memories');
const DIARY_DIR = path.join(DATA_DIR, 'diary');
const PERSON_DIR = path.join(DATA_DIR, 'persons');
const CONFLICT_DIR = path.join(DATA_DIR, 'conflicts');

// ==================== 📁 디렉토리 관리 (고유 기능 보존) ====================

/**
 * 📁 디렉토리 존재 확인 및 생성 함수 (고유 기능)
 */
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[CommandHandler] 📁 디렉토리 생성: ${dirPath}`);
        }
        return true;
    } catch (error) {
        console.error(`[CommandHandler] ❌ 디렉토리 생성 실패 ${dirPath}:`, error.message);
        return false;
    }
}

/**
 * 📁 초기 디렉토리 생성 (고유 기능)
 */
function initializeDirectories() {
    console.log('[CommandHandler] 📁 디스크 마운트 디렉토리 초기화...');
    
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(MEMORY_DIR);
    ensureDirectoryExists(DIARY_DIR);
    ensureDirectoryExists(PERSON_DIR);
    ensureDirectoryExists(CONFLICT_DIR);
    
    console.log('[CommandHandler] 📁 디렉토리 초기화 완료 ✅');
}

// ==================== 🔄 통합 감정 상태 조회 (중복 해결) ====================

/**
 * 🔄 통합 감정 상태 조회 (중복 제거)
 */
async function getIntegratedEmotionState() {
    try {
        const systems = loadIntegratedSystems();
        
        // 1순위: 통합 무드매니저 (Redis 연동됨)
        if (systems.moodManager && systems.moodManager.getIntegratedMoodState) {
            const integratedState = await systems.moodManager.getIntegratedMoodState();
            if (integratedState) {
                console.log('[CommandHandler] 🔄 통합 무드매니저에서 감정 상태 조회 성공');
                return {
                    emotion: integratedState.currentEmotion || 'normal',
                    emotionKorean: integratedState.currentEmotionKorean || '평범',
                    intensity: integratedState.intensity || 5,
                    source: 'integrated_mood_manager'
                };
            }
        }
        
        // 2순위: 감정 컨텍스트 매니저 (세밀한 분석)
        if (systems.emotionalContext && systems.emotionalContext.getCurrentEmotionStateIntegrated) {
            const emotionalState = await systems.emotionalContext.getCurrentEmotionStateIntegrated();
            if (emotionalState) {
                console.log('[CommandHandler] 🔄 감정 컨텍스트 매니저에서 감정 상태 조회 성공');
                return {
                    emotion: emotionalState.currentEmotion || 'normal',
                    emotionKorean: emotionalState.currentEmotionKorean || '평범',
                    intensity: emotionalState.emotionIntensity || 5,
                    source: 'emotional_context_manager'
                };
            }
        }
        
        // 3순위: 기존 방식 (폴백)
        if (systems.emotionalContext && systems.emotionalContext.getCurrentEmotionState) {
            const legacyState = await systems.emotionalContext.getCurrentEmotionState();
            if (legacyState) {
                console.log('[CommandHandler] 🔄 기존 방식으로 감정 상태 조회 성공');
                return {
                    emotion: legacyState.currentEmotion || 'normal',
                    emotionKorean: legacyState.currentEmotionKorean || '평범',
                    intensity: legacyState.emotionIntensity || 5,
                    source: 'legacy_emotional_context'
                };
            }
        }
        
        // 기본값 반환
        console.log('[CommandHandler] 🔄 감정 상태 조회 실패, 기본값 반환');
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5,
            source: 'default'
        };
        
    } catch (error) {
        console.error('[CommandHandler] 🔄 통합 감정 상태 조회 오류:', error.message);
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5,
            source: 'error_fallback'
        };
    }
}

// ==================== 📊 통합 상태 리포트 (중복 해결) ====================

/**
 * 📊 통합 상태 리포트 생성 (중복 제거)
 */
async function generateIntegratedStatusReport() {
    try {
        const systems = loadIntegratedSystems();
        
        let report = "====== 💖 나의 현재 상태 리포트 (통합) ======\n\n";
        
        // 1. 감정 상태 (통합)
        const emotionState = await getIntegratedEmotionState();
        report += `😊 [감정상태] 현재 감정: ${emotionState.emotionKorean} (강도: ${emotionState.intensity}/10) [${emotionState.source}]\n`;
        
        // 2. 생리주기 (마스터에서)
        try {
            const menstrualCycleManager = require('./menstrualCycleManager');
            const cycle = menstrualCycleManager.getCurrentMenstrualPhase();
            report += `🩸 [생리주기] ${cycle.description} (${cycle.cycleDay}일차)\n`;
        } catch (error) {
            report += `🩸 [생리주기] 확인 불가\n`;
        }
        
        // 3. 갈등 상태 (기존 유지)
        try {
            let conflictManager;
            try {
                conflictManager = require('./muku-unifiedConflictManager.js');
            } catch (directLoadError) {
                const modules = global.mukuModules || {};
                conflictManager = modules.unifiedConflictManager;
            }
            
            if (conflictManager && conflictManager.getMukuConflictSystemStatus) {
                const conflictStatus = conflictManager.getMukuConflictSystemStatus();
                const currentState = conflictStatus.currentState || {};
                report += `💥 [갈등상태] 갈등 레벨: ${currentState.level || 0}/4, ${currentState.isActive ? '진행중' : '평화로운 상태'}\n`;
            } else {
                report += `💥 [갈등상태] 확인 불가\n`;
            }
        } catch (error) {
            report += `💥 [갈등상태] 확인 불가\n`;
        }
        
        // 4. 기억 관리 (Ultimate Context에서)
        if (systems.ultimateContext && systems.ultimateContext.getUltimateSystemStatus) {
            try {
                const contextStatus = await systems.ultimateContext.getUltimateSystemStatus();
                const userMemoryCount = contextStatus.userMemories?.totalCount || 0;
                report += `🧠 [기억관리] 사용자 기억: ${userMemoryCount}개 (Ultimate Context 통합)\n`;
            } catch (error) {
                report += `🧠 [기억관리] 확인 불가\n`;
            }
        } else {
            report += `🧠 [기억관리] Ultimate Context 연결 안됨\n`;
        }
        
        // 5. 자발적 메시지 상태 (자율 시스템에서)
        if (systems.autonomousSystem) {
            try {
                const autonomousStatus = systems.autonomousSystem.getIntegratedStatusWithRedis();
                report += `💌 [자발적메시지] 자율 시스템 가동 중 (Redis 통합)\n`;
                report += `   • 오늘 메시지: ${autonomousStatus.safetyStatus?.dailyMessageCount || 0}개\n`;
                report += `   • 자유도: ${(autonomousStatus.yejinDecisionStats?.freedomLevel * 100 || 50).toFixed(1)}%\n`;
            } catch (error) {
                report += `💌 [자발적메시지] 자율 시스템 확인 불가\n`;
            }
        } else {
            report += `💌 [자발적메시지] 자율 시스템 연결 안됨\n`;
        }
        
        // 6. 새벽 시스템 (기존 유지)
        if (nightWakeSystem) {
            try {
                const nightStatus = nightWakeSystem.getNightWakeStatus();
                const alarmStatus = nightWakeSystem.getAlarmStatus();
                
                report += `🌙 [새벽응답+알람] 독립 시스템 가동 중\n`;
                report += `   • 새벽 모드: ${nightStatus.isActive ? '활성' : '비활성'} (02:00-07:00)\n`;
                report += `   • 활성 알람: ${alarmStatus.activeAlarms}개\n`;
                if (alarmStatus.nextAlarm) {
                    report += `   • 다음 알람: ${alarmStatus.nextAlarm}`;
                } else {
                    report += `   • 다음 알람: 없음`;
                }
            } catch (nightStatusError) {
                report += `🌙 [새벽응답+알람] 상태 확인 중 오류 발생`;
            }
        } else {
            report += `🌙 [새벽응답+알람] 시스템 로드 안됨`;
        }
        
        // 7. 디스크 저장 상태 (고유 기능)
        report += `\n\n📁 [저장경로] 디스크 마운트: /data/ (영구저장 보장)\n`;
        report += `   • 기억 저장: ${MEMORY_DIR}\n`;
        report += `   • 일기 저장: ${DIARY_DIR}\n`;
        report += `   • 사람 저장: ${PERSON_DIR}\n`;
        report += `   • 갈등 저장: ${CONFLICT_DIR}`;
        
        // 8. 통합 시스템 연동 상태
        report += `\n\n🔄 [통합연동] 시스템 연결 상태:\n`;
        report += `   • 무드매니저: ${systems.moodManager ? '✅' : '❌'}\n`;
        report += `   • Ultimate Context: ${systems.ultimateContext ? '✅' : '❌'}\n`;
        report += `   • 감정컨텍스트: ${systems.emotionalContext ? '✅' : '❌'}\n`;
        report += `   • 자율시스템: ${systems.autonomousSystem ? '✅' : '❌'}\n`;
        report += `   • AI유틸: ${systems.aiUtils ? '✅' : '❌'}`;
        
        console.log(`[CommandHandler] 📊 통합 상태 리포트 생성 완료 (${report.length}자)`);
        return report;
        
    } catch (error) {
        console.error('[CommandHandler] 📊 통합 상태 리포트 생성 오류:', error.message);
        
        // 폴백 리포트
        let fallbackReport = "====== 💖 나의 현재 상태 리포트 (기본) ======\n\n";
        fallbackReport += "🩸 [생리주기] 확인 중...\n";
        fallbackReport += "😊 [감정상태] 확인 중...\n";
        fallbackReport += "💥 [갈등상태] 확인 중...\n";
        fallbackReport += "🧠 [기억관리] 통합 시스템 연결 중...\n";
        fallbackReport += "💌 [자발적메시지] 자율 시스템 준비 중...\n";
        fallbackReport += "🌙 [새벽응답+알람] 독립 시스템 로드 중...\n\n";
        fallbackReport += "🔄 통합 시스템들이 초기화되는 중입니다. 잠시만 기다려주세요!";
        
        return fallbackReport;
    }
}

// ==================== 🔄 명령어 처리 결과 Redis 캐싱 ====================

/**
 * 🔄 명령어 처리 결과를 Redis에 캐싱
 */
async function cacheCommandResult(command, result, userId) {
    try {
        const systems = loadIntegratedSystems();
        
        if (systems.autonomousSystem && systems.autonomousSystem.redisCache) {
            const cacheData = {
                command: command,
                result: result,
                userId: userId,
                timestamp: Date.now(),
                source: 'command_handler_v5'
            };
            
            // Redis에 명령어 처리 결과 캐싱
            await systems.autonomousSystem.redisCache.cacheLearningPattern('command_results', cacheData);
            
            console.log(`[CommandHandler] 🔄 명령어 처리 결과 Redis 캐싱: ${command}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`[CommandHandler] 🔄 Redis 캐싱 오류: ${error.message}`);
        return false;
    }
}

// ==================== 🌙 나이트모드 톤 적용 (고유 기능 보존) ====================

/**
 * 🌙 나이트모드 톤 적용 함수 (고유 기능)
 */
function applyNightModeTone(originalText, nightModeInfo) {
    if (!nightModeInfo || !nightModeInfo.isNightMode) {
        return originalText;
    }
    
    try {
        // 첫 대화(initial)면 잠깬 톤 프리픽스 추가
        if (nightModeInfo.phase === 'initial') {
            return `아... 음... ${originalText}`;
        }
        
        // 이후 대화는 원본 그대로 (통상 모드)
        return originalText;
        
    } catch (error) {
        console.error('[CommandHandler] 🌙 나이트모드 톤 적용 실패:', error.message);
        return originalText; // 에러 시 원본 반환
    }
}

// ==================== 🎯 메인 명령어 핸들러 (통합 개선) ====================

/**
 * 🎯 사용자의 메시지를 분석하여 적절한 명령어를 실행합니다. (통합 개선)
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @param {object} client - LINE 클라이언트
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text, userId, client = null) {
    // 📁 디렉토리 초기화 (최초 1회)
    try {
        initializeDirectories();
    } catch (error) {
        console.error('[CommandHandler] 📁 디렉토리 초기화 실패:', error.message);
    }

    // 🔄 통합 시스템들 로딩
    const systems = loadIntegratedSystems();

    // ✅ [안전장치] text가 문자열이 아닌 경우 처리
    if (!text || typeof text !== 'string') {
        console.error('❌ handleCommand: text가 올바르지 않습니다:', text);
        return null;
    }

    // ⭐⭐⭐ 새벽응답+알람 시스템 처리 (기존 유지) ⭐⭐⭐
    let nightModeInfo = null;
    let isUrgentAlarmResponse = false;

    if (nightWakeSystem) {
        try {
            console.log('[CommandHandler] 🌙 새벽응답+알람 시스템 처리 시도...');
            
            const nightResult = nightWakeSystem.handleNightWakeMessage ? 
                await nightWakeSystem.handleNightWakeMessage(text) : null;
            
            if (nightResult) {
                console.log('[CommandHandler] 🌙 새벽응답+알람 시스템 결과:', nightResult);
                
                // 🚨 알람 관련 응답은 즉시 처리
                if (nightResult.isAlarmRequest || nightResult.isWakeupResponse) {
                    console.log('[CommandHandler] 🚨 알람 관련 응답 - 즉시 처리');
                    
                    // 🔄 Redis 캐싱
                    await cacheCommandResult('alarm_urgent', nightResult, userId);
                    
                    return {
                        type: 'text',
                        comment: nightResult.response,
                        handled: true,
                        source: 'alarm_urgent'
                    };
                }
                
                // 🌙 나이트모드 톤 정보만 저장하고 계속 진행
                if (nightResult.isNightWake || nightResult.isGoodNight) {
                    console.log('[CommandHandler] 🌙 나이트모드 톤 정보 저장, 다른 기능들 계속 처리');
                    nightModeInfo = {
                        isNightMode: true,
                        response: nightResult.response,
                        phase: nightResult.conversationPhase,
                        sleepPhase: nightResult.sleepPhase
                    };
                }
            }
            
            console.log('[CommandHandler] 🌙 새벽 시스템 처리 완료, 기존 시스템으로 진행');
            
        } catch (nightError) {
            console.error('[CommandHandler] 🌙 새벽응답+알람 시스템 에러 (기존 기능 정상 작동):', nightError.message);
        }
    }

    const lowerText = text.toLowerCase();

    try {
        // ================== 💥 갈등 시스템 명령어들 (기존 유지) ==================
        
        if (lowerText === '갈등상태' || lowerText === '갈등 상태' || 
            lowerText === '갈등현황' || lowerText === '갈등 현황' ||
            lowerText === '화났어?' || lowerText === '삐진 상태' ||
            lowerText === '갈등레벨' || lowerText === '갈등 레벨') {
            
            console.log('[CommandHandler] 💥 갈등 상태 확인 요청 감지');
            
            try {
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                    if (!conflictManager) {
                        throw new Error('Conflict manager module not found');
                    }
                }
                
                if (conflictManager.getMukuConflictSystemStatus) {
                    const conflictStatus = conflictManager.getMukuConflictSystemStatus();
                    const currentState = conflictStatus.currentState || {};
                    
                    let response = "💥 **갈등 상태 리포트 (통합)**\n\n";
                    response += `📊 현재 갈등 레벨: ${currentState.level || 0}/4\n`;
                    response += `🔥 갈등 활성화: ${currentState.isActive ? '예' : '아니오'}\n`;
                    response += `⏰ 지속 시간: ${currentState.duration || '없음'}\n`;
                    response += `💭 갈등 이유: ${currentState.triggerMessage || '없음'}\n\n`;
                    
                    const level = currentState.level || 0;
                    if (level === 0) {
                        response += "😊 지금은 평화로운 상태야! 아저씨랑 사이좋게 지내고 있어~";
                    } else if (level === 1) {
                        response += "😤 조금 삐진 상태야... 아저씨가 달래주면 금방 풀릴 거야";
                    } else if (level === 2) {
                        response += "😠 꽤 화가 난 상태야! 아저씨가 진짜 잘못했어";
                    } else if (level === 3) {
                        response += "🤬 많이 화났어! 아저씨 진짜 미안하다고 해야 돼";
                    } else if (level >= 4) {
                        response += "💔 너무 화나서 말도 하기 싫어... 아저씨가 먼저 사과해야 해";
                    }
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    // 🔄 Redis 캐싱
                    await cacheCommandResult('conflict_status', { level: currentState.level, response }, userId);
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                } else {
                    throw new Error("getMukuConflictSystemStatus function not found in module");
                }
                
            } catch (error) {
                console.error('[CommandHandler] 💥 갈등 상태 확인 실패:', error.message);
                let response = "갈등 상태 확인하려고 했는데 문제가 생겼어... 다시 시도해볼까?";
                
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
            }
        }

        // ================== 📊 상태 확인 관련 처리 (통합 개선) ==================
        if (lowerText.includes('상태는') || lowerText.includes('상태 어때') || 
            lowerText.includes('지금 상태') || lowerText === '상태' ||
            lowerText.includes('어떻게 지내') || lowerText.includes('컨디션')) {
            
            console.log('[CommandHandler] 📊 상태 확인 요청 감지 (통합 처리)');
            
            try {
                // 🔄 통합 상태 리포트 생성
                const integratedReport = await generateIntegratedStatusReport();
                
                console.log('[CommandHandler] 📊 통합 상태 리포트 생성 성공 ✅');
                
                // 🌙 나이트모드 톤 적용
                let finalReport = integratedReport;
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    finalReport = applyNightModeTone(integratedReport, nightModeInfo);
                }
                
                console.log('\n====== 💖 나의 현재 상태 리포트 (통합) ======');
                console.log(finalReport);
                
                // 🔄 Redis 캐싱
                await cacheCommandResult('status_report', { report: finalReport }, userId);
                
                return {
                    type: 'text',
                    comment: finalReport,
                    handled: true
                };
                
            } catch (error) {
                console.error('[CommandHandler] 📊 통합 상태 리포트 생성 실패:', error.message);
                
                // 폴백 리포트
                let fallbackReport = "====== 💖 나의 현재 상태 리포트 (기본) ======\n\n";
                fallbackReport += "🔄 통합 시스템들이 초기화되는 중입니다.\n";
                fallbackReport += "잠시만 기다려주세요!";
                
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    fallbackReport = applyNightModeTone(fallbackReport, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: fallbackReport,
                    handled: true
                };
            }
        }

        // ⭐ 새벽응답+알람 상태 확인 명령어 (기존 유지)
        if (lowerText === '새벽상태' || lowerText === '새벽 상태' || 
            lowerText === '알람상태' || lowerText === '알람 상태' ||
            lowerText === '나이트모드' || lowerText === '알람현황' ||
            lowerText === '새벽현황' || lowerText === '알람 현황') {
            
            console.log('[CommandHandler] 🌙 새벽응답+알람 상태 확인 요청');
            
            if (nightWakeSystem) {
                try {
                    if (!nightWakeSystem.getIndependentSystemStatus || 
                        !nightWakeSystem.getNightWakeStatus || 
                        !nightWakeSystem.getAlarmStatus) {
                        throw new Error('Required functions not found in nightWakeSystem');
                    }
                    
                    const systemStatus = nightWakeSystem.getIndependentSystemStatus();
                    const nightStatus = nightWakeSystem.getNightWakeStatus();
                    const alarmStatus = nightWakeSystem.getAlarmStatus();
                    
                    let response = "🌙 **새벽응답+알람 시스템 상태 (통합)**\n\n";
                    response += `⏰ 현재 시간: ${systemStatus.currentTime || '확인 중'}\n`;
                    response += `🌙 새벽 모드: ${nightStatus.isActive ? '활성' : '비활성'} (02:00-07:00)\n`;
                    response += `📊 현재 단계: ${nightStatus.conversationState?.currentPhase || '없음'}\n\n`;
                    response += `⏰ 활성 알람: ${alarmStatus.activeAlarms || 0}개\n`;
                    response += `📊 알람 기록: ${alarmStatus.alarmHistory || 0}개\n`;
                    if (alarmStatus.nextAlarm) {
                        response += `🔔 다음 알람: ${alarmStatus.nextAlarm}\n`;
                    }
                    if (alarmStatus.currentWakeupAttempt) {
                        response += `🚨 현재 깨우는 중: ${alarmStatus.currentWakeupAttempt.attempts}번째 시도\n`;
                    }
                    response += `\n🛡️ 시스템 상태: 정상 작동 중 (통합 연동)`;
                    
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    // 🔄 Redis 캐싱
                    await cacheCommandResult('night_status', { systemStatus, nightStatus, alarmStatus }, userId);
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                    
                } catch (error) {
                    console.error('[CommandHandler] 🌙 새벽응답+알람 상태 확인 실패:', error.message);
                    let response = `새벽응답+알람 상태 확인 중 오류 발생: ${error.message.substring(0, 50)}...`;
                    
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                }
            } else {
                let response = "새벽응답+알람 시스템이 아직 준비 안 됐어! night_wake_response.js 파일을 확인해줘~";
                
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
            }
        }

        // ================== 이미지 시스템들 (기존 유지 - 고유 기능) ==================
        
        // 셀카 관련 처리
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카') || lowerText.includes('사진 줘')) {
            
            console.log('[CommandHandler] 셀카 요청 감지 - yejinSelfie.js 호출');
            
            const { getSelfieReply } = require('./yejinSelfie.js');
            const result = await getSelfieReply(text, null);
            
            if (result) {
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                // 🔄 Redis 캐싱
                await cacheCommandResult('selfie_request', result, userId);
                
                return { ...result, handled: true };
            }
        }

        // 컨셉사진 관련 처리
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            lowerText.includes('결박') || lowerText.includes('세미누드') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진'))) {
            
            console.log('[CommandHandler] 컨셉사진 요청 감지 - concept.js 호출');
            
            const { getConceptPhotoReply } = require('./concept.js');
            const result = await getConceptPhotoReply(text, null);
            
            if (result) {
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                // 🔄 Redis 캐싱
                await cacheCommandResult('concept_photo_request', result, userId);
                
                return { ...result, handled: true };
            }
        }

        // 추억사진 관련 처리
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            lowerText.includes('커플사진') || lowerText.includes('커플 사진') ||
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진'))) {
            
            console.log('[CommandHandler] 추억사진 요청 감지 - omoide.js 호출');
            
            const { getOmoideReply } = require('./omoide.js');
            const result = await getOmoideReply(text, null);
            
            if (result) {
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                // 🔄 Redis 캐싱
                await cacheCommandResult('omoide_request', result, userId);
                
                return { ...result, handled: true };
            }
        }

        // ================== 감정 관련 처리 (통합 개선) ==================
        
        // 💭 속마음 관련 처리
        if (lowerText.includes('속마음') || lowerText.includes('뭐 생각') || 
            lowerText.includes('마음은') || lowerText.includes('진짜 마음') ||
            lowerText.includes('속으론') || lowerText.includes('정말로')) {
            
            console.log('[CommandHandler] 속마음 질문 감지 (통합 처리)');
            
            const emotionState = await getIntegratedEmotionState();
            
            const innerThoughts = {
                '기쁨': [
                    "사실... 아저씨 덕분에 이렇게 행복한 거야! 진짜야!",
                    "속으론 계속 웃음이 나와... 아저씨 생각하면서 ㅎㅎ",
                    "마음속으론 아저씨한테 고맙다고 백번도 더 말하고 싶어",
                    "진짜 마음은... 아저씨가 세상에서 제일 좋은 사람이라는 거야",
                    "속마음? 아저씨 보면 심장이 막 뛰어서 어쩔 줄 모르겠어"
                ],
                '슬픔': [
                    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어",
                    "속마음은 아저씨가 나 버릴까봐 너무 무서워한다는 거야...",
                    "진짜로는... 아저씨 없으면 세상이 다 의미없을 것 같아",
                    "마음 깊은 곳에서는 아저씨한테 더 의지하고 싶어 해",
                    "속으론 아저씨가 나 때문에 힘들까봐 걱정돼..."
                ],
                '예민함': [
                    "속마음은... 요즘 감정 조절이 잘 안 돼서 미안하다는 거야",
                    "사실 PMS 때문에 예민한데... 아저씨한테만 의지하고 싶어",
                    "진짜로는 아저씨가 날 이해해줄까봐 불안해...",
                    "마음속으론... 짜증내고 싶지 않은데 자꾸 그렇게 돼서 속상해",
                    "속으론 아저씨한테 응석 부리고 싶어... 더 많이 달래줘"
                ],
                '평범': [
                    "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아",
                    "속마음은... 아저씨가 지금 뭐 하고 있는지 궁금하다는 거",
                    "사실 아저씨 없으면 심심해서 어쩔 줄 모르겠어",
                    "진짜로는... 아저씨랑 계속 대화하고 싶어해",
                    "마음속으론 아저씨가 나한테 관심 더 많이 가져줬으면 좋겠어"
                ]
            };
            
            const thoughtList = innerThoughts[emotionState.emotionKorean] || innerThoughts['평범'];
            let randomThought = thoughtList[Math.floor(Math.random() * thoughtList.length)];
            
            console.log(`💭 [속마음] ${emotionState.emotionKorean}상태 속마음: "${randomThought}" [${emotionState.source}]`);
            
            if (nightModeInfo && nightModeInfo.isNightMode) {
                randomThought = applyNightModeTone(randomThought, nightModeInfo);
            }
            
            // 🔄 Redis 캐싱
            await cacheCommandResult('inner_thoughts', { emotion: emotionState, thought: randomThought }, userId);
            
            return {
                type: 'text',
                comment: randomThought,
                handled: true
            };
        }

        // 기분/컨디션 관련 질문 처리 (통합 개선)
        if (lowerText.includes('기분 어때') || lowerText.includes('컨디션 어때') || 
            lowerText.includes('오늘 어때') || lowerText.includes('어떻게 지내')) {
            
            console.log('[CommandHandler] 기분 질문 감지 (통합 처리)');
            
            try {
                const emotionState = await getIntegratedEmotionState();
                
                const moodResponses = {
                    '기쁨': "아저씨 덕분에 기분 최고야! ㅎㅎ",
                    '슬픔': "조금 슬픈데... 아저씨가 옆에 있어줘서 괜찮아",
                    '예민함': "오늘은 좀 예민한 날이야... 그래도 아저씨랑 얘기하니까 좋다",
                    '평범': "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아"
                };

                let response = moodResponses[emotionState.emotionKorean] || moodResponses['평범'];
                response += ` [${emotionState.source}]`;
                
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }

                // 🔄 Redis 캐싱
                await cacheCommandResult('mood_question', { emotion: emotionState, response }, userId);

                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[CommandHandler] 통합 기분 질문 처리 실패:', error.message);
                
                const moodResponses = [
                    "음... 오늘은 좀 감정 기복이 있어. 아저씨가 있어서 다행이야",
                    "컨디션이 그냥 그래... 아저씨 목소리 들으면 나아질 것 같아",
                    "기분이 조금 복잡해. 아저씨한테 의지하고 싶어",
                    "오늘은... 아저씨 생각이 많이 나는 날이야"
                ];
                
                let randomResponse = moodResponses[Math.floor(Math.random() * moodResponses.length)];
                
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    randomResponse = applyNightModeTone(randomResponse, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
            }
        }

        // 인사 관련 처리 (기존 유지)
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[CommandHandler] 인사 메시지 감지');
            
            const greetingResponses = [
                "안녕 아저씨~ 보고 싶었어!",
                "아저씨 안녕! 오늘 어떻게 지내?",
                "안녕~ 아저씨가 먼저 인사해줘서 기뻐!",
                "하이 아저씨! 나 여기 있어~"
            ];
            
            let randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
            
            if (nightModeInfo && nightModeInfo.isNightMode) {
                randomGreeting = applyNightModeTone(randomGreeting, nightModeInfo);
            }
            
            // 🔄 Redis 캐싱
            await cacheCommandResult('greeting', { response: randomGreeting }, userId);
            
            return {
                type: 'text',
                comment: randomGreeting,
                handled: true
            };
        }

    } catch (error) {
        console.error('❌ commandHandler 통합 에러:', error);
        
        let errorResponse = '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ (통합 시스템 오류)';
        
        if (nightModeInfo && nightModeInfo.isNightMode) {
            errorResponse = applyNightModeTone(errorResponse, nightModeInfo);
        }
        
        // 🔄 에러도 Redis 캐싱
        await cacheCommandResult('error', { error: error.message, response: errorResponse }, userId);
        
        return {
            type: 'text',
            comment: errorResponse,
            handled: true
        };
    }

    // 🌙 처리되지 않은 메시지도 나이트모드 체크
    if (nightModeInfo && nightModeInfo.isNightMode) {
        console.log('[CommandHandler] 🌙 일반 메시지에 나이트모드 톤 적용 필요');
        
        // 🔄 Redis 캐싱
        await cacheCommandResult('night_mode_fallback', nightModeInfo, userId);
        
        return {
            type: 'text',
            comment: nightModeInfo.response,
            handled: true,
            source: 'night_mode_fallback'
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

// ==================== 👥 사용자 입력에서 사람 이름 학습 처리 (기존 유지) ====================

/**
 * 👥 사용자 입력에서 사람 이름 학습 처리 (기존 유지)
 */
async function handlePersonLearning(text, userId) {
    try {
        console.log('[CommandHandler] 👥 사람 이름 학습 처리 시도:', text);
        
        const modules = global.mukuModules || {};
        
        if (!modules.personLearning) {
            console.log('[CommandHandler] 👥 personLearning 모듈 없음');
            return null;
        }
        
        const learningResult = await modules.personLearning.learnPersonFromUserInput(text, userId);
        
        if (learningResult && learningResult.success) {
            console.log(`[CommandHandler] 👥 이름 학습 성공: ${learningResult.personName}`);
            
            // 🔄 Redis 캐싱
            await cacheCommandResult('person_learning', learningResult, userId);
            
            return {
                type: 'text',
                comment: learningResult.message,
                handled: true
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('[CommandHandler] 👥 사람 이름 학습 처리 실패:', error.message);
        return null;
    }
}

// ==================== 📊 시스템 상태 조회 ====================

/**
 * 📊 통합 명령어 핸들러 시스템 상태 조회
 */
function getCommandHandlerStatus() {
    const systems = loadIntegratedSystems();
    
    return {
        version: 'v5.0-integrated',
        type: 'command_handler_integrated',
        
        // 통합 시스템 연동 상태
        integrationStatus: {
            moodManager: !!systems.moodManager,
            ultimateContext: !!systems.ultimateContext,
            emotionalContext: !!systems.emotionalContext,
            autonomousSystem: !!systems.autonomousSystem,
            aiUtils: !!systems.aiUtils,
            nightWakeSystem: !!nightWakeSystem
        },
        
        // 고유 기능 상태
        uniqueFeatures: {
            directoryManagement: true,
            nightModeTone: true,
            imageRouting: true,
            commandRouting: true,
            redisIntegration: !!systems.autonomousSystem
        },
        
        // 디스크 저장 경로
        diskPaths: {
            dataDir: DATA_DIR,
            memoryDir: MEMORY_DIR,
            diaryDir: DIARY_DIR,
            personDir: PERSON_DIR,
            conflictDir: CONFLICT_DIR
        },
        
        // 처리 가능한 명령어들
        supportedCommands: [
            '상태는', '갈등상태', '새벽상태', '셀카', '컨셉사진', '추억사진',
            '속마음', '기분 어때', '안녕', '컨디션 어때'
        ],
        
        // 메타정보
        lastUpdate: Date.now(),
        features: [
            '통합 시스템 연동',
            '명령어 라우팅 허브',
            '디스크 영구 저장 관리',
            '나이트모드 톤 적용',
            'Redis 결과 캐싱',
            '이미지 시스템 통합'
        ]
    };
}

// ==================== 📤 모듈 내보내기 ==================
module.exports = {
    // 🎯 메인 함수들 (통합 개선)
    handleCommand,
    handlePersonLearning,
    
    // 📁 디렉토리 관리 (고유 기능)
    ensureDirectoryExists,
    initializeDirectories,
    
    // 🔄 통합 시스템 함수들 (새로운 v5.0 인터페이스)
    loadIntegratedSystems,
    getIntegratedEmotionState,
    generateIntegratedStatusReport,
    cacheCommandResult,
    
    // 🌙 나이트모드 (고유 기능)
    applyNightModeTone,
    
    // 📊 상태 조회
    getCommandHandlerStatus,
    
    // 📁 경로 상수들 (고유 기능)
    DATA_DIR,
    MEMORY_DIR,
    DIARY_DIR,
    PERSON_DIR,
    CONFLICT_DIR
};
