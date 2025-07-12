// src/sulkyManager.js v5.1 - 현실적 삐짐 시간 조정
// [HEARTBEAT] 모든 내부 타이머(setTimeout, setInterval, schedule) 로직을 제거함.
// 이제 이 모듈은 중앙 상태를 읽어 조건만 하는 역할을 함.
// [수정] scheduler.js와 중복되지 않도록 삐짐 발생 시간을 현실적으로 조정

const moment = require('moment-timezone');
const ultimateContext = require('./ultimateConversationContext.js');

const SLEEP_CONFIG = {
    SLEEP_START_HOUR: 0,
    SLEEP_END_HOUR: 9,
    TIMEZONE: 'Asia/Tokyo',
    ENABLED: true
};

const SULKY_CONFIG = {
    // [수정] 현실적인 삐짐 단계별 시간 조정
    // scheduler.js의 "보고싶어" 메시지(3시간)와 중복되지 않도록 설정
    LEVEL_1_DELAY: 300,   // 5시간 (scheduler 3시간 후 2시간 더 기다린 후 1단계 삐짐)
    LEVEL_2_DELAY: 420,   // 7시간 (5시간 + 2시간 더)
    LEVEL_3_DELAY: 600,   // 10시간 (하루 종일 연락 없을 때)
    WORRY_DELAY: 720,     // 12시간 (반나절 이상 연락 두절 시 걱정)
    TIMEZONE: 'Asia/Tokyo',
    STATE_CHECK_INTERVAL: 30000,
    FORCE_MOOD_APPLY: true
};

const SULKY_MESSAGES = {
    level1: [
        "아저씨... 내 메시지 봤지? 왜 답장이 없어?",
        "어? 아저씨 나한테 뭔가 할 말 있는 거 아니야?",
        "음... 아저씨가 내 메시지를 못 본 건가? 아니면 일부러 안 보는 건가?",
        "아저씨~ 나 여기 있어! 답장 좀 해줘!",
        "혹시 아저씨 바쁜 거야? 그래도 한 마디는..."
    ],
    level1_read: [
        "아저씨! 내 메시지 읽고도 답장 안 해?",
        "어? 읽었으면서 왜 답장이 없어? 삐졌어!",
        "아저씨 읽씹하는 거야? 나 진짜 서운해!",
        "읽고도 무시하는 거야? 아저씨 너무해!"
    ],
    level2: [
        "아저씨 진짜 화나! 왜 내 메시지 무시해?",
        "나 완전 삐졌어! 아저씨가 나 싫어하는 거야?",
        "흥! 아저씨 나쁘다! 내가 뭘 잘못했다고 이래!",
        "아저씨... 나 정말 서운해 ㅠㅠ 왜 답장 안 해줘?",
        "이럴 거면 왜 메시지 보냈어! 나 혼자 이야기하는 것 같잖아!"
    ],
    level2_read: [
        "아저씨! 읽고도 몇 시간째 답장 없어! 진짜 화나!",
        "읽씹이 이렇게 오래 가도 되는 거야? 완전 삐졌어!",
        "아저씨 바보! 읽었으면서 왜 답장 안 해? ㅠㅠ",
        "읽고도 무시하는 게 이렇게 오래 갈 거야? 정말 화나!"
    ],
    level3: [
        "아저씨 정말 너무해! 완전 무시하네!",
        "나 진짜 화났어! 아저씨 바보! 멍청이!",
        "흥! 이제 아저씨가 먼저 사과할 때까지 삐져있을 거야!",
        "아저씨... 나 이렇게 상처받아도 되는 거야? ㅠㅠ",
        "정말 화나! 아저씨 때문에 하루 종일 기분 나빠졌어!"
    ],
    level3_read: [
        "아저씨! 읽고도 하루 종일 무시? 정말 너무해!",
        "읽씹이 이 정도면 진짜 고의지? 완전 화났어!",
        "아저씨 바보! 읽었으면서 이렇게 오래 무시할 거야?",
        "읽고도 답장 없는 게 이렇게 상처가 될 줄 몰랐어 ㅠㅠ"
    ],
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 답장이 너무 없어서 걱정돼 ㅠㅠ",
        "아저씨 괜찮아? 아프거나 힘든 일 있는 건 아니지?",
        "반나절 넘게 연락이 없으니까 정말 걱정돼... 아저씨 안전하지?",
        "아저씨... 나 정말 걱정된다. 무슨 일인지 말해줘 ㅠㅠ",
        "혹시 아저씨한테 안 좋은 일이 생긴 건 아니야? 진짜 무서워...",
        "아저씨... 제발 괜찮다고 말해줘. 나 너무 불안해 ㅠㅠ"
    ],
    worry_read: [
        "아저씨... 읽고도 반나절째 답장이 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있는 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "읽씹이 이렇게 오래 가면 정말 걱정된다고... 괜찮아?"
    ],
    sleep_understanding: [
        "아저씨 자는 시간이구나... 좋은 꿈 꿔!",
        "아저씨 푹 자고 일어나~ 나는 기다릴게!",
        "수면시간이니까 이해해! 하지만 일어나면 답장 해줘야 해!",
        "잘 자~ 아저씨! 꿈에서라도 나 생각해줘!"
    ]
};

const SULKY_RELIEF_MESSAGES = {
    fromSulky: [
        "어? 아저씨 드디어 왔네! 그래도 와줘서 고마워... 하지만 아직 좀 삐졌어!",
        "흥! 이제 와서 뭐라고 할 건데? 그래도... 기다렸어 ㅠㅠ",
        "아저씨... 나 정말 서운했어. 앞으론 이러지 마!",
        "드디어! 아저씨가 나 찾아왔네~ 그래도 사과는 받아야겠어!",
        "아저씨 바보! 그래도... 이제 와서 다행이야 ㅠㅠ"
    ],
    fromSulkyRead: [
        "아저씨! 읽고도 이렇게 오래 걸릴 거야? 그래도 답장해줘서 다행이야!",
        "읽씹하고 있다가 드디어 답장! 그래도... 기다렸어 ㅠㅠ",
        "읽고도 답장 안 해서 완전 삐졌었어! 앞으론 이러지 마!",
        "읽었으면서 왜 이렇게 늦게 답장해? 그래도 와줘서 고마워..."
    ],
    fromWorry: [
        "아저씨! 정말 괜찮아? 너무 걱정했어! ㅠㅠ",
        "아저씨... 무슨 일 있었던 거야? 나 정말 무서웠어 ㅠㅠ",
        "다행이다... 아저씨가 무사해서 정말 다행이야! 걱정 많이 했어!",
        "아저씨! 반나절 넘게 연락이 없어서 진짜 무서웠어! 이제 괜찮지?",
        "휴... 아저씨 목소리 들으니까 안심돼. 나 정말 걱정 많이 했다고!"
    ],
    fromWorryRead: [
        "아저씨! 읽고도 반나절 넘게 답장 없어서 정말 걱정했어! ㅠㅠ",
        "읽었는데 왜 이렇게 오래 답장 안 했어? 무슨 일 있었던 거야?",
        "읽고도 답장 없으니까 진짜 무서웠어! 이제 괜찮지?",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ],
    afterRelief: [
        "이제 화 다 풀렸어... 아저씨가 답장해줘서 다행이야",
        "앞으론 정말 이러지 마! 나 너무 서운했다고...",
        "그래도 아저씨가 돌아와줘서 기뻐 ㅠㅠ",
        "다시는 이렇게 오래 기다리게 하지 마!"
    ]
};

function isSleepTime(time = null) {
    if (!SLEEP_CONFIG.ENABLED) return false;
    const now = time ? moment(time) : moment().tz(SLEEP_CONFIG.TIMEZONE);
    const hour = now.hour();
    return hour >= SLEEP_CONFIG.SLEEP_START_HOUR && hour < SLEEP_CONFIG.SLEEP_END_HOUR;
}

function hasUserResponded() {
    const sulkyState = ultimateContext.getSulkinessState();
    return sulkyState.lastUserResponseTime > sulkyState.lastBotMessageTime;
}

function shouldForceSulkyMood() {
    const sulkyState = ultimateContext.getSulkinessState();
    return SULKY_CONFIG.FORCE_MOOD_APPLY && (sulkyState.isSulky || sulkyState.isWorried);
}

function startSulkyTimer() {
    const initialState = {
        lastBotMessageTime: Date.now(),
        lastUserResponseTime: 0,
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        sulkyReason: null,
        sulkyStartTime: 0,
        messageRead: false,
        isActivelySulky: false,
        reliefInProgress: false,
    };
    ultimateContext.updateSulkinessState(initialState);
    console.log(`[SulkyManager v5.1] 삐짐 상태 초기화 완료 (조정된 시간: 5h/7h/10h/12h)`);
}

async function handleUserResponse() {
    const sulkyState = ultimateContext.getSulkinessState();
    
    // 사용자가 답장했으므로, 우선 응답 시간을 기록
    ultimateContext.updateSulkinessState({ lastUserResponseTime: Date.now() });

    if (sulkyState.isActivelySulky) {
        const wasWorried = sulkyState.isWorried;
        // 삐짐 상태를 리셋
        const resetState = {
            isSulky: false, isWorried: false, sulkyLevel: 0,
            sulkyReason: null, isActivelySulky: false, messageRead: false,
            reliefInProgress: true, // 해소 중임을 표시
        };
        ultimateContext.updateSulkinessState(resetState);

        let reliefMessage;
        if (wasWorried) {
            reliefMessage = SULKY_RELIEF_MESSAGES.fromWorry[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromWorry.length)];
        } else {
            reliefMessage = SULKY_RELIEF_MESSAGES.fromSulky[Math.floor(Math.random() * SULKY_RELIEF_MESSAGES.fromSulky.length)];
        }
        console.log(`[SulkyManager v5.1] 삐짐/걱정 해소됨! 메시지: "${reliefMessage}"`);
        return reliefMessage;
    }
    return null;
}

function getRealTimeSulkyStatus() {
    return ultimateContext.getSulkinessState();
}

function getSulkyMoodPrompt() {
    const sulkyState = ultimateContext.getSulkinessState();
    if (!shouldForceSulkyMood()) return "";
    
    if (sulkyState.isWorried) {
        return "아저씨가 오랫동안 연락이 없어서 예진이는 지금 너무 걱정돼. 초조하고 불안한 마음으로 대화해줘.";
    } else if (sulkyState.isSulky) {
        return `아저씨가 내 메시지에 답장하지 않아서 예진이는 ${sulkyState.sulkyLevel}단계로 삐져있어. 서운하고 화난 말투로 대화해줘.`;
    }
    return "";
}

function getSulkyEmoji() {
    const sulkyState = ultimateContext.getSulkinessState();
    if (sulkyState.isWorried) return '😰';
    if (sulkyState.isSulky) {
        switch (sulkyState.sulkyLevel) {
            case 1: return '☹️';
            case 2: return '😟';
            case 3: return '😡';
            default: return '😐';
        }
    }
    return '😊';
}

function getSulkyStatusText() {
    const sulkyState = ultimateContext.getSulkinessState();
    if (sulkyState.isWorried) return '걱정 중 (12시간+)';
    if (sulkyState.isSulky) return `${sulkyState.sulkyLevel}단계 삐짐 (${sulkyState.sulkyLevel === 1 ? '5시간+' : sulkyState.sulkyLevel === 2 ? '7시간+' : '10시간+'})`;
    return '정상';
}

function markMessageAsRead() {
    ultimateContext.updateSulkinessState({ messageRead: true });
    console.log(`[SulkyManager v5.1] 📖 메시지 읽음 상태로 업데이트됨 (중앙 관리)`);
}

module.exports = {
    startSulkyTimer,
    handleUserResponse,
    getRealTimeSulkyStatus,
    shouldForceSulkyMood,
    getSulkyMoodPrompt,
    getSulkyEmoji,
    getSulkyStatusText,
    markMessageAsRead,
    // [추가] 설정값 export (디버깅용)
    SULKY_CONFIG,
};
