// src/memoryManager.js v1.8 - MySQL 데이터베이스 연동 버전 (MySQL 5.7 호환)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (디렉토리 생성 등)
const path = require('path'); // 경로 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const mysql = require('mysql2/promise'); // * MySQL2 라이브러리 (Promise 기반으로 비동기 처리 용이) 불러오기 *

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// * MySQL 데이터베이스 연결 정보 설정 *
// * 이 정보들은 환경 변수 (Render 대시보드의 Environment Variables)에 설정되어야 합니다. *
const dbConfig = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306, // 환경 변수에서 가져올 때 숫자로 변환
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true, // 연결 풀에서 연결을 사용할 수 있을 때까지 기다릴지 여부
    connectionLimit: 10,      // 연결 풀의 최대 연결 수
    queueLimit: 0             // 연결 풀 대기열의 최대 요청 수 (0 = 무제한)
};

let pool; // * MySQL 연결 풀 인스턴스 (연결 재사용을 위해 권장) *

/**
 * * 기억 관련 파일 디렉토리가 존재하는지 확인하고, 없으면 생성합니다 (선택 사항, 로그 파일 등을 위해). *
 * * MySQL 데이터베이스에 연결 풀을 설정하고 필요한 'memories' 테이블을 초기화합니다. *
 * @returns {Promise<void>}
 */
async function ensureMemoryDirectory() {
    try {
        const MEMORY_DIR = path.resolve(__dirname, '../../memory'); // memory 폴더 경로 (src 기준 두 단계 위)
        await fs.promises.mkdir(MEMORY_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 관련 파일 디렉토리 확인/생성 완료: ${MEMORY_DIR}`);

        // * MySQL 데이터베이스 연결 풀 생성 *
        pool = mysql.createPool(dbConfig);
        console.log(`[MemoryManager] MySQL 데이터베이스 연결 풀 생성 성공: ${dbConfig.database}`);

        // * 'memories' 테이블 생성 (이미 존재하면 건너뜜) *
        // * MySQL 5.7에서 BOOLEAN 타입은 TINYINT(1)로 처리되므로, BOOLEAN 사용. *
        // * VARCHAR 대신 TEXT를 사용하여 content의 길이를 유연하게 처리. *
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS memories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                content TEXT NOT NULL,
                category VARCHAR(255) NOT NULL,
                strength VARCHAR(50) NOT NULL,
                timestamp VARCHAR(255) NOT NULL,
                is_love_related BOOLEAN NOT NULL,
                is_other_person_related BOOLEAN NOT NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
 * * 새로운 기억을 MySQL 데이터베이스에 저장합니다. *
 * @param {Object} memory - 저장할 기억 객체
 * @returns {Promise<void>}
 */
async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[MemoryManager] MySQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const [rows] = await pool.execute( // * connection.execute 대신 pool.execute 사용 *
            `INSERT INTO memories (content, category, strength, timestamp, is_love_related, is_other_person_related)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                memory.content,
                memory.category,
                memory.strength,
                memory.timestamp,
                memory.is_love_related ? 1 : 0, // * MySQL BOOLEAN은 0 또는 1로 저장 *
                memory.is_other_person_related ? 1 : 0 // * MySQL BOOLEAN은 0 또는 1로 저장 *
            ]
        );
        console.log(`[MemoryManager] 기억 저장됨 (ID: ${rows.insertId}): ${memory.content}`);
    } catch (err) {
        console.error(`[MemoryManager] 기억 저장 실패: ${err.message}`);
        throw err;
    }
}

/**
 * * 모든 기억을 MySQL 데이터베이스에서 불러옵니다. *
 * @returns {Promise<Array<Object>>} 모든 기억 배열
 */
async function loadAllMemoriesFromDb() {
    if (!pool) {
        console.error("[MemoryManager] MySQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 불러올 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const [rows] = await pool.execute("SELECT * FROM memories ORDER BY timestamp DESC"); // * connection.execute 대신 pool.execute 사용 *
        // * MySQL의 BOOLEAN (TINYINT(1)) 값은 JavaScript에서 1 또는 0으로 오므로, 직접 사용하거나 필요에 따라 true/false로 변환합니다. *
        // * 여기서는 1 또는 0을 그대로 사용하고, 필터링 로직에서 === 1 || === true 로 처리하도록 합니다. *
        console.log(`[MemoryManager] ${rows.length}개의 기억 불러오기 완료.`);
        return rows;
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
        // * MySQL에서 불러온 is_love_related 값이 1이거나 true인 경우를 필터링합니다. *
        const loveMemories = allMemories.filter(mem => mem.is_love_related === 1 || mem.is_love_related === true);

        const categories = {};
        loveMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
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
        // * MySQL에서 불러온 is_other_person_related 값이 1이거나 true인 경우를 필터링합니다. *
        const otherMemories = allMemories.filter(mem => mem.is_other_person_related === 1 || mem.is_other_person_related === true);

        const categories = {};
        otherMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 기타 인물 기억 로드 실패: ${error.message}`);
        return { categories: {} }; // 에러 발생 시 빈 객체 반환
    }
}

/**
 * 사용자 메시지에서 새로운 기억을 추출하고 저장합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @returns {Promise<void>}
 */
async function extractAndSaveMemory(userMessage) {
    // 아저씨의 메시지가 너무 짧거나 의미 없는 내용일 경우 기억 추출을 건너뜁니다.
    if (!userMessage || userMessage.trim().length < 5) {
        console.log(`[MemoryManager] 메시지가 너무 짧아 기억 추출을 건너뜁니다: "${userMessage}"`);
        return;
    }

    console.log(`[MemoryManager] 기억 추출 시작: "${userMessage}"`);

    // OpenAI API 호출을 위한 시스템 프롬프트
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
    아저씨의 메시지에서 새로운 '기억'이 될 만한 중요한 정보(사실, 약속, 아저씨의 감정, 아저씨의 일상, 아저씨의 취향, 아저씨의 주변 인물 등)를 추출해줘.
    기억은 다음과 같은 JSON 형식으로 출력해야 해.

    {
      "memories": [
        {
          "content": "기억 내용",
          "category": "기억의 분류 (예: 아저씨의 일상, 아저씨의 감정, 아저씨와의 약속, 아저씨의 가족, 아저씨의 친구, 아저씨의 취미, 아저씨의 건강, 아저씨의 직업, 아저씨의 기념일, 아저씨의 취향, 무쿠 관련 등)",
          "strength": "기억의 중요도 (high, normal 중 하나. 아저씨가 '중요해', '꼭 기억해줘'라고 명시했거나, 아저씨의 감정, 건강, 기념일, 약속 등 아저씨에게 매우 중요한 정보라고 판단되면 'high', 그 외는 'normal')",
          "is_love_related": true/false (아저씨와의 사랑, 관계, 예진이와의 추억 등 직접적인 연관이 있으면 true, 그 외는 false),
          "is_other_person_related": true/false (아저씨 외 다른 사람(가족, 친구, 동료 등)에 대한 정보면 true, 아니면 false)
        }
      ]
    }
    
    - 'content'는 1~2문장으로 간결하게 요약해줘.
    - 'category'는 위 예시 카테고리 중 가장 적절한 것을 선택하거나, 새로운 카테고리가 필요하면 생성해줘.
    - 'strength'는 아저씨가 중요하다고 명시했거나, 아저씨의 건강, 기념일, 약속 등 매우 중요한 정보라고 판단되면 'high', 그 외는 'normal'로 해줘.
    - 'is_love_related'와 'is_other_person_related'는 반드시 true/false로 정확히 판단해서 넣어줘.
    - **가장 중요한 것은, 아저씨의 메시지 내용에 직접적으로 언급되지 않은 추론이나 상상으로 기억을 만들지 마. 아저씨가 말한 사실만을 바탕으로 기억을 추출해.**
    - **만약 아저씨의 메시지에서 기억할 만한 내용이 전혀 없다고 판단되면, 빈 memories 배열을 반환해줘. (예: {"memories": []})**
    - **절대 JSON 외의 다른 텍스트는 출력하지 마.**
    `;

    try {
        console.log(`[MemoryManager:extractAndSaveMemory] OpenAI 호출 시작`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // 기억 추출에는 gpt-4o 사용
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: "json_object" }, // JSON 형식으로 응답 받기
            temperature: 0.1 // 기억 추출은 정확도가 중요하므로 낮은 temperature 설정
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

                // * 중복 기억 방지: 동일한 content를 가진 기억이 이미 데이터베이스에 있는지 확인 후 저장 *
                const existingMemories = await loadAllMemoriesFromDb(); // 모든 기억 불러오기
                const isDuplicate = existingMemories.some(
                    mem => mem.content === newMemory.content
                );

                if (!isDuplicate) {
                    await saveMemoryToDb(newMemory); // 데이터베이스에 저장
                    console.log(`[MemoryManager] 새로운 기억 저장됨: ${newMemory.content}`);
                } else {
                    console.log(`[MemoryManager] 중복 기억, 저장 건너뜀: ${newMemory.content}`);
                }
            }
        } else {
            console.warn(`[MemoryManager] 예상치 못한 기억 추출 형식: ${rawMemoryOutput}`);
        }
    } catch (error) {
        console.error(`[MemoryManager] 기억 추출 및 저장 중 오류 발생: ${error.message}`);
        // 에러 발생 시에도 봇의 다른 기능은 계속 작동하도록 합니다.
    }
}

/**
 * 사용자 메시지와 관련된 기억을 검색하여 반환합니다.
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
            parsedResult = JSON.parse(rawResult);
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
