// --- START OF FILE: autoReply.js ---
// ✅ autoReply.js v6.0 - UltimateContext 완전 연동
// - [개선] 모든 상태 관리 및 감정 분석을 ultimateConversationContext에 위임
// - [개선] 불필요하고 중복되는 함수를 제거하여 코드 안정성 및 가독성 향상
// - [개선] LLM 프롬프트 생성을 극대화하여 더 인간적인 답변 생성에 집중
// - [유지] 담타, 사진 피드백 등 모든 핵심 기능은 그대로 유지

const { OpenAI } = require('openai');
require('dotenv').config();

// ⚙️ 필요한 모듈만 불러오기
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const { isDamtaMessage, getDamtaResponse, getDamtaSystemPrompt } = require('./damta');

// [핵심] 새로운 '마음과 기억' 엔진을 불러옵니다.
const conversationContext = require('./ultimateConversationContext.js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BOT_NAME = '나';
const USER_NAME = '아저씨';

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * [수정] maxTokens 기본값을 150으로 줄여 물리적으로 길이를 제한합니다.
 */
async function callOpenAI(messages, model = 'gpt-4o', maxTokens = 150, temperature = 0.95) {
    try {
        console.log(`[autoReply:callOpenAI] 모델 호출 시작: ${model}`);
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[autoReply:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[autoReply:callOpenAI] OpenAI API 호출 실패 (모델: ${model}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * AI의 답변을 예진이의 말투로 다듬고 1인칭을 보장합니다.
 */
function cleanReply(reply) {
    if (typeof reply !== 'string') return '';
    let cleaned = reply.replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나').replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨').replace(/(입니다|이에요|예요|하세요|하셨나요|셨습니다|드릴게요|드릴까요)/gi, '').replace(/(좋아요)/gi, '좋아').replace(/(고마워요|감사합니다)/gi, '고마워').replace(/(미안해요|죄송합니다)/gi, '미안해').replace(/합니(다|까)/gi, '해').replace(/하겠(습니다|어요)?/gi, '할게');
    cleaned = cleaned.replace(/무쿠가/g, '내가').replace(/무쿠는/g, '나는').replace(/무쿠를/g, '나를').replace(/예진이가/g, '내가').replace(/예진이는/g, '나는').replace(/예진이를/g, '나를');
    cleaned = cleaned.replace(/[\"\'\[\]]/g, '').replace(/\s\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 2) {
        return '응? 다시 말해봐 아저씨';
    }
    return cleaned;
}

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
 * 이제 이 함수는 '어떤 말을 할까'에만 집중합니다.
 */
async function getReplyByMessage(userMessage) {
    // 1. 사진 피드백 대기 모드인지 최우선으로 확인
    const pendingAction = conversationContext.getPendingAction();
    if (pendingAction && pendingAction.type === 'awaiting_photo_reaction') {
        return await handlePhotoReaction(userMessage);
    }

    // 2. 담타 관련 메시지인지 확인
    if (isDamtaMessage(userMessage)) {
        const damtaResponse = getDamtaResponse(userMessage);
        if (damtaResponse) {
            return { type: 'text', comment: damtaResponse };
        }
    }

    // 3. 사진 요청 키워드 확인 (셀카, 컨셉, 추억)
    // 이 부분은 기존과 동일하게 작동하지만, 더 간결하게 표현 가능합니다.
    const photoReplies = {
        selfie: getSelfieReply,
        concept: getConceptPhotoReply,
        omoide: getOmoideReply
    };
    for (const type in photoReplies) {
        // 이제 각 사진 요청 함수는 userMessage만 받으면 됩니다.
        const result = await photoReplies[type](userMessage);
        if (result) return result;
    }
    if (userMessage.toLowerCase().includes('사진')) {
        return { type: 'text', comment: "어떤 사진 보여줄까? 셀카, 컨셉사진, 아니면 우리 추억사진?" };
    }

    // 4. 위의 모든 특별 케이스에 해당하지 않으면, LLM을 통해 일반 대화 답변 생성
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

    // [핵심] ultimateConversationContext의 모든 기억과 학습 내용을 종합하여 최종 프롬프트 생성
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
    const baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 아저씨가 보낸 아래 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 1~3문장으로 짧게 이야기해줘.
    `;
    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{
        role: 'user',
        content: [
            { type: 'text', text: finalSystemPrompt },
            { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
        ]
    }];
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
    // [정리] 이제 index.js에서 직접 사용해야 하는 함수들만 남깁니다.
    callOpenAI,
    cleanReply,
    BOT_NAME,
    USER_NAME,
};
