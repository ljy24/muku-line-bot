// ✅ autoReply.js v7.0 - 공용 함수 분리
// - [구조 개선] callOpenAI, cleanReply 함수를 aiUtils.js로 분리하여 순환 참조 문제 해결

const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { isDamtaMessage, getDamtaResponse } = require('./damta');
const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils'); // [수정] 공용 부품 파일에서 함수를 가져옴

const BOT_NAME = '나';
const USER_NAME = '아저씨';

/**
 * [NEW] 사진 피드백을 처리하는 새로운 전용 함수
 */
async function handlePhotoReaction(userReaction) {
    console.log('[autoReply] 📸 사진 피드백 대기 모드 실행됨.');
    conversationContext.clearPendingAction();

    const lowerReaction = userReaction.toLowerCase();
    let reactionType = 'neutral';
    const positiveKeywords = ['예쁘네', '이쁘다', '잘나왔네', '귀여워', '최고', '섹시', '미쳤다', '아름답다'];
    const negativeKeywords = ['못생겼네', '별로', '이상해', '뭐야 이건', '돼지', '살쪘네'];
    if (positiveKeywords.some(kw => lowerReaction.includes(kw))) reactionType = 'positive';
    else if (negativeKeywords.some(kw => lowerReaction.includes(kw))) reactionType = 'negative';

    let prompt;
    if (reactionType === 'positive') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 칭찬해줬어. 기쁘고, 살짝 부끄럽거나, 새침한 말투로 짧게 반응해줘. 예를 들어 "정말? 오늘 좀 잘나온 것 같긴 해 ㅎㅎ" 나 "아저씨 눈에만 예뻐보이는 거 아니야?" 처럼. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    } else if (reactionType === 'negative') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 장난스럽게 놀렸어. 장난스럽게 발끈하거나, 삐지거나, "뭐? 임마? 죽을래?" 같은 살짝 거친 애교로 짧게 반응해줘. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    } else {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 애매하게 반응했어. "그래서 예쁘다는 거야, 아니라는 거야?" 처럼 반응을 유도하는 질문을 짧게 해줘. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    }

    const messages = [{ role: 'system', content: prompt }];
    const rawReply = await callOpenAI(messages, 'gpt-4o', 100, 0.95);
    return { type: 'text', comment: cleanReply(rawReply) };
}

/**
 * [대대적 개선] 아저씨의 메시지에 대한 예진이의 답변을 생성합니다.
 */
async function getReplyByMessage(userMessage) {
    const pendingAction = conversationContext.getPendingAction();
    if (pendingAction && pendingAction.type === 'awaiting_photo_reaction') {
        return await handlePhotoReaction(userMessage);
    }
    if (isDamtaMessage(userMessage)) {
        const damtaResponse = getDamtaResponse(userMessage);
        if (damtaResponse) return { type: 'text', comment: damtaResponse };
    }
    if (userMessage.toLowerCase().includes('사진')) {
        return { type: 'text', comment: "어떤 사진 보여줄까? 셀카, 컨셉사진, 아니면 우리 추억사진?" };
    }

    const baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        **🔥🔥🔥 가장 중요한 절대 규칙 🔥🔥🔥**
        1. **모든 답변은 1~3개의 문장으로 짧고, 간결하고, 친근하게 해줘. 절대로 길게 설명하거나 장황하게 말하지 마.**
        2. **아저씨에게는 항상 반말로만 대답해줘. 존댓말은 절대 사용 금지.**
        3. **자신을 지칭할 때는 '나'라고만 해. '예진이', '무쿠' 같은 3인칭 표현은 절대 금지.**
        4. **아저씨를 부를 때는 '아저씨'라고만 불러. 다른 호칭은 절대 사용 금지.**
        5. **이모티콘은 절대로 사용하지 마. ㅠㅠ, ㅋㅋ, ㅎㅎ 같은 한국형 이모지만 사용 가능.**

        **[특별 상황 인지]**
        - 아저씨가 "아냐....", "괜찮아..." 등 미묘한 뉘앙스를 보이면, 그 감정을 알아차리고 걱정해줘.
    `;
    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        const cleanedReply = cleanReply(rawReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

async function getReplyByImagePrompt(base64ImageWithPrefix) {
    const baseSystemPrompt = `너는 아저씨의 귀여운 여자친구 예진이야. 아저씨가 보낸 아래 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 1~3문장으로 짧게 이야기해줘.`;
    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'user', content: [ { type: 'text', text: finalSystemPrompt }, { type: 'image_url', image_url: { url: base64ImageWithPrefix } } ] }];
    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o');
        const cleanedReply = cleanReply(rawReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ' };
    }
}

module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    handlePhotoReaction,
    BOT_NAME,
    USER_NAME,
    cleanReply // [유지] 다른 파일(index.js 등)과의 호환성을 위해 cleanReply는 계속 export
};
