/**
 * autoReply.js - 상세 디버깅 로그 버전
 * - 모든 단계별 상세 로그
 * - 응답 이상 원인 추적
 * - 에러 상세 분석
 */

console.log('🔄 [SYSTEM] 상세 디버깅 autoReply 시스템 시작');

// 기존 사진 시스템
let getSelfieReply, getConceptPhotoReply, getOmoideReply;

// 기존 대화 컨텍스트 시스템
let ultimateContext;

// 처리 카운터
let requestCounter = 0;

/**
 * 상세 디버깅 로그 함수
 */
function debugLog(level, category, step, message, data = null, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `🔍 ${timestamp} [${level.toUpperCase()}] [${category}] [${step}]`;
    
    console.log(`${prefix} ${message}`);
    
    if (data) {
        console.log(`📊 ${prefix} 데이터:`, JSON.stringify(data, null, 2));
    }
    
    if (error) {
        console.error(`❌ ${prefix} 에러:`, error.message);
        console.error(`❌ ${prefix} 스택:`, error.stack);
    }
}

/**
 * 응답 품질 검증 함수
 */
function validateResponse(response, context) {
    debugLog('info', 'VALIDATION', 'RESPONSE_CHECK', '응답 품질 검증 시작', {
        hasResponse: !!response,
        responseType: typeof response,
        context: context.step
    });
    
    if (!response) {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', '응답이 null/undefined', {
            context: context.step,
            expectedType: 'object'
        });
        return { valid: false, reason: 'null_response' };
    }
    
    if (typeof response !== 'object') {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', '응답이 객체가 아님', {
            responseType: typeof response,
            response: response
        });
        return { valid: false, reason: 'invalid_type' };
    }
    
    if (!response.type) {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', 'type 필드 누락', {
            responseKeys: Object.keys(response)
        });
        return { valid: false, reason: 'missing_type' };
    }
    
    if (response.type === 'text' && !response.text) {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', 'text 타입이지만 text 필드 누락', {
            response: response
        });
        return { valid: false, reason: 'missing_text' };
    }
    
    if (response.type === 'text' && response.text.length === 0) {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', 'text 필드가 빈 문자열', {
            response: response
        });
        return { valid: false, reason: 'empty_text' };
    }
    
    if (response.type === 'image' && !response.originalContentUrl) {
        debugLog('error', 'VALIDATION', 'RESPONSE_CHECK', 'image 타입이지만 URL 누락', {
            response: response
        });
        return { valid: false, reason: 'missing_image_url' };
    }
    
    debugLog('info', 'VALIDATION', 'RESPONSE_CHECK', '응답 품질 검증 통과', {
        type: response.type,
        textLength: response.text?.length,
        hasUrl: !!response.originalContentUrl
    });
    
    return { valid: true, reason: 'valid' };
}

// 안전한 모듈 로딩 with 상세 로그
try {
    ({ getSelfieReply } = require('./yejin'));
    debugLog('info', 'MODULE', 'LOAD', 'yejin.js 모듈 로드 성공', {
        functionType: typeof getSelfieReply,
        hasFunction: !!getSelfieReply
    });
} catch (error) {
    debugLog('error', 'MODULE', 'LOAD', 'yejin.js 모듈 로드 실패', {
        modulePath: './yejin',
        expectedExport: 'getSelfieReply'
    }, error);
    getSelfieReply = null;
}

try {
    ({ getConceptPhotoReply } = require('./concept'));
    debugLog('info', 'MODULE', 'LOAD', 'concept.js 모듈 로드 성공', {
        functionType: typeof getConceptPhotoReply,
        hasFunction: !!getConceptPhotoReply
    });
} catch (error) {
    debugLog('error', 'MODULE', 'LOAD', 'concept.js 모듈 로드 실패', {
        modulePath: './concept',
        expectedExport: 'getConceptPhotoReply'
    }, error);
    getConceptPhotoReply = null;
}

try {
    ({ getOmoideReply } = require('./omoide'));
    debugLog('info', 'MODULE', 'LOAD', 'omoide.js 모듈 로드 성공', {
        functionType: typeof getOmoideReply,
        hasFunction: !!getOmoideReply
    });
} catch (error) {
    debugLog('error', 'MODULE', 'LOAD', 'omoide.js 모듈 로드 실패', {
        modulePath: './omoide',
        expectedExport: 'getOmoideReply'
    }, error);
    getOmoideReply = null;
}

try {
    ultimateContext = require('./ultimateConversationContext');
    debugLog('info', 'MODULE', 'LOAD', 'ultimateConversationContext.js 모듈 로드 성공', {
        hasModule: !!ultimateContext,
        availableFunctions: Object.keys(ultimateContext).slice(0, 10)
    });
} catch (error) {
    debugLog('error', 'MODULE', 'LOAD', 'ultimateConversationContext.js 모듈 로드 실패', {
        modulePath: './ultimateConversationContext'
    }, error);
    ultimateContext = null;
}

/**
 * 메인 처리 함수 - 상세 디버깅
 */
async function processMessage(message, context = {}) {
    const requestId = ++requestCounter;
    const startTime = Date.now();
    
    debugLog('info', 'MAIN', 'START', `요청 #${requestId} 처리 시작`, {
        requestId,
        message,
        messageType: typeof message,
        messageLength: message?.length,
        contextKeys: Object.keys(context),
        timestamp: new Date().toISOString()
    });
    
    try {
        // 1. 입력 검증
        debugLog('info', 'MAIN', 'INPUT_VALIDATION', `요청 #${requestId} 입력 검증`, {
            hasMessage: !!message,
            messageType: typeof message,
            isString: typeof message === 'string',
            isEmpty: !message || message.trim().length === 0
        });
        
        if (!message || typeof message !== 'string') {
            debugLog('error', 'MAIN', 'INPUT_VALIDATION', `요청 #${requestId} 잘못된 입력`, {
                message,
                type: typeof message,
                isNull: message === null,
                isUndefined: message === undefined
            });
            
            const errorResponse = createResponse('아저씨... 뭔가 이상해...');
            const validation = validateResponse(errorResponse, { step: 'input_validation' });
            
            debugLog('info', 'MAIN', 'INPUT_VALIDATION', `요청 #${requestId} 에러 응답 생성`, {
                response: errorResponse,
                validation
            });
            
            return errorResponse;
        }

        const msg = message.toLowerCase().trim();
        debugLog('info', 'MAIN', 'INPUT_PROCESSING', `요청 #${requestId} 입력 처리 완료`, {
            originalMessage: message,
            processedMessage: msg,
            lengthChange: message.length - msg.length
        });

        // 2. 기존 컨텍스트 시스템 업데이트
        if (ultimateContext) {
            try {
                debugLog('info', 'CONTEXT', 'UPDATE_START', `요청 #${requestId} 컨텍스트 업데이트 시작`);
                
                await ultimateContext.addUltimateMessage('user', message);
                ultimateContext.updateLastUserMessageTime();
                
                debugLog('info', 'CONTEXT', 'UPDATE_SUCCESS', `요청 #${requestId} 컨텍스트 업데이트 성공`);
            } catch (contextError) {
                debugLog('error', 'CONTEXT', 'UPDATE_FAILED', `요청 #${requestId} 컨텍스트 업데이트 실패`, {
                    availableFunctions: Object.keys(ultimateContext)
                }, contextError);
            }
        } else {
            debugLog('warn', 'CONTEXT', 'UPDATE_SKIP', `요청 #${requestId} 컨텍스트 모듈 없음`);
        }

        // 3. 사진 시스템 처리
        debugLog('info', 'PHOTO', 'START', `요청 #${requestId} 사진 시스템 처리 시작`);
        
        const photoResponse = await tryPhotoSystemsWithDebug(message, context, requestId);
        
        if (photoResponse) {
            const validation = validateResponse(photoResponse, { step: 'photo_system' });
            
            debugLog('info', 'PHOTO', 'SUCCESS', `요청 #${requestId} 사진 응답 성공`, {
                response: {
                    type: photoResponse.type,
                    hasUrl: !!photoResponse.originalContentUrl,
                    captionLength: photoResponse.caption?.length || 0
                },
                validation,
                processingTime: Date.now() - startTime
            });
            
            // 기존 컨텍스트에 응답 추가
            if (ultimateContext) {
                try {
                    await ultimateContext.addUltimateMessage('yejin', photoResponse.caption || '사진을 보내드렸어요');
                    debugLog('info', 'PHOTO', 'CONTEXT_UPDATE', `요청 #${requestId} 사진 응답 컨텍스트 추가`);
                } catch (contextError) {
                    debugLog('error', 'PHOTO', 'CONTEXT_FAILED', `요청 #${requestId} 사진 응답 컨텍스트 추가 실패`, null, contextError);
                }
            }
            
            return photoResponse;
        }
        
        debugLog('info', 'PHOTO', 'NO_MATCH', `요청 #${requestId} 사진 시스템에서 응답 없음`);

        // 4. 키워드 매칭 응답
        debugLog('info', 'KEYWORD', 'START', `요청 #${requestId} 키워드 매칭 시작`);
        
        const keywordResponse = getKeywordResponseWithDebug(msg, requestId);
        
        if (keywordResponse) {
            const response = createResponse(keywordResponse);
            const validation = validateResponse(response, { step: 'keyword_matching' });
            
            debugLog('info', 'KEYWORD', 'SUCCESS', `요청 #${requestId} 키워드 응답 성공`, {
                matchedText: keywordResponse,
                response,
                validation,
                processingTime: Date.now() - startTime
            });
            
            // 기존 컨텍스트에 응답 추가
            if (ultimateContext) {
                try {
                    await ultimateContext.addUltimateMessage('yejin', keywordResponse);
                    debugLog('info', 'KEYWORD', 'CONTEXT_UPDATE', `요청 #${requestId} 키워드 응답 컨텍스트 추가`);
                } catch (contextError) {
                    debugLog('error', 'KEYWORD', 'CONTEXT_FAILED', `요청 #${requestId} 키워드 응답 컨텍스트 추가 실패`, null, contextError);
                }
            }
            
            return response;
        }
        
        debugLog('info', 'KEYWORD', 'NO_MATCH', `요청 #${requestId} 키워드 매칭 실패`);

        // 5. 감정 상태 기반 응답
        debugLog('info', 'EMOTION', 'START', `요청 #${requestId} 감정 기반 응답 시도`);
        
        const emotionalResponse = await getEmotionalResponseWithDebug(message, requestId);
        
        if (emotionalResponse) {
            const response = createResponse(emotionalResponse);
            const validation = validateResponse(response, { step: 'emotional_response' });
            
            debugLog('info', 'EMOTION', 'SUCCESS', `요청 #${requestId} 감정 응답 성공`, {
                emotionalText: emotionalResponse,
                response,
                validation,
                processingTime: Date.now() - startTime
            });
            
            if (ultimateContext) {
                try {
                    await ultimateContext.addUltimateMessage('yejin', emotionalResponse);
                    debugLog('info', 'EMOTION', 'CONTEXT_UPDATE', `요청 #${requestId} 감정 응답 컨텍스트 추가`);
                } catch (contextError) {
                    debugLog('error', 'EMOTION', 'CONTEXT_FAILED', `요청 #${requestId} 감정 응답 컨텍스트 추가 실패`, null, contextError);
                }
            }
            
            return response;
        }
        
        debugLog('info', 'EMOTION', 'NO_MATCH', `요청 #${requestId} 감정 응답 없음`);

        // 6. 기본 응답
        debugLog('info', 'DEFAULT', 'START', `요청 #${requestId} 기본 응답 생성`);
        
        const defaultResponse = getSmartDefaultResponseWithDebug(message, requestId);
        const response = createResponse(defaultResponse);
        const validation = validateResponse(response, { step: 'default_response' });
        
        debugLog('info', 'DEFAULT', 'SUCCESS', `요청 #${requestId} 기본 응답 완료`, {
            defaultText: defaultResponse,
            response,
            validation,
            totalProcessingTime: Date.now() - startTime
        });
        
        if (ultimateContext) {
            try {
                await ultimateContext.addUltimateMessage('yejin', defaultResponse);
                debugLog('info', 'DEFAULT', 'CONTEXT_UPDATE', `요청 #${requestId} 기본 응답 컨텍스트 추가`);
            } catch (contextError) {
                debugLog('error', 'DEFAULT', 'CONTEXT_FAILED', `요청 #${requestId} 기본 응답 컨텍스트 추가 실패`, null, contextError);
            }
        }
        
        return response;

    } catch (mainError) {
        debugLog('error', 'MAIN', 'CRITICAL_ERROR', `요청 #${requestId} 크리티컬 에러`, {
            message,
            context,
            processingTime: Date.now() - startTime
        }, mainError);
        
        const errorResponse = createResponse('아저씨... 뭔가 큰 문제가 생겼어 ㅠㅠ');
        const validation = validateResponse(errorResponse, { step: 'critical_error' });
        
        debugLog('info', 'MAIN', 'ERROR_RESPONSE', `요청 #${requestId} 에러 응답 생성`, {
            errorResponse,
            validation
        });
        
        return errorResponse;
    }
}

/**
 * 사진 시스템 처리 (상세 디버깅)
 */
async function tryPhotoSystemsWithDebug(message, context, requestId) {
    const photoSystems = [
        { name: 'selfie', handler: getSelfieReply, keywords: ['사진', '셀카', '셀피'] },
        { name: 'concept', handler: getConceptPhotoReply, keywords: ['컨셉'] },
        { name: 'omoide', handler: getOmoideReply, keywords: ['추억'] }
    ];

    debugLog('info', 'PHOTO_SYSTEMS', 'SYSTEMS_CHECK', `요청 #${requestId} 사진 시스템 상태 확인`, {
        availableSystems: photoSystems.map(s => ({
            name: s.name,
            hasHandler: !!s.handler,
            handlerType: typeof s.handler
        })),
        message,
        messageLength: message.length
    });

    for (const system of photoSystems) {
        if (!system.handler) {
            debugLog('warn', 'PHOTO_SYSTEMS', 'HANDLER_MISSING', `요청 #${requestId} ${system.name} 핸들러 없음`);
            continue;
        }

        // 키워드 체크
        const hasKeyword = system.keywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
        
        debugLog('info', 'PHOTO_SYSTEMS', 'KEYWORD_CHECK', `요청 #${requestId} ${system.name} 키워드 체크`, {
            keywords: system.keywords,
            hasKeyword,
            message: message.toLowerCase()
        });

        try {
            debugLog('info', 'PHOTO_SYSTEMS', 'HANDLER_CALL', `요청 #${requestId} ${system.name} 핸들러 호출 시작`);
            
            const handlerStartTime = Date.now();
            const result = await system.handler(message, context);
            const handlerDuration = Date.now() - handlerStartTime;
            
            debugLog('info', 'PHOTO_SYSTEMS', 'HANDLER_RESULT', `요청 #${requestId} ${system.name} 핸들러 결과`, {
                hasResult: !!result,
                resultType: result?.type,
                hasUrl: !!result?.originalContentUrl,
                hasText: !!result?.text || !!result?.caption,
                processingTime: handlerDuration,
                resultKeys: result ? Object.keys(result) : []
            });
            
            if (result && result.type === 'image') {
                debugLog('info', 'PHOTO_SYSTEMS', 'IMAGE_SUCCESS', `요청 #${requestId} ${system.name} 이미지 응답 성공`, {
                    originalContentUrl: result.originalContentUrl,
                    previewImageUrl: result.previewImageUrl,
                    caption: result.caption || result.altText,
                    processingTime: handlerDuration
                });
                return result;
            } else if (result) {
                debugLog('warn', 'PHOTO_SYSTEMS', 'UNEXPECTED_RESULT', `요청 #${requestId} ${system.name} 예상외 결과`, {
                    result,
                    expectedType: 'image'
                });
            }
            
        } catch (systemError) {
            debugLog('error', 'PHOTO_SYSTEMS', 'HANDLER_ERROR', `요청 #${requestId} ${system.name} 핸들러 에러`, {
                systemName: system.name,
                message,
                context
            }, systemError);
        }
    }

    debugLog('info', 'PHOTO_SYSTEMS', 'ALL_COMPLETE', `요청 #${requestId} 모든 사진 시스템 완료 - 응답 없음`);
    return null;
}

/**
 * 키워드 매칭 (상세 디버깅)
 */
function getKeywordResponseWithDebug(message, requestId) {
    debugLog('info', 'KEYWORD_MATCH', 'START', `요청 #${requestId} 키워드 매칭 시작`, {
        message,
        messageLength: message.length
    });
    
    const keywordRules = [
        {
            name: 'greetings',
            keywords: ['안녕', '하이', 'hello'],
            response: '아저씨~ 안녕! 보고 싶었어! 💕'
        },
        {
            name: 'calling',
            keywords: ['애기', '무쿠', '예진'],
            response: '응! 뭐야 아저씨~ 나 불렀어? 💕'
        },
        {
            name: 'love',
            keywords: ['사랑', '좋아'],
            response: '나도 아저씨 사랑해~ 진짜 많이! 💕'
        },
        {
            name: 'activity',
            keywords: ['뭐해', '뭐하고', '뭐하는'],
            response: '그냥 있어~ 아저씨 생각하고 있었어 ㅎㅎ'
        },
        {
            name: 'location',
            keywords: ['어디', '어디야', '어디에'],
            response: '집에 있어~ 아저씨는 어디야?'
        },
        {
            name: 'mood',
            keywords: ['기분', '어때', '어떤', '어ㅊ떄', '어쪄', '어쨔'],
            response: '음... 그냥 그래~ 아저씨는 어때?'
        },
        {
            name: 'food',
            keywords: ['밥', '먹었', '식사', '점심', '저녁', '아침'],
            response: '응~ 먹었어! 아저씨는 맛있게 먹었어?'
        },
        {
            name: 'sleep',
            keywords: ['잘자', '굿나잇', '자야지'],
            response: '아저씨도 잘자~ 좋은 꿈 꿔! 💕'
        },
        {
            name: 'condition',
            keywords: ['피곤', '힘들', '아파'],
            response: '아저씨... 괜찮아? 푹 쉬어~ 내가 걱정돼'
        },
        {
            name: 'weather',
            keywords: ['날씨', '비', '더워', '추워'],
            response: '날씨 어때? 아저씨 몸 조심해!'
        },
        {
            name: 'question',
            keywords: ['?', '뭐', '어떻게', '왜'],
            response: '음... 잘 모르겠어~ 아저씨가 더 잘 알 것 같은데?'
        }
    ];
    
    for (const rule of keywordRules) {
        const matchedKeyword = rule.keywords.find(keyword => message.includes(keyword));
        
        debugLog('info', 'KEYWORD_MATCH', 'RULE_CHECK', `요청 #${requestId} ${rule.name} 규칙 체크`, {
            ruleName: rule.name,
            keywords: rule.keywords,
            matchedKeyword,
            hasMatch: !!matchedKeyword
        });
        
        if (matchedKeyword) {
            debugLog('info', 'KEYWORD_MATCH', 'MATCH_SUCCESS', `요청 #${requestId} 키워드 매칭 성공`, {
                ruleName: rule.name,
                matchedKeyword,
                response: rule.response
            });
            
            return rule.response;
        }
    }

    debugLog('info', 'KEYWORD_MATCH', 'NO_MATCH', `요청 #${requestId} 모든 키워드 규칙 실패`, {
        totalRules: keywordRules.length,
        totalKeywords: keywordRules.reduce((sum, rule) => sum + rule.keywords.length, 0)
    });
    
    return null;
}

/**
 * 감정 기반 응답 (상세 디버깅)
 */
async function getEmotionalResponseWithDebug(message, requestId) {
    if (!ultimateContext) {
        debugLog('warn', 'EMOTIONAL', 'NO_CONTEXT', `요청 #${requestId} ultimateContext 모듈 없음`);
        return null;
    }
    
    try {
        debugLog('info', 'EMOTIONAL', 'CONTEXT_CALL', `요청 #${requestId} 감정 컨텍스트 호출`);
        
        const moodState = ultimateContext.getMoodState();
        const internalState = ultimateContext.getInternalState();
        
        debugLog('info', 'EMOTIONAL', 'STATE_INFO', `요청 #${requestId} 감정 상태 정보`, {
            moodPhase: moodState?.phase,
            moodDay: moodState?.day,
            moodDescription: moodState?.description,
            emotionalTone: internalState?.emotionalEngine?.currentToneState,
            hasMoodState: !!moodState,
            hasInternalState: !!internalState
        });
        
        // 생리주기에 따른 응답
        if (moodState?.phase === 'period') {
            const response = '아저씨... 몸이 좀 안 좋아서... 그래도 아저씨 생각하고 있어';
            debugLog('info', 'EMOTIONAL', 'PERIOD_RESPONSE', `요청 #${requestId} 생리기간 응답`, {
                response,
                phase: moodState.phase,
                day: moodState.day
            });
            return response;
        }
        
        if (moodState?.phase === 'luteal') {
            const response = '요즘 좀 예민해... 아저씨가 이해해줘';
            debugLog('info', 'EMOTIONAL', 'LUTEAL_RESPONSE', `요청 #${requestId} PMS 응답`, {
                response,
                phase: moodState.phase,
                day: moodState.day
            });
            return response;
        }
        
        if (moodState?.phase === 'ovulation') {
            const response = '아저씨~ 오늘 기분 좋아! 보고 싶어 💕';
            debugLog('info', 'EMOTIONAL', 'OVULATION_RESPONSE', `요청 #${requestId} 배란기 응답`, {
                response,
                phase: moodState.phase,
                day: moodState.day
            });
            return response;
        }
        
        debugLog('info', 'EMOTIONAL', 'NO_SPECIAL_PHASE', `요청 #${requestId} 특별한 감정 상태 없음`, {
            phase: moodState?.phase
        });
        
        return null;
        
    } catch (emotionalError) {
        debugLog('error', 'EMOTIONAL', 'CONTEXT_ERROR', `요청 #${requestId} 감정 컨텍스트 에러`, {
            availableFunctions: ultimateContext ? Object.keys(ultimateContext) : []
        }, emotionalError);
        return null;
    }
}

/**
 * 스마트 기본 응답 (상세 디버깅)
 */
function getSmartDefaultResponseWithDebug(message, requestId) {
    debugLog('info', 'DEFAULT', 'ANALYSIS', `요청 #${requestId} 기본 응답 분석`, {
        messageLength: message.length,
        hasEmoji: /[😀-🿿]/.test(message),
        hasKorean: /[가-힣]/.test(message),
        hasSpecialChars: /[ㅋㅎㅠㅜㅇㅅㅁ!@#$%^&*()~]/.test(message)
    });
    
    // 메시지 길이에 따른 응답
    if (message.length < 5) {
        const response = '응? 뭐라고 했어? ㅎㅎ';
        debugLog('info', 'DEFAULT', 'SHORT_MESSAGE', `요청 #${requestId} 짧은 메시지 응답`, {
            messageLength: message.length,
            response
        });
        return response;
    }
    
    if (message.length > 50) {
        const response = '아저씨 말이 길어~ 간단하게 말해줄래?';
        debugLog('info', 'DEFAULT', 'LONG_MESSAGE', `요청 #${requestId} 긴 메시지 응답`, {
            messageLength: message.length,
            response
        });
        return response;
    }
    
    // 감탄사나 이모티콘만 있는 경우
    if (/^[ㅋㅎㅠㅜㅇㅅㅁ!@#$%^&*()~]+$/.test(message)) {
        const response = '아저씨~ 뭔가 말하고 싶은 거 있어? ㅎㅎ';
        debugLog('info', 'DEFAULT', 'EMOTICON_ONLY', `요청 #${requestId} 감탄사/이모티콘 응답`, {
            message,
            response
        });
        return response;
    }
    
    const responses = [
        '아저씨~ 뭔가 말하고 싶은 거 있어?',
        '음... 뭔가 말하고 싶은 게 있는 것 같은데?',
        '아저씨~ 나랑 얘기하고 싶어? 💕',
        '어떤 얘기 하고 싶어? 나 듣고 있어~',
        '아저씨 말 재미있어! 더 얘기해줘',
        '응응~ 계속 말해봐!'
    ];
    
    const selectedIndex = Math.floor(Math.random() * responses.length);
    const selected = responses[selectedIndex];
    
    debugLog('info', 'DEFAULT', 'RANDOM_RESPONSE', `요청 #${requestId} 랜덤 기본 응답`, {
        totalResponses: responses.length,
        selectedIndex,
        selectedResponse: selected
    });
    
    return selected;
}

/**
 * 응답 객체 생성 (검증 포함)
 */
function createResponse(text) {
    const response = {
        type: 'text',
        text: text
    };
    
    debugLog('info', 'RESPONSE', 'CREATE', '응답 객체 생성', {
        response,
        textLength: text?.length,
        isValidText: typeof text === 'string' && text.length > 0
    });
    
    return response;
}

/**
 * 시스템 상태 (상세 정보)
 */
function getSystemStatus() {
    const status = {
        version: 'debug_integrated_v1.0',
        timestamp: new Date().toISOString(),
        requestCounter,
        modules: {
            photoSystems: {
                selfie: { loaded: !!getSelfieReply, type: typeof getSelfieReply },
                concept: { loaded: !!getConceptPhotoReply, type: typeof getConceptPhotoReply },
                omoide: { loaded: !!getOmoideReply, type: typeof getOmoideReply }
            },
            contextSystem: { 
                loaded: !!ultimateContext, 
                type: typeof ultimateContext,
                functions: ultimateContext ? Object.keys(ultimateContext).length : 0
            }
        },
        status: 'active_with_detailed_logging'
    };
    
    debugLog('info', 'SYSTEM', 'STATUS', '시스템 상태 조회', status);
    return status;
}

/**
 * 테스트 함수 (상세 로그)
 */
async function testSystem() {
    const tests = [
        { message: '안녕', expected: 'greeting' },
        { message: '애기야', expected: 'calling' },
        { message: '밥은 먹었어?', expected: 'food' },
        { message: '어디야?', expected: 'location' },
        { message: '기분은어ㅊ떄?', expected: 'mood' },
        { message: '사진 줘', expected: 'photo' },
        { message: '뭐해?', expected: 'activity' },
        { message: '사랑해', expected: 'love' },
        { message: '피곤해', expected: 'condition' },
        { message: '', expected: 'empty' },
        { message: null, expected: 'null' },
        { message: 'ㅋㅋㅋㅋㅋ', expected: 'emoticon' },
        { message: '이건아무도모르는긴메시지입니다정말로긴메시지', expected: 'long' }
    ];
    
    debugLog('info', 'TEST', 'START', '시스템 테스트 시작', {
        totalTests: tests.length,
        testMessages: tests.map(t => t.message)
    });
    
    const results = [];
    
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        
        try {
            debugLog('info', 'TEST', 'INDIVIDUAL_START', `테스트 ${i + 1}/${tests.length} 시작`, test);
            
            const testStartTime = Date.now();
            const result = await processMessage(test.message);
            const testDuration = Date.now() - testStartTime;
            
            const testResult = {
                index: i + 1,
                test,
                success: true,
                result: result?.text || result?.type || 'unknown',
                resultType: result?.type,
                processingTime: testDuration,
                hasValidResponse: !!result && !!result.type
            };
            
            results.push(testResult);
            debugLog('info', 'TEST', 'INDIVIDUAL_SUCCESS', `테스트 ${i + 1} 성공`, testResult);
            
        } catch (testError) {
            const testResult = {
                index: i + 1,
                test,
                success: false,
                error: testError.message
            };
            
            results.push(testResult);
            debugLog('error', 'TEST', 'INDIVIDUAL_FAILED', `테스트 ${i + 1} 실패`, testResult, testError);
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
            .reduce((sum, r) => sum + r.processingTime, 0) / 
            results.filter(r => r.processingTime).length || 0
    };

    debugLog('info', 'TEST', 'COMPLETE', '시스템 테스트 완료', summary);
    
    return { summary, results };
}

console.log('✅ [SYSTEM] 상세 디버깅 autoReply 시스템 준비 완료');

module.exports = {
    processMessage,
    getSystemStatus,
    testSystem
};
