// ============================================================================
// conversationContext.js v2.0 - 중복 해결 완성 (무쿠 대화 맥락 유지)
// 🎯 고유 기능 특화: 사진메타데이터처리 + 대화패턴감지 + 주제연속성 + 톤변화추이
// 🔄 중복 제거: 핵심 시스템들에 위임하여 일관성 보장
// 🛡️ 무쿠 안전: 기존 핵심 기능 100% 보존 + 통합 레이어 추가
// 💾 Redis 통합: 모든 시스템과 데이터 동기화
// ============================================================================

const moment = require('moment-timezone');

// 🔄 핵심 시스템들 안전 연동
let coreIntegratedSystems = {
    autonomousSystem: null,     // muku-autonomousYejinSystem.js (Redis 중심)
    moodManager: null,          // moodManager.js v4.0 (감정 상태 통합)
    autoReply: null,            // autoReply.js v15.3 (ultimateConversationContext)
    aiUtils: null,              // aiUtils.js v2.5 (프롬프트 통합)
    contextAnalyzer: null       // contextAnalyzer.js v2.0 (메시지 분석)
};

/**
 * 🔄 핵심 시스템들 안전 로딩
 */
function loadCoreIntegratedSystems() {
    // muku-autonomousYejinSystem (Redis 통합 중심)
    if (!coreIntegratedSystems.autonomousSystem) {
        try {
            const autonomousModule = require('./muku-autonomousYejinSystem');
            coreIntegratedSystems.autonomousSystem = autonomousModule.getGlobalInstance();
            console.log('[ConversationContext] ✅ 자율 시스템 (Redis 중심) 연동 성공');
        } catch (error) {
            console.log('[ConversationContext] ⚠️ 자율 시스템 연동 실패:', error.message);
        }
    }
    
    // moodManager v4.0 (감정 상태 통합)
    if (!coreIntegratedSystems.moodManager) {
        try {
            coreIntegratedSystems.moodManager = require('./moodManager');
            console.log('[ConversationContext] ✅ 무드매니저 v4.0 연동 성공');
        } catch (error) {
            console.log('[ConversationContext] ⚠️ 무드매니저 연동 실패:', error.message);
        }
    }
    
    // autoReply v15.3 (ultimateConversationContext)
    if (!coreIntegratedSystems.autoReply) {
        try {
            coreIntegratedSystems.autoReply = require('./autoReply');
            console.log('[ConversationContext] ✅ autoReply v15.3 연동 성공');
        } catch (error) {
            console.log('[ConversationContext] ⚠️ autoReply 연동 실패:', error.message);
        }
    }
    
    // aiUtils v2.5 (통합 AI 관리)
    if (!coreIntegratedSystems.aiUtils) {
        try {
            coreIntegratedSystems.aiUtils = require('./aiUtils');
            console.log('[ConversationContext] ✅ aiUtils v2.5 연동 성공');
        } catch (error) {
            console.log('[ConversationContext] ⚠️ aiUtils 연동 실패:', error.message);
        }
    }
    
    // contextAnalyzer v2.0 (메시지 분석)
    if (!coreIntegratedSystems.contextAnalyzer) {
        try {
            const analyzerModule = require('./contextAnalyzer');
            coreIntegratedSystems.contextAnalyzer = analyzerModule.getGlobalContextAnalyzer();
            console.log('[ConversationContext] ✅ contextAnalyzer v2.0 연동 성공');
        } catch (error) {
            console.log('[ConversationContext] ⚠️ contextAnalyzer 연동 실패:', error.message);
        }
    }
    
    return coreIntegratedSystems;
}

// ==================== 🎯 고유 기능: 대화 맥락 상태 관리 ====================

let conversationState = {
    // 🎯 고유 기능: 사진 메타데이터 특별 처리 (가장 중요!)
    currentPhotoContext: null,    // { type: 'photo', details: meta, timestamp: ... }
    
    // 🎯 고유 기능: 대화 패턴 감지
    flowPattern: 'normal',        // 'normal', 'rapid', 'emotional', 'playful'
    conversationDepth: 0,         // 대화 깊이
    
    // 🎯 고유 기능: 주제 연속성 점수
    topicContinuity: 0,           // 주제 연속성 점수 (0-5)
    topicHistory: [],             // 최근 주제 변화 기록
    
    // 🎯 고유 기능: 톤 변화 추이 분석  
    toneTransition: 'stable',     // 톤 변화 추이
    
    // 🔄 통합: 다른 시스템들과 동기화할 정보
    lastContextUpdate: 0,         // 마지막 맥락 업데이트 시간
    integrationStatus: {
        moodManagerSync: false,
        autoReplySync: false,
        redisSync: false
    }
};

// 🎯 고유 기능: 대화 패턴 감지 설정 (보존)
const CONVERSATION_PATTERNS = {
    rapid: {
        description: '빠른 템포의 대화',
        minMessages: 3,
        maxInterval: 60000,  // 1분
        responseStyle: 'quick_reaction'
    },
    emotional: {
        description: '감정적인 대화',
        emotionalThreshold: 0.7,
        responseStyle: 'deep_empathy'
    },
    playful: {
        description: '장난스러운 대화',
        playfulKeywords: ['ㅋㅋ', 'ㅎㅎ', '자랑', '헐', '대박'],
        responseStyle: 'humor_engaging'
    },
    normal: {
        description: '일반적인 대화',
        responseStyle: 'natural'
    }
};

// ==================== 🎯 고유 핵심 기능: 사진 메타데이터 처리 ====================

/**
 * 🎯 사진 메타데이터 통합 처리 (핵심 고유 기능!)
 * @param {object} photoMeta 사진 메타데이터
 */
async function processPhotoMetadata(photoMeta) {
    try {
        console.log('[ConversationContext] 📸 사진 메타데이터 통합 처리 시작:', JSON.stringify(photoMeta));
        
        // 현재 사진 컨텍스트 설정 (고유 기능)
        conversationState.currentPhotoContext = {
            type: 'photo',
            details: photoMeta,
            timestamp: Date.now(),
            processed: true
        };
        
        // 주제 연속성 강하게 설정 (사진은 중요한 주제!)
        conversationState.topicContinuity = 5; // 최대값
        
        const systems = loadCoreIntegratedSystems();
        
        // 🔄 모든 시스템에 사진 정보 공유
        
        // 1. Redis에 사진 컨텍스트 캐싱
        if (systems.autonomousSystem && systems.autonomousSystem.redisCache) {
            await systems.autonomousSystem.redisCache.cachePhotoSelection(
                'conversation_context', 
                photoMeta.url || 'unknown_url', 
                `${photoMeta.concept}_${photoMeta.date}`
            );
            conversationState.integrationStatus.redisSync = true;
            console.log('[ConversationContext] 💾 Redis에 사진 컨텍스트 동기화 완료');
        }
        
        // 2. autoReply의 ultimateConversationContext에 사진 정보 추가
        if (systems.autoReply && systems.autoReply.safelyStoreMessageWithRedis) {
            await systems.autoReply.safelyStoreMessageWithRedis(
                '예진이',
                `[사진: ${photoMeta.concept}]`,
                { type: 'photo', meta: photoMeta }
            );
            conversationState.integrationStatus.autoReplySync = true;
            console.log('[ConversationContext] 📝 autoReply에 사진 정보 동기화 완료');
        }
        
        // 3. moodManager에 사진으로 인한 감정 변화 알림
        if (systems.moodManager && systems.moodManager.updateIntegratedMoodState) {
            await systems.moodManager.updateIntegratedMoodState('playful', {
                reason: '사진 전송으로 인한 기분 좋아짐',
                photoContext: photoMeta
            });
            conversationState.integrationStatus.moodManagerSync = true;
            console.log('[ConversationContext] 💖 moodManager에 사진 감정 변화 동기화 완료');
        }
        
        console.log('[ConversationContext] ✅ 사진 메타데이터 통합 처리 완료!');
        return true;
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 사진 메타데이터 처리 오류:', error.message);
        return false;
    }
}

/**
 * 🎯 현재 사진 컨텍스트 조회 (고유 기능)
 */
function getCurrentPhotoContext() {
    return conversationState.currentPhotoContext;
}

/**
 * 🎯 "저거" 문제 해결용 사진 정보 반환 (고유 기능)
 */
function getPhotoContextForReference() {
    const photoContext = conversationState.currentPhotoContext;
    if (!photoContext || !photoContext.details) {
        return null;
    }
    
    return {
        hasPhoto: true,
        concept: photoContext.details.concept || '알 수 없음',
        date: photoContext.details.date || '알 수 없음',
        description: `${photoContext.details.date} ${photoContext.details.concept} 사진`,
        referenceText: `이전에 내가 보낸 [${photoContext.details.date} ${photoContext.details.concept}] 사진`,
        timeSincePhoto: Date.now() - photoContext.timestamp
    };
}

// ==================== 🎯 고유 핵심 기능: 대화 패턴 감지 ====================

/**
 * 🎯 대화 패턴 감지 (고유 기능)
 * @param {array} recentMessages 최근 메시지들 (다른 시스템에서 가져옴)
 */
function detectConversationPatternAdvanced(recentMessages) {
    try {
        if (!recentMessages || recentMessages.length < 2) {
            conversationState.flowPattern = 'normal';
            return 'normal';
        }
        
        const recent = recentMessages.slice(-5); // 최근 5개만 분석
        
        // 1. 빠른 응답 패턴 (rapid) 감지
        const quickResponses = recent.filter((msg, index) => {
            if (index === 0) return false;
            return (msg.timestamp - recent[index - 1].timestamp) < CONVERSATION_PATTERNS.rapid.maxInterval;
        });
        
        if (quickResponses.length >= CONVERSATION_PATTERNS.rapid.minMessages - 1) {
            conversationState.flowPattern = 'rapid';
            console.log('[ConversationContext] ⚡ 빠른 대화 패턴 감지');
            return 'rapid';
        }
        
        // 2. 장난스러운 패턴 (playful) 감지
        const playfulMessages = recent.filter(msg => {
            const messageText = msg.message || msg.text || '';
            return CONVERSATION_PATTERNS.playful.playfulKeywords.some(keyword => 
                messageText.includes(keyword)
            );
        });
        
        if (playfulMessages.length >= 2) {
            conversationState.flowPattern = 'playful';
            console.log('[ConversationContext] 😄 장난스러운 대화 패턴 감지');
            return 'playful';
        }
        
        // 3. 감정적 패턴 (emotional) 감지 - moodManager 결과 활용
        const systems = loadCoreIntegratedSystems();
        if (systems.moodManager && systems.moodManager.getIntegratedMoodState) {
            try {
                const moodState = await systems.moodManager.getIntegratedMoodState();
                if (moodState && moodState.intensity >= CONVERSATION_PATTERNS.emotional.emotionalThreshold) {
                    conversationState.flowPattern = 'emotional';
                    console.log('[ConversationContext] 💗 감정적 대화 패턴 감지');
                    return 'emotional';
                }
            } catch (error) {
                // 에러는 무시하고 계속
            }
        }
        
        // 기본값
        conversationState.flowPattern = 'normal';
        return 'normal';
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 대화 패턴 감지 오류:', error.message);
        conversationState.flowPattern = 'normal';
        return 'normal';
    }
}

/**
 * 🎯 대화 깊이 계산 (고유 기능)
 */
function calculateConversationDepth(recentMessages) {
    if (!recentMessages) return 0;
    
    // 최근 10분 내 메시지 수를 깊이로 계산
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentCount = recentMessages.filter(msg => 
        (msg.timestamp || Date.now()) > tenMinutesAgo
    ).length;
    
    conversationState.conversationDepth = Math.min(recentCount, 10); // 최대 10
    return conversationState.conversationDepth;
}

// ==================== 🎯 고유 핵심 기능: 주제 연속성 분석 ====================

/**
 * 🎯 주제 연속성 점수 계산 (고유 기능)
 * @param {array} recentMessages 최근 메시지들
 */
async function calculateTopicContinuity(recentMessages) {
    try {
        if (!recentMessages || recentMessages.length < 2) {
            conversationState.topicContinuity = 0;
            return 0;
        }
        
        // 사진 컨텍스트가 있으면 연속성 높게
        if (conversationState.currentPhotoContext) {
            conversationState.topicContinuity = 5;
            return 5;
        }
        
        const systems = loadCoreIntegratedSystems();
        
        // contextAnalyzer에서 주제 분석 결과 가져오기 (중복 제거)
        if (systems.contextAnalyzer && systems.contextAnalyzer.analyzeIntegrated) {
            const recent = recentMessages.slice(-3);
            let topicCounts = {};
            
            for (const msg of recent) {
                try {
                    const analysis = await systems.contextAnalyzer.analyzeIntegrated(
                        msg.message || msg.text || '', 
                        msg.userId || 'unknown'
                    );
                    
                    if (analysis.categories && analysis.categories.length > 0) {
                        const mainCategory = analysis.categories[0].category;
                        topicCounts[mainCategory] = (topicCounts[mainCategory] || 0) + 1;
                    }
                } catch (error) {
                    // 개별 분석 실패는 무시
                }
            }
            
            const maxCount = Math.max(...Object.values(topicCounts), 0);
            conversationState.topicContinuity = Math.min(maxCount, 5);
            
            console.log(`[ConversationContext] 📊 주제 연속성 계산: ${conversationState.topicContinuity}점`);
            return conversationState.topicContinuity;
        }
        
        // contextAnalyzer 없으면 기본 계산
        conversationState.topicContinuity = Math.min(recentMessages.length, 3);
        return conversationState.topicContinuity;
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 주제 연속성 계산 오류:', error.message);
        conversationState.topicContinuity = 0;
        return 0;
    }
}

// ==================== 🎯 고유 핵심 기능: 톤 변화 추이 분석 ====================

/**
 * 🎯 톤 변화 추이 분석 (고유 기능)
 * @param {array} recentMessages 최근 메시지들
 */
async function analyzeToneTransition(recentMessages) {
    try {
        if (!recentMessages || recentMessages.length < 2) {
            conversationState.toneTransition = 'stable';
            return 'stable';
        }
        
        const systems = loadCoreIntegratedSystems();
        
        // moodManager에서 감정 변화 추이 가져오기 (중복 제거)
        if (systems.moodManager && systems.moodManager.getIntegratedMoodState) {
            const currentMood = await systems.moodManager.getIntegratedMoodState();
            
            if (currentMood && currentMood.previousEmotion && currentMood.currentEmotion) {
                if (currentMood.previousEmotion !== currentMood.currentEmotion) {
                    conversationState.toneTransition = `${currentMood.previousEmotion} → ${currentMood.currentEmotion}`;
                    console.log(`[ConversationContext] 🎭 톤 변화 감지: ${conversationState.toneTransition}`);
                    return conversationState.toneTransition;
                }
            }
        }
        
        conversationState.toneTransition = 'stable';
        return 'stable';
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 톤 변화 분석 오류:', error.message);
        conversationState.toneTransition = 'stable';
        return 'stable';
    }
}

// ==================== 🔄 통합 레이어: 메시지 추가 및 맥락 업데이트 ====================

/**
 * 🔄 통합된 메시지 추가 (중복 해결)
 * @param {string} speaker 화자
 * @param {string} message 메시지 내용  
 * @param {object} meta 메타데이터 (사진 정보 등)
 */
async function addMessageIntegrated(speaker, message, meta = null) {
    try {
        console.log(`[ConversationContext] 📝 통합 메시지 추가: ${speaker} - "${message.substring(0, 50)}..."`);
        
        const systems = loadCoreIntegratedSystems();
        
        // 🎯 사진 메타데이터 특별 처리 (고유 기능)
        if (meta && meta.type === 'photo') {
            await processPhotoMetadata(meta);
        }
        
        // 🔄 autoReply의 ultimateConversationContext에 메시지 저장 (중복 제거)
        if (systems.autoReply && systems.autoReply.safelyStoreMessageWithRedis) {
            await systems.autoReply.safelyStoreMessageWithRedis(speaker, message, meta);
            conversationState.integrationStatus.autoReplySync = true;
        }
        
        // 🔄 moodManager에 감정 분석 요청 (중복 제거)
        let detectedEmotion = 'neutral';
        if (systems.moodManager && systems.moodManager.updateIntegratedMoodState) {
            try {
                const moodUpdate = await systems.moodManager.updateIntegratedMoodState(null, { 
                    message: message,
                    speaker: speaker,
                    meta: meta 
                });
                detectedEmotion = moodUpdate?.currentEmotion || 'neutral';
                conversationState.integrationStatus.moodManagerSync = true;
            } catch (error) {
                console.log('[ConversationContext] ⚠️ moodManager 업데이트 실패:', error.message);
            }
        }
        
        // 🔄 맥락 업데이트 (고유 기능들)
        await updateConversationContextIntegrated();
        
        conversationState.lastContextUpdate = Date.now();
        
        console.log('[ConversationContext] ✅ 통합 메시지 추가 완료');
        return true;
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 통합 메시지 추가 오류:', error.message);
        return false;
    }
}

/**
 * 🔄 통합된 대화 맥락 업데이트
 */
async function updateConversationContextIntegrated() {
    try {
        const systems = loadCoreIntegratedSystems();
        
        // autoReply에서 최근 메시지들 가져오기
        let recentMessages = [];
        if (systems.autoReply && systems.autoReply.getRecentMessagesForContext) {
            recentMessages = await systems.autoReply.getRecentMessagesForContext(10);
        }
        
        // 🎯 고유 기능들 업데이트
        await Promise.all([
            detectConversationPatternAdvanced(recentMessages),
            calculateConversationDepth(recentMessages),  
            calculateTopicContinuity(recentMessages),
            analyzeToneTransition(recentMessages)
        ]);
        
        console.log('[ConversationContext] 🔄 통합 맥락 업데이트 완료');
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 통합 맥락 업데이트 오류:', error.message);
    }
}

// ==================== 🔄 통합 레이어: 프롬프트 생성 ====================

/**
 * 🔄 통합된 맥락 프롬프트 생성 (중복 제거)
 * @param {string} basePrompt 기본 프롬프트
 */
async function getIntegratedContextualPrompt(basePrompt) {
    try {
        const systems = loadCoreIntegratedSystems();
        
        // aiUtils v2.5의 통합 프롬프트 생성 사용 (중복 제거)
        if (systems.aiUtils && systems.aiUtils.generateIntegratedPrompt) {
            const integratedPrompt = await systems.aiUtils.generateIntegratedPrompt(basePrompt, {
                includeConversationContext: true,
                conversationContextData: {
                    photoContext: getPhotoContextForReference(),
                    flowPattern: conversationState.flowPattern,
                    topicContinuity: conversationState.topicContinuity,
                    toneTransition: conversationState.toneTransition,
                    conversationDepth: conversationState.conversationDepth
                }
            });
            
            console.log('[ConversationContext] 🔄 aiUtils 통합 프롬프트 생성 완료');
            return integratedPrompt;
        }
        
        // aiUtils 없으면 기본 프롬프트에 핵심 맥락만 추가
        let contextPrompt = basePrompt;
        
        // 🎯 사진 컨텍스트 추가 (가장 중요!)
        const photoContext = getPhotoContextForReference();
        if (photoContext && photoContext.hasPhoto) {
            contextPrompt += `\n\n💬 **매우 중요**: 아저씨가 현재 **${photoContext.referenceText}**에 대해 이야기하고 있으니, 이 사진과 직접적으로 연결하여 자연스럽게 대화해줘. '저거', '그거' 등의 지시 대명사는 이 사진을 의미해.`;
        }
        
        // 대화 패턴 정보 추가
        if (conversationState.flowPattern !== 'normal') {
            const patternInfo = CONVERSATION_PATTERNS[conversationState.flowPattern];
            contextPrompt += `\n🎭 대화 패턴: ${patternInfo.description} (${patternInfo.responseStyle} 스타일로 응답)`;
        }
        
        return contextPrompt;
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 통합 프롬프트 생성 오류:', error.message);
        return basePrompt; // 오류 시 기본 프롬프트 반환
    }
}

// ==================== 📊 상태 조회 및 디버그 ====================

/**
 * 📊 통합 대화 맥락 상태 조회
 */
async function getIntegratedConversationContext() {
    try {
        const systems = loadCoreIntegratedSystems();
        
        // 현재 감정 상태 (moodManager에서)
        let currentMoodState = null;
        if (systems.moodManager && systems.moodManager.getIntegratedMoodState) {
            currentMoodState = await systems.moodManager.getIntegratedMoodState();
        }
        
        // 최근 메시지들 (autoReply에서)
        let recentMessages = [];
        if (systems.autoReply && systems.autoReply.getRecentMessagesForContext) {
            recentMessages = await systems.autoReply.getRecentMessagesForContext(5);
        }
        
        return {
            // 🎯 고유 기능들
            photoContext: getPhotoContextForReference(),
            flowPattern: conversationState.flowPattern,
            conversationDepth: conversationState.conversationDepth,
            topicContinuity: conversationState.topicContinuity,
            toneTransition: conversationState.toneTransition,
            
            // 🔄 통합된 정보들
            currentMoodState: currentMoodState,
            recentMessagesCount: recentMessages.length,
            
            // 시스템 상태
            integrationStatus: conversationState.integrationStatus,
            lastUpdate: moment(conversationState.lastContextUpdate).format('HH:mm:ss'),
            
            // 요약
            summary: {
                hasPhotoContext: !!conversationState.currentPhotoContext,
                isEmotionalConversation: conversationState.flowPattern === 'emotional',
                isHighContinuity: conversationState.topicContinuity >= 3,
                isDeepConversation: conversationState.conversationDepth >= 5,
                allSystemsSync: Object.values(conversationState.integrationStatus).every(status => status)
            }
        };
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 통합 상태 조회 오류:', error.message);
        return null;
    }
}

/**
 * 📊 대화 맥락 요약 (디버그용)
 */
async function getContextSummary() {
    try {
        const context = await getIntegratedConversationContext();
        if (!context) return '상태 조회 실패';
        
        let photoInfo = '없음';
        if (context.photoContext && context.photoContext.hasPhoto) {
            photoInfo = `${context.photoContext.concept} (${context.photoContext.date})`;
        }
        
        return `
🎭 통합 대화 맥락 요약 v2.0:
├─ 📸 사진 컨텍스트: ${photoInfo}
├─ 🎯 대화 패턴: ${context.flowPattern}
├─ 💗 현재 감정: ${context.currentMoodState?.currentEmotionKorean || '알 수 없음'}
├─ 📊 주제 연속성: ${context.topicContinuity}점
├─ 🎭 톤 변화: ${context.toneTransition}
├─ 📏 대화 깊이: ${context.conversationDepth}
├─ 🔄 시스템 동기화: ${context.summary.allSystemsSync ? '완료' : '부분완료'}
└─ ⏰ 마지막 업데이트: ${context.lastUpdate}
        `.trim();
        
    } catch (error) {
        console.error('[ConversationContext] ❌ 요약 생성 오류:', error.message);
        return '요약 생성 실패';
    }
}

/**
 * 🔄 대화 맥락 리셋
 */
function resetConversationContext() {
    console.log('[ConversationContext] 🔄 대화 맥락 리셋');
    
    conversationState.currentPhotoContext = null;
    conversationState.flowPattern = 'normal';
    conversationState.conversationDepth = 0;
    conversationState.topicContinuity = 0;
    conversationState.toneTransition = 'stable';
    conversationState.topicHistory = [];
    conversationState.lastContextUpdate = Date.now();
    conversationState.integrationStatus = {
        moodManagerSync: false,
        autoReplySync: false,
        redisSync: false
    };
}

// ==================== 📤 모듈 내보내기 ====================

console.log('[ConversationContext] v2.0 중복 해결 완성 - 무쿠 대화 맥락 유지 시스템 로드 완료');

module.exports = {
    // 🔄 통합 핵심 함수들 (중복 해결)
    addMessageIntegrated,                    // 메시지 추가 (통합)
    getIntegratedContextualPrompt,           // 프롬프트 생성 (통합)  
    getIntegratedConversationContext,        // 맥락 조회 (통합)
    updateConversationContextIntegrated,     // 맥락 업데이트 (통합)
    
    // 🎯 고유 핵심 기능들 (보존)
    processPhotoMetadata,                    // 사진 메타데이터 처리
    getCurrentPhotoContext,                  // 현재 사진 컨텍스트
    getPhotoContextForReference,             // "저거" 문제 해결용
    detectConversationPatternAdvanced,       // 대화 패턴 감지
    calculateTopicContinuity,                // 주제 연속성 분석
    analyzeToneTransition,                   // 톤 변화 분석
    
    // 📊 상태 조회
    getContextSummary,
    resetConversationContext,
    
    // 🛡️ 기존 인터페이스 호환성 (폴백)
    addMessage: addMessageIntegrated,        // 기존 함수명 호환
    getContextualPrompt: getIntegratedContextualPrompt, // 기존 함수명 호환
    getConversationContext: getIntegratedConversationContext, // 기존 함수명 호환
    
    // 상태 확인용 (읽기 전용)
    get currentPhotoContext() { return conversationState.currentPhotoContext; },
    get flowPattern() { return conversationState.flowPattern; },
    get conversationDepth() { return conversationState.conversationDepth; },
    get topicContinuity() { return conversationState.topicContinuity; },
    get toneTransition() { return conversationState.toneTransition; },
    get integrationStatus() { return { ...conversationState.integrationStatus }; },
    
    // 설정 접근
    get conversationPatterns() { return { ...CONVERSATION_PATTERNS }; },
    
    // 디버그 정보
    get debugInfo() {
        return {
            version: 'v2.0-integrated',
            uniqueFeatures: [
                '사진 메타데이터 특별 처리',
                '대화 패턴 감지',
                '주제 연속성 분석',
                '톤 변화 추이 분석'
            ],
            integratedSystems: Object.keys(coreIntegratedSystems),
            currentState: {
                photoContext: !!conversationState.currentPhotoContext,
                flowPattern: conversationState.flowPattern,
                topicContinuity: conversationState.topicContinuity,
                integrationStatus: conversationState.integrationStatus
            }
        };
    }
};
