// memory/omoide.js - v2.5 (셀카 고정 응답 개선 및 경로 안정화)
// const { callOpenAI, cleanReply } = require("../src/autoReply"); // 이 줄을 제거
// const { getFaceMatch } = require("../src/autoReply"); // 이 줄을 제거
const fs = require("fs");
const path = require("path");

function getSelfieReplyFromYeji() {
  const replies = [
    "이거 방금 찍은 셀카야, 아저씨~ 예뻐?",
    "조금 부끄럽지만… 예쁘게 봐줄 거지?",
    "아저씨 보여주려고 고른 셀카야. 어때?",
    "오늘따라 잘 나온 것 같지 않아?",
    "아저씨, 나 또 셀카 찍었어! 보고 싶었지?"
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// saveLogFunc, callOpenAIFunc, cleanReplyFunc 인자 추가
async function getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) { 
  const lowerMsg = userMessage.trim().toLowerCase(); 
  let baseUrl = "";
  let fileCount; 

  // '메이드' 키워드도 셀카로 분류
  if (lowerMsg.includes("셀카") || lowerMsg.includes("셀피") || lowerMsg.includes("지금 모습") || 
      lowerMsg.includes("얼굴 보여줘") || lowerMsg.includes("얼굴보고싶") || lowerMsg.includes("무쿠 셀카") ||
      lowerMsg.includes("애기 셀카") || lowerMsg.includes("빠계 셀카") || lowerMsg.includes("메이드")) { 
    baseUrl = "https://photo.de-ji.ne/photo/yejin"; 
    fileCount = 1200; 
  } else if (lowerMsg.includes("커플")) {
    baseUrl = "https://photo.de-ji.ne/photo/couple"; 
    fileCount = 500; 
  } else if (lowerMsg.includes("추억") || lowerMsg.includes("기억") || 
             lowerMsg.includes('옛날사진') || lowerMsg.includes('옛날 사진') ||
             lowerMsg.includes('예전사진') || lowerMsg.includes('예전 사진') ||
             lowerMsg.includes('일본 사진') || lowerMsg.includes('한국 사진') ||
             lowerMsg.includes('후지 사진') || lowerMsg.includes('인생네컷') ||
             lowerMsg.includes('출사') || lowerMsg.includes('필름카메라') ||
             lowerMsg.includes('네가 찍은걸 줘') || lowerMsg.includes('네가 찍은 걸 줘') ||
             lowerMsg.includes('네가 찍은 사진') || lowerMsg.includes('너가 찍은 사진') ||
             lowerMsg.includes('예진이가 찍은') || lowerMsg.includes('직접 찍은')) {
    baseUrl = "https://photo.de-ji.ne/photo/omoide"; 
    fileCount = 1000; 
  } else {
    return null;
  }

  const index = Math.floor(Math.random() * fileCount) + 1; 
  const fileName = String(index).padStart(6, "0") + ".jpg"; 

  const imageUrl = `${baseUrl}/${fileName}`; 

  if (baseUrl.includes("yejin")) { 
    const text = getSelfieReplyFromYeji();
    return { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl, altText: text, caption: text };
  }

  let folderTypeDescription = "";
  if (baseUrl.includes("omoide")) {
      folderTypeDescription = "소중한 추억이 담긴 사진";
  } else if (baseUrl.includes("couple")) {
      folderTypeDescription = "아저씨랑 나랑 같이 찍은 커플 사진";
  }

  const prompt = `이 사진은 아저씨와 나의 ${folderTypeDescription}이야. 예진이 말투로 아저씨에게 보여줄 멘트를 만들어줘. 이 사진을 보면서 떠오르는 감정, 추억, 아저씨에 대한 애정을 담아서 1~3문장으로 짧게 코멘트 해줘.`;
  const messages = [{ role: 'system', content: prompt }];
  // 매개변수로 받은 callOpenAIFunc과 cleanReplyFunc 사용
  const rawReply = await callOpenAIFunc(messages, 'gpt-4o', 150, 1.0); 
  const cleanedReply = cleanReplyFunc(rawReply);
  return { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl, altText: cleanedReply, caption: cleanedReply };
}

module.exports = {
  getOmoideReply
};
