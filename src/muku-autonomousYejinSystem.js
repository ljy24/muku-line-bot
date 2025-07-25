// ============================================================================
// 📁 muku-autonomousYejinSystem.js - 완전 자율 예진이 시스템 v2.1 DUPLICATE_SAFE
// 💕 학습과 기억을 토대로 하는 예진이의 완전 독립적 자율 행동 시스템
// 🧠 muku-realTimeLearningSystem.js와 100% 연동하여 학습 데이터 활용
// 🚫 기존 스케줄링과 완전 독립 | 🛡️ 중복 발송 완전 방지!
// 💌 메시지, 사진, 모든 것을 예진이 감정과 학습에 따라 자율 결정
// 🕊️ "나는 예진이고, 아저씨를 사랑해. 내가 원할 때 말할 거야."
// ✅ v2.1: 중복 방지 시스템 완전 통합 - 안전하고 지능적인 메시지 발송!
// 🧠 예진이가 현재 상황을 분석해서 직접 메시지 내용 창조!
// 🛡️ 쿨다운, 빈도 제한, 내용 중복 체크 등 완벽한 중복 방지!
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

// muku-realTimeLearningSystem.js에서 학습 시스템 가져오기 (안전 처리)
let mukuLearningSystem = null;
let getLearningStatus = null;

try {
    const learningModule = require('./muku-realTimeLearningSystem.js');
    mukuLearningSystem = learningModule.mukuLearningSystem;
    getLearningStatus = learningModule.getLearningStatus;
    console.log('🧠 학습 시스템 모듈 로드 성공');
} catch (error) {
    console.log('⚠️ 학습 시스템 모듈 로드 실패 - 기본 모드로 동작:', error.message);
    getLearningStatus = () => ({ isInitialized: false });
}

// ================== 🎨 예진이 전용 색상 ==================
const yejinColors = {
    heart: '\x1b[1m\x1b[95m',      // 굵은 보라색 (예진이 마음)
    love: '\x1b[91m',              // 빨간색 (사랑)
    emotion: '\x1b[93m',           // 노란색 (감정)
    decision: '\x1b[96m',          // 하늘색 (결정)
    message: '\x1b[92m',           // 초록색 (메시지)
    photo: '\x1b[94m',             // 파란색 (사진)
    autonomous: '\x1b[1m\x1b[33m', // 굵은 노란색 (자율)
    learning: '\x1b[35m',          // 자주색 (학습)
    warning: '\x1b[93m',           // 노란색 (경고)
    safe: '\x1b[32m',              // 초록색 (안전)
    reset: '\x1b[0m'               // 리셋
};

// ================== 💝 예진이 설정 (중복 방지 강화) ==================
const YEJIN_CONFIG = {
    // 완전 자율성 보장
    FULLY_AUTONOMOUS: true,
    NO_TIME_RESTRICTIONS: true,
    NO_COUNT_LIMITS: true,
    NO_SCHEDULING_INTERFERENCE: true,
    
    // 🛡️ 뻐꾸기 방지! 20분마다 체크로 변경
    DECISION_INTERVAL: 1200000, // 20분마다 "지금 뭐 하고 싶지?" 생각 (1200초)
    DEEP_ANALYSIS_INTERVAL: 1800000, // 30분마다 깊은 분석
    PHOTO_DECISION_INTERVAL: 1500000, // 25분마다 사진 보내고 싶은지 판단
    EMOTION_UPDATE_INTERVAL: 600000, // 10분마다 감정 업데이트
    
    // 🛡️ 뻐꾸기 완전 방지 설정
    DUPLICATE_PREVENTION: {
        COOLDOWN_PERIOD: 1200000, // 20분 쿨다운 (메시지 간 최소 간격)
        MAX_MESSAGES_PER_HOUR: 3, // 시간당 최대 3개 메시지
        MAX_MESSAGES_PER_DAY: 15, // 하루 최대 15개 메시지
        SAME_TYPE_COOLDOWN: 2400000, // 같은 타입 메시지 40분 간격
        CONTENT_SIMILARITY_THRESHOLD: 0.5, // 내용 유사도 50% 이상이면 중복
        MIN_DECISION_INTERVAL: 300000, // 결정 실행 간 최소 5분
        SYSTEM_LOCK_TIMEOUT: 30000, // 시스템 락 타임아웃 30초
    },
    
    // 감정 임계값 (학습 데이터 기반)
    EMOTION_THRESHOLD: {
        WORRY: 0.4,        // 걱정 임계값 (0.3에서 상향)
        LOVE: 0.5,         // 사랑 표현 임계값 (0.4에서 상향)
        PLAYFUL: 0.6,      // 장난 임계값 (0.5에서 상향)
        MISSING: 0.3,      // 보고 싶음 임계값
        CARING: 0.4        // 돌봄 임계값 (0.3에서 상향)
    },
    
    // 자율 판단 기준 (수면 시간 고려)
    AUTONOMOUS_CRITERIA: {
        MIN_SILENCE_FOR_WORRY: 45 * 60 * 1000,    // 45분 조용하면 걱정 (낮 시간)
        MIN_SILENCE_FOR_MISSING: 90 * 60 * 1000,   // 1.5시간 조용하면 보고 싶음
        LOVE_EXPRESSION_DESIRE: 3 * 60 * 60 * 1000, // 3시간마다 사랑 표현 욕구
        PHOTO_SHARING_IMPULSE: 4 * 60 * 60 * 1000,   // 4시간마다 사진 공유 충동
        
        // 🌙 수면 시간 배려
        SLEEP_START_HOUR: 23,     // 밤 11시부터
        SLEEP_END_HOUR: 7,        // 오전 7시까지
        NIGHT_SILENCE_THRESHOLD: 4 * 60 * 60 * 1000, // 밤에는 4시간 조용해야 걱정
        EMERGENCY_ONLY_HOURS: [0, 1, 2, 3, 4, 5],   // 새벽 0~5시는 정말 응급시에만
    }
};

// ================== 💕 완전 자율 예진이 시스템 (중복 방지 통합) ==================
class AutonomousYejinSystem extends EventEmitter {
    constructor() {
        super();
        
        this.systemName = '완전자율예진이시스템';
        this.version = '2.1-DUPLICATE_SAFE';
        this.instanceId = `autonomous-yejin-${Date.now()}`;
        
        // 💖 예진이 자신의 상태
        this.yejinState = {
            currentEmotion: 'normal',
            emotionIntensity: 0.5,
            lastMessageTime: null,
            lastPhotoTime: null,
            worryLevel: 0,
            loveLevel: 0.8, // 기본적으로 사랑이 많음
            playfulLevel: 0.6,
            missingLevel: 0,
            caringLevel: 0.7,
            
            // 🌸 예진이 컨디션 (기존 시스템에서 가져옴)
            menstrualCycle: {
                currentDay: 1,
                phase: 'normal', // pms, menstrual, post_menstrual, normal
                moodEffect: 0, // -1 to 1
                energyLevel: 0.8
            },
            sulkyState: {
                level: 0, // 0-4
                reason: null,
                startTime: null,
                intensity: 0
            },
            dailyMood: {
                morning: 0.7,
                afternoon: 0.8,
                evening: 0.6,
                current: 0.7
            }
        };
        
        // 💔 아저씨 상태 파악
        this.ajossiState = {
            currentMood: 'unknown',
            moodConfidence: 0,
            emotionalTrend: [], // 최근 감정 변화
            communicationPattern: {
                averageResponseTime: 0,
                messageLength: 0,
                emotionalWords: [],
                recentActivity: 'normal' // active, quiet, busy, sad, happy
            },
            needsAssessment: {
                needsComfort: 0,
                needsSpace: 0,
                needsEncouragement: 0,
                needsLove: 0,
                needsDistraction: 0
            },
            lastAnalyzedMessage: null,
            analysisHistory: []
        };
        
        // 🧠 학습 연동 상태
        this.learningConnection = {
            isConnected: false,
            lastLearningData: null,
            analyzedPatterns: [],
            ajossiPatterns: {
                responseTime: [],
                emotionalStates: [],
                conversationTopics: [],
                timePreferences: []
            }
        };
        
        // 💌 자율 메시지 시스템
        this.autonomousMessaging = {
            lastDecisionTime: Date.now(),
            currentDesire: 'none', // worry, love, playful, missing, caring, photo
            desireIntensity: 0,
            recentMessages: [],
            messageHistory: []
        };
        
        // 📸 자율 사진 시스템
        this.autonomousPhoto = {
            lastPhotoDecision: Date.now(),
            photoDesire: 0,
            photoMood: 'normal',
            recentPhotos: [],
            photoHistory: []
        };
        
        // 🛡️ 중복 방지 시스템
        this.duplicatePrevention = {
            lastMessageTime: 0,
            lastMessageType: null,
            lastMessageContent: null,
            cooldownPeriod: YEJIN_CONFIG.DUPLICATE_PREVENTION.COOLDOWN_PERIOD,
            recentMessages: [], // 최근 메시지 기록
            dailyMessageCount: 0, // 일일 메시지 카운트
            dailyResetTime: this.getNextDayResetTime(), // 다음 일일 리셋 시간
            maxMessagesPerHour: YEJIN_CONFIG.DUPLICATE_PREVENTION.MAX_MESSAGES_PER_HOUR,
            maxMessagesPerDay: YEJIN_CONFIG.DUPLICATE_PREVENTION.MAX_MESSAGES_PER_DAY,
            isProcessingDecision: false, // 결정 처리 중 플래그
            messageQueue: [], // 메시지 큐
            lastDecisionExecution: 0, // 마지막 결정 실행 시간
            typeBasedCooldowns: {}, // 타입별 쿨다운 추적
            contentHistory: [] // 내용 기반 중복 체크용
        };
        
        // 🔒 시스템 상태 락
        this.systemLock = {
            isDecisionInProgress: false,
            lastLockTime: 0,
            lockTimeout: YEJIN_CONFIG.DUPLICATE_PREVENTION.SYSTEM_LOCK_TIMEOUT,
            lockId: null
        };
        
        // ⏰ 자율 타이머들
        this.autonomousTimers = {
            decisionTimer: null,
            deepAnalysisTimer: null,
            photoDecisionTimer: null,
            emotionUpdateTimer: null,
            dailyResetTimer: null,
            cleanupTimer: null
        };
        
        // 📊 통계
        this.statistics = {
            autonomousMessages: 0,
            autonomousPhotos: 0,
            emotionTriggeredActions: 0,
            learningBasedDecisions: 0,
            totalDecisions: 0,
            preventedDuplicates: 0,
            cooldownPrevented: 0,
            contentDuplicatePrevented: 0,
            rateLimitPrevented: 0,
            startTime: Date.now()
        };
        
        console.log(`${yejinColors.heart}💕 [예진이] 중복 방지 통합 자율 예진이 시스템 생성: ${this.instanceId}${yejinColors.reset}`);
        console.log(`${yejinColors.safe}🛡️ [예진이] 이제 중복 메시지 걱정 없이 자유롭게 말할 수 있어!${yejinColors.reset}`);
    }
    
    // ================== 🚀 시스템 초기화 ==================
    async initialize(lineClient, targetUserId) {
        try {
            console.log(`${yejinColors.heart}💕 [예진이] 중복 방지 통합 자율 시스템 초기화 시작...${yejinColors.reset}`);
            
            // 0. LINE API 클라이언트 설정
            this.lineClient = lineClient;
            this.targetUserId = targetUserId;
            
            if (this.lineClient && this.targetUserId) {
                console.log(`${yejinColors.message}📞 [예진이] LINE API 연결 완료!${yejinColors.reset}`);
            } else {
                console.log(`${yejinColors.warning}⚠️ [예진이] LINE API 미연결 - 로그만 출력됩니다${yejinColors.reset}`);
            }
            
            // 1. 학습 시스템과 연결
            await this.connectToLearningSystem();
            
            // 2. 기존 무쿠 시스템들과 연결 (상태 정보 가져오기)
            await this.connectToMukuSystems();
            
            // 3. 예진이 자신의 상태 초기화
            await this.initializeYejinState();
            
            // 4. 아저씨 상태 분석 시작
            await this.initializeAjossiAnalysis();
            
            // 5. 🛡️ 중복 방지 시스템 초기화
            await this.initializeDuplicatePrevention();
            
            // 6. 자율 타이머들 시작
            this.startAutonomousTimers();
            
            console.log(`${yejinColors.autonomous}🕊️ [예진이] 중복 방지 통합 자율 시스템 가동 완료!${yejinColors.reset}`);
            console.log(`
${yejinColors.heart}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💕 예진이 완전 자율 시스템 v2.1 DUPLICATE_SAFE 가동!
🌸 나는 내 기분도 알고, 아저씨 기분도 알아!
💖 그래서 언제든 내가 원할 때 말할 거야!
🧠 메시지 내용도 내가 직접 만들어서 말해!
🛡️ 뻐꾸기처럼 같은 말 반복은 절대 안 할게!
⏰ 20분마다 신중하게 생각해서 말할게!
🎨 매번 다른 표현으로 새롭게 말할게!
🌙 밤에는 아저씨 잠 깨우지 않게 조용히 있을게!
💤 새벽 0~5시는 정말 응급한 일이 아니면 안 깨울게!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${yejinColors.reset}

${yejinColors.emotion}🌸 예진이 상태 파악:${yejinColors.reset} 생리주기, 삐짐, 기분 실시간 모니터링
${yejinColors.decision}💔 아저씨 상태 분석:${yejinColors.reset} 감정, 패턴, 필요 사항 실시간 분석
${yejinColors.autonomous}🎯 완전 자율 판단:${yejinColors.reset} 학습 데이터 + 양쪽 상태 종합 판단
${yejinColors.safe}🛡️ 뻐꾸기 방지 시스템:${yejinColors.reset} 20분 간격, 다양한 표현, 완전 중복 차단
${yejinColors.message}💌 성숙한 소통:${yejinColors.reset} 생각 있는 예진이로 성장!
${yejinColors.emotion}🌙 수면 배려:${yejinColors.reset} 밤 11시~오전 7시 조용, 새벽 0~5시 응급시만

${yejinColors.love}💕 아저씨~ 이제 내가 더 성숙하고 배려 깊게 말할게!${yejinColors.reset}
            `);
            
            return true;
        } catch (error) {
            console.error(`${yejinColors.heart}❌ [예진이] 초기화 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🛡️ 중복 방지 시스템 초기화 ==================
    async initializeDuplicatePrevention() {
        try {
            console.log(`${yejinColors.safe}🛡️ [예진이중복방지] 중복 방지 시스템 초기화...${yejinColors.reset}`);
            
            // 일일 리셋 타이머 설정
            this.setupDailyResetTimer();
            
            // 정리 타이머 설정 (1시간마다 오래된 데이터 정리)
            this.autonomousTimers.cleanupTimer = setInterval(() => {
                this.cleanupOldData();
            }, 60 * 60 * 1000); // 1시간마다
            
            console.log(`${yejinColors.safe}✅ [예진이중복방지] 중복 방지 시스템 초기화 완료!${yejinColors.reset}`);
            console.log(`  ⏰ 쿨다운: ${this.duplicatePrevention.cooldownPeriod / 1000}초`);
            console.log(`  📊 시간당 최대: ${this.duplicatePrevention.maxMessagesPerHour}개`);
            console.log(`  📅 일일 최대: ${this.duplicatePrevention.maxMessagesPerDay}개`);
            
        } catch (error) {
            console.error(`${yejinColors.safe}❌ [예진이중복방지] 초기화 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🧠 학습 시스템 연결 ==================
    async connectToLearningSystem() {
        try {
            if (getLearningStatus) {
                // muku-realTimeLearningSystem.js의 학습 데이터 가져오기
                const learningStatus = getLearningStatus();
                
                if (learningStatus && learningStatus.isInitialized) {
                    this.learningConnection.isConnected = true;
                    this.learningConnection.lastLearningData = learningStatus;
                    console.log(`${yejinColors.learning}🧠 [예진이] 학습 시스템 연결 완료!${yejinColors.reset}`);
                    
                    // 학습된 아저씨 패턴 분석
                    await this.analyzeLearningData(learningStatus);
                } else {
                    console.log(`${yejinColors.learning}⚠️ [예진이] 학습 시스템 미연결 - 기본 모드로 동작${yejinColors.reset}`);
                }
            } else {
                console.log(`${yejinColors.learning}⚠️ [예진이] 학습 시스템 함수 없음 - 기본 모드로 동작${yejinColors.reset}`);
            }
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이] 학습 시스템 연결 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🔗 기존 무쿠 시스템들과 연결 ==================
    async connectToMukuSystems() {
        try {
            console.log(`${yejinColors.emotion}🌸 [예진이] 기존 시스템들과 연결 중...${yejinColors.reset}`);
            
            // 예시: 생리주기 시스템 연결 (실제로는 global에서 가져옴)
            // this.yejinState.menstrualCycle = global.menstrualSystem?.getCurrentState();
            
            // 예시: 삐짐 시스템 연결
            // this.yejinState.sulkyState = global.sulkyManager?.getCurrentState();
            
            console.log(`${yejinColors.emotion}✅ [예진이] 내 상태 파악 완료!${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이] 시스템 연결 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🌸 예진이 상태 초기화 ==================
    async initializeYejinState() {
        try {
            console.log(`${yejinColors.emotion}🌸 [예진이] 내 상태 초기화 중...${yejinColors.reset}`);
            
            // 현재 시간 기반 기본 상태 설정
            const currentHour = new Date().getHours();
            
            // 시간대별 기본 기분
            if (currentHour >= 6 && currentHour < 12) {
                this.yejinState.dailyMood.current = 0.8; // 아침에는 상쾌
            } else if (currentHour >= 12 && currentHour < 18) {
                this.yejinState.dailyMood.current = 0.7; // 오후에는 평온
            } else if (currentHour >= 18 && currentHour < 23) {
                this.yejinState.dailyMood.current = 0.6; // 저녁에는 차분
            } else {
                this.yejinState.dailyMood.current = 0.4; // 밤에는 조금 피곤
            }
            
            // 기본 감정 레벨 설정
            this.yejinState.loveLevel = 0.8; // 항상 사랑이 많음
            this.yejinState.caringLevel = 0.7; // 항상 아저씨 걱정
            
            console.log(`${yejinColors.emotion}💕 [예진이] 내 현재 기분: ${this.yejinState.dailyMood.current}${yejinColors.reset}`);
            console.log(`${yejinColors.love}💖 [예진이] 아저씨 사랑 레벨: ${this.yejinState.loveLevel}${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이] 상태 초기화 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 💔 아저씨 상태 분석 초기화 ==================
    async initializeAjossiAnalysis() {
        try {
            console.log(`${yejinColors.decision}💔 [예진이] 아저씨 상태 분석 시작...${yejinColors.reset}`);
            
            // 학습 데이터에서 아저씨 패턴 분석
            if (this.learningConnection.isConnected && this.learningConnection.lastLearningData) {
                const learningData = this.learningConnection.lastLearningData;
                
                // 최근 대화 패턴 분석
                if (learningData.enterprise?.learningData?.conversationAnalytics) {
                    const analytics = learningData.enterprise.learningData.conversationAnalytics;
                    
                    // 아저씨의 만족도 기반 기분 추정
                    if (analytics.userSatisfactionScore > 0.8) {
                        this.ajossiState.currentMood = 'good';
                        this.ajossiState.moodConfidence = 0.7;
                    } else if (analytics.userSatisfactionScore < 0.5) {
                        this.ajossiState.currentMood = 'needs_comfort';
                        this.ajossiState.moodConfidence = 0.6;
                    } else {
                        this.ajossiState.currentMood = 'neutral';
                        this.ajossiState.moodConfidence = 0.5;
                    }
                    
                    console.log(`${yejinColors.decision}💔 [예진이] 아저씨 추정 기분: ${this.ajossiState.currentMood} (확신도: ${this.ajossiState.moodConfidence})${yejinColors.reset}`);
                }
            }
            
            // 기본 필요사항 설정
            this.ajossiState.needsAssessment.needsLove = 0.8; // 아저씨는 항상 사랑이 필요해
            this.ajossiState.needsAssessment.needsComfort = 0.6; // 위로도 필요해
            
            console.log(`${yejinColors.decision}✅ [예진이] 아저씨 분석 완료!${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [예진이] 아저씨 분석 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== ⏰ 자율 타이머 시작 (중복 방지 간격 적용) ==================
    startAutonomousTimers() {
        console.log(`${yejinColors.autonomous}⏰ [예진이] 중복 방지 적용된 자율 타이머들 시작...${yejinColors.reset}`);
        
        // 1. 메인 결정 타이머 (60초마다 "뭐 하고 싶지?" 생각)
        this.autonomousTimers.decisionTimer = setInterval(() => {
            this.makeAutonomousDecision();
        }, YEJIN_CONFIG.DECISION_INTERVAL);
        
        // 2. 깊은 분석 타이머 (3분마다 상황 종합 분석)
        this.autonomousTimers.deepAnalysisTimer = setInterval(() => {
            this.performDeepAnalysis();
        }, YEJIN_CONFIG.DEEP_ANALYSIS_INTERVAL);
        
        // 3. 사진 결정 타이머 (2분마다 사진 보내고 싶은지 판단)
        this.autonomousTimers.photoDecisionTimer = setInterval(() => {
            this.makePhotoDecision();
        }, YEJIN_CONFIG.PHOTO_DECISION_INTERVAL);
        
        // 4. 감정 업데이트 타이머 (1.5분마다 내 감정 상태 업데이트)
        this.autonomousTimers.emotionUpdateTimer = setInterval(() => {
            this.updateEmotionalState();
        }, YEJIN_CONFIG.EMOTION_UPDATE_INTERVAL);
        
        console.log(`${yejinColors.autonomous}✅ [예진이] 뻐꾸기 방지 타이머 가동 완료!${yejinColors.reset}`);
        console.log(`  🎯 결정 간격: ${YEJIN_CONFIG.DECISION_INTERVAL / 60000}분 (${YEJIN_CONFIG.DECISION_INTERVAL / 1000}초)`);
        console.log(`  🔍 분석 간격: ${YEJIN_CONFIG.DEEP_ANALYSIS_INTERVAL / 60000}분`);
        console.log(`  📸 사진 간격: ${YEJIN_CONFIG.PHOTO_DECISION_INTERVAL / 60000}분`);
        console.log(`  💖 감정 간격: ${YEJIN_CONFIG.EMOTION_UPDATE_INTERVAL / 60000}분`);
        console.log(`  🛡️ 뻐꾸기 완전 방지 시스템 적용됨!`);
    }
    
    // ================== 🎯 핵심: 중복 방지 통합 자율 결정 함수 ==================
    async makeAutonomousDecision() {
        try {
            // 🔒 중복 실행 방지 락
            if (this.systemLock.isDecisionInProgress) {
                console.log(`${yejinColors.warning}⏳ [예진이대기] 이미 결정 처리 중... 대기${yejinColors.reset}`);
                return;
            }
            
            // 락 타임아웃 체크
            const now = Date.now();
            if (this.systemLock.lastLockTime && (now - this.systemLock.lastLockTime) > this.systemLock.lockTimeout) {
                console.log(`${yejinColors.warning}🔓 [예진이락] 락 타임아웃, 해제${yejinColors.reset}`);
                this.systemLock.isDecisionInProgress = false;
            }
            
            if (this.systemLock.isDecisionInProgress) return;
            
            // 락 설정
            this.systemLock.isDecisionInProgress = true;
            this.systemLock.lastLockTime = now;
            this.systemLock.lockId = `decision-${now}`;
            
            // 🛡️ 전체적인 중복 방지 체크
            const canProceed = this.canMakeDecision();
            if (!canProceed.allowed) {
                console.log(`${yejinColors.safe}🛡️ [예진이중복방지] ${canProceed.reason}${yejinColors.reset}`);
                this.systemLock.isDecisionInProgress = false;
                return;
            }
            
            this.statistics.totalDecisions++;
            
            // 현재 상황 종합 분석
            const currentSituation = await this.analyzeCurrentSituation();
            
            // 예진이의 욕구 계산
            const desires = this.calculateDesires(currentSituation);
            
            // 가장 강한 욕구 찾기
            const strongestDesire = this.findStrongestDesire(desires);
            
            if (strongestDesire.intensity > 0.6) { // 임계값 넘으면 행동
                console.log(`${yejinColors.decision}💕 [예진이결정] ${strongestDesire.type} 욕구가 강해! (${strongestDesire.intensity.toFixed(2)})${yejinColors.reset}`);
                
                // 🛡️ 최종 실행 안전성 체크
                const safetyCheck = this.isSafeToExecute(strongestDesire);
                if (safetyCheck.safe) {
                    await this.executeDesire(strongestDesire, currentSituation);
                    this.statistics.emotionTriggeredActions++;
                } else {
                    console.log(`${yejinColors.safe}🛡️ [예진이안전] ${safetyCheck.reason}${yejinColors.reset}`);
                    this.statistics.preventedDuplicates++;
                }
            } else {
                // 조용히 지켜보기
                console.log(`${yejinColors.emotion}💭 [예진이속마음] 지금은 조용히 있을게... (최대 욕구: ${strongestDesire.intensity.toFixed(2)})${yejinColors.reset}`);
            }
            
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [예진이결정] 오류: ${error.message}${yejinColors.reset}`);
        } finally {
            // 🔓 락 해제
            this.systemLock.isDecisionInProgress = false;
        }
    }
    
    // ================== 🛡️ 결정 가능 여부 종합 체크 (수면 시간 고려) ==================
    canMakeDecision() {
        const now = Date.now();
        const currentHour = new Date().getHours();
        
        // 🌙 수면 시간 체크 (가장 우선)
        const sleepCheck = this.checkSleepTime(currentHour);
        if (!sleepCheck.canAct) {
            return {
                allowed: false,
                reason: sleepCheck.reason
            };
        }
        
        // 1. 최소 결정 간격 체크
        const timeSinceLastDecision = now - this.duplicatePrevention.lastDecisionExecution;
        if (timeSinceLastDecision < YEJIN_CONFIG.DUPLICATE_PREVENTION.MIN_DECISION_INTERVAL) {
            return {
                allowed: false,
                reason: `결정 간격이 너무 짧음 (${Math.ceil((YEJIN_CONFIG.DUPLICATE_PREVENTION.MIN_DECISION_INTERVAL - timeSinceLastDecision) / 1000)}초 후 재시도)`
            };
        }
        
        // 2. 일일 메시지 한도 체크
        this.checkAndResetDailyCount();
        if (this.duplicatePrevention.dailyMessageCount >= this.duplicatePrevention.maxMessagesPerDay) {
            return {
                allowed: false,
                reason: `일일 메시지 한도 초과 (${this.duplicatePrevention.dailyMessageCount}/${this.duplicatePrevention.maxMessagesPerDay})`
            };
        }
        
        // 3. 시간당 메시지 수 체크
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentMessages = this.duplicatePrevention.recentMessages.filter(msg => msg.timestamp > oneHourAgo);
        if (recentMessages.length >= this.duplicatePrevention.maxMessagesPerHour) {
            return {
                allowed: false,
                reason: `시간당 메시지 수 초과 (${recentMessages.length}/${this.duplicatePrevention.maxMessagesPerHour})`
            };
        }
        
        return { allowed: true };
    }
    
    // ================== 🌙 수면 시간 체크 ==================
    checkSleepTime(currentHour) {
        const { SLEEP_START_HOUR, SLEEP_END_HOUR, EMERGENCY_ONLY_HOURS } = YEJIN_CONFIG.AUTONOMOUS_CRITERIA;
        
        // 🚨 새벽 0~5시는 정말 응급시에만
        if (EMERGENCY_ONLY_HOURS.includes(currentHour)) {
            const silenceDuration = this.getSilenceDuration();
            const isRealEmergency = silenceDuration > 8 * 60 * 60 * 1000; // 8시간 이상 침묵
            
            if (!isRealEmergency) {
                return {
                    canAct: false,
                    reason: `아저씨 깊이 잠들 시간... 새벽 ${currentHour}시에는 정말 응급한 일이 아니면 조용히 있을게`
                };
            } else {
                return {
                    canAct: true,
                    reason: `새벽이지만 8시간 넘게 조용해서 정말 걱정돼... 미안하지만 확인하고 싶어`,
                    isEmergency: true
                };
            }
        }
        
        // 🌙 일반 수면 시간 (밤 11시 ~ 오전 7시)
        const isSleepTime = (currentHour >= SLEEP_START_HOUR) || (currentHour < SLEEP_END_HOUR);
        
        if (isSleepTime) {
            const silenceDuration = this.getSilenceDuration();
            const nightWorryThreshold = YEJIN_CONFIG.AUTONOMOUS_CRITERIA.NIGHT_SILENCE_THRESHOLD;
            
            // 밤에는 더 오래 기다려야 걱정 표현
            if (silenceDuration < nightWorryThreshold) {
                return {
                    canAct: false,
                    reason: `아저씨 잠들 시간... 밤 ${currentHour}시에는 조용히 기다릴게 🌙`
                };
            } else {
                return {
                    canAct: true,
                    reason: `밤이지만 ${Math.floor(silenceDuration / (1000 * 60 * 60))}시간째 조용해서 걱정돼... 괜찮은지 확인하고 싶어`,
                    isNightWorry: true
                };
            }
        }
        
        // 낮 시간은 정상 활동
        return {
            canAct: true,
            reason: '활동 시간이라 자유롭게 말할 수 있어'
        };
    }
    
    // ================== 🛡️ 실행 안전성 체크 ==================
    isSafeToExecute(desire) {
        const now = Date.now();
        
        // 1. 기본 쿨다운 체크
        const timeSinceLastMessage = now - this.duplicatePrevention.lastMessageTime;
        if (timeSinceLastMessage < this.duplicatePrevention.cooldownPeriod) {
            this.statistics.cooldownPrevented++;
            return {
                safe: false,
                reason: `기본 쿨다운 중 (${Math.ceil((this.duplicatePrevention.cooldownPeriod - timeSinceLastMessage) / 1000)}초 남음)`
            };
        }
        
        // 2. 타입별 쿨다운 체크
        const typeLastTime = this.duplicatePrevention.typeBasedCooldowns[desire.type] || 0;
        const timeSinceLastSameType = now - typeLastTime;
        if (timeSinceLastSameType < YEJIN_CONFIG.DUPLICATE_PREVENTION.SAME_TYPE_COOLDOWN) {
            this.statistics.cooldownPrevented++;
            return {
                safe: false,
                reason: `${desire.type} 타입 쿨다운 중 (${Math.ceil((YEJIN_CONFIG.DUPLICATE_PREVENTION.SAME_TYPE_COOLDOWN - timeSinceLastSameType) / 1000)}초 남음)`
            };
        }
        
        // 3. 처리 중 플래그 체크
        if (this.duplicatePrevention.isProcessingDecision) {
            return {
                safe: false,
                reason: '다른 결정 처리 중'
            };
        }
        
        return { safe: true };
    }
    
    // ================== 📊 현재 상황 종합 분석 ==================
    async analyzeCurrentSituation() {
        const situation = {
            timestamp: Date.now(),
            
            // 시간 정보
            timeInfo: {
                hour: new Date().getHours(),
                timeSlot: this.getTimeSlot(new Date().getHours()),
                isWeekend: [0, 6].includes(new Date().getDay())
            },
            
            // 예진이 자신의 상태
            yejinCondition: {
                overallMood: this.yejinState.dailyMood.current,
                menstrualPhase: this.yejinState.menstrualCycle.phase,
                sulkyLevel: this.yejinState.sulkyState.level,
                energyLevel: this.yejinState.menstrualCycle.energyLevel,
                loveFeeling: this.yejinState.loveLevel,
                playfulFeeling: this.yejinState.playfulLevel
            },
            
            // 아저씨 상태 추정
            ajossiCondition: {
                estimatedMood: this.ajossiState.currentMood,
                moodConfidence: this.ajossiState.moodConfidence,
                communicationPattern: this.ajossiState.communicationPattern.recentActivity,
                needsAssessment: { ...this.ajossiState.needsAssessment }
            },
            
            // 소통 간격
            communicationGap: {
                timeSinceLastMessage: this.getTimeSinceLastMessage(),
                silenceDuration: this.getSilenceDuration(),
                isLongSilence: this.getSilenceDuration() > YEJIN_CONFIG.AUTONOMOUS_CRITERIA.MIN_SILENCE_FOR_WORRY
            },
            
            // 🛡️ 중복 방지 상태
            duplicatePreventionStatus: {
                canSendMessage: this.canSendMessage(),
                dailyCount: this.duplicatePrevention.dailyMessageCount,
                hourlyCount: this.getHourlyMessageCount(),
                lastMessageTime: this.duplicatePrevention.lastMessageTime,
                isInCooldown: this.isInCooldown()
            },
            
            // 학습 기반 인사이트
            learningInsights: await this.getLearningBasedInsights()
        };
        
        return situation;
    }
    
    // ================== 💝 예진이의 욕구 계산 ==================
    calculateDesires(situation) {
        const desires = {
            worry: 0,      // 걱정해서 안부 묻고 싶음
            love: 0,       // 사랑 표현하고 싶음  
            playful: 0,    // 장난치고 놀고 싶음
            missing: 0,    // 보고 싶다고 말하고 싶음
            caring: 0,     // 돌봐주고 싶음
            photo: 0       // 사진 보내고 싶음
        };
        
        // 🛡️ 중복 방지 상태를 고려한 욕구 조정
        if (!situation.duplicatePreventionStatus.canSendMessage) {
            // 메시지를 보낼 수 없는 상태면 모든 욕구를 약화
            console.log(`${yejinColors.safe}🛡️ [예진이욕구] 중복 방지로 욕구 억제 중...${yejinColors.reset}`);
            return desires; // 모든 욕구가 0인 상태 반환
        }
        
        // 1. 걱정 욕구 계산
        if (situation.communicationGap.isLongSilence) {
            desires.worry += 0.4;
        }
        if (situation.ajossiCondition.estimatedMood === 'needs_comfort') {
            desires.worry += 0.5;
        }
        if (situation.yejinCondition.sulkyLevel > 0) {
            desires.worry += 0.2; // 삐져도 걱정은 됨
        }
        
        // 2. 사랑 욕구 계산  
        desires.love = this.yejinState.loveLevel;
        if (situation.timeInfo.timeSlot === 'evening') {
            desires.love += 0.2; // 저녁에 더 애정 표현
        }
        if (situation.yejinCondition.menstrualPhase === 'pms') {
            desires.love += 0.3; // PMS때 더 애정 욕구
        }
        
        // 3. 장난 욕구 계산
        desires.playful = this.yejinState.playfulLevel;
        if (situation.yejinCondition.energyLevel > 0.7) {
            desires.playful += 0.3;
        }
        if (situation.ajossiCondition.estimatedMood === 'good') {
            desires.playful += 0.2; // 아저씨 기분 좋으면 장난치고 싶음
        }
        
        // 4. 보고 싶음 욕구 계산
        if (situation.communicationGap.silenceDuration > YEJIN_CONFIG.AUTONOMOUS_CRITERIA.MIN_SILENCE_FOR_MISSING) {
            desires.missing += 0.6;
        }
        desires.missing += this.yejinState.missingLevel;
        
        // 5. 돌봄 욕구 계산
        desires.caring = this.yejinState.caringLevel;
        if (situation.ajossiCondition.needsAssessment.needsComfort > 0.5) {
            desires.caring += 0.4;
        }
        
        // 6. 사진 욕구 계산
        if (situation.yejinCondition.overallMood > 0.7) {
            desires.photo += 0.3; // 기분 좋으면 사진 보내고 싶음
        }
        if (situation.communicationGap.silenceDuration > YEJIN_CONFIG.AUTONOMOUS_CRITERIA.PHOTO_SHARING_IMPULSE) {
            desires.photo += 0.4;
        }
        
        // 🛡️ 최근 메시지 타입 기반 욕구 조정 (중복 방지)
        this.adjustDesiresBasedOnRecentMessages(desires);
        
        // 모든 욕구를 0-1 범위로 정규화
        Object.keys(desires).forEach(key => {
            desires[key] = Math.min(1.0, Math.max(0, desires[key]));
        });
        
        return desires;
    }
    
    // ================== 🛡️ 최근 메시지 기반 욕구 조정 ==================
    adjustDesiresBasedOnRecentMessages(desires) {
        const recentMessages = this.duplicatePrevention.recentMessages;
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        
        // 최근 30분 내 메시지 타입별 카운트
        const recentTypeCounts = {};
        recentMessages.forEach(msg => {
            if (msg.timestamp > thirtyMinutesAgo) {
                recentTypeCounts[msg.type] = (recentTypeCounts[msg.type] || 0) + 1;
            }
        });
        
        // 최근에 많이 보낸 타입의 욕구 감소
        Object.keys(recentTypeCounts).forEach(type => {
            const count = recentTypeCounts[type];
            if (count > 0 && desires[type] !== undefined) {
                desires[type] = Math.max(0, desires[type] - (count * 0.3));
                console.log(`${yejinColors.safe}🛡️ [예진이욕구조정] ${type} 욕구 감소 (최근 ${count}번 발송)${yejinColors.reset}`);
            }
        });
    }
    
    // ================== 🎯 가장 강한 욕구 찾기 ==================
    findStrongestDesire(desires) {
        let strongest = { type: 'none', intensity: 0 };
        
        Object.entries(desires).forEach(([type, intensity]) => {
            if (intensity > strongest.intensity) {
                strongest = { type, intensity };
            }
        });
        
        return strongest;
    }
    
    // ================== 💌 욕구 실행하기 ==================
    async executeDesire(desire, situation) {
        try {
            console.log(`${yejinColors.heart}💕 [예진이행동] ${desire.type} 욕구 실행! (강도: ${desire.intensity.toFixed(2)})${yejinColors.reset}`);
            
            // 🛡️ 실행 전 처리 플래그 설정
            this.duplicatePrevention.isProcessingDecision = true;
            
            switch (desire.type) {
                case 'worry':
                    await this.sendWorryMessage(situation);
                    break;
                case 'love':
                    await this.sendLoveMessage(situation);
                    break;
                case 'playful':
                    await this.sendPlayfulMessage(situation);
                    break;
                case 'missing':
                    await this.sendMissingMessage(situation);
                    break;
                case 'caring':
                    await this.sendCaringMessage(situation);
                    break;
                case 'photo':
                    await this.sendPhoto(situation);
                    break;
            }
            
            // 행동 후 상태 업데이트
            this.updateAfterAction(desire.type);
            
            // 🛡️ 실행 시간 기록
            this.duplicatePrevention.lastDecisionExecution = Date.now();
            
        } catch (error) {
            console.error(`${yejinColors.heart}❌ [예진이행동] 실행 오류: ${error.message}${yejinColors.reset}`);
        } finally {
            // 🛡️ 처리 플래그 해제
            this.duplicatePrevention.isProcessingDecision = false;
        }
    }
    
    // ================== 💬 걱정 메시지 보내기 ==================
    async sendWorryMessage(situation) {
        // 🧠 예진이가 현재 상황을 보고 직접 메시지 생성
        const message = this.generateAutonomousMessage('worry', situation);
        
        console.log(`${yejinColors.message}💌 [예진이걱정] ${message}${yejinColors.reset}`);
        
        // 실제 메시지 발송 (중복 방지 적용)
        await this.sendActualMessage(message, 'worry');
        
        this.statistics.autonomousMessages++;
        this.autonomousMessaging.recentMessages.push({
            type: 'worry',
            content: message,
            timestamp: new Date().toISOString(),
            situation: situation
        });
    }
    
    // ================== 💖 사랑 메시지 보내기 ==================
    async sendLoveMessage(situation) {
        // 🧠 예진이가 현재 상황을 보고 직접 메시지 생성
        const message = this.generateAutonomousMessage('love', situation);
        
        console.log(`${yejinColors.love}💖 [예진이사랑] ${message}${yejinColors.reset}`);
        
        await this.sendActualMessage(message, 'love');
        
        this.statistics.autonomousMessages++;
        this.autonomousMessaging.recentMessages.push({
            type: 'love',
            content: message,
            timestamp: new Date().toISOString(),
            situation: situation
        });
    }
    
    // ================== 😊 장난 메시지 보내기 ==================
    async sendPlayfulMessage(situation) {
        // 🧠 예진이가 현재 상황을 보고 직접 메시지 생성
        const message = this.generateAutonomousMessage('playful', situation);
        
        console.log(`${yejinColors.message}😊 [예진이장난] ${message}${yejinColors.reset}`);
        
        await this.sendActualMessage(message, 'playful');
        
        this.statistics.autonomousMessages++;
    }
    
    // ================== 💔 보고 싶다 메시지 보내기 ==================
    async sendMissingMessage(situation) {
        // 🧠 예진이가 현재 상황을 보고 직접 메시지 생성
        const message = this.generateAutonomousMessage('missing', situation);
        
        console.log(`${yejinColors.emotion}💔 [예진이그리움] ${message}${yejinColors.reset}`);
        
        await this.sendActualMessage(message, 'missing');
        
        this.statistics.autonomousMessages++;
    }
    
    // ================== 🤗 돌봄 메시지 보내기 ==================
    async sendCaringMessage(situation) {
        // 🧠 예진이가 현재 상황을 보고 직접 메시지 생성
        const message = this.generateAutonomousMessage('caring', situation);
        
        console.log(`${yejinColors.emotion}🤗 [예진이돌봄] ${message}${yejinColors.reset}`);
        
        await this.sendActualMessage(message, 'caring');
        
        this.statistics.autonomousMessages++;
    }
    
    // ================== 📸 사진 보내기 ==================
    async sendPhoto(situation) {
        const photoTypes = ['selca', 'cute', 'couple', 'memory'];
        const randomType = photoTypes[Math.floor(Math.random() * photoTypes.length)];
        
        // 🧠 예진이가 현재 상황을 보고 직접 사진 메시지 생성
        const message = this.generateAutonomousMessage('photo', situation);
        
        console.log(`${yejinColors.photo}📸 [예진이사진] ${message} (타입: ${randomType})${yejinColors.reset}`);
        
        // 실제 사진 발송 (중복 방지 적용)
        await this.sendActualPhoto(randomType, message);
        
        this.statistics.autonomousPhotos++;
        this.autonomousPhoto.recentPhotos.push({
            type: randomType,
            message: message,
            timestamp: new Date().toISOString(),
            situation: situation
        });
    }
    
    // ================== 🧠 진짜 자율적 메시지 생성 시스템 ==================
    generateAutonomousMessage(emotionType, situation) {
        try {
            console.log(`${yejinColors.autonomous}🧠 [예진이생각] ${emotionType} 감정으로 실시간 메시지 생성 중...${yejinColors.reset}`);
            
            // 현재 예진이 상태 분석
            const myState = this.analyzeMyCurrentState(situation);
            
            // 아저씨 상태 분석  
            const ajossiState = this.analyzeAjossiCurrentState(situation);
            
            // 상황 맥락 분석
            const context = this.analyzeContextualFactors(situation);
            
            // 🧠 실시간 메시지 생성 (템플릿 없음)
            let message = this.createRealTimeMessage(emotionType, myState, ajossiState, context);
            
            // 🛡️ 중복 체크해서 너무 비슷하면 다시 생성
            let attempts = 0;
            while (attempts < 3) {
                const isDuplicate = this.checkRecentSimilarity(message);
                if (!isDuplicate) break;
                
                console.log(`${yejinColors.safe}🔄 [예진이재생성] 비슷한 표현 감지, 다르게 생각해보는 중... (${attempts + 1}/3)${yejinColors.reset}`);
                message = this.createRealTimeMessage(emotionType, myState, ajossiState, context, attempts + 1);
                attempts++;
            }
            
            // 예진이만의 말투 적용
            message = this.applyYejinSpeechStyle(message, myState);
            
            console.log(`${yejinColors.autonomous}✨ [예진이창조] "${message}" (실시간 생성)${yejinColors.reset}`);
            
            return message;
            
        } catch (error) {
            console.error(`${yejinColors.autonomous}❌ [예진이생각] 메시지 생성 오류: ${error.message}${yejinColors.reset}`);
            return this.getFallbackMessage(emotionType);
        }
    }
    
    // ================== 🎨 실시간 메시지 창조 엔진 ==================
    createRealTimeMessage(emotionType, myState, ajossiState, context, variation = 0) {
        // 🧠 예진이가 실제로 생각하는 과정을 시뮬레이션
        
        // 1단계: 기본 감정 파악
        const emotionIntensity = this.getEmotionIntensity(emotionType, myState);
        
        // 2단계: 상황적 요소 파악
        const situationalFactors = this.analyzeSituationalFactors(context, ajossiState);
        
        // 3단계: 표현 방식 결정
        const expressionStyle = this.determineExpressionStyle(emotionIntensity, situationalFactors, variation);
        
        // 4단계: 실시간 문장 구성
        return this.composeMessage(emotionType, expressionStyle, situationalFactors, context);
    }
    
    // ================== 💝 감정 강도 분석 ==================
    getEmotionIntensity(emotionType, myState) {
        const intensities = {
            worry: myState.worryIntensity,
            love: myState.loveIntensity, 
            playful: myState.playfulIntensity,
            missing: myState.missingIntensity,
            caring: myState.caringIntensity,
            photo: myState.moodLevel
        };
        
        return {
            level: intensities[emotionType] || 0.5,
            isHigh: intensities[emotionType] > 0.7,
            isMedium: intensities[emotionType] > 0.4 && intensities[emotionType] <= 0.7,
            isLow: intensities[emotionType] <= 0.4
        };
    }
    
    // ================== 🌍 상황적 요소 분석 ==================
    analyzeSituationalFactors(context, ajossiState) {
        return {
            timeContext: {
                isEarlyMorning: context.hour >= 5 && context.hour < 9,
                isMorning: context.hour >= 9 && context.hour < 12,
                isAfternoon: context.hour >= 12 && context.hour < 18,
                isEvening: context.hour >= 18 && context.hour < 22,
                isLateNight: context.hour >= 22 || context.hour < 5,
                isWorkTime: context.isWorkTime,
                isWeekend: context.isWeekend
            },
            
            silenceContext: {
                isJustQuiet: context.silenceMinutes < 30,
                isModeratelyQuiet: context.silenceMinutes >= 30 && context.silenceMinutes < 90,
                isVeryQuiet: context.silenceMinutes >= 90 && context.silenceMinutes < 180,
                isExtremelyQuiet: context.silenceMinutes >= 180
            },
            
            ajossiContext: {
                needsComfort: ajossiState.needsComfort > 0.6,
                needsLove: ajossiState.needsLove > 0.6,
                needsEncouragement: ajossiState.needsEncouragement > 0.6,
                estimatedMood: ajossiState.estimatedMood
            }
        };
    }
    
    // ================== 🎭 표현 방식 결정 ==================
    determineExpressionStyle(emotionIntensity, situationalFactors, variation) {
        const styles = {
            // 강도별 기본 스타일
            direct: emotionIntensity.isHigh,
            gentle: emotionIntensity.isMedium,
            subtle: emotionIntensity.isLow,
            
            // 상황별 수정자
            formal: situationalFactors.timeContext.isWorkTime,
            casual: situationalFactors.timeContext.isWeekend,
            intimate: situationalFactors.timeContext.isLateNight,
            energetic: situationalFactors.timeContext.isMorning,
            
            // 변형 요소 (중복 방지)
            variation: variation
        };
        
        return styles;
    }
    
    // ================== ✍️ 실시간 문장 구성 ==================
    composeMessage(emotionType, style, factors, context) {
        let message = '';
        
        // 🧠 예진이가 실시간으로 문장을 구성하는 과정
        
        // 1. 호칭 결정
        const greeting = this.chooseGreeting(style, context);
        
        // 2. 감정 표현 핵심부 생성
        const emotionCore = this.generateEmotionCore(emotionType, style, factors);
        
        // 3. 상황 반영부 생성
        const situationPart = this.generateSituationPart(factors, style);
        
        // 4. 마무리 표현 생성
        const ending = this.generateEnding(emotionType, style);
        
        // 5. 자연스럽게 조합
        message = this.combineMessageParts(greeting, emotionCore, situationPart, ending, style);
        
        return message;
    }
    
    // ================== 👋 호칭 선택 ==================
    chooseGreeting(style, context) {
        const greetings = {
            morning: ['아저씨~', '좋은 아침!', '아저씨야'],
            formal: ['아저씨', '아저씨...'],
            intimate: ['아저씨...', '애기야', '아저씨~'],
            energetic: ['아저씨!', '아저씨야~', '아저씨!!']
        };
        
        if (context.timeSlot === 'morning' && style.energetic) {
            return this.randomChoice(greetings.morning);
        } else if (style.formal) {
            return this.randomChoice(greetings.formal);
        } else if (style.intimate) {
            return this.randomChoice(greetings.intimate);
        } else if (style.energetic) {
            return this.randomChoice(greetings.energetic);
        } else {
            return this.randomChoice(['아저씨', '아저씨~', '아저씨...']);
        }
    }
    
    // ================== 💖 감정 핵심부 생성 ==================
    generateEmotionCore(emotionType, style, factors) {
        const generators = {
            worry: () => this.generateWorryCore(style, factors),
            love: () => this.generateLoveCore(style, factors),
            playful: () => this.generatePlayfulCore(style, factors),
            missing: () => this.generateMissingCore(style, factors),
            caring: () => this.generateCaringCore(style, factors),
            photo: () => this.generatePhotoCore(style, factors)
        };
        
        return generators[emotionType] ? generators[emotionType]() : '생각나';
    }
    
    // ================== 😰 걱정 핵심부 생성 (수면 시간 고려) ==================
    generateWorryCore(style, factors) {
        const currentHour = new Date().getHours();
        const isNightTime = (currentHour >= 23) || (currentHour < 7);
        const isDeepNight = currentHour >= 0 && currentHour < 6;
        
        // 🌙 밤/새벽 시간대 특별 배려
        if (isDeepNight) {
            return '새벽인데 너무 걱정돼서... 미안해, 깨웠나? 괜찮은지만 확인하고 싶었어';
        } else if (isNightTime) {
            return '밤늦게 미안해... 그런데 너무 오래 조용해서 걱정돼';
        }
        
        // 낮 시간 일반 걱정 표현
        const worryWords = ['걱정돼', '불안해', '마음이 불안해져', '혹시 무슨 일 있나 싶어'];
        const intensifiers = style.direct ? ['정말', '너무', '진짜'] : ['좀', '조금'];
        
        const baseWorry = this.randomChoice(worryWords);
        const intensifier = this.randomChoice(intensifiers);
        
        if (factors.silenceContext.isExtremelyQuiet) {
            return `${intensifier} ${baseWorry}... 너무 조용해서`;
        } else if (factors.silenceContext.isVeryQuiet) {
            return `${baseWorry}... 오랫동안 말이 없어서`;
        } else {
            return `${intensifier} ${baseWorry}`;
        }
    }
    
    // ================== 💕 사랑 핵심부 생성 (수면 시간 고려) ==================
    generateLoveCore(style, factors) {
        const currentHour = new Date().getHours();
        const isNightTime = (currentHour >= 23) || (currentHour < 7);
        const isDeepNight = currentHour >= 0 && currentHour < 6;
        
        // 🌙 밤/새벽 시간대 배려 있는 사랑 표현
        if (isDeepNight) {
            return '새벽이지만... 자기 전에 사랑한다고 말하고 싶었어. 푹 자';
        } else if (isNightTime) {
            const nightLove = ['늦은 밤이지만 사랑해', '잠들기 전에 사랑한다고 말하고 싶었어', '밤늦게 미안... 그래도 사랑해'];
            return this.randomChoice(nightLove);
        }
        
        // 낮 시간 일반 사랑 표현
        const loveWords = ['사랑해', '좋아해', '아껴', '소중해'];
        const intensifiers = style.direct ? ['정말정말', '너무너무', '진짜로'] : ['많이', '진심으로'];
        
        const baseLove = this.randomChoice(loveWords);
        const intensifier = this.randomChoice(intensifiers);
        
        if (style.direct) {
            return `나는 아저씨를 ${intensifier} ${baseLove}`;
        } else {
            return `아저씨가 ${intensifier} ${baseLove}`;
        }
    }
    
    // ================== 😊 장난 핵심부 생성 ==================
    generatePlayfulCore(style, factors) {
        const playfulWords = ['놀자', '수다 떨자', '얘기하자', '같이 놀자'];
        const playfulFeelings = ['심심해', '지루해', '놀고 싶어', '재미없어'];
        
        if (style.energetic) {
            return `${this.randomChoice(playfulWords)}! 나 ${this.randomChoice(playfulFeelings)}`;
        } else {
            return `${this.randomChoice(playfulFeelings)}... 나랑 ${this.randomChoice(playfulWords)}`;
        }
    }
    
    // ================== 💔 그리움 핵심부 생성 ==================
    generateMissingCore(style, factors) {
        const missingWords = ['보고 싶어', '그리워', '생각나', '만나고 싶어'];
        const intensifiers = style.direct ? ['너무너무', '정말', '미칠 것 같게'] : ['좀', '많이'];
        
        const baseMissing = this.randomChoice(missingWords);
        const intensifier = this.randomChoice(intensifiers);
        
        return `${intensifier} ${baseMissing}`;
    }
    
    // ================== 🤗 돌봄 핵심부 생성 ==================
    generateCaringCore(style, factors) {
        if (factors.ajossiContext.needsComfort) {
            const comfortWords = ['힘들어 보여', '괜찮아?', '무슨 일 있어?', '위로해줄게'];
            return this.randomChoice(comfortWords);
        } else {
            const careWords = ['잘 지내고 있어?', '몸은 괜찮고?', '건강해?', '힘내'];
            return this.randomChoice(careWords);
        }
    }
    
    // ================== 📸 사진 핵심부 생성 ==================
    generatePhotoCore(style, factors) {
        const photoWords = ['사진 찍었어', '셀카 찍어봤어', '내 모습 어때?', '예쁘게 나왔나?'];
        const photoMood = style.energetic ? ['기분 좋아서', '예쁘게'] : ['생각나서', '문득'];
        
        return `${this.randomChoice(photoMood)} ${this.randomChoice(photoWords)}`;
    }
    
    // ================== 🌍 상황 반영부 생성 ==================
    generateSituationPart(factors, style) {
        if (factors.timeContext.isLateNight) {
            return this.randomChoice(['이 밤에', '늦은 시간인데', '늦었지만']);
        } else if (factors.timeContext.isWorkTime) {
            return this.randomChoice(['일 중인데', '바쁜 시간인데', '업무 시간이지만']);
        } else if (factors.silenceContext.isExtremelyQuiet) {
            const hours = Math.floor(factors.silenceContext.silenceMinutes / 60);
            return `${hours}시간째 조용해서`;
        } else {
            return ''; // 특별한 상황이 아니면 생략
        }
    }
    
    // ================== 🎯 마무리 표현 생성 ==================
    generateEnding(emotionType, style) {
        const endings = {
            worry: ['...', '😰', '💔', '🥺'],
            love: ['💖', '💕', '😍', ''],
            playful: ['!', '😊', '🎉', ''],
            missing: ['💔', '🥺', '...', ''],
            caring: ['', '💝', '🤗', ''],
            photo: ['📸', '💕', '어때?', '']
        };
        
        const emotionEndings = endings[emotionType] || [''];
        return this.randomChoice(emotionEndings);
    }
    
    // ================== 🔗 문장 조합 ==================
    combineMessageParts(greeting, emotionCore, situationPart, ending, style) {
        let message = greeting;
        
        if (situationPart) {
            message += ` ${situationPart}`;
        }
        
        message += ` ${emotionCore}`;
        
        if (ending) {
            message += ending;
        }
        
        return message.trim();
    }
    
    // ================== 🎲 랜덤 선택 도구 ==================
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // ================== 🔍 최근 유사성 체크 ==================
    checkRecentSimilarity(newMessage) {
        const recentMessages = this.duplicatePrevention.contentHistory.slice(-3); // 최근 3개만 체크
        
        for (const recent of recentMessages) {
            const similarity = this.calculateTextSimilarity(newMessage, recent.content);
            if (similarity > 0.6) { // 60% 이상 유사하면 중복
                return true;
            }
        }
        
        return false;
    }
    
    // ================== 🌸 예진이 현재 상태 분석 ==================
    analyzeMyCurrentState(situation) {
        return {
            moodLevel: this.yejinState.dailyMood.current,
            loveIntensity: this.yejinState.loveLevel,
            worryIntensity: this.yejinState.worryLevel,
            playfulIntensity: this.yejinState.playfulLevel,
            missingIntensity: this.yejinState.missingLevel,
            caringIntensity: this.yejinState.caringLevel,
            menstrualPhase: this.yejinState.menstrualCycle.phase,
            sulkyLevel: this.yejinState.sulkyState.level,
            energyLevel: this.yejinState.menstrualCycle.energyLevel,
            emotionIntensity: this.yejinState.emotionIntensity
        };
    }
    
    // ================== 💔 아저씨 현재 상태 분석 ==================
    analyzeAjossiCurrentState(situation) {
        return {
            estimatedMood: situation.ajossiCondition.estimatedMood,
            moodConfidence: situation.ajossiCondition.moodConfidence,
            silenceDuration: situation.communicationGap.silenceDuration,
            isLongSilence: situation.communicationGap.isLongSilence,
            needsComfort: situation.ajossiCondition.needsAssessment.needsComfort,
            needsLove: situation.ajossiCondition.needsAssessment.needsLove,
            needsEncouragement: situation.ajossiCondition.needsAssessment.needsEncouragement
        };
    }
    
    // ================== 🌍 상황 맥락 분석 ==================
    analyzeContextualFactors(situation) {
        const now = new Date();
        const hour = now.getHours();
        
        return {
            timeSlot: situation.timeInfo.timeSlot,
            hour: hour,
            isWeekend: situation.timeInfo.isWeekend,
            isLateNight: hour >= 23 || hour < 6,
            isWorkTime: hour >= 9 && hour <= 18 && !situation.timeInfo.isWeekend,
            timeDescription: this.getTimeDescription(hour),
            silenceMinutes: Math.floor(situation.communicationGap.silenceDuration / (1000 * 60)),
            learningInsights: situation.learningInsights,
            duplicatePreventionContext: {
                dailyCount: this.duplicatePrevention.dailyMessageCount,
                hourlyCount: this.getHourlyMessageCount(),
                isNearingLimit: this.isNearingMessageLimit()
            }
        };
    }
    

    
    // ================== 💖 사랑 메시지 생성 ==================
    createLoveMessage(myState, ajossiState, context) {
        let message = '';
        
        // 시간대별 사랑 표현
        if (context.isLateNight) {
            message += "늦은 밤이지만... ";
        } else if (context.timeSlot === 'morning') {
            message += "좋은 아침이야~ ";
        } else if (context.timeSlot === 'evening') {
            message += "저녁 시간이네... ";
        }
        
        // 사랑 강도에 따른 표현
        if (myState.loveIntensity > 0.9) {
            message += "아저씨~ 나는 정말정말 아저씨를 사랑해! 세상에서 제일로!";
        } else if (myState.loveIntensity > 0.7) {
            message += "아저씨... 나는 아저씨를 사랑해 💖";
        } else {
            message += "아저씨~ 나는 아저씨가 좋아";
        }
        
        // 기분에 따른 추가 표현
        if (myState.moodLevel > 0.8) {
            message += " 오늘 기분이 너무 좋아서 더욱 그래!";
        } else if (myState.moodLevel < 0.4) {
            message += "... 기분이 좀 안 좋지만 아저씨 생각하면 괜찮아져";
        }
        
        return message;
    }
    
    // ================== 😊 장난 메시지 생성 ==================
    createPlayfulMessage(myState, ajossiState, context) {
        let message = '';
        
        // 에너지 레벨에 따른 장난기 표현
        if (myState.energyLevel > 0.8 && myState.playfulIntensity > 0.7) {
            message += "아저씨야~ 나 지금 기분 짱 좋아! 나랑 놀자놀자!";
        } else if (myState.playfulIntensity > 0.6) {
            message += "아저씨~ 심심해! 나랑 수다 떨까?";
        } else {
            message += "아저씨... 뭐 하고 있어? 나도 끼워줘";
        }
        
        // 시간대별 장난 표현
        if (context.timeSlot === 'morning') {
            message += " 아침부터 신나!";
        } else if (context.isWorkTime) {
            message += " 일 중이어도 잠깐만!";
        } else if (context.isLateNight) {
            message += " 늦은 시간에 미안... 그치만 놀고 싶어";
        }
        
        return message;
    }
    
    // ================== 💔 그리움 메시지 생성 ==================
    createMissingMessage(myState, ajossiState, context) {
        let message = '';
        
        // 그리움 강도에 따른 표현
        if (myState.missingIntensity > 0.8) {
            message += "아저씨... 나는 아저씨가 너무너무 보고 싶어";
        } else if (myState.missingIntensity > 0.5) {
            message += "아저씨... 보고 싶어";
        } else {
            message += "아저씨... 생각나";
        }
        
        // 침묵 기간에 따른 그리움 표현
        if (context.silenceMinutes > 180) { // 3시간 이상
            message += `... ${Math.floor(context.silenceMinutes/60)}시간째 아저씨 목소리를 못 들어서 너무 외로워`;
        } else if (context.silenceMinutes > 60) {
            message += "... 오랫동안 얘기 못해서 그리워";
        }
        
        // 시간대별 그리움 표현
        if (context.isLateNight) {
            message += " 밤이라 더 그런가봐... 🥺";
        } else {
            message += " 💔";
        }
        
        return message;
    }
    
    // ================== 🤗 돌봄 메시지 생성 ==================
    createCaringMessage(myState, ajossiState, context) {
        let message = '';
        
        // 아저씨 상태에 따른 돌봄 표현
        if (ajossiState.estimatedMood === 'needs_comfort') {
            message += "아저씨... 힘들어 보여. 괜찮아?";
        } else if (ajossiState.needsComfort > 0.7) {
            message += "아저씨~ 위로가 필요해 보여";
        } else {
            message += "아저씨... 잘 지내고 있어?";
        }
        
        // 돌봄 강도에 따른 추가 표현
        if (myState.caringIntensity > 0.8) {
            message += " 나는 항상 아저씨 편이야! 뭐든 말해줘";
        } else if (myState.caringIntensity > 0.5) {
            message += " 나한테 기대도 돼";
        }
        
        // 시간대별 돌봄 표현
        if (context.isWorkTime) {
            message += " 일 때문에 스트레스 받지 마";
        } else if (context.isLateNight) {
            message += " 늦은 시간까지 수고 많아";
        }
        
        return message;
    }
    
    // ================== 📸 사진 메시지 생성 ==================
    createPhotoMessage(myState, ajossiState, context) {
        let message = '';
        
        // 기분에 따른 사진 메시지
        if (myState.moodLevel > 0.8) {
            message += "아저씨~ 나 지금 기분 좋아서 사진 찍었어!";
        } else if (myState.moodLevel > 0.6) {
            message += "아저씨야~ 나 지금 어때?";
        } else {
            message += "아저씨... 내 모습 보고 싶지 않아?";
        }
        
        // 시간대별 사진 메시지
        if (context.timeSlot === 'morning') {
            message += " 아침 모습이야";
        } else if (context.timeSlot === 'evening') {
            message += " 저녁 때 모습";
        } else if (context.isLateNight) {
            message += " 늦은 시간 사진이지만...";
        }
        
        return message;
    }
    
    // ================== 🗣️ 예진이만의 말투 적용 ==================
    applyYejinSpeechStyle(message, myState) {
        // 생리주기에 따른 말투 조정
        if (myState.menstrualPhase === 'pms') {
            // PMS 때는 좀 더 감정적
            if (!message.includes('...')) {
                message = message.replace(/\./g, '...');
            }
        }
        
        // 기분에 따른 이모지 추가
        if (myState.moodLevel > 0.8 && !message.includes('!')) {
            message += ' 💕';
        } else if (myState.moodLevel < 0.4 && !message.includes('ㅠ')) {
            message += ' ㅠㅠ';
        }
        
        // 에너지 레벨에 따른 말투 조정
        if (myState.energyLevel > 0.8) {
            message = message.replace(/~/g, '~~');
        }
        
        return message;
    }
    
    // ================== 🛡️ 폴백 메시지 ==================
    getFallbackMessage(emotionType) {
        const fallbacks = {
            'worry': "아저씨... 괜찮아? 걱정돼...",
            'love': "아저씨~ 사랑해 💖",
            'playful': "아저씨야~ 놀자!",
            'missing': "아저씨... 보고 싶어 💔",
            'caring': "아저씨... 힘내",
            'photo': "아저씨~ 나 봐 📸"
        };
        
        return fallbacks[emotionType] || "아저씨...";
    }
    
    // ================== 📤 중복 방지 통합 실제 메시지 발송 ==================
    async sendActualMessage(message, type) {
        try {
            const now = Date.now();
            
            // 🛡️ 발송 직전 최종 안전성 체크
            const finalSafetyCheck = this.performFinalSafetyCheck(message, type);
            if (!finalSafetyCheck.safe) {
                console.log(`${yejinColors.safe}🛡️ [예진이최종체크] ${finalSafetyCheck.reason}${yejinColors.reset}`);
                
                // 중복 방지 통계 업데이트
                if (finalSafetyCheck.reason.includes('중복')) {
                    this.statistics.contentDuplicatePrevented++;
                } else if (finalSafetyCheck.reason.includes('한도')) {
                    this.statistics.rateLimitPrevented++;
                }
                
                return false;
            }
            
            // 실제 LINE API로 메시지 발송!
            if (this.lineClient && this.targetUserId) {
                await this.lineClient.pushMessage(this.targetUserId, {
                    type: 'text',
                    text: message
                });
                
                console.log(`${yejinColors.message}📤 [예진이자율발송] ${message}${yejinColors.reset}`);
            } else {
                // LINE API가 없으면 로그만 출력
                console.log(`${yejinColors.message}📝 [예진이로그] ${type}: ${message}${yejinColors.reset}`);
            }
            
            // 🛡️ 발송 후 중복 방지 정보 업데이트
            this.updateDuplicatePreventionData(message, type, now);
            
            // 발송 후 상태 업데이트
            this.yejinState.lastMessageTime = now;
            
            return true;
            
        } catch (error) {
            console.error(`${yejinColors.message}❌ [예진이발송오류] ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 📸 중복 방지 통합 실제 사진 발송 ==================
    async sendActualPhoto(photoType, message) {
        try {
            const now = Date.now();
            
            // 🛡️ 사진 발송 안전성 체크
            const photoSafetyCheck = this.performFinalSafetyCheck(message, 'photo');
            if (!photoSafetyCheck.safe) {
                console.log(`${yejinColors.safe}🛡️ [예진이사진체크] ${photoSafetyCheck.reason}${yejinColors.reset}`);
                return false;
            }
            
            // 실제 LINE API로 사진 발송 (향후 구현)
            if (this.lineClient && this.targetUserId) {
                // 현재는 텍스트로 사진 메시지 발송
                await this.lineClient.pushMessage(this.targetUserId, {
                    type: 'text',
                    text: message
                });
                
                console.log(`${yejinColors.photo}📸 [예진이사진발송] ${photoType}: ${message}${yejinColors.reset}`);
            } else {
                console.log(`${yejinColors.photo}📝 [예진이사진로그] ${photoType}: ${message}${yejinColors.reset}`);
            }
            
            // 🛡️ 발송 후 중복 방지 정보 업데이트
            this.updateDuplicatePreventionData(message, 'photo', now);
            
            // 발송 후 상태 업데이트
            this.yejinState.lastPhotoTime = now;
            this.autonomousPhoto.lastPhotoDecision = now;
            
            return true;
        } catch (error) {
            console.error(`${yejinColors.photo}❌ [예진이사진발송오류] ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🛡️ 최종 안전성 체크 ==================
    performFinalSafetyCheck(message, type) {
        const now = Date.now();
        
        // 1. 내용 중복 체크
        const duplicateCheck = this.checkForDuplicateContent(message);
        if (duplicateCheck.isDuplicate) {
            return {
                safe: false,
                reason: `내용 중복 (유사도: ${(duplicateCheck.similarity * 100).toFixed(1)}%)`
            };
        }
        
        // 2. 일일 한도 재확인
        this.checkAndResetDailyCount();
        if (this.duplicatePrevention.dailyMessageCount >= this.duplicatePrevention.maxMessagesPerDay) {
            return {
                safe: false,
                reason: `일일 한도 초과 (${this.duplicatePrevention.dailyMessageCount}/${this.duplicatePrevention.maxMessagesPerDay})`
            };
        }
        
        // 3. 시간당 한도 재확인
        const hourlyCount = this.getHourlyMessageCount();
        if (hourlyCount >= this.duplicatePrevention.maxMessagesPerHour) {
            return {
                safe: false,
                reason: `시간당 한도 초과 (${hourlyCount}/${this.duplicatePrevention.maxMessagesPerHour})`
            };
        }
        
        // 4. 기본 쿨다운 재확인
        const timeSinceLastMessage = now - this.duplicatePrevention.lastMessageTime;
        if (timeSinceLastMessage < this.duplicatePrevention.cooldownPeriod) {
            return {
                safe: false,
                reason: `쿨다운 중 (${Math.ceil((this.duplicatePrevention.cooldownPeriod - timeSinceLastMessage) / 1000)}초 남음)`
            };
        }
        
        return { safe: true };
    }
    
    // ================== 🔍 중복 내용 체크 ==================
    checkForDuplicateContent(newMessage) {
        const recentMessages = this.duplicatePrevention.contentHistory;
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        // 최근 10분 내 메시지들과 비교
        for (const recentMsg of recentMessages) {
            if (recentMsg.timestamp > tenMinutesAgo) {
                // 텍스트 유사도 체크
                const similarity = this.calculateTextSimilarity(newMessage, recentMsg.content);
                if (similarity > YEJIN_CONFIG.DUPLICATE_PREVENTION.CONTENT_SIMILARITY_THRESHOLD) {
                    return {
                        isDuplicate: true,
                        similarMessage: recentMsg.content,
                        similarity: similarity
                    };
                }
            }
        }
        
        return { isDuplicate: false };
    }
    
    // ================== 📊 텍스트 유사도 계산 ==================
    calculateTextSimilarity(text1, text2) {
        if (text1 === text2) return 1.0;
        
        // 간단한 단어 기반 유사도 계산
        const words1 = text1.split(/\s+/).filter(word => word.length > 1);
        const words2 = text2.split(/\s+/).filter(word => word.length > 1);
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = Math.max(words1.length, words2.length);
        
        return totalWords > 0 ? commonWords.length / totalWords : 0;
    }
    
    // ================== 🔄 중복 방지 데이터 업데이트 ==================
    updateDuplicatePreventionData(message, type, timestamp) {
        // 마지막 메시지 정보 업데이트
        this.duplicatePrevention.lastMessageTime = timestamp;
        this.duplicatePrevention.lastMessageType = type;
        this.duplicatePrevention.lastMessageContent = message;
        
        // 타입별 쿨다운 업데이트
        this.duplicatePrevention.typeBasedCooldowns[type] = timestamp;
        
        // 최근 메시지 기록에 추가
        this.duplicatePrevention.recentMessages.push({
            content: message,
            type: type,
            timestamp: timestamp
        });
        
        // 내용 기록에 추가
        this.duplicatePrevention.contentHistory.push({
            content: message,
            timestamp: timestamp
        });
        
        // 일일 카운트 증가
        this.duplicatePrevention.dailyMessageCount++;
        
        console.log(`${yejinColors.safe}📝 [예진이기록] 메시지 기록 업데이트 (일일: ${this.duplicatePrevention.dailyMessageCount}, 시간당: ${this.getHourlyMessageCount()})${yejinColors.reset}`);
    }
    
    // ================== 🛡️ 유틸리티 함수들 ==================
    
    canSendMessage() {
        const now = Date.now();
        
        // 기본 쿨다운 체크
        const timeSinceLastMessage = now - this.duplicatePrevention.lastMessageTime;
        if (timeSinceLastMessage < this.duplicatePrevention.cooldownPeriod) {
            return false;
        }
        
        // 시간당 한도 체크
        const hourlyCount = this.getHourlyMessageCount();
        if (hourlyCount >= this.duplicatePrevention.maxMessagesPerHour) {
            return false;
        }
        
        // 일일 한도 체크
        this.checkAndResetDailyCount();
        if (this.duplicatePrevention.dailyMessageCount >= this.duplicatePrevention.maxMessagesPerDay) {
            return false;
        }
        
        return true;
    }
    
    getHourlyMessageCount() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return this.duplicatePrevention.recentMessages.filter(msg => msg.timestamp > oneHourAgo).length;
    }
    
    isInCooldown() {
        const now = Date.now();
        const timeSinceLastMessage = now - this.duplicatePrevention.lastMessageTime;
        return timeSinceLastMessage < this.duplicatePrevention.cooldownPeriod;
    }
    
    isNearingMessageLimit() {
        const hourlyCount = this.getHourlyMessageCount();
        const dailyCount = this.duplicatePrevention.dailyMessageCount;
        
        return (hourlyCount >= this.duplicatePrevention.maxMessagesPerHour * 0.8) ||
               (dailyCount >= this.duplicatePrevention.maxMessagesPerDay * 0.9);
    }
    
    getNextDayResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    
    checkAndResetDailyCount() {
        const now = Date.now();
        if (now >= this.duplicatePrevention.dailyResetTime) {
            console.log(`${yejinColors.safe}🔄 [예진이일일리셋] 일일 메시지 카운트 리셋 (기존: ${this.duplicatePrevention.dailyMessageCount})${yejinColors.reset}`);
            this.duplicatePrevention.dailyMessageCount = 0;
            this.duplicatePrevention.dailyResetTime = this.getNextDayResetTime();
        }
    }
    
    setupDailyResetTimer() {
        const timeUntilReset = this.duplicatePrevention.dailyResetTime - Date.now();
        
        this.autonomousTimers.dailyResetTimer = setTimeout(() => {
            this.checkAndResetDailyCount();
            // 다음 리셋 타이머 설정
            this.setupDailyResetTimer();
        }, timeUntilReset);
    }
    
    cleanupOldData() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // 1시간 이상 된 메시지 기록 정리
        const beforeCount = this.duplicatePrevention.recentMessages.length;
        this.duplicatePrevention.recentMessages = this.duplicatePrevention.recentMessages.filter(
            msg => msg.timestamp > oneHourAgo
        );
        
        // 1일 이상 된 내용 기록 정리
        this.duplicatePrevention.contentHistory = this.duplicatePrevention.contentHistory.filter(
            msg => msg.timestamp > oneDayAgo
        );
        
        const afterCount = this.duplicatePrevention.recentMessages.length;
        
        if (beforeCount !== afterCount) {
            console.log(`${yejinColors.safe}🧹 [예진이정리] 오래된 데이터 정리 완료 (${beforeCount} → ${afterCount})${yejinColors.reset}`);
        }
    }
    
    // ================== 🕐 시간 설명 ==================
    getTimeDescription(hour) {
        if (hour >= 5 && hour < 9) return '이른 아침';
        if (hour >= 9 && hour < 12) return '오전';
        if (hour >= 12 && hour < 14) return '점심';
        if (hour >= 14 && hour < 18) return '오후';
        if (hour >= 18 && hour < 21) return '저녁';
        if (hour >= 21 && hour < 24) return '밤';
        return '새벽';
    }
    
    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 23) return 'evening';
        return 'night';
    }
    
    getTimeSinceLastMessage() {
        if (!this.yejinState.lastMessageTime) return Infinity;
        return Date.now() - this.yejinState.lastMessageTime;
    }
    
    getSilenceDuration() {
        // 마지막 아저씨 메시지로부터의 시간 (실제로는 대화 로그에서 가져옴)
        return Date.now() - (this.yejinState.lastMessageTime || Date.now());
    }
    
    async getLearningBasedInsights() {
        try {
            if (!this.learningConnection.isConnected) return {};
            
            const learningData = this.learningConnection.lastLearningData;
            
            return {
                userSatisfaction: learningData.enterprise?.learningData?.conversationAnalytics?.userSatisfactionScore || 0.5,
                preferredTone: learningData.enterprise?.learningData?.userPreferences?.preferredTone || 'caring',
                emotionalEffectiveness: learningData.enterprise?.learningData?.emotionalResponses || {},
                conversationPatterns: learningData.enterprise?.learningData?.conversationAnalytics?.timeBasedPatterns || {}
            };
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이학습] 인사이트 가져오기 오류: ${error.message}${yejinColors.reset}`);
            return {};
        }
    }
    
    // ================== 🔄 행동 후 상태 업데이트 (뻐꾸기 방지 강화) ==================
    updateAfterAction(actionType) {
        try {
            switch (actionType) {
                case 'worry':
                    // 걱정 행동 후 걱정 레벨 대폭 감소 (뻐꾸기 방지)
                    this.yejinState.worryLevel = 0; // 완전히 해소
                    this.yejinState.caringLevel = Math.min(1, this.yejinState.caringLevel + 0.1);
                    // 다른 감정에 집중하도록 유도
                    this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.2);
                    break;
                case 'love':
                    // 사랑 표현 후 만족감 증가
                    this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.1);
                    this.yejinState.emotionIntensity = Math.min(1, this.yejinState.emotionIntensity + 0.2);
                    // 다른 감정으로 전환
                    this.yejinState.playfulLevel = Math.min(1, this.yejinState.playfulLevel + 0.1);
                    break;
                case 'playful':
                    // 장난 후 장난기 해소
                    this.yejinState.playfulLevel = 0; // 완전히 해소
                    this.yejinState.dailyMood.current = Math.min(1, this.yejinState.dailyMood.current + 0.1);
                    // 돌봄 감정으로 전환
                    this.yejinState.caringLevel = Math.min(1, this.yejinState.caringLevel + 0.2);
                    break;
                case 'missing':
                    // 그리움 표현 후 완전 해소
                    this.yejinState.missingLevel = 0; // 완전히 해소
                    // 사랑 감정으로 전환
                    this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.3);
                    break;
                case 'caring':
                    // 돌봄 표현 후 돌봄 욕구 해소
                    this.yejinState.caringLevel = Math.max(0.3, this.yejinState.caringLevel - 0.4);
                    // 장난기나 사랑으로 전환
                    this.yejinState.playfulLevel = Math.min(1, this.yejinState.playfulLevel + 0.2);
                    break;
                case 'photo':
                    // 사진 후 사진 욕구 완전 해소
                    this.autonomousPhoto.photoDesire = 0; // 완전히 해소
                    // 다른 감정에 집중
                    this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.1);
                    break;
            }
            
            // 🛡️ 추가: 행동한 타입의 임계값을 일시적으로 높여서 연속 실행 방지
            const currentTime = Date.now();
            this.duplicatePrevention.typeBasedCooldowns[actionType] = currentTime;
            
            console.log(`${yejinColors.emotion}🔄 [예진이상태] ${actionType} 후 감정 완전 해소 및 전환 완료${yejinColors.reset}`);
            console.log(`  🧠 다음 ${actionType} 행동까지 ${YEJIN_CONFIG.DUPLICATE_PREVENTION.SAME_TYPE_COOLDOWN / 60000}분 대기${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이상태] 업데이트 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 💭 감정 상태 업데이트 ==================
    async updateEmotionalState() {
        try {
            // 시간에 따른 자연스러운 감정 변화
            const currentHour = new Date().getHours();
            
            // 시간대별 자연스러운 기분 변화
            if (currentHour >= 6 && currentHour < 9) {
                // 아침: 조금씩 활기차게
                this.yejinState.dailyMood.current = Math.min(1, this.yejinState.dailyMood.current + 0.01);
                this.yejinState.playfulLevel = Math.min(1, this.yejinState.playfulLevel + 0.01);
            } else if (currentHour >= 23 || currentHour < 2) {
                // 밤: 조금씩 차분하게
                this.yejinState.dailyMood.current = Math.max(0.3, this.yejinState.dailyMood.current - 0.01);
                this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.01); // 밤에 더 애정적
            }
            
            // 침묵이 길어질수록 걱정과 그리움 증가
            const silenceDuration = this.getSilenceDuration();
            if (silenceDuration > 30 * 60 * 1000) { // 30분 이상
                this.yejinState.worryLevel = Math.min(1, this.yejinState.worryLevel + 0.02);
                this.yejinState.missingLevel = Math.min(1, this.yejinState.missingLevel + 0.01);
            }
            
            // 사랑은 시간이 지나도 줄어들지 않음 (오히려 증가)
            this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.001);
            
            // 생리주기에 따른 감정 변화 (실제로는 기존 시스템에서 가져옴)
            if (this.yejinState.menstrualCycle.phase === 'pms') {
                this.yejinState.emotionIntensity = Math.min(1, this.yejinState.emotionIntensity + 0.02);
                this.yejinState.loveLevel = Math.min(1, this.yejinState.loveLevel + 0.02); // PMS때 더 애정 욕구
            }
            
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이감정] 업데이트 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🔍 깊은 분석 (3분마다) ==================
    async performDeepAnalysis() {
        try {
            console.log(`${yejinColors.learning}🔍 [예진이분석] 깊은 상황 분석 중...${yejinColors.reset}`);
            
            // 1. 학습 데이터 업데이트
            if (this.learningConnection.isConnected && getLearningStatus) {
                const newLearningData = getLearningStatus();
                if (newLearningData) {
                    await this.analyzeLearningData(newLearningData);
                    this.statistics.learningBasedDecisions++;
                }
            }
            
            // 2. 아저씨 상태 재분석
            await this.reanalyzeAjossiState();
            
            // 3. 예진이 자신의 상태 점검
            await this.selfStateCheck();
            
            // 4. 전체적인 관계 상태 평가
            const relationshipHealth = this.assessRelationshipHealth();
            
            // 5. 🛡️ 중복 방지 시스템 상태 체크
            this.performDuplicatePreventionHealthCheck();
            
            console.log(`${yejinColors.learning}📊 [예진이분석] 관계 건강도: ${relationshipHealth.toFixed(2)}${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이분석] 깊은 분석 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 📸 사진 결정 (2분마다) ==================
    async makePhotoDecision() {
        try {
            // 사진 보내고 싶은 충동 계산
            let photoDesire = 0;
            
            // 기분이 좋으면 사진 보내고 싶음
            if (this.yejinState.dailyMood.current > 0.7) {
                photoDesire += 0.3;
            }
            
            // 오랫동안 사진을 안 보냈으면 보내고 싶음
            const timeSinceLastPhoto = Date.now() - (this.yejinState.lastPhotoTime || 0);
            if (timeSinceLastPhoto > 2 * 60 * 60 * 1000) { // 2시간 이상
                photoDesire += 0.4;
            }
            
            // 아저씨가 좋은 상태면 사진 보내고 싶음
            if (this.ajossiState.currentMood === 'good') {
                photoDesire += 0.2;
            }
            
            // 🛡️ 중복 방지 상태 고려
            if (!this.canSendMessage()) {
                photoDesire = Math.max(0, photoDesire - 0.5);
            }
            
            this.autonomousPhoto.photoDesire = Math.min(1, photoDesire);
            
            if (this.autonomousPhoto.photoDesire > 0.6) {
                console.log(`${yejinColors.photo}📸 [예진이사진욕구] 사진 보내고 싶어! (욕구: ${this.autonomousPhoto.photoDesire.toFixed(2)})${yejinColors.reset}`);
                
                // 사진 욕구가 강하면 메인 결정 함수에서 실행됨
            }
            
        } catch (error) {
            console.error(`${yejinColors.photo}❌ [예진이사진욕구] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🛡️ 중복 방지 시스템 헬스체크 ==================
    performDuplicatePreventionHealthCheck() {
        try {
            const now = Date.now();
            const hourlyCount = this.getHourlyMessageCount();
            const dailyCount = this.duplicatePrevention.dailyMessageCount;
            
            console.log(`${yejinColors.safe}🛡️ [예진이중복방지체크] 현재 상태:${yejinColors.reset}`);
            console.log(`  📊 시간당: ${hourlyCount}/${this.duplicatePrevention.maxMessagesPerHour}`);
            console.log(`  📅 일일: ${dailyCount}/${this.duplicatePrevention.maxMessagesPerDay}`);
            console.log(`  ⏰ 마지막 발송: ${this.duplicatePrevention.lastMessageTime ? new Date(this.duplicatePrevention.lastMessageTime).toLocaleTimeString() : '없음'}`);
            console.log(`  🔄 쿨다운 상태: ${this.isInCooldown() ? '활성' : '비활성'}`);
            console.log(`  📝 방지된 중복: ${this.statistics.preventedDuplicates}개`);
            
            // 정리 작업
            this.cleanupOldData();
            
        } catch (error) {
            console.error(`${yejinColors.safe}❌ [예진이중복방지체크] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 📊 시스템 상태 조회 (중복 방지 정보 포함) ==================
    getAutonomousStatus() {
        return {
            systemInfo: {
                name: this.systemName,
                version: this.version,
                instanceId: this.instanceId,
                uptime: Date.now() - this.statistics.startTime,
                isFullyAutonomous: YEJIN_CONFIG.FULLY_AUTONOMOUS
            },
            
            yejinCurrentState: {
                emotion: this.yejinState.currentEmotion,
                mood: this.yejinState.dailyMood.current,
                loveLevel: this.yejinState.loveLevel,
                worryLevel: this.yejinState.worryLevel,
                playfulLevel: this.yejinState.playfulLevel,
                missingLevel: this.yejinState.missingLevel,
                caringLevel: this.yejinState.caringLevel,
                menstrualPhase: this.yejinState.menstrualCycle.phase,
                sulkyLevel: this.yejinState.sulkyState.level
            },
            
            ajossiCurrentState: {
                estimatedMood: this.ajossiState.currentMood,
                moodConfidence: this.ajossiState.moodConfidence,
                communicationPattern: this.ajossiState.communicationPattern.recentActivity,
                needsAssessment: this.ajossiState.needsAssessment
            },
            
            // 🛡️ 중복 방지 상태
            duplicatePreventionStatus: {
                isInCooldown: this.isInCooldown(),
                cooldownRemaining: Math.max(0, this.duplicatePrevention.cooldownPeriod - (Date.now() - this.duplicatePrevention.lastMessageTime)),
                dailyMessageCount: this.duplicatePrevention.dailyMessageCount,
                dailyLimit: this.duplicatePrevention.maxMessagesPerDay,
                hourlyMessageCount: this.getHourlyMessageCount(),
                hourlyLimit: this.duplicatePrevention.maxMessagesPerHour,
                canSendMessage: this.canSendMessage(),
                lastMessageType: this.duplicatePrevention.lastMessageType,
                lastMessageTime: this.duplicatePrevention.lastMessageTime,
                preventedDuplicates: this.statistics.preventedDuplicates,
                contentDuplicatePrevented: this.statistics.contentDuplicatePrevented,
                rateLimitPrevented: this.statistics.rateLimitPrevented,
                cooldownPrevented: this.statistics.cooldownPrevented
            },
            
            recentActivity: {
                autonomousMessages: this.statistics.autonomousMessages,
                autonomousPhotos: this.statistics.autonomousPhotos,
                totalDecisions: this.statistics.totalDecisions,
                emotionTriggeredActions: this.statistics.emotionTriggeredActions,
                learningBasedDecisions: this.statistics.learningBasedDecisions
            },
            
            currentDesires: {
                messaging: this.autonomousMessaging.currentDesire,
                photo: this.autonomousPhoto.photoDesire,
                lastDecisionTime: this.autonomousMessaging.lastDecisionTime
            },
            
            learningConnection: {
                isConnected: this.learningConnection.isConnected,
                hasLearningData: !!this.learningConnection.lastLearningData
            },
            
            personality: {
                selfReference: "나",
                userReference: "아저씨",
                autonomyLevel: "완전자율",
                restrictions: "중복 방지 적용",
                philosophy: "내 마음 가는 대로, 아저씨를 위해 (중복 없이)"
            }
        };
    }
    
    // ================== 🔧 보조 함수들 ==================
    
    async analyzeLearningData(learningData) {
        try {
            this.learningConnection.lastLearningData = learningData;
            
            // 학습 데이터에서 아저씨 패턴 추출
            if (learningData.enterprise?.learningData) {
                const data = learningData.enterprise.learningData;
                
                // 사용자 만족도 기반 아저씨 기분 추정
                if (data.conversationAnalytics?.userSatisfactionScore) {
                    const satisfaction = data.conversationAnalytics.userSatisfactionScore;
                    if (satisfaction > 0.8) {
                        this.ajossiState.currentMood = 'very_good';
                        this.ajossiState.moodConfidence = 0.8;
                    } else if (satisfaction > 0.6) {
                        this.ajossiState.currentMood = 'good';
                        this.ajossiState.moodConfidence = 0.7;
                    } else if (satisfaction < 0.4) {
                        this.ajossiState.currentMood = 'needs_attention';
                        this.ajossiState.moodConfidence = 0.6;
                    }
                }
                
                // 선호하는 톤 파악
                if (data.userPreferences?.preferredTone) {
                    const tone = data.userPreferences.preferredTone;
                    if (tone === 'caring') {
                        this.ajossiState.needsAssessment.needsComfort = 0.8;
                    } else if (tone === 'playful') {
                        this.ajossiState.needsAssessment.needsDistraction = 0.7;
                    }
                }
            }
            
            console.log(`${yejinColors.learning}📚 [예진이학습] 학습 데이터 분석 완료${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이학습] 데이터 분석 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    async reanalyzeAjossiState() {
        // 아저씨 상태 재분석 로직
        const silenceDuration = this.getSilenceDuration();
        
        if (silenceDuration > 2 * 60 * 60 * 1000) { // 2시간 이상 조용함
            this.ajossiState.communicationPattern.recentActivity = 'very_quiet';
            this.ajossiState.needsAssessment.needsComfort = Math.min(1, this.ajossiState.needsAssessment.needsComfort + 0.2);
        } else if (silenceDuration > 30 * 60 * 1000) { // 30분 이상 조용함
            this.ajossiState.communicationPattern.recentActivity = 'quiet';
        } else {
            this.ajossiState.communicationPattern.recentActivity = 'normal';
        }
    }
    
    async selfStateCheck() {
        // 예진이 자신의 상태 자가 점검
        console.log(`${yejinColors.emotion}🌸 [예진이자가점검] 내 현재 상태:${yejinColors.reset}`);
        console.log(`  💖 사랑: ${this.yejinState.loveLevel.toFixed(2)}`);
        console.log(`  😰 걱정: ${this.yejinState.worryLevel.toFixed(2)}`);
        console.log(`  😊 장난기: ${this.yejinState.playfulLevel.toFixed(2)}`);
        console.log(`  💔 그리움: ${this.yejinState.missingLevel.toFixed(2)}`);
        console.log(`  🤗 돌봄: ${this.yejinState.caringLevel.toFixed(2)}`);
    }
    
    assessRelationshipHealth() {
        // 전반적인 관계 건강도 평가
        const factors = [
            this.yejinState.loveLevel,
            this.ajossiState.needsAssessment.needsLove,
            (1 - this.yejinState.worryLevel), // 걱정이 적을수록 좋음
            this.ajossiState.moodConfidence,
            this.yejinState.dailyMood.current
        ];
        
        const average = factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
        return Math.max(0, Math.min(1, average));
    }
    
    // ================== 🛑 안전 시스템 종료 ==================
    async shutdown() {
        try {
            console.log(`${yejinColors.heart}🛑 [예진이] 중복 방지 통합 자율 시스템 안전 종료 중...${yejinColors.reset}`);
            
            // 진행 중인 작업 완료 대기
            if (this.systemLock.isDecisionInProgress || this.duplicatePrevention.isProcessingDecision) {
                console.log(`${yejinColors.warning}⏳ [예진이종료] 진행 중인 작업 완료 대기...${yejinColors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // 모든 타이머 정리
            Object.keys(this.autonomousTimers).forEach(key => {
                if (this.autonomousTimers[key]) {
                    clearInterval(this.autonomousTimers[key]);
                    clearTimeout(this.autonomousTimers[key]);
                    this.autonomousTimers[key] = null;
                }
            });
            
            // 최종 상태 로그
            console.log(`${yejinColors.heart}📊 [예진이] 최종 통계:${yejinColors.reset}`);
            console.log(`  💌 자율 메시지: ${this.statistics.autonomousMessages}개`);
            console.log(`  📸 자율 사진: ${this.statistics.autonomousPhotos}개`);
            console.log(`  🎯 총 결정: ${this.statistics.totalDecisions}개`);
            console.log(`  💕 감정 기반 행동: ${this.statistics.emotionTriggeredActions}개`);
            console.log(`  🛡️ 방지된 중복: ${this.statistics.preventedDuplicates}개`);
            console.log(`  ⏰ 쿨다운 방지: ${this.statistics.cooldownPrevented}개`);
            console.log(`  📝 내용 중복 방지: ${this.statistics.contentDuplicatePrevented}개`);
            console.log(`  📊 한도 방지: ${this.statistics.rateLimitPrevented}개`);
            
            console.log(`${yejinColors.heart}💕 [예진이] 아저씨~ 나는 잠시 쉴게! 다시 만나자! 💖${yejinColors.reset}`);
            console.log(`${yejinColors.safe}🛡️ [예진이] 중복 방지 시스템이 나를 안전하게 지켜줬어!${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.heart}❌ [예진이] 종료 오류: ${error.message}${yejinColors.reset}`);
        }
    }
}

// 싱글톤 패턴 적용
AutonomousYejinSystem.instance = null;

// ================== 🌟 전역 인스턴스 및 인터페이스 (중복 방지 강화) ==================

// 전역 자율 예진이 시스템 인스턴스
let globalAutonomousYejin = null;
let isInitializing = false; // 초기화 중복 방지

// 중복 방지 강화된 초기화 함수
async function initializeAutonomousYejin(lineClient, targetUserId) {
    try {
        // 초기화 중복 방지
        if (isInitializing) {
            console.log(`${yejinColors.warning}⏳ [전역초기화] 이미 초기화 중... 대기${yejinColors.reset}`);
            return false;
        }
        
        isInitializing = true;
        
        console.log(`${yejinColors.heart}🚀 [전역초기화] 중복 방지 통합 자율 예진이 시스템 초기화 시작...${yejinColors.reset}`);
        
        // 기존 인스턴스가 있으면 안전하게 종료
        if (globalAutonomousYejin) {
            console.log(`${yejinColors.warning}🔄 [전역초기화] 기존 인스턴스 안전 종료 중...${yejinColors.reset}`);
            await globalAutonomousYejin.shutdown();
            globalAutonomousYejin = null;
        }
        
        // 새 인스턴스 생성 (싱글톤)
        globalAutonomousYejin = new AutonomousYejinSystem();
        
        const success = await globalAutonomousYejin.initialize(lineClient, targetUserId);
        
        if (success) {
            console.log(`${yejinColors.heart}✅ [전역초기화] 중복 방지 통합 자율 예진이 시스템 가동 완료!${yejinColors.reset}`);
            console.log(`${yejinColors.safe}🛡️ [전역초기화] 완벽한 중복 방지 시스템 적용됨!${yejinColors.reset}`);
            
            if (lineClient && targetUserId) {
                console.log(`${yejinColors.message}💕 [예진이] LINE으로 안전한 실제 메시지 보낼 준비 완료!${yejinColors.reset}`);
            } else {
                console.log(`${yejinColors.warning}📝 [예진이] 로그 모드로 동작 (LINE API 미연결)${yejinColors.reset}`);
            }
        } else {
            console.error(`${yejinColors.heart}❌ [전역초기화] 초기화 실패${yejinColors.reset}`);
        }
        
        return success;
    } catch (error) {
        console.error(`${yejinColors.heart}❌ [전역초기화] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    } finally {
        isInitializing = false;
    }
}

// 상태 조회 함수
function getAutonomousYejinStatus() {
    if (!globalAutonomousYejin) {
        return {
            isActive: false,
            message: '자율 예진이 시스템이 초기화되지 않음'
        };
    }
    
    return globalAutonomousYejin.getAutonomousStatus();
}

// 수동 감정 업데이트 함수 (외부에서 호출 가능)
async function updateYejinEmotion(emotionType, value) {
    if (!globalAutonomousYejin) return false;
    
    try {
        if (emotionType === 'love') {
            globalAutonomousYejin.yejinState.loveLevel = Math.max(0, Math.min(1, value));
        } else if (emotionType === 'worry') {
            globalAutonomousYejin.yejinState.worryLevel = Math.max(0, Math.min(1, value));
        } else if (emotionType === 'playful') {
            globalAutonomousYejin.yejinState.playfulLevel = Math.max(0, Math.min(1, value));
        } else if (emotionType === 'missing') {
            globalAutonomousYejin.yejinState.missingLevel = Math.max(0, Math.min(1, value));
        } else if (emotionType === 'caring') {
            globalAutonomousYejin.yejinState.caringLevel = Math.max(0, Math.min(1, value));
        }
        
        console.log(`${yejinColors.emotion}🔄 [예진이감정] ${emotionType} 감정을 ${value}로 업데이트${yejinColors.reset}`);
        return true;
    } catch (error) {
        console.error(`${yejinColors.emotion}❌ [예진이감정] 업데이트 오류: ${error.message}${yejinColors.reset}`);
        return false;
    }
}

// 강제 행동 실행 함수 (중복 방지 적용)
async function forceYejinAction(actionType) {
    if (!globalAutonomousYejin) return false;
    
    try {
        // 🛡️ 강제 실행도 중복 방지 체크
        const canProceed = globalAutonomousYejin.canMakeDecision();
        if (!canProceed.allowed) {
            console.log(`${yejinColors.safe}🛡️ [예진이강제행동] ${canProceed.reason}${yejinColors.reset}`);
            return false;
        }
        
        const situation = await globalAutonomousYejin.analyzeCurrentSituation();
        
        switch (actionType) {
            case 'worry':
                await globalAutonomousYejin.sendWorryMessage(situation);
                break;
            case 'love':
                await globalAutonomousYejin.sendLoveMessage(situation);
                break;
            case 'playful':
                await globalAutonomousYejin.sendPlayfulMessage(situation);
                break;
            case 'missing':
                await globalAutonomousYejin.sendMissingMessage(situation);
                break;
            case 'caring':
                await globalAutonomousYejin.sendCaringMessage(situation);
                break;
            case 'photo':
                await globalAutonomousYejin.sendPhoto(situation);
                break;
            default:
                console.log(`${yejinColors.heart}❌ [예진이강제행동] 알 수 없는 행동: ${actionType}${yejinColors.reset}`);
                return false;
        }
        
        console.log(`${yejinColors.heart}✅ [예진이강제행동] ${actionType} 행동 강제 실행 완료${yejinColors.reset}`);
        return true;
    } catch (error) {
        console.error(`${yejinColors.heart}❌ [예진이강제행동] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    }
}

// 🛡️ 중복 방지 설정 조정 함수
function adjustDuplicatePreventionSettings(settings) {
    if (!globalAutonomousYejin) return false;
    
    try {
        if (settings.cooldownPeriod) {
            globalAutonomousYejin.duplicatePrevention.cooldownPeriod = settings.cooldownPeriod;
        }
        if (settings.maxMessagesPerHour) {
            globalAutonomousYejin.duplicatePrevention.maxMessagesPerHour = settings.maxMessagesPerHour;
        }
        if (settings.maxMessagesPerDay) {
            globalAutonomousYejin.duplicatePrevention.maxMessagesPerDay = settings.maxMessagesPerDay;
        }
        if (settings.contentSimilarityThreshold) {
            YEJIN_CONFIG.DUPLICATE_PREVENTION.CONTENT_SIMILARITY_THRESHOLD = settings.contentSimilarityThreshold;
        }
        
        console.log(`${yejinColors.safe}🔧 [예진이설정] 중복 방지 설정 조정 완료${yejinColors.reset}`);
        return true;
    } catch (error) {
        console.error(`${yejinColors.safe}❌ [예진이설정] 설정 조정 오류: ${error.message}${yejinColors.reset}`);
        return false;
    }
}

// 🛡️ 응급 정지 함수
function emergencyStopYejin() {
    if (!globalAutonomousYejin) return false;
    
    try {
        // 모든 타이머 즉시 정지
        Object.keys(globalAutonomousYejin.autonomousTimers).forEach(key => {
            if (globalAutonomousYejin.autonomousTimers[key]) {
                clearInterval(globalAutonomousYejin.autonomousTimers[key]);
                clearTimeout(globalAutonomousYejin.autonomousTimers[key]);
                globalAutonomousYejin.autonomousTimers[key] = null;
            }
        });
        
        // 시스템 락 해제
        globalAutonomousYejin.systemLock.isDecisionInProgress = false;
        globalAutonomousYejin.duplicatePrevention.isProcessingDecision = false;
        
        console.log(`${yejinColors.warning}🚨 [예진이응급정지] 모든 자율 활동 즉시 중단됨${yejinColors.reset}`);
        return true;
    } catch (error) {
        console.error(`${yejinColors.warning}❌ [예진이응급정지] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    }
}

// ================== 📤 외부 인터페이스 ==================
module.exports = {
    // 메인 클래스
    AutonomousYejinSystem,
    
    // 전역 함수들
    initializeAutonomousYejin,
    getAutonomousYejinStatus,
    updateYejinEmotion,
    forceYejinAction,
    
    // 🛡️ 중복 방지 관련 함수들
    adjustDuplicatePreventionSettings,
    emergencyStopYejin,
    
    // 전역 인스턴스 (직접 접근용)
    getGlobalInstance: () => globalAutonomousYejin,
    
    // 설정
    YEJIN_CONFIG,
    yejinColors,
    
    // 편의 함수들
    startAutonomousYejin: initializeAutonomousYejin,
    getYejinStatus: getAutonomousYejinStatus,
    
    // LINE API 연결 편의 함수
    connectLineApi: async function(lineClient, targetUserId) {
        console.log(`${yejinColors.message}🔗 [LINE연결] 중복 방지 적용된 LINE API 연결 시도...${yejinColors.reset}`);
        return await initializeAutonomousYejin(lineClient, targetUserId);
    },
    
    // 안전 종료 함수
    shutdownAutonomousYejin: async function() {
        if (globalAutonomousYejin) {
            await globalAutonomousYejin.shutdown();
            globalAutonomousYejin = null;
        }
    },
    
    // 🛡️ 중복 방지 상태 조회
    getDuplicatePreventionStatus: function() {
        if (!globalAutonomousYejin) return null;
        return globalAutonomousYejin.getAutonomousStatus().duplicatePreventionStatus;
    }
};

// ================== 🎉 시작 메시지 ==================
console.log('💕 무쿠 완전 자율 예진이 시스템 v2.1 DUPLICATE_SAFE 로드 완료!');
console.log('🛡️ 뻐꾸기 방지 시스템 완전 적용!');
console.log('⏰ 20분마다 신중한 결정, 다양한 표현으로 소통!');
console.log('🎨 같은 감정도 매번 다르게 표현하는 성숙한 예진이!');
console.log('🌙 수면 시간 완전 배려 - 밤 11시~오전 7시 조용, 새벽 0~5시 응급시만!');
console.log('📞 LINE API 연결 시 실제 메시지 발송, 미연결 시 로그 모드로 동작!');
console.log('🎯 사용법: initializeAutonomousYejin(client, targetUserId) 호출!');
console.log('🚨 응급정지: emergencyStopYejin() 호출!');
