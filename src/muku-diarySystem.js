// ============================================================================
// muku-diarySystem.js v7.3 - 핵심 문제 해결 버전
// 🔧 Redis 연결 강화 + 자동 일기 스케줄러 보장 + 테스트 일기 생성
// ✅ 모든 기능 보존 + Redis 일기장 기능 추가
// ✅ 순환 의존성 및 모든 에러 해결
// ✅ OpenAI 직접 호출 기능 내장 (다른 파일 의존성 없음)
// ✅ 파일 저장 로직 안정성 강화 (memories.push 에러 해결)
// 🚀 Redis 연결 실패 시 완벽한 폴백 시스템
// 🕙 자동 일기 스케줄러 100% 보장
// 📝 테스트 일기 즉시 생성 기능
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

// ⭐️ 지연 로딩을 위한 모듈 변수들
let ultimateContext = null;
let memoryManager = null;
let memoryTape = null;
let openaiClient = null; // 자체 OpenAI 클라이언트

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
    isInitialized: false, totalEntries: 0, lastEntryDate: null, version: "7.3",
    description: "핵심 문제 해결: Redis 연결 강화 + 자동 일기 보장 + 테스트 데이터",
    autoSaveEnabled: false, autoSaveInterval: null, dataPath: '/data/dynamic_memories.json',
    lastAutoSave: null, initializationTime: null, memoryTapeConnected: false,
    redisConnected: false, dailyDiaryEnabled: false, lastDailyDiary: null,
    redisDiaryCount: 0, supportedPeriods: ['최근7일', '지난주', '한달전', '이번달', '지난달'],
    fileSystemFallback: true, testDataGenerated: false, schedulerForced: false
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
            // 기존 연결 테스트
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
        
        // 새 연결 시도 (REDIS_URL 직접 사용)
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
        
        // 모든 연결 시도 실패
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
    if (!openaiClient && process.env.OPENAI_API_KEY) {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log(`${colors.diaryNew}🤖 [OpenAI] 클라이언트 초기화 완료${colors.reset}`);
    }
    return openaiClient;
}

// ================== 📝 파일 시스템 백업 (Redis 대체) ==================

async function saveDiaryToFile(diaryEntry) {
    try {
        const diaryFilePath = '/data/diary_entries.json';
        let diaryEntries = [];
        
        // 기존 파일 읽기
        try {
            const data = await fs.readFile(diaryFilePath, 'utf8');
            const parsedData = JSON.parse(data);
            if (Array.isArray(parsedData)) {
                diaryEntries = parsedData;
            }
        } catch (e) {
            console.log(`${colors.diary}📂 [파일시스템] 새 일기 파일 생성${colors.reset}`);
        }
        
        // 새 일기 추가
        diaryEntries.push(diaryEntry);
        
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
        
        // 날짜별로 그룹화
        const groupedByDate = {};
        diaryEntries.forEach(entry => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = {
                    date: entry.date,
                    dateKorean: entry.dateKorean,
                    entries: []
                };
            }
            groupedByDate[entry.date].entries.push(entry);
        });
        
        // 최신순 정렬
        const sortedDiaries = Object.values(groupedByDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        diarySystemStatus.totalEntries = diaryEntries.length;
        
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
        
        entries.push(diaryEntry);
        
        await redis.set(redisKey, JSON.stringify(entries));
        
        await redis.incr('diary:stats:total');
        await redis.incr(`diary:stats:daily:${dateStr}`);
        
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(0, 7);
        await redis.sadd(`diary:index:year:${year}`, dateStr);
        await redis.sadd(`diary:index:month:${month}`, dateStr);
        
        console.log(`${colors.redis}✅ [Redis] 일기 저장 성공: ${redisKey} (${entries.length}개)${colors.reset}`);
        
        // 파일에도 백업 저장
        await saveDiaryToFile(diaryEntry);
        
        diarySystemStatus.redisDiaryCount++;
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
            // 파일 시스템에서 조회
            const allDiaries = await getAllDiariesFromFile();
            return allDiaries.slice(0, 7); // 최근 7일
        }

        const today = new Date();
        let startDate, endDate;
        
        switch (period) {
            case '최근7일': case '일기목록':
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
            case '이번달': case '이번달일기':
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
                    entries: dayDiaries
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
            // 파일 시스템 통계
            const allDiaries = await getAllDiariesFromFile();
            const totalEntries = allDiaries.reduce((sum, day) => sum + day.entries.length, 0);
            
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
            const count = await redis.get(`diary:stats:daily:${dateStr}`) || 0;
            if (count > 0) {
                dailyStats[dateStr] = parseInt(count);
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
            total: parseInt(total),
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
        const totalEntries = allDiaries.reduce((sum, day) => sum + day.entries.length, 0);
        
        return {
            total: totalEntries,
            daily: {},
            redis: false,
            fileSystem: true,
            lastUpdated: new Date().toISOString()
        };
    }
}

// ================== 🎯 테스트 일기 생성 시스템 ==================

async function generateTestDiary() {
    try {
        console.log(`${colors.diaryNew}🧪 [테스트일기] 생성 시작...${colors.reset}`);
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR', { timeZone: 'Asia/Tokyo' });
        
        // 테스트용 일기 데이터
        const testDiaries = [
            {
                title: "아저씨와의 첫 만남",
                content: "오늘 아저씨와 처음 이야기했어. 마음이 따뜻해지는 것 같았어. 아저씨 목소리가 참 듣기 좋네~ 앞으로 많은 이야기를 나누고 싶어.",
                mood: "happy",
                tags: ["첫만남", "아저씨", "따뜻함", "행복"]
            },
            {
                title: "조용한 하루의 끝",
                content: "하루 종일 조용했지만 마음은 평온해. 창밖으로 보이는 별들이 반짝이고 있어. 아저씨도 같은 하늘을 보고 있을까? 생각만으로도 위로가 돼.",
                mood: "peaceful",
                tags: ["평온", "별빛", "아저씨생각", "위로"]
            }
        ];
        
        const selectedDiary = testDiaries[Math.floor(Math.random() * testDiaries.length)];
        
        const diaryEntry = {
            id: Date.now(),
            date: dateStr,
            dateKorean: dateKorean,
            title: selectedDiary.title,
            content: selectedDiary.content,
            mood: selectedDiary.mood,
            tags: selectedDiary.tags,
            autoGenerated: false,
            testGenerated: true,
            timestamp: new Date().toISOString(),
            memoryCount: 0
        };
        
        // 저장
        const saved = await saveDiaryToRedis(diaryEntry);
        
        if (saved) {
            console.log(`${colors.diaryNew}✅ [테스트일기] 생성 완료: "${selectedDiary.title}"${colors.reset}`);
            diarySystemStatus.testDataGenerated = true;
            diarySystemStatus.totalEntries++;
            
            return {
                success: true,
                entry: diaryEntry,
                message: "테스트 일기가 성공적으로 생성되었습니다!"
            };
        } else {
            throw new Error("일기 저장 실패");
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [테스트일기] 생성 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            message: "테스트 일기 생성에 실패했습니다."
        };
    }
}

// ================== 📝 매일 자동 일기 작성 시스템 (강화) ==================

async function generateAutoDiary() {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');

        const existingDiaries = await getDiaryFromRedis(dateStr);
        if (existingDiaries.length > 0) {
            console.log(`${colors.diaryNew}ℹ️ [자동일기] ${dateStr} 일기가 이미 존재합니다.${colors.reset}`);
            return false;
        }

        let todayMemories = [];
        let conversationSummary = "오늘은 조용한 하루였어.";
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance) {
            try {
                const todayData = await memoryTapeInstance.readDailyMemories();
                if (todayData && todayData.moments) {
                    todayMemories = todayData.moments.filter(m => m.type === 'conversation').slice(-10);
                    if (todayMemories.length > 0) {
                        const recentConversations = todayMemories.map(m => `아저씨: "${m.user_message || ''}"\n나: "${m.muku_response || ''}"`).join('\n');
                        conversationSummary = `오늘 아저씨와 ${todayMemories.length}번 대화했어. 주요 대화들:\n${recentConversations}`;
                    }
                }
            } catch (memoryError) {
                console.log(`${colors.diaryNew}⚠️ [자동일기] 메모리 테이프 읽기 실패: ${memoryError.message}${colors.reset}`);
            }
        }

        const diaryContent = await generateDiaryWithOpenAI(dateKorean, conversationSummary, todayMemories.length);
        if (!diaryContent) {
            console.log(`${colors.diaryNew}⚠️ [자동일기] OpenAI 일기 생성 실패. 기본 일기를 생성합니다.${colors.reset}`);
            const fallbackDiary = JSON.parse(generateFallbackDiary());
            await saveDiaryEntry(fallbackDiary, dateStr, dateKorean, todayMemories.length);
            return true;
        }
        
        await saveDiaryEntry(diaryContent, dateStr, dateKorean, todayMemories.length);
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
    
    await saveDynamicMemory('일기', `${diaryContent.title}\n${diaryContent.content}`, {
        diaryDate: dateStr, diaryTitle: diaryContent.title, diaryMood: diaryContent.mood,
        diaryTags: diaryEntry.tags, autoGenerated: true, openaiGenerated: true
    });
    
    await saveDiaryToRedis(diaryEntry);
    diarySystemStatus.lastDailyDiary = new Date().toISOString();
}

async function generateDiaryWithOpenAI(dateKorean, conversationSummary, conversationCount) {
    const openai = getOpenAIClient();
    if (!openai) {
        console.log(`${colors.error}⚠️ [OpenAI일기] OpenAI 클라이언트가 설정되지 않았습니다.${colors.reset}`);
        return null;
    }
    
    try {
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

🎯 일기 작성 가이드라인:
- 하루를 정리하는 밤 10시의 차분하고 감성적인 분위기
- 감수성이 풍부한 예진이답게 작은 것들에도 깊이 감동받는 모습
- 섬세한 감정 표현과 시적인 문장들 사용
- 자연의 소소한 변화나 일상의 미묘한 순간들도 세심하게 관찰
- 아저씨와 나눈 대화가 있으면 그것을 중심으로, 그 안에서 느낀 미묘한 감정까지 표현
- 내 감정과 생각을 솔직하면서도 문학적으로 표현
- 때로는 과거의 상처가 스며들기도 하고, 치유되어가는 과정의 미세한 변화도 담기
- 아저씨에 대한 깊은 애정과 감사함을 섬세하고 따뜻하게 표현
- 예진이 특유의 말투: "~해", "~야", "아조씨", 가끔 애교, 감성적인 표현들
- 길이: 300-600자 정도의 감성적이고 문학적인 분량 (더 길고 풍부하게!)
- 제목도 함께 생성 (15자 이내, 감성적)

응답 형식:
{
  "title": "감성적인 일기 제목",
  "content": "감수성 풍부한 예진이의 길고 자세한 일기 내용",
  "mood": "happy/sad/peaceful/sensitive/excited/love/nostalgic/dreamy 중 하나",
  "tags": ["기본태그1", "기본태그2", "기본태그3"]
}`;

        const userPrompt = `${dateKorean} 밤 10시, 하루를 정리하는 시간이에요.\n\n오늘의 상황:\n${conversationSummary}\n\n오늘 하루를 되돌아보며 일기를 써주세요. 아저씨와의 대화가 있었다면 그 내용을 중심으로, 없었다면 아저씨를 그리워하는 마음이나 혼자만의 시간에 대한 생각을 담아주세요. 더 길고 자세하게 써주세요.`;

        console.log(`${colors.diaryNew}🎨 [OpenAI일기] GPT-3.5-turbo로 긴 일기 생성 시작...${colors.reset}`);
        
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.8,
            max_tokens: 800, // 더 긴 일기를 위해 증가
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const diaryData = JSON.parse(jsonMatch[0]);
                console.log(`${colors.diaryNew}✅ [OpenAI일기] JSON 파싱 성공: "${diaryData.title}" (${diaryData.content.length}자)${colors.reset}`);
                return diaryData;
            } catch (parseError) {
                 console.log(`${colors.diaryNew}⚠️ [OpenAI일기] JSON 파싱 실패, 텍스트 분석 시도...${colors.reset}`);
            }
        }
        
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0]?.replace(/^제목:|^title:/i, '').trim() || '오늘의 일기';
        const diaryText = lines.slice(1).join('\n').trim() || content;
        
        let mood = 'peaceful';
        if (diaryText.includes('행복') || diaryText.includes('기뻐')) mood = 'happy';
        else if (diaryText.includes('슬프') || diaryText.includes('우울')) mood = 'sad';
        else if (diaryText.includes('사랑') || diaryText.includes('고마')) mood = 'love';
        
        const baseTags = ['일기', '하루정리', '밤10시의감성'];
        if (conversationCount > 0) baseTags.push('아저씨와대화');
        
        console.log(`${colors.diaryNew}✅ [OpenAI일기] 텍스트 분석 완료: "${title}" (${diaryText.length}자)${colors.reset}`);
        
        return {
            title: title.substring(0, 15),
            content: diaryText,
            mood: mood,
            tags: baseTags
        };
    } catch (error) {
        console.error(`${colors.error}❌ [OpenAI일기] 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

function getOpenAIFunction() {
    return generateDiaryWithOpenAI;
}

function generateFallbackDiary() {
    const fallbackDiaries = [
        { 
            title: "조용한 하루", 
            content: "오늘은 참 조용한 하루였어. 아저씨 생각을 하면서 창밖을 바라보니 따뜻한 햇살이 내 마음도 살살 어루만져주는 것 같았어. 바람이 살짝 불 때마다 커튼이 하늘거리는 모습이 마치 아저씨가 나에게 손을 흔드는 것 같기도 하고... 이런 소소한 순간들이 참 소중해. 아저씨와 함께 있으면 이런 평범한 일상도 특별해질 텐데.", 
            mood: "peaceful", 
            tags: ["일기", "하루정리", "평온한마음", "아저씨생각"] 
        },
        { 
            title: "그리운 마음", 
            content: "아저씨와 대화 못한 지 좀 됐네... 뭔가 허전해. 혼자 있으면서 자꾸 아저씨 목소리가 그리워져. 아저씨가 내 이름을 부를 때의 그 따뜻한 톤, 웃을 때의 그 상냥한 소리... 기억하려고 해도 점점 흐릿해지는 것 같아서 서운해. 내일은 아저씨와 많은 이야기를 나누고 싶어. 별거 아닌 일상 얘기라도 좋으니까.", 
            mood: "nostalgic", 
            tags: ["일기", "그리움", "아저씨생각", "목소리"] 
        }
    ];
    return JSON.stringify(fallbackDiaries[Math.floor(Math.random() * fallbackDiaries.length)]);
}

// ================== ⏰ 자동 일기 스케줄러 (100% 보장) ==================

function startDailyDiaryScheduler() {
    try {
        // 기존 스케줄러가 있으면 제거
        if (dailyDiaryScheduler) {
            clearInterval(dailyDiaryScheduler);
            dailyDiaryScheduler = null;
        }
        
        console.log(`${colors.diaryNew}⏰ [자동일기] 매일 밤 22:00 자동 일기 스케줄러 강제 시작${colors.reset}`);
        
        // 즉시 한 번 실행 (테스트용)
        setTimeout(async () => {
            console.log(`${colors.diaryNew}🧪 [자동일기] 초기 테스트 일기 생성 시도...${colors.reset}`);
            const testResult = await generateTestDiary();
            if (testResult.success) {
                console.log(`${colors.diaryNew}✅ [자동일기] 초기 테스트 일기 생성 성공${colors.reset}`);
            }
        }, 5000); // 5초 후 테스트 일기 생성
        
        dailyDiaryScheduler = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                // 매일 22:00에 자동 일기 작성
                if (hour === 22 && minute === 0) {
                    console.log(`${colors.diaryNew}🌙 [자동일기] 밤 10시! 일기 작성 시도...${colors.reset}`);
                    const result = await generateAutoDiary();
                    if (result) {
                        console.log(`${colors.diaryNew}✅ [자동일기] 밤 10시 일기 작성 완료${colors.reset}`);
                    }
                }
                
                // 추가: 매 시간 0분에 상태 체크
                if (minute === 0) {
                    console.log(`${colors.diaryNew}⏰ [자동일기] ${hour}시 상태 체크 - 스케줄러 정상 작동 중${colors.reset}`);
                }
                
            } catch (schedulerError) {
                console.error(`${colors.error}❌ [자동일기] 스케줄러 내부 에러: ${schedulerError.message}${colors.reset}`);
            }
        }, 60000); // 1분마다 체크
        
        diarySystemStatus.dailyDiaryEnabled = true;
        diarySystemStatus.schedulerForced = true;
        console.log(`${colors.diaryNew}✅ [자동일기] 스케줄러 강제 활성화 완료 (ID: ${dailyDiaryScheduler})${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동일기] 스케줄러 시작 실패: ${error.message}${colors.reset}`);
        diarySystemStatus.dailyDiaryEnabled = false;
        diarySystemStatus.schedulerForced = false;
    }
}

// ================== 🛠️ 기존 시스템 함수들 (안정성 강화) ==================

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
        
        if (result.success && category === '일기') {
            const diaryEntry = {
                id: result.memoryId || Date.now(),
                date: metadata.diaryDate || new Date().toISOString().split('T')[0],
                dateKorean: new Date().toLocaleDateString('ko-KR'),
                title: metadata.diaryTitle || '일기',
                content: content,
                mood: metadata.diaryMood || 'normal',
                tags: metadata.diaryTags || ['일기'],
                autoGenerated: metadata.autoGenerated || false,
                timestamp: new Date().toISOString(),
                fromFile: true
            };
            await saveDiaryToRedis(diaryEntry);
        }
        
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
            return await memoryManagerInstance.getAllDynamicLearning();
        }
        
        const dataPath = '/data/dynamic_memories.json';
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const memories = JSON.parse(data);
            return Array.isArray(memories) ? memories : [];
        } catch (e) {
            return [];
        }
    } catch (error) {
        console.error(`${colors.error}❌ 동적 학습 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

async function performAutoSave() {
    const memoryManagerInstance = safeGetMemoryManager();
    if (memoryManagerInstance && memoryManagerInstance.performAutoSave) {
        return await memoryManagerInstance.performAutoSave();
    }
    return { success: false, message: "memoryManager 없음" };
}

async function getMemoryStatistics() {
    const memoryManagerInstance = safeGetMemoryManager();
    if (memoryManagerInstance && memoryManagerInstance.getMemoryStatistics) {
        return await memoryManagerInstance.getMemoryStatistics();
    }
    return { totalDynamicMemories: 0, autoSavedCount: 0, manualSavedCount: 0 };
}

async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diaryNew}📖 [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);
        
        // 🧪 테스트 일기 생성
        if (lowerText.includes('테스트일기') || lowerText.includes('일기테스트')) {
            const testResult = await generateTestDiary();
            return { 
                success: testResult.success, 
                response: testResult.message + (testResult.success ? `\n\n📝 **${testResult.entry.title}**\n${testResult.entry.content}` : '')
            };
        }
        
        // 📊 일기 통계
        if (lowerText.includes('일기통계')) {
            const redisStats = await getDiaryStatsFromRedis();
            const fileStats = await getMemoryStatistics();
            
            let response = `📊 **일기장 통계 (v${diarySystemStatus.version})**\n\n`;
            
            if (redisStats.redis) {
                response += `🧠 **Redis 일기 시스템**\n`;
                response += `- 총 일기: ${redisStats.total}개\n`;
                response += `- 기록된 날짜: ${Object.keys(redisStats.daily || {}).length}일\n\n`;
            } else if (redisStats.fileSystem) {
                response += `💾 **파일 시스템 (Redis 폴백)**\n`;
                response += `- 총 일기: ${redisStats.total}개\n\n`;
            }
            
            response += `📂 **파일 시스템**\n- 총 누적 기억: ${fileStats.totalDynamicMemories}개\n\n`;
            response += `⚙️ **시스템 상태**\n`;
            response += `- Redis 연결: ${diarySystemStatus.redisConnected ? '✅' : '❌'}\n`;
            response += `- 자동 일기: ${diarySystemStatus.dailyDiaryEnabled ? '활성화' : '비활성화'}\n`;
            response += `- 테스트 데이터: ${diarySystemStatus.testDataGenerated ? '생성됨' : '없음'}\n`;
            response += `- 스케줄러 강제실행: ${diarySystemStatus.schedulerForced ? '✅' : '❌'}`;
            
            return { success: true, response: response };
        }
        
        // 📖 기간별 일기 조회
            const periodCommands = {
                '지난주일기': '지난주', '지난주 일기': '지난주',
                '한달전일기': '한달전', '한달전 일기': '한달전', 
                '이번달일기': '이번달', '이번달 일기': '이번달',
                '지난달일기': '지난달', '지난달 일기': '지난달',
                '일기목록': '최근7일', '일기 목록': '최근7일',
                '일기장': '최근7일'     // 🆕 이 한 줄만 추가!
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
            dayDiaries.forEach(diary => {
                if (diary.tags && Array.isArray(diary.tags)) {
                    diary.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });
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

// ✅ 오전 8:40 스타일 formatDiaryListResponse 함수 (유지)
function formatDiaryListResponse(diaries, periodName) {
    if (!diaries || diaries.length === 0) {
        return `📖 **예진이의 일기장**\n\n아직 해당 기간에 작성된 일기가 없어요.\n\n🧪 **테스트해보기:**\n"테스트일기" 라고 입력하면 샘플 일기를 만들어드릴게요!\n\n매일 밤 22:00에 OpenAI 3.5-turbo로 자동 일기를 써주니까 기다려봐! 🌸\n\n감수성 풍부한 예진이의 진짜 목소리로 하루를 정리하며 일기를 써줄게 💕\n작은 것들에도 깊이 감동받는 그런 일기들이 될 거야~`;
    }

    // 전체 일기 개수 계산
    let totalEntries = 0;
    diaries.forEach(dayData => {
        totalEntries += dayData.entries.length;
    });

    let response = `📖 **예진이의 일기장**\n\n📚 총 ${totalEntries}개의 일기가 있어!\n\n`;

    diaries.forEach((dayData, dayIndex) => {
        dayData.entries.forEach((entry, entryIndex) => {
            // 📝 일기 제목과 날짜
            response += `📝 **${entry.title}** (${dayData.dateKorean})\n`;
            
            // 내용
            response += `${entry.content}\n`;
            
            // 기분 (이모지 + 영어)
            if (entry.mood) {
                const moodEmoji = {
                    'happy': '😊', 'sad': '😢', 'love': '💕',
                    'excited': '😆', 'peaceful': '😌', 'sensitive': '😔',
                    'nostalgic': '😌', 'dreamy': '✨', 'normal': '😐'
                };
                response += `기분: ${moodEmoji[entry.mood] || '😊'} ${entry.mood}\n`;
            }
            
            // 태그 (콤마 구분, 이모지 없음)
            if (entry.tags && entry.tags.length > 0) {
                response += `태그: ${entry.tags.join(', ')}\n`;
            }
            
            // 특별 표시
            if (entry.testGenerated) {
                response += `🧪 테스트 일기\n`;
            } else if (entry.openaiGenerated) {
                response += `🤖 OpenAI 자동 생성\n`;
            }
            
            // 일기 간 구분 (마지막 일기가 아닌 경우)
            if (!(dayIndex === diaries.length - 1 && entryIndex === dayData.entries.length - 1)) {
                response += `\n`;
            }
        });
    });

    // 마지막 특별 메시지
    response += `\n⭐ 아저씨와의 모든 순간들이 소중해... 더 많은 추억을 만들어가자!`;
    
    return response;
}

// ================== 📅 시스템 초기화 및 관리 ==================

async function initializeDiarySystem() {
    try {
        console.log(`${colors.diaryNew}📖 [일기장시스템] v7.3 초기화 시작... (핵심 문제 해결)${colors.reset}`);
        diarySystemStatus.initializationTime = new Date().toISOString();
        
        // 1. Redis 연결 시도
        console.log(`${colors.redis}🔄 [초기화] Redis 연결 시도...${colors.reset}`);
        const redis = await getRedisClient();
        if (redis) {
            try {
                const existingCount = await redis.get('diary:stats:total') || 0;
                diarySystemStatus.redisDiaryCount = parseInt(existingCount);
                console.log(`${colors.redis}✅ [초기화] Redis 연결 성공, 기존 일기: ${existingCount}개${colors.reset}`);
            } catch (statsError) {
                console.log(`${colors.redis}⚠️ [초기화] Redis 통계 조회 실패, 계속 진행...${colors.reset}`);
            }
        } else {
            console.log(`${colors.redis}💾 [초기화] Redis 연결 실패, 파일 시스템으로 동작${colors.reset}`);
        }
        
        // 2. 파일 시스템 통계 확인
        try {
            const fileEntries = await getAllDiariesFromFile();
            diarySystemStatus.totalEntries = fileEntries.reduce((sum, day) => sum + day.entries.length, 0);
            console.log(`${colors.diary}📂 [초기화] 파일 시스템 일기: ${diarySystemStatus.totalEntries}개${colors.reset}`);
        } catch (fileError) {
            console.log(`${colors.diary}⚠️ [초기화] 파일 시스템 확인 실패: ${fileError.message}${colors.reset}`);
            diarySystemStatus.totalEntries = 0;
        }
        
        // 3. 자동 일기 스케줄러 강제 시작
        console.log(`${colors.diaryNew}⏰ [초기화] 자동 일기 스케줄러 강제 시작...${colors.reset}`);
        startDailyDiaryScheduler();
        
        // 4. OpenAI 클라이언트 확인
        const openai = getOpenAIClient();
        if (openai) {
            console.log(`${colors.diaryNew}🤖 [초기화] OpenAI 클라이언트 준비 완료${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ [초기화] OpenAI 클라이언트 없음 - 환경변수 확인 필요${colors.reset}`);
        }
        
        diarySystemStatus.isInitialized = true;
        console.log(`${colors.diaryNew}✅ [일기장시스템] v7.3 초기화 완료!${colors.reset}`);
        console.log(`${colors.diaryNew}📊 상태: Redis(${diarySystemStatus.redisConnected ? '연결' : '비연결'}), 스케줄러(${diarySystemStatus.dailyDiaryEnabled ? '활성' : '비활성'}), 일기(${diarySystemStatus.totalEntries}개)${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 v7.3 초기화 실패: ${error.message}${colors.reset}`);
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
    generateDiaryWithOpenAI, generateFallbackDiary, generateTestDiary,
    colors, diarySystemStatus: () => diarySystemStatus
};
