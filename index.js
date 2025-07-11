// ✅ index.js v8.0 - "기억 통합 최종판"
// - [통합] memoryManager, memoryHandler를 완전히 제거하고, 통합된 commandHandler만 사용.
// - [통합] handleTextMessage가 context를 commandHandler에 전달하여 모든 명령을 처리.
// - [수정] 사진 응답(type: 'image')을 정상적으로 처리하도록 sendReply 로직 보강.

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
require('dotenv').config();

const { getReplyByMessage, cleanReply } = require('./src/autoReply');
const commandHandler = require('./src/commandHandler');
const { startAllSchedulers } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');
const conversationContext = require('./src/ultimateConversationContext.js');
const { initializeDamta } = require('./src/damta');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('예진이 v8.0 살아있어! (기억 통합 최종판)'));

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error');
    }
});

async function handleEvent(event) {
    if (event.source.userId !== userId || event.type !== 'message') {
        return;
    }
    conversationContext.updateLastUserMessageTime(event.timestamp);
    if (event.message.type === 'text') {
        await handleTextMessage(event);
    }
}

async function handleTextMessage(event) {
    const text = event.message.text.trim();
    conversationContext.addUltimateMessage('아저씨', text);

    const sulkyReliefMessage = await sulkyManager.handleUserResponse();
    if (sulkyReliefMessage) {
        await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
        conversationContext.addUltimateMessage('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let botResponse = null;

    // 통합된 commandHandler에 userMessage와 함께 conversationContext를 전달.
    botResponse = await commandHandler.handleCommand(text, conversationContext);

    // commandHandler가 처리할 명령을 찾지 못한 경우 일반 대화로 처리
    if (!botResponse) {
        botResponse = await getReplyByMessage(text);
    }

    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

async function sendReply(replyToken, botResponse) {
    try {
        if (botResponse.type === 'image') {
            await client.replyMessage(replyToken, [
                {
                    type: 'image',
                    originalContentUrl: botResponse.originalContentUrl,
                    previewImageUrl: botResponse.previewImageUrl,
                },
                {
                    type: 'text',
                    text: botResponse.caption
                }
            ]);
            conversationContext.addUltimateMessage('예진이', `(사진 전송) ${botResponse.caption}`);
        } else if (botResponse.type === 'text' && botResponse.comment) {
            const cleanedText = cleanReply(botResponse.comment);
            await client.replyMessage(replyToken, { type: 'text', text: cleanedText });
            conversationContext.addUltimateMessage('예진이', cleanedText);
        }

        // 봇이 응답했으므로, 삐짐 타이머 상태를 업데이트 (중앙 관리 방식)
        const sulkyState = conversationContext.getSulkinessState();
        sulkyState.lastBotMessageTime = Date.now();

    } catch (error) {
        console.error('[sendReply] 메시지 전송 실패:', error);
    }
}

async function initMuku() {
    try {
        await conversationContext.initializeEmotionalSystems();
        await initializeDamta();
        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);
    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`예진이 v8.0 서버 스타트! 포트: ${PORT}`);
    initMuku();
});
