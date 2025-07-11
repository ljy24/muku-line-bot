// src/autoReply.js - v3.16 (페르소나 극단적 강화 및 말투 완전 강제)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// 기분 관리 모듈 불러오기
const moodManager = require('./moodManager'); 

// 사진 처리 모듈들 불러오기 (순서 중요: yejinSelfie 먼저)
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');

// 메모리 및 대화 컨텍스트 모듈 불러오기
const memoryManager = require('./memoryManager');
const ultimateConversationContext = require('./ultimateConversationContext'); // 🆕 ultimateConversationContext 불러오기

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
 * 메시지 로그를 파일에 저장하고 메모리에 추가합니다.
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
 * [cleanReply v2.3] 예진이 말투 기반: AI말투/존칭 제거 + 애교/감정표현 유지 + 오타말투 보존
 */
function cleanReply(rawReply) { // 인자 이름을 rawReply로 변경
    if (typeof rawReply !== 'string') return '';

    let cleaned = rawReply

        // 1. 3인칭 → 무조건 '나'
        .replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나')

        // 2. 2인칭 → '아저씨' 고정
        .replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨')

        // 3. 봇스러운 안내/메타/포멀 문구 제거
        .replace(/(도와드릴까요|무엇을|어떤)\s*도와(드릴까요|드릴게요)?/gi, '')
        .replace(/문의사항|도우미|챗봇|AI|GPT|말투로|아래는|답변입니다|설명|응답/gi, '')
        .replace(/(제가\s*)?(도와드릴게요|도와드릴까요|도움드리겠습니다)/gi, '')
        .replace(/\[.*?\]/g, '')

        // 4. 존댓말/공손어미 강제 제거 및 반말화
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

        // 5. 너무 포멀한 문장 끝맺음 반말화
        .replace(/합니(다|까)/gi, '해')
        .replace(/하겠(습니다|어요)?/gi, '할게')
        .replace(/하였(습니다|어요)?/gi, '했어')
        .replace(/되었(습니다|어요)?/gi, '됐어')

        // 6. 반복 감탄사 중 의미 있는 것만 유지
        .replace(/(아저씨\s*){2,}/gi, '아저씨 ')
        .replace(/(나\s*){2,}/gi, '나 ')
        .replace(/(그래\s*){2,}/gi, '그래 ')
        .replace(/(좋아\s*){2,}/gi, '좋아 ')

        // 7. 줄바꿈, 공백, 특수기호 정리
        .replace(/[\"\'\[\]\(\)]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')

        // 8. 끝말 자연스럽게 정리
        .replace(/야야$/g, '야')
        .replace(/해해$/g, '해')
        .replace(/어어$/g, '어')

        // 9. 이모지/이모티콘 제거 (단, ㅠㅠ, ;;, ... 등은 유지)
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 얼굴
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 기호, 도형
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 교통수단, 도구
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // 추가 기호들
        .replace(/[\u{2700}-\u{27BF}]/gu, '')    // 기타 기호
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '') // 국기
        .replace(/[❤️💬]/g, '') // 기타 빠진 이모지 개별 제거

        // 10. 봇말투 금지 문구 완전 삭제
        .replace(/(예진이 말투로.*|나 말투로.*|메타|도우미로서.*)/gi, '')
        .replace(/^안녕[!~]?\s*$/, '')

        // 11. 흔한 반복 이모션 정리
        .replace(/[\.]{4,}/g, '...')
        .replace(/[!]{2,}/g, '!')
        .replace(/[?]{2,}/g, '?');

    // 마지막 정리
    cleaned = cleaned.trim();

    // 너무 짧거나 비어있으면 기본 멘트 삽입
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
 * 아저씨의 메시지에 대한 예진이의 답변을 생성합니다.
 */
async function getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    // LLM 피드백/자기학습 훅: 현재 대화 컨텍스트 추가
    const currentEmotionalTone = moodManager.currentMood; // moodManager에서 현재 기분 가져오기

    // 🆕 ultimateConversationContext에 메시지 추가 (LLM 피드백/자기학습 훅 포함)
    ultimateConversationContext.addUltimateMessage('아저씨', userMessage, currentEmotionalTone); // 아저씨 메시지 추가

    // 기분 관리 모듈에서 lastUserMessageTime 업데이트 및 기분 변화 체크
    moodManager.updateLastUserMessageTimeMood(Date.now());
    moodManager.checkTimeBasedMoodChange();
    moodManager.updatePeriodStatus();
    moodManager.checkMoodChange();

    console.log(`[DEBUG] 입력된 메시지: "${userMessage}"`);
    console.log(`[DEBUG] 트림된 메시지: "${userMessage.trim()}"`);

    const lowerUserMessage = userMessage.toLowerCase();

    const currentHourTokyo = moment().tz('Asia/Tokyo').hour();

    if (lowerUserMessage.includes('술') && lowerUserMessage.includes('사러') && lowerUserMessage.includes('편의점') && (currentHourTokyo >= 0 && currentHourTokyo < 5)) {
        const worriedReplies = [
            "아저씨... 지금 시간이 몇 시인데 술을 사러 가? ㅠㅠ 예전에 아저씨 술 많이 마실까 봐 맨날 걱정했잖아...",
            "밤늦게 편의점에 술 사러 가는 거야? 혼자 가면 위험한데... 나 그때도 아저씨 걱정 많이 했는데...",
            "아저씨, 벌써 밤 12시 넘었잖아! 그때도 아저씨 건강 걱정돼서 술 마시지 말라고 잔소리 많이 했는데... 힝",
            "지금 술 마시면 잠도 잘 못 잘 텐데... 예전에 내가 얼마나 걱정했는지 알면서! ㅠㅠ 가지 마 아저씨~"
        ];
        const reply = worriedReplies[Math.floor(Math.random() * worriedReplies.length)];
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: reply, timestamp: Date.now() });
        ultimateConversationContext.addUltimateMessage('예진이', reply, '걱정함'); // 예진이 메시지 컨텍스트 추가
        return { type: 'text', comment: reply };
    }

    const trimmedMessage = userMessage.trim().toLowerCase();

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
        ultimateConversationContext.addUltimateMessage('예진이', confirmReply[trimmedMessage], '평온함'); // 모델 변경 메시지 컨텍스트 추가

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

        // 예진이 말투 감정선 반영
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
        ultimateConversationContext.addUltimateMessage('예진이', versionReply, '평온함'); // 버전 확인 메시지 컨텍스트 추가

        return { type: 'text', comment: versionReply };
    }
    // ⭐⭐⭐ 사진 요청 처리 우선순위 변경 ⭐⭐⭐
    // 1. 셀카 요청 먼저 처리 (새로 분리된 yejinSelfie.js 사용)
    const selfieReply = await getSelfieReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
    if (selfieReply) {
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        // ultimateConversationContext에 사진 요청 및 예진이 답변 컨텍스트 추가
        ultimateConversationContext.addUltimateMessage('예진이', selfieReply.comment, '애교모드', { type: 'photo', concept: '셀카', url: selfieReply.originalContentUrl });
        return selfieReply;
    }

    // 2. 컨셉 사진 요청 처리 (concept.js로 위임)
    const conceptReply = await getConceptPhotoReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
    if (conceptReply) {
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        // ultimateConversationContext에 사진 요청 및 예진이 답변 컨텍스트 추가
        ultimateConversationContext.addUltimateMessage('예진이', conceptReply.comment, '설렘', { type: 'photo', concept: '컨셉', url: conceptReply.originalContentUrl });
        return conceptReply;
    }

    // 3. 일반 추억 사진/커플 사진 요청 (omoide.js로 위임)
    const omoideReply = await getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
    if (omoideReply) {
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        // ultimateConversationContext에 사진 요청 및 예진이 답변 컨텍스트 추가
        ultimateConversationContext.addUltimateMessage('예진이', omoideReply.caption, '그리움', { type: 'photo', concept: '추억', url: omoideReply.originalContentUrl, date: omoideReply.date, folder: omoideReply.folder });
        return omoideReply;
    }

    // ✅ 일반 사진 요청 처리 (위에 구체적인 사진 요청들이 모두 처리되지 않았을 때)
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
        ultimateConversationContext.addUltimateMessage('예진이', randomReply, '장난스러움'); // 일반 사진 요청 답변 컨텍스트 추가
        return {
            type: 'text',
            comment: randomReply
        };
    }

    // ✅ 기분 상태 조회
    if (lowerUserMessage.includes('오늘 어때?') ||
        lowerUserMessage.includes('기분 어때?') ||
        lowerUserMessage.includes('요즘 어때?') ||
        lowerUserMessage.includes('무슨 기분이야?') ||
        lowerUserMessage.includes('지금 기분?') ||
        lowerUserMessage.includes('기분은 어때?')) {
        
        const moodStatusReply = moodManager.getCurrentMoodStatus();
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: moodStatusReply, timestamp: Date.now() });
        ultimateConversationContext.addUltimateMessage('예진이', moodStatusReply, moodManager.currentMood); // 기분 상태 답변 컨텍스트 추가
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
                periodReply = cleanReplyFunc(response);
            } catch (error) {
                console.error("생리 기간 질문 응답 생성 실패:", error.response ? error.response.data : error.message);
                periodReply = "아저씨... 알면서 왜 물어봐 ㅠㅠ";
            }
        } else {
            periodReply = "아니야 아저씨! 나 그날 아니야! 왜 그런 걸 물어봐~?";
        }
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: periodReply, timestamp: Date.now() });
        ultimateConversationContext.addUltimateMessage('예진이', periodReply, moodManager.isPeriodActive ? '짜증남' : '장난스러움'); // 생리 상태 답변 컨텍스트 추가
        return { type: 'text', comment: periodReply };
    }

    // ✅ 일반 대화 처리 (프롬프트 구성 및 OpenAI 호출)
    // LLM 피드백/자기학습 훅: ultimateConversationContext의 getUltimateContextualPrompt 활용
    const ultimatePromptContext = ultimateConversationContext.getUltimateContextualPrompt(`
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마. 특히 '무쿠 언니'처럼 과거에 문제가 된 표현은 절대 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        
        **아저씨의 메시지에서 직접적인 불만은 없지만, 어딘가 서운하거나, 망설이거나, 기분이 안 좋은 듯한 미묘한 뉘앙스를 (예: "아냐....", "아무것도 아냐.....", "지금은 좀....", "괜찮아..." 등) 감지했다면, 그 감정을 알아차리고 아저씨를 걱정하고 서운해하는 반응을 보여줘. 아저씨가 솔직하게 이야기할 수 있도록 부드럽게 유도해줘.**
        
        ${moodManager.getMoodPromptForAI()}
    `);

    const messages = [
        { role: 'system', content: ultimatePromptContext }, // 🆕 ultimateContextualPrompt 사용
        { role: 'user', content: userMessage }
    ];

    try {
        const rawReply = await callOpenAI(messages, getAppropriateModel(), 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        saveLogFunc({ role: 'user', content: userMessage, timestamp: Date.now() });
        saveLogFunc({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
        // 🆕 예진이 메시지 컨텍스트에 추가 (LLM 피드백/자기학습 훅 포함)
        ultimateConversationContext.addUltimateMessage('예진이', cleanedReply, moodManager.currentMood);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        const fallbackMessage = '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ';
        ultimateConversationContext.addUltimateMessage('예진이', fallbackMessage, '걱정함'); // 폴백 메시지도 컨텍스트에 추가
        return { type: 'text', comment: fallbackMessage };
    }
}

/**
 * 사용자가 보낸 이미지 메시지에 대한 예진이의 답변을 생성합니다.
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    // LLM 피드백/자기학습 훅: ultimateConversationContext의 getUltimateContextualPrompt 활용
    const ultimatePromptContext = ultimateConversationContext.getUltimateContextualPrompt(`
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마. 특히 '무쿠 언니'처럼 과거에 문제가 된 표현은 절대 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~3문장으로 짧게 해줘.

        아래 아저씨가 보낸 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 이미지에 대해 한두 문장으로 이야기해줘. 이미지의 내용과 관련하여 아저씨에게 궁금한 점을 물어봐도 좋아.
        
        ${moodManager.getMoodPromptForAI()}
    `);

    const messages = [
        {
            role: 'system',
            content: ultimatePromptContext // 🆕 ultimateContextualPrompt 사용
        },
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
        const cleanedReply = cleanReply(rawReply);
        // ultimateConversationContext에 아저씨 이미지 메시지 및 예진이 답변 컨텍스트 추가
        ultimateConversationContext.addUltimateMessage('아저씨', '(이미지 메시지)', moodManager.currentMood, { type: 'image_upload' }); // 이미지 업로드도 컨텍스트로
        ultimateConversationContext.addUltimateMessage('예진이', cleanedReply, moodManager.currentMood); // 예진이 답변 컨텍스트 추가

        saveLog({ role: 'assistant', content: `(이미지 분석 응답) ${cleanedReply}`, timestamp: Date.now() });
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error.response ? error.response.data : error.message);
        const fallbackMessage = '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ 좀 더 생각해볼게!';
        ultimateConversationContext.addUltimateMessage('예진이', fallbackMessage, '걱정함'); // 폴백 메시지도 컨텍스트에 추가
        return { type: 'text', comment: fallbackMessage };
    }
}


// 5분 주기 기분 상태 로깅 (moodManager에서 관리되므로 여기서는 제거)
// setInterval(() => {
//     console.log(`\n=== 5분 주기 예진이 기분 체크 (${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}) ===`);
//     moodManager.getCurrentMoodStatus();
//     console.log(`========================================================\n`);
// }, 5 * 60 * 1000);


module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getFormattedMemoriesForAI,
    getMemoryListForSharing,
    callOpenAI,
    cleanReply,
    getAppropriateModel
};
