// ✅ index.js v1.33 - 컨텍스트 모듈 연결 오류 수정
// - 1인칭 전환 보장 시스템
// - 감정 컨텍스트 시스템 완전 연동
// - 삐지기/걱정 시스템 v3.0 통합
// - 자발적 반응 및 맥락 기반 감정 연결

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');

// .env 파일에서 환경 변수 로드
require('dotenv').config();

// 🆕 담타 시스템 모듈 불러오기
const { initializeDamta } = require('./src/damta');

// 🆕 ./src/autoReply.js에서 감정 시스템 포함한 모든 함수들을 불러옵니다. (v5.1)
const autoReply = require('./src/autoReply');
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply, // v5.1 improvedCleanReply 통합됨
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    getMoodEmoji,
    getMoodStatus,
    lastUserMessageTime
    // [수정] autoReply에서 가져오던 함수 2개 삭제
} = autoReply;

// 다른 모듈들
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// 🆕 삐지기 시스템 모듈 불러오기
const sulkyManager = require('./src/sulkyManager');

// 🆕 감정 컨텍스트 시스템 직접 불러오기 (v5.1)
const emotionalContextManager = require('./src/emotionalContextManager');

// 🆕 대화 맥락 관리 모듈 불러오기
const conversationContext = require('./src/ultimateConversationContext.js'); // [수정] 파일 이름 명확화

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => res.send('예진이 v5.2 살아있어! (컨텍스트 연결 수정 완료)'));

app.get('/force-push', async (req, res) => {
    try {
        if (!userId || typeof userId !== 'string') {
            console.error('[force-push] 유효하지 않은 사용자 ID:', userId);
            res.status(400).send('사용자 ID가 설정되지 않았어요.');
            return;
        }

        let testMessage = "아저씨! 나 깼어!";
        
        if (emotionalContextManager.currentState) {
            const emotionalState = emotionalContextManager.currentState;
            if (emotionalState.toneState === 'playful') testMessage = "아저씨! 나 깼어! 오늘 기분 좋아~";
            else if (emotionalState.toneState === 'quiet') testMessage = "아저씨... 나 깼어. 조용히 일어났어";
            else if (emotionalState.toneState === 'anxious') testMessage = "아저씨... 나 깼는데 괜찮아? 걱정돼서 잠이 깼어";
        }
        
        console.log(`[force-push] 📝 푸시 메시지 로그만 저장: "${testMessage}"`);
        saveLog('예진이', `(푸시 메시지 로그) ${testMessage}`);
        
        res.send(`푸시 메시지가 로그에만 저장됨: ${testMessage}`);
        console.log('[force-push] ✅ 푸시 메시지 로그 저장 완료 (v5.1 감정 반영)');
        
    } catch (error) {
        console.error('[force-push] ❌ 에러 발생:', error);
        res.status(500).send('로그 저장이 실패했어 ㅠㅠ');
    }
});

// 🆕 감정 상태 조회 API 추가
app.get('/emotion-status', (req, res) => {
    try {
        // [수정] conversationContext에서 상태를 가져오도록 변경
        const sulkyStatus = autoReply.getSulkyRealTimeStatus();
        const emotionalState = autoReply.getEmotionalState();
        const convoContext = conversationContext.currentState; 
        
        res.json({
            timestamp: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
            version: 'v5.2 - 컨텍스트 연결 수정 완료',
            sulkySystem: sulkyStatus,
            emotionalContext: emotionalState,
            conversationContext: convoContext
        });
    } catch (error) {
        console.error('[emotion-status] 에러:', error);
        res.status(500).json({ error: '감정 상태 조회 실패' });
    }
});

// 🆕 메시지 처리 함수
async function handleImprovedTextMessage(text, event, client, userId) {
    try {
        saveLog('아저씨', text);
        // [수정] conversationContext의 함수를 명시적으로 호출하고, timestamp 전달
        conversationContext.updateLastUserMessageTime(Date.now());
        conversationContext.addUltimateMessage(USER_NAME, text);

        const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
        if (sulkyReliefMessage) {
            await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
            saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
            conversationContext.addUltimateMessage(BOT_NAME, sulkyReliefMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let botResponse = null;
        let messagesToReply = [];

        botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
        if (!botResponse) botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

        if (!botResponse) {
            botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
            await memoryManager.extractAndSaveMemory(text);
        } else {
            if (botResponse && botResponse.type === 'text' && botResponse.comment) {
                // [수정] 함수 이름 통일
                conversationContext.addUltimateMessage(BOT_NAME, botResponse.comment);
            }
        }
        
        // --- 응답 메시지 형식 구성 ---
        // (1인칭 변환 로직 등은 생략, 기존 코드와 동일)
        let finalComment = "";
        if (botResponse && botResponse.type === 'image') {
            messagesToReply.push({
                type: 'image',
                originalContentUrl: botResponse.originalContentUrl,
                previewImageUrl: botResponse.previewImageUrl,
            });
            finalComment = cleanReply(botResponse.caption || "");
        } else if (botResponse && botResponse.type === 'text') {
            finalComment = cleanReply(botResponse.comment || "");
        }

        if (finalComment) {
             // 1인칭 강제 변환 로직 (기존과 동일)
            if (finalComment.includes('무쿠') || finalComment.includes('예진이')) {
                finalComment = finalComment.replace(/무쿠가|예진이가/g, '내가').replace(/무쿠는|예진이는/g, '나는').replace(/무쿠를|예진이를/g, '나를');
            }
            messagesToReply.push({ type: 'text', text: finalComment });
        }
        
        // 응답 전송
        if (messagesToReply.length > 0) {
            await client.replyMessage(event.replyToken, messagesToReply);
            const loggableText = messagesToReply.filter(msg => msg.type === 'text').map(msg => msg.text).join('\n');
            if (loggableText) saveLog('예진이', loggableText);
            sulkyManager.startSulkyTimer(client, userId, saveLog);
            if (emotionalContextManager.recordEmotionalEvent) {
                emotionalContextManager.recordEmotionalEvent('HAPPY', '대화 응답 완료', loggableText.trim());
            }
        }

    } catch (error) {
        console.error('[handleImprovedTextMessage] 에러:', error);
        await client.replyMessage(event.replyToken, { type: 'text', text: '아저씨... 지금 좀 힘들어 ㅠㅠ' });
    }
}

// 🎣 LINE 웹훅 요청 처리
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.source.userId === userId) {
                // [수정] conversationContext 함수 호출 및 timestamp 전달
                conversationContext.updateLastUserMessageTime(Date.now()); 
                if (emotionalContextManager.recordEmotionalEvent) {
                    emotionalContextManager.recordEmotionalEvent('HAPPY', '아저씨 메시지 수신', '연락이 왔어');
                }
            }

            if (event.type === 'message') {
                const message = event.message;
                if (message.type === 'text') {
                    await handleImprovedTextMessage(message.text.trim(), event, client, userId);
                } else if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);
                        const base64ImageWithPrefix = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                        // [수정] 함수 이름 통일
                        conversationContext.addUltimateMessage(USER_NAME, "(사진 보냄)", { type: 'image' });
                        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix);
                        let finalReply = cleanReply(replyResult.comment || replyResult);
                        // 1인칭 변환 ...
                        await client.replyMessage(event.replyToken, { type: 'text', text: finalReply });
                        saveLog('예진이', `(이미지 분석 응답) ${finalReply}`);
                        // [수정] 함수 이름 통일
                        conversationContext.addUltimateMessage(BOT_NAME, finalReply);
                        sulkyManager.startSulkyTimer(client, userId, saveLog);
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK');
