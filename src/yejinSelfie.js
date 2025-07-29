// ============================================================================
// yejinSelfie.js - v2.5 (URL 인코딩 추가로 LINE API 호환성 확보)
// 📸 애기의 감정을 읽어서 코멘트와 함께 셀카를 전송합니다.
// 🔧 오모이데와 동일한 URL 인코딩 로직 추가
// ============================================================================

// ✅ [추가] URL 인코딩 함수 - 오모이데와 동일한 로직
function encodeImageUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.pathname = parsed.pathname.split('/').map(segment => 
            segment ? encodeURIComponent(decodeURIComponent(segment)) : segment
        ).join('/');
        return parsed.toString();
    } catch (error) {
        return url;
    }
}

function getSelfieReplyText(emotionalState) {
    // 중앙 감정 관리자에서 직접 텍스트 가져오기 시도
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        return emotionalContext.getSelfieText();
    } catch (error) {
        console.warn('⚠️ [getSelfieReplyText] 중앙 감정 관리자에서 텍스트를 가져올 수 없어서 기본 텍스트 사용');
    }
    
    // 기본 텍스트 (백업용)
    const textOptions = {
        playful: "아저씨! 나 예쁘지? 기분 좋아서 셀카 찍었어!",
        quiet: "그냥... 아저씨 생각나서. 이거 내 최근 셀카야.",
        hurt: "나 좀 위로해줘 아저씨... 이거 보고 힘낼래. ㅠㅠ",
        anxious: "나 괜찮아 보여? 아저씨가 봐줬으면 해서...",
        normal: "아저씨 보여주려고 방금 찍은 셀카야. 어때?",
        period: "아저씨... 몸이 좀 안 좋은데 셀카 찍어봤어. 예뻐 보여?",
        energetic: "컨디션 좋아서 셀카 찍었어! 활기찬 내 모습 어때?",
        romantic: "아저씨한테 보여주고 싶어서 예쁘게 찍었어~ 사랑해!",
        sensitive: "기분이 좀... 그래도 아저씨 보려고 찍었어 ㅠㅠ"
    };
    return textOptions[emotionalState] || textOptions.normal;
}

/**
 * 셀카 요청에 대한 응답을 생성합니다.
 * @param {string} userMessage - 사용자 메시지
 * @param {object} conversationContext - 대화 컨텍스트 (옵션)
 * @returns {Promise<object|null>} 셀카 응답 또는 null
 */
async function getSelfieReply(userMessage, conversationContext) {
    // ✅ [안전장치] userMessage 유효성 검사
    if (!userMessage || typeof userMessage !== 'string') {
        console.error('❌ getSelfieReply: userMessage가 올바르지 않습니다:', userMessage);
        return null;
    }

    const lowerMsg = userMessage.trim().toLowerCase();

    // 셀카 관련 키워드 체크
    if (lowerMsg.includes("셀카") || lowerMsg.includes("셀피") || lowerMsg.includes("지금 모습") ||
        lowerMsg.includes("얼굴 보여줘") || lowerMsg.includes("얼굴보고싶") ||
        lowerMsg.includes("무쿠 셀카") || lowerMsg.includes("애기 셀카") ||
        lowerMsg.includes("사진 줘")) {

        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 2032;

        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const rawImageUrl = `${baseUrl}/${fileName}`;
        
        // ✅ [핵심 수정] URL 인코딩 추가 - 오모이데와 동일한 방식
        const encodedImageUrl = encodeImageUrl(rawImageUrl);

        // ✅ [수정] 중앙 감정 관리자에서 감정 상태 가져오기
        let emotionalState = 'normal';
        
        try {
            // emotionalContextManager에서 현재 감정 상태 가져오기
            const emotionalContext = require('./emotionalContextManager.js');
            const currentEmotionState = emotionalContext.getCurrentEmotionState();
            emotionalState = currentEmotionState.currentEmotion;
            
            console.log(`[yejinSelfie] 중앙 감정 관리자에서 가져온 상태: ${emotionalState}`);
        } catch (error) {
            console.warn('⚠️ [yejinSelfie] 중앙 감정 관리자에서 상태를 가져올 수 없어서 기본값 사용:', error.message);
            emotionalState = 'normal';
        }

        const text = getSelfieReplyText(emotionalState);

        console.log(`[yejinSelfie] 셀카 전송: ${emotionalState} 상태로 응답`);
        console.log(`[yejinSelfie] URL 인코딩 완료: ${encodedImageUrl.substring(0, 50)}...`);

        return {
            type: 'image',
            originalContentUrl: encodedImageUrl,  // ← 인코딩된 URL 사용
            previewImageUrl: encodedImageUrl,     // ← 인코딩된 URL 사용
            altText: text,
            caption: text
        };
    }
    
    return null;
}

/**
 * 특정 감정 상태로 셀카를 보냅니다 (이벤트용)
 * @param {string} emotionType - 감정 타입
 * @returns {object} 셀카 응답
 */
async function getEmotionalSelfie(emotionType = 'normal') {
    const baseUrl = "https://photo.de-ji.net/photo/yejin";
    const fileCount = 2032;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    const rawImageUrl = `${baseUrl}/${fileName}`;
    
    // ✅ [핵심 수정] URL 인코딩 추가
    const encodedImageUrl = encodeImageUrl(rawImageUrl);
    
    const text = getSelfieReplyText(emotionType);
    
    console.log(`[yejinSelfie] 이벤트 셀카 URL 인코딩 완료: ${encodedImageUrl.substring(0, 50)}...`);
    
    return {
        type: 'image',
        originalContentUrl: encodedImageUrl,  // ← 인코딩된 URL 사용
        previewImageUrl: encodedImageUrl,     // ← 인코딩된 URL 사용
        altText: text,
        caption: text
    };
}

module.exports = {
    getSelfieReply,
    getEmotionalSelfie,
    getSelfieReplyText
};
