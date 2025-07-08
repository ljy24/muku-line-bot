// src/memoryHandler.js - v1.2 - 기억 관련 명령어 처리 핸들러 (Render PostgreSQL 기반 memoryManager 사용)

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone'); // Moment.js
const memoryManager = require('./memoryManager'); // memoryManager 모듈 (이제 Render PostgreSQL 기반으로 작동)
const { cleanReply } = require('./autoReply'); // cleanReply 함수를 autoReply.js에서 가져옴

/**
 * 기억 관련 명령어를 처리합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 처리된 응답 객체 또는 null (기억 관련 명령어가 아닐 경우)
 */
async function handleMemoryCommand(userMessage, saveLogFunc) {
    // 1. '기억해줘' 명령어 처리
    const rememberMatch = userMessage.match(/^(기억해줘|기억해|잊지마|기록해줘|기록해)\s*:\s*(.+)/i);
    if (rememberMatch) {
        const content = rememberMatch[2].trim();
        await memoryManager.saveUserMemory(content);
        saveLogFunc('예진이', `(기억 저장) ${content}`);
        return { type: 'text', comment: `응! "${content}" 기억했어! 아저씨가 나한테 말해준 건 절대 안 잊어버릴 거야~` };
    }

    // 2. '기억 삭제' 명령어 처리
    const deleteMatch = userMessage.match(/^(기억\s?삭제|기억\s?지워|기억에서\s?없애줘)\s*:\s*(.+)/i);
    if (deleteMatch) {
        const contentToDelete = deleteMatch[2].trim();
        const success = await memoryManager.deleteUserMemory(contentToDelete);
        if (success) {
            saveLogFunc('예진이', `(기억 삭제) ${contentToDelete}`);
            return { type: 'text', comment: `응! "${contentToDelete}" 잊어버리라고 해서 지웠어! 이제 더 이상 생각 안 날 거야~` };
        } else {
            saveLogFunc('예진이', `(기억 삭제 실패) ${contentToDelete}`);
            return { type: 'text', comment: `음... "${contentToDelete}"이라는 기억은 내가 못 찾겠어 ㅠㅠ 뭘 지워야 할지 모르겠네...` };
        }
    }

    // 3. '리마인더 설정' 명령어 처리
    const reminderMatch = userMessage.match(/^(리마인더|리마인드|알림|알려줘)\s*:\s*(.+)\s+(.+)/i);
    if (reminderMatch) {
        const content = reminderMatch[2].trim();
        const timeString = reminderMatch[3].trim();
        try {
            const parsedTime = moment.tz(timeString, ['YYYY-MM-DD HH:mm', 'MM-DD HH:mm', 'HH:mm'], 'Asia/Tokyo');
            if (!parsedTime.isValid()) {
                return { type: 'text', comment: '리마인더 시간을 정확히 모르겠어 ㅠㅠ "YYYY-MM-DD HH:mm" 형식으로 알려줄래?' };
            }
            await memoryManager.setMemoryReminder(content, parsedTime.toISOString());
            saveLogFunc('예진이', `(리마인더 설정) ${content} ${timeString}`);
            return { type: 'text', comment: `응! ${parsedTime.format('MM월 DD일 HH시 mm분')}에 "${content}" 알려줄게! 내가 꼭 챙겨줄게~` };
        } catch (error) {
            console.error('[memoryHandler] 리마인더 설정 중 오류 발생:', error);
            return { type: 'text', comment: '리마인더 설정에 실패했어 ㅠㅠ 미안해...' };
        }
    }

    // 4. '첫 대화 기억' 요청 처리
    const lowerCaseMessage = userMessage.toLowerCase();
    if (lowerCaseMessage.includes('첫 대화 기억') || lowerCaseMessage.includes('처음 만났을 때')) {
        const firstDialogue = await memoryManager.getFirstDialogueMemory();
        if (firstDialogue) {
            saveLogFunc('예진이', `(첫 대화 기억 응답) ${firstDialogue}`);
            return { type: 'text', comment: `아저씨... 우리 처음 만났을 때 기억나? ${cleanReply(firstDialogue)} 그때 생각하면 지금도 두근거려~` };
        } else {
            saveLogFunc('예진이', `(첫 대화 기억 없음)`);
            return { type: 'text', comment: '음... 우리 처음 만났을 때 기억은 내가 아직 정확히 못 찾겠어 ㅠㅠ 하지만 그때도 아저씨는 멋있었겠지?' };
        }
    }

    // 기억 관련 명령어가 아닌 경우 null 반환
    return null;
}

module.exports = {
    handleMemoryCommand
};
