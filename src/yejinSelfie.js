// src/yejinSelfie.js v2.0 (통합 지능 엔진 연동)

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
    const lowerMsg = userMessage.trim().toLowerCase();

    if (lowerMsg.includes("셀카") || lowerMsg.includes("셀피") || lowerMsg.includes("지금 모습") ||
        lowerMsg.includes("얼굴 보여줘") || lowerMsg.includes("얼굴보고싶") ||
        lowerMsg.includes("무쿠 셀카") || lowerMsg.includes("애기 셀카")) {

        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 1200;

        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const imageUrl = `${baseUrl}/${fileName}`;

        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
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
