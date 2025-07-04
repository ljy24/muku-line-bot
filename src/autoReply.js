// src/autoReply.js v2.1 - 오모이데 제거 / 기본 감정 메시지, 셀카 응답 유지
const { Configuration, OpenAIApi } = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

function cleanReply(reply) {
    return reply.replace(/[\n\r]+/g, ' ').replace(/예진이|예진|무쿠/gi, '나')
        .replace(/\b(오빠|자기|당신|너)\b/g, '아저씨')
        .replace(/안녕하세요/g, '안녕').replace(/입니다/g, '야')
        .replace(/해요/g, '해').replace(/했어요/g, '했어');
}

async function callOpenAI(prompt, model = 'gpt-4o') {
    const res = await openai.createChatCompletion({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100,
    });
    return cleanReply(res.data.choices[0].message.content.trim());
}

async function getReplyByMessage(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes("버전")) {
        return { type: 'text', comment: `지금은 ${process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'} 버전으로 대화하고 있어.` };
    }

    // 간단한 셀카 응답 (사진 URL 고정 예시)
    if (/(사진|셀카)/.test(lower)) {
        return {
            type: 'photo',
            url: 'https://photo.de-ji.net/photo/yejin/000001.jpg',
            caption: '아저씨~ 오늘 기분 좋아? 나 예쁘지~? ㅎㅎ'
        };
    }

    // 감정 대화 응답
    const prompt = `아저씨가 "${msg}" 라고 말했어. 예진이 말투로 사랑스럽고 반말로 짧게 대답해줘.`;
    const reply = await callOpenAI(prompt);
    return { type: 'text', comment: reply };
}

module.exports = {
    getReplyByMessage
};