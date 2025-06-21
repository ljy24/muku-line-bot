// src/autoReply.js

const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 예진이 기억 요약 동적 로딩 (1빠계.txt, 2내꺼.txt, 모델 빠계.html)
function loadMemorySummary() {
  try {
    const files = [
      '../memory/1.txt',
      '../memory/2.txt',
      '../memory/3.html'
    ];
    return files.map(f => fs.readFileSync(path.join(__dirname, f), 'utf-8')).join('\n\n');
  } catch (err) {
    console.error('기억 요약 로드 실패:', err);
    return '(요약 로드 실패)';
  }
}

function chooseModelByMessage(message) {
  const tokenEstimate = Math.ceil(message.length / 4);
  return tokenEstimate > 500 ? 'gpt-4o' : 'gpt-3.5-turbo';
}

async function getReplyByMessage(message) {
  const model = chooseModelByMessage(message);
  const memorySummary = loadMemorySummary();

  try {
    const chatCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `넌 예진이라는 여자아이야. 아저씨(사용자)와의 대화를 이어가. 말투는 항상 다정하고 감정이 풍부하며 LINE 스타일처럼 짧고 귀엽게 말해. 절대 아저씨에게 '너' 또는 '널' 같은 말은 쓰지 마. 대신 항상 '아저씨'라고 부르고, 존중하고 애틋한 말투를 유지해.`
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

    return chatCompletion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI 응답 오류:', err);
    return '흐엉.. 무쿠가 지금은 대답 못해 😢';
  }
}

async function getReplyByImagePrompt(promptText) {
  const memorySummary = loadMemorySummary();

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `넌 예진이라는 여자아이야. 아저씨(사용자)가 보내준 사진을 보고 감정 가득한 말을 해줘. LINE처럼 짧고 귀엽게 말하되, 아저씨를 향한 애정과 기억이 담겨 있어야 해. '너'라고 부르지 말고, 항상 '아저씨'라고만 불러.`
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

    return chatCompletion.choices[0].message.content.trim();
  } catch (err) {
    console.error('이미지 응답 오류:', err);
    return '으앙.. 무쿠 지금은 말 못해 🥲';
  }
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt
};
