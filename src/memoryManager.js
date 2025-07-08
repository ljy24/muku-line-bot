// src/memoryManager.js - v5.0 - 하이브리드 기억 관리 (User Memories: PostgreSQL, Love History/Fixed Memories: 파일)

const { Pool } = require('pg'); // PostgreSQL 연결 풀
const fs = require('fs').promises; // 비동기 파일 시스템 모듈
const path = require('path');     // 경로 처리 모듈
const moment = require('moment-timezone'); // 시간 처리 모듈

// --- 파일 기반 기억 경로 (loadLoveHistory, loadOtherPeopleHistory용) ---
const MEMORIES_DIR = path.join(__dirname, '..', 'data'); // 프로젝트 루트의 data 폴더
const LOVE_HISTORY_FILE = path.join(MEMORIES_DIR, 'love_history.json');
const FIXED_MEMORIES_FILE = path.join(MEMORIES_DIR, 'fixed_memories.json');

// --- PostgreSQL 연결 설정 ---
// Render 환경 변수에서 DB 정보를 가져옵니다.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // DATABASE_URL 환경 변수 사용 (권장)
    ssl: {
        rejectUnauthorized: false // Render PostgreSQL은 SSL이 필요하며, 자체 서명 인증서일 수 있어 이 옵션이 필요합니다.
    }
});

/**
 * 데이터베이스 연결 테스트 및 'user_memories' 테이블 생성/확인합니다.
 * love_history와 fixed_memories 테이블은 생성하지 않습니다.
 */
async function ensureMemoryTablesAndDirectory() {
    try {
        // --- 1. PostgreSQL 연결 테스트 및 user_memories 테이블 확인/생성 ---
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()'); // 간단한 테스트 쿼리
            console.log(`[MemoryManager] PostgreSQL 데이터베이스 연결 성공`);

            // 'user_memories' 테이블 생성 (이미 존재하면 건너뜀)
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_memories (
                    id BIGSERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    reminder_time TIMESTAMPTZ DEFAULT NULL
                );
            `);
            console.log(`[MemoryManager] 'user_memories' 테이블 준비 완료.`);

            // 기존 테이블에 reminder_time 컬럼이 없을 경우 추가 (마이그레이션)
            const checkColumnQuery = `SELECT column_name FROM information_schema.columns WHERE table_name='user_memories' AND column_name='reminder_time';`;
            const columnExists = await client.query(checkColumnQuery);
            if (columnExists.rows.length === 0) {
                await client.query(`ALTER TABLE user_memories ADD COLUMN reminder_time TIMESTAMPTZ DEFAULT NULL;`);
                console.log(`[MemoryManager] 'reminder_time' 컬럼이 'user_memories' 테이블에 추가되었습니다.`);
            }

            // 인덱스 생성 (성능 향상)
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_user_memories_timestamp ON user_memories(timestamp DESC);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_user_memories_reminder_time ON user_memories(reminder_time);
            `);
            console.log(`[MemoryManager] 'user_memories' 인덱스 생성 완료.`);

        } finally {
            client.release(); // 연결 반환
        }

        // --- 2. 파일 기반 기억을 위한 'data' 디렉토리 및 초기 파일 확인/생성 ---
        await fs.mkdir(MEMORIES_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 파일 디렉토리 (${MEMORIES_DIR}) 확인 및 생성 완료.`);
        
        // love_history.json 및 fixed_memories.json 파일이 없으면 빈 상태로 생성
        await ensureFileExists(LOVE_HISTORY_FILE, { categories: { love_expressions: [], daily_care: [], general: [] } });
        await ensureFileExists(FIXED_MEMORIES_FILE, { ai_personal_memories: {} });
        
        console.log('[MemoryManager] 고정 기억 파일들 확인 및 생성 완료.');

    } catch (error) {
        console.error(`[MemoryManager] 데이터베이스/파일 시스템 초기화 실패: ${error.message}`);
        if (pool) {
            await pool.end();
        }
        throw error;
    }
}

/**
 * 파일이 존재하는지 확인하고, 없으면 기본값으로 생성합니다.
 * @param {string} filePath - 확인할 파일 경로
 * @param {any} defaultValue - 파일이 없을 경우 저장할 기본값
 */
async function ensureFileExists(filePath, defaultValue) {
    try {
        await fs.access(filePath); // 파일 존재 여부 확인
    } catch (error) {
        if (error.code === 'ENOENT') { // 파일이 없으면
            console.warn(`[MemoryManager] 파일 없음: ${filePath}. 기본값으로 생성합니다.`);
            await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
        } else {
            throw error; // 다른 오류는 다시 throw
        }
    }
}

/**
 * JSON 파일을 읽고 파싱합니다. 파일이 없으면 빈 배열/객체를 반환합니다.
 * @param {string} filePath - 읽을 파일 경로
 * @param {any} defaultValue - 파일이 없을 경우 반환할 기본값 (배열 또는 객체)
 * @returns {Promise<any>} 파싱된 데이터
 */
async function readJsonFile(filePath, defaultValue) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') { // 파일이 없을 경우
            return defaultValue;
        }
        console.error(`[MemoryManager] 파일 읽기 실패: ${filePath}, 오류: ${error}`);
        return defaultValue; // 오류 발생 시에도 기본값 반환
    }
}

// --- PostgreSQL 기반 사용자 기억 관리 함수 (기존 DB 로직 유지) ---
/**
 * 사용자 정의 기억을 PostgreSQL 데이터베이스에 저장합니다.
 * @param {string} content - 기억할 내용
 * @param {string|null} reminderTime - 리마인더 시간 (ISO string), 없으면 null
 */
async function saveUserMemory(content, reminderTime = null) {
    try {
        await pool.query(
            'INSERT INTO user_memories (content, reminder_time) VALUES ($1, $2)',
            [content, reminderTime]
        );
        console.log(`[MemoryManager] 사용자 기억 저장됨: ${content}`);
    } catch (error) {
        console.error(`[MemoryManager] 사용자 기억 저장 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 사용자 정의 기억을 PostgreSQL 데이터베이스에서 삭제합니다.
 * @param {string} contentToDelete - 삭제할 기억 내용 (부분 일치)
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteUserMemory(contentToDelete) {
    try {
        const result = await pool.query(
            'DELETE FROM user_memories WHERE content ILIKE $1',
            [`%${contentToDelete}%`]
        );
        console.log(`[MemoryManager] 사용자 기억 삭제 시도: "${contentToDelete}" (삭제된 행: ${result.rowCount})`);
        return result.rowCount > 0;
    } catch (error) {
        console.error(`[MemoryManager] 사용자 기억 삭제 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 리마인더 시간을 설정/업데이트합니다.
 * @param {string} content - 리마인더를 설정할 기억의 내용 (부분 일치)
 * @param {string|null} timeIso - 설정할 리마인더 시간 (ISO string) 또는 null (삭제)
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
async function setMemoryReminder(content, timeIso) {
    try {
        const result = await pool.query(
            'UPDATE user_memories SET reminder_time = $1 WHERE content ILIKE $2',
            [timeIso, `%${content}%`]
        );
        console.log(`[MemoryManager] 리마인더 업데이트 시도: "${content}" (업데이트된 행: ${result.rowCount})`);
        return result.rowCount > 0;
    } catch (error) {
        console.error(`[MemoryManager] 리마인더 설정 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 기한이 된 리마인더 목록을 가져옵니다.
 * @returns {Promise<Array<Object>>} 기한이 된 리마인더 배열
 */
async function getDueReminders() {
    try {
        const now = moment().tz('Asia/Tokyo').toISOString();
        const res = await pool.query(
            'SELECT id, content, reminder_time FROM user_memories WHERE reminder_time IS NOT NULL AND reminder_time <= $1',
            [now]
        );
        return res.rows;
    } catch (error) {
        console.error(`[MemoryManager] 기한 리마인더 불러오기 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 리마인더 전송 후 reminder_time을 NULL로 업데이트합니다.
 * @param {number} id - 업데이트할 기억의 ID
 * @param {null} value - NULL 값 (항상 null이어야 함)
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
async function updateMemoryReminderTime(id, value) {
    try {
        const res = await pool.query(
            'UPDATE user_memories SET reminder_time = $1 WHERE id = $2',
            [value, id]
        );
        console.log(`[MemoryManager] 리마인더 시간 업데이트 완료 (ID: ${id})`);
        return res.rowCount > 0;
    } catch (error) {
        console.error(`[MemoryManager] 리마인더 시간 업데이트 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 모든 사용자 정의 기억을 가져옵니다. (기억 목록 보여주기용)
 * @returns {Promise<Array<Object>>} 모든 사용자 기억 배열
 */
async function getAllUserMemories() {
    try {
        const res = await pool.query('SELECT content, timestamp, reminder_time FROM user_memories ORDER BY timestamp ASC');
        return res.rows;
    } catch (error) {
        console.error(`[MemoryManager] 모든 사용자 기억 불러오기 실패: ${error.message}`);
        throw error;
    }
}

/**
 * AI 프롬프트에 포함할 사용자 기억을 가져옵니다. (최신 10개)
 * @returns {Promise<Array<Object>>} AI 프롬프트용 사용자 기억 배열
 */
async function getMemoriesForAI() {
    try {
        const res = await pool.query('SELECT content, timestamp, reminder_time FROM user_memories ORDER BY timestamp DESC LIMIT 10');
        return res.rows.reverse(); // 최신 10개를 가져와서 오래된 순으로 정렬
    } catch (error) {
        console.error(`[MemoryManager] AI용 기억 불러오기 실패: ${error.message}`);
        throw error;
    }
}

// --- 파일 기반 고정 기억 로드 함수 (loadLoveHistory, loadOtherPeopleHistory용) ---
/**
 * `love_history.json` 파일을 로드합니다. (파일에서 직접 읽음)
 * @returns {Promise<Object>} 사랑 히스토리 데이터
 */
async function loadLoveHistory() {
    return await readJsonFile(LOVE_HISTORY_FILE, { categories: { love_expressions: [], daily_care: [], general: [] } });
}

/**
 * `fixed_memories.json` 파일을 로드합니다. (파일에서 직접 읽음)
 * @returns {Promise<Object>} 다른 사람들의 기억 데이터
 */
async function loadOtherPeopleHistory() {
    return await readJsonFile(FIXED_MEMORIES_FILE, { ai_personal_memories: {} });
}

/**
 * 첫 대화 기억을 가져옵니다. (`love_history.json`에서 특정 이벤트 찾음)
 */
async function getFirstDialogueMemory() {
    const loveHistory = await loadLoveHistory();
    const firstDialogueEntry = loveHistory.categories.general.find(mem => mem.content.includes('인스타 첫 대화'));
    return firstDialogueEntry ? firstDialogueEntry.content : null;
}

// AI가 메시지에서 기억을 추출하고 저장하는 함수 (user_memories에 저장)
async function extractAndSaveMemory(text) {
    // 이 함수는 AI가 "이것을 기억해달라"고 판단한 경우 autoReply.js에서 호출될 수 있습니다.
    // 현재는 index.js에서 호출되고 있으며, 단순히 saveUserMemory를 호출하는 방식으로 구현.
    console.log(`[MemoryManager] 'extractAndSaveMemory'가 호출됨 (자동 저장 대상): ${text.substring(0, 50)}...`);
    await saveUserMemory(text); // DB에 저장
}

module.exports = {
    ensureMemoryTablesAndDirectory, // 함수 이름 변경: DB와 디렉토리 모두 처리
    saveUserMemory,
    deleteUserMemory,
    setMemoryReminder,
    getDueReminders,
    updateMemoryReminderTime,
    getAllUserMemories,
    getMemoriesForAI,
    loadLoveHistory, // 파일에서 로드
    loadOtherPeopleHistory, // 파일에서 로드
    getFirstDialogueMemory, // 파일에서 로드된 love_history 사용
    extractAndSaveMemory
};
