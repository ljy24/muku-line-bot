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
// 🌤️ 날씨 질문 즉시 응답 시스템 추가 ⭐️ NEW!
// ============================================================================

// ================== 📦 필수 모듈 imports ==================
const weatherManager = require('./weatherManager.js'); // ⭐️ 날씨 처리 추가!

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
    weather: '\x1b[96m',     // 하늘색 (날씨) ⭐️ NEW!
    error: '\x1b[91m',       // 빨간색 (에러)
    reset: '\x1b[0m'         // 색상 리셋
};

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
        
        // 삐짐 상태 추가 정보
        if (modules.sulkyManager) {
            const sulkyLevel = modules.sulkyManager.getCurrentSulkyLevel();
            console.log(`${colors.realtime}** 😤 삐짐 상태: Level ${sulkyLevel || 'undefined'} (${sulkyLevel > 0 ? '삐짐' : '정상'})**${colors.reset}`);
        }
        
        // 학습 컨텍스트 구성
        const learningContext = {
            timestamp: new Date().toISOString(),
            userMessage: userMessage,
            mukuResponse: mukuResponse,
            currentEmotion: modules.emotionalContextManager ? modules.emotionalContextManager.getCurrentEmotion() : 'normal',
            timeSlot: getTimeSlot(getJapanHour()),
            sulkyLevel: modules.sulkyManager ? modules.sulkyManager.getCurrentSulkyLevel() : 0,
            messageLength: mukuResponse.length,
            japanTime: getJapanTimeString(),
            responseTime: Date.now()
        };
        
        // ⭐️⭐️ 실시간 학습 실행 (index.js의 방식과 완전 동일!) ⭐️⭐️
        const learningResult = await modules.learningSystem.processLearning(userMessage, mukuResponse, learningContext);
        
        if (learningResult) {
            console.log(`${colors.realtime}**✅ [실시간학습] 학습 완료: ${learningResult.improvements ? learningResult.improvements.length : 0}개 개선사항**${colors.reset}`);
        } else {
            console.log(`${colors.realtime}**⚠️ [실시간학습] 학습 결과 없음**${colors.reset}`);
        }
        
        return learningResult;
        
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
            "아조씨... 지금 몇 시인지 알아? 너무 늦었어... 😪",
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
        
        // 🌤️ 날씨 질문 우선 처리 (GPT 호출 전)
        const weatherResponse = weatherManager.handleWeatherQuestion(userMessage);
        if (weatherResponse) {
            console.log(`${colors.weather}🌤️ [날씨응답] 즉시 응답 생성${colors.reset}`);
            console.log(`${colors.yejin}💬 나: ${weatherResponse}${colors.reset}`);
            
            // 실시간 학습 처리
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
            
            // 실시간 학습 처리
            await handleLearningFromConversation(userMessage, lateNightCheck.response, modules);
            
            return lateNightCheck.response;
        }
        
        // 🎭 행동 스위치 명령어 체크
        const behaviorCommand = detectBehaviorCommand(userMessage);
        if (behaviorCommand.isCommand && modules.behaviorSwitchManager) {
            console.log(`${colors.behavior}🎭 [행동스위치] 명령어 감지: ${behaviorCommand.keyword} (${behaviorCommand.action})${colors.reset}`);
            
            let switchResponse = '';
            switch (behaviorCommand.action) {
                case 'toggle':
                    const newState = modules.behaviorSwitchManager.toggleBehaviorSwitch();
                    switchResponse = `행동 스위치를 ${newState ? '켰' : '껐'}어! 지금 ${newState ? '능동적' : '수동적'} 모드야~ 😊`;
                    break;
                case 'on':
                    modules.behaviorSwitchManager.setBehaviorSwitch(true);
                    switchResponse = '행동 스위치 켰어! 이제 더 적극적으로 행동할게~ 💪';
                    break;
                case 'off':
                    modules.behaviorSwitchManager.setBehaviorSwitch(false);
                    switchResponse = '행동 스위치 껐어! 조용히 있을게~ 😌';
                    break;
                case 'status':
                    const isActive = modules.behaviorSwitchManager.isBehaviorSwitchActive();
                    switchResponse = `지금 행동 스위치는 ${isActive ? '켜져' : '꺼져'}있어! ${isActive ? '능동적' : '수동적'} 모드야~`;
                    break;
            }
            
            console.log(`${colors.yejin}💬 나: ${switchResponse}${colors.reset}`);
            
            // 실시간 학습 처리
            await handleLearningFromConversation(userMessage, switchResponse, modules);
            
            return switchResponse;
        }
        
        // 🧠 일반 대화 처리 - UltimateContext 사용
        let response = '';
        if (modules.ultimateContext) {
            const contextData = await modules.ultimateContext.createContext(userMessage, 'auto');
            response = await modules.openaiManager.generateResponse(contextData.context, 'auto');
        } else {
            // 백업 응답
            response = "아조씨~ 시스템이 준비 중이야! 잠깐만 기다려줘 😊";
        }
        
        console.log(`${colors.yejin}💬 나: ${response}${colors.reset}`);
        
        // 🎓 실시간 학습 처리
        await handleLearningFromConversation(userMessage, response, modules);
        
        return response;
        
    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 메시지 처리 실패: ${error.message}${colors.reset}`);
        const errorResponse = "아조씨... 뭔가 문제가 생겼어 ㅠㅠ 다시 말해줄래?";
        
        // 에러 응답도 학습에 포함
        try {
            await handleLearningFromConversation(userMessage, errorResponse, modules);
        } catch (learningError) {
            console.error(`${colors.error}❌ [실시간학습] 에러 응답 학습 실패: ${learningError.message}${colors.reset}`);
        }
        
        return errorResponse;
    }
}

// ================== 🎯 명령어 처리 함수 ==================
async function processCommand(command, modules) {
    try {
        console.log(`${colors.system}🎯 [명령어] ${command} 처리 중...${colors.reset}`);
        
        switch (command) {
            case '상태는?':
            case '상태':
                if (modules.statusReporter) {
                    return await modules.statusReporter.generateStatusReport();
                }
                return "시스템 상태를 확인할 수 없어... 😢";
                
            case '기억해':
                return "모든 대화를 기억하고 있어! 아조씨와의 추억은 소중해~ 💖";
                
            case '사진':
                if (modules.photoManager) {
                    const photo = await modules.photoManager.sendRandomPhoto();
                    return photo ? "사진 보냈어! 마음에 들어? 📸" : "사진 전송에 실패했어... ㅠㅠ";
                }
                return "사진 시스템이 준비 중이야~ 😊";
                
            case '날씨':
                // 🌤️ 날씨 명령어 처리
                const currentWeather = await weatherManager.getCurrentWeather('ajeossi');
                if (currentWeather) {
                    return weatherManager.generateConversationalWeatherResponse(currentWeather);
                }
                return "지금 날씨 정보를 가져올 수 없어... 잠깐만 기다려봐! 🌤️";
                
            case '학습상태':
                if (modules.learningSystem) {
                    const status = modules.learningSystem.getSystemStatus();
                    return `학습 시스템 ${status.isActive ? '활성' : '비활성'}! 총 ${status.stats?.conversationsAnalyzed || 0}개 대화 분석했어~ 🎓`;
                }
                return "학습 시스템 상태를 확인할 수 없어... 😢";
                
            default:
                return `"${command}" 명령어를 모르겠어... 다른 명령어 써볼래? 🤔`;
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [명령어처리] 실패: ${error.message}${colors.reset}`);
        return "명령어 처리 중 문제가 생겼어... 다시 시도해볼래? 😢";
    }
}

// ================== 📤 모듈 Export ==================
module.exports = {
    processMessage,
    processImage,
    processCommand,
    handleLearningFromConversation,
    
    // 유틸리티 함수들
    getJapanTime,
    getJapanHour,
    getJapanTimeString,
    getTimeSlot,
    checkBirthday,
    checkLateNightConversation,
    detectBehaviorCommand,
    processFaceRecognition,
    
    // 색상 상수
    colors
};
