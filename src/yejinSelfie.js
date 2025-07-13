// ============================================================================
// yejinSelfie.js - v2.3 (최종 수정본)
// 📸 애기의 감정을 읽어서 코멘트와 함께 셀카를 전송합니다.
// ============================================================================

const axios = require('axios');

function getSelfieReplyText(emotionalState) {
    const textOptions = {
        playful: "아저씨! 나 예쁘지? 기분 좋아서 셀카 찍었어!",
        quiet: "그냥... 아저씨 생각나서. 이거 내 최근 셀카야.",
        hurt: "나 좀 위로해줘 아저씨... 이거 보고 힘낼래. ㅠㅠ",
        anxious: "나 괜찮아 보여? 아저씨가 봐줬으면 해서...",
        normal: "아저씨 보여주려고 방금 찍은 셀카야. 어때?"
    };
    return textOptions[emotionalState] || textOptions.normal;
}

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
        lowerMsg.includes("무쿠 셀카") || lowerMsg.includes("애기 셀카")) {

        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 2032;

        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const imageUrl = `${baseUrl}/${fileName}`;

        // ✅ [안전장치] conversationContext 유효성 검사
        let emotionalState = 'normal';
        if (conversationContext && typeof conversationContext.getInternalState === 'function') {
            try {
                const internalState = conversationContext.getInternalState();
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

        const text = getSelfieReplyText(emotionalState);

        return {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
            altText: text,
            caption: text
        };
    }
    
    return null;
}

module.exports = {
    getSelfieReply
};
