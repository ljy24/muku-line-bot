// src/memoryManager.js
const fs = require('fs').promises; // 비동기 파일 처리를 위해 fs.promises 사용
const path = require('path');
const OpenAI = require('openai'); // 메시지 분류를 위해 OpenAI 클라이언트 필요

require('dotenv').config(); // OPENAI_API_KEY를 사용하기 위해 필요

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ⭐ Render 디스크의 영구 저장소 경로를 사용합니다.
const MEMORY_DIR = '/data/memory'; 
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
        await logMessage(`메모리 디렉토리 확인 완료: ${MEMORY_DIR}`);
    } catch (error) {
        console.error(`❌ 메모리 디렉토리 생성 실패: ${error.message}`);
        await logMessage(`❌ 메모리 디렉토리 생성 실패: ${error.message}`);
    }
}

// --- JSON 메모리 로드 함수 (제네릭) ---
async function loadMemory(filePath) {
    try {
        await fs.access(filePath); // 파일 존재 여부 확인
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
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

// --- JSON 메모리 저장 함수 (제네릭) ---
async function saveMemory(filePath, data) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true }); // 디렉토리가 없으면 생성
        const tempPath = filePath + '.tmp'; // 임시 파일에 먼저 저장
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempPath, filePath); // 성공적으로 저장되면 원래 파일로 이름 변경
        await logMessage(`메모리 저장 완료: ${filePath}`);
    } catch (error) {
        console.error(`❌ ${filePath}에 메모리 저장 실패: ${error.message}`);
        await logMessage(`❌ ${filePath}에 메모리 저장 실패: ${error.message}`);
    }
}

// --- 아저씨 관련 기억 로드 ---
async function loadLoveHistory() {
    return await loadMemory(LOVE_HISTORY_FILE);
}

// --- 다른 사람 관련 기억 로드 ---
async function loadOtherPeopleHistory() {
    return await loadMemory(OTHER_PEOPLE_HISTORY_FILE);
}

// --- OpenAI를 사용하여 메시지 분류 및 기억 추출/저장 ---
async function extractAndSaveMemory(userMessage) {
    await logMessage(`메모리 추출 및 저장 시도: "${userMessage}"`);

    // OpenAI에 보낼 프롬프트: 분류와 정보 추출을 요청
    const classificationPrompt = `다음 사용자 메시지를 분석하여 'BELOVED_RELATED' (아저씨 관련) 또는 'OTHER_PEOPLE_RELATED' (다른 사람 관련) 중 하나로 분류하세요.
    메시지가 직접적으로 아저씨(나의 연인)의 선호도, 감정, 계획, 또는 '무쿠'와의 관계를 강화하는 정보를 포함한다면 'BELOVED_RELATED'로 분류하세요.
    메시지가 다른 사람(친구, 가족, 동료, 유명인 등)에 대한 정보를 포함한다면 'OTHER_PEOPLE_RELATED'로 분류하세요.
    만약 일반적인 대화 내용이거나 분류가 명확하지 않다면, 기본적으로 'BELOVED_RELATED'로 분류하세요.

    JSON 형식으로 출력하세요:
    {
      "classification": "BELOVED_RELATED" | "OTHER_PEOPLE_RELATED",
      "extracted_memories": [
        { "category": "카테고리명", "content": "추출된 사실 또는 세부 정보" },
        { "category": "다른카테고리명", "content": "다른 추출된 사실" }
      ]
    }

    예시 1 (BELOVED_RELATED):
    사용자: "오늘 회사에서 발표 망쳤어... 너무 속상해"
    출력:
    {
      "classification": "BELOVED_RELATED",
      "extracted_memories": [
        { "category": "아저씨 감정", "content": "회사 발표 망쳐서 속상함" }
      ]
    }

    예시 2 (OTHER_PEOPLE_RELATED):
    사용자: "친구 철수랑 이번 주말에 캠핑 갈 예정이야"
    출력:
    {
      "classification": "OTHER_PEOPLE_RELATED",
      "extracted_memories": [
        { "category": "친구 철수", "content": "이번 주말 캠핑 예정" }
      ]
    }

    예시 3 (BELOVED_RELATED):
    사용자: "나 다음주에 제주도로 여행 가려고 하는데, 무쿠는 어디 가고 싶어?"
    출력:
    {
      "classification": "BELOVED_RELATED",
      "extracted_memories": [
        { "category": "아저씨 계획", "content": "다음주 제주도 여행 계획" }
      ]
    }

    예시 4 (BELOVED_RELATED - 일반 대화는 기본적으로 아저씨 관련):
    사용자: "오늘 날씨 정말 좋다!"
    출력:
    {
      "classification": "BELOVED_RELATED",
      "extracted_memories": []
    }

    이제 다음 메시지를 분석하세요: "${userMessage}"
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // 분류 및 추출에 gpt-4o 사용
            messages: [
                { role: "system", content: classificationPrompt },
            ],
            max_tokens: 500,
            response_format: { type: "json_object" } // JSON 형식으로 응답 요청
        });

        const rawContent = response.choices[0].message.content;
        let parsedMemory;
        try {
            parsedMemory = JSON.parse(rawContent);
        } catch (parseError) {
            console.error(`❌ OpenAI 응답 JSON 파싱 실패: ${parseError.message}, 원본: ${rawContent}`);
            await logMessage(`❌ OpenAI 응답 JSON 파싱 실패: ${parseError.message}, 원본: ${rawContent}`);
            return; // 파싱 실패 시 함수 종료
        }

        const classification = parsedMemory.classification;
        const extractedMemories = parsedMemory.extracted_memories || [];

        let currentMemory;
        let filePathToSave;

        if (classification === 'BELOVED_RELATED') {
            filePathToSave = LOVE_HISTORY_FILE;
            currentMemory = await loadLoveHistory(); // 아저씨 기억 로드
            await logMessage(`'아저씨 관련'으로 분류됨.`);
        } else if (classification === 'OTHER_PEOPLE_RELATED') {
            filePathToSave = OTHER_PEOPLE_HISTORY_FILE;
            currentMemory = await loadOtherPeopleHistory(); // 다른 사람 기억 로드
            await logMessage(`'다른 사람 관련'으로 분류됨.`);
        } else {
            // 분류가 불분명하거나 예상치 못한 경우, 기본적으로 아저씨 관련으로 처리
            filePathToSave = LOVE_HISTORY_FILE;
            currentMemory = await loadLoveHistory();
            await logMessage(`분류 불분명(${classification}), 기본적으로 '아저씨 관련'으로 처리됨.`);
        }

        // 새로운 기억 추가 (중복 방지를 위해 내용 확인 후 추가)
        for (const mem of extractedMemories) {
            if (!currentMemory.categories[mem.category]) {
                currentMemory.categories[mem.category] = [];
            }
            // 같은 카테고리 내에서 동일한 content가 있는지 확인
            const existingContents = currentMemory.categories[mem.category].map(item => item.content);
            if (!existingContents.includes(mem.content)) {
                currentMemory.categories[mem.category].push({ content: mem.content, timestamp: new Date().toISOString() });
                await logMessage(`메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}' (${filePathToSave})`);
            } else {
                await logMessage(`이미 존재하는 메모리이므로 건너뜀: 카테고리='${mem.category}', 내용='${mem.content}'`);
            }
        }

        currentMemory.lastUpdated = new Date().toISOString();
        await saveMemory(filePathToSave, currentMemory); // 분류된 파일에 저장
        await logMessage(`"${userMessage}"에 대한 메모리 추출 및 저장 완료.`);

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
    ensureMemoryDirectory // 앱 시작 시 이 함수를 호출하여 디렉토리가 생성되도록 해야 합니다. (예: index.js에서)
};
