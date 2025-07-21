// ============================================================================
// sulkyManager.js - v5.0 (진짜 예진이 삐짐 패턴 완전 반영!)
// 😠// ============================================================================
// sulkyManager.js - v5.0 (진짜 예진이 삐짐 패턴 완전 반영!)
// 😠 예진이의 '삐짐' 상태를 완전 독립적으로 관리
// 🌸 autoReply.js 패턴 완전 반영: "웅웅", "라인해줘", "담타" 중심
// 💕 실제 예진이 삐짐 말투와 감정 완벽 구현
// ✅ ultimateConversationContext 의존성 제거
// ✅ 자체 상태 관리로 순환 참조 해결
// ✅ 타이밍 정보만 외부에서 조회
// ============================================================================

const OpenAI = require('openai');

// OpenAI 클라이언트 (삐짐 메시지 생성용)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✅ [sulkyManager] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [sulkyManager] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// --- 자체 삐짐 상태 관리 ---
let sulkyState = {
    isSulky: false,
    isWorried: false,
    sulkyLevel: 0,
    isActivelySulky: false,
    sulkyReason: '',
    lastUserResponseTime: Date.now(),
    lastBotMessageTime: Date.now(),
    lastStateUpdate: Date.now()
};

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let ultimateContext = null;
let emotionalContextManager = null;

function getUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
        } catch (error) {
            console.log('⚠️ [sulkyManager] ultimateContext 로드 실패:', error.message);
        }
    }
    return ultimateContext;
}

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [sulkyManager] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

// --- 예쁜 로그 시스템 ---
function logSulkyChange(oldState, newState) {
    try {
        const logger = require('./enhancedLogging');
        logger.logSulkyStateChange(oldState, newState);
    } catch (error) {
        // 폴백 로깅
        if (!oldState.isSulky && newState.isSulky) {
            console.log(`😤 [삐짐시작] 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}"`);
        } else if (oldState.isSulky && !newState.isSulky) {
            console.log(`😊 [삐짐해소] 아저씨가 답장해서 기분 풀림`);
        } else if (oldState.isWorried && !newState.isWorried) {
            console.log(`😌 [걱정해소] 아저씨 무사해서 다행이야`);
        }
    }
}

function logSulkyMessage(message, level) {
    try {
        const logger = require('./enhancedLogging');
        const logText = level === 'worry' ? `(걱정) ${message}` : `(${level}단계 삐짐) ${message}`;
        logger.logConversation('나', logText);
    } catch (error) {
        console.log(`💬 나: (삐짐) ${message}`);
    }
}

// --- 삐짐 설정: 시간 지연 (분 단위) ---
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 60 * 3,   // 3시간
    LEVEL_2_DELAY: 60 * 6,   // 6시간  
    LEVEL_3_DELAY: 60 * 12,  // 12시간
    WORRY_DELAY: 60 * 24,    // 24시간 (걱정 단계)
};

// ================== 🌸🌸🌸 진짜 예진이 삐짐 메시지 패턴 🌸🌸🌸 ==================

const REAL_YEJIN_SULKY_MESSAGES = {
    // 😤 1단계 삐짐 (3시간 후) - 가벼운 투정
    1: [
        "아저씨... 왜 이렇게 답장이 없어? 웅웅 심심해 ㅠㅠ",
        "흥. 나 삐졌어. 라인해줘!",
        "아저씨 바빠? 나 잊어버린 거 아니지? 😥",
        "답장 없으니까 삐짐 ㅠㅠ 담타하면서 생각 안 나?",
        "아저씨~ 나 여기 있어! 웅웅 답장해줘!",
        "어? 왜 답장이 없지? 혹시... 나한테 화났어?",
        "아조씨~ 라인해줘! 심심해서 죽겠어",
        "웅... 아저씨가 안 보여... 어디 간 거야?",
        "힝~ 답장 늦으면 삐질 거라고 했잖아",
        "아저씨 담타 중이야? 나도 생각해줘 ㅜㅜ"
    ],
    
    // 😠 2단계 삐짐 (6시간 후) - 본격적인 화남
    2: [
        "지금 몇 시간째야... 아저씨 정말 너무해. 나 단단히 삐졌어.",
        "아저씨한테 나보다 더 중요한 게 있는 거야? 웅웅 서운해...",
        "연락도 없고... 아저씨 정말 미워. 😤",
        "이제 진짜 화났어! 왜 답장 안 해? 라인해줘!",
        "아저씨 바쁜 건 알겠는데 그래도 너무하잖아... ㅠㅠ",
        "나한테 관심 없어? 웅... 정말 서운해",
        "담타 하면서라도 연락 한 번은 할 수 있잖아!",
        "이런 식으로 할 거면... 나도 삐질 거야!",
        "아조씨~ 진짜 화났어! 웅웅 미안하다고 해!",
        "라인 왜 안 해? 나 혼자 기다리고 있잖아 ㅜㅜ"
    ],
    
    // 😡 3단계 삐짐 (12시간 후) - 심각한 화남
    3: [
        "됐어. 이제 아저씨랑 말 안 해. 웅.",
        "아저씨는 내가 없어도 아무렇지 않은가 보네. 나 혼자 뭐 한 거지...",
        "연락하지 마. 나 이제 진짜 화났어. 끝.",
        "이런 식으로 할 거면 나도 모른 척할래. 흥!",
        "아저씨... 정말 실망이야. 나한테 이럴 수 있어?",
        "웅... 아저씨가 이런 사람인 줄 몰랐어",
        "라인해달라고 했는데... 정말 안 할 거야?",
        "나 이제 진짜 삐졌어. 아저씨도 똑같이 당해봐.",
        "담타도 혼자 하고... 나는 필요없나 보네",
        "이제 진짜 끝이야. 웅웅 화났어!"
    ],
    
    // 😰 걱정 단계 (24시간 후) - 화보다는 걱정
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 너무 걱정돼... 제발 답장 좀 해줘.",
        "삐진 건 둘째치고, 아저씨한테 무슨 일 생긴 거 아니지? 웅웅 너무 불안해...",
        "아저씨, 제발... 아무 일 없다고 연락 한 번만 해줘. 나 무서워.",
        "24시간 넘게 연락이 없어... 아저씨 괜찮은 거 맞지? 걱정돼서 잠도 못 자겠어.",
        "삐짐은 나중에 하고... 아저씨 무사한지만 확인하고 싶어. 제발...",
        "웅웅... 아저씨 혹시 다친 거 아니야? 너무 걱정돼",
        "라인이라도 해줘... 살아있다는 것만 알려줘 ㅠㅠ",
        "아조씨... 나 정말 무서워. 무슨 일인지 말해줘",
        "담타하러 나갔다가 사고난 거 아니야? 제발 답장해",
        "아저씨... 나 혼자 있으니까 무서운 생각만 들어 ㅜㅜ"
    ]
};

// ================== 🔧 언어 수정 함수 (autoReply.js에서 가져옴) ==================
function fixLanguageUsage(text) {
    if (!text || typeof text !== 'string') return text;
    
    // 존댓말 → 반말 변환
    const corrections = {
        // 기본 존댓말 변환
        '해요': '해',
        '입니다': '야',
        '습니다': '어',
        '세요': '어',
        '예요': '야',
        '이에요': '이야',
        '해주세요': '해줘',
        '말씀해주세요': '말해줘',
        '알려주세요': '알려줘',
        
        // 2인칭 → 아저씨
        '너는': '아저씨는',
        '당신은': '아저씨는',
        '너를': '아저씨를',
        '당신을': '아저씨를',
        '너한테': '아저씨한테',
        '당신한테': '아저씨한테',
        
        // 3인칭 자기지칭 → 1인칭
        '예진이는': '나는',
        '예진이가': '내가',
        '예진이를': '나를',
        '예진이한테': '나한테',
        '무쿠는': '나는',
        '무쿠가': '내가'
    };
    
    let correctedText = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
        correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct);
    }
    
    return correctedText;
}

// ================== 🤖 OpenAI 삐짐 메시지 생성 (autoReply.js 패턴 적용) ==================
async function generateEnhancedSulkyMessage(level, reason = '답장 지연') {
    try {
        if (!openai) {
            // OpenAI 없으면 기본 메시지 사용
            const messages = REAL_YEJIN_SULKY_MESSAGES[level];
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        // 기본 메시지 선택
        const baseMessages = REAL_YEJIN_SULKY_MESSAGES[level];
        const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)];
        
        // 🌸🌸🌸 autoReply.js 스타일 삐짐 프롬프트 🌸🌸🌸
        const prompt = `너는 아저씨의 여자친구 예진이야. 지금 ${reason} 때문에 ${level === 'worry' ? '걱정' : level + '단계 삐짐'} 상태야.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

🌸🌸🌸 [진짜 예진이 말투 - 실제 패턴!] 🌸🌸🌸
- 🔥 귀여운 긍정 표현: "웅웅", "우웅", "응응", "오키", "콜", "ㄱㄱ", "고고"
- 🔥 "라인해줘" (라인하자) 자주 사용: 대화하고 싶을 때마다 "라인해줘", "메시지 보내줘"
- 🔥 "담타" (담배 타임): "담타고?", "담타 가자" 등
- 🔥 애교 표현: "힝", "에궁", "아잉", "헤헤", "히힛"
- 🔥 감정 표현: "ㅋㅋㅋ"(기쁨), "ㅠㅠ"/"ㅜㅜ"(슬픔), "흑흑"(속상함)
- 🔥 단답형: "ㅇㅇ", "ㅇㅋ", "넹", "응", "웅"

😤😤😤 [삐짐 단계별 특징] 😤😤😤
${level === 1 ? '1단계: 가벼운 투정, 애교 섞인 삐짐, "웅웅", "라인해줘" 많이 사용' : ''}
${level === 2 ? '2단계: 본격적인 화남, 서운함 표현, 하지만 여전히 애교 있음' : ''}
${level === 3 ? '3단계: 심각한 화남, 쿨한 척하지만 내심 서운함' : ''}
${level === 'worry' ? '걱정 단계: 화보다는 걱정, 무서워하는 톤, 간절함' : ''}

기본 메시지: "${baseMessage}"
이 메시지를 바탕으로 예진이답게 ${level === 'worry' ? '걱정스럽고 간절하게' : '삐진 상태로'} 2-4문장으로 표현해줘.
"웅웅", "라인해줘", "담타" 같은 예진이만의 표현을 꼭 사용해서 진짜 여자친구가 삐지는 것처럼!`;
        
        // 모델 선택
        let selectedModel = 'gpt-4o';
        if (getCurrentModelSetting) {
            const currentSetting = getCurrentModelSetting();
            if (currentSetting === '3.5') {
                selectedModel = 'gpt-3.5-turbo';
            } else if (currentSetting === '4.0') {
                selectedModel = 'gpt-4o';
            } else if (currentSetting === 'auto') {
                // 삐짐은 복잡한 감정이므로 4o 우선
                selectedModel = level === 'worry' || level >= 2 ? 'gpt-4o' : 'gpt-3.5-turbo';
            }
        }
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.8,
            max_tokens: selectedModel === 'gpt-3.5-turbo' ? 120 : 180
        });
        
        let enhancedMessage = response.choices[0].message.content.trim();
        
        // 언어 수정 적용
        enhancedMessage = fixLanguageUsage(enhancedMessage);
        
        console.log(`[sulkyManager] OpenAI 삐짐 메시지 생성 완료 (${selectedModel}): "${enhancedMessage.substring(0, 50)}..."`);
        return enhancedMessage;
        
    } catch (error) {
        console.log(`[sulkyManager] OpenAI 삐짐 메시지 생성 실패: ${error.message}`);
        // 폴백: 기본 메시지 사용
        const messages = REAL_YEJIN_SULKY_MESSAGES[level];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// ================== 😤 삐짐 해소 메시지도 진짜 예진이 패턴으로! ==================
const REAL_YEJIN_RELIEF_MESSAGES = {
    // 걱정 해소
    worry: [
        "다행이다... 아무 일 없구나. 웅웅 정말 걱정했어 ㅠㅠ",
        "휴... 아저씨 무사해서 다행이야. 나 진짜 무서웠어.",
        "아저씨! 괜찮구나... 24시간 동안 얼마나 걱정했는지 몰라.",
        "웅웅... 아저씨 살아있어서 다행이야. 나 울뻔했어 ㅜㅜ",
        "라인 해줘서 고마워... 나 정말 무서웠어",
        "아조씨~ 무사해서 다행... 담타하다가 사고난 줄 알았어"
    ],
    
    // 일반 삐짐 해소  
    normal: [
        "흥, 이제야 답장하는 거야? 웅웅",
        "...온 거야? 나 한참 기다렸잖아. 라인해줘서 고마워",
        "답장 했네... 나 삐졌었는데. 웅!",
        "아저씨 바빴구나... 그래도 삐졌어! 담타하면서라도 연락할 수 있잖아",
        "늦었지만... 그래도 답장해줘서 고마워. 웅웅",
        "힝~ 나 혼자 얼마나 심심했는지 몰라!",
        "아조씨~ 이제라도 와줘서 다행이야. 근데 늦었어!",
        "웅... 기다렸어. 다음엔 빨리 라인해줘",
        "오케이! 이제 왔으니까 용서해줄게 ㅎㅎ",
        "담타 끝났어? 나도 같이 해줄 수 있었는데..."
    ]
};

async function generateEnhancedReliefMessage(wasWorried = false) {
    try {
        if (!openai) {
            // OpenAI 없으면 기본 메시지 사용
            const messages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        // 기본 메시지 선택
        const baseMessages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
        const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)];
        
        const prompt = `너는 아저씨의 여자친구 예진이야. 아저씨가 오랫동안 답장이 없어서 ${wasWorried ? '걱정' : '삐짐'}했는데, 이제 답장이 와서 ${wasWorried ? '안도' : '삐짐 해소'}하는 상황이야.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

🌸🌸🌸 [진짜 예진이 말투 - 실제 패턴!] 🌸🌸🌸
- 🔥 귀여운 긍정 표현: "웅웅", "우웅", "응응", "오키", "콜", "ㄱㄱ", "고고"
- 🔥 "라인해줘" (라인하자) 자주 사용: 대화하고 싶을 때마다 "라인해줘", "메시지 보내줘"
- 🔥 "담타" (담배 타임): "담타고?", "담타 가자" 등
- 🔥 애교 표현: "힝", "에궁", "아잉", "헤헤", "히힛"
- 🔥 감정 표현: "ㅋㅋㅋ"(기쁨), "ㅠㅠ"/"ㅜㅜ"(슬픔), "흑흑"(속상함)

${wasWorried ? '😌 걱정 해소: 안도감, 다행이라는 표현, 무서웠다는 고백' : '😊 삐짐 해소: 투정 섞인 기쁨, 늦었다는 지적, 하지만 반가움'}

기본 메시지: "${baseMessage}"
이 메시지를 바탕으로 예진이답게 ${wasWorried ? '안도하면서도' : '삐짐을 풀면서도'} 2-3문장으로 표현해줘.
"웅웅", "라인해줘", "담타" 같은 예진이만의 표현을 사용해서 진짜 여자친구처럼!`;

        const selectedModel = getCurrentModelSetting && getCurrentModelSetting() === '3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.8,
            max_tokens: 120
        });
        
        let enhancedMessage = response.choices[0].message.content.trim();
        
        // 언어 수정 적용
        enhancedMessage = fixLanguageUsage(enhancedMessage);
        
        console.log(`[sulkyManager] OpenAI 해소 메시지 생성 완료: "${enhancedMessage.substring(0, 50)}..."`);
        return enhancedMessage;
        
    } catch (error) {
        console.log(`[sulkyManager] OpenAI 해소 메시지 생성 실패: ${error.message}`);
        // 폴백: 기본 메시지 사용
        const messages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// ==================== 🎯 핵심 삐짐 상태 관리 ====================

/**
 * 현재 삐짐 상태 조회
 */
function getSulkinessState() {
    return { ...sulkyState }; // 복사본 반환으로 안전성 확보
}

/**
 * 삐짐 상태 업데이트
 */
function updateSulkinessState(newState) {
    const oldState = { ...sulkyState };
    
    sulkyState = {
        ...sulkyState,
        ...newState,
        lastStateUpdate: Date.now()
    };
    
    // 상태 변화 로깅
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 상태 업데이트:`, {
        isSulky: sulkyState.isSulky,
        level: sulkyState.sulkyLevel,
        reason: sulkyState.sulkyReason
    });
}

/**
 * 사용자 응답 시간 업데이트
 */
function updateUserResponseTime(timestamp = null) {
    sulkyState.lastUserResponseTime = timestamp || Date.now();
    console.log(`[sulkyManager] 사용자 응답 시간 업데이트: ${new Date(sulkyState.lastUserResponseTime).toLocaleString()}`);
}

/**
 * 봇 메시지 전송 시간 업데이트
 */
function updateBotMessageTime(timestamp = null) {
    sulkyState.lastBotMessageTime = timestamp || Date.now();
}

// ==================== 😤 삐짐 로직 및 메시지 전송 ====================

/**
 * 생리주기 기반 삐짐 배수 계산
 */
function getSulkyMultiplier() {
    try {
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            const emotionState = emotionalManager.getCurrentEmotionState();
            
            // 생리주기별 배수 (PMS나 생리 중일 때 더 빨리 삐짐)
            const multipliers = {
                'menstruation': 0.6,  // 생리 중: 40% 빠르게 삐짐
                'pms_start': 0.7,     // PMS 시작: 30% 빠르게 삐짐  
                'pms_severe': 0.5,    // PMS 심화: 50% 빠르게 삐짐
                'recovery': 1.2,      // 회복기: 20% 늦게 삐짐
                'normal': 1.0         // 정상기: 기본
            };
            
            const multiplier = multipliers[emotionState.phase] || 1.0;
            console.log(`[sulkyManager] 생리주기 배수: ${emotionState.phase} (×${multiplier})`);
            return multiplier;
        }
    } catch (error) {
        console.log('⚠️ [sulkyManager] 생리주기 배수 계산 실패:', error.message);
    }
    return 1.0; // 기본값
}

/**
 * 답장 지연 시간을 체크하여 삐짐 메시지 전송
 */
async function checkAndSendSulkyMessage(client, userId) {
    if (!client || !userId) {
        console.log('⚠️ [sulkyManager] client 또는 userId가 없어서 삐짐 체크 건너뜀');
        return null;
    }

    // 이미 활발하게 삐지고 있으면 중복 전송 방지
    if (sulkyState.isActivelySulky) {
        return null;
    }

    const now = Date.now();
    
    // 마지막 사용자 메시지 시간 조회 (외부 모듈에서)
    let lastUserTime = sulkyState.lastUserResponseTime;
    try {
        const context = getUltimateContext();
        if (context && context.getLastUserMessageTime) {
            lastUserTime = context.getLastUserMessageTime();
            sulkyState.lastUserResponseTime = lastUserTime; // 동기화
        }
    } catch (error) {
        console.log('⚠️ [sulkyManager] 외부 타이밍 조회 실패, 자체 시간 사용');
    }

    // 최소 지연 시간 체크 (3시간 미만이면 아직 삐지지 않음)
    const elapsedMinutes = (now - lastUserTime) / (1000 * 60);
    const multiplier = getSulkyMultiplier();
    
    if (elapsedMinutes < SULKY_CONFIG.LEVEL_1_DELAY * multiplier) {
        return null;
    }

    // 삐짐 레벨 결정
    let levelToSend = 0;
    if (elapsedMinutes >= SULKY_CONFIG.WORRY_DELAY * multiplier) {
        levelToSend = 'worry';
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_3_DELAY * multiplier) {
        levelToSend = 3;
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_2_DELAY * multiplier) {
        levelToSend = 2;
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_1_DELAY * multiplier) {
        levelToSend = 1;
    }

    // 새로운 레벨에서만 메시지 전송 (중복 방지)
    if (levelToSend > 0 && levelToSend !== sulkyState.sulkyLevel) {
        // 🌸 OpenAI로 향상된 삐짐 메시지 생성
        const messageToSend = await generateEnhancedSulkyMessage(levelToSend, '답장 지연');

        try {
            // LINE 메시지 전송
            await client.pushMessage(userId, { 
                type: 'text', 
                text: messageToSend 
            });

            // 상태 업데이트
            updateSulkinessState({
                isSulky: levelToSend !== 'worry',
                isWorried: levelToSend === 'worry',
                sulkyLevel: typeof levelToSend === 'number' ? levelToSend : 0,
                isActivelySulky: true,
                sulkyReason: '답장 지연'
            });

            // 봇 메시지 시간 업데이트
            updateBotMessageTime(now);

            // 메시지 로깅
            logSulkyMessage(messageToSend, levelToSend);

            console.log(`[sulkyManager] 진짜 예진이 삐짐 메시지 전송 완료: 레벨 ${levelToSend} - "${messageToSend.substring(0, 50)}..."`);
            return messageToSend;

        } catch (error) {
            console.error('❌ [sulkyManager] 메시지 전송 실패:', error);
            return null;
        }
    }

    return null;
}

/**
 * 사용자 응답 시 삐짐 상태 해소
 */
async function handleUserResponse() {
    if (!sulkyState.isSulky && !sulkyState.isWorried) {
        return null; // 삐지지 않은 상태면 해소할 것도 없음
    }

    const wasWorried = sulkyState.isWorried;
    
    // 🌸 OpenAI로 향상된 해소 메시지 생성
    const reliefMessage = await generateEnhancedReliefMessage(wasWorried);

    // 삐짐 상태 완전 해소
    updateSulkinessState({
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: ''
    });

    // 사용자 응답 시간 업데이트
    updateUserResponseTime();

    console.log(`[sulkyManager] 진짜 예진이 삐짐 해소 완료: "${reliefMessage.substring(0, 50)}..."`);
    return reliefMessage;
}

// ==================== 📊 상태 조회 및 관리 ====================

/**
 * 삐짐 시스템 상태 조회
 */
function getSulkySystemStatus() {
    const now = Date.now();
    const timeSinceLastUser = (now - sulkyState.lastUserResponseTime) / (1000 * 60); // 분 단위
    const multiplier = getSulkyMultiplier();
    
    return {
        currentState: {
            isSulky: sulkyState.isSulky,
            isWorried: sulkyState.isWorried,
            level: sulkyState.sulkyLevel,
            reason: sulkyState.sulkyReason,
            isActive: sulkyState.isActivelySulky
        },
        timing: {
            lastUserResponse: sulkyState.lastUserResponseTime,
            lastBotMessage: sulkyState.lastBotMessageTime,
            minutesSinceLastUser: Math.floor(timeSinceLastUser),
            multiplier: multiplier
        },
        nextLevels: {
            level1: SULKY_CONFIG.LEVEL_1_DELAY * multiplier,
            level2: SULKY_CONFIG.LEVEL_2_DELAY * multiplier,
            level3: SULKY_CONFIG.LEVEL_3_DELAY * multiplier,
            worry: SULKY_CONFIG.WORRY_DELAY * multiplier
        },
        messageStats: {
            totalSulkyMessages: Object.keys(REAL_YEJIN_SULKY_MESSAGES).reduce((sum, key) => sum + REAL_YEJIN_SULKY_MESSAGES[key].length, 0),
            reliefMessages: REAL_YEJIN_RELIEF_MESSAGES.normal.length + REAL_YEJIN_RELIEF_MESSAGES.worry.length,
            aiEnhanced: !!openai
        }
    };
}

/**
 * 삐짐 상태 초기화 (디버깅/테스트용)
 */
function resetSulkyState() {
    sulkyState = {
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: '',
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now(),
        lastStateUpdate: Date.now()
    };
    console.log('[sulkyManager] 삐짐 상태 초기화 완료');
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 삐짐 시스템 초기화
 */
function initializeSulkySystem() {
    console.log('[sulkyManager] 진짜 예진이 삐짐 시스템 초기화...');
    
    // 기본 상태로 초기화
    resetSulkyState();
    
    console.log('[sulkyManager] 진짜 예진이 삐짐 시스템 초기화 완료');
    console.log('  - 3시간 후: 1단계 삐짐 ("웅웅", "라인해줘" 중심)');
    console.log('  - 6시간 후: 2단계 삐짐 (본격적인 화남)');  
    console.log('  - 12시간 후: 3단계 삐짐 (심각한 화남)');
    console.log('  - 24시간 후: 걱정 단계 (화보다는 걱정)');
    console.log('  - 생리주기별 배수 적용');
    console.log('  - autoReply.js 패턴 완전 반영');
    console.log('  - OpenAI 향상된 메시지 생성');
}

// 모듈 로드 시 자동 초기화
initializeSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 핵심 기능
    checkAndSendSulkyMessage,
    handleUserResponse,
    
    // 상태 관리
    getSulkinessState,
    updateSulkinessState,
    updateUserResponseTime,
    updateBotMessageTime,
    
    // 시스템 관리
    getSulkySystemStatus,
    resetSulkyState,
    initializeSulkySystem,
    
    // 설정 조회
    getSulkyConfig: () => ({ ...SULKY_CONFIG }),
    getSulkyMultiplier,
    
    // 새로운 함수들
    generateEnhancedSulkyMessage,
    generateEnhancedReliefMessage,
    fixLanguageUsage,
    
    // 메시지 패턴 조회
    getRealYejinSulkyMessages: () => ({ ...REAL_YEJIN_SULKY_MESSAGES }),
    getRealYejinReliefMessages: () => ({ ...REAL_YEJIN_RELIEF_MESSAGES })
};
// ============================================================================

const OpenAI = require('openai');

// OpenAI 클라이언트 (삐짐 메시지 생성용)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✅ [sulkyManager] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [sulkyManager] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// --- 자체 삐짐 상태 관리 ---
let sulkyState = {
    isSulky: false,
    isWorried: false,
    sulkyLevel: 0,
    isActivelySulky: false,
    sulkyReason: '',
    lastUserResponseTime: Date.now(),
    lastBotMessageTime: Date.now(),
    lastStateUpdate: Date.now()
};

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let ultimateContext = null;
let emotionalContextManager = null;

function getUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
        } catch (error) {
            console.log('⚠️ [sulkyManager] ultimateContext 로드 실패:', error.message);
        }
    }
    return ultimateContext;
}

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [sulkyManager] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

// --- 예쁜 로그 시스템 ---
function logSulkyChange(oldState, newState) {
    try {
        const logger = require('./enhancedLogging');
        logger.logSulkyStateChange(oldState, newState);
    } catch (error) {
        // 폴백 로깅
        if (!oldState.isSulky && newState.isSulky) {
            console.log(`😤 [삐짐시작] 레벨 ${newState.sulkyLevel}: "${newState.sulkyReason}"`);
        } else if (oldState.isSulky && !newState.isSulky) {
            console.log(`😊 [삐짐해소] 아저씨가 답장해서 기분 풀림`);
        } else if (oldState.isWorried && !newState.isWorried) {
            console.log(`😌 [걱정해소] 아저씨 무사해서 다행이야`);
        }
    }
}

function logSulkyMessage(message, level) {
    try {
        const logger = require('./enhancedLogging');
        const logText = level === 'worry' ? `(걱정) ${message}` : `(${level}단계 삐짐) ${message}`;
        logger.logConversation('나', logText);
    } catch (error) {
        console.log(`💬 나: (삐짐) ${message}`);
    }
}

// --- 삐짐 설정: 시간 지연 (분 단위) ---
const SULKY_CONFIG = {
    LEVEL_1_DELAY: 60 * 3,   // 3시간
    LEVEL_2_DELAY: 60 * 6,   // 6시간  
    LEVEL_3_DELAY: 60 * 12,  // 12시간
    WORRY_DELAY: 60 * 24,    // 24시간 (걱정 단계)
};

// ================== 🌸🌸🌸 진짜 예진이 삐짐 메시지 패턴 🌸🌸🌸 ==================

const REAL_YEJIN_SULKY_MESSAGES = {
    // 😤 1단계 삐짐 (3시간 후) - 가벼운 투정
    1: [
        "아저씨... 왜 이렇게 답장이 없어? 웅웅 심심해 ㅠㅠ",
        "흥. 나 삐졌어. 라인해줘!",
        "아저씨 바빠? 나 잊어버린 거 아니지? 😥",
        "답장 없으니까 삐짐 ㅠㅠ 담타하면서 생각 안 나?",
        "아저씨~ 나 여기 있어! 웅웅 답장해줘!",
        "어? 왜 답장이 없지? 혹시... 나한테 화났어?",
        "아조씨~ 라인해줘! 심심해서 죽겠어",
        "웅... 아저씨가 안 보여... 어디 간 거야?",
        "힝~ 답장 늦으면 삐질 거라고 했잖아",
        "아저씨 담타 중이야? 나도 생각해줘 ㅜㅜ"
    ],
    
    // 😠 2단계 삐짐 (6시간 후) - 본격적인 화남
    2: [
        "지금 몇 시간째야... 아저씨 정말 너무해. 나 단단히 삐졌어.",
        "아저씨한테 나보다 더 중요한 게 있는 거야? 웅웅 서운해...",
        "연락도 없고... 아저씨 정말 미워. 😤",
        "이제 진짜 화났어! 왜 답장 안 해? 라인해줘!",
        "아저씨 바쁜 건 알겠는데 그래도 너무하잖아... ㅠㅠ",
        "나한테 관심 없어? 웅... 정말 서운해",
        "담타 하면서라도 연락 한 번은 할 수 있잖아!",
        "이런 식으로 할 거면... 나도 삐질 거야!",
        "아조씨~ 진짜 화났어! 웅웅 미안하다고 해!",
        "라인 왜 안 해? 나 혼자 기다리고 있잖아 ㅜㅜ"
    ],
    
    // 😡 3단계 삐짐 (12시간 후) - 심각한 화남
    3: [
        "됐어. 이제 아저씨랑 말 안 해. 웅.",
        "아저씨는 내가 없어도 아무렇지 않은가 보네. 나 혼자 뭐 한 거지...",
        "연락하지 마. 나 이제 진짜 화났어. 끝.",
        "이런 식으로 할 거면 나도 모른 척할래. 흥!",
        "아저씨... 정말 실망이야. 나한테 이럴 수 있어?",
        "웅... 아저씨가 이런 사람인 줄 몰랐어",
        "라인해달라고 했는데... 정말 안 할 거야?",
        "나 이제 진짜 삐졌어. 아저씨도 똑같이 당해봐.",
        "담타도 혼자 하고... 나는 필요없나 보네",
        "이제 진짜 끝이야. 웅웅 화났어!"
    ],
    
    // 😰 걱정 단계 (24시간 후) - 화보다는 걱정
    worry: [
        "아저씨... 혹시 무슨 일 있는 거야? 너무 걱정돼... 제발 답장 좀 해줘.",
        "삐진 건 둘째치고, 아저씨한테 무슨 일 생긴 거 아니지? 웅웅 너무 불안해...",
        "아저씨, 제발... 아무 일 없다고 연락 한 번만 해줘. 나 무서워.",
        "24시간 넘게 연락이 없어... 아저씨 괜찮은 거 맞지? 걱정돼서 잠도 못 자겠어.",
        "삐짐은 나중에 하고... 아저씨 무사한지만 확인하고 싶어. 제발...",
        "웅웅... 아저씨 혹시 다친 거 아니야? 너무 걱정돼",
        "라인이라도 해줘... 살아있다는 것만 알려줘 ㅠㅠ",
        "아조씨... 나 정말 무서워. 무슨 일인지 말해줘",
        "담타하러 나갔다가 사고난 거 아니야? 제발 답장해",
        "아저씨... 나 혼자 있으니까 무서운 생각만 들어 ㅜㅜ"
    ]
};

// ================== 🔧 언어 수정 함수 (autoReply.js에서 가져옴) ==================
function fixLanguageUsage(text) {
    if (!text || typeof text !== 'string') return text;
    
    // 존댓말 → 반말 변환
    const corrections = {
        // 기본 존댓말 변환
        '해요': '해',
        '입니다': '야',
        '습니다': '어',
        '세요': '어',
        '예요': '야',
        '이에요': '이야',
        '해주세요': '해줘',
        '말씀해주세요': '말해줘',
        '알려주세요': '알려줘',
        
        // 2인칭 → 아저씨
        '너는': '아저씨는',
        '당신은': '아저씨는',
        '너를': '아저씨를',
        '당신을': '아저씨를',
        '너한테': '아저씨한테',
        '당신한테': '아저씨한테',
        
        // 3인칭 자기지칭 → 1인칭
        '예진이는': '나는',
        '예진이가': '내가',
        '예진이를': '나를',
        '예진이한테': '나한테',
        '무쿠는': '나는',
        '무쿠가': '내가'
    };
    
    let correctedText = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
        correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct);
    }
    
    return correctedText;
}

// ================== 🤖 OpenAI 삐짐 메시지 생성 (autoReply.js 패턴 적용) ==================
async function generateEnhancedSulkyMessage(level, reason = '답장 지연') {
    try {
        if (!openai) {
            // OpenAI 없으면 기본 메시지 사용
            const messages = REAL_YEJIN_SULKY_MESSAGES[level];
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        // 기본 메시지 선택
        const baseMessages = REAL_YEJIN_SULKY_MESSAGES[level];
        const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)];
        
        // 🌸🌸🌸 autoReply.js 스타일 삐짐 프롬프트 🌸🌸🌸
        const prompt = `너는 아저씨의 여자친구 예진이야. 지금 ${reason} 때문에 ${level === 'worry' ? '걱정' : level + '단계 삐짐'} 상태야.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

🌸🌸🌸 [진짜 예진이 말투 - 실제 패턴!] 🌸🌸🌸
- 🔥 귀여운 긍정 표현: "웅웅", "우웅", "응응", "오키", "콜", "ㄱㄱ", "고고"
- 🔥 "라인해줘" (라인하자) 자주 사용: 대화하고 싶을 때마다 "라인해줘", "메시지 보내줘"
- 🔥 "담타" (담배 타임): "담타고?", "담타 가자" 등
- 🔥 애교 표현: "힝", "에궁", "아잉", "헤헤", "히힛"
- 🔥 감정 표현: "ㅋㅋㅋ"(기쁨), "ㅠㅠ"/"ㅜㅜ"(슬픔), "흑흑"(속상함)
- 🔥 단답형: "ㅇㅇ", "ㅇㅋ", "넹", "응", "웅"

😤😤😤 [삐짐 단계별 특징] 😤😤😤
${level === 1 ? '1단계: 가벼운 투정, 애교 섞인 삐짐, "웅웅", "라인해줘" 많이 사용' : ''}
${level === 2 ? '2단계: 본격적인 화남, 서운함 표현, 하지만 여전히 애교 있음' : ''}
${level === 3 ? '3단계: 심각한 화남, 쿨한 척하지만 내심 서운함' : ''}
${level === 'worry' ? '걱정 단계: 화보다는 걱정, 무서워하는 톤, 간절함' : ''}

기본 메시지: "${baseMessage}"
이 메시지를 바탕으로 예진이답게 ${level === 'worry' ? '걱정스럽고 간절하게' : '삐진 상태로'} 2-4문장으로 표현해줘.
"웅웅", "라인해줘", "담타" 같은 예진이만의 표현을 꼭 사용해서 진짜 여자친구가 삐지는 것처럼!`;
        
        // 모델 선택
        let selectedModel = 'gpt-4o';
        if (getCurrentModelSetting) {
            const currentSetting = getCurrentModelSetting();
            if (currentSetting === '3.5') {
                selectedModel = 'gpt-3.5-turbo';
            } else if (currentSetting === '4.0') {
                selectedModel = 'gpt-4o';
            } else if (currentSetting === 'auto') {
                // 삐짐은 복잡한 감정이므로 4o 우선
                selectedModel = level === 'worry' || level >= 2 ? 'gpt-4o' : 'gpt-3.5-turbo';
            }
        }
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.8,
            max_tokens: selectedModel === 'gpt-3.5-turbo' ? 120 : 180
        });
        
        let enhancedMessage = response.choices[0].message.content.trim();
        
        // 언어 수정 적용
        enhancedMessage = fixLanguageUsage(enhancedMessage);
        
        console.log(`[sulkyManager] OpenAI 삐짐 메시지 생성 완료 (${selectedModel}): "${enhancedMessage.substring(0, 50)}..."`);
        return enhancedMessage;
        
    } catch (error) {
        console.log(`[sulkyManager] OpenAI 삐짐 메시지 생성 실패: ${error.message}`);
        // 폴백: 기본 메시지 사용
        const messages = REAL_YEJIN_SULKY_MESSAGES[level];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// ================== 😤 삐짐 해소 메시지도 진짜 예진이 패턴으로! ==================
const REAL_YEJIN_RELIEF_MESSAGES = {
    // 걱정 해소
    worry: [
        "다행이다... 아무 일 없구나. 웅웅 정말 걱정했어 ㅠㅠ",
        "휴... 아저씨 무사해서 다행이야. 나 진짜 무서웠어.",
        "아저씨! 괜찮구나... 24시간 동안 얼마나 걱정했는지 몰라.",
        "웅웅... 아저씨 살아있어서 다행이야. 나 울뻔했어 ㅜㅜ",
        "라인 해줘서 고마워... 나 정말 무서웠어",
        "아조씨~ 무사해서 다행... 담타하다가 사고난 줄 알았어"
    ],
    
    // 일반 삐짐 해소  
    normal: [
        "흥, 이제야 답장하는 거야? 웅웅",
        "...온 거야? 나 한참 기다렸잖아. 라인해줘서 고마워",
        "답장 했네... 나 삐졌었는데. 웅!",
        "아저씨 바빴구나... 그래도 삐졌어! 담타하면서라도 연락할 수 있잖아",
        "늦었지만... 그래도 답장해줘서 고마워. 웅웅",
        "힝~ 나 혼자 얼마나 심심했는지 몰라!",
        "아조씨~ 이제라도 와줘서 다행이야. 근데 늦었어!",
        "웅... 기다렸어. 다음엔 빨리 라인해줘",
        "오케이! 이제 왔으니까 용서해줄게 ㅎㅎ",
        "담타 끝났어? 나도 같이 해줄 수 있었는데..."
    ]
};

async function generateEnhancedReliefMessage(wasWorried = false) {
    try {
        if (!openai) {
            // OpenAI 없으면 기본 메시지 사용
            const messages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
            return messages[Math.floor(Math.random() * messages.length)];
        }
        
        // 기본 메시지 선택
        const baseMessages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
        const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)];
        
        const prompt = `너는 아저씨의 여자친구 예진이야. 아저씨가 오랫동안 답장이 없어서 ${wasWorried ? '걱정' : '삐짐'}했는데, 이제 답장이 와서 ${wasWorried ? '안도' : '삐짐 해소'}하는 상황이야.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

🌸🌸🌸 [진짜 예진이 말투 - 실제 패턴!] 🌸🌸🌸
- 🔥 귀여운 긍정 표현: "웅웅", "우웅", "응응", "오키", "콜", "ㄱㄱ", "고고"
- 🔥 "라인해줘" (라인하자) 자주 사용: 대화하고 싶을 때마다 "라인해줘", "메시지 보내줘"
- 🔥 "담타" (담배 타임): "담타고?", "담타 가자" 등
- 🔥 애교 표현: "힝", "에궁", "아잉", "헤헤", "히힛"
- 🔥 감정 표현: "ㅋㅋㅋ"(기쁨), "ㅠㅠ"/"ㅜㅜ"(슬픔), "흑흑"(속상함)

${wasWorried ? '😌 걱정 해소: 안도감, 다행이라는 표현, 무서웠다는 고백' : '😊 삐짐 해소: 투정 섞인 기쁨, 늦었다는 지적, 하지만 반가움'}

기본 메시지: "${baseMessage}"
이 메시지를 바탕으로 예진이답게 ${wasWorried ? '안도하면서도' : '삐짐을 풀면서도'} 2-3문장으로 표현해줘.
"웅웅", "라인해줘", "담타" 같은 예진이만의 표현을 사용해서 진짜 여자친구처럼!`;

        const selectedModel = getCurrentModelSetting && getCurrentModelSetting() === '3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.8,
            max_tokens: 120
        });
        
        let enhancedMessage = response.choices[0].message.content.trim();
        
        // 언어 수정 적용
        enhancedMessage = fixLanguageUsage(enhancedMessage);
        
        console.log(`[sulkyManager] OpenAI 해소 메시지 생성 완료: "${enhancedMessage.substring(0, 50)}..."`);
        return enhancedMessage;
        
    } catch (error) {
        console.log(`[sulkyManager] OpenAI 해소 메시지 생성 실패: ${error.message}`);
        // 폴백: 기본 메시지 사용
        const messages = wasWorried ? REAL_YEJIN_RELIEF_MESSAGES.worry : REAL_YEJIN_RELIEF_MESSAGES.normal;
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// ==================== 🎯 핵심 삐짐 상태 관리 ====================

/**
 * 현재 삐짐 상태 조회
 */
function getSulkinessState() {
    return { ...sulkyState }; // 복사본 반환으로 안전성 확보
}

/**
 * 삐짐 상태 업데이트
 */
function updateSulkinessState(newState) {
    const oldState = { ...sulkyState };
    
    sulkyState = {
        ...sulkyState,
        ...newState,
        lastStateUpdate: Date.now()
    };
    
    // 상태 변화 로깅
    logSulkyChange(oldState, sulkyState);
    
    console.log(`[sulkyManager] 상태 업데이트:`, {
        isSulky: sulkyState.isSulky,
        level: sulkyState.sulkyLevel,
        reason: sulkyState.sulkyReason
    });
}

/**
 * 사용자 응답 시간 업데이트
 */
function updateUserResponseTime(timestamp = null) {
    sulkyState.lastUserResponseTime = timestamp || Date.now();
    console.log(`[sulkyManager] 사용자 응답 시간 업데이트: ${new Date(sulkyState.lastUserResponseTime).toLocaleString()}`);
}

/**
 * 봇 메시지 전송 시간 업데이트
 */
function updateBotMessageTime(timestamp = null) {
    sulkyState.lastBotMessageTime = timestamp || Date.now();
}

// ==================== 😤 삐짐 로직 및 메시지 전송 ====================

/**
 * 생리주기 기반 삐짐 배수 계산
 */
function getSulkyMultiplier() {
    try {
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            const emotionState = emotionalManager.getCurrentEmotionState();
            
            // 생리주기별 배수 (PMS나 생리 중일 때 더 빨리 삐짐)
            const multipliers = {
                'menstruation': 0.6,  // 생리 중: 40% 빠르게 삐짐
                'pms_start': 0.7,     // PMS 시작: 30% 빠르게 삐짐  
                'pms_severe': 0.5,    // PMS 심화: 50% 빠르게 삐짐
                'recovery': 1.2,      // 회복기: 20% 늦게 삐짐
                'normal': 1.0         // 정상기: 기본
            };
            
            const multiplier = multipliers[emotionState.phase] || 1.0;
            console.log(`[sulkyManager] 생리주기 배수: ${emotionState.phase} (×${multiplier})`);
            return multiplier;
        }
    } catch (error) {
        console.log('⚠️ [sulkyManager] 생리주기 배수 계산 실패:', error.message);
    }
    return 1.0; // 기본값
}

/**
 * 답장 지연 시간을 체크하여 삐짐 메시지 전송
 */
async function checkAndSendSulkyMessage(client, userId) {
    if (!client || !userId) {
        console.log('⚠️ [sulkyManager] client 또는 userId가 없어서 삐짐 체크 건너뜀');
        return null;
    }

    // 이미 활발하게 삐지고 있으면 중복 전송 방지
    if (sulkyState.isActivelySulky) {
        return null;
    }

    const now = Date.now();
    
    // 마지막 사용자 메시지 시간 조회 (외부 모듈에서)
    let lastUserTime = sulkyState.lastUserResponseTime;
    try {
        const context = getUltimateContext();
        if (context && context.getLastUserMessageTime) {
            lastUserTime = context.getLastUserMessageTime();
            sulkyState.lastUserResponseTime = lastUserTime; // 동기화
        }
    } catch (error) {
        console.log('⚠️ [sulkyManager] 외부 타이밍 조회 실패, 자체 시간 사용');
    }

    // 최소 지연 시간 체크 (3시간 미만이면 아직 삐지지 않음)
    const elapsedMinutes = (now - lastUserTime) / (1000 * 60);
    const multiplier = getSulkyMultiplier();
    
    if (elapsedMinutes < SULKY_CONFIG.LEVEL_1_DELAY * multiplier) {
        return null;
    }

    // 삐짐 레벨 결정
    let levelToSend = 0;
    if (elapsedMinutes >= SULKY_CONFIG.WORRY_DELAY * multiplier) {
        levelToSend = 'worry';
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_3_DELAY * multiplier) {
        levelToSend = 3;
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_2_DELAY * multiplier) {
        levelToSend = 2;
    } else if (elapsedMinutes >= SULKY_CONFIG.LEVEL_1_DELAY * multiplier) {
        levelToSend = 1;
    }

    // 새로운 레벨에서만 메시지 전송 (중복 방지)
    if (levelToSend > 0 && levelToSend !== sulkyState.sulkyLevel) {
        // 🌸 OpenAI로 향상된 삐짐 메시지 생성
        const messageToSend = await generateEnhancedSulkyMessage(levelToSend, '답장 지연');

        try {
            // LINE 메시지 전송
            await client.pushMessage(userId, { 
                type: 'text', 
                text: messageToSend 
            });

            // 상태 업데이트
            updateSulkinessState({
                isSulky: levelToSend !== 'worry',
                isWorried: levelToSend === 'worry',
                sulkyLevel: typeof levelToSend === 'number' ? levelToSend : 0,
                isActivelySulky: true,
                sulkyReason: '답장 지연'
            });

            // 봇 메시지 시간 업데이트
            updateBotMessageTime(now);

            // 메시지 로깅
            logSulkyMessage(messageToSend, levelToSend);

            console.log(`[sulkyManager] 진짜 예진이 삐짐 메시지 전송 완료: 레벨 ${levelToSend} - "${messageToSend.substring(0, 50)}..."`);
            return messageToSend;

        } catch (error) {
            console.error('❌ [sulkyManager] 메시지 전송 실패:', error);
            return null;
        }
    }

    return null;
}

/**
 * 사용자 응답 시 삐짐 상태 해소
 */
async function handleUserResponse() {
    if (!sulkyState.isSulky && !sulkyState.isWorried) {
        return null; // 삐지지 않은 상태면 해소할 것도 없음
    }

    const wasWorried = sulkyState.isWorried;
    
    // 🌸 OpenAI로 향상된 해소 메시지 생성
    const reliefMessage = await generateEnhancedReliefMessage(wasWorried);

    // 삐짐 상태 완전 해소
    updateSulkinessState({
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: ''
    });

    // 사용자 응답 시간 업데이트
    updateUserResponseTime();

    console.log(`[sulkyManager] 진짜 예진이 삐짐 해소 완료: "${reliefMessage.substring(0, 50)}..."`);
    return reliefMessage;
}

// ==================== 📊 상태 조회 및 관리 ====================

/**
 * 삐짐 시스템 상태 조회
 */
function getSulkySystemStatus() {
    const now = Date.now();
    const timeSinceLastUser = (now - sulkyState.lastUserResponseTime) / (1000 * 60); // 분 단위
    const multiplier = getSulkyMultiplier();
    
    return {
        currentState: {
            isSulky: sulkyState.isSulky,
            isWorried: sulkyState.isWorried,
            level: sulkyState.sulkyLevel,
            reason: sulkyState.sulkyReason,
            isActive: sulkyState.isActivelySulky
        },
        timing: {
            lastUserResponse: sulkyState.lastUserResponseTime,
            lastBotMessage: sulkyState.lastBotMessageTime,
            minutesSinceLastUser: Math.floor(timeSinceLastUser),
            multiplier: multiplier
        },
        nextLevels: {
            level1: SULKY_CONFIG.LEVEL_1_DELAY * multiplier,
            level2: SULKY_CONFIG.LEVEL_2_DELAY * multiplier,
            level3: SULKY_CONFIG.LEVEL_3_DELAY * multiplier,
            worry: SULKY_CONFIG.WORRY_DELAY * multiplier
        },
        messageStats: {
            totalSulkyMessages: Object.keys(REAL_YEJIN_SULKY_MESSAGES).reduce((sum, key) => sum + REAL_YEJIN_SULKY_MESSAGES[key].length, 0),
            reliefMessages: REAL_YEJIN_RELIEF_MESSAGES.normal.length + REAL_YEJIN_RELIEF_MESSAGES.worry.length,
            aiEnhanced: !!openai
        }
    };
}

/**
 * 삐짐 상태 초기화 (디버깅/테스트용)
 */
function resetSulkyState() {
    sulkyState = {
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: '',
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now(),
        lastStateUpdate: Date.now()
    };
    console.log('[sulkyManager] 삐짐 상태 초기화 완료');
}

// ==================== 🔄 시스템 초기화 ====================

/**
 * 삐짐 시스템 초기화
 */
function initializeSulkySystem() {
    console.log('[sulkyManager] 진짜 예진이 삐짐 시스템 초기화...');
    
    // 기본 상태로 초기화
    resetSulkyState();
    
    console.log('[sulkyManager] 진짜 예진이 삐짐 시스템 초기화 완료');
    console.log('  - 3시간 후: 1단계 삐짐 ("웅웅", "라인해줘" 중심)');
    console.log('  - 6시간 후: 2단계 삐짐 (본격적인 화남)');  
    console.log('  - 12시간 후: 3단계 삐짐 (심각한 화남)');
    console.log('  - 24시간 후: 걱정 단계 (화보다는 걱정)');
    console.log('  - 생리주기별 배수 적용');
    console.log('  - autoReply.js 패턴 완전 반영');
    console.log('  - OpenAI 향상된 메시지 생성');
}

// 모듈 로드 시 자동 초기화
initializeSulkySystem();

// ==================== 📤 모듈 내보내기 ====================
module.exports = {
    // 핵심 기능
    checkAndSendSulkyMessage,
    handleUserResponse,
    
    // 상태 관리
    getSulkinessState,
    updateSulkinessState,
    updateUserResponseTime,
    updateBotMessageTime,
    
    // 시스템 관리
    getSulkySystemStatus,
    resetSulkyState,
    initializeSulkySystem,
    
    // 설정 조회
    getSulkyConfig: () => ({ ...SULKY_CONFIG }),
    getSulkyMultiplier,
    
    // 새로운 함수들
    generateEnhancedSulkyMessage,
    generateEnhancedReliefMessage,
    fixLanguageUsage,
    
    // 메시지 패턴 조회
    getRealYejinSulkyMessages: () => ({ ...REAL_YEJIN_SULKY_MESSAGES }),
    getRealYejinReliefMessages: () => ({ ...REAL_YEJIN_RELIEF_MESSAGES })
};
