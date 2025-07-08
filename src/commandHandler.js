// src/commandHandler.js - v1.1 - 봇 명령어 처리 핸들러 (파일 기반 memoryManager 사용)

// 📦 필수 모듈 불러오기
const { getOmoideReply } = require('../memory/omoide'); // omoide.js에서 추억 사진 답변 함수 불러오기
const { getConceptPhotoReply } = require('../memory/concept'); // concept.js에서 컨셉 사진 답변 함수 불러오기
// autoReply에서 필요한 함수 가져오기 (이제 autoReply는 Supabase에 의존하지 않음)
const { getMemoryListForSharing, setForcedModel, checkModelSwitchCommand, cleanReply } = require('./autoReply');

/**
 * 봇의 특정 명령어를 처리합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 처리된 응답 객체 또는 null (명령어가 아닐 경우)
 */
async function handleCommand(userMessage, saveLogFunc) {
    const lowerCaseMessage = userMessage.toLowerCase();

    // 1. 모델 전환 명령어 처리
    const versionResponse = checkModelSwitchCommand(userMessage);
    if (versionResponse) {
        saveLogFunc('예진이', `(모델 전환) ${versionResponse}`);
        return { type: 'text', comment: versionResponse };
    }

    // 2. 기억 목록 보여주기 명령어 처리
    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(userMessage)) {
        try {
            let memoryList = await getMemoryListForSharing(); // autoReply.js에서 기억 목록을 가져옵니다.
            // '사용자' -> '아저씨'로 교체 (cleanReply는 autoReply.js에서 가져옴)
            memoryList = cleanReply(memoryList);
            saveLogFunc('예진이', '아저씨의 기억 목록을 보여줬어.');
            return { type: 'text', comment: memoryList };
        } catch (err) {
            console.error(`[commandHandler] 기억 목록 불러오기 실패 ("${userMessage}"):`, err.message);
            return { type: 'text', comment: '기억 목록을 불러오기 실패했어 ㅠㅠ' };
        }
    }

    // 3. 사진 관련 명령어 처리 (omoide.js, concept.js 사용)
    const omoideReply = await getOmoideReply(userMessage, saveLogFunc);
    if (omoideReply) {
        return omoideReply; // omoide.js에서 처리된 응답 반환
    }

    const conceptReply = await getConceptPhotoReply(userMessage, saveLogFunc);
    if (conceptReply) {
        return conceptReply; // concept.js에서 처리된 응답 반환
    }
    
    // 명령어가 아닌 경우 null 반환
    return null;
}

module.exports = {
    handleCommand
};
