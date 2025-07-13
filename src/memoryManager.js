// src/memoryManager.js - v1.5 (고정 기억 로딩 및 검색 로직 대폭 개선)

const fs = require('fs').promises; // 비동기 파일 시스템 모듈 사용
const path = require('path');
const { Database } = require('sqlite3'); // SQLite3 데이터베이스 모듈

// ⭐️ 변경된 부분: MEMORY_BASE_PATH를 /data/memory로 설정 ⭐️
const MEMORY_BASE_PATH = path.join('/data', 'memory');

// 이제 모든 파일 경로를 MEMORY_BASE_PATH 기준으로 설정합니다.
const dbPath = path.join(MEMORY_BASE_PATH, 'memories.db'); // SQLite DB 경로 변경
let db; // SQLite 데이터베이스 인스턴스

// ⭐️ 고정 기억을 저장할 변수 (메모리 로딩) ⭐️
// 이제 두 파일 모두 단순 배열로 저장하도록 변경
const fixedMemoriesDB = {
    fixedMemories: [],    // fixedMemories.json 내용을 배열로 저장
    loveHistory: [],      // love_history.json 내용을 단순 배열로 저장
    // 기타 텍스트 파일 등은 필요시 여기에 추가 가능
};

// 기억 파일들의 경로 정의
const FIXED_MEMORIES_FILE = path.join(MEMORY_BASE_PATH, 'fixedMemories.json');
// ⭐️ 수정된 부분: love-history.json -> love_history.json (언더스코어로 변경) ⭐️
const LOVE_HISTORY_FILE = path.join(MEMORY_BASE_PATH, 'love_history.json');

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
                        // reminders 테이블 생성
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
    const memoryDir = MEMORY_BASE_PATH; // ⭐️ 이 부분을 변경 ⭐️
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
 * @returns {Promise<void>}
 */
async function loadAllMemories() {
    console.log('[MemoryManager] 고정 기억 파일 로딩 시작...');
    try {
        // fixedMemories.json 로드 (배열 형태)
        try {
            const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
            fixedMemoriesDB.fixedMemories = JSON.parse(data);
            console.log(`[MemoryManager] fixedMemories.json 로드 완료. (기억 ${fixedMemoriesDB.fixedMemories.length}개)`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] fixedMemories.json 파일이 없습니다. 빈 배열로 초기화합니다.`);
                fixedMemoriesDB.fixedMemories = [];
                await fs.writeFile(FIXED_MEMORIES_FILE, JSON.stringify([], null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] fixedMemories.json 로드 실패: ${err.message}`);
            }
        }

        // love_history.json 로드 (이제 단순 배열 형태로 로드)
        try {
            const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
            fixedMemoriesDB.loveHistory = JSON.parse(data); // 이제 loveHistory는 배열이 될 것임
            console.log(`[MemoryManager] love_history.json 로드 완료. (기억 ${fixedMemoriesDB.loveHistory.length}개)`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] love_history.json 파일이 없습니다. 빈 배열로 초기화합니다.`);
                fixedMemoriesDB.loveHistory = []; // 빈 배열로 초기화
                await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] love_history.json 로드 실패: ${err.message}`);
            }
        }

        console.log('[MemoryManager] 모든 고정 기억 로딩 완료.');
        console.log('[MemoryManager] 로드된 고정 기억 최상위 키:', Object.keys(fixedMemoriesDB));

    } catch (error) {
        console.error('[MemoryManager] 고정 기억 로딩 중 치명적인 오류:', error);
    }
}

/**
 * ⭐️ 고정 기억 DB에서 특정 키워드에 해당하는 기억을 찾아 반환합니다. ⭐️
 * @param {string} userMessage 사용자의 원본 메시지 (여기서 키워드를 추출하여 검색)
 * @returns {string|null} 가장 적합한 기억 내용 텍스트 또는 null
 */
function getFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let bestMatch = null;
    let maxMatches = 0;

    // 1. fixedMemories 배열에서 검색
    for (const memoryText of fixedMemoriesDB.fixedMemories) {
        const lowerMemory = memoryText.toLowerCase();
        // 사용자 메시지가 기억 텍스트를 포함하거나, 기억 텍스트가 사용자 메시지를 포함하는 경우
        if (lowerMessage.includes(lowerMemory) || lowerMemory.includes(lowerMessage)) {
            console.log(`[MemoryManager] fixedMemories에서 정확한(또는 강한) 일치 발견: "${memoryText.substring(0, 30)}..."`);
            return memoryText; // 정확하거나 강한 일치로 간주하여 바로 반환
        }
        // 부분 매칭 (더 정교한 로직 필요시 여기에 추가)
        const currentMatches = lowerMessage.split(' ').filter(word => word.length > 1 && lowerMemory.includes(word)).length;
        if (currentMatches > maxMatches) {
            maxMatches = currentMatches;
            bestMatch = memoryText;
        }
    }

    // 2. loveHistory 배열에서 검색 (이제 단순 배열이므로 categories.general 접근 제거)
    // loveHistory는 이제 직접 문자열 배열이므로 바로 순회합니다.
    for (const memoryText of fixedMemoriesDB.loveHistory) {
        const lowerMemory = memoryText.toLowerCase();
        if (lowerMessage.includes(lowerMemory) || lowerMemory.includes(lowerMessage)) {
            console.log(`[MemoryManager] loveHistory에서 정확한(또는 강한) 일치 발견: "${memoryText.substring(0, 30)}..."`);
            return memoryText; // 정확하거나 강한 일치로 간주하여 바로 반환
        }
        const currentMatches = lowerMessage.split(' ').filter(word => word.length > 1 && lowerMemory.includes(word)).length;
        if (currentMatches > maxMatches) {
            maxMatches = currentMatches;
            bestMatch = memoryText;
        }
    }
    
    // 3. loveHistory.categories.ai_personal_memories 객체에서 검색 부분 제거
    // loveHistory가 단순 배열이므로 이 부분은 더 이상 유효하지 않습니다.
    // 만약 ai_personal_memories가 여전히 필요하다면, 다른 파일에서 로드하거나
    // 다른 고정 기억 유형으로 통합해야 합니다.

    if (maxMatches > 0) {
        console.log(`[MemoryManager] 고정 기억 "${userMessage}"에 대해 가장 적합한 부분 매칭 기억 반환.`);
        return bestMatch;
    }
    
    console.log(`[MemoryManager] 고정 기억 "${userMessage}" 찾을 수 없음.`);
    return null;
}


// ⭐️ 리마인더 관련 함수들 (더미 함수 유지) ⭐️

/**
 * 새로운 리마인더를 데이터베이스에 저장합니다. (더미)
 */
async function saveReminder(dueTime, message) {
    console.log(`[MemoryManager] saveReminder 임시 실행 (리마인더 저장 안 함): ${message}`);
    return 1; // 더미 ID 반환
}

/**
 * 현재 시간 이전에 도달했고 아직 전송되지 않은 리마인더를 조회합니다. (더미)
 */
async function getDueReminders(currentTime) {
    console.log('[MemoryManager] getDueReminders 임시 실행 (항상 빈 배열 반환)');
    return [];
}

/**
 * 특정 리마인더를 전송 완료 상태로 표시합니다. (더미)
 */
async function markReminderAsSent(reminderId) {
    console.log(`[MemoryManager] markReminderAsSent 임시 실행 (리마인더 ${reminderId} 전송 완료 표시 안 함)`);
    // 아무것도 하지 않음
}


module.exports = {
    ensureMemoryTablesAndDirectory,
    saveMemory,
    searchMemories,
    clearMemory,
    extractAndSaveMemory,
    loadAllMemories, 
    getFixedMemory,
    // 리마인더 관련 함수들 export
    saveReminder,        
    getDueReminders,    
    markReminderAsSent  
};
