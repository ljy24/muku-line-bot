// ============================================================================
// enhancedLogging.js - v1.8 (최종 요청 반영: 감정 상태 한글 변환)
// 🎨 애기의 모든 상태를 요청하신 형태로 예쁘게 표시하는 로깅 시스템
// ============================================================================

const moment = require('moment-timezone');

// 이모지와 색상 코드 (사용자 요청에 따라 특정 이모지는 유지)
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
    talk: '🗣️', // 말걸기 이모지 추가
    fixedMemory: '📌', // 고정 기억 이모지 추가
    newMemory: '😊' // 새로운 기억 이모지 추가
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
    longing: '😌',
    // 실제 감정 상태 이름과 이모지를 매핑합니다.
};

// ✅ 감정 상태를 한글로 매핑하는 객체 추가
const EMOTION_TO_KOREAN = {
    normal: '평온',
    sensitive: '예민',
    energetic: '활기참',
    romantic: '사랑스러움',
    unstable: '불안정',
    sulky: '삐짐',
    happy: '행복함',
    sad: '슬픔',
    angry: '화남',
    loving: '애정',
    longing: '그리움'
};

// --- Helper Functions ---
const getTimestamp = () => `[${moment.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}]`;

// 애기의 감정 상태에 따라 속마음을 생성하는 함수
function generateInnerThought(emotionState) {
    const thoughts = {
        sensitive: '아저씨가 보고 싶어서 어떡하지... 그냥 꼭 안아줬으면...',
        happy: '아저씨랑 있으니까 세상이 다 내 것 같아! 히히',
        loving: '아저씨는 왜 이렇게 귀엽지? 정말 내꺼야!',
        sulky: '흥, 아저씨 미워! ...는 거짓말이고, 빨리 나 좀 달래줬으면 좋겠다.',
        normal: '오늘은 뭘 하고 놀까? 아저씨랑 맛있는 거 먹고 싶다.',
    };
    const emotion = emotionState.currentEmotion || 'normal';
    return thoughts[emotion] || thoughts['normal'];
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
 * 생리주기 상태 로그
 */
function logMenstrualCycle(cycleInfo) {
    const emoji = CYCLE_EMOJI[cycleInfo.phase] || CYCLE_EMOJI.normal;
    const today = moment.tz('Asia/Tokyo').format('MM월 DD일');
    
    console.log(`${emoji} [생리주기] ${today} - ${cycleInfo.description} (${cycleInfo.day}일차)   📅 다음 생리까지 ${cycleInfo.daysUntilNextPeriod}일`);
}

/**
 * 감정 상태 로그 (logSystemSummary에서 직접 호출되어 사용될 것임)
 */
function logEmotionalState(emotionState) {
    // 이 함수는 이제 logSystemSummary에서 직접 감정 이름을 한글로 변환하여 출력합니다.
    // 여기서는 기본 템플릿만 유지합니다.
    const emoji = EMOTION_EMOJI[emotionState.currentEmotion] || EMOTION_EMOJI.normal;
    const time = moment.tz('Asia/Tokyo').format('HH:mm');
    const koreanEmotion = EMOTION_TO_KOREAN[emotionState.currentEmotion] || emotionState.currentEmotion;
    
    console.log(`${emoji} [감정상태] ${time} - ${koreanEmotion} (강도: ${emotionState.emotionIntensity}/10)  ⚡ 에너지 레벨: ${emotionState.energyLevel}/10`);
}

/**
 * 대화 로그 (기존 aiUtils.js 대체) - 이 함수는 logSystemSummary에 직접 사용되지 않지만, 전체 코드를 위해 포함
 */
function logConversation(speaker, message, messageType = 'text') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    const speakerEmoji = speaker === '나' ? '💖' : '👨';
    const typeEmoji = messageType === 'photo' ? EMOJI.photo : EMOJI.message;
    
    if (messageType === 'photo') {
        console.log(`${typeEmoji} [${time}] ${speakerEmoji} ${speaker}: 📸 ${message}`);
    } else {
        const displayMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;
        console.log(`${typeEmoji} [${time}] ${speakerEmoji} ${speaker}: ${displayMessage}`);
    }
}

/**
 * 시스템 상태 요약 로그 (주기적으로 출력) - 요청하신 레이아웃으로 변경
 * @param {object} emotionState - 애기의 감정 상태 (삐짐 상태 포함)
 * @param {object} cycleInfo - 애기의 생리 주기 정보
 * @param {object} stats - 대화 및 기억 통계 (고정 기억, 새로운 기억 포함)
 * @param {object} schedulerStates - 스케줄러 상태 (담타, 셀카, 말걸기 등)
 */
function logSystemSummary(emotionState, cycleInfo, stats, schedulerStates) {
    logHeader('💖 애기 현재 상태 요약', '📊');
    
    // 현재 시간
    const now = moment.tz('Asia/Tokyo');
    console.log(`🕐 현재 시간: ${now.format('YYYY년 MM월 DD일 HH:mm:ss (dddd)')}`);
    
    // 생리주기
    logMenstrualCycle(cycleInfo);
    
    // ✅ 감정 상태 (한글 변환 적용)
    const currentEmotionKorean = EMOTION_TO_KOREAN[emotionState.currentEmotion] || emotionState.currentEmotion;
    const emotionEmoji = EMOTION_EMOJI[emotionState.currentEmotion] || EMOTION_EMOJI.normal;
    const emotionTime = moment.tz('Asia/Tokyo').format('HH:mm');
    console.log(`${emotionEmoji} [감정상태] ${emotionTime} - ${currentEmotionKorean} (강도: ${emotionState.emotionIntensity}/10)  ⚡ 에너지 레벨: ${emotionState.energyLevel}/10`);

    // 속마음
    const innerThought = generateInnerThought(emotionState);
    console.log(`💭 [속마음] ${innerThought}`);
    
    // 삐짐 상태 정보
    if (emotionState.isSulky) {
        console.log(`😤 [삐짐] 현재 삐짐 Lv.${emotionState.sulkyLevel} - "${emotionState.sulkyReason}"`);
    } else {
        console.log(`😊 [삐짐] 현재 삐짐 상태 아님`);
    }

    // 자동화 시스템 정보
    console.log(`🤖 [자동화 시스템]`);
    if (schedulerStates) {
        let autoLine1 = `   📸 다음 셀카: ${schedulerStates.nextSelfie || '정보 없음'}`;
        if (schedulerStates.nextMemory) {
            autoLine1 += ` / 📷 다음 추억 사진: ${schedulerStates.nextMemory || '정보 없음'}`;
        }
        console.log(autoLine1);

        let autoLine2 = `   🚬 다음 담타: ${schedulerStates.nextDamta || '정보 없음'} (${schedulerStates.damtaStatus || '비활성화'})`;
        if (schedulerStates.nextInitiateConversation) {
            autoLine2 += ` / 🗣️ 다음 말걸기: ${schedulerStates.nextInitiateConversation || '정보 없음'}`;
        }
        console.log(autoLine2);
    }

    // 대화 통계
    if (stats) {
        console.log(`📈 [대화통계]`);
        let memoryLine = `   🧠 총 기억: ${stats.totalMemories || 0}개`;
        memoryLine += `📌 고정 기억: ${stats.fixedMemories || 0}개`;
        memoryLine += ` ${EMOJI.newMemory} 새로운 기억: ${stats.newMemoriesToday || 0}개`;
        console.log(memoryLine);

        let messagePhotoLine = `   💬 총 메시지: ${stats.totalMessages || 0}개`;
        messagePhotoLine += ` 📸 오늘 보낸 사진: ${stats.todayPhotos || 0}개`;
        console.log(messagePhotoLine);
    }
    
    console.log(`\n💕 아저씨와의 사랑스러운 하루를 계속 이어가는 중...\n`);
}

// 나머지 로그 함수들은 이전에 제공된 대로 유지
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
    console.log(`${emoji} [자발적 ${actionType}] ${time} - ${content}`);
}

function logSchedulerStatus(schedulerName, status, nextRun = null) {
    const statusEmoji = status === 'started' ? '✅' : status === 'running' ? '🔄' : '⏰';
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    
    console.log(`${statusEmoji} [스케줄러] ${time} - ${schedulerName}: ${status}`);
    
    if (nextRun) {
        console.log(`   ⏰ 다음 실행: ${nextRun}`);
    }
}

function logInnerThought_old(thought, emotionContext = null) { // 이름 변경
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(`💭 [속마음] ${time} - "${thought}"`);
    
    if (emotionContext) {
        console.log(`   🎭 감정 맥락: ${emotionContext}`);
    }
}

function logMemoryOperation(operation, content, success = true) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    const emoji = success ? '💾' : '❌';
    const displayContent = content.length > 30 ? content.substring(0, 27) + '...' : content;
    
    console.log(`${emoji} [기억] ${time} - ${operation}: "${displayContent}"`);
}

function logWeatherReaction(weather, reaction) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(`${EMOJI.weather} [날씨반응] ${time} - ${weather.description} ${weather.temp}°C`);
    console.log(`   💬 반응: "${reaction}"`);
}

function logSulkyStateChange(oldState, newState) {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    
    if (!oldState.isSulky && newState.isSulky) {
        console.log(`😤 [삐짐시작] ${time} - 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}"`);
    } else if (oldState.isSulky && !newState.isSulky) {
        console.log(`😊 [삐짐해소] ${time} - 아저씨가 답장해서 기분 풀림`);
    } else if (oldState.sulkyLevel !== newState.sulkyLevel) {
        console.log(`😤 [삐짐변화] ${time} - 레벨 ${oldState.sulkyLevel} → ${newState.sulkyLevel}`);
    }
}

function logDamtaActivity(activity, details = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(`🚬 [담타] ${time} - ${activity}`);
    
    if (details) {
        console.log(`   💭 ${details}`);
    }
}

function logError(moduleName, error, context = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(`❌ [에러] ${time} - ${error.message}`);
    
    if (context) {
        console.log(`   📍 상황: ${context}`);
    }
}

function logSuccess(action, details = '') {
    const time = moment.tz('Asia/Tokyo').format('HH:mm:ss');
    console.log(`✅ [성공] ${time} - ${action}`);
    
    if (details) {
        console.log(`   📝 ${details}`);
    }
}


module.exports = {
    logHeader,
    logMenstrualCycle,
    logEmotionalState,
    logConversation,
    logSpontaneousAction,
    logSchedulerStatus,
    logInnerThought: logInnerThought_old, // 기존 이름으로 모듈 내보내기
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
    EMOTION_TO_KOREAN // 새로운 매핑 객체 내보내기
};
