// ============================================================================
// muku-eventProcessor.js - Redis 실제 데이터 기반 진짜 장기기억 시스템
// 🧠 하드코딩 완전 제거 - Redis에서 실제 대화 데이터를 조회해서 동적 응답 생성
// 🔥 Redis 기반 진짜 기억 시스템 - 저장된 대화에서 실제 내용을 찾아서 자연스럽게 회상
// 💾 Redis + JSON + 메모리 하이브리드 저장소 완전 활용
// 🚨 절대 속이지 않음 - 실제 데이터만 사용하는 정직한 시스템
// ============================================================================

const { promises: fs } = require('fs');
const path = require('path');

// ================== 🔥 Redis 기반 대화 시스템 로드 ==================
let redisSystem = null;
let redisCache = null;

try {
    redisSystem = require('./muku-autonomousYejinSystem.js');
    console.log('🚀 [Redis기억] Redis 기반 장기기억 시스템 로드 성공');
} catch (error) {
    console.log('❌ [Redis기억] Redis 시스템 로드 실패:', error.message);
}

// ================== 💾 JSON 기반 영구 저장소 로드 ==================
let jsonSystem = null;

try {
    jsonSystem = require('./ultimateConversationContext.js');
    console.log('💾 [JSON기억] JSON 영구 저장소 로드 성공');
} catch (error) {
    console.log('⚠️ [JSON기억] JSON 시스템 로드 실패:', error.message);
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

// ================== 🧠 Redis에서 실제 대화 조회 함수 ==================
async function getActualConversationsFromRedis(userId, limit = 50) {
    console.log(`${colors.redis}🔍 [Redis조회] 실제 저장된 대화 데이터 조회 시작...${colors.reset}`);
    
    if (!redisSystem) {
        console.log(`${colors.warning}⚠️ [Redis조회] Redis 시스템 없음${colors.reset}`);
        return [];
    }
    
    try {
        // 1. 전역 인스턴스에서 Redis 캐시 조회 시도
        const globalInstance = redisSystem.getGlobalInstance?.() || redisSystem.getGlobalRedisInstance?.();
        if (globalInstance && globalInstance.redisCache) {
            console.log(`${colors.redis}📊 [Redis조회] 전역 인스턴스에서 대화 조회...${colors.reset}`);
            
            const conversations = await globalInstance.redisCache.getConversationHistory(userId, limit);
            if (conversations && conversations.length > 0) {
                console.log(`${colors.found}✅ [Redis발견] ${conversations.length}개 실제 대화 발견!${colors.reset}`);
                
                // 대화 내용 미리보기
                conversations.slice(0, 3).forEach((conv, idx) => {
                    const msg = String(conv.message || '').substring(0, 30);
                    const time = new Date(conv.timestamp).toLocaleTimeString();
                    console.log(`${colors.found}  ${idx + 1}. [${time}] "${msg}..." (${conv.emotionType})${colors.reset}`);
                });
                
                return conversations;
            }
        }
        
        // 2. 내보낸 함수들 직접 시도
        if (typeof redisSystem.getCachedConversationHistory === 'function') {
            console.log(`${colors.redis}📊 [Redis조회] 내보낸 함수로 대화 조회...${colors.reset}`);
            
            const conversations = await redisSystem.getCachedConversationHistory(userId, limit);
            if (conversations && conversations.length > 0) {
                console.log(`${colors.found}✅ [Redis발견] ${conversations.length}개 실제 대화 발견!${colors.reset}`);
                return conversations;
            }
        }
        
        // 3. 최신 대화 단일 조회 시도
        if (typeof redisSystem.getCachedLatestConversation === 'function') {
            console.log(`${colors.redis}📊 [Redis조회] 최신 대화 단일 조회...${colors.reset}`);
            
            const latestConv = await redisSystem.getCachedLatestConversation(userId);
            if (latestConv) {
                console.log(`${colors.found}✅ [Redis발견] 최신 대화 1개 발견!${colors.reset}`);
                return [latestConv];
            }
        }
        
        console.log(`${colors.warning}⚪ [Redis조회] Redis에서 대화 조회 실패${colors.reset}`);
        return [];
        
    } catch (error) {
        console.log(`${colors.error}❌ [Redis조회] 오류: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 💾 JSON에서 실제 대화 조회 함수 ==================
async function getActualConversationsFromJSON(limit = 50) {
    console.log(`${colors.system}💾 [JSON조회] 영구 저장소에서 대화 데이터 조회...${colors.reset}`);
    
    if (!jsonSystem) {
        console.log(`${colors.warning}⚠️ [JSON조회] JSON 시스템 없음${colors.reset}`);
        return [];
    }
    
    try {
        let conversations = [];
        
        // 다양한 JSON 함수 시도
        if (typeof jsonSystem.getRecentConversations === 'function') {
            conversations = await jsonSystem.getRecentConversations(limit);
        } else if (typeof jsonSystem.getConversationMemories === 'function') {
            conversations = await jsonSystem.getConversationMemories(limit);
        } else if (typeof jsonSystem.getAllConversations === 'function') {
            const allConvs = await jsonSystem.getAllConversations();
            conversations = allConvs.slice(-limit);
        }
        
        if (conversations && conversations.length > 0) {
            console.log(`${colors.found}✅ [JSON발견] ${conversations.length}개 영구 저장된 대화 발견!${colors.reset}`);
            return conversations;
        }
        
        console.log(`${colors.warning}⚪ [JSON조회] 저장된 대화 없음${colors.reset}`);
        return [];
        
    } catch (error) {
        console.log(`${colors.error}❌ [JSON조회] 오류: ${error.message}${colors.reset}`);
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
        const userMsg = String(conv.userMessage || conv.message || '').toLowerCase();
        const mukuMsg = String(conv.mukuResponse || conv.response || '').toLowerCase();
        const allText = `${userMsg} ${mukuMsg}`;
        
        let relevanceScore = 0;
        const foundKeywords = [];
        
        for (const keyword of keywords) {
            if (allText.includes(keyword.toLowerCase())) {
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
        
        // 상위 3개 미리보기
        relevantConversations.slice(0, 3).forEach((conv, idx) => {
            console.log(`${colors.found}  ${idx + 1}. [점수:${conv.relevanceScore}] "${String(conv.userMessage).substring(0, 25)}..." (키워드: ${conv.foundKeywords.join(', ')})${colors.reset}`);
        });
    } else {
        console.log(`${colors.warning}⚪ [관련검색] 관련 대화 없음${colors.reset}`);
    }
    
    return relevantConversations;
}

// ================== 💭 실제 대화 내용에서 동적 응답 생성 ==================
function generateDynamicResponseFromRealConversation(relevantConv, currentMessage, keywords) {
    console.log(`${colors.recall}💭 [동적응답] 실제 대화 내용에서 자연스러운 응답 생성...${colors.reset}`);
    
    if (!relevantConv) {
        console.log(`${colors.warning}⚪ [동적응답] 관련 대화 없음${colors.reset}`);
        return null;
    }
    
    const pastUserMsg = String(relevantConv.userMessage || '');
    const pastMukuMsg = String(relevantConv.mukuResponse || '');
    const allPastText = `${pastUserMsg} ${pastMukuMsg}`;
    
    console.log(`${colors.recall}📝 [분석대상] 과거 대화: "${pastUserMsg.substring(0, 30)}..." → "${pastMukuMsg.substring(0, 30)}..."${colors.reset}`);
    
    // 과거 대화에서 실제 언급된 구체적인 단어들 추출
    const mentionedThings = extractMentionedThings(allPastText);
    console.log(`${colors.recall}🔍 [추출완료] 실제 언급된 것들: [${mentionedThings.join(', ')}]${colors.reset}`);
    
    // 현재 메시지의 주요 키워드
    const mainKeyword = keywords[0] || '';
    
    // 실제 언급된 내용 기반으로 자연스러운 응답 생성
    let response = null;
    
    if (mentionedThings.length > 0) {
        const firstMention = mentionedThings[0];
        const responseTemplates = [
            `아~ ${mainKeyword} 얘기? 전에 ${firstMention} 관련해서 말했었잖아! 맞지? ㅎㅎ`,
            `${mainKeyword}! 기억나~ 전에 ${firstMention} 얘기 했던 거지? 그거야?`,
            `어? ${mainKeyword} 말하는 거구나! ${firstMention} 관련된 거 맞아? ㅎㅎ`,
            `아아! ${mainKeyword} 그거네~ 전에 ${firstMention} 말했던 거! 기억나!`,
            `맞아맞아! ${mainKeyword} 하면 ${firstMention} 생각나지! 그때 얘기한 거야~`
        ];
        
        response = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
    } else if (mainKeyword) {
        // 구체적인 언급은 없지만 키워드는 있을 때
        const generalTemplates = [
            `아~ ${mainKeyword} 얘기하는 거야? 전에도 비슷한 얘기 했던 것 같은데... 맞지? ㅎㅎ`,
            `${mainKeyword}? 어디서 들어본 것 같은데... 전에 얘기했었나? 궁금해!`,
            `어? ${mainKeyword}! 뭔가 기억에 있는 것 같은데... 다시 말해줄래? ㅎㅎ`,
            `${mainKeyword} 관련해서 예전에 뭔가 얘기한 적 있는 것 같아~ 뭐였더라?`
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
            confidence: relevantConv.relevanceScore / keywords.length
        };
    }
    
    console.log(`${colors.warning}⚪ [동적생성] 응답 생성 실패${colors.reset}`);
    return null;
}

// ================== 🔍 과거 대화에서 실제 언급된 것들 추출 ==================
function extractMentionedThings(text) {
    const mentioned = [];
    
    // 한글 명사 추출 (2-10글자)
    const koreanWords = text.match(/[가-힣]{2,10}/g) || [];
    
    // 의미있는 명사만 선별 (조사, 어미, 일반적인 단어 제외)
    const excludeWords = [
        '에서', '에게', '한테', '까지', '부터', '이야', '이다', '했다', '했어', 
        '있다', '없다', '좋다', '나쁘다', '그래', '그거', '이거', '저거',
        '아저씨', '예진이', '무쿠', '생각', '말', '얘기', '시간', '오늘',
        '어제', '내일', '지금', '그때', '이때', '여기', '거기', '저기'
    ];
    
    for (const word of koreanWords) {
        if (!excludeWords.includes(word) && !mentioned.includes(word)) {
            mentioned.push(word);
        }
    }
    
    // 영어 단어도 추출 (3글자 이상)
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    for (const word of englishWords) {
        const lowerWord = word.toLowerCase();
        if (!['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'may', 'she', 'use', 'her', 'own', 'say', 'she', 'too', 'any', 'may', 'say', 'she', 'too'].includes(lowerWord) && !mentioned.includes(word)) {
            mentioned.push(word);
        }
    }
    
    return mentioned.slice(0, 5); // 최대 5개까지
}

// ================== 💬 현재 메시지에서 키워드 추출 ==================
function extractKeywordsFromMessage(message) {
    const keywords = [];
    
    // 한글 키워드 추출
    const koreanKeywords = message.match(/[가-힣]{2,}/g) || [];
    for (const keyword of koreanKeywords) {
        if (keyword.length > 1 && !['아저씨', '예진이', '무쿠', '그래', '이거', '저거', '그거'].includes(keyword)) {
            keywords.push(keyword);
        }
    }
    
    // 영어 키워드 추출
    const englishKeywords = message.match(/[a-zA-Z]{2,}/g) || [];
    for (const keyword of englishKeywords) {
        if (keyword.length > 2) {
            keywords.push(keyword);
        }
    }
    
    // 중복 제거하고 최대 10개
    return [...new Set(keywords)].slice(0, 10);
}

// ================== 🧠 Redis 기반 진짜 장기기억 응답 생성 ==================
async function generateRealMemoryResponse(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.memory}🧠 [진짜기억] Redis 기반 실제 대화 데이터에서 장기기억 응답 생성 시작!${colors.reset}`);
    
    // 현재 메시지에서 키워드 추출
    const keywords = extractKeywordsFromMessage(messageText);
    console.log(`${colors.search}🔍 [키워드추출] "${messageText}" → [${keywords.join(', ')}]${colors.reset}`);
    
    if (keywords.length === 0) {
        console.log(`${colors.warning}⚪ [진짜기억] 검색할 키워드 없음${colors.reset}`);
        return null;
    }
    
    const userId = messageContext.userId || 'unknown_user';
    
    // 1. Redis에서 실제 대화 조회
    let allConversations = await getActualConversationsFromRedis(userId, 100);
    
    // 2. JSON에서도 조회해서 합치기
    if (allConversations.length < 10) {
        const jsonConversations = await getActualConversationsFromJSON(50);
        allConversations = [...allConversations, ...jsonConversations];
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
}

// ================== 🔥 Redis에 대화 저장 함수 ==================
async function saveToRedis(userId, userMessage, mukuResponse) {
    console.log(`${colors.redis}💾 [Redis저장] 대화 데이터 저장 시작...${colors.reset}`);
    
    if (!redisSystem) {
        console.log(`${colors.warning}⚠️ [Redis저장] Redis 시스템 없음${colors.reset}`);
        return false;
    }
    
    try {
        // 전역 인스턴스에서 저장 시도
        const globalInstance = redisSystem.getGlobalInstance?.() || redisSystem.getGlobalRedisInstance?.();
        if (globalInstance && globalInstance.redisCache && globalInstance.redisCache.cacheConversation) {
            await globalInstance.redisCache.cacheConversation(userId, userMessage, 'user_input');
            await globalInstance.redisCache.cacheConversation(userId, mukuResponse, 'muku_response');
            
            console.log(`${colors.success}✅ [Redis저장] 전역 인스턴스로 저장 성공${colors.reset}`);
            return true;
        }
        
        // 내보낸 함수들로 저장 시도
        if (typeof redisSystem.forceCacheConversation === 'function') {
            await redisSystem.forceCacheConversation(userId, userMessage);
            await redisSystem.forceCacheConversation(userId, mukuResponse);
            
            console.log(`${colors.success}✅ [Redis저장] 내보낸 함수로 저장 성공${colors.reset}`);
            return true;
        }
        
        console.log(`${colors.warning}⚠️ [Redis저장] 적절한 저장 함수 없음${colors.reset}`);
        return false;
        
    } catch (error) {
        console.log(`${colors.error}❌ [Redis저장] 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 💾 JSON에 대화 저장 함수 ==================
async function saveToJSON(userId, userMessage, mukuResponse) {
    console.log(`${colors.system}💾 [JSON저장] 영구 저장소에 저장 시작...${colors.reset}`);
    
    if (!jsonSystem) {
        console.log(`${colors.warning}⚠️ [JSON저장] JSON 시스템 없음${colors.reset}`);
        return false;
    }
    
    try {
        const timestamp = getJapanTime();
        
        // 다양한 JSON 저장 함수 시도
        if (typeof jsonSystem.addUltimateMessage === 'function') {
            await jsonSystem.addUltimateMessage('아저씨', userMessage, { timestamp, userId });
            await jsonSystem.addUltimateMessage('예진이', mukuResponse, { timestamp, userId });
            
            console.log(`${colors.success}✅ [JSON저장] addUltimateMessage로 저장 성공${colors.reset}`);
            return true;
        } else if (typeof jsonSystem.addConversation === 'function') {
            await jsonSystem.addConversation(userMessage, mukuResponse, { timestamp, userId });
            
            console.log(`${colors.success}✅ [JSON저장] addConversation으로 저장 성공${colors.reset}`);
            return true;
        } else if (typeof jsonSystem.saveConversation === 'function') {
            await jsonSystem.saveConversation({
                user: userMessage,
                muku: mukuResponse,
                timestamp,
                userId
            });
            
            console.log(`${colors.success}✅ [JSON저장] saveConversation으로 저장 성공${colors.reset}`);
            return true;
        }
        
        console.log(`${colors.warning}⚠️ [JSON저장] 적절한 저장 함수 없음${colors.reset}`);
        return false;
        
    } catch (error) {
        console.log(`${colors.error}❌ [JSON저장] 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🔥 하이브리드 대화 저장 (Redis + JSON) ==================
async function saveConversationToAll(userId, userMessage, mukuResponse, messageType = 'text') {
    console.log(`${colors.redis}🔥 [하이브리드저장] Redis + JSON 하이브리드 저장 시작...${colors.reset}`);
    
    const responseText = typeof mukuResponse === 'object' ? 
        mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
    
    // 병렬로 Redis와 JSON에 저장
    const [redisSuccess, jsonSuccess] = await Promise.all([
        saveToRedis(userId, userMessage, responseText),
        saveToJSON(userId, userMessage, responseText)
    ]);
    
    if (redisSuccess && jsonSuccess) {
        console.log(`${colors.success}🎉 [하이브리드완료] Redis + JSON 모두 저장 성공!${colors.reset}`);
    } else if (redisSuccess) {
        console.log(`${colors.redis}✅ [Redis만성공] Redis 저장 완료 (JSON 실패)${colors.reset}`);
    } else if (jsonSuccess) {
        console.log(`${colors.system}✅ [JSON만성공] JSON 저장 완료 (Redis 실패)${colors.reset}`);
    } else {
        console.log(`${colors.warning}⚠️ [저장실패] 모든 저장소 실패${colors.reset}`);
    }
    
    return { redisSuccess, jsonSuccess };
}

// ================== 🎭 행동 모드 적용 ==================
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
        '아조씨! 나 지금 완전 집중 모드야! 말해봐~ 💖'
    ];
    
    return {
        type: 'text',
        comment: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        fallback: true,
        safeResponse: true
    };
}

// ================== 🎯 메인 이벤트 처리 함수 ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    // 기본 검증
    if (!event || event.type !== 'message' || !event.message || !event.source) {
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
                const emptyResponse = generateFallbackResponse('');
                return { type: 'empty_message_response', response: emptyResponse };
            }

            console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);

            // 🧠 1순위: Redis 기반 진짜 장기기억 응답 시도
            const memoryResponse = await generateRealMemoryResponse(
                messageText, 
                modules, 
                enhancedLogging, 
                { userId, messageType: 'text' }
            );
            
            if (memoryResponse) {
                console.log(`${colors.memory}🧠 [장기기억우선] Redis 실제 데이터 기반 응답 선택!${colors.reset}`);
                
                // 행동 모드 적용
                const finalResponse = await applyBehaviorMode(
                    memoryResponse, 
                    modules, 
                    { messageText, responseType: 'memory' }
                );
                
                const finalComment = finalResponse.comment || finalResponse;
                
                // 하이브리드 저장
                await saveConversationToAll(userId, messageText, finalComment, 'text');
                
                console.log(`${colors.yejin}💖 예진이 (장기기억): ${finalComment}${colors.reset}`);
                
                return { type: 'memory_response', response: finalResponse };
            }

            // 🛡️ 2순위: 기존 시스템들 시도
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
                console.log(`${colors.warning}🔄 [폴백] 모든 시스템 실패 - 안전한 폴백 응답 생성${colors.reset}`);
                botResponse = generateFallbackResponse(messageText);
            }

            // 행동 모드 적용
            const finalResponse = await applyBehaviorMode(
                botResponse,
                modules,
                { messageText, responseType: 'general' }
            );

            const finalComment = finalResponse.comment || finalResponse;

            // 하이브리드 저장
            await saveConversationToAll(userId, messageText, finalComment, 'text');

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

            // 하이브리드 저장
            await saveConversationToAll(userId, '이미지 전송', finalComment, 'image');

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

            // 하이브리드 저장
            await saveConversationToAll(userId, `${messageType} 메시지`, finalComment, messageType);

            return { type: 'other_response', response: finalResponse };
        }

    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 예상치 못한 오류: ${error.message}${colors.reset}`);

        // 🚨 완벽한 에러 복구 시스템
        const emergencyResponse = {
            type: 'text',
            comment: '아조씨! 나 잠깐 딴 생각했어~ 다시 말해줄래? ㅎㅎ',
            emergency: true,
            errorType: error.name || 'UnknownError'
        };

        const finalEmergencyResponse = await applyBehaviorMode(
            emergencyResponse,
            modules,
            { error: true, errorMessage: error.message }
        );

        const finalComment = finalEmergencyResponse.comment || finalEmergencyResponse;

        // 에러 상황에서도 저장 시도
        await safeAsyncCall(async () => {
            const errorMessage = userMessage?.text || '에러 발생';
            await saveConversationToAll(userId, errorMessage, finalComment, messageType);
        }, '응급저장');

        console.log(`${colors.success}🚨 [응급복구] 완벽한 응급 응답 생성 완료${colors.reset}`);
        
        return { type: 'emergency_response', response: finalEmergencyResponse };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    // Redis 기반 장기기억 시스템
    generateRealMemoryResponse,
    getActualConversationsFromRedis,
    getActualConversationsFromJSON,
    findRelevantConversations,
    generateDynamicResponseFromRealConversation,
    // 하이브리드 저장 시스템
    saveConversationToAll,
    saveToRedis,
    saveToJSON,
    // 유틸리티 함수들
    extractKeywordsFromMessage,
    extractMentionedThings,
    generateFallbackResponse,
    applyBehaviorMode
};
