// 파일 경로: /scripts/migrate_love_history_v1.js
// 버전: v1.0
// 목적: love-history.json 파일을 PostgreSQL 테이블에 마이그레이션

const fs = require('fs');
const { Client } = require('pg');
const path = require('path');

// PostgreSQL 접속 설정 (아조씨 DB 기준)
const client = new Client({
  user: 'yejin',
  host: 'dpg-d1k1bnu3jp1c73eulvdg-a.oregon-postgres.render.com',
  database: 'mukudb',
  password: 'eobvDU6ZHl8mNqvimyLi5VNzHTRNOxu4',
  port: 5432,
  ssl: { rejectUnauthorized: false }, // Render용 SSL 설정
});

// 마이그레이션 실행 함수
async function migrateLoveHistory() {
  try {
    await client.connect();
    console.log('🟢 Connected to PostgreSQL');

    // 테이블 없으면 새로 생성
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_history (
        id SERIAL PRIMARY KEY,
        date TEXT,
        location TEXT,
        mood TEXT,
        episode TEXT,
        favorite TEXT
      );
    `);

    console.log('📦 Table [love_history] is ready');

    // love-history.json 파일 읽기
    const filePath = path.join(__dirname, '../memory/love-history.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    let inserted = 0;

    for (const item of data) {
      const { date, location, mood, episode, favorite } = item;

      // 중복 체크 (날짜 + 장소 기준)
      const check = await client.query(
        `SELECT * FROM love_history WHERE date = $1 AND location = $2`,
        [date, location]
      );

      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO love_history (date, location, mood, episode, favorite)
           VALUES ($1, $2, $3, $4, $5)`,
          [date, location, mood, episode, favorite]
        );
        inserted++;
      }
    }

    console.log(`✅ Migration completed: ${inserted} records inserted`);
  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await client.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}

migrateLoveHistory();
