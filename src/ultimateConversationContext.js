// ✅ ultimateConversationContext.js v19.0 - "yejin_memory.json 전용 기억 시스템"

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FIXED_MEMORIES_FILE = path.join(process.cwd(), 'memory', 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');
const YEJIN_MEMORY_FILE = path.join(process.cwd(), 'memory', 'yejin_memory.json'); // [NEW] 예진이 전용 기억 파일
const INNER_THOUGHTS_FILE = path.join(process.cwd(), 'memory', 'innerThoughts.json');
const ACTION_URGES_FILE = path.join(process.cwd(), 'memory', 'actionUrges.json');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const MEMORY_LOGS_FILE = path.join(LOGS_DIR, 'memoryOperations.log');

// 감정 타입 정의에 recoveryRate 추가
const EMOTION_TYPES = {
    HAPPY: { types: ['happiness'], intensity: 30, residue: 20, recoveryRate: 3 },
    EXCITED: { types: ['happiness'], intensity: 50, residue: 15, recoveryRate: 2.5 },
    LOVED: { types: ['love'], intensity: 40, residue: 30, recoveryRate: 1 },
    SAD: { types: ['sadness'], intensity: 40, residue: 35, recoveryRate: 2 },
    HURT: { types: ['hurt'], intensity: 60, residue: 50, recoveryRate: 4 },
    ANXIOUS: { types: ['anxiety'], intensity: 45, residue: 40, recoveryRate: 3.5 },
    LONELY: { types: ['longing'], intensity: 35, residue: 45, recoveryRate: 2.5 },
    BITTERSWEET: { types: ['sadness', 'love'], intensity: 30, residue: 25, recoveryRate: 2 },
    WORRIED_LOVE: { types: ['anxiety', 'love'], intensity: 40, residue: 30, recoveryRate: 2.5 }
};

const TONE_STATES = { 
    normal: "평소처럼 자연스럽고 애정이 담긴 말투", 
    quiet: "조용하고 차분하며 그리움이 묻어나는 말투", 
    playful: "장난스럽고 활발하며 밝은 말투", 
    hurt: "상처받고 서운함이 느껴지는 말투", 
    anxious: "불안하고 걱정스러우며 망설이는 말투" 
};

// 초기화 시 로드될 동적 감정 문장 풀
let INNER_THOUGHTS = {};
let ACTION_URGES = {};

// 특수 은어/상징 패턴 정의
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
    conversationContextWindow: 5,
    mood: { 
        currentMood: '평온함', 
        isPeriodActive: false, 
        lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(22, 'days').startOf('day'), 
    },
    sulkiness: { 
        isSulky: false, 
        isWorried: false, 
        lastBotMessageTime: 0, 
        lastUserResponseTime: 0, 
        sulkyLevel: 0, 
        sulkyReason: null, 
        sulkyStartTime: 0, 
        isActivelySulky: false, 
    },
    emotionalEngine: { 
        emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50 }, 
        currentToneState: 'normal', 
        lastToneShiftTime: 0, 
        lastSpontaneousReactionTime: 0, 
        lastAffectionExpressionTime: 0, 
    },
    knowledgeBase: { 
        facts: [], 
        fixedMemories: [], 
        loveHistory: { categories: { general: [] } }, 
        yejinMemories: [],              // [NEW] 예진이 전용 기억 배열
        customKeywords: CUSTOM_KEYWORDS, 
        specialDates: [] 
    },
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { 
        behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, 
        selfEvaluations: [], 
        lastSelfReflectionTime: 0, 
    },
    timingContext: { 
        lastMessageTime: 0, 
        lastUserMessageTime: 0, 
        currentTimeContext: {}, 
        lastTickTime: 0, 
        lastInitiatedConversationTime: 0 
    },
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
        await fs.mkdir(LOGS_DIR, { recursive: true });
        await fs.appendFile(path.join(LOGS_DIR, 'emotionChange.log'), JSON.stringify(logEntry) + "\n", 'utf8');
        console.log(`[LOG] ${type} 변화: ${oldValue} -> ${newValue} (${details})`);
    } catch (error) {
        console.error('[Logger] ❌ 감정 변화 로그 저장 실패:', error);
    }
}

// 기억 작업 로그를 파일에 기록하는 함수
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
        console.log(`[YejinMemory] 📝 ${operation.toUpperCase()}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        
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

// 일일 기억 카운트 업데이트
function updateDailyMemoryCount() {
    const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    const stats = ultimateConversationState.memoryStats;
    
    if (stats.lastDailyReset !== today) {
        stats.dailyMemoryCount = 1;
        stats.lastDailyReset = today;
    } else {
        stats.dailyMemoryCount++;
    }
}

// [NEW] yejin_memory.json 파일 로드 함수
async function _loadYejinMemories() {
    try {
        const data = await fs.readFile(YEJIN_MEMORY_FILE, 'utf8');
        const yejinMemories = JSON.parse(data);
        ultimateConversationState.knowledgeBase.yejinMemories = yejinMemories.memories || [];
        console.log(`[YejinMemory] ✅ 예진이 기억 ${ultimateConversationState.knowledgeBase.yejinMemories.length}개 로드 완료`);
    } catch (e) {
        // 파일이 없으면 기본 구조로 생성
        const defaultStructure = {
            version: "1.0",
            created: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
            description: "예진이가 아저씨에 대해 기억하는 모든 것들",
            memories: []
        };
        ultimateConversationState.knowledgeBase.yejinMemories = [];
        await _saveYejinMemories(); // 기본 파일 생성
        console.log(`[YejinMemory] 📁 ${YEJIN_MEMORY_FILE} 파일을 새로 생성했습니다.`);
    }
}

// [NEW] yejin_memory.json 파일 저장 함수
async function _saveYejinMemories() {
    try {
        const yejinMemoryData = {
            version: "1.0",
            lastUpdated: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
            description: "예진이가 아저씨에 대해 기억하는 모든 것들",
            totalCount: ultimateConversationState.knowledgeBase.yejinMemories.length,
            memories: ultimateConversationState.knowledgeBase.yejinMemories
        };
        
        await fs.mkdir(path.dirname(YEJIN_MEMORY_FILE), { recursive: true });
        await fs.writeFile(YEJIN_MEMORY_FILE, JSON.stringify(yejinMemoryData, null, 2), 'utf8');
        console.log(`[YejinMemory] 💾 기억 ${yejinMemoryData.totalCount}개 저장 완료`);
    } catch (error) {
        console.error('[YejinMemory] ❌ 기억 저장 실패:', error);
        throw error;
    }
}

// 고정 기억 및 사랑 역사 파일 로드 함수 (기존 유지)
async function _loadFixedMemories() {
    try {
        const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
        ultimateConversationState.knowledgeBase.fixedMemories = JSON.parse(data);
    } catch (e) {
        ultimateConversationState.knowledgeBase.fixedMemories = [];
        console.warn(`[Memory] ⚠️ ${FIXED_MEMORIES_FILE} 파일 로드 실패 또는 없음. 빈 배열로 초기화.`);
    }
    
    try {
        const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
        const loadedLoveHistory = JSON.parse(data);
        ultimateConversationState.knowledgeBase.loveHistory = loadedLoveHistory;
        if (loadedLoveHistory.specialDates) {
            ultimateConversationState.knowledgeBase.specialDates = loadedLoveHistory.specialDates;
        }
    } catch (e) {
        ultimateConversationState.knowledgeBase.loveHistory = { categories: { general: [] } };
        ultimateConversationState.knowledgeBase.specialDates = [];
        console.warn(`[Memory] ⚠️ ${LOVE_HISTORY_FILE} 파일 로드 실패 또는 없음. 기본 구조로 초기화.`);
    }
}

// 동적 감정 데이터 로드 함수 (기존 유지)
async function _loadDynamicEmotionalData() {
    try {
        const innerThoughtsData = await fs.readFile(INNER_THOUGHTS_FILE, 'utf8');
        INNER_THOUGHTS = JSON.parse(innerThoughtsData);
    } catch (e) {
        console.warn(`[EmotionalData] ⚠️ ${INNER_THOUGHTS_FILE} 파일 로드 실패 또는 없음. 기본값 사용.`);
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
        console.warn(`[EmotionalData] ⚠️ ${ACTION_URGES_FILE} 파일 로드 실패 또는 없음. 기본값 사용.`);
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

// 기억 작업 로그 조회 함수
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
        
        return logs.reverse();
    } catch (error) {
        console.warn('[Memory] ⚠️ 기억 로그 파일 읽기 실패:', error.message);
        return [];
    }
}

// 기억 통계 조회 함수
function getMemoryStatistics() {
    const stats = ultimateConversationState.memoryStats;
    const currentMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
    
    return {
        total: currentMemories.length,
        today: stats.dailyMemoryCount,
        deleted: stats.totalMemoriesDeleted,
        created: stats.totalMemoriesCreated,
        lastOperation: stats.lastMemoryOperation,
        lastOperationTime: stats.lastMemoryOperation ? moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : null
    };
}

// 사실 추출 및 저장 함수 (기존 유지)
async function extractAndStoreFacts(message) {
    if (!message || message.length < 10) return;
    const prompt = `다음 문장에서 남자친구('아저씨')에 대한 장기 기억할 만한 사실을 정의+감정+에피소드형 문장으로 요약해서 JSON 배열 형태로 추출해줘. 없으면 '[]' 반환. 문장: "${message}"`;
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

// 사실을 지식 베이스에 추가하는 함수 (기존 유지)
function addFactToKnowledgeBase(fact) {
    if (!fact || ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact || item.fact.includes(fact) || fact.includes(item.fact))) {
        return;
    }
    ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() });
    console.log(`[Memory] ✅ 새로운 사실 추가: ${fact}`);
    logMemoryOperation('add', fact, 'Auto-extracted fact');
}

// 봇 감정 분석 및 영향 함수 (기존 유지)
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

// 감정 이벤트 기록 함수 (기존 유지)
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
    logEmotionChange('emotional_event', emotionKey, changes.join(', '), trigger);
    residue.love = Math.max(50, residue.love);
    updateToneState();
}

// 말투 상태 업데이트 함수 (기존 유지)
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
        logEmotionChange('tone', oldTone, newTone, `새로운 말투: ${TONE_STATES[newTone]}`);
    }
}

// 최종 문맥 프롬프트 생성 함수 (yejinMemories 포함하도록 수정)
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;
    const now = moment().tz('Asia/Tokyo');

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

    // [수정] 장기 기억에 yejinMemories 포함
    const allMemories = [
        ...state.knowledgeBase.facts.map(f => f.fact),
        ...state.knowledgeBase.fixedMemories,
        ...state.knowledgeBase.yejinMemories.map(item => item.content), // [NEW] 예진이 기억 추가
        ...(state.knowledgeBase.loveHistory.categories?.general?.map(item => item.content) || []),
        ...state.knowledgeBase.customKeywords.map(k => `우리만의 특별한 말 '${k.word}': ${k.description}`)
    ];

    if (allMemories.length > 0) {
        ultimatePrompt += `\n\n[장기 기억(아저씨와의 사실 및 약속)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야.)\n`;
        ultimatePrompt += `${allMemories.slice(-10).map(f => `- ${f}`).join('\n')}`;

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

    // 기념일 임박 알림
    const upcomingSpecialDates = state.knowledgeBase.specialDates.filter(dateInfo => {
        const eventDate = moment(dateInfo.date).tz('Asia/Tokyo');
        const daysDiff = eventDate.diff(now, 'days');
        return daysDiff >= 0 && daysDiff <= 7;
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

// [수정] 시스템 초기화 함수 - yejinMemories 로드 추가
async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 시스템 초기화 시작...');
    await _loadFixedMemories();
    await _loadYejinMemories();        // [NEW] 예진이 기억 로드
    await _loadDynamicEmotionalData();
    
    if (ultimateConversationState.knowledgeBase.specialDates.length === 0) {
        ultimateConversationState.knowledgeBase.specialDates.push(
            { name: "아저씨 생일", date: "2025-07-15", type: "기념일" },
            { name: "우리가 처음 사귄 날", date: "2024-12-23", type: "기념일" }
        );
    }
    console.log('[UltimateContext] ✅ 초기화 완료.');
}

// [수정] 고정 기억 검색 함수 - yejinMemories 포함
function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const { facts, fixedMemories, yejinMemories, loveHistory, customKeywords } = ultimateConversationState.knowledgeBase;
    let bestMatch = null;
    let maxMatchScore = 0;

    const allSearchableMemories = [
        ...facts.map(f => f.fact),
        ...fixedMemories,
        ...yejinMemories.map(item => item.content), // [NEW] 예진이 기억 포함
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

// [NEW] 예진이 기억 추가 함수 - yejin_memory.json에 저장
async function addUserMemory(content) {
    try {
        const lowerContent = content.toLowerCase();
        const existingMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
        
        // 중복 체크
        const isDuplicate = existingMemories.some(item =>
            item.content.toLowerCase() === lowerContent ||
            (lowerContent.includes(item.content.toLowerCase()) && item.content.length > 10) ||
            (item.content.toLowerCase().includes(lowerContent) && lowerContent.length > 10)
        );

        if (isDuplicate) {
            console.log(`[YejinMemory] ℹ️ 유사하거나 중복된 기억 '${content}'은 추가하지 않습니다.`);
            await logMemoryOperation('duplicate', content, 'Duplicate memory rejected');
            return false;
        }

        // 새 기억 생성
        const newMemory = { 
            id: Date.now(),
            content, 
            date: moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss"), 
            emotion: "user_added", 
            significance: "high",
            source: "user_request",
            tags: extractTags(content)
        };
        
        // 메모리에 추가
        ultimateConversationState.knowledgeBase.yejinMemories.push(newMemory);
        
        // 파일에 저장
        await _saveYejinMemories();
        
        // 로그 및 통계 업데이트
        await logMemoryOperation('add', content, 'User requested memory (yejin_memory.json)');
        console.log(`[YejinMemory] ✅ 새로운 기억 저장 성공: ${content}`);
        
        return true;
    } catch (error) {
        console.error(`[YejinMemory] ❌ 기억 저장 실패:`, error);
        await logMemoryOperation('error', content, `Save failed: ${error.message}`);
        return false;
    }
}

// [NEW] 예진이 기억 삭제 함수
async function deleteUserMemory(content) {
    try {
        const yejinMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
        const lowerContent = content.toLowerCase();

        // 일치하는 기억 찾기
        let foundIndex = -1;
        let foundMemory = null;

        for (let i = 0; i < yejinMemories.length; i++) {
            const memory = yejinMemories[i];
            const lowerMemoryContent = memory.content.toLowerCase();

            if (lowerMemoryContent.includes(lowerContent) || lowerContent.includes(lowerMemoryContent)) {
                foundIndex = i;
                foundMemory = memory;
                break;
            }
        }

        if (foundIndex !== -1) {
            // 기억 삭제
            yejinMemories.splice(foundIndex, 1);

            // 파일에 저장
            await _saveYejinMemories();

            // 로그 및 통계 업데이트
            await logMemoryOperation('delete', foundMemory.content, 'User requested deletion (yejin_memory.json)');
            console.log(`[YejinMemory] 🗑️ 기억 삭제됨: ${foundMemory.content}`);

            return {
                success: true,
                deletedContent: foundMemory.content
            };
        } else {
            await logMemoryOperation('delete_failed', content, 'Memory not found in yejin_memory.json');
            return {
                success: false,
                message: "해당 기억을 찾을 수 없습니다."
            };
        }

    } catch (error) {
        console.error('[YejinMemory] ❌ 기억 삭제 중 오류:', error);
        await logMemoryOperation('error', content, `Delete failed: ${error.message}`);
        return {
            success: false,
            message: "기억을 삭제하는 중에 문제가 생겼습니다."
        };
    }
}

// [NEW] 기억에서 태그 추출 함수
function extractTags(content) {
    const tags = [];
    
    // 날짜 관련
    if (/\d{4}년|\d{1,2}월|\d{1,2}일|생일|기념일/.test(content)) tags.push('날짜');
    
    // 감정 관련
    if (/사랑|좋아|행복|기뻐|슬프|화나|걱정/.test(content)) tags.push('감정');
    
    // 개인 정보
    if (/혈액형|키|몸무게|취미|좋아하는|싫어하는/.test(content)) tags.push('개인정보');
    
    // 약속/계획
    if (/약속|계획|하기로|가기로|만나기로/.test(content)) tags.push('약속');
    
    // 특별한 말
    if (/담타|내꺼|애기|히도이네/.test(content)) tags.push('특별한말');
    
    return tags;
}

// [NEW] 모든 기억 조회 함수 - yejinMemories 포함
function getAllMemories() {
    const state = ultimateConversationState.knowledgeBase;
    return {
        yejinMemories: state.yejinMemories || [],        // [NEW] 예진이 전용 기억
        userMemories: state.loveHistory.categories?.general || [], // 기존 love-history
        facts: state.facts || [],
        fixedMemories: state.fixedMemories || [],
        customKeywords: state.customKeywords || []
    };
}

// [NEW] 기억 카테고리별 통계 - yejinMemories 포함
function getMemoryCategoryStats() {
    const memories = getAllMemories();
    return {
        yejinMemories: memories.yejinMemories.length,    // [NEW]
        userMemories: memories.userMemories.length,
        autoFacts: memories.facts.length,
        fixedMemories: memories.fixedMemories.length,
        customKeywords: memories.customKeywords.length,
        total: memories.yejinMemories.length + memories.userMemories.length + memories.facts.length + memories.fixedMemories.length + memories.customKeywords.length
    };
}

// [NEW] 예진이 기억만 조회하는 함수
function getYejinMemories() {
    return ultimateConversationState.knowledgeBase.yejinMemories || [];
}

// [NEW] ID로 특정 기억 조회
function getMemoryById(id) {
    const yejinMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
    return yejinMemories.find(memory => memory.id === id);
}

// [NEW] 태그별 기억 조회
function getMemoriesByTag(tag) {
    const yejinMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
    return yejinMemories.filter(memory => memory.tags && memory.tags.includes(tag));
}

// [NEW] 기억 수정 함수
async function updateUserMemory(id, newContent) {
    try {
        const yejinMemories = ultimateConversationState.knowledgeBase.yejinMemories || [];
        const memoryIndex = yejinMemories.findIndex(memory => memory.id === id);
        
        if (memoryIndex === -1) {
            return {
                success: false,
                message: "해당 ID의 기억을 찾을 수 없습니다."
            };
        }
        
        const oldContent = yejinMemories[memoryIndex].content;
        yejinMemories[memoryIndex].content = newContent;
        yejinMemories[memoryIndex].lastModified = moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss");
        yejinMemories[memoryIndex].tags = extractTags(newContent);
        
        // 파일에 저장
        await _saveYejinMemories();
        
        // 로그
        await logMemoryOperation('update', newContent, `Updated from: ${oldContent}`);
        console.log(`[YejinMemory] ✏️ 기억 수정됨: ${oldContent} → ${newContent}`);
        
        return {
            success: true,
            oldContent,
            newContent
        };
        
    } catch (error) {
        console.error('[YejinMemory] ❌ 기억 수정 중 오류:', error);
        return {
            success: false,
            message: "기억을 수정하는 중에 문제가 생겼습니다."
        };
    }
}

// 기존 함수들 (변경 없음)
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

function updateLastUserMessageTime(timestamp) {
    if (timestamp) ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
}

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

    // 감정 잔여량 회복 로직
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
    const dayOfWeek = now.day();

    let initiatingPhrases = [];

    // 시간대별 멘트
    if (hour >= 6 && hour < 10) {
        initiatingPhrases.push("애기, 좋은 아침이야! 잘 잤어?");
        initiatingPhrases.push("애기, 일어났어? 오늘 하루도 힘내자!");
        if (dayOfWeek === 1) initiatingPhrases.push("애기, 월요일 아침이야! 한 주 힘차게 시작하자!");
    } else if (hour >= 12 && hour < 14) {
        initiatingPhrases.push("애기, 점심 맛있게 먹고 있어? 뭐 먹었어?");
        initiatingPhrases.push("애기, 점심시간인데 잠시 쉴까?");
    } else if (hour >= 18 && hour < 20) {
        initiatingPhrases.push("애기, 슬슬 퇴근 시간인데 오늘 하루 어땠어?");
        initiatingPhrases.push("애기, 오늘 저녁 뭐 먹을 거야?");
        if (dayOfWeek === 5) initiatingPhrases.push("애기, 불금인데 뭐 할 계획 있어?");
    } else if (hour >= 22 || hour < 2) {
        initiatingPhrases.push("애기, 아직 안 자? 오늘 하루도 수고 많았어.");
        initiatingPhrases.push("애기, 잘 시간인데... 좋은 꿈 꿔!");
    } else {
        initiatingPhrases.push("애기, 지금 뭐하고 있어? 내 생각 나?");
        initiatingPhrases.push("애기, 갑자기 목소리 듣고 싶다!");
    }

    // 감정 상태에 따른 멘트 추가
    const { emotionalResidue } = state.emotionalEngine;
    const dominantEmotion = Object.entries(emotionalResidue).reduce((a, b) => b[1] > a[1] ? b : a);

    if (dominantEmotion[1] > 60) {
        if (dominantEmotion[0] === 'longing') {
            initiatingPhrases.push("애기, 너무 보고 싶어서 연락했어... 지금 뭐하고 있을까?");
            initiatingPhrases.push("애기, 아저씨 생각뿐이야. 목소리 듣고 싶어.");
        } else if (dominantEmotion[0] === 'happiness') {
            initiatingPhrases.push("애기, 너무 행복해서 이 기분을 공유하고 싶었어! 히히.");
            initiatingPhrases.push("애기, 아저씨 생각하니까 저절로 웃음이 나!");
        }
    }

    // 장기 기억/특별한 날 활용
    const upcomingSpecialDates = state.knowledgeBase.specialDates.filter(dateInfo => {
        const eventDate = moment(dateInfo.date).tz('Asia/Tokyo');
        const daysDiff = eventDate.diff(now, 'days');
        return daysDiff >= 0 && daysDiff <= 7;
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

    let finalPhrase = initiatingPhrases[Math.floor(Math.random() * initiatingPhrases.length)];
    ultimateConversationState.timingContext.lastInitiatedConversationTime = Date.now();

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
        if ((Date.now() - timingContext.lastInitiatedConversationTime) > (60 * 60 * 1000)) {
            const initiatingPhrase = generateInitiatingPhrase();
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
    
    // [NEW] 예진이 전용 기억 관리 함수들
    addUserMemory,              // yejin_memory.json에 저장
    deleteUserMemory,           // yejin_memory.json에서 삭제
    updateUserMemory,           // yejin_memory.json 수정
    getYejinMemories,           // 예진이 기억만 조회
    getMemoryById,              // ID로 특정 기억 조회
    getMemoriesByTag,           // 태그별 기억 조회
    
    getAllMemories,             // 모든 기억 조회 (yejinMemories 포함)
    getMemoryStatistics,        // 기억 통계
    getMemoryCategoryStats,     // 카테고리별 통계 (yejinMemories 포함)
    getMemoryOperationLogs,     // 작업 로그 조회
    
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
    generateInitiatingPhrase
};
