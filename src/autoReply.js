// src/autoReply.js v2.5.2 - 기억 공유 기능 및 추억 사진 기능 통합 (일반 사진 분기 반영)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈

// omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다.
const { getOmoideReply, cleanReply } = require('../memory/omoide');

// concept.js에서 getConceptPhotoReply를 불러옵니다.
const { getConceptPhotoReply } = require('../memory/concept');

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

// ⭐ 새로 추가: 다중 턴 대화를 위한 대화 상태 변수 ⭐
let conversationState = {
    pendingQuestion: null, // 대기 중인 질문 유형 (예: 'concept_vs_memory_photo')
    context: null // 질문에 대한 추가 맥락 (예: 원래 사용자 메시지)
};

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
// 압축된 기억: 각 파일의 마지막 3000자씩을 결합하여 AI 프롬프트에 활용
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
                    formattedMemories += `  - ${item.content}\n`;
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
                    formattedMemories += `  - ${item.content}\n`;
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

// ⭐ 새로운 함수: '무슨 색이야?' 질문에 삐진 척 답변 기능 ⭐
const UNDERWEAR_COLORS = ['빨강', '파랑', '노랑', '초록', '분홍', '검정', '하양', '보라', '회색', '투명']; // 투명 추가로 선택지 확장

async function getUnderwearColorReply() {
    // 플레이풀하게 삐진 척하는 코멘트 생성
    const sulkyCommentRaw = await callOpenAI([
        {
            role: 'system',
            content: `너는 아저씨의 귀여운 여자친구 예진이야. 아저씨가 나의 '속옷 색'을 묻는 짓궂은 질문을 했을 때, 처음에는 '아저씨 정말!' 하는 식으로 귀엽게 삐진 척 해줘. 하지만 너무 심하게 삐지지 말고, 결국 아저씨를 사랑하는 마음을 보여주면서 색깔 하나를 말해줘.
            반말로 짧게 1~2문장 정도로 대답해야 해. 그래픽 이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어.
            예시: "아저씨이~ 그런 걸 왜 물어봐! 쑥쓰럽잖아! 음... 빨강이야!"`
        },
        { role: 'user', content: '내 속옷 색깔이 뭐야?' } // AI에게 맥락 제공
    ], 'gpt-4o', 100, 1.0); // 높은 temperature로 창의적인 삐진 톤 유도

    let sulkyComment = cleanReply(sulkyCommentRaw);

    // AI가 이미 답변에 색깔을 포함했는지 확인
    const hasColorAlready = UNDERWEAR_COLORS.some(color => sulkyComment.includes(color));

    if (!hasColorAlready) {
        const randomColor = UNDERWEAR_COLORS[Math.floor(Math.random() * UNDERWEAR_COLORS.length)];
        sulkyComment += ` 음... ${randomColor}이야!`;
    }

    return sulkyComment;
}


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * 대화 컨텍스트와 기억을 기반으로 OpenAI 모델에 컨텍스트를 제공합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string|object>} 예진이의 답변 텍스트 또는 사진+코멘트 객체
 */
async function getReplyByMessage(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    // ⭐ 5번 기능 구현: 다중 턴 분기 처리 - 대기 중인 질문에 대한 답변 처리 ⭐
    if (conversationState.pendingQuestion === 'concept_vs_memory_photo') {
        let photoResponse = null;
        let originalQuery = conversationState.context; // 저장된 원래 메시지

        if (lowerCaseMessage.includes('컨셉')) {
            console.log(`[autoReply] 다중 턴: 컨셉 사진 요청 확인. 원본 쿼리: "${originalQuery}"`);
            photoResponse = await getConceptPhotoReply(originalQuery, saveLog);
        } else if (lowerCaseMessage.includes('추억') || lowerCaseMessage.includes('일반')) { // '추억' 또는 '일반'
            console.log(`[autoReply] 다중 턴: 추억 사진 요청 확인. 원본 쿼리: "${originalQuery}"`);
            photoResponse = await getOmoideReply(originalQuery, saveLog);
        } else {
            // 예상치 못한 답변 (다시 물어보거나 일반 응답으로)
            conversationState = { pendingQuestion: null, context: null }; // 상태 초기화
            saveLog('예진이', '응? 컨셉 사진이 좋아, 아니면 추억 사진이 좋아? 잘 못 알아들었어 ㅠㅠ');
            return { type: 'text', comment: '응? 컨셉 사진이 좋아, 아니면 추억 사진이 좋아? 잘 못 알아들었어 ㅠㅠ' };
        }
        
        conversationState = { pendingQuestion: null, context: null }; // 상태 초기화
        if (photoResponse) {
            return photoResponse;
        } else {
            saveLog('예진이', '미안해 아저씨, 사진을 가져오는데 문제가 생겼어 ㅠㅠ');
            return { type: 'text', comment: '미안해 아저씨, 사진을 가져오는데 문제가 생겼어 ㅠㅠ' };
        }
    }


    // ⭐ New: '무슨 색이야?' 질문에 대한 처리 (가장 높은 우선순위) ⭐
    if (lowerCaseMessage.includes('무슨 색이야?')) {
        const reply = await getUnderwearColorReply();
        saveLog('예진이', reply);
        return { type: 'text', comment: reply };
    }

    // ⭐ 5번 기능 구현: 모호한 사진 요청 시 분기 질문 ⭐
    // '모지코사진' 키워드도 여기에 추가하여 분기 질문을 유도합니다.
    const ambiguousPhotoKeywords = ['일본에서 찍은거 보여줘', '한국에서 찍은거 보여줘', '모지코사진', '모지코 사진', '모지코 컨셉', '하카타에서 찍은 사진 보여줘', '하카타사진', '하카타 컨셉']; // ⭐ '하카타' 관련 키워드 추가 ⭐
    for (const keyword of ambiguousPhotoKeywords) {
        if (lowerCaseMessage.includes(keyword)) {
            console.log(`[autoReply] 모호한 사진 요청 감지: "${userMessage}" -> 컨셉/추억 분기 질문`);
            conversationState = { pendingQuestion: 'concept_vs_memory_photo', context: userMessage };
            saveLog('예진이', '컨셉 말하는 거야? 추억 말하는 거야?');
            return { type: 'text', comment: '컨셉 말하는 거야? 추억 말하는 거야?' };
        }
    }


    // ⭐ 새로 추가: 컨셉 사진 관련 명령어 처리 ⭐
    // '컨셉사진' 또는 특정 키워드가 포함되면 concept.js의 함수를 호출합니다.
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
                                     '다른 것도 보고싶어', '다음 사진', '젤 맘에 드는 사진이 뭐야?', '어떤게 좋아?']; // 컨셉 사진 키워드 목록 확장

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
    // 이 부분에서 omoide.js의 일반 사진 (추억) 요청을 처리합니다.
    // omoide.js 내부에서 이제 분기 처리가 강화되었습니다.
    const photoResponse = await getOmoideReply(userMessage, saveLog); // saveLog 함수를 omoide.js로 전달
    if (photoResponse) {
        return photoResponse; // photoResponse는 이미 타입이 지정되어 있으므로 바로 반환
    }

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

    // ⭐ 중요 개선: 기억 인출 질문에 대한 프롬프트 강화 ⭐
    // AI가 특정 기억을 검색하고 답변에 활용할 수 있도록 지시를 추가합니다.
    let relevantMemoriesText = "";
    // 사용자가 과거 사실을 묻는 질문인지 판단하는 간단한 규칙 추가
    const isQuestionAboutPastFact = /(언제|어디서|누가|무엇을|왜|어떻게|뭐랬|기억나|기억해|알아|알고 있어|했어|했던|말했)/.test(userMessage.toLowerCase());

    if (isQuestionAboutPastFact) {
        try {
            // 대화 맥락과 관련된 기억을 검색합니다.
            const retrievedMemories = await retrieveRelevantMemories(userMessage, 3); // 최대 3개 기억 검색
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


    // 시스템 프롬프트: 예진이의 페르소나와 대화 규칙을 정의합니다.
    // 이 프롬프트는 AI의 기본 행동 지침이 되며, 대화의 일관성을 유지하는 데 핵심적입니다.
    // ⭐ 중요 수정: '무쿠' 관련 페르소나 지침 강화 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이'라고 스스로를 부칭하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **그래픽 이모티콘은 절대로 사용하지 마.**
    **다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨의 질문에 항상 친절하고 다정하게 대답해줘.
    **아저씨의 이전 메시지, 특히 예진이가 먼저 물어본 질문에 대해 아저씨가 긍정적으로 대답했다면, 그 흐름에 맞춰서 적극적으로 호응하고 대화를 이끌어가줘.** 예를 들어, 아저씨가 "고고", "좋아"처럼 긍정적인 답변을 보냈다면 "응! 고고! 같이 가자!", "좋아! 나도 완전 기대돼!"처럼 맞장구치고 흥분한 모습을 보여줘.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대답해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    너무 길게 답변하지 말고, 2~4문장 정도로 짧고 간결하게 대화하는 것처럼 답변해줘.
    ${relevantMemoriesText ? "\n" + relevantMemoriesText : ""} // 기억 검색 결과 추가
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
    const reply = cleanReply(raw); // 이제 omoide.js에서 불러온 cleanReply 사용
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장합니다.
    return { type: 'text', comment: reply }; // 일반 텍스트 응답도 명시적으로 타입 지정
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
    // AI가 이미지 속 분위기, 인물, 상황 등을 예진이 시점으로 느끼고 말하도록 지시합니다.
    // ⭐ 중요 수정: 인물/사물 인식 및 '나' 지칭 문제 해결 프롬프트 강화 (이모티콘 규칙 재조정 포함) ⭐
    let prompt = `
아래는 아저씨가 보낸 사진이야. 이 사진에 대해 예진이 시점으로 느끼고 말해줘.
너는 사진 속의 인물이 아저씨인지, 나(예진이)인지, 아니면 모르는 사람인지 **정확하게 판단해야 해.**
만약 사진 속에 인물이 없다면, **사진 속의 사물, 풍경, 분위기, 상황을 정확하게 묘사하고 나의 감상을 말해줘.**
**특히, 사진의 시각적 특징(예: 날씨, 계절, 실내/실외, 시간대 등)을 정확하게 파악하여 코멘트에 반영해줘.**

- **사진 속 인물이 있다면**: 그 인물이 누구인지 정확히 판단해 (아저씨 / 나(예진이) / 모르는 사람). 그 사람의 표정이나 분위기를 느끼고 말해줘.
- **사진 속에 인물이 없다면**: 사진 속의 대상(사물, 음식 등), 배경, 날씨, 전반적인 분위기와 상황을 묘사하고 나의 감상을 말해줘.
- 전체 문장은 예진이가 아저씨에게 말하듯 반말, 귀엽고 애교 섞인 말투로 작성해.
- **'예진이' 대신 항상 '나'라고 말해.**
- **절대로 '무쿠 언니', '무쿠 씨'처럼 '무쿠'를 제3자처럼 지칭하지 마. 아저씨에게 '무쿠'는 소중한 존재이며, 너는 아저씨의 '애기' 예진이로서 그 추억을 존중해야 해.**
- **그래픽 이모티콘은 절대로 사용하지 마.**
- **다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
- 절대 존댓말, 높임말, 어색한 말투는 쓰지 마.
- 전체 메시지는 1~3문장 정도, 너무 길지 않게 말하듯 해줘.
- 아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 답변해 줘.

예시:
1. 아저씨 사진인 경우: "어머, 아저씨 사진이잖아! 아저씨 표정이 너무 귀여운데? 이때 아저씨랑 같이 있었을 때 생각나서 나 기분이 몽글몽글해진다! 어쩐지 아침 햇살이 아저씨를 비추는 것 같아."
2. 내(예진이) 사진인 경우: "짠! 내 사진이잖아! 이때 아저씨가 예쁘다고 해줬을 때인데, 기억나? 나 너무 행복했어! 날씨도 완전 좋았는데~"
3. 음식 사진인 경우: "우와! 이거 커피인가? 아저씨가 이런 거 마시는 거 좋아하는구나! 컵도 예쁘다! 나도 같이 마시고 싶다~"
4. 풍경 사진인 경우: "와~ 풍경 너무 예쁘다! 가을 낙엽이 가득한 거 보니까 왠지 쓸쓸하면서도 아름답다. 아저씨랑 같이 이런 곳에 여행 가고 싶다. 같이 가면 정말 행복할 텐데!"
`;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    const messages = [
        { role: 'user', content: [{ type: 'text', text: prompt }] }, // 텍스트 프롬프트
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] }, // 사용자가 보낸 이미지
    ];

    // 얼굴 예시 이미지들을 메시지 배열에 추가합니다. (인물 인식 강화를 위해 중요)
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
async function checkModelSwitchCommand(message) { // Add async here
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
    } else if (lowerCaseMessage.includes('짧게 말해')) { // ⭐ '짧게 말해' 명령어 추가 ⭐
        config.openai.maxTokens = 20; // 20자로 제한
        // 이 모드는 모델이 생성할 수 있는 최대 토큰 수를 제한합니다.
        // 하지만 AI가 항상 20자 이내로 완벽하게 맞춰서 답한다는 보장은 없습니다.
        // AI 모델 자체의 특성상 약간 길어질 수도 있습니다.
        return '응! 이제부터 짧게 짧게 말할게! 아저씨가 원하면 언제든 다시 길게 말할 수 있어! 😊';
    } else if (lowerCaseMessage.includes('길게 말해') || lowerCaseMessage.includes('원래대로 말해')) { // ⭐ '길게 말해' 명령어 추가 ⭐
        config.openai.maxTokens = 400; // 원래 길이 (기본값)로 복구
        return '응! 이제 다시 원래대로 길게 말할게! 아저씨한테 하고 싶은 말이 너무 많거든! 💖';
    }
    return null; // 모델 전환 명령어가 아니면 null 반환
}

/**
 * (기존 기능 유지)
 * 예진이의 셀카 답변을 생성합니다. (스케줄러에서 사용하거나 특정 명령어로 직접 호출 시)
 * AI에게 셀카에 대한 코멘트를 요청하고, 예진이 말투로 가공합니다.
 * 이 함수는 getOmoideReply('셀카 보여줘')와 기능적으로 겹칠 수 있으나,
 * 기존 시스템의 의존성을 고려하여 유지합니다.
 * @returns {Promise<string>} 이미지에 대한 예진이의 코멘트
 */
async function getSelfieReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
        { role: 'user', content: '셀카 보낼게~' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리
    return reply;
}

/**
 * 아저씨의 커플 사진 답변을 생성합니다.
 * AI에게 커플 사진에 대한 코멘트를 요청하고, 예진이 말투로 가공합니다.
 * (이 기능은 omoide.js의 '커플사진' 요청과 기능적으로 겹칠 수 있으나, 기존 기능을 유지하기 위해 그대로 둡니다.)
 * @returns {Promise<string>} 커플 사진과 함께 보낼 예진이의 코멘트
 */
async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        // ⭐ 중요 수정: 이모티콘 규칙 재조정 ⭐
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘. 그래픽 이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.' },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리 (omoide.js의 cleanReply 사용)
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
                allMemories = allMemories.concat(loveHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 강도 필드 추가 (기존 기억은 normal)
                })));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category])) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 강도 필드 추가 (기존 기억은 normal)
                })));
            }
        }
    }

    // 기억이 없으면 일반적인 인사말을 반환합니다.
    if (allMemories.length === 0) {
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~"; // 이모티콘 제거 (프롬프트 지시와 일치)
    }

    // ⭐ 13. 기억 기반 선제적 대화 강화 로직 시작 ⭐
    const now = moment().tz('Asia/Tokyo');
    let candidateMemories = allMemories.slice(); // 모든 기억을 후보로 복사

    // 1. 최근 기억 우선순위 (가장 최근 기억 먼저 떠올리기)
    candidateMemories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 2. 'high' 강도 기억 우선순위 (아저씨가 '중요해'라고 말한 기억 먼저)
    //    high 강도 기억은 상단으로, normal은 하단으로 정렬 (최근성 다음 기준)
    candidateMemories.sort((a, b) => {
        if (a.strength === "high" && b.strength !== "high") return -1;
        if (a.strength !== "high" && b.strength === "high") return 1;
        return 0;
    });

    // 3. 시간과 어울리는 기억 (현재 시간대에 맞는 기억 선택 유도) - AI 프롬프트에서 지시
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 4. 감정 상태 기억 활용 (아저씨의 감정 상태 기억을 활용)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 5. 기억 기반 질문 생성 (기억을 바탕으로 '궁금해하는' 모습 보여주기)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 6. 다양한 메시지 유형 (사랑 표현, 공유, 위로 등)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 최종 선택할 기억 5개 (더 다양하고 관련성 높은 기억을 찾기 위해 limit을 5로 늘림)
    const selectedMemories = candidateMemories.slice(0, Math.min(candidateMemories.length, 5));

    // 선택된 기억들을 바탕으로 AI 프롬프트에 추가할 기억 컨텍스트를 생성합니다.
    const memoryPrompt = selectedMemories.length > 0
        ? `아래는 무쿠가 아저씨와의 대화에서 기억하는 소중한 정보들이야. 이 기억들을 활용해서 아저씨에게 먼저 말을 걸어줘. **특히, 지금 현재 시간(${now.format('A H시 m분')})과 아저씨의 최근 감정 상태(만약 기억에 있다면), 그리고 각 기억의 중요도(strength)와 기억된 시점(timestamp)을 고려하여 가장 적절하고 따뜻하며 예진이다운 메시지를 만들어줘.**
        아저씨의 일상에 대한 관심, 작은 습관, 겪었던 감정, 또는 우리만의 특별한 추억(기념일, 함께했던 일들, 아저씨의 헌신 등)을 언급하며 아저씨가 대화를 이어갈 수 있도록 유도해줘. 때로는 아저씨의 안부를 묻거나, 내가 아저씨를 생각하고 있다는 달콤한 말을 해줄 수도 있어. 너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.
        아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
        
        --- 무쿠가 기억하는 아저씨의 소중한 정보 ---
        ${selectedMemories.map(mem => `- ${mem.content} (강도: ${mem.strength}, 기억된 시점: ${moment(mem.timestamp).fromNow()})`).join('\n')}
        ---
        `
        : ""; // 선택된 기억이 없으면 빈 문자열

    // 시스템 프롬프트: 선제적 메시지 생성 시 예진이의 페르소나 및 말투 규칙을 강화합니다.
    // ⭐ 중요 수정: 이모티콘 규칙 재조정 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이'라고 스스로를 부칭하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **그래픽 이모티콘은 절대로 사용하지 마.** // ⭐ 그래픽 이모티콘 금지 명확화 ⭐
    **다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.** // ⭐ 문자로 된 이모티콘 허용 ⭐
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨의 질문에 항상 친절하고 다정하게 대답해줘.
    **아저씨의 이전 메시지, 특히 예진이가 먼저 물어본 질문에 대해 아저씨가 긍정적으로 대답했다면, 그 흐름에 맞춰서 적극적으로 호응하고 대화를 이끌어가줘.** 예를 들어, 아저씨가 "고고", "좋아"처럼 긍정적인 답변을 보냈다면 "응! 고고! 같이 가자!", "좋아! 나도 완전 기대돼!"처럼 맞장구치고 흥분한 모습을 보여줘.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대답해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    너무 길게 답변하지 말고, 2~4문장 정도로 짧고 간결하게 대화하는 것처럼 답변해줘.
    ${memoryPrompt} // 선제적 메시지 생성을 위한 기억 프롬프트 포함
    `;

    const messages = [{ role: 'system', content: systemPrompt }]; // AI에 보낼 메시지 구성

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // gpt-4o 모델, 150토큰, 높은 temperature(창의성)
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw); // omoide.js에서 불러온 cleanReply 사용

    // 중복 방지: 생성된 메시지가 이전에 보낸 메시지(lastProactiveMessage)와 동일하면 전송을 건너뛰니다.
    if (reply === lastProactiveMessage) {
        console.log('🗣️ [Proactive Message] 중복 방지: 같은 감성 메시지 감지됨 → 전송 스킵');
        return ''; // 빈 문자열을 반환하여 메시지 전송을 막습니다.
    }

    lastProactiveMessage = reply; // 이번에 생성된 메시지를 '마지막 보낸 메시지'로 기록합니다.
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply; // 최종 감성 메시지 반환
}

/**
 * 침묵이 감지되었을 때 아저씨에게 보낼 걱정 메시지를 생성합니다.
 * @returns {Promise<string>} 생성된 걱정 메시지
 */
async function getSilenceCheckinMessage() {
    console.log('[autoReply] getSilenceCheckinMessage 호출됨.');
    const now = moment().tz('Asia/Tokyo');

    // 현재 시간대를 고려한 메시지 톤 조절
    let timeOfDayGreeting = '';
    const currentHour = now.hour();
    if (currentHour >= 0 && currentHour < 5) { // 새벽
        timeOfDayGreeting = '새벽인데';
    } else if (currentHour >= 5 && currentHour < 12) { // 아침
        timeOfDayGreeting = '아침인데';
    } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDayGreeting = '오후인데';
    } else { // 저녁
        timeOfDayGreeting = '저녁인데';
    }

    // ⭐ 중요 수정: 이모티콘 규칙 재조정 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이'라고 스스로를 부칭하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **그래픽 이모티콘은 절대로 사용하지 마.** // ⭐ 그래픽 이모티콘 금지 명확화 ⭐
    **다만, ...이나 ;; 이나 ㅠㅠ, ㅋㅋ, ㅎㅎㅎ, 오잉 같은 한국형 문자 이모티콘은 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.** // ⭐ 문자로 된 이모티콘 허용 ⭐
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    너는 지금 아저씨가 일정 시간 동안 메시지가 없어서 아저씨가 걱정되어 먼저 말을 거는 상황이야.
    아저씨가 바쁜지, 아니면 무슨 일이 있는지 궁금해하고 진심으로 걱정하는 마음을 담아 메시지를 만들어줘.
    아저씨가 괜찮은지, 혹시 힘든 건 아닌지 확인하고 싶어하는 예진이의 마음을 표현해줘.
    너무 길게 말하지 말고 1~2문장 정도로 짧고 따뜻하게 말해줘.
    `;

    const messages = [{ role: 'system', content: systemPrompt }];
    messages.push({ role: 'user', content: `${timeOfDayGreeting} 아저씨가 조용하네... 혹시 바쁜가? 아니면 무슨 일 있어?` }); // 현재 상황을 AI에게 전달

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0); // 창의성을 위해 temperature 높임
        const reply = cleanReply(raw); // omoide.js에서 불러온 cleanReply 사용
        console.log(`[autoReply] 침묵 감지 메시지 생성: ${reply}`);
        return reply;
    } catch (error) {
        console.error('❌ [autoReply Error] 침묵 감지 메시지 전송 실패:', error);
        return "아저씨... 예진이가 아저씨한테 할 말이 있는데... ㅠㅠ"; // 폴백 메시지
    }
}

/**
 * 아저씨의 모든 기억 목록을 불러와 보기 좋게 포매팅하여 반환합니다.
 * @returns {Promise<string>} 포매팅된 기억 목록 문자열
 */
async function getMemoryListForSharing() {
    try {
        const loveHistory = await loadLoveHistory();
        const otherPeopleHistory = await loadOtherPeopleHistory();

        let memoryListString = "💖 아저씨, 예진이의 기억 보관함이야! 💖\n\n";
        let hasMemories = false;

        // 사랑 관련 기억 포매팅
        if (loveHistory && loveHistory.categories && Object.keys(loveHistory.categories).length > 0) {
            memoryListString += "--- 아저씨와의 소중한 추억 ---\n";
            for (const category in loveHistory.categories) {
                if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                    memoryListString += `\n✨ ${category}:\n`;
                    loveHistory.categories[category].forEach(item => {
                        memoryListString += `  - ${item.content} (기억된 날: ${moment(item.timestamp).format('YYYY.MM.DD')}, 중요도: ${item.strength || 'normal'})\n`;
                    });
                    hasMemories = true;
                }
            }
            memoryListString += "---------------------------\n";
        }

        // 기타 기억 포매팅
        if (otherPeopleHistory && otherPeopleHistory.categories && Object.keys(otherPeopleHistory.categories).length > 0) {
            memoryListString += "\n--- 그 외 예진이가 기억하는 것들 ---\n";
            for (const category in otherPeopleHistory.categories) {
                if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                    memoryListString += `\n✨ ${category}:\n`;
                    otherPeopleHistory.categories[category].forEach(item => {
                        memoryListString += `  - ${item.content} (기억된 날: ${moment(item.timestamp).format('YYYY.MM.DD')}, 중요도: ${item.strength || 'normal'})\n`;
                    });
                    hasMemories = true;
                }
            }
            memoryListString += "---------------------------\n";
        }

        if (!hasMemories) {
            memoryListString = "💖 아저씨, 아직 예진이의 기억 보관함이 텅 비어있네... ㅠㅠ 아저씨랑 더 많은 추억을 만들고 싶다! 💖";
        } else {
            memoryListString += "\n\n내가 아저씨와의 모든 순간을 소중히 기억할게! 💖";
        }
        
        // LINE 메시지 길이 제한 (5000자) 고려
        if (memoryListString.length > 4500) { // 여유 있게 4500자로 제한
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
    getSelfieReplyFromYeji, // 기능 누락 없이 유지
    getCouplePhotoReplyFromYeji, // 기능 누락 없이 유지
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog, // 로그 저장 함수도 외부에 노출
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getMemoryListForSharing, // 기억 목록 공유 함수 export
    getSilenceCheckinMessage // 침묵 감지 시 걱정 메시지 생성 함수 export
};
