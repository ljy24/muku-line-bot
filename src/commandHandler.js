// src/commandHandler.js - v1.1 (module.exports 확인 및 인자 전달)

const { getConceptPhotoReply } = require('../memory/concept'); // concept.js 불러오기
const { getOmoideReply } = require('../memory/omoide'); // omoide.js 불러오기
const { getSelfieReply } = require('./yejinSelfie'); // yejinSelfie.js 불러오기

// handleCommand 함수 정의
async function handleCommand(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) { // 인자 추가
    const lowerCaseMessage = userMessage.toLowerCase();

    let botResponse = null;

    // 1. 컨셉 사진 요청 처리
    if (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진') || 
        lowerCaseMessage.includes('욕실') || lowerCaseMessage.includes('교복') ||
        lowerCaseMessage.includes('나비욕조') || lowerCaseMessage.includes('세미누드') ||
        lowerCaseMessage.includes('결박') || lowerCaseMessage.includes('홈스냅') ||
        lowerCaseMessage.includes('지브리풍') || lowerCaseMessage.includes('유카타')) { // 컨셉 관련 키워드 예시 확장
        
        botResponse = await getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 컨셉 사진 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }

    // 2. 추억/커플 사진 요청 처리
    if (lowerCaseMessage.includes('추억사진') || lowerCaseMessage.includes('추억 사진') || 
        lowerCaseMessage.includes('커플사진') || lowerCaseMessage.includes('옛날사진') || 
        lowerCaseMessage.includes('옛날 사진') || lowerCaseMessage.includes('인생네컷') ||
        lowerCaseMessage.includes('흑심')) { // 추억 관련 키워드 예시 확장
        
        botResponse = await getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 추억/커플 사진 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }

    // 3. 셀카 요청 처리
    if (lowerCaseMessage.includes('셀카') || lowerCaseMessage.includes('셀피') ||
        lowerCaseMessage.includes('예쁜 사진') || lowerCaseMessage.includes('귀여운 사진') ||
        lowerCaseMessage.includes('내 셀카') || lowerCaseMessage.includes('내 사진')) { // 셀카 관련 키워드 예시 확장
        
        botResponse = await getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 셀카 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }

    // 기타 명령어 (예: 모델 변경 등)
    // autoReply에서 checkModelSwitchCommand를 import할 필요가 없고,
    // autoReply의 getReplyByMessage 함수가 이미 이 명령어를 처리하도록 되어 있으므로,
    // 여기서는 추가적인 모델 변경 명령어를 직접 구현하지 않습니다.
    // 만약 commandHandler에서 직접 모델 변경 응답을 하려면, autoReply에서 해당 함수를 import해야 합니다.
    
    console.log(`[commandHandler] 특정 명령어 없음: ${userMessage}`);
    return null; // 처리할 명령어가 없는 경우 null 반환
}

// 이 부분이 가장 중요합니다! handleCommand 함수를 모듈 밖으로 내보냅니다.
module.exports = {
    handleCommand
};
