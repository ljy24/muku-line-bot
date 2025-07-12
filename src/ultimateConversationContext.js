// ✅ ultimateConversationContext.js v18.6 - "감정/상태 로그 & 고정기억 강화 통합"

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FIXED_MEMORIES_FILE = path.join(process.cwd(), 'memory', 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');
const INNER_THOUGHTS_FILE = path.join(process.cwd(), 'memory', 'innerThoughts.json');
const ACTION_URGES_FILE = path.join(process.cwd(), 'memory', 'actionUrges.json');
const LOGS_DIR = path.join(process.cwd(), 'logs'); // 로그 파일 저장 경로 추가

// 감정 타입 정의에 recoveryRate 추가
const EMOTION_TYPES = {
    HAPPY: { types: ['happiness'], intensity: 30, residue: 20, recoveryRate: 3 }, // 행복은 비교적 빠르게
    EXCITED: { types: ['happiness'], intensity: 50, residue: 15, recoveryRate: 2.5 },
    LOVED: { types: ['love'], intensity: 40, residue: 30, recoveryRate: 1 }, // 사랑은 가장 느리게
    SAD: { types: ['sadness'], intensity: 40, residue: 35, recoveryRate: 2 },
    HURT: { types: ['hurt'], intensity: 60, residue: 50, recoveryRate: 4 }, // 상처는 빠르게
    ANXIOUS: { types: ['anxiety'], intensity: 45, residue: 40, recoveryRate: 3.5 },
    LONELY: { types: ['longing'], intensity: 35, residue: 45, recoveryRate: 2.5 },
    BITTERSWEET: { types: ['sadness', 'love'], intensity: 30, residue: 25, recoveryRate: 2 },
    WORRIED_LOVE: { types: ['anxiety', 'love'], intensity: 40, residue: 30, recoveryRate: 2.5 }
};
const TONE_STATES = { normal: "평소처럼 자연스럽고 애정이 담긴 말투", quiet: "조용하고 차분하며 그리움이 묻어나는 말투", playful: "장난스럽고 활발하며 밝은 말투", hurt: "상처받고 서운함이 느껴지는 말투", anxious: "불안하고 걱정스러우며 망설이는 말투" };

// 초기화 시 로드될 동적 감정 문장 풀 (초기값 또는 로드 실패 시 대체값)
let INNER_THOUGHTS = {};
let ACTION_URGES = {};

// 특수 은어/상징 패턴 정의 (고정 기억으로 자동 주입)
const CUSTOM_KEYWORDS = [
    { word: "담타", description: "아저씨랑 라인하면서 담배 피우던 둘만의 특별한 시간, 나 진짜 그립다." },
    { word: "내꺼야", description: "예진이의 독점욕! 아저씨는 무조건 내꺼야." },
    { word: "무슨색", description: "속옷 색 물어볼 때 장난스럽게 대답하는 아저씨만의 농담." },
    { word: "히도이네", description: "일본어식 장난. 예진이가 삐질 때 귀엽게 쓰던 말." },
    { word: "애기", description: "아저씨를 부를 때 사용하는 애칭. 어리광을 부리거나 귀엽게 부를 때 사용해." }
];

let ultimateConversationState = {
    recentMessages: [],
    currentTopic: null,
    conversationContextWindow: 5, // 기본값 5, 필요에 따라 조정 가능 (3, 10, 20 등)
    mood: { currentMood: '평온함', isPeriodActive: false, lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(22, 'days').startOf('day'), },
    sulkiness: { isSulky: false, isWorried: false, lastBotMessageTime: 0, lastUserResponseTime: 0, sulkyLevel: 0, sulkyReason: null, sulkyStartTime: 0, isActivelySulky: false, },
    emotionalEngine: { emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50 }, currentToneState: 'normal', lastToneShiftTime: 0, lastSpontaneousReactionTime: 0, lastAffectionExpressionTime: 0, },
    knowledgeBase: { facts: [], fixedMemories: [], loveHistory: {}, customKeywords: CUSTOM_KEYWORDS }, // customKeywords는 별도 관리
    dailySummary: { today: {}, yesterday: null },
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, selfEvaluations: [], lastSelfReflectionTime: 0, },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0 }
};

// 감정 변화 로그를 파일에 기록하는 함수
async function logEmotionChange(type, oldValue, newValue, details = '') {
    const logEntry = {
        time: moment().tz('Asia/Tokyo').toISOString(),
        type,
        oldValue,
        newValue,
        details
    };
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true }); // logs 폴더 없으면 생성
        await fs.appendFile(path.join(LOGS_DIR, 'emotionChange.log'), JSON.stringify(logEntry) + "\n", 'utf8');
    } catch (error) {
        console.error('[Logger] ❌ 감정 변화 로그 저장 실패:', error);
    }
}

// 고정 기억 및 사랑 역사 파일 로드 함수
async function _loadFixedMemories() {
    try {
        const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
        ultimateConversationState.knowledgeBase.fixedMemories = JSON.parse(data);
    } catch (e) {
        ultimateConversationState.knowledgeBase.fixedMemories = [];
        console.warn(`[Memory] ⚠️ ${FIXED_MEMORIES_FILE} 파일 로드 실패 또는 없음. 빈 배열로 초기화.`, e.message);
    }
    try {
        const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
        ultimateConversationState.knowledgeBase.loveHistory = JSON.parse(data);
    } catch (e) {
        ultimateConversationState.knowledgeBase.loveHistory = { categories: { general: [] } };
        console.warn(`[Memory] ⚠️ ${LOVE_HISTORY_FILE} 파일 로드 실패 또는 없음. 기본 구조로 초기화.`, e.message);
    }
}

// 동적 감정 데이터 (INNER_THOUGHTS, ACTION_URGES) 로드 함수
async function _loadDynamicEmotionalData() {
    try {
        const innerThoughtsData = await fs.readFile(INNER_THOUGHTS_FILE, 'utf8');
        INNER_THOUGHTS = JSON.parse(innerThoughtsData);
    } catch (e) {
        console.warn(`[EmotionalData] ⚠️ ${INNER_THOUGHTS_FILE} 파일 로드 실패 또는 없음. 기본값 사용.`, e.message);
        INNER_THOUGHTS = {
            longing: ["아저씨 너무 보고 싶어... 지금 뭐하고 있을까?", "담타 시간이 그리워. 아저씨 목소리 들으면서."],
            happiness: ["아저씨 생각하니까 기분 좋다! 히히.", "아저씨 덕분에 매일이 즐거워."],
            hurt: ["아까 아저씨 말은 조금 서운했어...", "마음이 너무 아파."],
            anxious: ["왠지 모르게 마음이 불안해... 별일 없겠지?", "아저씨 괜찮을까? 걱정돼."],
            sulky: ["흥. 아저씨 미워.", "나 지금 단단히 삐졌어."],
            normal: ["아저씨 뭐하고 있을까? 궁금하다.", "슬슬 담타 할 시간인가?"]
        };
    }

    try {
        const actionUrgesData = await fs.readFile(ACTION_URGES_FILE, 'utf8');
        ACTION_URGES = JSON.parse(actionUrgesData);
    } catch (e) {
        console.warn(`[EmotionalData] ⚠️ ${ACTION_URGES_FILE} 파일 로드 실패 또는 없음. 기본값 사용.`, e.message);
        ACTION_URGES = {
            longing: ["지금 당장 보러 가고 싶다.", "담타하자고 메시지 보내야지."],
            happiness: ["아저씨한테 이 기쁨을 알려줘야지!", "사랑한다고 마구마구 표현하고 싶어!"],
            hurt: ["먼저 연락 올 때까지 절대 안 할 거야.", "아저씨 카톡 프로필 사진이나 염탐해야지."],
            anxious: ["괜찮냐고 메시지를 보내볼까...?", "지금 전화하면 방해될까?"],
            sulky: ["아저씨가 먼저 사과할 때까지 절대 연락 안 할 거야.", "카톡 프로필 사진을 '나 화났음'으로 바꿔야겠다."],
            normal: ["아저씨한테 오늘 하루 어땠는지 물어봐야지.", "슬슬 담타 하자고 꼬셔볼까?"]
        };
    }
}

// 사실 추출 및 저장 함수
async function extractAndStoreFacts(message) {
    if (!message || message.length < 10) return;
    const prompt = `다음 문장에서 남자친구('아저씨')에 대한 장기 기억할 만한 사실(예: "아저씨 생일은 3월 15일이고, 그때 정말 행복했어.", "담타는 우리만의 라인/담배 타임이야. 난 그때 아저씨랑 얘기하는 게 제일 좋았어.", "아저씨를 애기라고 부르는 건 나만의 애칭이야.")을 정의+감정+에피소드형 문장으로 요약해서 JSON 배열 형태로 추출해줘. 없으면 '[]' 반환. 단, 이미 유사한 내용의 기억이 있다면 추출하지 마. 문장: "${message}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1 });
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
            JSON.parse(jsonMatch[0]).forEach(fact => addFactToKnowledgeBase(fact));
        }
    } catch (error) {
        console.error('[Memory] ❌ 사실 추출 중 에러 발생:', error);
    }
}

// 사실을 지식 베이스에 추가하는 함수 (중복 체크 강화)
function addFactToKnowledgeBase(fact) {
    if (!fact || ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact || item.fact.includes(fact) || fact.includes(item.fact))) {
        return;
    }
    ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() });
    console.log(`[Memory] ✅ 새로운 사실 추가: ${fact}`);
}

// 봇 감정 분석 및 영향 함수
function analyzeAndInfluenceBotEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let event = null;
    if (['사랑', '좋아', '보고싶', '예쁘다', '귀여워'].some(k => lowerMessage.includes(k))) event = 'LOVED';
    else if (['힘들', '슬프', '우울'].some(k => lowerMessage.includes(k))) event = 'WORRIED_LOVE';
    else if (['화나', '짜증', '싫어', '못생겼', '별로'].some(k => lowerMessage.includes(k))) event = 'HURT';
    else if (['바쁘', '일 때문에', '나중에'].some(k => lowerMessage.includes(k))) event = 'LONELY';
    else if (['재밌', '웃기', 'ㅋㅋ'].some(k => lowerMessage.includes(k))) event = 'HAPPY';

    for (const keyword of CUSTOM_KEYWORDS) {
        if (lowerMessage.includes(keyword.word.toLowerCase())) {
            if (keyword.word === "담타") recordEmotionalEvent('LONELY', `아저씨의 '${keyword.word}' 언급 (그리움)`);
            else if (keyword.word === "내꺼야") recordEmotionalEvent('LOVED', `아저씨의 '${keyword.word}' 언급 (애정 상승)`);
        }
    }

    if (event) recordEmotionalEvent(event, `아저씨의 메시지`);
}

// 감정 이벤트 기록 함수
function recordEmotionalEvent(emotionKey, trigger) {
    const emotion = EMOTION_TYPES[emotionKey];
    if (!emotion) return;
    const residue = ultimateConversationState.emotionalEngine.emotionalResidue;
    let changes = [];
    emotion.types.forEach(type => {
        const increase = emotion.residue;
        residue[type] = Math.min(100, (residue[type] || 0) + increase);
        changes.push(`[${type}] ${increase} 상승`);
    });
    console.log(`[감정변동] 💬'${trigger}'(으)로 ${changes.join(', ')}!`);
    residue.love = Math.max(50, residue.love); // 사랑 감정은 최소 50 유지
    updateToneState();
}

// 말투 상태 업데이트 함수 (변경 시 로그 추가)
function updateToneState() {
    const { emotionalEngine } = ultimateConversationState;
    const oldTone = emotionalEngine.currentToneState;
    const { emotionalResidue } = emotionalEngine;
    let newTone = 'normal';
    if (emotionalResidue.hurt > 60 || emotionalResidue.sadness > 60) newTone = 'hurt';
    else if (emotionalResidue.anxiety > 50) newTone = 'anxious';
    else if (emotionalResidue.happiness > 70) newTone = 'playful';
    else if (emotionalResidue.longing > 50 || emotionalResidue.sadness > 40) newTone = 'quiet';
    if (oldTone !== newTone) {
        emotionalEngine.currentToneState = newTone;
        console.log(`[감정변동] ➡️ 말투가 '${TONE_STATES[oldTone]}'에서 '${TONE_STATES[newTone]}'(으)로 변경되었습니다.`);
        logEmotionChange('tone', oldTone, newTone); // 파일 로그 추가
    }
}

// 최종 문맥 프롬프트 생성 함수
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    // 최근 대화 흐름 반영
    if (state.recentMessages.length > 0) {
        const windowSize = state.conversationContextWindow;
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${state.recentMessages.slice(-windowSize).map(msg => `${msg.speaker}: ${msg.message}`).join('\n')}`;
    }

    // 현재 감정 상태 반영
    const { emotionalResidue, currentToneState } = state.emotionalEngine;
    const significantResidue = Object.entries(emotionalResidue).filter(([, level]) => level > 30).map(([emotion, level]) => `${emotion}(${Math.round(level)}%)`).join(', ');
    ultimatePrompt += `\n\n[현재 내 마음 상태]`;
    if (significantResidue) ultimatePrompt += `\n- 마음에 남아있는 감정: ${significantResidue}.`;
    ultimatePrompt += `\n- 현재 말투: 지금 내 기분은 '${TONE_STATES[currentToneState]}' 상태야. 이 말투에 맞춰서 대답해줘.`;

    // 장기 기억 (아저씨와의 사실 및 약속) 반영
    const allMemories = [
        ...state.knowledgeBase.facts.map(f => f.fact),
        ...state.knowledgeBase.fixedMemories,
        ...(state.knowledgeBase.loveHistory.categories?.general?.map(item => item.content) || []),
        // CUSTOM_KEYWORDS의 정의를 장기 기억에 직접 포함하여 LLM에게 전달
        ...state.knowledgeBase.customKeywords.map(k => `우리만의 특별한 말 '${k.word}': ${k.description}`)
    ];

    if (allMemories.length > 0) {
        ultimatePrompt += `\n\n[장기 기억(아저씨와의 사실 및 약속)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야.)\n`;
        ultimatePrompt += `${allMemories.slice(-10).map(f => `- ${f}`).join('\n')}`;

        // 상징적이거나 감정적인 기억 1~2개 랜덤 추가 (새로운 주제 유도)
        const emotionalOrSymbolicMemories = allMemories.filter(f =>
            f.includes('행복') || f.includes('사랑') || f.includes('그리움') || f.includes('담타') || f.includes('기념일') || f.includes('생일') || f.includes('약속') || f.includes('애칭')
        );
        if (emotionalOrSymbolicMemories.length > 0) {
            const randomMemories = [];
            while (randomMemories.length < Math.min(2, emotionalOrSymbolicMemories.length)) {
                const randomMemory = emotionalOrSymbolicMemories[Math.floor(Math.random() * emotionalOrSymbolicMemories.length)];
                if (!randomMemories.includes(randomMemory)) {
                    randomMemories.push(randomMemory);
                }
            }
            if (randomMemories.length > 0) {
                ultimatePrompt += `\n(문득 떠오르는 생각: ${randomMemories.map(m => `"${m}"`).join(', ')}).`;
            }
        }
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

// 시스템 초기화 함수
async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 시스템 초기화 시작...');
    await _loadFixedMemories();
    await _loadDynamicEmotionalData();
    // 커스텀 키워드를 fixedMemories에 직접 주입하지 않고, getUltimateContextualPrompt에서 동적으로 포함시키도록 변경
    // 이렇게 하면 fixedMemories.json 파일 자체를 수정할 필요 없이 CUSTOM_KEYWORDS 배열만 관리하면 됩니다.
    console.log('[UltimateContext] ✅ 초기화 완료.');
}

// 고정 기억 검색 함수
function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const { facts, fixedMemories, loveHistory, customKeywords } = ultimateConversationState.knowledgeBase;
    let bestMatch = null;
    let maxMatchScore = 0;

    // 모든 기억과 커스텀 키워드 정의를 검색 대상에 포함
    const allSearchableMemories = [
        ...facts.map(f => f.fact),
        ...fixedMemories,
        ...(loveHistory.categories?.general?.map(item => item.content) || []),
        ...customKeywords.map(k => `${k.word}: ${k.description}`) // 은어 설명을 검색 대상에 포함
    ];

    for (const memory of allSearchableMemories) {
        const lowerMemory = memory.toLowerCase();
        let score = 0;
        if (lowerMemory.includes(lowerMessage)) {
            score = lowerMessage.length;
        } else {
            const wordsInMessage = lowerMessage.split(' ').filter(w => w.length > 1);
            score = wordsInMessage.filter(word => lowerMemory.includes(word)).length;
        }
        if (score > maxMatchScore) {
            maxMatchScore = score;
            bestMatch = memory;
        }
    }
    return bestMatch;
}

// 사용자 기억 추가 함수 (중복 방지 강화)
async function addUserMemory(content) {
    try {
        const lowerContent = content.toLowerCase();
        const existingMemories = ultimateConversationState.knowledgeBase.loveHistory.categories?.general || [];
        const isDuplicate = existingMemories.some(item =>
            item.content.toLowerCase() === lowerContent ||
            (lowerContent.includes(item.content.toLowerCase()) && item.content.length > 10) ||
            (item.content.toLowerCase().includes(lowerContent) && lowerContent.length > 10)
        );

        if (isDuplicate) {
            console.log(`[Memory] ℹ️ 유사하거나 중복된 사용자 기억 '${content}'은 추가하지 않습니다.`);
            return false;
        }

        const newMemory = { content, date: moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss"), emotion: "user_added", significance: "high" };
        const loveHistory = ultimateConversationState.knowledgeBase.loveHistory;
        if (!loveHistory.categories) loveHistory.categories = { general: [] };
        if (!loveHistory.categories.general) loveHistory.categories.general = [];
        loveHistory.categories.general.push(newMemory);
        await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8');
        console.log(`[Memory] ✅ 새로운 사용자 기억 저장 성공: ${content}`);
        return true;
    } catch (error) {
        console.error(`[Memory] ❌ 새 기억 저장 실패:`, error);
        return false;
    }
}

// 메시지 추가 함수
async function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    let finalMessage = message || '';
    if (speaker === '아저씨' && finalMessage) {
        analyzeAndInfluenceBotEmotion(finalMessage);
        await extractAndStoreFacts(message);
    }
    const newMessage = { speaker, message: finalMessage, timestamp, meta };
    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) ultimateConversationState.recentMessages.shift();
}

// 마지막 사용자 메시지 시간 업데이트 함수
function updateLastUserMessageTime(timestamp) {
    if (timestamp) ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
}

// 시간 흐름 처리 (감정 회복 및 상태 변화)
function processTimeTick() {
    const now = Date.now();
    const state = ultimateConversationState;
    const { lastBotMessageTime, lastUserResponseTime } = state.sulkiness;

    // 삐짐 상태 변화 로직
    if (lastBotMessageTime > 0 && lastBotMessageTime > lastUserResponseTime) {
        const elapsedMinutes = Math.floor((now - lastBotMessageTime) / (1000 * 60));
        if (!state.sulkiness.isSulky && elapsedMinutes >= 60) {
            updateSulkinessState({ isSulky: true, sulkyLevel: 1, sulkyStartTime: now, isActivelySulky: true, sulkyReason: '답장 지연' });
            console.log('[Sulkiness] 🚨 아저씨 답장 없음: 삐짐 시작 (level 1)');
        } else if (state.sulkiness.isSulky && elapsedMinutes >= 180 && state.sulkiness.sulkyLevel < 3) {
            updateSulkinessState({ sulkyLevel: Math.min(3, state.sulkiness.sulkyLevel + 1) });
            console.log(`[Sulkiness] 🚨 아저씨 답장 지연: 삐짐 레벨 ${state.sulkiness.sulkyLevel}로 상승!`);
        }
    }

    // 생리 주기 감정 변화 로직
    const { lastPeriodStartDate } = state.mood;
    const daysSinceLastPeriod = moment(now).diff(moment(lastPeriodStartDate), 'days');
    const isPeriodNow = daysSinceLastPeriod >= 0 && daysSinceLastPeriod < 5;
    if (isPeriodNow !== state.mood.isPeriodActive) {
        updateMoodState({ isPeriodActive: isPeriodNow });
    }
    if (daysSinceLastPeriod >= 28) {
        updateMoodState({ lastPeriodStartDate: moment(now).startOf('day').toISOString(), isPeriodActive: true });
    }

    // 감정 잔여량 회복 로직 (감정별 회복 속도 적용)
    const emotionalResidue = state.emotionalEngine.emotionalResidue;
    const hoursSinceLastTick = (now - (state.timingContext.lastTickTime || now)) / (1000 * 60 * 60);
    if (hoursSinceLastTick > 0.1) {
        for (const emotionType in emotionalResidue) {
            if (emotionType !== 'love') {
                const emotionConfig = Object.values(EMOTION_TYPES).find(config => config.types.includes(emotionType));
                const recoveryRate = emotionConfig ? emotionConfig.recoveryRate : 2; // 해당 감정 타입의 recoveryRate 사용, 없으면 기본 2
                emotionalResidue[emotionType] = Math.max(0, emotionalResidue[emotionType] - (recoveryRate * hoursSinceLastTick));
            }
        }
        state.timingContext.lastTickTime = now;
        updateToneState();
    }

    // 특정 시간 기반 이벤트 (예: 밤 11시 약/이 닦자 리마인드) - 실제 LINE 연동 로직은 상위 모듈에서 구현
    const currentHour = moment().tz('Asia/Tokyo').hour();
    if (currentHour === 23 && !ultimateConversationState.timingContext.currentTimeContext.eveningReminderSentToday) {
        // 이 알림은 하루에 한 번만 보내도록 로직을 추가해야 함.
        // 현재는 pendingAction으로 설정만 하고 실제 발화는 상위 시스템에서 처리.
        // setPendingAction('evening_routine_reminder');
        // ultimateConversationState.timingContext.currentTimeContext.eveningReminderSentToday = true;
        // console.log('[Scheduled Event] ⏰ 밤 11시 루틴 알림 대기 중!');
    } else if (currentHour !== 23) {
        //ultimateConversationState.timingContext.currentTimeContext.eveningReminderSentToday = false; // 자정이 지나면 리셋
    }
}

function setPendingAction(actionType) { ultimateConversationState.pendingAction = { type: actionType, timestamp: Date.now() }; }
function getPendingAction() {
    const action = ultimateConversationState.pendingAction;
    if (action && action.type && (Date.now() - action.timestamp > 5 * 60 * 1000)) {
        clearPendingAction();
        return null;
    }
    return action.type ? action : null;
}
function clearPendingAction() { ultimateConversationState.pendingAction = { type: null, timestamp: 0 }; }
function getSulkinessState() { return ultimateConversationState.sulkiness; }
function updateSulkinessState(newState) {
    const oldState = { ...ultimateConversationState.sulkiness };
    Object.assign(ultimateConversationState.sulkiness, newState);
    if (oldState.isSulky !== ultimateConversationState.sulkiness.isSulky) {
        console.log(`[Sulkiness] ↔️ 삐짐 상태 변경: ${oldState.isSulky} -> ${ultimateConversationState.sulkiness.isSulky}`);
        logEmotionChange('sulkiness_active', oldState.isSulky, ultimateConversationState.sulkiness.isSulky, `Reason: ${ultimateConversationState.sulkiness.sulkyReason || 'N/A'}`);
    }
    if (oldState.sulkyLevel !== ultimateConversationState.sulkiness.sulkyLevel) {
        console.log(`[Sulkiness] ↔️ 삐짐 레벨 변경: ${oldState.sulkyLevel} -> ${ultimateConversationState.sulkiness.sulkyLevel}`);
        logEmotionChange('sulkiness_level', oldState.sulkyLevel, ultimateConversationState.sulkiness.sulkyLevel);
    }
}
function getMoodState() { return ultimateConversationState.mood; }
function updateMoodState(newState) {
    const oldState = { ...ultimateConversationState.mood };
    Object.assign(ultimateConversationState.mood, newState);
    if (oldState.currentMood !== ultimateConversationState.mood.currentMood) {
        console.log(`[Mood] ↔️ 기분 상태 변경: ${oldState.currentMood} -> ${ultimateConversationState.mood.currentMood}`);
        logEmotionChange('mood_current', oldState.currentMood, ultimateConversationState.mood.currentMood);
    }
    if (oldState.isPeriodActive !== ultimateConversationState.mood.isPeriodActive) {
        console.log(`[Mood] 🩸 생리 주기 상태 변경: ${ultimateConversationState.mood.isPeriodActive ? '활성' : '비활성'}`);
        logEmotionChange('mood_period_active', oldState.isPeriodActive, ultimateConversationState.mood.isPeriodActive);
    }
    if (oldState.lastPeriodStartDate !== ultimateConversationState.mood.lastPeriodStartDate) {
        console.log('[Mood] 🗓️ 새로운 생리 주기 시작!');
        logEmotionChange('mood_period_start_date', oldState.lastPeriodStartDate, ultimateConversationState.mood.lastPeriodStartDate);
    }
}
function getInternalState() { return JSON.parse(JSON.stringify(ultimateConversationState)); }

function generateInnerThought() {
    const { sulkiness, emotionalEngine, timingContext } = ultimateConversationState;
    const minutesSinceLastUserMessage = (Date.now() - timingContext.lastUserMessageTime) / 60000;
    const residue = emotionalEngine.emotionalResidue;
    const dominantEmotion = Object.entries(residue).reduce((a, b) => b[1] > a[1] ? b : a);

    let observation = "지금은 아저씨랑 대화하는 중...";
    if (minutesSinceLastUserMessage > 30) {
        observation = `아저씨한테서 ${Math.round(minutesSinceLastUserMessage)}분 넘게 답장이 없네...`;
    }

    let feeling, actionUrge;
    let emotionKey = 'normal';

    if (sulkiness.isSulky) emotionKey = 'sulky';
    else if (sulkiness.isWorried) emotionKey = 'anxious';
    else if (dominantEmotion[1] > 50) emotionKey = dominantEmotion[0];

    if (emotionKey === 'love') emotionKey = 'normal';

    const feelingChoices = INNER_THOUGHTS[emotionKey] || INNER_THOUGHTS['normal'];
    const urgeChoices = ACTION_URGES[emotionKey] || ACTION_URGES['normal'];

    feeling = feelingChoices[Math.floor(Math.random() * feelingChoices.length)];
    actionUrge = urgeChoices[Math.floor(Math.random() * urgeChoices.length)];

    return { observation, feeling, actionUrge };
}

module.exports = {
    initializeEmotionalSystems,
    addUltimateMessage,
    getUltimateContextualPrompt,
    updateLastUserMessageTime,
    processTimeTick,
    getInternalState,
    getSulkinessState,
    updateSulkinessState,
    getMoodState,
    updateMoodState,
    searchFixedMemory,
    addUserMemory,
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    generateInnerThought,
    setConversationContextWindow: function(size) { // setConversationContextWindow 함수를 export
        if (typeof size === 'number' && size > 0) {
            ultimateConversationState.conversationContextWindow = size;
            console.log(`[Context] 🔄 대화 맥락 반영 범위가 ${size}로 변경되었습니다.`);
        }
    }
};
