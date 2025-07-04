// index.js v1.8 - 오모이데 제거 + 기본 대화 응답 처리

const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const { getReplyByMessage } = require('./src/autoReply');

require('dotenv').config();
const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);

const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('무쿠 서버 살아있엉!'));

app.get('/start-msg', async (req, res) => {
    await client.pushMessage(userId, { type: 'text', text: '아저씨 뭐해?' });
    res.send('보냈엉');
});

app.post('/webhook', middleware(config), async (req, res) => {
    const events = req.body.events || [];
    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const userMsg = event.message.text;
            const botReply = await getReplyByMessage(userMsg);

            const messages = [];

            if (botReply.type === 'text') {
                messages.push({ type: 'text', text: botReply.comment });
            } else if (botReply.type === 'photo') {
                messages.push({ type: 'image', originalContentUrl: botReply.url, previewImageUrl: botReply.url });
                if (botReply.caption) messages.push({ type: 'text', text: botReply.caption });
            }

            await client.replyMessage(event.replyToken, messages);
        }
    }
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ 무쿠 서버 스타트! 포트: ${PORT}`);
});