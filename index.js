// ✅ index.js v1.15 - LINE API 메시지 형식 문제 (사진+텍스트 배열 전송) 해결

// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공 (예: 로그 파일)
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작 (예: 상대 경로 지정)
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK: LINE 메시징 API와의 통신을 위한 클라이언트 및 미들웨어
const express = require('express'); // Express 프레임워크: 웹 서버를 구축하고 HTTP 요청을 처리
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅 (일본 표준시 기준)
const cron = require('node-cron'); // Node-cron: 특정 시간 또는 주기마다 작업을 실행하는 스케줄러

// 📤 autoReply.js에서 필요한 함수들만 구조분해(import)합니다.
// ※ 전체를 autoReply로 불러오지 않았기 때문에 `autoReply.getXXX()`로 쓰면 에러 납니다.
const {
    getReplyByMessage,              // 사용자 텍스트 메시지에 대한 예진이의 답변 생성 (사진 요청 포함)
    getReplyByImagePrompt,          // 사용자가 보낸 이미지 메시지에 대한 예진이의 답변 생성 (이미지 분석)
    getRandomMessage,               // 무작위 메시지 생성 (scheduler.js에서 사용)
    getCouplePhotoReplyFromYeji,    // 커플 사진에 대한 코멘트 생성 (scheduler.js에서 사용)
    getColorMoodReply,              // 기분 기반 색상 추천 답변 생성 (현재 미사용)
    getHappyReply,                  // 긍정적인 답변 생성 (현재 미사용)
    getSulkyReply,                  // 삐진 듯한 답변 생성 (현재 미사용)
    saveLog,                        // 메시지 로그를 파일에 저장하는 함수
    setForcedModel,                 // OpenAI 모델을 강제로 설정하는 함수
    checkModelSwitchCommand,        // 모델 전환 명령어를 확인하고 처리하는 함수
    getProactiveMemoryMessage,      // 기억을 바탕으로 선제적 메시지를 생성하는 함수 (scheduler.js에서 사용)
    getMemoryListForSharing,        // 저장된 기억 목록을 포매팅하여 반환하는 함수
    getSilenceCheckinMessage,       // 침묵 감지 시 걱정 메시지를 생성하는 함수 (scheduler.js에서 사용)
    setMemoryReminder,              // 기억 리마인더 설정 함수
    deleteMemory,                   // 기억 삭제 함수
    getFirstDialogueMemory,         // 첫 대화 기억 검색 함수
    isSelfieRequest,                // ✨ 셀카 요청 감지 함수
    getImageReactionComment         // ✨ 셀카 멘트 생성 함수
} = require('./src/autoReply');

// memoryManager 모듈을 불러옵니다.
// 이 모듈은 사용자 메시지에서 기억을 추출하고 저장하며, 저장된 기억을 검색합니다.
// 파일 구조에 따라 './src/memoryManager' 경로로 불러옵니다. (src 폴더 안에 있음)
const memoryManager = require('./src/memoryManager');

// omoide.js에서 사진 관련 응답 함수와 cleanReply, getSelfieImageUrl을 불러옵니다.
// 파일 구조 이미지에 따르면 omoide.js는 memory 폴더 바로 아래에 있습니다.
const { getOmoideReply, cleanReply, getSelfieImageUrl } = require('./memory/omoide'); // cleanReply와 getSelfieImageUrl도 함께 불러옵니다.

// spontaneousPhotoManager.js에서 즉흥 사진 스케줄러 함수를 불러옵니다.
// (이 파일은 현재 제공되지 않았으므로, 아저씨 프로젝트에 있다면 경로 확인 필요)
// const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// 스케줄러 모듈 불러오기 (이제 모든 스케줄링 로직은 여기에)
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');


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

// ⭐ 새로 추가: 사용자 요청 셀카 쿨다운을 위한 변수 ⭐
let lastSentSelfieTime = 0; // 마지막으로 사용자 요청 셀카를 보낸 시간
const USER_REQUESTED_SELFIE_COOLDOWN_MS = 5 * 60 * 1000; // 5분 쿨다운 (연속 요청 방지)


// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
// 서버가 정상적으로 실행 중인지 간단히 확인할 수 있는 엔드포인트입니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다. (개발/테스트용)
// 이 엔드포인트에 접속하면 무쿠가 무작위 메시지를 TARGET_USER_ID에게 강제로 보냅니다.
app.get('/force-push', async (req, res) => {
    try {
        const testMessage = "아저씨! 강제 푸시로 무쿠가 메시지 보냈어!";
        await client.pushMessage(userId, { type: 'text', text: testMessage });
        saveLog('예진이', testMessage);
        res.send(`강제 푸시 메시지 전송됨: ${testMessage}`);
    } catch (error) {
        console.error('[force-push] 에러 발생:', error);
        res.status(500).send('메시지 전송 중 오류 발생');
    }
});

// 💡 사용자 → 아저씨 치환 필터 (기억 목록에서만 사용)
// `cleanReply` 함수를 사용하여 '사용자'를 '아저씨'로 교체합니다.
function replaceUserToAhjussi(text) {
    return cleanReply(text); // omoide.js에서 불러온 cleanReply 함수를 사용합니다.
}

/**
 * 주어진 메시지가 특정 봇 명령어인지 확인합니다.
 * 이 함수는 기억을 저장할지 여부를 결정하는 데 사용됩니다.
 * '기억해줘', '잊지마' 등 기억 저장 의도가 있는 일반 대화 문구는 명령어로 간주하지 않습니다.
 * @param {string} message - 사용자 메시지
 * @returns {boolean} 명확한 봇 명령어(기억 목록 요청, 모델 변경 등)이면 true, 아니면 false
 */
const isCommand = (message) => {
    const lowerCaseMessage = message.toLowerCase();
    
    // * 봇의 특정 기능(기억 목록, 모델 변경 등)을 트리거하는 명확한 명령어들 *
    // * 셀카/사진 관련 명령어는 이제 isSelfieRequest에서 처리하므로 여기서 제외합니다. *
    // * 기억 저장/삭제/리마인더 관련 명령어는 autoReply.js에서 OpenAI로 유동적으로 처리하므로,
    // * 여기 isCommand에서는 명시적인 키워드를 제거하여 일반 대화로 분류되도록 합니다. *
    const definiteCommands = [
        /(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i, // 기억 목록 관련
        /3\.5|4\.0|자동|버전/i, // 모델 전환 명령어
        // 이전 셀카/사진/얼굴/컨셉사진 관련 명령어들은 isSelfieRequest와 getConceptPhotoReply 로직으로 이동했으므로 여기서 제거.
    ];

    // * 메시지가 위의 명령어 정규식 중 하나라도 일치하면 true 반환 *
    return definiteCommands.some(regex => regex.test(lowerCaseMessage));
};


// 🎣 LINE 웹훅 요청을 처리합니다.
// LINE 서버로부터 메시지나 이벤트가 도착하면 이 엔드포인트로 POST 요청이 옵니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || []; // 요청 본문에서 이벤트 배열을 가져옵니다.
        for (const event of events) { // 각 이벤트를 순회합니다.
            // 메시지 타입 이벤트만 처리
            if (event.type === 'message') {
                const message = event.message; // 메시지 객체를 가져옵니다.
                const userMessage = message.text; // 사용자 메시지 텍스트
                const replyToken = event.replyToken; // 라인 API 응답 토큰
                const userId = event.source.userId;   // 메시지를 보낸 사용자의 ID

                // * 아저씨(TARGET_USER_ID)가 메시지를 보낸 경우, 마지막 메시지 시간을 업데이트합니다. *
                if (event.source.userId === userId) {
                    updateLastUserMessageTime();
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(Date.now()).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') { // 텍스트 메시지인 경우
                    const text = userMessage.trim(); // 메시지 텍스트를 가져와 앞뒤 공백을 제거합니다.

                    saveLog('아저씨', text); // 아저씨의 메시지를 로그에 저장합니다.

                    // ✨ 1. 모델 전환 명령어 처리 (가장 높은 우선순위) ✨
                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(replyToken, { type: 'text', text: versionResponse });
                        console.log(`[index.js] 모델 전환 명령어 처리 완료: "${text}"`);
                        return; // 명령어 처리 후 함수 종료
                    }

                    // ✨ 2. 셀카 요청 처리 (모델 전환 다음으로 높은 우선순위) ✨
                    if (autoReply.isSelfieRequest(text)) { // autoReply.js의 isSelfieRequest 함수 사용
                        console.log('[index.js] 셀카 요청 감지됨');

                        // ⭐ 셀카 전송 쿨다운 로직 ⭐
                        if (Date.now() - lastSentSelfieTime < USER_REQUESTED_SELFIE_COOLDOWN_MS) {
                            await client.replyMessage(replyToken, { type: 'text', text: '아저씨... 방금 셀카 보냈는데 또 보내달라고? 🙈 잠시만 기다려줘~' });
                            return; // 쿨다운 중이므로 종료
                        }

                        // GPT 멘트와 이미지 URL을 병렬로 호출하여 시간을 절약합니다.
                        const [imageUrl, selfieComment] = await Promise.all([
                            omoide.getSelfieImageUrl(),         // omoide.js에서 랜덤 셀카 URL 가져오기
                            autoReply.getImageReactionComment() // autoReply.js에서 셀카 멘트 생성
                        ]);

                        // 이미지 메시지를 먼저 사용자에게 전송합니다 (replyMessage는 한 번만 가능).
                        await client.replyMessage(replyToken, {
                            type: 'image',
                            originalContentUrl: imageUrl,
                            previewImageUrl: imageUrl, // 미리보기 이미지도 동일한 URL 사용
                        });

                        // 약간의 딜레이(0.5초) 후에 텍스트 멘트를 따로 전송하여 자연스러운 흐름을 만듭니다.
                        setTimeout(async () => {
                            // pushMessage는 userId를 사용하여 특정 사용자에게 메시지를 보냅니다.
                            await client.pushMessage(userId, { type: 'text', text: selfieComment });
                            console.log('[index.js] 셀카 멘트 전송 완료');
                        }, 500); // 500밀리초 = 0.5초

                        lastSentSelfieTime = Date.now(); // 셀카 전송 시간 업데이트
                        return; // 셀카 요청 처리가 완료되었으므로, 이 이벤트에 대한 다른 로직은 실행하지 않습니다.
                    }

                    // ✨ 3. 기억 목록 보여주기 명령어 처리 (기존 로직 유지) ✨
                    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text)) {
                        try {
                            let memoryList = await getMemoryListForSharing(); // autoReply.js에서 기억 목록을 가져옵니다.
                            memoryList = replaceUserToAhjussi(memoryList); // '사용자' -> '아저씨'로 교체
                            await client.replyMessage(replyToken, { type: 'text', text: memoryList });
                            console.log(`[index.js] 기억 목록 전송 성공: "${text}"`);
                            saveLog('예진이', '아저씨의 기억 목록을 보여줬어.'); // 봇의 응답도 로그에 저장
                        } catch (err) {
                            console.error(`[index.js] 기억 목록 불러오기 실패 ("${text}"):`, err.message);
                            await client.replyMessage(replyToken, { type: 'text', text: '기억 목록을 불러오기 실패했어 ㅠㅠ' });
                        }
                        return; // 명령어 처리 후 함수 종료
                    }

                    // ✨ 4. 기억 삭제 명령어 처리 (기존 로직 유지) ✨
                    const deleteMatch = text.match(/^(기억\s?삭제|기억\s?지워|기억에서\s?없애줘)\s*:\s*(.+)/i);
                    if (deleteMatch) {
                        const contentToDelete = deleteMatch[2].trim();
                        try {
                            const result = await deleteMemory(contentToDelete); // autoReply.js의 deleteMemory 호출
                            await client.replyMessage(replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 기억 삭제 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 기억 삭제 실패 ("${text}"):`, err.message);
                            await client.replyMessage(replyToken, { type: 'text', text: '기억 삭제에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }

                    // ✨ 5. 리마인더 설정 명령어 처리 (기존 로직 유지) ✨
                    const reminderMatch = text.match(/^(리마인더|리마인드|알림|알려줘)\s*:\s*(.+)\s+(.+)/i);
                    if (reminderMatch) {
                        const content = reminderMatch[2].trim();
                        const timeString = reminderMatch[3].trim();
                        try {
                            const result = await setMemoryReminder(content, timeString); // autoReply.js의 setMemoryReminder 호출
                            await client.replyMessage(replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 리마인더 설정 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 리마인더 설정 실패 ("${text}"):`, err.message);
                            await client.replyMessage(replyToken, { type: 'text', text: '리마인더 설정에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }
                    
                    // ✨ 6. 봇의 일반 응답 및 사진 요청 처리 (autoReply.js의 getReplyByMessage 호출) ✨
                    // 이 부분은 이제 일반 셀카 요청을 제외한 나머지 대화를 처리합니다.
                    const botResponse = await getReplyByMessage(text);
                    
                    // 💡 참고: LINE API는 하나의 replyToken으로 여러 메시지를 배열 형태로 보낼 수 있습니다.
                    // 그러나 여기서는 기존처럼 단일 메시지 응답 로직을 유지합니다.
                    // getReplyByMessage가 photo 타입을 반환할 때, 캡션은 pushMessage로 따로 보냅니다.
                    if (botResponse.type === 'text') {
                        await client.replyMessage(replyToken, { type: 'text', text: botResponse.comment });
                    } else if (botResponse.type === 'photo') {
                        // getOmoideReply가 특정 추억 사진을 반환할 때 사용됩니다.
                        // (일반 셀카 요청은 이제 위에서 index.js가 직접 처리)
                        await client.replyMessage(replyToken, {
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url,
                        });
                        if (botResponse.caption) {
                            // 캡션이 있다면, replyMessage는 한 번만 가능하므로 pushMessage로 캡션을 보냅니다.
                            setTimeout(async () => {
                                await client.pushMessage(userId, { type: 'text', text: botResponse.caption });
                            }, 100); // 짧은 딜레이
                        }
                    } else {
                        // * 예상치 못한 응답 타입 (안전 장치) *
                        console.error('❌ [index.js] 예상치 못한 봇 응답 타입:', botResponse.type);
                        await client.replyMessage(replyToken, { type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }
                    console.log(`[index.js] 봇 응답 전송 완료 (타입: ${botResponse.type})`);

                    // * 기억 추출/저장 로직 (메시지가 명확한 봇 명령어가 아닐 경우에만 실행) *
                    // * "기억해줘", "잊지마", "리마인드" 등의 일반 대화는 autoReply.js에서 이미 처리되므로,
                    // * 여기서는 해당 응답에 대한 불필요한 자동 기억 저장을 방지합니다. *
                    const isMemoryRelatedResponse = botResponse.comment && (
                        botResponse.comment.includes('기억했어!') ||
                        botResponse.comment.includes('잊어버리라고 해서 지웠어') ||
                        botResponse.comment.includes('기억을 못 찾겠어') ||
                        botResponse.comment.includes('알려줄게!') ||
                        botResponse.comment.includes('뭘 기억해달라는 거야?') ||
                        botResponse.comment.includes('뭘 잊어버리라는 거야?') ||
                        botResponse.comment.includes('리마인더 시간을 정확히 모르겠어') ||
                        botResponse.comment.includes('뭘 언제 알려달라는 거야?') ||
                        botResponse.comment.includes('처음 만났을 때 기억은 내가 아직 정확히 못 찾겠어') // 첫 대화 기억 관련 응답 추가
                    );

                    if (!isCommand(text) && !isMemoryRelatedResponse && !autoReply.isSelfieRequest(text)) { // 셀카 요청도 자동 기억 저장에서 제외
                        await memoryManager.extractAndSaveMemory(text); // memoryManager를 호출하여 기억 추출 및 저장
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 명령어 또는 기억/리마인더/셀카 관련 응답이므로 메모리 자동 저장에서 제외됩니다.`);
                    }
                } // end of text message processing

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
                        await client.replyMessage(replyToken, { type: 'text', text: reply });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            } // end of message type check
        } // end of events loop
        res.status(200).send('OK'); // 웹훅 요청 성공 응답
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK'); // 오류 발생 시에도 LINE에 OK 응답 (재시도 방지)
    }
});


const PORT = process.env.PORT || 3000; // 서버가 수신할 포트 번호 (환경 변수 PORT가 없으면 3000 사용)
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`); // 서버 시작 로그
    await memoryManager.ensureMemoryDirectory(); // 기억 파일 저장 디렉토리 존재 확인 및 생성
    console.log('메모리 디렉토리 확인 및 준비 완료.'); // 디렉토리 준비 완료 로그
    
    // 모든 스케줄러 시작
    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');

    // 🎯 예진이 즉흥 사진 스케줄러 시작 - 보고싶을 때마다 사진 보내기! 💕
    // 아저씨의 프로젝트에 spontaneousPhotoManager가 있다면 아래 주석을 해제해주세요.
    // startSpontaneousPhotoScheduler(client, userId, saveLog); // 즉흥 사진 스케줄러 시작
    // console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!'); // 즉흥 사진 시스템 시작 로그
});
