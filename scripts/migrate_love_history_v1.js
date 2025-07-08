// 파일 경로: /scripts/migrate_love_history_v1.js
// 버전: v1.1
// 수정 내용: love-history.json 위치를 data 폴더로 맞춤

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// PostgreSQL 접속 설정
const client = new Client({
  user: 'yejin',
  host: 'dpg-d1k1bnu3jp1c73eulvdg-a.oregon-postgres.render.com',
  database: 'mukudb',
  password: 'eobvDU6ZHl8mNqvimyLi5VNzHTRNOxu4',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// 마이그레이션 함수
async function migrateLoveHistory() {
  try {
    await client.connect();
    console.log('🟢 Connected to PostgreSQL');

    // 테이블 생성 (없으면)
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_history (
        id SERIAL PRIMARY KEY,
        content TEXT,
        timestamp TEXT,
        category TEXT
      );
    `);
    console.log('📦 Table [love_history] is ready');

    // 테이블 비어있는지 확인
    const check = await client.query('SELECT COUNT(*) FROM love_history');
    const count = parseInt(check.rows[0].count, 10);

    if (count > 0) {
      console.log(`ℹ️ love_history 테이블에 이미 ${count}개의 데이터가 존재합니다. 마이그레이션을 건너뜁니다.`);
      return;
    }

    // ✅ 수정된 파일 경로: data/love_history.json
    const filePath = path.join(__dirname, '../data/love_history.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(rawData);

    let inserted = 0;

    // 카테고리별로 반복
    for (const category in json.categories) {
      const items = json.categories[category];
      if (Array.isArray(items)) {
        for (const item of items) {
          const { content, timestamp } = item;
          await client.query(
            `INSERT INTO love_history (content, timestamp, category) VALUES ($1, $2, $3)`,
            [content, timestamp, category]
          );
          inserted++;
        }
      }
    }

    console.log(`✅ Migration completed: ${inserted} records inserted`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}

migrateLoveHistory();
