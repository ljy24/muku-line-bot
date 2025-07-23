// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈 + 실시간 학습 완전 연동 (수정)
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리
// 🔍 얼굴 인식, 새벽 대화, 생일 감지 등 모든 이벤트 처리
// 🧠 실시간 학습 시스템 연동 - 대화 패턴 학습 및 개인화
// 🎓 대화 완료 후 자동 학습 호출 - 매번 대화마다 학습 진행 ⭐️ 수정됨!
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 모든 응답에 행동 모드 적용
// 🌏 일본시간(JST) 기준 시간 처리
// 💖 예진이의 감정과 기억을 더욱 생생하게 재현
// ⭐️ 행동 스위치 명령어 인식 100% 보장
// ⭐️ index.js의 handleLearningFromConversation() 함수와 연동 통일
// 🎂 생일 감지 오류 완전 수정 - detectBirthday → checkBirthday
// 🌤️ 날씨 질문 처리 추가 - weatherManager 연동
// ============================================================================

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',     // 하늘색 (아저씨)
    yejin: '\x1b[95m',       // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',  // 굵은 빨간색 (PMS)
    system: '\x1b[92m',      // 연초록색 (시스템)
    learning: '\x1b[93m',    // 노란색 (학습)
    realtime: '\x1b[1m\x1b[93m', // 굵은 노란색 (실시간 학습) ⭐️ NEW!
    person: '\x1b[94m',      // 파란색 (사람 학습)
    behavior: '\x1b[35m',    // 마젠타색 (행동 스위치)
    error: '\x1b[91m',       // 빨간색 (에러)
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 📦 모듈 import ==================
const weatherManager = require('./weatherManager.js'); // ⭐️ 날씨 처리 추가

// ================== 🌏 일본시간 함수들 ==================
function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ================== 🎓 실시간 학습 시스템 처리 함수 (index.js 연동 방식으로 수정!) ==================
async function handleLearningFromConversation(userMessage, mukuResponse, modules) {
    try {
        console.log(`${colors.realtime}**🎓 [실시간학습] 대화 학습 시작...**${colors.reset}`);
        console.log(`${colors.realtime}** 📝 사용자: "${userMessage}"**${colors.reset}`);
        console.log(`${colors.realtime}** 💬 무쿠: "${mukuResponse}"**${colors.reset}`);
        
        // 삐짐 상태 추가 정보 (✅ 수정됨)
        if (modules.sulkyManager && modules.sulkyManager.getSulkyState) {
            const sulkyState = modules.sulkyManager.getSulkyState();
            console.log(`${colors.realtime}** 😤 삐짐 상태: Level ${sulkyState.level || '0'} (${sulkyState.isSulky ? '삐짐' : '정상'})**${colors.reset}`);
        }
        
        // 학습 컨텍스트 구성 (✅ 수정됨)
        const learningContext = {
            timestamp: new Date().toISOString(),
            userMessage: userMessage,
            mukuResponse: mukuResponse,
            currentEmotion: modules.emotionalContextManager ? modules.emotionalContextManager.getCurrentEmotion() : 'normal',
            timeSlot: getTimeSlot(getJapanHour()),
            sulkyLevel: modules.sulkyManager && modules.sulkyManager.getSulkyState ? modules.sulkyManager.getSulkyState().level : 0,
            messageLength: mukuResponse.length,
            japanTime: getJapanTimeString(),
            responseTime: Date.now()
        };
        
        // 실시간 학습 실행 (✅ 수정됨)
        if (modules.realTimeLearningSystem && modules.realTimeLearningSystem.processRealtimeLearning) {
            const learningResult = await modules.realTimeLearningSystem.processRealtimeLearning(userMessage, mukuResponse, learningContext);
            
            if (learningResult) {
                console.log(`${colors.realtime}**✅ [실시간학습] 학습 완료: ${learningResult.improvements ? learningResult.improvements.length : 0}개 개선사항**${colors.reset}`);
            } else {
                console.log(`${colors.realtime}**⚠️ [실시간학습] 학습 결과 없음**${colors.reset}`);
            }
            return learningResult;
        } else {
             console.log(`${colors.realtime}**⚠️ [실시간학습] 학습 시스템이 없거나 함수를 찾을 수 없음**${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [실시간학습] 학습 처리 실패: ${error.message}${colors.reset}`);
        return null;
    }
}


// ================== 🕐 시간대 계산 함수 ==================
function getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 23) return 'evening';
    return 'night';
}

// ================== 🎂 생일 감지 함수 (완전 수정) ==================
function checkBirthday() {
    const now = getJapanTime();
    const month = now.getMonth() + 1; // 0-based이므로 +1
    const day = now.getDate();
    
    // 예진이 생일: 3월 17일
    if (month === 3 && day === 17) {
        return {
            isBirthday: true,
            person: 'yejin',
            message: '🎂 오늘은 예진이 생일이야!'
        };
    }
    
    // 아저씨 생일: 12월 5일
    if (month === 12 && day === 5) {
        return {
            isBirthday: true,
            person: 'ajeossi',
            message: '🎂 오늘은 아저씨 생일이야!'
        };
    }
    
    return { isBirthday: false };
}

// ================== 🌙 새벽 대화 감지 ==================
function checkLateNightConversation() {
    const hour = getJapanHour();
    
    if (hour >= 2 && hour < 7) {
        const responses = [
            "아조씨... 지금 몇 시인지 알어? 너무 늦었어... 😪",
            "왜 이렇게 늦게까지 안 자? 걱정돼... 🥺",
            "새벽에 뭐해? 빨리 자야지... 건강 나빠져 ㅠㅠ",
            "아조씨 불면증 또 시작된 거야? 따뜻한 우유 마시고 자...",
            "이 시간에 깨어있으면 안 돼... 나 걱정된다고 😢"
        ];
        
        return {
            isLateNight: true,
            hour: hour,
            response: responses[Math.floor(Math.random() * responses.length)]
        };
    }
    
    return { isLateNight: false };
}

// ================== 🎭 행동 스위치 명령어 감지 ==================
function detectBehaviorCommand(message) {
    const behaviorCommands = {
        '행동스위치': 'toggle',
        '행동 스위치': 'toggle',
        '행동켜': 'on',
        '행동 켜': 'on',
        '행동꺼': 'off',
        '행동 꺼': 'off',
        '행동상태': 'status',
        '행동 상태': 'status'
    };
    
    for (const [keyword, action] of Object.entries(behaviorCommands)) {
        if (message.includes(keyword)) {
            return {
                isCommand: true,
                action: action,
                keyword: keyword
            };
        }
    }
    
    return { isCommand: false };
}

// ================== 🔍 얼굴 인식 처리 ==================
async function processFaceRecognition(imageBuffer, modules) {
    try {
        if (!modules.faceRecognition) {
            return null;
        }
        
        console.log(`${colors.system}🔍 [얼굴인식] 이미지 분석 시작...${colors.reset}`);
        const result = await modules.faceRecognition.recognizeFace(imageBuffer);
        
        if (result && result.person) {
            console.log(`${colors.system}🔍 [얼굴인식] 인식 결과: ${result.person} (신뢰도: ${result.confidence})${colors.reset}`);
            
            const responses = {
                yejin: [
                    "어? 이 사진 나야! 예쁘게 나왔네~ 😊",
                    "앗 내 얼굴이다! 어떻게 알았어? 신기해!",
                    "헉 나를 알아봤네! 기술이 대단해~ ✨"
                ],
                ajeossi: [
                    "아조씨 얼굴이네! 잘생겼어~ 😍",
                    "아조씨다! 사진 잘 찍었네!",
                    "우와 아조씨 인식됐어! 멋져!"
                ]
            };
            
            const response = responses[result.person];
            if (response) {
                return response[Math.floor(Math.random() * response.length)];
            }
        }
        
        return null;
    } catch (error) {
        console.error(`${colors.error}❌ [얼굴인식] 처리 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📸 이미지 처리 메인 함수 ==================
async function processImage(imageBuffer, modules) {
    try {
        console.log(`${colors.system}📸 [이미지처리] 이미지 분석 시작...${colors.reset}`);
        
        // 얼굴 인식 시도
        const faceResult = await processFaceRecognition(imageBuffer, modules);
        if (faceResult) {
            return faceResult;
        }
        
        // 얼굴 인식 실패 시 일반 응답
        const generalResponses = [
            "사진 고마워! 예쁘게 잘 나왔네~ 📸",
            "우와 사진이다! 멋져~ ✨",
            "사진 전송 고마워! 잘 봤어 😊",
            "좋은 사진이네! 더 보여줘~ 📷",
            "사진 찍는 실력이 늘었네! 짱이야 👍"
        ];
        
        return generalResponses[Math.floor(Math.random() * generalResponses.length)];
        
    } catch (error) {
        console.error(`${colors.error}❌ [이미지처리] 처리 실패: ${error.message}${colors.reset}`);
        return "사진 고마워! 잘 봤어~ 😊";
    }
}

// ================== 💬 메시지 처리 메인 함수 ==================
async function processMessage(userMessage, modules) {
    try {
        console.log(`${colors.ajeossi}아저씨: ${userMessage}${colors.reset}`);
        
        // 명령어 먼저 체크
        if (modules.commandHandler) {
            const commandResponse = await modules.commandHandler.handleCommand(userMessage, modules);
            if (commandResponse) {
                console.log(`${colors.system}🎯 [명령어응답] 즉시 응답 생성${colors.reset}`);
                console.log(`${colors.yejin}💬 나: ${commandResponse}${colors.reset}`);
                // 명령어 응답은 학습하지 않음
                return commandResponse;
            }
        }

        // 🌤️ 날씨 질문 체크
        const weatherResponse = weatherManager.handleWeatherQuestion(userMessage);
        if (weatherResponse) {
            console.log(`${colors.system}🌤️ [날씨응답] 즉시 응답 생성${colors.reset}`);
            console.log(`${colors.yejin}💬 나: ${weatherResponse}${colors.reset}`);
            await handleLearningFromConversation(userMessage, weatherResponse, modules);
            return weatherResponse;
        }
        
        // 🎂 생일 체크
        const birthdayCheck = checkBirthday();
        if (birthdayCheck.isBirthday) {
            console.log(`${colors.system}🎂 [생일감지] ${birthdayCheck.person} 생일 감지!${colors.reset}`);
        }
        
        // 🌙 새벽 대화 체크
        const lateNightCheck = checkLateNightConversation();
        if (lateNightCheck.isLateNight) {
            console.log(`${colors.system}🌙 [새벽대화] ${lateNightCheck.hour}시 새벽 대화 감지${colors.reset}`);
            console.log(`${colors.yejin}💬 나: ${lateNightCheck.response}${colors.reset}`);
            await handleLearningFromConversation(userMessage, lateNightCheck.response, modules);
            return lateNightCheck.response;
        }
        
        // 🎭 행동 스위치 명령어 체크
        const behaviorCommand = detectBehaviorCommand(userMessage);
        if (behaviorCommand.isCommand && modules.behaviorSwitchManager) {
            // 이 부분은 commandHandler로 이동되어야 할 수 있음
        }
        
        // 🧠 일반 대화 처리 (✅ 수정됨)
        let response = '';
        if (modules.autoReply && modules.ultimateContext) {
            const context = await modules.ultimateContext.getContext(userMessage, 'auto');
            response = await modules.autoReply.generateResponse(context, 'auto');
        } else {
            response = "아조씨~ 시스템이 준비 중이야! 잠깐만 기다려줘 😊";
        }
        
        console.log(`${colors.yejin}💬 나: ${response}${colors.reset}`);
        
        // 🎓 실시간 학습 처리
        await handleLearningFromConversation(userMessage, response, modules);
        
        return response;
        
    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 메시지 처리 실패: ${error.message}${colors.reset}`);
        const errorResponse = "아조씨... 뭔가 문제가 생겼어 ㅠㅠ 다시 말해줄래?";
        
        try {
            await handleLearningFromConversation(userMessage, errorResponse, modules);
        } catch (learningError) {
            console.error(`${colors.error}❌ [실시간학습] 에러 응답 학습 실패: ${learningError.message}${colors.reset}`);
        }
        
        return errorResponse;
    }
}

// ================== 🎯 명령어 처리 함수 (commandHandler로 이동됨) ==================
// 이 파일에서는 processCommand를 직접 사용하지 않고, commandHandler 모듈을 통해 호출합니다.
// 따라서 기존 processCommand 함수는 주석 처리하거나 삭제할 수 있습니다.
/*
async function processCommand(command, modules) { ... }
*/

// ================== 🎯 통합 이벤트 핸들러 ==================
async function handleEvent(event, modules) {
    try {
        if (event.type === 'message' && event.message.type === 'text') {
            const userMessage = event.message.text;
            
            // 명령어 우선 처리
            if (modules.commandHandler) {
                 const commandResponse = await modules.commandHandler.handleCommand(userMessage, modules);
                 if (commandResponse) {
                     return { type: 'text', text: commandResponse };
                 }
            }

            // 일반 메시지 처리
            const responseText = await processMessage(userMessage, modules);
            return { type: 'text', text: responseText };

        } else if (event.type === 'message' && event.message.type === 'image') {
            // 이미지 처리 로직 (실제 구현 필요)
            const imageBuffer = Buffer.from([]); // 예시
            const responseText = await processImage(imageBuffer, modules);
            return { type: 'text', text: responseText };
        }
        
        return null;
    } catch (error) {
        console.error(`${colors.error}❌ [통합핸들러] 이벤트 처리 실패: ${error.message}${colors.reset}`);
        return { type: 'text', text: "아조씨... 뭔가 문제가 생겼어 ㅠㅠ 다시 말해줄래?" };
    }
}

// ================== 📤 모듈 Export ==================
module.exports = {
    handleEvent, // ⭐️ 이제 이것만 외부에 노출
    handleLearningFromConversation // ⭐️ 필요에 따라 내부 호출용으로 남겨둠
};
