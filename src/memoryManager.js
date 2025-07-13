// src/memoryManager.js - v1.6 (JSON 파일 구조 인식 개선)

const fs = require('fs').promises;
const path = require('path');
const { Database } = require('sqlite3');

// ⭐️ 변경된 부분: MEMORY_BASE_PATH를 /data/memory로 설정 ⭐️
const MEMORY_BASE_PATH = path.join('/data', 'memory');

const dbPath = path.join(MEMORY_BASE_PATH, 'memories.db');
let db;

// ⭐️ 고정 기억을 저장할 변수 (메모리 로딩) ⭐️
const fixedMemoriesDB = {
    fixedMemories: [],    // fixedMemories.json 내용을 배열로 저장
    loveHistory: [],      // love_history.json 내용을 단순 배열로 저장
};

const FIXED_MEMORIES_FILE = path.join(MEMORY_BASE_PATH, 'fixedMemories.json');
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
                        db.run(`
                            CREATE TABLE IF NOT EXISTS reminders (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                due_time INTEGER NOT NULL,
                                message TEXT NOT NULL,
                                is_sent INTEGER DEFAULT 0
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
 * 사용자 메시지에서 기억을 추출하고 저장합니다.
 */
async function extractAndSaveMemory(userMessage) {
    console.log(`[MemoryManager] 기억 추출 및 저장 (더미): "${userMessage.substring(0, 20)}..."`);
}

/**
 * 필요한 데이터베이스 테이블 및 파일 디렉토리를 보장합니다.
 */
async function ensureMemoryTablesAndDirectory() {
    await initializeDatabase();
    
    try {
        await fs.mkdir(MEMORY_BASE_PATH, { recursive: true });
        console.log(`[MemoryManager] 'memory' 디렉토리 확인 또는 생성됨: ${MEMORY_BASE_PATH}`);
    } catch (error) {
        console.error(`[MemoryManager] 'memory' 디렉토리 생성 실패: ${error.message}`);
    }

    await loadAllMemories();
}

/**
 * ⭐️ 모든 고정 기억 파일들을 로딩하여 fixedMemoriesDB에 저장합니다. ⭐️
 */
async function loadAllMemories() {
    console.log('[MemoryManager] 고정 기억 파일 로딩 시작...');
    try {
        // fixedMemories.json 로드 (배열 형태)
        try {
            const data = await fs.readFile(FIXED_MEMORIES_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            
            // ⭐️ 핵심 수정: 파일 구조를 올바르게 인식 ⭐️
            if (Array.isArray(parsedData)) {
                fixedMemoriesDB.fixedMemories = parsedData;
                console.log(`[MemoryManager] fixedMemories.json 로드 완료. (기억 ${fixedMemoriesDB.fixedMemories.length}개)`);
            } else {
                console.warn('[MemoryManager] fixedMemories.json이 배열 형태가 아닙니다. 빈 배열로 초기화합니다.');
                fixedMemoriesDB.fixedMemories = [];
            }
            
            console.log('[MemoryManager] fixedMemories.json 내용 (처음 3개):', fixedMemoriesDB.fixedMemories.slice(0, 3));
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] fixedMemories.json 파일이 없습니다. 빈 배열로 초기화합니다.`);
                fixedMemoriesDB.fixedMemories = [];
                await fs.writeFile(FIXED_MEMORIES_FILE, JSON.stringify([], null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] fixedMemories.json 로드 실패: ${err.message}`);
                fixedMemoriesDB.fixedMemories = [];
            }
        }

        // love_history.json 로드 
        try {
            const data = await fs.readFile(LOVE_HISTORY_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            
            // ⭐️ 핵심 수정: love_history.json의 구조를 올바르게 인식 ⭐️
            if (Array.isArray(parsedData)) {
                // 이미 단순 배열인 경우
                fixedMemoriesDB.loveHistory = parsedData;
                console.log(`[MemoryManager] love_history.json 로드 완료 (단순 배열). (기억 ${fixedMemoriesDB.loveHistory.length}개)`);
            } else if (parsedData && typeof parsedData === 'object') {
                // 객체 구조인 경우 - categories.general을 추출하거나 모든 문자열 값을 수집
                let extractedMemories = [];
                
                if (parsedData.categories && Array.isArray(parsedData.categories.general)) {
                    extractedMemories = parsedData.categories.general;
                } else {
                    // 객체의 모든 값에서 배열이나 문자열을 추출
                    function extractStringsFromObject(obj) {
                        let strings = [];
                        for (const key in obj) {
                            const value = obj[key];
                            if (Array.isArray(value)) {
                                strings = strings.concat(value.filter(item => typeof item === 'string'));
                            } else if (typeof value === 'string') {
                                strings.push(value);
                            } else if (typeof value === 'object' && value !== null) {
                                strings = strings.concat(extractStringsFromObject(value));
                            }
                        }
                        return strings;
                    }
                    extractedMemories = extractStringsFromObject(parsedData);
                }
                
                fixedMemoriesDB.loveHistory = extractedMemories;
                console.log(`[MemoryManager] love_history.json 로드 완료 (객체에서 추출). (기억 ${fixedMemoriesDB.loveHistory.length}개)`);
            } else {
                console.warn('[MemoryManager] love_history.json 구조를 인식할 수 없습니다. 빈 배열로 초기화합니다.');
                fixedMemoriesDB.loveHistory = [];
            }
            
            console.log('[MemoryManager] love_history.json 내용 (처음 3개):', fixedMemoriesDB.loveHistory.slice(0, 3));
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[MemoryManager] love_history.json 파일이 없습니다. 빈 배열로 초기화합니다.`);
                fixedMemoriesDB.loveHistory = [];
                await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
            } else {
                console.error(`[MemoryManager] love_history.json 로드 실패: ${err.message}`);
                fixedMemoriesDB.loveHistory = [];
            }
        }

        console.log('[MemoryManager] 모든 고정 기억 로딩 완료.');
        console.log('[MemoryManager] 로드된 고정 기억 최상위 키:', Object.keys(fixedMemoriesDB));
        console.log(`[MemoryManager] 총 로드된 기억: fixedMemories ${fixedMemoriesDB.fixedMemories.length}개, loveHistory ${fixedMemoriesDB.loveHistory.length}개`);

    } catch (error) {
        console.error('[MemoryManager] 고정 기억 로딩 중 치명적인 오류:', error);
    }
}

/**
 * ⭐️ 고정 기억 DB에서 특정 키워드에 해당하는 기억을 찾아 반환합니다. ⭐️
 */
function getFixedMemory(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let bestMatch = null;
    let maxMatches = 0;

    // 1. fixedMemories 배열에서 검색
    for (const memoryText of fixedMemoriesDB.fixedMemories) {
        if (typeof memoryText !== 'string') continue;
        
        const lowerMemory = memoryText.toLowerCase();
        if (lowerMessage.includes(lowerMemory) || lowerMemory.includes(lowerMessage)) {
            console.log(`[MemoryManager] fixedMemories에서 정확한 일치 발견: "${memoryText.substring(0, 30)}..."`);
            return memoryText;
        }
        
        const currentMatches = lowerMessage.split(' ').filter(word => word.length > 1 && lowerMemory.includes(word)).length;
        if (currentMatches > maxMatches) {
            maxMatches = currentMatches;
            bestMatch = memoryText;
        }
    }

    // 2. loveHistory 배열에서 검색
    for (const memoryText of fixedMemoriesDB.loveHistory) {
        if (typeof memoryText !== 'string') continue;
        
        const lowerMemory = memoryText.toLowerCase();
        if (lowerMessage.includes(lowerMemory) || lowerMemory.includes(lowerMessage)) {
            console.log(`[MemoryManager] loveHistory에서 정확한 일치 발견: "${memoryText.substring(0, 30)}..."`);
            return memoryText;
        }
        
        const currentMatches = lowerMessage.split(' ').filter(word => word.length > 1 && lowerMemory.includes(word)).length;
        if (currentMatches > maxMatches) {
            maxMatches = currentMatches;
            bestMatch = memoryText;
        }
    }

    if (maxMatches > 0) {
        console.log(`[MemoryManager] 고정 기억 "${userMessage}"에 대해 가장 적합한 부분 매칭 기억 반환.`);
        return bestMatch;
    }
    
    console.log(`[MemoryManager] 고정 기억 "${userMessage}" 찾을 수 없음.`);
    return null;
}

// ⭐️ 리마인더 관련 함수들 (더미 함수 유지) ⭐️
async function saveReminder(dueTime, message) {
    console.log(`[MemoryManager] saveReminder 임시 실행 (리마인더 저장 안 함): ${message}`);
    return 1;
}

async function getDueReminders(currentTime) {
    console.log('[MemoryManager] getDueReminders 임시 실행 (항상 빈 배열 반환)');
    return [];
}

async function markReminderAsSent(reminderId) {
    console.log(`[MemoryManager] markReminderAsSent 임시 실행 (리마인더 ${reminderId} 전송 완료 표시 안 함)`);
}

module.exports = {
    ensureMemoryTablesAndDirectory,
    saveMemory,
    searchMemories,
    clearMemory,
    extractAndSaveMemory,
    loadAllMemories, 
    getFixedMemory,
    fixedMemoriesDB, 
    saveReminder,        
    getDueReminders,    
    markReminderAsSent  
};
