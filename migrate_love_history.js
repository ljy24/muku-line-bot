// migrate_love_history.js - love-history.json 파일 구조를 새 형식으로 마이그레이션하는 스크립트

const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리 (npm install moment-timezone 이 필요할 수 있습니다.)

// love-history.json 파일의 경로를 정의합니다. (이 스크립트가 프로젝트 루트에 있다고 가정)
const OLD_FILE_PATH = path.resolve(__dirname, './memory/love-history.json');
const NEW_FILE_PATH = path.resolve(__dirname, './memory/love-history.json'); // 동일한 파일에 덮어씁니다.

/**
 * love-history.json 파일을 새로운 카테고리 기반 구조로 마이그레이션합니다.
 * 기존 배열 형태의 데이터는 'general' 카테고리로 이동됩니다.
 */
async function migrateLoveHistory() {
    console.log('🔄 love-history.json 파일 구조 마이그레이션을 시작합니다...');

    let oldData = [];
    try {
        // 기존 love-history.json 파일 읽기 시도
        if (fs.existsSync(OLD_FILE_PATH)) {
            const rawData = fs.readFileSync(OLD_FILE_PATH, 'utf-8');
            oldData = JSON.parse(rawData);

            // 파일이 이미 새로운 형식인지 확인
            if (!Array.isArray(oldData) && oldData.categories) {
                console.log('✅ love-history.json 파일이 이미 새로운 형식으로 보입니다. 마이그레이션을 건너뜁니다.');
                return; // 이미 마이그레이션된 상태라면 종료
            } else if (!Array.isArray(oldData)) {
                // 배열도 아니고 categories도 없으면 알 수 없는 형식
                console.error('❌ love-history.json 파일 형식이 올바르지 않습니다. 수동 확인이 필요합니다.');
                console.log('파일 내용을 확인하거나 백업 후 삭제하고 다시 시도해주세요.');
                return;
            }
        } else {
            console.log('love-history.json 파일이 존재하지 않습니다. 새로운 형식으로 빈 파일을 생성합니다.');
            // 파일이 없으면 새로운 형식의 빈 파일을 생성합니다.
            const initialData = {
                categories: {
                    love_expressions: [],
                    daily_care: [],
                    general: [],
                    user_submitted_memories: []
                }
            };
            await fs.promises.writeFile(NEW_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
            console.log('✅ 빈 love-history.json 파일이 새로운 형식으로 생성되었습니다.');
            return; // 파일 생성 후 종료
        }
    } catch (err) {
        console.error(`❌ 기존 love-history.json 파일을 읽거나 파싱하는 데 실패했습니다: ${err.message}`);
        console.error('파일 내용을 확인하거나 백업 후 삭제하고 다시 시도해주세요.');
        return;
    }

    // 새로운 파일 구조를 생성합니다.
    const newStructure = {
        categories: {
            love_expressions: [],
            daily_care: [],
            general: [], // 기존 'date', 'event' 데이터가 여기에 저장됩니다.
            user_submitted_memories: [] // 아저씨가 새로 추가할 특정 기억들이 여기에 저장됩니다.
        }
    };

    // 기존 배열 데이터를 'general' 카테고리로 이동시킵니다.
    oldData.forEach(item => {
        if (item.date && item.event) {
            newStructure.categories.general.push({
                content: `${item.date} - ${item.event}`, // 날짜와 이벤트를 하나의 'content'로 묶습니다.
                timestamp: moment().tz('Asia/Tokyo').format() // 일관성을 위해 타임스탬프를 추가합니다.
            });
        }
    });

    try {
        // 업데이트된 데이터를 파일에 저장합니다. (안전한 저장을 위해 임시 파일 사용)
        const tempPath = NEW_FILE_PATH + '.tmp';
        await fs.promises.writeFile(tempPath, JSON.stringify(newStructure, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, NEW_FILE_PATH); // 성공 시 임시 파일을 본래 파일로 변경
        console.log('✅ love-history.json 파일 구조 마이그레이션이 완료되었습니다!');
        console.log('기존 데이터는 "general" 카테고리로 이동되었고, 새로운 "user_submitted_memories" 카테고리가 추가되었습니다.');
    } catch (err) {
        console.error(`❌ 마이그레이션된 love-history.json 파일을 저장하는 데 실패했습니다: ${err.message}`);
        console.error('마이그레이션에 실패했습니다. 기존 파일을 수동으로 복원하거나 내용을 확인해주세요.');
    }
}

// 마이그레이션 함수를 실행합니다.
migrateLoveHistory();
