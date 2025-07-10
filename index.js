// ✅ index.js v1.30 - 예진이 삐지기/걱정 시스템 v2.0 통합
// - 메시지 읽음 여부 구분 (읽씹 vs 안읽음)
// - 단계별 삐짐: 10분/20분/40분 → 60분 후 걱정 모드
// - 읽음/미읽음 상황별 차별화된 메시지
// - 삐짐/걱정 해소 시 상황별 응답

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');

// .env 파일에서 환경 변수 로드
require('dotenv').config();


// ./src/autoReply.js에서 함수들과 상수를 불러옵니다.
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply,
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    getMoodEmoji,
    getMoodStatus,
    lastUserMessageTime
} = require('./src/autoReply');

// 다른 모듈들
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// 서버 시작 시
await autoReply.initializeEmotionalSystems();

// 🆕 삐지기 시스템 모듈 불러오기
const sulkyManager = require('./src/sulkyManager');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

app.get('/force-push', async (req, res) => {
    try {
        if (!userId || typeof userId !== 'string') {
            console.error('[force-push] 유효하지 않은 사용자 ID:', userId);
            res.status(400).send('사용자 ID가 설정되지 않았어요.');
            return;
        }

        const testMessage = "아저씨! 나 깼어!";
        
        // 🚫 실제 전송은 하지 않고 로그에만 남김
        console.log(`[force-push] 📝 푸시 메시지 로그만 저장: "${testMessage}"`);
        saveLog('예진이', `(푸시 메시지 로그) ${testMessage}`);
        
        res.send(`푸시 메시지가 로그에만 저장됨: ${testMessage}`);
        console.log('[force-push] ✅ 푸시 메시지 로그 저장 완료');
        
    } catch (error) {
        console.error('[force-push] ❌ 에러 발생:', error);
        res.status(500).send('로그 저장이 실패했어 ㅠㅠ');
    }
});

// 🎣 LINE 웹훅 요청 처리
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.source.userId === userId) {
                updateLastUserMessageTime();
                console.log(`[Webhook] 아저씨 메시지 수신: ${moment(Date.now()).format('HH:mm:ss')}`);
                
                // 🆕 아저씨가 응답했을 때 삐짐 해소 체크
                const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
                if (sulkyReliefMessage) {
                    // 삐짐 해소 메시지가 있으면 먼저 전송
                    await client.pushMessage(userId, {
                        type: 'text',
                        text: sulkyReliefMessage
                    });
                    saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
                    console.log('[SulkySystem] 삐짐 해소 메시지 전송됨');
                }
            }

            if (event.type === 'message') {
                const message = event.message;

                if (message.type === 'text') {
                    const text = message.text.trim();
                    saveLog('아저씨', text);

                    let botResponse = null;

                    // 명령어 처리
                    botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

                    if (!botResponse) {
                        botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
                    }

                    if (!botResponse) {
                        // 일반 대화 처리
                        botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료`);
                    } else {
                        console.log(`[index.js] 특정 명령어로 처리되어 메모리 자동 저장 제외`);
                    }

                    // 응답 메시지 구성
                    let replyMessages = [];
                    if (botResponse.type === 'image') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.originalContentUrl,
                            previewImageUrl: botResponse.previewImageUrl,
                            altText: botResponse.altText
                        });
                        if (botResponse.caption) {
                            replyMessages.push({
                                type: 'text',
                                text: botResponse.caption
                            });
                        }
                    } else if (botResponse.type === 'text') {
                        replyMessages.push({
                            type: 'text',
                            text: botResponse.comment
                        });
                    } else {
                        console.error('❌ [index.js] 예상치 못한 봇 응답 타입:', botResponse.type);
                        replyMessages.push({ type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }

                    if (replyMessages.length > 0) {
                        await client.replyMessage(event.replyToken, replyMessages);
                        console.log(`[index.js] 봇 응답 전송 완료 (타입: ${botResponse.type || 'unknown'})`);
                        
                        // 🆕 예진이가 메시지를 보낸 후 삐지기 타이머 시작
                        sulkyManager.startSulkyTimer(client, userId, saveLog);
                        console.log('[SulkySystem] 예진이 메시지 전송 후 삐지기 타이머 시작');
                    } else {
                        console.warn('[index.js] 전송할 메시지가 없습니다.');
                    }
                }
                else if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);

                        let mimeType = 'application/octet-stream';
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix, callOpenAI, cleanReply, saveLog);
                        await client.replyMessage(event.replyToken, { type: 'text', text: replyResult.comment });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                        saveLog('예진이', `(이미지 분석 응답) ${replyResult.comment}`);
                        
                        // 🆕 이미지 응답 후에도 삐지기 타이머 시작
                        sulkyManager.startSulkyTimer(client, userId, saveLog);
                        console.log('[SulkySystem] 이미지 응답 후 삐지기 타이머 시작');
                        
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
                else {
                    console.log(`[index.js] 지원하지 않는 메시지 타입 수신: ${message.type}`);
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);

    await memoryManager.ensureMemoryTablesAndDirectory();
    console.log('메모리 시스템 초기화 완료.');

    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');

    startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply, lastUserMessageTime);
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!');
    
    // 🆕 삐지기 시스템 시작 로그
    console.log('😤 예진이 삐지기 시스템 활성화! (10분/20분/40분 단계별 삐짐)');
    
    // 서버 종료시 삐지기 시스템 정리
    process.on('SIGTERM', () => {
        sulkyManager.stopSulkySystem();
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        sulkyManager.stopSulkySystem();
        process.exit(0);
    });
    
    console.log('😤 예진이 삐지기 시스템 v2.0 활성화!');
    console.log('   📋 기능: 읽씹 감지, 단계별 삐짐(10분/20분/40분), 걱정 전환(60분)');
});
