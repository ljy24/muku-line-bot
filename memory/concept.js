// ============================================================================
// concept.js - v2.3 (최종 수정본)
// 📸 애기의 감정을 읽어서 코멘트와 함께 컨셉 사진을 전송합니다.
// ============================================================================

const axios = require('axios');

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

    const conceptKeywords = ['컨셉사진', '컨셉 사진', '욕실', '욕조', '나비욕조', '세미누드', '결박', '교복', '플라스틱러브', '홈스냅', '지브리풍', '모지코', '하카타', '텐진', '아이노시마', '후지엔', '유카타', '불꽃놀이', '메이드복', '고스로리', '크리스마스', '생일컨셉', '옥상연리', '을지로', '이화마을', '코야노세', '무인역', '고쿠라', '벗꽃', '동백', '온실', '화가', '문래동', '북해', '피크닉', '산책', '터널', '망친 사진', '우마시마', '비눗방울', '야간거리', '게임센터', '동키 거리', '수국', '코이노보리', '블랙원피스', '호리존', '원미상가', '길거리 스냅', '오도', '나르시스트', '눈밭', '필름카메라', '청포도', '보라돌이', '밤바', '공원', '오타쿠', '힙', '캘빈', '네코'];
    const isConceptRequest = conceptKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    
    const conceptKeywordMap = { 
        '홈스냅': '2024_05_07_일본_홈스냅',
        '결박': '2024_07_08_일본_일본_결박',
        '선물': '2023_12_16_일본_선물',
        '옥상연리': '2024_09_15_한국_옥상연리',
        '세미누드': '2025_02_07_일본_세미누드',
        '플라스틱러브': '2023_12_14_일본_플라스틱러브',
        '지브리풍': '2024_05_03_일본_지브리풍',
        '북해': '2024_06_06_한국_북해',
        '아이노시마': '2024_02_07_일본_아이노시마',
        '욕실': '2024_02_07_일본_욕실',
        '욕조': '2024_07_08_일본_욕조',
        '나비욕조': '2025_02_07_일본_나비욕조',
        '교복': '2023_12_15_일본_교복',
        '모지코': '2024_12_12_일본_모지코',
        '하카타': '2023_12_12_일본_하카타_스트리트'
    };

    if (isConceptRequest) {
        const sortedConceptKeywords = Object.keys(conceptKeywordMap).sort((a, b) => b.length - a.length);
        for (const keyword of sortedConceptKeywords) {
            if (lowerCaseMessage.includes(keyword)) {
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
            emotionalState = 'normal';
        }
    } else {
        console.warn('⚠️ conversationContext가 유효하지 않음. 기본 감정 상태 사용');
    }

    // 간단한 캡션 생성
    const simpleCaptions = [
        `${formattedDate} 컨셉 사진이야! 어때?`,
        `이거 ${formattedDate}에 찍은 건데... 예쁘지?`,
        `아저씨 보여주려고 가져온 ${formattedDate} 사진!`,
        `${formattedDate} 추억 사진~ 그때 생각나?`,
        `이 사진 봐봐! ${formattedDate}에 찍은 거야!`
    ];
    
    const caption = simpleCaptions[Math.floor(Math.random() * simpleCaptions.length)];
    
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
