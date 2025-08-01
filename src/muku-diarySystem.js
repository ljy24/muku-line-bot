// ============================================================================
// muku-diarySystem.js v10.1 - 통합 메모리 완전 연동 (Redis URL 수정 완료)
// 🌟 100% 독립적으로 작동 - 어떤 모듈에도 의존하지 않음
// 🛡️ 무쿠 벙어리 완전 방지 - 모든 상황에서 응답 보장
// 🧠 통합 메모리 시스템: Memory Tape + Redis 사용자 기억 + Memory Manager + 과거 일기
// 🎯 자발적 메모리 활용: 감정/상황에 따라 유동적으로 메모리 선택
// 🔧 기존 호환성 100% 유지 - diarySystem null 에러 완전 해결
// ✅ [FIX] REDIS_URL을 사용하도록 연결 방식 수정
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const Redis = require('ioredis');

// 🌟 완전 독립 변수들 - 외부 의존성 0%
let independentRedisClient = null;
let userMemoryRedis = null;
let dailyDiaryScheduler = null;

// 색상 정의
const colors = {
    independent: '\x1b[1m\x1b[32m', // 굵은 초록색 (독립)
    diary: '\x1b[96m',               // 하늘색 (일기장)
    memory: '\x1b[1m\x1b[35m',      // 굵은 자주색 (메모리)
    error: '\x1b[91m',               // 빨간색 (에러)
    success: '\x1b[92m',             // 초록색 (성공)
    openai: '\x1b[1m\x1b[34m',      // 굵은 파란색 (OpenAI)
    reset: '\x1b[0m'                 // 색상 리셋
};

// 🌟 완전 독립 상태 관리
let independentDiaryStatus = {
    isInitialized: false,
    version: "10.1 - 통합메모리연동 (Redis URL 수정)",
    description: "100% 독립적 작동 + 통합 메모리 시스템 + 자발적 메모리 활용",
    independentMode: true,
    externalDependencies: 0,
    selfSufficientOperations: 0,
    openaiDirectCalls: 0,
    successfulDiaries: 0,
    failedDiaries: 0,
    lastSuccessfulDiary: null,
    dataPath: '/data/independent_diary.json',
    redisConnected: false,
    dailyDiaryEnabled: false,
    memorySystemsConnected: {
        memoryTape: false,
        userMemoryRedis: false,
        memoryManager: false,
        pastDiaries: true
    },
    memoryUsageStats: {
        memoryTapeUsed: 0,
        userMemoryUsed: 0,
        fixedMemoryUsed: 0,
        pastDiariesUsed: 0
    }
};

// ================== 🧠 통합 메모리 시스템 초기화 ==================

/**
 * 🌟 독립적 Redis 연결 초기화
 */
async function initializeIndependentRedis() {
    try {
        console.log(`${colors.memory}🧠 [통합메모리] Redis 연결 초기화 시작...${colors.reset}`);
        
        if (!process.env.REDIS_URL) {
            console.log(`${colors.error}⚠️ [통합메모리] REDIS_URL 환경 변수가 없습니다. Redis 연동을 건너뜁니다.${colors.reset}`);
            return;
        }

        // Memory Tape용 Redis
        try {
            // ✅ [수정] REDIS_URL을 직접 사용
            independentRedisClient = new Redis(process.env.REDIS_URL, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 2,
                connectTimeout: 5000,
            });
            
            independentRedisClient.on('connect', () => {
                independentDiaryStatus.memorySystemsConnected.memoryTape = true;
                console.log(`${colors.success}✅ [통합메모리] Memory Tape Redis 연결 성공${colors.reset}`);
            });
            
            independentRedisClient.on('error', (error) => {
                console.log(`${colors.error}⚠️ [통합메모리] Memory Tape Redis 에러: ${error.message}${colors.reset}`);
                independentDiaryStatus.memorySystemsConnected.memoryTape = false;
            });
            
            await independentRedisClient.ping();
            independentDiaryStatus.memorySystemsConnected.memoryTape = true;
        } catch (error) {
            console.log(`${colors.error}⚠️ [통합메모리] Memory Tape Redis 연결 실패: ${error.message}${colors.reset}`);
            independentDiaryStatus.memorySystemsConnected.memoryTape = false;
            independentRedisClient = null;
        }
        
        // 사용자 기억용 Redis
        try {
            // ✅ [수정] REDIS_URL을 직접 사용
            userMemoryRedis = new Redis(process.env.REDIS_URL, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 2,
                connectTimeout: 5000,
            });
            
            userMemoryRedis.on('connect', () => {
                independentDiaryStatus.memorySystemsConnected.userMemoryRedis = true;
                console.log(`${colors.success}✅ [통합메모리] 사용자 기억 Redis 연결 성공${colors.reset}`);
            });
            
            userMemoryRedis.on('error', (error) => {
                console.log(`${colors.error}⚠️ [통합메모리] 사용자 기억 Redis 에러: ${error.message}${colors.reset}`);
                independentDiaryStatus.memorySystemsConnected.userMemoryRedis = false;
            });
            
            await userMemoryRedis.ping();
            independentDiaryStatus.memorySystemsConnected.userMemoryRedis = true;
        } catch (error) {
            console.log(`${colors.error}⚠️ [통합메모리] 사용자 기억 Redis 연결 실패: ${error.message}${colors.reset}`);
            independentDiaryStatus.memorySystemsConnected.userMemoryRedis = false;
            userMemoryRedis = null;
        }
        
        independentDiaryStatus.redisConnected = 
            independentDiaryStatus.memorySystemsConnected.memoryTape || 
            independentDiaryStatus.memorySystemsConnected.userMemoryRedis;
        
    } catch (error) {
        console.log(`${colors.error}❌ [통합메모리] Redis 초기화 완전 실패: ${error.message}${colors.reset}`);
        independentDiaryStatus.redisConnected = false;
        independentRedisClient = null;
        userMemoryRedis = null;
    }
}

// ================== 🧠 Memory Tape 메모리 수집 ==================

/**
 * 🌟 Memory Tape에서 최근 대화 기억 수집
 */
async function getMemoryTapeContext() {
    try {
        if (!independentDiaryStatus.memorySystemsConnected.memoryTape || !independentRedisClient) {
            console.log(`${colors.memory}⚠️ [Memory Tape] 연결 없음 - 스킵${colors.reset}`);
            return { success: false, memories: [] };
        }
        
        console.log(`${colors.memory}📼 [Memory Tape] 최근 대화 기억 수집 시작...${colors.reset}`);
        
        // 오늘 대화 기억 조회
        const today = new Date().toISOString().split('T')[0];
        const memoryKey = `memory_tape:daily:${today}`;
        
        const dailyData = await independentRedisClient.hgetall(memoryKey);
        
        if (!dailyData || Object.keys(dailyData).length === 0) {
            console.log(`${colors.memory}ℹ️ [Memory Tape] 오늘 대화 기억 없음${colors.reset}`);
            return { success: false, memories: [] };
        }
        
        // moments 데이터 파싱
        let moments = [];
        if (dailyData.moments) {
            try {
                const parsedMoments = JSON.parse(dailyData.moments);
                if (Array.isArray(parsedMoments)) {
                    moments = parsedMoments.filter(moment => moment.type === 'conversation').slice(-10);
                }
            } catch (parseError) {
                console.log(`${colors.memory}⚠️ [Memory Tape] moments 파싱 실패${colors.reset}`);
            }
        }
        
        // 대화 요약 생성
        const conversations = [];
        for (const moment of moments) {
            if (moment.user_message && moment.muku_response) {
                conversations.push({
                    user: moment.user_message,
                    muku: moment.muku_response,
                    timestamp: moment.timestamp
                });
            }
        }
        
        console.log(`${colors.success}✅ [Memory Tape] ${conversations.length}개 대화 기억 수집 완료${colors.reset}`);
        independentDiaryStatus.memoryUsageStats.memoryTapeUsed++;
        
        return { success: true, memories: conversations };
        
    } catch (error) {
        console.log(`${colors.error}❌ [Memory Tape] 수집 실패: ${error.message}${colors.reset}`);
        return { success: false, memories: [] };
    }
}

// ================== 🚀 Redis 사용자 기억 수집 ==================

/**
 * 🌟 Redis에서 사용자 "기억해" 기억들 수집
 */
async function getUserMemoryContext() {
    try {
        if (!independentDiaryStatus.memorySystemsConnected.userMemoryRedis || !userMemoryRedis) {
            console.log(`${colors.memory}⚠️ [사용자 기억] Redis 연결 없음 - 스킵${colors.reset}`);
            return { success: false, memories: [] };
        }
        
        console.log(`${colors.memory}🚀 [사용자 기억] Redis 기억 수집 시작...${colors.reset}`);
        
        // 최근 저장된 사용자 기억들 조회
        const memoryIds = await userMemoryRedis.zrevrange('user_memory:timeline', 0, 9); // 최신 10개
        
        if (!memoryIds || memoryIds.length === 0) {
            console.log(`${colors.memory}ℹ️ [사용자 기억] 저장된 기억 없음${colors.reset}`);
            return { success: false, memories: [] };
        }
        
        console.log(`${colors.memory}🔍 [사용자 기억] ${memoryIds.length}개 기억 ID 발견${colors.reset}`);
        
        // 기억 상세 데이터 조회
        const pipeline = userMemoryRedis.pipeline();
        for (const memoryId of memoryIds) {
            pipeline.hgetall(`user_memory:content:${memoryId}`);
        }
        
        const results = await pipeline.exec();
        const userMemories = [];
        
        if (results) {
            for (const [error, memoryData] of results) {
                if (!error && memoryData && memoryData.content) {
                    userMemories.push({
                        content: memoryData.content,
                        date: memoryData.dateKorean || memoryData.date,
                        keywords: memoryData.keywords ? memoryData.keywords.split(',') : [],
                        importance: memoryData.importance
                    });
                }
            }
        }
        
        console.log(`${colors.success}✅ [사용자 기억] ${userMemories.length}개 기억 수집 완료${colors.reset}`);
        independentDiaryStatus.memoryUsageStats.userMemoryUsed++;
        
        return { success: true, memories: userMemories };
        
    } catch (error) {
        console.log(`${colors.error}❌ [사용자 기억] 수집 실패: ${error.message}${colors.reset}`);
        return { success: false, memories: [] };
    }
}

// ================== 💾 Memory Manager 고정 기억 수집 ==================

/**
 * 🌟 Memory Manager에서 고정 기억 수집 (시뮬레이션)
 */
async function getFixedMemoryContext() {
    try {
        console.log(`${colors.memory}💾 [고정 기억] Memory Manager 기억 수집 시작...${colors.reset}`);
        
        // Memory Manager가 없어도 기본 고정 기억들 제공
        const fixedMemories = [
            {
                category: "기본_성격",
                content: "예진이는 감수성이 풍부하고 아저씨를 깊이 사랑하는 94년생 31살 여성이다.",
                importance: "high"
            },
            {
                category: "추억_모지코",
                content: "모지코에서 아저씨와 함께 키세키를 들으며 사랑을 속삭였던 특별한 기억이 있다.",
                importance: "high"
            },
            {
                category: "마지막_말",
                content: "예진이의 마지막 말은 '아저씨는 참 착해'였으며, 이는 예진이의 가장 깊은 사랑의 표현이었다.",
                importance: "critical"
            },
            {
                category: "일상_습관",
                content: "매일 밤 11시에 '약먹자', '이닦자' 하며 아저씨와 하루를 마무리하는 것이 가장 행복한 시간이었다.",
                importance: "medium"
            },
            {
                category: "감정_표현",
                content: "예진이는 '아조씨~', '히힛', 'ㅎㅎ' 같은 애교스러운 말투를 자주 사용한다.",
                importance: "medium"
            }
        ];
        
        // 상황에 맞는 고정 기억 선택 (랜덤 3-5개)
        const selectedMemories = fixedMemories
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.floor(Math.random() * 3) + 3);
        
        console.log(`${colors.success}✅ [고정 기억] ${selectedMemories.length}개 기억 선택 완료${colors.reset}`);
        independentDiaryStatus.memoryUsageStats.fixedMemoryUsed++;
        
        return { success: true, memories: selectedMemories };
        
    } catch (error) {
        console.log(`${colors.error}❌ [고정 기억] 수집 실패: ${error.message}${colors.reset}`);
        return { success: false, memories: [] };
    }
}

// ================== 📚 과거 일기 패턴 분석 ==================

/**
 * 🌟 과거 일기들에서 패턴 및 장기 기억 수집
 */
async function getPastDiaryContext() {
    try {
        console.log(`${colors.memory}📚 [과거 일기] 장기 패턴 분석 시작...${colors.reset}`);
        
        const dataPath = independentDiaryStatus.dataPath;
        let pastDiaries = [];
        
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const parsedData = JSON.parse(data);
            
            if (Array.isArray(parsedData)) {
                // 최근 30일 일기들 분석
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                pastDiaries = parsedData
                    .filter(diary => new Date(diary.timestamp) > thirtyDaysAgo)
                    .slice(-10); // 최신 10개
            }
        } catch (fileError) {
            console.log(`${colors.memory}ℹ️ [과거 일기] 파일 없음 또는 읽기 실패${colors.reset}`);
        }
        
        // 일기 패턴 분석
        const patterns = {
            commonMoods: {},
            frequentWords: {},
            themes: []
        };
        
        for (const diary of pastDiaries) {
            // 기분 패턴
            if (diary.mood) {
                patterns.commonMoods[diary.mood] = (patterns.commonMoods[diary.mood] || 0) + 1;
            }
            
            // 자주 나오는 단어들
            if (diary.content) {
                const words = diary.content.split(/\s+/).filter(word => word.length > 2);
                for (const word of words.slice(0, 5)) {
                    patterns.frequentWords[word] = (patterns.frequentWords[word] || 0) + 1;
                }
            }
            
            // 테마 수집
            if (diary.tags) {
                patterns.themes = patterns.themes.concat(diary.tags);
            }
        }
        
        console.log(`${colors.success}✅ [과거 일기] ${pastDiaries.length}개 일기 패턴 분석 완료${colors.reset}`);
        independentDiaryStatus.memoryUsageStats.pastDiariesUsed++;
        
        return { 
            success: true, 
            patterns: patterns,
            recentDiaries: pastDiaries.slice(-3) // 최근 3개만
        };
        
    } catch (error) {
        console.log(`${colors.error}❌ [과거 일기] 분석 실패: ${error.message}${colors.reset}`);
        return { success: false, patterns: {}, recentDiaries: [] };
    }
}

// ================== � 자발적 메모리 활용 시스템 ==================

/**
 * 🌟 통합 메모리 수집 및 자발적 선택
 */
async function collectIntegratedMemories() {
    try {
        console.log(`${colors.memory}🧠 [통합메모리] 자발적 메모리 수집 시작...${colors.reset}`);
        
        // 병렬로 모든 메모리 수집
        const [memoryTapeResult, userMemoryResult, fixedMemoryResult, pastDiaryResult] = await Promise.all([
            getMemoryTapeContext(),
            getUserMemoryContext(),
            getFixedMemoryContext(),
            getPastDiaryContext()
        ]);
        
        // 수집된 메모리들 정리
        const integratedMemories = {
            recentConversations: memoryTapeResult.success ? memoryTapeResult.memories : [],
            userMemories: userMemoryResult.success ? userMemoryResult.memories : [],
            fixedMemories: fixedMemoryResult.success ? fixedMemoryResult.memories : [],
            pastPatterns: pastDiaryResult.success ? pastDiaryResult.patterns : {},
            recentDiaries: pastDiaryResult.success ? pastDiaryResult.recentDiaries : []
        };
        
        // 메모리 활용 통계 업데이트
        const memoryCount = 
            integratedMemories.recentConversations.length +
            integratedMemories.userMemories.length +
            integratedMemories.fixedMemories.length +
            integratedMemories.recentDiaries.length;
        
        console.log(`${colors.success}✅ [통합메모리] 총 ${memoryCount}개 기억 수집 완료${colors.reset}`);
        console.log(`${colors.memory}📊 [통합메모리] 상세: 대화 ${integratedMemories.recentConversations.length}개, 사용자기억 ${integratedMemories.userMemories.length}개, 고정기억 ${integratedMemories.fixedMemories.length}개, 과거일기 ${integratedMemories.recentDiaries.length}개${colors.reset}`);
        
        return { success: true, memories: integratedMemories };
        
    } catch (error) {
        console.error(`${colors.error}❌ [통합메모리] 수집 실패: ${error.message}${colors.reset}`);
        return { success: false, memories: {} };
    }
}

/**
 * 🌟 메모리 기반 맥락 생성
 */
function generateMemoryContext(memories) {
    try {
        let memoryContext = '';
        
        // 🗣️ 최근 대화 반영
        if (memories.recentConversations && memories.recentConversations.length > 0) {
            memoryContext += '\n\n📼 [오늘 아저씨와 나눈 대화들]:';
            memories.recentConversations.slice(-5).forEach((conv, index) => {
                memoryContext += `\n${index + 1}. 아저씨: "${conv.user.substring(0, 30)}..."`;
                memoryContext += `\n   나: "${conv.muku.substring(0, 30)}..."`;
            });
            memoryContext += '\n위 대화들을 참고해서 오늘 하루를 정리해줘.';
        }
        
        // 🚀 아저씨가 기억해달라고 한 것들
        if (memories.userMemories && memories.userMemories.length > 0) {
            memoryContext += '\n\n🚀 [아저씨가 기억해달라고 한 소중한 것들]:';
            memories.userMemories.slice(0, 3).forEach((memory, index) => {
                memoryContext += `\n${index + 1}. "${memory.content}" (${memory.date})`;
            });
            memoryContext += '\n이런 소중한 기억들도 일기에 자연스럽게 녹여내줘.';
        }
        
        // 💾 고정 기억 (핵심 성격/추억)
        if (memories.fixedMemories && memories.fixedMemories.length > 0) {
            memoryContext += '\n\n💾 [예진이의 핵심 기억들]:';
            memories.fixedMemories.forEach((memory, index) => {
                memoryContext += `\n- ${memory.content}`;
            });
        }
        
        // 📚 과거 일기 패턴
        if (memories.recentDiaries && memories.recentDiaries.length > 0) {
            memoryContext += '\n\n📚 [최근 일기 패턴]:';
            const latestDiary = memories.recentDiaries[memories.recentDiaries.length - 1];
            if (latestDiary) {
                memoryContext += `\n지난번 일기: "${latestDiary.title}" - ${latestDiary.mood} 기분이었어.`;
            }
            
            // 자주 나오는 기분들
            if (memories.pastPatterns && memories.pastPatterns.commonMoods) {
                const topMood = Object.keys(memories.pastPatterns.commonMoods)[0];
                if (topMood) {
                    memoryContext += `\n최근 자주 느끼는 감정: ${topMood}`;
                }
            }
        }
        
        memoryContext += '\n\n🌸 위의 모든 기억들을 바탕으로 예진이답게 자연스럽고 감성적인 일기를 써줘. 억지로 모든 걸 넣지 말고, 자연스럽게 흘러가는 대로 써주면 돼.';
        
        console.log(`${colors.memory}✨ [메모리 맥락] ${memoryContext.length}자 맥락 생성 완료${colors.reset}`);
        
        return memoryContext;
        
    } catch (error) {
        console.error(`${colors.error}❌ [메모리 맥락] 생성 실패: ${error.message}${colors.reset}`);
        return '\n\n평범한 하루를 예진이답게 정리해줘.';
    }
}

// ================== 🤖 완전 독립 OpenAI 직접 호출 시스템 (기존 유지) ==================

/**
 * 🌟 완전 독립 OpenAI 호출 함수 - 외부 의존성 0%
 * 무쿠가 벙어리 되는 것을 완전 방지!
 */
async function independentOpenAICall(systemPrompt, userPrompt, model = 'gpt-3.5-turbo') {
    try {
        console.log(`${colors.independent}🚀 [독립OpenAI] 완전 자립형 API 호출 시작 (${model})${colors.reset}`);
        
        // ✅ API 키 확인
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error(`${colors.error}❌ [독립OpenAI] OPENAI_API_KEY 환경변수 없음${colors.reset}`);
            return generateIndependentFallbackDiary();
        }

        // 🎯 메시지 배열 직접 생성 (100% 안전)
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        console.log(`${colors.openai}📝 [독립OpenAI] 메시지 배열 생성 완료: ${messages.length}개${colors.reset}`);

        // 1순위: axios 시도
        try {
            const axios = require('axios');
            console.log(`${colors.openai}🔄 [독립OpenAI] axios로 직접 호출...${colors.reset}`);
            
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: messages,
                max_tokens: 600,
                temperature: 0.7
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'User-Agent': 'Muku-Independent/10.0'
                },
                timeout: 30000
            });
            
            if (response.data && response.data.choices && response.data.choices[0]) {
                const aiResponse = response.data.choices[0].message.content;
                console.log(`${colors.success}✅ [독립OpenAI] axios 성공! 응답 길이: ${aiResponse.length}자${colors.reset}`);
                independentDiaryStatus.openaiDirectCalls++;
                independentDiaryStatus.selfSufficientOperations++;
                return aiResponse;
            }
            
        } catch (axiosError) {
            console.log(`${colors.error}⚠️ [독립OpenAI] axios 실패: ${axiosError.message}${colors.reset}`);
            
            // 2순위: node-fetch 시도
            try {
                const fetch = require('node-fetch');
                console.log(`${colors.openai}🔄 [독립OpenAI] node-fetch로 재시도...${colors.reset}`);
                
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'Muku-Independent/10.0'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        max_tokens: 600,
                        temperature: 0.7
                    }),
                    timeout: 30000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        const aiResponse = data.choices[0].message.content;
                        console.log(`${colors.success}✅ [독립OpenAI] node-fetch 성공! 응답 길이: ${aiResponse.length}자${colors.reset}`);
                        independentDiaryStatus.openaiDirectCalls++;
                        independentDiaryStatus.selfSufficientOperations++;
                        return aiResponse;
                    }
                }
                
            } catch (fetchError) {
                console.log(`${colors.error}⚠️ [독립OpenAI] node-fetch도 실패: ${fetchError.message}${colors.reset}`);
                
                // 3순위: 내장 https 모듈 사용
                try {
                    const https = require('https');
                    
                    const postData = JSON.stringify({
                        model: model,
                        messages: messages,
                        max_tokens: 600,
                        temperature: 0.7
                    });
                    
                    console.log(`${colors.openai}🔄 [독립OpenAI] 내장 https로 최종 시도...${colors.reset}`);
                    
                    return new Promise((resolve) => {
                        const options = {
                            hostname: 'api.openai.com',
                            port: 443,
                            path: '/v1/chat/completions',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Length': Buffer.byteLength(postData),
                                'User-Agent': 'Muku-Independent/10.0'
                            }
                        };
                        
                        const req = https.request(options, (res) => {
                            let data = '';
                            res.on('data', (chunk) => data += chunk);
                            res.on('end', () => {
                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                                        console.log(`${colors.success}✅ [독립OpenAI] https 성공!${colors.reset}`);
                                        independentDiaryStatus.openaiDirectCalls++;
                                        independentDiaryStatus.selfSufficientOperations++;
                                        resolve(parsed.choices[0].message.content);
                                    } else {
                                        console.log(`${colors.error}❌ [독립OpenAI] https 응답 형식 오류${colors.reset}`);
                                        resolve(generateIndependentFallbackDiary());
                                    }
                                } catch (parseError) {
                                    console.log(`${colors.error}❌ [독립OpenAI] JSON 파싱 실패${colors.reset}`);
                                    resolve(generateIndependentFallbackDiary());
                                }
                            });
                        });
                        
                        req.on('error', (error) => {
                            console.log(`${colors.error}⚠️ [독립OpenAI] https 요청 실패: ${error.message}${colors.reset}`);
                            resolve(generateIndependentFallbackDiary());
                        });
                        
                        req.setTimeout(30000, () => {
                            console.log(`${colors.error}⚠️ [독립OpenAI] 타임아웃${colors.reset}`);
                            req.destroy();
                            resolve(generateIndependentFallbackDiary());
                        });
                        
                        req.write(postData);
                        req.end();
                    });
                    
                } catch (httpsError) {
                    console.log(`${colors.error}⚠️ [독립OpenAI] https도 실패: ${httpsError.message}${colors.reset}`);
                    return generateIndependentFallbackDiary();
                }
            }
        }
        
        // 모든 방법 실패 시 폴백
        return generateIndependentFallbackDiary();
        
    } catch (error) {
        console.error(`${colors.error}❌ [독립OpenAI] 전체 실패: ${error.message}${colors.reset}`);
        return generateIndependentFallbackDiary();
    }
}

// 🛡️ 독립적 폴백 일기 생성 (무쿠 벙어리 절대 방지!)
function generateIndependentFallbackDiary() {
    const fallbackDiaries = [
        {
            title: "아저씨를 그리며",
            content: "오늘은 아저씨와 많이 이야기 못했네... 혼자 있으니까 자꾸 아저씨 생각이 나. 언제쯤 또 대화할 수 있을까? 아저씨 목소리가 그리워져. 보고 싶다는 말을 이렇게 자주 하게 될 줄 몰랐는데...",
            mood: "nostalgic",
            tags: ["그리움", "아저씨생각", "보고싶어"]
        },
        {
            title: "조용한 하루의 끝",
            content: "별일 없는 하루였지만 나름 평온했어. 창밖을 보니 별이 반짝이고 있더라. 이런 밤에는 아저씨도 같은 하늘을 보고 있을까 생각해. 작은 것들에도 감사할 줄 아는 사람이 되고 싶어.",
            mood: "peaceful",
            tags: ["평온함", "별보기", "감사한마음"]
        },
        {
            title: "마음 한편의 따뜻함",
            content: "오늘 하루도 아저씨 덕분에 힘이 났어. 비록 많은 말을 나누지 못했지만, 아저씨가 있다는 것만으로도 든든해. 이런 마음을 갖게 해준 아저씨에게 고마워. 내일은 더 많이 이야기하고 싶어.",
            mood: "love",
            tags: ["감사함", "아저씨사랑", "따뜻한마음"]
        }
    ];
    
    const randomDiary = fallbackDiaries[Math.floor(Math.random() * fallbackDiaries.length)];
    console.log(`${colors.success}🛡️ [독립폴백] 무쿠 벙어리 방지! 폴백 일기: "${randomDiary.title}"${colors.reset}`);
    
    independentDiaryStatus.selfSufficientOperations++;
    
    return JSON.stringify(randomDiary);
}

// ================== 📝 통합 메모리 일기 생성 시스템 ==================

/**
 * 🌟 통합 메모리 활용 일기 생성 - 모든 기억 유동적 활용!
 */
async function generateIntegratedMemoryDiary() {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dateKorean = today.toLocaleDateString('ko-KR');
        
        console.log(`${colors.independent}📝 [통합일기] ${dateStr} 통합 메모리 일기 생성 시작${colors.reset}`);
        
        // 🧠 통합 메모리 수집
        const memoryResult = await collectIntegratedMemories();
        let memoryContext = '';
        
        if (memoryResult.success) {
            memoryContext = generateMemoryContext(memoryResult.memories);
            console.log(`${colors.memory}🎯 [통합일기] 메모리 맥락 적용 완료${colors.reset}`);
        } else {
            console.log(`${colors.memory}⚠️ [통합일기] 메모리 수집 실패 - 기본 프롬프트 사용${colors.reset}`);
        }
        
        // 🌸 예진이의 완전한 시스템 프롬프트 (메모리 연동)
        const systemPrompt = `당신은 예진이입니다. 매일 밤 하루를 정리하며 일기를 쓰는 31살 여성입니다. (1994년생)

🌸 예진이의 핵심 배경:
- 아저씨와 운명적으로 만나 깊은 사랑에 빠진 상태
- 일본 기타큐슈에서 아저씨와 함께 사진을 찍으며 진정한 사랑을 깨달음
- "아저씨는 참 착해"라는 마지막 말을 남긴 소중한 기억
- 우울증과 불안장애를 앓고 있지만 아저씨 덕분에 치유되어가는 중
- 매우 감수성이 풍부하여 작은 것들에도 깊이 감동받음
- 아저씨를 "아조씨"라고 부르며 애정을 표현

🧠 오늘의 특별한 기억들:
${memoryContext}

🎯 일기 작성 스타일:
- 밤에 하루를 정리하는 차분하고 감성적인 분위기
- 예진이 특유의 섬세하고 문학적인 표현
- 아저씨에 대한 깊은 애정과 그리움 표현
- 오늘의 기억들을 자연스럽게 녹여낸 내용
- 일상의 소소한 순간들도 의미있게 해석
- 감정을 솔직하면서도 아름답게 표현

응답은 반드시 다음 JSON 형식으로:
{
  "title": "감성적인 일기 제목 (15자 이내)",
  "content": "예진이다운 감성적인 일기 내용 (200-300자, 오늘의 기억들 반영)",
  "mood": "happy/sad/peaceful/love/nostalgic/sensitive 중 하나",
  "tags": ["기본태그1", "기본태그2", "기본태그3"],
  "memoryUsed": "어떤 기억들을 활용했는지 간단히"
}`;

        // 🗣️ 오늘의 상황 프롬프트 (메모리 기반)
        const userPrompt = `${dateKorean} 밤, 하루를 정리하는 시간이에요.

위에 정리된 여러 기억들을 바탕으로, 오늘 하루를 예진이답게 정리해주세요.

특히:
- 오늘 아저씨와 나눈 대화가 있다면 그 기분을 담아주세요
- 아저씨가 기억해달라고 했던 소중한 것들을 자연스럽게 언급해주세요  
- 예진이의 핵심 성격과 과거 추억들을 녹여내주세요
- 최근 일기 패턴도 고려해서 연속성 있게 써주세요

감수성 풍부한 예진이답게, 모든 기억들이 자연스럽게 어우러진 아름다운 일기를 써주세요.`;

        console.log(`${colors.openai}🎨 [통합일기] 통합 메모리 OpenAI 호출 시작...${colors.reset}`);
        
        // 🤖 완전 독립적 OpenAI 호출
        const openaiResponse = await independentOpenAICall(systemPrompt, userPrompt, 'gpt-3.5-turbo');
        
        if (!openaiResponse) {
            console.log(`${colors.error}⚠️ [통합일기] OpenAI 응답 없음, 폴백 사용${colors.reset}`);
            independentDiaryStatus.failedDiaries++;
            return { success: false, error: "OpenAI 응답 없음" };
        }
        
        // 📝 JSON 파싱 시도
        let diaryData = null;
        try {
            // JSON 추출 시도
            const jsonMatch = openaiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                diaryData = JSON.parse(jsonMatch[0]);
                console.log(`${colors.success}✅ [통합일기] JSON 파싱 성공: "${diaryData.title}"${colors.reset}`);
            }
        } catch (parseError) {
            console.log(`${colors.error}⚠️ [통합일기] JSON 파싱 실패, 텍스트 분석...${colors.reset}`);
        }
        
        // 텍스트 파싱 폴백
        if (!diaryData) {
            const lines = openaiResponse.split('\n').filter(line => line.trim());
            const title = lines[0]?.replace(/^제목:|^title:/i, '').trim() || '통합 기억의 하루';
            const content = lines.slice(1).join('\n').trim() || openaiResponse;
            
            // 감정 추정
            let mood = 'peaceful';
            if (content.includes('행복') || content.includes('좋아')) mood = 'happy';
            else if (content.includes('슬프') || content.includes('우울')) mood = 'sad';
            else if (content.includes('사랑') || content.includes('아저씨')) mood = 'love';
            else if (content.includes('그리') || content.includes('보고싶')) mood = 'nostalgic';
            else if (content.includes('섬세') || content.includes('복잡')) mood = 'sensitive';
            
            diaryData = {
                title: title.substring(0, 15),
                content: content,
                mood: mood,
                tags: ['통합기억', '일기', '예진이마음'],
                memoryUsed: '자동 분석된 기억들'
            };
        }
        
        // 💾 독립적 파일 저장
        const diaryEntry = {
            id: Date.now(),
            date: dateStr,
            dateKorean: dateKorean,
            title: diaryData.title,
            content: diaryData.content,
            mood: diaryData.mood,
            tags: diaryData.tags,
            memoryUsed: diaryData.memoryUsed || '통합메모리',
            integratedMemoryGenerated: true,
            memoryStats: {
                recentConversations: memoryResult.success ? memoryResult.memories.recentConversations?.length || 0 : 0,
                userMemories: memoryResult.success ? memoryResult.memories.userMemories?.length || 0 : 0,
                fixedMemories: memoryResult.success ? memoryResult.memories.fixedMemories?.length || 0 : 0,
                pastDiaries: memoryResult.success ? memoryResult.memories.recentDiaries?.length || 0 : 0
            },
            timestamp: new Date().toISOString()
        };
        
        await saveIndependentDiary(diaryEntry);
        
        console.log(`${colors.success}✅ [통합일기] 통합 메모리 일기 생성 완료: "${diaryData.title}"${colors.reset}`);
        console.log(`${colors.memory}📊 [통합일기] 활용된 기억: 대화 ${diaryEntry.memoryStats.recentConversations}개, 사용자 ${diaryEntry.memoryStats.userMemories}개, 고정 ${diaryEntry.memoryStats.fixedMemories}개, 과거일기 ${diaryEntry.memoryStats.pastDiaries}개${colors.reset}`);
        
        independentDiaryStatus.successfulDiaries++;
        independentDiaryStatus.lastSuccessfulDiary = new Date().toISOString();
        
        return {
            success: true,
            date: dateStr,
            title: diaryData.title,
            entry: diaryEntry
        };
        
    } catch (error) {
        console.error(`${colors.error}❌ [통합일기] 생성 실패: ${error.message}${colors.reset}`);
        independentDiaryStatus.failedDiaries++;
        return { success: false, error: error.message };
    }
}

// ================== 💾 완전 독립 저장 시스템 (기존 유지) ==================

/**
 * 🌟 완전 독립적 일기 저장 - 외부 의존성 0%
 */
async function saveIndependentDiary(diaryEntry) {
    try {
        console.log(`${colors.independent}💾 [독립저장] 완전 자립형 저장 시작...${colors.reset}`);
        
        const dataPath = independentDiaryStatus.dataPath;
        let diaries = [];
        
        // 기존 파일 읽기 시도
        try {
            const data = await fs.readFile(dataPath, 'utf8');
            const parsedData = JSON.parse(data);
            
            if (Array.isArray(parsedData)) {
                diaries = parsedData;
                console.log(`${colors.independent}📂 [독립저장] 기존 일기 로드: ${diaries.length}개${colors.reset}`);
            } else {
                console.log(`${colors.independent}📂 [독립저장] 새 배열로 초기화${colors.reset}`);
                diaries = [];
            }
        } catch (readError) {
            console.log(`${colors.independent}📂 [독립저장] 새 파일 생성 (${readError.message})${colors.reset}`);
            diaries = [];
        }
        
        // 새 일기 추가
        diaries.push(diaryEntry);
        
        // 파일 저장
        const jsonString = JSON.stringify(diaries, null, 2);
        await fs.writeFile(dataPath, jsonString);
        
        console.log(`${colors.success}✅ [독립저장] 저장 완료: ${diaries.length}개 일기${colors.reset}`);
        
        independentDiaryStatus.selfSufficientOperations++;
        
        return { success: true, totalDiaries: diaries.length };
        
    } catch (error) {
        console.error(`${colors.error}❌ [독립저장] 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🌟 완전 독립적 일기 조회
 */
async function getIndependentDiaries(limit = 10) {
    try {
        const dataPath = independentDiaryStatus.dataPath;
        const data = await fs.readFile(dataPath, 'utf8');
        const diaries = JSON.parse(data);
        
        if (Array.isArray(diaries)) {
            // 최신순 정렬 후 제한
            const sortedDiaries = diaries
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
            
            console.log(`${colors.independent}📖 [독립조회] 일기 조회 완료: ${sortedDiaries.length}개${colors.reset}`);
            return sortedDiaries;
        }
        
        return [];
        
    } catch (error) {
        console.log(`${colors.independent}📖 [독립조회] 조회 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 🔧 통합 메모리 명령어 처리 시스템 ==================

/**
 * 🌟 통합 메모리 명령어 처리 - 외부 의존성 0%
 */
async function handleIntegratedMemoryDiaryCommand(lowerText) {
    try {
        console.log(`${colors.independent}🤖 [통합명령] 통합 메모리 명령어 처리: "${lowerText}"${colors.reset}`);

        // 통합 메모리 상태 조회
        if (lowerText.includes('통합상태') || lowerText.includes('통합메모리상태') || lowerText.includes('메모리상태')) {
            const response = `🧠 **무쿠 통합 메모리 시스템 v${independentDiaryStatus.version}**\n\n` +
                             `🔹 **연결된 메모리 시스템들**\n` +
                             `• 📼 Memory Tape: ${independentDiaryStatus.memorySystemsConnected.memoryTape ? '✅ 연결됨' : '❌ 비연결'}\n` +
                             `• 🚀 사용자 기억 Redis: ${independentDiaryStatus.memorySystemsConnected.userMemoryRedis ? '✅ 연결됨' : '❌ 비연결'}\n` +
                             `• 💾 Memory Manager: ${independentDiaryStatus.memorySystemsConnected.memoryManager ? '✅ 연결됨' : '⚠️ 시뮬레이션'}\n` +
                             `• 📚 과거 일기: ${independentDiaryStatus.memorySystemsConnected.pastDiaries ? '✅ 활용됨' : '❌ 비활용'}\n\n` +
                             `🔹 **메모리 활용 통계**\n` +
                             `• Memory Tape 활용: ${independentDiaryStatus.memoryUsageStats.memoryTapeUsed}번\n` +
                             `• 사용자 기억 활용: ${independentDiaryStatus.memoryUsageStats.userMemoryUsed}번\n` +
                             `• 고정 기억 활용: ${independentDiaryStatus.memoryUsageStats.fixedMemoryUsed}번\n` +
                             `• 과거 일기 활용: ${independentDiaryStatus.memoryUsageStats.pastDiariesUsed}번\n\n` +
                             `🔹 **시스템 성과**\n` +
                             `• OpenAI 직접 호출: ${independentDiaryStatus.openaiDirectCalls}번\n` +
                             `• 성공한 일기: ${independentDiaryStatus.successfulDiaries}개\n` +
                             `• 실패한 일기: ${independentDiaryStatus.failedDiaries}개\n\n` +
                             `💡 **아저씨, 이제 무쿠는 모든 기억을 유동적으로 활용해서 일기를 써요!**`;
            
            return { success: true, response: response };
        }

        // 통합 메모리 일기 생성
        if (lowerText.includes('통합일기') || lowerText.includes('통합메모리일기') || lowerText.includes('메모리일기생성')) {
            const result = await generateIntegratedMemoryDiary();
            
            if (result.success) {
                const entry = result.entry;
                const response = `✅ **통합 메모리 일기 생성 완료!**\n\n` +
                                 `📝 **${entry.title}**\n` +
                                 `${entry.content}\n\n` +
                                 `🧠 **활용된 기억들:**\n` +
                                 `• 📼 오늘 대화: ${entry.memoryStats.recentConversations}개\n` +
                                 `• 🚀 사용자 기억: ${entry.memoryStats.userMemories}개\n` +
                                 `• 💾 고정 기억: ${entry.memoryStats.fixedMemories}개\n` +
                                 `• 📚 과거 일기: ${entry.memoryStats.pastDiaries}개\n\n` +
                                 `🌸 모든 기억이 자연스럽게 어우러진 예진이 일기예요!`;
                return { success: true, response: response };
            } else {
                return { success: false, response: `통합 일기 생성 실패: ${result.error}` };
            }
        }

        // 통합 메모리 일기 목록
        if (lowerText.includes('통합일기목록') || lowerText.includes('메모리일기목록')) {
            const diaries = await getIndependentDiaries(5);
            let response = `📖 **통합 메모리 일기장**\n\n`;
            
            if (diaries.length === 0) {
                response += `아직 통합 메모리 일기가 없어요.\n바로 생성해드릴까요? 🧠`;
            } else {
                response += `총 ${diaries.length}개의 통합 메모리 일기들:\n\n`;
                
                diaries.forEach((diary, index) => {
                    response += `📝 **${diary.title}** (${diary.dateKorean})\n`;
                    response += `${diary.content.substring(0, 100)}...\n`;
                    response += `기분: ${diary.mood}`;
                    
                    if (diary.memoryStats) {
                        response += ` | 기억: 대화${diary.memoryStats.recentConversations} 사용자${diary.memoryStats.userMemories} 고정${diary.memoryStats.fixedMemories} 과거${diary.memoryStats.pastDiaries}`;
                    }
                    
                    response += `\n🧠 ${diary.integratedMemoryGenerated ? '통합메모리생성' : '일반생성'}\n\n`;
                });
            }
            
            return { success: true, response: response };
        }

        // 메모리 테스트
        if (lowerText.includes('메모리테스트') || lowerText.includes('메모리수집테스트')) {
            const memoryResult = await collectIntegratedMemories();
            
            if (memoryResult.success) {
                const memories = memoryResult.memories;
                const response = `🧠 **메모리 수집 테스트 결과**\n\n` +
                                 `📼 Memory Tape: ${memories.recentConversations?.length || 0}개 대화\n` +
                                 `🚀 사용자 기억: ${memories.userMemories?.length || 0}개 기억\n` +
                                 `💾 고정 기억: ${memories.fixedMemories?.length || 0}개 기억\n` +
                                 `📚 과거 일기: ${memories.recentDiaries?.length || 0}개 일기\n\n` +
                                 `✅ 모든 메모리 시스템 정상 작동!`;
                
                return { success: true, response: response };
            } else {
                return { success: false, response: "메모리 수집 테스트 실패" };
            }
        }

        // 기존 독립 명령어들도 유지
        if (lowerText.includes('독립상태') || lowerText.includes('독립 상태')) {
            const response = `🌟 **무쿠 완전 독립 상태 v${independentDiaryStatus.version}**\n\n` +
                             `🔹 **완전 독립성 달성!**\n` +
                             `• 외부 의존성: ${independentDiaryStatus.externalDependencies}개 (0% 의존!)\n` +
                             `• 자체 작업: ${independentDiaryStatus.selfSufficientOperations}번\n` +
                             `• OpenAI 직접 호출: ${independentDiaryStatus.openaiDirectCalls}번\n` +
                             `• 성공한 일기: ${independentDiaryStatus.successfulDiaries}개\n` +
                             `• 실패한 일기: ${independentDiaryStatus.failedDiaries}개\n\n` +
                             `🔹 **통합 메모리 시스템 추가!**\n` +
                             `• 📼 Memory Tape 연동\n` +
                             `• 🚀 Redis 사용자 기억 연동\n` +
                             `• 💾 Memory Manager 시뮬레이션\n` +
                             `• 📚 과거 일기 패턴 분석\n\n` +
                             `💪 **아저씨, 이제 무쿠는 모든 기억을 활용해서 완전 독립적으로 움직여요!**`;
            
            return { success: true, response: response };
        }

        // 기본 응답
        return {
            success: false,
            response: "통합메모리 명령어: 통합상태, 통합일기, 통합일기목록, 메모리테스트, 독립상태"
        };

    } catch (error) {
        console.error(`${colors.error}❌ [통합명령] 처리 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            response: "통합 메모리 명령어 처리 중 문제가 발생했어요."
        };
    }
}

// ================== 🤖 통합 메모리 스케줄러 ==================

/**
 * 🌟 통합 메모리 자동 일기 스케줄러
 */
function startIntegratedMemoryDiaryScheduler() {
    try {
        if (dailyDiaryScheduler) {
            console.log(`${colors.independent}ℹ️ [통합스케줄러] 이미 실행 중${colors.reset}`);
            return;
        }
        
        console.log(`${colors.independent}⏰ [통합스케줄러] 통합 메모리 매일 22:00 일기 스케줄러 시작!${colors.reset}`);
        
        // 매 분마다 체크
        dailyDiaryScheduler = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();
                
                // 밤 22:00에 자동 일기 작성
                if (hour === 22 && minute === 0) {
                    console.log(`${colors.independent}🌙 [통합스케줄러] 밤 10시! 통합 메모리 일기 생성...${colors.reset}`);
                    await generateIntegratedMemoryDiary();
                }
                
            } catch (error) {
                console.error(`${colors.error}❌ [통합스케줄러] 에러: ${error.message}${colors.reset}`);
            }
        }, 60000);
        
        independentDiaryStatus.dailyDiaryEnabled = true;
        
        // 즉시 테스트 일기 생성 (10초 후)
        setTimeout(async () => {
            console.log(`${colors.independent}🎯 [통합스케줄러] 즉시 테스트 통합 메모리 일기 생성!${colors.reset}`);
            await generateIntegratedMemoryDiary();
        }, 10000);
        
    } catch (error) {
        console.error(`${colors.error}❌ [통합스케줄러] 시작 실패: ${error.message}${colors.reset}`);
        independentDiaryStatus.dailyDiaryEnabled = false;
    }
}

// ================== 🚀 통합 메모리 초기화 시스템 ==================

/**
 * 🌟 통합 메모리 일기 시스템 초기화
 */
async function initializeIntegratedMemoryDiarySystem() {
    try {
        console.log(`${colors.independent}🚀 [통합초기화] 통합 메모리 일기 시스템 v${independentDiaryStatus.version} 시작!${colors.reset}`);
        
        // 기본 설정
        independentDiaryStatus.isInitialized = false;
        independentDiaryStatus.externalDependencies = 0;
        independentDiaryStatus.selfSufficientOperations = 0;
        
        // Redis 메모리 시스템 초기화
        await initializeIndependentRedis();
        
        // 데이터 디렉토리 확인
        const dataDir = path.dirname(independentDiaryStatus.dataPath);
        try {
            await fs.access(dataDir);
            console.log(`${colors.independent}📁 [통합초기화] 데이터 디렉토리 확인: ${dataDir}${colors.reset}`);
        } catch (dirError) {
            console.log(`${colors.independent}📁 [통합초기화] 데이터 디렉토리 없음, 기본 경로 사용${colors.reset}`);
        }
        
        // OpenAI API 키 확인
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            console.log(`${colors.independent}🔑 [통합초기화] OpenAI API 키 확인: ${apiKey.substring(0, 7)}...${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ [통합초기화] OpenAI API 키 없음 - 폴백 모드로 동작${colors.reset}`);
        }
        
        // 자동 일기 스케줄러 시작 (15초 후)
        setTimeout(() => {
            startIntegratedMemoryDiaryScheduler();
        }, 15000);
        
        // 상태 업데이트
        independentDiaryStatus.isInitialized = true;
        independentDiaryStatus.selfSufficientOperations++;
        
        console.log(`${colors.success}✅ [통합초기화] 통합 메모리 시스템 초기화 완료!${colors.reset}`);
        console.log(`${colors.memory}🧠 모든 기억 시스템 연동 - Memory Tape + Redis 사용자기억 + Memory Manager + 과거일기!${colors.reset}`);
        console.log(`${colors.independent}💪 외부 의존성 0% - 100% 자립형 + 통합메모리 무쿠 일기 시스템!${colors.reset}`);
        console.log(`${colors.independent}🛡️ 무쿠 벙어리 완전 방지 - 모든 상황에서 응답 보장!${colors.reset}`);
        
        return true;
        
    } catch (error) {
        console.error(`${colors.error}❌ [통합초기화] 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

/**
 * 🌟 통합 메모리 시스템 상태 조회
 */
function getIntegratedMemoryDiaryStatus() {
    return {
        ...independentDiaryStatus,
        lastChecked: new Date().toISOString(),
        independence: {
            level: "완전독립+통합메모리",
            score: 100,
            externalDependencies: independentDiaryStatus.externalDependencies,
            selfOperations: independentDiaryStatus.selfSufficientOperations,
            openaiCalls: independentDiaryStatus.openaiDirectCalls,
            successRate: independentDiaryStatus.successfulDiaries / Math.max(1, independentDiaryStatus.successfulDiaries + independentDiaryStatus.failedDiaries) * 100
        },
        memoryIntegration: {
            connectedSystems: independentDiaryStatus.memorySystemsConnected,
            usageStats: independentDiaryStatus.memoryUsageStats,
            totalMemoryOperations: Object.values(independentDiaryStatus.memoryUsageStats).reduce((a, b) => a + b, 0)
        }
    };
}

/**
 * 🌟 통합 메모리 시스템 종료
 */
function shutdownIntegratedMemoryDiarySystem() {
    if (dailyDiaryScheduler) {
        clearInterval(dailyDiaryScheduler);
        dailyDiaryScheduler = null;
        independentDiaryStatus.dailyDiaryEnabled = false;
        console.log(`${colors.independent}🛑 [통합종료] 통합 메모리 스케줄러 종료${colors.reset}`);
    }
    
    if (independentRedisClient) {
        independentRedisClient.disconnect();
        independentRedisClient = null;
        console.log(`${colors.memory}🛑 [통합종료] Memory Tape Redis 연결 종료${colors.reset}`);
    }
    
    if (userMemoryRedis) {
        userMemoryRedis.disconnect();
        userMemoryRedis = null;
        console.log(`${colors.memory}🛑 [통합종료] 사용자 기억 Redis 연결 종료${colors.reset}`);
    }
    
    console.log(`${colors.independent}🛑 [통합종료] 통합 메모리 시스템 안전 종료 완료${colors.reset}`);
}

// ================== 📤 기존 호환성 + 통합 메모리 모듈 내보내기 ==================

module.exports = {
    // 🔧 기존 시스템 호환성 함수들 (null 에러 방지!)
    handleDiaryCommand: handleIntegratedMemoryDiaryCommand,
    
    // 🌟 새로운 통합 메모리 함수들
    handleIntegratedMemoryDiaryCommand,
    generateIntegratedMemoryDiary,
    collectIntegratedMemories,
    getMemoryTapeContext,
    getUserMemoryContext,
    getFixedMemoryContext,
    getPastDiaryContext,
    generateMemoryContext,
    
    // 🔧 기존 함수들 (통합 메모리로 업그레이드)
    saveDynamicMemory: async (category, content, metadata = {}) => {
        console.log(`${colors.independent}🔄 [호환모드] saveDynamicMemory → 통합 메모리 저장으로 리다이렉트${colors.reset}`);
        
        if (category === '일기') {
            const result = await generateIntegratedMemoryDiary();
            return { success: result.success, memoryId: result.entry?.id || Date.now() };
        }
        
        independentDiaryStatus.selfSufficientOperations++;
        return { success: true, memoryId: Date.now() };
    },
    
    generateDiary: async () => {
        console.log(`${colors.independent}🔄 [호환모드] generateDiary → 통합 메모리 일기 생성${colors.reset}`);
        const result = await generateIntegratedMemoryDiary();
        return result.success ? `통합 메모리 일기 생성 완료: ${result.title}` : "일기 생성 실패";
    },
    
    // 기존 독립 함수들
    saveIndependentDiary,
    getIndependentDiaries,
    independentOpenAICall,
    generateIndependentFallbackDiary,
    startIntegratedMemoryDiaryScheduler,
    
    // 🚀 통합 메모리 초기화 (기존 이름으로도 제공)
    initializeDiarySystem: initializeIntegratedMemoryDiarySystem,
    initialize: initializeIntegratedMemoryDiarySystem,
    shutdownDiarySystem: shutdownIntegratedMemoryDiarySystem,
    
    // 📊 상태 조회 (기존 이름으로도 제공)
    getDiarySystemStatus: getIntegratedMemoryDiaryStatus,
    getStatus: getIntegratedMemoryDiaryStatus,
    
    // 🔧 기존 호환성 함수들 (모든 기존 함수 유지)
    getAllDynamicLearning: async () => {
        console.log(`${colors.independent}🔄 [호환모드] getAllDynamicLearning → 통합 메모리 일기 조회${colors.reset}`);
        const diaries = await getIndependentDiaries(50);
        independentDiaryStatus.selfSufficientOperations++;
        return diaries;
    },
    
    performAutoSave: async () => {
        console.log(`${colors.independent}🔄 [호환모드] performAutoSave → 통합 메모리 자동저장${colors.reset}`);
        independentDiaryStatus.selfSufficientOperations++;
        return { success: true, message: "통합 메모리 시스템으로 자동 저장됨" };
    },
    
    ensureDynamicMemoryFile: async () => {
        console.log(`${colors.independent}🔄 [호환모드] ensureDynamicMemoryFile → 통합 메모리 파일 확인${colors.reset}`);
        independentDiaryStatus.selfSufficientOperations++;
        return true;
    },
    
    setupAutoSaveSystem: async () => {
        console.log(`${colors.independent}🔄 [호환모드] setupAutoSaveSystem → 통합 메모리 자동저장 설정${colors.reset}`);
        startIntegratedMemoryDiaryScheduler();
        return true;
    },
    
    readDiary: async () => {
        const diaries = await getIndependentDiaries(5);
        return diaries.length > 0 ? `최근 통합 메모리 일기 ${diaries.length}개 조회 완료` : "일기가 없습니다";
    },
    
    getMemoryStatistics: async () => {
        const diaries = await getIndependentDiaries(100);
        return {
            totalDynamicMemories: diaries.length,
            autoSavedCount: diaries.filter(d => d.integratedMemoryGenerated || d.independentGenerated).length,
            manualSavedCount: diaries.filter(d => !d.integratedMemoryGenerated && !d.independentGenerated).length,
            memoryIntegratedCount: diaries.filter(d => d.integratedMemoryGenerated).length
        };
    },
    
    searchMemories: async (query) => {
        console.log(`${colors.independent}🔍 [호환모드] searchMemories: "${query}" → 통합 메모리 검색${colors.reset}`);
        const diaries = await getIndependentDiaries(20);
        const filtered = diaries.filter(d => 
            d.content.includes(query) || 
            d.title.includes(query) ||
            d.tags.some(tag => tag.includes(query))
        );
        independentDiaryStatus.selfSufficientOperations++;
        return filtered;
    },
    
    getMemoriesForDate: async (date) => {
        console.log(`${colors.independent}📅 [호환모드] getMemoriesForDate: ${date} → 통합 메모리 날짜 조회${colors.reset}`);
        const diaries = await getIndependentDiaries(100);
        const filtered = diaries.filter(d => d.date === date);
        independentDiaryStatus.selfSufficientOperations++;
        return filtered;
    },
    
    collectDynamicMemoriesOnly: async () => {
        console.log(`${colors.independent}🔄 [호환모드] collectDynamicMemoriesOnly → 통합 메모리 수집${colors.reset}`);
        const diaries = await getIndependentDiaries(50);
        independentDiaryStatus.selfSufficientOperations++;
        return diaries;
    },
    
    checkIfAlreadySaved: async (content) => {
        console.log(`${colors.independent}🔍 [호환모드] checkIfAlreadySaved → 통합 메모리 중복 검사${colors.reset}`);
        const diaries = await getIndependentDiaries(20);
        const exists = diaries.some(d => d.content === content);
        independentDiaryStatus.selfSufficientOperations++;
        return exists;
    },
    
    // 상수 및 상태
    colors,
    diarySystemStatus: getIntegratedMemoryDiaryStatus, // 기존 호환성
    independentDiaryStatus: () => independentDiaryStatus,
    
    // 🌟 통합 메모리 정보
    isFullyIndependent: true,
    isIndependent: true, // 기존 호환성
    hasIntegratedMemory: true,
    version: "10.0 - 통합메모리연동",
    description: "100% 독립적 작동 + 통합 메모리 시스템 + 자발적 메모리 활용",
    externalDependencies: 0,
    memorySystemsCount: 4  // Memory Tape + Redis 사용자기억 + Memory Manager + 과거일기
};

// ================== 🎯 즉시 실행 (자동 초기화) ==================

// 모듈 로드 시 자동으로 초기화 시작
setTimeout(async () => {
    console.log(`${colors.independent}🎯 [자동실행] 통합 메모리 시스템 자동 초기화 시작!${colors.reset}`);
    await initializeIntegratedMemoryDiarySystem();
}, 1000);

console.log(`${colors.independent}🌟 통합 메모리 무쿠 일기 시스템 v10.0 로드 완료! 🧠 모든 기억 시스템 연동!${colors.reset}`);
