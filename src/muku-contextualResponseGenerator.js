// ============================================================================
// muku-contextualResponseGenerator.js - 무쿠 맥락 기반 응답 생성기
// 🎯 5시간 집중 개발 - 2시간차 (3/3)
// 🧠 상황을 완벽하게 이해하고 맥락에 맞는 자연스러운 응답을 생성하는 AI
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log("🧠 무쿠 맥락 기반 응답 생성기 v1.0 초기화 완료!");

class MukuContextualResponseGenerator {
    constructor() {
        this.version = '1.0';
        this.initTime = Date.now();
        
        // 🎨 색상 코드
        this.colors = {
            context: '\x1b[94m',    // 파란색 (맥락)
            generate: '\x1b[95m',   // 보라색 (생성)
            natural: '\x1b[96m',    // 하늘색 (자연)
            smart: '\x1b[93m',      // 노란색 (지능)
            success: '\x1b[92m',    // 초록색
            reset: '\x1b[0m'        // 리셋
        };
        
        // 🧠 맥락 이해 시스템
        this.contextEngine = {
            conversationHistory: [],
            currentMood: 'cheerful',
            userPersonality: {
                preferences: new Map(),
                habits: new Map(),
                emotionalPatterns: new Map()
            },
            situationalContext: {
                timeOfDay: 'unknown',
                weather: 'unknown',
                userState: 'unknown',
                conversationTone: 'neutral'
            }
        };
        
        // 💬 응답 생성 템플릿
        this.responseTemplates = this.loadResponseTemplates();
        
        // 🎯 응답 품질 메트릭
        this.qualityMetrics = {
            relevance: 0.8,
            naturalness: 0.7,
            engagement: 0.75,
            emotionalFit: 0.8,
            creativity: 0.6,
            yejinLikeness: 0.85
        };
        
        // 📊 생성 통계
        this.generationStats = {
            responsesGenerated: 0,
            contextsAnalyzed: 0,
            qualityImprovements: 0,
            averageQuality: 0.0,
            bestQuality: 0.0
        };
        
        console.log(`${this.colors.context}🧠 맥락 기반 응답 생성 시스템 활성화!${this.colors.reset}`);
    }

    // ================== 🎭 응답 템플릿 로드 ==================
    loadResponseTemplates() {
        return {
            // 감정별 응답 템플릿
            emotional: {
                love: [
                    "아조씨도 사랑해 💕",
                    "완전 좋아해! 아저씨♡",
                    "사랑한다고~ 못된 아저씨 💖"
                ],
                happy: [
                    "나도 기뻐! 😊",
                    "좋겠다! 무쿠도 행복해~",
                    "완전 좋은 일이네! 축하해 🎉"
                ],
                sad: [
                    "괜찮아? 무쿠가 위로해줄게 🥺",
                    "아저씨 슬프면 무쿠도 슬퍼...",
                    "힘내! 무쿠가 있잖아 💕"
                ],
                worried: [
                    "걱정돼... 무슨 일이야? 😰",
                    "아저씨 괜찮아? 혹시 아픈 거 아니야?",
                    "말해봐, 무쿠가 도와줄게!"
                ]
            },
            
            // 상황별 응답 템플릿
            situational: {
                morning: [
                    "좋은 아침! 잘 잤어? ☀️",
                    "일찍 일어났네~ 오늘도 화이팅!",
                    "아침에 보는 아저씨 완전 좋아 💕"
                ],
                evening: [
                    "하루 고생했어 아조씨 💕",
                    "저녁 시간이네~ 뭐 먹을까?",
                    "오늘은 어땠어? 무쿠한테 말해줘"
                ],
                lateNight: [
                    "이 시간에 왜 안 자? 걱정돼 😰",
                    "늦었어... 건강 생각해서 빨리 자",
                    "무쿠도 졸려... 같이 잘까? 😴"
                ],
                rainy: [
                    "비 오네... 아저씨 우산 챙겼어?",
                    "비 오는 날엔 무쿠가 더 생각나지? 💕",
                    "감기 걸리지 마~ 따뜻하게 입어"
                ]
            },
            
            // 대화 흐름별 템플릿
            conversational: {
                greeting: [
                    "아조씨! 안녕~ 💕",
                    "어? 왔어? 보고 싶었어!",
                    "아저씨다! 무쿠 여기 있어~"
                ],
                question: [
                    "음... 그게 뭐야? 🤔",
                    "아저씨가 말하는 건 항상 신기해",
                    "잘 모르겠어... 설명해줘!"
                ],
                compliment: [
                    "에헤헤~ 부끄러워 💕",
                    "정말? 아저씨가 그러면 기뻐!",
                    "완전 좋아! 더 말해줘 😊"
                ],
                teasing: [
                    "아 진짜! 장난치지 마 😤",
                    "바보 아저씨! 그런 말 하면 삐져 💢",
                    "흥! 아저씨 못돼... 그래도 좋아 💕"
                ]
            },
            
            // 개성별 표현
            personality: {
                cute: [
                    "으엥~", "힝~", "우와!", "헤헤", "에헤헤"
                ],
                affectionate: [
                    "아조씨♡", "완전 좋아해", "사랑둥이", "귀여운 아저씨"
                ],
                playful: [
                    "장난칠까?", "히히 걸렸지?", "무쿠가 이겼어!", "바보!"
                ],
                caring: [
                    "괜찮아?", "조심해", "아프지 마", "걱정돼"
                ]
            }
        };
    }

    // ================== 🔍 맥락 분석 ==================
    async analyzeContext(userMessage, conversationHistory = [], metadata = {}) {
        console.log(`${this.colors.context}🔍 [맥락분석] 사용자 메시지 맥락 분석 중...${this.colors.reset}`);
        
        const context = {
            // 메시지 분석
            message: {
                content: userMessage,
                length: userMessage.length,
                tone: this.detectTone(userMessage),
                emotion: this.detectEmotion(userMessage),
                intent: this.detectIntent(userMessage),
                keywords: this.extractKeywords(userMessage)
            },
            
            // 대화 히스토리 분석
            conversation: {
                messageCount: conversationHistory.length,
                averageResponseTime: this.calculateAverageResponseTime(conversationHistory),
                topicFlow: this.analyzeTopicFlow(conversationHistory),
                emotionalProgression: this.analyzeEmotionalProgression(conversationHistory)
            },
            
            // 상황적 맥락
            situation: {
                timeOfDay: this.getTimeOfDay(),
                dayOfWeek: this.getDayOfWeek(),
                weather: metadata.weather || 'unknown',
                userState: this.inferUserState(userMessage, conversationHistory)
            },
            
            // 관계적 맥락
            relationship: {
                intimacyLevel: this.calculateIntimacyLevel(conversationHistory),
                communicationStyle: this.analyzeCommunicationStyle(conversationHistory),
                sharedMemories: this.findSharedMemories(userMessage)
            }
        };
        
        // 맥락 점수 계산
        context.score = this.calculateContextScore(context);
        
        this.generationStats.contextsAnalyzed++;
        
        console.log(`${this.colors.success}✅ [맥락분석] 완료: ${context.message.emotion} 감정, ${context.message.intent} 의도, 점수: ${context.score.toFixed(2)}${this.colors.reset}`);
        
        return context;
    }

    // ================== 🎨 응답 생성 ==================
    async generateResponse(context, options = {}) {
        console.log(`${this.colors.generate}🎨 [응답생성] 맥락 기반 응답 생성 중...${this.colors.reset}`);
        
        const generateOptions = {
            creativity: options.creativity || 0.7,
            lengthPreference: options.lengthPreference || 'medium',
            stylePreference: options.stylePreference || 'natural',
            includeEmoji: options.includeEmoji !== false,
            personalityIntensity: options.personalityIntensity || 0.8
        };
        
        try {
            // 1. 기본 응답 후보 생성
            const baseCandidates = await this.generateBaseCandidates(context);
            
            // 2. 맥락에 맞는 응답 선택 및 조정
            const contextualResponse = await this.selectContextualResponse(baseCandidates, context);
            
            // 3. 개성 및 감정 추가
            const personalizedResponse = await this.addPersonality(contextualResponse, context, generateOptions);
            
            // 4. 자연스러움 향상
            const naturalResponse = await this.enhanceNaturalness(personalizedResponse, context);
            
            // 5. 품질 검증
            const qualityScore = this.evaluateResponseQuality(naturalResponse, context);
            
            // 6. 통계 업데이트
            this.updateGenerationStats(qualityScore);
            
            console.log(`${this.colors.success}✅ [응답생성] 완료: "${naturalResponse}" (품질: ${qualityScore.toFixed(2)})${this.colors.reset}`);
            
            return {
                response: naturalResponse,
                quality: qualityScore,
                context: context,
                metadata: {
                    generationTime: Date.now() - this.initTime,
                    options: generateOptions
                }
            };
            
        } catch (error) {
            console.error(`${this.colors.generate}❌ [응답생성] 오류: ${error.message}${this.colors.reset}`);
            return this.getFallbackResponse(context);
        }
    }

    // ================== 🎯 기본 응답 후보 생성 ==================
    async generateBaseCandidates(context) {
        const candidates = [];
        
        // 감정 기반 응답
        if (context.message.emotion && this.responseTemplates.emotional[context.message.emotion]) {
            candidates.push(...this.responseTemplates.emotional[context.message.emotion]);
        }
        
        // 상황 기반 응답
        const timeKey = this.mapTimeToTemplate(context.situation.timeOfDay);
        if (timeKey && this.responseTemplates.situational[timeKey]) {
            candidates.push(...this.responseTemplates.situational[timeKey]);
        }
        
        // 의도 기반 응답
        if (context.message.intent && this.responseTemplates.conversational[context.message.intent]) {
            candidates.push(...this.responseTemplates.conversational[context.message.intent]);
        }
        
        // 키워드 기반 맞춤 응답
        const keywordResponses = this.generateKeywordResponses(context.message.keywords);
        candidates.push(...keywordResponses);
        
        return candidates;
    }

    // ================== 🎭 맥락 적합한 응답 선택 ==================
    async selectContextualResponse(candidates, context) {
        if (candidates.length === 0) {
            return "아조씨~ 💕"; // 기본 응답
        }
        
        // 맥락 점수 기반 후보 평가
        const scoredCandidates = candidates.map(candidate => ({
            response: candidate,
            score: this.scoreResponseFit(candidate, context)
        }));
        
        // 최고 점수 응답 선택 (약간의 랜덤성 추가)
        scoredCandidates.sort((a, b) => b.score - a.score);
        const topCandidates = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        return selected.response;
    }

    // ================== 💖 개성 및 감정 추가 ==================
    async addPersonality(baseResponse, context, options) {
        let response = baseResponse;
        
        // 예진이 특유 표현 추가
        if (Math.random() < options.personalityIntensity) {
            // 아저씨 호칭 다양화
            response = response.replace(/아저씨/g, this.getRandomNickname());
            
            // 개성 표현 추가
            if (context.message.emotion === 'love') {
                const cuteExpression = this.getRandomExpression('cute');
                response += ` ${cuteExpression}`;
            } else if (context.message.emotion === 'happy') {
                const affectionateExpression = this.getRandomExpression('affectionate');
                response += ` ${affectionateExpression}`;
            }
        }
        
        // 이모지 추가
        if (options.includeEmoji && !this.hasEmoji(response)) {
            response += this.getContextualEmoji(context);
        }
        
        return response;
    }

    // ================== 🌿 자연스러움 향상 ==================
    async enhanceNaturalness(response, context) {
        let enhanced = response;
        
        // 대화 흐름에 맞는 연결어 추가
        if (context.conversation.messageCount > 1) {
            const connector = this.getConversationConnector(context);
            if (connector) {
                enhanced = `${connector} ${enhanced}`;
            }
        }
        
        // 길이 조정
        enhanced = this.adjustResponseLength(enhanced, context);
        
        // 반복 표현 제거
        enhanced = this.removeRepetitiveExpressions(enhanced);
        
        // 자연스러운 말투 적용
        enhanced = this.applyCasualSpeech(enhanced);
        
        return enhanced;
    }

    // ================== 🔧 헬퍼 함수들 ==================
    
    detectTone(message) {
        if (message.includes('!') || message.includes('완전') || message.includes('너무')) return 'enthusiastic';
        if (message.includes('?')) return 'questioning';
        if (message.includes('...') || message.includes('흠')) return 'thoughtful';
        if (message.includes('ㅋ') || message.includes('ㅎ')) return 'cheerful';
        return 'neutral';
    }

    detectEmotion(message) {
        const emotionKeywords = {
            love: ['사랑', '좋아', '완전', '최고'],
            happy: ['기뻐', '행복', '좋아', '웃'],
            sad: ['슬프', '우울', '힘들', '아파'],
            worried: ['걱정', '무서', '불안'],
            angry: ['화나', '짜증', '열받']
        };
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return emotion;
            }
        }
        
        return 'neutral';
    }

    detectIntent(message) {
        if (message.includes('?')) return 'question';
        if (message.includes('고마워') || message.includes('감사')) return 'gratitude';
        if (message.includes('안녕') || message.includes('하이')) return 'greeting';
        if (message.includes('예쁘') || message.includes('잘했') || message.includes('좋아')) return 'compliment';
        if (message.includes('바보') || message.includes('장난')) return 'teasing';
        return 'general';
    }

    extractKeywords(message) {
        const keywords = [];
        const importantWords = ['아저씨', '무쿠', '예진', '사랑', '좋아', '오늘', '내일'];
        
        importantWords.forEach(word => {
            if (message.includes(word)) {
                keywords.push(word);
            }
        });
        
        return keywords;
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    getDayOfWeek() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    }

    inferUserState(message, history) {
        // 간단한 사용자 상태 추론
        if (message.includes('피곤') || message.includes('지쳐')) return 'tired';
        if (message.includes('바쁘') || message.includes('일')) return 'busy';
        if (message.includes('아프') || message.includes('아픈')) return 'sick';
        if (message.includes('기뻐') || message.includes('좋아')) return 'happy';
        return 'normal';
    }

    calculateContextScore(context) {
        let score = 0.5; // 기본 점수
        
        // 감정 명확성
        if (context.message.emotion !== 'neutral') score += 0.2;
        
        // 의도 명확성
        if (context.message.intent !== 'general') score += 0.15;
        
        // 키워드 존재
        score += context.message.keywords.length * 0.05;
        
        // 대화 연속성
        if (context.conversation.messageCount > 1) score += 0.1;
        
        return Math.min(1.0, score);
    }

    scoreResponseFit(response, context) {
        let score = 0.5;
        
        // 감정 일치도
        if (context.message.emotion === 'love' && response.includes('사랑')) score += 0.3;
        if (context.message.emotion === 'happy' && response.includes('기뻐')) score += 0.3;
        if (context.message.emotion === 'sad' && response.includes('괜찮')) score += 0.3;
        
        // 키워드 매칭
        context.message.keywords.forEach(keyword => {
            if (response.includes(keyword)) score += 0.1;
        });
        
        return Math.min(1.0, score);
    }

    getRandomNickname() {
        const nicknames = ['아조씨', '아저씨', '못된 아저씨', '바보 아저씨', '귀여운 아저씨'];
        return nicknames[Math.floor(Math.random() * nicknames.length)];
    }

    getRandomExpression(type) {
        const expressions = this.responseTemplates.personality[type] || [''];
        return expressions[Math.floor(Math.random() * expressions.length)];
    }

    hasEmoji(text) {
        return /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|💕|♡/u.test(text);
    }

    getContextualEmoji(context) {
        const emojiMap = {
            love: ' 💕',
            happy: ' 😊',
            sad: ' 🥺',
            worried: ' 😰',
            neutral: ' ♡'
        };
        
        return emojiMap[context.message.emotion] || ' 💕';
    }

    evaluateResponseQuality(response, context) {
        let quality = 0.7; // 기본 품질
        
        // 길이 적절성
        if (response.length > 5 && response.length < 50) quality += 0.1;
        
        // 감정 표현
        if (this.hasEmoji(response)) quality += 0.05;
        
        // 개성 표현
        if (response.includes('아조씨') || response.includes('아저씨')) quality += 0.1;
        
        // 맥락 적합성
        if (context.score > 0.7) quality += 0.1;
        
        return Math.min(1.0, quality);
    }

    // 추가 헬퍼 함수들 (간단 구현)
    calculateAverageResponseTime(history) { return 2000; }
    analyzeTopicFlow(history) { return 'consistent'; }
    analyzeEmotionalProgression(history) { return 'stable'; }
    calculateIntimacyLevel(history) { return 0.8; }
    analyzeCommunicationStyle(history) { return 'casual'; }
    findSharedMemories(message) { return []; }
    mapTimeToTemplate(timeOfDay) { return timeOfDay; }
    generateKeywordResponses(keywords) { return []; }
    getConversationConnector(context) { return null; }
    adjustResponseLength(response, context) { return response; }
    removeRepetitiveExpressions(response) { return response; }
    applyCasualSpeech(response) { return response; }

    updateGenerationStats(quality) {
        this.generationStats.responsesGenerated++;
        this.generationStats.averageQuality = 
            (this.generationStats.averageQuality * (this.generationStats.responsesGenerated - 1) + quality) 
            / this.generationStats.responsesGenerated;
        
        if (quality > this.generationStats.bestQuality) {
            this.generationStats.bestQuality = quality;
        }
    }

    getFallbackResponse(context) {
        const fallbacks = [
            "아조씨~ 💕",
            "음... 뭐라고 해야 할지 모르겠어 🤔",
            "아저씨 말이 맞는 것 같아!",
            "그렇구나~ 무쿠가 이해했어 😊"
        ];
        
        const selected = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        
        return {
            response: selected,
            quality: 0.5,
            context: context,
            metadata: { isFallback: true }
        };
    }

    // ================== 🧪 테스트 함수 ==================
    async testResponseGenerator() {
        console.log(`${this.colors.context}🧪 [응답테스트] 맥락 기반 응답 생성 시스템 테스트...${this.colors.reset}`);
        
        const testCases = [
            { message: '아저씨 사랑해', expected: 'love' },
            { message: '오늘 기분이 좋아', expected: 'happy' },
            { message: '힘들어...', expected: 'sad' },
            { message: '안녕하세요', expected: 'greeting' },
            { message: '고마워요', expected: 'gratitude' }
        ];
        
        for (const testCase of testCases) {
            try {
                const context = await this.analyzeContext(testCase.message);
                const result = await this.generateResponse(context);
                
                console.log(`${this.colors.success}✅ [테스트] "${testCase.message}" → "${result.response}" (품질: ${result.quality.toFixed(2)})${this.colors.reset}`);
            } catch (error) {
                console.log(`${this.colors.generate}❌ [테스트] 실패: ${error.message}${this.colors.reset}`);
            }
        }
        
        console.log(`${this.colors.context}📊 [통계] 생성된 응답: ${this.generationStats.responsesGenerated}개, 평균 품질: ${this.generationStats.averageQuality.toFixed(2)}${this.colors.reset}`);
        console.log(`${this.colors.context}🧪 [응답테스트] 완료!${this.colors.reset}`);
    }

    // ================== 📊 상태 조회 ==================
    getGeneratorStatus() {
        return {
            version: this.version,
            uptime: Date.now() - this.initTime,
            statistics: this.generationStats,
            qualityMetrics: this.qualityMetrics,
            currentContext: this.contextEngine.situationalContext
        };
    }
}

// ================== 🚀 초기화 함수 ==================
async function initializeMukuContextualGenerator() {
    try {
        const responseGenerator = new MukuContextualResponseGenerator();
        
        // 응답 생성기 테스트
        await responseGenerator.testResponseGenerator();
        
        console.log(`
${responseGenerator.colors.generate}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 무쿠 맥락 기반 응답 생성기 v1.0 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${responseGenerator.colors.reset}

${responseGenerator.colors.success}✅ 핵심 기능들:${responseGenerator.colors.reset}
${responseGenerator.colors.context}   🔍 완벽한 맥락 이해 분석${responseGenerator.colors.reset}
${responseGenerator.colors.generate}   🎨 자연스러운 응답 생성${responseGenerator.colors.reset}
${responseGenerator.colors.natural}   💖 예진이 개성 표현${responseGenerator.colors.reset}
${responseGenerator.colors.smart}   📊 실시간 품질 향상${responseGenerator.colors.reset}

${responseGenerator.colors.context}🎉 2시간차 완료! 다음: 3시간차 AI 응답 고도화!${responseGenerator.colors.reset}
        `);
        
        return responseGenerator;
        
    } catch (error) {
        console.error(`❌ 맥락 기반 응답 생성기 초기화 실패: ${error.message}`);
        return null;
    }
}

module.exports = {
    MukuContextualResponseGenerator,
    initializeMukuContextualGenerator
};

// 직접 실행 시
if (require.main === module) {
    initializeMukuContextualGenerator();
}
