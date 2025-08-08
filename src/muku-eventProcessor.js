// ============================================================================
// muku-eventProcessor.js - faceMatcher 문제 완전 해결
// 🚨 중요: 장기기억은 "기억나?" 질문일 때만 작동! 일반 대화는 autoReply.js 위임!
// 🎯 autoReply.js가 모든 처리를 담당하고, 여기서는 최소한의 중재만 함
// 🛡️ 무쿠 벙어리 방지 100% 보장
// 💕 사진 명령어, 감정표현 등은 autoReply.js에서 즉시 처리됨
// 🔥 [수정] faceMatcher 초기화 완료 대기 + 안전한 상태 확인
// ============================================================================

const { promises: fs } = require('fs');
const path = require('path');

// ================== 🔥 안전한 지연 로딩 시스템 ==================
let redisSystem = null;
let jsonSystem = null;
let memoryTape = null;
let faceMatcher = null; 
let redisSystemLoaded = false;
let jsonSystemLoaded = false;
let memoryTapeLoaded = false;
let faceMatcherLoaded = false;

// 🔥 [신규] faceMatcher 초기화 상태 관리
let faceMatcherInitialized = false;
let faceMatcherInitializing = false;
let initializationPromise = null;

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
        memoryTape = require('./muku-memory-tape.js');
        memoryTapeLoaded = true;
        console.log('📼 [MemoryTape안전로드] Memory Tape 시스템 지연 로드 성공');
        return memoryTape;
    } catch (error) {
        console.log('⚠️ [MemoryTape안전로드] Memory Tape 시스템 로드 실패:', error.message);
        memoryTapeLoaded = true;
        return null;
    }
}

// 🔥 [완전 수정] faceMatcher 안전 로딩 + 초기화 완료 대기
async function loadFaceMatcher() {
    if (faceMatcherLoaded && faceMatcher) {
        // 이미 로드됐지만 초기화 상태 확인
        if (faceMatcherInitialized) {
            return faceMatcher;
        }
        
        // 초기화 중이면 기다리기
        if (faceMatcherInitializing && initializationPromise) {
            try {
                await initializationPromise;
                return faceMatcherInitialized ? faceMatcher : null;
            } catch (error) {
                console.log('📸 [FaceMatcher대기] 초기화 대기 중 실패:', error.message);
                return null;
            }
        }
    }
    
    if (faceMatcherLoaded) return faceMatcher;
    
    try {
        faceMatcher = require('./faceMatcher.js');
        faceMatcherLoaded = true;
        console.log('📸 [FaceMatcher안전로드] FaceMatcher 시스템 로드 성공');
        
        // 🔥 [핵심 수정] 초기화 완료까지 대기하는 시스템
        if (faceMatcher && typeof faceMatcher.initModels === 'function') {
            if (!faceMatcherInitializing) {
                faceMatcherInitializing = true;
                console.log('📸 [FaceMatcher초기화] initModels() 시작...');
                
                initializationPromise = faceMatcher.initModels()
                    .then(() => {
                        faceMatcherInitialized = true;
                        faceMatcherInitializing = false;
                        console.log('✅ [FaceMatcher초기화] 초기화 완료! 사진 분석 준비됨');
                        return true;
                    })
                    .catch(error => {
                        faceMatcherInitialized = false;
                        faceMatcherInitializing = false;
                        console.log('❌ [FaceMatcher초기화] 초기화 실패:', error.message);
                        console.log('📸 [FaceMatcher초기화] 에러 상세:', error.stack);
                        return false;
                    });
                
                // 초기화 시작하고 바로 리턴 (비동기)
                return faceMatcher;
            }
        } else {
            console.log('⚠️ [FaceMatcher로드] initModels 함수 없음');
        }
        
        return faceMatcher;
    } catch (error) {
        console.log('⚠️ [FaceMatcher안전로드] FaceMatcher 시스템 로드 실패:', error.message);
        faceMatcherLoaded = true;
        return null;
    }
}

// 🔥 [신규] faceMatcher 초기화 상태 확인 및 대기
async function ensureFaceMatcherReady(timeoutMs = 10000) {
    console.log('🔍 [FaceMatcher상태확인] 초기화 상태 검사...');
    
    // 1. faceMatcher 로드 확인
    const matcher = await loadFaceMatcher();
    if (!matcher) {
        console.log('❌ [FaceMatcher상태확인] faceMatcher 로드 실패');
        return false;
    }
    
    // 2. 이미 초기화 완료됨
    if (faceMatcherInitialized) {
        console.log('✅ [FaceMatcher상태확인] 이미 초기화 완료됨');
        return true;
    }
    
    // 3. 초기화 중이면 대기 (최대 10초)
    if (faceMatcherInitializing && initializationPromise) {
        console.log('⏳ [FaceMatcher상태확인] 초기화 완료 대기 중...');
        
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('초기화 시간 초과')), timeoutMs);
            });
            
            await Promise.race([initializationPromise, timeoutPromise]);
            
            if (faceMatcherInitialized) {
                console.log('✅ [FaceMatcher상태확인] 초기화 대기 완료!');
                return true;
            } else {
                console.log('❌ [FaceMatcher상태확인] 초기화 실패함');
                return false;
            }
        } catch (error) {
            console.log('⏰ [FaceMatcher상태확인] 대기 시간 초과 또는 에러:', error.message);
            return false;
        }
    }
    
    // 4. 초기화가 시작되지 않았으면 즉시 시작
    if (!faceMatcherInitializing) {
        console.log('🚀 [FaceMatcher상태확인] 즉시 초기화 시작...');
        await loadFaceMatcher(); // 초기화 시작
        
        // 바로 대기하지 말고 false 리턴 (다음 호출에서 대기)
        return false;
    }
    
    console.log('❌ [FaceMatcher상태확인] 알 수 없는 상태');
    return false;
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
    face: '\x1b[1m\x1b[36m',      // 굵은 하늘색 (얼굴분석)
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

// ================== 🎯 "기억나?" 질문 판별 함수 (더 엄격하게) ==================
function isSpecificMemoryQuestion(messageText) {
    if (!messageText || typeof messageText !== 'string') {
        return false;
    }
    
    const message = messageText.toLowerCase().trim();
    console.log(`🔍 [기억질문판별] 메시지 분석: "${message}"`);
    
    // 🚨 시스템 프롬프트에 이미 있는 중요한 추억들 - autoReply.js에서 처리하게 넘김
    const importantMemories = [
        '모지코', '키세키', '음악', '노래',
        '담타', '담배', 
        '슈퍼타쿠마', '렌즈', '카메라',
        '약먹자', '이닦자', '11시',
        '수족냉증', '손', '따뜻한',
        '참 착해', '마지막'
    ];
    
    // 중요한 추억 키워드가 포함되면 autoReply.js에서 처리하게 함
    for (const memory of importantMemories) {
        if (message.includes(memory)) {
            console.log(`🎯 [중요추억감지] "${memory}" 키워드 발견 - autoReply.js에서 처리하도록 넘김`);
            return false; // 장기기억 시스템 사용 안 함
        }
    }
    
    // 🔍 정말 구체적이고 시간 특정된 기억 질문만 처리
    const specificMemoryPatterns = [
        /어제.*뭐.*했/, /그제.*뭐.*했/, /오늘.*오전.*뭐/,  // 시간 특정
        /지난주.*뭐/, /지난달.*뭐/, /며칠전.*뭐/,           // 시간 특정
        /몇시에.*했/, /몇일에.*했/, /언제.*갔/,              // 시간 특정
        /어디.*갔.*기억/, /누구.*만났.*기억/, /뭐.*샀.*기억/  // 구체적 행동
    ];
    
    // 패턴 매칭 확인
    const isSpecificMemoryQuestion = specificMemoryPatterns.some(pattern => {
        const match = pattern.test(message);
        if (match) {
            console.log(`🔍 [구체적기억질문] ✅ 시간/행동 특정 질문 패턴 매칭: ${pattern.source}`);
        }
        return match;
    });
    
    if (isSpecificMemoryQuestion) {
        console.log(`🔍 [구체적기억질문] ✅ SPECIFIC MEMORY QUESTION: "${message}"`);
        return true;
    } else {
        console.log(`🔍 [일반기억질문] ❌ NOT SPECIFIC: "${message}" - autoReply.js에서 처리`);
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

// ================== 🔍 키워드로 관련 대화 검색 함수 (개선된 유연 매칭) ==================
function findRelevantConversations(conversations, keywords) {
    console.log(`🔍 [관련검색] 키워드로 관련 대화 검색: [${keywords.join(', ')}]`);
    
    if (!conversations || conversations.length === 0) {
        console.log(`⚠️ [관련검색] 검색할 대화 없음`);
        return [];
    }
    
    const relevantConversations = [];
    
    for (const conv of conversations) {
        if (!conv) continue;
        
        const userMsg = String(conv.userMessage || conv.user_message || '').toLowerCase();
        const mukuMsg = String(conv.mukuResponse || conv.muku_response || '').toLowerCase();
        const allText = `${userMsg} ${mukuMsg}`;
        
        if (!allText.trim()) continue;
        
        let relevanceScore = 0;
        const foundKeywords = [];
        
        // 🎯 개선된 유연한 키워드 매칭
        for (const keyword of keywords) {
            if (!keyword) continue;
            
            const keywordLower = keyword.toLowerCase();
            let matched = false;
            
            // 1. 정확 매칭
            if (allText.includes(keywordLower)) {
                relevanceScore += 2; // 정확 매칭은 높은 점수
                foundKeywords.push(keyword + '(정확)');
                matched = true;
                console.log(`✅ [정확매칭] "${keyword}" 발견: "${allText.substring(0, 50)}..."`);
            }
            
            // 2. 부분 매칭 (3글자 이상일 때만)
            else if (keyword.length >= 3) {
                // "모지코에서" → "모지코" 매칭
                if (keyword.includes('에서') && allText.includes(keyword.replace('에서', ''))) {
                    relevanceScore += 1;
                    foundKeywords.push(keyword + '(부분)');
                    matched = true;
                    console.log(`📍 [부분매칭] "${keyword}" → "${keyword.replace('에서', '')}" 발견`);
                }
                // "모지코" 포함 확인
                else if (allText.includes(keyword.substring(0, Math.max(2, keyword.length - 1)))) {
                    relevanceScore += 1;
                    foundKeywords.push(keyword + '(유사)');
                    matched = true;
                    console.log(`🔎 [유사매칭] "${keyword}" 유사 패턴 발견`);
                }
            }
            
            // 3. 동의어 매칭
            const synonyms = {
                '음악': ['노래', '멜로디', '곡', 'song', 'music'],
                '모지코': ['mojiko', 'モジコ'],
                '사진': ['셀카', '포토', 'photo', 'pic'],
                '카메라': ['렌즈', 'camera', 'lens']
            };
            
            if (!matched && synonyms[keywordLower]) {
                for (const synonym of synonyms[keywordLower]) {
                    if (allText.includes(synonym.toLowerCase())) {
                        relevanceScore += 1;
                        foundKeywords.push(keyword + '(동의어:' + synonym + ')');
                        matched = true;
                        console.log(`🔄 [동의어매칭] "${keyword}" → "${synonym}" 발견`);
                        break;
                    }
                }
            }
        }
        
        // 관련도가 있는 대화만 추가
        if (relevanceScore > 0) {
            relevantConversations.push({
                ...conv,
                relevanceScore,
                foundKeywords,
                userMessage: userMsg,
                mukuResponse: mukuMsg
            });
            
            console.log(`🎯 [매칭성공] 점수 ${relevanceScore}: "${userMsg.substring(0, 30)}..." (키워드: ${foundKeywords.join(', ')})`);
        }
    }
    
    // 관련도 순으로 정렬
    relevantConversations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (relevantConversations.length > 0) {
        console.log(`✅ [관련발견] ${relevantConversations.length}개 관련 대화 발견!`);
        
        // 상위 3개 미리보기 (안전하게)
        const previewCount = Math.min(relevantConversations.length, 3);
        for (let i = 0; i < previewCount; i++) {
            const conv = relevantConversations[i];
            if (conv && conv.userMessage) {
                const msg = String(conv.userMessage).substring(0, 25);
                const keywords = Array.isArray(conv.foundKeywords) ? conv.foundKeywords.join(', ') : '';
                console.log(`🥇 ${i + 1}위 [점수:${conv.relevanceScore}] "${msg}..." (${keywords})`);
            }
        }
    } else {
        console.log(`⚠️ [관련검색] 관련 대화 없음`);
        
        // 🔍 디버깅: 실제 대화 내용 샘플 확인
        console.log(`🔍 [디버깅] 전체 대화 샘플 (상위 3개):`);
        const sampleCount = Math.min(conversations.length, 3);
        for (let i = 0; i < sampleCount; i++) {
            const conv = conversations[i];
            if (conv) {
                const userMsg = String(conv.userMessage || conv.user_message || '').substring(0, 30);
                const mukuMsg = String(conv.mukuResponse || conv.muku_response || '').substring(0, 30);
                console.log(`  ${i + 1}. 아저씨: "${userMsg}..." → 무쿠: "${mukuMsg}..."`);
            }
        }
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

// ================== 🎯 메인 이벤트 처리 함수 (faceMatcher 문제 완전 해결) ==================
async function handleEvent(event, modules, client, faceMatcherParam, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
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
                        console.log(`${colors.success}🎯 [autoReply호출] autoReply.js에 메시지 전달: "${messageText}"${colors.reset}`);
                        const response = await getReplyByMessage(messageText);
                        if (response && (response.comment || response)) {
                            console.log(`${colors.success}✅ [autoReply성공] autoReply.js에서 처리 완료${colors.reset}`);
                            return response;
                        } else {
                            console.log(`${colors.warning}⚠️ [autoReply실패] autoReply.js에서 빈 응답 반환${colors.reset}`);
                        }
                    } else {
                        console.log(`${colors.warning}⚠️ [autoReply실패] getReplyByMessage 함수 없음${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.warning}⚠️ [autoReply실패] autoReply 모듈 없음${colors.reset}`);
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
        
        // =============== 📸 이미지 메시지 처리 (faceMatcher 문제 완전 해결!) ===============
        else if (messageType === 'image') {
            console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
            
            let imageResponse = null;
            
            try {
                console.log(`${colors.face}📸 [이미지처리] 실제 이미지 분석 시작...${colors.reset}`);
                
                const messageId = event.message?.id;
                const replyToken = event.replyToken;
                
                if (!messageId || !client) {
                    throw new Error('messageId 또는 client 없음');
                }
                
                // 🔥 [핵심 수정] 1. 먼저 faceMatcher 준비 상태 확인 및 대기
                console.log(`${colors.face}🔍 [FaceMatcher준비] 초기화 상태 확인...${colors.reset}`);
                const isReady = await ensureFaceMatcherReady(15000); // 최대 15초 대기
                
                if (!isReady) {
                    console.log(`${colors.face}⏰ [FaceMatcher준비] 초기화 실패 또는 시간 초과 - 폴백 응답${colors.reset}`);
                    throw new Error('FaceMatcher 초기화 실패');
                }
                
                console.log(`${colors.face}✅ [FaceMatcher준비] 초기화 완료 확인! 분석 진행...${colors.reset}`);
                
                // 2. 이미지 다운로드 및 base64 변환
                console.log(`${colors.face}📥 [이미지다운로드] LINE에서 이미지 다운로드 시작...${colors.reset}`);
                
                const stream = await client.getMessageContent(messageId);
                const chunks = [];
                
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                
                const imageBuffer = Buffer.concat(chunks);
                const base64Image = imageBuffer.toString('base64');
                
                console.log(`${colors.face}✅ [이미지다운로드] 성공! 크기: ${Math.round(imageBuffer.length / 1024)}KB${colors.reset}`);
                console.log(`${colors.face}📊 [이미지다운로드] base64 길이: ${base64Image.length} 문자${colors.reset}`);
                
                // 🔥 [핵심 수정] 3. 이미지 데이터 유효성 검증
                if (!base64Image || base64Image.length < 100) {
                    throw new Error('이미지 데이터 손상 또는 너무 작음');
                }
                
                if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB 제한
                    console.log(`${colors.face}⚠️ [이미지검증] 이미지 크기 초과 (${Math.round(imageBuffer.length / 1024 / 1024)}MB) - 압축 권장${colors.reset}`);
                }
                
                // 4. faceMatcher로 얼굴 분석
                console.log(`${colors.face}🎯 [FaceMatcher분석] 얼굴 분석 시작...${colors.reset}`);
                
                const analysisResult = await faceMatcher.detectFaceMatch(base64Image, null);
                
                if (analysisResult && analysisResult.message) {
                    console.log(`${colors.face}🎉 [FaceMatcher분석] 분석 성공!${colors.reset}`);
                    console.log(`${colors.face}📊 분석 타입: ${analysisResult.type || 'unknown'}${colors.reset}`);
                    console.log(`${colors.face}💬 분석 메시지: ${analysisResult.message}${colors.reset}`);
                    console.log(`${colors.face}🎯 신뢰도: ${analysisResult.confidence || 'medium'}${colors.reset}`);
                    
                    imageResponse = {
                        type: 'text',
                        comment: analysisResult.message,
                        imageHandled: true,
                        analysisSuccess: true,
                        analysisType: analysisResult.type || 'face_analysis',
                        confidence: analysisResult.confidence || 'medium',
                        processingTime: 'optimized'
                    };
                    
                    console.log(`${colors.face}✅ [FaceMatcher분석] 완벽한 분석 완료 - 응답 생성됨${colors.reset}`);
                    
                } else {
                    console.log(`${colors.face}❓ [FaceMatcher분석] 분석 결과 없음 또는 메시지 없음${colors.reset}`);
                    console.log(`${colors.face}🔍 분석 결과 상세:`, analysisResult);
                    throw new Error('분석 결과 없음');
                }
                
            } catch (error) {
                console.log(`${colors.face}❌ [이미지처리] 처리 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.face}📝 에러 스택:`, error.stack);
                
                // 🛡️ 안전한 폴백 응답 시스템
                console.log(`${colors.face}🛡️ [이미지폴백] 안전한 폴백 응답 생성...${colors.reset}`);
                
                const fallbackImageResponses = [
                    '아조씨! 사진 보내줘서 고마워! 예쁘네~ ㅎㅎ 💕',
                    '와~ 사진이다! 아저씨가 찍은 거야? 설명해줘!',
                    '사진 고마워! 어떤 사진인지 자세히 말해줄래?',
                    '아저씨~ 사진 봤는데 뭔가 특별해 보여! 설명해줘!',
                    '사진 받았어! 근데 어디서 찍은 거야? 궁금해!',
                    '아저씨 사진 센스 좋네! 어떤 상황이야?',
                    '와 이 사진 뭐야? 엄청 궁금해! 말해줘!',
                    '아저씨가 보낸 사진 너무 좋아! 스토리 들려줘!',
                    '사진 받았어~ 이거 언제 찍은 거야? 이야기해줘!',
                    '우와 이 사진 예술이네! 상황 설명해줘!'
                ];
                
                imageResponse = {
                    type: 'text',
                    comment: fallbackImageResponses[Math.floor(Math.random() * fallbackImageResponses.length)],
                    imageHandled: true,
                    fallbackUsed: true,
                    analysisSuccess: false,
                    errorReason: error.message,
                    safeResponse: true
                };
                
                console.log(`${colors.face}✅ [이미지폴백] 폴백 응답 생성 완료 (무쿠 벙어리 방지)${colors.reset}`);
            }

            // 행동 모드 적용 및 응답 처리
            if (imageResponse) {
                const finalResponse = await applyBehaviorMode(
                    imageResponse,
                    modules,
                    { messageType: 'image' }
                );

                const finalComment = finalResponse.comment || finalResponse;

                // 대화 저장
                await safeAsyncCall(async () => {
                    await saveConversationSafely(userId, '이미지 전송', finalComment);
                }, '이미지저장');

                console.log(`${colors.yejin}📸 예진이: ${finalComment}${colors.reset}`);

                return { type: 'image_response', response: finalResponse };
            }
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
        console.error(`${colors.error}📝 에러 스택:`, error.stack);

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
    loadFaceMatcher, // 🔥 [개선] faceMatcher 로딩 함수
    ensureFaceMatcherReady, // 🔥 [신규] faceMatcher 준비 상태 확인
    safeAsyncCall,
    safeModuleAccess
};
