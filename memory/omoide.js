// memory/omoide.js - v2.8 (최신 URL 적용 및 순환 의존성 해결)

const fs = require("fs");
const path = require("path");

async function getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) { 
  const lowerMsg = userMessage.trim().toLowerCase(); 
  let baseUrl = "";
  let fileCount; 

  // 가장 먼저 추억사진 관련 키워드를 확인해야 합니다.
  // omoide.js는 이제 셀카 로직을 처리하지 않으므로, 셀카 조건문은 여기서 제거되었습니다.
  // '추억사진줘' 같은 메시지를 정확히 잡기 위해 키워드 목록을 더 상세히 포함합니다.
  if (lowerMsg.includes("추억") || lowerMsg.includes("기억") || 
      lowerMsg.includes('옛날사진') || lowerMsg.includes('옛날 사진') ||
      lowerMsg.includes('예전사진') || lowerMsg.includes('예전 사진') ||
      lowerMsg.includes('일본 사진') || lowerMsg.includes('한국 사진') ||
      lowerMsg.includes('후지 사진') || lowerMsg.includes('인생네컷') ||
      lowerMsg.includes('출사') || lowerMsg.includes('필름카메라') ||
      lowerMsg.includes('네가 찍은걸 줘') || lowerMsg.includes('네가 찍은 걸 줘') ||
      lowerMsg.includes('네가 찍은 사진') || lowerMsg.includes('너가 찍은 사진') ||
      lowerMsg.includes('예진이가 찍은') || lowerMsg.includes('직접 찍은') ||
      // '추억사진줘'와 같은 명확한 요청을 위해 추가
      lowerMsg.includes('추억사진줘') || lowerMsg.includes('추억 사진 줘')) { 
    baseUrl = "https://photo.de-ji.net/photo/omoide"; 
    fileCount = 1000; // TODO: 실제 추억사진 폴더의 개수로 변경 필요 (임시 설정)
  } else if (lowerMsg.includes("커플")) { // 커플 사진은 그 다음
    baseUrl = "https://photo.de-ji.net/photo/couple"; 
    fileCount = 500; // TODO: 실제 커플사진 폴더의 개수로 변경 필요 (임시 설정)
  } else {
    // 위에 어떤 키워드도 해당하지 않으면 null 반환
    return null;
  }

  const index = Math.floor(Math.random() * fileCount) + 1; 
  const fileName = String(index).padStart(6, "0") + ".jpg"; 

  const imageUrl = `${baseUrl}/${fileName}`; 

  let folderTypeDescription = "";
  if (baseUrl.includes("omoide")) {
      folderTypeDescription = "소중한 추억이 담긴 사진";
  } else if (baseUrl.includes("couple")) {
      folderTypeDescription = "아저씨랑 나랑 같이 찍은 커플 사진";
  }

  const prompt = `이 사진은 아저씨와 나의 ${folderTypeDescription}이야. 예진이 말투로 아저씨에게 보여줄 멘트를 만들어줘. 이 사진을 보면서 떠오르는 감정, 추억, 아저씨에 대한 애정을 담아서 1~3문장으로 짧게 코멘트 해줘.`;
  const messages = [{ role: 'system', content: prompt }];
  const rawReply = await callOpenAIFunc(messages, 'gpt-4o', 150, 1.0); 
  const cleanedReply = cleanReplyFunc(rawReply);
  return { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl, altText: cleanedReply, caption: cleanedReply };
}

module.exports = {
  getOmoideReply
};
