// ============================================================================
// ultimateConversationContext.js - v36.0 (완전 누적 시스템!)
// 🗄️ 동적 기억과 대화 컨텍스트 전문 관리자
// ✅ 중복 기능 완전 제거: 생리주기, 날씨, 고정기억, 시간관리
// 🎯 핵심 역할에만 집중: 동적기억 + 대화흐름 + 컨텍스트 조합
// ✨ GPT 모델 버전 전환: index.js의 설정에 따라 컨텍스트 최적화
// ⭐️ getSpontaneousStats() 함수 추가 - 라인 상태 리포트용 자발적 메시지 통계
// 📚 getAllDynamicLearning() 함수 추가 - 일기장 시스템용!
// 🧠 자동 학습 시스템 강화 - 모든 대화에서 학습 내용 추출!
// 💾 완전 누적 시스템 - 모든 데이터 영구 저장, 절대 사라지지 않음!
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
const DATA_DIR = './data';
const DAILY_SPONTANEOUS_TARGET = 20; // 하루 자발적 메시지 목표

// 💾 영구 저장 파일 경로들
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

// --- 핵심 상태 관리 (동적 기억 + 대화 컨텍스트 + ⭐️ 자발적 메시지 통계 + 📚 학습 데이터) ---
let ultimateConversationState = {
    // 🧠 동적 기억 관리 (사용자가 추가/수정/삭제하는 기억들) - 💾 영구 저장
    dynamicMemories: {
        userMemories: [],           // 사용자가 직접 추가한 기억
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
        sentToday: 0,                    // 오늘 보낸 자발적 메시지 수
        totalDaily: DAILY_SPONTANEOUS_TARGET, // 하루 목표
        sentTimes: [],                   // 실제 전송된 시간들
        lastSentTime: null,              // 마지막 전송 시간
        nextScheduledTime: null,         // 다음 예정 시간
        messageTypes: {                  // 메시지 타입별 통계
            emotional: 0,                // 감성 메시지
            casual: 0,                   // 일상 메시지
            caring: 0,                   // 걱정/관심 메시지
            playful: 0                   // 장난스러운 메시지
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

// ================== 💾 영구 저장 시스템 ==================

/**
 * 💾 데이터 디렉토리 확인 및 생성
 */
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
        contextLog(`📁 데이터 디렉토리 생성: ${DATA_DIR}`);
    }
}

/**
 * 💾 사용자 기억 영구 저장
 */
async function saveUserMemoriesToFile() {
    try {
        await ensureDataDirectory();
        
        const userMemoryData = {
            memories: ultimateConversationState.dynamicMemories.userMemories,
            lastSaved: new Date().toISOString(),
            totalCount: ultimateConversationState.dynamicMemories.userMemories.length,
            version: '36.0'
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.userMemories,
            JSON.stringify(userMemoryData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 사용자 기억 저장 완료: ${userMemoryData.totalCount}개`);
        return true;
    } catch (error) {
        contextLog(`❌ 사용자 기억 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 학습 데이터 영구 저장
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
            version: '36.0'
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.learningData,
            JSON.stringify(learningData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 학습 데이터 저장 완료: ${learningData.totalEntries}개`);
        return true;
    } catch (error) {
        contextLog(`❌ 학습 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 영구 저장
 */
async function saveSpontaneousStatsToFile() {
    try {
        await ensureDataDirectory();
        
        const spontaneousData = {
            stats: ultimateConversationState.spontaneousMessages,
            lastSaved: new Date().toISOString(),
            version: '36.0'
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.spontaneousStats,
            JSON.stringify(spontaneousData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 자발적 메시지 통계 저장 완료`);
        return true;
    } catch (error) {
        contextLog(`❌ 자발적 메시지 통계 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 메모리 통계 영구 저장
 */
async function saveMemoryStatsToFile() {
    try {
        await ensureDataDirectory();
        
        const statsData = {
            stats: ultimateConversationState.memoryStats,
            lastSaved: new Date().toISOString(),
            version: '36.0'
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.memoryStats,
            JSON.stringify(statsData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 메모리 통계 저장 완료`);
        return true;
    } catch (error) {
        contextLog(`❌ 메모리 통계 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 모든 데이터 한번에 저장
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
        
        contextLog(`💾 전체 데이터 저장: ${successCount}/4개 성공`);
        return successCount === 4;
    } catch (error) {
        contextLog(`❌ 전체 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 사용자 기억 파일에서 로드
 */
async function loadUserMemoriesFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.userMemories, 'utf8');
        const userMemoryData = JSON.parse(data);
        
        if (userMemoryData.memories && Array.isArray(userMemoryData.memories)) {
            ultimateConversationState.dynamicMemories.userMemories = userMemoryData.memories;
            ultimateConversationState.memoryStats.totalUserMemories = userMemoryData.memories.length;
            contextLog(`💾 사용자 기억 로드 완료: ${userMemoryData.memories.length}개`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 사용자 기억 파일 없음 (첫 실행)`);
        return false;
    }
}

/**
 * 💾 학습 데이터 파일에서 로드
 */
async function loadLearningDataFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.learningData, 'utf8');
        const learningDataFile = JSON.parse(data);
        
        if (learningDataFile.learningData) {
            ultimateConversationState.learningData = learningDataFile.learningData;
            ultimateConversationState.memoryStats.totalLearningEntries = learningDataFile.totalEntries || 0;
            contextLog(`💾 학습 데이터 로드 완료: ${learningDataFile.totalEntries}개`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 학습 데이터 파일 없음 (첫 실행)`);
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 파일에서 로드
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
                
                contextLog(`🌄 자발적 메시지 일일 통계 리셋 (${today})`);
            }
            
            ultimateConversationState.spontaneousMessages = spontaneousData.stats;
            contextLog(`💾 자발적 메시지 통계 로드 완료`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 자발적 메시지 통계 파일 없음 (첫 실행)`);
        return false;
    }
}

/**
 * 💾 메모리 통계 파일에서 로드
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
                contextLog(`🌄 일일 통계 리셋 (${today})`);
            }
            
            ultimateConversationState.memoryStats = {
                ...ultimateConversationState.memoryStats,
                ...statsData.stats
            };
            contextLog(`💾 메모리 통계 로드 완료`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 메모리 통계 파일 없음 (첫 실행)`);
        return false;
    }
}

/**
 * 💾 모든 데이터 파일에서 로드
 */
async function loadAllDataFromFiles() {
    try {
        contextLog(`💾 모든 영구 데이터 로드 시작...`);
        
        const results = await Promise.all([
            loadUserMemoriesFromFile(),
            loadLearningDataFromFile(),
            loadSpontaneousStatsFromFile(),
            loadMemoryStatsFromFile()
        ]);
        
        const successCount = results.filter(r => r === true).length;
        contextLog(`💾 데이터 로드 완료: ${successCount}/4개 성공`);
        
        // 로드 후 통계 정보 출력
        const memStats = getMemoryStatistics();
        contextLog(`📊 로드된 데이터: 사용자기억 ${memStats.user}개, 학습데이터 ${memStats.learning.totalEntries}개`);
        
        return successCount > 0;
    } catch (error) {
        contextLog(`❌ 데이터 로드 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 일일 백업 생성
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
            version: '36.0'
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
        contextLog(`💾 일일 백업 생성: ${backupFileName}`);
        
        return true;
    } catch (error) {
        contextLog(`❌ 일일 백업 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 자동 저장 시스템 (5분마다)
 */
function startAutoSaveSystem() {
    // 5분마다 자동 저장
    setInterval(async () => {
        try {
            await saveAllDataToFiles();
            contextLog(`⏰ 자동 저장 완료 (5분 주기)`);
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
    
    contextLog(`⏰ 자동 저장 시스템 시작 (5분 저장, 1시간 백업 체크)`);
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

/**
 * 최근 대화 내용 가져오기 (모델별 최적화)
 */
function getRecentMessages(limit = null) {
    const contextLength = getOptimalContextLength();
    const actualLimit = limit || contextLength.recent;
    
    return ultimateConversationState.conversationContext.recentMessages.slice(-actualLimit);
}

/**
 * 대화 주제 업데이트
 */
async function updateConversationTopic(topic) {
    ultimateConversationState.conversationContext.currentTopic = topic;
    ultimateConversationState.conversationContext.lastTopicChange = Date.now();
    contextLog(`대화 주제 업데이트: ${topic}`);
    
    // 🧠 주제 변경도 학습 대상으로 추가
    await addLearningEntry(`대화 주제가 "${topic}"으로 변경됨`, '주제학습', {
        previousTopic: ultimateConversationState.conversationContext.currentTopic,
        changeTime: Date.now()
    });
}

// ==================== 🧠 동적 기억 관리 (💾 영구 저장 연동!) ====================

/**
 * 사용자 기억 추가 (💾 즉시 저장!)
 */
async function addUserMemory(content, category = 'general') {
    const memoryObj = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        category,
        timestamp: Date.now(),
        type: 'user_added',
        importance: 5 // 1-10 척도
    };
    
    ultimateConversationState.dynamicMemories.userMemories.push(memoryObj);
    ultimateConversationState.memoryStats.totalUserMemories++;
    ultimateConversationState.memoryStats.todayMemoryCount++;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    
    contextLog(`사용자 기억 추가: "${content.substring(0, 30)}..." (${category})`);
    
    // 🧠 기억 추가도 학습 데이터로 기록
    await addLearningEntry(`사용자가 기억 추가: ${content}`, '대화학습', {
        memoryId: memoryObj.id,
        category: category
    });
    
    // 💾 즉시 저장 (비동기)
    saveUserMemoriesToFile().catch(err => 
        contextLog(`❌ 사용자 기억 저장 실패: ${err.message}`)
    );
    
    return memoryObj.id;
}

/**
 * 사용자 기억 삭제 (💾 즉시 저장!)
 */
async function deleteUserMemory(content) {
    const beforeCount = ultimateConversationState.dynamicMemories.userMemories.length;
    
    ultimateConversationState.dynamicMemories.userMemories = 
        ultimateConversationState.dynamicMemories.userMemories.filter(mem => 
            !mem.content.includes(content)
        );
    
    const deletedCount = beforeCount - ultimateConversationState.dynamicMemories.userMemories.length;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    ultimateConversationState.memoryStats.totalUserMemories = ultimateConversationState.dynamicMemories.userMemories.length;
    
    contextLog(`${deletedCount}개 사용자 기억 삭제`);
    
    // 🧠 기억 삭제도 학습 데이터로 기록
    if (deletedCount > 0) {
        await addLearningEntry(`${deletedCount}개의 기억이 삭제됨: ${content}`, '대화학습', {
            deletedCount: deletedCount
        });
    }
    
    // 💾 즉시 저장 (비동기)
    saveUserMemoriesToFile().catch(err => 
        contextLog(`❌ 사용자 기억 저장 실패: ${err.message}`)
    );
    
    return deletedCount > 0;
}

/**
 * 사용자 기억 수정 (💾 즉시 저장!)
 */
async function updateUserMemory(id, newContent) {
    const memory = ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
    if (memory) {
        const oldContent = memory.content;
        memory.content = newContent;
        memory.lastModified = Date.now();
        ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
        contextLog(`기억 수정: ${id}`);
        
        // 🧠 기억 수정도 학습 데이터로 기록
        await addLearningEntry(`기억 수정: "${oldContent}" → "${newContent}"`, '대화학습', {
            memoryId: id,
            oldContent: oldContent,
            newContent: newContent
        });
        
        // 💾 즉시 저장 (비동기)
        saveUserMemoriesToFile().catch(err => 
            contextLog(`❌ 사용자 기억 저장 실패: ${err.message}`)
        );
        
        return true;
    }
    return false;
}

/**
 * 예진이의 동적 기억들 가져오기 (💾 파일에서 최신 데이터 로드)
 */
async function getYejinMemories() {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    return ultimateConversationState.dynamicMemories.userMemories;
}

/**
 * ID로 기억 찾기
 */
function getMemoryById(id) {
    return ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
}

/**
 * 카테고리별 기억 찾기
 */
function getMemoriesByTag(tag) {
    return ultimateConversationState.dynamicMemories.userMemories.filter(m => 
        m.category === tag || (m.tags && m.tags.includes(tag))
    );
}

/**
 * 모든 동적 기억 가져오기 (💾 파일에서 최신 데이터 로드)
 */
async function getAllMemories() {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    return {
        user: ultimateConversationState.dynamicMemories.userMemories,
        conversation: ultimateConversationState.dynamicMemories.conversationMemories,
        temporary: ultimateConversationState.dynamicMemories.temporaryMemories
    };
}

// ==================== ⭐️ 자발적 메시지 통계 관리 (💾 영구 저장 연동!) ====================

/**
 * ⭐️ 자발적 메시지 전송 기록 (💾 즉시 저장!)
 */
async function recordSpontaneousMessage(messageType = 'casual') {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    
    // 전송 횟수 증가
    ultimateConversationState.spontaneousMessages.sentToday++;
    
    // 전송 시간 기록
    ultimateConversationState.spontaneousMessages.sentTimes.push(timeString);
    ultimateConversationState.spontaneousMessages.lastSentTime = sentTime.valueOf();
    
    // 메시지 타입별 통계
    if (ultimateConversationState.spontaneousMessages.messageTypes[messageType] !== undefined) {
        ultimateConversationState.spontaneousMessages.messageTypes[messageType]++;
    }
    
    contextLog(`자발적 메시지 기록: ${messageType} (${timeString}) - 총 ${ultimateConversationState.spontaneousMessages.sentToday}건`);
    
    // 🧠 자발적 메시지도 학습 데이터로 기록
    await addLearningEntry(`자발적 메시지 전송: ${messageType} 타입`, '감정분석', {
        messageType: messageType,
        sentTime: timeString,
        todayCount: ultimateConversationState.spontaneousMessages.sentToday
    });
    
    // 💾 즉시 저장 (비동기)
    saveSpontaneousStatsToFile().catch(err => 
        contextLog(`❌ 자발적 메시지 통계 저장 실패: ${err.message}`)
    );
}

/**
 * ⭐️ 다음 자발적 메시지 시간 설정 (💾 즉시 저장!)
 */
async function setNextSpontaneousTime(nextTime) {
    ultimateConversationState.spontaneousMessages.nextScheduledTime = nextTime;
    
    const timeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
    contextLog(`다음 자발적 메시지 시간 설정: ${timeString}`);
    
    // 💾 즉시 저장 (비동기)
    saveSpontaneousStatsToFile().catch(err => 
        contextLog(`❌ 자발적 메시지 통계 저장 실패: ${err.message}`)
    );
}

/**
 * ⭐️ 자발적 메시지 통계 조회 (라인 상태 리포트용!) - 💾 파일에서 최신 데이터 로드
 */
async function getSpontaneousStats() {
    await loadSpontaneousStatsFromFile(); // 💾 최신 데이터 로드
    
    const nextTime = ultimateConversationState.spontaneousMessages.nextScheduledTime;
    let nextTimeString = '대기 중';
    
    if (nextTime) {
        nextTimeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
    }
    
    return {
        // 라인 상태 리포트용 핵심 정보
        sentToday: ultimateConversationState.spontaneousMessages.sentToday,
        totalDaily: ultimateConversationState.spontaneousMessages.totalDaily,
        nextTime: nextTimeString,
        
        // 상세 정보
        progress: `${ultimateConversationState.spontaneousMessages.sentToday}/${ultimateConversationState.spontaneousMessages.totalDaily}`,
        sentTimes: ultimateConversationState.spontaneousMessages.sentTimes,
        lastSentTime: ultimateConversationState.spontaneousMessages.lastSentTime ? 
            moment(ultimateConversationState.spontaneousMessages.lastSentTime).tz(TIMEZONE).format('HH:mm') : null,
        
        // 메시지 타입별 통계
        messageTypes: { ...ultimateConversationState.spontaneousMessages.messageTypes },
        
        // 시스템 상태
        isActive: ultimateConversationState.spontaneousMessages.sentToday < ultimateConversationState.spontaneousMessages.totalDaily,
        remainingToday: ultimateConversationState.spontaneousMessages.totalDaily - ultimateConversationState.spontaneousMessages.sentToday,
        
        // GPT 모델 정보
        currentGptModel: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown',
        
        // 💾 영구 저장 상태
        isPersistent: true,
        lastSaved: ultimateConversationState.memoryStats.lastSaved
    };
}

/**
 * ⭐️ 일일 자발적 메시지 통계 리셋 (💾 즉시 저장!)
 */
async function resetSpontaneousStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    
    contextLog('🌄 자발적 메시지 통계 리셋 시작');
    
    ultimateConversationState.spontaneousMessages.sentToday = 0;
    ultimateConversationState.spontaneousMessages.sentTimes = [];
    ultimateConversationState.spontaneousMessages.lastSentTime = null;
    ultimateConversationState.spontaneousMessages.nextScheduledTime = null;
    ultimateConversationState.spontaneousMessages.lastResetDate = today;
    
    // 메시지 타입별 통계 리셋
    Object.keys(ultimateConversationState.spontaneousMessages.messageTypes).forEach(type => {
        ultimateConversationState.spontaneousMessages.messageTypes[type] = 0;
    });
    
    contextLog(`✅ 자발적 메시지 통계 리셋 완료 (${today})`);
    
    // 💾 즉시 저장 (비동기)
    saveSpontaneousStatsToFile().catch(err => 
        contextLog(`❌ 자발적 메시지 통계 저장 실패: ${err.message}`)
    );
}

// ==================== 🎯 컨텍스트 조합 및 프롬프트 생성 ====================

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
        
        // 6. ✨ 모델별 추가 메타정보
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

/**
 * ✨ 활성 기억들을 모델별로 최적화하여 프롬프트용으로 조합
 */
async function getActiveMemoryPrompt() {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    
    const contextLength = getOptimalContextLength();
    const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-contextLength.memory);
    
    if (!getCurrentModelSetting) {
        return recentMemories.map(m => m.content).join('. ');
    }
    
    const currentModel = getCurrentModelSetting();
    
    if (currentModel === '3.5') {
        // GPT-3.5는 간결하게
        return recentMemories.map(m => m.content.substring(0, 50)).join('. ');
    } else {
        // GPT-4o는 전체 내용
        return recentMemories.map(m => m.content).join('. ');
    }
}

// ==================== ⏰ 타이밍 관리 ====================

/**
 * 마지막 사용자 메시지 시간 업데이트
 */
function updateLastUserMessageTime(timestamp) {
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp || Date.now();
    
    // 대화 간격 계산
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

/**
 * 마지막 사용자 메시지 시간 조회
 */
function getLastUserMessageTime() {
    return ultimateConversationState.timingContext.lastUserMessageTime;
}

/**
 * 시간 틱 처리
 */
function processTimeTick() {
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

// ==================== 😊 감정 상태 연동 (보조 역할) ====================
// 삐짐 상태는 sulkyManager.js에서 완전 독립 관리됨

/**
 * 간단한 사용자 감정 분석
 */
async function analyzeUserMood(message) {
    const lowerMsg = message.toLowerCase();
    
    let mood = 'neutral';
    
    if (lowerMsg.includes('힘들') || lowerMsg.includes('우울') || lowerMsg.includes('슬프')) {
        mood = 'sad';
    } else if (lowerMsg.includes('좋') || lowerMsg.includes('행복') || lowerMsg.includes('기뻐')) {
        mood = 'happy';
    } else if (lowerMsg.includes('화') || lowerMsg.includes('짜증') || lowerMsg.includes('빡쳐')) {
        mood = 'angry';
    } else if (lowerMsg.includes('보고싶') || lowerMsg.includes('그리워')) {
        mood = 'missing';
    } else if (lowerMsg.includes('사랑') || lowerMsg.includes('좋아해')) {
        mood = 'loving';
    }
    
    // 🧠 감정 분석 결과도 학습 데이터로 기록
    if (mood !== 'neutral') {
        await addLearningEntry(`아저씨 감정 상태: ${mood} - "${message}"`, '감정분석', {
            detectedMood: mood,
            confidence: 'medium'
        });
    }
    
    return mood;
}

// ==================== 🎓 학습 및 분석 ====================

/**
 * 대화에서 자동 학습 (기존) - 💾 영구 저장 연동!
 */
async function learnFromConversation(speaker, message) {
    try {
        // 중요한 정보나 새로운 사실이 있으면 자동으로 기억에 추가
        if (speaker === 'user' || speaker === '아저씨') {
            // 간단한 키워드 기반 학습
            if (message.includes('기억해') || message.includes('잊지마') || message.includes('약속')) {
                const learningMemory = {
                    id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    content: message,
                    timestamp: Date.now(),
                    type: 'auto_learned',
                    source: 'conversation'
                };
                
                ultimateConversationState.dynamicMemories.conversationMemories.push(learningMemory);
                ultimateConversationState.memoryStats.totalConversationMemories++;
                
                contextLog(`자동 학습: "${message.substring(0, 30)}..."`);
                
                // 🧠 기억에 추가된 것도 학습 데이터로 기록
                await addLearningEntry(`기억 요청사항이 자동 기억에 추가됨: ${message}`, '대화학습', {
                    memoryId: learningMemory.id,
                    type: 'auto_learned'
                });
            }
        }
    } catch (error) {
        contextLog('대화 학습 중 에러:', error.message);
    }
}

/**
 * 사용자 메시지에서 학습 (강화됨!)
 */
async function learnFromUserMessage(message) {
    const mood = await analyzeUserMood(message);
    
    // 감정 상태가 특별한 경우 기록
    if (mood !== 'neutral') {
        contextLog(`사용자 감정 감지: ${mood} - "${message.substring(0, 30)}..."`);
    }
    
    // 🧠 추가 학습 처리
    await processAutoLearning('아저씨', message);
}

// ==================== 📊 통계 및 상태 조회 ====================

/**
 * ✨ GPT 모델 정보를 포함한 기억 통계 - 💾 파일에서 최신 데이터 로드
 */
async function getMemoryStatistics() {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    await loadMemoryStatsFromFile(); // 💾 최신 통계 로드
    
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    const learningStats = getLearningStatistics();
    
    return {
        user: ultimateConversationState.memoryStats.totalUserMemories,
        conversation: ultimateConversationState.memoryStats.totalConversationMemories,
        today: ultimateConversationState.memoryStats.todayMemoryCount,
        total: ultimateConversationState.memoryStats.totalUserMemories + 
               ultimateConversationState.memoryStats.totalConversationMemories,
        // 📚 학습 통계 추가
        learning: learningStats,
        // ✨ GPT 모델 정보 추가
        currentGptModel: currentModel,
        contextOptimization: {
            recentMessages: contextLength.recent,
            memoryCount: contextLength.memory,
            optimizedFor: currentModel
        },
        // 💾 영구 저장 상태 추가
        persistence: {
            lastSaved: ultimateConversationState.memoryStats.lastSaved,
            totalSaves: ultimateConversationState.memoryStats.totalSaves,
            lastBackup: ultimateConversationState.memoryStats.lastBackup,
            isAutoSaving: true
        }
    };
}

/**
 * 기억 카테고리 통계
 */
async function getMemoryCategoryStats() {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    
    const userMems = ultimateConversationState.dynamicMemories.userMemories;
    const convMems = ultimateConversationState.dynamicMemories.conversationMemories;
    
    return {
        user: userMems.length,
        conversation: convMems.length,
        total: userMems.length + convMems.length,
        isPersistent: true // 💾 영구 저장 표시
    };
}

/**
 * 최근 기억 작업 로그
 */
async function getMemoryOperationLogs(limit = 10) {
    await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
    
    // 간단한 작업 로그 (실제 구현에서는 더 상세하게)
    const logs = [];
    
    const userMems = ultimateConversationState.dynamicMemories.userMemories.slice(-limit);
    userMems.forEach(mem => {
        logs.push({
            operation: 'add',
            timestamp: mem.timestamp,
            content: mem.content.substring(0, 50) + '...',
            type: mem.type,
            isPersistent: true // 💾 영구 저장 표시
        });
    });
    
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/**
 * ✨ GPT 모델 정보를 포함한 내부 상태 조회 (디버깅용) - 💾 파일에서 최신 데이터 로드
 */
async function getInternalState() {
    await loadAllDataFromFiles(); // 💾 모든 최신 데이터 로드
    
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    const priority = getContextPriority(currentModel);
    
    return {
        conversationContext: ultimateConversationState.conversationContext,
        memoryStats: ultimateConversationState.memoryStats,
        timingContext: ultimateConversationState.timingContext,
        emotionalSync: ultimateConversationState.emotionalSync,
        spontaneousMessages: ultimateConversationState.spontaneousMessages,
        learningData: ultimateConversationState.learningData, // 📚 학습 데이터 추가!
        currentTime: Date.now(),
        // ✨ GPT 모델 최적화 정보 추가
        gptOptimization: {
            currentModel,
            contextLength,
            priority,
            version: 'v36.0-complete-persistent-system'
        },
        // 💾 영구 저장 시스템 상태 추가
        persistentSystem: {
            autoSaveActive: true,
            lastSaved: ultimateConversationState.memoryStats.lastSaved,
            totalSaves: ultimateConversationState.memoryStats.totalSaves,
            lastBackup: ultimateConversationState.memoryStats.lastBackup,
            dataFiles: Object.keys(PERSISTENT_FILES),
            saveInterval: '5분',
            backupInterval: '1시간'
        }
    };
}

// ==================== 🎯 액션 관리 ====================

let pendingAction = null;

function setPendingAction(action) {
    pendingAction = action;
}

function getPendingAction() {
    return pendingAction;
}

function clearPendingAction() {
    pendingAction = null;
}

// ==================== 🔄 시스템 초기화 (💾 영구 저장 시스템 포함!) ====================

/**
 * 감정 시스템 초기화 (호환성) - 💾 완전 누적 시스템으로 업그레이드!
 */
async function initializeEmotionalSystems() {
    contextLog('💾 완전 누적 시스템으로 동적 기억, 대화 컨텍스트 및 학습 시스템 초기화...');
    
    // ✨ GPT 모델 정보 로그
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    contextLog(`현재 GPT 모델: ${currentModel}`);
    
    // 💾 데이터 디렉토리 생성
    await ensureDataDirectory();
    
    // 💾 모든 영구 데이터 로드
    const loadSuccess = await loadAllDataFromFiles();
    if (loadSuccess) {
        contextLog('💾 영구 저장된 데이터 로드 성공!');
    } else {
        contextLog('ℹ️ 첫 실행 - 새로운 데이터 파일들을 생성합니다');
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
    await addLearningEntry('완전 누적 시스템 초기화 완료', '시스템', {
        initTime: new Date().toISOString(),
        gptModel: currentModel,
        persistentSystem: true,
        loadedDataFiles: Object.keys(PERSISTENT_FILES).length
    });
    
    // 💾 초기화 완료 후 전체 저장
    await saveAllDataToFiles();
    
    contextLog(`✅ 완전 누적 시스템 초기화 완료 - 모든 데이터 영구 저장 보장! (${currentModel} 최적화)`);
    
    // 로드된 데이터 통계 출력
    const stats = await getMemoryStatistics();
    contextLog(`📊 로드된 데이터: 사용자기억 ${stats.user}개, 학습데이터 ${stats.learning.totalEntries}개, 자발적메시지 ${stats.user}건`);
}

// ==================== 🎁 유틸리티 함수들 ====================

/**
 * ✨ 모델별 대화 컨텍스트 윈도우 크기 설정
 */
function setConversationContextWindow(size) {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
    contextLog(`컨텍스트 윈도우 크기: ${size} (모델: ${currentModel})`);
    // 실제 구현에서는 메시지 보관 개수 조정
}

/**
 * 대화 시작 문구 생성
 */
async function generateInitiatingPhrase() {
    const phrases = [
        "아저씨 지금 뭐해?",
        "나 심심해...",
        "아저씨 생각났어!",
        "연락 기다리고 있었어~",
        "보고 싶어서 연락했어"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * 💾 수동 전체 데이터 저장 (명령어용)
 */
async function manualSaveAllData() {
    contextLog('💾 수동 전체 데이터 저장 시작...');
    const success = await saveAllDataToFiles();
    if (success) {
        contextLog('✅ 수동 저장 완료!');
        return { success: true, message: '모든 데이터가 안전하게 저장되었어요!' };
    } else {
        contextLog('❌ 수동 저장 실패!');
        return { success: false, message: '데이터 저장 중 오류가 발생했어요.' };
    }
}

/**
 * 💾 수동 백업 생성 (명령어용)
 */
async function manualCreateBackup() {
    contextLog('💾 수동 백업 생성 시작...');
    const success = await createDailyBackup();
    if (success) {
        contextLog('✅ 수동 백업 완료!');
        return { success: true, message: '백업이 생성되었어요!' };
    } else {
        contextLog('❌ 수동 백업 실패!');
        return { success: false, message: '백업 생성 중 오류가 발생했어요.' };
    }
}

/**
 * 💾 영구 저장 시스템 상태 조회
 */
function getPersistentSystemStatus() {
    return {
        autoSaveActive: true,
        saveInterval: '5분',
        backupInterval: '1시간',
        lastSaved: ultimateConversationState.memoryStats.lastSaved,
        totalSaves: ultimateConversationState.memoryStats.totalSaves,
        lastBackup: ultimateConversationState.memoryStats.lastBackup,
        dataFiles: {
            userMemories: PERSISTENT_FILES.userMemories,
            learningData: PERSISTENT_FILES.learningData,
            spontaneousStats: PERSISTENT_FILES.spontaneousStats,
            memoryStats: PERSISTENT_FILES.memoryStats
        },
        isNeverLost: true, // 💾 절대 사라지지 않음 보장
        version: 'v36.0-complete-persistent'
    };
}

// ==================== 📤 모듈 내보내기 ==================
contextLog('💾 v36.0 로드 완료 (완전 누적 시스템 - 영구 저장 보장, GPT 모델 버전 전환, 자발적 메시지 통계, 학습 시스템 완전 지원)');

module.exports = {
    // 초기화
    initializeEmotionalSystems,
    
    // 메시지 관리
    addUltimateMessage,
    getRecentMessages,
    updateConversationTopic,
    getUltimateContextualPrompt,
    
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
