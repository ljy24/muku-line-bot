// src/memoryManager.js v1.17 - PostgreSQL 데이터베이스 연동 및 기억 처리 로직 강화 (초기 기억 마이그레이션 포함, 첫 대화 기억 기능 추가)
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
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 * 파일이 없거나 읽기 오류 발생 시 지정된 대체값(fallback)을 반환합니다.
 * @param {string} filePath - 읽을 파일의 경로
 * @param {string} [fallback=''] - 파일 읽기 실패 시 반환할 대체 문자열
 * @returns {string} 파일 내용 또는 대체 문자열
 */
function safeRead(filePath, fallback = '') {
    try {
        // 동기적으로 파일을 읽고 UTF-8 인코딩으로 반환
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        // 파일이 없거나 읽기 오류가 발생하면 fallback 값 반환
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

/**
 * 초기 기억 파일들을 데이터베이스에 마이그레이션합니다.
 * 서버 시작 시 한 번만 실행되며, 이미 기억이 존재하면 건너뜥니다.
 * @returns {Promise<void>}
 */
async function initializeFixedMemoriesToDb() {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 초기 기억을 저장할 수 없습니다.");
        return;
    }

    try {
        const { rowCount } = await pool.query('SELECT COUNT(*) FROM memories');
        if (rowCount > 0) {
            console.log('[MemoryManager] 데이터베이스에 이미 기억이 존재합니다. 초기 기억 마이그레이션을 건너뜁니다.');
            return;
        }

        console.log('[MemoryManager] 데이터베이스가 비어있습니다. 초기 기억 마이그레이션을 시작합니다.');

        // 1. fixedMemories.json 로드 및 저장
        const fixedMemoryPath = path.resolve(__dirname, '../memory/fixedMemories.json');
        const fixedMemoriesRaw = safeRead(fixedMemoryPath, '[]');
        const fixedMemories = JSON.parse(fixedMemoriesRaw);

        for (const content of fixedMemories) {
            // fixedMemories는 is_love_related, is_other_person_related 정보가 없으므로 기본값으로 처리
            // cleanReply를 적용하여 "사용자"를 "아저씨"로 변환
            await saveMemoryToDb({
                content: cleanReply(content),
                category: '고정기억',
                strength: 'high', // 고정 기억은 중요도 높음
                is_love_related: content.includes('아저씨') || content.includes('사랑') || content.includes('연애'),
                is_other_person_related: content.includes('무쿠 언니') || content.includes('준기오빠')
            });
        }
        console.log(`[MemoryManager] fixedMemories.json (${fixedMemories.length}개) 마이그레이션 완료.`);

        // 2. love-history.json 로드 및 저장
        const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
        const loveHistoryRaw = safeRead(loveHistoryPath, '{"categories":{}}');
        const loveHistoryData = JSON.parse(loveHistoryRaw);

        if (loveHistoryData.categories) {
            for (const category in loveHistoryData.categories) {
                if (Array.isArray(loveHistoryData.categories[category])) {
                    for (const item of loveHistoryData.categories[category]) {
                        // cleanReply를 적용하여 "사용자"를 "아저씨"로 변환
                        await saveMemoryToDb({
                            content: cleanReply(item.content),
                            category: category,
                            strength: item.strength || 'normal',
                            timestamp: item.timestamp,
                            is_love_related: true, // love-history는 모두 사랑 관련
                            is_other_person_related: false
                        });
                    }
                }
            }
        }
        console.log(`[MemoryManager] love-history.json 마이그레이션 완료.`);

        // 3. 1.txt, 2.txt, 3.txt (대화 로그) 파싱 및 저장
        const chatLogs = [];
        const logFiles = ['1.txt', '2.txt', '3.txt', 'fixed-messages.txt']; // fixed-messages.txt도 포함

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
                        continue; // 사진, 동영상, 파일 메시지는 건너뛰기
                    }

                    // 날짜와 시간을 합쳐 ISO 형식으로 변환 시도
                    let timestamp;
                    try {
                        // 2023.11.06 월요일 19:37 -> 2023-11-06T19:37:00+09:00 (일본 시간대)
                        timestamp = moment.tz(`${currentDate} ${time}`, 'YYYY.MM.DD dddd HH:mm', 'Asia/Tokyo').toISOString();
                    } catch (e) {
                        console.warn(`[MemoryManager] 날짜/시간 파싱 실패: ${currentDate} ${time} - ${e.message}`);
                        timestamp = new Date().toISOString(); // 실패 시 현재 시간 사용
                    }

                    // cleanReply를 적용하여 "사용자"를 "아저씨"로 변환
                    const cleanedMessage = cleanReply(message);

                    chatLogs.push({
                        content: cleanedMessage,
                        category: '대화로그',
                        strength: 'normal',
                        timestamp: timestamp,
                        is_love_related: true, // 모든 대화 로그는 사랑 관련으로 간주
                        is_other_person_related: false
                    });
                }
            }
        }

        // 대화 로그를 오래된 순서로 정렬하여 저장 (시간 순서 보존)
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


/**
 * 데이터베이스에 새로운 기억을 저장합니다. 중복된 내용은 저장하지 않습니다.
 * @param {Object} memory - 저장할 기억 객체 { content, category, strength, timestamp, is_love_related, is_other_person_related, reminder_time }
 * @returns {Promise<void>}
 */
async function saveMemoryToDb(memory) {
    if (!pool) {
        console.error("[MemoryManager] PostgreSQL 데이터베이스 풀이 초기화되지 않았습니다. 기억을 저장할 수 없습니다.");
        throw new Error("Database pool not initialized.");
    }
    try {
        // 중복 확인 쿼리를 저장 전에 실행 (content 기반)
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

/**
 * 사용자가 "기억해"라고 명시적으로 요청한 내용을 AI가 추출하여 저장합니다.
 * 이 기억은 'high' 강도를 가집니다.
 * @param {string} userMessage - 사용자가 기억을 요청한 원본 메시지
 * @param {string} extractedContent - AI가 추출한 실제 기억 내용
 * @param {string|null} reminderTime - AI가 추출한 리마인더 시간 (ISO string), 없으면 null
 * @returns {Promise<void>}
 */
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
            model: 'gpt-4o-mini', // 빠르고 저렴한 모델로 분류
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `아저씨 메시지: "${userMessage}"\n추출된 기억 내용: "${extractedContent}"` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // 분류 정확도를 높이기 위해 낮은 온도 설정
            max_tokens: 100
        });

        const classification = JSON.parse(response.choices[0].message.content);

        const cleanedContent = cleanReply(extractedContent.trim());

        const memory = {
            content: cleanedContent, // 클린된 내용 사용
            category: classification.category || '사용자 지정',
            strength: 'high', // 사용자가 명시적으로 기억 요청했으므로 중요도 높음
            timestamp: new Date().toISOString(),
            is_love_related: Boolean(classification.is_love_related),
            is_other_person_related: Boolean(classification.is_other_person_related),
            reminder_time: reminderTime // 리마인더 시간 저장
        };
        await saveMemoryToDb(memory);
        console.log(`[MemoryManager] 사용자 지정 기억 저장됨 (강도: high, 리마인더: ${reminderTime ? '있음' : '없음'}): ${memory.content}`);
    } catch (error) {
        console.error(`[MemoryManager] 사용자 지정 기억 저장 실패: ${error.message}`);
    }
}


/**
 * 특정 기억을 PostgreSQL 데이터베이스에서 삭제합니다.
 * @param {string} userQuery - 사용자가 기억 삭제를 요청한 원본 메시지 (예: "부산 출장 잊어버려")
 * @param {string} contentToIdentify - AI가 삭제할 기억이라고 판단한 핵심 내용 (예: "부산 출장")
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteRelevantMemories(userQuery, contentToIdentify) {
    if (!contentToIdentify || contentToIdentify.trim() === '') {
        console.warn('[MemoryManager] 삭제할 기억 내용이 비어있어 삭제하지 않습니다.');
        return false;
    }
    
    const contentToDelete = contentToIdentify.trim();

    try {
        const allMemories = await loadAllMemoriesFromDb(); // 모든 기억을 불러옵니다.

        if (allMemories.length === 0) {
            console.log('[MemoryManager] 저장된 기억이 없어 삭제할 기억을 찾을 수 없습니다.');
            return false;
        }

        // OpenAI를 활용하여 'contentToIdentify'가 어떤 기존 기억과 가장 유사한지 판단합니다.
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
                model: 'gpt-4o', // 정확한 기억 식별을 위해 gpt-4o 사용
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `아저씨가 잊어버리라고 요청한 내용: "${contentToIdentify}"\n가장 관련성 높은 기억의 ID와 내용을 JSON으로 반환해줘.` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1, // 정확한 매칭을 위해 낮은 온도 설정
                max_tokens: 100
            });

            const rawResult = response.choices[0].message.content;
            console.log(`[MemoryManager] OpenAI 삭제할 기억 식별 결과: ${rawResult}`);
            identifiedMemory = JSON.parse(rawResult);

            // OpenAI가 ID를 반환했다면 해당 ID로 삭제 시도
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
                // OpenAI가 ID를 반환하지 못했을 경우, contentToIdentify로 직접 삭제 시도 (부분 일치 가능성)
                const searchContent = cleanReply(contentToIdentify); // 삭제 요청 내용도 cleanReply 적용
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

/**
 * 특정 기억의 reminder_time을 업데이트합니다.
 * @param {number} id - 업데이트할 기억의 ID
 * @param {string|null} reminderTime - 새로운 리마인더 시간 (ISO string) 또는 null
 * @returns {Promise<boolean>} 업데이트 성공 여부
 */
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

/**
 * 사용자 메시지에서 기억을 추출하고 데이터베이스에 저장합니다.
 * 이 함수는 "기억해" 명령이 아닌 일반 대화에서 자동으로 기억을 추출할 때 사용됩니다.
 * @param {string} userMessage - 사용자 메시지
 * @returns {Promise<void>}
 */
async function extractAndSaveMemory(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        console.warn('[MemoryManager] 유효하지 않은 사용자 메시지');
        return;
    }

    // 아저씨가 포함된 메시지만 처리 (특정 호칭에 대한 필터링)
    if (!userMessage.includes('아저씨')) {
        return;
    }

    try {
        // getYejinSystemPrompt 함수를 사용하여 시스템 프롬프트 로드
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

        // content가 있고 빈 문자열이 아닐 때만 저장
        if (cleanedContent && result.category) { // cleanedContent로 조건 변경
            const memory = {
                content: cleanedContent, // 클린된 내용 사용
                category: result.category || '기타',
                strength: result.strength || 'normal',
                timestamp: result.timestamp || new Date().toISOString(), // AI가 timestamp를 제공하면 사용, 아니면 현재 시간
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

/**
 * 사용자 메시지와 관련된 기억을 검색하여 반환합니다.
 * @param {string} userQuery - 사용자 메시지 (기억을 검색할 쿼리)
 * @param {number} [limit=3] - 반환할 최대 기억 개수
 * @returns {Promise<Array<Object>>} 관련 기억 배열
 */
async function retrieveRelevantMemories(userQuery, limit = 3) {
    console.log(`[MemoryManager] 관련 기억 검색 시작: "${userQuery}"`);

    const allMemories = await loadAllMemoriesFromDb(); // 모든 기억을 DB에서 불러옵니다.

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
            parsedResult = JSON.parse(rawResult);
        } catch (parseError) {
            console.error(`[MemoryManager] 기억 검색 JSON 파싱 실패: ${parseError.message}, 원본: ${rawResult}`);
            return []; // 파싱 실패 시 빈 배열 반환
        }

        // memories 배열이 있는지 확인
        const memories = parsedResult.memories || [];
        
        if (Array.isArray(memories)) {
            // AI가 반환한 기억 배열에서 필요한 필드만 추출하고 정제합니다.
            const relevantMemories = memories.slice(0, limit).map(mem => ({
                content: mem.content, // 원본 content 사용 (cleanReply는 출력 시에만)
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
 * '코로나' 또는 '처음 대화'와 관련된 단어를 포함하는 가장 오래된 기억을 찾아주는 함수.
 * @returns {Promise<Object|null>} 가장 오래된 첫 대화 기억 객체 또는 null
 */
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
    loadLoveHistory, // 이제 DB에서 필터링하여 사랑 관련 기억만 반환
    loadOtherPeopleHistory, // 이제 DB에서 필터링하여 기타 인물 관련 기억만 반환
    loadAllMemoriesFromDb, // ✅ 추가: 모든 기억을 불러오는 함수
    extractAndSaveMemory, // ✅ 추가: 기억 추출 및 저장 함수 (일반 대화)
    saveUserSpecifiedMemory, // ✅ 추가: 사용자 지정 기억 저장 함수
    deleteRelevantMemories, // ✅ 추가: 관련 기억 삭제 함수
    updateMemoryReminderTime, // ✅ 추가: 리마인더 시간 업데이트 함수
    retrieveRelevantMemories,
    getFirstInteractionMemory, // ✅ 추가: 첫 대화 기억 검색 함수
    saveMemoryToDb, // 외부에서 직접 사용할 수 있도록 추가
    closeDatabaseConnection // 연결 종료 함수 추가
};
