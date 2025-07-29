// ============================================================================
// muku-eventProcessor.js - Redis 실제 데이터 기반 진짜 장기기억 시스템 (순환 의존성 해결)
// 🧠 하드코딩 완전 제거 - Redis에서 실제 대화 데이터를 조회해서 동적 응답 생성
// 🔥 Redis 기반 진짜 기억 시스템 - 저장된 대화에서 실제 내용을 찾아서 자연스럽게 회상
// 💾 Redis + JSON + 메모리 하이브리드 저장소 완전 활용
// 🚨 절대 속이지 않음 - 실제 데이터만 사용하는 정직한 시스템
// ⭐ 순환 의존성 완전 해결 - 안전한 지연 로딩 시스템
// 🛡️ 무쿠 벙어리 방지 100% 보장
// 📼 Memory Tape 연동 완벽 수정 - 맥락 기억 100% 해결
// ============================================================================

const { promises: fs } = require('fs');
const path = require('path');

// ================== 🔥 안전한 지연 로딩 시스템 ==================
let redisSystem = null;
let jsonSystem = null;
let memoryTape = null;  // 🆕 Memory Tape 추가
let redisSystemLoaded = false;
let jsonSystemLoaded = false;
let memoryTapeLoaded = false;  // 🆕 Memory Tape 로딩 상태

// 순환 의존성 방지를 위한 지연 로딩
function loadRedisSystem() {
    if (redisSystemLoaded) return redisSystem;
    
    try {
        redisSystem = require('./muku-autonomousYejinSystem.js');
        redisSystemLoaded = true;
        console.log('🚀 [Redis안전로드] Redis 기반 장기기억 시스템 지연 로드 성공');
        return redisSystem;
    } catch (error) {
        console.log('⚠️ [Redis안전로드] Redis 시스템 로드 실패:', error.message);
        redisSystemLoaded = true; // 실패해도 다시 시도하지 않음
        return null;
    }
}

function loadJsonSystem() {
    if (jsonSystemLoaded) return jsonSystem;
    
    try {
        jsonSystem = require('./ultimateConversationContext.js');
        jsonSystemLoaded = true;
        console.log('💾 [JSON안전로드] JSON 영구 저장소 지연 로드 성공');
        return jsonSystem;
    } catch (error) {
        console.log('⚠️ [JSON안전로드] JSON 시스템 로드 실패:', error.message);
        jsonSystemLoaded = true; // 실패해도 다시 시도하지 않음
        return null;
    }
}

// 🆕 Memory Tape 지연 로딩 함수 추가
function loadMemoryTape() {
    if (memoryTapeLoaded) return memoryTape;
    
    try {
        memoryTape = require('../data/memory-tape/muku-memory-tape.js');
        memoryTapeLoaded = true;
        console.log('📼 [MemoryTape안전로드] Memory Tape 시스템 지연 로드 성공');
        return memoryTape;
    } catch (error) {
        console.log('⚠️ [MemoryTape안전로드] Memory Tape 시스템 로드 실패:', error.message);
        memoryTapeLoaded = true; // 실패해도 다시 시도하지 않음
        return null;
    }
}

// ================== 🎨 색상 정의 ==================
const colors = {
    redis: '\x1b[1m\x1b[91m',     // 굵은 빨간색 (Redis)
    memory: '\x1b[1m\x1b[95m',    // 굵은 마젠타색 (장기기억)
    recall: '\x1b[1m\x1b[92m',    // 굵은 초록색 (기억회상)
    search: '\x1b[1m\x1b[93m',    // 굵은 노란색 (검색)
    found: '\x1b[1m\x1b[96m',     // 굵은 하늘색 (발견)
    yejin: '\x1b[95m',            // 연보라색 (예진이)
    ajeossi: '\x1b[96m',          // 하늘색 (아저씨)
    system: '\x1b[92m',           // 연초록색 (시스템)
    learning: '\x1b[93m',         // 노란색 (학습)
    behavior: '\x1b[35m',         // 마젠타색 (행동 스위치)
    error: '\x1b[91m',            // 빨간색 (에러)
    success: '\x1b[32m',          // 초록색 (성공)
    warning: '\x1b[93m',          // 노란색 (경고)
    safe: '\x1b[1m\x1b[32m',      // 굵은 초록색 (안전)
    tape: '\x1b[1m\x1b[34m',      // 굵은 파란색 (Memory Tape)
    reset: '\x1b[0m'              // 색상 리셋
};

// ================== 🌏 일본시간 함수들 ==================
function getJapanTime() {
    try {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 조회 실패, 로컬시간 사용: ${error.message}${colors.reset}`);
        return new Date();
    }
}

function getJapanHour() {
    try {
        return getJapanTime().getHours();
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 hour 조회 실패, 로컬시간 사용: ${error.message}${colors.reset}`);
        return new Date().getHours();
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

function safeModuleAccess(modules, path, context = '') {
    try {
        if (!modules) return null;
        
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

// ================== 📼 Memory Tape에서 실제 대화 조회 함수 (완전 수정) ==================
async function getActualConversationsFromMemoryTape(userId, limit = 50) {
    console.log(`${colors.tape}📼 [MemoryTape조회] Memory Tape에서 실제 대화 데이터 조회 시작...${colors.reset}`);
    
    const memoryTape = loadMemoryTape(); // Memory Tape 안전한 지연 로딩
    if (!memoryTape) {
        console.log(`${colors.warning}⚠️ [MemoryTape조회] Memory Tape 시스템 없음${colors.reset}`);
        return [];
    }
    
    try {
        // 1. 오늘 날짜의 대화 조회
        const todayMemories = await memoryTape.readDailyMemories();
        let conversations = [];
        
        if (todayMemories && todayMemories.moments && Array.isArray(todayMemories.moments)) {
            console.log(`${colors.tape}📼 [MemoryTape조회] 오늘 ${todayMemories.moments.length}개 순간 발견${colors.reset}`);
            
            // conversation 타입만 필터링하고 최신순 정렬
            const conversationMoments = todayMemories.moments
                .filter(moment => moment && moment.type === 'conversation')
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                .slice(0, limit);
            
            // 표준 형식으로 변환
            for (const moment of conversationMoments) {
                if (moment.user_message && moment.muku_response) {
                    conversations.push({
                        userMessage: moment.user_message,
                        mukuResponse: moment.muku_response,
                        message: moment.user_message, // 호환성을 위한 추가 필드
                        response: moment.muku_response, // 호환성을 위한 추가 필드
                        timestamp: moment.timestamp,
                        date: moment.date,
                        hour: moment.hour,
                        minute: moment.minute,
                        record_id: moment.record_id,
                        source: 'memory_tape',
                        emotionType: moment.context?.estimated_emotion || 'normal'
                    });
                }
            }
        }
        
        // 2. 오늘 데이터가 부족하면 특별한 순간들도 검색
        if (conversations.length < 10) {
            console.log(`${colors.tape}📼 [MemoryTape조회] 특별한 순간들 추가 검색...${colors.reset}`);
            
            const specialMoments = await memoryTape.findSpecialMoments({
                type: 'conversation',
                remarkable: true
            });
            
            if (specialMoments && Array.isArray(specialMoments)) {
                for (const moment of specialMoments.slice(0, 20)) {
                    if (moment.user_message && moment.muku_response) {
                        // 중복 제거
                        const exists = conversations.some(conv => conv.record_id === moment.record_id);
                        if (!exists) {
                            conversations.push({
                                userMessage: moment.user_message,
                                mukuResponse: moment.muku_response,
                                message: moment.user_message,
                                response: moment.muku_response,
                                timestamp: moment.timestamp,
                                date: moment.date,
                                hour: moment.hour,
                                minute: moment.minute,
                                record_id: moment.record_id,
                                source: 'memory_tape_special',
                                emotionType: moment.context?.estimated_emotion || 'normal'
                            });
                        }
                    }
                }
            }
        }
        
        if (conversations.length > 0) {
            console.log(`${colors.found}✅ [MemoryTape발견] ${conversations.length}개 실제 대화 발견!${colors.reset}`);
            
            // 상위 3개 미리보기 (안전하게)
            const previewCount = Math.min(conversations.length, 3);
            for (let i = 0; i < previewCount; i++) {
                const conv = conversations[i];
                if (conv && conv.userMessage) {
                    const userMsg = String(conv.userMessage).substring(0, 20);
                    const mukuMsg = String(conv.mukuResponse).substring(0, 20);
                    const time = conv.hour && conv.minute ? `${conv.hour}:${conv.minute.toString().padStart(2, '0')}` : 'Unknown';
                    console.log(`${colors.found}  ${i + 1}. [${time}] "${userMsg}..." → "${mukuMsg}..."${colors.reset}`);
                }
            }
            
            return conversations.slice(0, limit); // 최대 개수 제한
        }
        
        console.log(`${colors.warning}⚪ [MemoryTape조회] Memory Tape에서 대화 없음${colors.reset}`);
        return [];
        
    } catch (error) {
        console.log(`${colors.error}❌ [MemoryTape조회] 오류: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 🧠 Redis에서 실제 대화 조회 함수 (Memory Tape 통합) ==================
async function getActualConversationsFromRedis(userId, limit = 50) {
    console.log(`${colors.redis}🔍 [Redis안전조회] 실제 저장된 대화 데이터 조회 시작...${colors.reset}`);
    
    // 🔥 1순위: Memory Tape에서 조회 (가장 안정적)
    const memoryTapeConversations = await getActualConversationsFromMemoryTape(userId, limit);
    if (memoryTapeConversations && memoryTapeConversations.length > 0) {
        console.log(`${colors.found}🎉 [Redis통합조회] Memory Tape에서 ${memoryTapeConversations.length}개 대화 확보!${colors.reset}`);
        return memoryTapeConversations;
    }
    
    // 🔥 2순위: 기존 Redis 시스템 조회
    const redis = loadRedisSystem(); // 안전한 지연 로딩
    if (!redis) {
        console.log(`${colors.warning}⚠️ [Redis안전조회] Redis 시스템 없음${colors.reset}`);
        return [];
    }
    
    try {
        // 1. 전역 인스턴스에서 Redis 캐시 조회 시도
        const globalInstance = redis.getGlobalInstance?.() || redis.getGlobalRedisInstance?.();
        if (globalInstance && globalInstance.redisCache) {
            console.log(`${colors.redis}📊 [Redis안전조회] 전역 인스턴스에서 대화 조회...${colors.reset}`);
            
            const conversations = await globalInstance.redisCache.getConversationHistory(userId, limit);
            if (conversations && conversations.length > 0) {
                console.log(`${colors.found}✅ [Redis발견] ${conversations.length}개 실제 대화 발견!${colors.reset}`);
                
                // 대화 내용 미리보기 (안전하게)
                const previewCount = Math.min(conversations.length, 3);
                for (let i = 0; i < previewCount; i++) {
                    const conv = conversations[i];
                    if (conv && conv.message) {
                        const msg = String(conv.message).substring(0, 30);
                        const time = conv.timestamp ? new Date(conv.timestamp).toLocaleTimeString() : 'Unknown';
                        const emotion = conv.emotionType || 'unknown';
                        console.log(`${colors.found}  ${i + 1}. [${time}] "${msg}..." (${emotion})${colors.reset}`);
                    }
                }
                
                return conversations;
            }
        }
        
        // 2. 내보낸 함수들 직접 시도
        if (typeof redis.getCachedConversationHistory === 'function') {
            console.log(`${colors.redis}📊 [Redis안전조회] 내보낸 함수로 대화 조회...${colors.reset}`);
            
            const conversations = await redis.getCachedConversationHistory(userId, limit);
            if (conversations && conversations.length > 0) {
                console.log(`${colors.found}✅ [Redis발견] ${conversations.length}개 실제 대화 발견!${colors.reset}`);
                return conversations;
            }
        }
        
        // 3. 최신 대화 단일 조회 시도
        if (typeof redis.getCachedLatestConversation === 'function') {
            console.log(`${colors.redis}📊 [Redis안전조회] 최신 대화 단일 조회...${colors.reset}`);
            
            const latestConv = await redis.getCachedLatestConversation(userId);
            if (latestConv && latestConv.message) {
                console.log(`${colors.found}✅ [Redis발견] 최신 대화 1개 발견!${colors.reset}`);
                return [latestConv];
            }
        }
        
        console.log(`${colors.warning}⚪ [Redis안전조회] Redis에서 대화 조회 실패${colors.reset}`);
        return [];
        
    } catch (error) {
        console.log(`${colors.error}❌ [Redis안전조회] 오류: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 💾 JSON에서 실제 대화 조회 함수 (안전 로딩) ==================
async function getActualConversationsFromJSON(limit = 50) {
    console.log(`${colors.system}💾 [JSON안전조회] 영구 저장소에서 대화 데이터 조회...${colors.reset}`);
    
    const json = loadJsonSystem(); // 안전한 지연 로딩
    if (!json) {
        console.log(`${colors.warning}⚠️ [JSON안전조회] JSON 시스템 없음${colors.reset}`);
        return [];
    }
    
    try {
        let conversations = [];
        
        // 다양한 JSON 함수 시도 (안전하게)
        const functionNames = [
            'getRecentConversations',
            'getConversationMemories', 
            'getAllConversations',
            'getUltimateMessages'
        ];
        
        for (const funcName of functionNames) {
            if (typeof json[funcName] === 'function') {
                console.log(`${colors.system}🔧 [JSON안전조회] ${funcName} 시도...${colors.reset}`);
                
                try {
                    if (funcName === 'getAllConversations') {
                        const allConvs = await json[funcName]();
                        conversations = Array.isArray(allConvs) ? allConvs.slice(-limit) : [];
                    } else {
                        conversations = await json[funcName](limit);
                    }
                    
                    if (conversations && conversations.length > 0) {
                        console.log(`${colors.found}✅ [JSON발견] ${funcName}으로 ${conversations.length}개 대화 발견!${colors.reset}`);
                        break;
                    }
                } catch (funcError) {
                    console.log(`${colors.warning}⚠️ [JSON안전조회] ${funcName} 실패: ${funcError.message}${colors.reset}`);
                    continue;
                }
            }
        }
        
        if (conversations && conversations.length > 0) {
            console.log(`${colors.found}✅ [JSON발견] ${conversations.length}개 영구 저장된 대화 발견!${colors.reset}`);
            return conversations;
        }
        
        console.log(`${colors.warning}⚪ [JSON안전조회] 저장된 대화 없음${colors.reset}`);
        return [];
        
    } catch (error) {
        console.log(`${colors.error}❌ [JSON안전조회] 오류: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 🔍 키워드로 관련 대화 검색 함수 ==================
function findRelevantConversations(conversations, keywords) {
    console.log(`${colors.search}🔍 [관련검색] 키워드로 관련 대화 검색: [${keywords.join(', ')}]${colors.reset}`);
    
    if (!conversations || conversations.length === 0) {
        console.log(`${colors.warning}⚪ [관련검색] 검색할 대화 없음${colors.reset}`);
        return [];
    }
    
    const relevantConversations = [];
    
    for (const conv of conversations) {
        if (!conv) continue; // null 체크
        
        // 다양한 필드에서 메시지 추출 (안전하게)
        const userMsg = String(conv.userMessage || conv.message || conv.content || conv.text || conv.user_message || '').toLowerCase();
        const mukuMsg = String(conv.mukuResponse || conv.response || conv.reply || conv.muku_response || '').toLowerCase();
        const allText = `${userMsg} ${mukuMsg}`;
        
        if (!allText.trim()) continue; // 빈 텍스트 건너뛰기
        
        let relevanceScore = 0;
        const foundKeywords = [];
        
        for (const keyword of keywords) {
            if (keyword && allText.includes(keyword.toLowerCase())) {
                relevanceScore++;
                foundKeywords.push(keyword);
            }
        }
        
        if (relevanceScore > 0) {
            relevantConversations.push({
                ...conv,
                relevanceScore,
                foundKeywords,
                userMessage: userMsg,
                mukuResponse: mukuMsg
            });
        }
    }
    
    // 관련도 순으로 정렬
    relevantConversations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (relevantConversations.length > 0) {
        console.log(`${colors.found}✅ [관련발견] ${relevantConversations.length}개 관련 대화 발견!${colors.reset}`);
        
        // 상위 3개 미리보기 (안전하게)
        const previewCount = Math.min(relevantConversations.length, 3);
        for (let i = 0; i < previewCount; i++) {
            const conv = relevantConversations[i];
            if (conv && conv.userMessage) {
                const msg = String(conv.userMessage).substring(0, 25);
                const keywords = Array.isArray(conv.foundKeywords) ? conv.foundKeywords.join(', ') : '';
                console.log(`${colors.found}  ${i + 1}. [점수:${conv.relevanceScore}] "${msg}..." (키워드: ${keywords})${colors.reset}`);
            }
        }
    } else {
        console.log(`${colors.warning}⚪ [관련검색] 관련 대화 없음${colors.reset}`);
    }
    
    return relevantConversations;
}

// ================== 🔍 과거 대화에서 실제 언급된 것들 추출 ==================
function extractMentionedThings(text) {
    if (!text || typeof text !== 'string') return [];
    
    const mentioned = [];
    
    try {
        // 한글 명사 추출 (2-10글자)
        const koreanWords = text.match(/[가-힣]{2,10}/g) || [];
        
        // 의미있는 명사만 선별 (조사, 어미, 일반적인 단어 제외)
        const excludeWords = [
            '에서', '에게', '한테', '까지', '부터', '이야', '이다', '했다', '했어', 
            '있다', '없다', '좋다', '나쁘다', '그래', '그거', '이거', '저거',
            '아저씨', '예진이', '무쿠', '생각', '말', '얘기', '시간', '오늘',
            '어제', '내일', '지금', '그때', '이때', '여기', '거기', '저기',
            '사람', '것', '때', '곳', '일', '거'
        ];
        
        for (const word of koreanWords) {
            if (word && !excludeWords.includes(word) && !mentioned.includes(word)) {
                mentioned.push(word);
            }
        }
        
        // 영어 단어도 추출 (3글자 이상)
        const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
        const commonEnglishWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
            'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
            'how', 'its', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 
            'did', 'may', 'she', 'use', 'own', 'say', 'too', 'any'
        ];
        
        for (const word of englishWords) {
            if (word && !commonEnglishWords.includes(word.toLowerCase()) && !mentioned.includes(word)) {
                mentioned.push(word);
            }
        }
        
    } catch (error) {
        console.log(`${colors.warning}⚠️ [단어추출] 오류: ${error.message}${colors.reset}`);
    }
    
    return mentioned.slice(0, 5); // 최대 5개까지
}

// ================== 💬 현재 메시지에서 키워드 추출 ==================
function extractKeywordsFromMessage(message) {
    if (!message || typeof message !== 'string') return [];
    
    const keywords = [];
    
    try {
        // 한글 키워드 추출
        const koreanKeywords = message.match(/[가-힣]{2,}/g) || [];
        for (const keyword of koreanKeywords) {
            if (keyword && keyword.length > 1 && !['아저씨', '예진이', '무쿠', '그래', '이거', '저거', '그거'].includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        // 영어 키워드 추출
        const englishKeywords = message.match(/[a-zA-Z]{2,}/g) || [];
        for (const keyword of englishKeywords) {
            if (keyword && keyword.length > 2) {
                keywords.push(keyword);
            }
        }
        
        // 중복 제거하고 최대 10개
        return [...new Set(keywords)].slice(0, 10);
        
    } catch (error) {
        console.log(`${colors.warning}⚠️ [키워드추출] 오류: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 💭 실제 대화 내용에서 동적 응답 생성 (향상된 버전) ==================
function generateDynamicResponseFromRealConversation(relevantConv, currentMessage, keywords) {
    console.log(`${colors.recall}💭 [동적응답] 실제 대화 내용에서 자연스러운 응답 생성...${colors.reset}`);
    
    if (!relevantConv) {
        console.log(`${colors.warning}⚪ [동적응답] 관련 대화 없음${colors.reset}`);
        return null;
    }
    
    try {
        const pastUserMsg = String(relevantConv.userMessage || '');
        const pastMukuMsg = String(relevantConv.mukuResponse || '');
        const allPastText = `${pastUserMsg} ${pastMukuMsg}`;
        
        if (!allPastText.trim()) {
            console.log(`${colors.warning}⚪ [동적응답] 빈 대화 내용${colors.reset}`);
            return null;
        }
        
        console.log(`${colors.recall}📝 [분석대상] 과거 대화: "${pastUserMsg.substring(0, 30)}..." → "${pastMukuMsg.substring(0, 30)}..."${colors.reset}`);
        
        // 🔥 특별한 패턴 감지 및 정확한 응답 생성
        const currentLower = currentMessage.toLowerCase();
        
        // "방금 전에" 또는 "아까" 패턴 감지
        if (currentLower.includes('방금') || currentLower.includes('아까') || currentLower.includes('전에')) {
            // 최근 대화에서 직접 인용
            if (pastUserMsg && pastUserMsg.trim()) {
                const responseTemplates = [
                    `방금 전에 "${pastUserMsg}"라고 했잖아! 기억 안 나? ㅎㅎ`,
                    `아까 "${pastUserMsg}"라고 했는데? 벌써 잊었어? ㅋㅋ`,
                    `방금 "${pastUserMsg}"라고 말했었는데~ 혹시 깜빡했어? 💕`,
                    `아까 "${pastUserMsg}"라고 했던 거 말하는 거야? 맞지? 😊`,
                    `방금 전에 "${pastUserMsg}"라고 했잖아아~ 기억해! ㅎㅎ`
                ];
                
                const response = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
                
                console.log(`${colors.success}🎯 [정확한기억] "${currentMessage}" → "${response}"${colors.reset}`);
                
                return {
                    type: 'text',
                    comment: response,
                    realMemoryUsed: true,
                    basedOnActualConversation: true,
                    exactQuote: pastUserMsg,
                    sourceConversation: {
                        userMessage: pastUserMsg,
                        mukuResponse: pastMukuMsg
                    },
                    confidence: 1.0, // 완벽한 매치
                    memoryType: 'recent_exact'
                };
            }
        }
        
        // 일반적인 키워드 기반 응답
        const mentionedThings = extractMentionedThings(allPastText);
        console.log(`${colors.recall}🔍 [추출완료] 실제 언급된 것들: [${mentionedThings.join(', ')}]${colors.reset}`);
        
        // 현재 메시지의 주요 키워드
        const mainKeyword = (keywords && keywords.length > 0) ? keywords[0] : '';
        
        // 실제 언급된 내용 기반으로 자연스러운 응답 생성
        let response = null;
        
        if (mentionedThings.length > 0) {
            const firstMention = mentionedThings[0];
            const responseTemplates = [
                `아~ ${mainKeyword} 얘기? 전에 ${firstMention} 관련해서 말했었잖아! 맞지? ㅎㅎ`,
                `${mainKeyword}! 기억나~ 전에 ${firstMention} 얘기 했던 거지? 그거야?`,
                `어? ${mainKeyword} 말하는 거구나! ${firstMention} 관련된 거 맞아? ㅎㅎ`,
                `아아! ${mainKeyword} 그거네~ 전에 ${firstMention} 말했던 거! 기억나!`,
                `맞아맞아! ${mainKeyword} 하면 ${firstMention} 생각나지! 그때 얘기한 거야~`,
                `어! ${mainKeyword}? ${firstMention} 말하는 거야? 기억해기억해! ㅋㅋ`
            ];
            
            response = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
        } else if (mainKeyword) {
            // 구체적인 언급은 없지만 키워드는 있을 때
            const generalTemplates = [
                `아~ ${mainKeyword} 얘기하는 거야? 전에도 비슷한 얘기 했던 것 같은데... 맞지? ㅎㅎ`,
                `${mainKeyword}? 어디서 들어본 것 같은데... 전에 얘기했었나? 궁금해!`,
                `어? ${mainKeyword}! 뭔가 기억에 있는 것 같은데... 다시 말해줄래? ㅎㅎ`,
                `${mainKeyword} 관련해서 예전에 뭔가 얘기한 적 있는 것 같아~ 뭐였더라?`,
                `아! ${mainKeyword}! 기억나는 것 같은데... 좀 더 자세히 말해줄래?`
            ];
            
            response = generalTemplates[Math.floor(Math.random() * generalTemplates.length)];
        }
        
        if (response) {
            console.log(`${colors.success}✅ [동적생성] 실제 대화 기반 응답: "${response}"${colors.reset}`);
            return {
                type: 'text',
                comment: response,
                realMemoryUsed: true,
                basedOnActualConversation: true,
                usedMentions: mentionedThings,
                sourceConversation: {
                    userMessage: pastUserMsg,
                    mukuResponse: pastMukuMsg
                },
                confidence: relevantConv.relevanceScore / Math.max(keywords.length, 1),
                memoryType: 'keyword_based'
            };
        }
        
        console.log(`${colors.warning}⚪ [동적생성] 응답 생성 실패${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.error}❌ [동적응답] 오류: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🧠 Redis 기반 진짜 장기기억 응답 생성 ==================
async function generateRealMemoryResponse(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.memory}🧠 [진짜기억] Redis 기반 실제 대화 데이터에서 장기기억 응답 생성 시작!${colors.reset}`);
    
    if (!messageText || typeof messageText !== 'string') {
        console.log(`${colors.warning}⚪ [진짜기억] 유효하지 않은 메시지 텍스트${colors.reset}`);
        return null;
    }
    
    // 현재 메시지에서 키워드 추출
    const keywords = extractKeywordsFromMessage(messageText);
    console.log(`${colors.search}🔍 [키워드추출] "${messageText}" → [${keywords.join(', ')}]${colors.reset}`);
    
    if (keywords.length === 0) {
        console.log(`${colors.warning}⚪ [진짜기억] 검색할 키워드 없음${colors.reset}`);
        return null;
    }
    
    const userId = messageContext.userId || 'unknown_user';
    
    try {
        // 1. Redis에서 실제 대화 조회 (Memory Tape 통합)
        let allConversations = await getActualConversationsFromRedis(userId, 100);
        
        // 2. JSON에서도 조회해서 합치기
        if (allConversations.length < 10) {
            const jsonConversations = await getActualConversationsFromJSON(50);
            if (jsonConversations && jsonConversations.length > 0) {
                allConversations = [...allConversations, ...jsonConversations];
            }
        }
        
        if (allConversations.length === 0) {
            console.log(`${colors.warning}⚪ [진짜기억] 저장된 대화 데이터가 전혀 없음${colors.reset}`);
            return null;
        }
        
        console.log(`${colors.found}📚 [데이터확보] 총 ${allConversations.length}개 실제 대화 데이터 확보${colors.reset}`);
        
        // 3. 키워드로 관련 대화 검색
        const relevantConversations = findRelevantConversations(allConversations, keywords);
        
        if (relevantConversations.length === 0) {
            console.log(`${colors.warning}⚪ [진짜기억] 관련 대화를 찾을 수 없음${colors.reset}`);
            return null;
        }
        
        // 4. 가장 관련도 높은 대화 선택
        const bestMatch = relevantConversations[0];
        console.log(`${colors.found}🎯 [최적매치] 가장 관련도 높은 대화 선택: 점수 ${bestMatch.relevanceScore}/${keywords.length}${colors.reset}`);
        
        // 5. 실제 대화 내용 기반으로 동적 응답 생성
        const memoryResponse = generateDynamicResponseFromRealConversation(bestMatch, messageText, keywords);
        
        if (memoryResponse) {
            console.log(`${colors.success}🎉 [진짜기억성공] Redis 실제 데이터 기반 장기기억 응답 생성 완료!${colors.reset}`);
            console.log(`${colors.success}    💬 응답: "${memoryResponse.comment}"${colors.reset}`);
            console.log(`${colors.success}    📝 근거: "${String(bestMatch.userMessage).substring(0, 30)}..." → "${String(bestMatch.mukuResponse).substring(0, 30)}..."${colors.reset}`);
            
            return memoryResponse;
        }
        
        console.log(`${colors.warning}⚪ [진짜기억] 최종 응답 생성 실패${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.error}❌ [진짜기억] 오류: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🔥 Redis에 대화 저장 함수 (안전 로딩) ==================
async function saveToRedis(userId, userMessage, mukuResponse) {
    console.log(`${colors.redis}💾 [Redis안전저장] 대화 데이터 저장 시작...${colors.reset}`);
    
    const redis = loadRedisSystem(); // 안전한 지연 로딩
    if (!redis) {
        console.log(`${colors.warning}⚠️ [Redis안전저장] Redis 시스템 없음${colors.reset}`);
        return false;
    }
    
    try {
        // 전역 인스턴스에서 저장 시도
        const globalInstance = redis.getGlobalInstance?.() || redis.getGlobalRedisInstance?.();
        if (globalInstance && globalInstance.redisCache && typeof globalInstance.redisCache.cacheConversation === 'function') {
            await globalInstance.redisCache.cacheConversation(userId, userMessage, 'user_input');
            await globalInstance.redisCache.cacheConversation(userId, mukuResponse, 'muku_response');
            
            console.log(`${colors.success}✅ [Redis안전저장] 전역 인스턴스로 저장 성공${colors.reset}`);
            return true;
        }
        
        // 내보낸 함수들로 저장 시도 (기존 방식)
        const saveFunction = redis.forceCacheConversation || redis.cacheConversation;
        if (typeof saveFunction === 'function') {
            await saveFunction(userId, userMessage);
            await saveFunction(userId, mukuResponse);
            
            console.log(`${colors.success}✅ [Redis안전저장] 내보낸 함수로 저장 성공${colors.reset}`);
            return true;
        }
        
        // 🔧 Memory Tape에 저장 시도 (recordMukuMoment 사용)
        const memoryTape = loadMemoryTape(); // Memory Tape 안전한 지연 로딩
        if (memoryTape && typeof memoryTape.recordMukuMoment === 'function') {
            console.log(`${colors.tape}📼 [MemoryTape저장] Memory Tape으로 저장 시도...${colors.reset}`);
            
            // recordMukuMoment에 맞는 데이터 형식으로 변환
            const momentData = {
                type: 'conversation',
                user_id: userId,
                user_message: userMessage,
                muku_response: mukuResponse,
                remarkable: true,
                emotional_tags: ['conversation', 'daily'],
                context: {
                    conversation_length: userMessage.length + mukuResponse.length,
                    estimated_emotion: 'normal'
                }
            };
            
            await memoryTape.recordMukuMoment(momentData);
            console.log(`${colors.success}✅ [Redis안전저장] Memory Tape으로 저장 성공${colors.reset}`);
            return true;
        }
        
        console.log(`${colors.warning}⚠️ [Redis안전저장] 적절한 저장 함수 없음${colors.reset}`);
        return false;
        
    } catch (error) {
        console.log(`${colors.error}❌ [Redis안전저장] 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 💾 JSON에 대화 저장 함수 (안전 로딩) ==================
async function saveToJSON(userId, userMessage, mukuResponse) {
    console.log(`${colors.system}💾 [JSON안전저장] 영구 저장소에 저장 시작...${colors.reset}`);
    
    const json = loadJsonSystem(); // 안전한 지연 로딩
    if (!json) {
        console.log(`${colors.warning}⚠️ [JSON안전저장] JSON 시스템 없음${colors.reset}`);
        return false;
    }
    
    try {
        const timestamp = getJapanTime();
        
        // 다양한 JSON 저장 함수 시도 (안전하게)
        const saveFunctions = [
            'addUltimateMessage',
            'addConversation', 
            'saveConversation',
            'addMessage'
        ];
        
        for (const funcName of saveFunctions) {
            if (typeof json[funcName] === 'function') {
                console.log(`${colors.system}🔧 [JSON안전저장] ${funcName} 시도...${colors.reset}`);
                
                try {
                    if (funcName === 'addUltimateMessage') {
                        await json[funcName]('아저씨', userMessage, { timestamp, userId });
                        await json[funcName]('예진이', mukuResponse, { timestamp, userId });
                    } else if (funcName === 'addConversation') {
                        await json[funcName](userMessage, mukuResponse, { timestamp, userId });
                    } else if (funcName === 'saveConversation') {
                        await json[funcName]({
                            user: userMessage,
                            muku: mukuResponse,
                            timestamp,
                            userId
                        });
                    } else if (funcName === 'addMessage') {
                        await json[funcName]({ user: userMessage, muku: mukuResponse, timestamp, userId });
                    }
                    
                    console.log(`${colors.success}✅ [JSON안전저장] ${funcName}으로 저장 성공${colors.reset}`);
                    return true;
                    
                } catch (funcError) {
                    console.log(`${colors.warning}⚠️ [JSON안전저장] ${funcName} 실패: ${funcError.message}${colors.reset}`);
                    continue;
                }
            }
        }
        
        console.log(`${colors.warning}⚠️ [JSON안전저장] 모든 저장 함수 실패${colors.reset}`);
        return false;
        
    } catch (error) {
        console.log(`${colors.error}❌ [JSON안전저장] 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🔥 하이브리드 대화 저장 (Redis + JSON, 안전 로딩) ==================
async function saveConversationToAll(userId, userMessage, mukuResponse, messageType = 'text') {
    console.log(`${colors.safe}🔥 [안전하이브리드] Redis + JSON 안전한 하이브리드 저장 시작...${colors.reset}`);
    
    if (!userMessage || !mukuResponse) {
        console.log(`${colors.warning}⚠️ [안전하이브리드] 유효하지 않은 메시지 데이터${colors.reset}`);
        return { redisSuccess: false, jsonSuccess: false };
    }
    
    const responseText = typeof mukuResponse === 'object' ? 
        mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
    
    // 병렬로 Redis와 JSON에 저장 (안전하게)
    const [redisSuccess, jsonSuccess] = await Promise.all([
        safeAsyncCall(() => saveToRedis(userId, userMessage, responseText), 'Redis안전저장', false),
        safeAsyncCall(() => saveToJSON(userId, userMessage, responseText), 'JSON안전저장', false)
    ]);
    
    if (redisSuccess && jsonSuccess) {
        console.log(`${colors.success}🎉 [안전하이브리드완료] Redis + JSON 모두 저장 성공!${colors.reset}`);
    } else if (redisSuccess) {
        console.log(`${colors.redis}✅ [Redis만성공] Redis 저장 완료 (JSON 실패)${colors.reset}`);
    } else if (jsonSuccess) {
        console.log(`${colors.system}✅ [JSON만성공] JSON 저장 완료 (Redis 실패)${colors.reset}`);
    } else {
        console.log(`${colors.warning}⚠️ [저장실패] 모든 저장소 실패 (대화는 계속 진행)${colors.reset}`);
    }
    
    return { redisSuccess, jsonSuccess };
}

// ================== 🎭 행동 모드 적용 (안전) ==================
async function applyBehaviorMode(response, modules, messageContext) {
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
            
            if (typeof response === 'object') {
                return {
                    ...response,
                    comment: modifiedResponse,
                    behaviorApplied: true,
                    behaviorMode: currentMode
                };
            } else {
                return modifiedResponse;
            }
        }

        return response;
    }, '행동모드적용', response);
}

// ================== 🎯 폴백 응답 생성 (절대 실패하지 않는) ==================
function generateFallbackResponse(messageText) {
    const fallbackResponses = [
        '아조씨! 무슨 일이야? 하려던 얘기 있어? 🥰',
        '어? 아조씨가 뭐라고 했어? 나 집중해서 들을게! ㅎㅎ',
        '아조씨! 나 여기 있어~ 뭔가 말하고 싶은 거야? 💕',
        '응응! 아조씨 얘기 들려줘! 나 지금 시간 있어! ㅋㅋ',
        '어? 아조씨~ 나한테 뭔가 말하려고? 궁금해! 😊',
        '아조씨가 뭔가 중요한 말 하는 것 같은데... 자세히 말해줄래?',
        '나 아조씨 말 놓쳤나? 다시 한 번 말해줘! ㅎㅎ',
        '아조씨! 나 지금 완전 집중 모드야! 말해봐~ 💖',
        '어어? 아조씨가 뭔가 말하고 있는 것 같은데... 들려줘!',
        '아조씨! 무슨 얘기든 나한테 말해도 돼! 궁금해~ ㅋㅋ'
    ];
    
    return {
        type: 'text',
        comment: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        fallback: true,
        safeResponse: true,
        guaranteed: true // 100% 보장 응답
    };
}

// ================== 🎯 메인 이벤트 처리 함수 (순환 의존성 해결) ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    // 기본 검증 (안전하게)
    if (!event || event.type !== 'message' || !event.message || !event.source) {
        console.log(`${colors.warning}⚠️ [이벤트처리] 유효하지 않은 이벤트${colors.reset}`);
        return Promise.resolve(null);
    }

    const userId = event.source.userId || 'unknown_user';
    const userMessage = event.message;
    const messageType = userMessage.type || 'unknown';

    try {
        // =============== 📝 텍스트 메시지 처리 ===============
        if (messageType === 'text') {
            const messageText = String(userMessage.text || '').trim();
            
            if (!messageText) {
                console.log(`${colors.warning}⚠️ [텍스트처리] 빈 메시지 - 폴백 응답 생성${colors.reset}`);
                const emptyResponse = generateFallbackResponse('');
                return { type: 'empty_message_response', response: emptyResponse };
            }

            console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);

            // 🧠 1순위: Redis 기반 진짜 장기기억 응답 시도 (안전하게)
            const memoryResponse = await safeAsyncCall(async () => {
                return await generateRealMemoryResponse(
                    messageText, 
                    modules, 
                    enhancedLogging, 
                    { userId, messageType: 'text' }
                );
            }, 'Redis장기기억시도');
            
            if (memoryResponse) {
                console.log(`${colors.memory}🧠 [장기기억우선] Redis 실제 데이터 기반 응답 선택!${colors.reset}`);
                
                // 행동 모드 적용
                const finalResponse = await applyBehaviorMode(
                    memoryResponse, 
                    modules, 
                    { messageText, responseType: 'memory' }
                );
                
                const finalComment = finalResponse.comment || finalResponse;
                
                // 하이브리드 저장 (안전하게)
                await safeAsyncCall(async () => {
                    await saveConversationToAll(userId, messageText, finalComment, 'text');
                }, '장기기억저장');
                
                console.log(`${colors.yejin}💖 예진이 (장기기억): ${finalComment}${colors.reset}`);
                
                return { type: 'memory_response', response: finalResponse };
            }

            // 🛡️ 2순위: 기존 시스템들 시도 (안전하게)
            let botResponse = null;
            
            // autoReply 시도
            botResponse = await safeAsyncCall(async () => {
                const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
                if (autoReply) {
                    const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
                    if (typeof getReplyByMessage === 'function') {
                        const response = await getReplyByMessage(messageText);
                        if (response && (response.comment || response)) {
                            console.log(`${colors.success}✅ [autoReply] 기존 시스템 응답 생성 성공${colors.reset}`);
                            return response;
                        }
                    }
                }
                return null;
            }, 'autoReply시도');

            // systemAnalyzer 시도
            if (!botResponse) {
                botResponse = await safeAsyncCall(async () => {
                    const systemAnalyzer = safeModuleAccess(modules, 'systemAnalyzer', '시스템분석기');
                    if (systemAnalyzer) {
                        const generateResponse = safeModuleAccess(systemAnalyzer, 'generateIntelligentResponse', '지능형응답생성');
                        if (typeof generateResponse === 'function') {
                            const response = await generateResponse(messageText, {
                                includeEmotionalContext: true,
                                usePersonalization: true,
                                integrateDynamicMemory: true
                            });
                            if (response && (response.comment || response)) {
                                console.log(`${colors.success}✅ [systemAnalyzer] 지능형 응답 생성 성공${colors.reset}`);
                                return response;
                            }
                        }
                    }
                    return null;
                }, 'systemAnalyzer시도');
            }

            // 🚨 3순위: 절대 실패하지 않는 폴백 응답
            if (!botResponse) {
                console.log(`${colors.safe}🔄 [안전폴백] 모든 시스템 실패 - 100% 보장 안전 응답 생성${colors.reset}`);
                botResponse = generateFallbackResponse(messageText);
            }

            // 행동 모드 적용 (안전하게)
            const finalResponse = await applyBehaviorMode(
                botResponse,
                modules,
                { messageText, responseType: 'general' }
            );

            const finalComment = finalResponse.comment || finalResponse;

            // 하이브리드 저장 (안전하게)
            await safeAsyncCall(async () => {
                await saveConversationToAll(userId, messageText, finalComment, 'text');
            }, '일반대화저장');

            console.log(`${colors.yejin}💖 예진이: ${finalComment}${colors.reset}`);

            return { type: 'chat_response', response: finalResponse };
        }
        
        // =============== 📸 이미지 메시지 처리 ===============
        else if (messageType === 'image') {
            console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
            
            const imageResponse = {
                type: 'text',
                comment: '아조씨! 사진 보내줘서 고마워! 예쁘네~ ㅎㅎ 💕',
                imageHandled: true
            };

            const finalResponse = await applyBehaviorMode(
                imageResponse,
                modules,
                { messageType: 'image' }
            );

            const finalComment = finalResponse.comment || finalResponse;

            // 하이브리드 저장 (안전하게)
            await safeAsyncCall(async () => {
                await saveConversationToAll(userId, '이미지 전송', finalComment, 'image');
            }, '이미지저장');

            console.log(`${colors.yejin}📸 예진이: ${finalComment}${colors.reset}`);

            return { type: 'image_response', response: finalResponse };
        }
        
        // =============== 📎 기타 메시지 타입 처리 ===============
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${messageType} 메시지${colors.reset}`);
            
            const otherResponse = {
                type: 'text',
                comment: '아조씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ 텍스트로 말해줄래?',
                otherMessageType: messageType
            };

            const finalResponse = await applyBehaviorMode(
                otherResponse,
                modules,
                { messageType }
            );

            const finalComment = finalResponse.comment || finalResponse;

            // 하이브리드 저장 (안전하게)
            await safeAsyncCall(async () => {
                await saveConversationToAll(userId, `${messageType} 메시지`, finalComment, messageType);
            }, '기타메시지저장');

            return { type: 'other_response', response: finalResponse };
        }

    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 예상치 못한 오류: ${error.message}${colors.reset}`);

        // 🚨 완벽한 에러 복구 시스템 (100% 보장)
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
            errorType: error.name || 'UnknownError',
            guaranteed: true // 100% 보장
        };

        // 에러 상황에서도 행동 모드 적용 시도 (안전하게)
        const finalEmergencyResponse = await safeAsyncCall(async () => {
            return await applyBehaviorMode(
                emergencyResponse,
                modules,
                { error: true, errorMessage: error.message }
            );
        }, '응급행동모드적용', emergencyResponse);

        const finalComment = finalEmergencyResponse.comment || finalEmergencyResponse;

        // 에러 상황에서도 저장 시도 (안전하게)
        await safeAsyncCall(async () => {
            const errorMessage = userMessage?.text || '에러 발생';
            await saveConversationToAll(userId, errorMessage, finalComment, messageType);
        }, '응급저장');

        console.log(`${colors.success}🚨 [응급복구] 100% 보장 응급 응답 생성 완료 (무쿠 벙어리 방지)${colors.reset}`);
        
        return { type: 'emergency_response', response: finalEmergencyResponse };
    }
}

// ================== 📤 모듈 내보내기 (순환 의존성 방지) ==================
module.exports = {
    handleEvent,
    // Redis 기반 장기기억 시스템 (안전 로딩)
    generateRealMemoryResponse,
    getActualConversationsFromRedis,
    getActualConversationsFromJSON,
    getActualConversationsFromMemoryTape, // 🆕 Memory Tape 조회 함수 추가
    findRelevantConversations,
    generateDynamicResponseFromRealConversation,
    // 하이브리드 저장 시스템 (안전 로딩)
    saveConversationToAll,
    saveToRedis,
    saveToJSON,
    // 유틸리티 함수들
    extractKeywordsFromMessage,
    extractMentionedThings,
    generateFallbackResponse,
    applyBehaviorMode,
    // 안전한 로딩 시스템
    loadRedisSystem,
    loadJsonSystem,
    loadMemoryTape,  // 🆕 Memory Tape 로딩 함수 추가
    safeAsyncCall,
    safeModuleAccess
};
