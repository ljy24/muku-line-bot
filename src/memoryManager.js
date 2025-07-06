cat > memory/migrate_memories.js << 'EOF'
const fs = require('fs').promises;
const path = require('path');
// memoryManager.js 파일이 한 단계 상위 폴더에 있으므로 경로를 '../'로 수정합니다.
const { saveMemoryToDb, pool } = require('../memoryManager');

const safeReadFile = async (filePath) => {
  try {
    // __dirname은 현재 스크립트 파일이 있는 폴더(memory)를 가리킵니다.
    // 따라서 memory 폴더 안에 있는 파일을 정확히 찾아줍니다.
    return await fs.readFile(path.resolve(__dirname, filePath), 'utf-8');
  } catch (err) {
    console.error(`'${filePath}' 파일 읽기 오류:`, err.message);
    return null;
  }
};

const migrateTxtFile = async (fileName, category) => {
  console.log(`'${fileName}' 파일 마이그레이션 시작...`);
  const content = await safeReadFile(fileName);
  if (!content) {
    console.log(`'${fileName}' 파일 내용이 없거나 파일을 읽을 수 없습니다.`);
    return;
  }

  const lines = content.split('\n').filter(line => line.trim() !== '');
  let count = 0;
  for (const line of lines) {
    await saveMemoryToDb(line, category);
    count++;
  }
  console.log(`'${fileName}' 파일에서 총 ${count}개의 기억을 '${category}' 카테고리로 저장했습니다.`);
};

const migrateJsonFile = async (fileName, baseCategory) => {
    console.log(`'${fileName}' 파일 마이그레이션 시작...`);
    const content = await safeReadFile(fileName);
    if (!content) {
        console.log(`'${fileName}' 파일 내용이 없거나 파일을 읽을 수 없습니다.`);
        return;
    }

    const data = JSON.parse(content);
    let count = 0;

    if (fileName.includes('fixedMemories')) {
        for (const memory of data) {
            await saveMemoryToDb(memory, baseCategory);
            count++;
        }
    } else if (fileName.includes('love-history')) {
        for (const category in data.categories) {
            for (const item of data.categories[category]) {
                if (item && typeof item === 'object' && item.content) {
                    await saveMemoryToDb(item.content, category);
                } else {
                    await saveMemoryToDb(item, category);
                }
                count++;
            }
        }
    }
    console.log(`'${fileName}' 파일에서 총 ${count}개의 기억을 저장했습니다.`);
};

const runMigration = async () => {
  console.log('====== 무쿠봇 기억 마이그레이션을 시작합니다. ======');
  try {
    // 이 파일들이 모두 memory 폴더 안에 있어야 합니다.
    await migrateTxtFile('1.txt', '대화기록');
    await migrateTxtFile('2.txt', '대화기록');
    await migrateTxtFile('3.txt', '대화기록');
    await migrateTxtFile('fixed-messages.txt', '고정메시지');
    await migrateJsonFile('fixedMemories.json', '고정기억');
    await migrateJsonFile('love-history.json', null);

    console.log('🎉🎉🎉 모든 기억의 데이터베이스 마이그레이션이 성공적으로 완료되었습니다! 🎉🎉🎉');

  } catch (error) {
    console.error('마이그레이션 중 심각한 오류가 발생했습니다:', error);
  } finally {
    await pool.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
};

runMigration();
EOF
