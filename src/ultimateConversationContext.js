// --- START OF FILE: index.js ---
// ✅ index.js v1.34 - SyntaxError 해결 및 모듈 연결 최종 수정
// - 1인칭 전환 보장 시스템
// - 감정 컨텍스트 시스템 완전 연동
// - 삐지기/걱정 시스템 v3.0 통합
// - 자발적 반응 및 맥락 기반 감정 연결

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const {
    Client,
    middleware
} = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');

// .env 파일에서 환경 변수 로드
require('dotenv').config();

// 🆕 ./src/autoReply.js에서 필요한 함수들을 불러옵니다.
const autoReply = require('./src/autoReply');
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply,
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    lastUserMessageTime, // spontaneousPhotoManager에서만 사용
    checkSpontaneousReactions
} = autoReply;

// 🆕 다른 핵심 모듈들 불러오기
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const {
    startAllSchedulers
} = require('./src/scheduler');
const {
    startSpontaneousPhotoScheduler
} = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');
const emotionalContextManager = require('./src/emotionalContextManager');
// [수정] 우리가 만든 최종 컨텍스트 모듈을 불러옵니다.
const conversationContext = require('./src/ultimateConversationContext.js');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => res.send('예진이 v5.3 살아있어! (SyntaxError 해결)'));

// 🎣 LINE 웹훅 요청 처리
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.source.userId === userId) {
                // [수정] conversationContext의 함수를 명시적으로 호출
                conversationContext.updateLastUserMessageTime(Date.now());
            }

            if (event.type === 'message') {
                const message = event.message;
                if (message.type === 'text') {
                    await handleTextMessage(event);
                } else if (message.type === 'image') {
                    await handleImageMessage(event);
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error'); // 클라이언트에게 OK가 아닌 에러 상태 전송
    }
});

// ✍️ 텍스트 메시지 처리 함수
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    saveLog(USER_NAME, text);
    // [수정] 컨텍스트 추가
    conversationContext.addUltimateMessage(USER_NAME, text);

    // 삐짐 해소 체크
    const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
    if (sulkyReliefMessage) {
        await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
        saveLog(BOT_NAME, `(삐짐 해소) ${sulkyReliefMessage}`);
        conversationContext.addUltimateMessage(BOT_NAME, sulkyReliefMessage);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let botResponse = null;
    // 명령어 처리
    botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
    if (!botResponse) botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
    // 일반 대화 처리
    if (!botResponse) {
        botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
        await memoryManager.extractAndSaveMemory(text);
    }
    
    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

// 🖼️ 이미지 메시지 처리 함수
async function handleImageMessage(event) {
    try {
        const stream = await client.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const base64ImageWithPrefix = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        conversationContext.addUltimateMessage(USER_NAME, "(사진 보냄)", { type: 'image' });

        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix);
        if (replyResult) {
            await sendReply(event.replyToken, replyResult);
        }
    } catch (err) {
        console.error(`[Image] 이미지 처리 실패:`, err);
        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
    }
}

// 📤 응답 전송 통합 함수
async function sendReply(replyToken, botResponse) {
    let messagesToReply = [];
    let loggableText = '';

    if (botResponse.type === 'image') {
        messagesToReply.push({
            type: 'image',
            originalContentUrl: botResponse.originalContentUrl,
            previewImageUrl: botResponse.previewImageUrl,
        });
        if (botResponse.caption) {
            const cleanedCaption = cleanAndVerifyFirstPerson(botResponse.caption);
            messagesToReply.push({ type: 'text', text: cleanedCaption });
            loggableText = cleanedCaption;
        }
    } else if (botResponse.type === 'text') {
        const cleanedComment = cleanAndVerifyFirstPerson(botResponse.comment);
        messagesToReply.push({ type: 'text', text: cleanedComment });
        loggableText = cleanedComment;
    }

    if (messagesToReply.length > 0) {
        await client.replyMessage(replyToken, messagesToReply);
        if (loggableText) {
            saveLog(BOT_NAME, loggableText);
            conversationContext.addUltimateMessage(BOT_NAME, loggableText);
        }
        sulkyManager.startSulkyTimer(client, userId, saveLog);
    }
}

// 🙋‍♀️ 1인칭 변환기
function cleanAndVerifyFirstPerson(text) {
    let cleanedText = cleanReply(text);
    if (cleanedText.includes('무쿠') || cleanedText.includes('예진이')) {
        console.warn(`[1인칭 검증] 3인칭 감지: "${cleanedText}"`);
        cleanedText = cleanedText
            .replace(/무쿠가|예진이가/g, '내가')
            .replace(/무쿠는|예진이는/g, '나는')
            .replace(/무쿠를|예진이를/g, '나를')
            .replace(/무쿠|예진이/g, '나');
        console.log(`[1인칭 변환] 완료: "${cleanedText}"`);
    }
    return cleanedText;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`예진이 v5.3 서버 스타트! 포트: ${PORT}`);
    initMuku(); // 서버 시작 시 초기화 함수 실행
});

// ✅ 비동기 초기화 함수 정의
async function initMuku() {
    try {
        await memoryManager.ensureMemoryTablesAndDirectory();
        
        // ⭐ 예진이 통합 컨텍스트 시스템 초기화
        // [수정] conversationContext의 함수를 명시적으로 호출
        await conversationContext.initializeEmotionalSystems();
        console.log('🧠 예진이 통합 컨텍스트 시스템 초기화 완료!');

        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply, lastUserMessageTime);
        
        // 자발적 반응 스케줄러
        setInterval(() => {
            const spontaneousReaction = checkSpontaneousReactions();
            if (spontaneousReaction && Math.random() < 0.2) {
                const finalMessage = cleanAndVerifyFirstPerson(spontaneousReaction);
                client.pushMessage(userId, { type: 'text', text: finalMessage })
                .then(() => {
                    saveLog(BOT_NAME, `(자발적 반응) ${finalMessage}`);
                    conversationContext.addUltimateMessage(BOT_NAME, finalMessage);
                }).catch(err => console.error('[Scheduler] 자발적 반응 메시지 전송 실패:', err));
            }
        }, 15 * 60 * 1000); // 15분마다 체크

    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        // 초기화 실패 시 프로세스 종료, Render.com이 재시도하도록 함
        process.exit(1); 
    }
}
// --- END OF FILE: index.js ---
