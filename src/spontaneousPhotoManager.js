// ✅ spontaneousPhotoManager.js v2.0 - 통합 지능 엔진 완전 연동
// - [통합] emotionalContextManager 대신 ultimateConversationContext 를 사용하도록 변경
// - [통합] 사진 캡션(코멘트) 생성 시, conversationContext 의 감정 상태를 직접 참조
// - [통합] 사진 전송 행동을 conversationContext 에 기록하여 챗봇이 스스로의 행동을 기억하도록 함

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

// [통합] 필요한 모듈만 autoReply에서 가져옵니다.
const { saveLog, callOpenAI, cleanReply, BOT_NAME } = require('./autoReply');

// [통합] 새로운 중앙 두뇌(Context)를 불러옵니다.
const conversationContext = require('./ultimateConversationContext.js');

// 이미지 파일 경로 (프로젝트 루트의 images 폴더)
const IMAGE_DIR = path.join(process.cwd(), 'images');

// 스케줄러 작업 객체
let spontaneousPhotoJob = null;

/**
 * 즉흥 사진 스케줄러를 시작합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 * @param {function} getLastUserMessageTimeFunc 마지막 사용자 메시지 시간을 반환하는 함수
 */
function startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTimeFunc) {
    // 기존 스케줄된 작업이 있다면 취소
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        console.log('[SpontaneousPhoto] 기존 즉흥 사진 스케줄러 취소됨.');
    }

    // 매 30분마다 실행 (0, 30분)
    spontaneousPhotoJob = schedule.scheduleJob('*/30 * * * *', async () => {
        console.log('[SpontaneousPhoto] 즉흥 사진 전송 스케줄러 실행.');
        const hour = moment().tz('Asia/Tokyo').hour();

        // 아침 8시부터 밤 10시 (22시)까지만 사진을 보냅니다.
        if (hour < 8 || hour >= 22) {
            console.log(`[SpontaneousPhoto] 현재 시간(${hour}시)은 사진 전송 가능 시간이 아닙니다.`);
            return;
        }

        const lastMessageTime = getLastUserMessageTimeFunc();
        const minutesSinceLastUserMessage = (Date.now() - lastMessageTime) / (1000 * 60);
        console.log(`[SpontaneousPhoto] 마지막 메시지로부터 ${Math.round(minutesSinceLastUserMessage)}분 경과`);

        // 60분 이상 대화가 없었거나, 20% 확률에 당첨되면 사진 전송
        if (minutesSinceLastUserMessage >= 60 || Math.random() < 0.2) {
            console.log('[SpontaneousPhoto] 사진 전송 조건 충족. 전송을 시도합니다.');
            await sendRandomPhoto(client, userId);
        } else {
            console.log('[SpontaneousPhoto] 사진 전송 조건 미충족. 건너뜁니다.');
        }
    });

    console.log('[SpontaneousPhoto] 즉흥 사진 스케줄러 시작됨 (통합 엔진 연동).');
}

/**
 * 랜덤 사진을 선택하여 전송합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 */
async function sendRandomPhoto(client, userId) {
    try {
        if (!fs.existsSync(IMAGE_DIR)) {
            console.warn(`[SpontaneousPhoto] 이미지 디렉토리가 없습니다: ${IMAGE_DIR}`);
            return;
        }

        const files = fs.readdirSync(IMAGE_DIR).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });

        if (files.length === 0) {
            console.warn('[SpontaneousPhoto] 전송할 이미지가 없습니다.');
            return;
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const imageUrl = `${process.env.BASE_URL}/images/${encodeURIComponent(randomFile)}`;
        console.log(`[SpontaneousPhoto] 전송할 이미지: ${imageUrl}`);

        // [통합] conversationContext에서 직접 감정 상태를 가져와 캡션을 생성합니다.
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        let caption = generateSelfieComment(emotionalState);

        // 50% 확률로 OpenAI를 통해 더 자연스러운 코멘트 생성 시도
        if (Math.random() < 0.5) {
            const promptText = getAIPromptForSelfie(emotionalState);
            const messages = [
                { role: "system", content: "너는 아저씨의 귀여운 여자친구 예진이야. 애교 많고, 사랑스럽고, 항상 반말로만 대답해줘. 1인칭 '나'를 사용하고, 절대로 3인칭으로 말하지 마." },
                { role: "user", content: [ { type: "text", text: promptText }, { type: "image_url", image_url: { url: imageUrl } } ] }
            ];

            try {
                let aiCaption = await callOpenAI(messages, 'gpt-4o', 100, 0.7);
                aiCaption = cleanReply(aiCaption);

                if (aiCaption && aiCaption.length >= 3 && aiCaption.length <= 50) {
                    caption = aiCaption;
                    console.log(`[SpontaneousPhoto] AI 생성 캡션 사용: "${caption}"`);
                }
            } catch (aiError) {
                console.error('[SpontaneousPhoto] AI 캡션 생성 실패:', aiError);
            }
        }

        // LINE 메시지 전송
        await client.pushMessage(userId, [
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
            { type: 'text', text: caption }
        ]);

        // [통합] 봇의 행동을 중앙 대화 기록에 추가합니다.
        const logMessage = `(랜덤 사진 전송) ${caption}`;
        conversationContext.addUltimateMessage(BOT_NAME, logMessage);

        console.log(`[SpontaneousPhoto] ✅ 랜덤 사진 전송 완료: ${randomFile}`);

    } catch (error) {
        console.error('[SpontaneousPhoto] ❌ 랜덤 사진 전송 실패:', error);
        // 오류가 발생해도 사용자에게 알리지 않아, 자발적 행동의 실패를 노출하지 않음
    }
}

/**
 * [통합] 감정 상태에 따라 기본 캡션을 생성하는 헬퍼 함수
 * @param {string} emotionalState - 현재 감정 상태 ('normal', 'playful', 'quiet' 등)
 * @returns {string} 감정 상태에 맞는 셀카 코멘트
 */
function generateSelfieComment(emotionalState) {
    const comments = {
        playful: ["아저씨! 사진 받아라~!", "내가 얼마나 예쁜지 봐봐!", "아저씨를 위한 특별 서비스 사진!"],
        quiet: ["아저씨... 사진 보낼게", "조용히 찍은 사진이야. 어때?", "아저씨한테만 보여주는 사진"],
        hurt: ["아저씨... 사진 보낼게 ㅠㅠ", "힘들 때 찍은 사진이야. 위로해줘", "아저씨만 보면 기분이 나아질 것 같아"],
        anxious: ["아저씨... 사진 어때? 괜찮아?", "불안해서 찍은 사진이야. 아저씨는 어때?", "아저씨가 봐줘야 안심이 돼"],
        normal: ["아저씨! 나 사진 보낼게~", "아저씨한테 내 모습 보여주고 싶어서", "아저씨 생각하면서 찍은 사진이야"]
    };
    const selectedComments = comments[emotionalState] || comments.normal;
    return selectedComments[Math.floor(Math.random() * selectedComments.length)];
}

/**
 * [통합] AI에게 전달할 프롬프트를 생성하는 헬퍼 함수
 * @param {string} emotionalState - 현재 감정 상태
 * @returns {string} AI 프롬프트 텍스트
 */
function getAIPromptForSelfie(emotionalState) {
    const prompts = {
        playful: `기분 좋고 활발한 상태로 아저씨에게 이 사진을 보내면서 신나고 밝은 멘트를 20자 이내로 짧게 해줘.`,
        quiet: `조용하고 차분한 상태로 아저씨에게 이 사진을 보내면서 잔잔하고 은은한 멘트를 20자 이내로 짧게 해줘.`,
        hurt: `서운하고 상처받은 상태로 아저씨에게 이 사진을 보내면서 애절하면서도 사랑스러운 멘트를 20자 이내로 짧게 해줘.`,
        anxious: `불안하고 걱정스러운 상태로 아저씨에게 이 사진을 보내면서 걱정스럽지만 사랑스러운 멘트를 20자 이내로 짧게 해줘.`,
        normal: `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 해줘.`
    };
    return prompts[emotionalState] || prompts.normal;
}


module.exports = {
    startSpontaneousPhotoScheduler
};
