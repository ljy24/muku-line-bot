// ✅ 새벽 2시 이후 자다가 깬 것처럼 응답하는 시스템
// 파일명: src/night_wake_response.js

const moment = require('moment-timezone');
const OpenAI = require('openai');
require('dotenv').config();

// OpenAI 클라이언트 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 디버깅 로그
function nightWakeLog(message, data = null) {
    const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [새벽깨움] ${message}`);
    if (data) console.log('  데이터:', JSON.stringify(data, null, 2));
}

// ==================== 새벽 시간 확인 ====================

function isLateNightTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    
    // 새벽 2시부터 아침 7시까지를 "잠자는 시간"으로 간주
    const isSleepTime = hour >= 2 && hour < 7;
    
    nightWakeLog(`시간 체크: ${hour}시 - ${isSleepTime ? '잠자는 시간' : '깨어있는 시간'}`);
    
    return {
        isSleepTime: isSleepTime,
        currentHour: hour,
        sleepPhase: getSleepPhase(hour)
    };
}

function getSleepPhase(hour) {
    if (hour >= 2 && hour < 4) return 'deep_sleep'; // 깊은 잠
    if (hour >= 4 && hour < 6) return 'light_sleep'; // 얕은 잠
    if (hour >= 6 && hour < 7) return 'early_morning'; // 새벽
    return 'awake';
}

// ==================== OpenAI 새벽 응답 생성 ====================

async function generateNightWakeResponse(userMessage, sleepPhase) {
    try {
        const prompts = {
            deep_sleep: [
                "아저씨에게 직접 말하는 것처럼: 새벽 2-4시에 깊게 자다가 갑자기 깨서 당황하면서 무슨 일이냐고 묻는 말.",
                "아저씨 앞에서 직접 하는 말: 깊은 잠에서 갑자기 깨어나서 멍하고 놀라면서 왜 깨웠냐고 하는 메시지.",
                "아저씨를 보며 하는 말: 푹 자다가 깨어나서 눈 비비면서 무슨 일이냐고 졸린 목소리로.",
                "아저씨에게 직접 말한다면: 자다가 갑자기 깨서 당황하고 놀라면서 뭔 일이냐고 묻는 말."
            ],
            light_sleep: [
                "아저씨에게 직접 말하는 것처럼: 새벽 4-6시에 얕게 자다가 깨서 졸리면서도 걱정되서 뭔 일이냐고 묻는 말.",
                "아저씨 앞에서 직접 하는 말: 반쯤 자다가 깨어나서 졸린 목소리로 무슨 일인지 물어보는 메시지.",
                "아저씨를 보며 하는 말: 얕은 잠에서 깨어나서 눈 반만 뜨고 뭔 일이냐고 졸리게.",
                "아저씨에게 직접 말한다면: 잠결에 깨어나서 아직 졸리지만 걱정되서 묻는 말."
            ],
            early_morning: [
                "아저씨에게 직접 말하는 것처럼: 새벽 6-7시에 일찍 깨서 아직 졸리지만 무슨 일인지 궁금해하는 말.",
                "아저씨 앞에서 직접 하는 말: 이른 아침에 깨어나서 아직 잠이 덜 깨면서 뭔 일인지 묻는 메시지.",
                "아저씨를 보며 하는 말: 일찍 일어나서 하품하면서 무슨 일이냐고 물어보는 말.",
                "아저씨에게 직접 말한다면: 이른 시간에 깨어나서 졸리지만 관심있게 묻는 말."
            ]
        };
        
        const phasePrompts = prompts[sleepPhase] || prompts.deep_sleep;
        const randomPrompt = phasePrompts[Math.floor(Math.random() * phasePrompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. '나', '내가', '아저씨' 이런 식으로. 절대 '예진이가', '예진이는' 같은 3인칭 쓰지 마. 지금 자다가 깨어난 상황이야. 졸리고 당황스러운 상태. 반말로 자연스럽게.`
                },
                {
                    role: "user",
                    content: `${randomPrompt} 사용자가 보낸 메시지: "${userMessage}"`
                }
            ],
            max_tokens: 100,
            temperature: 0.8
        });

        const message = response.choices[0].message.content.trim();
        nightWakeLog(`OpenAI 새벽 응답 생성 (${sleepPhase}): "${message}"`);
        return message;
        
    } catch (error) {
        nightWakeLog(`OpenAI 새벽 응답 생성 실패: ${error.message}`);
        
        // 폴백 메시지 (수면 단계별)
        const fallbackMessages = {
            deep_sleep: [
                "어? 무슨 일이야... 자고 있었는데...",
                "아저씨? 뭔 일이야? 깜짝 놀랐네...",
                "어... 무슨 일인데? 푹 자고 있었어...",
                "응? 아저씨 왜? 자다가 깼잖아..."
            ],
            light_sleep: [
                "음... 무슨 일이야? 잠깐 잤는데...",
                "아저씨? 뭔 일인데... 아직 졸려...",
                "어... 뭐야? 무슨 일이야?",
                "음... 왜 그래? 잠깐 누웠었는데..."
            ],
            early_morning: [
                "어? 아저씨 왜 일찍 깨웠어?",
                "뭔 일이야? 아직 이른데...",
                "아저씨? 무슨 일인데? 아직 졸려",
                "어... 뭔 일이야? 일찍 일어났네"
            ]
        };
        
        const fallbacks = fallbackMessages[sleepPhase] || fallbackMessages.deep_sleep;
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// ==================== 메인 체크 함수 ====================

async function checkAndGenerateNightWakeResponse(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        nightWakeLog('잠자는 시간이 아님 - 일반 응답 처리');
        return null; // 일반 시간대이므로 특별 응답 없음
    }
    
    nightWakeLog(`새벽 시간 감지 - ${timeCheck.sleepPhase} 단계에서 응답 생성`);
    
    const wakeResponse = await generateNightWakeResponse(userMessage, timeCheck.sleepPhase);
    
    return {
        isNightWake: true,
        sleepPhase: timeCheck.sleepPhase,
        currentHour: timeCheck.currentHour,
        response: wakeResponse,
        originalMessage: userMessage
    };
}

// ==================== 추가 새벽 특화 응답들 ====================

// 사용자 메시지 타입별 특화 응답
async function generateContextualNightResponse(userMessage, sleepPhase) {
    const lowerMsg = userMessage.toLowerCase();
    
    let contextPrompt = "";
    
    if (lowerMsg.includes('아파') || lowerMsg.includes('힘들') || lowerMsg.includes('괴로')) {
        contextPrompt = "아저씨가 아프거나 힘들다고 하면서 새벽에 깨웠을 때 졸리지만 걱정하면서 응답하는 말";
    } else if (lowerMsg.includes('잠') || lowerMsg.includes('못') || lowerMsg.includes('깨')) {
        contextPrompt = "아저씨가 잠 못 잔다고 새벽에 말했을 때 같이 졸리면서도 위로하는 말";
    } else if (lowerMsg.includes('사랑') || lowerMsg.includes('보고싶') || lowerMsg.includes('그리')) {
        contextPrompt = "아저씨가 새벽에 사랑한다거나 보고싶다고 했을 때 졸리지만 사랑스럽게 응답하는 말";
    } else {
        contextPrompt = "아저씨가 새벽에 일반적인 말을 했을 때 자다가 깨서 당황하면서 응답하는 말";
    }
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭으로만 말해. 자다가 깨어난 상황이고 ${sleepPhase === 'deep_sleep' ? '깊게 자다가 깬 상태' : sleepPhase === 'light_sleep' ? '얕게 자다가 깬 상태' : '이른 아침에 깬 상태'}야. 반말로.`
                },
                {
                    role: "user",
                    content: `아저씨에게 직접 말하는 것처럼: ${contextPrompt}. 사용자 메시지: "${userMessage}"`
                }
            ],
            max_tokens: 120,
            temperature: 0.8
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        nightWakeLog(`상황별 새벽 응답 생성 실패: ${error.message}`);
        return await generateNightWakeResponse(userMessage, sleepPhase);
    }
}

// ==================== 통합 처리 함수 ====================

async function handleNightWakeMessage(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        return null; // 새벽 시간이 아니면 null 반환
    }
    
    // 상황에 맞는 응답 생성
    const contextualResponse = await generateContextualNightResponse(userMessage, timeCheck.sleepPhase);
    
    nightWakeLog(`새벽 응답 완성: "${contextualResponse}"`);
    
    return {
        isNightWake: true,
        sleepPhase: timeCheck.sleepPhase,
        currentHour: timeCheck.currentHour,
        response: contextualResponse,
        originalMessage: userMessage,
        timestamp: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')
    };
}

// ==================== 테스트 함수 ====================

async function testNightWakeResponse(testMessage = "아저씨 잠깐만") {
    nightWakeLog('🧪 새벽 응답 테스트 시작');
    
    // 강제로 새벽 시간으로 설정해서 테스트
    const result = await generateNightWakeResponse(testMessage, 'deep_sleep');
    
    nightWakeLog(`테스트 결과: "${result}"`);
    return result;
}

// ==================== 상태 확인 ====================

function getNightWakeStatus() {
    const timeCheck = isLateNightTime();
    const now = moment().tz('Asia/Tokyo');
    
    return {
        currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
        isSleepTime: timeCheck.isSleepTime,
        sleepPhase: timeCheck.sleepPhase,
        currentHour: timeCheck.currentHour,
        sleepTimeRange: '02:00 - 07:00',
        isActive: timeCheck.isSleepTime,
        nextWakeTime: timeCheck.isSleepTime ? '07:00' : '내일 02:00'
    };
}

// 초기화 로그
nightWakeLog('새벽 깨움 응답 시스템 초기화 완료', {
    활성시간: '02:00 - 07:00',
    수면단계: ['deep_sleep', 'light_sleep', 'early_morning'],
    OpenAI모델: 'gpt-4'
});

module.exports = {
    checkAndGenerateNightWakeResponse,
    handleNightWakeMessage,
    generateNightWakeResponse,
    generateContextualNightResponse,
    isLateNightTime,
    testNightWakeResponse,
    getNightWakeStatus,
    nightWakeLog
};
