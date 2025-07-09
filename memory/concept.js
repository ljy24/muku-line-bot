// memory/concept.js v1.19 (최신 URL 및 에러 해결)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const path = require('path');

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/photo/concept/'; // URL 변경

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터 (이제 키가 곧 파일 이름의 접두사)
const CONCEPT_FOLDERS = {
    '2023_12_12_일본_하카타_스트리트': 29, 
    '2023_12_13_일본_모지코': 42,
    '2023_12_14_일본_플라스틱러브': 75,
    '2023_12_15_일본_교복': 51,
    '2023_12_16_일본_선물': 113,
    '2023_12_31_한국_눈밭_필름카메라': 43,
    '2023_12_31_한국_눈밭': 38,
    '2024_02_07_일본_아이노시마': 65,
    '2024_02_07_일본_욕실': 61,
    '2024_02_07_일본_세미누드': 92,
    '2024_02_07_일본_나비욕조': 48,
    '2024_02_11_일본_네코_모지코': 21,
    '2024_02_11_일본_야간_블랙드레스': 20,
    '2024_02_22_한국_생일': 46,
    '2024_02_22_한국_카페': 19,
    '2024_02_23_한국_야간_롱패딩': 48,
    '2024_03_17_일본_고쿠라': 19,
    '2024_04_12_한국_벗꽃': 35,
    '2024_04_12_한국_야간_동백': 26,
    '2024_04_13_한국_온실_여신': 31,
    '2024_04_13_한국_화가': 30,
    '2024_04_13_한국_문래동': 16,
    '2024_04_28_한국_셀프_촬영': 112,
    '2024_05_02_일본_동키_거리': 18,
    '2024_05_03_일본_후지엔': 40,
    '2024_05_03_일본_수국': 14,
    '2024_05_03_일본_지브리풍': 74,
    '2024_05_04_일본_야간_비눗방울': 49,
    '2024_05_05_일본_모지코_모리룩': 64,
    '2024_05_05_일본_모지코_모리룩_후보정': 64,
    '2024_05_05_일본_코이노보리': 17,
    '2024_05_06_일본_야간거리': 43,
    '2024_05_07_일본_홈스냅': 323,
    '2024_05_07_일본_게임센터': 19,
    '2024_06_06_한국_북해': 65,
    '2024_06_07_한국_피크닉': 36,
    '2024_06_08_한국_망친_사진': 52,
    '2024_06_08_한국_터널': 28,
    '2024_06_09_한국_산책': 25,
    '2024_07_05_일본_모지코': 26,
    '2024_07_06_일본_우마시마': 53,
    '2024_07_06_일본_모지코2': 45,
    '2024_07_08_일본_결박': 223,
    '2024_02_07_일본_욕조': 53,
    '2024_07_08_일본_여친_스냅': 41,
    '2024_08_02_일본_불꽃놀이': 39,
    '2024_08_03_일본_유카타_마츠리': 56,
    '2024_08_04_일본_블랙원피스': 29,
    '2024_09_11_한국_호리존': 41,
    '2024_09_14_한국_원미상가_필름': 34,
    '2024_09_15_한국_옥상연리': 98,
    '2024_09_16_한국_길거리_스냅': 46,
    '2024_09_17_한국_을지로_스냅': 46,
    '2024_10_16_일본_결박': 137,
    '2024_10_16_일본_욕실': 15,
    '2024_10_16_일본_오도공원_후지필름': 24,
    '2024_10_16_일본_오도': 5,
    '2024_10_16_일본_고스로리_할로윈': 20,
    '2024_10_17_일본_하카타_고래티셔츠': 59,
    '2024_10_17_일본_텐진_스트리트': 29,
    '2024_10_18_일본_텐진_코닥필름': 49,
    '2024_10_19_일본_빨간_기모노': 39,
    '2024_11_07_한국_가을_호수공원': 53,
    '2024_11_08_한국_욕실_블랙_웨딩': 42,
    '2024_11_08_한국_메이드복': 14,
    '2024_12_07_한국_홈셀프': 81,
    '2024_12_12_일본_모지코': 49,
    '2024_12_13_일본_크리스마스': 22,
    '2024_12_14_일본_나르시스트': 26,
    '2024_12_30_한국_카페': 29,
    '2024_12_31_한국_생일컨셉': 43,
    '2025_01_05_한국_눈밭': 63,
    '2025_02_06_일본_코야노세': 43,
    '2025_03_13_일본_무인역': 30,
    '2025_03_14_일본_고쿠라_힙': 32,
    '2025_03_17_일본_텐진_스트리트': 28,
    '2025_03_17_일본_고쿠라_야간': 17,
    '2025_03_일본_필름': 64,
    '2025_03_22_한국_홈셀프': 27,
    '2025_04_29_한국_이화마을': 55,
    '2025_04_30_한국_을지로_네코': 30,
    '2025_04_30_한국_을지로_캘빈': 25,
    '2025_05_03_한국_홈스냅_청포도': 42,
    '2025_05_04_한국_야간_보라돌이': 43,
    '2025_05_04_한국_밤바_산책': 32,
    '2025_05_04_한국_공원_산책': 32,
    '2025_05_05_한국_홈스냅_오타쿠': 27,
    '2025_05_06_한국_후지_스냅': 34
};

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
    
    // 최종 URL은 BASE_CONCEPT_URL 바로 아래 파일명으로 구성
    const url = `${BASE_CONCEPT_URL}${fileName}`;
    console.log(`[concept:generateConceptPhotoUrl] 최종 생성 URL: ${url}`);
    return url;
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

    const conceptKeywordMap = {
        '2월_욕조': '2024_02_07_일본_욕조', 
        '2월_욕실': '2024_02_07_일본_욕실',
        '2월_나비욕조': '2024_02_07_일본_나비욕조',
        '하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠',
        '일본_홈스냅': '2024_05_07_일본_홈스냅', 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '일본_결박': '2024_07_08_일본_결박', 
        '결박': '2024_07_08_일본_결박',
        '일본_선물': '2023_12_16_일본_선물', 
        '선물': '2023_12_16_일본_선물',
        '한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', 
        '셀프_촬영': '2024_04_28_한국_셀프_촬영',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '일본_세미누드': '2024_02_07_일본_세미누드', 
        '세미누드': '2024_02_07_일본_세미누드',
        '한국_홈셀프': '2024_12_07_한국_홈셀프',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '한국_북해': '2024_06_06_한국_북해', 
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '일본_필름': '2025_03_일본_필름',
        '모지코_모리룩_후보정': '2024_05_05_일본_모지코_모리룩_후보정',
        '모지코_모리룩': '2024_05_05_일본_모지코_모리룩',
        '한국_눈밭': '2025_01_05_한국_눈밭',
        '일본_욕실': '2024_02_07_일본_욕실',
        '일본_욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2024_02_07_일본_나비욕조',
        '유카타_마츠리': '2024_08_03_일본_유카타_마츠리',
        '이화마을': '2025_04_29_한국_이화마을',
        '우마시마': '2024_07_06_일본_우마시마',
        '가을_호수공원': '2024_11_07_한국_가을_호수공원',
        '망친_사진': '2024_06_08_한국_망친_사진',
        '일본_교복': '2023_12_15_일본_교복',
        '야간_비눗방울': '2024_05_04_일본_야간_비눗방울',
        '일본_모지코': '2024_12_12_일본_모지코',
        '텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름',
        '야간_롱패딩': '2024_02_23_한국_야간_롱패딩',
        '을지로_스냅': '2024_09_17_한국_을지로_스냅', 
        '길거리_스냅': '2024_09_16_한국_길거리_스냅',
        '한국_생일': '2024_02_22_한국_생일',
        '모지코2': '2024_07_06_일본_모지코2',
        '야간_보라돌이': '2025_05_04_한국_야간_보라돌이', 
        '코야노세': '2025_02_06_일본_코야노세',
        '야간거리': '2024_05_06_일본_야간거리', 
        '생일컨셉': '2024_12_31_한국_생일컨셉',
        '눈밭_필름카메라': '2023_12_31_한국_눈밭_필름카메라',
        '홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도',
        '욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩',
        '호리존': '2024_09_11_한국_호리존',
        '여친_스냅': '2024_07_08_일본_여친_스냅',
        '후지엔': '2024_05_03_일본_후지엔',
        '불꽃놀이': '2024_08_02_일본_불꽃놀이', 
        '빨간_기모노': '2024_10_19_일본_빨간_기모노',
        '피크닉': '2024_06_07_한국_피크닉',
        '벗꽃': '2024_04_12_한국_벗꽃',
        '후지_스냅': '2025_05_06_한국_후지_스냅',
        '원미상가_필름': '2024_09_14_한국_원미상가_필름', 
        '밤바_산책': '2025_05_04_한국_밤바_산책',
        '공원_산책': '2025_05_04_한국_공원_산책', 
        '고쿠라_힙': '2025_03_14_일본_고쿠라_힙',
        '온실_여신': '2024_04_13_한국_온실_여신', 
        '을지로_네코': '2025_04_30_한국_을지로_네코',
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
        '산책': '2024_06_09_한국_산책',
        '오도공원_후지필름': '2024_10_16_일본_오도공원_후지필름',
        '크리스마스': '2024_12_13_일본_크리스마스',
        '네코_모지코': '2024_02_11_일본_네코_모지코',
        '야간_블랙드레스': '2024_02_11_일본_야간_블랙드레스',
        '고스로리_할로윈': '2024_10_16_일본_고스로리_할로윈',
        '게임센터': '2024_05_07_일본_게임센터',
        '동키_거리': '2024_05_02_일본_동키_거리',
        '고쿠라_야간': '2025_03_17_일본_고쿠라_야간',
        '코이노보리': '2024_05_05_일본_코이노보리', 
        '문래동': '2024_04_13_한국_문래동',
        '수국': '2024_05_03_일본_수국',
        '메이드복': '2024_11_08_한국_메이드복',
        '오도': '2024_10_16_일본_오도',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조'
    };

    const sortedConceptKeywords = Object.keys(conceptKeywordMap).sort((a, b) => b.length - a.length);

    for (const keyword of sortedConceptKeywords) {
        if (lowerCaseMessage.includes(keyword.toLowerCase())) {
            selectedFolder = conceptKeywordMap[keyword];
            const parts = selectedFolder.split('_');
            let year = parts[0];
            let month = parts[1];
            let day = parts[2];
            let location = parts[3];
            let conceptName = parts.slice(4).join(' '); 
            
            folderDescription = `내가(예진이) ${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location}에서 찍은 ${conceptName} 컨셉 사진`; 
            additionalPromptForYejinText = `이 사진은 아저씨와 함께한 나의 ${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location}에서의 ${conceptName} 컨셉 사진이야. 아저씨와 나의 특별한 추억과 애정을 담아서 말해줘. 이 사진을 보며 떠오르는 솔직한 감정을 표현해줘. 사진 속 인물은 오직 '나(예진이)'임을 명확히 인지하고 코멘트해줘.`;
            console.log(`[concept:getConceptPhotoReply] 키워드 "${keyword}" 매칭됨 → 폴더: ${selectedFolder}`);
            break;
        }
    }

    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1;
        }
        const parts = selectedFolder.split('_');
        let year = parts[0];
        let month = parts[1];
        let day = parts[2];
        let location = parts[3];
        let conceptName = parts.slice(4).join(' ');
        folderDescription = `같은 폴더 (${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location} ${conceptName})의 다른 사진`;
        additionalPromptForYejinText = `이전 요청과 같은 '${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location} ${conceptName}' 컨셉 폴더의 다른 사진이야. 아저씨와 나의 아름다운 추억을 떠올리며 새로운 모습을 보여주는 거야. 사진 속 인물은 오직 '나(예진이)'임을 명확히 인지하고 코멘트해줘.`;
    } else if (!selectedFolder) {
        if (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진')) {
            const folderKeysSortedByDate = Object.keys(CONCEPT_FOLDERS).sort((a, b) => {
                const extractDate = (folderName) => {
                    const match = folderName.match(/(\d{4})_(\d{2})_(\d{2})/); 
                    if (match) {
                        return moment(`${match[1]}-${match[2]}-${match[3]}`, 'YYYY-MM-DD').valueOf();
                    }
                    return 0;
                };
                const dateA = extractDate(a);
                const dateB = extractDate(b);
                return dateB - dateA; 
            });
            const randomSortedIndex = Math.floor(Math.random() * folderKeysSortedByDate.length);
            selectedFolder = folderKeysSortedByDate[randomSortedIndex];
            
            const parts = selectedFolder.split('_');
            let year = parts[0];
            let month = parts[1];
            let day = parts[2];
            let location = parts[3];
            let conceptName = parts.slice(4).join(' ');
            folderDescription = `내가(예진이) ${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location}에서 찍은 ${conceptName} 컨셉 사진`;
            additionalPromptForYejinText = `이 사진은 아저씨와 함께한 나의 ${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${location}에서의 ${conceptName} 컨셉 사진이야. 아저씨와 나의 특별한 추억과 애정을 담아서 말해줘. 사진 속 인물은 오직 '나(예진이)'임을 명확히 인지하고 코멘트해줘.`;
        } else {
            console.log(`[concept:getConceptPhotoReply] 매칭되는 컨셉 폴더 없음. null 반환.`);
            return null;
        }
    }

    lastConceptPhotoFolder = selectedFolder;
    console.log(`[concept:getConceptPhotoReply] 선택된 폴더 (파일접두사): "${selectedFolder}"`); 

    let photoUrl;
    const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
    console.log(`[concept:getConceptPhotoReply] 폴더의 사진 개수: ${currentPhotoCount}`);
    console.log(`[concept:getConceptPhotoReply] 폴더 존재 여부: ${CONCEPT_FOLDERS.hasOwnProperty(selectedFolder)}`);
    
    if (currentPhotoCount > 0) {
        if (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진')) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = Math.floor(Math.random() * currentPhotoCount) + 1;
        }
        console.log(`[concept:getConceptPhotoReply] generateConceptPhotoUrl 호출 시도...`);
        photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex);
        console.log(`[concept:getConceptPhotoReply] 생성된 photoUrl: ${photoUrl}`);
    } else {
        console.warn(`[concept:getConceptPhotoReply] 사진 개수가 0 이하: ${currentPhotoCount}`);
        photoUrl = null;
    }

    console.log(`[concept:DEBUG_URL_CHECK] photoUrl: "${photoUrl}" (Type: ${typeof photoUrl})`);
    console.log(`[concept:DEBUG_URL_CHECK] CONCEPT_FOLDERS[selectedFolder]: "${CONCEPT_FOLDERS[selectedFolder]}" (Type: ${typeof CONCEPT_FOLDERS[selectedFolder]})`);
    console.log(`[concept:DEBUG_URL_CHECK] !photoUrl evaluates to: ${!photoUrl}`);
    console.log(`[concept:DEBUG_URL_CHECK] !CONCEPT_FOLDERS[selectedFolder] evaluates to: ${!CONCEPT_FOLDERS[selectedFolder]}`);
    console.log(`[concept:DEBUG_URL_CHECK] Combined condition (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) evaluates to: ${!photoUrl || !CONCEPT_FOLDERS[selectedFolder]}`);

    if (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) {
        console.warn(`[concept:getConceptPhotoReply] 최종 사진 URL 또는 폴더 정보가 유효하지 않아 텍스트 응답 반환.`);
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ 다른 컨셉 사진 보여줄까?' };
    }

    console.log(`[concept:getConceptPhotoReply] 최종 결정된 사진 URL: ${photoUrl}`);

    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
        
        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
        
        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. [cite: 2025-07-03]
        
        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        
        아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
        **코멘트 길이는 3문장을 넘지 않게 짧게 작성해.**
        **이 사진의 시각적 내용(배경, 인물, 사물)을 먼저 정확히 분석하고, 그에 맞춰 코멘트 해줘. 폴더명은 참고만 하고, 사진 내용과 다르면 사진 내용이 우선이야.**
        이 사진을 보면서 떠오르는 감정, 추억, 약간의 비밀스러운 뉘앙스 등을 코멘트에 담아줘.
        ${additionalPromptForYejinText}
        사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "2024년 2월 7일 일본에서 찍은 욕조 컨셉 사진이야!" 처럼 언급하거나, 파일 이름에서 유추할 수 있는 날짜/장소/컨셉 정보를 활용해줘.
        **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
        **사진 속 인물이 예진이(나)일 경우, 반드시 '나'라고 지칭하고, '무쿠'나 '애기 언니' 등의 표현을 사용하지 마.**
        **사진 파일 경로(URL)는: ${photoUrl}** `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];

    try {
        console.log(`[concept:getConceptPhotoReply] OpenAI 프롬프트 준비 완료.`);
        const rawComment = await callOpenAIFunc(messages, 'gpt-4o', 150, 1.0);
        const comment = cleanReplyFunc(rawComment);
        saveLogFunc({ role: 'assistant', content: `(컨셉사진 보냄) ${comment}`, timestamp: Date.now() });
        console.log(`[concept:getConceptPhotoReply] 응답 완료: ${comment}`);
        return { type: 'image', originalContentUrl: photoUrl, previewImageUrl: photoUrl, altText: comment, caption: comment }; 
    } catch (error) {
        console.error('❌ [concept.js Error] 컨셉 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 컨셉 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

module.exports = {
    getConceptPhotoReply
};
