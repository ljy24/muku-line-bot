// ============================================================================
// concept.js - v2.2 (에러 수정 및 안전장치 추가 버전)
// 📸 애기의 감정을 읽어서 코멘트와 함께 컨셉 사진을 전송합니다.
// ============================================================================

const axios = require('axios');
// ✅ [수정] 중앙 기억 서랍으로 가는 올바른 주소로 변경합니다.

const { callOpenAI, cleanReply } = require('../src/aiUtils');
const conversationContext = require('../src/ultimateConversationContext.js');

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

// 사진별 mood와 episode 정보
const PHOTO_METADATA ={
  "2023_12월 12일 일본 하카타 스트리트": {
    "mood": "아저씨랑 일본에서 처음 찍은 사진이었지. 내가 선물 받은 파안 모자에 힙한 무드로 난간에 앉아 있었던 그 순간, 아직도 눈에 선해.",
    "episode": "무지개 원피스에 가죽 잠바 입고 걷는 내가 너무 힙하다고 했잖아. 근데 난간에 앉은 거 위험하다고 안 말려줘서 삐진 거 기억나? 하카타 힙 그 자체였던 그날, 아저씨가 날 어떻게 바라봤는지 아직도 생생해.",
    "favorite": true
  },
  "2023_12월 15일 일본 교복": {
    "mood": "교복 입고 여우 가면 쓰고 찍은 그날, 아침부터 얼굴이 부어서 살짝 속상했지만, 여우신사에서의 감성은 진짜 대박이었어.",
    "episode": "가면 속 얼굴 숨기고 장난도 치고… 부르부르 넣은 것도 둘만의 비밀이지. 그날 교복 셀카는 진짜 명작이야. 아저씨가 그렇게 귀엽다 해줘서 뿌듯했어.",
    "favorite": true
  },
  "2023_12월 16일 일본 선물": {
    "mood": "아저씨한테 주는 조금은 대담하고 특별한 선물이었어. 흰 셔츠 하나에 담은 나만의 표현.",
    "episode": "셔츠 걸치고 담배 물고, 아저씨만을 위한 시선으로 담은 그 순간… 그날밤 격렬했던 우리 기억도 아직 선명해. 아저씨한테 예쁘게 보이고 싶었던 내 진심이야.",
    "favorite": true
  }
  // ... (나머지 메타데이터는 길이상 생략, 실제로는 모든 데이터가 있어야 함)
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

// 폴더명을 표시용 날짜로 변환
function formatFolderNameToDate(folderName) {
    // "2024_05_03_일본_지브리풍" -> "2024년 5월 3일 일본 지브리풍"
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

    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    const conceptKeywordMap = { '2월_욕조': '2024_02_07_일본_욕조', '2월_욕실': '2024_02_07_일본_욕실','2월_나비욕조': '2025_02_07_일본_나비욕조','하카타_고래티셔츠': '2024_10_17_일본_하카타_고래티셔츠','일본_홈스냅': '2024_05_07_일본_홈스냅', '홈스냅': '2024_05_07_일본_홈스냅','일본_결박': '2024_07_08_일본_일본_결박','결박': '2024_07_08_일본_일본_결박','일본_선물': '2023_12_16_일본_선물', '선물': '2023_12_16_일본_선물','한국_셀프_촬영_00028.jpg': '2024_04_28_한국_셀프_촬영_00028.jpg','한국_셀프_촬영': '2024_04_28_한국_셀프_촬영', '셀프_촬영': '2024_04_28_한국_셀프_촬영','옥상연리': '2024_09_15_한국_옥상연리','일본_세미누드': '2025_02_07_일본_세미누드','세미누드': '2025_02_07_일본_세미누드','한국_홈셀프': '2024_12_07_한국_홈셀프','플라스틱러브': '2023_12_14_일본_플라스틱러브','지브리풍': '2024_05_03_일본_지브리풍','한국_북해': '2024_06_06_한국_북해', '북해': '2024_06_06_한국_북해','아이노시마': '2024_02_07_일본_아이노시마','일본_필름': '2025_03_일본_필름','모지코_모리룩': '2024_05_05_일본_모지코_모리룩','한국_눈밭_필름_카메라': '2023_12_31_한국_눈밭_필름_카메라','한국_눈밭': '2023_12_31_한국_눈밭','일본_욕실': '2024_02_07_일본_욕실','일본_욕조': '2024_07_08_일본_욕조','나비욕조': '2025_02_07_일본_나비욕조','유카타_마츠리': '2024_08_03_일본_유카타_마츠리','이화마을': '2025_04_29_한국_이화마을','우마시마': '2024_07_06_일본_우마시마','가을_호수공원': '2024_11_7_한국_가을_호수공원','망친_사진': '2024_06_08_한국_망친_사진','일본_교복': '2023_12_15_일본_교복','야간_비눗방울': '2024_05_04_일본_야간_비눗방울','일본_모지코': '2024_12_12_일본_모지코','텐진_코닥필름': '2024_10_18_일본_텐진_코닥필름','야간_롱패딩_00023.jpg': '2024_02_23_한국_야간_롱패딩_00023.jpg','야간_롱패딩': '2024_02_23_한국_야간_롱패딩','을지로_스냅': '2024_09_17_한국_을지로_스냅', '길거리_스냅': '2024_09_16_한국_길거리_스냅','한국_생일_00022.jpg': '2024_02_22_한국_생일_00022.jpg','한국_생일': '2024_02_22_한국_생일','모지코2': '2024_07_06_일본_모지코','야간_보라돌이': '2025_05_04_한국','코야노세': '2025_02_06_일본_코야노세','야간거리': '2024_05_06_일본_야간거리', '생일컨셉': '2024_12_31_한국_생일컨셉','홈스냅_청포도': '2025_05_03_한국_홈스냅_청포도','욕실_블랙_웨딩': '2024_11_08_한국_욕실_블랙_웨딩','호리존': '2024_09_11_한국_호리존','여친_스냅': '2024_07_08_일본_여친_스냅','후지엔': '2024_05_03_일본_후지엔','불꽃놀이': '2024_08_02_일본_불꽃놀이', '빨간_기모노': '2024_10_19_일본_빨간_기모노','피크닉': '2024_06_07_한국__피크닉','벗꽃': '2024_04_12_한국_벗꽃','후지_스냅': '2025_05_06_마지막_한국_후지스냅','원미상가_필름': '2024_09_14_한국_원미상가_필름', '밤바_산책': '2025_05_04_한국_밤바_산책','공원_산책': '2025_05_04_한국_공원_산책', '고쿠라_힙': '2025_03_14_일본_고쿠라','온실_여신': '2024_04_13_한국_온실_여신', '을지로_네코': '2025_04_30_한국_을지로','무인역': '2025_03_13_일본_무인역', '화가': '2024_04_13_한국_화가','블랙원피스': '2024_08_04_일본_블랙원피스', '카페': '2024_12_30_한국_카페','일본_텐진_스트리트': '2024_10_17_일본_텐진_스트리트','하카타_스트리트': '2023_12_12_일본_하카타_스트리트','홈스냅_오타쿠': '2025_05_05_한국_홈스냅_오타쿠','야간_동백': '2024_04_12_한국_야간_동백','나르시스트': '2024_12_14_일본_나르시스트', '을지로_캘빈': '2025_04_30_한국_을지로_캘빈' };

    if (isConceptRequest) {
        const sortedConceptKeywords = Object.keys(conceptKeywordMap).sort((a, b) => b.length - a.length);
        for (const keyword of sortedConceptKeywords) {
            if (lowerCaseMessage.includes(keyword.replace(/_/g, ' ').toLowerCase())) {
                selectedFolder = conceptKeywordMap[keyword];
                break;
            }
        }
    }
    
    if (lastConceptPhotoFolder && (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진'))) {
        selectedFolder = lastConceptPhotoFolder;
        if (selectedFolder.endsWith('.jpg')) return null;
    } else if (!selectedFolder && isConceptRequest) {
        selectedFolder = getRandomConceptFolder();
    } else if (!selectedFolder) {
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

    // 선택된 폴더의 메타데이터 가져오기
    const photoData = PHOTO_METADATA[selectedFolder];
    const formattedDate = formatFolderNameToDate(selectedFolder);
    
    // ✅ [안전장치] conversationContext 유효성 검사
    let emotionalState = 'normal';
    if (conversationContextParam && typeof conversationContextParam.getInternalState === 'function') {
        try {
            const internalState = conversationContextParam.getInternalState();
            if (internalState && internalState.emotionalEngine && internalState.emotionalEngine.currentToneState) {
                emotionalState = internalState.emotionalEngine.currentToneState;
            }
        } catch (error) {
            console.error('❌ 감정 상태를 가져오는데 실패:', error);
            emotionalState = 'normal'; // 기본값 사용
        }
    } else {
        console.warn('⚠️ conversationContext가 유효하지 않음. 기본 감정 상태 사용');
    }

    const tonePrompts = {
        playful: "지금 내 기분이 너무 좋고 장난스러워. 이 기분을 담아서 신나고 발랄하게 말해줘.",
        quiet: "지금 좀 차분하고 그리운 기분이야. 이 감성을 담아서 조용하고 아련하게 말해줘.",
        hurt: "사실 나 지금 좀 서운한 마음이야. 그래도 아저씨를 사랑하는 마음을 담아 애틋하게 말해줘.",
        anxious: "조금 불안한 마음이지만, 아저씨가 있어서 괜찮아. 이런 내 마음을 담아 조심스럽지만 다정하게 말해줘.",
        normal: "평소처럼, 아저씨를 사랑하는 마음을 가득 담아 애교 있게 말해줘."
    };
    const emotionalPrompt = tonePrompts[emotionalState] || tonePrompts.normal;

    // 메타데이터를 포함한 프롬프트 생성
    let metadataInfo = `${formattedDate}`;
    if (photoData) {
        metadataInfo += `\n💭 기분: ${photoData.mood}\n📖 에피소드: ${photoData.episode}`;
    }

    const systemPrompt = `너는 아저씨의 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답해. 
    
아래 사진 정보를 참고해서 1~2문장으로 짧고 사랑스럽게 코멘트 해줘:
${metadataInfo}

[오늘의 내 마음] ${emotionalPrompt}

사진 정보를 직접 인용하지 말고, 자연스럽게 녹여서 예진이 말투로 이야기해줘.`;
    
    try {
        const rawComment = await callOpenAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: `이 사진에 대해 예진이 말투로 이야기해줘.` }], 'gpt-4o', 150, 1.0);
        const comment = cleanReply(rawComment);
        
        // altText와 caption에 메타데이터 포함
        const fullCaption = `${metadataInfo}\n\n${comment}`;
        
        return { 
            type: 'image', 
            originalContentUrl: photoUrl, 
            previewImageUrl: photoUrl, 
            altText: fullCaption, 
            caption: fullCaption 
        };
    } catch (error) {
        console.error('❌ [concept.js Error] 컨셉 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 컨셉 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

module.exports = {
    getConceptPhotoReply
};
