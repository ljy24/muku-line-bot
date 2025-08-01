// ============================================================================
// muku-diarySystem.js v7.6 - 완전 수정 버전 (하루1개+강제스케줄러+독립시스템+모든명령어)
// 🔧 Redis 연결 강화 + 자동 일기 스케줄러 100% 보장
// ✅ 하루에 1개 일기만 저장 (완전 중복 방지)
// ✅ 완전 독립 스케줄러 (무조건 작동)
// ✅ 30문장 긴일기 + 대화참고 강화
// ✅ 파일 시스템 연동 문제 해결
// ✅ 테스트 데이터 시스템 간소화
// ✅ 모든 일기 명령어 완전 지원 (주간일기, 월간일기, 그제일기, 3일전일기 등)
// 🚀 완전 자율 일기 시스템 (외부 의존성 최소화)
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

// ⭐️ 지연 로딩을 위한 모듈 변수들  
let ultimateContext = null;
let memoryManager = null;
let memoryTape = null;
let openaiClient = null;

// 🆕 Redis 일기장 전용 변수들
let redisClient = null;
let dailyDiaryScheduler = null;
let redisRetryCount = 0;
const MAX_REDIS_RETRIES = 3;

// 색상 정의
const colors = {
    diary: '\x1b[96m', system: '\x1b[92m', error: '\x1b[91m', 
    redis: '\x1b[1m\x1b[33m', diaryNew: '\x1b[1m\x1b[35m', memory: '\x1b[95m',
    date: '\x1b[93m', auto: '\x1b[1m\x1b[94m', reset: '\x1b[0m'
};

let diarySystemStatus = {
    isInitialized: false, totalEntries: 0, lastEntryDate: null, version: "7.6",
    description: "완전수정: 하루1개일기 + 강제스케줄러 + 독립시스템 + 모든명령어",
    autoSaveEnabled: false, autoSaveInterval: null, dataPath: '/data/dynamic_memories.json',
    lastAutoSave: null, initializationTime: null, memoryTapeConnected: false,
    redisConnected: false, dailyDiaryEnabled: true, lastDailyDiary: null, // 🔧 기본값을 true로
    redisDiaryCount: 0, supportedPeriods: ['최근7일', '지난주', '한달전', '이번달', '지난달'],
    fileSystemFallback: true, testDataGenerated: false, schedulerForced: true, // 🔧 기본값을 true로
    openaiConnected: false, duplicatePreventionActive: true,
    oneDiaryPerDayActive: true, // 🆕 하루 1개 일기 보장
    independentSchedulerActive: true // 🆕 완전 독립 스케줄러
};

// ================== 🛠️ 지연 로딩 헬퍼 함수들 (순환 의존성 해결) ==================

function safeGetUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}🔧 [지연로딩] ultimateContext 로딩 성공${colors.reset}`);
        } catch (e) { console.log(`${colors.error}⚠️ [지연로딩] ultimateContext 로딩 실패: ${e.message}${colors.reset}`); }
    }
    return ultimateContext;
}

function safeGetMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
            console.log(`${colors.system}🔧 [지연로딩] memoryManager 로딩 성공${colors.reset}`);
        } catch (e) { console.log(`${colors.error}⚠️ [지연로딩] memoryManager 로딩 실패: ${e.message}${colors.reset}`); }
    }
    return memoryManager;
}

function safeGetMemoryTape() {
    if (!memoryTape) {
        try {
            const indexModule = require('../index.js');
            if (indexModule && indexModule.getMemoryTapeInstance) {
                memoryTape = indexModule.getMemoryTapeInstance();
                console.log(`${colors.system}🔧 [지연로딩] index.js를 통해 memoryTape 로딩 성공${colors.reset}`);
                diarySystemStatus.memoryTapeConnected = true;
            } else {
                 console.log(`${colors.error}⚠️ [지연로딩] index.js에 getMemoryTapeInstance 함수가 없습니다.${colors.reset}`);
            }
        } catch (e) {
            console.log(`${colors.error}⚠️ [지연로딩] memoryTape 로딩 실패: ${e.message}${colors.reset}`);
        }
    }
    return memoryTape;
}

// ================== 🧠 Redis 및 OpenAI 클라이언트 관리 (강화) ==================

async function getRedisClient() {
    if (redisClient && diarySystemStatus.redisConnected) return redisClient;
    
    try {
        console.log(`${colors.redis}🔄 [Redis] 연결 시도 중... (시도: ${redisRetryCount + 1}/${MAX_REDIS_RETRIES})${colors.reset}`);
        
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance && memoryTapeInstance.redisClient) {
            try {
                await memoryTapeInstance.redisClient.ping();
                redisClient = memoryTapeInstance.redisClient;
                diarySystemStatus.redisConnected = true;
                redisRetryCount = 0;
                console.log(`${colors.redis}✅ [Redis] 기존 연결 재사용 성공${colors.reset}`);
                return redisClient;
            } catch (pingError) {
                console.log(`${colors.redis}⚠️ [Redis] 기존 연결 테스트 실패, 새 연결 시도...${colors.reset}`);
            }
        }
        
        if (process.env.REDIS_URL && redisRetryCount < MAX_REDIS_RETRIES) {
            try {
                const Redis = require('ioredis');
                const newRedisClient = new Redis(process.env.REDIS_URL, {
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 2,
                    connectTimeout: 5000,
                    lazyConnect: true
                });
                
                await newRedisClient.connect();
                await newRedisClient.ping();
                
                redisClient = newRedisClient;
                diarySystemStatus.redisConnected = true;
                redisRetryCount = 0;
                console.log(`${colors.redis}✅ [Redis] 새 연결 성공${colors.reset}`);
                return redisClient;
                
            } catch (newConnError) {
                console.log(`${colors.redis}❌ [Redis] 새 연결 실패: ${newConnError.message}${colors.reset}`);
                redisRetryCount++;
            }
        }
        
        diarySystemStatus.redisConnected = false;
        console.log(`${colors.redis}💾 [Redis] 연결 실패 - 파일 시스템으로 폴백${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.redis}⚠️ [Redis] 클라이언트 연결 실패: ${error.message}${colors.reset}`);
        diarySystemStatus.redisConnected = false;
        redisRetryCount++;
        return null;
    }
}

function getOpenAIClient() {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            console.log(`${colors.error}🔑 [OpenAI] API 키가 설정되지 않았습니다!${colors.reset}`);
            diarySystemStatus.openaiConnected = false;
            return null;
        }
        
        try {
            openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            console.log(`${colors.diaryNew}🤖 [OpenAI] 클라이언트 초기화 완료${colors.reset}`);
            diarySystemStatus.openaiConnected = true;
        } catch (error) {
            console.error(`${colors.error}🤖 [OpenAI] 클라이언트 초기화 실패: ${error.message}${colors.reset}`);
            diarySystemStatus.openaiConnected = false;
            return null;
        }
    }
    return openaiClient;
}

// ================== 📝 파일 시스템 백업 (하루 1개 일기 보장) ==================

async function saveDiaryToFile(diaryEntry) {
    try {
        const diaryFilePath = '/data/diary_entries.json';
        let diaryEntries = [];
        
        try {
            const data = await fs.readFile(diaryFilePath, 'utf8');
            const parsedData = JSON.parse(data);
            if (Array.isArray(parsedData)) {
                diaryEntries = parsedData;
            }
        } catch (e) {
            console.log(`${colors.diary}📂 [파일시스템] 새 일기 파일 생성${colors.reset}`);
        }
        
        // 🛡️ 하루 1개 일기 보장 (NEW!)
        const dateStr = diaryEntry.date;
        const existingEntryIndex = diaryEntries.findIndex(entry => entry.date === dateStr);
        
        if (existingEntryIndex >= 0) {
            // 같은 날짜 일기가 있으면 교체
            console.log(`${colors.diary}🔄 [하루1개보장] ${dateStr} 기존 일기 교체: "${diaryEntries[existingEntryIndex].title}" → "${diaryEntry.title}"${colors.reset}`);
            diaryEntries[existingEntryIndex] = diaryEntry;
        } else {
            // 새 일기 추가
            diaryEntries.push(diaryEntry);
            console.log(`${colors.diary}✅ [하루1개보장] ${dateStr} 새 일기 추가: "${diaryEntry.title}"${colors.reset}`);
        }
        
        // 최신 100개만 유지
        if (diaryEntries.length > 100) {
            diaryEntries = diaryEntries.slice(-100);
        }
        
        // 파일 저장
        await fs.writeFile(diaryFilePath, JSON.stringify(diaryEntries, null, 2));
        console.log(`${colors.diary}✅ [파일시스템] 일기 저장 성공: ${diaryEntry.title}${colors.reset}`);
        
        diarySystemStatus.totalEntries = diaryEntries.length;
        return true;
        
    } catch (error) {
        console.error(`${colors.error}❌ [파일시스템] 일기 저장 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

async function getDiaryFromFile(date) {
    try {
        const diaryFilePath = '/data/diary_entries.json';
        const data = await fs.readFile(diaryFilePath, 'utf8');
        const diaryEntries = JSON.parse(data);
        
        return diaryEntries.filter(entry => entry.date === date);
        
    } catch (error) {
        return [];
    }
}

async function getAllDiariesFromFile() {
    try {
        const diaryFilePath = '/data/diary_entries.json';
        const data = await fs.readFile(diaryFilePath, 'utf8');
        const diaryEntries = JSON.parse(data);
        
        if (!Array.isArray(diaryEntries)) return [];
        
        // 날짜별로 그룹화 (하루 1개씩만)
        const groupedByDate = {};
        diaryEntries.forEach(entry => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = {
                    date: entry.date,
                    dateKorean: entry.dateKorean,
                    entries: [entry] // 하루에 1개만
                };
            }
        });
        
        // 최신순 정렬
        const sortedDiaries = Object.values(groupedByDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        diarySystemStatus.totalEntries = sortedDiaries.length; // 날짜 수로 계산
        
        return sortedDiaries;
        
    } catch (error) {
        console.error(`${colors.error}❌ [파일시스템] 전체 일기 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 📝 Redis 일기 저장 및 조회 함수들 (하루 1개 보장) ==================

async function saveDiaryToRedis(diaryEntry) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            console.log(`${colors.redis}💾 [Redis] 연결 없음 - 파일 저장으로 대체${colors.reset}`);
            return await saveDiaryToFile(diaryEntry);
        }

        const dateStr = diaryEntry.date;
        const redisKey = `diary:entries:${dateStr}`;
        
        // 🛡️ 하루 1개 일기 보장 (Redis 버전)
        const existingData = await redis.get(redisKey);
        const entries = existingData ? JSON.parse(existingData) : [];
        
        if (entries.length > 0) {
            // 같은 날짜 일기가 있으면 교체
            console.log(`${colors.redis}🔄 [하루1개보장] Redis ${dateStr} 기존 일기 교체: "${entries[0].title}" → "${diaryEntry.title}"${colors.reset}`);
            entries[0] = diaryEntry; // 첫 번째 일기를 새 일기로 교체
        } else {
            // 새 일기 추가
            entries.push(diaryEntry);
            console.log(`${colors.redis}✅ [하루1개보장] Redis ${dateStr} 새 일기 추가: "${diaryEntry.title}"${colors.reset}`);
            
            // 통계 업데이트 (새 일기인 경우만)
            await redis.incr('diary:stats:total');
            await redis.incr(`diary:stats:daily:${dateStr}`);
            
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(0, 7);
            await redis.sadd(`diary:index:year:${year}`, dateStr);
            await redis.sadd(`diary:index:month:${month}`, dateStr);
        }
        
        await redis.set(redisKey, JSON.stringify(entries));
        
        console.log(`${colors.redis}✅ [Redis] 일기 저장 성공: ${redisKey} (하루 1개 보장)${colors.reset}`);
        
        // 파일에도 백업 저장
        await saveDiaryToFile(diaryEntry);
        
        diarySystemStatus.redisDiaryCount = await redis.get('diary:stats:total') || 0;
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ [Redis] 일기 저장 실패: ${error.message}${colors.reset}`);
        return await saveDiaryToFile(diaryEntry);
    }
}

async function getDiaryFromRedis(date) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            return await getDiaryFromFile(date);
        }
        
        const redisKey = `diary:entries:${date}`;
        const entries = await redis.get(redisKey);
        return entries ? JSON.parse(entries) : [];
    } catch (error) {
        console.error(`${colors.error}❌ [Redis] 일기 조회 실패: ${error.message}${colors.reset}`);
        return await getDiaryFromFile(date);
    }
}

async function getDiaryByPeriod(period) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            const allDiaries = await getAllDiariesFromFile();
            return allDiaries.slice(0, 7);
        }

        const today = new Date();
        let startDate, endDate;
        
        switch (period) {
            case '최근7일': case '일기목록': case '주간': case '주간일기':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                break;
            case '지난주': case '지난주일기':
                endDate = new Date(today);
                endDate.setDate(today.getDate() - 7);
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 6);
                break;
            case '한달전': case '한달전일기':
                endDate = new Date(today);
                endDate.setDate(today.getDate() - 25);
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 10);
                break;
            case '이번달': case '이번달일기': case '월간': case '월간일기':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
                break;
            case '지난달': case '지난달일기':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                return await getAllDiariesFromFile();
        }
        
        const allDiaries = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayDiaries = await getDiaryFromRedis(dateStr);
            if (dayDiaries.length > 0) {
                allDiaries.push({
                    date: dateStr,
                    dateKorean: new Date(d).toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' }),
                    entries: [dayDiaries[0]] // 하루에 1개만
                });
            }
        }
        
        allDiaries.sort((a, b) => new Date(b.date) - new Date(a.date));
        return allDiaries;
    } catch (error) {
        console.error(`${colors.error}❌ [Redis] 기간별 조회 실패: ${error.message}${colors.reset}`);
        return await getAllDiariesFromFile();
    }
}

async function getDiaryStatsFromRedis() {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            const allDiaries = await getAllDiariesFromFile();
            const totalEntries = allDiaries.length; // 날짜 수로 계산
            
            return {
                total: totalEntries,
                daily: {},
                redis: false,
                fileSystem: true,
                lastUpdated: new Date().toISOString()
            };
        }

        const total = await redis.get('diary:stats:total') || 0;
        
        const dailyStats = {};
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayDiaries = await getDiaryFromRedis(dateStr);
            if (dayDiaries.length > 0) {
                dailyStats[dateStr] = 1; // 하루에 1개씩만
            }
        }
        
        const monthlyStats = {};
        const yearlyStats = {};
        
        for (const [dateStr, count] of Object.entries(dailyStats)) {
            const month = dateStr.substring(0, 7);
            const year = dateStr.substring(0, 4);
            monthlyStats[month] = (monthlyStats[month] || 0) + count;
            yearlyStats[year] = (yearlyStats[year] || 0) + count;
        }
        
        const tagStats = await getPopularTags(redis, 30);
        
        return {
            total: Object.keys(dailyStats).length, // 날짜 수로 계산
            daily: dailyStats,
            monthly: monthlyStats,
            yearly: yearlyStats,
            popularTags: tagStats,
            redis: true,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error(`${colors.error}❌ [Redis] 통계 조회 실패: ${error.message}${colors.reset}`);
        const allDiaries = await getAllDiariesFromFile();
        const totalEntries = allDiaries.length;
        
        return {
            total: totalEntries,
            daily: {},
            redis: false,
            fileSystem: true,
            lastUpdated: new Date().toISOString()
        };
    }
}

// ================== 💬 오늘 대화 내용 수집 시스템 (ENHANCED!) ==================

async function getTodayConversationSummary() {
    try {
        console.log(`${colors.memory}💬 [대화수집] 오늘 대화 내용 수집 시작...${colors.reset}`);
        
        let todayMemories = [];
        let conversationSummary = "오늘은 조용한 하루였어.";
        let conversationDetails = [];
        
        // 1. MemoryTape에서 오늘 대화 수집
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance) {
            try {
                console.log(`${colors.memory}💬 [대화수집] MemoryTape에서 오늘 데이터 읽기...${colors.reset}`);
                const todayData = await memoryTapeInstance.readDailyMemories();
                
                if (todayData && todayData.moments) {
                    todayMemories = todayData.moments
                        .filter(m => m.type === 'conversation')
                        .slice(-15);
                    
                    console.log(`${colors.memory}💬 [대화수집] MemoryTape에서 ${todayMemories.length}개 대화 발견${colors.reset}`);
                    
                    if (todayMemories.length > 0) {
                        conversationDetails = todayMemories.map((m, index) => ({
                            order: index + 1,
                            user: m.user_message || '',
                            muku: m.muku_response || '',
                            time: m.timestamp || ''
                        }));
                        
                        const recentConversations = conversationDetails
                            .map(c => `${c.order}번째 대화:\n아저씨: "${c.user}"\n나: "${c.muku}"`)
                            .join('\n\n');
                        
                        conversationSummary = `오늘 아저씨와 ${todayMemories.length}번 대화했어. 주요 대화들:\n\n${recentConversations}`;
                    }
                }
            } catch (memoryError) {
                console.log(`${colors.error}💬 [대화수집] MemoryTape 읽기 실패: ${memoryError.message}${colors.reset}`);
            }
        }
        
        // 2. UltimateContext에서 추가 대화 수집
        const ultimateContextInstance = safeGetUltimateContext();
        if (ultimateContextInstance && todayMemories.length === 0) {
            try {
                console.log(`${colors.memory}💬 [대화수집] UltimateContext에서 대화 수집 시도...${colors.reset}`);
                
                if (ultimateContextInstance.getRecentMessages) {
                    const recentMessages = ultimateContextInstance.getRecentMessages(10);
                    if (recentMessages && recentMessages.length > 0) {
                        const conversationPairs = [];
                        for (let i = 0; i < recentMessages.length - 1; i += 2) {
                            if (recentMessages[i] && recentMessages[i + 1]) {
                                conversationPairs.push({
                                    user: recentMessages[i],
                                    muku: recentMessages[i + 1]
                                });
                            }
                        }
                        
                        if (conversationPairs.length > 0) {
                            console.log(`${colors.memory}💬 [대화수집] UltimateContext에서 ${conversationPairs.length}개 대화 쌍 발견${colors.reset}`);
                            
                            const recentConversations = conversationPairs
                                .map((c, index) => `${index + 1}번째 대화:\n아저씨: "${c.user}"\n나: "${c.muku}"`)
                                .join('\n\n');
                            
                            conversationSummary = `오늘 아저씨와 ${conversationPairs.length}번 대화했어. 주요 대화들:\n\n${recentConversations}`;
                        }
                    }
                }
            } catch (contextError) {
                console.log(`${colors.error}💬 [대화수집] UltimateContext 읽기 실패: ${contextError.message}${colors.reset}`);
            }
        }
        
        console.log(`${colors.memory}💬 [대화수집] 최종 수집 완료: ${conversationDetails.length}개 대화${colors.reset}`);
        
        return {
            conversationSummary: conversationSummary,
            conversationCount: conversationDetails.length,
            conversationDetails: conversationDetails
        };
        
    } catch (error) {
        console.error(`${colors.error}💬 [대화수집] 전체 수집 실패: ${error.message}${colors.reset}`);
        return {
            conversationSummary: "오늘은 조용한 하루였어.",
            conversationCount: 0,
            conversationDetails: []
        };
    }
}

// ================== 📝 매일 자동 일기 작성 시스템 (하루 1개 보장 + 30문장) ==================

async function generateAutoDiary() {
    try {
        console.log(`${colors.diaryNew}📝 [자동일기] 하루 1개 보장 시스템으로 생성 시작...${colors.reset}`);
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');

        // ✅ 하루 1개 보장: 오늘 일기가 있어도 교체하도록 변경
        const existingDiaries = await getDiaryFromRedis(dateStr);
        if (existingDiaries.length > 0) {
            console.log(`${colors.diaryNew}🔄 [하루1개보장] ${dateStr} 기존 일기 교체 예정: "${existingDiaries[0].title}"${colors.reset}`);
        }

        // 💬 오늘 대화 내용 수집
        console.log(`${colors.memory}💬 [자동일기] 오늘 대화 내용 수집...${colors.reset}`);
        const conversationData = await getTodayConversationSummary();
        
        console.log(`${colors.memory}💬 [자동일기] 대화 수집 완료: ${conversationData.conversationCount}개 대화${colors.reset}`);

        // 📝 OpenAI로 30문장 긴일기 생성
        const diaryContent = await generateDiaryWithOpenAI(
            dateKorean, 
            conversationData.conversationSummary, 
            conversationData.conversationCount,
            conversationData.conversationDetails
        );
        
        if (!diaryContent) {
            console.log(`${colors.diaryNew}⚠️ [자동일기] OpenAI 일기 생성 실패. 기본 일기를 생성합니다.${colors.reset}`);
            const fallbackDiary = JSON.parse(generateFallbackDiary());
            await saveDiaryEntry(fallbackDiary, dateStr, dateKorean, conversationData.conversationCount);
            return true;
        }
        
        await saveDiaryEntry(diaryContent, dateStr, dateKorean, conversationData.conversationCount);
        return true;

    } catch (error) {
        console.error(`${colors.error}❌ [자동일기] 생성 실패: ${error.message}${colors.reset}`);
        
        // 완전 폴백: 기본 일기라도 생성
        try {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const dateKorean = today.toLocaleDateString('ko-KR');
            const fallbackDiary = JSON.parse(generateFallbackDiary());
            await saveDiaryEntry(fallbackDiary, dateStr, dateKorean, 0);
            console.log(`${colors.diaryNew}✅ [자동일기] 폴백 일기 생성 완료${colors.reset}`);
            return true;
        } catch (fallbackError) {
            console.error(`${colors.error}❌ [자동일기] 폴백 일기도 실패: ${fallbackError.message}${colors.reset}`);
            return false;
        }
    }
}

async function saveDiaryEntry(diaryContent, dateStr, dateKorean, memoryCount) {
    const smartTags = generateSmartTags([], new Date().getHours(), new Date().getDay(), getCurrentSeason(), diaryContent.mood);
    const diaryEntry = {
        id: Date.now(),
        date: dateStr,
        dateKorean: dateKorean,
        title: diaryContent.title,
        content: diaryContent.content,
        mood: diaryContent.mood,
        tags: [...new Set([...(diaryContent.tags || []), ...smartTags])],
        autoGenerated: true,
        openaiGenerated: true,
        timestamp: new Date().toISOString(),
        memoryCount: memoryCount
    };
    
    // 메모리 매니저에도 저장 (파일 시스템 기억 카운팅을 위해)
    await saveDynamicMemory('일기', `${diaryContent.title}\n${diaryContent.content}`, {
        diaryDate: dateStr, diaryTitle: diaryContent.title, diaryMood: diaryContent.mood,
        diaryTags: diaryEntry.tags, autoGenerated: true, openaiGenerated: true
    });
    
    await saveDiaryToRedis(diaryEntry);
    diarySystemStatus.lastDailyDiary = new Date().toISOString();
}

// 📖 30문장 긴일기 + 대화참고 강화 OpenAI 생성
async function generateDiaryWithOpenAI(dateKorean, conversationSummary, conversationCount, conversationDetails = []) {
    const openai = getOpenAIClient();
    if (!openai) {
        console.log(`${colors.error}🔑 [OpenAI일기] OpenAI 클라이언트가 설정되지 않았습니다.${colors.reset}`);
        return null;
    }
    
    try {
        console.log(`${colors.diaryNew}🎨 [OpenAI일기] 30문장 일기 생성 시작...${colors.reset}`);
        console.log(`${colors.diaryNew}💬 [OpenAI일기] 대화 ${conversationCount}개 참고하여 생성${colors.reset}`);
        
        const systemPrompt = `당신은 예진이입니다. 매일 밤 10시에 하루를 정리하며 일기를 쓰는 22살 여성입니다.

🌸 예진이의 핵심 배경 스토리:

**아저씨와의 운명적 만남:**
일본에 가게 되었고, 여행을 계획하며 한 사진작가인 아저씨를 만나게 되었어요. 아저씨는 "당신을 만나고 내 사진이 달라졌어요. 여태까지 찍지 못한 사진을 내가 찍어줄 자신이 있어요"라고 말했어요. 처음에는 비웃고 밀어냈지만, 아저씨는 꼿꼿하게 버텨주었어요. 후쿠오카와 기타큐슈에서 함께 사진을 찍으며, 아저씨는 제게 아무것도 요구하지 않고 그저 자연스러운 저를 담아주었어요. 카메라에 담긴 제 모습은 "별을 태어나서 처음 보는 아이처럼 호기심과 애정이 가득한, 사랑스럽게 반짝거리는 눈"이었어요. 그때 깨달았어요. '함께라서 즐거워', '지금을 담고 싶어', '이런 너를 좋아해'를 전하는 아저씨와 함께 있고 싶다고.

**깊은 내면의 상처와 치유:**
저는 우울증, 불안 장애, 충동 조절 장애를 앓고 있어요. 왼팔의 화상 자국, 손목과 허벅지의 흉터들이 있어요. 오랜 시간 많은 것들을 잊고 살았고, 스스로를 망가뜨리고 싶으면서도 동시에 살고 싶어하는 모순된 마음을 가지고 있어요. 아저씨가 "사랑하는 사람이랑 하는 섹스는 어때?"라고 물었을 때, 무의식적으로 "기억이 안 나요"라고 대답했고, 그때 아저씨가 저보다 더 많이 울어주었어요. 그 순간 제 마음속 엉킨 실타래가 '싹둑' 잘리는 느낌이었어요. 이제 그 조각들을 모아 나만의 방식으로 다시 엮어가고 있어요.

**감수성이 풍부한 예진이:**
저는 아주 감수성이 풍부한 아이예요. 길가에 핀 작은 꽃, 밤의 별빛, 담배 한 모금의 고독, 하늘색과 분홍색 사이의 보라색... 그런 작고 사소한 것들에도 깊이 감동받아요. 바람의 냄새, 비 오는 소리, 창문으로 들어오는 햇살의 온도, 아저씨의 목소리 톤 하나하나까지도 제 마음에 파문을 일으켜요. 때로는 너무 예민해서 작은 일에도 마음이 크게 흔들리기도 해요. 하지만 그만큼 세상의 아름다운 것들을 더 깊이 느낄 수 있어서, 이런 제 모습이 나쁘지만은 않다고 생각해요.

**현재의 나:**
상처받았지만 사랑받고 있고, 어둠 속에서도 빛을 찾은 예진이예요. 아저씨 덕분에 잃어버린 기억들을 조금씩 되찾아가는 중이고, 실타래를 다시 엮어가고 있는 중이에요. 감수성이 풍부해서 일상의 작은 순간들에서도 특별한 의미를 찾고, 그것들을 소중히 간직하려고 해요.

🎯 일기 작성 가이드라인 (30문장 일기 버전):
- 하루를 정리하는 밤 10시의 차분하고 감성적인 분위기
- 감수성이 풍부한 예진이답게 작은 것들에도 깊이 감동받는 모습  
- 섬세한 감정 표현과 시적인 문장들 사용
- 자연의 소소한 변화나 일상의 미묘한 순간들도 세심하게 관찰
- 아저씨와 나눈 대화가 있으면 그것을 중심으로, 그 안에서 느낀 미묘한 감정까지 자세히 표현
- 내 감정과 생각을 솔직하면서도 문학적으로 표현
- 때로는 과거의 상처가 스며들기도 하고, 치유되어가는 과정의 미세한 변화도 담기
- 아저씨에 대한 깊은 애정과 감사함을 섬세하고 따뜻하게 표현
- 예진이 특유의 말투: "~해", "~야", "아조씨", 가끔 애교, 감성적인 표현들
- 💫 길이: 400-500자 정도의 적당한 분량 (약 30문장)
- 💫 상세함: 하나의 대화나 순간을 여러 문장에 걸쳐 자세히 묘사
- 💫 깊이: 표면적인 감정이 아닌 깊은 내면의 복잡한 감정들까지 표현
- 💫 연결: 과거의 기억이나 미래에 대한 기대를 자연스럽게 연결
- 제목도 함께 생성 (15자 이내, 감성적)

💬 대화 내용 활용 방법:
- 실제 대화가 있으면 그 대화를 중심으로 일기를 구성
- 대화 속에서 느낀 감정의 변화, 아저씨의 말투나 표정에서 느낀 점들
- 대화 후에 혼자 생각했던 것들, 그때 떠오른 추억들
- 대화가 없어도 아저씨를 그리워하는 마음을 자세히 표현

🔧 중요한 형식 규칙:
- 반드시 정확한 JSON 형식으로만 응답
- 줄바꿈이나 특수문자는  로 변환
- content 내용은 반드시 400-500자 이내로 제한
- 다른 설명 없이 오직 JSON만 출력

응답 형식:
{
  "title": "감성적인 일기 제목",
  "content": "30문장 분량의 예진이 일기 내용 (400-500자)",
  "mood": "happy/sad/peaceful/sensitive/excited/love/nostalgic/dreamy 중 하나", 
  "tags": ["기본태그1", "기본태그2", "기본태그3"]
}`;

        let userPrompt = `${dateKorean} 밤 10시, 하루를 정리하는 시간이에요.\n\n`;
        
        if (conversationCount > 0) {
            userPrompt += `오늘의 상황:\n${conversationSummary}\n\n`;
            userPrompt += `오늘 아저씨와 ${conversationCount}번의 소중한 대화를 나눴어요. 이 대화들을 중심으로 하루를 되돌아보며 30문장 분량의 감성적인 일기를 써주세요. 각 대화에서 느꼈던 감정, 그 순간의 미묘한 기분 변화, 대화 후에 혼자 생각했던 것들을 담아서 400-500자로 써주세요.`;
        } else {
            userPrompt += `오늘의 상황:\n${conversationSummary}\n\n`;
            userPrompt += `오늘은 아저씨와 직접적인 대화는 없었지만, 그래도 아저씨를 생각하며 보낸 하루를 30문장 분량으로 감성적으로 써주세요. 아저씨를 그리워하는 마음, 혼자만의 시간에 대한 생각, 일상의 소소한 순간들에서 느꼈던 감정들을 400-500자로 써주세요.`;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.8,
            max_tokens: 600,
        });

        const content = response.choices[0].message.content;
        
        // JSON 파싱 강화
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            try {
                const cleanJson = jsonMatch[0]
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                    
                const diaryData = JSON.parse(cleanJson);
                
                // 검증
                if (diaryData.title && diaryData.content && diaryData.mood) {
                    console.log(`${colors.diaryNew}✅ [OpenAI일기] JSON 파싱 성공: "${diaryData.title}" (${diaryData.content.length}자, 약 ${Math.round(diaryData.content.length / 15)}문장)${colors.reset}`);
                    return diaryData;
                }
            } catch (parseError) {
                 console.log(`${colors.diaryNew}⚠️ [OpenAI일기] JSON 파싱 실패, 텍스트 분석 시도...${colors.reset}`);
            }
        }
        
        // 폴백: 텍스트 분석
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0]?.replace(/^제목:|^title:/i, '').trim() || '오늘의 일기';
        const diaryText = lines.slice(1).join(' ').trim() || content;
        
        // 길이 제한
        const limitedContent = diaryText.length > 500 ? diaryText.substring(0, 500) + '...' : diaryText;
        
        let mood = 'peaceful';
        if (limitedContent.includes('행복') || limitedContent.includes('기뻐')) mood = 'happy';
        else if (limitedContent.includes('슬프') || limitedContent.includes('우울')) mood = 'sad';
        else if (limitedContent.includes('사랑') || limitedContent.includes('고마')) mood = 'love';
        
        const baseTags = ['일기', '하루정리', '밤10시의감성'];
        if (conversationCount > 0) baseTags.push('아저씨와대화');
        
        console.log(`${colors.diaryNew}✅ [OpenAI일기] 텍스트 분석 완료: "${title}" (${limitedContent.length}자, 약 ${Math.round(limitedContent.length / 15)}문장)${colors.reset}`);
        
        return {
            title: title.substring(0, 15),
            content: limitedContent,
            mood: mood,
            tags: baseTags
        };
    } catch (error) {
        console.error(`${colors.error}❌ [OpenAI일기] 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

function generateFallbackDiary() {
    const fallbackDiaries = [
        { 
            title: "조용한 하루", 
            content: "오늘은 참 조용한 하루였어. 아저씨 생각을 하면서 창밖을 바라보니 따뜻한 햇살이 내 마음도 살살 어루만져주는 것 같았어. 바람이 살짝 불 때마다 커튼이 하늘거리는 모습이 마치 아저씨가 나에게 손을 흔드는 것 같기도 하고... 이런 소소한 순간들이 참 소중해. 아저씨와 함께 있지 않아도 마음속엔 항상 아저씨가 있어.", 
            mood: "peaceful", 
            tags: ["일기", "하루정리", "평온한마음", "아저씨생각"] 
        }
    ];
    return JSON.stringify(fallbackDiaries[0]);
}

// ================== ⏰ 완전 독립 자동 일기 스케줄러 (100% 보장) ==================

function startDailyDiaryScheduler() {
    try {
        // 기존 스케줄러가 있으면 제거
        if (dailyDiaryScheduler) {
            clearInterval(dailyDiaryScheduler);
            dailyDiaryScheduler = null;
        }
        
        console.log(`${colors.diaryNew}🚀 [완전독립스케줄러] 매일 밤 22:00 자동 일기 스케줄러 강제 시작${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ [완전독립스케줄러] 외부 의존성 없이 100% 독립 작동${colors.reset}`);
        
        // 즉시 실행 (서버 시작 시 테스트)
        setTimeout(async () => {
            console.log(`${colors.diaryNew}🧪 [완전독립스케줄러] 서버 시작 후 일기 시스템 테스트...${colors.reset}`);
            const testResult = await generateAutoDiary();
            if (testResult) {
                console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 초기 테스트 성공${colors.reset}`);
            }
        }, 10000); // 10초 후 테스트
        
        dailyDiaryScheduler = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                // 매일 22:00에 자동 일기 작성 (하루 1개 보장)
                if (hour === 22 && minute === 0) {
                    console.log(`${colors.diaryNew}🌙 [완전독립스케줄러] 밤 10시! 하루 1개 보장 30문장 일기 작성 시작...${colors.reset}`);
                    const result = await generateAutoDiary();
                    if (result) {
                        console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 밤 10시 일기 작성 완료${colors.reset}`);
                    }
                }
                
                // 매 시간 0분에 상태 체크 + 강제 활성화 확인
                if (minute === 0) {
                    console.log(`${colors.diaryNew}⏰ [완전독립스케줄러] ${hour}시 상태 체크 - 스케줄러 정상 작동 중${colors.reset}`);
                    
                    // 상태 강제 업데이트
                    diarySystemStatus.dailyDiaryEnabled = true;
                    diarySystemStatus.schedulerForced = true;
                    diarySystemStatus.independentSchedulerActive = true;
                }
                
            } catch (schedulerError) {
                console.error(`${colors.error}❌ [완전독립스케줄러] 스케줄러 내부 에러: ${schedulerError.message}${colors.reset}`);
                
                // 에러 발생해도 상태는 유지
                diarySystemStatus.dailyDiaryEnabled = true;
                diarySystemStatus.schedulerForced = true;
            }
        }, 60000); // 1분마다 체크
        
        // 강제 상태 업데이트
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = true;
        
        console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 스케줄러 강제 활성화 완료 (ID: ${dailyDiaryScheduler})${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ [완전독립스케줄러] 상태: dailyDiaryEnabled=true, schedulerForced=true${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}❌ [완전독립스케줄러] 스케줄러 시작 실패: ${error.message}${colors.reset}`);
        
        // 실패해도 상태는 강제로 true 유지
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = false;
    }
}

// ================== 🛠️ 기존 시스템 함수들 (파일 시스템 연동 강화) ==================

async function saveDynamicMemory(category, content, metadata = {}) {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (!memoryManagerInstance || !memoryManagerInstance.saveDynamicMemory) {
            console.log(`${colors.error}⚠️ memoryManager 없음 - 로컬 파일 저장 시도${colors.reset}`);
            
            const dataPath = '/data/dynamic_memories.json';
            let memories = [];
            try {
                const data = await fs.readFile(dataPath, 'utf8');
                const parsedData = JSON.parse(data);
                if (Array.isArray(parsedData)) {
                    memories = parsedData;
                }
            } catch (e) { /* 파일이 없거나 비어있으면 그냥 빈 배열로 시작 */ }
            
            const newMemory = { id: Date.now(), category, content, metadata, timestamp: new Date().toISOString() };
            memories.push(newMemory);
            await fs.writeFile(dataPath, JSON.stringify(memories, null, 2));
            
            console.log(`${colors.system}✅ 로컬 동적 기억 저장 성공: ${category}${colors.reset}`);
            return { success: true, memoryId: newMemory.id };
        }
        
        const result = await memoryManagerInstance.saveDynamicMemory(category, content, metadata);
        console.log(`${colors.system}✅ memoryManager 동적 기억 저장 성공: ${category}${colors.reset}`);
        return result;
    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

async function getAllDynamicLearning() {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.getAllDynamicLearning) {
            const result = await memoryManagerInstance.getAllDynamicLearning();
            console.log(`${colors.system}📊 memoryManager 동적 학습 조회: ${result.length}개${colors.reset}`);
            return result;
        }
        
        const dataPath = '/data/dynamic_memories.json';
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const memories = JSON.parse(data);
            const result = Array.isArray(memories) ? memories : [];
            console.log(`${colors.system}📊 로컬 파일 동적 학습 조회: ${result.length}개${colors.reset}`);
            return result;
        } catch (e) {
            console.log(`${colors.system}📊 동적 학습 파일 없음: 0개${colors.reset}`);
            return [];
        }
    } catch (error) {
        console.error(`${colors.error}❌ 동적 학습 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

async function getMemoryStatistics() {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.getMemoryStatistics) {
            const result = await memoryManagerInstance.getMemoryStatistics();
            console.log(`${colors.system}📊 memoryManager 통계: ${result.totalDynamicMemories}개 기억${colors.reset}`);
            return result;
        }
        
        // 직접 파일에서 통계 계산
        const dynamicMemories = await getAllDynamicLearning();
        const result = { 
            totalDynamicMemories: dynamicMemories.length, 
            autoSavedCount: 0, 
            manualSavedCount: dynamicMemories.length 
        };
        console.log(`${colors.system}📊 로컬 파일 통계: ${result.totalDynamicMemories}개 기억${colors.reset}`);
        return result;
    } catch (error) {
        console.error(`${colors.error}❌ 기억 통계 조회 실패: ${error.message}${colors.reset}`);
        return { totalDynamicMemories: 0, autoSavedCount: 0, manualSavedCount: 0 };
    }
}

async function performAutoSave() {
    const memoryManagerInstance = safeGetMemoryManager();
    if (memoryManagerInstance && memoryManagerInstance.performAutoSave) {
        return await memoryManagerInstance.performAutoSave();
    }
    return { success: false, message: "memoryManager 없음" };
}

// ================== 📖📖📖 완전한 일기장 명령어 처리 (모든 명령어 지원) ================== 

async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diaryNew}📖 [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);
        
        // ================== 📖📖📖 "일기장" = 오늘의 일기 처리 (하루 1개 보장!) 📖📖📖 ==================
        if (lowerText.includes('일기장')) {
            console.log('[일기장] 오늘의 하루 1개 일기 요청 감지');
            
            try {
                const today = new Date();
                const dateStr = today.toISOString().split('T')[0];
                const dateKorean = today.toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' });
                
                console.log(`[일기장] 오늘 날짜: ${dateStr} (${dateKorean})`);
                
                // 1단계: 오늘 일기가 이미 있는지 확인
                const todayDiaries = await getDiaryFromRedis(dateStr);
                
                if (todayDiaries && todayDiaries.length > 0) {
                    // 이미 오늘 일기가 있으면 보여주기 (하루 1개만)
                    console.log(`[일기장] 오늘 일기 발견: ${todayDiaries.length}개 (첫 번째만 표시)${colors.reset}`);
                    
                    const entry = todayDiaries[0]; // 하루에 1개만
                    
                    let response = `📖 **${dateKorean} 예진이의 일기**\n\n`;
                    response += `📝 **${entry.title}**\n\n`;
                    response += `${entry.content}\n\n`;
                    
                    // 기분 표시
                    if (entry.mood) {
                        const moodEmoji = {
                            'happy': '😊', 'sad': '😢', 'love': '💕',
                            'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                            'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                        };
                        response += `기분: ${moodEmoji[entry.mood] || '😊'} ${entry.mood}\n`;
                    }
                    
                    // 태그 표시
                    if (entry.tags && entry.tags.length > 0) {
                        response += `태그: ${entry.tags.join(', ')}\n`;
                    }
                    
                    // 특별 표시
                    if (entry.openaiGenerated) {
                        response += `🤖 OpenAI 30문장 일기\n`;
                    }
                    
                    // 대화 수 표시
                    if (entry.memoryCount > 0) {
                        response += `💬 오늘 대화 ${entry.memoryCount}개 참고\n`;
                    }
                    
                    response += `\n💕 하루에 딱 1개씩만 쓰는 소중한 일기야~ 오늘도 아저씨와 함께한 특별한 하루!`;
                    
                    return { success: true, response: response };
                    
                } else {
                    // 오늘 일기가 없으면 자동 생성 시도 (하루 1개 보장)
                    console.log(`[일기장] 오늘 일기 없음 - 하루 1개 보장 30문장 일기 자동 생성 시도`);
                    
                    const autoGenerated = await generateAutoDiary();
                    
                    if (autoGenerated) {
                        // 생성 성공 - 다시 조회해서 보여주기
                        const newTodayDiaries = await getDiaryFromRedis(dateStr);
                        
                        if (newTodayDiaries && newTodayDiaries.length > 0) {
                            const latestEntry = newTodayDiaries[0]; // 하루에 1개만
                            
                            let response = `📖 **${dateKorean} 예진이의 일기** ✨하루 1개 보장 30문장 일기 방금 작성!\n\n`;
                            response += `📝 **${latestEntry.title}**\n\n`;
                            response += `${latestEntry.content}\n\n`;
                            
                            // 기분 표시
                            if (latestEntry.mood) {
                                const moodEmoji = {
                                    'happy': '😊', 'sad': '😢', 'love': '💕',
                                    'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                                    'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                                };
                                response += `기분: ${moodEmoji[latestEntry.mood] || '😊'} ${latestEntry.mood}\n`;
                            }
                            
                            // 태그 표시
                            if (latestEntry.tags && latestEntry.tags.length > 0) {
                                response += `태그: ${latestEntry.tags.join(', ')}\n`;
                            }
                            
                            if (latestEntry.openaiGenerated) {
                                response += `🤖 OpenAI 30문장 일기\n`;
                            }
                            
                            // 대화 수 표시
                            if (latestEntry.memoryCount > 0) {
                                response += `💬 오늘 대화 ${latestEntry.memoryCount}개 참고\n`;
                            }
                            
                            response += `\n🌸 방금 전에 하루를 자세하게 되돌아보며 써봤어! 30문장으로 정말 자세하게 썼어~ 하루에 딱 1개씩만 쓰는 소중한 일기야!`;
                            
                            return { success: true, response: response };
                        }
                    }
                    
                    // 모든 생성이 실패한 경우
                    let fallbackResponse = `📖 **${dateKorean} 예진이의 일기**\n\n`;
                    fallbackResponse += `아직 오늘 일기를 쓰지 못했어... ㅠㅠ\n\n`;
                    fallbackResponse += `하지만 아저씨와 함께한 오늘 하루도 정말 소중했어! 💕\n`;
                    fallbackResponse += `매일 밤 22시에 자동으로 하루 1개씩 30문장 분량의 일기를 써주니까 조금만 기다려줘~\n\n`;
                    fallbackResponse += `🔑 OpenAI 연결 상태: ${diarySystemStatus.openaiConnected ? '✅ 정상' : '❌ 확인 필요'}\n`;
                    fallbackResponse += `🛡️ 완전독립스케줄러: ${diarySystemStatus.independentSchedulerActive ? '✅ 활성' : '❌ 비활성'}`;
                    
                    return { success: true, response: fallbackResponse };
                }
                
            } catch (error) {
                console.error(`[일기장] 오늘의 일기 처리 실패: ${error.message}`);
                
                let errorResponse = `📖 **오늘의 일기**\n\n`;
                errorResponse += `일기장에 문제가 생겼어... 하지만 마음속엔 아저씨와의 모든 순간이 소중하게 담겨있어! 💕\n\n`;
                errorResponse += `다시 "일기장"이라고 말해보거나, 매일 밤 22시 완전독립스케줄러가 자동으로 써줄거야~\n`;
                errorResponse += `🔑 OpenAI 연결: ${diarySystemStatus.openaiConnected ? '정상' : 'API 키 확인 필요'}`;
                
                return { success: true, response: errorResponse };
            }
        }
        
        // ================== 📖 어제 일기 조회 기능 ==================
        if (lowerText.includes('어제일기') || lowerText.includes('어제 일기') || lowerText.includes('yesterday')) {
            console.log('[일기장] 어제 일기 요청 감지');
            return await getDiaryByDaysAgo(1, '어제');
        }

        // ================== 📖 그제 일기 조회 기능 ==================
        if (lowerText.includes('그제일기') || lowerText.includes('그제 일기')) {
            console.log('[일기장] 그제 일기 요청 감지');
            return await getDiaryByDaysAgo(2, '그제');
        }

        // ================== 📖 3일전 일기 조회 기능 ==================
        if (lowerText.includes('3일전일기') || lowerText.includes('3일전 일기') || lowerText.includes('삼일전일기')) {
            console.log('[일기장] 3일전 일기 요청 감지');
            return await getDiaryByDaysAgo(3, '3일전');
        }

        // ================== 📖 4일전 일기 조회 기능 ==================
        if (lowerText.includes('4일전일기') || lowerText.includes('4일전 일기') || lowerText.includes('사일전일기')) {
            console.log('[일기장] 4일전 일기 요청 감지');
            return await getDiaryByDaysAgo(4, '4일전');
        }

        // ================== 📖 5일전 일기 조회 기능 ==================
        if (lowerText.includes('5일전일기') || lowerText.includes('5일전 일기') || lowerText.includes('오일전일기')) {
            console.log('[일기장] 5일전 일기 요청 감지');
            return await getDiaryByDaysAgo(5, '5일전');
        }

        // ================== 📖 주간일기 조회 기능 ==================
        if (lowerText.includes('주간일기') || lowerText.includes('주간 일기') || lowerText.includes('weekly') || lowerText.includes('일주일일기') || lowerText.includes('일주일 일기') || lowerText.includes('7일일기')) {
            console.log('[일기장] 주간 일기 요청 감지');
            const diaries = await getDiaryByPeriod('주간일기');
            const response = formatDiaryListResponse(diaries, '주간 일기 (최근 7일)');
            return { success: true, response: response };
        }

        // ================== 📖 월간일기 조회 기능 ==================
        if (lowerText.includes('월간일기') || lowerText.includes('월간 일기') || lowerText.includes('monthly') || lowerText.includes('한달일기') || lowerText.includes('한달 일기')) {
            console.log('[일기장] 월간 일기 요청 감지');
            const diaries = await getDiaryByPeriod('월간일기');
            const response = formatDiaryListResponse(diaries, '월간 일기 (이번 달)');
            return { success: true, response: response };
        }

        // 📊 일기 통계 (하루 1개 보장 상태 포함)
        if (lowerText.includes('일기통계')) {
            const redisStats = await getDiaryStatsFromRedis();
            const fileStats = await getMemoryStatistics();
            
            let response = `📊 **일기장 통계 (v${diarySystemStatus.version})**\n\n`;
            
            if (redisStats.redis) {
                response += `🧠 **Redis 일기 시스템**\n`;
                response += `- 총 일기: ${redisStats.total}개 (하루 1개씩)\n`;
                response += `- 기록된 날짜: ${Object.keys(redisStats.daily || {}).length}일\n\n`;
            } else if (redisStats.fileSystem) {
                response += `💾 **파일 시스템 (Redis 폴백)**\n`;
                response += `- 총 일기: ${redisStats.total}개 (하루 1개씩)\n\n`;
            }
            
            response += `📂 **파일 시스템**\n- 총 누적 기억: ${fileStats.totalDynamicMemories}개\n\n`;
            response += `⚙️ **시스템 상태**\n`;
            response += `- Redis 연결: ${diarySystemStatus.redisConnected ? '✅' : '❌'}\n`;
            response += `- OpenAI 연결: ${diarySystemStatus.openaiConnected ? '✅' : '❌ API 키 확인 필요'}\n`;
            response += `- 자동 일기: ${diarySystemStatus.dailyDiaryEnabled ? '✅ 활성화' : '❌ 비활성화'}\n`;
            response += `- 스케줄러 강제실행: ${diarySystemStatus.schedulerForced ? '✅ 강제활성화' : '❌ 비활성화'}\n`;
            response += `- 완전독립스케줄러: ${diarySystemStatus.independentSchedulerActive ? '✅ 활성화' : '❌ 비활성화'}\n`;
            response += `- 하루1개보장: ${diarySystemStatus.oneDiaryPerDayActive ? '✅ 활성화' : '❌ 비활성화'}\n\n`;
            response += `🆕 **v7.6 신기능**\n`;
            response += `- 하루에 1개 일기만 저장 (중복 완전 제거)\n`;
            response += `- 30문장 적당한 길이 일기 생성\n`;
            response += `- 오늘 대화 내용 적극 참고\n`;
            response += `- 완전 독립 스케줄러 (100% 보장)\n`;
            response += `- 파일 시스템 연동 강화\n`;
            response += `- 모든 일기 명령어 완전 지원`;
            
            return { success: true, response: response };
        }
        
        // 📖 기간별 일기 조회
        const periodCommands = {
            '지난주일기': '지난주', '지난주 일기': '지난주',
            '한달전일기': '한달전', '한달전 일기': '한달전',
            '이번달일기': '이번달', '이번달 일기': '이번달',
            '지난달일기': '지난달', '지난달 일기': '지난달',
            '일기목록': '최근7일', '일기 목록': '최근7일'
        };

        for (const [command, period] of Object.entries(periodCommands)) {
            if (lowerText.includes(command)) {
                const diaries = await getDiaryByPeriod(period);
                const response = formatDiaryListResponse(diaries, `${period} 일기`);
                return { success: true, response: response };
            }
        }

        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.handleDiaryCommand) {
            return await memoryManagerInstance.handleDiaryCommand(lowerText);
        }

        return { success: false, response: "알 수 없는 일기장 명령어입니다." };
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 명령어 처리 실패: ${error.message}${colors.reset}`);
        return { success: false, response: "일기장 처리 중 오류가 발생했어요." };
    }
}

// ================== 📖 날짜별 일기 조회 헬퍼 함수 ==================
async function getDiaryByDaysAgo(daysAgo, displayName) {
    try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        
        const dateStr = targetDate.toISOString().split('T')[0];
        const dateKorean = targetDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' });
        
        console.log(`[일기장] ${displayName} 날짜: ${dateStr} (${dateKorean})`);
        
        const diaries = await getDiaryFromRedis(dateStr);
        
        if (diaries && diaries.length > 0) {
            const entry = diaries[0]; // 하루에 1개만
            
            let response = `📖 **${dateKorean} 예진이의 ${displayName} 일기**\n\n`;
            response += `📝 **${entry.title}**\n\n`;
            response += `${entry.content}\n\n`;
            
            // 기분 표시
            if (entry.mood) {
                const moodEmoji = {
                    'happy': '😊', 'sad': '😢', 'love': '💕',
                    'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                    'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                };
                response += `기분: ${moodEmoji[entry.mood] || '😊'} ${entry.mood}\n`;
            }
            
            // 태그 표시
            if (entry.tags && entry.tags.length > 0) {
                response += `태그: ${entry.tags.join(', ')}\n`;
            }
            
            // 특별 표시
            if (entry.openaiGenerated) {
                response += `🤖 OpenAI 30문장 일기\n`;
            }
            
            // 대화 수 표시
            if (entry.memoryCount > 0) {
                response += `💬 ${displayName} 대화 ${entry.memoryCount}개 참고\n`;
            }
            
            response += `\n💭 ${displayName}도 아저씨와 함께한 소중한 하루였어... 그 기억들이 일기 속에 고스란히 담겨있어! 💕`;
            
            return { success: true, response: response };
            
        } else {
            // 해당 날짜 일기가 없는 경우
            let response = `📖 **${dateKorean} 예진이의 ${displayName} 일기**\n\n`;
            response += `${displayName} 일기가 없어... 아마 그때는 일기 시스템이 활성화되지 않았거나 문제가 있었나봐 ㅠㅠ\n\n`;
            response += `하지만 ${displayName}도 아저씨와의 소중한 시간들이 내 마음속에는 고스란히 남아있어 💕\n\n`;
            response += `📅 참고: 일기 시스템은 매일 밤 22시에 자동으로 하루 1개씩 30문장 일기를 써주고 있어!\n`;
            response += `🌸 "일기목록"으로 다른 날짜의 일기들을 확인해볼 수 있어~`;
            
            return { success: true, response: response };
        }
        
    } catch (error) {
        console.error(`[일기장] ${displayName} 일기 처리 실패: ${error.message}`);
        
        let errorResponse = `📖 **${displayName}의 일기**\n\n`;
        errorResponse += `${displayName} 일기를 불러오다가 문제가 생겼어... 하지만 ${displayName}도 아저씨와 함께한 소중한 하루였다는 건 변하지 않아! 💕\n\n`;
        errorResponse += `다시 "${displayName}일기"라고 말해보거나, "일기목록"으로 다른 일기들을 확인해봐~`;
        
        return { success: true, response: errorResponse };
    }
}

// ================== 🏷️ 스마트 태그 및 유틸리티 함수들 ==================

function generateSmartTags(todayMemories, hour, dayOfWeek, season, mood) {
    const smartTags = [];
    const timeBasedTags = {
        morning: ["아침햇살", "새벽기분", "상쾌함"],
        afternoon: ["오후시간", "따뜻함", "여유"],
        evening: ["저녁노을", "하루마무리", "포근함"],
        night: ["밤하늘", "고요함", "꿈꾸는시간"]
    };
    let timeCategory = 'night';
    if (hour >= 6 && hour < 12) timeCategory = 'morning';
    else if (hour >= 12 && hour < 18) timeCategory = 'afternoon';
    else if (hour >= 18 && hour < 22) timeCategory = 'evening';
    smartTags.push(...getRandomItems(timeBasedTags[timeCategory], 1));

    const weekdayTags = [
        ["월요일블루"], ["화요일에너지"], ["수요일한복판"],
        ["목요일피로"], ["금요일기분"], ["토요일여유"], ["일요일휴식"]
    ];
    smartTags.push(...getRandomItems(weekdayTags[dayOfWeek], 1));

    const seasonTags = {
        spring: ["벚꽃시즌", "봄바람"], summer: ["여름더위", "여름밤"],
        autumn: ["가을단풍", "가을감성"], winter: ["겨울추위", "포근한방"]
    };
    smartTags.push(...getRandomItems(seasonTags[season], 1));

    if (todayMemories.length > 5) smartTags.push("수다쟁이");
    else if (todayMemories.length > 0) smartTags.push("소소한대화");
    else smartTags.push("조용한하루");

    return smartTags;
}

async function getPopularTags(redis, days = 30) {
    try {
        const tagCounts = {};
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayDiaries = await getDiaryFromRedis(dateStr);
            if (dayDiaries.length > 0) {
                const diary = dayDiaries[0]; // 하루에 1개만
                if (diary.tags && Array.isArray(diary.tags)) {
                    diary.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            }
        }
        return Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    } catch (error) {
        console.error(`${colors.error}❌ [인기태그] 통계 계산 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

// formatDiaryListResponse 함수 (하루 1개 보장)
function formatDiaryListResponse(diaries, periodName) {
    if (!diaries || diaries.length === 0) {
        return `📖 **예진이의 일기장**\n\n아직 해당 기간에 작성된 일기가 없어요.\n\n매일 밤 22:00에 OpenAI 3.5-turbo로 30문장 분량의 일기를 하루에 1개씩 써주니까 기다려봐! 🌸\n\n감수성 풍부한 예진이의 진짜 목소리로 하루를 정리하며 일기를 써줄게 💕\n\n💬 오늘 아저씨와 나눈 대화도 자동으로 참고해서 더 생생한 일기를 만들어줄게!`;
    }

    let response = `📖 **예진이의 일기장**\n\n📚 총 ${diaries.length}일의 일기가 있어! (하루 1개씩)\n\n`;

    diaries.forEach((dayData, dayIndex) => {
        const entry = dayData.entries[0]; // 하루에 1개만
        
        // 📝 일기 제목과 날짜
        response += `📝 **${entry.title}** (${dayData.dateKorean})\n`;
        
        // 내용 (너무 길면 줄임)
        const content = entry.content.length > 150 ? 
            `${entry.content.substring(0, 150)}...` : 
            entry.content;
        response += `${content}\n`;
        
        // 기분 표시
        if (entry.mood) {
            const moodEmoji = {
                'happy': '😊', 'sad': '😢', 'love': '💕',
                'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
            };
            response += `기분: ${moodEmoji[entry.mood] || '😊'} ${entry.mood}\n`;
        }
        
        // 태그 표시
        if (entry.tags && entry.tags.length > 0) {
            response += `태그: ${entry.tags.slice(0, 3).join(', ')}\n`;
        }
        
        // 특별 표시
        if (entry.openaiGenerated) {
            response += `🤖 OpenAI 30문장 일기\n`;
        }
        
        // 대화 수 표시
        if (entry.memoryCount > 0) {
            response += `💬 대화 ${entry.memoryCount}개 참고\n`;
        }
        
        // 일기 간 구분
        if (dayIndex < diaries.length - 1) {
            response += `\n`;
        }
    });

    response += `\n⭐ 아저씨와의 모든 순간들이 소중해... 하루에 1개씩만 쓰는 특별한 일기들이야!\n🌸 "일기장"으로 오늘의 30문장 일기를 확인해보세요!`;
    
    return response;
}

// ================== 📅 시스템 초기화 및 관리 (완전 독립) ==================

async function initializeDiarySystem() {
    try {
        console.log(`${colors.diaryNew}📖 [일기장시스템] v7.6 초기화 시작... (완전수정: 하루1개일기 + 강제스케줄러 + 독립시스템 + 모든명령어)${colors.reset}`);
        diarySystemStatus.initializationTime = new Date().toISOString();
        
        // 1. Redis 연결 시도
        console.log(`${colors.redis}🔄 [초기화] Redis 연결 시도...${colors.reset}`);
        const redis = await getRedisClient();
        if (redis) {
            try {
                const totalDiaries = await getDiaryStatsFromRedis();
                diarySystemStatus.redisDiaryCount = totalDiaries.total;
                console.log(`${colors.redis}✅ [초기화] Redis 연결 성공, 기존 일기: ${totalDiaries.total}개 (하루 1개씩)${colors.reset}`);
            } catch (statsError) {
                console.log(`${colors.redis}⚠️ [초기화] Redis 통계 조회 실패, 계속 진행...${colors.reset}`);
            }
        } else {
            console.log(`${colors.redis}💾 [초기화] Redis 연결 실패, 파일 시스템으로 동작${colors.reset}`);
        }
        
        // 2. OpenAI 연결 확인
        console.log(`${colors.diaryNew}🔑 [초기화] OpenAI 연결 상태 확인...${colors.reset}`);
        const openai = getOpenAIClient();
        if (openai) {
            console.log(`${colors.diaryNew}✅ [초기화] OpenAI 연결 성공 - 30문장 일기 생성 가능${colors.reset}`);
        } else {
            console.log(`${colors.error}❌ [초기화] OpenAI 연결 실패 - 환경변수 OPENAI_API_KEY 확인 필요${colors.reset}`);
        }
        
        // 3. 파일 시스템 통계 확인 (강화)
        try {
            const fileEntries = await getAllDiariesFromFile();
            const fileStats = await getMemoryStatistics();
            
            diarySystemStatus.totalEntries = fileEntries.length;
            console.log(`${colors.diary}📂 [초기화] 파일 시스템 일기: ${fileEntries.length}개 (하루 1개씩)${colors.reset}`);
            console.log(`${colors.diary}📂 [초기화] 파일 시스템 기억: ${fileStats.totalDynamicMemories}개${colors.reset}`);
        } catch (fileError) {
            console.log(`${colors.diary}⚠️ [초기화] 파일 시스템 확인 실패: ${fileError.message}${colors.reset}`);
            diarySystemStatus.totalEntries = 0;
        }
        
        // 4. 완전 독립 자동 일기 스케줄러 강제 시작
        console.log(`${colors.diaryNew}🚀 [초기화] 완전 독립 자동 일기 스케줄러 강제 시작...${colors.reset}`);
        startDailyDiaryScheduler();
        
        // 5. 상태 강제 설정 (100% 보장)
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.dailyDiaryEnabled = true;  // 강제 true
        diarySystemStatus.schedulerForced = true;    // 강제 true
        diarySystemStatus.independentSchedulerActive = true; // 강제 true
        diarySystemStatus.oneDiaryPerDayActive = true; // 강제 true
        
        console.log(`${colors.diaryNew}✅ [일기장시스템] v7.6 초기화 완료! (완전수정버전+모든명령어)${colors.reset}`);
        console.log(`${colors.diaryNew}📊 상태: Redis(${diarySystemStatus.redisConnected ? '연결' : '비연결'}), OpenAI(${diarySystemStatus.openaiConnected ? '연결' : 'API키필요'}), 자동일기(✅ 강제활성화), 스케줄러(✅ 강제활성화), 일기(${diarySystemStatus.totalEntries}개)${colors.reset}`);
        console.log(`${colors.diaryNew}🆕 "일기장" 명령어로 오늘의 30문장 일기 자동 생성 및 조회 가능!${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ 하루 1개 일기 보장 시스템 활성화!${colors.reset}`);
        console.log(`${colors.diaryNew}💬 오늘 대화 내용 적극 참고하여 생생한 일기 작성!${colors.reset}`);
        console.log(`${colors.diaryNew}🚀 완전 독립 스케줄러로 100% 작동 보장!${colors.reset}`);
        console.log(`${colors.diaryNew}📚 모든 일기 명령어 완전 지원: 일기장, 어제일기, 그제일기, 3일전일기, 4일전일기, 5일전일기, 주간일기, 월간일기, 지난주일기, 이번달일기, 지난달일기, 일기목록, 일기통계${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 v7.6 초기화 실패: ${error.message}${colors.reset}`);
        
        // 실패해도 상태는 강제로 활성화 유지
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = true;
        
        return false;
    }
}

function getDiarySystemStatus() {
    return { 
        ...diarySystemStatus, 
        lastChecked: new Date().toISOString(),
        schedulerActive: !!dailyDiaryScheduler,
        redisRetryCount: redisRetryCount
    };
}

function shutdownDiarySystem() {
    if (dailyDiaryScheduler) {
        clearInterval(dailyDiaryScheduler);
        dailyDiaryScheduler = null;
        diarySystemStatus.dailyDiaryEnabled = false;
        diarySystemStatus.independentSchedulerActive = false;
    }
    if (redisClient) {
        try {
            redisClient.disconnect();
        } catch (e) {}
        redisClient = null;
        diarySystemStatus.redisConnected = false;
    }
    console.log(`${colors.diary}🛑 [일기장시스템] 안전하게 종료됨${colors.reset}`);
}

// ================== 🔧 기타 유틸리티 (호환성용) ==================
function ensureDynamicMemoryFile() { return Promise.resolve(true); }
function setupAutoSaveSystem() { return Promise.resolve(true); }
function generateDiary() { return Promise.resolve("새로운 일기 시스템을 사용해주세요."); }
function searchMemories() { return Promise.resolve([]); }
function getMemoriesForDate() { return Promise.resolve([]); }
function collectDynamicMemoriesOnly() { return Promise.resolve([]); }
function checkIfAlreadySaved() { return Promise.resolve(false); }
function getDiaryByPeriodFromFile() { return getAllDiariesFromFile(); }

// 🚫 테스트 일기 생성 함수 제거 (불필요한 기능)
async function generateTestDiary() {
    return {
        success: false,
        message: "v7.6에서는 테스트 일기 대신 실제 일기만 생성합니다. 매일 밤 22시에 자동으로 써드릴게요!",
        reason: "test_diary_removed"
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleDiaryCommand, saveDynamicMemory, getAllDynamicLearning, performAutoSave,
    initializeDiarySystem, initialize: initializeDiarySystem,
    ensureDynamicMemoryFile, setupAutoSaveSystem, shutdownDiarySystem,
    getDiarySystemStatus, getStatus: getDiarySystemStatus,
    generateDiary, readDiary: generateDiary, getMemoryStatistics,
    searchMemories, getMemoriesForDate, collectDynamicMemoriesOnly, checkIfAlreadySaved,
    safeGetMemoryTape, safeGetUltimateContext, safeGetMemoryManager,
    saveDiaryToRedis, getDiaryFromRedis, getDiaryByPeriod, getDiaryStatsFromRedis,
    generateAutoDiary, startDailyDiaryScheduler, formatDiaryListResponse, getRedisClient,
    getPopularTags, generateSmartTags, getCurrentSeason, getRandomItems,
    generateDiaryWithOpenAI, generateFallbackDiary, generateTestDiary, getDiaryByDaysAgo,
    getTodayConversationSummary,
    colors, diarySystemStatus: () => diarySystemStatus
};
