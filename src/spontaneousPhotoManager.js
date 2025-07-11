// ✅ spontaneousPhotoManager.js v2.4 - 최종 안정화 버전

const schedule = require('node-schedule');
const moment = 'moment-timezone');
const path = require('path');
const fs = require('fs');
const { callOpenAI, cleanReply, saveLog } = require('./aiUtils');
const conversationContext = require('./ultimateConversationContext.js');

const IMAGE_DIR = path.join(process.cwd(), 'images');
let spontaneousPhotoJob = null;

async function sendRandomPhoto(client, userId) {
    try {
        if (!fs.existsSync(IMAGE_DIR)) return;
        const files = fs.readdirSync(IMAGE_DIR).filter(file => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()));
        if (files.length === 0) return;
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const imageUrl = `${process.env.BASE_URL}/images/${encodeURIComponent(randomFile)}`;
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        let caption = generateSelfieComment(emotionalState);

        if (Math.random() < 0.5) {
            const promptText = getAIPromptForSelfie(emotionalState);
            const messages = [
                { role: "system", content: "너는 아저씨의 귀여운 여자친구 예진이야. 애교 많고, 사랑스럽고, 항상 반말로만 대답해줘." },
                { role: "user", content: [ { type: "text", text: promptText }, { type: "image_url", image_url: { url: imageUrl } } ] }
            ];
            try {
                let aiCaption = await callOpenAI(messages, 'gpt-4o', 100, 0.7);
                aiCaption = cleanReply(aiCaption);
                if (aiCaption && aiCaption.length >= 3 && aiCaption.length <= 50) caption = aiCaption;
            } catch (aiError) { console.error('[SpontaneousPhoto] AI 캡션 생성 실패:', aiError); }
        }
        await client.pushMessage(userId, [
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
            { type: 'text', text: caption }
        ]);
        const logMessage = `(랜덤 사진 전송) ${caption}`;
        saveLog('예진이', logMessage);
        conversationContext.addUltimateMessage('예진이', logMessage);
    } catch (error) {
        console.error('[SpontaneousPhoto] ❌ 랜덤 사진 전송 실패:', error);
    }
}

function startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTimeFunc) {
    if (spontaneousPhotoJob) spontaneousPhotoJob.cancel();
    spontaneousPhotoJob = schedule.scheduleJob('*/30 * * * *', async () => {
        const hour = moment().tz('Asia/Tokyo').hour();
        if (hour < 8 || hour >= 22) return;
        const minutesSinceLastUserMessage = (Date.now() - getLastUserMessageTimeFunc()) / 60000;
        if (minutesSinceLastUserMessage >= 60 || Math.random() < 0.2) {
            await sendRandomPhoto(client, userId);
        }
    });
}

function generateSelfieComment(emotionalState) { const comments = { playful: ["아저씨! 사진 받아라~!", "내가 얼마나 예쁜지 봐봐!"], quiet: ["아저씨... 사진 보낼게", "아저씨한테만 보여주는 사진"], hurt: ["아저씨... 사진 보낼게 ㅠㅠ", "이거 보고 위로해줘"], anxious: ["아저씨... 사진 어때? 괜찮아?", "아저씨가 봐줘야 안심이 돼"], normal: ["아저씨! 나 사진 보낼게~", "아저씨 생각하면서 찍은 사진이야"] }; return comments[emotionalState] || comments.normal; }
function getAIPromptForSelfie(emotionalState) { const prompts = { playful: `기분 좋고 활발한 상태로 이 사진을 보내면서 신나고 밝은 멘트를 20자 이내로 짧게 해줘.`, quiet: `조용하고 차분한 상태로 아저씨에게 이 사진을 보내면서 잔잔하고 은은한 멘트를 20자 이내로 짧게 해줘.`, hurt: `서운하고 상처받은 상태로 아저씨에게 이 사진을 보내면서 애절하면서도 사랑스러운 멘트를 20자 이내로 짧게 해줘.`, anxious: `불안하고 걱정스러운 상태로 아저씨에게 이 사진을 보내면서 걱정스럽지만 사랑스러운 멘트를 20자 이내로 짧게 해줘.`, normal: `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 해줘.` }; return prompts[emotionalState] || prompts.normal; }
function getPhotoSchedulerStatus() { if (spontaneousPhotoJob) { const nextInvocation = spontaneousPhotoJob.nextInvocation(); if (nextInvocation) { return { minutesUntilNext: Math.round(moment(nextInvocation).diff(moment()) / 60000) }; } } return { minutesUntilNext: "N/A" }; }

module.exports = { startSpontaneousPhotoScheduler, getPhotoSchedulerStatus };
