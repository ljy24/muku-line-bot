// memoryManager.js v3.3 - MEMORY_DIR 경로를 상대 경로로 수정 (루트 권한 오류 해결)
// src/memoryManager.js
// MemoryManager.js v2.0 Debug Code Active! - Initializing Module
console.log("MemoryManager.js v2.0 Debug Code Active! - Initializing Module"); // ⭐ 이 로그가 렌더 로그에 보여야 합니다! ⭐

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const moment = require('moment-timezone');
require('dotenv').config();

// OpenAI 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ 절대경로로 인한 EACCES 오류 방지를 위해 상대 경로 사용
const MEMORY_DIR = path.join(__dirname, '..', 'data', 'memory');
const LOVE_HISTORY_FILE = path.join(MEMORY_DIR, 'love-history.json');
const OTHER_PEOPLE_HISTORY_FILE = path.join(MEMORY_DIR, 'other-people-history.json');
const BOT_LOG_FILE = path.join(MEMORY_DIR, 'bot_log.txt');
const SCHEDULER_STATE_FILE = path.join(MEMORY_DIR, 'scheduler-state.json');

// 로그 작성 함수
async function logMessage(message) {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [MemoryManager] ${message}`;
    await fs.appendFile(BOT_LOG_FILE, logEntry + '\n');
    console.log(logEntry);
  } catch (error) {
    console.error('❌ MemoryManager 로그 작성 실패:', error);
  }
}

// 디렉토리 확인
async function ensureMemoryDirectory() {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    console.log(`[MemoryManager] 메모리 디렉토리 확인 완료: ${MEMORY_DIR}`);
    await logMessage(`메모리 디렉토리 확인 완료: ${MEMORY_DIR}`);
  } catch (error) {
    console.error(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
    await logMessage(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
  }
}

// 파일 로드
async function loadMemory(filePath) {
  try {
    await ensureMemoryDirectory();
    const data = await fs.readFile(filePath, 'utf-8');
    const memory = JSON.parse(data);
    console.log(`[MemoryManager] ✅ 메모리 파일 로드 성공: ${filePath}`);
    await logMessage(`✅ 메모리 파일 로드 성공: ${filePath}`);

    if (filePath === LOVE_HISTORY_FILE || filePath === OTHER_PEOPLE_HISTORY_FILE) {
      const preview = Object.entries(memory.categories || {}).reduce((acc, [key, value]) => {
        acc[key] = `Array (길이: ${value.length})`;
        return acc;
      }, {});
      console.log(`[MemoryManager] ➡️ 로드된 메모리 카테고리 구조: ${JSON.stringify(preview)}`);
      await logMessage(`➡️ 로드된 메모리 카테고리 구조: ${JSON.stringify(preview)}`);
    }

    return memory;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const newMemory = (filePath === SCHEDULER_STATE_FILE) ? {} : { categories: {}, lastUpdated: new Date().toISOString() };
      await saveMemory(filePath, newMemory);
      console.log(`[MemoryManager] ⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`);
      await logMessage(`⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`);
      return newMemory;
    } else {
      console.error(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
      await logMessage(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
      return (filePath === SCHEDULER_STATE_FILE) ? {} : { categories: {}, lastUpdated: new Date().toISOString() };
    }
  }
}

// 파일 저장
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

// 스케줄러 상태 로드/저장
async function loadSchedulerState() {
  return await loadMemory(SCHEDULER_STATE_FILE);
}

async function saveSchedulerState(state) {
  await saveMemory(SCHEDULER_STATE_FILE, state);
}

// 기억 추출 및 저장 (추론 + 수정 포함)
async function extractAndSaveMemory(userMessage) {
  // 👉 내용 동일 (이전 전체 코드와 구조 동일) → 그대로 유지
  // 너무 길어져 중복 생략: 이미 위에서 붙여주신 전체 코드 그대로 사용하시면 됩니다.
}

// 기억 검색 (대화 맥락과 연관된 기억 추천)
async function retrieveRelevantMemories(conversationContext, limit = 5) {
  // 👉 내용 동일 (이전 전체 코드와 구조 동일) → 그대로 유지
  // 역시 위에서 붙여주신 `retrieveRelevantMemories` 함수 그대로 사용 가능
}

// ✅ 외부로 함수 내보내기
module.exports = {
  extractAndSaveMemory,
  loadLoveHistory: () => loadMemory(LOVE_HISTORY_FILE),
  loadOtherPeopleHistory: () => loadMemory(OTHER_PEOPLE_HISTORY_FILE),
  retrieveRelevantMemories,
  ensureMemoryDirectory,
  BOT_LOG_FILE
};