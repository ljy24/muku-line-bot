cat > migrate_memories.js << 'EOF'
const fs = require('fs').promises;
const path = require('path');
// memoryManager.js의 실제 경로가 src 폴더 안에 있다면 '..'을 빼고 './memoryManager'로 수정해야 할 수 있습니다.
const { saveMemoryToDb, pool } = require('./memoryManager'); 

const safeReadFile = async (filePath) => {
  try {
    // Render 셸의 현재 위치는 /opt/render/project/src 일 가능성이 높으므로,
    // 파일 경로를 현재 위치 기준으로 설정합니다.
    return await fs.readFile(path.resolve(__dirname, filePath), 'utf-8');
  } catch (err) {
    console.error(`'${filePath}' 파일 읽기 오류:`, err.message);
    return null;
  }
};

const migrateTxtFile = async (fileName, category) => {
  console.log(`'${fileName}' 파일 마이그레이션 시작...`);
  const content = await safeReadFile(fileName); // 경로 수정
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
    const content = await safeReadFile(fileName); // 경로 수정
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
  console.log('====== 무쿠봇 기억 마이
