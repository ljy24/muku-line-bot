// src/utils/logger.js - v1.1 (대화 로그 저장 기능 분리)

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone'); // Moment.js도 사용

// 로그 파일 경로: 프로젝트 루트의 conversation_log.json
// process.cwd()는 Node.js 프로세스가 실행되는 현재 작업 디렉토리를 반환합니다.
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json');
let conversationLog = [];

// 파일 존재 여부 확인 및 디렉토리 생성
function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // 파일이 없으면 빈 배열로 초기화
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    }
}

// 초기 로그 로드
ensureLogFile(); // 파일 존재 확인 및 생성
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('Error loading conversation log from logger.js:', error);
    conversationLog = []; // 로드 실패 시 빈 배열로 시작
}


/**
 * 메시지 로그를 파일에 저장하고 메모리에 추가합니다.
 * @param {Object} newLogEntry - 로그 엔트리 객체 ({ role: 'user'/'assistant', content: '메시지 내용', timestamp: Date.now() })
 */
function saveLog(newLogEntry) {
    newLogEntry.timestamp = newLogEntry.timestamp || Date.now(); // 타임스탬프가 없으면 현재 시간으로 설정

    conversationLog.push(newLogEntry);
    // 로그가 너무 길어지면 오래된 로그 삭제 (예: 최근 500개만 유지)
    if (conversationLog.length > 500) {
        conversationLog = conversationLog.slice(-500);
    }
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(conversationLog, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving conversation log from logger.js:', error);
    }
}

/**
 * 메모리에 있는 전체 대화 로그를 반환합니다.
 * @returns {Array<Object>} 대화 로그 배열
 */
function getConversationLog() {
    return conversationLog;
}


module.exports = {
    saveLog,
    getConversationLog
};
