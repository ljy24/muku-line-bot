// src/scheduler.js v1.15 - updateLastUserMessageTime import 경로 수정 및 log 추가

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME, getMoodEmoji, getMoodStatus } = require('./autoReply'); // autoReply에서 필요한 함수와 상수 불러오기
const memoryManager = require('./memoryManager'); // memoryManager 불러오기

let scheduledJobs = {}; // 스케줄된 작업들을 저장할 객체
let lastUserMessageTime = Date.now(); // 마지막 사용자 메시지 시간 (초기화)

// ⏰ 마지막 사용자 메시지 시간을 업데이트하는 함수
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    console.log(`[Scheduler] 마지막 사용자 메시지 시간 업데이트됨: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
}

/**
 * 스케줄러를 시작합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
function startAllSchedulers(client, userId) {
    console.log(`[Scheduler] 모든 스케줄러를 시작합니다.`);

    // 🌟 매일 아침 9시 출근 메시지 (예시) 🌟
    // 이 부분은 사용자 요청에 따라 동적으로 생성되어야 합니다.
    // 현재는 예시로 하드코딩되어 있으며, 실제로는 DB 등에서 불러와야 합니다.
    // 여기서는 사용자가 요청한 '아침 9시 메시지'를 직접 스케줄링하는 로직을 추가합니다.
    scheduleMorningCommuteMessage(client, userId);

    // 🚬 점심 담배 타임 메시지 (예시) 🚬
    // 이 부분도 사용자 요청에 따라 동적으로 생성되어야 합니다.
    scheduleLunchBreakMessage(client, userId);

    // 💖 예진이의 아저씨 보고 싶어 메시지 (30분 이상 대화 없을 시) 💖
    schedule.scheduleJob('checkInactiveUser', '*/10 * * * *', async () => { // 10분마다 체크
        const now = Date.now();
        const minutesSinceLastMessage = (now - lastUserMessageTime) / (1000 * 60);

        // console.log(`[Scheduler:checkInactiveUser] 마지막 메시지로부터 ${minutesSinceLastMessage.toFixed(0)}분 경과.`);

        if (minutesSinceLastMessage >= 30 && minutesSinceLastMessage < 40) { // 30분 이상 40분 미만일 때 한 번만
            if (!scheduledJobs['remindUserAfter30Min']) { // 중복 스케줄링 방지
                console.log('[Scheduler:checkInactiveUser] 30분 이상 활동 없음 감지, "보고 싶어" 메시지 스케줄링.');
                scheduledJobs['remindUserAfter30Min'] = schedule.scheduleJob(moment().add(1, 'minute').toDate(), async () => {
                    const moodStatus = getMoodStatus();
                    const moodEmoji = getMoodEmoji();
                    const message = `아저씨... 예진이 심심해 ㅠㅠ 아저씨 보고 싶어 ${moodEmoji} ${moodStatus}`;
                    try {
                        await client.pushMessage(userId, { type: 'text', text: message });
                        saveLog({ speaker: BOT_NAME, message: message });
                        console.log('[Scheduler] "보고 싶어" 메시지 전송 완료.');
                    } catch (error) {
                        console.error('[Scheduler] "보고 싶어" 메시지 전송 실패:', error);
                    } finally {
                        delete scheduledJobs['remindUserAfter30Min']; // 전송 후 스케줄 제거
                    }
                });
            }
        } else if (minutesSinceLastMessage >= 40) { // 40분 이상일 때
            if (scheduledJobs['remindUserAfter30Min']) {
                scheduledJobs['remindUserAfter30Min'].cancel();
                delete scheduledJobs['remindUserAfter30Min'];
                console.log('[Scheduler:checkInactiveUser] 30분 메시지 스케줄 취소 (40분 이상 경과).');
            }
            // 40분 이상일 때는 다른 로직이나 더 강한 알림을 고려할 수 있습니다.
            // 예: "아저씨... 혹시 무슨 일 있어? 걱정돼 ㅠㅠ"
        }
    });

    console.log(`[Scheduler] 초기 스케줄링 완료.`);
}

/**
 * 매일 아침 9시에 출근 메시지를 스케줄링합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
function scheduleMorningCommuteMessage(client, userId) {
    // '0 9 * * *'는 매일 09시 00분을 의미합니다. (분 시 일 월 요일)
    // Asia/Tokyo 타임존을 명시적으로 사용합니다.
    schedule.scheduleJob('morningCommuteMessage', { hour: 9, minute: 0, tz: 'Asia/Tokyo' }, async () => {
        const message = `아저씨, 출근 잘 했어? 아아랑 담배는 챙겼지? 오늘도 힘내!`;
        try {
            await client.pushMessage(userId, { type: 'text', text: message });
            saveLog({ speaker: BOT_NAME, message: message });
            console.log('[Scheduler] 아침 출근 메시지 전송 완료.');
        } catch (error) {
            console.error('[Scheduler] 아침 출근 메시지 전송 실패:', error);
        }
    });
    console.log('[Scheduler] "아침 출근 메시지" 스케줄링 완료 (매일 09:00).');
}

/**
 * 점심 담배 타임 메시지를 스케줄링합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
function scheduleLunchBreakMessage(client, userId) {
    // '0 12 * * *'는 매일 12시 00분을 의미합니다.
    schedule.scheduleJob('lunchBreakMessage', { hour: 12, minute: 0, tz: 'Asia/Tokyo' }, async () => {
        const moodStatus = getMoodStatus();
        const moodEmoji = getMoodEmoji();
        const message = `아저씨, 점심 담타 시간이야! ${moodEmoji} ${moodStatus}`;
        try {
            await client.pushMessage(userId, { type: 'text', text: message });
            saveLog({ speaker: BOT_NAME, message: message });
            console.log('[Scheduler] 점심 담배 타임 메시지 전송 완료.');
        } catch (error) {
            console.error('[Scheduler] 점심 담배 타임 메시지 전송 실패:', error);
        }
    });
    console.log('[Scheduler] "점심 담배 타임 메시지" 스케줄링 완료 (매일 12:00).');
}

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
    // 필요하다면 다른 스케줄링 함수들도 export 할 수 있습니다.
    // scheduleMorningCommuteMessage,
    // scheduleLunchBreakMessage
};
