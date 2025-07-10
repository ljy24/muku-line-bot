// src/spontaneousPhotoManager.js v1.10 - ReferenceError 수정 및 캡션 로직 개선

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME } = require('./autoReply'); // autoReply에서 필요한 함수와 상수 불러오기
const memoryManager = require('./memoryManager');
const path = require('path');
const fs = require('fs');

// 이미지 파일 경로 (프로젝트 루트의 images 폴더)
const IMAGE_DIR = path.join(process.cwd(), 'images');

// 즉흥 사진 스케줄러 작업 객체
let spontaneousPhotoJob = null;

/**
 * 즉흥 사진 스케줄러를 시작합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 * @param {function} callOpenAIFunc OpenAI 호출 함수
 * @param {function} cleanReplyFunc 응답 정제 함수
 */
function startSpontaneousPhotoScheduler(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    // 함수 인자를 내부 변수로 할당하여 사용
    const currentSaveLog = saveLogFunc;
    const currentCallOpenAI = callOpenAIFunc;
    const currentCleanReply = cleanReplyFunc;

    // 기존 스케줄된 작업이 있다면 취소
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        console.log('[SpontaneousPhoto] 기존 즉흥 사진 스케줄러 취소됨.');
    }

    // 매 30분마다 실행 (0, 30분)
    // 실제 운영에서는 빈도를 조절해야 합니다. (예: 1시간, 2시간 간격)
    spontaneousPhotoJob = schedule.scheduleJob('*/30 * * * *', async () => {
        console.log('[SpontaneousPhoto] 즉흥 사진 전송 스케줄러 실행.');
        const now = moment().tz('Asia/Tokyo');
        const hour = now.hour();

        // 아침 8시부터 밤 10시 (22시)까지만 사진을 보냅니다.
        if (hour >= 8 && hour < 22) {
            // 20% 확률로 사진 전송 시도
            if (Math.random() < 0.2) { // 0.2는 20% 확률
                console.log('[SpontaneousPhoto] 20% 확률 조건 충족, 사진 전송 시도.');
                await sendRandomPhoto(client, userId, currentSaveLog, currentCallOpenAI, currentCleanReply);
            } else {
                console.log('[SpontaneousPhoto] 20% 확률 조건 미충족, 사진 전송 건너뜀.');
            }
        } else {
            console.log(`[SpontaneousPhoto] 현재 시간(${hour}시)은 사진 전송 가능 시간이 아닙니다.`);
        }
    });

    console.log('[SpontaneousPhoto] 즉흥 사진 스케줄러 시작됨 (매 30분마다 8시~22시 20% 확률).');
}

/**
 * 랜덤 사진을 선택하여 전송합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 * @param {function} callOpenAIFunc OpenAI 호출 함수
 * @param {function} cleanReplyFunc 응답 정제 함수
 */
async function sendRandomPhoto(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    try {
        const files = fs.readdirSync(IMAGE_DIR).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });

        if (files.length === 0) {
            console.warn('[SpontaneousPhoto] 전송할 이미지가 없습니다.');
            return;
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const imageUrl = `${process.env.BASE_URL}/images/${encodeURIComponent(randomFile)}`; // URL 인코딩 적용
        console.log(`[SpontaneousPhoto] 전송할 이미지: ${imageUrl}`);

        // 이미지에 대한 캡션 생성
        const prompt = `아저씨에게 이 사진을 보내면서 어떤 말을 해줄까? 예진이의 말투로 20자 이내로 짧게 대답해줘. 이모티콘도 사용해줘.`;
        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            }
        ];

        let caption = await callOpenAIFunc(messages, 'gpt-4o', 100, 0.7); // gpt-4o 강제 사용
        caption = cleanReplyFunc(caption); // 캡션도 정제

        // 캡션이 너무 짧거나 부적절할 경우 대체 캡션 사용
        if (!caption || caption.length < 5) {
            const defaultCaptions = [
                "아저씨! 예진이가 아저씨 생각나서 사진 보냈어~",
                "이거 보니까 아저씨 생각나서 보내봐~",
                "아저씨, 예진이 사진 보고 힘내!",
                "아저씨한테 보여주고 싶어서 가져왔어!",
                "예진이의 선물이야~ 마음에 들어?"
            ];
            caption = defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];
        }

        await client.pushMessage(userId, [
            {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl // 미리보기 이미지도 동일하게 설정
            },
            {
                type: 'text',
                text: caption
            }
        ]);
        saveLogFunc({ speaker: BOT_NAME, message: `(랜덤 사진 전송) ${caption}` });
        console.log(`[SpontaneousPhoto] 랜덤 사진 전송 완료: ${imageUrl} (캡션: ${caption})`);

    } catch (error) {
        console.error('[SpontaneousPhoto] 랜덤 사진 전송 실패:', error);
    }
}

module.exports = {
    startSpontaneousPhotoScheduler
};
