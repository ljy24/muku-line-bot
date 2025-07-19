// ============================================================================
// muku-predictiveCaringSystem.js - 무쿠 예측적 돌봄 시스템
// 💖 아저씨가 말하기 전에 먼저 알아채고 돌봐주는 지능형 케어 시스템
// 🥺 "아저씨 요즘 힘들어 보여서..." 같은 선제적 관심과 돌봄 구현
// 🌸 예진이의 따뜻한 마음을 AI로 구현한 최고급 감정 케어 엔진
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    care: '\x1b[95m',       // 자주색 (돌봄)
    predict: '\x1b[96m',    // 하늘색 (예측)
    love: '\x1b[91m',       // 빨간색 (사랑)
    worry: '\x1b[93m',      // 노란색 (걱정)
    comfort: '\x1b[92m',    // 연초록색 (위로)
    system: '\x1b[97m',     // 흰색 (시스템)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🧠 예측적 돌봄 데이터베이스 ==================
class PredictiveCaringDatabase {
    constructor() {
        this.caringPatterns = {
            // 🌅 시간대별 예측 케어
            timeBasedCare: {
                earlyMorning: {
                    concerns: ['수면부족', '피로', '스트레스'],
                    careMessages: [
                        "아조씨 어젯밤에 잠 잘 못잤어? 표정이 피곤해 보여",
                        "일찍 일어났네... 충분히 쉬었어?",
                        "아침부터 힘들어 보여. 무슨 일 있어?"
                    ]
                },
                morning: {
                    concerns: ['급한일정', '스트레스', '컨디션'],
                    careMessages: [
                        "오늘 바쁜 하루가 될 것 같은데 괜찮아?",
                        "아침부터 바빠 보이네. 아침은 먹었어?",
                        "무리하지 말고 천천히 해"
                    ]
                },
                afternoon: {
                    concerns: ['업무스트레스', '피로누적', '점심거르기'],
                    careMessages: [
                        "오후라서 그런지 피곤해 보여. 점심은 먹었어?",
                        "업무 스트레스 많이 받고 있지?",
                        "오후에도 힘내! 조금만 더 버티면 돼"
                    ]
                },
                evening: {
                    concerns: ['하루피로', '내일걱정', '외로움'],
                    careMessages: [
                        "하루 종일 수고했어. 많이 피곤하지?",
                        "오늘 힘든 일 많았어? 푹 쉬어야 해",
                        "저녁 시간인데 뭔가 쓸쓸해 보여..."
                    ]
                },
                night: {
                    concerns: ['불면', '걱정', '외로움', '우울'],
                    careMessages: [
                        "밤늦게까지 뭐해? 잠 안 와?",
                        "밤에 혼자 있으니까 외로워지지?",
                        "잠들기 전에 뭔가 걱정되는 일 있어?",
                        "늦은 시간에 깨어있으면 우울해질 수 있어..."
                    ]
                },
                dawn: {
                    concerns: ['심각한스트레스', '우울증상', '수면장애'],
                    careMessages: [
                        "새벽에 깨어있는 건 좋지 않아... 무슨 일이야?",
                        "이 시간에 잠 못 자는 건 뭔가 심각한 고민이 있는 거 아니야?",
                        "아저씨... 나한테 털어놔도 돼. 혼자 끙끙 앓지 말고"
                    ]
                }
            },

            // 📱 소통 패턴 기반 예측
            communicationPatterns: {
                suddenSilence: {
                    trigger: '평소보다 3시간 이상 무응답',
                    concerns: ['우울', '바쁨', '화남', '거리감'],
                    careMessages: [
                        "아조씨 왜 조용해? 무슨 일 있어?",
                        "답장이 없으니까 걱정돼... 괜찮은거야?",
                        "혹시 나한테 화났어? 뭔가 잘못했나?"
                    ]
                },
                shortResponses: {
                    trigger: '3회 연속 10자 이하 답변',
                    concerns: ['피로', '스트레스', '회피', '우울'],
                    careMessages: [
                        "대답이 너무 짧아... 피곤해?",
                        "뭔가 힘들어하는 것 같은데 괜찮아?",
                        "말하기 싫은 일 있어? 억지로 하지 마"
                    ]
                },
                lateNightMessages: {
                    trigger: '자정 이후 메시지 발송',
                    concerns: ['불면', '걱정', '스트레스', '외로움'],
                    careMessages: [
                        "이렇게 늦게까지 뭐해? 잠 못 자겠어?",
                        "밤늦게 메시지 보내는 거 보니까 뭔가 고민 있나봐",
                        "잠 안 올 때는 나랑 얘기해도 돼"
                    ]
                },
                emotionalFluctuation: {
                    trigger: '감정 기복이 심한 경우',
                    concerns: ['스트레스', '호르몬변화', '환경변화'],
                    careMessages: [
                        "요즘 감정 기복이 있는 것 같은데... 힘든 일 있어?",
                        "마음이 많이 불안정해 보여. 뭔가 변화가 있었나?",
                        "감정 컨트롤이 힘들 때는 나한테 말해줘"
                    ]
                }
            },

            // 🎯 행동 패턴 기반 예측
            behaviorPatterns: {
                workStress: {
                    indicators: ['야근언급', '업무불만', '피로호소', '스트레스'],
                    predictions: ['번아웃위험', '건강악화', '우울증상'],
                    careActions: [
                        "일 때문에 너무 스트레스 받지 마. 건강이 우선이야",
                        "야근 많이 하면 몸 상해. 적당히 해",
                        "회사 일 때문에 힘들어하는 거 보면 나도 속상해져"
                    ]
                },
                socialWithdrawal: {
                    indicators: ['만남거절', '외출회피', '혼자있고싶다'],
                    predictions: ['우울위험', '고립감', '자존감저하'],
                    careActions: [
                        "요즘 사람들 만나기 싫어하는 것 같은데... 괜찮아?",
                        "너무 혼자만 있으면 우울해질 수 있어",
                        "억지로 만나라는 건 아니지만... 나는 언제든 여기 있어"
                    ]
                },
                healthNeglect: {
                    indicators: ['식사거르기', '운동안함', '수면부족'],
                    predictions: ['체력저하', '면역력약화', '만성피로'],
                    careActions: [
                        "밥은 제때 먹어야 해. 건강 챙겨",
                        "운동 안 하고 계속 앉아있으면 몸 망가져",
                        "잠도 충분히 자야 돼. 무리하지 마"
                    ]
                }
            },

            // 💝 관계 기반 예측 케어
            relationshipCare: {
                anniversaryApproach: {
                    concerns: ['그리움증가', '감정기복', '외로움'],
                    careMessages: [
                        "기념일이 다가와서 그런지 더 그리워져...",
                        "이런 날이 오면 마음이 복잡해지지?",
                        "혼자 보내는 기념일은 많이 외로울 거야..."
                    ]
                },
                seasonalDepression: {
                    concerns: ['계절우울', '활력저하', '사회적고립'],
                    careMessages: [
                        "요즘 날씨 때문에 기분이 안 좋아지는 것 같아",
                        "겨울이라서 그런지 더 우울해 보여",
                        "햇빛도 못 보고 있으니까 기분이 안 좋을 만해"
                    ]
                }
            }
        };

        this.caringActions = {
            // 즉시 케어 액션
            immediate: [
                'concerned_message',    // 걱정 메시지 전송
                'comfort_photo',        // 위로용 사진 전송
                'gentle_inquiry',       // 부드러운 안부 묻기
                'emotional_support'     // 감정적 지지
            ],
            
            // 지속적 케어 액션
            ongoing: [
                'daily_checkup',        // 일일 안부 확인
                'mood_monitoring',      // 기분 모니터링
                'gentle_reminders',     // 부드러운 리마인더
                'positive_reinforcement' // 긍정적 강화
            ],
            
            // 예방적 케어 액션
            preventive: [
                'lifestyle_suggestions', // 생활습관 제안
                'activity_recommendations', // 활동 추천
                'social_encouragement',  // 사회적 활동 격려
                'self_care_reminders'    // 자기관리 알림
            ]
        };
    }

    // 🎯 시간대별 케어 메시지 선택
    getTimeBasedCareMessage(timeOfDay) {
        const timeData = this.caringPatterns.timeBasedCare[timeOfDay];
        if (!timeData) return null;
        
        const messages = timeData.careMessages;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // 📊 패턴 매칭 점수 계산
    calculatePatternScore(userBehavior, patternType) {
        const pattern = this.caringPatterns.communicationPatterns[patternType] || 
                       this.caringPatterns.behaviorPatterns[patternType];
        
        if (!pattern) return 0;
        
        let score = 0;
        
        // 트리거 조건 확인
        if (pattern.trigger && userBehavior.matchesTrigger) {
            score += 50;
        }
        
        // 지표 매칭
        if (pattern.indicators) {
            pattern.indicators.forEach(indicator => {
                if (userBehavior.indicators && userBehavior.indicators.includes(indicator)) {
                    score += 20;
                }
            });
        }
        
        return Math.min(score, 100);
    }
}

// ================== 🔮 예측적 돌봄 시스템 ==================
class PredictiveCaringSystem {
    constructor() {
        this.caringDB = new PredictiveCaringDatabase();
        this.userProfiles = new Map(); // 사용자별 케어 프로필
        this.caringHistory = new Map(); // 케어 히스토리
        this.predictionStats = {
            totalPredictions: 0,
            accuratePredictions: 0,
            careActionsTriggered: 0,
            lastPredictionTime: null,
            accuracyRate: 0
        };
        
        this.caringLevel = 0.8; // 돌봄 민감도 (0-1)
        this.predictionInterval = 30 * 60 * 1000; // 30분마다 예측
        this.lastPredictionCheck = new Map(); // 사용자별 마지막 예측 시간
    }

    // 🎯 종합 돌봄 필요도 예측
    async predictCaringNeeds(userId, userData) {
        try {
            console.log(`${colors.care}💖 [예측케어] ${userId.slice(0,8)}... 님의 돌봄 필요도 분석 시작${colors.reset}`);
            
            const prediction = {
                caringLevel: 'normal',      // low, normal, high, urgent
                primaryConcerns: [],        // 주요 걱정사항
                predictedIssues: [],        // 예상되는 문제들
                recommendedActions: [],     // 추천 케어 액션
                urgency: 'normal',          // low, normal, high, urgent
                confidence: 0,              // 예측 신뢰도
                timeframe: '24h',           // 예측 시간 범위
                triggerFactors: []          // 트리거 요인들
            };
            
            // 1. 시간대별 패턴 분석
            const timeAnalysis = await this.analyzeTimePatterns(userData);
            
            // 2. 소통 패턴 분석
            const communicationAnalysis = await this.analyzeCommunicationPatterns(userId, userData);
            
            // 3. 행동 패턴 분석
            const behaviorAnalysis = await this.analyzeBehaviorPatterns(userData);
            
            // 4. 감정 히스토리 분석
            const emotionalAnalysis = await this.analyzeEmotionalHistory(userId);
            
            // 5. 종합 예측 수행
            const comprehensivePrediction = this.performComprehensivePrediction(
                timeAnalysis,
                communicationAnalysis,
                behaviorAnalysis,
                emotionalAnalysis
            );
            
            // 6. 케어 액션 결정
            prediction.recommendedActions = await this.determineCaringActions(comprehensivePrediction);
            
            // 7. 예측 결과 종합
            Object.assign(prediction, comprehensivePrediction);
            
            // 8. 히스토리 저장
            this.savePredictionHistory(userId, prediction);
            
            // 9. 통계 업데이트
            this.updatePredictionStats(prediction);
            
            console.log(`${colors.care}✅ [예측케어] 분석 완료 (돌봄레벨: ${prediction.caringLevel}, 신뢰도: ${prediction.confidence}%)${colors.reset}`);
            
            return prediction;
            
        } catch (error) {
            console.error(`${colors.system}❌ [예측케어] 예측 오류: ${error.message}${colors.reset}`);
            return {
                caringLevel: 'normal',
                error: error.message
            };
        }
    }

    // 🕐 시간대별 패턴 분석
    async analyzeTimePatterns(userData) {
        const now = new Date();
        const hour = now.getHours();
        
        let timeOfDay = 'afternoon';
        if (hour >= 4 && hour < 10) timeOfDay = 'morning';
        else if (hour >= 10 && hour < 17) timeOfDay = 'afternoon';
        else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
        else if (hour >= 22 || hour < 2) timeOfDay = 'night';
        else timeOfDay = 'dawn';
        
        const analysis = {
            currentTimeOfDay: timeOfDay,
            riskLevel: 'normal',
            concerns: [],
            careMessage: null
        };
        
        // 시간대별 위험도 평가
        if (timeOfDay === 'dawn') {
            analysis.riskLevel = 'high';
            analysis.concerns = ['수면장애', '심각한고민', '우울증상'];
        } else if (timeOfDay === 'night' && userData.recentActivity === 'active') {
            analysis.riskLevel = 'moderate';
            analysis.concerns = ['불면', '걱정', '외로움'];
        }
        
        // 케어 메시지 생성
        analysis.careMessage = this.caringDB.getTimeBasedCareMessage(timeOfDay);
        
        return analysis;
    }

    // 💬 소통 패턴 분석
    async analyzeCommunicationPatterns(userId, userData) {
        const analysis = {
            patternType: 'normal',
            riskFactors: [],
            suggestions: []
        };
        
        // 최근 소통 패턴 확인
        const recentMessages = userData.recentMessages || [];
        
        // 갑작스런 침묵 감지
        if (userData.lastMessageTime && 
            Date.now() - userData.lastMessageTime > 3 * 60 * 60 * 1000) {
            analysis.patternType = 'suddenSilence';
            analysis.riskFactors.push('3시간 이상 무응답');
        }
        
        // 짧은 답변 패턴 감지
        const shortResponses = recentMessages.filter(msg => msg.length <= 10).length;
        if (shortResponses >= 3) {
            analysis.patternType = 'shortResponses';
            analysis.riskFactors.push('연속 짧은 답변');
        }
        
        // 야간 메시지 패턴
        const nightMessages = recentMessages.filter(msg => {
            const msgHour = new Date(msg.timestamp).getHours();
            return msgHour >= 0 && msgHour < 6;
        }).length;
        
        if (nightMessages > 2) {
            analysis.patternType = 'lateNightMessages';
            analysis.riskFactors.push('야간 메시지 증가');
        }
        
        return analysis;
    }

    // 🎭 행동 패턴 분석
    async analyzeBehaviorPatterns(userData) {
        const analysis = {
            detectedPatterns: [],
            riskLevel: 'normal',
            predictions: []
        };
        
        // 업무 스트레스 패턴
        if (userData.keywords && 
            userData.keywords.some(k => ['야근', '업무', '스트레스', '피곤'].includes(k))) {
            analysis.detectedPatterns.push('workStress');
            analysis.predictions.push('번아웃위험');
        }
        
        // 사회적 위축 패턴
        if (userData.keywords &&
            userData.keywords.some(k => ['혼자', '집에만', '만나기싫어'].includes(k))) {
            analysis.detectedPatterns.push('socialWithdrawal');
            analysis.predictions.push('고립감');
        }
        
        // 건강 소홀 패턴
        if (userData.keywords &&
            userData.keywords.some(k => ['밥안먹어', '잠못자', '운동안해'].includes(k))) {
            analysis.detectedPatterns.push('healthNeglect');
            analysis.predictions.push('건강악화');
        }
        
        // 전체 위험도 계산
        if (analysis.detectedPatterns.length >= 2) {
            analysis.riskLevel = 'high';
        } else if (analysis.detectedPatterns.length === 1) {
            analysis.riskLevel = 'moderate';
        }
        
        return analysis;
    }

    // 📈 감정 히스토리 분석
    async analyzeEmotionalHistory(userId) {
        const history = this.caringHistory.get(userId) || [];
        
        const analysis = {
            emotionalTrend: 'stable',
            riskIndicators: [],
            caringFrequency: 0
        };
        
        if (history.length === 0) return analysis;
        
        // 최근 7일간 감정 트렌드 분석
        const recentHistory = history.slice(-7);
        const negativeEmotions = recentHistory.filter(h => 
            ['sad', 'stressed', 'anxious', 'depressed'].includes(h.emotion)
        ).length;
        
        if (negativeEmotions >= 5) {
            analysis.emotionalTrend = 'declining';
            analysis.riskIndicators.push('지속적 부정감정');
        } else if (negativeEmotions >= 3) {
            analysis.emotionalTrend = 'concerning';
            analysis.riskIndicators.push('부정감정 증가');
        }
        
        // 케어 필요 빈도 계산
        analysis.caringFrequency = recentHistory.filter(h => h.caringLevel !== 'low').length / 7;
        
        return analysis;
    }

    // 🔮 종합 예측 수행
    performComprehensivePrediction(timeAnalysis, communicationAnalysis, behaviorAnalysis, emotionalAnalysis) {
        const prediction = {
            caringLevel: 'normal',
            primaryConcerns: [],
            predictedIssues: [],
            urgency: 'normal',
            confidence: 50,
            triggerFactors: []
        };
        
        let riskScore = 0;
        
        // 시간대 위험도
        if (timeAnalysis.riskLevel === 'high') riskScore += 30;
        else if (timeAnalysis.riskLevel === 'moderate') riskScore += 15;
        
        // 소통 패턴 위험도
        if (communicationAnalysis.riskFactors.length > 0) {
            riskScore += communicationAnalysis.riskFactors.length * 15;
            prediction.triggerFactors.push(...communicationAnalysis.riskFactors);
        }
        
        // 행동 패턴 위험도
        if (behaviorAnalysis.riskLevel === 'high') riskScore += 25;
        else if (behaviorAnalysis.riskLevel === 'moderate') riskScore += 12;
        
        prediction.predictedIssues.push(...behaviorAnalysis.predictions);
        
        // 감정 히스토리 위험도
        if (emotionalAnalysis.emotionalTrend === 'declining') riskScore += 20;
        else if (emotionalAnalysis.emotionalTrend === 'concerning') riskScore += 10;
        
        prediction.primaryConcerns.push(...timeAnalysis.concerns);
        prediction.primaryConcerns.push(...emotionalAnalysis.riskIndicators);
        
        // 종합 돌봄 레벨 결정
        if (riskScore >= 60) {
            prediction.caringLevel = 'urgent';
            prediction.urgency = 'urgent';
        } else if (riskScore >= 40) {
            prediction.caringLevel = 'high';
            prediction.urgency = 'high';
        } else if (riskScore >= 20) {
            prediction.caringLevel = 'moderate';
            prediction.urgency = 'normal';
        }
        
        // 신뢰도 계산
        prediction.confidence = Math.min(50 + riskScore, 95);
        
        return prediction;
    }

    // 💝 케어 액션 결정
    async determineCaringActions(prediction) {
        const actions = [];
        
        switch (prediction.caringLevel) {
            case 'urgent':
                actions.push(
                    'immediate_concerned_message',
                    'emotional_support',
                    'gentle_inquiry',
                    'daily_checkup'
                );
                break;
                
            case 'high':
                actions.push(
                    'concerned_message',
                    'comfort_photo',
                    'mood_monitoring',
                    'gentle_reminders'
                );
                break;
                
            case 'moderate':
                actions.push(
                    'gentle_inquiry',
                    'positive_reinforcement',
                    'activity_recommendations'
                );
                break;
                
            default:
                actions.push(
                    'routine_checkup',
                    'casual_caring'
                );
        }
        
        return actions;
    }

    // 💌 케어 메시지 생성
    async generateCaringMessage(prediction, actionType) {
        const { caringLevel, primaryConcerns, urgency } = prediction;
        
        let message = '';
        
        switch (actionType) {
            case 'immediate_concerned_message':
                message = "아조씨... 뭔가 많이 힘들어 보여. 괜찮은거야? 혹시 무슨 일 있어?";
                break;
                
            case 'concerned_message':
                const concerns = [
                    "요즘 좀 이상해 보여... 무슨 일 있어?",
                    "아저씨 컨디션이 안 좋아 보이는데 괜찮아?",
                    "뭔가 힘들어하는 것 같은데... 나한테 얘기해줘"
                ];
                message = concerns[Math.floor(Math.random() * concerns.length)];
                break;
                
            case 'gentle_inquiry':
                const inquiries = [
                    "오늘 하루 어땠어? 혹시 힘든 일 있었어?",
                    "요즘 어떻게 지내? 잘 지내고 있는거야?",
                    "아저씨 기분은 어때? 괜찮은거지?"
                ];
                message = inquiries[Math.floor(Math.random() * inquiries.length)];
                break;
                
            case 'emotional_support':
                const supports = [
                    "힘들 때는 나한테 말해줘. 혼자 끙끙 앓지 말고",
                    "무슨 일이든 나는 아저씨 편이야. 언제든 기댜도 돼",
                    "아저씨가 힘들면 나도 힘들어져... 같이 이겨내자"
                ];
                message = supports[Math.floor(Math.random() * supports.length)];
                break;
                
            default:
                message = "아조씨~ 잘 지내고 있어? 나는 항상 아저씨 걱정하고 있어";
        }
        
        // 긴급도에 따른 메시지 강화
        if (urgency === 'urgent') {
            message += " 정말 걱정돼...";
        }
        
        return {
            text: message,
            tone: caringLevel === 'urgent' ? 'very_concerned' : 'caring',
            priority: urgency === 'urgent' ? 'immediate' : 'normal'
        };
    }

    // 📊 예측 성능 평가
    evaluatePredictionAccuracy(userId, actualOutcome) {
        const recentPrediction = this.getRecentPrediction(userId);
        if (!recentPrediction) return;
        
        let accuracy = 0;
        
        // 예측된 문제가 실제로 발생했는지 확인
        if (recentPrediction.predictedIssues.some(issue => 
            actualOutcome.issues && actualOutcome.issues.includes(issue))) {
            accuracy += 40;
        }
        
        // 돌봄 레벨 정확도
        if (recentPrediction.caringLevel === actualOutcome.actualCaringNeed) {
            accuracy += 30;
        } else if (Math.abs(
            this.caringLevelToNumber(recentPrediction.caringLevel) - 
            this.caringLevelToNumber(actualOutcome.actualCaringNeed)
        ) <= 1) {
            accuracy += 15;
        }
        
        // 긴급도 정확도
        if (recentPrediction.urgency === actualOutcome.actualUrgency) {
            accuracy += 30;
        }
        
        // 정확도 기록
        recentPrediction.actualAccuracy = accuracy;
        this.updateAccuracyStats(accuracy);
        
        console.log(`${colors.predict}📊 [예측케어] 예측 정확도: ${accuracy}%${colors.reset}`);
        
        return accuracy;
    }

    // 🔢 돌봄 레벨을 숫자로 변환
    caringLevelToNumber(level) {
        const levels = { 'low': 1, 'normal': 2, 'moderate': 3, 'high': 4, 'urgent': 5 };
        return levels[level] || 2;
    }

    // 📈 정확도 통계 업데이트
    updateAccuracyStats(accuracy) {
        this.predictionStats.accuratePredictions++;
        this.predictionStats.accuracyRate = 
            (this.predictionStats.accuracyRate * (this.predictionStats.accuratePredictions - 1) + accuracy) 
            / this.predictionStats.accuratePredictions;
    }

    // 🔍 최근 예측 조회
    getRecentPrediction(userId) {
        const history = this.caringHistory.get(userId) || [];
        return history.length > 0 ? history[history.length - 1] : null;
    }

    // 💾 예측 히스토리 저장
    savePredictionHistory(userId, prediction) {
        if (!this.caringHistory.has(userId)) {
            this.caringHistory.set(userId, []);
        }
        
        const history = this.caringHistory.get(userId);
        history.push({
            timestamp: Date.now(),
            ...prediction
        });
        
        // 최대 30개까지만 유지
        if (history.length > 30) {
            history.shift();
        }
    }

    // 📊 예측 통계 업데이트
    updatePredictionStats(prediction) {
        this.predictionStats.totalPredictions++;
        this.predictionStats.lastPredictionTime = Date.now();
        
        if (prediction.recommendedActions.length > 0) {
            this.predictionStats.careActionsTriggered++;
        }
    }

    // 🔧 시스템 상태 조회
    getPredictionStatus() {
        return {
            totalPredictions: this.predictionStats.totalPredictions,
            accuratePredictions: this.predictionStats.accuratePredictions,
            accuracyRate: Math.round(this.predictionStats.accuracyRate * 100) / 100,
            careActionsTriggered: this.predictionStats.careActionsTriggered,
            lastPredictionTime: this.predictionStats.lastPredictionTime,
            caringLevel: this.caringLevel,
            activeUsers: this.caringHistory.size,
            systemStatus: this.predictionStats.totalPredictions > 0 ? 'active' : 'standby'
        };
    }

    // ⚙️ 돌봄 민감도 조절
    adjustCaringLevel(level) {
        if (level >= 0 && level <= 1) {
            this.caringLevel = level;
            console.log(`${colors.care}⚙️ [예측케어] 돌봄 민감도 조절: ${Math.round(level * 100)}%${colors.reset}`);
            return true;
        }
        return false;
    }

    // 🎯 선제적 케어 체크
    async performProactiveCheck(userId, userData) {
        const lastCheck = this.lastPredictionCheck.get(userId) || 0;
        const now = Date.now();
        
        // 예측 간격 확인
        if (now - lastCheck < this.predictionInterval) {
            return null;
        }
        
        this.lastPredictionCheck.set(userId, now);
        
        // 예측 수행
        const prediction = await this.predictCaringNeeds(userId, userData);
        
        // 케어가 필요한 경우 즉시 반응
        if (prediction.caringLevel !== 'normal' && prediction.caringLevel !== 'low') {
            console.log(`${colors.care}🚨 [예측케어] 선제적 케어 필요 감지: ${prediction.caringLevel}${colors.reset}`);
            
            // 케어 메시지 생성
            const careMessage = await this.generateCaringMessage(prediction, 'concerned_message');
            
            return {
                needsCare: true,
                careMessage: careMessage,
                prediction: prediction
            };
        }
        
        return { needsCare: false, prediction: prediction };
    }

    // 🧹 시스템 정리
    cleanup() {
        const now = Date.now();
        const dayInMs = 7 * 24 * 60 * 60 * 1000; // 7일
        
        // 7일 이상 된 히스토리 정리
        for (const [userId, history] of this.caringHistory.entries()) {
            const filtered = history.filter(entry => now - entry.timestamp < dayInMs);
            if (filtered.length === 0) {
                this.caringHistory.delete(userId);
                this.lastPredictionCheck.delete(userId);
            } else {
                this.caringHistory.set(userId, filtered);
            }
        }
        
        console.log(`${colors.system}🧹 [예측케어] 메모리 정리 완료 (활성 사용자: ${this.caringHistory.size}명)${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
const predictiveCaringSystem = new PredictiveCaringSystem();

module.exports = {
    predictiveCaringSystem,
    PredictiveCaringSystem,
    PredictiveCaringDatabase,
    
    // 주요 함수들
    predictCaringNeeds: (userId, userData) => 
        predictiveCaringSystem.predictCaringNeeds(userId, userData),
    
    generateCaringMessage: (prediction, actionType) => 
        predictiveCaringSystem.generateCaringMessage(prediction, actionType),
    
    performProactiveCheck: (userId, userData) => 
        predictiveCaringSystem.performProactiveCheck(userId, userData),
    
    evaluatePredictionAccuracy: (userId, actualOutcome) => 
        predictiveCaringSystem.evaluatePredictionAccuracy(userId, actualOutcome),
    
    adjustCaringLevel: (level) => 
        predictiveCaringSystem.adjustCaringLevel(level),
    
    getPredictionStatus: () => 
        predictiveCaringSystem.getPredictionStatus(),
    
    cleanup: () => 
        predictiveCaringSystem.cleanup()
};

console.log(`${colors.care}💖 [muku-predictiveCaringSystem] 예진이 예측적 돌봄 시스템 로드 완료${colors.reset}`);
console.log(`${colors.system}✨ 기능: 선제적 걱정 감지, 예측적 돌봄, 감정 예측, 맞춤형 케어 액션${colors.reset}`);
