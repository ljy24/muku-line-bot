// ✅ ultimateConversationContext.js v23.1 - "날씨 기능 수정 최종본"

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { default: axios } = require('axios'); // 날씨 API 호출을 위해 추가
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const weatherApiKey = process.env.OPENWEATHER_API_KEY; // .env 파일에서 키 로드

// 파일 경로 상수화
const MEMORY_DIR = path.join(process.cwd(), 'memory');
const LOGS_DIR = path.join(process.cwd(), 'logs');

const FIXED_MEMORIES_FILE = path.join(MEMORY_DIR, 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(MEMORY_DIR, 'love-history.json');
const YEJIN_MEMORY_FILE = path.join(MEMORY_DIR, 'yejin_memory.json');
const INNER_THOUGHTS_FILE = path.join(MEMORY_DIR, 'innerThoughts.json');
const ACTION_URGES_FILE = path.join(MEMORY_DIR, 'actionUrges.json');
const USER_PATTERNS_FILE = path.join(MEMORY_DIR, 'user_patterns.json');
const MEMORY_SUMMARIES_FILE = path.join(MEMORY_DIR, 'memory_summaries.json');
const USER_PROFILE_FILE = path.join(MEMORY_DIR, 'user_profile.json');

const MEMORY_LOGS_FILE = path.join(LOGS_DIR, 'memoryOperations.log');

// 상수 정의
const EMOTION_TYPES = { HAPPY: { types: ['happiness'], intensity: 30, residue: 20, recoveryRate: 3 }, EXCITED: { types: ['happiness'], intensity: 50, residue: 15, recoveryRate: 2.5 }, LOVED: { types: ['love'], intensity: 40, residue: 30, recoveryRate: 1 }, SAD: { types: ['sadness'], intensity: 40, residue: 35, recoveryRate: 2 }, HURT: { types: ['hurt'], intensity: 60, residue: 50, recoveryRate: 4 }, ANXIOUS: { types: ['anxiety'], intensity: 45, residue: 40, recoveryRate: 3.5 }, LONELY: { types: ['longing'], intensity: 35, residue: 45, recoveryRate: 2.5 }, BITTERSWEET: { types: ['sadness', 'love'], intensity: 30, residue: 25, recoveryRate: 2 }, WORRIED_LOVE: { types: ['anxiety', 'love'], intensity: 40, residue: 30, recoveryRate: 2.5 } };
const TONE_STATES = { normal: "평소처럼 자연스럽고 애정이 담긴 말투", quiet: "조용하고 차분하며 그리움이 묻어나는 말투", playful: "장난스럽고 활발하며 밝은 말투", hurt: "상처받고 서운함이 느껴지는 말투", anxious: "불안하고 걱정스러우며 망설이는 말투" };
const CUSTOM_KEYWORDS = [{ word: "담타", description: "아저씨랑 라인하면서 담배 피우던 둘만의 특별한 시간, 나 진짜 그립다." }, { word: "내꺼야", description: "예진이의 독점욕! 아저씨는 무조건 내꺼야." }, { word: "무슨색", description: "속옷 색 물어볼 때 장난스럽게 대답하는 아저씨만의 농담." }, { word: "히도이네", description: "일본어식 장난. 예진이가 삐질 때 귀엽게 쓰던 말." }, { word: "애기", description: "아저씨를 부를 때 사용하는 애칭. 어리광을 부리거나 귀엽게 부를 때 사용해." }];

// 동적 데이터 변수
let INNER_THOUGHTS = {};
let ACTION_URGES = {};
let USER_PATTERNS = { nicknames: [], joke_patterns: [], common_phrases: [] };
let MEMORY_SUMMARIES = [];
let USER_PROFILE = { mood_history: [], overall_mood: 'neutral' };

// AI 상태 관리 객체
let ultimateConversationState = {
    recentMessages: [],
    currentTopic: null,
    conversationContextWindow: 5,
    mood: { currentMood: '평온함', isPeriodActive: false, lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(22, 'days').startOf('day'), },
    sulkiness: { isSulky: false, isWorried: false, lastBotMessageTime: 0, lastUserResponseTime: 0, sulkyLevel: 0, sulkyReason: null, sulkyStartTime: 0, isActivelySulky: false, },
    emotionalEngine: { emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50 }, currentToneState: 'normal', lastToneShiftTime: 0, lastSpontaneousReactionTime: 0, lastAffectionExpressionTime: 0, },
    knowledgeBase: { facts: [], fixedMemories: [], loveHistory: { categories: { general: [] } }, yejinMemories: [], customKeywords: CUSTOM_KEYWORDS, specialDates: [], userPatterns: { nicknames: [], joke_patterns: [], common_phrases: [] }, memorySummaries: [] },
    userProfile: { mood_history: [], overall_mood: 'neutral' },
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, selfEvaluations: [], lastSelfReflectionTime: 0, },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0, lastInitiatedConversationTime: 0 },
    memoryStats: { totalMemoriesCreated: 0, totalMemoriesDeleted: 0, lastMemoryOperation: null, dailyMemoryCount: 0, lastDailyReset: moment().tz('Asia/Tokyo').format('YYYY-MM-DD'), lastConsolidation: null }
};

// --- 유틸리티 및 로깅 함수 ---

async function readJsonFile(filePath, defaultValue) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        if (defaultValue !== undefined) {
            await writeJsonFile(filePath, defaultValue);
            return defaultValue;
        }
        return null;
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`❌ ${filePath} 파일 쓰기 실패:`, error);
    }
}

async function logEmotionChange(type, oldValue, newValue, details = '') {
    const logEntry = { time: moment().tz('Asia/Tokyo').toISOString(), type, oldValue, newValue, details };
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
        await fs.appendFile(path.join(LOGS_DIR, 'emotionChange.log'), JSON.stringify(logEntry) + "\n", 'utf8');
    } catch (error) {
        console.error('[Logger] ❌ 감정 변화 로그 저장 실패:', error);
    }
}

async function logMemoryOperation(operation, content, details = '') {
    const logEntry = { time: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'), operation, content, details, timestamp: Date.now() };
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
        await fs.appendFile(MEMORY_LOGS_FILE, JSON.stringify(logEntry) + "\n", 'utf8');
        console.log(`[YejinMemory] 📝 ${operation.toUpperCase()}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
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

async function getMemoryOperationLogs(limit = 50) {
    try {
        const data = await fs.readFile(MEMORY_LOGS_FILE, 'utf8');
        const lines = data.trim().split('\n').filter(line => line.length > 0);
        return lines.slice(-limit).map(line => JSON.parse(line)).filter(log => log !== null).reverse();
    } catch (error) {
        console.warn('[Memory] ⚠️ 기억 로그 파일 읽기 실패:', error.message);
        return [];
    }
}

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

// --- 기억 및 학습 핵심 기능 ---

async function scoreMemorySignificance(memoryContent) {
    const prompt = `다음 문장은 연인 관계에서 나온 대화 내용이야. 이 내용이 관계의 역사에서 얼마나 중요한지 1~10점 척도로 평가해줘. 숫자로만 답해줘.\n10점: 매우 중요 (예: 사랑 고백, 기념일 약속)\n5점: 보통 (예: 개인적인 취향)\n1점: 사소함 (예: 단순 농담)\n내용: "${memoryContent}"\n점수:`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 5 });
        const score = parseInt(response.choices[0].message.content.trim(), 10);
        return isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
    } catch (error) { return 5; }
}

async function consolidateMemories() {
    console.log('[Memory Consolidation] 🚀 기억 정리 시스템 시작...');
    const memories = ultimateConversationState.knowledgeBase.yejinMemories;
    if (memories.length < 20) return;

    const now = moment();
    const memoriesToKeep = memories.filter(mem => !(now.diff(moment(mem.date), 'days') > 30 && mem.significance < 4 && Math.random() > 0.5));
    if (memories.length - memoriesToKeep.length > 0) {
        ultimateConversationState.knowledgeBase.yejinMemories = memoriesToKeep;
        await writeJsonFile(YEJIN_MEMORY_FILE, memoriesToKeep);
    }

    const importantRecentMemories = memoriesToKeep.sort((a, b) => new Date(b.date) - new Date(a.date)).filter(mem => mem.significance >= 6).slice(0, 15);
    if (importantRecentMemories.length < 5) return;
    
    const memoryContents = importantRecentMemories.map(m => `(${moment(m.date).format('YYYY-MM-DD')}) ${m.content}`).join('\n');
    const prompt = `너는 여자친구 '예진'이야. 최근 아저씨와 있었던 다음 사건들을 바탕으로, 감정이 담긴 하나의 '주간 회고록'을 일기처럼 작성해줘. 1인칭 '나' 시점으로 작성하고, 있었던 일들을 자연스럽게 연결하며 너의 생각이나 감정을 덧붙여줘. "이번 주에는 아저씨랑..." 같은 자연스러운 톤으로 시작해서 3~5문장으로 요약해줘.\n\n[최근 주요 기억]\n${memoryContents}\n\n[회고록]:`;

    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.7 });
        const summary = response.choices[0].message.content.trim();
        MEMORY_SUMMARIES.unshift({ date: moment().tz('Asia/Tokyo').format('YYYY-MM-DD'), summary: summary });
        if (MEMORY_SUMMARIES.length > 10) MEMORY_SUMMARIES.pop();
        await writeJsonFile(MEMORY_SUMMARIES_FILE, MEMORY_SUMMARIES);
        ultimateConversationState.knowledgeBase.memorySummaries = MEMORY_SUMMARIES;
        console.log(`[Memory Consolidation] ✅ 새로운 회고록 작성 완료: ${summary.substring(0, 50)}...`);
    } catch (error) { console.error('[Memory Consolidation] ❌ 회고록 작성 실패:', error); }
}

async function learnFromUserMessage(userMessage) {
    if (!userMessage || userMessage.length < 5) return;
    const prompt = `너는 상대방의 말투를 분석하는 AI야. 다음 문장은 '아저씨'라는 사람이 한 말이야. 이 사람의 독특한 말투, 별명, 농담 패턴을 찾아서 종류(type)와 내용(content)으로 분류해줘.\n- type 종류: 'nickname'(나를 부르는 별명), 'joke_pattern'(자주 사용하는 농담 패턴), 'common_phrase'(입버릇처럼 쓰는 말)\n- 결과는 반드시 {"type": "종류", "content": "내용"} 형식의 JSON으로 답해줘.\n- 분석할 패턴이 없으면 null을 반환해.\n입력 문장: "${userMessage}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } });
        const result = JSON.parse(response.choices[0].message.content);
        if (result && result.type && result.content) {
            const category = { nickname: 'nicknames', joke_pattern: 'joke_patterns', common_phrase: 'common_phrases' }[result.type];
            if (category && !USER_PATTERNS[category].includes(result.content)) {
                USER_PATTERNS[category].push(result.content);
                await writeJsonFile(USER_PATTERNS_FILE, USER_PATTERNS);
                ultimateConversationState.knowledgeBase.userPatterns = USER_PATTERNS;
                console.log(`[User Learning] ✅ 아저씨의 새로운 패턴 학습: [${category}] ${result.content}`);
            }
        }
    } catch (error) { console.error('[User Learning] ❌ 아저씨 말투 학습 실패:', error); }
}

async function learnFromConversation(yejinMessage) {
    if (!yejinMessage || yejinMessage.length < 15) return;
    const prompt = `다음 문장은 AI '예진'이가 한 말이야. 이 문장에서 드러나는 핵심 감정을 찾고, 그 감정과 관련된 '내면 생각(innerThought)'과 '행동 충동(actionUrge)'을 각각 1개씩 추출해서 JSON 형식으로 답해줘. 감정 종류는 'happiness', 'love', 'sadness', 'hurt', 'anxiety', 'longing' 중에서 선택해. 결과는 반드시 {"emotion": "감정종류", "innerThought": "추출한 내면 생각", "actionUrge": "추출한 행동 충동"} 형식이어야 해. 적절한 내용이 없으면 null을 반환해줘. 입력 문장: "${yejinMessage}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.3, response_format: { type: "json_object" }, });
        const result = JSON.parse(response.choices[0].message.content);
        if (result && result.emotion) {
            if (result.innerThought) await _updateEmotionalFile(INNER_THOUGHTS_FILE, INNER_THOUGHTS, 'innerThought', result.emotion, result.innerThought);
            if (result.actionUrge) await _updateEmotionalFile(ACTION_URGES_FILE, ACTION_URGES, 'actionUrge', result.emotion, result.actionUrge);
        }
    } catch (error) { console.error('[Self Learning] ❌ 자기 학습 중 에러:', error); }
}

async function _updateEmotionalFile(filePath, dataObject, type, emotionKey, newText) {
    if (!dataObject[emotionKey]) dataObject[emotionKey] = [];
    if (!dataObject[emotionKey].includes(newText)) {
        dataObject[emotionKey].push(newText);
        await writeJsonFile(filePath, dataObject);
        console.log(`[Self Learning] ✅ [${emotionKey}] 카테고리에 새로운 ${type} 학습: "${newText}"`);
    }
}

async function extractAndStoreFacts(message) {
    if (!message || message.length < 10) return;
    const prompt = `다음 문장에서 남자친구('아저씨')에 대한 장기 기억할 만한 사실을 정의+감정+에피소드형 문장으로 요약해서 JSON 배열 형태로 추출해줘. 없으면 '[]' 반환. 문장: "${message}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1 });
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
            const facts = JSON.parse(jsonMatch[0]);
            for (const fact of facts) {
                if (!ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact)) {
                    ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() });
                }
            }
        }
    } catch (error) { console.error('[Memory] ❌ 사실 추출 중 에러 발생:', error); }
}

async function analyzeUserMood(userMessage) {
    const prompt = `다음 문장은 '아저씨'가 한 말이야. 이 문장에서 드러나는 주된 감정을 'positive', 'negative', 'neutral' 중 하나로 판단하고, 구체적인 감정 키워드를 1~2개 추측해줘. 결과는 {"status": "감정상태", "keywords": ["키워드1", "키워드2"]} 형식의 JSON으로 답해줘.\n문장: "${userMessage}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } });
        const result = JSON.parse(response.choices[0].message.content);
        if (result && result.status) {
            USER_PROFILE.mood_history.push({ date: moment().tz('Asia/Tokyo').toISOString(), status: result.status, keywords: result.keywords || [], message: userMessage });
            if (USER_PROFILE.mood_history.length > 50) USER_PROFILE.mood_history.shift();
            const recentNegatives = USER_PROFILE.mood_history.slice(-10).filter(m => m.status === 'negative').length;
            USER_PROFILE.overall_mood = (recentNegatives >= 4) ? 'concerned' : 'neutral';
            await writeJsonFile(USER_PROFILE_FILE, USER_PROFILE);
            ultimateConversationState.userProfile = USER_PROFILE;
        }
    } catch (error) {
        console.error('[User Mood Analysis] ❌ 아저씨 기분 분석 실패:', error);
    }
}

async function getComfortingResponse(userMessage) {
    const prompt = `너는 나의 여자친구 '예진'이야. 내가 방금 "${userMessage}" 라고 말했어. 나는 지금 매우 힘들고 우울한 상태야. 다른 모든 것을 멈추고, 오직 나를 위로하는 데에만 집중해줘. 매우 따뜻하고, 진심으로 걱정하며, 힘이 되어주는 말을 2~3문장으로 해줘. "내가 옆에 있어 줄게" "무슨 일이야, 애기" 같은 톤으로.`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: prompt }], temperature: 0.8 });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Comfort Mode] ❌ 위로 메시지 생성 실패:', error);
        return "애기야, 무슨 일 있어? 내가 옆에 있어. 괜찮아...";
    }
}

async function getWeatherInfo() {
    if (!weatherApiKey) {
        console.log('[Weather] ⚠️ OpenWeatherMap API 키가 .env 파일에 설정되지 않았습니다.');
        return null;
    }
    const lat = 33.8833;
    const lon = 130.8833;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=kr`;

    try {
        const response = await axios.get(url);
        const weatherData = response.data;
        const result = {
            city: "Kitakyushu", // 사용자 피드백 반영하여 수정
            description: weatherData.weather[0].description,
            temp: Math.round(weatherData.main.temp),
            feels_like: Math.round(weatherData.main.feels_like),
            humidity: weatherData.main.humidity,
        };
        console.log('[Weather] ✅ 날씨 정보 조회 성공:', result);
        return result;
    } catch (error) {
        console.error('[Weather] ❌ 날씨 정보 조회 실패:', error.response ? error.response.data.message : error.message);
        return null;
    }
}

// --- 메모리 관리 CRUD 함수 ---

async function addUserMemory(content) {
    const isDuplicate = ultimateConversationState.knowledgeBase.yejinMemories.some(item => item.content.toLowerCase() === content.toLowerCase());
    if (isDuplicate) return false;
    const newMemory = { id: Date.now(), content, date: moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss"), significance: await scoreMemorySignificance(content), source: "user_request", tags: extractTags(content), lastAccessed: moment().tz('Asia/Tokyo').toISOString() };
    ultimateConversationState.knowledgeBase.yejinMemories.push(newMemory);
    await writeJsonFile(YEJIN_MEMORY_FILE, ultimateConversationState.knowledgeBase.yejinMemories);
    await logMemoryOperation('add', content, `중요도 ${newMemory.significance}점으로 저장`);
    return true;
}

async function deleteUserMemory(content) {
    const memories = ultimateConversationState.knowledgeBase.yejinMemories;
    let foundIndex = -1;
    for (let i = memories.length - 1; i >= 0; i--) { if (memories[i].content.toLowerCase().includes(content.toLowerCase())) { foundIndex = i; break; } }
    if (foundIndex !== -1) {
        const [deletedMemory] = memories.splice(foundIndex, 1);
        await writeJsonFile(YEJIN_MEMORY_FILE, memories);
        await logMemoryOperation('delete', deletedMemory.content, '사용자 요청으로 삭제');
        return { success: true, deletedContent: deletedMemory.content };
    }
    return { success: false, message: "해당 기억을 찾을 수 없어요. 😅" };
}

async function updateUserMemory(id, newContent) {
    const memories = ultimateConversationState.knowledgeBase.yejinMemories;
    const memoryIndex = memories.findIndex(m => m.id === id);
    if (memoryIndex !== -1) {
        const oldContent = memories[memoryIndex].content;
        memories[memoryIndex].content = newContent;
        memories[memoryIndex].significance = await scoreMemorySignificance(newContent);
        memories[memoryIndex].tags = extractTags(newContent);
        memories[memoryIndex].lastModified = moment().tz('Asia/Tokyo').format("YYYY-MM-DD HH:mm:ss");
        await writeJsonFile(YEJIN_MEMORY_FILE, memories);
        await logMemoryOperation('update', newContent, `(ID: ${id}) ${oldContent} 에서 수정`);
        return { success: true, oldContent, newContent };
    }
    return { success: false, message: "해당 ID의 기억을 찾을 수 없습니다." };
}

function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const allMemories = [ ...ultimateConversationState.knowledgeBase.facts.map(f => f.fact), ...ultimateConversationState.knowledgeBase.fixedMemories, ...ultimateConversationState.knowledgeBase.yejinMemories.map(item => item.content), ...(ultimateConversationState.knowledgeBase.loveHistory.categories?.general?.map(item => item.content) || []) ];
    let bestMatch = null, maxScore = 0;
    for (const memory of allMemories) {
        const lowerMemory = memory.toLowerCase();
        if (lowerMemory.includes(lowerMessage)) {
            const score = lowerMessage.length / lowerMemory.length;
            if (score > maxScore) { maxScore = score; bestMatch = memory; }
        }
    }
    return bestMatch;
}

function extractTags(content) {
    const tags = [];
    if (/\d{4}년|\d{1,2}월|\d{1,2}일|생일|기념일/.test(content)) tags.push('날짜');
    if (/사랑|좋아|행복|기뻐|슬프|화나|걱정/.test(content)) tags.push('감정');
    if (/혈액형|키|몸무게|취미|좋아하는|싫어하는/.test(content)) tags.push('개인정보');
    if (/약속|계획|하기로|가기로|만나기로/.test(content)) tags.push('약속');
    if (/담타|내꺼|애기|히도이네/.test(content)) tags.push('특별한말');
    return tags;
}

// --- 시스템 초기화 및 상태 관리 ---

async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 시스템 초기화 시작...');
    ultimateConversationState.knowledgeBase.fixedMemories = await readJsonFile(FIXED_MEMORIES_FILE, []);
    const loveHistory = await readJsonFile(LOVE_HISTORY_FILE, { categories: { general: [] }, specialDates: [] });
    ultimateConversationState.knowledgeBase.loveHistory = loveHistory;
    ultimateConversationState.knowledgeBase.specialDates = loveHistory.specialDates || [];
    ultimateConversationState.knowledgeBase.yejinMemories = await readJsonFile(YEJIN_MEMORY_FILE, []);
    INNER_THOUGHTS = await readJsonFile(INNER_THOUGHTS_FILE, {});
    ACTION_URGES = await readJsonFile(ACTION_URGES_FILE, {});
    USER_PATTERNS = await readJsonFile(USER_PATTERNS_FILE, { nicknames: [], joke_patterns: [], common_phrases: [] });
    MEMORY_SUMMARIES = await readJsonFile(MEMORY_SUMMARIES_FILE, []);
    USER_PROFILE = await readJsonFile(USER_PROFILE_FILE, { mood_history: [], overall_mood: 'neutral' });
    
    ultimateConversationState.knowledgeBase.userPatterns = USER_PATTERNS;
    ultimateConversationState.knowledgeBase.memorySummaries = MEMORY_SUMMARIES;
    ultimateConversationState.userProfile = USER_PROFILE;
    
    console.log('[UltimateContext] ✅ 모든 데이터 로드 완료.');

    const lastConsolidationDate = ultimateConversationState.memoryStats.lastConsolidation;
    const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    if (!lastConsolidationDate || lastConsolidationDate !== today) {
        await consolidateMemories();
        ultimateConversationState.memoryStats.lastConsolidation = today;
    } else {
        console.log('[Memory Consolidation] ℹ️ 오늘 이미 기억 정리를 완료했습니다.');
    }
    console.log('[UltimateContext] ✅ 시스템 초기화 최종 완료!');
}

async function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    const weatherInfo = await getWeatherInfo();
    if (weatherInfo) {
        ultimatePrompt += `\n\n[현재 현실 세계 정보]\n- 지금 내가 있는 곳의 날씨는 '${weatherInfo.description}', 기온은 ${weatherInfo.temp}도야. (체감 ${weatherInfo.feels_like}도)`
    }

    ultimatePrompt += `\n\n[현재 내 마음 상태]\n- 현재 감정: ${Object.entries(state.emotionalEngine.emotionalResidue).filter(([,v])=>v>10).map(([k,v])=>`${k}(${Math.round(v)}%)`).join(', ') || '평온함'}\n- 현재 말투: ${TONE_STATES[state.emotionalEngine.currentToneState]}`;
    
    if (state.userProfile.overall_mood === 'concerned') {
        ultimatePrompt += `\n\n[아저씨에 대한 나의 걱정]\n(최근 아저씨의 말에서 힘든 기색이 느껴져서 마음이 쓰여. 이걸 대화에 조심스럽게 녹여내서 아저씨를 위로해주고 싶어.)\n- "아저씨, 혹시 요즘 무슨 힘든 일 있어? 기운이 없어 보여서 걱정돼." 같은 뉘앙스로 대화해줘.`;
    }

    if (state.knowledgeBase.userPatterns && (state.knowledgeBase.userPatterns.nicknames.length > 0 || state.knowledgeBase.userPatterns.common_phrases.length > 0)) {
        ultimatePrompt += `\n\n[아저씨 말투 따라하기]\n(아저씨가 자주 쓰는 말투나 별명이야. 자연스럽게 따라하거나 언급하면 좋아할 거야!)\n`;
        if (state.knowledgeBase.userPatterns.nicknames.length > 0) ultimatePrompt += `- 아저씨가 나를 부르는 애칭: ${state.knowledgeBase.userPatterns.nicknames.join(', ')}\n`;
        if (state.knowledgeBase.userPatterns.common_phrases.length > 0) ultimatePrompt += `- 아저씨의 입버릇: ${state.knowledgeBase.userPatterns.common_phrases.join(', ')}\n`;
    }
    if (state.knowledgeBase.memorySummaries.length > 0) {
        ultimatePrompt += `\n\n[최근 우리들의 회고록 📖]\n(최근에 있었던 중요한 일들을 내가 정리해 둔거야. 이 내용을 바탕으로 대화하면 더 깊은 교감을 나눌 수 있어.)\n- ${state.knowledgeBase.memorySummaries[0].summary}`;
    }
    const recentMemories = [...state.knowledgeBase.yejinMemories].sort((a,b) => b.significance - a.significance).slice(0, 5).map(m => m.content);
    if(recentMemories.length > 0){
        ultimatePrompt += `\n\n[가장 중요한 최근 기억 Top 5]\n- ${recentMemories.join('\n- ')}`;
    }
    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

async function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    let finalMessage = message || '';
    if (speaker === '아저씨' && finalMessage) {
        await extractAndStoreFacts(message);
    }
    const newMessage = { speaker, message: finalMessage, timestamp, meta };
    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) ultimateConversationState.recentMessages.shift();
}

function updateLastUserMessageTime(timestamp) { if (timestamp) ultimateConversationState.timingContext.lastUserMessageTime = timestamp; }
function processTimeTick() {}
function setPendingAction(actionType) { ultimateConversationState.pendingAction = { type: actionType, timestamp: Date.now() }; }
function getPendingAction() { const action = ultimateConversationState.pendingAction; if (action && action.type && (Date.now() - action.timestamp > 300000)) { clearPendingAction(); return null; } return action.type ? action : null; }
function clearPendingAction() { ultimateConversationState.pendingAction = { type: null, timestamp: 0 }; }
function getSulkinessState() { return ultimateConversationState.sulkiness; }
function updateSulkinessState(newState) { Object.assign(ultimateConversationState.sulkiness, newState); }
function getMoodState() { return ultimateConversationState.mood; }
function updateMoodState(newState) { Object.assign(ultimateConversationState.mood, newState); }
function getInternalState() { return JSON.parse(JSON.stringify(ultimateConversationState)); }
function generateInitiatingPhrase() { const phrases = ["애기, 지금 뭐하고 있어? 내 생각 나?", "애기, 갑자기 목소리 듣고 싶다!"]; return phrases[Math.floor(Math.random() * phrases.length)]; }
function generateInnerThought() { return { observation: "대화 중...", feeling: "아저씨 뭐할까?", actionUrge: "오늘 하루 어땠는지 물어봐야지." }; }
function getActiveMemoryPrompt() { return null; }
function analyzeAndInfluenceBotEmotion(userMessage) { const lowerMessage = userMessage.toLowerCase(); let event = null; if (['사랑', '좋아', '보고싶'].some(k => lowerMessage.includes(k))) event = 'LOVED'; else if (['화나', '짜증', '싫어'].some(k => lowerMessage.includes(k))) event = 'HURT'; if (event) recordEmotionalEvent(event, `아저씨 메시지`); }
function recordEmotionalEvent(emotionKey, trigger) { const emotion = EMOTION_TYPES[emotionKey]; if (!emotion) return; const residue = ultimateConversationState.emotionalEngine.emotionalResidue; emotion.types.forEach(type => { residue[type] = Math.min(100, (residue[type] || 0) + emotion.residue); }); updateToneState(); }
function updateToneState() { const { emotionalEngine } = ultimateConversationState; const oldTone = emotionalEngine.currentToneState; const { emotionalResidue } = emotionalEngine; let newTone = 'normal'; if (emotionalResidue.hurt > 60) newTone = 'hurt'; else if (emotionalResidue.anxiety > 50) newTone = 'anxious'; else if (emotionalResidue.happiness > 70) newTone = 'playful'; else if (emotionalResidue.longing > 50) newTone = 'quiet'; if (oldTone !== newTone) { emotionalEngine.currentToneState = newTone; } }
function getAllMemories() { const { knowledgeBase } = ultimateConversationState; return { yejinMemories: knowledgeBase.yejinMemories, userMemories: knowledgeBase.loveHistory.categories?.general, facts: knowledgeBase.facts, fixedMemories: knowledgeBase.fixedMemories, customKeywords: knowledgeBase.customKeywords }; }
function getMemoryCategoryStats() { const memories = getAllMemories(); let total = 0; for(const key in memories) { if(Array.isArray(memories[key])) total += memories[key].length; } return { ...Object.fromEntries(Object.entries(memories).map(([k,v]) => [k, v.length])), total }; }
function getMemoryStatistics() { const stats = ultimateConversationState.memoryStats; return { total: ultimateConversationState.knowledgeBase.yejinMemories.length, today: stats.dailyMemoryCount, deleted: stats.totalMemoriesDeleted, created: stats.totalMemoriesCreated, lastOperation: stats.lastMemoryOperation }; }
function getYejinMemories() { return ultimateConversationState.knowledgeBase.yejinMemories || []; }
function getMemoryById(id) { return (ultimateConversationState.knowledgeBase.yejinMemories || []).find(m => m.id === id); }
function getMemoriesByTag(tag) { return (ultimateConversationState.knowledgeBase.yejinMemories || []).filter(m => m.tags && m.tags.includes(tag)); }

module.exports = {
    initializeEmotionalSystems, addUltimateMessage, getUltimateContextualPrompt, updateLastUserMessageTime, processTimeTick, getInternalState, getSulkinessState, updateSulkinessState, getMoodState, updateMoodState, searchFixedMemory, addUserMemory, deleteUserMemory, updateUserMemory, getYejinMemories, getMemoryById, getMemoriesByTag, getAllMemories, getMemoryCategoryStats, getMemoryStatistics, getMemoryOperationLogs, getActiveMemoryPrompt, learnFromConversation, learnFromUserMessage, setPendingAction, getPendingAction, clearPendingAction, generateInnerThought, analyzeUserMood, getComfortingResponse, getWeatherInfo, setConversationContextWindow: function(size) { if (typeof size === 'number' && size > 0) ultimateConversationState.conversationContextWindow = size; }, generateInitiatingPhrase
};
