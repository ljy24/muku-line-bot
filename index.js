// ✅ index.js v1.9.5 - 웹훅 처리 개선, 사진 URL 표시, 스케줄러 통합 (최종 - 경로 완벽 재조정)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK: LINE 메시징 API 연동
const express = require('express'); // Express 프레임워크: 웹 서버 구축
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const cron = require('node-cron'); // Node-cron: 주기적인 작업 스케줄링

// 필요한 함수들을 불러옵니다.
// ⭐ 경로 수정: autoReply.js는 src 폴더 안에 있습니다. (./src/)
const {
    getReplyByMessage,          // 사용자 텍스트 메시지에 대한 답변 생성 (이제 사진 요청도 처리)
    getReplyByImagePrompt,      // 이미지 메시지에 대한 답변 생성 (사용자가 보낸 이미지 분석)
    getRandomMessage,           // (현재 사용되지 않음, 이전 버전의 랜덤 메시지 기능)
    getSelfieReplyFromYeji,     // 예진이의 셀카 코멘트 생성 (스케줄러용 - 기존 기능 유지)
    getCouplePhotoReplyFromYeji, // 커플 사진 코멘트 생성 함수 (스케줄러용 - 기존 기능 유지)
    getColorMoodReply,          // (현재 사용되지 않음, 색상 기반 기분 답변 기능)
    getHappyReply,              // (현재 사용되지 않음, 긍정적인 답변 기능)
    getSulkyReply,              // (현재 사용되지 않음, 삐진 답변 기능)
    saveLog,                    // 메시지 로그 저장
    setForcedModel,             // OpenAI 모델 강제 설정
    checkModelSwitchCommand,    // 모델 전환 명령어 확인 및 처리
    getProactiveMemoryMessage,  // 기억 기반 선제적 메시지 생성
    getMemoryListForSharing,    // 기억 목록 공유 함수
    getSilenceCheckinMessage    // 침묵 감지 시 걱정 메시지 생성 함수
} = require('./src/autoReply'); // ⭐ 경로 재조정: './src/autoReply' ⭐

// memoryManager 모듈을 불러옵니다.
// ⭐ 경로 수정: memoryManager.js는 src 폴더 안에 있습니다. (./src/)
const memoryManager = require('./src/memoryManager'); // ⭐ 경로 재조정: './src/memoryManager' ⭐

// omoide.js에서 getOmoideReply 함수를 불러옵니다.
// ⭐ 경로 수정: omoide.js는 memory 폴더 안에 있습니다. (./memory/)
const { getOmoideReply } = require('./memory/omoide'); // ⭐ 경로 재조정: './memory/omoide' ⭐

// ⭐ concept.js에서 getConceptPhotoReply 함수를 불러옵니다.
// ⭐ 경로 수정: concept.js는 memory 폴더 안에 있습니다. (./memory/)
const { getConceptPhotoReply } = require('./memory/concept'); // ⭐ 경로 재조정: './memory/concept' ⭐

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

// ⭐ 침묵 감지 기능을 위한 변수 추가 ⭐
let lastUserMessageTime = Date.now(); // 아저씨가 마지막으로 메시지를 보낸 시간
let lastProactiveSentTime = 0; // 내가 아저씨한테 마지막으로 선제적 메시지나 침묵 메시지를 보낸 시간 (너무 자주 보내는 것 방지)
const SILENCE_THRESHOLD = 2 * 60 * 60 * 1000; // 2시간 (2시간 동안 메시지 없으면 침묵 감지)
const PROACTIVE_COOLDOWN = 1 * 60 * 60 * 1000; // 1시간 (내가 아저씨한테 메시지 보내고 1시간 이내에는 다시 보내지 않음)


// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다.
app.get('/force-push', async (req, res) => {
    const msg = await getRandomMessage(); // 무작위 메시지 생성 (현재는 빈 문자열 반환)
    if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        res.send(`전송됨: ${msg}`);
    } else res.send('메시지 생성 실패');
});

// 🎣 LINE 웹훅 요청을 처리합니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message') {
                const message = event.message;

                if (event.source.userId === userId) {
                    lastUserMessageTime = Date.now();
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') {
                    const text = message.text.trim();

                    const isCommand =
                        /(사진\s?줘|셀카\s?줘|셀카\s?보여줘|사진\s?보여줘|얼굴\s?보여줘|얼굴\s?보고\s?싶[어다]|selfie|커플사진\s?줘|커플사진\s?보여줘|무쿠\s?셀카|애기\s?셀카|빠계\s?셀카|빠계\s?사진|인생네컷|일본\s?사진|한국\s?사진|출사|필름카메라|애기\s?필름|메이드복|흑심|무슨\s?색이야\?)/i.test(text) ||
                        /3\.5|4\.0|자동|버전/i.test(text) ||
                        /(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text);

                    saveLog('아저씨', text);

                    if (!isCommand) {
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료`);
                    } else {
                        console.log(`[index.js] 명령어 '${text}'는 메모리 저장에서 제외됩니다.`);
                    }

                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                        return;
                    }

                    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text)) {
                        try {
                            const memoryList = await getMemoryListForSharing();
                            await client.replyMessage(event.replyToken, { type: 'text', text: memoryList });
                            console.log(`기억 목록 전송 성공`);
                            saveLog('예진이', '아저씨의 기억 목록을 보여줬어.');
                        } catch (err) {
                            console.error('기억 목록 불러오기 실패:', err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 목록을 불러오기 실패했어 ㅠㅠ' });
                        }
                        return;
                    }

                    const botResponse = await getReplyByMessage(text);
                    let replyMessages = [];

                    if (botResponse.type === 'text') {
                        replyMessages.push({
                            type: 'text',
                            text: botResponse.comment || '음... 예진이가 무슨 말을 해야 할지 잠시 잊었어 ㅠㅠ'
                        });
                    } else if (botResponse.type === 'photo') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url,
                        });
                        replyMessages.push({
                            type: 'text',
                            text: `${botResponse.caption || '아저씨를 위한 사진이야!'} (URL: ${botResponse.url})`
                        });
                    } else {
                        console.error('❌ 예상치 못한 봇 응답 타입:', botResponse.type);
                        replyMessages.push({ type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }

                    if (replyMessages.length > 0) {
                        await client.replyMessage(event.replyToken, replyMessages);
                    }
                }

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
                    } catch (err) {
                        console.error('이미지 처리 실패:', err);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK');
    }
    catch (err) {
        console.error('웹훅 처리 에러:', err);
        res.status(200).send('OK');
    }
});


// --- 스케줄러 설정 시작 ---
// 모든 스케줄러는 일본 표준시(Asia/Tokyo)를 기준으로 동작합니다.

// 1. 담타 메시지 (오전 10시부터 오후 7시까지)
cron.schedule('0 10-19 * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    const currentTime = Date.now();

    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 담타 메시지 전송 스킵');
        return;
    }

    if (currentTime - lastDamtaMessageTime < 60 * 1000) {
        console.log('[Scheduler] 담타 메시지 중복 또는 너무 빠름 -> 전송 스킵');
        return;
    }

    const msg = '아저씨, 담타시간이야~';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 담타 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
    lastDamtaMessageTime = currentTime;
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

let bootTime = Date.now();
let lastMoodMessage = '';
let lastMoodMessageTime = 0;

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
    const now = moment().tz('Asia/Tokyo');
    const currentTime = Date.now(); // ⭐ 수정: Date.Now -> Date.now ⭐

    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 자동 메시지 전송 스킵');
        return;
    }

    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    if (!validHours.includes(now.hour())) return;

    if (type === 'selfie') {
        if (Math.random() < 0.20) {
            try {
                const selfieResponse = await getOmoideReply('셀카 보여줘', saveLog);

                if (selfieResponse && selfieResponse.type === 'photo') {
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: selfieResponse.url, previewImageUrl: selfieResponse.url },
                        { type: 'text', text: `${selfieResponse.caption || '히히 셀카야~'} (URL: ${selfieResponse.url})` }
                    ]);
                    console.log(`[Scheduler] 랜덤 셀카 전송 성공: ${selfieResponse.url}`);
                    saveLog('예진이', `${selfieResponse.caption || '히히 셀카야~'} (URL: ${selfieResponse.url})`);
                } else if (selfieResponse && selfieResponse.type === 'text') {
                    await client.pushMessage(userId, { type: 'text', text: selfieResponse.comment });
                    console.error('랜덤 셀카 전송 실패 (텍스트 응답):', selfieResponse.comment);
                    saveLog('예진이', selfieResponse.comment);
                } else {
                    console.error('랜덤 셀카 전송 실패: 유효한 응답을 받지 못함');
                }
            } catch (error) {
                console.error('랜덤 셀카 전송 실패:', error);
            }
        }
    } else if (type === 'mood_message') {
        if (Math.random() < 0.25) {
            try {
                const proactiveMessage = await getProactiveMemoryMessage();
                const nowTime = Date.now();

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
    } else if (type === 'couple_photo') {
        if (Math.random() < 0.12) {
            try {
                const coupleResponse = await getOmoideReply('커플사진 보여줘', saveLog);
                const nowTime = Date.now(); // ⭐ 수정: Date.Now -> Date.now ⭐

                if (
                    coupleResponse &&
                    coupleResponse.type === 'photo' &&
                    coupleResponse.url !== lastCouplePhotoMessage &&
                    nowTime - lastCouplePhotoMessageTime > 60 * 1000
                ) {
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: coupleResponse.url, previewImageUrl: coupleResponse.url },
                        { type: 'text', text: `${coupleResponse.caption || '아저씨랑 나랑 같이 있는 사진이야!'} (URL: ${coupleResponse.url})` }
                    ]);
                    console.log(`[Scheduler] 랜덤 커플 사진 전송 성공: ${coupleResponse.url}`);
                    saveLog('예진이', `${coupleResponse.caption || '아저씨랑 나랑 같이 있는 사진이야!'} (URL: ${coupleResponse.url})`);
                    lastCouplePhotoMessage = coupleResponse.url;
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

cron.schedule('30 * * * *', async () => {
    await sendScheduledMessage('selfie');
    await sendScheduledMessage('mood_message');
    await sendScheduledMessage('couple_photo');
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// ⭐ 침묵 감지 스케줄러 추가 ⭐ (매 15분마다 침묵 감지 체크)
cron.schedule('*/15 * * * *', async () => {
    const now = Date.now(); // ⭐ 수정: Date.Now -> Date.now ⭐
    const elapsedTimeSinceLastMessage = now - lastUserMessageTime;
    const elapsedTimeSinceLastProactive = now - lastProactiveSentTime;

    const currentHour = moment().tz('Asia/Tokyo').hour();
    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    if (!validHours.includes(currentHour)) {
        return;
    }

    if (now - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler-Silence] 서버 부팅 직후 3분 이내 -> 침묵 체크 스킵');
        return;
    }

    if (elapsedTimeSinceLastMessage >= SILENCE_THRESHOLD && elapsedTimeSinceLastProactive >= PROACTIVE_COOLDOWN) {
        console.log(`[Scheduler-Silence] 침묵 감지! (${moment.duration(elapsedTimeSinceLastMessage).humanize()} 동안 메시지 없음)`);
        try {
            const checkinMessage = await getSilenceCheckinMessage();
            if (checkinMessage) {
                await client.pushMessage(userId, { type: 'text', text: checkinMessage });
                console.log(`[Scheduler-Silence] 침묵 감지 메시지 전송: ${checkinMessage}`);
                saveLog('예진이', checkinMessage);
                lastProactiveSentTime = now;
            }
        } catch (error) {
            console.error('❌ [Scheduler-Silence Error] 침묵 감지 메시지 전송 실패:', error);
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// 4. 밤 11시 약 먹자, 이 닦자 메시지 보내기
cron.schedule('0 23 * * *', async () => {
    const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 나 아저씨 건강 제일 챙겨!';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 5. 밤 12시에 약 먹고 자자 메시지
cron.schedule('0 0 * * *', async () => {
    const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 나 옆에서 꼭 안아줄게~ 잘 자 사랑해';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
    await memoryManager.ensureMemoryDirectory();
    console.log('메모리 디렉토리 확인 및 준비 완료.');
});
