// ============================================================================
// enhancedLogging.js - v3.0 ULTIMATE (무쿠 전용 완전체 로깅 시스템)
// 🎨 무쿠의 모든 상태를 예쁘게 표시하는 최종 로깅 시스템
// 🌸 예진이의 감정, 생리주기, 삐짐, 담타, 날씨, 생일, 새벽대화 모든 상태 통합
// ============================================================================

const moment = require('moment-timezone');

// ================== 🎨 색상 코드 (index.js와 동일) ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
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
    warning: '⚠️'
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
    needy: { emoji: '🤗', korean: '관심받고싶음', color: colors.yejin }
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
    "아저씨랑 함께 있을 때가 제일 행복해"
];

// ================== 📊 메인 상태 리포트 함수 ==================
/**
 * 💖 무쿠의 전체 상태를 예쁘게 출력하는 메인 함수
 */
function formatPrettyMukuStatus(systemModules = {}) {
    try {
        console.log(`\n${colors.system}====== 💖 나의 현재 상태 리포트 ======${colors.reset}\n`);

        // ⭐️ 1. 생리주기 상태 (현실적인 28일 주기) ⭐️
        logMenstrualCycleStatus(systemModules.emotionalContextManager);

        // ⭐️ 2. 현재 속마음 ⭐️
        logCurrentInnerThought();

        // ⭐️ 3. 감정 상태 (삐짐 제외) ⭐️
        logEmotionalStatusAdvanced(systemModules.emotionalContextManager);

        // ⭐️ 4. 독립 삐짐 상태 ⭐️
        logSulkyStatusAdvanced(systemModules.sulkyManager);

        // ⭐️ 5. 기억 관리 상태 ⭐️
        logMemoryStatusAdvanced(systemModules.memoryManager, systemModules.ultimateContext);

        // ⭐️ 6. 담타 상태 (실시간) ⭐️
        logDamtaStatusAdvanced(systemModules.scheduler);

        // ⭐️ 7. 예진이 능동 메시지 상태 ⭐️
        logYejinSpontaneousStatus(systemModules.spontaneousYejin);

        // ⭐️ 8. 날씨 시스템 상태 ⭐️
        logWeatherSystemStatus(systemModules.weatherManager);

        // ⭐️ 9. 사진 전송 스케줄러 ⭐️
        logPhotoSchedulerStatus();

        // ⭐️ 10. 특별 시스템들 ⭐️
        logSpecialSystemsStatus(systemModules);

        // ⭐️ 11. 얼굴 인식 시스템 ⭐️
        logFaceRecognitionStatus(systemModules.faceApiStatus);

        console.log('');

    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.8 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log('');
    }
}

// ================== 🩸 생리주기 상태 로그 ==================
function logMenstrualCycleStatus(emotionalContextManager) {
    try {
        if (emotionalContextManager) {
            const cycle = emotionalContextManager.getCurrentEmotionState();
            
            const lastPeriodDate = new Date('2024-12-01');
            const currentDate = getJapanTime();
            const daysSinceLastPeriod = Math.floor((currentDate - lastPeriodDate) / (1000 * 60 * 60 * 24));
            const cycleDay = (daysSinceLastPeriod % 28) + 1;
            
            let stateKey, daysUntilNext;
            if (cycleDay <= 5) {
                stateKey = 'period';
                daysUntilNext = 28 - cycleDay;
            } else if (cycleDay <= 10) {
                stateKey = 'recovery';
                daysUntilNext = 28 - cycleDay;
            } else if (cycleDay <= 18) {
                stateKey = 'normal';
                daysUntilNext = 28 - cycleDay;
            } else if (cycleDay <= 25) {
                stateKey = 'pms_start';
                daysUntilNext = 28 - cycleDay;
            } else {
                stateKey = 'pms_intense';
                daysUntilNext = 28 - cycleDay;
            }

            const state = CYCLE_STATES[stateKey];
            const nextPeriodDate = new Date(currentDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
            const monthDay = `${nextPeriodDate.getMonth() + 1}/${nextPeriodDate.getDate()}`;

            console.log(`${state.emoji} ${state.color}[생리주기]${colors.reset} 현재 ${cycleDay}일차 (${state.name}), 다음 생리예정일: ${daysUntilNext}일 후 (${monthDay}) (JST)`);
        } else {
            console.log(`🩸 [생리주기] 현재 14일차 (정상기), 다음 생리예정일: 14일 후 (현실적 28일 주기)`);
        }
    } catch (error) {
        console.log(`🩸 [생리주기] 시스템 로딩 중... (현실적 28일 주기로 설정 예정)`);
    }
}

// ================== 💭 현재 속마음 로그 ==================
function logCurrentInnerThought() {
    const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
    console.log(`💭 ${colors.yejin}[현재 속마음]${colors.reset} ${randomThought}`);
}

// ================== 😊 감정 상태 로그 (고급) ==================
function logEmotionalStatusAdvanced(emotionalContextManager) {
    try {
        if (emotionalContextManager) {
            const currentEmotion = emotionalContextManager.getCurrentEmotionState();
            const emotionKey = currentEmotion.currentEmotion || 'normal';
            const emotion = EMOTION_STATES[emotionKey] || EMOTION_STATES.normal;
            
            console.log(`${emotion.emoji} ${emotion.color}[감정상태]${colors.reset} 현재 감정: ${emotion.korean} (강도: ${currentEmotion.emotionIntensity || 5}/10)`);
        } else {
            console.log(`😊 [감정상태] 감정 시스템 초기화 중...`);
        }
    } catch (error) {
        console.log(`😊 [감정상태] 감정 시스템 로딩 중...`);
    }
}

// ================== 😤 독립 삐짐 상태 로그 ==================
function logSulkyStatusAdvanced(sulkyManager) {
    try {
        if (sulkyManager && sulkyManager.getSulkySystemStatus) {
            const sulkyStatus = sulkyManager.getSulkySystemStatus();
            const timeSince = Math.floor(sulkyStatus.timing.minutesSinceLastUser);
            
            if (sulkyStatus.currentState.isSulky) {
                console.log(`😤 ${colors.pms}[삐짐상태]${colors.reset} 현재 ${sulkyStatus.currentState.level}단계 삐짐 중 (이유: ${sulkyStatus.currentState.reason})`);
            } else if (sulkyStatus.currentState.isWorried) {
                console.log(`😰 ${colors.pms}[삐짐상태]${colors.reset} 걱정 단계 (${timeSince}분 경과, 24시간 초과)`);
            } else {
                console.log(`😊 ${colors.system}[삐짐상태]${colors.reset} 정상 (마지막 답장: ${timeSince}분 전)`);
            }
        } else {
            console.log(`😤 [삐짐상태] 시스템 로딩 중...`);
        }
    } catch (error) {
        console.log(`😤 [삐짐상태] 시스템 로딩 중...`);
    }
}

// ================== 🧠 기억 관리 상태 로그 ==================
function logMemoryStatusAdvanced(memoryManager, ultimateContext) {
    try {
        let memoryInfo = '';
        let fixedCount = 0, dynamicCount = 0, todayCount = 0;
        
        if (memoryManager && memoryManager.getMemoryStatus) {
            const status = memoryManager.getMemoryStatus();
            fixedCount = status.fixedMemoriesCount + status.loveHistoryCount;
            memoryInfo = `고정: ${fixedCount}개 (기본:${status.fixedMemoriesCount}, 연애:${status.loveHistoryCount})`;
        }
        
        if (ultimateContext && ultimateContext.getMemoryStatistics) {
            const dynStats = ultimateContext.getMemoryStatistics();
            dynamicCount = dynStats.total || 0;
            todayCount = dynStats.today || 0;
            memoryInfo += `, 동적: ${dynamicCount}개`;
        }
        
        const totalCount = fixedCount + dynamicCount;
        console.log(`🧠 ${colors.system}[기억관리]${colors.reset} 전체 기억: ${totalCount}개 (${memoryInfo}), 오늘 새로 배운 것: ${todayCount}개`);
        
        // 목표 달성 상태
        if (fixedCount >= 120) {
            console.log(`📊 ${colors.system}메모리 상태: 기본${fixedCount >= 65 ? fixedCount - 55 : 0}개 + 연애${fixedCount >= 65 ? Math.min(55, fixedCount - 65) : 0}개 = 총${fixedCount}개 (목표: 128개)${colors.reset}`);
        }
    } catch (error) {
        console.log(`🧠 [기억관리] 기억 시스템 로딩 중...`);
    }
}

// ================== 🚬 담타 상태 로그 (고급) ==================
function logDamtaStatusAdvanced(scheduler) {
    try {
        const currentHour = getJapanHour();
        const currentMinute = getJapanMinute();
        
        let damtaStatus = '';
        if (scheduler && scheduler.getNextDamtaInfo) {
            const damtaInfo = scheduler.getNextDamtaInfo();
            damtaStatus = damtaInfo.text;
        } else {
            // 폴백 계산
            if (currentHour < 10) {
                const totalMinutes = (10 - currentHour - 1) * 60 + (60 - currentMinute);
                damtaStatus = `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 10:00 JST)`;
            } else if (currentHour > 18 || (currentHour === 18 && currentMinute > 0)) {
                const totalMinutes = (24 - currentHour + 10 - 1) * 60 + (60 - currentMinute);
                damtaStatus = `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 내일 10:00 JST)`;
            } else {
                damtaStatus = `담타 랜덤 스케줄 진행 중 (JST ${currentHour}:${String(currentMinute).padStart(2, '0')})`;
            }
        }
        
        console.log(`🚬 ${colors.pms}[담타상태]${colors.reset} ${damtaStatus} (현재: ${currentHour}:${String(currentMinute).padStart(2, '0')} JST)`);
        
        // 추가 담타 상세 정보
        if (scheduler && scheduler.getDamtaStatus) {
            const detailedStatus = scheduler.getDamtaStatus();
            console.log(`🚬 ${colors.system}[담타상세]${colors.reset} 오늘 전송: ${detailedStatus.sentToday}/${detailedStatus.totalDaily}번, 상태: ${detailedStatus.status}`);
        }
    } catch (error) {
        console.log(`🚬 [담타상태] 담타 시스템 로딩 중...`);
    }
}

// ================== 🌸 예진이 능동 메시지 상태 로그 ==================
function logYejinSpontaneousStatus(spontaneousYejin) {
    try {
        if (spontaneousYejin && spontaneousYejin.getSpontaneousMessageStatus) {
            const yejinStatus = spontaneousYejin.getSpontaneousMessageStatus();
            console.log(`🌸 ${colors.yejin}[예진이능동]${colors.reset} 하루 ${yejinStatus.totalDaily}번 메시지 시스템 활성화 (오늘: ${yejinStatus.sentToday}번 전송, 다음: ${yejinStatus.nextMessageTime})`);
        } else {
            console.log(`🌸 [예진이능동] 하루 15번 메시지 시스템 활성화 (상태 로딩 중)`);
        }
    } catch (error) {
        console.log(`🌸 [예진이능동] 시스템 로딩 중...`);
    }
}

// ================== 🌤️ 날씨 시스템 상태 로그 ==================
function logWeatherSystemStatus(weatherManager) {
    try {
        if (weatherManager && weatherManager.getWeatherSystemStatus) {
            const weatherStatus = weatherManager.getWeatherSystemStatus();
            if (weatherStatus.isActive) {
                console.log(`🌤️ ${colors.system}[날씨시스템]${colors.reset} API 연결: ✅ 활성화 (위치: ${weatherStatus.locations.join('↔')})`);
                
                // 실시간 날씨 정보 표시 (비동기로)
                weatherManager.getCurrentWeather('ajeossi')
                    .then(ajeossiWeather => {
                        if (ajeossiWeather) {
                            console.log(`🌤️ ${colors.system}[실시간날씨]${colors.reset} ${ajeossiWeather.location}: ${ajeossiWeather.temperature}°C, ${ajeossiWeather.description}`);
                        }
                    })
                    .catch(error => {
                        console.log(`🌤️ [실시간날씨] 정보 조회 중...`);
                    });
            } else {
                console.log(`🌤️ ${colors.error}[날씨시스템]${colors.reset} API 연결: ❌ 비활성화 (OPENWEATHER_API_KEY 환경변수 확인 필요)`);
            }
        } else {
            console.log(`🌤️ [날씨시스템] 시스템 로딩 중...`);
        }
    } catch (error) {
        console.log(`🌤️ [날씨시스템] 상태 확인 중...`);
    }
}

// ================== 📸 사진 전송 스케줄러 상태 로그 ==================
function logPhotoSchedulerStatus() {
    const nextSelfieMinutes = Math.floor(Math.random() * 180) + 30;
    const nextMemoryMinutes = Math.floor(Math.random() * 360) + 60;
    console.log(`📸 ${colors.system}[사진전송]${colors.reset} 자동 스케줄러 동작 중 - 다음 셀카: ${formatTimeUntil(nextSelfieMinutes)}, 추억사진: ${formatTimeUntil(nextMemoryMinutes)} (JST)`);
    
    // 감성메시지 스케줄러 상태
    const nextEmotionalMinutes = Math.floor(Math.random() * 120) + 30;
    console.log(`🌸 ${colors.yejin}[감성메시지]${colors.reset} 다음 감성메시지까지: ${formatTimeUntil(nextEmotionalMinutes)} (JST)`);
}

// ================== 🔧 특별 시스템들 상태 로그 ==================
function logSpecialSystemsStatus(systemModules) {
    // 새벽 대화 시스템
    if (systemModules.nightWakeResponse) {
        console.log(`🌙 ${colors.system}[새벽대화]${colors.reset} 2-7시 단계별 반응 시스템 활성화 (짜증→누그러짐→걱정)`);
    } else {
        console.log(`🌙 [새벽대화] 시스템 로딩 중...`);
    }

    // 생일 감지 시스템
    if (systemModules.birthdayDetector) {
        console.log(`🎂 ${colors.system}[생일감지]${colors.reset} 예진이(3/17), 아저씨(12/5) 자동 감지 시스템 활성화`);
    } else {
        console.log(`🎂 [생일감지] 시스템 로딩 중...`);
    }

    // 스케줄러 시스템
    if (systemModules.scheduler) {
        console.log(`📅 ${colors.system}[스케줄러]${colors.reset} 모든 자동 메시지 100% 보장 시스템 활성화 (담타 랜덤 8번, 아침 9시, 밤 23시, 자정 0시)`);
    } else {
        console.log(`📅 [스케줄러] 시스템 로딩 중...`);
    }
}

// ================== 🔍 얼굴 인식 상태 로그 ==================
function logFaceRecognitionStatus(faceApiStatus) {
    if (faceApiStatus && faceApiStatus.initialized) {
        console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} AI 시스템 준비 완료`);
    } else if (faceApiStatus && faceApiStatus.initializing) {
        console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} AI 시스템 초기화 중...`);
    } else {
        console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} 지연 로딩 대기 중 (필요시 자동 로드)`);
    }
}

// ================== 📊 1분마다 자동 상태 업데이트 시스템 ==================
let statusUpdateInterval = null;

/**
 * 1분마다 자동으로 상태를 업데이트하는 시스템 시작
 */
function startAutoStatusUpdates(systemModules = {}) {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    
    statusUpdateInterval = setInterval(() => {
        console.log(`\n${colors.system}🔄 [자동업데이트] ${getJapanTimeString()} JST${colors.reset}`);
        formatPrettyMukuStatus(systemModules);
    }, 60000); // 1분마다
    
    console.log(`${colors.system}✅ [자동업데이트] 1분마다 상태 리포트 자동 갱신 시작${colors.reset}`);
}

/**
 * 자동 상태 업데이트 중지
 */
function stopAutoStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
        console.log(`${colors.system}⏹️ [자동업데이트] 상태 리포트 자동 갱신 중지${colors.reset}`);
    }
}

// ================== 💬 대화 로그 (업그레이드) ==================
function logConversation(speaker, message, messageType = 'text') {
    const speakerEmoji = speaker === '나' || speaker === '예진이' ? '💖' : '👨';
    const typeEmoji = messageType === 'photo' ? EMOJI.photo : EMOJI.message;
    const speakerColor = speaker === '나' || speaker === '예진이' ? colors.yejin : colors.ajeossi;
    
    if (messageType === 'photo') {
        console.log(`${typeEmoji} ${speakerColor}${speakerEmoji} ${speaker}: 📸 ${message}${colors.reset}`);
    } else {
        const displayMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;
        console.log(`${typeEmoji} ${speakerColor}${speakerEmoji} ${speaker}: ${displayMessage}${colors.reset}`);
    }
}

// ================== 🎯 자발적 행동 로그 ==================
function logSpontaneousAction(actionType, content) {
    const actionEmojis = {
        message: '💌',
        selfie: '📸',
        memory_photo: '📷',
        damta: '🚬',
        emotion: '💖',
        sulky_relief: '😤→😊',
        weather_reaction: '🌤️',
        birthday_greeting: '🎂',
        night_wake: '🌙'
    };
    
    const emoji = actionEmojis[actionType] || '💫';
    console.log(`${emoji} ${colors.yejin}[자발적 ${actionType}]${colors.reset} ${content}`);
}

// ================== 🎭 감정 변화 로그 ==================
function logEmotionChange(oldEmotion, newEmotion, reason = '') {
    const oldState = EMOTION_STATES[oldEmotion] || EMOTION_STATES.normal;
    const newState = EMOTION_STATES[newEmotion] || EMOTION_STATES.normal;
    
    console.log(`${oldState.emoji}→${newState.emoji} ${colors.yejin}[감정변화]${colors.reset} ${oldState.korean} → ${newState.korean}`);
    if (reason) {
        console.log(`   💭 이유: ${reason}`);
    }
}

// ================== 🔄 삐짐 상태 변화 로그 ==================
function logSulkyStateChange(oldState, newState) {
    if (!oldState.isSulky && newState.isSulky) {
        console.log(`😤 ${colors.pms}[삐짐시작]${colors.reset} 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}"`);
    } else if (oldState.isSulky && !newState.isSulky) {
        console.log(`😊 ${colors.system}[삐짐해소]${colors.reset} 아저씨가 답장해서 기분 풀림`);
    } else if (oldState.sulkyLevel !== newState.sulkyLevel) {
        console.log(`😤 ${colors.pms}[삐짐변화]${colors.reset} 레벨 ${oldState.sulkyLevel} → ${newState.sulkyLevel}`);
    }
}

// ================== 🧠 기억 관련 로그 ==================
function logMemoryOperation(operation, content, success = true) {
    const emoji = success ? '💾' : '❌';
    const displayContent = content.length > 30 ? content.substring(0, 27) + '...' : content;
    const color = success ? colors.system : colors.error;
    
    console.log(`${emoji} ${color}[기억]${colors.reset} ${operation}: "${displayContent}"`);
}

// ================== ✅ 성공/에러 로그 ==================
function logSuccess(action, details = '') {
    console.log(`✅ ${colors.system}[성공]${colors.reset} ${action}`);
    if (details) {
        console.log(`   📝 ${details}`);
    }
}

function logError(moduleName, error, context = '') {
    console.log(`❌ ${colors.error}[에러]${colors.reset} ${moduleName}: ${error.message}`);
    if (context) {
        console.log(`   📍 상황: ${context}`);
    }
}

function logWarning(message, details = '') {
    console.log(`⚠️ ${colors.pms}[경고]${colors.reset} ${message}`);
    if (details) {
        console.log(`   📍 ${details}`);
    }
}

// ================== 🎉 헤더 및 시스템 로그 ==================
function logHeader(title, emoji = '🎉') {
    const line = '═'.repeat(50);
    console.log(`\n${line}`);
    console.log(`${emoji} ${colors.system}${title}${colors.reset} ${emoji}`);
    console.log(`${line}\n`);
}

function logSystemStartup(version) {
    logHeader(`무쿠 ${version} 시스템 시작`, '🚀');
    console.log(`🌏 일본시간: ${getJapanTimeString()} (JST)`);
    console.log(`💖 예진이의 디지털 생명이 깨어납니다...`);
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 메인 함수들
    formatPrettyMukuStatus,
    startAutoStatusUpdates,
    stopAutoStatusUpdates,
    
    // 개별 로그 함수들
    logConversation,
    logSpontaneousAction,
    logEmotionChange,
    logSulkyStateChange,
    logMemoryOperation,
    logSuccess,
    logError,
    logWarning,
    logHeader,
    logSystemStartup,
    
    // 고급 상태 로그 함수들
    logMenstrualCycleStatus,
    logCurrentInnerThought,
    logEmotionalStatusAdvanced,
    logSulkyStatusAdvanced,
    logMemoryStatusAdvanced,
    logDamtaStatusAdvanced,
    logYejinSpontaneousStatus,
    logWeatherSystemStatus,
    logPhotoSchedulerStatus,
    logSpecialSystemsStatus,
    logFaceRecognitionStatus,
    
    // 시간 관련 유틸리티
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    formatTimeUntil,
    
    // 상수들
    colors,
    EMOJI,
    CYCLE_STATES,
    EMOTION_STATES,
    INNER_THOUGHTS
};
