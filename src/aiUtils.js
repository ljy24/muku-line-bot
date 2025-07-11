// ✅ src/aiUtils.js - AI 관련 공용 함수 관리 파일

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 */
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

/**
 * AI의 답변을 예진이의 말투로 다듬고 1인칭을 보장합니다.
 */
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
    callOpenAI,
    cleanReply
};
