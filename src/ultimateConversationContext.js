// ============================================================================
// ultimateConversationContext.js - v37.1 DISK_MOUNT + CONFLICT (갈등 시스템 완전 통합!) - ERROR FIXED
// 🗄️ 동적 기억과 대화 컨텍스트 전문 관리자
// 💾 디스크 마운트 경로 적용: ./data → /data (완전 영구 저장!)
// 💥 갈등 시스템 완전 통합: unifiedConflictManager와 완벽 연동!
// ✅ 중복 기능 완전 제거: 생리주기, 날씨, 고정기억, 시간관리
// 🎯 핵심 역할에만 집중: 동적기억 + 대화흐름 + 컨텍스트 조합 + 갈등학습
// ✨ GPT 모델 버전 전환: index.js의 설정에 따라 컨텍스트 최적화
// ⭐️ getSpontaneousStats() 함수 추가 - 라인 상태 리포트용 자발적 메시지 통계
// 📚 getAllDynamicLearning() 함수 추가 - 일기장 시스템용!
// 🧠 자동 학습 시스템 강화 - 모든 대화에서 학습 내용 추출!
// 💔 갈등 시스템 완전 연동 - 갈등 감지, 학습, 패턴 분석, 해소 추적!
// 💾 완전 누적 시스템 - 모든 데이터 영구 저장, 절대 사라지지 않음!
// 🔧 디스크 마운트: 서버 재시작/재배포시에도 절대 사라지지 않는 완전한 영구 저장!
// 🛠️ ERROR FIXED: undefined 배열 접근 에러 완전 해결!
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
    dailyBackup: path.join(DATA_DIR, 'daily_backup.json'),
    conflictLearning: path.join(DATA_DIR, 'conflict_learning_persistent.json') // 💥 갈등 학습 데이터 추가
};

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let emotionalContextManager = null;
let memoryManager = null;
let weatherManager = null;
let unifiedConflictManager = null; // 💥 갈등 매니저 추가

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

// 💥 갈등 매니저 로딩 함수 추가
function getConflictManager() {
    if (!unifiedConflictManager) {
        try {
            unifiedConflictManager = require('./muku-unifiedConflictManager');
            console.log('💥 [UltimateContext] unifiedConflictManager 로드 성공');
        } catch (error) {
            console.log('⚠️ [UltimateContext] unifiedConflictManager 로드 실패:', error.message);
        }
    }
    return unifiedConflictManager;
}

// 🛠️ 안전한 배열 접근을 위한 헬퍼 함수
function ensureArray(arr) {
    return Array.isArray(arr) ? arr : [];
}

function safeArrayLength(arr) {
    return Array.isArray(arr) ? arr.length : 0;
}

// 🛠️ 안전한 객체 접근을 위한 헬퍼 함수
function ensureObject(obj) {
    return (obj && typeof obj === 'object') ? obj : {};
}

// --- 핵심 상태 관리 (동적 기억 + 대화 컨텍스트 + ⭐️ 자발적 메시지 통계 + 📚 학습 데이터 + 💥 갈등 데이터) ---
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
        topicLearning: [],          // 주제별 학습 내용
        conflictLearning: []        // 💥 갈등별 학습 내용 추가
    },
    
    // 💥 갈등 관련 상태 추가
    conflictContext: {
        recentConflictSignals: [],  // 최근 갈등 신호들
        conflictPatterns: [],       // 갈등 패턴 분석 결과
        lastConflictDetection: null,// 마지막 갈등 감지 시간
        activeConflictTriggers: [], // 활성 갈등 트리거들
        resolutionAttempts: []      // 해소 시도 기록
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
        // 💥 갈등 통계 추가!
        totalConflictEvents: 0,
        todayConflictCount: 0,
        lastConflictEvent: null,
        conflictResolutionRate: 0,
        // 💾 영구 저장 관련 메타데이터
        lastSaved: null,
        totalSaves: 0,
        lastBackup: null
    }
};

// 🛠️ 상태 초기화 함수 (안전성 보장)
function ensureStateIntegrity() {
    try {
        // 동적 기억 구조 보장
        if (!ultimateConversationState.dynamicMemories) {
            ultimateConversationState.dynamicMemories = {};
        }
        ultimateConversationState.dynamicMemories.userMemories = ensureArray(ultimateConversationState.dynamicMemories.userMemories);
        ultimateConversationState.dynamicMemories.conversationMemories = ensureArray(ultimateConversationState.dynamicMemories.conversationMemories);
        ultimateConversationState.dynamicMemories.temporaryMemories = ensureArray(ultimateConversationState.dynamicMemories.temporaryMemories);
        
        // 📚 학습 데이터 구조 보장
        if (!ultimateConversationState.learningData) {
            ultimateConversationState.learningData = {};
        }
        ultimateConversationState.learningData.dailyLearning = ensureArray(ultimateConversationState.learningData.dailyLearning);
        ultimateConversationState.learningData.conversationLearning = ensureArray(ultimateConversationState.learningData.conversationLearning);
        ultimateConversationState.learningData.emotionLearning = ensureArray(ultimateConversationState.learningData.emotionLearning);
        ultimateConversationState.learningData.topicLearning = ensureArray(ultimateConversationState.learningData.topicLearning);
        ultimateConversationState.learningData.conflictLearning = ensureArray(ultimateConversationState.learningData.conflictLearning);
        
        // 💥 갈등 컨텍스트 구조 보장
        if (!ultimateConversationState.conflictContext) {
            ultimateConversationState.conflictContext = {};
        }
        ultimateConversationState.conflictContext.recentConflictSignals = ensureArray(ultimateConversationState.conflictContext.recentConflictSignals);
        ultimateConversationState.conflictContext.conflictPatterns = ensureArray(ultimateConversationState.conflictContext.conflictPatterns);
        ultimateConversationState.conflictContext.activeConflictTriggers = ensureArray(ultimateConversationState.conflictContext.activeConflictTriggers);
        ultimateConversationState.conflictContext.resolutionAttempts = ensureArray(ultimateConversationState.conflictContext.resolutionAttempts);
        
        // 대화 컨텍스트 구조 보장
        if (!ultimateConversationState.conversationContext) {
            ultimateConversationState.conversationContext = {};
        }
        ultimateConversationState.conversationContext.recentMessages = ensureArray(ultimateConversationState.conversationContext.recentMessages);
        
        // 자발적 메시지 구조 보장
        if (!ultimateConversationState.spontaneousMessages) {
            ultimateConversationState.spontaneousMessages = {};
        }
        ultimateConversationState.spontaneousMessages.sentTimes = ensureArray(ultimateConversationState.spontaneousMessages.sentTimes);
        if (!ultimateConversationState.spontaneousMessages.messageTypes) {
            ultimateConversationState.spontaneousMessages.messageTypes = {
                emotional: 0,
                casual: 0,
                caring: 0,
                playful: 0
            };
        }
        
        // 메모리 통계 구조 보장
        if (!ultimateConversationState.memoryStats) {
            ultimateConversationState.memoryStats = {
                totalUserMemories: 0,
                totalConversationMemories: 0,
                todayMemoryCount: 0,
                lastDailyReset: null,
                lastMemoryOperation: null,
                totalLearningEntries: 0,
                todayLearningCount: 0,
                lastLearningEntry: null,
                totalConflictEvents: 0,
                todayConflictCount: 0,
                lastConflictEvent: null,
                conflictResolutionRate: 0,
                lastSaved: null,
                totalSaves: 0,
                lastBackup: null
            };
        }
        
        contextLog('🛠️ 상태 무결성 검증 완료');
        return true;
    } catch (error) {
        contextLog('❌ 상태 무결성 검증 실패:', error.message);
        return false;
    }
}

// ================== 💾 영구 저장 시스템 (디스크 마운트) ==================

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
 * 💾 사용자 기억 영구 저장 (디스크 마운트) - 🛠️ 안전성 강화
 */
async function saveUserMemoriesToFile() {
    try {
        await ensureDataDirectory();
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const userMemoryData = {
            memories: ensureArray(ultimateConversationState.dynamicMemories.userMemories),
            lastSaved: new Date().toISOString(),
            totalCount: safeArrayLength(ultimateConversationState.dynamicMemories.userMemories),
            version: '37.1-disk-mount-conflict',
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
 * 💾 학습 데이터 영구 저장 (디스크 마운트 + 갈등 데이터 포함) - 🛠️ 안전성 강화
 */
async function saveLearningDataToFile() {
    try {
        await ensureDataDirectory();
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const learningData = {
            learningData: {
                dailyLearning: ensureArray(ultimateConversationState.learningData.dailyLearning),
                conversationLearning: ensureArray(ultimateConversationState.learningData.conversationLearning),
                emotionLearning: ensureArray(ultimateConversationState.learningData.emotionLearning),
                topicLearning: ensureArray(ultimateConversationState.learningData.topicLearning),
                conflictLearning: ensureArray(ultimateConversationState.learningData.conflictLearning)
            },
            conflictContext: ensureObject(ultimateConversationState.conflictContext),
            lastSaved: new Date().toISOString(),
            totalEntries: ultimateConversationState.memoryStats.totalLearningEntries || 0,
            conflictEvents: ultimateConversationState.memoryStats.totalConflictEvents || 0,
            statistics: {
                daily: safeArrayLength(ultimateConversationState.learningData.dailyLearning),
                conversation: safeArrayLength(ultimateConversationState.learningData.conversationLearning),
                emotion: safeArrayLength(ultimateConversationState.learningData.emotionLearning),
                topic: safeArrayLength(ultimateConversationState.learningData.topicLearning),
                conflict: safeArrayLength(ultimateConversationState.learningData.conflictLearning)
            },
            version: '37.1-disk-mount-conflict-fixed',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.learningData,
            JSON.stringify(learningData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 학습 데이터 저장 완료: ${learningData.totalEntries}개 (갈등: ${learningData.conflictEvents}개) (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 학습 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 영구 저장 (디스크 마운트) - 🛠️ 안전성 강화
 */
async function saveSpontaneousStatsToFile() {
    try {
        await ensureDataDirectory();
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const spontaneousData = {
            stats: {
                ...ultimateConversationState.spontaneousMessages,
                sentTimes: ensureArray(ultimateConversationState.spontaneousMessages.sentTimes),
                messageTypes: ensureObject(ultimateConversationState.spontaneousMessages.messageTypes)
            },
            lastSaved: new Date().toISOString(),
            version: '37.1-disk-mount-conflict-fixed',
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
 * 💾 메모리 통계 영구 저장 (디스크 마운트 + 갈등 통계 포함) - 🛠️ 안전성 강화
 */
async function saveMemoryStatsToFile() {
    try {
        await ensureDataDirectory();
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const statsData = {
            stats: ensureObject(ultimateConversationState.memoryStats),
            lastSaved: new Date().toISOString(),
            version: '37.1-disk-mount-conflict-fixed',
            storagePath: DATA_DIR
        };
        
        await fs.writeFile(
            PERSISTENT_FILES.memoryStats,
            JSON.stringify(statsData, null, 2),
            'utf8'
        );
        
        contextLog(`💾 메모리 통계 저장 완료 (갈등 통계 포함) (디스크 마운트: ${DATA_DIR})`);
        return true;
    } catch (error) {
        contextLog(`❌ 메모리 통계 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 모든 데이터 한번에 저장 (디스크 마운트) - 🛠️ 안전성 강화
 */
async function saveAllDataToFiles() {
    try {
        ensureStateIntegrity(); // 🛠️ 저장 전 상태 무결성 보장
        
        const results = await Promise.all([
            saveUserMemoriesToFile(),
            saveLearningDataToFile(), 
            saveSpontaneousStatsToFile(),
            saveMemoryStatsToFile()
        ]);
        
        const successCount = results.filter(r => r === true).length;
        ultimateConversationState.memoryStats.lastSaved = Date.now();
        ultimateConversationState.memoryStats.totalSaves++;
        
        contextLog(`💾 전체 데이터 저장: ${successCount}/4개 성공 (갈등 시스템 포함) (디스크 마운트: ${DATA_DIR})`);
        return successCount === 4;
    } catch (error) {
        contextLog(`❌ 전체 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 사용자 기억 파일에서 로드 (디스크 마운트) - 🛠️ 안전성 강화
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
        // 🛠️ 빈 배열로 초기화
        ultimateConversationState.dynamicMemories.userMemories = [];
        return false;
    }
}

/**
 * 💾 학습 데이터 파일에서 로드 (디스크 마운트 + 갈등 데이터 포함) - 🛠️ 안전성 강화
 */
async function loadLearningDataFromFile() {
    try {
        const data = await fs.readFile(PERSISTENT_FILES.learningData, 'utf8');
        const learningDataFile = JSON.parse(data);
        
        if (learningDataFile.learningData) {
            // 🛠️ 안전한 로드 with 기본값
            ultimateConversationState.learningData.dailyLearning = ensureArray(learningDataFile.learningData.dailyLearning);
            ultimateConversationState.learningData.conversationLearning = ensureArray(learningDataFile.learningData.conversationLearning);
            ultimateConversationState.learningData.emotionLearning = ensureArray(learningDataFile.learningData.emotionLearning);
            ultimateConversationState.learningData.topicLearning = ensureArray(learningDataFile.learningData.topicLearning);
            ultimateConversationState.learningData.conflictLearning = ensureArray(learningDataFile.learningData.conflictLearning);
            
            ultimateConversationState.memoryStats.totalLearningEntries = learningDataFile.totalEntries || 0;
            
            // 💥 갈등 컨텍스트 로드
            if (learningDataFile.conflictContext) {
                ultimateConversationState.conflictContext = ensureObject(learningDataFile.conflictContext);
                ultimateConversationState.conflictContext.recentConflictSignals = ensureArray(ultimateConversationState.conflictContext.recentConflictSignals);
                ultimateConversationState.conflictContext.conflictPatterns = ensureArray(ultimateConversationState.conflictContext.conflictPatterns);
                ultimateConversationState.conflictContext.activeConflictTriggers = ensureArray(ultimateConversationState.conflictContext.activeConflictTriggers);
                ultimateConversationState.conflictContext.resolutionAttempts = ensureArray(ultimateConversationState.conflictContext.resolutionAttempts);
                
                ultimateConversationState.memoryStats.totalConflictEvents = learningDataFile.conflictEvents || 0;
                contextLog(`💾 갈등 컨텍스트 로드 완료: ${learningDataFile.conflictEvents || 0}개 이벤트`);
            }
            
            contextLog(`💾 학습 데이터 로드 완료: ${learningDataFile.totalEntries}개 (갈등 포함) (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 학습 데이터 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        // 🛠️ 빈 구조로 초기화
        ensureStateIntegrity();
        return false;
    }
}

/**
 * 💾 자발적 메시지 통계 파일에서 로드 (디스크 마운트) - 🛠️ 안전성 강화
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
                const messageTypes = ensureObject(spontaneousData.stats.messageTypes);
                Object.keys(messageTypes).forEach(type => {
                    messageTypes[type] = 0;
                });
                
                contextLog(`🌄 자발적 메시지 일일 통계 리셋 (${today}) (💾 디스크 마운트)`);
            }
            
            // 🛠️ 안전한 로드
            ultimateConversationState.spontaneousMessages = {
                ...spontaneousData.stats,
                sentTimes: ensureArray(spontaneousData.stats.sentTimes),
                messageTypes: ensureObject(spontaneousData.stats.messageTypes)
            };
            
            contextLog(`💾 자발적 메시지 통계 로드 완료 (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 자발적 메시지 통계 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        // 🛠️ 기본값으로 초기화
        ultimateConversationState.spontaneousMessages.sentTimes = [];
        ultimateConversationState.spontaneousMessages.messageTypes = {
            emotional: 0,
            casual: 0,
            caring: 0,
            playful: 0
        };
        return false;
    }
}

/**
 * 💾 메모리 통계 파일에서 로드 (디스크 마운트 + 갈등 통계 포함) - 🛠️ 안전성 강화
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
                statsData.stats.todayConflictCount = 0; // 💥 갈등 일일 카운트 리셋
                statsData.stats.lastDailyReset = today;
                contextLog(`🌄 일일 통계 리셋 (갈등 포함) (${today}) (💾 디스크 마운트)`);
            }
            
            // 🛠️ 안전한 병합
            ultimateConversationState.memoryStats = {
                ...ultimateConversationState.memoryStats,
                ...ensureObject(statsData.stats)
            };
            
            contextLog(`💾 메모리 통계 로드 완료 (갈등 통계 포함) (디스크 마운트: ${DATA_DIR})`);
            return true;
        }
        
        return false;
    } catch (error) {
        contextLog(`ℹ️ 메모리 통계 파일 없음 (첫 실행) - 디스크 마운트 경로: ${DATA_DIR}`);
        // 🛠️ 기본값으로 초기화 (이미 상단에서 설정됨)
        return false;
    }
}

/**
 * 💾 모든 데이터 파일에서 로드 (디스크 마운트 + 갈등 시스템 포함) - 🛠️ 안전성 강화
 */
async function loadAllDataFromFiles() {
    try {
        contextLog(`💾 모든 영구 데이터 로드 시작... (갈등 시스템 포함) (디스크 마운트: ${DATA_DIR})`);
        
        // 🛠️ 로드 전 상태 무결성 보장
        ensureStateIntegrity();
        
        const results = await Promise.all([
            loadUserMemoriesFromFile(),
            loadLearningDataFromFile(),
            loadSpontaneousStatsFromFile(),
            loadMemoryStatsFromFile()
        ]);
        
        const successCount = results.filter(r => r === true).length;
        contextLog(`💾 데이터 로드 완료: ${successCount}/4개 성공 (갈등 시스템 포함) (디스크 마운트: ${DATA_DIR})`);
        
        // 로드 후 통계 정보 출력
        const memStats = getMemoryStatistics();
        contextLog(`📊 로드된 데이터: 사용자기억 ${memStats.user}개, 학습데이터 ${memStats.learning.totalEntries}개, 갈등이벤트 ${memStats.conflictEvents || 0}개 (💾 완전 영구 저장)`);
        
        return successCount > 0;
    } catch (error) {
        contextLog(`❌ 데이터 로드 실패: ${error.message}`);
        // 🛠️ 로드 실패 시에도 안전한 상태 보장
        ensureStateIntegrity();
        return false;
    }
}

/**
 * 💾 일일 백업 생성 (디스크 마운트 + 갈등 데이터 포함) - 🛠️ 안전성 강화
 */
async function createDailyBackup() {
    try {
        await ensureDataDirectory();
        ensureStateIntegrity(); // 🛠️ 백업 전 상태 무결성 보장
        
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        const backupData = {
            backupDate: today,
            timestamp: new Date().toISOString(),
            userMemories: ensureArray(ultimateConversationState.dynamicMemories.userMemories),
            learningData: {
                dailyLearning: ensureArray(ultimateConversationState.learningData.dailyLearning),
                conversationLearning: ensureArray(ultimateConversationState.learningData.conversationLearning),
                emotionLearning: ensureArray(ultimateConversationState.learningData.emotionLearning),
                topicLearning: ensureArray(ultimateConversationState.learningData.topicLearning),
                conflictLearning: ensureArray(ultimateConversationState.learningData.conflictLearning)
            },
            conflictContext: ensureObject(ultimateConversationState.conflictContext),
            spontaneousStats: {
                ...ultimateConversationState.spontaneousMessages,
                sentTimes: ensureArray(ultimateConversationState.spontaneousMessages.sentTimes)
            },
            memoryStats: ensureObject(ultimateConversationState.memoryStats),
            version: '37.1-disk-mount-conflict-fixed',
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
        contextLog(`💾 일일 백업 생성: ${backupFileName} (갈등 데이터 포함) (디스크 마운트: ${DATA_DIR})`);
        
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
            contextLog(`⏰ 자동 저장 완료 (5분 주기) (갈등 시스템 포함) (💾 디스크 마운트: ${DATA_DIR})`);
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
    
    contextLog(`⏰ 자동 저장 시스템 시작 (5분 저장, 1시간 백업 체크) (갈등 시스템 포함) (💾 디스크 마운트: ${DATA_DIR})`);
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

// ==================== 💥 갈등 시스템 연동 기능들 ====================

/**
 * 💥 메시지에서 갈등 신호 감지 - 🛠️ 안전성 강화
 */
function detectConflictSignals(message) {
    try {
        const lowerMsg = message.toLowerCase();
        let conflictLevel = 0;
        let triggers = [];
        let conflictType = 'none';
        
        // 갈등 키워드 감지 (점수 기반)
        if (lowerMsg.includes('화나') || lowerMsg.includes('짜증') || lowerMsg.includes('열받')) {
            conflictLevel += 3;
            triggers.push('감정표현');
            conflictType = '감정분출';
        }
        
        if (lowerMsg.includes('싫어') || lowerMsg.includes('그만') || lowerMsg.includes('안 해')) {
            conflictLevel += 2;
            triggers.push('거부반응');
            conflictType = '의견충돌';
        }
        
        if (lowerMsg.includes('미안') || lowerMsg.includes('죄송') || lowerMsg.includes('잘못')) {
            triggers.push('사과시도');
            conflictType = '화해시도';
            // 사과는 갈등 레벨을 낮춤
            conflictLevel = Math.max(0, conflictLevel - 2);
        }
        
        if (lowerMsg.includes('이해 안') || lowerMsg.includes('왜 그래') || lowerMsg.includes('모르겠')) {
            conflictLevel += 1;
            triggers.push('이해부족');
            conflictType = '소통문제';
        }
        
        if (lowerMsg.includes('사랑') || lowerMsg.includes('좋아') || lowerMsg.includes('고마워')) {
            triggers.push('애정표현');
            conflictType = '긍정신호';
            // 애정표현은 갈등을 크게 낮춤
            conflictLevel = Math.max(0, conflictLevel - 3);
        }
        
        // 갈등 레벨 정규화 (0-4)
        conflictLevel = Math.min(4, Math.max(0, conflictLevel));
        
        const conflictSignal = {
            level: conflictLevel,
            triggers: triggers,
            type: conflictType,
            hasConflict: conflictLevel > 0,
            timestamp: new Date().toISOString(),
            originalMessage: message
        };
        
        // 🛠️ 안전한 배열 접근
        ensureStateIntegrity();
        
        // 갈등 신호 기록 (최근 10개만 보관)
        ultimateConversationState.conflictContext.recentConflictSignals.push(conflictSignal);
        if (ultimateConversationState.conflictContext.recentConflictSignals.length > 10) {
            ultimateConversationState.conflictContext.recentConflictSignals.shift();
        }
        
        if (conflictLevel > 0) {
            contextLog(`💥 갈등 신호 감지: 레벨 ${conflictLevel}, 타입: ${conflictType}, 트리거: ${triggers.join(', ')}`);
            ultimateConversationState.conflictContext.lastConflictDetection = Date.now();
        }
        
        return conflictSignal;
        
    } catch (error) {
        contextLog('💥 갈등 신호 감지 실패:', error.message);
        return { level: 0, triggers: [], type: 'none', hasConflict: false };
    }
}

/**
 * 💥 갈등 시스템과 연동하여 갈등 상태 업데이트
 */
async function updateConflictWithSystem(conflictSignal) {
    try {
        const conflictManager = getConflictManager();
        if (!conflictManager) {
            contextLog('💥 갈등 매니저 없음 - 로컬 기록만 수행');
            return false;
        }
        
        if (conflictSignal.hasConflict && conflictSignal.level > 1) {
            // 갈등 트리거 시도
            const triggerResult = conflictManager.triggerConflict ? 
                await conflictManager.triggerConflict(
                    conflictSignal.triggers.join(', '),
                    conflictSignal.level
                ) : null;
                
            if (triggerResult && triggerResult.success) {
                contextLog(`💥 갈등 시스템 트리거 성공: ${conflictSignal.type}`);
                return true;
            }
        } else if (conflictSignal.type === '화해시도' || conflictSignal.type === '긍정신호') {
            // 갈등 해소 시도
            const resolveResult = conflictManager.resolveConflict ? 
                await conflictManager.resolveConflict(conflictSignal.type) : null;
                
            if (resolveResult && resolveResult.success) {
                contextLog(`💚 갈등 시스템 해소 성공: ${conflictSignal.type}`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        contextLog('💥 갈등 시스템 연동 실패:', error.message);
        return false;
    }
}

/**
 * 💥 갈등 해소 시도 기록 - 🛠️ 안전성 강화
 */
async function recordConflictResolutionAttempt(method, success, details = {}) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const resolutionAttempt = {
            id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            method: method,
            success: success,
            details: details
        };
        
        ultimateConversationState.conflictContext.resolutionAttempts.push(resolutionAttempt);
        
        // 최근 20개만 보관
        if (ultimateConversationState.conflictContext.resolutionAttempts.length > 20) {
            ultimateConversationState.conflictContext.resolutionAttempts.shift();
        }
        
        // 해소율 업데이트
        const successful = ultimateConversationState.conflictContext.resolutionAttempts.filter(a => a.success).length;
        const total = ultimateConversationState.conflictContext.resolutionAttempts.length;
        ultimateConversationState.memoryStats.conflictResolutionRate = 
            total > 0 ? Math.round((successful / total) * 100) : 0;
        
        contextLog(`💥 갈등 해소 시도 기록: ${method} (성공: ${success}), 해소율: ${ultimateConversationState.memoryStats.conflictResolutionRate}%`);
        
        // 💾 즉시 저장
        saveLearningDataToFile().catch(err => 
            contextLog(`❌ 갈등 해소 기록 저장 실패: ${err.message}`)
        );
        
        return resolutionAttempt;
    } catch (error) {
        contextLog('💥 갈등 해소 시도 기록 실패:', error.message);
        return null;
    }
}

/**
 * 💥 갈등 시스템 연동 상태 확인
 */
async function getConflictSystemStatus() {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const conflictManager = getConflictManager();
        if (!conflictManager) {
            return { 
                connected: false, 
                error: '갈등 매니저 로드 실패',
                localDataAvailable: safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals) > 0
            };
        }
        
        const status = conflictManager.getConflictStatus ? 
            await conflictManager.getConflictStatus() : { isActive: false, currentLevel: 0 };
            
        const stats = conflictManager.getConflictStats ? 
            await conflictManager.getConflictStats() : {};
        
        return { 
            connected: true, 
            status: status,
            stats: stats,
            localContext: {
                recentSignals: safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals),
                resolutionAttempts: safeArrayLength(ultimateConversationState.conflictContext.resolutionAttempts),
                resolutionRate: ultimateConversationState.memoryStats.conflictResolutionRate,
                lastDetection: ultimateConversationState.conflictContext.lastConflictDetection
            }
        };
    } catch (error) {
        return { 
            connected: false, 
            error: error.message,
            localDataAvailable: safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals) > 0
        };
    }
}

// ==================== 📚 학습 데이터 관리 (영구 저장 연동! + 갈등 학습 강화) ====================

/**
 * 📚 새로운 학습 내용 추가 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function addLearningEntry(content, category = '일반학습', context = {}) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
            case '갈등학습': // 💥 갈등 학습 카테고리 추가
                ultimateConversationState.learningData.conflictLearning.push(learningEntry);
                ultimateConversationState.memoryStats.totalConflictEvents++;
                ultimateConversationState.memoryStats.todayConflictCount++;
                ultimateConversationState.memoryStats.lastConflictEvent = Date.now();
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
 * 📚 모든 학습 내용 조회 (일기장용!) - 💾 파일에서 최신 데이터 로드 - 🛠️ 안전성 강화
 */
async function getAllDynamicLearning() {
    try {
        // 💾 파일에서 최신 데이터 로드
        await loadLearningDataFromFile();
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        // 모든 학습 데이터를 하나의 배열로 합치기 (💥 갈등 학습 포함)
        const allLearning = [
            ...ensureArray(ultimateConversationState.learningData.dailyLearning),
            ...ensureArray(ultimateConversationState.learningData.conversationLearning),
            ...ensureArray(ultimateConversationState.learningData.emotionLearning),
            ...ensureArray(ultimateConversationState.learningData.topicLearning),
            ...ensureArray(ultimateConversationState.learningData.conflictLearning) // 💥 갈등 학습 추가
        ];
        
        // 시간순으로 정렬
        allLearning.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        contextLog(`📚 전체 학습 데이터 조회: ${allLearning.length}개 (갈등 학습 포함) (파일에서 로드)`);
        
        return allLearning;
    } catch (error) {
        contextLog('학습 데이터 조회 실패:', error.message);
        return [];
    }
}

/**
 * 📚 특정 카테고리 학습 내용 조회 - 🛠️ 안전성 강화
 */
async function getLearningByCategory(category) {
    try {
        await loadLearningDataFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        let targetArray = [];
        
        switch(category) {
            case '대화학습':
                targetArray = ensureArray(ultimateConversationState.learningData.conversationLearning);
                break;
            case '감정분석':
                targetArray = ensureArray(ultimateConversationState.learningData.emotionLearning);
                break;
            case '주제학습':
                targetArray = ensureArray(ultimateConversationState.learningData.topicLearning);
                break;
            case '갈등학습': // 💥 갈등 학습 카테고리 추가
                targetArray = ensureArray(ultimateConversationState.learningData.conflictLearning);
                break;
            default:
                targetArray = ensureArray(ultimateConversationState.learningData.dailyLearning);
        }
        
        return targetArray.slice(); // 복사본 반환
    } catch (error) {
        contextLog(`카테고리별 학습 조회 실패 (${category}):`, error.message);
        return [];
    }
}

/**
 * 📚 오늘 학습 내용만 조회 - 🛠️ 안전성 강화
 */
async function getTodayLearning() {
    try {
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        const allLearning = await getAllDynamicLearning();
        
        return ensureArray(allLearning).filter(item => item.date === today);
    } catch (error) {
        contextLog('오늘 학습 조회 실패:', error.message);
        return [];
    }
}

/**
 * 📚 학습 통계 조회 (💥 갈등 통계 포함) - 🛠️ 안전성 강화
 */
function getLearningStatistics() {
    ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
    
    const total = ultimateConversationState.memoryStats.totalLearningEntries || 0;
    const today = ultimateConversationState.memoryStats.todayLearningCount || 0;
    const conflictEvents = ultimateConversationState.memoryStats.totalConflictEvents || 0;
    const todayConflict = ultimateConversationState.memoryStats.todayConflictCount || 0;
    
    return {
        totalEntries: total,
        todayCount: today,
        conflictEvents: conflictEvents, // 💥 갈등 이벤트 통계 추가
        todayConflictCount: todayConflict, // 💥 오늘 갈등 횟수 추가
        categories: {
            daily: safeArrayLength(ultimateConversationState.learningData.dailyLearning),
            conversation: safeArrayLength(ultimateConversationState.learningData.conversationLearning),
            emotion: safeArrayLength(ultimateConversationState.learningData.emotionLearning),
            topic: safeArrayLength(ultimateConversationState.learningData.topicLearning),
            conflict: safeArrayLength(ultimateConversationState.learningData.conflictLearning) // 💥 갈등 학습 통계 추가
        },
        lastEntry: ultimateConversationState.memoryStats.lastLearningEntry,
        lastConflictEvent: ultimateConversationState.memoryStats.lastConflictEvent, // 💥 마지막 갈등 이벤트 시간 추가
        conflictResolutionRate: ultimateConversationState.memoryStats.conflictResolutionRate || 0, // 💥 갈등 해소율 추가
        isPersistent: true // 💾 영구 저장 표시
    };
}

// ==================== 💔 갈등 학습 연동 시스템 (갈등 시스템과 연동!) ====================

/**
 * 💔 갈등 관련 학습 데이터 추가
 */
async function addConflictLearning(conflictType, trigger, resolution, success) {
    try {
        const learningContent = success ? 
            `화해 성공: ${conflictType} 갈등을 "${resolution}" 방법으로 해결` :
            `갈등 발생: ${conflictType} 갈등이 "${trigger}" 원인으로 시작됨`;
        
        await addLearningEntry(learningContent, '갈등학습', {
            conflictType: conflictType,
            trigger: trigger,
            resolutionMethod: resolution,
            success: success,
            timestamp: new Date().toISOString()
        });
        
        // 💥 갈등 해소 시도도 별도 기록
        if (resolution !== '감지됨' && resolution !== '진행중') {
            await recordConflictResolutionAttempt(resolution, success, {
                conflictType: conflictType,
                trigger: trigger
            });
        }
        
        contextLog(`💔 갈등 학습 추가: ${learningContent.substring(0, 50)}...`);
        return true;
    } catch (error) {
        contextLog('💔 갈등 학습 추가 실패:', error.message);
        return false;
    }
}

/**
 * 💔 갈등 패턴 분석 (학습된 데이터 기반) - 🛠️ 안전성 강화
 */
async function analyzeConflictPatterns() {
    try {
        await loadLearningDataFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        // 갈등학습 카테고리 데이터만 추출
        const conflictLearning = await getLearningByCategory('갈등학습');
        
        if (conflictLearning.length === 0) {
            return {
                totalConflicts: 0,
                successfulResolutions: 0,
                failedResolutions: 0,
                mostCommonTrigger: '없음',
                bestResolutionMethod: '없음',
                patterns: [],
                recentTrends: '데이터 없음'
            };
        }
        
        // 성공/실패 분석
        const successful = conflictLearning.filter(item => 
            item.context && item.context.success === true
        );
        const failed = conflictLearning.filter(item => 
            item.context && item.context.success === false
        );
        
        // 가장 흔한 트리거 분석
        const triggerCounts = {};
        conflictLearning.forEach(item => {
            if (item.context && item.context.trigger) {
                triggerCounts[item.context.trigger] = (triggerCounts[item.context.trigger] || 0) + 1;
            }
        });
        
        const mostCommonTrigger = Object.keys(triggerCounts).length > 0 ?
            Object.keys(triggerCounts).reduce((a, b) => 
                triggerCounts[a] > triggerCounts[b] ? a : b
            ) : '없음';
        
        // 가장 효과적인 화해 방법 분석
        const resolutionCounts = {};
        successful.forEach(item => {
            if (item.context && item.context.resolutionMethod) {
                resolutionCounts[item.context.resolutionMethod] = 
                    (resolutionCounts[item.context.resolutionMethod] || 0) + 1;
            }
        });
        
        const bestResolutionMethod = Object.keys(resolutionCounts).length > 0 ?
            Object.keys(resolutionCounts).reduce((a, b) => 
                resolutionCounts[a] > resolutionCounts[b] ? a : b
            ) : '없음';
        
        // 최근 트렌드 분석 (최근 5개)
        const recentConflicts = conflictLearning.slice(-5);
        const recentSuccessRate = recentConflicts.length > 0 ? 
            Math.round((recentConflicts.filter(c => c.context?.success).length / recentConflicts.length) * 100) : 0;
        
        return {
            totalConflicts: conflictLearning.length,
            successfulResolutions: successful.length,
            failedResolutions: failed.length,
            successRate: conflictLearning.length > 0 ? 
                Math.round((successful.length / conflictLearning.length) * 100) : 0,
            recentSuccessRate: recentSuccessRate,
            mostCommonTrigger: mostCommonTrigger,
            bestResolutionMethod: bestResolutionMethod,
            triggerFrequency: triggerCounts,
            resolutionFrequency: resolutionCounts,
            patterns: conflictLearning.slice(-5), // 최근 5개 패턴
            recentTrends: `최근 해소율: ${recentSuccessRate}%`,
            // 💥 추가 분석 데이터
            systemIntegration: {
                localSignals: safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals),
                resolutionAttempts: safeArrayLength(ultimateConversationState.conflictContext.resolutionAttempts),
                overallResolutionRate: ultimateConversationState.memoryStats.conflictResolutionRate
            }
        };
        
    } catch (error) {
        contextLog('💔 갈등 패턴 분석 실패:', error.message);
        return {
            totalConflicts: 0,
            successfulResolutions: 0,
            failedResolutions: 0,
            mostCommonTrigger: '분석 실패',
            bestResolutionMethod: '분석 실패',
            patterns: [],
            recentTrends: '분석 실패'
        };
    }
}

/**
 * 💔 일기장용 갈등 데이터 조회 - 🛠️ 안전성 강화
 */
async function getConflictLearningForDiary() {
    try {
        const conflictLearning = await getLearningByCategory('갈등학습');
        
        return ensureArray(conflictLearning).map(item => ({
            date: item.date,
            time: item.time,
            content: item.content,
            conflictType: item.context?.conflictType || '알 수 없음',
            trigger: item.context?.trigger || '알 수 없음',
            resolution: item.context?.resolutionMethod || '진행중',
            success: item.context?.success || false
        }));
        
    } catch (error) {
        contextLog('💔 갈등 일기 데이터 조회 실패:', error.message);
        return [];
    }
}

// ==================== 🧠 강화된 자동 학습 시스템 (갈등 감지 포함) ====================

/**
 * 🧠 메시지에서 새로운 정보 분석 및 추출 (💥 갈등 감지 통합) - 🛠️ 안전성 강화
 */
function analyzeMessageForNewInfo(message) {
    try {
        const lowerMsg = message.toLowerCase();
        let hasNewInfo = false;
        let category = '일반학습';
        let extractedInfo = '';
        
        // 💥 갈등 신호 먼저 감지
        const conflictSignal = detectConflictSignals(message);
        if (conflictSignal.hasConflict) {
            hasNewInfo = true;
            category = '갈등학습';
            extractedInfo = `갈등 신호 감지: ${conflictSignal.type} (레벨 ${conflictSignal.level}) - ${message}`;
        }
        // 1. 감정 관련 정보
        else if (lowerMsg.includes('기분') || lowerMsg.includes('느낌') || lowerMsg.includes('감정')) {
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
            timestamp: new Date().toISOString(),
            conflictSignal: conflictSignal // 💥 갈등 신호 정보 추가
        };
        
    } catch (error) {
        contextLog('메시지 분석 실패:', error.message);
        return { hasNewInfo: false };
    }
}

/**
 * 🧠 메시지 기반 자동 학습 처리 (💾 영구 저장 연동! + 💥 갈등 시스템 연동!) - 🛠️ 안전성 강화
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
                    analysisTime: new Date().toISOString(),
                    conflictSignal: analysis.conflictSignal // 💥 갈등 신호 정보 추가
                }
            );
            
            if (learningEntry) {
                contextLog(`🧠 자동 학습 완료: [${analysis.category}] ${analysis.extractedInfo.substring(0, 30)}...`);
                
                // 💥 갈등 시스템과 연동
                if (analysis.conflictSignal && analysis.conflictSignal.hasConflict) {
                    await updateConflictWithSystem(analysis.conflictSignal);
                }
                
                return true;
            }
        }
        
        return false;
    } catch (error) {
        contextLog('자동 학습 처리 실패:', error.message);
        return false;
    }
}

// ==================== 💬 대화 메시지 관리 (학습 연동 + 갈등 감지) ====================

/**
 * 새로운 메시지를 대화 컨텍스트에 추가 (학습 시스템 + 갈등 감지 연동!) - 🛠️ 안전성 강화
 */
async function addUltimateMessage(speaker, message) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
        
        // 🧠 자동 학습 처리 (갈등 감지 포함!)
        await processAutoLearning(speaker, message);
        
        // 대화에서 자동 학습 (기존)
        await learnFromConversation(speaker, message);
    } catch (error) {
        contextLog('메시지 추가 실패:', error.message);
    }
}

/**
 * 최근 대화 내용 가져오기 (모델별 최적화) - 🛠️ 안전성 강화
 */
function getRecentMessages(limit = null) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const contextLength = getOptimalContextLength();
        const actualLimit = limit || contextLength.recent;
        
        const recentMessages = ensureArray(ultimateConversationState.conversationContext.recentMessages);
        return recentMessages.slice(-actualLimit);
    } catch (error) {
        contextLog('최근 메시지 조회 실패:', error.message);
        return [];
    }
}

/**
 * 대화 주제 업데이트 - 🛠️ 안전성 강화
 */
async function updateConversationTopic(topic) {
    try {
        ultimateConversationState.conversationContext.currentTopic = topic;
        ultimateConversationState.conversationContext.lastTopicChange = Date.now();
        contextLog(`대화 주제 업데이트: ${topic}`);
        
        // 🧠 주제 변경도 학습 대상으로 추가
        await addLearningEntry(`대화 주제가 "${topic}"으로 변경됨`, '주제학습', {
            previousTopic: ultimateConversationState.conversationContext.currentTopic,
            changeTime: Date.now()
        });
    } catch (error) {
        contextLog('대화 주제 업데이트 실패:', error.message);
    }
}

// ==================== 🧠 동적 기억 관리 (💾 영구 저장 연동!) ====================

/**
 * 사용자 기억 추가 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function addUserMemory(content, category = 'general') {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
    } catch (error) {
        contextLog('사용자 기억 추가 실패:', error.message);
        return null;
    }
}

/**
 * 사용자 기억 삭제 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function deleteUserMemory(content) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const beforeCount = safeArrayLength(ultimateConversationState.dynamicMemories.userMemories);
        
        ultimateConversationState.dynamicMemories.userMemories = 
            ultimateConversationState.dynamicMemories.userMemories.filter(mem => 
                !mem.content.includes(content)
            );
        
        const deletedCount = beforeCount - safeArrayLength(ultimateConversationState.dynamicMemories.userMemories);
        ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
        ultimateConversationState.memoryStats.totalUserMemories = safeArrayLength(ultimateConversationState.dynamicMemories.userMemories);
        
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
    } catch (error) {
        contextLog('사용자 기억 삭제 실패:', error.message);
        return false;
    }
}

/**
 * 사용자 기억 수정 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function updateUserMemory(id, newContent) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
    } catch (error) {
        contextLog('사용자 기억 수정 실패:', error.message);
        return false;
    }
}

/**
 * 예진이의 동적 기억들 가져오기 (💾 파일에서 최신 데이터 로드) - 🛠️ 안전성 강화
 */
async function getYejinMemories() {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        return ensureArray(ultimateConversationState.dynamicMemories.userMemories);
    } catch (error) {
        contextLog('예진이 기억 조회 실패:', error.message);
        return [];
    }
}

/**
 * ID로 기억 찾기 - 🛠️ 안전성 강화
 */
function getMemoryById(id) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        return ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
    } catch (error) {
        contextLog('ID별 기억 조회 실패:', error.message);
        return null;
    }
}

/**
 * 카테고리별 기억 찾기 - 🛠️ 안전성 강화
 */
function getMemoriesByTag(tag) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        return ultimateConversationState.dynamicMemories.userMemories.filter(m => 
            m.category === tag || (m.tags && m.tags.includes(tag))
        );
    } catch (error) {
        contextLog('태그별 기억 조회 실패:', error.message);
        return [];
    }
}

/**
 * 모든 동적 기억 가져오기 (💾 파일에서 최신 데이터 로드) - 🛠️ 안전성 강화
 */
async function getAllMemories() {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        return {
            user: ensureArray(ultimateConversationState.dynamicMemories.userMemories),
            conversation: ensureArray(ultimateConversationState.dynamicMemories.conversationMemories),
            temporary: ensureArray(ultimateConversationState.dynamicMemories.temporaryMemories)
        };
    } catch (error) {
        contextLog('모든 기억 조회 실패:', error.message);
        return {
            user: [],
            conversation: [],
            temporary: []
        };
    }
}

// ==================== ⭐️ 자발적 메시지 통계 관리 (💾 영구 저장 연동!) ====================

/**
 * ⭐️ 자발적 메시지 전송 기록 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function recordSpontaneousMessage(messageType = 'casual') {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
    } catch (error) {
        contextLog('자발적 메시지 기록 실패:', error.message);
    }
}

/**
 * ⭐️ 다음 자발적 메시지 시간 설정 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function setNextSpontaneousTime(nextTime) {
    try {
        ultimateConversationState.spontaneousMessages.nextScheduledTime = nextTime;
        
        const timeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
        contextLog(`다음 자발적 메시지 시간 설정: ${timeString}`);
        
        // 💾 즉시 저장 (비동기)
        saveSpontaneousStatsToFile().catch(err => 
            contextLog(`❌ 자발적 메시지 통계 저장 실패: ${err.message}`)
        );
    } catch (error) {
        contextLog('다음 자발적 메시지 시간 설정 실패:', error.message);
    }
}

/**
 * ⭐️ 자발적 메시지 통계 조회 (라인 상태 리포트용!) - 💾 파일에서 최신 데이터 로드 - 🛠️ 안전성 강화
 */
async function getSpontaneousStats() {
    try {
        await loadSpontaneousStatsFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const nextTime = ultimateConversationState.spontaneousMessages.nextScheduledTime;
        let nextTimeString = '대기 중';
        
        if (nextTime) {
            nextTimeString = moment(nextTime).tz(TIMEZONE).format('HH:mm');
        }
        
        return {
            // 라인 상태 리포트용 핵심 정보
            sentToday: ultimateConversationState.spontaneousMessages.sentToday || 0,
            totalDaily: ultimateConversationState.spontaneousMessages.totalDaily || DAILY_SPONTANEOUS_TARGET,
            nextTime: nextTimeString,
            
            // 상세 정보
            progress: `${ultimateConversationState.spontaneousMessages.sentToday || 0}/${ultimateConversationState.spontaneousMessages.totalDaily || DAILY_SPONTANEOUS_TARGET}`,
            sentTimes: ensureArray(ultimateConversationState.spontaneousMessages.sentTimes),
            lastSentTime: ultimateConversationState.spontaneousMessages.lastSentTime ? 
                moment(ultimateConversationState.spontaneousMessages.lastSentTime).tz(TIMEZONE).format('HH:mm') : null,
            
            // 메시지 타입별 통계
            messageTypes: ensureObject(ultimateConversationState.spontaneousMessages.messageTypes),
            
            // 시스템 상태
            isActive: (ultimateConversationState.spontaneousMessages.sentToday || 0) < (ultimateConversationState.spontaneousMessages.totalDaily || DAILY_SPONTANEOUS_TARGET),
            remainingToday: (ultimateConversationState.spontaneousMessages.totalDaily || DAILY_SPONTANEOUS_TARGET) - (ultimateConversationState.spontaneousMessages.sentToday || 0),
            
            // GPT 모델 정보
            currentGptModel: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown',
            
            // 💾 영구 저장 상태
            isPersistent: true,
            lastSaved: ultimateConversationState.memoryStats.lastSaved
        };
    } catch (error) {
        contextLog('자발적 메시지 통계 조회 실패:', error.message);
        return {
            sentToday: 0,
            totalDaily: DAILY_SPONTANEOUS_TARGET,
            nextTime: '대기 중',
            progress: `0/${DAILY_SPONTANEOUS_TARGET}`,
            sentTimes: [],
            lastSentTime: null,
            messageTypes: { emotional: 0, casual: 0, caring: 0, playful: 0 },
            isActive: true,
            remainingToday: DAILY_SPONTANEOUS_TARGET,
            currentGptModel: 'unknown',
            isPersistent: true,
            lastSaved: null
        };
    }
}

/**
 * ⭐️ 일일 자발적 메시지 통계 리셋 (💾 즉시 저장!) - 🛠️ 안전성 강화
 */
async function resetSpontaneousStats() {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        
        contextLog('🌄 자발적 메시지 통계 리셋 시작');
        
        ultimateConversationState.spontaneousMessages.sentToday = 0;
        ultimateConversationState.spontaneousMessages.sentTimes = [];
        ultimateConversationState.spontaneousMessages.lastSentTime = null;
        ultimateConversationState.spontaneousMessages.nextScheduledTime = null;
        ultimateConversationState.spontaneousMessages.lastResetDate = today;
        
        // 메시지 타입별 통계 리셋
        const messageTypes = ensureObject(ultimateConversationState.spontaneousMessages.messageTypes);
        Object.keys(messageTypes).forEach(type => {
            messageTypes[type] = 0;
        });
        
        contextLog(`✅ 자발적 메시지 통계 리셋 완료 (${today})`);
        
        // 💾 즉시 저장 (비동기)
        saveSpontaneousStatsToFile().catch(err => 
            contextLog(`❌ 자발적 메시지 통계 저장 실패: ${err.message}`)
        );
    } catch (error) {
        contextLog('자발적 메시지 통계 리셋 실패:', error.message);
    }
}

// ==================== 🎯 컨텍스트 조합 및 프롬프트 생성 (갈등 상태 포함) ====================

/**
 * ✨ 모든 정보를 조합하여 GPT 모델별 최적화된 컨텍스트 프롬프트 생성 (💥 갈등 상태 포함) - 🛠️ 안전성 강화
 */
async function getUltimateContextualPrompt(basePrompt) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
        
        // 💥 3. 갈등 상태 정보 추가 (신규!)
        if (priority.emotions > 0) {
            const conflictManager = getConflictManager();
            if (conflictManager && conflictManager.getConflictStatus) {
                try {
                    const conflictStatus = await conflictManager.getConflictStatus();
                    if (conflictStatus.isActive && conflictStatus.currentLevel > 0) {
                        if (currentModel === '3.5') {
                            // GPT-3.5는 간결하게
                            contextualPrompt += `\n💥 갈등: 레벨 ${conflictStatus.currentLevel}\n`;
                        } else {
                            // GPT-4o는 상세하게
                            contextualPrompt += `\n💥 갈등상태: 레벨 ${conflictStatus.currentLevel}/4, 이유: ${conflictStatus.reason || '불명'}\n`;
                        }
                    }
                } catch (error) {
                    contextLog('갈등 상태 조회 실패:', error.message);
                }
            }
            
            // 최근 갈등 신호도 추가 (GPT-4o에서만)
            if (currentModel === '4.0' && safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals) > 0) {
                const recentSignals = ensureArray(ultimateConversationState.conflictContext.recentConflictSignals);
                const recentSignal = recentSignals.slice(-1)[0];
                if (recentSignal && recentSignal.level > 0) {
                    contextualPrompt += `\n💔 최근갈등신호: ${recentSignal.type} (${recentSignal.triggers.join(', ')})\n`;
                }
            }
        }
        
        // 4. ✨ 모델별 동적 기억 추가 (💾 파일에서 최신 데이터 로드)
        if (priority.memories > 0) {
            await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
            const memoryCount = contextLength.memory;
            const recentMemories = ensureArray(ultimateConversationState.dynamicMemories.userMemories).slice(-memoryCount);
            
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
        
        // 5. 🧠 최근 학습 내용 추가 (💥 갈등 학습 포함) - 💾 파일에서 최신 데이터 로드
        const recentLearning = await getAllDynamicLearning();
        if (recentLearning.length > 0) {
            const lastFewLearning = recentLearning.slice(-3); // 최근 3개만
            const learningContext = lastFewLearning.map(l => `[${l.category}] ${l.content}`).join('. ');
            
            if (currentModel === '4.0') {
                contextualPrompt += `\n📚 최근 학습: ${learningContext}\n`;
            }
        }
        
        // 6. 현재 대화 주제 추가 (모든 모델에서 사용)
        if (ultimateConversationState.conversationContext.currentTopic) {
            contextualPrompt += `\n🎯 현재 주제: ${ultimateConversationState.conversationContext.currentTopic}\n`;
        }
        
        // 7. ✨ 모델별 추가 메타정보 (💥 갈등 정보 포함)
        if (currentModel === '4.0') {
            // GPT-4o에서만 상세한 메타정보 추가
            const messageCount = safeArrayLength(ultimateConversationState.conversationContext.recentMessages);
            const memoryCount = safeArrayLength(ultimateConversationState.dynamicMemories.userMemories);
            const learningCount = ultimateConversationState.memoryStats.totalLearningEntries || 0;
            const conflictEvents = ultimateConversationState.memoryStats.totalConflictEvents || 0;
            contextualPrompt += `\n📊 컨텍스트: 메시지 ${messageCount}개, 기억 ${memoryCount}개, 학습 ${learningCount}개, 갈등 ${conflictEvents}개 (💾영구저장)\n`;
        }
        
        contextLog(`컨텍스트 생성 완료 (${currentModel} 최적화, 갈등 포함, 길이: ${contextualPrompt.length}자)`);
        return contextualPrompt;
        
    } catch (error) {
        console.error('❌ [UltimateContext] 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

/**
 * ✨ 활성 기억들을 모델별로 최적화하여 프롬프트용으로 조합 - 🛠️ 안전성 강화
 */
async function getActiveMemoryPrompt() {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const contextLength = getOptimalContextLength();
        const recentMemories = ensureArray(ultimateConversationState.dynamicMemories.userMemories).slice(-contextLength.memory);
        
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
    } catch (error) {
        contextLog('활성 기억 프롬프트 생성 실패:', error.message);
        return '';
    }
}

// ==================== ⏰ 타이밍 관리 ====================

/**
 * 마지막 사용자 메시지 시간 업데이트
 */
function updateLastUserMessageTime(timestamp) {
    try {
        ultimateConversationState.timingContext.lastUserMessageTime = timestamp;
        ultimateConversationState.timingContext.conversationGap = 
            timestamp - ultimateConversationState.timingContext.lastUserMessageTime;
    } catch (error) {
        contextLog('마지막 사용자 메시지 시간 업데이트 실패:', error.message);
    }
}

/**
 * 마지막 사용자 메시지 시간 조회
 */
function getLastUserMessageTime() {
    try {
        return ultimateConversationState.timingContext.lastUserMessageTime;
    } catch (error) {
        contextLog('마지막 사용자 메시지 시간 조회 실패:', error.message);
        return Date.now();
    }
}

/**
 * 시간 틱 처리
 */
function processTimeTick() {
    try {
        const now = Date.now();
        ultimateConversationState.timingContext.conversationGap = 
            now - ultimateConversationState.timingContext.lastUserMessageTime;
    } catch (error) {
        contextLog('시간 틱 처리 실패:', error.message);
    }
}

// ==================== 😊 감정 상태 연동 (보조 역할) ====================
// 삐짐 상태는 sulkyManager.js에서 완전 독립 관리됨

/**
 * 간단한 사용자 감정 분석 - 🛠️ 안전성 강화
 */
async function analyzeUserMood(message) {
    try {
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
    } catch (error) {
        contextLog('사용자 감정 분석 실패:', error.message);
        return 'neutral';
    }
}

// ==================== 🎓 학습 및 분석 ====================

/**
 * 대화에서 자동 학습 (기존) - 💾 영구 저장 연동! - 🛠️ 안전성 강화
 */
async function learnFromConversation(speaker, message) {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
 * 사용자 메시지에서 학습 (강화됨! + 갈등 감지) - 🛠️ 안전성 강화
 */
async function learnFromUserMessage(message) {
    try {
        const mood = await analyzeUserMood(message);
        
        // 감정 상태가 특별한 경우 기록
        if (mood !== 'neutral') {
            contextLog(`사용자 감정 감지: ${mood} - "${message.substring(0, 30)}..."`);
        }
        
        // 🧠 추가 학습 처리 (갈등 감지 포함)
        await processAutoLearning('아저씨', message);
    } catch (error) {
        contextLog('사용자 메시지 학습 실패:', error.message);
    }
}

// ==================== 📊 통계 및 상태 조회 (갈등 통계 포함) ====================

/**
 * ✨ GPT 모델 정보를 포함한 기억 통계 (💥 갈등 통계 포함) - 💾 파일에서 최신 데이터 로드 - 🛠️ 안전성 강화
 */
async function getMemoryStatistics() {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        await loadMemoryStatsFromFile(); // 💾 최신 통계 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
        const contextLength = getOptimalContextLength();
        const learningStats = getLearningStatistics();
        
        return {
            user: ultimateConversationState.memoryStats.totalUserMemories || 0,
            conversation: ultimateConversationState.memoryStats.totalConversationMemories || 0,
            today: ultimateConversationState.memoryStats.todayMemoryCount || 0,
            total: (ultimateConversationState.memoryStats.totalUserMemories || 0) + 
                   (ultimateConversationState.memoryStats.totalConversationMemories || 0),
            // 📚 학습 통계 추가
            learning: learningStats,
            // 💥 갈등 통계 추가
            conflictEvents: ultimateConversationState.memoryStats.totalConflictEvents || 0,
            todayConflictCount: ultimateConversationState.memoryStats.todayConflictCount || 0,
            conflictResolutionRate: ultimateConversationState.memoryStats.conflictResolutionRate || 0,
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
                isAutoSaving: true,
                storagePath: DATA_DIR
            }
        };
    } catch (error) {
        contextLog('기억 통계 조회 실패:', error.message);
        return {
            user: 0,
            conversation: 0,
            today: 0,
            total: 0,
            learning: { totalEntries: 0, todayCount: 0, conflictEvents: 0 },
            conflictEvents: 0,
            todayConflictCount: 0,
            conflictResolutionRate: 0,
            currentGptModel: 'unknown',
            contextOptimization: { recentMessages: 5, memoryCount: 3, optimizedFor: 'auto' },
            persistence: { lastSaved: null, totalSaves: 0, lastBackup: null, isAutoSaving: true, storagePath: DATA_DIR }
        };
    }
}

/**
 * 기억 카테고리 통계 - 🛠️ 안전성 강화
 */
async function getMemoryCategoryStats() {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const userMems = ensureArray(ultimateConversationState.dynamicMemories.userMemories);
        const convMems = ensureArray(ultimateConversationState.dynamicMemories.conversationMemories);
        
        return {
            user: userMems.length,
            conversation: convMems.length,
            total: userMems.length + convMems.length,
            isPersistent: true, // 💾 영구 저장 표시
            storagePath: DATA_DIR
        };
    } catch (error) {
        contextLog('기억 카테고리 통계 조회 실패:', error.message);
        return {
            user: 0,
            conversation: 0,
            total: 0,
            isPersistent: true,
            storagePath: DATA_DIR
        };
    }
}

/**
 * 최근 기억 작업 로그 - 🛠️ 안전성 강화
 */
async function getMemoryOperationLogs(limit = 10) {
    try {
        await loadUserMemoriesFromFile(); // 💾 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        // 간단한 작업 로그 (실제 구현에서는 더 상세하게)
        const logs = [];
        
        const userMems = ensureArray(ultimateConversationState.dynamicMemories.userMemories).slice(-limit);
        userMems.forEach(mem => {
            logs.push({
                operation: 'add',
                timestamp: mem.timestamp,
                content: mem.content.substring(0, 50) + '...',
                type: mem.type,
                isPersistent: true, // 💾 영구 저장 표시
                storagePath: DATA_DIR
            });
        });
        
        return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    } catch (error) {
        contextLog('기억 작업 로그 조회 실패:', error.message);
        return [];
    }
}

/**
 * ✨ GPT 모델 정보를 포함한 내부 상태 조회 (갈등 시스템 포함, 디버깅용) - 💾 파일에서 최신 데이터 로드 - 🛠️ 안전성 강화
 */
async function getInternalState() {
    try {
        await loadAllDataFromFiles(); // 💾 모든 최신 데이터 로드
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
        const contextLength = getOptimalContextLength();
        const priority = getContextPriority(currentModel);
        
        return {
            conversationContext: ultimateConversationState.conversationContext,
            conflictContext: ultimateConversationState.conflictContext, // 💥 갈등 컨텍스트 추가
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
                version: 'v37.1-disk-mount-conflict-fixed'
            },
            // 💥 갈등 시스템 연동 상태 추가
            conflictSystemIntegration: {
                managerConnected: getConflictManager() !== null,
                recentSignalsCount: safeArrayLength(ultimateConversationState.conflictContext.recentConflictSignals),
                resolutionAttemptsCount: safeArrayLength(ultimateConversationState.conflictContext.resolutionAttempts),
                lastDetection: ultimateConversationState.conflictContext.lastConflictDetection,
                resolutionRate: ultimateConversationState.memoryStats.conflictResolutionRate
            },
            // 💾 영구 저장 시스템 상태 추가
            persistentSystem: {
                autoSaveActive: true,
                lastSaved: ultimateConversationState.memoryStats.lastSaved,
                totalSaves: ultimateConversationState.memoryStats.totalSaves,
                lastBackup: ultimateConversationState.memoryStats.lastBackup,
                dataFiles: Object.keys(PERSISTENT_FILES),
                saveInterval: '5분',
                backupInterval: '1시간',
                storagePath: DATA_DIR,
                diskMounted: true,
                neverLost: true
            }
        };
    } catch (error) {
        contextLog('내부 상태 조회 실패:', error.message);
        return {
            conversationContext: { recentMessages: [], currentTopic: null },
            conflictContext: { recentConflictSignals: [], resolutionAttempts: [] },
            memoryStats: {},
            timingContext: {},
            emotionalSync: {},
            spontaneousMessages: {},
            learningData: {},
            currentTime: Date.now(),
            gptOptimization: { currentModel: 'unknown', version: 'v37.1-disk-mount-conflict-fixed' },
            conflictSystemIntegration: { managerConnected: false, recentSignalsCount: 0, resolutionAttemptsCount: 0 },
            persistentSystem: { autoSaveActive: true, storagePath: DATA_DIR, diskMounted: true, neverLost: true }
        };
    }
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

// ==================== 🔄 시스템 초기화 (💾 영구 저장 시스템 + 💥 갈등 시스템 포함!) ====================

/**
 * 감정 시스템 초기화 (호환성) - 💾 완전 누적 시스템 + 💥 갈등 시스템으로 업그레이드! - 🛠️ 안전성 강화
 */
async function initializeEmotionalSystems() {
    try {
        contextLog('💾 완전 누적 시스템 + 💥 갈등 시스템으로 동적 기억, 대화 컨텍스트 및 학습 시스템 초기화... (디스크 마운트)');
        
        // 🛠️ 상태 무결성 보장
        ensureStateIntegrity();
        
        // ✨ GPT 모델 정보 로그
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
        contextLog(`현재 GPT 모델: ${currentModel} (💾 디스크 마운트: ${DATA_DIR})`);
        
        // 💾 데이터 디렉토리 생성
        await ensureDataDirectory();
        
        // 💾 모든 영구 데이터 로드
        const loadSuccess = await loadAllDataFromFiles();
        if (loadSuccess) {
            contextLog('💾 영구 저장된 데이터 로드 성공! (갈등 시스템 포함) (디스크 마운트)');
        } else {
            contextLog('ℹ️ 첫 실행 - 새로운 데이터 파일들을 생성합니다 (갈등 시스템 포함) (💾 디스크 마운트)');
        }
        
        // 💥 갈등 매니저 연결 확인
        const conflictManager = getConflictManager();
        if (conflictManager) {
            contextLog('💥 갈등 시스템 연결 성공!');
        } else {
            contextLog('⚠️ 갈등 시스템 연결 실패 - 로컬 갈등 기능만 사용');
        }
        
        // 일일 리셋 확인
        const today = new Date().toDateString();
        if (ultimateConversationState.memoryStats.lastDailyReset !== today) {
            ultimateConversationState.memoryStats.todayMemoryCount = 0;
            ultimateConversationState.memoryStats.todayLearningCount = 0; // 📚 학습 카운트 리셋
            ultimateConversationState.memoryStats.todayConflictCount = 0; // 💥 갈등 카운트 리셋
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
        await addLearningEntry('완전 누적 시스템 + 갈등 시스템 초기화 완료 (디스크 마운트)', '시스템', {
            initTime: new Date().toISOString(),
            gptModel: currentModel,
            persistentSystem: true,
            diskMounted: true,
            conflictSystemConnected: conflictManager !== null,
            storagePath: DATA_DIR,
            loadedDataFiles: Object.keys(PERSISTENT_FILES).length
        });
        
        // 💾 초기화 완료 후 전체 저장
        await saveAllDataToFiles();
        
        contextLog(`✅ 완전 누적 시스템 + 갈등 시스템 초기화 완료 - 모든 데이터 디스크 마운트로 완전 영구 저장 보장! (${currentModel} 최적화)`);
        
        // 로드된 데이터 통계 출력
        const stats = await getMemoryStatistics();
        contextLog(`📊 로드된 데이터: 사용자기억 ${stats.user}개, 학습데이터 ${stats.learning.totalEntries}개, 갈등이벤트 ${stats.conflictEvents}개 (💾 디스크 마운트: ${DATA_DIR})`);
    } catch (error) {
        contextLog('시스템 초기화 실패:', error.message);
        // 🛠️ 초기화 실패 시에도 안전한 상태 보장
        ensureStateIntegrity();
    }
}

// ==================== 🎁 유틸리티 함수들 ====================

/**
 * ✨ 모델별 대화 컨텍스트 윈도우 크기 설정
 */
function setConversationContextWindow(size) {
    try {
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
        contextLog(`컨텍스트 윈도우 크기: ${size} (모델: ${currentModel}) (갈등 시스템 포함) (💾 디스크 마운트)`);
        // 실제 구현에서는 메시지 보관 개수 조정
    } catch (error) {
        contextLog('컨텍스트 윈도우 크기 설정 실패:', error.message);
    }
}

/**
 * 대화 시작 문구 생성
 */
async function generateInitiatingPhrase() {
    try {
        const phrases = [
            "아저씨 지금 뭐해?",
            "나 심심해...",
            "아저씨 생각났어!",
            "연락 기다리고 있었어~",
            "보고 싶어서 연락했어"
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    } catch (error) {
        contextLog('대화 시작 문구 생성 실패:', error.message);
        return "아저씨~";
    }
}

/**
 * 💾 수동 전체 데이터 저장 (명령어용 + 갈등 데이터 포함) - 🛠️ 안전성 강화
 */
async function manualSaveAllData() {
    try {
        contextLog('💾 수동 전체 데이터 저장 시작... (갈등 시스템 포함) (디스크 마운트)');
        ensureStateIntegrity(); // 🛠️ 저장 전 상태 무결성 보장
        
        const success = await saveAllDataToFiles();
        if (success) {
            contextLog('✅ 수동 저장 완료! (갈등 시스템 포함) (💾 디스크 마운트)');
            return { success: true, message: '모든 데이터(갈등 포함)가 디스크 마운트에 안전하게 저장되었어요!' };
        } else {
            contextLog('❌ 수동 저장 실패!');
            return { success: false, message: '데이터 저장 중 오류가 발생했어요.' };
        }
    } catch (error) {
        contextLog('수동 저장 실패:', error.message);
        return { success: false, message: '데이터 저장 중 오류가 발생했어요.' };
    }
}

/**
 * 💾 수동 백업 생성 (명령어용 + 갈등 데이터 포함) - 🛠️ 안전성 강화
 */
async function manualCreateBackup() {
    try {
        contextLog('💾 수동 백업 생성 시작... (갈등 시스템 포함) (디스크 마운트)');
        ensureStateIntegrity(); // 🛠️ 백업 전 상태 무결성 보장
        
        const success = await createDailyBackup();
        if (success) {
            contextLog('✅ 수동 백업 완료! (갈등 시스템 포함) (💾 디스크 마운트)');
            return { success: true, message: '백업(갈등 포함)이 디스크 마운트에 생성되었어요!' };
        } else {
            contextLog('❌ 수동 백업 실패!');
            return { success: false, message: '백업 생성 중 오류가 발생했어요.' };
        }
    } catch (error) {
        contextLog('수동 백업 실패:', error.message);
        return { success: false, message: '백업 생성 중 오류가 발생했어요.' };
    }
}

/**
 * 💾 영구 저장 시스템 상태 조회 (갈등 시스템 포함) - 🛠️ 안전성 강화
 */
function getPersistentSystemStatus() {
    try {
        ensureStateIntegrity(); // 🛠️ 상태 무결성 보장
        
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
                memoryStats: PERSISTENT_FILES.memoryStats,
                conflictLearning: PERSISTENT_FILES.conflictLearning // 💥 갈등 학습 파일 추가
            },
            isNeverLost: true, // 💾 절대 사라지지 않음 보장
            diskMounted: true, // 💾 디스크 마운트 적용
            storagePath: DATA_DIR, // 💾 /data 경로
            conflictSystemIntegrated: true, // 💥 갈등 시스템 통합 표시
            version: 'v37.1-disk-mount-conflict-fixed',
            errorFixed: true // 🛠️ 에러 수정 완료 표시
        };
    } catch (error) {
        contextLog('영구 저장 시스템 상태 조회 실패:', error.message);
        return {
            autoSaveActive: false,
            saveInterval: '5분',
            backupInterval: '1시간',
            lastSaved: null,
            totalSaves: 0,
            lastBackup: null,
            dataFiles: {},
            isNeverLost: false,
            diskMounted: true,
            storagePath: DATA_DIR,
            conflictSystemIntegrated: false,
            version: 'v37.1-disk-mount-conflict-fixed',
            errorFixed: false
        };
    }
}

// ==================== 📤 모듈 내보내기 ==================
contextLog('💾💥🛠️ v37.1 로드 완료 (완전 누적 시스템 + 갈등 시스템 - 디스크 마운트로 영구 저장 보장, GPT 모델 버전 전환, 자발적 메시지 통계, 학습 시스템, 갈등 시스템 완전 지원 + 에러 수정 완료)');

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
    analyzeMessageForNewInfo,   // 메시지 분석 함수 (갈등 감지 포함)
    processAutoLearning,        // 자동 학습 처리 (갈등 감지 포함)
    
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
    
    // 💥 갈등 시스템 연동 (신규 추가!)
    detectConflictSignals,       // 갈등 신호 감지
    updateConflictWithSystem,    // 갈등 시스템과 연동
    recordConflictResolutionAttempt, // 갈등 해소 시도 기록
    getConflictSystemStatus,     // 갈등 시스템 연동 상태 확인
    
    // 감정 상태 연동 (보조) - 삐짐 상태는 sulkyManager.js에서 독립 관리
    analyzeUserMood,
    
    // 학습
    learnFromConversation,
    learnFromUserMessage,
    
    // 액션 관리
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    
    // 통계 및 상태 (갈등 통계 포함)
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
    
    // 💔 갈등 학습 연동 (갈등 시스템과 연동!)
    addConflictLearning,
    analyzeConflictPatterns,
    getConflictLearningForDiary,
    
    // 🛠️ 안전성 보장 함수들 추가
    ensureArray,                 // 안전한 배열 접근
    safeArrayLength,             // 안전한 배열 길이 조회
    ensureObject,                // 안전한 객체 접근
    ensureStateIntegrity,        // 상태 무결성 보장
    
    // 호환성 (기존 시스템과의 연동)
    addMemoryContext: addUserMemory,  // 별칭
    getMoodState: () => {             // 감정 상태는 외부 모듈 참조
        try {
            const emotionalManager = getEmotionalManager();
            if (emotionalManager && emotionalManager.getCurrentEmotionState) {
                return emotionalManager.getCurrentEmotionState();
            }
            return { phase: 'normal', description: '정상', emotion: 'normal' };
        } catch (error) {
            contextLog('감정 상태 조회 실패:', error.message);
            return { phase: 'normal', description: '정상', emotion: 'normal' };
        }
    }
};
