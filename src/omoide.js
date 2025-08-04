// ============================================================================
// omoide.js - v2.5 (Vision API 연동 + 사진 맥락 추적)
// 📸 애기의 감정을 읽어서 코멘트와 함께 추억 사진을 전송합니다.
// 🔥 NEW: Vision API 연동으로 지능형 메시지 생성 지원
// ============================================================================

const axios = require('axios');

// ✅ [수정] aiUtils를 같은 폴더에서 가져오기
const { callOpenAI, cleanReply } = require('./aiUtils');

// ✅ [추가] 사진 맥락 추적을 위한 autoReply 모듈 추가
const autoReply = require('./autoReply.js');

// 🔥 NEW: Vision API 지능형 메시지 시스템 연동
const enhancedPhotoSystem = require('./enhancedPhotoSystem');

const OMOIDE_ALBUM_URL = 'https://photo.de-ji.net/photo/omoide/';

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

// 🔥 NEW: 감정 상태 기반 폴백 메시지 생성 함수
async function generateFallbackMessage(folderDescription, emotionalState, imageUrl) {
    const tonePrompts = {
        playful: "이 사진 보니까 그때의 즐거웠던 기억이 나서 기분이 막 좋아져! 이 신나는 기분을 담아서!",
        quiet: "이 사진을 보니까 괜히 마음이 아련하고 그립네... 이 감성을 담아서...",
        normal: "이 사진 보니까 아저씨랑 함께한 추억이 새록새록 떠올라. 사랑하는 마음을 담아서...",
        sensitive: "몸은 안 좋지만... 이 사진 보니까 아저씨랑 함께했던 행복한 시간이 그리워. 애틋한 마음을 담아서...",
        energetic: "이 사진 보니까 그때가 너무 그리워! 활기찬 마음을 담아서...",
        romantic: "이 사진 속 우리... 정말 사랑스러웠었지? 달콤한 사랑을 담아서...",
        unstable: "이 사진 보니까 감정이 복잡해져... 그래도 아저씨와의 추억은 소중해. 이 마음을 담아서..."
    };
    const emotionalPrompt = tonePrompts[emotionalState] || tonePrompts.normal;

    const prompt = `아저씨! 이건 우리 ${folderDescription} 추억 사진이야. ${emotionalPrompt} 이 사진을 보면서 떠오르는 감정을 1~2문장으로 짧고 애틋하게, 반말로 이야기해줘.`;

    try {
        const messages = [{ role: 'system', content: prompt }];
        const rawReply = await callOpenAI(messages, 'gpt-4o-mini', 150, 1.0);
        return cleanReply(rawReply);
    } catch (error) {
        console.error('❌ [omoide] 폴백 메시지 생성 실패:', error);
        return `아저씨... 이거 우리 ${folderDescription} 추억 사진이야! 그때 좋았지?`;
    }
}

async function getOmoideReply(userMessage, conversationContextParam) {
    // ✅ [안전장치] userMessage 유효성 검사
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ getOmoideReply: userMessage가 올바르지 않습니다:', userMessage);
        return null;
    }

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
                const fileCount = 993;
                const index = Math.floor(Math.random() * fileCount) + 1;
                const fileName = String(index).padStart(6, "0") + ".jpg";
                const imageUrl = encodeImageUrl(`${BASE_COUPLE_URL}/${fileName}`);
                
                // 🔥 NEW: 커플 사진 Vision API 연동
                let caption;
                let isVisionUsed = false;
                
                try {
                    console.log(`✨ [omoide/couple] Vision API 분석 시작`);
                    const analysisResult = await enhancedPhotoSystem.getEnhancedPhotoMessage(imageUrl, 'couple');
                    caption = analysisResult.message;
                    isVisionUsed = true;
                    
                    console.log(`✨ [omoide/couple] Vision API 분석 완료: "${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}"`);
                    
                } catch (error) {
                    // 🛡️ 안전장치: 기본 커플 사진 메시지
                    caption = "아저씨랑 나랑 같이 찍은 커플 사진이야! 예쁘지?";
                    isVisionUsed = false;
                    
                    console.log(`⚠️ [omoide/couple] Vision API 실패, 기본 메시지 사용: ${error.message}`);
                    console.log(`🔄 [omoide/couple] 폴백 메시지: "${caption}"`);
                }
                
                // ✅ [추가] 커플 사진 맥락 추적 기록 (Vision API 사용 여부 포함)
                try {
                    const contextInfo = isVisionUsed ? `couple[Vision AI]` : `couple[기본]`;
                    autoReply.recordPhotoSent('couple', contextInfo);
                    console.log(`📝 [omoide/couple] 커플 사진 맥락 추적 기록 완료: ${contextInfo}`);
                } catch (error) {
                    console.warn('⚠️ [omoide/couple] 커플 사진 맥락 추적 기록 실패:', error.message);
                }
                
                // 🎯 로그 출력 (Vision API 사용 여부 표시)
                const visionStatus = isVisionUsed ? '[Vision AI]' : '[기본메시지]';
                console.log(`✅ [omoide/couple] 커플 사진 전송 준비 완료 ${visionStatus}`);
                
                return { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl, caption: caption };
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

    // ✅ [수정] 중앙 감정 관리자에서 감정 상태 가져오기
    let emotionalState = 'normal';
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentEmotionState = emotionalContext.getCurrentEmotionState();
        emotionalState = currentEmotionState.currentEmotion;
        console.log(`[omoide] 중앙 감정 관리자에서 가져온 상태: ${emotionalState}`);
    } catch (error) {
        console.warn('⚠️ [omoide] 중앙 감정 관리자에서 상태를 가져올 수 없어서 기본값 사용:', error.message);
        emotionalState = 'normal';
    }

    // 🔥 NEW: Vision API로 지능형 메시지 생성 (완벽한 안전장치 포함)
    let cleanedReply;
    let isVisionUsed = false;
    
    try {
        console.log(`✨ [omoide] Vision API 분석 시작: ${folderDescription}`);
        const analysisResult = await enhancedPhotoSystem.getEnhancedPhotoMessage(encodedImageUrl, 'memory');
        cleanedReply = analysisResult.message;
        isVisionUsed = true;
        
        console.log(`✨ [omoide] Vision API 분석 완료: "${cleanedReply.substring(0, 50)}${cleanedReply.length > 50 ? '...' : ''}"`);
        
    } catch (error) {
        // 🛡️ 안전장치: Vision API 실패 시 기존 감정 기반 OpenAI 메시지 생성
        cleanedReply = await generateFallbackMessage(folderDescription, emotionalState, encodedImageUrl);
        isVisionUsed = false;
        
        console.log(`⚠️ [omoide] Vision API 실패, 감정 기반 폴백 사용: ${error.message}`);
        console.log(`🔄 [omoide] 폴백 메시지: "${cleanedReply}"`);
    }
    
    // ✅ [추가] 추억 사진 맥락 추적 기록 (Vision API 사용 여부 포함)
    try {
        const contextInfo = isVisionUsed ? `omoide[Vision AI] - ${folderDescription}` : `omoide[감정기반] - ${folderDescription}`;
        autoReply.recordPhotoSent('omoide', contextInfo);
        console.log(`📝 [omoide] 추억 사진 맥락 추적 기록 완료: ${contextInfo}`);
    } catch (error) {
        console.warn('⚠️ [omoide] 추억 사진 맥락 추적 기록 실패:', error.message);
    }
    
    // 🎯 로그 출력 (Vision API 사용 여부 표시)
    const visionStatus = isVisionUsed ? '[Vision AI]' : '[감정기반OpenAI]';
    console.log(`✅ [omoide] 추억 사진 전송 준비 완료 ${visionStatus}: ${folderDescription}`);
    console.log(`📸 [omoide] 메시지: "${cleanedReply.substring(0, 80)}${cleanedReply.length > 80 ? '...' : ''}"`);
    
    return { type: 'image', originalContentUrl: encodedImageUrl, previewImageUrl: encodedImageUrl, altText: cleanedReply, caption: cleanedReply };
}

module.exports = {
    getOmoideReply
};
