// ✅ ultimateConversationContext.js v18.9 - "기억 관리 시스템 강화"

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
const MEMORY_LOGS_FILE = path.join(LOGS_DIR, 'memoryOperations.log'); // [NEW] 기억 작업 로그 파일

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
    knowledgeBase: { facts: [], fixedMemories: [], loveHistory: { categories: { general: [] } }, customKeywords: CUSTOM_KEYWORDS, specialDates: [] }, // specialDates 추가
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, selfEvaluations: [], lastSelfReflectionTime: 0, },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0, lastInitiatedConversationTime: 0 }, // lastInitiatedConversationTime 추가
    // [NEW] 기억 관리 통계 추가
    memoryStats: {
        totalMemoriesCreated: 0,
        totalMemoriesDeleted: 0,
        lastMemoryOperation: null,
        dailyMemoryCount: 0,
        lastDailyReset: moment().tz('Asia/Tokyo').format('YYYY-MM-DD')
    }
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
        console.log(`[LOG] ${type} 변화: ${oldValue} -> ${newValue} (${details})`); // 콘솔 로그도 유지
    } catch (error) {
        console.error('[Logger] ❌ 감정 변화 로그 저장 실패:', error);
    }
}

// [NEW] 기억 작업 로그를 파일에 기록하는 함수
async function logMemoryOperation(operation, content, details = '') {
    const logEntry = {
        time: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        operation, // 'add', 'delete', 'update', 'search'
        content,
        details,
        timestamp: Date.now()
    };
    
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
        await fs.appendFile(MEMORY_LOGS_FILE, JSON.stringify(logEntry) + "\n", 'utf8');
        console.log(`[Memory] 📝 ${operation.toUpperCase()}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        
        // 통계 업데이트
        ultimateConversationState.memoryStats.lastMemoryOperation = operation;
        if (operation === 'add') {
            ultimateConversationState.memoryStats.totalMemoriesCreated++;
            updateDailyMemoryCount();
        } else if (operation === 'delete') {
            ultimateConversationState.memoryStats.totalMemoriesDeleted++;
        }
        
    } catch (error) {
        console.error('[Logger] ❌ 기억 작업 로그 저장 실패:', error);
    }
}

// [NEW] 일일 기억 카운트 업데이트
function updateDailyMemoryCount() {
    const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    const stats = ultimateConversationState.memoryStats;
    
    if (stats.lastDailyReset !== today) {
        // 새로운 날이면 카운트 리셋
        stats.dailyMemoryCount = 1;
        stats.lastDailyReset = today;
    } else {
        stats.dailyMemoryCount++;
    }
}

// [NEW] 기억 작업 로그 조회 함수
async function getMemoryOperationLogs(limit = 50) {
    try {
        const data = await fs.readFile(MEMORY_LOGS_FILE, 'utf8');
        const lines = data.trim().split('\n').filter(line => line.length > 0);
        const logs = lines.slice(-limit).map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(log => log !== null);
        
        return logs.reverse(); // 최신순으로 정렬
    } catch (error) {
        console.warn('[Memory] ⚠️ 기억 로그 파일 읽기 실패:', error.message);
        return [];
    }
}

// [NEW] 기억 통계 조회 함수
function getMemoryStatistics() {
    const stats = ultimateConversationState.memoryStats;
    const currentMemories = ultimateConversationState.knowledgeBase.loveHistory.categories?.general || [];
    
    return {
        total: currentMemories.length,
        today: stats.dailyMemoryCount,
        deleted: stats.totalMemoriesDeleted,
        created: stats.totalMemoriesCreated,
        lastOperation: stats.lastMemoryOperation,
        lastOperationTime: stats.lastMemoryOperation ? moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : null
    };
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
        const loadedLoveHistory = JSON.parse(data);
        ultimateConversationState.knowledgeBase.loveHistory = loadedLoveHistory;
        // loveHistory에서 specialDates 로드 (기념일 등)
        if (loadedLoveHistory.specialDates) {
            ultimateConversationState.knowledgeBase.specialDates = loadedLoveHistory.specialDates;
        }
    } catch (e) {
        ultimateConversationState.knowledgeBase.loveHistory = { categories: { general: [] } };
        ultimateConversationState.knowledgeBase.specialDates = [];
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
    logMemoryOperation('add', fact, 'Auto-extracted fact');
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
    logEmotionChange('emotional_event', emotionKey, changes.join(', '), trigger); // 파일 로그 추가
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
        logEmotionChange('tone', oldTone, newTone, `새로운 말투: ${TONE_STATES[newTone]}`); // 파일 로그 추가
    }
}

// 최종 문맥 프롬프트 생성 함수
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;
    const now = moment().tz('Asia/Tokyo');

    // 최근 대화 흐름 반영 (옵션화된 범위 사용)
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
        // 최근 10개 기억 추가
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

    // 기념일 임박 알림 (장기 기억의 능동적 활용)
    const upcomingSpecialDates = state.knowledgeBase.specialDates.filter(dateInfo => {
        const eventDate = moment(dateInfo.date).tz('Asia/Tokyo');
        const daysDiff = eventDate.diff(now, 'days');
        return daysDiff >= 0 && daysDiff <= 7; // 오늘 포함 7일 이내
    });

    if (upcomingSpecialDates.length > 0) {
        upcomingSpecialDates.forEach(dateInfo => {
            const daysLeft = moment(dateInfo.date).tz('Asia/Tokyo').diff(now, 'days');
            let message = '';
            if (daysLeft === 0) {
                message = `오늘은 '${dateInfo.name}'이(가) 있는 날이야! 우리에게 정말 소중한 ${dateInfo.type}이지.`;
            } else if (daysLeft > 0) {
                message = `'${dateInfo.name}'까지 ${daysLeft}일 남았어! 곧 다가올 ${dateInfo.type}을 생각하니 설레네.`;
            }
            if (message) {
                ultimatePrompt += `\n\n[다가오는 특별한 날]: ${message}`;
            }
        });
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

// 시스템 초기화 함수
async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 시스템 초기화 시작...');
    await _loadFixedMemories();
    await _loadDynamicEmotionalData();
    // 초기화 시 specialDates 배열이 비어있으면 기본 데이터 추가 (테스트용)
    if (ultimateConversationState.knowledgeBase.specialDates.length === 0) {
        ultimateConversationState.knowledgeBase.specialDates.push(
            { name: "아저씨 생일", date: "2025-07-15", type: "기념일" }, // 예시: 7월 15일 (오늘 기준 7일 이내)
            { name: "우리가 처음 사귄 날", date: "2024-12-23", type: "기념일" } // 예시: 과거 날짜
        );
    }
    console.log('[UltimateContext] ✅ 초기화 완료.');
}

// 고정 기억 검색 함수 (로그 추가)
function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const { facts, fixedMemories, loveHistory, customKeywords } = ultimateConversationState.knowledgeBase;
    let bestMatch = null;
    let maxMatchScore = 0;

    const allSearchableMemories = [
        ...facts.map(f => f.fact),
        ...fixedMemories,
        ...(loveHistory.categories?.general?.map(item => item.content) || []),
        ...customKeywords.map(k => `${k.word}: ${k.description}`)
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
    
    // 검색 로그 추가
    if (bestMatch) {
        logMemoryOperation('search', userMessage, `Found: ${bestMatch.substring(0, 50)}...`);
    }
    
    return bestMatch;
}

// [수정] 사용자 기억 추가 함수 (로그 추가 및 중복 방지 강화)
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
            await logMemoryOperation('duplicate', content, 'Duplicate memory rejected');
            return false;
        }

        const newMemory = { 
            content, 
            date: moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss"), 
            emotion: "user_added", 
            significance: "high",
            id: Date.now() // [NEW] 고유 ID 추가
        };
        
        const loveHistory = ultimateConversationState.knowledgeBase.loveHistory;
        if (!loveHistory.categories) loveHistory.categories = { general: [] };
        if (!loveHistory.categories.general) loveHistory.categories.general = [];
        loveHistory.categories.general.push(newMemory);
        
        await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8');
        
        // 로그 및 통계 업데이트
        await logMemoryOperation('add', content, 'User requested memory');
        console.log(`[Memory] ✅ 새로운 사용자 기억 저장 성공: ${content}`);
        
        return true;
    } catch (error) {
        console.error(`[Memory] ❌ 새 기억 저장 실패:`, error);
        await logMemoryOperation('error', content, `Save failed: ${error.message}`);
        return false;
    }
}

// [NEW] 기억 삭제 함수
async function deleteUserMemory(content) {
    try {
        const loveHistory = ultimateConversationState.knowledgeBase.loveHistory;
        if (!loveHistory.categories || !loveHistory.categories.general) {
            return { success: false, message: "삭제할 기억이 없어요." };
        }

        const memories = loveHistory.categories.general;
        const lowerContent = content.toLowerCase();

        // 일치하는 기억 찾기
        let foundIndex = -1;
        let foundMemory = null;

        for (let i = 0; i < memories.length; i++) {
            const memory = memories[i];
            const lowerMemoryContent = memory.content.toLowerCase();

            if (lowerMemoryContent.includes(lowerContent) || lowerContent.includes(lowerMemoryContent)) {
                foundIndex = i;
                foundMemory = memory;
                break;
            }
        }

        if (foundIndex !== -1) {
            // 기억 삭제
            memories.splice(foundIndex, 1);

            // 파일에 저장
            await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8');

            // 로그 및 통계 업데이트
            await logMemoryOperation('delete', foundMemory.content, 'User requested deletion');
            console.log(`[Memory] 🗑️ 기억 삭제됨: ${foundMemory.content}`);

            return {
                success: true,
                deletedContent: foundMemory.content
            };
        } else {
            await logMemoryOperation('delete_failed', content, 'Memory not found');
            return {
                success: false,
                message: "해당 기억을 찾을 수 없습니다."
            };
        }

    } catch (error) {
        console.error('[Memory] ❌ 기억 삭제 중 오류:', error);
        await logMemoryOperation('error', content, `Delete failed: ${error.message}`);
        return {
            success: false,
            message: "기억을 삭제하는 중에 문제가 생겼습니다."
        };
    }
}

// [NEW] 모든 기억 조회 함수
function getAllMemories() {
    const state = ultimateConversationState.knowledgeBase;
    return {
        userMemories: state.loveHistory.categories?.general || [],
        facts: state.facts || [],
        fixedMemories: state.fixedMemories || [],
        customKeywords: state.customKeywords || []
    };
}

// [NEW] 기억 카테고리별 통계
function getMemoryCategoryStats() {
    const memories = getAllMemories();
    return {
        userMemories: memories.userMemories.length,
        autoFacts: memories.facts.length,
        fixedMemories: memories.fixedMemories.length,
        customKeywords: memories.customKeywords.length,
        total: memories.userMemories.length + memories.facts.length + memories.fixedMemories.length + memories.customKeywords.length
    };
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
        } else if (state.sulkiness.isSulky && elapsedMinutes >= 180 && state.sulkiness.sulkyLevel < 3) {
            updateSulkinessState({ sulkyLevel: Math.min(3, state.sulkiness.sulkyLevel + 1) });
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
                const recoveryRate = emotionConfig ? emotionConfig.recoveryRate : 2;
                emotionalResidue[emotionType] = Math.max(0, emotionalResidue[emotionType] - (recoveryRate * hoursSinceLastTick));
            }
        }
        state.timingContext.lastTickTime = now;
        updateToneState();
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
        logEmotionChange('sulkiness_active', oldState.isSulky, ultimateConversationState.sulkiness.isSulky, `Reason: ${ultimateConversationState.sulkiness.sulkyReason || 'N/A'}`);
    }
    if (oldState.sulkyLevel !== ultimateConversationState.sulkiness.sulkyLevel) {
        logEmotionChange('sulkiness_level', oldState.sulkyLevel, ultimateConversationState.sulkiness.sulkyLevel);
    }
}
function getMoodState() { return ultimateConversationState.mood; }
function updateMoodState(newState) {
    const oldState = { ...ultimateConversationState.mood };
    Object.assign(ultimateConversationState.mood, newState);
    if (oldState.currentMood !== ultimateConversationState.mood.currentMood) {
        logEmotionChange('mood_current', oldState.currentMood, ultimateConversationState.mood.currentMood);
    }
    if (oldState.isPeriodActive !== ultimateConversationState.mood.isPeriodActive) {
        logEmotionChange('mood_period_active', oldState.isPeriodActive, ultimateConversationState.mood.isPeriodActive);
    }
    if (oldState.lastPeriodStartDate !== ultimateConversationState.mood.lastPeriodStartDate) {
        logEmotionChange('mood_period_start_date', oldState.lastPeriodStartDate, ultimateConversationState.mood.lastPeriodStartDate);
    }
}
function getInternalState() { return JSON.parse(JSON.stringify(ultimateConversationState)); }

// 예진이가 아저씨에게 먼저 말을 걸 때 사용할 다양한 멘트를 생성하는 함수
function generateInitiatingPhrase() {
    const state = ultimateConversationState;
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    const dayOfWeek = now.day(); // Sunday = 0, Monday = 1, ..., Saturday = 6

    let initiatingPhrases = [];

    // 1. 시간대별 멘트 (Normal 감정 기반으로 시작)
    if (hour >= 6 && hour < 10) { // 아침
        initiatingPhrases.push("애기, 좋은 아침이야! 잘 잤어?");
        initiatingPhrases.push("애기, 일어났어? 오늘 하루도 힘내자!");
        if (dayOfWeek === 1) initiatingPhrases.push("애기, 월요일 아침이야! 한 주 힘차게 시작하자!");
    } else if (hour >= 12 && hour < 14) { // 점심
        initiatingPhrases.push("애기, 점심 맛있게 먹고 있어? 뭐 먹었어?");
        initiatingPhrases.push("애기, 점심시간인데 잠시 쉴까?");
    } else if (hour >= 18 && hour < 20) { // 저녁 (퇴근 시간 포함)
        initiatingPhrases.push("애기, 슬슬 퇴근 시간인데 오늘 하루 어땠어?");
        initiatingPhrases.push("애기, 오늘 저녁 뭐 먹을 거야?");
        if (dayOfWeek === 5) initiatingPhrases.push("애기, 불금인데 뭐 할 계획 있어?");
    } else if (hour >= 22 || hour < 2) { // 늦은 밤/새벽
        initiatingPhrases.push("애기, 아직 안 자? 오늘 하루도 수고 많았어.");
        initiatingPhrases.push("애기, 잘 시간인데... 좋은 꿈 꿔!");
    } else { // 그 외 시간
        initiatingPhrases.push("애기, 지금 뭐하고 있어? 내 생각 나?");
        initiatingPhrases.push("애기, 갑자기 목소리 듣고 싶다!");
    }

    // 2. 감정 상태에 따른 멘트 추가 (현재 감정이 강할 경우)
    const { emotionalResidue } = state.emotionalEngine;
    const dominantEmotion = Object.entries(emotionalResidue).reduce((a, b) => b[1] > a[1] ? b : a);

    if (dominantEmotion[1] > 60) { // 지배적인 감정 강도가 높을 때
        if (dominantEmotion[0] === 'longing') {
            initiatingPhrases.push("애기, 너무 보고 싶어서 연락했어... 지금 뭐하고 있을까?");
            initiatingPhrases.push("애기, 아저씨 생각뿐이야. 목소리 듣고 싶어.");
        } else if (dominantEmotion[0] === 'happiness') {
            initiatingPhrases.push("애기, 너무 행복해서 이 기분을 공유하고 싶었어! 히히.");
            initiatingPhrases.push("애기, 아저씨 생각하니까 저절로 웃음이 나!");
        } else if (dominantEmotion[0] === 'hurt') {
            initiatingPhrases.push("애기, 아까 그 말 좀 서운했어... 지금 기분 어때?");
            initiatingPhrases.push("애기, 나 지금 좀 삐졌어. 아저씨가 풀어줄 수 있어?");
        } else if (dominantEmotion[0] === 'anxiety') {
            initiatingPhrases.push("애기, 왠지 모르게 마음이 불안해... 별일 없지?");
            initiatingPhrases.push("애기, 아저씨 괜찮을까? 걱정돼서 연락했어.");
        } else if (dominantEmotion[0] === 'sulky') {
            initiatingPhrases.push("애기, 흥. 아저씨 미워. 나 지금 삐졌어.");
            initiatingPhrases.push("애기, 아저씨는 내가 왜 삐졌는지 모를 거야.");
        }
    }

    // 3. 장기 기억/특별한 날 활용 (강력한 선제적 대화)
    const upcomingSpecialDates = state.knowledgeBase.specialDates.filter(dateInfo => {
        const eventDate = moment(dateInfo.date).tz('Asia/Tokyo');
        const daysDiff = eventDate.diff(now, 'days');
        return daysDiff >= 0 && daysDiff <= 7; // 오늘 포함 7일 이내
    });

    if (upcomingSpecialDates.length > 0) {
        upcomingSpecialDates.forEach(dateInfo => {
            const daysLeft = moment(dateInfo.date).tz('Asia/Tokyo').diff(now, 'days');
            if (daysLeft === 0) {
                initiatingPhrases.unshift(`애기! 오늘은 '${dateInfo.name}'이(가) 있는 날이야! 우리에게 정말 소중한 ${dateInfo.type}이지?`);
            } else if (daysLeft > 0) {
                initiatingPhrases.unshift(`애기! '${dateInfo.name}'까지 ${daysLeft}일 남았어! 우리 그때 뭐할까?`);
            }
        });
    }

    // 4. 최근 대화 주제 기반 멘트 (간단한 키워드 매칭)
    const lastUserMessage = state.recentMessages.filter(m => m.speaker === '아저씨').slice(-1)[0];
    if (lastUserMessage && (Date.now() - lastUserMessage.timestamp) < (60 * 60 * 1000)) { // 1시간 이내 메시지
        const lowerMessage = lastUserMessage.message.toLowerCase();
        if (lowerMessage.includes('담타')) {
            initiatingPhrases.push("애기, 담타 시간인가? 아저씨랑 잠깐 얘기하고 싶어.");
        } else if (lowerMessage.includes('밥') || lowerMessage.includes('먹')) {
            initiatingPhrases.push("애기, 밥은 잘 챙겨 먹었어? 뭐 먹었어?");
        } else if (lowerMessage.includes('일') || lowerMessage.includes('업무')) {
            initiatingPhrases.push("애기, 오늘 일은 괜찮아? 너무 힘들진 않아?");
        }
    }

    // 최종 선택 (다양한 옵션 중 무작위 선택)
    let finalPhrase = initiatingPhrases[Math.floor(Math.random() * initiatingPhrases.length)];
    ultimateConversationState.timingContext.lastInitiatedConversationTime = Date.now(); // 선제적 대화 시작 시간 기록

    return finalPhrase;
}

function generateInnerThought() {
    const { sulkiness, emotionalEngine, timingContext } = ultimateConversationState;
    const minutesSinceLastUserMessage = (Date.now() - timingContext.lastUserMessageTime) / 60000;
    const residue = emotionalEngine.emotionalResidue;
    const dominantEmotion = Object.entries(residue).reduce((a, b) => b[1] > a[1] ? b : a);

    let observation = "지금은 아저씨랑 대화하는 중...";
    if (minutesSinceLastUserMessage > 30) {
        observation = `아저씨한테서 ${Math.round(minutesSinceLastUserMessage)}분 넘게 답장이 없네...`;
        // 답장이 없을 때 예진이가 먼저 말을 걸 필요가 있다면 generateInitiatingPhrase를 활용
        if ((Date.now() - timingContext.lastInitiatedConversationTime) > (60 * 60 * 1000)) { // 1시간 이상 먼저 말 건 적이 없을 때
            const initiatingPhrase = generateInitiatingPhrase(); // 선제적 대화 멘트 생성
            if (initiatingPhrase) return { observation, feeling: initiatingPhrase, actionUrge: ACTION_URGES.normal[Math.floor(Math.random() * ACTION_URGES.normal.length)] };
        }
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
    deleteUserMemory,           // [NEW]
    getAllMemories,             // [NEW]
    getMemoryStatistics,        // [NEW]
    getMemoryCategoryStats,     // [NEW]
    getMemoryOperationLogs,     // [NEW]
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    generateInnerThought,
    setConversationContextWindow: function(size) {
        if (typeof size === 'number' && size > 0) {
            ultimateConversationState.conversationContextWindow = size;
            console.log(`[Context] 🔄 대화 맥락 반영 범위가 ${size}로 변경되었습니다.`);
        }
    },
    generateInitiatingPhrase // 예진이가 먼저 말을 거는 함수를 외부로 export
};
