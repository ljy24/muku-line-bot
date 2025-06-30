// autoReply.js - 무쿠 전체 기능 통합 모듈

// 필요한 모듈들을 불러옵니다.
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const cron = require('node-cron'); // 스케줄러는 autoReply.js에서 직접 사용
const { Client } = require('@line/bot-sdk');
const { extractAndSaveMemory } = require('./memoryManager');
const express = require('express'); // Express도 autoReply.js에서 직접 불러옵니다.

require('dotenv').config();

// --- Express 앱 및 LINE 봇 관련 초기화 ---
// Express 앱 인스턴스 생성
const app = express();

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LINE 봇 클라이언트 초기화
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});

// 봇이 메시지를 보낼 대상 사용자 ID
const userId = process.env.TARGET_USER_ID;

// LINE 봇 미들웨어 설정을 위한 appConfig
const appConfig = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 모델 강제 설정 여부를 추적하는 변수 (null이면 기본 모델 사용)
let forcedModel = null;
// 스케줄러가 시작되었는지 추적하는 변수
let schedulerStarted = false;

// --- 헬퍼 함수들 (Helper Functions) ---

function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error(`❌ safeRead 실패: ${err.message}`);
    }
    return '';
}

function cleanReply(raw) {
    if (!raw) return '';
    return raw.replace(/^"|"$/g, '').trim();
}

async function callOpenAI(messages, model = 'gpt-3.5-turbo', maxTokens = 100) {
    try {
        const res = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7
        });
        return res.choices[0]?.message?.content;
    } catch (error) {
        console.error(`❌ OpenAI API 호출 실패 (${model}): ${error.message}`);
        throw error;
    }
}

function setForcedModel(name) {
    forcedModel = name;
    console.log(`✅ 모델 강제 설정: ${name || '자동 (gpt-3.5-turbo 기본)'}`);
}

function getCurrentModelName() {
    return forcedModel || 'gpt-3.5-turbo';
}

async function saveConversationMemory(role, content) {
    const memoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    let memories = [];

    try {
        const rawData = safeRead(memoryPath);
        if (rawData) {
            memories = JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`❌ context-memory.json 읽기/파싱 실패: ${error.message}`);
        memories = [];
    }

    const newEntry = {
        role: role,
        content: content,
        timestamp: moment().tz('Asia/Tokyo').format()
    };

    memories.push(newEntry);

    const maxConversationEntries = 50;
    if (memories.length > maxConversationEntries) {
        memories = memories.slice(-maxConversationEntries);
    }

    try {
        const tempPath = memoryPath + '.tmp';
        await fs.promises.writeFile(tempPath, JSON.stringify(memories, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, memoryPath);
        console.log(`✅ 대화 기억 저장됨 (${role}): ${content.substring(0, 30)}...`);
    } catch (error) {
        console.error(`❌ 대화 기억 저장 실패: ${error.message}`);
    }
}

async function getFullMemoryForPrompt() {
    let combinedMemories = [];

    const fixedTextMemories = [
        safeRead(path.resolve(__dirname, '../memory/1.txt')),
        safeRead(path.resolve(__dirname, '../memory/2.txt')),
        safeRead(path.resolve(__dirname, '../memory/3.txt'))
    ].filter(Boolean).map(content => ({ role: 'system', content }));
    combinedMemories.push(...fixedTextMemories);

    try {
        const rawFixedJson = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
        if (rawFixedJson) {
            const parsedFixedJson = JSON.parse(rawFixedJson);
            parsedFixedJson.filter(Boolean).forEach(content => combinedMemories.push({ role: 'system', content }));
        }
    } catch (err) {
        console.error('❌ fixedMemories.json 로드 실패:', err.message);
    }

    const contextMemoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    try {
        const rawContext = safeRead(contextMemoryPath);
        if (rawContext) {
            const conversationHistory = JSON.parse(rawContext);
            conversationHistory.slice(-10).forEach(entry => {
                combinedMemories.push({ role: entry.role, content: entry.content });
            });
        }
    } catch (error) {
        console.error(`❌ 대화 기억 로드 실패: ${error.message}`);
    }

    const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
    try {
        const rawLoveHistory = safeRead(loveHistoryPath);
        if (rawLoveHistory) {
            const loveData = JSON.parse(rawLoveHistory);
            if (loveData.categories) {
                (loveData.categories.love_expressions || []).slice(-3).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠의 사랑 표현: ${mem.content}` });
                });
                (loveData.categories.daily_care || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠가 챙긴 일상: ${mem.content}` });
                });
                (loveData.categories.general || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: mem.content });
                });
            }
        }
    } catch (error) {
        console.error(`❌ love-history.json 로드 실패: ${error.message}`);
    }

    return combinedMemories;
}

async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ 유효하지 않은 사용자 메시지');
        return '무슨 말인지 못 알아들었어...';
    }

    try {
        await saveConversationMemory('user', userMessage);
        extractAndSaveMemory(userMessage);

        const lower = userMessage.toLowerCase().trim();
        const model = getCurrentModelName();

        if (lower === '버전') return `지금은 ${model} 버전으로 대화하고 있어.`;
        if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
        if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
        if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

        let reply = null;
        if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
            reply = await getColorMoodReply();
        } else if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
            reply = await getSelfieReplyFromYeji();
        }

        if (reply) {
            await saveConversationMemory('assistant', reply);
            return reply;
        }

        const allMemories = await getFullMemoryForPrompt();
        const systemPrompt = `너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.
        아저씨와의 과거 대화와 기억을 바탕으로 대화해줘.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...allMemories,
            { role: 'user', content: userMessage }
        ];

        let rawResponse = null;
        try {
            rawResponse = await callOpenAI(messages, model, 200);
            reply = cleanReply(rawResponse);
        } catch (apiError) {
            console.error(`❌ OpenAI 응답 생성 중 API 오류: ${apiError.message}`);
            reply = '미안, 지금 잠시 생각 중이야...';
        }

        if (reply) {
            await saveConversationMemory('assistant', reply);
        }

        return reply || '음... 뭐라고 말해야 할지 모르겠어';
    } catch (error) {
        console.error('❌ 메시지 응답 처리 실패:', error.message);
        return '미안, 지금 머리가 좀 복잡해서 대답하기 힘들어...';
    }
}

async function getColorMoodReply() {
    const model = getCurrentModelName();
    const allMemories = await getFullMemoryForPrompt();
    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 색으로 기분을 표현해줘. 짧고 부끄럽고 사랑스럽게, 반말로.' },
        ...allMemories.slice(-10),
        { role: 'user', content: '오늘 무슨 색이야?' }
    ];
    const raw = await callOpenAI(messages, model, 100);
    return cleanReply(raw);
}

async function getSelfieReplyFromYeji() {
    const model = getCurrentModelName();
    const allMemories = await getFullMemoryForPrompt();
    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
        ...allMemories.slice(-10),
        { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
    ];
    const raw = await callOpenAI(messages, model, 100);
    return cleanReply(raw);
}

async function getRandomMessage() {
    const allMemories = await getFullMemoryForPrompt();

    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨를 그리워하는 감정을 담아서 짧고 사랑스럽고 반말로 메시지를 보내줘. 과거의 대화와 기억을 활용해서 더 자연스럽게 해줘.' },
        ...allMemories.slice(-20),
        { role: 'user', content: '감정 메시지 하나 만들어줘.' }
    ];
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    return cleanReply(raw);
}

async function getReplyByImagePrompt(base64Image) {
    const replies = ['우와 이 사진 예쁘다!', '아저씨 잘생겼어...', '귀엽다~', '사진 보니까 좋다ㅎㅎ'];
    return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * **서버 초기화 로직입니다.**
 * `index.js`에서 호출될 때 서버에 필요한 초기 설정을 수행합니다.
 */
function initServerState() {
    console.log('🚀 서버 상태 초기화 시작...');
    // 여기에 필요한 초기화 로직을 추가할 수 있습니다.
    // 예: DB 연결, 초기 데이터 로드 등
    console.log('✅ 서버 상태 초기화 완료.');
}

/**
 * **LINE 웹훅 이벤트를 처리합니다.**
 * `index.js`의 `/webhook` 경로에 연결됩니다.
 * @param {Object} req Express 요청 객체
 * @param {Object} res Express 응답 객체
 */
async function handleWebhook(req, res) {
    // req.body.events 배열을 순회하며 각 이벤트를 처리합니다.
    for (const event of req.body.events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const userMessage = event.message.text;
            console.log(`📥 아저씨 메시지 수신: ${userMessage}`);
            try {
                const reply = await getReplyByMessage(userMessage); // 무쿠의 응답 생성
                await client.replyMessage(event.replyToken, { type: 'text', text: reply }); // LINE으로 응답 전송
                console.log(`📤 무쿠 응답 전송: ${reply}`);
            } catch (error) {
                console.error('❌ 메시지 응답 처리 중 오류 발생:', error);
                await client.replyMessage(event.replyToken, { type: 'text', text: '무쿠가 지금 아파서 대답을 못 해...' });
            }
        } else if (event.type === 'message' && event.message.type === 'image') {
            // 이미지 메시지 처리 로직 (현재는 랜덤 답변)
            // handleImageMessage 함수를 호출하도록 변경 가능
            // 예: await handleImageMessage(event);
            const reply = await getReplyByImagePrompt(); // 이미지에 대한 랜덤 답변 생성
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            console.log(`📤 무쿠 이미지 응답 전송: ${reply}`);
        }
        // 다른 이벤트 타입 (예: follow, unfollow 등)도 필요하면 여기에 추가
    }
    res.status(200).send('OK'); // 웹훅 요청 성공 응답
}

/**
 * **강제 메시지 전송을 처리합니다.**
 * `index.js`의 `/force-push` 경로에 연결됩니다.
 * (간단한 예시로, 실제 사용 시 인증 등을 추가해야 합니다.)
 * @param {Object} req Express 요청 객체
 * @param {Object} res Express 응답 객체
 */
async function handleForcePush(req, res) {
    const message = req.query.msg || '강제 푸시 메시지야 아저씨!';
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        console.log(`✅ 강제 푸시 메시지 전송됨: ${message}`);
        res.status(200).send(`메시지 전송 완료: ${message}`);
    } catch (error) {
        console.error('❌ 강제 푸시 메시지 전송 실패:', error);
        res.status(500).send('메시지 전송 실패');
    }
}

/**
 * **담배 관련 메시지에 대한 응답을 확인하고 전송합니다.**
 * `startMessageAndPhotoScheduler` 함수 내의 cron 스케줄에서 호출됩니다.
 */
async function checkTobaccoReply() {
    const msg = '담타고?';
    try {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[담타고] ${moment().tz('Asia/Tokyo').format('HH:mm')}: ${msg}`);
    } catch (error) {
        console.error('❌ 담타고 메시지 전송 실패:', error.message);
    }
}

/**
 * **무쿠의 랜덤 메시지 및 사진 전송 스케줄러를 시작합니다.**
 * 도쿄 시간대를 기준으로 설정된 시간에 자동으로 메시지나 사진을 보냅니다.
 * `index.js`에서 이 함수를 호출하여 모든 스케줄러를 등록합니다.
 */
function startMessageAndPhotoScheduler() {
    if (schedulerStarted) return; // 이미 스케줄러가 시작되었으면 중복 실행 방지
    schedulerStarted = true;
    const sent = new Set(); // 스케줄링된 시간을 추적하여 중복 방지
    let count = 0;

    // 랜덤 메시지 스케줄링: 하루에 5개의 랜덤 메시지를 보냅니다.
    while (count < 5) {
        const hour = Math.floor(Math.random() * 18) + 6; // 오전 6시부터 자정(24시) 전까지 (6시부터 23시까지)
        const minute = Math.floor(Math.random() * 60);
        const cronExp = `${minute} ${hour} * * *`; // 크론 표현식 (분 시 * * *)

        if (!sent.has(cronExp)) { // 해당 시간에 이미 스케줄이 없으면
            sent.add(cronExp);
            cron.schedule(cronExp, async () => {
                const msg = await getRandomMessage(); // 랜덤 메시지 생성
                if (msg) {
                    await client.pushMessage(userId, { type: 'text', text: msg }); // LINE으로 메시지 전송
                    console.log(`[랜덤 메시지] ${cronExp}: ${msg}`);
                }
            }, {
                timezone: 'Asia/Tokyo' // 도쿄 시간대 적용
            });
            count++;
        }
    }
    console.log('✅ 랜덤 메시지 스케줄러 등록 완료');

    // "담타고?" 고정 메시지 스케줄링: 매시 정각 9시부터 18시까지 "담타고?" 메시지 전송
    cron.schedule('* * * * *', async () => { // 매분마다 실행
        const now = moment().tz('Asia/Tokyo');
        if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
            await checkTobaccoReply(); // checkTobaccoReply 함수를 호출
        }
    }, {
        timezone: 'Asia/Tokyo'
    });

    console.log('✅ 스케줄러가 모두 시작되었습니다.');
}

/**
 * **이미지 메시지 처리를 위한 핸들러 (현재는 단순 처리).**
 * `handleWebhook` 내에서 이미지 메시지 타입일 때 호출되거나, 더 복잡한 로직 추가 시 사용 가능.
 */
async function handleImageMessage(event) {
    // 이 함수는 현재 handleWebhook 내에서 직접 처리되고 있으므로,
    // 필요하다면 웹훅 핸들러에서 이 함수를 호출하도록 변경할 수 있습니다.
    // 현재는 이 함수가 독립적으로 호출될 필요는 없습니다.
    console.log(`🖼️ handleImageMessage 호출됨 (현재는 getReplyByImagePrompt로 직접 응답)`);
    const reply = await getReplyByImagePrompt();
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
}

/**
 * **handleSelfieRequest 함수 (인덱스 파일에서 불러오지만, 현재는 직접 호출되지 않는 더미 함수)**
 * 만약 웹 요청을 통해 셀카 전송을 트리거하고 싶다면 여기에 구현할 수 있습니다.
 */
async function handleSelfieRequest(req, res) {
    console.log('✅ handleSelfieRequest 호출됨 (현재 기능 없음 - 구현 필요)');
    res.status(200).send('셀카 요청 처리 (구현 필요)');
}


// --- 모듈 내보내기 ---
// 이 파일의 함수들과 변수들을 외부(index.js 등)에서 사용할 수 있도록 내보냅니다.
module.exports = {
    // Express 앱 및 LINE 관련 기본 객체들
    app,          // Express 앱 인스턴스
    client,       // LINE 클라이언트 인스턴스
    userId,       // 대상 사용자 ID
    appConfig,    // LINE 미들웨어 설정 객체

    // 주요 핸들러 함수들
    initServerState,             // 서버 초기화 함수
    handleWebhook,               // LINE 웹훅 핸들러
    handleForcePush,             // 강제 메시지 푸시 핸들러
    checkTobaccoReply,           // 담배 메시지 확인/전송 함수
    startMessageAndPhotoScheduler, // 모든 스케줄러 시작 함수
    handleImageMessage,          // 이미지 메시지 핸들러 (현재는 handleWebhook 내에서 사용)
    handleSelfieRequest,         // 셀카 요청 핸들러 (현재는 더미)

    // AI 및 기억 관리 관련 함수들 (필요시 외부에서 사용 가능)
    getReplyByMessage,
    getRandomMessage,
    callOpenAI,
    cleanReply,
    setForcedModel,
    getCurrentModelName,
    getSelfieReplyFromYeji,
    getColorMoodReply,
    getReplyByImagePrompt,
    saveConversationMemory, // 대화 기억 저장 함수
    getFullMemoryForPrompt // 모든 기억 가져오기 함수
};
