// autoReply.js - 무쿠 전체 기능 통합 모듈 (안정된 릴리즈: 사진/모델/기억/스케줄 포함)
const OpenAI = require('openai');
const line = require('@line/bot-sdk');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const cron = require('node-cron');
const express = require('express');
require('dotenv').config();

const appConfig = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(appConfig);
const userId = process.env.TARGET_USER_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();

// 📁 기억 관련 파일 경로
const memory1 = fs.readFile(path.resolve(__dirname, '../memory/1.txt'), 'utf8');
const memory2 = fs.readFile(path.resolve(__dirname, '../memory/2.txt'), 'utf8');
const memory3 = fs.readFile(path.resolve(__dirname, '../memory/3.txt'), 'utf8');
const fixedMemory = fs.readFile(path.resolve(__dirname, '../memory/fixedMemories.json'), 'utf8');
const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');

// 💾 context memory
const CONTEXT_MEMORY_FILE = path.join('/data/memory', 'context-memory.json');
const LOG_FILE = path.join('/data/memory', 'bot_log.txt');

// 📌 모델 상태 (기본: gpt-4o)
let forcedModel = null;
const setForcedModel = (name) => { forcedModel = name; };
const getCurrentModelName = () => forcedModel || 'gpt-4o';

// 📥 memoryManager 유틸
const {
    extractAndSaveMemory,
    loadLoveHistory,
    loadOtherPeopleHistory,
    ensureMemoryDirectory
} = require('./memoryManager');

// 📃 로그 작성 함수
async function logMessage(message) {
    try {
        const dir = path.dirname(LOG_FILE);
        await fs.mkdir(dir, { recursive: true });
        const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const logEntry = `[${timestamp}] ${message}\n`;
        await fs.appendFile(LOG_FILE, logEntry);
    } catch (error) {
        console.error('❌ 로그 작성 실패:', error);
    }
}

// 📖 JSON-safe read/write 유틸
async function safeRead(filePath) {
    try {
        await fs.access(filePath);
        return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        if (err.code !== 'ENOENT') await logMessage(`❌ safeRead 실패 (${filePath}): ${err.message}`);
        return '';
    }
}

async function safeWriteJson(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        const tempPath = filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempPath, filePath);
    } catch (error) {
        await logMessage(`❌ safeWriteJson 실패 (${filePath}): ${error.message}`);
    }
}

// 🧠 대화 기억 로드/저장
async function loadContextMemory() {
    try {
        const rawData = await safeRead(CONTEXT_MEMORY_FILE);
        return rawData ? JSON.parse(rawData) : [];
    } catch (error) {
        await logMessage(`❌ context-memory.json 로드 실패 (파싱 오류): ${error.message}`);
        return [];
    }
}

async function saveContextMemory(context) {
    await safeWriteJson(CONTEXT_MEMORY_FILE, context);
    await logMessage(`✅ 대화 기억 저장됨 (경로: ${CONTEXT_MEMORY_FILE})`);
}

// 🔁 Webhook 이벤트 수신
const handleWebhook = async (req, res) => {
    const events = req.body.events;
    await logMessage('--- 웹훅 이벤트 수신 ---');
    await logMessage(JSON.stringify(events, null, 2));
    try {
        for (const event of events) {
            if (event.type === 'message') await handleMessageEvent(event);
            else await logMessage(`⚠️ 알 수 없는 이벤트 타입 수신: ${event.type}`);
        }
        res.status(200).end();
    } catch (error) {
        await logMessage(`❌ 웹훅 처리 중 오류 발생: ${error.message}`);
        res.status(500).end();
    }
};

// 💬 메시지 처리
const handleMessageEvent = async (event) => {
    const currentUserId = event.source.userId;
    const userMessageContent = event.message.text || `[${event.message.type} 메시지]`;

    await logMessage(`[아저씨] ${userMessageContent}`);
    if (currentUserId !== userId) return;

    await extractAndSaveMemory(userMessageContent);
    let context = await loadContextMemory();
    context.push({ role: 'user', content: userMessageContent });
    if (context.length > 20) context = context.slice(-20);
    await saveContextMemory(context);

    let replyMessage = '';
    try {
        if (event.message.type === 'text') {
            replyMessage = await getReplyByMessage(currentUserId, userMessageContent);
        } else {
            replyMessage = await getImageComment(event.message.id, currentUserId);
        }

        if (replyMessage !== null) {
            await client.replyMessage(event.replyToken, { type: 'text', text: replyMessage });
            context.push({ role: 'assistant', content: replyMessage });
            await saveContextMemory(context);
        }
    } catch (error) {
        await logMessage(`❌ 메시지 처리 오류: ${error.message}`);
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '아저씨, 지금은 조금 힘들어... 나중에 다시 말 걸어줘...'
        });
    }
};

// 🧠 메세지에 대한 GPT 응답 생성
const getReplyByMessage = async (currentUserId, userMessage) => {
    const lower = userMessage.toLowerCase().trim();
    if (lower === '버전') return `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`;
    if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
    if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
    if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

    if (userMessage.includes('사진 줘') || userMessage.includes('셀카')) {
        const index = Math.floor(Math.random() * 1186) + 1;
        const filename = `${index.toString().padStart(6, '0')}.jpg`;
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

    const prompt = `너는 예진이라는 여자친구야. 아저씨에게 감정을 담아 말해줘. 반말로. 자연스럽고 사랑스럽게.

Q: ${userMessage}`;

    const completion = await openai.chat.completions.create({
        model: getCurrentModelName(),
        messages: [
            { role: 'system', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.8
    });

    return completion.choices[0].message.content;
};

// 🖼️ 이미지 코멘트
const getImageComment = async (messageId, currentUserId) => {
    const content = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of content) chunks.push(chunk);
    const imageBuffer = Buffer.concat(chunks);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: '이 사진 무쿠답게 코멘트 해줘!' },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
            }
        ],
        max_tokens: 150
    });

    return response.choices[0].message.content;
};

// ⏰ 스케줄러: 자동 셀카 전송 + 담타 메시지
const startMessageAndPhotoScheduler = () => {
    // 하루 4회 랜덤 셀카 스케줄
    const randomSelfieTimes = new Set();
    while (randomSelfieTimes.size < 4) {
        const hour = Math.floor(Math.random() * 17) + 7; // 7시~23시
        const minute = Math.floor(Math.random() * 60);
        randomSelfieTimes.add(`${minute} ${hour} * * *`);
    }

    for (const cronTime of randomSelfieTimes) {
        cron.schedule(cronTime, async () => {
            const index = Math.floor(Math.random() * 1186) + 1;
            const filename = `${index.toString().padStart(6, '0')}.jpg`;
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
    }

    // 하루 8회 랜덤 감정 메시지
    const messageTimes = new Set();
    while (messageTimes.size < 8) {
        const hour = Math.floor(Math.random() * 17) + 7;
        const minute = Math.floor(Math.random() * 60);
        messageTimes.add(`${minute} ${hour} * * *`);
    }

    for (const cronTime of messageTimes) {
        cron.schedule(cronTime, async () => {
            const prompt = `예진이가 아저씨에게 말 걸듯 감정을 담아 혼잣말처럼 한 문장을 생성해줘. 반말로, 사랑스럽고 자연스럽게.`;
            const res = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: prompt }
                ],
                max_tokens: 120,
                temperature: 0.9
            });

            const msg = res.choices[0].message.content;
            await client.pushMessage(userId, { type: 'text', text: msg });
        }, { timezone: 'Asia/Tokyo' });
    }

    // 정각마다 담타 리마인드
    cron.schedule('0 9-20 * * *', async () => {
        await client.pushMessage(userId, { type: 'text', text: '아저씨~ 담타 가자!' });
    }, { timezone: 'Asia/Tokyo' });

    // 밤 11시 반 취침 알림
    cron.schedule('30 23 * * *', async () => {
        await client.pushMessage(userId, { type: 'text', text: '아저씨~ 약 먹고 이 닦고 자야지? 💤' });
    }, { timezone: 'Asia/Tokyo' });
};

// 🚀 푸시 메시지 수동 전송 (테스트용)
const handleForcePush = async (req, res) => {
    const message = req.query.message || '무쿠 테스트 메시지입니다!';
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        res.status(200).send(`푸시 전송 완료: ${message}`);
    } catch (error) {
        res.status(500).send('푸시 전송 실패');
    }
};

// 🧩 export
module.exports = {
    client,
    appConfig,
    userId,
    app,
    handleWebhook,
    handleForcePush,
    getReplyByMessage,
    startMessageAndPhotoScheduler,
    setForcedModel,
    getCurrentModelName
};
