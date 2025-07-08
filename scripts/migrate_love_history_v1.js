// ✅ 파일 경로: scripts/migrate_all_data_v1.js
// ✅ 버전: v1.0 - love_history, fixed_memories, fixed_messages 3개 테이블 마이그레이션 통합

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

async function migrateAllData() {
  try {
    await client.connect();
    console.log('🟢 Connected to PostgreSQL');

    // 1. LOVE_HISTORY
    await client.query(`
      CREATE TABLE IF NOT EXISTS love_history (
        id SERIAL PRIMARY KEY,
        content TEXT,
        timestamp TEXT,
        category TEXT
      );
    `);
    console.log('📦 Table [love_history] is ready');

    const loveCheck = await client.query('SELECT COUNT(*) FROM love_history');
    if (parseInt(loveCheck.rows[0].count, 10) === 0) {
      const loveData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/love_history.json'), 'utf8'));
      let loveInserted = 0;
      if (Array.isArray(loveData)) {
        for (const item of loveData) {
          const { content, timestamp, category } = item;
          if (content && timestamp) {
            await client.query(
              `INSERT INTO love_history (content, timestamp, category) VALUES ($1, $2, $3)`,
              [content, timestamp, category || null]
            );
            loveInserted++;
          }
        }
      } else if (loveData.categories) {
        for (const category of Object.keys(loveData.categories)) {
          for (const item of loveData.categories[category]) {
            const { content, timestamp } = item;
            if (content && timestamp) {
              await client.query(
                `INSERT INTO love_history (content, timestamp, category) VALUES ($1, $2, $3)`,
                [content, timestamp, category]
              );
              loveInserted++;
            }
          }
        }
      }
      console.log(`✅ [love_history] migration completed: ${loveInserted} records inserted`);
    } else {
      console.log('ℹ️ [love_history] already contains data. Skipped.');
    }

    // 2. FIXED_MEMORIES
    await client.query(`
      CREATE TABLE IF NOT EXISTS fixed_memories (
        id SERIAL PRIMARY KEY,
        type TEXT,
        source TEXT,
        content TEXT
      );
    `);
    console.log('📦 Table [fixed_memories] is ready');

    const fixedMemoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fixed_memories.json'), 'utf8'));
    for (const mem of fixedMemoriesData) {
      await client.query(
        `INSERT INTO fixed_memories (type, source, content) VALUES ($1, $2, $3)`,
        [mem.type, mem.source, mem.content]
      );
    }
    console.log(`✅ [fixed_memories] migration completed: ${fixedMemoriesData.length} records inserted`);

    // 3. FIXED_MESSAGES
    await client.query(`
      CREATE TABLE IF NOT EXISTS fixed_messages (
        id SERIAL PRIMARY KEY,
        speaker TEXT,
        message TEXT
      );
    `);
    console.log('📦 Table [fixed_messages] is ready');

    const fixedMessagesRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fixed_messages.json'), 'utf8'));
    let fixedMessages = [];
    for (const item of fixedMessagesRaw) {
      const speaker = Object.keys(item)[0];
      const message = item[speaker];
      if (speaker && message) {
        fixedMessages.push({ speaker, message });
      }
    }
    for (const msg of fixedMessages) {
      await client.query(
        `INSERT INTO fixed_messages (speaker, message) VALUES ($1, $2)`,
        [msg.speaker, msg.message]
      );
    }
    console.log(`✅ [fixed_messages] migration completed: ${fixedMessages.length} records inserted`);

  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await client.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}

migrateAllData();
