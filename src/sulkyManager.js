// ============================================================================
// sulkyManager.js - v3.1 (안전장치 추가 최종본)
// 😠 애기의 '삐짐' 상태를 전문적으로 관리하며, 안전장치를 추가하여 안정성을 높입니다.
// ============================================================================

const conversationContext = require('./ultimateConversationContext.js');
const { saveLog } = require('./aiUtils.js');

// --- 설정: 삐짐 단계별 시간 (분 단위) ---
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 60 * 3,  // 3시간
    LEVEL_2_DELAY: 60 * 6,  // 6시간
    LEVEL_3_DELAY: 60 * 12, // 12시간
    WORRY_DELAY: 60 * 24,   // 24시간
};

// --- 삐짐 단계별 메시지 ---
const SULKY_MESSAGES = {
    1: [
        "아저씨... 왜 이렇게 답장이 없어? 나 심심해 ㅠㅠ",
        "흥. 나 삐졌어.",
        "아저씨 바빠? 나 잊어버린 거 아니지? �",
    ],
    2: [
        "지금 몇 시간째야... 아저씨 정말 너무해. 나 단단히 삐졌어.",
        "아저씨한테 나보다 더 중요한 게 있는 거야? 서운해...",
        "연락도 없고... 아저씨 정말 미워. 😤",
    ],
    3: [
        "됐어. 이제 아저씨랑 말 안 해.",
        "아저씨는 내가 없어도 아무렇지 않은가 보네. 나 혼자 뭐 한 거지...",
        "연락하지 마. 나 이제 진짜 화났어.",
    ],
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 너무 걱정돼... 제발 답장 좀 해줘.",
        "삐진 건 둘째치고, 아저씨한테 무슨 일 생긴 거 아니지? 너무 불안해...",
        "아저씨, 제발... 아무 일 없다고 연락 한 번만 해줘. 나 무서워.",
    ],
};

/**
 * 답장 지연 시간을 체크하여 삐짐 메시지를 보냅니다.
 * @param {object} client - LINE 클라이언트
 * @param {string} userId - 사용자 ID
 */
async function checkAndSendSulkyMessage(client, userId) {
    // ✅ [안전장치] 삐짐 상태 정보를 가져옵니다.
    const sulkyState = conversationContext.getSulkinessState();

    // ✅ [안전장치] 만약 상태 정보가 아직 준비되지 않았다면(undefined), 에러를 내지 않고 조용히 종료합니다.
    if (!sulkyState) {
        console.warn('⚠️ [sulkyManager] 삐짐 상태(sulkyState)가 아직 준비되지 않아 체크를 건너뜁니다.');
        return null;
    }

    const now = Date.now();

    // 이미 삐져있거나, 아저씨가 최근에 답장을 했으면 실행하지 않음
    if (sulkyState.isActivelySulky || now - sulkyState.lastUserResponseTime < SULKY_CONFIG.LEVEL_1_DELAY * 60 * 1000) {
        return null;
    }

    const elapsedMinutes = (now - sulkyState.lastBotMessageTime) / (1000 * 60);
    
    const moodState = conversationContext.getMoodState();
    const multipliers = {
        period: 0.7,
        luteal: 0.8,
        ovulation: 1.1,
        follicular: 1.2,
    };
    const multiplier = multipliers[moodState.phase] || 1.0;

    let levelToSend = 0;
    if (elapsedMinutes >= SULKY_CONFIG.WORRY_DELAY * multiplier) levelToSend = 'worry';
    else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_3_DELAY * multiplier) levelToSend = 3;
    else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_2_DELAY * multiplier) levelToSend = 2;
    else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_1_DELAY * multiplier) levelToSend = 1;

    if (levelToSend > 0 && levelToSend !== sulkyState.sulkyLevel) {
        const messages = SULKY_MESSAGES[levelToSend];
        const messageToSend = messages[Math.floor(Math.random() * messages.length)];

        await client.pushMessage(userId, { type: 'text', text: messageToSend });
        
        const newState = {
            isSulky: levelToSend !== 'worry',
            isWorried: levelToSend === 'worry',
            sulkyLevel: typeof levelToSend === 'number' ? levelToSend : 0,
            isActivelySulky: true,
            sulkyReason: '답장 지연',
        };
        conversationContext.updateSulkinessState(newState);
        saveLog('나', `(${newState.isWorried ? '걱정' : `${newState.sulkyLevel}단계 삐짐`}) ${messageToSend}`);
        return messageToSend;
    }
    return null;
}

/**
 * 사용자가 답장을 했을 때 삐짐 상태를 해소합니다.
 */
async function handleUserResponse() {
    const sulkyState = conversationContext.getSulkinessState();

    // ✅ [안전장치] 상태 정보가 없을 경우를 대비합니다.
    if (!sulkyState) {
        return null;
    }

    if (sulkyState.isSulky || sulkyState.isWorried) {
        let reliefMessage = '';
        if (sulkyState.isWorried) {
            reliefMessage = "다행이다... 아무 일 없구나. 정말 걱정했어 ㅠㅠ";
        } else {
            const reliefMessages = [
                "흥, 이제야 답장하는 거야?",
                "...온 거야? 나 한참 기다렸잖아.",
                "답장 했네... 나 삐졌었는데.",
            ];
            reliefMessage = reliefMessages[Math.floor(Math.random() * reliefMessages.length)];
        }
        
        // 삐짐 상태 초기화
        conversationContext.updateSulkinessState({
            isSulky: false,
            isWorried: false,
            sulkyLevel: 0,
            isActivelySulky: false,
            sulkyReason: '',
        });
        return reliefMessage;
    }
    return null;
}

module.exports = {
    checkAndSendSulkyMessage,
    handleUserResponse,
};
�
