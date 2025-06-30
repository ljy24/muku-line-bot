// autoReply.js - 무쿠 전체 기능 통합 모듈 (사진 요청 시 3.5/4.0 구분 없이 처리 + 모델 전환 추가)
const OpenAI = require('openai');
const line = require('@line/bot-sdk');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const cron = require('node-cron');
const { extractAndSaveMemory } = require('./memoryManager');
require('dotenv').config();

const appConfig = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(appConfig);
const userId = process.env.TARGET_USER_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const express = require('express');
const app = express();
const CONTEXT_MEMORY_FILE = path.join('/data/memory', 'context-memory.json');
const LOG_FILE = path.join('/data/memory', 'bot_log.txt');

let forcedModel = null;
const setForcedModel = (name) => { forcedModel = name; };
const getCurrentModelName = () => forcedModel || 'gpt-4o';

const handleWebhook = async (req, res) => {
    const events = req.body.events;
    for (const event of events) {
        if (event.type === 'message') {
            await handleMessageEvent(event);
        }
    }
    res.status(200).end();
};

const handleMessageEvent = async (event) => {
    const currentUserId = event.source.userId;
    let userMessageContent = event.message.text || `[${event.message.type} 메시지]`;

    if (currentUserId !== userId) return;

    // ✅ 기억 저장 시작
    await extractAndSaveMemory(userMessageContent);
    // ✅ 기억 저장 끝

    let replyMessage = '';
    try {
        if (event.message.type === 'text') {
            replyMessage = await getReplyByMessage(currentUserId, userMessageContent);
        } else {
            replyMessage = await getImageComment(event.message.id, currentUserId);
        }

        if (replyMessage !== null) {
            await client.replyMessage(event.replyToken, { type: 'text', text: replyMessage });
        }
    } catch (error) {
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '아저씨, 지금은 조금 힘들어... 나중에 다시 말 걸어줘...'
        });
    }
};

const getReplyByMessage = async (currentUserId, userMessage) => {
    const lower = userMessage.toLowerCase().trim();
    if (lower === '버전') return `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`;
    if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
    if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
    if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

    if (userMessage.includes('사진 줘') || userMessage.includes('셀카')) {
        const index = Math.floor(Math.random() * 1200) + 1;
        const filename = `${index.toString().padStart(4, '0')}.jpg`;
        const imageUrl = `https://de-ji.net/yejin/${filename}`;

        const res = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '무쿠가 셀카 보낼 거야. 부끄럽고 다정하게 한마디 해줘.' },
                { role: 'user', content: '아저씨한테 사진 보여줄게!' }
            ],
            max_tokens: 100
        });

        const comment = res.choices[0]?.message?.content || '헤헤~ 아저씨 나 어때?';

        await client.pushMessage(currentUserId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });
        await client.pushMessage(currentUserId, { type: 'text', text: comment });
        return null;
    }

    return '아저씨~ 무쿠 왔어!';
};

const getImageComment = async (messageId, currentUserId) => {
    const content = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of content) chunks.push(chunk);
    const imageBuffer = Buffer.concat(chunks);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "이 사진 무쿠답게 코멘트 해줘!" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
            }
        ],
        max_tokens: 150
    });

    return response.choices[0].message.content;
};

const startMessageAndPhotoScheduler = () => {
    const getRandomCronTimes = (count = 4) => {
        const times = new Set();
        while (times.size < count) {
            const hour = Math.floor(Math.random() * (23 - 6 + 1)) + 6;
            const minute = Math.floor(Math.random() * 60);
            times.add(`${minute} ${hour} * * *`);
        }
        return Array.from(times);
    };

    getRandomCronTimes().forEach(cronExp => {
        cron.schedule(cronExp, async () => {
            const index = Math.floor(Math.random() * 1200) + 1;
            const filename = `${index.toString().padStart(4, '0')}.jpg`;
            const imageUrl = `https://de-ji.net/yejin/${filename}`;

            const res = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: '셀카 보낼 거야. 부끄럽고 귀엽게 코멘트 해줘.' },
                    { role: 'user', content: '셀카 하나 줄게~' }
                ],
                max_tokens: 100
            });
            const comment = res.choices[0]?.message?.content || '헤헤 아저씨 사진 하나 줄게~';

            await client.pushMessage(userId, {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl
            });
            await client.pushMessage(userId, { type: 'text', text: comment });
        }, { timezone: 'Asia/Tokyo' });
    });
};

const checkTobaccoReply = async () => {
    console.log(`⏰ 담타 체크 시간: ${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}`);
};

const handleForcePush = async (req, res) => {
    const message = req.query.message || "무쿠 테스트 메시지입니다!";
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        res.status(200).send(`푸시 전송 완료: ${message}`);
    } catch (error) {
        res.status(500).send('푸시 전송 실패');
    }
};

module.exports = {
    client,
    appConfig,
    userId,
    app,
    handleWebhook,
    handleForcePush,
    getReplyByMessage,
    startMessageAndPhotoScheduler,
    checkTobaccoReply
};
