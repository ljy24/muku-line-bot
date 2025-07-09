// src/spontaneousPhotoManager.js - v1.1 (항상 셀카 전송)

const moment = require('moment-timezone'); // 스케줄링을 위해 moment 필요
const { getSelfieReply } = require('./yejinSelfie'); // 셀카 전송을 위해 필요 (yejinSelfie.js 파일이 필요합니다)
// spontaneousPhotoManager에서 다른 사진 타입(concept, omoide)도 보내려면 해당 모듈들을 여기에 require 해야 합니다.
// const { getConceptPhotoReply } = require('../memory/concept'); // 필요시 주석 해제 및 사용
// const { getOmoideReply } = require('../memory/omoide');       // 필요시 주석 해제 및 사용

let lastSentPhotoTime = 0; // 마지막 사진 전송 시간
const MIN_INTERVAL_BETWEEN_PHOTOS = 30 * 60 * 1000; // 최소 30분 간격 (밀리초)
const MAX_INTERVAL_BETWEEN_PHOTOS = 2 * 60 * 60 * 1000; // 최대 2시간 간격 (밀리초)

let photoSchedulerInterval; // 스케줄러 인터벌 ID

/**
 * 예진이가 아저씨에게 보고 싶을 때 즉흥적으로 사진을 보냅니다.
 * @param {Object} client LINE Bot SDK Client 객체 (index.js에서 전달받음)
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 * @param {Function} saveLogFunc 메시지 로그를 저장하는 함수
 * @param {Function} callOpenAIFunc OpenAI API 호출 함수 (autoReply에서 전달받음)
 * @param {Function} cleanReplyFunc OpenAI 응답 정제 함수 (autoReply에서 전달받음)
 */
async function sendSpontaneousPhoto(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    const now = Date.now();
    const minutesSinceLastPhoto = (now - lastSentPhotoTime) / (1000 * 60);

    // 마지막 사진 전송 시간으로부터 최소 간격이 지나지 않았다면 스킵
    if (lastSentPhotoTime !== 0 && minutesSinceLastPhoto < (MIN_INTERVAL_BETWEEN_PHOTOS / (1000 * 60))) {
        console.log(`[Spontaneous Photo] 아직 즉흥 사진을 보낼 시간이 아니야 (마지막 전송 ${Math.floor(minutesSinceLastPhoto)}분 전).`);
        return;
    }

    // ⭐⭐⭐ 수정: 항상 사진을 보내도록 변경 ⭐⭐⭐
    const shouldSendPhoto = true; // 무조건 사진을 보냅니다.
    // if (!shouldSendPhoto) { // 이 조건문은 이제 필요 없습니다.
    //     console.log("[Spontaneous Photo] 오늘은 아직 사진 보낼 기분이 아니야~ 다음에 보낼게!");
    //     return;
    // }

    try {
        console.log("[Spontaneous Photo] 아저씨한테 즉흥 사진 보낼 준비 중! 뭘 보낼까?");

        const { callOpenAI, cleanReply } = require('../src/autoReply'); // autoReply에서 필요한 함수 import

        // userMessageForSelfie는 getSelfieReply가 내부적으로 OpenAI 호출에 사용할 텍스트 프롬프트입니다.
        const userMessageForSelfie = "예진이 셀카 보여줘"; 
        const photoReply = await getSelfieReply(userMessageForSelfie, saveLogFunc, callOpenAI, cleanReply); 

        if (photoReply && photoReply.type === 'image') {
            const messagesToSend = [
                {
                    type: 'image',
                    originalContentUrl: photoReply.originalContentUrl,
                    previewImageUrl: photoReply.previewImageUrl,
                    altText: photoReply.altText || photoReply.caption || '예진이의 즉흥 사진'
                }
            ];
            if (photoReply.caption) {
                messagesToSend.push({
                    type: 'text',
                    text: photoReply.caption
                });
            }
            
            await client.pushMessage(userId, messagesToSend);
            saveLogFunc({ role: 'assistant', content: `(즉흥 사진 보냄) ${photoReply.caption || '예진이의 즉흥 사진'}`, timestamp: now }); 
            lastSentPhotoTime = now;
            console.log(`[Spontaneous Photo] 아저씨에게 즉흥 사진 전송 완료! 다음 사진은 ${Math.floor(Math.random() * (MAX_INTERVAL_BETWEEN_PHOTOS - MIN_INTERVAL_BETWEEN_PHOTOS) + MIN_INTERVAL_BETWEEN_PHOTOS) / (1000 * 60)}분 후에 고려될 수 있어.`);
        } else if (photoReply && photoReply.type === 'text') {
            // 셀카를 못 보낼 경우 텍스트로 대체
            await client.pushMessage(userId, { type: 'text', text: photoReply.comment });
            saveLogFunc({ role: 'assistant', content: `(즉흥 사진 실패) ${photoReply.comment}`, timestamp: now }); 
            console.warn("[Spontaneous Photo] 즉흥 사진 전송 실패 (텍스트 응답):", photoReply.comment);
        } else {
            console.warn("[Spontaneous Photo] 즉흥 사진 응답 없음 또는 타입 오류.");
        }
    } catch (error) {
        console.error("[Spontaneous Photo] 즉흥 사진 전송 중 에러 발생:", error);
        lastSentPhotoTime = now; 
    }
}

/**
 * 즉흥 사진 스케줄러를 시작합니다.
 * @param {Object} client LINE Bot SDK Client 객체
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 * @param {Function} saveLogFunc 메시지 로그를 저장하는 함수
 * @param {Function} callOpenAIFunc OpenAI API 호출 함수 (index.js에서 전달받음)
 * @param {Function} cleanReplyFunc OpenAI 응답 정제 함수 (index.js에서 전달받음)
 */
function startSpontaneousPhotoScheduler(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    // 기존 스케줄러가 있다면 정리
    if (photoSchedulerInterval) {
        clearInterval(photoSchedulerInterval);
    }

    // 초기 실행 및 주기적인 스케줄링
    const scheduleNextPhoto = () => {
        const randomInterval = Math.floor(Math.random() * (MAX_INTERVAL_BETWEEN_PHOTOS - MIN_INTERVAL_BETWEEN_PHOTOS) + MIN_INTERVAL_BETWEEN_PHOTOS);
        console.log(`[Spontaneous Photo Scheduler] 다음 즉흥 사진 전송을 ${Math.floor(randomInterval / (1000 * 60))}분 후에 고려할게!`);

        photoSchedulerInterval = setTimeout(async () => { 
            // sendSpontaneousPhoto에 인자들을 모두 전달
            await sendSpontaneousPhoto(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc); 
            scheduleNextPhoto(); // 다음 사진 스케줄링
        }, randomInterval);
    };

    scheduleNextPhoto(); // 첫 스케줄 시작
}

module.exports = {
    startSpontaneousPhotoScheduler
};
