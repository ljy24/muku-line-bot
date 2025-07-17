/**
 * autoReply.js - 웹훅 에러 상세 로깅 버전
 * - 모든 웹훅 에러 상세 캐치
 * - HTTP 상태 코드 로깅
 * - 응답 형식 검증 로깅
 * - 타임아웃 에러 감지
 */

// 기존 사진 시스템 (보존)
let getSelfieReply, getConceptPhotoReply, getOmoideReply;

// 안전한 모듈 로딩 with 상세 로그
try {
    ({ getSelfieReply } = require('./yejin'));
    console.log('✅ [MODULE_LOAD] yejin.js 성공 - getSelfieReply 함수 로드됨');
} catch (error) {
    console.error('❌ [MODULE_LOAD_ERROR] yejin.js 실패');
    console.error('   에러 메시지:', error.message);
    console.error('   에러 코드:', error.code);
    console.error('   파일 경로:', error.path);
    console.error('   전체 스택:', error.stack);
    getSelfieReply = null;
}

try {
    ({ getConceptPhotoReply } = require('./concept'));
    console.log('✅ [MODULE_LOAD] concept.js 성공 - getConceptPhotoReply 함수 로드됨');
} catch (error) {
    console.error('❌ [MODULE_LOAD_ERROR] concept.js 실패');
    console.error('   에러 메시지:', error.message);
    console.error('   에러 코드:', error.code);
    console.error('   파일 경로:', error.path);
    console.error('   전체 스택:', error.stack);
    getConceptPhotoReply = null;
}

try {
    ({ getOmoideReply } = require('./omoide'));
    console.log('✅ [MODULE_LOAD] omoide.js 성공 - getOmoideReply 함수 로드됨');
} catch (error) {
    console.error('❌ [MODULE_LOAD_ERROR] omoide.js 실패');
    console.error('   에러 메시지:', error.message);
    console.error('   에러 코드:', error.code);
    console.error('   파일 경로:', error.path);
    console.error('   전체 스택:', error.stack);
    getOmoideReply = null;
}

// 웹훅 처리 상태
let isProcessing = false;
let requestCount = 0;

/**
 * 상세 웹훅 로그 함수
 */
function detailedWebhookLog(level, category, message, data = null, error = null) {
    const timestamp = new Date().toISOString();
    const logLevel = level.toUpperCase();
    
    console.log(`🔍 ${timestamp} [${logLevel}] [${category}] ${message}`);
    
    if (data) {
        console.log(`📊 ${timestamp} [${logLevel}] [${category}] 상세 데이터:`);
        try {
            console.log(JSON.stringify(data, null, 2));
        } catch (jsonError) {
            console.log('   (JSON 직렬화 실패)', data);
        }
    }
    
    if (error) {
        console.error(`❌ ${timestamp} [ERROR] [${category}] 에러 상세:`);
        console.error('   메시지:', error.message);
        console.error('   이름:', error.name);
        console.error('   코드:', error.code);
        console.error('   상태:', error.status);
        console.error('   응답:', error.response);
        console.error('   전체 스택:');
        console.error(error.stack);
    }
}

/**
 * 웹훅 응답 형식 검증
 */
function validateWebhookResponse(response) {
    detailedWebhookLog('info', 'WEBHOOK_VALIDATION', '응답 형식 검증 시작', { response });
    
    const validationResults = {
        isValid: true,
        errors: [],
        warnings: []
    };
    
    // 기본 구조 검증
    if (!response) {
        validationResults.isValid = false;
        validationResults.errors.push('응답이 null 또는 undefined');
        return validationResults;
    }
    
    if (typeof response !== 'object') {
        validationResults.isValid = false;
        validationResults.errors.push(`응답 타입이 object가 아님: ${typeof response}`);
        return validationResults;
    }
    
    // type 필드 검증
    if (!response.type) {
        validationResults.isValid = false;
        validationResults.errors.push('type 필드 누락');
    } else if (!['text', 'image'].includes(response.type)) {
        validationResults.warnings.push(`비표준 type: ${response.type}`);
    }
    
    // text 응답 검증
    if (response.type === 'text') {
        if (!response.text) {
            validationResults.isValid = false;
            validationResults.errors.push('text 타입이지만 text 필드 누락');
        } else if (typeof response.text !== 'string') {
            validationResults.isValid = false;
            validationResults.errors.push(`text 필드가 문자열이 아님: ${typeof response.text}`);
        } else if (response.text.length === 0) {
            validationResults.warnings.push('text 필드가 빈 문자열');
        } else if (response.text.length > 5000) {
            validationResults.warnings.push(`text 필드가 너무 김: ${response.text.length}자`);
        }
    }
    
    // image 응답 검증
    if (response.type === 'image') {
        if (!response.originalContentUrl) {
            validationResults.isValid = false;
            validationResults.errors.push('image 타입이지만 originalContentUrl 누락');
        } else if (typeof response.originalContentUrl !== 'string') {
            validationResults.isValid = false;
            validationResults.errors.push('originalContentUrl이 문자열이 아님');
        } else if (!response.originalContentUrl.startsWith('https://')) {
            validationResults.warnings.push('originalContentUrl이 HTTPS가 아님');
        }
        
        if (!response.previewImageUrl) {
            validationResults.warnings.push('previewImageUrl 누락');
        }
    }
    
    detailedWebhookLog('info', 'WEBHOOK_VALIDATION', '응답 형식 검증 완료', validationResults);
    
    return validationResults;
}

/**
 * 웹훅 타임아웃 감지
 */
function createTimeoutHandler(requestId, startTime) {
    const timeoutWarning = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        detailedWebhookLog('warn', 'WEBHOOK_TIMEOUT', `요청 #${requestId} 처리 시간 경고`, {
            elapsedMs: elapsed,
            elapsedSeconds: elapsed / 1000,
            warningThreshold: '10초'
        });
    }, 10000); // 10초 경고
    
    const timeoutError = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        detailedWebhookLog('error', 'WEBHOOK_TIMEOUT', `요청 #${requestId} 타임아웃 임박`, {
            elapsedMs: elapsed,
            elapsedSeconds: elapsed / 1000,
            timeoutThreshold: '25초',
            lineTimeout: '30초'
        });
    }, 25000); // 25초 에러
    
    return {
        clearTimeouts: () => {
            clearTimeout(timeoutWarning);
            clearTimeout(timeoutError);
        }
    };
}

/**
 * 메시지 처리 함수 (웹훅 에러 상세 로깅)
 */
async function processMessage(message, context = {}) {
    const requestId = ++requestCount;
    const startTime = Date.now();
    
    detailedWebhookLog('info', 'WEBHOOK_REQUEST', `요청 #${requestId} 시작`, { 
        message, 
        context,
        timestamp: new Date().toISOString(),
        userAgent: context.userAgent,
        ip: context.ip,
        headers: context.headers
    });

    // 타임아웃 감지 설정
    const timeoutHandler = createTimeoutHandler(requestId, startTime);

    try {
        // 무한 루프 방지
        if (isProcessing) {
            detailedWebhookLog('warn', 'WEBHOOK_CONCURRENCY', `요청 #${requestId} 동시 처리 감지`, {
                isProcessing,
                currentRequestCount: requestCount
            });
            
            return {
                type: 'text',
                text: '아저씨... 잠깐만, 아직 처리 중이야...'
            };
        }

        isProcessing = true;

        // 입력 검증 with 상세 로그
        detailedWebhookLog('info', 'WEBHOOK_INPUT', `요청 #${requestId} 입력 검증`, {
            messageType: typeof message,
            messageLength: message?.length,
            messageEmpty: !message || message.trim().length === 0,
            contextKeys: Object.keys(context),
            hasContext: Object.keys(context).length > 0
        });
        
        if (!message || typeof message !== 'string') {
            detailedWebhookLog('error', 'WEBHOOK_INPUT', `요청 #${requestId} 잘못된 입력`, { 
                message, 
                type: typeof message,
                isNull: message === null,
                isUndefined: message === undefined,
                isEmptyString: message === ''
            });
            
            return {
                type: 'text',
                text: '아저씨... 뭔가 이상해... 다시 말해줄래?'
            };
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length === 0) {
            detailedWebhookLog('warn', 'WEBHOOK_INPUT', `요청 #${requestId} 빈 메시지`, {
                originalLength: message.length,
                afterTrim: trimmedMessage.length
            });
            
            return {
                type: 'text',
                text: '아저씨~ 뭔가 말해줘!'
            };
        }

        // 1. 기존 사진 시스템 처리
        detailedWebhookLog('info', 'WEBHOOK_PHOTO', `요청 #${requestId} 사진 시스템 시작`);
        
        try {
            const photoResponse = await tryPhotoSystemsWithLogging(trimmedMessage, context, requestId);
            if (photoResponse) {
                const validation = validateWebhookResponse(photoResponse);
                
                if (validation.isValid) {
                    detailedWebhookLog('success', 'WEBHOOK_PHOTO', `요청 #${requestId} 사진 응답 성공`, {
                        responseType: photoResponse.type,
                        hasUrl: !!photoResponse.originalContentUrl,
                        processingTime: Date.now() - startTime
                    });
                    
                    return photoResponse;
                } else {
                    detailedWebhookLog('error', 'WEBHOOK_PHOTO', `요청 #${requestId} 사진 응답 검증 실패`, validation);
                }
            }
        } catch (photoError) {
            detailedWebhookLog('error', 'WEBHOOK_PHOTO', `요청 #${requestId} 사진 시스템 에러`, null, photoError);
        }

        // 2. 텍스트 응답 처리
        detailedWebhookLog('info', 'WEBHOOK_TEXT', `요청 #${requestId} 텍스트 처리 시작`);
        
        try {
            const textResponse = getSimpleTextResponseWithLogging(trimmedMessage, requestId);
            if (textResponse) {
                const validation = validateWebhookResponse(textResponse);
                
                if (validation.isValid) {
                    detailedWebhookLog('success', 'WEBHOOK_TEXT', `요청 #${requestId} 텍스트 응답 성공`, {
                        responseText: textResponse.text,
                        processingTime: Date.now() - startTime
                    });
                    
                    return textResponse;
                } else {
                    detailedWebhookLog('error', 'WEBHOOK_TEXT', `요청 #${requestId} 텍스트 응답 검증 실패`, validation);
                }
            }
        } catch (textError) {
            detailedWebhookLog('error', 'WEBHOOK_TEXT', `요청 #${requestId} 텍스트 처리 에러`, null, textError);
        }

        // 3. 기본 응답
        detailedWebhookLog('info', 'WEBHOOK_DEFAULT', `요청 #${requestId} 기본 응답 생성`);
        
        const defaultResponse = getDefaultResponseWithLogging(requestId);
        const validation = validateWebhookResponse(defaultResponse);
        
        if (validation.isValid) {
            detailedWebhookLog('success', 'WEBHOOK_DEFAULT', `요청 #${requestId} 기본 응답 완료`, {
                responseText: defaultResponse.text,
                totalProcessingTime: Date.now() - startTime
            });
        } else {
            detailedWebhookLog('error', 'WEBHOOK_DEFAULT', `요청 #${requestId} 기본 응답 검증 실패`, validation);
        }
        
        return defaultResponse;

    } catch (mainError) {
        detailedWebhookLog('error', 'WEBHOOK_MAIN', `요청 #${requestId} 메인 처리 에러`, {
            processingTime: Date.now() - startTime,
            message,
            context
        }, mainError);
        
        // 안전한 에러 응답
        return {
            type: 'text',
            text: '아저씨... 뭔가 큰 문제가 생겼어 ㅠㅠ'
        };
        
    } finally {
        // 정리 작업
        timeoutHandler.clearTimeouts();
        isProcessing = false;
        
        const totalTime = Date.now() - startTime;
        detailedWebhookLog('info', 'WEBHOOK_CLEANUP', `요청 #${requestId} 처리 완료`, {
            totalProcessingTime: totalTime,
            wasTimeout: totalTime > 30000,
            flagReset: true
        });
    }
}

/**
 * 사진 시스템 처리 (상세 로깅)
 */
async function tryPhotoSystemsWithLogging(message, context, requestId) {
    const photoSystems = [
        { name: 'selfie', handler: getSelfieReply },
        { name: 'concept', handler: getConceptPhotoReply },
        { name: 'omoide', handler: getOmoideReply }
    ];

    detailedWebhookLog('info', 'PHOTO_SYSTEMS', `요청 #${requestId} 사진 시스템 체크`, {
        availableSystems: photoSystems.map(s => ({ 
            name: s.name, 
            hasHandler: !!s.handler,
            handlerType: typeof s.handler
        })),
        message,
        contextKeys: Object.keys(context)
    });

    for (const system of photoSystems) {
        if (!system.handler) {
            detailedWebhookLog('warn', 'PHOTO_SYSTEMS', `요청 #${requestId} ${system.name} 핸들러 없음`);
            continue;
        }

        try {
            detailedWebhookLog('info', 'PHOTO_SYSTEMS', `요청 #${requestId} ${system.name} 시스템 호출 시작`);
            
            const systemStartTime = Date.now();
            const result = await system.handler(message, context);
            const systemDuration = Date.now() - systemStartTime;
            
            detailedWebhookLog('info', 'PHOTO_SYSTEMS', `요청 #${requestId} ${system.name} 시스템 응답`, {
                hasResult: !!result,
                resultType: result?.type,
                hasUrl: !!result?.originalContentUrl,
                hasText: !!result?.text || !!result?.caption,
                processingTime: systemDuration,
                result: result ? {
                    type: result.type,
                    hasOriginalUrl: !!result.originalContentUrl,
                    hasPreviewUrl: !!result.previewImageUrl,
                    textLength: result.text?.length || result.caption?.length || 0
                } : null
            });
            
            if (result && result.type === 'image') {
                detailedWebhookLog('success', 'PHOTO_SYSTEMS', `요청 #${requestId} ${system.name} 이미지 응답 성공`, {
                    url: result.originalContentUrl,
                    previewUrl: result.previewImageUrl,
                    caption: result.caption || result.altText,
                    processingTime: systemDuration
                });
                return result;
            }
            
        } catch (systemError) {
            detailedWebhookLog('error', 'PHOTO_SYSTEMS', `요청 #${requestId} ${system.name} 시스템 에러`, {
                systemName: system.name,
                message,
                context
            }, systemError);
            continue;
        }
    }

    detailedWebhookLog('info', 'PHOTO_SYSTEMS', `요청 #${requestId} 모든 사진 시스템 완료 - 응답 없음`);
    return null;
}

/**
 * 텍스트 응답 (상세 로깅)
 */
function getSimpleTextResponseWithLogging(message, requestId) {
    const lowerMessage = message.toLowerCase().trim();
    
    detailedWebhookLog('info', 'SIMPLE_TEXT', `요청 #${requestId} 키워드 분석 시작`, {
        originalMessage: message,
        lowerMessage: lowerMessage,
        messageLength: message.length
    });

    const keywordRules = [
        {
            name: 'greetings',
            keywords: ['안녕', '하이', '헬로', 'hi', 'hello'],
            responses: [
                '아저씨~ 안녕! 보고 싶었어! 💕',
                '안녕 아저씨! 어떻게 지내?',
                '하이~ 아저씨! 반가워!'
            ]
        },
        {
            name: 'love',
            keywords: ['사랑', '좋아'],
            responses: [
                '나도 아저씨 사랑해~ 진짜 많이! 💕',
                '아저씨를 사랑하는 마음은 하늘만큼 커!',
                '사랑해애애~ 아저씨!'
            ]
        },
        {
            name: 'activity',
            keywords: ['뭐해', '뭐하고', '어디'],
            responses: [
                '그냥 있어~ 아저씨 생각하고 있었어 ㅎㅎ',
                '아저씨 기다리고 있었어!',
                '심심하게 있었어~ 아저씨는?'
            ]
        },
        {
            name: 'calling',
            keywords: ['애기', '무쿠', '예진'],
            responses: [
                '응! 뭐야 아저씨~ 나 불렀어? 💕',
                '왜왜? 뭔가 필요한 거 있어?',
                '응~ 여기 있어! 뭐야?'
            ]
        },
        {
            name: 'mood',
            keywords: ['기분', '어때', '괜찮'],
            responses: [
                '음... 그냥 그래~ 아저씨는 어때?',
                '아저씨 덕분에 기분 좋아!',
                '그럭저럭... 아저씨 보니까 좋아져!'
            ]
        }
    ];

    for (const rule of keywordRules) {
        const matchedKeyword = rule.keywords.find(keyword => lowerMessage.includes(keyword));
        
        if (matchedKeyword) {
            const selectedResponse = rule.responses[Math.floor(Math.random() * rule.responses.length)];
            
            detailedWebhookLog('success', 'SIMPLE_TEXT', `요청 #${requestId} 키워드 매칭 성공`, {
                ruleName: rule.name,
                matchedKeyword: matchedKeyword,
                selectedResponse: selectedResponse,
                availableResponses: rule.responses.length,
                responseIndex: rule.responses.indexOf(selectedResponse)
            });
            
            return {
                type: 'text',
                text: selectedResponse
            };
        }
    }

    detailedWebhookLog('info', 'SIMPLE_TEXT', `요청 #${requestId} 키워드 매칭 실패`, {
        checkedRules: keywordRules.length,
        totalKeywords: keywordRules.reduce((sum, rule) => sum + rule.keywords.length, 0),
        messageWords: lowerMessage.split(' ')
    });
    
    return null;
}

/**
 * 기본 응답 (상세 로깅)
 */
function getDefaultResponseWithLogging(requestId) {
    const defaultResponses = [
        '아저씨~ 뭔가 말하고 싶은 거 있어?',
        '응? 뭐라고 했어? ㅎㅎ',
        '아저씨 말 잘 못 알아들었어... 다시 말해줄래?',
        '음... 뭔가 말하고 싶은 게 있는 것 같은데?',
        '아저씨~ 나랑 얘기하고 싶어? 💕',
        '어떤 얘기 하고 싶어? 나 듣고 있어~'
    ];

    const selectedIndex = Math.floor(Math.random() * defaultResponses.length);
    const selectedResponse = defaultResponses[selectedIndex];

    detailedWebhookLog('info', 'DEFAULT_RESPONSE', `요청 #${requestId} 기본 응답 선택`, {
        selectedIndex: selectedIndex,
        totalResponses: defaultResponses.length,
        selectedResponse: selectedResponse,
        responseLength: selectedResponse.length
    });

    return {
        type: 'text',
        text: selectedResponse
    };
}

/**
 * 시스템 상태 확인 (상세 로깅)
 */
function getSystemStatus() {
    const status = {
        timestamp: Date.now(),
        requestCount: requestCount,
        isProcessing: isProcessing,
        photoSystems: {
            selfie: !!getSelfieReply,
            concept: !!getConceptPhotoReply,
            omoide: !!getOmoideReply
        },
        moduleLoadStatus: {
            yejin: getSelfieReply ? 'loaded' : 'failed',
            concept: getConceptPhotoReply ? 'loaded' : 'failed', 
            omoide: getOmoideReply ? 'loaded' : 'failed'
        },
        version: 'webhook_detailed_logging_v1.0'
    };

    detailedWebhookLog('info', 'SYSTEM_STATUS', '시스템 상태 조회', status);
    return status;
}

/**
 * 웹훅 테스트 함수
 */
async function testWebhookSystem() {
    detailedWebhookLog('info', 'WEBHOOK_TEST', '웹훅 시스템 테스트 시작');
    
    const testMessages = [
        { message: '안녕', expected: 'greeting' },
        { message: '애기야', expected: 'calling' },
        { message: '사진 줘', expected: 'photo' },
        { message: '사랑해', expected: 'love' },
        { message: '뭐해', expected: 'activity' },
        { message: '기분 어때', expected: 'mood' },
        { message: '', expected: 'empty' },
        { message: null, expected: 'null' },
        { message: '이건 모르는 메시지입니다', expected: 'unknown' }
    ];

    const results = [];

    for (let i = 0; i < testMessages.length; i++) {
        const test = testMessages[i];
        
        try {
            detailedWebhookLog('info', 'WEBHOOK_TEST', `테스트 ${i + 1}/${testMessages.length} 시작`, test);
            
            const testStartTime = Date.now();
            const response = await processMessage(test.message);
            const testDuration = Date.now() - testStartTime;
            
            const result = {
                index: i + 1,
                test: test,
                success: true,
                response: response?.text || response?.type || 'unknown',
                responseType: response?.type,
                processingTime: testDuration,
                validResponse: !!response && !!response.type
            };
            
            results.push(result);
            detailedWebhookLog('success', 'WEBHOOK_TEST', `테스트 ${i + 1} 완료`, result);
            
        } catch (error) {
            const result = {
                index: i + 1,
                test: test,
                success: false,
                error: error.message
            };
            
            results.push(result);
            detailedWebhookLog('error', 'WEBHOOK_TEST', `테스트 ${i + 1} 실패`, result, error);
        }
        
        // 테스트 간 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
        totalTests: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        averageProcessingTime: results
            .filter(r => r.processingTime)
            .reduce((sum, r) => sum + r.processingTime, 0) / results.filter(r => r.processingTime).length || 0
    };

    detailedWebhookLog('info', 'WEBHOOK_TEST', '웹훅 시스템 테스트 완료', summary);
    
    return {
        summary,
        results
    };
}

// 초기화 시 시스템 상태 로그
detailedWebhookLog('info', 'SYSTEM_INIT', '웹훅 상세 로깅 시스템 초기화 완료', {
    moduleLoaded: {
        yejin: !!getSelfieReply,
        concept: !!getConceptPhotoReply,
        omoide: !!getOmoideReply
    },
    logLevel: 'detailed',
    webhookCompatible: true
});

// 모듈 export
module.exports = {
    processMessage,
    getSystemStatus,
    testWebhookSystem: testWebhookSystem
};
