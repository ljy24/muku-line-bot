// ============================================================================
// muku-advancedEmotionEngine.js - 무쿠 고급 감정 엔진 v2.0
// 🎯 5시간 집중 개발 - 1시간차 (2/3)
// 💭 복합 감정, 미묘한 뉘앙스, 상황별 감정 적응 시스템
// ============================================================================

const fs = require('fs');
const path = require('path');

class MukuAdvancedEmotionEngine {
    constructor() {
        this.version = '2.0';
        this.initTime = Date.now();
        
        // 🎨 색상 코드
        this.colors = {
            emotion: '\x1b[95m',    // 보라색 (감정)
            happy: '\x1b[93m',      // 노란색 (기쁨)
            sad: '\x1b[94m',        // 파란색 (슬픔)
            angry: '\x1b[91m',      // 빨간색 (화남)
            love: '\x1b[96m',       // 하늘색 (사랑)
            sulky: '\x1b[35m',      // 자주색 (삐짐)
            success: '\x1b[92m',    // 초록색
            reset: '\x1b[0m'        // 리셋
        };
        
        // 🧠 감정 시스템 초기화
        this.emotionState = this.initializeEmotionState();
        this.emotionHistory = [];
        this.emotionPatterns = this.loadEmotionPatterns();
        this.expressionTemplates = this.loadExpressionTemplates();
        
        console.log(`${this.colors.emotion}💭 무쿠 고급 감정 엔진 v2.0 초기화 완료!${this.colors.reset}`);
    }

    // ================== 🎭 감정 상태 초기화 ==================
    initializeEmotionState() {
        return {
            // 기본 감정 (0-100)
            primary: {
                happiness: 70,
                sadness: 10,
                anger: 5,
                fear: 15,
                love: 85,
                excitement: 60,
                curiosity: 75
            },
            
            // 복합 감정 (새로운 기능!)
            complex: {
                bittersweet: 0,      // 씁쓸함
                conflicted: 0,       // 복잡한 감정
                nostalgic: 20,       // 그리움
                overwhelmed: 0,      // 벅참
                playfullyAnnoyed: 0, // 장난스러운 짜증
                lovingConcern: 60,   // 사랑하는 걱정
                shyAffection: 40     // 부끄러운 애정
            },
            
            // 미묘한 뉘앙스 (완전 새로운!)
            nuances: {
                pouty: 30,           // 토라진
                clingy: 45,          // 달라붙는
                tsundere: 25,        // 츤데레
                vulnerable: 20,      // 연약한
                mischievous: 35,     // 장난스러운
                protective: 70,      // 보호하는
                melancholic: 15      // 우울한
            },
            
            // 상황별 감정 수정자
            modifiers: {
                timeOfDay: 0,        // 시간대 영향
                weather: 0,          // 날씨 영향
                menstrualCycle: 0,   // 생리주기 영향
                recentInteraction: 0, // 최근 상호작용 영향
                memoryTrigger: 0     // 기억 트리거 영향
            },
            
            // 메타 정보
            meta: {
                lastUpdate: Date.now(),
                dominantEmotion: 'love',
                emotionIntensity: 7,
                expressionStyle: 'natural',
                personalityMood: 'cheerful'
            }
        };
    }

    // ================== 📚 감정 패턴 로드 ==================
    loadEmotionPatterns() {
        return {
            // 시간대별 감정 패턴
            timePatterns: {
                dawn: { energy: -20, vulnerability: +15, tenderness: +10 },
                morning: { happiness: +15, energy: +20, optimism: +10 },
                afternoon: { playfulness: +10, curiosity: +15 },
                evening: { love: +10, nostalgia: +5, intimacy: +15 },
                night: { mischievous: +20, clingy: +15, vulnerable: +10 },
                lateNight: { worried: +25, protective: +20, serious: +15 }
            },
            
            // 날씨별 감정 패턴
            weatherPatterns: {
                sunny: { happiness: +15, energy: +20, playfulness: +10 },
                rainy: { melancholic: +20, clingy: +15, nostalgic: +10 },
                cloudy: { contemplative: +10, gentle: +5 },
                snowy: { excited: +25, playful: +20, cozy: +15 },
                storm: { worried: +20, clingy: +25, vulnerable: +15 }
            },
            
            // 생리주기별 감정 패턴 (28일 주기)
            menstrualPatterns: {
                menstrual: { irritable: +30, vulnerable: +25, clingy: +20 },
                follicular: { energy: +15, optimistic: +10, playful: +15 },
                ovulation: { confident: +20, affectionate: +25, radiant: +15 },
                luteal: { moody: +20, sensitive: +15, introspective: +10 }
            },
            
            // 상호작용별 감정 패턴
            interactionPatterns: {
                ignored: { sulky: +40, hurt: +30, pouty: +35 },
                praised: { happy: +30, shy: +15, glowing: +25 },
                teased: { playfullyAnnoyed: +25, tsundere: +30, mischievous: +20 },
                worried_about: { protective: +35, serious: +25, concerned: +30 },
                missed: { clingy: +40, affectionate: +30, vulnerable: +20 }
            }
        };
    }

    // ================== 💬 표현 템플릿 로드 ==================
    loadExpressionTemplates() {
        return {
            // 복합 감정 표현
            complexEmotions: {
                bittersweet: [
                    "아조씨... 기쁘기도 하고 슬프기도 하고 그래 💭",
                    "이상해... 웃고 싶으면서도 울고 싶어 🥺",
                    "복잡한 기분이야... 아저씨도 그런 적 있어?"
                ],
                conflicted: [
                    "음... 뭔가 복잡해 😕 아저씨는 어떻게 생각해?",
                    "마음이 이상해... 이것도 저것도 다 하고 싶어 💭",
                    "아조씨 때문에 마음이 복잡해졌어! 어떻게 하지? 🤔"
                ],
                playfullyAnnoyed: [
                    "아 진짜! 아저씨 때문에 짜증나는데 왜 귀엽지? 😤💕",
                    "화날까 말까... 아저씨가 너무 귀여워서 못 화내겠어 힝",
                    "삐짐! 그런데 아저씨니까 봐줄게 😠💖"
                ],
                lovingConcern: [
                    "아저씨... 걱정돼 💕 괜찮다고 해도 계속 걱정돼",
                    "사랑하니까 더 걱정되는 것 같아... 조심해줘 🥺💖",
                    "아조씨가 아프면 내가 더 아파... 진짜야 💔"
                ]
            },
            
            // 미묘한 뉘앙스 표현
            subtleNuances: {
                pouty: [
                    "흥! 토라졌어 😤",
                    "아저씨 미워... 조금만 💔",
                    "삐졌다고! 달래줘야 해 😠"
                ],
                clingy: [
                    "아조씨... 계속 있어줘 🥺",
                    "혼자 있기 싫어... 아저씨 옆에 있고 싶어 💕",
                    "떨어지지 마... 무쿠가 외로워해 😢"
                ],
                tsundere: [
                    "아저씨 좋아하는 거 아니거든! ...조금만 💕",
                    "별로 안 보고 싶었어... 진짜야! (거짓말) 😤💖",
                    "아저씨 따위... 좋아한다고! 흥! 💘"
                ],
                vulnerable: [
                    "아저씨... 무쿠 약해 보여? 🥺",
                    "가끔 무서워... 아저씨가 있어서 다행이야 💕",
                    "혼자서는 안 돼... 아저씨 필요해 😢"
                ],
                mischievous: [
                    "아저씨~ 무쿠가 뭐 했게? 😏",
                    "히히... 아저씨 놀라게 해주고 싶어 😈💕",
                    "장난칠까? 아저씨 반응 보고 싶어~ ✨"
                ]
            },
            
            // 감정 강도별 표현
            intensityLevels: {
                subtle: {
                    happy: ["조금 기뻐", "살짝 좋아", "약간 웃음이 나와"],
                    sad: ["조금 슬퍼", "살짝 우울해", "약간 기운이 없어"],
                    love: ["좋아해", "고마워", "아저씨 착해"]
                },
                moderate: {
                    happy: ["기뻐! 😊", "좋아좋아!", "행복해~"],
                    sad: ["슬퍼... 😢", "우울해", "기운 없어"],
                    love: ["사랑해 💕", "아조씨 최고!", "완전 좋아해!"]
                },
                intense: {
                    happy: ["너무 기뻐!! 🎉", "완전 행복해!", "최고야!!!"],
                    sad: ["너무 슬퍼 😭", "진짜 우울해...", "마음이 아파"],
                    love: ["사랑해사랑해! 💖💖", "아조씨 없으면 안 돼!", "완전 완전 좋아해!!!"]
                }
            }
        };
    }

    // ================== 🎯 메인 감정 처리 함수 ==================
    async processEmotion(context, trigger = null) {
        try {
            console.log(`${this.colors.emotion}💭 [감정처리] 컨텍스트 분석 중...${this.colors.reset}`);
            
            // 1. 현재 상황 분석
            const situationAnalysis = await this.analyzeSituation(context);
            
            // 2. 감정 상태 업데이트
            await this.updateEmotionState(situationAnalysis, trigger);
            
            // 3. 복합 감정 계산
            const complexEmotion = this.calculateComplexEmotion();
            
            // 4. 적절한 표현 생성
            const expression = await this.generateEmotionalExpression(complexEmotion, context);
            
            // 5. 감정 히스토리 업데이트
            this.updateEmotionHistory(complexEmotion, expression);
            
            console.log(`${this.colors.success}✅ [감정처리] 완료: ${complexEmotion.primary} + ${complexEmotion.secondary || 'none'}${this.colors.reset}`);
            
            return {
                emotion: complexEmotion,
                expression: expression,
                metadata: {
                    processingTime: Date.now() - this.initTime,
                    confidence: this.calculateConfidence(complexEmotion),
                    naturalness: this.calculateNaturalness(expression)
                }
            };
            
        } catch (error) {
            console.error(`${this.colors.angry}❌ [감정처리] 오류: ${error.message}${this.colors.reset}`);
            return this.getFallbackEmotion();
        }
    }

    // ================== 🔍 상황 분석 ==================
    async analyzeSituation(context) {
        const analysis = {
            timeOfDay: this.getTimeOfDay(),
            userMood: this.detectUserMood(context.message || ''),
            conversationTone: this.analyzeConversationTone(context),
            recentHistory: this.analyzeRecentHistory(context),
            triggers: this.identifyEmotionalTriggers(context)
        };
        
        // 생리주기 상태 가져오기 (기존 시스템과 연동)
        try {
            const emotionalContextManager = require('./emotionalContextManager');
            if (emotionalContextManager && emotionalContextManager.getCurrentCycleInfo) {
                analysis.menstrualCycle = emotionalContextManager.getCurrentCycleInfo();
            }
        } catch (error) {
            console.log(`${this.colors.emotion}⚠️ [감정처리] 생리주기 정보 로드 실패: ${error.message}${this.colors.reset}`);
        }
        
        // 날씨 정보 가져오기 (기존 시스템과 연동)
        try {
            const weatherManager = require('./weatherManager');
            if (weatherManager && weatherManager.getCurrentWeather) {
                analysis.weather = await weatherManager.getCurrentWeather('yejin');
            }
        } catch (error) {
            console.log(`${this.colors.emotion}⚠️ [감정처리] 날씨 정보 로드 실패: ${error.message}${this.colors.reset}`);
        }
        
        return analysis;
    }

    // ================== 💭 감정 상태 업데이트 ==================
    async updateEmotionState(analysis, trigger) {
        // 시간대 영향 적용
        if (analysis.timeOfDay && this.emotionPatterns.timePatterns[analysis.timeOfDay]) {
            const timeEffects = this.emotionPatterns.timePatterns[analysis.timeOfDay];
            this.applyEmotionModifiers(timeEffects, 0.3);
        }
        
        // 날씨 영향 적용
        if (analysis.weather && analysis.weather.condition) {
            const weatherKey = this.mapWeatherToPattern(analysis.weather.condition);
            if (this.emotionPatterns.weatherPatterns[weatherKey]) {
                const weatherEffects = this.emotionPatterns.weatherPatterns[weatherKey];
                this.applyEmotionModifiers(weatherEffects, 0.2);
            }
        }
        
        // 생리주기 영향 적용
        if (analysis.menstrualCycle && analysis.menstrualCycle.phase) {
            const cycleEffects = this.emotionPatterns.menstrualPatterns[analysis.menstrualCycle.phase];
            if (cycleEffects) {
                this.applyEmotionModifiers(cycleEffects, 0.4);
            }
        }
        
        // 사용자 상호작용 영향 적용
        if (analysis.userMood) {
            const interactionEffects = this.emotionPatterns.interactionPatterns[analysis.userMood];
            if (interactionEffects) {
                this.applyEmotionModifiers(interactionEffects, 0.5);
            }
        }
        
        // 특별 트리거 처리
        if (trigger) {
            await this.processTrigger(trigger);
        }
        
        // 감정 수치 정규화 (0-100 범위 유지)
        this.normalizeEmotions();
        
        // 메타 정보 업데이트
        this.emotionState.meta.lastUpdate = Date.now();
        this.emotionState.meta.dominantEmotion = this.findDominantEmotion();
        this.emotionState.meta.emotionIntensity = this.calculateEmotionIntensity();
    }

    // ================== 🎭 복합 감정 계산 ==================
    calculateComplexEmotion() {
        const primary = this.findDominantEmotion();
        const secondary = this.findSecondaryEmotion();
        const nuance = this.findDominantNuance();
        
        // 복합 감정 조합 생성
        let complexType = 'simple';
        if (secondary && this.emotionState.primary[secondary] > 30) {
            complexType = 'complex';
        }
        if (nuance && this.emotionState.nuances[nuance] > 40) {
            complexType = 'nuanced';
        }
        
        return {
            type: complexType,
            primary: primary,
            secondary: secondary,
            nuance: nuance,
            intensity: this.emotionState.meta.emotionIntensity,
            confidence: this.calculateEmotionConfidence(primary, secondary, nuance)
        };
    }

    // ================== 💬 감정적 표현 생성 ==================
    async generateEmotionalExpression(complexEmotion, context) {
        let expressions = [];
        
        // 복합 감정 표현 선택
        if (complexEmotion.type === 'complex' && complexEmotion.secondary) {
            const complexKey = this.findComplexEmotionKey(complexEmotion.primary, complexEmotion.secondary);
            if (complexKey && this.expressionTemplates.complexEmotions[complexKey]) {
                expressions = [...this.expressionTemplates.complexEmotions[complexKey]];
            }
        }
        
        // 뉘앙스 표현 추가
        if (complexEmotion.nuance && this.expressionTemplates.subtleNuances[complexEmotion.nuance]) {
            expressions = [...expressions, ...this.expressionTemplates.subtleNuances[complexEmotion.nuance]];
        }
        
        // 기본 감정 표현 폴백
        if (expressions.length === 0) {
            const intensityLevel = this.getIntensityLevel(complexEmotion.intensity);
            if (this.expressionTemplates.intensityLevels[intensityLevel] && 
                this.expressionTemplates.intensityLevels[intensityLevel][complexEmotion.primary]) {
                expressions = this.expressionTemplates.intensityLevels[intensityLevel][complexEmotion.primary];
            }
        }
        
        // 표현 선택 및 개인화
        if (expressions.length > 0) {
            const selectedExpression = expressions[Math.floor(Math.random() * expressions.length)];
            return this.personalizeExpression(selectedExpression, context);
        }
        
        // 최종 폴백
        return this.generateFallbackExpression(complexEmotion);
    }

    // ================== 🛠️ 헬퍼 함수들 ==================
    
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 9) return 'dawn';
        if (hour >= 9 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        if (hour >= 22 || hour < 2) return 'night';
        return 'lateNight';
    }

    detectUserMood(message) {
        const sadKeywords = ['슬프', '우울', '힘들', '아파', '지쳐'];
        const happyKeywords = ['기뻐', '좋아', '행복', '최고', '완전'];
        const angryKeywords = ['화나', '짜증', '열받', '싫어'];
        
        if (sadKeywords.some(keyword => message.includes(keyword))) return 'sad';
        if (happyKeywords.some(keyword => message.includes(keyword))) return 'happy';
        if (angryKeywords.some(keyword => message.includes(keyword))) return 'angry';
        
        return 'neutral';
    }

    applyEmotionModifiers(effects, intensity = 1.0) {
        Object.entries(effects).forEach(([emotion, change]) => {
            const adjustedChange = change * intensity;
            
            // 기본 감정에 적용
            if (this.emotionState.primary[emotion] !== undefined) {
                this.emotionState.primary[emotion] = Math.max(0, Math.min(100, 
                    this.emotionState.primary[emotion] + adjustedChange));
            }
            
            // 복합 감정에 적용
            if (this.emotionState.complex[emotion] !== undefined) {
                this.emotionState.complex[emotion] = Math.max(0, Math.min(100, 
                    this.emotionState.complex[emotion] + adjustedChange));
            }
            
            // 뉘앙스에 적용
            if (this.emotionState.nuances[emotion] !== undefined) {
                this.emotionState.nuances[emotion] = Math.max(0, Math.min(100, 
                    this.emotionState.nuances[emotion] + adjustedChange));
            }
        });
    }

    findDominantEmotion() {
        let maxEmotion = 'love';
        let maxValue = 0;
        
        Object.entries(this.emotionState.primary).forEach(([emotion, value]) => {
            if (value > maxValue) {
                maxValue = value;
                maxEmo
