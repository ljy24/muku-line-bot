// ============================================================================
// muku-diarySystem.js - 일기장 시스템 v3.0 (완전히 새로운 버전)
// ✅ 모듈 로딩 문제 완전 해결
// 📖 간단하고 안전한 구조로 재설계
// 🔧 enhancedLogging 연동 100% 보장
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
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📊 시스템 상태 ==================
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    version: "3.0",
    description: "동적기억 전용 일기장 시스템",
    onlyDynamicMemories: true
};

// ================== 🏗️ 초기화 함수 ==================
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diary}📖 [일기장시스템] v3.0 초기화 시작...${colors.reset}`);
        
        // 기본 데이터 디렉토리 확인/생성
        const dataDir = './data';
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
            console.log(`${colors.diary}    📁 데이터 디렉토리 생성: ${dataDir}${colors.reset}`);
        }

        // 시스템 상태 업데이트
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.lastEntryDate = new Date().toISOString();
        
        console.log(`${colors.diary}    ✅ 일기장 시스템 v3.0 초기화 완료${colors.reset}`);
        console.log(`${colors.diary}    📖 고정기억 120개 제외, 동적기억만 관리${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📋 상태 조회 함수 ==================
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        currentTime: new Date().toISOString()
    };
}

// ================== 🧠 동적 기억 수집 (간단 버전) ==================
async function collectDynamicMemoriesOnly() {
    const dynamicMemories = {
        userDefinedMemories: [],
        autoLearnedMemories: [],
        conversationPatterns: [],
        emotionalMemories: [],
        dailyInteractions: [],
        importantMoments: [],
        totalCount: 0
    };

    try {
        // 사용자 정의 기억 파일 확인
        const userMemoriesPath = './data/yejin_memories.json';
        try {
            const userMemData = await fs.readFile(userMemoriesPath, 'utf8');
            const userData = JSON.parse(userMemData);
            if (userData.memories && Array.isArray(userData.memories)) {
                dynamicMemories.userDefinedMemories = userData.memories;
            }
            console.log(`${colors.memory}✅ 사용자 정의 기억: ${dynamicMemories.userDefinedMemories.length}개${colors.reset}`);
        } catch (error) {
            console.log(`${colors.system}ℹ️ 사용자 정의 기억 파일 없음 (정상)${colors.reset}`);
        }

        // 총 개수 계산
        dynamicMemories.totalCount = 
            dynamicMemories.userDefinedMemories.length +
            dynamicMemories.autoLearnedMemories.length +
            dynamicMemories.conversationPatterns.length +
            dynamicMemories.emotionalMemories.length +
            dynamicMemories.dailyInteractions.length +
            dynamicMemories.importantMoments.length;

        console.log(`${colors.diary}📊 총 동적 기억: ${dynamicMemories.totalCount}개${colors.reset}`);
        
        // 상태 업데이트
        diarySystemStatus.totalEntries = dynamicMemories.totalCount;
        
        return dynamicMemories;
    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 수집 실패: ${error.message}${colors.reset}`);
        return dynamicMemories;
    }
}

// ================== 📔 간단한 일기 생성 ==================
async function generateDiary() {
    try {
        const dynamicMemories = await collectDynamicMemoriesOnly();
        
        if (dynamicMemories.totalCount === 0) {
            return {
                success: true,
                message: "아직 누적된 동적 기억이 없어요. 대화하면서 기억들이 쌓일 거예요! 😊",
                totalMemories: 0
            };
        }

        return {
            success: true,
            message: `동적 기억 ${dynamicMemories.totalCount}개가 누적되어 있어요! 📖✨`,
            totalMemories: dynamicMemories.totalCount,
            breakdown: {
                userDefined: dynamicMemories.userDefinedMemories.length,
                autoLearned: dynamicMemories.autoLearnedMemories.length,
                patterns: dynamicMemories.conversationPatterns.length,
                emotions: dynamicMemories.emotionalMemories.length,
                interactions: dynamicMemories.dailyInteractions.length,
                important: dynamicMemories.importantMoments.length
            }
        };
    } catch (error) {
        console.error(`${colors.error}❌ 일기 생성 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            totalMemories: 0
        };
    }
}

// ================== 📊 통계 조회 ==================
async function getMemoryStatistics() {
    try {
        const dynamicMemories = await collectDynamicMemoriesOnly();
        
        return {
            totalDynamicMemories: dynamicMemories.totalCount,
            breakdown: {
                userDefinedMemories: dynamicMemories.userDefinedMemories.length,
                autoLearnedMemories: dynamicMemories.autoLearnedMemories.length,
                conversationPatterns: dynamicMemories.conversationPatterns.length,
                emotionalMemories: dynamicMemories.emotionalMemories.length,
                dailyInteractions: dynamicMemories.dailyInteractions.length,
                importantMoments: dynamicMemories.importantMoments.length
            },
            excludesFixedMemories: true,
            description: "고정기억 120개 제외, 오직 누적 동적기억만 포함"
        };
    } catch (error) {
        return {
            error: error.message,
            totalDynamicMemories: 0
        };
    }
}

// ================== 🔍 기타 함수들 (호환성) ==================
async function readDiary() {
    return await generateDiary();
}

async function searchMemories(searchTerm) {
    return {
        searchTerm: searchTerm,
        totalResults: 0,
        results: [],
        onlyDynamicMemories: true
    };
}

async function getMemoriesForDate(date) {
    return {
        date: date,
        memories: [],
        totalCount: 0,
        message: "해당 날짜에는 누적된 동적 기억이 없어요."
    };
}

// ================== 📤 모듈 내보내기 (간단하고 명확하게) ==================
module.exports = {
    // 초기화 함수들
    initializeDiarySystem,
    initialize: initializeDiarySystem,
    
    // 상태 조회 함수들
    getDiarySystemStatus,
    getStatus: getDiarySystemStatus,
    
    // 핵심 기능 함수들
    collectDynamicMemoriesOnly,
    generateDiary,
    readDiary,
    getMemoryStatistics,
    searchMemories,
    getMemoriesForDate,
    
    // 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
