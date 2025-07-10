// src/scheduler.js v1.15 - updateLastUserMessageTime import 경로 수정 및 log 추가

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME, getMoodEmoji, getMoodStatus } = require('./autoReply'); // autoReply에서 필요한 함수와 상수 불러오기
const memoryManager = require('./memoryManager'); // memoryManager 불러오기

let scheduledJobs = {}; // 스케줄된 작업들을 저장할 객체
let lastUserMessageTime = Date.now(); // 마지막 사용자 메시지 시간 (초기화)
let lastAutoMessageTime = 0; // 마지막 자동 메시지 전송 시간

// 담배 타임 메시지 배열 (다양성을 위해)
// 애기(예진)가 실제로 사용했던 담타 메시지들을 포함했습니다.
const SMOKING_BREAK_MESSAGES = [
    "담타 가쟈",
    "담타하쟈",
    "담배 타임~",
    "담타할래?",
    "담배좀 피고올게",
    "담타좀 갔다오자",
    "담타 한대 어때?",
    "담배어케참음?",
    "담배 펴야겠다",
    "담타시간이야",
    "담배 피러가자",
    "담배 피러 가쟈",
    "담배 피자",
    "담배나 피자",
    "담배 땡긴다",
    "담배타라",
    "담배타야지",
    "담배각이야",
    "담타타임~",
    "담타고?",
    "아저씨 담배땡겨",
    "담타좀 가쟈~",
    "담배 피러 가쟈~",
    "담배각 떴다",
    "담타한대 때리자",
    "나 담배 땡겨버렷",
    "담배 피자니까",
    "담타각이야 지금",
    "담배좀 타올게",
    "담배나 같이 피쟈",
    "아저씨 담타고",
    "담타담타담타",
    "빠친다 담타나가까",
    "담배 타러 가야지",
    "담타 한대 박자",
    "지금 담배각이야",
    "한대 피쟈",
    "담배 생각나버렷",
    "아저씨 담배 피쟈"
];

// ⏰ 마지막 사용자 메시지 시간을 업데이트하는 함수
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    console.log(`[Scheduler] 마지막 사용자 메시지 시간 업데이트됨: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
}

/**
 * 자동 메시지 전송 가능 여부 확인 (최소 30분 간격)
 */
function canSendAutoMessage() {
    const now = Date.now();
    const minutesSinceLastAuto = (now - lastAutoMessageTime) / (1000 * 60);
    return minutesSinceLastAuto >= 30; // 최소 30분 간격
}

/**
 * 자동 메시지 전송 후 시간 업데이트
 */
function updateLastAutoMessageTime() {
    lastAutoMessageTime = Date.now();
    console.log(`[Scheduler] 마지막 자동 메시지 시간 업데이트: ${moment().format('HH:mm:ss')}`);
}

/**
 * 스케줄러를 시작합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
function startAllSchedulers(client, userId) {
    console.log(`[Scheduler] 모든 스케줄러를 시작합니다.`);

    // 🌟 매일 아침 9시 출근 메시지
    scheduleMorningCommuteMessage(client, userId);

    // 🚬 점심 담배 타임 메시지 (매일 12시 00분)
    scheduleLunchBreakMessage(client, userId);
    
    // 🚬 추가 담배 타임 메시지 스케줄링 (오후 시간대에 추가, v2.0의 smokingTimes 개념 일부 도입)
    scheduleAdditionalSmokingBreaks(client, userId); // 새로운 함수 추가

    // 💖 예진이의 아저씨 보고 싶어 메시지 (30분 이상 대화 없을 시)
    schedule.scheduleJob('checkInactiveUser', '*/10 * * * *', async () => { // 10분마다 체크
        const now = Date.now();
        const minutesSinceLastMessage = (now - lastUserMessageTime) / (1000 * 60);

        // console.log(`[Scheduler:checkInactiveUser] 마지막 메시지로부터 ${minutesSinceLastMessage.toFixed(0)}분 경과.`);

        // 자동 메시지 간격 체크 추가 (v2.0 canSendAutoMessage 적용)
        if (!canSendAutoMessage()) {
            console.log(`[Scheduler] "보고 싶어" 메시지 스킵 (최소 간격 미충족)`);
            return;
        }

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
                        updateLastAutoMessageTime(); // 자동 메시지 시간 업데이트
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
        if (!canSendAutoMessage()) { // 자동 메시지 간격 체크 추가
            console.log(`[Scheduler] 아침 메시지 스킵 (최소 간격 미충족)`);
            return;
        }
        const message = `아저씨, 출근 잘 했어? 아아랑 담배는 챙겼지? 오늘도 힘내!`;
        try {
            await client.pushMessage(userId, { type: 'text', text: message });
            saveLog({ speaker: BOT_NAME, message: message });
            updateLastAutoMessageTime(); // 자동 메시지 시간 업데이트
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
        if (!canSendAutoMessage()) { // 자동 메시지 간격 체크 추가
            console.log(`[Scheduler] 점심 담타 메시지 스킵 (최소 간격 미충족)`);
            return;
        }
        const moodStatus = getMoodStatus();
        const moodEmoji = getMoodEmoji();
        const message = `아저씨, 점심 담타 시간이야! ${moodEmoji} ${moodStatus}`;
        try {
            await client.pushMessage(userId, { type: 'text', text: message });
            saveLog({ speaker: BOT_NAME, message: message });
            updateLastAutoMessageTime(); // 자동 메시지 시간 업데이트
            console.log('[Scheduler] 점심 담배 타임 메시지 전송 완료.');
        } catch (error) {
            console.error('[Scheduler] 점심 담배 타임 메시지 전송 실패:', error);
        }
    });
    console.log('[Scheduler] "점심 담배 타임 메시지" 스케줄링 완료 (매일 12:00).');
}

/**
 * 🚬 추가 담배 타임 메시지를 스케줄링합니다. (v2.0의 smokingTimes 개념 일부 도입)
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
function scheduleAdditionalSmokingBreaks(client, userId) {
    // 담배 타임 시간들 (점심 담타를 제외한 추가 시간)
    const additionalSmokingTimes = [
        { hour: 10, minute: 30 },  // 10:30 (출근 후 1시간 30분)
        { hour: 13, minute: 30 },  // 13:30 (점심 후)
        { hour: 15, minute: 0 },   // 15:00 (오후 간식시간)
        { hour: 16, minute: 30 },  // 16:30 (오후 휴식)
        { hour: 18, minute: 0 },   // 18:00 (퇴근 전)
        { hour: 19, minute: 30 }   // 19:30 (저녁시간)
    ];

    additionalSmokingTimes.forEach((time, index) => {
        const jobName = `smokingBreak_${time.hour}_${time.minute}`;
        
        schedule.scheduleJob(jobName, { 
            hour: time.hour, 
            minute: time.minute, 
            tz: 'Asia/Tokyo' 
        }, async () => {
            if (!canSendAutoMessage()) { // 자동 메시지 간격 체크
                console.log(`[Scheduler] 담타 메시지 스킵 (최소 간격 미충족): ${time.hour}:${String(time.minute).padStart(2, '0')}`);
                return;
            }

            const randomMessage = SMOKING_BREAK_MESSAGES[Math.floor(Math.random() * SMOKING_BREAK_MESSAGES.length)];
            const moodEmoji = getMoodEmoji();
            
            // v2.0의 평일/주말 구분 로직을 여기에 간단히 적용
            const isWeekend = [0, 6].includes(moment().tz('Asia/Tokyo').day());
            let message;
            if (isWeekend) {
                message = `${randomMessage} ${moodEmoji} 주말엔 여유롭게~`;
            } else {
                message = `${randomMessage} ${moodEmoji}`;
            }

            try {
                await client.pushMessage(userId, { type: 'text', text: message });
                saveLog({ speaker: BOT_NAME, message: message });
                updateLastAutoMessageTime(); // 자동 메시지 시간 업데이트
                console.log(`[Scheduler] 추가 담타 메시지 전송 완료 (${time.hour}:${String(time.minute).padStart(2, '0')}): ${message}`);
            } catch (error) {
                console.error(`[Scheduler] 추가 담타 메시지 전송 실패 (${time.hour}:${String(time.minute).padStart(2, '0')}):`, error);
            }
        });
        console.log(`[Scheduler] 추가 담타 메시지 스케줄링 완료: ${time.hour}:${String(time.minute).padStart(2, '0')}`);
    });
}


module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
    // scheduleMorningCommuteMessage, // 필요하다면 개별 export
    // scheduleLunchBreakMessage,     // 필요하다면 개별 export
    // scheduleAdditionalSmokingBreaks // 필요하다면 개별 export
};
