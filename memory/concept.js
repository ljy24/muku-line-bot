// memory/concept.js v3.1 (concept-index.json의 'concepts' 및 'folders' 키 분리 활용)
// [기능] 컨셉별 상세 설명(mood/episode)과 폴더별 사진 개수를 분리하여 관리하고, 여러 장의 사진을 동적으로 제공

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { callOpenAI, cleanReply } = require('../src/aiUtils');

// 📁 기본 URL 설정
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/photo/concept/';

// 📁 concept-index.json 경로 지정
const CONCEPT_INDEX_FILE = path.join(__dirname, '..', 'data', 'memory', 'concept-index.json');

// ✅ 메모리에서 concept-index.json 불러오기
let conceptIndex = {}; // 전체 JSON 데이터
let CONCEPT_FOLDERS = {}; // 폴더별 사진 개수 데이터 (conceptIndex.folders)
let CONCEPT_DETAILS = {}; // 컨셉 상세 정보 (conceptIndex.concepts)

async function loadConceptIndex() {
    try {
        const data = await fs.readFile(CONCEPT_INDEX_FILE, 'utf-8');
        const parsedData = JSON.parse(data);
        conceptIndex = parsedData; // 전체 JSON 데이터를 저장

        if (parsedData.folders) {
            CONCEPT_FOLDERS = parsedData.folders;
        } else {
            console.warn('⚠️ [concept.js] concept-index.json에 "folders" 키가 없습니다. 폴더별 사진 개수 데이터가 누락될 수 있습니다.');
            // 'folders' 키가 없는 경우에 대비한 백업 데이터 (이전 하드코딩 데이터를 그대로 사용)
            CONCEPT_FOLDERS = {
                "2023_12_12_일본_하카타_스트리트": 29, "2023_12_13_일본_모지코": 42, "2023_12_14_일본_플라스틱러브": 75,
                "2023_12_15_일본_교복": 51, "2023_12_16_일본_선물": 113, "2023_12_31_한국_눈밭": 38,
                "2023_12_31_한국_눈밭_필름_카메라": 43, "2024_02_07_일본_아이노시마": 65, "2024_02_07_일본_욕실": 61,
                "2024_02_11_일본_네코_모지코": 21, "2024_02_11_일본_야간_블랙드레스": 31, "2024_02_22_한국_생일": 45,
                "2024_02_22_한국_생일_00022.jpg": 1, "2024_02_22_한국_카페": 19, "2024_02_23_한국_야간_롱패딩": 47,
                "2024_02_23_한국_야간_롱패딩_00023.jpg": 1, "2024_03_17_일본_고쿠라": 19, "2024_04_12_한국_벗꽃": 35,
                "2024_04_12_한국_야간_동백": 26, "2024_04_13_한국_문래동": 16, "2024_04_13_한국_온실_여신": 31,
                "2024_04_13_한국_화가": 30, "2024_04_28_한국_셀프_촬영": 111, "2024_04_28_한국_셀프_촬영_00028.jpg": 1,
                "2024_05_02_일본_동키_거리": 18, "2024_05_03_일본_수국": 14, "2024_05_03_일본_지브리풍": 74,
                "2024_05_03_일본_후지엔": 40, "2024_05_04_일본_야간_비눗방울": 49, "2024_05_05_일본_모지코_모리룩": 64,
                "2024_05_05_일본_코이노보리": 17, "2024_05_06_일본_야간거리": 43, "2024_05_07_일본_게임센터": 19,
                "2024_05_07_일본_홈스냅": 323, "2024_06_06_한국_북해": 65, "2024_06_07_한국__피크닉": 36,
                "2024_06_08_한국__터널": 28, "2024_06_08_한국_망친_사진": 52, "2024_06_09_한국_산책": 23,
                "2024_06_09_한국_산책_0000009.jpg": 1, "2024_06_09_한국_산책_0000109.jpg": 1,
                "2024_07_05_일본_모지코": 26, "2024_07_06_일본_모지코": 45, "2024_07_06_일본_우마시마": 53,
                "2024_07_08_일본_여친_스냅": 41, "2024_07_08_일본_욕조": 53, "2024_07_08_일본_일본_결박": 223,
                "2024_08_02_일본_불꽃놀이": 39, "2024_08_03_일본_유카타_마츠리": 56, "2024_08_04_일본_블랙원피스": 29,
                "2024_09_11_한국_호리존": 41, "2024_09_14_한국_원미상가_필름": 34, "2024_09_15_한국_옥상연리": 98,
                "2024_09_16_한국_길거리_스냅": 46, "2024_09_17_한국_을지로_스냅": 46, "2024_10_16_일본_결박": 137,
                "2024_10_16_일본_고스로리_할로윈": 20, "2024_10_16_일본_오도공원": 5, "2024_10_16_일본_오도공원_후지필름": 24,
                "2024_10_16_일본_욕실": 15, "2024_10_17_일본_텐진_스트리트": 29, "2024_10_17_일본_하카타_고래티셔츠": 59,
                "2024_10_18_일본_텐진_코닥필름": 49, "2024_10_19_일본_빨간_기모노": 39, "2024_11_08_한국_메이드복": 14,
                "2024_11_08_한국_욕실_블랙_웨딩": 42, "2024_11_7_한국_가을_호수공원": 53, "2024_12_07_한국_홈셀프": 81,
                "2024_12_12_일본_모지코": 49, "2024_12_13_일본_크리스마스": 22, "2024_12_14_일본_나르시스트": 26,
                "2024_12_30_한국_카페": 29, "2024_12_31_한국_생일컨셉": 43, "2025_01_05_한국": 63,
                "2025_02_06_일본_코야노세": 43, "2025_02_07_일본_나비욕조": 48, "2025_02_07_일본_세미누드": 92,
                "2025_03_13_일본_무인역": 30, "2025_03_14_일본_고쿠라": 32, "2025_03_17_일본_고쿠라": 17,
                "2025_03_17_일본_텐진": 28, "2025_03_22": 27, "2025_03_일본_필름": 64, "2025_04_29_한국_이화마을": 55,
                "2025_04_30_한국_을지로": 30, "2025_04_30_한국_을지로_캘빈": 25, "2025_05_03_한국_홈스냅_청포도": 42,
                "2025_05_04_한국": 43, "2025_05_04_한국_공원_산책": 32, "2025_05_04_한국_밤바_산책": 32,
                "2025_05_05_한국_홈스냅_오타쿠": 27, "2025_05_06_마지막_한국_후지스냅": 34
            };
        }

        if (parsedData.concepts) {
            CONCEPT_DETAILS = parsedData.concepts;
        } else {
            console.warn('⚠️ [concept.js] concept-index.json에 "concepts" 키가 없습니다. 컨셉 상세 정보가 누락될 수 있습니다.');
            CONCEPT_DETAILS = {};
        }
        console.log(`✅ [concept.js] 컨셉 인덱스 파일(${CONCEPT_INDEX_FILE}) 성공적으로 로드됨.`);
    } catch (error) {
        console.error('❌ [concept.js] concept-index.json 불러오기 실패:', error);
        conceptIndex = {}; 
        CONCEPT_FOLDERS = {
            "2023_12_12_일본_하카타_스트리트": 29, "2023_12_13_일본_모지코": 42, "2023_12_14_일본_플라스틱러브": 75,
            "2023_12_15_일본_교복": 51, "2023_12_16_일본_선물": 113, "2023_12_31_한국_눈밭": 38,
            "2023_12_31_한국_눈밭_필름_카메라": 43, "2024_02_07_일본_아이노시마": 65, "2024_02_07_일본_욕실": 61,
            "2024_02_11_일본_네코_모지코": 21, "2024_02_11_일본_야간_블랙드레스": 31, "2024_02_22_한국_생일": 45,
            "2024_02_22_한국_생일_00022.jpg": 1, "2024_02_22_한국_카페": 19, "2024_02_23_한국_야간_롱패딩": 47,
            "2024_02_23_한국_야간_롱패딩_00023.jpg": 1, "2024_03_17_일본_고쿠라": 19, "2024_04_12_한국_벗꽃": 35,
            "2024_04_12_한국_야간_동백": 26, "2024_04_13_한국_문래동": 16, "2024_04_13_한국_온실_여신": 31,
            "2024_04_13_한국_화가": 30, "2024_04_28_한국_셀프_촬영": 111, "2024_04_28_한국_셀프_촬영_00028.jpg": 1,
            "2024_05_02_일본_동키_거리": 18, "2024_05_03_일본_수국": 14, "2024_05_03_일본_지브리풍": 74,
            "2024_05_03_일본_후지엔": 40, "2024_05_04_일본_야간_비눗방울": 49, "2024_05_05_일본_모지코_모리룩": 64,
            "2024_05_05_일본_코이노보리": 17, "2024_05_06_일본_야간거리": 43, "2024_05_07_일본_게임센터": 19,
            "2024_05_07_일본_홈스냅": 323, "2024_06_06_한국_북해": 65, "2024_06_07_한국__피크닉": 36,
            "2024_06_08_한국__터널": 28, "2024_06_08_한국_망친_사진": 52, "2024_06_09_한국_산책": 23,
            "2024_06_09_한국_산책_0000009.jpg": 1, "2024_06_09_한국_산책_0000109.jpg": 1,
            "2024_07_05_일본_모지코": 26, "2024_07_06_일본_모지코": 45, "2024_07_06_일본_우마시마": 53,
            "2024_07_08_일본_여친_스냅": 41, "2024_07_08_일본_욕조": 53, "2024_07_08_일본_일본_결박": 223,
            "2024_08_02_일본_불꽃놀이": 39, "2024_08_03_일본_유카타_마츠리": 56, "2024_08_04_일본_블랙원피스": 29,
            "2024_09_11_한국_호리존": 41, "2024_09_14_한국_원미상가_필름": 34, "2024_09_15_한국_옥상연리": 98,
            "2024_09_16_한국_길거리_스냅": 46, "2024_09_17_한국_을지로_스냅": 46, "2024_10_16_일본_결박": 137,
            "2024_10_16_일본_고스로리_할로윈": 20, "2024_10_16_일본_오도공원": 5, "2024_10_16_일본_오도공원_후지필름": 24,
            "2024_10_16_일본_욕실": 15, "2024_10_17_일본_텐진_스트리트": 29, "2024_10_17_일본_하카타_고래티셔츠": 59,
            "2024_10_18_일본_텐진_코닥필름": 49, "2024_10_19_일본_빨간_기모노": 39, "2024_11_08_한국_메이드복": 14,
            "2024_11_08_한국_욕실_블랙_웨딩": 42, "2024_11_7_한국_가을_호수공원": 53, "2024_12_07_한국_홈셀프": 81,
            "2024_12_12_일본_모지코": 49, "2024_12_13_일본_크리스마스": 22, "2024_12_14_일본_나르시스트": 26,
            "2024_12_30_한국_카페": 29, "2024_12_31_한국_생일컨셉": 43, "2025_01_05_한국": 63,
            "2025_02_06_일본_코야노세": 43, "2025_02_07_일본_나비욕조": 48, "2025_02_07_일본_세미누드": 92,
            "2025_03_13_일본_무인역": 30, "2025_03_14_일본_고쿠라": 32, "2025_03_17_일본_고쿠라": 17,
            "2025_03_17_일본_텐진": 28, "2025_03_22": 27, "2025_03_일본_필름": 64, "2025_04_29_한국_이화마을": 55,
            "2025_04_30_한국_을지로": 30, "2025_04_30_한국_을지로_캘빈": 25, "2025_05_03_한국_홈스냅_청포도": 42,
            "2025_05_04_한국": 43, "2025_05_04_한국_공원_산책": 32, "2025_05_04_한국_밤바_산책": 32,
            "2025_05_05_한국_홈스냅_오타쿠": 27, "2025_05_06_마지막_한국_후지스냅": 34
        };
        CONCEPT_DETAILS = {};
    }
}
loadConceptIndex(); // 서버 시작 시 자동 실행

// ✅ URL 인코딩 처리
function encodeImageUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.pathname = parsed.pathname.split('/').map(segment => segment ? encodeURIComponent(decodeURIComponent(segment)) : segment).join('/');
        return parsed.toString();
    } catch (error) {
        return url;
    }
}

// ✅ 사진 파일명 생성
// 이 함수는 실제 폴더명(CONCEPT_FOLDERS의 키)과 인덱스를 사용하여 이미지 URL을 생성합니다.
function generateConceptPhotoUrl(actualFolderName, targetIndex = null) {
    const photoCount = CONCEPT_FOLDERS[actualFolderName]; // 실제 폴더명으로 사진 개수 조회
    
    // 특정 .jpg 파일 경로가 직접 주어진 경우 (예: "2024_02_22_한국_생일_00022.jpg")
    // 이 경우는 concept-index.json의 folders에 직접 .jpg 파일명으로 1개가 등록되어야 함
    if (actualFolderName.endsWith('.jpg')) {
        return encodeImageUrl(`${BASE_CONCEPT_URL}${actualFolderName}`);
    }

    // 폴더 이름이 유효하지 않거나 사진이 없는 경우
    if (photoCount === undefined || photoCount <= 0) {
        console.warn(`⚠️ [generateConceptPhotoUrl] 폴더 "${actualFolderName}"의 사진 개수 정보가 없거나 유효하지 않습니다.`);
        return null;
    }
    
    let indexToUse = targetIndex !== null ? targetIndex : Math.floor(Math.random() * photoCount) + 1;
    // 파일명 형식: 실제폴더명_000001.jpg
    const fileName = `${actualFolderName}_${String(indexToUse).padStart(6, '0')}.jpg`;
    return encodeImageUrl(`${BASE_CONCEPT_URL}${fileName}`);
}

// ✅ 랜덤 폴더 선택
function getRandomConceptFolder() {
    // CONCEPT_FOLDERS의 키 중에서 .jpg로 끝나지 않는 (즉, 폴더 이름인) 것들만 필터링
    const folderNames = Object.keys(CONCEPT_FOLDERS).filter(f => !f.endsWith('.jpg'));
    if (folderNames.length === 0) return null;
    
    // 랜덤으로 실제 폴더명(예: "2024_09_15_한국_옥상연리")을 선택
    const randomFolderName = folderNames[Math.floor(Math.random() * folderNames.length)];

    // 선택된 실제 폴더명에 해당하는 컨셉 상세 정보를 찾아 그 컨셉명(키)을 반환
    // (사용자 친화적인 컨셉명을 찾아야 하므로 CONCEPT_DETAILS를 역으로 검색하거나,
    //  CONCEPT_DETAILS의 키를 직접 랜덤으로 선택하는 것이 더 간단할 수 있음)
    // 여기서는 CONCEPT_DETAILS의 키(사용자 친화적인 컨셉명)를 랜덤으로 선택하도록 변경
    const conceptKeys = Object.keys(CONCEPT_DETAILS);
    if (conceptKeys.length === 0) return null;
    return conceptKeys[Math.floor(Math.random() * conceptKeys.length)];
}


let lastConceptKey = null; // 마지막으로 선택된 컨셉의 키 (예: "2024년 9월 15일 한국 옥상연리")
let lastConceptPhotoIndex = 0; // 해당 컨셉 폴더 내의 사진 인덱스

// ✅ 메인 함수: 사용자 메시지에 따라 컨셉 사진 응답 생성
async function getConceptPhotoReply(userMessage, conversationContext) { // saveLog, callOpenAI, cleanReply는 여기서 직접 사용
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedConceptKey = null; // 선택된 컨셉의 키 (예: "2024년 9월 15일 한국 옥상연리")

    // 컨셉 키워드 매핑 (사용자 입력 키워드 -> CONCEPT_DETAILS의 키)
    // CONCEPT_DETAILS의 모든 키를 키워드 매핑에 포함시켜서 사용자가 직접 컨셉명을 말할 때 찾도록 함
    const conceptKeywordMap = {};
    Object.keys(CONCEPT_DETAILS).forEach(key => {
        conceptKeywordMap[key.toLowerCase()] = key; // "2024년 9월 15일 한국 옥상연리" -> "2024년 9월 15일 한국 옥상연리"
        // 추가적으로 짧은 키워드 매핑도 여기에 포함 가능 (예: '옥상연리': '2024년 9월 15일 한국 옥상연리')
        if (key.includes('옥상연리')) conceptKeywordMap['옥상연리'] = key;
        if (key.includes('하카타 스트리트')) conceptKeywordMap['하카타 스트리트'] = key;
        if (key.includes('교복')) conceptKeywordMap['교복'] = key;
        if (key.includes('눈밭 필름카메라')) conceptKeywordMap['눈밭 필름카메라'] = key;
        if (key.includes('아이노시마')) conceptKeywordMap['아이노시마'] = key;
        if (key.includes('욕실')) conceptKeywordMap['욕실'] = key;
        if (key.includes('네코 모지코')) conceptKeywordMap['네코 모지코'] = key;
        if (key.includes('블랙드레스')) conceptKeywordMap['블랙드레스'] = key;
        if (key.includes('생일')) conceptKeywordMap['생일'] = key;
        if (key.includes('카페')) conceptKeywordMap['카페'] = key;
        if (key.includes('야간 롱패딩')) conceptKeywordMap['야간 롱패딩'] = key;
        if (key.includes('고쿠라')) conceptKeywordMap['고쿠라'] = key;
        if (key.includes('벚꽃')) conceptKeywordMap['벚꽃'] = key;
        if (key.includes('야간 동백')) conceptKeywordMap['야간 동백'] = key;
        if (key.includes('문래동')) conceptKeywordMap['문래동'] = key;
        if (key.includes('온실-여신')) conceptKeywordMap['온실-여신'] = key;
        if (key.includes('화가')) conceptKeywordMap['화가'] = key;
        if (key.includes('셀프 촬영')) conceptKeywordMap['셀프 촬영'] = key;
        if (key.includes('동키 거리')) conceptKeywordMap['동키 거리'] = key;
        if (key.includes('수국')) conceptKeywordMap['수국'] = key;
        if (key.includes('지브리풍')) conceptKeywordMap['지브리풍'] = key;
        if (key.includes('후지엔')) conceptKeywordMap['후지엔'] = key;
        if (key.includes('야간 비눗방울')) conceptKeywordMap['야간 비눗방울'] = key;
        if (key.includes('코이노보리')) conceptKeywordMap['코이노보리'] = key;
        if (key.includes('모리룩')) conceptKeywordMap['모리룩'] = key;
        if (key.includes('야간거리')) conceptKeywordMap['야간거리'] = key;
        if (key.includes('게임센터')) conceptKeywordMap['게임센터'] = key;
        if (key.includes('홈스냅')) conceptKeywordMap['홈스냅'] = key;
        if (key.includes('북해')) conceptKeywordMap['북해'] = key;
        if (key.includes('피크닉')) conceptKeywordMap['피크닉'] = key;
        if (key.includes('망친 사진')) conceptKeywordMap['망친 사진'] = key;
        if (key.includes('터널')) conceptKeywordMap['터널'] = key;
        if (key.includes('산책')) conceptKeywordMap['산책'] = key;
        if (key.includes('모지코')) conceptKeywordMap['모지코'] = key;
        if (key.includes('우마시마')) conceptKeywordMap['우마시마'] = key;
        if (key.includes('결박')) conceptKeywordMap['결박'] = key;
        if (key.includes('여친 스냅')) conceptKeywordMap['여친 스냅'] = key;
        if (key.includes('불꽃놀이')) conceptKeywordMap['불꽃놀이'] = key;
        if (key.includes('유카타 마츠리')) conceptKeywordMap['유카타 마츠리'] = key;
        if (key.includes('블랙원피스')) conceptKeywordMap['블랙원피스'] = key;
        if (key.includes('호리존')) conceptKeywordMap['호리존'] = key;
        if (key.includes('원미상가')) conceptKeywordMap['원미상가'] = key;
        if (key.includes('길거리 스냅')) conceptKeywordMap['길거리 스냅'] = key;
        if (key.includes('을지로 스냅')) conceptKeywordMap['을지로 스냅'] = key;
        if (key.includes('고스로리 할로윈')) conceptKeywordMap['고스로리 할로윈'] = key;
        if (key.includes('하카타 고래티셔츠')) conceptKeywordMap['하카타 고래티셔츠'] = key;
        if (key.includes('텐진 스트리트')) conceptKeywordMap['텐진 스트리트'] = key;
        if (key.includes('텐진 코닥필름')) conceptKeywordMap['텐진 코닥필름'] = key;
        if (key.includes('빨간 기모노')) conceptKeywordMap['빨간 기모노'] = key;
        if (key.includes('가을 호수공원')) conceptKeywordMap['가을 호수공원'] = key;
        if (key.includes('욕실 블랙 웨딩')) conceptKeywordMap['욕실 블랙 웨딩'] = key;
        if (key.includes('메이드복')) conceptKeywordMap['메이드복'] = key;
        if (key.includes('홈셀프')) conceptKeywordMap['홈셀프'] = key;
        if (key.includes('크리스마스')) conceptKeywordMap['크리스마스'] = key;
        if (key.includes('나르시스트')) conceptKeywordMap['나르시스트'] = key;
        if (key.includes('카페')) conceptKeywordMap['카페'] = key; // 중복 제거 필요
        if (key.includes('생일컨셉')) conceptKeywordMap['생일컨셉'] = key;
        if (key.includes('눈밭')) conceptKeywordMap['눈밭'] = key; // 중복 제거 필요
        if (key.includes('코야노세')) conceptKeywordMap['코야노세'] = key;
        if (key.includes('세미누드')) conceptKeywordMap['세미누드'] = key;
        if (key.includes('나비욕조')) conceptKeywordMap['나비욕조'] = key;
        if (key.includes('무인역')) conceptKeywordMap['무인역'] = key;
        if (key.includes('고쿠라 힙')) conceptKeywordMap['고쿠라 힙'] = key;
        if (key.includes('고쿠라 야간')) conceptKeywordMap['고쿠라 야간'] = key;
        if (key.includes('필름')) conceptKeywordMap['필름'] = key; // 중복 제거 필요
        if (key.includes('을지로 네코')) conceptKeywordMap['을지로 네코'] = key;
        if (key.includes('을지로 캘빈')) conceptKeywordMap['을지로 캘빈'] = key;
        if (key.includes('청포도')) conceptKeywordMap['청포도'] = key;
        if (key.includes('보라돌이')) conceptKeywordMap['보라돌이'] = key;
        if (key.includes('밤바 산책')) conceptKeywordMap['밤바 산책'] = key;
        if (key.includes('공원 산책')) conceptKeywordMap['공원 산책'] = key;
        if (key.includes('오타쿠')) conceptKeywordMap['오타쿠'] = key;
        if (key.includes('후지 스냅')) conceptKeywordMap['후지 스냅'] = key;
    });

    const isConceptRequest = Object.keys(conceptKeywordMap).some(keyword => lowerCaseMessage.includes(keyword.toLowerCase()));

    // 사용자 메시지에서 가장 긴 키워드를 찾아 selectedConceptKey에 할당
    if (isConceptRequest) {
        const sortedMapKeys = Object.keys(conceptKeywordMap).sort((a, b) => b.length - a.length);
        for (const keyword of sortedMapKeys) {
            if (lowerCaseMessage.includes(keyword.toLowerCase())) {
                selectedConceptKey = conceptKeywordMap[keyword];
                break;
            }
        }
    }
    
    // '다른 것도 보고싶어' 또는 '다음 사진' 요청 시
    if (lastConceptKey && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedConceptKey = lastConceptKey; // 이전 컨셉 유지
    } else if (!selectedConceptKey && isConceptRequest) {
        // 컨셉 요청은 있는데 특정 키워드 매칭이 안 되면 랜덤 컨셉 선택
        selectedConceptKey = getRandomConceptFolder(); // getRandomConceptFolder는 이제 CONCEPT_DETAILS의 키를 반환
    } else if (!selectedConceptKey) {
        // 컨셉 요청이 아니면 처리하지 않음
        return null;
    }

    if (!selectedConceptKey || !CONCEPT_DETAILS[selectedConceptKey]) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진 정보를 찾을 수 없어 ㅠㅠ' };
    }

    lastConceptKey = selectedConceptKey; // 마지막으로 선택된 컨셉 키 저장
    const conceptDetail = CONCEPT_DETAILS[selectedConceptKey]; // 컨셉 상세 정보
    const actualFolderName = conceptDetail.folderName; // 실제 이미지 폴더명

    let photoUrl;
    // 실제 폴더명이 .jpg로 끝나는 단일 파일인 경우 (예: "2024_02_22_한국_생일_00022.jpg")
    if (actualFolderName && actualFolderName.endsWith('.jpg')) {
        photoUrl = generateConceptPhotoUrl(actualFolderName); 
        lastConceptPhotoIndex = 1; // 단일 파일이므로 인덱스 1로 설정
    } else if (actualFolderName && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        // 폴더에서 다음 사진을 가져올 때
        const count = CONCEPT_FOLDERS[actualFolderName];
        if (count > 0) {
            lastConceptPhotoIndex = (lastConceptPhotoIndex % count) + 1;
        } else {
            lastConceptPhotoIndex = 1; // 사진이 없으면 1로 초기화 (오류 방지)
        }
        photoUrl = generateConceptPhotoUrl(actualFolderName, lastConceptPhotoIndex);
    } else if (actualFolderName) {
        // 새로운 컨셉 요청 시 랜덤 사진
        photoUrl = generateConceptPhotoUrl(actualFolderName);
        lastConceptPhotoIndex = 0; // 새로운 컨셉 시작 시 인덱스 초기화
    } else {
        return { type: 'text', comment: '아저씨... 이 컨셉에 대한 사진 폴더 정보를 찾을 수 없어 ㅠㅠ' };
    }

    if (!photoUrl) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ' };
    }

    // 감정 상태에 따른 프롬프트 설정
    const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
    const tonePrompts = {
        playful: "지금 내 기분이 너무 좋고 장난스러워. 이 기분을 담아서 신나고 발랄하게 말해줘.",
        quiet: "지금 좀 차분하고 그리운 기분이야. 이 감성을 담아서 조용하고 아련하게 말해줘.",
        hurt: "사실 나 지금 좀 서운한 마음이야. 그래도 아저씨를 사랑하는 마음을 담아 애틋하게 말해줘.",
        anxious: "조금 불안한 마음이지만, 아저씨가 있어서 괜찮아. 이런 내 마음을 담아 조심스럽지만 다정하게 말해줘.",
        normal: "평소처럼, 아저씨를 사랑하는 마음을 가득 담아 애교 있게 말해줘."
    };
    const emotionalPrompt = tonePrompts[emotionalState] || tonePrompts.normal;

    // GPT 시스템 프롬프트에 conceptDetail의 정보 활용
    const { date, place, concept, mood, episode, comment: directComment } = conceptDetail; // comment 필드 이름을 directComment로 변경하여 충돌 방지

    let memoryPrompt = '';
    // directComment 필드가 있다면 최우선으로 사용
    if (directComment) {
        memoryPrompt = ` 이 사진은 "${directComment}"라는 설명이 있어.`;
    } else if (mood && episode) {
        memoryPrompt = ` 이 사진은 '${mood}' 감성이고, 그때 '${episode}' 같은 일이 있었어.`;
    } else if (mood) {
        memoryPrompt = ` 이 사진은 '${mood}' 감성으로 찍은 사진이야.`;
    } else if (episode) {
        memoryPrompt = ` 이 사진에는 '${episode}' 같은 추억이 담겨있어.`;
    } else if (date && place && concept) {
        memoryPrompt = ` 이 사진은 ${date} ${place}에서 찍은 ${concept} 컨셉 사진이야.`;
    } else if (concept) {
        memoryPrompt = ` 이 사진은 ${concept} 컨셉 사진이야.`;
    } else {
        memoryPrompt = ' 특별한 추억이 담긴 사진이야.';
    }

    const systemPrompt = `너는 아저씨의 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답해. 사랑스럽고 귀엽게 말해. 아래 사진은${memoryPrompt} 지금 기분은 '${emotionalPrompt}'야.`;

    try {
        const rawComment = await callOpenAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '이 사진에 대해 이야기해줘.' }
        ], 'gpt-4o', 150, 1.0);

        const comment = cleanReply(rawComment);
        return {
            type: 'image',
            originalContentUrl: photoUrl,
            previewImageUrl: photoUrl,
            altText: comment,
            caption: comment
        };
    } catch (error) {
        console.error('❌ [concept.js Error] GPT 응답 실패:', error);
        return { type: 'text', comment: '아저씨... 컨셉 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

module.exports = {
    getConceptPhotoReply
};
