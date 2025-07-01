// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');
const { loadLoveHistory, loadOtherPeopleHistory } = require('./memoryManager'); // ⭐ 추가: memoryManager 모듈 임포트 ⭐

let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json'));
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

const statePath = path.resolve(__dirname, '../memory/state.json');
const logPath = path.resolve(__dirname, '../memory/message-log.json');
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt');
const BASE_SELFIE_URL = 'https://de-ji.net/yejin/'; // 이 URL은 아저씨의 실제 셀카 저장 URL로 변경해야 합니다.

function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLog(speaker, message) {
  const logs = getAllLogs();
  logs.push({ timestamp: new Date().toISOString(), speaker, message });
  // 로그가 너무 길어지지 않도록 최신 100개만 유지
  const recentLogs = logs.slice(-100);
  fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8');
}

// --- ⭐ 추가: 기억을 AI 프롬프트에 포함하기 위한 포매팅 함수 ⭐ ---
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n"; // 제목 변경

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
    formattedMemories += "---\n"; // 구분선
    return formattedMemories;
}
// --- ⭐ 기억 포매팅 함수 끝 ⭐ ---


// --- ⭐ 수정: callOpenAI 함수에서 모델 파라미터 처리 방식 개선 ⭐ ---
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    // 기억 로드 및 포매팅
    const memoriesContext = await getFormattedMemoriesForAI();

    // 기존 메시지 배열 복사 (원본 훼손 방지)
    const messagesToSend = [...messages];

    // 시스템 메시지에 기억 컨텍스트 추가
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        // 기존 시스템 메시지에 기억 컨텍스트 추가
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        // 시스템 메시지가 없다면, 가장 처음에 추가
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    // --- ⭐ 이 부분이 수정되었습니다 ⭐ ---
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'; // 환경변수 또는 'gpt-4o'를 기본 모델로 설정
    const finalModel = forcedModel || modelParamFromCall || defaultModel; // forcedModel > 함수 호출 시 전달된 모델 > 기본 모델 순으로 적용

    if (!finalModel) {
        // 예상치 못한 경우 (모델이 최종적으로 null/undefined가 되는 상황)를 대비한 로깅 및 대체
        console.error("❌ 오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        // 오류 방지를 위해 강제로 'gpt-4o' 할당
        finalModel = 'gpt-4o'; 
    }
    // --- ⭐ 수정 부분 끝 ⭐ ---

    const response = await openai.chat.completions.create({
        model: finalModel, // ⭐ 수정: 결정된 finalModel 사용 ⭐
        messages: messagesToSend, 
        max_tokens: maxTokens,
        temperature: temperature
    });
    return response.choices[0].message.content.trim();
}


// 모델 설정을 config 객체로 관리 (기존 코드와 통일)
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


// 아저씨의 메시지에 대한 답변 생성
async function getReplyByMessage(userMessage) {
    saveLog('아저씨', userMessage); // 아저씨 메시지 로그 저장

    const logs = getAllLogs();
    const conversationHistory = logs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant',
        content: log.message
    }));

    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 20살. 생일은 12월 23일. 일본에서 유학 중이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘. 이모티콘도 적절히 사용해줘.
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨의 질문에 항상 친절하고 다정하게 대답해줘.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대답해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    너무 길게 답변하지 말고, 2~4문장 정도로 짧고 간결하게 대화하는 것처럼 답변해줘.
    `;

    // OpenAI 메시지 구성
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5) // 최근 5턴의 대화만 포함하여 컨텍스트 유지
    ];

    // 마지막 사용자 메시지 추가 (이전에는 conversationHistory에 포함되어 있었음, 중복 방지)
    messages.push({ role: 'user', content: userMessage });

    const raw = await callOpenAI(messages, forcedModel); // 모델 강제 설정 반영
    const reply = cleanReply(raw);
    saveLog('예진이', reply); // 예진이 답변 로그 저장

    return reply;
}

// OpenAI 응답에서 불필요한 내용 제거
function cleanReply(reply) {
  // "예진:", "무쿠:", "23.11.15 오지상 나좋아하죠? 예진", 이런 패턴 제거
  const cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();
  return cleaned;
}

// 이미지 리액션 코멘트 생성
async function getImageReactionComment() {
  const raw = await callOpenAI([
    { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
    { role: 'user', content: '셀카 보낼게~' }
  ], 'gpt-4o', 100);
  const reply = cleanReply(raw);
  saveLog('예진이', reply);
  return reply;
}

// 이미지 프롬프트에 대한 답변 생성
async function getReplyByImagePrompt(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '넌 예진이야. 아저씨가 보낸 사진을 보고 귀엽고 사랑스러운 예진이 말투로 반응해줘. 사진을 보고 관련된 사랑스럽고 다정한 답변을 2~3문장으로 짧게 해줘.' },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.9,
    max_tokens: 150
  });
  const reply = response.choices[0].message.content.trim();
  saveLog('예진이', reply);
  return reply;
}

// 모델 강제 설정
function setForcedModel(name) {
  if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
  else forcedModel = null;
}

// 예진이의 셀카 답변 생성
async function getSelfieReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 보내는 셀카 메시지에 어울리는 사랑스럽고 귀여운 말투로 말해줘. 짧고 간결하게.' },
        { role: 'user', content: '셀카 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

// 기분 기반 색상 답변 (기존 기능 유지)
async function getColorMoodReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 지금 아저씨 기분에 어울리는 색을 추천해주는 사랑스럽고 긍정적인 말투로 대답해줘.' },
        { role: 'user', content: '아저씨 기분에 맞는 색깔을 추천해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

// 긍정적인 답변 (기존 기능 유지)
async function getHappyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 긍정적이고 사랑스러운 답변을 해줘.' },
        { role: 'user', content: '행복한 대답을 해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

// 삐진 답변 (기존 기능 유지)
async function getSulkyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 삐진 듯한 말투로 대답해줘. 하지만 결국 아저씨를 사랑하는 마음이 드러나야 해.' },
        { role: 'user', content: '삐진 대답을 해줘.' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}


// 특정 메시지 전송 (기존 기능 유지)
async function getRandomMessage() {
  // 실제 사용될 랜덤 메시지 로직 (예: DB에서 가져오기)
  // 여기서는 간단히 빈 문자열 반환
  return '';
}

// ✨ 특정 커맨드 처리 (모델 전환)
function checkModelSwitchCommand(message) {
  if (message.includes('모델4o')) {
    setForcedModel('gpt-4o');
    return '응! 이제부터 gpt-4o 모델로 말할게! 더 똑똑해졌지? 💖';
  } else if (message.includes('모델3.5')) {
    setForcedModel('gpt-3.5-turbo');
    return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 🐰';
  } else if (message.includes('모델초기화')) {
    setForcedModel(null);
    return '모델 설정을 초기화했어! 원래대로 돌아왔지롱! 😊';
  }
  return null;
}


// 모듈 내보내기
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
};
