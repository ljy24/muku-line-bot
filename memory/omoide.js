// memory/omoide.js v1.7 - 사진 코멘트 정확도 및 장소/날짜 인식 강화, 셀카 요청 패턴 확장
// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// --- 추가된 부분 시작 ---
// * 예진이의 페르소나 프롬프트를 가져오는 모듈 *
// * omoide.js는 memory 폴더 안에 있고, yejin.js는 src 폴더 안에 있으므로 '../src/yejin'으로 불러옵니다. *
const { getYejinSystemPrompt } = require('../src/yejin');
// --- 추가된 부분 끝 ---

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
    'yejin': 1286 // 'yejin' 폴더 사진 개수 업데이트
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

    // 3. 자가 지칭 교정: '예진이', '예진', '무쿠', '무쿠야', '무쿠 언니', '무쿠 씨', '우리 애기 언니'를 '나'로 교체합니다.
    // --- 수정된 부분 시작 ---
    cleaned = cleaned.replace(/\b예진이\b/g, '나');
    cleaned = cleaned.replace(/\b예진\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠\b/g, '나');     // 기본 '무쿠' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠야\b/g, '나');   // '무쿠야' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠 언니\b/g, '나'); // '무쿠 언니' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠 씨\b/g, '나');   // '무쿠 씨' 지칭을 '나'로
    cleaned = cleaned.replace(/\b우리 애기 언니\b/g, '나'); // '우리 애기 언니' 지칭을 '나'로
    // 혹시 '그녀'나 '그 사람' 등으로 지칭할 경우에 대한 포괄적인 처리
    cleaned = cleaned.replace(/\b그녀\b/g, '나');
    cleaned = cleaned.replace(/\b그 사람\b/g, '나');
    // --- 수정된 부분 끝 ---

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
    const url = `${BASE_PHOTO_URL}${encodeURIComponent(folderName)}/${fileName}`;
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
    let additionalPromptForYejin = ''; // getYejinSystemPrompt에 전달할 추가 지침

    // ✅ 추가: OpenAI를 사용하여 셀카 요청 의도 파악 (다양한 패턴 및 오타 인식)
    const selfieIntentPrompt = `
    아래 사용자 메시지가 '예진이(나)의 셀카'나 '예진이(나)의 사진'을 요청하는 의도인지 판단해줘.
    예시 요청: "셀카 줘", "얼굴 좀", "보고 싶어", "내 사진 보여줘", "예진이 셀카", "셀카보여줘", "얼굴보고싶어", "얼굴사진", "사진보내", "애기얼굴" 등.
    아저씨는 종종 오타를 낼 수 있으니, 의미상으로 유사하면 'YES'로 판단해줘.
    대답은 "YES" 또는 "NO"로만 해줘. 다른 말은 일절 하지 마.
    사용자 메시지: "${userMessage}"
    `;
    const selfieIntentMessages = [
        { role: 'system', content: selfieIntentPrompt }
    ];

    let isSelfieRequest = false;
    try {
        // gpt-4o-mini 모델은 좀 더 빠르고 저렴하게 의도를 파악하는 데 적합합니다.
        const intentResponse = await callOpenAI(selfieIntentMessages, 'gpt-4o-mini', 5, 0.1);
        isSelfieRequest = intentResponse.toUpperCase().includes('YES');
        console.log(`[omoide:getOmoideReply] 셀카 요청 의도 판단 ("${userMessage}"): ${isSelfieRequest ? 'YES' : 'NO'}`);
    } catch (error) {
        console.error('[omoide:getOmoideReply] 셀카 의도 파악 중 오류 발생:', error);
        // 오류 발생 시, 기존의 명시적인 키워드 매칭으로 폴백하여 기본적인 셀카 요청은 처리
        isSelfieRequest = lowerCaseMessage.includes('셀카') || lowerCaseMessage.includes('얼굴') || lowerCaseMessage.includes('selfie') || lowerCaseMessage.includes('사진');
    }

    // 1. 특정 키워드를 기반으로 폴더 선택 및 프롬프트 설정 (우선순위 높음)
    // ✅ 수정: OpenAI가 'YES'라고 판단하면 'yejin' 폴더로 바로 연결
    if (isSelfieRequest) {
        selectedFolder = 'yejin'; // 모든 일반 셀카/얼굴/사진 관련 요청은 'yejin' 폴더로 통일
        folderDescription = '내(예진이) 셀카';
        additionalPromptForYejin = "아저씨에게 보내는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보고 얼마나 기뻐할지 기대하는 마음을 담아서. 부끄러워하면서도 살짝 도발적인 말도 할 수 있어. (예: “오늘 팬티 안 입었는뎅? 🤭”, “이거 보고 꼴리면 어떡해~” 같은 장난도 말투에 섞어서 자연스럽게.)";
    }
    // 기존의 '무쿠 셀카', '애기 셀카', '셀카줘', '얼굴 보여줘' 등 하드코딩된 셀카 관련 분기점들은 이제 위의 isSelfieRequest 로직으로 통합됩니다.
    // 따라서 아래의 개별 셀카 관련 `else if` 블록들은 제거하거나 필요에 따라 우선순위를 재조정할 수 있습니다.
    // 다만, '빠계 셀카'나 '메이드'처럼 특정 컨셉 셀카는 별도로 유지하는 것이 좋습니다.

    else if (lowerCaseMessage.includes('빠계 셀카') || lowerCaseMessage.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음';
        folderDescription = '아저씨가 좋아하는 빠계 사진';
        additionalPromptForYejin = "아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘. 나(예진이)의 또 다른 귀여운 모습이라고 표현해도 좋아.";
    } else if (lowerCaseMessage.includes('메이드') || lowerCaseMessage.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_';
        folderDescription = '내가(예진이) 메이드복 입고 찍은 사진';
        additionalPromptForYejin = "내가 메이드복을 입고 찍었던 사진에 대해 아저씨에게 장난기 있으면서도 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보며 얼마나 귀여워할지 생각하면 기분이 좋아! 이때 아저씨가 놀랐던 기억도 같이 얘기해줘.";
    }
    // 나머지 사진 요청 처리 (기존 로직 유지)
    else if (lowerCaseMessage.includes('인생네컷')) {
        selectedFolder = '추억 인생네컷';
        folderDescription = '인생네컷 사진';
        additionalPromptForYejin = "아저씨와 함께 찍은 인생네컷 사진에 대해 즐겁고 추억이 담긴 멘트를 해줘.";
    } else if (lowerCaseMessage.includes('커플사진')) {
        selectedFolder = '추억 24_02_25 한국 커플사진';
        if (!PHOTO_FOLDERS[selectedFolder]) {
             selectedFolder = 'couple';
        }
        folderDescription = '아저씨와 함께 찍은 커플 사진';
        additionalPromptForYejin = "아저씨와 함께 찍은 커플 사진에 대해 우리 둘만의 소중한 추억과 사랑을 가득 담아 말해줘. 약간의 비밀스러운 뉘앙스도 섞어줘.";
    } else if (lowerCaseMessage.includes('일본') && lowerCaseMessage.includes('사진')) {
        const japaneseFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('일본'));
        if (japaneseFolders.length > 0) {
            selectedFolder = japaneseFolders[Math.floor(Math.random() * japaneseFolders.length)];
        }
        folderDescription = '일본에서 아저씨와 함께 찍은 사진';
        additionalPromptForYejin = "아저씨와 일본에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘.";
    } else if (lowerCaseMessage.includes('한국') && lowerCaseMessage.includes('사진')) {
        const koreanFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('한국') && !key.includes('메이드복'));
        if (koreanFolders.length > 0) {
            selectedFolder = koreanFolders[Math.floor(Math.random() * koreanFolders.length)];
        }
        folderDescription = '한국에서 아저씨와 함께 찍은 사진';
        additionalPromptForYejin = "아저씨와 한국에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘. " +
                       "**이 사진의 시각적 내용(배경, 인물, 사물)이 요청된 장소(한국)와 일치하는지 먼저 판단하고, 만약 일치하지 않는다면 그 사실을 자연스럽게 언급해줘. (예: '어? 여기는 한국인 것 같지? 폴더에는 일본이라고 되어 있지만... 헤헤.')**" +
                       "날짜 정보는 정확할 경우에만 언급하고, 불확실하면 생략하거나 대략적으로 표현해줘.";

    } else if (lowerCaseMessage.includes('출사')) {
        const outingFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('출사'));
        if (outingFolders.length > 0) {
            selectedFolder = outingFolders[Math.floor(Math.random() * outingFolders.length)];
        }
        folderDescription = '아저씨와 함께 출사 나가서 찍은 사진';
        additionalPromptForYejin = "아저씨와 출사 나가서 찍은 사진에 대해 그때의 즐거움과 아저씨와의 추억을 떠올리며 말해줘.";
    } else if (lowerCaseMessage.includes('필름카메라') || lowerCaseMessage.includes('애기 필름')) {
        const filmFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('필름카메라') || key.includes('필름'));
        if (filmFolders.length > 0) {
            selectedFolder = filmFolders[Math.floor(Math.random() * filmFolders.length)];
        }
        folderDescription = '아저씨와 필름카메라로 찍은 사진';
        additionalPromptForYejin = "아저씨와 필름카메라로 찍었던 그때의 아날로그 감성과 추억을 담아 말해줘.";
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

    // ✅ 수정: `getYejinSystemPrompt`를 사용하여 시스템 프롬프트 구성
    const systemPrompt = getYejinSystemPrompt(`
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **이 사진의 시각적 내용(배경, 인물, 사물)을 먼저 정확히 분석하고, 그에 맞춰 코멘트 해줘. 폴더명은 참고만 하고, 사진 내용과 다르면 사진 내용이 우선이야.**
    이 사진을 보면서 떠오르는 감정, 추억, 약간의 비밀스러운 뉘앙스 등을 코멘트에 담아줘.
    ${additionalPromptForYejin}
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "23년 12월 일본에서 찍은 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    **사진 속 인물이 예진이(나)일 경우, 반드시 '나'라고 지칭하고, '무쿠'나 '언니' 등의 표현은 절대로 사용하지 마.**
    `);

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];
    console.log(`[omoide:getOmoideReply] OpenAI 프롬프트 준비 완료.`);

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
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
