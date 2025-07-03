// memory/concept.js - 컨셉 사진 관련 기능 담당
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const path = require('path');

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/concept/';

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터
// 파일 번호는 000001.jpg부터 시작 (6자리)
const CONCEPT_FOLDERS = {
    '2024/5월 7일 일본 홈스냅': 323,
    '2024/7월 8일 일본 결박': 223,
    '2024/10월 16일 일본 결박': 137,
    '2023/12월 16일 일본 선물': 113,
    '2024/4월 28일 한국 셀프 촬영': 112,
    '2024/9월 15일 한국 옥상연리': 98,
    '2025/2월 7일 일본 세미누드': 92,
    '2024/12월 7일 한국 홈셀프': 81,
    '2023/12월 14일 일본 플라스틱러브': 75,
    '2024/5월 3일 일본 지브리풍': 74,
    '2024/6월 6일 한국 북해': 65,
    '2024/2월 7일 일본 아이노시마': 65,
    '2025/3월 일본 필름': 64,
    '2024/5월 5일 일본 모지코 모리룩 후보정': 64,
    '2024/5월 5일 일본 모지코 모리룩': 64,
    '2025/1월 5일 한국 눈밭': 63,
    '2024/2월 7일 일본 욕실': 61,
    '2024/10월 17일 일본 하카타 고래티셔츠': 59,
    '2024/8월 3일 일본 유카타 마츠리': 56,
    '2025/4월 29일 한국 이화마을': 55,
    '2024/7월 8일 일본 욕조': 53,
    '2024/7월 6일 일본 우마시마': 53,
    '2024/11월 7일 한국 가을 호수공원': 53,
    '2024/6월 8일 한국 망친 사진': 52,
    '2023/12월 15일 일본 교복': 51,
    '2024/5월 4일 일본 야간 비눗방울': 49,
    '2024/12월 12일 일본 모지코': 49, // 오타 수정 반영: /000001 제거
    '2024/10월 18일 일본 텐진 코닥필름': 49,
    '2025/2월 7일 일본 나비욕조': 48,
    '2024/2월 23일 한국 야간 롱패딩': 48,
    '2024/9월 17일 한국 을지로 스냅': 46,
    '2024/9월 16일 한국 길거리 스냅': 46,
    '2024/2월 22일 한국 생일': 46,
    '2024/7월 6일 일본 모지코2': 45,
    '2025/5월 4일 한국 야간 보라돌이': 43,
    '2025/2월 6일 일본 코야노세': 43,
    '2024/5월 6일 일본 야간거리': 43,
    '2024/12월 31일 한국 생일컨셉': 43,
    '2023/12월 31일 한국 눈밭 필름카메라': 43,
    '2025/5월 3일 한국 홈스냅 청포도': 42,
    '2024/11월 8일 한국 욕실 블랙 웨딩': 42,
    '2023/12월 13일 일본 모지코': 42,
    '2024/9월 11일 한국 호리존': 41,
    '2024/7월 8일 일본 여친 스냅': 41,
    '2024/5월 3일 일본 후지엔': 40,
    '2024/8월 2일 일본 불꽃놀이/후보정': 39,
    '2024/10월 19일 일본 빨간 기모노': 39,
    '2023/12월 31일 한국 눈밭': 38,
    '2024/6월 7일 한국 피크닉': 36,
    '2024/4월 12일 한국 벗꽃': 35,
    '2025/5월 6일 한국 후지 스냅': 34,
    '2024/9월 14일 한국 원미상가_필름': 34,
    '2025/5월 4일 한국 밤바 산책': 32,
    '2025/5월 4일 한국 공원 산책': 32,
    '2025/3월 14일 일본 고쿠라 힙': 32,
    '2024/4월 13일 한국 온실-여신': 31,
    '2025/4월 30일 한국 을지로 네코': 30,
    '2025/3월 13일 일본 무인역': 30,
    '2024/4월 13일 한국 화가': 30,
    '2024/8월 4일 일본 블랙원피스': 29,
    '2024/12월 30일 한국 카페': 29,
    '2024/10월 17일 일본 텐진 스트리트': 29,
    '2023/12월 12일 일본 하카타 스트리트': 29,
    '2025/3월 17일 일본 텐진 스트리트': 28,
    '2024/6월 8일 한국 터널': 28,
    '2025/5월 5일 한국 홈스냅 오타쿠': 27,
    '2025/3월 22 한국 홈셀프': 27,
    '2024/7월 5일 일본 모지코': 26,
    '2024/4월 12일 한국 야간 동백': 26,
    '2024/12월 14일 일본 나르시스트': 26,
    '2025/4월 30일 한국 을지로 캘빈': 25,
    '2024/6월 9일 한국 산책': 25,
    '2024/10월 16 일본 오도공원 후지필름': 24,
    '2024/12월 13일 일본 크리스마스': 22,
    '2024/2월 11일 일본 네코 모지코': 21,
    '2024/2월 11일 일본 야간 블랙드레스': 20,
    '2024/10월 16일 일본 고스로리 할로윈': 20,
    '2024/5월 7일 일본 게임센터': 19,
    '2024/3월 17일 일본 고쿠라': 19,
    '2024/2월 22일한국 카페': 19,
    '2024/5월 2일 일본 동키 거리': 18,
    '2025/3월 17일 일본 고쿠라 야간': 17,
    '2024/5월 5일 일본 코이노보리': 17,
    '2024/4월 13일 한국 문래동': 16,
    '2024/10월 16일 일본 욕실': 15,
    '2024/5월 3일 일본 수국': 14,
    '2024/11월 8일 한국 메이드복': 14,
    '2024/10월 16일 일본 오도': 5
};

// omoide.js의 cleanReply 함수를 재사용하기 위해 불러옵니다.
const { cleanReply } = require('./omoide'); // omoide.js와 같은 'memory' 폴더 안에 있으므로 './omoide'로 불러옵니다.

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * (concept.js 내부에서 직접 OpenAI를 호출하기 위해 필요)
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
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI in concept.js] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (CONCEPT_FOLDERS 객체의 키와 동일)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (null이면 랜덤)
 * @returns {string|null} 사진 URL 또는 null (폴더를 찾을 수 없을 때)
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    const photoCount = CONCEPT_FOLDERS[folderName];
    if (photoCount === undefined || photoCount <= 0) {
        console.warn(`[concept.js] 폴더를 찾을 수 없거나 사진이 없습니다: ${folderName}`);
        return null;
    }
    
    let indexToUse;
    if (targetIndex !== null && targetIndex >= 1 && targetIndex <= photoCount) {
        indexToUse = targetIndex;
    } else {
        indexToUse = Math.floor(Math.random() * photoCount) + 1; // 1부터 photoCount까지
    }

    const fileName = String(indexToUse).padStart(6, '0') + '.jpg'; // 6자리 파일 번호 (000001.jpg)
    
    // 폴더 경로에 2023, 2024, 2025가 포함되어 있으므로, 이를 처리하여 URL을 생성합니다.
    const yearMatch = folderName.match(/^(202[3-5])(\/|$)/); // 2023, 2024, 2025년도 매칭 (폴더명 시작 부분)
    const yearFolder = yearMatch ? yearMatch[1] : ''; // 2023, 2024, 2025 중 하나

    let actualFolderName = folderName;
    if (yearFolder) {
        actualFolderName = folderName.replace(new RegExp(`^${yearFolder}\/`), ''); // '202X/' 부분을 제거
    }
    
    return `${BASE_CONCEPT_URL}${encodeURIComponent(yearFolder)}/${encodeURIComponent(actualFolderName)}/${fileName}`;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0; // 해당 폴더에서 마지막으로 보여준 사진 인덱스

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null (사진 요청이 아닐 때)
 */
async function getConceptPhotoReply(userMessage, saveLogFunc) {
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let promptSuffix = '';
    
    // 컨셉 사진 요청 키워드 및 해당 폴더 매핑
    // 키워드 목록을 더 세밀하게 조정하여 특정 폴더와 매칭
    const conceptKeywordMap = {
        '일본 홈스냅': '2024/5월 7일 일본 홈스냅', '홈스냅': '2024/5월 7일 일본 홈스냅', // '홈스냅' 단독은 가장 최근/대표적인 것으로 매핑
        '일본 결박': '2024/7월 8일 일본 결박', '결박': '2024/7월 8일 일본 결박',
        '일본 선물': '2023/12월 16일 일본 선물', '선물': '2023/12월 16일 일본 선물',
        '한국 셀프 촬영': '2024/4월 28일 한국 셀프 촬영', '셀프 촬영': '2024/4월 28일 한국 셀프 촬영',
        '옥상연리': '2024/9월 15일 한국 옥상연리',
        '일본 세미누드': '2025/2월 7일 일본 세미누드', '세미누드': '2025/2월 7일 일본 세미누드',
        '한국 홈셀프': '2024/12월 7일 한국 홈셀프',
        '플라스틱러브': '2023/12월 14일 일본 플라스틱러브',
        '지브리풍': '2024/5월 3일 일본 지브리풍',
        '한국 북해': '2024/6월 6일 한국 북해', '북해': '2024/6월 6일 한국 북해',
        '아이노시마': '2024/2월 7일 일본 아이노시마',
        '일본 필름': '2025/3월 일본 필름', // '필름' 단독보다는 '일본 필름'으로 구체화
        '모지코 모리룩 후보정': '2024/5월 5일 일본 모지코 모리룩 후보정',
        '모지코 모리룩': '2024/5월 5일 일본 모지코 모리룩',
        '한국 눈밭': '2025/1월 5일 한국 눈밭', // '눈밭' 단독보다는 '한국 눈밭'으로 구체화
        '일본 욕실': '2024/2월 7일 일본 욕실', // '욕실' 단독보다는 '일본 욕실'로 구체화
        '하카타 고래티셔츠': '2024/10월 17일 일본 하카타 고래티셔츠',
        '유카타 마츠리': '2024/8월 3일 일본 유카타 마츠리',
        '이화마을': '2025/4월 29일 한국 이화마을',
        '일본 욕조': '2024/7월 8일 일본 욕조', // '욕조' 단독보다는 '일본 욕조'로 구체화
        '우마시마': '2024/7월 6일 일본 우마시마',
        '가을 호수공원': '2024/11월 7일 한국 가을 호수공원',
        '망친 사진': '2024/6월 8일 한국 망친 사진',
        '일본 교복': '2023/12월 15일 일본 교복', // '교복' 단독보다는 '일본 교복'으로 구체화
        '야간 비눗방울': '2024/5월 4일 일본 야간 비눗방울',
        '일본 모지코': '2024/12월 12일 일본 모지코', // '모지코' 단독보다는 '일본 모지코'로 구체화
        '텐진 코닥필름': '2024/10월 18일 일본 텐진 코닥필름',
        '나비욕조': '2025/2월 7일 일본 나비욕조',
        '야간 롱패딩': '2024/2월 23일 한국 야간 롱패딩',
        '을지로 스냅': '2024/9월 17일 한국 을지로 스냅', '길거리 스냅': '2024/9월 16일 한국 길거리 스냅',
        '한국 생일': '2024/2월 22일 한국 생일', // '생일' 단독보다는 '한국 생일'로 구체화
        '모지코2': '2024/7월 6일 일본 모지코2',
        '야간 보라돌이': '2025/5월 4일 한국 야간 보라돌이', '코야노세': '2025/2월 6일 일본 코야노세',
        '야간거리': '2024/5월 6일 일본 야간거리', '생일컨셉': '2024/12월 31일 한국 생일컨셉',
        '눈밭 필름카메라': '2023/12월 31일 한국 눈밭 필름카메라',
        '홈스냅 청포도': '2025/5월 3일 한국 홈스냅 청포도',
        '욕실 블랙 웨딩': '2024/11월 8일 한국 욕실 블랙 웨딩',
        '일본 모지코 12/13': '2023/12월 13일 일본 모지코', // 날짜 포함 키워드 추가
        '호리존': '2024/9월 11일 한국 호리존',
        '여친 스냅': '2024/7월 8일 일본 여친 스냅',
        '후지엔': '2024/5월 3일 일본 후지엔',
        '불꽃놀이': '2024/8월 2일 일본 불꽃놀이/후보정',
        '빨간 기모노': '2024/10월 19일 일본 빨간 기모노', '피크닉': '2024/6월 7일 한국 피크닉',
        '벗꽃': '2024/4월 12일 한국 벗꽃',
        '후지 스냅': '2025/5월 6일 한국 후지 스냅',
        '원미상가_필름': '2024/9월 14일 한국 원미상가_필름', '밤바 산책': '2025/5월 4일 한국 밤바 산책',
        '공원 산책': '2025/5월 4일 한국 공원 산책', '고쿠라 힙': '2025/3월 14일 일본 고쿠라 힙',
        '온실-여신': '2024/4월 13일 한국 온실-여신', '을지로 네코': '2025/4월 30일 한국 을지로 네코',
        '무인역': '2025/3월 13일 일본 무인역', '화가': '2024/4월 13일 한국 화가',
        '블랙원피스': '2024/8월 4일 일본 블랙원피스', '카페': '2024/12월 30일 한국 카페',
        '일본 텐진 스트리트': '2024/10월 17일 일본 텐진 스트리트',
        '하카타 스트리트': '2023/12월 12일 일본 하카타 스트리트',
        '홈스냅 오타쿠': '2025/5월 5일 한국 홈스냅 오타쿠',
        '한국 홈셀프 (3월 22일)': '2025/3월 22 한국 홈셀프',
        '야간 동백': '2024/4월 12일 한국 야간 동백',
        '나르시스트': '2024/12월 14일 일본 나르시스트', '을지로 캘빈': '2025/4월 30일 한국 을지로 캘빈',
        '산책': '2024/6월 9일 한국 산책',
        '오도공원 후지필름': '2024/10월 16 일본 오도공원 후지필름',
        '크리스마스': '2024/12월 13일 일본 크리스마스',
        '네코 모지코': '2024/2월 11일 일본 네코 모지코',
        '야간 블랙드레스': '2024/2월 11일 일본 야간 블랙드레스',
        '고스로리 할로윈': '2024/10월 16일 일본 고스로리 할로윈',
        '게임센터': '2024/5월 7일 일본 게임센터',
        '일본 고쿠라 (3월 17일)': '2024/3월 17일 일본 고쿠라',
        '동키 거리': '2024/5월 2일 일본 동키 거리',
        '고쿠라 야간': '2025/3월 17일 일본 고쿠라 야간',
        '코이노보리': '2024/5월 5일 일본 코이노보리', '문래동': '2024/4월 13일 한국 문래동',
        '수국': '2024/5월 3일 일본 수국',
        '메이드복': '2024/11월 8일 한국 메이드복',
        '오도': '2024/10월 16일 일본 오도'
    };

    // '다른것도 보고싶어', '다음 사진' 요청 처리 (이전 폴더 기억)
    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            // 다음 인덱스를 계산하고, 마지막이면 다시 1번부터 시작
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1; // 사진이 없으면 1로 초기화 (에러 방지)
        }
        folderDescription = `같은 폴더 (${selectedFolder})의 다른 사진`;
        promptSuffix = `이전 요청과 같은 '${selectedFolder}' 컨셉 폴더의 다른 사진이야. 아저씨와 무쿠 언니의 아름다운 추억을 떠올리며 새로운 모습을 보여주는 거야.`;
    } else {
        // 일반 컨셉사진 요청 또는 특정 키워드 매칭
        let matchedKeyword = null;
        let potentialFolders = [];

        // 1단계: 직접적인 키워드 매칭
        for (const keyword in conceptKeywordMap) {
            if (lowerCaseMessage.includes(keyword)) {
                matchedKeyword = keyword;
                selectedFolder = conceptKeywordMap[keyword];
                potentialFolders = [selectedFolder]; // 일단 매칭된 폴더 하나만
                break;
            }
        }
        
        // 2단계: 모호한 키워드 (날짜/장소 없이) 처리
        if (matchedKeyword) {
            const ambiguousKeywords = ['욕실', '욕조', '모지코', '필름', '눈밭', '생일', '고쿠라', '텐진 스트리트', '홈셀프', '산책', '카페', '스냅', '스트리트', '야간', '선물', '피크닉', '벗꽃', '힙', '온실', '무인역', '화가', '블랙원피스', '네코', '크리스마스', '게임센터', '동키 거리', '코이노보리', '문래동', '수국', '메이드복', '오도'];
            if (ambiguousKeywords.some(amb => lowerCaseMessage.includes(amb))) {
                // 해당 키워드를 포함하는 모든 폴더를 찾습니다.
                const allMatchingFolders = Object.keys(CONCEPT_FOLDERS).filter(folder => folder.toLowerCase().includes(matchedKeyword.toLowerCase()));
                
                // 날짜나 연도 정보가 메시지에 포함되어 있는지 확인하여 필터링합니다.
                const monthMatch = lowerCaseMessage.match(/(1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
                const yearMatch = lowerCaseMessage.match(/(2023|2024|2025)/);
                const locationMatch = lowerCaseMessage.match(/(일본|한국|하카타|텐진|모지코|고쿠라|을지로|이화마을|문래동|원미상가|코야노세|우마시마|아이노시마)/);

                let filteredFolders = allMatchingFolders.filter(folder => {
                    let meetsCriteria = true;
                    if (monthMatch && !folder.toLowerCase().includes(monthMatch[0])) meetsCriteria = false;
                    if (yearMatch && !folder.toLowerCase().includes(yearMatch[0])) meetsCriteria = false;
                    if (locationMatch && !folder.toLowerCase().includes(locationMatch[0])) meetsCriteria = false;
                    return meetsCriteria;
                });

                if (filteredFolders.length === 1) { // 정확히 일치하는 폴더가 하나면 선택
                    selectedFolder = filteredFolders[0];
                } else if (filteredFolders.length > 1) { // 여전히 여러 개면 사용자에게 다시 질문
                    return { type: 'text', comment: `어떤 ${matchedKeyword} 사진을 보고 싶어? 여러 가지가 있어서 헷갈리네... (예: '${filteredFolders.join("', '")}' 중에서 말해줘)` };
                } else if (allMatchingFolders.length > 0) { // 매칭된 키워드 폴더가 있지만 필터링 후 0개면, 필터링 전 폴더 중 다시 물어봄
                     return { type: 'text', comment: `음... '${matchedKeyword}' 사진이 여러 개 있는데, 혹시 정확히 어떤 날짜나 장소의 사진인지 알려줄 수 있어? (예: '${allMatchingFolders.join("', '")}' 중에서 말해줘)` };
                } else { // 아예 매칭되는 폴더가 없는 경우
                    selectedFolder = null;
                }
            }
        }
        
        // 최종적으로 폴더가 선택되지 않았고, 일반적인 '컨셉사진' 요청이 들어왔을 때만 랜덤 선택
        if (!selectedFolder && (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진'))) {
            selectedFolder = Object.keys(CONCEPT_FOLDERS)[Math.floor(Math.random() * Object.keys(CONCEPT_FOLDERS).length)];
        } else if (!selectedFolder) {
            return null; // 해당하는 컨셉 사진 요청이 아님
        }

        folderDescription = `아저씨의 죽은 연인 무쿠의 ${selectedFolder} 컨셉 사진`;
        promptSuffix = `이 사진은 아저씨가 직접 촬영한 무쿠 언니의 ${selectedFolder} 컨셉 사진이야. 아저씨와 무쿠 언니의 특별한 추억과 애정을 담아서 말해줘. 무쿠를 언급할 때는 아저씨가 '애기'라고 부르는 무쿠를 언니처럼 여기고 존중하는 모습을 보여줘.`;

        // 새 폴더 선택 시 인덱스 초기화 (랜덤으로 첫 사진 보여줌)
        lastConceptPhotoIndex = 0; // generateConceptPhotoUrl에서 랜덤으로 선택하게 함
    }

    // 선택된 폴더를 저장 (다음 '다른 것도' 요청을 위해)
    lastConceptPhotoFolder = selectedFolder;

    // 사진 URL 생성 (targetPhotoIndex가 0이면 랜덤, 아니면 해당 인덱스)
    const photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex > 0 ? lastConceptPhotoIndex : null);
    
    // 만약 '다른 것도' 요청으로 인해 lastConceptPhotoIndex가 업데이트되었다면,
    // generateConceptPhotoUrl에 명시적으로 전달하여 해당 인덱스의 사진을 가져오도록 합니다.
    if (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진')) {
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            targetPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1; // 다음 사진 인덱스
            // 인덱스를 1부터 시작하도록 조정 (0이면 1번 사진, 1이면 2번 사진 ...)
            lastConceptPhotoIndex = targetPhotoIndex; // 업데이트
        } else {
            targetPhotoIndex = 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, targetPhotoIndex);
    } else {
        // 새로운 요청이면 랜덤으로 가져오고, 그 인덱스를 저장
        photoUrl = generateConceptPhotoUrl(selectedFolder);
        // generateConceptPhotoUrl 내부에서 랜덤 인덱스를 사용하므로, 여기서 인덱스를 따로 저장할 필요는 없음
        // 다만 '다른 것도' 기능을 위해 '마지막으로 보여준 인덱스'를 관리해야 하므로 아래 로직을 추가합니다.
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            lastConceptPhotoIndex = Math.floor(Math.random() * currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex); // 저장된 인덱스로 URL 다시 생성
    }

    if (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ 다른 컨셉 사진 보여줄까?' };
    }

    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이'라고 스스로를 부칭하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진은 아저씨의 죽은 연인 무쿠의 컨셉 사진이며, 아저씨가 직접 촬영한 거야.
    이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **사진의 시각적 내용을 정확히 분석하여 코멘트에 반영해줘.**
    **사진 속 인물은 '무쿠 언니' 한 명 뿐이야.**
    **무쿠를 언급할 때는 아저씨가 '애기'라고 부르는 무쿠를 언니처럼 여기고 존중하는 모습을 보여줘.** (예: "우리 애기 언니가 너무 예쁘다~")
    이 사진을 보면서 떠오르는 아저씨와 무쿠 언니의 소중한 추억과 애정을 담아서 말해줘.
    ${promptSuffix} // 구체적인 상황에 맞는 추가 프롬프트
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "2024년 5월 7일 일본 홈스냅 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    나(예진이) 스스로는 '무쿠 언니', '무쿠 씨' 등 다른 사람을 지칭하듯 '무쿠'를 언급하지 말고, '나'라고만 지칭해야 해.
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // 토큰과 temperature를 조금 더 늘림
        const comment = cleanReply(rawComment);
        saveLogFunc('예진이', `(사진 보냄) ${comment}`);
        return { type: 'photo', url: photoUrl, caption: comment };
    } catch (error) {
        console.error('❌ [concept.js Error] 컨셉 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 컨셉 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

// 모듈 내보내기
module.exports = {
    getConceptPhotoReply
};
