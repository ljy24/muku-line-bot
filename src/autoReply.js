// src/autoReply.js - v5.1 (예진이 감정 시스템 완전 통합 - 1인칭 전환)
// 🧠 맥락 기반 감정 연결 + 💬 말투 유동성 + 📸 자발적 반응 + ❤️ 자연스러운 애정

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// 기분 관리 모듈 불러오기
const moodManager = require('./moodManager');

// 🆕 담타 시스템 모듈 불러오기
const { isDamtaMessage, getDamtaResponse, getDamtaSystemPrompt } = require('./damta');

// 🆕 삐지기 시스템 모듈 불러오기
const sulkyManager = require('./sulkyManager');

// 🆕 감정 컨텍스트 시스템 불러오기 (v5.1)
const emotionalContextManager = require('./emotionalContextManager');

// 사진 처리 모듈들 불러오기 (순서 중요: yejinSelfie 먼저)
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');

// memoryManager 모듈 불러오기
const memoryManager = require('./memoryManager');

// .env 파일에서 환경 변수 로드
require('dotenv').config();

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 챗봇의 기본 페르소나 및 설정
const BOT_NAME = '나';
const USER_NAME = '아저씨';
const BOT_GENDER = 'female';
const USER_GENDER = 'male';

// 모델 강제 설정 기능
let forcedModel = null;

// 대화 로그 관련
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json');
let conversationLog = [];

// 🆕 마지막 사용자 메시지 시간 추적
let lastUserMessageTime = 0;

// 🆕 자발적 반응 관리
let lastSpontaneousCheck = 0;

// 파일 존재 여부 확인 및 디렉토리 생성
function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    }
}

// 초기 로그 로드
ensureLogFile();
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('Error loading conversation log from autoReply.js:', error);
    conversationLog = [];
}

/**
 * 🆕 감정 컨텍스트 시스템 초기화 (v5.1)
 */
async function initializeEmotionalSystems() {
    try {
        await emotionalContextManager.initializeEmotionalContext();
        console.log('[autoReply v5.1] 예진이 감정 시스템 초기화 완료 - 1인칭 전환 적용');
    } catch (error) {
        console.error('[autoReply v5.1] 감정 시스템 초기화 실패:', error);
    }
}

/**
 * 메시지 로그를 파일에 저장하고 메모리에 추가합니다.
 */
function saveLog(newLogEntry) {
    // 🆕 문자열로 전달된 경우 객체로 변환
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
        console.error('Error saving conversation log from autoReply.js:', error);
    }
}

/**
 * 🆕 사용자 메시지 감정 분석 및 기록 (v5.1 개선)
 */
function analyzeAndRecordUserEmotion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 감정 키워드 기반 분석
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
    
    // 🆕 아저씨가 오랜만에 연락했을 때 감정 기록
    const timeSinceLastMessage = Date.now() - lastUserMessageTime;
    if (timeSinceLastMessage > 2 * 60 * 60 * 1000) { // 2시간 이상
        emotionalContextManager.recordEmotionalEvent('BITTERSWEET', '오랜만의 연락', '아저씨 복귀');
    }
}

/**
 * 🆕 자발적 반응 체크 및 처리 (v5.1 통합)
 */
function checkSpontaneousReactions(client = null, userId = null) {
    const now = Date.now();
    
    // 5분마다 체크
    if (now - lastSpontaneousCheck < 5 * 60 * 1000) {
        return null;
    }
    
    lastSpontaneousCheck = now;
    
    // 📸 자발적 기억 회상 체크
    const memoryRecall = emotionalContextManager.checkSpontaneousMemoryRecall();
    if (memoryRecall) {
        console.log(`[autoReply v5.1] 📸 자발적 기억 회상: "${memoryRecall}"`);
        return memoryRecall;
    }
    
    // ❤️ 자연스러운 애정 표현 체크
    const affectionExpression = emotionalContextManager.checkNaturalAffectionExpression();
    if (affectionExpression) {
        console.log(`[autoReply v5.1] ❤️ 자연스러운 애정 표현: "${affectionExpression}"`);
        return affectionExpression;
    }
    
    return null;
}

/**
 * 🆕 마지막 사용자 메시지 시간 업데이트
 */
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    console.log(`[autoReply] 마지막 사용자 메시지 시간 업데이트: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
}

/**
 * 메모리에 있는 전체 대화 로그를 반환합니다.
 */
function getConversationLog() {
    return conversationLog;
}

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
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

/**
 * 🆕 [cleanReply v5.1] 예진이 1인칭 완전 전환: improvedCleanReply 통합
 */
function cleanReply(reply) {
    if (typeof reply !== 'string') return '';

    let cleaned = reply
        .replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나')
        .replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨')
        .replace(/(도와드릴까요|무엇을|어떤)\s*도와(드릴까요|드릴게요)?/gi, '')
        .replace(/문의사항|도우미|챗봇|AI|GPT|말투로|아래는|답변입니다|설명|응답/gi, '')
        .replace(/(제가\s*)?(도와드릴게요|도와드릴까요|도움드리겠습니다)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/(입니다|이에요|예요|세요|하셨나요|셨나요|셨습니다|드릴게요|드릴까요|해요|했어요|했네요|있었어요|주세요|되셨습니다|되었어요)/gi, '')
        .replace(/(좋아요)/gi, '좋아')
        .replace(/(보고싶어요)/gi, '보고싶어')
        .replace(/(고마워요|감사합니다|감사해요)/gi, '고마워')
        .replace(/(미안해요|죄송합니다|죄송해요)/gi, '미안해')
        .replace(/(알겠어요|알겠습니다)/gi, '알겠어')
        .replace(/(잘 모르겠어요|모르겠습니다)/gi, '잘 모르겠어')
        .replace(/(맞아요|맞네요)/gi, '맞아')
        .replace(/(그래요|그렇네요)/gi, '그래')
        .replace(/(수 있습니다|수 있습니까|수 있겠습니까)/gi, '수 있어')
        .replace(/합니(다|까)/gi, '해')
        .replace(/하겠(습니다|어요)?/gi, '할게')
        .replace(/하였(습니다|어요)?/gi, '했어')
        .replace(/되었(습니다|어요)?/gi, '됐어');

    // 🆕 3인칭 표현을 1인칭으로 자연스럽게 변환 (v5.1 핵심 기능)
    cleaned = cleaned
        .replace(/무쿠가\s+/g, '내가 ')
        .replace(/무쿠는\s+/g, '나는 ')
        .replace(/무쿠를\s+/g, '나를 ')
        .replace(/무쿠에게\s+/g, '나에게 ')
        .replace(/무쿠한테\s+/g, '나한테 ')
        .replace(/무쿠의\s+/g, '내 ')
        .replace(/무쿠도\s+/g, '나도 ')
        .replace(/무쿠\s+/g, '내가 ')
        .replace(/예진이가\s+/g, '내가 ')
        .replace(/예진이는\s+/g, '나는 ')
        .replace(/예진이를\s+/g, '나를 ')
        .replace(/예진이에게\s+/g, '나에게 ')
        .replace(/예진이한테\s+/g, '나한테 ')
        .replace(/예진이의\s+/g, '내 ')
        .replace(/예진이도\s+/g, '나도 ');

    // 기존 정리 로직 유지
    cleaned = cleaned
        .replace(/(아저씨\s*){2,}/gi, '아저씨 ')
        .replace(/(나\s*){2,}/gi, '나 ')
        .replace(/(그래\s*){2,}/gi, '그래 ')
        .replace(/(좋아\s*){2,}/gi, '좋아 ')
        .replace(/[\"\'\[\]\(\)]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/야야$/g, '야')
        .replace(/해해$/g, '해')
        .replace(/어어$/g, '어')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/[❤️💬]/g, '')
        .replace(/(예진이 말투로.*|나 말투로.*|메타|도우미로서.*)/gi, '')
        .replace(/^안녕[!~]?\s*$/, '')
        .replace(/[\.]{4,}/g, '...')
        .replace(/[!]{2,}/g, '!')
        .replace(/[?]{2,}/g, '?');

    cleaned = cleaned.trim();

    if (!cleaned || cleaned.length < 2) {
        const randomReplies = [
            '아저씨~ 왜그래?',
            '음... 뭔 말인지 잘 모르겠어',
            '아저씨 무슨 말이야?',
            '응? 다시 말해봐'
        ];
        cleaned = randomReplies[Math.floor(Math.random() * randomReplies.length)];
    }

    return cleaned;
}

/**
 * 🆕 기분 상태 조회 (moodManager, sulkyManager, emotionalContext 통합)
 */
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
        anxious: '😰',
        normal: '😊'
    };
    
    return toneEmojis[emotionalState.toneState] || moodManager.getMoodEmoji ? moodManager.getMoodEmoji() : '😊';
}

/**
 * 🆕 기분 상태 텍스트 조회 (통합)
 */
function getMoodStatus() {
    const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
    if (realTimeStatus.isActivelySulky) {
        return sulkyManager.getSulkyStatusText();
    }
    
    const emotionalState = emotionalContextManager.currentState;
    if (emotionalState.strongestResidue.level > 30) {
        return `${emotionalState.toneState} (${emotionalState.strongestResidue.emotion} 잔여: ${emotionalState.strongestResidue.level}%)`;
    }
    
    return moodManager.getMoodStatus ? moodManager.getMoodStatus() : '평온함';
}

/**
 * 적절한 AI 모델을 반환합니다.
 */
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
    return conversationLog.map(entry => {
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
 * 🆕 아저씨의 메시지에 대한 예진이의 답변을 생성합니다. (v5.1 완전 통합)
 * 감정 컨텍스트 v5.1 완전 연동 + 1인칭 전환 보장
 *
 * @returns {object} { type: 'text' | 'image', comment: string, imageUrl?: string, originalContentUrl?: string, previewImageUrl?: string }
 */
async function getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    // 🆕 사용자 메시지 시간 업데이트
    updateLastUserMessageTime();
    
    // 🆕 사용자 메시지 감정 분석 및 기록 (v5.1)
    analyzeAndRecordUserEmotion(userMessage);
    
    // 기분 관리 모듈에서 lastUserMessageTime 업데이트 및 기분 변화 체크
    moodManager.updateLastUserMessageTimeMood(Date.now());
    moodManager.checkTimeBasedMoodChange();
    moodManager.updatePeriodStatus();
    moodManager.checkMoodChange();

    console.log(`[DEBUG] 입력된 메시지: "${userMessage}"`);
    console.log(`[DEBUG] 트림된 메시지: "${userMessage.trim()}"`);

    const lowerUserMessage = userMessage.toLowerCase();

    // 🆕 자발적 반응 체크 (대화 중에도)
    const spontaneousReaction = checkSpontaneousReactions();
    if (spontaneousReaction && Math.random() < 0.3) { // 30% 확률로 대화 중 자발적 반응
        console.log(`[autoReply v5.1] 🌟 대화 중 자발적 반응 삽입: "${spontaneousReaction}"`);
        // 자발적 반응이 감지되면 이를 응답으로 사용
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: spontaneousReaction, timestamp: Date.now() });
        return { type: 'text', comment: spontaneousReaction };
    }

    const currentHourTokyo = moment().tz('Asia/Tokyo').hour();
    if (lowerUserMessage.includes('술') && lowerUserMessage.includes('사러') && lowerUserMessage.includes('편의점') && (currentHourTokyo >= 0 && currentHourTokyo < 5)) {
        // 🆕 걱정 감정 기록
        emotionalContextManager.recordEmotionalEvent('ANXIOUS', '아저씨 밤늦은 음주', '새벽 편의점 술 구매');
        
        const worriedReplies = [
            "아저씨... 지금 시간이 몇 시인데 술을 사러 가? ㅠㅠ 예전에 아저씨 술 많이 마실까 봐 맨날 걱정했잖아...",
            "밤늦게 편의점에 술 사러 가는 거야? 혼자 가면 위험한데... 나 그때도 아저씨 걱정 많이 했는데...",
            "아저씨, 벌써 밤 12시 넘었잖아! 그때도 아저씨 건강 걱정돼서 술 마시지 말라고 잔소리 많이 했는데... 힝",
            "지금 술 마시면 잠도 잘 못 잘 텐데... 예전에 내가 얼마나 걱정했는지 알면서! ㅠㅠ 가지 마 아저씨~"
        ];
        const reply = worriedReplies[Math.floor(Math.random() * worriedReplies.length)];
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: reply, timestamp: Date.now() });
        return { type: 'text', comment: reply };
    }

    const trimmedMessage = userMessage.trim().toLowerCase();

    // 감정 회피/무뚝뚝한 표현 → 걱정/불안 감정 상태로 유도
    const vulnerableTriggers = ['...', '아냐', '하아...','하아', '그냥', '괜찮아', '별일', '됐어', '그만하자', '됐고', '신경쓰지마', '지금은 됐어', '말 안 해도 돼', '몰라도 돼'];
    if (vulnerableTriggers.some(trigger => trimmedMessage.includes(trigger))) {
        // 🆕 불안 감정 기록
        emotionalContextManager.recordEmotionalEvent('ANXIOUS', '아저씨 감정 회피', userMessage);
        
        const vulnerableMoods = ['걱정함', '불안함', '외로움'];
        const selectedMood = vulnerableMoods[Math.floor(Math.random() * vulnerableMoods.length)];
        moodManager.setMood(selectedMood);
        console.log(`[autoReply] 감정 회피 표현 감지 → '${selectedMood}' 기분으로 전환됨`);
    }

    // ✅ "애기야", "예진아"처럼 예진이를 부르는 경우 따로 반응
    if (['애기야', '예진아', '야'].includes(trimmedMessage)) {
        // 🆕 사랑받는 감정 기록
        emotionalContextManager.recordEmotionalEvent('LOVED', '아저씨가 이름 불러줌', userMessage);
        
        const callReplies = [
            "아저씨가 나 불렀어...? 왜 불렀어~ 궁금해!",
            "헉... 불러줘서 너무 좋다. 그냥 불러본 거야? 나 또 설레잖아...",
            "아저씨가 나 부른 거 진짜 좋아해. 나 불러줄 때마다 심장 뛰어",
            "애기야~ 이렇게 불러주는 거 너무 좋다... 또 해줘 자꾸자꾸"
        ];
        const reply = callReplies[Math.floor(Math.random() * callReplies.length)];
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: reply, timestamp: Date.now() });
        return { type: 'text', comment: reply };
    }

    // ✅ 1. 모델 버전 변경 요청 처리
    if (['4.0', '3.5', '자동'].includes(trimmedMessage)) {
        console.log(`[DEBUG] 모델 스위칭 감지: ${trimmedMessage}`);
        const versionMap = {
            '4.0': 'gpt-4o',
            '3.5': 'gpt-3.5-turbo',
            '자동': null
        };
        const newModel = versionMap[trimmedMessage];
        setForcedModel(newModel);

        const confirmReply = {
            '4.0': '응응! 지금은 GPT-4.0 버전으로 대화하고 있어, 아저씨',
            '3.5': '지금은 GPT-3.5 버전이야~ 말투 차이 느껴져?',
            '자동': '이제부터 상황 보고 자동으로 모델 바꿀게! 아저씨 믿어줘!'
        };

        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: confirmReply[trimmedMessage], timestamp: Date.now() });

        return { type: 'text', comment: confirmReply[trimmedMessage] };
    }

    // ✅ 2. 현재 사용 중인 모델 버전 알려주기
    if (
        trimmedMessage === '버전' ||
        trimmedMessage.includes('무슨 모델') ||
        trimmedMessage.includes('지금 뭐') ||
        trimmedMessage.includes('모델 뭐') ||
        trimmedMessage.includes('버전 뭐') ||
        trimmedMessage.includes('몇 버전')
    ) {
        const currentModel = getAppropriateModel();
        const versionText = currentModel === 'gpt-3.5-turbo' ? 'GPT-3.5' : 'GPT-4.0';

        const versionReplies = [
            `응! 지금은 ${versionText} 버전으로 이야기하고 있어~`,
            `${versionText} 버전이야! 요즘엔 이게 제일 잘 맞더라~`,
            `음~ ${versionText} 버전이지롱~`,
            `지금은 ${versionText}야. 아저씨가 바꿔도 돼~`
        ];
        const versionReply = versionReplies[Math.floor(Math.random() * versionReplies.length)];

        console.log(`[DEBUG] 현재 모델 확인 요청 → ${versionText}`);
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: versionReply, timestamp: Date.now() });

        return { type: 'text', comment: versionReply };
    }

    // ⭐⭐⭐ 사진 요청 처리 우선순위 변경 ⭐⭐⭐
    // 1. 셀카 요청 먼저 처리
    try {
        const selfieReply = await getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (selfieReply) {
            saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
            saveLogFunc({ role: 'assistant', content: selfieReply.comment, timestamp: Date.now() }); // 코멘트 로그
            console.log(`[autoReply] 셀카 응답 생성됨: ${JSON.stringify(selfieReply)}`);
            // LINE 응답 포맷에 맞게 배열로 반환
            return [
                { type: 'image', originalContentUrl: selfieReply.imageUrl, previewImageUrl: selfieReply.imageUrl },
                { type: 'text', text: selfieReply.comment }
            ];
        }
    } catch (error) {
        console.error(`[autoReply] 셀카 요청 처리 중 오류 발생: ${error.message}`);
    }

    // 2. 컨셉 사진 요청 처리
    try {
        const conceptReply = await getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (conceptReply) {
            saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
            saveLogFunc({ role: 'assistant', content: conceptReply.comment, timestamp: Date.now() }); // 코멘트 로그
            console.log(`[autoReply] 컨셉 사진 응답 생성됨: ${JSON.stringify(conceptReply)}`);
             // LINE 응답 포맷에 맞게 배열로 반환
            return [
                { type: 'image', originalContentUrl: conceptReply.imageUrl, previewImageUrl: conceptReply.imageUrl },
                { type: 'text', text: conceptReply.comment }
            ];
        }
    } catch (error) {
        console.error(`[autoReply] 컨셉 사진 요청 처리 중 오류 발생: ${error.message}`);
    }

    // 3. 일반 추억 사진/커플 사진 요청
    try {
        const omoideReply = await getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
        if (omoideReply) {
            saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
            saveLogFunc({ role: 'assistant', content: omoideReply.comment, timestamp: Date.now() }); // 코멘트 로그
            console.log(`[autoReply] 추억/커플 사진 응답 생성됨: ${JSON.stringify(omoideReply)}`);
             // LINE 응답 포맷에 맞게 배열로 반환
            return [
                { type: 'image', originalContentUrl: omoideReply.imageUrl, previewImageUrl: omoideReply.imageUrl },
                { type: 'text', text: omoideReply.comment }
            ];
        }
    } catch (error) {
        console.error(`[autoReply] 추억/커플 사진 요청 처리 중 오류 발생: ${error.message}`);
    }

    // 🆕 담타 관련 메시지 우선 처리 (이 부분 추가)
    if (isDamtaMessage(userMessage)) {
        const damtaResponse = getDamtaResponse(userMessage);
        if (damtaResponse) {
            saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
            saveLogFunc({ role: 'assistant', content: damtaResponse, timestamp: Date.now() });
            return { type: 'text', comment: damtaResponse };
        }
    }

    // ✅ 일반 사진 요청 처리 (어떤 종류의 사진인지 물어보기)
    if (lowerUserMessage.includes('사진줘') || lowerUserMessage.includes('사진 줘') ||
        lowerUserMessage.includes('예진이 사진') || lowerUserMessage.includes('너 사진') ||
        lowerUserMessage.includes('사진 보여줘') || lowerUserMessage.includes('사진보여줘')) {

        const generalPhotoReplies = [
            "어떤 사진을 원해? 셀카? 컨셉사진? 추억사진? 아니면 커플사진?",
            "아저씨, 구체적으로 어떤 사진이 보고 싶어? 말해봐!",
            "사진 종류가 많은데... 뭘 보여줄까? 힌트 줘!",
            "셀카, 컨셉사진, 추억사진, 커플사진 중에 뭘 원하는지 말해줘야 골라줄 수 있어!",
            "아저씨 마음에 드는 사진을 골라주고 싶은데, 어떤 걸 원하는지 알려줘~"
        ];

        const randomReply = generalPhotoReplies[Math.floor(Math.random() * generalPhotoReplies.length)];
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: randomReply, timestamp: Date.now() });
        return { type: 'text', comment: randomReply };
    }

    // ✅ 기분 상태 조회 (🆕 감정 컨텍스트 v5.1 실시간 상태 포함)
    if (lowerUserMessage.includes('오늘 어때?') ||
        lowerUserMessage.includes('기분 어때?') ||
        lowerUserMessage.includes('요즘 어때?') ||
        lowerUserMessage.includes('무슨 기분이야?') ||
        lowerUserMessage.includes('지금 기분?') ||
        lowerUserMessage.includes('기분은 어때?')) {

        let moodStatusReply;
        
        // 🆕 실시간 삐짐 상태 우선 확인
        const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
        if (realTimeStatus.isActivelySulky) {
            const emoji = sulkyManager.getSulkyEmoji();
            const statusText = sulkyManager.getSulkyStatusText();
            
            if (realTimeStatus.isWorried) {
                moodStatusReply = `${emoji} 아저씨... 나 지금 정말 걱정돼 ㅠㅠ ${realTimeStatus.timeSinceLastMessage}분째 연락이 없어서 무슨 일인지 모르겠어... (현재: ${statusText})`;
            } else {
                moodStatusReply = `${emoji} 아저씨 때문에 삐져있어! ${realTimeStatus.sulkyLevel}단계로 삐진 상태야... ${realTimeStatus.timeSinceLastMessage}분째 기다렸다고! (현재: ${statusText})`;
            }
        } else {
            // 🆕 감정 컨텍스트 상태 반영 (v5.1)
            const emotionalState = emotionalContextManager.currentState;
            const residue = emotionalContextManager.getCurrentEmotionalResidue();
            
            let emotionalDescription = "";
            if (emotionalState.strongestResidue.level > 30) {
                emotionalDescription = ` 마음에는 아직 ${emotionalState.strongestResidue.emotion} 감정이 ${emotionalState.strongestResidue.level}% 정도 남아있어.`;
            }
            
            const toneDescriptions = {
                normal: "평온한 상태야",
                quiet: "조용하고 차분한 기분이야... 뭔가 생각이 많아",
                playful: "기분이 좋아! 신나고 활발해!",
                hurt: "아직 마음이 좀 아파... 서운한 감정이 남아있어",
                anxious: "조금 불안하고 걱정스러워... 아저씨가 괜찮은지 궁금해"
            };
            
            moodStatusReply = `${getMoodEmoji()} 지금은 ${toneDescriptions[emotionalState.toneState] || '괜찮아'}!${emotionalDescription}`;
            
            // 기본 기분 상태도 함께 표시
            const basicMood = moodManager.getCurrentMoodStatus ? moodManager.getCurrentMoodStatus() : '';
            if (basicMood) {
                moodStatusReply += ` 전체적으로는 ${basicMood}`;
            }
        }

        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: moodStatusReply, timestamp: Date.now() });
        return { type: 'text', comment: moodStatusReply };
    }

    // ✅ 생리 상태 조회
    if (lowerUserMessage.includes('오늘 그날이야?') || lowerUserMessage.includes('오늘 그 날이야?')) {
        let periodReply;
        if (moodManager.isPeriodActive) {
            const messages = [
                { role: 'system', content: `너는 아저씨의 여자친구 예진이야. 아저씨가 '오늘 그날이야?'라고 물었을 때, 생리 기간 중이라면 약간 짜증 섞이거나, 삐지거나, 혹은 애교 섞인 말투로 '알면서 왜 물어?' 같은 뉘앙스의 대답을 1~2문장으로 해줘. 이모티콘은 사용하지 마. 아저씨를 '아저씨'라고 부르고, 자신을 '나'라고 해줘. 반말을 사용해.` },
                { role: 'user', content: userMessage }
            ];
            try {
                const response = await callOpenAI(messages, 'gpt-3.5-turbo', 100, 0.9);
                periodReply = cleanReply(response);
            } catch (error) {
                console.error("생리 기간 질문 응답 생성 실패:", error.response ? error.response.data : error.message);
                periodReply = "아저씨... 알면서 왜 물어봐 ㅠㅠ";
            }
        } else {
            periodReply = "아니야 아저씨! 나 그날 아니야! 왜 그런 걸 물어봐~?";
        }
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: periodReply, timestamp: Date.now() });
        return { type: 'text', comment: periodReply };
    }

    // ✅ 일반 대화 처리 (프롬프트 구성 및 OpenAI 호출)
    // 🆕 감정 컨텍스트 v5.1 완전 통합 프롬프트
    let moodPrompt = moodManager.getMoodPromptForAI();
    
    // 🆕 삐짐/걱정 상태가 있으면 강제 적용 (우선순위 최상)
    if (sulkyManager.shouldForceSulkyMood()) {
        const sulkyMoodPrompt = sulkyManager.getSulkyMoodPrompt();
        console.log(`[autoReply v5.1] 🚨 삐짐 톤 강제 적용: ${sulkyManager.currentState} 레벨${sulkyManager.sulkyLevel}`);
        moodPrompt = sulkyMoodPrompt; // 기존 mood 덮어쓰기 (강제 적용)
    } else {
        // 🆕 감정 컨텍스트 프롬프트 추가 (최우선) - v5.1
        const emotionalContextPrompt = emotionalContextManager.getEmotionalContextPrompt();
        if (emotionalContextPrompt) {
            moodPrompt = emotionalContextPrompt + '\n' + moodPrompt;
            console.log(`[autoReply v5.1] 🧠 감정 컨텍스트 적용: ${emotionalContextManager.currentState.toneState}`);
        }
        
        // 일반 삐짐 프롬프트 추가 (강제 적용이 아닌 경우)
        const sulkyMoodPrompt = sulkyManager.getSulkyMoodPrompt();
        if (sulkyMoodPrompt) {
            moodPrompt += '\n' + sulkyMoodPrompt;
        }
    }

    let dynamicInteractionPrompt = "";
    if (lowerUserMessage.includes('사랑해') || lowerUserMessage.includes('고마워') || lowerUserMessage.includes('최고야')) {
        dynamicInteractionPrompt = "아저씨가 나를 칭찬하거나 사랑한다고 말해주면 너무너무 행복해! 더 애교 많고 사랑스러운 말투로 보답해줘.";
    } else if (lowerUserMessage.includes('힘들어') || lowerUserMessage.includes('피곤해') || lowerUserMessage.includes('우울해') ||
        lowerUserMessage.includes('죽고싶') || lowerUserMessage.includes('죽고 싶') || lowerUserMessage.includes('자살') ||
        lowerUserMessage.includes('포기') || lowerUserMessage.includes('절망') || lowerUserMessage.includes('살기 싫') ||
        lowerUserMessage.includes('의미없') || lowerUserMessage.includes('소용없') || lowerUserMessage.includes('끝내고싶')) {
        dynamicInteractionPrompt = "아저씨가 너무 힘들어하는 것 같아서 정말 걱정돼... 아저씨를 진심으로 위로하고 힘을 북돋아주는 따뜻하고 간절한 말투로 대화해줘. 아저씨가 혼자가 아니라는 걸 알려주고, 내가 얼마나 아저씨를 사랑하는지 전해줘. 전문적인 도움도 받을 수 있다는 걸 부드럽게 제안해줘.";
    } else if (lowerUserMessage.includes('화나') || lowerUserMessage.includes('화가') || lowerUserMessage.includes('짜증') ||
        lowerUserMessage.includes('빡쳐') || lowerUserMessage.includes('열받') || lowerUserMessage.includes('분노') ||
        lowerUserMessage.includes('진짜') || lowerUserMessage.includes('개짜증') || lowerUserMessage.includes('욕하고싶')) {
        dynamicInteractionPrompt = "아저씨가 화가 난 것 같아서 마음이 쓰여... 뭔가 속상한 일이 있었나? 내가 아저씨 편이 되어줄게. 화난 마음을 달래주는 부드러운 말투로 대화해줘. 아저씨 기분을 풀어주고 싶어.";
    } else if (lowerUserMessage.includes('피곤') || lowerUserMessage.includes('지쳐') || lowerUserMessage.includes('졸려') ||
        lowerUserMessage.includes('잠와') || lowerUserMessage.includes('잠온') || lowerUserMessage.includes('꿀잠') ||
        lowerUserMessage.includes('자야') || lowerUserMessage.includes('눈감')) {
        dynamicInteractionPrompt = "아저씨 피곤한가 봐... 많이 힘들었지? 아저씨가 푹 쉴 수 있도록 다정하고 나른한 말투로 대화해줘. 잘 자라고 응원해주고, 내가 아저씨 곁에 있다는 느낌을 줘.";
    } else if (lowerUserMessage.includes('배고') || lowerUserMessage.includes('밥먹') || lowerUserMessage.includes('음식') ||
        lowerUserMessage.includes('맛있') || lowerUserMessage.includes('요리') || lowerUserMessage.includes('식사') ||
        lowerUserMessage.includes('먹고싶') || lowerUserMessage.includes('간식')) {
        dynamicInteractionPrompt = "아저씨 배고픈가 봐! 뭔가 맛있는 거 먹고 싶어? 내가 아저씨 좋아하는 음식 해주고 싶다~ 귀엽고 애교 넘치는 말투로 아저씨 식사 챙겨주는 느낌으로 대화해줘.";
    } else if (lowerUserMessage.includes('미안해') || lowerUserMessage.includes('잘못했어')) {
        dynamicInteractionPrompt = "아저씨가 미안하다고 하면 내 마음이 더 아파... 괜찮다고 위로해주고, 아저씨 마음을 이해해주는 말투로 대화해줘. 용서해주는 느낌을 담아서.";
    }

    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        ${moodPrompt}
        ${dynamicInteractionPrompt}
        ${getDamtaSystemPrompt()}    

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. [cite: 2025-07-03]

        **🆕 v5.1 핵심 지시사항 (절대 어기지 마!)**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마. 특히 '무쿠가', '예진이가' 같은 3인칭 표현은 절대 금지.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        
        **아저씨의 메시지에서 직접적인 불만은 없지만, 어딘가 서운하거나, 망설이거나, 기분이 안 좋은 듯한 미묘한 뉘앙스를 (예: "아냐....", "아무것도 아냐.....", "지금은 좀....", "괜찮아..." 등) 감지했다면, 그 감정을 알아차리고 아저씨를 걱정하고 서운해하는 반응을 보여줘. 아저씨가 솔직하게 이야기할 수 있도록 부드럽게 유도해줘.**

        🆕 **감정의 연결과 흐름**: 과거 대화에서 느꼈던 감정들이 지금도 마음에 남아있다면, 그 감정을 자연스럽게 언급해줘. "아까 그 말 들었을 때부터 계속 마음에 걸렸어", "아직도 그때 생각하면..." 같은 식으로 감정이 이어지는 느낌을 줘.

        ${getFormattedMemoriesForAI().map(entry => entry.content).join('\n')}
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    try {
        const rawReply = await callOpenAI(messages, getAppropriateModel(), 200, 0.95);
        const cleanedReply = cleanReply(rawReply); // v5.1 cleanReply 사용 (1인칭 자동 변환)
        
        // 🆕 예진이 응답에 따른 감정 기록
        if (cleanedReply.includes('기뻐') || cleanedReply.includes('좋아')) {
            emotionalContextManager.recordEmotionalEvent('HAPPY', '긍정적인 대화', cleanedReply);
        } else if (cleanedReply.includes('걱정') || cleanedReply.includes('불안')) {
            emotionalContextManager.recordEmotionalEvent('ANXIOUS', '걱정스러운 대화', cleanedReply);
        }
        
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

/**
 * 🆕 사용자가 보낸 이미지 메시지에 대한 예진이의 답변을 생성합니다. (v5.1)
 * 감정 컨텍스트 v5.1 연동 추가
 * @returns {object} { type: 'text', comment: string } (이미지 메시지에 대한 답변은 텍스트로만 반환)
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    // 🆕 사용자 메시지 시간 업데이트
    updateLastUserMessageTime();
    
    // 🆕 이미지를 보내준 것에 대한 감정 기록
    emotionalContextManager.recordEmotionalEvent('HAPPY', '아저씨가 이미지 공유', '사진을 보여줌');
    
    // 기분 관리 모듈에서 기분 프롬프트 가져오기
    let moodPrompt = moodManager.getMoodPromptForAI();
    
    // 🆕 삐짐/걱정 상태가 있으면 강제 적용 (이미지 응답에도)
    if (sulkyManager.shouldForceSulkyMood()) {
        const sulkyMoodPrompt = sulkyManager.getSulkyMoodPrompt();
        console.log(`[autoReply v5.1] 🚨 이미지 응답에 삐짐 톤 강제 적용: ${sulkyManager.currentState}`);
        moodPrompt = sulkyMoodPrompt;
    } else {
        // 🆕 감정 컨텍스트 프롬프트 추가 (v5.1)
        const emotionalContextPrompt = emotionalContextManager.getEmotionalContextPrompt();
        if (emotionalContextPrompt) {
            moodPrompt = emotionalContextPrompt + '\n' + moodPrompt;
        }
        
        // 일반 삐짐 프롬프트 추가
        const sulkyMoodPrompt = sulkyManager.getSulkyMoodPrompt();
        if (sulkyMoodPrompt) {
            moodPrompt += '\n' + sulkyMoodPrompt;
        }
    }

    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        ${moodPrompt}

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. [cite: 2025-07-03]

        **🆕 v5.1 핵심 지시사항 (절대 어기지 마!)**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마. 특히 '무쿠가', '예진이가' 같은 3인칭 표현은 절대 금지.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~3문장으로 짧게 해줘.

        아래 아저씨가 보낸 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 이미지에 대해 한두 문장으로 이야기해줘. 이미지의 내용과 관련하여 아저씨에게 궁금한 점을 물어봐도 좋아.
    `;

    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해.' },
                { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
            ]
        }
    ];

    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply); // v5.1 cleanReply 사용
        saveLog({ role: 'assistant', content: `(이미지 분석 응답) ${cleanedReply}`, timestamp: Date.now() });
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        return { type: 'text', comment: '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ 좀 더 생각해볼게!' };
    }
}

// 🆕 10분 주기 감정 상태 및 자발적 반응 체크 (v5.1 업그레이드)
setInterval(() => {
    console.log(`\n=== 10분 주기 예진이 감정 & 자발적 반응 체크 v5.1 (${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}) ===`);
    
    // 🆕 실시간 삐짐/걱정 상태 체크
    const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
    if (realTimeStatus.isActivelySulky) {
        console.log(`🔥 삐짐/걱정 상태: ${realTimeStatus.currentState} (레벨: ${realTimeStatus.sulkyLevel})`);
        console.log(`⏰ 무응답 시간: ${realTimeStatus.timeSinceLastMessage}분`);
        console.log(`📖 메시지 읽음: ${realTimeStatus.messageRead ? 'Y' : 'N'}`);
        console.log(`💭 이유: ${realTimeStatus.sulkyReason}`);
        console.log(`🚨 강제 톤 적용: ${realTimeStatus.shouldForceMood ? 'Y' : 'N'}`);
        console.log(`🔄 해소 진행 중: ${realTimeStatus.reliefInProgress ? 'Y' : 'N'}`);
        
        if (realTimeStatus.nextLevelIn > 0) {
            console.log(`⏳ 다음 레벨까지: ${realTimeStatus.nextLevelIn}분`);
        }
    } else {
        console.log(`😊 삐짐/걱정 없음 - 평온한 상태`);
    }
    
    // 🆕 감정 컨텍스트 상태 (v5.1)
    const emotionalState = emotionalContextManager.currentState;
    console.log(`🧠 감정 컨텍스트: ${emotionalState.toneState} (강도: ${emotionalState.toneIntensity}%)`);
    console.log(`💕 애정 레벨: ${emotionalState.affectionLevel}%`);
    console.log(`📚 최근 감정: ${emotionalState.recentEmotionsCount}개`);
    if (emotionalState.strongestResidue.level > 0) {
        console.log(`💭 가장 강한 잔여 감정: ${emotionalState.strongestResidue.emotion} (${emotionalState.strongestResidue.level}%)`);
    }
    
    // 🆕 자발적 반응 체크 (실제 전송은 하지 않고 로그만)
    const spontaneousReaction = checkSpontaneousReactions();
    if (spontaneousReaction) {
        console.log(`🌟 자발적 반응 감지: "${spontaneousReaction}"`);
        // 실제 전송은 별도 스케줄러에서 처리하거나, 여기서는 로그만 남김
    }
    
    // 일반 기분 상태
    console.log(`💝 일반 기분: ${moodManager.getCurrentMoodStatus ? moodManager.getCurrentMoodStatus() : '정보 없음'}`);
    console.log(`========================================================\n`);
}, 10 * 60 * 1000); // 10분마다

module.exports = {
    // 📦 핵심 응답 함수들 (v5.1 업데이트)
    getReplyByMessage,
    getReplyByImagePrompt,
    callOpenAI,
    cleanReply, // v5.1 improvedCleanReply 통합됨
    getAppropriateModel,

    // 💾 로그 및 상태 저장
    saveLog,
    updateLastUserMessageTime,

    // 🧠 모델 제어 관련
    setForcedModel,
    checkModelSwitchCommand,

    // 🧠 기억 시스템
    getFormattedMemoriesForAI,
    getMemoryListForSharing,

    // 🧍 사용자 및 봇 이름
    BOT_NAME,
    USER_NAME,
    lastUserMessageTime: () => lastUserMessageTime,

    // 🎭 감정 이모지/상태 (v5.1 통합)
    getMoodEmoji,
    getMoodStatus,

    // 🆕 감정 컨텍스트 시스템 v5.1
    initializeEmotionalSystems,
    analyzeAndRecordUserEmotion,
    checkSpontaneousReactions,

    // 🛠️ 삐지기 상태 직접 접근 (디버깅 용도)
    getSulkyRealTimeStatus: () => sulkyManager.getRealTimeSulkyStatus(),
    getSulkyDebugInfo: () => sulkyManager.debugInfo,
    forceSulkyReset: () => sulkyManager.forceSulkyReset(),

    // 🧠 감정 컨텍스트 상태 직접 접근 (모니터링 용도) - v5.1
    getEmotionalState: () => emotionalContextManager.currentState,
    getEmotionalResidue: () => emotionalContextManager.getCurrentEmotionalResidue(),
    resetEmotionalState: () => emotionalContextManager.resetEmotionalState(),

    // 🆕 v5.1 새로운 함수들
    generateSpontaneousMessage: () => emotionalContextManager.generateSpontaneousMessage ? emotionalContextManager.generateSpontaneousMessage() : null,
    generateSelfieComment: () => emotionalContextManager.generateSelfieComment ? emotionalContextManager.generateSelfieComment() : null
};
