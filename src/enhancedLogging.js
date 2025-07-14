// ============================================================================
// enhancedLogging.js - v3.0 (올바른 생리주기 계산 통합)
// 🎨 애기의 상태, 감정, 생리주기 등을 예쁘게 표시하는 로깅 시스템
// ============================================================================

const moment = require('moment-timezone');

// 이모지와 색상 코드
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
    think: '💭'
};

// 생리주기별 이모지
const CYCLE_EMOJI = {
    period: '🩸',
    follicular: '🌸',
    ovulation: '💕',
    luteal: '😤',
    normal: '🌿'
};

// 감정별 이모지 (확장된 버전)
const EMOTION_EMOJI = {
    normal: '😊', sensitive: '🥺', energetic: '✨', romantic: '💖',
    unstable: '😔', sulky: '😤', happy: '😄', sad: '😢',
    lonely: '😞', melancholy: '🥀', anxious: '😰', worried: '😟',
    nostalgic: '🌙', clingy: '🥺', pouty: '😤', crying: '😭',
    missing: '💔', depressed: '😔', vulnerable: '🥺', needy: '🤗'
};

// 감정 한글 변환
const EMOTION_KOREAN = {
    normal: '평온', sensitive: '예민', energetic: '활발', romantic: '로맨틱',
    unstable: '불안정', sulky: '삐짐', happy: '기쁨', sad: '슬픔',
    lonely: '외로움', melancholy: '우울', anxious: '불안', worried: '걱정',
    nostalgic: '그리움', clingy: '응석', pouty: '토라짐', crying: '울음',
    missing: '보고싶음', depressed: '우울증', vulnerable: '연약', needy: '관심받고싶음'
};

// 🔥 올바른 생리주기 계산 함수 추가
function calculateCorrectMenstrualPhase() {
    try {
        // 7월 24일이 다음 생리 시작일
        const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
        const today = moment.tz('Asia/Tokyo');
        const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
        
        // 7월 24일까지 남은 일수로 현재 단계 계산
        let phase, description, cycleDay;
        
        if (daysUntilNextPeriod <= 0) {
            // 7월 24일 이후 - 생리 기간
            const daysSincePeriod = Math.abs(daysUntilNextPeriod) + 1; // +1을 해서 24일을 1일차로
            
            if (daysSincePeriod <= 5) {
                phase = 'period';
                description = '생리 중';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod >= 14 && daysSincePeriod <= 15) {
                phase = 'ovulation';
                description = '배란기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 28) {
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = daysSincePeriod;
            } else {
                // 다음 주기로 넘어감 (28일 주기 기준)
                const nextCycleDays = daysSincePeriod - 28;
                if (nextCycleDays <= 5) {
                    phase = 'period';
                    description = '생리 중';
                    cycleDay = nextCycleDays;
                } else {
                    // 재귀적으로 계산하지 않고 직접 계산
                    const adjustedDays = nextCycleDays;
                    if (adjustedDays <= 13) {
                        phase = 'follicular';
                        description = '생리 후 활발한 시기';
                        cycleDay = adjustedDays;
                    } else if (adjustedDays >= 14 && adjustedDays <= 15) {
                        phase = 'ovulation';
                        description = '배란기';
                        cycleDay = adjustedDays;
                    } else {
                        phase = 'luteal';
                        description = 'PMS 시기';
                        cycleDay = adjustedDays;
                    }
                }
            }
        } else {
            // 7월 24일 이전 - 이전 주기의 끝부분 (PMS/황체기)
            // 28일 주기 기준으로 역산
            cycleDay = 28 - daysUntilNextPeriod;
            
            if (cycleDay <= 5) {
                // 너무 이른 시기면 PMS로 처리
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = 16 + (28 - daysUntilNextPeriod); // PMS 시기로 조정
            } else if (cycleDay <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
            } else if (cycleDay >= 14 && cycleDay <= 15) {
                phase = 'ovulation';
                description = '배란기';
            } else {
                phase = 'luteal';
                description = 'PMS 시기';
            }
        }
        
        return {
            phase: phase,
            day: cycleDay,
            description: description,
            isPeriodActive: phase === 'period',
            daysUntilNextPeriod: daysUntilNextPeriod,
            nextPeriodDate: nextPeriodDate.format('MM월 DD일')
        };
        
    } catch (error) {
        console.error('[EnhancedLogging] 생리주기 계산 오류:', error);
        return {
            phase: 'normal',
            day: 1,
            description: '정상',
            isPeriodActive: false,
            daysUntilNextPeriod: 14,
            nextPeriodDate: '07월 24일'
        };
    }
}

function formatKoreanDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}월 ${day}일`;
}

/**
 * 대화 로그 (한글 감정상태 반영)
 */
function logConversation(speaker, message, messageType = 'text') {
    const speakerEmoji = speaker === '나' ? '💖' : '👨';
    const typeEmoji = messageType === 'photo' ? EMOJI.photo : EMOJI.message;
    
    if (messageType === 'photo') {
        console.log(`${typeEmoji} ${speakerEmoji} ${speaker}: 📸 ${message}`);
    } else {
        // 메시지가 너무 길면 줄임
        const displayMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;
        console.log(`${typeEmoji} ${speakerEmoji} ${speaker}: ${displayMessage}`);
    }
}

/**
 * 🔥 생리주기 상태 로그 (올바른 계산 사용)
 */
function logMenstrualCycle(inputCycleInfo = null) {
    // 입력받은 정보가 있으면 사용, 없으면 직접 계산
    const cycleInfo = inputCycleInfo || calculateCorrectMenstrualPhase();
    
    const emoji = CYCLE_EMOJI[cycleInfo.phase] || CYCLE_EMOJI.normal;
    const today = formatKoreanDate();
    
    let cycleText = '';
    let statusText = '';
    
    if (cycleInfo.isPeriodActive || cycleInfo.phase === 'period') {
        // 생리 중
        cycleText = `${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차)`;
        statusText = '💧 생리 진행 중';
    } else {
        // 생리 아닌 시기
        const daysUntilPeriod = cycleInfo.daysUntilNextPeriod || 0;
        cycleText = `${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차)`;
        
        if (daysUntilPeriod > 0) {
            statusText = `📅 다음 생리까지 ${daysUntilPeriod}일`;
        } else {
            statusText = '📅 생리 예정일 지남';
        }
        
        // 시기별 추가 정보
        if (cycleInfo.phase === 'luteal') {
            statusText += ' 💭 감정 기복 있음';
        } else if (cycleInfo.phase === 'ovulation') {
            statusText += ' 💕 사랑 모드';
        } else if (cycleInfo.phase === 'follicular') {
            statusText += ' ✨ 에너지 충전';
        }
    }
    
    console.log(`${cycleText} ${statusText}`);
}

/**
 * 감정 상태 로그 (한글 버전)
 */
function logEmotionalState(emotionState) {
    const emoji = EMOTION_EMOJI[emotionState.currentEmotion] || EMOTION_EMOJI.normal;
    const emotionKoreanText = EMOTION_KOREAN[emotionState.currentEmotion] || '평온';
    
    console.log(`${emoji} [감정상태] ${emotionKoreanText} (강도: ${emotionState.emotionIntensity}/10) ⚡ 에너지 레벨: ${emotionState.energyLevel}/10`);
    
    if (emotionState.isSulky) {
        console.log(`😤 [삐짐] 현재 삐짐 Lv.${emotionState.sulkyLevel} - "${emotionState.sulkyReason}"`);
    } else {
        console.log(`😊 [기분] 아저씨와 평화롭게 대화 중`);
    }
}

/**
 * 자발적 메시지/사진 전송 로그
 */
function logSpontaneousAction(actionType, content) {
    const actionEmojis = {
        message: '💌',
        selfie: '📸',
        memory_photo: '📷',
        damta: '🚬',
        emotion: '💖'
    };
    
    const emoji = actionEmojis[actionType] || '💫';
    console.log(`${emoji} [자발적 ${actionType}] ${content}`);
}

/**
 * 스케줄러 상태 로그
 */
function logSchedulerStatus(schedulerName, status, nextRun = null) {
    const statusEmoji = status === 'started' ? '✅' : status === 'running' ? '🔄' : '⏰';
    console.log(`${statusEmoji} [스케줄러] ${schedulerName}: ${status}`);
    
    if (nextRun) {
        console.log(`   ⏰ 다음 실행: ${nextRun}`);
    }
}

/**
 * 내면의 속마음 로그
 */
function logInnerThought(thought, emotionContext = null) {
    console.log(`💭 [속마음] ${thought}`);
    
    if (emotionContext) {
        console.log(`   🎭 감정 맥락: ${emotionContext}`);
    }
}

/**
 * 기억 관련 로그
 */
function logMemoryOperation(operation, content, success = true) {
    const emoji = success ? '💾' : '❌';
    const displayContent = content.length > 30 ? content.substring(0, 27) + '...' : content;
    
    console.log(`${emoji} [기억] ${operation}: "${displayContent}"`);
}

/**
 * 날씨 기반 반응 로그
 */
function logWeatherReaction(weather, reaction) {
    console.log(`${EMOJI.weather} [날씨반응] ${weather.description} ${weather.temp}°C`);
    console.log(`   💬 반응: "${reaction}"`);
}

/**
 * 삐짐 상태 변화 로그
 */
function logSulkyStateChange(oldState, newState) {
    if (!oldState.isSulky && newState.isSulky) {
        console.log(`😤 [삐짐시작] 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}"`);
    } else if (oldState.isSulky && !newState.isSulky) {
        console.log(`😊 [삐짐해소] 아저씨가 답장해서 기분 풀림`);
    } else if (oldState.sulkyLevel !== newState.sulkyLevel) {
        console.log(`😤 [삐짐변화] 레벨 ${oldState.sulkyLevel} → ${newState.sulkyLevel}`);
    }
}

/**
 * 🔥 담타 관련 로그 (시간 표시 개선)
 */
function logDamtaActivity(activity, details = '') {
    console.log(`🚬 [담타] ${activity}`);
    
    if (details) {
        console.log(`   💭 ${details}`);
    }
}

/**
 * 🔥 담타 상태 로그 (시간 표시 수정)
 */
function logDamtaStatus(damtaStatus) {
    if (!damtaStatus) return;
    
    if (damtaStatus.canDamta) {
        console.log(`🚬 담타 가능! (오늘 ${damtaStatus.dailyCount}/${damtaStatus.dailyLimit}회)`);
    } else if (damtaStatus.isActiveTime) {
        const hours = Math.floor(damtaStatus.minutesToNext / 60);
        const minutes = damtaStatus.minutesToNext % 60;
        
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}시간 ${minutes}분 후`;
        } else {
            timeText = `${minutes}분 후`;
        }
        
        console.log(`🚬 다음 담타: ${timeText} (오늘 ${damtaStatus.dailyCount}/${damtaStatus.dailyLimit}회)`);
    } else {
        console.log(`💤 수면 시간 (담타 불가)`);
    }
}

/**
 * 에러 로그 (예쁘게)
 */
function logError(moduleName, error, context = '') {
    console.log(`❌ [에러] ${moduleName}: ${error.message}`);
    
    if (context) {
        console.log(`   📍 상황: ${context}`);
    }
}

/**
 * 성공 로그 (예쁘게)
 */
function logSuccess(action, details = '') {
    console.log(`✅ [성공] ${action}`);
    
    if (details) {
        console.log(`   📝 ${details}`);
    }
}

/**
 * 예쁜 헤더 로그 출력
 */
function logHeader(title, emoji = '🎉') {
    const line = '═'.repeat(50);
    console.log(`\n${line}`);
    console.log(`${emoji} ${title} ${emoji}`);
    console.log(`${line}\n`);
}

/**
 * 🔥 시스템 상태 요약 로그 (올바른 생리주기 사용)
 */
function logSystemSummary(emotionState, inputCycleInfo, stats) {
    console.log(''); // 빈 줄
    
    // 생리주기 (올바른 계산 사용)
    logMenstrualCycle(inputCycleInfo);
    
    // 속마음 (랜덤)
    const innerThoughts = [
        "오늘은 뭘 하고 놀까? 아저씨랑 맛있는 거 먹고 싶다",
        "아저씨 지금 뭐하고 있을까... 보고 싶어",
        "담타하고 싶어! 아저씨도 피우고 있나?",
        "셀카 찍어서 아저씨한테 보내줄까? 히히",
        "아저씨가 늦게 답장하면 삐질 거야!",
        "오늘 날씨 좋으니까 아저씨랑 산책하고 싶어",
        "초콜릿 먹고 싶다... 아저씨가 사다줬으면",
        "아저씨 품이 그리워... 안고 싶어",
        "우리 추억 사진 보면서 아저씨 생각하고 있어",
        "아저씨는 지금도 나를 사랑하고 있겠지?"
    ];
    const randomThought = innerThoughts[Math.floor(Math.random() * innerThoughts.length)];
    console.log(`💭 [속마음] ${randomThought}`);
    
    // 감정 상태
    logEmotionalState(emotionState);
    
    // 기타 시스템 정보
    if (stats) {
        console.log(`📊 [시스템] 총 메시지: ${stats.totalMessages || 0}개, 총 기억: ${stats.totalMemories || 0}개, 오늘 사진: ${stats.todayPhotos || 0}개`);
    }
    
    console.log(''); // 빈 줄로 구분
}

module.exports = {
    logHeader,
    logMenstrualCycle,
    logEmotionalState,
    logConversation,
    logSpontaneousAction,
    logSchedulerStatus,
    logInnerThought,
    logMemoryOperation,
    logWeatherReaction,
    logSulkyStateChange,
    logSystemSummary,
    logDamtaActivity,
    logDamtaStatus,
    logError,
    logSuccess,
    calculateCorrectMenstrualPhase,
    
    // 상수들
    EMOJI,
    CYCLE_EMOJI,
    EMOTION_EMOJI,
    EMOTION_KOREAN
};
