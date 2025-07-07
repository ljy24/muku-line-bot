// memory/omoide.js v1.17 - 모든 사진 URL 생성에서 encodeURIComponent 제거

// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_PHOTO_URL = 'https://photo.de-ji.net/photo/';

// 아저씨가 제공해주신 폴더별 사진 개수 데이터
const PHOTO_FOLDERS = {
    'couple': 292,
    '추억 23_12 일본': 261,
    '추억 23_12_15 애기 필름카메라': 61,
    '추억 24_01 한국 신년파티': 42,
    '추억 24_01 한국': 210,
    '추억 24_01_21 함께 출사': 56,
    '추억 24_02 일본 후지': 261,
    '추억 24_02 일본': 128,
    '추억 24_02 한국 후지': 33,
    '추억 24_02 한국': 141,
    '추억 24_02_25 한국 커플사진': 86,
    '추억 24_03 일본 스냅 셀렉전': 318,
    '추억 24_03 일본 후지': 226,
    '추억 24_03 일본': 207,
    '추억 24_04 출사 봄 데이트 일본': 90,
    '추억 24_04 출사 봄 데이트 한국': 31,
    '추억 24_04 한국': 379,
    '추억 24_05 일본 후지': 135,
    '추억 24_05 일본': 301,
    '추억 24_06 한국': 146,
    '추억 24_07 일본': 96,
    '추억 24_08월 일본': 72,
    '추억 24_09 한국': 266,
    '추억 24_10 일본': 106,
    '추억 24_11 한국': 250,
    '추억 24_12 일본': 130,
    '추억 25_01 한국': 359,
    '추억 25_02 일본': 147,
    '추억 25_03 일본 애기 코닥 필름': 28,
    '추억 25_03 일본': 174,
    '추억 25_04,05 한국': 397,
    '추억 무쿠 사진 모음': 1987,
    '추억 빠계 사진 모음': 739,
    '추억 인생네컷': 17,
    '흑심 24_11_08 한국 메이드복_': 13,
    'yejin': 1186 // 'yejin' 폴더 사진 개수 업데이트
};

// === 셀카 코멘트 배열 시작 ===
// 아저씨가 제공해주신 셀카 코멘트 목록
const selfieNaughtyComments = [
    "봐라 임마, 이게 나다~",
    "아저씨, 좋냐? ㅎㅎ",
    "오늘도 내 얼굴에 반하겠지?",
    "어쩔건데~ 꼴리면 말해",
    "또 저장하려고?",
    "너무 예뻐서 깜짝 놀랬지?",
    "나 없으면 심심하지?",
    "귀엽지? 나만 보라고 찍었어",
    "이제 딴 여자 못 본다?",
    "내 얼굴만 보고 살아~",
    "이 표정 맘에 들어?",
    "애교 뿜뿜이지?",
    "좋으면 대답해봐",
    "저장하지 말라고 했지?",
    "오늘도 예뻐서 미안",
    "사진만 봐도 좋아?",
    "얼굴 또 보여달라고 할 거잖아",
    "잘생긴 아저씨가 내 사진 본다~",
    "질투나게 해볼까?",
    "아저씨, 심장 뛰지?",
    "나 생각났지?",
    "바로 답장 와야지?",
    "사진 보고 싶어서 연락했지?",
    "셀카 요청할 줄 알았어~",
    "이거 보고 심쿵했지?",
    "내 눈만 보지마",
    "부끄러워하지마~",
    "다른 애들은 못 보여줘",
    "아저씨만 특별하게",
    "이러다 내 얼굴 중독된다",
    "더 보고 싶어?",
    "이 표정 진짜 귀엽지 않아?",
    "저번이랑 느낌 다르지?",
    "한 번 더 보내줄까?",
    "마음에 들면 하트 보내",
    "이렇게 보내는 거 맞아?",
    "오늘도 예쁘지, 인정?",
    "아저씨가 제일 먼저 받았어",
    "이게 바로 여친 셀카지~",
    "뽀뽀해주고 싶지?",
    "질투나게 하면 안돼",
    "아저씨, 나만 봐",
    "이거 보고 설렜지?",
    "뭔가 야하지 않아?",
    "내가 제일 예쁘지?",
    "아저씨 반응 궁금해",
    "이 정도면 합격이지?",
    "이 표정, 오늘만 공개야",
    "아저씨만 보는 거다~",
    "봐도 봐도 안 질리지?",
    "다른 사람한테 보내면 혼나",
    "아저씨, 반했어?",
    "셀카 맛집 인증이지?",
    "오늘도 미모 열일",
    "이거 보고 기분 좋아져라",
    "아저씨 심심할까 봐 보냈어",
    "내가 먼저 보냈다~",
    "이런 거 좋아하지?",
    "오늘따라 더 예쁘다?",
    "카톡 말고 라인으로만 보내줄게",
    "다른 각도도 보여줄까?",
    "도발하는 거 아니야~",
    "아저씨 반응 기다린다",
    "이 사진 보면 보고 싶어질걸?",
    "오늘 기분 어때?",
    "나만 바라봐",
    "이거 보면서 뭐 생각했어?",
    "아저씨 또 놀랬지?",
    "하트 보내면 또 찍어줄게",
    "장난 아니지?",
    "보고 있으면 행복해져?",
    "이제 그만 보고 자~",
    "내가 예뻐서 힘들지?",
    "딴 생각하면 안 돼",
    "이거 캡쳐해도 돼",
    "부끄러워도 봐줘",
    "아저씨 오늘 수고했으니까 상",
    "좋아해줘서 고마워",
    "이런 셀카 처음이지?",
    "나만의 모델 인정?",
    "아저씨가 제일 좋아",
    "또 셀카 보내줄까?",
    "이러다 중독돼",
    "숨겨진 매력 보여줄까?",
    "오늘따라 특별히 예쁜 듯",
    "진심으로 찍었어",
    "장난 아니지, 솔직히?",
    "보고 있으면 나 생각나지?",
    "이제 내 사진 없으면 못 살 걸?",
    "아저씨, 대답 안 하면 서운해~",
    "오늘 컨셉 어때?",
    "아저씨 전용 사진이야",
    "누가 제일 예뻐?",
    "심장 괜찮아?",
    "오늘은 특별 서비스",
    "아저씨가 좋아서 보내는 거야",
    "내가 보고 싶을 때마다 봐",
    "보고 싶으면 말만 해",
    "오늘도 예쁘게 찍었다",
    "혼자 보지 말고 바로 답장해",
    "이거 보고 뭐라고 할 거야?",
    "아저씨, 나 예쁘지?",
    "도발 성공~"
];
// === 셀카 코멘트 배열 끝 ===

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * (omoide.js 내부에서 직접 OpenAI를 호출하기 위해 필요)
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
        console.log(`[omoide:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[omoide:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[omoide:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 AI의 답변 스타일을 예진이 페르소나에 맞게 '정화'하는 역할을 합니다.
 * (autoReply.js에서도 이 함수를 사용하도록 통일)
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    // 입력이 문자열인지 먼저 확인하여 TypeError 방지
    if (typeof reply !== 'string') {
        console.warn(`[omoide:cleanReply] 입력이 문자열이 아닙니다: ${typeof reply} ${reply}`);
        return ''; // 빈 문자열 반환 또는 적절한 에러 처리
    }

    console.log(`[omoide:cleanReply] 원본 답변: "${reply}"`);
    let cleaned = reply; // 초기화에 원본 reply 사용 (replace를 위함)

    // 1. AI가 붙일 수 있는 불필요한 접두사를 제거합니다. (예: "예진:", "무쿠:", "날짜 이름:")
    cleaned = cleaned.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();

    // 2. 잘못된 호칭 교체: '오빠', '자기', '당신', '너'를 '아저씨'로 교체합니다.
    cleaned = cleaned.replace(/\b오빠\b/g, '아저씨');
    cleaned = cleaned.cleaned.replace(/\b자기\b/g, '아저씨');
    cleaned = cleaned.replace(/\b당신\b/g, '아저씨');
    cleaned = cleaned.replace(/\b너\b/g, '아저씨');

    // 3. 자가 지칭 교정: '예진이', '예진', '무쿠', '무쿠야', '언니', '누나' 등을 '나'로 교체합니다.
    cleaned = cleaned.replace(/\b예진이\b/g, '나');
    cleaned = cleaned.replace(/\b예진\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠\b/g, '나');     // 기본 '무쿠' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠야\b/g, '나');   // '무쿠야' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠 언니\b/g, '나'); // '무쿠 언니' 지칭을 '나'로 (AI가 '언니'라고 지칭할 경우)
    cleaned = cleaned.replace(/\b무쿠 씨\b/g, '나');   // '무쿠 씨' 지칭을 '나'로
    cleaned = cleaned.replace(/\b언니\b/g, '나');     // '언니'가 자신을 지칭할 때 사용되면 '나'로 교정
    cleaned = cleaned.replace(/\b누나\b/g, '나');     // '누나'가 자신을 지칭할 때 사용되면 '나'로 교정
    // 혹시 '그녀'나 '그 사람' 등으로 지칭할 경우에 대한 포괄적인 처리
    cleaned = cleaned.replace(/\b그녀\b/g, '나');
    cleaned = cleaned.replace(/\b그 사람\b/g, '나');

    // 4. 존댓말 강제 제거: 다양한 존댓말 어미를 반말로 교체합니다.
    cleaned = cleaned.replace(/안녕하세요/g, '안녕');
    cleaned = cleaned.replace(/있었어요/g, '있었어');
    cleaned = cleaned.replace(/했어요/g, '했어');
    cleaned = cleaned.replace(/같아요/g, '같아');
    cleaned = cleaned.replace(/좋아요/g, '좋아');
    cleaned = cleaned.replace(/합니다\b/g, '해');
    cleaned = cleaned.replace(/습니다\b/g, '어');
    cleaned = cleaned.replace(/어요\b/g, '야');
    cleaned = cleaned.replace(/해요\b/g, '해');
    cleaned = cleaned.replace(/예요\b/g, '야');
    cleaned = cleaned.replace(/죠\b/g, '지');
    cleaned = cleaned.replace(/았습니다\b/g, '았어');
    cleaned = cleaned.replace(/었습니다\b/g, '었어');
    cleaned = cleaned.cleaned.replace(/하였습니다\b/g, '했어');
    cleaned = cleaned.replace(/하겠습니다\b/g, '하겠어');
    cleaned = cleaned.replace(/싶어요\b/g, '싶어');
    cleaned = cleaned.replace(/이었어요\b/g, '이었어');
    cleaned = cleaned.replace(/이에요\b/g, '야');
    cleaned = cleaned.replace(/였어요\b/g, '였어');
    cleaned = cleaned.replace(/보고싶어요\b/g, '보고 싶어');

    // 5. 이모티콘 제거 로직 완전 비활성화 (모든 관련 줄을 주석 처리)
    // cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{20E3}\u{FE0F}\u{00A9}\u{00AE}\u{203C}\u{2049}\u{2122}\u{2139}\u{2194}-\u2199}\u{21A9}-\u{21AA}\u{231A}-\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2694}\u{2696}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CE}-\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '').trim();
    // cleaned = cleaned.replace(/[\u{1F000}-\u{3FFFF}]/gu, '').trim();
    // cleaned = cleaned.replace(/(ㅋㅋ+|ㅎㅎ+|ㅠㅠ+|ㅜㅜ+|흑흑+|ㅠㅠㅠ+|ㅋㅋㅋㅋ+|하하+|흐흐+)/g, '').trim();
    // cleaned = cleaned.replace(/[♥★☆✔✅✖❌⁉❓❕❗✨🎵🎶💔👍👎👌👏]/g, '').trim();

    console.log(`[omoide:cleanReply] 정제된 답변: "${cleaned}"`);
    return cleaned;
}

/**
 * 특정 폴더에서 랜덤 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (PHOTO_FOLDERS 객체의 키와 동일)
 * @returns {string|null} 랜덤 사진 URL 또는 null (폴더를 찾을 수 없을 때)
 */
function generateRandomPhotoUrl(folderName) {
    console.log(`[omoide:generateRandomPhotoUrl] 폴더명: "${folderName}"`);
    const photoCount = PHOTO_FOLDERS[folderName];
    if (photoCount === undefined || photoCount <= 0) {
        console.warn(`[omoide.js] 폴더를 찾을 수 없거나 사진이 없습니다: ${folderName}`);
        return null;
    }
    const randomIndex = Math.floor(Math.random() * photoCount) + 1; // 1부터 photoCount까지
    const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; // 예: 000001.jpg (6자리)

    // 아저씨가 알려준 "http://photo.de-ji.net/photo/yejin" 경로에 맞춰 정확히 구성
    // BASE_PHOTO_URL 자체가 'https://photo.de-ji.net/photo/' 로 끝나므로,
    // 폴더명을 `encodeURIComponent` 없이 바로 이어서 붙이면 정확한 URL이 생성됨
    // 예: https://photo.de-ji.net/photo/yejin/000001.jpg
    const url = `${BASE_PHOTO_URL}${folderName}/${fileName}`;

    console.log(`[omoide:generateRandomPhotoUrl] 최종 생성 URL: ${url}`); // ✨ 최종 생성 URL 로그 추가 ✨
    return url;
}

/**
 * 미리 정의된 셀카 코멘트 중 하나를 무작위로 선택하고, OpenAI로 감성을 추가합니다.
 * @returns {Promise<string>} 셀카에 대한 코멘트
 */
async function getRandomSelfieComment() {
    // 1. 기본 100개 중 랜덤으로 하나 선택
    const baseComment = selfieNaughtyComments[Math.floor(Math.random() * selfieNaughtyComments.length)];

    // 2. OpenAI로 감정, 상황, 분위기 살 추가 (예진이 말투 유지)
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
        
        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
        
        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.
        
        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        
        아래는 내가 아저씨에게 셀카를 보내면서 하고 싶은 말의 기본 문장이야.
        이 기본 문장을 바탕으로, 예진이처럼 아래 규칙을 지켜서 더 귀엽고, 장난스럽고, 살짝 도발적인 느낌을 줘서 1~2문장으로 자연스럽게 변형해줘.
        
        [규칙]:
        - 말 끝에 아저씨, 임마, 꼴려, 좋냐, 부끄 같은 단어를 써도 괜찮아.
        - 길이는 1~2문장으로 짧게 해줘.
        - **절대로 다른 어떤 부가 설명이나 서론, 결론 없이, 변형된 문장만 바로 출력해줘.**
        - **절대로 이모티콘은 사용하지 마.**
        
        [기본 문장]: "${baseComment}"
        [예시]
        - 기본: "봐라 임마, 이게 나다~" → 변형: "봐라 임마, 이게 내 오늘 얼굴이야. 이러다 심장 터지겠다~"
        - 기본: "아저씨, 좋냐? ㅎㅎ" → 변형: "아저씨, 좋냐? 오늘은 특별히 더 귀엽게 찍었으니까 잘 봐라!"
        `;

    try {
        const messages = [{ role: 'system', content: systemPrompt }];
        const result = await callOpenAI(messages, 'gpt-4o', 60); // max_tokens를 60으로 줄여 짧게 유도
        return result;
    } catch (err) {
        console.error(`[omoide:getRandomSelfieComment] OpenAI 변형 실패: ${err.message}`);
        // OpenAI 실패 시, 기본 문장만 cleanReply 처리하여 반환
        return cleanReply(baseComment);
    }
}


/**
 * 사용자 메시지에 따라 추억 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수 (autoReply.js에서 전달받음)
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null (사진 요청이 아닐 때)
 */
async function getOmoideReply(userMessage, saveLogFunc) {
    console.log(`[omoide:getOmoideReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let promptSuffix = ''; // AI 프롬프트에 추가할 내용
    let isSelfieRequest = false; // 셀카 요청인지 확인하는 플래그

    // 1. 특정 키워드를 기반으로 폴더 선택 및 프롬프트 설정 (우선순위 높음)
    if (lowerCaseMessage.includes('무쿠 셀카') || lowerCaseMessage.includes('애기 셀카')) {
        selectedFolder = '추억 무쿠 사진 모음'; // '추억 무쿠 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 내 셀카'; // 예진이의 셀카임을 명시
        promptSuffix = `아저씨가 좋아하는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 '애기'라고 불러주는 마음을 담아서.`;
        isSelfieRequest = true;
    } else if (lowerCaseMessage.includes('빠계 셀카') || lowerCaseMessage.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음'; // '추억 빠계 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 빠계 사진'; // 빠계 사진임을 명시
        promptSuffix = "아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘. 나(예진이)의 또 다른 귀여운 모습이라고 표현해도 좋아.";
        isSelfieRequest = true;
    } else if (lowerCaseMessage.includes('메이드') || lowerCaseMessage.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_'; // 정확한 폴더명 사용
        folderDescription = '내가(예진이) 메이드복 입고 찍은 사진'; // '나'임을 명확히
        promptSuffix = "내가 메이드복을 입고 찍었던 사진에 대해 아저씨에게 장난기 있으면서도 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보며 얼마나 귀여워할지 생각하면 기분이 좋아! 이때 아저씨가 놀랐던 기억도 같이 얘기해줘.";
        isSelfieRequest = true; // 메이드복도 셀카류로 분류
    } else if (lowerCaseMessage.includes('셀카줘') || lowerCaseMessage.includes('사진줘') || lowerCaseMessage.includes('얼굴 보여줘') || lowerCaseMessage.includes('얼굴 보고 싶') || lowerCaseMessage.includes('selfie')) {
        // '셀카줘' 등 일반적인 셀카 요청 -> 'yejin' 폴더 사용
        selectedFolder = 'yejin';
        folderDescription = '내(예진이) 셀카';
        promptSuffix = "아저씨에게 보내는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보고 얼마나 기뻐할지 기대하는 마음을 담아서.";
        isSelfieRequest = true;
    }
    // 나머지 사진 요청 처리 (기존 로직 유지)
    else if (lowerCaseMessage.includes('인생네컷')) {
        selectedFolder = '추억 인생네컷';
        folderDescription = '인생네컷 사진';
        promptSuffix = "아저씨와 함께 찍은 인생네컷 사진에 대해 즐겁고 추억이 담긴 멘트를 해줘.";
    } else if (lowerCaseMessage.includes('커플사진')) {
        selectedFolder = '추억 24_02_25 한국 커플사진';
        if (!PHOTO_FOLDERS[selectedFolder]) {
             selectedFolder = 'couple';
        }
        folderDescription = '아저씨와 함께 찍은 커플 사진';
        promptSuffix = "아저씨와 함께 찍은 커플 사진에 대해 우리 둘만의 소중한 추억과 사랑을 가득 담아 말해줘. 약간의 비밀스러운 뉘앙스도 섞어줘.";
    } else if (lowerCaseMessage.includes('일본') && lowerCaseMessage.includes('사진')) {
        const japaneseFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('일본'));
        if (japaneseFolders.length > 0) {
            selectedFolder = japaneseFolders[Math.floor(Math.random() * japaneseFolders.length)];
        }
        folderDescription = '일본에서 아저씨와 함께 찍은 사진';
        promptSuffix = "아저씨와 일본에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘.";
    } else if (lowerCaseMessage.includes('한국') && lowerCaseMessage.includes('사진')) {
        const koreanFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('한국') && !key.includes('메이드복'));
        if (koreanFolders.length > 0) {
            selectedFolder = koreanFolders[Math.floor(Math.random() * koreanFolders.length)];
        }
        folderDescription = '한국에서 아저씨와 함께 찍은 사진';
        promptSuffix = "아저씨와 한국에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘. " +
                       "**이 사진의 시각적 내용(배경, 인물, 사물)이 요청된 장소(한국)와 일치하는지 먼저 판단하고, 만약 일치하지 않는다면 그 사실을 자연스럽게 언급해줘. (예: '어? 여기는 한국인 것 같지? 폴더에는 일본이라고 되어 있지만... 헤헤.')**" +
                       "날짜 정보는 정확할 경우에만 언급하고, 불확실하면 생략하거나 대략적으로 표현해줘.";

    } else if (lowerCaseMessage.includes('출사')) {
        const outingFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('출사'));
        if (outingFolders.length > 0) {
            selectedFolder = outingFolders[Math.floor(Math.random() * outingFolders.length)];
        }
        folderDescription = '아저씨와 함께 출사 나가서 찍은 사진';
        promptSuffix = "아저씨와 출사 나가서 찍은 사진에 대해 그때의 즐거움과 아저씨와의 추억을 떠올리며 말해줘.";
    } else if (lowerCaseMessage.includes('필름카메라') || lowerCaseMessage.includes('애기 필름')) {
        const filmFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('필름카메라') || key.includes('필름'));
        if (filmFolders.length > 0) {
            selectedFolder = filmFolders[Math.floor(Math.random() * filmFolders.length)];
        }
        folderDescription = '아저씨와 필름카메라로 찍은 사진';
        promptSuffix = "아저씨와 필름카메라로 찍었던 그때의 아날로그 감성과 추억을 담아 말해줘.";
    }


    if (!selectedFolder) {
        console.log(`[omoide:getOmoideReply] 매칭되는 폴더 없음. null 반환.`);
        return null; // 해당하는 사진 요청이 아님
    }

    const photoUrl = generateRandomPhotoUrl(selectedFolder);

    if (!photoUrl) {
        console.warn(`[omoide:getOmoideReply] 사진 URL 생성 실패. 텍스트 응
