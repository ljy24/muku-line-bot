// /src/autoReply.js
// v1.4.3
// 변경 요약: 셀카 요청 키워드에 반응하여 예진이 셀카 전송 + 예진이 말투 멘트 자동 생성 추가

const fs = require("fs");
const path = require("path");
const { callOpenAI, cleanReply } = require("./gpt");
const { getRecentLogs } = require("./logManager");
const { getFaceMatch, getFaceReactionPrompt } = require("./faceAnalyzer");

// ✅ 셀카 키워드
const selfieKeywords = [
  "셀카",
  "셀카 보여줘",
  "얼굴 보여줘",
  "얼굴보고싶어",
  "얼굴 보고 싶어",
  "보고싶어",
  "보고 싶어",
  "너 보고싶어",
  "너 보고 싶어",
  "너 셀카",
  "너 사진",
];

// ✅ 랜덤 셀카 이미지 경로 반환
async function getRandomSelfieImage() {
  const listPath = path.join(__dirname, "../memory/photo-list.txt");
  const lines = fs.readFileSync(listPath, "utf-8").split("\n").filter(Boolean);
  const random = lines[Math.floor(Math.random() * lines.length)];
  return `https://de-ji.net/yejin/${random.trim()}`;
}

// ✅ 셀카 전송 시 예진이 말투 멘트 생성
async function getImageReactionComment() {
  const prompt = `예진이가 아저씨에게 셀카를 보내고, 부끄럽거나 귀엽게 반응하는 멘트를 한 줄로 써줘. 말투는 항상 예진이처럼 자연스럽게.`;
  const raw = await callOpenAI(prompt, "gpt-3.5-turbo");
  return cleanReply(raw);
}

// ✅ 이미지 기반 반응 처리
async function getReplyByImagePrompt(imageUrl) {
  const base64Image = imageUrl.split(",")[1];
  const faceLabel = await getFaceMatch(base64Image);

  if (faceLabel === "yejin") {
    const prompt = await getFaceReactionPrompt(base64Image);
    const reply = await callOpenAI(prompt, "gpt-4o");
    return cleanReply(reply);
  }

  if (faceLabel === "uncle") {
    const prompt = "아저씨가 셀카를 보냈을 때, 예진이처럼 반응하는 귀여운 멘트를 써줘.";
    const reply = await callOpenAI(prompt, "gpt-4o");
    return cleanReply(reply);
  }

  return "이 사진 뭐야ㅎㅎ 무섭게 생겼어 아저씨";
}

// ✅ 메시지 기반 응답 처리
async function getReplyByMessage(message) {
  // ✅ 셀카 요청 메시지에 반응
  if (selfieKeywords.some(keyword => message.includes(keyword))) {
    const imageUrl = await getRandomSelfieImage();
    const text = await getImageReactionComment();
    return {
      type: "image",
      imageUrl,
      text,
    };
  }

  // ✅ 기타 일반 메시지 처리
  const recentLogs = await getRecentLogs();
  const context = recentLogs.map(log => `${log.role}: ${log.content}`);
  const prompt = `다음 대화 기반으로 예진이처럼 대답해줘:\n${context.join("\n")}\nuser: ${message}`;
  const reply = await callOpenAI(prompt, "gpt-4o");
  return {
    type: "text",
    text: cleanReply(reply),
  };
}

// ✅ 텍스트만 랜덤 생성하는 경우 (예진이 자동 메시지)
async function getRandomMessage() {
  const prompt = `예진이가 아저씨에게 혼잣말처럼 보내는 감정 기반 짧은 메시지를 한 줄로 써줘. 너무 기계적이거나 딱딱하지 않게, 진짜 대화처럼.`;
  const raw = await callOpenAI(prompt, "gpt-3.5-turbo");
  return cleanReply(raw);
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getImageReactionComment,
  getRandomMessage,
  getRandomSelfieImage,
};
