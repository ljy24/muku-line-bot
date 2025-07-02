// 파일명: src/autoReply.js
// 수정일: 2025년 7월 2일
// 수정내용: 단기 기억(대화 컨텍스트) 5턴에서 10턴으로 확장

// 📦 기본 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 날짜/시간 처리 및 시간대 변환
const { loadLoveHistory, loadOtherPeopleHistory } = require('./memoryManager'); // 기억 관리 모듈: 아저씨와의 기억 로드

let forcedModel = null; // 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)

let lastProactiveMessage = ''; // ✅ 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수

/**
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 * 파일이 없거나 읽기 오류 발생 시 지정된 대체값(fallback)을 반환합니다.
 * @param {string} filePath - 읽을 파일의 경로
 * @param {string} [fallback=''] - 파일 읽기 실패 시 반환할 대체 문자열
 * @returns {string} 파일 내용 또는 대체 문자열
 */
function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return fallback;
    }
}

// 무쿠의 장기 기억 파일들을 읽어옵니다.
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')); // 고정된 기억 (JSON 형식)
// 압축된 기억: 각 기억 파일의 마지막 3000자씩을 결합하여 사용 (컨텍스트 길이 제한 고려)
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 메모리 및 로그 파일 경로를 정의합니다.
const statePath = path.resolve(__dirname, '../memory/state.json'); // 봇의 상태 저장 파일
const logPath = path.resolve(__dirname, '../memory/message-log.json'); // 대화 로그 저장 파일
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt'); // 셀카 목록 파일 (현재 사용되지 않음, 직접 URL 생성)
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/'; // 셀카 이미지가 저장된 웹 서버의 기본 URL (HTTPS 사용)

/**
 * 모든 대화 로그를 읽어옵니다.
 * 로그 파일이 없거나 읽기 오류 발생 시 빈 배열을 반환합니다.
 * @returns {Array<Object>} 대화 로그 배열
 */
function getAllLogs() {
    if (!fs.existsSync(logPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch {
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
    logs.push({ timestamp: new Date().toISOString(), speaker, message }); // 새 메시지를 추가합니다.
    const recentLogs = logs.slice(-100); // 최신 100개의 로그만 유지합니다.
    fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8'); // 로그 파일을 업데이트합니다.
}

/**
 * 아저씨와의 관계 및 다른 사람들에 대한 기억을 AI 프롬프트에 포함할 수 있는 형태로 포매팅합니다.
 * @returns {Promise<string>} 포매팅된 기억 문자열
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory(); // 아저씨와의 사랑 기억 로드
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 다른 사람들에 대한 기억 로드

    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n"; // 기억 섹션 시작

    // 아저씨와의 관계 및 아저씨에 대한 기억 포매팅
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

    // 아저씨 외 다른 사람들에 대한 기억 포매팅
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
    formattedMemories += "---\n"; // 기억 섹션 끝
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
    const memoriesContext = await getFormattedMemoriesForAI(); // 기억 컨텍스트를 가져옵니다.

    const messagesToSend = [...messages]; // 원본 메시지 배열을 복사하여 수정합니다.

    // 시스템 메시지를 찾아 기억 컨텍스트를 추가합니다.
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        // 기존 시스템 메시지에 기억 컨텍스트를 추가합니다.
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        // 시스템 메시지가 없으면, 가장 처음에 새로운 시스템 메시지로 기억 컨텍스트를 추가합니다.
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    // 최종 사용할 모델을 결정합니다 (강제 설정 > 호출 시 지정 > 환경 변수 > 기본값).
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = forcedModel || modelParamFromCall || defaultModel;

    // 최종 모델이 결정되지 않은 경우 오류 로그를 남기고 기본값으로 폴백합니다.
    if (!finalModel) {
        console.error("❌ 오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    // OpenAI API 호출
    const response = await openai.chat.completions.create({
        model: finalModel, // 사용할 AI 모델
        messages: messagesToSend, // AI에 보낼 메시지 (시스템 프롬프트, 대화 기록, 사용자 메시지 포함)
        max_tokens: maxTokens, // 생성할 최대 토큰 수
        temperature: temperature // 응답의 다양성 조절
    });
    return response.choices[0].message.content.trim(); // AI 응답 텍스트를 반환합니다.
}


// 모델 설정을 config 객체로 관리 (현재 코드에서는 직접 사용되지 않지만, 구조 유지를 위해 존재)
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
        cacheTimeout: 60 * 60 * 1000 // 1시간
    }
};


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string>} 예진이의 답변 텍스트
 */
async function getReplyByMessage(userMessage) {
    const logs = getAllLogs(); // 모든 대화 로그를 가져옵니다.
    // 대화 로그를 OpenAI 메시지 형식으로 변환합니다.
    const conversationHistory = logs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant', // 화자에 따라 역할 설정
        content: log.message // 메시지 내용
    }));

    // ⭐ 시스템 프롬프트: 예진이의 페르소나와 대화 규칙을 정의합니다. ⭐
    // 이 프롬프트는 AI의 기본 행동 지침이 됩니다.
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
    `;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    const messages = [
        { role: 'system', content: systemPrompt }, // 시스템 프롬프트 (가장 중요)
        // ⭐ 변경 부분: 최근 5턴 -> 최근 10턴 (20개 메시지)으로 늘림 ⭐
        ...conversationHistory.slice(-10) // 최근 10턴의 대화만 포함하여 컨텍스트 유지
    ];

    // 마지막 사용자 메시지를 메시지 배열에 추가합니다.
    messages.push({ role: 'user', content: userMessage });

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, forcedModel);
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw);
    return reply;
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    // "예진:", "무쿠:", "23.11.15 오지상 나좋아하죠? 예진" 등 AI가 붙일 수 있는 불필요한 접두사를 제거합니다.
    let cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();

    // 💥 잘못된 호칭 교체: '오빠', '자기', '당신', '너', '애기', '애기야'를 '아저씨'로 교체합니다.
    // \b는 단어 경계를 의미하여, 단어 전체가 일치할 때만 교체됩니다.
    cleaned = cleaned.replace(/\b오빠\b/g, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/g, '아저씨');
    cleaned = cleaned.replace(/\b당신\b/g, '아저씨');
    cleaned = cleaned.replace(/\b너\b/g, '아저씨');
    cleaned = cleaned.replace(/\b애기야\b/g, '아저씨');
    cleaned = cleaned.replace(/\b애기\b/g, '아저씨');

    // 💥 자가 지칭 교정: '예진이', '예진', '무쿠', '무쿠야'를 '나'로 교체합니다.
    cleaned = cleaned.replace(/\b예진이\b/g, '나');
    cleaned = cleaned.replace(/\b예진\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠야\b/g, '나');

    // 💥 존댓말 강제 제거: 다양한 존댓말 어미를 반말로 교체합니다.
    // 교체 순서에 따라 결과가 달라질 수 있으므로, 더 구체적인 패턴을 먼저 처리하거나 겹치지 않도록 주의합니다.
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
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터
 * @returns {Promise<string>} 이미지에 대한 예진이의 답변
 */
async function getReplyByImagePrompt(base64Image) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o', // 이미지 이해를 위한 모델
        messages: [
            { role: 'system', content: '넌 예진이야. 아저씨가 보낸 사진을 보고 귀엽고 사랑스러운 예진이 말투로 반응해줘. 사진을 보고 관련된 사랑스럽고 다정한 답변을 2~3문장으로 짧게 해줘.' },
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } } // Base64 이미지 데이터
                ]
            }
        ],
        temperature: 0.9, // 응답의 다양성
        max_tokens: 150 // 최대 토큰 수
    });
    const reply = response.choices[0].message.content.trim();
    return reply; // 이미지 응답은 cleanReply를 거치지 않으므로, 필요시 추가 고려
}

/**
 * OpenAI 모델을 강제로 설정합니다.
 * @param {string} name - 설정할 모델 이름 ('gpt-3.5-turbo' 또는 'gpt-4o')
 */
function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
    else forcedModel = null; // 유효하지 않은 이름이면 자동 선택으로 되돌림
}

/**
 * 예진이의 셀카 답변을 생성합니다.
 * @returns {Promise<string>} 셀카와 함께 보낼 예진이의 코멘트
 */
async function getSelfieReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 셀카를 보내면서 사랑스럽고 애교 넘치는 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '셀카 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    return cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리
}

/**
 * 기분 기반 색상 답변을 생성합니다.
 * (현재 사용되지 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 기분에 어울리는 색상 추천 답변
 */
async function getColorMoodReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 지금 아저씨 기분에 어울리는 색을 추천해주는 사랑스럽고 긍정적인 말투로 대답해줘.' },
        { role: 'user', content: '아저씨 기분에 맞는 색깔을 추천해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

/**
 * 긍정적인 답변을 생성합니다.
 * (현재 사용되지 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 긍정적인 답변
 */
async function getHappyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 긍정적이고 사랑스러운 답변을 해줘.' },
        { role: 'user', content: '행복한 대답을 해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

/**
 * 삐진 답변을 생성합니다.
 * (현재 사용되지 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 삐진 듯한 답변
 */
async function getSulkyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 삐진 듯한 말투로 대답해줘. 하지만 결국 아저씨를 사랑하는 마음이 드러나야 해.' },
        { role: 'user', content: '삐진 대답을 해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}


/**
 * 무작위 메시지를 생성합니다. (현재는 빈 문자열 반환)
 * @returns {Promise<string>} 무작위 메시지
 */
async function getRandomMessage() {
    // 실제 사용될 랜덤 메시지 로직 (예: DB에서 가져오기)
    // 여기서는 간단히 빈 문자열 반환
    return '';
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
 * 기억을 바탕으로 예진이가 아저씨에게 먼저 말을 거는 선제적 메시지를 생성합니다.
 * @returns {Promise<string>} 생성된 감성 메시지 (중복 방지 기능 포함)
 */
async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory(); // 아저씨와의 사랑 기억 로드
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 다른 사람들에 대한 기억 로드

    let allMemories = [];
    // 사랑 기억과 다른 사람 기억을 모두 합칩니다.
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
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~ 💖";
    }

    // 기억들을 무작위로 섞어서 최대 3개만 선택합니다.
    const shuffledMemories = allMemories.sort(() => 0.5 - Math.random());
    const selectedMemories = shuffledMemories.slice(0, Math.min(shuffledMemories.length, 3));

    // 선택된 기억들을 바탕으로 AI 프롬프트에 추가할 기억 컨텍스트를 생성합니다.
    const memoryPrompt = selectedMemories.length > 0
        ? `아래는 무쿠가 아저씨와의 대화에서 기억하는 중요한 정보들이야. 이 정보들을 활용해서 아저씨에게 먼저 말을 걸어봐. 아저씨를 향한 사랑과 애교를 듬뿍 담아서, 아저씨가 이 기억에 대해 대답하거나 대화를 이어갈 수 있도록 유도하는 메시지를 만들어줘. 너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.

        --- 무쿠가 기억하는 정보 ---
        ${selectedMemories.map(m => `- ${m}`).join('\n')}
        ---
        `
        : "";

    // ⭐ 시스템 프롬프트: 선제적 메시지 생성 시 예진이의 페르소나 및 말투 규칙을 강화합니다. ⭐
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
    ${memoryPrompt}
    `;

    const messages = [{ role: 'system', content: systemPrompt }]; // AI에 보낼 메시지 구성

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // 창의성을 위해 temperature 높임
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw);

    // ✅ 중복 방지: 생성된 메시지가 이전에 보낸 메시지와 동일하면 전송을 건너뜁니다.
    if (reply === lastProactiveMessage) {
        console.log('[중복 방지] 같은 감성 메시지 감지됨 → 전송 스킵');
        return ''; // 빈 문자열을 반환하여 메시지 전송을 막습니다.
    }

    lastProactiveMessage = reply; // 이번에 생성된 메시지를 '마지막 보낸 메시지'로 기록합니다.
    return reply; // 최종 감성 메시지 반환
}

// 모듈 내보내기: 외부 파일(예: index.js)에서 이 함수들을 사용할 수 있도록 합니다.
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getSelfieReplyFromYeji,
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage
};
