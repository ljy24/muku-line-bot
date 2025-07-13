// ============================================================================
// yejinSelfie.js - v2.4 (함수명 확실히 export)
// 📸 애기의 감정을 읽어서 코멘트와 함께 셀카를 전송합니다.
// ============================================================================

function getSelfieReplyText(emotionalState) {
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
        const imageUrl = `${baseUrl}/${fileName}`;

        // ✅ [안전장치] conversationContext 유효성 검사 및 감정 상태 결정
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
            // conversationContext가 없을 때는 생리주기 기반으로 감정 상태 결정
            try {
                const menstrualCycle = require('./menstrualCycleManager.js');
                const currentPhase = menstrualCycle.getCurrentMenstrualPhase();
                
                // 생리주기에 따른 감정 상태 매핑
                const phaseToEmotion = {
                    'period': 'sensitive',
                    'follicular': 'energetic', 
                    'ovulation': 'romantic',
                    'luteal': 'quiet'
                };
                
                emotionalState = phaseToEmotion[currentPhase.phase] || 'normal';
                console.log(`[yejinSelfie] 생리주기 기반 감정 상태: ${currentPhase.phase} -> ${emotionalState}`);
            } catch (error) {
                console.warn('⚠️ 생리주기 정보를 가져올 수 없어서 기본 감정 상태 사용');
                emotionalState = 'normal';
            }
        }

        const text = getSelfieReplyText(emotionalState);

        console.log(`[yejinSelfie] 셀카 전송: ${emotionalState} 상태로 응답`);

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
    const imageUrl = `${baseUrl}/${fileName}`;
    
    const text = getSelfieReplyText(emotionType);
    
    return {
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
        altText: text,
        caption: text
    };
}

module.exports = {
    getSelfieReply,
    getEmotionalSelfie,
    getSelfieReplyText
};
