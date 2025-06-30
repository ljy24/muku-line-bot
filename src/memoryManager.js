// memoryManager.js - 무쿠의 장기 기억 관리 모듈

const fs = require('fs'); // 파일 시스템 모듈
const path = require('path'); // 파일 경로 모듈
const moment = require('moment-timezone'); // 시간대 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API

require('dotenv').config(); // .env 파일 로드

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- **새로운 변경**: 기억 파일 저장 경로 설정 ---
// Render Persistent Disk의 마운트 경로(/data)를 기준으로 memory 폴더를 사용합니다.
// 로컬 테스트 환경에서는 현재 스크립트의 상위 memory 폴더를 사용합니다.
const MEMORY_BASE_PATH = process.env.RENDER_EXTERNAL_HOSTNAME ? '/data/memory' : path.resolve(__dirname, '../memory');
const LOVE_HISTORY_FILE = path.join(MEMORY_BASE_PATH, 'love-history.json');
const EXTRACTION_LOG_FILE = path.join(MEMORY_BASE_PATH, 'extraction-log.json');
const CURRENT_SUMMARY_FILE = path.join(MEMORY_BASE_PATH, 'current-summary.json'); // 요약 파일 경로도 통일

// --- **새로운 함수**: 기억 저장 디렉토리 보장 ---
// 파일 읽기/쓰기 전에 디렉토리가 존재하는지 확인하고 없으면 생성합니다.
async function ensureMemoryDirectory() {
    try {
        await fs.promises.mkdir(MEMORY_BASE_PATH, { recursive: true });
        console.log(`✅ Memory directory ensured at: ${MEMORY_BASE_PATH}`);
    } catch (error) {
        console.error(`❌ Failed to ensure memory directory at ${MEMORY_BASE_PATH}: ${error.message}`);
    }
}
// 모듈 로드 시점에 디렉토리 보장 함수를 호출합니다.
ensureMemoryDirectory();

/**
 * 파일을 안전하게 읽습니다. 파일이 없거나 읽을 수 없을 때 오류 대신 빈 문자열을 반환합니다.
 * @param {string} filePath 읽을 파일의 경로
 * @returns {string} 파일 내용 또는 빈 문자열
 */
function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error(`❌ safeRead 실패 (${filePath}): ${err.message}`);
    }
    return '';
}

/**
 * 객체를 JSON 형식으로 파일에 안전하게 씁니다.
 * @param {string} filePath 쓸 파일의 경로
 * @param {Object} data 파일에 쓸 데이터 객체
 */
async function safeWriteJson(filePath, data) {
    try {
        const tempPath = filePath + '.tmp'; // 임시 파일 경로
        await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, filePath); // 임시 파일을 원본 파일로 교체
    } catch (error) {
        console.error(`❌ safeWriteJson 실패 (${filePath}): ${error.message}`);
    }
}

/**
 * 기존 기억을 로드합니다. 파일이 없으면 기본 구조를 반환합니다.
 * @returns {Object} 로드된 기억 데이터
 */
function loadLoveHistory() {
    const defaultLoveHistory = {
        categories: {
            love_expressions: [],
            daily_care: [],
            general: [],
            user_submitted_memories: [],
            ai_personal_memories: {} // AI가 스스로 생성하는 개인적인 기억 (수동으로 채워짐)
        }
    };
    try {
        const rawData = safeRead(LOVE_HISTORY_FILE);
        if (rawData) {
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`❌ love-history.json 로드 실패 (파싱 오류): ${error.message}`);
    }
    return defaultLoveHistory;
}

/**
 * 주어진 메시지에서 무쿠에게 중요한 기억을 추출하고 저장합니다.
 * 이 함수는 비동기적으로 실행되며, 주 대화 흐름을 방해하지 않습니다.
 * @param {string} userMessage 사용자(아저씨)가 보낸 메시지
 */
async function extractAndSaveMemory(userMessage) {
    // ⚠️ 이 함수는 비동기적으로 실행되므로, 여기서 발생하는 오류가 LINE 메시지 응답을 막지 않도록
    // 내부적으로 오류를 처리하고 기록하는 데 집중해야 합니다.

    const model = 'gpt-4o'; // 기억 추출은 gpt-4o 사용 권장
    const loveHistory = loadLoveHistory(); // 기존 기억 로드

    const systemPrompt = `너는 무쿠야. 아저씨와 나는 깊은 연인 관계였고, 내가 아저씨에게 얼마나 소중한 사람이었는지 잘 알고 있어.
    너의 목표는 아저씨와의 대화에서 아저씨의 말 속에 담긴 중요하고 의미 있는 정보를 포착하여, 'love-history.json'이라는 파일에 장기 기억으로 저장하는 거야.
    특히 **아저씨와 나(무쿠)의 관계, 아저씨에 대한 나의 사랑 표현, 나의 일상, 중요한 사건, 사람(예: 꺵이), 장소, 과거의 일, 나의 감정 상태 변화 등 아저씨가 나에게 주는 모든 정보가 중요해.**
    
    새로운 정보가 주어지면, 다음 카테고리 중 가장 적절한 곳에 간결하게 요약해서 저장해줘.
    - **love_expressions**: 무쿠가 아저씨에게 얼마나 큰 사랑을 표현했는지 보여주는 문구 (예: "아저씨가 없으면 나는 너무 슬퍼", "아저씨를 정말 많이 사랑해")
    - **daily_care**: 무쿠가 아저씨의 일상을 얼마나 챙기고 걱정했는지 (예: "아저씨 밥 잘 챙겨먹었어?", "오늘 피곤했겠다, 일찍 자")
    - **general**: 위의 카테고리에 속하지 않는 모든 일반적인 중요한 사실 (사건, 날짜, 인물 정보, 나의 행동 등)
    - **user_submitted_memories**: 아저씨가 나에게 직접 알려주는, 내가 기억해야 할 중요하고 구체적인 정보 (예: "꺵이는 예진이 여자 후배이고, 조울증이 있었어. 예전에 너희 집에 자주 자러 왔었고, 몸에 리스크컷이 많았어.")
    
    이미 love-history.json 파일에 있는 정보는 다시 추출하지 마. 새로운 정보만을 포착해.
    각 카테고리에 맞게 항목을 만들고, 'timestamp'는 현재 도쿄 시간으로 'YYYY-MM-DDTHH:mm:ss+09:00' 형식으로 기록해.
    
    출력은 반드시 JSON 배열 형태로 해줘. 예를 들면:
    [{ "category": "general", "content": "아저씨가 헬스장 다니기 시작했어.", "timestamp": "2025-06-30T10:00:00+09:00" }]
    
    추출할 기억이 없으면 빈 배열 `[]`만 출력해.
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    try {
        const rawResponse = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: 500, // 충분한 토큰 할당
            response_format: { type: "json_object" } // JSON 형식으로 응답 요청
        });

        const content = rawResponse.choices[0]?.message?.content;
        let extractedMemories = [];
        try {
            // OpenAI가 전체 JSON 객체를 반환할 수 있으므로, 배열인지 객체인지 확인
            const parsedContent = JSON.parse(content);
            if (Array.isArray(parsedContent)) {
                extractedMemories = parsedContent;
            } else if (parsedContent && typeof parsedContent === 'object' && parsedContent.memories) {
                // OpenAI가 { "memories": [...] } 형태로 줄 수도 있음
                extractedMemories = parsedContent.memories;
            } else if (parsedContent && typeof parsedContent === 'object' && parsedContent.category) {
                // 단일 객체만 줄 수도 있음
                extractedMemories = [parsedContent];
            } else {
                 console.warn('⚠️ OpenAI가 예상치 못한 JSON 형식으로 응답했습니다:', parsedContent);
            }
        } catch (jsonError) {
            console.error(`❌ 추출된 기억 JSON 파싱 실패: ${jsonError.message}\nRaw content: ${content}`);
            return; // 파싱 실패 시 저장하지 않음
        }

        if (extractedMemories.length === 0) {
            console.log('✅ 메시지에서 추출된 새로운 기억이 없습니다.');
            return;
        }

        let updatedCategories = loveHistory.categories;
        const currentTimestamp = moment().tz('Asia/Tokyo').format(); // 현재 시간

        for (const mem of extractedMemories) {
            const category = mem.category;
            const contentToSave = mem.content;

            if (category && contentToSave) {
                // 추출된 내용이 이미 존재하는지 확인 (간단한 중복 확인)
                const exists = (updatedCategories[category] || []).some(
                    existingMem => existingMem.content === contentToSave
                );

                if (!exists) {
                    if (!updatedCategories[category]) {
                        updatedCategories[category] = [];
                    }
                    updatedCategories[category].push({
                        content: contentToSave,
                        timestamp: currentTimestamp // 추출된 시점의 타임스탬프
                    });
                    console.log(`✅ 메시지에서 특정 기억 추출 및 저장됨: - ${contentToSave}`);
                } else {
                    console.log(`✅ 기억이 이미 존재하여 건너뜀: ${contentToSave}`);
                }
            } else {
                 console.warn('⚠️ 유효하지 않은 추출된 기억 항목:', mem);
            }
        }
        
        await safeWriteJson(LOVE_HISTORY_FILE, loveHistory); // 수정된 경로 사용

        // 추출 로그 기록 (선택 사항)
        const logEntry = {
            userMessage: userMessage,
            extracted: extractedMemories,
            timestamp: currentTimestamp
        };
        const extractionLogs = JSON.parse(safeRead(EXTRACTION_LOG_FILE) || '[]');
        extractionLogs.push(logEntry);
        // 로그가 너무 길어지지 않도록 관리 (예: 최신 100개만 유지)
        if (extractionLogs.length > 100) {
            extractionLogs.slice(-100);
        }
        await safeWriteJson(EXTRACTION_LOG_FILE, extractionLogs); // 수정된 경로 사용

    } catch (error) {
        console.error(`❌ 기억 추출 및 저장 프로세스 실패: ${error.message}`);
    }
}

/**
 * 현재 기억 요약본을 생성하고 저장합니다.
 * (이 함수는 현재 자동 호출되지 않으며, 필요에 따라 수동으로 호출하거나 스케줄러에 추가해야 합니다.)
 */
async function generateAndSaveCurrentSummary() {
    const loveHistory = loadLoveHistory();
    const model = 'gpt-4o'; // 요약 생성 모델

    const systemPrompt = `너는 무쿠의 핵심 기억을 요약하는 도우미야.
    주어진 'love-history.json' 데이터를 바탕으로, 아저씨와 무쿠의 관계, 무쿠의 감정, 중요한 사건들을 간결하게 요약해줘.
    나중에 무쿠가 이 요약을 보고 아저씨와 대화할 때 참고할 수 있도록, 핵심 내용만 자연스러운 문장으로 정리해줘.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(loveHistory.categories, null, 2) } // 카테고리별 기억 전달
    ];

    try {
        const rawResponse = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: 500,
            temperature: 0.5
        });
        const summary = rawResponse.choices[0]?.message?.content;
        await safeWriteJson(CURRENT_SUMMARY_FILE, { summary: summary, timestamp: moment().tz('Asia/Tokyo').format() }); // 수정된 경로 사용
        console.log('✅ 현재 기억 요약본 생성 및 저장 완료.');
    } catch (error) {
        console.error(`❌ 기억 요약 생성 및 저장 실패: ${error.message}`);
    }
}

module.exports = {
    extractAndSaveMemory,
    loadLoveHistory,
    generateAndSaveCurrentSummary,
    ensureMemoryDirectory // 외부에서 호출할 수 있도록 내보냅니다.
};
