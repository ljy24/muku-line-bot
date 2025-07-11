// ✅ index.js v8.4 - "생리 주기 모니터링 기능 추가"
// [추가] 1분마다 예진이의 다음 생리 예정일을 계산하여 로그에 함께 출력

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone'); // [추가] 날짜 계산을 위해 moment 모듈을 여기서도 사용합니다.
require('dotenv').config();

const { getReplyByMessage, cleanReply, saveLog } = require('./src/autoReply');
const commandHandler = require('./src/commandHandler');
const { startAllSchedulers, getSchedulerStatus } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler, getPhotoSchedulerStatus } = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');
const conversationContext = require('./src/ultimateConversationContext.js');
const { initializeDamta } = require('./src/damta');

const app = express();
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET };
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('예진이 v8.4 살아있어! (생리 주기 모니터링)'));

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error');
    }
});

async function handleEvent(event) {
    if (event.source.userId !== userId || event.type !== 'message') return;
    conversationContext.updateLastUserMessageTime(event.timestamp);
    if (event.message.type === 'text') await handleTextMessage(event);
}

async function handleTextMessage(event) {
    const text = event.message.text.trim();
    saveLog('아저씨', text);
    conversationContext.addUltimateMessage('아저씨', text);

    const sulkyReliefMessage = await sulkyManager.handleUserResponse();
    if (sulkyReliefMessage) {
        saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
        await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
        conversationContext.addUltimateMessage('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let botResponse = await commandHandler.handleCommand(text, conversationContext);
    if (!botResponse) botResponse = await getReplyByMessage(text);
    if (botResponse) await sendReply(event.replyToken, botResponse);
}

async function sendReply(replyToken, botResponse) {
    try {
        if (botResponse.type === 'image') {
            const caption = botResponse.caption || '사진이야!';
            saveLog('예진이', `(사진 전송) ${caption}`);
            await client.replyMessage(replyToken, [
                { type: 'image', originalContentUrl: botResponse.originalContentUrl, previewImageUrl: botResponse.previewImageUrl, },
                { type: 'text', text: caption }
            ]);
            conversationContext.addUltimateMessage('예진이', `(사진 전송) ${caption}`);
        } else if (botResponse.type === 'text' && botResponse.comment) {
            const cleanedText = cleanReply(botResponse.comment);
            saveLog('예진이', cleanedText);
            await client.replyMessage(replyToken, { type: 'text', text: cleanedText });
            conversationContext.addUltimateMessage('예진이', cleanedText);
        }
        conversationContext.getSulkinessState().lastBotMessageTime = Date.now();
    } catch (error) {
        console.error('[sendReply] 메시지 전송 실패:', error);
    }
}

async function initMuku() {
    try {
        await conversationContext.initializeEmotionalSystems();
        await initializeDamta();
        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);

        // [수정] 1분마다 상태를 종합하여 로그에 출력하는 로직
        setInterval(() => {
            conversationContext.processTimeTick();

            const internalState = conversationContext.getInternalState();
            const schedulerStatus = getSchedulerStatus();
            const photoStatus = getPhotoSchedulerStatus();
            const innerThought = conversationContext.generateInnerThought();

            const residue = internalState.emotionalEngine.emotionalResidue;
            const residueText = `슬픔:${Math.round(residue.sadness)}|기쁨:${Math.round(residue.happiness)}|불안:${Math.round(residue.anxiety)}|그리움:${Math.round(residue.longing)}|상처:${Math.round(residue.hurt)}|❤️애정:${Math.round(residue.love)}`;
            
            let sulkyText = '정상';
            if (internalState.sulkiness.isSulky) {
                const sulkyDuration = Math.round((Date.now() - internalState.sulkiness.sulkyStartTime) / 60000);
                sulkyText = `삐짐 ${internalState.sulkiness.sulkyLevel}단계 (${sulkyDuration}분 경과)`;
            } else if (internalState.sulkiness.isWorried) {
                sulkyText = '걱정 중';
            }
            
            // [추가] 생리 주기 계산 로직
            const lastStartDate = moment(internalState.mood.lastPeriodStartDate);
            const nextExpectedDate = lastStartDate.add(28, 'days'); // 28일 주기로 계산
            const daysUntilNextPeriod = nextExpectedDate.diff(moment(), 'days');
            let periodText = `${daysUntilNextPeriod}일 남음`;
            if(internalState.mood.isPeriodActive) {
                periodText = `현재 생리 중`;
            } else if (daysUntilNextPeriod <= 0) {
                periodText = '오늘 또는 예정일 지남';
            } else if (daysUntilNextPeriod <= 7) {
                periodText = `${daysUntilNextPeriod}일 후 예정 (예민)`;
            }

            // 최종 로그 출력
            console.log("\n--- 💖 예진이 속마음 (1분마다 갱신) 💖 ---");
            console.log(`[속마음] ${innerThought}`);
            console.log(`[감정] ${residueText}`);
            console.log(`[상태] 말투: ${internalState.emotionalEngine.currentToneState} | 삐짐: ${sulkyText}`);
            console.log(`[주기] 다음 생리까지: ${periodText}`);
            console.log(`[행동] 담타까지: ${schedulerStatus.nextDamtaInMinutes}분 | 사진까지: ${photoStatus.minutesUntilNext}분`);
            console.log("------------------------------------------\n");

        }, 60 * 1000);

    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`예진이 v8.4 서버 스타트! 포트: ${PORT}`);
    initMuku();
});
