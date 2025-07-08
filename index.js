// ✅ 파일: index.js
// ✅ 버전: v1.5 - scheduler require 누락 수정, CHANNEL 환경 변수명 확인

const line = require('@line/bot-sdk');
const express = require('express');
const { getReplyByMessage, getReplyByImagePrompt, checkModelSwitchCommand, saveLog } = require('./src/autoReply');
const { updateLastUserMessageTime } = require('./src/scheduler');
const scheduler = require('./src/scheduler'); // ✅ 빠졌던 이 줄 추가!
const omoide = require('./memory/omoide');
const concept = require('./memory/concept');

require('dotenv').config(); // .env 환경변수 로드

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN, // ✅ 변수명 정확히 확인
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

// ✅ 웹훅 이벤트 핸들러
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error('[index.js] 웹훅 처리 에러:', err);
            res.status(500).end();
        });
});

// ✅ 메시지 이벤트 핸들러
async function handleEvent(event) {
    if (event.type !== 'message') return null;

    updateLastUserMessageTime();

    if (event.message.type === 'text') {
        const userMessage = event.message.text;
        console.log(`[Webhook] 아저씨 메시지 수신: "${userMessage}"`);
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });

        let reply = null;

        const modelSwitchReply = checkModelSwitchCommand(userMessage);
        if (modelSwitchReply) {
            reply = { type: 'text', comment: modelSwitchReply };
        } else {
            reply = await getReplyByMessage(userMessage);
        }

        if (reply && reply.type === 'text' && reply.comment) {
            await client.replyMessage(event.replyToken, { type: 'text', text: reply.comment });
            return;
        }

        // 📸 omoide 사진 처리
        const photoReply = await omoide.getOmoideReply(userMessage, saveLog);
        if (photoReply) {
            if (photoReply.type === 'photo') {
                await client.replyMessage(event.replyToken, [
                    { type: 'image', originalContentUrl: photoReply.url, previewImageUrl: photoReply.url },
                    { type: 'text', text: photoReply.caption }
                ]);
            } else {
                await client.replyMessage(event.replyToken, { type: 'text', text: photoReply.comment });
            }
            return;
        }

        // 📸 concept 사진 처리
        const conceptReply = await concept.getConceptPhotoReply(userMessage, saveLog);
        if (conceptReply) {
            if (conceptReply.type === 'photo') {
                await client.replyMessage(event.replyToken, [
                    { type: 'image', originalContentUrl: conceptReply.url, previewImageUrl: conceptReply.url },
                    { type: 'text', text: conceptReply.caption }
                ]);
            } else {
                await client.replyMessage(event.replyToken, { type: 'text', text: conceptReply.comment });
            }
            return;
        }

        // 🔚 Fallback
        const fallbackMessage = "음... 아저씨, 무슨 말인지 잘 모르겠어 ㅠㅠ 다시 한번 말해줄래?";
        await client.replyMessage(event.replyToken, { type: 'text', text: fallbackMessage });
        saveLog({ role: 'assistant', content: fallbackMessage, timestamp: Date.now() });

    } else if (event.message.type === 'image') {
        const content = await client.getMessageContent(event.message.id);
        const buffer = [];
        content.on('data', chunk => buffer.push(chunk));
        content.on('end', async () => {
            const base64Image = Buffer.concat(buffer).toString('base64');
            const fullBase64 = `data:image/jpeg;base64,${base64Image}`;
            const replyText = await getReplyByImagePrompt(fullBase64);
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
            saveLog({ role: 'user', content: `[이미지 전송]`, timestamp: Date.now() });
            saveLog({ role: 'assistant', content: replyText, timestamp: Date.now() });
        });
        return;
    }

    return null;
}

// ✅ 서버 실행
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`무쿠 서버 스타트! 포트: ${port}`);

    const LINE_TARGET_USER_ID = process.env.LINE_TARGET_USER_ID;
    if (LINE_TARGET_USER_ID) {
        scheduler.startAllSchedulers(client, LINE_TARGET_USER_ID);
        console.log("✅ 모든 스케줄러 시작!");
    } else {
        console.warn("⚠️ LINE_TARGET_USER_ID 환경 변수가 설정되지 않아 스케줄러가 시작되지 않습니다.");
    }
});
