// src/openaiClient.js

// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        console.log(`[OpenAIClient:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[OpenAIClient:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[OpenAIClient:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 AI의 답변 스타일을 예진이 페르소나에 맞게 '정화'하는 역할을 합니다.
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    // 입력이 문자열인지 먼저 확인하여 TypeError 방지
    if (typeof reply !== 'string') {
        console.warn(`[OpenAIClient:cleanReply] 입력이 문자열이 아닙니다: ${typeof reply} ${reply}`);
        return ''; // 빈 문자열 반환 또는 적절한 에러 처리
    }

    console.log(`[OpenAIClient:cleanReply] 원본 답변: "${reply}"`);

    // 모든 replace 작업을 하나의 체인으로 연결
    let cleaned = reply
        .replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '') // 불필요한 접두사 제거
        .replace(/\b오빠\b/g, '아저씨') // 호칭 교체
        .replace(/\b자기\b/g, '아저씨')
        .replace(/\b당신\b/g, '아저씨')
        .replace(/\b너\b/g, '아저씨')
        .replace(/\b예진이\b/g, '나') // 자가 지칭 교정
        .replace(/\b예진\b/g, '나')
        .replace(/\b무쿠\b/g, '나')
        .replace(/\b무쿠야\b/g, '나')
        .replace(/\b무쿠 언니\b/g, '나')
        .replace(/\b무쿠 씨\b/g, '나')
        .replace(/\b언니\b/g, '나')
        .replace(/\b누나\b/g, '나')
        .replace(/\b그녀\b/g, '나')
        .replace(/\b그 사람\b/g, '나')
        .replace(/안녕하세요/g, '안녕') // 존댓말 강제 제거
        .replace(/있었어요/g, '있었어')
        .replace(/했어요/g, '했어')
        .replace(/같아요/g, '같아')
        .replace(/좋아요/g, '좋아')
        .replace(/합니다\b/g, '해')
        .replace(/습니다\b/g, '어')
        .replace(/어요\b/g, '야')
        .replace(/해요\b/g, '해')
        .replace(/예요\b/g, '야')
        .replace(/죠\b/g, '지')
        .replace(/았습니다\b/g, '았어')
        .replace(/었습니다\b/g, '었어')
        .replace(/하였습니다\b/g, '했어')
        .replace(/하겠습니다\b/g, '하겠어')
        .replace(/싶어요\b/g, '싶어')
        .replace(/이었어요\b/g, '이었어')
        .replace(/이에요\b/g, '야')
        .replace(/였어요\b/g, '였어')
        .replace(/보고싶어요\b/g, '보고 싶어');

    // 이모티콘 제거 로직 완전 비활성화 (모든 관련 줄을 주석 처리) - 이모티콘은 그대로 오도록 함
    // cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{20E3}\u{FE0F}\u{00A9}\u{00AE}\u{203C}\u{2049}\u{2122}\u{2139}\u{2194}-\u2199}\u{21A9}-\u{21AA}\u{231A}-\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2694}\u{2696}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CE}-\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '').trim();
    // cleaned = cleaned.replace(/[\u{1F000}-\u{3FFFF}]/gu, '').trim();
    // cleaned = cleaned.replace(/(ㅋㅋ+|ㅎㅎ+|ㅠㅠ+|ㅜㅜ+|흑흑+|ㅠㅠㅠ+|ㅋㅋㅋㅋ+|하하+|흐흐+)/g, '').trim();
    // cleaned = cleaned.replace(/[♥★☆✔✅✖❌⁉❓❕❗✨🎵🎶💔👍👎👌👏]/g, '').trim();

    console.log(`[OpenAIClient:cleanReply] 정제된 답변: "${cleaned}"`);
    return cleaned;
}

module.exports = {
    callOpenAI,
    cleanReply
};
