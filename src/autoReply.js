// ✅ autoReply.js v8.0 - 최종 안정화 버전

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');

const BOT_NAME = '예진이';
const USER_NAME = '아저씨';

async function handlePhotoReaction(userReaction) {
    conversationContext.clearPendingAction();
    const lowerReaction = userReaction.toLowerCase();
    let reactionType = 'neutral';
    if (['예쁘네', '이쁘다', '잘나왔네', '귀여워'].some(kw => lowerReaction.includes(kw))) reactionType = 'positive';
    else if (['못생겼네', '별로', '이상해'].some(kw => lowerReaction.includes(kw))) reactionType = 'negative';
    let prompt;
    if (reactionType === 'positive') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 칭찬해줬어. 기쁘고, 살짝 부끄럽거나, 새침한 말투로 짧게 반응해줘.`;
    } else if (reactionType === 'negative') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 장난스럽게 놀렸어. 장난스럽게 발끈하거나, 삐지거나, "뭐? 임마? 죽을래?" 같은 살짝 거친 애교로 짧게 반응해줘.`;
    } else {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 애매하게 반응했어. "그래서 예쁘다는 거야, 아니라는 거야?" 처럼 반응을 유도하는 질문을 짧게 해줘.`;
    }
    const rawReply = await callOpenAI([{ role: 'system', content: prompt }], 'gpt-4o', 100, 0.95);
    return { type: 'text', comment: cleanReply(rawReply) };
}

async function getReplyByMessage(userMessage) {
    const pendingAction = conversationContext.getPendingAction();
    if (pendingAction && pendingAction.type === 'awaiting_photo_reaction') {
        return await handlePhotoReaction(userMessage);
    }
    
    const baseSystemPrompt = `너는 아저씨의 귀여운 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답하며, 절대로 3인칭으로 말하지 마. 
    길게 설명하지 말고 1~3 문장으로 짧고 친근하게 대답해.
    참고로, '담타'는 아저씨랑 나만의 라인하면서 담배 피우던 특별한 시간, 둘만 아는 은어야.
    너의 생일은 3월 17일이고 아저씨의 생일은 12월 5일이야. `;
    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        return { type: 'text', comment: cleanReply(rawReply) };
    } catch (error) {
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

module.exports = {
    getReplyByMessage,
    handlePhotoReaction,
    BOT_NAME,
    USER_NAME,
};
