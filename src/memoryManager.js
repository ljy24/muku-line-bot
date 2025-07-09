// src/memoryManager.js - v1.3 (리마인더 기능 추가)

const fs = require('fs').promises; // 비동기 파일 시스템 모듈 사용
const path = require('path');
const { Database } = require('sqlite3'); // SQLite3 데이터베이스 모듈

const dbPath = path.join(process.cwd(), 'memories.db');
let db; // SQLite 데이터베이스 인스턴스

// ⭐️ 고정 기억을 저장할 변수 (메모리 로딩) ⭐️
const fixedMemoriesDB = {};

// 기억 파일들의 경로 정의
const FIXED_MEMORIES_FILE = path.join(process.cwd(), 'memory', 'fixedMemories.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');

/**
 * SQLite 데이터베이스 연결을 초기화하고 테이블을 생성합니다.
 */
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new Database(dbPath, (err) => {
            if (err) {
                console.error('[MemoryManager] 데이터베이스 연결 오류:', err.message);
                reject(err);
            } else {
                console.log('[MemoryManager] SQLite 데이터베이스에 연결되었습니다.');
                // memories 테이블 생성
                db.run(`
                    CREATE TABLE IF NOT EXISTS memories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        type TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp INTEGER NOT NULL,
                        keywords TEXT
                    )
                `, (err) => {
                    if (err) {
                        console.error('[MemoryManager] memories 테이블 생성 오류:', err.message);
                        reject(err);
                    } else {
                        console.log('[MemoryManager] memories 테이블이 준비되었습니다.');
                        // ⭐️ reminders 테이블 생성 ⭐️
                        db.run(`
                            CREATE TABLE IF NOT EXISTS reminders (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                due_time INTEGER NOT NULL, -- Unix timestamp (ms)
                                message TEXT NOT NULL,
                                is_sent INTEGER DEFAULT 0 -- 0: false, 1: true
                            )
                        `, (err) => {
                            if (err) {
                                console.error('[MemoryManager] reminders 테이블 생성 오류:', err.message);
                                reject(err);
                            } else {
                                console.log('[MemoryManager] reminders 테이블이 준비되었습니다.');
                                resolve();
                            }
                        });
                    }
                });
            }
        });
    });
}

/**
 * 특정 메모리를 데이터베이스에 저장합니다.
 * @param {string} type 메모리 유형 (예: 'text_message', 'image_comment', 'fixed_memory')
 * @param {string} content 메모리 내용
 * @param {number} timestamp 타임스탬프 (epoch ms)
 * @param {string} [keywords=''] 관련 키워드 (쉼표로 구분)
 */
async function saveMemory(type, content, timestamp, keywords = '') {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO memories (type, content, timestamp, keywords) VALUES (?, ?, ?, ?)");
        stmt.run(type, content, timestamp, keywords, function (err) {
            if (err) {
                console.error('[MemoryManager] 메모리 저장 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] 메모리 저장됨 (ID: ${this.lastID}, 타입: ${type})`);
                resolve(this.lastID);
            }
        });
        stmt.finalize();
    });
}

/**
 * 특정 키워드에 해당하는 메모리를 데이터베이스에서 조회합니다.
 * @param {string} keyword 조회할 키워드
 * @returns {Promise<Array<Object>>} 조회된 메모리 배열
 */
async function searchMemories(keyword) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM memories WHERE keywords LIKE ? ORDER BY timestamp DESC LIMIT 5", [`%${keyword}%`], (err, rows) => {
            if (err) {
                console.error('[MemoryManager] 메모리 조회 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] 키워드 "${keyword}"로 ${rows.length}개의 메모리 조회됨.`);
                resolve(rows);
            }
        });
    });
}

/**
 * 모든 메모리를 지웁니다.
 */
async function clearMemory() {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM memories", function (err) {
            if (err) {
                console.error('[MemoryManager] 메모리 삭제 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] ${this.changes}개 메모리 삭제됨.`);
                resolve();
            }
        });
    });
}

/**
 * 사용자 메시지에서 기억을 추출하고 저장합니다. (GPT 활용)
 * @param {string} userMessage 사용자의 메시지
 */
async function extractAndSaveMemory(userMessage) {
    // TODO: 여기에 GPT를 사용하여 메시지에서 핵심 키워드/내용을 추출하고
    // saveMemory 함수를 호출하여 DB에 저장하는 로직을 구현합니다.
    // 현재는 더미 로직입니다.
    console.log(`[MemoryManager] 기억 추출 및 저장 (더미): "${userMessage.substring(0, 20)}..."`);
    // await saveMemory('user_chat', userMessage, Date.now(), '자동 추출 키워드');
}

/**
 * 필요한 데이터베이스 테이블 및 파일 디렉토리를 보장합니다.
 * 서버 시작 시 호출됩니다.
 */
async function ensureMemoryTablesAndDirectory() {
    await initializeDatabase();
    // memory 폴더가 없으면 생성
    const memoryDir = path.join(process.cwd(), 'memory');
    try {
        await fs.mkdir(memoryDir, { recursive: true });
        console.log(`[MemoryManager] 'memory' 디렉토리 확인 또는 생성됨: ${memoryDir}`);
    } catch (error) {
        console.error(`[MemoryManager] 'memory' 디렉토리 생성 실패: ${error.message}`);
    }

    // ⭐️ 모든 고정 기억 파일들을 로딩합니다. ⭐️
    await loadAllMemories();
}

/**
 * ⭐️ 모든 고정 기억 파일들을 로딩하여 fixedMemoriesDB에 저장합니다. ⭐️
 */
async function loadAllMemories() {
    console.log('[MemoryManager] 고정 기억 파일 로딩 시작...');
    try {
        // fixedMemories.json 로드
        try {
            const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
            const parsed = JSON.parse(data);
            Object.assign(fixedMemoriesDB, parsed); // 기존 객체에 병합
            console.log(`[MemoryManager] fixedMemories.json 로드 완료. (기억 ${Object.keys(parsed).length}개)`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] fixedMemories.json 파일이 없습니다. 새로 생성합니다.`);
                await fs.writeFile(FIXED_MEMORIES_FILE, JSON.stringify({}, null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] fixedMemories.json 로드 실패: ${err.message}`);
            }
        }

        // love-history.json 로드
        try {
            const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
            const parsed = JSON.parse(data);
            Object.assign(fixedMemoriesDB, parsed);
            console.log(`[MemoryManager] love-history.json 로드 완료. (기억 ${Object.keys(parsed).length}개)`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] love-history.json 파일이 없습니다. 새로 생성합니다.`);
                await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify({}, null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] love-history.json 로드 실패: ${err.message}`);
            }
        }

        console.log('[MemoryManager] 모든 고정 기억 로딩 완료:', Object.keys(fixedMemoriesDB));
    } catch (error) {
        console.error('[MemoryManager] 고정 기억 로딩 중 치명적인 오류:', error);
    }
}

/**
 * ⭐️ 고정 기억 DB에서 특정 키워드에 해당하는 기억을 찾아 반환합니다. ⭐️
 * @param {string} keyword 찾을 기억의 키워드 (예: '첫대화', '고백', '무쿠생일')
 * @returns {string|null} 기억 내용 텍스트 또는 null
 */
function getFixedMemory(keyword) {
    // 키워드를 소문자로 변환하여 고정 기억 DB에서 찾아봅니다.
    const lowerKeyword = keyword.toLowerCase();

    // 정확히 매칭되는 키워드 우선
    if (fixedMemoriesDB[lowerKeyword]) {
        console.log(`[MemoryManager] 고정 기억 "${lowerKeyword}" 정확히 매칭됨.`);
        return fixedMemoriesDB[lowerKeyword];
    }

    // 포함하는 키워드 검색 (예: "첫 대화" → "첫대화")
    for (const key in fixedMemoriesDB) {
        // fixedMemoriesDB의 키가 사용자 키워드를 포함하는지 확인 (예: '첫대화'에 '대화'가 포함)
        // 또는 사용자 키워드가 fixedMemoriesDB의 키를 포함하는지 확인 (예: '우리 첫대화 기억해'에 '첫대화'가 포함)
        if (lowerKeyword.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerKeyword)) { 
            console.log(`[MemoryManager] 고정 기억 "${lowerKeyword}" 부분 매칭됨 (키: ${key}).`);
            return fixedMemoriesDB[key];
        }
    }
    
    console.log(`[MemoryManager] 고정 기억 "${lowerKeyword}" 찾을 수 없음.`);
    return null;
}


// ⭐️ 리마인더 관련 함수들 추가 ⭐️

/**
 * 새로운 리마인더를 데이터베이스에 저장합니다.
 * @param {number} dueTime 리마인더 전송 시간 (Unix timestamp ms)
 * @param {string} message 리마인더 메시지
 * @returns {Promise<number>} 저장된 리마인더의 ID
 */
async function saveReminder(dueTime, message) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO reminders (due_time, message, is_sent) VALUES (?, ?, 0)");
        stmt.run(dueTime, message, function (err) {
            if (err) {
                console.error('[MemoryManager] 리마인더 저장 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] 리마인더 저장됨 (ID: ${this.lastID}, 시간: ${new Date(dueTime)})`);
                resolve(this.lastID);
            }
        });
        stmt.finalize();
    });
}

/**
 * 현재 시간 이전에 도달했고 아직 전송되지 않은 리마인더를 조회합니다.
 * @param {number} currentTime 현재 시간 (Unix timestamp ms)
 * @returns {Promise<Array<Object>>} 전송해야 할 리마인더 배열
 */
async function getDueReminders(currentTime) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM reminders WHERE due_time <= ? AND is_sent = 0", [currentTime], (err, rows) => {
            if (err) {
                console.error('[MemoryManager] 기한 리마인더 조회 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] 기한 리마인더 ${rows.length}개 조회됨.`);
                resolve(rows);
            }
        });
    });
}

/**
 * 특정 리마인더를 전송 완료 상태로 표시합니다.
 * @param {number} reminderId 리마인더 ID
 * @returns {Promise<void>}
 */
async function markReminderAsSent(reminderId) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE reminders SET is_sent = 1 WHERE id = ?", [reminderId], function (err) {
            if (err) {
                console.error('[MemoryManager] 리마인더 전송 상태 업데이트 오류:', err.message);
                reject(err);
            } else {
                console.log(`[MemoryManager] 리마인더 ${reminderId} 전송 완료로 표시됨.`);
                resolve();
            }
        });
    });
}


module.exports = {
    ensureMemoryTablesAndDirectory,
    saveMemory,
    searchMemories,
    clearMemory,
    extractAndSaveMemory,
    loadAllMemories, 
    getFixedMemory,
    // ⭐️ 리마인더 관련 함수들 export ⭐️
    saveReminder,
    getDueReminders,
    markReminderAsSent
};
