// ✅ 파일 경로: scripts/migrate_love_history_v1.js
// ✅ 버전: v1.6 - categories 구조 인식 + 마이그레이션 단독

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  user: 'yejin',
  host: 'dpg-d1k1bnu3jp1c73eulvdg-a.oregon-postgres.render.com',
  database: 'mukudb',
  password: 'eobvDU6ZHl8mNqvimyLi5VNzHTRNOxu4',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function migrateLoveHistory() {
  try {
    await client.connect();
    console.log('🟢 Connected to PostgreSQL');

    await client.query(`
      CREATE TABLE IF NOT EXISTS love_history (
        id SERIAL PRIMARY KEY,
        content TEXT,
        timestamp TEXT,
        category TEXT
      );
    `);
    console.log('📦 Table [love_history] is ready');

    const check = await client.query('SELECT COUNT(*) FROM love_history');
    const count = parseInt(check.rows[0].count, 10);
    if (count > 0) {
      console.log(`ℹ️ love_history 테이블에 이미 ${count}개의 데이터가 존재합니다. 마이그레이션을 건너뜁니다.`);
      return;
    }

    const filePath = path.join(__dirname, '../data/love_history.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    let inserted = 0;

    if (data.categories && typeof data.categories === 'object') {
      for (const category of Object.keys(data.categories)) {
        const items = data.categories[category];
        if (Array.isArray(items)) {
          for (const item of items) {
            const { content, timestamp } = item;
            if (content && timestamp) {
              await client.query(
                `INSERT INTO love_history (content, timestamp, category) VALUES ($1, $2, $3)`,
                [content, timestamp, category]
              );
              inserted++;
            }
          }
        }
      }
      console.log(`✅ Migration completed: ${inserted} records inserted`);
    } else {
      console.error("❌ JSON 구조에 'categories'가 없습니다.");
    }

  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await client.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}

migrateLoveHistory();
