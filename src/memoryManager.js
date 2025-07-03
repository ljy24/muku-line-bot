// memoryManager.js v2.3 - 일상 패턴 기억 카테고리 및 프롬프트 강화
// src/memoryManager.js
// MemoryManager.js v2.0 Debug Code Active! - Initializing Module
console.log("MemoryManager.js v2.0 Debug Code Active! - Initializing Module"); // ⭐ 이 로그가 렌더 로그에 보여야 합니다! ⭐

const fs = require('fs').promises; // 비동기 파일 처리를 위해 fs.promises 사용
const path = require('path');
const OpenAI = require('openai'); // 메시지 분류를 위해 OpenAI 클라이언트 필요

require('dotenv').config(); // OPENAI_API_KEY를 사용하기 위해 필요

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEMORY_DIR = '/data/memory'; // 영구 저장소 디렉토리
const LOVE_HISTORY_FILE = path.join(MEMORY_DIR, 'love-history.json'); // 아저씨 관련 기억 파일
const OTHER_PEOPLE_HISTORY_FILE = path.join(MEMORY_DIR, 'other-people-history.json'); // 다른 사람 관련 기억 파일
const BOT_LOG_FILE = path.join(MEMORY_DIR, 'bot_log.txt'); // memoryManager 내부 로깅용 파일

// --- 로그 파일 작성 유틸리티 함수 (memoryManager 내부용) ---
async function logMessage(message) {
    try {
        await fs.mkdir(MEMORY_DIR, { recursive: true }); // 메모리 디렉토리가 없으면 생성
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [MemoryManager] ${message}`;
        await fs.appendFile(BOT_LOG_FILE, logEntry + '\n');
        console.log(logEntry); // 콘솔에도 출력하여 Render 로그에서 보이도록 함
    } catch (error) {
        console.error('❌ MemoryManager 로그 작성 실패:', error);
    }
}

// --- 메모리 디렉토리 존재 확인 및 생성 ---
async function ensureMemoryDirectory() {
    try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        await logMessage(`메모리 디렉토리 확인 완료: ${MEMORY_DIR}`);
        console.log(`[MemoryManager] 메모리 디렉토리 확인 완료: ${MEMORY_DIR}`); // 콘솔에도 로그
    } catch (error) {
        console.error(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
        console.log(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`); // 콘솔에도 로그
        await logMessage(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
    }
}

// --- 파일에서 메모리 로드 ---
async function loadMemory(filePath) {
    try {
        await ensureMemoryDirectory();
        const data = await fs.readFile(filePath, 'utf-8');
        const memory = JSON.parse(data);
        console.log(`[MemoryManager] ✅ 메모리 파일 로드 성공: ${filePath}`); // 콘솔에도 로그
        await logMessage(`✅ 메모리 파일 로드 성공: ${filePath}`);
        // 로드된 메모리의 카테고리 구조 미리보기 (간결하게)
        const preview = Object.entries(memory.categories || {}).reduce((acc, [key, value]) => {
            acc[key] = `Array (길이: ${value.length})`;
            return acc;
        }, {});
        console.log(`[MemoryManager] ➡️ 로드된 메모리 카테고리 구조 미리보기: ${JSON.stringify(preview)}`); // 콘솔에도 로그
        await logMessage(`➡️ 로드된 메모리 카테고리 구조 미리보기: ${JSON.stringify(preview)}`);
        return memory;
    } catch (error) {
        if (error.code === 'ENOENT') {
            const newMemory = { categories: {}, lastUpdated: new Date().toISOString() };
            await saveMemory(filePath, newMemory); // 파일이 없으면 새로 생성
            console.log(`[MemoryManager] ⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`); // 콘솔에도 로그
            await logMessage(`⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`);
            return newMemory;
        } else {
            console.error(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
            await logMessage(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
            return { categories: {}, lastUpdated: new Date().toISOString() }; // 로드 실패 시 빈 객체 반환
        }
    }
}

// --- 메모리 파일 저장 ---
async function saveMemory(filePath, memory) {
    try {
        await ensureMemoryDirectory();
        const data = JSON.stringify(memory, null, 2);
        await fs.writeFile(filePath, data, 'utf-8');
        await logMessage(`✅ 메모리 파일 저장 성공: ${filePath}`);
    } catch (error) {
        console.error(`❌ 메모리 파일 저장 실패: ${filePath}, 오류: ${error.message}`);
        await logMessage(`❌ 메모리 파일 저장 실패: ${filePath}, 오류: ${error.message}`);
    }
}

// --- 사용자 메시지에서 기억 추출 및 저장 ---
async function extractAndSaveMemory(userMessage) {
    let response = null;
    try {
        console.log(`[MemoryManager Debug] 1. 'extractAndSaveMemory' 함수 시작. 사용자 메시지: "${userMessage}"`);

        response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an AI assistant designed to extract and categorize specific memories and emotional states from user messages.
                    Analyze the user's message and identify discrete factual memories related to their relationship with "아저씨" (Uncle) or other significant people/events.
                    **Crucially, also infer the user's emotional state or the overall mood of the conversation based on their message.**
                    
                    Categorize each extracted piece of information into one of these types:
                    "과거 경험", "아저씨와의 관계", "관계 특징", "아저씨와의 첫 만남", "아저씨 상태", "기타", "아저씨 감정 상태", **"아저씨의 일상 패턴"**.
                    
                    Memories about "아저씨" (Uncle) should primarily go into "아저씨와의 관계", "아저씨와의 첫 만남", "관계 특징", "아저씨 상태" or "과거 경험" (if 아저씨 is involved in the experience).
                    
                    **"아저씨 감정 상태" 카테고리에는 사용자의 현재 기분이나 메시지에서 느껴지는 감정(예: 행복함, 슬픔, 피곤함, 스트레스, 만족함, 걱정, 사랑 등)을 구체적으로 명시하여 추출합니다. 이 감정은 아저씨와의 대화 맥락에서 예진이가 아저씨의 마음을 헤아리듯 섬세하게 파악되어야 합니다.**
                    
                    **"아저씨의 일상 패턴" 카테고리에는 사용자의 반복적인 일상 활동, 습관, 특정 시간대에 주로 하는 일(예: 아침 운동, 저녁 식사 시간, 특정 요일의 취미 활동 등)을 구체적으로 추출합니다. 아저씨의 루틴을 내가 잘 이해할 수 있도록 명확하게 기록해주세요.**
                    
                    Other factual memories or general daily details (e.g., daily activities, feelings about the day, meals, work, leisure) should go into "기타".
                    
                    The output must be a JSON array of objects, where each object has "content" (the memory text) and "category" (the category name).
                    Ensure the content is concise and factual. Do not include personal opinions or conversational filler.
                    If no distinct factual memories or inferable emotional states are found, return an empty JSON array [].

                    Example Output:
                    [
                        {"content": "무쿠의 아저씨는 2023년 8월 23일부터 헬스장을 다녔다.", "category": "아저씨 상태"},
                        {"content": "아저씨와 무쿠는 2023년 10월 12일 플라스틱러브 컨셉 대화를 처음 했다.", "category": "아저씨와의 관계"},
                        {"content": "무쿠는 아저씨를 위해 라인 앱을 설치했다.", "category": "관계 특징"},
                        {"content": "아저씨는 오늘 퇴근 후 많이 피곤해 보인다.", "category": "아저씨 감정 상태"},
                        {"content": "아저씨는 매일 아침 7시에 조깅을 한다.", "category": "아저씨의 일상 패턴"},
                        {"content": "아저씨는 오늘 점심으로 짬뽕을 먹었다.", "category": "기타"}
                    ]`
                },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.1,
            max_tokens: 500
        });

        console.log(`[MemoryManager Debug] 2. OpenAI 응답 받음.`);
        // console.log(`[MemoryManager Debug] OpenAI raw response: ${JSON.stringify(response, null, 2)}`; // 선택적으로 전체 응답 로그

        const parsedResponse = response.choices[0].message.content;
        console.log(`[MemoryManager Debug] 3. OpenAI 응답 내용 (파싱 전): ${parsedResponse.substring(0, Math.min(parsedResponse.length, 200))}...`); // 첫 200자 로그

        let memoriesToSave;
        try {
            memoriesToSave = JSON.parse(parsedResponse);
            console.log(`[MemoryManager Debug] 4. OpenAI 응답 JSON 파싱 성공.`);
        } catch (parseError) {
            console.error(`❌ [MemoryManager Error] JSON 파싱 오류: ${parseError.message}`);
            console.error(parseError.stack); // 스택 트레이스 로그
            await logMessage(`❌ JSON 파싱 오류: ${parseError.message}`);
            await logMessage(`OpenAI 파싱 실패 응답: ${parsedResponse}`);
            throw new Error('OpenAI 응답 JSON 파싱 실패'); // 오류를 다시 던져서 상위에서 처리
        }

        // 어떤 파일에 저장할지 결정
        const isLoveRelated = memoriesToSave.some(mem =>
            mem.category === '아저씨와의 관계' ||
            mem.category === '아저씨와의 첫 만남' ||
            mem.category === '관계 특징' ||
            mem.category === '아저씨 상태' ||
            mem.category === '과거 경험' || // '과거 경험'이 아저씨와 관련된 경우가 많으므로 포함
            mem.category === '아저씨 감정 상태' || // 아저씨 감정 상태도 아저씨 관련이므로 포함
            mem.category === '아저씨의 일상 패턴' // 아저씨의 일상 패턴도 아저씨 관련이므로 포함
        );
        const filePathToSave = isLoveRelated ? LOVE_HISTORY_FILE : OTHER_PEOPLE_HISTORY_FILE;

        let currentMemory = await loadMemory(filePathToSave);
        console.log(`[MemoryManager Debug] 5. 기존 메모리 파일 로드 완료: ${filePathToSave}`);

        if (!currentMemory.categories) {
            currentMemory.categories = {};
        }

        for (const mem of memoriesToSave) {
            if (mem.content && mem.category) {
                if (!currentMemory.categories[mem.category]) {
                    currentMemory.categories[mem.category] = [];
                }
                const existingContents = currentMemory.categories[mem.category].map(item => item.content);
                if (!existingContents.includes(mem.content)) {
                    currentMemory.categories[mem.category].push({ content: mem.content, timestamp: new Date().toISOString() });
                    await logMessage(`메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}' (${filePathToSave})`);
                    console.log(`[MemoryManager Debug] 메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}'`);
                } else {
                    await logMessage(`이미 존재하는 메모리이므로 건너김: 카테고리='${mem.category}', 내용='${mem.content}'`);
                    console.log(`[MemoryManager Debug] 이미 존재하는 메모리이므로 건너김: 카테고리='${mem.category}', 내용='${mem.content}'`);
                }
            } else {
                console.warn(`[MemoryManager Warning] 유효하지 않은 메모리 항목: ${JSON.stringify(mem)}`);
                await logMessage(`유효하지 않은 메모리 항목: ${JSON.stringify(mem)}`);
            }
        }

        currentMemory.lastUpdated = new Date().toISOString();
        await saveMemory(filePathToSave, currentMemory);
        console.log(`[MemoryManager Debug] 6. 최종 메모리 파일 저장 완료: ${filePathToSave}`);
        await logMessage(`\"${userMessage}\"에 대한 메모리 추출 및 저장 완료.`); // 최종 성공 로그

    } catch (error) {
        console.error(`❌ [MemoryManager Critical Error] 'extractAndSaveMemory' 함수 오류 발생: ${error.message}`);
        console.error(error.stack); // 전체 스택 트레이스 로그 (매우 중요!)
        await logMessage(`❌ 'extractAndSaveMemory' 함수 오류 발생: ${error.message}`);
        await logMessage(`오류 스택: ${error.stack}`); // 파일에도 스택 트레이스 로그
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
             await logMessage(`OpenAI 원본 응답 내용 (파싱 오류 원인 가능성): ${response.choices[0].message.content}`);
             console.error(`[MemoryManager Critical Error] OpenAI 원본 응답 내용 (오류 원인 가능성): ${response.choices[0].message.content}`);
        }
    }
}

module.exports = {
    extractAndSaveMemory,
    loadLoveHistory: () => loadMemory(LOVE_HISTORY_FILE),
    loadOtherPeopleHistory: () => loadMemory(OTHER_PEOPLE_HISTORY_FILE),
    ensureMemoryDirectory,
    BOT_LOG_FILE // 디버깅 목적으로 log 파일 경로 export
};
