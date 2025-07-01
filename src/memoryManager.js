// src/memoryManager.js
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
        await fs.appendFile(BOT_LOG_FILE, `[${timestamp}] [MemoryManager] ${message}\n`);
    } catch (error) {
        console.error('❌ MemoryManager 로그 작성 실패:', error);
    }
}

// --- 메모리 디렉토리 존재 확인 및 생성 ---
async function ensureMemoryDirectory() {
    try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        await logMessage(`메모리 디렉토리 확인 및 생성 완료: ${MEMORY_DIR}`);
    } catch (error) {
        console.error(`❌ 메모리 디렉토리 생성 실패: ${error.message}`);
        await logMessage(`❌ 메모리 디렉토리 생성 실패: ${error.message}`);
    }
}

// --- 메모리 로드 함수 (제네릭) ---
async function loadMemory(filePath) {
    try {
        await fs.access(filePath); // 파일 존재 여부 확인
        const data = await fs.readFile(filePath, 'utf-8');
        const parsedData = JSON.parse(data);
        await logMessage(`✅ 메모리 파일 로드 성공: ${filePath}`);
        // ⭐ 추가: 로드된 데이터의 주요 구조를 로그에 기록 ⭐
        if (parsedData && parsedData.categories) {
            const categoriesPreview = {};
            for (const category in parsedData.categories) {
                if (Array.isArray(parsedData.categories[category])) {
                    categoriesPreview[category] = `Array (길이: ${parsedData.categories[category].length})`;
                } else {
                    categoriesPreview[category] = `Not Array (타입: ${typeof parsedData.categories[category]})`;
                }
            }
            await logMessage(`➡️ 로드된 메모리 카테고리 구조 미리보기: ${JSON.stringify(categoriesPreview)}`);
        }
        return parsedData;
    } catch (error) {
        if (error.code === 'ENOENT') {
            await logMessage(`메모리 파일(${filePath})을 찾을 수 없음, 빈 구조로 초기화.`);
            // 파일이 없을 경우 초기 구조 반환 (categories는 빈 객체)
            return { categories: {}, lastUpdated: new Date().toISOString() };
        }
        console.error(`❌ ${filePath}에서 메모리 로드 실패: ${error.message}`);
        await logMessage(`❌ ${filePath}에서 메모리 로드 실패: ${error.message}`);
        return { categories: {}, lastUpdated: new Date().toISOString() }; // 오류 시에도 빈 구조 반환
    }
}

async function loadLoveHistory() {
    return loadMemory(LOVE_HISTORY_FILE);
}

async function loadOtherPeopleHistory() {
    return loadMemory(OTHER_PEOPLE_HISTORY_FILE);
}

// --- 메모리 저장 함수 (제네릭) ---
async function saveMemory(filePath, data) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true }); // 메모리 디렉토리가 없을 경우 생성
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        await logMessage(`✅ 메모리 파일 저장됨: ${filePath}`);
        // ⭐ 추가: 저장된 데이터의 주요 구조를 로그에 기록 ⭐
        if (data && data.categories) {
            const categoriesPreview = {};
            for (const category in data.categories) {
                if (Array.isArray(data.categories[category])) {
                    categoriesPreview[category] = `Array (길이: ${data.categories[category].length})`;
                } else {
                    categoriesPreview[category] = `Not Array (타입: ${typeof data.categories[category]})`;
                }
            }
            await logMessage(`➡️ 저장된 메모리 카테고리 구조 미리보기: ${JSON.stringify(categoriesPreview)}`);
        }
    } catch (error) {
        console.error(`❌ 메모리 파일 저장 실패 (${filePath}): ${error.message}`);
        await logMessage(`❌ 메모리 파일 저장 실패 (${filePath}): ${error.message}`);
    }
}

// --- 메시지에서 기억 추출 및 분류 후 저장 ---
async function extractAndSaveMemory(userMessage) {
    await logMessage(`\"${userMessage}\"에 대한 메모리 추출 시작.`);

    // 메모리 파일 로드 (사랑/아저씨 관련과 다른 사람 관련)
    let loveHistory = await loadLoveHistory();
    let otherPeopleHistory = await loadOtherPeopleHistory();

    try {
        const prompt = `다음 대화에서 '사랑/관계/아저씨' 관련 중요 기억과 '다른 사람(가족, 친구, 지인 등)/기타' 관련 중요 기억을 추출해 줘.
        만약 '아저씨'와 '다른 사람'이 함께 언급된 기억이라면, 그 기억의 주된 초점이 '다른 사람'에게 있다면 '다른 사람' 관련 기억으로 분류해줘.
        각 기억은 어떤 카테고리(예: '좋아하는 것', '싫어하는 것', '직업', '특징', '기타', '최근 사건', '관계 특징', '가족', '친구')에 해당하는지 분류하고, 카테고리와 내용을 JSON 배열 형식으로만 응답해줘.

        예시 응답:
        [
          { "category": "좋아하는 것", "content": "매운 음식" },
          { "category": "직업", "content": "소프트웨어 엔지니어" }
        ]

        --- 대화 내용 ---
        아저씨: ${userMessage}
        ---

        응답 (JSON 배열):`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
        });

        let rawResponse = response.choices[0].message.content.trim();
        await logMessage(`OpenAI 메모리 추출 원본 응답: ${rawResponse}`); // 원본 응답 로그 추가

        // ⭐ 추가: 마크다운 코드 블록 제거 ⭐
        if (rawResponse.startsWith('```json') && rawResponse.endsWith('```')) {
            rawResponse = rawResponse.substring(7, rawResponse.length - 3).trim();
            await logMessage(`마크다운 제거 후 응답: ${rawResponse}`);
        }

        let extractedMemories;
        try {
            extractedMemories = JSON.parse(rawResponse);
            if (!Array.isArray(extractedMemories)) { // 배열인지 다시 확인
                throw new Error("OpenAI 응답이 JSON 배열 형식이 아닙니다.");
            }
        } catch (parseError) {
            console.error(`❌ OpenAI 응답 파싱 실패: ${parseError.message}, 원본: ${rawResponse}`);
            await logMessage(`❌ OpenAI 응답 파싱 실패: ${parseError.message}, 원본: ${rawResponse}`);
            // 파싱 실패 시 빈 배열로 처리하여 다음 로직 진행
            extractedMemories = [];
        }

        if (extractedMemories.length === 0) {
            await logMessage(`추출된 메모리가 없습니다. 메시지: \"${userMessage}\"`);
            return; // 추출된 메모리가 없으면 종료
        }

        // 분류된 기억을 각 파일에 저장
        for (const mem of extractedMemories) {
            // OpenAI가 분류한 카테고리를 기반으로 저장할 히스토리 결정
            const targetHistory = mem.category.includes('아저씨') || mem.category.includes('관계') || mem.category.includes('사랑')
                ? loveHistory
                : otherPeopleHistory;
            const filePathToSave = targetHistory === loveHistory ? LOVE_HISTORY_FILE : OTHER_PEOPLE_HISTORY_FILE;

            // 새로운 기억 추가 (중복 방지를 위해 내용 확인 후 추가)
            if (!targetHistory.categories[mem.category]) {
                targetHistory.categories[mem.category] = []; // <--- 이 라인이 배열로 초기화합니다.
            }

            // 같은 카테고리 내에서 동일한 content가 있는지 확인
            // map 호출 전에 배열인지 다시 한번 확인 (방어적 코드)
            const existingContents = Array.isArray(targetHistory.categories[mem.category])
                ? targetHistory.categories[mem.category].map(item => item.content)
                : []; // 배열이 아니면 빈 배열로 처리하여 오류 방지

            if (!existingContents.includes(mem.content)) {
                targetHistory.categories[mem.category].push({ content: mem.content, timestamp: new Date().toISOString() });
                await logMessage(`메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}' (${filePathToSave})`);
            } else {
                await logMessage(`이미 존재하는 메모리이므로 건너뜀: 카테고리='${mem.category}', 내용='${mem.content}'`);
            }
        }

        // 변경된 각 히스토리 객체를 파일에 저장
        await saveMemory(LOVE_HISTORY_FILE, loveHistory);
        await saveMemory(OTHER_PEOPLE_HISTORY_FILE, otherPeopleHistory);

        await logMessage(`\"${userMessage}\"에 대한 메모리 추출 및 저장 완료.`);

    } catch (error) {
        console.error(`❌ extractAndSaveMemory 오류 발생: ${error.message}`);
        await logMessage(`❌ extractAndSaveMemory 오류 발생: ${error.message}`);
        // 응답 내용이 있다면 디버깅을 위해 로그
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
             await logMessage(`OpenAI 원본 응답 내용 (파싱 오류 원인 가능성): ${response.choices[0].message.content}`);
        }
    }
}

module.exports = {
    extractAndSaveMemory,
    loadLoveHistory,
    loadOtherPeopleHistory,
    ensureMemoryDirectory // 시작 시 디렉토리 존재 확인용
};
