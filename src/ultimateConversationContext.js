// ============================================================================
// ultimateConversationContext.js - v38.0 CONFLICT_INTEGRATION
// 🗄️ 동적 기억과 대화 컨텍스트 전문 관리자
// 💔 muku-unifiedConflictManager.js 연동: 실시간 갈등 감지 및 관리 통합
// 💾 디스크 마운트 경로 적용: ./data → /data (완전 영구 저장!)
// 🎯 핵심 역할에만 집중: 동적기억 + 대화흐름 + 컨텍스트 조합 + 갈등관리
// ✨ GPT 모델 버전 전환: index.js의 설정에 따라 컨텍스트 최적화
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [UltimateContext] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [UltimateContext] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// --- 설정 ---
const TIMEZONE = 'Asia/Tokyo';
// ⭐️ 디스크 마운트 경로로 변경! ⭐️
const DATA_DIR = '/data'; // 💾 ./data → /data 변경!
const DAILY_SPONTANEOUS_TARGET = 20; // 하루 자발적 메시지 목표

// 💾 영구 저장 파일 경로들 (디스크 마운트)
const PERSISTENT_FILES = {
    userMemories: path.join(DATA_DIR, 'user_memories_persistent.json'),
    conversationMemories: path.join(DATA_DIR, 'conversation_memories_persistent.json'),
    learningData: path.join(DATA_DIR, 'learning_data_persistent.json'),
    spontaneousStats: path.join(DATA_DIR, 'spontaneous_stats_persistent.json'),
    memoryStats: path.join(DATA_DIR, 'memory_stats_persistent.json'),
    dailyBackup: path.join(DATA_DIR, 'daily_backup.json')
};

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let emotionalContextManager = null;
let memoryManager = null;
let weatherManager = null;
// 💔 갈등 관리자 추가
let mukuUnifiedConflictManager = null; 

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

function getMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] memoryManager 로드 실패:', error.message);
        }
    }
    return memoryManager;
}

function getWeatherManager() {
    if (!weatherManager) {
        try {
            weatherManager = require('./weatherManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] weatherManager 로드 실패:', error.message);
        }
    }
    return weatherManager;
}

// 💔 갈등 관리자 로더 함수 추가
function getConflictManager() {
    if (!mukuUnifiedConflictManager) {
        try {
            // 갈등 관리자 파일명은 'muku-unifiedConflictManager.js'로 가정
            mukuUnifiedConflictManager = require('./muku-unifiedConflictManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] mukuUnifiedConflictManager 로드 실패:', error.message);
        }
    }
    return mukuUnifiedConflictManager;
}


// --- 핵심 상태 관리 ---
let ultimateConversationState = {
    // ... (기존 상태 정의는 변경 없음) ...
    // 🧠 동적 기억 관리 (사용자가 추가/수정/삭제하는 기억들) - 💾 영구 저장
    dynamicMemories: {
        userMemories: [],         // 사용자가 직접 추가한 기억
        conversationMemories: [],   // 대화에서 자동 학습된 기억
        temporaryMemories: []       // 임시 기억 (세션별)
    },
    
    // 📚 학습 데이터 (일기장용!) - 💾 영구 저장 
    learningData: {
        dailyLearning: [],          // 일별 학습 내용
        conversationLearning: [],   // 대화별 학습 내용
        emotionLearning: [],        // 감정별 학습 내용
        topicLearning: []           // 주제별 학습 내용
    },
    
    // 💬 대화 컨텍스트 관리 (🔄 메모리 기반 - 재시작시 초기화됨)
    conversationContext: {
        recentMessages: [],         // 최근 20개 메시지
        currentTopic: null,         // 현재 대화 주제
        conversationFlow: 'normal', // 대화 흐름 상태
        lastTopicChange: Date.now()
    },
    
    // ⏰ 타이밍 관리 (🔄 메모리 기반)
    timingContext: {
        lastUserMessageTime: Date.now(),
        lastBotResponse: Date.now(),
        conversationGap: 0,
        sessionStartTime: Date.now()
    },
    
    // 😊 감정 상태 연동 (보조 역할) - 삐짐 상태는 sulkyManager에서 관리
    emotionalSync: {
        lastEmotionalUpdate: Date.now()
        // sulkinessState 제거됨: sulkyManager.js에서 독립 관리
    },
    
    // ⭐️ 자발적 메시지 통계 - 💾 영구 저장
    spontaneousMessages: {
        sentToday: 0,                   // 오늘 보낸 자발적 메시지 수
        totalDaily: DAILY_SPONTANEOUS_TARGET, // 하루 목표
        sentTimes: [],                  // 실제 전송된 시간들
        lastSentTime: null,             // 마지막 전송 시간
        nextScheduledTime: null,        // 다음 예정 시간
        messageTypes: {                 // 메시지 타입별 통계
            emotional: 0,               // 감성 메시지
            casual: 0,                  // 일상 메시지
            caring: 0,                  // 걱정/관심 메시지
            playful: 0                  // 장난스러운 메시지
        },
        lastResetDate: null             // 마지막 리셋 날짜
    },
    
    // 📊 통계 및 메타데이터 - 💾 영구 저장
    memoryStats: {
        totalUserMemories: 0,
        totalConversationMemories: 0,
        todayMemoryCount: 0,
        lastDailyReset: null,
        lastMemoryOperation: null,
        // 📚 학습 통계 추가!
        totalLearningEntries: 0,
        todayLearningCount: 0,
        lastLearningEntry: null,
        // 💾 영구 저장 관련 메타데이터
        lastSaved: null,
        totalSaves: 0,
        lastBackup: null
    }
};


// ================== 💾 영구 저장 시스템 (디스크 마운트) ==================
// ... (파일 저장/로드 관련 함수들은 변경 없음) ...
/**
 * 💾 데이터 디렉토리 확인 및 생성 (디스크 마운트)
 */
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
        contextLog(`💾 디스크 마운트 디렉토리 확인: ${DATA_DIR}`);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
        contextLog(`📁 💾 디스크 마운트 디렉토리 생성: ${DATA_DIR} (완전 영구 저장!)`);
    }
}

/**
 * 💾 사용자 기억 영구 저장 (디스크 마운트)
 */
async function saveUserMemoriesToFile() {
    try {
        await ensureDataDirectory();
        
        const userMemoryData = {
            memories: ultimateConversationState.dynamicMemories.userMemories,
            lastSaved: new Date().toISOString(),
            totalCount: ultimateConversationState.dynamicMemories.userMemories.length,
            version: '37.0-disk-mount',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.userMemories,
            JSON.stringify(userMemoryData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 사용자 기억 저장 완료: ${userMemoryData.totalCount}개 (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 사용자 기억 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 학습 데이터 영구 저장 (디스크 마운트)
 */
async function saveLearningDataToFile() {
    try {
        await ensureDataDirectory();
        
        const learningData = {
            learningData: ultimateConversationState.learningData,
            lastSaved: new Date().toISOString(),
            totalEntries: ultimateConversationState.memoryStats.totalLearningEntries,
            statistics: {
                daily: ultimateConversationState.learningData.dailyLearning.length,
                conversation: ultimateConversationState.learningData.conversationLearning.length,
                emotion: ultimateConversationState.learningData.emotionLearning.length,
                topic: ultimateConversationState.learningData.topicLearning.length
            },
            version: '37.0-disk-mount',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.learningData,
            JSON.stringify(learningData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 학습 데이터 저장 완료: ${learningData.totalEntries}개 (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 학습 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 영구 저장 (디스크 마운트)
 */
async function saveSpontaneousStatsToFile() {
    try {
        await ensureDataDirectory();
        
        const spontaneousData = {
            stats: ultimateConversationState.spontaneousMessages,
            lastSaved: new Date().toISOString(),
            version: '37.0-disk-mount',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.spontaneousStats,
            JSON.stringify(spontaneousData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 자발적 메시지 통계 저장 완료 (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 자발적 메시지 통계 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 메모리 통계 영구 저장 (디스크 마운트)
 */
async function saveMemoryStatsToFile() {
    try {
        await ensureDataDirectory();
        
        const statsData = {
            stats: ultimateConversationState.memoryStats,
            lastSaved: new Date().toISOString(),
            version: '37.0-disk-mount',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.memoryStats,
            JSON.stringify(statsData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 메모리 통계 저장 완료 (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 메모리 통계 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 모든 데이터 한번에 저장 (디스크 마운트)
 */
async function saveAllDataToFiles() {
    try {
        const results = await Promise.all([
            saveUserMemoriesToFile(),
            saveLearningDataToFile(), 
            saveSpontaneousStatsToFile(),
            saveMemoryStatsToFile()
        ]);
        
        const successCount = results.filter(r => r === true).length;
        ultimateConversationState.memoryStats.lastSaved = Date.now();
        ultimateConversationState.memoryStats.totalSaves++;
        
        contextLog(`💾 전체 데이터 저장: ${successCount}/4개 성공 (디스크 마운트: ${DATA_DIR})`);
        return successCount === 4;
    } catch (error) {
        contextLog(`❌ 전체 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 사용자 기억 파일에서 로드 (디스크 마운트)
 */
async function loadUserMemoriesFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.userMemories, 'utf8');
        const userMemoryData = JSON.parse(data);
        
        if (userMemoryData.memories && Array.isArray(userMemoryData.memories)) {
            ultimateConversationState.dynamicMemories.userMemories = userMemoryData.memories;
            ultimateConversationState.memoryStats.totalUserMemories = userMemoryData.memories.length;
            contextLog(`💾 사용자 기억 로드 완료: ${userMemoryData.memories.length}개 (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 사용자 기억 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        return false;
    }
}

/**
 * 💾 학습 데이터 파일에서 로드 (디스크 마운트)
 */
async function loadLearningDataFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.learningData, 'utf8');
        const learningDataFile = JSON.parse(data);
        
        if (learningDataFile.learningData) {
            ultimateConversationState.learningData = learningDataFile.learningData;
            ultimateConversationState.memoryStats.totalLearningEntries = learningDataFile.totalEntries || 0;
            contextLog(`💾 학습 데이터 로드 완료: ${learningDataFile.totalEntries}개 (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 학습 데이터 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 파일에서 로드 (디스크 마운트)
 */
async function loadSpontaneousStatsFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.spontaneousStats, 'utf8');
        const spontaneousData = JSON.parse(data);
        
        if (spontaneousData.stats) {
            // 날짜가 바뀌었으면 일일 통계만 리셋
            const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
            if (spontaneousData.stats.lastResetDate !== today) {
                // 일일 통계만 리셋, 누적 데이터는 유지
                spontaneousData.stats.sentToday = 0;
                spontaneousData.stats.sentTimes = [];
                spontaneousData.stats.lastSentTime = null;
                spontaneousData.stats.nextScheduledTime = null;
                spontaneousData.stats.lastResetDate = today;
                
                // 메시지 타입별 통계도 리셋
                Object.keys(spontaneousData.stats.messageTypes).forEach(type => {
                    spontaneousData.stats.messageTypes[type] = 0;
                });
                
                contextLog(`🌄 자발적 메시지 일일 통계 리셋 (${today}) (💾 디스크 마운트)`);
            }
            
            ultimateConversationState.spontaneousMessages = spontaneousData.stats;
            contextLog(`💾 자발적 메시지 통계 로드 완료 (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 자발적 메시지 통계 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        return false;
    }
}

/**
 * 💾 메모리 통계 파일에서 로드 (디스크 마운트)
 */
async function loadMemoryStatsFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.memoryStats, 'utf8');
        const statsData = JSON.parse(data);
        
        if (statsData.stats) {
            // 일일 카운트 리셋 확인
            const today = new Date().toDateString();
            if (statsData.stats.lastDailyReset !== today) {
                statsData.stats.todayMemoryCount = 0;
                statsData.stats.todayLearningCount = 0;
                statsData.stats.lastDailyReset = today;
                contextLog(`🌄 일일 통계 리셋 (${today}) (💾 디스크 마운트)`);
            }
            
            ultimateConversationState.memoryStats = {
                ...ultimateConversationState.memoryStats,
                ...statsData.stats
            };
            contextLog(`💾 메모리 통계 로드 완료 (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 메모리 통계 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        return false;
    }
}

/**
 * 💾 모든 데이터 파일에서 로드 (디스크 마운트)
 */
async function loadAllDataFromFiles() {
    try {
        contextLog(`💾 모든 영구 데이터 로드 시작... (디스크 마운트: ${DATA_DIR})`);
        
        const results = await Promise.all([
            loadUserMemoriesFromFile(),
            loadLearningDataFromFile(),
            loadSpontaneousStatsFromFile(),
            loadMemoryStatsFromFile()
        ]);
        
        const successCount = results.filter(r => r === true).length;
        contextLog(`💾 데이터 로드 완료: ${successCount}/4개 성공 (디스크 마운트: ${DATA_DIR})`);
        
        // 로드 후 통계 정보 출력
        const memStats = getMemoryStatistics();
        contextLog(`📊 로드된 데이터: 사용자기억 ${memStats.user}개, 학습데이터 ${memStats.learning.totalEntries}개 (💾 완전 영구 저장)`);
        
        return successCount > 0;
    } catch (error) {
        contextLog(`❌ 데이터 로드 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 일일 백업 생성 (디스크 마운트)
 */
async function createDailyBackup() {
    try {
        await ensureDataDirectory();
        
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        const backupData = {
            backupDate: today,
            timestamp: new Date().toISOString(),
            userMemories: ultimateConversationState.dynamicMemories.userMemories,
            learningData: ultimateConversationState.learningData,
            spontaneousStats: ultimateConversationState.spontaneousMessages,
            memoryStats: ultimateConversationState.memoryStats,
            version: '37.0-disk-mount',
            storagePath: DATA_DIR
        };
        
        const backupFileName = `backup_${today.replace(/-/g, '')}.json`;
        const backupPath = path.join(DATA_DIR, 'backups', backupFileName);
        
        // 백업 디렉토리 생성
        const backupDir = path.join(DATA_DIR, 'backups');
        try {
            await fs.access(backupDir);
        } catch {
            await fs.mkdir(backupDir, { recursive: true });
        }
        
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        
        ultimateConversationState.memoryStats.lastBackup = Date.now();
        contextLog(`💾 일일 백업 생성: ${backupFileName} (디스크 마운트: ${DATA_DIR})`);
        
        return true;
    } catch (error) {
        contextLog(`❌ 일일 백업 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 자동 저장 시스템 (5분마다) - 디스크 마운트
 */
function startAutoSaveSystem() {
    // 5분마다 자동 저장
    setInterval(async () => {
        try {
            await saveAllDataToFiles();
            contextLog(`⏰ 자동 저장 완료 (5분 주기) (💾 디스크 마운트: ${DATA_DIR})`);
        } catch (error) {
            contextLog(`❌ 자동 저장 실패: ${error.message}`);
        }
    }, 5 * 60 * 1000); // 5분
    
    // 1시간마다 백업 체크
    setInterval(async () => {
        try {
            const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
            const lastBackup = ultimateConversationState.memoryStats.lastBackup;
            
            if (!lastBackup || moment(lastBackup).format('YYYY-MM-DD') !== today) {
                await createDailyBackup();
            }
        } catch (error) {
            contextLog(`❌ 백업 체크 실패: ${error.message}`);
        }
    }, 60 * 60 * 1000); // 1시간
    
    contextLog(`⏰ 자동 저장 시스템 시작 (5분 저장, 1시간 백업 체크) (💾 디스크 마운트: ${DATA_DIR})`);
}

// ================== 🎨 로그 함수 ==================
function contextLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [UltimateContext] ${message}`);
    if (data) {
        console.log('  🗄️ 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== ✨ GPT 모델별 컨텍스트 최적화 ==================
// ... (관련 함수들은 변경 없음) ...
/**
 * 현재 설정된 GPT 모델에 따라 컨텍스트 길이 조정
 */
function getOptimalContextLength() {
    if (!getCurrentModelSetting) {
        return { recent: 5, memory: 3 }; // 기본값
    }
    
    const currentModel = getCurrentModelSetting();
    
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 컨텍스트를 짧게
            return { recent: 3, memory: 2 };
            
        case '4.0':
            // GPT-4o는 컨텍스트를 길게
            return { recent: 7, memory: 4 };
            
        case 'auto':
            // 자동 모드는 중간
            return { recent: 5, memory: 3 };
            
        default:
            return { recent: 5, memory: 3 };
    }
}

/**
 * 모델별로 최적화된 컨텍스트 우선순위 결정
 */
function getContextPriority(currentModel) {
    switch(currentModel) {
        case '3.5':
            // GPT-3.5는 간결한 정보에 집중
            return {
                recentMessages: 0.5,    // 최근 대화 가중치
                emotions: 0.3,          // 감정 상태 가중치
                memories: 0.2           // 기억 가중치
            };
            
        case '4.0':
            // GPT-4o는 풍부한 컨텍스트 활용
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
            
        case 'auto':
        default:
            // 균형잡힌 가중치
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
    }
}

// ==================== 📚 학습 데이터 관리 (영구 저장 연동!) ====================
// ... (관련 함수들은 변경 없음) ...

/**
 * 📚 새로운 학습 내용 추가 (💾 즉시 저장!)
 */
async function addLearningEntry(content, category = '일반학습', context = {}) {
    try {
        const learningEntry = {
            id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            date: moment().tz(TIMEZONE).format('YYYY-MM-DD'),
            time: moment().tz(TIMEZONE).format('HH:mm'),
            category: category,
            content: content,
            context: context,
            source: 'auto_learning'
        };
        
        // 해당 카테고리에 따라 분류하여 저장
        switch(category) {
            case '대화학습':
                ultimateConversationState.learningData.conversationLearning.push(learningEntry);
                break;
            case '감정분석':
                ultimateConversationState.learningData.emotionLearning.push(learningEntry);
                break;
            case '주제학습':
                ultimateConversationState.learningData.topicLearning.push(learningEntry);
                break;
            default:
                ultimateConversationState.learningData.dailyLearning.push(learningEntry);
        }
        
        // 통계 업데이트
        ultimateConversationState.memoryStats.totalLearningEntries++;
        ultimateConversationState.memoryStats.todayLearningCount++;
        ultimateConversationState.memoryStats.lastLearningEntry = Date.now();
        
        contextLog(`📚 학습 추가: [${category}] ${content.substring(0, 50)}...`);
        
        // 💾 즉시 저장 (비동기)
        saveLearningDataToFile().catch(err => 
            contextLog(`❌ 학습 데이터 저장 실패: ${err.message}`)
        );
        
        return learningEntry;
    } catch (error) {
        contextLog('학습 추가 실패:', error.message);
        return null;
    }
}

/**
 * 📚 모든 학습 내용 조회 (일기장용!) - 💾 파일에서 최신 데이터 로드
 */
async function getAllDynamicLearning() {
    try {
        // 💾 파일에서 최신 데이터 로드
        await loadLearningDataFromFile();
        
        // 모든 학습 데이터를 하나의 배열로 합치기
        const allLearning = [
            ...ultimateConversationState.learningData.dailyLearning,
            ...ultimateConversationState.learningData.conversationLearning,
            ...ultimateConversationState.learningData.emotionLearning,
            ...ultimateConversationState.learningData.topicLearning
        ];
        
        // 시간순으로 정렬
        allLearning.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        contextLog(`📚 전체 학습 데이터 조회: ${allLearning.length}개 (파일에서 로드)`);
        
        return allLearning;
    } catch (error) {
        contextLog('학습 데이터 조회 실패:', error.message);
        return [];
    }
}

/**
 * 📚 특정 카테고리 학습 내용 조회
 */
async function getLearningByCategory(category) {
    try {
        await loadLearningDataFromFile(); // 💾 최신 데이터 로드
        
        let targetArray = [];
        
        switch(category) {
            case '대화학습':
                targetArray = ultimateConversationState.learningData.conversationLearning;
                break;
            case '감정분석':
                targetArray = ultimateConversationState.learningData.emotionLearning;
                break;
            case '주제학습':
                targetArray = ultimateConversationState.learningData.topicLearning;
                break;
            default:
                targetArray = ultimateConversationState.learningData.dailyLearning;
        }
        
        return targetArray.slice(); // 복사본 반환
    } catch (error) {
        contextLog(`카테고리별 학습 조회 실패 (${category}):`, error.message);
        return [];
    }
}

/**
 * 📚 오늘 학습 내용만 조회
 */
async function getTodayLearning() {
    try {
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        const allLearning = await getAllDynamicLearning();
        
        return allLearning.filter(item => item.date === today);
    } catch (error) {
        contextLog('오늘 학습 조회 실패:', error.message);
        return [];
    }
}

/**
 * 📚 학습 통계 조회
 */
function getLearningStatistics() {
    const total = ultimateConversationState.memoryStats.totalLearningEntries;
    const today = ultimateConversationState.memoryStats.todayLearningCount;
    
    return {
        totalEntries: total,
        todayCount: today,
        categories: {
            daily: ultimateConversationState.learningData.dailyLearning.length,
            conversation: ultimateConversationState.learningData.conversationLearning.length,
            emotion: ultimateConversationState.learningData.emotionLearning.length,
            topic: ultimateConversationState.learningData.topicLearning.length
        },
        lastEntry: ultimateConversationState.memoryStats.lastLearningEntry,
        isPersistent: true // 💾 영구 저장 표시
    };
}


// ==================== 🧠 강화된 자동 학습 시스템 ====================
// ... (관련 함수들은 변경 없음) ...
/**
 * 🧠 메시지에서 새로운 정보 분석 및 추출
 */
function analyzeMessageForNewInfo(message) {
    try {
        const lowerMsg = message.toLowerCase();
        let hasNewInfo = false;
        let category = '일반학습';
        let extractedInfo = '';
        
        // 1. 감정 관련 정보
        if (lowerMsg.includes('기분') || lowerMsg.includes('느낌') || lowerMsg.includes('감정')) {
            hasNewInfo = true;
            category = '감정분석';
            extractedInfo = `아저씨의 감정 표현: ${message}`;
        }
        // 2. 상태 관련 정보
        else if (lowerMsg.includes('피곤') || lowerMsg.includes('아프') || lowerMsg.includes('힘들') || lowerMsg.includes('건강')) {
            hasNewInfo = true;
            category = '대화학습';
            extractedInfo = `아저씨의 현재 상태: ${message}`;
        }
        // 3. 계획이나 일정 관련
        else if (lowerMsg.includes('계획') || lowerMsg.includes('예정') || lowerMsg.includes('할 것') || lowerMsg.includes('하려고')) {
            hasNewInfo = true;
            category = '주제학습';
            extractedInfo = `아저씨의 계획: ${message}`;
        }
        // 4. 선호도나 취향 관련
        else if (lowerMsg.includes('좋아') || lowerMsg.includes('싫어') || lowerMsg.includes('선호') || lowerMsg.includes('취향')) {
            hasNewInfo = true;
            category = '대화학습';
            extractedInfo = `아저씨의 선호도: ${message}`;
        }
        // 5. 기억 관련 명시적 요청
        else if (lowerMsg.includes('기억') || lowerMsg.includes('잊지') || lowerMsg.includes('외워')) {
            hasNewInfo = true;
            category = '대화학습';
            extractedInfo = `기억 요청사항: ${message}`;
        }
        // 6. 질문이나 궁금증
        else if (message.includes('?') || lowerMsg.includes('궁금') || lowerMsg.includes('어떻게')) {
            hasNewInfo = true;
            category = '주제학습';
            extractedInfo = `아저씨의 질문: ${message}`;
        }
        
        return {
            hasNewInfo,
            category,
            extractedInfo: extractedInfo || message,
            originalMessage: message,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        contextLog('메시지 분석 실패:', error.message);
        return { hasNewInfo: false };
    }
}

/**
 * 🧠 메시지 기반 자동 학습 처리 (💾 영구 저장 연동!)
 */
async function processAutoLearning(speaker, message) {
    try {
        // 사용자 메시지만 학습 대상으로 처리
        if (speaker !== 'user' && speaker !== '아저씨') {
            return false;
        }
        
        const analysis = analyzeMessageForNewInfo(message);
        
        if (analysis.hasNewInfo) {
            const learningEntry = await addLearningEntry(
                analysis.extractedInfo,
                analysis.category,
                {
                    speaker: speaker,
                    originalMessage: message,
                    analysisTime: new Date().toISOString()
                }
            );
            
            if (learningEntry) {
                contextLog(`🧠 자동 학습 완료: [${analysis.category}] ${analysis.extractedInfo.substring(0, 30)}...`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        contextLog('자동 학습 처리 실패:', error.message);
        return false;
    }
}


// ==================== 💬 대화 메시지 관리 (학습 연동) ====================
// ... (관련 함수들은 변경 없음) ...
/**
 * 새로운 메시지를 대화 컨텍스트에 추가 (학습 시스템 연동!)
 */
async function addUltimateMessage(speaker, message) {
    const timestamp = Date.now();
    const messageObj = {
        speaker,
        message,
        timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    ultimateConversationState.conversationContext.recentMessages.push(messageObj);
    
    // ✨ 모델별 최적화된 메시지 보관 개수
    const contextLength = getOptimalContextLength();
    const maxMessages = contextLength.recent * 3; // 여유분 포함
    
    if (ultimateConversationState.conversationContext.recentMessages.length > maxMessages) {
        ultimateConversationState.conversationContext.recentMessages = 
            ultimateConversationState.conversationContext.recentMessages.slice(-maxMessages);
    }
    
    // 사용자 메시지인 경우 타이밍 업데이트
    if (speaker === 'user' || speaker === '아저씨') {
        updateLastUserMessageTime(timestamp);
    }
    
    contextLog(`메시지 추가: ${speaker} - "${message.substring(0, 30)}..."`);
    
    // 🧠 자동 학습 처리 (새로 추가!)
    await processAutoLearning(speaker, message);
    
    // 대화에서 자동 학습 (기존)
    await learnFromConversation(speaker, message);
}

// ==================== 💔 [신규] 메시지 처리 및 갈등 분석 통합 함수 ====================

/**
 * 💔 사용자 메시지 플로우 처리 (갈등 분석 우선)
 * 갈등 시스템이 응답을 결정하면 해당 응답을 반환하고, 아니면 일반 AI 응답 생성 플로우로 진행
 * @param {string} speaker - 메시지 발화자 ('user' 또는 'muku')
 * @param {string} message - 사용자 메시지
 * @param {object} client - Discord.js 또는 다른 클라이언트 객체
 * @param {string} userId - 사용자 ID
 * @returns {object} { response: string|null, source: 'ConflictManager'|'AI'|'None' }
 */
async function handleMessageFlow(speaker, message, client, userId) {
    // 사용자 메시지가 아니면 처리하지 않음
    if (speaker !== 'user' && speaker !== '아저씨') {
        await addUltimateMessage(speaker, message); // 봇 메시지는 그냥 추가만 함
        return { response: null, source: 'None' };
    }

    // 1. 💔 갈등 관리 시스템으로 메시지 분석
    const conflictManager = getConflictManager();
    if (conflictManager) {
        try {
            const conflictResult = await conflictManager.processMukuMessageForConflict(message, client, userId);

            // 1-1. 갈등 관리자가 즉각적인 응답을 생성한 경우 (새 갈등, 화해 등)
            if (conflictResult.shouldRespond) {
                contextLog(`💔 갈등 시스템 응답 생성: ${conflictResult.type}`);
                // 생성된 응답을 즉시 반환하고, AI 생성 로직은 건너뜀
                return { 
                    response: conflictResult.response, 
                    source: 'ConflictManager', 
                    type: conflictResult.type 
                };
            }

            // 1-2. 진행 중인 갈등 상태이지만, 즉각적인 응답이 없는 경우
            if (conflictResult.type === 'ongoing_conflict') {
                contextLog('💔 진행 중인 갈등 상태... (응답 없음)');
                 // 이 경우, 아무런 응답도 하지 않고 대화를 종료
                 return { response: null, source: 'ConflictManager', type: 'ongoing_conflict' };
            }

        } catch (error) {
            contextLog('❌ 갈등 분석 중 에러:', error.message);
        }
    }

    // 2. ปกติ적인 대화 흐름 (갈등 상황이 아님)
    // 2-1. 메시지를 대화 기록에 추가하고 학습 진행
    await addUltimateMessage(speaker, message);
    
    // 2-2. AI가 응답을 생성하도록 신호 반환
    contextLog('💬 일반 대화 흐름으로 진행 (AI 응답 생성 필요)');
    return { response: null, source: 'AI', type: 'normal' };
}


// ==================== 🎯 컨텍스트 조합 및 프롬프트 생성 (갈등 상태 연동) ====================

/**
 * ✨ 모든 정보를 조합하여 GPT 모델별 최적화된 컨텍스트 프롬프트 생성
 */
async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // ✨ 현재 GPT 모델 설정 확인
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
        const contextLength = getOptimalContextLength();
        const priority = getContextPriority(currentModel);
        
        contextLog(`컨텍스트 생성 (모델: ${currentModel}, 우선순위: 메시지=${priority.recentMessages}, 감정=${priority.emotions}, 기억=${priority.memories})`);
        
        // 1. ✨ 모델별 최적화된 최근 대화 추가
        const recentMessages = getRecentMessages(contextLength.recent);
        if (recentMessages.length > 0 && priority.recentMessages > 0) {
            const recentContext = recentMessages.map(msg => 
                `${msg.speaker}: "${msg.message}"`
            ).join('\n');
            
            if (currentModel === '3.5') {
                // GPT-3.5는 간결하게
                contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
            } else {
                // GPT-4o는 풍부하게
                contextualPrompt += `\n\n📋 최근 대화 (${recentMessages.length}개):\n${recentContext}\n`;
            }
        }
        
        // 2. ✨ 모델별 감정 상태 정보 추가
        if (priority.emotions > 0) {
            const emotionalManager = getEmotionalManager();
            if (emotionalManager && emotionalManager.getCurrentEmotionState) {
                try {
                    const emotionState = emotionalManager.getCurrentEmotionState();
                    if (emotionState.description !== '정상기') {
                        if (currentModel === '3.5') {
                            // GPT-3.5는 핵심만
                            contextualPrompt += `\n💭 현재: ${emotionState.description}\n`;
                        } else {
                            // GPT-4o는 상세하게
                            contextualPrompt += `\n💭 현재 감정: ${emotionState.description} (${emotionState.cycleDay}일차)\n`;
                        }
                    }
                } catch (error) {
                    contextLog('감정 상태 조회 실패:', error.message);
                }
            }
        }
        
        // 3. ✨ 모델별 동적 기억 추가 (💾 파일에서 최신 데이터 로드)
        if (priority.memories > 0) {
            await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
            const memoryCount = contextLength.memory;
            const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-memoryCount);
            
            if (recentMemories.length > 0) {
                const memoryContext = recentMemories.map(m => m.content).join('. ');
                
                if (currentModel === '3.5') {
                    // GPT-3.5는 간단하게
                    contextualPrompt += `\n🧠 기억: ${memoryContext}\n`;
                } else {
                    // GPT-4o는 상세하게
                    contextualPrompt += `\n🧠 최근 기억 (${recentMemories.length}개): ${memoryContext}\n`;
                }
            }
        }
        
        // 4. 🧠 최근 학습 내용 추가 (새로 추가!) - 💾 파일에서 최신 데이터 로드
        const recentLearning = await getAllDynamicLearning();
        if (recentLearning.length > 0) {
            const lastFewLearning = recentLearning.slice(-3); // 최근 3개만
            const learningContext = lastFewLearning.map(l => `[${l.category}] ${l.content}`).join('. ');
            
            if (currentModel === '4.0') {
                contextualPrompt += `\n📚 최근 학습: ${learningContext}\n`;
            }
        }
        
        // 5. 현재 대화 주제 추가 (모든 모델에서 사용)
        if (ultimateConversationState.conversationContext.currentTopic) {
            contextualPrompt += `\n🎯 현재 주제: ${ultimateConversationState.conversationContext.currentTopic}\n`;
        }

        // 6. 💔 [수정] 통합 갈등 상태 추가
        const conflictManager = getConflictManager();
        if (conflictManager) {
            const conflictState = conflictManager.getMukuCombinedConflictState();
            if (conflictState.overall.hasAnyConflict) {
                let conflictInfo = '';
                if (conflictState.realTimeConflict.active) {
                    conflictInfo = `현재 당신은 사용자와 실시간 갈등 상태입니다 (갈등 종류: ${conflictState.realTimeConflict.type}, 갈등 레벨: ${conflictState.realTimeConflict.level}). 이 갈등을 해결하는 것을 최우선으로 생각하고, 사용자의 감정을 상하게 하지 않도록 조심스럽게 응답해야 합니다.`;
                } else if (conflictState.delayConflict.active) {
                    conflictInfo = `현재 당신은 삐진 상태입니다 (삐짐 레벨: ${conflictState.delayConflict.level}). 사용자의 말에 서운함이 묻어나는 어조로, 하지만 너무 차갑지는 않게 응답해야 합니다.`;
                }
                contextualPrompt += `\n\n💔 중요! 현재 갈등/삐짐 상태:\n${conflictInfo}\n`;
            }
        }

        // 7. ✨ 모델별 추가 메타정보
        if (currentModel === '4.0') {
            // GPT-4o에서만 상세한 메타정보 추가
            const messageCount = ultimateConversationState.conversationContext.recentMessages.length;
            const memoryCount = ultimateConversationState.dynamicMemories.userMemories.length;
            const learningCount = ultimateConversationState.memoryStats.totalLearningEntries;
            contextualPrompt += `\n📊 컨텍스트: 메시지 ${messageCount}개, 기억 ${memoryCount}개, 학습 ${learningCount}개 (💾영구저장)\n`;
        }
        
        contextLog(`컨텍스트 생성 완료 (${currentModel} 최적화, 길이: ${contextualPrompt.length}자)`);
        return contextualPrompt;
        
    } catch (error) {
        console.error('❌ [UltimateContext] 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}


// ... (기타 유틸리티 함수들은 대부분 변경 없음) ...


// ==================== 🔄 시스템 초기화 (💾 영구 저장 시스템 포함!) ====================

/**
 * 감정 시스템 초기화 (호환성) - 💾 완전 누적 시스템으로 업그레이드!
 */
async function initializeEmotionalSystems() {
    contextLog('💾 완전 누적 시스템으로 동적 기억, 대화 컨텍스트 및 학습 시스템 초기화... (디스크 마운트)');
    
    // ✨ GPT 모델 정보 로그
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    contextLog(`현재 GPT 모델: ${currentModel} (💾 디스크 마운트: ${DATA_DIR})`);
    
    // 💾 데이터 디렉토리 생성
    await ensureDataDirectory();
    
    // 💾 모든 영구 데이터 로드
    const loadSuccess = await loadAllDataFromFiles();
    if (loadSuccess) {
        contextLog('💾 영구 저장된 데이터 로드 성공! (디스크 마운트)');
    } else {
        contextLog('ℹ️ 첫 실행 - 새로운 데이터 파일들을 생성합니다 (💾 디스크 마운트)');
    }

    // 💔 [추가] 갈등 관리 시스템 초기화
    const conflictManager = getConflictManager();
    if (conflictManager) {
        try {
            await conflictManager.initializeMukuUnifiedConflictSystem();
            contextLog('🤝 [UltimateContext] 무쿠 통합 갈등 관리 시스템 연동 성공');
        } catch (error) {
            contextLog('❌ [UltimateContext] 무쿠 통합 갈등 관리 시스템 초기화 실패:', error);
        }
    }
    
    // 일일 리셋 확인
    const today = new Date().toDateString();
    if (ultimateConversationState.memoryStats.lastDailyReset !== today) {
        ultimateConversationState.memoryStats.todayMemoryCount = 0;
        ultimateConversationState.memoryStats.todayLearningCount = 0; // 📚 학습 카운트 리셋
        ultimateConversationState.memoryStats.lastDailyReset = today;
        
        // 💾 통계 저장
        await saveMemoryStatsToFile();
    }
    
    // ⭐️ 자발적 메시지 통계 일일 리셋 확인
    const todayDate = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    if (ultimateConversationState.spontaneousMessages.lastResetDate !== todayDate) {
        await resetSpontaneousStats();
    }
    
    // 💾 자동 저장 시스템 시작
    startAutoSaveSystem();
    
    // 📚 시스템 초기화 학습 기록
    await addLearningEntry('완전 누적 시스템 초기화 완료 (디스크 마운트)', '시스템', {
        initTime: new Date().toISOString(),
        gptModel: currentModel,
        persistentSystem: true,
        diskMounted: true,
        storagePath: DATA_DIR,
        loadedDataFiles: Object.keys(PERSISTENT_FILES).length
    });
    
    // 💾 초기화 완료 후 전체 저장
    await saveAllDataToFiles();
    
    contextLog(`✅ 완전 누적 시스템 초기화 완료 - 모든 데이터 디스크 마운트로 완전 영구 저장 보장! (${currentModel} 최적화)`);
    
    // 로드된 데이터 통계 출력
    const stats = await getMemoryStatistics();
    contextLog(`📊 로드된 데이터: 사용자기억 ${stats.user}개, 학습데이터 ${stats.learning.totalEntries}개 (💾 디스크 마운트: ${DATA_DIR})`);
}

// ... (기타 모든 함수들은 여기에 그대로 존재합니다) ...
// ... (getYejinMemories, addUserMemory, etc. all remain the same) ...


// ==================== 📤 모듈 내보내기 (갈등 관리 연동 추가) ==================
contextLog('💾 v38.0 로드 완료 (갈등 관리 시스템 통합, 완전 누적 시스템 - 디스크 마운트로 영구 저장 보장, GPT 모델 버전 전환, 자발적 메시지 통계, 학습 시스템 완전 지원)');

module.exports = {
    // 초기화
    initializeEmotionalSystems,
    
    // 💔 [수정] 메시지 처리 핵심 함수
    handleMessageFlow, // 기존 addUltimateMessage 대신 이 함수를 외부에서 호출
    
    // 메시지 관리 (내부용)
    addUltimateMessage,
    getRecentMessages,
    updateConversationTopic,
    getUltimateContextualPrompt,
    
    // ... (기존의 모든 exports는 그대로 유지) ...
    
    // 타이밍 관리
    updateLastUserMessageTime,
    getLastUserMessageTime,
    processTimeTick,
    
    // 동적 기억 관리 (핵심!) - 💾 완전 영구 저장!
    addUserMemory,
    deleteUserMemory,
    updateUserMemory,
    getYejinMemories,
    getMemoryById,
    getMemoriesByTag,
    getAllMemories,
    getActiveMemoryPrompt,
    
    // 📚 학습 시스템 (💾 완전 영구 저장!)
    getAllDynamicLearning,      // ⭐️ 일기장용 핵심 함수!
    addLearningEntry,
    getLearningByCategory,
    getTodayLearning,
    getLearningStatistics,
    analyzeMessageForNewInfo,   // 메시지 분석 함수
    processAutoLearning,        // 자동 학습 처리
    
    // ⭐️ 자발적 메시지 통계 관리 (💾 완전 영구 저장!)
    recordSpontaneousMessage,
    setNextSpontaneousTime,
    getSpontaneousStats,        // ⭐️ 라인 상태 리포트용 핵심 함수!
    resetSpontaneousStats,
    
    // 💾 영구 저장 시스템 관리
    saveAllDataToFiles,
    loadAllDataFromFiles,
    manualSaveAllData,
    manualCreateBackup,
    getPersistentSystemStatus,

    // 💔 [추가] 갈등 관리 시스템 상태 조회 함수
    getMukuConflictSystemStatus: () => {
        const conflictManager = getConflictManager();
        return conflictManager ? conflictManager.getMukuConflictSystemStatus() : null;
    },
    getMukuCombinedConflictState: () => {
        const conflictManager = getConflictManager();
        return conflictManager ? conflictManager.getMukuCombinedConflictState() : null;
    },

    // 감정 상태 연동 (보조) - 삐짐 상태는 sulkyManager.js에서 독립 관리
    analyzeUserMood,
    
    // 학습
    learnFromConversation,
    learnFromUserMessage,
    
    // 액션 관리
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    
    // 통계 및 상태
    getMemoryStatistics,
    getMemoryCategoryStats,
    getMemoryOperationLogs,
    getInternalState,
    
    // 유틸리티
    setConversationContextWindow,
    generateInitiatingPhrase,
    
    // ✨ GPT 모델 최적화 함수들 추가
    getOptimalContextLength,
    getContextPriority,
    
    // 호환성 (기존 시스템과의 연동)
    addMemoryContext: addUserMemory,  // 별칭
    getMoodState: () => {             // 감정 상태는 외부 모듈 참조
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            return emotionalManager.getCurrentEmotionState();
        }
        return { phase: 'normal', description: '정상', emotion: 'normal' };
    }
};
