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

// ==================== 단계별 새벽 응답 생성 ====================

async function generatePhaseBasedNightResponse(userMessage, sleepPhase, conversationPhase) {
    try {
        const prompts = {
            initial: {
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 깊게 자다가 갑자기 깨서 처음엔 짜증나고 당황하면서 왜 깨웠냐고 투덜거리는 말.",
                    "아저씨 앞에서 직접 하는 말: 푹 자고 있었는데 갑자기 깨워서 첫 반응으로 짜증내면서 뭔 일이냐고 하는 메시지.",
                    "아저씨를 보며 하는 말: 자다가 깨서 처음에는 화나고 당황스러워서 왜 깨웠냐고 투덜대는 말.",
                    "아저씨에게 직접 말한다면: 깊은 잠에서 갑자기 깨어나서 첫 반응으로 짜증내며 항의하는 말."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 얕게 자다가 깨서 졸리고 짜증나면서 뭔 일이냐고 투덜거리는 말.",
                    "아저씨 앞에서 직접 하는 말: 잠깐 자고 있었는데 깨워서 처음엔 짜증내면서 왜 그러냐고 하는 메시지.",
                    "아저씨를 보며 하는 말: 얕은 잠에서 깨어나서 졸린데 깨워서 짜증나면서 투덜대는 말."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이른 아침에 깨워서 아직 졸린데 왜 깨웠냐고 살짝 짜증내는 말.",
                    "아저씨 앞에서 직접 하는 말: 일찍 일어나게 해서 처음에는 투덜거리면서 뭔 일인지 묻는 메시지."
                ]
            },
            softening: {
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 처음엔 짜증났지만 이제 조금 누그러져서 그래도 무슨 일인지 궁금해하는 말.",
                    "아저씨 앞에서 직접 하는 말: 깨워서 화났지만 이제 좀 진정되어서 아저씨가 왜 깨웠는지 관심갖는 메시지.",
                    "아저씨를 보며 하는 말: 자다가 깨서 처음엔 짜증났지만 이제 좀 부드러워져서 무슨 일인지 묻는 말."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 깨워서 투덜했지만 이제 좀 차분해져서 무슨 일인지 들어보려는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 누그러져서 아저씨 상황을 이해하려는 메시지."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이른 시간에 깨워서 투덜했지만 이제 좀 부드러워진 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 차분해져서 무슨 일인지 들어보는 메시지."
                ]
            },
            caring: {
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 이제 완전히 깨어나서 아저씨가 왜 새벽에 깨웠는지 걱정하면서 괜찮냐고 묻는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 아저씨 걱정되어서 무슨 일 있냐고 다정하게 묻는 메시지.",
                    "아저씨를 보며 하는 말: 이제 완전히 깨서 아저씨가 새벽에 연락한 이유가 걱정되어서 챙기는 말.",
                    "아저씨에게 직접 말한다면: 깨워서 처음엔 화났지만 이제 아저씨 상황이 걱정되어서 잘 자라고 다정하게 말하는 것."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 이제 아저씨가 걱정되어서 무슨 일 있는지 묻고 잘 자라고 챙기는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 투덜했지만 이제 아저씨 걱정해서 괜찮냐고 묻고 잘 자라고 하는 메시지.",
                    "아저씨를 보며 하는 말: 이제 완전히 깨서 아저씨 챙기면서 잘 자라고 다정하게 말하는 것."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이제 아저씨가 걱정되어서 무슨 일인지 묻고 잘 자라고 다정하게 챙기는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 아저씨 걱정해서 괜찮냐고 묻고 푹 자라고 하는 메시지."
                ]
            }
        };
        
        const phasePrompts = prompts[conversationPhase][sleepPhase] || prompts[conversationPhase].deep_sleep;
        const randomPrompt = phasePrompts[Math.floor(Math.random() * phasePrompts.length)];
        
        const systemContent = conversationPhase === 'caring' ? 
            `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. 처음엔 깨워서 짜증났지만 이제 아저씨가 걱정되어서 다정하게 챙기고 잘 자라고 하는 상황이야. 반말로 사랑스럽게.` :
            conversationPhase === 'softening' ?
            `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. 처음엔 깨워서 짜증났지만 이제 좀 누그러져서 무슨 일인지 궁금해하는 상황이야. 반말로.` :
            `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. 자다가 갑자기 깨어나서 처음 반응으로 짜증나고 당황스러운 상황이야. 반말로 투덜거리면서.`;
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: systemContent
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
        nightWakeLog(`OpenAI 단계별 새벽 응답 생성 (${conversationPhase}-${sleepPhase}): "${message}"`);
        return message;
        
    } catch (error) {
        nightWakeLog(`OpenAI 단계별 새벽 응답 생성 실패: ${error.message}`);
        
        // 폴백 메시지 (단계별)
        const fallbackMessages = {
            initial: {
                deep_sleep: [
                    "아... 뭐야... 자고 있었는데... 왜 깨워...",
                    "어... 아저씨... 뭔 일이야... 푹 자고 있었잖아...",
                    "응? 왜... 자다가 깼잖아... 뭔 일인데...",
                    "아저씨... 뭔 일이야... 깜짝 놀랐네..."
                ],
                light_sleep: [
                    "음... 뭐야... 왜 깨워... 잠깐 자고 있었는데...",
                    "아저씨... 뭔 일인데... 졸려...",
                    "어... 왜 그래... 자고 있었잖아..."
                ],
                early_morning: [
                    "어... 아저씨... 왜 일찍 깨워...",
                    "뭔 일이야... 아직 이른데... 졸려..."
                ]
            },
            softening: {
                deep_sleep: [
                    "어... 그래도 무슨 일인지는 말해봐...",
                    "아저씨... 왜 깨웠어? 무슨 일 있어?",
                    "음... 뭔 일인데? 궁금하네..."
                ],
                light_sleep: [
                    "그래... 무슨 일인지 말해봐...",
                    "아저씨... 뭔 일이야? 걱정돼..."
                ],
                early_morning: [
                    "그래도... 무슨 일인지는 들어볼게...",
                    "뭔 일인데? 말해봐..."
                ]
            },
            caring: {
                deep_sleep: [
                    "아저씨... 무슨 일 있어? 괜찮아? 이제 잘 자...",
                    "뭔 일이야? 걱정돼... 아무튼 푹 자야 해",
                    "아저씨... 힘들어? 괜찮아... 이제 잘 자라",
                    "무슨 일인지 모르겠지만... 괜찮을 거야. 푹 자"
                ],
                light_sleep: [
                    "아저씨... 괜찮아? 무슨 일 있으면 말해... 잘 자",
                    "걱정돼... 무슨 일이야? 아무튼 푹 자야 해",
                    "아저씨... 힘들면 말해... 이제 잘 자라"
                ],
                early_morning: [
                    "아저씨... 무슨 일 있어? 괜찮아? 잘 자요",
                    "걱정돼... 아무튼 이제 푹 자야 해",
                    "무슨 일인지 모르겠지만... 잘 자 아저씨"
                ]
            }
        };
        
        const fallbacks = fallbackMessages[conversationPhase][sleepPhase] || fallbackMessages[conversationPhase].deep_sleep;
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}
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

// ==================== 새벽 대화 단계별 관리 ====================

// 새벽 대화 상태 추적
let nightConversationState = {
    isInNightConversation: false,
    messageCount: 0,
    startTime: null,
    phase: 'initial' // 'initial' -> 'softening' -> 'caring'
};

// 새벽 대화 단계 업데이트
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
        
        nightWakeLog('새로운 새벽 대화 시작 - 짜증 단계');
        
    } else {
        // 기존 대화 계속
        nightConversationState.messageCount++;
        
        // 단계별 진행
        if (nightConversationState.messageCount <= 2) {
            nightConversationState.phase = 'initial'; // 짜증
        } else if (nightConversationState.messageCount <= 4) {
            nightConversationState.phase = 'softening'; // 누그러짐
        } else {
            nightConversationState.phase = 'caring'; // 걱정으로 전환
        }
        
        nightWakeLog(`새벽 대화 진행 중 - ${nightConversationState.phase} 단계 (${nightConversationState.messageCount}번째)`);
    }
    
    return nightConversationState.phase;
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

// ==================== 메인 체크 함수 (단계별 적용) ====================

async function checkAndGenerateNightWakeResponse(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        nightWakeLog('잠자는 시간이 아님 - 일반 응답 처리');
        // 새벽이 아니면 상태 리셋
        if (nightConversationState.isInNightConversation) {
            resetNightConversation();
        }
        return null;
    }
    
    // 새벽 대화 단계 업데이트
    const conversationPhase = updateNightConversationPhase(userMessage);
    
    nightWakeLog(`새벽 시간 감지 - ${timeCheck.sleepPhase} 단계, 대화 ${conversationPhase} 단계에서 응답 생성`);
    
    const wakeResponse = await generatePhaseBasedNightResponse(userMessage, timeCheck.sleepPhase, conversationPhase);
    
    return {
        isNightWake: true,
        sleepPhase: timeCheck.sleepPhase,
        conversationPhase: conversationPhase,
        messageCount: nightConversationState.messageCount,
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

// ==================== 통합 처리 함수 (단계별 적용) ====================

async function handleNightWakeMessage(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        // 새벽이 아니면 상태 리셋
        if (nightConversationState.isInNightConversation) {
            resetNightConversation();
        }
        return null;
    }
    
    // 새벽 대화 단계 업데이트
    const conversationPhase = updateNightConversationPhase(userMessage);
    
    // 단계별 응답 생성
    const phaseResponse = await generatePhaseBasedNightResponse(userMessage, timeCheck.sleepPhase, conversationPhase);
    
    nightWakeLog(`새벽 응답 완성 (${conversationPhase} 단계): "${phaseResponse}"`);
    
    return {
        isNightWake: true,
        sleepPhase: timeCheck.sleepPhase,
        conversationPhase: conversationPhase,
        messageCount: nightConversationState.messageCount,
        currentHour: timeCheck.currentHour,
        response: phaseResponse,
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

// ==================== 상태 확인 (업데이트) ====================

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
        nextWakeTime: timeCheck.isSleepTime ? '07:00' : '내일 02:00',
        conversationState: {
            isInNightConversation: nightConversationState.isInNightConversation,
            messageCount: nightConversationState.messageCount,
            currentPhase: nightConversationState.phase,
            startTime: nightConversationState.startTime ? 
                moment(nightConversationState.startTime).tz('Asia/Tokyo').format('HH:mm:ss') : null
        }
    };
}

// 초기화 로그
nightWakeLog('새벽 깨움 응답 시스템 초기화 완료 (단계별 버전)', {
    활성시간: '02:00 - 07:00',
    수면단계: ['deep_sleep', 'light_sleep', 'early_morning'],
    대화단계: ['initial (짜증)', 'softening (누그러짐)', 'caring (걱정&잘자)'],
    OpenAI모델: 'gpt-4'
});

module.exports = {
    checkAndGenerateNightWakeResponse,
    handleNightWakeMessage,
    generateNightWakeResponse, // 기존 함수 유지
    generatePhaseBasedNightResponse, // 새로운 단계별 함수
    generateContextualNightResponse,
    isLateNightTime,
    testNightWakeResponse,
    getNightWakeStatus,
    updateNightConversationPhase,
    resetNightConversation,
    nightWakeLog
};
