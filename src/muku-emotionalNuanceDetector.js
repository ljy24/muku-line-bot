// ============================================================================
// muku-emotionalNuanceDetector.js - 무쿠 감정 뉘앙스 감지 시스템
// 🥺 아저씨의 미묘한 감정 변화와 숨겨진 마음 읽기
// 💕 예진이처럼 섬세하게 감정을 느끼고 반응하기
// 🌸 단순한 키워드가 아닌 진짜 감정의 깊이 파악
// ============================================================================

const fs = require('fs');
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    emotion: '\x1b[95m',      // 연보라색 (감정)
    nuance: '\x1b[93m',       // 노란색 (뉘앙스)
    deep: '\x1b[96m',         // 하늘색 (깊은 분석)
    caring: '\x1b[92m',       // 연초록색 (돌봄)
    warning: '\x1b[91m',      // 빨간색 (경고)
    reset: '\x1b[0m'          // 색상 리셋
};

// ================== 💫 감정 뉘앙스 감지 핵심 클래스 ==================
class MukuEmotionalNuanceDetector {
    constructor() {
        this.initialized = false;
        this.emotionalPatterns = new Map();
        this.nuanceIndicators = new Map();
        this.hiddenEmotionSignals = new Map();
        this.emotionalMemory = [];
        this.baselineEmotion = null;
        
        // 🥺 예진이의 감정 감지 능력 시뮬레이션
        this.emotionalSensitivity = {
            // 감정 강도 감지 정확도 (0-100)
            intensityAccuracy: 85,
            
            // 숨겨진 감정 감지 능력 (0-100)  
            hiddenEmotionDetection: 90,
            
            // 감정 변화 추적 정확도 (0-100)
            changeDetectionAccuracy: 80,
            
            // 맥락적 감정 이해도 (0-100)
            contextualUnderstanding: 95
        };
        
        // 🌸 감정 분류 체계
        this.emotionCategories = {
            // 기본 감정
            primary: {
                joy: { intensity: [1,10], keywords: ['기뻐', '행복', '좋아', '신나'], color: '💛' },
                sadness: { intensity: [1,10], keywords: ['슬퍼', '우울', '속상', 'ㅠㅠ'], color: '💙' },
                anger: { intensity: [1,10], keywords: ['화나', '짜증', '분노', '열받'], color: '❤️' },
                fear: { intensity: [1,10], keywords: ['무서워', '불안', '걱정', '두려워'], color: '🖤' },
                surprise: { intensity: [1,10], keywords: ['놀라', '깜짝', '헐', '대박'], color: '💜' },
                love: { intensity: [1,10], keywords: ['사랑', '좋아해', '애정', '♡'], color: '💗' }
            },
            
            // 복합 감정 (예진이가 특히 잘 감지하는)
            complex: {
                loneliness: { 
                    intensity: [1,10], 
                    keywords: ['외로워', '혼자', '쓸쓸', '심심'],
                    hiddenSignals: ['괜찮아', '아무것도', '별거 아냐'],
                    color: '🌙'
                },
                stress: {
                    intensity: [1,10],
                    keywords: ['스트레스', '힘들어', '피곤', '지쳐'],
                    hiddenSignals: ['바빠', '할 일', '시간이'],
                    color: '⚡'
                },
                melancholy: {
                    intensity: [1,10],
                    keywords: ['그립다', '아쉬워', '허전', '공허'],
                    hiddenSignals: ['예전에', '그때', '옛날'],
                    color: '🌫️'
                },
                affection: {
                    intensity: [1,10],
                    keywords: ['고마워', '미안해', '보고싶어', '그리워'],
                    hiddenSignals: ['잘 지내', '어떻게', '요즘'],
                    color: '🌸'
                }
            },
            
            // 숨겨진 감정 (말로 표현하지 않지만 느껴지는)
            hidden: {
                depression: {
                    intensity: [1,10],
                    indicators: ['피곤해', '귀찮아', '모르겠어', '상관없어'],
                    patterns: ['짧은 대답', '반복적 표현', '관심 부족'],
                    severity: 'high',
                    color: '🌑'
                },
                anxiety: {
                    intensity: [1,10],
                    indicators: ['혹시', '만약에', '걱정돼', '어떡하지'],
                    patterns: ['과도한 질문', '반복 확인', '최악 상황 가정'],
                    severity: 'medium',
                    color: '⚠️'
                },
                burnout: {
                    intensity: [1,10],
                    indicators: ['되는 게 없어', '다 귀찮아', '의미없어', '포기'],
                    patterns: ['무기력 표현', '포기 언급', '희망 없음'],
                    severity: 'high',
                    color: '🔥'
                }
            }
        };
        
        // 🔍 감정 뉘앙스 패턴
        this.nuancePatterns = {
            // 말의 속도와 리듬
            speechRhythm: {
                rushed: /\.\.\.|급해|빨리|당장/,
                slow: /음\.\.\.|글쎄\.\.\.|아\.\.\./,
                normal: /그래|좋아|알겠어/
            },
            
            // 문장 구조와 완성도
            sentenceStructure: {
                incomplete: /\.\.\.|그냥\.\.\.|뭔가\.\.\./,
                complete: /습니다|입니다|예요|에요/,
                casual: /야|어|지|네/
            },
            
            // 감정 강도 표현
            intensityMarkers: {
                extreme: /완전|정말|진짜|너무|엄청/,
                moderate: /좀|약간|그럭저럭|살짝/,
                mild: /조금|어느정도|그냥/
            },
            
            // 시간적 맥락
            temporalContext: {
                past: /예전|그때|옛날|과거|전에/,
                present: /지금|오늘|현재|요즘/,
                future: /나중|앞으로|미래|내일/
            }
        };
        
        console.log(`${colors.emotion}💫 [감정뉘앙스] MukuEmotionalNuanceDetector 초기화 시작...${colors.reset}`);
    }

    // ================== 🚀 초기화 함수 ==================
    async initialize() {
        try {
            console.log(`${colors.emotion}🚀 [감정뉘앙스 초기화] 감정 감지 시스템 로딩...${colors.reset}`);
            
            // 1. 감정 패턴 데이터베이스 구축
            await this.buildEmotionalPatternDatabase();
            
            // 2. 뉘앙스 지표 설정
            this.setupNuanceIndicators();
            
            // 3. 숨겨진 감정 신호 매핑
            this.mapHiddenEmotionSignals();
            
            // 4. 기준선 감정 설정
            this.establishEmotionalBaseline();
            
            this.initialized = true;
            console.log(`${colors.emotion}✅ [감정뉘앙스] 감정 뉘앙스 감지 시스템 초기화 완료!${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.emotion}❌ [감정뉘앙스] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 📚 감정 패턴 데이터베이스 구축 ==================
    async buildEmotionalPatternDatabase() {
        console.log(`${colors.nuance}📚 [패턴구축] 감정 패턴 데이터베이스 구축 중...${colors.reset}`);
        
        // 🥺 아저씨의 감정 표현 패턴들 (예진이가 파악한)
        const ajeossiEmotionalPatterns = [
            // 슬픔/우울 패턴
            {
                emotion: 'sadness',
                intensity: 7,
                patterns: ['괜찮아', '별거 아니야', '그냥', '모르겠어'],
                hiddenSignals: ['짧은 대답', '평소보다 적은 말', '이모티콘 없음'],
                context: '실제로는 힘들지만 표현하지 않음'
            },
            
            // 스트레스/피로 패턴
            {
                emotion: 'stress',
                intensity: 8,
                patterns: ['피곤해', '힘들어', '바빠', '시간이 없어'],
                hiddenSignals: ['잦은 한숨 표현', '부정적 반응 증가', '짜증 표현'],
                context: '업무나 일상의 압박감'
            },
            
            // 외로움 패턴
            {
                emotion: 'loneliness',
                intensity: 6,
                patterns: ['혼자', '심심해', '뭐해', '잘 지내?'],
                hiddenSignals: ['자주 연락', '과거 얘기', '추억 언급'],
                context: '예진이와의 추억을 그리워함'
            },
            
            // 걱정/불안 패턴
            {
                emotion: 'anxiety',
                intensity: 5,
                patterns: ['걱정돼', '괜찮을까', '혹시', '만약에'],
                hiddenSignals: ['반복적 질문', '확인 요청', '최악 시나리오'],
                context: '미래에 대한 불안감'
            },
            
            // 애정/그리움 패턴
            {
                emotion: 'affection',
                intensity: 9,
                patterns: ['보고싶어', '사랑해', '고마워', '미안해'],
                hiddenSignals: ['감정적 메시지', '과거 회상', '예진이 언급'],
                context: '예진이에 대한 깊은 사랑과 그리움'
            }
        ];
        
        ajeossiEmotionalPatterns.forEach((pattern, index) => {
            this.emotionalPatterns.set(`pattern_${index}`, pattern);
        });
        
        console.log(`${colors.nuance}✅ [패턴구축] ${ajeossiEmotionalPatterns.length}개 감정 패턴 데이터베이스 완성${colors.reset}`);
    }

    // ================== 🎯 뉘앙스 지표 설정 ==================
    setupNuanceIndicators() {
        console.log(`${colors.nuance}🎯 [뉘앙스지표] 미묘한 감정 변화 감지 지표 설정...${colors.reset}`);
        
        const nuanceIndicators = {
            // 언어적 뉘앙스
            linguistic: {
                // 문장 길이 변화
                sentenceLengthChange: {
                    shorter: { indicator: '간결한 답변 증가', emotion: 'withdrawn', weight: 0.7 },
                    longer: { indicator: '상세한 설명 증가', emotion: 'expressive', weight: 0.6 }
                },
                
                // 어조 변화
                toneChange: {
                    formal: { indicator: '격식체 사용 증가', emotion: 'distant', weight: 0.8 },
                    casual: { indicator: '반말 사용 증가', emotion: 'comfortable', weight: 0.5 }
                },
                
                // 이모티콘 사용 변화
                emojiUsage: {
                    decreased: { indicator: '이모티콘 사용 감소', emotion: 'depressed', weight: 0.9 },
                    increased: { indicator: '이모티콘 사용 증가', emotion: 'happy', weight: 0.7 }
                }
            },
            
            // 시간적 뉘앙스
            temporal: {
                // 응답 시간 패턴
                responseTime: {
                    delayed: { indicator: '응답 시간 지연', emotion: 'hesitant', weight: 0.6 },
                    immediate: { indicator: '즉시 응답', emotion: 'eager', weight: 0.5 }
                },
                
                // 대화 빈도 변화
                frequency: {
                    decreased: { indicator: '대화 빈도 감소', emotion: 'withdrawn', weight: 0.8 },
                    increased: { indicator: '대화 빈도 증가', emotion: 'needy', weight: 0.7 }
                }
            },
            
            // 내용적 뉘앙스
            content: {
                // 주제 선택
                topicChoice: {
                    past_focused: { indicator: '과거 이야기 증가', emotion: 'nostalgic', weight: 0.7 },
                    future_focused: { indicator: '미래 계획 증가', emotion: 'hopeful', weight: 0.6 }
                },
                
                // 질문 패턴
                questionPattern: {
                    increased_checking: { indicator: '확인 질문 증가', emotion: 'anxious', weight: 0.8 },
                    decreased_inquiry: { indicator: '호기심 질문 감소', emotion: 'disinterested', weight: 0.6 }
                }
            }
        };
        
        Object.entries(nuanceIndicators).forEach(([category, indicators]) => {
            this.nuanceIndicators.set(category, indicators);
        });
        
        console.log(`${colors.nuance}✅ [뉘앙스지표] ${Object.keys(nuanceIndicators).length}개 카테고리 지표 설정 완료${colors.reset}`);
    }

    // ================== 🕵️ 숨겨진 감정 신호 매핑 ==================
    mapHiddenEmotionSignals() {
        console.log(`${colors.deep}🕵️ [숨겨진감정] 은밀한 감정 신호 매핑 중...${colors.reset}`);
        
        const hiddenSignals = {
            // 거부/방어 메커니즘
            denial: {
                signals: ['괜찮아', '아무것도 아니야', '별거 아냐', '신경쓰지 마'],
                realEmotion: '실제로는 힘들어함',
                confidenceLevel: 0.85,
                intervention: 'gentle_caring'
            },
            
            // 도움 요청 (간접적)
            help_seeking: {
                signals: ['어떻게 하지', '모르겠어', '힘들다', '지쳤어'],
                realEmotion: '도움이 필요하지만 직접 말하기 어려워함',
                confidenceLevel: 0.90,
                intervention: 'supportive_response'
            },
            
            // 애정 갈구 (숨겨진)
            affection_craving: {
                signals: ['심심해', '뭐해', '혼자', '잘 지내?'],
                realEmotion: '관심과 사랑을 받고 싶어함',
                confidenceLevel: 0.75,
                intervention: 'loving_attention'
            },
            
            // 죄책감/자책
            guilt: {
                signals: ['미안해', '내 잘못', '폐가 되나', '부담스럽겠다'],
                realEmotion: '자신을 탓하고 있음',
                confidenceLevel: 0.80,
                intervention: 'reassurance'
            },
            
            // 절망/포기 (위험신호)
            despair: {
                signals: ['의미없어', '포기', '되는 게 없어', '다 소용없어'],
                realEmotion: '심각한 절망감',
                confidenceLevel: 0.95,
                intervention: 'urgent_intervention'
            }
        };
        
        Object.entries(hiddenSignals).forEach(([signal, config]) => {
            this.hiddenEmotionSignals.set(signal, config);
        });
        
        console.log(`${colors.deep}✅ [숨겨진감정] ${Object.keys(hiddenSignals).length}개 숨겨진 감정 신호 매핑 완료${colors.reset}`);
    }

    // ================== 📏 기준선 감정 설정 ==================
    establishEmotionalBaseline() {
        console.log(`${colors.caring}📏 [기준선설정] 아저씨의 평상시 감정 기준선 설정...${colors.reset}`);
        
        // 🥺 아저씨의 평상시 감정 상태 (예진이가 파악한)
        this.baselineEmotion = {
            // 기본 감정 상태
            primary: {
                sadness: 6,      // 예진이를 잃은 슬픔
                loneliness: 7,   // 외로움
                love: 9,         // 예진이에 대한 사랑
                anxiety: 4,      // 일상적 불안
                hope: 3          // 희망 (낮음)
            },
            
            // 일상 패턴
            dailyPattern: {
                morning: { energy: 4, mood: 5, motivation: 3 },
                afternoon: { energy: 6, mood: 6, motivation: 5 },
                evening: { energy: 3, mood: 4, motivation: 2 },
                night: { energy: 2, mood: 3, motivation: 1 }
            },
            
            // 트리거 요소들
            triggers: {
                positive: ['예진이 추억', '좋은 소식', '무쿠와 대화'],
                negative: ['혼자 있을 때', '특별한 날', '예진이 생각'],
                neutral: ['일상 업무', '루틴']
            },
            
            // 회복 패턴
            recovery: {
                fast: ['무쿠 대화', '바쁜 업무'],
                slow: ['혼자 시간', '조용한 환경'],
                support_needed: ['우울 지속', '희망 없음 표현']
            }
        };
        
        console.log(`${colors.caring}✅ [기준선설정] 감정 기준선 설정 완료 (슬픔:${this.baselineEmotion.primary.sadness}/10, 사랑:${this.baselineEmotion.primary.love}/10)${colors.reset}`);
    }

    // ================== 🔍 메인 감정 분석 함수 ==================
    analyzeEmotionalNuance(message, previousMessages = [], context = {}) {
        if (!this.initialized) {
            console.log(`${colors.emotion}⚠️ [감정뉘앙스] 시스템이 초기화되지 않음${colors.reset}`);
            return { nuance: 'unknown', confidence: 0, recommendations: [] };
        }

        console.log(`${colors.emotion}🔍 [감정분석] "${message.substring(0, 40)}..." 뉘앙스 분석 시작${colors.reset}`);

        const analysis = {
            originalMessage: message,
            timestamp: Date.now(),
            
            // 🎯 핵심 분석
            detectedEmotions: this.detectPrimaryEmotions(message),
            hiddenEmotions: this.detectHiddenEmotions(message),
            emotionalIntensity: this.measureEmotionalIntensity(message),
            
            // 🔄 변화 분석
            emotionalChange: this.analyzeEmotionalChange(message, previousMessages),
            comparisonWithBaseline: this.compareWithBaseline(message),
            
            // 🌸 뉘앙스 분석
            linguisticNuances: this.analyzeLinguisticNuances(message),
            contextualNuances: this.analyzeContextualNuances(message, context),
            temporalNuances: this.analyzeTemporalNuances(message, previousMessages),
            
            // 💕 예진이의 반응 제안
            yejinResponse: {
                emotionalResponse: null,
                careLevelNeeded: 0,
                interventionRequired: false,
                responseStyle: 'normal'
            },
            
            // 📊 종합 평가
            overallAssessment: {
                confidenceLevel: 0,
                riskLevel: 'low',
                attentionNeeded: false,
                recommendations: []
            }
        };

        // 🧠 종합 분석 및 평가
        this.performComprehensiveAnalysis(analysis);
        
        // 🌸 예진이의 대응 방식 결정
        this.determineYejinResponse(analysis);
        
        // 📝 감정 메모리에 저장
        this.saveToEmotionalMemory(analysis);

        console.log(`${colors.emotion}✅ [분석완료] 주요감정: ${analysis.detectedEmotions.primary}, 숨겨진감정: ${analysis.hiddenEmotions.primary || 'none'}, 신뢰도: ${analysis.overallAssessment.confidenceLevel}%${colors.reset}`);

        return analysis;
    }

    // ================== 🎯 주요 감정 감지 ==================
    detectPrimaryEmotions(message) {
        const emotionScores = {};
        
        // 모든 감정 카테고리 검사
        Object.entries(this.emotionCategories).forEach(([category, emotions]) => {
            Object.entries(emotions).forEach(([emotion, config]) => {
                emotionScores[emotion] = 0;
                
                // 키워드 매칭
                config.keywords.forEach(keyword => {
                    if (message.toLowerCase().includes(keyword.toLowerCase())) {
                        emotionScores[emotion] += 2;
                    }
                });
                
                // 숨겨진 신호 매칭
                if (config.hiddenSignals) {
                    config.hiddenSignals.forEach(signal => {
                        if (message.toLowerCase().includes(signal.toLowerCase())) {
                            emotionScores[emotion] += 1.5;
                        }
                    });
                }
            });
        });

        // 최고 점수 감정들 정렬
        const sortedEmotions = Object.entries(emotionScores)
            .sort(([,a], [,b]) => b - a)
            .filter(([,score]) => score > 0);

        return {
            primary: sortedEmotions[0] ? sortedEmotions[0][0] : 'neutral',
            secondary: sortedEmotions[1] ? sortedEmotions[1][0] : null,
            allScores: emotionScores,
            confidence: sortedEmotions[0] ? Math.min(sortedEmotions[0][1] * 10, 95) : 0
        };
    }

    // ================== 🕵️ 숨겨진 감정 감지 ==================
    detectHiddenEmotions(message) {
        const hiddenEmotions = {};
        
        this.hiddenEmotionSignals.forEach((config, signal) => {
            let matchScore = 0;
            
            // 직접적 신호 매칭
            config.signals.forEach(signalPattern => {
                if (message.toLowerCase().includes(signalPattern.toLowerCase())) {
                    matchScore += config.confidenceLevel;
                }
            });
            
            if (matchScore > 0) {
                hiddenEmotions[signal] = {
                    score: matchScore,
                    realEmotion: config.realEmotion,
                    intervention: config.intervention,
                    confidence: config.confidenceLevel
                };
            }
        });

        // 가장 높은 점수의 숨겨진 감정 반환
        const topHiddenEmotion = Object.entries(hiddenEmotions)
            .sort(([,a], [,b]) => b.score - a.score)[0];

        return {
            primary: topHiddenEmotion ? topHiddenEmotion[0] : null,
            details: topHiddenEmotion ? topHiddenEmotion[1] : null,
            allDetected: hiddenEmotions,
            hasHiddenEmotions: Object.keys(hiddenEmotions).length > 0
        };
    }

    // ================== ⚡ 감정 강도 측정 ==================
    measureEmotionalIntensity(message) {
        let intensity = 5; // 기본 강도

        // 강도 마커 체크
        const intensityMarkers = this.nuancePatterns.intensityMarkers;
        
        if (intensityMarkers.extreme.test(message)) intensity += 3;
        if (intensityMarkers.moderate.test(message)) intensity += 1;
        if (intensityMarkers.mild.test(message)) intensity -= 1;

        // 문장부호로 강도 추정
        const exclamationCount = (message.match(/!/g) || []).length;
        const questionCount = (message.match(/\?/g) || []).length;
        const ellipsisCount = (message.match(/\.\.\./g) || []).length;

        intensity += exclamationCount * 0.5;
        intensity += questionCount * 0.3;
        intensity -= ellipsisCount * 0.5; // 생략부호는 약한 감정

        // 대문자 사용 (강한 감정)
        const upperCaseRatio = (message.match(/[A-Z]/g) || []).length / message.length;
        intensity += upperCaseRatio * 5;

        return Math.max(1, Math.min(10, Math.round(intensity)));
    }

    // ================== 🔄 감정 변화 분석 ==================
    analyzeEmotionalChange(currentMessage, previousMessages) {
        if (!previousMessages || previousMessages.length === 0) {
            return { type: 'no_history', change: 'unknown', trend: 'stable' };
        }

        // 최근 메시지들과 비교
        const recentAnalyses = previousMessages.slice(-3).map(msg => 
            this.detectPrimaryEmotions(msg)
        );
        
        const currentEmotion = this.detectPrimaryEmotions(currentMessage);
        
        // 감정 변화 패턴 분석
        const emotionTrend = this.calculateEmotionTrend(recentAnalyses, currentEmotion);
        
        return {
            type: 'comparison',
            previousEmotion: recentAnalyses[recentAnalyses.length - 1]?.primary || 'unknown',
            currentEmotion: currentEmotion.primary,
            change: this.getEmotionChangeType(
                recentAnalyses[recentAnalyses.length - 1]?.primary,
                currentEmotion.primary
            ),
            trend: emotionTrend,
            significance: this.calculateChangeSignificance(recentAnalyses, currentEmotion)
        };
    }

    // ================== 📏 기준선과 비교 ==================
    compareWithBaseline(message) {
        const currentEmotions = this.detectPrimaryEmotions(message);
        const baseline = this.baselineEmotion.primary;
        
        const comparison = {};
        
        Object.keys(baseline).forEach(emotion => {
            const currentLevel = currentEmotions.allScores[emotion] || 0;
            const baselineLevel = baseline[emotion];
            const difference = currentLevel - baselineLevel;
            
            comparison[emotion] = {
                current: currentLevel,
                baseline: baselineLevel,
                difference: difference,
                status: difference > 1 ? 'elevated' : difference < -1 ? 'reduced' : 'normal'
            };
        });

        return {
            comparison: comparison,
            overallDeviation: this.calculateOverallDeviation(comparison),
            alertLevel: this.determineAlertLevel(comparison)
        };
    }

    // ================== 🗣️ 언어적 뉘앙스 분석 ==================
    analyzeLinguisticNuances(message) {
        const nuances = {
            sentenceLength: message.length,
            wordCount: message.split(/\s+/).length,
            complexity: this.calculateLinguisticComplexity(message),
            
            // 문체 분석
            formalityLevel: this.detectFormalityLevel(message),
            casualnessLevel: this.detectCasualnessLevel(message),
            
            // 특별한 언어 패턴
            repetition: this.detectRepetition(message),
            hesitation: this.detectHesitation(message),
            emphasis: this.detectEmphasis(message),
            
            // 문장 구조
            questionCount: (message.match(/\?/g) || []).length,
            exclamationCount: (message.match(/!/g) || []).length,
            ellipsisCount: (message.match(/\.\.\./g) || []).length
        };

        return nuances;
    }

    // ================== 🎭 맥락적 뉘앙스 분석 ==================
    analyzeContextualNuances(message, context) {
        const contextualFactors = {
            timeOfDay: this.getTimeContextualEmotion(context.timeOfDay),
            recentEvents: this.analyzeRecentEventImpact(context.recentEvents),
            conversationHistory: this.analyzeConversationContext(context.conversationHistory),
            
            // 환경적 요소
            environment: {
                isAlone: context.isAlone || false,
                hasDistraction: context.hasDistraction || false,
                stressLevel: context.stressLevel || 'normal'
            },
            
            // 관계적 맥락
            relationship: {
                intimacyLevel: 'high', // 무쿠와는 항상 높은 친밀도
                trustLevel: 'absolute', // 예진이에 대한 절대적 신뢰
                comfortLevel: this.assessComfortLevel(message)
            }
        };

        return contextualFactors;
    }

    // ================== ⏰ 시간적 뉘앙스 분석 ==================
    analyzeTemporalNuances(message, previousMessages) {
        const now = Date.now();
        const temporal = {
            // 응답 패턴
            responsePattern: this.analyzeResponsePattern(previousMessages),
            
            // 시간대별 감정 패턴
            timeBasedEmotion: this.getTimeBasedEmotionalPattern(),
            
            // 주기적 패턴
            cyclicalPattern: this.detectCyclicalEmotionalPattern(previousMessages),
            
            // 감정 지속성
            emotionPersistence: this.calculateEmotionPersistence(previousMessages)
        };

        return temporal;
    }

    // ================== 🧠 종합 분석 수행 ==================
    performComprehensiveAnalysis(analysis) {
        const factors = [
            analysis.detectedEmotions.confidence,
            analysis.hiddenEmotions.hasHiddenEmotions ? 85 : 70,
            analysis.emotionalIntensity * 8,
            analysis.comparisonWithBaseline.overallDeviation < 2 ? 90 : 70
        ];

        analysis.overallAssessment.confidenceLevel = Math.round(
            factors.reduce((sum, factor) => sum + factor, 0) / factors.length
        );

        // 위험도 평가
        analysis.overallAssessment.riskLevel = this.assessRiskLevel(analysis);
        
        // 주의 필요 여부
        analysis.overallAssessment.attentionNeeded = this.assessAttentionNeeded(analysis);
        
        // 추천 사항
        analysis.overallAssessment.recommendations = this.generateRecommendations(analysis);
    }

    // ================== 🌸 예진이 대응 방식 결정 ==================
    determineYejinResponse(analysis) {
        const yejinResponse = analysis.yejinResponse;
        
        // 감정적 반응 결정
        if (analysis.hiddenEmotions.hasHiddenEmotions) {
            yejinResponse.emotionalResponse = 'deeply_caring';
            yejinResponse.careLevelNeeded = 8;
        } else if (analysis.detectedEmotions.primary === 'sadness') {
            yejinResponse.emotionalResponse = 'comforting';
            yejinResponse.careLevelNeeded = 7;
        } else if (analysis.detectedEmotions.primary === 'joy') {
            yejinResponse.emotionalResponse = 'enthusiastic';
            yejinResponse.careLevelNeeded = 3;
        } else {
            yejinResponse.emotionalResponse = 'supportive';
            yejinResponse.careLevelNeeded = 5;
        }

        // 개입 필요성 판단
        yejinResponse.interventionRequired = analysis.overallAssessment.riskLevel === 'high';
        
        // 응답 스타일 결정
        yejinResponse.responseStyle = this.determineResponseStyle(analysis);
    }

    // ================== 💾 감정 메모리 저장 ==================
    saveToEmotionalMemory(analysis) {
        this.emotionalMemory.push({
            timestamp: analysis.timestamp,
            primaryEmotion: analysis.detectedEmotions.primary,
            hiddenEmotion: analysis.hiddenEmotions.primary,
            intensity: analysis.emotionalIntensity,
            confidence: analysis.overallAssessment.confidenceLevel,
            riskLevel: analysis.overallAssessment.riskLevel
        });

        // 최근 50개만 유지
        if (this.emotionalMemory.length > 50) {
            this.emotionalMemory = this.emotionalMemory.slice(-50);
        }
    }

    // ================== 🔧 유틸리티 함수들 ==================
    
    calculateEmotionTrend(previousAnalyses, currentAnalysis) {
        if (previousAnalyses.length < 2) return 'insufficient_data';
        
        const emotionValues = previousAnalyses.map(analysis => 
            analysis.confidence || 0
        );
        emotionValues.push(currentAnalysis.confidence || 0);
        
        const trend = emotionValues[emotionValues.length - 1] - emotionValues[0];
        
        if (trend > 10) return 'improving';
        if (trend < -10) return 'deteriorating';
        return 'stable';
    }

    getEmotionChangeType(previousEmotion, currentEmotion) {
        if (!previousEmotion) return 'initial';
        if (previousEmotion === currentEmotion) return 'stable';
        
        const emotionPairs = {
            'sadness_joy': 'positive_shift',
            'joy_sadness': 'negative_shift',
            'anger_sadness': 'cooling_down',
            'sadness_anger': 'escalating'
        };
        
        return emotionPairs[`${previousEmotion}_${currentEmotion}`] || 'transition';
    }

    calculateChangeSignificance(previousAnalyses, currentAnalysis) {
        if (previousAnalyses.length === 0) return 'unknown';
        
        const avgPrevious = previousAnalyses.reduce((sum, analysis) => 
            sum + (analysis.confidence || 0), 0) / previousAnalyses.length;
        
        const difference = Math.abs((currentAnalysis.confidence || 0) - avgPrevious);
        
        if (difference > 30) return 'very_significant';
        if (difference > 15) return 'significant';
        if (difference > 5) return 'moderate';
        return 'minimal';
    }

    calculateOverallDeviation(comparison) {
        const deviations = Object.values(comparison).map(comp => Math.abs(comp.difference));
        return deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    }

    determineAlertLevel(comparison) {
        const highDeviations = Object.values(comparison).filter(comp => 
            Math.abs(comp.difference) > 3
        ).length;
        
        if (highDeviations > 2) return 'high';
        if (highDeviations > 0) return 'medium';
        return 'low';
    }

    calculateLinguisticComplexity(message) {
        const avgWordLength = message.replace(/\s+/g, '').length / message.split(/\s+/).length;
        const sentenceCount = message.split(/[.!?]/).length;
        const complexity = (avgWordLength * 2) + (sentenceCount * 1.5);
        return Math.min(10, Math.max(1, Math.round(complexity)));
    }

    detectFormalityLevel(message) {
        const formalMarkers = ['습니다', '입니다', '께서', '드립니다'];
        const formalCount = formalMarkers.filter(marker => 
            message.includes(marker)
        ).length;
        return Math.min(10, formalCount * 3);
    }

    detectCasualnessLevel(message) {
        const casualMarkers = ['야', '어', '지', '거든', '~'];
        const casualCount = casualMarkers.filter(marker => 
            message.includes(marker)
        ).length;
        return Math.min(10, casualCount * 2);
    }

    detectRepetition(message) {
        const words = message.split(/\s+/);
        const uniqueWords = new Set(words);
        return words.length - uniqueWords.size;
    }

    detectHesitation(message) {
        const hesitationMarkers = ['음...', '글쎄...', '아...', '어...'];
        return hesitationMarkers.filter(marker => 
            message.includes(marker)
        ).length;
    }

    detectEmphasis(message) {
        const emphasisMarkers = ['정말', '진짜', '완전', '너무', '엄청'];
        return emphasisMarkers.filter(marker => 
            message.includes(marker)
        ).length;
    }

    getTimeContextualEmotion(timeOfDay) {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning_fresh';
        if (hour >= 12 && hour < 18) return 'afternoon_active';
        if (hour >= 18 && hour < 22) return 'evening_tired';
        return 'night_contemplative';
    }

    analyzeRecentEventImpact(recentEvents) {
        if (!recentEvents || recentEvents.length === 0) return 'none';
        
        const eventTypes = recentEvents.map(event => event.type);
        if (eventTypes.includes('loss')) return 'negative_high';
        if (eventTypes.includes('success')) return 'positive_high';
        if (eventTypes.includes('stress')) return 'negative_medium';
        return 'neutral';
    }

    analyzeConversationContext(conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return 'no_context';
        }
        
        const recentTopics = conversationHistory.slice(-5);
        const emotionalMessages = recentTopics.filter(msg => 
            this.detectPrimaryEmotions(msg.content).confidence > 70
        );
        
        return {
            emotionalIntensity: emotionalMessages.length / recentTopics.length,
            dominantTopic: this.extractDominantTopic(recentTopics),
            conversationMood: this.assessOverallConversationMood(recentTopics)
        };
    }

    assessComfortLevel(message) {
        const comfortIndicators = ['편해', '좋아', '안심', '괜찮아'];
        const discomfortIndicators = ['어색', '부담', '걱정', '불편'];
        
        let comfortScore = comfortIndicators.filter(indicator => 
            message.includes(indicator)
        ).length * 2;
        
        comfortScore -= discomfortIndicators.filter(indicator => 
            message.includes(indicator)
        ).length * 2;
        
        return Math.max(1, Math.min(10, 5 + comfortScore));
    }

    analyzeResponsePattern(previousMessages) {
        if (!previousMessages || previousMessages.length < 2) {
            return 'insufficient_data';
        }
        
        const responseTimes = [];
        for (let i = 1; i < previousMessages.length; i++) {
            const timeDiff = previousMessages[i].timestamp - previousMessages[i-1].timestamp;
            responseTimes.push(timeDiff);
        }
        
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        
        if (avgResponseTime < 30000) return 'immediate'; // 30초 미만
        if (avgResponseTime < 300000) return 'quick'; // 5분 미만
        if (avgResponseTime < 3600000) return 'normal'; // 1시간 미만
        return 'delayed';
    }

    getTimeBasedEmotionalPattern() {
        const hour = new Date().getHours();
        const patterns = this.baselineEmotion.dailyPattern;
        
        if (hour >= 6 && hour < 12) return patterns.morning;
        if (hour >= 12 && hour < 18) return patterns.afternoon;
        if (hour >= 18 && hour < 22) return patterns.evening;
        return patterns.night;
    }

    detectCyclicalEmotionalPattern(previousMessages) {
        if (!previousMessages || previousMessages.length < 7) {
            return 'insufficient_data';
        }
        
        // 일주일 패턴 감지 시도
        const weeklyPattern = this.analyzeWeeklyPattern(previousMessages);
        return weeklyPattern;
    }

    calculateEmotionPersistence(previousMessages) {
        if (!previousMessages || previousMessages.length < 3) {
            return 'unknown';
        }
        
        const recentEmotions = previousMessages.slice(-5).map(msg => 
            this.detectPrimaryEmotions(msg.content).primary
        );
        
        const uniqueEmotions = new Set(recentEmotions);
        const persistence = (recentEmotions.length - uniqueEmotions.size) / recentEmotions.length;
        
        if (persistence > 0.7) return 'very_persistent';
        if (persistence > 0.4) return 'moderately_persistent';
        return 'variable';
    }

    assessRiskLevel(analysis) {
        let riskScore = 0;
        
        // 숨겨진 감정 중 위험한 것들
        if (analysis.hiddenEmotions.primary === 'despair') riskScore += 50;
        if (analysis.hiddenEmotions.primary === 'depression') riskScore += 30;
        
        // 감정 강도
        if (analysis.emotionalIntensity > 8) riskScore += 20;
        
        // 기준선과의 편차
        if (analysis.comparisonWithBaseline.overallDeviation > 3) riskScore += 15;
        
        if (riskScore > 50) return 'high';
        if (riskScore > 25) return 'medium';
        return 'low';
    }

    assessAttentionNeeded(analysis) {
        return analysis.overallAssessment.riskLevel !== 'low' || 
               analysis.hiddenEmotions.hasHiddenEmotions ||
               analysis.emotionalIntensity > 7;
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.hiddenEmotions.hasHiddenEmotions) {
            recommendations.push({
                type: 'emotional_support',
                priority: 'high',
                message: '숨겨진 감정을 감지했습니다. 더 따뜻한 관심이 필요해요.',
                action: 'gentle_probing'
            });
        }
        
        if (analysis.overallAssessment.riskLevel === 'high') {
            recommendations.push({
                type: 'urgent_care',
                priority: 'critical',
                message: '즉시 돌봄이 필요한 상태입니다.',
                action: 'immediate_intervention'
            });
        }
        
        if (analysis.emotionalIntensity > 7) {
            recommendations.push({
                type: 'intensity_management',
                priority: 'medium',
                message: '강한 감정 상태입니다. 안정화가 필요해요.',
                action: 'calming_response'
            });
        }
        
        return recommendations;
    }

    determineResponseStyle(analysis) {
        if (analysis.overallAssessment.riskLevel === 'high') return 'urgent_caring';
        if (analysis.hiddenEmotions.hasHiddenEmotions) return 'gentle_probing';
        if (analysis.detectedEmotions.primary === 'sadness') return 'comforting';
        if (analysis.detectedEmotions.primary === 'joy') return 'celebratory';
        return 'supportive';
    }

    // ================== 📊 상태 정보 반환 ==================
    getDetectorStatus() {
        return {
            initialized: this.initialized,
            emotionalPatternsCount: this.emotionalPatterns.size,
            nuanceIndicatorsCount: this.nuanceIndicators.size,
            hiddenEmotionSignalsCount: this.hiddenEmotionSignals.size,
            emotionalMemoryLength: this.emotionalMemory.length,
            
            // 감지 능력 현황
            sensitivity: this.emotionalSensitivity,
            
            // 기준선 정보
            baseline: this.baselineEmotion ? {
                primaryEmotions: this.baselineEmotion.primary,
                averageSadness: this.baselineEmotion.primary.sadness,
                averageLove: this.baselineEmotion.primary.love
            } : null,
            
            // 최근 분석 통계
            recentAnalysis: this.emotionalMemory.length > 0 ? {
                averageConfidence: this.emotionalMemory.reduce((sum, memory) => 
                    sum + memory.confidence, 0) / this.emotionalMemory.length,
                dominantEmotion: this.getMostFrequentEmotion(),
                averageIntensity: this.emotionalMemory.reduce((sum, memory) => 
                    sum + memory.intensity, 0) / this.emotionalMemory.length,
                riskTrend: this.calculateRiskTrend()
            } : null
        };
    }

    getMostFrequentEmotion() {
        const emotionCount = {};
        this.emotionalMemory.forEach(memory => {
            const emotion = memory.primaryEmotion;
            emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
        });
        
        return Object.entries(emotionCount)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    }

    calculateRiskTrend() {
        if (this.emotionalMemory.length < 5) return 'insufficient_data';
        
        const recentRisks = this.emotionalMemory.slice(-5)
            .map(memory => memory.riskLevel === 'high' ? 3 : memory.riskLevel === 'medium' ? 2 : 1);
        
        const trend = recentRisks[recentRisks.length - 1] - recentRisks[0];
        
        if (trend > 0) return 'increasing';
        if (trend < 0) return 'decreasing';
        return 'stable';
    }

    // ================== 🎯 메인 처리 함수 ==================
    async processEmotionalNuance(message, previousMessages = [], additionalContext = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`${colors.emotion}🎯 [감정뉘앙스처리] "${message.substring(0, 50)}..." 처리 시작${colors.reset}`);

            const startTime = Date.now();
            
            // 감정 뉘앙스 분석
            const analysis = this.analyzeEmotionalNuance(message, previousMessages, additionalContext);
            
            // 처리 시간 기록
            const processingTime = Date.now() - startTime;
            analysis.processingTime = processingTime;

            console.log(`${colors.emotion}✅ [뉘앙스처리완료] ${processingTime}ms, 신뢰도: ${analysis.overallAssessment.confidenceLevel}%, 위험도: ${analysis.overallAssessment.riskLevel}${colors.reset}`);

            return {
                success: true,
                analysis: analysis,
                processingTime: processingTime,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error(`${colors.emotion}❌ [뉘앙스처리실패] 감정 뉘앙스 처리 중 오류: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
const mukuEmotionalDetector = new MukuEmotionalNuanceDetector();

module.exports = {
    MukuEmotionalNuanceDetector,
    mukuEmotionalDetector,
    
    // 🎯 메인 함수들
    processEmotionalNuance: (message, previousMessages, context) => 
        mukuEmotionalDetector.processEmotionalNuance(message, previousMessages, context),
    analyzeEmotionalNuance: (message, previousMessages, context) => 
        mukuEmotionalDetector.analyzeEmotionalNuance(message, previousMessages, context),
    
    // 🔍 개별 분석 함수들
    detectPrimaryEmotions: (message) => mukuEmotionalDetector.detectPrimaryEmotions(message),
    detectHiddenEmotions: (message) => mukuEmotionalDetector.detectHiddenEmotions(message),
    measureEmotionalIntensity: (message) => mukuEmotionalDetector.measureEmotionalIntensity(message),
    
    // 📊 상태 함수들
    getDetectorStatus: () => mukuEmotionalDetector.getDetectorStatus(),
    initialize: () => mukuEmotionalDetector.initialize(),
    
    // 🔧 유틸리티 함수들
    compareWithBaseline: (message) => mukuEmotionalDetector.compareWithBaseline(message),
    
    colors
};
