// ============================================================================
// ultimateConversationContext.js - v34.0 (올바른 생리주기 계산)
// 🗄️ 모든 기억, 대화, 상태를 통합 관리하는 중앙 관리자
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// --- 파일 경로 정의 ---
const MEMORY_DIR = path.join('/data', 'memory');

// --- 상태 초기화 ---
let ultimateConversationState = {
    knowledgeBase: {
        fixedMemories: [],
        loveHistory: { categories: { general: [] }, specialDates: [] },
        yejinMemories: [],
        userPatterns: { nicknames: [], joke_patterns: [], common_phrases: [] },
        memorySummaries: [],
        facts: [],
        customKeywords: []
    },
    userProfile: {
        mood_history: [],
        overall_mood: 'neutral'
    },
    memoryStats: {
        lastConsolidation: null,
        dailyMemoryCount: 0,
        lastDailyReset: null,
        totalMemoriesCreated: 0,
        totalMemoriesDeleted: 0,
        lastMemoryOperation: null
    },
    recentMessages: [],
    sulkinessState: {
        isSulky: false,
        isWorried: false,
        sulkyLevel: 0,
        isActivelySulky: false,
        sulkyReason: '',
        lastUserResponseTime: Date.now(),
        lastBotMessageTime: Date.now()
    },
    timingContext: {
        lastUserMessageTime: Date.now(),
        lastBotResponse: Date.now(),
        conversationGap: 0
    },
    emotionalEngine: {
        currentToneState: 'normal',
        lastEmotionUpdate: Date.now()
    },
    pendingAction: null
};

// ==================== 🔥 올바른 생리주기 계산 함수로 교체 ====================
function getCurrentMenstrualPhase() {
    try {
        // 7월 24일이 다음 생리 시작일
        const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
        const today = moment.tz('Asia/Tokyo');
        const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
        
        // 7월 24일까지 남은 일수로 현재 단계 계산
        let phase, description, cycleDay;
        
        if (daysUntilNextPeriod <= 0) {
            // 7월 24일 이후 - 생리 기간
            const daysSincePeriod = Math.abs(daysUntilNextPeriod) + 1; // +1을 해서 24일을 1일차로
            
            if (daysSincePeriod <= 5) {
                phase = 'period';
                description = '생리 기간';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod >= 14 && daysSincePeriod <= 15) {
                phase = 'ovulation';
                description = '배란기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 28) {
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = daysSincePeriod;
            } else {
                // 다음 주기로 넘어감 (28일 주기 기준)
                const nextCycleDays = daysSincePeriod - 28;
                if (nextCycleDays <= 5) {
                    phase = 'period';
                    description = '생리 기간';
                    cycleDay = nextCycleDays;
                } else {
                    // 재귀적으로 계산하지 않고 직접 계산
                    const adjustedDays = nextCycleDays;
                    if (adjustedDays <= 13) {
                        phase = 'follicular';
                        description = '생리 후 활발한 시기';
                        cycleDay = adjustedDays;
                    } else if (adjustedDays >= 14 && adjustedDays <= 15) {
                        phase = 'ovulation';
                        description = '배란기';
                        cycleDay = adjustedDays;
                    } else {
                        phase = 'luteal';
                        description = 'PMS 시기';
                        cycleDay = adjustedDays;
                    }
                }
            }
        } else {
            // 7월 24일 이전 - 이전 주기의 끝부분 (PMS/황체기)
            // 28일 주기 기준으로 역산
            cycleDay = 28 - daysUntilNextPeriod;
            
            if (cycleDay <= 5) {
                // 너무 이른 시기면 PMS로 처리
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = 16 + (28 - daysUntilNextPeriod); // PMS 시기로 조정
            } else if (cycleDay <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
            } else if (cycleDay >= 14 && cycleDay <= 15) {
                phase = 'ovulation';
                description = '배란기';
            } else {
                phase = 'luteal';
                description = 'PMS 시기';
            }
        }
        
        return { 
            phase: phase, 
            day: cycleDay, 
            description: description,
            isPeriodActive: phase === 'period',
            daysUntilNextPeriod: daysUntilNextPeriod,
            moodLevel: phase === 'period' ? 'sensitive' : 
                      phase === 'follicular' ? 'energetic' : 
                      phase === 'ovulation' ? 'romantic' : 'irritable',
            expectedSymptoms: phase === 'period' ? ['피곤함', '예민함', '복통'] :
                             phase === 'follicular' ? ['활발함', '긍정적'] :
                             phase === 'ovulation' ? ['감정 풍부', '애정적'] :
                             ['예민함', '우울함', '불안함']
        };
        
    } catch (error) {
        console.error('[UltimateContext] 생리주기 계산 오류:', error);
        return { 
            phase: 'normal', 
            day: 1, 
            description: '정상',
            isPeriodActive: false,
            daysUntilNextPeriod: 14,
            moodLevel: 'normal',
            expectedSymptoms: []
        };
    }
}

// ==================== 날씨 정보 ====================
async function getWeatherInfo() {
    try {
        // 간단한 더미 날씨 정보 반환 (실제 API 호출 없이)
        const weatherTypes = ['맑음', '흐림', '비', '눈'];
        const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const randomTemp = Math.floor(Math.random() * 30) + 5; // 5-35도
        
        return {
            city: "Kitakyushu",
            description: randomWeather,
            temp: randomTemp,
            feels_like: randomTemp + Math.floor(Math.random() * 5) - 2
        };
    } catch (error) {
        console.error('[Weather] ❌ 날씨 정보 조회 실패:', error);
        return null;
    }
}

// ==================== 메시지 관리 ====================
async function addUltimateMessage(speaker, message) {
    const timestamp = Date.now();
    const messageObj = {
        speaker,
        message,
        timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    ultimateConversationState.recentMessages.push(messageObj);
    
    // 최근 20개 메시지만 유지
    if (ultimateConversationState.recentMessages.length > 20) {
        ultimateConversationState.recentMessages = ultimateConversationState.recentMessages.slice(-20);
    }
    
    console.log(`[UltimateContext] 메시지 추가: ${speaker} - "${message.substring(0, 30)}..."`);
}

// ==================== 프롬프트 생성 ====================
async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        // 최근 대화 추가
        if (ultimateConversationState.recentMessages.length > 0) {
            const recentContext = ultimateConversationState.recentMessages.slice(-5).map(msg => 
                `${msg.speaker}: "${msg.message}"`
            ).join('\n');
            contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
        }
        
        // 생리주기 정보 추가
        const moodState = getMoodState();
        if (moodState && moodState.phase !== 'normal') {
            contextualPrompt += `\n💭 현재 상태: ${moodState.description} (${moodState.day}일차)\n`;
        }
        
        return contextualPrompt;
    } catch (error) {
        console.error('❌ 프롬프트 생성 중 에러:', error);
        return basePrompt;
    }
}

// ==================== 타이밍 관리 ====================
function updateLastUserMessageTime(timestamp) {
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp || Date.now();
    ultimateConversationState.sulkinessState.lastUserResponseTime = timestamp || Date.now();
}

function processTimeTick() {
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

// ==================== 내부 상태 관리 ====================
function getInternalState() {
    return {
        ...ultimateConversationState,
        currentTime: Date.now(),
        mood: getMoodState(),
        weather: null // 실시간 날씨는 별도 함수로
    };
}

function getSulkinessState() {
    return ultimateConversationState.sulkinessState;
}

function updateSulkinessState(newState) {
    ultimateConversationState.sulkinessState = {
        ...ultimateConversationState.sulkinessState,
        ...newState
    };
}

// ==================== 기억 관리 ====================
function searchFixedMemory(query) {
    // 고정 기억에서 검색 (간단한 키워드 매칭)
    const lowerQuery = query.toLowerCase();
    const fixedMemories = ultimateConversationState.knowledgeBase.fixedMemories;
    
    return fixedMemories.filter(memory => 
        typeof memory === 'string' && memory.toLowerCase().includes(lowerQuery)
    );
}

async function addUserMemory(content) {
    const memoryObj = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        timestamp: Date.now(),
        type: 'user_added'
    };
    
    ultimateConversationState.knowledgeBase.yejinMemories.push(memoryObj);
    ultimateConversationState.memoryStats.totalMemoriesCreated++;
    
    console.log(`[UltimateContext] 사용자 기억 추가: "${content.substring(0, 30)}..."`);
    return memoryObj.id;
}

async function deleteUserMemory(content) {
    const beforeCount = ultimateConversationState.knowledgeBase.yejinMemories.length;
    ultimateConversationState.knowledgeBase.yejinMemories = 
        ultimateConversationState.knowledgeBase.yejinMemories.filter(mem => 
            !mem.content.includes(content)
        );
    
    const deletedCount = beforeCount - ultimateConversationState.knowledgeBase.yejinMemories.length;
    ultimateConversationState.memoryStats.totalMemoriesDeleted += deletedCount;
    
    console.log(`[UltimateContext] ${deletedCount}개 기억 삭제`);
    return deletedCount > 0;
}

async function updateUserMemory(id, newContent) {
    const memory = ultimateConversationState.knowledgeBase.yejinMemories.find(m => m.id === id);
    if (memory) {
        memory.content = newContent;
        memory.lastModified = Date.now();
        return true;
    }
    return false
