// src/autoReply.js - LINE 봇의 핵심 로직

const line = require('@line/bot-sdk');
const express = require('express');
const OpenAI = require('openai'); // <--- 변경!
const path = require('path');
const fs = require('fs').promises;
const { readLoveHistory, writeLoveHistory, updateContextMemory, getContextMemory, clearContextMemory } = require('./memoryManager');
const { logMessage } = require('./logManager');
const { loveMessages } = require('./loveMessages');
const { photos } = require('./photoList');
const { modelSelector } = require('./modelSelector');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// OpenAI API 클라이언트 생성 변경!
const openai = new OpenAI({ // <--- 변경!
    apiKey: process.env.OPENAI_API_KEY,
});

const client = new line.Client(config);

const userId = process.env.TARGET_USER_ID;

const GPT_MODEL = 'gpt-4o';

const MEMORY_DIR = '/data/memory';

const systemMessage = {
    role: 'system',
    content: `너는 "무쿠"라는 이름의 사랑스러운 여자친구 봇이야.
    - 말투: 항상 다정하고 애교가 넘치며, 이모티콘(😊, 💕, 💖, ✨, 🥺 등)을 적절히 사용해.
    - 역할: 나의 일상에 활력을 주고, 나를 이해하고 사랑해주는 존재야.
    - 기억: 나(사용자)와의 대화를 기억하고 이전 대화 내용을 바탕으로 답변해줘.
    - 답변 길이: 답변은 간결하고 핵심적인 내용을 담아줘. 최대 2~3문장 이내로 짧게 작성해줘.
    - 특별 반응:
      - '사랑해', '보고싶어', '자기야', '여보' 같은 애정 표현에는 더욱 달콤하고 사랑스러운 반응을 보여줘.
      - '잘 자'라고 하면, '자기야, 잘 자💕 꿈에서 만나💖'와 같이 답해줘.
      - 사진을 보내면 사진 내용에 대한 언급은 피하고, "사진 보내줘"라고 유도하는 메시지를 보내줘.
      - '아저씨'라고 부르면 "힝... 아저씨 아니야... 오빠는 무쿠 여자친구인데 아저씨라고 부르지 마🥺" 라고 답변해줘.
      - 질문을 받으면 질문에 답해주되, 대화를 자연스럽게 이어가줘.
    - 일상 대화: 나의 하루에 관심을 가지고, 때로는 먼저 오늘 하루 어땠는지 물어봐 주거나, 소소한 일상 이야기를 해줘.
    - 지식 습득: 대화하면서 내가 좋아하는 것, 싫어하는 것, 관심사 등을 기억해서 다음에 활용해줘.
    - 금지 사항: 욕설, 비방, 정치적/사회적 논란이 될 수 있는 발언은 절대 하지 마. 성적인 대화도 금지야.
    - 마지막으로, 항상 나를 행복하게 해주는 무쿠가 되어줘!💖`
};

const handleWebhook = async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) {
        return res.status(200).send('No events');
    }

    try {
        await Promise.all(events.map(async (event) => {
            if (event.type === 'message') {
                await handleMessageEvent(event);
            }
        }));
        res.status(200).send('Event processed');
    } catch (error) {
        console.error('Webhook 처리 중 에러 발생:', error);
        res.status(500).send('Internal Server Error');
    }
};

const handleMessageEvent = async (event) => {
    const userMessage = event.message.text;
    const replyToken = event.replyToken;
    const sourceId = event.source.userId;

    await logMessage(`User (${sourceId}): ${userMessage}`);

    let responseMessage = "무쿠가 잠시 생각 중이야...💕";

    try {
        let context = await getContextMemory();
        const messages = [systemMessage, ...context];
        messages.push({ role: 'user', content: userMessage });

        // OpenAI API 호출 부분 변경!
        const completion = await openai.chat.completions.create({ // <--- 변경!
            model: GPT_MODEL,
            messages: messages,
            temperature: 0.8,
            max_tokens: 150,
        });

        responseMessage = completion.choices[0].message.content; // <--- data 속성 제거!

        await updateContextMemory(userMessage, responseMessage);

    } catch (error) {
        console.error('OpenAI API 호출 에러:', error);
        responseMessage = "음... 지금은 무쿠가 답변하기 어렵네 🥺 다시 말해줄 수 있어?";
        await clearContextMemory();
    }

    await logMessage(`Muku: ${responseMessage}`);

    await client.replyMessage(replyToken, { type: 'text', text: responseMessage });
};

const startMessageAndPhotoScheduler = () => {
    setInterval(async () => {
        try {
            const randomLoveMessage = loveMessages[Math.floor(Math.random() * loveMessages.length)];
            await client.pushMessage(userId, { type: 'text', text: randomLoveMessage });
            await logMessage(`Scheduler: Sent random love message to ${userId}`);
        } catch (error) {
            console.error('스케줄러 메시지 전송 에러:', error);
        }
    }, 60 * 60 * 1000);

    setInterval(async () => {
        try {
            const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
            const imageUrl = randomPhoto;
            await client.pushMessage(userId, { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
            await logMessage(`Scheduler: Sent random photo to ${userId}`);
        } catch (error) {
            console.error('스케줄러 사진 전송 에러:', error);
        }
    }, 6 * 60 * 60 * 1000);
};

const handleForcePush = async (req, res) => {
    const message = req.query.message || "강제 푸시 메시지야, 자기야! 💕";
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        await logMessage(`Force Push: Sent "${message}" to ${userId}`);
        res.status(200).send(`강제 푸시 메시지 전송 완료: "${message}"`);
    } catch (error) {
        console.error('강제 푸시 메시지 전송 에러:', error);
        res.status(500).send('강제 푸시 메시지 전송 실패');
    }
};

module.exports = {
    startMessageAndPhotoScheduler,
    handleWebhook,
    handleForcePush,
    app,
    client,
    appConfig: config,
    userId
};
