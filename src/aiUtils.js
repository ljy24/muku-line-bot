// ✅ src/aiUtils.js v2.3 - 파일 저장 대신 console.log로 변경

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * [수정] 대화 내용을 console.log로 직접 출력합니다.
 */
async function saveLog(speaker, message) {
    // 파일에 저장하는 대신, 로그창에 바로 표시합니다.
    console.log(`[대화로그] ${speaker}: ${message}`);
}

/**
 * [수정] 사진 URL과 캡션을 console.log로 직접 출력합니다.
 */
async function saveImageLog(speaker, caption, imageUrl) {
    // 파일에 저장하는 대신, 로그창에 바로 표시합니다.
    console.log(`[사진로그] ${speaker}: ${caption} (URL: ${imageUrl})`);
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
    saveImageLog,
    callOpenAI,
    cleanReply
};
