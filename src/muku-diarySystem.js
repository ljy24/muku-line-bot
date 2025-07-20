// ============================================================================
// muku-diarySystem.js - 일기장 시스템 v4.0 (완전 수정 버전)
// ✅ handleDiaryCommand 함수 추가
// 📖 동적 기억 저장/불러오기 완전 구현
// 🔧 commandHandler.js와 100% 호환
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    diary: '\x1b[96m',      // 하늘색 (일기장)
    memory: '\x1b[95m',     // 연보라색 (기억)
    date: '\x1b[93m',       // 노란색 (날짜)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    success: '\x1b[92m',    // 초록색 (성공)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📊 시스템 상태 ==================
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    version: "4.0",
    description: "동적기억 전용 일기장 시스템",
    onlyDynamicMemories: true,
    dataPath: './data/dynamic_memories.json'
};

// ================== 🏗️ 초기화 함수 ==================
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diary}📖 [일기장시스템] v4.0 초기화 시작...${colors.reset}`);
        
        // 기본 데이터 디렉토리 확인/생성
        const dataDir = './data';
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
            console.log(`${colors.diary}    📁 데이터 디렉토리 생성: ${dataDir}${colors.reset}`);
        }

        // 동적 기억 파일 초기화
        await ensureDynamicMemoryFile();

        // 시스템 상태 업데이트
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.lastEntryDate = new Date().toISOString();
        
        console.log(`${colors.diary}    ✅ 일기장 시스템 v4.0 초기화 완료${colors.reset}`);
        console.log(`${colors.diary}    📖 고정기억 120개 제외, 동적기억만 관리${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📁 동적 기억 파일 관리 ==================
async function ensureDynamicMemoryFile() {
    const filePath = diarySystemStatus.dataPath;
    
    try {
        await fs.access(filePath);
        console.log(`${colors.system}    ✅ 동적 기억 파일 존재: ${filePath}${colors.reset}`);
    } catch {
        // 파일이 없으면 기본 구조로 생성
        const defaultData = {
            version: "4.0",
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalEntries: 0,
            memories: []
        };
        
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log(`${colors.success}    📝 동적 기억 파일 생성: ${filePath}${colors.reset}`);
    }
}

// ================== 💾 동적 기억 저장 ==================
async function saveDynamicMemory(category, content, metadata = {}) {
    try {
        const filePath = diarySystemStatus.dataPath;
        
        // 기존 데이터 로드
        let data;
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            data = JSON.parse(fileContent);
        } catch {
            data = { memories: [], totalEntries: 0 };
        }

        // 새 기억 추가
        const newMemory = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            category: category,
            content: content,
            metadata: metadata,
            date: new Date().toLocaleDateString('ko-KR')
        };

        data.memories = data.memories || [];
        data.memories.push(newMemory);
        data.totalEntries = data.memories.length;
        data.lastUpdated = new Date().toISOString();

        // 파일 저장
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`${colors.success}💾 [일기장] 동적 기억 저장: ${category} - "${content.substring(0, 30)}..."${colors.reset}`);
        
        // 상태 업데이트
        diarySystemStatus.totalEntries = data.totalEntries;
        diarySystemStatus.lastEntryDate = newMemory.timestamp;
        
        return {
            success: true,
            memoryId: newMemory.id,
            totalMemories: data.totalEntries
        };
    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// ================== 📖 동적 기억 불러오기 ==================
async function getAllDynamicLearning() {
    try {
        const filePath = diarySystemStatus.dataPath;
        
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        return data.memories || [];
    } catch (error) {
        console.log(`${colors.system}ℹ️ 동적 기억 파일 없음 또는 빈 파일${colors.reset}`);
        return [];
    }
}

// ================== 🔍 명령어 처리 함수 (핵심!) ==================
async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diary}🗓️ [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);

        // 1. 일기 쓰기 요청
        if (lowerText.includes('일기써줘') || lowerText.includes('일기 써') || 
            lowerText.includes('일기쓰') || lowerText === '오늘일기') {
            
            const diaryResult = await generateDiary();
            
            return {
                success: true,
                response: diaryResult.message || "오늘의 일기를 작성했어!"
            };
        }

        // 2. 일기 목록/내용 보기
        if (lowerText.includes('일기 보여줘') || lowerText.includes('일기목록') || 
            lowerText.includes('일기 목록') || lowerText.includes('지난 일기')) {
            
            const memories = await getAllDynamicLearning();
            
            if (memories.length === 0) {
                return {
                    success: true,
                    response: "아직 저장된 동적 기억이 없어요! 대화를 통해 기억들이 쌓일 거예요. 😊"
                };
            }

            let response = `📚 저장된 동적 기억들 (총 ${memories.length}개):\n\n`;
            
            // 최근 5개만 표시
            const recentMemories = memories.slice(-5).reverse();
            recentMemories.forEach((memory, index) => {
                const date = new Date(memory.timestamp).toLocaleDateString('ko-KR');
                response += `${index + 1}. [${memory.category}] ${date}\n`;
                response += `   "${memory.content.substring(0, 40)}${memory.content.length > 40 ? '...' : '"}"\n\n`;
            });
            
            if (memories.length > 5) {
                response += `그 외 ${memories.length - 5}개의 기억이 더 있어!`;
            }

            return {
                success: true,
                response: response
            };
        }

        // 3. 일기 통계
        if (lowerText.includes('일기통계') || lowerText.includes('일기 통계') || 
            lowerText.includes('일기현황') || lowerText.includes('일기 현황') ||
            (lowerText.includes('몇 개') && lowerText.includes('일기'))) {
            
            const stats = await getMemoryStatistics();
            
            let response = `📊 일기장 통계:\n\n`;
            response += `📖 총 동적 기억: ${stats.totalDynamicMemories}개\n`;
            response += `📅 마지막 업데이트: ${diarySystemStatus.lastEntryDate ? new Date(diarySystemStatus.lastEntryDate).toLocaleDateString('ko-KR') : '없음'}\n`;
            response += `🔧 시스템 버전: v${diarySystemStatus.version}\n\n`;
            response += `💡 고정기억 120개는 별도 관리돼!`;

            return {
                success: true,
                response: response
            };
        }

        // 4. 기본 일기장 관련 요청
        if (lowerText.includes('일기장') || lowerText.includes('일기') || 
            lowerText.includes('다이어리') || lowerText.includes('diary')) {
            
            const memories = await getAllDynamicLearning();
            
            let response = `📖 일기장 시스템 v${diarySystemStatus.version}\n\n`;
            response += `현재 저장된 동적 기억: ${memories.length}개\n`;
            
            if (memories.length > 0) {
                const lastMemory = memories[memories.length - 1];
                const lastDate = new Date(lastMemory.timestamp).toLocaleDateString('ko-KR');
                response += `최근 기록: ${lastDate} - ${lastMemory.category}\n`;
                response += `"${lastMemory.content.substring(0, 50)}..."\n\n`;
            }
            
            response += `사용 가능한 명령어:\n`;
            response += `• "일기써줘" - 오늘의 기억 정리\n`;
            response += `• "일기목록" - 저장된 기억들 보기\n`;
            response += `• "일기통계" - 통계 정보 보기`;

            return {
                success: true,
                response: response
            };
        }

        // 5. 기타 명령어 - 폴백
        return {
            success: true,
            response: "무엇을 도와드릴까요? '일기써줘', '일기목록', '일기통계' 등을 말해보세요!"
        };

    } catch (error) {
        console.error(`${colors.error}❌ 일기장 명령어 처리 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            response: "일기장 처리 중 문제가 발생했어요... 다시 시도해주세요!"
        };
    }
}

// ================== 📔 일기 생성 ==================
async function generateDiary() {
    try {
        const memories = await getAllDynamicLearning();
        const today = new Date().toLocaleDateString('ko-KR');
        
        if (memories.length === 0) {
            // 첫 일기 생성
            await saveDynamicMemory('시작', '오늘부터 일기장 시스템을 시작했어! 앞으로 많은 기억들이 쌓일 거야.');
            
            return {
                success: true,
                message: `📖 ${today} 첫 번째 일기\n\n오늘부터 일기장 시스템을 시작했어! 아저씨와의 대화를 통해 기억들이 하나씩 쌓여갈 거야. 기대돼! 💕`,
                totalMemories: 1
            };
        }

        // 오늘의 기억들 수집
        const todayMemories = memories.filter(memory => {
            const memoryDate = new Date(memory.timestamp).toLocaleDateString('ko-KR');
            return memoryDate === today;
        });

        let diaryContent = `📖 ${today}의 일기\n\n`;
        
        if (todayMemories.length > 0) {
            diaryContent += `오늘 새로 쌓인 기억들:\n`;
            todayMemories.forEach((memory, index) => {
                const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                diaryContent += `${index + 1}. [${time}] ${memory.category}: ${memory.content}\n`;
            });
            diaryContent += `\n`;
        }
        
        diaryContent += `총 누적 기억: ${memories.length}개\n`;
        diaryContent += `오늘의 새 기억: ${todayMemories.length}개\n\n`;
        diaryContent += `아저씨와 함께하는 매일이 소중한 기억이 되고 있어! 💕`;

        return {
            success: true,
            message: diaryContent,
            totalMemories: memories.length,
            todayMemories: todayMemories.length
        };
    } catch (error) {
        console.error(`${colors.error}❌ 일기 생성 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            message: "일기 생성 중 문제가 발생했어요..."
        };
    }
}

// ================== 📊 상태 조회 함수 ==================
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        currentTime: new Date().toISOString()
    };
}

// ================== 📊 통계 조회 ==================
async function getMemoryStatistics() {
    try {
        const memories = await getAllDynamicLearning();
        
        // 카테고리별 분류
        const categoryCount = {};
        memories.forEach(memory => {
            categoryCount[memory.category] = (categoryCount[memory.category] || 0) + 1;
        });

        return {
            totalDynamicMemories: memories.length,
            categoryBreakdown: categoryCount,
            excludesFixedMemories: true,
            description: "고정기억 120개 제외, 오직 누적 동적기억만 포함",
            lastUpdated: diarySystemStatus.lastEntryDate
        };
    } catch (error) {
        return {
            error: error.message,
            totalDynamicMemories: 0
        };
    }
}

// ================== 🔍 검색 및 조회 함수들 ==================
async function searchMemories(searchTerm) {
    try {
        const memories = await getAllDynamicLearning();
        const results = memories.filter(memory => 
            memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            memory.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            searchTerm: searchTerm,
            totalResults: results.length,
            results: results,
            onlyDynamicMemories: true
        };
    } catch (error) {
        return {
            searchTerm: searchTerm,
            totalResults: 0,
            results: [],
            error: error.message
        };
    }
}

async function getMemoriesForDate(date) {
    try {
        const memories = await getAllDynamicLearning();
        const targetDate = new Date(date).toLocaleDateString('ko-KR');
        
        const dayMemories = memories.filter(memory => {
            const memoryDate = new Date(memory.timestamp).toLocaleDateString('ko-KR');
            return memoryDate === targetDate;
        });

        return {
            date: targetDate,
            memories: dayMemories,
            totalCount: dayMemories.length,
            message: dayMemories.length > 0 ? 
                `${targetDate}에 ${dayMemories.length}개의 기억이 있어요!` : 
                `${targetDate}에는 저장된 기억이 없어요.`
        };
    } catch (error) {
        return {
            date: date,
            memories: [],
            totalCount: 0,
            error: error.message,
            message: "날짜별 기억 조회 중 문제가 발생했어요."
        };
    }
}

// ================== 🔗 호환성 함수들 ==================
async function readDiary() {
    return await generateDiary();
}

async function initialize() {
    return await initializeDiarySystem();
}

function getStatus() {
    return getDiarySystemStatus();
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // ⭐️ 핵심 함수 (commandHandler.js에서 사용)
    handleDiaryCommand,           // 명령어 처리 메인 함수
    saveDynamicMemory,           // 동적 기억 저장
    getAllDynamicLearning,       // 모든 동적 기억 조회
    
    // 초기화 함수들
    initializeDiarySystem,
    initialize,
    ensureDynamicMemoryFile,
    
    // 상태 조회 함수들
    getDiarySystemStatus,
    getStatus,
    
    // 기능 함수들
    generateDiary,
    readDiary,
    getMemoryStatistics,
    searchMemories,
    getMemoriesForDate,
    
    // 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
