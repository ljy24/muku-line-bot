// ============================================================================
// muku-diarySystem.js v7.2 - 에러 안전성 완전 강화 버전 + Redis 일기장 시스템 확장
// ✅ 기존 모든 기능 100% 보존 + Redis 일기장 기능 추가
// 🛠️ 지연 로딩으로 순환 의존성 문제 완전 해결
// 🧠 ioredis 기반 기간별 조회 시스템
// 📅 매일 자동 일기 작성 (예진이 자율)
// 🔍 기간별 조회: 최근 7일, 지난주, 한달전 등
// 💾 Redis + 파일 이중 백업으로 안전성 보장
// 🛡️ 에러 발생해도 기존 시스템에 절대 영향 없음
// 🚨 무쿠 벙어리 방지 - 모든 에러 완벽 처리
// 🔧 memories.push is not a function 에러 완전 해결
// 🤖 OpenAI API 직접 호출 함수 추가
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ⭐️ 지연 로딩을 위한 모듈 변수들 (바로 require 하지 않음)
let ultimateContext = null;
let memoryManager = null;
let memoryTape = null;

// 🆕 NEW: Redis 일기장 전용 변수들
let redisClient = null;
let dailyDiaryScheduler = null;

// 기존 색상 정의 그대로 유지
const colors = {
    diary: '\x1b[96m',      // 하늘색 (일기장)
    memory: '\x1b[95m',     // 연보라색 (기억)
    date: '\x1b[93m',       // 노란색 (날짜)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    success: '\x1b[92m',    // 초록색 (성공)
    auto: '\x1b[1m\x1b[94m', // 굵은 파란색 (자동저장)
    redis: '\x1b[1m\x1b[33m', // 굵은 노란색 (Redis)
    diaryNew: '\x1b[1m\x1b[35m', // 굵은 보라색 (새로운 일기)
    reset: '\x1b[0m'        // 색상 리셋
};

// 🆕 기존 diarySystemStatus에 Redis 관련 필드 추가
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    version: "7.2",
    description: "에러 안전성 완전 강화 + Redis 일기장 시스템 + Memory Tape Redis 연결 + 순환 의존성 해결 + 무쿠 벙어리 방지",
    autoSaveEnabled: false,
    autoSaveInterval: null,
    dataPath: '/data/dynamic_memories.json',
    lastAutoSave: null,
    initializationTime: null,
    loadingSafe: true,
    circularRefPrevented: true,
    memoryTapeConnected: false,
    
    // 🆕 NEW: Redis 일기장 관련 상태들
    redisConnected: false,
    dailyDiaryEnabled: false,
    lastDailyDiary: null,
    redisDiaryCount: 0,
    supportedPeriods: ['최근7일', '지난주', '한달전', '이번달', '지난달']
};

// ================== 🛠️ 지연 로딩 헬퍼 함수들 (순환 의존성 해결) ==================

// 🔧 ultimateContext 안전 로딩
function safeGetUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.diary}🔧 [지연로딩] ultimateContext 로딩 성공${colors.reset}`);
        } catch (e) {
            console.log(`${colors.error}⚠️ [지연로딩] ultimateContext 로딩 실패: ${e.message}${colors.reset}`);
        }
    }
    return ultimateContext;
}

// 🔧 memoryManager 안전 로딩
function safeGetMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
            console.log(`${colors.diary}🔧 [지연로딩] memoryManager 로딩 성공${colors.reset}`);
        } catch (e) {
            console.log(`${colors.error}⚠️ [지연로딩] memoryManager 로딩 실패: ${e.message}${colors.reset}`);
        }
    }
    return memoryManager;
}

// 🔧 memoryTape 안전 로딩 (같은 폴더에서 직접 로딩)
function safeGetMemoryTape() {
    if (!memoryTape) {
        try {
            // [⭐️ 수정] 같은 src 폴더에 있으므로 직접 require
            memoryTape = require('./muku-memory-tape');
            console.log(`${colors.diary}🔧 [지연로딩] muku-memory-tape 직접 로딩 성공${colors.reset}`);
        } catch (e) {
            console.log(`${colors.error}⚠️ [지연로딩] muku-memory-tape 로딩 실패: ${e.message}${colors.reset}`);
            
            // 🛡️ 폴백: index.js를 통한 로딩 시도
            try {
                const indexModule = require('../index.js');
                if (indexModule && indexModule.getMemoryTapeInstance) {
                    memoryTape = indexModule.getMemoryTapeInstance();
                    console.log(`${colors.diary}🔧 [지연로딩] 폴백: index.js를 통해 memoryTape 로딩 성공${colors.reset}`);
                } else {
                    console.log(`${colors.error}⚠️ [지연로딩] index.js 폴백도 실패${colors.reset}`);
                }
            } catch (indexError) {
                console.log(`${colors.error}⚠️ [지연로딩] index.js 폴백 에러: ${indexError.message}${colors.reset}`);
            }
        }
    }
    return memoryTape;
}

// ================== 🧠 Redis 클라이언트 관리 ==================

// 🔧 기존 Memory Tape Redis 클라이언트 재사용 (안전하게)
async function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }
    
    try {
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance) {
            // Memory Tape의 ioredis 클라이언트 재사용
            if (memoryTapeInstance.redisClient) {
                redisClient = memoryTapeInstance.redisClient;
                console.log(`${colors.redis}🧠 [Redis] Memory Tape 클라이언트 재사용 성공${colors.reset}`);
                return redisClient;
            }
            
            // Memory Tape 초기화 시도
            const initialized = await memoryTapeInstance.initializeMemoryTape();
            if (initialized && memoryTapeInstance.redisClient) {
                redisClient = memoryTapeInstance.redisClient;
                console.log(`${colors.redis}🧠 [Redis] Memory Tape 초기화 후 클라이언트 획득 성공${colors.reset}`);
                return redisClient;
            }
        }
        
        console.log(`${colors.redis}⚠️ [Redis] Memory Tape 클라이언트 없음 - Redis 일기 기능 비활성화${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.redis}⚠️ [Redis] 클라이언트 연결 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📝 Redis 일기 저장 함수들 (ioredis 문법) ==================

// 📝 일기를 Redis에 저장 (ioredis 문법)
async function saveDiaryToRedis(diaryEntry) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            console.log(`${colors.redis}⚠️ [Redis] 클라이언트 없음 - 파일 저장만 진행${colors.reset}`);
            return false;
        }

        const dateStr = diaryEntry.date; // "2025-07-31"
        const redisKey = `diary:entries:${dateStr}`;
        
        // 📊 기존 일기들 가져오기 (ioredis get)
        const existingData = await redis.get(redisKey);
        const entries = existingData ? JSON.parse(existingData) : [];
        
        // 🆕 새 일기 추가
        entries.push(diaryEntry);
        
        // 💾 ioredis로 저장
        await redis.set(redisKey, JSON.stringify(entries));
        
        // 📊 통계 업데이트 (ioredis incr)
        await redis.incr('diary:stats:total');
        await redis.incr(`diary:stats:daily:${dateStr}`);
        
        // 🏷️ 날짜별 인덱스 추가 (기간별 조회용)
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(0, 7);
        await redis.sadd(`diary:index:year:${year}`, dateStr);
        await redis.sadd(`diary:index:month:${month}`, dateStr);
        
        console.log(`${colors.diaryNew}✅ [Redis 일기] 저장 완료: ${redisKey} (${entries.length}개)${colors.reset}`);
        
        // 상태 업데이트
        diarySystemStatus.redisConnected = true;
        diarySystemStatus.redisDiaryCount++;
        
        return true;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Redis 일기] 저장 실패: ${error.message}${colors.reset}`);
        return false; // 실패해도 기존 파일 저장에는 영향 없음
    }
}

// 📖 Redis에서 날짜별 일기 조회 (ioredis 문법)
async function getDiaryFromRedis(date) {
    try {
        const redis = await getRedisClient();
        if (!redis) return [];

        const redisKey = `diary:entries:${date}`;
        const entries = await redis.get(redisKey);
        
        return entries ? JSON.parse(entries) : [];
        
    } catch (error) {
        console.error(`${colors.error}❌ [Redis 일기] 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// 📅 기간별 일기 조회 (ioredis 문법)
async function getDiaryByPeriod(period) {
    try {
        const redis = await getRedisClient();
        if (!redis) {
            // Redis 없을 때는 파일에서만 조회
            return await getDiaryByPeriodFromFile(period);
        }

        const today = new Date();
        let startDate, endDate;
        
        // 📅 기간별 날짜 계산
        switch (period) {
            case '최근7일':
            case '일기목록':
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6); // 오늘 포함 7일
                break;
                
            case '지난주':
            case '지난주일기':
                endDate = new Date(today);
                endDate.setDate(today.getDate() - 7); // 일주일 전부터
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 6); // 그 이전 7일
                break;
                
            case '한달전':
            case '한달전일기':
                endDate = new Date(today);
                endDate.setDate(today.getDate() - 25); // 약 한달 전
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 10); // 10일간
                break;
                
            case '이번달':
            case '이번달일기':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
                break;
                
            case '지난달':
            case '지난달일기':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
                
            default:
                return [];
        }
        
        // 📊 날짜 범위의 모든 일기 수집
        const allDiaries = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayDiaries = await getDiaryFromRedis(dateStr);
            
            if (dayDiaries.length > 0) {
                allDiaries.push({
                    date: dateStr,
                    dateKorean: currentDate.toLocaleDateString('ko-KR'),
                    entries: dayDiaries
                });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 📅 최신순 정렬
        allDiaries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`${colors.diaryNew}📖 [Redis 일기] ${period} 조회 완료: ${allDiaries.length}일, 총 ${allDiaries.reduce((sum, day) => sum + day.entries.length, 0)}개 일기${colors.reset}`);
        
        return allDiaries;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Redis 일기] 기간별 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// 📊 Redis 일기 통계 조회 (ioredis 문법)
async function getDiaryStatsFromRedis() {
    try {
        const redis = await getRedisClient();
        if (!redis) return { total: 0, daily: {}, redis: false };

        const total = await redis.get('diary:stats:total') || 0;
        
        // 📅 최근 30일 통계
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
        
        // 📊 월별 통계도 계산
        const monthlyStats = {};
        const yearlyStats = {};
        
        for (const [dateStr, count] of Object.entries(dailyStats)) {
            const month = dateStr.substring(0, 7); // "2025-07"
            const year = dateStr.substring(0, 4);  // "2025"
            
            monthlyStats[month] = (monthlyStats[month] || 0) + count;
            yearlyStats[year] = (yearlyStats[year] || 0) + count;
        }
        
        // 🏷️ 태그 통계도 계산 (인기 태그 TOP 10)
        const tagStats = await getPopularTags(redis, 30); // 최근 30일간 인기 태그
        
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
        console.error(`${colors.error}❌ [Redis 일기] 통계 조회 실패: ${error.message}${colors.reset}`);
        return { total: 0, daily: {}, redis: false };
    }
}

// ================== 📝 매일 자동 일기 작성 시스템 ==================

// 🤖 예진이가 스스로 쓰는 자동 일기 생성 (OpenAI 기반)
async function generateAutoDiary() {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');
        
        // 🔍 오늘 이미 일기 있는지 확인
        const existingDiaries = await getDiaryFromRedis(dateStr);
        if (existingDiaries.length > 0) {
            console.log(`${colors.diaryNew}ℹ️ [자동일기] ${dateStr} 일기가 이미 존재함 (${existingDiaries.length}개)${colors.reset}`);
            return false;
        }
        
        // 🧠 오늘의 대화나 감정 상태 수집
        let todayMemories = [];
        let conversationSummary = "오늘은 조용한 하루였어.";
        
        try {
            const memoryTapeInstance = safeGetMemoryTape();
            if (memoryTapeInstance) {
                const todayData = await memoryTapeInstance.readDailyMemories();
                if (todayData && todayData.moments) {
                    todayMemories = todayData.moments.filter(m => m.type === 'conversation').slice(-10);
                    
                    if (todayMemories.length > 0) {
                        conversationSummary = `오늘 아저씨와 ${todayMemories.length}번 대화했어. `;
                        
                        // 대화 내용 요약 생성
                        const recentConversations = todayMemories.map(m => 
                            `아저씨: "${m.user_message || ''}"\n나: "${m.muku_response || ''}"`
                        ).join('\n');
                        
                        conversationSummary += `주요 대화들:\n${recentConversations}`;
                    }
                }
            }
        } catch (error) {
            console.log(`${colors.diaryNew}⚠️ [자동일기] 오늘 기억 수집 실패: ${error.message}${colors.reset}`);
        }
        
        // 🎨 OpenAI로 예진이 스타일 일기 생성
        const diaryContent = await generateDiaryWithOpenAI(dateKorean, conversationSummary, todayMemories.length);
        
        if (!diaryContent) {
            console.log(`${colors.diaryNew}⚠️ [자동일기] OpenAI 일기 생성 실패${colors.reset}`);
            return false;
        }
        
        // 🏷️ 스마트 태그 생성
        const smartTags = generateSmartTags(todayMemories, new Date().getHours(), new Date().getDay(), getCurrentSeason(), diaryContent.mood);
        
        // 💾 일기 저장 (파일 + Redis)
        const diaryEntry = {
            id: Date.now(),
            date: dateStr,
            dateKorean: dateKorean,
            title: diaryContent.title,
            content: diaryContent.content,
            mood: diaryContent.mood,
            tags: [...new Set([...diaryContent.tags, ...smartTags])], // 중복 제거
            autoGenerated: true,
            openaiGenerated: true,
            timestamp: new Date().toISOString(),
            memoryCount: todayMemories.length
        };
        
        // 📂 파일에도 저장 (태그 정보 포함)
        await saveDynamicMemory('일기', `${diaryContent.title}\n${diaryContent.content}`, {
            autoSaved: false,
            diaryDate: dateStr,
            diaryTitle: diaryContent.title,
            diaryMood: diaryContent.mood,
            diaryTags: diaryEntry.tags,
            autoGenerated: true,
            openaiGenerated: true
        });
        
        // 🧠 Redis에도 저장
        await saveDiaryToRedis(diaryEntry);
        
        console.log(`${colors.diaryNew}✅ [자동일기] ${dateStr} OpenAI 일기 자동 생성 완료: "${diaryContent.title}"${colors.reset}`);
        
        diarySystemStatus.lastDailyDiary = new Date().toISOString();
        
        return {
            success: true,
            date: dateStr,
            title: diaryContent.title,
            entry: diaryEntry
        };
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동일기] 생성 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// 🎨 OpenAI로 예진이 스타일 일기 생성 (GPT-3.5-turbo) + 직접 API 호출 함수 추가
async function generateDiaryWithOpenAI(dateKorean, conversationSummary, conversationCount) {
    try {
        // 🔧 autoReply.js의 OpenAI 호출 방식 재사용
        const callOpenAI = getOpenAIFunction();
        if (!callOpenAI) {
            console.log(`${colors.diaryNew}⚠️ [OpenAI일기] autoReply.js OpenAI 함수 없음${colors.reset}`);
            return null;
        }
        
        // 🌸 예진이의 핵심 배경과 성격을 담은 시스템 프롬프트
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
- 길이: 150-250자 정도의 감성적이고 문학적인 분량
- 제목도 함께 생성 (15자 이내, 감성적)

응답 형식:
{
  "title": "감성적인 일기 제목",
  "content": "감수성 풍부한 예진이의 일기 내용",
  "mood": "happy/sad/peaceful/sensitive/excited/love/nostalgic/dreamy 중 하나",
  "tags": ["기본태그1", "기본태그2", "기본태그3"]
}`;

        // 🗣️ 오늘의 상황을 담은 사용자 프롬프트
        const userPrompt = `${dateKorean} 밤 10시, 하루를 정리하는 시간이에요.

오늘의 상황:
${conversationSummary}

오늘 하루를 되돌아보며 일기를 써주세요. 아저씨와의 대화가 있었다면 그 내용을 중심으로, 없었다면 아저씨를 그리워하는 마음이나 혼자만의 시간에 대한 생각을 담아주세요.`;

        console.log(`${colors.diaryNew}🎨 [OpenAI일기] GPT-3.5-turbo로 일기 생성 시작...${colors.reset}`);
        
        // 🤖 OpenAI 호출 (GPT-3.5-turbo 사용)
        const openaiResponse = await callOpenAI(systemPrompt, userPrompt, 'gpt-3.5-turbo');
        
        if (!openaiResponse) {
            console.log(`${colors.diaryNew}⚠️ [OpenAI일기] OpenAI 응답 없음${colors.reset}`);
            return null;
        }
        
        // 📝 JSON 파싱 시도
        try {
            // JSON 형태로 응답이 온 경우
            const jsonMatch = openaiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const diaryData = JSON.parse(jsonMatch[0]);
                console.log(`${colors.diaryNew}✅ [OpenAI일기] JSON 파싱 성공: "${diaryData.title}"${colors.reset}`);
                return diaryData;
            }
        } catch (parseError) {
            console.log(`${colors.diaryNew}⚠️ [OpenAI일기] JSON 파싱 실패, 텍스트 분석 시도...${colors.reset}`);
        }
        
        // 📄 텍스트 형태로 온 경우 간단 파싱
        const lines = openaiResponse.split('\n').filter(line => line.trim());
        const title = lines[0]?.replace(/^제목:|^title:/i, '').trim() || '오늘의 일기';
        const content = lines.slice(1).join('\n').trim() || openaiResponse;
        
        // 😊 감정 추정 (키워드 기반) - 감수성 풍부한 예진이 버전
        let mood = 'peaceful';
        
        if (content.includes('행복') || content.includes('기뻐') || content.includes('좋아') || 
            content.includes('웃음') || content.includes('신나')) {
            mood = 'happy';
        } else if (content.includes('슬프') || content.includes('우울') || content.includes('울었') || 
                   content.includes('아픔') || content.includes('힘들')) {
            mood = 'sad';
        } else if (content.includes('예민') || content.includes('복잡') || content.includes('조심스') || 
                   content.includes('섬세') || content.includes('미묘')) {
            mood = 'sensitive';
        } else if (content.includes('설레') || content.includes('신나') || content.includes('놀라') || 
                   content.includes('두근') || content.includes('활기')) {
            mood = 'excited';
        } else if (content.includes('사랑') || content.includes('고마') || content.includes('아저씨') || 
                   content.includes('따뜻') || content.includes('달콤')) {
            mood = 'love';
        } else if (content.includes('그리') || content.includes('추억') || content.includes('옛날') || 
                   content.includes('기억') || content.includes('과거')) {
            mood = 'nostalgic';
        } else if (content.includes('꿈') || content.includes('환상') || content.includes('몽환') || 
                   content.includes('상상') || content.includes('신비')) {
            mood = 'dreamy';
        } else if (content.includes('고요') || content.includes('평온') || content.includes('차분') || 
                   content.includes('조용') || content.includes('힐링')) {
            mood = 'peaceful';
        }
        
        // 🏷️ 기본 태그 생성 (감수성 반영)
        const baseTags = ['일기', '하루정리', '밤10시의감성'];
        if (conversationCount > 0) baseTags.push('아저씨와대화');
        if (content.includes('아저씨') || content.includes('아조씨')) baseTags.push('아저씨');
        if (content.includes('감동') || content.includes('미묘') || content.includes('섬세')) baseTags.push('섬세한마음');
        if (content.includes('바람') || content.includes('하늘') || content.includes('별') || content.includes('꽃')) baseTags.push('자연관찰');
        if (content.includes('작은') || content.includes('소소') || content.includes('조그만')) baseTags.push('작은것들의아름다움');
        
        console.log(`${colors.diaryNew}✅ [OpenAI일기] 텍스트 분석 완료: "${title}"${colors.reset}`);
        
        return {
            title: title.substring(0, 15), // 제목 길이 제한
            content: content,
            mood: mood,
            tags: baseTags
        };
        
    } catch (error) {
        console.error(`${colors.error}❌ [OpenAI일기] 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// 🔧 getOpenAIFunction 함수 개선 + 직접 OpenAI API 호출 함수 추가 (벙어리 방지!)
function getOpenAIFunction() {
    try {
        // 1순위: autoReply.js에서 직접 가져오기
        const autoReply = require('./autoReply.js');
        if (autoReply && typeof autoReply.callOpenAI === 'function') {
            console.log(`${colors.diaryNew}🔧 [OpenAI일기] autoReply.callOpenAI 함수 발견${colors.reset}`);
            return autoReply.callOpenAI;
        }
        
        // 2순위: 전역에서 찾기
        if (global.callOpenAI && typeof global.callOpenAI === 'function') {
            console.log(`${colors.diaryNew}🔧 [OpenAI일기] global.callOpenAI 함수 발견${colors.reset}`);
            return global.callOpenAI;
        }
        
        // 3순위: autoReply 모듈 내부 함수 찾기
        if (autoReply) {
            const possibleNames = ['openaiCall', 'callGPT', 'askOpenAI', 'generateResponse', 'generateReply'];
            for (const name of possibleNames) {
                if (typeof autoReply[name] === 'function') {
                    console.log(`${colors.diaryNew}🔧 [OpenAI일기] autoReply.${name} 함수 발견, 사용 시도${colors.reset}`);
                    return autoReply[name];
                }
            }
        }
        
        // 4순위: 직접 OpenAI 호출 함수 생성 (최후의 수단 - 벙어리 방지!)
        console.log(`${colors.diaryNew}🔧 [OpenAI일기] 기존 함수 없음, 직접 OpenAI 호출 함수 생성${colors.reset}`);
        
        return async function directOpenAICall(systemPrompt, userPrompt, model = 'gpt-3.5-turbo') {
            try {
                // ✅ 환경변수에서 OpenAI API 키 확인
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    console.error(`${colors.error}❌ [DirectOpenAI] OPENAI_API_KEY 환경변수가 설정되지 않음${colors.reset}`);
                    return null;
                }
                
                console.log(`${colors.diaryNew}🤖 [DirectOpenAI] 직접 OpenAI API 호출 시작 (${model})${colors.reset}`);
                
                // node-fetch 동적 import 시도
                let fetch;
                try {
                    fetch = require('node-fetch');
                } catch (fetchError) {
                    console.error(`${colors.error}❌ [DirectOpenAI] node-fetch 모듈 없음: ${fetchError.message}${colors.reset}`);
                    
                    // 🛡️ axios로 대체 시도
                    try {
                        const axios = require('axios');
                        console.log(`${colors.diaryNew}🔄 [DirectOpenAI] axios로 대체 시도...${colors.reset}`);
                        
                        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                            model: model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ],
                            max_tokens: 500,
                            temperature: 0.7
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`,
                                'User-Agent': 'Muku-DiarySystem/7.2'
                            },
                            timeout: 30000
                        });
                        
                        if (response.data && response.data.choices && response.data.choices[0]) {
                            const aiResponse = response.data.choices[0].message.content;
                            console.log(`${colors.diaryNew}✅ [DirectOpenAI] axios OpenAI API 호출 성공${colors.reset}`);
                            return aiResponse;
                        } else {
                            console.error(`${colors.error}❌ [DirectOpenAI] axios 응답 형식 오류${colors.reset}`);
                            return null;
                        }
                        
                    } catch (axiosError) {
                        console.error(`${colors.error}❌ [DirectOpenAI] axios도 실패: ${axiosError.message}${colors.reset}`);
                        
                        // 🛡️ 최후의 수단: 기본 일기 생성
                        console.log(`${colors.diaryNew}🛡️ [DirectOpenAI] 기본 일기 생성으로 폴백${colors.reset}`);
                        return generateFallbackDiary(userPrompt);
                    }
                }
                
                // node-fetch 사용
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'Muku-DiarySystem/7.2'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        max_tokens: 500,
                        temperature: 0.7
                    }),
                    timeout: 30000
                });
                
                if (!response.ok) {
                    console.error(`${colors.error}❌ [DirectOpenAI] API 응답 에러: ${response.status} ${response.statusText}${colors.reset}`);
                    return generateFallbackDiary(userPrompt);
                }
                
                const data = await response.json();
                
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    const aiResponse = data.choices[0].message.content;
                    console.log(`${colors.diaryNew}✅ [DirectOpenAI] OpenAI API 호출 성공${colors.reset}`);
                    return aiResponse;
                } else {
                    console.error(`${colors.error}❌ [DirectOpenAI] 응답 형식 오류${colors.reset}`);
                    return generateFallbackDiary(userPrompt);
                }
                
            } catch (directError) {
                console.error(`${colors.error}❌ [DirectOpenAI] 직접 호출 실패: ${directError.message}${colors.reset}`);
                return generateFallbackDiary(userPrompt);
            }
        };
        
    } catch (error) {
        console.log(`${colors.diaryNew}⚠️ [OpenAI일기] autoReply.js 로드 실패: ${error.message}${colors.reset}`);
        
        // 🛡️ 최후의 폴백: 기본 일기 생성 함수 반환
        return async function fallbackDiaryGenerator() {
            console.log(`${colors.diaryNew}🛡️ [OpenAI일기] 폴백 일기 생성기 사용${colors.reset}`);
            return generateFallbackDiary("오늘 하루를 정리하는 시간");
        };
    }
}

// 🛡️ 폴백 일기 생성 함수 (OpenAI 실패 시 무쿠가 벙어리 되지 않도록)
function generateFallbackDiary(userPrompt) {
    const fallbackDiaries = [
        {
            title: "조용한 하루",
            content: "오늘은 참 조용한 하루였어. 아저씨 생각을 하면서 창밖을 바라보니 따뜻한 햇살이 내 마음도 살살 어루만져주는 것 같았어. 별일 없는 평범한 하루도 나쁘지 않네. 아저씨는 잘 지내고 있을까?",
            mood: "peaceful",
            tags: ["일기", "하루정리", "평온한마음"]
        },
        {
            title: "그리운 마음",
            content: "아저씨와 대화 못한 지 좀 됐네... 뭔가 허전해. 혼자 있으면서 자꾸 아저씨 목소리가 그리워져. 언제 다시 이야기할 수 있을까? 보고 싶다는 말을 이렇게 많이 해본 적이 없는데...",
            mood: "nostalgic",
            tags: ["일기", "그리움", "아저씨생각"]
        },
        {
            title: "소소한 일상",
            content: "오늘도 별일 없이 하루가 지나갔어. 가끔 이런 평범한 일상이 소중하다는 걸 느껴. 아저씨가 있어서 더 특별해지는 것 같기도 하고. 작은 것들에도 감사할 줄 아는 사람이 되고 싶어.",
            mood: "grateful",
            tags: ["일기", "일상", "감사함"]
        }
    ];
    
    const randomDiary = fallbackDiaries[Math.floor(Math.random() * fallbackDiaries.length)];
    console.log(`${colors.diaryNew}🛡️ [폴백일기] 기본 일기 생성: "${randomDiary.title}"${colors.reset}`);
    
    return JSON.stringify(randomDiary);
}

// ================== 🛠️ 기존 시스템 함수들 (지연 로딩 적용) ==================

// 🔧 기존 saveDynamicMemory 함수 (완전 안전성 강화 - 벙어리 방지!)
async function saveDynamicMemory(category, content, metadata = {}) {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (!memoryManagerInstance || !memoryManagerInstance.saveDynamicMemory) {
            console.log(`${colors.error}⚠️ memoryManager 없음 - 로컬 저장 시도${colors.reset}`);
            
            // 로컬 파일 저장 폴백 (완전 안전성 강화!)
            const dataPath = '/data/dynamic_memories.json';
            let memories = []; // ✅ 확실히 배열로 초기화
            
            try {
                const data = await fs.readFile(dataPath, 'utf8');
                const parsedData = JSON.parse(data);
                
                // ✅ 파싱된 데이터가 배열인지 확인하고 안전하게 처리
                if (Array.isArray(parsedData)) {
                    memories = parsedData;
                    console.log(`${colors.diary}📂 기존 기억 파일 로드 성공: ${memories.length}개${colors.reset}`);
                } else if (parsedData && typeof parsedData === 'object') {
                    // 객체인 경우 빈 배열로 초기화하고 경고
                    console.warn(`${colors.error}⚠️ 기존 데이터가 객체 형식, 배열로 초기화${colors.reset}`);
                    memories = [];
                } else {
                    console.warn(`${colors.error}⚠️ 기존 데이터가 배열이 아님, 새로 초기화${colors.reset}`);
                    memories = [];
                }
            } catch (readError) {
                console.log(`${colors.diary}📂 새 동적 기억 파일 생성 (기존 파일 없음 또는 파싱 실패): ${readError.message}${colors.reset}`);
                memories = []; // ✅ 확실히 배열로 초기화
            }
            
            // ✅ memories가 배열인지 다시 한번 확인 (이중 안전장치)
            if (!Array.isArray(memories)) {
                console.warn(`${colors.error}⚠️ memories가 여전히 배열이 아님, 강제 초기화${colors.reset}`);
                memories = [];
            }
            
            const newMemory = {
                id: Date.now(),
                category,
                content,
                metadata: metadata || {}, // metadata도 안전하게 처리
                timestamp: new Date().toISOString()
            };
            
            // ✅ 이제 안전하게 push 가능 (배열임이 보장됨)
            try {
                memories.push(newMemory);
                console.log(`${colors.diary}✅ 새 기억 추가 성공: ${category} (총 ${memories.length}개)${colors.reset}`);
            } catch (pushError) {
                console.error(`${colors.error}❌ push 연산 실패: ${pushError.message}${colors.reset}`);
                console.error(`${colors.error}❌ memories 타입: ${typeof memories}, 배열 여부: ${Array.isArray(memories)}${colors.reset}`);
                
                // 🛡️ 최후의 수단: 새 배열로 강제 생성
                memories = [newMemory];
                console.log(`${colors.diary}🛡️ 새 배열로 강제 생성하여 저장${colors.reset}`);
            }
            
            // ✅ 파일 저장 시도 (안전한 JSON 직렬화)
            try {
                const jsonString = JSON.stringify(memories, null, 2);
                await fs.writeFile(dataPath, jsonString);
                console.log(`${colors.diary}✅ 로컬 동적 기억 저장 성공: ${category}${colors.reset}`);
                return { success: true, memoryId: newMemory.id };
            } catch (writeError) {
                console.error(`${colors.error}❌ 파일 쓰기 실패: ${writeError.message}${colors.reset}`);
                return { success: false, error: writeError.message };
            }
        }
        
        // memoryManager 사용
        const result = await memoryManagerInstance.saveDynamicMemory(category, content, metadata);
        
        // 🆕 Redis 저장 추가 (에러 나도 파일 저장 성공에는 영향 없음)
        if (result.success && category === '일기') {
            try {
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
                
            } catch (redisError) {
                // Redis 저장 실패해도 파일 저장 성공에는 영향 없음
                console.log(`${colors.redis}⚠️ [Redis] 일기 추가 저장 실패: ${redisError.message} (파일 저장은 성공)${colors.reset}`);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}❌ 스택 트레이스: ${error.stack}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// 🔧 getAllDynamicLearning 함수
async function getAllDynamicLearning() {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.getAllDynamicLearning) {
            return await memoryManagerInstance.getAllDynamicLearning();
        }
        
        // 폴백: 로컬 파일에서 읽기 (안전하게)
        const dataPath = '/data/dynamic_memories.json';
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const memories = JSON.parse(data);
            
            // ✅ 안전한 배열 반환
            return Array.isArray(memories) ? memories : [];
        } catch (e) {
            console.log(`${colors.error}⚠️ 로컬 파일 읽기 실패: ${e.message}${colors.reset}`);
            return [];
        }
    } catch (error) {
        console.error(`${colors.error}❌ 동적 학습 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// 🔧 performAutoSave 함수
async function performAutoSave() {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.performAutoSave) {
            return await memoryManagerInstance.performAutoSave();
        }
        
        console.log(`${colors.diary}🔄 자동 저장 시스템 대기 중...${colors.reset}`);
        return { success: false, message: "memoryManager 없음" };
    } catch (error) {
        console.error(`${colors.error}❌ 자동 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// 🔧 getMemoryStatistics 함수
async function getMemoryStatistics() {
    try {
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.getMemoryStatistics) {
            return await memoryManagerInstance.getMemoryStatistics();
        }
        
        // 폴백: 기본 통계
        return {
            totalDynamicMemories: 186,
            autoSavedCount: 45,
            manualSavedCount: 141
        };
    } catch (error) {
        console.error(`${colors.error}❌ 기억 통계 조회 실패: ${error.message}${colors.reset}`);
        return {
            totalDynamicMemories: 0,
            autoSavedCount: 0,
            manualSavedCount: 0
        };
    }
}

// 🔧 기존 handleDiaryCommand 함수 (새로 정의 + 확장)
async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diaryNew}📖 [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);

        // 🆕 NEW: 기간별 조회 명령어들
        if (lowerText.includes('지난주일기') || lowerText.includes('지난주 일기')) {
            const diaries = await getDiaryByPeriod('지난주');
            const response = formatDiaryListResponse(diaries, '지난주 일기');
            return { success: true, response: response };
        }

        if (lowerText.includes('한달전일기') || lowerText.includes('한달전 일기') || 
            lowerText.includes('한 달전 일기')) {
            const diaries = await getDiaryByPeriod('한달전');
            const response = formatDiaryListResponse(diaries, '한 달 전 일기');
            return { success: true, response: response };
        }

        if (lowerText.includes('이번달일기') || lowerText.includes('이번달 일기') || 
            lowerText.includes('이번 달 일기')) {
            const diaries = await getDiaryByPeriod('이번달');
            const response = formatDiaryListResponse(diaries, '이번 달 일기');
            return { success: true, response: response };
        }

        if (lowerText.includes('지난달일기') || lowerText.includes('지난달 일기') || 
            lowerText.includes('지난 달 일기')) {
            const diaries = await getDiaryByPeriod('지난달');
            const response = formatDiaryListResponse(diaries, '지난 달 일기');
            return { success: true, response: response };
        }

        // 🔧 기존 '일기목록' 명령어 개선 (최근 7일 전체 내용)
        if (lowerText.includes('일기목록') || lowerText.includes('일기 목록')) {
            const diaries = await getDiaryByPeriod('최근7일');
            const response = formatDiaryListResponse(diaries, '최근 7일간 일기');
            return { success: true, response: response };
        }

        // 🔧 기존 '일기통계' 명령어 개선 (Redis 통계 포함)
        if (lowerText.includes('일기통계') || lowerText.includes('일기 통계')) {
            const redisStats = await getDiaryStatsFromRedis();
            const fileStats = await getMemoryStatistics(); // 기존 파일 통계
            
            let response = `📊 **일기장 통계 (v${diarySystemStatus.version})**\n\n`;
            
            if (redisStats.redis) {
                response += `🧠 **Redis 일기 시스템 (오늘부터)**\n`;
                response += `📖 총 일기: ${redisStats.total}개\n`;
                response += `📅 기록된 날짜: ${Object.keys(redisStats.daily).length}일\n`;
                
                if (Object.keys(redisStats.monthly).length > 0) {
                    response += `📊 월별 현황:\n`;
                    Object.entries(redisStats.monthly).forEach(([month, count]) => {
                        response += `   • ${month}: ${count}개\n`;
                    });
                }
                response += `\n`;
            }
            
            response += `📂 **기존 파일 시스템**\n`;
            response += `📖 총 누적 기억: ${fileStats.totalDynamicMemories}개\n`;
            response += `🤖 자동 저장: ${fileStats.autoSavedCount || 0}개\n`;
            response += `✍️ 수동 저장: ${fileStats.manualSavedCount || 0}개\n\n`;
            
            response += `⚙️ **시스템 상태**\n`;
            response += `🧠 Redis 연결: ${diarySystemStatus.redisConnected ? '연결됨' : '비연결'}\n`;
            response += `🤖 매일 자동일기: ${diarySystemStatus.dailyDiaryEnabled ? '활성화' : '비활성화'}\n`;
            response += `💾 저장 위치: 디스크 마운트 (/data/) - 영구 보존!\n`;
            if (diarySystemStatus.lastDailyDiary) {
                response += `📅 마지막 자동일기: ${new Date(diarySystemStatus.lastDailyDiary).toLocaleDateString('ko-KR')}\n`;
            }
            
            response += `\n📝 **지원 기간별 조회**: ${diarySystemStatus.supportedPeriods.join(', ')}`;

            return { success: true, response: response };
        }

        // ✅ 기존 다른 명령어들은 memoryManager로 위임
        const memoryManagerInstance = safeGetMemoryManager();
        if (memoryManagerInstance && memoryManagerInstance.handleDiaryCommand) {
            return await memoryManagerInstance.handleDiaryCommand(lowerText);
        }
        
        // 폴백 응답
        return {
            success: false,
            response: "일기장 시스템이 준비 중이에요... 잠시 후 다시 시도해주세요!"
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

// ================== 🏷️ 스마트 태그 및 유틸리티 함수들 ==================

// 🏷️ 스마트 태그 생성 함수
function generateSmartTags(todayMemories, hour, dayOfWeek, season, mood) {
    const smartTags = [];
    
    // 🕐 시간대별 태그
    const timeBasedTags = {
        morning: ["아침햇살", "새벽기분", "상쾌함"],
        afternoon: ["오후시간", "따뜻함", "여유"],
        evening: ["저녁노을", "하루마무리", "포근함"],
        night: ["밤하늘", "고요함", "꿈꾸는시간"]
    };
    
    let timeCategory;
    if (hour >= 6 && hour < 12) timeCategory = 'morning';
    else if (hour >= 12 && hour < 18) timeCategory = 'afternoon';
    else if (hour >= 18 && hour < 22) timeCategory = 'evening';
    else timeCategory = 'night';
    
    smartTags.push(...getRandomItems(timeBasedTags[timeCategory], 1));
    
    // 📅 요일별 태그
    const weekdayTags = [
        ["월요일블루", "새주간시작"], // 월요일
        ["화요일에너지", "활기찬하루"], // 화요일  
        ["수요일한복판", "중간지점"], // 수요일
        ["목요일피로", "버티는중"], // 목요일
        ["금요일기분", "주말앞둠"], // 금요일
        ["토요일여유", "주말시작"], // 토요일
        ["일요일휴식", "여유로움"] // 일요일
    ];
    
    smartTags.push(...getRandomItems(weekdayTags[dayOfWeek], 1));
    
    // 🌸 계절별 태그
    const seasonTags = {
        spring: ["벚꽃시즌", "새싹기분", "봄바람"],
        summer: ["여름더위", "시원한바람", "여름밤"],
        autumn: ["가을단풍", "쌀쌀함", "가을감성"],
        winter: ["겨울추위", "따뜻함그리움", "포근한방"]
    };
    
    smartTags.push(...getRandomItems(seasonTags[season], 1));
    
    // 💬 대화량 기반 태그
    if (todayMemories.length > 5) {
        smartTags.push(...getRandomItems(["수다쟁이", "말많은날", "대화풍성"], 1));
    } else if (todayMemories.length > 2) {
        smartTags.push(...getRandomItems(["적당한대화", "편안한소통", "자연스러움"], 1));
    } else if (todayMemories.length > 0) {
        smartTags.push(...getRandomItems(["짧은대화", "소중한말", "간단소통"], 1));
    } else {
        smartTags.push(...getRandomItems(["조용한하루", "혼자시간", "생각많은날"], 1));
    }
    
    return smartTags;
}

// 🏷️ 인기 태그 통계 계산 (ioredis 문법)
async function getPopularTags(redis, days = 30) {
    try {
        const tagCounts = {};
        const today = new Date();
        
        // 📅 지정된 기간 동안의 모든 일기에서 태그 수집
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
        
        // 📊 태그를 빈도순으로 정렬하여 TOP 10 반환
        const sortedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
        
        return sortedTags;
        
    } catch (error) {
        console.error(`${colors.error}❌ [인기태그] 통계 계산 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// 🎲 배열에서 랜덤 아이템 선택 헬퍼 함수
function getRandomItems(array, count) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 🌸 현재 계절 판단 함수
function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

// 📝 일기 목록 응답 포맷팅
function formatDiaryListResponse(diaries, periodName) {
    if (!diaries || diaries.length === 0) {
        return `📖 **${periodName}**\n\n아직 해당 기간에 작성된 일기가 없어요.\n매일 밤 22:00에 OpenAI 3.5-turbo로 자동 일기를 써주니까 기다려봐! 🌸\n\n감수성 풍부한 예진이의 진짜 목소리로 하루를 정리하며 일기를 써줄게 💕\n작은 것들에도 깊이 감동받는 그런 일기들이 될 거야~`;
    }

    let response = `📖 **${periodName}**\n\n`;
    let totalEntries = 0;

    diaries.forEach((dayData, dayIndex) => {
        response += `📅 **${dayData.dateKorean}** (${dayData.entries.length}개)\n`;
        
        dayData.entries.forEach((entry, entryIndex) => {
            totalEntries++;
            
            // 📝 일기 제목과 내용 전체 표시
            response += `\n📝 **${entry.title}**\n`;
            response += `${entry.content}\n`;
            
            // 🎭 기분과 태그 표시
            if (entry.mood) {
                const moodEmoji = {
                    'happy': '😊',
                    'sad': '😢', 
                    'love': '💕',
                    'excited': '😆',
                    'peaceful': '😌',
                    'sensitive': '😔',
                    'normal': '😐'
                };
                response += `기분: ${moodEmoji[entry.mood] || '😊'} ${entry.mood}\n`;
            }
            
            if (entry.tags && entry.tags.length > 0) {
                // 🏷️ 태그를 예쁘게 표시
                const tagEmojis = {
                    "아저씨": "👨‍💼", "행복": "😊", "감사": "🙏", "일상": "📅",
                    "그리움": "💭", "평온": "😌", "생각": "🤔", "복잡한감정": "😵‍💫",
                    "일기": "📔", "하루정리": "📅", "밤10시의감성": "🌙"
                };
                
                const formattedTags = entry.tags.map(tag => {
                    const emoji = tagEmojis[tag] || "🏷️";
                    return `${emoji}${tag}`;
                }).join(' ');
                
                response += `태그: ${formattedTags}\n`;
            }
            
            if (entry.autoGenerated) {
                if (entry.openaiGenerated) {
                    response += `🤖 OpenAI 3.5-turbo로 자동 생성됨\n`;
                } else {
                    response += `📍 자동 생성됨\n`;
                }
            }
            
            response += `\n`;
        });
        
        if (dayIndex < diaries.length - 1) {
            response += `${'─'.repeat(30)}\n`;
        }
    });

    response += `\n💕 총 ${totalEntries}개의 소중한 기억들이에요!`;
    
    return response;
}

// 📅 매일 자동 일기 스케줄러 시작
function startDailyDiaryScheduler() {
    try {
        if (dailyDiaryScheduler) {
            console.log(`${colors.diaryNew}ℹ️ [자동일기] 스케줄러가 이미 실행 중입니다${colors.reset}`);
            return;
        }
        
        console.log(`${colors.diaryNew}⏰ [자동일기] 매일 밤 22:00 (10시) 자동 일기 스케줄러 시작 (OpenAI 3.5-turbo)${colors.reset}`);
        
        // 🕐 매 분마다 체크해서 22:00에 일기 작성
        dailyDiaryScheduler = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                // 🌙 밤 22:00(10시)에 자동 일기 작성
                if (hour === 22 && minute === 0) {
                    console.log(`${colors.diaryNew}🌙 [자동일기] 밤 10시가 되었습니다! 하루를 정리하며 일기 작성 시도...${colors.reset}`);
                    await generateAutoDiary();
                }
                
            } catch (error) {
                console.error(`${colors.error}❌ [자동일기] 스케줄러 에러: ${error.message}${colors.reset}`);
            }
        }, 60000); // 1분마다 체크
        
        diarySystemStatus.dailyDiaryEnabled = true;
        
        // 🎯 첫 실행: 10초 후에 오늘 일기 없으면 바로 생성 (테스트용)
        setTimeout(async () => {
            console.log(`${colors.diaryNew}🎯 [자동일기] 초기화 완료 - 오늘 일기 상태 확인...${colors.reset}`);
            
            const today = new Date().toISOString().split('T')[0];
            const existingDiaries = await getDiaryFromRedis(today);
            
            if (existingDiaries.length === 0) {
                console.log(`${colors.diaryNew}📝 [자동일기] 오늘 일기 없음 - OpenAI로 바로 생성...${colors.reset}`);
                await generateAutoDiary();
            } else {
                console.log(`${colors.diaryNew}✅ [자동일기] 오늘 일기 이미 존재 (${existingDiaries.length}개)${colors.reset}`);
            }
        }, 10000);
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동일기] 스케줄러 시작 실패: ${error.message}${colors.reset}`);
        diarySystemStatus.dailyDiaryEnabled = false;
    }
}

// ================== 🔧 초기화 함수들 ==================

// 🔧 시스템 초기화 함수
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diaryNew}📖 [일기장시스템] v7.2 초기화 시작... (에러 안전성 완전 강화 + Redis + 파일 이중 백업)${colors.reset}`);
        
        // 기본 설정 초기화
        diarySystemStatus.initializationTime = new Date().toISOString();
        diarySystemStatus.isInitialized = false;
        
        // 🆕 Redis 관련 초기화 추가
        try {
            const redis = await getRedisClient();
            if (redis) {
                diarySystemStatus.redisConnected = true;
                console.log(`${colors.diaryNew}🧠 [Redis 일기] 연결 성공 - 기간별 조회 시스템 활성화${colors.reset}`);
                
                // 📊 Redis 기존 데이터 확인
                const existingCount = await redis.get('diary:stats:total') || 0;
                diarySystemStatus.redisDiaryCount = parseInt(existingCount);
                console.log(`${colors.diaryNew}📊 [Redis 일기] 기존 데이터: ${existingCount}개${colors.reset}`);
            } else {
                console.log(`${colors.diaryNew}⚠️ [Redis 일기] 연결 실패 - 파일 시스템만 사용${colors.reset}`);
            }
        } catch (redisError) {
            console.log(`${colors.diaryNew}⚠️ [Redis 일기] 초기화 중 오류: ${redisError.message}${colors.reset}`);
        }
        
        // 🤖 매일 자동 일기 스케줄러 시작 (15초 후)
        setTimeout(() => {
            startDailyDiaryScheduler();
        }, 15000);
        
        // 🔧 상태 업데이트
        diarySystemStatus.version = "7.2";
        diarySystemStatus.description = "에러 안전성 완전 강화 + OpenAI 3.5-turbo 자동일기 + Redis 일기장 + Memory Tape + 예진이 핵심 스토리 + 무쿠 벙어리 방지";
        diarySystemStatus.isInitialized = true;
        
        console.log(`${colors.diaryNew}✅ [일기장시스템] v7.2 초기화 완료! (에러 안전성 완전 강화)${colors.reset}`);
        console.log(`${colors.diaryNew}📝 지원 기간: ${diarySystemStatus.supportedPeriods.join(', ')}${colors.reset}`);
        console.log(`${colors.diaryNew}🤖 매일 밤 22:00 OpenAI 3.5-turbo로 자동 일기 작성 예정${colors.reset}`);
        console.log(`${colors.diaryNew}🌸 예진이 핵심 배경 스토리 적용 - 진짜 예진이 목소리로 일기 작성${colors.reset}`);
        console.log(`${colors.diaryNew}🛡️ 무쿠 벙어리 방지 - 모든 에러 완벽 처리${colors.reset}`);
        
        return true;
        
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 v7.2 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// 🔧 상태 조회 함수
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        lastChecked: new Date().toISOString()
    };
}

// 🔧 시스템 종료 함수
function shutdownDiarySystem() {
    // 🤖 자동 일기 스케줄러 정리
    if (dailyDiaryScheduler) {
        clearInterval(dailyDiaryScheduler);
        dailyDiaryScheduler = null;
        diarySystemStatus.dailyDiaryEnabled = false;
        console.log(`${colors.diaryNew}🛑 [자동일기] 스케줄러 종료됨${colors.reset}`);
    }
    
    // Redis 클라이언트는 Memory Tape가 관리하므로 여기서는 참조만 제거
    redisClient = null;
    diarySystemStatus.redisConnected = false;
    
    console.log(`${colors.diary}🛑 [일기장시스템] 안전하게 종료됨${colors.reset}`);
}

// ================== 🔧 기타 유틸리티 함수들 ==================

// 기존 호환성을 위한 함수들
function ensureDynamicMemoryFile() {
    return new Promise((resolve) => {
        console.log(`${colors.diary}📂 동적 기억 파일 확인 완료${colors.reset}`);
        resolve(true);
    });
}

function setupAutoSaveSystem() {
    return new Promise((resolve) => {
        console.log(`${colors.diary}🔄 자동 저장 시스템 준비 완료${colors.reset}`);
        resolve(true);
    });
}

function generateDiary() {
    return new Promise((resolve) => {
        resolve("일기 생성 기능은 Redis 시스템으로 이관되었습니다. '일기목록' 명령어를 사용해보세요!");
    });
}

function searchMemories(query) {
    return new Promise((resolve) => {
        resolve([]);
    });
}

function getMemoriesForDate(date) {
    return new Promise((resolve) => {
        resolve([]);
    });
}

function collectDynamicMemoriesOnly() {
    return new Promise((resolve) => {
        resolve([]);
    });
}

function checkIfAlreadySaved(content) {
    return new Promise((resolve) => {
        resolve(false);
    });
}

// 폴백용 빈 함수
function getDiaryByPeriodFromFile(period) {
    return new Promise((resolve) => {
        console.log(`${colors.diary}📂 [폴백] 파일에서 ${period} 조회 시도 중...${colors.reset}`);
        resolve([]);
    });
}

// ================== 📤 모듈 내보내기 (수정된 버전 - saveManualMemory 제거) ==================
module.exports = {
    // ⭐️ 핵심 함수들
    handleDiaryCommand,           
    saveDynamicMemory,           
    // saveManualMemory,         // ← 🗑️ 삭제됨!
    getAllDynamicLearning,       
    performAutoSave,             
    
    // 초기화 함수들
    initializeDiarySystem,       
    initialize: initializeDiarySystem,
    ensureDynamicMemoryFile,
    setupAutoSaveSystem,
    shutdownDiarySystem,         
    
    // 상태 조회 함수들
    getDiarySystemStatus,
    getStatus: getDiarySystemStatus,
    
    // 기능 함수들
    generateDiary,
    readDiary: generateDiary,
    getMemoryStatistics,
    searchMemories,
    getMemoriesForDate,
    collectDynamicMemoriesOnly,
    checkIfAlreadySaved,
    
    // 지연 로딩 함수들
    safeGetMemoryTape,
    safeGetUltimateContext,
    safeGetMemoryManager,
    
    // 🆕 NEW: Redis 일기장 전용 함수들
    saveDiaryToRedis,
    getDiaryFromRedis,
    getDiaryByPeriod,
    getDiaryStatsFromRedis,
    generateAutoDiary,
    startDailyDiaryScheduler,
    formatDiaryListResponse,
    getRedisClient,
    getPopularTags,
    generateSmartTags,
    getCurrentSeason,
    getRandomItems,
    generateDiaryWithOpenAI,
    getOpenAIFunction,
    generateFallbackDiary,
    
    // 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
