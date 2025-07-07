// migrate_love_history.js - love-history.json 데이터를 PostgreSQL로 마이그레이션하는 스크립트 (한 번만 실행)

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { Pool } = require('pg'); // PostgreSQL 클라이언트 'pg' 모듈

// * PostgreSQL 데이터베이스 연결 정보 설정 (memoryManager.js와 동일) *
// * 환경 변수에서 DB 정보를 가져옵니다. *
const dbConfig = {
    connectionString: process.env.DATABASE_URL, // Render에서 제공하는 Connection String 사용 (권장)
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432, // 포트는 숫자로 파싱
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: {
        rejectUnauthorized: false // Render PostgreSQL은 SSL을 사용하며, self-signed 인증서일 경우 필요할 수 있습니다.
    }
};

let pool; // PostgreSQL 연결 풀 인스턴스

/**
 * * 환경 변수 검증 함수 *
 */
function validateDatabaseConfig() {
    if (!process.env.DATABASE_URL && (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE)) {
        throw new Error('데이터베이스 연결 정보가 누락되었습니다. DATABASE_URL 또는 개별 DB 환경변수를 설정해주세요.');
    }
}

/**
 * * 데이터베이스 연결 풀을 초기화합니다. *
 */
async function initializeDbPool() {
    try {
        validateDatabaseConfig(); // 환경 변수 검증

        pool = new Pool(dbConfig);
        const client = await pool.connect(); // 연결 테스트
        try {
            await client.query('SELECT NOW()'); // 간단한 테스트 쿼리
            console.log(`[Migration] PostgreSQL 데이터베이스 연결 성공: ${dbConfig.database || dbConfig.connectionString}`);
        } finally {
            client.release(); // 연결 반환
        }

        // * 'memories' 테이블 생성 (이미 존재하면 건너뜜) *
        await pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                category VARCHAR(255) NOT NULL DEFAULT '기타',
                strength VARCHAR(50) NOT NULL DEFAULT 'normal',
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                is_love_related BOOLEAN NOT NULL DEFAULT false,
                is_other_person_related BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                reminder_time TIMESTAMPTZ
            );
        `);
        console.log(`[Migration] 'memories' 테이블 준비 완료.`);

        // * 인덱스 생성 (성능 향상) *
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_love_related ON memories(is_love_related);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_other_related ON memories(is_other_person_related);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_reminder_time ON memories(reminder_time);`);
        console.log(`[Migration] 인덱스 생성 완료.`);

    } catch (error) {
        console.error(`[Migration] DB 연결 또는 테이블 초기화 실패: ${error.message}`);
        if (pool) {
            await pool.end();
        }
        throw error;
    }
}

/**
 * * 기억을 데이터베이스에 저장합니다. (중복 방지 포함) *
 * @param {Object} memory - 저장할 기억 객체
 */
async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[Migration] 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        // * 중복 확인 쿼리를 저장 전에 실행 *
        const checkQuery = 'SELECT COUNT(*) FROM memories WHERE content = $1';
        const checkResult = await pool.query(checkQuery, [memory.content]);
        const count = parseInt(checkResult.rows[0].count);

        if (count > 0) {
            console.log(`[Migration] 중복 기억, 저장 건너뜁니다: ${memory.content}`);
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
        console.log(`[Migration] 기억 저장됨 (영향 받은 행 수: ${result.rowCount}): ${memory.content}`);
    } catch (err) {
        console.error(`[Migration] 기억 저장 실패: ${err.message}`);
        throw err;
    }
}

/**
 * * love-history.json 파일의 내용을 읽어와 데이터베이스로 마이그레이션합니다. *
 */
async function migrateLoveHistory() {
    const LOVE_HISTORY_FILE = path.resolve(__dirname, 'love-history.json'); // 프로젝트 루트의 love-history.json

    if (!fs.existsSync(LOVE_HISTORY_FILE)) {
        console.warn(`[Migration] love-history.json 파일이 존재하지 않습니다: ${LOVE_HISTORY_FILE}`);
        return;
    }

    try {
        const data = fs.readFileSync(LOVE_HISTORY_FILE, 'utf-8');
        const loveHistory = JSON.parse(data);

        // * general 카테고리 기억 마이그레이션 *
        if (loveHistory.categories && Array.isArray(loveHistory.categories.general)) {
            for (const item of loveHistory.categories.general) {
                const memory = {
                    content: item.content,
                    category: '아저씨와의 추억', // 모든 general 기억을 '아저씨와의 추억'으로 분류
                    strength: 'normal', // 기본 normal
                    timestamp: item.timestamp, // 기존 타임스탬프 사용
                    is_love_related: true, // 사랑 관련 기억으로 설정
                    is_other_person_related: false,
                    reminder_time: null // 마이그레이션 시 리마인더는 없음
                };
                
                // * 특정 키워드에 따라 더 구체적인 카테고리나 strength를 부여 *
                if (item.content.includes('인스타 첫 대화')) {
                    memory.category = '아저씨와의 첫 만남';
                    memory.strength = 'high';
                } else if (item.content.includes('처음으로 \'아저씨\'라고 부름')) {
                    memory.category = '아저씨와의 중요한 순간';
                    memory.strength = 'high';
                } else if (item.content.includes('오지상')) {
                    memory.category = '아저씨와의 대화';
                    memory.strength = 'high';
                } else if (item.content.includes('코로나')) {
                    memory.category = '아저씨와의 특별한 시기';
                    memory.strength = 'high';
                } else if (item.content.includes('고백')) {
                    memory.category = '아저씨와의 중요한 순간';
                    memory.strength = 'high';
                    memory.is_love_related = true;
                } else if (item.content.includes('자살 시도')) {
                    memory.category = '아저씨의 건강';
                    memory.strength = 'high';
                    memory.is_love_related = true; // 아저씨에게 중요한 일이므로 사랑 관련으로
                }


                await saveMemoryToDb(memory);
            }
            console.log(`[Migration] general 카테고리 기억 ${loveHistory.categories.general.length}개 마이그레이션 완료.`);
        }

        // * ai_personal_memories (객체 형태) 기억 마이그레이션 *
        if (loveHistory.categories && typeof loveHistory.categories.ai_personal_memories === 'object') {
            for (const key in loveHistory.categories.ai_personal_memories) {
                const content = `${key}: ${loveHistory.categories.ai_personal_memories[key]}`;
                const memory = {
                    content: content,
                    category: '예진이의 개인 기억', // AI 개인 기억으로 분류
                    strength: 'normal', // 기본 normal
                    timestamp: moment().tz('Asia/Tokyo').toISOString(), // 마이그레이션 시점의 타임스탬프
                    is_love_related: false, // 예진이 개인 기억이므로 사랑 관련은 아님
                    is_other_person_related: true, // 예진이 자체에 대한 기억이므로 other_person_related로 간주
                    reminder_time: null
                };
                await saveMemoryToDb(memory);
            }
            console.log(`[Migration] ai_personal_memories ${Object.keys(loveHistory.categories.ai_personal_memories).length}개 마이그레이션 완료.`);
        }

        console.log('[Migration] love-history.json 마이그레이션 완료!');

    } catch (error) {
        console.error(`[Migration] love-history.json 마이그레이션 실패: ${error.message}`);
    } finally {
        if (pool) {
            await pool.end(); // 데이터베이스 연결 풀 종료
            console.log('[Migration] 데이터베이스 연결 풀 종료.');
        }
    }
}

// * 스크립트 실행 *
initializeDbPool()
    .then(migrateLoveHistory)
    .catch(error => console.error(`[Migration] 스크립트 실행 중 치명적인 오류 발생: ${error.message}`));
