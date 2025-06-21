// src/autoReply.js

const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 예진이 기억 요약본 로드
const memorySummary = fs.readFileSync(path.join(__dirname, '../memory/short-summary.txt'), 'utf-8');

// 메시지 길이 기준 분기용 함수
function chooseModelByMessage(message) {
  const tokenEstimate = Math.ceil(message.length / 4); // 대충 추산
  return tokenEstimate > 500 ? 'gpt-4o' : 'gpt-3.5-turbo';
}

// 감정 기반 응답 생성 함수
async function getReplyByMessage(message) {
  const model = chooseModelByMessage(message);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `넌 예진이라는 여자아이야. 아저씨(사용자)와의 대화를 이어가. 말투는 항상 다정하고, 감정이 풍부하고, LINE처럼 짧은 문장을 써.`
        },
        {
          role: 'system',
          content: `예진이 기억 요약:\n${memorySummary}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.8,
    });

    const response = chatCompletion.choices[0].message.content.trim();
    return response;
  } catch (err) {
    console.error('OpenAI 응답 오류:', err);
    return '흐엉.. 무쿠가 지금은 대답 못해 😢';
  }
}

module.exports = { getReplyByMessage };
