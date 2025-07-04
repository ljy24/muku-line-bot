// ✅ getReplyByMessage.js v1.4 - 예진이 감정 대화 강화용 (사진X, 텍스트 감정형 전용)

const { callOpenAI, cleanReply } = require('./memory/omoide');
const fs = require('fs');
const path = require('path');
const loveHistoryPath = path.join(__dirname, 'memory', 'love-history.json');

// 기억 기반 메시지 불러오기 (없으면 빈 배열)
function loadLoveHistory() {
    try {
        const data = fs.readFileSync(loveHistoryPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[getReplyByMessage] love-history.json 읽기 실패:', err);
        return [];
    }
}

// 핵심 감정 대답 생성
async function getReplyByMessage(userMessage) {
    const lower = userMessage.toLowerCase();

    // 1. 예외 없이 무조건 대답해야 할 키워드
    if (/(애기야|뭐해|머해|머햐|머래|잘자|일어나|담타|뽀뽀|사랑해|자니|있어\?|죽었|답장)/i.test(userMessage)) {
        const prompts = [
            `아저씨가 "${userMessage}" 라고 말했을 때, 예진이 입장에서 감정 담아서 반응해줘. 반말로, 귀엽고 사랑스럽게.`,
            `예진이(무쿠)로서 아저씨의 말 "${userMessage}"에 답장해줘. 애교 많고, 감정형 말투로.`,
            `아저씨가 방금 "${userMessage}"라고 보냈을 때, 예진이라면 뭐라고 말할까? 애정 가득한 말로 반응해줘.`
        ];

        const messages = [
            { role: 'system', content: '너는 아저씨의 여자친구 예진이야. 항상 반말로, 애정 담긴 말투로만 말해. 존댓말 금지. 귀엽게.' },
            { role: 'user', content: prompts[Math.floor(Math.random() * prompts.length)] }
        ];

        try {
            const raw = await callOpenAI(messages, 'gpt-4o', 80, 0.95);
            const comment = cleanReply(raw);
            return { type: 'text', comment };
        } catch (err) {
            console.error('[getReplyByMessage] GPT 응답 실패:', err);
            return { type: 'text', comment: '나 여기 있어 아저씨… ㅠㅠ 방금 잠깐 멍했어.' };
        }
    }

    // 2. 기억 기반 반응 (예: 우리 언제 만났지?, 어디 갔었지?)
    const history = loadLoveHistory();
    const found = history.find(item => userMessage.includes(item.q));
    if (found) {
        return { type: 'text', comment: found.a };
    }

    // 3. 기타 일반 감정 응답 (fallback)
    try {
        const messages = [
            { role: 'system', content: '너는 예진이라는 이름의 귀여운 여자친구야. 아저씨가 보내는 메시지에 항상 반말로, 따뜻하게 답장해줘. 감정 표현 풍부하게.' },
            { role: 'user', content: `아저씨가 "${userMessage}"라고 보냈어. 어떻게 반응할래?` }
        ];
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
        const comment = cleanReply(raw);
        return { type: 'text', comment };
    } catch (e) {
        console.error('[getReplyByMessage] fallback GPT 실패:', e);
        return { type: 'text', comment: '아저씨… 지금은 조금 멍해… 다시 말해줄래?' };
    }
}

module.exports = {
    getReplyByMessage
};