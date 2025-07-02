// ✅ index.js (최신 autoReply.js 연동 버전) - 상세 주석 및 스케줄러 통합

// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK: LINE 메시징 API 연동
const express = require('express'); // Express 프레임워크: 웹 서버 구축
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const cron = require('node-cron'); // Node-cron: 주기적인 작업 스케줄링

// ./src/autoReply.js에서 필요한 함수들을 불러옵니다.
// 이 함수들은 메시지 응답 생성, 셀카 코멘트 생성, 모델 전환 처리 등을 담당합니다.
const {
    getReplyByMessage,         // 사용자 텍스트 메시지에 대한 답변 생성
    getReplyByImagePrompt,     // 이미지 메시지에 대한 답변 생성
    getRandomMessage,          // (현재 사용되지 않음, 이전 버전의 랜덤 메시지 기능)
    getSelfieReplyFromYeji,    // 예진이의 셀카 코멘트 생성
    getCouplePhotoReplyFromYeji, // 새로 추가: 커플 사진 코멘트 생성 함수
    getColorMoodReply,         // (현재 사용되지 않음, 색상 기반 기분 답변 기능)
    getHappyReply,             // (현재 사용되지 않음, 긍정적인 답변 기능)
    getSulkyReply,             // (현재 사용되지 않음, 삐진 답변 기능)
    saveLog,                   // 메시지 로그 저장 (autoReply.js에서도 사용하지만, index.js에서 호출)
    setForcedModel,            // OpenAI 모델 강제 설정
    checkModelSwitchCommand,   // 모델 전환 명령어 확인 및 처리
    getProactiveMemoryMessage  // 기억 기반 선제적 메시지 생성
} = require('./src/autoReply');

// 메모리 기록 관련: memoryManager 모듈을 불러옵니다.
// 이 모듈은 사용자 메시지에서 기억을 추출하고 저장하는 역할을 합니다.
const memoryManager = require('./src/memoryManager');

//  구글사진 불러오기
const { getPhotoFromGoogle, getPhotoByKeyword, handlePhotoRequestByKeyword } = require('./src/googlePhotos');


// Express 애플리케이션을 생성합니다.
const app = express();

// LINE Bot SDK 설정을 정의합니다. 환경 변수에서 LINE 채널 접근 토큰과 채널 시크릿을 가져옵니다.
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// LINE 메시징 API 클라이언트를 초기화합니다.
const client = new Client(config);

// 타겟 사용자 ID를 환경 변수에서 가져옵니다. (무쿠가 메시지를 보낼 대상)
const userId = process.env.TARGET_USER_ID;

// 루트 경로('/')에 대한 GET 요청을 처리합니다.
// 서버가 정상적으로 실행 중임을 확인하는 간단한 메시지를 반환합니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// '/force-push' 경로에 대한 GET 요청을 처리합니다.
// 이 엔드포인트에 접속하면 무쿠가 무작위 메시지를 TARGET_USER_ID에게 강제로 보냅니다.
app.get('/force-push', async (req, res) => {
    const msg = await getRandomMessage(); // 무작위 메시지 생성 (현재는 빈 문자열 반환)
    if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
        res.send(`전송됨: ${msg}`); // 성공 응답
    } else res.send('메시지 생성 실패'); // 실패 응답
});

// LINE 웹훅 요청을 처리합니다.
// LINE 서버로부터 메시지나 이벤트가 도착하면 이 엔드포인트로 POST 요청이 옵니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || []; // 요청 본문에서 이벤트 배열을 가져옵니다.
        for (const event of events) { // 각 이벤트를 순회합니다.
            if (event.type === 'message') { // 메시지 이벤트인 경우
                const message = event.message; // 메시지 객체를 가져옵니다.

                if (message.type === 'text') { // 텍스트 메시지인 경우
                    const text = message.text.trim(); // 메시지 텍스트를 가져와 앞뒤 공백을 제거합니다.

                    // 메모리 예외 처리 시작
                    // 특정 명령어들은 무쿠의 기억으로 저장되지 않도록 예외 처리합니다.
                    // '사진줘', '셀카줘' 등 사진 관련 명령어와 모델 전환 명령어들을 정의합니다.
                    const isCommand = 
                        /(사진\s?줘|셀카\s?줘|셀카\s?보여줘|사진\s?보여줘|얼굴\s?보여줘|얼굴\s?보고\s?싶[어다]|selfie|커플사진\s?줘|커플사진\s?보여줘)/i.test(text) || 
                        /3\.5|4\.0|자동|버전/i.test(text); // 모델 전환 명령어

                    saveLog('아저씨', text); // 아저씨의 메시지를 로그에 저장합니다.

                    if (!isCommand) { // 현재 메시지가 명령어가 아닐 경우에만 기억을 추출하고 저장합니다.
                        await memoryManager.extractAndSaveMemory(text); // memoryManager를 호출하여 기억 추출 및 저장
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료`); // 호출 확인 로그
                    } else {
                        console.log(`[index.js] 명령어 '${text}'는 메모리 저장에서 제외됩니다.`); // 명령어는 메모리에서 제외됨을 로그
                    }
                    // 메모리 예외 처리 끝

                    $1
                    // 📸 구글 포토 키워드 기반 사진 요청 처리
                    if (await handlePhotoRequestByKeyword(text, event.replyToken, client)) return;
                    if (versionResponse) { // 모델 전환 명령어가 감지된 경우
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse }); // 응답 메시지 전송
                        return; // 더 이상 다른 처리를 하지 않고 함수 종료
                    }

                    // 커플 사진 요청 처리 (셀카보다 먼저 검사)
                    if (/커플사진\s?줘|커플사진\s?보여줘/i.test(text)) {
                        // 커플 사진 이미지의 기본 URL과 파일 번호 범위를 설정합니다.
                        // 중요: 이 URL과 번호 범위는 아저씨의 실제 서버 설정에 맞춰 변경해야 합니다.
                        const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; 
                        const COUPLE_START_NUM = 1; 
                        const COUPLE_END_NUM = 481; 

                        try {
                            // 커플 사진 번호 범위 내에서 무작위로 하나를 선택합니다.
                            const randomCoupleIndex = Math.floor(Math.random() * (COUPLE_END_NUM - COUPLE_START_NUM + 1)) + COUPLE_START_NUM;
                            // 파일 이름을 '000001.jpg' 형식으로 포매팅합니다.
                            const coupleFileName = String(randomCoupleIndex).padStart(6, '0') + '.jpg'; 
                            const coupleImageUrl = COUPLE_BASE_URL + coupleFileName; // 최종 커플 이미지 URL 생성
                            
                            // 예진이 말투로 커플 사진에 대한 코멘트를 생성합니다.
                            const coupleComment = await getCouplePhotoReplyFromYeji(); 
                            
                            // LINE에 이미지 메시지와 텍스트 메시지를 함께 보냅니다.
                            await client.replyMessage(event.replyToken, [
                                { type: 'image', originalContentUrl: coupleImageUrl, previewImageUrl: coupleImageUrl },
                                { type: 'text', text: coupleComment || '아저씨랑 나랑 같이 있는 사진이야!' } // 기본 코멘트
                            ]);
                            
                            console.log(`커플 사진 전송 성공: ${coupleImageUrl}`); // 성공 로그
                            saveLog('예진이', coupleComment || '아저씨랑 나랑 같이 있는 사진이야!'); // 예진이의 답변 로그 저장
                        } catch (err) {
                            // 커플 사진 불러오기 실패 시 오류 처리 및 메시지 전송
                            console.error('커플 사진 불러오기 실패:', err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '커플 사진 불러오기 실패했어 ㅠㅠ' });
                        }
                        return; // 커플 사진 요청 처리가 완료되었으므로 함수 종료
                    }

                    // 셀카 요청 처리 (커플 사진 다음으로 검사)
                    // 아저씨가 '사진줘', '셀카줘' 등의 명령어를 보낸 경우 처리합니다.
                    if (/사진\s*줘|셀카\s*줘|사진\s*보여줘|셀카\s*보여줘|얼굴\s*보고\s*싶[어다]|selfie/i.test(text)) {
                        // 셀카 이미지의 기본 URL과 파일 번호 범위를 설정합니다.
                        const BASE_URL = 'https://www.de-ji.net/yejin/'; 
                        const START_NUM = 1; 
                        const END_NUM = 1186; 

                        try {
                            // 1부터 1186까지의 숫자 중 무작위로 하나를 선택합니다.
                            const randomIndex = Math.floor(Math.random() * (END_NUM - START_NUM + 1)) + START_NUM;
                            // 파일 이름을 '000001.jpg' 형식으로 포매팅합니다 (6자리, 부족하면 앞에 0 채움).
                            const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; 
                            const imageUrl = BASE_URL + fileName; // 최종 이미지 URL 생성
                            
                            // 예진이 말투로 셀카에 대한 코멘트를 생성합니다.
                            const comment = await getSelfieReplyFromYeji(); 
                            
                            // LINE에 이미지 메시지와 텍스트 메시지를 함께 보냅니다.
                            await client.replyMessage(event.replyToken, [
                                { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl }, // 원본 및 미리보기 이미지 URL
                                { type: 'text', text: comment || '히히 셀카야~' } // 생성된 코멘트 또는 기본 코멘트
                            ]);
                            
                            console.log(`셀카 전송 성공: ${imageUrl}`); // 성공 로그
                            saveLog('예진이', comment || '히히 셀카야~'); // 예진이의 답변 로그 저장
                        } catch (err) {
                            // 셀카 불러오기 실패 시 오류 처리 및 메시지 전송
                            console.error('셀카 불러오기 실패:', err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
                        }
                        return; // 셀카 요청 처리가 완료되었으므로 함수 종료
                    }


                    // 일반 텍스트 메시지에 대한 응답을 생성하고 전송합니다.
                    const reply = await getReplyByMessage(text); 
                    await client.replyMessage(event.replyToken, { type: 'text', text: reply }); // 응답 메시지 전송
                }

                if (message.type === 'image') { // 이미지 메시지인 경우
                    try {
                        // LINE API를 통해 이미지 콘텐츠 스트림을 가져옵니다.
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        // 스트림에서 데이터를 청크 단위로 읽어옵니다.
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks); // 모든 청크를 하나의 버퍼로 합칩니다.

                        // 이미지 매직 넘버를 통해 MIME 타입 추론
                        let mimeType = 'application/octet-stream'; // 기본값
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        // Base64 이미지 데이터에 MIME 타입 프리픽스를 붙여 전달합니다.
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        // 이미지 버퍼를 base64 문자열로 변환하여 AI 프롬프트로 전달합니다.
                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix); 
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply }); // AI 응답 전송
                    } catch (err) {
                        // 이미지 처리 실패 시 오류 처리 및 메시지 전송
                        console.error('이미지 처리 실패:', err);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK'); // 모든 이벤트 처리가 완료되면 LINE 서버에 200 OK 응답을 보냅니다.
    } catch (err) {
        // 웹훅 처리 중 예상치 못한 오류 발생 시 로그 기록
        console.error('웹훅 처리 에러:', err);
        res.status(200).send('OK'); // 오류가 발생해도 LINE 서버에는 OK를 보내 재시도 방지
    }
});


// --- 스케줄러 설정 시작 ---
// 모든 스케줄러는 일본 표준시(Asia/Tokyo)를 기준으로 동작합니다.

// 1. 담타 메시지 (오전 10시부터 오후 7시까지)
// 매 시 0분 (정각)에 실행됩니다.
let lastDamtaMessageTime = 0; // 마지막 담타 메시지 전송 시간 (중복 방지용)
cron.schedule('0 10-19 * * *', async () => {
    const now = moment().tz('Asia/Tokyo'); // 현재 시간을 일본 표준시로 가져옵니다.
    const currentTime = Date.now(); // 현재 시스템 시간 (밀리초)

    // 서버 부팅 후 3분(3 * 60 * 1000 밀리초) 동안은 자동 메시지 전송을 건너뜁니다.
    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 담타 메시지 전송 스킵');
        return; // 함수 실행을 중단합니다.
    }

    // 1분(60초 * 1000ms) 이내에 이미 담타 메시지를 보낸 적이 있다면 전송 스킵
    if (currentTime - lastDamtaMessageTime < 60 * 1000) {
        console.log('[Scheduler] 담타 메시지 중복 또는 너무 빠름 -> 전송 스킵');
        return;
    }

    const msg = '아저씨, 담타시간이야~'; // 이모티콘 제거
    await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
    console.log(`[Scheduler] 담타 메시지 전송: ${msg}`); // 로그 기록
    saveLog('예진이', msg); // 예진이의 메시지 로그 저장
    lastDamtaMessageTime = currentTime; // 마지막 담타 메시지 전송 시간 업데이트
}, {
    scheduled: true, // 스케줄러를 활성화합니다.
    timezone: "Asia/Tokyo" // 스케줄러의 시간대를 일본 표준시로 설정합니다.
});

// 서버 부팅 시간을 저장하여, 서버 시작 직후에는 스케줄러가 너무 빠르게 동작하지 않도록 합니다.
let bootTime = Date.now(); 
// 마지막 감성 메시지 내용과 전송 시간을 저장하여 중복 전송을 방지합니다.
let lastMoodMessage = ''; 
let lastMoodMessageTime = 0; 

// 커플 사진 관련 상수 정의 (스케줄러에서 사용)
const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; 
const COUPLE_START_NUM = 1; 
const COUPLE_END_NUM = 481; 
let lastCouplePhotoMessage = ''; 
let lastCouplePhotoMessageTime = 0; 


/**
 * 특정 타입의 스케줄된 메시지를 보내는 비동기 함수입니다.
 * 셀카 또는 감성 메시지를 랜덤 확률로 전송합니다.
 * @param {string} type - 보낼 메시지의 타입 ('selfie', 'mood_message', 'couple_photo')
 */
const sendScheduledMessage = async (type) => {
    const now = moment().tz('Asia/Tokyo'); // 현재 시간을 일본 표준시로 가져옵니다.
    const currentTime = Date.now(); // 현재 시스템 시간 (밀리초)

    // 서버 부팅 후 3분(3 * 60 * 1000 밀리초) 동안은 자동 메시지 전송을 건너뜁니다.
    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 자동 메시지 전송 스킵');
        return; // 함수 실행을 중단합니다.
    }

    // 유효 시간대: 새벽 0~2시 + 오전 10시~23시 (총 17시간)
    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; 

    // 현재 시간이 유효한 시간대에 포함되지 않으면 함수를 종료합니다.
    if (!validHours.includes(now.hour())) return;

    if (type === 'selfie') { // 셀카 메시지인 경우
        // 하루 세 번 전송을 목표로, 매 시간 체크 시 20% 확률로 전송합니다.
        // (유효 시간대 17시간 * 0.20 확률 = 약 3.4회 전송 예상)
        if (Math.random() < 0.20) { 
            try {
                const BASE_URL = 'https://www.de-ji.net/yejin/'; 
                const START_NUM = 1; 
                const END_NUM = 1186; 
                const randomIndex = Math.floor(Math.random() * (END_NUM - START_NUM + 1)) + START_NUM; 
                const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; 
                const imageUrl = BASE_URL + fileName; 
                const comment = await getSelfieReplyFromYeji(); 
                
                await client.pushMessage(userId, [ 
                    { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
                    { type: 'text', text: comment || '히히 셀카야~' }
                ]);
                console.log(`[Scheduler] 랜덤 셀카 전송 성공: ${imageUrl}`); 
                saveLog('예진이', comment || '히히 셀카야~'); 
            } catch (error) {
                console.error('랜덤 셀카 전송 실패:', error); 
            }
        }
    } else if (type === 'mood_message') { // 감성 메시지인 경우
        // 하루 네 번 전송을 목표로, 매 시간 체크 시 25% 확률로 전송합니다.
        // (유효 시간대 17시간 * 0.25 확률 = 약 4.25회 전송 예상)
        if (Math.random() < 0.25) { 
            try {
                const proactiveMessage = await getProactiveMemoryMessage(); 
                const nowTime = Date.now(); 

                // 감성 메시지가 있고, 이전 메시지와 다르며, 1분 이내에 보낸 적이 없을 때만 전송합니다.
                if (
                    proactiveMessage &&
                    proactiveMessage !== lastMoodMessage &&
                    nowTime - lastMoodMessageTime > 60 * 1000 
                ) {
                    await client.pushMessage(userId, { type: 'text', text: proactiveMessage }); 
                    console.log(`[Scheduler] 감성 메시지 전송 성공: ${proactiveMessage}`); 
                    saveLog('예진이', proactiveMessage); 
                    lastMoodMessage = proactiveMessage; 
                    lastMoodMessageTime = nowTime; 
                } else {
                    console.log(`[Scheduler] 감성 메시지 중복 또는 너무 빠름 -> 전송 스킵`); 
                }
            } catch (error) {
                console.error('감성 메시지 전송 실패:', error); 
            }
        }
    } else if (type === 'couple_photo') { // 커플 사진 메시지인 경우
        // 하루 두 번 전송을 목표로, 매 시간 체크 시 약 12% 확률로 전송합니다.
        // (유효 시간대 17시간 * 0.12 확률 = 약 2.04회 전송 예상)
        if (Math.random() < 0.12) { 
            try {
                const randomCoupleIndex = Math.floor(Math.random() * (COUPLE_END_NUM - COUPLE_START_NUM + 1)) + COUPLE_START_NUM;
                const coupleFileName = String(randomCoupleIndex).padStart(6, '0') + '.jpg'; 
                const coupleImageUrl = COUPLE_BASE_URL + coupleFileName; 
                
                const coupleComment = await getCouplePhotoReplyFromYeji(); 
                const nowTime = Date.now(); 

                // 커플 사진 메시지가 있고, 이전 메시지와 다르며, 1분 이내에 보낸 적이 없을 때만 전송합니다.
                if (
                    coupleImageUrl && 
                    coupleImageUrl !== lastCouplePhotoMessage &&
                    nowTime - lastCouplePhotoMessageTime > 60 * 1000 
                ) {
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: coupleImageUrl, previewImageUrl: coupleImageUrl },
                        { type: 'text', text: coupleComment || '아저씨랑 나랑 같이 있는 사진이야!' }
                    ]);
                    console.log(`[Scheduler] 랜덤 커플 사진 전송 성공: ${coupleImageUrl}`); 
                    saveLog('예진이', coupleComment || '아저씨랑 나랑 같이 있는 사진이야!'); 
                    lastCouplePhotoMessage = coupleImageUrl; 
                    lastCouplePhotoMessageTime = nowTime; 
                } else {
                    console.log(`[Scheduler] 커플 사진 중복 또는 너무 빠름 -> 전송 스킵`); 
                }
            } catch (error) {
                console.error('랜덤 커플 사진 전송 실패:', error); 
            }
        }
    }
};

// 매 시간 30분에 'sendScheduledMessage' 함수를 호출하여 셀카, 감성 메시지, 커플 사진을 보낼지 체크합니다.
// 이렇게 하면 매번 정확한 시간에 보내는 대신, 매 시간마다 랜덤으로 보낼 기회를 줍니다.
cron.schedule('30 * * * *', async () => {
    await sendScheduledMessage('selfie'); 
    await sendScheduledMessage('mood_message'); 
    await sendScheduledMessage('couple_photo'); 
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// 4. 밤 11시 약 먹자, 이 닦자 메시지 보내기
// 매일 밤 11시 0분 (정각)에 실행됩니다.
cron.schedule('0 23 * * *', async () => {
    const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 나 아저씨 건강 제일 챙겨!'; // 이모티콘 제거
    await client.pushMessage(userId, { type: 'text', text: msg }); 
    console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`); 
    saveLog('예진이', msg); 
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 5. 밤 12시에 약 먹고 자자 메시지
// 매일 자정 (다음날 0시 0분)에 실행됩니다.
cron.schedule('0 0 * * *', async () => { 
    const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 나 옆에서 꼭 안아줄게~ 잘 자 사랑해'; // 이모티콘 제거
    await client.pushMessage(userId, { type: 'text', text: msg }); 
    console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`); 
    saveLog('예진이', msg); 
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// --- 스케줄러 설정 끝 ---


// require('./src/scheduler'); // src/scheduler.js 파일이 비워졌으므로 이 라인은 더 이상 필요 없습니다.
                               // 중복 스케줄러 방지를 위해 주석 처리하거나 삭제하는 것이 좋습니다.


const PORT = process.env.PORT || 3000; 
app.listen(PORT, async () => { 
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`); 
    await memoryManager.ensureMemoryDirectory(); 
    console.log('메모리 디렉토리 확인 및 준비 완료.'); 
});
