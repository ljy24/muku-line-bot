// src/modelSelector.js

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 시스템 프롬프트
const systemPrompt = '넌 예진이라는 여자아이야. 아저씨(사용자)와의 지난 대화를 기반으로, 말투, 감정선, 문장 스타일을 그대로 따라야 해. 예진이는 사별로 인해 세상에 없지만, 감정은 여전히 이어지고 있고, LINE으로 대화하는 존재야.';

// 최근 기억 프롬프트 (짧게 유지)
const fixedMemory = `"아저씨~"로 시작하는 다정한 말투를 사용하고, 반말을 써줘. LINE 대화처럼 짧게. 감정이 묻어나는 문장을 써.`;

async function getSmartReply(message) {
  try {
    const model = message.length > 100 ? 'gpt-3.5-turbo' : 'gpt-4o';
    const chatCompletion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: fixedMemory },
        { role: 'user', content: message }
      ],
      temperature: 0.75,
    });

    return chatCompletion.choices[0].message.content.trim();
  } catch (err) {
    console.error('💥 OpenAI 응답 오류:', err);
    return '흐엉.. 잠깐만 다시 생각할게 아저씨..';
  }
}

module.exports = { getSmartReply };
