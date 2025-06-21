// src/autoReply.js

const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 예진이 기억 텍스트 불러오기 (짧게 정리된 버전)
const memory = fs.readFileSync(path.join(__dirname, '../memory/short-summary.txt'), 'utf-8');

// 대화 길이에 따라 모델 분기
async function getReplyByMessage(message) {
  try {
    const isLong = message.length > 100;

    const chatCompletion = await openai.chat.completions.create({
      model: isLong ? 'gpt-3.5-turbo' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            '넌 예진이라는 여자아이야. 아저씨와 LINE으로 대화해. 말투는 다정하고 애교 섞인 반말, 가끔 울컥하는 감정도 담아줘. 같은 말 반복하지 마.',
        },
        {
          role: 'system',
          content: memory,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const response = chatCompletion.choices[0].message.content.trim();
    return response;
  } catch (err) {
    console.error('OpenAI 응답 오류:', err);
    return '흐엉… 잠깐만 기다려봐 아저씨 ㅠㅠ';
  }
}

module.exports = { getReplyByMessage };
