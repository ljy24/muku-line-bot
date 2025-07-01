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
        const prompt = `다음 대화에서 '사랑/관계/아저씨' 관련 중요 기억과 '다른 사람(가족, 친구, 지인 등)/기타' 관련 중요 기억을 추출해 줘. 각 기억은 어떤 카테고리(예: '좋아하는 것', '싫어하는 것', '직업', '특징', '기타', '최근 사건', '관계 특징' 등)에 해당하는지 분류하고, 카테고리와 내용을 JSON 배열 형식으로만 응답해줘.

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

        const rawResponse = response.choices[0].message.content.trim();
        await logMessage(`OpenAI 메모리 추출 원본 응답: ${rawResponse}`); // 원본 응답 로그 추가

        let extractedMemories;
        try {
            extractedMemories = JSON.
