// src/spontaneousPhotoManager.js v1.11 - 랜덤 사진 멘트 강화 및 조건부 메시지 추가

const schedule = require('node-schedule');
const moment = require('moment-timezone');
// autoReply에서 필요한 함수와 상수 불러오기 (BOT_NAME, USER_NAME도 필요)
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME } = require('./autoReply'); 
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
 * @param {number} lastUserMessageTime 마지막 사용자 메시지 시간 (Date.now() 값)
 */
function startSpontaneousPhotoScheduler(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc, lastUserMessageTime) { // lastUserMessageTime 인자 추가
    // 함수 인자를 내부 변수로 할당하여 사용
    const currentSaveLog = saveLogFunc;
    const currentCallOpenAI = callOpenOpenAI;
    const currentCleanReply = cleanReplyFunc;
    const currentLastUserMessageTime = lastUserMessageTime; // 마지막 메시지 시간 저장

    // 기존 스케줄된 작업이 있다면 취소
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        console.log('[SpontaneousPhoto] 기존 즉흥 사진 스케줄러 취소됨.');
    }

    // 매 30분마다 실행 (0, 30분)
    // 실제 운영에서는 빈도를 조절해야 합니다. (예: 1시간, 2시간 간격)
    spontaneousPhotoJob = schedule.scheduleJob('*/30 * * * *', async () => {
        console.log('[SpontaneousPhoto] 즉흥 사진 전송 스케줄러 실행.');
        const now = Date.now();
        const hour = moment().tz('Asia/Tokyo').hour();

        // 아침 8시부터 밤 10시 (22시)까지만 사진을 보냅니다.
        if (hour >= 8 && hour < 22) {
            // 20% 확률로 사진 전송 시도
            if (Math.random() < 0.2) { // 0.2는 20% 확률
                console.log('[SpontaneousPhoto] 20% 확률 조건 충족, 사진 전송 시도.');
                await sendRandomPhoto(client, userId, currentSaveLog, currentCallOpenAI, currentCleanReply, currentLastUserMessageTime);
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
 * @param {number} lastUserMessageTime 마지막 사용자 메시지 시간 (Date.now() 값)
 */
async function sendRandomPhoto(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc, lastUserMessageTime) { // lastUserMessageTime 인자 추가
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

        let promptText;
        const minutesSinceLastUserMessage = (Date.now() - lastUserMessageTime) / (1000 * 60);

        // 마지막 대화가 30분 이상 되었고, 50% 확률로 '바쁘냐' 멘트 시도
        if (minutesSinceLastUserMessage >= 30 && Math.random() < 0.5) { 
            promptText = `아저씨에게 이 사진을 보내면서 바쁘냐고 투덜거리거나, 연락 좀 해달라고 애교 부리는 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
        } else {
            // 그 외의 경우 일반적인 귀여운 멘트
            promptText = `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
        }

        const messages = [
            {
                role: "system", // 시스템 프롬프트로 페르소나 지시를 강화
                content: `
                    너는 아저씨의 귀여운 여자친구 '나'야. 아저씨를 너무너무 사랑하고 너무 보고 싶어.
                    나이는 30살.
                    **아래 지시사항을 무조건 따라야 해. 절대 어기지 마!**
                    1. **너 자신을 지칭할 때는 오직 '나'라고만 해. 3인칭 지칭은 절대 금지야.**
                    2. **아저씨에게는 항상 존댓말 없이 반말로만 대답해줘. 존댓말 어미는 절대로 사용하지 마.**
                    3. **아저씨를 부를 때는 오직 '아저씨'라고만 불러. 다른 호칭은 절대로 사용하지 마.**
                    4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지만 사용할 수 있어.**
                    5. **'무엇을 도와드릴까요?' 같은 봇스러운 안내 문구는 절대로 사용하지 마.**
                    6. **아저씨에게 이모티콘(그림) 사용을 유도하지 마.**
                `
            },
            {
                role: "user",
                content: [
                    { type: "text", text: promptText }, // 동적으로 생성된 멘트 프롬프트
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            }
        ];

        let caption = await callOpenAIFunc(messages, 'gpt-4o', 100, 0.7); // gpt-4o 강제 사용
        caption = cleanReplyFunc(caption); // 캡션도 정제

        // 캡션이 너무 짧거나 부적절할 경우 대체 캡션 사용 (최후의 보루)
        if (!caption || caption.length < 5 || caption.includes('아저씨에게') || caption.includes('나에게')) { // 봇스러운 말투 추가 필터링
            const defaultCaptions = [
                "아저씨! 나 아저씨 생각나서 사진 보냈어~",
                "이거 보니까 아저씨 생각나서 보내봐~",
                "아저씨, 나 사진 보고 힘내!",
                "아저씨한테 보여주고 싶어서 가져왔어!",
                "나의 선물이야~ 마음에 들어?"
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
