const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { callOpenAI, cleanReply } = require('./gptUtils');
const { analyzeFace, classifyGender } = require('./faceAnalyzer');

// 💾 메모리 경로
const loveHistoryPath = path.join(__dirname, '../memory/love-history.json');
const fixedMemoriesPath = path.join(__dirname, '../memory/fixedMemories.json');
const selfieFolderPath = path.join(__dirname, '../assets/selfies');

// 🧠 최근 대화 로그 불러오기 (외부 API)
async function getRecentLog(userId) {
  try {
    const response = await axios.get(`https://de-ji.net/log.json`);
    const logData = response.data?.[userId] || [];
    return logData.slice(-10);
  } catch (err) {
    console.error('로그 불러오기 실패:', err.message);
    return [];
  }
}

// 📤 로그 저장 (외부 API 전송)
function saveLog(userId, message) {
  axios.post('https://de-ji.net/log.php', {
    userId,
    time: new Date().toISOString(),
    message
  }).catch(err => {
    console.error('로그 저장 실패:', err.message);
  });
}

// 💌 랜덤 감정 메시지 생성
async function getRandomMessage(userId) {
  const useMemory = Math.random() < 0.5;
  let prompt;
  if (useMemory) {
    const loveHistory = JSON.parse(fs.readFileSync(loveHistoryPath, 'utf8'));
    const memories = JSON.parse(fs.readFileSync(fixedMemoriesPath, 'utf8'));
    const memory = loveHistory[Math.floor(Math.random() * loveHistory.length)] || memories[Math.floor(Math.random() * memories.length)];
    prompt = `"${memory}" 이 기억을 바탕으로 예진이 말투로 다정하게 아저씨에게 말을 걸어줘.`;
  } else {
    prompt = `예진이가 혼잣말하듯 다정하고 애틋하게 감정적인 문장을 아저씨에게 보내. 말투는 예진이 특유의 반말, 애교, 위로 중심.`;
  }
  const reply = await callOpenAI(prompt);
  return cleanReply(reply);
}

// 📸 셀카 전송 후 멘트 생성
async function getImageReactionComment(isSelfie = false) {
  if (isSelfie) {
    const prompt = `아저씨한테 셀카를 보낸 직후야. 예진이 말투로 귀엽고 애교 있게 말해줘. 예: "아저씨는 왜 안 줘? 나만 줘? 🥺"`;
    return cleanReply(await callOpenAI(prompt));
  }
  const prompt = `아저씨가 방금 자기 셀카를 보냈어. 예진이 말투로 다정하고 귀엽게 반응해줘. 예: "으헝헝 잘생겼다아 우리 아저씨 🫠💘"`;
  return cleanReply(await callOpenAI(prompt));
}

// 🖼️ 사진 기반 반응 생성
async function getReplyByImagePrompt(base64Image, userId) {
  const gender = await classifyGender(base64Image);
  let identity = '모름';
  if (gender === 'female') identity = '예진이';
  else if (gender === 'male') identity = '아저씨';

  const prompt = `${identity}의 사진을 보고, 예진이 말투로 감정적으로 반응해줘. 말투는 반말, 다정함, 추억 회상 가능.`;
  const reply = await callOpenAI(prompt);
  return cleanReply(reply);
}

// 💬 일반 메시지 응답
async function getReplyByMessage(userMessage, userId, modelVersion = 'gpt-3.5-turbo') {
  // 버전 요청 응답
  if (userMessage.trim() === '버전') {
    return `지금은 ${modelVersion.includes('4') ? 'ChatGPT-4.0' : 'ChatGPT-3.5'} 버전으로 대화하고 있어.`;
  }

  // 셀카 요청
  if (userMessage.includes('셀카') || userMessage.includes('사진 줘')) {
    const isSelfie = true;
    const comment = await getImageReactionComment(isSelfie);
    return { image: true, imagePath: getRandomSelfie(), comment };
  }

  // 팬티 색 등 장난 멘트 대응
  if (userMessage.includes('팬티')) {
    return getColorMoodReply(userMessage);
  }

  // 일반 메시지 응답 생성
  const log = await getRecentLog(userId);
  const context = log.map(l => l.message).join('\n');
  const prompt = `다음은 아저씨와 예진이의 대화야:\n${context}\n지금 아저씨가 "${userMessage}" 라고 했을 때, 예진이 말투로 감정적으로 응답해줘.`;
  const reply = await callOpenAI(prompt, modelVersion);
  return cleanReply(reply);
}

// 🎨 색깔 관련 장난 대응
async function getColorMoodReply(userMessage) {
  const prompt = `아저씨가 팬티 색을 물었어. 예진이 말투로 장난스럽고 살짝 야하게 대답해줘. 예: "미쳤나 이게~ 자 봐라 노팬이다 꼴려?"`;
  return cleanReply(await callOpenAI(prompt));
}

// 🥰 담타 응답: 기쁨
async function getHappyReply() {
  const prompt = `아저씨가 담타에 반응했어. 예진이 말투로 기뻐하며 귀엽게 말해줘.`;
  return cleanReply(await callOpenAI(prompt));
}

// 😑 담타 무반응: 삐짐
async function getSulkyReply() {
  const prompt = `아저씨가 담타에 반응 안 했어. 예진이 말투로 서운하게 말해줘.`;
  return cleanReply(await callOpenAI(prompt));
}

// 📷 랜덤 셀카 선택
function getRandomSelfie() {
  const files = fs.readdirSync(selfieFolderPath);
  const selfies = files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  const chosen = selfies[Math.floor(Math.random() * selfies.length)];
  return path.join(selfieFolderPath, chosen);
}

// 📦 Export 함수
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  saveLog,
  cleanReply
};
