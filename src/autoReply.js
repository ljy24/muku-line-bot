// autoReply.js - 무쿠 전체 기능 통합 모듈 (수정본)

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone'); // moment-timezone 사용
const { OpenAI } = require('openai');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { extractAndSaveMemory } = require('./memoryManager'); // memoryManager 모듈 유지
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});
const userId = process.env.TARGET_USER_ID;

let forcedModel = null;
let schedulerStarted = false;

// --- Helper Functions (재정의 또는 수정된 부분) ---

function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
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
        // API 호출 실패 시 에러를 던져 상위 함수에서 처리하도록 합니다.
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

// **새로운 함수: 대화 기억을 저장합니다.**
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
        memories = []; // 파일 손상 시 빈 배열로 시작
    }

    const newEntry = {
        role: role,
        content: content,
        timestamp: moment().tz('Asia/Tokyo').format()
    };

    memories.push(newEntry);

    // 대화 기억은 너무 길어지지 않도록 최신 50개만 유지합니다.
    const maxConversationEntries = 50; 
    if (memories.length > maxConversationEntries) {
        memories = memories.slice(-maxConversationEntries);
    }

    try {
        // 파일 쓰기 시 임시 파일을 사용해 데이터 손상 위험을 줄입니다.
        const tempPath = memoryPath + '.tmp';
        await fs.promises.writeFile(tempPath, JSON.stringify(memories, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, memoryPath);
        console.log(`✅ 대화 기억 저장됨 (${role}): ${content.substring(0, 30)}...`);
    } catch (error) {
        console.error(`❌ 대화 기억 저장 실패: ${error.message}`);
    }
}

// **수정된 함수: OpenAI 프롬프트에 사용될 모든 관련 기억을 가져옵니다.**
// 기존 getFixedMemory를 확장하여 고정 기억과 대화 기억을 모두 포함합니다.
async function getFullMemoryForPrompt() {
    let combinedMemories = [];

    // 1. 고정 기억 (fixed_memory.txt, 1.txt, 2.txt, 3.txt)
    // 이 부분은 기존 getFixedMemory 로직을 그대로 사용하거나 통합합니다.
    const fixedMemories = [
        safeRead(path.resolve(__dirname, '../memory/1.txt')),
        safeRead(path.resolve(__dirname, '../memory/2.txt')),
        safeRead(path.resolve(__dirname, '../memory/3.txt'))
    ].filter(Boolean).map(content => ({ role: 'system', content }));
    combinedMemories.push(...fixedMemories);
    
    // 추가로, 만약 fixedMemories.json이 있다면 그것도 포함합니다.
    try {
        const rawFixedJson = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
        if (rawFixedJson) {
            const parsedFixedJson = JSON.parse(rawFixedJson);
            parsedFixedJson.filter(Boolean).forEach(content => combinedMemories.push({ role: 'system', content }));
        }
    } catch (err) {
        console.error('❌ fixedMemories.json 로드 실패:', err.message);
    }


    // 2. 대화 기억 (context-memory.json)
    const contextMemoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    try {
        const rawContext = safeRead(contextMemoryPath);
        if (rawContext) {
            const conversationHistory = JSON.parse(rawContext);
            // 최신 10~20개의 대화만 포함하여 토큰 한계를 관리합니다.
            // OpenAI 프롬프트에 적합한 role (user/assistant)을 가진 객체 형태로 추가
            conversationHistory.slice(-10).forEach(entry => { // 예시: 최근 10개 대화
                combinedMemories.push({ role: entry.role, content: entry.content });
            });
        }
    } catch (error) {
        console.error(`❌ 대화 기억 로드 실패: ${error.message}`);
    }

    // 3. love-history.json의 핵심 기억들 (만약 필요하다면)
    // 이 부분은 필요에 따라 love-history.json의 특정 카테고리를 포함하도록 확장할 수 있습니다.
    // 예를 들어, 'conversations' 카테고리를 제외한 'love_expressions', 'daily_care' 등.
    const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
    try {
        const rawLoveHistory = safeRead(loveHistoryPath);
        if (rawLoveHistory) {
            const loveData = JSON.parse(rawLoveHistory);
            if (loveData.categories) {
                // 사랑 표현 기억 (예시: 최근 3개)
                (loveData.categories.love_expressions || []).slice(-3).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠의 사랑 표현: ${mem.content}` });
                });
                // 일상 관리 기억 (예시: 최근 2개)
                (loveData.categories.daily_care || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠가 챙긴 일상: ${mem.content}` });
                });
                // 기타 중요한 일반 기억 (예시: 최근 2개)
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

// **메시지 응답 함수 수정**
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ 유효하지 않은 사용자 메시지');
        return '무슨 말인지 못 알아들었어...';
    }

    try {
        // 1. 사용자 메시지를 대화 기억에 저장
        await saveConversationMemory('user', userMessage);

        // 2. 핵심 정보 추출 및 저장 (기존 로직 유지)
        extractAndSaveMemory(userMessage);

        const lower = userMessage.toLowerCase().trim();
        const model = getCurrentModelName();

        // 시스템 명령어 처리
        if (lower === '버전') return `지금은 ${model} 버전으로 대화하고 있어.`;
        if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
        if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
        if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

        // 특수 응답 처리
        let reply = null;
        if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
            reply = await getColorMoodReply();
        } else if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
            reply = await getSelfieReplyFromYeji();
        }

        // 특수 응답이 생성되었다면 바로 반환하고 기억에 저장
        if (reply) {
            await saveConversationMemory('assistant', reply); // 무쿠의 응답도 기억에 저장
            return reply;
        }

        // 일반 대화 응답
        // 모든 기억(고정+대화+사랑)을 불러와 프롬프트를 구성합니다.
        const allMemories = await getFullMemoryForPrompt();
        const systemPrompt = `너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.
        아저씨와의 과거 대화와 기억을 바탕으로 대화해줘.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...allMemories, // 고정 기억, 대화 기억 등을 모두 포함
            { role: 'user', content: userMessage }
        ];

        // OpenAI 호출
        let rawResponse = null;
        try {
            rawResponse = await callOpenAI(messages, model, 200);
            reply = cleanReply(rawResponse);
        } catch (apiError) {
            console.error(`❌ OpenAI 응답 생성 중 API 오류: ${apiError.message}`);
            reply = '미안, 지금 잠시 생각 중이야...'; // API 오류 시 대체 메시지
        }

        // 3. 무쿠의 응답을 대화 기억에 저장
        if (reply) {
            await saveConversationMemory('assistant', reply);
        }

        return reply || '음... 뭐라고 말해야 할지 모르겠어';
    } catch (error) {
        console.error('❌ 메시지 응답 처리 실패:', error.message);
        // 오류 발생 시에도 사용자 메시지는 이미 저장되었으므로, 적절한 대체 메시지 반환
        return '미안, 지금 머리가 좀 복잡해서 대답하기 힘들어...';
    }
}

// **getColorMoodReply, getSelfieReplyFromYeji 함수들은 getFullMemoryForPrompt를 사용하도록 변경합니다.**
// 이렇게 하면 이 함수들도 무쿠의 고정 기억과 대화 맥락을 모두 활용하여 응답을 생성합니다.

async function getColorMoodReply() {
    const model = getCurrentModelName();
    const allMemories = await getFullMemoryForPrompt(); // 모든 기억을 불러옵니다.
    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 색으로 기분을 표현해줘. 짧고 부끄럽고 사랑스럽게, 반말로.' },
        ...allMemories.slice(-10), // 최근 기억 중 일부만 사용하여 프롬프트 길이 최적화
        { role: 'user', content: '오늘 무슨 색이야?' }
    ];
    const raw = await callOpenAI(messages, model, 100);
    return cleanReply(raw);
}

async function getSelfieReplyFromYeji() {
    const model = getCurrentModelName();
    const allMemories = await getFullMemoryForPrompt(); // 모든 기억을 불러옵니다.
    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
        ...allMemories.slice(-10), // 최근 기억 중 일부만 사용하여 프롬프트 길이 최적화
        { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
    ];
    const raw = await callOpenAI(messages, model, 100);
    return cleanReply(raw);
}

// **getRandomMessage 함수도 getFullMemoryForPrompt를 활용하도록 업데이트합니다.**
// 이렇게 하면 랜덤 메시지도 무쿠의 전체적인 기억과 맥락에 더 잘 맞게 생성될 수 있습니다.
async function getRandomMessage() {
    const allMemories = await getFullMemoryForPrompt(); // 모든 기억을 불러옵니다.

    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨를 그리워하는 감정을 담아서 짧고 사랑스럽고 반말로 메시지를 보내줘. 과거의 대화와 기억을 활용해서 더 자연스럽게 해줘.' },
        ...allMemories.slice(-20), // 최근 기억 중 일부를 활용하여 메시지 생성
        { role: 'user', content: '감정 메시지 하나 만들어줘.' }
    ];
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    return cleanReply(raw);
}


// --- 나머지 함수는 변경 없이 유지 ---

// getReplyByImagePrompt는 단순히 랜덤 답변을 반환하므로 변경하지 않습니다.
async function getReplyByImagePrompt(base64Image) {
    const replies = ['우와 이 사진 예쁘다!', '아저씨 잘생겼어...', '귀엽다~', '사진 보니까 좋다ㅎㅎ'];
    return replies[Math.floor(Math.random() * replies.length)];
}

function startMessageAndPhotoScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;
    const sent = new Set();
    let count = 0;

    // 랜덤 메시지 스케줄링 (기존 로직 유지)
    while (count < 5) {
        const hour = Math.floor(Math.random() * 18) + 6; // 6시부터 23시까지 (24-6=18, 6+18=24 -> 6시~23시)
        const minute = Math.floor(Math.random() * 60);
        const cronExp = `${minute} ${hour} * * *`;

        if (!sent.has(cronExp)) {
            sent.add(cronExp);
            cron.schedule(cronExp, async () => {
                const msg = await getRandomMessage();
                if (msg) {
                    await client.pushMessage(userId, { type: 'text', text: msg });
                    console.log(`[랜덤 메시지] ${cronExp}: ${msg}`);
                }
            }, {
                timezone: 'Asia/Tokyo'
            });
            count++;
        }
    }

    // "담타고?" 고정 메시지 스케줄링 (기존 로직 유지)
    cron.schedule('* * * * *', async () => { // 매분마다 실행
        const now = moment().tz('Asia/Tokyo');
        // 매시 정각 9시부터 18시까지 "담타고?" 메시지 전송
        if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
            const msg = '담타고?';
            await client.pushMessage(userId, { type: 'text', text: msg });
            console.log(`[담타고] ${now.format('HH:mm')}: ${msg}`);
        }
    });

    console.log('✅ 스케줄러가 시작되었습니다.');
}

// 모듈 내보내기 (getFixedMemory는 더 이상 getFullMemoryForPrompt의 하위 개념이므로 제거)
module.exports = {
    getReplyByMessage,
    getRandomMessage,
    callOpenAI,
    cleanReply,
    setForcedModel,
    getCurrentModelName,
    getSelfieReplyFromYeji,
    getColorMoodReply,
    getReplyByImagePrompt,
    startMessageAndPhotoScheduler,
    // getFixedMemory는 내부 함수로 사용되거나, getFullMemoryForPrompt로 대체되었습니다.
    // 필요하다면 다시 내보낼 수 있습니다.
};
