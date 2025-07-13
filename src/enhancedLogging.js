// ============================================================================
// enhancedLogging.js - v2.0 (index.js와 통합된 예쁜 로깅 시스템)
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
    luteal: '🌧️',
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
 * 생리주기 상태 로그 (간단 버전)
 */
function logMenstrualCycle(cycleInfo) {
    const emoji = CYCLE_EMOJI[cycleInfo.phase] || CYCLE_EMOJI.normal;
    const today = formatKoreanDate();
    
    let cycleText = '';
    if (cycleInfo.isPeriodActive) {
        cycleText = `${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차)`;
    } else {
        const daysUntilPeriod = cycleInfo.daysUntilNextPeriod || 0;
        cycleText = `${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차) 📅 다음 생리까지 ${Math.abs(daysUntilPeriod)}일`;
    }
    
    console.log(cycleText);
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
        console.log(`💕 [기분] 아저씨와 평화롭게 대화 중`);
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
    console.log(`💭 [속마음] "${thought}"`);
    
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
 * 담타 관련 로그
 */
function logDamtaActivity(activity, details = '') {
    console.log(`🚬 [담타] ${activity}`);
    
    if (details) {
        console.log(`   💭 ${details}`);
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
 * 시스템 상태 요약 로그 (주기적으로 출력) - index.js 스타일로 통합
 */
function logSystemSummary(emotionState, cycleInfo, stats) {
    console.log(''); // 빈 줄
    
    // 생리주기
    logMenstrualCycle(cycleInfo);
    
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
    logError,
    logSuccess,
    
    // 상수들
    EMOJI,
    CYCLE_EMOJI,
    EMOTION_EMOJI,
    EMOTION_KOREAN
};
