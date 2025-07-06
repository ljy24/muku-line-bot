// src/memoryManager.js v1.22 - PostgreSQL 데이터베이스 연동 및 기억 처리 로직 강화 (강제 마이그레이션 포함 최종 완전체)
// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const { Pool } = require('pg');

const { getYejinSystemPrompt } = require('./yejin');
const { cleanReply } = require('../memory/omoide');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: { rejectUnauthorized: false }
};

let pool;

// 1. 환경 변수 검증
function validateDatabaseConfig() {
    if (!process.env.DATABASE_URL && (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE)) {
        throw new Error('데이터베이스 연결 정보가 누락되었습니다. DATABASE_URL 또는 개별 DB 환경변수를 설정해주세요.');
    }
}

// 2. 안전 파일 읽기
function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

// 3. DB에 기억 저장
async function saveMemoryToDb(memory) {
    if (!pool) throw new Error("Database pool not initialized.");
    try {
        const checkQuery = 'SELECT COUNT(*) FROM memories WHERE content = $1';
        const checkResult = await pool.query(checkQuery, [memory.content]);
        const count = parseInt(checkResult.rows[0].count);

        if (count > 0) {
            console.log(`[MemoryManager] 중복 기억, 저장 건너뜁니다: ${memory.content}`);
            return;
        }

        const queryText = `INSERT INTO memories (content, category, strength, timestamp, is_love_related, is_other_person_related, reminder_time)
                           VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        const queryValues = [
            memory.content,
            memory.category || '기타',
            memory.strength || 'normal',
            memory.timestamp || new Date().toISOString(),
            Boolean(memory.is_love_related),
            Boolean(memory.is_other_person_related),
            memory.reminder_time || null
        ];
        const result = await pool.query(queryText, queryValues);
        console.log(`[MemoryManager] 기억 저장됨 (영향 받은 행 수: ${result.rowCount}): ${memory.content}`);
    } catch (err) {
        console.error(`[MemoryManager] 기억 저장 실패: ${err.message}`);
        throw err;
    }
}

// 4. memory 폴더에서 모든 고정 기억/대화로그/사랑기억 파일들을 읽어 DB에 저장
async function initializeFixedMemoriesToDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 초기 기억을 저장할 수 없습니다.");
        return;
    }
    try {
        const countRes = await pool.query('SELECT COUNT(*) FROM memories');
        if (parseInt(countRes.rows[0].count) > 0) {
            console.log('[MemoryManager] 데이터베이스에 이미 기억이 존재합니다. 초기 기억 마이그레이션을 건너킵니다.');
            return;
        }
        console.log('[MemoryManager] 데이터베이스가 비어있습니다. 초기 기억 마이그레이션을 시작합니다.');

        // 1. fixedMemories.json
        const fixedMemoryPath = path.resolve(__dirname, '../memory/fixedMemories.json');
        const fixedMemoriesRaw = safeRead(fixedMemoryPath, '[]');
        const fixedMemories = JSON.parse(fixedMemoriesRaw);

        for (const content of fixedMemories) {
            await saveMemoryToDb({
                content: cleanReply(content),
                category: '고정기억',
                strength: 'high',
                is_love_related: content.includes('아저씨') || content.includes('사랑') || content.includes('연애'),
                is_other_person_related: content.includes('준기오빠')
            });
        }
        console.log(`[MemoryManager] fixedMemories.json (${fixedMemories.length}개) 마이그레이션 완료.`);

        // 2. love-history.json
        const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
        const loveHistoryRaw = safeRead(loveHistoryPath, '{"categories":{}}');
        const loveHistoryData = JSON.parse(loveHistoryRaw);

        if (loveHistoryData.categories) {
            for (const category in loveHistoryData.categories) {
                if (Array.isArray(loveHistoryData.categories[category])) {
                    for (const item of loveHistoryData.categories[category]) {
                        await saveMemoryToDb({
                            content: cleanReply(item.content),
                            category: category,
                            strength: item.strength || 'normal',
                            timestamp: item.timestamp,
                            is_love_related: true,
                            is_other_person_related: false
                        });
                    }
                }
            }
        }
        console.log(`[MemoryManager] love-history.json 마이그레이션 완료.`);

        // 3. 1.txt, 2.txt, 3.txt, fixed-messages.txt
        const chatLogs = [];
        const logFiles = ['1.txt', '2.txt', '3.txt', 'fixed-messages.txt'];

        for (const fileName of logFiles) {
            const filePath = path.resolve(__dirname, `../memory/${fileName}`);
            const fileContent = safeRead(filePath);
            const lines = fileContent.split('\n');

            let currentDate = '';
            for (const line of lines) {
                const dateMatch = line.match(/^(\d{4}\.\d{2}\.\d{2} [가-힣]+)/);
                if (dateMatch) {
                    currentDate = dateMatch[1];
                    continue;
                }

                const messageMatch = line.match(/^(\d{2}:\d{2})\s(아저씨|애기|coolio|내꺼|빠계)\s(.+)/);
                if (messageMatch) {
                    const time = messageMatch[1];
                    const speaker = messageMatch[2];
                    const message = messageMatch[3].trim();

                    if (message.startsWith('[사진]') || message.startsWith('[동영상]') || message.startsWith('[파일]')) {
                        continue;
                    }

                    let timestamp;
                    try {
                        timestamp = moment.tz(`${currentDate} ${time}`, 'YYYY.MM.DD dddd HH:mm', 'Asia/Tokyo').toISOString();
                    } catch (e) {
                        console.warn(`[MemoryManager] 날짜/시간 파싱 실패: ${currentDate} ${time} - ${e.message}`);
                        timestamp = new Date().toISOString();
                    }

                    const cleanedMessage = cleanReply(message);

                    chatLogs.push({
                        content: cleanedMessage,
                        category: '대화로그',
                        strength: 'normal',
                        timestamp: timestamp,
                        is_love_related: true,
                        is_other_person_related: false
                    });
                }
            }
        }
        chatLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (const log of chatLogs) await saveMemoryToDb(log);

        console.log(`[MemoryManager] 대화 로그 파일 (${chatLogs.length}개) 마이그레이션 완료.`);

    } catch (error) {
        console.error(`[MemoryManager] 초기 기억 마이그레이션 실패: ${error.message}`);
        throw error;
    }
}

// 5. 강제 초기화+마이그레이션 함수 (딱 한 번만!)
async function forceClearAndRemigrate() {
    if (!pool) {
        console.error("[MemoryManager] DB 풀 초기화 안됨. 스킵!");
        return;
    }
    await pool.query('DELETE FROM memories');
    console.log('[MemoryManager] 모든 memories 삭제 완료. 강제 마이그레이션 시작.');
    await initializeFixedMemoriesToDb();
    console.log('[MemoryManager] 강제 마이그레이션 완료!');
}

// 6. DB 준비 및 마이그레이션 실행
async function ensureMemoryDirectory() {
    try {
        validateDatabaseConfig();
        const MEMORY_DIR = path.resolve(__dirname, '../../memory');
        await fs.promises.mkdir(MEMORY_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 관련 파일 디렉토리 확인/생성 완료: ${MEMORY_DIR}`);

        pool = new Pool(dbConfig);
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()');
            console.log(`[MemoryManager] PostgreSQL 데이터베이스 연결 성공`);
        } finally {
            client.release();
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                category VARCHAR(255) NOT NULL DEFAULT '기타',
                strength VARCHAR(50) NOT NULL DEFAULT 'normal',
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                is_love_related BOOLEAN NOT NULL DEFAULT false,
                is_other_person_related BOOLEAN NOT NULL DEFAULT false,
                reminder_time TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log(`[MemoryManager] 'memories' 테이블 준비 완료.`);
        const checkColumnQuery = `SELECT column_name FROM information_schema.columns WHERE table_name='memories' AND column_name='reminder_time';`;
        const columnExists = await pool.query(checkColumnQuery);
        if (columnExists.rows.length === 0) {
            await pool.query(`ALTER TABLE memories ADD COLUMN reminder_time TIMESTAMPTZ DEFAULT NULL;`);
            console.log(`[MemoryManager] 'reminder_time' 컬럼이 'memories' 테이블에 추가되었습니다.`);
        }
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_love_related ON memories(is_love_related);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_other_related ON memories(is_other_person_related);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_reminder_time ON memories(reminder_time);`);
        console.log(`[MemoryManager] 인덱스 생성 완료.`);
        await initializeFixedMemoriesToDb();
    } catch (error) {
        console.error(`[MemoryManager] DB 연결 또는 테이블 초기화 실패: ${error.message}`);
        if (pool) await pool.end();
        throw error;
    }
}

/**
 * 고정 기억 (초기 마이그레이션된 텍스트 기반 기억)을 DB에서 불러옵니다.
 * category = '고정기억' 으로 저장된 모든 content를 반환합니다.
 * @returns {Promise<string[]>} 고정 기억 문자열 배열
 */
async function loadFixedMemoriesFromDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 연결 풀이 초기화되지 않았습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const result = await pool.query(`
            SELECT content FROM memories
            WHERE category = '고정기억'
            ORDER BY created_at ASC
        `);
        console.log(`[MemoryManager] 고정 기억 ${result.rows.length}개 불러오기 완료.`);
        return result.rows.map(row => row.content);
    } catch (err) {
        console.error(`[MemoryManager] 고정 기억 불러오기 실패: ${err.message}`);
        throw err;
    }
}

async function closeDatabaseConnection() {
    if (pool) {
        await pool.end();
        console.log('[MemoryManager] 데이터베이스 연결 풀이 종료되었습니다.');
    }
}

// ---- 이하 기존 memoryManager.js 내 모든 함수, 내보내기(export) 순서 포함 ----

// (파일 마지막 부분에)
module.exports = {
    ensureMemoryDirectory,
    saveMemoryToDb,
    initializeFixedMemoriesToDb,
    loadFixedMemoriesFromDb,
    loadAllMemoriesFromDb,        // 꼭 추가!
    forceClearAndRemigrate,
    closeDatabaseConnection
};


