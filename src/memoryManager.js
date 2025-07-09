// src/memoryManager.js - v1.2 (텍스트 파일 로딩 제거, JSON 파일만 로딩)

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
// const TEXT_MEMORY_1_FILE = path.join(process.cwd(), 'memory', '1빠계.txt'); // 제거
// const TEXT_MEMORY_2_FILE = path.join(process.cwd(), 'memory', '2내꺼.txt'); // 제거

/**
 * SQLite 데이터베이스 연결을 초기화합니다.
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
                        console.error('[MemoryManager] 테이블 생성 오류:', err.message);
                        reject(err);
                    } else {
                        console.log('[MemoryManager] memories 테이블이 준비되었습니다.');
                        resolve();
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

        // 1빠계.txt, 2내꺼.txt 로딩 부분은 제거되었습니다.

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
        if (lowerKeyword.includes(key.toLowerCase())) { // 사용자의 키워드가 DB 키를 포함하는지 확인
            console.log(`[MemoryManager] 고정 기억 "${lowerKeyword}" 부분 매칭됨 (키: ${key}).`);
            return fixedMemoriesDB[key];
        }
    }
    
    console.log(`[MemoryManager] 고정 기억 "${lowerKeyword}" 찾을 수 없음.`);
    return null;
}

module.exports = {
    ensureMemoryTablesAndDirectory,
    saveMemory,
    searchMemories,
    clearMemory,
    extractAndSaveMemory,
    loadAllMemories, // 외부에서 호출할 필요는 없지만, 디버깅/확인용으로 export
    getFixedMemory   // 고정 기억 조회를 위해 export
};
