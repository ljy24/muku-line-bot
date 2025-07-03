// autoReply.js v1.7 - 기억 공유 기능 추가 (memoryManager 연동)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
// retrieveRelevantMemories: 대화 맥락에 맞는 기억을 검색하는 새로운 함수
// loadLoveHistory, loadOtherPeopleHistory: 모든 기억을 불러오는 함수 (기억 공유에 필요)
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
        validHours: [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], // 스케줄러 유효 시간대 (일본 표준시 기준)
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
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘
