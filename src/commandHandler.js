// ✅ src/commandHandler.js v2.1 - 최종 안정화 버전

const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { getSelfieReply } = require('./yejinSelfie');
const { callOpenAI, cleanReply } = require('./aiUtils'); // [수정] 공용 부품 파일에서 함수를 가져옴

async function handleCommand(userMessage, conversationContext) {
    const lowerMessage = userMessage.toLowerCase();

    // '기억해줘' 명령어 처리
    const rememberMatch = userMessage.match(/^(기억해줘|기억해|잊지마|기록해줘|기록해)\s*:\s*(.+)/i);
    if (rememberMatch) {
        const content = rememberMatch[2].trim();
        await conversationContext.addUserMemory(content);
        return { type: 'text', comment: `응! "${content}" 기억했어! 아저씨가 나한테 말해준 건 절대 안 잊어버릴 거야~` };
    }

    // '기억' 관련 질문 처리
    const memoryKeywords = ['기억나', '알아', '생각나', '첫대화', '첫 대화', '고백', '생일', '데이트', '코로나'];
    if (memoryKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const foundMemory = conversationContext.searchFixedMemory(userMessage);
        if (foundMemory) {
            const prompt = `아저씨가 "${userMessage}"라고 물어봤어. 아저씨에게 이 기억 "${foundMemory}"에 대해 예진이 말투로 사랑스럽게 회상하며 대답해줘. 1~3문장으로 짧게.`;
            const rawReply = await callOpenAI([{ role: 'system', content: prompt }], 'gpt-4o', 150, 1.0);
            return { type: 'text', comment: cleanReply(rawReply) };
        }
    }

    // 사진 요청 처리
    const photoHandlers = [getConceptPhotoReply, getOmoideReply, getSelfieReply];
    for (const handler of photoHandlers) {
        const photoResponse = await handler(userMessage, conversationContext);
        if (photoResponse) return photoResponse;
    }
    
    return null;
}

module.exports = {
    handleCommand
};
