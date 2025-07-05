// ✅ /src/alterTable.js v1.0
// memories 테이블에 strength, source, created_at 컬럼 추가

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function alterTable() {
  try {
    await client.connect();
    console.log('✅ PostgreSQL 연결됨!');

    const queries = [
      `ALTER TABLE memories ADD COLUMN IF NOT EXISTS strength INT DEFAULT 1;`,
      `ALTER TABLE memories ALTER COLUMN strength DROP NOT NULL;`,
      `ALTER TABLE memories ADD COLUMN IF NOT EXISTS source TEXT;`,
      `ALTER TABLE memories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`
    ];

    for (const q of queries) {
      await client.query(q);
      console.log(`✅ 쿼리 실행됨: ${q}`);
    }

    await client.end();
    console.log('✅ 변경 완료 및 연결 종료!');
  } catch (err) {
    console.error('❌ 에러 발생:', err);
    await client.end();
  }
}

alterTable();
