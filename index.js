// ✅ index.js v1.20 - 파일 분리 및 하이브리드 memoryManager 연동

// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (로그 저장용)
const path = require('path'); // 경로 처리 모듈
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK
const express = require('express'); // Express 프레임워크
const moment = require('moment-timezone'); // Moment.js

// ./src/autoReply.js에서 일반 대화 응답 함수들을 불러옵니다.
const {
    getReplyByMessage,           // 사용자 텍스트 메시지에 대한 예진이의 답변 생성
    getReplyByImagePrompt,       // 사용자가 보낸 이미지 메시지에 대한 예진이의 답변 생성
    saveLog,                     // 메시지 로그를 파일에 저장하는 함수
    cleanReply                   // AI 응답 정제 함수
} = require('./src/autoReply');

// 새로운 핸들러 모듈들을 불러옵니다.
const commandHandler = require('./src/commandHandler'); // 명령어 처리 핸들러
const memoryHandler = require('./src/memoryHandler');   // 기억 관련 명령어 처리 핸들러

// 스케줄러 모듈 불러오기
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');

// 즉흥 사진 스케줄러 불러오기
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// memoryManager 모듈 (하이브리드 기억 관리에 필요)
const memoryManager = require('./src/memoryManager');

// Express 애플리케이션을 생성합니다.
const app = express();

// LINE Bot SDK 설정을 정의합니다.
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// LINE 메시징 API 클라이언트를 초기화합니다.
const client = new Client(config);

// 타겟 사용자 ID를 환경 변수에서 가져옵니다.
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다. (개발/테스트용)
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

// 🎣 LINE 웹훅 요청을 처리합니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message') {
                const message = event.message;

                // * 아저씨(TARGET_USER_ID)가 메시지를 보낸 경우, 마지막 메시지 시간을 업데이트합니다. *
                if (event.source.userId === userId) {
                    updateLastUserMessageTime();
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(Date.now()).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') {
                    const text = message.text.trim();
                    saveLog('아저씨', text);

                    let botResponse = null;

                    // 1. 명령어 핸들러로 먼저 메시지 처리 시도
                    botResponse = await commandHandler.handleCommand(text, saveLog);

                    // 2. 명령어 핸들러에서 처리되지 않았다면, 기억 핸들러로 메시지 처리 시도
                    if (!botResponse) {
                        botResponse = await memoryHandler.handleMemoryCommand(text, saveLog);
                    }

                    // 3. 모든 특정 핸들러에서 처리되지 않았다면, 일반 대화 응답 생성
                    if (!botResponse) {
                        botResponse = await getReplyByMessage(text);
                        // 일반 대화인 경우, 기억 추출 및 저장 시도 (현재는 모든 일반 대화를 여기에 전달)
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 특정 명령어로 처리되었으므로 메모리 자동 저장에서 제외됩니다.`);
                    }

                    // 응답 메시지 전송
                    let replyMessages = [];
                    if (botResponse.type === 'photo') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url,
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
                    }
                }

                // * 사용자가 이미지를 보낸 경우 처리 *
                if (message.type === 'image') {
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

                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix);
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                        saveLog('예진이', `(이미지 분석 응답) ${reply}`);
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
    
    // ✨ 수정: ensureMemoryTablesAndDirectory 호출 (DB와 파일 디렉토리/초기 파일 모두 처리) ✨
    await memoryManager.ensureMemoryTablesAndDirectory();
    console.log('메모리 시스템 초기화 완료 (DB 및 파일).');

    // 모든 스케줄러 시작
    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');

    // 🎯 예진이 즉흥 사진 스케줄러 시작 - 보고싶을 때마다 사진 보내기! 💕
    startSpontaneousPhotoScheduler(client, userId, saveLog);
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!');
});
