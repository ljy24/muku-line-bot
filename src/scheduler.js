// src/scheduler.js - 모든 스케줄링 로직을 중앙 집중화
const cron = require('node-cron');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk'); // LINE 클라이언트 필요
const {
    getRandomMessage,
    getProactiveMemoryMessage,
    getCouplePhotoReplyFromYeji,
    getSilenceCheckinMessage,
    saveLog // 로그 저장을 위해 필요
} = require('./autoReply'); // autoReply.js에서 필요한 메시지 생성 함수들을 불러옴
const memoryManager = require('./memoryManager'); // 리마인더 처리를 위해 memoryManager 필요

let bootTime = Date.now(); // 봇 시작 시점의 타임스탬프 (밀리초)
let lastMoodMessage = ''; // 마지막 감성 메시지 내용 (중복 방지용)
let lastMoodMessageTime = 0; // 마지막 감성 메시지 전송 시간
let lastCouplePhotoMessage = ''; // 마지막 커플 사진 메시지 내용
let lastCouplePhotoMessageTime = 0; // 마지막 커플 사진 전송 시간
let lastProactiveSentTime = 0; // 마지막 봇의 선제적/걱정 메시지 전송 시간
let lastUserMessageTime = Date.now(); // 아저씨가 마지막으로 메시지를 보낸 시간

// * 커플 사진 관련 상수 정의 (스케줄러에서 사용되는 이미지 URL) *
const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; // 커플 사진 기본 URL
const COUPLE_START_NUM = 1; // 커플 사진 시작 번호
const COUPLE_END_NUM = 481; // 커플 사진 마지막 번호

// * 침묵 감지 기능을 위한 상수 *
const SILENCE_THRESHOLD = 2 * 60 * 60 * 1000; // 2시간 동안 메시지가 없으면 침묵으로 간주
const PROACTIVE_COOLDOWN = 1 * 60 * 60 * 1000; // 봇이 메시지 보낸 후 1시간 이내에는 다시 선제적 메시지 보내지 않음


/**
 * 스케줄된 메시지 전송이 유효한 시간대인지 확인합니다.
 * @param {moment.Moment} now - 현재 시간 (Moment 객체)
 * @returns {boolean} 유효한 시간대이면 true, 아니면 false
 */
function isValidScheduleHour(now) {
    // 새벽 0~2시 + 오전 9시~밤 12시 (23시 59분까지)
    const validHours = [0, 1, 2, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    return validHours.includes(now.hour());
}

/**
 * 특정 타입의 스케줄된 메시지를 보내는 비동기 함수입니다.
 * 셀카 또는 감성 메시지를 랜덤 확률로 전송합니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {string} type - 보낼 메시지의 타입 ('selfie', 'mood_message', 'couple_photo')
 */
const sendScheduledMessage = async (lineClient, targetUserId, type) => {
    const now = moment().tz('Asia/Tokyo');
    const currentTime = Date.now();

    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log(`[Scheduler] 서버 부팅 직후 3분 이내 -> ${type} 메시지 전송 스킵`);
        return;
    }

    if (!isValidScheduleHour(now)) {
        // console.log(`[Scheduler] 현재 시간 ${now.hour()}시는 유효 시간대가 아님 -> ${type} 메시지 스킵`);
        return;
    }

    if (type === 'selfie') {
        if (Math.random() < 0.20) { // 하루 3번 목표
            try {
                const selfieResponse = await getOmoideReply('셀카 보여줘', saveLog);
                if (selfieResponse && selfieResponse.type === 'photo' && selfieResponse.url) {
                    await lineClient.pushMessage(targetUserId, [
                        { type: 'image', originalContentUrl: selfieResponse.url, previewImageUrl: selfieResponse.url },
                        { type: 'text', text: selfieResponse.caption || '히히 셀카야~' }
                    ]);
                    console.log(`[Scheduler] 랜덤 셀카 전송 성공: ${selfieResponse.url}`);
                    saveLog('예진이', selfieResponse.caption || '히히 셀카야~');
                } else if (selfieResponse && selfieResponse.type === 'text') {
                    await lineClient.pushMessage(targetUserId, { type: 'text', text: selfieResponse.comment });
                    console.error('[Scheduler] 랜덤 셀카 전송 실패 (텍스트 응답):', selfieResponse.comment);
                    saveLog('예진이', selfieResponse.comment);
                } else {
                    console.error('[Scheduler] 랜덤 셀카 전송 실패: 유효한 응답을 받지 못함');
                }
            } catch (error) {
                console.error('[Scheduler] 랜덤 셀카 전송 실패:', error);
            }
        }
    } else if (type === 'mood_message') {
        // 하루 11번 목표 (9시부터 23시까지 총 15시간 * 4 = 60번의 기회 중 11번 발송) -> 확률 11/60 = 약 0.183
        if (Math.random() < 0.183) {
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
                    console.log(`[Scheduler] 감성 메시지 중복 또는 너무 빠름 -> 전송 스킵`);
                }
            } catch (error) {
                console.error('감성 메시지 전송 실패:', error);
            }
        }
    } else if (type === 'couple_photo') {
        if (Math.random() < 0.12) { // 하루 2번 목표
            try {
                const randomCoupleIndex = Math.floor(Math.random() * (COUPLE_END_NUM - COUPLE_START_NUM + 1)) + COUPLE_START_NUM;
                const coupleFileName = String(randomCoupleIndex).padStart(6, '0') + '.jpg';
                const coupleImageUrl = COUPLE_BASE_URL + coupleFileName;

                const coupleComment = await getCouplePhotoReplyFromYeji();
                const nowTime = Date.now();

                if (
                    coupleImageUrl &&
                    coupleImageUrl !== lastCouplePhotoMessage &&
                    nowTime - lastCouplePhotoMessageTime > 60 * 1000
                ) {
                    await lineClient.pushMessage(targetUserId, [
                        { type: 'image', originalContentUrl: coupleImageUrl, previewImageUrl: coupleImageUrl },
                        { type: 'text', text: coupleComment || '아저씨랑 나랑 같이 있는 사진이야!' }
                    ]);
                    console.log(`[Scheduler] 랜덤 커플 사진 전송 성공: ${coupleImageUrl}`);
                    saveLog('예진이', coupleComment || '아저씨랑 나랑 같이 있는 사진이야!');
                    lastCouplePhotoMessage = coupleImageUrl;
                    lastCouplePhotoMessageTime = nowTime;
                } else {
                    console.log(`[Scheduler] 커플 사진 중복 또는 너무 빠름 -> 전송 스킵`);
                }
            } catch (error) {
                console.error('랜덤 커플 사진 전송 실패:', error);
            }
        }
    }
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

    // 2. 랜덤 감성 메시지 (매 15분마다 체크, 9시-23시 사이 하루 11회 목표)
    cron.schedule('*/15 * * * *', async () => {
        const currentHour = moment().tz('Asia/Tokyo').hour();
        if (currentHour >= 9 && currentHour < 24) { // 23시 59분까지 포함
            await sendScheduledMessage(lineClient, targetUserId, 'mood_message');
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 3. 셀카 및 커플 사진 메시지 (매 시간 30분마다 체크)
    cron.schedule('30 * * * *', async () => {
        await sendScheduledMessage(lineClient, targetUserId, 'selfie');
        await sendScheduledMessage(lineClient, targetUserId, 'couple_photo');
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
        const currentHour = moment().tz('Asia/Tokyo').hour();
        if (!isValidScheduleHour(moment().tz('Asia/Tokyo'))) {
            return;
        }

        if (now - bootTime < 3 * 60 * 1000) {
            console.log('[Scheduler-Silence] 서버 부팅 직후 3분 이내 -> 침묵 체크 스킵');
            return;
        }

        if (elapsedTimeSinceLastMessage >= SILENCE_THRESHOLD && elapsedTimeSinceLastProactive >= PROACTIVE_COOLDOWN) {
            console.log(`[Scheduler-Silence] 침묵 감지! (${moment.duration(elapsedTimeSinceLastMessage).humanize()} 동안 메시지 없음)`);
            try {
                const checkinMessage = await getSilenceCheckinMessage();
                if (checkinMessage) {
                    await lineClient.pushMessage(targetUserId, { type: 'text', text: checkinMessage });
                    console.log(`[Scheduler-Silence] 침묵 감지 메시지 전송: ${checkinMessage}`);
                    saveLog('예진이', checkinMessage);
                    lastProactiveSentTime = now;
                }
            } catch (error) {
                console.error('❌ [Scheduler-Silence Error] 침묵 감지 메시지 전송 실패:', error);
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
            const allMemories = await memoryManager.loadAllMemoriesFromDb();
            const remindersToSend = allMemories.filter(mem => {
                if (mem.reminder_time) {
                    const reminderMoment = moment(mem.reminder_time).tz('Asia/Tokyo');
                    return reminderMoment.isSameOrBefore(now.clone().add(1, 'minute')) && reminderMoment.isAfter(now.clone().subtract(5, 'minutes'));
                }
                return false;
            });

            for (const reminder of remindersToSend) {
                const reminderMessage = `아저씨! 지금 ${reminder.content} 할 시간이야! 🔔`;
                await lineClient.pushMessage(targetUserId, { type: 'text', text: reminderMessage });
                saveLog('예진이', reminderMessage);
                console.log(`[Scheduler-Reminder] 리마인더 전송: ${reminderMessage}`);

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
