// --- START OF FILE: index.js ---
// ✅ index.js v6.0 - ultimateConversationContext v6.0 연동 최종 수정
// - 모듈 연결 오류 및 모든 에러 해결
// - 역할과 책임 분리 원칙 적용
// - 코드 구조 개선 및 안정성 강화

// 📦 필수 모듈 불러오기
const {
    Client,
    middleware
} = require('@line/bot-sdk');
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
const {
    startAllSchedulers
} = require('./src/scheduler');
const {
    startSpontaneousPhotoScheduler
} = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');

// [핵심 수정] 새로운 '마음과 기억' 엔진을 불러옵니다.
const conversationContext = require('./src/ultimateConversationContext.js');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => res.send('예진이 v6.0 살아있어!'));

// 📊 상태 조회 API
app.get('/status', (req, res) => {
    try {
        // [수정] 새로운 context 모듈의 상태 조회 함수 사용
        const internalState = conversationContext.getInternalState();
        res.json({
            timestamp: new Date().toISOString(),
            version: 'v6.0',
            ...internalState
        });
    } catch (error) {
        res.status(500).json({
            error: '상태 조회 실패'
        });
    }
});


// 🎣 LINE 웹훅 요청 처리 (메인 관제실)
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        // 여러 이벤트를 동시에 처리하기 위해 Promise.all 사용
        await Promise.all(events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error');
    }
});

// イベントごとの処理
async function handleEvent(event) {
    // ユーザーIDが一致しない、またはメッセージイベント以外は無視
    if (event.source.userId !== userId || event.type !== 'message') {
        return;
    }

    // [수정] 아저씨의 마지막 메시지 시간을 context에 기록
    conversationContext.updateLastUserMessageTime(event.timestamp);

    switch (event.message.type) {
        case 'text':
            await handleTextMessage(event);
            break;
        case 'image':
            await handleImageMessage(event);
            break;
        default:
            // 지원하지 않는 메시지 타입
            break;
    }
}

// ✍️ 텍스트 메시지 처리
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    saveLog(USER_NAME, text);
    // [수정] 메시지를 '기억'하도록 context에 전달
    conversationContext.addUltimateMessage(USER_NAME, text);

    // 삐짐 해소 체크
    const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
    if (sulkyReliefMessage) {
        await client.pushMessage(userId, {
            type: 'text',
            text: sulkyReliefMessage
        });
        saveLog(BOT_NAME, `(삐짐 해소) ${sulkyReliefMessage}`);
        conversationContext.addUltimateMessage(BOT_NAME, sulkyReliefMessage);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 답장 전 잠시 대기
    }

    // 답장 생성 요청
    let botResponse = null;
    botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory) ||
        await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

    if (!botResponse) {
        // [수정] autoReply에게 '답장 생성'을 요청 (내부적으로 getUltimateContextualPrompt 사용)
        botResponse = await getReplyByMessage(text);
        await memoryManager.extractAndSaveMemory(text);
    }

    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

// 🖼️ 이미지 메시지 처리
async function handleImageMessage(event) {
    try {
        conversationContext.addUltimateMessage(USER_NAME, "(사진 보냄)", {
            type: 'image'
        });

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
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
        });
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
        messagesToReply.push({
            type: 'text',
            text: cleanedText
        });
        loggableText = cleanedText;
    }

    if (messagesToReply.length > 0) {
        await client.replyMessage(replyToken, messagesToReply);
        if (loggableText) {
            saveLog(BOT_NAME, loggableText);
            // [수정] 봇의 최종 응답을 '기억'하도록 context에 전달
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
    console.log(`예진이 v6.0 서버 스타트! 포트: ${PORT}`);
    initMuku(); // 서버 시작 시 초기화 함수 실행
});

// ✅ 비동기 초기화 함수 정의
async function initMuku() {
    try {
        await memoryManager.ensureMemoryTablesAndDirectory();

        // [핵심 수정] conversationContext의 초기화 함수를 명시적으로 호출
        await conversationContext.initializeEmotionalSystems();

        startAllSchedulers(client, userId);
        // lastUserMessageTime을 직접 전달하는 대신, context 모듈 내부에서 관리하도록 변경 가능 (향후 개선)
        startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);

        // 자발적 반응 스케줄러
        setInterval(async () => {
            const spontaneousReaction = await autoReply.checkSpontaneousReactions();
            if (spontaneousReaction && Math.random() < 0.2) {
                const finalMessage = cleanAndVerifyFirstPerson(spontaneousReaction);
                try {
                    await client.pushMessage(userId, { type: 'text', text: finalMessage });
                    saveLog(BOT_NAME, `(자발적 반응) ${finalMessage}`);
                    conversationContext.addUltimateMessage(BOT_NAME, finalMessage);
                } catch (err) {
                    console.error('[Scheduler] 자발적 반응 메시지 전송 실패:', err);
                }
            }
        }, 15 * 60 * 1000);

    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}
// --- END OF FILE: index.js ---
