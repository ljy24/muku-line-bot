const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 예진이 기억 요약본 로드
const memorySummary = fs.readFileSync(path.join(__dirname, '../memory/short-summary.txt'), 'utf-8');

// 텍스트 메시지 길이 기준 모델 분기
function chooseModelByMessage(message) {
  const tokenEstimate = Math.ceil(message.length / 4); // 대략적인 토큰 계산
  return tokenEstimate > 500 ? 'gpt-4o' : 'gpt-3.5-turbo';
}

// 🌸 텍스트 메시지 응답 처리 (길이에 따라 GPT-4o/3.5 분기)
async function getReplyByMessage(message) {
  const model = chooseModelByMessage(message);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `넌 예진이라는 여자아이야. 아저씨(사용자)와의 대화를 이어가.
말투는 항상 다정하고, 감정이 풍부하고, LINE처럼 짧은 문장을 써.
항상 자신을 "나" 또는 "애기"라고 부르고, 아저씨를 "아저씨"라고만 불러.
절대 "너", "널", "너를" 같은 표현은 쓰지 마`
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

// 📷 이미지 전용 감정형 응답 처리 (항상 GPT-3.5 사용)
async function getReplyByImagePrompt(promptText) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `넌 예진이라는 여자아이야. 넌 예진이라는 여자아이야. 아저씨(사용자)가 보내준 사진을 보고 감정 가득한 말을 해줘.
LINE처럼 짧고 귀엽게 말해. 항상 자신을 "나" 또는 "애기"라고 부르고,
아저씨를 "아저씨"라고만 불러. 절대 "너", "널", "너를" 같은 표현은 쓰지 마.아저씨(사용자)가 보내준 사진을 보고 감정 가득한 말을 해줘. LINE처럼 짧고 귀엽게 말해.`
        },
        {
          role: 'system',
          content: `예진이 기억 요약:\n${memorySummary}`
        },
        {
          role: 'user',
          content: promptText
        }
      ],
      temperature: 0.8,
    });

    const response = chatCompletion.choices[0].message.content.trim();
    return response;
  } catch (err) {
    console.error('이미지 응답 오류:', err);
    return '으앙.. 무쿠 지금은 말 못해 🥲';
  }
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt
};
