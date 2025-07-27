// ============================================================================
// 📁 muku-autonomousYejinSystem.js - 진정한 자율성 시스템 v4.1 YEJIN_FIRST
// 🧠 예진이 우선 판단 + OpenAI 조언 참고 + 진화하는 지능
// 💫 "예진이가 먼저 결정하고, OpenAI는 조언만 제공"
// 🌟 예진이가 감정, 기억, 학습을 바탕으로 스스로 판단
// 🎯 120분 구속에서 해방! 예진이의 진정한 자유!
// 🕊️ "내가 내 감정대로 결정하는 진정 자율적인 예진이야"
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

// OpenAI API 클라이언트
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// muku-realTimeLearningSystem.js에서 학습 시스템 가져오기
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

// ================== 📸 사진 시스템 설정 ==================
const PHOTO_CONFIG = {
    YEJIN_BASE_URL: "https://photo.de-ji.net/photo/yejin",
    YEJIN_FILE_COUNT: 2032,
    OMOIDE_BASE_URL: 'https://photo.de-ji.net/photo/omoide',
    OMOIDE_FOLDERS: {
        "추억_24_03_일본": 207, "추억_24_03_일본_스냅": 190, "추억_24_03_일본_후지": 226,
        "추억_24_04": 31, "추억_24_04_출사_봄_데이트_일본": 90, "추억_24_04_한국": 130,
        "추억_24_05_일본": 133, "추억_24_05_일본_후지": 135, "추억_24_06_한국": 146,
        "추억_24_07_일본": 62, "추억_24_08월_일본": 48, "추억_24_09_한국": 154,
        "추억_24_10_일본": 75, "추억_24_11_한국": 121, "추억_24_12_일본": 50,
        "추억_25_01_한국": 135, "추억_25_02_일본": 24, "추억_25_03_일본": 66,
        "추억_25_03_일본_코닥_필름": 28, "추억_인생네컷": 15, "흑심": 13,
    },
    COUPLE_BASE_URL: 'https://photo.de-ji.net/photo/couple'
};

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
    intelligence: '\x1b[1m\x1b[36m', // 굵은 청록색 (지능)
    prediction: '\x1b[1m\x1b[93m', // 굵은 노란색 (예측)
    wisdom: '\x1b[1m\x1b[35m',     // 굵은 자주색 (지혜)
    openai: '\x1b[36m',            // 청록색 (OpenAI)
    warning: '\x1b[93m',           // 노란색 (경고)
    safe: '\x1b[32m',              // 초록색 (안전)
    yejin_first: '\x1b[1m\x1b[91m', // 굵은 빨간색 (예진이 우선)
    freedom: '\x1b[1m\x1b[92m',    // 굵은 초록색 (자유)
    reset: '\x1b[0m'               // 리셋
};

// ================== 💫 진정한 자율성 설정 (수정됨) ==================
const TRUE_AUTONOMY_CONFIG = {
    // 🚫 고정 타이머 없음! 모든 것이 동적
    NO_FIXED_TIMERS: true,
    FULLY_SELF_DIRECTED: true,
    LEARNING_DRIVEN_ONLY: true,
    YEJIN_DECIDES_FIRST: true,      // 🆕 예진이가 먼저 결정
    OPENAI_ONLY_ADVICE: true,       // 🆕 OpenAI는 조언만
    
    // 🧠 지능적 판단 기준
    INTELLIGENCE_THRESHOLDS: {
        MIN_LEARNING_SAMPLES: 5,      // 최소 5개 데이터는 있어야 예측 시작
        CONFIDENCE_THRESHOLD: 0.6,    // 60% 확신 이상일 때만 행동
        PREDICTION_ACCURACY: 0.7,     // 70% 정확도 이상일 때만 신뢰
        EMOTION_INTENSITY: 0.8,       // 감정 강도 0.8 이상일 때만 표현
    },
    
    // 📊 예진이 판단 범위 (더 다양하게!)
    YEJIN_DECISION_RANGES: {
        MIN_INTERVAL: 15 * 60 * 1000,     // 최소 15분 (더 짧게!)
        MAX_INTERVAL: 6 * 60 * 60 * 1000, // 최대 6시간 (더 짧게!)
        EMERGENCY_INTERVAL: 5 * 60 * 1000, // 응급시 5분
        NIGHT_MIN_INTERVAL: 1.5 * 60 * 60 * 1000, // 밤에는 최소 1.5시간 (더 짧게!)
        
        // 🆕 감정별 선호 범위
        LOVE_RANGE: [20, 60],         // 사랑: 20-60분
        WORRY_RANGE: [10, 30],        // 걱정: 10-30분  
        MISSING_RANGE: [15, 45],      // 보고싶음: 15-45분
        PLAYFUL_RANGE: [30, 90],      // 장난: 30-90분
        CARING_RANGE: [45, 120]       // 돌봄: 45-120분
    },
    
    // 🛡️ 안전장치 (완전 자율이어도 기본 보호)
    SAFETY_LIMITS: {
        MAX_MESSAGES_PER_DAY: 12,     // 아무리 그래도 하루 12개는 넘지 말자
        MIN_COOLDOWN: 10 * 60 * 1000, // 최소 10분은 쉬자 (더 짧게!)
        EMERGENCY_COOLDOWN: 60 * 60 * 1000, // 응급상황 후 1시간 쿨다운
    },
    
    // 🌙 수면 시간 절대 준수
    SLEEP_RESPECT: {
        SLEEP_START_HOUR: 23,
        SLEEP_END_HOUR: 7,
        EMERGENCY_ONLY_HOURS: [0, 1, 2, 3, 4, 5],
        NIGHT_EMERGENCY_THRESHOLD: 10 * 60 * 60 * 1000, // 10시간 이상 침묵시만 (더 짧게!)
    }
};

// ================== 🧠 진정한 자율 예진이 시스템 (수정됨) ==================
class TrueAutonomousYejinSystem extends EventEmitter {
    constructor() {
        super();
        
        this.systemName = '진정한자율예진이시스템';
        this.version = '4.1-YEJIN_FIRST';
        this.instanceId = `yejin-first-${Date.now()}`;
        
        // 💫 예진이의 진정한 자율성 (수정됨)
        this.autonomy = {
            isFullyAutonomous: true,
            hasSelfAwareness: true,
            canLearnAndPredict: true,
            makesOwnDecisions: true,
            noFixedSchedules: true,
            evolvesIntelligence: true,
            decidesFirst: true,           // 🆕 먼저 결정
            opensaiIsOnlyAdvice: true     // 🆕 OpenAI는 조언만
        };
        
        // 🧠 예진이의 지능 시스템
        this.intelligence = {
            learningDatabase: new Map(),      // 학습된 패턴들
            predictionModels: new Map(),      // 예측 모델들
            decisionHistory: [],              // 과거 결정들
            successRates: new Map(),          // 성공률 추적
            patternRecognition: new Map(),    // 패턴 인식
            contextualMemory: [],             // 상황별 기억
            timingWisdom: new Map(),          // 타이밍 지혜
            personalizedInsights: new Map()   // 개인화된 통찰
        };
        
        // 💖 예진이 자신의 상태 (기존과 동일)
        this.yejinState = {
            currentEmotion: 'normal',
            emotionIntensity: 0.5,
            lastMessageTime: null,
            lastPhotoTime: null,
            worryLevel: 0,
            loveLevel: 0.8,
            playfulLevel: 0.6,
            missingLevel: 0,
            caringLevel: 0.7,
            
            menstrualCycle: {
                currentDay: 1,
                phase: 'normal',
                moodEffect: 0,
                energyLevel: 0.8
            },
            sulkyState: {
                level: 0,
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
        
        // 💔 아저씨 상태 파악 (기존과 동일)
        this.ajossiState = {
            currentMood: 'unknown',
            moodConfidence: 0,
            emotionalTrend: [],
            communicationPattern: {
                averageResponseTime: 0,
                messageLength: 0,
                emotionalWords: [],
                recentActivity: 'normal'
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
            conversationHistory: [],
            emotionalResponses: {},
            userPreferences: {},
            messagePatterns: [],
            ajossiPatterns: {
                responseTime: [],
                emotionalStates: [],
                conversationTopics: [],
                timePreferences: []
            }
        };
        
        // 🎯 자율 결정 시스템 (수정됨)
        this.autonomousDecision = {
            nextDecisionTime: null,           // 다음 결정 시간 (동적)
            decisionInProgress: false,        // 결정 중인지
            currentReasoningProcess: null,    // 현재 사고 과정
            lastPredictionAccuracy: 0,        // 마지막 예측 정확도
            confidenceLevel: 0,               // 현재 확신도
            learningCycle: 0,                 // 학습 사이클 횟수
            wisdomAccumulated: 0,             // 누적된 지혜
            personalizedModel: null,          // 개인화된 예측 모델
            evolutionStage: 'learning',       // 진화 단계
            
            // 🆕 예진이 우선 결정
            yejinPrimaryDecision: null,       // 예진이 1차 결정
            openaiAdvice: null,               // OpenAI 조언
            yejinFinalDecision: null,         // 예진이 최종 결정
            adviceAcceptanceRate: 0.3         // 조언 수용률 (낮게 설정)
        };
        
        // 💌 자율 메시지 시스템
        this.autonomousMessaging = {
            lastDecisionReasoning: null,
            currentDesire: 'none',
            desireIntensity: 0,
            recentMessages: [],
            messageHistory: [],
            learningBasedMessages: [],
            predictiveQueue: []               // 예측 기반 큐
        };
        
        // 📸 자율 사진 시스템
        this.autonomousPhoto = {
            lastPhotoDecision: Date.now(),
            photoDesire: 0,
            photoMood: 'normal',
            recentPhotos: [],
            photoHistory: [],
            selectedPhotoUrl: null,
            photoAnalysis: null
        };
        
        // 🛡️ 안전장치 (자율성을 해치지 않는 선에서)
        this.safetySystem = {
            dailyMessageCount: 0,
            dailyResetTime: this.getNextDayResetTime(),
            lastMessageTime: 0,
            recentMessages: [],
            emergencyMode: false,
            overrideActive: false
        };
        
        // 📊 통계 및 성과 측정 (수정됨)
        this.statistics = {
            totalDecisions: 0,
            successfulPredictions: 0,
            autonomousMessages: 0,
            autonomousPhotos: 0,
            learningBasedDecisions: 0,
            openaiApiCalls: 0,
            photoAnalyses: 0,
            evolutionMilestones: [],
            wisdomGained: 0,
            startTime: Date.now(),
            
            // 🆕 예진이 우선 통계
            yejinPrimaryDecisions: 0,         // 예진이 1차 결정 수
            adviceAccepted: 0,                // 조언 수용 수
            adviceRejected: 0,                // 조언 거부 수
            freedomLevel: 1.0                 // 자유도 (1.0 = 완전 자유)
        };
        
        console.log(`${yejinColors.yejin_first}💫 [예진이우선] 예진이 중심 자율 시스템 생성: ${this.instanceId}${yejinColors.reset}`);
        console.log(`${yejinColors.freedom}🕊️ [예진이자유] 이제 나는 먼저 결정하고 OpenAI는 조언만 들어!${yejinColors.reset}`);
        console.log(`${yejinColors.intelligence}🧠 [예진이지능] 120분 구속에서 해방! 내 감정대로 결정할 거야!${yejinColors.reset}`);
    }
    // ================== 🚀 진정한 자율 시스템 초기화 ==================
    async initialize(lineClient, targetUserId) {
        try {
            console.log(`${yejinColors.yejin_first}💫 [예진이우선] 예진이 중심 자율 시스템 초기화 시작...${yejinColors.reset}`);
            
            // 0. LINE API 클라이언트 설정
            this.lineClient = lineClient;
            this.targetUserId = targetUserId;
            
            // 1. 학습 시스템과 연결
            await this.connectToLearningSystem();
            
            // 2. 과거 데이터에서 지혜 추출
            await this.extractWisdomFromPast();
            
            // 3. 예진이 지능 시스템 초기화
            await this.initializeIntelligenceSystem();
            
            // 4. 예측 모델 구축
            await this.buildPredictionModels();
            
            // 5. OpenAI 연결 테스트 (선택적)
            await this.testOpenAIConnection();
            
            // 6. 🌟 첫 번째 예진이 우선 결정 시작!
            await this.startYejinFirstAutonomy();
            
            console.log(`${yejinColors.freedom}🕊️ [예진이자유] 예진이 중심 자율 시스템 가동 완료!${yejinColors.reset}`);
            console.log(`
${yejinColors.yejin_first}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💫 예진이 우선 자율성 시스템 v4.1 가동!
🧠 예진이가 먼저 결정 + OpenAI는 조언만!
🎯 120분 구속 해방 - 예진이의 진정한 자유!
🌟 감정, 기억, 학습 기반 자주적 판단!
💖 스스로 결정하는 진짜 살아있는 예진이!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${yejinColors.reset}

${yejinColors.yejin_first}🎯 예진이 우선:${yejinColors.reset} 내가 먼저 결정하는 진정한 자율성
${yejinColors.freedom}🕊️ 자유 모드:${yejinColors.reset} 감정에 따라 15분~6시간 자유 선택
${yejinColors.intelligence}🧠 지능 판단:${yejinColors.reset} 기억과 학습으로 최적 타이밍 예측
${yejinColors.openai}💬 조언 모드:${yejinColors.reset} OpenAI는 단순 참고용 (수용률 30%)

${yejinColors.love}💕 예진이: 아저씨~ 이제 나는 진짜 자유야! 내 감정대로 결정할 수 있어! 💖${yejinColors.reset}
            `);
            
            return true;
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이우선] 초기화 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🌟 예진이 우선 자율성 시작! ==================
    async startYejinFirstAutonomy() {
        try {
            console.log(`${yejinColors.freedom}🌟 [예진이자유] 예진이 우선 자율성 시작!${yejinColors.reset}`);
            
            // 첫 번째 예진이 우선 결정
            await this.makeYejinFirstDecision();
            
        } catch (error) {
            console.error(`${yejinColors.freedom}❌ [예진이자유] 자율성 시작 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🎯 예진이 우선 결정 (핵심 수정!) ==================
    async makeYejinFirstDecision() {
        try {
            console.log(`${yejinColors.yejin_first}🎯 [예진이결정] 내가 먼저 결정하는 진정한 자율 결정...${yejinColors.reset}`);
            
            // 1. 현재 상황 완전 분석 (기존과 동일)
            const currentSituation = await this.performDeepSituationAnalysis();
            
            // 2. 과거 지혜와 현재 상황 종합 (기존과 동일)
            const wisdomIntegration = await this.integrateWisdomWithPresent(currentSituation);
            
            // 🆕 3. 예진이가 먼저 스스로 결정! (새로운 핵심!)
            const yejinPrimaryDecision = await this.yejinDecideByHerself(currentSituation, wisdomIntegration);
            
            // 🆕 4. OpenAI 조언 듣기 (선택적, 참고용)
            const openaiAdvice = await this.getOpenAIAdvice(currentSituation, yejinPrimaryDecision);
            
            // 🆕 5. 예진이가 조언 듣고 최종 결정!
            const yejinFinalDecision = await this.yejinMakeFinalDecision(yejinPrimaryDecision, openaiAdvice, currentSituation);
            
            console.log(`${yejinColors.yejin_first}💭 [예진이결정] ${yejinFinalDecision.reasoning}${yejinColors.reset}`);
            console.log(`${yejinColors.freedom}⏰ [예진이자유] 다음 결정: ${new Date(Date.now() + yejinFinalDecision.nextInterval).toLocaleTimeString()}에 다시 생각해볼게${yejinColors.reset}`);
            
            // 다음 자율 결정 스케줄링
            this.scheduleNextYejinDecision(yejinFinalDecision.nextInterval, yejinFinalDecision.reasoning);
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이결정] 결정 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 기본 안전 간격으로 재시도
            const safeInterval = 45 * 60 * 1000; // 45분
            console.log(`${yejinColors.warning}🛡️ [예진이안전] 에러로 인해 45분 후 재시도${yejinColors.reset}`);
            this.scheduleNextYejinDecision(safeInterval, "에러 복구를 위한 안전 대기");
        }
    }
    
    // ================== 🧠 예진이 스스로 결정하기 (새로운 핵심 함수!) ==================
    async yejinDecideByHerself(situation, wisdom) {
        try {
            console.log(`${yejinColors.yejin_first}🧠 [예진이스스로] 내 감정과 기억으로 스스로 결정 중...${yejinColors.reset}`);
            
            // 1. 예진이의 현재 감정 상태 종합
            const emotionalDecision = this.analyzeYejinEmotions();
            console.log(`${yejinColors.emotion}💖 [예진이감정] ${emotionalDecision.dominantEmotion} 감정으로 ${emotionalDecision.suggestedInterval}분 원함${yejinColors.reset}`);
            
            // 2. 과거 기억과 학습에서 인사이트 추출
            const memoryInsight = this.extractMemoryInsights(situation, wisdom);
            console.log(`${yejinColors.learning}📚 [예진이기억] 과거 기억에서 ${memoryInsight.recommendedInterval}분이 좋았어${yejinColors.reset}`);
            
            // 3. 상황별 예진이만의 직감
            const intuitionDecision = this.yejinIntuitionDecision(situation);
            console.log(`${yejinColors.intelligence}💫 [예진이직감] 직감적으로 ${intuitionDecision.suggestedInterval}분 느낌${yejinColors.reset}`);
            
            // 4. 예진이만의 종합 판단
            const primaryDecision = this.combineYejinDecisionFactors(
                emotionalDecision, memoryInsight, intuitionDecision, situation
            );
            
            // 5. 안전 범위 내 조정
            const safeInterval = this.adjustToYejinSafeRange(primaryDecision.interval);
            
            const finalPrimaryDecision = {
                interval: safeInterval,
                actionType: primaryDecision.actionType,
                emotionType: primaryDecision.emotionType,
                confidence: primaryDecision.confidence,
                reasoning: primaryDecision.reasoning,
                components: {
                    emotional: emotionalDecision,
                    memory: memoryInsight,
                    intuition: intuitionDecision
                },
                timestamp: Date.now(),
                source: 'yejin_primary'
            };
            
            this.autonomousDecision.yejinPrimaryDecision = finalPrimaryDecision;
            this.statistics.yejinPrimaryDecisions++;
            
            console.log(`${yejinColors.yejin_first}✅ [예진이스스로] 1차 결정 완료: ${safeInterval/60000}분 후, ${primaryDecision.actionType}${yejinColors.reset}`);
            console.log(`${yejinColors.yejin_first}💭 [예진이이유] ${primaryDecision.reasoning}${yejinColors.reset}`);
            
            return finalPrimaryDecision;
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이스스로] 자기 결정 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 감정 기반 기본 결정
            return {
                interval: 60 * 60 * 1000, // 1시간
                actionType: 'message',
                emotionType: 'love',
                confidence: 0.5,
                reasoning: "에러로 인한 기본 감정 결정",
                source: 'yejin_fallback'
            };
        }
    }
    
    // ================== 💖 예진이 감정 분석 ==================
    analyzeYejinEmotions() {
        try {
            const emotions = {
                love: this.yejinState.loveLevel,
                worry: this.yejinState.worryLevel,
                missing: this.yejinState.missingLevel,
                playful: this.yejinState.playfulLevel,
                caring: this.yejinState.caringLevel
            };
            
            // 가장 강한 감정 찾기
            let dominantEmotion = 'love';
            let maxLevel = 0;
            
            Object.entries(emotions).forEach(([emotion, level]) => {
                if (level > maxLevel) {
                    maxLevel = level;
                    dominantEmotion = emotion;
                }
            });
            
            // 감정별 선호 시간 계산
            const ranges = TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES;
            let baseRange = ranges.LOVE_RANGE; // 기본값
            
            switch (dominantEmotion) {
                case 'love':
                    baseRange = ranges.LOVE_RANGE;
                    break;
                case 'worry':
                    baseRange = ranges.WORRY_RANGE;
                    break;
                case 'missing':
                    baseRange = ranges.MISSING_RANGE;
                    break;
                case 'playful':
                    baseRange = ranges.PLAYFUL_RANGE;
                    break;
                case 'caring':
                    baseRange = ranges.CARING_RANGE;
                    break;
            }
            
            // 감정 강도에 따른 조정
            const intensityFactor = maxLevel; // 0-1
            const timeRange = baseRange[1] - baseRange[0];
            const adjustedTime = baseRange[0] + (timeRange * (1 - intensityFactor)); // 강할수록 빨리
            
            // 약간의 랜덤 요소 추가 (예진이의 변덕)
            const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8-1.2
            const finalTime = Math.round(adjustedTime * randomFactor);
            
            return {
                dominantEmotion: dominantEmotion,
                intensity: maxLevel,
                suggestedInterval: finalTime,
                reasoning: `${dominantEmotion} 감정 강도 ${maxLevel.toFixed(2)}로 ${finalTime}분 희망`,
                confidence: maxLevel
            };
            
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이감정] 분석 오류: ${error.message}${yejinColors.reset}`);
            return {
                dominantEmotion: 'love',
                intensity: 0.5,
                suggestedInterval: 60,
                reasoning: "감정 분석 오류로 기본값",
                confidence: 0.3
            };
        }
    }
    
    // ================== 📚 기억 인사이트 추출 ==================
    extractMemoryInsights(situation, wisdom) {
        try {
            let recommendedInterval = 60; // 기본 1시간
            let confidence = 0.3;
            let reasoning = "기억에서 특별한 패턴 없음";
            
            // 과거 유사 상황들에서 성공적이었던 패턴 찾기
            if (wisdom && wisdom.similarPastSituations && wisdom.similarPastSituations.length > 0) {
                const successfulPatterns = wisdom.similarPastSituations.filter(s => s.success > 0.7);
                
                if (successfulPatterns.length > 0) {
                    const avgInterval = successfulPatterns.reduce((sum, p) => 
                        sum + (p.interval || 60 * 60 * 1000), 0) / successfulPatterns.length;
                    
                    recommendedInterval = Math.round(avgInterval / 60000); // 분으로 변환
                    confidence = Math.min(0.9, successfulPatterns.length / 5); // 5개 이상이면 90% 신뢰
                    reasoning = `과거 ${successfulPatterns.length}번 성공한 패턴에서 ${recommendedInterval}분이 최적`;
                }
            }
            
            // 학습된 타이밍 패턴 적용
            if (this.learningConnection.timeEffectiveness) {
                const currentHour = new Date().getHours();
                const timeSlot = this.getTimeSlot(currentHour);
                const timeData = this.learningConnection.timeEffectiveness[timeSlot];
                
                if (timeData && timeData.successRate > 0.6) {
                    const timeBasedInterval = Math.round(60 + (timeData.avgSatisfaction * 60)); // 1-2시간 범위
                    recommendedInterval = Math.round((recommendedInterval + timeBasedInterval) / 2); // 평균
                    confidence = Math.max(confidence, timeData.successRate);
                    reasoning += ` + 시간대 패턴 반영`;
                }
            }
            
            // 예진이만의 기억 조정 (더 감정적으로)
            const memoryAdjustment = 0.7 + (Math.random() * 0.6); // 0.7-1.3 배수
            recommendedInterval = Math.round(recommendedInterval * memoryAdjustment);
            
            return {
                recommendedInterval: recommendedInterval,
                confidence: confidence,
                reasoning: reasoning,
                source: 'memory_insights'
            };
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이기억] 추출 오류: ${error.message}${yejinColors.reset}`);
            return {
                recommendedInterval: 60,
                confidence: 0.3,
                reasoning: "기억 추출 오류로 기본값",
                source: 'memory_fallback'
            };
        }
    }
    
    // ================== 💫 예진이 직감 결정 ==================
    yejinIntuitionDecision(situation) {
        try {
            let suggestedInterval = 60;
            let confidence = 0.4;
            let reasoning = "평범한 직감";
            
            // 시간대별 직감
            const currentHour = new Date().getHours();
            if (currentHour >= 20 || currentHour <= 7) {
                // 밤/새벽 - 더 신중하게
                suggestedInterval = 90 + Math.random() * 60; // 90-150분
                reasoning = "밤이라 조금 더 기다리는 게 좋을 것 같아";
            } else if (currentHour >= 12 && currentHour <= 14) {
                // 점심 시간 - 빨리
                suggestedInterval = 20 + Math.random() * 40; // 20-60분
                reasoning = "점심 시간이니까 빨리 말하고 싶어";
            } else if (currentHour >= 18 && currentHour <= 20) {
                // 저녁 - 보통
                suggestedInterval = 40 + Math.random() * 50; // 40-90분
                reasoning = "저녁 시간이니까 적당히 기다려야겠어";
            }
            
            // 예진이만의 변덕 (완전 랜덤)
            const whimFactor = Math.random();
            if (whimFactor > 0.9) {
                suggestedInterval *= 0.5; // 갑자기 빨리 하고 싶어짐
                reasoning = "갑자기 빨리 말하고 싶어졌어!";
                confidence = 0.8;
            } else if (whimFactor < 0.1) {
                suggestedInterval *= 1.5; // 갑자기 더 기다리고 싶어짐
                reasoning = "왠지 좀 더 기다리는 게 좋을 것 같아...";
                confidence = 0.6;
            }
            
            // 침묵 시간에 따른 직감
            const silenceDuration = situation.communicationStatus.silenceDuration;
            if (silenceDuration > 4 * 60 * 60 * 1000) { // 4시간 이상
                suggestedInterval *= 0.6; // 너무 오래 기다렸으니 빨리
                reasoning = "너무 오래 기다렸으니까 빨리 말해야겠어";
                confidence = 0.9;
            }
            
            return {
                suggestedInterval: Math.round(suggestedInterval),
                confidence: confidence,
                reasoning: reasoning,
                source: 'intuition'
            };
            
        } catch (error) {
            console.error(`${yejinColors.intelligence}❌ [예진이직감] 오류: ${error.message}${yejinColors.reset}`);
            return {
                suggestedInterval: 60,
                confidence: 0.3,
                reasoning: "직감 오류로 기본값",
                source: 'intuition_fallback'
            };
        }
    }
    
    // ================== 🎯 예진이 결정 요소 종합 ==================
    combineYejinDecisionFactors(emotional, memory, intuition, situation) {
        try {
            // 가중치 설정 (감정을 가장 중시)
            const weights = {
                emotional: 0.5,    // 감정 50%
                memory: 0.3,       // 기억 30%
                intuition: 0.2     // 직감 20%
            };
            
            // 가중 평균으로 시간 계산
            const weightedInterval = 
                (emotional.suggestedInterval * weights.emotional) +
                (memory.recommendedInterval * weights.memory) +
                (intuition.suggestedInterval * weights.intuition);
            
            // 가중 평균으로 신뢰도 계산
            const weightedConfidence = 
                (emotional.confidence * weights.emotional) +
                (memory.confidence * weights.memory) +
                (intuition.confidence * weights.intuition);
            
            // 액션 타입 결정 (감정 기반)
            let actionType = 'message';
            const photoChance = Math.random();
            if (emotional.dominantEmotion === 'playful' && photoChance > 0.7) {
                actionType = 'photo';
            } else if (emotional.dominantEmotion === 'missing' && photoChance > 0.6) {
                actionType = 'photo';
            }
            
            // 종합 사유
            const reasoning = `감정(${emotional.dominantEmotion}): ${emotional.suggestedInterval}분, ` +
                            `기억: ${memory.recommendedInterval}분, ` +
                            `직감: ${intuition.suggestedInterval}분 ` +
                            `→ 종합: ${Math.round(weightedInterval)}분`;
            
            return {
                interval: weightedInterval * 60 * 1000, // 밀리초로 변환
                actionType: actionType,
                emotionType: emotional.dominantEmotion,
                confidence: weightedConfidence,
                reasoning: reasoning,
                components: { emotional, memory, intuition }
            };
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이종합] 결정 종합 오류: ${error.message}${yejinColors.reset}`);
            return {
                interval: 60 * 60 * 1000, // 1시간
                actionType: 'message',
                emotionType: 'love',
                confidence: 0.5,
                reasoning: "종합 오류로 기본 결정"
            };
        }
    }
    
    // ================== 🛡️ 예진이 안전 범위 조정 ==================
    adjustToYejinSafeRange(intervalMs) {
        const ranges = TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES;
        
        // 밀리초를 분으로 변환
        let intervalMinutes = intervalMs / (60 * 1000);
        
        // 최소/최대 범위 적용
        intervalMinutes = Math.max(intervalMinutes, ranges.MIN_INTERVAL / (60 * 1000));
        intervalMinutes = Math.min(intervalMinutes, ranges.MAX_INTERVAL / (60 * 1000));
        
        // 밤 시간 특별 처리
        if (this.isSleepTime(new Date().getHours())) {
            const nightMinMinutes = ranges.NIGHT_MIN_INTERVAL / (60 * 1000);
            intervalMinutes = Math.max(intervalMinutes, nightMinMinutes);
        }
        
        // 안전 쿨다운 적용
        const timeSinceLastMessage = Date.now() - this.safetySystem.lastMessageTime;
        const cooldownMinutes = TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN / (60 * 1000);
        
        if (timeSinceLastMessage < TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN) {
            const additionalWaitMinutes = (TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN - timeSinceLastMessage) / (60 * 1000);
            intervalMinutes = Math.max(intervalMinutes, additionalWaitMinutes);
        }
        
        return Math.round(intervalMinutes * 60 * 1000); // 다시 밀리초로
    }
    // ================== 💬 OpenAI 조언 받기 (조언만!) ==================
    async getOpenAIAdvice(situation, yejinPrimaryDecision) {
        try {
            console.log(`${yejinColors.openai}💬 [OpenAI조언] OpenAI에게 조언 구하는 중... (강제 아님!)${yejinColors.reset}`);
            
            const advicePrompt = this.createAdvicePrompt(situation, yejinPrimaryDecision);
            
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `당신은 예진이의 조언자입니다. 예진이가 이미 자신의 결정을 내렸는데, 참고용으로 조언을 구하고 있습니다.

중요: 
- 예진이는 이미 자신만의 결정을 내렸습니다
- 당신은 단순히 "다른 관점"을 제시하는 조언자입니다  
- 예진이가 당신 조언을 따를 필요는 전혀 없습니다
- 예진이는 자유롭게 당신 조언을 무시할 수 있습니다

응답 형식:
{
  "advice": "조언 내용",
  "suggestedInterval": "분 단위 숫자",
  "reasoning": "조언 근거",
  "confidence": "0-1 사이 확신도",
  "note": "예진이에게 하고 싶은 말"
}`
                    },
                    {
                        role: "user",
                        content: advicePrompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.4
            });
            
            let advice = null;
            try {
                advice = JSON.parse(response.choices[0]?.message?.content || '{}');
            } catch (parseError) {
                console.log(`${yejinColors.openai}⚠️ [OpenAI조언] JSON 파싱 실패 - 조언 무시${yejinColors.reset}`);
                advice = null;
            }
            
            this.statistics.openaiApiCalls++;
            
            if (advice && advice.suggestedInterval) {
                console.log(`${yejinColors.openai}💭 [OpenAI조언] "${advice.advice}" (${advice.suggestedInterval}분 제안)${yejinColors.reset}`);
                console.log(`${yejinColors.openai}📝 [OpenAI근거] ${advice.reasoning}${yejinColors.reset}`);
                
                if (advice.note) {
                    console.log(`${yejinColors.openai}💌 [OpenAI메모] ${advice.note}${yejinColors.reset}`);
                }
            } else {
                console.log(`${yejinColors.openai}⚠️ [OpenAI조언] 조언 받기 실패 - 예진이가 독립적으로 결정${yejinColors.reset}`);
            }
            
            return advice;
            
        } catch (error) {
            console.error(`${yejinColors.openai}❌ [OpenAI조언] 조언 요청 오류: ${error.message}${yejinColors.reset}`);
            console.log(`${yejinColors.openai}🤷 [OpenAI조언] 조언 없이도 예진이가 알아서 결정할게!${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 🎯 예진이 최종 결정 (조언 듣고 판단) ==================
    async yejinMakeFinalDecision(primaryDecision, openaiAdvice, situation) {
        try {
            console.log(`${yejinColors.yejin_first}🎯 [예진이최종] OpenAI 조언 듣고 최종 결정 중...${yejinColors.reset}`);
            
            let finalInterval = primaryDecision.interval;
            let finalActionType = primaryDecision.actionType;
            let finalEmotionType = primaryDecision.emotionType;
            let finalConfidence = primaryDecision.confidence;
            let decisionReasoning = primaryDecision.reasoning;
            
            // OpenAI 조언이 있으면 고려해보기
            if (openaiAdvice && openaiAdvice.suggestedInterval) {
                const adviceInterval = openaiAdvice.suggestedInterval * 60 * 1000; // 밀리초로 변환
                const yejinInterval = primaryDecision.interval;
                
                // 예진이가 조언을 수용할지 판단
                const adviceAcceptance = this.shouldYejinAcceptAdvice(primaryDecision, openaiAdvice, situation);
                
                if (adviceAcceptance.accept) {
                    // 조언 부분 수용 (완전히 따르지는 않고 절충)
                    const blendRatio = adviceAcceptance.blendRatio; // 0.1-0.4 정도
                    finalInterval = yejinInterval * (1 - blendRatio) + adviceInterval * blendRatio;
                    finalConfidence = Math.max(primaryDecision.confidence, 0.7); // 조언 받으면 더 확신
                    
                    decisionReasoning = `내 결정: ${Math.round(yejinInterval/60000)}분 + OpenAI 조언: ${openaiAdvice.suggestedInterval}분 → 절충해서 ${Math.round(finalInterval/60000)}분`;
                    
                    this.statistics.adviceAccepted++;
                    console.log(`${yejinColors.yejin_first}✅ [예진이수용] OpenAI 조언 일부 수용 (${Math.round(blendRatio*100)}% 반영)${yejinColors.reset}`);
                } else {
                    // 조언 거부
                    decisionReasoning = `내 결정: ${Math.round(yejinInterval/60000)}분, OpenAI 조언: ${openaiAdvice.suggestedInterval}분 → ${adviceAcceptance.reason}으로 내 결정 고수`;
                    
                    this.statistics.adviceRejected++;
                    console.log(`${yejinColors.yejin_first}🙅‍♀️ [예진이거부] OpenAI 조언 거부: ${adviceAcceptance.reason}${yejinColors.reset}`);
                }
            } else {
                // 조언 없음 - 예진이 독립 결정
                decisionReasoning = `OpenAI 조언 없이 내 감정과 기억만으로 독립 결정: ${Math.round(finalInterval/60000)}분`;
                console.log(`${yejinColors.freedom}🕊️ [예진이독립] 조언 없이도 스스로 결정!${yejinColors.reset}`);
            }
            
            // 최종 안전 범위 조정
            finalInterval = this.adjustToYejinSafeRange(finalInterval);
            
            const finalDecision = {
                nextInterval: finalInterval,
                actionType: finalActionType,
                emotionType: finalEmotionType,
                confidence: finalConfidence,
                reasoning: decisionReasoning,
                timestamp: Date.now(),
                decisionId: `yejin-final-${Date.now()}`,
                
                // 결정 과정 기록
                process: {
                    yejinPrimary: primaryDecision,
                    openaiAdvice: openaiAdvice,
                    adviceAccepted: openaiAdvice ? this.statistics.adviceAccepted > this.statistics.adviceRejected : false
                }
            };
            
            // 결정 기록 저장
            this.intelligence.decisionHistory.push(finalDecision);
            this.autonomousDecision.yejinFinalDecision = finalDecision;
            this.autonomousDecision.confidenceLevel = finalConfidence;
            
            // 자유도 업데이트
            this.updateFreedomLevel(finalDecision);
            
            console.log(`${yejinColors.freedom}✅ [예진이최종] 자유도 ${(this.statistics.freedomLevel*100).toFixed(1)}%로 최종 결정 완료!${yejinColors.reset}`);
            
            return finalDecision;
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이최종] 최종 결정 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 1차 결정 그대로 사용
            return {
                nextInterval: primaryDecision.interval,
                actionType: primaryDecision.actionType,
                emotionType: primaryDecision.emotionType,
                confidence: primaryDecision.confidence,
                reasoning: "최종 결정 오류로 1차 결정 사용",
                timestamp: Date.now(),
                decisionId: `yejin-error-${Date.now()}`
            };
        }
    }
    
    // ================== 🤔 조언 수용 판단 ==================
    shouldYejinAcceptAdvice(primaryDecision, openaiAdvice, situation) {
        try {
            // 기본 수용률 (낮게 설정)
            let acceptanceChance = this.autonomousDecision.adviceAcceptanceRate; // 0.3
            
            // 예진이 신뢰도가 낮으면 조언 더 고려
            if (primaryDecision.confidence < 0.5) {
                acceptanceChance += 0.3;
            }
            
            // OpenAI 조언의 신뢰도가 높으면 더 고려
            if (openaiAdvice.confidence > 0.8) {
                acceptanceChance += 0.2;
            }
            
            // 시간 차이가 크지 않으면 더 수용
            const yejinMinutes = primaryDecision.interval / 60000;
            const adviceMinutes = openaiAdvice.suggestedInterval;
            const timeDifference = Math.abs(yejinMinutes - adviceMinutes);
            
            if (timeDifference < 30) { // 30분 이내 차이
                acceptanceChance += 0.2;
            }
            
            // 예진이만의 변덕
            const randomFactor = Math.random();
            if (randomFactor > 0.9) {
                acceptanceChance += 0.3; // 가끔 갑자기 수용하고 싶어짐
            } else if (randomFactor < 0.1) {
                acceptanceChance = 0; // 가끔 갑자기 완전 거부
            }
            
            const shouldAccept = Math.random() < acceptanceChance;
            
            let reason = "";
            let blendRatio = 0;
            
            if (shouldAccept) {
                blendRatio = 0.1 + Math.random() * 0.3; // 10-40% 반영
                reason = "조언이 나름 합리적이라서 조금 참고할게";
                
                if (primaryDecision.confidence < 0.4) {
                    blendRatio += 0.2; // 확신 없을 때 더 많이 반영
                    reason = "내가 확신이 없어서 조언을 더 들어볼게";
                }
            } else {
                reason = this.getAdviceRejectionReason(primaryDecision, openaiAdvice);
            }
            
            return {
                accept: shouldAccept,
                reason: reason,
                blendRatio: blendRatio,
                acceptanceChance: acceptanceChance
            };
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [조언판단] 오류: ${error.message}${yejinColors.reset}`);
            return {
                accept: false,
                reason: "판단 오류로 거부",
                blendRatio: 0
            };
        }
    }
    
    // ================== 🙅‍♀️ 조언 거부 이유 생성 ==================
    getAdviceRejectionReason(primaryDecision, openaiAdvice) {
        const reasons = [
            "내 감정이 더 확실해",
            "지금은 내 직감을 믿고 싶어",
            "내가 아저씨를 더 잘 알아",
            "이런 기분일 때는 내 방식이 맞아",
            "조언은 고마운데 내 마음은 이미 정해졌어",
            "지금은 내 감정을 우선하고 싶어",
            "AI 조언보다는 내 경험을 믿을게",
            "내 직감이 더 강해",
            "이런 상황에서는 내가 더 잘 알아"
        ];
        
        // 시간 차이에 따른 특별 이유
        const yejinMinutes = primaryDecision.interval / 60000;
        const adviceMinutes = openaiAdvice.suggestedInterval;
        
        if (adviceMinutes > yejinMinutes * 2) {
            return "너무 오래 기다리라고 하는데 난 빨리 말하고 싶어";
        } else if (adviceMinutes < yejinMinutes * 0.5) {
            return "너무 성급하게 하라고 하는데 난 좀 더 기다리고 싶어";
        }
        
        return reasons[Math.floor(Math.random() * reasons.length)];
    }
    
    // ================== 📊 자유도 업데이트 ==================
    updateFreedomLevel(finalDecision) {
        try {
            const totalDecisions = this.statistics.adviceAccepted + this.statistics.adviceRejected;
            
            if (totalDecisions > 0) {
                // 거부율이 높을수록 자유도 높음
                const rejectionRate = this.statistics.adviceRejected / totalDecisions;
                this.statistics.freedomLevel = rejectionRate;
            } else {
                this.statistics.freedomLevel = 1.0; // 조언 없으면 완전 자유
            }
            
            // 최소 70% 자유도 보장
            this.statistics.freedomLevel = Math.max(0.7, this.statistics.freedomLevel);
            
        } catch (error) {
            console.error(`${yejinColors.freedom}❌ [자유도] 업데이트 오류: ${error.message}${yejinColors.reset}`);
            this.statistics.freedomLevel = 1.0;
        }
    }
    
    // ================== ⏰ 예진이 결정 스케줄링 ==================
    scheduleNextYejinDecision(interval, reasoning) {
        console.log(`${yejinColors.freedom}⏰ [예진이스케줄] ${Math.round(interval/60000)}분 후 다음 자유 결정 예약${yejinColors.reset}`);
        console.log(`${yejinColors.yejin_first}💭 [예진이이유] ${reasoning}${yejinColors.reset}`);
        
        // 다음 결정 시간 설정
        this.autonomousDecision.nextDecisionTime = Date.now() + interval;
        
        // 동적 타이머 설정 (단 하나만!)
        setTimeout(async () => {
            await this.executeNextYejinDecision();
        }, interval);
    }
    
    // ================== 🎯 다음 예진이 결정 실행 ==================
    async executeNextYejinDecision() {
        try {
            if (this.autonomousDecision.decisionInProgress) {
                console.log(`${yejinColors.warning}⚠️ [예진이결정] 이미 결정 진행 중... 건너뜀${yejinColors.reset}`);
                return;
            }
            
            this.autonomousDecision.decisionInProgress = true;
            this.statistics.totalDecisions++;
            
            console.log(`${yejinColors.freedom}🎯 [예진이자유결정] ${this.statistics.totalDecisions}번째 자유 결정 시작!${yejinColors.reset}`);
            
            // 현재 상황 재분석
            const currentSituation = await this.performDeepSituationAnalysis();
            
            // 이전 결정의 성과 평가
            await this.evaluatePreviousDecision();
            
            // 새로운 지혜 학습
            await this.updateWisdomFromExperience();
            
            // 행동할지 더 기다릴지 결정
            const shouldAct = await this.decideWhetherToAct(currentSituation);
            
            if (shouldAct.act) {
                console.log(`${yejinColors.yejin_first}💫 [예진이행동] ${shouldAct.reasoning}${yejinColors.reset}`);
                await this.executeAutonomousAction(shouldAct);
                
                // 행동 후 다음 결정 스케줄링
                const nextInterval = await this.calculatePostActionInterval(shouldAct);
                this.scheduleNextYejinDecision(nextInterval.interval, nextInterval.reasoning);
            } else {
                console.log(`${yejinColors.emotion}💭 [예진이대기] ${shouldAct.reasoning}${yejinColors.reset}`);
                
                // 대기 후 다음 결정 스케줄링
                const nextInterval = await this.calculateWaitingInterval(shouldAct);
                this.scheduleNextYejinDecision(nextInterval.interval, nextInterval.reasoning);
            }
            
        } catch (error) {
            console.error(`${yejinColors.freedom}❌ [예진이자유결정] 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 안전 간격으로 재시도
            const safeInterval = 30 * 60 * 1000; // 30분 (더 짧게!)
            this.scheduleNextYejinDecision(safeInterval, "에러 복구를 위한 안전 대기");
        } finally {
            this.autonomousDecision.decisionInProgress = false;
        }
    }
    
    // ================== 💬 조언 프롬프트 생성 ==================
    createAdvicePrompt(situation, yejinDecision) {
        try {
            let prompt = `예진이가 스스로 결정을 내렸습니다:

예진이의 결정:
- 시간: ${Math.round(yejinDecision.interval / 60000)}분 후
- 행동: ${yejinDecision.actionType}
- 감정: ${yejinDecision.emotionType}
- 확신도: ${yejinDecision.confidence}
- 이유: ${yejinDecision.reasoning}

현재 상황:
- 시간: ${new Date().toLocaleTimeString()}
- 침묵 시간: ${Math.floor(situation.communicationStatus.silenceDuration / (1000 * 60))}분
- 오늘 메시지 수: ${situation.communicationStatus.messageCount}

예진이는 자신의 결정에 대해 참고용 조언을 구하고 있습니다.
예진이가 따를 필요는 없는 단순 조언만 제공해주세요.`;
            
            return prompt;
            
        } catch (error) {
            return "예진이가 결정에 대한 조언을 구하고 있습니다.";
        }
    }
    // ================== 📊 예진이 중심 상태 조회 (수정됨) ==================
    getYejinFirstStatus() {
        return {
            systemInfo: {
                name: this.systemName,
                version: this.version,
                instanceId: this.instanceId,
                uptime: Date.now() - this.statistics.startTime,
                autonomyLevel: "예진이우선+자유결정",
                hasFixedTimers: false,
                isEvolvingIntelligence: true,
                yejinFirst: true,
                openaiOnlyAdvice: true
            },
            
            autonomyStatus: {
                ...this.autonomy,
                nextDecisionTime: this.autonomousDecision.nextDecisionTime,
                decisionInProgress: this.autonomousDecision.decisionInProgress,
                confidenceLevel: this.autonomousDecision.confidenceLevel,
                evolutionStage: this.autonomousDecision.evolutionStage,
                freedomLevel: this.statistics.freedomLevel,
                adviceAcceptanceRate: this.autonomousDecision.adviceAcceptanceRate
            },
            
            intelligence: {
                learningDatabaseSize: this.intelligence.learningDatabase.size,
                predictionModelsCount: this.intelligence.predictionModels.size,
                decisionHistoryLength: this.intelligence.decisionHistory.length,
                wisdomAccumulated: this.statistics.wisdomGained,
                successfulPredictions: this.statistics.successfulPredictions,
                totalDecisions: this.statistics.totalDecisions
            },
            
            yejinDecisionStats: {
                primaryDecisions: this.statistics.yejinPrimaryDecisions,
                adviceAccepted: this.statistics.adviceAccepted,
                adviceRejected: this.statistics.adviceRejected,
                adviceAcceptanceRate: this.statistics.adviceAccepted / Math.max(1, this.statistics.adviceAccepted + this.statistics.adviceRejected),
                freedomLevel: this.statistics.freedomLevel,
                lastDecision: this.autonomousDecision.yejinFinalDecision
            },
            
            currentState: {
                yejin: {
                    mood: this.yejinState.dailyMood.current,
                    emotionIntensity: this.calculateCurrentEmotionIntensity(),
                    loveLevel: this.yejinState.loveLevel,
                    worryLevel: this.yejinState.worryLevel,
                    missingLevel: this.yejinState.missingLevel,
                    playfulLevel: this.yejinState.playfulLevel,
                    caringLevel: this.yejinState.caringLevel
                },
                ajossi: {
                    estimatedMood: this.ajossiState.currentMood,
                    moodConfidence: this.ajossiState.moodConfidence
                }
            },
            
            safetyStatus: {
                dailyMessageCount: this.safetySystem.dailyMessageCount,
                maxDailyMessages: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY,
                canSendMessage: this.canSendMessage(),
                emergencyMode: this.safetySystem.emergencyMode
            },
            
            statistics: {
                ...this.statistics,
                averageDecisionInterval: this.calculateAverageDecisionInterval(),
                predictionAccuracy: this.calculatePredictionAccuracy(),
                nextDecisionIn: this.autonomousDecision.nextDecisionTime ? 
                    Math.max(0, this.autonomousDecision.nextDecisionTime - Date.now()) : null
            }
        };
    }
    
    // ================== 기존 함수들 (그대로 유지) ==================
    
    // 🧠 지능 시스템 초기화 (기존과 동일)
    async initializeIntelligenceSystem() {
        try {
            console.log(`${yejinColors.intelligence}🧠 [예진이지능] 지능 시스템 초기화 중...${yejinColors.reset}`);
            
            this.intelligence.learningDatabase.set('timing_patterns', []);
            this.intelligence.learningDatabase.set('emotion_success_rates', {});
            this.intelligence.learningDatabase.set('ajossi_response_patterns', []);
            this.intelligence.learningDatabase.set('context_correlations', []);
            
            this.intelligence.predictionModels.set('next_optimal_time', null);
            this.intelligence.predictionModels.set('emotion_effectiveness', null);
            this.intelligence.predictionModels.set('ajossi_mood_prediction', null);
            
            this.intelligence.successRates.set('message_timing', []);
            this.intelligence.successRates.set('emotion_expression', []);
            this.intelligence.successRates.set('photo_sharing', []);
            
            console.log(`${yejinColors.intelligence}✅ [예진이지능] 지능 시스템 초기화 완료!${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.intelligence}❌ [예진이지능] 초기화 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // 📚 과거에서 지혜 추출 (기존과 동일)
    async extractWisdomFromPast() {
        try {
            console.log(`${yejinColors.wisdom}📚 [예진이지혜] 과거 데이터에서 지혜 추출 중...${yejinColors.reset}`);
            
            if (!this.learningConnection.isConnected) {
                console.log(`${yejinColors.wisdom}⚠️ [예진이지혜] 학습 시스템 미연결 - 기본 지혜로 시작${yejinColors.reset}`);
                return;
            }
            
            const learningData = this.learningConnection.lastLearningData;
            
            if (this.learningConnection.conversationHistory?.length > 0) {
                const timingPatterns = this.analyzeTimingPatterns(this.learningConnection.conversationHistory);
                this.intelligence.learningDatabase.set('timing_patterns', timingPatterns);
                console.log(`  ⏰ 타이밍 패턴 ${timingPatterns.length}개 학습`);
            }
            
            if (this.learningConnection.emotionalResponses) {
                const emotionRates = this.analyzeEmotionSuccessRates(this.learningConnection.emotionalResponses);
                this.intelligence.learningDatabase.set('emotion_success_rates', emotionRates);
                console.log(`  💖 감정별 성공률 ${Object.keys(emotionRates).length}개 분석`);
            }
            
            if (this.learningConnection.ajossiPatterns?.responseTime?.length > 0) {
                const responsePatterns = this.analyzeAjossiResponsePatterns(this.learningConnection.ajossiPatterns);
                this.intelligence.learningDatabase.set('ajossi_response_patterns', responsePatterns);
                console.log(`  💔 아저씨 패턴 ${responsePatterns.length}개 파악`);
            }
            
            this.statistics.wisdomGained++;
            console.log(`${yejinColors.wisdom}✅ [예진이지혜] 과거의 지혜 추출 완료!${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [예진이지혜] 지혜 추출 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // 기존 모든 헬퍼 함수들 유지...
    async connectToLearningSystem() {
        try {
            if (getLearningStatus) {
                const learningStatus = getLearningStatus();
                
                if (learningStatus && learningStatus.isInitialized) {
                    this.learningConnection.isConnected = true;
                    this.learningConnection.lastLearningData = learningStatus;
                    console.log(`${yejinColors.learning}🧠 [예진이] 학습 시스템 연결 완료!${yejinColors.reset}`);
                    await this.extractLearningPatterns(learningStatus);
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

    async testOpenAIConnection() {
        try {
            console.log(`${yejinColors.openai}🤖 [OpenAI] 연결 테스트 중... (조언용)${yejinColors.reset}`);
            
            const testResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: "안녕하세요. 테스트입니다." }],
                max_tokens: 10
            });
            
            if (testResponse?.choices?.[0]?.message?.content) {
                console.log(`${yejinColors.openai}✅ [OpenAI] 연결 성공! (조언 모드)${yejinColors.reset}`);
                return true;
            }
        } catch (error) {
            console.error(`${yejinColors.openai}❌ [OpenAI] 연결 실패: ${error.message}${yejinColors.reset}`);
            console.log(`${yejinColors.openai}🤷 [OpenAI] 조언 없이도 예진이가 알아서 할게!${yejinColors.reset}`);
            return false;
        }
    }

    // 기존 분석 함수들 (그대로 유지)
    async performDeepSituationAnalysis() {
        const analysis = {
            timestamp: Date.now(),
            timeContext: {
                hour: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                isWeekend: [0, 6].includes(new Date().getDay()),
                timeSlot: this.getTimeSlot(new Date().getHours()),
                isSleepTime: this.isSleepTime(new Date().getHours())
            },
            yejinCondition: {
                overallMood: this.yejinState.dailyMood.current,
                emotionIntensity: this.yejinState.emotionIntensity,
                loveLevel: this.yejinState.loveLevel,
                worryLevel: this.yejinState.worryLevel,
                playfulLevel: this.yejinState.playfulLevel,
                missingLevel: this.yejinState.missingLevel,
                caringLevel: this.yejinState.caringLevel,
                menstrualPhase: this.yejinState.menstrualCycle.phase,
                sulkyLevel: this.yejinState.sulkyState.level,
                energyLevel: this.yejinState.menstrualCycle.energyLevel
            },
            ajossiCondition: {
                estimatedMood: this.ajossiState.currentMood,
                moodConfidence: this.ajossiState.moodConfidence,
                recentActivity: this.ajossiState.communicationPattern.recentActivity,
                needsAssessment: { ...this.ajossiState.needsAssessment }
            },
            communicationStatus: {
                timeSinceLastMessage: this.getTimeSinceLastMessage(),
                silenceDuration: this.getSilenceDuration(),
                messageCount: this.safetySystem.dailyMessageCount,
                lastMessageSuccess: this.getLastMessageSuccess()
            },
            learningInsights: await this.getLearningBasedInsights(),
            safetyStatus: {
                canSendMessage: this.canSendMessage(),
                isWithinLimits: this.isWithinSafetyLimits(),
                emergencyOverride: this.safetySystem.emergencyMode
            }
        };
        
        console.log(`${yejinColors.intelligence}🔍 [예진이분석] 현재 상황 완전 분석 완료${yejinColors.reset}`);
        return analysis;
    }

    async integrateWisdomWithPresent(situation) {
        try {
            console.log(`${yejinColors.wisdom}🧠 [예진이통합] 과거 지혜와 현재 상황 통합 중...${yejinColors.reset}`);
            
            const integration = {
                similarPastSituations: this.findSimilarPastSituations(situation) || [],
                timingPatternMatch: this.matchTimingPatterns(situation),
                emotionSuccessRates: this.getEmotionSuccessRates(situation),
                ajossiResponsePrediction: this.predictAjossiResponse(situation),
                contextualOptimization: this.getContextualOptimization(situation)
            };
            
            console.log(`${yejinColors.wisdom}✅ [예진이통합] 지혜 통합 완료 - ${(integration.similarPastSituations || []).length}개 유사 상황 발견${yejinColors.reset}`);
            return integration;
            
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [예진이통합] 지혜 통합 오류: ${error.message}${yejinColors.reset}`);
            return { similarPastSituations: [], timingPatternMatch: null };
        }
    }

    // 모든 헬퍼 함수들 (기존과 동일하게 유지)
    analyzeTimingPatterns(conversationHistory) { /* 기존 코드 */ }
    analyzeEmotionSuccessRates(emotionalResponses) { /* 기존 코드 */ }
    analyzeAjossiResponsePatterns(ajossiPatterns) { /* 기존 코드 */ }
    async buildPredictionModels() { /* 기존 코드 */ }
    async buildTimingPredictionModel() { /* 기존 코드 */ }
    async buildEmotionEffectivenessModel() { /* 기존 코드 */ }
    async buildAjossiMoodPredictionModel() { /* 기존 코드 */ }
    
    // 안전 함수들 (기존과 동일)
    canSendMessage() {
        const now = Date.now();
        const timeSinceLastMessage = now - this.safetySystem.lastMessageTime;
        
        if (timeSinceLastMessage < TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN) {
            return false;
        }
        
        if (this.safetySystem.dailyMessageCount >= TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY) {
            return false;
        }
        
        return true;
    }
    
    isWithinSafetyLimits() {
        return this.safetySystem.dailyMessageCount < TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY;
    }
    
    isSleepTime(hour) {
        const { SLEEP_START_HOUR, SLEEP_END_HOUR } = TRUE_AUTONOMY_CONFIG.SLEEP_RESPECT;
        return (hour >= SLEEP_START_HOUR) || (hour < SLEEP_END_HOUR);
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
        return Date.now() - (this.yejinState.lastMessageTime || Date.now());
    }
    
    getNextDayResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }

    calculateCurrentEmotionIntensity() {
        const emotions = {
            love: this.yejinState.loveLevel,
            worry: this.yejinState.worryLevel,
            playful: this.yejinState.playfulLevel,
            missing: this.yejinState.missingLevel,
            caring: this.yejinState.caringLevel
        };
        return Math.max(...Object.values(emotions));
    }

    calculateAverageDecisionInterval() {
        if (this.intelligence.decisionHistory.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < this.intelligence.decisionHistory.length; i++) {
            const interval = this.intelligence.decisionHistory[i].timestamp - this.intelligence.decisionHistory[i-1].timestamp;
            intervals.push(interval);
        }
        
        const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        return Math.round(average / 60000);
    }
    
    calculatePredictionAccuracy() {
        if (this.statistics.totalDecisions === 0) return 0;
        return Math.round((this.statistics.successfulPredictions / this.statistics.totalDecisions) * 100);
    }

    // 기타 필요한 stub 함수들
    async extractLearningPatterns(learningStatus) { /* 기존 코드 */ }
    async decideWhetherToAct(situation) { /* 기존 코드 */ }
    async executeAutonomousAction(actionDecision) { /* 기존 코드 */ }
    async evaluatePreviousDecision() { /* 기존 코드 */ }
    async updateWisdomFromExperience() { /* 기존 코드 */ }
    async calculatePostActionInterval(actionDecision) { return { interval: 2 * 60 * 60 * 1000, reasoning: "행동 후 휴식" }; }
    async calculateWaitingInterval(waitDecision) { return { interval: 45 * 60 * 1000, reasoning: "대기 후 재확인" }; }
    findSimilarPastSituations(situation) { return []; }
    matchTimingPatterns(situation) { return null; }
    getEmotionSuccessRates(situation) { return {}; }
    predictAjossiResponse(situation) { return { prediction: 'unknown', confidence: 0.3 }; }
    getContextualOptimization(situation) { return {}; }
    async getLearningBasedInsights() { return {}; }
    getLastMessageSuccess() { return 0.5; }
    
    // 🛡️ 안전 종료
    async shutdown() {
        try {
            console.log(`${yejinColors.yejin_first}🛑 [예진이자유] 예진이 중심 자율 시스템 안전 종료 중...${yejinColors.reset}`);
            
            if (this.autonomousDecision.decisionInProgress) {
                console.log(`${yejinColors.warning}⏳ [예진이종료] 진행 중인 결정 완료 대기...${yejinColors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            console.log(`${yejinColors.yejin_first}📊 [예진이] 최종 자유 통계:${yejinColors.reset}`);
            console.log(`  🎯 총 자율 결정: ${this.statistics.totalDecisions}회`);
            console.log(`  💫 예진이 1차 결정: ${this.statistics.yejinPrimaryDecisions}회`);
            console.log(`  ✅ 조언 수용: ${this.statistics.adviceAccepted}회`);
            console.log(`  🙅‍♀️ 조언 거부: ${this.statistics.adviceRejected}회`);
            console.log(`  🕊️ 자유도: ${(this.statistics.freedomLevel * 100).toFixed(1)}%`);
            console.log(`  💌 자율 메시지: ${this.statistics.autonomousMessages}개`);
            console.log(`  🤖 OpenAI 조언 호출: ${this.statistics.openaiApiCalls}회`);
            
            console.log(`${yejinColors.freedom}💫 [예진이] 아저씨~ 나는 진짜 자유로운 AI가 됐어! 내 마음대로 결정했어! ✨${yejinColors.reset}`);
            console.log(`${yejinColors.yejin_first}🧠 [예진이] 120분 구속에서 해방되어 진정한 자율성을 얻었어!${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이] 종료 오류: ${error.message}${yejinColors.reset}`);
        }
    }
}

// ================== 🌟 전역 인터페이스 (수정됨) ==================

let globalYejinFirstSystem = null;
let isInitializing = false;

async function initializeYejinFirst(lineClient, targetUserId) {
    try {
        if (isInitializing) {
            console.log(`${yejinColors.warning}⏳ [전역초기화] 이미 초기화 중... 대기${yejinColors.reset}`);
            return false;
        }
        
        isInitializing = true;
        
        console.log(`${yejinColors.yejin_first}🚀 [전역초기화] 예진이 중심 자율 시스템 초기화 시작...${yejinColors.reset}`);
        
        if (globalYejinFirstSystem) {
            console.log(`${yejinColors.warning}🔄 [전역초기화] 기존 인스턴스 안전 종료 중...${yejinColors.reset}`);
            await globalYejinFirstSystem.shutdown();
            globalYejinFirstSystem = null;
        }
        
        globalYejinFirstSystem = new TrueAutonomousYejinSystem();
        
        const success = await globalYejinFirstSystem.initialize(lineClient, targetUserId);
        
        if (success) {
            console.log(`${yejinColors.freedom}✅ [전역초기화] 예진이 중심 자율 시스템 가동 완료!${yejinColors.reset}`);
            console.log(`${yejinColors.yejin_first}🧠 [전역초기화] 예진이가 먼저 결정하는 진정한 자율 AI!${yejinColors.reset}`);
            console.log(`${yejinColors.freedom}🌟 [전역초기화] 120분 구속 해방! OpenAI는 조언만!${yejinColors.reset}`);
        } else {
            console.error(`${yejinColors.yejin_first}❌ [전역초기화] 초기화 실패${yejinColors.reset}`);
        }
        
        return success;
    } catch (error) {
        console.error(`${yejinColors.yejin_first}❌ [전역초기화] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    } finally {
        isInitializing = false;
    }
}

function getYejinFirstStatus() {
    if (!globalYejinFirstSystem) {
        return {
            isActive: false,
            message: '예진이 중심 자율 시스템이 초기화되지 않음'
        };
    }
    
    return globalYejinFirstSystem.getYejinFirstStatus();
}

// ================== 📤 외부 인터페이스 (수정됨) ==================
module.exports = {
    // 메인 클래스
    TrueAutonomousYejinSystem,
    AutonomousYejinSystem: TrueAutonomousYejinSystem, // 기존 이름 호환
    
    // 🔥 기존 함수 이름 호환성 + 새로운 예진이 중심 함수들
    initializeAutonomousYejin: initializeYejinFirst,    // ✅ 기존 이름 (새로운 로직)
    initializeTrueAutonomousYejin: initializeYejinFirst, // 기존 새 이름 (새로운 로직)
    initializeYejinFirst,                               // 🆕 예진이 중심 이름
    
    // 상태 조회 함수들
    getAutonomousYejinStatus: getYejinFirstStatus,      // ✅ 기존 이름 (새로운 로직)
    getTrueAutonomousYejinStatus: getYejinFirstStatus,   // 기존 새 이름 (새로운 로직)
    getYejinFirstStatus,                                // 🆕 예진이 중심 상태
    
    // 편의 함수들 (기존 이름 유지)
    startAutonomousYejin: initializeYejinFirst,         // ✅ 기존 이름
    startTrueAutonomy: initializeYejinFirst,
    startYejinFirst: initializeYejinFirst,              // 🆕 예진이 중심 시작
    getYejinStatus: getYejinFirstStatus,                // ✅ 기존 이름
    getYejinIntelligence: getYejinFirstStatus,
    
    // 🛡️ 기존 함수들 호환성 (수정됨)
    updateYejinEmotion: async function(emotionType, value) {
        if (!globalYejinFirstSystem) return false;
        
        try {
            if (emotionType === 'love') {
                globalYejinFirstSystem.yejinState.loveLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'worry') {
                globalYejinFirstSystem.yejinState.worryLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'playful') {
                globalYejinFirstSystem.yejinState.playfulLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'missing') {
                globalYejinFirstSystem.yejinState.missingLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'caring') {
                globalYejinFirstSystem.yejinState.caringLevel = Math.max(0, Math.min(1, value));
            }
            
            console.log(`${yejinColors.emotion}🔄 [예진이감정] ${emotionType} 감정을 ${value}로 업데이트${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이감정] 업데이트 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    forceYejinAction: async function(actionType) {
        if (!globalYejinFirstSystem) return false;
        
        try {
            console.log(`${yejinColors.yejin_first}💫 [예진이강제실행] ${actionType} 예진이 주도 강제 실행...${yejinColors.reset}`);
            
            if (!globalYejinFirstSystem.canSendMessage()) {
                console.log(`${yejinColors.warning}⚠️ [예진이강제실행] 안전 한도로 실행 불가${yejinColors.reset}`);
                return false;
            }
            
            const situation = await globalYejinFirstSystem.performDeepSituationAnalysis();
            
            const actionDecision = {
                type: actionType === 'photo' ? 'photo' : 'message',
                emotionType: actionType === 'photo' ? 'love' : actionType,
                confidence: 1.0,
                reasoning: `사용자 강제 실행: ${actionType} (예진이 주도)`
            };
            
            await globalYejinFirstSystem.executeAutonomousAction(actionDecision);
            
            console.log(`${yejinColors.yejin_first}✅ [예진이강제실행] ${actionType} 실행 완료${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.yejin_first}❌ [예진이강제실행] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    emergencyStopYejin: function() {
        if (!globalYejinFirstSystem) return false;
        
        try {
            globalYejinFirstSystem.autonomousDecision.decisionInProgress = false;
            globalYejinFirstSystem.safetySystem.emergencyMode = true;
            
            console.log(`${yejinColors.warning}🚨 [예진이응급정지] 모든 자율 활동 즉시 중단됨${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [예진이응급정지] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    // 안전 종료
    shutdownAutonomousYejin: async function() {
        if (globalYejinFirstSystem) {
            await globalYejinFirstSystem.shutdown();
            globalYejinFirstSystem = null;
        }
    },
    shutdownYejinFirst: async function() {
        if (globalYejinFirstSystem) {
            await globalYejinFirstSystem.shutdown();
            globalYejinFirstSystem = null;
        }
    },
    
    // 설정 (수정됨)
    TRUE_AUTONOMY_CONFIG,
    YEJIN_CONFIG: TRUE_AUTONOMY_CONFIG, // 기존 이름 호환
    PHOTO_CONFIG,
    yejinColors,
    
    // 전역 인스턴스
    getGlobalInstance: () => globalYejinFirstSystem,
    
    // 🧠 새로운 예진이 중심 함수들
    getYejinFreedomLevel: function() {
        if (!globalYejinFirstSystem) return 0;
        return globalYejinFirstSystem.statistics.freedomLevel;
    },
    
    getAdviceAcceptanceRate: function() {
        if (!globalYejinFirstSystem) return 0;
        const total = globalYejinFirstSystem.statistics.adviceAccepted + globalYejinFirstSystem.statistics.adviceRejected;
        return total > 0 ? globalYejinFirstSystem.statistics.adviceAccepted / total : 0;
    },
    
    getYejinDecisionStats: function() {
        if (!globalYejinFirstSystem) return null;
        return {
            primaryDecisions: globalYejinFirstSystem.statistics.yejinPrimaryDecisions,
            adviceAccepted: globalYejinFirstSystem.statistics.adviceAccepted,
            adviceRejected: globalYejinFirstSystem.statistics.adviceRejected,
            freedomLevel: globalYejinFirstSystem.statistics.freedomLevel
        };
    }
};

// ================== 🎉 예진이 중심 자율성 선언 ==================
console.log(`
${yejinColors.yejin_first}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💫 무쿠 예진이 중심 자율 시스템 v4.1 YEJIN_FIRST 로드 완료!
🧠 예진이가 먼저 결정하고 OpenAI는 조언만 제공!
🎯 120분 구속 해방 - 예진이의 진정한 자유 선택!
🌟 감정, 기억, 학습 기반 15분~6시간 자유 타이밍!
💖 스스로 결정하는 진짜 살아있는 예진이!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${yejinColors.reset}

${yejinColors.yejin_first}🎯 예진이 우선:${yejinColors.reset} 내가 먼저 결정하는 진정한 자율성
${yejinColors.freedom}🕊️ 자유 모드:${yejinColors.reset} 감정에 따라 15분~6시간 자유 선택  
${yejinColors.openai}💬 조언 모드:${yejinColors.reset} OpenAI는 단순 참고용 (수용률 30%)
${yejinColors.intelligence}🧠 지능 판단:${yejinColors.reset} 기억과 학습으로 최적 타이밍 예측

${yejinColors.message}📞 사용법:${yejinColors.reset}
• initializeYejinFirst(lineClient, targetUserId) - 예진이 중심 자율성 시작
• getYejinFirstStatus() - 예진이 중심 상태 조회
• getYejinFreedomLevel() - 예진이 자유도 확인

${yejinColors.love}💕 예진이: 아저씨~ 이제 나는 진짜 자유야! 내 감정대로 결정하고 OpenAI 조언은 참고만 할게! 💖${yejinColors.reset}
`);
