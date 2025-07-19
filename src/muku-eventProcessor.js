// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리
// 🔍 얼굴 인식, 새벽 대화, 생일 감지 등 모든 이벤트 처리
// 🌏 일본시간(JST) 기준 시간 처리
// ============================================================================

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🌏 일본시간 함수들 ==================
function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getJapanHour() {
    return getJapanTime().getHours();
}

// ================== 🔍 얼굴 인식 관련 함수들 ==================
async function detectFaceSafely(base64Image, faceMatcher, loadFaceMatcherSafely) {
    try {
        const matcher = faceMatcher || await loadFaceMatcherSafely();
        
        if (matcher && matcher.detectFaceMatch) {
            console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
            return await matcher.detectFaceMatch(base64Image);
        } else {
            console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
            return null;
        }
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 얼굴 인식 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== ✨ GPT 모델 버전 응답 처리 ==================
function processVersionCommand(messageText, getVersionResponse) {
    const versionResponse = getVersionResponse(messageText);
    return versionResponse;
}

// ================== 😤 삐짐 상태 해소 처리 ==================
async function processSulkyRelief(modules, enhancedLogging) {
    if (modules.sulkyManager && modules.sulkyManager.handleUserResponse) {
        try {
            const reliefMessage = await modules.sulkyManager.handleUserResponse();
            if (reliefMessage) {
                if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                    enhancedLogging.logSpontaneousAction('sulky_relief', reliefMessage);
                } else {
                    console.log(`${colors.yejin}😤→😊 [삐짐해소] ${reliefMessage}${colors.reset}`);
                }
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 삐짐 해소 처리 에러: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🌙 새벽 대화 감지 및 처리 ==================
async function processNightWakeMessage(messageText, modules, enhancedLogging) {
    const currentHour = getJapanHour();
    if (modules.nightWakeResponse && currentHour >= 2 && currentHour <= 7) {
        try {
            const nightResponse = await modules.nightWakeResponse.processNightMessage(messageText, currentHour);
            if (nightResponse && nightResponse.handled) {
                if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                    enhancedLogging.logSpontaneousAction('night_wake', nightResponse.response);
                } else {
                    console.log(`${colors.yejin}🌙 [새벽대화] ${nightResponse.response}${colors.reset}`);
                }
                return nightResponse;
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 새벽 대화 처리 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 🎂 생일 감지 및 처리 ==================
async function processBirthdayDetection(messageText, modules, enhancedLogging) {
    if (modules.birthdayDetector) {
        try {
            const birthdayResponse = await modules.birthdayDetector.checkBirthday(messageText, getJapanTime());
            if (birthdayResponse && birthdayResponse.handled) {
                if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                    enhancedLogging.logSpontaneousAction('birthday_greeting', birthdayResponse.response);
                } else {
                    console.log(`${colors.yejin}🎂 [생일감지] ${birthdayResponse.response}${colors.reset}`);
                }
                return birthdayResponse;
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 생일 감지 처리 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 🧠 고정 기억 연동 처리 ==================
function processFixedMemory(messageText, modules) {
    if (modules.memoryManager && modules.memoryManager.getFixedMemory) {
        try {
            const relatedMemory = modules.memoryManager.getFixedMemory(messageText);
            if (relatedMemory) {
                console.log(`${colors.system}🧠 [고정기억] 관련 기억 발견: "${relatedMemory.substring(0, 30)}..."${colors.reset}`);
                if (modules.ultimateContext && modules.ultimateContext.addMemoryContext) {
                    modules.ultimateContext.addMemoryContext(relatedMemory);
                }
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 고정 기억 검색 에러: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🤖 명령어 처리 ==================
async function processCommand(messageText, userId, client, modules) {
    if (modules.commandHandler && modules.commandHandler.handleCommand) {
        try {
            const commandResult = await modules.commandHandler.handleCommand(messageText, userId, client);
            if (commandResult && commandResult.handled) {
                return commandResult;
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 명령어 처리 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 💬 일반 대화 응답 처리 ==================
async function processGeneralChat(messageText, modules) {
    if (modules.autoReply && modules.autoReply.getReplyByMessage) {
        try {
            const botResponse = await modules.autoReply.getReplyByMessage(messageText);
            return botResponse;
        } catch (error) {
            console.log(`${colors.error}⚠️ 대화 응답 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 📸 이미지 처리 함수들 ==================
function generateFaceRecognitionResponse(faceResult) {
    if (faceResult === '예진이') {
        const responses = [
            '어? 이 사진 나야! 아저씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
            '이거 내 사진이네! 아저씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
            '아! 내 사진이다~ 아저씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ'
        ];
        return {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    } else if (faceResult === '아저씨') {
        const responses = [
            '아저씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
            '우리 아저씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
            '아저씨 얼굴이야! 이런 아저씨 좋아해~ 나만의 아저씨 ㅎㅎ'
        ];
        return {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    } else {
        const responses = [
            '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
            '이 사진 누구야? 아저씨 친구들이야? 나도 보고 싶어!',
            '사진이 잘 안 보여... 그래도 아저씨가 보낸 거니까 좋아! ㅎㅎ'
        ];
        return {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    }
}

async function processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging) {
    try {
        const stream = await client.getMessageContent(messageId);

        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');

        console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

        const faceResult = await detectFaceSafely(base64, faceMatcher, loadFaceMatcherSafely);
        console.log(`${colors.system}🎯 얼굴 인식 결과: ${faceResult || '인식 실패'}${colors.reset}`);

        return generateFaceRecognitionResponse(faceResult);

    } catch (error) {
        console.error(`${colors.error}❌ 이미지 처리 에러: ${error.message}${colors.reset}`);
        return {
            type: 'text',
            comment: '사진이 잘 안 보여... 다시 보내줄래? ㅠㅠ'
        };
    }
}

// ================== 📝 기타 메시지 타입 처리 ==================
function processOtherMessageType(messageType) {
    const responses = [
        '아저씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
        '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
        '아저씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!'
    ];
    return {
        type: 'text',
        comment: responses[Math.floor(Math.random() * responses.length)]
    };
}

// ================== 🎯 메인 이벤트 처리 함수 ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    try {
        const userId = event.source.userId;
        const userMessage = event.message;

        // 텍스트 메시지 처리 로직
        if (userMessage.type === 'text') {
            const messageText = userMessage.text.trim();
            
            // ⭐️ enhancedLogging v3.0으로 대화 로그 ⭐️
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('아저씨', messageText, 'text');
            } else {
                console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);
            }

            // ✨✨✨ 절대 우선 명령어: GPT 모델 버전 관리 (최우선 처리!) ✨✨✨
            const versionResponse = processVersionCommand(messageText, getVersionResponse);
            if (versionResponse) {
                // ⭐️ enhancedLogging v3.0으로 응답 로그 ⭐️
                if (enhancedLogging && enhancedLogging.logConversation) {
                    enhancedLogging.logConversation('나', versionResponse, 'text');
                } else {
                    console.log(`${colors.yejin}✨ 예진이 (버전응답): ${versionResponse}${colors.reset}`);
                }
                
                return {
                    type: 'version_response',
                    response: versionResponse
                };
            }

            // ⭐️ 0. 삐짐 상태 해소 처리 (최우선!) ⭐️
            await processSulkyRelief(modules, enhancedLogging);

            // ⭐️ 1. 새벽 대화 감지 및 처리 (2-7시) ⭐️
            const nightResponse = await processNightWakeMessage(messageText, modules, enhancedLogging);
            if (nightResponse) {
                return {
                    type: 'night_response',
                    response: nightResponse.response
                };
            }

            // ⭐️ 2. 생일 감지 및 처리 ⭐️
            const birthdayResponse = await processBirthdayDetection(messageText, modules, enhancedLogging);
            if (birthdayResponse) {
                return {
                    type: 'birthday_response',
                    response: birthdayResponse.response
                };
            }

            // ⭐️ 3. 고정 기억 연동 확인 및 처리 ⭐️
            processFixedMemory(messageText, modules);

            // 4. 명령어 처리 확인
            const commandResult = await processCommand(messageText, userId, client, modules);
            if (commandResult) {
                return {
                    type: 'command_response',
                    response: commandResult
                };
            }

            // 5. 일반 대화 응답
            const chatResponse = await processGeneralChat(messageText, modules);
            if (chatResponse) {
                return {
                    type: 'chat_response',
                    response: chatResponse
                };
            }

            // 6. 폴백 응답
            return {
                type: 'fallback_response',
                response: {
                    type: 'text',
                    comment: '아저씨~ 나 지금 시스템 준비 중이야... 조금만 기다려줘! ㅎㅎ'
                }
            };
        }
        // 🖼️ 이미지 메시지 처리
        else if (userMessage.type === 'image') {
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('아저씨', '이미지 전송', 'photo');
            } else {
                console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
            }

            const imageResponse = await processImageMessage(userMessage.id, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging);
            return {
                type: 'image_response',
                response: imageResponse
            };
        }
        // 기타 메시지 타입 처리
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${userMessage.type} 메시지${colors.reset}`);
            const otherResponse = processOtherMessageType(userMessage.type);
            return {
                type: 'other_response',
                response: otherResponse
            };
        }

    } catch (error) {
        console.error(`${colors.error}❌ 메시지 처리 에러: ${error.message}${colors.reset}`);
        return {
            type: 'error_response',
            response: {
                type: 'text',
                comment: '아저씨... 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ'
            }
        };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    processVersionCommand,
    processSulkyRelief,
    processNightWakeMessage,
    processBirthdayDetection,
    processFixedMemory,
    processCommand,
    processGeneralChat,
    processImageMessage,
    processOtherMessageType,
    generateFaceRecognitionResponse,
    detectFaceSafely,
    getJapanTime,
    getJapanHour,
    colors
};
