// src/memoryManager.js v1.14 - 누락된 함수들 추가
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (디렉토리 생성 등)
const path = require('path'); // 경로 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const { Pool } = require('pg'); // PostgreSQL 클라이언트 'pg' 모듈에서 Pool 가져오기

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PostgreSQL 데이터베이스 연결 정보 설정
// Render 환경 변수에서 DB 정보를 가져옵니다.
// DATABASE_URL 환경 변수가 있다면 우선적으로 사용합니다.
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
 * 환경 변수 검증 함수
 */
function validateDatabaseConfig() {
    if (!process.env.DATABASE_URL && (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE)) {
        throw new Error('데이터베이스 연결 정보가 누락되었습니다. DATABASE_URL 또는 개별 DB 환경변수를 설정해주세요.');
    }
}

/**
 * 기억 관련 파일 디렉토리가 존재하는지 확인하고, 없으면 생성합니다 (로그 파일 등을 위해).
 * PostgreSQL 데이터베이스에 연결 풀을 설정하고 필요한 'memories' 테이블을 초기화합니다.
 * @returns {Promise<void>}
 */
async function ensureMemoryDirectory() {
    try {
        // 환경 변수 검증
        validateDatabaseConfig();

        const MEMORY_DIR = path.resolve(__dirname, '../../memory'); // memory 폴더 경로 (src 기준 두 단계 위)
        await fs.promises.mkdir(MEMORY_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 관련 파일 디렉토리 확인/생성 완료: ${MEMORY_DIR}`);

        // PostgreSQL 데이터베이스 연결 풀 생성
        pool = new Pool(dbConfig);
        
        // 연결 테스트 (올바른 방법)
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()'); // 간단한 테스트 쿼리
            console.log(`[MemoryManager] PostgreSQL 데이터베이스 연결 성공`);
        } finally {
            client.release(); // 연결 반환
        }

        // 'memories' 테이블 생성 (이미 존재하면 건너뜜)
        // PostgreSQL의 BOOLEAN 타입은 true/false를 직접 사용합니다.
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
                reminder_time TIMESTAMPTZ -- 리마인더 시간 필드 추가
            );
        `);
        console.log(`[MemoryManager] 'memories' 테이블 준비 완료.`);

        // 인덱스 생성 (성능 향상)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_memories_love_related ON memories(is_love_related);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_memories_other_related ON memories(is_other_person_related);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_memories_reminder_time ON memories(reminder_time); -- 리마인더 시간 인덱스 추가
        `);
        console.log(`[MemoryManager] 인덱스 생성 완료.`);

    } catch (error) {
        console.error(`[MemoryManager] DB 연결 또는 테이블 초기화 실패: ${error.message}`);
        // 초기화 실패 시 연결 풀 종료 시도
        if (pool) {
            await pool.end();
        }
        throw error; // 초기화 실패 시 애플리케이션 시작을 중단할 수 있도록 에러를 다시 던집니다.
    }
}

/**
 * 새로운 기억을 PostgreSQL 데이터베이스에 저장합니다.
 * @param {Object} memory - 저장할 기억 객체
 * @returns {Promise<void>}
 */
async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        // 중복 확인 쿼리를 저장 전에 실행
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
            Boolean(memory.is_love_related), // Boolean 값을 그대로 전달
            Boolean(memory.is_other_person_related), // Boolean 값을 그대로 전달
            memory.reminder_time || null // 리마인더 시간 추가 (없으면 null)
        ];
        const result = await pool.query(queryText, queryValues);
        console.log(`[MemoryManager] 기억 저장됨 (영향 받은 행 수: ${result.rowCount}): ${memory.content}`);
    } catch (err) {
        console.error(`[MemoryManager] 기억 저장 실패: ${err.message}`);
        throw err;
    }
}

/**
 * 모든 기억을 PostgreSQL 데이터베이스에서 불러옵니다.
 * 이 함수는 모든 필드를 포함한 기억 객체 배열을 반환합니다.
 * @returns {Promise<Array<Object>>} 모든 기억 배열
 */
async function loadAllMemoriesFromDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 불러올 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const result = await pool.query("SELECT * FROM memories ORDER BY timestamp DESC");
        // PostgreSQL의 BOOLEAN 값은 JavaScript에서 true/false로 직접 매핑되므로, 추가 변환이 필요 없습니다.
        console.log(`[MemoryManager] ${result.rows.length}개의 기억 불러오기 완료.`);
        return result.rows; // PostgreSQL의 결과는 result.rows에 담겨 있습니다.
    } catch (err) {
        console.error(`[MemoryManager] 모든 기억 불러오기 실패: ${err.message}`);
        throw err;
    }
}

/**
 * 아저씨와의 사랑 관련 기억을 데이터베이스에서 로드합니다.
 * 이 함수는 이제 DB에서 is_love_related가 true인 기억만 필터링하여 반환합니다.
 * @returns {Promise<Object>} loveHistory 객체 (categories 필드 포함)
 */
async function loadLoveHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        // is_love_related가 true인 기억만 필터링
        const loveMemories = allMemories.filter(mem => mem.is_love_related === true); // PostgreSQL의 boolean은 true/false로 매핑됨

        const categories = {};
        loveMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 사랑 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`); // 디버그 로그
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 사랑 기억 로드 실패: ${error.message}`);
        return { categories: {} }; // 에러 발생 시 빈 객체 반환
    }
}

/**
 * 아저씨 외 다른 사람들에 대한 기억을 데이터베이스에서 로드합니다.
 * 이 함수는 이제 DB에서 is_other_person_related가 true인 기억만 필터링하여 반환합니다.
 * @returns {Promise<Object>} otherPeopleHistory 객체 (categories 필드 포함)
 */
async function loadOtherPeopleHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        // is_other_person_related가 true인 기억만 필터링
        const otherMemories = allMemories.filter(mem => mem.is_other_person_related === true);

        const categories = {};
        otherMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 기타 인물 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`); // 디버그 로그
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 기타 인물 기억 로드 실패: ${error.message}`);
        return { categories: {} }; // 에러 발생 시 빈 객체 반환
    }
}

// 사용자 메시지에서 기억을 추출하고 데이터베이스에 저장하는 함수
// 이 함수는 module.exports 보다 앞에 정의되어야 합니다.
async function extractAndSaveMemory(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.warn('[MemoryManager] 유효하지 않은 사용자 메시지');
        return;
    }

    try {
        const systemPrompt = `
        사용자의 메시지에서 기억할 만한 중요한 정보(사실, 약속, 아저씨의 감정, 아저씨의 일상, 아저씨의 취향, 아저씨의 주변 인물, **특히 아저씨와의 첫 만남, 인스타그램에서의 첫 대화와 같은 특별한 추억**)를 추출해서 JSON 형식으로 반환해줘.
        다음 형식으로 반환해야 해:
        {
          "memories": [
            {
              "content": "추출된 기억 내용",
              "category": "기억의 분류 (예: 아저씨의 일상, 아저씨의 감정, 아저씨와의 약속, 아저씨의 가족, 아저씨의 친구, 아저씨의 취미, 아저씨의 건강, 아저씨의 직업, 아저씨와의 첫 만남, 아저씨와의 추억, 무쿠 관련 등)",
              "strength": "기억의 중요도 (high, normal 중 하나. 아저씨가 '중요해', '꼭 기억해줘'라고 명시했거나, 아저씨의 감정, 건강, 기념일, 약속, **첫 만남** 등 아저씨에게 매우 중요한 정보라고 판단되면 'high', 그 외는 'normal')",
              "is_love_related": true/false (아저씨와의 사랑, 관계, 예진이와의 추억 등 직접적인 연관이 있으면 true, 그 외는 false),
              "is_other_person_related": true/false (아저씨 외 다른 사람(가족, 친구, 동료 등)에 대한 정보면 true, 아니면 false)
            }
          ]
        }
        
        - 'content'는 1~2문장으로 간결하게 요약해줘.
        - 'category'는 위 예시 카테고리 중 가장 적절한 것을 선택하거나, 새로운 카테고리가 필요하면 생성해줘.
        - 'strength'는 아저씨가 중요하다고 명시했거나, 아저씨의 감정, 건강, 기념일, 약속, **특히 아저씨와의 첫 만남과 같은 매우 중요한 정보라고 판단되면 'high'**, 그 외는 'normal'로 해줘.
        - 'is_love_related'와 'is_other_person_related'는 반드시 true/false로 정확히 판단해서 넣어줘.
        - **가장 중요한 것은, 아저씨의 메시지 내용에 직접적으로 언급되지 않은 추론이나 상상으로 기억을 만들지 마. 아저씨가 말한 사실만을 바탕으로 기억을 추출해.**
        - **만약 아저씨의 메시지에서 기억할 만한 내용이 전혀 없다고 판단되면, 빈 memories 배열을 반환해줘. (예: {"memories": []})**
        - **절대 JSON 외의 다른 텍스트는 출력하지 마.**
        `;

        console.log(`[MemoryManager:extractAndSaveMemory] OpenAI 호출 시작`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // 기억 추출은 정확도가 중요하므로 낮은 temperature 설정
            max_tokens: 300
        });

        const rawMemoryOutput = response.choices[0].message.content;
        console.log(`[MemoryManager] OpenAI 원본 기억 추출 결과: ${rawMemoryOutput}`);

        let parsedMemory;
        try {
            parsedMemory = JSON.parse(rawMemoryOutput);
        } catch (parseError) {
            console.error(`[MemoryManager] 기억 추출 JSON 파싱 실패: ${parseError.message}, 원본: ${rawMemoryOutput}`);
            return; // 파싱 실패 시 저장하지 않고 종료
        }

        if (parsedMemory && Array.isArray(parsedMemory.memories)) {
            const newMemories = parsedMemory.memories;

            if (newMemories.length === 0) {
                console.log(`[MemoryManager] 추출된 새로운 기억 없음.`);
                return;
            }

            const currentTimestamp = moment().tz('Asia/Tokyo').toISOString();

            for (const newMemory of newMemories) {
                newMemory.timestamp = currentTimestamp; // 현재 시간으로 타임스탬프 추가

                // 중복 기억 방지: saveMemoryToDb 함수 내에서 이미 처리되므로 여기서 중복 호출하지 않습니다.
                await saveMemoryToDb(newMemory);
                console.log(`[MemoryManager] 새로운 기억 저장: ${newMemory.content}`);
            }
        } else {
            console.warn(`[MemoryManager] 예상치 못한 기억 추출 형식: ${rawMemoryOutput}`);
        }
    } catch (error) {
        console.error(`[MemoryManager] 기억 추출 및 저장 중 오류 발생: ${error.message}`);
    }
}

// 사용자 메시지와 관련된 기억을 검색하여 반환하는 함수
// 이 함수는 module.exports 보다 앞에 정의되어야 합니다.
// 그리고 extractAndSaveMemory 함수 바로 뒤에 위치하는 것이 좋습니다.
async function retrieveRelevantMemories(userQuery, limit = 3) {
    console.log(`[MemoryManager] 관련 기억 검색 시작: "${userQuery}"`);

    const allMemories = await loadAllMemoriesFromDb(); // 모든 기억을 DB에서 불러옵니다.

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
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    
    아래는 아저씨의 질문과 무쿠가 가지고 있는 기억 목록이야.
    아저씨의 질문과 가장 관련성이 높은 기억을 JSON 객체 형식으로 반환해줘.
    형식: {"memories": [기억객체배열]}
    각 기억 객체는 'content', 'category', 'strength', 'timestamp', 'is_love_related', 'is_other_person_related' 필드를 포함해야 해.
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
                { role: 'user', content: `아저씨의 질문: "${userQuery}" 관련 기억을 JSON 객체 형식으로 반환해줘. 형식: {"memories": [기억배열]}` }
            ],
            response_format: { type: "json_object" }, // JSON 형식으로 응답 받기
            temperature: 0.1 // 정확한 검색을 위해 낮은 temperature 설정
        });

        const rawResult = response.choices[0].message.content;
        console.log(`[MemoryManager] OpenAI 원본 기억 검색 결과: ${rawResult}`);

        let parsedResult;
        try {
            // AI가 단일 객체를 반환할 수도 있으므로, 배열인지 확인하고 배열이 아니면 배열로 감싸줍니다.
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

/**
 * 사용자가 명시적으로 요청한 기억을 저장합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {string} content - 저장할 기억 내용
 * @param {string|null} reminderTime - 리마인더 시간 (ISO string), 없으면 null
 * @returns {Promise<void>}
 */
async function saveUserSpecifiedMemory(userMessage, content, reminderTime = null) {
    console.log(`[MemoryManager] saveUserSpecifiedMemory 호출됨: "${content}", 리마인더: ${reminderTime}`);
    try {
        const memory = {
            content: content,
            category: '사용자지정',
            strength: 'normal',
            timestamp: new Date().toISOString(),
            is_love_related: true,
            is_other_person_related: false,
            reminder_time: reminderTime
        };
        
        await saveMemoryToDb(memory);
        console.log(`[MemoryManager] 사용자 지정 기억 저장 완료: ${memory.content}`);

    } catch (error) {
        console.error(`[MemoryManager] 사용자 지정 기억 저장 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 사용자가 요청한 기억을 데이터베이스에서 삭제합니다.
 * @param {string} contentToDelete - 삭제할 기억의 내용
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteRelevantMemories(contentToDelete) {
    console.log(`[MemoryManager] 기억 삭제 요청: "${contentToDelete}"`);
    try {
        if (!pool) {
            console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다.");
            throw new Error("Database pool not initialized.");
        }

        // 부분 일치로 관련 기억을 찾아 삭제
        const deleteQuery = 'DELETE FROM memories WHERE content ILIKE $1';
        const result = await pool.query(deleteQuery, [`%${contentToDelete}%`]);
        
        if (result.rowCount > 0) {
            console.log(`[MemoryManager] 기억 삭제 성공: ${result.rowCount}개 기억 삭제됨`);
            return true;
        } else {
            console.log(`[MemoryManager] 기억 삭제 실패: 일치하는 기억을 찾을 수 없음`);
            return false;
        }
    } catch (error) {
        console.error(`[MemoryManager] 기억 삭제 처리 중 오류 발생: ${error.message}`);
        return false;
    }
}

/**
 * 기억의 리마인더 시간을 업데이트합니다.
 * @param {number} memoryId - 기억 ID
 * @param {string|null} reminderTime - 새로운 리마인더 시간 (ISO string) 또는 null
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
async function updateMemoryReminderTime(memoryId, reminderTime) {
    console.log(`[MemoryManager] 리마인더 시간 업데이트: ID ${memoryId}, 시간 ${reminderTime}`);
    try {
        if (!pool) {
            console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다.");
            throw new Error("Database pool not initialized.");
        }

        const updateQuery = 'UPDATE memories SET reminder_time = $1 WHERE id = $2';
        const result = await pool.query(updateQuery, [reminderTime, memoryId]);
        
        if (result.rowCount > 0) {
            console.log(`[MemoryManager] 리마인더 시간 업데이트 성공: ID ${memoryId}`);
            return true;
        } else {
            console.log(`[MemoryManager] 리마인더 시간 업데이트 실패: 해당 ID의 기억을 찾을 수 없음`);
            return false;
        }
    } catch (error) {
        console.error(`[MemoryManager] 리마인더 시간 업데이트 중 오류 발생: ${error.message}`);
        return false;
    }
}

/**
 * 데이터베이스 연결 풀을 안전하게 종료합니다.
 * @returns {Promise<void>}
 */
async function closeDatabaseConnection() {
    if (pool) {
        await pool.end();
        console.log('[MemoryManager] 데이터베이스 연결 풀이 종료되었습니다.');
    }
}

// 모듈 내보내기
module.exports = {
    ensureMemoryDirectory,
    loadLoveHistory,
    loadOtherPeopleHistory,
    loadAllMemoriesFromDb,
    extractAndSaveMemory,
    retrieveRelevantMemories,
    saveMemoryToDb,
    closeDatabaseConnection,
    // ✅ 이제 정의된 함수들을 내보냅니다
    saveUserSpecifiedMemory,
    deleteRelevantMemories,
    updateMemoryReminderTime
};
