// src/commandHandler.js - v1.2 (고정 기억 우선 처리 로직 추가)

const { getConceptPhotoReply } = require('../memory/concept'); // concept.js 불러오기
const { getOmoideReply } = require('../memory/omoide'); // omoide.js 불러오기
const { getSelfieReply } = require('./yejinSelfie'); // yejinSelfie.js 불러오기

// handleCommand 함수 정의
async function handleCommand(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc, getFixedMemoryFunc) { // getFixedMemoryFunc 인자 추가
    const lowerCaseMessage = userMessage.toLowerCase();

    let botResponse = null;

    // ⭐️ 1. 고정 기억 관련 질문 우선 처리 ⭐️
    // '기억', '알아', '생각나', '첫대화', '고백', '생일', '데이트' 등의 키워드를 확인
    const memoryKeywords = ['기억', '알아', '생각나', '첫대화', '첫 대화', '고백', '생일', '데이트', '코로나']; // 더 많은 키워드 추가 가능

    for (const keyword of memoryKeywords) {
        if (lowerCaseMessage.includes(keyword)) {
            const fixedMemory = getFixedMemoryFunc(lowerCaseMessage); // 사용자 메시지 전체를 넘겨서 가장 적합한 기억 찾기
            if (fixedMemory) {
                // GPT를 사용하여 고정 기억에 대한 자연스러운 코멘트 생성
                const prompt = `아저씨가 "${userMessage}"라고 물어봤어. 아저씨에게 이 기억 "${fixedMemory}"에 대해 예진이 말투로 사랑스럽게 회상하며 대답해줘. 1~3문장으로 짧게 코멘트 해줘.`;
                const messages = [{ role: 'system', content: prompt }];
                try {
                    const rawReply = await callOpenAIFunc(messages, 'gpt-4o', 150, 1.0);
                    const cleanedReply = cleanReplyFunc(rawReply);
                    console.log(`[commandHandler] 고정 기억 "${keyword}" 관련 질문 처리됨: ${userMessage} -> ${cleanedReply}`);
                    return { type: 'text', comment: cleanedReply }; // 텍스트 답변 우선
                } catch (error) {
                    console.error('[commandHandler] 고정 기억 코멘트 생성 실패:', error);
                    return { type: 'text', comment: '아저씨... 그때 기억이 잘 안 나 ㅠㅠ 다시 알려줄 수 있어?' };
                }
            }
        }
    }


    // 2. 컨셉 사진 요청 처리 (기억 질문이 아니었을 경우)
    if (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진') || 
        lowerCaseMessage.includes('욕실') || lowerCaseMessage.includes('교복') ||
        lowerCaseMessage.includes('나비욕조') || lowerCaseMessage.includes('세미누드') ||
        lowerCaseMessage.includes('결박') || lowerCaseMessage.includes('홈스냅') ||
        lowerCaseMessage.includes('지브리풍') || lowerCaseMessage.includes('유카타')) {
        
        botResponse = await getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 컨셉 사진 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }

    // 3. 추억/커플 사진 요청 처리 (기억 질문이 아니었을 경우)
    if (lowerCaseMessage.includes('추억사진') || lowerCaseMessage.includes('추억 사진') || 
        lowerCaseMessage.includes('커플사진') || lowerCaseMessage.includes('옛날사진') || 
        lowerCaseMessage.includes('옛날 사진') || lowerCaseMessage.includes('인생네컷') ||
        lowerCaseMessage.includes('흑심')) {
        
        botResponse = await getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 추억/커플 사진 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }

    // 4. 셀카 요청 처리 (기억 질문이 아니었을 경우)
    if (lowerCaseMessage.includes('셀카') || lowerCaseMessage.includes('셀피') ||
        lowerCaseMessage.includes('예쁜 사진') || lowerCaseMessage.includes('귀여운 사진') ||
        lowerCaseMessage.includes('내 셀카') || lowerCaseMessage.includes('내 사진')) {
        
        botResponse = await getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (botResponse) {
            console.log(`[commandHandler] 셀카 요청 처리됨: ${userMessage}`);
            return botResponse;
        }
    }
    
    console.log(`[commandHandler] 특정 명령어 없음: ${userMessage}`);
    return null; // 처리할 명령어가 없는 경우 null 반환
}

module.exports = {
    handleCommand
};
