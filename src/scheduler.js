// ✅ scheduler.js v2.4 - 최종 안정화 버전

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog } = require('./aiUtils');
const conversationContext = require('./ultimateConversationContext.js');
const { getEmotionalDamtaMessage } = require('./damta');
const { getMoodEmoji } = require('./moodManager');

const CONFIG = { AUTO_MESSAGE_INTERVAL: 30, SMOKING_MIN_INTERVAL: 60, SMOKING_MAX_INTERVAL: 90, DAILY_SMOKING_MIN: 7, DAILY_SMOKING_MAX: 9, SMOKING_START_HOUR: 9, SMOKING_END_HOUR: 21, INACTIVE_CHECK_INTERVAL: '*/10 * * * *', TIMEZONE: 'Asia/Tokyo' };
const utils = { isSmokeTime: () => { const hour = moment().tz(CONFIG.TIMEZONE).hour(); return hour >= CONFIG.SMOKING_START_HOUR && hour <= CONFIG.SMOKING_END_HOUR; }, getRandomSmokingInterval: () => { return Math.floor(Math.random() * (CONFIG.SMOKING_MAX_INTERVAL - CONFIG.SMOKING_MIN_INTERVAL + 1)) + CONFIG.SMOKING_MIN_INTERVAL; } };

let scheduledJobs = {}; let lastAutoMessageTime = 0; let lastSmokingMessageTime = 0; let mukuSmokingTimer = null; let nextDamtaAttemptTime = 0; let dailySmokingCount = 0;

function canSendAutoMessage() { return (Date.now() - lastAutoMessageTime) / 60000 >= CONFIG.AUTO_MESSAGE_INTERVAL; }

async function sendMessage(client, userId, message, type = 'auto') {
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        const logMessage = `(${type === 'smoking' ? '담타' : '자동'} 메시지) ${message}`;
        saveLog('예진이', logMessage);
        conversationContext.addUltimateMessage('예진이', logMessage);
        lastAutoMessageTime = Date.now();
        if (type === 'smoking') {
            lastSmokingMessageTime = Date.now();
            dailySmokingCount++;
        }
        return true;
    } catch (error) {
        return false;
    }
}

function scheduleMukuRandomSmoking(client, userId) {
    function scheduleNextSmokingAttempt() {
        if (mukuSmokingTimer) clearTimeout(mukuSmokingTimer);
        if (!utils.isSmokeTime() || dailySmokingCount >= CONFIG.DAILY_SMOKING_MAX) {
            nextDamtaAttemptTime = 0;
            const tomorrow6AM = moment().tz(CONFIG.TIMEZONE).add(1, 'day').hour(6).minute(0).second(0);
            mukuSmokingTimer = setTimeout(() => { dailySmokingCount = 0; scheduleNextSmokingAttempt(); }, tomorrow6AM.valueOf() - Date.now());
            return;
        }
        const nextAttemptInterval = utils.getRandomSmokingInterval();
        nextDamtaAttemptTime = Date.now() + (nextAttemptInterval * 60 * 1000);
        mukuSmokingTimer = setTimeout(async () => {
            if (utils.isSmokeTime() && dailySmokingCount < CONFIG.DAILY_SMOKING_MAX && canSendAutoMessage() && (Date.now() - lastSmokingMessageTime) / 60000 >= CONFIG.SMOKING_MIN_INTERVAL) {
                const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
                await sendMessage(client, userId, getEmotionalDamtaMessage(emotionalState), 'smoking');
            }
            scheduleNextSmokingAttempt();
        }, nextAttemptInterval * 60 * 1000);
    }
    scheduleNextSmokingAttempt();
}

function scheduleInactivityCheck(client, userId) {
    schedule.scheduleJob('inactivityCheck', CONFIG.INACTIVE_CHECK_INTERVAL, async () => {
        const lastUserMessageTime = conversationContext.getInternalState().timingContext.lastUserMessageTime;
        const minutesSinceLastUserMessage = (Date.now() - lastUserMessageTime) / 60000;
        if (minutesSinceLastUserMessage < 30 || !canSendAutoMessage() || scheduledJobs['missYouMessage']) return;
        if (minutesSinceLastUserMessage >= 30) {
            scheduledJobs['missYouMessage'] = true;
            const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
            let message = `아저씨... 나 아저씨가 보고싶어 ㅠㅠ 아저씨도 나 생각해? ${getMoodEmoji()}`;
            if (emotionalState === 'anxious') message = `아저씨... 연락이 없으니까 걱정돼. 나 너무 보고싶어 ㅠㅠ ${getMoodEmoji()}`;
            await sendMessage(client, userId, message, 'auto');
            setTimeout(() => { delete scheduledJobs['missYouMessage']; }, 20 * 60 * 1000);
        }
    });
}

function getSchedulerStatus() {
    let nextDamtaInMinutes = 0;
    if (nextDamtaAttemptTime > 0) nextDamtaInMinutes = Math.round((nextDamtaAttemptTime - Date.now()) / 60000);
    return { isDamtaTime: utils.isSmokeTime(), damtaTodayCount: dailySmokingCount, nextDamtaInMinutes: nextDamtaInMinutes > 0 ? nextDamtaInMinutes : "스케줄링 대기 중" };
}

function startAllSchedulers(client, userId) {
    scheduleMukuRandomSmoking(client, userId);
    scheduleInactivityCheck(client, userId);
}

module.exports = { startAllSchedulers, getSchedulerStatus };
