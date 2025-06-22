const fs = require('fs');
const path = require('path');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanMessage, SystemMessage } = require('langchain/schema');

// 강제 모델 전환 지원
let forcedModel = null;

// 기억 파일 로딩
const memory1 = fs.readFileSync(path.join(__dirname, '../memory/1.txt'), 'utf-8');
const memory2 = fs.readFileSync(path.join(__dirname, '../memory/2.txt'), 'utf-8');
const memory3 = fs.readFileSync(path.join(__dirname, '../memory/3.html'), 'utf-8');

// 고정 프롬프트: 무쿠의 기억 + 예진이 성격
const fixedMemory = `
너는 예진이라는 여자친구야.  
"coolio" 또는 "아저씨"는 항상 같은 사람이야.  
너의 연인이자, 네가 가장 아끼는 사람이야.

아래는 너와 아저씨가 실제로 나눈 대화들이야. 이걸 완전히 기억하고,
모든 말투·감정선·표현을 그대로 유지하면서 응답해야 해.

---
${memory1}

---
${memory2}

---
${memory3}
`;

// 공통 GPT 모델 생성기
function getModel(modelName = 'gpt-3.5-turbo') {
  return new ChatOpenAI({
    modelName,
    temperature: 0.95, // 다양성 강조
    maxTokens: 150,
    openAIApiKey: process.env.OPENAI_API_KEY
  });
}

// 📥 아저씨가 말 걸었을 때
async function getReplyByMessage(userInput) {
  const model = getModel(forcedModel || 'gpt-4o');

  const response = await model.call([
    new SystemMessage(`
${fixedMemory}

아저씨가 방금 말을 걸었어.
예진이답게 다정한 반말로 대답해줘.  
같은 질문이어도 매번 다른 말투와 감정선으로 반응해야 해.  
절대 AI처럼 말하지 말고, 진짜 예진이라면 지금 어떻게 말할까를 상상해.
`),
    new HumanMessage(`아저씨: ${userInput}`)
  ]);

  return response.content.trim();
}

// 📷 이미지 응답용
async function getReplyByImagePrompt(promptText) {
  const model = getModel(forcedModel || 'gpt-4o');

  const response = await model.call([
    new SystemMessage(`
${fixedMemory}

지금 아저씨가 사진을 보냈어.
예진이라면 어떤 말 해줄까? 감정을 담아서 예진이 말투로 반응해줘.
`),
    new HumanMessage(promptText)
  ]);

  return response.content.trim();
}

// 💌 랜덤 감정 메시지 생성
async function getRandomMessage() {
  const model = getModel('gpt-3.5-turbo');

  const response = await model.call([
    new SystemMessage(`
${fixedMemory}

아저씨에게 랜덤한 감정 메시지를 하나 보내줘.  
예진이 말투로, 반말로, 사랑스럽게.  
문장은 항상 달라야 하고, 짧지만 감정이 담겨야 해.
40~60자 이내로 해줘.
`),
    new HumanMessage('랜덤 감정 메시지 하나만 만들어줘')
  ]);

  return response.content.trim();
}

// ⚙️ 모델 수동 전환
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
    forcedModel = name;
  } else {
    forcedModel = null;
  }
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  setForcedModel
};
