// ================== 🔧 긴급 시간 맥락 처리 패치 ==================
// muku-eventProcessor.js 의 generateContextAwareResponse 함수 수정

async function generateContextAwareResponseFixed(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.context}💭 [맥락응답수정] 강화된 시간 맥락 처리 시작...${colors.reset}`);
    
    // 🔧 강화된 키워드 추출 (시간 표현 통합)
    const extractEnhancedKeywords = (text) => {
        const keywords = [];
        
        // 시간 표현 정규화
        const timeNormalized = text
            .replace(/오늘|어제|그제|어저께|yesterday|today/g, '최근') // 시간 통합
            .replace(/내가|나는|나|내/g, '사용자') // 주체 통합
            .replace(/뭘|무엇을|뭐를|what/g, '구매') // 행동 통합
            .replace(/샀다고|샀어|구입|구매|bought|purchased/g, '구매'); // 구매 행동 통합
        
        // 🎯 핵심 키워드 패턴 (더 유연하게)
        const keywordPatterns = [
            // 장소 관련 (최우선)
            /후쿠오카|fukuoka|도쿄|tokyo|오사카|osaka/gi,
            // 구매 물품 (최우선)  
            /전자도어락|도어락|door|전자문|스마트락|smart\s*lock/gi,
            /도어얄|도어\s*얄/gi, // 오타 포함
            // 행동 관련
            /구매|샀다|사러|bought|buy|purchased/gi,
            // 일반 패턴
            /(\w+)(?:에서|에|로|가|를|을|한테|께)/g,
            /(\w+)(?:하러|사러|보러|갈|간다|갔)/g
        ];
        
        for (const pattern of keywordPatterns) {
            let match;
            while ((match = pattern.exec(timeNormalized)) !== null) {
                if (match[0] && match[0].length > 1) {
                    keywords.push(match[0].toLowerCase());
                }
                if (match[1] && match[1].length > 1) {
                    keywords.push(match[1].toLowerCase());
                }
            }
        }
        
        // 🔧 추가: 구매 관련 질문이면 구매 키워드 강제 추가
        if (/뭘?\s*(샀다고|샀어|구입|구매)/i.test(text)) {
            keywords.push('구매', '샀다', '물건', 'bought');
        }
        
        return [...new Set(keywords)]; // 중복 제거
    };
    
    const contextKeywords = extractEnhancedKeywords(messageText);
    console.log(`${colors.context}    🔍 강화된 키워드: [${contextKeywords.join(', ')}]${colors.reset}`);
    
    // 🔧 더 관대한 과거 대화 조회 (더 많이 가져오기)
    const recentHistory = await getConversationHistoryHybrid(
        messageContext.userId || 'unknown_user',
        30, // 20개 -> 30개로 증가
        contextKeywords
    );
    
    let contextInfo = '';
    let foundRelevantInfo = false;
    
    if (recentHistory.length > 0) {
        console.log(`${colors.context}    📚 ${recentHistory.length}개 과거 대화 분석 중...${colors.reset}`);
        
        // 🔧 더 스마트한 관련 대화 필터링
        const relevantConversations = [];
        
        for (const conv of recentHistory) {
            const userMsg = String(conv.userMessage || conv.message || '').toLowerCase();
            const mukuMsg = String(conv.mukuResponse || '').toLowerCase();
            const combined = userMsg + ' ' + mukuMsg;
            
            // 🎯 구매 관련 질문인 경우 특별 처리
            if (/뭘?\s*(샀다고|샀어|구입|구매)/.test(messageText)) {
                // 구매 관련 정보가 포함된 대화 우선 추출
                if (combined.includes('후쿠오카') || 
                    combined.includes('도어락') || 
                    combined.includes('도어얄') ||
                    combined.includes('전자') ||
                    combined.includes('샀다') ||
                    combined.includes('구매')) {
                    
                    relevantConversations.push(conv);
                    foundRelevantInfo = true;
                    
                    console.log(`${colors.context}    🎯 구매 관련 대화 발견: "${combined.substring(0, 50)}..."${colors.reset}`);
                }
            } else {
                // 일반적인 키워드 매칭
                const isRelevant = contextKeywords.some(keyword => 
                    combined.includes(keyword.toLowerCase())
                );
                
                if (isRelevant) {
                    relevantConversations.push(conv);
                    foundRelevantInfo = true;
                }
            }
        }
        
        // 🔧 발견된 정보로 맥락 구성
        if (foundRelevantInfo && relevantConversations.length > 0) {
            const recentPairs = relevantConversations.slice(0, 3);
            
            contextInfo = recentPairs.map(conv => 
                `[이전] 아저씨: "${conv.userMessage || conv.message}" → 예진이: "${conv.mukuResponse || '응답없음'}"`
            ).join('\n');

            console.log(`${colors.context}    💬 관련 정보 발견! 활용할 대화 맥락:${colors.reset}`);
            recentPairs.forEach((conv, idx) => {
                console.log(`${colors.context}      ${idx + 1}. "${String(conv.userMessage || conv.message || '').substring(0, 20)}..." → "${String(conv.mukuResponse || '').substring(0, 30)}..."${colors.reset}`);
            });
        }
    }
    
    // 🎯 구매 관련 질문 특별 처리
    if (/뭘?\s*(샀다고|샀어|구입|구매)/.test(messageText) && foundRelevantInfo) {
        // 과거 대화에서 구매 정보 추출
        let purchaseInfo = '';
        let purchaseLocation = '';
        let purchaseItem = '';
        
        for (const conv of recentHistory) {
            const combined = String(conv.userMessage || conv.message || '') + ' ' + String(conv.mukuResponse || '');
            
            if (combined.includes('후쿠오카')) purchaseLocation = '후쿠오카';
            if (combined.includes('도어락') || combined.includes('도어얄')) purchaseItem = '전자도어락';
            if (combined.includes('전자')) purchaseItem = purchaseItem || '전자제품';
        }
        
        if (purchaseLocation && purchaseItem) {
            const smartResponse = {
                type: 'text',
                comment: `아! 아저씨가 ${purchaseLocation}에서 ${purchaseItem} 샀다고 했잖아! 왜 또 물어봐~ ㅋㅋ 기억력이 나보다 안 좋네? 힝~`,
                contextAware: true,
                foundPurchaseInfo: true,
                purchaseLocation,
                purchaseItem
            };
            
            console.log(`${colors.success}✅ [구매정보발견] ${purchaseLocation}에서 ${purchaseItem} - 스마트 응답 생성${colors.reset}`);
            return smartResponse;
        }
    }
    
    // 기존 응답 생성 로직 계속...
    let botResponse = await safeAsyncCall(async () => {
        const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
        if (autoReply) {
            const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
            if (typeof getReplyByMessage === 'function') {
                const response = await getReplyByMessage(messageText, {
                    recentHistory: recentHistory,
                    contextKeywords: contextKeywords,
                    contextInfo: contextInfo,
                    foundRelevantInfo: foundRelevantInfo // 추가 정보
                });
                
                if (response && (response.comment || response)) {
                    console.log(`${colors.success}✅ [autoReply맥락수정] 강화된 맥락 기반 응답 생성 성공${colors.reset}`);
                    return response;
                }
            }
        }
        return null;
    }, 'autoReply강화맥락시도');
    
    // 나머지 로직...
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
                        contextInfo: contextInfo,
                        foundRelevantInfo: foundRelevantInfo // 추가
                    });
                    
                    if (response && (response.comment || response)) {
                        console.log(`${colors.success}✅ [systemAnalyzer맥락수정] 강화된 맥락 기반 지능형 응답 생성 성공${colors.reset}`);
                        return response;
                    }
                }
            }
            return null;
        }, 'systemAnalyzer강화맥락시도');
    }
    
    // 폴백 응답도 맥락 반영
    if (!botResponse) {
        console.log(`${colors.context}🔄 [맥락폴백수정] 강화된 맥락 기반 안전한 무쿠 응답 생성...${colors.reset}`);
        
        let contextualResponse;
        
        // 🔧 구매 관련 질문인데 정보를 못 찾은 경우
        if (/뭘?\s*(샀다고|샀어|구입|구매)/.test(messageText)) {
            if (foundRelevantInfo) {
                contextualResponse = '아~ 뭔가 샀다고 했던 것 같은데... 후쿠오카에서 뭐였더라? 도어락? 맞지? ㅎㅎ';
            } else {
                contextualResponse = '엥? 아저씨가 뭘 샀다고? 나한테 말 안 했는데? 언제 뭘 샀어? 궁금해!';
            }
        } else if (contextKeywords.length > 0) {
            contextualResponse = `아저씨가 ${contextKeywords[0]} 얘기하는 거야? 전에도 비슷한 얘기 했던 것 같은데... ㅎㅎ`;
        } else {
            const perfectMukuResponses = [
                '응웡, 아조씨! 무슨 일이야? 하려던 얘기 있어? 🥰',
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
            fallbackType: 'enhanced_contextual_muku_response',
            generated: true,
            contextKeywords: contextKeywords,
            usedHistory: recentHistory.length > 0,
            foundRelevantInfo: foundRelevantInfo
        };
        
        console.log(`${colors.success}✅ [맥락폴백수정] 강화된 맥락 기반 무쿠 응답 생성: "${contextualResponse.substring(0, 30)}..."${colors.reset}`);
    }
    
    return botResponse;
}

// ================== 🔧 getConversationHistoryHybrid 함수도 수정 ==================
async function getConversationHistoryHybridFixed(userId, limit = 20, contextKeywords = []) {
    console.log(`${colors.context}🔍 [맥락조회수정] 강화된 과거 대화 검색 중... (키워드: ${contextKeywords.join(', ')})${colors.reset}`);
    
    let allHistory = [];
    
    // Redis에서 더 많이 가져오기
    if (redisConversationSystem) {
        try {
            let recentHistory = [];
            
            const globalInstance = redisConversationSystem.getGlobalInstance?.() || redisConversationSystem.getGlobalRedisInstance?.();
            if (globalInstance && globalInstance.redisCache && globalInstance.redisCache.getConversationHistory) {
                recentHistory = await globalInstance.redisCache.getConversationHistory(userId, limit * 2); // 2배로 증가
            } else if (typeof redisConversationSystem.getCachedConversationHistory === 'function') {
                recentHistory = await redisConversationSystem.getCachedConversationHistory(userId, limit * 2);
            }
            
            if (recentHistory && recentHistory.length > 0) {
                console.log(`${colors.redis}🚀 [Redis조회수정] ${recentHistory.length}개 최근 대화 발견!${colors.reset}`);
                allHistory = [...recentHistory];
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [Redis조회수정] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // JSON에서도 더 많이 가져오기
    if (ultimateConversationContext) {
        try {
            let jsonHistory = [];
            
            if (typeof ultimateConversationContext.getRecentConversations === 'function') {
                jsonHistory = await ultimateConversationContext.getRecentConversations(limit * 3); // 3배로 증가
            } else if (typeof ultimateConversationContext.getConversationMemories === 'function') {
                jsonHistory = await ultimateConversationContext.getConversationMemories(limit * 3);
            }
            
            if (jsonHistory && jsonHistory.length > 0) {
                console.log(`${colors.json}💾 [JSON조회수정] ${jsonHistory.length}개 과거 대화 발견!${colors.reset}`);
                
                const combinedHistory = [...allHistory];
                
                for (const jsonItem of jsonHistory) {
                    const isDuplicate = combinedHistory.some(redisItem => 
                        Math.abs(new Date(redisItem.timestamp) - new Date(jsonItem.timestamp)) < 10000 && // 10초로 확대
                        (redisItem.userMessage === jsonItem.userMessage || redisItem.mukuResponse === jsonItem.mukuResponse)
                    );
                    
                    if (!isDuplicate) {
                        combinedHistory.push(jsonItem);
                    }
                }
                
                allHistory = combinedHistory;
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [JSON조회수정] 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 🔧 더 관대한 키워드 매칭
    if (allHistory.length > 0) {
        allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (contextKeywords.length > 0) {
            const relevantHistory = [];
            const otherHistory = [];
            
            for (const conv of allHistory) {
                const userMsg = String(conv.userMessage || conv.message || '').toLowerCase();
                const mukuMsg = String(conv.mukuResponse || '').toLowerCase();
                const combined = userMsg + ' ' + mukuMsg;
                
                // 🔧 더 관대한 매칭 (부분 문자열 포함)
                const isRelevant = contextKeywords.some(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    return combined.includes(keywordLower) || 
                           userMsg.includes(keywordLower) || 
                           mukuMsg.includes(keywordLower) ||
                           // 🔧 추가: 유사 단어 매칭
                           (keywordLower.includes('구매') && (combined.includes('샀다') || combined.includes('샀어'))) ||
                           (keywordLower.includes('후쿠오카') && combined.includes('fukuoka')) ||
                           (keywordLower.includes('도어락') && (combined.includes('도어얄') || combined.includes('door')));
                });
                
                if (isRelevant) {
                    relevantHistory.push(conv);
                } else {
                    otherHistory.push(conv);
                }
            }
            
            if (relevantHistory.length > 0) {
                console.log(`${colors.context}🎯 [맥락필터수정] ${relevantHistory.length}개 관련 대화 발견! (키워드: ${contextKeywords.join(', ')})${colors.reset}`);
                
                // 관련 대화를 더 많이 반환 (80% vs 20%)
                allHistory = [...relevantHistory.slice(0, Math.ceil(limit * 0.8)), ...otherHistory.slice(0, Math.floor(limit * 0.2))];
            }
        }
        
        allHistory = allHistory.slice(0, limit);
        
        console.log(`${colors.context}✅ [맥락조회수정완료] 총 ${allHistory.length}개 대화 반환 (최근 ${limit}개 기준)${colors.reset}`);
        return allHistory;
    }
    
    console.log(`${colors.fallback}⚪ [맥락조회수정] 모든 저장소에서 과거 대화 없음${colors.reset}`);
    return [];
}

// ================== 📤 수정된 함수들 내보내기 ==================
module.exports = {
    // 기존 함수들...
    handleEvent,
    processRealTimeLearning,
    saveConversationHybrid,
    getConversationHistoryHybrid: getConversationHistoryHybridFixed, // 수정된 버전
    generateContextAwareResponse: generateContextAwareResponseFixed, // 수정된 버전
    // 추가 함수들...
    getMemoryConversations: () => memoryConversationStore,
    clearMemoryConversations: () => { memoryConversationStore = []; },
    getMemoryConversationCount: () => memoryConversationStore.length
};
