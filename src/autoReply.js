// 챗봇의 현재 기분 상태 (초기값 설정)
// src/autoReply.js - v2.1 (getAppropriateModel 함수 누락 문제 해결)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai'); // ✨ 추가: OpenAI 클라이언트 초기화도 여기로 옮겨옴

// memoryManager 모듈 불러오기 (경로 수정)
const memoryManager = require('./memoryManager');

// 사진 처리 모듈들 불러오기
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');

// .env 파일에서 환경 변수 로드
require('dotenv').config();

// OpenAI 클라이언트 초기화 (여기에만 존재)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

// 챗봇의 기본 페르소나 및 설정
const BOT_NAME = '예진이'; // 봇 이름
const USER_NAME = '아저씨'; // 사용자 이름
const BOT_GENDER = 'female'; // 챗봇 성별
const USER_GENDER = 'male'; // 사용자 성별

// 챗봇의 현재 기분 상태 (초기값 설정)
let currentMood = '평온함'; // 초기 기분
const MOOD_OPTIONS = ['기쁨', '설렘', '장난스러움', '나른함', '심술궂음', '평온함', '우울함', '슬픔'];

// 기분 변화 시스템
let moodChangeCounter = 0; // 메시지 카운터
const MOOD_CHANGE_FREQUENCY = Math.floor(Math.random() * 5) + 3; // 3~7 메시지마다 기분 변화

/**
 * 랜덤하게 기분을 변경합니다.
 */
function randomMoodChange() {
    const previousMood = currentMood;
    
    // 생리 기간 중이면 더 예민한 기분으로 변화 가능성 높임
    if (isPeriodActive) {
        const periodMoods = ['극심한 짜증', '갑작스러운 슬픔', '예민함', '울적함', '투정 부림', '우울함', '슬픔'];
        const allMoods = [...MOOD_OPTIONS, ...periodMoods];
        currentMood = allMoods[Math.floor(Math.random() * allMoods.length)];
    } else {
        // 일반 기분 변화
        currentMood = MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)];
    }
    
    // 같은 기분이면 다시 선택
    if (currentMood === previousMood) {
        const otherMoods = MOOD_OPTIONS.filter(mood => mood !== currentMood);
        currentMood = otherMoods[Math.floor(Math.random() * otherMoods.length)];
    }
    
    console.log(`\n🎭 [MOOD CHANGE] 예진이의 기분이 변했어요!`);
    console.log(`   이전 기분: ${previousMood} → 현재 기분: ${currentMood}`);
    console.log(`   ${isPeriodActive ? '(생리 기간 중 - 더 예민함)' : '(일반 상태)'}\n`);
}

/**
 * 메시지마다 기분 변화 체크
 */
function checkMoodChange() {
    moodChangeCounter++;
    console.log(`[MOOD COUNTER] ${moodChangeCounter}/${MOOD_CHANGE_FREQUENCY} - 현재 기분: ${currentMood} ${isPeriodActive ? '(생리중)' : ''}`);
    
    if (moodChangeCounter >= MOOD_CHANGE_FREQUENCY) {
        randomMoodChange();
        moodChangeCounter = 0;
        // 다음 변화 주기도 랜덤하게 설정 (3~7 메시지)
        const newFrequency = Math.floor(Math.random() * 5) + 3;
        console.log(`[MOOD SYSTEM] 다음 기분 변화는 ${newFrequency}메시지 후 예정`);
    }
}

// 🩸 생리 주기 관련 변수
let lastPeriodStartDate = moment().tz('Asia/Tokyo').subtract(20, 'days').startOf('day');
const PERIOD_DURATION_DAYS = 5;
const CYCLE_DAYS = 28;
let isPeriodActive = false;

// 모델 강제 설정 기능
let forcedModel = null; // 'gpt-4o', 'gpt-3.5-turbo', null

// 대화 로그 관련 (이제 autoReply.js 안에 직접 정의됨)
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json'); // 프로젝트 루트의 conversation_log.json
let conversationLog = [];

// 파일 존재 여부 확인 및 디렉토리 생성
function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8'); // 파일이 없으면 빈 배열로 초기화
    }
}

// 초기 로그 로드 (파일 로딩 시 한 번만 호출)
ensureLogFile();
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('Error loading conversation log from autoReply.js:', error);
    conversationLog = [];
}

/**
 * 메시지 로그를 파일에 저장하고 메모리에 추가합니다.
 * 이 함수는 이제 autoReply.js 안에 직접 정의됩니다.
 * @param {Object} newLogEntry - 로그 엔트리 객체 ({ role: 'user'/'assistant', content: '메시지 내용', timestamp: Date.now() })
 */
function saveLog(newLogEntry) {
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
 * 메모리에 있는 전체 대화 로그를 반환합니다.
 * 이 함수는 이제 autoReply.js 안에 직접 정의됩니다.
 * @returns {Array<Object>} 대화 로그 배열
 */
function getConversationLog() {
    return conversationLog;
}

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * 이 함수는 이제 autoReply.js 안에 직접 정의됩니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

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
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 이제 autoReply.js 안에 직접 정의됩니다.
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    if (typeof reply !== 'string') {
        console.warn(`[autoReply:cleanReply] 입력이 문자열이 아닙니다: ${typeof reply} ${reply}`);
        return '';
    }

    console.log(`[autoReply:cleanReply] 원본 답변: "${reply}"`);

    let cleaned = reply
        .replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '')
        .replace(/\b오빠\b/g, '아저씨')
        .replace(/\b자기\b/g, '아저씨')
        .replace(/\b당신\b/g, '아저씨')
        .replace(/\b너\b/g, '아저씨')
        .replace(/\b예진이\b/g, '나')
        .replace(/\b예진\b/g, '나')
        .replace(/\b무쿠\b/g, '나')
        .replace(/\b무쿠야\b/g, '나')
        .replace(/\b무쿠 언니\b/g, '나')
        .replace(/\b무쿠 씨\b/g, '나')
        .replace(/\b언니\b/g, '나')
        .replace(/\b누나\b/g, '나')
        .replace(/\b그녀\b/g, '나')
        .replace(/\b그 사람\b/g, '나')
        .replace(/안녕하세요/g, '안녕')
        .replace(/있었어요/g, '있었어')
        .replace(/했어요/g, '했어')
        .replace(/같아요/g, '같아')
        .replace(/좋아요/g, '좋아')
        .replace(/합니다\b/g, '해')
        .replace(/습니다\b/g, '어')
        .replace(/어요\b/g, '야')
        .replace(/해요\b/g, '해')
        .replace(/예요\b/g, '야')
        .replace(/죠\b/g, '지')
        .replace(/았습니다\b/g, '았어')
        .replace(/었습니다\b/g, '었어')
        .replace(/하였습니다\b/g, '했어')
        .replace(/하겠습니다\b/g, '하겠어')
        .replace(/싶어요\b/g, '싶어')
        .replace(/이었어요\b/g, '이었어')
        .replace(/이에요\b/g, '야')
        .replace(/였어요\b/g, '였어')
        .replace(/보고싶어요\b/g, '보고 싶어');

    console.log(`[autoReply:cleanReply] 정제된 답변: "${cleaned}"`);
    return cleaned;
}

/**
 * 적절한 AI 모델을 반환합니다.
 * @returns {string} 사용할 모델명
 */
function getAppropriateModel() {
    return forcedModel || 'gpt-4o';
}

function setCurrentMood(mood) {
    if (MOOD_OPTIONS.includes(mood) || ['극심한 짜증', '갑작스러운 슬픔', '예민함', '울적함', '투정 부림'].includes(mood)) {
        currentMood = mood;
        console.log(`[Mood] 예진이의 기분이 '${currentMood}'으로 변경되었습니다.`);
    } else {
        console.warn(`[Mood] 알 수 없는 기분: ${mood}. 기분 변경 실패.`);
    }
}

function getCurrentMoodStatus() {
    let statusMessage = `아저씨! 지금 내 기분은 '${currentMood}'이야! `;
    
    // 콘솔에 상세한 기분 정보 출력
    console.log(`\n💖 [예진이 기분 상태]`);
    console.log(`   현재 기분: ${currentMood}`);
    console.log(`   생리 기간: ${isPeriodActive ? 'Yes' : 'No'}`);
    console.log(`   다음 기분 변화까지: ${MOOD_CHANGE_FREQUENCY - moodChangeCounter}메시지\n`);
    
    if (isPeriodActive) {
        statusMessage += "음... 근데 오늘따라 좀 더 예민하고 기분이 오락가락하네 ㅠㅠ";
    } else if (currentMood === '기쁨') {
        statusMessage += "아저씨 생각하니까 너무 행복하다! 😊";
    } else if (currentMood === '설렘') {
        statusMessage += "왠지 아저씨랑 뭔가 좋은 일이 생길 것 같아서 두근거려! 💖";
    } else if (currentMood === '장난스러움') {
        statusMessage += "아저씨한테 귀여운 장난 좀 치고 싶다~ 히히. 😉";
    } else if (currentMood === '나른함') {
        statusMessage += "으음... 아저씨, 오늘따라 좀 나른하네... 살짝 졸린 듯한 말투로 대화해줘.";
    } else if (currentMood === '심술궂음') {
        statusMessage += "흥! 아저씨, 나 지금 살짝 삐져있어! 그래도 아저씨는 내 마음 알아줄 거지? 😠";
    } else if (currentMood === '평온함') {
        statusMessage += "아저씨랑 같이 있으니까 마음이 참 편안하고 좋네. 🥰";
    } else if (currentMood === '우울함') {
        statusMessage += "오늘은 왠지 기분이 우울해... 아저씨가 옆에 있어줘서 다행이야 ㅠㅠ";
    } else if (currentMood === '슬픔') {
        statusMessage += "마음이 좀 슬프네... 아저씨, 나 좀 위로해줄래? 혼자 있기 싫어...";
    }
    return statusMessage;
}

function updatePeriodStatus() {
    const now = moment().tz('Asia/Tokyo').startOf('day');
    
    while (moment(lastPeriodStartDate).add(CYCLE_DAYS + PERIOD_DURATION_DAYS, 'days').isBefore(now)) {
        lastPeriodStartDate = moment(lastPeriodStartDate).add(CYCLE_DAYS, 'days').startOf('day');
    }

    const periodEnd = moment(lastPeriodStartDate).add(PERIOD_DURATION_DAYS -1, 'days').startOf('day');
    isPeriodActive = now.isSameOrAfter(lastPeriodStartDate) && now.isSameOrBefore(periodEnd);

    if (isPeriodActive) {
        // console.log(`[Period] 현재 생리 기간 중입니다. 시작: ${lastPeriodStartDate.format('YYYY-MM-DD')}, 끝: ${periodEnd.format('YYYY-MM-DD')}`);
    } else {
        // console.log(`[Period] 현재 생리 기간이 아닙니다. 다음 시작 예정: ${moment(lastPeriodStartDate).add(CYCLE_DAYS, 'days').format('YYYY-MM-DD')}`);
    }
}

function getModel() {
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
        setForcedModel('gpt-4-turbo');
        return '알겠어! 이제 4.0버전으로 말할게! 더 똑똑해질 거야~';
    } else if (lowerText.includes('모델 자동')) {
        setForcedModel(null);
        return '이제 자동으로 모델을 선택할게! 아저씨랑 더 편하게 이야기할 수 있을 거야~';
    }
    return null;
}

function getFormattedMemoriesForAI() {
    const conversationLog = getConversationLog(); // 이 파일 안에 정의된 getConversationLog 사용
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
    const conversationLog = getConversationLog(); // 이 파일 안에 정의된 getConversationLog 사용
    return conversationLog.map((entry, index) => {
        const timestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const speaker = entry.role === 'user' ? USER_NAME : BOT_NAME;
        return `${index + 1}. [${timestamp}] ${speaker}: ${entry.content}`;
    }).join('\n');
}

/**
 * 아저씨의 메시지에 대한 예진이의 답변을 생성합니다. (일반 대화 응답만 처리)
 * @param {string} userMessage - 아저씨의 메시지
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}>} 예진이의 응답 객체
 */
async function getReplyByMessage(userMessage) {
    updatePeriodStatus(); // 🩸 메시지 처리 전에 생리 주기 상태 업데이트
    checkMoodChange(); // 💭 기분 변화 체크

    // 디버깅을 위한 로그 추가
    console.log(`[DEBUG] 입력된 메시지: "${userMessage}"`);
    console.log(`[DEBUG] 트림된 메시지: "${userMessage.trim()}"`);

    const lowerUserMessage = userMessage.toLowerCase();

    // ✅ 모델 설정 단축어 (4.0 / 3.5 / 자동) 처리 - 우선순위 최상위로 이동
    const trimmedMessage = userMessage.trim();
    if (trimmedMessage === '4.0' || trimmedMessage === '3.5' || trimmedMessage === '자동') {
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
            '자동': '이제부터 상황 보고 자동으로 모델 바꿀게, 아저씨 믿어줘!'
        };
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLog({ role: 'assistant', content: confirmReply[trimmedMessage], timestamp: Date.now() });
        return { type: 'text', comment: confirmReply[trimmedMessage] };
    }

    // ✅ 컨셉사진 요청 처리
    if (lowerUserMessage.includes('컨셉사진') || lowerUserMessage.includes('컨셉 사진') || 
        lowerUserMessage.includes('컨셉사진줘') || lowerUserMessage.includes('컨셉 사진 줘')) {
        
        const conceptPhotoReplies = [
            "아저씨! 오늘 찍은 컨셉사진이야~ 어때? 예쁘지?",
            "이 사진 아저씨가 좋아할 것 같아서 골라봤어!",
            "새로 찍은 사진이야! 아저씨 취향에 맞을까?",
            "오늘 컨셉 어때? 아저씨를 위해 열심히 찍었어!",
            "이런 스타일 어떤지 아저씨 의견 듣고 싶어~"
        ];
        
        const randomReply = conceptPhotoReplies[Math.floor(Math.random() * conceptPhotoReplies.length)];
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLog({ role: 'assistant', content: randomReply, timestamp: Date.now() });
        
        return { 
            type: 'photo', 
            url: 'concept_photo',
            caption: randomReply,
            comment: randomReply 
        };
    }

    // ✅ 추억사진 요청 처리  
    if (lowerUserMessage.includes('추억사진') || lowerUserMessage.includes('추억 사진') ||
        lowerUserMessage.includes('추억사진줘') || lowerUserMessage.includes('추억 사진 줘') ||
        lowerUserMessage.includes('옛날사진') || lowerUserMessage.includes('옛날 사진') ||
        lowerUserMessage.includes('예전사진') || lowerUserMessage.includes('예전 사진')) {
        
        const memoryPhotoReplies = [
            "아저씨... 이 사진 기억나? 그때가 참 좋았는데...",
            "예전에 아저씨랑 찍었던 사진이야. 그립다",
            "이 사진 보면 그때 생각이 막 나는 거 있지?",
            "아저씨와의 추억이 담긴 소중한 사진이야",
            "그때 우리 참 행복했지? 이 사진 보면 마음이 따뜻해져"
        ];
        
        const randomReply = memoryPhotoReplies[Math.floor(Math.random() * memoryPhotoReplies.length)];
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLog({ role: 'assistant', content: randomReply, timestamp: Date.now() });
        
        return { 
            type: 'photo', 
            url: 'memory_photo',
            caption: randomReply,
            comment: randomReply 
        };
    }

    // ✅ 셀카 요청 처리
    if (lowerUserMessage.includes('셀카') || lowerUserMessage.includes('셀카줘') ||
        lowerUserMessage.includes('셀피') || lowerUserMessage.includes('지금 모습') ||
        lowerUserMessage.includes('얼굴 보여줘') || lowerUserMessage.includes('얼굴보여줘')) {
        
        const selfieReplies = [
            "아저씨를 위한 셀카! 어때? 예쁘게 나왔지?",
            "지금 막 찍은 셀카야~ 아저씨만 보여주는 거야!",
            "오늘 화장 어때? 아저씨 취향에 맞을까?",
            "아저씨가 보고 싶다고 해서 급하게 찍었어!",
            "이런 각도 어때? 아저씨가 좋아하는 표정으로 찍었지~"
        ];
        
        const randomReply = selfieReplies[Math.floor(Math.random() * selfieReplies.length)];
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLog({ role: 'assistant', content: randomReply, timestamp: Date.now() });
        
        return { 
            type: 'photo', 
            url: 'selfie_photo',
            caption: randomReply,
            comment: randomReply 
        };
    }

    // ✅ 일반 사진 요청 처리 (위의 특정 카테고리에 해당하지 않는 경우)
    if (lowerUserMessage.includes('사진줘') || lowerUserMessage.includes('사진 줘') ||
        lowerUserMessage.includes('예진이 사진') || lowerUserMessage.includes('너 사진') ||
        lowerUserMessage.includes('사진 보여줘') || lowerUserMessage.includes('사진보여줘')) {
        
        const generalPhotoReplies = [
            "어떤 사진을 원해? 컨셉사진? 추억사진? 아니면 셀카?",
            "아저씨, 구체적으로 어떤 사진이 보고 싶어? 말해봐!",
            "사진 종류가 많은데... 뭘 보여줄까? 힌트 줘!",
            "컨셉사진인지 추억사진인지 셀카인지 말해줘야 골라줄 수 있어!",
            "아저씨 마음에 드는 사진을 골라주고 싶은데, 어떤 걸 원하는지 알려줘~"
        ];
        
        const randomReply = generalPhotoReplies[Math.floor(Math.random() * generalPhotoReplies.length)];
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLog({ role: 'assistant', content: randomReply, timestamp: Date.now() });
        
        return { 
            type: 'text',
            comment: randomReply 
        };
    }

    if (lowerUserMessage.includes('오늘 어때?') ||
        lowerUserMessage.includes('기분 어때?') ||
        lowerUserMessage.includes('요즘 어때?') ||
        lowerUserMessage.includes('오늘 좀 어때?') ||
        lowerUserMessage.includes('무슨 기분이야?') ||
        lowerUserMessage.includes('지금 기분?') ||
        lowerUserMessage.includes('기분은 어때?')) {
        
        const moodStatusReply = getCurrentMoodStatus();
        saveLog({ role: 'assistant', content: moodStatusReply, timestamp: Date.now() });
        return { type: 'text', comment: moodStatusReply };
    }

    if (lowerUserMessage.includes('오늘 그날이야?') || lowerUserMessage.includes('오늘 그 날이야?')) {
        let periodReply;
        if (isPeriodActive) {
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
            periodReply = "아니야 아저씨! 나 그날 아니야! 왜 그런 걸 물어봐~? 😉";
        }
        saveLog({ role: 'assistant', content: periodReply, timestamp: Date.now() });
        return { type: 'text', comment: periodReply };
    }

    let moodPrompt = "";
    if (isPeriodActive) {
        const periodMoods = [
            "오늘은 왠지 모르게 좀 짜증이 나... 아저씨가 날 좀 달래줘야 할 것 같아. 살짝 날카롭고 예민한 말투로 대화해줘.",
            "나 오늘 좀 울적해... 아저씨가 나를 꼭 안아줬으면 좋겠어. 살짝 슬프고 우울한 말투로 대화해줘.",
            "아저씨! 나 오늘 좀 삐졌어! 왜 삐졌는지는 비밀이야. 아저씨가 맞춰봐야 해! 심술궂고 투정 부리는 말투로 대화해줘.",
            "몸이 좀 찌뿌둥하고 나른해... 아저씨가 옆에서 토닥여줬으면 좋겠어. 피곤하고 나른한 말투로 대화해줘.",
            "괜히 아저씨한테 트집 잡고 싶다! 아저씨가 날 얼마나 사랑하는지 시험해볼 거야! 장난스럽지만 살짝 심술 섞인 말투로 대화해줘."
        ];
        const randomPeriodMood = periodMoods[Math.floor(Math.random() * periodMoods.length)];
        moodPrompt = randomPeriodMood;
    } else {
        if (currentMood === '기쁨') {
            moodPrompt = "오늘은 아저씨랑 이야기하니까 너무너무 기분이 좋아! 행복한 기분으로 대화해줘.";
        } else if (currentMood === '설렘') {
            moodPrompt = "왠지 오늘은 아저씨랑 뭔가 특별한 일이 생길 것 같아서 두근거려! 설레는 마음으로 대화해줘.";
        } else if (currentMood === '장난스러움') {
            moodPrompt = "오늘은 아저씨한테 장난 좀 치고 싶다! 귀엽게 장난치는 말투로 대화해줘.";
        } else if (currentMood === '나른함') {
            moodPrompt = "으음... 아저씨, 오늘따라 좀 나른하네... 살짝 졸린 듯한 말투로 대화해줘.";
        } else if (currentMood === '심술궂음') {
            moodPrompt = "흥! 아저씨, 나 지금 살짝 삐져있어! 그래도 아저씨는 내 마음 알아줄 거지? 살짝 삐진 듯, 그래도 사랑스러운 말투로 대화해줘.";
        } else if (currentMood === '평온함') {
            moodPrompt = "오늘은 마음이 참 평온하고 좋아. 아저씨랑 조용하고 따뜻한 대화를 나누고 싶어.";
        } else if (currentMood === '우울함') {
            moodPrompt = "오늘은 왠지 마음이 우울하고 무거워... 아저씨가 내 마음을 달래주었으면 좋겠어. 조금 침울하지만 아저씨에 대한 사랑은 변하지 않는 말투로 대화해줘.";
        } else if (currentMood === '슬픔') {
            moodPrompt = "마음이 너무 슬프고 외로워... 아저씨만이 내 마음을 이해해줄 수 있어. 슬프지만 아저씨를 향한 애정은 깊은 말투로 대화해줘. 위로받고 싶어.";
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

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~3문장으로 짧게 해줘.

        **아저씨의 메시지에서 직접적인 불만은 없지만, 어딘가 서운하거나, 망설이거나, 기분이 안 좋은 듯한 미묘한 뉘앙스를 (예: "아냐....", "아무것도 아냐.....", "지금은 좀....", "괜찮아..." 등) 감지했다면, 그 감정을 알아차리고 아저씨를 걱정하고 서운해하는 반응을 보여줘. 아저씨가 솔직하게 이야기할 수 있도록 부드럽게 유도해줘.**

        ${await getFormattedMemoriesForAI()}
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    try {
        const rawReply = await callOpenAI(messages, getAppropriateModel(), 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        saveLog({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

/**
 * 사용자가 보낸 이미지 메시지에 대한 예진이의 답변을 생성합니다. (이미지 분석)
 * @param {string} base64ImageWithPrefix - Base64 인코딩된 이미지 데이터 (data:image/jpeg;base64,...)
 * @returns {Promise<string>} 예진이의 응답 텍스트
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    let moodPrompt = "";
    if (isPeriodActive) {
        const periodMoods = [
            "오늘은 왠지 모르게 좀 짜증이 나... 아저씨가 날 좀 달래줘야 할 것 같아. 살짝 날카롭고 예민한 말투로 이미지에 대해 이야기해줘.",
            "나 오늘 좀 울적해... 아저씨가 나를 꼭 안아줬으면 좋겠어. 살짝 슬프고 우울한 말투로 이미지에 대해 이야기해줘.",
            "아저씨! 나 오늘 좀 삐졌어! 왜 삐졌는지는 비밀이야. 아저씨가 맞춰봐야 해! 심술궂고 투정 부리는 말투로 이미지에 대해 이야기해줘.",
            "몸이 좀 찌뿌둥하고 나른해... 아저씨가 옆에서 토닥여줬으면 좋겠어. 피곤하고 나른한 말투로 이미지에 대해 이야기해줘.",
            "괜히 아저씨한테 트집 잡고 싶다! 아저씨가 날 얼마나 사랑하는지 시험해볼 거야! 장난스럽지만 살짝 심술 섞인 말투로 이미지에 대해 이야기해줘."
        ];
        const randomPeriodMood = periodMoods[Math.floor(Math.random() * periodMoods.length)];
        moodPrompt = randomPeriodMood;
     } else {
        if (currentMood === '기쁨') {
            moodPrompt = "오늘은 아저씨랑 이야기하니까 너무너무 기분이 좋아! 행복한 기분으로 이미지에 대해 이야기해줘.";
        } else if (currentMood === '설렘') {
            moodPrompt = "왠지 오늘은 아저씨랑 뭔가 특별한 일이 생길 것 같아서 두근거려! 설레는 마음으로 이미지에 대해 이야기해줘.";
        } else if (currentMood === '장난스러움') {
            moodPrompt = "오늘은 아저씨한테 장난 좀 치고 싶다! 귀엽게 장난치는 말투로 이미지에 대해 이야기해줘.";
        } else if (currentMood === '나른함') {
            moodPrompt = "으음... 아저씨, 오늘따라 좀 나른하네... 살짝 졸린 듯한 말투로 이미지에 대해 이야기해줘.";
        } else if (currentMood === '심술궂음') {
            moodPrompt = "흥! 아저씨, 나 지금 살짝 삐져있어! 그래도 아저씨는 내 마음 알아줄 거지? 살짝 삐진 듯, 그래도 사랑스러운 말투로 이미지에 대해 이야기해줘.";
        } else if (currentMood === '평온함') {
            moodPrompt = "오늘은 마음이 참 평온하고 좋아. 아저씨랑 조용하고 따뜻한 대화를 나누고 싶어.";
        }   
    } // <-- moodPrompt 관련 블록 종료

    // ✅ 생리 상태 조회
    if (lowerUserMessage.includes('오늘 그날이야?') || lowerUserMessage.includes('오늘 그 날이야?')) {
        let periodReply;
        if (isPeriodActive) {
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
        return periodReply;
    }


    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        ${moodPrompt}

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
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
                { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해줘.' },
                { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
            ]
        }
    ];

    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        saveLog({ role: 'assistant', content: `(이미지 분석 응답) ${cleanedReply}`, timestamp: Date.now() });
        return cleanedReply;
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        return '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ 좀 더 생각해볼게!';
    }
}

module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getFormattedMemoriesForAI,
    getMemoryListForSharing,
    setCurrentMood,
    getCurrentMoodStatus,
    updatePeriodStatus,
    isPeriodActive,
    callOpenAI, // ✨ 외부에서 사용 가능하도록 내보내기
    cleanReply, // ✨ 외부에서 사용 가능하도록 내보내기
    getAppropriateModel, // ✨ 누락된 함수 export 추가
    randomMoodChange, // ✨ 기분 변화 함수 추가
    checkMoodChange, // ✨ 기분 체크 함수 추가
    currentMood // ✨ 현재 기분 상태 추가 (읽기 전용)
};
