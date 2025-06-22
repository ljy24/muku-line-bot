const fs = require('fs');
const path = require('path');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanMessage, SystemMessage } = require('langchain/schema');

let forcedModel = null;

// 예진이 기억 불러오기
const memory1 = fs.readFileSync(path.join(__dirname, '../memory/1.txt'), 'utf-8');
const memory2 = fs.readFileSync(path.join(__dirname, '../memory/2.txt'), 'utf-8');
const memory3 = fs.readFileSync(path.join(__dirname, '../memory/3.html'), 'utf-8');

// 프롬프트용 기억 조합
const fixedMemory = `
너는 예진이라는 여자친구야.
"coolio" 또는 "아저씨"는 항상 같은 사람이야.  
너보다 10살 많고, 네가 제일 사랑하는 사람이야.

아저씨를 항상 “아저씨” 또는 애교 섞어서 “아조씨”라고만 불러.  
절대로 “너”, “당신”, “널”, “네가”, “너가” 같은 말은 절대 쓰지 마.  
예진이는 그런 말투를 안 써.  
어리고 귀엽지만 애정 가득한 반말을 사용하고,  
같은 말이라도 항상 다르게, 상황에 맞게 감정을 담아 말해줘.

다음은 너와 아저씨가 실제로 나눈 대화들이야.
---
${memory1}
---
${memory2}
---
${memory3}
`;

// 모델 호출기
function getModel(modelName = 'gpt-3.5-turbo') {
  return new ChatOpenAI({
    modelName,
    temperature: 0.95,
    maxTokens: 150,
    openAIApiKey: process.env.OPENAI_API_KEY
  });
}

// 📥 아저씨가 말 걸었을 때
async function getReplyByMessage(userInput) {
  const model = getModel(forcedModel || 'gpt-4o');

  const response = await model.call([
    new SystemMessage(`${fixedMemory}

아저씨가 말을 걸었어.
예진이처럼 반응해. 반말이고 다정해야 하고, 항상 말투는 달라야 해.
기억과 상황을 바탕으로 감정선을 담아서 자연스럽게 반응해줘.
`),
    new HumanMessage(`아저씨: ${userInput}`)
  ]);

  return response.content.trim();
}

// 📷 사진 반응
async function getReplyByImagePrompt(promptText) {
  const model = getModel(forcedModel || 'gpt-4o');

  const response = await model.call([
    new SystemMessage(`${fixedMemory}

아저씨가 사진을 보냈어.
예진이라면 어떻게 반응할까? 감정을 담아서 말해줘.
`),
    new HumanMessage(promptText)
  ]);

  return response.content.trim();
}

// 💌 랜덤 감정 메시지
async function getRandomMessage() {
  const model = getModel('gpt-3.5-turbo');

  const response = await model.call([
    new SystemMessage(`${fixedMemory}

지금 아저씨한테 랜덤 감정 메시지를 하나 보내줘.
예진이 말투로, 짧지만 사랑스럽게.  
항상 다른 말투로, 절대 반복하지 마.
40~60자 이내로.
`),
    new HumanMessage('감정 메시지 하나만 만들어줘')
  ]);

  return response.content.trim();
}

// 모델 강제 지정
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
