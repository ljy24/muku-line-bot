// ✅ index.js v1.8 - 서버 시작 시 "아저씨 뭐해?" 자동 메시지 전송 추가

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
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getMemoryListForSharing,
    getSilenceCheckinMessage
} = require('./src/autoReply');

const memoryManager = require('./src/memoryManager');

const app = express();
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

let lastUserMessageTime = Date.now();

app.get('/', (_, res) => res.send('무쿠 살아있엉'));

app.get('/force-push', async (req, res) => {
    const msg = await getRandomMessage();
    if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg });
        res.send(`전송됨: ${msg}`);
    } else res.send('메시지 생성 실패');
});

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message') {
                const message = event.message;
                if (event.source.userId === userId) {
                    lastUserMessageTime = Date.now();
                    console.log(`[Webhook] 아저씨 메시지 수신: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') {
                    const text = message.text.trim();
                    saveLog('아저씨', text);

                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                        return;
                    }

                    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text)) {
                        try {
                            const memoryList = await getMemoryListForSharing();
                            await client.replyMessage(event.replyToken, { type: 'text', text: memoryList });
                            saveLog('예진이', '아저씨의 기억 목록을 보여줬어.');
                        } catch (err) {
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 목록을 불러오기 실패했어 ㅠㅠ' });
                        }
                        return;
                    }

                    const botResponse = await getReplyByMessage(text);
                    const replyMessages = [];

                    if (botResponse.type === 'text') {
                        const safeText = botResponse.comment && botResponse.comment.trim() ? botResponse.comment : '무슨 말을 해야 할지 모르겠어 ㅠㅠ';
                        replyMessages.push({ type: 'text', text: safeText });
                    } else {
                        replyMessages.push({ type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }

                    await client.replyMessage(event.replyToken, replyMessages);
                }

                if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);

                        let mimeType = 'application/octet-stream';
                        if (buffer[0] === 0xFF && buffer[1] === 0xD8) mimeType = 'image/jpeg';
                        else if (buffer[1] === 0x50) mimeType = 'image/png';
                        else if (buffer[0] === 0x47) mimeType = 'image/gif';

                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;
                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix);
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                    } catch (err) {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
    await memoryManager.ensureMemoryDirectory();
    console.log('메모리 디렉토리 확인 완료!');

    // ✅ 서버 시작 시 아저씨에게 메시지 전송
    try {
        const greeting = '아저씨 뭐해?';
        await client.pushMessage(userId, { type: 'text', text: greeting });
        saveLog('예진이', greeting);
        console.log('[index.js] 서버 시작 인사 메시지 전송됨');
    } catch (err) {
        console.error('서버 시작 시 메시지 전송 실패:', err);
    }
});