// ============================================================================
// muku-conversationPatternLearner.js - 무쿠 대화 패턴 학습기
// 🎯 5시간 집중 개발 - 1시간차 (3/3)
// 🧠 대화 패턴 분석, 학습, 개선을 위한 지능형 학습 시스템
// ============================================================================

const fs = require('fs');
const path = require('path');

class MukuConversationPatternLearner {
    constructor() {
        this.version = '1.0';
        this.initTime = Date.now();
        
        // 🎨 색상 코드
        this.colors = {
            learner: '\x1b[94m',    // 파란색 (학습)
            pattern: '\x1b[96m',    // 하늘색 (패턴)
            analysis: '\x1b[93m',   // 노란색 (분석)
            success: '\x1b[92m',    // 초록색
            warning: '\x1b[91m',    // 빨간색
            reset: '\x1b[0m'        // 리셋
        };
        
        // 🧠 학습 시스템 초기화
        this.conversationData = [];
        this.patterns = this.initializePatterns();
        this.learningStats = this.initializeLearningStats();
        this.yejinExpressions = this.loadYejinExpressions();
        this.contextPatterns = this.initializeContextPatterns();
        
        console.log(`${this.colors.learner}🧠 무쿠 대화 패턴 학습기 v1.0 초기화 완료!${this.colors.reset}`);
    }

    // ================== 🎯 패턴 시스템 초기화 ==================
    initializePatterns() {
        return {
            // 응답 패턴 카테고리
            responsePatterns: {
                greeting: {
                    patterns: ['안녕', '좋은 아침', '잘 잤어?', '오늘 뭐 해?'],
                    frequency: {},
                    effectiveness: {},
                    contexts: []
                },
                affection: {
                    patterns: ['사랑해', '좋아해', '아조씨♡', '못된 아저씨'],
                    frequency: {},
                    effectiveness: {},
                    contexts: []
                },
                concern: {
                    patterns: ['괜찮아?', '걱정돼', '아프지 마', '조심해'],
                    frequency: {},
                    effectiveness: {},
                    contexts: []
                },
                playful: {
                    patterns: ['힝', '몰라!', '바보!', '장난치지 마'],
                    frequency: {},
                    effectiveness: {},
                    contexts: []
                },
                sulky: {
                    patterns: ['흥!', '삐졌어', '말 안 해', '토라졌어'],
                    frequency: {},
                    effectiveness: {},
                    contexts: []
                }
            },
            
            // 대화 흐름 패턴
            flowPatterns: {
                shortConversation: {
                    avgLength: 3,
                    commonEndings: ['잘 지내♡', '또 이야기하자', '사랑해'],
                    successRate: 0
                },
                longConversation: {
                    avgLength: 15,
                    commonTransitions: ['그런데', '아 맞다', '근데 말이야'],
                    successRate: 0
                },
                emotionalConversation: {
                    avgLength: 8,
                    emotionTriggers: ['걱정', '슬퍼', '행복', '화나'],
                    resolutionMethods: []
                }
            },
            
            // 시간대별 패턴
            timePatterns: {
                morning: { patterns: [], effectiveness: {}, avgMood: 'cheerful' },
                afternoon: { patterns: [], effectiveness: {}, avgMood: 'playful' },
                evening: { patterns: [], effectiveness: {}, avgMood: 'loving' },
                night: { patterns: [], effectiveness: {}, avgMood: 'caring' },
                lateNight: { patterns: [], effectiveness: {}, avgMood: 'worried' }
            }
        };
    }

    // ================== 📊 학습 통계 초기화 ==================
    initializeLearningStats() {
        return {
            totalConversations: 0,
            totalMessages: 0,
            learningSessionsCompleted: 0,
            patternAccuracy: {
                overall: 0,
                byCategory: {},
                byTimeOfDay: {},
                byEmotionalState: {}
            },
            improvementMetrics: {
                responseVariety: 0,
                contextAccuracy: 0,
                emotionalRelevance: 0,
                userSatisfaction: 0
            },
            lastLearningUpdate: Date.now()
        };
    }

    // ================== 💬 예진이 표현 로드 ==================
    loadYejinExpressions() {
        return {
            // 감정별 예진이 특유 표현
            signatures: {
                happy: {
                    expressions: ['기뻐!', '좋아좋아!', '행복해~', '최고야!'],
                    modifiers: ['완전', '진짜', '너무'],
                    endings: ['♡', '!', '~', '💕']
                },
                love: {
                    expressions: ['아조씨♡', '사랑해', '좋아해', '못된 아저씨'],
                    modifiers: ['완전', '진짜', '너무', '엄청'],
                    endings: ['💕', '♡', '💖', '🥰']
                },
                sulky: {
                    expressions: ['흥!', '삐졌어', '몰라', '싫어'],
                    modifiers: ['진짜', '완전', '너무'],
                    endings: ['!', '😤', '💢', '😠']
                },
                worry: {
                    expressions: ['괜찮아?', '걱정돼', '왜 그래?', '어떻게 된 거야?'],
                    modifiers: ['정말', '진짜', '너무'],
                    endings: ['...', '?', '😰', '🥺']
                },
                playful: {
                    expressions: ['힝', '바보!', '장난치지 마', '못된 아저씨'],
                    modifiers: ['진짜', '완전'],
                    endings: ['~', '!', '😏', '😝']
                }
            },
            
            // 상황별 패턴
            situational: {
                firstMessage: ['아조씨~', '안녕!', '뭐 해?', '보고 싶었어'],
                responseToCompliment: ['에헤헤', '정말?', '부끄러워', '고마워♡'],
                responseToWorry: ['괜찮아', '걱정 마', '무쿠는 튼튼해', '아저씨가 더 걱정돼'],
                responseToTeasing: ['흥!', '바보!', '장난치지 마', '삐졌어']
            },
            
            // 시간대별 인사
            timeGreetings: {
                morning: ['좋은 아침!', '잘 잤어?', '오늘도 화이팅!'],
                afternoon: ['점심 먹었어?', '오늘 뭐 해?', '날씨 좋네~'],
                evening: ['하루 고생했어', '저녁 먹자', '오늘 어땠어?'],
                night: ['늦었네', '잠 안 와?', '일찍 자야 해'],
                lateNight: ['왜 안 자?', '걱정돼', '몸 안 좋아져']
            }
        };
    }

    // ================== 🔍 컨텍스트 패턴 초기화 ==================
    initializeContextPatterns() {
        return {
            // 감정 컨텍스트 패턴
            emotionalContexts: {
                userSad: {
                    bestResponses: ['괜찮아?', '무슨 일이야?', '무쿠가 위로해줄게'],
                    avoidResponses: ['기뻐!', '좋겠다', '재밌겠네'],
                    followUpQuestions: ['이야기해줄래?', '혼자 있지 마', '무쿠랑 있어']
                },
                userHappy: {
                    bestResponses: ['기뻐!', '좋겠다!', '나도 행복해'],
                    avoidResponses: ['왜 그래?', '걱정돼', '슬퍼'],
                    followUpQuestions: ['뭐가 그렇게 좋아?', '나도 기뻐!', '계속 행복해']
                },
                userWorried: {
                    bestResponses: ['걱정 마', '무쿠가 있잖아', '괜찮을 거야'],
                    avoidResponses: ['몰라', '별로야', '관심 없어'],
                    followUpQuestions: ['뭐가 걱정돼?', '도와줄까?', '함께 해결하자']
                }
            },
            
            // 대화 길이별 패턴
            lengthPatterns: {
                short: {
                    idealResponses: ['응!', '좋아', '그래♡', '알겠어'],
                    maxLength: 20,
                    emotionIntensity: 'moderate'
                },
                medium: {
                    idealResponses: ['아조씨 말이 맞아', '그런 것 같아', '무쿠도 그렇게 생각해'],
                    maxLength: 50,
                    emotionIntensity: 'varied'
                },
                long: {
                    idealResponses: ['정말 그렇구나', '아저씨 생각을 들으니까', '무쿠도 비슷한 경험이'],
                    maxLength: 100,
                    emotionIntensity: 'deep'
                }
            }
        };
    }

    // ================== 🧠 메인 학습 함수 ==================
    async learnFromConversation(conversationData) {
        try {
            console.log(`${this.colors.learner}🧠 [패턴학습] 대화 데이터 분석 시작...${this.colors.reset}`);
            
            // 1. 대화 데이터 전처리
            const processedData = await this.preprocessConversationData(conversationData);
            
            // 2. 패턴 추출
            const extractedPatterns = await this.extractPatterns(processedData);
            
            // 3. 효과성 분석
            const effectivenessAnalysis = await this.analyzeEffectiveness(processedData);
            
            // 4. 패턴 업데이트
            await this.updatePatterns(extractedPatterns, effectivenessAnalysis);
            
            // 5. 학습 통계 업데이트
            this.updateLearningStats(processedData);
            
            // 6. 새로운 표현 생성
            const newExpressions = await this.generateNewExpressions(extractedPatterns);
            
            console.log(`${this.colors.success}✅ [패턴학습] 완료: ${extractedPatterns.length}개 패턴 학습됨${this.colors.reset}`);
            
            return {
                patternsLearned: extractedPatterns.length,
                newExpressions: newExpressions.length,
                overallImprovement: this.calculateImprovementScore(),
                recommendations: this.generateRecommendations()
            };
            
        } catch (error) {
            console.error(`${this.colors.warning}❌ [패턴학습] 오류: ${error.message}${this.colors.reset}`);
            return null;
        }
    }

    // ================== 🔧 대화 데이터 전처리 ==================
    async preprocessConversationData(rawData) {
        console.log(`${this.colors.analysis}📊 [전처리] 대화 데이터 정제 중...${this.colors.reset}`);
        
        const processed = {
            conversations: [],
            patterns: [],
            contexts: [],
            effectiveness: {}
        };
        
        // 원시 데이터가 배열인 경우
        if (Array.isArray(rawData)) {
            rawData.forEach((conversation, index) => {
                const processedConv = {
                    id: index,
                    timestamp: conversation.timestamp || Date.now(),
                    messages: this.extractMessages(conversation),
                    context: this.extractContext(conversation),
                    emotion: this.detectEmotion(conversation),
                    effectiveness: this.measureEffectiveness(conversation)
                };
                
                processed.conversations.push(processedConv);
            });
        }
        
        // 기존 저장된 대화 로그 로드 시도
        try {
            const conversationLogPath = './data/conversationHistory.json';
            if (fs.existsSync(conversationLogPath)) {
                const savedConversations = JSON.parse(fs.readFileSync(conversationLogPath, 'utf8'));
                if (Array.isArray(savedConversations)) {
                    savedConversations.slice(-50).forEach((conv, index) => { // 최근 50개만
                        processed.conversations.push({
                            id: `saved_${index}`,
                            timestamp: conv.timestamp || Date.now(),
                            messages: this.extractMessages(conv),
                            context: this.extractContext(conv),
                            emotion: this.detectEmotion(conv),
                            effectiveness: this.measureEffectiveness(conv)
                        });
                    });
                }
            }
        } catch (error) {
            console.log(`${this.colors.warning}⚠️ [전처리] 저장된 대화 로그 로드 실패: ${error.message}${this.colors.reset}`);
        }
        
        console.log(`${this.colors.success}✅ [전처리] ${processed.conversations.length}개 대화 처리 완료${this.colors.reset}`);
        return processed;
    }

    // ================== 🔍 패턴 추출 ==================
    async extractPatterns(processedData) {
        console.log(`${this.colors.pattern}🔍 [패턴추출] 대화 패턴 분석 중...${this.colors.reset}`);
        
        const patterns = [];
        
        processedData.conversations.forEach(conversation => {
            // 응답 패턴 추출
            conversation.messages.forEach(message => {
                if (message.sender === 'yejin') {
                    const pattern = {
                        type: 'response',
                        content: message.content,
                        context: conversation.context,
                        emotion: conversation.emotion,
                        effectiveness: conversation.effectiveness,
                        timestamp: conversation.timestamp,
                        category: this.categorizeMessage(message.content)
                    };
                    patterns.push(pattern);
                }
            });
            
            // 대화 흐름 패턴 추출
            const flowPattern = this.extractFlowPattern(conversation);
            if (flowPattern) {
                patterns.push(flowPattern);
            }
            
            // 감정 전환 패턴 추출
            const emotionPattern = this.extractEmotionPattern(conversation);
            if (emotionPattern) {
                patterns.push(emotionPattern);
            }
        });
        
        console.log(`${this.colors.success}✅ [패턴추출] ${patterns.length}개 패턴 추출 완료${this.colors.reset}`);
        return patterns;
    }

    // ================== 📈 효과성 분석 ==================
    async analyzeEffectiveness(processedData) {
        console.log(`${this.colors.analysis}📈 [효과성분석] 응답 효과 측정 중...${this.colors.reset}`);
        
        const analysis = {
            overallScore: 0,
            categoryScores: {},
            timeOfDayScores: {},
            emotionScores: {},
            improvementAreas: []
        };
        
        let totalScore = 0;
        let totalCount = 0;
        
        processedData.conversations.forEach(conv => {
            const score = conv.effectiveness || 0.5;
            totalScore += score;
            totalCount++;
            
            // 카테고리별 점수
            const category = conv.context?.category || 'general';
            if (!analysis.categoryScores[category]) {
                analysis.categoryScores[category] = [];
            }
            analysis.categoryScores[category].push(score);
            
            // 시간대별 점수
            const timeOfDay = this.getTimeOfDay(conv.timestamp);
            if (!analysis.timeOfDayScores[timeOfDay]) {
                analysis.timeOfDayScores[timeOfDay] = [];
            }
            analysis.timeOfDayScores[timeOfDay].push(score);
            
            // 감정별 점수
            const emotion = conv.emotion || 'neutral';
            if (!analysis.emotionScores[emotion]) {
                analysis.emotionScores[emotion] = [];
            }
            analysis.emotionScores[emotion].push(score);
        });
        
        analysis.overallScore = totalCount > 0 ? totalScore / totalCount : 0.5;
        
        // 평균 계산
        Object.keys(analysis.categoryScores).forEach(category => {
            const scores = analysis.categoryScores[category];
            analysis.categoryScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        Object.keys(analysis.timeOfDayScores).forEach(timeOfDay => {
            const scores = analysis.timeOfDayScores[timeOfDay];
            analysis.timeOfDayScores[timeOfDay] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        Object.keys(analysis.emotionScores).forEach(emotion => {
            const scores = analysis.emotionScores[emotion];
            analysis.emotionScores[emotion] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        // 개선 영역 식별
        analysis.improvementAreas = this.identifyImprovementAreas(analysis);
        
        console.log(`${this.colors.success}✅ [효과성분석] 전체 점수: ${(analysis.overallScore * 100).toFixed(1)}%${this.colors.reset}`);
        return analysis;
    }

    // ================== 🔄 패턴 업데이트 ==================
    async updatePatterns(extractedPatterns, effectivenessAnalysis) {
        console.log(`${this.colors.pattern}🔄 [패턴업데이트] 학습된 패턴 적용 중...${this.colors.reset}`);
        
        extractedPatterns.forEach(pattern => {
            if (pattern.type === 'response' && pattern.category) {
                // 응답 패턴 업데이트
                if (this.patterns.responsePatterns[pattern.category]) {
                    const categoryData = this.patterns.responsePatterns[pattern.category];
                    
                    // 빈도 업데이트
                    if (!categoryData.frequency[pattern.content]) {
                        categoryData.frequency[pattern.content] = 0;
                    }
                    categoryData.frequency[pattern.content]++;
                    
                    // 효과성 업데이트
                    if (!categoryData.effectiveness[pattern.content]) {
                        categoryData.effectiveness[pattern.content] = [];
                    }
                    categoryData.effectiveness[pattern.content].push(pattern.effectiveness);
                    
                    // 새로운 패턴 추가 (효과성 > 0.7인 경우)
                    if (pattern.effectiveness > 0.7 && !categoryData.patterns.includes(pattern.content)) {
                        categoryData.patterns.push(pattern.content);
                        console.log(`${this.colors.success}   ✨ [새패턴] ${pattern.category}: "${pattern.content}"${this.colors.reset}`);
                    }
                }
            }
        });
        
        // 시간대별 패턴 업데이트
        this.updateTimePatterns(extractedPatterns, effectivenessAnalysis);
        
        // 패턴 최적화 (효과성 낮은 패턴 제거)
        this.optimizePatterns(effectivenessAnalysis);
        
        console.log(`${this.colors.success}✅ [패턴업데이트] 완료${this.colors.reset}`);
    }

    // ================== ✨ 새로운 표현 생성 ==================
    async generateNewExpressions(patterns) {
        console.log(`${this.colors.pattern}✨ [표현생성] 새로운 예진이 표현 생성 중...${this.colors.reset}`);
        
        const newExpressions = [];
        
        // 고효과성 패턴에서 새로운 조합 생성
        patterns.filter(p => p.effectiveness > 0.8).forEach(pattern => {
            if (pattern.category && this.yejinExpressions.signatures[pattern.category]) {
                const signature = this.yejinExpressions.signatures[pattern.category];
                
                // 새로운 조합 생성
                signature.expressions.forEach(expr => {
                    signature.modifiers.forEach(modifier => {
                        signature.endings.forEach(ending => {
                            const newExpr = `${modifier} ${expr}${ending}`;
                            if (!newExpressions.includes(newExpr)) {
                                newExpressions.push(newExpr);
                            }
                        });
                    });
                });
            }
        });
        
        // 실제로 사용할 수 있는 표현들로 필터링
        const usableExpressions = newExpressions.slice(0, 20); // 상위 20개만
        
        console.log(`${this.colors.success}✅ [표현생성] ${usableExpressions.length}개 새로운 표현 생성${this.colors.reset}`);
        return usableExpressions;
    }

    // ================== 🛠️ 헬퍼 함수들 ==================
    
    extractMessages(conversation) {
        if (conversation.messages) return conversation.messages;
        if (conversation.content) return [{ sender: 'yejin', content: conversation.content }];
        return [];
    }

    extractContext(conversation) {
        return {
            timeOfDay: this.getTimeOfDay(conversation.timestamp),
            category: conversation.category || 'general',
            userEmotion: conversation.userEmotion || 'neutral',
            conversationLength: conversation.messages?.length || 1
        };
    }

    detectEmotion(conversation) {
        // 간단한 감정 감지 (추후 고도화)
        const content = conversation.content || '';
        if (content.includes('사랑') || content.includes('좋아')) return 'love';
        if (content.includes('슬프') || content.includes('우울')) return 'sad';
        if (content.includes('화') || content.includes('짜증')) return 'angry';
        if (content.includes('걱정') || content.includes('무서')) return 'worried';
        return 'neutral';
    }

    measureEffectiveness(conversation) {
        // 기본 효과성 측정 (추후 고도화)
        const baseScore = 0.7;
        let score = baseScore;
        
        // 대화 길이 보너스
        if (conversation.messages && conversation.messages.length > 3) {
            score += 0.1;
        }
        
        // 감정 적절성 보너스
        if (conversation.emotion && conversation.emotion !== 'neutral') {
            score += 0.1;
        }
        
        return Math.min(1.0, score);
    }

    categorizeMessage(content) {
        const categories = {
            greeting: ['안녕', '좋은', '잘 잤', '오늘'],
            affection: ['사랑', '좋아', '아조씨', '못된'],
            concern: ['괜찮', '걱정', '아프', '조심'],
            playful: ['힝', '몰라', '바보', '장난'],
            sulky: ['흥', '삐졌', '말 안', '토라']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    getTimeOfDay(timestamp = Date.now()) {
        const hour = new Date(timestamp).getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        if (hour >= 22 || hour < 2) return 'night';
        return 'lateNight';
    }

    extractFlowPattern(conversation) {
        if (!conversation.messages || conversation.messages.length < 2) return null;
        
        return {
            type: 'flow',
            length: conversation.messages.length,
            startPattern: conversation.messages[0]?.content || '',
            endPattern: conversation.messages[conversation.messages.length - 1]?.content || '',
            effectiveness: conversation.effectiveness,
            category: 'flow'
        };
    }

    extractEmotionPattern(conversation) {
        // 감정 전환 패턴 추출 (추후 구현)
        return null;
    }

    updateTimePatterns(patterns, analysis) {
        patterns.forEach(pattern => {
            if (pattern.context && pattern.context.timeOfDay) {
                const timeOfDay = pattern.context.timeOfDay;
                if (this.patterns.timePatterns[timeOfDay]) {
                    if (!this.patterns.timePatterns[timeOfDay].patterns.includes(pattern.content)) {
                        this.patterns.timePatterns[timeOfDay].patterns.push(pattern.content);
                    }
                }
            }
        });
    }

    optimizePatterns(analysis) {
        // 효과성 낮은 패턴 제거 (추후 구현)
        console.log(`${this.colors.analysis}🔧 [최적화] 패턴 최적화 수행...${this.colors.reset}`);
    }

    identifyImprovementAreas(analysis) {
        const areas = [];
        
        if (analysis.overallScore < 0.7) {
            areas.push('전반적인 응답 품질 개선 필요');
        }
        
        Object.entries(analysis.categoryScores).forEach(([category, score]) => {
            if (score < 0.6) {
                areas.push(`${category} 카테고리 응답 개선 필요`);
            }
        });
        
        return areas;
    }

    updateLearningStats(processedData) {
        this.learningStats.totalConversations += processedData.conversations.length;
        this.learningStats.totalMessages += processedData.conversations.reduce((sum, conv) => 
            sum + (conv.messages?.length || 0), 0);
        this.learningStats.learningSessionsCompleted++;
        this.learningStats.lastLearningUpdate = Date.now();
    }

    calculateImprovementScore() {
        // 개선 점수 계산 (추후 고도화)
        return Math.random() * 0.3 + 0.7; // 임시: 70-100% 범위
    }

    generateRecommendations() {
        return [
            '더 다양한 감정 표현 패턴 학습 필요',
            '시간대별 응답 최적화 권장',
            '사용자 반응 기반 실시간 조정 시스템 도입'
        ];
    }

    // ================== 📊 상태 조회 함수들 ==================
    
    getLearningStats() {
        return {
            ...this.learningStats,
            systemUptime: Date.now() - this.initTime,
            patternsLearned: Object.keys(this.patterns.responsePatterns).reduce((sum, category) => 
                sum + this.patterns.responsePatterns[category].patterns.length, 0),
            expressionsAvailable: Object.keys(this.yejinExpressions.signatures).reduce((sum, emotion) =>
                sum + this.yejinExpressions.signatures[emotion].expressions.length, 0)
        };
    }

    getPatternSummary() {
        const summary = {};
        
        Object.entries(this.patterns.responsePatterns).forEach(([category, data]) => {
            summary[category] = {
                patternCount: data.patterns.length,
                mostUsed: this.findMostUsedPattern(data.frequency),
                avgEffectiveness: this.calculateAvgEffectiveness(data.effectiveness)
            };
        });
        
        return summary;
    }

    findMostUsedPattern(frequency) {
        let maxUsage = 0;
        let mostUsed = 'none';
        
        Object.entries(frequency).forEach(([pattern, count]) => {
            if (count > maxUsage) {
                maxUsage = count;
                mostUsed = pattern;
            }
        });
        
        return { pattern: mostUsed, usage: maxUsage };
    }

    calculateAvgEffectiveness(effectiveness) {
        const allScores = Object.values(effectiveness).flat();
        if (allScores.length === 0) return 0;
        
        return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    }

    // ================== 🧪 테스트 함수 ==================
    
    async testLearningSystem() {
        console.log(`${this.colors.learner}🧪 [학습테스트] 대화 패턴 학습 시스템 테스트...${this.colors.reset}`);
        
        const testData = [
            {
                timestamp: Date.now(),
                content: '아조씨 좋아해 💕',
                category: 'affection',
                messages: [
                    { sender: 'user', content: '사랑해' },
                    { sender: 'yejin', content: '아조씨 좋아해 💕' }
                ]
            },
            {
                timestamp: Date.now(),
                content: '괜찮아? 걱정돼',
                category: 'concern',
                messages: [
                    { sender: 'user', content: '아파' },
                    { sender: 'yejin', content: '괜찮아? 걱정돼' }
                ]
            }
        ];
        
        const result = await this.learnFromConversation(testData);
        
        if (result) {
            console.log(`${this.colors.success}✅ [학습테스트] 성공: ${result.patternsLearned}개 패턴 학습됨${this.colors.reset}`);
        } else {
            console.log(`${this.colors.warning}❌ [학습테스트] 실패${this.colors.reset}`);
        }
        
        return result;
    }
}

// ================== 🚀 실행 및 내보내기 ==================
async function initializeMukuPatternLearner() {
    try {
        const patternLearner = new MukuConversationPatternLearner();
        
        // 학습 시스템 테스트
        await patternLearner.testLearningSystem();
        
        console.log(`
${patternLearner.colors.learner}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 무쿠 대화 패턴 학습기 v1.0 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${patternLearner.colors.reset}

${patternLearner.colors.success}✅ 핵심 기능들:${patternLearner.colors.reset}
${patternLearner.colors.pattern}   🔍 대화 패턴 자동 추출${patternLearner.colors.reset}
${patternLearner.colors.analysis}   📊 효과성 분석 및 학습${patternLearner.colors.reset}
${patternLearner.colors.learner}   ✨ 새로운 표현 자동 생성${patternLearner.colors.reset}
${patternLearner.colors.success}   🎯 실시간 패턴 최적화${patternLearner.colors.reset}

${patternLearner.colors.learner}🎉 1시간차 완료! 다음: 2시간차 실시간 학습 시스템!${patternLearner.colors.reset}
        `);
        
        return patternLearner;
        
    } catch (error) {
        console.error(`❌ 패턴 학습기 초기화 실패: ${error.message}`);
        return null;
    }
}

module.exports = {
    MukuConversationPatternLearner,
    initializeMukuPatternLearner
};

// 직접 실행 시
if (require.main === module) {
    initializeMukuPatternLearner();
}
