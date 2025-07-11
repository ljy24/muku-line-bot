// ✅ ultimateConversationContext.js v18.1 - "생리 주기 계산 로직 복원"
// [오류 수정] processTimeTick 함수에 누락되었던 생리 주기 계산 및 상태 업데이트 로직을 복원

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
    recentMessages: [], currentTopic: null,
    mood: { currentMood: '평온함', isPeriodActive: false, lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(22, 'days').startOf('day'), }, // 마지막 생리 시작일을 22일 전으로 수정하여 테스트 용이하게 함
    sulkiness: { isSulky: false, isWorried: false, lastBotMessageTime: 0, lastUserResponseTime: 0, sulkyLevel: 0, sulkyReason: null, sulkyStartTime: 0, isActivelySulky: false, },
    emotionalEngine: { emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50 }, currentToneState: 'normal', lastToneShiftTime: 0, lastSpontaneousReactionTime: 0, lastAffectionExpressionTime: 0, },
    knowledgeBase: { facts: [], fixedMemories: [], loveHistory: {}, },
    dailySummary: { today: {}, yesterday: null }, cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} }, transitionSystem: { pendingTopics: [], conversationSeeds: [], },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: { behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 }, selfEvaluations: [], lastSelfReflectionTime: 0, },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0 }
};

async function _loadFixedMemories() { try { const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8'); ultimateConversationState.knowledgeBase.fixedMemories = JSON.parse(data); } catch (e) { ultimateConversationState.knowledgeBase.fixedMemories = []; } try { const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8'); ultimateConversationState.knowledgeBase.loveHistory = JSON.parse(data); } catch (e) { ultimateConversationState.knowledgeBase.loveHistory = { categories: { general: [] } }; } }
async function extractAndStoreFacts(message) { if (!message || message.length < 10) return; const prompt = `다음 문장에서 남자친구('아저씨')에 대한 장기 기억할 만한 사실(생일, 기념일, 좋아하는 것 등)이 있다면 명사형 문장으로 요약해서 JSON 배열 형태로 추출해줘. 없으면 '[]' 반환. 문장: "${message}"`; try { const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.1 }); const content = response.choices[0].message.content; const jsonMatch = content.match(/\[.*\]/s); if (jsonMatch) { JSON.parse(jsonMatch[0]).forEach(fact => addFactToKnowledgeBase(fact)); } } catch (error) { console.error('[Memory] ❌ 사실 추출 중 에러 발생:', error); } }
function addFactToKnowledgeBase(fact) { if (!fact || ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact)) return; ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() }); }

function analyzeAndInfluenceBotEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let event = null;
    if (['사랑', '좋아', '보고싶', '예쁘다', '귀여워'].some(k => lowerMessage.includes(k))) event = 'LOVED';
    else if (['힘들', '슬프', '우울'].some(k => lowerMessage.includes(k))) event = 'WORRIED_LOVE';
    else if (['화나', '짜증', '싫어', '못생겼', '별로'].some(k => lowerMessage.includes(k))) event = 'HURT';
    else if (['바쁘', '일 때문에', '나중에'].some(k => lowerMessage.includes(k))) event = 'LONELY';
    else if (['재밌', '웃기', 'ㅋㅋ'].some(k => lowerMessage.includes(k))) event = 'HAPPY';
    if (event) recordEmotionalEvent(event, `아저씨의 메시지`);
}

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
    residue.love = Math.max(50, residue.love);
    updateToneState();
}

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
    }
}

function getUltimateContextualPrompt(basePrompt) { let ultimatePrompt = basePrompt; const state = ultimateConversationState; if (state.recentMessages.length > 0) { ultimatePrompt += `\n\n[최근 대화 흐름]\n${state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n')}`; } const { emotionalResidue, currentToneState } = state.emotionalEngine; const significantResidue = Object.entries(emotionalResidue).filter(([, level]) => level > 30).map(([emotion, level]) => `${emotion}(${Math.round(level)}%)`).join(', '); ultimatePrompt += `\n\n[현재 내 마음 상태]`; if (significantResidue) ultimatePrompt += `\n- 마음에 남아있는 감정: ${significantResidue}.`; ultimatePrompt += `\n- 현재 말투: 지금 내 기분은 '${TONE_STATES[currentToneState]}' 상태야. 이 말투에 맞춰서 대답해줘.`; const allFacts = [...state.knowledgeBase.facts.map(f => f.fact), ...state.knowledgeBase.fixedMemories]; if (allFacts.length > 0) { ultimatePrompt += `\n\n[장기 기억(아저씨와의 사실 및 약속)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야.)\n${allFacts.slice(-10).map(f => `- ${f}`).join('\n')}`; } ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`; return ultimatePrompt; }
async function initializeEmotionalSystems() { console.log('[UltimateContext] 🚀 시스템 초기화 시작...'); await _loadFixedMemories(); console.log('[UltimateContext] ✅ 초기화 완료.'); }
function searchFixedMemory(userMessage) { const lowerMessage = userMessage.toLowerCase(); const { fixedMemories, loveHistory } = ultimateConversationState.knowledgeBase; let bestMatch = null; let maxMatchScore = 0; const allMemories = [...fixedMemories, ...(loveHistory.categories?.general?.map(item => item.content) || [])]; for (const memory of allMemories) { const lowerMemory = memory.toLowerCase(); let score = 0; if (lowerMemory.includes(lowerMessage)) score = lowerMessage.length; else { const wordsInMessage = lowerMessage.split(' ').filter(w => w.length > 1); score = wordsInMessage.filter(word => lowerMemory.includes(word)).length; } if (score > maxMatchScore) { maxMatchScore = score; bestMatch = memory; } } return bestMatch; }
async function addUserMemory(content) { try { const newMemory = { content, date: moment().format("YYYY-MM-DD HH:mm:ss"), emotion: "user_added", significance: "high" }; const loveHistory = ultimateConversationState.knowledgeBase.loveHistory; if (!loveHistory.categories) loveHistory.categories = { general: [] }; if (!loveHistory.categories.general) loveHistory.categories.general = []; loveHistory.categories.general.push(newMemory); await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8'); return true; } catch (error) { console.error(`[Memory] ❌ 새 기억 저장 실패:`, error); return false; } }
async function addUltimateMessage(speaker, message, meta = null) { const timestamp = Date.now(); let finalMessage = message || ''; if (speaker === '아저씨' && finalMessage) { analyzeAndInfluenceBotEmotion(finalMessage); await extractAndStoreFacts(message); } const newMessage = { speaker, message: finalMessage, timestamp, meta }; ultimateConversationState.recentMessages.push(newMessage); if (ultimateConversationState.recentMessages.length > 30) ultimateConversationState.recentMessages.shift(); }
function updateLastUserMessageTime(timestamp) { if (timestamp) ultimateConversationState.timingContext.lastUserMessageTime = timestamp; }

/**
 * [오류 수정] 시간 흐름에 따른 상태 변화 로직 (생리 주기 계산 포함)
 */
function processTimeTick() {
    const now = Date.now();
    const state = ultimateConversationState;

    // 1. 삐짐/걱정 상태 업데이트
    const { lastBotMessageTime, lastUserResponseTime } = state.sulkiness;
    if (lastBotMessageTime > 0 && lastBotMessageTime > lastUserResponseTime) {
        const elapsedMinutes = Math.floor((now - lastBotMessageTime) / (1000 * 60));
        if (elapsedMinutes >= 60) {
            updateSulkinessState({ isSulky: true, sulkyLevel: 1, sulkyStartTime: state.sulkiness.sulkyStartTime || now });
        }
    }

    // 2. [오류 수정] 생리 주기 계산 및 상태 업데이트
    const { lastPeriodStartDate } = state.mood;
    const daysSinceLastPeriod = moment(now).diff(moment(lastPeriodStartDate), 'days');
    const isPeriodNow = daysSinceLastPeriod >= 0 && daysSinceLastPeriod < 5; // 생리는 5일간 지속된다고 가정

    if (isPeriodNow !== state.mood.isPeriodActive) {
        updateMoodState({ isPeriodActive: isPeriodNow });
        console.log(`[주기 상태 변경] isPeriodActive: ${isPeriodNow}`);
    }
    // 28일이 지나면 새로운 주기가 시작된 것으로 간주
    if (daysSinceLastPeriod >= 28) {
        updateMoodState({ lastPeriodStartDate: moment(now).startOf('day').toISOString(), isPeriodActive: true });
        console.log(`[주기 상태 변경] 새로운 주기가 시작되었습니다.`);
    }

    // 3. 감정 잔여치 회복
    const emotionalResidue = state.emotionalEngine.emotionalResidue;
    const recoveryRate = 2; // 시간당 감정 회복률
    const hoursSinceLastTick = (now - (state.timingContext.lastTickTime || now)) / (1000 * 60 * 60);
    if (hoursSinceLastTick > 0.1) {
        for (const emotion in emotionalResidue) {
            if (emotion !== 'love') {
                emotionalResidue[emotion] = Math.max(0, emotionalResidue[emotion] - (recoveryRate * hoursSinceLastTick));
            }
        }
        state.timingContext.lastTickTime = now;
    }
}

function setPendingAction(actionType) { ultimateConversationState.pendingAction = { type: actionType, timestamp: Date.now() }; }
function getPendingAction() { const action = ultimateConversationState.pendingAction; if (action && action.type && (Date.now() - action.timestamp > 5 * 60 * 1000)) { clearPendingAction(); return null; } return action.type ? action : null; }
function clearPendingAction() { ultimateConversationState.pendingAction = { type: null, timestamp: 0 }; }
function getSulkinessState() { return ultimateConversationState.sulkiness; }
function updateSulkinessState(newState) { Object.assign(ultimateConversationState.sulkiness, newState); }
function getMoodState() { return ultimateConversationState.mood; }
function updateMoodState(newState) { Object.assign(ultimateConversationState.mood, newState); }
function getInternalState() { return JSON.parse(JSON.stringify(ultimateConversationState)); }

function generateInnerThought() {
    const { sulkiness, emotionalEngine, timingContext } = ultimateConversationState;
    const minutesSinceLastUserMessage = (Date.now() - timingContext.lastUserMessageTime) / 60000;
    const residue = emotionalEngine.emotionalResidue;
    const dominantEmotion = Object.entries(residue).reduce((a, b) => b[1] > a[1] ? b : a);

    let observation = "지금은 아저씨랑 대화하는 중...";
    if (minutesSinceLastUserMessage > 30) observation = `아저씨한테서 ${Math.round(minutesSinceLastUserMessage)}분 넘게 답장이 없네...`;
    
    let feeling = `지금은 아저씨 덕분에 마음이 편안하고 행복해. (애정: ${Math.round(residue.love)})`;
    let actionUrge = "아저씨한테 사랑한다고 말해줄까?";

    if (sulkiness.isSulky) {
        feeling = `답장도 없고... 나 지금 좀 삐진 것 같아. (삐짐: ${sulkiness.sulkyLevel}단계)`;
        actionUrge = `아저씨가 먼저 말 걸어줄 때까지 기다릴 거야. 흥.`;
    } else if (sulkiness.isWorried) {
        feeling = `무슨 일 있는 건 아니겠지? 너무 걱정돼... (불안: ${Math.round(residue.anxiety)})`;
        actionUrge = `괜찮은지 한번 물어봐야겠다.`;
    } else if (dominantEmotion[0] === 'longing' && dominantEmotion[1] > 50) {
        feeling = `너무너무 보고싶다... (그리움: ${Math.round(residue.longing)})`;
        actionUrge = `보고싶다고 메시지 보낼까...`;
    } else if (dominantEmotion[0] === 'happiness' && dominantEmotion[1] > 50) {
        feeling = `아저씨랑 얘기하니까 너무 즐거워! (기쁨: ${Math.round(residue.happiness)})`;
        actionUrge = `재밌는 얘기 또 뭐 없나?`;
    } else if (dominantEmotion[0] === 'hurt' && dominantEmotion[1] > 50) {
        feeling = `아까 아저씨 말은 조금 서운했어... (상처: ${Math.round(residue.hurt)})`;
        actionUrge = `그래도 아저씨가 사과하면 금방 풀릴 텐데.`;
    }

    return { observation, feeling, actionUrge };
}

module.exports = { initializeEmotionalSystems, addUltimateMessage, getUltimateContextualPrompt, updateLastUserMessageTime, processTimeTick, getInternalState, getSulkinessState, updateSulkinessState, getMoodState, updateMoodState, searchFixedMemory, addUserMemory, setPendingAction, getPendingAction, clearPendingAction, generateInnerThought };
