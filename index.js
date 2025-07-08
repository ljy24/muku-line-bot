// ✅ index.js v1.17 - 파일 분리 및 Supabase 제거

// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공 (예: 로그 파일)
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작 (예: 상대 경로 지정)
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK: LINE 메시징 API와의 통신을 위한 클라이언트 및 미들웨어
const express = require('express'); // Express 프레임워크: 웹 서버를 구축하고 HTTP 요청을 처리
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅 (일본 표준시 기준)

// ./src/autoReply.js에서 일반 대화 응답 함수들을 불러옵니다.
const {
    getReplyByMessage,           // 사용자 텍스트 메시지에 대한 예진이의 답변 생성 (강화된 미묘한 감정 감지)
    getReplyByImagePrompt,       // 사용자가 보낸 이미지 메시지에 대한 예진이의 답변 생성 (이미지 분석)
    saveLog,                     // 메시지 로그를 파일에 저장하는 함수
    cleanReply                   // AI 응답 정제 함수 (autoReply.js에 유지)
} = require('./src/autoReply');

// 새로운 핸들러 모듈들을 불러옵니다.
const commandHandler = require('./src/commandHandler'); // 명령어 처리 핸들러
const memoryHandler = require('./src/memoryHandler');   // 기억 관련 명령어 처리 핸들러

// 스케줄러 모듈 불러오기
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');

// 즉흥 사진 스케줄러 불러오기
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// memoryManager 모듈 (리마인더 처리 및 파일 기반 기억 관리를 위해 필요)
const memoryManager = require('./src/memoryManager');

// Express 애플리케이션을 생성합니다.
const app = express();

// LINE Bot SDK 설정을 정의합니다. 환경 변수에서 LINE 채널 접근 토큰과 채널 시크릿을 가져옵니다.
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // LINE Developers에서 발급받은 채널 액세스 토큰
    channelSecret: process.env.LINE_CHANNEL_SECRET      // LINE Developers에서 발급받은 채널 시크릿
};

// LINE 메시징 API 클라이언트를 초기화합니다. 이 클라이언트를 통해 메시지를 보내거나 받을 수 있습니다.
const client = new Client(config);

// 타겟 사용자 ID를 환경 변수에서 가져옵니다. (무쿠가 메시지를 보낼 대상)
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
// 서버가 정상적으로 실행 중인지 간단히 확인할 수 있는 엔드포인트입니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다. (개발/테스트용)
// 이 엔드포인트에 접속하면 무쿠가 무작위 메시지를 TARGET_USER_ID에게 강제로 보냅니다.
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
// LINE 서버로부터 메시지나 이벤트가 도착하면 이 엔드포인트로 POST 요청이 옵니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || []; // 요청 본문에서 이벤트 배열을 가져옵니다.
        for (const event of events) { // 각 이벤트를 순회합니다.
            // 메시지 타입 이벤트만 처리
            if (event.type === 'message') {
                const message = event.message; // 메시지 객체를 가져옵니다.

                // * 아저씨(TARGET_USER_ID)가 메시지를 보낸 경우, 마지막 메시지 시간을 업데이트합니다. *
                if (event.source.userId === userId) {
                    updateLastUserMessageTime();
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(Date.now()).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') { // 텍스트 메시지인 경우
                    const text = message.text.trim(); // 메시지 텍스트를 가져와 앞뒤 공백을 제거합니다.
                    saveLog('아저씨', text); // 아저씨의 메시지를 로그에 저장합니다.

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
                        // 일반 대화인 경우에만 기억 추출 및 저장 시도 (명령어/기억 명령이 아닌 경우)
                        // 참고: 파일 기반 기억은 Render 배포 환경에서 휘발성일 수 있습니다.
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 특정 명령어로 처리되었으므로 메모리 자동 저장에서 제외됩니다.`);
                    }

                    // 💡 챗GPT 제안 반영: 이미지와 텍스트를 동시에 보낼 때 배열로 묶어서 전송
                    let replyMessages = [];
                    if (botResponse.type === 'photo') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url, // 미리보기 이미지도 동일한 URL 사용
                        });
                        if (botResponse.caption) { // 사진과 함께 보낼 코멘트가 있다면 추가
                            replyMessages.push({
                                type: 'text',
                                text: botResponse.caption
                            });
                        }
                    } else if (botResponse.type === 'text') { // 텍스트만 보내는 경우
                        replyMessages.push({
                            type: 'text',
                            text: botResponse.comment
                        });
                    } else {
                        // * 예상치 못한 응답 타입 (안전 장치) *
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
                        const stream = await client.getMessageContent(message.id); // LINE 서버에서 이미지 콘텐츠 스트림 가져오기
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk); // 스트림의 모든 청크를 모음
                        const buffer = Buffer.concat(chunks); // 모아진 청크를 하나의 버퍼로 합침

                        let mimeType = 'application/octet-stream'; // 기본 MIME 타입
                        // * 이미지 파일의 매직 넘버를 통해 실제 MIME 타입 판별 *
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        // * Base64 데이터 URL 형식으로 변환 *
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix); // AI가 이미지 분석 후 답변 생성
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                        saveLog('예진이', `(이미지 분석 응답) ${reply}`); // 봇의 응답도 로그에 저장
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK'); // 웹훅 요청 성공 응답
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK'); // 오류 발생 시에도 LINE에 OK 응답 (재시도 방지)
    }
});


const PORT = process.env.PORT || 3000; // 서버가 수신할 포트 번호 (환경 변수 PORT가 없으면 3000 사용)
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`); // 서버 시작 로그
    // 'data' 디렉토리 생성 및 고정 기억 파일 초기화를 위한 함수 호출
    await memoryManager.ensureMemoryDirectory();
    console.log('메모리 디렉토리 확인 및 준비 완료.');

    // 파일 기반 기억 관리 시, love_history.json과 fixed_memories.json 파일이 존재하지 않으면
    // 초기 데이터를 생성하는 로직이 필요할 수 있습니다.
    // (예: 최초 배포 시, 샘플 love_history.json과 fixed_memories.json 파일을 'data' 폴더에 복사하거나
    // memoryManager에서 파일이 없을 때 기본 데이터를 생성하도록 로직 추가)
    
    // 이전에 제공했던 love-history.json과 fixed-messages.txt (fixed_memories.json 데이터) 내용을
    // 'data' 폴더 내의 love_history.json과 fixed_memories.json으로 옮겨주세요.
    // 이는 수동으로 파일을 해당 경로에 배치해야 합니다.

    // 모든 스케줄러 시작
    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');

    // 🎯 예진이 즉흥 사진 스케줄러 시작 - 보고싶을 때마다 사진 보내기! 💕
    startSpontaneousPhotoScheduler(client, userId, saveLog); // 즉흥 사진 스케줄러 시작
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!'); // 즉흥 사진 시스템 시작 로그
});
