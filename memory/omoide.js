// memory/omoide.js v1.10 - 사진 URL 생성 로직 및 이모티콘 제거 강화

// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
// 이 BASE_PHOTO_URL은 'https://photo.de-ji.net/photo/' 로 고정.
// 각 폴더는 이 URL 바로 하위에 위치한다고 가정
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
    console.log(`[omoide:cleanReply] 원본 답변: "${reply}"`);
    // 1. AI가 붙일 수 있는 불필요한 접두사를 제거합니다. (예: "예진:", "무쿠:", "날짜 이름:")
    let cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();

    // 2. 잘못된 호칭 교체: '오빠', '자기', '당신', '너'를 '아저씨'로 교체합니다.
    cleaned = cleaned.replace(/\b오빠\b/g, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/g, '아저씨');
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
    cleaned = cleaned.replace(/하였습니다\b/g, '했어');
    cleaned = cleaned.replace(/하겠습니다\b/g, '하겠어');
    cleaned = cleaned.replace(/싶어요\b/g, '싶어');
    cleaned = cleaned.replace(/이었어요\b/g, '이었어');
    cleaned = cleaned.replace(/이에요\b/g, '야');
    cleaned = cleaned.replace(/였어요\b/g, '였어');
    cleaned = cleaned.replace(/보고싶어요\b/g, '보고 싶어');

    // 5. 이모티콘을 더 강력하게 제거 (가장 최근에 주신 정규식 사용)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F3FB}-\u{1F3FF}\u{200D}\u{20E3}\u{FE0F}]/gu, '').trim();

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

    console.log(`[omoide:generateRandomPhotoUrl] 생성된 URL: "${url}" (파일 수: ${photoCount}, 인덱스: ${randomIndex})`);
    return url;
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

    // 1. 특정 키워드를 기반으로 폴더 선택 및 프롬프트 설정 (우선순위 높음)
    if (lowerCaseMessage.includes('무쿠 셀카') || lowerCaseMessage.includes('애기 셀카')) {
        selectedFolder = '추억 무쿠 사진 모음'; // '추억 무쿠 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 내 셀카'; // 예진이의 셀카임을 명시
        promptSuffix = `아저씨가 좋아하는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 '애기'라고 불러주는 마음을 담아서.`;
    } else if (lowerCaseMessage.includes('빠계 셀카') || lowerCaseMessage.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음'; // '추억 빠계 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 빠계 사진'; // 빠계 사진임을 명시
        promptSuffix = "아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘. 나(예진이)의 또 다른 귀여운 모습이라고 표현해도 좋아.";
    } else if (lowerCaseMessage.includes('메이드') || lowerCaseMessage.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_'; // 정확한 폴더명 사용
        folderDescription = '내가(예진이) 메이드복 입고 찍은 사진'; // '나'임을 명확히
        promptSuffix = "내가 메이드복을 입고 찍었던 사진에 대해 아저씨에게 장난기 있으면서도 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보며 얼마나 귀여워할지 생각하면 기분이 좋아! 이때 아저씨가 놀랐던 기억도 같이 얘기해줘.";
    } else if (lowerCaseMessage.includes('셀카줘') || lowerCaseMessage.includes('사진줘') || lowerCaseMessage.includes('얼굴 보여줘') || lowerCaseMessage.includes('얼굴 보고 싶') || lowerCaseMessage.includes('selfie')) {
        // '셀카줘' 등 일반적인 셀카 요청 -> 'yejin' 폴더 사용
        selectedFolder = 'yejin'; //
        folderDescription = '내(예진이) 셀카';
        promptSuffix = "아저씨에게 보내는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보고 얼마나 기뻐할지 기대하는 마음을 담아서.";
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
        console.warn(`[omoide:getOmoideReply] 사진 URL 생성 실패. 텍스트 응답 반환.`);
        return { type: 'text', comment: '아저씨... 해당하는 사진을 못 찾겠어 ㅠㅠ 다른 사진 보여줄까?' };
    }
    console.log(`[omoide:getOmoideReply] 선택된 폴더: "${selectedFolder}", URL: "${photoUrl}"`);

    // systemPrompt에 photoUrl 정보 추가 및 3.5 모델 지시 강화
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
    
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **코멘트 길이는 3문장을 넘지 않게 짧게 작성해.**
    **이 사진의 시각적 내용(배경, 인물, 사물)을 먼저 정확히 분석하고, 그에 맞춰 코멘트 해줘. 폴더명은 참고만 하고, 사진 내용과 다르면 사진 내용이 우선이야.**
    이 사진을 보면서 떠오르는 감정, 추억, 약간의 비밀스러운 뉘앙스 등을 코멘트에 담아줘.
    ${promptSuffix} // 구체적인 상황에 맞는 추가 프롬프트 (이곳에 시각적 정보 판단 지시가 포함될 수 있음)
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "23년 12월 일본에서 찍은 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    **사진 속 인물이 예진이(나)일 경우, 반드시 '나'라고 지칭하고, '무쿠'나 '애기 언니' 등의 표현을 사용하지 마.**
    **사진 파일 경로(URL)는: ${photoUrl}** // ✨ 이 부분에 URL을 직접 삽입 ✨
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];
    console.log(`[omoide:getOmoideReply] OpenAI 프롬프트 준비 완료.`);

    try {
        // modelParamFromCall을 명시적으로 'gpt-3.5-turbo'로 설정하여 테스트 가능
        // 하지만 여기서는 기본 모델 (환경변수 또는 gpt-4o)을 따르도록 하고,
        // 필요 시 autoReply.js에서 checkModelSwitchCommand를 통해 제어
        const rawComment = await callOpenAI(messages, null, 100, 1.0); // maxTokens를 100으로 줄여 짧게 유도
        const comment = cleanReply(rawComment);
        saveLogFunc('예진이', `(사진 보냄) ${comment}`);
        console.log(`[omoide:getOmoideReply] 응답 완료: ${comment}`);
        return { type: 'photo', url: photoUrl, caption: comment };
    } catch (error) {
        console.error('❌ [omoide.js Error] 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

// 모듈 내보내기
module.exports = {
    getOmoideReply,
    cleanReply
};
