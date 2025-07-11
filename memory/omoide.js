// memory/omoide.js v2.16 (순환 참조 해결 및 전체 코드)
// [오류 수정] aiUtils.js에서 공용 함수를 가져오도록 변경

const { callOpenAI, cleanReply } = require('../src/aiUtils');

const OMODE_FOLDERS = {
    "추억_24_03_일본": 207,
    "추억_24_03_일본_스냅": 190,
    "추억_24_03_일본_후지": 226,
    "추억_24_04": 31,
    "추억_24_04_출사_봄_데이트_일본": 90,
    "추억_24_04_한국": 130,
    "추억_24_05_일본": 133,
    "추억_24_05_일본_후지": 135,
    "추억_24_06_한국": 146,
    "추억_24_07_일본": 62,
    "추억_24_08월_일본": 48,
    "추억_24_09_한국": 154,
    "추억_24_10_일본": 75,
    "추억_24_11_한국": 121,
    "추억_24_12_일본": 50,
    "추억_25_01_한국": 135,
    "추억_25_02_일본": 24,
    "추억_25_03_일본": 66,
    "추억_25_03_일본_코닥_필름": 28,
    "추억_인생네컷": 15,
    "흑심": 13,
};

const BASE_OMODE_URL = 'https://photo.de-ji.net/photo/omoide';
const BASE_COUPLE_URL = 'https://photo.de-ji.net/photo/couple';

const omoideKeywordMap = {
    '추억 24년 4월 출사 봄 데이트 일본': '추억_24_04_출사_봄_데이트_일본',
    '추억 25년 3월 일본 코닥 필름': '추억_25_03_일본_코닥_필름',
    '추억 24년 3월 일본 스냅': '추억_24_03_일본_스냅',
    '추억 24년 3월 일본 후지': '추억_24_03_일본_후지',
    '추억 24년 5월 일본 후지': '추억_24_05_일본_후지',
    '추억 24년 8월 일본': '추억_24_08월_일본',
    '추억 24년 3월 일본': '추억_24_03_일본',
    '추억 24년 5월 일본': '추억_24_05_일본',
    '추억 24년 6월 한국': '추억_24_06_한국',
    '추억 24년 7월 일본': '추억_24_07_일본',
    '추억 24년 9월 한국': '추억_24_09_한국',
    '추억 24년 10월 일본': '추억_24_10_일본',
    '추억 24년 11월 한국': '추억_24_11_한국',
    '추억 24년 12월 일본': '추억_24_12_일본',
    '추억 25년 1월 한국': '추억_25_01_한국',
    '추억 25년 2월 일본': '추억_25_02_일본',
    '추억 25년 3월 일본': '추억_25_03_일본',
    '추억 24년 4월 한국': '추억_24_04_한국',
    '추억 24년 4월': '추억_24_04',
    '인생네컷': '추억_인생네컷',
    '흑심': '흑심',
};

const sortedOmoideKeywords = Object.keys(omoideKeywordMap).sort((a, b) => b.length - a.length);

function encodeImageUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.pathname = parsed.pathname.split('/').map(segment => segment ? encodeURIComponent(decodeURIComponent(segment)) : segment).join('/');
        return parsed.toString();
    } catch (error) {
        return url;
    }
}

function getRandomOmoideFolder() {
    const folderNames = Object.keys(OMODE_FOLDERS).filter(f => !f.endsWith('.jpg'));
    if (folderNames.length === 0) return null;
    return folderNames[Math.floor(Math.random() * folderNames.length)];
}

async function getOmoideReply(userMessage, conversationContext) {
    const lowerMsg = userMessage.trim().toLowerCase();
    let selectedFolder = null;

    for (const keyword of sortedOmoideKeywords) {
        if (lowerMsg.includes(keyword.toLowerCase())) {
            selectedFolder = omoideKeywordMap[keyword];
            break;
        }
    }

    if (!selectedFolder) {
        if (lowerMsg.includes("추억") || lowerMsg.includes("옛날사진") || lowerMsg.includes("커플")) {
            if (lowerMsg.includes("커플")) {
                 const fileCount = 500;
                 const index = Math.floor(Math.random() * fileCount) + 1;
                 const fileName = String(index).padStart(6, "0") + ".jpg";
                 const imageUrl = encodeImageUrl(`${BASE_COUPLE_URL}/${fileName}`);
                 return { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl, caption: "아저씨랑 나랑 같이 찍은 커플 사진이야! 예쁘지?" };
            }
            selectedFolder = getRandomOmoideFolder();
        } else {
            return null;
        }
    }

    if (!selectedFolder) return null;

    const fileCount = OMODE_FOLDERS[selectedFolder];
    if (!fileCount) return null;

    const indexToUse = Math.floor(Math.random() * fileCount) + 1;
    const fileName = `${selectedFolder}_${String(indexToUse).padStart(6, "0")}.jpg`;
    const encodedImageUrl = encodeImageUrl(`${BASE_OMODE_URL}/${fileName}`);
    const folderDescription = selectedFolder.split('_').join(' ').replace('추억 ', '');

    const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
    const tonePrompts = {
        playful: "이 사진 보니까 그때의 즐거웠던 기억이 나서 기분이 막 좋아져! 이 신나는 기분을 담아서!",
        quiet: "이 사진을 보니까 괜히 마음이 아련하고 그립네... 이 감성을 담아서...",
        normal: "이 사진 보니까 아저씨랑 함께한 추억이 새록새록 떠올라. 사랑하는 마음을 담아서..."
    };
    const emotionalPrompt = tonePrompts[emotionalState] || tonePrompts.normal;

    const prompt = `아저씨! 이건 우리 ${folderDescription} 추억 사진이야. ${emotionalPrompt} 이 사진을 보면서 떠오르는 감정을 1~2문장으로 짧고 애틋하게, 반말로 이야기해줘.`;

    const messages = [{ role: 'system', content: prompt }];
    const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 1.0);
    const cleanedReply = cleanReply(rawReply);
    return { type: 'image', originalContentUrl: encodedImageUrl, previewImageUrl: encodedImageUrl, altText: cleanedReply, caption: cleanedReply };
}

module.exports = {
    getOmoideReply
};
