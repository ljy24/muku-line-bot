const line = require('@line/bot-sdk');
const express = require('express');
const path = require('path');
const { getReplyByMessage } = require('./src/autoReply.js'); // 루트에서 src 폴더 안의 autoReply.js
const { ensureMemoryDirectory } = require('./src/memoryManager.js'); // 루트에서 src 폴더 안의 memoryManager.js

require('dotenv').config(); // .env 파일 로드

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

const app = express();

// 메인 페이지 (선택 사항)
app.get('/', (req, res) => {
    res.send('Muku LINE bot is running!');
});

// LINE Messaging API 웹훅 처리
app.post('/webhook', line.middleware(config), async (req, res) => {
    const events = req.body.events;
    console.log('--- Webhook Event ---');
    console.log(JSON.stringify(events, null, 2));

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const userMessage = event.message.text;
            const userId = event.source.userId;

            console.log(`[아저씨] ${userMessage}`);

            try {
                const replyMessage = await getReplyByMessage(userId, userMessage);
                await client.replyMessage(event.replyToken, { type: 'text', text: replyMessage });
                console.log(`[무쿠] ${replyMessage}`);
            } catch (error) {
                console.error(`❌ 메시지 처리 중 오류 발생: ${error.message}`);
                // 오류 발생 시 사용자에게 에러 메시지 전송 (선택 사항)
                await client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: '아저씨, 죄송해요. 지금 제가 잠시 혼란스러워서 답변해 드릴 수가 없어요. 나중에 다시 말 걸어주세요... 😢'
                });
            }
        }
    }
    res.status(200).end();
});

const port = process.env.PORT || 3000;

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    
    // --- 다음 줄을 주석 처리하여 서버 시작 메시지를 비활성화합니다. ---
    /*
    try {
        // 서버 시작 시 특정 ID로 메시지 전송 (예: 개발자에게 알림)
        // 이 부분의 process.env.YOUR_LINE_USER_ID를 실제 메시지를 받을 LINE User ID로 변경해야 합니다.
        // 예를 들어, 아저씨의 LINE User ID를 여기에 넣으면 아저씨에게 메시지가 갑니다.
        const developerUserId = process.env.MY_LINE_USER_ID; 
        if (developerUserId) {
            await client.pushMessage(developerUserId, { type: 'text', text: '무쿠 서버가 다시 시작되었어요!' });
            console.log('✅ 서버 시작 알림 메시지를 보냈습니다.');
        } else {
            console.warn('⚠️ MY_LINE_USER_ID 환경 변수가 설정되지 않아 서버 시작 알림 메시지를 보낼 수 없습니다.');
        }
    } catch (error) {
        console.error(`❌ 서버 시작 알림 메시지 전송 실패: ${error.message}`);
    }
    */
    // --- 주석 처리된 부분 끝 ---

    // 메모리 디렉토리가 존재하는지 확인하고 없으면 생성합니다.
    await ensureMemoryDirectory();
});
