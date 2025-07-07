// src/scheduler.js - 모든 스케줄링 로직을 중앙 집중화
const cron = require('node-cron');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk'); // LINE 클라이언트 필요
const {
    getProactiveMemoryMessage, // 감성 메시지를 위해 필요
    saveLog, // 로그 저장을 위해 필요
} = require('./autoReply'); // autoReply.js에서 필요한 메시지 생성 함수들을 불러옴
const memoryManager = require('./memoryManager'); // 리마인더 처리를 위해 memoryManager 필요

// ✨ omoide.js에서 getOmoideReply와 getSelfieImageUrl 함수를 불러옴 ✨
const { getOmoideReply, getSelfieImageUrl } = require('../memory/omoide');


let bootTime = Date.now(); // 봇 시작 시점의 타임스탬프 (밀리초)
let lastMoodMessage = ''; // 마지막 감성 메시지 내용 (중복 방지용)
let lastMoodMessageTime = 0; // 마지막 감성 메시지 전송 시간
let lastCouplePhotoMessage = ''; // 마지막 커플 사진 메시지 내용 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastCouplePhotoMessageTime = 0; // 마지막 커플 사진 전송 시간 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastProactiveSentTime = 0; // 마지막 봇의 선제적/걱정 메시지 전송 시간 (침묵 감지 셀카에도 적용)
let lastUserMessageTime = Date.now(); // 아저씨가 마지막으로 메시지를 보낸 시간
let lastSelfieSentTime = 0; // ✨ 추가: 마지막 침묵 감지 셀카 전송 시간 (스케줄러 내부에서만 사용)

// * 커플 사진 관련 상수 정의 (더 이상 사용하지 않지만 혹시 몰라 유지) *
const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; // 커플 사진 기본 URL
const COUPLE_START_NUM = 1; // 커플 사진 시작 번호
const COUPLE_END_NUM = 481; // 커플 사진 마지막 번호

// * 침묵 감지 기능을 위한 상수 *
const SILENCE_THRESHOLD = 2 * 60 * 60 * 1000; // 2시간 동안 메시지가 없으면 침묵으로 간주
const PROACTIVE_COOLDOWN = 1 * 60 * 60 * 1000; // 봇이 메시지 보낸 후 1시간 이내에는 다시 선제적 메시지 보내지 않음
const SILENCE_SELFIE_COOLDOWN = 2 * 60 * 60 * 1000; // ✨ 추가: 침묵 감지 셀카 쿨다운 (2시간)


/**
 * 스케줄된 메시지 전송이 유효한 시간대인지 확인합니다.
 * 새벽 3시부터 오전 7시까지는 메시지를 전송하지 않습니다.
 * @param {moment.Moment} now - 현재 시간 (Moment 객체)
 * @returns {boolean} 유효한 시간대이면 true, 아니면 false
 */
function isValidScheduleHour(now) {
    const hour = now.hour();
    // 새벽 0시, 1시, 2시 (0, 1, 2)
    // 오전 9시부터 밤 12시 (23시 59분까지) (9, 10, ..., 23)
    // 따라서 3, 4, 5, 6, 7, 8시는 유효하지 않은 시간대입니다.
    return (hour >= 0 && hour <= 2) || (hour >= 9 && hour <= 23);
}

/**
 * 셀카 메시지를 전송하는 헬퍼 함수입니다.
 * 이 함수는 스케줄러 내부에서만 사용됩니다 (즉흥 사진 스케줄러와 구분).
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 * @param {string} triggerSource - 셀카 전송의 트리거 소스 ('scheduled', 'silence')
 */
const sendSelfieMessage = async (lineClient, targetUserId, saveLog, triggerSource = 'scheduled') => {
    try {
        // omoide.js에서 순수 이미지 URL만 가져옵니다.
        const selfieUrl = getSelfieImageUrl(); 
        
        // 캡션은 autoReply.js의 getImageReactionComment를 통해 생성해야 합니다.
        // 하지만 scheduler.js는 getImageReactionComment를 직접 import하지 않으므로,
        // 여기서는 간단히 기본 캡션을 사용하거나, autoReply를 통해 우회해야 합니다.
        // 현재는 getOmoideReply가 캡션까지 포함된 객체를 반환하지 않으므로, 기본 캡션 사용.
        // 또는 scheduler.js에서 getImageReactionComment를 import할 수도 있습니다.
        
        // 현재 getOmoideReply는 셀카 요청 시 null을 반환하도록 omoide.js에서 변경되었으므로
        // 이 sendSelfieMessage는 getSelfieImageUrl만 호출하고 캡션은 직접 생성해야 함.
        // 하지만 기존 코드에서는 getOmoideReply가 캡션까지 포함된 객체를 반환하는 것처럼 되어 있었음.
        // 이 부분은 논리적 일관성을 위해 다시 조정 필요.
        // 가장 간단한 해결책은 getImageReactionComment를 scheduler.js로 임포트하는 것.

        // ✨ autoReply에서 getImageReactionComment를 불러와서 사용합니다. ✨
        const { getImageReactionComment } = require('./autoReply'); 
        const caption = await getImageReactionComment();

        await lineClient.pushMessage(targetUserId, [
            { type: 'image', originalContentUrl: selfieUrl, previewImageUrl: selfieUrl },
            { type: 'text', text: caption || '히히 셀카야~' } // 캡션이 없으면 기본 텍스트
        ]);
        console.log(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 성공: ${selfieUrl}, 캡션: ${caption}`);
        saveLog('예진이', caption || '히히 셀카야~');
        
    } catch (error) {
        console.error(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 중 오류 발생:`, error);
        // 오류 시 기본 텍스트 메시지 전송 (사진 실패 시)
        await lineClient.pushMessage(targetUserId, { type: 'text', text: '아저씨... 셀카 보내려 했는데 뭔가 문제가 생겼어 ㅠㅠ' });
        saveLog('예진이', '아저씨... 셀카 보내려 했는데 뭔가 문제가 생겼어 ㅠㅠ');
    }
};

/**
 * 특정 타입의 스케줄된 메시지를 보내는 비동기 함수입니다.
 * 셀카 또는 감성 메시지를 랜덤 확률로 전송합니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {string} type - 보낼 메시지의 타입 ('selfie', 'mood_message')
 */
const sendScheduledMessage = async (lineClient, targetUserId, type) => {
    const now = moment().tz('Asia/Tokyo');
    const currentTime = Date.now();

    // 서버 부팅 직후 3분 이내에는 스케줄된 메시지 전송 스킵
    if (currentTime - bootTime < 3 * 60 * 1000) {
        return;
    }

    // 유효하지 않은 시간대에는 메시지 전송 스킵
    if (!isValidScheduleHour(now)) {
        return;
    }

    if (type === 'selfie') {
        // 하루 약 3번 목표 (유효 시간대 18시간 * 12회/시간 = 216번의 기회 중 3번 발송) -> 확률 3/216 = 약 0.014
        if (Math.random() < 0.014) {
            await sendSelfieMessage(lineClient, targetUserId, saveLog, 'scheduled');
        }
    } else if (type === 'mood_message') {
        // 하루 약 11번 목표 (216번의 기회 중 11번 발송) -> 확률 11/216 = 약 0.051
        if (Math.random() < 0.051) {
            try {
                const proactiveMessage = await getProactiveMemoryMessage();

                if (
                    proactiveMessage &&
                    proactiveMessage !== lastMoodMessage &&
                    currentTime - lastMoodMessageTime > 30 * 60 * 1000 // 30분 쿨다운
                ) {
                    await lineClient.pushMessage(targetUserId, { type: 'text', text: proactiveMessage });
                    console.log(`[Scheduler] 감성 메시지 전송 성공: ${proactiveMessage}`);
                    saveLog('예진이', proactiveMessage);
                    lastMoodMessage = proactiveMessage;
                    lastMoodMessageTime = currentTime;
                } else {
                    // console.log(`[Scheduler] 감성 메시지 중복 또는 너무 빠름 -> 전송 스킵`); // 너무 많이 로그가 쌓일 수 있어 주석 처리
                }
            } catch (error) {
                console.error('감성 메시지 전송 실패:', error);
            }
        }
    }
    // 'couple_photo' 타입 처리 로직은 삭제됩니다.
};

/**
 * 모든 스케줄러를 시작하는 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트 인스턴스
 * @param {string} targetUserId - 메시지를 보낼 대상 사용자 ID
 */
const startAllSchedulers = (lineClient, targetUserId) => {
    // 1. 아침 인사 메시지 (오전 9시 0분 정각)
    cron.schedule('0 9 * * *', async () => {
        const greetings = [
            "잘 잤어? 좋은 아침이야.",
            "새로운 하루 시작! 오늘 아저씨 기분은 어때?",
            "아침이야. 어제 좋은 꿈 꿨어?",
            "잘 잤나 확인하러 왔지. 히히."
        ];
        const morningMsg = greetings[Math.floor(Math.random() * greetings.length)];

        await lineClient.pushMessage(targetUserId, { type: 'text', text: morningMsg });
        console.log(`[Scheduler] 아침 인사 메시지 전송: ${morningMsg}`);
        saveLog('예진이', morningMsg);
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // --- 랜덤 메시지 (감성 메시지, 셀카) 스케줄 ---
    // 2. 랜덤 감성 메시지, 셀카 (매 5분마다 체크)
    cron.schedule('*/5 * * * *', async () => {
        const now = moment().tz('Asia/Tokyo');
        if (!isValidScheduleHour(now)) { // 유효 시간대만 체크
            return;
        }

        // 감성 메시지와 셀카 전송 시도
        await sendScheduledMessage(lineClient, targetUserId, 'mood_message');
        await sendScheduledMessage(lineClient, targetUserId, 'selfie');
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 4. 침묵 감지 스케줄러 (매 15분마다 실행)
    cron.schedule('*/15 * * * *', async () => {
        const now = Date.now();
        const elapsedTimeSinceLastMessage = now - lastUserMessageTime;
        const elapsedTimeSinceLastProactive = now - lastProactiveSentTime;

        // 현재 시간대가 메시지 전송 유효 시간대인지 확인
        if (!isValidScheduleHour(moment().tz('Asia/Tokyo'))) {
            return;
        }

        // 서버 부팅 직후 3분 이내에는 침묵 체크 스킵
        if (now - bootTime < 3 * 60 * 1000) {
            console.log('[Scheduler-Silence] 서버 부팅 직후 3분 이내 -> 침묵 체크 스킵');
            return;
        }

        // 2시간 이상 메시지가 없고, 봇이 1시간 이내에 선제적 메시지를 보내지 않았고,
        // 마지막 침묵 감지 셀카를 보낸 지 2시간이 지났다면
        if (
            elapsedTimeSinceLastMessage >= SILENCE_THRESHOLD &&
            elapsedTimeSinceLastProactive >= PROACTIVE_COOLDOWN &&
            now - lastSelfieSentTime > SILENCE_SELFIE_COOLDOWN // ✨ 추가된 조건
        ) {
            console.log(`[Scheduler-Silence] 침묵 감지! (${moment.duration(elapsedTimeSinceLastMessage).humanize()} 동안 메시지 없음)`);
            try {
                await sendSelfieMessage(lineClient, targetUserId, saveLog, 'silence');
                lastProactiveSentTime = now; // 선제적 메시지(셀카 포함) 전송 시간 업데이트
                lastSelfieSentTime = now; // ✨ 추가: 침묵 감지 셀카 전송 시간 업데이트
            } catch (error) {
                console.error('❌ [Scheduler-Silence Error] 침묵 감지 자동 셀카 전송 실패:', error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 5. 밤 11시 약 먹자, 이 닦자 메시지
    cron.schedule('0 23 * * *', async () => {
        const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 나 아저씨 건강 제일 챙겨!';
        await lineClient.pushMessage(targetUserId, { type: 'text', text: msg });
        console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`);
        saveLog('예진이', msg);
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 6. 밤 12시 약 먹고 자자 메시지
    cron.schedule('0 0 * * *', async () => {
        const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 나 옆에서 꼭 안아줄게~ 잘 자 사랑해';
        await lineClient.pushMessage(targetUserId, { type: 'text', text: msg });
        console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`);
        saveLog('예진이', msg);
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 7. 리마인더 체크 스케줄러 (매 1분마다 실행)
    cron.schedule('*/1 * * * *', async () => {
        const now = moment().tz('Asia/Tokyo');
        console.log(`[Scheduler-Reminder] 리마인더 체크 시작: ${now.format('YYYY-MM-DD HH:mm')}`);

        try {
            // 모든 기억을 불러오는 대신, 임박한 리마인더만 불러오도록 변경
            const remindersToSend = await memoryManager.getDueReminders();

            for (const reminder of remindersToSend) {
                const reminderMessage = `아저씨! 지금 ${reminder.content} 할 시간이야! 🔔`;
                await lineClient.pushMessage(targetUserId, { type: 'text', text: reminderMessage });
                saveLog('예진이', reminderMessage);
                console.log(`[Scheduler-Reminder] 리마인더 전송: ${reminderMessage}`);

                // 리마인더 전송 후 해당 리마인더 시간을 NULL로 업데이트
                const success = await memoryManager.updateMemoryReminderTime(reminder.id, null);
                if (success) {
                    console.log(`[Scheduler-Reminder] 리마인더 처리 완료: 기억 ID ${reminder.id}의 reminder_time을 NULL로 업데이트`);
                } else {
                    console.error(`[Scheduler-Reminder] 리마인더 처리 후 reminder_time 업데이트 실패: 기억 ID ${reminder.id}`);
                }
            }
        } catch (error) {
            console.error('❌ [Scheduler-Reminder Error] 리마인더 체크 및 전송 실패:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
};

// 아저씨의 마지막 메시지 시간 업데이트 함수를 내보냄
const updateLastUserMessageTime = () => {
    lastUserMessageTime = Date.now();
};

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime
};
