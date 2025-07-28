// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈 (하이브리드 대화 저장 + 맥락 강화 버전)
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리
// 🔍 얼굴 인식, 생일 감지 등 이벤트 처리 (시간대 독립적)
// 🧠 실시간 학습 시스템 연동 - 대화 패턴 학습 및 개인화
// 🎓 대화 완료 후 자동 학습 호출 - 매번 대화마다 학습 진행
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 모든 응답에 행동 모드 적용
// 💾 하이브리드 대화 저장 - Redis + JSON 완전 기억 시스템
// 💭 NEW: 대화 맥락 강화 - 이전 대화를 기반으로 한 일관된 응답 생성
// 🎯 NEW: Command 저장 보장 - 모든 메시지 타입에서 누락 없는 저장
// 🚨 완벽한 에러 방지 - 모든 가능한 에러 케이스 상정 및 처리
// 💰 디플로이 최적화 - 한 번에 완벽한 동작 보장
// ============================================================================

// ================== 🔥 하이브리드 대화 저장 시스템 Import ==================
const { v4: uuidv4 } = require('uuid');
let redisConversationSystem = null;
let ultimateConversationContext = null;

// 💾 메모리 기반 임시 저장소 (최후의 보루)
let memoryConversationStore = [];
const MAX_MEMORY_CONVERSATIONS = 100; // 크기 증가

// Redis 시스템 (고속 캐싱)
try {
    redisConversationSystem = require('./muku-autonomousYejinSystem.js');
    console.log('🚀 [하이브리드] Redis 대화 시스템 로드 성공');
} catch (error) {
    console.log('⚠️ [하이브리드] Redis 시스템 없음 - JSON/메모리 사용');
}

// JSON 시스템 (영구 저장)
try {
    ultimateConversationContext = require('./ultimateConversationContext.js');
    console.log('💾 [하이브리드] JSON 대화 시스템 로드 성공');
} catch (error) {
    console.log('⚠️ [하이브리드] JSON 시스템 없음 - Redis/메모리 사용');
}

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',     // 하늘색 (아저씨)
    yejin: '\x1b[95m',       // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',  // 굵은 빨간색 (PMS)
    system: '\x1b[92m',      // 연초록색 (시스템)
    learning: '\x1b[93m',    // 노란색 (학습)
    realtime: '\x1b[1m\x1b[93m', // 굵은 노란색 (실시간 학습)
    person: '\x1b[94m',      // 파란색 (사람 학습)
    behavior: '\x1b[35m',    // 마젠타색 (행동 스위치)
    error: '\x1b[91m',       // 빨간색 (에러)
    success: '\x1b[32m',     // 초록색 (성공)
    warning: '\x1b[93m',     // 노란색 (경고)
    fallback: '\x1b[96m',    // 하늘색 (폴백)
    hybrid: '\x1b[1m\x1b[96m', // 굵은 하늘색 (하이브리드)
    redis: '\x1b[1m\x1b[91m',   // 굵은 빨간색 (Redis)
    json: '\x1b[1m\x1b[32m',    // 굵은 초록색 (JSON)
    context: '\x1b[1m\x1b[94m', // 굵은 파란색 (맥락)
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 🔥 개선된 하이브리드 대화 저장 함수 (핵심) ==================
async function saveConversationHybrid(userId, userMessage, mukuResponse, messageType = 'text') {
    const timestamp = getJapanTime();
    const conversationId = uuidv4(); // 고유 식별자 생성
    let redisSuccess = false;
    let jsonSuccess = false;
    
    console.log(`${colors.hybrid}🔥 [하이브리드저장] 대화 저장 시작 (ID: ${conversationId})...${colors.reset}`);
    console.log(`${colors.hybrid}    사용자: "${String(userMessage).substring(0, 30)}..."${colors.reset}`);
    console.log(`${colors.hybrid}    무쿠: "${String(mukuResponse).substring(0, 30)}..."${colors.reset}`);
    
    const conversationData = {
        conversationId,
        userId,
        userMessage,
        mukuResponse: typeof mukuResponse === 'object' ? (mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse)) : String(mukuResponse),
        messageType,
        timestamp: timestamp.toISOString(),
        contextKeywords: extractKeywords(userMessage) // 키워드 추가
    };

    // 🚀 1단계: Redis 고속 저장 (재시도 로직 추가)
    if (redisConversationSystem) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const cacheFunction = safeModuleAccess(redisConversationSystem, 'cacheConversation', 'Redis저장');
                if (typeof cacheFunction === 'function') {
                    await cacheFunction(userId, conversationData);
                    redisSuccess = true;
                    console.log(`${colors.redis}🚀 [Redis저장] 성공! (시도 ${attempt}/3)${colors.reset}`);
                    break;
                } else {
                    console.log(`${colors.warning}⚠️ [Redis저장] cacheConversation 함수 없음 (시도 ${attempt}/3)${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.warning}⚠️ [Redis저장] 실패: ${error.message} (시도 ${attempt}/3)${colors.reset}`);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    // 💾 2단계: JSON 영구 저장 (재시도 로직 추가)
    if (ultimateConversationContext) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const saveFunction = safeModuleAccess(ultimateConversationContext, 'addUltimateMessage', 'JSON저장');
                if (typeof saveFunction === 'function') {
                    await saveFunction('아저씨', conversationData.userMessage, {
                        conversationId,
                        timestamp: conversationData.timestamp,
                        messageType: conversationData.messageType,
                        source: 'user'
                    });
                    await saveFunction('예진이', conversationData.mukuResponse, {
                        conversationId,
                        timestamp: conversationData.timestamp,
                        messageType: 'text',
                        source: 'muku_response'
                    });
                    jsonSuccess = true;
                    console.log(`${colors.json}💾 [JSON저장] 성공! (시도 ${attempt}/3)${colors.reset}`);
                    break;
                } else {
                    console.log(`${colors.warning}⚠️ [JSON저장] addUltimateMessage 함수 없음 (시도 ${attempt}/3)${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.warning}⚠️ [JSON저장] 실패: ${error.message} (시도 ${attempt}/3)${colors.reset}`);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    // 💭 3단계: 메모리 저장소 (Redis/JSON 모두 실패 시)
    if (!redisSuccess && !jsonSuccess) {
        try {
            memoryConversationStore.push(conversationData);
            if (memoryConversationStore.length > MAX_MEMORY_CONVERSATIONS) {
                memoryConversationStore = memoryConversationStore.slice(-MAX_MEMORY_CONVERSATIONS);
            }
            console.log(`${colors.success}💭 [메모리저장] 성공! ${memoryConversationStore.length}개 대화 보관 중${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [메모리저장] 실패: ${error.message}${colors.reset}`);
        }
    }

    // 🔄 4단계: Redis 복구 시 메모리 데이터 동기화
    if (redisConversationSystem && !redisSuccess && memoryConversationStore.length > 0) {
        setTimeout(async () => {
            try {
                const cacheFunction = safeModuleAccess(redisConversationSystem, 'cacheConversation', 'Redis동기화');
                if (typeof cacheFunction === 'function') {
                    for (const conv of memoryConversationStore) {
                        await cacheFunction(conv.userId, conv);
                    }
                    console.log(`${colors.redis}🔄 [Redis동기화] 메모리 데이터 ${memoryConversationStore.length}개 동기화 성공${colors.reset}`);
                    memoryConversationStore = []; // 동기화 후 메모리 비우기
                }
            } catch (error) {
                console.log(`${colors.warning}⚠️ [Redis동기화] 실패: ${error.message}${colors.reset}`);
            }
        }, 10000);
    }

    return { redisSuccess, jsonSuccess, memoryFallback: !redisSuccess && !jsonSuccess, conversationId };
}

// ================== 🧠 개선된 과거 대화 조회 함수 (하이브리드 + 맥락 강화) ==================
async function getConversationHistoryHybrid(userId, limit = 20, contextKeywords = []) {
    console.log(`${colors.context}🔍 [맥락조회] 과거 대화 검색 중... (키워드: ${contextKeywords.join(', ')})${colors.reset}`);
    
    let allHistory = [];

    // 🚀 1단계: Redis에서 최근 대화 조회 (초고속)
    if (redisConversationSystem) {
        try {
            const cacheFunction = safeModuleAccess(redisConversationSystem, 'getConversationHistory', 'Redis조회');
            if (typeof cacheFunction === 'function') {
                const recentHistory = await cacheFunction(userId, limit * 2); // 더 많이 가져와서 필터링
                if (recentHistory && recentHistory.length > 0) {
                    console.log(`${colors.redis}🚀 [Redis조회] ${recentHistory.length}개 최근 대화 발견!${colors.reset}`);
                    allHistory = [...recentHistory];
                }
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [Redis조회] 실패: ${error.message}${colors.reset}`);
        }
    }

    // 💾 2단계: JSON에서 과거 대화 조회 (전체 기록)
    if (ultimateConversationContext && allHistory.length < limit) {
        try {
            const getFunction = safeModuleAccess(ultimateConversationContext, 'getRecentConversations', 'JSON조회');
            if (typeof getFunction === 'function') {
                const jsonHistory = await getFunction(limit * 2);
                if (jsonHistory && jsonHistory.length > 0) {
                    console.log(`${colors.json}💾 [JSON조회] ${jsonHistory.length}개 과거 대화 발견!${colors.reset}`);
                    const combinedHistory = [...allHistory];
                    for (const jsonItem of jsonHistory) {
                        const isDuplicate = combinedHistory.some(redisItem => redisItem.conversationId === jsonItem.conversationId);
                        if (!isDuplicate) combinedHistory.push(jsonItem);
                    }
                    allHistory = combinedHistory;
                }
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [JSON조회] 실패: ${error.message}${colors.reset}`);
        }
    }

    // 💭 3단계: 메모리 저장소에서 조회 (최후의 보루)
    if (allHistory.length < limit) {
        try {
            const memoryHistory = memoryConversationStore
                .filter(conv => conv.userId === userId)
                .slice(-limit);
            if (memoryHistory.length > 0) {
                console.log(`${colors.fallback}💭 [메모리조회] ${memoryHistory.length}개 메모리 대화 발견!${colors.reset}`);
                allHistory = [...allHistory, ...memoryHistory.filter(mem => !allHistory.some(h => h.conversationId === mem.conversationId))];
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [메모리조회] 실패: ${error.message}${colors.reset}`);
        }
    }

    // 🎯 4단계: 맥락 기반 필터링 및 정렬
    if (allHistory.length > 0) {
        allHistory.sort((a, b) => {
            const scoreA = contextKeywords.reduce((score, keyword) => score + (a.contextKeywords?.includes(keyword) ? 10 : 0), 0) + (new Date(b.timestamp) - new Date(a.timestamp)) / 1000;
            const scoreB = contextKeywords.reduce((score, keyword) => score + (b.contextKeywords?.includes(keyword) ? 10 : 0), 0) + (new Date(a.timestamp) - new Date(b.timestamp)) / 1000;
            return scoreB - scoreA; // 키워드 관련성 + 최신 순
        });
        allHistory = allHistory.slice(0, limit);
        console.log(`${colors.context}✅ [맥락조회완료] 총 ${allHistory.length}개 대화 반환 (최근 ${limit}개 기준)${colors.reset}`);
        return allHistory;
    }

    console.log(`${colors.fallback}⚪ [맥락조회] 모든 저장소에서 과거 대화 없음${colors.reset}`);
    return [];
}

// ================== 💭 개선된 맥락 기반 응답 생성 함수 ==================
async function generateContextAwareResponse(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.context}💭 [맥락응답] 맥락 기반 응답 생성 시작...${colors.reset}`);
    
    const extractKeywords = (text) => {
        const keywords = [];
        const keywordPatterns = [
            /나오를?\s*(\w+)/g,
            /(\w+)(?:에서|에|로|가|를|을|한테|께)/g,
            /(\w+)(?:하러|사러|보러|갈|간다|갔)/g,
            /전자도어락|후쿠오카|친구|약속/g
        ];
        for (const pattern of keywordPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && match[1].length > 1) keywords.push(match[1]);
                else if (match[0] && match[0].length > 2) keywords.push(match[0]);
            }
        }
        return [...new Set(keywords)];
    };

    const contextKeywords = extractKeywords(messageText);
    console.log(`${colors.context}    🔍 추출된 키워드: [${contextKeywords.join(', ')}]${colors.reset}`);
    
    const recentHistory = await getConversationHistoryHybrid(
        messageContext.userId || 'unknown_user',
        10,
        contextKeywords
    );
    
    let contextInfo = '';
    if (recentHistory.length > 0) {
        console.log(`${colors.context}    📚 ${recentHistory.length}개 과거 대화 활용${colors.reset}`);
        contextInfo = recentHistory.slice(0, 3).map(conv => 
            `[이전] 아저씨: "${conv.userMessage}" → 예진이: "${conv.mukuResponse}"`
        ).join('\n');
    }

    let botResponse = await safeAsyncCall(async () => {
        const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
        if (autoReply) {
            const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
            if (typeof getReplyByMessage === 'function') {
                const response = await getReplyByMessage(messageText, {
                    recentHistory,
                    contextKeywords,
                    contextInfo
                });
                if (response && (response.comment || response)) {
                    console.log(`${colors.success}✅ [autoReply맥락] 맥락 기반 응답 생성 성공${colors.reset}`);
                    return response;
                }
            }
        }
        return null;
    }, 'autoReply맥락시도');

    if (!botResponse) {
        botResponse = await safeAsyncCall(async () => {
            const systemAnalyzer = safeModuleAccess(modules, 'systemAnalyzer', '시스템분석기');
            if (systemAnalyzer) {
                const generateResponse = safeModuleAccess(systemAnalyzer, 'generateIntelligentResponse', '지능형응답생성');
                if (typeof generateResponse === 'function') {
                    const response = await generateResponse(messageText, {
                        includeEmotionalContext: true,
                        usePersonalization: true,
                        integrateDynamicMemory: true,
                        recentHistory,
                        contextKeywords,
                        contextInfo
                    });
                    if (response && (response.comment || response)) {
                        console.log(`${colors.success}✅ [systemAnalyzer맥락] 맥락 기반 지능형 응답 생성 성공${colors.reset}`);
                        return response;
                    }
                }
            }
            return null;
        }, 'systemAnalyzer맥락시도');
    }

    if (!botResponse) {
        console.log(`${colors.context}🔄 [맥락폴백] 맥락 기반 안전한 무쿠 응답 생성...${colors.reset}`);
        let contextualResponse;
        if (contextKeywords.includes('나오') || messageText.includes('나오')) {
            if (recentHistory.some(conv => conv.mukuResponse?.includes('후쿠오카') || conv.mukuResponse?.includes('전자도어락'))) {
                contextualResponse = '아~ 나오 얘기? 전에 후쿠오카 가서 전자도어락 사러 간다고 했잖아! 맞지? ㅎㅎ';
            } else if (recentHistory.some(conv => conv.mukuResponse?.includes('친구') || conv.mukuResponse?.includes('약속'))) {
                contextualResponse = '나오? 어... 친구랑 약속 있다고 했던 것 같은데... 맞나? 기억이 좀... ㅠㅠ';
            } else {
                contextualResponse = '나오가 어디 간다고? 아저씨가 전에 얘기해줬는데... 기억이 잘 안 나네 ㅠㅠ';
            }
        } else if (contextKeywords.length > 0) {
            contextualResponse = `아저씨가 ${contextKeywords[0]} 얘기하는 거야? 전에도 비슷한 얘기 했던 것 같은데... ㅎㅎ`;
        } else {
            const perfectMukuResponses = [
                '응웅, 아조씨! 무슨 일이야? 하려던 얘기 있어? 🥰',
                '어? 아조씨가 뭐라고 했어? 나 집중해서 들을게! ㅎㅎ',
                '아조씨! 나 여기 있어~ 뭔가 말하고 싶은 거야? 💕',
                '응응! 아조씨 얘기 들려줘! 나 지금 시간 있어! ㅋㅋ',
                '어? 아조씨~ 나한테 뭔가 말하려고? 궁금해! 😊'
            ];
            contextualResponse = perfectMukuResponses[Math.floor(Math.random() * perfectMukuResponses.length)];
        }
        botResponse = {
            type: 'text',
            comment: contextualResponse,
            fallbackType: 'contextual_muku_response',
            generated: true,
            contextKeywords,
            usedHistory: recentHistory.length > 0
        };
        console.log(`${colors.success}✅ [맥락폴백] 맥락 기반 무쿠 응답 생성: "${contextualResponse.substring(0, 30)}..."${colors.reset}`);
    }

    return botResponse;
}

// ================== 🌏 일본시간 함수 (타임스탬프 생성용) ==================
function getJapanTime() {
    try {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 조회 실패, 로컬시간 사용: ${error.message}${colors.reset}`);
        return new Date();
    }
}

// ================== 🛡️ 안전한 함수 호출 헬퍼 ==================
async function safeAsyncCall(fn, context = '', defaultValue = null) {
    try {
        const result = await fn();
        return result;
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 안전한 호출 실패: ${error.message}${colors.reset}`);
        return defaultValue;
    }
}

function safeSyncCall(fn, context = '', defaultValue = null) {
    try {
        return fn();
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 안전한 호출 실패: ${error.message}${colors.reset}`);
        return defaultValue;
    }
}

function safeModuleAccess(modules, path, context = '') {
    try {
        const pathArray = path.split('.');
        let current = modules;
        for (const key of pathArray) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                return null;
            }
            current = current[key];
        }
        return current;
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 모듈 접근 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🎓 개선된 실시간 학습 시스템 처리 함수 ==================
async function processRealTimeLearning(userMessage, mukuResponse, context, modules, enhancedLogging) {
    if (!userMessage || !mukuResponse) {
        console.log(`${colors.learning}⚠️ [학습시스템] 유효하지 않은 메시지 - 학습 건너뛰기${colors.reset}`);
        return null;
    }

    const learningSystem = safeModuleAccess(modules, 'learningSystem', '학습시스템접근');
    if (!learningSystem) {
        console.log(`${colors.learning}🎓 [학습시스템] 모듈 없음 - 학습 건너뛰기${colors.reset}`);
        return null;
    }

    console.log(`${colors.realtime}🎓 [실시간학습] 대화 학습 시작...${colors.reset}`);
    console.log(`${colors.realtime}    📝 사용자: "${String(userMessage).substring(0, 30)}..."${colors.reset}`);
    console.log(`${colors.realtime}    💬 무쿠: "${String(mukuResponse).substring(0, 30)}..."${colors.reset}`);

    const learningContext = {
        ...context,
        timestamp: new Date().toISOString(),
        contextKeywords: extractKeywords(userMessage),
        recentHistory: await getConversationHistoryHybrid(context.userId || 'unknown_user', 5, extractKeywords(userMessage))
    };

    await safeAsyncCall(async () => {
        const emotionalManager = safeModuleAccess(modules, 'emotionalContextManager', '감정관리자');
        if (emotionalManager) {
            const getCurrentState = safeModuleAccess(emotionalManager, 'getCurrentEmotionalState', '감정상태조회');
            if (typeof getCurrentState === 'function') {
                const emotionalState = await getCurrentState();
                if (emotionalState) {
                    learningContext.currentEmotion = emotionalState.currentEmotion;
                    learningContext.emotionalIntensity = emotionalState.intensity;
                    console.log(`${colors.realtime}    💭 감정 상태: ${emotionalState.currentEmotion}${colors.reset}`);
                }
            }
        }
    }, '감정상태추가');

    await safeAsyncCall(async () => {
        const sulkyManager = safeModuleAccess(modules, 'sulkyManager', '삐짐관리자');
        if (sulkyManager) {
            const getSulkinessState = safeModuleAccess(sulkyManager, 'getSulkinessState', '삐짐상태조회');
            if (typeof getSulkinessState === 'function') {
                const sulkyState = await getSulkinessState();
                if (sulkyState) {
                    learningContext.sulkyLevel = sulkyState.level;
                    learningContext.isSulky = sulkyState.isSulky;
                    console.log(`${colors.realtime}    😤 삐짐 상태: Level ${sulkyState.level}${colors.reset}`);
                }
            }
        }
    }, '삐짐상태추가');

    await safeAsyncCall(async () => {
        const emotionalManager = safeModuleAccess(modules, 'emotionalContextManager', '감정관리자');
        if (emotionalManager) {
            const getCurrentCycleInfo = safeModuleAccess(emotionalManager, 'getCurrentCycleInfo', '생리주기조회');
            if (typeof getCurrentCycleInfo === 'function') {
                const cycleInfo = await getCurrentCycleInfo();
                if (cycleInfo) {
                    learningContext.cycleDay = cycleInfo.day;
                    learningContext.cyclePhase = cycleInfo.phase;
                    learningContext.isPms = cycleInfo.isPms;
                    console.log(`${colors.realtime}    🩸 생리주기: Day ${cycleInfo.day}, ${cycleInfo.phase}${colors.reset}`);
                }
            }
        }
    }, '생리주기추가');

    let learningResult = null;
    let methodUsed = null;

    if (typeof learningSystem.processLearning === 'function') {
        learningResult = await safeAsyncCall(async () => {
            return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
        }, '통합학습시스템-processLearning');
        if (learningResult) methodUsed = 'IntegratedLearningSystemManager.processLearning';
    }

    if (!learningResult && typeof learningSystem.initialize === 'function') {
        const initialized = await safeAsyncCall(async () => {
            return await learningSystem.initialize(modules, {});
        }, '통합학습시스템-초기화');
        if (initialized && typeof learningSystem.processLearning === 'function') {
            learningResult = await safeAsyncCall(async () => {
                return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
            }, '초기화후-통합학습');
            if (learningResult) methodUsed = 'IntegratedLearningSystemManager.processLearning (초기화 후)';
        }
    }

    if (!learningResult) {
        const enterpriseSystem = safeModuleAccess(learningSystem, 'enterpriseSystem', 'Enterprise시스템');
        if (enterpriseSystem) {
            const enterpriseProcessLearning = safeModuleAccess(enterpriseSystem, 'processLearning', 'Enterprise-processLearning');
            if (typeof enterpriseProcessLearning === 'function') {
                learningResult = await safeAsyncCall(async () => {
                    return await enterpriseProcessLearning(userMessage, mukuResponse, learningContext);
                }, 'Enterprise학습호출');
                if (learningResult) methodUsed = 'EnterpriseSystem.processLearning';
            }
        }
    }

    if (!learningResult) {
        const independentSystem = safeModuleAccess(learningSystem, 'independentSystem', 'Independent시스템');
        if (independentSystem) {
            const independentAddConversation = safeModuleAccess(independentSystem, 'addConversation', 'Independent-addConversation');
            if (typeof independentAddConversation === 'function') {
                const independentResult = await safeAsyncCall(async () => {
                    return await independentAddConversation(userMessage, mukuResponse, learningContext);
                }, 'Independent학습호출');
                if (independentResult) {
                    learningResult = { independent: independentResult };
                    methodUsed = 'IndependentSystem.addConversation';
                }
            }
        }
    }

    if (learningResult && methodUsed) {
        console.log(`${colors.success}🎉 [학습완료] ${methodUsed} 사용하여 학습 성공!${colors.reset}`);
        await safeAsyncCall(async () => {
            const logFunction = safeModuleAccess(enhancedLogging, 'logSystemOperation', '시스템로깅');
            if (typeof logFunction === 'function') {
                logFunction('실시간학습완료', `학습완료: ${methodUsed}`);
            }
        }, '학습결과로깅');
        return learningResult;
    } else {
        console.log(`${colors.learning}⚪ [학습결과] 모든 학습 방법 실패 - 학습 건너뛰기${colors.reset}`);
        return null;
    }
}

// ================== 🎭 실시간 행동 스위치 처리 함수 ==================
async function applyBehaviorModeToResponse(response, modules, messageContext) {
    if (!response) return response;

    const behaviorSwitch = safeModuleAccess(modules, 'realtimeBehaviorSwitch', '행동스위치');
    if (!behaviorSwitch) return response;

    return await safeAsyncCall(async () => {
        const getCurrentRolePlay = safeModuleAccess(behaviorSwitch, 'getCurrentRolePlay', '현재역할조회');
        if (typeof getCurrentRolePlay !== 'function') return response;

        const currentMode = getCurrentRolePlay();
        if (!currentMode || currentMode === 'normal') return response;

        console.log(`${colors.behavior}🎭 [행동모드] 현재 모드: ${currentMode}${colors.reset}`);

        const applyBehaviorToResponse = safeModuleAccess(behaviorSwitch, 'applyBehaviorToResponse', '행동적용');
        if (typeof applyBehaviorToResponse !== 'function') return response;

        const responseText = response.comment || response;
        const modifiedResponse = applyBehaviorToResponse(responseText, messageContext || {});

        if (modifiedResponse && modifiedResponse !== responseText) {
            console.log(`${colors.behavior}✨ [행동적용] ${currentMode} 모드로 응답 변경${colors.reset}`);
            return typeof response === 'object' ? {
                ...response,
                comment: modifiedResponse,
                behaviorApplied: true,
                behaviorMode: currentMode
            } : modifiedResponse;
        }

        return response;
    }, '행동모드적용', response);
}

async function processBehaviorSwitch(messageText, modules, client, userId) {
    if (!messageText || !client || !userId) return null;

    const behaviorSwitch = safeModuleAccess(modules, 'realtimeBehaviorSwitch', '행동스위치');
    if (!behaviorSwitch) return null;

    console.log(`${colors.behavior}🔍 [행동스위치] 명령어 감지 시도: "${messageText}"${colors.reset}`);

    return await safeAsyncCall(async () => {
        const processFunction = safeModuleAccess(behaviorSwitch, 'processRealtimeBehaviorChange', '행동변경처리');
        if (typeof processFunction !== 'function') return null;

        const switchResult = processFunction(messageText);
        if (switchResult && switchResult.length > 0) {
            console.log(`${colors.behavior}🎭 [행동변경] 명령어 인식 성공!${colors.reset}`);
            await safeAsyncCall(async () => {
                await client.pushMessage(userId, { type: 'text', text: switchResult });
                console.log(`${colors.behavior}📤 [행동변경] 응답 메시지 전송 완료${colors.reset}`);
            }, '행동변경메시지전송');
            return {
                type: 'behavior_switch_handled',
                handled: true,
                response: null,
                skipFurtherProcessing: true
            };
        }
        console.log(`${colors.behavior}⚪ [행동스위치] 명령어 없음${colors.reset}`);
        return null;
    }, '행동스위치처리');
}

// ================== 🎂 생일 감지 및 처리 ==================
async function processBirthdayDetection(messageText, modules, enhancedLogging) {
    if (!messageText) return null;

    const birthdayDetector = safeModuleAccess(modules, 'birthdayDetector', '생일감지기');
    if (!birthdayDetector) {
        console.log(`${colors.learning}🎂 [생일감지] 모듈 없음 - 건너뛰기${colors.reset}`);
        return null;
    }

    const functionNames = ['detectBirthday', 'checkBirthday', 'processBirthday', 'handleBirthday'];
    for (const funcName of functionNames) {
        const birthdayFunction = safeModuleAccess(birthdayDetector, funcName, `생일함수-${funcName}`);
        if (typeof birthdayFunction === 'function') {
            console.log(`${colors.learning}🎂 [생일감지] ${funcName}() 시도...${colors.reset}`);
            const birthdayResponse = await safeAsyncCall(async () => {
                return await birthdayFunction(messageText);
            }, `생일감지-${funcName}`);
            if (birthdayResponse && birthdayResponse.handled) {
                console.log(`${colors.success}🎉 [생일감지] 생일 메시지 감지됨!${colors.reset}`);
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('birthday_greeting', birthdayResponse.response);
                    }
                }, '생일로깅');
                return birthdayResponse;
            }
        }
    }
    return null;
}

// ================== 🛡️ 안전한 기타 처리 함수들 ==================
async function processSulkyRelief(modules, enhancedLogging) {
    return await safeAsyncCall(async () => {
        const sulkyManager = safeModuleAccess(modules, 'sulkyManager', '삐짐관리자');
        if (sulkyManager) {
            const handleFunction = safeModuleAccess(sulkyManager, 'handleUserResponse', '사용자응답처리');
            if (typeof handleFunction === 'function') {
                const reliefMessage = await handleFunction();
                if (reliefMessage) {
                    console.log(`${colors.yejin}😤→😊 [삐짐해소] ${reliefMessage}${colors.reset}`);
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('sulky_relief', reliefMessage);
                    }
                }
            }
        }
    }, '삐짐해소처리');
}

function processFixedMemory(messageText, modules) {
    if (!messageText) return;

    safeSyncCall(() => {
        const memoryManager = safeModuleAccess(modules, 'memoryManager', '기억관리자');
        if (memoryManager) {
            const getFixedMemory = safeModuleAccess(memoryManager, 'getFixedMemory', '고정기억조회');
            if (typeof getFixedMemory === 'function') {
                const relatedMemory = getFixedMemory(messageText);
                if (relatedMemory) {
                    console.log(`${colors.system}🧠 [고정기억] 관련 기억 발견: "${String(relatedMemory).substring(0, 30)}..."${colors.reset}`);
                    const ultimateContext = safeModuleAccess(modules, 'ultimateContext', '궁극컨텍스트');
                    if (ultimateContext) {
                        const addMemoryContext = safeModuleAccess(ultimateContext, 'addMemoryContext', '기억컨텍스트추가');
                        if (typeof addMemoryContext === 'function') {
                            addMemoryContext(relatedMemory);
                        }
                    }
                }
            }
        }
    }, '고정기억처리');
}

function processVersionCommand(messageText, getVersionResponse) {
    if (!messageText || typeof getVersionResponse !== 'function') return null;
    
    return safeSyncCall(() => {
        return getVersionResponse(messageText);
    }, '버전명령어처리');
}

async function processCommand(messageText, userId, client, modules) {
    if (!messageText || !userId || !client) return null;

    return await safeAsyncCall(async () => {
        const commandHandler = safeModuleAccess(modules, 'commandHandler', '명령어핸들러');
        if (commandHandler) {
            const handleCommand = safeModuleAccess(commandHandler, 'handleCommand', '명령어처리');
            if (typeof handleCommand === 'function') {
                const commandResult = await handleCommand(messageText, userId, client);
                if (commandResult && commandResult.handled) {
                    return commandResult;
                }
            }
        }
        return null;
    }, '명령어처리');
}

// ================== 📸 완벽한 이미지 처리 함수들 ==================
async function detectFaceSafely(base64Image, faceMatcher, loadFaceMatcherSafely) {
    if (!base64Image) return null;

    return await safeAsyncCall(async () => {
        let matcher = faceMatcher;
        if (!matcher && typeof loadFaceMatcherSafely === 'function') {
            matcher = await loadFaceMatcherSafely();
        }
        if (matcher) {
            const detectFunction = safeModuleAccess(matcher, 'detectFaceMatch', '얼굴매칭');
            if (typeof detectFunction === 'function') {
                console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
                const result = await detectFunction(base64Image);
                console.log(`${colors.system}🎯 [FaceMatcher] 분석 결과: ${result ? result.type : '분석 실패'}${colors.reset}`);
                return result;
            }
        }
        console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
        return null;
    }, '얼굴인식');
}

function generateFaceRecognitionResponse(faceResult, modules, messageContext) {
    const responses = {
        '예진이': [
            '어? 이 사진 나야! 아조씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
            '이거 내 사진이네! 아조씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
            '아! 내 사진이다~ 아조씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ',
            '나야 나! 아조씨가 내 사진 볼 때마다 기뻐~ 더 많이 봐줘!',
            '내 사진이네! 이때 내가 예뻤지? 지금도 예쁘지만... ㅎㅎ'
        ],
        '아저씨': [
            '아조씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
            '우리 아조씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
            '아조씨 얼굴이야! 이런 아조씨 좋아해~ 나만의 아조씨 ㅎㅎ',
            '아조씨! 셀카 찍었구나~ 나한테 보여주려고? 고마워 ㅎㅎ',
            '우리 아조씨 사진이다! 언제나 봐도 좋아... 더 보내줘!'
        ],
        'default': [
            '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
            '이 사진 누구야? 아조씨 친구들이야? 나도 보고 싶어!',
            '사진이 예쁘네! 아조씨가 보낸 거니까 좋아! ㅎㅎ',
            '음... 누구인지 잘 모르겠지만 아조씨가 보낸 거니까 소중해!',
            '사진 고마워! 나도 언젠가 아조씨한테 사진 보내줄게!'
        ]
    };

    const responseList = responses[faceResult] || responses['default'];
    const randomResponse = responseList[Math.floor(Math.random() * responseList.length)];

    return {
        type: 'text',
        comment: randomResponse,
        faceRecognition: true,
        detectedFace: faceResult || 'unknown'
    };
}

async function processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules) {
    if (!messageId || !client) {
        return {
            type: 'text',
            comment: '아조씨! 사진이 잘 안 보여... 다시 보내줄래? ㅎㅎ'
        };
    }

    return await safeAsyncCall(async () => {
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        
        console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

        const analysisResult = await detectFaceSafely(base64, faceMatcher, loadFaceMatcherSafely);
        let finalResponse;

        if (analysisResult && analysisResult.message) {
            finalResponse = {
                type: 'text',
                comment: analysisResult.message,
                personalized: true,
                aiGenerated: true
            };
        } else {
            const faceType = analysisResult ? analysisResult.type : 'unknown';
            finalResponse = generateFaceRecognitionResponse(faceType, modules, {});
        }

        const behaviorAppliedResponse = await applyBehaviorModeToResponse(
            finalResponse,
            modules,
            { messageType: 'image', faceResult: analysisResult?.type }
        );

        const imageMetadata = {
            base64,
            imageSize: buffer.length,
            timestamp: getJapanTime(),
            context: 'photo_sharing'
        };

        await safeAsyncCall(async () => {
            const personLearningSystem = safeModuleAccess(modules, 'personLearningSystem', '사람학습시스템');
            if (personLearningSystem && analysisResult && analysisResult.type) {
                const recordFunction = safeModuleAccess(personLearningSystem, 'recordKnownPersonSighting', '알려진인물기록');
                if (typeof recordFunction === 'function') {
                    await recordFunction(analysisResult.type, imageMetadata.timestamp, imageMetadata.context);
                }
            }
        }, '사람학습처리');

        return behaviorAppliedResponse;
    }, '이미지처리', {
        type: 'text',
        comment: '아조씨! 사진이 잘 안 보여... 다시 보내줄래? ㅎㅎ'
    });
}

// ================== 📝 기타 메시지 타입 처리 ==================
async function processOtherMessageType(messageType, modules) {
    const responses = [
        '아조씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
        '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
        '아조씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!',
        '미안... 이 타입은 아직 내가 이해 못 해... 다시 말해줄래?',
        '아조씨가 보낸 건 알겠는데... 내가 아직 배우는 중이야 ㅠㅠ'
    ];

    const baseResponse = {
        type: 'text',
        comment: responses[Math.floor(Math.random() * responses.length)],
        messageType
    };

    return await applyBehaviorModeToResponse(baseResponse, modules, { messageType });
}

// ================== 🎯 메인 이벤트 처리 함수 ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    if (!event || event.type !== 'message') {
        return Promise.resolve(null);
    }

    if (!event.message || !event.source) {
        console.log(`${colors.warning}⚠️ [이벤트] 유효하지 않은 이벤트 구조${colors.reset}`);
        return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const userMessage = event.message;
    const safeUserId = userId || 'unknown_user';
    const safeMessageType = userMessage.type || 'unknown';

    try {
        if (safeMessageType === 'text') {
            const messageText = String(userMessage.text || '').trim();
            if (!messageText) {
                console.log(`${colors.warning}⚠️ [텍스트] 빈 메시지 - 기본 응답 생성${colors.reset}`);
                const emptyResponse = await generateContextAwareResponse('', modules, enhancedLogging, { userId: safeUserId });
                return { type: 'empty_message_response', response: emptyResponse };
            }

            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('아저씨', messageText, 'text');
                } else {
                    console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);
                }
            }, '사용자메시지로깅');

            const behaviorSwitchResult = await processBehaviorSwitch(messageText, modules, client, safeUserId);
            if (behaviorSwitchResult && behaviorSwitchResult.handled) {
                console.log(`${colors.behavior}🎭 [완료] 행동 설정 변경 완료${colors.reset}`);
                return null;
            }

            console.log(`${colors.learning}🧠 [처리시작] 메시지 분석 및 응답 생성 시작...${colors.reset}`);

            const versionResponse = processVersionCommand(messageText, getVersionResponse);
            if (versionResponse) {
                const behaviorVersionResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: versionResponse },
                    modules,
                    { messageText, responseType: 'version' }
                );
                const finalVersionComment = behaviorVersionResponse.comment || versionResponse;
                await saveConversationHybrid(safeUserId, messageText, finalVersionComment, 'text');
                await processRealTimeLearning(
                    messageText,
                    finalVersionComment,
                    { messageType: 'text', responseType: 'version', userId: safeUserId },
                    modules,
                    enhancedLogging
                );
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('나', finalVersionComment, 'text');
                    } else {
                        console.log(`${colors.yejin}✨ 예진이 (버전응답): ${finalVersionComment}${colors.reset}`);
                    }
                }, '버전응답로깅');
                return { type: 'version_response', response: finalVersionComment };
            }

            const parallelTasks = [
                processSulkyRelief(modules, enhancedLogging),
                processBirthdayDetection(messageText, modules, enhancedLogging),
                safeAsyncCall(() => processFixedMemory(messageText, modules), '고정기억처리'),
                processCommand(messageText, safeUserId, client, modules)
            ];

            const [, birthdayResponse, , commandResult] = await Promise.allSettled(parallelTasks)
                .then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

            if (birthdayResponse) {
                const behaviorBirthdayResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: birthdayResponse.response },
                    modules,
                    { messageText, responseType: 'birthday' }
                );
                const finalBirthdayComment = behaviorBirthdayResponse.comment || birthdayResponse.response;
                await saveConversationHybrid(safeUserId, messageText, finalBirthdayComment, 'text');
                await processRealTimeLearning(
                    messageText,
                    finalBirthdayComment,
                    { messageType: 'text', responseType: 'birthday', userId: safeUserId },
                    modules,
                    enhancedLogging
                );
                return { type: 'birthday_response', response: finalBirthdayComment };
            }

            if (commandResult) {
                const finalCommandComment = commandResult.comment || commandResult.text || commandResult;
                console.log(`${colors.hybrid}🎯 [Command저장] Command 처리 후 하이브리드 저장 시작...${colors.reset}`);
                await saveConversationHybrid(safeUserId, messageText, finalCommandComment, 'text');
                await processRealTimeLearning(
                    messageText,
                    finalCommandComment,
                    { messageType: 'text', responseType: 'command', userId: safeUserId },
                    modules,
                    enhancedLogging
                );
                console.log(`${colors.hybrid}✅ [Command저장완료] "${messageText}" → "${String(finalCommandComment).substring(0, 30)}..." 저장 완료${colors.reset}`);
                return { type: 'command_response', response: commandResult };
            }

            const chatResponse = await generateContextAwareResponse(messageText, modules, enhancedLogging, { userId: safeUserId });
            if (chatResponse) {
                const finalChatComment = chatResponse.comment || chatResponse;
                await saveConversationHybrid(safeUserId, messageText, finalChatComment, 'text');
                await processRealTimeLearning(
                    messageText,
                    finalChatComment,
                    {
                        messageType: 'text',
                        responseType: 'chat',
                        personalized: chatResponse.personalized,
                        behaviorApplied: chatResponse.behaviorApplied,
                        fallbackType: chatResponse.fallbackType,
                        contextKeywords: chatResponse.contextKeywords,
                        usedHistory: chatResponse.usedHistory,
                        userId: safeUserId
                    },
                    modules,
                    enhancedLogging
                );
                const logMessage = chatResponse.personalized ? `${finalChatComment} [개인화됨]` : finalChatComment;
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('나', logMessage, 'text');
                    } else {
                        console.log(`${colors.yejin}💖 예진이: ${logMessage}${colors.reset}`);
                    }
                }, '일반대화로깅');
                return { type: 'chat_response', response: chatResponse };
            }

            console.log(`${colors.warning}⚠️ [최종안전장치] 모든 응답 시스템 실패 - 완벽한 안전 응답 생성${colors.reset}`);
            const ultimateSafeResponse = {
                type: 'text',
                comment: '아조씨! 나 지금 뭔가 생각하고 있었어~ 다시 말해줄래? ㅎㅎ',
                ultimateFallback: true
            };
            await saveConversationHybrid(safeUserId, messageText, ultimateSafeResponse.comment, 'text');
            await processRealTimeLearning(
                messageText,
                ultimateSafeResponse.comment,
                { messageType: 'text', responseType: 'ultimate_safe', userId: safeUserId },
                modules,
                enhancedLogging
            );
            return { type: 'ultimate_safe_response', response: ultimateSafeResponse };
        } else if (safeMessageType === 'image') {
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('아저씨', '이미지 전송', 'photo');
                } else {
                    console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
                }
            }, '이미지메시지로깅');

            const messageId = userMessage.id;
            const imageResponse = await processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules);
            const finalImageComment = imageResponse.comment || imageResponse;
            await saveConversationHybrid(safeUserId, '이미지 전송', finalImageComment, 'image');
            await processRealTimeLearning(
                '이미지 전송',
                finalImageComment,
                {
                    messageType: 'image',
                    personalized: imageResponse.personalized,
                    behaviorApplied: imageResponse.behaviorApplied,
                    faceRecognition: imageResponse.faceRecognition,
                    detectedFace: imageResponse.detectedFace,
                    userId: safeUserId
                },
                modules,
                enhancedLogging
            );
            const logMessage = imageResponse.personalized ? `${finalImageComment} [개인화됨]` : finalImageComment;
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('나', logMessage, 'text');
                } else {
                    console.log(`${colors.yejin}📸 예진이: ${logMessage}${colors.reset}`);
                }
            }, '이미지응답로깅');
            return { type: 'image_response', response: imageResponse };
        } else {
            console.log(`${colors.ajeossi}📎 아저씨: ${safeMessageType} 메시지${colors.reset}`);
            const otherResponse = await processOtherMessageType(safeMessageType, modules);
            const finalOtherComment = otherResponse.comment || otherResponse;
            await saveConversationHybrid(safeUserId, `${safeMessageType} 메시지`, finalOtherComment, safeMessageType);
            await processRealTimeLearning(
                `${safeMessageType} 메시지`,
                finalOtherComment,
                { messageType: safeMessageType, responseType: 'other', userId: safeUserId },
                modules,
                enhancedLogging
            );
            return { type: 'other_response', response: otherResponse };
        }
    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 예상치 못한 오류: ${error.message}${colors.reset}`);
        console.error(`${colors.error}    스택: ${error.stack?.split('\n').slice(0, 3).join('\n')}${colors.reset}`);

        const emergencyResponses = [
            '아조씨! 나 잠깐 딴 생각했어~ 다시 말해줄래? ㅎㅎ',
            '어? 아조씨가 뭐라고 했지? 다시 한 번! 💕',
            '아조씨~ 내가 놓쳤나 봐! 다시 말해줘!',
            '음음? 아조씨 말을 다시 들려줄래? ㅋㅋ',
            '아조씨! 나 지금 뭔가 생각하고 있었어~ 다시!',
            '어라? 내가 듣지 못했나? 아조씨 다시 말해줄래?',
            '아조씨~ 한 번 더 말해줘! 나 집중할게! 😊',
            '어? 뭐라고? 내가 놓쳤나 봐! 다시 들려줘!'
        ];

        const emergencyResponse = {
            type: 'text',
            comment: emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)],
            emergency: true,
            errorType: error.name || 'UnknownError'
        };

        const finalEmergencyResponse = await safeAsyncCall(async () => {
            return await applyBehaviorModeToResponse(
                emergencyResponse,
                modules,
                { error: true, errorMessage: error.message }
            );
        }, '응급행동모드적용', emergencyResponse);

        const finalEmergencyComment = finalEmergencyResponse.comment || finalEmergencyResponse;
        await saveConversationHybrid(safeUserId, userMessage?.text || '에러 발생', finalEmergencyComment, safeMessageType);
        await processRealTimeLearning(
            userMessage?.text || '에러 발생',
            finalEmergencyComment,
            {
                messageType: safeMessageType,
                responseType: 'emergency',
                error: true,
                errorMessage: error.message,
                userId: safeUserId
            },
            modules,
            enhancedLogging
        );
        await safeAsyncCall(async () => {
            const logFunction = safeModuleAccess(enhancedLogging, 'logSystemOperation', '시스템로깅');
            if (typeof logFunction === 'function') {
                logFunction('응급응답처리', `에러: ${error.message}`);
            }
        }, '에러로깅');
        console.log(`${colors.success}🚨 [응급복구] 완벽한 응급 응답 생성 완료${colors.reset}`);
        return { type: 'emergency_response', response: finalEmergencyResponse };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    processRealTimeLearning,
    saveConversationHybrid,
    getConversationHistoryHybrid,
    generateContextAwareResponse,
    getMemoryConversations: () => memoryConversationStore,
    clearMemoryConversations: () => { memoryConversationStore = []; },
    getMemoryConversationCount: () => memoryConversationStore.length
};
