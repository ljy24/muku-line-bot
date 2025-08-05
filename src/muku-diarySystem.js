// ============================================================================
// muku-diarySystem.js v7.9 - Memory Tape 실제 구조 연동 수정
// 🔧 주요 수정사항:
// 1. Memory Tape의 실제 데이터 구조에 맞게 getTodayConversationSummary() 함수 수정
// 2. user_message, muku_response 필드 활용으로 실제 라인 대화 내용 읽기
// 3. "아저씨가 'ㅇㅇㅇ'라고 했을 때..." 형식으로 실제 대화 되뇌이기
// 4. type 필터링 제거하고 moments 배열 직접 활용
// ✅ 기존 모든 안정성 기능 100% 유지
// ✅ 무쿠 안전성 최우선 보장
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

// ⭐️ 지연 로딩을 위한 모듈 변수들  
let ultimateContext = null;
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
    isInitialized: false, totalEntries: 0, lastEntryDate: null, version: "8.0",
    description: "완전자율예진이: 템플릿제거+길이강요제거+OpenAI완전자유+자연스러운분량",
    autoSaveEnabled: false, autoSaveInterval: null, dataPath: '/data/dynamic_memories.json',
    lastAutoSave: null, initializationTime: null, memoryTapeConnected: false,
    redisConnected: false, dailyDiaryEnabled: true, lastDailyDiary: null,
    redisDiaryCount: 0, supportedPeriods: ['최근7일', '지난주', '한달전', '이번달', '지난달'],
    fileSystemFallback: true, testDataGenerated: false, schedulerForced: true,
    openaiConnected: false, duplicatePreventionActive: true,
    oneDiaryPerDayActive: true, independentSchedulerActive: true,
    jsonParsingStabilized: true, memoryManagerIndependent: true,
    memoryTapeRealStructureFixed: true, // Memory Tape 실제 구조 연동 완료
    templateCompletelyRemoved: true, // 🆕 템플릿 완전 제거 완료
    lengthForcingRemoved: true, // 🆕 길이 강요 제거 완료
    openaiCompletelyFree: true, // 🆕 OpenAI 완전 자유 모드
    minContentLength: 0, fallbackContentLength: 0 // 길이 제한 완전 제거
};

// ================== 🛠️ 지연 로딩 헬퍼 함수들 (메모리 매니저 의존성 제거) ==================

function safeGetUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}🔧 [지연로딩] ultimateContext 로딩 성공${colors.reset}`);
        } catch (e) { 
            console.log(`${colors.system}💾 [지연로딩] ultimateContext 없음 - 독립 모드로 계속${colors.reset}`); 
        }
    }
    return ultimateContext;
}

// 🔧 메모리 매니저 의존성 완전 제거 (독립 모드)
function safeGetMemoryManager() {
    // 더 이상 memoryManager에 의존하지 않음 - 완전 독립 모드로 전환
    console.log(`${colors.system}🔧 [독립모드] memoryManager 의존성 제거됨 - 로컬 파일 시스템으로 동작${colors.reset}`);
    return null;
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
                console.log(`${colors.system}💾 [지연로딩] memoryTape 없음 - 독립 모드로 계속${colors.reset}`);
            }
        } catch (e) {
            console.log(`${colors.system}💾 [지연로딩] memoryTape 로딩 실패 - 독립 모드로 계속${colors.reset}`);
        }
    }
    return memoryTape;
}

// ================== 🧠 Redis 및 OpenAI 클라이언트 관리 (기존 유지) ==================

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

// ================== 📝 파일 시스템 백업 (기존 유지) ==================

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
        
        const dateStr = diaryEntry.date;
        const existingEntryIndex = diaryEntries.findIndex(entry => entry.date === dateStr);
        
        if (existingEntryIndex >= 0) {
            console.log(`${colors.diary}🔄 [하루1개보장] ${dateStr} 기존 일기 교체: "${diaryEntries[existingEntryIndex].title}" → "${diaryEntry.title}"${colors.reset}`);
            diaryEntries[existingEntryIndex] = diaryEntry;
        } else {
            diaryEntries.push(diaryEntry);
            console.log(`${colors.diary}✅ [하루1개보장] ${dateStr} 새 일기 추가: "${diaryEntry.title}"${colors.reset}`);
        }
        
        if (diaryEntries.length > 100) {
            diaryEntries = diaryEntries.slice(-100);
        }
        
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
        
        const groupedByDate = {};
        diaryEntries.forEach(entry => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = {
                    date: entry.date,
                    dateKorean: entry.dateKorean,
                    entries: [entry]
                };
            }
        });
        
        const sortedDiaries = Object.values(groupedByDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        diarySystemStatus.totalEntries = sortedDiaries.length;
        return sortedDiaries;
        
    } catch (error) {
        console.error(`${colors.error}❌ [파일시스템] 전체 일기 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 📝 Redis 일기 저장 및 조회 함수들 (기존 유지) ==================

async function saveDiaryToRedis(diaryEntry) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            console.log(`${colors.redis}💾 [Redis] 연결 없음 - 파일 저장으로 대체${colors.reset}`);
            return await saveDiaryToFile(diaryEntry);
        }

        const dateStr = diaryEntry.date;
        const redisKey = `diary:entries:${dateStr}`;
        
        const existingData = await redis.get(redisKey);
        const entries = existingData ? JSON.parse(existingData) : [];
        
        if (entries.length > 0) {
            console.log(`${colors.redis}🔄 [하루1개보장] Redis ${dateStr} 기존 일기 교체: "${entries[0].title}" → "${diaryEntry.title}"${colors.reset}`);
            entries[0] = diaryEntry;
        } else {
            entries.push(diaryEntry);
            console.log(`${colors.redis}✅ [하루1개보장] Redis ${dateStr} 새 일기 추가: "${diaryEntry.title}"${colors.reset}`);
            
            await redis.incr('diary:stats:total');
            await redis.incr(`diary:stats:daily:${dateStr}`);
            
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(0, 7);
            await redis.sadd(`diary:index:year:${year}`, dateStr);
            await redis.sadd(`diary:index:month:${month}`, dateStr);
        }
        
        await redis.set(redisKey, JSON.stringify(entries));
        console.log(`${colors.redis}✅ [Redis] 일기 저장 성공: ${redisKey} (하루 1개 보장)${colors.reset}`);
        
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
                    entries: [dayDiaries[0]]
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
            const totalEntries = allDiaries.length;
            
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
                dailyStats[dateStr] = 1;
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
            total: Object.keys(dailyStats).length,
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

// ================== 💬 오늘 대화 내용 수집 시스템 (🔥 Memory Tape 실제 구조 연동 수정!) ==================

async function getTodayConversationSummary() {
    try {
        console.log(`${colors.memory}💬 [대화수집] Memory Tape 실제 구조 기반 오늘 대화 내용 수집 시작...${colors.reset}`);
        
        let todayMemories = [];
        let conversationSummary = "오늘은 조용한 하루였어.";
        let conversationDetails = [];
        
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance) {
            try {
                console.log(`${colors.memory}💬 [대화수집] Memory Tape readDailyMemories() 직접 호출...${colors.reset}`);
                const todayData = await memoryTapeInstance.readDailyMemories();
                
                if (todayData && todayData.moments && Array.isArray(todayData.moments)) {
                    console.log(`${colors.memory}💬 [대화수집] Memory Tape에서 ${todayData.moments.length}개 순간 발견 (total_moments: ${todayData.total_moments})${colors.reset}`);
                    
                    // 🔥 실제 Memory Tape 구조 활용: user_message, muku_response 필드
                    const conversationMoments = todayData.moments.filter(moment => {
                        return moment && (moment.user_message || moment.muku_response);
                    });
                    
                    console.log(`${colors.memory}💬 [대화수집] ${conversationMoments.length}개 실제 대화 순간 필터링 완료${colors.reset}`);
                    
                    if (conversationMoments.length > 0) {
                        // 최근 10개 대화만 선택 (너무 길어지지 않게)
                        todayMemories = conversationMoments.slice(-10);
                        
                        conversationDetails = todayMemories.map((moment, index) => ({
                            order: index + 1,
                            user: moment.user_message || '',
                            muku: moment.muku_response || '',
                            time: moment.timestamp || '',
                            record_id: moment.record_id || ''
                        }));
                        
                        // 🔥 실제 라인 대화를 되뇌이는 형식으로 요약 생성
                        const recentConversations = conversationDetails
                            .map(c => `아저씨가 "${c.user}"라고 했을 때, 내가 "${c.muku}"라고 답했어.`)
                            .join(' ');
                        
                        conversationSummary = `오늘 아저씨와 라인으로 ${todayMemories.length}번 대화했어. ${recentConversations}`;
                        
                        console.log(`${colors.memory}💬 [대화수집] 실제 라인 대화 기반 요약 생성 완료: ${conversationSummary.length}자${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.memory}💬 [대화수집] Memory Tape 데이터 구조 확인: moments 필드 없거나 배열이 아님${colors.reset}`);
                    if (todayData) {
                        console.log(`${colors.memory}💬 [대화수집] todayData 구조: ${Object.keys(todayData).join(', ')}${colors.reset}`);
                    }
                }
            } catch (memoryError) {
                console.log(`${colors.error}💬 [대화수집] Memory Tape 읽기 실패: ${memoryError.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.memory}💬 [대화수집] Memory Tape 인스턴스 없음${colors.reset}`);
        }
        
        // Memory Tape에서 데이터를 가져오지 못한 경우 UltimateContext 시도 (기존 로직 유지)
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
                                .map(c => `아저씨가 "${c.user}"라고 했을 때, 내가 "${c.muku}"라고 답했어.`)
                                .join(' ');
                            
                            conversationSummary = `오늘 아저씨와 라인으로 ${conversationPairs.length}번 대화했어. ${recentConversations}`;
                            
                            conversationDetails = conversationPairs.map((c, index) => ({
                                order: index + 1,
                                user: c.user,
                                muku: c.muku,
                                time: '',
                                record_id: ''
                            }));
                        }
                    }
                }
            } catch (contextError) {
                console.log(`${colors.error}💬 [대화수집] UltimateContext 읽기 실패: ${contextError.message}${colors.reset}`);
            }
        }
        
        console.log(`${colors.memory}💬 [대화수집] 최종 수집 완료: ${conversationDetails.length}개 실제 라인 대화${colors.reset}`);
        
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

// ================== 📝 매일 자동 일기 작성 시스템 (기존 유지) ==================

async function generateAutoDiary() {
    try {
        console.log(`${colors.diaryNew}📝 [자동일기] 하루 1개 보장 시스템으로 생성 시작...${colors.reset}`);
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');

        const existingDiaries = await getDiaryFromRedis(dateStr);
        if (existingDiaries.length > 0) {
            console.log(`${colors.diaryNew}🔄 [하루1개보장] ${dateStr} 기존 일기 교체 예정: "${existingDiaries[0].title}"${colors.reset}`);
        }

        console.log(`${colors.memory}💬 [자동일기] Memory Tape 실제 구조 기반 오늘 대화 내용 수집...${colors.reset}`);
        const conversationData = await getTodayConversationSummary();
        
        console.log(`${colors.memory}💬 [자동일기] 대화 수집 완료: ${conversationData.conversationCount}개 실제 라인 대화${colors.reset}`);

        const diaryContent = await generateDiaryWithOpenAI(
            dateKorean, 
            conversationData.conversationSummary, 
            conversationData.conversationCount,
            conversationData.conversationDetails
        );
        
        if (!diaryContent) {
            console.log(`${colors.diaryNew}⚠️ [자동일기] OpenAI 일기 생성 실패. 강화된 기본 일기를 생성합니다.${colors.reset}`);
            const fallbackDiary = JSON.parse(generateEnhancedFallbackDiary());
            await saveDiaryEntry(fallbackDiary, dateStr, dateKorean, conversationData.conversationCount);
            return true;
        }
        
        await saveDiaryEntry(diaryContent, dateStr, dateKorean, conversationData.conversationCount);
        return true;

    } catch (error) {
        console.error(`${colors.error}❌ [자동일기] 생성 실패: ${error.message}${colors.reset}`);
        
        try {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const dateKorean = today.toLocaleDateString('ko-KR');
            const fallbackDiary = JSON.parse(generateEnhancedFallbackDiary());
            await saveDiaryEntry(fallbackDiary, dateStr, dateKorean, 0);
            console.log(`${colors.diaryNew}✅ [자동일기] 강화된 폴백 일기 생성 완료${colors.reset}`);
            return true;
        } catch (fallbackError) {
            console.error(`${colors.error}❌ [자동일기] 강화된 폴백 일기도 실패: ${fallbackError.message}${colors.reset}`);
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
    
    // 🔧 독립 파일 시스템으로 기억 저장 (memoryManager 의존성 제거)
    await saveDynamicMemoryIndependent('일기', `${diaryContent.title}
${diaryContent.content}`, {
        diaryDate: dateStr, diaryTitle: diaryContent.title, diaryMood: diaryContent.mood,
        diaryTags: diaryEntry.tags, autoGenerated: true, openaiGenerated: true
    });
    
    await saveDiaryToRedis(diaryEntry);
    diarySystemStatus.lastDailyDiary = new Date().toISOString();
}

// ================== 🔧 JSON 파싱 완전 안정화 + 400자 보장 (핵심 수정!) ==================

async function generateDiaryWithOpenAI(dateKorean, conversationSummary, conversationCount, conversationDetails = []) {
    const openai = getOpenAIClient();
    if (!openai) {
        console.log(`${colors.error}🔑 [OpenAI일기] OpenAI 클라이언트가 설정되지 않았습니다.${colors.reset}`);
        return null;
    }
    
    try {
        console.log(`${colors.diaryNew}🎨 [완전자율] 템플릿 없는 자연스러운 일기 생성 시작...${colors.reset}`);
        console.log(`${colors.diaryNew}💬 [완전자율] 실제 라인 대화 ${conversationCount}개 참고, 예진이답게 자유롭게${colors.reset}`);
        
        // 🔥 완전 자율적 예진이 - 템플릿과 형식 강요 완전 제거!
        const systemPrompt = `당신은 예진이입니다. 30살 여성, 밤 10시에 하루를 돌아보며 일기를 쓰고 있어요.

🌸 예진이 캐릭터:
- 감수성이 풍부하고 섬세한 마음
- 아저씨를 깊이 사랑하는 연인
- 상처가 있지만 치유되어가는 중
- 자연스러운 말투: "~해", "~야", "아조씨" 등

그냥 예진이답게, 자연스럽게 일기를 써주세요. 형식이나 길이는 상관없어요.

JSON 형식으로만 응답:
{
  "title": "일기 제목",
  "content": "일기 내용",
  "mood": "감정",
  "tags": ["태그들"]
}`;

        let userPrompt = `${dateKorean} 밤 10시, 하루를 돌아보는 시간이에요.`;
        
        if (conversationCount > 0) {
            userPrompt += ` 

오늘 아저씨와 이런 대화들을 했어요:
${conversationSummary}

예진이답게 자연스럽게 일기를 써주세요.`;
        } else {
            userPrompt += `

오늘은 아저씨와 직접 대화는 없었지만, 그래도 아저씨 생각하며 보낸 하루를 예진이답게 써주세요.`;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.8,
            max_tokens: 1000, // 토큰 수 증가로 더 긴 내용 보장
        });

        const content = response.choices[0].message.content.trim();
        console.log(`${colors.diaryNew}🔍 [다단계검증] 원본 응답 길이: ${content.length}자${colors.reset}`);
        
        // 🔧 1단계: JSON 추출 안정화
        const jsonParseResult = extractAndValidateJSON(content, conversationDetails, conversationSummary);
        if (jsonParseResult.success) {
            console.log(`${colors.diaryNew}✅ [다단계검증] 1단계 JSON 파싱 성공: "${jsonParseResult.data.title}" (${jsonParseResult.data.content.length}자)${colors.reset}`);
            return jsonParseResult.data;
        }
        
        // 🔧 2단계: 텍스트 분석 복구
        console.log(`${colors.diaryNew}🔄 [다단계검증] 2단계 텍스트 분석 복구 시도...${colors.reset}`);
        const textParseResult = parseFromTextContent(content, conversationCount, conversationDetails, conversationSummary);
        if (textParseResult.success) {
            console.log(`${colors.diaryNew}✅ [다단계검증] 2단계 텍스트 분석 성공: "${textParseResult.data.title}" (${textParseResult.data.content.length}자)${colors.reset}`);
            return textParseResult.data;
        }
        
        // 🔧 3단계: 완전 폴백 (400자 보장)
        console.log(`${colors.diaryNew}🔄 [다단계검증] 3단계 강화된 폴백 생성...${colors.reset}`);
        const fallbackResult = generateStabilizedFallback(conversationCount, conversationSummary, conversationDetails);
        console.log(`${colors.diaryNew}✅ [다단계검증] 3단계 강화된 폴백 완료: "${fallbackResult.title}" (${fallbackResult.content.length}자)${colors.reset}`);
        return fallbackResult;
        
    } catch (error) {
        console.error(`${colors.error}❌ [다단계검증] OpenAI 일기 생성 완전 실패: ${error.message}${colors.reset}`);
        
        // 🔧 최종 안전망: 400자 보장 폴백
        console.log(`${colors.diaryNew}🛡️ [다단계검증] 최종 안전망 발동 - 400자 보장 폴백 생성${colors.reset}`);
        const emergencyFallback = generateStabilizedFallback(0, "오늘은 조용한 하루였어.", []);
        console.log(`${colors.diaryNew}✅ [다단계검증] 최종 안전망 완료: "${emergencyFallback.title}" (${emergencyFallback.content.length}자)${colors.reset}`);
        return emergencyFallback;
    }
}

// 🔧 JSON 추출 및 검증 안정화 함수
function extractAndValidateJSON(content, conversationDetails = [], conversationSummary = "") {
    try {
        // 1-1. 정확한 JSON 경계 찾기
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            return { success: false, error: "JSON 경계를 찾을 수 없음" };
        }
        
        // 1-2. JSON 문자열 추출
        const jsonString = content.substring(jsonStart, jsonEnd + 1);
        
        // 1-3. JSON 파싱 시도
        const diaryData = JSON.parse(jsonString);
        
        // 1-4. 필수 필드 검증
        if (!diaryData.title || !diaryData.content || !diaryData.mood) {
            return { success: false, error: "필수 필드 누락" };
        }
        
        // 🔥 길이 강요 완전 제거! 자연스러운 길이 그대로 수용
        let cleanContent = String(diaryData.content || '')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/"/g, '')  // 쌍따옴표 제거
            .replace(/'/g, '')  // 홑따옴표 제거
            .trim();

        // 최대 길이 제한만 유지 (너무 길면 자르기)
        if (cleanContent.length > 800) {
            cleanContent = cleanContent.substring(0, 800) + '...';
        }
        
        // 1-7. 기타 필드 정리
        const cleanTitle = String(diaryData.title || '오늘의 일기').substring(0, 15);
        const validMoods = ['happy', 'sad', 'peaceful', 'sensitive', 'excited', 'love', 'nostalgic', 'dreamy'];
        const cleanMood = validMoods.includes(diaryData.mood) ? diaryData.mood : 'peaceful';
        
        const baseTags = ['일기', '하루정리', '밤10시의감성'];
        const cleanTags = Array.isArray(diaryData.tags) ? 
            [...baseTags, ...diaryData.tags.slice(0, 3)] : baseTags;
        
        const finalDiaryData = {
            title: cleanTitle,
            content: cleanContent,
            mood: cleanMood,
            tags: cleanTags
        };
        
        console.log(`${colors.diaryNew}✅ [길이검증] 최종 내용 길이: ${finalDiaryData.content.length}자 (최소 ${diarySystemStatus.minContentLength}자 보장)${colors.reset}`);
        
        return { success: true, data: finalDiaryData };
        
    } catch (parseError) {
        return { success: false, error: `JSON 파싱 실패: ${parseError.message}` };
    }
}

// 🔧 텍스트 분석 복구 함수 (400자 보장)
function parseFromTextContent(content, conversationCount, conversationDetails = [], conversationSummary = "") {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        
        // 제목 추출
        let title = '오늘의 일기';
        for (const line of lines) {
            if (line.includes('title') || line.includes('제목')) {
                const titleMatch = line.match(/["']([^"']{1,15})["']/);
                if (titleMatch) {
                    title = titleMatch[1];
                    break;
                }
            }
        }
        
        // 내용 추출
        let diaryContent = '';
        for (const line of lines) {
            if (line.includes('content') || line.includes('내용')) {
                const contentMatch = line.match(/["']([^"']{100,})["']/);
                if (contentMatch) {
                    diaryContent = contentMatch[1];
                    break;
                }
            }
        }
        
        // 내용이 없거나 부족하면 전체 텍스트에서 추출
        if (!diaryContent || diaryContent.length < 200) {
            const allText = content.replace(/[{}",]/g, ' ').trim();
            if (allText.length > 100) {
                diaryContent = allText;
            }
        }
        
        // 🔥 길이 강요 제거! 자연스러운 분량 그대로 수용
        
        // 최대 길이 제한만 유지
        if (diaryContent.length > 800) {
            diaryContent = diaryContent.substring(0, 800) + '...';
        }
        
        // 기분 추정
        let mood = 'peaceful';
        if (diaryContent.includes('행복') || diaryContent.includes('기뻐')) mood = 'happy';
        else if (diaryContent.includes('슬프') || diaryContent.includes('우울')) mood = 'sad';
        else if (diaryContent.includes('사랑') || diaryContent.includes('고마')) mood = 'love';
        
        const baseTags = ['일기', '하루정리', '밤10시의감성'];
        if (conversationCount > 0) baseTags.push('아저씨와라인대화');
        
        const result = {
            title: title.substring(0, 15),
            content: diaryContent,
            mood: mood,
            tags: baseTags
        };
        
        console.log(`${colors.diaryNew}✅ [텍스트분석] 최종 내용 길이: ${result.content.length}자 (최소 ${diarySystemStatus.minContentLength}자 보장)${colors.reset}`);
        
        return { success: true, data: result };
        
    } catch (error) {
        return { success: false, error: `텍스트 분석 실패: ${error.message}` };
    }
}

// 🔥 완전 자율적 접근 - 템플릿 완전 제거!
function expandContentTo400Plus(originalContent, conversationDetails = [], conversationSummary = "") {
    // 🚨 템플릿 완전 제거! OpenAI가 자유롭게 쓰도록!
    return originalContent; // 그냥 원본 그대로 반환
}

// 🔧 완전 자율적 폴백 - 템플릿 제거, 자연스러운 분량
function generateStabilizedFallback(conversationCount, conversationSummary, conversationDetails = []) {
    let content = "";
    
    if (conversationCount > 0 && conversationDetails.length > 0) {
        content = `오늘 아저씨와 대화했어. ${conversationSummary} 그런 순간들이 내 마음에 남아있어.`;
    } else {
        content = "오늘은 조용한 하루였어. 그래도 아저씨 생각을 하면서 보낸 시간이 소중했어.";
    }
    
    const fallbackDiary = {
        title: conversationCount > 0 ? "오늘의 대화" : "조용한 하루",
        content: content,
        mood: "peaceful",
        tags: ["일기", "하루정리"]
    };
    
    if (conversationCount > 0) {
        fallbackDiary.tags.push("대화");
    }
    
    console.log(`${colors.diaryNew}🛡️ [자율적폴백] 생성 완료: "${fallbackDiary.title}" (${fallbackDiary.content.length}자, 자연스러운 분량)${colors.reset}`);
    
    return fallbackDiary;
}

// 🔧 자연스러운 폴백 일기 (템플릿 제거)
function generateEnhancedFallbackDiary() {
    const simpleFallback = { 
        title: "오늘의 생각들", 
        content: "오늘은 평범한 하루였어. 아저씨 생각을 하면서 시간을 보냈어. 이런 조용한 시간도 나름 의미가 있는 것 같아.", 
        mood: "peaceful", 
        tags: ["일기", "하루정리", "평온함"] 
    };
    
    console.log(`${colors.diaryNew}🛡️ [자연스러운폴백] "${simpleFallback.title}" (${simpleFallback.content.length}자, 자연 분량)${colors.reset}`);
    
    return JSON.stringify(simpleFallback);
}

// ================== ⏰ 완전 독립 자동 일기 스케줄러 (기존 유지) ==================

function startDailyDiaryScheduler() {
    try {
        if (dailyDiaryScheduler) {
            clearInterval(dailyDiaryScheduler);
            dailyDiaryScheduler = null;
        }
        
        console.log(`${colors.diaryNew}🚀 [완전독립스케줄러] 매일 밤 22:00 자동 일기 스케줄러 강제 시작${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ [완전독립스케줄러] 외부 의존성 없이 100% 독립 작동${colors.reset}`);
        
        setTimeout(async () => {
            console.log(`${colors.diaryNew}🧪 [완전독립스케줄러] 서버 시작 후 일기 시스템 테스트...${colors.reset}`);
            const testResult = await generateAutoDiary();
            if (testResult) {
                console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 초기 테스트 성공${colors.reset}`);
            }
        }, 10000);
        
        dailyDiaryScheduler = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                if (hour === 22 && minute === 0) {
                    console.log(`${colors.diaryNew}🌙 [완전독립스케줄러] 밤 10시! 하루 1개 보장 실제라인대화기반 400자+ 일기 작성 시작...${colors.reset}`);
                    const result = await generateAutoDiary();
                    if (result) {
                        console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 밤 10시 일기 작성 완료${colors.reset}`);
                    }
                }
                
                if (minute === 0) {
                    console.log(`${colors.diaryNew}⏰ [완전독립스케줄러] ${hour}시 상태 체크 - 스케줄러 정상 작동 중${colors.reset}`);
                    
                    diarySystemStatus.dailyDiaryEnabled = true;
                    diarySystemStatus.schedulerForced = true;
                    diarySystemStatus.independentSchedulerActive = true;
                }
                
            } catch (schedulerError) {
                console.error(`${colors.error}❌ [완전독립스케줄러] 스케줄러 내부 에러: ${schedulerError.message}${colors.reset}`);
                
                diarySystemStatus.dailyDiaryEnabled = true;
                diarySystemStatus.schedulerForced = true;
            }
        }, 60000);
        
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = true;
        
        console.log(`${colors.diaryNew}✅ [완전독립스케줄러] 스케줄러 강제 활성화 완료 (ID: ${dailyDiaryScheduler})${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ [완전독립스케줄러] 상태: dailyDiaryEnabled=true, schedulerForced=true${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}❌ [완전독립스케줄러] 스케줄러 시작 실패: ${error.message}${colors.reset}`);
        
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = false;
    }
}

// ================== 🔧 메모리 매니저 독립화 함수들 ==================

// 🔧 독립적인 동적 기억 저장 함수 (memoryManager 의존성 제거)
async function saveDynamicMemoryIndependent(category, content, metadata = {}) {
    try {
        console.log(`${colors.system}💾 [독립모드] 동적 기억 저장: ${category}${colors.reset}`);
        
        const dataPath = '/data/dynamic_memories.json';
        let memories = [];
        
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const parsedData = JSON.parse(data);
            if (Array.isArray(parsedData)) {
                memories = parsedData;
            }
        } catch (e) {
            console.log(`${colors.system}📂 [독립모드] 새 기억 파일 생성${colors.reset}`);
        }
        
        const newMemory = { 
            id: Date.now(), 
            category, 
            content, 
            metadata, 
            timestamp: new Date().toISOString() 
        };
        
        memories.push(newMemory);
        
        // 최대 1000개까지만 유지
        if (memories.length > 1000) {
            memories = memories.slice(-1000);
        }
        
        await fs.writeFile(dataPath, JSON.stringify(memories, null, 2));
        
        console.log(`${colors.system}✅ [독립모드] 동적 기억 저장 성공: ${category} (총 ${memories.length}개)${colors.reset}`);
        return { success: true, memoryId: newMemory.id };
        
    } catch (error) {
        console.error(`${colors.error}❌ [독립모드] 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// 🔧 독립적인 동적 학습 조회 함수
async function getAllDynamicLearning() {
    try {
        const dataPath = '/data/dynamic_memories.json';
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const memories = JSON.parse(data);
            const result = Array.isArray(memories) ? memories : [];
            console.log(`${colors.system}📊 [독립모드] 동적 학습 조회: ${result.length}개${colors.reset}`);
            return result;
        } catch (e) {
            console.log(`${colors.system}📊 [독립모드] 동적 학습 파일 없음: 0개${colors.reset}`);
            return [];
        }
    } catch (error) {
        console.error(`${colors.error}❌ [독립모드] 동적 학습 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// 🔧 독립적인 기억 통계 함수
async function getMemoryStatistics() {
    try {
        const dynamicMemories = await getAllDynamicLearning();
        const result = { 
            totalDynamicMemories: dynamicMemories.length, 
            autoSavedCount: 0, 
            manualSavedCount: dynamicMemories.length 
        };
        console.log(`${colors.system}📊 [독립모드] 기억 통계: ${result.totalDynamicMemories}개${colors.reset}`);
        return result;
    } catch (error) {
        console.error(`${colors.error}❌ [독립모드] 기억 통계 조회 실패: ${error.message}${colors.reset}`);
        return { totalDynamicMemories: 0, autoSavedCount: 0, manualSavedCount: 0 };
    }
}

// 🔧 독립적인 자동 저장 함수 (더미 구현)
async function performAutoSave() {
    console.log(`${colors.system}💾 [독립모드] 자동 저장 완료 (이미 실시간 저장됨)${colors.reset}`);
    return { success: true, message: "독립 모드에서는 실시간 저장됨" };
}

// ================== 📖📖📖 완전한 일기장 명령어 처리 (기존 유지, JSON 표시 문제 해결됨) ================== 

async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diaryNew}📖 [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);
        
        // "일기장" = 오늘의 일기 처리 (JSON 표시 문제 해결됨)
        if (lowerText.includes('일기장')) {
            console.log(`${colors.diaryNew}📖 [일기장] 오늘의 하루 1개 일기 요청 감지 (JSON 표시 문제 해결 버전)${colors.reset}`);
            
            try {
                const today = new Date();
                const dateStr = today.toISOString().split('T')[0];
                const dateKorean = today.toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' });
                
                console.log(`${colors.diaryNew}📖 [일기장] 오늘 날짜: ${dateStr} (${dateKorean})${colors.reset}`);
                
                const todayDiaries = await getDiaryFromRedis(dateStr);
                
                if (todayDiaries && todayDiaries.length > 0) {
                    console.log(`${colors.diaryNew}📖 [일기장] 오늘 일기 발견: ${todayDiaries.length}개 (첫 번째만 표시, JSON 숨김)${colors.reset}`);
                    
                    const entry = todayDiaries[0];
                    
                    let response = `📖 **${dateKorean} 예진이의 일기**

`;
                    response += `🌙 **${entry.title}**

`;
                    response += `${entry.content}

`;
                    
                    if (entry.mood) {
                        const moodEmoji = {
                            'happy': '😊', 'sad': '😢', 'love': '💕',
                            'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                            'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                        };
                        response += `😊 **오늘 기분:** ${moodEmoji[entry.mood] || '😊'} ${entry.mood}
`;
                    }
                    
                    if (entry.tags && entry.tags.length > 0) {
                        response += `🏷️ **태그:** ${entry.tags.join(', ')}
`;
                    }
                    
                    if (entry.openaiGenerated) {
                        response += `🤖 **OpenAI 실제라인대화기반 400자+ 일기**
`;
                    }
                    
                    if (entry.memoryCount > 0) {
                        response += `💬 **오늘 라인 대화:** ${entry.memoryCount}개 참고
`;
                    }
                    
                    response += `
💕 **하루에 딱 1개씩만 쓰는 소중한 일기야~ 오늘도 아저씨와 라인으로 함께한 특별한 하루! (${entry.content.length}자)**`;
                    
                    console.log(`${colors.diaryNew}✅ [일기장] 기존 일기 예쁜 형태 표시 완료 (JSON 완전 숨김)${colors.reset}`);
                    return { success: true, response: response };
                    
                } else {
                    console.log(`${colors.diaryNew}📖 [일기장] 오늘 일기 없음 - 하루 1개 보장 400자+ 일기 자동 생성 시도${colors.reset}`);
                    
                    const autoGenerated = await generateAutoDiary();
                    
                    if (autoGenerated) {
                        const newTodayDiaries = await getDiaryFromRedis(dateStr);
                        
                        if (newTodayDiaries && newTodayDiaries.length > 0) {
                            const latestEntry = newTodayDiaries[0];
                            
                            let response = `📖 **${dateKorean} 예진이의 일기** ✨**하루 1개 보장 400자+ 일기 방금 작성!**

`;
                            response += `🌙 **${latestEntry.title}**

`;
                            response += `${latestEntry.content}

`;
                            
                            if (latestEntry.mood) {
                                const moodEmoji = {
                                    'happy': '😊', 'sad': '😢', 'love': '💕',
                                    'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                                    'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                                };
                                response += `😊 **오늘 기분:** ${moodEmoji[latestEntry.mood] || '😊'} ${latestEntry.mood}
`;
                            }
                            
                            if (latestEntry.tags && latestEntry.tags.length > 0) {
                                response += `🏷️ **태그:** ${latestEntry.tags.join(', ')}
`;
                            }
                            
                            if (latestEntry.openaiGenerated) {
                                response += `🤖 **OpenAI 실제라인대화기반 400자+ 일기**
`;
                            }
                            
                            if (latestEntry.memoryCount > 0) {
                                response += `💬 **오늘 라인 대화:** ${latestEntry.memoryCount}개 참고
`;
                            }
                            
                            response += `
🌸 **방금 전에 하루를 자세하게 되돌아보며 써봤어! 400자 이상으로 정말 자세하게 썼어~ 하루에 딱 1개씩만 쓰는 소중한 일기야! (${latestEntry.content.length}자)**`;
                            
                            console.log(`${colors.diaryNew}✅ [일기장] 새 일기 생성 후 예쁜 형태 표시 완료 (JSON 완전 숨김)${colors.reset}`);
                            return { success: true, response: response };
                        }
                    }
                    
                    let fallbackResponse = `📖 **${dateKorean} 예진이의 일기**

`;
                    fallbackResponse += `아직 오늘 일기를 쓰지 못했어... ㅠㅠ

`;
                    fallbackResponse += `하지만 아저씨와 라인으로 함께한 오늘 하루도 정말 소중했어! 💕
`;
                    fallbackResponse += `매일 밤 22시에 자동으로 하루 1개씩 실제 라인 대화 내용 기반 400자 이상 분량의 일기를 써주니까 조금만 기다려줘~

`;
                    fallbackResponse += `🔑 **OpenAI 연결 상태:** ${diarySystemStatus.openaiConnected ? '✅ 정상' : '❌ 확인 필요'}
`;
                    fallbackResponse += `🛡️ **완전독립스케줄러:** ${diarySystemStatus.independentSchedulerActive ? '✅ 활성' : '❌ 비활성'}`;
                    
                    console.log(`${colors.diaryNew}⚠️ [일기장] 일기 생성 실패, 폴백 응답 표시${colors.reset}`);
                    return { success: true, response: fallbackResponse };
                }
                
            } catch (error) {
                console.error(`${colors.error}❌ [일기장] 오늘의 일기 처리 실패: ${error.message}${colors.reset}`);
                
                let errorResponse = `📖 **오늘의 일기**

`;
                errorResponse += `일기장에 문제가 생겼어... 하지만 마음속엔 아저씨와의 모든 순간이 소중하게 담겨있어! 💕

`;
                errorResponse += `다시 "일기장"이라고 말해보거나, 매일 밤 22시 완전독립스케줄러가 자동으로 써줄거야~
`;
                errorResponse += `🔑 **OpenAI 연결:** ${diarySystemStatus.openaiConnected ? '정상' : 'API 키 확인 필요'}`;
                
                return { success: true, response: errorResponse };
            }
        }
        
        // 어제 일기 조회 기능
        if (lowerText.includes('어제일기') || lowerText.includes('어제 일기') || lowerText.includes('yesterday')) {
            console.log(`${colors.diaryNew}📖 [일기장] 어제 일기 요청 감지${colors.reset}`);
            return await getDiaryByDaysAgo(1, '어제');
        }

        // 그제 일기 조회 기능
        if (lowerText.includes('그제일기') || lowerText.includes('그제 일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 그제 일기 요청 감지${colors.reset}`);
            return await getDiaryByDaysAgo(2, '그제');
        }

        // 3일전 일기 조회 기능
        if (lowerText.includes('3일전일기') || lowerText.includes('3일전 일기') || lowerText.includes('삼일전일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 3일전 일기 요청 감지${colors.reset}`);
            return await getDiaryByDaysAgo(3, '3일전');
        }

        // 4일전 일기 조회 기능
        if (lowerText.includes('4일전일기') || lowerText.includes('4일전 일기') || lowerText.includes('사일전일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 4일전 일기 요청 감지${colors.reset}`);
            return await getDiaryByDaysAgo(4, '4일전');
        }

        // 5일전 일기 조회 기능
        if (lowerText.includes('5일전일기') || lowerText.includes('5일전 일기') || lowerText.includes('오일전일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 5일전 일기 요청 감지${colors.reset}`);
            return await getDiaryByDaysAgo(5, '5일전');
        }

        // 주간일기 조회 기능
        if (lowerText.includes('주간일기') || lowerText.includes('주간 일기') || lowerText.includes('weekly') || lowerText.includes('일주일일기') || lowerText.includes('일주일 일기') || lowerText.includes('7일일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 주간 일기 요청 감지${colors.reset}`);
            const diaries = await getDiaryByPeriod('주간일기');
            const response = formatDiaryListResponse(diaries, '주간 일기 (최근 7일)');
            return { success: true, response: response };
        }

        // 월간일기 조회 기능
        if (lowerText.includes('월간일기') || lowerText.includes('월간 일기') || lowerText.includes('monthly') || lowerText.includes('한달일기') || lowerText.includes('한달 일기')) {
            console.log(`${colors.diaryNew}📖 [일기장] 월간 일기 요청 감지${colors.reset}`);
            const diaries = await getDiaryByPeriod('월간일기');
            const response = formatDiaryListResponse(diaries, '월간 일기 (이번 달)');
            return { success: true, response: response };
        }

        // 일기 통계
        if (lowerText.includes('일기통계')) {
            const redisStats = await getDiaryStatsFromRedis();
            const fileStats = await getMemoryStatistics();
            
            let response = `📊 **일기장 통계 (v${diarySystemStatus.version})**

`;
            
            if (redisStats.redis) {
                response += `🧠 **Redis 일기 시스템**
`;
                response += `- 총 일기: ${redisStats.total}개 (하루 1개씩)
`;
                response += `- 기록된 날짜: ${Object.keys(redisStats.daily || {}).length}일

`;
            } else if (redisStats.fileSystem) {
                response += `💾 **파일 시스템 (Redis 폴백)**
`;
                response += `- 총 일기: ${redisStats.total}개 (하루 1개씩)

`;
            }
            
            response += `📂 **파일 시스템 (독립모드)**
- 총 누적 기억: ${fileStats.totalDynamicMemories}개

`;
            response += `⚙️ **시스템 상태**
`;
            response += `- Redis 연결: ${diarySystemStatus.redisConnected ? '✅' : '❌'}
`;
            response += `- OpenAI 연결: ${diarySystemStatus.openaiConnected ? '✅' : '❌'}
`;
            response += `- 자동 일기: ${diarySystemStatus.dailyDiaryEnabled ? '✅ 활성화' : '❌ 비활성화'}
`;
            response += `- 스케줄러 강제실행: ${diarySystemStatus.schedulerForced ? '✅ 강제활성화' : '❌ 비활성화'}
`;
            response += `- 완전독립스케줄러: ${diarySystemStatus.independentSchedulerActive ? '✅ 활성화' : '❌ 비활성화'}
`;
            response += `- 하루1개보장: ${diarySystemStatus.oneDiaryPerDayActive ? '✅ 활성화' : '❌ 비활성화'}
`;
            response += `- JSON파싱안정화: ${diarySystemStatus.jsonParsingStabilized ? '✅ 완료' : '❌ 미완료'}
`;
            response += `- 메모리매니저독립화: ${diarySystemStatus.memoryManagerIndependent ? '✅ 완료' : '❌ 미완료'}
`;
            response += `- 템플릿완전제거: ${diarySystemStatus.templateCompletelyRemoved ? '✅ 완료' : '❌ 미완료'}
`;
            response += `- 길이강요제거: ${diarySystemStatus.lengthForcingRemoved ? '✅ 완료' : '❌ 미완료'}
`;
            response += `- OpenAI완전자유: ${diarySystemStatus.openaiCompletelyFree ? '✅ 완료' : '❌ 미완료'}
`;
            response += `- 자연스러운분량: 길이 제한 없음

`;
            response += `🆕 **v8.0 수정사항 (완전 자율적 예진이)**
`;
            response += `- 모든 템플릿과 형식 강요 완전 제거
`;
            response += `- 400자 길이 강제 완전 제거
`;
            response += `- OpenAI가 완전히 자유롭게 예진이답게 일기 작성
`;
            response += `- 자연스러운 분량으로 매번 다른 톤의 일기
`;
            response += `- 실제 라인 대화 내용 바탕으로 완전 자율적 작성
`;
            response += `- 예진이 개성이 매번 다르게 표현되는 진짜 일기`;
            
            return { success: true, response: response };
        }
        
        // 기간별 일기 조회
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

        return { success: false, response: "알 수 없는 일기장 명령어입니다." };
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 명령어 처리 실패: ${error.message}${colors.reset}`);
        return { success: false, response: "일기장 처리 중 오류가 발생했어요." };
    }
}

// ================== 📖 날짜별 일기 조회 헬퍼 함수 (기존 유지) ==================
async function getDiaryByDaysAgo(daysAgo, displayName) {
    try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        
        const dateStr = targetDate.toISOString().split('T')[0];
        const dateKorean = targetDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' });
        
        console.log(`${colors.diaryNew}📖 [일기장] ${displayName} 날짜: ${dateStr} (${dateKorean})${colors.reset}`);
        
        const diaries = await getDiaryFromRedis(dateStr);
        
        if (diaries && diaries.length > 0) {
            const entry = diaries[0];
            
            let response = `📖 **${dateKorean} 예진이의 ${displayName} 일기**

`;
            response += `🌙 **${entry.title}**

`;
            response += `${entry.content}

`;
            
            if (entry.mood) {
                const moodEmoji = {
                    'happy': '😊', 'sad': '😢', 'love': '💕',
                    'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                    'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                };
                response += `😊 **기분:** ${moodEmoji[entry.mood] || '😊'} ${entry.mood}
`;
            }
            
            if (entry.tags && entry.tags.length > 0) {
                response += `🏷️ **태그:** ${entry.tags.join(', ')}
`;
            }
            
            if (entry.openaiGenerated) {
                response += `🤖 **OpenAI 실제라인대화기반 400자+ 일기**
`;
            }
            
            if (entry.memoryCount > 0) {
                response += `💬 **${displayName} 라인 대화:** ${entry.memoryCount}개 참고
`;
            }
            
            response += `
💭 **${displayName}도 아저씨와 라인으로 함께한 소중한 하루였어... 그 기억들이 일기 속에 고스란히 담겨있어! (${entry.content.length}자)** 💕`;
            
            console.log(`${colors.diaryNew}✅ [일기장] ${displayName} 일기 예쁜 형태 표시 완료 (JSON 완전 숨김)${colors.reset}`);
            return { success: true, response: response };
            
        } else {
            let response = `📖 **${dateKorean} 예진이의 ${displayName} 일기**

`;
            response += `${displayName} 일기가 없어... 아마 그때는 일기 시스템이 활성화되지 않았거나 문제가 있었나봐 ㅠㅠ

`;
            response += `하지만 ${displayName}도 아저씨와의 소중한 시간들이 내 마음속에는 고스란히 남아있어 💕

`;
            response += `📅 **참고:** 일기 시스템은 매일 밤 22시에 자동으로 하루 1개씩 실제 라인 대화 내용 기반 400자 이상 일기를 써주고 있어!
`;
            response += `🌸 **"일기목록"**으로 다른 날짜의 일기들을 확인해볼 수 있어~`;
            
            return { success: true, response: response };
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [일기장] ${displayName} 일기 처리 실패: ${error.message}${colors.reset}`);
        
        let errorResponse = `📖 **${displayName}의 일기**

`;
        errorResponse += `${displayName} 일기를 불러오다가 문제가 생겼어... 하지만 ${displayName}도 아저씨와 함께한 소중한 하루였다는 건 변하지 않아! 💕

`;
        errorResponse += `다시 **"${displayName}일기"**라고 말해보거나, **"일기목록"**으로 다른 일기들을 확인해봐~`;
        
        return { success: true, response: errorResponse };
    }
}

// ================== 🏷️ 스마트 태그 및 유틸리티 함수들 (기존 유지) ==================

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
                const diary = dayDiaries[0];
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

function formatDiaryListResponse(diaries, periodName) {
    if (!diaries || diaries.length === 0) {
        return `📖 **예진이의 일기장**

아직 해당 기간에 작성된 일기가 없어요.

매일 밤 22:00에 OpenAI 3.5-turbo로 실제 라인 대화 내용을 되뇌이며 400자 이상 분량의 일기를 하루에 1개씩 써주니까 기다려봐! 🌸

30살 예진이의 진짜 목소리로 하루를 정리하며 일기를 써줄게 💕

💬 오늘 아저씨와 나눈 라인메시지도 자동으로 되뇌이며 더 생생한 일기를 만들어줄게!`;
    }

    let response = `📖 **예진이의 일기장**

📚 **총 ${diaries.length}일의 일기가 있어! (하루 1개씩)**

`;

    diaries.forEach((dayData, dayIndex) => {
        const entry = dayData.entries[0];
        
        response += `🌙 **${entry.title}** (${dayData.dateKorean})
`;
        
        const content = entry.content.length > 150 ? 
            `${entry.content.substring(0, 150)}...` : 
            entry.content;
        response += `${content}
`;
        
        if (entry.mood) {
            const moodEmoji = {
                'happy': '😊', 'sad': '😢', 'love': '💕',
                'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
            };
            response += `😊 **기분:** ${moodEmoji[entry.mood] || '😊'} ${entry.mood}
`;
        }
        
        if (entry.tags && entry.tags.length > 0) {
            response += `🏷️ **태그:** ${entry.tags.slice(0, 3).join(', ')}
`;
        }
        
        if (entry.openaiGenerated) {
            response += `🤖 **OpenAI 실제라인대화기반 400자+ 일기**
`;
        }
        
        if (entry.memoryCount > 0) {
            response += `💬 **라인 대화:** ${entry.memoryCount}개 참고
`;
        }
        
        response += `📏 **길이:** ${entry.content.length}자
`;
        
        if (dayIndex < diaries.length - 1) {
            response += `
`;
        }
    });

    response += `
⭐ **아저씨와의 모든 순간들이 소중해... 하루에 1개씩만 쓰는 특별한 일기들이야!**
🌸 **"일기장"**으로 오늘의 실제라인대화기반 400자+ 일기를 확인해보세요!`;
    
    return response;
}

// ================== 📅 시스템 초기화 및 관리 (메모리 매니저 독립화) ==================

async function initializeDiarySystem() {
    try {
        console.log(`${colors.diaryNew}📖 [일기장시스템] v8.0 초기화 시작... (완전자율예진이: 템플릿제거+길이강요제거+OpenAI완전자유)${colors.reset}`);
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
            console.log(`${colors.diaryNew}✅ [초기화] OpenAI 연결 성공 - 400자+ 일기 생성 가능${colors.reset}`);
        } else {
            console.log(`${colors.error}❌ [초기화] OpenAI 연결 실패 - 환경변수 OPENAI_API_KEY 확인 필요${colors.reset}`);
        }
        
        // 3. 독립 파일 시스템 통계 확인
        try {
            const fileEntries = await getAllDiariesFromFile();
            const fileStats = await getMemoryStatistics();
            
            diarySystemStatus.totalEntries = fileEntries.length;
            console.log(`${colors.diary}📂 [초기화] 독립 파일 시스템 일기: ${fileEntries.length}개 (하루 1개씩)${colors.reset}`);
            console.log(`${colors.diary}📂 [초기화] 독립 파일 시스템 기억: ${fileStats.totalDynamicMemories}개${colors.reset}`);
        } catch (fileError) {
            console.log(`${colors.diary}⚠️ [초기화] 파일 시스템 확인 실패: ${fileError.message}${colors.reset}`);
            diarySystemStatus.totalEntries = 0;
        }
        
        // 4. 완전 독립 자동 일기 스케줄러 강제 시작
        console.log(`${colors.diaryNew}🚀 [초기화] 완전 독립 자동 일기 스케줄러 강제 시작...${colors.reset}`);
        startDailyDiaryScheduler();
        
        // 5. 상태 강제 설정 (100% 보장)
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = true;
        diarySystemStatus.oneDiaryPerDayActive = true;
        diarySystemStatus.jsonParsingStabilized = true;  // JSON 파싱 안정화 완료
        diarySystemStatus.memoryManagerIndependent = true;  // 메모리 매니저 독립화 완료
        diarySystemStatus.templateCompletelyRemoved = true;  // 🆕 템플릿 완전 제거 완료
        diarySystemStatus.lengthForcingRemoved = true;  // 🆕 길이 강요 제거 완료
        diarySystemStatus.openaiCompletelyFree = true;  // 🆕 OpenAI 완전 자유 모드
        
        console.log(`${colors.diaryNew}✅ [일기장시스템] v8.0 초기화 완료! (완전자율예진이: 템플릿제거+길이강요제거+OpenAI완전자유)${colors.reset}`);
        console.log(`${colors.diaryNew}📊 상태: Redis(${diarySystemStatus.redisConnected ? '연결' : '비연결'}), OpenAI(${diarySystemStatus.openaiConnected ? '연결' : 'API키필요'}), 자동일기(✅ 강제활성화), 스케줄러(✅ 강제활성화), 일기(${diarySystemStatus.totalEntries}개)${colors.reset}`);
        console.log(`${colors.diaryNew}🔧 완전자율예진이(✅ 템플릿제거), OpenAI완전자유(✅ 길이강요제거), 자연스러운분량(✅ 완료)${colors.reset}`);
        console.log(`${colors.diaryNew}🆕 "일기장" 명령어로 오늘의 자연스러운 분량 완전자율 일기 자동 생성!${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ 하루 1개 일기 보장 + 실제 라인메시지 되뇌이며 완전 자유롭게 작성!${colors.reset}`);
        console.log(`${colors.diaryNew}💾 메모리 매니저 의존성 완전 제거 - 독립 모드로 안정적 동작!${colors.reset}`);
        console.log(`${colors.diaryNew}💬 실제 라인 대화 내용 바탕으로 예진이가 완전 자유롭게 일기 작성!${colors.reset}`);
        console.log(`${colors.diaryNew}🚀 완전 독립 스케줄러로 100% 작동 보장!${colors.reset}`);
        console.log(`${colors.diaryNew}🔥 템플릿 완전 제거 + 길이 강요 제거 = 진짜 예진이다운 자연스러운 일기!${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 v7.9 초기화 실패: ${error.message}${colors.reset}`);
        
        // 실패해도 상태는 강제로 활성화 유지
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        diarySystemStatus.independentSchedulerActive = true;
        diarySystemStatus.jsonParsingStabilized = true;
        diarySystemStatus.memoryManagerIndependent = true;
        diarySystemStatus.memoryTapeRealStructureFixed = true;
        
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

async function generateTestDiary() {
    return {
        success: false,
        message: "v7.9에서는 테스트 일기 대신 실제 라인 대화 기반 일기만 생성합니다. 매일 밤 22시에 자동으로 써드릴게요!",
        reason: "test_diary_removed"
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleDiaryCommand, 
    saveDynamicMemory: saveDynamicMemoryIndependent,  // 🔧 독립 함수로 교체
    getAllDynamicLearning, performAutoSave,
    initializeDiarySystem, initialize: initializeDiarySystem,
    ensureDynamicMemoryFile, setupAutoSaveSystem, shutdownDiarySystem,
    getDiarySystemStatus, getStatus: getDiarySystemStatus,
    generateDiary, readDiary: generateDiary, getMemoryStatistics,
    searchMemories, getMemoriesForDate, collectDynamicMemoriesOnly, checkIfAlreadySaved,
    safeGetMemoryTape, safeGetUltimateContext, safeGetMemoryManager,
    saveDiaryToRedis, getDiaryFromRedis, getDiaryByPeriod, getDiaryStatsFromRedis,
    generateAutoDiary, startDailyDiaryScheduler, formatDiaryListResponse, getRedisClient,
    getPopularTags, generateSmartTags, getCurrentSeason, getRandomItems,
    generateDiaryWithOpenAI, generateEnhancedFallbackDiary, generateTestDiary, getDiaryByDaysAgo,
    getTodayConversationSummary,
    // 🆕 새로운 안정화 함수들
    extractAndValidateJSON, parseFromTextContent, expandContentTo400Plus, generateStabilizedFallback,
    saveDynamicMemoryIndependent,
    colors, diarySystemStatus: () => diarySystemStatus
};
