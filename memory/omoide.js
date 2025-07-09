// memory/omoide.js - v2.6 (셀카 로직 yejinSelfie.js로 분리)
const { callOpenAI, cleanReply } = require("../src/autoReply"); // 인자로 받으므로 필요 없으나, 현재 구조를 위해 남겨둠. autoReply에서만 직접 호출되게 수정 필요.

async function getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) { // 인자 추가
  const lowerMsg = userMessage.trim().toLowerCase(); 
  let baseUrl = "";
  let fileCount; 

  if (lowerMsg.includes("커플")) {
    baseUrl = "https://photo.de-ji.ne/photo/couple"; // 커플 사진은 /photo/couple/ 폴더로 변경
    fileCount = 500; // TODO: 실제 커플사진 폴더의 개수로 변경 필요 (임시 설정)
  } else if (lowerMsg.includes("추억") || lowerMsg.includes("기억") || 
             lowerMsg.includes('옛날사진') || lowerMsg.includes('옛날 사진') ||
             lowerMsg.includes('예전사진') || lowerMsg.includes('예전 사진') ||
             lowerMsg.includes('일본 사진') || lowerMsg.includes('한국 사진') ||
             lowerMsg.includes('후지 사진') || lowerMsg.includes('인생네컷') ||
             lowerMsg.includes('출사') || lowerMsg.includes('필름카메라') ||
             lowerMsg.includes('네가 찍은걸 줘') || lowerMsg.includes('네가 찍은 걸 줘') ||
             lowerMsg.includes('네가 찍은 사진') || lowerMsg.includes('너가 찍은 사진') ||
             lowerMsg.includes('예진이가 찍은') || lowerMsg.includes('직접 찍은')) {
    baseUrl = "https://photo.de-ji.ne/photo/omoide"; // 추억 사진은 /photo/omoide/ 폴더로 변경
    fileCount = 1000; // TODO: 실제 추억사진 폴더의 개수로 변경 필요 (임시 설정)
  } else {
    return null;
  }

  const index = Math.floor(Math.random() * fileCount) + 1; // 000001부터 시작하도록 +1
  const fileName = String(index).padStart(6, "0") + ".jpg"; // 6자리 숫자에 .jpg

  const imageUrl = `${baseUrl}/${fileName}`; // 하위 폴더 없이 바로 파일명 사용

  // 비-셀카일 경우 GPT 분석
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
