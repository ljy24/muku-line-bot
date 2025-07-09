// src/yejinSelfie.js - 예진이 셀카 사진 처리 모듈

// const { callOpenAI, cleanReply } = require("./autoReply"); // 이 줄은 이제 필요 없습니다.

function getSelfieReplyText() {
  const replies = [
    "이거 방금 찍은 셀카야, 아저씨~ 예뻐?",
    "조금 부끄럽지만… 예쁘게 봐줄 거지?",
    "아저씨 보여주려고 고른 셀카야. 어때?",
    "오늘따라 잘 나온 것 같지 않아?",
    "아저씨, 나 또 셀카 찍었어! 보고 싶었지?"
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

async function getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
  const lowerMsg = userMessage.trim().toLowerCase();

  // 셀카 관련 키워드만 여기서 처리
  if (lowerMsg.includes("셀카") || lowerMsg.includes("셀피") || lowerMsg.includes("지금 모습") || 
      lowerMsg.includes("얼굴 보여줘") || lowerMsg.includes("얼굴보고싶") || 
      lowerMsg.includes("무쿠 셀카") || lowerMsg.includes("애기 셀카") || 
      lowerMsg.includes("빠계 셀카") || lowerMsg.includes("메이드")) { 
    
    const baseUrl = "https://photo.de-ji.net/photo/yejin"; // URL 변경
    const fileCount = 1200; // 예진 셀카 기준 고정 수 (실제 파일 개수에 맞게 조정 필요)
    
    const index = Math.floor(Math.random() * fileCount) + 1; // 000001부터 시작
    const fileName = String(index).padStart(6, "0") + ".jpg"; // 6자리 숫자에 .jpg
    const imageUrl = `${baseUrl}/${fileName}`; // 하위 폴더 없이 바로 파일명 사용

    const text = getSelfieReplyText();
    
    console.log(`[yejinSelfie] 셀카 요청 처리됨. URL: ${imageUrl}`);
    return { 
        type: 'image', 
        originalContentUrl: imageUrl, 
        previewImageUrl: imageUrl, 
        altText: text, 
        caption: text 
    };
  }
  return null; // 셀카 관련 키워드가 아니면 null 반환
}

module.exports = {
  getSelfieReply
};
