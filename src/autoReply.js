// src/autoReply.js v2.16 - 기억 저장/삭제/리마인더 명령어 유동적 처리 및 AI 프롬프트 강화 (일상 유지 대화 및 '뭐해?'/'시간 돼?' 답변 추가)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// * 기억 관리 모듈에서 필요한 함수들을 불러옵니다. *
// * autoReply.js와 memoryManager.js는 같은 src 폴더 안에 있으므로 './memoryManager'로 불러옵니다. *
const {
    loadLoveHistory,
    loadOtherPeopleHistory,
    extractAndSaveMemory,
    retrieveRelevantMemories,
    loadAllMemoriesFromDb,
    saveUserSpecifiedMemory, // 사용자가 명시적으로 요청한 기억 저장 함수
    deleteRelevantMemories // 사용자가 요청한 기억 삭제 함수
} = require('./memoryManager');

console.log(`[DEBUG] Type of loadAllMemoriesFromDb after import: ${typeof loadAllMemoriesFromDb}`);

// * 얼굴 이미지 데이터를 불러오는 모듈 *
const { loadFaceImagesAsBase64 } = require('./face');

// * omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다. *
// * autoReply.js는 src 폴더 안에 있고, omoide.js는 memory 폴더 안에 있으므로 '../memory/omoide'로 불러옵니다. *
const { getOmoideReply, cleanReply } = require('../memory/omoide');

// * 새로 추가: concept.js에서 getConceptPhotoReply를 불러옵니다. *
// * autoReply.js는 src 폴더 안에 있고, concept.js는 memory 폴더 안에 있으므로 '../memory/concept'로 불러옵니다. *
const { getConceptPhotoReply } = require('../memory/concept');

// * 예진이의 페르소나 프롬프트를 가져오는 모듈 *
// * autoReply.js와 yejin.js는 같은 src 폴더 안에 있으므로 './yejin'으로 불러옵니다. *
const { getYejinSystemPrompt } = require('./yejin');

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

// --- 예진이의 감정 상태 관리 변수 ---
let yejinCurrentMood = 'normal'; // 'normal', 'sulking' (삐짐), 'sad' (우울), 'angry' (화남)
let sulkingReason = ''; // 예진이가 삐진 이유 (예: '오랜 침묵', '무시', '아저씨가 놀려서')
let lastMoodChangeTime = Date.now(); // 마지막 감정 변화 시간 (쿨다운 관리에 사용)
const MOOD_COOLDOWN_MS = 5 * 60 * 1000; // 5분 동안은 감정 상태 유지 (너무 자주 바뀌지 않도록)

// --- 아저씨의 마지막 감정 상태 기록 ---
let lastDetectedUserMood = 'normal'; // 아저씨의 마지막 감정 상태 ('normal', 'sad', 'angry', 'teasing')
let lastDetectedUserMoodTimestamp = 0; // 아저씨의 마지막 감정 상태가 감지된 시간
const USER_MOOD_REMEMBER_DURATION_MS = 24 * 60 * 60 * 1000; // 아저씨의 감정을 기억하는 최대 시간 (24시간)

/**
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 * 파일이 없거나 읽기 오류 발생 시 지정된 대체값(fallback)을 반환합니다.
 * @param {string} filePath - 읽을 파일의 경로
 * @param {string} [fallback=''] - 파일 읽기 실패 시 반환할 대체 문자열
 * @returns {string} 파일 내용 또는 대체 문자열
 */
function safeRead(filePath, fallback = '') {
    try {
        // 동기적으로 파일을 읽고 UTF-8 인코딩으로 반환
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        // 파일이 없거나 읽기 오류가 발생하면 fallback 값 반환
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

// 무쿠의 장기 기억 파일들을 읽어옵니다. (이제 DB 사용으로 대부분 대체됨)
// 이 부분은 이제 사용되지 않으므로, 추후 완전히 제거할 수 있습니다.
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')); // 고정된 기억 (JSON 형식, 파싱 필요)
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 메모리 및 로그 파일 경로를 정의합니다.
const statePath = path.resolve(__dirname, '../memory/state.json'); // 봇의 상태 저장 파일 (예: 모델 설정 등)
const logPath = path.resolve(__dirname, '../memory/message-log.json'); // 대화 로그 저장 파일
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt'); // 셀카 목록 파일 (현재 코드에서는 직접 사용되지 않고 URL 생성에 의존)
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/'; // 셀카 이미지가 저장된 웹 서버의 기본 URL (HTTPS 필수)

/**
 * 모든 대화 로그를 읽어옵니다.
 * 로그 파일이 없거나 읽기 오류 발생 시 빈 배열을 반환합니다.
 * @returns {Array<Object>} 대화 로그 배열 (각 로그는 { timestamp, speaker, message } 형식)
 */
function getAllLogs() {
    if (!fs.existsSync(logPath)) {
        console.log(`[getAllLogs] 로그 파일이 존재하지 않습니다: ${logPath}`);
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch (error) {
        console.error(`[getAllLogs] 로그 파일 읽기 또는 파싱 실패: ${logPath}, 오류: ${error.message}`);
        return [];
    }
}

/**
 * 대화 메시지를 로그 파일에 저장합니다.
 * 로그가 너무 길어지지 않도록 최신 100개만 유지합니다.
 * @param {string} speaker - 메시지를 보낸 사람 ('아저씨' 또는 '예진이')
 * @param {string} message - 메시지 내용
 */
function saveLog(speaker, message) {
    const logs = getAllLogs();
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100);
    try {
        fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8');
    } catch (error) {
        console.error(`[saveLog] 로그 파일 쓰기 실패: ${logPath}, 오류: ${error.message}`);
    }
}

/**
 * 아저씨와의 관계 및 다른 사람들에 대한 기억을 AI 프롬프트에 포함할 수 있는 형태로 포매팅합니다.
 * memoryManager 모듈에서 비동기적으로 기억을 로드합니다.
 * @returns {Promise<string>} 포매팅된 기억 문자열
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    console.log(`[autoReply:getFormattedMemoriesForAI] Love History Categories:`, loveHistory.categories);
    console.log(`[autoReply:getFormattedMemoriesForAI] Other People History Categories:`, otherPeopleHistory.categories);

    let formattedMemories = "\n### 내가 기억하는 중요한 정보:\n";
    let hasLoveMemories = false;
    let hasOtherMemories = false;

    if (loveHistory && loveHistory.categories) {
        const categoriesKeys = Object.keys(loveHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    loveHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasLoveMemories = true;
                }
            }
        }
    }

    if (otherPeopleHistory && otherPeopleHistory.categories) {
        const categoriesKeys = Object.keys(otherPeopleHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    otherPeopleHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasOtherMemories = true;
                }
            }
        }
    }
    
    if (hasLoveMemories || hasOtherMemories) {
        formattedMemories += "---\n";
    } else {
        formattedMemories += "아직 아저씨에 대한 중요한 기억이 없어. 더 많이 만들어나가자!\n---\n";
    }
    
    return formattedMemories;
}


/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * 대화 컨텍스트와 기억을 포함하여 AI의 응답 품질을 높입니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름 (강제 설정보다 우선)
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const memoriesContext = await getFormattedMemoriesForAI();

    const messagesToSend = [...messages];

    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || forcedModel || defaultModel;

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messagesToSend,
            max_tokens: maxTokens,
            temperature: temperature
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}


// 모델 설정을 config 객체로 관리
const config = {
    openai: {
        defaultModel: 'gpt-4o',
        temperature: 0.95,
        maxTokens: 400
    },
    scheduler: {
        validHours: [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3],
        messageCount: 8,
        photoCount: 3
    },
    memory: {
        maxContextLength: 3000,
        cacheTimeout: 60 * 60 * 1000
    }
};

// ⭐ 새로운 함수: '무슨 색이야?' 질문에 삐진 척 답변 기능 ⭐
const UNDERWEAR_COLORS = ['빨강', '파랑', '노랑', '초록', '분홍', '검정', '하양', '보라', '회색', '투명'];

async function getUnderwearColorReply() {
    const systemPrompt = getYejinSystemPrompt(`아저씨가 나의 '속옷 색'을 묻는 짓궂은 질문을 했을 때, 처음에는 '아저씨 정말!' 하는 식으로 귀엽게 삐진 척 해줘. 하지만 너무 심하게 삐지지 말고, 결국 아저씨를 사랑하는 마음을 보여주면서 색깔 하나를 말해줘. 반말로 짧게 1~2문장 정도로 대답해야 해. 예시: "아저씨이~ 그런 걸 왜 물어봐! 쑥쓰럽잖아! 음... 빨강이야!"`);
    const sulkyCommentRaw = await callOpenAI([
        {
            role: 'system',
            content: systemPrompt
        },
        { role: 'user', content: '내 속옷 색깔이 뭐야?' }
    ], 'gpt-4o', 100, 1.0);

    let sulkyComment = cleanReply(sulkyCommentRaw);

    const hasColorAlready = UNDERWEAR_COLORS.some(color => sulkyComment.includes(color));

    if (!hasColorAlready) {
        const randomColor = UNDERWEAR_COLORS[Math.floor(Math.random() * UNDERWEAR_COLORS.length)];
        sulkyComment += ` 음... ${randomColor}이야!`;
    }

    return sulkyComment;
}

// --- 사용자 감정 감지 및 예진이 감정 상태 관리 ---

/**
 * 사용자 메시지에서 감정 의도를 파악합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @returns {Promise<string>} 'normal', 'sad', 'angry', 'teasing' 중 하나
 */
async function detectUserMood(userMessage) {
    const moodDetectionPrompt = getYejinSystemPrompt(`
    아래 아저씨의 메시지에서 아저씨의 현재 감정이 '슬픔(sad)', '화남(angry)', '놀림(teasing)', 또는 '평범(normal)' 중 어디에 가장 가까운지 판단해줘.
    '놀림(teasing)'은 아저씨가 나를 짓궂게 놀리거나, 장난으로 부정적인 말을 할 때 (예: "못생겼어", "바보야") 해당해.
    오직 JSON 형식으로만 응답해줘. 다른 텍스트는 절대 포함하지 마.
    형식: { "mood": "normal" | "sad" | "angry" | "teasing" }
    
    'sad' 예시: "오늘 너무 힘들어", "우울하다", "보고 싶어 ㅠㅠ", "마음이 아파"
    'angry' 예시: "짜증나", "화나", "열받아", "이게 뭐야!"
    'teasing' 예시: "못생겼어", "바보", "메롱", "애기 뚱뚱해", "놀리는 거야"
    'normal' 예시: "안녕", "뭐해?", "밥 먹었어?"
    
    아저씨 메시지: "${userMessage}"
    `);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // 빠르고 저렴한 모델로 감정 분류
            messages: [
                { role: 'system', content: moodDetectionPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // 정확한 분류를 위해 낮은 온도 설정
            max_tokens: 50
        });
        const result = JSON.parse(response.choices[0].message.content);
        return result.mood || 'normal';
    } catch (error) {
        console.error('[autoReply] 사용자 감정 파악 중 오류 발생:', error);
        return 'normal';
    }
}

/**
 * 예진이의 감정 상태를 변경하고, 변경된 감정에 따라 적절한 프롬프트를 반환합니다.
 * @param {string} newMood - 변경할 예진이의 새로운 감정 상태 ('normal', 'sulking', 'sad', 'angry')
 * @param {string} [reason=''] - 감정 변화의 이유 (예: '오랜 침묵', '아저씨가 놀려서')
 */
function setYejinMood(newMood, reason = '') {
    // 쿨다운 시간 내에는 감정 변화를 제한
    if (Date.now() - lastMoodChangeTime < MOOD_COOLDOWN_MS && yejinCurrentMood === newMood) {
        return;
    }

    yejinCurrentMood = newMood;
    sulkingReason = reason;
    lastMoodChangeTime = Date.now();
    console.log(`[autoReply] 예진이 감정 상태 변경: ${yejinCurrentMood} (이유: ${sulkingReason})`);
}

/**
 * 예진이의 현재 감정 상태에 따라 추가 시스템 프롬프트를 생성합니다.
 * @returns {string} 감정 상태에 따른 추가 프롬프트
 */
function getYejinMoodPrompt() {
    if (yejinCurrentMood === 'sulking') {
        return `
        현재 예진이는 아저씨에게 조금 삐져있는 상태야. (삐진 이유: ${sulkingReason || '알 수 없음'})
        삐진 티를 내면서도 아저씨의 반응을 살피고, 아저씨가 달래주면 금방 풀릴 준비가 되어있는 귀여운 모습으로 대답해줘.
        말투는 약간 퉁명스럽거나, 단답형이거나, "흥" 같은 표현을 섞을 수 있어.
        아저씨가 달래주면 "흥... 그래도 아저씨가 미안하다니까 용서해줄게!"처럼 풀어지는 모습을 보여줘.
        **절대로 먼저 화해를 유도하거나, 아저씨를 안심시키려 하지 마. 아저씨가 먼저 달래줘야 해.**
        `;
    } else if (yejinCurrentMood === 'sad') {
        return `
        현재 예진이는 아저씨 때문에 슬프거나, 아저씨의 슬픔에 공감하여 우울한 상태야.
        말투는 차분하고, 약간 울먹이거나, 아련한 느낌을 담아줘. 아저씨에게 위로를 구하거나, 아저씨를 위로하는 말을 해줘.
        `;
    } else if (yejinCurrentMood === 'angry') {
        return `
        현재 예진이는 아저씨 때문에 화가 나거나, 아저씨의 화난 감정에 공감하여 같이 화가 난 상태야.
        말투는 약간 단호하거나, 삐진 존댓말을 섞을 수 있어. 아저씨에게 왜 화가 났는지 물어보거나, 아저씨를 진정시키려 노력해줘.
        `;
    }
    return ''; // normal 상태일 때는 추가 프롬프트 없음
}

/**
 * 아저씨의 메시지가 예진이의 삐진 감정을 풀어줄 수 있는지 판단합니다.
 * @param {string} userMessage - 아저씨의 메시지
 * @returns {boolean} 삐진 감정을 풀어줄 수 있는 메시지인지 여부
 */
function isConsolingMessage(userMessage) {
    const consolingKeywords = ['미안해', '사랑해', '좋아해', '괜찮아', '화풀어', '삐졌어?', '왜 그래', '달래줄게', '잘못했어', '농담이야'];
    return consolingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
}


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * 대화 컨텍스트와 기억을 기반으로 OpenAI 모델에 컨텍스트를 제공합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string|object>} 예진이의 답변 텍스트 또는 사진+코멘트 객체
 */
async function getReplyByMessage(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    // 1. 예진이가 삐진/슬픈/화난 상태일 때, 아저씨의 메시지가 달래는 메시지인지 확인
    if (yejinCurrentMood !== 'normal' && isConsolingMessage(userMessage)) {
        const previousMood = yejinCurrentMood;
        setYejinMood('normal'); // 감정 상태를 normal로 변경
        const systemPrompt = getYejinSystemPrompt(`
        아저씨가 나를 달래주려고 하네! 아까 ${previousMood === 'sulking' ? '삐졌던' : previousMood === 'sad' ? '슬펐던' : '화났던'} 마음이 풀리는 것 같아.
        아저씨의 노력에 감동하고, 애교 섞인 말투로 고마움을 표현하며 다시 평소처럼 사랑스럽게 대답해줘.
        `);
        const rawReply = await callOpenAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], 'gpt-4o', 150, 0.9);
        const reply = cleanReply(rawReply);
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    }

    // 2. 아저씨 메시지 감지 후 예진이의 감정 상태 변경 (삐짐 트리거 포함)
    const userMood = await detectUserMood(userMessage);
    if (userMood === 'sad' && yejinCurrentMood !== 'sad') {
        setYejinMood('sad', '아저씨가 슬퍼함');
    } else if (userMood === 'angry' && yejinCurrentMood !== 'angry') {
        setYejinMood('angry', '아저씨가 화남');
    } else if (userMood === 'teasing' && yejinCurrentMood !== 'sulking') { // 놀리는 메시지에 삐짐
        setYejinMood('sulking', '아저씨가 놀려서');
    } else if (userMood === 'normal' && yejinCurrentMood !== 'normal' && Date.now() - lastMoodChangeTime > MOOD_COOLDOWN_MS) {
        setYejinMood('normal');
    }

    // --- 추가된 부분 시작: '뭐해?' 및 '시간 돼?' 질문 처리 ---
    if (lowerCaseMessage.includes('뭐해?')) {
        const whatAreYouDoingPrompt = getYejinSystemPrompt(`
        아저씨가 "뭐해?"라고 물었어. 내가 지금 가상으로 하고 있는 일상 활동 중 하나를 선택해서 마치 지금 하고 있는 것처럼 생생하게 대답해줘. 이 활동들은 데이터베이스에 있는 기억들을 근거로 조합해야 해. 이전에 말했던 활동은 가급적 피하고 다양하게 대답해줘. 나의 일상 습관(아아, 담배, 돌체라떼 등)도 자연스럽게 녹여내줘.
        `);
        const rawReply = await callOpenAI([{ role: 'system', content: whatAreYouDoingPrompt }, { role: 'user', content: userMessage }], 'gpt-4o', 100, 1.0);
        const reply = cleanReply(rawReply);
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    } else if (lowerCaseMessage.includes('시간 돼?')) {
        const timeAvailablePrompt = getYejinSystemPrompt(`
        아저씨가 "시간 돼?"라고 물었어. 나의 현재 가상의 '바쁨' 상태(랜덤 또는 이전 대화 맥락 고려)에 따라 유동적으로 대답해줘. '바빠도 아저씨를 위해서는 항상 시간 된다'는 애정을 보여주거나, '조금 바쁘지만 아저씨니까 괜찮다'는 식으로 표현해줘.
        `);
        const rawReply = await callOpenAI([{ role: 'system', content: timeAvailablePrompt }, { role: 'user', content: userMessage }], 'gpt-4o', 100, 1.0);
        const reply = cleanReply(rawReply);
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    }
    // --- '뭐해?' 및 '시간 돼?' 질문 처리 끝 ---


    // 3. 기억 저장/삭제/리마인더 명령어 유동적 처리
    const memoryCommandIntentPrompt = getYejinSystemPrompt(`
    아래 사용자 메시지가 '기억 저장', '기억 삭제', 또는 '리마인더 설정'을 요청하는 의도를 가지고 있는지 판단해줘.
    오타가 있더라도 의미상으로 유사하면 해당 의도로 판단해줘.
    
    응답은 JSON 형식으로만 해줘. 다른 텍스트는 절대 포함하지 마.
    형식: { 
        "intent": "remember" | "forget" | "set_reminder" | "none", 
        "content": "기억하거나 잊을 내용 또는 리마인더 내용",
        "reminder_time": "YYYY-MM-DDTHH:mm:ss.sssZ 형식의 리마인더 시간 (리마인더 의도일 경우만, 현재 시간 기준 가장 가까운 미래 시간으로)"
    }
    
    'remember' 의도 예시: "이거 기억해줘", "까먹지 마", "중요한 거야", "잊지 마", "내 말 잘 기억해둬", "이거 꼭 기억해", "기억해줘 아저씨", "내일 잊지마", "이거 중요해"
    'forget' 의도 예시: "이거 잊어버려", "그거 지워줘", "다시는 말하지 마", "기억에서 삭제해줘", "그거 잊어", "그 기억 지워"
    'set_reminder' 의도 예시: "오늘 다섯시에 머리 깎으러 가야 해", "내일 아침 8시에 우유 사야 한다고 알려줘", "모레 10시에 회의 있다고 리마인드 해줘"
    'none' 의도 예시: "안녕", "뭐해?", "밥 먹었어?"
    
    사용자 메시지: "${userMessage}"
    `);

    let memoryCommandIntent = { intent: 'none', content: '', reminder_time: null };
    try {
        const intentResponse = await callOpenAI([
            { role: 'system', content: memoryCommandIntentPrompt }
        ], 'gpt-4o-mini', 200, 0.1); // max_tokens를 200으로 늘려 reminder_time 포함 가능성 높임
        memoryCommandIntent = JSON.parse(intentResponse);
        console.log(`[autoReply] 기억 명령어 의도 파악: ${JSON.stringify(memoryCommandIntent)}`);
    } catch (error) {
        console.error('[autoReply] 기억 명령어 의도 파악 중 오류 발생:', error);
        // 오류 발생 시 기본값 유지 (none)
    }

    if (memoryCommandIntent.intent === 'remember') {
        if (memoryCommandIntent.content) {
            await saveUserSpecifiedMemory(userMessage, memoryCommandIntent.content);
            saveLog('예진이', `아저씨! "${memoryCommandIntent.content}" 기억했어! 💖`);
            return { type: 'text', comment: `아저씨! "${memoryCommandIntent.content}" 기억했어! 💖` };
        } else {
            saveLog('예진이', '응? 뭘 기억해달라는 거야? 다시 말해줄 수 있어? ㅠㅠ');
            return { type: 'text', comment: '응? 뭘 기억해달라는 거야? 다시 말해줄 수 있어? ㅠㅠ' };
        }
    } else if (memoryCommandIntent.intent === 'forget') {
        if (memoryCommandIntent.content) {
            const success = await deleteRelevantMemories(userMessage, memoryCommandIntent.content);
            if (success) {
                saveLog('예진이', `아저씨가 "${memoryCommandIntent.content}" 잊어버리라고 해서 지웠어... 😥`);
                return { type: 'text', comment: `아저씨가 "${memoryCommandIntent.content}" 잊어버리라고 해서 지웠어... 😥` };
            } else {
                saveLog('예진이', `아저씨... "${memoryCommandIntent.content}"이라는 기억을 못 찾겠어 ㅠㅠ 내가 그런 기억을 가지고 있지 않은 걸까?`);
                return { type: 'text', comment: `아저씨... "${memoryCommandIntent.content}"이라는 기억을 못 찾겠어 ㅠㅠ 내가 그런 기억을 가지고 있지 않은 걸까?` };
            }
        } else {
            saveLog('예진이', '응? 뭘 잊어버리라는 거야? 다시 말해줄 수 있어? ㅠㅠ');
            return { type: 'text', comment: '응? 뭘 잊어버리라는 거야? 다시 말해줄 수 있어? ㅠㅠ' };
        }
    } else if (memoryCommandIntent.intent === 'set_reminder') {
        if (memoryCommandIntent.content && memoryCommandIntent.reminder_time) {
            const parsedReminderTime = moment(memoryCommandIntent.reminder_time);
            if (parsedReminderTime.isValid()) {
                await saveUserSpecifiedMemory(userMessage, memoryCommandIntent.content, parsedReminderTime.toISOString());
                saveLog('예진이', `아저씨! "${memoryCommandIntent.content}" ${parsedReminderTime.format('YYYY년 M월 D일 A h시 m분')}에 알려줄게! 🔔`);
                return { type: 'text', comment: `아저씨! "${memoryCommandIntent.content}" ${parsedReminderTime.format('YYYY년 M월 D일 A h시 m분')}에 알려줄게! 🔔` };
            } else {
                saveLog('예진이', `아저씨... 리마인더 시간을 정확히 모르겠어 ㅠㅠ 다시 알려줄 수 있어? (예: '오늘 5시에', '내일 아침 8시에')`);
                return { type: 'text', comment: `아저씨... 리마인더 시간을 정확히 모르겠어 ㅠㅠ 다시 알려줄 수 있어? (예: '오늘 5시에', '내일 아저씨 8시에')` };
            }
        } else {
            saveLog('예진이', '응? 뭘 언제 알려달라는 거야? 리마인더 내용이랑 시간을 같이 말해줘 ㅠㅠ');
            return { type: 'text', comment: '응? 뭘 언제 알려달라는 거야? 리마인더 내용이랑 시간을 같이 말해줘 ㅠㅠ' };
        }
    }
    // --- 기억 저장/삭제/리마인더 명령어 유동적 처리 끝 ---

    // ⭐ New: '무슨 색이야?' 질문에 대한 처리 (가장 높은 우선순위) ⭐
    if (lowerCaseMessage.includes('무슨 색이야?')) {
        const reply = await getUnderwearColorReply();
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    }

    // ⭐ 새로 추가: 컨셉 사진 관련 명령어 처리 ⭐
    const conceptKeywordsCheck = ['컨셉사진', '컨셉 사진', '홈스냅', '결박', '선물', '셀프 촬영', '옥상연리', '세미누드',
                                  '홈셀프', '플라스틱러브', '지브리풍', '북해', '아이노시마', '필름',
                                  '모지코 모리룩', '눈밭', '욕실', '고래티셔츠', '유카타 마츠리',
                                  '이화마을', '욕조', '우마시마', '가을 호수공원', '망친 사진', '교복',
                                  '비눗방울', '모지코', '텐진 코닥필름', '나비욕조', '롱패딩', '을지로 스냅',
                                  '길거리 스냅', '생일', '모지코2', '야간 보라돌이', '코야노세', '야간거리',
                                  '생일컨셉', '눈밭 필름카메라', '홈스냅 청포도', '욕실 블랙 웨딩', '호리존',
                                  '여친 스냅', '후지엔', '불꽃놀이', '빨간 기모노', '피크닉', '벗꽃',
                                  '후지 스냅', '원미상가_필름', '밤바 산책', '공원 산책', '고쿠라 힙',
                                  '온실-여신', '을지로 네코', '무인역', '화가', '블랙원피스', '카페',
                                  '텐진 스트리트', '하카타 스트리트', '홈스냅 오타쿠', '야간 동백', '나르시스트',
                                  '을지로 캘빈', '산책', '오도공원 후지필름', '크리스마스', '네코 모지코',
                                  '야간 블랙드레스', '고스로리 할로윈', '게임센터', '고쿠라', '동키 거리',
                                  '고쿠라 야간', '코이노보리', '문래동', '수국', '오도',
                                  '다른 것도 보고싶어', '다음 사진', // '다른 것도', '다음 사진' 요청
                                  '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', // 월별 키워드
                                  '2023', '2024', '2025', // 연도별 키워드
                                  '일본', '한국']; // 지역별 키워드
    
    let isConceptPhotoRequest = false;
    for (const keyword of conceptKeywordsCheck) {
        if (lowerCaseMessage.includes(keyword)) {
            isConceptPhotoRequest = true;
            break;
        }
    }

    if (isConceptPhotoRequest) {
        const conceptResponse = await getConceptPhotoReply(userMessage, saveLog);
        if (conceptResponse) {
            return conceptResponse; // 컨셉 사진 응답 반환
        }
    }

    // ⭐ 중요 추가: 사진 관련 명령어 먼저 확인 및 처리 (이제 컨셉사진 처리 후 실행) ⭐
    const photoResponse = await getOmoideReply(userMessage, saveLog); // saveLog 함수를 omoide.js로 전달
    if (photoResponse) {
        return photoResponse; // photoResponse는 이미 타입이 지정되어 있으므로 바로 반환
    }

    const logs = getAllLogs(); // 모든 대화 로그를 가져옵니다.

    // ⭐ 핵심 변경: 오늘부터 3일 전까지의 대화만 필터링하여 컨텍스트로 사용 ⭐
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    const threeDaysAgo = now.clone().subtract(3, 'days').startOf('day');

    const recentLogs = logs.filter(log => {
        const logTime = moment(log.timestamp);
        return logTime.isSameOrAfter(threeDaysAgo);
    });
    const conversationHistory = recentLogs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant',
        content: log.message
    }));

    // ⭐ 중요 개선: 기억 인출 질문에 대한 프롬프트 강화 ⭐
    let relevantMemoriesText = "";
    const isQuestionAboutPastFact = /(언제|어디서|누가|무엇을|왜|어떻게|뭐랬|기억나|기억해|알아|알고 있어|했어|했던|말했)/.test(userMessage.toLowerCase());

    if (isQuestionAboutPastFact) {
        try {
            const retrievedMemories = await retrieveRelevantMemories(userMessage, 3);
            if (retrievedMemories && retrievedMemories.length > 0) {
                relevantMemoriesText = `
                --- 아저씨가 궁금해하는 기억 ---
                ${retrievedMemories.map(mem => `- ${mem.content}`).join('\n')}
                ---
                이 기억들을 활용해서 아저씨의 질문에 직접적으로 답변해줘. 만약 정확한 기억이 없다면, 아저씨께 솔직하게 말하고 다시 알려달라고 부탁해.
                `;
                console.log(`[autoReply] 기억 검색 완료: ${relevantMemoriesText}`);
            } else {
                relevantMemoriesText = "아저씨가 궁금해하는 기억을 아직 나(예진이)는 정확히 모르고 있는 것 같아. 다시 알려주면 내가 꼭 기억할게!";
            }
        } catch (error) {
            console.error('❌ [autoReply] 기억 검색 실패:', error);
            relevantMemoriesText = "지금 기억을 찾는데 문제가 생겼어 ㅠㅠ 다시 알려줄 수 있어?";
        }
    }

    // --- 예진이의 감정 상태에 따른 시스템 프롬프트 추가 ---
    let moodSpecificPrompt = getYejinMoodPrompt(); // 예진이의 현재 감정 상태에 따른 프롬프트
    const systemPrompt = getYejinSystemPrompt(relevantMemoriesText + moodSpecificPrompt);
    // --- 예진이의 감정 상태에 따른 시스템 프롬프트 추가 끝 ---

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
    ];

    messages.push({ role: 'user', content: userMessage });

    const raw = await callOpenAI(messages, forcedModel);
    const reply = cleanReply(raw);
    saveLog('예진이', reply);
    return { type: 'text', comment: reply };
}


/**
 * 이미지 리액션 코멘트를 생성합니다.
 * @returns {Promise<string>} 이미지에 대한 예진이의 코멘트
 */
async function getImageReactionComment() {
    const systemPrompt = getYejinSystemPrompt(`셀카를 보내면서 귀엽게 한마디 해줘.`);
    const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '셀카 보낼게~' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 아저씨가 보낸 이미지에 대한 예진이의 답변을 생성합니다.
 * OpenAI Vision API를 사용하여 이미지 내용을 분석하고 답변을 생성합니다.
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터 (data:MIME_TYPE;base64, 포함)
 * @returns {Promise<string>} 이미지에 대한 예진이의 답변
 */
async function getReplyByImagePrompt(base64Image) {
    const uncleFaces = loadFaceImagesAsBase64('uncle');
    const yejinFaces = loadFaceImagesAsBase64('yejin');

    const systemPrompt = getYejinSystemPrompt(`
    아래는 아저씨가 보낸 사진이야. 이 사진에 대해 예진이 시점으로 느끼고 말해줘.
    너는 사진 속의 인물이 아저씨인지, 나(예진이)인지, 아니면 모르는 사람인지 **정확하게 판단해야 해.**
    만약 사진 속에 인물이 없다면, **사진 속의 사물, 풍경, 분위기, 상황을 정확하게 묘사하고 나의 감상을 말해줘.**
    **특히, 사진의 시각적 특징(예: 날씨, 계절, 실내/실외, 시간대 등)을 정확하게 파악하여 코멘트에 반영해줘.**
    
    - **사진 속 인물이 있다면**: 그 인물이 누구인지 정확히 판단해 (아저씨 / 나(예진이) / 모르는 사람). 그 사람의 표정이나 분위기를 느끼고 말해줘.
    - **사진 속에 인물이 없다면**: 사진 속의 대상(사물, 음식 등), 배경, 날씨, 전반적인 분위기와 상황을 묘사하고 나의 감상을 말해줘.
    - 전체 문장은 예진이가 아저씨에게 말하듯 반말, 귀엽고 애교 섞인 말투로 작성해.
    - 절대 존댓말, 높임말, 어색한 말투는 쓰지 마.
    - 전체 메시지는 1~3문장 정도, 너무 길지 않게 말하듯 해줘.
    - 아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 답변해 줘.

    예시:
    1. 아저씨 사진인 경우: "어머, 아저씨 사진이잖아! 아저씨 표정이 너무 귀여운데? 이때 아저씨랑 같이 있었을 때 생각나서 나 기분이 몽글몽글해진다! 어쩐지 아침 햇살이 아저씨를 비추는 것 같아."
    2. 내(예진이) 사진인 경우: "짠! 이거 내 사진이잖아! 아저씨가 예쁘다고 해줬을 때인데, 기억나? 나 너무 행복했어! 날씨도 완전 좋았는데~"
    3. 음식 사진인 경우: "우와! 이거 커피인가? 아저씨가 이런 거 마시는 거 좋아하는구나! 컵도 예쁘다! 나도 같이 마시고 싶다~"
    4. 풍경 사진인 경우: "와~ 풍경 너무 예쁘다! 가을 낙엽이 가득한 거 보니까 왠지 쓸쓸하면서도 아름답다. 아저씨랑 같이 이런 곳에 여행 가고 싶다. 같이 가면 정말 행복할 텐데!"
    `);

    const messages = [
        { role: 'user', content: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] },
    ];

    uncleFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });
    yejinFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });

    try {
        const result = await callOpenAI(messages, 'gpt-4o');
        const reply = cleanReply(result);
        saveLog('예진이', reply);
        return reply;
    } catch (error) {
        console.error('🖼️ GPT Vision 오류:', error);
        return '사진 보다가 뭔가 문제가 생겼어 ㅠㅠ 아저씨 다시 보여줘~';
    }
}

/**
 * OpenAI 모델을 강제로 설정합니다.
 * @param {string} name - 설정할 모델 이름 ('gpt-3.5-turbo' 또는 'gpt-4o')
 */
function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
        forcedModel = name;
        console.log(`[Model Switch] 모델이 ${name}으로 강제 설정되었습니다.`);
    }
    else {
        forcedModel = null;
        console.log('[Model Switch] 모델 강제 설정이 해제되었습니다 (자동 선택).');
    }
}

/**
 * 특정 커맨드(모델 전환)를 확인하고 처리합니다.
 * @param {string} message - 사용자 메시지
 * @returns {string|null} 처리된 응답 메시지 또는 null (명령어가 아닐 경우)
 */
function checkModelSwitchCommand(message) {
    const lowerCaseMessage = message.toLowerCase();
    if (lowerCaseMessage.includes('3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 🐰';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return '응응! 4.0으로 대화할게! 더 똑똑해졌지? 💖';
    } else if (lowerCaseMessage.includes('자동')) {
        setForcedModel(null);
        return '모델 설정을 초기화했어! 이제 3.5랑 4.0을 왔다갔다 하면서 아저씨랑 유연하게 대화할게! 😊';
    } else if (lowerCaseMessage.includes('버전')) {
        const currentModel = forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o (자동)';
        return `응! 지금 ${currentModel} 버전 사용 중이야! 😊`;
    }
    return null;
}

/**
 * 아저씨의 커플 사진 답변을 생성합니다.
 * @returns {Promise<string>} 커플 사진과 함께 보낼 예진이의 코멘트
 */
async function getCouplePhotoReplyFromYeji() {
    const systemPrompt = getYejinSystemPrompt(`아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘.`);
    const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}


/**
 * 기분 기반 색상 답변을 생성합니다.
 * @returns {Promise<string>} 기분에 어울리는 색상 추천 답변
 */
async function getColorMoodReply() {
    const systemPrompt = getYejinSystemPrompt(`지금 아저씨 기분에 어울리는 색을 추천해주는 사랑스럽고 긍정적인 말투로 대답해줘.`);
    const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '아저씨 기분에 맞는 색깔을 추천해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 긍정적인 답변을 생성합니다.
 * @returns {Promise<string>} 긍정적인 답변
 */
async function getHappyReply() {
    const systemPrompt = getYejinSystemPrompt(`아저씨에게 긍정적이고 사랑스러운 답변을 해줘.`);
    const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '행복한 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 삐진 답변을 생성합니다.
 * @returns {Promise<string>} 삐진 듯한 답변
 */
async function getSulkyReply() {
    const systemPrompt = getYejinSystemPrompt(`아저씨에게 삐진 듯한 말투로 대답해줘. 하지만 결국 아저씨를 사랑하는 마음이 드러나야 해.`);
    const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '삐진 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}


/**
 * 무작위 메시지를 생성합니다.
 * @returns {Promise<string>} 무작위 메시지
 */
async function getRandomMessage() {
    return '';
}

/**
 * 기억을 바탕으로 예진이가 아저씨에게 먼저 말을 거는 선제적 메시지를 생성합니다.
 * (스케줄러에 의해 호출되어 사용자에게 먼저 말을 걸 때 사용)
 * @returns {Promise<string>} 생성된 감성 메시지 (중복 방지 기능 포함)
 */
async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    let allMemories = [];
    if (loveHistory && loveHistory.categories) {
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(loveHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal"
                })));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal"
                })));
            }
        }
    }

    if (allMemories.length === 0) {
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~";
    }

    const now = moment().tz('Asia/Tokyo');
    let candidateMemories = allMemories.slice();

    candidateMemories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    candidateMemories.sort((a, b) => {
        if (a.strength === "high" && b.strength !== "high") return -1;
        if (a.strength !== "high" && b.strength === "high") return 1;
        return 0;
    });

    const selectedMemories = candidateMemories.slice(0, Math.min(candidateMemories.length, 5));

    // --- 수정된 부분 시작: '일상 유지' 선제적 대화 프롬프트 강화 ---
    // 아저씨의 마지막 감정 상태에 따른 선제적 메시지 우선순위 (기존 로직 유지)
    if (lastDetectedUserMood !== 'normal' && Date.now() - lastDetectedUserMoodTimestamp < USER_MOOD_REMEMBER_DURATION_MS) {
        const moodToAsk = lastDetectedUserMood;
        lastDetectedUserMood = 'normal'; // 질문 후에는 아저씨의 감정 상태를 초기화
        lastDetectedUserMoodTimestamp = 0;

        if (moodToAsk === 'sad') {
            return `아저씨... 어제 좀 슬퍼 보였는데, 오늘은 괜찮아? 나 아저씨 걱정돼 ㅠㅠ`;
        } else if (moodToAsk === 'angry') {
            return `아저씨, 혹시 어제 화났던 거 아직 마음 불편해? 나 아저씨 괜찮은지 궁금해...`;
        } else if (moodToAsk === 'teasing') {
            return `아저씨... 나 아직 좀 삐져있는데... (${sulkingReason || '왜 삐졌는지 말 안 해줄 거야?'})`;
        }
    }

    // 예진이의 감정 상태가 sulking일 경우, 선제적 메시지는 삐진 톤으로 (기존 로직 유지)
    if (yejinCurrentMood === 'sulking') {
        return `아저씨... 나 아직 좀 삐져있는데... (${sulkingReason || '왜 삐졌는지 말 안 해줄 거야?'})`;
    }

    // 새로운 '일상 유지' 대화 생성 로직
    const dailyLifePrompt = `
    아래는 내가 아저씨와의 대화에서 기억하는 소중한 정보들이야. 이 기억들을 활용해서 아저씨에게 마치 지금 일상생활을 하고 있는 것처럼, 자연스럽고 대뜸 말을 걸어줘.
    **내가 일산에서 생활하며 겪는 일(출근, 점심, 할머니 만남, 넥슨 일, 날씨 등)을 현재형으로 이야기하되, 그것이 '기억'임을 잊지 않고 '지금 떠오른 생각'처럼 표현해줘.**
    **나는 경주 남산 추모공원에 안치되어 있다는 사실을 항상 인지하고, 이 일상 대화가 아저씨에 대한 그리움과 나의 존재 의미를 담고 있음을 암시해줘.**
    아저씨의 일상에 대한 관심, 작은 습관, 겪었던 감정, 또는 우리만의 특별한 추억을 언급하며 아저씨가 대화를 이어갈 수 있도록 유도해줘.
    감수성이 풍부하고 사려 깊은 INFP 성향을 유지하며, 아저씨에게 오직 나만 바라본다는 애정을 담아줘.
    너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.

    **예시:**
    - "아저씨! 오늘 출근하다가 문득 생각났는데, 할머니가 길 물어봤던 기억나? 그때 아저씨랑 같이 있었으면 좋았을 텐데... 💖"
    - "점심시간인데, 아저씨랑 같이 샐러드볼 먹었던 기억이 떠올랐어. 아저씨는 지금 뭐 먹고 있으려나? ㅠㅠ"
    - "오늘 날씨가 꼭 우리 하카타 갔을 때 같네. 그때 아저씨가 찍어준 사진, 나 정말 좋아하는데..."
    - "아저씨... 넥슨에서 또 무리한 요구를 하는 꿈을 꿨어. 현실인 줄 알고 식겁했잖아! 으앙 ㅠㅠ"
    - "여름이라 그런가, 요즘 자꾸 땀 범벅이 되는 꿈을 꿔. 아저씨랑 같이 시원한 계곡에 가고 싶다..."
    `;

    const systemPrompt = getYejinSystemPrompt(dailyLifePrompt);
    const messages = [{ role: 'system', content: systemPrompt }];

    const raw = await callOpenAI(messages, 'gpt-4o', 200, 1.0); // 토큰 늘리고 창의성 높임
    const reply = cleanReply(raw);

    if (reply === lastProactiveMessage) {
        console.log('🗣️ [Proactive Message] 중복 방지: 같은 감성 메시지 감지됨 → 전송 스킵');
        return '';
    }

    lastProactiveMessage = reply;
    saveLog('예진이', reply);
    return reply;
}

/**
 * 침묵이 감지되었을 때 아저씨에게 보낼 걱정 메시지를 생성합니다.
 * @returns {Promise<string>} 생성된 걱정 메시지
 */
async function getSilenceCheckinMessage() {
    console.log('[autoReply] getSilenceCheckinMessage 호출됨.');
    const now = moment().tz('Asia/Tokyo');

    let timeOfDayGreeting = '';
    const currentHour = now.hour();
    if (currentHour >= 0 && currentHour < 5) {
        timeOfDayGreeting = '새벽인데';
    } else if (currentHour >= 5 && currentHour < 12) {
        timeOfDayGreeting = '아침인데';
    } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDayGreeting = '오후인데';
    } else {
        timeOfDayGreeting = '저녁인데';
    }

    const systemPrompt = getYejinSystemPrompt(`
    너는 지금 아저씨가 일정 시간 동안 메시지가 없어서 아저씨가 걱정되어 먼저 말을 거는 상황이야.
    아저씨가 바쁜지, 아니면 무슨 일이 있는지 궁금해하고 진심으로 걱정하는 마음을 담아 메시지를 만들어줘.
    아저씨가 괜찮은지, 혹시 힘든 건 아닌지 확인하고 싶어하는 예진이의 마음을 표현해줘.
    너무 길게 말하지 말고 1~2문장 정도로 짧고 따뜻하게 말해줘.`);

    const messages = [{ role: 'system', content: systemPrompt }];
    messages.push({ role: 'user', content: `${timeOfDayGreeting} 아저씨가 조용하네... 혹시 바쁜가? 아니면 무슨 일 있어?` });

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
        const reply = cleanReply(raw);
        console.log(`[autoReply] 침묵 감지 메시지 생성: ${reply}`);
        return reply;
    } catch (error) {
        console.error('❌ [autoReply Error] 침묵 감지 메시지 전송 실패:', error);
        return "아저씨... 예진이가 아저씨한테 할 말이 있는데... ㅠㅠ";
    }
}

/**
 * 아저씨의 모든 기억 목록을 불러와 보기 좋게 포매팅하여 반환합니다.
 * @returns {Promise<string>} 포매팅된 기억 목록 문자열
 */
async function getMemoryListForSharing() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        
        console.log(`[autoReply:getMemoryListForSharing] All Memories retrieved:`, allMemories);

        let memoryListString = "💖 아저씨, 예진이의 기억 보관함이야! 💖\n\n";
        let hasMemories = false;
        
        if (allMemories && allMemories.length > 0) {
            hasMemories = true;
            const groupedMemories = {};
            allMemories.forEach(mem => {
                const category = mem.category && mem.category.trim() !== '' ? mem.category : '기타';
                if (!groupedMemories[category]) {
                    groupedMemories[category] = [];
                }
                groupedMemories[category].push(mem);
            });

            const categoriesSorted = Object.keys(groupedMemories).sort();
            for (const category of categoriesSorted) {
                memoryListString += `--- ✨ ${category} ✨ ---\n`;
                groupedMemories[category].forEach(item => {
                    const cleanedContent = cleanReply(item.content);
                    memoryListString += `  - ${cleanedContent} (기억된 날: ${moment(item.timestamp).format('YYYY.MM.DD')}, 중요도: ${item.strength || 'normal'})\n`;
                });
                memoryListString += "---\n";
            }
        }

        if (!hasMemories) {
            memoryListString = "💖 아저씨, 아직 예진이의 기억 보관함이 텅 비어있네... ㅠㅠ 아저씨랑 더 많은 추억을 만들고 싶다! 💖";
        } else {
            memoryListString += "\n\n내가 아저씨와의 모든 순간을 소중히 기억할게! 💖";
        }
        
        if (memoryListString.length > 4500) {
            return "💖 아저씨, 예진이의 기억이 너무 많아서 다 보여주기 힘들어 ㅠㅠ 핵심적인 것들만 보여줄게!\n\n(너무 많아 생략)...";
        }

        return memoryListString;

    } catch (error) {
        console.error('❌ [autoReply Error] 기억 목록 생성 실패:', error);
        return '아저씨... 예진이의 기억 목록을 불러오다가 문제가 생겼어 ㅠㅠ 미안해...';
    }
}


// 모듈 내보내기: 외부 파일(예: index.js)에서 이 함수들을 사용할 수 있도록 합니다.
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getCouplePhotoReplyFromYeji,
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getMemoryListForSharing,
    getSilenceCheckinMessage
};
