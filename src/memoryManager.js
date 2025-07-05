// src/memoryManager.js v1.2 - 질문-답변 기억 기능 추가 + DB 기반 기억 불러오기 완성
const { Pool } = require('pg');
const moment = require('moment-timezone');

// Render에서 제공하는 데이터베이스 URL을 사용하여 Pool 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * 데이터베이스에 새로운 기억을 저장합니다. 중복된 내용은 저장하지 않습니다.
 * @param {string} content - 기억할 내용
 * @param {string} category - 기억의 카테고리
 * @param {string} strength - 기억의 중요도 ('normal' 또는 'high')
 */
async function saveMemoryToDb(content, category = '기타', strength = 'normal') {
  const query = `
    INSERT INTO memories (content, category, strength, is_love_related, is_other_person_related)
    SELECT $1, $2, $3, true, false
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

// --- ✨ 질문과 답변 저장 함수 ✨ ---
async function saveAnswerToQuestion(question, answer) {
  const memoryContent = `내가 전에 '${question}'이라고 물었을 때, 아저씨는 '${answer}'라고 알려줬다.`;
  await saveMemoryToDb(memoryContent, '답변기억', 'high');
  console.log(`[MemoryManager] 질문에 대한 답변 저장: ${question} → ${answer}`);
}

// --- ✅ 아저씨와의 사랑 관련 기억 로드 ---
async function loadLoveHistory() {
  const result = { categories: {} };
  try {
    const query = `SELECT * FROM memories WHERE is_love_related = true ORDER BY timestamp DESC`;
    const res = await pool.query(query);
    res.rows.forEach(row => {
      const category = row.category || '기타';
      if (!result.categories[category]) result.categories[category] = [];
      result.categories[category].push({
        content: row.content,
        timestamp: row.timestamp,
        strength: row.strength || 'normal'
      });
    });
  } catch (error) {
    console.error('[loadLoveHistory] DB 로딩 실패:', error);
  }
  return result;
}

// --- ✅ 아저씨 외 인물에 대한 기억 로드 ---
async function loadOtherPeopleHistory() {
  const result = { categories: {} };
  try {
    const query = `SELECT * FROM memories WHERE is_other_person_related = true ORDER BY timestamp DESC`;
    const res = await pool.query(query);
    res.rows.forEach(row => {
      const category = row.category || '기타';
      if (!result.categories[category]) result.categories[category] = [];
      result.categories[category].push({
        content: row.content,
        timestamp: row.timestamp,
        strength: row.strength || 'normal'
      });
    });
  } catch (error) {
    console.error('[loadOtherPeopleHistory] DB 로딩 실패:', error);
  }
  return result;
}

// --- 🔎 관련 기억 검색 함수 (단순 유사도 매칭 기반) ---
async function retrieveRelevantMemories(queryText, limit = 3) {
  const relevant = [];
  try {
    const all = await pool.query('SELECT * FROM memories ORDER BY timestamp DESC');
    const candidates = all.rows.map(row => ({
      content: row.content,
      timestamp: row.timestamp,
      score: similarityScore(row.content, queryText)
    })).sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  } catch (error) {
    console.error('[retrieveRelevantMemories] 실패:', error);
    return [];
  }
}

// 간단한 유사도 스코어 계산 (공통 단어 수 기반)
function similarityScore(a, b) {
  const aw = a.split(/\s+/), bw = b.split(/\s+/);
  const common = aw.filter(word => bw.includes(word));
  return common.length / Math.max(aw.length, bw.length);
}

// --- 사용자 명령 기반 저장 ---
async function saveUserSpecifiedMemory(rawMessage, content) {
  await saveMemoryToDb(content, '사용자지정', 'high');
}

// --- 사용자 명령 기반 삭제 (임시 구현) ---
async function deleteRelevantMemories(rawMessage, content) {
  try {
    const res = await pool.query(`DELETE FROM memories WHERE content LIKE $1`, [`%${content}%`]);
    return res.rowCount > 0;
  } catch (e) {
    console.error('[deleteRelevantMemories] 삭제 실패:', e);
    return false;
  }
}

// --- 전체 기억 불러오기 ---
async function loadAllMemoriesFromDb() {
  try {
    const result = await pool.query('SELECT * FROM memories ORDER BY timestamp DESC');
    return result.rows;
  } catch (error) {
    console.error('모든 기억 로드 실패:', error);
    return [];
  }
}

module.exports = {
  pool,
  saveMemoryToDb,
  loadLoveHistory,
  loadOtherPeopleHistory,
  extractAndSaveMemory: async () => {},
  retrieveRelevantMemories,
  loadAllMemoriesFromDb,
  saveUserSpecifiedMemory,
  deleteRelevantMemories,
  saveAnswerToQuestion
};
