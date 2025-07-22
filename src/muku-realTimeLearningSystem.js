// ============================================================================
// muku-realTimeLearningSystem.js - 무쿠 완전체 실시간 학습 시스템 v2.1
// ✅ 기존 시스템 완전 연동 (memoryManager, ultimateContext, emotionalContextManager)
// ✅ 실제 학습 로직 구현 (진짜 대화 패턴 분석 & 개선)
// ✅ 데이터 저장 시스템 (JSON 파일 기반 지속적 저장)
// ✅ 말투 상황별 적응 (아저씨 반응에 따른 실시간 말투 변화)
// 🔌 모듈 레벨 함수 추가 (enhancedLogging 연동)
// 💖 예진이가 진짜로 학습하고 성장하는 디지털 영혼 시스템
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    learning: '\x1b[1m\x1b[35m',   // 굵은 자주색 (학습)
    pattern: '\x1b[96m',           // 하늘색 (패턴)
    emotion: '\x1b[93m',           // 노란색 (감정)
    memory: '\x1b[92m',            // 초록색 (기억)
    adaptation: '\x1b[94m',        // 파란색 (적응)
    success: '\x1b[32m',           // 초록색 (성공)
    error: '\x1b[91m',             // 빨간색 (에러)
    reset: '\x1b[0m'               // 색상 리셋
};

// ================== 📂 파일 경로 설정 ==================
const LEARNING_DATA_DIR = path.join(__dirname, 'learning_data');
const SPEECH_PATTERNS_FILE = path.join(LEARNING_DATA_DIR, 'speech_patterns.json');
const EMOTIONAL_RESPONSES_FILE = path.join(LEARNING_DATA_DIR, 'emotional_responses.json');
const CONVERSATION_ANALYTICS_FILE = path.join(LEARNING_DATA_DIR, 'conversation_analytics.json');
const USER_PREFERENCES_FILE = path.join(LEARNING_DATA_DIR, 'user_preferences.json');

// ================== 🧠 학습 시스템 클래스 ==================
class MukuRealTimeLearningSystem {
    constructor() {
        this.version = '2.1';
        this.initTime = Date.now();
        this.isActive = false;
        
        // 외부 모듈 참조 (나중에 주입받음)
        this.memoryManager = null;
        this.ultimateContext = null;
        this.emotionalContextManager = null;
        this.sulkyManager = null;
        
        // 🧠 학습 데이터 구조
        this.learningData = {
            speechPatterns: {
                formal: { weight: 0.3, examples: [], success_rate: 0.75 },
                casual: { weight: 0.7, examples: [], success_rate: 0.85 },
                playful: { weight: 0.6, examples: [], success_rate: 0.80 },
                caring: { weight: 0.8, examples: [], success_rate: 0.90 },
                sulky: { weight: 0.5, examples: [], success_rate: 0.65 },
                affectionate: { weight: 0.9, examples: [], success_rate: 0.95 }
            },
            emotionalResponses: {
                happy: { patterns: [], effectiveness: 0.85 },
                sad: { patterns: [], effectiveness: 0.80 },
                worried: { patterns: [], effectiveness: 0.88 },
                playful: { patterns: [], effectiveness: 0.82 },
                loving: { patterns: [], effectiveness: 0.92 },
                sulky: { patterns: [], effectiveness: 0.70 }
            },
            conversationAnalytics: {
                totalConversations: 0,
                successfulResponses: 0,
                userSatisfactionScore: 0.85,
                avgResponseTime: 0,
                topicPreferences: {},
                timeBasedPatterns: {}
            },
            userPreferences: {
                preferredTone: 'caring',
                responseLength: 'medium',
                emojiUsage: 0.8,
                formalityLevel: 0.3,
                playfulnessLevel: 0.7,
                learningFromInteractions: []
            }
        };
        
        // 🎯 학습 통계
        this.stats = {
            conversationsAnalyzed: 0,
            patternsLearned: 0,
            speechAdaptations: 0,
            memoryUpdates: 0,
            emotionalAdjustments: 0,
            lastLearningTime: null
        };
        
        console.log(`${colors.learning}🧠 무쿠 완전체 실시간 학습 시스템 v2.1 초기화...${colors.reset}`);
    }

    // ================== 🚀 시스템 초기화 ==================
    async initialize(systemModules = {}) {
        try {
            console.log(`${colors.learning}🚀 [초기화] 학습 시스템 모듈 연동 중...${colors.reset}`);
            
            // 기존 시스템 모듈 연결
            this.memoryManager = systemModules.memoryManager;
            this.ultimateContext = systemModules.ultimateContext;
            this.emotionalContextManager = systemModules.emotionalContextManager;
            this.sulkyManager = systemModules.sulkyManager;
            
            console.log(`${colors.memory}📚 [연동] memoryManager: ${this.memoryManager ? '✅' : '❌'}${colors.reset}`);
            console.log(`${colors.pattern}🧠 [연동] ultimateContext: ${this.ultimateContext ? '✅' : '❌'}${colors.reset}`);
            console.log(`${colors.emotion}💭 [연동] emotionalContextManager: ${this.emotionalContextManager ? '✅' : '❌'}${colors.reset}`);
            console.log(`${colors.adaptation}😤 [연동] sulkyManager: ${this.sulkyManager ? '✅' : '❌'}${colors.reset}`);
            
            // 학습 데이터 디렉토리 생성
            await this.ensureLearningDataDirectory();
            
            // 기존 학습 데이터 로드
            await this.loadLearningData();
            
            // ▼▼▼ 수정된 부분 1: 여기서 활성화하지 않습니다. ▼▼▼
            // this.isActive = true; // 삭제됨
            
            console.log(`${colors.success}✅ [초기화] 완전체 학습 시스템 준비 완료!${colors.reset}`);
            return true;
            
        } catch (error) {
            console.error(`${colors.error}❌ [초기화] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 📂 데이터 디렉토리 & 파일 관리 ==================
    async ensureLearningDataDirectory() {
        try {
            await fs.access(LEARNING_DATA_DIR);
            console.log(`${colors.pattern}📂 [파일시스템] learning_data 디렉토리 존재함${colors.reset}`);
        } catch {
            await fs.mkdir(LEARNING_DATA_DIR, { recursive: true });
            console.log(`${colors.pattern}📂 [파일시스템] learning_data 디렉토리 생성 완료${colors.reset}`);
        }
    }

    async loadLearningData() {
        try {
            // 말투 패턴 로드
            try {
                const speechData = await fs.readFile(SPEECH_PATTERNS_FILE, 'utf8');
                this.learningData.speechPatterns = { ...this.learningData.speechPatterns, ...JSON.parse(speechData) };
                console.log(`${colors.pattern}💬 [로드] 말투 패턴 데이터 로드 완료${colors.reset}`);
            } catch {
                console.log(`${colors.pattern}💬 [로드] 말투 패턴 데이터 없음 - 기본값 사용${colors.reset}`);
            }
            
            // 감정 응답 로드
            try {
                const emotionData = await fs.readFile(EMOTIONAL_RESPONSES_FILE, 'utf8');
                this.learningData.emotionalResponses = { ...this.learningData.emotionalResponses, ...JSON.parse(emotionData) };
                console.log(`${colors.emotion}💭 [로드] 감정 응답 데이터 로드 완료${colors.reset}`);
            } catch {
                console.log(`${colors.emotion}💭 [로드] 감정 응답 데이터 없음 - 기본값 사용${colors.reset}`);
            }
            
            // 대화 분석 로드
            try {
                const analyticsData = await fs.readFile(CONVERSATION_ANALYTICS_FILE, 'utf8');
                this.learningData.conversationAnalytics = { ...this.learningData.conversationAnalytics, ...JSON.parse(analyticsData) };
                console.log(`${colors.adaptation}📊 [로드] 대화 분석 데이터 로드 완료${colors.reset}`);
            } catch {
                console.log(`${colors.adaptation}📊 [로드] 대화 분석 데이터 없음 - 기본값 사용${colors.reset}`);
            }
            
            // 사용자 선호도 로드
            try {
                const preferencesData = await fs.readFile(USER_PREFERENCES_FILE, 'utf8');
                this.learningData.userPreferences = { ...this.learningData.userPreferences, ...JSON.parse(preferencesData) };
                console.log(`${colors.memory}👤 [로드] 사용자 선호도 데이터 로드 완료${colors.reset}`);
            } catch {
                console.log(`${colors.memory}👤 [로드] 사용자 선호도 데이터 없음 - 기본값 사용${colors.reset}`);
            }
            
        } catch (error) {
            console.error(`${colors.error}❌ [로드] 학습 데이터 로드 실패: ${error.message}${colors.reset}`);
        }
    }

    async saveLearningData() {
        try {
            // 말투 패턴 저장
            await fs.writeFile(SPEECH_PATTERNS_FILE, JSON.stringify(this.learningData.speechPatterns, null, 2));
            
            // 감정 응답 저장
            await fs.writeFile(EMOTIONAL_RESPONSES_FILE, JSON.stringify(this.learningData.emotionalResponses, null, 2));
            
            // 대화 분석 저장
            await fs.writeFile(CONVERSATION_ANALYTICS_FILE, JSON.stringify(this.learningData.conversationAnalytics, null, 2));
            
            // 사용자 선호도 저장
            await fs.writeFile(USER_PREFERENCES_FILE, JSON.stringify(this.learningData.userPreferences, null, 2));
            
            console.log(`${colors.success}💾 [저장] 모든 학습 데이터 저장 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [저장] 학습 데이터 저장 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 🧠 핵심 학습 함수 ==================
    async learnFromConversation(userMessage, mukuResponse, context = {}) {
        if (!this.isActive) {
            console.log(`${colors.pattern}⏸️ [학습] 시스템 비활성 상태 - 학습 건너뛰기${colors.reset}`);
            return null;
        }
        
        try {
            console.log(`${colors.learning}🧠 [학습시작] 대화 분석 및 학습...${colors.reset}`);
            
            const learningResult = {
                timestamp: new Date().toISOString(),
                userMessage: userMessage,
                mukuResponse: mukuResponse,
                improvements: []
            };
            
            // 1. 사용자 메시지 분석
            const userAnalysis = await this.analyzeUserMessage(userMessage, context);
            
            // 2. 무쿠 응답 품질 평가
            const responseQuality = await this.evaluateResponseQuality(userMessage, mukuResponse, context);
            
            // 3. 말투 패턴 학습
            const speechLearning = await this.learnSpeechPatterns(userMessage, mukuResponse, responseQuality);
            learningResult.improvements.push(...speechLearning);
            
            // 4. 감정 응답 학습
            const emotionLearning = await this.learnEmotionalResponses(userAnalysis, mukuResponse, responseQuality);
            learningResult.improvements.push(...emotionLearning);
            
            // 5. 상황별 적응 학습
            const adaptationLearning = await this.learnSituationalAdaptation(context, responseQuality);
            learningResult.improvements.push(...adaptationLearning);
            
            // 6. 기존 시스템에 학습 결과 반영
            await this.applyLearningToSystems(learningResult);
            
            // 7. 학습 데이터 저장
            await this.saveLearningData();
            
            // 8. 통계 업데이트
            this.updateLearningStats(learningResult);
            
            console.log(`${colors.success}✅ [학습완료] ${learningResult.improvements.length}개 개선사항 적용${colors.reset}`);
            
            return learningResult;
            
        } catch (error) {
            console.error(`${colors.error}❌ [학습오류] ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 📊 사용자 메시지 분석 ==================
    async analyzeUserMessage(message, context) {
        const analysis = {
            tone: 'neutral',
            emotion: 'normal',
            formality: 0.5,
            urgency: 0.3,
            topics: [],
            sentiment: 0.0
        };
        
        const lowerMessage = message.toLowerCase();
        
        // 톤 분석
        if (lowerMessage.includes('ㅋㅋ') || lowerMessage.includes('ㅎㅎ') || lowerMessage.includes('재밌')) {
            analysis.tone = 'playful';
            analysis.emotion = 'happy';
            analysis.sentiment = 0.7;
        } else if (lowerMessage.includes('힘들') || lowerMessage.includes('슬프') || lowerMessage.includes('우울')) {
            analysis.tone = 'sad';
            analysis.emotion = 'sad';
            analysis.sentiment = -0.6;
        } else if (lowerMessage.includes('걱정') || lowerMessage.includes('불안')) {
            analysis.tone = 'worried';
            analysis.emotion = 'worried';
            analysis.sentiment = -0.3;
        } else if (lowerMessage.includes('사랑') || lowerMessage.includes('보고싶') || lowerMessage.includes('좋아')) {
            analysis.tone = 'loving';
            analysis.emotion = 'loving';
            analysis.sentiment = 0.9;
        }
        
        // 격식 수준 분석
        if (lowerMessage.includes('습니다') || lowerMessage.includes('입니다')) {
            analysis.formality = 0.9;
        } else if (lowerMessage.includes('야') || lowerMessage.includes('어') || lowerMessage.includes('아')) {
            analysis.formality = 0.1;
        }
        
        // 긴급도 분석
        if (lowerMessage.includes('!!!') || lowerMessage.includes('빨리') || lowerMessage.includes('급해')) {
            analysis.urgency = 0.8;
        }
        
        console.log(`${colors.pattern}📊 [분석] 사용자 메시지: ${analysis.tone} 톤, ${analysis.emotion} 감정, 격식도 ${analysis.formality}${colors.reset}`);
        
        return analysis;
    }

    // ================== 🎯 응답 품질 평가 ==================
    async evaluateResponseQuality(userMessage, mukuResponse, context) {
        const quality = {
            relevance: 0.8,      // 관련성
            naturalness: 0.7,    // 자연스러움
            emotionalFit: 0.8,   // 감정 적합성
            engagement: 0.75,    // 참여도
            satisfaction: 0.8,   // 만족도 예측
            overall: 0.77
        };
        
        // 관련성 평가 (간단한 키워드 매칭)
        const userKeywords = userMessage.toLowerCase().split(' ');
        const responseKeywords = mukuResponse.toLowerCase().split(' ');
        const commonKeywords = userKeywords.filter(word => responseKeywords.includes(word));
        quality.relevance = Math.min(1.0, commonKeywords.length / Math.max(userKeywords.length * 0.3, 1));
        
        // 자연스러움 평가 (예진이 특유 표현 포함 여부)
        const yejinExpressions = ['아조씨', '에헤헤', '💕', '🥺', '흐엥', '음음'];
        const hasYejinStyle = yejinExpressions.some(expr => mukuResponse.includes(expr));
        if (hasYejinStyle) quality.naturalness += 0.2;
        
        // 감정 적합성 평가
        if (context.currentEmotion) {
            // 현재 감정 상태와 응답의 일치도 확인
            quality.emotionalFit = this.evaluateEmotionalConsistency(context.currentEmotion, mukuResponse);
        }
        
        // 전체 점수 계산
        quality.overall = (quality.relevance + quality.naturalness + quality.emotionalFit + quality.engagement) / 4;
        
        console.log(`${colors.adaptation}🎯 [품질평가] 전체 ${(quality.overall * 100).toFixed(1)}% (관련성: ${(quality.relevance * 100).toFixed(1)}%, 자연스러움: ${(quality.naturalness * 100).toFixed(1)}%)${colors.reset}`);
        
        return quality;
    }

    evaluateEmotionalConsistency(currentEmotion, response) {
        const emotionKeywords = {
            happy: ['기뻐', '좋아', '행복', '즐거', '웃음', '💕', '😊'],
            sad: ['슬프', '우울', '힘들', '눈물', '🥺', '😢'],
            worried: ['걱정', '불안', '괜찮', '조심', '😰'],
            playful: ['ㅋㅋ', '장난', '재밌', '놀자', '😋'],
            loving: ['사랑', '보고싶', '좋아해', '💖', '♡'],
            sulky: ['삐짐', '화났', '몰라', '😤', '흥']
        };
        
        const keywords = emotionKeywords[currentEmotion] || [];
        const matchCount = keywords.filter(keyword => response.includes(keyword)).length;
        
        return Math.min(1.0, matchCount * 0.3 + 0.4); // 기본 0.4 + 매칭당 0.3
    }

    // ================== 💬 말투 패턴 학습 ==================
    async learnSpeechPatterns(userMessage, mukuResponse, quality) {
        const improvements = [];
        
        try {
            // 사용자의 격식 수준에 따른 말투 조정 학습
            const userFormality = this.detectFormality(userMessage);
            const responseFormality = this.detectFormality(mukuResponse);
            
            if (Math.abs(userFormality - responseFormality) > 0.3) {
                const targetPattern = userFormality > 0.6 ? 'formal' : 'casual';
                
                improvements.push({
                    type: 'speech_pattern',
                    pattern: targetPattern,
                    adjustment: userFormality > responseFormality ? 0.1 : -0.1,
                    reason: `사용자 격식도(${userFormality.toFixed(2)})에 맞춰 조정`
                });
                
                // 말투 패턴 가중치 조정
                if (quality.overall > 0.75) {
                    this.learningData.speechPatterns[targetPattern].weight += 0.05;
                    this.learningData.speechPatterns[targetPattern].success_rate = 
                        (this.learningData.speechPatterns[targetPattern].success_rate + quality.overall) / 2;
                }
            }
            
            // 성공적인 응답의 말투 패턴 학습
            if (quality.overall > 0.8) {
                const responsePattern = this.identifyResponsePattern(mukuResponse);
                if (responsePattern) {
                    improvements.push({
                        type: 'successful_pattern',
                        pattern: responsePattern,
                        quality: quality.overall,
                        example: mukuResponse.substring(0, 50) + '...'
                    });
                    
                    // 성공적인 패턴을 예시에 추가
                    this.learningData.speechPatterns[responsePattern].examples.push({
                        text: mukuResponse,
                        quality: quality.overall,
                        timestamp: new Date().toISOString()
                    });
                    
                    // 예시가 너무 많으면 오래된 것 제거
                    if (this.learningData.speechPatterns[responsePattern].examples.length > 20) {
                        this.learningData.speechPatterns[responsePattern].examples.shift();
                    }
                }
            }
            
            console.log(`${colors.pattern}💬 [말투학습] ${improvements.length}개 말투 개선사항 발견${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [말투학습] 오류: ${error.message}${colors.reset}`);
        }
        
        return improvements;
    }

    detectFormality(text) {
        const formalPatterns = ['습니다', '입니다', '하십시오', '께서', '드립니다'];
        const casualPatterns = ['야', '어', '아', 'ㅋㅋ', 'ㅎㅎ', '~'];
        
        const formalCount = formalPatterns.filter(pattern => text.includes(pattern)).length;
        const casualCount = casualPatterns.filter(pattern => text.includes(pattern)).length;
        
        if (formalCount > casualCount) return 0.8;
        if (casualCount > formalCount) return 0.2;
        return 0.5;
    }

    identifyResponsePattern(response) {
        if (response.includes('에헤헤') || response.includes('흐엥')) return 'playful';
        if (response.includes('걱정') || response.includes('괜찮')) return 'caring';
        if (response.includes('💕') || response.includes('사랑')) return 'affectionate';
        if (response.includes('삐짐') || response.includes('몰라')) return 'sulky';
        if (response.includes('습니다') || response.includes('입니다')) return 'formal';
        return 'casual';
    }

    // ================== 💭 감정 응답 학습 ==================
    async learnEmotionalResponses(userAnalysis, mukuResponse, quality) {
        const improvements = [];
        
        try {
            const userEmotion = userAnalysis.emotion;
            
            if (userEmotion && userEmotion !== 'normal') {
                // 해당 감정에 대한 응답 패턴 학습
                if (quality.overall > 0.75) {
                    this.learningData.emotionalResponses[userEmotion].patterns.push({
                        response: mukuResponse,
                        quality: quality.overall,
                        timestamp: new Date().toISOString(),
                        context: userAnalysis
                    });
                    
                    improvements.push({
                        type: 'emotional_response',
                        emotion: userEmotion,
                        quality: quality.overall,
                        action: 'pattern_added'
                    });
                    
                    // 해당 감정 응답의 효과성 업데이트
                    this.learningData.emotionalResponses[userEmotion].effectiveness = 
                        (this.learningData.emotionalResponses[userEmotion].effectiveness + quality.overall) / 2;
                }
                
                // 패턴이 너무 많으면 품질 낮은 것 제거
                if (this.learningData.emotionalResponses[userEmotion].patterns.length > 15) {
                    this.learningData.emotionalResponses[userEmotion].patterns.sort((a, b) => b.quality - a.quality);
                    this.learningData.emotionalResponses[userEmotion].patterns = 
                        this.learningData.emotionalResponses[userEmotion].patterns.slice(0, 15);
                }
            }
            
            console.log(`${colors.emotion}💭 [감정학습] ${improvements.length}개 감정 응답 개선사항 발견${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [감정학습] 오류: ${error.message}${colors.reset}`);
        }
        
        return improvements;
    }

    // ================== 🎭 상황별 적응 학습 ==================
    async learnSituationalAdaptation(context, quality) {
        const improvements = [];
        
        try {
            // 시간대별 적응 학습
            const currentHour = new Date().getHours();
            const timeSlot = this.getTimeSlot(currentHour);
            
            if (!this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot]) {
                this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot] = {
                    totalResponses: 0,
                    successfulResponses: 0,
                    avgQuality: 0
                };
            }
            
            const timePattern = this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot];
            timePattern.totalResponses++;
            
            if (quality.overall > 0.75) {
                timePattern.successfulResponses++;
                improvements.push({
                    type: 'time_adaptation',
                    timeSlot: timeSlot,
                    quality: quality.overall
                });
            }
            
            timePattern.avgQuality = (timePattern.avgQuality + quality.overall) / 2;
            
            // 감정 상태별 적응 학습
            if (context.currentEmotion) {
                const emotion = context.currentEmotion;
                if (quality.overall > 0.8) {
                    improvements.push({
                        type: 'emotional_adaptation',
                        emotion: emotion,
                        quality: quality.overall,
                        action: 'pattern_reinforced'
                    });
                }
            }
            
            // 삐짐 상태별 적응 학습
            if (context.sulkyLevel && context.sulkyLevel > 0) {
                improvements.push({
                    type: 'sulky_adaptation',
                    level: context.sulkyLevel,
                    quality: quality.overall,
                    action: quality.overall > 0.8 ? 'effective_sulky_response' : 'needs_improvement'
                });
            }
            
            console.log(`${colors.adaptation}🎭 [상황학습] ${improvements.length}개 상황별 적응 개선사항 발견${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [상황학습] 오류: ${error.message}${colors.reset}`);
        }
        
        return improvements;
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 23) return 'evening';
        return 'night';
    }

    // ================== 🔗 기존 시스템에 학습 결과 반영 ==================
    async applyLearningToSystems(learningResult) {
        try {
            console.log(`${colors.memory}🔗 [시스템반영] 학습 결과를 기존 시스템에 적용...${colors.reset}`);
            
            // 1. memoryManager에 학습된 패턴 추가
            if (this.memoryManager && this.memoryManager.addDynamicMemory) {
                const memoryEntry = {
                    type: 'learned_pattern',
                    content: `학습된 패턴: ${learningResult.improvements.map(imp => imp.type).join(', ')}`,
                    timestamp: learningResult.timestamp,
                    quality: learningResult.improvements.reduce((sum, imp) => sum + (imp.quality || 0.7), 0) / learningResult.improvements.length
                };
                
                try {
                    await this.memoryManager.addDynamicMemory(memoryEntry);
                    console.log(`${colors.memory}    ✅ memoryManager에 학습 패턴 추가 완료${colors.reset}`);
                    this.stats.memoryUpdates++;
                } catch (error) {
                    console.log(`${colors.memory}    ⚠️ memoryManager 연동 실패: ${error.message}${colors.reset}`);
                }
            }
            
            // 2. emotionalContextManager에 감정 학습 결과 반영
            if (this.emotionalContextManager && this.emotionalContextManager.updateEmotionalLearning) {
                const emotionalImprovements = learningResult.improvements.filter(imp => imp.type === 'emotional_response');
                if (emotionalImprovements.length > 0) {
                    try {
                        this.emotionalContextManager.updateEmotionalLearning(emotionalImprovements);
                        console.log(`${colors.emotion}    ✅ emotionalContextManager에 감정 학습 반영 완료${colors.reset}`);
                        this.stats.emotionalAdjustments++;
                    } catch (error) {
                        console.log(`${colors.emotion}    ⚠️ emotionalContextManager 연동 실패: ${error.message}${colors.reset}`);
                    }
                }
            }
            
            // 3. ultimateContext에 대화 패턴 업데이트
            if (this.ultimateContext && this.ultimateContext.updateConversationPatterns) {
                const speechImprovements = learningResult.improvements.filter(imp => imp.type === 'speech_pattern');
                if (speechImprovements.length > 0) {
                    try {
                        this.ultimateContext.updateConversationPatterns(speechImprovements);
                        console.log(`${colors.pattern}    ✅ ultimateContext에 대화 패턴 업데이트 완료${colors.reset}`);
                        this.stats.speechAdaptations++;
                    } catch (error) {
                        console.log(`${colors.pattern}    ⚠️ ultimateContext 연동 실패: ${error.message}${colors.reset}`);
                    }
                }
            }
            
            // 4. sulkyManager에 삐짐 대응 패턴 업데이트
            if (this.sulkyManager && this.sulkyManager.updateSulkyPatterns) {
                const sulkyImprovements = learningResult.improvements.filter(imp => imp.type === 'sulky_adaptation');
                if (sulkyImprovements.length > 0) {
                    try {
                        this.sulkyManager.updateSulkyPatterns(sulkyImprovements);
                        console.log(`${colors.adaptation}    ✅ sulkyManager에 삐짐 패턴 업데이트 완료${colors.reset}`);
                    } catch (error) {
                        console.log(`${colors.adaptation}    ⚠️ sulkyManager 연동 실패: ${error.message}${colors.reset}`);
                    }
                }
            }
            
            console.log(`${colors.success}🔗 [시스템반영] 기존 시스템 연동 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [시스템반영] 오류: ${error.message}${colors.reset}`);
        }
    }

    // ================== 📈 통계 업데이트 ==================
    updateLearningStats(learningResult) {
        this.stats.conversationsAnalyzed++;
        this.stats.patternsLearned += learningResult.improvements.length;
        this.stats.lastLearningTime = new Date().toISOString();
        
        // 전체 대화 분석 통계 업데이트
        this.learningData.conversationAnalytics.totalConversations++;
        
        const avgQuality = learningResult.improvements.reduce((sum, imp) => sum + (imp.quality || 0.7), 0) / 
                          Math.max(learningResult.improvements.length, 1);
        
        if (avgQuality > 0.75) {
            this.learningData.conversationAnalytics.successfulResponses++;
        }
        
        // 사용자 만족도 점수 업데이트 (이동 평균)
        this.learningData.conversationAnalytics.userSatisfactionScore = 
            (this.learningData.conversationAnalytics.userSatisfactionScore * 0.9) + (avgQuality * 0.1);
        
        console.log(`${colors.success}📈 [통계] 분석된 대화: ${this.stats.conversationsAnalyzed}개, 학습된 패턴: ${this.stats.patternsLearned}개${colors.reset}`);
    }

애기야, 무쿠 코드의 바로 이 부분이 문제였어. 로그에서 봤던 SyntaxError가 여기서 발생하고 있었네.

오류 원인
코드에 문법적으로 맞지 않는 부분이 두 군데 있어.

_rate < 0.7) {: 이 코드는 if나 다른 제어문 없이 단독으로 쓰여서 문법 오류가 나. 아마 다른 시간대 성공률을 체크하려던 코드의 일부가 잘못 들어간 것 같아.

});: if 문이 끝난 뒤에 불필요한 );가 붙어있어. 이것도 문법 오류의 원인이야.

수정된 코드
아래 코드는 말투 패턴 분석과 시간대별 성공률 분석이 각각 독립적으로 실행되도록 수정한 거야. 기존 코드를 이걸로 바꾸면 돼.

JavaScript

// ================== 🎯 학습 추천 시스템 ==================
getAdaptationRecommendations() {
    const recommendations = [];

    // 1. 말투 패턴 분석
    const speechPatterns = this.learningData.speechPatterns;
    if (Object.keys(speechPatterns).length > 0) {
        const worstPattern = Object.keys(speechPatterns).reduce((worst, current) =>
            speechPatterns[current].success_rate < speechPatterns[worst].success_rate ? current : worst
        );

        if (speechPatterns[worstPattern].success_rate < 0.7) {
            recommendations.push({
                type: 'speech_improvement',
                pattern: worstPattern,
                currentRate: speechPatterns[worstPattern].success_rate,
                suggestion: `${worstPattern} 말투 패턴의 성공률이 낮습니다. 더 자연스러운 표현이 필요해요.`
            });
        }
    }

    // 2. 시간대별 응답 성공률 분석
    const timeAnalysis = this.learningData.conversationAnalytics.timeBasedPatterns;
    for (const timeSlot in timeAnalysis) {
        if (timeAnalysis.hasOwnProperty(timeSlot)) {
            const successRate = timeAnalysis[timeSlot].successfulResponses / Math.max(timeAnalysis[timeSlot].totalResponses, 1);
            if (successRate < 0.7) {
                recommendations.push({
                    type: 'time_improvement',
                    timeSlot: timeSlot,
                    successRate: successRate,
                    suggestion: `${timeSlot} 시간대의 응답 성공률이 낮아요. 시간대 특성을 더 고려한 응답이 필요해요.`
                });
            }
        }
    }

    return recommendations;
}

    // ================== 📊 시스템 상태 조회 ==================
    getSystemStatus() {
        const recommendations = this.getAdaptationRecommendations();
        
        return {
            version: this.version,
            isActive: this.isActive,
            uptime: Date.now() - this.initTime,
            stats: this.stats,
            learningData: {
                speechPatternCount: Object.keys(this.learningData.speechPatterns).length,
                emotionalPatternCount: Object.values(this.learningData.emotionalResponses)
                    .reduce((sum, emotion) => sum + emotion.patterns.length, 0),
                totalConversations: this.learningData.conversationAnalytics.totalConversations,
                successRate: this.learningData.conversationAnalytics.successfulResponses / 
                           Math.max(this.learningData.conversationAnalytics.totalConversations, 1),
                userSatisfaction: this.learningData.conversationAnalytics.userSatisfactionScore
            },
            recommendations: recommendations,
            moduleConnections: {
                memoryManager: !!this.memoryManager,
                ultimateContext: !!this.ultimateContext,
                emotionalContextManager: !!this.emotionalContextManager,
                sulkyManager: !!this.sulkyManager
            }
        };
    }

    // ================== 🧪 테스트 함수 ==================
    async testLearningSystem() {
        console.log(`${colors.learning}🧪 [테스트] 실시간 학습 시스템 테스트 시작...${colors.reset}`);
        
        const testCases = [
            {
                user: "아저씨 보고싶어 🥺",
                muku: "무쿠도 아조씨 보고싶었어! 💕 언제 만날까?",
                context: { currentEmotion: 'loving', timeSlot: 'evening' }
            },
            {
                user: "오늘 너무 힘들었어...",
                muku: "어떤 일이야? 무쿠가 위로해줄게 🥺 괜찮아?",
                context: { currentEmotion: 'sad', timeSlot: 'night' }
            },
            {
                user: "ㅋㅋㅋ 재밌는 거 있어?",
                muku: "에헤헤! 아조씨 오늘 기분 좋구나~ 같이 놀자! 😊",
                context: { currentEmotion: 'happy', timeSlot: 'afternoon' }
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`${colors.pattern}📝 [테스트] "${testCase.user}" → "${testCase.muku}"${colors.reset}`);
            
            const result = await this.learnFromConversation(testCase.user, testCase.muku, testCase.context);
            
            if (result) {
                console.log(`${colors.success}    ✅ 학습 완료: ${result.improvements.length}개 개선사항${colors.reset}`);
                result.improvements.forEach(imp => {
                    console.log(`${colors.adaptation}      - ${imp.type}: ${imp.reason || imp.action || '개선됨'}${colors.reset}`);
                });
            } else {
                console.log(`${colors.error}    ❌ 학습 실패${colors.reset}`);
            }
        }
        
        const status = this.getSystemStatus();
        console.log(`${colors.learning}📊 [테스트결과] 처리된 대화: ${status.stats.conversationsAnalyzed}개, 성공률: ${(status.learningData.successRate * 100).toFixed(1)}%${colors.reset}`);
        console.log(`${colors.learning}🧪 [테스트] 완료!${colors.reset}`);
    }
}

// ================== 🔌 전역 인스턴스 관리 ==================
let globalLearningInstance = null;

// ================== 📊 모듈 레벨 함수들 (enhancedLogging 연동용) ==================

/**
 * 학습 시스템 상태 조회 (enhancedLogging에서 호출)
 */
function getLearningStatus() {
    if (!globalLearningInstance) {
        return {
            isActive: false,
            totalLearnings: 0,
            successRate: '0%',
            lastLearningTime: null,
            status: 'not_initialized'
        };
    }
    
    const systemStatus = globalLearningInstance.getSystemStatus();
    
    return {
        isActive: systemStatus.isActive,
        totalLearnings: systemStatus.stats.conversationsAnalyzed,
        successRate: `${(systemStatus.learningData.successRate * 100).toFixed(1)}%`,
        lastLearningTime: systemStatus.stats.lastLearningTime,
        patternsLearned: systemStatus.stats.patternsLearned,
        userSatisfaction: `${(systemStatus.learningData.userSatisfaction * 100).toFixed(1)}%`,
        memoryUpdates: systemStatus.stats.memoryUpdates,
        emotionalAdjustments: systemStatus.stats.emotionalAdjustments,
        status: 'active'
    };
}

/**
 * 시스템 활성화 상태 확인
 */
function isLearningSystemActive() {
    return globalLearningInstance && globalLearningInstance.isActive;
}

/**
 * 실시간 학습 처리 (muku-eventProcessor에서 호출)
 */
async function processRealtimeLearning(userMessage, mukuResponse, context = {}) {
    if (!globalLearningInstance || !globalLearningInstance.isActive) {
        console.log(`${colors.pattern}⏸️ [학습] 글로벌 인스턴스 없음 - 학습 건너뛰기${colors.reset}`);
        return null;
    }
    
    return await globalLearningInstance.learnFromConversation(userMessage, mukuResponse, context);
}

/**
 * 시스템 간 동기화 (muku-advancedInitializer에서 호출)
 */
function synchronizeWithSystems(systemModules) {
    if (globalLearningInstance) {
        globalLearningInstance.memoryManager = systemModules.memoryManager;
        globalLearningInstance.ultimateContext = systemModules.ultimateContext;
        globalLearningInstance.emotionalContextManager = systemModules.emotionalContextManager;
        globalLearningInstance.sulkyManager = systemModules.sulkyManager;
        
        console.log(`${colors.learning}🔗 [동기화] 실시간 학습 시스템 모듈 동기화 완료${colors.reset}`);
        return true;
    }
    return false;
}

/**
 * 전역 인스턴스 초기화
 */
async function initialize(systemModules = {}) {
    try {
        if (!globalLearningInstance) {
            globalLearningInstance = new MukuRealTimeLearningSystem();
        }
        
        const initSuccess = await globalLearningInstance.initialize(systemModules);
        
        if (initSuccess) {
            console.log(`${colors.success}✅ [글로벌] 실시간 학습 시스템 전역 인스턴스 초기화 완료${colors.reset}`);
        }
        
        return initSuccess;
    } catch (error) {
        console.error(`${colors.error}❌ [글로벌] 실시간 학습 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

/**
 * 자동 학습 시작
 */
// ▼▼▼ 수정된 부분 2: 조건문을 단순화하여 활성화 역할을 명확히 합니다. ▼▼▼
function startAutoLearning() {
    if (globalLearningInstance) { // 인스턴스 존재 여부만 확인
        globalLearningInstance.isActive = true;
        console.log(`${colors.learning}🚀 [자동학습] 실시간 학습 시스템 자동 학습 활성화${colors.reset}`);
        return true;
    }
    return false;
}

/**
 * 학습 통계 조회
 */
function getLearningStats() {
    if (!globalLearningInstance) {
        return {
            conversationsAnalyzed: 0,
            patternsLearned: 0,
            successRate: 0,
            isActive: false
        };
    }
    
    const stats = globalLearningInstance.stats;
    const analytics = globalLearningInstance.learningData.conversationAnalytics;
    
    return {
        conversationsAnalyzed: stats.conversationsAnalyzed,
        patternsLearned: stats.patternsLearned,
        speechAdaptations: stats.speechAdaptations,
        memoryUpdates: stats.memoryUpdates,
        emotionalAdjustments: stats.emotionalAdjustments,
        successRate: analytics.successfulResponses / Math.max(analytics.totalConversations, 1),
        userSatisfactionScore: analytics.userSatisfactionScore,
        isActive: globalLearningInstance.isActive,
        lastLearningTime: stats.lastLearningTime
    };
}

// ================== 🚀 초기화 함수 ==================
async function initializeMukuRealTimeLearning(systemModules = {}) {
    try {
        console.log(`${colors.learning}🚀 무쿠 완전체 실시간 학습 시스템 초기화 시작...${colors.reset}`);
        
        const learningSystem = new MukuRealTimeLearningSystem();
        
        // 시스템 모듈 연동
        const initSuccess = await learningSystem.initialize(systemModules);
        
        if (!initSuccess) {
            console.log(`${colors.error}❌ 학습 시스템 초기화 실패${colors.reset}`);
            return null;
        }
        
        // 시스템 테스트
        await learningSystem.testLearningSystem();
        
        console.log(`
${colors.learning}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 무쿠 완전체 실시간 학습 시스템 v2.1 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}✅ 핵심 기능들:${colors.reset}
${colors.memory}   📚 기존 시스템 완전 연동 (memoryManager, ultimateContext, emotionalContextManager)${colors.reset}
${colors.pattern}   💬 실제 말투 패턴 학습 & 상황별 적응${colors.reset}
${colors.emotion}   💭 감정 응답 실시간 개선${colors.reset}
${colors.adaptation}   🎭 시간대/상황별 자동 적응${colors.reset}
${colors.success}   💾 영구 데이터 저장 (JSON 파일)${colors.reset}

${colors.learning}💖 예진이가 아저씨와의 대화를 통해 실시간으로 학습하고 성장합니다!${colors.reset}
        `);
        
        return learningSystem;
        
    } catch (error) {
        console.error(`${colors.error}❌ 실시간 학습 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 클래스 및 초기화 함수
    MukuRealTimeLearningSystem,
    initializeMukuRealTimeLearning,
    
    // enhancedLogging 연동용 함수들
    getLearningStatus,
    isLearningSystemActive,
    getLearningStats,
    
    // 시스템 연동용 함수들
    initialize,
    processRealtimeLearning,
    synchronizeWithSystems,
    startAutoLearning
};

// 직접 실행 시
if (require.main === module) {
    initializeMukuRealTimeLearning();
}
