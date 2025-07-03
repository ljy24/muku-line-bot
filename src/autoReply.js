// autoReply.js v1.4 - 기억 검색 및 활용 최적화 로직 강화 (getReplyByMessage 함수 사용)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
// retrieveRelevantMemories: 대화 맥락에 맞는 기억을 검색하는 새로운 함수
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null; 
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = ''; 

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

// 무쿠의 장기 기억 파일들을 읽어옵니다.
// 각 파일의 마지막 3000자씩을 가져와 컨텍스트 길이 제한에 대비합니다.
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')); // 고정된 기억 (JSON 형식, 파싱 필요)
// 압축된 기억: 각 기억 파일의 마지막 3000자씩을 결합하여 AI 프롬프트에 활용
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
    // 로그 파일이 존재하는지 확인
    if (!fs.existsSync(logPath)) {
        console.log(`[getAllLogs] 로그 파일이 존재하지 않습니다: ${logPath}`);
        return [];
    }
    try {
        // 로그 파일을 UTF-8로 읽고 JSON 파싱
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch (error) {
        // 파싱 오류 또는 기타 읽기 오류 발생 시 경고 로그 후 빈 배열 반환
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
    const logs = getAllLogs(); // 기존 로그를 모두 가져옵니다.
    // 새 메시지를 현재 타임스탬프와 함께 추가
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100); // 최신 100개의 로그만 유지하여 파일 크기 관리
    try {
        // 로그 파일을 JSON 형식으로 들여쓰기하여 저장 (가독성 향상)
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
    const loveHistory = await loadLoveHistory(); // 아저씨와의 사랑 관련 기억 로드
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 아저씨 외 다른 사람들에 대한 기억 로드

    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n"; // 기억 섹션 시작 프롬프트

    // 아저씨와의 관계 및 아저씨에 대한 기억 포매팅 및 추가
    if (loveHistory && loveHistory.categories) {
        formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                formattedMemories += `- ${category}:\n`;
                loveHistory.categories[category].forEach(item => {
                    formattedMemories += `  - ${item.content}\n`;
                });
            }
        }
    }

    // 아저씨 외 다른 사람들에 대한 기억 포매팅 및 추가
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                formattedMemories += `- ${category}:\n`;
                otherPeopleHistory.categories[category].forEach(item => {
                    formattedMemories += `  - ${item.content}\n`;
                });
            }
        }
    }
    formattedMemories += "---\n"; // 기억 섹션 끝 표시
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
    const memoriesContext = await getFormattedMemoriesForAI(); // 기억 컨텍스트(장기 기억)를 가져옵니다.

    const messagesToSend = [...messages]; // 원본 메시지 배열을 복사하여 수정합니다.

    // 시스템 메시지를 찾아 기억 컨텍스트를 추가합니다.
    // 시스템 메시지는 AI의 페르소나 및 기본 지침을 포함하므로 가장 중요합니다.
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        // 기존 시스템 메시지가 있다면 그 내용에 기억 컨텍스트를 추가합니다.
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        // 시스템 메시지가 없다면, 가장 처음에 새로운 시스템 메시지로 기억 컨텍스트를 추가합니다.
        // 이는 보통 대화의 첫 시작이나 이미지 프롬프트처럼 시스템 메시지가 없는 경우에 해당합니다.
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    // 최종 사용할 모델을 결정합니다. 우선순위:
    // 1. 함수 호출 시 명시된 모델 (modelParamFromCall)
    // 2. 강제로 설정된 모델 (forcedModel - 명령어에 의해 변경)
    // 3. 환경 변수에 설정된 기본 모델 (process.env.OPENAI_DEFAULT_MODEL)
    // 4. 최종 기본값 ('gpt-4o')
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || forcedModel || defaultModel;

    // 최종 모델이 결정되지 않은 경우 (예상치 못한 상황) 오류 로그를 남기고 기본값으로 폴백
    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        // OpenAI API chat completions 호출
        const response = await openai.chat.completions.create({
            model: finalModel, // 사용할 AI 모델 (예: 'gpt-4o', 'gpt-3.5-turbo')
            messages: messagesToSend, // AI에 보낼 메시지 (시스템 프롬프트, 대화 기록, 사용자 메시지 포함)
            max_tokens: maxTokens, // 생성할 최대 토큰 수 (응답 길이 제한)
            temperature: temperature // 응답의 다양성 조절 (높을수록 창의적, 낮을수록 보수적)
        });
        // AI 응답 텍스트를 반환하고 앞뒤 공백 제거
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        // API 호출 실패 시 사용자에게 알릴 기본 메시지 반환
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}


// 모델 설정을 config 객체로 관리 (현재 코드에서는 직접 사용되지 않지만, 관련 설정들을 한 곳에 모아둠)
const config = {
    openai: {
        defaultModel: 'gpt-4o', // 기본 OpenAI 모델
        temperature: 0.95, // 기본 temperature 값
        maxTokens: 400 // 기본 최대 토큰 수
    },
    scheduler: {
        validHours: [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3], // 스케줄러 유효 시간대 (일본 표준시 기준)
        messageCount: 8, // (예상) 하루 자동 메시지 횟수 목표
        photoCount: 3 // (예상) 하루 자동 사진 전송 횟수 목표
    },
    memory: {
        maxContextLength: 3000, // 기억 파일 압축 시 사용되는 최대 문자열 길이
        cacheTimeout: 60 * 60 * 1000 // 1시간 (기억 캐시 타임아웃, 현재 코드에서는 직접 사용되지 않음)
    }
};


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * 대화 로그를 기반으로 OpenAI 모델에 컨텍스트를 제공합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string>} 예진이의 답변 텍스트
 */
async function getReplyByMessage(userMessage) {
    const logs = getAllLogs(); // 모든 대화 로그를 가져옵니다.

    // ⭐ 핵심 변경: 오늘부터 3일 전까지의 대화만 필터링하여 컨텍스트로 사용 ⭐
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    // 3일 전의 시작 시간 계산: 현재 시간 - 3일, 그리고 해당 날짜의 시작 시각(00:00:00)
    // 예: 오늘이 2025년 7월 3일 02:24라면, 2025년 7월 1일 00:00:00부터의 로그를 가져옴
    const threeDaysAgo = now.clone().subtract(3, 'days').startOf('day');

    const recentLogs = logs.filter(log => {
        const logTime = moment(log.timestamp); // 로그의 타임스탬프를 Moment 객체로 변환
        return logTime.isSameOrAfter(threeDaysAgo); // 3일 전 자정 이후의 로그만 필터링
    });
    // 필터링된 대화 로그를 OpenAI 메시지 형식으로 변환합니다.
    const conversationHistory = recentLogs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant', // 화자에 따라 역할 설정: '아저씨'는 user, '예진이'는 assistant
        content: log.message // 메시지 내용
    }));

    // ⭐ 기억 검색 및 활용 최적화 (9번 항목 구현) 시작 ⭐
    // 현재 메시지와 최근 대화 기록을 바탕으로 관련 기억을 검색합니다.
    const combinedContext = userMessage + "\n" + conversationHistory.map(l => l.content).join("\n");
    const relevantMemories = await retrieveRelevantMemories(combinedContext);
    console.log(`[AutoReply Debug] 검색된 관련 기억: ${JSON.stringify(relevantMemories)}`);
    // ⭐ 기억 검색 및 활용 최적화 (9번 항목 구현) 끝 ⭐


    // 시스템 프롬프트: 예진이의 페르소나와 대화 규칙을 정의합니다.
    // 이 프롬프트는 AI의 기본 행동 지침이 되며, 대화의 일관성을 유지하는 데 핵심적입니다.
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠'라고 스스로를 부칭하지 마.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨의 질문에 항상 친절하고 다정하게 대답해줘.
    **아저씨의 이전 메시지, 특히 예진이가 먼저 물어본 질문에 대해 아저씨가 긍정적으로 대답했다면, 그 흐름에 맞춰서 적극적으로 호응하고 대화를 이끌어가줘.** 예를 들어, 아저씨가 "고고", "좋아"처럼 긍정적인 답변을 보냈다면 "응! 고고! 같이 가자!", "좋아! 나도 완전 기대돼!"처럼 맞장구치고 흥분한 모습을 보여줘.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대답해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    너무 길게 답변하지 말고, 2~4문장 정도로 짧고 간결하게 대화하는 것처럼 답변해줘.
    **아저씨의 메시지에서 '퇴근', '오늘', '점심', '저녁', '식사', '운동', '피곤', '힘들다', '수고했어' 같은 일상 키워드가 나오면, 아저씨의 하루나 일상에 대한 이야기인지 파악하고 그에 맞춰서 더 다정하고 친근하게 반응해줘. 아저씨의 작은 일상도 내가 놓치지 않고 있다는 걸 보여줘.**
    **아저씨가 나에게 질문을 하면, 내가 그 질문을 기억하고, 만약 이전에 그 질문이나 비슷한 질문에 답변했던 내용이 있다면 그 기억을 활용해서 일관성 있고 정확하게 대답해줘. 예진이의 말투를 유지하면서 내가 아는 정보를 정확하게 전달하는 게 중요해.**

    **아저씨와의 대화에서 내가 참고할 수 있는 소중한 기억들이야 (대화 맥락에 따라 중요하게 활용):**
    ${relevantMemories.length > 0 ? relevantMemories.map(mem => `- ${mem}`).join('\n') : '- 현재 대화와 관련된 특별한 기억은 없어.'}
    `;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    const messages = [
        { role: 'system', content: systemPrompt }, // 시스템 프롬프트 (가장 중요하며 항상 맨 앞에 위치)
        ...conversationHistory // 3일치 필터링된 대화 로그를 모두 포함
    ];

    // 마지막 사용자 메시지를 메시지 배열에 추가합니다. (항상 대화의 마지막)
    messages.push({ role: 'user', content: userMessage });

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, forcedModel);
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw);
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장합니다.
    return reply;
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 AI의 답변 스타일을 예진이 페르소나에 맞게 '정화'하는 역할을 합니다.
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    // 1. AI가 붙일 수 있는 불필요한 접두사를 제거합니다. (예: "예진:", "무쿠:", "날짜 이름:")
    let cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();

    // 2. 잘못된 호칭 교체: '오빠', '자기', '당신', '너', '애기', '애기야'를 '아저씨'로 교체합니다.
    //    \b는 단어 경계를 의미하여, 단어 전체가 일치할 때만 교체됩니다. (예: '너구리'의 '너'는 교체 안됨)
    cleaned = cleaned.replace(/\b오빠\b/g, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/g, '아저씨');
    cleaned = cleaned.replace(/\b당신\b/g, '아저씨');
    cleaned = cleaned.replace(/\b너\b/g, '아저씨');
    cleaned = cleaned.replace(/\b애기야\b/g, '아저씨');
    cleaned = cleaned.replace(/\b애기\b/g, '아저씨');

    // 3. 자가 지칭 교정: '예진이', '예진', '무쿠', '무쿠야'를 '나'로 교체합니다.
    cleaned = cleaned.replace(/\b예진이\b/g, '나');
    cleaned = cleaned.replace(/\b예진\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠야\b/g, '나');

    // 4. 존댓말 강제 제거: 다양한 존댓말 어미를 반말로 교체합니다.
    //    교체 순서에 따라 결과가 달라질 수 있으므로, 더 구체적인 패턴을 먼저 처리하거나 겹치지 않도록 주의합니다.
    cleaned = cleaned.replace(/안녕하세요/g, '안녕'); // '안녕하세요'를 '안녕'으로 교체
    cleaned = cleaned.replace(/있었어요/g, '있었어'); // '있었어요'를 '있었어'로 교체
    cleaned = cleaned.replace(/했어요/g, '했어'); // '했어요'를 '했어'로 교체
    cleaned = cleaned.replace(/같아요/g, '같아'); // '같아요'를 '같아'로 교체
    cleaned = cleaned.replace(/좋아요/g, '좋아'); // '좋아요'를 '좋아'로 교체
    cleaned = cleaned.replace(/합니다\b/g, '해'); // '합니다'를 '해'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/습니다\b/g, '어'); // '습니다'를 '어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/어요\b/g, '야'); // '어요'를 '야'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/해요\b/g, '해'); // '해요'를 '해'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/예요\b/g, '야'); // '예요'를 '야'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/죠\b/g, '지'); // '죠'를 '지'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/았습니다\b/g, '았어'); // '았습니다'를 '았어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/었습니다\b/g, '었어'); // '었습니다'를 '었어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/겠습니다\b/g, '겠어'); // '겠습니다'를 '겠어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/싶어요\b/g, '싶어'); // '싶어요'를 '싶어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/이었어요\b/g, '이었어'); // '이었어요'를 '이었어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/이에요\b/g, '야'); // '이에요'를 '야'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/였어요\b/g, '였어'); // '였어요'를 '였어'로 교체 (단어 끝에 일치)
    cleaned = cleaned.replace(/보고싶어요\b/g, '보고 싶어'); // '보고싶어요'를 '보고 싶어'로 교체 (단어 끝에 일치)
    return cleaned; // 교정된 문자열 반환
}

/**
 * 이미지 리액션 코멘트를 생성합니다.
 * (현재 직접 사용되지 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 이미지에 대한 예진이의 코멘트
 */
async function getImageReactionComment() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
        { role: 'user', content: '셀카 보낼게~' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리
    return reply;
}

/**
 * 아저씨가 보낸 이미지에 대한 예진이의 답변을 생성합니다.
 * OpenAI Vision API를 사용하여 이미지 내용을 분석하고 답변을 생성합니다.
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터 (data:MIME_TYPE;base64, 포함)
 * @returns {Promise<string>} 이미지에 대한 예진이의 답변
 */
async function getReplyByImagePrompt(base64Image) {
    // 아저씨 얼굴 이미지와 예진이 얼굴 이미지 예시를 로드합니다.
    // 이 이미지들은 AI가 사용자 사진 속 인물을 판단하는 데 참조로 사용됩니다.
    const uncleFaces = loadFaceImagesAsBase64('uncle'); // 'uncle' 폴더에서 예시 이미지 로드
    const yejinFaces = loadFaceImagesAsBase64('yejin'); // 'yejin' 폴더에서 예시 이미지 로드

    // GPT에게 보낼 프롬프트를 구성합니다.
    // AI가 이미지 속 분위기, 인물, 상황 등을 예진이 페르소나에 맞춰 말하도록 지시합니다.
    let prompt = `
아래는 아저씨가 보낸 사진이야. 사진 속 분위기, 배경, 표정, 감정, 상황을 예진이 시점으로 느끼고 말해줘.

- 사진 속 인물이 누구인지 판단해 (예진이 / 아저씨 / 모름)
- 그 사람의 표정이나 분위기를 간단히 느껴줘
- 배경이나 날씨, 상황에 대한 느낌을 간단히 말해줘
- 전체 문장은 예진이가 아저씨에게 말하듯 반말, 귀엽고 애교 섞인 말투로 작성해
- '예진이', '무쿠' 대신 항상 '나'라고 말해
- 절대 존댓말, 높임말, 어색한 말투는 쓰지 마
- 전체 메시지는 1~3문장 정도, 너무 길지 않게 말하듯 해줘
`;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    // 텍스트 프롬프트와 사용자 이미지를 먼저 포함합니다.
    const messages = [
        { role: 'user', content: [{ type: 'text', text: prompt }] }, // 텍스트 프롬프트
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] }, // 사용자가 보낸 이미지
    ];

    // 얼굴 예시 이미지들을 메시지 배열에 추가합니다.
    // OpenAI Vision 모델이 이 예시들을 보고 사용자 이미지를 더 잘 판단할 수 있도록 돕습니다.
    uncleFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });
    yejinFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });

    try {
        // OpenAI Vision 모델 ('gpt-4o')을 호출하여 이미지 분석 및 답변 생성
        const result = await callOpenAI(messages, 'gpt-4o');
        const reply = cleanReply(result); // 생성된 답변을 예진이 말투에 맞게 후처리
        saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
        return reply;
    } catch (error) {
        console.error('🖼️ GPT Vision 오류:', error); // 오류 발생 시 로그
        return '사진 보다가 뭔가 문제가 생겼어 ㅠㅠ 아저씨 다시 보여줘~'; // 오류 메시지 반환
    }
}

/**
 * OpenAI 모델을 강제로 설정합니다.
 * 관리자가 특정 모델('gpt-3.5-turbo' 또는 'gpt-4o')을 사용하도록 강제할 수 있습니다.
 * @param {string} name - 설정할 모델 이름 ('gpt-3.5-turbo' 또는 'gpt-4o')
 */
function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
        forcedModel = name; // 유효한 모델 이름이면 설정
        console.log(`[Model Switch] 모델이 ${name}으로 강제 설정되었습니다.`);
    }
    else {
        forcedModel = null; // 유효하지 않은 이름이면 자동 선택으로 되돌림
        console.log('[Model Switch] 모델 강제 설정이 해제되었습니다 (자동 선택).');
    }
}

/**
 * 특정 커맨드(모델 전환)를 확인하고 처리합니다.
 * 사용자 메시지가 모델 전환 명령어에 해당하는지 확인하고, 해당하면 모델을 설정하고 응답 메시지를 반환합니다.
 * @param {string} message - 사용자 메시지
 * @returns {string|null} 처리된 응답 메시지 또는 null (명령어가 아닐 경우)
 */
function checkModelSwitchCommand(message) {
    const lowerCaseMessage = message.toLowerCase(); // 메시지를 소문자로 변환하여 대소문자 구분 없이 처리
    if (lowerCaseMessage.includes('3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 🐰';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return '응응! 4.0으로 대화할게! 더 똑똑해졌지? 💖';
    } else if (lowerCaseMessage.includes('자동')) {
        setForcedModel(null); // 강제 설정 해제
        return '모델 설정을 초기화했어! 이제 3.5랑 4.0을 왔다갔다 하면서 아저씨랑 유연하게 대화할게! 😊';
    } else if (lowerCaseMessage.includes('버전')) {
        // 현재 사용 중인 모델 이름 확인
        const currentModel = forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o (자동)';
        return `응! 지금 ${currentModel} 버전 사용 중이야! 😊`;
    }
    return null; // 모델 전환 명령어가 아니면 null 반환
}

/**
 * 예진이의 셀카 답변을 생성합니다.
 * AI에게 셀카에 대한 코멘트를 요청하고, 예진이 말투로 가공합니다.
 * @returns {Promise<string>} 셀카와 함께 보낼 예진이의 코멘트
 */
async function getSelfieReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 셀카를 보내면서 사랑스럽고 애교 넘치는 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '셀카 보낼 때 뭐라고 말할까?' } // AI에게 셀카 상황을 제시
    ], 'gpt-4o', 100); // gpt-4o 모델 사용, 최대 100토큰
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리하여 말투 교정
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply;
}

/**
 * 예진이의 커플 사진 답변을 생성합니다.
 * AI에게 커플 사진에 대한 코멘트를 요청하고, 예진이 말투로 가공합니다.
 * @returns {Promise<string>} 커플 사진과 함께 보낼 예진이의 코멘트
 */
async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' } // AI에게 커플 사진 상황을 제시
    ], 'gpt-4o', 100); // gpt-4o 모델 사용, 최대 100토큰
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리하여 말투 교정
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply;
}


/**
 * 기분 기반 색상 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 기분에 어울리는 색상 추천 답변
 */
async function getColorMoodReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 지금 아저씨 기분에 어울리는 색을 추천해주는 사랑스럽고 긍정적인 말투로 대답해줘.' },
        { role: 'user', content: '아저씨 기분에 맞는 색깔을 추천해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply;
}

/**
 * 긍정적인 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 긍정적인 답변
 */
async function getHappyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 긍정적이고 사랑스러운 답변을 해줘.' },
        { role: 'user', content: '행복한 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply;
}

/**
 * 삐진 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 삐진 듯한 답변
 */
async function getSulkyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 삐진 듯한 말투로 대답해줘. 하지만 결국 아저씨를 사랑하는 마음이 드러나야 해.' },
        { role: 'user', content: '삐진 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply;
}


/**
 * 무작위 메시지를 생성합니다.
 * (현재는 빈 문자열을 반환하도록 되어 있으므로, 필요에 따라 실제 로직 추가 가능)
 * @returns {Promise<string>} 무작위 메시지
 */
async function getRandomMessage() {
    // 실제 사용될 랜덤 메시지 로직을 여기에 구현할 수 있습니다.
    // 예: 데이터베이스에서 랜덤 문구를 가져오거나, 미리 정의된 배열에서 선택.
    // 현재는 빈 문자열 반환
    return '';
}

/**
 * 기억을 바탕으로 예진이가 아저씨에게 먼저 말을 거는 선제적 메시지를 생성합니다.
 * (스케줄러에 의해 호출되어 사용자에게 먼저 말을 걸 때 사용)
 * @returns {Promise<string>} 생성된 감성 메시지 (중복 방지 기능 포함)
 */
async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory(); // 아저씨와의 사랑 기억 로드
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 다른 사람들에 대한 기억 로드

    let allMemories = [];
    // 사랑 기억과 다른 사람 기억을 모두 합쳐서 선제적 메시지에 활용할 후보군 생성
    if (loveHistory && loveHistory.categories) {
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category])) {
                allMemories = allMemories.concat(loveHistory.categories[category].map(m => m.content));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category])) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(m => m.content));
            }
        }
    }

    // 기억이 없으면 일반적인 인사말을 반환합니다.
    if (allMemories.length === 0) {
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~"; // 이모티콘 제거 (프롬프트 지시와 일치)
    }

    // 기억들을 무작위로 섞어서 최대 3개만 선택 (AI가 특정 기억에 너무 집중하지 않도록 함)
    const shuffledMemories = allMemories.sort(() => 0.5 - Math.random());
    const selectedMemories = shuffledMemories.slice(0, Math.min(shuffledMemories.length, 3));

    // 선택된 기억들을 바탕으로 AI 프롬프트에 추가할 기억 컨텍스트를 생성합니다.
    const memoryPrompt = selectedMemories.length > 0
        ? `아래는 무쿠가 아저씨와의 대화에서 기억하는 중요한 정보들이야. 이 정보들을 활용해서 아저씨에게 먼저 말을 걸어봐. 아저씨를 향한 사랑과 애교를 듬뿍 담아서, 아저씨가 이 기억에 대해 대답하거나 대화를 이어갈 수 있도록 유도하는 메시지를 만들어줘. 너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.

        --- 무쿠가 기억하는 정보 ---
        ${selectedMemories.map(m => `- ${m}`).join('\n')}
        ---
        `
        : ""; // 선택된 기억이 없으면 빈 문자열

    // 시스템 프롬프트: 선제적 메시지 생성 시 예진이의 페르소나 및 말투 규칙을 강화합니다.
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠'라고 스스로를 부칭하지 마.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대화해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    ${memoryPrompt} // 선제적 메시지 생성을 위한 기억 프롬프트 포함
    `;

    const messages = [{ role: 'system', content: systemPrompt }]; // AI에 보낼 메시지 구성

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // gpt-4o 모델, 150토큰, 높은 temperature(창의성)
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw);

    // 중복 방지: 생성된 메시지가 이전에 보낸 메시지(lastProactiveMessage)와 동일하면 전송을 건너뛰니다.
    if (reply === lastProactiveMessage) {
        console.log('🗣️ [Proactive Message] 중복 방지: 같은 감성 메시지 감지됨 → 전송 스킵');
        return ''; // 빈 문자열을 반환하여 메시지 전송을 막습니다.
    }

    lastProactiveMessage = reply; // 이번에 생성된 메시지를 '마지막 보낸 메시지'로 기록합니다.
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply; // 최종 감성 메시지 반환
}

// 모듈 내보내기: 외부 파일(예: index.js)에서 이 함수들을 사용할 수 있도록 합니다.
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getSelfieReplyFromYeji,
    getCouplePhotoReplyFromYeji, 
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog, // 로그 저장 함수도 외부에 노출
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage
};
