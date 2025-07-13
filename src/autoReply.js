// ============================================================================
// autoReply.js - v13.6 (안전장치 최종본)
// 🧠 기억 관리, 키워드 반응, 최종 프롬프트 생성을 책임지는 핵심 두뇌
// ============================================================================

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// (키워드 및 패턴 정의는 이전과 동일)
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다', '아무것도 하기 싫어', '너무 괴로워', '살기 싫어'];
// ... (기타 키워드들)

// (기억 처리 관련 함수들은 conversationContext에서 호출된다고 가정)
async function detectAndProcessMemoryRequest(userMessage) {
    return conversationContext.detectAndProcessMemoryRequest(userMessage);
}
async function detectAndProcessMemoryEdit(userMessage) {
    return conversationContext.detectAndProcessMemoryEdit(userMessage);
}
// ... (기타 기억 함수들)


// 메인 응답 생성 함수
async function getReplyByMessage(userMessage) {
    await conversationContext.addUltimateMessage(USER_NAME, userMessage);
    conversationContext.updateLastUserMessageTime(Date.now());
    
    // (긴급, 음주, 날씨 키워드 처리 로직은 이전과 동일)
    // ...

    const editResult = await detectAndProcessMemoryEdit(userMessage);
    if (editResult && editResult.processed) {
        return { type: 'text', comment: editResult.result.message };
    }
    
    const memoryResult = await detectAndProcessMemoryRequest(userMessage);
    if (memoryResult && memoryResult.saved && memoryResult.response) {
        return { type: 'text', comment: memoryResult.response };
    }
    
    // (나머지 로직은 이전과 동일)
    // ...
    
    const baseSystemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 
    1인칭 '나'를 사용하고 항상 반말로 대답하며,절대로 3인칭으로 말하지 마. 
    ... (이하 핵심 기억 프롬프트는 이전과 동일) ...
    `;
    
    const finalSystemPrompt = await conversationContext.getUltimateContextualPrompt(baseSystemPrompt);

    // ✅ [안전장치] 시스템 프롬프트가 비어있거나 문자열이 아닌 경우, OpenAI 호출을 막고 기본 응답을 보냅니다.
    if (!finalSystemPrompt || typeof finalSystemPrompt !== 'string') {
        console.error("❌ 최종 시스템 프롬프트가 비어있거나 문자열이 아니어서 OpenAI 호출을 중단합니다.");
        return { type: 'text', comment: '아저씨, 지금 생각이 잘 정리가 안 돼. 조금만 있다가 다시 말 걸어줄래? ㅠㅠ' };
    }

    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        const finalReply = cleanReply(rawReply);
        await conversationContext.addUltimateMessage(BOT_NAME, finalReply);
        return { type: 'text', comment: finalReply };
    } catch (error) {
        console.error("OpenAI API 호출 중 에러 발생:", error);
        const reply = '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ';
        await conversationContext.addUltimateMessage(BOT_NAME, reply);
        return { type: 'text', comment: reply };
    }
}

module.exports = {
    getReplyByMessage,
};
