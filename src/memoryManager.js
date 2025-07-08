// src/memoryManager.js - v3.1 - Render PostgreSQL 기반 기억 관리 (DATABASE_URL 사용)

const { Pool } = require('pg'); // PostgreSQL 연결 풀
const moment = require('moment-timezone'); // 시간 처리 모듈
const fs = require('fs').promises; // 파일 시스템 모듈 (초기 데이터 로딩용)
const path = require('path');     // 경로 처리 모듈

// Render PostgreSQL 연결 설정 (DATABASE_URL 환경 변수 사용)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // DATABASE_URL 환경 변수 사용
    ssl: {
        rejectUnauthorized: false // Render PostgreSQL은 SSL이 필요하며, 자체 서명 인증서일 수 있어 이 옵션이 필요합니다.
    }
});

/**
 * 데이터베이스 테이블이 존재하는지 확인하고, 없으면 생성합니다.
 * fixed_memories와 love_history는 초기화 시 파일에서 로드하여 DB에 저장합니다.
 */
async function ensureMemoryTables() {
    try {
        // user_memories 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_memories (
                id BIGSERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                reminder_time TIMESTANTZ
            );
        `);
        console.log("테이블 'user_memories' 확인 및 생성 완료.");

        // fixed_memories 테이블 생성 (키-값 쌍 저장)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fixed_memories (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
        console.log("테이블 'fixed_memories' 확인 및 생성 완료.");

        // love_history 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS love_history (
                id BIGSERIAL PRIMARY KEY,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("테이블 'love_history' 확인 및 생성 완료.");

        // ✨ 초기 데이터 로드 및 DB 삽입 (테이블이 비어있을 경우에만) ✨
        await loadInitialFixedMemoriesFromFile();
        await loadInitialLoveHistoryFromFile();

    } catch (error) {
        console.error(`데이터베이스 테이블 생성/초기화 실패: ${error}`);
        throw error; // 오류 발생 시 애플리케이션 시작을 중단
    }
}

// ✨ 초기 고정 기억 (fixed_memories.json) 로드 및 DB 삽입 ✨
async function loadInitialFixedMemoriesFromFile() {
    const fixedMemoriesCountResult = await pool.query("SELECT COUNT(*) FROM fixed_memories");
    if (parseInt(fixedMemoriesCountResult.rows[0].count) === 0) {
        console.log("fixed_memories 테이블이 비어있어 파일에서 초기 데이터를 로드합니다.");
        const fixedMemoriesPath = path.join(__dirname, '..', 'data', 'fixed_memories.json');
        try {
            const data = JSON.parse(await fs.readFile(fixedMemoriesPath, 'utf8'));
            if (data.ai_personal_memories) {
                for (const key in data.ai_personal_memories) {
                    await pool.query(
                        'INSERT INTO fixed_memories (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING;',
                        [key, data.ai_personal_memories[key]]
                    );
                }
                console.log("fixed_memories 초기 데이터 로드 및 삽입 완료.");
            }
        } catch (error) {
            console.error(`fixed_memories.json 파일 로드 또는 삽입 실패: ${error}`);
        }
    }
}

// ✨ 초기 사랑 히스토리 (love_history.json) 로드 및 DB 삽입 ✨
async function loadInitialLoveHistoryFromFile() {
    const loveHistoryCountResult = await pool.query("SELECT COUNT(*) FROM love_history");
    if (parseInt(loveHistoryCountResult.rows[0].count) === 0) {
        console.log("love_history 테이블이 비어있어 파일에서 초기 데이터를 로드합니다.");
        const loveHistoryPath = path.join(__dirname, '..', 'data', 'love_history.json');
        try {
            const data = JSON.parse(await fs.readFile(loveHistoryPath, 'utf8'));
            if (data.categories) {
                for (const category in data.categories) {
                    for (const item of data.categories[category]) {
                        await pool.query(
                            'INSERT INTO love_history (category, content, timestamp) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;', // ON CONFLICT DO NOTHING은 PRIMARY KEY가 있을 때 동작
                            [category, item.content, moment(item.timestamp).toISOString()]
                        );
                    }
                }
                console.log("love_history 초기 데이터 로드 및 삽입 완료.");
            }
        } catch (error) {
            console.error(`love_history.json 파일 로드 또는 삽입 실패: ${error}`);
        }
    }
}


/**
 * 사용자 정의 기억을 저장합니다.
 * @param {string} content - 기억할 내용
 * @param {string|null} reminderTime - 리마인더 시간 (ISO string), 없으면 null
 */
async function saveUserMemory(content, reminderTime = null) {
    await pool.query(
        'INSERT INTO user_memories (content, reminder_time) VALUES ($1, $2)',
        [content, reminderTime]
    );
}

/**
 * 사용자 정의 기억을 삭제합니다.
 * @param {string} contentToDelete - 삭제할 기억 내용 (부분 일치)
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteUserMemory(contentToDelete) {
    const result = await pool.query(
        'DELETE FROM user_memories WHERE content ILIKE $1', // ILIKE는 대소문자 구분 없이 부분 일치
        [`%${contentToDelete}%`]
    );
    return result.rowCount > 0;
}

/**
 * 리마인더 시간을 설정/업데이트합니다.
 * @param {string} content - 리마인더를 설정할 기억의 내용 (부분 일치)
 * @param {string|null} timeIso - 설정할 리마인더 시간 (ISO string) 또는 null (삭제)
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
async function setMemoryReminder(content, timeIso) {
    const result = await pool.query(
        'UPDATE user_memories SET reminder_time = $1 WHERE content ILIKE $2',
        [timeIso, `%${content}%`]
    );
    return result.rowCount > 0;
}

/**
 * 기한이 된 리마인더 목록을 가져옵니다.
 * @returns {Promise<Array<Object>>} 기한이 된 리마인더 배열
 */
async function getDueReminders() {
    const now = moment().tz('Asia/Tokyo').toISOString();
    const res = await pool.query(
        'SELECT id, content, reminder_time FROM user_memories WHERE reminder_time IS NOT NULL AND reminder_time <= $1',
        [now]
    );
    return res.rows;
}

/**
 * 리마인더 전송 후 reminder_time을 NULL로 업데이트합니다.
 * @param {number} id - 업데이트할 기억의 ID
 * @param {null} value - NULL 값 (항상 null이어야 함)
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
async function updateMemoryReminderTime(id, value) {
    const res = await pool.query(
        'UPDATE user_memories SET reminder_time = $1 WHERE id = $2',
        [value, id]
    );
    return res.rowCount > 0;
}


/**
 * 모든 사용자 정의 기억을 가져옵니다. (기억 목록 보여주기용)
 * @returns {Promise<Array<Object>>} 모든 사용자 기억 배열
 */
async function getAllUserMemories() {
    const res = await pool.query('SELECT content, timestamp, reminder_time FROM user_memories ORDER BY timestamp ASC');
    return res.rows;
}

/**
 * AI 프롬프트에 포함할 사용자 기억을 가져옵니다. (최신 10개)
 * @returns {Promise<Array<Object>>} AI 프롬프트용 사용자 기억 배열
 */
async function getMemoriesForAI() {
    const res = await pool.query('SELECT content, timestamp, reminder_time FROM user_memories ORDER BY timestamp DESC LIMIT 10');
    return res.rows.reverse(); // 최신 10개를 가져와서 오래된 순으로 정렬
}

/**
 * `love_history` 테이블에서 데이터를 로드합니다.
 * @returns {Promise<Object>} 사랑 히스토리 데이터 (categories 형태로 재구성)
 */
async function loadLoveHistory() {
    const res = await pool.query('SELECT category, content, timestamp FROM love_history ORDER BY timestamp ASC');
    const categories = {
        love_expressions: [],
        daily_care: [],
        general: []
    };
    res.rows.forEach(row => {
        if (categories[row.category]) {
            categories[row.category].push({
                content: row.content,
                timestamp: moment(row.timestamp).toISOString() // ISO 형식으로 변환
            });
        }
    });
    return { categories: categories };
}

/**
 * `fixed_memories` 테이블에서 데이터를 로드합니다.
 * @returns {Promise<Object>} 다른 사람들의 기억 데이터 (ai_personal_memories 형태로 재구성)
 */
async function loadOtherPeopleHistory() {
    const res = await pool.query('SELECT key, value FROM fixed_memories');
    const aiPersonalMemories = {};
    res.rows.forEach(row => {
        aiPersonalMemories[row.key] = row.value;
    });
    return { ai_personal_memories: aiPersonalMemories };
}

/**
 * 첫 대화 기억을 가져옵니다.
 * `love_history` 테이블에서 '인스타 첫 대화'를 찾아 반환합니다.
 */
async function getFirstDialogueMemory() {
    const res = await pool.query("SELECT content FROM love_history WHERE content LIKE '%인스타 첫 대화%' LIMIT 1");
    return res.rows.length > 0 ? res.rows[0].content : null;
}

module.exports = {
    ensureMemoryTables,
    saveUserMemory,
    deleteUserMemory,
    setMemoryReminder,
    getDueReminders,
    updateMemoryReminderTime,
    getAllUserMemories,
    getMemoriesForAI,
    loadLoveHistory,
    loadOtherPeopleHistory,
    getFirstDialogueMemory
};
