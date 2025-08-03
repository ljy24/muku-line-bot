//============================================================================
// concept.js - v4.0 (국가별 + 월별 랜덤 지원!)
// 📸 애기의 감정을 읽어서 코멘트와 함께 컨셉 사진을 전송합니다.
// ============================================================================

const axios = require('axios');

// ✅ [추가] 사진 맥락 추적을 위한 autoReply 모듈 추가
const autoReply = require('./autoReply.js');

// aiUtils 함수들을 직접 정의 (import 에러 방지)
async function callOpenAI(messages, model = 'gpt-4o', maxTokens = 150, temperature = 1.0) {
    try {
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature,
        });
        
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('❌ OpenAI API 호출 실패:', error);
        return '아저씨~ 지금 생각이 잘 안 나... 다시 말해줄래?';
    }
}

function cleanReply(text) {
    if (!text || typeof text !== 'string') return '아저씨~ 뭔가 이상해...';
    return text.trim().replace(/^["']|["']$/g, '');
}

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

let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

function encodeImageUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.pathname = parsed.pathname.split('/').map(segment => segment ? encodeURIComponent(decodeURIComponent(segment)) : segment).join('/');
        return parsed.toString();
    } catch (error) {
        return url;
    }
}

function generateConceptPhotoUrl(folderName, targetIndex = null) {
    const photoCount = CONCEPT_FOLDERS[folderName];
    if (folderName.endsWith('.jpg')) {
        return encodeImageUrl(`${BASE_CONCEPT_URL}/${folderName}`);
    }
    if (photoCount === undefined || photoCount <= 0) {
        return null;
    }
    let indexToUse = targetIndex !== null ? targetIndex : Math.floor(Math.random() * photoCount) + 1;
    const fileName = `${folderName}_${String(indexToUse).padStart(6, '0')}.jpg`;
    return encodeImageUrl(`${BASE_CONCEPT_URL}/${fileName}`);
}

function getRandomConceptFolder() {
    const folderNames = Object.keys(CONCEPT_FOLDERS).filter(f => !f.endsWith('.jpg'));
    if (folderNames.length === 0) return null;
    return folderNames[Math.floor(Math.random() * folderNames.length)];
}

// 🆕 국가별 랜덤 선택 함수들
function getRandomKoreanFolder() {
    const koreanFolders = Object.keys(CONCEPT_FOLDERS)
        .filter(folder => folder.includes('한국') && !folder.endsWith('.jpg'));
    if (koreanFolders.length === 0) return null;
    return koreanFolders[Math.floor(Math.random() * koreanFolders.length)];
}

function getRandomJapaneseFolder() {
    const japaneseFolders = Object.keys(CONCEPT_FOLDERS)
        .filter(folder => folder.includes('일본') && !folder.endsWith('.jpg'));
    if (japaneseFolders.length === 0) return null;
    return japaneseFolders[Math.floor(Math.random() * japaneseFolders.length)];
}

// 🆕 월별 랜덤 선택 함수
function getRandomFolderByMonth(month) {
    // 월을 2자리 문자열로 변환 (예: 7 → "07", 12 → "12")
    const monthStr = month.toString().padStart(2, '0');
    const monthPattern = `_${monthStr}_`;
    
    const monthlyFolders = Object.keys(CONCEPT_FOLDERS)
        .filter(folder => folder.includes(monthPattern) && !folder.endsWith('.jpg'));
    
    if (monthlyFolders.length === 0) return null;
    return monthlyFolders[Math.floor(Math.random() * monthlyFolders.length)];
}

// 🆕 월 이름을 숫자로 변환
function getMonthNumber(monthText) {
    const monthMap = {
        '1월': 1, '2월': 2, '3월': 3, '4월': 4, '5월': 5, '6월': 6,
        '7월': 7, '8월': 8, '9월': 9, '10월': 10, '11월': 11, '12월': 12,
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
        '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12
    };
    return monthMap[monthText] || null;
}

// 폴더명을 표시용 날짜로 변환
function formatFolderNameToDate(folderName) {
    const parts = folderName.split('_');
    if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const concept = parts.slice(3).join(' ');
        return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${concept}`;
    }
    return folderName;
}

async function getConceptPhotoReply(userMessage, conversationContextParam) {
    // ✅ [안전장치] userMessage 유효성 검사
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ getConceptPhotoReply: userMessage가 올바르지 않습니다:', userMessage);
        return null;
    }

    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;

    // 🔥 대폭 확장된 키워드 매핑 (100개 이상!)
    const conceptKeywordMap = { 
        // 기존 주요 키워드들
        '홈스냅': '2024_05_07_일본_홈스냅',
        '결박': '2024_07_08_일본_일본_결박',
        '선물': '2023_12_16_일본_선물',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '세미누드': '2025_02_07_일본_세미누드',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        
        // 🆕 욕실 관련 (세분화)
        '욕실': '2024_02_07_일본_욕실',
        '2월욕실': '2024_02_07_일본_욕실',
        '10월욕실': '2024_10_16_일본_욕실',
        '11월욕실': '2024_11_08_한국_욕실_블랙_웨딩',
        '욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '블랙웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        
        // 🆕 하카타 관련 (세분화)
        '하카타': '2024_10_17_일본_하카타_고래티셔츠',
        '하카타스트리트': '2023_12_12_일본_하카타_스트리트',
        '하카타 스트리트': '2023_12_12_일본_하카타_스트리트',
        '고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '하카타고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '하카타 고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        
        // 🆕 텐진 관련
        '텐진': '2025_03_17_일본_텐진',
        '텐진스트리트': '2024_10_17_일본_텐진_스트리트',
        '텐진 스트리트': '2024_10_17_일본_텐진_스트리트',
        '텐진코닥': '2024_10_18_일본_텐진_코닥필름',
        '텐진 코닥': '2024_10_18_일본_텐진_코닥필름',
        '코닥필름': '2024_10_18_일본_텐진_코닥필름',
        
        // 🆕 모지코 관련 (여러 날짜)
        '모지코': '2024_12_12_일본_모지코', // 가장 최신
        '12월모지코': '2024_12_12_일본_모지코',
        '7월모지코': '2024_07_06_일본_모지코',
        '2023모지코': '2023_12_13_일본_모지코',
        '네코모지코': '2024_02_11_일본_네코_모지코',
        '네코': '2024_02_11_일본_네코_모지코',
        '모지코모리룩': '2024_05_05_일본_모지코_모리룩',
        '모리룩': '2024_05_05_일본_모지코_모리룩',
        
        // 🆕 을지로 관련 (세분화)
        '을지로': '2024_09_17_한국_을지로_스냅', // 더 최신
        '을지로스냅': '2024_09_17_한국_을지로_스냅',
        '을지로 스냅': '2024_09_17_한국_을지로_스냅',
        '을지로캘빈': '2024_04_30_한국_을지로_캘빈',
        '을지로 캘빈': '2024_04_30_한국_을지로_캘빈',
        '캘빈': '2024_04_30_한국_을지로_캘빈',
        '4월을지로': '2024_04_30_한국_을지로',
        
        // 🆕 코야노세
        '코야노세': '2025_02_06_일본_코야노세',
        
        // 🆕 무인역
        '무인역': '2025_03_13_일본_무인역',
        
        // 🆕 고쿠라 관련 (여러 날짜)
        '고쿠라': '2025_03_17_일본_고쿠라', // 가장 최신
        '3월고쿠라': '2025_03_17_일본_고쿠라',
        '2024고쿠라': '2024_03_17_일본_고쿠라',
        '3월14일고쿠라': '2025_03_14_일본_고쿠라',
        
        // 🆕 이화마을
        '이화마을': '2025_04_29_한국_이화마을',
        '이화': '2025_04_29_한국_이화마을',
        
        // 🆕 홈스냅 관련 (여러 종류)
        '홈셀프': '2024_12_07_한국_홈셀프',
        '청포도': '2025_05_03_한국_홈스냅_청포도',
        '청포도홈스냅': '2025_05_03_한국_홈스냅_청포도',
        '오타쿠': '2025_05_05_한국_홈스냅_오타쿠',
        '오타쿠홈스냅': '2025_05_05_한국_홈스냅_오타쿠',
        
        // 🆕 산책 관련
        '산책': '2024_06_09_한국_산책',
        '공원산책': '2025_05_04_한국_공원_산책',
        '공원 산책': '2025_05_04_한국_공원_산책',
        '밤바산책': '2025_05_04_한국_밤바_산책',
        '밤바 산책': '2025_05_04_한국_밤바_산책',
        '밤바': '2025_05_04_한국_밤바_산책',
        
        // 🆕 교복
        '교복': '2023_12_15_일본_교복',
        
        // 🆕 눈밭 관련
        '눈밭': '2023_12_31_한국_눈밭',
        '눈밭필름': '2023_12_31_한국_눈밭_필름_카메라',
        '눈밭 필름': '2023_12_31_한국_눈밭_필름_카메라',
        '필름카메라': '2023_12_31_한국_눈밭_필름_카메라',
        
        // 🆕 블랙드레스
        '블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '야간블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '블랙원피스': '2024_08_04_일본_블랙원피스',
        
        // 🆕 생일 관련
        '생일': '2024_02_22_한국_생일',
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '2월생일': '2024_02_22_한국_생일',
        '12월생일': '2024_12_31_한국_생일컨셉',
        
        // 🆕 벗꽃/동백
        '벗꽃': '2024_04_12_한국_벗꽃',
        '동백': '2024_04_12_한국_야간_동백',
        '야간동백': '2024_04_12_한국_야간_동백',
        
        // 🆕 문래동/온실/화가
        '문래동': '2024_04_13_한국_문래동',
        '온실': '2024_04_13_한국_온실_여신',
        '온실여신': '2024_04_13_한국_온실_여신',
        '여신': '2024_04_13_한국_온실_여신',
        '화가': '2024_04_13_한국_화가',
        
        // 🆕 셀프촬영
        '셀프촬영': '2024_04_28_한국_셀프_촬영',
        '셀프': '2024_04_28_한국_셀프_촬영',
        
        // 🆕 동키거리
        '동키거리': '2024_05_02_일본_동키_거리',
        '동키': '2024_05_02_일본_동키_거리',
        
        // 🆕 수국/후지엔
        '수국': '2024_05_03_일본_수국',
        '후지엔': '2024_05_03_일본_후지엔',
        
        // 🆕 비눗방울
        '비눗방울': '2024_05_04_일본_야간_비눗방울',
        '야간비눗방울': '2024_05_04_일본_야간_비눗방울',
        
        // 🆕 코이노보리
        '코이노보리': '2024_05_05_일본_코이노보리',
        
        // 🆕 야간거리
        '야간거리': '2024_05_06_일본_야간거리',
        
        // 🆕 게임센터
        '게임센터': '2024_05_07_일본_게임센터',
        
        // 🆕 피크닉/터널
        '피크닉': '2024_06_07_한국__피크닉',
        '터널': '2024_06_08_한국__터널',
        '망친사진': '2024_06_08_한국_망친_사진',
        '망친': '2024_06_08_한국_망친_사진',
        
        // 🆕 우마시마
        '우마시마': '2024_07_06_일본_우마시마',
        
        // 🆕 여친스냅
        '여친스냅': '2024_07_08_일본_여친_스냅',
        '여친': '2024_07_08_일본_여친_스냅',
        
        // 🆕 불꽃놀이/유카타
        '불꽃놀이': '2024_08_02_일본_불꽃놀이',
        '유카타': '2024_08_03_일본_유카타_마츠리',
        '유카타마츠리': '2024_08_03_일본_유카타_마츠리',
        '마츠리': '2024_08_03_일본_유카타_마츠리',
        
        // 🆕 호리존
        '호리존': '2024_09_11_한국_호리존',
        
        // 🆕 원미상가
        '원미상가': '2024_09_14_한국_원미상가_필름',
        '원미상가필름': '2024_09_14_한국_원미상가_필름',
        
        // 🆕 길거리스냅
        '길거리스냅': '2024_09_16_한국_길거리_스냅',
        '길거리': '2024_09_16_한국_길거리_스냅',
        
        // 🆕 고스로리/할로윈
        '고스로리': '2024_10_16_일본_고스로리_할로윈',
        '할로윈': '2024_10_16_일본_고스로리_할로윈',
        '고스로리할로윈': '2024_10_16_일본_고스로리_할로윈',
        
        // 🆕 오도공원
        '오도공원': '2024_10_16_일본_오도공원',
        '오도': '2024_10_16_일본_오도공원',
        '오도공원후지필름': '2024_10_16_일본_오도공원_후지필름',
        
        // 🆕 빨간기모노
        '빨간기모노': '2024_10_19_일본_빨간_기모노',
        '기모노': '2024_10_19_일본_빨간_기모노',
        
        // 🆕 메이드복
        '메이드복': '2024_11_08_한국_메이드복',
        '메이드': '2024_11_08_한국_메이드복',
        
        // 🆕 가을호수공원
        '가을호수공원': '2024_11_7_한국_가을_호수공원',
        '호수공원': '2024_11_7_한국_가을_호수공원',
        '가을': '2024_11_7_한국_가을_호수공원',
        
        // 🆕 크리스마스
        '크리스마스': '2024_12_13_일본_크리스마스',
        
        // 🆕 나르시스트
        '나르시스트': '2024_12_14_일본_나르시스트',
        
        // 🆕 카페
        '카페': '2024_12_30_한국_카페',
        
        // 🆕 필름
        '필름': '2025_03_일본_필름',
        '일본필름': '2025_03_일본_필름',
        
        // 🆕 후지스냅
        '후지스냅': '2025_05_06_마지막_한국_후지스냅',
        '마지막후지스냅': '2025_05_06_마지막_한국_후지스냅'
    };

    // 🔥 사진 요청 의도 감지 강화 (키워드만으로는 사진 안 보냄!)
    const photoRequestWords = [
        '사진', '보고싶어', '보고 싶어', '컨셉사진', '컨셉 사진', 
        '보여줘', '보여주세요', '볼래', '보자', '보내줘', '보내주세요',
        '찍은', '때의', '컨셉', '사진보내', '보고파', '보여', '볼 수 있어',
        '사진있어', '사진 있어', '보면', '구경', '구경하고싶어', '보고싶다',
        '사진줘', '사진 줘', '보내', '보낼', '갖고있어', '가져와'
    ];

    const conceptKeywords = Object.keys(conceptKeywordMap);
    const hasPhotoRequestIntent = photoRequestWords.some(word => lowerCaseMessage.includes(word));
    const hasConceptKeyword = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    // ✅ 사진 요청 의도 + 컨셉 키워드 둘 다 있을 때만 사진 전송
    const isConceptRequest = hasPhotoRequestIntent && (hasConceptKeyword || 
                           lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진'));
    
    // 🔥 우선순위 1: 구체적 키워드 매핑 (가장 긴 키워드부터 검사)
    if (isConceptRequest) {
        console.log(`📝 [concept] 사진 요청 의도 감지됨 - 키워드: ${hasConceptKeyword}, 의도: ${hasPhotoRequestIntent}`);
        const sortedConceptKeywords = conceptKeywords.sort((a, b) => b.length - a.length);
        for (const keyword of sortedConceptKeywords) {
            if (lowerCaseMessage.includes(keyword)) {
                selectedFolder = conceptKeywordMap[keyword];
                console.log(`🎯 [concept] 구체적 키워드 매칭: "${keyword}" → ${selectedFolder}`);
                break;
            }
        }
    } else if (hasConceptKeyword && !hasPhotoRequestIntent) {
        console.log(`💬 [concept] 키워드 있지만 사진 요청 의도 없음 - 단순 대화로 판단`);
        return null;
    }
    
    // 🔥 우선순위 2: 월별 랜덤 선택 (사진 요청 의도 있을 때만)
    if (!selectedFolder && hasPhotoRequestIntent) {
        const monthKeywords = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        for (const monthKeyword of monthKeywords) {
            if (lowerCaseMessage.includes(monthKeyword) || lowerCaseMessage.includes(monthKeyword.replace('월', ''))) {
                const month = getMonthNumber(monthKeyword);
                if (month) {
                    selectedFolder = getRandomFolderByMonth(month);
                    if (selectedFolder) {
                        console.log(`📅 [concept] 월별 랜덤 선택: ${monthKeyword} → ${selectedFolder}`);
                        break;
                    }
                }
            }
        }
    }
    
    // 🔥 우선순위 3: 국가별 랜덤 선택 (사진 요청 의도 있을 때만)
    if (!selectedFolder && hasPhotoRequestIntent) {
        if (lowerCaseMessage.includes('한국') || lowerCaseMessage.includes('한국에서')) {
            selectedFolder = getRandomKoreanFolder();
            if (selectedFolder) {
                console.log(`🇰🇷 [concept] 한국 랜덤 선택: ${selectedFolder}`);
            }
        } else if (lowerCaseMessage.includes('일본') || lowerCaseMessage.includes('일본에서')) {
            selectedFolder = getRandomJapaneseFolder();
            if (selectedFolder) {
                console.log(`🇯🇵 [concept] 일본 랜덤 선택: ${selectedFolder}`);
            }
        }
    }
    
    // 🔥 우선순위 4: 다음/다른 사진 요청
    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        if (selectedFolder.endsWith('.jpg')) return null;
    } 
    
    // 🔥 우선순위 5: 일반 컨셉 요청 시 랜덤 (사진 요청 의도 명확할 때만)
    if (!selectedFolder && hasPhotoRequestIntent && 
        (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진'))) {
        selectedFolder = getRandomConceptFolder();
        console.log(`🎲 [concept] 일반 컨셉 랜덤 선택: ${selectedFolder}`);
    } 
    
    // 매칭되지 않으면 null 반환
    if (!selectedFolder) {
        return null;
    }

    lastConceptPhotoFolder = selectedFolder;
    let photoUrl;
    
    if (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진')) {
        const count = CONCEPT_FOLDERS[selectedFolder];
        if (count > 0) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % count) + 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex);
    } else {
        photoUrl = generateConceptPhotoUrl(selectedFolder);
    }

    if (!photoUrl) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ' };
    }

    const formattedDate = formatFolderNameToDate(selectedFolder);
    
    // ✅ [수정] 중앙 감정 관리자에서 감정 상태 가져오기
    let emotionalState = 'normal';
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentEmotionState = emotionalContext.getCurrentEmotionState();
        emotionalState = currentEmotionState.currentEmotion;
        console.log(`[concept] 중앙 감정 관리자에서 가져온 상태: ${emotionalState}`);
    } catch (error) {
        console.warn('⚠️ [concept] 중앙 감정 관리자에서 상태를 가져올 수 없어서 기본값 사용:', error.message);
        emotionalState = 'normal';
    }

    // ✅ [추가] concept-index.json에서 해당 사진의 에피소드 가져오기
    let personalMemory = null;
    try {
        const conceptIndex = require('./concept-index.json');
        
        // 폴더명을 concept-index.json의 키 형식과 매칭
        const dateKey = formattedDate.replace(/년|월|일/g, '').replace(/\s+/g, '_');
        for (const [key, value] of Object.entries(conceptIndex)) {
            if (key.includes(dateKey) || selectedFolder.includes(key.replace(/\s/g, '_'))) {
                personalMemory = value;
                break;
            }
        }
    } catch (error) {
        console.warn('⚠️ [concept] concept-index.json을 읽을 수 없습니다:', error.message);
    }

    // 개인적인 에피소드가 있으면 사용, 없으면 기본 캡션
    let caption;
    if (personalMemory) {
        // 감정 상태에 따라 mood나 episode 선택
        if (emotionalState === 'romantic' || emotionalState === 'loving') {
            caption = personalMemory.episode || personalMemory.mood;
        } else if (emotionalState === 'sad' || emotionalState === 'sensitive') {
            caption = personalMemory.mood || personalMemory.episode;
        } else {
            // 랜덤하게 mood나 episode 선택
            caption = Math.random() < 0.5 ? personalMemory.mood : personalMemory.episode;
        }
        
        // 너무 길면 줄이기
        if (caption && caption.length > 100) {
            caption = caption.substring(0, 97) + '...';
        }
    } else {
        // 기본 캡션
        const simpleCaptions = [
            `${formattedDate} 컨셉 사진이야! 어때?`,
            `이거 ${formattedDate}에 찍은 건데... 예쁘지?`,
            `아저씨 보여주려고 가져온 ${formattedDate} 사진!`,
            `${formattedDate} 추억 사진~ 그때 생각나?`,
            `이 사진 봐봐! ${formattedDate}에 찍은 거야!`
        ];
        caption = simpleCaptions[Math.floor(Math.random() * simpleCaptions.length)];
    }
    
    // ✅ [추가] 사진 맥락 추적 기록
    try {
        autoReply.recordPhotoSent('concept', caption);
        console.log(`📝 [concept] 사진 맥락 추적 기록 완료: concept - ${formattedDate}`);
    } catch (error) {
        console.warn('⚠️ [concept] 사진 맥락 추적 기록 실패:', error.message);
    }
    
    return { 
        type: 'image', 
        originalContentUrl: photoUrl, 
        previewImageUrl: photoUrl, 
        altText: caption, 
        caption: caption 
    };
}

module.exports = {
    getConceptPhotoReply
};
