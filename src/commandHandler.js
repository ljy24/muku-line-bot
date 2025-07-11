// ✅ src/commandHandler.js - v2.0 (통합 기억 시스템 연동)
// - [통합] memoryHandler.js의 기능을 흡수하여 하나의 파일로 통합.
// - [통합] memoryManager 대신 conversationContext를 직접 받아 기억을 조회하고 저장.
// - [통합] 사진 요청 처리 시, conversationContext를 넘겨주어 감성적인 코멘트를 생성하도록 강화.

const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { getSelfieReply } = require('./yejinSelfie');
const { callOpenAI, cleanReply } = require('./autoReply');

/**
 * [통합] 모든 명령어를 처리하는 통합 핸들러
 * @param {string} userMessage 사용자의 원본 메시지
 * @param {object} conversationContext - 중앙 컨텍스트 객체
 * @returns {Promise<object|null>} 처리된 응답 객체 또는 null
 */
async function handleCommand(userMessage, conversationContext) {
    const lowerMessage = userMessage.toLowerCase();

    // 1. '기억해줘' 명령어 처리
    const rememberMatch = userMessage.match(/^(기억해줘|기억해|잊지마|기록해줘|기록해)\s*:\s*(.+)/i);
    if (rememberMatch) {
        const content = rememberMatch[2].trim();
        await conversationContext.addUserMemory(content); // 중앙 컨텍스트에 기억 저장 요청
        return { type: 'text', comment: `응! "${content}" 기억했어! 아저씨가 나한테 말해준 건 절대 안 잊어버릴 거야~` };
    }

    // 2. '기억' 관련 질문 처리
    const memoryKeywords = ['기억나', '알아', '생각나', '첫대화', '첫 대화', '고백', '생일', '데이트', '코로나'];
    if (memoryKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const foundMemory = conversationContext.searchFixedMemory(userMessage); // 중앙 컨텍스트에 기억 조회 요청
        if (foundMemory) {
            const prompt = `아저씨가 "${userMessage}"라고 물어봤어. 아저씨에게 이 기억 "${foundMemory}"에 대해 예진이 말투로 사랑스럽게 회상하며 대답해줘. 1~3문장으로 짧게.`;
            const rawReply = await callOpenAI([{ role: 'system', content: prompt }], 'gpt-4o', 150, 1.0);
            return { type: 'text', comment: cleanReply(rawReply) };
        }
    }

    // 3. 각종 사진 요청 처리 (컨셉, 추억, 셀카)
    // [통합] 이제 각 사진 핸들러에 conversationContext를 통째로 넘겨줍니다.
    const photoHandlers = [getConceptPhotoReply, getOmoideReply, getSelfieReply];
    for (const handler of photoHandlers) {
        // 각 핸들러는 이제 conversationContext를 받아 감성적인 답변을 생성할 수 있습니다.
        const photoResponse = await handler(userMessage, conversationContext);
        if (photoResponse) {
            return photoResponse;
        }
    }

    // 처리할 명령어가 없는 경우
    return null;
}

module.exports = {
    handleCommand
};
