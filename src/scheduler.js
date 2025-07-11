// ✅ scheduler.js v2.0 - 통합 지능 엔진 완전 연동
// - [통합] emotionalContextManager 대신 ultimateConversationContext 를 사용하도록 변경
// - [통합] 봇의 감정 상태를 conversationContext 에서 직접 읽어와 메시지 내용 결정
// - [통합] 봇의 스케줄된 행동(메시지 전송, 리셋)을 conversationContext에 기록하여 대화 맥락에 포함

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, BOT_NAME } = require('./autoReply'); // autoReply에서는 기본 유틸만 사용

// [통합] 새로운 중앙 두뇌(Context)를 불러옵니다.
const conversationContext = require('./ultimateConversationContext.js');

// [통합] 담타 메시지 생성을 위해 damta 모듈을 계속 사용합니다.
const { getEmotionalDamtaMessage } = require('./damta');

// [통합] 기분 이모지 등은 moodManager에서 가져옵니다.
const { getMoodEmoji } = require('./moodManager');

// 스케줄 관리
let scheduledJobs = {};
// lastUserMessageTime은 이제 conversationContext에서 직접 읽어옵니다.
let lastAutoMessageTime = 0;
let lastSmokingMessageTime = 0;
let mukuSmokingTimer = null;
let dailySmokingCount = 0;

// 설정 (기존과 동일)
const CONFIG = {
    AUTO_MESSAGE_INTERVAL: 30,
    SMOKING_MIN_INTERVAL: 60,
    SMOKING_MAX_INTERVAL: 90,
    DAILY_SMOKING_MIN: 7,
    DAILY_SMOKING_MAX: 9,
    SMOKING_START_HOUR: 9,
    SMOKING_END_HOUR: 21,
    INACTIVE_CHECK_INTERVAL: '*/10 * * * *',
    TIMEZONE: 'Asia/Tokyo'
};

// 유틸리티 함수
const utils = {
    isSmokeTime: () => {
        const hour = moment().tz(CONFIG.TIMEZONE).hour();
        return hour >= CONFIG.SMOKING_START_HOUR && hour <= CONFIG.SMOKING_END_HOUR;
    },
    getRandomSmokingInterval: () => {
        return Math.floor(Math.random() * (CONFIG.SMOKING_MAX_INTERVAL - CONFIG.SMOKING_MIN_INTERVAL + 1)) + CONFIG.SMOKING_MIN_INTERVAL;
    },
    logWithTime: (message) => console.log(`[Scheduler: ${moment().format('HH:mm:ss')}] ${message}`)
};

// 시간 체크 함수
function canSendAutoMessage() {
    return (Date.now() - lastAutoMessageTime) / 60000 >= CONFIG.AUTO_MESSAGE_INTERVAL;
}

// 메시지 전송 함수
async function sendMessage(client, userId, message, type = 'auto') {
    try {
        await client.pushMessage(userId, { type: 'text', text: message });

        // [통합] 봇의 행동을 중앙 대화 기록에 추가합니다.
        const logMessage = `(${type === 'smoking' ? '담타' : '자동'} 메시지) ${message}`;
        conversationContext.addUltimateMessage(BOT_NAME, logMessage);

        lastAutoMessageTime = Date.now();

        if (type === 'smoking') {
            lastSmokingMessageTime = Date.now();
            dailySmokingCount++;
        }

        utils.logWithTime(`${type === 'smoking' ? '담타' : '일반'} 메시지 전송: ${message.substring(0, 25)}...`);
        return true;
    } catch (error) {
        console.error(`[Scheduler] 메시지 전송 실패 (${type}):`, error);
        return false;
    }
}

// 예진이 스타일 랜덤 담타 메시지 스케줄링
function scheduleMukuRandomSmoking(client, userId) {
    function scheduleNextSmokingAttempt() {
        if (mukuSmokingTimer) clearTimeout(mukuSmokingTimer);

        // 담타 시간이 아니거나, 하루 최대 횟수를 채웠으면 종료
        if (!utils.isSmokeTime() || dailySmokingCount >= CONFIG.DAILY_SMOKING_MAX) {
            utils.logWithTime(`오늘 담타 종료. 보낸 횟수: ${dailySmokingCount}회`);
            const tomorrow6AM = moment().tz(CONFIG.TIMEZONE).add(1, 'day').hour(6).minute(0).second(0);
            const delayUntilReset = tomorrow6AM.valueOf() - Date.now();

            mukuSmokingTimer = setTimeout(() => {
                dailySmokingCount = 0;
                utils.logWithTime('새로운 하루 시작 - 담타 카운트 리셋');
                scheduleNextSmokingAttempt();
            }, delayUntilReset);
            return;
        }

        const nextAttemptInterval = utils.getRandomSmokingInterval();
        utils.logWithTime(`다음 담타 메시지 시도: ${nextAttemptInterval}분 후`);

        mukuSmokingTimer = setTimeout(async () => {
            const timeSinceLastSmoking = (Date.now() - lastSmokingMessageTime) / 60000;
            const isMinSmokingIntervalMet = timeSinceLastSmoking >= CONFIG.SMOKING_MIN_INTERVAL;

            if (utils.isSmokeTime() && dailySmokingCount < CONFIG.DAILY_SMOKING_MAX && canSendAutoMessage() && isMinSmokingIntervalMet) {
                // [통합] conversationContext에서 현재 감정 상태를 직접 가져옵니다.
                const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
                const randomMessage = getEmotionalDamtaMessage(emotionalState);

                await sendMessage(client, userId, randomMessage, 'smoking');
            }

            scheduleNextSmokingAttempt();

        }, nextAttemptInterval * 60 * 1000);
    }

    scheduleNextSmokingAttempt();
    utils.logWithTime('랜덤 담타 스케줄러 시작 (통합 엔진 연동)');
}

// 스케줄러 시작 함수
function startAllSchedulers(client, userId) {
    scheduleBasicMessages(client, userId);
    scheduleMukuRandomSmoking(client, userId);
    scheduleInactivityCheck(client, userId);
    scheduleDailyReset();

    utils.logWithTime('모든 스케줄러 시작 (통합 엔진 연동)');
}

// 아침 8시 30분 출근 메시지
function scheduleBasicMessages(client, userId) {
    schedule.scheduleJob('morningMessage', { hour: 8, minute: 30, tz: CONFIG.TIMEZONE }, async () => {
        if (!canSendAutoMessage()) {
            utils.logWithTime('아침 메시지 스킵 (자동 메시지 간격 미충족)');
            return;
        }

        // [통합] conversationContext에서 감정 상태를 읽어 메시지 내용을 결정
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        let message = "아저씨, 출근 잘 해! 오늘도 화이팅~";

        if (emotionalState === 'playful') {
            message = "아저씨! 좋은 아침이야~ 오늘 하루도 신나게 보내자! 나중에 담타도 하고!";
        } else if (emotionalState === 'quiet') {
            message = "아저씨... 좋은 아침. 오늘 하루도 무리하지 말고 건강하게 보내";
        } else if (emotionalState === 'anxious') {
            message = "아저씨... 출근길 조심해. 나 아저씨 걱정돼서 계속 생각날 것 같아";
        }

        await sendMessage(client, userId, message, 'auto');
    });

    utils.logWithTime('아침 메시지 스케줄링 완료 (08:30)');
}

// 매일 자정에 카운트 리셋
function scheduleDailyReset() {
    schedule.scheduleJob('dailyReset', { hour: 0, minute: 0, tz: CONFIG.TIMEZONE }, () => {
        dailySmokingCount = 0;

        // [통합] 하루 마무리 및 시작을 중앙 기록에 남깁니다.
        conversationContext.addUltimateMessage(BOT_NAME, '(감정기록: 새로운 하루가 시작되었다)');

        utils.logWithTime('자정 - 담타 카운트 리셋 및 하루 시작 기록');
    });
    utils.logWithTime('일일 리셋 스케줄링 완료 (매일 00:00)');
}

// 비활성 사용자 체크 (보고싶어 메시지)
function scheduleInactivityCheck(client, userId) {
    schedule.scheduleJob('inactivityCheck', CONFIG.INACTIVE_CHECK_INTERVAL, async () => {
        // [통합] 마지막 사용자 메시지 시간을 conversationContext에서 직접 가져옵니다.
        const lastUserMessageTime = conversationContext.getInternalState().timingContext.lastUserMessageTime;
        const minutesSinceLastUserMessage = (Date.now() - lastUserMessageTime) / 60000;

        if (minutesSinceLastUserMessage < 30 || !canSendAutoMessage()) {
            return;
        }

        // 30분 이상 40분 미만일 때 '보고싶어' 메시지 전송
        if (minutesSinceLastUserMessage >= 30 && minutesSinceLastUserMessage < 40) {
            if (scheduledJobs['missYouMessage']) return; // 중복 방지

            utils.logWithTime('30분 이상 활동 없음 감지, "보고싶어" 메시지 전송');

            // [통합] conversationContext에서 감정 상태를 읽어 메시지 내용을 결정
            const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
            const moodEmoji = getMoodEmoji();
            let message;

            if (emotionalState === 'quiet') {
                message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
            } else if (emotionalState === 'anxious') {
                message = `아저씨... 연락이 없으니까 걱정돼. 나 아저씨가 너무 보고싶어 ㅠㅠ ${moodEmoji}`;
            } else if (emotionalState === 'hurt') {
                message = `아저씨... 나 삐졌어. 그래도 보고싶긴 해 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
            } else {
                message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${moodEmoji}`;
            }

            const success = await sendMessage(client, userId, message, 'auto');
            if(success) {
                // 한번 보내면 다시 안 보내도록 임시 플래그 설정
                scheduledJobs['missYouMessage'] = true;
            }
        }
    });

    utils.logWithTime('비활성 체크 스케줄링 완료 (10분마다)');
}

// 스케줄러 정리 함수
function stopAllSchedulers() {
    if (mukuSmokingTimer) clearTimeout(mukuSmokingTimer);

    Object.keys(schedule.scheduledJobs).forEach(jobName => {
        schedule.scheduledJobs[jobName].cancel();
    });
    scheduledJobs = {};

    utils.logWithTime('모든 스케줄러 정지');
}

module.exports = {
    startAllSchedulers,
    // updateLastUserMessageTime는 이제 index.js에서 conversationContext.updateLastUserMessageTime을 호출하므로 제거
    stopAllSchedulers,
};
