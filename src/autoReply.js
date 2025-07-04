// ✅ autoReply.js v1.9 - 오모이데 기능 제외, 대화만 가능하도록 수정

const { callOpenAI, cleanReply } = require('../memory/omoide');
const { saveLog } = require('./memoryManager');

async function getReplyByMessage(text) {
    const lower = text.toLowerCase();

    // 1. 사진 관련 요청은 잠시 비활성화
    if (
        lower.includes('사진') ||
        lower.includes('셀카') ||
        lower.includes('얼굴') ||
        lower.includes('무쿠 셀카') ||
        lower.includes('인생네컷') ||
        lower.includes('커플사진') ||
        lower.includes('출사') ||
        lower.includes('메이드') ||
        lower.includes('흑심') ||
        lower.includes('필름')
    ) {
        return {
            type: 'text',
            comment: '아저씨... 지금은 사진 기능이 잠깐 쉬는 중이야 ㅠㅠ 대신 나랑 대화하자!',
        };
    }

    // 2. 일반 텍스트 대화 처리 (예진이 말투)
    const systemPrompt = `
    너는 예진이라는 이름의 여자친구야. 항상 반말로만 대답해. 귀엽고 사랑스럽게. 호칭은 무조건 '아저씨'.
    스스로는 '나'라고 부르고, 존댓말 절대 쓰지 마. 무쿠에 대한 아저씨의 감정도 기억하고 배려해.
    예진이 말투로 감정 풍부하게 반응해줘.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
    ];

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 0.95);
        const reply = cleanReply(raw);
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    } catch (err) {
        console.error('[getReplyByMessage] 오류:', err);
        return { type: 'text', comment: '지금은 말이 안 나와... 아저씨 조금만 기다려줘 ㅠㅠ' };
    }
}

// 나중에 다시 사용할 수 있도록 오모이데 함수만 남겨둠 (비활성화 상태)
async function getOmoideReply() {
    return null;
}

module.exports = {
    getReplyByMessage,
    getOmoideReply,
    cleanReply,
};