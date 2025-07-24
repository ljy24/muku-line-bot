// ============================================================================
// muku-routeHandlers.js - 무쿠 웹 라우트 핸들러 전용 모듈
// ✅ 홈페이지, 헬스체크, 상태 조회 등 웹 응답 처리
// 🌐 Express 라우트 핸들러들 분리
// 📊 실시간 시스템 상태 표시
// 📼 Memory Tape 블랙박스 완전 연동 - 모든 응답 메시지 자동 기록
// ============================================================================

const { middleware } = require('@line/bot-sdk');

// 🎊 Memory Tape 블랙박스 시스템 안전 임포트
let memoryTapeAvailable = false;
let recordMukuMoment = null;

try {
    const memoryTape = require('../data/memory-tape/muku-memory-tape.js');
    recordMukuMoment = memoryTape.recordMukuMoment;
    memoryTapeAvailable = true;
    console.log('📼 [Memory Tape] 블랙박스 시스템 연결 완료!');
} catch (error) {
    console.log('📼 [Memory Tape] 블랙박스 시스템 비활성화 (무쿠 정상 작동)');
    memoryTapeAvailable = false;
}

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    tape: '\x1b[93m',       // 노란색 (Memory Tape)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📼 Memory Tape 안전 기록 함수 ==================
async function safeRecordMukuMoment(momentData) {
    if (!memoryTapeAvailable || !recordMukuMoment) {
        return; // Memory Tape가 없어도 무쿠는 정상 작동
    }
    
    try {
        await recordMukuMoment(momentData);
        console.log(`${colors.tape}📼 [Memory Tape] 순간 기록 완료${colors.reset}`);
    } catch (error) {
        console.log(`${colors.tape}📼 [Memory Tape] 기록 실패 (무쿠 정상 작동): ${error.message}${colors.reset}`);
    }
}

// ================== 📤 LINE 응답 전송 함수 ==================
async function sendReply(replyToken, botResponse, client, enhancedLogging) {
    try {
        let replyMessage;

        if (typeof botResponse === 'string') {
            replyMessage = { type: 'text', text: botResponse };
        } else if (botResponse.type === 'text') {
            replyMessage = { type: 'text', text: botResponse.comment || botResponse.text };
        } else if (botResponse.type === 'image') {
            const imageUrl = botResponse.originalContentUrl || botResponse.imageUrl;
            const previewUrl = botResponse.previewImageUrl || botResponse.previewUrl || imageUrl;
            const caption = botResponse.caption || botResponse.altText || '사진이야!';
            
            if (!imageUrl) {
                console.error('❌ 이미지 URL이 없음:', botResponse);
                replyMessage = { type: 'text', text: '아저씨... 사진 준비하는데 문제가 생겼어 ㅠㅠ' };
            } else {
                try {
                    new URL(imageUrl);
                    console.log(`📸 [이미지전송] URL 검증 완료: ${imageUrl.substring(0, 50)}...`);
                    
                    await client.replyMessage(replyToken, [
                        {
                            type: 'image',
                            originalContentUrl: imageUrl,
                            previewImageUrl: previewUrl
                        },
                        {
                            type: 'text',
                            text: caption
                        }
                    ]);
                    
                    // 🎊 Memory Tape 블랙박스 기록 - 이미지 + 텍스트 전송
                    await safeRecordMukuMoment({
                        type: 'reply-image-message',
                        response: caption,
                        image: imageUrl,
                        source: 'reply-system',
                        emotional_tags: ['응답', '이미지', '대화'],
                        memory_linked: true,
                        remarkable: true // 이미지는 특별한 순간으로 표시
                    });
                    
                    console.log(`${colors.yejin}📸 예진이: 이미지 + 텍스트 전송 성공${colors.reset}`);
                    
                    // ⭐️ enhancedLogging v3.0으로 응답 로그 ⭐️
                    if (enhancedLogging && enhancedLogging.logConversation) {
                        enhancedLogging.logConversation('나', caption, 'text');
                    } else {
                        console.log(`${colors.yejin}💕 예진이: ${caption}${colors.reset}`);
                    }
                    return;
                    
                } catch (urlError) {
                    console.error('❌ 잘못된 이미지 URL:', imageUrl);
                    replyMessage = { type: 'text', text: '아저씨... 사진 URL이 잘못되었어 ㅠㅠ' };
                }
            }
        } else {
            replyMessage = { type: 'text', text: '아저씨~ 뭔가 말하고 싶은데 말이 안 나와... ㅠㅠ' };
        }

        if (replyMessage) {
            console.log(`🔄 [LINE전송] 메시지 타입: ${replyMessage.type}`);
            await client.replyMessage(replyToken, replyMessage);
            
            // 🎊 Memory Tape 블랙박스 기록 - 메시지 전송 성공 직후
            const messageContent = replyMessage.text || replyMessage.comment || '메시지 전송';
            const messageType = replyMessage.type || 'text';
            
            // 감정 태그 자동 분석
            const emotionalTags = ['응답', '대화'];
            if (messageContent.includes('💖') || messageContent.includes('💕') || messageContent.includes('사랑')) {
                emotionalTags.push('사랑');
            }
            if (messageContent.includes('ㅠㅠ') || messageContent.includes('ㅜㅜ') || messageContent.includes('슬프')) {
                emotionalTags.push('슬픔');
            }
            if (messageContent.includes('ㅎㅎ') || messageContent.includes('ㅋㅋ') || messageContent.includes('기뻐')) {
                emotionalTags.push('기쁨');
            }
            if (messageContent.includes('😤') || messageContent.includes('삐짐') || messageContent.includes('화')) {
                emotionalTags.push('삐짐');
            }
            
            // Memory Tape에 기록
            await safeRecordMukuMoment({
                type: 'reply-message',
                response: messageContent,
                source: 'reply-system',
                emotional_tags: emotionalTags,
                memory_linked: true,
                message_type: messageType
            });
            
            if (replyMessage.type === 'text') {
                // ⭐️ enhancedLogging v3.0으로 응답 로그 ⭐️
                if (enhancedLogging && enhancedLogging.logConversation) {
                    enhancedLogging.logConversation('나', replyMessage.text, 'text');
                } else {
                    console.log(`${colors.yejin}💕 예진이: ${replyMessage.text}${colors.reset}`);
                }
            }
        }

    } catch (error) {
        console.error(`${colors.error}❌ 응답 전송 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}📄 응답 내용: ${JSON.stringify(botResponse, null, 2)}${colors.reset}`);
        
        try {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '아저씨... 뭔가 문제가 생겼어. 다시 시도해볼래? ㅠㅠ'
            });
            
            // 🎊 Memory Tape 블랙박스 기록 - 폴백 메시지
            await safeRecordMukuMoment({
                type: 'reply-fallback-message',
                response: '아저씨... 뭔가 문제가 생겼어. 다시 시도해볼래? ㅠㅠ',
                source: 'fallback-system',
                emotional_tags: ['폴백', '에러복구', '걱정'],
                memory_linked: true,
                error_recovery: true
            });
            
            // ⭐️ enhancedLogging v3.0으로 에러 로그 ⭐️
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('나', '(폴백) 에러 메시지 전송', 'text');
            } else {
                console.log(`${colors.yejin}💕 예진이: (폴백) 에러 메시지 전송${colors.reset}`);
            }
        } catch (fallbackError) {
            console.error(`${colors.error}❌ 폴백 메시지도 실패: ${fallbackError.message}${colors.reset}`);
        }
    }
}

// ================== 📨 웹훅 핸들러 ==================
function createWebhookHandler(config, handleEvent) {
    return [
        middleware(config),
        (req, res) => {
            Promise.all(req.body.events.map(handleEvent))
                .then((result) => res.json(result))
                .catch((err) => {
                    console.error(`${colors.error}❌ 웹훅 처리 에러: ${err.message}${colors.reset}`);
                    res.status(500).end();
                });
        }
    ];
}

// ================== 🏠 홈페이지 핸들러 ==================
function createHomeHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus) {
    return (req, res) => {
        // ⭐️ "상태는?" 명령어 처리 ⭐️
        const query = req.query.cmd;
        if (query === '상태는' || query === '상태') {
            // enhancedLogging v3.0으로 상태 리포트 출력
            statusReporter.formatPrettyStatus(modules, getCurrentModelSetting, faceApiStatus);
            
            const statusResponse = statusReporter.generateStatusReportResponse(modules, getCurrentModelSetting);
            res.send(statusResponse);
            return;
        }

        const homeResponse = statusReporter.generateHomePageResponse(modules, getCurrentModelSetting, faceApiStatus);
        res.send(homeResponse);
    };
}

// ================== 🔍 헬스체크 핸들러 ==================
function createHealthHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus) {
    return (req, res) => {
        const healthResponse = statusReporter.generateHealthCheckResponse(modules, getCurrentModelSetting, faceApiStatus);
        res.json(healthResponse);
    };
}

// ================== 📊 상태 조회 핸들러 ==================
function createStatusHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus) {
    return (req, res) => {
        // 콘솔에 예쁜 상태 출력
        statusReporter.formatPrettyStatus(modules, getCurrentModelSetting, faceApiStatus);
        
        // 웹 응답으로 간단한 상태 정보 제공
        const statusInfo = {
            timestamp: statusReporter.getJapanTimeString(),
            gptModel: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown',
            memory: statusReporter.getMemoryStatus(modules),
            damta: statusReporter.getDamtaStatus(modules),
            yejin: statusReporter.getYejinStatus(modules),
            sulky: statusReporter.getSulkyStatus(modules),
            weather: statusReporter.getWeatherStatus(modules),
            faceApi: faceApiStatus && faceApiStatus.initialized ? 'ready' : 'loading',
            memoryTape: memoryTapeAvailable ? 'active' : 'disabled'
        };
        
        res.json({
            message: '상태 리포트가 서버 콘솔에 출력되었습니다.',
            status: statusInfo
        });
    };
}

// ================== 🎯 통합 이벤트 핸들러 ==================
function createMainEventHandler(eventProcessor, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging, sendReply) {
    return async (event) => {
        try {
            const processedEvent = await eventProcessor.handleEvent(
                event, 
                modules, 
                client, 
                faceMatcher, 
                loadFaceMatcherSafely, 
                getVersionResponse, 
                enhancedLogging
            );

            if (!processedEvent) {
                return Promise.resolve(null);
            }

            // 이벤트 타입별 응답 처리
            switch (processedEvent.type) {
                case 'version_response':
                    // ✅ 즉시 응답 후 종료
                    const versionReply = await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: processedEvent.response
                    });
                    
                    // 🎊 Memory Tape 블랙박스 기록 - 버전 응답
                    await safeRecordMukuMoment({
                        type: 'version-response',
                        response: processedEvent.response,
                        source: 'version-system',
                        emotional_tags: ['정보', '버전', '시스템'],
                        memory_linked: true
                    });
                    
                    return versionReply;

                case 'night_response':
                case 'birthday_response':
                    return sendReply(event.replyToken, {
                        type: 'text',
                        comment: processedEvent.response
                    }, client, enhancedLogging);

                case 'command_response':
                    return sendReply(event.replyToken, processedEvent.response, client, enhancedLogging);

                case 'chat_response':
                case 'image_response':
                case 'other_response':
                case 'fallback_response':
                case 'error_response':
                case 'empty_message_response':
                case 'ultimate_safe_response':
                case 'emergency_response':
                    return sendReply(event.replyToken, processedEvent.response, client, enhancedLogging);

                default:
                    console.log(`${colors.error}⚠️ 알 수 없는 이벤트 타입: ${processedEvent.type}${colors.reset}`);
                    return sendReply(event.replyToken, {
                        type: 'text',
                        comment: '아저씨~ 뭔가 이상해... 다시 말해줄래? ㅠㅠ'
                    }, client, enhancedLogging);
            }

        } catch (error) {
            console.error(`${colors.error}❌ 메인 이벤트 핸들러 에러: ${error.message}${colors.reset}`);
            return sendReply(event.replyToken, {
                type: 'text',
                comment: '아저씨... 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ'
            }, client, enhancedLogging);
        }
    };
}

// ================== 🚀 Express 앱 라우트 설정 ==================
function setupRoutes(app, config, modules, statusReporter, eventProcessor, client, faceMatcher, loadFaceMatcherSafely, getCurrentModelSetting, getVersionResponse, enhancedLogging, faceApiStatus) {
    
    // 메인 이벤트 핸들러 생성
    const mainEventHandler = createMainEventHandler(
        eventProcessor, 
        modules, 
        client, 
        faceMatcher, 
        loadFaceMatcherSafely, 
        getVersionResponse, 
        enhancedLogging, 
        sendReply
    );

    // ================== 📨 웹훅 라우트 ==================
    const webhookHandlers = createWebhookHandler(config, mainEventHandler);
    app.post('/webhook', ...webhookHandlers);

    // ================== 🏠 홈페이지 라우트 ==================
    const homeHandler = createHomeHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus);
    app.get('/', homeHandler);

    // ================== 🔍 헬스체크 라우트 ==================
    const healthHandler = createHealthHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus);
    app.get('/health', healthHandler);

    // ================== 📊 상태 조회 라우트 ==================
    const statusHandler = createStatusHandler(statusReporter, modules, getCurrentModelSetting, faceApiStatus);
    app.get('/status', statusHandler);

    console.log(`${colors.system}🌐 [라우트설정] 모든 웹 라우트 설정 완료${colors.reset}`);
    console.log(`${colors.system}    - POST /webhook: LINE 메시지 처리${colors.reset}`);
    console.log(`${colors.system}    - GET /: 홈페이지 (상태 확인)${colors.reset}`);
    console.log(`${colors.system}    - GET /health: 헬스체크 (JSON)${colors.reset}`);
    console.log(`${colors.system}    - GET /status: 상태 리포트 출력${colors.reset}`);
    
    if (memoryTapeAvailable) {
        console.log(`${colors.tape}📼 [Memory Tape] 모든 응답 메시지 자동 기록 활성화!${colors.reset}`);
    } else {
        console.log(`${colors.tape}📼 [Memory Tape] 비활성화 (무쿠 정상 작동)${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    setupRoutes,
    createWebhookHandler,
    createHomeHandler,
    createHealthHandler,
    createStatusHandler,
    createMainEventHandler,
    sendReply,
    safeRecordMukuMoment,
    colors
};
