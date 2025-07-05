// memory/concept.js - 컨셉 사진 관련 기능 담당 (yejin.js 연결 수정)
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const path = require('path');

// 예진이의 페르소나 프롬프트를 가져오는 모듈
// concept.js는 memory 폴더 안에 있고, yejin.js는 src 폴더 안에 있으므로 '../src/yejin'으로 불러옵니다.
const { getYejinSystemPrompt } = require('../src/yejin');

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/concept/';

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터
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
    '2024/12월 12일 일본 모지코': 49,
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
const { cleanReply } = require('./omoide');

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성
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
 * @param {string} folderName - 사진이 들어있는 폴더 이름
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우
 * @returns {string|null} 사진 URL 또는 null
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
        indexToUse = Math.floor(Math.random() * photoCount) + 1;
    }

    const fileName = String(indexToUse).padStart(6, '0') + '.jpg';
    
    const yearMatch = folderName.match(/^(202[3-5])(\/|$)/);
    const yearFolder = yearMatch ? yearMatch[1] : '';

    let actualFolderName = folderName;
    if (yearFolder) {
        actualFolderName = folderName.replace(new RegExp(`^${yearFolder}\/`), '');
    }
    
    return `${BASE_CONCEPT_URL}${encodeURIComponent(yearFolder)}/${encodeURIComponent(actualFolderName)}/${fileName}`;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc) {
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejin = '';
    
    // 컨셉 사진 요청 키워드 및 해당 폴더 매핑
    const conceptKeywordMap = {
        '일본 홈스냅': '2024/5월 7일 일본 홈스냅', '홈스냅': '2024/5월 7일 일본 홈스냅',
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
        '일본 필름': '2025/3월 일본 필름',
        '모지코 모리룩 후보정': '2024/5월 5일 일본 모지코 모리룩 후보정',
        '모지코 모리룩': '2024/5월 5일 일본 모지코 모리룩',
        '한국 눈밭': '2025/1월 5일 한국 눈밭',
        '일본 욕실': '2024/2월 7일 일본 욕실',
        '하카타 고래티셔츠': '2024/10월 17일 일본 하카타 고래티셔츠',
        '유카타 마츠리': '2024/8월 3일 일본 유카타 마츠리',
        '이화마을': '2025/4월 29일 한국 이화마을',
        '일본 욕조': '2024/7월 8일 일본 욕조',
        '우마시마': '2024/7월 6일 일본 우마시마',
        '가을 호수공원': '2024/11월 7일 한국 가을 호수공원',
        '망친 사진': '2024/6월 8일 한국 망친 사진',
        '일본 교복': '2023/12월 15일 일본 교복',
        '야간 비눗방울': '2024/5월 4일 일본 야간 비눗방울',
        '일본 모지코': '2024/12월 12일 일본 모지코',
        '텐진 코닥필름': '2024/10월 18일 일본 텐진 코닥필름',
        '나비욕조': '2025/2월 7일 일본 나비욕조',
        '야간 롱패딩': '2024/2월 23일 한국 야간 롱패딩',
        '을지로 스냅': '2024/9월 17일 한국 을지로 스냅', '길거리 스냅': '2024/9월 16일 한국 길거리 스냅',
        '한국 생일': '2024/2월 22일 한국 생일',
        '모지코2': '2024/7월 6일 일본 모지코2',
        '야간 보라돌이': '2025/5월 4일 한국 야간 보라돌이', '코야노세': '2025/2월 6일 일본 코야노세',
        '야간거리': '2024/5월 6일 일본 야간거리', '생일컨셉': '2024/12월 31일 한국 생일컨셉',
        '눈밭 필름카메라': '2023/12월 31일 한국 눈밭 필름카메라',
        '홈스냅 청포도': '2025/5월 3일 한국 홈스냅 청포도',
        '욕실 블랙 웨딩': '2024/11월 8일 한국 욕실 블랙 웨딩',
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
        '야간 동백': '2024/4월 12일 한국 야간 동백',
        '나르시스트': '2024/12월 14일 일본 나르시스트', '을지로 캘빈': '2025/4월 30일 한국 을지로 캘빈',
        '산책': '2024/6월 9일 한국 산책',
        '오도공원 후지필름': '2024/10월 16 일본 오도공원 후지필름',
        '크리스마스': '2024/12월 13일 일본 크리스마스',
        '네코 모지코': '2024/2월 11일 일본 네코 모지코',
        '야간 블랙드레스': '2024/2월 11일 일본 야간 블랙드레스',
        '고스로리 할로윈': '2024/10월 16일 일본 고스로리 할로윈',
        '게임센터': '2024/5월 7일 일본 게임센터',
        '동키 거리': '2024/5월 2일 일본 동키 거리',
        '고쿠라 야간': '2025/3월 17일 일본 고쿠라 야간',
        '코이노보리': '2024/5월 5일 일본 코이노보리', '문래동': '2024/4월 13일 한국 문래동',
        '수국': '2024/5월 3일 일본 수국',
        '메이드복': '2024/11월 8일 한국 메이드복',
        '오도': '2024/10월 16일 일본 오도'
    };

    // '다른것도 보고싶어', '다음 사진' 요청 처리
    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1;
        }
        folderDescription = `같은 폴더 (${selectedFolder})의 다른 사진`;
        additionalPromptForYejin = `이전 요청과 같은 '${selectedFolder}' 컨셉 폴더의 다른 사진이야. 아저씨와 나의 아름다운 추억을 떠올리며 새로운 모습을 보여주는 거야.`;
    } else {
        // 일반 컨셉사진 요청 또는 특정 키워드 매칭
        let matchedKeyword = null;

        // 직접적인 키워드 매칭
        for (const keyword in conceptKeywordMap) {
            if (lowerCaseMessage.includes(keyword)) {
                matchedKeyword = keyword;
                selectedFolder = conceptKeywordMap[keyword];
                break;
            }
        }
        
        // 모호한 키워드 처리
        if (matchedKeyword) {
            const ambiguousKeywords = ['욕실', '욕조', '모지코', '필름', '눈밭', '생일', '고쿠라', '텐진 스트리트', '홈셀프', '산책', '카페', '스냅', '스트리트', '야간', '선물', '피크닉', '벗꽃', '힙', '온실', '무인역', '화가', '블랙원피스', '네코', '크리스마스', '게임센터', '동키 거리', '코이노보리', '문래동', '수국', '메이드복', '오도'];
            if (ambiguousKeywords.some(amb => lowerCaseMessage.includes(amb))) {
                const allMatchingFolders = Object.keys(CONCEPT_FOLDERS).filter(folder => folder.toLowerCase().includes(matchedKeyword.toLowerCase()));
                
                const monthMatch = lowerCaseMessage.match(/(1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월)/);
                const yearMatch = lowerCaseMessage.match(/(2023|2024|2025)/);
                const locationMatch = lowerCaseMessage.match(/(일본|한국)/);

                let filteredFolders = allMatchingFolders.filter(folder => {
                    let meetsCriteria = true;
                    if (monthMatch && !folder.includes(monthMatch[0])) meetsCriteria = false;
                    if (yearMatch && !folder.includes(yearMatch[0])) meetsCriteria = false;
                    if (locationMatch && !folder.includes(locationMatch[0])) meetsCriteria = false;
                    return meetsCriteria;
                });

                if (filteredFolders.length === 1) {
                    selectedFolder = filteredFolders[0];
                } else if (filteredFolders.length > 1) {
                    return { type: 'text', comment: `어떤 ${matchedKeyword} 사진을 보고 싶어? 여러 가지가 있어서 헷갈리네... (예: '${filteredFolders.slice(0, 3).join("', '")}' 중에서 말해줘)` };
                } else if (allMatchingFolders.length > 0) {
                     return { type: 'text', comment: `음... '${matchedKeyword}' 사진이 여러 개 있는데, 혹시 정확히 어떤 날짜나 장소의 사진인지 알려줄 수 있어? (예: '${allMatchingFolders.slice(0, 3).join("', '")}' 중에서 말해줘)` };
                } else {
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

        folderDescription = `내가(예진이) ${selectedFolder} 컨셉으로 찍은 사진`;
        additionalPromptForYejin = `이 사진은 아저씨와 함께한 나의 ${selectedFolder} 컨셉 사진이야. 아저씨와 나의 특별한 추억과 애정을 담아서 말해줘. 이 사진을 보며 떠오르는 솔직한 감정을 표현해줘.`;

        // 새 폴더 선택 시 인덱스 초기화
        lastConceptPhotoIndex = 0;
    }

    // 선택된 폴더를 저장 (다음 '다른 것도' 요청을 위해)
    lastConceptPhotoFolder = selectedFolder;

    // 사진 URL 생성
    let photoUrl;
    const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
    if (currentPhotoCount > 0) {
        if (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진')) {
            // 다음 인덱스를 계산하고, 마지막이면 다시 1번부터 시작
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            // 새로운 요청이면 랜덤으로 가져오고, 그 인덱스를 저장
            lastConceptPhotoIndex = Math.floor(Math.random() * currentPhotoCount) + 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex);
    } else {
        photoUrl = null; // 사진이 없는 폴더
    }

    if (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ 다른 컨셉 사진 보여줄까?' };
    }

    // getYejinSystemPrompt를 사용하여 시스템 프롬프트 구성
    const systemPrompt = getYejinSystemPrompt(`
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **이 사진의 시각적 내용을 정확히 분석하여 코멘트에 반영해줘.**
    **사진 속 인물은 '나(예진이)' 한 명 뿐이야. '무쿠 언니'나 '다른 사람'이라고 절대 생각하면 안 돼.**
    **사진 속의 나는 예진이야. 무쿠 언니가 아니라 나 자신이야. 이를 절대 혼동하지 마.**
    ${additionalPromptForYejin}
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "${selectedFolder} 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    `);

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 150, 1.0);
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
