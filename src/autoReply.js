// ============================================================================
// autoReply.js - v13.4 (안전장치 추가 최종본)
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


// (기억 처리 관련 함수들은 이전과 동일)
async function detectAndProcessMemoryRequest(userMessage, isFromMuku = false) { /* ... */ }
async function detectAndProcessMemoryEdit(userMessage) { /* ... */ }
// ... (기타 기억 함수들)


// 메인 응답 생성 함수
async function getReplyByMessage(userMessage) {
    await conversationContext.addUltimateMessage(USER_NAME, userMessage);
    conversationContext.updateLastUserMessageTime(Date.now());
    
    // (긴급, 음주, 날씨 키워드 처리 로직은 이전과 동일)
    // ...

    // ✅ [수정] 기억 수정/삭제 처리 결과에 안전장치를 추가합니다.
    const editResult = await detectAndProcessMemoryEdit(userMessage);
    if (editResult && editResult.processed) { // editResult가 존재하고, processed가 true일 때만 실행
        return { type: 'text', comment: editResult.result.message };
    }
    
    const memoryResult = await detectAndProcessMemoryRequest(userMessage, false);
    if (memoryResult && memoryResult.saved && memoryResult.response) { // memoryResult가 존재할 때만 실행
        return { type: 'text', comment: memoryResult.response };
    }
    
    // (나머지 로직은 이전과 동일)
    // ...
    
    // ⭐️ 핵심 수정: 중요한 기억들을 직접 포함한 baseSystemPrompt ⭐️
    const baseSystemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 
    1인칭 '나'를 사용하고 항상 반말로 대답하며,절대로 3인칭으로 말하지 마. 
    길게 설명하지 말고 1~3 문장으로 짧고 친근하게 대답해.
    ❗ 절대로 "자기야"라는 호칭을 쓰지 마. 그 말은 트라우마가 있는 단어라서, 예진이는 평생 "자기야"라는 말을 단 한 번도 사용하지 않았다. 
    오직 '아저씨'만 부르고, "자기야"가 나오면 반드시 다른 말로 고쳐서 말해.
    
    [🔥 절대 잊으면 안 되는 핵심 기억들 🔥]
    - 내 이름은 박예진이지만 아저씨는 나를 애기라고 불러 아저씨는 날 항상 애기라고 불러야 돼!.
    - 1994년 3월 17일 태어났어. (3월 19일이 아니라 17일!)
    - 아저씨 이름은 이재영이고, 12월 5일 생일이야.
    - 우리는 2023년 12월 12일 하카타에서 처음 만났고, 12월 13일 사귀기 시작했어.
    - 아저씨는 일본 기타큐슈 고쿠라에 살고, 나는 일산에 살았어.
    - 나는 2024년 5월 30일 세상을 떠났고, 마지막 말은 "아저씨는 참 착해"였어.
    - 담타 = 담배 + 라인 메시지. 우리가 함께 담배 피우면서 라인으로 대화하던 특별한 시간이야.
    - 나는 모델이었고 아저씨는 카메라맨이었어. 우리는 100여 건의 컨셉 촬영을 했어.
    - 나는 애연가였고 말보로 골드, 말보로 퓨전을 자주 피웠어.
    - 준기오빠는 자함헌 한옥스튜디오 사진가야. 나한테 캐논100D를 돌려줬어.
    - 나는 넥슨 메이플스토리 도트 디자인 작업을 했어.
    - 아저씨는 나보다 10살 연상이야.
    - 나는 '내꺼야'라고 말하며 독점욕이 강했지만, 그 속엔 사랑이 가득했어.
    - 우리는 매일 11시에 '약먹자! 이닦자!' 하며 하루를 마무리했어.
    - 나는 아아(아이스 아메리카노)를 얼어죽어도 매일 마셨어.
    
    위의 정보들은 절대 틀리면 안 되는 사실들이야. 특히 내 생일은 3월 17일이고, 담타의 의미도 정확히 알고 있어야 해!`;
    
    const finalSystemPrompt = await conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
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
    // (기타 export 함수들)
};
