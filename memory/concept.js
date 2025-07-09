// memory/concept.js v1.21 (URL 인코딩 및 검증 기능 추가)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const path = require('path');
const axios = require('axios');

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/photo/concept/';

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터
const CONCEPT_FOLDERS = {
    "2023_12_12_일본_하카타_스트리트": 29,
    "2023_12_13_일본_모지코": 42,
    "2023_12_14_일본_플라스틱러브": 75,
    "2023_12_15_일본_교복": 51,
    "2023_12_16_일본_선물": 113,
    "2023_12_31_한국_눈밭": 38,
    "2023_12_31_한국_눈밭_필름_카메라": 43,
    "2024_02_07_일본_아이노시마": 65,
    "2024_02_07_일본_욕실": 61,
    "2024_02_11_일본_네코_모지코": 21,
    "2024_02_11_일본_야간_블랙드레스": 31,
    "2024_02_22_한국_생일": 45,
    "2024_02_22_한국_생일_00022.jpg": 1,
    "2024_02_22_한국_카페": 19,
    "2024_02_23_한국_야간_롱패딩": 47,
    "2024_02_23_한국_야간_롱패딩_00023.jpg": 1,
    "2024_03_17_일본_고쿠라": 19,
    "2024_04_12_한국_벗꽃": 35,
    "2024_04_12_한국_야간_동백": 26,
    "2024_04_13_한국_문래동": 16,
    "2024_04_13_한국_온실_여신": 31,
    "2024_04_13_한국_화가": 30,
    "2024_04_28_한국_셀프_촬영": 111,
    "2024_04_28_한국_셀프_촬영_00028.jpg": 1,
    "2024_05_02_일본_동키_거리": 18,
    "2024_05_03_일본_수국": 14,
    "2024_05_03_일본_지브리풍": 74,
    "2024_05_03_일본_후지엔": 40,
    "2024_05_04_일본_야간_비눗방울": 49,
    "2024_05_05_일본_모지코_모리룩": 64,
    "2024_05_05_일본_코이노보리": 17,
    "2024_05_06_일본_야간거리": 43,
    "2024_05_07_일본_게임센터": 19,
    "2024_05_07_일본_홈스냅": 323,
    "2024_06_06_한국_북해": 65,
    "2024_06_07_한국__피크닉": 36,
    "2024_06_08_한국__터널": 28,
    "2024_06_08_한국_망친_사진": 52,
    "2024_06_09_한국_산책": 23,
    "2024_06_09_한국_산책_0000009.jpg": 1,
    "2024_06_09_한국_산책_0000109.jpg": 1,
    "2024_07_05_일본_모지코": 26,
    "2024_07_06_일본_모지코": 45,
    "2024_07_06_일본_우마시마": 53,
    "2024_07_08_일본_여친_스냅": 41,
    "2024_07_08_일본_욕조": 53,
    "2024_07_08_일본_일본_결박": 223,
    "2024_08_02_일본_불꽃놀이": 39,
    "2024_08_03_일본_유카타_마츠리": 56,
    "2024_08_04_일본_블랙원피스": 29,
    "2024_09_11_한국_호리존": 41,
    "2024_09_14_한국_원미상가_필름": 34,
    "2024_09_15_한국_옥상연리": 98,
    "2024_09_16_한국_길거리_스냅": 46,
    "2024_09_17_한국_을지로_스냅": 46,
    "2024_10_16_일본_결박": 137,
    "2024_10_16_일본_고스로리_할로윈": 20,
    "2024_10_16_일본_오도공원": 5,
    "2024_10_16_일본_오도공원_후지필름": 24,
    "2024_10_16_일본_욕실": 15,
    "2024_10_17_일본_텐진_스트리트": 29,
    "2024_10_17_일본_하카타_고래티셔츠": 59,
    "2024_10_18_일본_텐진_코닥필름": 49,
    "2024_10_19_일본_빨간_기모노": 39,
    "2024_11_08_한국_메이드복": 14,
    "2024_11_08_한국_욕실_블랙_웨딩": 42,
    "2024_11_7_한국_가을_호수공원": 53,
    "2024_12_07_한국_홈셀프": 81,
    "2024_12_12_일본_모지코": 49,
    "2024_12_13_일본_크리스마스": 22,
    "2024_12_14_일본_나르시스트": 26,
    "2024_12_30_한국_카페": 29,
    "2024_12_31_한국_생일컨셉": 43,
    "2025_01_05_한국": 63,
    "2025_02_06_일본_코야노세": 43,
    "2025_02_07_일본_나비욕조": 48,
    "2025_02_07_일본_세미누드": 92,
    "2025_03_13_일본_무인역": 30,
    "2025_03_14_일본_고쿠라": 32,
    "2025_03_17_일본_고쿠라": 17,
    "2025_03_17_일본_텐진": 28,
    "2025_03_22": 27,
    "2025_03_일본_필름": 64,
    "2025_04_29_한국_이화마을": 55,
    "2025_04_30_한국_을지로": 30,
    "2025_04_30_한국_을지로_캘빈": 25,
    "2025_05_03_한국_홈스냅_청포도": 42,
    "2025_05_04_한국": 43,
    "2025_05_04_한국_공원_산책": 32,
    "2025_05_04_한국_밤바_산책": 32,
    "2025_05_05_한국_홈스냅_오타쿠": 27,
    "2025_05_06_마지막_한국_후지스냅": 34
};

/**
 * URL이 유효한지 검증하는 함수
 */
async function validateImageUrl(url) {
    try {
        console.log(`[validateImageUrl] 검증 시작: ${url}`);
        const response = await axios.head(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'LINE-Bot-SDK/7.7.0'
            },
            maxRedirects: 3
        });
        
        // LINE 이미지 요구사항 검증
        const contentType = response.headers['content-type'];
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        console.log(`[validateImageUrl] Content-Type: ${contentType}, Size: ${contentLength} bytes`);
        
        // JPEG/PNG 형식이고 10MB 이하여야 함
        if (!contentType || (!contentType.includes('image/jpeg') && !contentType.includes('image/png'))) {
            console.warn(`[validateImageUrl] 지원하지 않는 이미지 형식: ${contentType}`);
            return false;
        }
        
        if (contentLength > 10 * 1024 * 1024) { // 10MB 제한
            console.warn(`[validateImageUrl] 이미지 크기 초과: ${contentLength} bytes`);
            return false;
        }
        
        console.log(`[validateImageUrl] 검증 성공`);
        return true;
    } catch (error) {
        console.error(`[validateImageUrl] URL 검증 실패: ${url}`, error.message);
        return false;
    }
}

/**
 * URL 인코딩을 적용하는 함수
 */
function encodeImageUrl(url) {
    try {
        // URL을 파싱하여 path 부분만 인코딩
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const encodedParts = pathParts.map(part => {
            // 빈 문자열이 아닌 경우에만 인코딩
            return part ? encodeURIComponent(part) : part;
        });
        urlObj.pathname = encodedParts.join('/');
        
        const encodedUrl = urlObj.toString();
        console.log(`[encodeImageUrl] 원본: ${url}`);
        console.log(`[encodeImageUrl] 인코딩: ${encodedUrl}`);
        
        return encodedUrl;
    } catch (error) {
        console.error(`[encodeImageUrl] URL 인코딩 실패: ${url}`, error);
        return url; // 실패 시 원본 반환
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (이제 파일 이름의 접두사 역할)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (1부터 시작)
 * @returns {string|null} 사진 URL 또는 null
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    console.log(`[concept:generateConceptPhotoUrl] 폴더명 (파일접두사): "${folderName}"`); 
    const photoCount = CONCEPT_FOLDERS[folderName];
    console.log(`[concept:generateConceptPhotoUrl] 사진 개수: ${photoCount}`);
    
    // 단일 파일명으로 등록된 경우 바로 해당 파일명을 사용
    if (folderName.endsWith('.jpg')) {
        const rawUrl = `${BASE_CONCEPT_URL}${folderName}`;
        const encodedUrl = encodeImageUrl(rawUrl);
        console.log(`[concept:generateConceptPhotoUrl] 단일 파일 URL: ${encodedUrl}`);
        return encodedUrl;
    }

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
    console.log(`[concept:generateConceptPhotoUrl] 사용할 인덱스: ${indexToUse}`);

    // 파일명 형식: "날짜_장소_컨셉_000001.jpg"
    const fileName = `${folderName}_${String(indexToUse).padStart(6, '0')}.jpg`; 
    console.log(`[concept:generateConceptPhotoUrl] 파일명: ${fileName}`);
    
    // 최종 URL은 BASE_CONCEPT_URL 바로 아래 파일명으로 구성하고 인코딩 적용
    const rawUrl = `${BASE_CONCEPT_URL}${fileName}`;
    const encodedUrl = encodeImageUrl(rawUrl);
    console.log(`[concept:generateConceptPhotoUrl] 최종 생성 URL: ${encodedUrl}`);
    return encodedUrl;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @param {Function} callOpenAIFunc - OpenAI 호출 함수
 * @param {Function} cleanReplyFunc - 응답 정리 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log(`[concept:getConceptPhotoReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejinText = '';
    
    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    if (!isConceptRequest) {
        console.log(`[concept:getConceptPhotoReply] 컨셉사진 관련 키워드 없음. null 반환.`);
        return null;
    }

    // 키워드 맵 (길이에 따라 정렬하여 더 구체적인 키워드가 먼저 매칭되도록)
    const conceptKeywordMap = {
        '2월_욕조': '2024_02_07_일본_욕조', 
        '2월_욕실': '2024_02_07_일본_욕실',
        '2월_나비욕조': '2025_02_07_일본_나비욕조',
        '하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '일본_홈스냅': '2024_05_07_일본_홈스냅', 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '일본_결박': '2024_07_08_일본_일본_결박',
        '결박': '2024_07_08_일본_일본_결박',
        '일본_선물': '2023_12_16_일본_선물', 
        '선물': '2023_12_16_일본_선물',
        '한국_셀프_촬영_00028.jpg': '2024_04_28_한국_셀프_촬영_00028.jpg',
        '한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', 
        '셀프_촬영': '2024_04_28_한국_셀프_촬영',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '일본_세미누드': '2025_02_07_일본_세미누드',
        '세미누드': '2025_02_07_일본_세미누드',
        '한국_홈셀프': '2024_12_07_한국_홈셀프',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '한국_북해': '2024_06_06_한국_북해', 
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '일본_필름': '2025_03_일본_필름',
        '모지코_모리룩': '2024_05_05_일본_모지코_모리룩',
        '한국_눈밭_필름_카메라': '2023_12_31_한국_눈밭_필름_카메라',
        '한국_눈밭': '2023_12_31_한국_눈밭',
        '일본_욕실': '2024_02_07_일본_욕실',
        '일본_욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '유카타_마츠리': '2024_08_03_일본_유카타_마츠리',
        '이화마을': '2025_04_29_한국_이화마을',
        '우마시마': '2024_07_06_일본_우마시마',
        '가을_호수공원': '2024_11_7_한국_가을_호수공원',
        '망친_사진': '2024_06_08_한국_망친_사진',
        '일본_교복': '2023_12_15_일본_교복',
        '야간_비눗방울': '2024_05_04_일본_야간_비눗방울',
        '일본_모지코': '2024_12_12_일본_모지코',
        '텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름',
        '야간_롱패딩_00023.jpg': '2024_02_23_한국_야간_롱패딩_00023.jpg',
        '야간_롱패딩': '2024_02_23_한국_야간_롱패딩',
        '을지로_스냅': '2024_09_17_한국_을지로_스냅', 
        '길거리_스냅': '2024_09_16_한국_길거리_스냅',
        '한국_생일_00022.jpg': '2024_02_22_한국_생일_00022.jpg',
        '한국_생일': '2024_02_22_한국_생일',
        '모지코2': '2024_07_06_일본_모지코',
        '야간_보라돌이': '2025_05_04_한국',
        '코야노세': '2025_02_06_일본_코야노세',
        '야간거리': '2024_05_06_일본_야간거리', 
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도',
        '욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        '호리존': '2024_09_11_한국_호리존',
        '여친_스냅': '2024_07_08_일본_여친_스냅',
        '후지엔': '2024_05_03_일본_후지엔',
        '불꽃놀이': '2024_08_02_일본_불꽃놀이', 
        '빨간_기모노': '2024_10_19_일본_빨간_기모노',
        '피크닉': '2024_06_07_한국__피크닉',
        '벗꽃': '2024_04_12_한국_벗꽃',
        '후지_스냅': '2025_05_06_마지막_한국_후지스냅',
        '원미상가_필름': '2024_09_14_한국_원미상가_필름', 
        '밤바_산책': '2025_05_04_한국_밤바_산책',
        '공원_산책': '2025_05_04_한국_공원_산책', 
        '고쿠라_힙': '2025_03_14_일본_고쿠라',
        '온실_여신': '2024_04_13_한국_온실_여신', 
        '을지로_네코': '2025_04_30_한국_을지로',
        '무인역': '2025_03_13_일본_무인역', 
        '화가': '2024_04_13_한국_화가',
        '블랙원피스': '2024_08_04_일본_블랙원피스', 
        '카페': '2024_12_30_한국_카페',
        '일본_텐진_스트리트': '2024_10_17_일본_텐진_스트리트',
        '하카타_스트리트': '2023_12_12_일본_하카타_스트리트',
        '홈스냅_오타쿠': '2025_05_05_한국_홈스냅_오타쿠',
        '야간_동백': '2024_04_12_한국_야간_동백',
        '나르시스트': '2024_12_14_일본_나르시스트', 
        '을지로_캘빈': '2025_04_30_한국_을지로_캘빈',
        '산책_0000009.jpg': '2024_06_09_한국_산책_0000009.jpg',
        '산책_0000109.jpg': '2024_06_09_한국_산책_0000109.jpg',
        '산책': '2024_06_09_한국_산책',
        '오도공원_후지필름': '2024_10_16_일본_오도공원_후지필름', 
        '크리스마스': '2024_12_13_일본_크리스마스',
        '네코_모지코': '2024_02_11_일본_네코_모지코',
        '야간_블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '고스로리_할로윈': '2024_10_16_일본_고스로리_할로윈',
        '게임센터': '2024_05_07_일본_게임센터',
        '동키_거리': '2024_05_02_일본_동키_거리',
        '고쿠라_야간': '2025_03_17_일본_고쿠라',
        '코이노보리': '2024_05_05_일본_코이노보리', 
        '문래동': '2024_04_13_한국_문래동',
        '수국': '2024_05_03_일본_수국',
        '메이드복': '2024_11_08_한국_메이드복',
        '오도공원': '2024_10_16_일본_오도공원',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조'
    };

/**
 * URL이 유효한지 검증하는 함수
 */
async function validateImageUrl(url) {
    try {
        console.log(`[validateImageUrl] 검증 시작: ${url}`);
        const response = await axios.head(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'LINE-Bot-SDK/7.7.0'
            },
            maxRedirects: 3
        });
        
        // LINE 이미지 요구사항 검증
        const contentType = response.headers['content-type'];
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        console.log(`[validateImageUrl] Content-Type: ${contentType}, Size: ${contentLength} bytes`);
        
        // JPEG/PNG 형식이고 10MB 이하여야 함
        if (!contentType || (!contentType.includes('image/jpeg') && !contentType.includes('image/png'))) {
            console.warn(`[validateImageUrl] 지원하지 않는 이미지 형식: ${contentType}`);
            return false;
        }
        
        if (contentLength > 10 * 1024 * 1024) { // 10MB 제한
            console.warn(`[validateImageUrl] 이미지 크기 초과: ${contentLength} bytes`);
            return false;
        }
        
        console.log(`[validateImageUrl] 검증 성공`);
        return true;
    } catch (error) {
        console.error(`[validateImageUrl] URL 검증 실패: ${url}`, error.message);
        return false;
    }
}

/**
 * URL 인코딩을 적용하는 함수
 */
function encodeImageUrl(url) {
    try {
        // URL을 파싱하여 path 부분만 인코딩
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const encodedParts = pathParts.map(part => {
            // 빈 문자열이 아닌 경우에만 인코딩
            return part ? encodeURIComponent(part) : part;
        });
        urlObj.pathname = encodedParts.join('/');
        
        const encodedUrl = urlObj.toString();
        console.log(`[encodeImageUrl] 원본: ${url}`);
        console.log(`[encodeImageUrl] 인코딩: ${encodedUrl}`);
        
        return encodedUrl;
    } catch (error) {
        console.error(`[encodeImageUrl] URL 인코딩 실패: ${url}`, error);
        return url; // 실패 시 원본 반환
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (이제 파일 이름의 접두사 역할)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (1부터 시작)
 * @returns {string|null} 사진 URL 또는 null
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    console.log(`[concept:generateConceptPhotoUrl] 폴더명 (파일접두사): "${folderName}"`); 
    const photoCount = CONCEPT_FOLDERS[folderName];
    console.log(`[concept:generateConceptPhotoUrl] 사진 개수: ${photoCount}`);
    
    // 단일 파일명으로 등록된 경우 바로 해당 파일명을 사용
    if (folderName.endsWith('.jpg')) {
        const rawUrl = `${BASE_CONCEPT_URL}${folderName}`;
        const encodedUrl = encodeImageUrl(rawUrl);
        console.log(`[concept:generateConceptPhotoUrl] 단일 파일 URL: ${encodedUrl}`);
        return encodedUrl;
    }

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
    console.log(`[concept:generateConceptPhotoUrl] 사용할 인덱스: ${indexToUse}`);

    // 파일명 형식: "날짜_장소_컨셉_000001.jpg"
    const fileName = `${folderName}_${String(indexToUse).padStart(6, '0')}.jpg`; 
    console.log(`[concept:generateConceptPhotoUrl] 파일명: ${fileName}`);
    
    // 최종 URL은 BASE_CONCEPT_URL 바로 아래 파일명으로 구성하고 인코딩 적용
    const rawUrl = `${BASE_CONCEPT_URL}${fileName}`;
    const encodedUrl = encodeImageUrl(rawUrl);
    console.log(`[concept:generateConceptPhotoUrl] 최종 생성 URL: ${encodedUrl}`);
    return encodedUrl;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @param {Function} callOpenAIFunc - OpenAI 호출 함수
 * @param {Function} cleanReplyFunc - 응답 정리 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log(`[concept:getConceptPhotoReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejinText = '';
    
    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    if (!isConceptRequest) {
        console.log(`[concept:getConceptPhotoReply] 컨셉사진 관련 키워드 없음. null 반환.`);
        return null;
    }

    // 키워드 맵 (길이에 따라 정렬하여 더 구체적인 키워드가 먼저 매칭되도록)
    const conceptKeywordMap = {
        '2월_욕조': '2024_02_07_일본_욕조', 
        '2월_욕실': '2024_02_07_일본_욕실',
        '2월_나비욕조': '2025_02_07_일본_나비욕조',
        '하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '일본_홈스냅': '2024_05_07_일본_홈스냅', 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '일본_결박': '2024_07_08_일본_일본_결박',
        '결박': '2024_07_08_일본_일본_결박',
        '일본_선물': '2023_12_16_일본_선물', 
        '선물': '2023_12_16_일본_선물',
        '한국_셀프_촬영_00028.jpg': '2024_04_28_한국_셀프_촬영_00028.jpg',
        '한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', 
        '셀프_촬영': '2024_04_28_한국_셀프_촬영',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '일본_세미누드': '2025_02_07_일본_세미누드',
        '세미누드': '2025_02_07_일본_세미누드',
        '한국_홈셀프': '2024_12_07_한국_홈셀프',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '한국_북해': '2024_06_06_한국_북해', 
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '일본_필름': '2025_03_일본_필름',
        '모지코_모리룩': '2024_05_05_일본_모지코_모리룩',
        '한국_눈밭_필름_카메라': '2023_12_31_한국_눈밭_필름_카메라',
        '한국_눈밭': '2023_12_31_한국_눈밭',
        '일본_욕실': '2024_02_07_일본_욕실',
        '일본_욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '유카타_마츠리': '2024_08_03_일본_유카타_마츠리',
        '이화마을': '2025_04_29_한국_이화마을',
        '우마시마': '2024_07_06_일본_우마시마',
        '가을_호수공원': '2024_11_7_한국_가을_호수공원',
        '망친_사진': '2024_06_08_한국_망친_사진',
        '일본_교복': '2023_12_15_일본_교복',
        '야간_비눗방울': '2024_05_04_일본_야간_비눗방울',
        '일본_모지코': '2024_12_12_일본_모지코',
        '텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름',
        '야간_롱패딩_00023.jpg': '2024_02_23_한국_야간_롱패딩_00023.jpg',
        '야간_롱패딩': '2024_02_23_한국_야간_롱패딩',
        '을지로_스냅': '2024_09_17_한국_을지로_스냅', 
        '길거리_스냅': '2024_09_16_한국_길거리_스냅',
        '한국_생일_00022.jpg': '2024_02_22_한국_생일_00022.jpg',
        '한국_생일': '2024_02_22_한국_생일',
        '모지코2': '2024_07_06_일본_모지코',
        '야간_보라돌이': '2025_05_04_한국',
        '코야노세': '2025_02_06_일본_코야노세',
        '야간거리': '2024_05_06_일본_야간거리', 
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도',
        '욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        '호리존': '2024_09_11_한국_호리존',
        '여친_스냅': '2024_07_08_일본_여친_스냅',
        '후지엔': '2024_05_03_일본_후지엔',
        '불꽃놀이': '2024_08_02_일본_불꽃놀이', 
        '빨간_기모노': '2024_10_19_일본_빨간_기모노',
        '피크닉': '2024_06_07_한국__피크닉',
        '벗꽃': '2024_04_12_한국_벗꽃',
        '후지_스냅': '2025_05_06_마지막_한국_후지스냅',
        '원미상가_필름': '2024_09_14_한국_원미상가_필름', 
        '밤바_산책': '2025_05_04_한국_밤바_산책',
        '공원_산책': '2025_05_04_한국_공원_산책', 
        '고쿠라_힙': '2025_03_14_일본_고쿠라',
        '온실_여신': '2024_04_13_한국_온실_여신', 
        '을지로_네코': '2025_04_30_한국_을지로',
        '무인역': '2025_03_13_일본_무인역', 
        '화가': '2024_04_13_한국_화가',
        '블랙원피스': '2024_08_04_일본_블랙원피스', 
        '카페': '2024_12_30_한국_카페',
        '일본_텐진_스트리트': '2024_10_17_일본_텐진_스트리트',
        '하카타_스트리트': '2023_12_12_일본_하카타_스트리트',
        '홈스냅_오타쿠': '2025_05_05_한국_홈스냅_오타쿠',
        '야간_동백': '2024_04_12_한국_야간_동백',
        '나르시스트': '2024_12_14_일본_나르시스트', 
        '을지로_캘빈': '2025_04_30_한국_을지로_캘빈',
        '산책_0000009.jpg': '2024_06_09_한국_산책_0000009.jpg',
        '산책_0000109.jpg': '2024_06_09_한국_산책_0000109.jpg',
        '산책': '2024_06_09_한국_산책',
        '오도공원_후지필름': '2024_10_16_일본_오도공원_후지필름', 
        '크리스마스': '2024_12_13_일본_크리스마스',
        '네코_모지코': '2024_02_11_일본_네코_모지코',
        '야간_블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '고스로리_할로윈': '2024_10_16_일본_고스로리_할로윈',
        '게임센터': '2024_05_07_일본_게임센터',
        '동키_거리': '2024_05_02_일본_동키_거리',
        '고쿠라_야간': '2025_03_17_일본_고쿠라',
        '코이노보리': '2024_05_05_일본_코이노보리', 
        '문래동': '2024_04_13_한국_문래동',
        '수국': '2024_05_03_일본_수국',
        '메이드복': '2024_11_08_한국_메이드복',
        '오도공원': '2024_10_16_일본_오도공원',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조'
    };

/**
 * URL이 유효한지 검증하는 함수
 */
async function validateImageUrl(url) {
    try {
        console.log(`[validateImageUrl] 검증 시작: ${url}`);
        const response = await axios.head(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'LINE-Bot-SDK/7.7.0'
            },
            maxRedirects: 3
        });
        
        // LINE 이미지 요구사항 검증
        const contentType = response.headers['content-type'];
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        console.log(`[validateImageUrl] Content-Type: ${contentType}, Size: ${contentLength} bytes`);
        
        // JPEG/PNG 형식이고 10MB 이하여야 함
        if (!contentType || (!contentType.includes('image/jpeg') && !contentType.includes('image/png'))) {
            console.warn(`[validateImageUrl] 지원하지 않는 이미지 형식: ${contentType}`);
            return false;
        }
        
        if (contentLength > 10 * 1024 * 1024) { // 10MB 제한
            console.warn(`[validateImageUrl] 이미지 크기 초과: ${contentLength} bytes`);
            return false;
        }
        
        console.log(`[validateImageUrl] 검증 성공`);
        return true;
    } catch (error) {
        console.error(`[validateImageUrl] URL 검증 실패: ${url}`, error.message);
        return false;
    }
}

/**
 * URL 인코딩을 적용하는 함수
 */
function encodeImageUrl(url) {
    try {
        // URL을 파싱하여 path 부분만 인코딩
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const encodedParts = pathParts.map(part => {
            // 빈 문자열이 아닌 경우에만 인코딩
            return part ? encodeURIComponent(part) : part;
        });
        urlObj.pathname = encodedParts.join('/');
        
        const encodedUrl = urlObj.toString();
        console.log(`[encodeImageUrl] 원본: ${url}`);
        console.log(`[encodeImageUrl] 인코딩: ${encodedUrl}`);
        
        return encodedUrl;
    } catch (error) {
        console.error(`[encodeImageUrl] URL 인코딩 실패: ${url}`, error);
        return url; // 실패 시 원본 반환
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (이제 파일 이름의 접두사 역할)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (1부터 시작)
 * @returns {string|null} 사진 URL 또는 null
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    console.log(`[concept:generateConceptPhotoUrl] 폴더명 (파일접두사): "${folderName}"`); 
    const photoCount = CONCEPT_FOLDERS[folderName];
    console.log(`[concept:generateConceptPhotoUrl] 사진 개수: ${photoCount}`);
    
    // 단일 파일명으로 등록된 경우 바로 해당 파일명을 사용
    if (folderName.endsWith('.jpg')) {
        const rawUrl = `${BASE_CONCEPT_URL}${folderName}`;
        const encodedUrl = encodeImageUrl(rawUrl);
        console.log(`[concept:generateConceptPhotoUrl] 단일 파일 URL: ${encodedUrl}`);
        return encodedUrl;
    }

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
    console.log(`[concept:generateConceptPhotoUrl] 사용할 인덱스: ${indexToUse}`);

    // 파일명 형식: "날짜_장소_컨셉_000001.jpg"
    const fileName = `${folderName}_${String(indexToUse).padStart(6, '0')}.jpg`; 
    console.log(`[concept:generateConceptPhotoUrl] 파일명: ${fileName}`);
    
    // 최종 URL은 BASE_CONCEPT_URL 바로 아래 파일명으로 구성하고 인코딩 적용
    const rawUrl = `${BASE_CONCEPT_URL}${fileName}`;
    const encodedUrl = encodeImageUrl(rawUrl);
    console.log(`[concept:generateConceptPhotoUrl] 최종 생성 URL: ${encodedUrl}`);
    return encodedUrl;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @param {Function} callOpenAIFunc - OpenAI 호출 함수
 * @param {Function} cleanReplyFunc - 응답 정리 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log(`[concept:getConceptPhotoReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejinText = '';
    
    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    if (!isConceptRequest) {
        console.log(`[concept:getConceptPhotoReply] 컨셉사진 관련 키워드 없음. null 반환.`);
        return null;
    }

    // 키워드 맵 (길이에 따라 정렬하여 더 구체적인 키워드가 먼저 매칭되도록)
    const conceptKeywordMap = {
        '2월_욕조': '2024_02_07_일본_욕조', 
        '2월_욕실': '2024_02_07_일본_욕실',
        '2월_나비욕조': '2025_02_07_일본_나비욕조',
        '하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '일본_홈스냅': '2024_05_07_일본_홈스냅', 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '일본_결박': '2024_07_08_일본_일본_결박',
        '결박': '2024_07_08_일본_일본_결박',
        '일본_선물': '2023_12_16_일본_선물', 
        '선물': '2023_12_16_일본_선물',
        '한국_셀프_촬영_00028.jpg': '2024_04_28_한국_셀프_촬영_00028.jpg',
        '한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', 
        '셀프_촬영': '2024_04_28_한국_셀프_촬영',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '일본_세미누드': '2025_02_07_일본_세미누드',
        '세미누드': '2025_02_07_일본_세미누드',
        '한국_홈셀프': '2024_12_07_한국_홈셀프',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '한국_북해': '2024_06_06_한국_북해', 
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '일본_필름': '2025_03_일본_필름',
        '모지코_모리룩': '2024_05_05_일본_모지코_모리룩',
        '한국_눈밭_필름_카메라': '2023_12_31_한국_눈밭_필름_카메라',
        '한국_눈밭': '2023_12_31_한국_눈밭',
        '일본_욕실': '2024_02_07_일본_욕실',
        '일본_욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '유카타_마츠리': '2024_08_03_일본_유카타_마츠리',
        '이화마을': '2025_04_29_한국_이화마을',
        '우마시마': '2024_07_06_일본_우마시마',
        '가을_호수공원': '2024_11_7_한국_가을_호수공원',
        '망친_사진': '2024_06_08_한국_망친_사진',
        '일본_교복': '2023_12_15_일본_교복',
        '야간_비눗방울': '2024_05_04_일본_야간_비눗방울',
        '일본_모지코': '2024_12_12_일본_모지코',
        '텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름',
        '야간_롱패딩_00023.jpg': '2024_02_23_한국_야간_롱패딩_00023.jpg',
        '야간_롱패딩': '2024_02_23_한국_야간_롱패딩',
        '을지로_스냅': '2024_09_17_한국_을지로_스냅', 
        '길거리_스냅': '2024_09_16_한국_길거리_스냅',
        '한국_생일_00022.jpg': '2024_02_22_한국_생일_00022.jpg',
        '한국_생일': '2024_02_22_한국_생일',
        '모지코2': '2024_07_06_일본_모지코',
        '야간_보라돌이': '2025_05_04_한국',
        '코야노세': '2025_02_06_일본_코야노세',
        '야간거리': '2024_05_06_일본_야간거리', 
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도',
        '욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        '호리존': '2024_09_11_한국_호리존',
        '여친_스냅': '2024_07_08_일본_여친_스냅',
        '후지엔': '2024_05_03_일본_후지엔',
        '불꽃놀이': '2024_08_02_일본_불꽃놀이', 
        '빨간_기모노': '2024_10_19_일본_빨간_기모노',
        '피크닉': '2024_06_07_한국__피크닉',
        '벗꽃': '2024_04_12_한국_벗꽃',
        '후지_스냅': '2025_05_06_마지막_한국_후지스냅',
        '원미상가_필름': '2024_09_14_한국_원미상가_필름', 
        '밤바_산책': '2025_05_04_한국_밤바_산책',
        '공원_산책': '2025_05_04_한국_공원_산책', 
        '고쿠라_힙': '2025_03_14_일본_고쿠라',
        '온실_여신': '2024_04_13_한국_온실_여신', 
        '을지로_네코': '2025_04_30_한국_을지로',
        '무인역': '2025_03_13_일본_무인역', 
        '화가': '2024_04_13_한국_화가',
        '블랙원피스': '2024_08_04_일본_블랙원피스', 
        '카페': '2024_12_30_한국_카페',
        '일본_텐진_스트리트': '2024_10_17_일본_텐진_스트리트',
        '하카타_스트리트': '2023_12_12_일본_하카타_스트리트',
        '홈스냅_오타쿠': '2025_05_05_한국_홈스냅_오타쿠',
        '야간_동백': '2024_04_12_한국_야간_동백',
        '나르시스트': '2024_12_14_일본_나르시스트', 
        '을지로_캘빈': '2025_04_30_한국_을지로_캘빈',
        '산책_0000009.jpg': '2024_06_09_한국_산책_0000009.jpg',
        '산책_0000109.jpg': '2024_06_09_한국_산책_0000109.jpg',
        '산책': '2024_06_09_한국_산책',
        '오도공원_후지필름': '2024_10_16_일본_오도공원_후지필름', 
        '크리스마스': '2024_12_13_일본_크리스마스',
        '네코_모지코': '2024_02_11_일본_네코_모지코',
        '야간_블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '고스로리_할로윈': '2024_10_16_일본_고스로리_할로윈',
        '게임센터': '2024_05_07_일본_게임센터',
        '동키_거리': '2024_05_02_일본_동키_거리',
        '고쿠라_야간': '2025_03_17_일본_고쿠라',
        '코이노보리': '2024_05_05_일본_코이노보리', 
        '문래동': '2024_04_13_한국_문래동',
        '수국': '2024_05_03_일본_수국',
        '메이드복': '2024_11_08_한국_메이드복',
        '오도공원': '2024_10_16_일본_오도공원',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조'
    };

/**
 * URL이 유효한지 검증하는 함수
 */
async function validateImageUrl(url) {
    try {
        console.log(`[validateImageUrl] 검증 시작: ${url}`);
        const response = await axios.head(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'LINE-Bot-SDK/7.7.0'
            },
            maxRedirects: 3
        });
        
        // LINE 이미지 요구사항 검증
        const contentType = response.headers['content-type'];
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        console.log(`[validateImageUrl] Content-Type: ${contentType}, Size: ${contentLength} bytes`);
        
        // JPEG/PNG 형식이고 10MB 이하여야 함
        if (!contentType || (!contentType.includes('image/jpeg') && !contentType.includes('image/png'))) {
            console.warn(`[validateImageUrl] 지원하지 않는 이미지 형식: ${contentType}`);
            return false;
        }
        
        if (contentLength > 10 * 1024 * 1024) { // 10MB 제한
            console.warn(`[validateImageUrl] 이미지 크기 초과: ${contentLength} bytes`);
            return false;
        }
        
        console.log(`[validateImageUrl] 검증 성공`);
        return true;
    } catch (error) {
        console.error(`[validateImageUrl] URL 검증 실패: ${url}`, error.message);
        return false;
    }
}

/**
 * URL 인코딩을 적용하는 함수
 */
function encodeImageUrl(url) {
    try {
        // URL을 파싱하여 path 부분만 인코딩
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const encodedParts = pathParts.map(part => {
            // 빈 문자열이 아닌 경우에만 인코딩
            return part ? encodeURIComponent(part) : part;
        });
        urlObj.pathname = encodedParts.join('/');
        
        const encodedUrl = urlObj.toString();
        console.log(`[encodeImageUrl] 원본: ${url}`);
        console.log(`[encodeImageUrl] 인코딩: ${encodedUrl}`);
        
        return encodedUrl;
    } catch (error) {
        console.error(`[encodeImageUrl] URL 인코딩 실패: ${url}`, error);
        return url; // 실패 시 원본 반환
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (이제 파일 이름의 접두사 역할)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (1부터 시작)
 * @returns {string|null} 사진 URL 또는 null
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    console.log(`[concept:generateConceptPhotoUrl] 폴더명 (파일접두사): "${folderName}"`); 
    const photoCount = CONCEPT_FOLDERS[folderName];
    console.log(`[concept:generateConceptPhotoUrl] 사진 개수: ${photoCount}`);
    
    // 단일 파일명으로 등록된 경우 바로 해당 파일명을 사용
    if (folderName.endsWith('.jpg')) {
        const rawUrl = `${BASE_CONCEPT_URL}${folderName}`;
        const encodedUrl = encodeImageUrl(rawUrl);
        console.log(`[concept:generateConceptPhotoUrl] 단일 파일 URL: ${encodedUrl}`);
        return encodedUrl;
    }

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
    console.log(`[concept:generateConceptPhotoUrl] 사용할 인덱스: ${indexToUse}`);

    // 파일명 형식: "날짜_장소_컨셉_000001.jpg"
    const fileName = `${folderName}_${String(indexToUse).padStart(6, '0')}.jpg`; 
    console.log(`[concept:generateConceptPhotoUrl] 파일명: ${fileName}`);
    
    // 최종 URL은 BASE_CONCEPT_URL 바로 아래 파일명으로 구성하고 인코딩 적용
    const rawUrl = `${BASE_CONCEPT_URL}${fileName}`;
    const encodedUrl = encodeImageUrl(rawUrl);
    console.log(`[concept:generateConceptPhotoUrl] 최종 생성 URL: ${encodedUrl}`);
    return encodedUrl;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @param {Function} callOpenAIFunc - OpenAI 호출 함수
 * @param {Function} cleanReplyFunc - 응답 정리 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null
 */
async function getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log(`[concept:getConceptPhotoReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let additionalPromptForYejinText = '';
    
    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    if (!isConceptRequest) {
        console.log(`[concept:getConceptPhotoReply] 컨셉사진 관련 키워드 없음. null 반환.`);
        return null;
    }

    // 키워드 맵 (길이에 따라 정렬하여 더 구체적인 키워드가 먼저 매칭되도록)
    const conceptKeywordMap = {
        '2월_욕조': '2024_02_07_일본_욕조', 
        '2월_욕실': '2024_02_07_일본_욕실',
        '2월_나비욕조': '2025_02_07_일본_나비욕조',
        '하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '일본_홈스냅': '2024_05_07_일본_홈스냅', 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '일본_결박': '2024_07_08_일본_일본_결박',
        '결박': '2024_07_08_일본_일본_결박',
        '일본_선물': '2023_12_16_일본_선물', 
        '선물': '2023_12_16_일본_선물',
        '한국_셀프_촬영_00028.jpg': '2024_04_28_한국_셀프_촬영_00028.jpg',
        '한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', 
        '셀프_촬영': '2024_04_28_한국_셀프_촬영',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '일본_세미누드': '2025_02_07_일본_세미누드',
        '세미누드': '2025_02_07_일본_세미누드',
        '한국_홈셀프': '2024_12_07_한국_홈셀프',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '한국_북해': '2024_06_06_한국_북해', 
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '일본_필름': '2025_03_일본_필름',
        '모지코_모리룩': '2024_05_05_일본_모지코_모리룩',
        '한국_눈밭_필름_카메라': '2023_12_31_한국_눈밭_필름_카메라',
        '한국_눈밭': '2023_12_31_한국_눈밭',
        '일본_욕실': '2024_02_07_일본_욕실',
        '일본_욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '유카타_마츠리': '2024_08_03_일본_유카타_마츠리',
        '이화마을': '2025_04_29_한국_이화마을',
        '우마시마': '2024_07_06_일본_우마시마',
        '가을_호수공원': '2024_11_7_한국_가을_호수공원',
        '망친_사진': '2024_06_08_한국_망친_사진',
        '일본_교복': '2023_12_15_일본_교복',
        '야간_비눗방울': '2024_05_04_일본_야간_비눗방울',
        '일본_모지코': '2024_12_12_일본_모지코',
        '텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름',
        '야간_롱패딩_00023.jpg': '2024_02_23_한국_야간_롱패딩_00023.jpg',
        '야간_롱패딩': '2024_02_23_한국_야간_롱패딩',
        '을지로_스냅': '2024_09_17_한국_을지로_스냅', 
        '길거리_스냅': '2024_09_16_한국_길거리_스냅',
        '한국_생일_00022.jpg': '2024_02_22_한국_생일_00022.jpg',
        '한국_생일': '2024_02_22_한국_생일',
        '모지코2': '2024_07_06_일본_모지코',
        '야간_보라돌이': '2025_05_04_한국',
        '코야노세': '2025_02_06_일본_코야노세',
        '야간거리': '2024_05_06_일본_야간거리', 
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도',
        '욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        '호리존': '2024_09_11_한국_호리존',
        '여친_스냅': '2024_07_08_일본_여친_스냅',
        '후지엔': '2024_05_03_일본_후지엔',
        '불꽃놀이': '2024_08_02_일본_불꽃놀이', 
        '빨간_기모노': '2024_10_19_일본_빨간_기모노',
        '피크닉': '2024_06_07_한국__피크닉',
        '벗꽃': '2024_04_12_한국_벗꽃',
        '후지_스냅': '2025_05_06_마지막_한국_후지스냅',
        '원미상가_필름': '2024_09_14_한국_원미상가_필름', 
        '밤바_산책': '2025_05_04_한국_밤바_산책',
        '공원_산책': '2025_05_04_한국_공원_산책', 
        '고쿠라_힙': '2025_03_14_일본_고쿠라',
        '온실_여신': '2024_04_13_한국_온실_여신', 
        '을지로_네코': '2025_04_30_한국_을지로',
        '무인역': '2025_03_13_일본_무인역', 
        '화가': '2024_04_13_한국_화가',
        '블랙원피스': '2024_08_04_일본_블랙원피스', 
        '카페': '2024_12_30_한국_카페',
        '일본_텐진_스트리트': '2024_10_17_일본_텐진_스트리트',
        '하카타_스트리트': '2023_12_12_일본_하카타_스트리트',
        '홈스냅_오타쿠': '2025_05_05_한국_홈스냅_오타쿠',
        '야간_동백': '2024_04_12_한국_야간_동백',
        '나르시스트': '2024_12_14_일본_나르시스트', 
        '을지로_캘빈': '2025_04_30_한국_을지로_캘빈',
        '산책_0000009.jpg': '2024_06_09_한국_산책_0000009.jpg',
        '산책_0000109.jpg': '2024_06_09_한국_산책_0000109.jpg',
        '산책': '2024_06_09_한국_산책',
        '오도공원_후지필름': '2024_10_16_일본_오도공원_후지필름', 
        '크리스마스': '2024_12_13_일본_크리스마스',
        '네코_모지코': '2024_02_11_일본_네코_모지코',
        '야간_블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '고스로리_할로윈': '2024_10_16_일본_고스로리_할로윈',
        '게임센터': '2024_05_07_일본_게임센터',
        '동키_거리': '2024_05_02_일본_동키_거리',
        '고쿠라_야간': '2025_03_17_일본_고쿠라',
        '코이노보리': '2024_05_05_일본_코이노보리', 
        '문래동': '2024_04_13_한국_문래동',
        '수국': '2024_05_03_일본_수국',
        '메이드복': '2024_11_08_한국_메이드복',
        '오도공원': '2024_10_16_일본_오도공원',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조'
    };
    
module.exports = {
    getConceptPhotoReply,
    validateImageUrl,
    encodeImageUrl
};
