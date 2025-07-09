// ✅ index.js v1.26 - getReplyByImagePrompt 인자 개수 맞춤

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
require('dotenv').config(); 

const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply,
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    getMoodEmoji,
    getMoodStatus
} = require('./src/autoReply');

const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('무쿠 살아있엉'));

app.get('/force-push', async (req, res) => {
    try {
        const testMessage = "아저씨! 강제 푸시로 예진이가 메시지 보냈어!";
        await client.pushMessage(userId, { type: 'text', text: testMessage });
        saveLog('예진이', testMessage);
        res.send(`강제 푸시 메시지 전송됨: ${testMessage}`);
    } catch (error) {
        console.error('[force-push] 에러 발생:', error);
        res.status(500).send('메시지 전송 중 오류 발생');
    }
});

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.source.userId === userId) {
                updateLastUserMessageTime();
                console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(Date.now()).format('HH:mm:ss')}`);
            }
            if (event.type === 'message') {
                const message = event.message;
                if (message.type === 'text') {
                    const text = message.text.trim();
                    saveLog('아저씨', text);
                    let botResponse = null;
                    botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
                    if (!botResponse) {
                        botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory); 
                    }
                    if (!botResponse) {
                        botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply); 
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 특정 명령어로 처리되었으므로 메모리 자동 저장에서 제외됩니다.`);
                    }
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
                    } else {
                        console.warn('[index.js] 전송할 메시지가 없습니다.');
                    }
                }
                else if (message.type === 'image') { // <-- 여기만 수정!
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

                        // ⭐️ 인자 4개로 맞춰줌!
                        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix, callOpenAI, cleanReply, saveLog);
                        await client.replyMessage(event.replyToken, { type: 'text', text: replyResult.comment }); 
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                        saveLog('예진이', `(이미지 분석 응답) ${replyResult.comment}`);
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
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
    await memoryManager.ensureMemoryTablesAndDirectory();
    console.log('메모리 시스템 초기화 완료 (DB 및 파일).');
    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');
    startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply);
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!');
});
