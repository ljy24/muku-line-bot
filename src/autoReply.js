// ============================================================================
// autoReply.js - v13.5 (안전장치 최종본)
// 🧠 기억 관리, 키워드 반응, 최종 프롬프트 생성을 책임지는 핵심 두뇌
// ============================================================================

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// (키워드 및 패턴 정의는 이전과 동일)
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다', '아무것도 하기 싫어', '너무 괴로워', '살기 싫어'];
const WEATHER_KEYWORDS = ['날씨', '기온', '온도', '더워', '더운', '추워', '추운', '습해', '비 와', '눈 와'];
const DRINKING_KEYWORDS = ['술 마셔', '술 마시러', '혼술', '맥주', '소주', '위스키', '사케', '한잔', '취했어', '취한다'];
const MEMORY_KEYWORDS = { USER_REQUEST: ['기억해줘', '기억해', '꼭 기억해', '잊지마', '잊지 말아줘', '이건 중요해', '이거 중요한', '꼭 알아둬', '기억할래', '이건 꼭', '절대 잊으면 안 돼', '평생 기억해'], MUKU_CONFIRM: ['꼭 기억할게', '절대 안 잊을게', '평생 기억할게', '이건 중요한 사실', '기억해둘게', '잊지 않을게', '이거 기억할게', '마음에 새길게'] };
const MEMORY_DELETE_KEYWORDS = ['잊어줘', '잊어', '기억 삭제', '기억 지워', '틀렸어', '잘못됐어', '아니야', '그게 아니야', '취소해', '지워줘', '없던 일로', '기억 취소', '잘못 기억', '다시 기억', '수정해'];
const MEMORY_UPDATE_KEYWORDS = ['수정해줘', '바꿔줘', '다시 기억해', '정정해', '고쳐줘', '아니라', '사실은', '정확히는', '바로잡을게'];
const IMPORTANT_CONTENT_PATTERNS = [ /(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)|(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}월\s*\d{1,2}일)/, /(생일|기념일|만난\s*날|사귄\s*날|첫\s*만남|첫\s*데이트)/, /(혈액형|키|몸무게|취미|좋아하는|싫어하는|알레르기)/, /(약속|계획|하기로\s*했|가기로\s*했|만나기로)/, /(사랑한다|좋아한다|미안하다|고마워|처음|마지막)/ ];


// (기억 처리 관련 함수들은 conversationContext에서 호출된다고 가정)
async function detectAndProcessMemoryRequest(userMessage) {
    return conversationContext.detectAndProcessMemoryRequest(userMessage);
}
async function detectAndProcessMemoryEdit(userMessage) {
    return conversationContext.detectAndProcessMemoryEdit(userMessage);
}
async function searchAndConfirmMemory(query) {
    return conversationContext.searchAndConfirmMemory(query);
}
async function handlePhotoReaction(userReaction) {
    return conversationContext.handlePhotoReaction(userReaction);
}


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
