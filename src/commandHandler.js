// ✅ src/commandHandler.js v3.1 - "!로그" 명령어 추가

const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { getSelfieReply } = require('./yejinSelfie');
const { callOpenAI, cleanReply } = require('./aiUtils');

/**
 * GPT를 이용해 상세한 속마음을 생성하는 함수
 */
async function getDetailedInnerThought(conversationContext) {
    const internalState = conversationContext.getInternalState();
    const { emotionalResidue, currentToneState } = internalState.emotionalEngine;
    const { isSulky, sulkyLevel } = internalState.sulkiness;
    const { isPeriodActive } = internalState.mood;

    const currentStateSummary = `
        - 현재 감정 수치: 슬픔(${Math.round(emotionalResidue.sadness)}), 기쁨(${Math.round(emotionalResidue.happiness)}), 불안(${Math.round(emotionalResidue.anxiety)}), 그리움(${Math.round(emotionalResidue.longing)}), 상처(${Math.round(emotionalResidue.hurt)}), 애정(${Math.round(emotionalResidue.love)})
        - 현재 말투 상태: ${currentToneState}
        - 삐짐 상태: ${isSulky ? `${sulkyLevel}단계 삐짐` : '정상'}
        - 생리 상태: ${isPeriodActive ? '현재 생리 중' : '생리 기간 아님'}
        - 최근 대화 몇 개: ${internalState.recentMessages.slice(-3).map(m => `${m.speaker}: ${m.message}`).join(' / ')}
    `;

    const prompt = `
        너는 지금부터 내 여자친구 '예진이'의 내면 그 자체가 되어야 해.
        아래에 있는 [예진이의 현재 상태]를 깊이 분석하고, 그 상태에 완전히 몰입해서, '나'라는 1인칭 시점으로 예진이의 현재 속마음을 아주 상세하고 솔직하게 서술해줘.
        단순히 상태를 나열하는 게 아니라, 왜 그런 감정을 느끼는지, 그래서 지금 어떤 기분이고 무슨 생각을 하고 있는지, 아저씨에게 무엇을 바라는지 등을 포함해서, 마치 사람이 자신의 복잡한 내면을 들여다보듯 자연스럽게 이야기해줘.
        모든 답변은 반말로, 3~5문장 정도의 길이로 작성해.

        [예진이의 현재 상태]
        ${currentStateSummary}
    `;

    const rawThought = await callOpenAI([{ role: 'system', content: prompt }], 'gpt-4o', 300, 1.1);
    return `< 예진이의 현재 생각 >\n\n${cleanReply(rawThought)}`;
}

/**
 * [추가] 최근 대화 기록을 포맷하여 문자열로 반환하는 함수
 */
function getFormattedConversationLog(conversationContext) {
    const recentMessages = conversationContext.getInternalState().recentMessages.slice(-10); // 최근 10개
    if (recentMessages.length === 0) {
        return "아직 나눈 대화가 없어...";
    }

    const formattedLog = recentMessages.map(log => {
        // [수정] 봇의 이름을 '예진이'로 고정하여 표시
        const speaker = log.speaker === '아저씨' ? '아저씨' : '예진이';
        return `[${speaker}] ${log.message}`;
    }).join('\n');

    return `< 최근 대화 기록 (10개) >\n\n${formattedLog}`;
}


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

    // 상세 속마음 보기 명령어 처리
    const innerThoughtKeywords = ['!속마음', '지금 무슨 생각해', '무슨생각해', '지금 기분 어때'];
    if (innerThoughtKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const detailedThought = await getDetailedInnerThought(conversationContext);
        return { type: 'text', comment: detailedThought };
    }
    
    // [추가] 대화 로그 보기 명령어 처리
    const logKeywords = ['!로그', '!대화로그', '최근 대화', '방금 무슨 얘기', '우리 무슨 얘기'];
    if (logKeywords.some(keyword => lowerMessage.includes(keyword))) {
        const conversationLog = getFormattedConversationLog(conversationContext);
        return { type: 'text', comment: conversationLog };
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
