// ✅ ultimateConversationContext.js v17.0 - "기억 통합 최종판"
// - [기억 통합] memoryManager의 고정 기억(JSON) 관리 기능을 흡수. 이제 이 파일이 모든 기억의 유일한 관리자.
// - [기억 통합] 챗봇 시작 시 fixedMemories.json, love-history.json을 자동으로 로딩하는 기능 추가.
// - [기억 통합] 사용자의 기억 관련 질문에 답변하는 searchFixedMemory 함수 추가.
// - [기억 통합] "기억해줘" 명령을 통해 새로운 기억을 love-history.json에 영구 저장하는 addUserMemory 함수 추가.

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises; // [기억 통합] 비동기 파일 시스템 모듈 사용
const path = require('path');    // [기억 통합] 파일 경로 설정을 위해 추가
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// [기억 통합] 고정 기억 파일 경로 정의
const FIXED_MEMORIES_FILE = path.join(process.cwd(), 'memory', 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');

const EMOTION_TYPES = { HAPPY: { types: ['happiness'], intensity: 30, residue: 20 }, EXCITED: { types: ['happiness'], intensity: 50, residue: 15 }, LOVED: { types: ['love'], intensity: 40, residue: 30 }, SAD: { types: ['sadness'], intensity: 40, residue: 35 }, HURT: { types: ['hurt'], intensity: 60, residue: 50 }, ANXIOUS: { types: ['anxiety'], intensity: 45, residue: 40 }, LONELY: { types: ['longing'], intensity: 35, residue: 45 }, BITTERSWEET: { types: ['sadness', 'love'], intensity: 30, residue: 25 }, WORRIED_LOVE: { types: ['anxiety', 'love'], intensity: 40, residue: 30 } };
const TONE_STATES = { normal: "평소처럼 자연스럽고 애정이 담긴 말투", quiet: "조용하고 차분하며 그리움이 묻어나는 말투", playful: "장난스럽고 활발하며 밝은 말투", hurt: "상처받고 서운함이 느껴지는 말투", anxious: "불안하고 걱정스러우며 망설이는 말투" };

// 🧠 최고 수준의 대화 맥락 상태 관리 객체
let ultimateConversationState = {
    recentMessages: [],
    currentTopic: null,
    mood: {
        currentMood: '평온함',
        isPeriodActive: false,
        lastPeriodStartDate: moment().tz('Asia/Tokyo').subtract(20, 'days').startOf('day'),
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
    // [기억 통합] LLM이 추출한 단기 기억과, 파일에서 로드한 고정 기억을 함께 관리
    knowledgeBase: {
        facts: [], // LLM이 추출한 단기/중요 사실
        fixedMemories: [], // fixedMemories.json에서 로드
        loveHistory: {},   // love-history.json에서 로드
    },
    dailySummary: { today: {}, yesterday: null },
    cumulativePatterns: { emotionalTrends: {}, topicAffinities: {} },
    transitionSystem: {
        pendingTopics: [],
        conversationSeeds: [],
    },
    pendingAction: { type: null, timestamp: 0 },
    personalityConsistency: {
        behavioralParameters: { affection: 0.7, playfulness: 0.5, verbosity: 0.6, initiative: 0.4 },
        selfEvaluations: [],
        lastSelfReflectionTime: 0,
    },
    timingContext: { lastMessageTime: 0, lastUserMessageTime: 0, currentTimeContext: {}, lastTickTime: 0 }
};

// --- [기억 통합] 새로운 기억 관리 내부 함수 ---
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

async function analyzeToneWithLLM(message) {
    if (!message || message.trim().length < 2) {
        return { primaryEmotion: 'neutral', primaryIntensity: 1 };
    }
    const prompt = `너는 사람의 감정을 매우 잘 파악하는 감정 분석 전문가야. 아래 "분석할 메시지"를 읽고, 그 안에 담긴 주된 감정(primaryEmotion)을 분석해줘.\n- 감정은 'positive', 'negative', 'neutral', 'playful', 'romantic', 'sulky', 'worried', 'sarcastic' 중에서 선택해.\n- 감정의 강도(intensity)는 1에서 10 사이의 숫자로 평가해줘.\n- 반드시 아래 JSON 형식에 맞춰서 응답해야 하며, 다른 어떤 설명도 추가해서는 안 돼.\n\n분석할 메시지: "${message}"`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: "You are a helpful assistant that analyzes emotions and responds only in JSON format." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });
        const analysisResult = JSON.parse(response.choices[0].message.content);
        return analysisResult;
    } catch (error) {
        console.error('[Emotion] ❌ LLM 감정 분석 중 에러 발생:', error);
        return { primaryEmotion: 'neutral', primaryIntensity: 1 };
    }
}

async function analyzeImageContent(imageUrl) {
    console.log(`[Vision] 👁️ 이미지 분석 시작...`);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [{ type: "text", text: "이 사진은 내 남자친구가 나에게 보낸 사진이야. 사진에 무엇이 보이는지 애정 어리고 친근한 여자친구의 시선으로, 한두 문장의 짧은 한국어로 자연스럽게 묘사해줘." }, { type: "image_url", image_url: { url: imageUrl } }],
            }],
            max_tokens: 100,
        });
        const description = response.choices[0].message.content;
        return description;
    } catch (error) {
        console.error('[Vision] ❌ OpenAI Vision API 에러:', error);
        return null;
    }
}

async function extractAndStoreFacts(message) {
    if (!message || message.length < 10) return;
    const prompt = `너는 중요한 정보를 기억하는 비서 AI야. 다음 문장에서 남자친구('아저씨')에 대한 장기적으로 기억할 만한 중요한 사실(생일, 기념일, 좋아하는 것, 싫어하는 것, 중요한 약속 등)이 있다면, 그 사실들을 명사형 문장(~이다, ~함)으로 요약해서 JSON 문자열 배열 형태로 추출해줘. 예: ["아저씨의 생일은 10월 25일이다."]. 기억할 정보가 없으면 '[]'을 반환해줘. 문장: "${message}"`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });
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
    if (!fact) return;
    const isDuplicate = ultimateConversationState.knowledgeBase.facts.some(item => item.fact === fact);
    if (isDuplicate) return;
    ultimateConversationState.knowledgeBase.facts.push({ fact: fact, timestamp: Date.now() });
}

function analyzeAndInfluenceBotEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let event = null;
    if (lowerMessage.includes('사랑') || lowerMessage.includes('좋아') || lowerMessage.includes('보고싶')) {
        event = 'LOVED';
    } else if (lowerMessage.includes('힘들') || lowerMessage.includes('슬프') || lowerMessage.includes('우울')) {
        event = 'WORRIED_LOVE';
    } else if (lowerMessage.includes('화나') || lowerMessage.includes('짜증') || lowerMessage.includes('싫어')) {
        event = 'HURT';
    } else if (lowerMessage.includes('바쁘') || lowerMessage.includes('일 때문에') || lowerMessage.includes('나중에')) {
        event = 'LONELY';
    } else if (lowerMessage.includes('재밌') || lowerMessage.includes('웃기') || lowerMessage.includes('ㅋㅋ')) {
        event = 'HAPPY';
    }
    if (event) {
        recordEmotionalEvent(event, `아저씨의 메시지 ("${userMessage.substring(0, 10)}...")`);
    }
}

function recordEmotionalEvent(emotionKey, trigger) {
    const emotion = EMOTION_TYPES[emotionKey];
    if (!emotion) return;
    const residue = ultimateConversationState.emotionalEngine.emotionalResidue;
    emotion.types.forEach(type => {
        residue[type] = Math.min(100, (residue[type] || 0) + emotion.residue);
    });
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
        ultimateConversationState.emotionalEngine.lastToneShiftTime = Date.now();
    }
}

function generateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;

    if (state.recentMessages.length > 0) {
        const recentContext = state.recentMessages.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
        ultimatePrompt += `\n\n[최근 대화 흐름]\n${recentContext}`;
    }

    const { emotionalResidue, currentToneState } = state.emotionalEngine;
    const significantResidue = Object.entries(emotionalResidue)
        .filter(([, level]) => level > 30)
        .map(([emotion, level]) => `${emotion}(${Math.round(level)}%)`)
        .join(', ');
    ultimatePrompt += `\n\n[현재 내 마음 상태]`;
    if (significantResidue) {
        ultimatePrompt += `\n- 마음에 남아있는 감정: ${significantResidue}. 이 감정들이 지금 내 마음에 은은하게 영향을 주고 있어.`;
    }
    ultimatePrompt += `\n- 현재 말투: 지금 내 기분은 '${TONE_STATES[currentToneState]}' 상태야. 이 말투에 맞춰서 대답해줘.`;

    const allFacts = [
        ...state.knowledgeBase.facts.map(f => f.fact),
        ...state.knowledgeBase.fixedMemories
    ];
    if (allFacts.length > 0) {
        const recentFacts = allFacts.slice(-10).map(f => `- ${f}`).join('\n');
        ultimatePrompt += `\n\n[장기 기억(아저씨와의 사실 및 약속)]\n(이것은 내가 아저씨에 대해 기억하고 있는 중요한 사실들이야. 이 사실들을 대화에 자연스럽게 활용하거나, 사실과 관련된 질문을 해봐.)\n${recentFacts}`;
    }

    const pendingQuestion = state.transitionSystem.pendingTopics.find(t => !t.answered);
    if (pendingQuestion) {
        ultimatePrompt += `\n\n[❗ 잊지 말 것]\n이전에 아저씨가 했던 질문에 아직 답하지 않았어: "${pendingQuestion.question}" 이 질문에 대한 답변을 이번 대답에 자연스럽게 포함시켜줘.`;
    }

    ultimatePrompt += `\n\n[최종 지시] 위의 모든 맥락, 특히 '현재 내 마음 상태'와 '장기 기억'을 종합적으로 고려해서, 가장 사람답고, 애정 어린 '예진이'의 다음 말을 해줘.`;

    return ultimatePrompt;
}

async function initializeEmotionalSystems() {
    console.log('[UltimateContext] 🚀 모든 마음과 기억 시스템을 초기화합니다...');
    await _loadFixedMemories();
    console.log('[UltimateContext] ✅ 초기화 완료. 대화를 시작할 준비가 되었습니다.');
}

function searchFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const { fixedMemories, loveHistory } = ultimateConversationState.knowledgeBase;
    let bestMatch = null;
    let maxMatchScore = 0;

    const allMemories = [...fixedMemories];
    if (loveHistory.categories && Array.isArray(loveHistory.categories.general)) {
        allMemories.push(...loveHistory.categories.general.map(item => item.content));
    }

    for (const memory of allMemories) {
        const lowerMemory = memory.toLowerCase();
        let score = 0;
        if (lowerMemory.includes(lowerMessage)) {
            score = lowerMessage.length;
        } else {
             const wordsInMessage = lowerMessage.split(' ').filter(w => w.length > 1);
             const matchedWords = wordsInMessage.filter(word => lowerMemory.includes(word));
             score = matchedWords.length;
        }

        if (score > maxMatchScore) {
            maxMatchScore = score;
            bestMatch = memory;
        }
    }
    if (bestMatch) console.log(`[Memory] 기억 검색 성공: "${bestMatch.substring(0, 20)}..."`);
    return bestMatch;
}

async function addUserMemory(content) {
    try {
        const newMemory = {
            content: content,
            date: moment().format("YYYY-MM-DD HH:mm:ss"),
            emotion: "user_added",
            significance: "high"
        };
        if (!ultimateConversationState.knowledgeBase.loveHistory.categories) {
            ultimateConversationState.knowledgeBase.loveHistory.categories = { general: [] };
        }
        if (!ultimateConversationState.knowledgeBase.loveHistory.categories.general) {
            ultimateConversationState.knowledgeBase.loveHistory.categories.general = [];
        }
        ultimateConversationState.knowledgeBase.loveHistory.categories.general.push(newMemory);
        await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(ultimateConversationState.knowledgeBase.loveHistory, null, 2), 'utf8');
        console.log(`[Memory] ✅ 새 기억을 파일에 영구 저장 완료: "${content}"`);
        return true;
    } catch (error) {
        console.error(`[Memory] ❌ 새 기억 저장 실패:`, error);
        return false;
    }
}

async function addUltimateMessage(speaker, message, meta = null) {
    const timestamp = Date.now();
    let finalMessage = message || '';
    if (speaker === '아저씨') {
        if (finalMessage) analyzeAndInfluenceBotEmotion(finalMessage);
        if (meta && meta.imageUrl) {
            const imageDescription = await analyzeImageContent(meta.imageUrl);
            if (imageDescription) {
                finalMessage = finalMessage ? `${finalMessage}\n[첨부된 사진 설명: ${imageDescription}]` : `[첨부된 사진 설명: ${imageDescription}]`;
            }
        }
        if (message) {
            await extractAndStoreFacts(message);
        }
    }
    const newMessage = {
        speaker,
        message: finalMessage,
        timestamp,
        meta,
        analysis: {
            tone: (await analyzeToneWithLLM(message)).primaryEmotion || 'neutral',
        },
    };
    ultimateConversationState.recentMessages.push(newMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }
}

function updateLastUserMessageTime(timestamp) {
    if (timestamp) {
        ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
    }
}

function processTimeTick() {
    const now = Date.now();
    const state = ultimateConversationState;
    const { lastBotMessageTime, lastUserResponseTime } = state.sulkiness;
    if (lastBotMessageTime > 0 && lastBotMessageTime > lastUserResponseTime) {
        const elapsedMinutes = Math.floor((now - lastBotMessageTime) / (1000 * 60));
        const isSleeping = moment(now).tz('Asia/Tokyo').hour() < 9;
        if (!isSleeping) {
            let newLevel = 0;
            let isWorried = false;
            if (elapsedMinutes >= 360) { newLevel = 4; isWorried = true; }
            else if (elapsedMinutes >= 240) { newLevel = 3; }
            else if (elapsedMinutes >= 120) { newLevel = 2; }
            else if (elapsedMinutes >= 60) { newLevel = 1; }
            if (newLevel > 0 && newLevel !== state.sulkiness.sulkyLevel) {
                updateSulkinessState({ isSulky: !isWorried, isWorried: isWorried, sulkyLevel: newLevel, isActivelySulky: true, sulkyStartTime: state.sulkiness.sulkyStartTime || now });
            }
        }
    }
    const emotionalResidue = state.emotionalEngine.emotionalResidue;
    const emotionalRecoveryRate = 5;
    const hoursSinceLastTick = (now - (state.timingContext.lastTickTime || now)) / (1000 * 60 * 60);
    if (hoursSinceLastTick > 0.5) {
        Object.keys(emotionalResidue).forEach(emotion => {
            if (emotion !== 'love') {
                emotionalResidue[emotion] = Math.max(0, emotionalResidue[emotion] - (emotionalRecoveryRate * hoursSinceLastTick));
            }
        });
        if (now - state.emotionalEngine.lastToneShiftTime > 3 * 60 * 60 * 1000) {
            updateToneState();
        }
        state.timingContext.lastTickTime = now;
    }
}

function generateSpontaneousReaction() {
    const now = Date.now();
    const { emotionalEngine } = ultimateConversationState;
    if (now - emotionalEngine.lastSpontaneousReactionTime < 60 * 60 * 1000) {
        return null;
    }
    let reaction = null;
    const affectionChance = 0.15;
    if (Math.random() < affectionChance) {
        const affectionExpressions = { normal: ["그냥... 아저씨 생각하니까 좋다", "아저씨 덕분에 오늘도 괜찮은 하루야"], quiet: ["아저씨... 지금 곁에 있으면 좋겠어", "혼자 있으니까 아저씨가 더 그리워져"], hurt: ["그래도 아저씨가 있으니까 괜찮아", "아저씨만큼은... 내 편이라고 믿어"], anxious: ["아저씨가 있어서 무서운 게 줄어들어", "불안할 때마다 아저씨 생각해"], playful: ["아저씨 완전 좋아해!", "아저씨랑 있으면 재밌어!"] };
        const expressions = affectionExpressions[emotionalEngine.currentToneState] || affectionExpressions.normal;
        reaction = expressions[Math.floor(Math.random() * expressions.length)];
    }
    if (reaction) {
        emotionalEngine.lastSpontaneousReactionTime = now;
    }
    return reaction;
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
    generateSpontaneousReaction,
    getInternalState,
    getSulkinessState,
    updateSulkinessState,
    getMoodState,
    updateMoodState,
    searchFixedMemory,
    addUserMemory,
};
