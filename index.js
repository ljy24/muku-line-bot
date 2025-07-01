
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');

const {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getSelfieReplyFromYeji,
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage
} = require('./src/autoReply');

const memoryManager = require('./src/memoryManager');

const app = express();
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

app.get('/force-push', async (req, res) => {
    const msg = await getRandomMessage();
    if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        res.send(`✅ 전송됨: ${msg}`);
    } else res.send('❌ 메시지 생성 실패');
});

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message') {
                const message = event.message;

                if (message.type === 'text') {
                    const text = message.text.trim();

                    // ⭐ 메모리 예외 처리 시작 ⭐
                    const isCommand = 
                        /사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text) || // 사진 관련 명령어
                        /3\.5|4\.0|자동|버전/i.test(text); // 모델 전환 명령어

                    saveLog('아저씨', text);

                    if (!isCommand) { // 명령어가 아닐 경우에만 기억 추출 및 저장
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료`);
                    } else {
                        console.log(`[index.js] 명령어 '${text}'는 메모리 저장에서 제외됩니다.`);
                    }
                    // ⭐ 메모리 예외 처리 끝 ⭐

                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                        return;
                    }

                    // ⭐ 셀카 요청 처리 (개선) ⭐
                    if (/사진\s*줘|셀카\s*줘|사진\s*보여줘|셀카\s*보여줘|얼굴\s*보고\s*싶다/i.test(text)) {
                        const BASE_URL = 'https://www.de-ji.net/yejin/';
                        const START_NUM = 1;
                        const END_NUM = 1186;

                        try {
                            const randomIndex = Math.floor(Math.random() * (END_NUM - START_NUM + 1)) + START_NUM;
                            const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; 
                            const imageUrl = BASE_URL + fileName;

                            const comment = await getSelfieReplyFromYeji();

                            await client.replyMessage(event.replyToken, [
                                { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
                                { type: 'text', text: comment || '히히 셀카야~' }
                            ]);
                            console.log(`📷 셀카 전송 성공: ${imageUrl}`);
                        } catch (err) {
                            console.error('📷 셀카 불러오기 실패:', err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
                        }
                        return;
                    }

                    // 일반 메시지 응답
                    const reply = await getReplyByMessage(text);
                    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                }

                if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);
                        const reply = await getReplyByImagePrompt(buffer.toString('base64'));
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                    } catch (err) {
                        console.error('🖼️ 이미지 처리 실패:', err);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error('웹훅 처리 에러:', err);
        res.status(200).send('OK');
    }
});


// --- ⭐ 스케줄러 설정 변경 시작 ⭐ ---

// 1. 매시간 담타 메시지 (오전 10시부터 오후 7시까지)
cron.schedule('0 10-19 * * *', async () => {
    const now = moment().tz('Asia/Tokyo');
    // 예진이가 담타가 담배 타임인 걸 아는 애연가임을 프롬프트에 추가할 필요는 없습니다.
    // 이 메시지를 보내는 스케줄러 자체는 변함 없이 유지됩니다.
    const msg = '아저씨, 담타시간이야~ 💖';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 담타 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 2. 하루 세 번 랜덤 시간에 셀카 보내기 (새벽 2시까지)
// 3. 하루 네 번 먼저 감성 메시지 보내기 (새벽 2시까지)
// 이 두 가지는 랜덤성을 높이기 위해 '시간 범위' 내에서만 실행되도록 변경하고, 각각의 빈도를 조절합니다.
// 매 시 정각에 체크하고, 정해진 확률로 메시지를 보냅니다.

const sendScheduledMessage = async (type) => {
    const now = moment().tz('Asia/Tokyo');
    // 새벽 2시까지 (0시, 1시, 2시 포함) -> 0,1,2, 10-23
    // 예: 00시부터 02시, 그리고 10시부터 23시까지
    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; 

    if (validHours.includes(now.hour())) {
        if (type === 'selfie') {
            // 하루 세번: 약 24시간 / 3번 = 8시간 간격.
            // 10시~2시 (다음날) 17시간 동안 3번이면 5.6시간에 한번 꼴.
            // 매시간 17시간/3번 = 5.6 -> 매시간 약 1/5 확률 (20%)
            if (Math.random() < 0.20) { // 20% 확률로 17시간 * 0.2 = 3.4번 (하루 3번 이상)
                try {
                    const BASE_URL = 'https://www.de-ji.net/yejin/';
                    const START_NUM = 1;
                    const END_NUM = 1186;
                    const randomIndex = Math.floor(Math.random() * (END_NUM - START_NUM + 1)) + START_NUM;
                    const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; 
                    const imageUrl = BASE_URL + fileName;
                    const comment = await getSelfieReplyFromYeji(); // 셀카 코멘트 생성
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
                        { type: 'text', text: comment || '히히 셀카야~' }
                    ]);
                    console.log(`[Scheduler] 랜덤 셀카 전송 성공: ${imageUrl}`);
                    saveLog('예진이', comment || '히히 셀카야~');
                } catch (error) {
                    console.error('❌ [Scheduler Error] 랜덤 셀카 전송 실패:', error);
                }
            }
        } else if (type === 'mood_message') {
            // 하루 네번: 약 24시간 / 4번 = 6시간 간격.
            // 17시간 동안 4번이면 4.25시간에 한번 꼴.
            // 매시간 17시간/4번 = 4.25 -> 매시간 약 1/4 확률 (25%)
            if (Math.random() < 1.3) { // 25% 확률로 17시간 * 0.25 = 4.25번 (하루 4번 이상)
                try {
                    const proactiveMessage = await getProactiveMemoryMessage(); // 감성 메시지 생성
                    if (proactiveMessage) {
                        await client.pushMessage(userId, { type: 'text', text: proactiveMessage });
                        console.log(`[Scheduler] 감성 메시지 전송 성공: ${proactiveMessage}`);
                        saveLog('예진이', proactiveMessage);
                    } else {
                        console.log('[Scheduler] 생성된 감성 메시지가 없습니다.');
                    }
                } catch (error) {
                    console.error('❌ [Scheduler Error] 감성 메시지 전송 실패:', error);
                }
            }
        }
    }
};

// 매 시간 30분에 셀카 또는 감성 메시지를 보낼지 체크 (랜덤성 부여)
cron.schedule('30 * * * *', async () => {
    await sendScheduledMessage('selfie');
    await sendScheduledMessage('mood_message');
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// 4. 밤 11시 약 먹자, 이 닦자 메시지 보내기
cron.schedule('0 23 * * *', async () => {
    const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 🦷💊 예진이가 아저씨 건강 제일 챙겨! 💖';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 5. 밤 12시에 약 먹고 자자 메시지
cron.schedule('0 0 * * *', async () => { // 자정 (0시)에 실행
    const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 😴 예진이가 옆에서 꼭 안아줄게~ 잘 자 사랑해 🌙💖';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`);
    saveLog('예진이', msg);
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// --- ⭐ 스케줄러 설정 변경 끝 ⭐ ---


// 참고: 기존의 require('./src/scheduler'); 라인은 src/scheduler.js가 비워졌다면 불필요합니다.
// 만약 완전히 제거하고 싶으시다면 이 줄을 주석 처리하거나 삭제해도 됩니다.
// require('./src/scheduler');


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
    await memoryManager.ensureMemoryDirectory();
    console.log('✅ 메모리 디렉토리 확인 및 준비 완료.');
});
