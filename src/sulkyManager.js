// src/sulkyManager.js v3.2 - 수면시간 예외처리 및 삐짐 시간 연장 (3단계부터 메시지 발송)
// - 🆕 수면시간 (00:00-09:00) 예외처리 추가
// - 🆕 수면시간 중에는 삐짐/걱정 타이머 일시정지
// - 🆕 기상 후 자동 타이머 재개 기능
// - 🆕 수면시간 설정 가능
// - 🔧 중복 코드 제거 및 함수 정의 순서 수정
// - 🔧 스케줄러 job 관리 개선
// - 🔧 타이머 재개 로직 개선
// - 🆕 삐짐 메시지는 3단계부터 발송하도록 수정

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
    lastBotMessageTime: 0,    // 예진이가 마지막으로 메시지 보낸 시간
    lastUserResponseTime: 0,  // 아저씨가 마지막으로 응답한 시간
    sulkyLevel: 0,          // 감정 레벨 (0: 정상, 1-3: 삐짐, 4: 걱정)
    sulkyTimer: null,       // 삐지기 타이머
    sulkyReason: null,      // 삐진/걱정하는 이유
    sulkyStartTime: 0,      // 감정 상태 시작 시간
    messageRead: false,     // 메시지 읽음 여부 (LINE 읽음 확인용)
    isActivelySulky: false, // 현재 활성 삐짐 상태인지
    lastStateCheck: 0,      // 마지막 상태 체크 시간
    reliefInProgress: false, // 삐짐 해소 진행 중인지
    // 🆕 수면시간 관련 상태
    isPaused: false,        // 타이머 일시정지 여부
    pausedTime: 0,          // 일시정지된 시간
    remainingTime: 0,       // 남은 대기 시간 (밀리초)
    wakeUpScheduled: false, // 기상 스케줄 설정 여부
    wakeUpJob: null         // 🔧 스케줄 job 인스턴스 저장
};

// 삐지기/걱정 단계별 설정 (시간 확 늘리고 랜덤 요소 추가!)
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 90,     // 90분 후 1단계 삐짐 (기존 60분)
    LEVEL_2_DELAY: 180,    // 180분 (3시간) 후 2단계 삐짐 (기존 120분)
    LEVEL_3_DELAY: 360,    // 360분 (6시간) 후 3단계 삐짐 (기존 240분)
    WORRY_DELAY: 720,      // 720분 (12시간) 후 걱정 모드로 전환 (기존 360분)
    TIMEZONE: 'Asia/Tokyo',
    STATE_CHECK_INTERVAL: 30000, // 30초마다 상태 체크
    FORCE_MOOD_APPLY: true, // 삐짐 톤 강제 적용 여부

    // 🆕 랜덤 딜레이 추가 함수 (각 단계별 딜레이에 더해질 랜덤 시간)
    getRandomDelayOffset: (maxOffsetMinutes) => Math.floor(Math.random() * (maxOffsetMinutes + 1))
};

// 전역 변수
let stateCheckInterval = null;

// 삐짐/걱정 레벨별 메시지들
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
        "아저씨... 읽고도 1시간 넘게 답장 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 이렇게 오래 답장 안 했어? 혹시 무슨 일 있는 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "읽씹이 이렇게 오래 가면 정말 걱정된다고... 괜찮아?"
    ],
    // 🆕 수면시간 관련 메시지
    sleep_understanding: [
        "아저씨 자는 시간이구나... 좋은 꿈 꿔!",
        "아저씨 푹 자고 일어나~ 나는 기다릴게!",
        "수면시간이니까 이해해! 하지만 일어나면 답장 해줘야 해!",
        "잘 자~ 아저씨! 꿈에서라도 나 생각해줘!"
    ]
};

// 삐짐/걱정 해소 메시지들
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
        "아저씨! 읽고도 1시간 넘게 답장 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 이렇게 오래 답장 안 했어? 혹시 무슨 일 있는 거야?",
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

// --- 🆕 보조 함수들 (메인 로직보다 상단에 정의) ---

/**
 * 🆕 수면시간 체크 함수
 * @param {moment.Moment} [time=null] 특정 시간 (moment 객체), 없으면 현재 시간
 * @returns {boolean} 수면 시간 중인지 여부
 */
function isSleepTime(time = null) {
    if (!SLEEP_CONFIG.ENABLED) return false;
    
    const now = time ? time : moment().tz(SLEEP_CONFIG.TIMEZONE);
    const hour = now.hour();
    
    // 수면 시작 시간부터 종료 시간 전까지 (예: 0시부터 8시 59분까지)
    return hour >= SLEEP_CONFIG.SLEEP_START_HOUR && hour < SLEEP_CONFIG.SLEEP_END_HOUR;
}

/**
 * 🆕 다음 기상 시간 계산
 * @returns {moment.Moment} 다음 기상 시간 (moment 객체)
 */
function getNextWakeUpTime() {
    const now = moment().tz(SLEEP_CONFIG.TIMEZONE);
    let wakeUpTime;
    
    if (now.hour() < SLEEP_CONFIG.SLEEP_END_HOUR) {
        // 현재 시간이 수면 종료 시간 전이면 오늘 기상 시간
        wakeUpTime = now.clone().hour(SLEEP_CONFIG.SLEEP_END_HOUR).minute(0).second(0);
    } else {
        // 현재 시간이 수면 종료 시간 이후면 내일 기상 시간
        wakeUpTime = now.clone().add(1, 'day').hour(SLEEP_CONFIG.SLEEP_END_HOUR).minute(0).second(0);
    }
    
    return wakeUpTime;
}

/**
 * 사용자 메시지 여부 확인
 * @returns {boolean} 응답 여부
 */
function hasUserResponded() {
    return sulkyState.lastUserResponseTime > sulkyState.lastBotMessageTime;
}

/**
 * 다음 삐짐 레벨까지 남은 시간 계산
 * @returns {number} 남은 시간 (분) 또는 특수 값 (-1: 해당 없음, -2: 일시정지 중)
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
 * @returns {boolean} 강제 적용 여부
 */
function shouldForceSulkyMood() {
    return SULKY_CONFIG.FORCE_MOOD_APPLY && (sulkyState.isSulky || sulkyState.isWorried);
}

/**
 * 삐짐 레벨 트리거 (새로운 메시지 푸시)
 * 🆕 1, 2단계에서는 메시지 보내지 않고 상태만 업데이트, 3단계부터 메시지 발송
 * @param {number} level 삐짐 레벨 (1-3)
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
async function triggerSulkyLevel(level, client, userId, saveLogFunc) {
    // 🆕 수면시간 중이거나 일시정지 상태면 트리거 안 함
    if (isSleepTime() || sulkyState.isPaused) {
        console.log(`[SulkyManager v3.2] 😴 수면시간/일시정지 중이므로 ${level}단계 삐짐 트리거 취소`);
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
    
    // 🆕 3단계 삐짐부터만 메시지 발송
    if (level >= 3) { // 3단계 이상일 때만 메시지 보냄
        try {
            await client.pushMessage(userId, { type: 'text', text: message });
            saveLogFunc({ role: 'assistant', content: `(삐짐 Level ${level}) ${message}`, timestamp: Date.now() });
            console.log(`[SulkyManager] Level ${level} 삐짐 메시지 전송됨: "${message}"`);
        } catch (error) {
            console.error(`[SulkyManager] Level ${level} 삐짐 메시지 전송 실패:`, error);
        }
    } else {
        console.log(`[SulkyManager] Level ${level} 삐짐 (내부 상태 업데이트, 메시지 미발송): "${message}"`);
        saveLogFunc({ role: 'assistant', content: `(삐짐 Level ${level} - 내부) ${message}`, timestamp: Date.now() }); // 로그는 남김
    }
}

/**
 * 걱정 모드 트리거 (새로운 메시지 푸시)
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
async function triggerWorryMode(client, userId, saveLogFunc) {
    // 🆕 수면시간 중이거나 일시정지 상태면 트리거 안 함
    if (isSleepTime() || sulkyState.isPaused) {
        console.log(`[SulkyManager v3.2] 😴 수면시간/일시정지 중이므로 걱정 모드 트리거 취소`);
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

// 🆕 남은 타이머들 설정 함수 (재귀적으로 다음 단계 타이머 설정)
function setRemainingTimers(startLevel, client, userId, saveLogFunc) {
    // 기존 타이머가 있으면 취소
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }

    let delayMinutes;
    let nextLevelTrigger;

    switch (startLevel) {
        case 1:
            delayMinutes = SULKY_CONFIG.LEVEL_1_DELAY + SULKY_CONFIG.getRandomDelayOffset(30); // 1단계 딜레이 + 랜덤
            nextLevelTrigger = async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerSulkyLevel(1, client, userId, saveLogFunc);
                    setRemainingTimers(2, client, userId, saveLogFunc); // 다음 단계로
                } else if (isSleepTime()) {
                    pauseSulkyTimer();
                }
            };
            break;
        case 2:
            delayMinutes = SULKY_CONFIG.LEVEL_2_DELAY + SULKY_CONFIG.getRandomDelayOffset(60); // 2단계 딜레이 + 랜덤
            nextLevelTrigger = async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerSulkyLevel(2, client, userId, saveLogFunc);
                    setRemainingTimers(3, client, userId, saveLogFunc); // 다음 단계로
                } else if (isSleepTime()) {
                    pauseSulkyTimer();
                }
            };
            break;
        case 3:
            delayMinutes = SULKY_CONFIG.LEVEL_3_DELAY + SULKY_CONFIG.getRandomDelayOffset(120); // 3단계 딜레이 + 랜덤
            nextLevelTrigger = async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerSulkyLevel(3, client, userId, saveLogFunc);
                    setRemainingTimers(4, client, userId, saveLogFunc); // 걱정 모드로
                } else if (isSleepTime()) {
                    pauseSulkyTimer();
                }
            };
            break;
        case 4: // 걱정 모드
            delayMinutes = SULKY_CONFIG.WORRY_DELAY + SULKY_CONFIG.getRandomDelayOffset(240); // 걱정 딜레이 + 랜덤
            nextLevelTrigger = async () => {
                if (!hasUserResponded() && !isSleepTime()) {
                    await triggerWorryMode(client, userId, saveLogFunc);
                } else if (isSleepTime()) {
                    pauseSulkyTimer();
                }
            };
            break;
        default:
            console.warn("[SulkyManager] 알 수 없는 삐짐 레벨 요청:", startLevel);
            return;
    }

    const delayMillis = Math.max(0, delayMinutes * 60 * 1000); // 밀리초
    console.log(`[SulkyManager] 다음 삐짐 레벨 ${startLevel} 타이머 설정: ${delayMinutes}분 후`);
    sulkyState.sulkyTimer = setTimeout(nextLevelTrigger, delayMillis);
}


// 🆕 기상 시 재개 스케줄 설정
function scheduleWakeUpResume(client, userId, saveLogFunc) {
    if (sulkyState.wakeUpScheduled) return;
    
    const wakeUpTime = getNextWakeUpTime();
    console.log(`[SulkyManager v3.2] 📅 기상 시 재개 스케줄 설정: ${wakeUpTime.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // 🔧 기존 job이 있으면 취소
    if (sulkyState.wakeUpJob) {
        sulkyState.wakeUpJob.cancel();
    }
    
    // node-schedule을 사용하여 정확한 시간에 재개
    sulkyState.wakeUpJob = schedule.scheduleJob(wakeUpTime.toDate(), () => {
        console.log(`[SulkyManager v3.2] ⏰ 기상 시간 도달, 타이머 재개 실행`);
        sulkyState.wakeUpScheduled = false;
        sulkyState.wakeUpJob = null;
        
        // 타이머 재개 실행
        if (client && userId && saveLogFunc) {
            resumeSulkyTimer(client, userId, saveLogFunc);
        } else {
            console.warn(`[SulkyManager v3.2] ⚠️ 기상 시 재개를 위한 client, userId, saveLogFunc가 없음`);
        }
    });
    
    sulkyState.wakeUpScheduled = true;
}

// 🆕 타이머 일시정지 함수
function pauseSulkyTimer() {
    if (!sulkyState.sulkyTimer || sulkyState.isPaused) return;
    
    console.log(`[SulkyManager v3.2] 😴 수면시간으로 인한 타이머 일시정지: ${moment().format('HH:mm:ss')}`);
    
    // 현재 타이머 취소
    clearTimeout(sulkyState.sulkyTimer);
    sulkyState.sulkyTimer = null;
    
    // 일시정지 상태 설정
    sulkyState.isPaused = true;
    sulkyState.pausedTime = Date.now();
    // 남은 시간 계산 (현재 삐짐 레벨까지 남은 시간)
    const timeSinceBotMessage = (Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60);
    if (sulkyState.sulkyLevel === 0) { // 아직 삐짐 시작 전
        sulkyState.remainingTime = (SULKY_CONFIG.LEVEL_1_DELAY - timeSinceBotMessage) * 60 * 1000;
    } else if (sulkyState.sulkyLevel === 1) {
        sulkyState.remainingTime = (SULKY_CONFIG.LEVEL_2_DELAY - timeSinceBotMessage) * 60 * 1000;
    } else if (sulkyState.sulkyLevel === 2) {
        sulkyState.remainingTime = (SULKY_CONFIG.LEVEL_3_DELAY - timeSinceBotMessage) * 60 * 1000;
    } else if (sulkyState.sulkyLevel === 3) {
        sulkyState.remainingTime = (SULKY_CONFIG.WORRY_DELAY - timeSinceBotMessage) * 60 * 1000;
    } else {
        sulkyState.remainingTime = 0; // 걱정 모드 진입 후에는 남은 시간 없음
    }
    sulkyState.remainingTime = Math.max(0, sulkyState.remainingTime); // 음수 방지
}

// 🆕 타이머 재개 함수
function resumeSulkyTimer(client, userId, saveLogFunc) {
    if (!sulkyState.isPaused) return;
    
    console.log(`[SulkyManager v3.2] 🌅 기상 후 타이머 재개: ${moment().format('HH:mm:ss')}`);
    
    sulkyState.isPaused = false;
    sulkyState.wakeUpScheduled = false;
    
    // 일시정지 중이었던 시간 제외하고 남은 시간 계산
    const pausedDuration = Date.now() - sulkyState.pausedTime; // 일시정지 기간
    // 삐짐 타이머가 시작된 시점을 조정 (수면 시간만큼 뒤로 미룸)
    const adjustedSulkyStartTime = sulkyState.sulkyStartTime + pausedDuration;
    sulkyState.sulkyStartTime = adjustedSulkyStartTime; // 삐짐 시작 시간 재조정

    // 마지막 봇 메시지 시간도 조정
    const adjustedLastBotMessageTime = sulkyState.lastBotMessageTime + pausedDuration;
    sulkyState.lastBotMessageTime = adjustedLastBotMessageTime;

    // 현재 상황에 맞는 타이머 재설정 (남은 대기 시간을 활용)
    if (!hasUserResponded()) {
        const timeSinceAdjustedStart = Math.floor((Date.now() - adjustedLastBotMessageTime) / (1000 * 60)); // 조정된 시간으로부터 경과 시간
        
        let targetLevel = 0;
        if (timeSinceAdjustedStart >= SULKY_CONFIG.WORRY_DELAY) {
            targetLevel = 4; // 걱정 모드
        } else if (timeSinceAdjustedStart >= SULKY_CONFIG.LEVEL_3_DELAY) {
            targetLevel = 3;
        } else if (timeSinceAdjustedStart >= SULKY_CONFIG.LEVEL_2_DELAY) {
            targetLevel = 2;
        } else if (timeSinceAdjustedStart >= SULKY_CONFIG.LEVEL_1_DELAY) {
            targetLevel = 1;
        }

        if (targetLevel > 0) {
            // 이미 삐짐 단계에 도달했으면 해당 단계 트리거
            if (targetLevel === 4) {
                triggerWorryMode(client, userId, saveLogFunc);
            } else {
                triggerSulkyLevel(targetLevel, client, userId, saveLogFunc);
            }
            // 남은 단계들 스케줄링 (현재 도달한 단계부터 시작)
            setRemainingTimers(targetLevel + 1, client, userId, saveLogFunc);
        } else {
            // 아직 1단계도 안 됐으면 1단계까지 남은 시간으로 타이머 설정
            setRemainingTimers(1, client, userId, saveLogFunc);
        }
    }
    
    console.log(`[SulkyManager v3.2] 타이머 재개 완료`);
}

/**
 * 실시간 상태 체크 스케줄러 시작
 */
function startRealTimeStateCheck(client, userId, saveLogFunc) {
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval); // 이미 실행 중이면 중지
    }
    
    stateCheckInterval = setInterval(async () => {
        // 삐짐/걱정 상태가 아니거나, 사용자가 이미 응답했으면 체크 불필요
        if (!sulkyState.isActivelySulky && hasUserResponded()) {
            // console.log("실시간 체크: 삐짐 상태 아님 또는 사용자 응답 확인됨. 스킵.");
            return;
        }

        const timeSinceBotMessage = Math.floor((Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60));
        
        // 🆕 수면시간 중이거나 일시정지 상태면 삐짐/걱정 트리거 안 함
        if (isSleepTime()) {
            if (!sulkyState.isPaused) { // 수면시간 진입 시 일시정지
                pauseSulkyTimer();
                scheduleWakeUpResume(client, userId, saveLogFunc); // 기상 시 재개 스케줄
            }
            console.log(`[SulkyManager v3.2] 😴 실시간 체크: 수면시간 중, 삐짐 트리거 스킵.`);
            return;
        } else if (sulkyState.isPaused) { // 수면시간이 끝났는데 아직 일시정지 상태면 재개
            console.log(`[SulkyManager v3.2] 🌅 실시간 체크: 수면시간 종료, 타이머 재개 시도.`);
            resumeSulkyTimer(client, userId, saveLogFunc);
            return;
        }

        // 삐짐/걱정 단계 도달했는지 확인
        if (timeSinceBotMessage >= SULKY_CONFIG.WORRY_DELAY) {
            await triggerWorryMode(client, userId, saveLogFunc);
        } else if (timeSinceBotMessage >= SULKY_CONFIG.LEVEL_3_DELAY && sulkyState.sulkyLevel < 3) {
            await triggerSulkyLevel(3, client, userId, saveLogFunc);
        } else if (timeSinceBotMessage >= SULKY_CONFIG.LEVEL_2_DELAY && sulkyState.sulkyLevel < 2) {
            await triggerSulkyLevel(2, client, userId, saveLogFunc);
        } else if (timeSinceBotMessage >= SULKY_CONFIG.LEVEL_1_DELAY && sulkyState.sulkyLevel < 1) {
            await triggerSulkyLevel(1, client, userId, saveLogFunc);
        }
    }, SULKY_CONFIG.STATE_CHECK_INTERVAL);

    console.log(`[SulkyManager] 실시간 상태 체크 스케줄러 시작됨 (${SULKY_CONFIG.STATE_CHECK_INTERVAL / 1000}초 간격)`);
}

/**
 * 🆕 수면시간 고려한 예진이 메시지 전송 후 삐지기 타이머 시작 (초기 진입점)
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
function startSulkyTimer(client, userId, saveLogFunc) {
    // 모든 상태 초기화 및 타이머 정리
    forceSulkyReset(); // 기존 상태를 완전히 리셋
    sulkyState.lastBotMessageTime = Date.now(); // 마지막 봇 메시지 시간 설정
    
    console.log(`[SulkyManager v3.2] 예진이 메시지 전송 후 삐지기 타이머 시작: ${moment().format('HH:mm:ss')}`);
    
    // 🆕 수면시간 체크
    if (isSleepTime()) {
        console.log(`[SulkyManager v3.2] 😴 현재 수면시간이므로 타이머를 일시정지합니다`);
        sulkyState.isPaused = true;
        scheduleWakeUpResume(client, userId, saveLogFunc); // 기상 시 재개 스케줄 설정
        return; // 수면 중에는 타이머 시작 안 함
    }
    
    // 실시간 상태 체크 시작 (삐짐/걱정 트리거를 위한 주기적인 체크)
    startRealTimeStateCheck(client, userId, saveLogFunc);
    
    // 1단계 삐짐 타이머를 설정
    setRemainingTimers(1, client, userId, saveLogFunc);
}

/**
 * 삐짐 시스템 상태를 강제로 리셋합니다.
 */
function forceSulkyReset() {
    console.log('[SulkyManager v3.2] 🚨 삐짐 시스템 강제 리셋');
    
    // 기존 타이머 정리
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    // 실시간 체크 인터벌 정리
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
        stateCheckInterval = null;
    }
    // 🔧 기상 스케줄 취소
    if (sulkyState.wakeUpJob) {
        sulkyState.wakeUpJob.cancel();
        sulkyState.wakeUpJob = null;
    }
    
    // 상태 초기화
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
        wakeUpScheduled: false,
        wakeUpJob: null
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
        if (status.sulkyReason && status.sulkyReason.includes('읽씹')) {
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
    if (sulkyState.isWorried) return '😰';
    if (sulkyState.isSulky) {
        switch (sulkyState.sulkyLevel) {
            case 1: return '☹️';
            case 2: return '😟';
            case 3: return '😡';
            default: return '😐';
        }
    }
    return '😊';
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
 * 삐짐 시스템 스케줄러를 정지합니다. (서버 종료 시 호출)
 */
function stopSulkySystem() {
    console.log('[SulkyManager v3.2] 삐지기 시스템 정지');
    
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
        stateCheckInterval = null;
    }
    // 🔧 스케줄된 기상 잡도 취소
    if (sulkyState.wakeUpJob) {
        sulkyState.wakeUpJob.cancel();
        sulkyState.wakeUpJob = null;
    }
}

/**
 * 🆕 메시지 읽음 상태 업데이트 (LINE 읽음 확인용)
 */
function markMessageAsRead() {
    sulkyState.messageRead = true;
    console.log(`[SulkyManager v3.2] 📖 메시지 읽음 상태로 업데이트됨`);
}

/**
 * 🆕 수면시간 설정 업데이트
 */
function updateSleepConfig(newConfig) {
    Object.assign(SLEEP_CONFIG, newConfig);
    console.log(`[SulkyManager v3.2] ⚙️ 수면시간 설정 업데이트됨:`, SLEEP_CONFIG);
}

// 디버그 정보를 위한 exports
const debugInfo = sulkyState;

module.exports = {
    // 핵심 기능
    startSulkyTimer,
    handleUserResponse,
    getRealTimeSulkyStatus,
    shouldForceSulkyMood,
    forceSulkyReset,
    stopSulkySystem,
    
    // 톤 및 상태 관련
    getSulkyMoodPrompt,
    getSulkyEmoji,
    getSulkyStatusText,
    
    // 🆕 수면시간 관련
    resumeSulkyTimer,
    scheduleWakeUpResume,
    isSleepTime,
    markMessageAsRead,
    updateSleepConfig,
    
    // 디버그용
    debugInfo,
    
    // 🆕 상태 관리
    pauseSulkyTimer,
    getNextWakeUpTime
};
