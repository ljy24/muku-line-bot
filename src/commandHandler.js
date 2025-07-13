// ============================================================================
// commandHandler.js - v1.2 (최종 수정본)
// 🧠 각 사진 명령어에 맞는 담당자 파일을 연결해주는 길잡이 역할만 수행합니다.
// ============================================================================

/**
 * 사용자의 메시지를 분석하여 적절한 담당자를 호출합니다.
 * @param {string} text - 사용자 메시지
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text) {
    // ✅ [안전장치] text가 문자열이 아닌 경우 처리
    if (!text || typeof text !== 'string') {
        console.error('❌ handleCommand: text가 올바르지 않습니다:', text);
        return null;
    }

    const lowerText = text.toLowerCase();

    // ✅ [수정] require를 함수 내부로 이동하여 순환 참조 방지
    try {
        // 셀카 관련 처리
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카')) {
            
            const { getSelfieReply } = require('./yejinSelfie.js');
            const conversationContext = require('./ultimateConversationContext.js');
            return await getSelfieReply(text, conversationContext);
        }

        // 컨셉사진 관련 처리
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진') && lowerText.includes('줘'))) {
            
            const { getConceptPhotoReply } = require('../memory/concept.js');
            const conversationContext = require('./ultimateConversationContext.js');
            return await getConceptPhotoReply(text, conversationContext);
        }

        // 추억사진 관련 처리
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진') && lowerText.includes('줘'))) {
            
            const { getOmoideReply } = require('../memory/omoide.js');
            const conversationContext = require('./ultimateConversationContext.js');
            return await getOmoideReply(text, conversationContext);
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        return null;
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

module.exports = {
    handleCommand,
};
