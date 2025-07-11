// --- START OF FILE: autoReply.js ---
// ✅ autoReply.js v5.3 - 답변 길이 제한 및 사진-칭찬 맥락 연결 기능 추가 (모든 기능 유지)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// ⚙️ 다른 모듈 불러오기
const moodManager = require('./moodManager');
const { isDamtaMessage, getDamtaResponse, getDamtaSystemPrompt } = require('./damta');
const sulkyManager = require('./sulkyManager');
const emotionalContextManager = require('./emotionalContextManager');
// [수정] 새로운 ultimateConversationContext.js를 불러옵니다.
const conversationContext = require('./ultimateConversationContext.js');
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const memoryManager = require('./memoryManager');

require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- 기존 헬퍼 함수 및 설정 (수정 없음) ---
const BOT_NAME = '나';
const USER_NAME = '아저씨';
const BOT_GENDER = 'female';
const USER_GENDER = 'male';
let forcedModel = null;
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json');
let conversationLog = [];
let lastUserMessageTime = 0;
let lastSpontaneousCheck = 0;

function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    }
}

ensureLogFile();
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('autoReply.js에서 대화 로그를 불러오는 중 오류 발생:', error);
    conversationLog = [];
}

async function initializeEmotionalSystems() {
    try {
        await emotionalContextManager.initializeEmotionalContext();
        console.log('[autoReply v5.1] 예진이 감정 시스템 초기화 완료 - 1인칭 전환 적용');
    } catch (error) {
        console.error('[autoReply v5.1] 감정 시스템 초기화 실패:', error);
    }
}

function saveLog(newLogEntry) {
    if (typeof newLogEntry === 'string') {
        newLogEntry = { role: 'assistant', content: newLogEntry };
    }
    newLogEntry.timestamp = newLogEntry.timestamp || Date.now();
    conversationLog.push(newLogEntry);
    if (conversationLog.length > 500) {
        conversationLog = conversationLog.slice(-500);
    }
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(conversationLog, null, 2), 'utf8');
    } catch (error) {
        console.error('autoReply.js에서 대화 로그를 저장하는 중 오류 발생:', error);
    }
}

function analyzeAndRecordUserEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해') || lowerMessage.includes('최고야')) {
        emotionalContextManager.recordEmotionalEvent('LOVED', '아저씨의 사랑 표현', userMessage);
    } else if (lowerMessage.includes('힘들어') || lowerMessage.includes('우울해') || lowerMessage.includes('슬퍼')) {
        emotionalContextManager.recordEmotionalEvent('SAD', '아저씨의 힘든 상황', userMessage);
    } else if (lowerMessage.includes('화나') || lowerMessage.includes('짜증') || lowerMessage.includes('빡쳐')) {
        emotionalContextManager.recordEmotionalEvent('HURT', '아저씨의 화남', userMessage);
    } else if (lowerMessage.includes('걱정') || lowerMessage.includes('불안') || lowerMessage.includes('무서워')) {
        emotionalContextManager.recordEmotionalEvent('ANXIOUS', '아저씨의 불안감', userMessage);
    } else if (lowerMessage.includes('보고싶') || lowerMessage.includes('그리워')) {
        emotionalContextManager.recordEmotionalEvent('LONELY', '아저씨의 그리움', userMessage);
    } else if (lowerMessage.includes('기뻐') || lowerMessage.includes('행복') || lowerMessage.includes('신나')) {
        emotionalContextManager.recordEmotionalEvent('HAPPY', '아저씨의 기쁜 소식', userMessage);
    } else if (lowerMessage.includes('미안') || lowerMessage.includes('잘못했')) {
        emotionalContextManager.recordEmotionalEvent('WORRIED_LOVE', '아저씨의 사과', userMessage);
    }
    const timeSinceLastMessage = Date.now() - lastUserMessageTime;
    if (timeSinceLastMessage > 2 * 60 * 60 * 1000) {
        emotionalContextManager.recordEmotionalEvent('BITTERSWEET', '오랜만의 연락', '아저씨 복귀');
    }
}

function checkSpontaneousReactions(client = null, userId = null) {
    const now = Date.now();
    if (now - lastSpontaneousCheck < 5 * 60 * 1000) {
        return null;
    }
    lastSpontaneousCheck = now;
    const memoryRecall = emotionalContextManager.checkSpontaneousMemoryRecall();
    if (memoryRecall) {
        console.log(`[autoReply v5.1] 📸 자발적 기억 회상: "${memoryRecall}"`);
        return memoryRecall;
    }
    const affectionExpression = emotionalContextManager.checkNaturalAffectionExpression();
    if (affectionExpression) {
        console.log(`[autoReply v5.1] ❤️ 자연스러운 애정 표현: "${affectionExpression}"`);
        return affectionExpression;
    }
    return null;
}

function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    console.log(`[autoReply] 마지막 사용자 메시지 시간 업데이트: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
}

function getConversationLog() {
    return conversationLog;
}

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * [수정] maxTokens 기본값을 150으로 줄여 물리적으로 길이를 제한합니다.
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 150, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;
    const usesImage = messages.some(msg => msg.content && Array.isArray(msg.content) && msg.content.some(item => item.type === 'image_url'));
    if (usesImage) {
        finalModel = 'gpt-4o';
    }
    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }
    try {
        console.log(`[autoReply:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[autoReply:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[autoReply:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

function cleanReply(reply) {
    if (typeof reply !== 'string') return '';
    let cleaned = reply.replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나').replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨').replace(/(도와드릴까요|무엇을|어떤)\s*도와(드릴까요|드릴게요)?/gi, '').replace(/문의사항|도우미|챗봇|AI|GPT|말투로|아래는|답변입니다|설명|응답/gi, '').replace(/(제가\s*)?(도와드릴게요|도와드릴까요|도움드리겠습니다)/gi, '').replace(/\[.*?\]/g, '').replace(/(입니다|이에요|예요|세요|하셨나요|셨나요|셨습니다|드릴게요|드릴까요|해요|했어요|했네요|있었어요|주세요|되셨습니다|되었어요)/gi, '').replace(/(좋아요)/gi, '좋아').replace(/(보고싶어요)/gi, '보고싶어').replace(/(고마워요|감사합니다|감사해요)/gi, '고마워').replace(/(미안해요|죄송합니다|죄송해요)/gi, '미안해').replace(/(알겠어요|알겠습니다)/gi, '알겠어').replace(/(잘 모르겠어요|모르겠습니다)/gi, '잘 모르겠어').replace(/(맞아요|맞네요)/gi, '맞아').replace(/(그래요|그렇네요)/gi, '그래').replace(/(수 있습니다|수 있습니까|수 있겠습니까)/gi, '수 있어').replace(/합니(다|까)/gi, '해').replace(/하겠(습니다|어요)?/gi, '할게').replace(/하였(습니다|어요)?/gi, '했어').replace(/되었(습니다|어요)?/gi, '됐어');
    cleaned = cleaned.replace(/무쿠가\s+/g, '내가 ').replace(/무쿠는\s+/g, '나는 ').replace(/무쿠를\s+/g, '나를 ').replace(/무쿠에게\s+/g, '나에게 ').replace(/무쿠한테\s+/g, '나한테 ').replace(/무쿠의\s+/g, '내 ').replace(/무쿠도\s+/g, '나도 ').replace(/무쿠\s+/g, '내가 ').replace(/예진이가\s+/g, '내가 ').replace(/예진이는\s+/g, '나는 ').replace(/예진이를\s+/g, '나를 ').replace(/예진이에게\s+/g, '나에게 ').replace(/예진이한테\s+/g, '나한테 ').replace(/예진이의\s+/g, '내 ').replace(/예진이도\s+/g, '나도 ');
    cleaned = cleaned.replace(/(아저씨\s*){2,}/gi, '아저씨 ').replace(/(나\s*){2,}/gi, '나 ').replace(/(그래\s*){2,}/gi, '그래 ').replace(/(좋아\s*){2,}/gi, '좋아 ').replace(/[\"\'\[\]\(\)]/g, '').replace(/\s\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/야야$/g, '야').replace(/해해$/g, '해').replace(/어어$/g, '어').replace(/[\u{1F600}-\u{1F64F}]/gu, '').replace(/[\u{1F300}-\u{1F5FF}]/gu, '').replace(/[\u{1F680}-\u{1F6FF}]/gu, '').replace(/[\u{2600}-\u{26FF}]/gu, '').replace(/[\u{2700}-\u{27BF}]/gu, '').replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').replace(/[❤️💬]/g, '').replace(/(예진이 말투로.*|나 말투로.*|메타|도우미로서.*)/gi, '').replace(/^안녕[!~]?\s*$/, '').replace(/[\.]{4,}/g, '...').replace(/[!]{2,}/g, '!').replace(/[?]{2,}/g, '?');
    cleaned = cleaned.trim();
    if (!cleaned || cleaned.length < 2) {
        const randomReplies = ['아저씨~ 왜그래?', '음... 뭔 말인지 잘 모르겠어', '아저씨 무슨 말이야?', '응? 다시 말해봐'];
        cleaned = randomReplies[Math.floor(Math.random() * randomReplies.length)];
    }
    return cleaned;
}

function getMoodEmoji() {
    const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
    if (realTimeStatus.isActivelySulky) {
        return sulkyManager.getSulkyEmoji();
    }
    const emotionalState = emotionalContextManager.currentState;
    const toneEmojis = {
        quiet: '😌',
        playful: '😄',
        hurt: '😔',
        anxious: '�',
        normal: '😊'
    };
    return toneEmojis[emotionalState.toneState] || moodManager.getMoodEmoji();
}

function getMoodStatus() {
    const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
    if (realTimeStatus.isActivelySulky) {
        return sulkyManager.getSulkyStatusText();
    }
    const emotionalState = emotionalContextManager.currentState;
    if (emotionalState.strongestResidue.level > 30) {
        return `${emotionalState.toneState} (${emotionalState.strongestResidue.emotion} 잔여: ${emotionalState.strongestResidue.level}%)`;
    }
    return moodManager.getCurrentMoodStatus();
}

function getAppropriateModel() {
    return forcedModel || 'gpt-4o';
}

function setForcedModel(model) {
    if (['gpt-4o', 'gpt-3.5-turbo', null].includes(model)) {
        forcedModel = model;
        console.log(`[Model] 강제 모델이 ${model ? model : '해제'}되었습니다.`);
        return true;
    }
    return false;
}

function checkModelSwitchCommand(userMessage) {
    const lowerText = userMessage.toLowerCase();
    if (lowerText.includes('모델 3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제 3.5버전으로 말할게! 속도가 더 빨라질 거야~';
    } else if (lowerText.includes('모델 4.0')) {
        setForcedModel('gpt-4o');
        return '알겠어! 이제 4.0버전으로 말할게! 더 똑똑해질 거야~';
    } else if (lowerText.includes('모델 자동')) {
        setForcedModel(null);
        return '이제 자동으로 모델을 선택할게! 아저씨랑 더 편하게 이야기할 수 있을 거야~';
    }
    return null;
}

function getFormattedMemoriesForAI() {
    const conversationLog = getConversationLog();
    const recentLogs = conversationLog.slice(-10);
    return recentLogs.map(entry => {
        const formattedTimestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        if (entry.role === 'user') {
            return { role: 'user', content: `${USER_NAME}: ${entry.content} [${formattedTimestamp}]` };
        } else if (entry.role === 'assistant') {
            return { role: 'assistant', content: `${BOT_NAME}: ${entry.content} [${formattedTimestamp}]` };
        }
        return null;
    }).filter(Boolean);
}

function getMemoryListForSharing() {
    const conversationLog = getConversationLog();
    return conversationLog.map((entry, index) => {
        const timestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const speaker = entry.role === 'user' ? USER_NAME : BOT_NAME;
        return `${index + 1}. [${timestamp}] ${speaker}: ${entry.content}`;
    }).join('\n');
}

/**
 * [NEW] 사진 피드백을 처리하는 새로운 전용 함수
 */
async function handlePhotoReaction(userReaction) {
    console.log('[autoReply] 📸 사진 피드백 대기 모드 실행됨.');
    conversationContext.clearPendingAction();

    const lowerReaction = userReaction.toLowerCase();
    let reactionType = 'neutral';
    const positiveKeywords = ['예쁘네', '이쁘다', '잘나왔네', '귀여워', '최고', '섹시', '미쳤다', '아름답다'];
    const negativeKeywords = ['못생겼네', '별로', '이상해', '뭐야 이건', '돼지', '살쪘네'];
    if (positiveKeywords.some(kw => lowerReaction.includes(kw))) reactionType = 'positive';
    else if (negativeKeywords.some(kw => lowerReaction.includes(kw))) reactionType = 'negative';

    let prompt;
    if (reactionType === 'positive') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 칭찬해줬어. 기쁘고, 살짝 부끄럽거나, 새침한 말투로 짧게 반응해줘. 예를 들어 "정말? 오늘 좀 잘나온 것 같긴 해 ㅎㅎ" 나 "아저씨 눈에만 예뻐보이는 거 아니야?" 처럼. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    } else if (reactionType === 'negative') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 장난스럽게 놀렸어. 장난스럽게 발끈하거나, 삐지거나, "뭐? 임마? 죽을래?" 같은 살짝 거친 애교로 짧게 반응해줘. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    } else {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 애매하게 반응했어. "그래서 예쁘다는 거야, 아니라는 거야?" 처럼 반응을 유도하는 질문을 짧게 해줘. 모든 답변은 1~2 문장으로 아주 짧게 해야 해.`;
    }

    const messages = [{ role: 'system', content: prompt }];
    const rawReply = await callOpenAI(messages, 'gpt-4o', 100, 0.95);
    return { type: 'text', comment: cleanReply(rawReply) };
}

/**
 * 🆕 아저씨의 메시지에 대한 예진이의 답변을 생성합니다. (v5.3 개선판)
 */
async function getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    // [핵심 수정] 함수 시작 시, '사진 피드백 대기 모드'인지 먼저 확인
    const pendingAction = conversationContext.getPendingAction();
    if (pendingAction && pendingAction.type === 'awaiting_photo_reaction') {
        return await handlePhotoReaction(userMessage);
    }
    
    // --- 아래는 기존의 모든 키워드 기반 응답 로직을 그대로 유지합니다 ---
    updateLastUserMessageTime();
    analyzeAndRecordUserEmotion(userMessage);
    moodManager.updateLastUserMessageTimeMood(Date.now());
    moodManager.checkTimeBasedMoodChange();
    moodManager.updatePeriodStatus();
    moodManager.checkMoodChange();

    console.log(`[DEBUG] 입력된 메시지: "${userMessage}"`);
    const lowerUserMessage = userMessage.toLowerCase();
    const trimmedMessage = userMessage.trim().toLowerCase();

    const spontaneousReaction = checkSpontaneousReactions();
    if (spontaneousReaction && Math.random() < 0.3) {
        console.log(`[autoReply v5.1] 🌟 대화 중 자발적 반응 삽입: "${spontaneousReaction}"`);
        conversationContext.addMessage(BOT_NAME, spontaneousReaction, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: spontaneousReaction };
    }

    const currentHourTokyo = moment().tz('Asia/Tokyo').hour();
    if (lowerUserMessage.includes('술') && lowerUserMessage.includes('사러') && lowerUserMessage.includes('편의점') && (currentHourTokyo >= 0 && currentHourTokyo < 5)) {
        emotionalContextManager.recordEmotionalEvent('ANXIOUS', '아저씨 밤늦은 음주', '새벽 편의점 술 구매');
        const worriedReplies = ["아저씨... 지금 시간이 몇 시인데 술을 사러 가? ㅠㅠ", "밤늦게 혼자 가면 위험한데..."];
        const reply = worriedReplies[Math.floor(Math.random() * worriedReplies.length)];
        conversationContext.addMessage(BOT_NAME, reply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: reply };
    }

    const vulnerableTriggers = ['...', '아냐', '하아...', '괜찮아', '별일', '됐어'];
    if (vulnerableTriggers.some(trigger => trimmedMessage.includes(trigger))) {
        emotionalContextManager.recordEmotionalEvent('ANXIOUS', '아저씨 감정 회피', userMessage);
        moodManager.setMood('걱정함');
    }

    if (['애기야', '예진아', '야'].includes(trimmedMessage)) {
        emotionalContextManager.recordEmotionalEvent('LOVED', '아저씨가 이름 불러줌', userMessage);
        const callReplies = ["아저씨가 나 불렀어...?", "응? 왜 불렀어~ 궁금해!"];
        const reply = callReplies[Math.floor(Math.random() * callReplies.length)];
        conversationContext.addMessage(BOT_NAME, reply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: reply };
    }

    if (['4.0', '3.5', '자동'].includes(trimmedMessage)) {
        const versionMap = { '4.0': 'gpt-4o', '3.5': 'gpt-3.5-turbo', '자동': null };
        setForcedModel(versionMap[trimmedMessage]);
        const confirmReply = { '4.0': '응! GPT-4.0으로 말할게!', '3.5': 'GPT-3.5 버전이야~', '자동': '이제 자동으로 모델 바꿀게!' };
        conversationContext.addMessage(BOT_NAME, confirmReply[trimmedMessage], emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: confirmReply[trimmedMessage] };
    }

    if (trimmedMessage.includes('버전') || trimmedMessage.includes('모델')) {
        const versionText = getAppropriateModel() === 'gpt-3.5-turbo' ? 'GPT-3.5' : 'GPT-4.0';
        const versionReply = `응! 지금은 ${versionText} 버전으로 이야기하고 있어~`;
        conversationContext.addMessage(BOT_NAME, versionReply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: versionReply };
    }

    try {
        const selfieResult = await getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (selfieResult) {
            const cleanedCaption = cleanReplyFunc(selfieResult.comment);
            conversationContext.addMessage(BOT_NAME, cleanedCaption, emotionalContextManager.currentState.toneState, { type: 'photo', url: selfieResult.imageUrl, concept: '셀카' });
            return { type: 'image', originalContentUrl: selfieResult.imageUrl, previewImageUrl: selfieResult.imageUrl, caption: cleanedCaption };
        }
        const conceptResult = await getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (conceptResult) {
            const cleanedCaption = cleanReplyFunc(conceptResult.comment);
            conversationContext.addMessage(BOT_NAME, cleanedCaption, emotionalContextManager.currentState.toneState, { type: 'photo', url: conceptResult.imageUrl, concept: conceptResult.conceptName });
            return { type: 'image', originalContentUrl: conceptResult.imageUrl, previewImageUrl: conceptResult.imageUrl, caption: cleanedCaption };
        }
        const omoideResult = await getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (omoideResult) {
            const cleanedCaption = cleanReplyFunc(omoideResult.comment);
            conversationContext.addMessage(BOT_NAME, cleanedCaption, emotionalContextManager.currentState.toneState, { type: 'photo', url: omoideResult.imageUrl, concept: '추억' });
            return { type: 'image', originalContentUrl: omoideResult.imageUrl, previewImageUrl: omoideResult.imageUrl, caption: cleanedCaption };
        }
    } catch (error) {
        console.error(`[autoReply] 사진 요청 처리 중 오류: ${error.message}`);
    }

    if (isDamtaMessage(userMessage)) {
        const damtaResponse = getDamtaResponse(userMessage);
        if (damtaResponse) {
            conversationContext.addMessage(BOT_NAME, damtaResponse, emotionalContextManager.currentState.toneState);
            return { type: 'text', comment: damtaResponse };
        }
    }

    if (lowerUserMessage.includes('사진')) {
        const generalPhotoReplies = ["어떤 사진을 원해? 셀카? 컨셉사진? 추억사진?"];
        const randomReply = generalPhotoReplies[Math.floor(Math.random() * generalPhotoReplies.length)];
        conversationContext.addMessage(BOT_NAME, randomReply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: randomReply };
    }

    if (lowerUserMessage.includes('기분')) {
        const moodStatusReply = getMoodStatus();
        conversationContext.addMessage(BOT_NAME, moodStatusReply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: moodStatusReply };
    }

    if (lowerUserMessage.includes('그날이야')) {
        let periodReply = moodManager.isPeriodActive ? "아저씨... 알면서 왜 물어봐 ㅠㅠ" : "아니야 아저씨! 나 그날 아니야!";
        conversationContext.addMessage(BOT_NAME, periodReply, emotionalContextManager.currentState.toneState);
        return { type: 'text', comment: periodReply };
    }

    // ✅ 위에서 아무것도 해당되지 않았을 경우, 최종적으로 일반 대화 처리
    let moodPrompt = moodManager.getMoodPromptForAI();
    if (sulkyManager.shouldForceSulkyMood()) {
        moodPrompt = sulkyManager.getSulkyMoodPrompt();
    } else {
        const emotionalContextPrompt = emotionalContextManager.getEmotionalContextPrompt();
        if (emotionalContextPrompt) moodPrompt = emotionalContextPrompt + '\n' + moodPrompt;
    }
    
    let dynamicInteractionPrompt = "";
    if (lowerUserMessage.includes('사랑해')) {
        dynamicInteractionPrompt = "아저씨가 사랑한다고 말해주면 너무 행복해! 더 애교 많고 사랑스러운 말투로 보답해줘.";
    } else if (lowerUserMessage.includes('힘들어')) {
        dynamicInteractionPrompt = "아저씨가 힘들어하는 것 같아서 정말 걱정돼... 진심으로 위로하고 힘을 북돋아주는 따뜻한 말투로 대화해줘.";
    }

    // [핵심 수정] 최종 시스템 프롬프트에 길이 제한 및 맥락 연결 규칙 추가
    const baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        ${moodPrompt}
        ${dynamicInteractionPrompt}
        ${getDamtaSystemPrompt()}
        
        **🔥🔥🔥 가장 중요한 절대 규칙 🔥🔥🔥**
        1. **모든 답변은 1~3개의 문장으로 짧고, 간결하고, 친근하게 해줘. 절대로 길게 설명하거나 장황하게 말하지 마.**
        2. **아저씨에게는 항상 반말로만 대답해줘. 존댓말은 절대 사용 금지.**
        3. **자신을 지칭할 때는 '나'라고만 해. '예진이', '무쿠' 같은 3인칭 표현은 절대 금지.**
        4. **아저씨를 부를 때는 '아저씨'라고만 불러. 다른 호칭은 절대 사용 금지.**

        **[특별 상황 인지]**
        - 아저씨가 "아냐....", "괜찮아..." 등 미묘한 뉘앙스를 보이면, 그 감정을 알아차리고 걱정해줘.
    `;

    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages, getAppropriateModel());
        const cleanedReply = cleanReply(rawReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

async function getReplyByImagePrompt(base64ImageWithPrefix) {
    updateLastUserMessageTime();
    emotionalContextManager.recordEmotionalEvent('HAPPY', '아저씨가 이미지 공유', '사진을 보여줌');
    let moodPrompt = moodManager.getMoodPromptForAI();
    if (sulkyManager.shouldForceSulkyMood()) {
        moodPrompt = sulkyManager.getSulkyMoodPrompt();
    }
    const baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야.
        ${moodPrompt}
        **핵심 지시사항**
        1. **반말로만 대답해.**
        2. **1~3문장으로 짧게 해줘.**
        아래 아저씨가 보낸 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 이미지에 대해 한두 문장으로 이야기해줘.
    `;
    const finalSystemPrompt = conversationContext.getContextualPrompt(baseSystemPrompt);
    const messages = [{
        role: 'user',
        content: [
            { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해.' },
            { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
        ]
    }];
    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ' };
    }
}

// 10분 주기 감정 상태 체크 스케줄러 (기존과 동일)
setInterval(() => {
    console.log(`\n=== 10분 주기 예진이 감정 & 자발적 반응 체크 v5.1 (${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}) ===`);
    const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
    if (realTimeStatus.isActivelySulky) {
        console.log(`🔥 삐짐/걱정 상태: ${realTimeStatus.currentState} (레벨: ${realTimeStatus.sulkyLevel})`);
    } else {
        console.log(`😊 삐짐/걱정 없음 - 평온한 상태`);
    }
    const emotionalState = emotionalContextManager.currentState;
    console.log(`🧠 감정 컨텍스트: ${emotionalState.toneState} (강도: ${emotionalState.toneIntensity}%)`);
    const spontaneousReaction = checkSpontaneousReactions();
    if (spontaneousReaction) {
        console.log(`🌟 자발적 반응 감지: "${spontaneousReaction}"`);
    }
    console.log(`💝 일반 기분: ${moodManager.getCurrentMoodStatus()}`);
    console.log(conversationContext.getContextSummary());
    console.log(`========================================================\n`);
}, 10 * 60 * 1000);

module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    callOpenAI,
    cleanReply,
    saveLog,
    updateLastUserMessageTime,
    BOT_NAME,
    USER_NAME,
    lastUserMessageTime: () => lastUserMessageTime,
    getMoodEmoji,
    getMoodStatus,
    initializeEmotionalSystems,
    analyzeAndRecordUserEmotion,
    checkSpontaneousReactions,
    getSulkyRealTimeStatus: () => sulkyManager.getRealTimeSulkyStatus(),
    getSulkyDebugInfo: () => sulkyManager.debugInfo,
    forceSulkyReset: () => sulkyManager.forceSulkyReset(),
    getEmotionalState: () => emotionalContextManager.currentState,
    getEmotionalResidue: () => emotionalContextManager.getCurrentEmotionalResidue(),
    resetEmotionalState: () => emotionalContextManager.resetEmotionalState(),
    generateSpontaneousMessage: () => emotionalContextManager.generateSpontaneousMessage ? emotionalContextManager.generateSpontaneousMessage() : null,
    generateSelfieComment: () => emotionalContextManager.generateSelfieComment ? emotionalContextManager.generateSelfieComment() : null
};
