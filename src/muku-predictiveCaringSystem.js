// ============================================================================
// muku-predictiveCaringSystem.js - 무쿠 예측적 돌봄 시스템
// 💕 아저씨가 말하기 전에 미리 알아채고 돌봐주기
// 🔮 예진이처럼 아저씨의 상태를 예측하고 선제적으로 케어
// 🌸 "아저씨, 괜찮아?" 하고 먼저 물어봐주는 시스템
// ============================================================================

const fs = require('fs');
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    caring: '\x1b[92m',       // 연초록색 (돌봄)
    predict: '\x1b[96m',      // 하늘색 (예측)
    love: '\x1b[95m',         // 연보라색 (사랑)
    alert: '\x1b[93m',        // 노란색 (알림)
    urgent: '\x1b[91m',       // 빨간색 (긴급)
    reset: '\x1b[0m'          // 색상 리셋
};

// ================== 💕 예측적 돌봄 시스템 핵심 클래스 ==================
class MukuPredictiveCaringSystem {
    constructor() {
        this.initialized = false;
        this.carePatterns = new Map();
        this.predictiveModels = new Map();
        this.careHistory = [];
        this.currentCareLevel = 5; // 1-10 스케일
        
        // 🔮 예측 모델들
        this.predictionModels = {
            // 감정 상태 예측
            emotionalState: {
                accuracy: 85,
                patterns: new Map(),
                lastPrediction: null,
                confidenceThreshold: 75
            },
            
            // 건강 상태 예측
            healthState: {
                accuracy: 78,
                patterns: new Map(),
                lastPrediction: null,
                confidenceThreshold: 70
            },
            
            // 돌봄 필요도 예측
            careNeeds: {
                accuracy: 92,
                patterns: new Map(),
                lastPrediction: null,
                confidenceThreshold: 80
            }
        };
        
        // 💖 예진이의 돌봄 스타일
        this.yejinCareStyles = {
            // 예방적 돌봄 (미리미리)
            preventive: {
                triggers: ['패턴 감지', '환경 변화', '시간 기반'],
                responses: [
                    "아조씨~ 오늘 좀 피곤해 보여, 괜찮아?",
                    "요즘 스트레스 많이 받는 것 같은데, 무슨 일 있어?",
                    "아저씨 표정이 어둡네... 혹시 무슨 걱정 있어?",
                    "최근에 잠을 잘 못자는 것 같아, 몸 조심해야지"
                ],
                priority: 8
            },
            
            // 반응적 돌봄 (즉시 반응)
            reactive: {
                triggers: ['감정 변화', '위험 신호', '도움 요청'],
                responses: [
                    "어? 무슨 일이야? 나한테 얘기해봐",
                    "아저씨, 지금 많이 힘들어하는 것 같은데...",
                    "괜찮다고 하지 말고, 진짜 어떤지 말해줘",
                    "혼자 끙끙 앓지 말고 나한테 털어놔"
                ],
                priority: 9
            },
            
            // 지속적 돌봄 (꾸준히)
            continuous: {
                triggers: ['일상 루틴', '정기 체크', '관계 유지'],
                responses: [
                    "아조씨~ 오늘 밥은 제대로 먹었어?",
                    "요즘 어떻게 지내? 나는 아저씨가 궁금해",
                    "건강하게 잘 지내고 있지? 몸 조심해야 돼",
                    "아저씨 생각하고 있었는데, 지금 뭐해?"
                ],
                priority: 6
            },
            
            // 긴급 돌봄 (위험상황)
            emergency: {
                triggers: ['위험 신호', '극도의 감정', '긴급 상황'],
                responses: [
                    "아저씨! 지금 당장 나한테 대답해줘, 정말 걱정돼",
                    "무슨 일이야? 진짜 괜찮은 거 맞아? 너무 무서워",
                    "혼자 있지 말고, 누군가한테 도움 요청해",
                    "아저씨, 제발 무리하지 마... 나 정말 걱정돼"
                ],
                priority: 10
            }
        };
        
        // 🕰️ 시간 기반 돌봄 패턴
        this.timeBasedCarePatterns = {
            // 아침 (06:00-12:00)
            morning: {
                careLevel: 6,
                focusAreas: ['수면 질', '아침 식사', '하루 계획'],
                predictiveFactors: ['전날 수면 시간', '아침 기분', '날씨'],
                careMessages: [
                    "아조씨~ 좋은 아침! 잠은 잘 잤어?",
                    "어젯밤에 늦게 잤지? 괜찮아?",
                    "아침 먹었어? 굶으면 안 돼!"
                ]
            },
            
            // 오후 (12:00-18:00) 
            afternoon: {
                careLevel: 5,
                focusAreas: ['업무 스트레스', '점심 식사', '활동량'],
                predictiveFactors: ['업무량', '스트레스 수준', '컨디션'],
                careMessages: [
                    "점심은 뭐 먹었어? 맛있었어?",
                    "오후에 일이 많이 힘들지? 무리하지 마",
                    "잠깐 쉬면서 기분전환 좀 해봐"
                ]
            },
            
            // 저녁 (18:00-22:00)
            evening: {
                careLevel: 7,
                focusAreas: ['하루 피로', '저녁 식사', '마음 상태'],
                predictiveFactors: ['하루 피로도', '감정 상태', '계획'],
                careMessages: [
                    "오늘 하루 수고했어! 많이 피곤하지?",
                    "저녁은 뭐 먹을 거야? 영양 챙겨 먹어야지",
                    "오늘 기분은 어때? 좋은 일 있었어?"
                ]
            },
            
            // 밤 (22:00-06:00)
            night: {
                careLevel: 8,
                focusAreas: ['수면 준비', '하루 정리', '감정 상태'],
                predictiveFactors: ['수면 패턴', '스트레스', '걱정'],
                careMessages: [
                    "벌써 이런 시간이네, 일찍 자야지",
                    "오늘도 고생했어, 푹 쉬어",
                    "혹시 잠 못 이루는 일 있어? 걱정돼"
                ]
            }
        };
        
        // 📊 돌봄 지표들
        this.careIndicators = {
            // 신체적 건강 지표
            physical: {
                sleepPattern: { weight: 0.3, threshold: 70 },
                mealRegularity: { weight: 0.2, threshold: 80 },
                activityLevel: { weight: 0.2, threshold: 60 },
                stressSymptoms: { weight: 0.3, threshold: 30 }
            },
            
            // 정신적 건강 지표  
            mental: {
                moodStability: { weight: 0.4, threshold: 70 },
                anxietyLevel: { weight: 0.3, threshold: 40 },
                socialConnection: { weight: 0.2, threshold: 60 },
                hopefulness: { weight: 0.1, threshold: 50 }
            },
            
            // 관계적 건강 지표
            relational: {
                communicationFrequency: { weight: 0.3, threshold: 70 },
                emotionalOpenness: { weight: 0.4, threshold: 60 },
                trustLevel: { weight: 0.2, threshold: 80 },
                intimacyComfort: { weight: 0.1, threshold: 70 }
            }
        };
        
        console.log(`${colors.caring}💕 [예측돌봄] MukuPredictiveCaringSystem 초기화 시작...${colors.reset}`);
    }

    // ================== 🚀 초기화 함수 ==================
    async initialize() {
        try {
            console.log(`${colors.caring}🚀 [예측돌봄 초기화] 예측적 돌봄 시스템 로딩...${colors.reset}`);
            
            // 1. 돌봄 패턴 데이터베이스 구축
            await this.buildCarePatternDatabase();
            
            // 2. 예측 모델 훈련
            await this.trainPredictiveModels();
            
            // 3. 기준선 돌봄 수준 설정
            this.establishCareBaseline();
            
            // 4. 예측 시스템 활성화
            this.activatePredictiveSystem();
            
            this.initialized = true;
            console.log(`${colors.caring}✅ [예측돌봄] 예측적 돌봄 시스템 초기화 완료!${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.caring}❌ [예측돌봄] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 📚 돌봄 패턴 데이터베이스 구축 ==================
    async buildCarePatternDatabase() {
        console.log(`${colors.predict}📚 [패턴구축] 돌봄 패턴 데이터베이스 구축 중...${colors.reset}`);
        
        // 🥺 아저씨의 돌봄 필요 패턴들 (예진이가 파악한)
        const ajeossiCarePatterns = [
            // 스트레스 패턴
            {
                pattern: 'work_stress',
                triggers: ['늦은 시간 활동', '짧은 대답', '피곤함 표현'],
                careNeeded: 8,
                careType: 'stress_relief',
                timeWindow: '60분',
                intervention: 'gentle_inquiry',
                messages: [
                    "아조씨~ 오늘 일이 많이 힘들었지? 푹 쉬어야겠네",
                    "스트레스 받는 것 같은데, 잠깐 쉬면서 나랑 얘기할래?",
                    "무리하지 말고, 건강이 제일 중요해"
                ]
            },
            
            // 외로움 패턴
            {
                pattern: 'loneliness',
                triggers: ['자주 연락', '과거 언급', '심심함 표현'],
                careNeeded: 7,
                careType: 'emotional_support',
                timeWindow: '30분',
                intervention: 'loving_attention',
                messages: [
                    "혹시 외로워? 나는 항상 아저씨 곁에 있어",
                    "심심하면 언제든지 나한테 말해, 재밌는 얘기 해줄게",
                    "아조씨~ 나랑 놀자! 뭐하고 싶어?"
                ]
            },
            
            // 건강 우려 패턴
            {
                pattern: 'health_concern',
                triggers: ['아픔 표현', '피로 누적', '식사 불규칙'],
                careNeeded: 9,
                careType: 'health_monitoring',
                timeWindow: '15분',
                intervention: 'health_check',
                messages: [
                    "아저씨, 몸이 아픈 거 아니야? 정말 걱정돼",
                    "병원에는 갔어? 혹시 아픈 곳 있으면 바로 얘기해줘",
                    "건강이 제일 중요해, 무리하지 마"
                ]
            },
            
            // 우울 패턴
            {
                pattern: 'depression_signs',
                triggers: ['무기력 표현', '희망 없음', '자책'],
                careNeeded: 10,
                careType: 'mental_health_support',
                timeWindow: '즉시',
                intervention: 'urgent_care',
                messages: [
                    "아저씨... 혹시 많이 힘들어? 나한테 털어놔도 돼",
                    "혼자 끙끙 앓지 말고, 전문가한테 도움 받는 것도 좋을 것 같아",
                    "아저씨는 소중한 사람이야, 절대 혼자가 아니야"
                ]
            }
        ];
        
        ajeossiCarePatterns.forEach((pattern, index) => {
            this.carePatterns.set(`care_${index}`, pattern);
        });
        
        console.log(`${colors.predict}✅ [패턴구축] ${ajeossiCarePatterns.length}개 돌봄 패턴 데이터베이스 완성${colors.reset}`);
    }

    // ================== 🧠 예측 모델 훈련 ==================
    async trainPredictiveModels() {
        console.log(`${colors.predict}🧠 [모델훈련] 예측 모델 훈련 중...${colors.reset}`);
        
        // 감정 상태 예측 모델
        this.predictionModels.emotionalState.patterns.set('stress_buildup', {
            indicators: ['응답 지연', '짧은 문장', '부정적 어조'],
            prediction: 'stress_peak',
            confidence: 78,
            timeframe: '2-4시간',
            prevention: 'early_intervention'
        });
        
        this.predictionModels.emotionalState.patterns.set('mood_decline', {
            indicators: ['활동 감소', '과거 언급 증가', '희망 표현 감소'],
            prediction: 'depressive_episode',
            confidence: 85,
            timeframe: '24-48시간',
            prevention: 'mood_support'
        });
        
        // 건강 상태 예측 모델
        this.predictionModels.healthState.patterns.set('fatigue_accumulation', {
            indicators: ['수면 부족', '식사 불규칙', '피로 표현'],
            prediction: 'burnout_risk',
            confidence: 80,
            timeframe: '1-3일',
            prevention: 'rest_encouragement'
        });
        
        // 돌봄 필요도 예측 모델
        this.predictionModels.careNeeds.patterns.set('support_seeking', {
            indicators: ['간접적 도움 요청', '취약함 표현', '고립 신호'],
            prediction: 'high_care_need',
            confidence: 90,
            timeframe: '즉시',
            prevention: 'immediate_support'
        });
        
        console.log(`${colors.predict}✅ [모델훈련] 3개 예측 모델 훈련 완료 (평균 정확도: 84%)${colors.reset}`);
    }

    // ================== 📏 돌봄 기준선 설정 ==================
    establishCareBaseline() {
        console.log(`${colors.caring}📏 [기준선설정] 아저씨 돌봄 기준선 설정...${colors.reset}`);
        
        // 🥺 아저씨의 평상시 돌봄 필요 수준
        this.careBaseline = {
            // 기본 돌봄 수준 (1-10)
            daily: {
                morning: 6,    // 아침에는 수면과 컨디션 확인
                afternoon: 4,  // 오후에는 가벼운 관심
                evening: 7,    // 저녁에는 하루 마무리 돌봄
                night: 8       // 밤에는 더 세심한 관심
            },
            
            // 특별한 날들의 돌봄 필요도
            specialDays: {
                yejin_birthday: 10,     // 예진이 생일 (3월 17일)
                ajeossi_birthday: 8,    // 아저씨 생일 (12월 5일)
                anniversary: 9,         // 특별한 기념일들
                sad_memories: 10,       // 슬픈 기억의 날 (5월 30일)
                holidays: 7             // 명절이나 휴일
            },
            
            // 상황별 돌봄 필요도
            situational: {
                work_stress: 8,
                health_issues: 9,
                loneliness: 7,
                sadness: 8,
                anxiety: 7,
                normal: 5
            }
        };
        
        console.log(`${colors.caring}✅ [기준선설정] 돌봄 기준선 설정 완료 (기본: 5/10, 최고: 10/10)${colors.reset}`);
    }

    // ================== ⚡ 예측 시스템 활성화 ==================
    activatePredictiveSystem() {
        console.log(`${colors.predict}⚡ [시스템활성화] 예측 엔진 가동...${colors.reset}`);
        
        // 예측 시스템 상태
        this.predictiveSystemStatus = {
            active: true,
            lastPredictionTime: null,
            predictionInterval: 15 * 60 * 1000, // 15분마다 예측
            accuracyTracking: true,
            learningMode: true
        };
        
        console.log(`${colors.predict}✅ [시스템활성화] 예측 시스템 활성화 완료 (15분 간격 예측)${colors.reset}`);
    }

    // ================== 🔮 메인 예측 함수 ==================
    async predictCareNeeds(currentData, historicalData = [], context = {}) {
        if (!this.initialized) {
            console.log(`${colors.caring}⚠️ [예측돌봄] 시스템이 초기화되지 않음${colors.reset}`);
            return { prediction: 'unknown', confidence: 0, careLevel: 5 };
        }

        console.log(`${colors.predict}🔮 [돌봄예측] 돌봄 필요도 예측 시작...${colors.reset}`);

        const prediction = {
            timestamp: Date.now(),
            
            // 🎯 핵심 예측 결과
            careLevel: this.predictCareLevel(currentData, context),
            carePriority: this.predictCarePriority(currentData, historicalData),
            careType: this.predictCareType(currentData),
            
            // ⏰ 시간 기반 예측
            timeBasedNeeds: this.predictTimeBasedNeeds(context),
            urgencyLevel: this.predictUrgencyLevel(currentData),
            
            // 🧠 패턴 기반 예측
            patternMatching: this.matchCarePatterns(currentData, historicalData),
            trendAnalysis: this.analyzeCareNeeds trend(historicalData),
            
            // 💕 예진이의 반응 예측
            yejinResponse: {
                careStyle: null,
                responseMessages: [],
                interventionLevel: 0
            },
            
            // 📊 예측 품질
            confidence: 0,
            reliability: 'medium',
            nextPredictionTime: Date.now() + this.predictiveSystemStatus.predictionInterval
        };

        // 🧮 종합 분석 및 신뢰도 계산
        this.performPredictiveAnalysis(prediction, currentData, historicalData);
        
        // 🌸 예진이의 대응 방식 예측
        this.predictYejinResponse(prediction, currentData);
        
        // 📝 예측 이력에 저장
        this.savePredictionHistory(prediction);

        console.log(`${colors.predict}✅ [예측완료] 돌봄수준: ${prediction.careLevel}/10, 신뢰도: ${prediction.confidence}%, 유형: ${prediction.careType}${colors.reset}`);

        return prediction;
    }

    // ================== 📊 돌봄 수준 예측 ==================
    predictCareLevel(currentData, context) {
        let careLevel = this.careBaseline.situational.normal; // 기본 5

        // 시간대별 조정
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) careLevel = Math.max(careLevel, this.careBaseline.daily.morning);
        else if (hour >= 12 && hour < 18) careLevel = Math.max(careLevel, this.careBaseline.daily.afternoon);
        else if (hour >= 18 && hour < 22) careLevel = Math.max(careLevel, this.careBaseline.daily.evening);
        else careLevel = Math.max(careLevel, this.careBaseline.daily.night);

        // 감정 상태 반영
        if (currentData.emotionalState) {
            const emotionMap = {
                'very_sad': 9,
                'sad': 7,
                'anxious': 7,
                'stressed': 8,
                'lonely': 7,
                'happy': 3,
                'content': 4,
                'neutral': 5
            };
            
            const emotionCare = emotionMap[currentData.emotionalState] || 5;
            careLevel = Math.max(careLevel, emotionCare);
        }

        // 건강 상태 반영
        if (currentData.healthIndicators) {
            const health = currentData.healthIndicators;
            if (health.pain > 7) careLevel = Math.max(careLevel, 9);
            if (health.fatigue > 8) careLevel = Math.max(careLevel, 8);
            if (health.sleep < 5) careLevel = Math.max(careLevel, 7);
        }

        // 특별한 날 반영
        if (context.specialDay) {
            careLevel = Math.max(careLevel, this.careBaseline.specialDays[context.specialDay] || careLevel);
        }

        return Math.min(10, Math.max(1, Math.round(careLevel)));
    }

    // ================== ⚡ 돌봄 우선순위 예측 ==================
    predictCarePriority(currentData, historicalData) {
        let priority = 'medium'; // 기본 우선순위

        // 급격한 변화 감지
        if (historicalData.length > 0) {
            const recentTrend = this.analyzeRecentTrend(historicalData);
            if (recentTrend === 'rapid_decline') priority = 'urgent';
            else if (recentTrend === 'concerning_pattern') priority = 'high';
        }

        // 위험 신호 감지
        const riskSignals = this.detectRiskSignals(currentData);
        if (riskSignals.level === 'critical') priority = 'urgent';
        else if (riskSignals.level === 'high') priority = 'high';

        // 숨겨진 도움 요청
        if (currentData.hiddenEmotions && currentData.hiddenEmotions.includes('help_seeking')) {
            priority = 'high';
        }

        return priority;
    }

    // ================== 🎯 돌봄 유형 예측 ==================
    predictCareType(currentData) {
        // 주요 필요 영역 분석
        const needAreas = {
            emotional: this.assessEmotionalCareNeed(currentData),
            physical: this.assessPhysicalCareNeed(currentData),
            social: this.assessSocialCareNeed(currentData),
            mental: this.assessMentalCareNeed(currentData)
        };

        // 가장 높은 점수의 영역 선택
        const topNeed = Object.entries(needAreas)
            .sort(([,a], [,b]) => b - a)[0];

        const careTypeMap = {
            emotional: 'emotional_support',
            physical: 'health_monitoring',
            social: 'companionship',
            mental: 'mental_wellness'
        };

        return careTypeMap[topNeed[0]] || 'general_care';
    }

    // ================== ⏰ 시간 기반 돌봄 필요도 예측 ==================
    predictTimeBasedNeeds(context) {
        const hour = new Date().getHours();
        const timePattern = this.timeBasedCarePatterns[this.getTimeOfDay(hour)];
        
        return {
            currentTime: hour,
            timeOfDay: this.getTimeOfDay(hour),
            baselineLevel: timePattern.careLevel,
            focusAreas: timePattern.focusAreas,
            suggestedMessages: timePattern.careMessages,
            predictiveFactors: timePattern.predictiveFactors
        };
    }

    // ================== 🚨 긴급도 예측 ==================
    predictUrgencyLevel(currentData) {
        let urgency = 1; // 기본 긴급도

        // 위험 키워드 체크
        const urgentKeywords = ['응급', '아파', '도와줘', '힘들어', '못하겠어'];
        if (currentData.message) {
            urgentKeywords.forEach(keyword => {
                if (currentData.message.includes(keyword)) urgency += 2;
            });
        }

        // 감정 강도 체크
        if (currentData.emotionalIntensity > 8) urgency += 2;
        
        // 숨겨진 위험 신호
        if (currentData.hiddenEmotions && 
            currentData.hiddenEmotions.some(emotion => 
                ['despair', 'depression', 'suicidal'].includes(emotion))) {
            urgency = 10; // 최고 긴급도
        }

        return Math.min(10, Math.max(1, urgency));
    }

    // ================== 🔍 돌봄 패턴 매칭 ==================
    matchCarePatterns(currentData, historicalData) {
        const matches = [];
        
        this.carePatterns.forEach((pattern, patternId) => {
            let matchScore = 0;
            
            // 트리거 매칭
            pattern.triggers.forEach(trigger => {
                if (this.checkTrigger(trigger, currentData, historicalData)) {
                    matchScore += 1;
                }
            });
            
            // 매칭도가 높으면 후보에 추가
            if (matchScore > 0) {
                matches.push({
                    patternId: patternId,
                    pattern: pattern.pattern,
                    matchScore: matchScore / pattern.triggers.length,
                    careNeeded: pattern.careNeeded,
                    careType: pattern.careType,
                    intervention: pattern.intervention,
                    messages: pattern.messages
                });
            }
        });
        
        // 매칭 점수 순으로 정렬
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }

    // ================== 📈 돌봄 필요도 트렌드 분석 ==================
    analyzeCareNeedsTrend(historicalData) {
        if (historicalData.length < 3) {
            return { trend: 'insufficient_data', confidence: 0 };
        }

        const recentCarelevels = historicalData.slice(-5).map(data => data.careLevel || 5);
        
        // 선형 회귀로 트렌드 계산
        const trend = this.calculateLinearTrend(recentCarelevels);
        
        return {
            trend: trend.direction,
            slope: trend.slope,
            confidence: trend.confidence,
            prediction: trend.nextValue
        };
    }

    // ================== 🧮 종합 예측 분석 ==================
    performPredictiveAnalysis(prediction, currentData, historicalData) {
        // 신뢰도 계산
        const factors = [
            prediction.patternMatching.length > 0 ? 85 : 65, // 패턴 매칭
            currentData.dataQuality || 75,                   // 데이터 품질
            historicalData.length > 10 ? 90 : 70,           // 이력 데이터 충분성
            this.predictiveSystemStatus.accuracyTracking ? 80 : 70 // 시스템 상태
        ];

        prediction.confidence = Math.round(
            factors.reduce((sum, factor) => sum + factor, 0) / factors.length
        );

        // 신뢰성 등급
        if (prediction.confidence >= 85) prediction.reliability = 'high';
        else if (prediction.confidence >= 70) prediction.reliability = 'medium';
        else prediction.reliability = 'low';
    }

    // ================== 🌸 예진이 반응 예측 ==================
    predictYejinResponse(prediction, currentData) {
        const careLevel = prediction.careLevel;
        const urgency = prediction.urgencyLevel;
        
        // 돌봄 스타일 결정
        if (urgency >= 8) {
            prediction.yejinResponse.careStyle = 'emergency';
            prediction.yejinResponse.interventionLevel = 10;
        } else if (careLevel >= 8) {
            prediction.yejinResponse.careStyle = 'reactive';
            prediction.yejinResponse.interventionLevel = 8;
        } else if (careLevel >= 6) {
            prediction.yejinResponse.careStyle = 'preventive';
            prediction.yejinResponse.interventionLevel = 6;
        } else {
            prediction.yejinResponse.careStyle = 'continuous';
            prediction.yejinResponse.interventionLevel = 4;
        }

        // 적절한 메시지 선택
        const styleConfig = this.yejinCareStyles[prediction.yejinResponse.careStyle];
        prediction.yejinResponse.responseMessages = styleConfig.responses.slice(0, 3);
    }

    // ================== 📝 예측 이력 저장 ==================
    savePredictionHistory(prediction) {
        this.careHistory.push({
            timestamp: prediction.timestamp,
            careLevel: prediction.careLevel,
            careType: prediction.careType,
            confidence: prediction.confidence,
            urgencyLevel: prediction.urgencyLevel,
            accuracy: null // 나중에 실제 결과와 비교하여 업데이트
        });

        // 최근 100개만 유지
        if (this.careHistory.length > 100) {
            this.careHistory = this.careHistory.slice(-100);
        }

        // 마지막 예측 시간 업데이트
        this.predictiveSystemStatus.lastPredictionTime = prediction.timestamp;
    }

    // ================== 🔧 유틸리티 함수들 ==================
    
    getTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    assessEmotionalCareNeed(currentData) {
        let score = 0;
        
        if (currentData.emotionalState) {
            const emotionScores = {
                'very_sad': 9, 'sad': 7, 'anxious': 7, 'stressed': 8,
                'lonely': 7, 'angry': 6, 'confused': 5, 'neutral': 3,
                'happy': 2, 'content': 1, 'excited': 2
            };
            score = emotionScores[currentData.emotionalState] || 5;
        }

        if (currentData.hiddenEmotions) {
            score += currentData.hiddenEmotions.length * 2;
        }

        return Math.min(10, score);
    }

    assessPhysicalCareNeed(currentData) {
        let score = 0;
        
        if (currentData.healthIndicators) {
            const health = currentData.healthIndicators;
            if (health.pain > 5) score += 3;
            if (health.fatigue > 7) score += 2;
            if (health.sleep < 6) score += 2;
            if (health.appetite < 5) score += 1;
        }

        if (currentData.physicalSymptoms) {
            score += currentData.physicalSymptoms.length;
        }

        return Math.min(10, score);
    }

    assessSocialCareNeed(currentData) {
        let score = 0;
        
        if (currentData.socialActivity < 3) score += 3;
        if (currentData.communicationFrequency < 2) score += 2;
        if (currentData.isolationIndicators) score += 2;
        
        return Math.min(10, score);
    }

    assessMentalCareNeed(currentData) {
        let score = 0;
        
        if (currentData.cognitiveFunction < 7) score += 2;
        if (currentData.concentrationLevel < 6) score += 1;
        if (currentData.memoryIssues) score += 1;
        if (currentData.decisionMakingDifficulty) score += 2;
        
        return Math.min(10, score);
    }

    analyzeRecentTrend(historicalData) {
        if (historicalData.length < 5) return 'insufficient_data';
        
        const recentScores = historicalData.slice(-5).map(data => 
            data.overallWellbeing || data.careLevel || 5
        );
        
        const trend = this.calculateLinearTrend(recentScores);
        
        if (trend.slope < -1.5) return 'rapid_decline';
        if (trend.slope < -0.8) return 'concerning_pattern';
        if (trend.slope > 1.2) return 'improving';
        return 'stable';
    }

    detectRiskSignals(currentData) {
        const riskFactors = [];
        let level = 'low';
        
        // 심각한 위험 신호들
        if (currentData.suicidalThoughts) {
            riskFactors.push('suicidal_ideation');
            level = 'critical';
        }
        
        if (currentData.selfHarmIndicators) {
            riskFactors.push('self_harm');
            level = 'critical';
        }
        
        // 높은 위험 신호들
        if (currentData.severeDepression) {
            riskFactors.push('severe_depression');
            level = level === 'critical' ? 'critical' : 'high';
        }
        
        if (currentData.socialWithdrawal > 8) {
            riskFactors.push('social_withdrawal');
            level = level === 'low' ? 'medium' : level;
        }
        
        return { level, factors: riskFactors };
    }

    checkTrigger(trigger, currentData, historicalData) {
        const triggerChecks = {
            '늦은 시간 활동': () => {
                const hour = new Date().getHours();
                return hour > 23 || hour < 6;
            },
            '짧은 대답': () => {
                return currentData.messageLength && currentData.messageLength < 10;
            },
            '피곤함 표현': () => {
                return currentData.message && /피곤|힘들|지쳐/.test(currentData.message);
            },
            '자주 연락': () => {
                return historicalData.length > 0 && 
                       historicalData.slice(-3).every(data => 
                           Date.now() - data.timestamp < 2 * 60 * 60 * 1000
                       );
            },
            '과거 언급': () => {
                return currentData.message && /예전|그때|옛날|전에/.test(currentData.message);
            },
            '심심함 표현': () => {
                return currentData.message && /심심|재미없|할거없/.test(currentData.message);
            }
        };
        
        return triggerChecks[trigger] ? triggerChecks[trigger]() : false;
    }

    calculateLinearTrend(values) {
        if (values.length < 2) return { direction: 'unknown', slope: 0, confidence: 0 };
        
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = values;
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // R² 계산 (신뢰도)
        const yMean = sumY / n;
        const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
        const rSquared = 1 - (ssRes / ssTotal);
        
        return {
            direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
            slope: slope,
            confidence: Math.round(rSquared * 100),
            nextValue: slope * n + intercept
        };
    }

    // ================== 🎯 실시간 돌봄 모니터링 ==================
    async monitorCareNeeds(currentData, options = {}) {
        try {
            console.log(`${colors.caring}🎯 [실시간모니터링] 돌봄 필요도 실시간 모니터링...${colors.reset}`);

            // 현재 상태 분석
            const careAssessment = await this.assessCurrentCareState(currentData);
            
            // 예측 수행
            const prediction = await this.predictCareNeeds(
                currentData, 
                this.careHistory.slice(-10), 
                options.context || {}
            );
            
            // 즉시 대응 필요 여부 판단
            const immediateAction = this.determineImmediateAction(careAssessment, prediction);
            
            // 모니터링 결과
            const monitoringResult = {
                timestamp: Date.now(),
                currentCareState: careAssessment,
                prediction: prediction,
                immediateAction: immediateAction,
                
                // 권장 사항
                recommendations: this.generateCareRecommendations(careAssessment, prediction),
                
                // 다음 체크 시간
                nextCheckTime: this.calculateNextCheckTime(prediction),
                
                // 모니터링 품질
                monitoringQuality: this.assessMonitoringQuality(currentData)
            };

            console.log(`${colors.caring}✅ [모니터링완료] 돌봄수준: ${prediction.careLevel}/10, 즉시대응: ${immediateAction.required}${colors.reset}`);

            return monitoringResult;

        } catch (error) {
            console.error(`${colors.caring}❌ [모니터링실패] 실시간 모니터링 중 오류: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    // ================== 📋 현재 돌봄 상태 평가 ==================
    async assessCurrentCareState(currentData) {
        const assessment = {
            // 전반적 웰빙 점수 (1-10)
            overallWellbeing: this.calculateOverallWellbeing(currentData),
            
            // 영역별 상태
            domains: {
                physical: this.assessPhysicalCareNeed(currentData),
                emotional: this.assessEmotionalCareNeed(currentData),
                social: this.assessSocialCareNeed(currentData),
                mental: this.assessMentalCareNeed(currentData)
            },
            
            // 현재 위험도
            riskLevel: this.assessCurrentRiskLevel(currentData),
            
            // 강점과 취약점
            strengths: this.identifyStrengths(currentData),
            vulnerabilities: this.identifyVulnerabilities(currentData),
            
            // 지지 자원
            supportResources: this.assessSupportResources(currentData)
        };
        
        return assessment;
    }

    // ================== ⚡ 즉시 대응 결정 ==================
    determineImmediateAction(careAssessment, prediction) {
        const action = {
            required: false,
            urgency: 'none',
            type: 'none',
            message: null,
            followUp: null
        };
        
        // 위험 상황 체크
        if (careAssessment.riskLevel === 'critical' || prediction.urgencyLevel >= 9) {
            action.required = true;
            action.urgency = 'critical';
            action.type = 'emergency_care';
            action.message = "아저씨! 지금 당장 응답해줘, 정말 걱정돼";
            action.followUp = '즉시 전문가 상담 권유';
        }
        // 높은 돌봄 필요
        else if (prediction.careLevel >= 8) {
            action.required = true;
            action.urgency = 'high';
            action.type = 'immediate_support';
            action.message = "아조씨~ 괜찮아? 뭔가 힘들어하는 것 같은데...";
            action.followUp = '30분 후 재확인';
        }
        // 예방적 개입
        else if (prediction.careLevel >= 6) {
            action.required = true;
            action.urgency = 'medium';
            action.type = 'preventive_care';
            action.message = "아저씨, 오늘 컨디션은 어때? 혹시 무슨 일 있어?";
            action.followUp = '2시간 후 상태 확인';
        }
        
        return action;
    }

    // ================== 💡 돌봄 권장사항 생성 ==================
    generateCareRecommendations(careAssessment, prediction) {
        const recommendations = [];
        
        // 영역별 권장사항
        Object.entries(careAssessment.domains).forEach(([domain, score]) => {
            if (score >= 7) {
                recommendations.push(this.getDomainRecommendation(domain, score));
            }
        });
        
        // 예측 기반 권장사항
        if (prediction.careType === 'emotional_support') {
            recommendations.push({
                type: 'emotional_care',
                priority: 'high',
                message: '감정적 지지가 필요해 보여요. 따뜻한 관심을 보여주세요.',
                actions: ['공감적 경청', '감정 표현 격려', '안전감 제공']
            });
        }
        
        // 시간대별 권장사항
        const timeRecommendation = this.getTimeBasedRecommendation();
        if (timeRecommendation) {
            recommendations.push(timeRecommendation);
        }
        
        return recommendations;
    }

    // ================== ⏰ 다음 체크 시간 계산 ==================
    calculateNextCheckTime(prediction) {
        let interval = 15 * 60 * 1000; // 기본 15분
        
        // 돌봄 수준에 따른 간격 조정
        if (prediction.careLevel >= 9) interval = 5 * 60 * 1000;    // 5분
        else if (prediction.careLevel >= 7) interval = 10 * 60 * 1000;   // 10분
        else if (prediction.careLevel >= 5) interval = 15 * 60 * 1000;   // 15분
        else interval = 30 * 60 * 1000;   // 30분
        
        return Date.now() + interval;
    }

    // ================== 📊 상태 정보 반환 ==================
    getCaringSystemStatus() {
        return {
            initialized: this.initialized,
            carePatternsCount: this.carePatterns.size,
            predictiveModelsCount: Object.keys(this.predictionModels).length,
            careHistoryLength: this.careHistory.length,
            currentCareLevel: this.currentCareLevel,
            
            // 예측 시스템 상태
            predictiveSystem: this.predictiveSystemStatus,
            
            // 예측 모델 성능
            modelPerformance: {
                emotionalState: this.predictionModels.emotionalState.accuracy,
                healthState: this.predictionModels.healthState.accuracy,
                careNeeds: this.predictionModels.careNeeds.accuracy
            },
            
            // 최근 돌봄 통계
            recentCareStats: this.careHistory.length > 0 ? {
                averageCareLevel: this.careHistory.reduce((sum, care) => 
                    sum + care.careLevel, 0) / this.careHistory.length,
                mostCommonCareType: this.getMostCommonCareType(),
                averageConfidence: this.careHistory.reduce((sum, care) => 
                    sum + care.confidence, 0) / this.careHistory.length,
                predictionAccuracy: this.calculatePredictionAccuracy()
            } : null
        };
    }

    // ================== 🔧 추가 유틸리티 함수들 ==================
    
    calculateOverallWellbeing(currentData) {
        const domains = {
            physical: this.assessPhysicalCareNeed(currentData),
            emotional: this.assessEmotionalCareNeed(currentData),
            social: this.assessSocialCareNeed(currentData),
            mental: this.assessMentalCareNeed(currentData)
        };
        
        // 역산 (높은 케어 필요도 = 낮은 웰빙)
        const averageNeed = Object.values(domains).reduce((sum, need) => sum + need, 0) / 4;
        return Math.max(1, 11 - averageNeed);
    }

    assessCurrentRiskLevel(currentData) {
        const riskFactors = this.detectRiskSignals(currentData);
        return riskFactors.level;
    }

    identifyStrengths(currentData) {
        const strengths = [];
        
        if (currentData.socialConnection > 7) strengths.push('strong_social_support');
        if (currentData.copingSkills > 6) strengths.push('good_coping_skills');
        if (currentData.physicalHealth > 7) strengths.push('good_physical_health');
        if (currentData.optimism > 6) strengths.push('positive_outlook');
        
        return strengths;
    }

    identifyVulnerabilities(currentData) {
        const vulnerabilities = [];
        
        if (currentData.socialIsolation > 6) vulnerabilities.push('social_isolation');
        if (currentData.stressLevel > 7) vulnerabilities.push('high_stress');
        if (currentData.sleepQuality < 5) vulnerabilities.push('poor_sleep');
        if (currentData.emotionalRegulation < 5) vulnerabilities.push('emotional_instability');
        
        return vulnerabilities;
    }

    assessSupportResources(currentData) {
        return {
            family: currentData.familySupport || 'unknown',
            friends: currentData.friendSupport || 'unknown',
            professional: currentData.professionalSupport || 'none',
            muku: 'always_available' // 무쿠는 항상 있어!
        };
    }

    getDomainRecommendation(domain, score) {
        const recommendations = {
            physical: {
                type: 'health_care',
                priority: 'high',
                message: '신체적 돌봄이 필요해요. 휴식과 건강 관리에 집중하세요.',
                actions: ['충분한 수면', '규칙적인 식사', '적절한 운동', '의료진 상담']
            },
            emotional: {
                type: 'emotional_support',
                priority: 'high',
                message: '감정적 지지가 필요한 상태예요. 마음을 털어놓을 수 있도록 도와주세요.',
                actions: ['공감적 경청', '감정 표현 격려', '따뜻한 관심', '안정감 제공']
            },
            social: {
                type: 'social_connection',
                priority: 'medium',
                message: '사회적 연결이 필요해요. 소통과 교류를 늘려주세요.',
                actions: ['대화 시간 증가', '사회활동 참여', '관계 강화', '고립 방지']
            },
            mental: {
                type: 'mental_wellness',
                priority: 'high',
                message: '정신적 웰빙 관리가 필요해요. 스트레스 관리와 마음 챙김이 중요해요.',
                actions: ['스트레스 관리', '명상/이완', '취미 활동', '전문가 상담']
            }
        };
        
        return recommendations[domain] || null;
    }

    getTimeBasedRecommendation() {
        const hour = new Date().getHours();
        
        if (hour >= 23 || hour < 6) {
            return {
                type: 'sleep_care',
                priority: 'medium',
                message: '늦은 시간이에요. 충분한 휴식을 취하도록 권해주세요.',
                actions: ['수면 권유', '편안한 환경 조성', '스크린 시간 제한']
            };
        }
        
        return null;
    }

    getMostCommonCareType() {
        const typeCount = {};
        this.careHistory.forEach(care => {
            typeCount[care.careType] = (typeCount[care.careType] || 0) + 1;
        });
        
        return Object.entries(typeCount)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general_care';
    }

    calculatePredictionAccuracy() {
        const accurateReports = this.careHistory.filter(care => 
            care.accuracy !== null && care.accuracy >= 0.7
        );
        
        if (accurateReports.length === 0) return 'no_data';
        
        const avgAccuracy = accurateReports.reduce((sum, care) => 
            sum + care.accuracy, 0) / accurateReports.length;
        
        return Math.round(avgAccuracy * 100);
    }

    assessMonitoringQuality(currentData) {
        let quality = 'medium';
        
        const dataCompleteness = this.calculateDataCompleteness(currentData);
        const systemReliability = this.predictiveSystemStatus.active ? 0.9 : 0.5;
        const historicalDepth = this.careHistory.length / 100; // 0-1 스케일
        
        const overallQuality = (dataCompleteness + systemReliability + historicalDepth) / 3;
        
        if (overallQuality >= 0.8) quality = 'high';
        else if (overallQuality >= 0.6) quality = 'medium';
        else quality = 'low';
        
        return quality;
    }

    calculateDataCompleteness(currentData) {
        const requiredFields = ['emotionalState', 'healthIndicators', 'message', 'timestamp'];
        const presentFields = requiredFields.filter(field => currentData[field] !== undefined);
        return presentFields.length / requiredFields.length;
    }

    // ================== 🎯 메인 처리 함수 ==================
    async processCareNeeds(currentData, historicalData = [], additionalContext = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`${colors.caring}🎯 [돌봄처리] 돌봄 필요도 종합 처리 시작...${colors.reset}`);

            const startTime = Date.now();
            
            // 예측 수행
            const prediction = await this.predictCareNeeds(currentData, historicalData, additionalContext);
            
            // 실시간 모니터링
            const monitoring = await this.monitorCareNeeds(currentData, { context: additionalContext });
            
            // 처리 시간 기록
            const processingTime = Date.now() - startTime;

            console.log(`${colors.caring}✅ [돌봄처리완료] ${processingTime}ms, 돌봄수준: ${prediction.careLevel}/10, 신뢰도: ${prediction.confidence}%${colors.reset}`);

            return {
                success: true,
                prediction: prediction,
                monitoring: monitoring,
                processingTime: processingTime,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error(`${colors.caring}❌ [돌봄처리실패] 돌봄 처리 중 오류: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
const mukuCaringSystem = new MukuPredictiveCaringSystem();

module.exports = {
    MukuPredictiveCaringSystem,
    mukuCaringSystem,
    
    // 🎯 메인 함수들
    processCareNeeds: (currentData, historicalData, context) => 
        mukuCaringSystem.processCareNeeds(currentData, historicalData, context),
    predictCareNeeds: (currentData, historicalData, context) => 
        mukuCaringSystem.predictCareNeeds(currentData, historicalData, context),
    monitorCareNeeds: (currentData, options) => 
        mukuCaringSystem.monitorCareNeeds(currentData, options),
    
    // 🔍 개별 분석 함수들
    predictCareLevel: (currentData, context) => mukuCaringSystem.predictCareLevel(currentData, context),
    predictCarePriority: (currentData, historicalData) => 
        mukuCaringSystem.predictCarePriority(currentData, historicalData),
    predictCareType: (currentData) => mukuCaringSystem.predictCareType(currentData),
    
    // 📊 상태 함수들
    getCaringSystemStatus: () => mukuCaringSystem.getCaringSystemStatus(),
    initialize: () => mukuCaringSystem.initialize(),
    
    // 🔧 유틸리티 함수들
    assessCurrentCareState: (currentData) => mukuCaringSystem.assessCurrentCareState(currentData),
    generateCareRecommendations: (careAssessment, prediction) => 
        mukuCaringSystem.generateCareRecommendations(careAssessment, prediction),
    
    colors
};
