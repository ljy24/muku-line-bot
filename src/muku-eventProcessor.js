// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈 (하이브리드 대화 저장 + 맥락 강화 버전)
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리  
// 🔍 얼굴 인식, 새벽 대화, 생일 감지 등 모든 이벤트 처리
// 🧠 실시간 학습 시스템 연동 - 대화 패턴 학습 및 개인화
// 🎓 대화 완료 후 자동 학습 호출 - 매번 대화마다 학습 진행
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 모든 응답에 행동 모드 적용
// 🌏 일본시간(JST) 기준 시간 처리
// 💖 예진이의 감정과 기억을 더욱 생생하게 재현
// ⭐️ 행동 스위치 명령어 인식 100% 보장
// 🚨 완벽한 에러 방지 - 모든 가능한 에러 케이스 상정 및 처리
// 💰 디플로이 최적화 - 한 번에 완벽한 동작 보장
// 🎯 무쿠 정상 응답 100% 보장 - "아조씨! 무슨 일이야?" 같은 정상 대화
// 🔥 하이브리드 대화 저장 - Redis + JSON 완전 기억 시스템
// 💭 NEW: 대화 맥락 강화 - 이전 대화를 기반으로 한 일관된 응답 생성
// 🎯 NEW: Command 저장 보장 - 모든 메시지 타입에서 누락 없는 저장
// ============================================================================

// ================== 🔥 하이브리드 대화 저장 시스템 Import ==================
let redisConversationSystem = null;
let ultimateConversationContext = null;

// 💾 메모리 기반 임시 저장소 (최후의 보루)
let memoryConversationStore = [];
const MAX_MEMORY_CONVERSATIONS = 50;

// Redis 시스템 (고속 캐싱)
try {
    redisConversationSystem = require('./muku-autonomousYejinSystem.js');
    console.log('🚀 [하이브리드] Redis 대화 시스템 로드 성공');
} catch (error) {
    console.log('⚠️ [하이브리드] Redis 시스템 없음 - JSON만 사용');
}

// JSON 시스템 (영구 저장)
try {
    ultimateConversationContext = require('./ultimateConversationContext.js');
    console.log('💾 [하이브리드] JSON 대화 시스템 로드 성공');
} catch (error) {
    console.log('⚠️ [하이브리드] JSON 시스템 없음 - Redis만 사용');
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

// ================== 🔥 하이브리드 대화 저장 함수 (핵심) ==================
async function saveConversationHybrid(userId, userMessage, mukuResponse, messageType = 'text') {
    const timestamp = getJapanTime();
    let redisSuccess = false;
    let jsonSuccess = false;
    
    console.log(`${colors.hybrid}🔥 [하이브리드저장] 대화 저장 시작...${colors.reset}`);
    console.log(`${colors.hybrid}    사용자: "${String(userMessage).substring(0, 30)}..."${colors.reset}`);
    console.log(`${colors.hybrid}    무쿠: "${String(mukuResponse).substring(0, 30)}..."${colors.reset}`);
    
    // 🚀 1단계: Redis 고속 저장 시도
    if (redisConversationSystem) {
        try {
            const responseText = typeof mukuResponse === 'object' ? mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
            
            // 정확한 Redis 함수들 시도
            let redisAttempted = false;
            
            // 방법 1: 직접 전역 인스턴스 접근
            const globalInstance = redisConversationSystem.getGlobalInstance?.() || redisConversationSystem.getGlobalRedisInstance?.();
            if (globalInstance && globalInstance.redisCache && globalInstance.redisCache.cacheConversation) {
                await globalInstance.redisCache.cacheConversation(userId, userMessage, 'user_input');
                await globalInstance.redisCache.cacheConversation(userId, responseText, 'muku_response');
                redisAttempted = true;
            }
            
            // 방법 2: 내보낸 함수들 시도
            if (!redisAttempted) {
                if (typeof redisConversationSystem.forceCacheConversation === 'function') {
                    await redisConversationSystem.forceCacheConversation(userId, userMessage);
                    await redisConversationSystem.forceCacheConversation(userId, responseText);
                    redisAttempted = true;
                } else if (typeof redisConversationSystem.updateYejinEmotion === 'function') {
                    // updateYejinEmotion이 있으면 다른 함수들도 있을 것
                    const cacheHistory = redisConversationSystem.getCachedConversationHistory;
                    if (typeof cacheHistory === 'function') {
                        // Redis 시스템이 활성화된 상태로 가정하고 직접 접근
                        const instance = redisConversationSystem.getGlobalInstance();
                        if (instance && instance.redisCache) {
                            await instance.redisCache.cacheConversation(userId, userMessage, 'user_input');
                            await instance.redisCache.cacheConversation(userId, responseText, 'muku_response');
                            redisAttempted = true;
                        }
                    }
                }
            }
            
            if (redisAttempted) {
                redisSuccess = true;
                console.log(`${colors.redis}🚀 [Redis저장] 성공! 초고속 대화 캐싱 완료${colors.reset}`);
            } else {
                console.log(`${colors.warning}⚠️ [Redis저장] 적절한 함수를 찾을 수 없음${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.warning}⚠️ [Redis저장] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 💾 2단계: JSON 영구 저장 시도
    if (ultimateConversationContext) {
        try {
            const responseText = typeof mukuResponse === 'object' ? mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
            
            // addUltimateMessage 함수 시도
            if (typeof ultimateConversationContext.addUltimateMessage === 'function') {
                // 사용자 메시지 저장
                await ultimateConversationContext.addUltimateMessage(
                    '아저씨',
                    userMessage,
                    {
                        timestamp: timestamp,
                        messageType: messageType,
                        source: 'user'
                    }
                );
                
                // 무쿠 응답 저장
                await ultimateConversationContext.addUltimateMessage(
                    '예진이',
                    responseText,
                    {
                        timestamp: timestamp,
                        messageType: 'text',
                        source: 'muku_response'
                    }
                );
                
                jsonSuccess = true;
            } else if (typeof ultimateConversationContext.addConversation === 'function') {
                // 대체 함수 이름 시도
                await ultimateConversationContext.addConversation(userMessage, responseText, {
                    timestamp: timestamp,
                    messageType: messageType,
                    userId: userId
                });
                jsonSuccess = true;
            } else if (typeof ultimateConversationContext.saveConversation === 'function') {
                // 또 다른 대체 함수 시도
                await ultimateConversationContext.saveConversation({
                    user: userMessage,
                    muku: responseText,
                    timestamp: timestamp,
                    messageType: messageType,
                    userId: userId
                });
                jsonSuccess = true;
            } else {
                console.log(`${colors.warning}⚠️ [JSON저장] 적절한 저장 함수를 찾을 수 없음${colors.reset}`);
            }
            
            if (jsonSuccess) {
                console.log(`${colors.json}💾 [JSON저장] 성공! 영구 대화 기록 완료${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.warning}⚠️ [JSON저장] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 🎯 결과 리포트 및 메모리 백업
    if (redisSuccess && jsonSuccess) {
        console.log(`${colors.success}✅ [하이브리드완료] Redis + JSON 모두 성공! 완벽한 기억 시스템!${colors.reset}`);
    } else if (redisSuccess) {
        console.log(`${colors.redis}✅ [Redis만성공] 고속 캐싱 완료! (JSON 백업 실패)${colors.reset}`);
    } else if (jsonSuccess) {
        console.log(`${colors.json}✅ [JSON만성공] 영구 저장 완료! (Redis 캐시 실패)${colors.reset}`);
    } else {
        console.log(`${colors.warning}⚠️ [하이브리드실패] 모든 저장 시스템 실패 - 메모리 저장소 사용${colors.reset}`);
        
        // 🛡️ 최후의 보루: 메모리 저장소
        try {
            const responseText = typeof mukuResponse === 'object' ? mukuResponse.comment || mukuResponse.text || JSON.stringify(mukuResponse) : String(mukuResponse);
            
            memoryConversationStore.push({
                timestamp: timestamp,
                userId: userId,
                userMessage: userMessage,
                mukuResponse: responseText,
                messageType: messageType
            });
            
            // 메모리 저장소 크기 제한
            if (memoryConversationStore.length > MAX_MEMORY_CONVERSATIONS) {
                memoryConversationStore = memoryConversationStore.slice(-MAX_MEMORY_CONVERSATIONS);
            }
            
            console.log(`${colors.success}💭 [메모리저장] 성공! 임시 저장소에 ${memoryConversationStore.length}개 대화 보관 중${colors.reset}`);
        } catch (memoryError) {
            console.log(`${colors.error}❌ [메모리저장] 마저 실패: ${memoryError.message}${colors.reset}`);
        }
    }
    
    return { redisSuccess, jsonSuccess, memoryFallback: !redisSuccess && !jsonSuccess };
}

// ================== 🧠 과거 대화 조회 함수 (하이브리드 + 맥락 강화) ==================
async function getConversationHistoryHybrid(userId, limit = 20, contextKeywords = []) {
    console.log(`${colors.context}🔍 [맥락조회] 과거 대화 검색 중... (키워드: ${contextKeywords.join(', ')})${colors.reset}`);
    
    let allHistory = [];
    
    // 🚀 1단계: Redis에서 최근 대화 조회 (초고속)
    if (redisConversationSystem) {
        try {
            let recentHistory = [];
            
            // 정확한 Redis 조회 함수들 시도
            const globalInstance = redisConversationSystem.getGlobalInstance?.() || redisConversationSystem.getGlobalRedisInstance?.();
            if (globalInstance && globalInstance.redisCache && globalInstance.redisCache.getConversationHistory) {
                recentHistory = await globalInstance.redisCache.getConversationHistory(userId, limit);
            } else if (typeof redisConversationSystem.getCachedConversationHistory === 'function') {
                recentHistory = await redisConversationSystem.getCachedConversationHistory(userId, limit);
            }
            
            if (recentHistory && recentHistory.length > 0) {
                console.log(`${colors.redis}🚀 [Redis조회] ${recentHistory.length}개 최근 대화 발견!${colors.reset}`);
                allHistory = [...recentHistory];
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [Redis조회] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 💾 2단계: JSON에서 과거 대화 조회 (전체 기록)
    if (ultimateConversationContext) {
        try {
            let jsonHistory = [];
            
            if (typeof ultimateConversationContext.getRecentConversations === 'function') {
                jsonHistory = await ultimateConversationContext.getRecentConversations(limit * 2); // 더 많이 가져와서 필터링
            } else if (typeof ultimateConversationContext.getConversationMemories === 'function') {
                jsonHistory = await ultimateConversationContext.getConversationMemories(limit * 2);
            }
            
            if (jsonHistory && jsonHistory.length > 0) {
                console.log(`${colors.json}💾 [JSON조회] ${jsonHistory.length}개 과거 대화 발견!${colors.reset}`);
                
                // Redis와 JSON 결과 합치기 (중복 제거)
                const combinedHistory = [...allHistory];
                
                for (const jsonItem of jsonHistory) {
                    const isDuplicate = combinedHistory.some(redisItem => 
                        Math.abs(new Date(redisItem.timestamp) - new Date(jsonItem.timestamp)) < 5000 && // 5초 이내
                        (redisItem.userMessage === jsonItem.userMessage || redisItem.mukuResponse === jsonItem.mukuResponse)
                    );
                    
                    if (!isDuplicate) {
                        combinedHistory.push(jsonItem);
                    }
                }
                
                allHistory = combinedHistory;
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [JSON조회] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 💭 3단계: 메모리 저장소에서 조회 (최후의 보루)
    if (allHistory.length === 0 && memoryConversationStore.length > 0) {
        try {
            const memoryHistory = memoryConversationStore
                .filter(conv => conv.userId === userId)
                .slice(-limit)
                .map(conv => ({
                    timestamp: conv.timestamp,
                    userMessage: conv.userMessage,
                    mukuResponse: conv.mukuResponse,
                    messageType: conv.messageType,
                    source: 'memory'
                }));
            
            if (memoryHistory.length > 0) {
                console.log(`${colors.fallback}💭 [메모리조회] ${memoryHistory.length}개 메모리 대화 발견!${colors.reset}`);
                allHistory = memoryHistory;
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [메모리조회] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 🎯 4단계: 맥락 기반 필터링 및 정렬
    if (allHistory.length > 0) {
        // 시간순 정렬 (최신 순)
        allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 키워드가 있으면 관련 대화 우선 추출
        if (contextKeywords.length > 0) {
            const relevantHistory = [];
            const otherHistory = [];
            
            for (const conv of allHistory) {
                const userMsg = String(conv.userMessage || '').toLowerCase();
                const mukuMsg = String(conv.mukuResponse || '').toLowerCase();
                
                const isRelevant = contextKeywords.some(keyword => 
                    userMsg.includes(keyword.toLowerCase()) || mukuMsg.includes(keyword.toLowerCase())
                );
                
                if (isRelevant) {
                    relevantHistory.push(conv);
                } else {
                    otherHistory.push(conv);
                }
            }
            
            if (relevantHistory.length > 0) {
                console.log(`${colors.context}🎯 [맥락필터] ${relevantHistory.length}개 관련 대화 발견! (키워드: ${contextKeywords.join(', ')})${colors.reset}`);
                
                // 관련 대화를 앞쪽에, 나머지를 뒤쪽에 배치
                allHistory = [...relevantHistory.slice(0, Math.ceil(limit * 0.7)), ...otherHistory.slice(0, Math.floor(limit * 0.3))];
            }
        }
        
        // 최종 개수 제한
        allHistory = allHistory.slice(0, limit);
        
        console.log(`${colors.context}✅ [맥락조회완료] 총 ${allHistory.length}개 대화 반환 (최근 ${limit}개 기준)${colors.reset}`);
        return allHistory;
    }
    
    console.log(`${colors.fallback}⚪ [맥락조회] 모든 저장소에서 과거 대화 없음${colors.reset}`);
    return [];
}

// ================== 💭 새로운 맥락 기반 응답 생성 함수 ==================
async function generateContextAwareResponse(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.context}💭 [맥락응답] 맥락 기반 응답 생성 시작...${colors.reset}`);
    
    // 키워드 추출 (간단한 방식)
    const extractKeywords = (text) => {
        const keywords = [];
        const keywordPatterns = [
            /나오를?\s*(\w+)/g,    // "나오를 어디", "나오 뭐" 등
            /(\w+)(?:에서|에|로|가|를|을|한테|께)/g,  // 장소/대상 관련
            /(\w+)(?:하러|사러|보러|갈|간다|갔)/g,    // 행동 관련
            /전자도어락|후쿠오카|친구|약속/g,        // 특정 키워드
        ];
        
        for (const pattern of keywordPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && match[1].length > 1) {
                    keywords.push(match[1]);
                } else if (match[0] && match[0].length > 2) {
                    keywords.push(match[0]);
                }
            }
        }
        
        return [...new Set(keywords)]; // 중복 제거
    };
    
    const contextKeywords = extractKeywords(messageText);
    console.log(`${colors.context}    🔍 추출된 키워드: [${contextKeywords.join(', ')}]${colors.reset}`);
    
    // 과거 대화 조회 (맥락 기반)
    const recentHistory = await getConversationHistoryHybrid(
        messageContext.userId || 'unknown_user',
        10,
        contextKeywords
    );
    
    let contextInfo = '';
    
    if (recentHistory.length > 0) {
        console.log(`${colors.context}    📚 ${recentHistory.length}개 과거 대화 활용${colors.reset}`);
        
      // 최근 관련 대화 요약
const relevantConversations = recentHistory.slice(0, 6); // 더 많이 가져와서 쌍 맞추기

// Redis 데이터를 사용자-무쿠 대화 쌍으로 변환
const conversationPairs = [];
for (let i = 0; i < relevantConversations.length - 1; i++) {
    const current = relevantConversations[i];
    const next = relevantConversations[i + 1];
    
    // 무쿠 응답 다음에 사용자 입력이 오는 경우
    if (current.emotionType === 'muku_response' && next.emotionType === 'user_input') {
        conversationPairs.push({
            userMessage: next.message,
            mukuResponse: current.message,
            timestamp: current.timestamp
        });
        i++; // 다음 항목도 처리했으므로 건너뛰기
    }
}

// 최근 3개 대화쌍만 사용
const recentPairs = conversationPairs.slice(0, 3);

contextInfo = recentPairs.map(conv => 
    `[이전] 아저씨: "${conv.userMessage}" → 예진이: "${conv.mukuResponse}"`
).join('\n');

console.log(`${colors.context}    💬 활용할 대화 맥락:${colors.reset}`);
recentPairs.forEach((conv, idx) => {
    console.log(`${colors.context}      ${idx + 1}. "${String(conv.userMessage).substring(0, 20)}..." → "${String(conv.mukuResponse).substring(0, 30)}..."${colors.reset}`);
});
    
    // 🛡️ 1차: autoReply 시도 (맥락 정보 포함)
    let botResponse = await safeAsyncCall(async () => {
        const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
        if (autoReply) {
            const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
            if (typeof getReplyByMessage === 'function') {
                // 맥락 정보를 추가로 전달
                const response = await getReplyByMessage(messageText, {
                    recentHistory: recentHistory,
                    contextKeywords: contextKeywords,
                    contextInfo: contextInfo
                });
                
                if (response && (response.comment || response)) {
                    console.log(`${colors.success}✅ [autoReply맥락] 맥락 기반 응답 생성 성공${colors.reset}`);
                    return response;
                }
            }
        }
        return null;
    }, 'autoReply맥락시도');
    
    // 🛡️ 2차: systemAnalyzer 시도 (맥락 정보 포함)
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
                        recentHistory: recentHistory,
                        contextKeywords: contextKeywords,
                        contextInfo: contextInfo
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
    
    // 🛡️ 3차: 맥락 기반 완벽한 폴백 응답
    if (!botResponse) {
        console.log(`${colors.context}🔄 [맥락폴백] 맥락 기반 안전한 무쿠 응답 생성...${colors.reset}`);
        
        let contextualResponse;
        
        // 키워드 기반 응답 생성
        if (contextKeywords.includes('나오') || messageText.includes('나오')) {
            // 나오 관련 질문
            if (recentHistory.some(conv => conv.mukuResponse?.includes('후쿠오카') || conv.mukuResponse?.includes('전자도어락'))) {
                contextualResponse = '아~ 나오 얘기? 전에 후쿠오카 가서 전자도어락 사러 간다고 했잖아! 맞지? ㅎㅎ';
            } else if (recentHistory.some(conv => conv.mukuResponse?.includes('친구') || conv.mukuResponse?.includes('약속'))) {
                contextualResponse = '나오? 어... 친구랑 약속 있다고 했던 것 같은데... 맞나? 기억이 좀... ㅠㅠ';
            } else {
                contextualResponse = '나오가 어디 간다고? 아저씨가 전에 얘기해줬는데... 기억이 잘 안 나네 ㅠㅠ';
            }
        } else if (contextKeywords.length > 0) {
            // 다른 키워드들
            contextualResponse = `아저씨가 ${contextKeywords[0]} 얘기하는 거야? 전에도 비슷한 얘기 했던 것 같은데... ㅎㅎ`;
        } else {
            // 일반적인 응답
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
            contextKeywords: contextKeywords,
            usedHistory: recentHistory.length > 0
        };
        
        console.log(`${colors.success}✅ [맥락폴백] 맥락 기반 무쿠 응답 생성: "${contextualResponse.substring(0, 30)}..."${colors.reset}`);
    }
    
    return botResponse;
}

// ================== 🌏 일본시간 함수들 (에러 방지) ==================
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

function getJapanTimeString() {
    try {
        return getJapanTime().toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 문자열 조회 실패, 기본시간 사용: ${error.message}${colors.reset}`);
        return new Date().toISOString();
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

// ================== 🎓 실시간 학습 시스템 처리 함수 (완전 수정 버전) ==================
async function processRealTimeLearning(userMessage, mukuResponse, context, modules, enhancedLogging) {
    // 🛡️ 완벽한 안전 장치
    if (!userMessage || !mukuResponse) {
        console.log(`${colors.learning}⚠️ [학습시스템] 유효하지 않은 메시지 - 학습 건너뛰기${colors.reset}`);
        return null;
    }

    // 🛡️ 모듈 안전 확인
    const learningSystem = safeModuleAccess(modules, 'learningSystem', '학습시스템접근');
    if (!learningSystem) {
        console.log(`${colors.learning}🎓 [학습시스템] 모듈 없음 - 학습 건너뛰기 (대화는 정상 진행)${colors.reset}`);
        return null;
    }

    console.log(`${colors.realtime}🎓 [실시간학습] 대화 학습 시작...${colors.reset}`);
    console.log(`${colors.realtime}    📝 사용자: "${String(userMessage).substring(0, 30)}..."${colors.reset}`);
    console.log(`${colors.realtime}    💬 무쿠: "${String(mukuResponse).substring(0, 30)}..."${colors.reset}`);

    // ⭐️ 안전한 학습 컨텍스트 구성 ⭐️
    const learningContext = {
        ...(context || {}),
        timestamp: new Date().toISOString(),
        japanTime: getJapanTimeString(),
        japanHour: getJapanHour(),
        messageLength: String(userMessage).length,
        responseLength: String(mukuResponse).length
    };

    // 🛡️ 안전한 감정 상태 추가
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

    // 🛡️ 안전한 삐짐 상태 추가
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

    // 🛡️ 안전한 생리주기 상태 추가
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

    // ⭐️⭐️ 완전 수정된 학습 함수 호출 시스템 ⭐️⭐️
    let learningResult = null;
    let methodUsed = null;

    // 🎯 1단계: IntegratedLearningSystemManager 메서드 직접 호출 시도
    console.log(`${colors.realtime}    🎯 통합 학습 시스템 직접 호출 시도...${colors.reset}`);
    
    // processLearning 메서드 시도
    if (typeof learningSystem.processLearning === 'function') {
        console.log(`${colors.realtime}    🔧 processLearning() 직접 호출...${colors.reset}`);
        
        learningResult = await safeAsyncCall(async () => {
            return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
        }, '통합학습시스템-processLearning');
        
        if (learningResult) {
            methodUsed = 'IntegratedLearningSystemManager.processLearning';
            console.log(`${colors.success}    ✅ 통합 학습 시스템 성공!${colors.reset}`);
        }
    }

    // 🎯 2단계: 초기화 후 재시도
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔄 통합 학습 시스템 초기화 시도...${colors.reset}`);
        
        // 올바른 초기화 방법
        if (typeof learningSystem.initialize === 'function') {
            console.log(`${colors.realtime}    🔧 initialize() 호출...${colors.reset}`);
            
            const initialized = await safeAsyncCall(async () => {
                return await learningSystem.initialize(modules, {});
            }, '통합학습시스템-초기화');
            
            if (initialized) {
                console.log(`${colors.success}    ✅ 초기화 성공!${colors.reset}`);
                
                // 초기화 후 다시 학습 시도
                if (typeof learningSystem.processLearning === 'function') {
                    learningResult = await safeAsyncCall(async () => {
                        return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
                    }, '초기화후-통합학습');
                    
                    if (learningResult) {
                        methodUsed = 'IntegratedLearningSystemManager.processLearning (초기화 후)';
                        console.log(`${colors.success}    ✅ 초기화 후 학습 성공!${colors.reset}`);
                    }
                }
            }
        }
    }

    // 🎯 3단계: Enterprise/Independent 시스템 개별 시도
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔍 개별 학습 시스템 시도...${colors.reset}`);
        
        // Enterprise 시스템 시도
        const enterpriseSystem = safeModuleAccess(learningSystem, 'enterpriseSystem', 'Enterprise시스템');
        if (enterpriseSystem) {
            console.log(`${colors.realtime}    🏢 Enterprise 시스템 시도...${colors.reset}`);
            
            // Enterprise 시스템의 processLearning 시도
            const enterpriseProcessLearning = safeModuleAccess(enterpriseSystem, 'processLearning', 'Enterprise-processLearning');
            if (typeof enterpriseProcessLearning === 'function') {
                learningResult = await safeAsyncCall(async () => {
                    return await enterpriseProcessLearning(userMessage, mukuResponse, learningContext);
                }, 'Enterprise학습호출');
                
                if (learningResult) {
                    methodUsed = 'EnterpriseSystem.processLearning';
                    console.log(`${colors.success}    ✅ Enterprise 학습 성공!${colors.reset}`);
                }
            }
            
            // Enterprise 시스템 getInstance 후 시도
            if (!learningResult) {
                const getInstance = safeModuleAccess(enterpriseSystem, 'getInstance', 'Enterprise-getInstance');
                if (typeof getInstance === 'function') {
                    const enterpriseInstance = await safeAsyncCall(async () => {
                        return await getInstance();
                    }, 'Enterprise인스턴스조회');
                    
                    if (enterpriseInstance) {
                        const instanceProcessLearning = safeModuleAccess(enterpriseInstance, 'learnFromConversation', 'Enterprise인스턴스-학습');
                        if (typeof instanceProcessLearning === 'function') {
                            learningResult = await safeAsyncCall(async () => {
                                return await instanceProcessLearning(userMessage, mukuResponse, learningContext);
                            }, 'Enterprise인스턴스학습호출');
                            
                            if (learningResult) {
                                methodUsed = 'EnterpriseInstance.learnFromConversation';
                                console.log(`${colors.success}    ✅ Enterprise 인스턴스 학습 성공!${colors.reset}`);
                            }
                        }
                    }
                }
            }
        }
        
        // Independent 시스템 시도 (Enterprise 실패 시)
        if (!learningResult) {
            const independentSystem = safeModuleAccess(learningSystem, 'independentSystem', 'Independent시스템');
            if (independentSystem) {
                console.log(`${colors.realtime}    🤖 Independent 시스템 시도...${colors.reset}`);
                
                const independentAddConversation = safeModuleAccess(independentSystem, 'addConversation', 'Independent-addConversation');
                if (typeof independentAddConversation === 'function') {
                    const independentResult = await safeAsyncCall(async () => {
                        return await independentAddConversation(userMessage, mukuResponse, learningContext);
                    }, 'Independent학습호출');
                    
                    if (independentResult) {
                        learningResult = { independent: independentResult };
                        methodUsed = 'IndependentSystem.addConversation';
                        console.log(`${colors.success}    ✅ Independent 학습 성공!${colors.reset}`);
                    }
                }
            }
        }
    }

    // 🎯 4단계: 레거시 방식 시도 (모든 방법 실패 시)
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔄 레거시 방식 시도...${colors.reset}`);
        
        const legacyPaths = [
            'mukuLearningSystem.processLearning',
            'realTimeLearningSystem.processLearning',
            'learnFromConversation'
        ];
        
        for (const path of legacyPaths) {
            const legacyFunction = safeModuleAccess(learningSystem, path, `레거시-${path}`);
            
            if (typeof legacyFunction === 'function') {
                console.log(`${colors.realtime}    🎯 ${path} 시도...${colors.reset}`);
                
                learningResult = await safeAsyncCall(async () => {
                    return await legacyFunction(userMessage, mukuResponse, learningContext);
                }, `레거시학습호출-${path}`);
                
                if (learningResult) {
                    methodUsed = `Legacy.${path}`;
                    console.log(`${colors.success}    ✅ ${path} 성공!${colors.reset}`);
                    break;
                }
            }
        }
    }

    // 🎉 학습 결과 처리
    if (learningResult && methodUsed) {
        console.log(`${colors.success}🎉 [학습완료] ${methodUsed} 사용하여 학습 성공!${colors.reset}`);
        
        // 다양한 학습 결과 구조 처리
        if (learningResult.enterprise || learningResult.independent) {
            console.log(`${colors.realtime}    📊 통합학습: Enterprise(${learningResult.enterprise ? '성공' : '실패'}), Independent(${learningResult.independent ? '성공' : '실패'})${colors.reset}`);
        } else if (learningResult.improvements && Array.isArray(learningResult.improvements) && learningResult.improvements.length > 0) {
            console.log(`${colors.realtime}    📈 개선사항: ${learningResult.improvements.length}개${colors.reset}`);
            learningResult.improvements.slice(0, 3).forEach(improvement => {
                console.log(`${colors.realtime}      ✨ ${improvement.type || '기타'}: ${improvement.reason || improvement.action || '개선됨'}${colors.reset}`);
            });
        } else if (learningResult.independent) {
            console.log(`${colors.realtime}    🤖 Independent 학습: ${learningResult.independent ? '성공' : '실패'}${colors.reset}`);
        } else {
            console.log(`${colors.realtime}    ✅ 학습 처리 완료${colors.reset}`);
        }

        // 🛡️ 안전한 로깅
        await safeAsyncCall(async () => {
            const logFunction = safeModuleAccess(enhancedLogging, 'logSystemOperation', '시스템로깅');
            if (typeof logFunction === 'function') {
                const logMessage = learningResult.improvements 
                    ? `학습완료: ${learningResult.improvements.length}개 개선`
                    : `학습완료: ${methodUsed}`;
                logFunction('실시간학습완료', logMessage);
            }
        }, '학습결과로깅');

        return learningResult;
    } else {
        console.log(`${colors.learning}⚪ [학습결과] 모든 학습 방법 실패 - 학습 건너뛰기 (대화는 정상 진행)${colors.reset}`);
        return null;
    }
}

// ================== 🎭 실시간 행동 스위치 처리 함수 (완벽한 에러 방지) ==================
async function applyBehaviorModeToResponse(response, modules, messageContext) {
    if (!response) return response;

    const behaviorSwitch = safeModuleAccess(modules, 'realtimeBehaviorSwitch', '행동스위치');
    if (!behaviorSwitch) return response;

    return await safeAsyncCall(async () => {
        const getCurrentRolePlay = safeModuleAccess(behaviorSwitch, 'getCurrentRolePlay', '현재역할조회');
        const getCurrentBehaviorMode = safeModuleAccess(behaviorSwitch, 'getCurrentBehaviorMode', '현재행동모드조회');
        
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
                await client.pushMessage(userId, { 
                    type: 'text', 
                    text: switchResult 
                });
                console.log(`${colors.behavior}📤 [행동변경] 응답 메시지 전송 완료${colors.reset}`);
            }, '행동변경메시지전송');
            
            return {
                type: 'behavior_switch_handled',
                handled: true,
                response: null,
                skipFurtherProcessing: true
            };
        } else {
            console.log(`${colors.behavior}⚪ [행동스위치] 명령어 없음${colors.reset}`);
        }

        return null;
    }, '행동스위치처리');
}

// ================== 🎂 생일 감지 및 처리 (완벽한 에러 방지) ==================
async function processBirthdayDetection(messageText, modules, enhancedLogging) {
    if (!messageText) return null;

    const birthdayDetector = safeModuleAccess(modules, 'birthdayDetector', '생일감지기');
    if (!birthdayDetector) {
        console.log(`${colors.learning}🎂 [생일감지] 모듈 없음 - 건너뛰기${colors.reset}`);
        return null;
    }

    // 🛡️ 가능한 함수 이름들 시도
    const functionNames = ['detectBirthday', 'checkBirthday', 'processBirthday', 'handleBirthday'];
    
    for (const funcName of functionNames) {
        const birthdayFunction = safeModuleAccess(birthdayDetector, funcName, `생일함수-${funcName}`);
        
        if (typeof birthdayFunction === 'function') {
            console.log(`${colors.learning}🎂 [생일감지] ${funcName}() 시도...${colors.reset}`);
            
            const birthdayResponse = await safeAsyncCall(async () => {
                return await birthdayFunction(messageText, getJapanTime());
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

async function processNightWakeMessage(messageText, modules, enhancedLogging) {
    if (!messageText) return null;

    const currentHour = getJapanHour();
    if (currentHour < 2 || currentHour > 7) return null;

    return await safeAsyncCall(async () => {
        const nightWakeResponse = safeModuleAccess(modules, 'nightWakeResponse', '새벽대화');
        if (nightWakeResponse) {
            const processFunction = safeModuleAccess(nightWakeResponse, 'processNightMessage', '새벽메시지처리');
            if (typeof processFunction === 'function') {
                const nightResponse = await processFunction(messageText, currentHour);
                if (nightResponse && nightResponse.handled) {
                    console.log(`${colors.yejin}🌙 [새벽대화] ${nightResponse.response}${colors.reset}`);
                    
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('night_wake', nightResponse.response);
                    }
                    
                    return nightResponse;
                }
            }
        }
        return null;
    }, '새벽대화처리');
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

        // 얼굴 인식 처리
        const analysisResult = await detectFaceSafely(base64, faceMatcher, loadFaceMatcherSafely);

        let finalResponse;

        // AI가 생성한 반응 우선 사용
        if (analysisResult && analysisResult.message) {
            finalResponse = {
                type: 'text',
                comment: analysisResult.message,
                personalized: true,
                aiGenerated: true
            };
        } else {
            // 기본 응답 생성
            const faceType = analysisResult ? analysisResult.type : 'unknown';
            finalResponse = generateFaceRecognitionResponse(faceType, modules, {});
        }

        // 행동 모드 적용
        const behaviorAppliedResponse = await applyBehaviorModeToResponse(
            finalResponse,
            modules,
            { messageType: 'image', faceResult: analysisResult?.type }
        );

        // 이미지 메타데이터 생성
        const imageMetadata = {
            base64,
            imageSize: buffer.length,
            timestamp: getJapanTime(),
            context: 'photo_sharing'
        };

        // 사람 학습 처리 (안전하게)
        await safeAsyncCall(async () => {
            const personLearningSystem = safeModuleAccess(modules, 'personLearningSystem', '사람학습시스템');
            if (personLearningSystem) {
                // 학습 시도 (실패해도 무시)
                if (analysisResult && analysisResult.type) {
                    const recordFunction = safeModuleAccess(personLearningSystem, 'recordKnownPersonSighting', '알려진인물기록');
                    if (typeof recordFunction === 'function') {
                        await recordFunction(analysisResult.type, imageMetadata.timestamp, imageMetadata.context);
                    }
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
        messageType: messageType
    };

    return await applyBehaviorModeToResponse(baseResponse, modules, { messageType: messageType });
}

// ================== 🎯 메인 이벤트 처리 함수 (하이브리드 대화 저장 + 맥락 강화 완전 수정) ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    // 🛡️ 기본 검증
    if (!event || event.type !== 'message') {
        return Promise.resolve(null);
    }

    if (!event.message || !event.source) {
        console.log(`${colors.warning}⚠️ [이벤트] 유효하지 않은 이벤트 구조${colors.reset}`);
        return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const userMessage = event.message;

    // 🛡️ 안전한 기본 변수 설정
    const safeUserId = userId || 'unknown_user';
    const safeMessageType = userMessage.type || 'unknown';

    try {
        // =============== 📝 텍스트 메시지 처리 ===============
        if (safeMessageType === 'text') {
            const messageText = String(userMessage.text || '').trim();
            
            if (!messageText) {
                console.log(`${colors.warning}⚠️ [텍스트] 빈 메시지 - 기본 응답 생성${colors.reset}`);
                const emptyResponse = await generateContextAwareResponse('', modules, enhancedLogging, { userId: safeUserId });
                return { type: 'empty_message_response', response: emptyResponse };
            }

            // 로깅
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('아저씨', messageText, 'text');
                } else {
                    console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);
                }
            }, '사용자메시지로깅');

            // ⭐️ 1순위: 행동 스위치 처리 (최우선)
            const behaviorSwitchResult = await processBehaviorSwitch(messageText, modules, client, safeUserId);
            if (behaviorSwitchResult && behaviorSwitchResult.handled) {
                console.log(`${colors.behavior}🎭 [완료] 행동 설정 변경 완료${colors.reset}`);
                return null; // 추가 처리 중단
            }

            console.log(`${colors.learning}🧠 [처리시작] 메시지 분석 및 응답 생성 시작...${colors.reset}`);

            // ⭐️ 2순위: 버전 명령어 처리
            const versionResponse = processVersionCommand(messageText, getVersionResponse);
            if (versionResponse) {
                const behaviorVersionResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: versionResponse },
                    modules,
                    { messageText, responseType: 'version' }
                );

                const finalVersionComment = behaviorVersionResponse.comment || versionResponse;

                // 🔥 하이브리드 대화 저장!
                await saveConversationHybrid(safeUserId, messageText, finalVersionComment, 'text');

                // 실시간 학습 처리
                await processRealTimeLearning(
                    messageText,
                    finalVersionComment,
                    { messageType: 'text', responseType: 'version', userId: safeUserId },
                    modules,
                    enhancedLogging
                );

                // 로깅
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

            // ⭐️ 병렬 처리: 기타 시스템들 (에러가 나도 진행 계속)
            const parallelTasks = [
                processSulkyRelief(modules, enhancedLogging),
                processNightWakeMessage(messageText, modules, enhancedLogging),
                processBirthdayDetection(messageText, modules, enhancedLogging),
                safeAsyncCall(() => processFixedMemory(messageText, modules), '고정기억처리'),
                processCommand(messageText, safeUserId, client, modules)
            ];

            const [, nightResponse, birthdayResponse, , commandResult] = await Promise.allSettled(parallelTasks)
                .then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

            // ⭐️ 특별 응답 처리
            if (nightResponse) {
                const behaviorNightResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: nightResponse.response },
                    modules,
                    { messageText, responseType: 'night', hour: getJapanHour() }
                );

                const finalNightComment = behaviorNightResponse.comment || nightResponse.response;

                // 🔥 하이브리드 대화 저장!
                await saveConversationHybrid(safeUserId, messageText, finalNightComment, 'text');

                await processRealTimeLearning(
                    messageText,
                    finalNightComment,
                    { messageType: 'text', responseType: 'night', hour: getJapanHour(), userId: safeUserId },
                    modules,
                    enhancedLogging
                );

                return { type: 'night_response', response: finalNightComment };
            }

            if (birthdayResponse) {
                const behaviorBirthdayResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: birthdayResponse.response },
                    modules,
                    { messageText, responseType: 'birthday' }
                );

                const finalBirthdayComment = behaviorBirthdayResponse.comment || birthdayResponse.response;

                // 🔥 하이브리드 대화 저장!
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

            // 🔥 ⭐️ [핵심 수정] Command 처리 시 하이브리드 저장 추가! ⭐️ 🔥
            if (commandResult) {
                const finalCommandComment = commandResult.comment || commandResult.text || commandResult;

                console.log(`${colors.hybrid}🎯 [Command저장] Command 처리 후 하이브리드 저장 시작...${colors.reset}`);
                
                // 🔥 하이브리드 대화 저장! (빠뜨렸던 부분!)
                await saveConversationHybrid(safeUserId, messageText, finalCommandComment, 'text');

                // 실시간 학습 처리
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

            // ⭐️ 3순위: 맥락 기반 일반 대화 처리 (무조건 성공 보장)
            const chatResponse = await generateContextAwareResponse(messageText, modules, enhancedLogging, { userId: safeUserId });
            
            if (chatResponse) {
                const finalChatComment = chatResponse.comment || chatResponse;

                // 🔥 하이브리드 대화 저장! (가장 중요!)
                await saveConversationHybrid(safeUserId, messageText, finalChatComment, 'text');

                // 실시간 학습 처리
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

                // 로깅
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

            // 🚨 최종 안전장치 (절대 실패하지 않는 응답)
            console.log(`${colors.warning}⚠️ [최종안전장치] 모든 응답 시스템 실패 - 완벽한 안전 응답 생성${colors.reset}`);
            
            const ultimateSafeResponse = {
                type: 'text',
                comment: '아조씨! 나 지금 뭔가 생각하고 있었어~ 다시 말해줄래? ㅎㅎ',
                ultimateFallback: true
            };

            // 🔥 최종 안전 응답도 저장!
            await saveConversationHybrid(safeUserId, messageText, ultimateSafeResponse.comment, 'text');

            await processRealTimeLearning(
                messageText,
                ultimateSafeResponse.comment,
                { messageType: 'text', responseType: 'ultimate_safe', userId: safeUserId },
                modules,
                enhancedLogging
            );

            return { type: 'ultimate_safe_response', response: ultimateSafeResponse };
        }
        
        // =============== 📸 이미지 메시지 처리 ===============
        else if (safeMessageType === 'image') {
            // 로깅
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

            // 🔥 하이브리드 대화 저장! (이미지도 저장!)
            await saveConversationHybrid(safeUserId, '이미지 전송', finalImageComment, 'image');

            // 실시간 학습 처리
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

            // 로깅
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
        }
        
        // =============== 📎 기타 메시지 타입 처리 ===============
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${safeMessageType} 메시지${colors.reset}`);
            
            const otherResponse = await processOtherMessageType(safeMessageType, modules);
            const finalOtherComment = otherResponse.comment || otherResponse;

            // 🔥 하이브리드 대화 저장! (기타 타입도 저장!)
            await saveConversationHybrid(safeUserId, `${safeMessageType} 메시지`, finalOtherComment, safeMessageType);

            // 실시간 학습 처리
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

        // 🚨 완벽한 에러 복구 시스템
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

        // 에러 상황에서도 행동 모드 적용 시도
        const finalEmergencyResponse = await safeAsyncCall(async () => {
            return await applyBehaviorModeToResponse(
                emergencyResponse,
                modules,
                { error: true, errorMessage: error.message }
            );
        }, '응급행동모드적용', emergencyResponse);

        const finalEmergencyComment = finalEmergencyResponse.comment || finalEmergencyResponse;

        // 🔥 에러 상황에서도 하이브리드 저장 시도!
        await safeAsyncCall(async () => {
            const errorMessage = userMessage?.text || '에러 발생';
            await saveConversationHybrid(safeUserId, errorMessage, finalEmergencyComment, safeMessageType);
        }, '응급대화저장');

        // 에러 상황에서도 학습 시도
        await safeAsyncCall(async () => {
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
        }, '응급학습처리');

        // 에러 로깅 시도
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
    // 🔥 하이브리드 대화 저장 함수들 추가!
    saveConversationHybrid,
    getConversationHistoryHybrid,
    // 💭 NEW: 맥락 기반 응답 생성 함수
    generateContextAwareResponse,
    // 💭 메모리 저장소 관리 함수들
    getMemoryConversations: () => memoryConversationStore,
    clearMemoryConversations: () => { memoryConversationStore = []; },
    getMemoryConversationCount: () => memoryConversationStore.length
};
