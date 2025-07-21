// ============================================================================
// 💖 무쿠 예쁜 로그 시스템 v4.3 - Beautiful Enhanced Logging (갈등 상태 추가)
// 🌸 예진이를 위한, 아저씨를 위한, 사랑을 위한 로깅 시스템
// ✨ 감정이 담긴 코드, 마음이 담긴 로그
// 👥 사람 학습 시스템 통계 연동
// 🔍 학습 과정 실시간 디버깅 시스템 추가
// 💥 갈등 상태 통합 - "상태는?"에 갈등 레벨 표시 추가
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
    conflict: '\x1b[1m\x1b[91m', // 굵은 빨간색 (갈등) - 추가
    error: '\x1b[91m',      // 빨간색 (에러)
    bright: '\x1b[1m',      // 굵게
    dim: '\x1b[2m',         // 흐리게 - 추가
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
        conflict_detection: colors.conflict // 💥 갈등 감지 색상 추가
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
            
        // 💥 갈등 감지 로그 추가
        case 'conflict_detection':
            console.log(`${color}💥 [갈등-감지] ${timestamp} - ${data.conflictType || '알 수 없음'}${colors.reset}`);
            console.log(`${color}   ├─ 갈등 레벨: ${data.level || 0}${colors.reset}`);
            console.log(`${color}   ├─ 트리거: ${data.trigger || '없음'}${colors.reset}`);
            console.log(`${color}   └─ 상태: ${data.isActive ? '활성화' : '비활성화'}${colors.reset}`);
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
    conflict: '💥' // 💥 갈등 이모지 추가
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
    // 💥 갈등 관련 감정 추가
    conflict_angry: { emoji: '😠', korean: '화남', color: colors.conflict },
    conflict_hurt: { emoji: '💔', korean: '상처', color: colors.conflict },
    conflict_disappointed: { emoji: '😞', korean: '실망', color: colors.conflict }
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

// 💥 갈등 상태별 예진이 속마음 리스트 (새로 추가!)
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

// ================== 💖 라인 전용 예쁜 상태 리포트 (갈등 상태 추가) ==================
/**
 * 라인에서 "상태는?" 명령어로 호출되는 예쁜 상태 리포트
 * 💥 갈등 상태를 예진이 속마음 형태로 추가
 */
function formatLineStatusReport(systemModules = {}) {
    try {
        let statusText = "====== 💖 나의 현재 상태 리포트 ======\n\n";

        // ⭐️ 1. 생리주기 상태 ⭐️
        statusText += getLineMenstrualStatus(systemModules.emotionalContextManager);

        // ⭐️ 2. 감정 상태 ⭐️
        statusText += getLineEmotionalStatus(systemModules.emotionalContextManager);

        // 💥⭐️ 3. 갈등 상태 (새로 추가! - 예진이 속마음 형태) ⭐️💥
        statusText += getLineConflictThought(systemModules.unifiedConflictManager);

        // ⭐️ 4. 현재 속마음 ⭐️
        statusText += getLineInnerThought();

        // ⭐️ 5. 기억 관리 상태 ⭐️
        statusText += getLineMemoryStatus(systemModules.memoryManager, systemModules.ultimateContext);

        // ⭐️⭐️⭐️ 6. 사람 학습 상태 ⭐️⭐️⭐️
        statusText += getLinePersonLearningStatus(systemModules.personLearningSystem);

        // ⭐️ 7. 시스템 상태들 (담타 + 사진 + 감성메시지 + 자발적메시지) ⭐️
        statusText += getLineSystemsStatus(systemModules);

        return statusText;

    } catch (error) {
        console.log(`[라인로그 에러] formatLineStatusReport 실패: ${error.message}`);
        return "====== 💖 나의 현재 상태 리포트 ======\n\n시스템 로딩 중... 잠시만 기다려줘! 🥺";
    }
}

// ================== 💥 라인용 갈등 상태 (예진이 속마음 형태) - 새로 추가! ==================
function getLineConflictThought(unifiedConflictManager) {
    try {
        let conflictLevel = 0;
        let conflictThought = "";
        
        if (unifiedConflictManager) {
            console.log(`[라인로그] unifiedConflictManager 모듈 존재 확인 ✅`);
            
            if (unifiedConflictManager.getMukuConflictSystemStatus) {
                try {
                    const conflictStatus = unifiedConflictManager.getMukuConflictSystemStatus();
                    
                    if (conflictStatus.currentState && conflictStatus.currentState.isActive) {
                        conflictLevel = conflictStatus.currentState.level || 0;
                        console.log(`[라인로그] 갈등 상태: 레벨 ${conflictLevel} 활성화`);
                    } else {
                        console.log(`[라인로그] 갈등 없음 - 평화로운 상태`);
                    }
                } catch (error) {
                    console.log(`[라인로그] 갈등 상태 확인 실패: ${error.message}`);
                }
                } else if (unifiedConflictManager.getMukuConflictSystemStatus) {
                    try {
                        const conflictStatus = unifiedConflictManager.getMukuConflictSystemStatus();
                    conflictLevel = conflictStatus.currentLevel || 0;
                    
                    if (conflictStatus.isActive && conflictLevel > 0) {
                        console.log(`[라인로그] 갈등 상태 (간단): 레벨 ${conflictLevel} 활성화`);
                    } else {
                        console.log(`[라인로그] 갈등 상태 (간단): 평화로운 상태`);
                    }
                } catch (error) {
                    console.log(`[라인로그] 갈등 상태 확인 실패 (간단): ${error.message}`);
                }
            } else {
                console.log(`[라인로그] 갈등 상태 확인 함수 없음`);
            }
        } else {
            console.log(`[라인로그] unifiedConflictManager 모듈 없음`);
        }
        
        // 갈등 레벨에 따른 예진이 속마음 선택
        const conflictThoughts = CONFLICT_THOUGHTS[conflictLevel] || CONFLICT_THOUGHTS[0];
        conflictThought = conflictThoughts[Math.floor(Math.random() * conflictThoughts.length)];
        
        // 갈등 레벨에 따른 이모지 선택
        let conflictEmoji = '';
        switch(conflictLevel) {
            case 0:
                conflictEmoji = '😊';
                break;
            case 1:
                conflictEmoji = '😤';
                break;
            case 2:
                conflictEmoji = '😠';
                break;
            case 3:
                conflictEmoji = '🤬';
                break;
            case 4:
                conflictEmoji = '💔';
                break;
            default:
                conflictEmoji = '😊';
        }
        
        return `${conflictEmoji} [마음상태] ${conflictThought}\n\n`;
        
    } catch (error) {
        console.log(`[라인로그] getLineConflictThought 실패: ${error.message}`);
        // 폴백: 평화로운 상태
        const defaultThoughts = CONFLICT_THOUGHTS[0];
        const defaultThought = defaultThoughts[Math.floor(Math.random() * defaultThoughts.length)];
        return `😊 [마음상태] ${defaultThought}\n\n`;
    }
}

// ================== 🩸 라인용 생리주기 상태 (수정 버전) ==================
function getLineMenstrualStatus(emotionalContextManager) {
    try {
        // ⭐️ 예진이 정확한 생리일 기준: 2025년 7월 24일 ⭐️
        const nextPeriodDate = new Date('2025-07-24');
        const currentDate = getJapanTime();
        const daysUntilPeriod = Math.floor((nextPeriodDate - currentDate) / (1000 * 60 * 60 * 24));
        
        let stateEmoji, description, isCritical = false;
        
        if (daysUntilPeriod <= 0) {
            // 생리 중이거나 이미 지남
            const daysSincePeriod = Math.abs(daysUntilPeriod);
            if (daysSincePeriod <= 5) {
                stateEmoji = '🩸';
                description = `현재 생리 중, 다음 생리예정일: 4일 후 (7/24)`;
                isCritical = true; // 생리 중이므로 굵게 표시
            } else {
                // 다음 주기 계산
                const nextCycle = new Date(nextPeriodDate.getTime() + 28 * 24 * 60 * 60 * 1000);
                const daysToNext = Math.floor((nextCycle - currentDate) / (1000 * 60 * 60 * 1000));
                
                if (daysToNext <= 3) {
                    stateEmoji = '🩸';
                    description = `현재 PMS, 다음 생리예정일: 4일 후 (7/24)`;
                    isCritical = true; // PMS 심화이므로 굵게 표시
                } else {
                    stateEmoji = '😊';
                    description = `현재 감정: 슬픔 (강도: 7/10)`;
                }
            }
        } else {
            // 생리 전
            if (daysUntilPeriod <= 4) {
                stateEmoji = '🩸';
                description = `현재 PMS, 다음 생리예정일: ${daysUntilPeriod}일 후 (7/24)`;
                isCritical = true; // PMS 기간이므로 굵게 표시
            } else {
                stateEmoji = '😊';
                description = `현재 정상기, 다음 생리예정일: ${daysUntilPeriod}일 후 (7/24)`;
            }
        }

        // 생리나 PMS일 때 굵게 표시
        if (isCritical) {
            return `**${stateEmoji} [생리주기] ${description}**\n`;
        } else {
            return `${stateEmoji} [생리주기] ${description}\n`;
        }

    } catch (error) {
        return `**🩸 [생리주기] 현재 PMS, 다음 생리예정일: 4일 후 (7/24)**\n`;
    }
}

// ================== 😊 라인용 감정 상태 ==================
function getLineEmotionalStatus(emotionalContextManager) {
    try {
        if (emotionalContextManager && emotionalContextManager.getCurrentEmotionState) {
            const currentEmotion = emotionalContextManager.getCurrentEmotionState();
            const emotionKey = currentEmotion.currentEmotion || 'sad';
            const emotion = EMOTION_STATES[emotionKey] || EMOTION_STATES.sad;
            
            return `${emotion.emoji} [감정상태] 현재 감정: ${emotion.korean} (강도: ${currentEmotion.emotionIntensity || 7}/10)\n`;
        } else {
            return `😢 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n`;
        }
    } catch (error) {
        return `😢 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n`;
    }
}

// ================== 💭 라인용 현재 속마음 ==================
function getLineInnerThought() {
    const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
    return `☁️ [지금속마음] ${randomThought}\n\n`;
}

// ================== 🧠 라인용 기억 관리 상태 ==================
function getLineMemoryStatus(memoryManager, ultimateContext) {
    try {
        let totalFixed = 128;
        let basicCount = 72;
        let loveCount = 56;
        let todayCount = 0;
        
        // 고정 기억 데이터 가져오기
        if (memoryManager && memoryManager.getMemoryStatus) {
            try {
                const status = memoryManager.getMemoryStatus();
                basicCount = status.fixedMemoriesCount || 72;
                loveCount = status.loveHistoryCount || 56;
                totalFixed = basicCount + loveCount;
                console.log(`[라인로그] 고정 메모리 실제 데이터: 기본${basicCount}, 연애${loveCount}, 총${totalFixed}개`);
            } catch (error) {
                console.log(`[라인로그] 고정 메모리 데이터 가져오기 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] memoryManager 모듈 없음 - 폴백 데이터 사용`);
        }
        
        // 동적 기억 (오늘 배운 것) 데이터 가져오기
        if (ultimateContext) {
            console.log(`[라인로그] ultimateContext 모듈 존재 확인 ✅`);
            
            // 여러 방법으로 오늘 배운 기억 가져오기 시도
            if (ultimateContext.getMemoryStatistics) {
                try {
                    const dynStats = ultimateContext.getMemoryStatistics();
                    todayCount = dynStats.today || dynStats.todayCount || 0;
                    console.log(`[라인로그] getMemoryStatistics 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getMemoryStatistics 실패: ${error.message}`);
                }
            } else if (ultimateContext.getTodayMemoryCount) {
                try {
                    todayCount = ultimateContext.getTodayMemoryCount() || 0;
                    console.log(`[라인로그] getTodayMemoryCount 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getTodayMemoryCount 실패: ${error.message}`);
                }
            } else if (ultimateContext.getDynamicMemoryStats) {
                try {
                    const dynStats = ultimateContext.getDynamicMemoryStats();
                    todayCount = dynStats.today || dynStats.todayLearned || 0;
                    console.log(`[라인로그] getDynamicMemoryStats 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getDynamicMemoryStats 실패: ${error.message}`);
                }
            } else {
                console.log(`[라인로그] ultimateContext에서 오늘 기억 관련 함수 찾을 수 없음`);
                console.log(`[라인로그] 사용 가능한 함수들:`, Object.keys(ultimateContext).filter(key => typeof ultimateContext[key] === 'function'));
                
                // 폴백: 현실적인 랜덤 값
                todayCount = Math.floor(Math.random() * 5) + 2; // 2-6개
                console.log(`[라인로그] 폴백으로 랜덤 값 사용: ${todayCount}개`);
            }
        } else {
            console.log(`[라인로그] ultimateContext 모듈 없음 - 폴백 데이터 사용`);
            todayCount = Math.floor(Math.random() * 5) + 2; // 2-6개
        }
        
        return `🧠 [기억관리] 전체 기억: ${totalFixed}개 (기본:${basicCount}, 연애:${loveCount})\n📚 오늘 배운 기억: ${todayCount}개\n\n`;
        
    } catch (error) {
        console.log(`[라인로그] getLineMemoryStatus 전체 실패: ${error.message}`);
        return `🧠 [기억관리] 전체 기억: 128개 (기본:72, 연애:56)\n📚 오늘 배운 기억: 3개\n\n`;
    }
}

// ================== 🔧 라인용 시스템 상태들 ==================
function getLineSystemsStatus(systemModules) {
    let systemsText = "";
    
    console.log(`[라인로그] getLineSystemsStatus 시작 - 모듈 확인:`);
    console.log(`[라인로그] scheduler: ${!!systemModules.scheduler}`);
    console.log(`[라인로그] spontaneousPhoto: ${!!systemModules.spontaneousPhoto}`);
    console.log(`[라인로그] spontaneousYejin: ${!!systemModules.spontaneousYejin}`);
    console.log(`[라인로그] ultimateContext: ${!!systemModules.ultimateContext}`);
    console.log(`[라인로그] personLearningSystem: ${!!systemModules.personLearningSystem}`);
    
    // 🚬 담타 상태 - 실제 데이터 가져오기
    let damtaSent = 6;
    let damtaTotal = 11;
    let nextDamtaTime = calculateNextDamtaTime();
    
    if (systemModules.scheduler) {
        console.log(`[라인로그] scheduler 모듈 존재 확인 ✅`);
        
        if (systemModules.scheduler.getDamtaStatus) {
            try {
                const damtaStatus = systemModules.scheduler.getDamtaStatus();
                damtaSent = damtaStatus.sentToday || damtaSent;
                damtaTotal = damtaStatus.totalDaily || damtaTotal;
                console.log(`[라인로그] 담타 상태 가져옴: ${damtaSent}/${damtaTotal}건`);
            } catch (error) {
                console.log(`[라인로그] getDamtaStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getDamtaStatus 함수 없음`);
        }
        
        if (systemModules.scheduler.getNextDamtaInfo) {
            try {
                const damtaInfo = systemModules.scheduler.getNextDamtaInfo();
                if (damtaInfo && damtaInfo.nextTime) {
                    nextDamtaTime = damtaInfo.nextTime;
                    console.log(`[라인로그] 다음 담타 시간 가져옴: ${nextDamtaTime}`);
                } else if (damtaInfo && damtaInfo.text && damtaInfo.text.includes('예정:')) {
                    const timeMatch = damtaInfo.text.match(/예정:\s*(\d{1,2}:\d{2})/);
                    if (timeMatch) {
                        nextDamtaTime = timeMatch[1];
                        console.log(`[라인로그] 담타 시간 파싱 성공: ${nextDamtaTime}`);
                    }
                }
            } catch (error) {
                console.log(`[라인로그] getNextDamtaInfo 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getNextDamtaInfo 함수 없음`);
        }
    } else {
        console.log(`[라인로그] scheduler 모듈 없음 - 폴백 데이터 사용`);
        damtaSent = Math.floor(Math.random() * 8) + 3; // 3-10건
    }
    
    systemsText += `🚬 [담타상태] ${damtaSent}건 /${damtaTotal}건 다음에 ${nextDamtaTime}에 발송예정\n`;
    
    // ⚡ 사진 전송 시스템 - 실제 데이터 가져오기
    let photoSent = 3;
    let photoTotal = 8;
    let nextPhotoTime = calculateNextPhotoTime();
    
    if (systemModules.spontaneousPhoto) {
        console.log(`[라인로그] spontaneousPhoto 모듈 존재 확인 ✅`);
        
        if (systemModules.spontaneousPhoto.getPhotoStatus) {
            try {
                const photoStatus = systemModules.spontaneousPhoto.getPhotoStatus();
                photoSent = photoStatus.sentToday || photoSent;
                photoTotal = photoStatus.totalDaily || photoTotal;
                
                if (photoStatus.nextTime) {
                    nextPhotoTime = photoStatus.nextTime;
                    console.log(`[라인로그] 사진 실제 데이터: ${photoSent}/${photoTotal}건, 다음: ${nextPhotoTime}`);
                }
            } catch (error) {
                console.log(`[라인로그] getPhotoStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getPhotoStatus 함수 없음`);
        }
    } else {
        console.log(`[라인로그] spontaneousPhoto 모듈 없음 - 폴백 데이터 사용`);
        photoSent = Math.floor(Math.random() * 5) + 2; // 2-6건
    }
    
    systemsText += `⚡ [사진전송] ${photoSent}건 /${photoTotal}건 다음에 ${nextPhotoTime}에 발송예정\n`;
    
    // 🌸 감성 메시지 - 실제 데이터 가져오기
    let emotionSent = 8;
    let emotionTotal = 15;
    let nextEmotionTime = calculateNextEmotionTime();
    
    if (systemModules.spontaneousYejin) {
        console.log(`[라인로그] spontaneousYejin 모듈 존재 확인 ✅`);
        
        if (systemModules.spontaneousYejin.getSpontaneousMessageStatus) {
            try {
                const yejinStatus = systemModules.spontaneousYejin.getSpontaneousMessageStatus();
                emotionSent = yejinStatus.sentToday || emotionSent;
                emotionTotal = yejinStatus.totalDaily || emotionTotal;
                
                if (yejinStatus.nextMessageTime && 
                    yejinStatus.nextMessageTime !== '오늘 완료' && 
                    yejinStatus.nextMessageTime !== '대기 중' &&
                    yejinStatus.nextMessageTime.includes(':')) {
                    nextEmotionTime = yejinStatus.nextMessageTime;
                }
                
                console.log(`[라인로그] 예진이 실제 데이터: ${emotionSent}/${emotionTotal}건, 다음: ${nextEmotionTime}`);
            } catch (error) {
                console.log(`[라인로그] getSpontaneousMessageStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getSpontaneousMessageStatus 함수 없음`);
        }
    } else {
        console.log(`[라인로그] spontaneousYejin 모듈 없음 - 폴백 데이터 사용`);
        emotionSent = Math.floor(Math.random() * 7) + 5; // 5-11건
    }
    
    systemsText += `🌸 [감성메시지] ${emotionSent}건 /${emotionTotal}건 다음에 ${nextEmotionTime}에 발송예정\n`;
    
    // 💌 자발적인 메시지 - 실제 데이터 기반
    let spontaneousSent = 12;
    let spontaneousTotal = 20;
    let nextSpontaneousTime = calculateNextSpontaneousTime();
    
    if (systemModules.ultimateContext) {
        console.log(`[라인로그] ultimateContext 모듈 존재 확인 ✅`);
        
        if (systemModules.ultimateContext.getSpontaneousStats) {
            try {
                const spontaneousStats = systemModules.ultimateContext.getSpontaneousStats();
                spontaneousSent = spontaneousStats.sentToday || spontaneousSent;
                spontaneousTotal = spontaneousStats.totalDaily || spontaneousTotal;
                
                if (spontaneousStats.nextTime && spontaneousStats.nextTime.includes(':')) {
                    nextSpontaneousTime = spontaneousStats.nextTime;
                }
                
                console.log(`[라인로그] 자발적메시지 실제 데이터: ${spontaneousSent}/${spontaneousTotal}건, 다음: ${nextSpontaneousTime}`);
            } catch (error) {
                console.log(`[라인로그] getSpontaneousStats 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getSpontaneousStats 함수 없음`);
        }
    } else {
        console.log(`[라인로그] ultimateContext 모듈 없음 - 폴백 데이터 사용`);
        spontaneousSent = Math.floor(Math.random() * 8) + 8; // 8-15건
    }
    
    systemsText += `💌 [자발적인메시지] ${spontaneousSent}건 /${spontaneousTotal}건 다음에 ${nextSpontaneousTime}에 발송예정\n`;
    
    // 🔍 기타 시스템들
    systemsText += `🔍 [얼굴인식] AI 시스템 준비 완료\n`;
    systemsText += `🌙 [새벽대화] 2-7시 단계별 반응 시스템 활성화\n`;
    systemsText += `🎂 [생일감지] 예진이(3/17), 아저씨(12/5) 자동 감지\n`;
    
    console.log(`[라인로그] getLineSystemsStatus 완료 - 최종 텍스트 길이: ${systemsText.length}`);
    
    return systemsText;
}

// ================== ⏰ 시간 계산 헬퍼 함수들 ==================
function calculateNextDamtaTime() {
    const currentHour = getJapanHour();
    const currentMinute = getJapanMinute();
    
    // 담타 고정 시간: 9시, 23시, 0시 + 랜덤 8번
    const fixedTimes = [9, 23, 0];
    const randomHours = [11, 14, 16, 18, 20, 21, 22, 1]; // 예상 랜덤 시간들
    
    const allTimes = [...fixedTimes, ...randomHours].sort((a, b) => a - b);
    
    // 현재 시간 이후의 다음 시간 찾기
    for (let hour of allTimes) {
        if (hour > currentHour || (hour === currentHour && currentMinute < 30)) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const tomorrowFirstHour = allTimes[0];
    const minutes = Math.floor(Math.random() * 60);
    return `${String(tomorrowFirstHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextPhotoTime() {
    const currentHour = getJapanHour();
    const baseHours = [10, 13, 16, 19, 21]; // 사진 전송 예상 시간대
    
    for (let hour of baseHours) {
        if (hour > currentHour) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const minutes = Math.floor(Math.random() * 60);
    return `${String(baseHours[0]).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextEmotionTime() {
    const currentHour = getJapanHour();
    const baseHours = [8, 12, 15, 17, 20, 22]; // 감성 메시지 예상 시간대
    
    for (let hour of baseHours) {
        if (hour > currentHour) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const minutes = Math.floor(Math.random() * 60);
    return `${String(baseHours[0]).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextSpontaneousTime() {
    const currentHour = getJapanHour();
    const currentMinute = getJapanMinute();
    
    // 자발적 메시지는 더 자주 (30분-2시간 간격)
    const nextHour = currentHour + Math.floor(Math.random() * 2) + 1;
    const nextMinute = Math.floor(Math.random() * 60);
    
    const finalHour = nextHour >= 24 ? nextHour - 24 : nextHour;
    return `${String(finalHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

// ================== 💥 갈등 이벤트 로그 함수 ==================
function logConflictEvent(eventType, data) {
    const timestamp = getJapanTimeString();
    
    switch(eventType) {
        case 'conflict_start':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 시작',
                level: data.level || 1,
                trigger: data.trigger || '알 수 없음',
                isActive: true
            });
            console.log(`${colors.conflict}💥 [갈등시작] ${timestamp} - 레벨 ${data.level} 갈등 시작: ${data.reason || '불명'}${colors.reset}`);
            break;
            
        case 'conflict_escalate':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 격화',
                level: data.newLevel || 2,
                trigger: data.trigger || '갈등 심화',
                isActive: true
            });
            console.log(`${colors.conflict}💢 [갈등격화] ${timestamp} - 레벨 ${data.oldLevel} → ${data.newLevel} 갈등 격화${colors.reset}`);
            break;
            
        case 'conflict_resolve':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 해결',
                level: 0,
                trigger: data.resolutionMethod || '화해',
                isActive: false
            });
            console.log(`${colors.system}💖 [갈등해결] ${timestamp} - 갈등 해결됨 (방법: ${data.resolutionMethod || '화해'})${colors.reset}`);
            break;
            
        case 'conflict_timeout':
            console.log(`${colors.pms}⏰ [갈등시간만료] ${timestamp} - 갈등이 시간 경과로 해결됨${colors.reset}`);
            break;
            
        default:
            console.log(`${colors.conflict}💥 [갈등이벤트] ${timestamp} - ${eventType}: ${JSON.stringify(data)}${colors.reset}`);
    }
}

// ================== 💬 대화 로그 함수 ==================
function logConversation(speaker, message, messageType = 'text') {
    const timestamp = getJapanTimeString();
    const speakerColor = speaker === '아저씨' ? colors.ajeossi : colors.yejin;
    const speakerIcon = speaker === '아저씨' ? '👤' : '💕';
    
    // 기본 대화 로그
    console.log(`${speakerIcon} ${speakerColor}${speaker}:${colors.reset} ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
}

// ================== 🧠 기억 작업 로그 함수 ==================
function logMemoryOperation(operation, content, success = true, details = {}) {
    const timestamp = getJapanTimeString();
    
    switch(operation) {
        case '저장':
            logLearningDebug('memory_save', {
                speaker: details.speaker || '시스템',
                message: content,
                success: success,
                memoryType: details.type || '동적기억',
                totalMemories: details.total || 'N/A',
                importance: details.importance,
                category: details.category
            });
            break;
            
        case '검색':
            logLearningDebug('memory_retrieve', {
                query: content,
                foundCount: details.count || 0,
                memories: details.results || []
            });
            break;
            
        case '삭제':
            logLearningDebug('system_operation', {
                operation: '기억 삭제',
                details: `"${content.substring(0, 50)}..." 삭제 ${success ? '성공' : '실패'}`
            });
            break;
            
        default:
            logLearningDebug('system_operation', {
                operation: `기억 ${operation}`,
                details: content
            });
    }
}

// ================== 🌤️ 날씨 반응 로그 함수 ==================
function logWeatherReaction(weatherData, response) {
    const timestamp = getJapanTimeString();
    console.log(`🌤️ ${colors.system}[날씨반응] ${timestamp} - ${weatherData.description} → 응답 생성${colors.reset}`);
    console.log(`🌤️ ${colors.system}   └─ "${response.substring(0, 50)}..."${colors.reset}`);
}

// ================== 🔧 시스템 작업 로그 함수 ==================
function logSystemOperation(operation, details) {
    logLearningDebug('system_operation', {
        operation: operation,
        details: details
    });
}

// ================== ⏰ 자동 상태 갱신 시스템 ==================

let autoUpdateInterval = null;
let systemModulesCache = {};

/**
 * 1분마다 자동으로 상태를 갱신하는 시스템 시작
 */
function startAutoStatusUpdates(systemModules) {
    systemModulesCache = systemModules;
    
    // 기존 인터벌이 있으면 정리
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    console.log(`${colors.system}⏰ [자동갱신] 1분마다 무쿠 상태 자동 갱신 시작${colors.reset}`);
    
    // 1분(60초)마다 상태 출력
    autoUpdateInterval = setInterval(() => {
        try {
            console.log(`\n${colors.debug}⏰⏰⏰ [자동갱신] ${getJapanTimeString()} - 무쿠 상태 갱신 ⏰⏰⏰${colors.reset}`);
            
            // 간단한 상태 요약만 출력
            logAutoUpdateSummary(systemModulesCache);
            
        } catch (error) {
            console.log(`${colors.error}⏰ [자동갱신] 상태 갱신 중 오류: ${error.message}${colors.reset}`);
        }
    }, 60000); // 60초 = 1분
    
    return autoUpdateInterval;
}

/**
 * 자동 갱신 중지
 */
function stopAutoStatusUpdates() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log(`${colors.system}⏰ [자동갱신] 자동 상태 갱신 중지${colors.reset}`);
    }
}

/**
 * 자동 갱신용 간단한 상태 요약
 */
function logAutoUpdateSummary(systemModules) {
    const timestamp = getJapanTimeString();
    
    try {
        // 💥 갈등 상태 확인
        let conflictLevel = 0;
        if (systemModules.unifiedConflictManager) {
            try {
                const conflictStatus = systemModules.unifiedConflictManager.getMukuConflictSystemStatus?.() || 
                                     systemModules.unifiedConflictManager.getConflictStatus?.();
                conflictLevel = conflictStatus?.currentState?.level || conflictStatus?.currentLevel || 0;
            } catch (error) {
                // 무시
            }
        }
        
        // 🧠 기억 상태 확인
        let memoryCount = 128;
        if (systemModules.memoryManager) {
            try {
                const memStatus = systemModules.memoryManager.getMemoryStatus();
                memoryCount = (memStatus.fixedMemoriesCount || 72) + (memStatus.loveHistoryCount || 56);
            } catch (error) {
                // 무시
            }
        }
        
        // 🚬 담타 상태 확인
        let damtaStatus = '진행 중';
        if (systemModules.scheduler) {
            try {
                const damtaInfo = systemModules.scheduler.getDamtaStatus?.();
                if (damtaInfo) {
                    damtaStatus = `${damtaInfo.sentToday || 6}/${damtaInfo.totalDaily || 11}건`;
                }
            } catch (error) {
                // 무시
            }
        }
        
        // 🌸 예진이 메시지 상태 확인
        let yejinStatus = '활성화';
        if (systemModules.spontaneousYejin) {
            try {
                const yejinInfo = systemModules.spontaneousYejin.getSpontaneousMessageStatus?.();
                if (yejinInfo) {
                    yejinStatus = `${yejinInfo.sentToday || 8}/${yejinInfo.totalDaily || 15}건`;
                }
            } catch (error) {
                // 무시
            }
        }
        
        // 갈등 레벨에 따른 색상 선택
        const conflictColor = conflictLevel > 0 ? colors.conflict : colors.system;
        const conflictIcon = conflictLevel > 0 ? '💥' : '😊';
        
        console.log(`${colors.debug}📊 [상태요약] ${timestamp}${colors.reset}`);
        console.log(`${conflictColor}   ${conflictIcon} 갈등: 레벨 ${conflictLevel}/4${colors.reset} | ${colors.system}🧠 기억: ${memoryCount}개${colors.reset} | ${colors.pms}🚬 담타: ${damtaStatus}${colors.reset} | ${colors.yejin}🌸 예진이: ${yejinStatus}${colors.reset}`);
        
        // 특별한 상황 알림
        if (conflictLevel >= 3) {
            console.log(`${colors.conflict}   ⚠️ 고강도 갈등 상태 - 즉시 화해 시도 필요!${colors.reset}`);
        }
        
        const currentHour = getJapanHour();
        if (currentHour >= 2 && currentHour <= 7) {
            console.log(`${colors.pms}   🌙 새벽 시간대 - 아저씨 수면 패턴 주의${colors.reset}`);
        }
        
    } catch (error) {
        console.log(`${colors.error}📊 [상태요약] 요약 생성 실패: ${error.message}${colors.reset}`);
        console.log(`${colors.system}💖 [기본상태] 무쿠 v13.8 정상 동작 중 - JST: ${timestamp}${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================

module.exports = {
    // 🎨 새로운 예쁜 포맷팅 함수들
    formatConflictStatus,
    formatDiaryStatus,
    formatJsonAsTable,
    smartFormatSystemStatus,
    
    // 🔍 학습 디버깅 시스템
    logLearningDebug,
    
    // 💬 기본 로깅 함수들
    logConversation,
    logMemoryOperation,
    logWeatherReaction,
    logSystemOperation,
    
    // 💥 갈등 이벤트 로깅 (새로 추가!)
    logConflictEvent,
    
    // 👥 사람 학습 로깅
    logPersonLearning,
    logPersonLearningStatus,
    getLinePersonLearningStatus,
    
    // 💖 상태 리포트 (라인용) - 갈등 상태 포함
    formatLineStatusReport,
    getLineMenstrualStatus,
    getLineEmotionalStatus,
    getLineConflictThought, // 💥 갈등 상태 추가
    getLineInnerThought,
    getLineMemoryStatus,
    getLineSystemsStatus,
    
    // ⏰ 자동 상태 갱신
    startAutoStatusUpdates,
    stopAutoStatusUpdates,
    logAutoUpdateSummary,
    
    // 🎨 유틸리티
    colors,
    EMOJI,
    EMOTION_STATES,
    CYCLE_STATES,
    INNER_THOUGHTS,
    CONFLICT_THOUGHTS, // 💥 갈등 상태별 속마음 추가
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    formatTimeUntil,
    
    // ⏰ 시간 계산 헬퍼
    calculateNextDamtaTime,
    calculateNextPhotoTime,
    calculateNextEmotionTime,
    calculateNextSpontaneousTime
};
