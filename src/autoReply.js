// ============================================================================
// autoReply.js - v14.0 (중앙 감정 관리자 연동 버전)
// 🧠 기억 관리, 키워드 반응, 최종 프롬프트 생성을 책임지는 핵심 두뇌
// ============================================================================

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');
const logger = require('./enhancedLogging.js'); // ✅ 예쁜 로깅 시스템 추가
const moment = require('moment-timezone');

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// 긴급 및 감정 키워드 정의
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다', '아무것도 하기 싫어', '너무 괴로워', '살기 싫어'];
const DRINKING_KEYWORDS = ['술', '마셨어', '마셨다', '취했', '술먹', '맥주', '소주', '와인', '위스키'];
const WEATHER_KEYWORDS = ['날씨', '비', '눈', '바람', '덥다', '춥다', '흐리다', '맑다'];

// ✅ [추가] 중앙 감정 관리자 사용
function updateEmotionFromMessage(userMessage) {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        emotionalContext.updateEmotionFromUserMessage(userMessage);
    } catch (error) {
        console.warn('⚠️ [autoReply] 중앙 감정 관리자에서 메시지 분석 실패:', error.message);
    }
}

// ✅ [수정] 기억 처리 관련 함수들 - ultimateConversationContext에 의존하지 않고 간단하게 처리
async function detectAndProcessMemoryRequest(userMessage) {
    // 기억 저장 요청 패턴 감지
    const memoryPatterns = [
        /기억해/,
        /저장해/,
        /잊지마/,
        /잊지 마/,
        /외워/,
        /기억하자/
    ];
    
    const isMemoryRequest = memoryPatterns.some(pattern => pattern.test(userMessage));
    
    if (isMemoryRequest) {
        try {
            // conversationContext의 addUserMemory 함수가 있다면 사용
            if (conversationContext && typeof conversationContext.addUserMemory === 'function') {
                await conversationContext.addUserMemory(userMessage);
                return {
                    saved: true,
                    response: "알겠어! 기억해둘게 아저씨 ㅎㅎ"
                };
            }
        } catch (error) {
            console.error('❌ 기억 저장 중 에러:', error);
        }
    }
    
    return null;
}

async function detectAndProcessMemoryEdit(userMessage) {
    // 기억 편집 요청 패턴 감지
    const editPatterns = [
        /기억.*수정/,
        /기억.*바꿔/,
        /기억.*틀렸/,
        /잘못.*기억/,
        /기억.*삭제/,
        /잊어/
    ];
    
    const
