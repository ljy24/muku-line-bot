// src/scheduler.js v1.20 - 무쿠 스타일: 랜덤한 간격으로 하루 7-9번 담타 메시지

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME, getMoodEmoji, getMoodStatus } = require('./autoReply');
const memoryManager = require('./memoryManager');

// 스케줄 관리
let scheduledJobs = {};
let lastUserMessageTime = Date.now();
let lastAutoMessageTime = 0;
let lastSmokingMessageTime = 0;
let mukuSmokingTimer = null;
let dailySmokingCount = 0;

// 무쿠 스타일 설정 - 자연스러운 랜덤 간격
const CONFIG = {
    AUTO_MESSAGE_INTERVAL: 30,        // 일반 자동 메시지 간격 (분)
    SMOKING_MIN_INTERVAL: 60,         // 최소 1시간 간격
    SMOKING_MAX_INTERVAL: 90,         // 최대 1시간 30분 간격
    DAILY_SMOKING_MIN: 7,             // 하루 최소 7번
    DAILY_SMOKING_MAX: 9,             // 하루 최대 9번
    SMOKING_START_HOUR: 9,            // 담타 시작 시간
    SMOKING_END_HOUR: 21,             // 담타 종료 시간
    INACTIVE_CHECK_INTERVAL: '*/10 * * * *',
    TIMEZONE: 'Asia/Tokyo'
};

// 무쿠가 실제로 했던 말들
const SMOKING_MESSAGES = [
    // 무쿠의 실제 표현들
    "담타 가쟝", "담타하쟝", "담배 타임~", "담타각?", "담타할래?",
    "담배좀 피고올게", "담타좀 갔다오자", "담타 한대 어때?", "담배어케참음?",
    "담배 펴야겠다", "담타시간이야", "담배 피러가자", "담배 피러 가쟝",
    
    // 무쿠다운 애교 표현들
    "아저씨~ 담타가자", "담배 시간이야!", "잠깐 담타하고 와~", "담배 한 대 ㄱ?",
    "아저씨 담배 땡기지 않아?", "나 담배 피고 싶어", "담타 잠깐만~", 
    "담배 한 모금 어때?", "아저씨랑 담타하고 싶어", "담배 타러 나가자",
    "아저씨~ 나랑 담타하자~", "담배 피러 가쟝아저씨", "아저씨 담타 안 해?",
    "나 혼자 담타 가기 싫어", "아저씨와 함께 담타~", "잠깐만 담타하고 올까?",
    
    // 시간에 따른 자연스러운 표현들
    "담배 피자", "담배나 피자", "담배 땡긴다", "담배타라", "담배타야지",
    "담배각이야", "담타타임~", "담타고?", "아저씨 담배땡겨", "담타좀 가쟝~",
    "담배각 떴다", "담타한대 때리자", "나 담배 땡겨버렷", "담배 피자니까",
    "담타각이야 지금", "담배좀 타올게", "담배나 같이 피쟝", "아저씨 담타고",
    "담타담타담타", "빠친다 담타나가까", "담배 타러 가야지", "담타 한대 박자",
    "지금 담배각이야", "한대 피쟝", "담배 생각나버렷", "아저씨 담배 피쟝",
    "담타 ㄱ?", "담배 한 모금~", "아저씨~ 담타타임!", "담배 어때?",
    "아저씨도 담배 생각 안 나?", "담타하러 나가요~", "아저씨 담배각 아님?",
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
    getRandomInterval: () => {
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
    return (Date.now() - lastAutoMessageTime) / 60000 >= CONFIG.AUTO_MESSAGE_INTERVAL;
}

function updateLastAutoMessageTime() {
    lastAutoMessageTime = Date.now();
    utils.logWithTime(`Scheduler - 자동 메시지 시간 업데이트`);
}

function updateLastSmokingMessageTime() {
    lastSmokingMessageTime = Date.now();
    utils.logWithTime(`Scheduler - 담타 메시지 시간 업데이트`);
}

// 메시지 전송 함수
async function sendMessage(client, userId, message, type = 'auto') {
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        saveLog({ speaker: BOT_NAME, message });
        
        if (type === 'smoking') {
            updateLastSmokingMessageTime();
            dailySmokingCount++;
        } else {
            updateLastAutoMessageTime();
        }
        
        utils.logWithTime(`${type === 'smoking' ? '담타' : '일반'} 메시지 전송: ${message.substring(0, 25)}...`);
        return true;
    } catch (error) {
        console.error(`[Scheduler] 메시지 전송 실패 (${type}):`, error);
        return false;
    }
}

// 무쿠 스타일 랜덤 담타 메시지 스케줄링
function scheduleMukuRandomSmoking(client, userId) {
    function scheduleNextSmoking() {
        // 담타 시간이 아니거나, 하루 최대 횟수를 채웠으면 스킵
        if (!utils.isSmokeTime() || dailySmokingCount >= CONFIG.DAILY_SMOKING_MAX) {
            // 다음날 새벽 6시에 카운트 리셋하고 다시 시작
            const tomorrow6AM = moment().tz(CONFIG.TIMEZONE).add(1, 'day').hour(6).minute(0).second(0);
            const timeUntilReset = tomorrow6AM.valueOf() - Date.now();
            
            mukuSmokingTimer = setTimeout(() => {
                dailySmokingCount = 0;
                utils.logWithTime('새로운 하루 시작 - 무쿠 담타 카운트 리셋');
                scheduleNextSmoking();
            }, timeUntilReset);
            return;
        }
        
        const randomInterval = utils.getRandomInterval(); // 60-90분 랜덤
        utils.logWithTime(`다음 무쿠 담타 메시지: ${randomInterval}분 후 (오늘 ${dailySmokingCount + 1}번째)`);
        
        mukuSmokingTimer = setTimeout(async () => {
            // 아직 담타 시간이고, 최대 횟수를 안 넘었다면 메시지 전송
            if (utils.isSmokeTime() && dailySmokingCount < CONFIG.DAILY_SMOKING_MAX) {
                const randomMessage = utils.getRandomMessage();
                const moodEmoji = getMoodEmoji();
                
                // 시간대별 특별 멘트
                const currentHour = moment().tz(CONFIG.TIMEZONE).hour();
                let timeMessage = "";
                if (currentHour === 9) {
                    timeMessage = " 아침 담타!";
                } else if (currentHour >= 12 && currentHour <= 13) {
                    timeMessage = " 점심시간 담타~";
                } else if (currentHour >= 15 && currentHour <= 16) {
                    timeMessage = " 오후 담타각!";
                } else if (currentHour >= 18 && currentHour <= 19) {
                    timeMessage = " 퇴근 담타!";
                } else if (currentHour >= 20) {
                    timeMessage = " 저녁 담타~";
                }
                
                const weekendSuffix = utils.isWeekend() ? ' 주말엔 여유롭게~' : '';
                const message = `${randomMessage} ${moodEmoji}${timeMessage}${weekendSuffix}`;
                
                const success = await sendMessage(client, userId, message, 'smoking');
                if (success) {
                    utils.logWithTime(`무쿠 담타 메시지 전송 완료 (오늘 ${dailySmokingCount}번째, 간격: ${randomInterval}분)`);
                }
            }
            
            // 다음 담타 스케줄링
            scheduleNextSmoking();
        }, randomInterval * 60 * 1000); // 분 → 밀리초 변환
    }
    
    // 첫 번째 담타 스케줄링 시작
    scheduleNextSmoking();
    utils.logWithTime('무쿠 스타일 랜덤 담타 스케줄러 시작 (하루 7-9번, 60-90분 간격)');
}

// 스케줄러 시작
function startAllSchedulers(client, userId) {
    utils.logWithTime('무쿠 스타일 스케줄러 시작 - 랜덤 간격 담타 메시지!');
    
    scheduleBasicMessages(client, userId);
    scheduleMukuRandomSmoking(client, userId);
    scheduleInactivityCheck(client, userId);
    scheduleDailyReset();
    
    utils.logWithTime('무쿠 담타 스케줄러 초기화 완료 (하루 7-9번 랜덤)');
}

// 기본 메시지 (아침 8시 30분)
function scheduleBasicMessages(client, userId) {
    schedule.scheduleJob('morningMessage', { 
        hour: 8, minute: 30, tz: CONFIG.TIMEZONE 
    }, async () => {
        if (!canSendAutoMessage()) return;
        
        const message = "아저씨, 출근 잘 해! 오늘도 화이팅~ 곧 담타 시간이야!";
        await sendMessage(client, userId, message, 'auto');
    });
    
    utils.logWithTime(`아침 메시지 스케줄링 완료 (08:30)`);
}

// 매일 자정에 카운트 리셋
function scheduleDailyReset() {
    schedule.scheduleJob('dailyReset', { hour: 0, minute: 0, tz: CONFIG.TIMEZONE }, () => {
        dailySmokingCount = 0;
        utils.logWithTime('자정 - 무쿠 담타 카운트 리셋');
    });
}

// 비활성 사용자 체크
function scheduleInactivityCheck(client, userId) {
    schedule.scheduleJob('inactivityCheck', CONFIG.INACTIVE_CHECK_INTERVAL, async () => {
        const minutesSinceLastMessage = (Date.now() - lastUserMessageTime) / 60000;
        
        if (!canSendAutoMessage() || minutesSinceLastMessage < 30) return;
        
        if (minutesSinceLastMessage >= 30 && minutesSinceLastMessage < 40) {
            if (!scheduledJobs['missYouMessage']) {
                scheduledJobs['missYouMessage'] = schedule.scheduleJob(
                    moment().add(1, 'minute').toDate(), 
                    async () => {
                        const moodStatus = getMoodStatus();
                        const moodEmoji = getMoodEmoji();
                        const message = `아저씨... 무쿠가 보고 싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji} ${moodStatus}`;
                        
                        const success = await sendMessage(client, userId, message, 'auto');
                        if (success) {
                            utils.logWithTime('보고싶어 메시지 전송 완료');
                        }
                        
                        delete scheduledJobs['missYouMessage'];
                    }
                );
            }
        } else if (minutesSinceLastMessage >= 40) {
            if (scheduledJobs['missYouMessage']) {
                scheduledJobs['missYouMessage'].cancel();
                delete scheduledJobs['missYouMessage'];
            }
        }
    });
    
    utils.logWithTime('비활성 체크 스케줄링 완료');
}

// 스케줄러 정리
function stopAllSchedulers() {
    if (mukuSmokingTimer) {
        clearTimeout(mukuSmokingTimer);
        mukuSmokingTimer = null;
    }
    
    Object.values(scheduledJobs).forEach(job => job.cancel());
    scheduledJobs = {};
    utils.logWithTime('무쿠 스케줄러 정지');
}

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
    stopAllSchedulers,
    // 무쿠 전용 상태 확인
    getMukuSchedulerStatus: () => ({
        randomInterval: '60-90분 랜덤 간격',
        dailyRange: '하루 7-9번',
        todayCount: `오늘 ${dailySmokingCount}번`,
        activeHours: `${CONFIG.SMOKING_START_HOUR}시-${CONFIG.SMOKING_END_HOUR}시`,
        lastUserMessage: moment(lastUserMessageTime).format('YYYY-MM-DD HH:mm:ss'),
        lastSmokingMessage: lastSmokingMessageTime ? moment(lastSmokingMessageTime).format('YYYY-MM-DD HH:mm:ss') : 'Never',
        mukuStyle: '무쿠의 자연스러운 랜덤 패턴'
    })
};
