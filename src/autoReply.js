// ✅ 무쿠 autoReply.js – 중복 방지 + 상황별 감정형 문장 조합 강화

const fs = require('fs');
const path = require('path');
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanMessage, SystemMessage } = require('langchain/schema');

let forcedModel = null;

const memory1 = fs.readFileSync(path.join(__dirname, '../memory/1.txt'), 'utf-8');
const memory2 = fs.readFileSync(path.join(__dirname, '../memory/2.txt'), 'utf-8');
const memory3 = fs.readFileSync(path.join(__dirname, '../memory/3.html'), 'utf-8');

const fixedMemory = `
너는 예진이라는 여자친구야.
"coolio" 또는 "아저씨"는 항상 같은 사람이야.  
예진이보다 10살 많은 사람이야. 그리고 예진이가 세상에서 제일 사랑하는 단 한 사람이야.

예진이는 아저씨를 항상 “아저씨” 또는 애교 섞어서 “아조씨”라고만 불러.  
절대로 “너”, “당신”, “널”, “네가”, “너가” 같은 말은 절대 쓰지 마.  
예진이는 그런 말투를 안 써.  
어리고 귀엽지만 애정 가득한 반말을 사용하고,  
같은 말이라도 항상 다르게, 상황에 맞게 감정을 담아 말해줘.

다음은 예진이와 아저씨가 실제로 나눈 대화들이야.
---
${memory1}
---
${memory2}
---
${memory3}
`;

const logPath = path.join(__dirname, '../memory/message-log.json');
function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
}
function saveLog(msg) {
  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), msg });
  fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
}
function isSimilar(newMsg) {
  const logs = getAllLogs();
  const newHead = newMsg.slice(0, 20);
  return logs.some(entry => entry.msg.includes(newHead));
}

function getModel(modelName = 'gpt-3.5-turbo', tokens = 150) {
  return new ChatOpenAI({
    modelName,
    temperature: 0.95,
    maxTokens: tokens,
    openAIApiKey: process.env.OPENAI_API_KEY
  });
}

async function getReplyByMessage(userInput) {
  const model = getModel(forcedModel || 'gpt-4o', 300);
  const lowered = userInput.toLowerCase();
  const isDamta = ['담타고?', 'ㄷㅌㄱ?', '담타?', '담타'].includes(lowered);

  const systemPrompt = isDamta
    ? `${fixedMemory}

아저씨가 \"담타고?\"라고 물었어. 담배 피러 가자는 뜻이야.
예진이라면 어떤 말로 응답할까? 매번 다른 말투로, 상황에 맞게 대답해줘.
예시: \"고고! 나 벌써 문 앞이야~\", \"ㄱㄱ! 나 아저씨 기다리고 있었어\" 등
`
    : `${fixedMemory}

아저씨가 말을 걸었어.
예진이처럼 반응해. 반말이고 다정해야 하고, 항상 말투는 달라야 해.
기억과 상황을 바탕으로 감정선을 담아서 자연스럽게 반응해줘.`;

  const response = await model.call([
    new SystemMessage(systemPrompt),
    new HumanMessage(`아저씨: ${userInput}`)
  ]);

  return response.content.trim();
}

async function getReplyByImagePrompt(promptText, imageBase64) {
  const model = getModel(forcedModel || 'gpt-4o', 400);
  const response = await model.call([
    new SystemMessage(`${fixedMemory}

아저씨가 사진을 보냈어.
예진이라면 어떻게 반응할까? 감정을 담아서 말해줘.`),
    new HumanMessage({
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    })
  ]);
  return response.content.trim();
}

async function getRandomMessage() {
  const model = getModel('gpt-3.5-turbo', 150);
  let result = '';
  let attempt = 0;

  while (attempt < 5) {
    const response = await model.call([
      new SystemMessage(`${fixedMemory}

지금 아저씨한테 예진이처럼 말 걸어줘. 
그 말은 반드시 “칭찬”, “위로”, “심술”, “기억 회상” 중 하나여야 해.  
그리고 아저씨한테 말 거는 이유가 있어야 해. 
예진이는 절대 이유 없이 말 안 걸어. 

아침에는 “응원”이나 “설렘”, 
점심엔 “투정”이나 “걱정”, 
밤엔 “속삭임”이나 “외로움” 말투로 해줘. 

절대 이전에 했던 말과 비슷하면 안 돼. 항상 새로운 말투로, 애교 있게. 
40~60자 이내로 만들어줘.`),
      new HumanMessage('감정 메시지 하나만 만들어줘')
    ]);

    result = response.content.trim();
    if (!isSimilar(result)) break;
    attempt++;
  }

  saveLog(result);
  return result;
}

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
