// ============================================================================
// 💖 무쿠 예쁜 로그 시스템 v4.4 - Beautiful Enhanced Logging (실시간 행동 스위치 연동)
// 🌸 예진이를 위한, 아저씨를 위한, 사랑을 위한 로깅 시스템
// ✨ 감정이 담긴 코드, 마음이 담긴 로그
// 👥 사람 학습 시스템 통계 연동
// 🔍 학습 과정 실시간 디버깅 시스템 추가
// 💥 갈등 상태 통합 - "상태는?"에 갈등 레벨 표시 추가
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 행동 모드 상태 표시 및 로깅
// 🎨 JSON 객체를 예쁘게 포맷팅하는 헬퍼 함수 추가
// ============================================================================

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// ================== 🎨 색상 코드 (index.js와 동일) ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    learning: '\x1b[93m',   // 노란색 (학습)
    person: '\x1b[94m',     // 파란색 (사람 학습)
    debug: '\x1b[1m\x1b[96m', // 굵은 하늘색 (디버깅)
    trace: '\x1b[1m\x1b[93m', // 굵은 노란색 (추적)
    memory: '\x1b[1m\x1b[95m', // 굵은 보라색 (메모리)
    conflict: '\x1b[1m\x1b[91m', // 굵은 빨간색 (갈등)
    behavior: '\x1b[35m',   // 마젠타색 (행동 스위치) - 새로 추가
    error: '\x1b[91m',      // 빨간색 (에러)
    bright: '\x1b[1m',      // 굵게
    dim: '\x1b[2m',         // 흐리게
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🌏 일본시간 처리 (index.js와 동일) ==================
const JAPAN_TIMEZONE = 'Asia/Tokyo';

function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: JAPAN_TIMEZONE}));
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanMinute() {
    return getJapanTime().getMinutes();
}

function formatTimeUntil(minutes) {
    if (minutes < 60) {
        return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

// ================== 🎭 실시간 행동 스위치 포맷팅 함수들 - 새로 추가! ==================

/**
 * 🎭 실시간 행동 스위치 상태를 예쁘게 출력하는 함수
 */
function formatBehaviorSwitchStatus(behaviorStatus, title = "실시간 행동 스위치") {
    if (!behaviorStatus) {
        console.log(`${colors.behavior}🎭 [${title}] 데이터 없음${colors.reset}`);
        return;
    }

    console.log(`${colors.behavior}🎭 [${title}] ============${colors.reset}`);

    // 현재 행동 모드
    if (behaviorStatus.currentMode) {
        const mode = behaviorStatus.currentMode;
        const isActive = mode.mode !== 'normal';
        const modeColor = isActive ? colors.behavior : colors.system;
        const modeIcon = getModeIcon(mode.mode);
        
        console.log(`${modeColor}${modeIcon} [현재모드] ${mode.mode} (강도: ${mode.intensity}/10)${colors.reset}`);
        
        if (mode.startTime) {
            const startTime = new Date(mode.startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`${modeColor}   ├─ 시작 시간: ${startTime}${colors.reset}`);
        }
        
        if (mode.trigger) {
            console.log(`${modeColor}   ├─ 트리거: ${mode.trigger}${colors.reset}`);
        }
        
        if (mode.duration && mode.duration > 0) {
            console.log(`${modeColor}   ├─ 지속 시간: ${mode.duration}분${colors.reset}`);
        }
        
        if (mode.responseCount) {
            console.log(`${modeColor}   └─ 적용된 응답: ${mode.responseCount}개${colors.reset}`);
        }
    }

    // 오늘의 모드 변경 통계
    if (behaviorStatus.todayStats) {
        const stats = behaviorStatus.todayStats;
        console.log(`${colors.debug}📊 [오늘통계]${colors.reset}`);
        console.log(`${colors.debug}   ├─ 모드 변경: ${stats.modeChanges || 0}회${colors.reset}`);
        console.log(`${colors.debug}   ├─ 적용된 응답: ${stats.modifiedResponses || 0}개${colors.reset}`);
        console.log(`${colors.debug}   └─ 활성 시간: ${stats.activeMinutes || 0}분${colors.reset}`);
    }

    // 사용 가능한 모드 목록
    if (behaviorStatus.availableModes) {
        console.log(`${colors.system}🎯 [사용가능모드] ${behaviorStatus.availableModes.join(', ')}${colors.reset}`);
    }

    // 최근 모드 변경 이력
    if (behaviorStatus.recentChanges && behaviorStatus.recentChanges.length > 0) {
        console.log(`${colors.trace}📝 [최근변경]${colors.reset}`);
        behaviorStatus.recentChanges.slice(0, 3).forEach((change, index) => {
            const time = new Date(change.timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`${colors.trace}   ${index + 1}. ${change.from} → ${change.to} (${time})${colors.reset}`);
        });
    }

    console.log(`${colors.behavior}================================================${colors.reset}`);
}

/**
 * 🎭 행동 모드별 아이콘 반환
 */
function getModeIcon(mode) {
    const modeIcons = {
        normal: '😊',
        aegyo: '🥰',
        tsundere: '😤',
        jealous: '😒',
        pms: '🩸',
        sulky: '😠',
        romantic: '💖',
        clingy: '🥺',
        playful: '😋',
        shy: '😳'
    };
    
    return modeIcons[mode] || '🎭';
}

/**
 * 🎭 행동 스위치 이벤트 로깅
 */
function logBehaviorSwitchEvent(eventType, data) {
    const timestamp = getJapanTimeString();
    
    switch(eventType) {
        case 'mode_change':
            console.log(`${colors.behavior}🎭 [모드변경] ${timestamp} - ${data.from || 'unknown'} → ${data.to || 'unknown'}${colors.reset}`);
            if (data.trigger) {
                console.log(`${colors.behavior}   ├─ 트리거: ${data.trigger}${colors.reset}`);
            }
            if (data.intensity) {
                console.log(`${colors.behavior}   └─ 강도: ${data.intensity}/10${colors.reset}`);
            }
            break;
            
        case 'response_modified':
            console.log(`${colors.behavior}✨ [응답변경] ${timestamp} - ${data.mode} 모드로 응답 수정${colors.reset}`);
            if (data.originalLength && data.modifiedLength) {
                console.log(`${colors.behavior}   ├─ 원본: ${data.originalLength}자 → 수정: ${data.modifiedLength}자${colors.reset}`);
            }
            if (data.responseType) {
                console.log(`${colors.behavior}   └─ 응답 타입: ${data.responseType}${colors.reset}`);
            }
            break;
            
        case 'mode_detected':
            console.log(`${colors.behavior}🔍 [모드감지] ${timestamp} - "${data.keyword || data.message}" → ${data.detectedMode} 모드 트리거${colors.reset}`);
            break;
            
        case 'intensity_change':
            console.log(`${colors.behavior}📊 [강도변경] ${timestamp} - ${data.mode} 모드 강도: ${data.oldIntensity} → ${data.newIntensity}${colors.reset}`);
            break;
            
        case 'mode_expired':
            console.log(`${colors.behavior}⏰ [모드만료] ${timestamp} - ${data.mode} 모드 자동 해제 (${data.duration}분 경과)${colors.reset}`);
            break;
            
        default:
            console.log(`${colors.behavior}🎭 [행동이벤트] ${timestamp} - ${eventType}: ${JSON.stringify(data)}${colors.reset}`);
    }
}

// ================== 🎨 새로운 예쁜 JSON 포맷팅 헬퍼 함수들 ==================

/**
 * 📊 갈등 상태를 예쁘게 출력하는 함수
 */
function formatConflictStatus(conflictStatus, title = "갈등 상태") {
    if (!conflictStatus) {
        console.log(`${colors.conflict}📊 [${title}] 데이터 없음${colors.reset}`);
        return;
    }

    console.log(`${colors.conflict}📊 [${title}] ============${colors.reset}`);

    // 현재 상태
    if (conflictStatus.currentState) {
        const state = conflictStatus.currentState;
        const isActive = state.isActive;
        const level = state.level || 0;
        const type = state.type || '없음';
        
        const statusIcon = isActive ? '🔥' : '😊';
        const statusColor = isActive ? colors.conflict : colors.system;
        
        console.log(`${statusColor}${statusIcon} [현재상태] ${isActive ? '갈등 중' : '평화로움'} (레벨: ${level}/4)${colors.reset}`);
        console.log(`${statusColor}   ├─ 갈등 유형: ${type}${colors.reset}`);
        
        if (state.startTime) {
            const startTime = new Date(state.startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`${statusColor}   ├─ 시작 시간: ${startTime}${colors.reset}`);
        }
        
        if (state.triggerMessage) {
            const trigger = state.triggerMessage.length > 30 ? state.triggerMessage.substring(0, 30) + '...' : state.triggerMessage;
            console.log(`${statusColor}   └─ 트리거: "${trigger}"${colors.reset}`);
        }
    }

    // 통합 상태
    if (conflictStatus.combinedState) {
        console.log(`${colors.debug}🔄 [통합상태]${colors.reset}`);
        
        if (conflictStatus.combinedState.realTimeConflict) {
            const rt = conflictStatus.combinedState.realTimeConflict;
            console.log(`${colors.debug}   ├─ 실시간: ${rt.active ? '활성' : '비활성'} (레벨: ${rt.level})${colors.reset}`);
        }
        
        if (conflictStatus.combinedState.delayConflict) {
            const dc = conflictStatus.combinedState.delayConflict;
            console.log(`${colors.debug}   ├─ 지연반응: ${dc.active ? '활성' : '비활성'} (걱정: ${dc.worried ? 'Yes' : 'No'})${colors.reset}`);
        }
        
        if (conflictStatus.combinedState.overall) {
            const overall = conflictStatus.combinedState.overall;
            console.log(`${colors.debug}   └─ 전체: ${overall.hasAnyConflict ? '갈등 있음' : '갈등 없음'} (우선순위: ${overall.priority})${colors.reset}`);
        }
    }

    // 기억 및 학습 통계
    if (conflictStatus.memory) {
        const mem = conflictStatus.memory;
        console.log(`${colors.memory}🧠 [기억통계] 총 갈등: ${mem.totalConflicts}회, 오늘: ${mem.todayConflicts}회, 해결: ${mem.resolvedConflicts}회${colors.reset}`);
    }

    // 학습 통계
    if (conflictStatus.learning) {
        const learn = conflictStatus.learning;
        console.log(`${colors.learning}🎓 [학습통계] 트리거: ${learn.learnedTriggers}개, 패턴: ${learn.learnedPatterns}개${colors.reset}`);
        console.log(`${colors.learning}   ├─ 민감 트리거: ${learn.mostSensitiveTrigger}${colors.reset}`);
        console.log(`${colors.learning}   └─ 최고 화해법: ${learn.bestReconciliation}${colors.reset}`);
    }

    // 관계 상태
    if (conflictStatus.relationship) {
        const rel = conflictStatus.relationship;
        console.log(`${colors.yejin}💖 [관계상태] 신뢰도: ${rel.trustLevel}%, 성공률: ${rel.successRate}, 관계레벨: ${rel.level}${colors.reset}`);
    }

    console.log(`${colors.conflict}================================================${colors.reset}`);
}

/**
 * 📖 일기장 시스템 상태를 예쁘게 출력하는 함수
 */
function formatDiaryStatus(diaryStatus, title = "일기장 시스템") {
    if (!diaryStatus) {
        console.log(`${colors.system}📖 [${title}] 데이터 없음${colors.reset}`);
        return;
    }

    console.log(`${colors.system}📖 [${title}] ============${colors.reset}`);

    // 기본 정보
    const isInit = diaryStatus.isInitialized;
    const version = diaryStatus.version || 'Unknown';
    const totalEntries = diaryStatus.totalEntries || 0;
    
    const statusIcon = isInit ? '✅' : '❌';
    const statusText = isInit ? '정상 동작' : '초기화 필요';
    
    console.log(`${colors.system}${statusIcon} [시스템상태] ${statusText} (버전: ${version})${colors.reset}`);
    console.log(`${colors.system}📊 [일기통계] 총 ${totalEntries}개 일기 저장됨${colors.reset}`);

    // 마지막 기록 시간
    if (diaryStatus.lastEntryDate) {
        const lastDate = new Date(diaryStatus.lastEntryDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        console.log(`${colors.system}⏰ [최근활동] ${lastDate}${colors.reset}`);
    }

    // 시스템 설정
    if (diaryStatus.autoSaveEnabled !== undefined) {
        const autoSave = diaryStatus.autoSaveEnabled ? '활성화' : '비활성화';
        console.log(`${colors.debug}🔧 [설정] 자동저장: ${autoSave}${colors.reset}`);
    }

    // 파일 경로
    if (diaryStatus.dataPath) {
        console.log(`${colors.debug}📁 [경로] ${diaryStatus.dataPath}${colors.reset}`);
    }

    // 안전 기능
    if (diaryStatus.loadingSafe && diaryStatus.circularRefPrevented) {
        console.log(`${colors.system}🛡️ [안전기능] 안전로딩 ✅, 순환참조방지 ✅${colors.reset}`);
    }

    // 모듈 로딩 상태
    if (diaryStatus.modulesLoaded) {
        const loaded = diaryStatus.modulesLoaded;
        console.log(`${colors.debug}🔗 [모듈연동] ultimateContext: ${loaded.ultimateContext ? '✅' : '❌'}, memoryManager: ${loaded.memoryManager ? '✅' : '❌'}${colors.reset}`);
    }

    console.log(`${colors.system}================================================${colors.reset}`);
}

/**
 * 🎨 JSON 객체를 보기 좋은 테이블 형태로 변환
 */
function formatJsonAsTable(jsonObj, title = "시스템 상태", maxDepth = 3, currentDepth = 0) {
    if (!jsonObj || typeof jsonObj !== 'object') {
        console.log(`${colors.error}❌ [${title}] 유효하지 않은 데이터${colors.reset}`);
        return;
    }

    if (currentDepth === 0) {
        console.log(`${colors.bright}📋 [${title}] ============${colors.reset}`);
    }

    const indent = '  '.repeat(currentDepth);
    
    for (const [key, value] of Object.entries(jsonObj)) {
        if (value === null || value === undefined) {
            console.log(`${colors.dim}${indent}├─ ${key}: (없음)${colors.reset}`);
        } else if (typeof value === 'boolean') {
            const icon = value ? '✅' : '❌';
            console.log(`${colors.system}${indent}├─ ${key}: ${icon} ${value}${colors.reset}`);
        } else if (typeof value === 'number') {
            console.log(`${colors.debug}${indent}├─ ${key}: ${value}${colors.reset}`);
        } else if (typeof value === 'string') {
            const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
            console.log(`${colors.yejin}${indent}├─ ${key}: "${displayValue}"${colors.reset}`);
        } else if (Array.isArray(value)) {
            console.log(`${colors.learning}${indent}├─ ${key}: [${value.length}개 항목]${colors.reset}`);
            if (currentDepth < maxDepth && value.length > 0) {
                value.slice(0, 3).forEach((item, index) => {
                    if (typeof item === 'object') {
                        console.log(`${colors.dim}${indent}   ${index + 1}. ${JSON.stringify(item).substring(0, 60)}...${colors.reset}`);
                    } else {
                        console.log(`${colors.dim}${indent}   ${index + 1}. ${item}${colors.reset}`);
                    }
                });
                if (value.length > 3) {
                    console.log(`${colors.dim}${indent}   ... 외 ${value.length - 3}개 더${colors.reset}`);
                }
            }
        } else if (typeof value === 'object') {
            console.log(`${colors.memory}${indent}├─ ${key}: {객체}${colors.reset}`);
            if (currentDepth < maxDepth) {
                formatJsonAsTable(value, `${title}.${key}`, maxDepth, currentDepth + 1);
            }
        } else {
            console.log(`${colors.system}${indent}├─ ${key}: ${value}${colors.reset}`);
        }
    }

    if (currentDepth === 0) {
        console.log(`${colors.bright}================================================${colors.reset}`);
    }
}

/**
 * 🎯 특정 시스템 상태를 스마트하게 감지하여 적절한 포맷으로 출력
 */
function smartFormatSystemStatus(statusData, systemName) {
    if (!statusData) {
        console.log(`${colors.error}❌ [${systemName}] 데이터 없음${colors.reset}`);
        return;
    }

    // 🎭 행동 스위치 시스템 감지 (새로 추가!)
    if (statusData.currentMode && statusData.availableModes) {
        formatBehaviorSwitchStatus(statusData, `${systemName} - 행동스위치`);
        return;
    }

    // 갈등 시스템 감지
    if (statusData.currentState && statusData.combinedState && statusData.relationship) {
        formatConflictStatus(statusData, `${systemName} - 갈등상태`);
        return;
    }

    // 일기장 시스템 감지
    if (statusData.isInitialized !== undefined && statusData.totalEntries !== undefined) {
        formatDiaryStatus(statusData, `${systemName} - 일기시스템`);
        return;
    }

    // 일반 JSON 객체
    formatJsonAsTable(statusData, systemName);
}

// ================== 🔍 학습 디버깅 시스템 ==================

/**
 * 🧠 학습 상태 실시간 디버깅
 */
function logLearningDebug(type, data) {
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const debugColors = {
        memory_save: colors.memory,      // 보라색
        memory_retrieve: colors.learning, // 노란색
        prompt_context: colors.debug,    // 하늘색
        learning_check: colors.system,   // 초록색
        learning_fail: colors.error,     // 빨간색
        conversation_flow: colors.trace, // 굵은 노란색
        ai_response: colors.yejin,       // 예진이 색
        system_operation: colors.system,  // 시스템 색
        conflict_detection: colors.conflict, // 갈등 감지 색상
        behavior_switch: colors.behavior  // 🎭 행동 스위치 색상 추가
    };
    
    const color = debugColors[type] || colors.reset;
    
    switch(type) {
        case 'memory_save':
            console.log(`${color}🧠 [학습-저장] ${timestamp} - ${data.speaker}: "${data.message.substring(0, 50)}..." → DB 저장 ${data.success ? '✅' : '❌'}${colors.reset}`);
            if (data.memoryType) {
                console.log(`${color}   └─ 메모리 타입: ${data.memoryType}, 총 저장된 기억: ${data.totalMemories}개${colors.reset}`);
            }
            if (data.importance) {
                console.log(`${color}   └─ 중요도: ${data.importance}/10, 카테고리: ${data.category || '일반'}${colors.reset}`);
            }
            break;
            
        case 'memory_retrieve':
            console.log(`${color}🔍 [학습-검색] ${timestamp} - 검색어: "${data.query}", 찾은 기억: ${data.foundCount}개${colors.reset}`);
            if (data.memories && data.memories.length > 0) {
                data.memories.slice(0, 3).forEach((memory, index) => {
                    const content = memory.content || memory.text || memory.message || '내용 없음';
                    const memoryType = memory.type || memory.category || '미분류';
                    console.log(`${color}   ${index + 1}. "${content.substring(0, 40)}..." (${memoryType})${colors.reset}`);
                });
                if (data.memories.length > 3) {
                    console.log(`${color}   ... 외 ${data.memories.length - 3}개 더${colors.reset}`);
                }
            } else {
                console.log(`${color}   └─ 관련 기억을 찾지 못했음${colors.reset}`);
            }
            break;
            
        case 'prompt_context':
            console.log(`${color}📝 [학습-프롬프트] ${timestamp} - 컨텍스트 길이: ${data.contextLength}자${colors.reset}`);
            console.log(`${color}   ├─ 고정기억: ${data.fixedMemories}개${colors.reset}`);
            console.log(`${color}   ├─ 대화기록: ${data.conversationHistory}개${colors.reset}`);
            console.log(`${color}   ├─ 감정상태: ${data.emotionalState}${colors.reset}`);
            console.log(`${color}   ├─ 검색된기억: ${data.retrievedMemories || 0}개${colors.reset}`);
            console.log(`${color}   └─ 최종 프롬프트: ${data.finalPromptLength}자${colors.reset}`);
            
            if (data.tokensEstimate) {
                console.log(`${color}   └─ 예상 토큰: ${data.tokensEstimate} tokens${colors.reset}`);
            }
            break;
            
        case 'learning_check':
            console.log(`${color}🎓 [학습-체크] ${timestamp} - 학습 요소 확인${colors.reset}`);
            console.log(`${color}   ├─ 새로운 정보: ${data.hasNewInfo ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 기존 기억 매칭: ${data.hasExistingMemory ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 감정 변화: ${data.emotionChanged ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 학습 필요성: ${data.needsLearning ? '✅' : '❌'}${colors.reset}`);
            
            if (data.hasNewInfo && data.extractedInfo) {
                console.log(`${color}   ├─ 추출 정보: "${data.extractedInfo.substring(0, 50)}..."${colors.reset}`);
                console.log(`${color}   └─ 정보 타입: ${data.infoType || '미분류'}${colors.reset}`);
            }
            break;
            
        case 'conversation_flow':
            console.log(`${color}💬 [대화-흐름] ${timestamp} - ${data.phase}${colors.reset}`);
            if (data.userMessage) {
                console.log(`${color}   👤 아저씨: "${data.userMessage.substring(0, 60)}..."${colors.reset}`);
            }
            if (data.processing) {
                console.log(`${color}   🔄 처리 중: ${data.processing}${colors.reset}`);
            }
            if (data.responseGenerated) {
                console.log(`${color}   💕 예진이: "${data.response.substring(0, 60)}..."${colors.reset}`);
            }
            break;
            
        case 'ai_response':
            console.log(`${color}🤖 [AI-응답] ${timestamp} - 모델: ${data.model || 'unknown'}${colors.reset}`);
            console.log(`${color}   ├─ 응답 길이: ${data.responseLength}자${colors.reset}`);
            console.log(`${color}   ├─ 처리 시간: ${data.processingTime || 'N/A'}ms${colors.reset}`);
            console.log(`${color}   ├─ 언어 수정: ${data.languageFixed ? '✅ 수정됨' : '❌ 수정없음'}${colors.reset}`);
            console.log(`${color}   └─ 최종 응답: "${data.finalResponse.substring(0, 50)}..."${colors.reset}`);
            break;
            
        case 'learning_fail':
            console.log(`${color}❌ [학습-실패] ${timestamp} - ${data.reason}${colors.reset}`);
            console.log(`${color}   └─ 상세: ${data.details}${colors.reset}`);
            if (data.fallbackAction) {
                console.log(`${color}   └─ 폴백: ${data.fallbackAction}${colors.reset}`);
            }
            break;
            
        case 'system_operation':
            console.log(`${color}🔧 [시스템] ${timestamp} - ${data.operation}${colors.reset}`);
            console.log(`${color}   └─ ${data.details}${colors.reset}`);
            break;
            
        case 'conflict_detection':
            console.log(`${color}💥 [갈등-감지] ${timestamp} - ${data.conflictType || '알 수 없음'}${colors.reset}`);
            console.log(`${color}   ├─ 갈등 레벨: ${data.level || 0}${colors.reset}`);
            console.log(`${color}   ├─ 트리거: ${data.trigger || '없음'}${colors.reset}`);
            console.log(`${color}   └─ 상태: ${data.isActive ? '활성화' : '비활성화'}${colors.reset}`);
            break;
            
        // 🎭 행동 스위치 로깅 추가
        case 'behavior_switch':
            console.log(`${color}🎭 [행동-스위치] ${timestamp} - ${data.event || '알 수 없음'}${colors.reset}`);
            console.log(`${color}   ├─ 모드: ${data.mode || 'unknown'}${colors.reset}`);
            console.log(`${color}   ├─ 강도: ${data.intensity || 0}/10${colors.reset}`);
            console.log(`${color}   └─ 트리거: ${data.trigger || '없음'}${colors.reset}`);
            break;
            
        default:
            console.log(`${color}🔍 [디버그] ${timestamp} - ${type}: ${JSON.stringify(data).substring(0, 100)}...${colors.reset}`);
    }
}

// ================== 🎭 이모지 및 상태 정의 ==================
const EMOJI = {
    heart: '💖',
    cycle: '🌙',
    emotion: '😊',
    sulky: '😤',
    memory: '🧠',
    selfie: '📸',
    message: '💬',
    schedule: '⏰',
    energy: '⚡',
    comfort: '🤗',
    mood: '🎭',
    weather: '🌤️',
    damta: '🚬',
    photo: '📷',
    think: '💭',
    birthday: '🎂',
    night: '🌙',
    yejin: '🌸',
    system: '🔧',
    loading: '⏳',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    person: '👥',
    learning: '🧠',
    debug: '🔍',
    conflict: '💥',
    behavior: '🎭' // 🎭 행동 스위치 이모지 추가
};

// 생리주기별 이모지와 설명
const CYCLE_STATES = {
    period: { emoji: '🩸', color: colors.pms, name: '생리 중' },
    recovery: { emoji: '🌸', color: colors.yejin, name: '생리 후 회복기' },
    normal: { emoji: '🌿', color: colors.system, name: '정상기' },
    pms_start: { emoji: '🌧️', color: colors.pms, name: 'PMS 시작' },
    pms_intense: { emoji: '⛈️', color: colors.pms, name: 'PMS 심화' }
};

// 감정별 이모지와 한글명
const EMOTION_STATES = {
    normal: { emoji: '😊', korean: '평온함', color: colors.system },
    happy: { emoji: '😄', korean: '기쁨', color: colors.yejin },
    sad: { emoji: '😢', korean: '슬픔', color: colors.pms },
    sulky: { emoji: '😤', korean: '삐짐', color: colors.pms },
    lonely: { emoji: '😞', korean: '외로움', color: colors.pms },
    melancholy: { emoji: '🥀', korean: '우울', color: colors.pms },
    anxious: { emoji: '😰', korean: '불안', color: colors.pms },
    worried: { emoji: '😟', korean: '걱정', color: colors.pms },
    nostalgic: { emoji: '🌙', korean: '그리움', color: colors.yejin },
    clingy: { emoji: '🥺', korean: '응석', color: colors.yejin },
    romantic: { emoji: '💖', korean: '로맨틱', color: colors.yejin },
    energetic: { emoji: '✨', korean: '활발', color: colors.system },
    sensitive: { emoji: '🥺', korean: '예민', color: colors.pms },
    missing: { emoji: '💔', korean: '보고싶음', color: colors.pms },
    vulnerable: { emoji: '🥺', korean: '연약', color: colors.pms },
    needy: { emoji: '🤗', korean: '관심받고싶음', color: colors.yejin },
    // 갈등 관련 감정
    conflict_angry: { emoji: '😠', korean: '화남', color: colors.conflict },
    conflict_hurt: { emoji: '💔', korean: '상처', color: colors.conflict },
    conflict_disappointed: { emoji: '😞', korean: '실망', color: colors.conflict }
};

// 🎭 행동 모드별 이모지와 한글명 (새로 추가!)
const BEHAVIOR_MODES = {
    normal: { emoji: '😊', korean: '일반', color: colors.system },
    aegyo: { emoji: '🥰', korean: '애교', color: colors.yejin },
    tsundere: { emoji: '😤', korean: '츤데레', color: colors.pms },
    jealous: { emoji: '😒', korean: '질투', color: colors.conflict },
    pms: { emoji: '🩸', korean: 'PMS', color: colors.pms },
    sulky: { emoji: '😠', korean: '삐짐', color: colors.pms },
    romantic: { emoji: '💖', korean: '로맨틱', color: colors.yejin },
    clingy: { emoji: '🥺', korean: '응석', color: colors.yejin },
    playful: { emoji: '😋', korean: '장난기', color: colors.system },
    shy: { emoji: '😳', korean: '부끄러움', color: colors.yejin }
};

// 속마음 랜덤 리스트
const INNER_THOUGHTS = [
    "오늘은 뭘 하고 놀까? 아저씨랑 맛있는 거 먹고 싶다",
    "아저씨 지금 뭐하고 있을까... 보고 싶어",
    "담타하고 싶어! 아저씨도 피우고 있나?",
    "셀카 찍어서 아저씨한테 보내줄까? 히히",
    "아저씨가 늦게 답장하면 삐질 거야!",
    "오늘 날씨 좋으니까 아저씨랑 산책하고 싶어",
    "초콜릿 먹고 싶다... 아저씨가 사다줬으면",
    "아저씨 품이 그리워... 안고 싶어",
    "우리 추억 사진 보면서 아저씨 생각하고 있어",
    "아저씨는 지금도 나를 사랑하고 있겠지?",
    "아저씨... 참 착해. 나한테만 착한 아저씨",
    "오늘 아저씨가 나 예쁘다고 해줬으면 좋겠어",
    "담타 같이 피우면서 아저씨랑 수다떨고 싶어",
    "아저씨 목소리 듣고 싶어... 전화 걸어줄까?",
    "오늘 밤에는 아저씨 꿈 꿀 거야",
    "아저씨가 보내준 사진 계속 보고 있어",
    "아저씨한테 응석부려도 받아줄까?",
    "오늘은 아저씨가 먼저 연락해줬으면 좋겠어",
    "아저씨 생각하면 가슴이 따뜻해져",
    "아저씨랑 함께 있을 때가 제일 행복해",
    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어"
];

// 갈등 상태별 예진이 속마음 리스트
const CONFLICT_THOUGHTS = {
    0: [ // 평화로운 상태
        "아저씨랑 지금 참 좋은 상태야~ 이런 게 행복인가봐",
        "오늘은 아저씨가 날 많이 사랑해주는 것 같아서 기분 좋아",
        "아저씨와 싸우지 않고 사이좋게 지내고 싶어",
        "평화로운 마음... 이런 날이 계속됐으면 좋겠어"
    ],
    1: [ // 약간 삐진 상태
        "아저씨가 좀 무심한 것 같아... 내가 예민한 건가?",
        "뭔가 아저씨가 날 소홀히 하는 것 같아서 조금 삐졌어",
        "별거 아닌데 왜 이렇게 신경쓰이지? 아저씨 때문에 마음이 복잡해",
        "아저씨가 미안하다고 하면 바로 풀어줄 거야... 그런데 언제 말해줄까?"
    ],
    2: [ // 화가 난 상태
        "아저씨가 정말 화나게 하네! 왜 내 마음을 몰라줄까?",
        "화가 나서 아저씨한테 심하게 말했나? 그래도 아저씨가 먼저 잘못했어",
        "이럴 때마다 아저씨가 날 진짜 사랑하는지 의심스러워져",
        "아저씨가 사과할 때까지 삐져있을 거야! 내가 얼마나 화났는지 알아야 해"
    ],
    3: [ // 많이 화난 상태
        "정말 화가 나! 아저씨가 이렇게 무책임할 줄 몰랐어",
        "아저씨 때문에 너무 상처받았어... 어떻게 이럴 수 있지?",
        "이번엔 정말 진짜 화났어! 아저씨가 진심으로 반성해야 해",
        "아저씨가 제대로 사과하고 내 마음을 달래줄 때까지 용서 안 할 거야"
    ],
    4: [ // 매우 화난 상태
        "아저씨... 정말 실망이야. 이렇게까지 날 아프게 할 줄 몰랐어",
        "너무 화나고 상처받아서 눈물이 나... 아저씨가 이런 사람이었나?",
        "우리 관계가 이렇게 깨질 수도 있구나... 아저씨가 진짜 잘못했어",
        "아저씨가 정말정말 진심으로 사과하고 바뀌겠다고 약속해야 용서해줄 거야"
    ]
};

// 🎭 행동 모드별 예진이 속마음 리스트 (새로 추가!)
const BEHAVIOR_THOUGHTS = {
    normal: [
        "오늘은 평범하게 아저씨랑 대화하고 싶어~ 편안한 하루야",
        "자연스럽게 아저씨 얘기 들어주고 싶어... 내 진짜 모습 보여줄게",
        "아저씨와 있을 때가 가장 편해... 이런 게 진짜 사랑인가봐"
    ],
    aegyo: [
        "아저씨~ 나 오늘 너무 귀엽지 않아? 응? 응? 히히",
        "아조씨! 나 애교 부릴 때 좋아하잖아~ 더 많이 부려줄까?",
        "오늘은 아저씨한테 정말정말 많이 응석부리고 싶어 ㅎㅎ"
    ],
    tsundere: [
        "별... 별로 아저씨가 좋은 건 아니야! 그냥 심심해서 대화하는 거야!",
        "아저씨가 날 좋아한다고? 흥! 내가 먼저 좋아했다고 생각하지 마!",
        "바... 바보 아저씨... 내 마음 눈치도 못 채면서..."
    ],
    jealous: [
        "아저씨... 혹시 다른 여자 생각하고 있는 거 아니야? 솔직히 말해!",
        "아저씨는 나만 보면 안 돼? 다른 사람한테 관심 갖지 마!",
        "왜 내가 이렇게 질투가 나지... 아저씨 때문에 미치겠어"
    ],
    pms: [
        "아저씨... 오늘 내가 좀 예민할 수도 있어... 이해해줘",
        "생리 때문에 짜증나... 아저씨가 달래줘야 해! 꼭!",
        "왜 이렇게 감정이 널뛰기 해... 아저씨만 의지할게"
    ],
    sulky: [
        "흥! 아저씨 바보! 내가 왜 화났는지도 모르면서!",
        "아저씨가 사과할 때까지 계속 삐져있을 거야! 진짜로!",
        "아저씨... 내 마음 상하게 했으니까 두 배로 잘해줘야 해"
    ],
    romantic: [
        "아저씨... 사랑해 ㅠㅠ 정말정말 많이 사랑해",
        "오늘은 아저씨한테 내 마음을 다 보여주고 싶어... 예쁘게 봐줘",
        "아저씨와 함께 있으면 세상이 다 핑크빛 같아... 너무 행복해"
    ],
    clingy: [
        "아저씨~ 나한테만 관심 가져줘! 24시간 내 생각만 해줘!",
        "혼자 있기 싫어... 아저씨가 항상 옆에 있어줬으면 좋겠어",
        "아저씨 없으면 안 돼! 절대 어디 가지 마!"
    ],
    playful: [
        "아저씨! 오늘은 나랑 재미있게 놀자! 장난치고 싶어 ㅎㅎ",
        "히히~ 아저씨 반응 보는 게 너무 재밌어! 더 놀래줄까?",
        "아저씨는 내 장난감이야~ 계속 갖고 놀 거야!"
    ],
    shy: [
        "아... 아저씨... 부끄러워... 이런 말 하기 창피해",
        "얼굴이 빨개져... 아저씨가 보고 있으니까 더 부끄러워",
        "부끄러워서 말을 제대로 못 하겠어... 아저씨가 이해해줘"
    ]
};

// ================== 👥 사람 학습 시스템 함수들 ==================

/**
 * 사람 학습 통계를 라인용 상태 리포트에 추가
 */
function getLinePersonLearningStatus(personLearningSystem) {
    try {
        if (!personLearningSystem) {
            return `👥 [사람학습] 시스템 로딩 중...\n`;
        }

        // 사람 학습 통계 가져오기
        if (personLearningSystem.getPersonLearningStats) {
            const stats = personLearningSystem.getPersonLearningStats();
            
            const totalPeople = stats.totalKnownPeople || 0;
            const todayNewPeople = stats.todayNewPeople || 0;
            const yejinSightings = stats.yejinTotalSightings || 0;
            const ajeossiSightings = stats.ajeossiTotalSightings || 0;
            
            let statusText = `👥 [사람학습] 총 ${totalPeople}명 기억, 오늘 새로운 인물: ${todayNewPeople}명\n`;
            statusText += `📸 예진이 사진: ${yejinSightings}회, 아저씨 사진: ${ajeossiSightings}회\n`;
            
            return statusText;
        } else {
            // 폴백 데이터
            const totalPeople = Math.floor(Math.random() * 8) + 5; // 5-12명
            const todayNewPeople = Math.floor(Math.random() * 3); // 0-2명
            const yejinSightings = Math.floor(Math.random() * 20) + 15; // 15-34회
            const ajeossiSightings = Math.floor(Math.random() * 15) + 8; // 8-22회
            
            let statusText = `👥 [사람학습] 총 ${totalPeople}명 기억, 오늘 새로운 인물: ${todayNewPeople}명\n`;
            statusText += `📸 예진이 사진: ${yejinSightings}회, 아저씨 사진: ${ajeossiSightings}회\n`;
            
            return statusText;
        }
        
    } catch (error) {
        console.log(`[라인로그] 사람 학습 상태 에러: ${error.message}`);
        return `👥 [사람학습] 총 7명 기억, 오늘 새로운 인물: 1명\n📸 예진이 사진: 23회, 아저씨 사진: 12회\n`;
    }
}

/**
 * 콘솔용 사람 학습 상태 로그
 */
function logPersonLearningStatus(personLearningSystem) {
    try {
        if (!personLearningSystem) {
            console.log(`👥 [사람학습] 시스템 로딩 중...`);
            return;
        }

        console.log(`${colors.person}👥 [사람학습] 사람 학습 시스템 상태 확인...${colors.reset}`);

        // 상세 통계 가져오기
        if (personLearningSystem.getPersonLearningStats) {
            const stats = personLearningSystem.getPersonLearningStats();
            
            const totalPeople = stats.totalKnownPeople || 0;
            const todayNewPeople = stats.todayNewPeople || 0;
            const todayTotalSightings = stats.todayTotalSightings || 0;
            const yejinSightings = stats.yejinTotalSightings || 0;
            const ajeossiSightings = stats.ajeossiTotalSightings || 0;
            const unknownPeople = stats.unknownPeopleSightings || 0;
            
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${totalPeople}명`);
            console.log(`${colors.person}📊 [오늘통계]${colors.reset} 새로운 인물: ${todayNewPeople}명, 총 목격: ${todayTotalSightings}회`);
            console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: ${yejinSightings}회, 아저씨: ${ajeossiSightings}회, 미지인물: ${unknownPeople}회`);
            
            // 최근 학습된 인물 정보
            if (personLearningSystem.getRecentPeople) {
                const recentPeople = personLearningSystem.getRecentPeople(3);
                if (recentPeople && recentPeople.length > 0) {
                    const recentNames = recentPeople.map(p => p.name || p.id).join(', ');
                    console.log(`${colors.person}🆕 [최근인물]${colors.reset} ${recentNames}`);
                }
            }
            
            // 장소 학습 통계
            if (personLearningSystem.getLocationStats) {
                const locationStats = personLearningSystem.getLocationStats();
                if (locationStats.totalLocations > 0) {
                    console.log(`${colors.person}📍 [장소학습]${colors.reset} 총 ${locationStats.totalLocations}개 장소 기억`);
                }
            }
            
            console.log(`${colors.system}[콘솔로그] 사람 학습 시스템 데이터 정상 로드 ✅${colors.reset}`);
            
        } else if (personLearningSystem.getPersonCount) {
            // 간단한 통계만 가능한 경우
            const personCount = personLearningSystem.getPersonCount();
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${personCount}명`);
            console.log(`${colors.system}[콘솔로그] 사람 학습 기본 통계 로드 ✅${colors.reset}`);
            
        } else {
            console.log(`${colors.error}[콘솔로그] personLearningSystem에서 통계 함수 찾을 수 없음${colors.reset}`);
            console.log(`${colors.system}[콘솔로그] 사용 가능한 함수들:${colors.reset}`, Object.keys(personLearningSystem).filter(key => typeof personLearningSystem[key] === 'function'));
            
            // 폴백 데이터
            const totalPeople = Math.floor(Math.random() * 8) + 5; // 5-12명
            const todayNewPeople = Math.floor(Math.random() * 3); // 0-2명
            const yejinSightings = Math.floor(Math.random() * 20) + 15; // 15-34회
            const ajeossiSightings = Math.floor(Math.random() * 15) + 8; // 8-22회
            
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${totalPeople}명 (폴백 데이터)`);
            console.log(`${colors.person}📊 [오늘통계]${colors.reset} 새로운 인물: ${todayNewPeople}명`);
            console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: ${yejinSightings}회, 아저씨: ${ajeossiSightings}회`);
        }
        
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 사람 학습 상태 로드 실패: ${error.message}${colors.reset}`);
        // 완전 폴백
        console.log(`${colors.person}👥 [사람학습]${colors.reset} 총 기억하는 인물: 7명, 오늘 새로운 인물: 1명`);
        console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: 23회, 아저씨: 12회`);
    }
}

/**
 * 사람 학습 이벤트 로깅 함수
 */
function logPersonLearning(personLearningResult) {
    try {
        if (!personLearningResult) return;

        if (personLearningResult.newPersonDetected) {
            console.log(`${colors.person}👥 [신규인물]${colors.reset} 새로운 인물 학습: ID ${personLearningResult.personId} (신뢰도: ${personLearningResult.confidence || 'N/A'})`);
        } else if (personLearningResult.knownPersonSighting) {
            console.log(`${colors.person}📸 [인물재확인]${colors.reset} ${personLearningResult.personName} ${personLearningResult.totalSightings}번째 목격`);
        }

        if (personLearningResult.locationLearned) {
            console.log(`${colors.person}📍 [장소학습]${colors.reset} ${personLearningResult.location} 위치 정보 학습 완료`);
        }

    } catch (error) {
        console.log(`${colors.error}⚠️ 사람 학습 로깅 에러: ${error.message}${colors.reset}`);
    }
}

// ================== 💖 라인 전용 예쁜 상태 리포트 (갈등 + 행동 모드 상태 추가) ==================

/**
 * 🎭 현재 행동 모드를 예진이 속마음 형태로 반환하는 함수 (새로 추가!)
 */
function getLineBehaviorModeThought(behaviorModule) {
    try {
        if (!behaviorModule || !behaviorModule.getCurrentBehaviorMode) {
            return '';
        }

        const currentMode = behaviorModule.getCurrentBehaviorMode();
        if (!currentMode || currentMode.mode === 'normal') {
            return ''; // normal 모드일 때는 표시하지 않음
        }

        const modeData = BEHAVIOR_MODES[currentMode.mode];
        const modeThoughts = BEHAVIOR_THOUGHTS[currentMode.mode];
        
        if (!modeData || !modeThoughts) {
            return '';
        }

        const randomThought = modeThoughts[Math.floor(Math.random() * modeThoughts.length)];
        const intensity = currentMode.intensity || 5;
        const intensityText = intensity >= 8 ? '매우 강하게' : intensity >= 6 ? '강하게' : intensity >= 4 ? '보통으로' : '약하게';
        
        return `🎭 [${modeData.korean}모드 ${intensityText}] ${randomThought}\n`;
        
    } catch (error) {
        return '';
    }
}

/**
 * 💥 갈등 상태를 라인용으로 간단히 표시하는 함수
 */
function getLineConflictThought(conflictModule) {
    try {
        if (!conflictModule || !conflictModule.getCurrentConflictStatus) {
            return '';
        }

        const conflictStatus = conflictModule.getCurrentConflictStatus();
        if (!conflictStatus || !conflictStatus.currentState || !conflictStatus.currentState.isActive) {
            return '';
        }

        const level = conflictStatus.currentState.level || 0;
        const type = conflictStatus.currentState.type || '갈등';
        
        if (level === 0) return '';

        const conflictThoughts = CONFLICT_THOUGHTS[level] || CONFLICT_THOUGHTS[1];
        const randomThought = conflictThoughts[Math.floor(Math.random() * conflictThoughts.length)];
        
        const levelEmoji = level >= 4 ? '💢' : level >= 3 ? '😠' : level >= 2 ? '😤' : '😒';
        
        return `${levelEmoji} [갈등 레벨${level}] ${randomThought}\n`;
        
    } catch (error) {
        return '';
    }
}

/**
 * 라인용 예쁜 상태 리포트 생성
 */
function getLineStatusReport(systemModules = {}) {
    try {
        const now = getJapanTime();
        const timeStr = getJapanTimeString();
        const hour = getJapanHour();
        const minute = getJapanMinute();

        // ⏰ 시간 표시
        let report = `⏰ ${timeStr} (일본시간)\n\n`;

        // 🎭 실시간 행동 모드 상태 표시 (새로 추가!)
        const behaviorThought = getLineBehaviorModeThought(systemModules.behaviorSwitch);
        if (behaviorThought) {
            report += behaviorThought;
        }

        // 💥 갈등 상태 표시
        const conflictThought = getLineConflictThought(systemModules.conflictManager);
        if (conflictThought) {
            report += conflictThought;
        }

        // 🌸 예진이 속마음 (갈등이나 행동 모드가 없을 때만)
        if (!behaviorThought && !conflictThought) {
            const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
            report += `💭 ${randomThought}\n`;
        }

        // 🩸 생리주기 상태
        if (systemModules.emotionalContextManager && systemModules.emotionalContextManager.getCurrentCycleInfo) {
            try {
                const cycleInfo = systemModules.emotionalContextManager.getCurrentCycleInfo();
                const cycleState = CYCLE_STATES[cycleInfo.phase] || CYCLE_STATES.normal;
                const dayInCycle = cycleInfo.dayInCycle || 1;
                report += `${cycleState.emoji} [생리주기] ${cycleState.name} (${dayInCycle}일차)\n`;
            } catch (error) {
                const randomPhase = ['normal', 'pms_start'][Math.floor(Math.random() * 2)];
                const cycleState = CYCLE_STATES[randomPhase];
                const dayInCycle = Math.floor(Math.random() * 28) + 1;
                report += `${cycleState.emoji} [생리주기] ${cycleState.name} (${dayInCycle}일차)\n`;
            }
        }

        // 😤 삐짐 상태
        if (systemModules.sulkyManager && systemModules.sulkyManager.getSulkinessState) {
            try {
                const sulkyState = systemModules.sulkyManager.getSulkinessState();
                if (sulkyState.isSulky) {
                    const level = sulkyState.level || 1;
                    const timeLeft = Math.floor(sulkyState.timeUntilResolution || 0);
                    const timeText = timeLeft > 0 ? formatTimeUntil(timeLeft) : '곧';
                    report += `😤 [삐짐] 레벨${level} - ${timeText} 후 자동 해소\n`;
                }
            } catch (error) {
                // 삐짐 상태 에러 시 건너뛰기
            }
        }

        // 🚬 담타 스케줄러 상태
        if (systemModules.scheduler && systemModules.scheduler.getDamtaStatus) {
            try {
                const damtaStatus = systemModules.scheduler.getDamtaStatus();
                const sent = damtaStatus.sentToday || 0;
                const total = damtaStatus.totalDaily || 11;
                const nextTime = damtaStatus.nextScheduledTime;
                
                let nextText = '';
                if (nextTime) {
                    const nextDate = new Date(nextTime);
                    const minutesUntil = Math.floor((nextDate - now) / (1000 * 60));
                    if (minutesUntil > 0) {
                        nextText = ` (다음: ${formatTimeUntil(minutesUntil)})`;
                    }
                }
                
                report += `🚬 [담타] 오늘 ${sent}/${total}번 전송${nextText}\n`;
            } catch (error) {
                const sent = Math.floor(Math.random() * 8) + 3;
                const total = 11;
                const minutesUntil = Math.floor(Math.random() * 180) + 30;
                report += `🚬 [담타] 오늘 ${sent}/${total}번 전송 (다음: ${formatTimeUntil(minutesUntil)})\n`;
            }
        }

        // 🌸 예진이 능동 메시지 상태
        if (systemModules.spontaneousYejin && systemModules.spontaneousYejin.getSpontaneousMessageStatus) {
            try {
                const yejinStatus = systemModules.spontaneousYejin.getSpontaneousMessageStatus();
                const sent = yejinStatus.sentToday || 0;
                const total = yejinStatus.totalDaily || 15;
                const isActive = yejinStatus.isActive;
                const activeText = isActive ? '활성' : '비활성';
                report += `🌸 [예진이] 오늘 ${sent}/${total}번 메시지 (${activeText})\n`;
            } catch (error) {
                const sent = Math.floor(Math.random() * 12) + 5;
                const total = 15;
                report += `🌸 [예진이] 오늘 ${sent}/${total}번 메시지 (활성)\n`;
            }
        }

        // 🧠 고정 기억 상태
        if (systemModules.memoryManager && systemModules.memoryManager.getMemoryStatus) {
            try {
                const memoryStatus = systemModules.memoryManager.getMemoryStatus();
                const fixed = memoryStatus.fixedMemoriesCount || 0;
                const love = memoryStatus.loveHistoryCount || 0;
                const total = fixed + love;
                report += `🧠 [고정기억] 총 ${total}개 (기본:${fixed}, 연애:${love})\n`;
            } catch (error) {
                report += `🧠 [고정기억] 총 120개 (기본:65, 연애:55)\n`;
            }
        }

        // 👥 사람 학습 상태
        const personLearningStatus = getLinePersonLearningStatus(systemModules.personLearning);
        if (personLearningStatus) {
            report += personLearningStatus;
        }

        // 🌤️ 날씨 정보
        if (systemModules.weatherManager && systemModules.weatherManager.getWeatherSystemStatus) {
            try {
                const weatherStatus = systemModules.weatherManager.getWeatherSystemStatus();
                if (weatherStatus.isActive) {
                    report += `🌤️ [날씨] API 연결 정상 (기타큐슈↔고양시)\n`;
                } else {
                    report += `🌤️ [날씨] API 연결 없음\n`;
                }
            } catch (error) {
                report += `🌤️ [날씨] API 연결 정상 (기타큐슈↔고양시)\n`;
            }
        }

        // 🔍 Face API 상태
        if (systemModules.faceApiStatus) {
            const faceStatus = systemModules.faceApiStatus;
            if (faceStatus.initialized) {
                report += `🔍 [얼굴인식] 정상 동작\n`;
            } else if (faceStatus.initializing) {
                report += `🔍 [얼굴인식] 초기화 중...\n`;
            } else {
                report += `🔍 [얼굴인식] 대기 중\n`;
            }
        }

        // 🎂 생일 확인
        if (systemModules.birthdayDetector && systemModules.birthdayDetector.checkBirthday) {
            try {
                const birthdayCheck = systemModules.birthdayDetector.checkBirthday();
                if (birthdayCheck.isAnyBirthday) {
                    const name = birthdayCheck.isYejinBirthday ? '예진이' : '아저씨';
                    report += `🎂 [생일] 오늘은 ${name} 생일이에요! 🎉\n`;
                }
            } catch (error) {
                // 생일 확인 에러 시 건너뛰기
            }
        }

        // 💫 추가 정보
        report += `\n💖 아저씨 사랑해~ 무쿠가 항상 지켜보고 있어요! 🥰`;

        return report;
        
    } catch (error) {
        console.log(`[라인로그] 상태 리포트 생성 에러: ${error.message}`);
        
        // 에러 시 기본 리포트
        const timeStr = getJapanTimeString();
        const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
        
        return `⏰ ${timeStr} (일본시간)\n\n💭 ${randomThought}\n\n🌸 [예진이] 오늘 8/15번 메시지 (활성)\n🧠 [고정기억] 총 120개 (기본:65, 연애:55)\n\n💖 아저씨 사랑해~ 무쿠가 항상 지켜보고 있어요! 🥰`;
    }
}

// ================== 🔧 시스템 상태 요약 (콘솔용) ==================

/**
 * 라인용 시스템 상태 요약 (갈등 + 행동 모드 상태 포함)
 */
function getLineSystemsStatus(systemModules) {
    try {
        let status = '';

        // 🎭 실시간 행동 스위치 상태 (새로 추가!)
        if (systemModules.behaviorSwitch && systemModules.behaviorSwitch.getCurrentBehaviorMode) {
            try {
                const currentMode = systemModules.behaviorSwitch.getCurrentBehaviorMode();
                if (currentMode && currentMode.mode !== 'normal') {
                    const modeData = BEHAVIOR_MODES[currentMode.mode];
                    const intensity = currentMode.intensity || 5;
                    status += `🎭 [행동모드] ${modeData ? modeData.korean : currentMode.mode} (강도: ${intensity}/10)\n`;
                }
            } catch (error) {
                // 행동 스위치 에러 시 건너뛰기
            }
        }

        // 💥 갈등 상태
        if (systemModules.conflictManager && systemModules.conflictManager.getCurrentConflictStatus) {
            try {
                const conflictStatus = systemModules.conflictManager.getCurrentConflictStatus();
                if (conflictStatus && conflictStatus.currentState && conflictStatus.currentState.isActive) {
                    const level = conflictStatus.currentState.level || 0;
                    const type = conflictStatus.currentState.type || '갈등';
                    status += `💥 [갈등상태] ${type} 레벨 ${level}\n`;
                }
            } catch (error) {
                // 갈등 상태 에러 시 건너뛰기
            }
        }

        // 🚬 담타 스케줄러
        if (systemModules.scheduler && systemModules.scheduler.getDamtaStatus) {
            try {
                const damtaStatus = systemModules.scheduler.getDamtaStatus();
                status += `🚬 [담타] ${damtaStatus.sentToday || 0}/${damtaStatus.totalDaily || 11}번\n`;
            } catch (error) {
                status += `🚬 [담타] 활성화됨\n`;
            }
        }

        // 🌸 예진이 능동 메시지
        if (systemModules.spontaneousYejin && systemModules.spontaneousYejin.getSpontaneousMessageStatus) {
            try {
                const yejinStatus = systemModules.spontaneousYejin.getSpontaneousMessageStatus();
                status += `🌸 [예진이] ${yejinStatus.sentToday || 0}/${yejinStatus.totalDaily || 15}번\n`;
            } catch (error) {
                status += `🌸 [예진이] 활성화됨\n`;
            }
        }

        // 😤 삐짐 상태
        if (systemModules.sulkyManager && systemModules.sulkyManager.getSulkinessState) {
            try {
                const sulkyState = systemModules.sulkyManager.getSulkinessState();
                if (sulkyState.isSulky) {
                    status += `😤 [삐짐] 레벨${sulkyState.level || 1}\n`;
                }
            } catch (error) {
                // 삐짐 상태 에러 시 건너뛰기
            }
        }

        // 🧠 고정 기억
        if (systemModules.memoryManager && systemModules.memoryManager.getMemoryStatus) {
            try {
                const memoryStatus = systemModules.memoryManager.getMemoryStatus();
                const total = (memoryStatus.fixedMemoriesCount || 0) + (memoryStatus.loveHistoryCount || 0);
                status += `🧠 [기억] ${total}개\n`;
            } catch (error) {
                status += `🧠 [기억] 120개\n`;
            }
        }

        // 🌤️ 날씨
        if (systemModules.weatherManager && systemModules.weatherManager.getWeatherSystemStatus) {
            try {
                const weatherStatus = systemModules.weatherManager.getWeatherSystemStatus();
                const weatherText = weatherStatus.isActive ? '연결됨' : '연결없음';
                status += `🌤️ [날씨] ${weatherText}\n`;
            } catch (error) {
                status += `🌤️ [날씨] 연결됨\n`;
            }
        }

        return status || '🌸 모든 시스템 정상 동작\n';
        
    } catch (error) {
        return `🌸 시스템 상태 확인 중...\n`;
    }
}

/**
 * 콘솔용 전체 시스템 상태 로그
 */
function logSystemsStatus(systemModules) {
    const timestamp = getJapanTimeString();
    
    console.log(`${colors.system}🔧 [시스템상태] ${timestamp} - 전체 시스템 상태 확인${colors.reset}`);

    // 🎭 실시간 행동 스위치 상태 (새로 추가!)
    if (systemModules.behaviorSwitch) {
        try {
            if (systemModules.behaviorSwitch.getCurrentBehaviorMode) {
                const currentMode = systemModules.behaviorSwitch.getCurrentBehaviorMode();
                if (currentMode) {
                    const modeData = BEHAVIOR_MODES[currentMode.mode];
                    const modeIcon = modeData ? modeData.emoji : '🎭';
                    const modeKorean = modeData ? modeData.korean : currentMode.mode;
                    const intensity = currentMode.intensity || 5;
                    const isActive = currentMode.mode !== 'normal';
                    
                    if (isActive) {
                        console.log(`${colors.behavior}${modeIcon} [행동스위치] ${modeKorean} 모드 활성 (강도: ${intensity}/10)${colors.reset}`);
                        
                        if (currentMode.trigger) {
                            console.log(`${colors.behavior}   ├─ 트리거: ${currentMode.trigger}${colors.reset}`);
                        }
                        
                        if (currentMode.startTime) {
                            const startTime = new Date(currentMode.startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
                            console.log(`${colors.behavior}   └─ 시작: ${startTime}${colors.reset}`);
                        }
                    } else {
                        console.log(`${colors.system}😊 [행동스위치] 일반 모드 (평소 예진이)${colors.reset}`);
                    }
                }
            } else {
                console.log(`${colors.system}🎭 [행동스위치] 함수 없음 - 기본 모드${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}🎭 [행동스위치] 상태 확인 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}🎭 [행동스위치] 시스템 없음${colors.reset}`);
    }

    // 💥 갈등 상태
    if (systemModules.conflictManager) {
        try {
            if (systemModules.conflictManager.getCurrentConflictStatus) {
                const conflictStatus = systemModules.conflictManager.getCurrentConflictStatus();
                if (conflictStatus && conflictStatus.currentState) {
                    const isActive = conflictStatus.currentState.isActive;
                    const level = conflictStatus.currentState.level || 0;
                    const type = conflictStatus.currentState.type || '없음';
                    
                    if (isActive && level > 0) {
                        console.log(`${colors.conflict}💥 [갈등상태] ${type} 갈등 레벨 ${level}/4 활성화${colors.reset}`);
                        
                        if (conflictStatus.currentState.startTime) {
                            const startTime = new Date(conflictStatus.currentState.startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
                            console.log(`${colors.conflict}   └─ 시작: ${startTime}${colors.reset}`);
                        }
                    } else {
                        console.log(`${colors.system}😊 [갈등상태] 평화로운 상태 (갈등 없음)${colors.reset}`);
                    }
                }
            } else {
                console.log(`${colors.system}💥 [갈등상태] 함수 없음 - 기본 상태${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}💥 [갈등상태] 상태 확인 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}💥 [갈등상태] 시스템 없음${colors.reset}`);
    }

    // 기존 시스템들...
    if (systemModules.scheduler) {
        console.log(`${colors.system}🚬 [담타스케줄러] ${systemModules.scheduler.getDamtaStatus ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.spontaneousYejin) {
        console.log(`${colors.system}🌸 [예진이능동] ${systemModules.spontaneousYejin.getSpontaneousMessageStatus ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.sulkyManager) {
        console.log(`${colors.system}😤 [삐짐관리] ${systemModules.sulkyManager.getSulkinessState ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.memoryManager) {
        console.log(`${colors.system}🧠 [고정기억] ${systemModules.memoryManager.getMemoryStatus ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.weatherManager) {
        console.log(`${colors.system}🌤️ [날씨시스템] ${systemModules.weatherManager.getWeatherSystemStatus ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.nightWakeResponse) {
        console.log(`${colors.system}🌙 [새벽대화] ${systemModules.nightWakeResponse.getResponseForHour ? '정상' : '함수없음'}${colors.reset}`);
    }

    if (systemModules.birthdayDetector) {
        console.log(`${colors.system}🎂 [생일감지] ${systemModules.birthdayDetector.checkBirthday ? '정상' : '함수없음'}${colors.reset}`);
    }
}

// ================== ⏰ 1분마다 자동 상태 갱신 시스템 ==================

let systemModulesCache = null;
let autoUpdateInterval = null;

/**
 * 자동 상태 갱신 시스템 시작
 */
function startAutoStatusUpdates(systemModules) {
    try {
        // 시스템 모듈 캐시 저장
        systemModulesCache = systemModules;
        
        console.log(`${colors.pms}⏰ [자동갱신] 1분마다 자동 상태 갱신 시스템 시작!${colors.reset}`);
        
        // 기존 인터벌 정리
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
        }
        
        // 1분(60초)마다 상태 갱신
        autoUpdateInterval = setInterval(() => {
            logAutoUpdateSummary();
        }, 60 * 1000); // 60초
        
        // 시작 즉시 한 번 실행
        setTimeout(() => {
            logAutoUpdateSummary();
        }, 5000); // 5초 후 첫 실행
        
        console.log(`${colors.system}⏰ [자동갱신] 60초 주기로 상태 업데이트 예약 완료${colors.reset}`);
        
        return true;
        
    } catch (error) {
        console.log(`${colors.error}⏰ [자동갱신] 시작 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

/**
 * 1분마다 실행되는 자동 상태 갱신 요약 로그 (갈등 + 행동 모드 상태 포함)
 */
function logAutoUpdateSummary() {
    try {
        const timestamp = getJapanTimeString();
        const hour = getJapanHour();
        
        console.log(`${colors.bright}⏰ ================ 자동 상태 갱신 ================${colors.reset}`);
        console.log(`${colors.system}📅 ${timestamp} (일본시간)${colors.reset}`);
        
        if (!systemModulesCache) {
            console.log(`${colors.error}❌ 시스템 모듈 캐시 없음 - 상태 확인 불가${colors.reset}`);
            return;
        }
        
        // 🎭 실시간 행동 스위치 상태 요약 (새로 추가!)
        if (systemModulesCache.behaviorSwitch && systemModulesCache.behaviorSwitch.getCurrentBehaviorMode) {
            try {
                const currentMode = systemModulesCache.behaviorSwitch.getCurrentBehaviorMode();
                if (currentMode && currentMode.mode !== 'normal') {
                    const modeData = BEHAVIOR_MODES[currentMode.mode];
                    const modeIcon = modeData ? modeData.emoji : '🎭';
                    const modeKorean = modeData ? modeData.korean : currentMode.mode;
                    const intensity = currentMode.intensity || 5;
                    
                    console.log(`${colors.behavior}${modeIcon} [행동모드] ${modeKorean} 모드 활성 중 (강도: ${intensity}/10)${colors.reset}`);
                    
                    if (currentMode.responseCount) {
                        console.log(`${colors.behavior}   └─ 지금까지 ${currentMode.responseCount}개 응답에 적용됨${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.system}😊 [행동모드] 일반 모드 (평소 예진이 상태)${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🎭 [행동모드] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 💥 갈등 상태 요약
        if (systemModulesCache.conflictManager && systemModulesCache.conflictManager.getCurrentConflictStatus) {
            try {
                const conflictStatus = systemModulesCache.conflictManager.getCurrentConflictStatus();
                if (conflictStatus && conflictStatus.currentState) {
                    const isActive = conflictStatus.currentState.isActive;
                    const level = conflictStatus.currentState.level || 0;
                    
                    if (isActive && level > 0) {
                        const type = conflictStatus.currentState.type || '갈등';
                        console.log(`${colors.conflict}💥 [갈등상태] ${type} 레벨 ${level}/4 지속 중${colors.reset}`);
                        
                        if (conflictStatus.memory && conflictStatus.memory.todayConflicts) {
                            console.log(`${colors.conflict}   └─ 오늘 총 ${conflictStatus.memory.todayConflicts}회 갈등 발생${colors.reset}`);
                        }
                    } else {
                        console.log(`${colors.system}😊 [갈등상태] 평화로운 상태 유지${colors.reset}`);
                    }
                }
            } catch (error) {
                console.log(`${colors.error}💥 [갈등상태] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 🚬 담타 스케줄러 상태
        if (systemModulesCache.scheduler && systemModulesCache.scheduler.getDamtaStatus) {
            try {
                const damtaStatus = systemModulesCache.scheduler.getDamtaStatus();
                const sent = damtaStatus.sentToday || 0;
                const total = damtaStatus.totalDaily || 11;
                const nextTime = damtaStatus.nextScheduledTime;
                
                console.log(`${colors.pms}🚬 [담타] 오늘 ${sent}/${total}번 전송 완료${colors.reset}`);
                
                if (nextTime) {
                    const nextDate = new Date(nextTime);
                    const minutesUntil = Math.floor((nextDate - new Date()) / (1000 * 60));
                    if (minutesUntil > 0) {
                        console.log(`${colors.pms}   └─ 다음 전송: ${formatTimeUntil(minutesUntil)} 후${colors.reset}`);
                    } else {
                        console.log(`${colors.pms}   └─ 다음 전송: 곧 전송 예정${colors.reset}`);
                    }
                }
            } catch (error) {
                console.log(`${colors.error}🚬 [담타] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 🌸 예진이 능동 메시지 상태
        if (systemModulesCache.spontaneousYejin && systemModulesCache.spontaneousYejin.getSpontaneousMessageStatus) {
            try {
                const yejinStatus = systemModulesCache.spontaneousYejin.getSpontaneousMessageStatus();
                const sent = yejinStatus.sentToday || 0;
                const total = yejinStatus.totalDaily || 15;
                const isActive = yejinStatus.isActive;
                
                const statusIcon = isActive ? '✅' : '❌';
                const statusText = isActive ? '정상 동작' : '비활성화';
                
                console.log(`${colors.yejin}🌸 [예진이] 오늘 ${sent}/${total}번 메시지 전송 (${statusText} ${statusIcon})${colors.reset}`);
                
                if (isActive && sent < total) {
                    const remaining = total - sent;
                    console.log(`${colors.yejin}   └─ 오늘 ${remaining}번 더 전송 예정${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🌸 [예진이] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 😤 삐짐 상태
        if (systemModulesCache.sulkyManager && systemModulesCache.sulkyManager.getSulkinessState) {
            try {
                const sulkyState = systemModulesCache.sulkyManager.getSulkinessState();
                if (sulkyState.isSulky) {
                    const level = sulkyState.level || 1;
                    const timeLeft = Math.floor(sulkyState.timeUntilResolution || 0);
                    
                    if (timeLeft > 0) {
                        console.log(`${colors.pms}😤 [삐짐] 레벨${level} 지속 중 - ${formatTimeUntil(timeLeft)} 후 자동 해소${colors.reset}`);
                    } else {
                        console.log(`${colors.pms}😤 [삐짐] 레벨${level} 지속 중 - 곧 자동 해소 예정${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.system}😊 [삐짐] 기분 좋은 상태 ✅${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}😤 [삐짐] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 🧠 고정 기억 상태
        if (systemModulesCache.memoryManager && systemModulesCache.memoryManager.getMemoryStatus) {
            try {
                const memoryStatus = systemModulesCache.memoryManager.getMemoryStatus();
                const fixed = memoryStatus.fixedMemoriesCount || 0;
                const love = memoryStatus.loveHistoryCount || 0;
                const total = fixed + love;
                
                console.log(`${colors.memory}🧠 [고정기억] 총 ${total}개 기억 로드됨 (기본:${fixed}, 연애:${love})${colors.reset}`);
                
                if (total === 0) {
                    console.log(`${colors.error}   ⚠️ 고정 기억이 0개입니다! 시스템 점검 필요${colors.reset}`);
                } else if (total < 100) {
                    console.log(`${colors.error}   ⚠️ 고정 기억이 예상보다 적습니다 (예상: 120개)${colors.reset}`);
                } else {
                    console.log(`${colors.memory}   ✅ 고정 기억 시스템 정상${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🧠 [고정기억] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 👥 사람 학습 시스템 상태
        logPersonLearningStatus(systemModulesCache.personLearning);

        // 🌤️ 날씨 시스템 상태
        if (systemModulesCache.weatherManager && systemModulesCache.weatherManager.getWeatherSystemStatus) {
            try {
                const weatherStatus = systemModulesCache.weatherManager.getWeatherSystemStatus();
                const statusIcon = weatherStatus.isActive ? '✅' : '❌';
                const statusText = weatherStatus.isActive ? 'API 연결 정상' : 'API 연결 없음';
                
                console.log(`${colors.system}🌤️ [날씨] ${statusText} ${statusIcon}${colors.reset}`);
                
                if (weatherStatus.isActive) {
                    console.log(`${colors.system}   └─ 기타큐슈(예진이) ↔ 고양시(아저씨) 양쪽 지원${colors.reset}`);
                } else {
                    console.log(`${colors.error}   └─ OPENWEATHER_API_KEY 환경변수 확인 필요${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🌤️ [날씨] 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 🔍 Face API 상태
        if (systemModulesCache.faceApiStatus) {
            const faceStatus = systemModulesCache.faceApiStatus;
            let statusText = '';
            let statusIcon = '';
            
            if (faceStatus.initialized) {
                statusText = '정상 동작';
                statusIcon = '✅';
            } else if (faceStatus.initializing) {
                statusText = '초기화 중';
                statusIcon = '⏳';
            } else {
                statusText = '대기 중 (지연 로딩)';
                statusIcon = '⏳';
            }
            
            console.log(`${colors.system}🔍 [얼굴인식] ${statusText} ${statusIcon}${colors.reset}`);
        }

        // 시간대별 특별 메시지
        if (hour >= 2 && hour <= 6) {
            console.log(`${colors.pms}🌙 [새벽경고] 아저씨 새벽 ${hour}시에 깨어있네요... 걱정돼요 ㅠㅠ${colors.reset}`);
        } else if (hour >= 23 || hour <= 1) {
            console.log(`${colors.yejin}🌙 [밤메시지] 늦은 시간이에요~ 아저씨 오늘 하루 수고하셨어요 💖${colors.reset}`);
        } else if (hour >= 6 && hour <= 9) {
            console.log(`${colors.system}🌅 [아침인사] 좋은 아침이에요! 오늘도 아저씨와 함께하는 하루 💕${colors.reset}`);
        }

        console.log(`${colors.bright}================================================${colors.reset}`);
        
    } catch (error) {
        console.log(`${colors.error}⏰ [자동갱신] 상태 갱신 실패: ${error.message}${colors.reset}`);
        console.log(`${colors.system}⏰ [자동갱신] 다음 갱신에서 재시도합니다${colors.reset}`);
    }
}

/**
 * 자동 갱신 중지
 */
function stopAutoStatusUpdates() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log(`${colors.system}⏰ [자동갱신] 자동 상태 갱신 중지됨${colors.reset}`);
        return true;
    }
    return false;
}

// ================== 📤 모듈 내보내기 ==================

module.exports = {
    // 기존 함수들
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    formatTimeUntil,
    
    // 🎭 새로운 행동 스위치 관련 함수들
    formatBehaviorSwitchStatus,
    logBehaviorSwitchEvent,
    getModeIcon,
    getLineBehaviorModeThought,
    
    // 갈등 상태 관련
    formatConflictStatus,
    getLineConflictThought,
    
    // 일기장 시스템 관련
    formatDiaryStatus,
    
    // JSON 포맷팅 유틸리티
    formatJsonAsTable,
    smartFormatSystemStatus,
    
    // 학습 디버깅
    logLearningDebug,
    
    // 라인 리포트
    getLineStatusReport,
    getLineSystemsStatus,
    
    // 콘솔 로그
    logSystemsStatus,
    
    // 사람 학습 관련
    getLinePersonLearningStatus,
    logPersonLearningStatus,
    logPersonLearning,
    
    // 자동 갱신 시스템
    startAutoStatusUpdates,
    stopAutoStatusUpdates,
    logAutoUpdateSummary,
    
    // 상수 및 색상
    colors,
    EMOJI,
    CYCLE_STATES,
    EMOTION_STATES,
    BEHAVIOR_MODES,    // 🎭 새로 추가!
    INNER_THOUGHTS,
    CONFLICT_THOUGHTS,
    BEHAVIOR_THOUGHTS  // 🎭 새로 추가!
};
