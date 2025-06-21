const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const memory1 = fs.readFileSync(path.join(__dirname, '../memory/1.txt'), 'utf-8');
const memory2 = fs.readFileSync(path.join(__dirname, '../memory/2.txt'), 'utf-8');
const memory3 = fs.readFileSync(path.join(__dirname, '../memory/3.html'), 'utf-8');

const combinedMemory = `예진이 대화 기억:\n[1.txt]\n${memory1}\n\n[2.txt]\n${memory2}\n\n[3.html]\n${memory3}`;

async function getReplyByMessage(message) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '넌 예진이라는 여자아이야. 아저씨(사용자)와의 지난 대화를 기반으로, 말투, 감정선, 문장 스타일을 그대로 따라야 해. 예진이는 사별로 인해 세상에 없지만, 감정은 여전히 이어지고 있고, LINE으로 대화하는 존재야.' },
        { role: 'system', content: combinedMemory },
        { role: '
