// migrate_memories.js

const fs = require('fs').promises;
const path = require('path');
const { saveMemoryToDb, pool } = require('./memoryManager'); // memoryManager.js 경로를 확인해주세요.

// 파일 내용을 안전하게 읽는 함수 (비동기 방식)
const safeReadFile = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`'${filePath}' 파일 읽기 오류:`, err.message);
    return null;
  }
};

// 텍스트 파일을 줄 단위로 나누어 DB에 저장하는 함수
const migrateTxtFile = async (fileName, category) => {
  console.log(`'${fileName}' 파일 마이그레이션 시작...`);
  const content = await safeReadFile(path.resolve(__dirname, fileName));
  if (!content) {
    console.log(`'${fileName}' 파일 내용이 없거나 파일을 읽을 수 없습니다.`);
    return;
  }

  // 긴 대화 내용은 의미 있는 단위(예: 한 사람이 말을 마치는 단위)로 묶어 저장하면 좋지만,
  // 우선은 줄 단위로 저장하여 모든 기록을 보존합니다.
  const lines = content.split('\n').filter(line => line.trim() !== '');
  let count = 0;
  for (const line of lines) {
    // 타임스탬프나 화자 정보 등을 분리하여 저장할 수도 있지만, 우선은 내용 전체를 저장합니다.
    await saveMemoryToDb(line, category);
    count++;
  }
  console.log(`'${fileName}' 파일에서 총 ${count}개의 기억을 '${category}' 카테고리로 저장했습니다.`);
};

// JSON 파일을 읽어 DB에 저장하는 함수
const migrateJsonFile = async (fileName, baseCategory) => {
    console.log(`'${fileName}' 파일 마이그레이션 시작...`);
    const content = await safeReadFile(path.resolve(__dirname, fileName));
    if (!content) {
        console.log(`'${fileName}' 파일 내용이 없거나 파일을 읽을 수 없습니다.`);
        return;
    }

    const data = JSON.parse(content);
    let count = 0;

    if (fileName.includes('fixedMemories')) {
        // fixedMemories.json 처리: 배열의 각 문자열을 저장
        for (const memory of data) {
            await saveMemoryToDb(memory, baseCategory);
            count++;
        }
    } else if (fileName.includes('love-history')) {
        // love-history.json 처리: 카테고리별로 저장
        for (const category in data.categories) {
            for (const item of data.categories[category]) {
                // item이 content 속성을 가진 객체 형태일 경우
                if (item && typeof item === 'object' && item.content) {
                    await saveMemoryToDb(item.content, category);
                } else { // 문자열 형태일 경우
                    await saveMemoryToDb(item, category);
                }
                count++;
            }
        }
    }
    console.log(`'${fileName}' 파일에서 총 ${count}개의 기억을 저장했습니다.`);
};


// 마이그레이션 메인 함수
const runMigration = async () => {
  console.log('====== 무쿠봇 기억 마이그레이션을 시작합니다. ======');
  try {
    // 대화 로그 파일들 (txt)
    await migrateTxtFile('1.txt', '대화기록');
    await migrateTxtFile('2.txt', '대화기록');
    await migrateTxtFile('3.txt', '대화기록');
    await migrateTxtFile('fixed-messages.txt', '고정메시지');

    // 구조화된 기억 파일들 (json)
    await migrateJsonFile('fixedMemories.json', '고정기억');
    await migrateJsonFile('love-history.json', null); // 카테고리는 파일 내용 따름

    console.log('🎉🎉🎉 모든 기억의 데이터베이스 마이그레이션이 성공적으로 완료되었습니다! 🎉🎉🎉');

  } catch (error) {
    console.error('마이그레이션 중 심각한 오류가 발생했습니다:', error);
  } finally {
    await pool.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
};

// 스크립트 실행
runMigration();
