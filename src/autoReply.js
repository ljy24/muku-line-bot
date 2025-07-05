// src/autoReply.js v2.8 - 답변 대기 기능 추가 최종본
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// * 기억 관리 모듈에서 필요한 함수들을 불러옵니다. *
const {
    loadLoveHistory,
    loadOtherPeopleHistory,
    extractAndSaveMemory,
    retrieveRelevantMemories,
    loadAllMemoriesFromDb,
    saveUserSpecifiedMemory, // 사용자가 명시적으로 요청한 기억 저장 함수
    deleteRelevantMemories, // 사용자가 요청한 기억 삭제 함수
    saveAnswerToQuestion // ✨ [중요] 질문과 답변을 저장하는 새 함수를 불러옵니다.
} = require('./memoryManager');

// * 얼굴 이미지 데이터를 불러오는 모듈 *
const { loadFaceImagesAsBase64 } = require('./face');

// * omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다. *
const { getOmoideReply, cleanReply } = require('../memory/omoide');

// * 새로 추가: concept.js에서 getConceptPhotoReply를 불러옵니다. *
const { getConceptPhotoReply } = require('../memory/concept');

// * 예진이의 페르소나 프롬프트를 가져오는 모듈 *
const { getYejinSystemPrompt } = require('./yejin');

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

// --- ✨ [핵심 수정 1] 답변 대기 상태를 관리하는 변수 추가 ✨ ---
let memoryState = {
    isWaitingForAnswer: false, // 답변을 기다리는 중인가? (true/false)
    questionContext: null      // 무엇에 대한 답변을 기다리는가? (질문의 내용)
};

/**
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 */
function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

/*
// ==================================================================
//          🎉🎉 데이터베이스 전환 완료! 🎉🎉
// 아래 파일 읽기 코드는 이제 데이터베이스를 사용하므로 필요 없습니다.
// ==================================================================
*/

// 로그 파일 경로 정의
const logPath = path.resolve(__dirname, '../memory/message-log.json');

/**
 * 모든 대화 로그를 읽어옵니다.
 */
function getAllLogs() {
    if (!fs.existsSync(logPath)) {
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
 * AI 프롬프트에 포함할 기억들을 포매팅합니다.
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    let formattedMemories = "\n### 내가 기억하는 중요한 정보:\n";
    let hasMemories = false;

    // 아저씨와의 관계 기억 포매팅
    if (loveHistory && loveHistory.categories && Object.keys(loveHistory.categories).length > 0) {
        hasMemories = true;
        formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
        for (const category in loveHistory.categories) {
            formattedMemories += `- ${category}:\n`;
            loveHistory.categories[category].forEach(item => {
                formattedMemories += `  - ${item.content}\n`;
            });
        }
    }

    // 다른 사람들에 대한 기억 포매팅
    if (otherPeopleHistory && otherPeopleHistory.categories && Object.keys(otherPeopleHistory.categories).length > 0) {
        hasMemories = true;
        formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
        for (const category in otherPeopleHistory.categories) {
            formattedMemories += `- ${category}:\n`;
            otherPeopleHistory.categories[category].forEach(item => {
                formattedMemories += `  - ${item.content}\n`;
            });
        }
    }

    if (hasMemories) {
        formattedMemories += "---\n";
    } else {
        formattedMemories += "아직 아저씨에 대한 중요한 기억이 없어. 더 많이 만들어나가자!\n---\n";
    }

    return formattedMemories;
}


/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
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

    const finalModel = modelParamFromCall || forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';

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

async function getUnderwearColorReply() {
    const systemPrompt = getYejinSystemPrompt(`아저씨가 나의 '속옷 색'을 묻는 짓궂은 질문을 했을 때, 처음에는 '아저씨 정말!' 하는 식으로 귀엽게 삐진 척 해줘. 하지만 너무 심하게 삐지지 말고, 결국 아저씨를 사랑하는 마음을 보여주면서 색깔 하나를 말해줘. 반말로 짧게 1~2문장 정도로 대답해야 해. 예시: "아저씨이~ 그런 걸 왜 물어봐! 쑥쓰럽잖아! 음... 빨강이야!"`);
    const sulkyCommentRaw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '내 속옷 색깔이 뭐야?' }
    ], 'gpt-4o', 100, 1.0);
    let sulkyComment = cleanReply(sulkyCommentRaw);
    const UNDERWEAR_COLORS = ['빨강', '파랑', '노랑', '초록', '분홍', '검정', '하양', '보라', '회색', '투명'];
    const hasColorAlready = UNDERWEAR_COLORS.some(color => sulkyComment.includes(color));
    if (!hasColorAlready) {
        const randomColor = UNDERWEAR_COLORS[Math.floor(Math.random() * UNDERWEAR_COLORS.length)];
        sulkyComment += ` 음... ${randomColor}이야!`;
    }
    return sulkyComment;
}

/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 */
async function getReplyByMessage(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    // --- ✨ [핵심 수정 2] 답변 대기 상태인지 먼저 확인하고 처리 ✨ ---
    if (memoryState.isWaitingForAnswer && memoryState.questionContext) {
        // memoryManager에 새로 만든 함수를 호출해서 질문과 답변을 세트로 저장!
        await saveAnswerToQuestion(memoryState.questionContext, userMessage);

        // 상태 초기화: 이제 더 이상 답변을 기다리지 않음
        memoryState.isWaitingForAnswer = false;
        memoryState.questionContext = null;

        const confirmationReply = `아하, 그렇구나! 아저씨가 알려줘서 이제 나 똑똑히 기억했어! 고마워! 💖`;
        saveLog('예진이', confirmationReply);
        return { type: 'text', comment: confirmationReply }; // 아저씨에게 기억했다는 답변을 하고, 이번 대화는 여기서 종료
    }
    
    // (이 아래의 코드는 기존과 거의 동일합니다)

    // 사진 관련 요청 처리
    const photoResponse = await getOmoideReply(userMessage, saveLog) || await getConceptPhotoReply(userMessage, saveLog);
    if (photoResponse) return photoResponse;

    const logs = getAllLogs();
    const threeDaysAgo = moment().tz('Asia/Tokyo').subtract(3, 'days').startOf('day');
    const recentLogs = logs.filter(log => moment(log.timestamp).isSameOrAfter(threeDaysAgo));
    const conversationHistory = recentLogs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant',
        content: log.message
    }));

    let relevantMemoriesText = "";
    const isQuestionAboutPastFact = /(언제|어디서|누가|무엇을|왜|어떻게|뭐랬|기억나|기억해|알아|알고 있어|했어|했던|말했)/.test(lowerCaseMessage);

    // --- ✨ [핵심 수정 3] 기억을 못 찾았을 때, 답변 대기 상태로 전환 ✨ ---
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
                // 기억이 없을 때, '답변 대기 상태'로 전환
                const questionToAsk = "그건... 내가 잘 기억이 안 나네. 혹시 알려줄 수 있어? 알려주면 내가 꼭 기억할게! �";

                // 답변 대기 상태를 true로 설정하고, 어떤 질문이었는지 기록
                memoryState.isWaitingForAnswer = true;
                memoryState.questionContext = userMessage; // 아저씨의 질문을 그대로 저장

                console.log(`[autoReply] 답변 대기 상태로 전환. 질문: "${userMessage}"`);
                saveLog('예진이', questionToAsk);
                return { type: 'text', comment: questionToAsk }; // 아저씨에게 질문을 던지고 이번 대화 종료
            }
        } catch (error) {
            console.error('❌ [autoReply] 기억 검색 실패:', error);
            relevantMemoriesText = "지금 기억을 찾는데 문제가 생겼어 ㅠㅠ 다시 알려줄 수 있어?";
        }
    }

    const systemPrompt = getYejinSystemPrompt(relevantMemoriesText);
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    const raw = await callOpenAI(messages, forcedModel);
    const reply = cleanReply(raw);
    saveLog('예진이', reply);
    return { type: 'text', comment: reply };
}

async function getReplyByImagePrompt(base64Image) {
    // 이 함수의 내용은 기존과 동일합니다.
    const uncleFaces = loadFaceImagesAsBase64('uncle');
    const yejinFaces = loadFaceImagesAsBase64('yejin');
    const systemPrompt = getYejinSystemPrompt(`아래는 아저씨가 보낸 사진이야. 이 사진에 대해 예진이 시점으로 느끼고 말해줘... (생략)`);
    const messages = [
        { role: 'user', content: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] },
    ];
    uncleFaces.forEach(base64 => messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] }));
    yejinFaces.forEach(base64 => messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] }));
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

function setForcedModel(name) {
    if (['gpt-3.5-turbo', 'gpt-4o'].includes(name)) {
        forcedModel = name;
        console.log(`[Model Switch] 모델이 ${name}으로 강제 설정되었습니다.`);
    } else {
        forcedModel = null;
        console.log('[Model Switch] 모델 강제 설정이 해제되었습니다 (자동 선택).');
    }
}

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
    }
    return null;
}

async function getProactiveMemoryMessage() {
    // 이 함수의 내용은 기존과 동일합니다.
    return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~";
}

async function getSilenceCheckinMessage() {
    // 이 함수의 내용은 기존과 동일합니다.
    return "아저씨... 바빠? 무슨 일 있는 건 아니지? 걱정되네...";
}

async function getMemoryListForSharing() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        if (!allMemories || allMemories.length === 0) {
            return "💖 아저씨, 아직 예진이의 기억 보관함이 텅 비어있네... ㅠㅠ 아저씨랑 더 많은 추억을 만들고 싶다! 💖";
        }
        let memoryListString = "💖 아저씨, 예진이의 기억 보관함이야! 💖\n\n";
        const groupedMemories = {};
        allMemories.forEach(mem => {
            const category = mem.category || '기타';
            if (!groupedMemories[category]) {
                groupedMemories[category] = [];
            }
            groupedMemories[category].push(mem);
        });
        for (const category in groupedMemories) {
            memoryListString += `--- ✨ ${category} ✨ ---\n`;
            groupedMemories[category].forEach(item => {
                memoryListString += `  - ${item.content} (기억된 날: ${moment(item.timestamp).format('YYYY.MM.DD')}, 중요도: ${item.strength || 'normal'})\n`;
            });
        }
        return memoryListString.length > 4500 ? "기억이 너무 많아 다 보여주기 힘들어 ㅠㅠ" : memoryListString;
    } catch (error) {
        console.error('❌ [autoReply Error] 기억 목록 생성 실패:', error);
        return '아저씨... 예진이의 기억 목록을 불러오다가 문제가 생겼어 ㅠㅠ 미안해...';
    }
}

// 모듈 내보내기
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getMemoryListForSharing,
    getSilenceCheckinMessage
};
