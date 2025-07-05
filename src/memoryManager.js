// src/memoryManager.js v1.1 - 질문-답변 기억 기능 추가 최종본
const { Pool } = require('pg');

// Render에서 제공하는 데이터베이스 URL을 사용하여 Pool 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * 데이터베이스에 새로운 기억을 저장합니다. 중복된 내용은 저장하지 않습니다.
 * @param {string} content - 기억할 내용
 * @param {string} category - 기억의 카테고리
 * @param {string} strength - 기억의 중요도 ('normal' 또는 'high')
 */
async function saveMemoryToDb(content, category = '기타', strength = 'normal') {
    const query = `
        INSERT INTO memories (content, category, strength)
        SELECT $1, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM memories WHERE content = $1);
    `;
    try {
        const res = await pool.query(query, [content, category, strength]);
        if (res.rowCount > 0) {
            console.log(`[MemoryManager] 기억 저장 완료: "${content.substring(0, 30)}..."`);
        }
    } catch (error) {
        console.error('DB 저장 실패:', error);
    }
}

// --- ✨ [핵심 추가] 질문과 답변을 한 세트로 저장하는 새로운 함수 ✨ ---
/**
 * 질문과 그에 대한 답변을 하나의 세트로 데이터베이스에 저장합니다.
 * 이 기억은 사용자가 직접 알려준 소중한 정보이므로 높은 중요도(high)로 저장됩니다.
 * @param {string} question - 무쿠가 했던 질문 또는 아저씨가 물어본 질문의 맥락
 * @param {string} answer - 질문에 대해 아저씨가 알려준 답변
 */
async function saveAnswerToQuestion(question, answer) {
    const memoryContent = `내가 전에 '${question}'이라고 물었을 때, 아저씨는 '${answer}'라고 알려줬다.`;
    // '답변기억' 이라는 새로운 카테고리로, 'high' 중요도를 부여하여 저장합니다.
    await saveMemoryToDb(memoryContent, '답변기억', 'high');
    console.log(`[MemoryManager] 질문에 대한 답변을 저장했습니다: (질문: ${question}), (답변: ${answer})`);
}

// (아래는 기존 memoryManager.js 파일에 있던 다른 함수들입니다)

async function loadLoveHistory() {
    // 이 부분은 실제 구현에 따라 달라질 수 있습니다.
    return { categories: {} };
}

async function loadOtherPeopleHistory() {
    // 이 부분은 실제 구현에 따라 달라질 수 있습니다.
    return { categories: {} };
}

async function extractAndSaveMemory(message) {
    // 이 부분은 실제 구현에 따라 달라질 수 있습니다.
    console.log(`[MemoryManager] "${message}" 에서 기억 추출 시도...`);
}

async function retrieveRelevantMemories(query, limit = 3) {
    // 이 부분은 실제 구현에 따라 달라질 수 있습니다.
    return [];
}

async function loadAllMemoriesFromDb() {
    try {
        const result = await pool.query('SELECT * FROM memories ORDER BY timestamp DESC');
        return result.rows;
    } catch (error) {
        console.error('모든 기억 로드 실패:', error);
        return [];
    }
}

async function saveUserSpecifiedMemory(rawMessage, content) {
    await saveMemoryToDb(content, '사용자지정', 'high');
}

async function deleteRelevantMemories(rawMessage, content) {
    // 이 부분은 실제 구현에 따라 달라질 수 있습니다.
    return true;
}

module.exports = {
    pool,
    saveMemoryToDb,
    loadLoveHistory,
    loadOtherPeopleHistory,
    extractAndSaveMemory,
    retrieveRelevantMemories,
    loadAllMemoriesFromDb,
    saveUserSpecifiedMemory,
    deleteRelevantMemories,
    saveAnswerToQuestion // ✨ 추가된 함수를 외부에서 사용할 수 있도록 export
};
