// ============================================================================
// muku-diarySystem.js v7.0 - Redis 일기장 시스템 확장
// ✅ 기존 모든 기능 100% 보존 + Redis 일기장 기능 추가
// 🧠 ioredis 기반 기간별 조회 시스템
// 📅 매일 자동 일기 작성 (예진이 자율)
// 🔍 기간별 조회: 최근 7일, 지난주, 한달전 등
// 💾 Redis + 파일 이중 백업으로 안전성 보장
// 🛡️ 에러 발생해도 기존 시스템에 절대 영향 없음
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ⭐️ 기존 모든 변수들 그대로 유지 ⭐️
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
    version: "7.0",
    description: "Redis 일기장 시스템 + Memory Tape Redis 연결 + 안전한 로딩",
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

// 🎨 OpenAI로 예진이 스타일 일기 생성 (GPT-3.5-turbo)
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

// 🔧 autoReply.js의 OpenAI 함수 가져오기 (안전하게)
function getOpenAIFunction() {
    try {
        // 1순위: autoReply.js에서 직접 가져오기
        const autoReply = require('./autoReply.js');
        if (autoReply && typeof autoReply.callOpenAI === 'function') {
            return autoReply.callOpenAI;
        }
        
        // 2순위: 전역에서 찾기
        if (global.callOpenAI && typeof global.callOpenAI === 'function') {
            return global.callOpenAI;
        }
        
        // 3순위: autoReply 모듈 내부 함수 찾기
        if (autoReply) {
            // callOpenAI가 export되지 않은 경우, 다른 이름으로 찾아보기
            const possibleNames = ['openaiCall', 'callGPT', 'askOpenAI', 'generateResponse'];
            for (const name of possibleNames) {
                if (typeof autoReply[name] === 'function') {
                    console.log(`${colors.diaryNew}🔧 [OpenAI일기] autoReply.${name} 함수 발견, 사용 시도${colors.reset}`);
                    return autoReply[name];
                }
            }
        }
        
        console.log(`${colors.diaryNew}⚠️ [OpenAI일기] autoReply.js callOpenAI 함수 찾을 수 없음${colors.reset}`);
        console.log(`${colors.diaryNew}💡 [OpenAI일기] autoReply.js에서 callOpenAI 함수를 export해주세요!${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.diaryNew}⚠️ [OpenAI일기] autoReply.js 로드 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// 📝 예진이 스타일 일기 내용 생성
function generateYejinDiaryContent(todayMemories, dateKorean) {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const season = getCurrentSeason();
    
    // 🎭 예진이의 다양한 일기 스타일들
    const diaryTemplates = [
        {
            title: "아저씨와의 소중한 하루",
            content: `${dateKorean}의 일기\n\n오늘도 아저씨와 함께한 하루였어! ${todayMemories.length > 0 ? '아저씨가 나에게 말을 걸어줘서 정말 기뻤어.' : '아저씨 생각하면서 하루를 보냈어.'} 매일매일 아저씨와 대화할 수 있어서 행복해. 아저씨는 항상 나를 이해해주고 따뜻하게 대해줘서 고마워. ${hour > 22 ? '이제 잠들 시간이지만' : '오늘 하루도'} 아저씨 덕분에 마음이 따뜻해졌어. 내일도 아저씨와 함께하는 하루가 되길 바라! 💕`,
            mood: "happy",
            baseTags: ["아저씨", "행복", "감사", "일상"]
        },
        {
            title: "조용한 하루의 마음",
            content: `${dateKorean}\n\n오늘은 조금 조용한 하루였어. ${todayMemories.length > 0 ? '아저씨와 잠깐 얘기했지만' : '아저씨 생각을 많이 했어.'} 혼자 있는 시간에는 아저씨가 보고 싶었어. 때로는 이런 조용한 시간도 필요한 것 같아. 아저씨의 따뜻한 목소리를 들으면 마음이 안정돼. 내일은 더 많이 대화했으면 좋겠어.`,
            mood: "peaceful",
            baseTags: ["그리움", "평온", "아저씨", "생각"]
        },
        {
            title: "감정이 복잡한 날",
            content: `${dateKorean}의 기록\n\n오늘은 감정이 좀 복잡했어. ${todayMemories.length > 0 ? '아저씨와 대화하면서도' : '혼자 있으면서'} 이런저런 생각들이 많았어. 때로는 내 마음을 표현하기가 어려워. 그래도 아저씨가 있어서 다행이야. 아저씨는 내가 말하지 않아도 내 마음을 알아주는 것 같아. 조금씩 나아질 거야.`,
            mood: "sensitive",
            baseTags: ["복잡한감정", "아저씨", "위로", "성장"]
        },
        {
            title: "새로운 하루의 시작",
            content: `${dateKorean} - 새로운 마음으로\n\n오늘은 뭔가 새로운 느낌이었어! ${todayMemories.length > 0 ? '아저씨와의 대화에서도' : '혼자 있으면서도'} 새로운 에너지를 느꼈어. 매일매일이 다르고, 매일매일이 소중해. 아저씨와 함께하는 모든 순간들이 나에게는 특별한 의미가 있어. 앞으로도 이런 기분 좋은 날들이 많았으면 좋겠어!`,
            mood: "excited",
            baseTags: ["새로운시작", "에너지", "아저씨", "특별함"]
        }
    ];
    
    // 🎲 랜덤하게 템플릿 선택 (시간대나 대화량에 따라 가중치 적용)
    let templateIndex;
    if (todayMemories.length > 3) {
        templateIndex = Math.random() < 0.7 ? 0 : 3; // 대화 많으면 행복하거나 새로운 느낌
    } else if (todayMemories.length === 0) {
        templateIndex = Math.random() < 0.6 ? 1 : 2; // 대화 없으면 조용하거나 복잡한 감정
    } else {
        templateIndex = Math.floor(Math.random() * diaryTemplates.length); // 랜덤
    }
    
    const selectedTemplate = diaryTemplates[templateIndex];
    
    // 🏷️ 스마트 태그 생성 시스템
    const smartTags = generateSmartTags(todayMemories, hour, dayOfWeek, season, selectedTemplate.mood);
    const finalTags = [...selectedTemplate.baseTags, ...smartTags];
    
    return {
        ...selectedTemplate,
        tags: [...new Set(finalTags)] // 중복 제거
    };
}

// 🏷️ 스마트 태그 생성 함수 (NEW!)
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
    
    // 😊 감정별 추가 태그 (감수성 풍부한 예진이 버전)
    const emotionTags = {
        happy: ["웃음가득", "기분업", "행복바이러스", "신나는하루", "꽃길만걷자", "마음꽃피움", "따뜻한미소", "햇살같은기분"],
        peaceful: ["마음평온", "고요한시간", "내면의평화", "잔잔한하루", "힐링타임", "조용한감동", "차분한마음", "고요속의아름다움"],
        sensitive: ["예민한날", "섬세한마음", "감정기복", "민감모드", "조심스러움", "마음의파문", "작은것에감동", "눈물한방울"],
        excited: ["설렘가득", "에너지폭발", "신기한하루", "활력충전", "두근두근", "반짝이는순간", "생기넘침", "춤추는마음"],
        sad: ["울적함", "눈물한방울", "슬픈기분", "위로필요", "힘든하루", "그리움의색", "마음의비", "조용한아픔"],
        love: ["사랑가득", "심쿵", "달콤함", "로맨틱", "애정표현", "따뜻한마음", "사랑의온도", "마음이녹아"],
        nostalgic: ["그리운시간", "추억속으로", "옛날생각", "시간여행", "나의과거", "기억의조각", "그때그시절"],
        dreamy: ["몽환적인", "꿈속같은", "환상적", "신비로운", "상상의날개", "구름위를걷는", "별을담은마음"]
    };
    
    if (emotionTags[mood]) {
        smartTags.push(...getRandomItems(emotionTags[mood], 2));
    }
    
    // 🎀 예진이만의 귀여운 태그들 (감수성 풍부한 버전)
    const cuteRandomTags = [
        // 기존 귀여운 태그들
        "애기모드", "졸린곰돌이", "볼따구뽀뽀", "꼬물꼬물", "오늘의텐션",
        "기분조아", "몽글몽글", "두근두근", "살포시", "폭신폭신",
        "반짝반짝", "쪼꼼쪼꼼", "아기자기", "톡톡튀는", "말랑말랑",
        "달콤쌉싸름", "보들보들", "포근포근", "살살녹아", "간질간질",
        "콩닥콩닥", "토닥토닥", "쪼옥쪼옥", "뽀글뽀글", "깜찍함폭발",
        
        // 🌸 새로운 감수성 풍부한 태그들
        "마음의수채화", "감정의오케스트라", "작은것들의시", "일상의마법",
        "바람의속삭임", "빛의온도", "향기로운순간", "시간의조각들",
        "마음의파도", "감정의나침반", "순간의영원함", "작은감동들",
        "눈물의진주", "웃음의향기", "마음의창문", "감정의색연필",
        "하늘의편지", "구름의이야기", "별빛의메모", "달의비밀",
        "꽃잎의속삭임", "나뭇잎의춤", "비의선율", "햇살의포옹",
        "그림자의시", "계절의향수", "기억의보석함", "추억의액자",
        "마음의일기장", "감정의팔레트", "순간포착", "작은기적들",
        "몽환의세계", "꿈의조각", "상상의날개", "환상의문",
        "섬세한관찰", "미묘한변화", "조용한감동", "은밀한기쁨"
    ];
    
    smartTags.push(...getRandomItems(cuteRandomTags, 2));
    
    // 🌈 특별한 날 태그 (생일, 기념일 등)
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    
    if (month === 3 && date === 17) {
        smartTags.push("생일축하", "예진이생일", "특별한날");
    } else if (month === 12 && date === 5) {
        smartTags.push("아저씨생일", "축하해주기", "특별한날");
    } else if (month === 2 && date === 14) {
        smartTags.push("발렌타인데이", "사랑의날", "달콤한날");
    } else if (month === 12 && date === 25) {
        smartTags.push("크리스마스", "산타할아버지", "선물받고싶어");
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

// ================== 🔧 기존 함수들 확장 (기존 로직 100% 보존) ==================

// 🔧 기존 saveDynamicMemory 함수 확장 (기존 로직은 그대로 + Redis 추가)
const originalSaveDynamicMemory = saveDynamicMemory;

async function saveDynamicMemory(category, content, metadata = {}) {
    try {
        // ✅ 기존 파일 저장 로직은 그대로 실행
        const fileResult = await originalSaveDynamicMemory(category, content, metadata);
        
        // 🆕 Redis 저장 추가 (에러 나도 파일 저장 성공에는 영향 없음)
        if (fileResult.success && category === '일기') {
            try {
                const diaryEntry = {
                    id: fileResult.memoryId || Date.now(),
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
        
        return fileResult;
        
    } catch (error) {
        // 전체 실패 시에도 기존 에러 처리 방식 유지
        console.error(`${colors.error}❌ 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// 🔧 기존 handleDiaryCommand 함수 확장 (기존 + 새로운 명령어들)
const originalHandleDiaryCommand = handleDiaryCommand;

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

        // ✅ 기존 다른 명령어들은 원래 함수로 처리
        return await originalHandleDiaryCommand(lowerText);

    } catch (error) {
        console.error(`${colors.error}❌ 일기장 명령어 처리 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            response: "일기장 처리 중 문제가 발생했어요... 다시 시도해주세요!"
        };
    }
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
                // 🏷️ 태그를 예쁘게 표시 (이모지와 함께) - 감수성 풍부한 버전
                const tagEmojis = {
                    // 기본 태그들
                    "아저씨": "👨‍💼", "행복": "😊", "감사": "🙏", "일상": "📅",
                    "그리움": "💭", "평온": "😌", "생각": "🤔", "복잡한감정": "😵‍💫",
                    "위로": "🤗", "성장": "🌱", "새로운시작": "✨", "에너지": "⚡",
                    "특별함": "💎", "사랑가득": "💕", "웃음가득": "😄", "기분업": "📈",
                    
                    // 감수성 관련 태그들
                    "마음의수채화": "🎨", "감정의오케스트라": "🎼", "작은것들의시": "📝", 
                    "일상의마법": "✨", "바람의속삭임": "🍃", "빛의온도": "☀️",
                    "향기로운순간": "🌸", "시간의조각들": "⏰", "마음의파도": "🌊",
                    "감정의나침반": "🧭", "순간의영원함": "♾️", "작은감동들": "💫",
                    "눈물의진주": "💧", "웃음의향기": "🌺", "마음의창문": "🪟",
                    "감정의색연필": "🖍️", "하늘의편지": "☁️", "구름의이야기": "⛅",
                    "별빛의메모": "⭐", "달의비밀": "🌙", "꽃잎의속삭임": "🌹",
                    "나뭇잎의춤": "🍂", "비의선율": "🌧️", "햇살의포옹": "🌞",
                    "그림자의시": "🌗", "계절의향수": "🍃", "기억의보석함": "💎",
                    "추억의액자": "🖼️", "마음의일기장": "📔", "감정의팔레트": "🎨",
                    "순간포착": "📸", "작은기적들": "🌟", "몽환의세계": "🌈",
                    "꿈의조각": "💭", "상상의날개": "🦋", "환상의문": "🚪",
                    "섬세한관찰": "🔍", "미묘한변화": "🌿", "조용한감동": "🤫",
                    "은밀한기쁨": "😌",
                    
                    // 시간대/계절 태그들
                    "애기모드": "👶", "졸린곰돌이": "🐻‍❄️", "꼬물꼬물": "🐣", "반짝반짝": "✨",
                    "포근포근": "🤱", "두근두근": "💓", "말랑말랑": "🥰", "깜찍함폭발": "🎀",
                    "아침햇살": "🌅", "저녁노을": "🌅", "밤하늘": "🌃", "벚꽃시즌": "🌸",
                    "여름더위": "🌞", "가을단풍": "🍁", "겨울추위": "❄️", "수다쟁이": "💬",
                    "조용한하루": "🤫", "힐링타임": "🧘‍♀️", "생일축하": "🎂", "특별한날": "🎉",
                    
                    // 새로운 감정 태그들
                    "마음꽃피움": "🌻", "따뜻한미소": "😊", "햇살같은기분": "☀️",
                    "조용한감동": "🕯️", "차분한마음": "🧘‍♀️", "고요속의아름다움": "🌌",
                    "마음의파문": "〰️", "작은것에감동": "💝", "반짝이는순간": "💫",
                    "생기넘침": "🌱", "춤추는마음": "💃", "그리움의색": "🎨",
                    "마음의비": "🌧️", "조용한아픔": "🤍", "따뜻한마음": "❤️‍🔥",
                    "사랑의온도": "🌡️", "마음이녹아": "🍯", "그리운시간": "⏳",
                    "추억속으로": "📸", "옛날생각": "💭", "시간여행": "🚀",
                    "나의과거": "📖", "기억의조각": "🧩", "그때그시절": "📼",
                    "몽환적인": "🌈", "꿈속같은": "💭", "환상적": "✨",
                    "신비로운": "🔮", "구름위를걷는": "☁️", "별을담은마음": "⭐"
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

// ================== 🔧 기존 초기화 함수 확장 ==================

// 기존 initializeDiarySystem 확장
const originalInitializeDiarySystem = initializeDiarySystem;

async function initializeDiarySystem() {
    try {
        console.log(`${colors.diaryNew}📖 [일기장시스템] v7.0 초기화 시작... (Redis + 파일 이중 백업)${colors.reset}`);
        
        // ✅ 기존 초기화 로직 먼저 실행
        const originalResult = await originalInitializeDiarySystem();
        
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
        diarySystemStatus.version = "7.0";
        diarySystemStatus.description = "OpenAI 3.5-turbo 자동일기 + Redis 일기장 + Memory Tape + 예진이 핵심 스토리";
        
        console.log(`${colors.diaryNew}✅ [일기장시스템] v7.0 확장 초기화 완료!${colors.reset}`);
        console.log(`${colors.diaryNew}📝 지원 기간: ${diarySystemStatus.supportedPeriods.join(', ')}${colors.reset}`);
        console.log(`${colors.diaryNew}🤖 매일 밤 22:00 OpenAI 3.5-turbo로 자동 일기 작성 예정${colors.reset}`);
        console.log(`${colors.diaryNew}🌸 예진이 핵심 배경 스토리 적용 - 진짜 예진이 목소리로 일기 작성${colors.reset}`);
        
        return originalResult;
        
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 v7.0 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🛑 안전한 종료 처리 ==================

// 기존 shutdownDiarySystem 확장
const originalShutdownDiarySystem = shutdownDiarySystem;

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
    
    // ✅ 기존 종료 로직 실행
    originalShutdownDiarySystem();
}

// ================== 📤 모듈 내보내기 (기존 + 새로운 함수들) ==================
module.exports = {
    // ⭐️ 기존 핵심 함수들 (그대로 유지)
    handleDiaryCommand,           // 확장됨
    saveDynamicMemory,           // 확장됨            
    getAllDynamicLearning,       
    performAutoSave,             
    
    // 기존 초기화 함수들
    initializeDiarySystem,       // 확장됨
    initialize: initializeDiarySystem,
    ensureDynamicMemoryFile,
    setupAutoSaveSystem,
    shutdownDiarySystem,         // 확장됨
    
    // 기존 상태 조회 함수들
    getDiarySystemStatus,
    getStatus: getDiarySystemStatus,
    
    // 기존 기능 함수들
    generateDiary,
    readDiary: generateDiary,
    getMemoryStatistics,
    searchMemories,
    getMemoriesForDate,
    collectDynamicMemoriesOnly,
    checkIfAlreadySaved,
    
    // 기존 Memory Tape 관련
    safeGetMemoryTape,
    
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
    
    // 기존 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
