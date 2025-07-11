// --- START OF FILE: index.js ---
// ✅ index.js v6.3 - "Photo Feedback Mode" Trigger Implemented & Length Fix

// 📦 필수 모듈 불러오기
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
require('dotenv').config();

// 🆕 autoReply 모듈에서는 '답장 생성' 관련 기능만 가져옵니다.
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply,
    callOpenAI,
    BOT_NAME,
    USER_NAME
} = require('./src/autoReply');

// 🆕 다른 핵심 모듈들 불러오기
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');

// [핵심] 새로운 '마음과 기억' 엔진을 불러옵니다.
const conversationContext = require('./src/ultimateConversationContext.js');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('예진이 v6.3 살아있어! (맥락/길이 개선)'));

app.get('/status', (req, res) => {
    try {
        const internalState = conversationContext.getInternalState();
        res.json({
            timestamp: new Date().toISOString(),
            version: 'v6.3',
            ...internalState
        });
    } catch (error) {
        res.status(500).json({ error: '상태 조회 실패' });
    }
});

// 🎣 LINE 웹훅 요청 처리 (메인 관제실)
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        await Promise.all(events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error');
    }
});

// 이벤트별 처리
async function handleEvent(event) {
    if (event.source.userId !== userId || event.type !== 'message') return;

    conversationContext.updateLastUserMessageTime(event.timestamp);

    switch (event.message.type) {
        case 'text':
            await handleTextMessage(event);
            break;
        case 'image':
            await handleImageMessage(event);
            break;
    }
}

// ✍️ 텍스트 메시지 처리
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    saveLog(USER_NAME, text);
    conversationContext.addUltimateMessage(USER_NAME, text);

    const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
    if (sulkyReliefMessage) {
        await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
        saveLog(BOT_NAME, `(삐짐 해소) ${sulkyReliefMessage}`);
        conversationContext.addUltimateMessage(BOT_NAME, sulkyReliefMessage);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let botResponse = null;
    botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory) ||
                  await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

    if (!botResponse) {
        // [수정] autoReply에게 '답장 생성'을 요청하며 필요한 함수들을 모두 전달합니다.
        botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
        await memoryManager.extractAndSaveMemory(text);
    }

    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

// 🖼️ 이미지 메시지 처리
async function handleImageMessage(event) {
    try {
        conversationContext.addUltimateMessage(USER_NAME, "(사진 보냄)", { type: 'image' });
        const stream = await client.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const base64ImageWithPrefix = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix);
        if (replyResult) {
            await sendReply(event.replyToken, replyResult);
        }
    } catch (err) {
        console.error(`[Image] 이미지 처리 실패:`, err);
        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
    }
}

// 📤 응답 전송 및 후처리 (공통 함수)
async function sendReply(replyToken, botResponse) {
    let messagesToReply = [];
    let loggableText = '';

    const responseText = botResponse.type === 'image' ? botResponse.caption : botResponse.comment;
    const cleanedText = cleanAndVerifyFirstPerson(responseText);

    if (botResponse.type === 'image') {
        messagesToReply.push({
            type: 'image',
            originalContentUrl: botResponse.originalContentUrl,
            previewImageUrl: botResponse.previewImageUrl,
        });
    }
    if (cleanedText) {
        messagesToReply.push({ type: 'text', text: cleanedText });
        loggableText = cleanedText;
    }

    if (messagesToReply.length > 0) {
        await client.replyMessage(replyToken, messagesToReply);

        // [핵심 수정] 만약 보낸 메시지가 이미지라면, '사진 피드백 대기 모드'를 켭니다!
        if (botResponse.type === 'image') {
            conversationContext.setPendingAction('awaiting_photo_reaction');
        }

        if (loggableText) {
            saveLog(BOT_NAME, loggableText);
            conversationContext.addUltimateMessage(BOT_NAME, loggableText);
        }
        sulkyManager.startSulkyTimer(client, userId, saveLog);
    }
}

// 🙋‍♀️ 1인칭 변환기 (공통 함수)
function cleanAndVerifyFirstPerson(text) {
    if (!text) return "";
    let cleanedText = cleanReply(text);
    if (cleanedText.includes('무쿠') || cleanedText.includes('예진이')) {
        cleanedText = cleanedText
            .replace(/무쿠가|예진이가/g, '내가')
            .replace(/무쿠는|예진이는/g, '나는')
            .replace(/무쿠를|예진이를/g, '나를')
            .replace(/무쿠|예진이/g, '나');
    }
    return cleanedText;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`예진이 v6.3 서버 스타트! 포트: ${PORT}`);
    initMuku();
});

// ✅ 비동기 초기화 함수 정의
async function initMuku() {
    try {
        await memoryManager.ensureMemoryTablesAndDirectory();
        await conversationContext.initializeEmotionalSystems();
        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);
        // ... (자발적 반응 스케줄러 등 기존 코드)
    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}
