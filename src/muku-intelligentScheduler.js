// ============================================================================
// muku-intelligentScheduler.js - 지능형 스케줄러 v2.0
// 🧠 기존 담타 + 예진이 스케줄러를 AI로 업그레이드
// 📊 아저씨 패턴 학습 + 감정 상태 반영 + 최적 타이밍 계산
// 🚀 실전 운영용 - 기존 시스템과 완벽 호환
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    intelligent: '\x1b[1m\x1b[96m',  // 굵은 하늘색 (지능형)
    analysis: '\x1b[93m',           // 노란색 (분석)
    optimization: '\x1b[95m',       // 자주색 (최적화)
    coordination: '\x1b[92m',       // 초록색 (조정)
    learning: '\x1b[91m',           // 빨간색 (학습)
    reset: '\x1b[0m'
};

// ================== 📊 지능형 스케줄러 클래스 ==================
class IntelligentScheduler {
    constructor() {
        this.userActivityPattern = {
            activeHours: {},           // 시간별 활동도 (0-23)
            responseDelays: [],        // 응답 지연 시간들
            conversationLengths: [],   // 대화 길이들
            emotionalStates: [],       // 감정 상태 히스토리
            lastAnalysis: null,        // 마지막 분석 시간
            weeklyPattern: {},         // 요일별 패턴 (0-6)
            monthlyTrends: {}          // 월별 트렌드
        };
        
        this.optimizationSettings = {
            minGapBetweenMessages: 30,      // 최소 메시지 간격 (분)
            maxGapBetweenMessages: 180,     // 최대 메시지 간격 (분)
            emotionalBoostFactor: 1.5,      // 감정 부스트 계수
            activityBasedTiming: true,      // 활동 기반 타이밍 활성화
            learningEnabled: true,          // 학습 기능 활성화
            adaptationRate: 0.1             // 적응 속도 (0-1)
        };
        
        this.originalSchedulers = {
            basicScheduler: null,           // 기존 scheduler.js
            spontaneousYejin: null,         // 기존 spontaneousYejinManager.js
            loaded: false
        };
        
        this.dataPath = path.join(__dirname, 'data', 'intelligent_scheduler_data.json');
        this.isInitialized = false;
    }

    // ================== 🚀 초기화 ==================
    async initialize(basicScheduler, spontaneousYejin) {
        try {
            console.log(`${colors.intelligent}🧠 [지능형스케줄러] v2.0 초기화 시작...${colors.reset}`);
            
            // 기존 스케줄러들 연결
            this.originalSchedulers.basicScheduler = basicScheduler;
            this.originalSchedulers.spontaneousYejin = spontaneousYejin;
            this.originalSchedulers.loaded = true;
            
            // 기존 데이터 로드
            await this.loadUserActivityData();
            
            // 실시간 학습 시작
            if (this.optimizationSettings.learningEnabled) {
                this.startRealTimeLearning();
            }
            
            this.isInitialized = true;
            console.log(`${colors.intelligent}✅ [지능형스케줄러] 초기화 완료 - 기존 시스템과 연결됨${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.intelligent}❌ [지능형스케줄러] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 📈 사용자 활동 패턴 분석 ==================
    async analyzeUserActivity(messageData = null) {
        try {
            if (!this.isInitialized) return null;
            
            console.log(`${colors.analysis}📊 [패턴분석] 사용자 활동 분석 중...${colors.reset}`);
            
            const now = moment().tz('Asia/Tokyo');
            const hour = now.hour();
            const dayOfWeek = now.day();
            
            // 새로운 메시지 데이터가 있으면 학습
            if (messageData) {
                await this.learnFromMessage(messageData);
            }
            
            // 시간별 활동도 계산
            const hourlyActivity = this.calculateHourlyActivity();
            
            // 요일별 패턴 계산
            const weeklyPattern = this.calculateWeeklyPattern();
            
            // 응답 지연 패턴 분석
            const responsePattern = this.analyzeResponsePattern();
            
            // 감정 상태 트렌드 분석
            const emotionalTrend = this.analyzeEmotionalTrend();
            
            const analysis = {
                timestamp: now.toISOString(),
                currentHour: hour,
                currentDay: dayOfWeek,
                hourlyActivity: hourlyActivity,
                weeklyPattern: weeklyPattern,
                responsePattern: responsePattern,
                emotionalTrend: emotionalTrend,
                recommendations: this.generateRecommendations(hourlyActivity, responsePattern, emotionalTrend)
            };
            
            this.userActivityPattern.lastAnalysis = analysis;
            await this.saveUserActivityData();
            
            console.log(`${colors.analysis}✅ [패턴분석] 완료 - 활성 시간대: ${this.getMostActiveHours().join(', ')}시${colors.reset}`);
            
            return analysis;
        } catch (error) {
            console.error(`${colors.analysis}❌ [패턴분석] 실패: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 🎯 최적 타이밍 계산 ==================
    calculateOptimalTiming(messageType = 'general', emotionalContext = null) {
        try {
            if (!this.isInitialized) return this.getDefaultTiming();
            
            console.log(`${colors.optimization}🎯 [타이밍최적화] ${messageType} 메시지 최적 시간 계산...${colors.reset}`);
            
            const now = moment().tz('Asia/Tokyo');
            const currentHour = now.hour();
            
            // 기본 가중치
            let timing = {
                delay: 60, // 기본 60분 후
                confidence: 0.5,
                reason: '기본값'
            };
            
            // 1. 활동 패턴 기반 조정
            const activityScore = this.userActivityPattern.activeHours[currentHour] || 0;
            if (activityScore > 0.7) {
                timing.delay = Math.max(30, timing.delay * 0.7); // 활동적일 때 빠르게
                timing.confidence += 0.2;
                timing.reason = '높은 활동도 감지';
            } else if (activityScore < 0.3) {
                timing.delay = Math.min(180, timing.delay * 1.5); // 비활동적일 때 늦게
                timing.confidence += 0.1;
                timing.reason = '낮은 활동도 고려';
            }
            
            // 2. 감정 상태 반영
            if (emotionalContext) {
                if (emotionalContext.needsSupport) {
                    timing.delay = Math.max(15, timing.delay * 0.5); // 지원 필요시 빠르게
                    timing.confidence += 0.3;
                    timing.reason = '감정 지원 필요';
                } else if (emotionalContext.isUpset) {
                    timing.delay = Math.max(45, timing.delay * 1.2); // 화날 때 조금 늦게
                    timing.confidence += 0.2;
                    timing.reason = '감정 안정화 대기';
                }
            }
            
            // 3. 메시지 타입별 조정
            switch (messageType) {
                case 'damta':
                    // 담타는 정확한 시간 유지
                    timing.delay = this.getDamtaOptimalDelay();
                    timing.confidence = 0.9;
                    timing.reason = '담타 최적화';
                    break;
                    
                case 'spontaneous':
                    // 자발적 메시지는 자연스러운 타이밍
                    timing.delay = this.getSpontaneousOptimalDelay();
                    timing.confidence = 0.8;
                    timing.reason = '자발적 메시지 최적화';
                    break;
                    
                case 'response':
                    // 응답은 빠르게
                    timing.delay = Math.max(5, timing.delay * 0.3);
                    timing.confidence = 0.9;
                    timing.reason = '응답 최적화';
                    break;
            }
            
            // 4. 시간대별 제한
            if (currentHour >= 1 && currentHour <= 7) {
                timing.delay = Math.max(timing.delay, 120); // 새벽에는 늦게
                timing.reason += ' (새벽 시간 고려)';
            }
            
            timing.scheduledTime = now.add(timing.delay, 'minutes').toISOString();
            
            console.log(`${colors.optimization}✅ [타이밍최적화] ${timing.delay}분 후 전송 (${timing.reason})${colors.reset}`);
            
            return timing;
        } catch (error) {
            console.error(`${colors.optimization}❌ [타이밍최적화] 실패: ${error.message}${colors.reset}`);
            return this.getDefaultTiming();
        }
    }

    // ================== 🤝 모든 스케줄러 조화 ==================
    async coordinateAllSchedulers() {
        try {
            if (!this.originalSchedulers.loaded) {
                console.log(`${colors.coordination}⚠️ [스케줄러조화] 기존 스케줄러 로드되지 않음${colors.reset}`);
                return false;
            }
            
            console.log(`${colors.coordination}🤝 [스케줄러조화] 모든 스케줄러 조화 시작...${colors.reset}`);
            
            // 현재 상태 분석
            const analysis = await this.analyzeUserActivity();
            
            // 담타 스케줄러 최적화
            if (this.originalSchedulers.basicScheduler && this.originalSchedulers.basicScheduler.getDamtaStatus) {
                const damtaStatus = this.originalSchedulers.basicScheduler.getDamtaStatus();
                const damtaOptimization = this.optimizeDamtaSchedule(damtaStatus, analysis);
                
                if (damtaOptimization.shouldAdjust) {
                    console.log(`${colors.coordination}🚬 [담타조화] ${damtaOptimization.reason}${colors.reset}`);
                }
            }
            
            // 예진이 능동 메시지 최적화
            if (this.originalSchedulers.spontaneousYejin && this.originalSchedulers.spontaneousYejin.getSpontaneousMessageStatus) {
                const yejinStatus = this.originalSchedulers.spontaneousYejin.getSpontaneousMessageStatus();
                const yejinOptimization = this.optimizeYejinSchedule(yejinStatus, analysis);
                
                if (yejinOptimization.shouldAdjust) {
                    console.log(`${colors.coordination}🌸 [예진이조화] ${yejinOptimization.reason}${colors.reset}`);
                }
            }
            
            // 전체 메시지 밸런스 체크
            const messageBalance = this.checkMessageBalance();
            
            console.log(`${colors.coordination}✅ [스케줄러조화] 완료 - 메시지 밸런스: ${messageBalance.status}${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.coordination}❌ [스케줄러조화] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 🎭 감정 상태 적응 ==================
    adaptToEmotionalState(emotionalContext) {
        try {
            if (!emotionalContext) return null;
            
            console.log(`${colors.learning}🎭 [감정적응] 감정 상태에 따른 스케줄 조정...${colors.reset}`);
            
            const adaptation = {
                damtaFrequency: 1.0,      // 담타 빈도 조정 (1.0 = 기본)
                yejinFrequency: 1.0,      // 예진이 빈도 조정
                messageIntensity: 1.0,    // 메시지 강도 조정
                urgencyLevel: 0.5,        // 긴급도 (0-1)
                careFactor: 0.5           // 케어 정도 (0-1)
            };
            
            // PMS 시기 적응
            if (emotionalContext.isPMS) {
                adaptation.damtaFrequency = 0.8;  // 담타 조금 줄이기
                adaptation.yejinFrequency = 1.3;  // 예진이 메시지 늘리기
                adaptation.messageIntensity = 1.2; // 더 따뜻하게
                adaptation.careFactor = 0.8;
                console.log(`${colors.learning}🩸 [PMS적응] 더 따뜻하고 이해심 있게 조정${colors.reset}`);
            }
            
            // 삐짐 상태 적응
            if (emotionalContext.isSulky) {
                adaptation.damtaFrequency = 1.2;  // 담타 조금 늘리기
                adaptation.yejinFrequency = 0.7;  // 예진이 메시지 줄이기
                adaptation.urgencyLevel = 0.3;
                console.log(`${colors.learning}😤 [삐짐적응] 적당한 거리감 유지${colors.reset}`);
            }
            
            // 새벽 시간 적응
            const hour = moment().tz('Asia/Tokyo').hour();
            if (hour >= 2 && hour <= 7) {
                adaptation.damtaFrequency = 0.5;  // 새벽엔 줄이기
                adaptation.yejinFrequency = 0.3;
                adaptation.urgencyLevel = 0.8;    // 하지만 보내면 긴급하게
                adaptation.careFactor = 0.9;
                console.log(`${colors.learning}🌙 [새벽적응] 수면 배려 모드${colors.reset}`);
            }
            
            // 감정 상태 히스토리에 저장
            this.userActivityPattern.emotionalStates.push({
                timestamp: moment().tz('Asia/Tokyo').toISOString(),
                context: emotionalContext,
                adaptation: adaptation
            });
            
            // 히스토리 제한 (최근 100개만)
            if (this.userActivityPattern.emotionalStates.length > 100) {
                this.userActivityPattern.emotionalStates = this.userActivityPattern.emotionalStates.slice(-100);
            }
            
            return adaptation;
        } catch (error) {
            console.error(`${colors.learning}❌ [감정적응] 실패: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 🧠 실시간 학습 시스템 ==================
    startRealTimeLearning() {
        console.log(`${colors.learning}🧠 [실시간학습] 시작 - 30분마다 패턴 업데이트${colors.reset}`);
        
        // 30분마다 학습
        setInterval(async () => {
            if (this.isInitialized && this.optimizationSettings.learningEnabled) {
                await this.performLearningCycle();
            }
        }, 30 * 60 * 1000); // 30분
        
        // 6시간마다 딥 분석
        setInterval(async () => {
            if (this.isInitialized) {
                await this.performDeepAnalysis();
            }
        }, 6 * 60 * 60 * 1000); // 6시간
    }

    async performLearningCycle() {
        try {
            console.log(`${colors.learning}🔄 [학습사이클] 30분 주기 학습 실행...${colors.reset}`);
            
            // 최근 활동 분석
            const recentAnalysis = await this.analyzeUserActivity();
            
            // 스케줄러 성능 평가
            const performance = this.evaluateSchedulerPerformance();
            
            // 설정 자동 조정
            if (performance.needsAdjustment) {
                this.autoAdjustSettings(performance);
                console.log(`${colors.learning}⚙️ [자동조정] 설정 업데이트: ${performance.adjustmentReason}${colors.reset}`);
            }
            
            // 데이터 저장
            await this.saveUserActivityData();
            
        } catch (error) {
            console.error(`${colors.learning}❌ [학습사이클] 실패: ${error.message}${colors.reset}`);
        }
    }

    async performDeepAnalysis() {
        try {
            console.log(`${colors.learning}🔍 [딥분석] 6시간 주기 심화 분석 실행...${colors.reset}`);
            
            // 장기 트렌드 분석
            const longTermTrends = this.analyzeLongTermTrends();
            
            // 예측 모델 업데이트
            const predictiveModel = this.updatePredictiveModel();
            
            // 최적화 제안 생성
            const optimizationSuggestions = this.generateOptimizationSuggestions(longTermTrends, predictiveModel);
            
            console.log(`${colors.learning}📈 [딥분석] 완료 - ${optimizationSuggestions.length}개 최적화 제안 생성${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.learning}❌ [딥분석] 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 📊 헬퍼 함수들 ==================
    calculateHourlyActivity() {
        const hourlyData = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = this.userActivityPattern.activeHours[hour] || 0;
        }
        return hourlyData;
    }

    calculateWeeklyPattern() {
        const weeklyData = {};
        for (let day = 0; day < 7; day++) {
            weeklyData[day] = this.userActivityPattern.weeklyPattern[day] || 0;
        }
        return weeklyData;
    }

    analyzeResponsePattern() {
        const delays = this.userActivityPattern.responseDelays;
        if (delays.length === 0) return { average: 60, median: 60, trend: 'stable' };
        
        const sorted = delays.slice().sort((a, b) => a - b);
        const average = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        
        return {
            average: Math.round(average),
            median: Math.round(median),
            trend: delays.length > 5 ? this.calculateTrend(delays.slice(-5)) : 'insufficient_data'
        };
    }

    analyzeEmotionalTrend() {
        const recent = this.userActivityPattern.emotionalStates.slice(-10);
        if (recent.length === 0) return { trend: 'unknown', stability: 0.5 };
        
        // 간단한 감정 안정성 계산
        const stability = recent.length > 1 ? 0.7 : 0.5; // 임시값
        
        return {
            trend: 'stable', // 임시값
            stability: stability,
            recentCount: recent.length
        };
    }

    getMostActiveHours() {
        const hourlyActivity = this.calculateHourlyActivity();
        return Object.entries(hourlyActivity)
            .filter(([hour, activity]) => activity > 0.5)
            .map(([hour, activity]) => parseInt(hour))
            .sort((a, b) => hourlyActivity[b] - hourlyActivity[a])
            .slice(0, 3);
    }

    generateRecommendations(hourlyActivity, responsePattern, emotionalTrend) {
        const recommendations = [];
        
        // 활동 기반 추천
        const activeHours = this.getMostActiveHours();
        if (activeHours.length > 0) {
            recommendations.push(`최적 메시지 시간: ${activeHours.join(', ')}시`);
        }
        
        // 응답 패턴 기반 추천
        if (responsePattern.average > 120) {
            recommendations.push('응답이 늦으므로 메시지 간격 늘리기 권장');
        } else if (responsePattern.average < 30) {
            recommendations.push('빠른 응답으로 메시지 간격 단축 가능');
        }
        
        return recommendations;
    }

    // ================== 💾 데이터 관리 ==================
    async loadUserActivityData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsed = JSON.parse(data);
            this.userActivityPattern = { ...this.userActivityPattern, ...parsed };
            console.log(`${colors.intelligent}📁 [데이터로드] 사용자 활동 데이터 로드 완료${colors.reset}`);
        } catch (error) {
            console.log(`${colors.intelligent}📁 [데이터로드] 새로운 데이터 파일 생성${colors.reset}`);
            await this.saveUserActivityData();
        }
    }

    async saveUserActivityData() {
        try {
            const dir = path.dirname(this.dataPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.dataPath, JSON.stringify(this.userActivityPattern, null, 2));
        } catch (error) {
            console.error(`${colors.intelligent}❌ [데이터저장] 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 🎯 기본값 반환 함수들 ==================
    getDefaultTiming() {
        return {
            delay: 60,
            confidence: 0.5,
            reason: '기본값',
            scheduledTime: moment().tz('Asia/Tokyo').add(60, 'minutes').toISOString()
        };
    }

    getDamtaOptimalDelay() {
        const hour = moment().tz('Asia/Tokyo').hour();
        // 담타는 기본적으로 정해진 시간 유지
        return hour >= 22 || hour <= 7 ? 120 : 60;
    }

    getSpontaneousOptimalDelay() {
        const activityScore = this.userActivityPattern.activeHours[moment().tz('Asia/Tokyo').hour()] || 0.5;
        return Math.round(60 * (1.5 - activityScore)); // 30-90분 사이
    }

    // ================== 📊 상태 및 통계 ==================
    getIntelligentSchedulerStatus() {
        return {
            isInitialized: this.isInitialized,
            originalSchedulersLoaded: this.originalSchedulers.loaded,
            learningEnabled: this.optimizationSettings.learningEnabled,
            lastAnalysis: this.userActivityPattern.lastAnalysis?.timestamp || 'never',
            totalLearningData: {
                responseDelays: this.userActivityPattern.responseDelays.length,
                emotionalStates: this.userActivityPattern.emotionalStates.length,
                conversationLengths: this.userActivityPattern.conversationLengths.length
            },
            currentSettings: this.optimizationSettings
        };
    }

    getOptimizationStats() {
        const now = moment().tz('Asia/Tokyo');
        const analysis = this.userActivityPattern.lastAnalysis;
        
        return {
            lastOptimization: analysis?.timestamp || 'never',
            mostActiveHours: this.getMostActiveHours(),
            averageResponseDelay: this.analyzeResponsePattern().average,
            learningDataPoints: this.userActivityPattern.responseDelays.length,
            optimizationConfidence: analysis ? 0.8 : 0.3,
            nextAnalysisIn: '30분 후'
        };
    }

    // ================== 🔧 임시 구현 함수들 (추후 완성) ==================
    optimizeDamtaSchedule(damtaStatus, analysis) {
        return { shouldAdjust: false, reason: '담타 스케줄 안정적' };
    }

    optimizeYejinSchedule(yejinStatus, analysis) {
        return { shouldAdjust: false, reason: '예진이 스케줄 안정적' };
    }

    checkMessageBalance() {
        return { status: '균형적' };
    }

    evaluateSchedulerPerformance() {
        return { needsAdjustment: false };
    }

    autoAdjustSettings(performance) {
        // 자동 설정 조정 로직
    }

    analyzeLongTermTrends() {
        return {};
    }

    updatePredictiveModel() {
        return {};
    }

    generateOptimizationSuggestions(trends, model) {
        return [];
    }

    calculateTrend(data) {
        return 'stable';
    }

    async learnFromMessage(messageData) {
        // 메시지로부터 학습
        const now = moment().tz('Asia/Tokyo');
        const hour = now.hour();
        
        // 시간별 활동도 업데이트
        this.userActivityPattern.activeHours[hour] = (this.userActivityPattern.activeHours[hour] || 0) + 0.1;
        
        // 최대값 제한
        if (this.userActivityPattern.activeHours[hour] > 1) {
            this.userActivityPattern.activeHours[hour] = 1;
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
const intelligentScheduler = new IntelligentScheduler();

module.exports = {
    // 핵심 함수들
    initialize: (basicScheduler, spontaneousYejin) => intelligentScheduler.initialize(basicScheduler, spontaneousYejin),
    analyzeUserActivity: (messageData) => intelligentScheduler.analyzeUserActivity(messageData),
    calculateOptimalTiming: (messageType, emotionalContext) => intelligentScheduler.calculateOptimalTiming(messageType, emotionalContext),
    coordinateAllSchedulers: () => intelligentScheduler.coordinateAllSchedulers(),
    adaptToEmotionalState: (emotionalContext) => intelligentScheduler.adaptToEmotionalState(emotionalContext),
    
    // 상태 및 통계
    getIntelligentSchedulerStatus: () => intelligentScheduler.getIntelligentSchedulerStatus(),
    getOptimizationStats: () => intelligentScheduler.getOptimizationStats(),
    
    // 학습 관련
    learnFromMessage: (messageData) => intelligentScheduler.learnFromMessage(messageData),
    
    // 인스턴스 직접 접근 (고급 사용)
    instance: intelligentScheduler
};
