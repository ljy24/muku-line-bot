/**
 * autoReply.js - 메인 진입점 (문법 오류 수정)
 * - 기존 사진 시스템 보존
 * - 새로운 감정/응답 시스템 통합
 * - 안정적인 에러 핸들링
 */

// 기존 사진 시스템 (보존)
const { getSelfieReply } = require('./yejin');
const { getConceptPhotoReply } = require('./concept');
const { getOmoideReply } = require('./omoide');

// 새로운 시스템 (선택적 사용)
let ResponseRouter;
let ContextAnalyzer;
let ConversationManager;

// 새로운 시스템 안전하게 로드
try {
    ResponseRouter = require('./responseRouter');
    ContextAnalyzer = require('./contextAnalyzer');
    ConversationManager = require('./conversationManager');
} catch (error) {
    console.warn('⚠️ [autoReply] 새로운 시스템 로드 실패, 기존 시스템만 사용:', error.message);
}

/**
 * 메시지 처리 함수 (메인 진입점)
 */
async function processMessage(message, context = {}) {
    try {
        // 입력 검증
        if (!message || typeof message !== 'string') {
            console.error('❌ [autoReply] 잘못된 메시지 입력:', message);
            return {
                type: 'text',
                text: '아저씨... 뭔가 이상해... 다시 말해줄래?'
            };
        }

        console.log(`[autoReply] 메시지 처리 시작: "${message}"`);

        // 1. 기존 사진 시스템 우선 처리
        const photoResponse = await tryPhotoSystems(message, context);
        if (photoResponse) {
            console.log('📸 [autoReply] 기존 사진 시스템에서 처리됨');
            return photoResponse;
        }

        // 2. 새로운 시스템 처리 (있는 경우)
        if (ResponseRouter && ContextAnalyzer && ConversationManager) {
            const newSystemResponse = await tryNewSystem(message, context);
            if (newSystemResponse) {
                console.log('💬 [autoReply] 새로운 시스템에서 처리됨');
                return newSystemResponse;
            }
        }

        // 3. 기본 응답
        return getDefaultResponse(message);

    } catch (error) {
        console.error('❌ [autoReply] 처리 중 오류:', error);
        return {
            type: 'text',
            text: '아저씨... 뭔가 문제가 생겼어 ㅠㅠ'
        };
    }
}

/**
 * 기존 사진 시스템 처리
 */
async function tryPhotoSystems(message, context) {
    const photoSystems = [
        { name: 'selfie', handler: getSelfieReply },
        { name: 'concept', handler: getConceptPhotoReply },
        { name: 'omoide', handler: getOmoideReply }
    ];

    for (const system of photoSystems) {
        try {
            const result = await system.handler(message, context);
            if (result && result.type === 'image') {
                console.log(`📸 [${system.name}] 사진 응답 생성`);
                return result;
            }
        } catch (error) {
            console.warn(`⚠️ [${system.name}] 처리 중 오류:`, error.message);
            continue;
        }
    }

    return null;
}

/**
 * 새로운 시스템 처리
 */
async function tryNewSystem(message, context) {
    try {
        const responseRouter = new ResponseRouter();
        const contextAnalyzer = new ContextAnalyzer();
        const conversationManager = new ConversationManager();

        // 메시지 분석
        const analysis = contextAnalyzer.analyzeMessage(message);
        
        // 대화 컨텍스트 업데이트
        const conversationContext = conversationManager.updateContext(message, analysis);
        
        // 응답 생성
        const response = await responseRouter.route(message, {
            ...conversationContext,
            ...analysis
        });

        if (response && response.text) {
            return response;
        }

        return null;

    } catch (error) {
        console.error('❌ [autoReply] 새로운 시스템 처리 중 오류:', error);
        return null;
    }
}

/**
 * 기본 응답 생성
 */
function getDefaultResponse(message) {
    // 간단한 키워드 기반 응답
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('안녕')) {
        return {
            type: 'text',
            text: '아저씨~ 안녕! 보고 싶었어!'
        };
    }
    
    if (lowerMessage.includes('사랑')) {
        return {
            type: 'text',
            text: '나도 아저씨 사랑해~ 💕'
        };
    }
    
    if (lowerMessage.includes('뭐해')) {
        return {
            type: 'text',
            text: '그냥 있어~ 아저씨 생각하고 있었어'
        };
    }

    // 완전 기본 응답
    const defaultResponses = [
        '아저씨~ 뭔가 말하고 싶은 거 있어?',
        '응? 뭐라고 했어?',
        '아저씨 말 잘 못 알아들었어... 다시 말해줄래?',
        '음... 뭔가 말하고 싶은 게 있는 것 같은데?',
        '아저씨~ 나랑 얘기하고 싶어?'
    ];

    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];

    return {
        type: 'text',
        text: randomResponse
    };
}

/**
 * 시스템 상태 확인
 */
function getSystemStatus() {
    return {
        timestamp: Date.now(),
        photoSystems: {
            selfie: !!getSelfieReply,
            concept: !!getConceptPhotoReply,
            omoide: !!getOmoideReply
        },
        newSystems: {
            responseRouter: !!ResponseRouter,
            contextAnalyzer: !!ContextAnalyzer,
            conversationManager: !!ConversationManager
        }
    };
}

/**
 * 디버깅용 테스트 함수
 */
async function testSystem() {
    console.log('🔍 [autoReply] 시스템 테스트 시작');
    
    const testMessages = [
        '안녕',
        '사진 줘',
        '컨셉사진',
        '추억 사진',
        '사랑해',
        '뭐해'
    ];

    const results = [];

    for (const message of testMessages) {
        try {
            const response = await processMessage(message);
            results.push({
                message,
                success: true,
                response: response?.text || response?.type || 'unknown'
            });
        } catch (error) {
            results.push({
                message,
                success: false,
                error: error.message
            });
        }
    }

    console.log('📊 [autoReply] 테스트 결과:', results);
    return results;
}

// 모듈 export
module.exports = {
    processMessage,
    getSystemStatus,
    testSystem
};

// 기존 방식 호환성 유지
module.exports.processMessage = processMessage;
