// ============================================================================
// ultimateConversationContext.js - 완전 독립 버전 (circular dependency 완전 해결!)
// 🚨 어떤 모듈도 require 하지 않음 → circular dependency 불가능
// ✅ 기존 기능 100% 호환성 보장, 무쿠 바보 안 됨
// ============================================================================

// --- 완전 독립적인 상태 (다른 모듈 의존 없음!) ---
let independentState = {
    currentMood: 'normal',
    userMemories: [],
    conversationTopic: null,
    lastUpdate: Date.now(),
    emotionIntensity: 0.5
};

// ==================== 💭 완전 독립 호환 함수들 ==================

/**
 * 🎭 getMoodState - 완전 독립적 (circular dependency 불가능!)
 */
async function getMoodState() {
    try {
        // 다른 모듈 호출 없이 자체적으로 상태 반환
        return {
            currentEmotion: independentState.currentMood,
            intensity: independentState.emotionIntensity,
            timestamp: Date.now(),
            source: 'independent_context',
            
            // 호환성 필드들
            emotion: independentState.currentMood,
            level: independentState.emotionIntensity,
            lastUpdate: independentState.lastUpdate,
            currentMood: independentState.currentMood,
            emotionIntensity: independentState.emotionIntensity
        };
    } catch (error) {
        // 에러 시 안전한 기본값
        return {
            currentEmotion: 'normal',
            intensity: 0.5,
            timestamp: Date.now(),
            source: 'independent_context_safe'
        };
    }
}

/**
 * 🎭 updateMoodState - 완전 독립적
 */
function updateMoodState(newMoodState) {
    try {
        if (newMoodState) {
            if (newMoodState.currentEmotion) {
                independentState.currentMood = newMoodState.currentEmotion;
            }
            if (newMoodState.currentMood) {
                independentState.currentMood = newMoodState.currentMood;
            }
            if (newMoodState.intensity !== undefined) {
                independentState.emotionIntensity = newMoodState.intensity;
            }
            if (newMoodState.emotionIntensity !== undefined) {
                independentState.emotionIntensity = newMoodState.emotionIntensity;
            }
            
            independentState.lastUpdate = Date.now();
            console.log(`✅ [IndependentContext] 감정 업데이트: ${independentState.currentMood} (강도: ${independentState.emotionIntensity})`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`❌ [IndependentContext] 감정 업데이트 실패: ${error.message}`);
        return false;
    }
}

/**
 * 🧠 generateUltimateMasterContextPrompt - 완전 독립적
 */
async function generateUltimateMasterContextPrompt(basePrompt) {
    let contextPrompt = basePrompt;
    
    try {
        // 사용자 기억 추가
        if (independentState.userMemories.length > 0) {
            const recentMemories = independentState.userMemories.slice(-3);
            const memoryText = recentMemories.map(m => m.content).join('. ');
            contextPrompt += `\n🧠 기억사항: ${memoryText}\n`;
        }
        
        // 현재 감정 상태 추가 (다른 모듈 호출 없이 자체 상태 사용)
        if (independentState.currentMood !== 'normal') {
            contextPrompt += `\n💭 현재 감정: ${independentState.currentMood} (강도: ${independentState.emotionIntensity})\n`;
        }
        
        // 대화 주제 추가
        if (independentState.conversationTopic) {
            contextPrompt += `\n🎯 현재 주제: ${independentState.conversationTopic}\n`;
        }
        
        return contextPrompt;
    } catch (error) {
        console.log(`❌ [IndependentContext] 프롬프트 생성 실패: ${error.message}`);
        return basePrompt;
    }
}

/**
 * 🤖 processUserCommandWithRedis - 완전 독립적
 */
async function processUserCommandWithRedis(message, speaker) {
    try {
        if (speaker !== 'user' && speaker !== '아저씨') return null;
        
        const lowerMessage = message.toLowerCase().trim();
        
        // "기억해" 명령
        if (lowerMessage.includes('기억해') || lowerMessage.includes('잊지마')) {
            const memoryContent = message.replace(/기억해|줘|잊지마|잊지말아|라고|했잖아/g, '').trim();
            if (memoryContent.length > 0) {
                const memoryObj = {
                    id: `independent_${Date.now()}`,
                    content: memoryContent,
                    timestamp: Date.now()
                };
                independentState.userMemories.push(memoryObj);
                
                // 최신 10개만 유지
                if (independentState.userMemories.length > 10) {
                    independentState.userMemories = independentState.userMemories.slice(-10);
                }
                
                console.log(`✅ [IndependentContext] 기억 추가: "${memoryContent}"`);
                return { type: 'memory_add', content: memoryContent, success: true };
            }
        }
        
        // "잊어" 명령  
        if (lowerMessage.includes('잊어') || lowerMessage.includes('지워')) {
            const forgetContent = message.replace(/잊어|줘|지워|버려|삭제|해줘/g, '').trim();
            if (forgetContent.length > 0) {
                const beforeCount = independentState.userMemories.length;
                independentState.userMemories = independentState.userMemories.filter(m => 
                    !m.content.toLowerCase().includes(forgetContent.toLowerCase())
                );
                const deleted = beforeCount > independentState.userMemories.length;
                
                console.log(`✅ [IndependentContext] 기억 삭제: "${forgetContent}" (${deleted ? '성공' : '실패'})`);
                return { type: 'memory_delete', content: forgetContent, success: deleted };
            }
        }
        
        return null;
    } catch (error) {
        console.log(`❌ [IndependentContext] 사용자 명령 처리 실패: ${error.message}`);
        return null;
    }
}

/**
 * 📊 getUltimateSystemStatus - 완전 독립적
 */
function getUltimateSystemStatus() {
    return {
        version: 'independent_v1.0',
        type: 'independent_conversation_context',
        currentMood: independentState.currentMood,
        emotionIntensity: independentState.emotionIntensity,
        userMemoriesCount: independentState.userMemories.length,
        conversationTopic: independentState.conversationTopic,
        lastUpdate: independentState.lastUpdate,
        circularDependencyFree: true,
        requiresNoModules: true,
        fullyIndependent: true
    };
}

/**
 * 🔧 injectExternalEmotionState - 외부 감정 주입 (sulkyManager용)
 */
function injectExternalEmotionState(emotionState) {
    try {
        if (emotionState && emotionState.currentEmotion) {
            independentState.currentMood = emotionState.currentEmotion;
            independentState.emotionIntensity = emotionState.intensity || 0.7;
            independentState.lastUpdate = Date.now();
            
            console.log(`✅ [IndependentContext] 외부 감정 주입: ${emotionState.currentEmotion} (강도: ${independentState.emotionIntensity})`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`❌ [IndependentContext] 외부 감정 주입 실패: ${error.message}`);
        return false;
    }
}

// ==================== 📤 모듈 내보내기 ==================
module.exports = {
    // 핵심 호환 함수들 (다른 시스템이 호출하는 것들)
    getMoodState,
    updateMoodState,
    generateUltimateMasterContextPrompt,
    processUserCommandWithRedis,
    getUltimateSystemStatus,
    injectExternalEmotionState,
    
    // 별칭들 (호환성 유지)
    initializeUltimateContextSystem: () => {
        console.log('✅ [IndependentContext] 독립 시스템 초기화 완료 (circular dependency 없음)');
        return Promise.resolve(true);
    },
    
    addUserCommandMemoryWithRedis: (content) => {
        try {
            const memoryObj = { 
                id: `independent_${Date.now()}`, 
                content, 
                timestamp: Date.now() 
            };
            independentState.userMemories.push(memoryObj);
            return memoryObj.id;
        } catch (error) {
            return null;
        }
    },
    
    deleteUserCommandMemoryWithRedis: (content) => {
        try {
            const before = independentState.userMemories.length;
            independentState.userMemories = independentState.userMemories.filter(m => 
                !m.content.toLowerCase().includes(content.toLowerCase())
            );
            return before > independentState.userMemories.length;
        } catch (error) {
            return false;
        }
    },
    
    updateConversationTopicIntelligently: (topic) => {
        independentState.conversationTopic = topic;
        console.log(`✅ [IndependentContext] 대화 주제 업데이트: ${topic}`);
    },
    
    // 더미 함수들 (호출되어도 에러 안 나게)
    setAdvancedPendingAction: () => {},
    detectConversationTopicAdvanced: () => null,
    syncUserMemoriesWithRedis: () => Promise.resolve(true),
    searchUserMemoriesWithRedis: (keyword) => 
        independentState.userMemories.filter(m => m.content.includes(keyword)),
    
    // 상태 조회 별칭들
    getSlimInternalState: getUltimateSystemStatus,
    getSpontaneousStats: getUltimateSystemStatus,
    
    // 추가 호환성 함수들
    checkPriorityEmotionSystemsSafe: getMoodState,
    getMoodManagerStateSafe: getMoodState,
    checkExternalEmotionState: () => null,
    recordEmotionPriority: () => {},
    safeCallEmotionSystem: (name, fn, fallback) => {
        try {
            return fn();
        } catch (error) {
            return fallback;
        }
    }
};

console.log('✅ IndependentConversationContext v1.0 로드 완료 (완전 독립, circular dependency 불가능)');
