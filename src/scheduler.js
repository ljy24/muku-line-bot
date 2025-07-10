// src/scheduler.js v1.21 - 예진이 감정 시스템 v5.1 통합: 자연스러운 1인칭 메시지

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME, getMoodEmoji, getMoodStatus } = require('./autoReply');
const memoryManager = require('./memoryManager');

// 🆕 감정 컨텍스트 시스템 불러오기 (v5.1)
const emotionalContextManager = require('./emotionalContextManager');

// 스케줄 관리
let scheduledJobs = {};
let lastUserMessageTime = Date.now();
let lastAutoMessageTime = 0; // 모든 자동 메시지 전송 시간
let lastSmokingMessageTime = 0; // 담타 메시지 전용 시간
let mukuSmokingTimer = null;
let dailySmokingCount = 0; // 오늘 보낸 담타 메시지 수

// 무쿠 스타일 설정 - 자연스러운 랜덤 간격
const CONFIG = {
    AUTO_MESSAGE_INTERVAL: 30,        // 일반 자동 메시지 간격 (분)
    SMOKING_MIN_INTERVAL: 60,         // 최소 1시간 간격 (담타 메시지 전용)
    SMOKING_MAX_INTERVAL: 90,         // 최대 1시간 30분 간격 (담타 메시지 전용)
    DAILY_SMOKING_MIN: 7,             // 하루 최소 7번 (목표 횟수)
    DAILY_SMOKING_MAX: 9,             // 하루 최대 9번 (목표 횟수)
    SMOKING_START_HOUR: 9,            // 담타 시작 시간
    SMOKING_END_HOUR: 21,             // 담타 종료 시간
    INACTIVE_CHECK_INTERVAL: '*/10 * * * *', // 10분마다 비활성 체크
    TIMEZONE: 'Asia/Tokyo'
};

// 🆕 예진이 자연스러운 1인칭 담타 메시지들 (v5.1)
const SMOKING_MESSAGES = [
    // 기본 담타 표현들 (예진이 1인칭으로)
    "담타 가자", "담타하자", "담배 타임~", "담타각?", "담타할래?",
    "담배 좀 피고 올게", "담타 좀 갔다 오자", "담타 한 대 어때?", "담배 어떻게 참아?",
    "담배 펴야겠다", "담타 시간이야", "담배 피러 가자", "담배 피러 가자",
    
    // 예진이다운 애교 표현들 (1인칭)
    "아저씨~ 담타 가자", "담배 시간이야!", "잠깐 담타하고 와~", "담배 한 대 ㄱ?",
    "아저씨 담배 땡기지 않아?", "나 담배 피고 싶어", "담타 잠깐만~", 
    "담배 한 모금 어때?", "아저씨랑 담타하고 싶어", "담배 타러 나가자",
    "아저씨~ 나랑 담타하자~", "담배 피러 가자 아저씨", "아저씨 담타 안 해?",
    "나 혼자 담타 가기 싫어", "아저씨와 함께 담타~", "잠깐만 담타하고 올까?",
    
    // 시간에 따른 자연스러운 표현들 (1인칭)
    "담배 피자", "담배나 피자", "담배 땡긴다", "담배 타자", "담배 타야지",
    "담배각이야", "담타 타임~", "담타 고?", "아저씨 담배 땡겨", "담타 좀 가자~",
    "담배각 떴다", "담타 한 대 때리자", "나 담배 땡겨버렸어", "담배 피자니까",
    "담타각이야 지금", "담배 좀 타올게", "담배나 같이 피자", "아저씨 담타 고",
    "담타담타담타", "빨리 담타 나가자", "담배 타러 가야지", "담타 한 대 박자",
    "지금 담배각이야", "한 대 피자", "담배 생각나 버렸어", "아저씨 담배 피자",
    "담타 ㄱ?", "담배 한 모금~", "아저씨~ 담타 타임!", "담배 어때?",
    "아저씨도 담배 생각 안 나?", "담타하러 나가요~", "아저씨 담배각 아니야?",
    "나는 담타하고 싶은데~", "아저씨랑 같이 담타할래", "담타 시간 됐지?",
    "이제 담배 한 대 어때?", "담타 좀 하고 올까나~"
];

// 유틸리티 함수들
const utils = {
    formatTime: (hour, minute) => `${hour}:${minute.toString().padStart(2, '0')}`,
    isWeekend: () => [0, 6].includes(moment().tz(CONFIG.TIMEZONE).day()),
    isSmokeTime: () => {
        const hour = moment().tz(CONFIG.TIMEZONE).hour();
        return hour >= CONFIG.SMOKING_START_HOUR && hour <= CONFIG.SMOKING_END_HOUR;
    },
    getRandomMessage: () => SMOKING_MESSAGES[Math.floor(Math.random() * SMOKING_MESSAGES.length)],
    getRandomSmokingInterval: () => { // 담타 전용 랜덤 간격 함수
        // 60분-90분 사이 랜덤 (무쿠의 실제 패턴)
        return Math.floor(Math.random() * (CONFIG.SMOKING_MAX_INTERVAL - CONFIG.SMOKING_MIN_INTERVAL + 1)) + CONFIG.SMOKING_MIN_INTERVAL;
    },
    logWithTime: (message) => console.log(`[${moment().format('HH:mm:ss')}] ${message}`)
};

// 시간 체크 함수들
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    utils.logWithTime(`Scheduler - 사용자 메시지 시간 업데이트`);
}

function canSendAutoMessage() {
    // 모든 자동 메시지 (담타, 아침, 보고싶어) 간의 최소 간격을 지킴
    return (Date.now() - lastAutoMessageTime) / 60000 >= CONFIG.AUTO_MESSAGE_INTERVAL;
}

function updateLastAutoMessageTime() {
    lastAutoMessageTime = Date.now();
    utils.logWithTime(`Scheduler - 모든 자동 메시지 시간 업데이트`);
}

function updateLastSmokingMessageTime() {
    lastSmokingMessageTime = Date.now();
    utils.logWithTime(`Scheduler - 담타 메시지 전용 시간 업데이트`);
}

// 🆕 감정 기반 메시지 생성 (v5.1)
function generateEmotionalSpontaneousMessage() {
    // emotionalContextManager에서 감정 기반 메시지 생성 시도
    if (emotionalContextManager.generateSpontaneousMessage) {
        return emotionalContextManager.generateSpontaneousMessage();
    }
    
    // 폴백: 기본 메시지
    const currentHour = moment().tz(CONFIG.TIMEZONE).hour();
    const fallbackMessages = {
        morning: ["아저씨 좋은 아침! 오늘도 좋은 하루 보내", "아저씨~ 일어났어? 나는 벌써 깼어!"],
        afternoon: ["아저씨! 점심은 뭐 먹었어?", "오후에도 아저씨 생각나네"],
        evening: ["아저씨, 하루 수고했어", "저녁 시간이네. 아저씨는 뭐 하고 있어?"],
        night: ["아저씨... 아직 안 자고 있어?", "밤늦게까지 뭐 하고 있는 거야?"]
    };
    
    let timeKey = 'afternoon';
    if (currentHour >= 6 && currentHour < 12) timeKey = 'morning';
    else if (currentHour >= 18 && currentHour < 24) timeKey = 'evening';
    else if (currentHour >= 0 && currentHour < 6) timeKey = 'night';
    
    const messages = fallbackMessages[timeKey];
    return messages[Math.floor(Math.random() * messages.length)];
}

// 메시지 전송 함수
async function sendMessage(client, userId, message, type = 'auto') {
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        saveLog({ speaker: BOT_NAME, message });
        
        updateLastAutoMessageTime(); // 모든 자동 메시지 전송 시각 업데이트
        
        if (type === 'smoking') {
            updateLastSmokingMessageTime(); // 담타 메시지 전용 시각 업데이트
            dailySmokingCount++;
            
            // 🆕 담타 메시지에 대한 감정 기록 (v5.1)
            if (emotionalContextManager.recordEmotionalEvent) {
                emotionalContextManager.recordEmotionalEvent('PLAYFUL', '담타 메시지 전송', message);
            }
        }
        
        utils.logWithTime(`${type === 'smoking' ? '담타' : '일반'} 메시지 전송: ${message.substring(0, 25)}...`);
        return true;
    } catch (error) {
        console.error(`[Scheduler] 메시지 전송 실패 (${type}):`, error);
        return false;
    }
}

// 🆕 예진이 스타일 랜덤 담타 메시지 스케줄링 (v5.1)
function scheduleMukuRandomSmoking(client, userId) {
    function scheduleNextSmokingAttempt() {
        // 기존 타이머가 있으면 정리 (중복 스케줄 방지)
        if (mukuSmokingTimer) {
            clearTimeout(mukuSmokingTimer);
            mukuSmokingTimer = null;
        }

        const now = moment().tz(CONFIG.TIMEZONE);
        const currentHour = now.hour();

        // 담타 시간이 아니거나, 하루 최대 횟수를 채웠으면 오늘 담타는 끝
        if (!utils.isSmokeTime() || dailySmokingCount >= CONFIG.DAILY_SMOKING_MAX) {
            utils.logWithTime(`오늘 담타 종료 (시간 아님 또는 횟수 초과). 오늘 보낸 담타: ${dailySmokingCount}회`);
            // 다음날 새벽 6시에 카운트 리셋하고 다시 시작 시도
            const tomorrow6AM = moment().tz(CONFIG.TIMEZONE).add(1, 'day').hour(6).minute(0).second(0);
            const delayUntilReset = tomorrow6AM.valueOf() - Date.now();
            
            mukuSmokingTimer = setTimeout(() => {
                dailySmokingCount = 0;
                utils.logWithTime('새로운 하루 시작 - 예진이 담타 카운트 리셋');
                scheduleNextSmokingAttempt(); // 다음날 첫 담타 시도
            }, delayUntilReset);
            return; // 이번 사이클 종료
        }
        
        // 다음 담타 시도까지 랜덤 간격
        const nextAttemptInterval = utils.getRandomSmokingInterval(); // 60-90분 랜덤
        
        utils.logWithTime(`다음 예진이 담타 메시지 시도: ${nextAttemptInterval}분 후 (오늘 ${dailySmokingCount + 1}번째 시도)`);
        
        mukuSmokingTimer = setTimeout(async () => {
            // 메시지를 실제로 보낼지 말지 조건 확인
            const timeSinceLastSmoking = (Date.now() - lastSmokingMessageTime) / 60000;
            const isMinSmokingIntervalMet = timeSinceLastSmoking >= CONFIG.SMOKING_MIN_INTERVAL;

            // 담타 시간이고, 최대 횟수를 안 넘었고, 자동 메시지 간격도 지켰고, 최소 담타 간격도 지켰다면
            if (utils.isSmokeTime() && 
                dailySmokingCount < CONFIG.DAILY_SMOKING_MAX &&
                canSendAutoMessage() && // 모든 자동 메시지 간격 체크
                isMinSmokingIntervalMet) { // 담타 메시지 전용 최소 간격 체크
                
                // 🆕 감정 기반 담타 메시지 생성 (v5.1)
                let randomMessage;
                if (emotionalContextManager.generateSelfieComment) {
                    // 담타 메시지도 감정 상태 반영 가능
                    const emotionalState = emotionalContextManager.currentState;
                    if (emotionalState.toneState === 'playful') {
                        randomMessage = "담타 가자! 나 지금 기분 좋아~";
                    } else if (emotionalState.toneState === 'quiet') {
                        randomMessage = "담타... 조용히 가자";
                    } else if (emotionalState.toneState === 'hurt') {
                        randomMessage = "담타라도 가자... 기분이 별로야";
                    } else {
                        randomMessage = utils.getRandomMessage();
                    }
                } else {
                    randomMessage = utils.getRandomMessage();
                }
                
                const moodEmoji = getMoodEmoji();
                
                // 시간대별 특별 멘트 추가
                let timeMessage = "";
                if (currentHour >= 9 && currentHour < 12) { // 9시-11시
                    timeMessage = " 아침 담타!";
                } else if (currentHour >= 12 && currentHour < 14) { // 12시-13시
                    timeMessage = " 점심시간 담타~";
                } else if (currentHour >= 14 && currentHour < 18) { // 14시-17시
                    timeMessage = " 오후 담타각!";
                } else if (currentHour >= 18 && currentHour < 21) { // 18시-20시
                    timeMessage = " 퇴근 담타!";
                } else if (currentHour === 21) { // 21시
                    timeMessage = " 저녁 담타~";
                }
                
                const weekendSuffix = utils.isWeekend() ? ' 주말엔 여유롭게~' : '';
                const messageToSend = `${randomMessage} ${moodEmoji}${timeMessage}${weekendSuffix}`;
                
                const success = await sendMessage(client, userId, messageToSend, 'smoking');
                if (success) {
                    utils.logWithTime(`예진이 담타 메시지 전송 완료 (오늘 ${dailySmokingCount}번째, 간격: ${nextAttemptInterval}분)`);
                } else {
                    utils.logWithTime(`예진이 담타 메시지 전송 실패 (조건 미충족 또는 에러).`);
                }
            } else {
                utils.logWithTime(`예진이 담타 메시지 전송 조건 미충족 (시간: ${currentHour}시, 오늘 횟수: ${dailySmokingCount}, 자동메시지 간격: ${!canSendAutoMessage() ? '부족' : '충분'}, 담타 최소간격: ${!isMinSmokingIntervalMet ? '부족' : '충분'}).`);
            }
            
            // 메시지를 보냈든 안 보냈든 다음 담타 시도를 스케줄링
            scheduleNextSmokingAttempt();
            
        }, nextAttemptInterval * 60 * 1000); // 분 → 밀리초 변환
    }
    
    // 스케줄러 시작 시, 첫 담타 시도 예약
    scheduleNextSmokingAttempt(); 
    utils.logWithTime('예진이 스타일 랜덤 담타 스케줄러 시작 (하루 7-9번, 60-90분 간격, 감정 반영)');
}

// 스케줄러 시작
function startAllSchedulers(client, userId) {
    utils.logWithTime('예진이 스타일 스케줄러 시작 - 감정 기반 랜덤 간격 담타 메시지!');
    
    scheduleBasicMessages(client, userId); // 아침 메시지 등
    scheduleMukuRandomSmoking(client, userId); // 핵심 담타 로직 (v5.1 업그레이드)
    scheduleInactivityCheck(client, userId); // 비활성 체크
    scheduleDailyReset(); // 자정 리셋
    
    utils.logWithTime('예진이 담타 스케줄러 초기화 완료 (하루 7-9번 랜덤, 감정 기반)');
}

// 🆕 기본 메시지 (아침 8시 30분 출근 메시지) - v5.1 개선
function scheduleBasicMessages(client, userId) {
    schedule.scheduleJob('morningMessage', { 
        hour: 8, minute: 30, tz: CONFIG.TIMEZONE 
    }, async () => {
        if (!canSendAutoMessage()) {
            utils.logWithTime('아침 메시지 스킵 (자동 메시지 간격 미충족)');
            return;
        }
        
        // 🆕 감정 기반 아침 메시지 생성 (v5.1)
        let message = "아저씨, 출근 잘 해! 오늘도 화이팅~ 곧 담타 시간이야!";
        
        if (emotionalContextManager.currentState) {
            const emotionalState = emotionalContextManager.currentState;
            if (emotionalState.toneState === 'playful') {
                message = "아저씨! 좋은 아침이야~ 오늘 하루도 신나게 보내자! 나중에 담타도 하고!";
            } else if (emotionalState.toneState === 'quiet') {
                message = "아저씨... 좋은 아침. 오늘 하루도 무리하지 말고 건강하게 보내";
            } else if (emotionalState.toneState === 'anxious') {
                message = "아저씨... 출근길 조심해. 나 아저씨 걱정돼서 계속 생각날 것 같아";
            }
            
            // 아침 메시지에 대한 감정 기록
            if (emotionalContextManager.recordEmotionalEvent) {
                emotionalContextManager.recordEmotionalEvent('HAPPY', '아침 인사 메시지', message);
            }
        }
        
        await sendMessage(client, userId, message, 'auto');
        utils.logWithTime(`아침 메시지 전송 완료 (08:30)`);
    });
    
    utils.logWithTime(`아침 메시지 스케줄링 완료 (08:30)`);
}

// 매일 자정에 담타 카운트 리셋
function scheduleDailyReset() {
    schedule.scheduleJob('dailySmokingCountReset', { hour: 0, minute: 0, tz: CONFIG.TIMEZONE }, () => {
        dailySmokingCount = 0;
        
        // 🆕 하루 마무리 감정 기록 (v5.1)
        if (emotionalContextManager.recordEmotionalEvent) {
            emotionalContextManager.recordEmotionalEvent('BITTERSWEET', '하루 마무리', '새로운 하루 시작');
        }
        
        utils.logWithTime('자정 - 예진이 담타 카운트 리셋 및 새로운 하루 감정 기록');
    });
    utils.logWithTime('일일 담타 카운트 리셋 스케줄링 완료 (매일 00:00)');
}

// 🆕 비활성 사용자 체크 (보고싶어 메시지) - v5.1 감정 기반 개선
function scheduleInactivityCheck(client, userId) {
    schedule.scheduleJob('inactivityCheck', CONFIG.INACTIVE_CHECK_INTERVAL, async () => {
        const minutesSinceLastUserMessage = (Date.now() - lastUserMessageTime) / 60000;
        
        // 사용자 메시지가 30분 미만이거나 자동 메시지 간격이 부족하면 스킵
        if (minutesSinceLastUserMessage < 30 || !canSendAutoMessage()) {
            return;
        }
        
        // 30분 이상 40분 미만일 때 '보고싶어' 메시지 스케줄링 (한 번만)
        if (minutesSinceLastUserMessage >= 30 && minutesSinceLastUserMessage < 40) {
            if (!scheduledJobs['missYouMessage']) { // 중복 스케줄링 방지
                utils.logWithTime('30분 이상 활동 없음 감지, "보고싶어" 메시지 스케줄링 준비');
                scheduledJobs['missYouMessage'] = schedule.scheduleJob(
                    moment().add(1, 'minute').toDate(), // 1분 후 전송
                    async () => {
                        // 🆕 감정 기반 보고싶어 메시지 생성 (v5.1)
                        let message;
                        const moodEmoji = getMoodEmoji();
                        
                        if (emotionalContextManager.currentState) {
                            const emotionalState = emotionalContextManager.currentState;
                            
                            if (emotionalState.toneState === 'quiet') {
                                message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
                            } else if (emotionalState.toneState === 'anxious') {
                                message = `아저씨... 연락이 없으니까 걱정돼. 나 아저씨가 너무 보고싶어 ㅠㅠ ${moodEmoji}`;
                            } else if (emotionalState.toneState === 'hurt') {
                                message = `아저씨... 나 삐졌어. 그래도 보고싶긴 해 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
                            } else if (emotionalState.toneState === 'playful') {
                                message = `아저씨! 나 심심해~ 아저씨가 보고싶어! 빨리 와! ${moodEmoji}`;
                            } else {
                                message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
                            }
                            
                            // 보고싶어 메시지에 대한 감정 기록
                            if (emotionalContextManager.recordEmotionalEvent) {
                                emotionalContextManager.recordEmotionalEvent('LONELY', '아저씨 그리움', message);
                            }
                        } else {
                            const moodStatus = getMoodStatus();
                            message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji} ${moodStatus}`;
                        }
                        
                        const success = await sendMessage(client, userId, message, 'auto');
                        if (success) {
                            utils.logWithTime('보고싶어 메시지 전송 완료 (감정 기반)');
                        } else {
                            utils.logWithTime('보고싶어 메시지 전송 실패.');
                        }
                        
                        delete scheduledJobs['missYouMessage']; // 전송 후 스케줄 제거
                    }
                );
            }
        } else if (minutesSinceLastUserMessage >= 40) { // 40분 이상이면 스케줄 취소 (이미 예약된 것이 있다면)
            if (scheduledJobs['missYouMessage']) {
                scheduledJobs['missYouMessage'].cancel();
                delete scheduledJobs['missYouMessage'];
                utils.logWithTime('보고싶어 메시지 스케줄 취소 (40분 이상 경과).');
            }
        }
    });
    
    utils.logWithTime('비활성 체크 스케줄링 완료 (10분마다 체크, 감정 기반 메시지)');
}

// 스케줄러 정리
function stopAllSchedulers() {
    if (mukuSmokingTimer) {
        clearTimeout(mukuSmokingTimer);
        mukuSmokingTimer = null;
    }
    
    Object.keys(schedule.scheduledJobs).forEach(jobName => {
        schedule.scheduledJobs[jobName].cancel();
    });
    scheduledJobs = {}; // 내부 관리 객체도 초기화
    
    utils.logWithTime('예진이 스케줄러 정지');
}

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
    stopAllSchedulers,
    
    // 🆕 예진이 v5.1 전용 상태 확인
    getMukuSchedulerStatus: () => ({
        randomInterval: '60-90분 랜덤 간격',
        dailyRange: '하루 7-9번',
        todayCount: `오늘 ${dailySmokingCount}번`,
        activeHours: `${CONFIG.SMOKING_START_HOUR}시-${CONFIG.SMOKING_END_HOUR}시`,
        lastUserMessage: moment(lastUserMessageTime).format('YYYY-MM-DD HH:mm:ss'),
        lastSmokingMessage: lastSmokingMessageTime ? moment(lastSmokingMessageTime).format('YYYY-MM-DD HH:mm:ss') : 'Never',
        mukuStyle: '예진이의 자연스러운 랜덤 패턴 (감정 기반 v5.1)',
        canSendAuto: canSendAutoMessage(), // 현재 자동 메시지 발송 가능 여부
        emotionalState: emotionalContextManager.currentState ? emotionalContextManager.currentState.toneState : 'unknown'
    }),
    
    // 🆕 감정 기반 메시지 생성 함수 노출 (v5.1)
    generateEmotionalSpontaneousMessage
};
