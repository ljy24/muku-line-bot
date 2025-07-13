// ============================================================================
// commandHandler.js - v1.4 (순환 참조 완전 해결 버전)
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

    try {
        // 셀카 관련 처리
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카') || lowerText.includes('사진 줘')) {
            
            console.log('[commandHandler] 셀카 요청 감지');
            
            // ✅ [수정] yejinSelfie.js에서 getSelfieReply 함수를 직접 호출
            const { getSelfieReply } = require('./yejinSelfie.js');
            
            // conversationContext 없이 호출 (순환 참조 방지)
            return await getSelfieReply(text, null);
        }

        // 컨셉사진 관련 처리
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            lowerText.includes('결박') || lowerText.includes('세미누드') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 컨셉사진 요청 감지');
            
            // ✅ [수정] 같은 폴더에서 가져오기
            const { getConceptPhotoReply } = require('./concept.js');
            
            // conversationContext 없이 호출 (순환 참조 방지)
            return await getConceptPhotoReply(text, null);
        }

        // 추억사진 관련 처리
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            lowerText.includes('커플사진') || lowerText.includes('커플 사진') ||
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 추억사진 요청 감지');
            
            // ✅ [수정] 같은 폴더에서 가져오기
            const { getOmoideReply } = require('./omoide.js');
            
            // conversationContext 없이 호출 (순환 참조 방지)
            return await getOmoideReply(text, null);
        }

        // 기분/컨디션 관련 질문 처리
        if (lowerText.includes('기분 어때') || lowerText.includes('컨디션 어때') || 
            lowerText.includes('오늘 어때') || lowerText.includes('어떻게 지내')) {
            
            console.log('[commandHandler] 기분 질문 감지');
            
            // 생리주기 기반 기분 응답
            const menstrualCycle = require('./menstrualCycleManager.js');
            const cycleMessage = menstrualCycle.generateCycleAwareMessage('mood');
            
            return {
                type: 'text',
                comment: cycleMessage
            };
        }

        // 인사 관련 처리
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[commandHandler] 인사 메시지 감지');
            
            // 생리주기 기반 인사 응답
            const menstrualCycle = require('./menstrualCycleManager.js');
            const greetingMessage = menstrualCycle.generateCycleAwareMessage('greeting');
            
            return {
                type: 'text',
                comment: greetingMessage
            };
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        
        // 에러 발생 시 기본 응답 제공
        return {
            type: 'text',
            comment: '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ'
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

module.exports = {
    handleCommand,
};
