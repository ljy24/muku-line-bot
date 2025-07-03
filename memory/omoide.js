// autoReply.js v1.8 - 기억 공유 기능 (getMemoryListForSharing 함수 정의 추가 및 모든 기능 통합)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈

// ⭐ 추가/수정: omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다. ⭐
const { getOmoideReply, cleanReply } = require('./omoide'); // omoide.js 파일 경로에 맞게 수정해주세요!

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

// ... (safeRead, getAllLogs, saveLog 함수는 기존과 동일) ...

// ⭐ 수정: getFormattedMemoriesForAI 함수는 기존과 동일하게 유지 ⭐

// ⭐ 수정: callOpenAI 함수에서 cleanReply 호출 제거 (이제 omoide.js에서 처리) ⭐
// 그리고, omoide.js에서 callOpenAI를 직접 사용할 것이므로, omoide.js에도 이 함수를 복사해두었습니다.
// 여기서는 기존 autoReply의 callOpenAI를 그대로 사용합니다.
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const memoriesContext = await getFormattedMemoriesForAI(); // 기억 컨텍스트(장기 기억)를 가져옵니다.

    const messagesToSend = [...messages]; // 원본 메시지 배열을 복사하여 수정합니다.

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

// ... (config 객체는 기존과 동일) ...

// ⭐ 수정: getReplyByMessage 함수 맨 위에 사진 요청 처리 로직 추가 ⭐
async function getReplyByMessage(userMessage) {
    // ⭐ 추가: 사진 관련 명령어 먼저 확인 및 처리 ⭐
    const photoResponse = await getOmoideReply(userMessage, saveLog); // saveLog 함수 전달
    if (photoResponse) {
        if (photoResponse.photoUrl) {
            return { type: 'photo', url: photoResponse.photoUrl, caption: photoResponse.comment };
        } else {
            return photoResponse.comment; // 사진은 없지만 코멘트는 있는 경우 (예: 사진 못 찾을 때)
        }
    }

    const logs = getAllLogs();
    // ... (기존 getReplyByMessage 로직은 동일) ...
    const raw = await callOpenAI(messages, forcedModel);
    const reply = cleanReply(raw); // 이제 omoide.js에서 불러온 cleanReply 사용
    saveLog('예진이', reply);
    return reply;
}

// ⭐ 삭제: 기존 cleanReply 함수는 omoide.js로 이동했으니 여기서 제거합니다. ⭐

// ⭐ 수정: getImageReactionComment, getSelfieReplyFromYeji, getCouplePhotoReplyFromYeji 함수는 이제 필요 없습니다. ⭐
// 이 기능들은 getOmoideReply 함수로 통합되었거나, 더 이상 사용하지 않으므로 제거하거나 주석 처리합니다.
// 만약 여전히 '셀카 보낼게~' 같은 단순 텍스트 코멘트가 필요하다면, getSelfieReplyFromYeji는 남겨둘 수 있지만
// 사진을 첨부하는 기능과 별개로 작동하게 됩니다.
// 여기서는 아저씨의 요청에 따라 사진과 코멘트를 함께 반환하는 기능에 초점을 맞추므로, 관련 함수들은 삭제합니다.

/*
// 기존 getImageReactionComment, getSelfieReplyFromYeji, getCouplePhotoReplyFromYeji 함수를 삭제하거나 아래처럼 수정
async function getImageReactionComment() {
    // 이 함수는 이제 getOmoideReply로 대체되거나 직접 사용되지 않을 수 있습니다.
    // 만약 단순 텍스트 코멘트만 필요하다면 기존 로직을 따릅니다.
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
        { role: 'user', content: '셀카 보낼게~' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}
// getSelfieReplyFromYeji, getCouplePhotoReplyFromYeji 등도 유사하게 처리
*/
// 위에 주석 처리된 함수들은 omoide.js의 getOmoideReply로 기능이 흡수되었으므로 삭제합니다.

// ⭐ 수정: 모듈 내보내기에서 제거된 함수들 정리 ⭐
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt, // 이건 그대로 유지 (아저씨가 보낸 이미지 분석)
    getRandomMessage,
    // getSelfieReplyFromYeji, // omoide.js로 이동/통합
    // getCouplePhotoReplyFromYeji, // omoide.js로 이동/통합
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
