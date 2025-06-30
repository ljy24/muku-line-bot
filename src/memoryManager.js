// src/memoryManager.js - 무쿠의 기억 관리 모듈

const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리
const { OpenAI } = require('openai'); // OpenAI API와 통신하기 위한 라이브러리

require('dotenv').config(); // .env 파일에서 환경 변수를 로드

// 이 모듈 내에서 OpenAI 클라이언트를 초기화합니다.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// love-history.json 파일의 경로를 정의합니다.
const LOVE_HISTORY_PATH = path.resolve(__dirname, '../memory/love-history.json');

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
 * `love-history.json` 파일에 새로운 특정 기억을 저장합니다.
 * 'user_submitted_memories' 카테고리에 저장되며, 최신 10개의 기억만 유지됩니다.
 * @param {string} title 기억의 제목 (예: "하카타 깜짝파티")
 * @param {string} description 기억의 상세 내용
 */
async function saveSpecificMemory(title, description) {
    let loveHistory = { categories: {} }; // 기본 구조 초기화

    try {
        const rawData = safeRead(LOVE_HISTORY_PATH);
        if (rawData) {
            loveHistory = JSON.parse(rawData); // 기존 데이터 파싱
        }
    } catch (error) {
        console.error(`❌ love-history.json 읽기/파싱 실패: ${error.message}`);
        // 파싱 실패 시, 기존 파일 내용이 손상된 것으로 간주하고 빈 객체로 초기화하여 새롭게 시작합니다.
        loveHistory = { categories: {} };
    }

    // 'user_submitted_memories' 카테고리가 없으면 생성합니다.
    if (!loveHistory.categories.user_submitted_memories) {
        loveHistory.categories.user_submitted_memories = [];
    }

    // 새로운 기억 객체를 생성합니다.
    const newMemory = {
        title: title,
        content: description,
        timestamp: moment().tz('Asia/Tokyo').format() // 현재 시간 기록
    };

    // 새로운 기억을 배열에 추가합니다.
    loveHistory.categories.user_submitted_memories.push(newMemory);

    // 'user_submitted_memories' 카테고리의 기억 수가 10개를 초과하면, 가장 오래된 기억을 제거합니다.
    if (loveHistory.categories.user_submitted_memories.length > 10) {
        loveHistory.categories.user_submitted_memories = loveHistory.categories.user_submitted_memories.slice(-10);
    }

    // 업데이트된 데이터를 파일에 저장합니다. (안전한 저장을 위해 임시 파일 사용)
    try {
        const tempPath = LOVE_HISTORY_PATH + '.tmp'; // 임시 파일 경로
        await fs.promises.writeFile(tempPath, JSON.stringify(loveHistory, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, LOVE_HISTORY_PATH); // 성공 시 임시 파일을 본래 파일로 변경
        console.log(`✅ 새로운 특정 기억 저장됨: "${title}"`);
    } catch (error) {
        console.error(`❌ 특정 기억 저장 실패: ${error.message}`);
    }
}

/**
 * 사용자 메시지에서 새로운 특정 기억(제목과 내용)을 추출하고 저장합니다.
 * OpenAI 모델을 사용하여 메시지를 분석하고, 기억이 발견되면 `saveSpecificMemory`를 호출합니다.
 * 이 함수는 `autoReply.js`에서 사용자 메시지 처리 후 호출됩니다.
 * @param {string} userMessage 사용자의 메시지 내용
 */
async function extractAndSaveMemory(userMessage) {
    // OpenAI에게 보낼 프롬프트입니다. 사용자의 메시지에서 특정 기억을 추출하도록 지시합니다.
    const extractionPrompt = `You are a memory extraction bot. Analyze the user's message.
    If the user is clearly sharing a specific, named past memory or event they want to share and describe (e.g., "우리 하와이 여행", "처음 만났던 날"), extract the memory title and a brief description as a JSON object.
    The title should be concise and describe the event. The description should be the details the user provided.
    If no such memory is being shared, return an empty JSON object.
    
    Output format: {"memory_title": "Description of the memory."} or {}
    
    Example input: "24년 3월 17일 애기 생일날 하카타에서 깜짝파티 했던 추억 기억나?. 그날 정말 설렜고, 웃음 많았던 날이야"
    Example output: {"하카타 깜짝파티": "24년 3월 17일 애기 생일날 하카타에서 깜짝파티 했던 추억이야. 그날 정말 설렜고, 웃음 많았던 날이야."}
    
    User message: "${userMessage}"
    Your JSON output:`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // 기억 추출을 위해 비교적 저렴한 gpt-3.5-turbo 모델 사용
            messages: [{ role: 'user', content: extractionPrompt }],
            max_tokens: 200, // 추출을 위한 최대 토큰 수 제한 (토큰 초과 방지)
            temperature: 0.1, // 정확한 추출을 위해 낮은 온도 설정 (창의성보다 정확성 중시)
            response_format: { type: "json_object" } // OpenAI에게 JSON 형식으로 응답을 강제합니다.
        });

        const rawContent = response.choices[0]?.message?.content;
        if (rawContent) {
            const parsed = JSON.parse(rawContent); // OpenAI 응답을 JSON으로 파싱
            const title = Object.keys(parsed)[0]; // 첫 번째 키(기억 제목) 추출
            const description = parsed[title]; // 해당 키의 값(기억 내용) 추출

            // 유효한 제목과 내용이 있고, 응답이 정확히 하나의 키-값 쌍인 경우에만 저장
            if (title && description && Object.keys(parsed).length === 1) {
                await saveSpecificMemory(title, description); // 특정 기억 저장 함수 호출
            } else {
                console.log('✅ 메시지에서 특정 기억 추출되지 않음 또는 OpenAI 응답 형식이 불일치.');
            }
        }
    } catch (error) {
        // 기억 추출 중 발생한 OpenAI API 오류나 JSON 파싱 오류를 기록합니다.
        console.error(`❌ 기억 추출 중 OpenAI/JSON 파싱 오류: ${error.message}`);
        if (error instanceof SyntaxError) { // JSON 파싱 오류인 경우 원본 내용을 함께 기록
            console.error('JSON 파싱 실패 원본 내용:', rawContent);
        }
    }
}

// 이 모듈에서 외부로 내보낼 함수들을 정의합니다.
module.exports = {
    extractAndSaveMemory,
    // saveSpecificMemory는 extractAndSaveMemory 내부에서만 사용되므로 외부로 내보낼 필요 없습니다.
};
