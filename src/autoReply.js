/**
 * autoReply.js - 기존 ultimateConversationContext.js 통합 버전
 * - 기존 감정/생리주기 시스템 유지
 * - 실제 키워드 매칭 응답 추가
 * - 폴백 응답 대신 정상 대화
 */

console.log('🔄 [SYSTEM] 통합 autoReply 시스템 시작');

// 기존 사진 시스템
let getSelfieReply, getConceptPhotoReply, getOmoideReply;

// 기존 대화 컨텍스트 시스템
let ultimateContext;

// 안전한 모듈 로딩
try {
    ({ getSelfieReply } = require('./yejin'));
    console.log('✅ [PHOTO] yejin.js 로드 성공');
} catch (error) {
    console.log('⚠️ [PHOTO] yejin.js 로드 실패:', error.message);
}

try {
    ({ getConceptPhotoReply } = require('./concept'));
    console.log('✅ [PHOTO] concept.js 로드 성공');
} catch (error) {
    console.log('⚠️ [PHOTO] concept.js 로드 실패:', error.message);
}

try {
    ({ getOmoideReply } = require('./omoide'));
    console.log('✅ [PHOTO] omoide.js 로드 성공');
} catch (error) {
    console.log('⚠️ [PHOTO] omoide.js 로드 실패:', error.message);
}

try {
    ultimateContext = require('./ultimateConversationContext');
    console.log('✅ [CONTEXT] ultimateConversationContext.js 로드 성공');
} catch (error) {
    console.log('⚠️ [CONTEXT] ultimateConversationContext.js 로드 실패:', error.message);
}

/**
 * 메인 처리 함수 - 기존 시스템과 통합
 */
async function processMessage(message, context = {}) {
    console.log(`\n🔥 [INTEGRATED] 메시지 처리 시작: "${message}"`);
    
    try {
        // 기본 검증
        if (!message || typeof message !== 'string') {
            console.log('❌ [INTEGRATED] 잘못된 메시지');
            return createResponse('아저씨... 뭔가 이상해...');
        }

        const msg = message.toLowerCase().trim();
        console.log(`🔍 [INTEGRATED] 처리 대상: "${msg}"`);

        // 기존 컨텍스트 시스템 업데이트
        if (ultimateContext) {
            try {
                await ultimateContext.addUltimateMessage('user', message);
                ultimateContext.updateLastUserMessageTime();
                console.log('✅ [CONTEXT] 기존 컨텍스트 시스템 업데이트');
            } catch (error) {
                console.log('⚠️ [CONTEXT] 컨텍스트 업데이트 실패:', error.message);
            }
        }

        // 1. 사진 시스템 처리 (기존과 동일)
        const photoResponse = await tryPhotoSystems(message, context);
        if (photoResponse) {
            console.log('✅ [INTEGRATED] 사진 응답 성공');
            
            // 기존 컨텍스트에 응답 추가
            if (ultimateContext) {
                await ultimateContext.addUltimateMessage('yejin', photoResponse.caption || '사진을 보내드렸어요');
            }
            
            return photoResponse;
        }

        // 2. **핵심**: 실제 키워드 매칭 응답
        console.log('💬 [INTEGRATED] 키워드 매칭 시작');
        const keywordResponse = getKeywordResponse(msg);
        
        if (keywordResponse) {
            console.log(`✅ [INTEGRATED] 키워드 응답: "${keywordResponse}"`);
            
            // 기존 컨텍스트에 응답 추가
            if (ultimateContext) {
                await ultimateContext.addUltimateMessage('yejin', keywordResponse);
            }
            
            return createResponse(keywordResponse);
        }

        // 3. 기존 감정 상태 기반 응답
        console.log('💭 [INTEGRATED] 감정 기반 응답 시도');
        const emotionalResponse = await getEmotionalResponse(message);
        
        if (emotionalResponse) {
            console.log(`✅ [INTEGRATED] 감정 응답: "${emotionalResponse}"`);
            
            if (ultimateContext) {
                await ultimateContext.addUltimateMessage('yejin', emotionalResponse);
            }
            
            return createResponse(emotionalResponse);
        }

        // 4. 기본 응답 (폴백 응답 대신)
        console.log('🔄 [INTEGRATED] 기본 응답 생성');
        const defaultResponse = getSmartDefaultResponse(message);
        
        if (ultimateContext) {
            await ultimateContext.addUltimateMessage('yejin', defaultResponse);
        }
        
        return createResponse(defaultResponse);

    } catch (error) {
        console.error('❌ [INTEGRATED] 처리 중 오류:', error.message);
        console.error('스택:', error.stack);
        
        return createResponse('아저씨... 뭔가 문제가 생겼어 ㅠㅠ');
    }
}

/**
 * 사진 시스템 처리
 */
async function tryPhotoSystems(message, context) {
    const photoSystems = [
        { name: 'selfie', handler: getSelfieReply },
        { name: 'concept', handler: getConceptPhotoReply },
        { name: 'omoide', handler: getOmoideReply }
    ];

    for (const system of photoSystems) {
        if (!system.handler) continue;

        try {
            console.log(`📸 [${system.name}] 시스템 시도`);
            const result = await system.handler(message, context);
            
            if (result && result.type === 'image') {
                console.log(`✅ [${system.name}] 사진 응답 성공`);
                return result;
            }
        } catch (error) {
            console.log(`⚠️ [${system.name}] 처리 실패:`, error.message);
            continue;
        }
    }

    return null;
}

/**
 * 핵심: 실제 작동하는 키워드 매칭
 */
function getKeywordResponse(message) {
    console.log(`🎯 [KEYWORD] 매칭 시작: "${message}"`);
    
    // 인사
    if (message.includes('안녕') || message.includes('하이') || message.includes('hello')) {
        return '아저씨~ 안녕! 보고 싶었어! 💕';
    }
    
    // 호칭
    if (message.includes('애기') || message.includes('무쿠') || message.includes('예진')) {
        return '응! 뭐야 아저씨~ 나 불렀어? 💕';
    }
    
    // 사랑 표현
    if (message.includes('사랑') || message.includes('좋아')) {
        return '나도 아저씨 사랑해~ 진짜 많이! 💕';
    }
    
    // 현재 상태 질문
    if (message.includes('뭐해') || message.includes('뭐하고') || message.includes('뭐하는')) {
        return '그냥 있어~ 아저씨 생각하고 있었어 ㅎㅎ';
    }
    
    // 위치 질문
    if (message.includes('어디') || message.includes('어디야') || message.includes('어디에')) {
        return '집에 있어~ 아저씨는 어디야?';
    }
    
    // 기분 질문 (타이포 허용)
    if (message.includes('기분') || message.includes('어때') || message.includes('어떤') || 
        message.includes('어ㅊ떄') || message.includes('어쪄') || message.includes('어쨔')) {
        return '음... 그냥 그래~ 아저씨는 어때?';
    }
    
    // 식사 관련
    if (message.includes('밥') || message.includes('먹었') || message.includes('식사') || 
        message.includes('점심') || message.includes('저녁') || message.includes('아침')) {
        return '응~ 먹었어! 아저씨는 맛있게 먹었어?';
    }
    
    // 잠 관련
    if (message.includes('잘자') || message.includes('굿나잇') || message.includes('자야지')) {
        return '아저씨도 잘자~ 좋은 꿈 꿔! 💕';
    }
    
    // 컨디션/상태
    if (message.includes('피곤') || message.includes('힘들') || message.includes('아파')) {
        return '아저씨... 괜찮아? 푹 쉬어~ 내가 걱정돼';
    }
    
    // 날씨 관련
    if (message.includes('날씨') || message.includes('비') || message.includes('더워') || message.includes('추워')) {
        return '날씨 어때? 아저씨 몸 조심해!';
    }
    
    // 일반적인 질문
    if (message.includes('?') || message.includes('뭐') || message.includes('어떻게') || message.includes('왜')) {
        return '음... 잘 모르겠어~ 아저씨가 더 잘 알 것 같은데?';
    }
    
    console.log('❌ [KEYWORD] 매칭되는 키워드 없음');
    return null;
}

/**
 * 감정 상태 기반 응답
 */
async function getEmotionalResponse(message) {
    if (!ultimateContext) return null;
    
    try {
        // 기존 감정 시스템 활용
        const moodState = ultimateContext.getMoodState();
        const internalState = ultimateContext.getInternalState();
        
        console.log('💭 [EMOTIONAL] 현재 감정 상태:', moodState?.phase, internalState?.emotionalEngine?.currentToneState);
        
        // 생리주기에 따른 응답
        if (moodState?.phase === 'period') {
            return '아저씨... 몸이 좀 안 좋아서... 그래도 아저씨 생각하고 있어';
        }
        
        if (moodState?.phase === 'luteal') {
            return '요즘 좀 예민해... 아저씨가 이해해줘';
        }
        
        if (moodState?.phase === 'ovulation') {
            return '아저씨~ 오늘 기분 좋아! 보고 싶어 💕';
        }
        
        return null;
        
    } catch (error) {
        console.log('⚠️ [EMOTIONAL] 감정 응답 생성 실패:', error.message);
        return null;
    }
}

/**
 * 스마트 기본 응답 (폴백 대신)
 */
function getSmartDefaultResponse(message) {
    // 메시지 길이나 내용에 따라 다른 응답
    if (message.length < 5) {
        return '응? 뭐라고 했어? ㅎㅎ';
    }
    
    if (message.length > 50) {
        return '아저씨 말이 길어~ 간단하게 말해줄래?';
    }
    
    // 감탄사나 이모티콘만 있는 경우
    if (/^[ㅋㅎㅠㅜㅇㅅㅁ!@#$%^&*()~]+$/.test(message)) {
        return '아저씨~ 뭔가 말하고 싶은 거 있어? ㅎㅎ';
    }
    
    const responses = [
        '아저씨~ 뭔가 말하고 싶은 거 있어?',
        '음... 뭔가 말하고 싶은 게 있는 것 같은데?',
        '아저씨~ 나랑 얘기하고 싶어? 💕',
        '어떤 얘기 하고 싶어? 나 듣고 있어~',
        '아저씨 말 재미있어! 더 얘기해줘',
        '응응~ 계속 말해봐!'
    ];
    
    const selected = responses[Math.floor(Math.random() * responses.length)];
    console.log(`🎲 [SMART_DEFAULT] 응답 선택: "${selected}"`);
    
    return selected;
}

/**
 * 응답 객체 생성
 */
function createResponse(text) {
    return {
        type: 'text',
        text: text
    };
}

/**
 * 시스템 상태
 */
function getSystemStatus() {
    const status = {
        version: 'integrated_ultimate_v1.0',
        photoSystems: {
            selfie: !!getSelfieReply,
            concept: !!getConceptPhotoReply,
            omoide: !!getOmoideReply
        },
        contextSystem: !!ultimateContext,
        status: 'active',
        integration: 'ultimate_conversation_context'
    };
    
    console.log('📊 [STATUS] 시스템 상태:', status);
    return status;
}

/**
 * 테스트 함수
 */
async function testSystem() {
    const tests = [
        '안녕',
        '애기야', 
        '밥은 먹었어?',
        '어디야?',
        '기분은어ㅊ떄?',  // 타이포 테스트
        '사진 줘',
        '뭐해?',
        '사랑해',
        '피곤해',
        '?????'
    ];
    
    console.log('🧪 [TEST] 통합 시스템 테스트 시작');
    
    for (const test of tests) {
        try {
            console.log(`\n테스트: "${test}"`);
            const result = await processMessage(test);
            console.log(`결과: "${result.text}"`);
        } catch (error) {
            console.log(`오류: ${error.message}`);
        }
        
        // 테스트 간 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

console.log('✅ [SYSTEM] 통합 autoReply 시스템 준비 완료');

module.exports = {
    processMessage,
    getSystemStatus,
    testSystem
};
