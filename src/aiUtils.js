// ✅ src/aiUtils.js v2.2 - 사진 로그 기록 기능 추가

const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LOG_FILE_PATH = path.join(process.cwd(), 'log.json');

/**
 * 로그 항목을 파일에 추가하는 범용 함수
 */
async function appendToLogFile(logEntry) {
    try {
        let logs = [];
        try {
            const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
            if (data) {
                logs = JSON.parse(data);
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.warn(`[aiUtils] 경고: log.json 파일이 손상되어 새로 시작합니다. 오류: ${error.message}`);
                logs = [];
            } else if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        if (!Array.isArray(logs)) {
            console.warn(`[aiUtils] 경고: log.json의 내용이 배열이 아니므로 새로 시작합니다.`);
            logs = [];
        }

        logs.push(logEntry);
        await fs.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
    } catch (error) {
        console.error('[aiUtils] 로그 파일 쓰기 실패:', error);
    }
}


/**
 * 텍스트 대화 내용을 log.json 파일에 저장하는 함수
 */
async function saveLog(speaker, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'text', // 로그 타입 추가
        speaker,
        message,
    };
    await appendToLogFile(logEntry);
}

/**
 * [추가] 사진 URL과 캡션을 log.json 파일에 저장하는 함수
 */
async function saveImageLog(speaker, caption, imageUrl) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'image', // 로그 타입 추가
        speaker,
        caption,
        imageUrl, // 이미지 URL 추가
    };
    await appendToLogFile(logEntry);
}


async function callOpenAI(messages, model = 'gpt-4o', maxTokens = 150, temperature = 0.95) {
    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[aiUtils] OpenAI API 호출 실패 (모델: ${model}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

function cleanReply(reply) {
    if (typeof reply !== 'string') return '';
    let cleaned = reply.replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나').replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨').replace(/(입니다|이에요|예요|하세요|하셨나요|셨습니다|드릴게요|드릴까요)/gi, '').replace(/(좋아요)/gi, '좋아').replace(/(고마워요|감사합니다)/gi, '고마워').replace(/(미안해요|죄송합니다)/gi, '미안해').replace(/합니(다|까)/gi, '해').replace(/하겠(습니다|어요)?/gi, '할게');
    cleaned = cleaned.replace(/무쿠가/g, '내가').replace(/무쿠는/g, '나는').replace(/무쿠를/g, '나를').replace(/예진이가/g, '내가').replace(/예진이는/g, '나는').replace(/예진이를/g, '나를');
    cleaned = cleaned.replace(/[\"\'\[\]]/g, '').replace(/\s\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 2) {
        return '응? 다시 말해봐 아저씨';
    }
    return cleaned;
}

module.exports = {
    saveLog,
    saveImageLog, // [추가]
    callOpenAI,
    cleanReply
};
