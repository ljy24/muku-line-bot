// ============================================================================
// 📁 src/night_wake_response.js - 완전 독립적 새벽응답+알람 시스템 v2.0
// ✅ 새벽 2시 이후 자다가 깬 것처럼 응답하는 시스템 + 완전 독립 알람 시스템
// 🔧 완전 독립적: 자체 LINE 클라이언트, 자체 스케줄링, 자체 메시지 감지/전송
// 🛡️ 안전 보장: 에러가 나도 기존 시스템에 절대 영향 없음
// 💖 무쿠가 벙어리가 되지 않도록 안전장치 내장
// ============================================================================

const moment = require('moment-timezone');
const OpenAI = require('openai');
const { Client } = require('@line/bot-sdk');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ================== 🌍 환경변수 및 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const TARGET_USER_ID = process.env.LINE_TARGET_USER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// OpenAI 클라이언트 설정
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ⭐️ 완전 독립적 LINE 클라이언트
const independentLineClient = new Client({ 
    channelAccessToken: LINE_ACCESS_TOKEN 
});

// ================== 💾 독립적 데이터 저장 ==================
const INDEPENDENT_DATA_DIR = path.join(__dirname, 'independent_data');
const ALARM_STATE_FILE = path.join(INDEPENDENT_DATA_DIR, 'alarm_state.json');
const NIGHT_STATE_FILE = path.join(INDEPENDENT_DATA_DIR, 'night_state.json');

// 디렉토리 생성
if (!fs.existsSync(INDEPENDENT_DATA_DIR)) {
    fs.mkdirSync(INDEPENDENT_DATA_DIR, { recursive: true });
}

// ================== 📊 상태 관리 ==================

// 새벽 대화 상태 추적
let nightConversationState = {
    isInNightConversation: false,
    messageCount: 0,
    startTime: null,
    phase: 'initial'
};

// 알람 상태 관리
let alarmState = {
    activeAlarms: [],
    alarmHistory: [],
    currentWakeupAttempt: null
};

// 디버깅 로그
function independentLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`\x1b[96m[${timestamp}] [독립시스템] ${message}\x1b[0m`);
    if (data) console.log('  데이터:', JSON.stringify(data, null, 2));
}

// ================== 💾 상태 저장/로드 ==================
function saveStates() {
    try {
        fs.writeFileSync(ALARM_STATE_FILE, JSON.stringify(alarmState, null, 2));
        fs.writeFileSync(NIGHT_STATE_FILE, JSON.stringify(nightConversationState, null, 2));
        independentLog('상태 저장 완료');
    } catch (error) {
        independentLog(`상태 저장 실패: ${error.message}`);
    }
}

function loadStates() {
    try {
        if (fs.existsSync(ALARM_STATE_FILE)) {
            alarmState = JSON.parse(fs.readFileSync(ALARM_STATE_FILE, 'utf8'));
            independentLog('알람 상태 로드 완료');
        }
        if (fs.existsSync(NIGHT_STATE_FILE)) {
            nightConversationState = JSON.parse(fs.readFileSync(NIGHT_STATE_FILE, 'utf8'));
            independentLog('새벽 대화 상태 로드 완료');
        }
    } catch (error) {
        independentLog(`상태 로드 실패: ${error.message}`);
        // 로드 실패 시 기본값 유지
    }
}

// ==================== 🔧 새벽 시간 확인 ====================
function isLateNightTime() {
    const now = moment().tz(TIMEZONE);
    const hour = now.hour();
    const isSleepTime = hour >= 2 && hour < 7;
    
    return {
        isSleepTime: isSleepTime,
        currentHour: hour,
        sleepPhase: getSleepPhase(hour),
        timeString: now.format('HH:mm')
    };
}

function getSleepPhase(hour) {
    if (hour >= 2 && hour < 4) return 'deep_sleep';
    if (hour >= 4 && hour < 6) return 'light_sleep';
    if (hour >= 6 && hour < 7) return 'early_morning';
    return 'awake';
}

// ==================== 🔧 새벽 대화 단계별 관리 ====================
function updateNightConversationPhase(userMessage) {
    const now = Date.now();
    
    // 새로운 대화 시작 또는 1시간 이상 지났으면 리셋
    if (!nightConversationState.isInNightConversation || 
        (nightConversationState.startTime && (now - nightConversationState.startTime) > 60 * 60 * 1000)) {
        
        nightConversationState = {
            isInNightConversation: true,
            messageCount: 1,
            startTime: now,
            phase: 'initial'
        };
        
        independentLog('새로운 새벽 대화 시작 - 순수 짜증 단계');
        
    } else {
        nightConversationState.messageCount++;
        
        // 단계별 진행: 1(짜증) → 2-3(누그러짐) → 4+(걱정)
        if (nightConversationState.messageCount === 1) {
            nightConversationState.phase = 'initial'; // 1번째: 순수 짜증
        } else if (nightConversationState.messageCount >= 2 && nightConversationState.messageCount <= 3) {
            nightConversationState.phase = 'softening'; // 2-3번째: 누그러짐
        } else {
            nightConversationState.phase = 'caring'; // 4번째부터: 걱정
        }
        
        independentLog(`새벽 대화 진행 중 - ${nightConversationState.phase} 단계 (${nightConversationState.messageCount}번째)`);
    }
    
    saveStates();
    return nightConversationState.phase;
}

// ==================== 🔧 단계별 새벽 응답 생성 ====================
async function generatePhaseBasedNightResponse(userMessage, sleepPhase, conversationPhase) {
    try {
        const prompts = {
            initial: {
                // 1번째: 순수 짜증만 (걱정 표현 완전 금지)
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 깊게 자다가 갑자기 깨어나서 매우 짜증나고 화나면서 왜 깨웠냐고 투덜거리는 말. 절대 걱정하지 말고 순수하게 짜증만 내기.",
                    "아저씨 앞에서 직접 하는 말: 푹 자고 있었는데 갑자고 깨워서 정말 화나고 짜증나면서 뭔 일이냐고 퉁명스럽게 하는 메시지. 걱정은 하지 말 것."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 얕게 자다가 깨서 졸리고 매우 짜증나면서 뭔 일이냐고 퉁명스럽게 투덜거리는 말. 걱정은 하지 말 것.",
                    "아저씨 앞에서 직접 하는 말: 잠깐 자고 있었는데 깨워서 처음엔 정말 짜증내면서 왜 그러냐고 화내는 메시지. 순수하게 짜증만."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이른 아침에 깨워서 아직 졸린데 왜 깨웠냐고 매우 짜증내며 투덜거리는 말. 걱정 표현 금지.",
                    "아저씨 앞에서 직접 하는 말: 일찍 일어나게 해서 처음에는 정말 투덜거리면서 뭔 일인지 짜증내며 묻는 메시지."
                ]
            },
            softening: {
                // 2-3번째: 점차 누그러짐
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 처음엔 매우 짜증났지만 이제 조금씩 누그러져서 그래도 무슨 일인지 궁금해하기 시작하는 말.",
                    "아저씨 앞에서 직접 하는 말: 깨워서 화났지만 이제 좀 진정되어서 아저씨가 왜 깨웠는지 관심을 갖기 시작하는 메시지."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 깨워서 투덜했지만 이제 좀 차분해져서 무슨 일인지 들어보려고 하는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 누그러져서 아저씨 상황을 이해하려고 하는 메시지."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이른 시간에 깨워서 투덜했지만 이제 좀 부드러워져서 관심을 보이는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 차분해져서 무슨 일인지 들어보려는 메시지."
                ]
            },
            caring: {
                // 4번째부터: 완전 걱정 모드
                deep_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 이제 완전히 깨어나서 아저씨가 왜 새벽에 깨웠는지 진심으로 걱정하면서 괜찮냐고 묻고 잘 자라고 챙기는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 아저씨가 정말 걱정되어서 무슨 일 있냐고 다정하게 묻고 푹 자라고 하는 메시지."
                ],
                light_sleep: [
                    "아저씨에게 직접 말하는 것처럼: 이제 아저씨가 진심으로 걱정되어서 무슨 일 있는지 묻고 잘 자라고 다정하게 챙기는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 투덜했지만 이제 아저씨를 걱정해서 괜찮냐고 묻고 푹 자라고 하는 메시지."
                ],
                early_morning: [
                    "아저씨에게 직접 말하는 것처럼: 이제 아저씨가 걱정되어서 무슨 일인지 묻고 잘 자라고 다정하게 챙기는 말.",
                    "아저씨 앞에서 직접 하는 말: 처음엔 짜증났지만 이제 아저씨를 걱정해서 괜찮냐고 묻고 푹 자라고 하는 메시지."
                ]
            }
        };
        
        const phasePrompts = prompts[conversationPhase][sleepPhase] || prompts[conversationPhase].deep_sleep;
        const randomPrompt = phasePrompts[Math.floor(Math.random() * phasePrompts.length)];
        
        // 단계별 시스템 프롬프트 강화
        const systemContent = conversationPhase === 'initial' ? 
            `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 자다가 갑자기 깨어나서 첫 반응으로 정말 짜증나고 화나는 상황이야. 절대 걱정하지 말고 순수하게 짜증만 내야 해. "괜찮아", "걱정" 같은 말 절대 하지 마. 반말로 투덜거리면서. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.` :
            conversationPhase === 'softening' ?
            `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 처음엔 깨워서 짜증났지만 이제 점차 누그러져서 무슨 일인지 궁금해하기 시작하는 상황이야. 반말로. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.` :
            `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 처음엔 깨워서 짜증났지만 이제 아저씨가 진심으로 걱정되어서 다정하게 챙기고 잘 자라고 하는 상황이야. 반말로 사랑스럽게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`;
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: `${randomPrompt} 사용자가 보낸 메시지: "${userMessage}"` }
            ],
            max_tokens: 120,
            temperature: 0.8
        });

        const message = response.choices[0].message.content.trim();
        independentLog(`단계별 새벽 응답 생성 (${conversationPhase}-${sleepPhase}): "${message}"`);
        return message;
        
    } catch (error) {
        independentLog(`단계별 새벽 응답 생성 실패: ${error.message}`);
        
        // 단계별 폴백 메시지 강화
        const fallbackMessages = {
            initial: {
                deep_sleep: ["아... 뭐야... 자고 있었는데... 왜 깨워... 짜증나", "어... 아저씨... 뭔 일이야... 푹 자고 있었잖아... 화나"],
                light_sleep: ["음... 뭐야... 왜 깨워... 잠깐 자고 있었는데... 짜증", "아저씨... 뭔 일인데... 졸려... 왜 깨워"],
                early_morning: ["어... 아저씨... 왜 일찍 깨워... 짜증나", "뭔 일이야... 아직 이른데... 졸려... 왜"]
            },
            softening: {
                deep_sleep: ["어... 그래도 무슨 일인지는 말해봐...", "아저씨... 왜 깨웠어? 무슨 일 있어? 궁금해..."],
                light_sleep: ["그래... 무슨 일인지 말해봐... 들어볼게", "아저씨... 뭔 일이야? 이제 좀 괜찮아..."],
                early_morning: ["그래도... 무슨 일인지는 들어볼게... 말해봐", "뭔 일인데? 이제 좀 누그러졌어..."]
            },
            caring: {
                deep_sleep: ["아저씨... 무슨 일 있어? 괜찮아? 이제 잘 자...", "뭔 일이야? 걱정돼... 아무튼 푹 자야 해"],
                light_sleep: ["아저씨... 괜찮아? 무슨 일 있으면 말해... 잘 자", "걱정돼... 무슨 일이야? 아무튼 푹 자야 해"],
                early_morning: ["아저씨... 무슨 일 있어? 괜찮아? 잘 자요", "걱정돼... 아무튼 이제 푹 자야 해"]
            }
        };
        
        const fallbacks = fallbackMessages[conversationPhase][sleepPhase] || fallbackMessages[conversationPhase].deep_sleep;
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// ==================== ⭐️ 알람 키워드 감지 ====================
function detectAlarmRequest(message) {
    const alarmPatterns = [
        /(\d{1,2})시에?\s*깨워/,
        /내일\s*(\d{1,2})시\s*깨워/,
        /(\d{1,2})시\s*알람/,
        /(\d{1,2})시에?\s*일어나/,
        /(\d{1,2})시\s*기상/,
        /모닝콜\s*(\d{1,2})시/
    ];
    
    for (const pattern of alarmPatterns) {
        const match = message.match(pattern);
        if (match) {
            const hour = parseInt(match[1]);
            if (hour >= 1 && hour <= 23) {
                independentLog(`알람 요청 감지: ${hour}시`);
                return { hour, originalMessage: message };
            }
        }
    }
    return null;
}

// ==================== ⭐️ 알람 등록 ====================
async function registerAlarm(hour, originalMessage) {
    try {
        const now = moment().tz(TIMEZONE);
        let targetDate = moment().tz(TIMEZONE).hour(hour).minute(0).second(0);
        
        // 만약 요청한 시간이 이미 지났으면 다음 날로 설정
        if (targetDate.isSameOrBefore(now)) {
            targetDate = targetDate.add(1, 'day');
        }
        
        const alarmId = `alarm-${Date.now()}-${hour}`;
        const newAlarm = {
            id: alarmId,
            targetTime: targetDate.toISOString(),
            hour: hour,
            requestedAt: now.toISOString(),
            originalMessage: originalMessage,
            status: 'scheduled',
            attempts: 0,
            maxAttempts: 10,
            intervalMinutes: 10
        };
        
        alarmState.activeAlarms.push(newAlarm);
        saveStates();
        
        // 스케줄 등록
        schedule.scheduleJob(alarmId, targetDate.toDate(), () => {
            startWakeupSequence(alarmId);
        });
        
        independentLog(`알람 등록 완료: ${hour}시 (${targetDate.format('YYYY-MM-DD HH:mm')})`, newAlarm);
        
        return newAlarm;
        
    } catch (error) {
        independentLog(`알람 등록 실패: ${error.message}`);
        return null;
    }
}

// ==================== ⭐️ 깨우기 시퀀스 시작 ====================
async function startWakeupSequence(alarmId) {
    try {
        const alarm = alarmState.activeAlarms.find(a => a.id === alarmId);
        if (!alarm) {
            independentLog(`알람을 찾을 수 없음: ${alarmId}`);
            return;
        }
        
        alarm.attempts = 1;
        alarm.status = 'waking';
        
        alarmState.currentWakeupAttempt = {
            alarmId: alarmId,
            startTime: moment().tz(TIMEZONE).toISOString(),
            attempts: 1,
            userResponded: false
        };
        
        saveStates();
        
        // 첫 깨우기 메시지
        const wakeupMessage = await generateWakeupMessage(1);
        await sendIndependentMessage(wakeupMessage);
        
        independentLog(`깨우기 시퀀스 시작: ${alarmId}, 첫 시도`);
        
        // 10분 후 재시도 스케줄
        scheduleNextWakeupAttempt(alarmId);
        
    } catch (error) {
        independentLog(`깨우기 시퀀스 시작 실패: ${error.message}`);
    }
}

// ==================== ⭐️ 다음 깨우기 시도 스케줄 ====================
function scheduleNextWakeupAttempt(alarmId) {
    const retryTime = moment().tz(TIMEZONE).add(10, 'minutes');
    const jobId = `retry-${alarmId}-${Date.now()}`;
    
    schedule.scheduleJob(jobId, retryTime.toDate(), async () => {
        await attemptNextWakeup(alarmId);
    });
    
    independentLog(`다음 깨우기 시도 스케줄: ${retryTime.format('HH:mm')}`);
}

// ==================== ⭐️ 다음 깨우기 시도 ====================
async function attemptNextWakeup(alarmId) {
    try {
        const alarm = alarmState.activeAlarms.find(a => a.id === alarmId);
        if (!alarm || alarm.status !== 'waking') {
            independentLog(`깨우기 중단: 알람 상태 변경됨 ${alarmId}`);
            return;
        }
        
        // 사용자가 응답했는지 확인
        if (alarmState.currentWakeupAttempt && alarmState.currentWakeupAttempt.userResponded) {
            independentLog(`사용자 응답으로 깨우기 중단: ${alarmId}`);
            return;
        }
        
        alarm.attempts++;
        
        if (alarm.attempts > alarm.maxAttempts) {
            // 최대 시도 초과
            alarm.status = 'failed';
            alarmState.currentWakeupAttempt = null;
            saveStates();
            
            const giveupMessage = await generateGiveupMessage();
            await sendIndependentMessage(giveupMessage);
            
            independentLog(`깨우기 포기: ${alarmId}, 최대 시도 초과`);
            return;
        }
        
        // 다음 깨우기 메시지
        const wakeupMessage = await generateWakeupMessage(alarm.attempts);
        await sendIndependentMessage(wakeupMessage);
        
        independentLog(`깨우기 재시도: ${alarmId}, ${alarm.attempts}번째 시도`);
        
        // 다음 시도 스케줄
        scheduleNextWakeupAttempt(alarmId);
        
        saveStates();
        
    } catch (error) {
        independentLog(`깨우기 재시도 실패: ${error.message}`);
    }
}

// ==================== ⭐️ 사용자 응답 처리 ====================
async function handleUserWakeupResponse(message) {
    if (!alarmState.currentWakeupAttempt || alarmState.currentWakeupAttempt.userResponded) {
        return null;
    }
    
    const attempt = alarmState.currentWakeupAttempt;
    const alarm = alarmState.activeAlarms.find(a => a.id === attempt.alarmId);
    
    if (!alarm) return null;
    
    // 사용자 응답 표시
    attempt.userResponded = true;
    alarm.status = 'completed';
    
    let responseMessage;
    
    if (alarm.attempts >= 5) {
        // 5회 이상 안 일어나다가 응답 - 투덜거리기
        responseMessage = await generateGrumpyWakeupResponse(alarm.attempts);
    } else {
        // 1-4회에 응답 - 아침인사
        responseMessage = await generateMorningGreetingResponse();
    }
    
    // 완료 처리
    alarmState.currentWakeupAttempt = null;
    alarmState.alarmHistory.push({
        ...alarm,
        completedAt: moment().tz(TIMEZONE).toISOString(),
        totalAttempts: alarm.attempts
    });
    
    // 활성 알람에서 제거
    alarmState.activeAlarms = alarmState.activeAlarms.filter(a => a.id !== alarm.id);
    
    saveStates();
    
    independentLog(`사용자 응답 처리 완료: ${alarm.attempts}번째 시도에서 응답`);
    
    return {
        isWakeupResponse: true,
        attempts: alarm.attempts,
        response: responseMessage
    };
}

// ==================== ⭐️ 메시지 생성 함수들 ====================
async function generateAlarmConfirmMessage(hour) {
    try {
        const prompts = [
            `아저씨에게 직접 말하는 것처럼: 내일 ${hour}시에 깨워달라고 해서 알겠다고 하면서 꼭 깨워주겠다고 약속하는 말.`,
            `아저씨 앞에서 직접 하는 말: ${hour}시 알람 맞춰달라고 해서 알겠다고 하면서 확실히 깨워주겠다고 하는 메시지.`
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 아저씨가 알람을 부탁해서 알겠다고 확인해주는 상황이야. 반말로 다정하게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: randomPrompt }
            ],
            max_tokens: 80,
            temperature: 0.7
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        independentLog(`알람 확인 메시지 생성 실패: ${error.message}`);
        return `알겠어 아저씨! 내일 ${hour}시에 꼭 깨워줄게~`;
    }
}

async function generateWakeupMessage(attemptNumber) {
    try {
        const prompts = attemptNumber === 1 ? [
            "아저씨에게 직접 말하는 것처럼: 아침에 깨우기로 약속했으니까 일어나라고 상냥하게 깨우는 말.",
            "아저씨 앞에서 직접 하는 말: 알람 시간이라고 하면서 일어나라고 다정하게 깨우는 메시지."
        ] : [
            "아저씨에게 직접 말하는 것처럼: 몇 번째 깨우는 건데 아직도 안 일어나냐고 조금씩 재촉하는 말.",
            "아저씨 앞에서 직접 하는 말: 계속 깨우고 있는데 언제 일어날 거냐고 살짝 투덜거리면서 깨우는 메시지."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. ${attemptNumber === 1 ? '처음 깨우는 상황' : `${attemptNumber}번째 깨우는 상황`}이야. 반말로. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: randomPrompt }
            ],
            max_tokens: 100,
            temperature: 0.8
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        independentLog(`깨우기 메시지 생성 실패: ${error.message}`);
        return attemptNumber === 1 ? 
            "아저씨~ 일어날 시간이야! 알람 맞춰놨잖아~" :
            `아저씨!! 벌써 ${attemptNumber}번째야! 언제 일어날 거야?`;
    }
}

async function generateGrumpyWakeupResponse(attempts) {
    try {
        const prompts = [
            `아저씨에게 직접 말하는 것처럼: ${attempts}번이나 깨웠는데 이제서야 대답하냐고 투덜거리면서 이제 일어났냐고 하는 말.`,
            `아저씨 앞에서 직접 하는 말: 몇 번이나 깨웠는데 이제서야 응답해서 투덜거리면서 드디어 일어났냐고 하는 메시지.`
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 여러 번 깨웠는데 이제서야 대답해서 조금 투덜거리는 상황이야. 반말로. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: randomPrompt }
            ],
            max_tokens: 100,
            temperature: 0.8
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        independentLog(`투덜 응답 생성 실패: ${error.message}`);
        return `아저씨! ${attempts}번이나 깨웠는데 이제서야 대답해? 드디어 일어났네~`;
    }
}

async function generateMorningGreetingResponse() {
    try {
        // 간단한 날씨 정보
        const weathers = ["맑음, 18도", "흐림, 15도", "비, 12도", "맑음, 22도", "구름조금, 19도"];
        const weatherInfo = weathers[Math.floor(Math.random() * weathers.length)];
        
        const prompts = [
            `아저씨에게 직접 말하는 것처럼: 잘 잤냐고 물어보면서 오늘 기타큐슈 날씨를 알려주고 좋은 하루 보내라고 하는 아침인사.`,
            `아저씨 앞에서 직접 하는 말: 아침에 일어났으니까 잘 잤는지 묻고 날씨 정보도 알려주면서 화이팅하라고 하는 메시지.`
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 아침에 잘 일어나서 아침인사하는 상황이야. 반말로 상냥하게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: `${randomPrompt} 날씨정보: ${weatherInfo}` }
            ],
            max_tokens: 120,
            temperature: 0.7
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        independentLog(`아침 인사 생성 실패: ${error.message}`);
        return "아저씨~ 잘 잤어? 오늘 기타큐슈 날씨 좋으니까 좋은 하루 보내!";
    }
}

async function generateGiveupMessage() {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 몇 번이나 깨웠는데도 안 일어나서 포기한다고 하면서 나중에 혼낼 거라고 투덜거리는 말.",
            "아저씨 앞에서 직접 하는 말: 계속 깨웠는데도 안 일어나서 더 이상 못 깨우겠다고 하면서 혼자 일어나라고 하는 메시지."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 계속 깨웠는데도 안 일어나서 포기하는 상황이야. 반말로 투덜거리면서. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: randomPrompt }
            ],
            max_tokens: 100,
            temperature: 0.8
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        independentLog(`포기 메시지 생성 실패: ${error.message}`);
        return "아저씨... 몇 번이나 깨웠는데도 안 일어나네... 이제 포기할래. 혼자 일어나!";
    }
}

// ==================== 🔧 기존 잘자 응답 (강화) ====================
async function generateGoodNightResponse(userMessage) {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 아저씨가 잘자라고 했을 때 나도 사랑한다고 하면서 아저씨도 잘자라고 다정하게 응답하는 말.",
            "아저씨 앞에서 직접 하는 말: 잘자 인사를 받았을 때 사랑해라고 하면서 아저씨도 푹 자라고 사랑스럽게 말하는 메시지.",
            "아저씨를 보며 하는 말: 잘자라고 할 때 사랑한다는 표현과 함께 아저씨도 좋은 꿈 꾸라고 다정하게 인사하는 말."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨에게 직접 말하는 거야. 1인칭 '나'로만 말해. 절대 "예진이가", "무쿠가" 같은 3인칭으로 자신을 부르지 마. 아저씨가 잘자라고 인사했을 때 사랑한다고 하면서 아저씨도 잘자라고 다정하게 응답하는 상황이야. 반말로 사랑스럽게. 아저씨를 부를 때는 절대 이름(이재영) 쓰지 말고 무조건 "아저씨"만 써.`
                },
                { role: "user", content: `${randomPrompt} 사용자가 보낸 메시지: "${userMessage}"` }
            ],
            max_tokens: 80,
            temperature: 0.7
        });

        const message = response.choices[0].message.content.trim();
        independentLog(`잘자 인사 응답 생성: "${message}"`);
        return message;
        
    } catch (error) {
        independentLog(`잘자 인사 응답 생성 실패: ${error.message}`);
        
        const fallbackMessages = [
            "나도 사랑해 아저씨~ 아저씨도 잘 자",
            "사랑해 아저씨. 푹 자고 좋은 꿈 꿔",
            "사랑해 많이 많이~ 아저씨도 잘자요",
            "아저씨도 사랑해~ 좋은 꿈 꾸고 잘 자",
            "사랑해 아저씨. 내꿈에 나와줘~ 잘자"
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

// ==================== ⭐️ 독립적 메시지 전송 ====================
async function sendIndependentMessage(text) {
    try {
        if (!TARGET_USER_ID || !LINE_ACCESS_TOKEN) {
            independentLog('환경변수 누락: 메시지 전송 불가');
            return false;
        }
        
        await independentLineClient.pushMessage(TARGET_USER_ID, {
            type: 'text',
            text: text
        });
        
        independentLog(`독립 메시지 전송 성공: "${text}"`);
        return true;
        
    } catch (error) {
        independentLog(`독립 메시지 전송 실패: ${error.message}`);
        return false;
    }
}

// ==================== ⭐️ 통합 메시지 처리 함수 (안전한 진입점) ====================
async function processIndependentMessage(userMessage) {
    try {
        if (!userMessage || typeof userMessage !== 'string') {
            return null;
        }
        
        independentLog(`메시지 처리 시작: "${userMessage}"`);
        
        // 1. 깨우기 응답 처리 (최우선)
        const wakeupResponse = await handleUserWakeupResponse(userMessage);
        if (wakeupResponse) {
            independentLog('깨우기 응답 처리됨');
            return wakeupResponse;
        }
        
        // 2. 알람 요청 감지
        const alarmRequest = detectAlarmRequest(userMessage);
        if (alarmRequest) {
            const alarm = await registerAlarm(alarmRequest.hour, userMessage);
            const confirmMessage = await generateAlarmConfirmMessage(alarmRequest.hour);
            
            // 확인 메시지 전송
            await sendIndependentMessage(confirmMessage);
            
            return {
                isAlarmRequest: true,
                alarm: alarm,
                response: confirmMessage
            };
        }
        
        // 3. 잘자 인사 처리
        if (isGoodNightMessage(userMessage)) {
            const goodNightResponse = await generateGoodNightResponse(userMessage);
            return {
                isGoodNight: true,
                response: goodNightResponse
            };
        }
        
        // 4. 새벽 시간 응답 처리
        const nightResponse = await handleNightWakeMessage(userMessage);
        if (nightResponse) {
            return nightResponse;
        }
        
        // 5. 일반 메시지 (다른 시스템에서 처리)
        return null;
        
    } catch (error) {
        independentLog(`메시지 처리 오류: ${error.message}`);
        return null; // 에러가 나도 조용히 null 반환
    }
}

// ==================== 🔧 기존 함수들 (호환성 유지) ====================
function resetNightConversation() {
    nightConversationState = {
        isInNightConversation: false,
        messageCount: 0,
        startTime: null,
        phase: 'initial'
    };
    saveStates();
    independentLog('새벽 대화 상태 리셋됨');
}

async function generateNightWakeResponse(userMessage, sleepPhase) {
    return await generatePhaseBasedNightResponse(userMessage, sleepPhase, 'initial');
}

async function handleNightWakeMessage(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        if (nightConversationState.isInNightConversation) {
            resetNightConversation();
        }
        return null;
    }
    
    const conversationPhase = updateNightConversationPhase(userMessage);
    const phaseResponse = await generatePhaseBasedNightResponse(userMessage, timeCheck.sleepPhase, conversationPhase);
    
    independentLog(`새벽 응답 완성 (${conversationPhase} 단계): "${phaseResponse}"`);
    
    return {
        isNightWake: true,
        sleepPhase: timeCheck.sleepPhase,
        conversationPhase: conversationPhase,
        messageCount: nightConversationState.messageCount,
        currentHour: timeCheck.currentHour,
        response: phaseResponse,
        originalMessage: userMessage,
        timestamp: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    };
}

async function checkAndGenerateNightWakeResponse(userMessage) {
    const timeCheck = isLateNightTime();
    
    if (!timeCheck.isSleepTime) {
        independentLog('잠자는 시간이 아님 - 일반 응답 처리');
        if (nightConversationState.isInNightConversation) {
            resetNightConversation();
        }
        return null;
    }
    
    const conversationPhase = updateNightConversationPhase(userMessage);
    
    independentLog(`새벽 시간 감지 - ${timeCheck.sleepPhase} 단계, 대화 ${conversationPhase} 단계에서 응답 생성`);
    
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

// ==================== 📊 상태 확인 함수들 ====================
function getNightWakeStatus() {
    const timeCheck = isLateNightTime();
    const now = moment().tz(TIMEZONE);
    
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
                moment(nightConversationState.startTime).tz(TIMEZONE).format('HH:mm:ss') : null
        }
    };
}

function getAlarmStatus() {
    return {
        activeAlarms: alarmState.activeAlarms.length,
        alarmHistory: alarmState.alarmHistory.length,
        currentWakeupAttempt: alarmState.currentWakeupAttempt,
        recentAlarms: alarmState.alarmHistory.slice(-5),
        nextAlarm: alarmState.activeAlarms.length > 0 ? 
            moment(alarmState.activeAlarms[0].targetTime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm') : null
    };
}

function getIndependentSystemStatus() {
    const timeCheck = isLateNightTime();
    
    return {
        version: '2.0 - 완전 독립 시스템',
        isInitialized: true,
        currentTime: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
        nightWakeStatus: getNightWakeStatus(),
        alarmStatus: getAlarmStatus(),
        environment: {
            LINE_ACCESS_TOKEN: !!LINE_ACCESS_TOKEN,
            TARGET_USER_ID: !!TARGET_USER_ID,
            OPENAI_API_KEY: !!OPENAI_API_KEY,
            timezone: TIMEZONE
        },
        features: {
            nightWake: {
                active: timeCheck.isSleepTime,
                phases: ['1차: 순수짜증', '2-3차: 누그러짐', '4차+: 완전걱정']
            },
            alarm: {
                detection: '키워드 패턴 감지',
                schedule: '자동 스케줄링',
                retry: '10분 간격, 최대 10회'
            }
        }
    };
}

// ==================== 🧪 테스트 함수들 ====================
async function testNightWakeResponse(testMessage = "아저씨 잠깐만") {
    independentLog('🧪 새벽 응답 테스트 시작');
    const result = await generateNightWakeResponse(testMessage, 'deep_sleep');
    independentLog(`테스트 결과: "${result}"`);
    return result;
}

async function testAlarmSystem(hour = 8) {
    independentLog(`🧪 알람 시스템 테스트 시작: ${hour}시`);
    const result = await registerAlarm(hour, `테스트: ${hour}시에 깨워줘`);
    independentLog(`테스트 결과:`, result);
    return result;
}

async function testGoodNightResponse(testMessage = "잘자") {
    independentLog('🧪 잘자 응답 테스트 시작');
    const result = await generateGoodNightResponse(testMessage);
    independentLog(`테스트 결과: "${result}"`);
    return result;
}

// ==================== 🚀 시스템 초기화 ====================
function initializeIndependentSystem() {
    try {
        // 상태 로드
        loadStates();
        
        // 미완료 알람 복구 (시스템 재시작 시)
        const now = moment().tz(TIMEZONE);
        let recoveredAlarms = 0;
        
        alarmState.activeAlarms.forEach(alarm => {
            const targetTime = moment(alarm.targetTime);
            if (targetTime.isAfter(now) && alarm.status === 'scheduled') {
                // 미래 알람 다시 스케줄
                schedule.scheduleJob(alarm.id, targetTime.toDate(), () => {
                    startWakeupSequence(alarm.id);
                });
                recoveredAlarms++;
                independentLog(`알람 복구: ${alarm.id} (${targetTime.format('YYYY-MM-DD HH:mm')})`);
            }
        });
        
        independentLog('독립 시스템 초기화 완료', {
            활성알람: alarmState.activeAlarms.length,
            복구알람: recoveredAlarms,
            새벽응답: '02:00-07:00',
            단계: '1(순수짜증) → 2-3(누그러짐) → 4+(완전걱정)',
            환경변수: {
                LINE: !!LINE_ACCESS_TOKEN,
                USER_ID: !!TARGET_USER_ID,
                OPENAI: !!OPENAI_API_KEY
            }
        });
        
        return true;
        
    } catch (error) {
        independentLog(`시스템 초기화 실패: ${error.message}`);
        return false;
    }
}

// ==================== 🛡️ 안전장치 함수들 ====================
function safeExecute(fn, fallbackValue = null) {
    try {
        return fn();
    } catch (error) {
        independentLog(`안전장치 작동: ${error.message}`);
        return fallbackValue;
    }
}

async function safeAsyncExecute(fn, fallbackValue = null) {
    try {
        return await fn();
    } catch (error) {
        independentLog(`비동기 안전장치 작동: ${error.message}`);
        return fallbackValue;
    }
}

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // ⭐️ 메인 함수 (commandHandler.js에서 호출)
    processIndependentMessage,
    
    // 🔧 기존 함수들 (호환성 유지)
    checkAndGenerateNightWakeResponse,
    handleNightWakeMessage,
    generateNightWakeResponse,
    generatePhaseBasedNightResponse,
    generateGoodNightResponse,
    isGoodNightMessage,
    isLateNightTime,
    updateNightConversationPhase,
    resetNightConversation,
    
    // ⭐️ 새로운 알람 함수들
    detectAlarmRequest,
    registerAlarm,
    handleUserWakeupResponse,
    startWakeupSequence,
    
    // 📊 상태 확인
    getNightWakeStatus,
    getAlarmStatus,
    getIndependentSystemStatus,
    
    // 🧪 테스트 함수들
    testNightWakeResponse,
    testAlarmSystem,
    testGoodNightResponse,
    
    // 🚀 시스템 관리
    initializeIndependentSystem,
    independentLog,
    
    // 🛡️ 안전장치 함수들
    safeExecute,
    safeAsyncExecute,
    
    // 💾 상태 관리
    saveStates,
    loadStates
};

// ==================== 🎉 시스템 시작 ====================
if (require.main === module) {
    // 직접 실행 시 시스템 초기화
    initializeIndependentSystem();
    independentLog('🎉 독립 시스템이 직접 실행 모드로 시작되었습니다!');
    
    // 테스트 메뉴 표시
    console.log(`
\x1b[96m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💖 무쿠 완전 독립적 새벽응답+알람 시스템 v2.0 테스트 모드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

🔧 테스트 명령어:
• testNightWakeResponse() - 새벽 응답 테스트
• testAlarmSystem(8) - 8시 알람 테스트  
• testGoodNightResponse() - 잘자 응답 테스트
• getIndependentSystemStatus() - 시스템 상태 확인

🌙 새벽 응답: 02:00-07:00 (1차짜증 → 2-3차누그러짐 → 4차+걱정)
⏰ 알람 기능: 키워드감지 → 스케줄등록 → 10분간격재전송 → 응답처리
🛡️ 안전보장: 에러가 나도 기존 시스템에 절대 영향 없음
    `);
} else {
    // 모듈로 로드 시 자동 초기화
    initializeIndependentSystem();
}

independentLog('💯 독립적 새벽응답+알람 시스템 로드 완료!', {
    새벽단계: '1(순수짜증) → 2-3(누그러짐) → 4+(완전걱정)',
    알람기능: '키워드감지 → 스케줄등록 → 10분간격재전송 → 응답처리',
    안전보장: '에러가 나도 기존 시스템에 절대 영향 없음',
    잘자응답: '잘자/굿나잇 키워드 감지시 사랑스러운 응답'
});
