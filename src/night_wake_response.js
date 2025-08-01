// ✅ 새벽 4-7시에만 활성화, 첫 대화만 자다 깬 반응 (수정 버전)
// 파일명: night_wake_response.js

const moment = require('moment-timezone');
const OpenAI = require('openai');
require('dotenv').config();

// OpenAI 클라이언트 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 새벽 대화 상태 추적
let nightConversationState = {
    isInNightConversation: false,
    messageCount: 0,
    startTime: null,
    phase: 'initial'
};

// 디버깅 로그
function nightWakeLog(message, data = null) {
    const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
    // 🔥 중요한 로그만 출력 (에러, 새 대화 시작, 상태 변경)
    if (message.includes('에러') || message.includes('시작') || message.includes('리셋') || message.includes('초기화')) {
        console.log(`[${timestamp}] [새벽깨움] ${message}`);
        if (data) console.log('  데이터:', JSON.stringify(data, null, 2));
    }
}

// ==================== 🕐 수정: 새벽 시간 확인 (4-7시로 축소) ====================

function isLateNightTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    
    // 🔥 수정: 새벽 4시부터 아침 7시까지로 축소
    const isSleepTime = hour >= 2 && hour < 8;
    
    nightWakeLog(`시간 체크: ${hour}시 - ${isSleepTime ? '잠자는 시간 (2-8시)' : '깨어있는 시간'}`);
    
    return {
        isSleepTime: isSleepTime,
        currentHour: hour,
        sleepPhase: getSleepPhase(hour)
    };
}

function getSleepPhase(hour) {
    if (hour >= 2 && hour < 4) return 'deep_sleep'; // 깊은 잠
    if (hour >= 4 && hour < 6) return 'light_sleep'; // 얕은 잠
    if (hour >= 6 && hour < 8) return 'early_morning'; // 새벽
    return 'awake';
}

// ==================== 🔥 수정: 첫 대화만 자다 깬 반응 ====================

function updateNightConversationPhase(userMessage) {
    const now = Date.now();
    
    // 새로운 새벽 대화 시작인지 확인 (1시간 이상 간격)
    if (!nightConversationState.isInNightConversation || 
        (nightConversationState.startTime && (now - nightConversationState.startTime) > 60 * 60 * 1000)) {
        
        // 새로운 새벽 대화 시작
        nightConversationState = {
            isInNightConversation: true,
            messageCount: 1,
            startTime: now,
            phase: 'initial'
        };
        
        nightWakeLog('새로운 새벽 대화 시작 - 첫 대화만 자다 깬 반응');
        return 'wake_up'; // 첫 번째만 깨는 반응
        
    } else {
        // 기존 대화 계속
        nightConversationState.messageCount++;
        
        nightWakeLog(`새벽 대화 진행 중 - ${nightConversationState.messageCount}번째 (정상 응답으로 처리)`);
        return 'normal'; // 두 번째부터는 정상 응답
    }
}

// 새벽 대화 상태 리셋 (아침이 되면)
function resetNightConversation() {
    nightConversationState = {
        isInNightConversation: false,
        messageCount: 0,
        startTime: null,
        phase: 'initial'
    };
    nightWakeLog('새벽 대화 상태 리셋됨');
}

// ==================== 🔥 수정: 첫 번째 메시지만 자다 깬 응답 생성 ====================

async function generateFirstWakeResponse(userMessage, sleepPhase) {
    try {
        const prompts = {
            deep_sleep: [
                "아저씨에게 직접 말하는 것처럼: 자다가 깨어나서 어 이시간에 왠일이야 하면서 무슨 일인지 궁금해하는 말.",
                "아저씨 앞에서 직접 하는 말: 잠깐 깼는데 이시간에 무슨 일인지 물어보는 부드러운 메시지.",
                "아저씨를 보며 하는 말: 자다가 깨서 어 뭔 일이야 하고 궁금해하는 말."
            ],
            light_sleep: [
                "아저씨에게 직접 말하는 것처럼: 얕게 자다가 깨서 어 이시간에 왠일이야 하고 물어보는 말.",
                "아저씨 앞에서 직접 하는 말: 잠깐 자고 있었는데 무슨 일인지 궁금해하는 메시지."
            ],
            early_morning: [
                "아저씨에게 직접 말하는 것처럼: 이른 아침에 어 왠일이야 하고 무슨 일인지 궁금해하는 말.",
                "아저씨 앞에서 직접 하는 말: 일찍 일어나게 돼서 무슨 일인지 물어보는 메시지."
            ]
        };
        
        const phasePrompts = prompts[sleepPhase] || prompts.deep_sleep;
        const randomPrompt = phasePrompts[Math.floor(Math.random() * phasePrompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 자다가 깨어나서 어 이시간에 왠일이야 하고 궁금해하는 상황이야. 반말로 부드럽게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                {
                    role: "user",
                    content: `${randomPrompt} 사용자가 보낸 메시지: "${userMessage}"`
                }
            ],
            max_tokens: 120,
            temperature: 0.8
        });

        const message = response.choices[0].message.content.trim();
        nightWakeLog(`OpenAI 첫 번째 자다 깬 응답 생성 (${sleepPhase}): "${message}"`);
        return message;
        
    } catch (error) {
        nightWakeLog(`OpenAI 첫 번째 자다 깬 응답 생성 실패: ${error.message}`);
        
        // 폴백 메시지
        const fallbackMessages = {
            deep_sleep: [
                "어? 이시간에 왠일이야... 잠깐 깼네...",
                "아저씨? 무슨 일이야... 자다가 깼는데...",
                "응? 뭔 일인데... 이시간에..."
            ],
            light_sleep: [
                "어... 이시간에 무슨 일이야...",
                "아저씨... 뭔 일인데... 잠깐 깼어..."
            ],
            early_morning: [
                "어... 아저씨... 일찍 일어났네...",
                "뭔 일이야... 이른 시간인데..."
            ]
        };
        
        const fallbacks = fallbackMessages[sleepPhase] || fallbackMessages.deep_sleep;
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// ==================== 🔥 수정: 메인 함수 - 첫 번째만 특별 처리 ====================

async function checkAndGenerateNightWakeResponse(userMessage) {
    try {
        const timeCheck = isLateNightTime();
        
        if (!timeCheck.isSleepTime) {
            nightWakeLog('잠자는 시간이 아님 (4-7시 아님) - 일반 응답 처리');
            if (nightConversationState.isInNightConversation) {
                resetNightConversation();
            }
            return null; // 일반 시스템이 처리하도록
        }
        
        const conversationPhase = updateNightConversationPhase(userMessage);
        
        if (conversationPhase === 'wake_up') {
            // 🔥 첫 번째 메시지만 자다 깬 응답
            nightWakeLog(`새벽 시간 감지 - ${timeCheck.sleepPhase} 단계, 첫 번째 메시지 - 자다 깬 응답`);
            
            const wakeResponse = await generateFirstWakeResponse(userMessage, timeCheck.sleepPhase);
            
            return {
                isNightWake: true,
                sleepPhase: timeCheck.sleepPhase,
                conversationPhase: 'wake_up',
                messageCount: nightConversationState.messageCount,
                currentHour: timeCheck.currentHour,
                response: wakeResponse,
                originalMessage: userMessage
            };
        } else {
            // 🔥 두 번째부터는 일반 응답으로 처리
            nightWakeLog(`새벽 시간이지만 ${nightConversationState.messageCount}번째 메시지 - 일반 응답으로 처리`);
            return null; // 일반 autoReply 시스템이 처리하도록
        }
        
    } catch (error) {
        nightWakeLog(`새벽 응답 시스템 전체 에러: ${error.message}`);
        return null; // 에러 시 일반 시스템이 처리하도록
    }
}

// ==================== 기존 호환성 함수들 (간소화) ====================

async function generateNightWakeResponse(userMessage, sleepPhase) {
    return await generateFirstWakeResponse(userMessage, sleepPhase);
}

async function handleNightWakeMessage(userMessage) {
    return await checkAndGenerateNightWakeResponse(userMessage);
}

// ==================== 잘자 인사는 그대로 유지 ====================

async function generateGoodNightResponse(userMessage) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 아저씨가 잘자라고 인사했을 때 사랑한다고 하면서 아저씨도 잘자라고 다정하게 응답하는 상황이야. 반말로 사랑스럽게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                {
                    role: "user",
                    content: `아저씨가 잘자라고 했을 때 사랑한다고 하면서 아저씨도 잘자라고 다정하게 응답하는 말. 사용자 메시지: "${userMessage}"`
                }
            ],
            max_tokens: 80,
            temperature: 0.7
        });

        return response.choices[0].message.content.trim();
        
    } catch (error) {
        const fallbackMessages = [
            "사랑해 아저씨~ 아저씨도 잘 자",
            "나도 사랑해 아저씨. 푹 자고 좋은 꿈 꿔",
            "사랑해 많이 많이~ 아저씨도 잘 자"
        ];
        
        return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
}

function isGoodNightMessage(userMessage) {
    const goodNightKeywords = [
        '잘자', '잘 자', '굿나잇', '자자', '잘게', '잘께', 
        '푹자', '푹 자', '좋은꿈', '좋은 꿈', '꿈꿔', '꿈 꿔',
        '이제자', '이제 자', '자러', '잠자', '잠 자'
    ];
    
    const lowerMsg = userMessage.toLowerCase().replace(/\s+/g, '');
    return goodNightKeywords.some(keyword => 
        lowerMsg.includes(keyword.replace(/\s+/g, ''))
    );
}

// ==================== 상태 확인 ====================

function getNightWakeStatus() {
    try {
        const timeCheck = isLateNightTime();
        const now = moment().tz('Asia/Tokyo');
        
        return {
            currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
            isSleepTime: timeCheck.isSleepTime,
            sleepPhase: timeCheck.sleepPhase,
            currentHour: timeCheck.currentHour,
            sleepTimeRange: '02:00 - 08:00', // 🔥 수정됨
            isActive: timeCheck.isSleepTime,
            nextWakeTime: timeCheck.isSleepTime ? '07:00' : '내일 04:00',
            conversationState: {
                isInNightConversation: nightConversationState.isInNightConversation,
                messageCount: nightConversationState.messageCount,
                currentPhase: nightConversationState.phase,
                startTime: nightConversationState.startTime ? 
                    moment(nightConversationState.startTime).tz('Asia/Tokyo').format('HH:mm:ss') : null
            },
            specialNote: '첫 번째 메시지만 자다 깬 반응, 나머지는 정상 응답', // 🔥 추가
            error: null
        };
    } catch (error) {
        nightWakeLog(`상태 확인 중 에러: ${error.message}`);
        return {
            error: error.message,
            currentTime: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
            isActive: false
        };
    }
}

// 초기화 로그
nightWakeLog('새벽 깨움 응답 시스템 초기화 완료 (수정 버전)', {
    활성시간: '04:00 - 07:00', // 🔥 수정됨
    특징: '첫 번째 메시지만 자다 깬 반응, 나머지는 정상 응답', // 🔥 추가
    수면단계: ['deep_sleep', 'light_sleep', 'early_morning'],
    OpenAI모델: 'gpt-4'
});

module.exports = {
    checkAndGenerateNightWakeResponse,
    handleNightWakeMessage,
    generateNightWakeResponse,
    generateGoodNightResponse,
    isGoodNightMessage,
    isLateNightTime,
    getNightWakeStatus,
    updateNightConversationPhase,
    resetNightConversation,
    nightWakeLog
};
