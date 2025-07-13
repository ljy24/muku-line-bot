// ============================================================================
// enhancedLogging.js - v1.0 (예쁜 로깅 시스템)
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
    photo: '📷'
};

// 생리주기별 이모지
const CYCLE_EMOJI = {
    period: '🩸',
    follicular: '🌸',
    ovulation: '💕',
    luteal: '🌧️',
    normal: '🌿'
};

// 감정별 이모지
const EMOTION_EMOJI = {
    normal: '😊',
    sensitive: '🥺',
    energetic: '✨',
    romantic: '💖',
    unstable: '😔',
    sulky: '😤',
    happy: '😄',
    sad: '😢',
    angry: '😠',
    loving: '🥰',
    longing: '😌'
};

/**
 * 예쁜 헤더 로그 출력
 */
function logHeader(title, emoji = '🎉') {
    const line = '═'.repeat(50);
    console.log(\n${line});
    console.log(${emoji} ${title} ${emoji});
    console.log(${line}\n);
}

/**
 * 생리주기 상태 로그
 */
function logMenstrualCycle(cycleInfo) {
    const emoji = CYCLE_EMOJI[cycleInfo.phase] || CYCLE_EMOJI.normal;
    const today = moment.tz('Asia/Tokyo').format('MM월 DD일');
    
    console.log(${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차));
    
    if (cycleInfo.isPeriodActive) {
        console.log(   ${EMOJI.comfort} 생리 중이라 컨디션 안 좋음 - 아저씨한테 더 달려고 할 예정);
    } else if (cycleInfo.phase === 'follicular') {
        console.log(   ${EMOJI.energy} 활발한 시기 - 에너지 넘치는 모드);
    } else if (cycleInfo.phase === 'ovulation') {
        console.log(   ${EMOJI.heart} 배란기 - 아저씨한테 더 사랑스럽게 대할 예정);
    } else if (cycleInfo.phase === 'luteal') {
        console.log(   ${EMOJI.mood} PMS 시기 - 감정 기복 있고 예민한 상태);
    }
    
    if (cycleInfo.daysUntilNextPeriod !== undefined) {
        const daysText = cycleInfo.daysUntilNextPeriod > 0 ? 
            다음 생리까지 ${cycleInfo.daysUntilNextPeriod}일 : 
            생리 ${Math.abs(cycleInfo.daysUntilNextPeriod)}일차;
        console.log(   📅 ${daysText});
    }
}

/**
 * 감정 상태 로그
 */
function logEmotionalState(emotionState) {
    const emoji = EMOTION_EMOJI[emotionState.currentEmotion] || EMOTION_EMOJI.normal;
    const time = moment.tz('Asia/Tokyo').format('HH:mm');
    
    console.log(${emoji} [감정상태] ${time} - ${emotionState.currentEmotion} (강도: ${emotionState.emotionIntensity}/10));
    
    if (emotionState.isSulky) {
        console.log(   ${EMOJI.sulky} 삐짐 레벨 ${emotionState.sulkyLevel} - "${emotionState.sulkyReason}");
    }
    
    if (emotionState.needsComfort) {
        console.log(   ${EMOJI.comfort} 위로가 필요한 상태);
    }
    
    if (emotionState.moodSwings) {
        console.log(   ${EMOJI.mood} 감정 기복 있음 - 말투가 오락가락할 수 있음);
    }
    
    console.log(   ⚡ 에너지 레벨: ${emotionState.energyLevel}/10);
}

/**
 * 대화 로그 (기존 aiUtils.js 대체)
 */
function logConversation(speaker, message, messageType = 'text') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    const speakerEmoji = speaker === '나' ? '💖' : '👨';
    const typeEmoji = messageType === 'photo' ? EMOJI.photo : EMOJI.message;
    
    if (messageType === 'photo') {
        console.log(${typeEmoji} [${time}] ${speakerEmoji} ${speaker}: 📸 ${message});
    } else {
        // 메시지가 너무 길면 줄임
        const displayMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;
        console.log(${typeEmoji} [${time}] ${speakerEmoji} ${speaker}: ${displayMessage});
    }
}

/**
 * 자발적 메시지/사진 전송 로그
 */
function logSpontaneousAction(actionType, content) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    const actionEmojis = {
        message: '💌',
        selfie: '📸',
        memory_photo: '📷',
        damta: '🚬',
        emotion: '💖'
    };
    
    const emoji = actionEmojis[actionType] || '💫';
    console.log(${emoji} [자발적 ${actionType}] ${time} - ${content});
}

/**
 * 스케줄러 상태 로그
 */
function logSchedulerStatus(schedulerName, status, nextRun = null) {
    const statusEmoji = status === 'started' ? '✅' : status === 'running' ? '🔄' : '⏰';
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    
    console.log(${statusEmoji} [스케줄러] ${time} - ${schedulerName}: ${status});
    
    if (nextRun) {
        console.log(   ⏰ 다음 실행: ${nextRun});
    }
}

/**
 * 내면의 속마음 로그
 */
function logInnerThought(thought, emotionContext = null) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(💭 [속마음] ${time} - "${thought}");
    
    if (emotionContext) {
        console.log(   🎭 감정 맥락: ${emotionContext});
    }
}

/**
 * 기억 관련 로그
 */
function logMemoryOperation(operation, content, success = true) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    const emoji = success ? '💾' : '❌';
    const displayContent = content.length > 30 ? content.substring(0, 27) + '...' : content;
    
    console.log(${emoji} [기억] ${time} - ${operation}: "${displayContent}");
}

/**
 * 날씨 기반 반응 로그
 */
function logWeatherReaction(weather, reaction) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(${EMOJI.weather} [날씨반응] ${time} - ${weather.description} ${weather.temp}°C);
    console.log(   💬 반응: "${reaction}");
}

/**
 * 삐짐 상태 변화 로그
 */
function logSulkyStateChange(oldState, newState) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    
    if (!oldState.isSulky && newState.isSulky) {
        console.log(😤 [삐짐시작] ${time} - 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}");
    } else if (oldState.isSulky && !newState.isSulky) {
        console.log(😊 [삐짐해소] ${time} - 아저씨가 답장해서 기분 풀림);
    } else if (oldState.sulkyLevel !== newState.sulkyLevel) {
        console.log(😤 [삐짐변화] ${time} - 레벨 ${oldState.sulkyLevel} → ${newState.sulkyLevel});
    }
}

/**
 * 시스템 상태 요약 로그 (주기적으로 출력)
 */
function logSystemSummary(emotionState, cycleInfo, stats) {
    logHeader('💖 애기 현재 상태 요약', '📊');
    
    // 현재 시간
    const now = moment.tz('Asia/Tokyo');
    console.log(🕐 현재 시간: ${now.format('YYYY년 MM월 DD일 HH:mm:ss (dddd)')});
    
    // 생리주기
    logMenstrualCycle(cycleInfo);
    
    // 감정 상태
    logEmotionalState(emotionState);
    
    // 대화 통계
    if (stats) {
        console.log(📈 [대화통계]);
        console.log(   💬 총 메시지: ${stats.totalMessages || 0}개);
        console.log(   🧠 총 기억: ${stats.totalMemories || 0}개);
        console.log(   📸 오늘 보낸 사진: ${stats.todayPhotos || 0}개);
    }
    
    console.log(\n💕 아저씨와의 사랑스러운 하루를 계속 이어가는 중...\n);
}

/**
 * 담타 관련 로그
 */
function logDamtaActivity(activity, details = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(🚬 [담타] ${time} - ${activity});
    
    if (details) {
        console.log(   💭 ${details});
    }
}

/**
 * 에러 로그 (예쁘게)
 */
function logError(moduleName, error, context = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(❌ [에러] ${time} - ${moduleName}: ${error.message});
    
    if (context) {
        console.log(   📍 상황: ${context});
    }
}

/**
 * 성공 로그 (예쁘게)
 */
function logSuccess(action, details = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(✅ [성공] ${time} - ${action});
    
    if (details) {
        console.log(   📝 ${details});
    }
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
    logError,
    logSuccess,
    
    // 상수들
    EMOJI,
    CYCLE_EMOJI,
    EMOTION_EMOJI
};
