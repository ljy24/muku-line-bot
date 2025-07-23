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

// ================== 🎓 실시간 학습 시스템 처리 함수 ==================
async function handleLearningFromConversation(userMessage, mukuResponse, modules) {
    try {
        if (!modules.realTimeLearningSystem || !modules.realTimeLearningSystem.processRealtimeLearning) {
            console.log(`${colors.realtime}**⚠️ [실시간학습] 학습 시스템을 찾을 수 없어 건너뜁니다.**${colors.reset}`);
            return null;
        }

        console.log(`${colors.realtime}**🎓 [실시간학습] 대화 학습 시작...**${colors.reset}`);
        console.log(`${colors.realtime}** 📝 사용자: "${userMessage}"**${colors.reset}`);
        console.log(`${colors.realtime}** 💬 무쿠: "${mukuResponse}"**${colors.reset}`);
        
        const sulkyState = modules.sulkyManager ? modules.sulkyManager.getSulkyState() : { level: 0, isSulky: false };
        const emotionState = modules.emotionalContextManager ? modules.emotionalContextManager.getCurrentEmotionState() : { currentEmotion: 'normal' };

        console.log(`${colors.realtime}** 😤 삐짐 상태: Level ${sulkyState.level} (${sulkyState.isSulky ? '삐짐' : '정상'})**${colors.reset}`);
        
        const learningContext = {
            timestamp: new Date().toISOString(),
            userMessage: userMessage,
            mukuResponse: mukuResponse,
            currentEmotion: emotionState.currentEmotion,
            timeSlot: getTimeSlot(getJapanHour()),
            sulkyLevel: sulkyState.level,
            messageLength: mukuResponse.length,
            japanTime: getJapanTimeString(),
        };
        
        const learningResult = await modules.realTimeLearningSystem.processRealtimeLearning(userMessage, mukuResponse, learningContext);
        
        if (learningResult && learningResult.improvements) {
            console.log(`${colors.realtime}**✅ [실시간학습] 학습 완료: ${learningResult.improvements.length}개 개선사항**${colors.reset}`);
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

// ================== 💬 메시지 처리 메인 함수 ==================
async function processMessage(userMessage, modules) {
    try {
        console.log(`${colors.ajeossi}아저씨: ${userMessage}${colors.reset}`);

        // 명령어 먼저 체크
        if (modules.commandHandler) {
            const commandResponse = await modules.commandHandler.handleCommand(userMessage, modules);
            if (commandResponse) {
                console.log(`${colors.yejin}💬 나 (명령어): ${commandResponse}${colors.reset}`);
                // 명령어 응답은 학습하지 않음
                return commandResponse;
            }
        }
        
        // 🧠 일반 대화 처리 (✅ 수정됨)
        let response = '';
        if (modules.autoReply && modules.ultimateContext) {
            const contextData = await modules.ultimateContext.createContext(userMessage, 'auto');
            response = await modules.autoReply.generateResponse(contextData.context, 'auto');
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

// ================== 🎯 통합 이벤트 핸들러 ==================
async function handleEvent(event, modules) {
    try {
        if (event.type === 'message' && event.message.type === 'text') {
            const responseText = await processMessage(event.message.text, modules);
            return { type: 'text', text: responseText };
        } 
        // 다른 이벤트 타입 (이미지 등)은 여기에 추가
        
        return null;
    } catch (error) {
        console.error(`${colors.error}❌ [통합핸들러] 이벤트 처리 실패: ${error.message}${colors.reset}`);
        return { type: 'text', text: "아조씨... 뭔가 문제가 생겼어 ㅠㅠ 다시 말해줄래?" };
    }
}

// ================== 📤 모듈 Export ==================
module.exports = {
    handleEvent
};
