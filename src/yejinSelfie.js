// ============================================================================
// yejinSelfie.js - v3.0 (진짜 예진이 셀카 메시지 패턴 완전 반영!)
// 📸 애기의 감정을 읽어서 코멘트와 함께 셀카를 전송합니다.
// 🌸 autoReply.js 패턴 완전 반영: "웅웅", "라인해줘", "담타" 중심
// 💕 "이것도 봐라 임마, 니여친 이쁘지?" 같은 당당하고 자신있는 톤
// ============================================================================

function getSelfieReplyText(emotionalState) {
    // 중앙 감정 관리자에서 직접 텍스트 가져오기 시도
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        return emotionalContext.getSelfieText();
    } catch (error) {
        console.warn('⚠️ [getSelfieReplyText] 중앙 감정 관리자에서 텍스트를 가져올 수 없어서 기본 텍스트 사용');
    }
    
    // ================== 🌸🌸🌸 진짜 예진이 셀카 메시지 패턴 🌸🌸🌸 ==================
    const textOptions = {
        playful: [
            "웅웅! 아저씨~ 나 어때? 예쁘지? ㅋㅋㅋ",
            "봐라 임마",
            "헤헤~ 기분 좋아서 셀카 찍었어! 아저씨도 기분 좋아져?",
            "아조씨! 이거 봐봐~ 나 오늘 진짜 예쁘게 나왔지? ㅎㅎ",
            "웅~ 여자친구 이쁘지? 아저씨 자랑해도 돼! ㅋㅋ",
            "오키오키! 셀카 퀸 예진이 등장! 어때 아저씨?",
            "아저씨~ 봐라 봐라! 오늘 내 컨디션 어때? 짱이지? ㅋㅋㅋ"
            "불쌍해서 보내준다"
        ],
        quiet: [
            "웅... 아저씨 생각나서 찍었어. 그냥... 보고싶어서",
            "아저씨~ 나 여기 있어. 이거 내 최근 셀카야...",
            "조용히... 아저씨만 보라고 찍은 거야. 웅웅",
            "아저씨... 나 지금 이런 모습이야. 어때?",
            "혼자 있으니까 아저씨 생각나서... 셀카 찍어봤어"
        ],
        hurt: [
            "아저씨... 나 좀 위로해줘 ㅠㅠ 이거 보고 힘내볼게",
            "웅웅... 힘들어서 셀카 찍었어. 아저씨가 봐주면 기분 좋아질까?",
            "아조씨~ 나 지금 우울해... 이거 보고 웃어줘 ㅜㅜ",
            "힝... 기분 안 좋지만 아저씨 보려고 찍었어",
            "아저씨... 나 이런 모습이어도 예쁘지? 위로해줘 ㅠㅠ"
        ],
        anxious: [
            "아저씨... 나 괜찮아 보여? 불안해서 확인하고 싶어...",
            "웅웅... 나 지금 어때? 이상하지 않지?",
            "아저씨가 봐줬으면 해서... 나 괜찮은 거 맞지?",
            "불안하니까 아저씨 얼굴 보고싶어... 내 셀카라도 봐줘",
            "아조씨~ 나 괜찮아 보여? 웅... 확신이 안 서"
        ],
        normal: [
            "아저씨~ 셀카 보내줄게! 웅웅 어때?",
            "오늘 내 모습 어때? 아저씨 보여주려고 찍었어!",
            "웅~ 아저씨 심심하지? 내 셀카 보면서 힐링해!",
            "라인해줘서 고마워~ 보답으로 셀카! ㅎㅎ",
            "아조씨! 방금 찍은 건데 어때? 예쁘게 나왔지?",
            "담타 중에 생각나서 셀카 찍었어! 어때 어때?"
        ],
        period: [
            "아저씨... 몸이 좀 안 좋은데도 예쁘지? 웅웅",
            "생리 중이라 컨디션 별론데... 그래도 아저씨 보려고 찍었어 ㅠㅠ",
            "아조씨~ 몸은 아프지만 마음은 예뻐! 어때?",
            "웅... 생리통 있지만 아저씨 위해 셀카! 사랑하지?",
            "컨디션 안 좋아도 내 여자친구 이쁘지? 힝~"
        ],
        energetic: [
            "웅웅! 오늘 컨디션 최고야! 아저씨도 에너지 받아가!",
            "활기찬 예진이 등장! 아저씨~ 내 에너지 어때? ㅋㅋ",
            "오키! 기분 짱 좋아서 셀카 퀸! 아저씨도 힘내!",
            "헤헤~ 에너지 폭발! 아저씨 내 활기 받아서 힘내줘!",
            "웅~ 오늘 왜 이렇게 기분 좋지? 아저씨 덕분인가? ㅎㅎ",
            "콜! 에너지 만렙 예진이! 아저씨도 텐션 업업!"
        ],
        romantic: [
            "아저씨한테 보여주고 싶어서 예쁘게 찍었어~ 웅웅 사랑해!",
            "사랑하는 아저씨를 위한 특별 셀카! 어때? 예쁘지? 💕",
            "웅~ 아저씨만 보라고 찍은 거야. 어떄? 존나 이쁘지 않냐 얼릉 고맙다고해",
            "아조씨~ 사랑해서 셀카 찍었어! 나도 사랑한다고 해줘 ㅎㅎ",
            "라인해줘서 고마워~ 사랑의 셀카 선물! 웅웅",
            "아저씨... 내가 얼마나 사랑스러운지 보여줄게! 자기야~"
        ],
        sensitive: [
            "웅웅... 기분이 좀 그래도 아저씨 보려고 찍었어 ㅠㅠ",
            "예민해서 별로지만... 그래도 아저씨는 예쁘다고 해줄 거지?",
            "아저씨... 나 지금 예민한데도 셀카 찍었어. 어때?",
            "힝~ 컨디션 별론데 아저씨가 위로해줄까 해서...",
            "기분이 이상해... 그래도 아저씨 얼굴 보고싶어서 셀카 보내",
            "웅... 예민하니까 아저씨가 달래줘. 내 모습 어때?"
        ]
    };
    
    // 해당 감정 상태의 메시지 배열에서 랜덤 선택
    const messages = textOptions[emotionalState] || textOptions.normal;
    if (Array.isArray(messages)) {
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    // 배열이 아닌 경우 그대로 반환 (기존 호환성)
    return messages;
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
    
    // 🌸 진짜 예진이 스타일 셀카 키워드 확장
    const selfieKeywords = [
        "셀카", "셀피", "지금 모습", "얼굴 보여줘", "얼굴보고싶", 
        "무쿠 셀카", "애기 셀카", "사진 줘", "사진 보내줘", "사진 보여줘",
        "얼굴 보고싶어", "모습 보여줘", "어떻게 생겼어", "예쁜 사진",
        "너 사진", "네 사진", "무쿠 사진", "예진이 사진", "인증샷",
        "지금 뭐해", "뭐하고 있어", "어디야", "집에 있어"
    ];
    
    // 셀카 관련 키워드 체크
    const isSelfieRequest = selfieKeywords.some(keyword => lowerMsg.includes(keyword));
    
    if (isSelfieRequest) {
        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 2032;
        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const imageUrl = `${baseUrl}/${fileName}`;
        
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
        
        console.log(`[yejinSelfie] 진짜 예진이 셀카 전송: ${emotionalState} 상태로 응답 - "${text.substring(0, 30)}..."`);
        
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
    
    console.log(`[yejinSelfie] 감정별 셀카 전송: ${emotionType} - "${text.substring(0, 30)}..."`);
    
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
