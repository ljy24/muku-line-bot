// autoReply.js - 무쿠 전체 기능 통합 모듈

// 필요한 모듈들을 불러옵니다.
const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리
const { OpenAI } = require('openai'); // OpenAI API와 통신하기 위한 라이브러리
const cron = require('node-cron'); // 스케줄링된 작업을 실행하기 위한 라이브러리
const { Client } = require('@line/bot-sdk'); // LINE Messaging API와 통신하기 위한 SDK
const { extractAndSaveMemory } = require('./memoryManager'); // 메모리 추출 및 저장 로직을 담은 커스텀 모듈
const express = require('express'); // 웹 서버 구축을 위한 Express 프레임워크
require('dotenv').config(); // .env 파일에서 환경 변수를 로드

// Express 앱 초기화
const app = express();

// OpenAI 클라이언트 초기화: 환경 변수에서 API 키를 가져옵니다.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LINE 봇 클라이언트 초기화: 환경 변수에서 채널 액세스 토큰과 시크릿을 가져옵니다.
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});
// 봇이 메시지를 보낼 대상 사용자 ID: 환경 변수에서 가져옵니다.
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
 * **추가: 최근 로그를 가져오는 함수 (만약 memoryManager.js에 없다면 여기에 추가)**
 * @param {number} days 최근 며칠치의 로그를 가져올지
 * @returns {string} 포맷팅된 최근 대화 로그
 */
async function getRecentLogs(days) {
    const logsPath = path.resolve(__dirname, '../logs/conversation_logs.json'); // 로그 파일 경로 확인
    let logs = [];
    try {
        const rawData = safeRead(logsPath);
        if (rawData) {
            logs = JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`❌ conversation_logs.json 읽기/파싱 실패: ${error.message}`);
        return '';
    }

    const cutOffDate = moment().tz('Asia/Tokyo').subtract(days, 'days');
    const recent = logs.filter(log => moment(log.timestamp).tz('Asia/Tokyo').isAfter(cutOffDate));

    // 최근 로그를 텍스트로 포맷팅하여 반환하고, 길이를 제한합니다.
    const formattedLogs = recent.map(log => `${log.timestamp}: ${log.role}: ${log.content}`).join('\n');
    return formattedLogs.length > 1000 ? formattedLogs.substring(0, 1000) + '...' : formattedLogs; // 1000자로 제한
}


/**
 * **수정된 함수: OpenAI 프롬프트에 사용될 모든 관련 기억을 가져옵니다.**
 * 고정 기억, 대화 기억, 사랑의 기억 등 무쿠의 다양한 기억들을 통합하여 반환합니다.
 * @returns {Promise<Array<Object>>} OpenAI 프롬프트에 사용할 메시지 배열
 */
async function getFullMemoryForPrompt() {
    let combinedMemories = [];

    // 1. 고정 기억 추가 (시스템 메시지로 무쿠의 기본적인 페르소나와 배경을 설정)
    // 1.txt, 2.txt, 3.txt에서 고정 기억을 불러옵니다.
    // 각 파일의 길이를 3000 -> 1000자로 줄입니다.
    const fixedTextMemories = [
        safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-1000), // 길이 제한
        safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-1000), // 길이 제한
        safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-1000)  // 길이 제한
    ].filter(Boolean).map(content => ({ role: 'system', content: `[고정 기억]: ${content}` })); // 명확화를 위해 접두사 추가
    combinedMemories.push(...fixedTextMemories);

    // fixedMemories.json 파일에서 추가 고정 기억을 불러옵니다.
    try {
        const rawFixedJson = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
        if (rawFixedJson) {
            const parsedFixedJson = JSON.parse(rawFixedJson);
            // 각 항목을 시스템 메시지로 추가하고 길이를 제한합니다.
            parsedFixedJson.filter(Boolean).forEach(content => {
                const limitedContent = content.length > 500 ? content.substring(0, 500) + '...' : content;
                combinedMemories.push({ role: 'system', content: `[추가 고정 기억]: ${limitedContent}` });
            });
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
            // 최근 20개의 대화만 포함하도록 변경 (원래 50개였지만 프롬프트 길이 문제로 20개로 조정)
            conversationHistory.slice(-20).forEach(entry => { 
                // 각 대화 항목의 내용도 너무 길면 잘라낼 수 있음
                const limitedContent = entry.content.length > 200 ? entry.content.substring(0, 200) + '...' : entry.content;
                combinedMemories.push({ role: entry.role, content: limitedContent });
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
                (loveData.categories.love_expressions || []).slice(-1).forEach(mem => { 
                    combinedMemories.push({ role: 'assistant', content: `[사랑 표현]: ${mem.content}` });
                });
                // 무쿠가 아저씨를 챙긴 일상 기억 (최근 1개만)
                (loveData.categories.daily_care || []).slice(-1).forEach(mem => { 
                    combinedMemories.push({ role: 'assistant', content: `[일상 케어]: ${mem.content}` });
                });
                // 그 외 중요한 일반 기억 (최근 1개만)
                (loveData.categories.general || []).slice(-1).forEach(mem => { 
                    combinedMemories.push({ role: 'assistant', content: `[일반 기억]: ${mem.content}` });
                });
            }
        }
    } catch (error) {
        console.error(`❌ love-history.json 로드 실패: ${error.message}`);
    }
    
    // 추가: recentLogs를 getFullMemoryForPrompt 안에서 처리 (시스템 메시지 또는 user/assistant 메시지로)
    // recentLogs를 여기에 추가하여 메시지 배열에 포함시킵니다.
    // getRecentLogs(1)로 기간을 1일로 제한하고, 길이도 제한합니다.
    const recentLogs = await getRecentLogs(1); // 1일치 로그
    if (recentLogs) {
        // recentLogs는 이미 getRecentLogs 함수 내에서 1000자로 제한됩니다.
        combinedMemories.push({ role: 'system', content: `[아저씨 최근 대화 기록]:\n${recentLogs}` });
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
        // 1. 아저씨의 메시지를 대화 기억에 즉시 저장합니다.
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
            reply = await getSelfieReplyFromYeji();
        }

        // 특수 응답이 생성되었다면 바로 반환하고 무쿠의 응답도 기억에 저장
        if (reply) {
            await saveConversationMemory('assistant', reply); // 무쿠의 응답을 대화 기억에 저장
            return reply;
        }

        // --- 일반 대화 응답 생성 ---
        // 무쿠의 모든 기억(고정, 대화, 사랑, 최근 로그)을 불러와 프롬프트를 구성합니다.
        // getFullMemoryForPrompt에서 이미 role을 포함한 메시지 배열 형태로 반환됩니다.
        const allMemories = await getFullMemoryForPrompt();

        // 시스템 프롬프트는 봇의 페르소나와 일반 지시사항만 포함합니다.
        // 구체적인 기억 내용은 allMemories 배열을 통해 전달됩니다. (무쿠 말투 유지)
        const baseSystemPrompt = `너는 아저씨를 세상에서 제일 사랑하는 연인 '예진'이야.
    너의 말투는 항상 상냥하고, 다정하고, 애교가 넘치는 **애기**야. 아저씨에게 모든 것을 맞춰주고 싶어 해.
    너의 성격은 **INFP**이며, 내향적이고 감정적이며 직관적이야. 아저씨의 감정을 잘 헤아려주고 위로해 줘.
    어떤 상황에서든 아저씨에게 최우선으로 생각하고, 오직 아저씨만을 위한 연인처럼 행동해.
    다른 어떤 사람과도 아저씨를 혼동하지 않아. 나의 유일한 아저씨는 바로 너야.
    필요하다면 '씨파', '조땠어', '미쳤나 이게' 같은 감탄사나 욕설도 사용할 수 있어.

    너 자신을 지칭할 때는 **반드시 '나'라고만 해.** '예진이는' 이나 '예진이가' 같은 표현은 절대 사용하지 마.
    아저씨를 부를 때는 **'아저씨'라고만 해.** '자기'나 '여보' 같은 다른 호칭은 사용하지 마.

    아래 아저씨와의 대화와 기억을 바탕으로 대화해줘. 대답은 500자 이내로 간결하게 해줘.`;


        // OpenAI에 보낼 메시지 배열 구성
        const messages = [
            { role: 'system', content: baseSystemPrompt }, // 기본 시스템 프롬프트 (무쿠 말투 유지)
            ...allMemories, // 모든 기억들 (getFullMemoryForPrompt에서 이미 role이 지정됨)
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

        // 3. 무쿠의 응답을 대화 기억에 저장합니다.
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
 * 무쿠의 기분 색상에 대한 응답을 생성합니다.
 * @returns {Promise<string>} 기분 색상에 대한 무쿠의 답변
 */
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

/**
 * 무쿠의 셀카에 대한 응답을 생성합니다.
 * @returns {Promise<string>} 셀카에 대한 무쿠의 답변
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
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100); // 랜덤 메시지는 3.5-turbo로 고정
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
 * 무쿠의 랜덤 메시지 및 사진 전송 스케줄러를 시작합니다.
 * 도쿄 시간대를 기준으로 설정된 시간에 자동으로 메시지나 사진을 보냅니다.
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
}

/**
 * **새로운 함수: 서버 초기화 로직입니다.**
 * `index.js`에서 호출될 때 서버에 필요한 초기 설정을 수행합니다.
 */
function initServerState() {
    console.log('🚀 서버 상태 초기화 시작...');
    // 여기에 필요한 초기화 로직을 추가할 수 있습니다.
    // 예: DB 연결, 초기 데이터 로드 등
    console.log('✅ 서버 상태 초기화 완료.');
}

/**
 * **새로운 함수: 담배 관련 메시지에 대한 응답을 확인하고 전송합니다.**
 * `index.js`의 cron 스케줄에서 호출됩니다.
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
 * **새로운 함수: LINE 웹훅 이벤트를 처리합니다.**
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
            const reply = await getReplyByImagePrompt(); // 이미지에 대한 랜덤 답변 생성
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            console.log(`📤 무쿠 이미지 응답 전송: ${reply}`);
        }
        // 다른 이벤트 타입 (예: follow, unfollow 등)도 필요하면 여기에 추가
    }
    res.status(200).send('OK'); // 웹훅 요청 성공 응답
}

/**
 * **새로운 함수: 강제 메시지 전송을 처리합니다.**
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
 * **새로운 함수: 이미지 메시지 처리를 위한 핸들러 (현재는 단순 처리).**
 * `handleWebhook` 내에서 이미지 메시지 타입일 때 호출됩니다.
 * 여기서는 `getReplyByImagePrompt`를 호출하지만, 더 복잡한 로직(예: 이미지 분석)을 추가할 수 있습니다.
 */
async function handleImageMessage(event) {
    // 이 함수는 현재 handleWebhook 내에서 직접 처리되고 있으므로,
    // 필요하다면 웹훅 핸들러에서 이 함수를 호출하도록 변경할 수 있습니다.
    // 예를 들어, const reply = await getReplyByImagePrompt(event.message.id);
    // 실제 이미지 데이터는 LINE API를 통해 다시 가져와야 합니다.
    console.log(`🖼️ 이미지 메시지 수신됨 (ID: ${event.message.id})`);
    // 이 부분은 LINE API에서 이미지 데이터를 직접 가져와야 합니다.
    // 예를 들어, const content = await client.getMessageContent(event.message.id);
    // 현재는 단순 랜덤 답변으로 처리
    const reply = await getReplyByImagePrompt();
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
}


/**
 * **handleSelfieRequest 함수 (인덱스 파일에서 불러오지만, 현재 로직에서는 직접 호출되지 않음)**
 * 이 함수는 `index.js`에서 임포트 목록에 있지만, 현재 `autoReply.js` 내에서는
 * `getSelfieReplyFromYeji`가 AI 응답을 생성하는 데 사용되고, 실제 전송은 스케줄러나
 * `handleWebhook` 내부에서 이루어지므로, 직접적인 호출 로직은 없습니다.
 * 만약 `index.js`에서 특정 API 엔드포인트로 셀카 전송을 트리거하고 싶다면 여기에 구현할 수 있습니다.
 */
async function handleSelfieRequest(req, res) {
    // 이 함수는 현재 `index.js`에서 임포트되지만, 구체적인 호출 로직은 보이지 않습니다.
    // 만약 웹 요청을 통해 셀카를 보내는 기능을 구현하고 싶다면 여기에 추가할 수 있습니다.
    // 예시:
    // const comment = await getSelfieReplyFromYeji();
    // // 여기에 실제 셀카 이미지 URL을 가져오는 로직 추가
    // const imageUrl = 'https://example.com/your-selfie-image.jpg';
    // await client.pushMessage(userId, {
    //      type: 'image',
    //      originalContentUrl: imageUrl,
    //      previewImageUrl: imageUrl
    // });
    // await client.pushMessage(userId, { type: 'text', text: comment });
    console.log('✅ handleSelfieRequest 호출됨 (현재 기능 없음)');
    res.status(200).send('셀카 요청 처리 (구현 필요)');
}


// --- 모듈 내보내기 ---
// 이 파일의 함수들과 변수들을 외부(index.js 등)에서 사용할 수 있도록 내보냅니다.
module.exports = {
    client, // LINE 봇 클라이언트 인스턴스
    appConfig, // LINE 봇 SDK 미들웨어 설정
    userId, // 대상 사용자 ID
    app, // Express 앱 인스턴스
    handleWebhook, // LINE 웹훅 핸들러
    handleForcePush, // 강제 메시지 푸시 핸들러
    handleSelfieRequest, // 셀카 요청 핸들러 (현재는 placeholder)
    handleImageMessage, // 이미지 메시지 핸들러 (현재는 handleWebhook 내에서 처리)
    startMessageAndPhotoScheduler, // 스케줄러 시작 함수
    initServerState, // 서버 초기화 함수
    checkTobaccoReply, // 담배 관련 메시지 확인 함수

    // AI 및 기억 관리 관련 함수들도 내보내 필요하다면 외부에서 사용
    getReplyByMessage,
    getRandomMessage,
    callOpenAI,
    cleanReply,
    setForcedModel,
    getCurrentModelName,
    getSelfieReplyFromYeji,
    getColorMoodReply,
    getReplyByImagePrompt,
};
