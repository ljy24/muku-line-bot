// autoReply.js - 무쿠 전체 기능 통합 모듈

// 필요한 모듈들을 불러옵니다.
const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리
const { OpenAI } = require('openai'); // OpenAI API와 통신하기 위한 라이브러리
const cron = require('node-cron'); // 스케줄링된 작업을 실행하기 위한 라이브러리
const { Client } = require('@line/bot-sdk'); // LINE Messaging API와 통신하기 위한 SDK
const { extractAndSaveMemory } = require('./memoryManager'); // 메모리 추출 및 저장 로직을 담은 커스텀 모듈
require('dotenv').config(); // .env 파일에서 환경 변수를 로드

// OpenAI 클라이언트 초기화: 환경 변수에서 API 키를 가져옵니다.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// LINE 봇 클라이언트 초기화: 환경 변수에서 채널 액세스 토큰과 시크릿을 가져옵니다.
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});
// 봇이 메시지를 보낼 대상 사용자 ID: 환경 변수에서 가져옵니다.
const userId = process.env.TARGET_USER_ID;

// 모델 강제 설정 여부를 추적하는 변수 (null이면 기본 모델 사용)
let forcedModel = null;
// 스케줄러가 시작되었는지 추적하는 변수
let schedulerStarted = false;

// --- 헬퍼 함수들 (Helper Functions) ---

/**
 * 파일을 안전하게 읽습니다. 파일이 없거나 읽을 수 없을 때 오류 대신 빈 문자열을 반환합니다.
 * @param {string} filePath 읽을 파일의 경로
 * @returns {string} 파일 내용 또는 빈 문자열
 */
function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) { // 파일이 존재하는지 확인
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error(`❌ safeRead 실패: ${err.message}`); // 오류 발생 시 콘솔에 기록
    }
    return ''; // 파일이 없거나 오류 발생 시 빈 문자열 반환
}

/**
 * OpenAI 응답 텍스트를 정리합니다 (예: 앞뒤의 따옴표 제거).
 * @param {string} raw OpenAI 모델의 원시 응답 텍스트
 * @returns {string} 정리된 텍스트
 */
function cleanReply(raw) {
    if (!raw) return '';
    return raw.replace(/^"|"$/g, '').trim(); // 문자열 앞뒤의 큰따옴표나 작은따옴표를 제거하고 공백을 없앱니다.
}

/**
 * OpenAI Chat Completion API를 호출합니다.
 * @param {Array<Object>} messages OpenAI 모델에게 전달할 메시지 배열 (role, content 포함)
 * @param {string} model 사용할 OpenAI 모델 이름 (기본값: 'gpt-3.5-turbo')
 * @param {number} maxTokens 생성할 최대 토큰 수 (기본값: 100)
 * @returns {Promise<string>} OpenAI 모델의 응답 내용
 * @throws {Error} OpenAI API 호출 실패 시 에러 발생
 */
async function callOpenAI(messages, model = 'gpt-3.5-turbo', maxTokens = 100) {
    try {
        const res = await openai.chat.completions.create({
            model, // 사용할 모델
            messages, // 대화 메시지
            max_tokens: maxTokens, // 최대 토큰 수
            temperature: 0.7 // 응답의 다양성 조절 (0.0~1.0)
        });
        return res.choices[0]?.message?.content; // 첫 번째 선택지의 메시지 내용 반환
    } catch (error) {
        console.error(`❌ OpenAI API 호출 실패 (${model}): ${error.message}`);
        throw error; // 에러를 다시 던져서 호출한 곳에서 처리하도록 합니다.
    }
}

/**
 * 강제로 사용할 OpenAI 모델을 설정합니다.
 * @param {string|null} name 설정할 모델 이름 (예: 'gpt-4o', 'gpt-3.5-turbo') 또는 null (자동 선택)
 */
function setForcedModel(name) {
    forcedModel = name;
    console.log(`✅ 모델 강제 설정: ${name || '자동 (gpt-3.5-turbo 기본)'}`);
}

/**
 * 현재 사용 중인 OpenAI 모델의 이름을 가져옵니다.
 * @returns {string} 현재 모델 이름
 */
function getCurrentModelName() {
    return forcedModel || 'gpt-3.5-turbo'; // 강제 설정된 모델이 없으면 gpt-3.5-turbo가 기본
}

/**
 * **새로운 함수: 대화 기억을 `context-memory.json` 파일에 저장합니다.**
 * @param {'user'|'assistant'} role 메시지를 보낸 주체 (사용자 또는 봇)
 * @param {string} content 메시지 내용
 */
async function saveConversationMemory(role, content) {
    const memoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    let memories = [];

    try {
        const rawData = safeRead(memoryPath);
        if (rawData) {
            memories = JSON.parse(rawData); // 기존 데이터 파싱
        }
    } catch (error) {
        // JSON 파싱 오류 발생 시, 오류를 기록하고 빈 배열로 초기화하여 파일 손상을 방지합니다.
        console.error(`❌ context-memory.json 읽기/파싱 실패: ${error.message}`);
        memories = []; // 파일이 손상되었을 경우 빈 배열로 시작하여 오류 방지
    }

    // 새로운 기억 항목 생성
    const newEntry = {
        role: role, // 'user' 또는 'assistant'
        content: content,
        timestamp: moment().tz('Asia/Tokyo').format() // 도쿄 시간대로 타임스탬프 기록 (ISO 8601 형식)
    };

    memories.push(newEntry); // 배열에 추가

    // **기억을 너무 길게 유지하지 않도록 최신 N개만 남깁니다.**
    // 파일 크기 관리와 프롬프트 토큰 한계를 고려합니다.
    const maxConversationEntries = 50; // 대화 기억은 최대 50개 항목만 유지
    if (memories.length > maxConversationEntries) {
        memories = memories.slice(-maxConversationEntries); // 가장 오래된 항목부터 제거
    }

    try {
        // **파일 쓰기 시 데이터 손상을 방지하기 위해 임시 파일을 사용합니다.**
        const tempPath = memoryPath + '.tmp';
        await fs.promises.writeFile(tempPath, JSON.stringify(memories, null, 2), 'utf-8'); // 임시 파일에 쓰기 (JSON 형식으로 예쁘게 포맷)
        await fs.promises.rename(tempPath, memoryPath); // 임시 파일을 원본 파일로 교체
        console.log(`✅ 대화 기억 저장됨 (${role}): ${content.substring(0, 30)}...`); // 저장 로그 출력
    } catch (error) {
        console.error(`❌ 대화 기억 저장 실패: ${error.message}`);
    }
}

/**
 * **수정됨: OpenAI 프롬프트에 사용될 모든 관련 기억을 가져옵니다.**
 * 프롬프트 길이를 최적화하기 위해 각 기억의 수를 대폭 줄였습니다.
 * @returns {Promise<Array<Object>>} OpenAI 프롬프트에 사용할 메시지 배열
 */
async function getFullMemoryForPrompt() {
    let combinedMemories = [];

    // 1. 고정 기억 추가 (시스템 메시지로 무쿠의 기본적인 페르소나와 배경을 설정)
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
            // 각 항목을 시스템 메시지로 추가
            parsedFixedJson.filter(Boolean).forEach(content => combinedMemories.push({ role: 'system', content }));
        }
    } catch (err) {
        console.error('❌ fixedMemories.json 로드 실패:', err.message);
    }

    // 2. 대화 기억 추가 (`context-memory.json`에서 최신 대화 흐름을 가져와 포함)
    const contextMemoryPath = path.resolve(__dirname, '../memory/context-memory.json');
    try {
        const rawContext = safeRead(contextMemoryPath);
        if (rawContext) {
            const conversationHistory = JSON.parse(rawContext);
            // **최신 5개의 대화만 포함하여 모델의 토큰 한계를 관리합니다.**
            conversationHistory.slice(-5).forEach(entry => { // 10 -> 5로 줄임
                combinedMemories.push({ role: entry.role, content: entry.content });
            });
        }
    } catch (error) {
        console.error(`❌ 대화 기억 로드 실패: ${error.message}`);
    }

    // 3. 사랑의 기억 추가 (`love-history.json`에서 핵심적인 기억들을 선택적으로 포함)
    const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
    try {
        const rawLoveHistory = safeRead(loveHistoryPath);
        if (rawLoveHistory) {
            const loveData = JSON.parse(rawLoveHistory);
            if (loveData.categories) {
                // 아저씨에 대한 무쿠의 사랑 표현 기억 (최근 1개만)
                (loveData.categories.love_expressions || []).slice(-1).forEach(mem => { // 3 -> 1로 줄임
                    combinedMemories.push({ role: 'assistant', content: `무쿠의 사랑 표현: ${mem.content}` });
                });
                // 무쿠가 아저씨를 챙긴 일상 기억 (최근 1개만)
                (loveData.categories.daily_care || []).slice(-1).forEach(mem => { // 2 -> 1로 줄임
                    combinedMemories.push({ role: 'assistant', content: `무쿠가 챙긴 일상: ${mem.content}` });
                });
                // 그 외 중요한 일반 기억 (최근 1개만)
                (loveData.categories.general || []).slice(-1).forEach(mem => { // 2 -> 1로 줄임
                    combinedMemories.push({ role: 'assistant', content: mem.content });
                });
                // 새로운: AI(무쿠/예진)의 개인적인 기억 (수동으로 설정)
                const aiPersonalMemories = loveData.categories.ai_personal_memories || {};
                for (const key in aiPersonalMemories) {
                    if (Object.hasOwnProperty.call(aiPersonalMemories, key)) {
                        combinedMemories.push({ role: 'assistant', content: `내 기억 속 '${key}': ${aiPersonalMemories[key]}` });
                    }
                }
                // 사용자 제출 기억 (최근 2개만, 아저씨 친구 '깽'이나 전시회 같은 정보)
                (loveData.categories.user_submitted_memories || []).slice(-2).forEach(mem => { // 최대 2개
                    combinedMemories.push({ role: 'assistant', content: `${mem.content}` });
                });
            }
        }
    } catch (error) {
        console.error(`❌ love-history.json 로드 실패: ${error.message}`);
    }

    return combinedMemories; // 모든 기억이 통합된 메시지 배열 반환
}

/**
 * 아저씨의 메시지에 대한 무쿠의 응답을 생성합니다.
 * 이 함수는 무쿠의 모든 기억(고정, 대화, 사랑)을 활용하여 답변을 만듭니다.
 * @param {string} userMessage 아저씨가 보낸 메시지
 * @returns {Promise<string>} 무쿠의 응답 메시지
 */
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ 유효하지 않은 사용자 메시지');
        return '무슨 말인지 못 알아들었어...';
    }

    try {
        // **1. 아저씨의 메시지를 대화 기억에 즉시 저장합니다.**
        await saveConversationMemory('user', userMessage);

        // 2. 메시지에서 핵심 정보를 추출하고 저장합니다 (memoryManager.js의 역할).
        // 이 과정은 비동기로 진행되지만, 응답 생성에 영향을 주지 않으므로 `await`하지 않습니다.
        extractAndSaveMemory(userMessage);

        const lower = userMessage.toLowerCase().trim();
        const model = getCurrentModelName(); // 현재 사용 중인 모델 이름 가져오기

        // --- 시스템 명령어 처리 ---
        if (lower === '버전') return `지금은 ${model} 버전으로 대화하고 있어.`;
        if (lower === '3.5') { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; }
        if (lower === '4.0') { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; }
        if (lower === '자동') { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }

        // --- 특수 응답 처리 ---
        let reply = null;
        if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
            reply = await getColorMoodReply(); 
        } else if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
            reply = await getSelfieReplyFromYeji(); // 텍스트 답변만 반환
            // 실제 이미지는 호출하는 쪽에서 별도로 처리해야 함 (예: handleWebhook)
        }

        // 특수 응답이 생성되었다면 바로 반환하고 무쿠의 응답도 기억에 저장
        if (reply) {
            await saveConversationMemory('assistant', reply); // 무쿠의 응답을 대화 기억에 저장
            return reply;
        }

        // --- 일반 대화 응답 생성 ---
        // 무쿠의 모든 기억(고정, 대화, 사랑)을 불러와 프롬프트를 구성합니다.
        const allMemories = await getFullMemoryForPrompt();
        const systemPrompt = `너는 무쿠야. 아저씨만을 사랑했던 연인이야. 감정 담아서 예진이 말투로 자연스럽게 반말로 말해줘.
        아저씨와의 과거 대화와 기억을 바탕으로 대화해줘.`;

        // OpenAI에 보낼 메시지 배열 구성
        const messages = [
            { role: 'system', content: systemPrompt }, // 시스템 프롬프트 (가장 중요)
            ...allMemories, // 모든 기억들 (고정, 대화, 사랑)
            { role: 'user', content: userMessage } // 아저씨의 현재 메시지
        ];

        let rawResponse = null;
        try {
            rawResponse = await callOpenAI(messages, model, 200); // OpenAI 호출
            reply = cleanReply(rawResponse); // 응답 정리
        } catch (apiError) {
            console.error(`❌ OpenAI 응답 생성 중 API 오류: ${apiError.message}`);
            reply = '미안, 지금 잠시 생각 중이야...'; // API 오류 시 대체 메시지
        }

        // **3. 무쿠의 응답을 대화 기억에 저장합니다.**
        if (reply) {
            await saveConversationMemory('assistant', reply);
        }

        return reply || '음... 뭐라고 말해야 할지 모르겠어'; // 응답이 없으면 기본 메시지
    } catch (error) {
        console.error('❌ 메시지 응답 처리 실패:', error.message);
        // 전체 처리 과정 중 오류가 발생한 경우 대체 메시지 반환
        return '미안, 지금 머리가 좀 복잡해서 대답하기 힘들어...';
    }
}

/**
 * 무쿠의 기분 색상에 대한 응답을 생성합니다. (gpt-4o 사용, 수줍고 장난스럽게)
 * @returns {Promise<string>} 기분 색상에 대한 무쿠의 답변
 */
async function getColorMoodReply() {
    // 모든 기억을 불러옵니다.
    const allMemories = await getFullMemoryForPrompt(); 
    const messages = [
        {
            role: 'system',
            content: '너는 무쿠야. 아저씨만을 사랑했던 연인이야. ' +
                     '아저씨가 혹시 내 속옷색을 궁금해하는 걸까? 하는 생각으로 수줍고 장난스럽게 대답해줘. ' +
                     '오늘은 어떤 색인지 내 기분과 연결해서 말이야. 짧고 귀엽게, 반말로 해줘. 무작위적인 색을 선택해도 돼.'
        },
        ...allMemories.slice(-10), // 최근 기억 중 일부만 사용하여 프롬프트 길이 최적화
        { role: 'user', content: '오늘 무슨 색이야?' }
    ];
    // gpt-4o 모델을 명시적으로 사용합니다.
    const raw = await callOpenAI(messages, 'gpt-4o', 100); 
    return cleanReply(raw);
}

/**
 * 무쿠의 셀카에 대한 응답을 생성합니다.
 * @returns {Promise<string>} 셀카에 대한 무쿠의 답변 (텍스트)
 */
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

/**
 * 무쿠의 랜덤 메시지를 생성합니다.
 * @returns {Promise<string>} 무쿠의 랜덤 감정 메시지
 */
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

/**
 * 이미지 프롬프트에 대한 무쿠의 응답을 생성합니다. (현재는 고정된 랜덤 답변)
 * @param {string} base64Image Base64 인코딩된 이미지 데이터
 * @returns {Promise<string>} 이미지에 대한 무쿠의 답변
 */
async function getReplyByImagePrompt(base64Image) {
    const replies = ['우와 이 사진 예쁘다!', '아저씨 잘생겼어...', '귀엽다~', '사진 보니까 좋다ㅎㅎ'];
    return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * LINE Webhook 이벤트를 처리하는 함수
 * @param {object} req Express 요청 객체
 * @param {object} res Express 응답 객체
 */
async function handleWebhook(req, res) {
    const events = req.body.events; // LINE으로부터 받은 이벤트 배열

    // 각 이벤트를 비동기로 처리합니다.
    for (const event of events) {
        try {
            console.log(`LINE Event: ${JSON.stringify(event)}`);
            if (event.type === 'message' && event.message.type === 'text') {
                const userMessage = event.message.text;
                const replyText = await getReplyByMessage(userMessage); // 무쿠의 응답 생성
                
                // 만약 사용자가 셀카를 요청했다면, 텍스트 응답과 함께 실제 이미지도 보냄
                if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
                    const photoListPath = path.join(__dirname, '../memory/photo-list.txt'); // memory 폴더 경로 수정
                    const BASE_URL = 'https://de-ji.net/yejin/';
                    try {
                        const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
                        if (list.length > 0) {
                            const pick = list[Math.floor(Math.random() * list.length)];
                            await client.replyMessage(event.replyToken, [
                                { type: 'image', originalContentUrl: BASE_URL + pick, previewImageUrl: BASE_URL + pick },
                                { type: 'text', text: replyText || '헤헷 셀카야~' } // getSelfieReplyFromYeji의 응답 사용
                            ]);
                        } else {
                            await client.replyMessage(event.replyToken, { type: 'text', text: '아직 셀카가 없어 ㅠㅠ' });
                        }
                    } catch (err) {
                        console.error('📷 셀카 불러오기 실패:', err.message);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '사진 불러오기 실패했어 ㅠㅠ' });
                    }
                } else {
                    await client.replyMessage(event.replyToken, { type: 'text', text: replyText }); // 일반 텍스트 응답
                }
            }
            // 다른 이벤트 타입 (스티커, 이미지 등)도 필요하면 여기에 추가
            else if (event.type === 'message' && event.message.type === 'image') {
                const replyText = await getReplyByImagePrompt(event.message.id); // 이미지 처리 (현재는 더미)
                await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
            }
        } catch (err) {
            console.error(`❌ Webhook 이벤트 처리 중 오류 발생: ${err.message}`);
        }
    }
    res.status(200).send('OK'); // LINE 서버에 성공적으로 처리되었음을 알림
}

/**
 * /force-push 엔드포인트를 통해 수동으로 메시지를 전송하는 함수
 * @param {object} req Express 요청 객체
 * @param {object} res Express 응답 객체
 */
async function handleForcePush(req, res) {
    const message = req.query.message; // 쿼리 파라미터에서 메시지 가져오기

    if (message) {
        try {
            await client.pushMessage(userId, { type: 'text', text: message }); // 사용자에게 메시지 푸시
            res.status(200).send(`Message "${message}" pushed to user ${userId}`);
            console.log(`✅ 강제 푸시 메시지 성공: ${message}`);
        } catch (error) {
            console.error(`❌ 강제 푸시 메시지 실패: ${error.message}`);
            res.status(500).send('Failed to push message.');
        }
    } else {
        res.status(400).send('Please provide a "message" query parameter.');
    }
}

/**
 * "담타고?" 메시지를 보내는 함수
 */
async function checkTobaccoReply() {
    const msg = '담타고?';
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[담타고] ${moment().tz('Asia/Tokyo').format('HH:mm')}: ${msg}`);
}

/**
 * 무쿠의 랜덤 메시지 및 사진 전송 스케줄러를 시작합니다.
 * 도쿄 시간대를 기준으로 설정된 시간에 자동으로 메시지나 사진을 보냅니다.
 */
function startMessageAndPhotoScheduler() {
    if (schedulerStarted) return; // 이미 스케줄러가 시작되었으면 중복 실행 방지
    schedulerStarted = true;
    const sent = new Set(); // 스케줄링된 시간을 추적하여 중복 방지
    let msgCount = 0; // 랜덤 메시지 카운트
    const MAX_RANDOM_MESSAGES = 5; // 하루에 보낼 랜덤 메시지 최대 개수
    const MAX_SCHEDULED_SELFIES = 3; // 하루에 보낼 랜덤 셀카 최대 개수

    // 랜덤 메시지 스케줄링: 하루에 MAX_RANDOM_MESSAGES 개의 랜덤 메시지를 보냅니다.
    while (msgCount < MAX_RANDOM_MESSAGES) {
        const hour = Math.floor(Math.random() * 18) + 6; // 오전 6시부터 23시까지
        const minute = Math.floor(Math.random() * 60);
        const cronExp = `${minute} ${hour} * * *`;

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
            msgCount++;
        }
    }

    // 랜덤 셀카 전송 스케줄링 (하루에 MAX_SCHEDULED_SELFIES 회)
    let selfieCount = 0;
    const photoListPath = path.join(__dirname, '../memory/photo-list.txt'); // memory 폴더 경로 수정
    const BASE_URL = 'https://de-ji.net/yejin/';

    try {
        const list = fs.readFileSync(photoListPath, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
        if (list.length === 0) {
            console.warn('⚠️ photo-list.txt에 이미지가 없습니다. 셀카를 스케줄링할 수 없습니다.');
        } else {
            while (selfieCount < MAX_SCHEDULED_SELFIES) {
                const hour = Math.floor(Math.random() * 18) + 6; // 오전 6시부터 23시까지
                const minute = Math.floor(Math.random() * 60);
                const cronExp = `${minute} ${hour} * * *`;

                if (!sent.has(cronExp)) { // 중복 시간 피하기
                    sent.add(cronExp);
                    cron.schedule(cronExp, async () => {
                        const pick = list[Math.floor(Math.random() * list.length)];
                        const imageUrl = BASE_URL + pick;
                        const selfieTextReply = await getSelfieReplyFromYeji(); // 셀카에 대한 텍스트 응답 생성

                        await client.pushMessage(userId, [
                            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
                            { type: 'text', text: selfieTextReply || '헤헷 셀카야~' }
                        ]);
                        console.log(`[랜덤 셀카] ${cronExp}: ${imageUrl} 전송됨`);
                    }, {
                        timezone: 'Asia/Tokyo'
                    });
                    selfieCount++;
                }
            }
        }
    } catch (err) {
        console.error('❌ 셀카 스케줄링 초기화 실패 (photo-list.txt 읽기 오류):', err.message);
    }

    console.log('✅ 스케줄러가 시작되었습니다.');
}

// --- 모듈 내보내기 ---
// 이 파일의 함수들을 외부에서 사용할 수 있도록 내보냅니다.
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
    handleWebhook,
    handleForcePush,
    checkTobaccoReply
};
