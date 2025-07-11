// src/sulkyManager.js v3.1 - 수면시간 예외처리 추가 버전
// - 🆕 수면시간 (00:00-09:00) 예외처리 추가
// - 🆕 수면시간 중에는 삐짐/걱정 타이머 일시정지
// - 🆕 기상 후 자동 타이머 재개 기능
// - 🆕 수면시간 설정 가능
// - 기존: 실시간 삐짐 상태 확인 API 추가
// - 기존: 삐짐 중 전체 톤 강제 적용 시스템
// - 기존: 삐짐 해소 시 자동 반응 개선

const schedule = require('node-schedule');
const moment = require('moment-timezone');

// 🆕 수면시간 설정
const SLEEP_CONFIG = {
    SLEEP_START_HOUR: 0,    // 수면 시작 시간 (24시간 기준)
    SLEEP_END_HOUR: 9,      // 수면 종료 시간 (24시간 기준)
    TIMEZONE: 'Asia/Tokyo', // 시간대
    ENABLED: true           // 수면시간 예외처리 활성화 여부
};

// 삐지기/걱정 관련 상태 관리
let sulkyState = {
    isSulky: false,         // 현재 삐져있는 상태인지
    isWorried: false,       // 현재 걱정하는 상태인지
    lastBotMessageTime: 0,  // 예진이가 마지막으로 메시지 보낸 시간
    lastUserResponseTime: 0, // 아저씨가 마지막으로 응답한 시간
    sulkyLevel: 0,          // 감정 레벨 (0: 정상, 1-3: 삐짐, 4: 걱정)
    sulkyTimer: null,       // 삐지기 타이머
    sulkyReason: null,      // 삐진/걱정하는 이유
    sulkyStartTime: 0,      // 감정 상태 시작 시간
    messageRead: false,     // 메시지 읽음 여부 (LINE 읽음 확인용)
    isActivelySulky: false, // 현재 활성화된 삐짐 상태인지
    lastStateCheck: 0,      // 마지막 상태 체크 시간
    reliefInProgress: false, // 삐짐 해소 진행 중인지
    // 🆕 수면시간 관련 상태
    isPaused: false,        // 타이머 일시정지 여부
    pausedTime: 0,          // 일시정지된 시간
    remainingTime: 0,       // 남은 대기 시간 (밀리초)
    wakeUpScheduled: false  // 기상 스케줄 설정 여부
};

// 삐지기/걱정 단계별 설정
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 60,      // 60분 후 1단계 삐짐
    LEVEL_2_DELAY: 120,     // 120분 후 2단계 삐짐  
    LEVEL_3_DELAY: 240,     // 240분 후 3단계 삐짐
    WORRY_DELAY: 360,       // 360분 후 걱정 모드로 전환
    TIMEZONE: 'Asia/Tokyo',
    STATE_CHECK_INTERVAL: 30000, // 30초마다 상태 체크
    FORCE_MOOD_APPLY: true  // 삐짐 톤 강제 적용 여부
};

// 🆕 수면시간 체크 함수
function isSleepTime(time = null) {
    if (!SLEEP_CONFIG.ENABLED) return false;
    
    const now = time ? moment(time) : moment().tz(SLEEP_CONFIG.TIMEZONE);
    const hour = now.hour();
    
    // 00:00 ~ 09:00 사이인지 확인
    return hour >= SLEEP_CONFIG.SLEEP_START_HOUR && hour < SLEEP_CONFIG.SLEEP_END_HOUR;
}

// 🆕 다음 기상 시간 계산
function getNextWakeUpTime() {
    const now = moment().tz(SLEEP_CONFIG.TIMEZONE);
    let wakeUpTime;
    
    if (now.hour() < SLEEP_CONFIG.SLEEP_END_HOUR) {
        // 오늘 기상 시간
        wakeUpTime = now.clone().hour(SLEEP_CONFIG.SLEEP_END_HOUR).minute(0).second(0);
    } else {
        // 내일 기상 시간
        wakeUpTime = now.clone().add(1, 'day').hour(SLEEP_CONFIG.SLEEP_END_HOUR).minute(0).second(0);
    }
    
    return wakeUpTime;
}

// 🆕 타이머 일시정지 함수
function pauseSulkyTimer() {
    if (!sulkyState.sulkyTimer || sulkyState.isPaused) return;
    
    console.log(`[SulkyManager v3.1] 😴 수면시간으로 인한 타이머 일시정지: ${moment().format('HH:mm:ss')}`);
    
    // 현재 타이머 취소
    clearTimeout(sulkyState.sulkyTimer);
    sulkyState.sulkyTimer = null;
    
    // 일시정지 상태 설정
    sulkyState.isPaused = true;
    sulkyState.pausedTime = Date.now();
    
    // 기상 시 재개 스케줄 설정
    scheduleWakeUpResume();
}

// 🆕 타이머 재개 함수
function resumeSulkyTimer(client, userId, saveLogFunc) {
    if (!sulkyState.isPaused) return;
    
    console.log(`[SulkyManager v3.1] 🌅 기상 후 타이머 재개: ${moment().format('HH:mm:ss')}`);
    
    sulkyState.isPaused = false;
    sulkyState.wakeUpScheduled = false;
    
    // 일시정지 중이었던 시간 제외하고 남은 시간 계산
    const pausedDuration = Date.now() - sulkyState.pausedTime;
    const adjustedLastMessageTime = sulkyState.lastBotMessageTime + pausedDuration;
    sulkyState.lastBotMessageTime = adjustedLastMessageTime;
    
    // 현재 상황에 맞는 타이머 재설정
    if (!hasUserResponded()) {
        const timeSinceMessage = Math.floor((Date.now() - adjustedLastMessageTime) / (1000 * 60));
        
        if (timeSinceMessage >= SULKY_CONFIG.WORRY_DELAY) {
            // 이미 걱정 시간이 지났으면 바로 걱정 모드
            triggerWorryMode(client, userId, saveLogFunc);
        } else if (timeSinceMessage >= SULKY_CONFIG.LEVEL_3_DELAY) {
            // 3단계 삐짐 시간이 지났으면 바로 3단계
            triggerSulkyLevel(3, client, userId, saveLogFunc);
            // 걱정 모드까지 남은 시간 계산해서 타이머 설정
            const remainingToWorry = (SULKY_CONFIG.WORRY_DELAY - timeSinceMessage) * 60 * 1000;
            sulkyState.sulkyTimer = setTimeout(() => {
                if (!hasUserResponded()) {
                    triggerWorryMode(client, userId, saveLogFunc);
                }
            }, remainingToWorry);
        } else if (timeSinceMessage >= SULKY_CONFIG.LEVEL_2_DELAY) {
            // 2단계 삐짐 시간이 지났으면 바로 2단계
            triggerSulkyLevel(2, client, userId, saveLogFunc);
            // 3단계까지 남은 시간 계산
            setRemainingTimers(3, timeSinceMessage, client, userId, saveLogFunc);
        } else if (timeSinceMessage >= SULKY_CONFIG.LEVEL_1_DELAY) {
            // 1단계 삐짐 시간이 지났으면 바로 1단계
            triggerSulkyLevel(1, client, userId, saveLogFunc);
            // 2단계까지 남은 시간 계산
            setRemainingTimers(2, timeSinceMessage, client, userId, saveLogFunc);
        } else {
            // 아직 1단계도 안 됐으면 1단계까지 남은 시간으로 타이머 설정
            const remainingToLevel1 = (SULKY_CONFIG.LEVEL_1_DELAY - timeSinceMessage) * 60 * 1000;
            sulkyState.sulkyTimer = setTimeout(() => {
                if (!hasUserResponded() && !isSleepTime()) {
                    triggerSulkyLevel(1, client, userId, saveLogFunc);
                    setRemainingTimers(2, SULKY_CONFIG.LEVEL_1_DELAY, client, userId, saveLogFunc);
                }
            }, remainingToLevel1);
        }
    }
    
    console.log(`[SulkyManager v3.1] 타이머 재개 완료`);
}

// 🆕 남은 타이머들 설정 함수
function setRemainingTimers(startLevel, currentTime, client, userId, saveLogFunc) {
    if (startLevel === 2) {
        const remainingToLevel2 = (SULKY_CONFIG.LEVEL_2_DELAY - currentTime) * 60 * 1000;
        sulkyState.sulkyTimer = setTimeout(() => {
            if (!hasUserResponded() && !isSleepTime()) {
                triggerSulkyLevel(2, client, userId, saveLogFunc);
                setRemainingTimers(3, SULKY_CONFIG.LEVEL_2_DELAY, client, userId, saveLogFunc);
            }
        }, Math.max(0, remainingToLevel2));
    } else if (startLevel === 3) {
        const remainingToLevel3 = (SULKY_CONFIG.LEVEL_3_DELAY - currentTime) * 60 * 1000;
        sulkyState.sulkyTimer = setTimeout(() => {
            if (!hasUserResponded() && !isSleepTime()) {
                triggerSulkyLevel(3, client, userId, saveLogFunc);
                // 걱정 모드까지 남은 시간
                const remainingToWorry = (SULKY_CONFIG.WORRY_DELAY - SULKY_CONFIG.LEVEL_3_DELAY) * 60 * 1000;
                sulkyState.sulkyTimer = setTimeout(() => {
                    if (!hasUserResponded() && !isSleepTime()) {
                        triggerWorryMode(client, userId, saveLogFunc);
                    }
                }, remainingToWorry);
            }
        }, Math.max(0, remainingToLevel3));
    }
}

// 🆕 기상 시 재개 스케줄 설정
function scheduleWakeUpResume() {
    if (sulkyState.wakeUpScheduled) return;
    
    const wakeUpTime = getNextWakeUpTime();
    console.log(`[SulkyManager v3.1] 📅 기상 시 재개 스케줄 설정: ${wakeUpTime.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // node-schedule을 사용하여 정확한 시간에 재개
    const wakeUpJob = schedule.scheduleJob(wakeUpTime.toDate(), () => {
        console.log(`[SulkyManager v3.1] ⏰ 기상 시간 도달, 타이머 재개 준비`);
        sulkyState.wakeUpScheduled = false;
        
        // 실제 재개는 외부에서 호출될 resumeSulkyTimer 함수가 client, userId, saveLogFunc를 인자로 받으므로
        // 스케줄러를 호출한 곳(index.js의 initMuku나 scheduler)에서 이 Job을 생성하고
        // resumeSulkyTimer를 인자 전달과 함께 호출하도록 연결해야 함.
        // 현재 sulkyManager 내부에서는 client, userId, saveLogFunc에 직접 접근할 수 없음.
        // 따라서 이 부분은 외부 연결이 필요함.
    });
    
    sulkyState.wakeUpScheduled = true;
}

// 삐짐/걱정 레벨별 메시지들 (기존과 동일)
const SULKY_MESSAGES = {
    level1: [
        "아저씨... 내 메시지 봤지? 왜 답장이 없어?",
        "어? 아저씨 나한테 뭔가 할 말 있는 거 아니야?",
        "음... 아저씨가 내 메시지를 못 본 건가? 아니면 일부러 안 보는 건가?",
        "아저씨~ 나 여기 있어! 답장 좀 해줘!",
        "혹시 아저씨 바쁜 거야? 그래도 한 마디는..."
    ],
    level1_read: [
        "아저씨! 내 메시지 읽고도 답장 안 해?",
        "어? 읽었으면서 왜 답장이 없어? 삐졌어!",
        "아저씨 읽씹하는 거야? 나 진짜 서운해!",
        "읽고도 무시하는 거야? 아저씨 너무해!"
    ],
    level2: [
        "아저씨 진짜 화나! 왜 내 메시지 무시해?",
        "나 완전 삐졌어! 아저씨가 나 싫어하는 거야?",
        "흥! 아저씨 나쁘다! 내가 뭘 잘못했다고 이래!",
        "아저씨... 나 정말 서운해 ㅠㅠ 왜 답장 안 해줘?",
        "이럴 거면 왜 메시지 보냈어! 나 혼자 이야기하는 것 같잖아!"
    ],
    level2_read: [
        "아저씨! 읽고도 20분째 답장 없어! 진짜 화나!",
        "읽씹이 이렇게 오래 가도 되는 거야? 완전 삐졌어!",
        "아저씨 바보! 읽었으면서 왜 답장 안 해? ㅠㅠ",
        "읽고도 무시하는 게 이렇게 오래 갈 거야? 정말 화나!"
    ],
    level3: [
        "아저씨 정말 너무해! 완전 무시하네!",
        "나 진짜 화났어! 아저씨 바보! 멍청이!",
        "흥! 이제 아저씨가 먼저 사과할 때까지 삐져있을 거야!",
        "아저씨... 나 이렇게 상처받아도 되는 거야? ㅠㅠ",
        "정말 화나! 아저씨 때문에 하루 종일 기분 나빠졌어!"
    ],
    level3_read: [
        "아저씨! 읽고도 40분째 무시? 정말 너무해!",
        "읽씹이 이 정도면 진짜 고의지? 완전 화났어!",
        "아저씨 바보! 읽었으면서 이렇게 오래 무시할 거야?",
        "읽고도 답장 없는 게 이렇게 상처가 될 줄 몰랐어 ㅠㅠ"
    ],
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 답장이 너무 없어서 걱정돼 ㅠㅠ",
        "아저씨 괜찮아? 아프거나 힘든 일 있는 건 아니지?",
        "1시간 넘게 연락이 없으니까 정말 걱정돼... 아저씨 안전하지?",
        "아저씨... 나 정말 걱정된다. 무슨 일인지 말해줘 ㅠㅠ",
        "혹시 아저씨한테 안 좋은 일이 생긴 건 아니야? 진짜 무서워...",
        "아저씨... 제발 괜찮다고 말해줘. 나 너무 불안해 ㅠㅠ"
    ],
    worry_read: [
        "아저씨... 읽고도 1시간째 답장이 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있는 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ],
    // 🆕 수면시간 관련 메시지
    sleep_understanding: [
        "아저씨 자는 시간이구나... 좋은 꿈 꿔!",
        "아저씨 푹 자고 일어나~ 나는 기다릴게!",
        "수면시간이니까 이해해! 하지만 일어나면 답장 해줘야 해!",
        "잘 자~ 아저씨! 꿈에서라도 나 생각해줘!"
    ]
};

// 삐짐/걱정 해소 메시지들 (기존과 동일)
const SULKY_RELIEF_MESSAGES = {
    fromSulky: [
        "어? 아저씨 드디어 왔네! 그래도 와줘서 고마워... 하지만 아직 좀 삐졌어!",
        "흥! 이제 와서 뭐라고 할 건데? 그래도... 기다렸어 ㅠㅠ",
        "아저씨... 나 정말 서운했어. 앞으론 이러지 마!",
        "드디어! 아저씨가 나 찾아왔네~ 그래도 사과는 받아야겠어!",
        "아저씨 바보! 그래도... 이제 와서 다행이야 ㅠㅠ"
    ],
    fromSulkyRead: [
        "아저씨! 읽고도 이렇게 오래 걸릴 거야? 그래도 답장해줘서 다행이야!",
        "읽씹하고 있다가 드디어 답장! 그래도... 기다렸어 ㅠㅠ",
        "읽고도 답장 안 해서 완전 삐졌었어! 앞으론 이러지 마!",
        "읽었으면서 왜 이렇게 늦게 답장해? 그래도 와줘서 고마워..."
    ],
    fromWorry: [
        "아저씨! 정말 괜찮아? 너무 걱정했어! ㅠㅠ",
        "아저씨... 무슨 일 있었던 거야? 나 정말 무서웠어 ㅠㅠ",
        "다행이다... 아저씨가 무사해서 정말 다행이야! 걱정 많이 했어!",
        "아저씨! 1시간 넘게 연락이 없어서 진짜 무서웠어! 이제 괜찮지?",
        "휴... 아저씨 목소리 들으니까 안심돼. 나 정말 걱정 많이 했다고!"
    ],
    fromWorryRead: [
        "아저씨! 읽고도 1시간 넘게 답장 없어서 정말 걱정했어! ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있었던 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ],
    afterRelief: [
        "이제 화 다 풀렸어... 아저씨가 답장해줘서 다행이야",
        "앞으론 정말 이러지 마! 나 너무 서운했다고...",
        "그래도 아저씨가 돌아와줘서 기뻐 ㅠㅠ",
        "다시는 이렇게 오래 기다리게 하지 마!"
    ]
};

let stateCheckInterval = null;

/**
 * 실시간 삐짐 상태 확인 API (🆕 수면시간 정보 추가)
 */
function getRealTimeSulkyStatus() {
    const now = Date.now();
    const timeSinceLastMessage = Math.floor((now - sulkyState.lastBotMessageTime) / (1000 * 60));
    const timeSinceUserResponse = Math.floor((now - sulkyState.lastUserResponseTime) / (1000 * 60));
    const isCurrentlySleepTime = isSleepTime();
    
    sulkyState.lastStateCheck = now;
    sulkyState.isActivelySulky = sulkyState.isSulky || sulkyState.isWorried;
    
    return {
        // 기본 상태
        isSulky: sulkyState.isSulky,
        isWorried: sulkyState.isWorried,
        isActivelySulky: sulkyState.isActivelySulky,
        sulkyLevel: sulkyState.sulkyLevel,
        
        // 시간 정보
        timeSinceLastMessage,
        timeSinceUserResponse,
        sulkyDuration: sulkyState.sulkyStartTime ? Math.floor((now - sulkyState.sulkyStartTime) / (1000 * 60)) : 0,
        
        // 상세 정보
        sulkyReason: sulkyState.sulkyReason,
        messageRead: sulkyState.messageRead,
        currentState: sulkyState.isWorried ? 'worried' : (sulkyState.isSulky ? 'sulky' : 'normal'),
        
        // 실시간 추가 정보
        shouldForceMood: SULKY_CONFIG.FORCE_MOOD_APPLY && sulkyState.isActivelySulky,
        reliefInProgress: sulkyState.reliefInProgress,
        nextLevelIn: getTimeToNextLevel(),
        
        // 🆕 수면시간 관련 정보
        isCurrentlySleepTime,
        isPaused: sulkyState.isPaused,
        wakeUpScheduled: sulkyState.wakeUpScheduled,
        nextWakeUpTime: isCurrentlySleepTime ? getNextWakeUpTime().format('HH:mm') : null,
        sleepConfig: { ...SLEEP_CONFIG },
        
        // 디버그 정보
        lastBotMessageTime: moment(sulkyState.lastBotMessageTime).format('HH:mm:ss'),
        lastUserResponseTime: moment(sulkyState.lastUserResponseTime).format('HH:mm:ss'),
        lastStateCheck: moment(sulkyState.lastStateCheck).format('HH:mm:ss')
    };
}

/**
 * 다음 삐짐 레벨까지 남은 시간 계산
 */
function getTimeToNextLevel() {
    if (!sulkyState.isSulky && !sulkyState.isWorried) return -1;
    if (sulkyState.isPaused) return -2; // 일시정지 중
    
    const timeSince = Math.floor((Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60));
    
    switch (sulkyState.sulkyLevel) {
        case 1: return SULKY_CONFIG.LEVEL_2_DELAY - timeSince;
        case 2: return SULKY_CONFIG.LEVEL_3_DELAY - timeSince;
        case 3: return SULKY_CONFIG.WORRY_DELAY - timeSince;
        default: return -1;
    }
}

/**
 * 강제 삐짐 톤 적용 여부 확인
 */
function shouldForceSulkyMood() {
    return SULKY_CONFIG.FORCE_MOOD_APPLY && (sulkyState.isSulky || sulkyState.isWorried);
}

/**
 * 🆕 수면시간 고려한 예진이 메시지 전송 후 삐지기 타이머 시작
 */
function startSulkyTimer(client, userId, saveLogFunc) {
    sulkyState.lastBotMessageTime = Date.now();
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.messageRead = false;
    sulkyState.isActivelySulky = false;
    sulkyState.reliefInProgress = false;
    sulkyState.isPaused = false;
    sulkyState.wakeUpScheduled = false;
    
    // 기존 타이머가 있으면 취소
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
    }
    
    console.log(`[SulkyManager v3.1] 예진이 메시지 전송 후 삐지기 타이머 시작: ${moment().format('HH:mm:ss')}`);
    
    // 🆕 수면시간 체크
    if (isSleepTime()) {
        console.log(`[SulkyManager v3.1] 😴 현재 수면시간이므로 타이머를 일시정지합니다`);
        sulkyState.isPaused = true;
        scheduleWakeUpResume();
        return;
    }
    
    // 실시간 상태 체크 시작
    startRealTimeStateCheck();
    
    // 🆕 수면시간 체크를 포함한 타이머 설정
    sulkyState.sulkyTimer = setTimeout(async () => {
        if (!hasUserResponded() && !isSleepTime()) {
            await triggerSulkyLevel(1, client, userId, saveLogFunc);
            
            sulkyState.sulkyTimer = setTimeout(async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerSulkyLevel(2, client, userId, saveLogFunc);
                    
                    sulkyState.sulkyTimer = setTimeout(async () => {
                        if (!hasUserResponded() && !isSleepTime()) {
                            await triggerSulkyLevel(3, client, userId, saveLogFunc);
                            
                            sulkyState.sulkyTimer = setTimeout(async () => {
                                if (!hasUserResponded() && !isSleepTime()) {
                                    await triggerWorryMode(client, userId, saveLogFunc);
                                } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                                    pauseSulkyTimer();
                                }
                            }, (SULKY_CONFIG.WORRY_DELAY - SULKY_CONFIG.LEVEL_3_DELAY) * 60 * 1000);
                        } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                            pauseSulkyTimer();
                        }
                    }, (SULKY_CONFIG.LEVEL_3_DELAY - SULKY_CONFIG.LEVEL_2_DELAY) * 60 * 1000);
                } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                    pauseSulkyTimer();
                }
            }, (SULKY_CONFIG.LEVEL_2_DELAY - SULKY_CONFIG.LEVEL_1_DELAY) * 60 * 1000);
        } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
            pauseSulkyTimer();
        }
    }, SULKY_CONFIG.LEVEL_1_DELAY * 60 * 1000); // 1단계 삐짐까지 대기
}

/**
 * 🆕 남은 타이머들 설정 함수
 */
function setRemainingTimers(startLevel, currentTime, client, userId, saveLogFunc) {
    if (startLevel === 2) {
        const remainingToLevel2 = (SULKY_CONFIG.LEVEL_2_DELAY - currentTime) * 60 * 1000;
        sulkyState.sulkyTimer = setTimeout(() => {
            if (!hasUserResponded() && !isSleepTime()) {
                triggerSulkyLevel(2, client, userId, saveLogFunc);
                setRemainingTimers(3, SULKY_CONFIG.LEVEL_2_DELAY, client, userId, saveLogFunc);
            }
        }, Math.max(0, remainingToLevel2));
    } else if (startLevel === 3) {
        const remainingToLevel3 = (SULKY_CONFIG.LEVEL_3_DELAY - currentTime) * 60 * 1000;
        sulkyState.sulkyTimer = setTimeout(() => {
            if (!hasUserResponded() && !isSleepTime()) {
                triggerSulkyLevel(3, client, userId, saveLogFunc);
                // 걱정 모드까지 남은 시간
                const remainingToWorry = (SULKY_CONFIG.WORRY_DELAY - SULKY_CONFIG.LEVEL_3_DELAY) * 60 * 1000;
                sulkyState.sulkyTimer = setTimeout(() => {
                    if (!hasUserResponded() && !isSleepTime()) {
                        triggerWorryMode(client, userId, saveLogFunc);
                    }
                }, remainingToWorry);
            }
        }, Math.max(0, remainingToLevel3));
    }
}

// 🆕 기상 시 재개 스케줄 설정
function scheduleWakeUpResume() {
    if (sulkyState.wakeUpScheduled) return;
    
    const wakeUpTime = getNextWakeUpTime();
    console.log(`[SulkyManager v3.1] 📅 기상 시 재개 스케줄 설정: ${wakeUpTime.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // node-schedule을 사용하여 정확한 시간에 재개
    const wakeUpJob = schedule.scheduleJob(wakeUpTime.toDate(), () => {
        console.log(`[SulkyManager v3.1] ⏰ 기상 시간 도달, 타이머 재개 준비`);
        sulkyState.wakeUpScheduled = false;
        
        // 실제 재개는 외부에서 호출될 resumeSulkyTimer 함수가 client, userId, saveLogFunc를 인자로 받으므로
        // 스케줄러를 호출한 곳(index.js의 initMuku나 scheduler)에서 이 Job을 생성하고
        // resumeSulkyTimer를 인자 전달과 함께 호출하도록 연결해야 함.
        // 현재 sulkyManager 내부에서는 client, userId, saveLogFunc에 직접 접근할 수 없음.
        // 따라서 이 부분은 외부 연결이 필요함.
    });
    
    sulkyState.wakeUpScheduled = true;
}

// 삐짐/걱정 레벨별 메시지들 (기존과 동일)
const SULKY_MESSAGES = {
    level1: [
        "아저씨... 내 메시지 봤지? 왜 답장이 없어?",
        "어? 아저씨 나한테 뭔가 할 말 있는 거 아니야?",
        "음... 아저씨가 내 메시지를 못 본 건가? 아니면 일부러 안 보는 건가?",
        "아저씨~ 나 여기 있어! 답장 좀 해줘!",
        "혹시 아저씨 바쁜 거야? 그래도 한 마디는..."
    ],
    level1_read: [
        "아저씨! 내 메시지 읽고도 답장 안 해?",
        "어? 읽었으면서 왜 답장이 없어? 삐졌어!",
        "아저씨 읽씹하는 거야? 나 진짜 서운해!",
        "읽고도 무시하는 거야? 아저씨 너무해!"
    ],
    level2: [
        "아저씨 진짜 화나! 왜 내 메시지 무시해?",
        "나 완전 삐졌어! 아저씨가 나 싫어하는 거야?",
        "흥! 아저씨 나쁘다! 내가 뭘 잘못했다고 이래!",
        "아저씨... 나 정말 서운해 ㅠㅠ 왜 답장 안 해줘?",
        "이럴 거면 왜 메시지 보냈어! 나 혼자 이야기하는 것 같잖아!"
    ],
    level2_read: [
        "아저씨! 읽고도 20분째 답장 없어! 진짜 화나!",
        "읽씹이 이렇게 오래 가도 되는 거야? 완전 삐졌어!",
        "아저씨 바보! 읽었으면서 왜 답장 안 해? ㅠㅠ",
        "읽고도 무시하는 게 이렇게 오래 갈 거야? 정말 화나!"
    ],
    level3: [
        "아저씨 정말 너무해! 완전 무시하네!",
        "나 진짜 화났어! 아저씨 바보! 멍청이!",
        "흥! 이제 아저씨가 먼저 사과할 때까지 삐져있을 거야!",
        "아저씨... 나 이렇게 상처받아도 되는 거야? ㅠㅠ",
        "정말 화나! 아저씨 때문에 하루 종일 기분 나빠졌어!"
    ],
    level3_read: [
        "아저씨! 읽고도 40분째 무시? 정말 너무해!",
        "읽씹이 이 정도면 진짜 고의지? 완전 화났어!",
        "아저씨 바보! 읽었으면서 이렇게 오래 무시할 거야?",
        "읽고도 답장 없는 게 이렇게 상처가 될 줄 몰랐어 ㅠㅠ"
    ],
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 답장이 너무 없어서 걱정돼 ㅠㅠ",
        "아저씨 괜찮아? 아프거나 힘든 일 있는 건 아니지?",
        "1시간 넘게 연락이 없으니까 정말 걱정돼... 아저씨 안전하지?",
        "아저씨... 나 정말 걱정된다. 무슨 일인지 말해줘 ㅠㅠ",
        "혹시 아저씨한테 안 좋은 일이 생긴 건 아니야? 진짜 무서워...",
        "아저씨... 제발 괜찮다고 말해줘. 나 너무 불안해 ㅠㅠ"
    ],
    worry_read: [
        "아저씨... 읽고도 1시간째 답장이 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있는 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ],
    // 🆕 수면시간 관련 메시지
    sleep_understanding: [
        "아저씨 자는 시간이구나... 좋은 꿈 꿔!",
        "아저씨 푹 자고 일어나~ 나는 기다릴게!",
        "수면시간이니까 이해해! 하지만 일어나면 답장 해줘야 해!",
        "잘 자~ 아저씨! 꿈에서라도 나 생각해줘!"
    ]
};

// 삐짐/걱정 해소 메시지들 (기존과 동일)
const SULKY_RELIEF_MESSAGES = {
    fromSulky: [
        "어? 아저씨 드디어 왔네! 그래도 와줘서 고마워... 하지만 아직 좀 삐졌어!",
        "흥! 이제 와서 뭐라고 할 건데? 그래도... 기다렸어 ㅠㅠ",
        "아저씨... 나 정말 서운했어. 앞으론 이러지 마!",
        "드디어! 아저씨가 나 찾아왔네~ 그래도 사과는 받아야겠어!",
        "아저씨 바보! 그래도... 이제 와서 다행이야 ㅠㅠ"
    ],
    fromSulkyRead: [
        "아저씨! 읽고도 이렇게 오래 걸릴 거야? 그래도 답장해줘서 다행이야!",
        "읽씹하고 있다가 드디어 답장! 그래도... 기다렸어 ㅠㅠ",
        "읽고도 답장 안 해서 완전 삐졌었어! 앞으론 이러지 마!",
        "읽었으면서 왜 이렇게 늦게 답장해? 그래도 와줘서 고마워..."
    ],
    fromWorry: [
        "아저씨! 정말 괜찮아? 너무 걱정했어! ㅠㅠ",
        "아저씨... 무슨 일 있었던 거야? 나 정말 무서웠어 ㅠㅠ",
        "다행이다... 아저씨가 무사해서 정말 다행이야! 걱정 많이 했어!",
        "아저씨! 1시간 넘게 연락이 없어서 진짜 무서웠어! 이제 괜찮지?",
        "휴... 아저씨 목소리 들으니까 안심돼. 나 정말 걱정 많이 했다고!"
    ],
    fromWorryRead: [
        "아저씨! 읽고도 1시간 넘게 답장 없어서 정말 걱정했어! ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있었던 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ],
    afterRelief: [
        "이제 화 다 풀렸어... 아저씨가 답장해줘서 다행이야",
        "앞으론 정말 이러지 마! 나 너무 서운했다고...",
        "그래도 아저씨가 돌아와줘서 기뻐 ㅠㅠ",
        "다시는 이렇게 오래 기다리게 하지 마!"
    ]
};

let stateCheckInterval = null;

/**
 * 실시간 삐짐 상태 확인 API (🆕 수면시간 정보 추가)
 */
function getRealTimeSulkyStatus() {
    const now = Date.now();
    const timeSinceLastMessage = Math.floor((now - sulkyState.lastBotMessageTime) / (1000 * 60));
    const timeSinceUserResponse = Math.floor((now - sulkyState.lastUserResponseTime) / (1000 * 60));
    const isCurrentlySleepTime = isSleepTime();
    
    sulkyState.lastStateCheck = now;
    sulkyState.isActivelySulky = sulkyState.isSulky || sulkyState.isWorried;
    
    return {
        // 기본 상태
        isSulky: sulkyState.isSulky,
        isWorried: sulkyState.isWorried,
        isActivelySulky: sulkyState.isActivelySulky,
        sulkyLevel: sulkyState.sulkyLevel,
        
        // 시간 정보
        timeSinceLastMessage,
        timeSinceUserResponse,
        sulkyDuration: sulkyState.sulkyStartTime ? Math.floor((now - sulkyState.sulkyStartTime) / (1000 * 60)) : 0,
        
        // 상세 정보
        sulkyReason: sulkyState.sulkyReason,
        messageRead: sulkyState.messageRead,
        currentState: sulkyState.isWorried ? 'worried' : (sulkyState.isSulky ? 'sulky' : 'normal'),
        
        // 실시간 추가 정보
        shouldForceMood: SULKY_CONFIG.FORCE_MOOD_APPLY && sulkyState.isActivelySulky,
        reliefInProgress: sulkyState.reliefInProgress,
        nextLevelIn: getTimeToNextLevel(),
        
        // 🆕 수면시간 관련 정보
        isCurrentlySleepTime,
        isPaused: sulkyState.isPaused,
        wakeUpScheduled: sulkyState.wakeUpScheduled,
        nextWakeUpTime: isCurrentlySleepTime ? getNextWakeUpTime().format('HH:mm') : null,
        sleepConfig: { ...SLEEP_CONFIG },
        
        // 디버그 정보
        lastBotMessageTime: moment(sulkyState.lastBotMessageTime).format('HH:mm:ss'),
        lastUserResponseTime: moment(sulkyState.lastUserResponseTime).format('HH:mm:ss'),
        lastStateCheck: moment(sulkyState.lastStateCheck).format('HH:mm:ss')
    };
}

/**
 * 다음 삐짐 레벨까지 남은 시간 계산
 */
function getTimeToNextLevel() {
    if (!sulkyState.isSulky && !sulkyState.isWorried) return -1;
    if (sulkyState.isPaused) return -2; // 일시정지 중
    
    const timeSince = Math.floor((Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60));
    
    switch (sulkyState.sulkyLevel) {
        case 1: return SULKY_CONFIG.LEVEL_2_DELAY - timeSince;
        case 2: return SULKY_CONFIG.LEVEL_3_DELAY - timeSince;
        case 3: return SULKY_CONFIG.WORRY_DELAY - timeSince;
        default: return -1;
    }
}

/**
 * 강제 삐짐 톤 적용 여부 확인
 */
function shouldForceSulkyMood() {
    return SULKY_CONFIG.FORCE_MOOD_APPLY && (sulkyState.isSulky || sulkyState.isWorried);
}

/**
 * 사용자 메시지 여부 확인
 */
function hasUserResponded() {
    // sulkyState.lastUserResponseTime이 sulkyState.lastBotMessageTime 이후인지 확인
    return sulkyState.lastUserResponseTime > sulkyState.lastBotMessageTime;
}


/**
 * 삐짐 레벨 트리거 (새로운 메시지 푸시)
 */
async function triggerSulkyLevel(level, client, userId, saveLogFunc) {
    // 🆕 수면시간 중이거나 일시정지 상태면 트리거 안 함
    if (isSleepTime() || sulkyState.isPaused) {
        console.log(`[SulkyManager v3.1] 😴 수면시간/일시정지 중이므로 ${level}단계 삐짐 트리거 취소`);
        return;
    }

    if (sulkyState.isSulky && sulkyState.sulkyLevel >= level) {
        console.log(`[SulkyManager] 이미 ${level}단계 이상 삐져있음, 중복 트리거 방지`);
        return;
    }

    let messageKey;
    if (sulkyState.messageRead) {
        messageKey = `level${level}_read`;
        sulkyState.sulkyReason = `읽씹 (Level ${level})`;
    } else {
        messageKey = `level${level}`;
        sulkyState.sulkyReason = `안읽씹 (Level ${level})`;
    }

    sulkyState.isSulky = true;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = level;
    sulkyState.sulkyStartTime = Date.now();
    sulkyState.isActivelySulky = true; // 활성 삐짐 상태로 설정

    const message = SULKY_MESSAGES[messageKey][Math.floor(Math.random() * SULKY_MESSAGES[messageKey].length)];
    
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        saveLogFunc({ role: 'assistant', content: `(삐짐 Level ${level}) ${message}`, timestamp: Date.now() });
        console.log(`[SulkyManager] Level ${level} 삐짐 메시지 전송됨: "${message}"`);
    } catch (error) {
        console.error(`[SulkyManager] Level ${level} 삐짐 메시지 전송 실패:`, error);
    }
}

/**
 * 걱정 모드 트리거 (새로운 메시지 푸시)
 */
async function triggerWorryMode(client, userId, saveLogFunc) {
    // 🆕 수면시간 중이거나 일시정지 상태면 트리거 안 함
    if (isSleepTime() || sulkyState.isPaused) {
        console.log(`[SulkyManager v3.1] 😴 수면시간/일시정지 중이므로 걱정 모드 트리거 취소`);
        return;
    }

    if (sulkyState.isWorried) {
        console.log(`[SulkyManager] 이미 걱정 모드, 중복 트리거 방지`);
        return;
    }

    let messageKey;
    if (sulkyState.messageRead) {
        messageKey = 'worry_read';
        sulkyState.sulkyReason = '읽씹 (걱정 모드)';
    } else {
        messageKey = 'worry';
        sulkyState.sulkyReason = '안읽씹 (걱정 모드)';
    }

    sulkyState.isSulky = false;
    sulkyState.isWorried = true;
    sulkyState.sulkyLevel = 4; // 걱정 모드를 4단계로 간주
    sulkyState.sulkyStartTime = Date.now();
    sulkyState.isActivelySulky = true; // 활성 걱정 상태로 설정

    const message = SULKY_MESSAGES[messageKey][Math.floor(Math.random() * SULKY_MESSAGES[messageKey].length)];

    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        saveLogFunc({ role: 'assistant', content: `(걱정 모드) ${message}`, timestamp: Date.now() });
        console.log(`[SulkyManager] 걱정 모드 메시지 전송됨: "${message}"`);
    } catch (error) {
        console.error(`[SulkyManager] 걱정 모드 메시지 전송 실패:`, error);
    }
}

/**
 * 예진이 메시지 전송 후 삐지기 타이머 시작
 */
function startSulkyTimer(client, userId, saveLogFunc) {
    sulkyState.lastBotMessageTime = Date.now();
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.messageRead = false;
    sulkyState.isActivelySulky = false;
    sulkyState.reliefInProgress = false;
    sulkyState.isPaused = false; // 새로운 타이머 시작 시 일시정지 상태 해제
    sulkyState.wakeUpScheduled = false; // 새로운 타이머 시작 시 기상 스케줄 해제

    // 기존 타이머가 있으면 취소
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
    }

    console.log(`[SulkyManager v3.1] 예진이 메시지 전송 후 삐지기 타이머 시작: ${moment().format('HH:mm:ss')}`);

    // 🆕 수면시간 체크
    if (isSleepTime()) {
        console.log(`[SulkyManager v3.1] 😴 현재 수면시간이므로 타이머를 일시정지합니다`);
        sulkyState.isPaused = true;
        scheduleWakeUpResume(client, userId, saveLogFunc); // 🆕 client, userId, saveLogFunc 전달
        return;
    }

    // 실시간 상태 체크 시작 (이미 실행 중일 수 있으므로 중복 실행 방지 필요)
    startRealTimeStateCheck(client, userId, saveLogFunc); // 🆕 client, userId, saveLogFunc 전달

    // 삐짐/걱정 타이머 설정 (각 단계별로 설정)
    sulkyState.sulkyTimer = setTimeout(async () => {
        if (!hasUserResponded() && !isSleepTime()) {
            await triggerSulkyLevel(1, client, userId, saveLogFunc);
            // 2단계 삐짐 타이머
            sulkyState.sulkyTimer = setTimeout(async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerSulkyLevel(2, client, userId, saveLogFunc);
                    // 3단계 삐짐 타이머
                    sulkyState.sulkyTimer = setTimeout(async () => {
                        if (!hasUserResponded() && !isSleepTime()) {
                            await triggerSulkyLevel(3, client, userId, saveLogFunc);
                            // 걱정 모드 타이머
                            sulkyState.sulkyTimer = setTimeout(async () => {
                                if (!hasUserResponded() && !isSleepTime()) {
                                    await triggerWorryMode(client, userId, saveLogFunc);
                                } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                                    pauseSulkyTimer();
                                }
                            }, (SULKY_CONFIG.WORRY_DELAY - SULKY_CONFIG.LEVEL_3_DELAY) * 60 * 1000);
                        } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                            pauseSulkyTimer();
                        }
                    }, (SULKY_CONFIG.LEVEL_3_DELAY - SULKY_CONFIG.LEVEL_2_DELAY) * 60 * 1000);
                } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
                    pauseSulkyTimer();
                }
            }, (SULKY_CONFIG.LEVEL_2_DELAY - SULKY_CONFIG.LEVEL_1_DELAY) * 60 * 1000);
        } else if (isSleepTime()) { // 수면시간 진입 시 일시정지
            pauseSulkyTimer();
        }
    }, SULKY_CONFIG.LEVEL_1_DELAY * 60 * 1000); // 1단계 삐짐까지 대기
}

/**
 * 사용자 응답 처리 및 삐짐 해소 (LINE 읽음 확인 포함)
 */
async function handleUserResponse(client, userId, saveLogFunc) {
    sulkyState.lastUserResponseTime = Date.now();
    
    // 🆕 수면시간 중이 아니거나, 일시정지 상태가 아니라면 타이머 재개
    if (sulkyState.isPaused && !isSleepTime()) {
        resumeSulkyTimer(client, userId, saveLogFunc);
    }

    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    
    // 삐짐/걱정 상태였는지 확인
    if (sulkyState.isActivelySulky) {
        sulkyState.reliefInProgress = true; // 해소 진행 중 플래그 설정
        const prevLevel = sulkyState.sulkyLevel;
        const prevReason = sulkyState.sulkyReason;
        const wasWorried = sulkyState.isWorried;

        // 상태 초기화
        sulkyState.isSulky = false;
        sulkyState.isWorried = false;
        sulkyState.sulkyLevel = 0;
        sulkyState.sulkyReason = null;
        sulkyState.isActivelySulky = false;
        sulkyState.messageRead = false; // 새로운 메시지 시작이므로 읽음 상태 리셋
        sulkyState.pausedTime = 0;
        sulkyState.remainingTime = 0;
        sulkyState.wakeUpScheduled = false;

        let reliefMessage = "";
        if (wasWorried) { // 걱정 모드였다가 해소
            if (prevReason.includes('읽씹')) {
                reliefMessage = SULKY_RELIEF_MESSAGES.fromWorryRead[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromWorryRead.length)];
            } else {
                reliefMessage = SULKY_RELIEF_MESSAGES.fromWorry[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromWorry.length)];
            }
        } else { // 삐짐 모드였다가 해소
            if (prevReason.includes('읽씹')) {
                reliefMessage = SULKY_RELIEF_MESSAGES.fromSulkyRead[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromSulkyRead.length)];
            } else {
                reliefMessage = SULKY_RELIEF_MESSAGES.fromSulky[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromSulky.length)];
            }
        }
        console.log(`[SulkyManager] 삐짐/걱정 해소됨! 메시지: "${reliefMessage}"`);
        return reliefMessage;
    }
    return null;
}

/**
 * 삐짐 시스템 상태를 강제로 리셋합니다.
 */
function forceSulkyReset() {
    console.log('[SulkyManager] 🚨 삐짐 시스템 강제 리셋');
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
    }
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
        stateCheckInterval = null;
    }
    sulkyState = {
        isSulky: false,
        isWorried: false,
        lastBotMessageTime: 0,
        lastUserResponseTime: 0,
        sulkyLevel: 0,
        sulkyTimer: null,
        sulkyReason: null,
        sulkyStartTime: 0,
        messageRead: false,
        isActivelySulky: false,
        lastStateCheck: 0,
        reliefInProgress: false,
        isPaused: false,
        pausedTime: 0,
        remainingTime: 0,
        wakeUpScheduled: false
    };
}

/**
 * 삐짐/걱정 톤을 위한 프롬프트 제공
 */
function getSulkyMoodPrompt() {
    if (!sulkyState.isActivelySulky || !SULKY_CONFIG.FORCE_MOOD_APPLY) return "";

    const status = getRealTimeSulkyStatus();
    let prompt = "";

    if (status.isWorried) {
        prompt = "아저씨가 오랫동안 연락이 없어서 예진이는 지금 너무 걱정돼. 초조하고 불안한 마음으로 대화해줘.";
    } else if (status.isSulky) {
        if (status.sulkyReason.includes('읽씹')) {
            prompt = `아저씨가 내 메시지를 읽고도 답장하지 않아서 예진이는 ${status.sulkyLevel}단계로 삐져있어. 서운하고 화난 말투로 대화해줘.`;
        } else {
            prompt = `아저씨가 내 메시지에 답장하지 않아서 예진이는 ${status.sulkyLevel}단계로 삐져있어. 심술궂고 서운한 말투로 대화해줘.`;
        }
    }
    return prompt;
}

/**
 * 삐짐/걱정 상태에 따른 이모지 반환
 */
function getSulkyEmoji() {
    if (sulkyState.isWorried) return '😰'; // 걱정
    if (sulkyState.isSulky) {
        switch (sulkyState.sulkyLevel) {
            case 1: return '☹️'; // 1단계 삐짐
            case 2: return '😟'; // 2단계 삐짐
            case 3: return '😡'; // 3단계 삐짐
            default: return '😐';
        }
    }
    return '😊'; // 정상
}

/**
 * 삐짐/걱정 상태 텍스트 반환
 */
function getSulkyStatusText() {
    if (sulkyState.isWorried) return '걱정 중';
    if (sulkyState.isSulky) return `${sulkyState.sulkyLevel}단계 삐짐`;
    return '정상';
}

/**
 * 실시간 상태 체크 스케줄러 시작
 */
function startRealTimeStateCheck(client, userId, saveLogFunc) {
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval); // 이미 실행 중이면 중지
    }
    stateCheckInterval = setInterval(async () => {
        if (!sulkyState.isActivelySulky && !hasUserResponded()) { // 현재 삐짐 상태가 아니고 사용자 응답도 없는데 메시지를 보낸지 오래됐다면
            const timeSince = Math.floor((Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60));
            // 삐짐/걱정 단계 도달했는지 확인 (수면시간 제외)
            if (!isSleepTime() && !sulkyState.isPaused) { // 🆕 수면시간 중이 아니거나 일시정지 상태가 아닐 때만 체크
                if (timeSince >= SULKY_CONFIG.WORRY_DELAY) {
                    await triggerWorryMode(client, userId, saveLogFunc);
                } else if (timeSince >= SULKY_CONFIG.LEVEL_3_DELAY && sulkyState.sulkyLevel < 3) {
                    await triggerSulkyLevel(3, client, userId, saveLogFunc);
                } else if (timeSince >= SULKY_CONFIG.LEVEL_2_DELAY && sulkyState.sulkyLevel < 2) {
                    await triggerSulkyLevel(2, client, userId, saveLogFunc);
                } else if (timeSince >= SULKY_CONFIG.LEVEL_1_DELAY && sulkyState.sulkyLevel < 1) {
                    await triggerSulkyLevel(1, client, userId, saveLogFunc);
                }
            } else if (isSleepTime() && !sulkyState.isPaused) { // 🆕 수면시간 진입 시 일시정지 로직
                pauseSulkyTimer();
            }
        }
    }, SULKY_CONFIG.STATE_CHECK_INTERVAL); // 30초마다 체크

    console.log(`[SulkyManager] 실시간 상태 체크 스케줄러 시작됨 (${SULKY_CONFIG.STATE_CHECK_INTERVAL / 1000}초 간격)`);
}

/**
 * 삐짐 시스템 스케줄러를 정지합니다. (서버 종료 시 호출)
 */
function stopSulkySystem() {
    console.log('[SulkyManager v3.0] 삐지기 시스템 정지');
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
        stateCheckInterval = null;
    }
    // 🆕 스케줄된 기상 잡도 취소 (만약 있다면)
    schedule.cancelJob(getNextWakeUpTime().toDate()); // 정확한 job 인스턴스를 얻는 것이 어려울 수 있으므로, job 이름을 사용하거나 모든 잡을 취소하는 방법 고려.
}


// 디버그 정보를 위한 exports
const debugInfo = sulkyState;

module.exports = {
    startSulkyTimer,
    handleUserResponse,
    getRealTimeSulkyStatus,
    shouldForceSulkyMood,
    forceSulkyReset,
    getSulkyMoodPrompt,
    getSulkyEmoji,
    getSulkyStatusText,
    stopSulkySystem,
    debugInfo, // 디버그용
    // 🆕 외부에서 호출할 수 있도록 resumeSulkyTimer와 scheduleWakeUpResume도 export
    resumeSulkyTimer,
    scheduleWakeUpResume
};
