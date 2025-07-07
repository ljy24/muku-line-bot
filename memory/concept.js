// memory/concept.js v1.13 - 컨셉 사진 완전 최적화: 쿨다운 제거 및 즉시 응답

// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const path = require('path');

// 예진이의 페르소나 프롬프트를 가져오는 모듈
const { getYejinSystemPrompt } = require('../src/yejin');

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/concept/';

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터
const CONCEPT_FOLDERS = {
    '2023/12월 12일 일본 하카타 스트리트': 29,
    '2023/12월 13일 일본 모지코': 42,
    '2023/12월 14일 일본 플라스틱러브': 75,
    '2023/12월 15일 일본 교복': 51,
    '2023/12월 16일 일본 선물': 113,
    '2023/12월 31일 한국 눈밭 필름카메라': 43,
    '2023/12월 31일 한국 눈밭': 38,
    '2024/2월 7일 일본 아이노시마': 65,
    '2024/2월 7일 일본 욕실': 61,
    '2024/2월 7일 일본 세미누드': 92,
    '2024/2월 7일 일본 나비욕조': 48,
    '2024/2월 11일 일본 네코 모지코': 21,
    '2024/2월 11일 일본 야간 블랙드레스': 20,
    '2024/2월 22일 한국 생일': 46,
    '2024/2월 22일한국 카페': 19,
    '2024/2월 23일 한국 야간 롱패딩': 48,
    '2024/3월 17일 일본 고쿠라': 19,
    '2024/4월 12일 한국 벗꽃': 35,
    '2024/4월 12일 한국 야간 동백': 26,
    '2024/4월 13일 한국 온실-여신': 31,
    '2024/4월 13일 한국 화가': 30,
    '2024/4월 13일 한국 문래동': 16,
    '2024/4월 28일 한국 셀프 촬영': 112,
    '2024/5월 2일 일본 동키 거리': 18,
    '2024/5월 3일 일본 후지엔': 40,
    '2024/5월 3일 일본 수국': 14,
    '2024/5월 3일 일본 지브리풍': 74,
    '2024/5월 4일 일본 야간 비눗방울': 49,
    '2024/5월 5일 일본 모지코 모리룩': 64,
    '2024/5월 5일 일본 모지코 모리룩 후보정': 64,
    '2024/5월 5일 일본 코이노보리': 17,
    '2024/5월 6일 일본 야간거리': 43,
    '2024/5월 7일 일본 홈스냅': 323,
    '2024/5월 7일 일본 게임센터': 19,
    '2024/6월 6일 한국 북해': 65,
    '2024/6월 7일 한국 피크닉': 36,
    '2024/6월 8일 한국 망친 사진': 52,
    '2024/6월 8일 한국 터널': 28,
    '2024/6월 9일 한국 산책': 25,
    '2024/7월 5일 일본 모지코': 26,
    '2024/7월 6일 일본 우마시마': 53,
    '2024/7월 6일 일본 모지코2': 45,
    '2024/7월 8일 일본 결박': 223,
    '2024/7월 8일 일본 욕조': 53,
    '2024/7월 8일 일본 여친 스냅': 41,
    '2024/8월 2일 일본 불꽃놀이/후보정': 39,
    '2024/8월 3일 일본 유카타 마츠리': 56,
    '2024/8월 4일 일본 블랙원피스': 29,
    '2024/9월 11일 한국 호리존': 41,
    '2024/9월 14일 한국 원미상가_필름': 34,
    '2024/9월 15일 한국 옥상연리': 98,
    '2024/9월 16일 한국 길거리 스냅': 46,
    '2024/9월 17일 한국 을지로 스냅': 46,
    '2024/10월 16일 일본 결박': 137,
    '2024/10월 16일 일본 욕실': 15,
    '2024/10월 16일 일본 오도공원 후지필름': 24,
    '2024/10월 16일 일본 오도': 5,
    '2024/10월 16일 일본 고스로리 할로윈': 20,
    '2024/10월 17일 일본 하카타 고래티셔츠': 59,
    '2024/10월 17일 일본 텐진 스트리트': 29,
    '2024/10월 18일 일본 텐진 코닥필름': 49,
    '2024/10월 19일 일본 빨간 기모노': 39,
    '2024/11월 7일 한국 가을 호수공원': 53,
    '2024/11월 8일 한국 욕실 블랙 웨딩': 42,
    '2024/11월 8일 한국 메이드복': 14,
    '2024/12월 7일 한국 홈셀프': 81,
    '2024/12월 12일 일본 모지코': 49,
    '2024/12월 13일 일본 크리스마스': 22,
    '2024/12월 14일 일본 나르시스트': 26,
    '2024/12월 30일 한국 카페': 29,
    '2024/12월 31일 한국 생일컨셉': 43,
    '2025/1월 5일 한국 눈밭': 63,
    '2025/2월 6일 일본 코야노세': 43,
    '2025/3월 13일 일본 무인역': 30,
    '2025/3월 14일 일본 고쿠라 힙': 32,
    '2025/3월 17일 일본 텐진 스트리트': 28,
    '2025/3월 17일 일본 고쿠라 야간': 17,
    '2025/3월 일본 필름': 64,
    '2025/3월 22 한국 홈셀프': 27,
    '2025/4월 29일 한국 이화마을': 55,
    '2025/4월 30일 한국 을지로 네코': 30,
    '2025/4월 30일 한국 을지로 캘빈': 25,
    '2025/5월 3일 한국 홈스냅 청포도': 42,
    '2025/5월 4일 한국 야간 보라돌이': 43,
    '2025/5월 4일 한국 밤바 산책': 32,
    '2025/5월 4일 한국 공원 산책': 32,
    '2025/5월 5일 한국 홈스냅 오타쿠': 27,
    '2025/5월 6일 한국 후지 스냅': 34
};

// omoide.js의 cleanReply 함수를 재사용
const { cleanReply } = require('./omoide');

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * ✨ 최적화: 빠른 응답을 위해 토큰 수 감소 ✨
 * @param {Array<Object>} messages - OpenAI API에 보낸 메시지 배열
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=150] - 생성할 최대 토큰 수 (기존 400 → 150)
 * @param {number} [temperature=1.0] - 응답의 창의성/무작위성 (기존 0.95 → 1.0)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 150, temperature = 1.0) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        console.log(`[concept:callOpenAI] 빠른 응답 모드로 호출: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[concept:callOpenAI] 응답 완료`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[concept:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * ✨ 최적화: 더 빠른 URL 생성 ✨
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
    
    const finalUrl = `${BASE_CONCEPT_URL}${encodeURIComponent(yearFolder)}/${encodeURIComponent(actualFolderName)}/${fileName}`;
    console.log(`[concept:generateConceptPhotoUrl] 생성된 URL: ${finalUrl}`);
    return finalUrl;
}

// ✨ 쿨다운 완전 제거: 단순히 '다음 사진' 기능만 유지 ✨
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * ✨ 완전 최적화: 모든 제한 제거, 즉시 응답 ✨
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc) {
    console.log(`[concept:getConceptPhotoReply] 컨셉 사진 요청 처리 시작: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejinText = '';

    // 키워드 맵 (구체적인 키워드가 먼저 매칭되도록 길이 기준 정렬)
    const conceptKeywordMap = {
        '하카타 고래티셔츠': '2024/10월 17일 일본 하카타 고래티셔츠',
        '일본 홈스냅': '2024/5월 7일 일본 홈스냅', '홈스냅': '2024/5월 7일 일본 홈스냅',
        '일본 결박': '2024/7월 8일 일본 결박', '결박': '2024/7월 8일 일본 결박',
        '일본 선물': '2023/12월 16일 일본 선물', '선물': '2023/12월 16일 일본 선물',
        '한국 셀프 촬영': '2024/4월 28일 한국 셀프 촬영', '셀프 촬영': '2024/4월 28일 한국 셀프 촬영',
        '옥상연리': '2024/9월 15일 한국 옥상연리',
        '일본 세미누드': '2024/2월 7일 일본 세미누드', '세미누드': '2024/2월 7일 일본 세미누드',
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
        '나비욕조': '2024/2월 7일 일본 나비욕조',
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
        '오도공원 후지필름': '2024/10월 16일 일본 오도공원 후지필름',
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

    // 길이 기준 내림차순 정렬로 구체적인 키워드 우선 매칭
    const sortedConceptKeywords = Object.keys(conceptKeywordMap).sort((a, b) => b.length - a.length);

    // 1. 직접적인 키워드 매칭 (최우선)
    for (const keyword of sortedConceptKeywords) {
        if (lowerCaseMessage.includes(keyword.toLowerCase())) {
            selectedFolder = conceptKeywordMap[keyword];
            folderDescription = `내가(예진이) ${selectedFolder} 컨셉으로 찍은 사진`;
            additionalPromptForYejinText = `이 사진은 아저씨와 함께한 나의 ${selectedFolder} 컨셉 사진이야. 아저씨와 나의 특별한 추억과 애정을 담아서 말해줘.`;
            console.log(`[concept] 키워드 매칭: "${keyword}" → ${selectedFolder}`);
            break;
        }
    }

    // 2. '다른것도 보고싶어', '다음 사진' 요청 처리
    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1;
        }
        folderDescription = `같은 폴더 (${selectedFolder})의 다른 사진`;
        additionalPromptForYejinText = `이전 요청과 같은 '${selectedFolder}' 컨셉 폴더의 다른 사진이야. 아저씨와 나의 아름다운 추억을 떠올리며 새로운 모습을 보여주는 거야.`;
        console.log(`[concept] 다음 사진 요청: ${selectedFolder} (${lastConceptPhotoIndex}번째)`);
    } else if (!selectedFolder) {
        // 3. 모호한 키워드 처리 (간단화)
        const ambiguousKeywords = ['욕실', '욕조', '모지코', '필름', '눈밭', '생일', '고쿠라', '텐진 스트리트', '홈셀프', '산책', '카페', '스냅', '스트리트', '야간'];
        for (const ambKeyword of ambiguousKeywords) {
            if (lowerCaseMessage.includes(ambKeyword.toLowerCase())) {
                const allMatchingFolders = Object.keys(CONCEPT_FOLDERS).filter(folder => folder.toLowerCase().includes(ambKeyword.toLowerCase()));
                
                if (allMatchingFolders.length === 1) {
                    selectedFolder = allMatchingFolders[0];
                    folderDescription = `내가(예진이) ${selectedFolder} 컨셉으로 찍은 사진`;
                    additionalPromptForYejinText = `이 사진은 아저씨와 함께한 나의 ${selectedFolder} 컨셉 사진이야.`;
                    console.log(`[concept] 모호한 키워드 단일 매칭: "${ambKeyword}" → ${selectedFolder}`);
                    break;
                } else if (allMatchingFolders.length > 1) {
                    // ✨ 여러 매칭 시 최신 것으로 자동 선택 (사용자 편의성 증대) ✨
                    const sortedFolders = allMatchingFolders.sort((a, b) => {
                        const extractDate = (folderName) => {
                            const match = folderName.match(/(\d{4})\/(\d{1,2})월 (\d{1,2})일/);
                            return match ? moment(`${match[1]}-${match[2]}-${match[3]}`, 'YYYY-M-D').valueOf() : 0;
                        };
                        return extractDate(b) - extractDate(a); // 최신순
                    });
                    selectedFolder = sortedFolders[0];
                    folderDescription = `내가(예진이) ${selectedFolder} 컨셉으로 찍은 사진`;
                    additionalPromptForYejinText = `이 사진은 아저씨와 함께한 나의 ${selectedFolder} 컨셉 사진이야.`;
                    console.log(`[concept] 모호한 키워드 최신 자동 선택: "${ambKeyword}" → ${selectedFolder}`);
                    break;
                }
            }
        }
        
        // 4. 일반적인 '컨셉사진' 요청 시 랜덤 선택
        if (!selectedFolder && (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진'))) {
            const folderKeysSortedByDate = Object.keys(CONCEPT_FOLDERS).sort((a, b) => {
                const extractDate = (folderName) => {
                    const match = folderName.match(/(\d{4})\/(\d{1,2})월 (\d{1,2})일/);
                    return match ? moment(`${match[1]}-${match[2]}-${match[
