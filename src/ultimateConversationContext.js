// ============================================================================
// ultimateConversationContext.js - v35.0 (대화 분석 엔진 통합)
// 🗄️ 동적 기억 + 대화 컨텍스트 + 🔍 고급 대화 분석 + 🌤️ 날씨 감지
// ✅ muku-conversationAnalyzer.js 기능 완전 통합
// 🎯 모든 맥락 관리를 하나의 파일에서 처리
// ✨ GPT 모델 버전 전환 + 날씨 우선 처리 + 패턴 학습
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [UltimateContext] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [UltimateContext] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// --- 파일 경로 정의 ---
const MEMORY_DIR = path.join('/data', 'memory');

// --- 외부 모듈 지연 로딩 (순환 참조 방지) ---
let emotionalContextManager = null;
let memoryManager = null;
let weatherManager = null;

function getEmotionalManager() {
    if (!emotionalContextManager) {
        try {
            emotionalContextManager = require('./emotionalContextManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] emotionalContextManager 로드 실패:', error.message);
        }
    }
    return emotionalContextManager;
}

function getMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] memoryManager 로드 실패:', error.message);
        }
    }
    return memoryManager;
}

function getWeatherManager() {
    if (!weatherManager) {
        try {
            weatherManager = require('./weatherManager');
        } catch (error) {
            console.log('⚠️ [UltimateContext] weatherManager 로드 실패:', error.message);
        }
    }
    return weatherManager;
}

// ================== 🎨 색상 및 로깅 시스템 ==================
const colors = {
    context: '\x1b[96m',      // 하늘색 (맥락)
    analyze: '\x1b[94m',      // 파란색 (분석)
    weather: '\x1b[93m',      // 노란색 (날씨)
    memory: '\x1b[95m',       // 보라색 (기억)
    success: '\x1b[92m',      // 초록색 (성공)
    warning: '\x1b[91m',      // 빨간색 (경고)
    reset: '\x1b[0m'          // 리셋
};

// ================== 🧠 통합 상태 관리 ==================
let ultimateConversationState = {
    // 🧠 동적 기억 관리 (기존)
    dynamicMemories: {
        userMemories: [],           
        conversationMemories: [],   
        temporaryMemories: []       
    },
    
    // 💬 대화 컨텍스트 관리 (기존)
    conversationContext: {
        recentMessages: [],         
        currentTopic: null,         
        conversationFlow: 'normal', 
        lastTopicChange: Date.now()
    },
    
    // ⏰ 타이밍 관리 (기존)
    timingContext: {
        lastUserMessageTime: Date.now(),
        lastBotResponse: Date.now(),
        conversationGap: 0,
        sessionStartTime: Date.now()
    },
    
    // 😊 감정 상태 연동 (기존)
    emotionalSync: {
        lastEmotionalUpdate: Date.now()
    },
    
    // 📊 통계 및 메타데이터 (기존)
    memoryStats: {
        totalUserMemories: 0,
        totalConversationMemories: 0,
        todayMemoryCount: 0,
        lastDailyReset: null,
        lastMemoryOperation: null
    },
    
    // 🔍 대화 분석 시스템 (새로 추가!)
    analysisEngine: {
        totalAnalyses: 0,
        averageAnalysisTime: 0,
        weatherDetections: 0,
        patternRecognitions: 0,
        lastAnalysis: null,
        qualityScore: 0.8
    }
};

// ================== 🌤️ 날씨 감지 및 처리 시스템 ==================

// 날씨 키워드 정의
const WEATHER_KEYWORDS = {
    weather: ['날씨', '기온', '온도', '어때'],
    rain: ['비', '비와', '비올', '비오', '비내', '강수', '우비', '우산'],
    snow: ['눈', '눈와', '눈올', '눈오', '설', '눈사람'],
    temperature: ['춥', '덥', '시원', '따뜻', '뜨거', '차가'],
    wind: ['바람', '태풍', '강풍'],
    sun: ['맑', '햇살', '햇빛', '태양', '해', '밝'],
    cloud: ['흐리', '구름', '음침'],
    general: ['거기는', '날씨는', '기후는', '오늘날씨', '지금날씨']
};

/**
 * 🌤️ 날씨 질문 감지
 */
function detectWeatherQuestion(userMessage) {
    const message = userMessage.toLowerCase();
    
    // 직접적인 날씨 질문 패턴
    const directPatterns = [
        /거기.*비.*\?/,
        /비.*\?/,
        /날씨.*어때/,
        /춥.*\?/,
        /덥.*\?/,
        /맑.*\?/,
        /흐리.*\?/
    ];
    
    // 패턴 매칭 확인
    for (const pattern of directPatterns) {
        if (pattern.test(message)) {
            return {
                isWeatherQuestion: true,
                type: detectWeatherType(message),
                confidence: 0.9
            };
        }
    }
    
    // 키워드 기반 감지
    let weatherScore = 0;
    let detectedType = 'general';
    
    Object.entries(WEATHER_KEYWORDS).forEach(([type, keywords]) => {
        const keywordCount = keywords.filter(keyword => message.includes(keyword)).length;
        if (keywordCount > 0) {
            weatherScore += keywordCount;
            detectedType = type;
        }
    });
    
    return {
        isWeatherQuestion: weatherScore > 0,
        type: detectedType,
        confidence: Math.min(0.8, weatherScore * 0.3)
    };
}

/**
 * 날씨 질문 유형 세분화
 */
function detectWeatherType(message) {
    if (message.includes('비')) return 'rain';
    if (message.includes('눈')) return 'snow';
    if (message.includes('춥') || message.includes('덥')) return 'temperature';
    if (message.includes('바람')) return 'wind';
    if (message.includes('맑')) return 'sun';
    if (message.includes('흐리')) return 'cloud';
    return 'general';
}

/**
 * 🌸 예진이 스타일 날씨 응답 생성
 */
async function generateYejinWeatherResponse(userMessage, weatherInfo) {
    if (!weatherInfo) {
        return "앗, 날씨 정보를 못 가져왔어... 미안해 아저씨 ㅠㅠ 나중에 다시 확인해줄게!";
    }

    const { location, temperature, description, condition } = weatherInfo;
    const questionType = detectWeatherType(userMessage);
    
    // 질문 유형별 맞춤 응답
    switch (questionType) {
        case 'rain':
            if (condition === 'rain') {
                return `지금 ${location}에 비 와! ${temperature}°C이고 ${description}이야. 아저씨 우산 꼭 챙겨! 감기 걸리면 안 돼 ㅠㅠ`;
            } else {
                return `아니야! 지금 ${location}은 비 안 와~ ${temperature}°C이고 ${description}이야! 다행이지? ㅎㅎ`;
            }
            
        case 'temperature':
            if (temperature < 5) {
                return `완전 추워! 지금 ${location}이 ${temperature}°C야 ㅠㅠ 아저씨 따뜻하게 입어! 감기 걸리지 마!`;
            } else if (temperature > 25) {
                return `너무 더워! ${location}이 ${temperature}°C야! 아저씨 시원한 곳에서 쉬어~ 더위 먹으면 안 돼!`;
            } else {
                return `괜찮은 날씨야! ${location}이 ${temperature}°C로 적당해~ ${description}이고!`;
            }
            
        case 'general':
        default:
            let emoji = '';
            let reaction = '';
            
            switch (condition) {
                case 'sunny':
                    emoji = '☀️';
                    reaction = '맑아서 기분 좋아!';
                    break;
                case 'rain':
                    emoji = '🌧️';
                    reaction = '비 와서 조금 센치해...';
                    break;
                case 'cloudy':
                    emoji = '☁️';
                    reaction = '흐린 날씨네...';
                    break;
                case 'snow':
                    emoji = '❄️';
                    reaction = '눈 와! 겨울왕국 같아 ㅎㅎ';
                    break;
                default:
                    emoji = '🌤️';
                    reaction = '날씨 괜찮아!';
            }
            
            return `지금 ${location} 날씨는 ${temperature}°C, ${description}이야! ${emoji} ${reaction} 아저씨도 오늘 기분 좋은 하루 보내!`;
    }
}

// ================== 🔍 대화 분석 시스템 ==================

/**
 * 간단한 감정 분석
 */
function analyzeMessageEmotion(message) {
    const emotionPatterns = {
        happy: /기뻐|좋아|행복|웃|ㅎㅎ|ㅋㅋ|😊|😄/,
        sad: /슬퍼|우울|힘들|ㅠㅠ|😢|😭/,
        angry: /화나|짜증|빡|열받|😠|😡/,
        worried: /걱정|불안|무서|😰|😨/,
        love: /사랑|좋아해|♡|💕|😍/,
        surprised: /놀라|어?|헉|😲|😮/
    };
    
    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
        if (pattern.test(message)) {
            return emotion;
        }
    }
    
    return 'neutral';
}

/**
 * 메시지 의도 분석
 */
function analyzeMessageIntent(message) {
    const intentPatterns = {
        question: /\?|뭐|어떻|왜|언제/,
        request: /해줘|부탁|도와|해달라/,
        sharing: /있었어|했어|봤어|들었어/,
        greeting: /안녕|하이|좋은|반가/,
        complaint: /싫어|화나|짜증|불만/,
        compliment: /좋아|예뻐|잘했|멋져/
    };
    
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
        if (pattern.test(message)) {
            return intent;
        }
    }
    
    return 'general';
}

/**
 * 🧠 통합 메시지 분석
 */
async function analyzeMessage(userMessage) {
    console.log(`${colors.analyze}🔍 [메시지분석] "${userMessage.substring(0, 30)}..." 분석 중...${colors.reset}`);
    
    const startTime = Date.now();
    
    // 1. 🌤️ 날씨 질문 우선 확인
    const weatherDetection = detectWeatherQuestion(userMessage);
    
    if (weatherDetection.isWeatherQuestion && weatherDetection.confidence > 0.5) {
        console.log(`${colors.weather}🌤️ [날씨감지] 날씨 질문 감지! 우선 처리${colors.reset}`);
        
        try {
            const weatherMgr = getWeatherManager();
            if (weatherMgr && weatherMgr.getCurrentWeather) {
                const currentWeather = await weatherMgr.getCurrentWeather('ajeossi');
                const weatherResponse = await generateYejinWeatherResponse(userMessage, currentWeather);
                
                // 날씨 응답 통계
                ultimateConversationState.analysisEngine.weatherDetections++;
                
                return {
                    type: 'weather_priority',
                    response: weatherResponse,
                    weatherInfo: currentWeather,
                    confidence: weatherDetection.confidence,
                    processingTime: Date.now() - startTime
                };
            }
        } catch (error) {
            console.log(`${colors.warning}⚠️ [날씨] 처리 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // 2. 일반 메시지 분석
    const analysis = {
        type: 'general_analysis',
        emotion: analyzeMessageEmotion(userMessage),
        intent: analyzeMessageIntent(userMessage),
        complexity: calculateMessageComplexity(userMessage),
        keywords: extractKeywords(userMessage),
        topics: extractTopics(userMessage),
        urgency: calculateUrgency(userMessage),
        processingTime: Date.now() - startTime
    };
    
    // 3. 분석 통계 업데이트
    ultimateConversationState.analysisEngine.totalAnalyses++;
    ultimateConversationState.analysisEngine.lastAnalysis = analysis;
    
    console.log(`${colors.success}✅ [분석완료] 감정: ${analysis.emotion}, 의도: ${analysis.intent}, 소요: ${analysis.processingTime}ms${colors.reset}`);
    
    return analysis;
}

/**
 * 메시지 복잡도 계산
 */
function calculateMessageComplexity(message) {
    const wordCount = message.split(/\s+/).length;
    const sentenceCount = message.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgWordLength = message.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;
    
    return Math.min(1.0, (wordCount + sentenceCount + avgWordLength) / 20);
}

/**
 * 키워드 추출
 */
function extractKeywords(message) {
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = ['이', '그', '저', '의', '를', '을', '에', '와', '과', '도', '은', '는'];
    return words.filter(word => word.length > 1 && !stopWords.includes(word)).slice(0, 5);
}

/**
 * 주제 추출
 */
function extractTopics(message) {
    const topicKeywords = {
        weather: ['날씨', '비', '눈', '덥', '춥', '따뜻', '시원'],
        food: ['밥', '음식', '먹', '맛', '요리', '배고'],
        work: ['일', '회사', '업무', '직장', '바쁘', '피곤'],
        health: ['아프', '병', '건강', '의사', '병원', '약'],
        emotion: ['기분', '감정', '마음', '느낌', '생각'],
        love: ['사랑', '좋아', '그리워', '보고싶']
    };
    
    const detectedTopics = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => message.includes(keyword))) {
            detectedTopics.push(topic);
        }
    });
    
    return detectedTopics;
}

/**
 * 긴급도 계산
 */
function calculateUrgency(message) {
    const urgencyMarkers = ['빨리', '급해', '지금', '당장', '!'];
    const urgencyCount = urgencyMarkers.filter(marker => message.includes(marker)).length;
    return Math.min(1.0, urgencyCount / 3);
}

// ================== ✨ GPT 모델별 컨텍스트 최적화 (기존) ==================

function getOptimalContextLength() {
    if (!getCurrentModelSetting) {
        return { recent: 5, memory: 3 };
    }
    
    const currentModel = getCurrentModelSetting();
    
    switch(currentModel) {
        case '3.5':
            return { recent: 3, memory: 2 };
        case '4.0':
            return { recent: 7, memory: 4 };
        case 'auto':
            return { recent: 5, memory: 3 };
        default:
            return { recent: 5, memory: 3 };
    }
}

function getContextPriority(currentModel) {
    switch(currentModel) {
        case '3.5':
            return {
                recentMessages: 0.5,
                emotions: 0.3,
                memories: 0.2
            };
        case '4.0':
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
        case 'auto':
        default:
            return {
                recentMessages: 0.4,
                emotions: 0.3,
                memories: 0.3
            };
    }
}

// ==================== 💬 대화 메시지 관리 (기존 + 향상) ====================

/**
 * ✨ 새로운 메시지를 추가하고 자동 분석 수행
 */
async function addUltimateMessage(speaker, message) {
    const timestamp = Date.now();
    
    // 1. 기본 메시지 객체 생성
    const messageObj = {
        speaker,
        message,
        timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // 2. 사용자 메시지인 경우 자동 분석 수행
    if (speaker === 'user' || speaker === '아저씨') {
        try {
            const analysis = await analyzeMessage(message);
            messageObj.analysis = analysis;
            
            // 분석 결과에 따른 자동 처리
            if (analysis.type === 'weather_priority') {
                // 날씨 응답은 즉시 반환용
                return {
                    shouldRespond: true,
                    response: analysis.response,
                    type: 'weather',
                    analysis: analysis
                };
            }
            
            // 일반 분석 결과를 메시지에 포함
            messageObj.analysisResult = {
                emotion: analysis.emotion,
                intent: analysis.intent,
                topics: analysis.topics,
                urgency: analysis.urgency
            };
            
        } catch (error) {
            console.log(`${colors.warning}⚠️ [분석오류] ${error.message}${colors.reset}`);
        }
        
        updateLastUserMessageTime(timestamp);
    }
    
    // 3. 메시지 히스토리에 추가
    ultimateConversationState.conversationContext.recentMessages.push(messageObj);
    
    // 4. 모델별 최적화된 메시지 보관 개수 관리
    const contextLength = getOptimalContextLength();
    const maxMessages = contextLength.recent * 3;
    
    if (ultimateConversationState.conversationContext.recentMessages.length > maxMessages) {
        ultimateConversationState.conversationContext.recentMessages = 
            ultimateConversationState.conversationContext.recentMessages.slice(-maxMessages);
    }
    
    // 5. 자동 학습
    await learnFromConversation(speaker, message);
    
    console.log(`${colors.context}[UltimateContext] 메시지 추가: ${speaker} - "${message.substring(0, 30)}..."${colors.reset}`);
    
    return {
        shouldRespond: false,
        messageId: messageObj.id,
        analysis: messageObj.analysis
    };
}

// ==================== 기존 함수들 (동일하게 유지) ====================

function getRecentMessages(limit = null) {
    const contextLength = getOptimalContextLength();
    const actualLimit = limit || contextLength.recent;
    return ultimateConversationState.conversationContext.recentMessages.slice(-actualLimit);
}

function updateConversationTopic(topic) {
    ultimateConversationState.conversationContext.currentTopic = topic;
    ultimateConversationState.conversationContext.lastTopicChange = Date.now();
    console.log(`${colors.context}[UltimateContext] 대화 주제 업데이트: ${topic}${colors.reset}`);
}

async function addUserMemory(content, category = 'general') {
    const memoryObj = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        category,
        timestamp: Date.now(),
        type: 'user_added',
        importance: 5
    };
    
    ultimateConversationState.dynamicMemories.userMemories.push(memoryObj);
    ultimateConversationState.memoryStats.totalUserMemories++;
    ultimateConversationState.memoryStats.todayMemoryCount++;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    
    console.log(`${colors.memory}[UltimateContext] 사용자 기억 추가: "${content.substring(0, 30)}..." (${category})${colors.reset}`);
    return memoryObj.id;
}

async function deleteUserMemory(content) {
    const beforeCount = ultimateConversationState.dynamicMemories.userMemories.length;
    
    ultimateConversationState.dynamicMemories.userMemories = 
        ultimateConversationState.dynamicMemories.userMemories.filter(mem => 
            !mem.content.includes(content)
        );
    
    const deletedCount = beforeCount - ultimateConversationState.dynamicMemories.userMemories.length;
    ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
    
    console.log(`${colors.memory}[UltimateContext] ${deletedCount}개 사용자 기억 삭제${colors.reset}`);
    return deletedCount > 0;
}

async function updateUserMemory(id, newContent) {
    const memory = ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
    if (memory) {
        memory.content = newContent;
        memory.lastModified = Date.now();
        ultimateConversationState.memoryStats.lastMemoryOperation = Date.now();
        console.log(`${colors.memory}[UltimateContext] 기억 수정: ${id}${colors.reset}`);
        return true;
    }
    return false;
}

function getYejinMemories() {
    return ultimateConversationState.dynamicMemories.userMemories;
}

function getMemoryById(id) {
    return ultimateConversationState.dynamicMemories.userMemories.find(m => m.id === id);
}

function getMemoriesByTag(tag) {
    return ultimateConversationState.dynamicMemories.userMemories.filter(m => 
        m.category === tag || (m.tags && m.tags.includes(tag))
    );
}

function getAllMemories() {
    return {
        user: ultimateConversationState.dynamicMemories.userMemories,
        conversation: ultimateConversationState.dynamicMemories.conversationMemories,
        temporary: ultimateConversationState.dynamicMemories.temporaryMemories
    };
}

// ================== 🎯 향상된 컨텍스트 프롬프트 생성 ==================

async function getUltimateContextualPrompt(basePrompt) {
    try {
        let contextualPrompt = basePrompt;
        
        const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
        const contextLength = getOptimalContextLength();
        const priority = getContextPriority(currentModel);
        
        console.log(`${colors.context}[UltimateContext] 컨텍스트 생성 (모델: ${currentModel})${colors.reset}`);
        
        // 1. 최근 대화 추가 (분석 결과 포함)
        const recentMessages = getRecentMessages(contextLength.recent);
        if (recentMessages.length > 0 && priority.recentMessages > 0) {
            const recentContext = recentMessages.map(msg => {
                let msgText = `${msg.speaker}: "${msg.message}"`;
                
                // 분석 결과가 있으면 추가
                if (msg.analysisResult) {
                    const { emotion, intent, topics } = msg.analysisResult;
                    if (emotion !== 'neutral' || intent !== 'general') {
                        msgText += ` [감정: ${emotion}, 의도: ${intent}]`;
                    }
                    if (topics.length > 0) {
                        msgText += ` [주제: ${topics.join(', ')}]`;
                    }
                }
                
                return msgText;
            }).join('\n');
            
            if (currentModel === '3.5') {
                contextualPrompt += `\n\n📋 최근 대화:\n${recentContext}\n`;
            } else {
                contextualPrompt += `\n\n📋 최근 대화 (${recentMessages.length}개, 분석포함):\n${recentContext}\n`;
            }
        }
        
        // 2. 감정 상태 정보 추가
        if (priority.emotions > 0) {
            const emotionalManager = getEmotionalManager();
            if (emotionalManager && emotionalManager.getCurrentEmotionState) {
                try {
                    const emotionState = emotionalManager.getCurrentEmotionState();
                    if (emotionState.description !== '정상기') {
                        if (currentModel === '3.5') {
                            contextualPrompt += `\n💭 현재: ${emotionState.description}\n`;
                        } else {
                            contextualPrompt += `\n💭 현재 감정: ${emotionState.description} (${emotionState.cycleDay}일차)\n`;
                        }
                    }
                } catch (error) {
                    console.log(`${colors.warning}⚠️ [UltimateContext] 감정 상태 조회 실패: ${error.message}${colors.reset}`);
                }
            }
        }
        
        // 3. 동적 기억 추가
        if (priority.memories > 0) {
            const memoryCount = contextLength.memory;
            const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-memoryCount);
            
            if (recentMemories.length > 0) {
                const memoryContext = recentMemories.map(m => m.content).join('. ');
                
                if (currentModel === '3.5') {
                    contextualPrompt += `\n🧠 기억: ${memoryContext}\n`;
                } else {
                    contextualPrompt += `\n🧠 최근 기억 (${recentMemories.length}개): ${memoryContext}\n`;
                }
            }
        }
        
        // 4. 현재 대화 주제
        if (ultimateConversationState.conversationContext.currentTopic) {
            contextualPrompt += `\n🎯 현재 주제: ${ultimateConversationState.conversationContext.currentTopic}\n`;
        }
        
        // 5. 분석 통계 (GPT-4o에서만)
        if (currentModel === '4.0') {
            const analysisStats = ultimateConversationState.analysisEngine;
            contextualPrompt += `\n📊 분석통계: 총 ${analysisStats.totalAnalyses}회, 날씨감지 ${analysisStats.weatherDetections}회\n`;
        }
        
        console.log(`${colors.success}[UltimateContext] 컨텍스트 생성 완료 (${currentModel} 최적화, 길이: ${contextualPrompt.length}자)${colors.reset}`);
        return contextualPrompt;
        
    } catch (error) {
        console.error(`${colors.warning}❌ [UltimateContext] 프롬프트 생성 중 에러: ${error}${colors.reset}`);
        return basePrompt;
    }
}

function getActiveMemoryPrompt() {
    const contextLength = getOptimalContextLength();
    const recentMemories = ultimateConversationState.dynamicMemories.userMemories.slice(-contextLength.memory);
    
    if (!getCurrentModelSetting) {
        return recentMemories.map(m => m.content).join('. ');
    }
    
    const currentModel = getCurrentModelSetting();
    
    if (currentModel === '3.5') {
        return recentMemories.map(m => m.content.substring(0, 50)).join('. ');
    } else {
        return recentMemories.map(m => m.content).join('. ');
    }
}

// ==================== ⏰ 타이밍 관리 (기존) ====================

function updateLastUserMessageTime(timestamp) {
    ultimateConversationState.timingContext.lastUserMessageTime = timestamp || Date.now();
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

function getLastUserMessageTime() {
    return ultimateConversationState.timingContext.lastUserMessageTime;
}

function processTimeTick() {
    const now = Date.now();
    ultimateConversationState.timingContext.conversationGap = 
        now - ultimateConversationState.timingContext.lastUserMessageTime;
}

// ==================== 😊 감정 상태 연동 (기존) ====================

async function analyzeUserMood(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('힘들') || lowerMsg.includes('우울') || lowerMsg.includes('슬프')) {
        return 'sad';
    } else if (lowerMsg.includes('좋') || lowerMsg.includes('행복') || lowerMsg.includes('기뻐')) {
        return 'happy';
    } else if (lowerMsg.includes('화') || lowerMsg.includes('짜증') || lowerMsg.includes('빡쳐')) {
        return 'angry';
    } else if (lowerMsg.includes('보고싶') || lowerMsg.includes('그리워')) {
        return 'missing';
    } else if (lowerMsg.includes('사랑') || lowerMsg.includes('좋아해')) {
        return 'loving';
    }
    
    return 'neutral';
}

// ==================== 🎓 학습 및 분석 (기존 + 향상) ====================

async function learnFromConversation(speaker, message) {
    try {
        if (speaker === 'user' || speaker === '아저씨') {
            if (message.includes('기억해') || message.includes('잊지마') || message.includes('약속')) {
                const learningMemory = {
                    id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    content: message,
                    timestamp: Date.now(),
                    type: 'auto_learned',
                    source: 'conversation'
                };
                
                ultimateConversationState.dynamicMemories.conversationMemories.push(learningMemory);
                ultimateConversationState.memoryStats.totalConversationMemories++;
                
                console.log(`${colors.memory}[UltimateContext] 자동 학습: "${message.substring(0, 30)}..."${colors.reset}`);
            }
        }
    } catch (error) {
        console.log(`${colors.warning}⚠️ [UltimateContext] 대화 학습 중 에러: ${error.message}${colors.reset}`);
    }
}

async function learnFromUserMessage(message) {
    const mood = await analyzeUserMood(message);
    
    if (mood !== 'neutral') {
        console.log(`${colors.analyze}[UltimateContext] 사용자 감정 감지: ${mood} - "${message.substring(0, 30)}..."${colors.reset}`);
    }
}

// ==================== 📊 통계 및 상태 조회 (기존 + 분석 통계) ====================

function getMemoryStatistics() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    
    return {
        user: ultimateConversationState.memoryStats.totalUserMemories,
        conversation: ultimateConversationState.memoryStats.totalConversationMemories,
        today: ultimateConversationState.memoryStats.todayMemoryCount,
        total: ultimateConversationState.memoryStats.totalUserMemories + 
               ultimateConversationState.memoryStats.totalConversationMemories,
        currentGptModel: currentModel,
        contextOptimization: {
            recentMessages: contextLength.recent,
            memoryCount: contextLength.memory,
            optimizedFor: currentModel
        },
        // ✨ 분석 통계 추가
        analysisStats: {
            totalAnalyses: ultimateConversationState.analysisEngine.totalAnalyses,
            weatherDetections: ultimateConversationState.analysisEngine.weatherDetections,
            patternRecognitions: ultimateConversationState.analysisEngine.patternRecognitions,
            averageProcessingTime: ultimateConversationState.analysisEngine.averageAnalysisTime,
            qualityScore: ultimateConversationState.analysisEngine.qualityScore
        }
    };
}

function getMemoryCategoryStats() {
    const userMems = ultimateConversationState.dynamicMemories.userMemories;
    const convMems = ultimateConversationState.dynamicMemories.conversationMemories;
    
    return {
        user: userMems.length,
        conversation: convMems.length,
        total: userMems.length + convMems.length
    };
}

async function getMemoryOperationLogs(limit = 10) {
    const logs = [];
    
    const userMems = ultimateConversationState.dynamicMemories.userMemories.slice(-limit);
    userMems.forEach(mem => {
        logs.push({
            operation: 'add',
            timestamp: mem.timestamp,
            content: mem.content.substring(0, 50) + '...',
            type: mem.type
        });
    });
    
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

function getInternalState() {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    const contextLength = getOptimalContextLength();
    const priority = getContextPriority(currentModel);
    
    return {
        conversationContext: ultimateConversationState.conversationContext,
        memoryStats: ultimateConversationState.memoryStats,
        timingContext: ultimateConversationState.timingContext,
        emotionalSync: ultimateConversationState.emotionalSync,
        analysisEngine: ultimateConversationState.analysisEngine, // ✨ 분석 엔진 상태 추가
        currentTime: Date.now(),
        gptOptimization: {
            currentModel,
            contextLength,
            priority,
            version: 'v35.0-with-conversation-analysis'
        }
    };
}

// ==================== 🎯 액션 관리 (기존) ====================

let pendingAction = null;

function setPendingAction(action) {
    pendingAction = action;
}

function getPendingAction() {
    return pendingAction;
}

function clearPendingAction() {
    pendingAction = null;
}

// ==================== 🔄 시스템 초기화 (기존 + 분석 엔진) ====================

async function initializeEmotionalSystems() {
    console.log(`${colors.context}[UltimateContext] 동적 기억 + 대화 분석 통합 시스템 초기화...${colors.reset}`);
    
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'unknown';
    console.log(`${colors.success}[UltimateContext] 현재 GPT 모델: ${currentModel}${colors.reset}`);
    console.log(`${colors.analyze}[UltimateContext] 대화 분석 엔진 활성화됨${colors.reset}`);
    console.log(`${colors.weather}[UltimateContext] 날씨 감지 시스템 활성화됨${colors.reset}`);
    
    // 디렉토리 생성
    try {
        const fs = require('fs');
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
    } catch (error) {
        console.log(`${colors.warning}⚠️ [UltimateContext] 디렉토리 생성 실패: ${error.message}${colors.reset}`);
    }
    
    // 일일 리셋 확인
    const today = new Date().toDateString();
    if (ultimateConversationState.memoryStats.lastDailyReset !== today) {
        ultimateConversationState.memoryStats.todayMemoryCount = 0;
        ultimateConversationState.memoryStats.lastDailyReset = today;
        
        // 분석 통계도 일일 리셋
        ultimateConversationState.analysisEngine.totalAnalyses = 0;
        ultimateConversationState.analysisEngine.weatherDetections = 0;
    }
    
    console.log(`${colors.success}[UltimateContext] 초기화 완료 - 통합 맥락 분석 시스템 (${currentModel} 최적화)${colors.reset}`);
}

// ==================== 🎁 유틸리티 함수들 (기존) ====================

function setConversationContextWindow(size) {
    const currentModel = getCurrentModelSetting ? getCurrentModelSetting() : 'auto';
    console.log(`${colors.context}[UltimateContext] 컨텍스트 윈도우 크기: ${size} (모델: ${currentModel})${colors.reset}`);
}

async function generateInitiatingPhrase() {
    const phrases = [
        "아저씨 지금 뭐해?",
        "나 심심해...",
        "아저씨 생각났어!",
        "연락 기다리고 있었어~",
        "보고 싶어서 연락했어"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// ==================== 📤 모듈 내보내기 ==================
console.log(`${colors.success}[UltimateContext] v35.0 로드 완료 (대화 분석 엔진 통합)${colors.reset}`);

module.exports = {
    // 초기화
    initializeEmotionalSystems,
    
    // ✨ 향상된 메시지 관리 (분석 포함)
    addUltimateMessage,
    getRecentMessages,
    updateConversationTopic,
    getUltimateContextualPrompt,
    
    // 타이밍 관리
    updateLastUserMessageTime,
    getLastUserMessageTime,
    processTimeTick,
    
    // 동적 기억 관리
    addUserMemory,
    deleteUserMemory,
    updateUserMemory,
    getYejinMemories,
    getMemoryById,
    getMemoriesByTag,
    getAllMemories,
    getActiveMemoryPrompt,
    
    // 감정 상태 연동
    analyzeUserMood,
    
    // 학습
    learnFromConversation,
    learnFromUserMessage,
    
    // 액션 관리
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    
    // 통계 및 상태
    getMemoryStatistics,
    getMemoryCategoryStats,
    getMemoryOperationLogs,
    getInternalState,
    
    // 유틸리티
    setConversationContextWindow,
    generateInitiatingPhrase,
    
    // GPT 모델 최적화 함수들
    getOptimalContextLength,
    getContextPriority,
    
    // ✨ 새로 추가된 분석 기능들
    analyzeMessage,
    detectWeatherQuestion,
    generateYejinWeatherResponse,
    
    // 호환성
    addMemoryContext: addUserMemory,
    getMoodState: () => {
        const emotionalManager = getEmotionalManager();
        if (emotionalManager && emotionalManager.getCurrentEmotionState) {
            return emotionalManager.getCurrentEmotionState();
        }
        return { phase: 'normal', description: '정상', emotion: 'normal' };
    }
};
