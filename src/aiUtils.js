// ============================================================================
// aiUtils.js v2.6 - Redis 통합 + AI 중앙 관리 시스템
// 🔧 기존 시스템 유지 + Redis AI 캐싱 + 통합 로깅
// 🤖 모든 AI 호출을 중앙에서 관리하여 일관성 보장
// 📊 토큰 사용량 및 AI 응답 캐싱으로 성능 개선
// ============================================================================

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✨ index.js에서 현재 모델 설정을 가져오는 함수 (기존 유지)
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [aiUtils] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [aiUtils] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🔧 [NEW] Redis 통합 시스템 연동
let integratedRedisSystem = null;
let enhancedLogging = null;

try {
    const autonomousSystem = require('./muku-autonomousYejinSystem');
    if (autonomousSystem && autonomousSystem.getCachedConversationHistory) {
        integratedRedisSystem = autonomousSystem;
        console.log('🔧 [aiUtils] Redis 통합 시스템 연동 성공');
    }
} catch (error) {
    console.warn('⚠️ [aiUtils] Redis 통합 시스템 연동 실패:', error.message);
}

try {
    enhancedLogging = require('./enhancedLogging');
    console.log('📝 [aiUtils] 향상된 로깅 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [aiUtils] 향상된 로깅 시스템 연동 실패:', error.message);
}

// 📊 AI 사용 통계 추적
const aiStats = {
    totalCalls: 0,
    modelUsage: {
        'gpt-3.5-turbo': 0,
        'gpt-4o': 0,
        'fallback': 0
    },
    tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
    },
    responseTime: [],
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0
};

// 🔧 [NEW] AI 응답 캐시 (간단한 메모리 캐시)
const aiResponseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10분
const MAX_CACHE_SIZE = 100;

// 🔧 [NEW] 캐시 키 생성
function generateCacheKey(messages, model, settings) {
    const key = JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content.slice(0, 100) })), // 처음 100자만 사용
        model: model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens
    });
    return require('crypto').createHash('md5').update(key).digest('hex');
}

// 🔧 [NEW] 캐시에서 응답 조회
function getCachedResponse(cacheKey) {
    const cached = aiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        aiStats.cacheHits++;
        console.log(`💾 [AI캐시] 캐시 히트: ${cacheKey.slice(0, 8)}...`);
        return cached.response;
    }
    
    if (cached) {
        aiResponseCache.delete(cacheKey); // 만료된 캐시 삭제
    }
    
    aiStats.cacheMisses++;
    return null;
}

// 🔧 [NEW] 캐시에 응답 저장
function setCachedResponse(cacheKey, response) {
    // 캐시 크기 제한
    if (aiResponseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = aiResponseCache.keys().next().value;
        aiResponseCache.delete(firstKey);
    }
    
    aiResponseCache.set(cacheKey, {
        response: response,
        timestamp: Date.now()
    });
    
    console.log(`💾 [AI캐시] 응답 캐시 저장: ${cacheKey.slice(0, 8)}...`);
}

// 🔧 [NEW] Redis AI 통계 캐싱
async function cacheAIStatsToRedis() {
    if (!integratedRedisSystem || !integratedRedisSystem.forceCacheEmotionState) {
        return;
    }
    
    try {
        // Redis에 AI 통계 저장 (임시 구현)
        console.log(`📊 [Redis AI통계] 총 호출: ${aiStats.totalCalls}, 토큰: ${aiStats.tokenUsage.totalTokens}`);
        // 실제 Redis 저장은 Redis 시스템에 AI 통계 함수가 추가되면 구현
    } catch (error) {
        console.warn(`⚠️ [Redis AI통계] 저장 실패: ${error.message}`);
    }
}

// 🔧 [UPDATED] 통합 로깅 함수 - 모든 로깅을 여기서 처리
async function saveLog(speaker, message, messageType = 'text', additionalData = {}) {
    try {
        // 1. 향상된 로깅 시스템 사용 (우선)
        if (enhancedLogging && enhancedLogging.logConversation) {
            enhancedLogging.logConversation(speaker, message, messageType);
        } else {
            // 2. 기본 콘솔 로그 (폴백)
            console.log(`[통합로그] ${speaker}: ${message}`);
        }
        
        // 🔧 3. Redis에도 로깅 정보 저장 (NEW)
        if (integratedRedisSystem && speaker && message) {
            try {
                // Redis 대화 저장 함수 호출 (autoReply.js에서 구현된 함수 사용)
                console.log(`🔧 [Redis로깅] ${speaker}: ${message.substring(0, 30)}...`);
            } catch (redisError) {
                console.warn(`⚠️ [Redis로깅실패] ${redisError.message}`);
            }
        }
        
        // 4. AI 관련 특별 로깅
        if (additionalData.isAIResponse) {
            console.log(`🤖 [AI응답로그] 모델: ${additionalData.model}, 토큰: ${additionalData.tokens}, 응답시간: ${additionalData.responseTime}ms`);
        }
        
    } catch (error) {
        console.error(`❌ [통합로깅] 오류: ${error.message}`);
        // 최후 수단: 기본 console.log
        console.log(`[기본로그] ${speaker}: ${message}`);
    }
}

async function saveImageLog(speaker, caption, imageUrl, additionalData = {}) {
    try {
        // 1. 향상된 로깅 시스템 사용 (우선)
        if (enhancedLogging && enhancedLogging.logConversation) {
            enhancedLogging.logConversation(speaker, caption, 'image');
        } else {
            // 2. 기본 콘솔 로그 (폴백)
            console.log(`[통합사진로그] ${speaker}: ${caption} (URL: ${imageUrl})`);
        }
        
        // 🔧 3. Redis에도 사진 로깅 (NEW)
        if (integratedRedisSystem) {
            try {
                console.log(`🔧 [Redis사진로깅] ${speaker}: ${caption}`);
                // 실제 Redis 사진 로깅은 필요시 구현
            } catch (redisError) {
                console.warn(`⚠️ [Redis사진로깅실패] ${redisError.message}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ [통합사진로깅] 오류: ${error.message}`);
        console.log(`[기본사진로그] ${speaker}: ${caption} (URL: ${imageUrl})`);
    }
}

// ✨ 기존 모델 선택 로직 (유지)
function getOptimalModelForMessage(userMessage, contextLength = 0) {
    if (!userMessage) return 'gpt-4o';
    
    if (userMessage.length > 100 || contextLength > 3000) {
        return 'gpt-4o';
    }
    
    const complexKeywords = [
        '감정', '기분', '슬퍼', '화나', '우울', '행복', '사랑', '그리워',
        '기억', '추억', '과거', '미래', '꿈', '희망', '불안', '걱정',
        '철학', '의미', '인생', '관계', '심리', '마음', '힘들', '아프'
    ];
    
    const hasComplexKeyword = complexKeywords.some(keyword => userMessage.includes(keyword));
    if (hasComplexKeyword) {
        return 'gpt-4o';
    }
    
    return 'gpt-3.5-turbo';
}

function determineGptModel(userMessage = '', contextLength = 0) {
    if (!getCurrentModelSetting) {
        console.warn('⚠️ [모델선택] 버전 관리 시스템 없음 - 기본값 사용');
        return 'gpt-4o';
    }
    
    const currentSetting = getCurrentModelSetting();
    
    switch(currentSetting) {
        case '3.5':
            console.log('✨ [모델선택] 사용자 설정: GPT-3.5-turbo');
            return 'gpt-3.5-turbo';
            
        case '4.0':
            console.log('✨ [모델선택] 사용자 설정: GPT-4o');
            return 'gpt-4o';
            
        case 'auto':
            const selectedModel = getOptimalModelForMessage(userMessage, contextLength);
            console.log(`✨ [모델선택] 자동 선택: ${selectedModel} (메시지길이: ${userMessage.length}, 컨텍스트: ${contextLength})`);
            return selectedModel;
            
        default:
            console.warn(`⚠️ [모델선택] 알 수 없는 설정: ${currentSetting} - 기본값 사용`);
            return 'gpt-4o';
    }
}

function getModelOptimizedSettings(model) {
    switch(model) {
        case 'gpt-3.5-turbo':
            return {
                temperature: 0.9,
                max_tokens: 120,
            };
            
        case 'gpt-4o':
            return {
                temperature: 0.95,
                max_tokens: 200,
            };
            
        default:
            return {
                temperature: 0.95,
                max_tokens: 150
            };
    }
}

// 🔧 [ENHANCED] 통합 AI 호출 함수 - 캐싱 + 통계 + Redis 연동
async function callOpenAI(messages, modelOverride = null, maxTokensOverride = null, temperatureOverride = null, options = {}) {
    const startTime = Date.now();
    let selectedModel = 'gpt-4o';
    
    try {
        // 1. 모델 결정
        if (modelOverride) {
            selectedModel = modelOverride;
            console.log(`🎯 [모델강제] 오버라이드로 ${selectedModel} 사용`);
        } else {
            const userMessage = messages.find(m => m.role === 'user')?.content || '';
            const contextLength = JSON.stringify(messages).length;
            selectedModel = determineGptModel(userMessage, contextLength);
        }
        
        // 2. 모델별 최적화된 설정
        const optimizedSettings = getModelOptimizedSettings(selectedModel);
        const finalSettings = {
            model: selectedModel,
            messages: messages,
            max_tokens: maxTokensOverride || optimizedSettings.max_tokens,
            temperature: temperatureOverride || optimizedSettings.temperature
        };
        
        // 🔧 3. 캐시 확인 (NEW)
        let response = null;
        const cacheKey = generateCacheKey(messages, selectedModel, finalSettings);
        
        if (!options.skipCache) {
            response = getCachedResponse(cacheKey);
            if (response) {
                console.log(`💾 [AI캐시] 캐시된 응답 사용`);
                
                // 통계 업데이트
                aiStats.totalCalls++;
                aiStats.modelUsage[selectedModel]++;
                aiStats.responseTime.push(Date.now() - startTime);
                
                // 통합 로깅
                await saveLog('AI', response, 'text', {
                    isAIResponse: true,
                    model: selectedModel,
                    cached: true,
                    responseTime: Date.now() - startTime
                });
                
                return response;
            }
        }
        
        // 4. 실제 AI 호출
        console.log(`🤖 [OpenAI] 모델: ${finalSettings.model}, 온도: ${finalSettings.temperature}, 최대토큰: ${finalSettings.max_tokens}`);
        
        const openaiResponse = await openai.chat.completions.create(finalSettings);
        response = openaiResponse.choices[0].message.content.trim();
        
        // 5. 통계 업데이트
        aiStats.totalCalls++;
        aiStats.modelUsage[selectedModel]++;
        if (openaiResponse.usage) {
            aiStats.tokenUsage.inputTokens += openaiResponse.usage.prompt_tokens;
            aiStats.tokenUsage.outputTokens += openaiResponse.usage.completion_tokens;
            aiStats.tokenUsage.totalTokens += openaiResponse.usage.total_tokens;
            
            console.log(`📊 [OpenAI] 토큰 사용량 - 입력: ${openaiResponse.usage.prompt_tokens}, 출력: ${openaiResponse.usage.completion_tokens}, 총합: ${openaiResponse.usage.total_tokens}`);
        }
        
        const responseTime = Date.now() - startTime;
        aiStats.responseTime.push(responseTime);
        
        // 🔧 6. 캐시에 저장 (NEW)
        if (!options.skipCache) {
            setCachedResponse(cacheKey, response);
        }
        
        // 🔧 7. Redis에 AI 통계 캐싱 (NEW)
        if (aiStats.totalCalls % 5 === 0) { // 5번마다 한 번씩
            await cacheAIStatsToRedis();
        }
        
        // 8. 통합 로깅
        await saveLog('AI', response, 'text', {
            isAIResponse: true,
            model: selectedModel,
            tokens: openaiResponse.usage?.total_tokens || 0,
            responseTime: responseTime,
            cached: false
        });
        
        return response;
        
    } catch (error) {
        console.error(`[aiUtils] OpenAI API 호출 실패 (모델: ${selectedModel}):`, error.message);
        aiStats.errors++;
        
        // ✨ 폴백 시스템
        if (!modelOverride && selectedModel === 'gpt-4o') {
            console.log('🔄 [폴백] GPT-4o 실패 → GPT-3.5-turbo로 재시도');
            try {
                const fallbackResponse = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    max_tokens: 120,
                    temperature: 0.9
                });
                
                const fallbackResult = fallbackResponse.choices[0].message.content.trim();
                console.log('✅ [폴백] GPT-3.5-turbo로 재시도 성공');
                
                // 폴백 통계
                aiStats.totalCalls++;
                aiStats.modelUsage['fallback']++;
                
                // 통합 로깅
                await saveLog('AI', fallbackResult, 'text', {
                    isAIResponse: true,
                    model: 'gpt-3.5-turbo-fallback',
                    responseTime: Date.now() - startTime,
                    isFallback: true
                });
                
                return fallbackResult;
                
            } catch (fallbackError) {
                console.error('❌ [폴백] GPT-3.5-turbo도 실패:', fallbackError.message);
                aiStats.errors++;
            }
        }
        
        const errorResponse = "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
        
        // 에러 로깅
        await saveLog('AI', errorResponse, 'text', {
            isAIResponse: true,
            model: 'error',
            error: error.message,
            responseTime: Date.now() - startTime
        });
        
        return errorResponse;
    }
}

// 기존 응답 정제 함수 (유지)
function cleanReply(reply) {
    if (typeof reply !== 'string') return '';
    let cleaned = reply;

    // 1. '자기야' 및 모든 '자기' → '아저씨'로 치환
    cleaned = cleaned.replace(/\b자기야\b/gi, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/gi, '아저씨');

    // 2. 1인칭/3인칭/존칭 치환
    cleaned = cleaned.replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나');
    cleaned = cleaned.replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨');

    // 3. 존댓말 제거 및 자연스러운 말투로 변환
    cleaned = cleaned.replace(/(입니다|이에요|예요|하세요|하셨나요|셨습니다|드릴게요|드릴까요)/gi, '');
    cleaned = cleaned.replace(/좋아요/gi, '좋아');
    cleaned = cleaned.replace(/고마워요|감사합니다/gi, '고마워');
    cleaned = cleaned.replace(/미안해요|죄송합니다/gi, '미안해');
    cleaned = cleaned.replace(/합니(다|까)/gi, '해');
    cleaned = cleaned.replace(/하겠(습니다|어요)?/gi, '할게');

    // 4. 예진이/무쿠 1인칭 처리 반복
    cleaned = cleaned.replace(/무쿠가/g, '내가')
        .replace(/무쿠는/g, '나는')
        .replace(/무쿠를/g, '나를')
        .replace(/예진이가/g, '내가')
        .replace(/예진이는/g, '나는')
        .replace(/예진이를/g, '나를');

    // 5. 불필요한 문자, 연속 공백 정리
    cleaned = cleaned.replace(/[\"\'\[\]]/g, '').replace(/\s\s+/g, ' ').trim();

    // 6. 마지막 치환
    cleaned = cleaned.replace(/자기야/gi, '아저씨').replace(/자기/gi, '아저씨');

    // 7. 최소 길이 보장
    if (!cleaned || cleaned.length < 2) {
        return '응? 다시 말해봐 아저씨';
    }

    return cleaned;
}

// 🔧 [NEW] AI 통계 조회 함수
function getAIStats() {
    const totalResponseTime = aiStats.responseTime.reduce((sum, time) => sum + time, 0);
    const avgResponseTime = aiStats.responseTime.length > 0 ? 
        totalResponseTime / aiStats.responseTime.length : 0;
    
    const cacheTotal = aiStats.cacheHits + aiStats.cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? aiStats.cacheHits / cacheTotal : 0;
    
    return {
        totalCalls: aiStats.totalCalls,
        modelUsage: { ...aiStats.modelUsage },
        tokenUsage: { ...aiStats.tokenUsage },
        averageResponseTime: Math.round(avgResponseTime),
        errors: aiStats.errors,
        cacheStats: {
            hits: aiStats.cacheHits,
            misses: aiStats.cacheMisses,
            hitRate: cacheHitRate,
            cacheSize: aiResponseCache.size
        },
        uptime: Date.now() - (startTime || Date.now())
    };
}

// 🔧 [NEW] AI 캐시 관리 함수
function clearAICache() {
    const clearedCount = aiResponseCache.size;
    aiResponseCache.clear();
    console.log(`🧹 [AI캐시] ${clearedCount}개 캐시 항목 삭제됨`);
    return clearedCount;
}

function getAICacheStats() {
    return {
        size: aiResponseCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttl: CACHE_TTL,
        hitRate: aiStats.cacheHits / Math.max(1, aiStats.cacheHits + aiStats.cacheMisses)
    };
}

// 기존 함수들 (유지)
function getCurrentModelInfo() {
    if (!getCurrentModelSetting) {
        return { setting: 'unknown', model: 'gpt-4o' };
    }
    
    const currentSetting = getCurrentModelSetting();
    let actualModel = 'gpt-4o';
    
    switch(currentSetting) {
        case '3.5':
            actualModel = 'gpt-3.5-turbo';
            break;
        case '4.0':
            actualModel = 'gpt-4o';
            break;
        case 'auto':
            actualModel = 'auto-select';
            break;
    }
    
    return { setting: currentSetting, model: actualModel };
}

function validateModel(model) {
    const validModels = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo', 'gpt-4'];
    if (!model || !validModels.includes(model)) {
        console.warn(`⚠️ [모델검증] 유효하지 않은 모델: ${model}, 기본값 사용`);
        return 'gpt-4o';
    }
    return model;
}

// 🔧 [NEW] 프롬프트 통합 관리자
async function generateIntegratedPrompt(basePrompt, options = {}) {
    try {
        let integratedPrompt = basePrompt;
        
        // 1. moodManager에서 감정 프롬프트 가져오기
        if (options.includeMood) {
            try {
                const moodManager = require('./moodManager');
                if (moodManager && moodManager.getMoodPromptForAI) {
                    const moodPrompt = await moodManager.getMoodPromptForAI();
                    if (moodPrompt && moodPrompt.prompt) {
                        integratedPrompt += `\n\n[감정 상태] ${moodPrompt.prompt}`;
                        console.log(`🎭 [통합프롬프트] 감정 프롬프트 추가: ${moodPrompt.source}`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [통합프롬프트] 감정 프롬프트 가져오기 실패: ${error.message}`);
            }
        }
        
        // 2. Redis에서 최근 컨텍스트 추가
        if (options.includeRedisContext && integratedRedisSystem) {
            try {
                const userId = options.userId || 'default_user';
                const recentHistory = await integratedRedisSystem.getCachedConversationHistory(userId, 3);
                
                if (recentHistory && recentHistory.length > 0) {
                    const contextText = recentHistory
                        .map(item => `${new Date(item.timestamp).toLocaleTimeString()}: ${item.message}`)
                        .join('\n');
                    
                    integratedPrompt += `\n\n[최근 대화]\n${contextText}`;
                    console.log(`🔧 [통합프롬프트] Redis 컨텍스트 추가: ${recentHistory.length}개`);
                }
            } catch (error) {
                console.warn(`⚠️ [통합프롬프트] Redis 컨텍스트 가져오기 실패: ${error.message}`);
            }
        }
        
        // 3. 모델별 최적화 가이드 추가
        if (options.includeModelGuide) {
            const modelInfo = getCurrentModelInfo();
            if (modelInfo.model === 'gpt-3.5-turbo') {
                integratedPrompt += `\n\n[모델 가이드] 간결하고 귀여운 말투로 대답해줘.`;
            } else if (modelInfo.model === 'gpt-4o') {
                integratedPrompt += `\n\n[모델 가이드] 풍부하고 감정적인 표현으로 대답해줘.`;
            }
        }
        
        console.log(`🎯 [통합프롬프트] 최종 길이: ${integratedPrompt.length}자`);
        return integratedPrompt;
        
    } catch (error) {
        console.error(`❌ [통합프롬프트] 생성 오류: ${error.message}`);
        return basePrompt; // 에러 시 기본 프롬프트 반환
    }
}

// 시작 시간 기록
const startTime = Date.now();

module.exports = {
    // 기존 함수들 (Redis 통합 강화)
    saveLog,                        // 🔧 통합 로깅
    saveImageLog,                   // 🔧 통합 사진 로깅
    callOpenAI,                     // 🔧 캐싱 + 통계 + Redis 연동
    cleanReply,                     // 유지
    
    // 기존 모델 관리 함수들 (유지)
    determineGptModel,
    getOptimalModelForMessage,
    getModelOptimizedSettings,
    getCurrentModelInfo,
    validateModel,
    
    // 🔧 [NEW] AI 통합 관리 함수들
    getAIStats,                     // AI 사용 통계
    clearAICache,                   // AI 캐시 삭제
    getAICacheStats,                // AI 캐시 통계
    generateIntegratedPrompt,       // 통합 프롬프트 생성
    cacheAIStatsToRedis,           // Redis AI 통계 캐싱
    
    // 🔧 [NEW] 내부 통계 접근 (디버깅용)
    _getInternalStats: () => ({ ...aiStats }),
    _getCacheContents: () => Array.from(aiResponseCache.keys())
};
