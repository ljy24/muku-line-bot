// ✅ /src/initDatabase.js v1.0
// 메모리 파일들을 PostgreSQL DB로 옮기기 위한 초기화 스크립트
// 이 스크립트는 최초 1회 실행하면 됩니다.

const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');

// 📦 PostgreSQL 클라이언트 설정 (Render 환경변수 사용)
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function loadFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data.trim();
  } catch (err) {
    console.error(`❌ 파일 읽기 실패: ${filePath}`, err);
    return null;
  }
}

async function insertMemory(category, content, source = 'file') {
  try {
    await client.query(
      'INSERT INTO memories (category, content, source, created_at) VALUES ($1, $2, $3, NOW())',
      [category, content, source]
    );
  } catch (err) {
    console.error(`❌ 메모리 삽입 실패 (${category})`, err);
  }
}

async function init() {
  await client.connect();
  console.log('✅ PostgreSQL 연결됨!');

  const memoryFiles = [
    { file: '../memory/1.txt', category: 'text_1' },
    { file: '../memory/2.txt', category: 'text_2' },
    { file: '../memory/3.txt', category: 'text_3' },
    { file: '../memory/fixedMemories.json', category: 'fixed_json' },
    { file: '../memory/fixed-messages.txt', category: 'fixed_messages' },
    { file: '../memory/love-history.json', category: 'love_history' }
  ];

  for (const { file, category } of memoryFiles) {
    const data = await loadFile(path.resolve(__dirname, file));
    if (data) {
      await insertMemory(category, data);
      console.log(`✅ ${category} 메모리 DB에 저장 완료!`);
    }
  }

  await client.end();
  console.log('✅ PostgreSQL 연결 종료됨. 초기화 완료!');
}

init().catch(err => {
  console.error('❌ 전체 초기화 실패:', err);
  client.end();
});
