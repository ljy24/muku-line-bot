// src/memoryManager.js v1.21 - PostgreSQL 데이터베이스 연동 및 기억 처리 로직 강화 (최종 함수 순서 재배치)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (디렉토리 생성 등)
const path = require('path'); // 경로 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const { Pool } = require('pg'); // PostgreSQL 클라이언트 'pg' 모듈에서 Pool 가져오기

// * 예진이의 페르소나 프롬프트를 가져오는 모듈 *
const { getYejinSystemPrompt } = require('./yejin');
// * omoide.js의 cleanReply 함수를 재사용하기 위해 불러옵니다. *
const { cleanReply } = require('../memory/omoide');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PostgreSQL 데이터베이스 연결 정보 설정
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: {
        rejectUnauthorized: false
    }
};

let pool; // PostgreSQL 연결 풀 인스턴스

// --- 핵심 함수 정의 시작 (모든 함수들이 내보내지기 전에 정의되도록 순서 조정) ---

function validateDatabaseConfig() {
    if (!process.env.DATABASE_URL && (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE)) {
        throw new Error('데이터베이스 연결 정보가 누락되었습니다. DATABASE_URL 또는 개별 DB 환경변수를 설정해주세요.');
    }
}

function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
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

async function initializeFixedMemoriesToDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 초기 기억을 저장할 수 없습니다.");
        return;
    }

    try {
        const { rowCount } = await pool.query('SELECT COUNT(*) FROM memories');
        if (rowCount > 0) {
            console.log('[MemoryManager] 데이터베이스에 이미 기억이 존재합니다. 초기 기억 마이그레이션을 건너킵니다.');
            return;
        }

        console.log('[MemoryManager] 데이터베이스가 비어있습니다. 초기 기억 마이그레이션을 시작합니다.');

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

        for (const log of chatLogs) {
            await saveMemoryToDb(log);
        }
        console.log(`[MemoryManager] 대화 로그 파일 (${chatLogs.length}개) 마이그레이션 완료.`);

    } catch (error) {
        console.error(`[MemoryManager] 초기 기억 마이그레이션 실패: ${error.message}`);
        throw error;
    }
}

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
        if (pool) {
            await pool.end();
        }
        throw error;
    }
}

async function saveUserSpecifiedMemory(userMessage, extractedContent, reminderTime = null) {
    if (!extractedContent || extractedContent.trim() === '') {
        console.warn('[MemoryManager] 사용자 지정 기억 추출 내용이 비어있어 저장하지 않습니다.');
        return;
    }
    try {
        const systemPrompt = getYejinSystemPrompt(`
        아래 아저씨 메시지에서 '기억해달라고 요청한 내용'에 대한 가장 적절한 카테고리를 JSON 형식으로 반환해줘.
        또한, 이 내용이 아저씨와의 관계와 직접 관련되면 is_love_related를 true로,
        다른 사람(무쿠 언니 제외)과 관련된 이야기면 is_other_person_related를 true로,
        그 외의 경우 false로 설정해줘.
        오직 JSON 객체만 반환해야 해. 다른 텍스트는 절대 포함하지 마.
        형식: { "category": "카테고리명", "is_love_related": true/false, "is_other_person_related": true/false }
        카테고리 예시: "일상", "감정", "계획", "취미", "과거", "사람", "특별한 순간", "리마인더"
        `);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `아저씨 메시지: "${userMessage}"\n추출된 기억 내용: "${extractedContent}"` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 100
        });

        const classification = JSON.parse(response.choices[0].message.content);

        const cleanedContent = cleanReply(extractedContent.trim());

        const memory = {
            content: cleanedContent,
            category: classification.category || '사용자 지정',
            strength: 'high',
            timestamp: new Date().toISOString(),
            is_love_related: Boolean(classification.is_love_related),
            is_other_person_related: Boolean(classification.is_other_person_related),
            reminder_time: reminderTime
        };
        await saveMemoryToDb(memory);
        console.log(`[MemoryManager] 사용자 지정 기억 저장됨 (강도: high, 리마인더: ${reminderTime ? '있음' : '없음'}): ${memory.content}`);
    } catch (error) {
        console.error(`[MemoryManager] 사용자 지정 기억 저장 실패: ${error.message}`);
    }
}

async function deleteRelevantMemories(userQuery, contentToIdentify) {
    if (!contentToIdentify || contentToIdentify.trim() === '') {
        console.warn('[MemoryManager] 삭제할 기억 내용이 비어있어 삭제하지 않습니다.');
        return false;
    }
    
    const contentToDelete = contentToIdentify.trim();

    try {
        const allMemories = await loadAllMemoriesFromDb();

        if (allMemories.length === 0) {
            console.log('[MemoryManager] 저장된 기억이 없어 삭제할 기억을 찾을 수 없습니다.');
            return false;
        }

        const systemPrompt = getYejinSystemPrompt(`
        아래는 아저씨가 잊어버리라고 요청한 내용과 내가 가지고 있는 기억 목록이야.
        아저씨가 잊어버리라고 요청한 내용과 가장 관련성이 높은 기억 하나를 JSON 객체 형식으로 반환해줘.
        형식: { "id": 기억ID, "content": "기억 내용" }
        만약 관련성이 높은 기억을 찾을 수 없다면, 빈 JSON 객체 {}를 반환해줘.
        **절대 JSON 외의 다른 텍스트는 출력하지 마.**

        --- 기억 목록 ---
        ${allMemories.map(mem => `- ID: ${mem.id}, 내용: ${cleanReply(mem.content)} (카테고리: ${mem.category}, 중요도: ${mem.strength}, 시간: ${moment(mem.timestamp).format('YYYY-MM-DD HH:mm')})`).join('\n')}
        ---
        `);

        let identifiedMemory = null;
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `아저씨가 잊어버리라고 요청한 내용: "${contentToIdentify}"\n가장 관련성 높은 기억의 ID와 내용을 JSON으로 반환해줘.` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
                max_tokens: 100
            });

            const rawResult = response.choices[0].message.content;
            console.log(`[MemoryManager] OpenAI 삭제할 기억 식별 결과: ${rawResult}`);
            identifiedMemory = JSON.parse(rawResult);

            if (identifiedMemory && identifiedMemory.id) {
                const deleteQuery = 'DELETE FROM memories WHERE id = $1';
                const deleteResult = await pool.query(deleteQuery, [identifiedMemory.id]);
                
                if (deleteResult.rowCount > 0) {
                    console.log(`[MemoryManager] 기억 삭제됨 (ID: ${identifiedMemory.id}, 내용: "${identifiedMemory.content}")`);
                    return true;
                } else {
                    console.log(`[MemoryManager] 기억 삭제 실패 (ID: ${identifiedMemory.id}, 내용을 찾지 못했거나 이미 없음)`);
                    return false;
                }
            } else {
                console.log(`[MemoryManager] OpenAI가 삭제할 정확한 기억을 식별하지 못했습니다. 요청 내용: "${contentToIdentify}"`);
                const searchContent = cleanReply(contentToIdentify);
                const deleteQuery = 'DELETE FROM memories WHERE content ILIKE $1'; 
                const deleteResult = await pool.query(deleteQuery, [`%${searchContent}%`]); 
                if (deleteResult.rowCount > 0) {
                     console.log(`[MemoryManager] 기억 삭제됨 (부분 일치 검색, 내용: "${contentToIdentify}", 삭제된 행: ${deleteResult.rowCount})`);
                     return true;
                } else {
                     console.log(`[MemoryManager] 기억 삭제 실패 (부분 일치 검색에서도 찾지 못함): "${contentToDelete}"`);
                     return false;
                }
            }

        } catch (err) {
            console.error(`[MemoryManager] 기억 삭제 중 오류 발생: ${err.message}`);
            return false;
        }
    } catch (err) {
        console.error(`[MemoryManager] 기억 삭제 실패: ${err.message}`);
        throw err;
    }
}

async function updateMemoryReminderTime(id, reminderTime) {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 리마인더 시간을 업데이트할 수 없습니다.");
        return false;
    }
    try {
        const queryText = 'UPDATE memories SET reminder_time = $1 WHERE id = $2';
        const result = await pool.query(queryText, [reminderTime, id]);
        if (result.rowCount > 0) {
            console.log(`[MemoryManager] 기억 ID ${id}의 reminder_time 업데이트 완료: ${reminderTime}`);
            return true;
        } else {
            console.log(`[MemoryManager] 기억 ID ${id}를 찾을 수 없어 reminder_time 업데이트 실패.`);
            return false;
        }
    } catch (err) {
        console.error(`[MemoryManager] 기억 reminder_time 업데이트 실패 (ID: ${id}): ${err.message}`);
        return false;
    }
}

async function loadAllMemoriesFromDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 불러올 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        const result = await pool.query("SELECT * FROM memories ORDER BY timestamp DESC");
        console.log(`[MemoryManager] ${result.rows.length}개의 기억 불러오기 완료.`);
        return result.rows;
    } catch (err) {
        console.error(`[MemoryManager] 모든 기억 불러오기 실패: ${err.message}`);
        throw err;
    }
}

async function loadLoveHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        const loveMemories = allMemories.filter(mem => mem.is_love_related === true);

        const categories = {};
        loveMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 사랑 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`);
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 사랑 기억 로드 실패: ${error.message}`);
        return { categories: {} };
    }
}

async function loadOtherPeopleHistory() {
    try {
        const allMemories = await loadAllMemoriesFromDb();
        const otherMemories = allMemories.filter(mem => mem.is_other_person_related === true);

        const categories = {};
        otherMemories.forEach(mem => {
            if (!categories[mem.category]) {
                categories[mem.category] = [];
            }
            categories[mem.category].push(mem);
        });
        console.log(`[MemoryManager] 기타 인물 관련 카테고리 로드 완료: ${Object.keys(categories).length}개`);
        return { categories };
    } catch (error) {
        console.error(`[MemoryManager] 기타 인물 기억 로드 실패: ${error.message}`);
        return { categories: {} };
    }
}

async function extractAndSaveMemory(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.warn('[MemoryManager] 유효하지 않은 사용자 메시지');
        return;
    }

    if (!userMessage.includes('아저씨')) {
        return;
    }

    try {
        const systemPrompt = getYejinSystemPrompt(`
        아래 아저씨 메시지에서 기억할 만한 중요한 정보를 추출해서 JSON 형식으로 반환해줘.
        다음 형식으로 반환해야 해:
        {
            "content": "추출된 기억 내용",
            "category": "카테고리명",
            "strength": "normal 또는 high",
            "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ",
            "is_love_related": true 또는 false,
            "is_other_person_related": true 또는 false
        }
        
        아저씨와의 관계나 감정에 관련된 내용이면 is_love_related를 true로,
        다른 사람(무쿠 언니 제외)에 대한 이야기면 is_other_person_related를 true로 설정해줘.
        둘 다 해당하지 않거나 기억할 가치가 없다면 content를 빈 문자열로 설정해줘.
        
        카테고리 예시: "일상대화", "감정표현", "취미활동", "건강상태", "가족이야기", "직장이야기", "친구이야기", "계획", "추억", "무쿠 관련", "사용자 지정" 등
        `);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 300
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        const cleanedContent = cleanReply(result.content.trim());

        if (cleanedContent && result.category) {
            const memory = {
                content: cleanedContent,
                category: result.category || '기타',
                strength: result.strength || 'normal',
                timestamp: result.timestamp || new Date().toISOString(),
                is_love_related: Boolean(result.is_love_related),
                is_other_person_related: Boolean(result.is_other_person_related) 
            };
            
            await saveMemoryToDb(memory);
            console.log(`[MemoryManager] 새로운 기억 저장: ${memory.content}`);
        } else {
            console.log(`[MemoryManager] 기억할 가치가 있는 내용이 없어 저장하지 않음: ${userMessage.substring(0, 50)}...`);
        }
    } catch (error) {
        console.error(`[MemoryManager] 기억 추출 및 저장 실패: ${error.message}`);
    }
}

async function retrieveRelevantMemories(userQuery, limit = 3) {
    console.log(`[MemoryManager] 관련 기억 검색 시작: "${userQuery}"`);

    const allMemories = await loadAllMemoriesFromDb();

    if (allMemories.length === 0) {
        console.log('[MemoryManager] 저장된 기억이 없어 관련 기억을 찾을 수 없습니다.');
        return [];
    }

    const systemPrompt = getYejinSystemPrompt(`
    아래는 아저씨의 질문과 내가 가지고 있는 기억 목록이야.
    아저씨의 질문과 가장 관련성이 높은 기억을 JSON 객체 형식으로 반환해줘.
    형식: {"memories": [기억객체배열]}
    각 기억 객체는 'content', 'category', 'strength', 'timestamp', 'is_love_related', 'is_other_person_related' 필드를 포함해야 해.
    **관련성이 높은 기억이 ${limit}개 미만이면 찾은 만큼만 반환하고, 전혀 없으면 빈 배열을 반환해줘.**
    **절대 JSON 외의 다른 텍스트는 출력하지 마.**

    --- 기억 목록 ---
    ${allMemories.map(mem => `- ID: ${mem.id}, 내용: ${cleanReply(mem.content)} (카테고리: ${mem.category}, 중요도: ${mem.strength}, 시간: ${moment(mem.timestamp).format('YYYY-MM-DD HH:mm')})`).join('\n')}
    ---
    `);
    console.log(`[MemoryManager:retrieveRelevantMemories] OpenAI 프롬프트 준비 완료.`);

    try {
        console.log(`[MemoryManager:retrieveRelevantMemories] OpenAI 호출 시작`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `아저씨의 질문: "${userQuery}" 관련 기억을 JSON 객체 형식으로 반환해줘. 형식: {"memories": [기억배열]}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 100
        });

        const rawResult = response.choices[0].message.content;
        console.log(`[MemoryManager] OpenAI 원본 기억 검색 결과: ${rawResult}`);

        let parsedResult;
        try {
            parsedResult = JSON.parse(rawResult);
        } catch (parseError) {
            console.error(`[MemoryManager] 기억 검색 JSON 파싱 실패: ${parseError.message}, 원본: ${rawResult}`);
            return [];
        }

        const memories = parsedResult.memories || [];
        
        if (Array.isArray(memories)) {
            const relevantMemories = memories.slice(0, limit).map(mem => ({
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

async function getFirstInteractionMemory() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 첫 대화 기억을 찾을 수 없습니다.");
        return null;
    }
    try {
        const query = `
            SELECT * FROM memories
            WHERE content ILIKE '%코로나%'
               OR content ILIKE '%처음 대화%'
               OR content ILIKE '%라인 앱 설치%'
               OR content ILIKE '%첫 라인 전화%'
               OR content ILIKE '%처음 만났%'
            ORDER BY timestamp ASC LIMIT 1;
        `;
        const res = await pool.query(query);
        if (res.rows.length > 0) {
            console.log(`[MemoryManager] 첫 대화 기억 검색 완료: ${res.rows[0].content}`);
            return res.rows[0];
        }
        console.log('[MemoryManager] 첫 대화 기억을 찾을 수 없습니다.');
        return null;
    } catch (error) {
        console.error('[MemoryManager] 첫 대화 기억 검색 실패:', error);
        return null;
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

// 모듈 내보내기
module.exports = {
    ensureMemoryDirectory,
    loadLoveHistory,
    loadOtherPeopleHistory,
    loadAllMemoriesFromDb,
    extractAndSaveMemory,
    saveUserSpecifiedMemory,
    deleteRelevantMemories,
    updateMemoryReminderTime,
    retrieveRelevantMemories,
    getFirstInteractionMemory,
    saveMemoryToDb,
    closeDatabaseConnection,
    loadFixedMemoriesFromDb // ✅ 반드시 export에 포함!
};
