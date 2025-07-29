// ============================================================================
// muku-eventProcessor.js - 올바른 우선순위 구조 (장기기억 1순위 완전 제거)
// 🚨 중요: 장기기억은 "기억나?" 질문일 때만 작동! 일반 대화는 autoReply.js 위임!
// 🎯 autoReply.js가 모든 처리를 담당하고, 여기서는 최소한의 중재만 함
// 🛡️ 무쿠 벙어리 방지 100% 보장
// 💕 사진 명령어, 감정표현 등은 autoReply.js에서 즉시 처리됨
// ============================================================================

const { promises: fs } = require('fs');
const path = require('path');

// ================== 🔥 안전한 지연 로딩 시스템 ==================
let redisSystem = null;
let jsonSystem = null;
let memoryTape = null;
let redisSystemLoaded = false;
let jsonSystemLoaded = false;
let memoryTapeLoaded = false;

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
        redisSystemLoaded = true;
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
        jsonSystemLoaded = true;
        return null;
    }
}

function loadMemoryTape() {
    if (memoryTapeLoaded) return memoryTape;
    
    try {
        memoryTape = require('../data/memory-tape/muku-memory-tape.js');
        memoryTapeLoaded = true;
        console.log('📼 [MemoryTape안전로드] Memory Tape 시스템 지연 로드 성공');
        return memoryTape;
    } catch (error) {
        console.log('⚠️ [MemoryTape안전로드] Memory Tape 시스템 로드 실패:', error.message);
        memoryTapeLoaded = true;
        return null;
    }
}

// ================== 🎨 색상 정의 ==================
const colors = {
    memory: '\x1b[1m\x1b[95m',    // 굵은 마젠타색 (장기기억)
    yejin: '\x1b[95m',            // 연보라색 (예진이)
    ajeossi: '\x1b[96m',          // 하늘색 (아저씨)
    system: '\x1b[92m',           // 연초록색 (시스템)
    error: '\x1b[91m',            // 빨간색 (에러)
    success: '\x1b[32m',          // 초록색 (성공)
    warning: '\x1b[93m',          // 노란색 (경고)
    safe: '\x1b[1m\x1b[32m',      // 굵은 초록색 (안전)
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

// ================== 🔍 문자열 유사도 계산 함수 ==================
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// ================== 🎯 "기억나?" 질문 판별 함수 ==================
function isSpecificMemoryQuestion(messageText) {
    if (!messageText || typeof messageText !== 'string') {
        return false;
    }
    
    const message = messageText.toLowerCase().trim();
    console.log(`🔍 [기억질문판별] 메시지 분석: "${message}"`);
    
    // 🔍 정말 명확한 기억 질문만 감지
    const explicitMemoryPatterns = [
        /기억.*나/, /기억.*해/, /기억.*못/, /기억.*안/,    // "기억나?", "기억해?", "기억 못해?", "기억 안 나?"
        /말했.*거/, /얘기했.*거/, /했던.*거/,              // "말했던 거", "얘기했던 거", "했던 거"
        /그때.*뭐/, /그날.*뭐/, /언제.*했/,                // "그때 뭐", "그날 뭐", "언제 했"
        /어제.*뭐/, /그제.*뭐/, /지난.*뭐/,                // "어제 뭐", "그제 뭐", "지난 뭐"
        /알고.*있/, /알아.*둬/, /잊어.*버/                  // "알고 있어?", "알아둬", "잊어버렸어?"
    ];
    
    // 패턴 매칭 확인
    const isExplicitMemoryQuestion = explicitMemoryPatterns.some(pattern => {
        const match = pattern.test(message);
        if (match) {
            console.log(`🔍 [기억질문판별] ✅ 명확한 기억 질문 패턴 매칭: ${pattern.source}`);
        }
        return match;
    });
    
    if (isExplicitMemoryQuestion) {
        console.log(`🔍 [기억질문판별] ✅ EXPLICIT MEMORY QUESTION: "${message}"`);
        return true;
    } else {
        console.log(`🔍 [기억질문판별] ❌ NOT MEMORY QUESTION: "${message}" - autoReply.js로 위임`);
        return false;
    }
}

// ================== 🧠 장기기억 응답 생성 (명확한 기억 질문일 때만) ==================
async function generateMemoryResponseForExplicitQuestion(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.memory}🧠 [명확기억질문] 명확한 기억 질문에 대한 장기기억 응답 생성 시작!${colors.reset}`);
    
    if (!messageText || typeof messageText !== 'string') {
        console.log(`${colors.warning}⚠️ [명확기억질문] 유효하지 않은 메시지 텍스트${colors.reset}`);
        return null;
    }
    
    const userId = messageContext.userId || 'unknown_user';
    
    try {
        // 현재 메시지에서 키워드 추출
        const keywords = extractKeywordsFromMessage(messageText);
        console.log(`${colors.memory}🔍 [키워드추출] "${messageText}" → [${keywords.join(', ')}]${colors.reset}`);
        
        if (keywords.length === 0) {
            console.log(`${colors.warning}⚠️ [명확기억질문] 검색할 키워드 없음${colors.reset}`);
            return null;
        }
        
        // Memory Tape에서 관련 대화 조회
        const memoryTape = loadMemoryTape();
        if (!memoryTape) {
            console.log(`${colors.warning}⚠️ [명확기억질문] Memory Tape 시스템 없음${colors.reset}`);
            return null;
        }
        
        // 오늘 기억들 조회
        const todayMemories = await memoryTape.readDailyMemories();
        let conversations = [];
        
        if (todayMemories && todayMemories.moments && Array.isArray(todayMemories.moments)) {
            const conversationMoments = todayMemories.moments
                .filter(moment => moment && moment.type === 'conversation')
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            
            for (const moment of conversationMoments) {
                if (moment.user_message && moment.muku_response) {
                    conversations.push({
                        userMessage: moment.user_message,
                        mukuResponse: moment.muku_response,
                        timestamp: moment.timestamp,
                        source: 'memory_tape'
                    });
                }
            }
        }
        
        if (conversations.length === 0) {
            console.log(`${colors.warning}⚠️ [명확기억질문] 관련 기억 없음${colors.reset}`);
            return {
                type: 'text',
                comment: '음... 그거 언제 얘기했더라? 나 기억이 가물가물해 ㅠㅠ 다시 얘기해줄래?',
                memoryNotFound: true
            };
        }
        
        // 🚨 강력한 앵무새 방지 - 현재 질문과 최근 5분 내 동일/유사 질문 완전 제외
        const now = Date.now();
        const filteredConversations = conversations.filter(conv => {
            const userMsg = String(conv.userMessage || '').toLowerCase().trim();
            const currentMsg = messageText.toLowerCase().trim();
            
            // 1. 완전 동일한 메시지 제외
            if (userMsg === currentMsg) {
                console.log(`🚫 [앵무새방지] 완전 동일 메시지 제외: "${userMsg}"`);
                return false;
            }
            
            // 2. 최근 5분 내 메시지는 제외 (현재 질문이 바로 저장되는 문제 해결)
            const convTime = new Date(conv.timestamp).getTime();
            if (now - convTime < 5 * 60 * 1000) { // 5분
                console.log(`🚫 [앵무새방지] 최근 5분 내 메시지 제외: "${userMsg}"`);
                return false;
            }
            
            // 3. 핵심 키워드만 같고 문장 구조가 같으면 제외 (질문의 앵무새 방지)
            if (currentMsg.includes('기억나') && userMsg.includes('기억나') && userMsg.includes('모지코')) {
                const similarity = calculateSimilarity(userMsg, currentMsg);
                if (similarity > 0.7) { // 70% 이상 유사하면 제외
                    console.log(`🚫 [앵무새방지] 유사한 질문 제외 (${(similarity*100).toFixed(1)}%): "${userMsg}"`);
                    return false;
                }
            }
            
            return true;
        });
        
        console.log(`🛡️ [앵무새방지] ${conversations.length}개 → ${filteredConversations.length}개로 강력 필터링`);
        
        // 키워드로 관련 대화 검색
        const relevantConversations = findRelevantConversations(filteredConversations, keywords);
        
        if (relevantConversations.length === 0) {
            return {
                type: 'text',
                comment: '음... 그거 언제 얘기했더라? 나 기억이 가물가물해 ㅠㅠ 다시 얘기해줄래?',
                memoryNotFound: true
            };
        }
        
        // 가장 관련도 높은 대화 선택
        const bestMatch = relevantConversations[0];
        console.log(`${colors.memory}🎯 [최적매치] 가장 관련도 높은 기억 발견!${colors.reset}`);
        
        // 실제 기억 내용 기반으로 응답 생성
        const pastUserMsg = String(bestMatch.userMessage || '');
        const pastMukuMsg = String(bestMatch.mukuResponse || '');
        
        if (pastUserMsg.trim()) {
            const memoryResponses = [
                `아! 기억나! "${pastUserMsg}"라고 했었잖아! 맞지? ㅎㅎ`,
                `어어! 그거 기억해! "${pastUserMsg}"라고 말했던 거! 맞아맞아!`,
                `아~ 그때! "${pastUserMsg}"라고 했었지! 나도 기억해!`,
                `맞아! "${pastUserMsg}"라고 말했었어! 기억하고 있었어~ ㅋㅋ`,
                `그거구나! "${pastUserMsg}"라고 했던 거! 어떻게 잊어! 💕`
            ];
            
            const response = memoryResponses[Math.floor(Math.random() * memoryResponses.length)];
            
            console.log(`${colors.success}✅ [명확기억성공] 장기기억 응답 생성 완료!${colors.reset}`);
            
            return {
                type: 'text',
                comment: response,
                memoryUsed: true,
                basedOnActualMemory: true,
                sourceMemory: {
                    userMessage: pastUserMsg,
                    mukuResponse: pastMukuMsg
                }
            };
        }
        
        console.log(`${colors.warning}⚠️ [명확기억질문] 최종 응답 생성 실패${colors.reset}`);
        return null;
        
    } catch (error) {
        console.log(`${colors.error}❌ [명확기억질문] 오류: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🔍 키워드로 관련 대화 검색 함수 ==================
function findRelevantConversations(conversations, keywords) {
    console.log(`🔍 [관련검색] 키워드로 관련 대화 검색: [${keywords.join(', ')}]`);
    
    if (!conversations || conversations.length === 0) {
        console.log(`⚠️ [관련검색] 검색할 대화 없음`);
        return [];
    }
    
    const relevantConversations = [];
    
    for (const conv of conversations) {
        if (!conv) continue;
        
        const userMsg = String(conv.userMessage || '').toLowerCase();
        const mukuMsg = String(conv.mukuResponse || '').toLowerCase();
        const allText = `${userMsg} ${mukuMsg}`;
        
        if (!allText.trim()) continue;
        
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
                foundKeywords
            });
        }
    }
    
    // 관련도 순으로 정렬
    relevantConversations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (relevantConversations.length > 0) {
        console.log(`✅ [관련발견] ${relevantConversations.length}개 관련 대화 발견!`);
    } else {
        console.log(`⚠️ [관련검색] 관련 대화 없음`);
    }
    
    return relevantConversations;
}

// ================== 💬 현재 메시지에서 의미있는 키워드만 추출 ==================
function extractKeywordsFromMessage(message) {
    if (!message || typeof message !== 'string') return [];
    
    const keywords = [];
    
    try {
        // 🚨 일반적인 단어들 제외 리스트 (대폭 확장)
        const excludeWords = [
            // 일반적인 조사/어미
            '에서', '에게', '한테', '까지', '부터', '이야', '이다', '했다', '했어', 
            '있다', '없다', '좋다', '나쁘다', '그래', '그거', '이거', '저거',
            // 일반적인 호칭/대명사
            '아저씨', '예진이', '무쿠', '나', '너', '우리', '그들',
            // 일반적인 시간 표현
            '오늘', '어제', '내일', '지금', '그때', '이때', '예전에', '언제',
            // 일반적인 장소 표현  
            '여기', '거기', '저기', '집에서', '밖에서',
            // 일반적인 동작
            '했던', '하는', '할', '된', '되는', '될', '들었던', '듣는', '들을',
            // 일반적인 감정/상태
            '생각', '말', '얘기', '시간', '사람', '것', '때', '곳', '일', '거'
        ];
        
        // 한글 키워드 추출 (3글자 이상만, 의미있는 명사만)
        const koreanKeywords = message.match(/[가-힣]{3,}/g) || [];
        for (const keyword of koreanKeywords) {
            if (keyword && !excludeWords.includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        // 영어 키워드 추출 (3글자 이상)
        const englishKeywords = message.match(/[a-zA-Z]{3,}/g) || [];
        const commonEnglishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
        for (const keyword of englishKeywords) {
            if (keyword && !commonEnglishWords.includes(keyword.toLowerCase())) {
                keywords.push(keyword);
            }
        }
        
        // 🎯 핵심: 고유명사나 특별한 키워드 우선 추출
        const specialKeywords = [];
        const text = message.toLowerCase();
        
        // 장소명
        if (text.includes('모지코')) specialKeywords.push('모지코');
        if (text.includes('기타큐슈')) specialKeywords.push('기타큐슈');
        
        // 음악/노래
        if (text.includes('음악')) specialKeywords.push('음악');
        if (text.includes('노래')) specialKeywords.push('노래');
        if (text.includes('키세키')) specialKeywords.push('키세키');
        
        // 물건/선물
        if (text.includes('슈퍼타쿠마')) specialKeywords.push('슈퍼타쿠마');
        if (text.includes('렌즈')) specialKeywords.push('렌즈');
        if (text.includes('카메라')) specialKeywords.push('카메라');
        
        // 활동
        if (text.includes('사진')) specialKeywords.push('사진');
        if (text.includes('담배') || text.includes('담타')) specialKeywords.push('담타');
        
        // 특별한 키워드가 있으면 우선 사용
        if (specialKeywords.length > 0) {
            console.log(`🎯 [특별키워드] 발견: [${specialKeywords.join(', ')}]`);
            return [...new Set([...specialKeywords, ...keywords])].slice(0, 3); // 최대 3개
        }
        
        // 중복 제거하고 최대 3개 (너무 많으면 매칭 정확도 떨어짐)
        const finalKeywords = [...new Set(keywords)].slice(0, 3);
        
        if (finalKeywords.length === 0) {
            console.log(`⚠️ [키워드없음] "${message}" - 의미있는 키워드 없음`);
        }
        
        return finalKeywords;
        
    } catch (error) {
        console.log(`⚠️ [키워드추출] 오류: ${error.message}`);
        return [];
    }
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

        console.log(`🎭 [행동모드] 현재 모드: ${currentMode}`);

        const applyBehaviorToResponse = safeModuleAccess(behaviorSwitch, 'applyBehaviorToResponse', '행동적용');
        if (typeof applyBehaviorToResponse !== 'function') return response;

        const responseText = response.comment || response;
        const modifiedResponse = applyBehaviorToResponse(responseText, messageContext || {});

        if (modifiedResponse && modifiedResponse !== responseText) {
            console.log(`✨ [행동적용] ${currentMode} 모드로 응답 변경`);
            
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

// ================== 💾 대화 저장 함수 ==================
async function saveConversationSafely(userId, userMessage, mukuResponse) {
    console.log(`💾 [안전저장] 대화 저장 시작...`);
    
    if (!userMessage || !mukuResponse) {
        console.log(`⚠️ [안전저장] 유효하지 않은 메시지 데이터`);
        return false;
    }
    
    const responseText = typeof mukuResponse === 'object' ? 
        mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
    
    try {
        // Memory Tape에 저장 시도
        const memoryTape = loadMemoryTape();
        if (memoryTape && typeof memoryTape.recordMukuMoment === 'function') {
            const momentData = {
                type: 'conversation',
                user_id: userId,
                user_message: userMessage,
                muku_response: responseText,
                remarkable: true,
                emotional_tags: ['conversation', 'daily'],
                context: {
                    conversation_length: userMessage.length + responseText.length,
                    estimated_emotion: 'normal'
                }
            };
            
            await memoryTape.recordMukuMoment(momentData);
            console.log(`✅ [안전저장] Memory Tape으로 저장 성공`);
            return true;
        }
        
        console.log(`⚠️ [안전저장] 저장 함수 없음`);
        return false;
        
    } catch (error) {
        console.log(`❌ [안전저장] 오류: ${error.message}`);
        return false;
    }
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
        safeResponse: true,
        guaranteed: true
    };
}

// ================== 🎯 메인 이벤트 처리 함수 (올바른 우선순위) ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    // 기본 검증
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

            // 🔍 1순위: "기억나?" 같은 명확한 기억 질문인지 판별
            const isMemoryQuestion = isSpecificMemoryQuestion(messageText);
            
            if (isMemoryQuestion) {
                console.log(`${colors.memory}🧠 [명확기억질문] 장기기억 시스템 가동!${colors.reset}`);
                
                const memoryResponse = await safeAsyncCall(async () => {
                    return await generateMemoryResponseForExplicitQuestion(
                        messageText, 
                        modules, 
                        enhancedLogging, 
                        { userId, messageType: 'text' }
                    );
                }, '장기기억응답생성');
                
                if (memoryResponse) {
                    console.log(`${colors.memory}🎯 [장기기억성공] 기억 기반 응답 생성!${colors.reset}`);
                    
                    const finalResponse = await applyBehaviorMode(
                        memoryResponse, 
                        modules, 
                        { messageText, responseType: 'memory' }
                    );
                    
                    const finalComment = finalResponse.comment || finalResponse;
                    
                    // 대화 저장
                    await safeAsyncCall(async () => {
                        await saveConversationSafely(userId, messageText, finalComment);
                    }, '기억응답저장');
                    
                    console.log(`${colors.yejin}💖 예진이 (기억): ${finalComment}${colors.reset}`);
                    
                    return { type: 'chat_response', response: finalResponse };
                }
                
                console.log(`${colors.warning}⚠️ [장기기억실패] autoReply.js로 위임${colors.reset}`);
            }

            // 🚨 2순위: autoReply.js에 모든 처리 위임 (가장 중요!)
            let botResponse = null;
            
            botResponse = await safeAsyncCall(async () => {
                const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
                if (autoReply) {
                    const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
                    if (typeof getReplyByMessage === 'function') {
                        const response = await getReplyByMessage(messageText);
                        if (response && (response.comment || response)) {
                            console.log(`${colors.success}✅ [autoReply위임] autoReply.js에서 처리 완료${colors.reset}`);
                            return response;
                        }
                    }
                }
                return null;
            }, 'autoReply위임');

            // 🚨 3순위: 절대 실패하지 않는 폴백 응답
            if (!botResponse) {
                console.log(`${colors.safe}🔄 [안전폴백] autoReply.js 실패 - 100% 보장 안전 응답 생성${colors.reset}`);
                botResponse = generateFallbackResponse(messageText);
            }

            // 행동 모드 적용
            const finalResponse = await applyBehaviorMode(
                botResponse,
                modules,
                { messageText, responseType: 'general' }
            );

            const finalComment = finalResponse.comment || finalResponse;

            // 대화 저장
            await safeAsyncCall(async () => {
                await saveConversationSafely(userId, messageText, finalComment);
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

            await safeAsyncCall(async () => {
                await saveConversationSafely(userId, '이미지 전송', finalComment);
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

            await safeAsyncCall(async () => {
                await saveConversationSafely(userId, `${messageType} 메시지`, finalComment);
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
            guaranteed: true
        };

        const finalEmergencyResponse = await safeAsyncCall(async () => {
            return await applyBehaviorMode(
                emergencyResponse,
                modules,
                { error: true, errorMessage: error.message }
            );
        }, '응급행동모드적용', emergencyResponse);

        const finalComment = finalEmergencyResponse.comment || finalEmergencyResponse;

        await safeAsyncCall(async () => {
            const errorMessage = userMessage?.text || '에러 발생';
            await saveConversationSafely(userId, errorMessage, finalComment);
        }, '응급저장');

        console.log(`${colors.success}🚨 [응급복구] 100% 보장 응급 응답 생성 완료 (무쿠 벙어리 방지)${colors.reset}`);
        
        return { type: 'emergency_response', response: finalEmergencyResponse };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    // 명확한 기억 질문에만 사용되는 함수들
    isSpecificMemoryQuestion,
    generateMemoryResponseForExplicitQuestion,
    findRelevantConversations,
    extractKeywordsFromMessage,
    // 유틸리티 함수들
    generateFallbackResponse,
    applyBehaviorMode,
    saveConversationSafely,
    // 안전한 로딩 시스템
    loadRedisSystem,
    loadJsonSystem,
    loadMemoryTape,
    safeAsyncCall,
    safeModuleAccess
};
