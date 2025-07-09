// src/scheduler.js - v1.1 (리마인더 기능 연동)

const cron = require('node-cron');
const moment = require('moment-timezone');
const { getReplyByMessage, saveLog } = require('./autoReply'); // autoReply에서 getReplyByMessage, saveLog 불러오기
const memoryManager = require('./memoryManager'); // memoryManager 불러오기

// 챗봇의 기본 페르소나 및 설정 (autoReply에서 가져옴)
const BOT_NAME = '예진이'; 
const USER_NAME = '아저씨'; 

// 마지막 사용자 메시지 시간 (시간 기반 기분 변화용)
let lastUserMessageTime = Date.now();

/**
 * 마지막 사용자 메시지 시간을 업데이트합니다.
 */
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    console.log(`[Scheduler] 마지막 사용자 메시지 시간 업데이트: ${moment(lastUserMessageTime).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}`);
}

/**
 * 주기적으로 리마인더를 체크하고 전송합니다.
 * @param {Object} client LINE Bot SDK Client 객체
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 */
function startReminderScheduler(client, userId) {
    // 매분마다 리마인더 체크 (실제 운영에서는 간격 조정 필요)
    cron.schedule('* * * * *', async () => {
        const currentTime = moment().tz('Asia/Tokyo');
        console.log(`[Scheduler-Reminder] 리마인더 체크 시작: ${currentTime.format('YYYY-MM-DD HH:mm')}`);

        try {
            // 현재 시간 이전에 도달했고 아직 전송되지 않은 리마인더 조회
            const dueReminders = await memoryManager.getDueReminders(currentTime.valueOf());

            if (dueReminders.length > 0) {
                console.log(`[Scheduler-Reminder] 전송할 리마인더 ${dueReminders.length}개 발견!`);
                for (const reminder of dueReminders) {
                    const messageToSend = `[리마인더] 아저씨! ${reminder.message}`;
                    try {
                        await client.pushMessage(userId, { type: 'text', text: messageToSend });
                        await memoryManager.markReminderAsSent(reminder.id);
                        saveLog({ role: 'assistant', content: messageToSend, timestamp: Date.now() });
                        console.log(`[Scheduler-Reminder] 리마인더 전송 완료 (ID: ${reminder.id})`);
                    } catch (pushError) {
                        console.error(`[Scheduler-Reminder] 리마인더 푸시 메시지 전송 실패 (ID: ${reminder.id}):`, pushError);
                        // 전송 실패 시 is_sent를 0으로 유지하여 다음에 다시 시도하도록 함
                    }
                }
            }
        } catch (error) {
            console.error('❌ [Scheduler-Reminder Error] 리마인더 체크 및 전송 실패:', error);
        }
    });

    console.log('[Scheduler-Reminder] 리마인더 스케줄러 시작!');
}

/**
 * 주기적으로 예진이의 기분 상태를 업데이트합니다. (autoReply.js에 로직이 있으므로 호출만)
 */
function startMoodScheduler() {
    // 이 스케줄러는 autoReply.js 내부의 checkMoodChange와 checkTimeBasedMoodChange 로직에 따라 작동합니다.
    // 여기서는 별도의 cron 스케줄을 직접 돌리지 않고, autoReply의 내부 로직이 메시지 수신 시 자체적으로 처리하도록 유지합니다.
    console.log('[Scheduler-Mood] 기분 스케줄러는 autoReply.js 내부에서 관리됩니다.');
}


/**
 * 모든 스케줄러를 시작합니다.
 * @param {Object} client LINE Bot SDK Client 객체
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 */
function startAllSchedulers(client, userId) {
    startReminderScheduler(client, userId);
    startMoodScheduler();
    // spontaneousPhotoManager는 index.js에서 직접 시작하므로 여기서는 제외
}

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
    // 필요하다면 리마인더 함수들을 여기서 export하여 외부에서 수동으로 리마인더를 추가할 수 있게 할 수도 있습니다.
    // saveReminder: memoryManager.saveReminder, // 예시
};
