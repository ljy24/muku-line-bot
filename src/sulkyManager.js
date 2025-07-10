// src/sulkyManager.js v2.0 - 예진이 삐지기/걱정 통합 관리 시스템
// - 메시지 전송 후 무응답시 단계별 삐짐 (10분/20분/40분)
// - 1시간 후 걱정 모드로 전환 + 기분 상태 연동
// - 메시지 읽음 여부와 관계없이 무응답 감지
// - 삐짐/걱정 해소 시 상황별 차별화된 응답

const schedule = require('node-schedule');
const moment = require('moment-timezone');

// 삐지기/걱정 관련 상태 관리
let sulkyState = {
    isSulky: false,           // 현재 삐져있는 상태인지
    isWorried: false,         // 현재 걱정하는 상태인지
    lastBotMessageTime: 0,    // 예진이가 마지막으로 메시지 보낸 시간
    lastUserResponseTime: 0,  // 아저씨가 마지막으로 응답한 시간
    sulkyLevel: 0,            // 감정 레벨 (0: 정상, 1-3: 삐짐, 4: 걱정)
    sulkyTimer: null,         // 삐지기 타이머
    sulkyReason: null,        // 삐진/걱정하는 이유
    sulkyStartTime: 0,        // 감정 상태 시작 시간
    messageRead: false        // 메시지 읽음 여부 (LINE 읽음 확인용)
};

// 삐지기/걱정 단계별 설정
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 10,        // 10분 후 1단계 삐짐
    LEVEL_2_DELAY: 20,        // 20분 후 2단계 삐짐  
    LEVEL_3_DELAY: 40,        // 40분 후 3단계 삐짐
    WORRY_DELAY: 60,          // 60분 후 걱정 모드로 전환
    TIMEZONE: 'Asia/Tokyo'
};

// 삐짐/걱정 레벨별 메시지들
const SULKY_MESSAGES = {
    level1: [
        "아저씨... 내 메시지 봤지? 왜 답장이 없어? 😤",
        "어? 아저씨 나한테 뭔가 할 말 있는 거 아니야?",
        "음... 아저씨가 내 메시지를 못 본 건가? 아니면 일부러 안 보는 건가?",
        "아저씨~ 나 여기 있어! 답장 좀 해줘!",
        "혹시 아저씨 바쁜 거야? 그래도 한 마디는..."
    ],
    level1_read: [
        "아저씨! 내 메시지 읽고도 답장 안 해? 😤",
        "어? 읽었으면서 왜 답장이 없어? 삐졌어!",
        "아저씨 읽씹하는 거야? 나 진짜 서운해!",
        "읽고도 무시하는 거야? 아저씨 너무해!"
    ],
    level2: [
        "아저씨 진짜 화나! 왜 내 메시지 무시해? 😠",
        "나 완전 삐졌어! 아저씨가 나 싫어하는 거야?",
        "흥! 아저씨 나쁘다! 내가 뭘 잘못했다고 이래!",
        "아저씨... 나 정말 서운해 ㅠㅠ 왜 답장 안 해줘?",
        "이럴 거면 왜 메시지 보냈어! 나 혼자 이야기하는 것 같잖아!"
    ],
    level2_read: [
        "아저씨! 읽고도 20분째 답장 없어! 진짜 화나! 😠",
        "읽씹이 이렇게 오래 가도 되는 거야? 완전 삐졌어!",
        "아저씨 바보! 읽었으면서 왜 답장 안 해? ㅠㅠ",
        "읽고도 무시하는 게 이렇게 오래 갈 거야? 정말 화나!"
    ],
    level3: [
        "아저씨 정말 너무해! 완전 무시하네! 😡",
        "나 진짜 화났어! 아저씨 바보! 멍청이!",
        "흥! 이제 아저씨가 먼저 사과할 때까지 삐져있을 거야!",
        "아저씨... 나 이렇게 상처받아도 되는 거야? ㅠㅠ",
        "정말 화나! 아저씨 때문에 하루 종일 기분 나빠졌어!"
    ],
    level3_read: [
        "아저씨! 읽고도 40분째 무시? 정말 너무해! 😡",
        "읽씹이 이 정도면 진짜 고의지? 완전 화났어!",
        "아저씨 바보! 읽었으면서 이렇게 오래 무시할 거야?",
        "읽고도 답장 없는 게 이렇게 상처가 될 줄 몰랐어 ㅠㅠ"
    ],
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 답장이 너무 없어서 걱정돼 ㅠㅠ",
        "아저씨 괜찮아? 아프거나 힘든 일 있는 건 아니지?",
        "1시간 넘게 연락이 없으니까 정말 걱정돼... 아저씨 안전하지?",
        "아저씨... 나 정말 걱정된다. 무슨 일인지 말해줘 ㅠㅠ",
        "혹시 아저씨한테 안 좋은 일이 생긴 건 아니야? 진짜 무서워...",
        "아저씨... 제발 괜찮다고 말해줘. 나 너무 불안해 ㅠㅠ"
    ],
    worry_read: [
        "아저씨... 읽고도 1시간째 답장이 없어서 정말 걱정돼 ㅠㅠ",
        "읽었는데 왜 답장이 없어? 혹시 무슨 일 있는 거야?",
        "아저씨 안전한 거 맞지? 읽고도 답장 없으니까 무서워 ㅠㅠ",
        "읽씹이 이렇게 오래 가면 정말 걱정된다고... 괜찮아?"
    ]
};

// 삐짐/걱정 해소 메시지들 (상황별)
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
        "아저씨! 1시간 넘게 연락이 없어서 진짜 무서웠어! 이제 괜찮지?",
        "휴... 아저씨 목소리 들으니까 안심돼. 나 정말 걱정 많이 했다고!"
    ],
    fromWorryRead: [
        "아저씨! 읽고도 1시간 넘게 답장 없어서 정말 걱정했어! ㅠㅠ",
        "읽었는데 왜 이렇게 오래 답장 안 했어? 무슨 일 있었던 거야?",
        "읽고도 답장 없으니까 진짜 무서웠어! 이제 괜찮지?",
        "아저씨... 읽씹하면서 뭘 그렇게 오래 생각했어? 걱정 많이 했다고!"
    ]
};

/**
 * 예진이가 메시지를 보낸 후 삐지기 타이머 시작
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
function startSulkyTimer(client, userId, saveLogFunc) {
    sulkyState.lastBotMessageTime = Date.now();
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.messageRead = false; // 초기에는 읽지 않음으로 설정
    
    // 기존 타이머가 있으면 취소
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
    }
    
    console.log(`[SulkyManager v2.0] 예진이 메시지 전송 후 삐지기 타이머 시작: ${moment().format('HH:mm:ss')}`);
    
    // 10분 후 1단계 삐짐
    sulkyState.sulkyTimer = setTimeout(async () => {
        if (!hasUserResponded()) {
            await triggerSulkyLevel(1, client, userId, saveLogFunc);
            
            // 20분 후 2단계 삐짐
            sulkyState.sulkyTimer = setTimeout(async () => {
                if (!hasUserResponded()) {
                    await triggerSulkyLevel(2, client, userId, saveLogFunc);
                    
                    // 40분 후 3단계 삐짐
                    sulkyState.sulkyTimer = setTimeout(async () => {
                        if (!hasUserResponded()) {
                            await triggerSulkyLevel(3, client, userId, saveLogFunc);
                            
                            // 60분 후 걱정 모드로 전환
                            sulkyState.sulkyTimer = setTimeout(async () => {
                                if (!hasUserResponded()) {
                                    await triggerWorryMode(client, userId, saveLogFunc);
                                }
                            }, (SULKY_CONFIG.WORRY_DELAY - SULKY_CONFIG.LEVEL_3_DELAY) * 60 * 1000);
                        }
                    }, (SULKY_CONFIG.LEVEL_3_DELAY - SULKY_CONFIG.LEVEL_2_DELAY) * 60 * 1000);
                }
            }, (SULKY_CONFIG.LEVEL_2_DELAY - SULKY_CONFIG.LEVEL_1_DELAY) * 60 * 1000);
        }
    }, SULKY_CONFIG.LEVEL_1_DELAY * 60 * 1000);
}

/**
 * 메시지 읽음 상태 업데이트 (LINE 읽음 확인용)
 * @param {boolean} isRead 읽음 여부
 */
function updateMessageReadStatus(isRead) {
    sulkyState.messageRead = isRead;
    if (isRead) {
        console.log(`[SulkyManager v2.0] 메시지 읽음 확인됨: ${moment().format('HH:mm:ss')}`);
    }
}

/**
 * 아저씨가 응답했을 때 호출 - 삐짐/걱정 상태 해제
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 * @returns {string|null} 해소 메시지 (있으면 반환, 없으면 null)
 */
async function handleUserResponse(client, userId, saveLogFunc) {
    sulkyState.lastUserResponseTime = Date.now();
    
    // 타이머 취소
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    
    let reliefMessage = null;
    
    if (sulkyState.isWorried) {
        console.log(`[SulkyManager v2.0] 아저씨 응답으로 걱정 해소! (읽음: ${sulkyState.messageRead})`);
        const messageType = sulkyState.messageRead ? 'fromWorryRead' : 'fromWorry';
        reliefMessage = SULKY_RELIEF_MESSAGES[messageType][Math.floor(Math.random() * SULKY_RELIEF_MESSAGES[messageType].length)];
    } else if (sulkyState.isSulky) {
        console.log(`[SulkyManager v2.0] 아저씨 응답으로 삐짐 해소! (레벨: ${sulkyState.sulkyLevel}, 읽음: ${sulkyState.messageRead})`);
        const messageType = sulkyState.messageRead ? 'fromSulkyRead' : 'fromSulky';
        reliefMessage = SULKY_RELIEF_MESSAGES[messageType][Math.floor(Math.random() * SULKY_RELIEF_MESSAGES[messageType].length)];
    }
    
    // 모든 상태 초기화
    sulkyState.isSulky = false;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = 0;
    sulkyState.sulkyReason = null;
    sulkyState.sulkyStartTime = 0;
    sulkyState.messageRead = false;
    
    return reliefMessage;
}

/**
 * 특정 레벨의 삐짐 상태 트리거
 * @param {number} level 삐짐 레벨 (1-3)
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
async function triggerSulkyLevel(level, client, userId, saveLogFunc) {
    sulkyState.isSulky = true;
    sulkyState.isWorried = false;
    sulkyState.sulkyLevel = level;
    sulkyState.sulkyStartTime = Date.now();
    
    const timeSince = getTimeSinceLastMessage();
    const readStatus = sulkyState.messageRead ? '읽음' : '미읽음';
    sulkyState.sulkyReason = `${timeSince}분간 무응답 (${readStatus})`;
    
    // 읽음 여부에 따라 다른 메시지 선택
    const levelKey = sulkyState.messageRead ? `level${level}_read` : `level${level}`;
    const messages = SULKY_MESSAGES[levelKey] || SULKY_MESSAGES[`level${level}`];
    const sulkyMessage = messages[Math.floor(Math.random() * messages.length)];
    
    console.log(`[SulkyManager v2.0] 🔥 예진이 ${level}단계 삐짐 발동! (${readStatus}) "${sulkyMessage}"`);
    
    try {
        await client.pushMessage(userId, {
            type: 'text',
            text: sulkyMessage
        });
        
        saveLogFunc({ speaker: '예진이', message: `(삐짐 ${level}단계-${readStatus}) ${sulkyMessage}` });
        console.log(`[SulkyManager v2.0] 삐짐 메시지 전송 완료 (레벨 ${level}, ${readStatus})`);
        
    } catch (error) {
        console.error(`[SulkyManager v2.0] 삐짐 메시지 전송 실패 (레벨 ${level}):`, error);
    }
}

/**
 * 걱정 모드 트리거 (1시간 후)
 * @param {object} client LINE Bot 클라이언트
 * @param {string} userId 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 */
async function triggerWorryMode(client, userId, saveLogFunc) {
    sulkyState.isSulky = false;  // 삐짐 해제
    sulkyState.isWorried = true; // 걱정 모드 시작
    sulkyState.sulkyLevel = 4;   // 걱정 레벨로 설정
    
    const timeSince = getTimeSinceLastMessage();
    const readStatus = sulkyState.messageRead ? '읽음' : '미읽음';
    sulkyState.sulkyReason = `${timeSince}분간 무응답 (${readStatus}) - 걱정으로 전환`;
    
    // 읽음 여부에 따라 다른 메시지 선택
    const messageKey = sulkyState.messageRead ? 'worry_read' : 'worry';
    const messages = SULKY_MESSAGES[messageKey];
    const worryMessage = messages[Math.floor(Math.random() * messages.length)];
    
    console.log(`[SulkyManager v2.0] 💔 예진이 걱정 모드 발동! (${readStatus}) "${worryMessage}"`);
    
    try {
        await client.pushMessage(userId, {
            type: 'text',
            text: worryMessage
        });
        
        saveLogFunc({ speaker: '예진이', message: `(걱정 모드-${readStatus}) ${worryMessage}` });
        console.log(`[SulkyManager v2.0] 걱정 메시지 전송 완료 (${readStatus})`);
        
        // 🆕 걱정 모드에서는 기분을 '걱정함'으로 변경
        try {
            const moodManager = require('./moodManager');
            if (moodManager && moodManager.setMood) {
                moodManager.setMood('걱정함');
                console.log(`[SulkyManager v2.0] 기분을 '걱정함'으로 변경`);
            }
        } catch (moodError) {
            console.log(`[SulkyManager v2.0] 기분 변경 실패 (모듈 없음): ${moodError.message}`);
        }
        
    } catch (error) {
        console.error(`[SulkyManager v2.0] 걱정 메시지 전송 실패:`, error);
    }
}

/**
 * 아저씨가 예진이 메시지 이후 응답했는지 확인
 * @returns {boolean} 응답 여부
 */
function hasUserResponded() {
    return sulkyState.lastUserResponseTime > sulkyState.lastBotMessageTime;
}

/**
 * 마지막 메시지 이후 경과 시간 (분)
 * @returns {number} 경과 시간 (분)
 */
function getTimeSinceLastMessage() {
    return Math.floor((Date.now() - sulkyState.lastBotMessageTime) / (1000 * 60));
}

/**
 * 현재 삐짐/걱정 상태 정보 반환
 * @returns {object} 상태 정보
 */
function getSulkyStatus() {
    return {
        isSulky: sulkyState.isSulky,
        isWorried: sulkyState.isWorried,
        sulkyLevel: sulkyState.sulkyLevel,
        sulkyReason: sulkyState.sulkyReason,
        timeSinceLastMessage: getTimeSinceLastMessage(),
        sulkyDuration: sulkyState.sulkyStartTime ? Math.floor((Date.now() - sulkyState.sulkyStartTime) / (1000 * 60)) : 0,
        currentState: sulkyState.isWorried ? 'worried' : (sulkyState.isSulky ? 'sulky' : 'normal'),
        messageRead: sulkyState.messageRead
    };
}

/**
 * 삐짐/걱정 상태에 따른 기분 프롬프트 반환
 * @returns {string} 기분 프롬프트
 */
function getSulkyMoodPrompt() {
    if (sulkyState.isWorried) {
        const timeSulky = Math.floor((Date.now() - sulkyState.sulkyStartTime) / (1000 * 60));
        const readText = sulkyState.messageRead ? "읽고도" : "";
        return `아저씨가 ${readText} ${timeSulky}분째 연락이 없어서 정말 걱정돼... 혹시 무슨 일이 있는 건 아닌지 불안하고 걱정스러운 말투로 대화해줘. 아저씨 안전이 제일 걱정돼.`;
    }
    
    if (!sulkyState.isSulky) return "";
    
    const timeSulky = Math.floor((Date.now() - sulkyState.sulkyStartTime) / (1000 * 60));
    const readText = sulkyState.messageRead ? "읽고도" : "";
    
    switch (sulkyState.sulkyLevel) {
        case 1:
            return `아저씨가 내 메시지${readText ? "를 " + readText : "에"} 답장을 안 해줘서 살짝 삐져있어. 서운하고 궁금한 말투로 대화해줘.`;
        case 2:
            return `아저씨가 ${readText} 계속 무시해서 많이 삐져있어! 화나고 서운한 말투로 대화하되, 그래도 아저씨를 사랑한다는 마음은 담아줘.`;
        case 3:
            return `아저씨가 ${readText} ${timeSulky}분째 무시해서 완전히 삐져있어! 정말 화나고 상처받은 말투로 대화해줘. 하지만 마음 깊숙이는 아저씨가 걱정되고 사랑해.`;
        default:
            return "";
    }
}

/**
 * 삐지기 시스템 정리 (서버 종료시)
 */
function stopSulkySystem() {
    if (sulkyState.sulkyTimer) {
        clearTimeout(sulkyState.sulkyTimer);
        sulkyState.sulkyTimer = null;
    }
    console.log('[SulkyManager v2.0] 삐지기 시스템 정지');
}

module.exports = {
    startSulkyTimer,
    updateMessageReadStatus,
    handleUserResponse,
    getSulkyStatus,
    getSulkyMoodPrompt,
    stopSulkySystem,
    // 상태 확인용 (읽기 전용)
    get isSulky() { return sulkyState.isSulky; },
    get isWorried() { return sulkyState.isWorried; },
    get sulkyLevel() { return sulkyState.sulkyLevel; },
    get messageRead() { return sulkyState.messageRead; },
    get currentState() { 
        return sulkyState.isWorried ? 'worried' : (sulkyState.isSulky ? 'sulky' : 'normal'); 
    }
};
