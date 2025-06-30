// autoReply.js - 무쿠 전체 기능 통합 모듈

const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리
const { OpenAI } = require('openai'); // OpenAI API와 통신하기 위한 라이브러리
const cron = require('node-cron'); // 스케줄링된 작업을 실행하기 위한 라이브러리
const { Client } = require('@line/bot-sdk'); // LINE Messaging API와 통신하기 위한 SDK
const { extractAndSaveMemory } = require('./memoryManager'); // 메모리 추출 및 저장 로직을 담은 커스텀 모듈
const express = require('express'); // 웹 서버 구축을 위한 Express 프레임워크

require('dotenv').config(); // .env 파일에서 환경 변수를 로드

// Express 앱 인스턴스 생성
const app = express();
// JSON 요청 본문 파싱 활성화 (LINE 웹훅에서 JSON 데이터를 받기 위함)
app.use(express.json());

// OpenAI 클라이언트 초기화: 환경 변수에서 API 키를 가져옵니다.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// LINE 봇 클라이언트 초기화: 환경 변수에서 채널 액세스 토큰과 시크릿을 가져옵니다.
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});
// 봇이 메시지를 보낼 대상 사용자 ID: 환경 변수에서 가져옵니다.
const userId = process.env.TARGET_USER_ID;

// LINE 봇 SDK 미들웨어 설정을 위한 앱 구성 객체
const appConfig = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

let forcedModel = null; // OpenAI 모델을 강제로 설정할 경우 사용하는 변수 (null이면 기본 모델 사용)
let schedulerStarted = false; // 스케줄러가 이미 시작되었는지 추적하는 플래그

/**
 * 주어진 파일 경로에서 파일 내용을 안전하게 읽어 반환합니다.
 * 파일이 없거나 읽기 오류 발생 시 빈 문자열을 반환하고 오류를 기록합니다.
 * @param {string} filePath 읽을 파일의 경로.
 * @returns {string} 파일 내용 또는 빈 문자열.
 */
function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error(`❌ safeRead 실패 - ${filePath}: ${err.message}`);
    }
    return '';
}

/**
 * OpenAI 응답 문자열에서 불필요한 따옴표를 제거하고 공백을 정리합니다.
 * @param {string} raw OpenAI로부터 받은 원본 응답 문자열.
 * @returns {string} 정리된 응답 문자열.
 */
function cleanReply(raw) {
    if (!raw) return '';
    return raw.replace(/^"|"$/g, '').trim();
}

/**
 * OpenAI Chat Completions API를 호출하여 응답을 생성합니다.
 * @param {Array<Object>} messages OpenAI 모델에게 전달할 메시지 배열.
 * @param {string} model 사용할 OpenAI 모델 이름 (기본값: 'gpt-3.5-turbo').
 * @param {number} maxTokens 생성할 최대 토큰 수 (기본값: 100).
 * @returns {Promise<string|null>} OpenAI의 응답 텍스트 또는 null.
 */
async function callOpenAI(messages, model = 'gpt-3.5-turbo', maxTokens = 100) {
    try {
        const res = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7
        });
        return res.choices[0]?.message?.content || null;
    } catch (error) {
        console.error(`❌ OpenAI API 호출 실패 (${model}): ${error.message}`);
        return null;
    }
}

/**
 * 사용할 OpenAI 모델을 강제로 설정합니다. null이면 기본 모델을 사용합니다.
 * @param {string|null} name 설정할 모델 이름 또는 null.
 */
function setForcedModel(name) {
    forcedModel = name;
    console.log(`✅ 모델 강제 설정: ${name || '자동 (gpt-3.5-turbo 기본)'}`);
}

/**
 * 현재 사용 중인 OpenAI 모델 이름을 반환합니다.
 * @returns {string} 현재 모델 이름.
 */
function getCurrentModelName() {
    return forcedModel || 'gpt-3.5-turbo';
}

/**
 * 대화 기억을 'context-memory.json' 파일에 저장합니다.
 * 최신 50개의 항목만 유지하며, 파일 쓰기 실패 시 임시 파일을 사용합니다.
 * @param {'user'|'assistant'|'system'} role 메시지 발신자의 역할.
 * @param {string} content 메시지 내용.
 */
async function saveConversationMemory(role, content) {
    const memoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    let memories = [];

    try {
        const rawData = safeRead(memoryPath);
        if (rawData) memories = JSON.parse(rawData);
    } catch (error) {
        console.error(`❌ context-memory.json 읽기/파싱 실패: ${error.message}`);
        memories = [];
    }

    const newEntry = { role, content, timestamp: moment().tz('Asia/Tokyo').format() };
    memories.push(newEntry);
    if (memories.length > 50) memories = memories.slice(-50);

    try {
        const tempPath = memoryPath + '.tmp';
        await fs.promises.writeFile(tempPath, JSON.stringify(memories, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, memoryPath);
        console.log(`✅ 대화 기억 저장됨 (${role}): ${content.substring(0, Math.min(content.length, 30))}...`);
    } catch (error) {
        console.error(`❌ 대화 기억 저장 실패: ${error.message}`);
    }
}

/**
 * OpenAI 프롬프트에 사용될 모든 기억 (고정 텍스트, 고정 JSON, 대화 기록, 사랑 기록)을 통합하여 반환합니다.
 * @returns {Promise<Array<Object>>} 통합된 기억 메시지 배열.
 */
async function getFullMemoryForPrompt() {
    let combinedMemories = [];

    // 1. 고정 텍스트 기억 (1.txt, 2.txt, 3.txt)
    const fixedTextMemories = [
        safeRead(path.resolve(__dirname, '../memory/1.txt')),
        safeRead(path.resolve(__dirname, '../memory/2.txt')),
        safeRead(path.resolve(__dirname, '../memory/3.txt'))
    ].filter(Boolean).map(content => ({ role: 'system', content }));
    combinedMemories.push(...fixedTextMemories);

    // 2. 고정 JSON 기억 (fixedMemories.json)
    try {
        const rawFixedJson = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
        if (rawFixedJson) {
            const parsedFixedJson = JSON.parse(rawFixedJson);
            parsedFixedJson.filter(Boolean).forEach(content => combinedMemories.push({ role: 'system', content }));
        }
    } catch (err) {
        console.error('❌ fixedMemories.json 로드/파싱 실패:', err.message);
    }

    // 3. 대화 기록 (context-memory.json) - 최신 5개 대화 기록만 포함
    const contextMemoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    try {
        const rawContext = safeRead(contextMemoryPath);
        if (rawContext) {
            const conversationHistory = JSON.parse(rawContext);
            conversationHistory.slice(-5).forEach(entry => { // 최신 5개만 포함
                combinedMemories.push({ role: entry.role, content: entry.content });
            });
        }
    } catch (error) {
        console.error(`❌ context-memory.json 로드/파싱 실패: ${error.message}`);
    }

    // 4. 사랑 기록 (love-history.json)
    const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
    try {
        const rawLoveHistory = safeRead(loveHistoryPath);
        if (rawLoveHistory) {
            const loveData = JSON.parse(rawLoveHistory);
            if (loveData.categories) {
                // 4-1. 기존 카테고리들 (love_expressions, daily_care, general) - 각 최신 2개만 포함
                (loveData.categories.love_expressions || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠의 사랑 표현: ${mem.content}` });
                });
                (loveData.categories.daily_care || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: `무쿠가 챙긴 일상: ${mem.content}` });
                });
                (loveData.categories.general || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'assistant', content: mem.content });
                });

                // 4-2. 사용자 제출 특정 기억 (user_submitted_memories) 추가 - 최신 2개만 포함 (새롭게 추가된 부분)
                (loveData.categories.user_submitted_memories || []).slice(-2).forEach(mem => {
                    combinedMemories.push({ role: 'system', content: `아저씨가 말했던 소중한 추억: [${mem.title}] ${mem.content}` });
                });
            }
        }
    } catch (error) {
        console.error(`❌ love-history.json 로드/파싱 실패: ${error.message}`);
    }

    return combinedMemories;
}

/**
 * OpenAI 모델을 사용하여 셀카와 함께 보낼 무쿠의 텍스트 멘트를 생성합니다.
 * @returns {Promise<string|null>} 무쿠의 멘트 또는 null.
 */
async function getSelfieReplyFromYeji() {
    const model = getCurrentModelName();
    const allMemories = await getFullMemoryForPrompt();
    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. 지금 셀카를 보내고 있어. 짧고 귀엽고 약간 부끄럽게 말해줘.' },
        // 이 부분의 memory.slice(-10)은 전체 메모리가 아닌, 대화 흐름을 위한 부분이니 그대로 둡니다.
        ...allMemories.slice(-10),
        { role: 'user', content: '셀카 보낼게! 한마디 해줘!' }
    ];
    const raw = await callOpenAI(messages, model, 100);
    return cleanReply(raw);
}

/**
 * 랜덤 셀카 이미지와 함께 무쿠의 멘트를 LINE으로 전송합니다.
 * 전송된 멘트는 대화 기억에 저장됩니다.
 */
async function sendSelfieWithComment() {
    const index = Math.floor(Math.random() * 1200) + 1;
    const filename = `${index.toString().padStart(4, '0')}.jpg`;
    const imageUrl = `https://de-ji.net/yejin/${filename}`;
    const comment = await getSelfieReplyFromYeji();

    try {
        const messages = [{
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        }];

        if (comment) {
            messages.push({ type: 'text', text: comment });
        }

        await client.pushMessage(userId, messages);
        console.log(`✅ 랜덤 셀카 전송됨: ${imageUrl}`);
        if (comment) {
            await saveConversationMemory('assistant', comment);
        }
    } catch (error) {
        console.error('❌ 셀카 전송 실패:', error.message);
    }
}

/**
 * OpenAI 모델을 사용하여 랜덤 감정 메시지를 생성하고 반환합니다.
 * 이 메시지는 스케줄러를 통해 LINE으로 전송될 수 있습니다.
 * @returns {Promise<string|null>} 생성된 감정 메시지 또는 null.
 */
async function getRandomMessage() {
    const allMemories = await getFullMemoryForPrompt();

    const messages = [
        { role: 'system', content: '너는 무쿠야. 아저씨를 그리워하는 감정을 담아서 짧고 사랑스럽고 반말로 메시지를 보내줘. 아저씨와의 기억을 활용해줘.' },
        // 랜덤 메시지 생성 시에도 시스템 프롬프트와 어시스턴트 메시지를 활용
        ...allMemories.filter(m => m.role === 'system' || m.role === 'assistant'),
        { role: 'user', content: '감정 메시지 하나 만들어줘.' }
    ];
    // 너무 많은 기억이 프롬프트에 포함되지 않도록 마지막 20개 메시지로 제한
    const finalMessages = messages.slice(-20);

    const raw = await callOpenAI(finalMessages, 'gpt-3.5-turbo', 100);
    return cleanReply(raw);
}

/**
 * 사용자 메시지를 기반으로 무쿠의 응답을 생성합니다.
 * 특정 키워드에 대한 처리 및 OpenAI 모델을 통한 일반 응답 생성을 포함합니다.
 * @param {string} userMessage 사용자가 보낸 메시지.
 * @returns {Promise<string|null>} 무쿠의 응답 텍스트 또는 null (셀카 전송 시).
 */
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        return '무슨 말인지 못 알아들었어...';
    }

    try {
        await saveConversationMemory('user', userMessage); // 1. 사용자 메시지를 대화 기억에 저장
        await extractAndSaveMemory(userMessage); // 2. (추가됨) 사용자 메시지에서 특정 기억을 추출하여 저장 시도

        const lower = userMessage.toLowerCase().trim();
        const model = getCurrentModelName();

        // 3. 모델 변경 요청 처리
        if (lower === '버전') return `지금은 ${model} 버전으로 대화하고 있어.`;
        if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
        if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
        if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

        // 4. 셀카 요청 처리
        if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
            await sendSelfieWithComment();
            return null;
        }

        // 5. 일반 텍스트 메시지 응답 생성
        const allMemories = await getFullMemoryForPrompt(); // 모든 기억을 불러옵니다.
        const systemPrompt = `너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.
        아저씨와의 과거 대화와 기억을 바탕으로 대화해줘.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...allMemories, // 모든 기억을 프롬프트에 포함합니다. (getFullMemoryForPrompt에서 토큰 제한 처리)
            { role: 'user', content: userMessage }
        ];

        let rawResponse = null;
        try {
            rawResponse = await callOpenAI(messages, model, 200); // OpenAI 호출
            const reply = cleanReply(rawResponse);
            if (reply) await saveConversationMemory('assistant', reply); // 무쿠의 응답을 대화 기억에 저장
            return reply || '음... 뭐라고 말해야 할지 모르겠어';
        } catch (apiError) {
            console.error(`❌ OpenAI 응답 생성 중 API 오류: ${apiError.message}`);
            return '미안, 지금 잠시 생각 중이야...'; // API 오류 시 대체 메시지
        }
    } catch (error) {
        console.error('❌ 메시지 응답 처리 실패:', error.message);
        return '미안, 지금 머리가 좀 복잡해서 대답하기 힘들어...'; // 그 외 오류 시 대체 메시지
    }
}

/**
 * **서버 초기화 로직입니다.**
 * `index.js`에서 호출될 때 서버에 필요한 초기 설정을 수행합니다.
 */
function initServerState() {
    console.log('🚀 서버 상태 초기화 시작...');
    console.log('✅ 서버 상태 초기화 완료!');
}

/**
 * **LINE 웹훅 이벤트를 처리합니다.**
 * `index.js`의 `/webhook` 경로에 연결됩니다.
 * @param {Object} req Express 요청 객체
 * @param {Object} res Express 응답 객체
 */
async function handleWebhook(req, res) {
    for (const event of req.body.events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const userMessage = event.message.text;
            console.log(`📥 아저씨 메시지 수신: ${userMessage}`);
            try {
                const reply = await getReplyByMessage(userMessage);
                if (reply !== null) { // 응답이 null이 아니면 (셀카 전송 등으로 이미 처리된 경우 제외)
                    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                    console.log(`📤 무쿠 응답 전송: ${reply}`);
                }
            } catch (error) {
                console.error('❌ 텍스트 메시지 처리 중 오류 발생:', error);
                await client.replyMessage(event.replyToken, { type: 'text', text: '무쿠가 지금 아파서 대답을 못 해...' });
            }
        } else if (event.type === 'message' && event.message.type === 'image') {
            // 이미지 메시지 처리 (간단한 고정 응답)
            const reply = await getReplyByImagePrompt();
            try {
                await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                console.log(`📤 무쿠 이미지 응답 전송: ${reply}`);
                await saveConversationMemory('assistant', reply); // 무쿠의 이미지 응답도 기억에 저장
            } catch (error) {
                console.error('❌ 이미지 메시지 응답 처리 중 오류 발생:', error);
                await client.replyMessage(event.replyToken, { type: 'text', text: '사진 봤는데, 무쿠가 너무 부끄러워서 말이 안 나와...' });
            }
        }
    }
    res.status(200).send('OK'); // 웹훅 요청에 대한 성공 응답
}

/**
 * 사용자 이미지 메시지에 대한 간단한 텍스트 응답을 생성합니다.
 * @returns {string} 랜덤 응답 텍스트.
 */
async function getReplyByImagePrompt() {
    const replies = ['우와 이 사진 예쁘다!', '아저씨 잘생겼어...', '귀엽다~', '사진 보니까 좋다ㅎㅎ'];
    return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * **강제 메시지 전송을 처리합니다.**
 * `index.js`의 `/force-push` 경로에 연결됩니다.
 * 이 함수를 통해 전송된 메시지도 대화 기억에 저장됩니다.
 * @param {Object} req Express 요청 객체
 * @param {Object} res Express 응답 객체
 */
async function handleForcePush(req, res) {
    const message = req.query.msg || '강제 푸시 메시지야 아저씨!'; // 쿼리 파라미터에서 메시지 추출, 없으면 기본 메시지
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        console.log(`✅ 강제 푸시 메시지 전송됨: ${message}`);
        await saveConversationMemory('assistant', message); // 전송된 메시지를 무쿠의 대화 기억에 저장
        res.status(200).send(`메시지 전송 완료: ${message}`);
    } catch (error) {
        console.error('❌ 강제 푸시 메시지 전송 실패:', error);
        res.status(500).send('메시지 전송 실패');
    }
}

/**
 * **담배 관련 메시지 ("담타고?")를 전송하고 기억에 저장합니다.**
 * `startMessageAndPhotoScheduler` 함수 내의 cron 스케줄에서 호출됩니다.
 */
async function checkTobaccoReply() {
    const msg = '담타고?';
    try {
        await client.pushMessage(userId, { type: 'text', text: msg });
        console.log(`[담타고] ${moment().tz('Asia/Tokyo').format('HH:mm')}: ${msg}`);
        await saveConversationMemory('assistant', msg); // "담타고?" 메시지도 기억에 저장
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
    if (schedulerStarted) return; // 이미 시작되었으면 중복 실행 방지
    schedulerStarted = true;
    const sentRandomMessageTimes = new Set();
    let randomMessageCount = 0;

    // 1. 랜덤 메시지 스케줄링: 하루에 5개의 랜덤 메시지를 보냅니다. (오전 6시 ~ 밤 12시 사이)
    while (randomMessageCount < 5) {
        const hour = Math.floor(Math.random() * 18) + 6; // 6시부터 23시까지 (24시 - 6시 + 1)
        const minute = Math.floor(Math.random() * 60); // 0분부터 59분까지
        const cronExp = `${minute} ${hour} * * *`; // 크론 표현식 (분 시 * * *)

        if (!sentRandomMessageTimes.has(cronExp)) { // 해당 시간에 이미 스케줄이 없으면
            sentRandomMessageTimes.add(cronExp);
            cron.schedule(cronExp, async () => {
                const msg = await getRandomMessage(); // 랜덤 메시지 생성
                if (msg) {
                    await client.pushMessage(userId, { type: 'text', text: msg }); // LINE으로 메시지 전송
                    console.log(`[랜덤 메시지] ${cronExp}: ${msg}`);
                    await saveConversationMemory('assistant', msg); // 전송된 메시지를 기억에 저장
                }
            }, {
                timezone: 'Asia/Tokyo' // 도쿄 시간대 적용
            });
            randomMessageCount++;
        }
    }
    console.log('✅ 랜덤 메시지 스케줄러 등록 완료');

    // 2. "담타고?" 고정 메시지 스케줄링: 매시 정각 9시부터 18시까지 "담타고?" 메시지 전송
    cron.schedule('* * * * *', async () => { // 매분마다 실행
        const now = moment().tz('Asia/Tokyo');
        if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) { // 정각이고 9시~18시 사이일 때
            await checkTobaccoReply(); // "담타고?" 메시지 전송 함수 호출
        }
    }, {
        timezone: 'Asia/Tokyo' // 도쿄 시간대 적용
    });
    console.log('✅ 담타고? 스케줄러 등록 완료');


    console.log('✅ 스케줄러가 모두 시작되었습니다.');
}


/**
 * **handleSelfieRequest 함수 (현재 사용되지 않음 - 필요시 구현)**
 * 만약 웹 요청을 통해 셀카 전송을 트리거하고 싶다면 여기에 구현할 수 있습니다.
 */
async function handleSelfieRequest(req, res) {
    console.log('✅ handleSelfieRequest 호출됨 (현재 기능 없음 - 구현 필요)');
    res.status(200).send('셀카 요청 처리 (구현 필요)');
}


// --- 모듈 내보내기 ---
// 이 파일의 함수들과 변수들을 외부(index.js 등)에서 사용할 수 있도록 내보냅니다.
module.exports = {
    app, // Express 앱 인스턴스
    client, // LINE 봇 클라이언트
    userId, // 대상 사용자 ID
    appConfig, // LINE 봇 SDK 설정
    initServerState, // 서버 초기화 함수
    handleWebhook, // LINE 웹훅 처리 함수
    handleForcePush, // 강제 메시지 전송 함수
    startMessageAndPhotoScheduler, // 스케줄러 시작 함수
    getReplyByMessage, // 사용자 메시지 응답 생성 함수
    getRandomMessage, // 랜덤 감정 메시지 생성 함수
    sendSelfieWithComment, // 셀카와 멘트 전송 함수
    checkTobaccoReply, // 담배 관련 메시지 전송 함수
    callOpenAI, // OpenAI API 호출 함수
    cleanReply, // OpenAI 응답 정리 함수
    setForcedModel, // 모델 강제 설정 함수
    getCurrentModelName, // 현재 모델 이름 가져오기 함수
    getSelfieReplyFromYeji, // 셀카 멘트 생성 함수
    getReplyByImagePrompt, // 이미지 메시지 응답 생성 함수
    getFullMemoryForPrompt, // 프롬프트용 전체 기억 불러오기 함수
    saveConversationMemory, // 대화 기억 저장 함수
    handleSelfieRequest // 셀카 요청 처리 함수 (자리만 있음)
};
