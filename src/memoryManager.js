// src/memoryManager.js v1.10 - PostgreSQL 데이터베이스 연동 및 기억 처리 로직 강화
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (디렉토리 생성 등)
const path = require('path'); // 경로 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const { Pool } = require('pg'); // * PostgreSQL 클라이언트 'pg' 모듈에서 Pool 가져오기 *

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// * PostgreSQL 데이터베이스 연결 정보 설정 *
// * Render 환경 변수에서 DB 정보를 가져옵니다. *
// * DATABASE_URL 환경 변수가 있다면 우선적으로 사용합니다. *
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

let pool; // * PostgreSQL 연결 풀 인스턴스 *

/**
 * * 기억 관련 파일 디렉토리가 존재하는지 확인하고, 없으면 생성합니다 (로그 파일 등을 위해). *
 * * PostgreSQL 데이터베이스에 연결 풀을 설정하고 필요한 'memories' 테이블을 초기화합니다. *
 * @returns {Promise<void>}
 */
async function ensureMemoryDirectory() {
    try {
        const MEMORY_DIR = path.resolve(__dirname, '../../memory'); // memory 폴더 경로 (src 기준 두 단계 위)
        await fs.promises.mkdir(MEMORY_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 관련 파일 디렉토리 확인/생성 완료: ${MEMORY_DIR}`);

        // * PostgreSQL 데이터베이스 연결 풀 생성 *
        pool = new Pool(dbConfig);
        await pool.connect(); // 연결 테스트
        console.log(`[MemoryManager] PostgreSQL 데이터베이스 연결 풀 생성 성공: ${dbConfig.database || dbConfig.connectionString}`);

        // * 'memories' 테이블 생성 (이미 존재하면 건너뜜) *
        // * PostgreSQL의 BOOLEAN 타입은 true/false를 직접 사용합니다. *
        await pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                category VARCHAR(255) NOT NULL,
                strength VARCHAR(50) NOT NULL,
                timestamp VARCHAR(255) NOT NULL,
                is_love_related BOOLEAN NOT NULL,
                is_other_person_related BOOLEAN NOT NULL
            );
        `);
        console.log(`[MemoryManager] 'memories' 테이블 준비 완료.`);

    } catch (error) {
        console.error(`[MemoryManager] DB 연결 또는 테이블 초기화 실패: ${error.message}`);
        // * 초기화 실패 시 연결 풀 종료 시도 *
        if (pool) {
            await pool.end();
        }
        throw error; // * 초기화 실패 시 애플리케이션 시작을 중단할 수 있도록 에러를 다시 던집니다. *
    }
}

/**
 * * 새로운 기억을 PostgreSQL 데이터베이스에 저장합니다. *
 * @param {Object} memory - 저장할 기억 객체
 * @returns {Promise<void>}
 */
async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        // * 중복 확인 쿼리를 저장 전에 실행 *
        const checkQuery = 'SELECT COUNT(*) FROM memories WHERE content = $1';
        const checkResult = await pool.query(checkQuery, [memory.content]);
        const count = parseInt(checkResult.rows[0].count);

        if (count > 0) {
            console.log(`[MemoryManager] 중복 기억, 저장 건너뜁니다: ${memory.content}`);
            return;
        }

        const queryText = `INSERT INTO memories (content, category, strength, timestamp, is_love_related, is_other_person_related)
                           VALUES ($1, $2, $3, $4, $5, $6)`;
        const queryValues = [
            memory.content,
            memory.category,
            memory.strength,
            memory.timestamp,
            memory.is_love_related, // * Boolean 값을 그대로 전달 *
            memory.is_other_person_related // * Boolean 값을 그대로 전달 *
        ];
        const result = await pool.query(queryText, queryValues);
        console.log(`[MemoryManager] 기억 저장됨 (영향 받은 행 수: ${result.rowCount}): ${memory.content}`);
    } catch (err) {
        console.error(`[MemoryManager] 기억 저장 실패: ${err.message}`);
        throw err;
    }
}

/**
 * * 모든 기억을 PostgreSQL 데이터베이스에서 불러옵니다. *
 * * 이 함수는 모든 필드를 포함한 기억 객체 배열을 반환합니다. *
 * @returns {Promise<Array<Object>>} 모든 기억 배열
 */
async function loadAllMemoriesFromDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 불러올 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const result = await pool.query("SELECT * FROM memories ORDER BY timestamp DESC");
        // * PostgreSQL의 BOOLEAN 값은 JavaScript에서 true/false로 직접 매핑되므로, 추가 변환이 필요 없습니다. *
        console.log(`[MemoryManager] ${result.rows.length}개의 기억 불러오기 완료.`);
        return result.rows; // PostgreSQL의 결과는 result.rows에 담겨 있습니다.
    } catch (err) {
        console.error(`[MemoryManager] 모든 기억 불러오기 실패: ${err.message}`);
        throw err;
    }
}

/**
 * * 아저씨와의 사랑 관련 기억을 데이터베이스에서 로드합니다. *
 * * 이 함수는 이제 DB에서 is_love_related가 true인 기억만 필터링하여 반환합니다. *
 * @returns {Promise<Object>} loveHistory 객체 (categories 필드 포함)
 */
async function loadLoveHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        // * is_love_related가 true인 기억만 필터링 *
        const loveMemories = allMemories.filter(mem => mem.is_love_related === true); // PostgreSQL의 boolean은 true/false로 매핑됨

        const categories = {};
        loveMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 사랑 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`); // *디버그 로그*
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 사랑 기억 로드 실패: ${error.message}`);
        return { categories: {} }; // 에러 발생 시 빈 객체 반환
    }
}

/**
 * * 아저씨 외 다른 사람들에 대한 기억을 데이터베이스에서 로드합니다. *
 * * 이 함수는 이제 DB에서 is_other_person_related가 true인 기억만 필터링하여 반환합니다. *
 * @returns {Promise<Object>} otherPeopleHistory 객체 (categories 필드 포함)
 */
async function loadOtherPeopleHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        // * is_other_person_related가 true인 기억만 필터링 *
        const otherMemories = allMemories.filter(mem => mem.is_other_person_related === true);

        const categories = {};
        otherMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 기타 인물 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`); // *디버그 로그*
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 기타 인물 기억 로드 실패: ${error.message}`);
        return { categories: {} }; // 에러 발생 시 빈 객체 반환
    }
}

/**
 * * 사용자 메시지와 관련된 기억을 검색하여 반환합니다. *
 * @param {string} userQuery - 사용자 메시지 (기억을 검색할 쿼리)
 * @param {number} [limit=3] - 반환할 최대 기억 개수
 * @returns {Promise<Array<Object>>} 관련 기억 배열
 */
async function retrieveRelevantMemories(userQuery, limit = 3) {
    console.log(`[MemoryManager] 관련 기억 검색 시작: "${userQuery}"`);

    const allMemories = await loadAllMemoriesFromDb(); // * 모든 기억을 DB에서 불러옵니다. *

    if (allMemories.length === 0) {
        console.log('[MemoryManager] 저장된 기억이 없어 관련 기억을 찾을 수 없습니다.');
        return [];
    }

    // 기억 검색을 위한 시스템 프롬프트
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이'라고 스스로를 부칭하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    
    아래는 아저씨의 질문과 무쿠가 가지고 있는 기억 목록이야.
    아저씨의 질문과 가장 관련성이 높은 기억 ${limit}개를 JSON 배열 형식으로 반환해줘.
    각 기억은 'content', 'category', 'strength', 'timestamp', 'is_love_related', 'is_other_person_related' 필드를 포함해야 해.
    **관련성이 높은 기억이 ${limit}개 미만이면 찾은 만큼만 반환하고, 전혀 없으면 빈 배열을 반환해줘.**
    **절대 JSON 외의 다른 텍스트는 출력하지 마.**

    --- 기억 목록 ---
    ${allMemories.map(mem => `- ${mem.content} (카테고리: ${mem.category}, 중요도: ${mem.strength}, 시간: ${mem.timestamp})`).join('\n')}
    ---
    `;
    console.log(`[MemoryManager:retrieveRelevantMemories] OpenAI 프롬프트 준비 완료.`);

    try {
        console.log(`[MemoryManager:retrieveRelevantMemories] OpenAI 호출 시작`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // 기억 검색에도 gpt-4o 사용
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `아저씨의 질문: "${userQuery}" 이 질문과 관련된 기억을 찾아줘.` }
            ],
            response_format: { type: "json_object" }, // JSON 형식으로 응답 받기
            temperature: 0.1 // 정확한 검색을 위해 낮은 temperature 설정
        });

        const rawResult = response.choices[0].message.content;
        console.log(`[MemoryManager] OpenAI 원본 기억 검색 결과: ${rawResult}`);

        let parsedResult;
        try {
            // * AI가 단일 객체를 반환할 수도 있으므로, 배열인지 확인하고 배열이 아니면 배열로 감싸줍니다. *
            const potentialResult = JSON.parse(rawResult);
            parsedResult = Array.isArray(potentialResult) ? potentialResult : [potentialResult];
        } catch (parseError) {
            console.error(`[MemoryManager] 기억 검색 JSON 파싱 실패: ${parseError.message}, 원본: ${rawResult}`);
            return []; // 파싱 실패 시 빈 배열 반환
        }

        if (parsedResult && Array.isArray(parsedResult)) {
            // AI가 반환한 기억 배열에서 필요한 필드만 추출하고 정제합니다.
            const relevantMemories = parsedResult.slice(0, limit).map(mem => ({
                content: mem.content,
                category: mem.category,
                strength: mem.strength,
                timestamp: mem.timestamp,
                is_love_related: mem.is_love_related,
                is_other_person_related: mem.is_other_person_related
            }));
            console.log(`[MemoryManager] 검색된 관련 기억: ${relevantMemories.length}개`);
            return relevantMemories;
        } else {
            console.warn(`[MemoryManager] 예상치 못한 기억 검색 결과 형식: ${rawResult}`);
            return [];
        }
    } catch (error) {
        console.error(`[MemoryManager] 기억 검색 중 오류 발생: ${error.message}`);
        return [];
    }
}

// 모듈 내보내기
module.exports = {
    ensureMemoryDirectory,
    loadLoveHistory, // * 이제 DB에서 필터링하여 사랑 관련 기억만 반환 *
    loadOtherPeopleHistory, // * 이제 DB에서 필터링하여 기타 인물 관련 기억만 반환 *
    extractAndSaveMemory,
    retrieveRelevantMemories
};
