// ============================================================================
// muku-diarySystem.js - 일기장 시스템 v2.0 (기존 파일 개선)
// ✅ 누적 동적기억만 표시하는 일기장 시스템
// 📖 고정기억 120개 제외, 오직 동적으로 쌓이는 기억들만 표시
// 🔍 날짜별, 감정별, 키워드별 검색 기능
// 💕 예진이 관점에서 하루를 정리하는 시스템
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

// ================== 📂 파일 경로 설정 ==================
const DIARY_BASE_PATH = './data';
const DIARY_ENTRIES_PATH = path.join(DIARY_BASE_PATH, 'diary_entries');
const DIARY_INDEX_PATH = path.join(DIARY_BASE_PATH, 'diary_index.json');
const EMOTION_LOG_PATH = path.join(DIARY_BASE_PATH, 'emotion_log.json');

// ================== 📊 현재 상태 ==================
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    emotionTrends: {},
    memoryConnections: 0,
    searchIndex: {},
    onlyDynamicMemories: true
};

// ================== 🏗️ 초기화 함수 ==================
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diary}📖 [일기장시스템] 초기화 시작...${colors.reset}`);

        // 디렉토리 생성
        await fs.mkdir(DIARY_BASE_PATH, { recursive: true });
        await fs.mkdir(DIARY_ENTRIES_PATH, { recursive: true });
        console.log(`${colors.diary}    📁 일기장 디렉토리 생성 완료${colors.reset}`);

        // 기존 일기 인덱스 로드 또는 생성
        await loadDiaryIndex();
        
        // 감정 로그 초기화
        await initializeEmotionLog();

        // 시스템 상태 업데이트
        diarySystemStatus.isInitialized = true;
        console.log(`${colors.diary}    ✅ 일기장 시스템 초기화 완료 (동적기억 전용)${colors.reset}`);
        
        return true;

    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📋 일기 인덱스 로드 ==================
async function loadDiaryIndex() {
    try {
        const indexData = await fs.readFile(DIARY_INDEX_PATH, 'utf8');
        const index = JSON.parse(indexData);
        
        diarySystemStatus.totalEntries = index.totalEntries || 0;
        diarySystemStatus.lastEntryDate = index.lastEntryDate || null;
        diarySystemStatus.searchIndex = index.searchIndex || {};
        
        console.log(`${colors.diary}    📋 일기 인덱스 로드: ${diarySystemStatus.totalEntries}개 기록${colors.reset}`);
        
    } catch (error) {
        // 파일이 없으면 새로 생성
        const initialIndex = {
            totalEntries: 0,
            lastEntryDate: null,
            searchIndex: {},
            createdAt: new Date().toISOString(),
            description: "동적기억 전용 일기장 - 고정기억 제외"
        };
        
        await fs.writeFile(DIARY_INDEX_PATH, JSON.stringify(initialIndex, null, 2), 'utf8');
        console.log(`${colors.diary}    📋 새 일기 인덱스 생성 완료${colors.reset}`);
    }
}

// ================== 💭 감정 로그 초기화 ==================
async function initializeEmotionLog() {
    try {
        const emotionData = await fs.readFile(EMOTION_LOG_PATH, 'utf8');
        const emotions = JSON.parse(emotionData);
        
        diarySystemStatus.emotionTrends = emotions.trends || {};
        
        console.log(`${colors.diary}    💭 감정 로그 로드 완료${colors.reset}`);
        
    } catch (error) {
        // 파일이 없으면 새로 생성
        const initialEmotions = {
            trends: {},
            dailyEmotions: {},
            createdAt: new Date().toISOString()
        };
        
        await fs.writeFile(EMOTION_LOG_PATH, JSON.stringify(initialEmotions, null, 2), 'utf8');
        console.log(`${colors.diary}    💭 새 감정 로그 생성 완료${colors.reset}`);
    }
}

// ================== 🧠 동적 기억 수집 시스템 ==================
async function collectDynamicMemoriesOnly() {
    const dynamicMemories = {
        userDefinedMemories: [],     // 사용자가 "기억해"로 추가한 것들
        autoLearnedMemories: [],     // 대화에서 자동 학습된 것들  
        conversationPatterns: [],    // 대화 패턴들
        emotionalMemories: [],       // 감정 기억들
        dailyInteractions: [],       // 일일 상호작용들
        importantMoments: [],        // 중요한 순간들
        totalCount: 0
    };

    // 동적 기억 파일들 정의
    const dynamicFiles = {
        userMemories: path.join(DIARY_BASE_PATH, 'yejin_memories.json'),
        dynamicLearning: path.join(DIARY_BASE_PATH, 'dynamic_learning.json'),
        conversationPatterns: path.join(DIARY_BASE_PATH, 'conversation_patterns.json'),
        emotionalMemory: path.join(DIARY_BASE_PATH, 'emotional_memory.json'),
        dailyInteractions: path.join(DIARY_BASE_PATH, 'daily_interactions.json'),
        importantMoments: path.join(DIARY_BASE_PATH, 'important_moments.json')
    };

    try {
        // 1. 사용자 정의 기억들
        try {
            const userMemData = await fs.readFile(dynamicFiles.userMemories, 'utf8');
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

        console.log(`${colors.diary}📊 총 동적 기억 수집: ${dynamicMemories.totalCount}개${colors.reset}`);
        return dynamicMemories;

    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 수집 실패: ${error.message}${colors.reset}`);
        return dynamicMemories;
    }
}

// ================== 📖 일기장 상태 조회 ==================
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        version: "2.0",
        description: "동적기억 전용 일기장 시스템"
    };
}

// ================== 📔 간단한 일기 생성 ==================
async function generateSimpleDiary() {
    try {
        await initializeDiarySystem();
        
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
// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 🏗️ 초기화 함수들
    initializeDiarySystem,
    initialize: initializeDiarySystem, // alias
    
    // 📊 상태 조회
    getDiarySystemStatus,
    getStatus: getDiarySystemStatus, // alias
    
    // 🧠 기억 관련 함수들
    collectDynamicMemoriesOnly,
    generateSimpleDiary,
    
    // 📖 일기장 함수들 (기존 DynamicMemoryDiarySystem 래핑)
    async generateDiary() {
        try {
            const DynamicMemoryDiarySystem = require('./muku-diarySystem').DynamicMemoryDiarySystem;
            const diarySystem = new DynamicMemoryDiarySystem();
            return await diarySystem.generateDynamicMemoryDiary();
        } catch (error) {
            return await generateSimpleDiary();
        }
    },

    async readDiary() {
        try {
            const DynamicMemoryDiarySystem = require('./muku-diarySystem').DynamicMemoryDiarySystem;
            const diarySystem = new DynamicMemoryDiarySystem();
            return await diarySystem.readDynamicMemoryDiary();
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getMemoryStatistics() {
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
    },

    // 🎯 호환성을 위한 별칭들
    colors,
    diarySystemStatus: () => diarySystemStatus
};
