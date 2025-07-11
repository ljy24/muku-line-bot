// ✅ ultimateConversationContext.js v17.2 - "기능 누락 오류 수정"
// - [오류 수정] getPendingAction, setPendingAction, clearPendingAction 함수가 누락되어 발생한 에러 해결

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FIXED_MEMORIES_FILE = path.join(process.cwd(), 'memory', 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');

const EMOTION_TYPES = { HAPPY: { types: ['happiness'], intensity: 30, residue: 20 }, EXCITED: { types: ['happiness'], intensity: 50, residue: 15 }, LOVED: { types: ['love'], intensity: 40, residue: 30 }, SAD: { types: ['sadness'], intensity: 40, residue: 35 }, HURT: { types: ['hurt'], intensity: 60, residue: 50 }, ANXIOUS: { types: ['anxiety'], intensity: 45, residue: 40 }, LONELY: { types: ['longing'], intensity: 35, residue: 45 }, BITTERSWEET: { types: ['sadness', 'love'], intensity: 30, residue: 25 }, WORRIED_LOVE: { types: ['anxiety', 'love'], intensity: 40, residue: 30 } };
const TONE_STATES = { normal: "평소처럼 자연스럽고 애정이 담긴 말투", quiet: "조용하고 차분하며 그리움이 묻어나는 말투", playful: "장난스럽고 활발하며 밝은 말투", hurt: "상처받고 서운함이 느껴지는 말투", anxious: "불안하고 걱정스러우며 망설이는 말투" };

let ultimateConversationState = {
    recentMessages: [],
    currentTopic: null,
    mood: { currentMood: '평온함', isPeriodActive: false, lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(20, 'days').startOf('day'), },
    sulkiness: { isSulky: false, isWorried: false, lastBotMessageTime: 0, lastUserResponseTime: 0, sulkyLevel: 0, sulkyReason: null, sulkyStartTime: 0, isActivelySulky: false, },
    emotionalEngine: { emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50 }, currentToneState: 'normal', lastToneShiftTime: 0, lastSpontaneousReactionTime: 0, lastAffectionExpressionTime: 0, },
    knowledgeBase: { facts: [], fixedMemories: [], loveHistory: {}, },
    dailySummary: { today: {}, yesterday: null },
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, selfEvaluations: [], lastSelfReflectionTime: 0, },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0 }
};

async function _loadFixedMemories() {
    console.log('[Memory] 고정 기억 파일 로딩 시작...');
    try {
        const fixedData = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
        ultimateConversationState.knowledgeBase.fixedMemories = JSON.parse(fixedData);
        console.log(`[Memory] ✅ fixedMemories.json 로드 완료 (${ultimateConversationState.knowledgeBase.fixedMemories.length}개)`);
    } catch (e) {
        console.warn(`[Memory] ⚠️ fixedMemories.json 로드 실패. 파일이 없거나 오류가 있습니다.`);
        ultimateConversationState.knowledgeBase.fixedMemories = [];
    }
    try {
        const loveData = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
        ultimateConversationState.knowledgeBase.loveHistory = JSON.parse(loveData);
        console.log(`[Memory] ✅ love-history.json 로드 완료.`);
    } catch (e) {
        console.warn(`[Memory] ⚠️ love-history.json 로드 실패. 파일이 없거나 오류가 있습니다.`);
        ultimateConversationState.knowledgeBase.loveHistory = { categories: { general: [] } };
    }
}

async function extractAndStoreFacts(message) {
    if (!message || message.length < 10) return;
    const prompt = `너는 중요한 정보를 기억하는 비서 AI야. 다음 문장에서 남자친구('아저씨')에 대한 장기적으로 기억할 만한 중요한 사실(생일, 기념일, 좋아하는 것, 싫어하는 것, 중요한 약속 등)이 있다면, 그 사실들을 명사형 문장(~이다, ~함)으로 요약해서 JSON 문자열 배열 형태로 추출해줘. 예: ["아저씨의 생일은 10월 25일이다."]. 기억할 정보가 없으면 '[]'을 반환해줘. 문장: "${message}"`;
    try {
        const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1 });
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
            const facts = JSON.parse(jsonMatch[0]);
            facts.forEach(fact => addFactToKnowledgeBase(fact));
        }
    } catch (error) {
        console.error('[Memory] ❌ 사실 추출 중 에러 발생:', error);
    }
}

function addFactToKnowledgeBase(fact) {
    if (!fact || ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact)) return;
    ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() });
}

function analyzeAndInfluenceBotEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let event = null;
    if (['사랑', '좋아', '보고싶'].some(k => lowerMessage.includes(k))) event = 'LOVED';
    else if (['힘들', '슬프', '우울'].some(k => lowerMessage.includes(k))) event = 'WORRIED_LOVE';
    else if (['화나', '짜증', '싫어'].some(k => lowerMessage.includes(k))) event = 'HURT';
    else if (['바쁘', '일 때문에', '나중에'].some(k => lowerMessage.includes(k))) event = 'LONELY';
    else if (['재밌', '웃기', 'ㅋㅋ'].some(k => lowerMessage.includes(k))) event = 'HAPPY';
    if (event) recordEmotionalEvent(event, `아저씨의 메시지`);
}

function recordEmotionalEvent(emotionKey, trigger) {
    const emotion = EMOTION_TYPES[emotionKey];
    if (!emotion) return;
    const residue = ultimateConversationState.emotionalEngine.emotionalResidue;
    emotion.types.forEach(type => { residue[type] = Math.min(100, (residue[type] || 0) + emotion.residue); });
    residue.love = Math.max(50, residue.love);
    updateToneState();
}

function updateToneState() {
    const { emotionalResidue } = ultimateConversationState.emotionalEngine;
    let newTone = 'normal';
    if (emotionalResidue.hurt > 60 || emotionalResidue.sadness > 60) newTone = 'hurt';
    else if (emotionalResidue.anxiety > 50) newTone = 'anxious';
    else if (emotionalResidue.happiness > 70) newTone = 'playful';
    else if (emotionalResidue.longing > 50 || emotionalResidue.sadness > 40) newTone = 'quiet';
    if (ultimateConversationState.emotionalEngine.currentToneState !== newTone) {
        ultimateConversationState.emotionalEngine.currentToneState = newTone;
    }
}

function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    if (state.recentMessages.length > 0) {
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n')}`;
    }

    const { emotionalResidue, currentToneState } = state.emotionalEngine;
    const significantResidue = Object.entries(emotionalResidue).filter(([, level]) => level > 30).map(([emotion, level]) => `${emotion}(${Math.round(level)}%)`).join(', ');
    ultimatePrompt += `\n\n[현재 내 마음 상태]`;
    if (significantResidue) ultimatePrompt += `\n- 마음에 남아있는 감정: ${significantResidue}.`;
    ultimatePrompt += `\n- 현재 말투: 지금 내 기분은 '${TONE_STATES[currentToneState]}' 상태야. 이 말투에 맞춰서 대답해줘.`;

    const allFacts = [...state.knowledgeBase.facts.map(f => f.fact), ...state.knowledgeBase.fixedMemories];
    if (allFacts.length > 0) {
        ultimatePrompt += `\n\n[장기 기억(아저씨와의 사실 및 약속)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야.)\n${allFacts.slice(-10).map(f => `- ${f}`).join('\n')}`;
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;
    return ultimatePrompt;
}

async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 시스템 초기화 시작...');
    await _loadFixedMemories();
    console.log('[UltimateContext] ✅ 초기화 완료.');
}

function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const { fixedMemories, loveHistory } = ultimateConversationState.knowledgeBase;
    let bestMatch = null;
    let maxMatchScore = 0;
    const allMemories = [...fixedMemories, ...(loveHistory.categories?.general?.map(item => item.content) || [])];
    
    for (const memory of allMemories) {
        const lowerMemory = memory.toLowerCase();
        let score = 0;
        if (lowerMemory.includes(lowerMessage)) score = lowerMessage.length;
        else {
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

async function addUserMemory(content) {
    try {
        const newMemory = { content, date: moment().format("YYYY-MM-DD HH:mm:ss"), emotion: "user_added", significance: "high" };
        const loveHistory = ultimateConversationState.knowledgeBase.loveHistory;
        if (!loveHistory.categories) loveHistory.categories = { general: [] };
        if (!loveHistory.categories.general) loveHistory.categories.general = [];
        loveHistory.categories.general.push(newMemory);
        await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Memory] ❌ 새 기억 저장 실패:`, error);
        return false;
    }
}

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
    // This function can be expanded to handle time-based events.
}

// [오류 수정] 누락되었던 함수들 다시 추가
function setPendingAction(actionType) {
    if (!actionType) return;
    ultimateConversationState.pendingAction = { type: actionType, timestamp: Date.now() };
    console.log(`[UltimateContext] ⏳ 특별 행동 대기 모드 설정: ${actionType}`);
}

function getPendingAction() {
    const action = ultimateConversationState.pendingAction;
    // 5분 이상 경과 시 자동 해제
    if (action && action.type && (Date.now() - action.timestamp > 5 * 60 * 1000)) {
        clearPendingAction();
        return null;
    }
    return action.type ? action : null;
}

function clearPendingAction() {
    ultimateConversationState.pendingAction = { type: null, timestamp: 0 };
    console.log(`[UltimateContext] ✅ 특별 행동 대기 모드 해제.`);
}


function getSulkinessState() { return ultimateConversationState.sulkiness; }
function updateSulkinessState(newState) { Object.assign(ultimateConversationState.sulkiness, newState); }
function getMoodState() { return ultimateConversationState.mood; }
function updateMoodState(newState) { Object.assign(ultimateConversationState.mood, newState); }
function getInternalState() { return JSON.parse(JSON.stringify(ultimateConversationState)); }

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
    // [오류 수정] 누락되었던 함수들을 목록에 다시 추가
    setPendingAction,
    getPendingAction,
    clearPendingAction
};
