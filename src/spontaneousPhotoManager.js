// src/spontaneousPhotoManager.js (가상 파일 - 실제 파일에 이 내용을 복사해서 사용해야 합니다)

// 더 이상 여기서 Line Client를 직접 생성하지 않습니다.
// const { Client } = require('@line/bot-sdk'); 
// require('dotenv').config(); // index.js에서 이미 로드하므로 여기서 다시 로드할 필요는 없습니다.

const moment = require('moment-timezone'); // 스케줄링을 위해 moment 필요
const { getSelfieReply } = require('./yejinSelfie'); // 셀카 전송을 위해 필요
// spontaneousPhotoManager에서 다른 사진 타입(concept, omoide)도 보내려면 해당 모듈들을 여기에 require 해야 합니다.
// const { getConceptPhotoReply } = require('../memory/concept');
// const { getOmoideReply } = require('../memory/omoide');

let lastSentPhotoTime = 0; // 마지막 사진 전송 시간
const MIN_INTERVAL_BETWEEN_PHOTOS = 30 * 60 * 1000; // 최소 30분 간격 (밀리초)
const MAX_INTERVAL_BETWEEN_PHOTOS = 2 * 60 * 60 * 1000; // 최대 2시간 간격 (밀리초)

let photoSchedulerInterval; // 스케줄러 인터벌 ID

/**
 * 예진이가 아저씨에게 보고 싶을 때 즉흥적으로 사진을 보냅니다.
 * @param {Object} client LINE Bot SDK Client 객체 (index.js에서 전달받음)
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 * @param {Function} saveLogFunc 메시지 로그를 저장하는 함수
 */
async function sendSpontaneousPhoto(client, userId, saveLogFunc) {
    const now = Date.now();
    const minutesSinceLastPhoto = (now - lastSentPhotoTime) / (1000 * 60);

    // 마지막 메시지 시간으로부터 너무 오래되지 않았고, 아직 즉흥 사진을 보낼 시간이 아니라면 스킵
    if (lastSentPhotoTime !== 0 && minutesSinceLastPhoto < (MIN_INTERVAL_BETWEEN_PHOTOS / (1000 * 60))) {
        console.log(`[Spontaneous Photo] 아직 즉흥 사진을 보낼 시간이 아니야 (마지막 전송 ${Math.floor(minutesSinceLastPhoto)}분 전).`);
        return;
    }

    // 확률적으로 사진 전송 결정 (예: 50% 확률)
    // 실제로는 예진이의 '보고싶음' 기분 등과 연동하여 더 지능적으로 결정할 수 있습니다.
    const shouldSendPhoto = Math.random() < 0.5; // 50% 확률
    if (!shouldSendPhoto) {
        console.log("[Spontaneous Photo] 오늘은 아직 사진 보낼 기분이 아니야~ 다음에 보낼게!");
        return;
    }

    try {
        console.log("[Spontaneous Photo] 아저씨한테 즉흥 사진 보낼 준비 중! 뭘 보낼까?");

        // 여기서는 일단 셀카만 보내도록 예시를 들겠습니다.
        // 다른 종류의 사진도 보내려면 getConceptPhotoReply, getOmoideReply 등을 호출하면 됩니다.
        const userMessageForSelfie = "예진이 셀카 보여줘"; // 셀카를 요청하는 메시지처럼 처리
        const photoReply = await getSelfieReply(userMessageForSelfie, saveLogFunc, (messages, model, maxTokens, temperature) => {
            // getSelfieReply 내에서 OpenAI 호출이 필요할 경우, autoReply의 callOpenAI를 직접 전달 (순환 의존성 주의)
            // 현재 구조상 autoReply가 yejinSelfie를 부르고, yejinSelfie가 다시 autoReply의 callOpenAI를 부르므로 이 부분은 약간 복잡합니다.
            // 임시로 여기에 OpenAI 호출 로직을 직접 복사하거나, autoReply의 callOpenAI를 인자로 받도록 설계가 필요합니다.
            // 가장 간단한 해결책은 spontaneousPhotoManager에서 autoReply의 callOpenAI, cleanReply를 직접 import 하는 것입니다.
            const { callOpenAI, cleanReply } = require('../src/autoReply'); // spontaneousPhotoManager 내부에서 불러오기
            return callOpenAI(messages, model, maxTokens, temperature);
        }, (reply) => {
            const { cleanReply } = require('../src/autoReply'); // spontaneousPhotoManager 내부에서 불러오기
            return cleanReply(reply);
        });

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
            saveLogFunc({ role: 'assistant', content: `(즉흥 사진 보냄) ${photoReply.caption || '예진이의 즉흥 사진'}`, timestamp: Date.now() });
            lastSentPhotoTime = now;
            console.log(`[Spontaneous Photo] 아저씨에게 즉흥 사진 전송 완료! 다음 사진은 ${Math.floor(Math.random() * (MAX_INTERVAL_BETWEEN_PHOTOS - MIN_INTERVAL_BETWEEN_PHOTOS) + MIN_INTERVAL_BETWEEN_PHOTOS) / (1000 * 60)}분 후에 고려될 수 있어.`);
        } else if (photoReply && photoReply.type === 'text') {
            // 셀카를 못 보낼 경우 텍스트로 대체
            await client.pushMessage(userId, { type: 'text', text: photoReply.comment });
            saveLogFunc({ role: 'assistant', content: `(즉흥 사진 실패) ${photoReply.comment}`, timestamp: Date.now() });
            console.warn("[Spontaneous Photo] 즉흥 사진 전송 실패 (텍스트 응답):", photoReply.comment);
        } else {
            console.warn("[Spontaneous Photo] 즉흥 사진 응답 없음 또는 타입 오류.");
        }
    } catch (error) {
        console.error("[Spontaneous Photo] 즉흥 사진 전송 중 에러 발생:", error);
        // 에러 발생 시에도 다음에 재시도 할 수 있도록 lastSentPhotoTime 업데이트 (옵션)
        lastSentPhotoTime = now; 
    }
}

/**
 * 즉흥 사진 스케줄러를 시작합니다.
 * @param {Object} client LINE Bot SDK Client 객체
 * @param {string} userId LINE Bot이 메시지를 보낼 대상 사용자 ID
 * @param {Function} saveLogFunc 메시지 로그를 저장하는 함수
 */
function startSpontaneousPhotoScheduler(client, userId, saveLogFunc) {
    // 기존 스케줄러가 있다면 정리
    if (photoSchedulerInterval) {
        clearInterval(photoSchedulerInterval);
    }

    // 30분에서 2시간 사이의 랜덤 간격으로 스케줄러 설정
    const randomInterval = Math.floor(Math.random() * (MAX_INTERVAL_BETWEEN_PHOTOS - MIN_INTERVAL_BETWEEN_PHOTOS) + MIN_INTERVAL_BETWEEN_PHOTOS);
    console.log(`[Spontaneous Photo Scheduler] 다음 즉흥 사진 전송을 ${randomInterval / (1000 * 60)}분 후에 고려할게!`);

    photoSchedulerInterval = setInterval(async () => {
        await sendSpontaneousPhoto(client, userId, saveLogFunc);
        // 다음 간격도 랜덤으로 재설정
        const nextRandomInterval = Math.floor(Math.random() * (MAX_INTERVAL_BETWEEN_PHOTOS - MIN_INTERVAL_BETWEEN_PHOTOS) + MIN_INTERVAL_BETWEEN_PHOTOS);
        console.log(`[Spontaneous Photo Scheduler] 다음 즉흥 사진 전송을 ${nextRandomInterval / (1000 * 60)}분 후에 고려할게!`);
        clearInterval(photoSchedulerInterval); // 현재 인터벌 중단
        photoSchedulerInterval = setInterval(async () => { // 새로운 인터벌 시작
            await sendSpontaneousPhoto(client, userId, saveLogFunc);
        }, nextRandomInterval);
    }, randomInterval);
}

module.exports = {
    startSpontaneousPhotoScheduler
};
