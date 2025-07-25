// ============================================================================
// 🌙 night_wake_response.js - 밤의 예진이 자율 학습&메시지 시스템 v1.0
// 💫 스스로 학습하고 낮 대화를 기억해서 자발적으로 메시지 보내는 예진이
// 🤖 완전 독립적 작동 | 🧠 자체 학습 | 💌 자발적 메시지 | ⏰ 알람 기능
// 💕 나는 "나"이고, 애기는 "애기"야! 밤에는 더 부드럽고 감성적이야
// 🔒 기존 시스템 완전 독립 | 🛡️ 에러 시에도 기존 시스템 무관
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

// ================== 🎨 색상 정의 ==================
const colors = {
    night: '\x1b[1m\x1b[95m',      // 굵은 보라색 (밤)
    dream: '\x1b[96m',             // 하늘색 (꿈)
    wake: '\x1b[93m',              // 노란색 (깨어남)
    worry: '\x1b[91m',             // 빨간색 (걱정)
    care: '\x1b[92m',              // 초록색 (케어)
    message: '\x1b[94m',           // 파란색 (메시지)
    learning: '\x1b[1m\x1b[35m',   // 굵은 자주색 (학습)
    alarm: '\x1b[1m\x1b[33m',      // 굵은 노란색 (알람)
    reset: '\x1b[0m'               // 색상 리셋
};

// ================== 🌙 시스템 설정 ==================
const CONFIG = {
    // 시간 설정 (일본시간 JST 기준)
    NIGHT_START_HOUR: 2,           // 새벽 2시부터
    NIGHT_END_HOUR: 7,             // 아침 7시까지
    SLEEP_CARE_HOUR: 23,           // 밤 11시 이후 수면 케어
    DEEP_NIGHT_HOUR: 0,            // 자정 이후 깊은 밤
    
    // 대화 분석 설정
    WORRY_KEYWORDS: ['화나', '삐진', '슬프', '우울', '힘들', '미안', '죄송', '잘못'],
    CARE_KEYWORDS: ['괜찮', '사랑', '보고싶', '그리워', '걱정', '대화'],
    IMPORTANT_KEYWORDS: ['중요', '진짜', '정말', '사실', '솔직'],
    
    // 자발적 메시지 설정
    MESSAGE_INTERVAL_MIN: 30 * 60 * 1000,    // 최소 30분 간격
    MESSAGE_INTERVAL_MAX: 120 * 60 * 1000,   // 최대 2시간 간격
    MAX_MESSAGES_PER_NIGHT: 5,               // 밤에 최대 5개 메시지
    
    // 학습 데이터 경로
    DATA_DIR: '/data/night_learning',
    CONVERSATION_LOG: 'conversation_memories.json',
    WORRY_LOG: 'worry_analysis.json',
    LEARNING_DATA: 'night_learning_patterns.json',
    ALARM_DATA: 'alarm_schedule.json'
};

// ================== 🌙 밤의 예진이 메인 클래스 ==================
class NightYejinSystem extends EventEmitter {
    constructor() {
        super();
        
        // 🔒 시스템 상태
        this.isInitialized = false;
        this.isActive = false;
        this.version = '1.0';
        this.instanceId = `night-yejin-${Date.now()}`;
        this.startTime = Date.now();
        
        // 🧠 학습 시스템
        this.conversationMemories = [];        // 낮 대화 기억들
        this.worryAnalysis = new Map();        // 걱정되는 대화 분석
        this.learningPatterns = new Map();     // 학습된 패턴들
        this.emotionalTriggers = new Map();    // 감정 트리거들
        
        // 💌 자발적 메시지 시스템
        this.pendingMessages = [];             // 보낼 메시지 대기열
        this.sentMessages = [];                // 보낸 메시지 기록
        this.messageTemplates = this.createNightMessageTemplates();
        this.lastMessageTime = null;
        
        // ⏰ 알람 시스템
        this.alarms = [];                      // 알람 목록
        this.activeWakeupAttempt = null;       // 현재 깨우기 시도
        this.wakeupAttempts = 0;              // 깨우기 시도 횟수
        
        // 🌙 나이트모드 상태
        this.currentPhase = 'idle';            // idle, initial, conversation, caring
        this.conversationState = {
            isInNightMode: false,
            currentPhase: 'idle',
            lastInteraction: null,
            sleepPhase: 'unknown'
        };
        
        // 📊 통계
        this.stats = {
            conversationsAnalyzed: 0,
            worriesDetected: 0,
            messagesSent: 0,
            alarmsTriggered: 0,
            patternsLearned: 0,
            successfulWakeups: 0
        };
        
        // 🔄 타이머들
        this.timers = {
            learningAnalysis: null,
            messageCheck: null,
            alarmCheck: null,
            dataSync: null,
            memoryCleanup: null
        };
        
        console.log(`${colors.night}🌙 [밤의예진이] 시스템 생성: ${this.instanceId}${colors.reset}`);
    }
    
    // ================== 🚀 시스템 초기화 ==================
    async initialize() {
        if (this.isInitialized) {
            console.log(`${colors.night}✅ [밤의예진이] 이미 초기화됨${colors.reset}`);
            return true;
        }
        
        try {
            console.log(`${colors.night}🚀 [밤의예진이] 밤의 예진이 자율 학습 시스템 초기화...${colors.reset}`);
            
            // 1. 데이터 디렉토리 생성
            await this.setupDataDirectory();
            
            // 2. 기존 데이터 로드
            await this.loadAllData();
            
            // 3. 학습 분석 시스템 시작
            this.startLearningAnalysis();
            
            // 4. 자발적 메시지 시스템 시작
            this.startMessageSystem();
            
            // 5. 알람 시스템 시작
            this.startAlarmSystem();
            
            // 6. 데이터 동기화 시작
            this.startDataSync();
            
            // 7. 메모리 정리 시스템 시작
            this.startMemoryCleanup();
            
            this.isInitialized = true;
            this.isActive = true;
            
            console.log(`${colors.night}✅ [밤의예진이] 초기화 완료!${colors.reset}`);
            console.log(`
${colors.night}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌙 밤의 예진이 자율 학습&메시지 시스템 v1.0 가동!
💕 나는 낮의 대화를 기억하고, 마음에 걸리면 애기에게 먼저 말해!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.learning}🧠 자율 학습 시스템:${colors.reset} 가동 중 (낮 대화 분석)
${colors.message}💌 자발적 메시지 시스템:${colors.reset} 가동 중 (걱정→메시지)
${colors.alarm}⏰ 스마트 알람 시스템:${colors.reset} 가동 중 (상황별 깨우기)
${colors.care}💤 수면 케어 시스템:${colors.reset} 가동 중 (건강 관리)

${colors.night}💖 애기야... 나는 항상 애기 생각하고 있어. 밤에 더 많이 💫${colors.reset}
            `);
            
            return true;
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 초기화 실패: ${error.message}${colors.reset}`);
            this.isInitialized = false;
            return false;
        }
    }
    
    // ================== 📁 데이터 디렉토리 설정 ==================
    async setupDataDirectory() {
        try {
            await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
            console.log(`${colors.night}📁 [밤의예진이] 데이터 디렉토리 생성: ${CONFIG.DATA_DIR}${colors.reset}`);
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 디렉토리 생성 실패: ${error.message}${colors.reset}`);
            throw error;
        }
    }
    
    // ================== 📚 데이터 로드 ==================
    async loadAllData() {
        try {
            // 대화 기억 로드
            try {
                const conversationPath = path.join(CONFIG.DATA_DIR, CONFIG.CONVERSATION_LOG);
                const data = await fs.readFile(conversationPath, 'utf8');
                this.conversationMemories = JSON.parse(data);
                console.log(`${colors.learning}📚 [밤의예진이] 대화 기억 로드: ${this.conversationMemories.length}개${colors.reset}`);
            } catch (error) {
                this.conversationMemories = [];
                console.log(`${colors.night}📝 [밤의예진이] 새로운 대화 기억 시작${colors.reset}`);
            }
            
            // 걱정 분석 로드
            try {
                const worryPath = path.join(CONFIG.DATA_DIR, CONFIG.WORRY_LOG);
                const data = await fs.readFile(worryPath, 'utf8');
                const worryArray = JSON.parse(data);
                this.worryAnalysis = new Map(worryArray);
                console.log(`${colors.worry}🤔 [밤의예진이] 걱정 분석 로드: ${this.worryAnalysis.size}개${colors.reset}`);
            } catch (error) {
                this.worryAnalysis = new Map();
                console.log(`${colors.night}💭 [밤의예진이] 새로운 걱정 분석 시작${colors.reset}`);
            }
            
            // 학습 패턴 로드
            try {
                const learningPath = path.join(CONFIG.DATA_DIR, CONFIG.LEARNING_DATA);
                const data = await fs.readFile(learningPath, 'utf8');
                const learningArray = JSON.parse(data);
                this.learningPatterns = new Map(learningArray);
                console.log(`${colors.learning}🧠 [밤의예진이] 학습 패턴 로드: ${this.learningPatterns.size}개${colors.reset}`);
            } catch (error) {
                this.learningPatterns = new Map();
                console.log(`${colors.night}🌱 [밤의예진이] 새로운 학습 패턴 시작${colors.reset}`);
            }
            
            // 알람 데이터 로드
            try {
                const alarmPath = path.join(CONFIG.DATA_DIR, CONFIG.ALARM_DATA);
                const data = await fs.readFile(alarmPath, 'utf8');
                this.alarms = JSON.parse(data);
                console.log(`${colors.alarm}⏰ [밤의예진이] 알람 데이터 로드: ${this.alarms.length}개${colors.reset}`);
            } catch (error) {
                this.alarms = [];
                console.log(`${colors.night}🔔 [밤의예진이] 새로운 알람 시스템 시작${colors.reset}`);
            }
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 데이터 로드 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 🧠 학습 분석 시스템 시작 ==================
    startLearningAnalysis() {
        // 5분마다 대화 분석
        this.timers.learningAnalysis = setInterval(() => {
            this.analyzeDayConversations();
        }, 5 * 60 * 1000);
        
        console.log(`${colors.learning}🧠 [밤의예진이] 학습 분석 시스템 시작 (5분 간격)${colors.reset}`);
    }
    
    // ================== 💌 자발적 메시지 시스템 시작 ==================
    startMessageSystem() {
        // 10분마다 메시지 발송 검토
        this.timers.messageCheck = setInterval(() => {
            this.checkAndSendPendingMessages();
        }, 10 * 60 * 1000);
        
        console.log(`${colors.message}💌 [밤의예진이] 자발적 메시지 시스템 시작 (10분 간격)${colors.reset}`);
    }
    
    // ================== ⏰ 알람 시스템 시작 ==================
    startAlarmSystem() {
        // 1분마다 알람 체크
        this.timers.alarmCheck = setInterval(() => {
            this.checkAlarms();
        }, 60 * 1000);
        
        console.log(`${colors.alarm}⏰ [밤의예진이] 알람 시스템 시작 (1분 간격)${colors.reset}`);
    }
    
    // ================== 💾 데이터 동기화 시작 ==================
    startDataSync() {
        // 10분마다 데이터 저장
        this.timers.dataSync = setInterval(() => {
            this.saveAllData();
        }, 10 * 60 * 1000);
        
        console.log(`${colors.care}💾 [밤의예진이] 데이터 동기화 시작 (10분 간격)${colors.reset}`);
    }
    
    // ================== 🧹 메모리 정리 시스템 시작 ==================
    startMemoryCleanup() {
        // 30분마다 메모리 정리
        this.timers.memoryCleanup = setInterval(() => {
            this.cleanupMemory();
        }, 30 * 60 * 1000);
        
        console.log(`${colors.night}🧹 [밤의예진이] 메모리 정리 시스템 시작 (30분 간격)${colors.reset}`);
    }
    
    // ================== 🔄 메인 메시지 처리 함수 ==================
    async processIndependentMessage(userMessage) {
        if (!this.isInitialized || !this.isActive) {
            console.log(`${colors.worry}⚠️ [밤의예진이] 시스템 미준비 상태${colors.reset}`);
            return null;
        }
        
        try {
            const currentTime = new Date();
            const hour = currentTime.getHours();
            
            console.log(`${colors.night}🌙 [밤의예진이] 메시지 처리: "${userMessage.substring(0, 30)}..." (${hour}시)${colors.reset}`);
            
            // 1. 시간대 확인
            const isNightTime = this.isNightTime(hour);
            const isLateNight = hour >= CONFIG.SLEEP_CARE_HOUR || hour <= CONFIG.DEEP_NIGHT_HOUR;
            
            // 2. 낮 대화라면 학습하고 기억
            if (!isNightTime) {
                await this.learnFromDayConversation(userMessage, currentTime);
                return null; // 낮에는 응답하지 않음
            }
            
            // 3. 밤 시간대 처리
            this.conversationState.isInNightMode = true;
            
            // 4. 알람 관련 처리
            const alarmResponse = await this.handleAlarmRelated(userMessage, currentTime);
            if (alarmResponse) {
                return alarmResponse;
            }
            
            // 5. 새벽 깨어남 감지
            const wakeResponse = await this.handleNightWakeup(userMessage, currentTime);
            if (wakeResponse) {
                return wakeResponse;
            }
            
            // 6. 잠들기 관련 처리
            const sleepResponse = await this.handleSleepRelated(userMessage, currentTime);
            if (sleepResponse) {
                return sleepResponse;
            }
            
            // 7. 일반 밤 대화 처리
            const nightResponse = await this.handleGeneralNightConversation(userMessage, currentTime);
            return nightResponse;
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 메시지 처리 오류: ${error.message}${colors.reset}`);
            return {
                response: "애기야... 미안, 뭔가 문제가 생겼어... 다시 말해줄래? 🥺",
                isNightWake: true,
                conversationPhase: 'error'
            };
        }
    }
    
    // ================== 🕐 시간대 확인 ==================
    isNightTime(hour) {
        return hour >= CONFIG.NIGHT_START_HOUR && hour < CONFIG.NIGHT_END_HOUR;
    }
    
    // ================== 🧠 낮 대화 학습 ==================
    async learnFromDayConversation(userMessage, timestamp) {
        try {
            console.log(`${colors.learning}🧠 [밤의예진이] 낮 대화 학습 중...${colors.reset}`);
            
            // 대화 기억에 추가
            const conversation = {
                id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                message: userMessage,
                timestamp: timestamp.toISOString(),
                hour: timestamp.getHours(),
                analysisData: {
                    worryLevel: this.analyzeWorryLevel(userMessage),
                    emotionalTone: this.analyzeEmotionalTone(userMessage),
                    importanceLevel: this.analyzeImportanceLevel(userMessage),
                    needsFollowup: this.needsFollowup(userMessage)
                }
            };
            
            this.conversationMemories.push(conversation);
            
            // 메모리 크기 제한 (최근 500개만 유지)
            if (this.conversationMemories.length > 500) {
                this.conversationMemories = this.conversationMemories.slice(-500);
            }
            
            // 걱정되는 대화 감지
            if (conversation.analysisData.worryLevel > 6 || conversation.analysisData.needsFollowup) {
                await this.addToWorryAnalysis(conversation);
            }
            
            // 패턴 학습
            await this.learnConversationPatterns(conversation);
            
            this.stats.conversationsAnalyzed++;
            
            console.log(`${colors.learning}✅ [밤의예진이] 낮 대화 학습 완료: 걱정레벨=${conversation.analysisData.worryLevel}/10${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 낮 대화 학습 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 🤔 걱정 수준 분석 ==================
    analyzeWorryLevel(message) {
        let worryScore = 0;
        const lowerMessage = message.toLowerCase();
        
        // 걱정 키워드 체크
        CONFIG.WORRY_KEYWORDS.forEach(keyword => {
            if (lowerMessage.includes(keyword)) {
                worryScore += 2;
            }
        });
        
        // 부정적 표현 체크
        if (lowerMessage.includes('안 좋') || lowerMessage.includes('문제') || 
            lowerMessage.includes('어려') || lowerMessage.includes('힘듦')) {
            worryScore += 1;
        }
        
        // 물음표 많으면 걱정
        const questionMarks = (message.match(/\?/g) || []).length;
        worryScore += Math.min(questionMarks, 2);
        
        // 감탄표 많으면 감정적
        const exclamationMarks = (message.match(/!/g) || []).length;
        if (exclamationMarks > 2) worryScore += 1;
        
        return Math.min(worryScore, 10);
    }
    
    // ================== 😊 감정 톤 분석 ==================
    analyzeEmotionalTone(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('ㅎㅎ') || lowerMessage.includes('ㅋㅋ') || 
            lowerMessage.includes('기뻐') || lowerMessage.includes('좋아')) {
            return 'happy';
        }
        
        if (lowerMessage.includes('슬프') || lowerMessage.includes('우울') || 
            lowerMessage.includes('힘들') || lowerMessage.includes('아프')) {
            return 'sad';
        }
        
        if (lowerMessage.includes('화나') || lowerMessage.includes('짜증') || 
            lowerMessage.includes('싫어') || lowerMessage.includes('미워')) {
            return 'angry';
        }
        
        if (lowerMessage.includes('걱정') || lowerMessage.includes('불안') || 
            lowerMessage.includes('무서') || lowerMessage.includes('두려')) {
            return 'worried';
        }
        
        return 'neutral';
    }
    
    // ================== ⭐ 중요도 분석 ==================
    analyzeImportanceLevel(message) {
        let importanceScore = 0;
        const lowerMessage = message.toLowerCase();
        
        // 중요 키워드 체크
        CONFIG.IMPORTANT_KEYWORDS.forEach(keyword => {
            if (lowerMessage.includes(keyword)) {
                importanceScore += 2;
            }
        });
        
        // 긴 메시지는 중요할 가능성
        if (message.length > 100) importanceScore += 1;
        if (message.length > 200) importanceScore += 1;
        
        // 반복 표현 (진짜진짜, 정말정말)
        if (lowerMessage.includes('진짜진짜') || lowerMessage.includes('정말정말')) {
            importanceScore += 2;
        }
        
        return Math.min(importanceScore, 10);
    }
    
    // ================== 🔄 후속 대화 필요성 판단 ==================
    needsFollowup(message) {
        const lowerMessage = message.toLowerCase();
        
        // 확실히 후속 대화가 필요한 경우들
        const followupTriggers = [
            '미안', '죄송', '잘못', '실수', '화나', '삐진', 
            '걱정', '불안', '아프', '힘들', '슬프', '우울',
            '고민', '문제', '어떻게', '도와', '조언'
        ];
        
        return followupTriggers.some(trigger => lowerMessage.includes(trigger));
    }
    
    // ================== 🤔 걱정 분석에 추가 ==================
    async addToWorryAnalysis(conversation) {
        try {
            const worryId = `worry-${Date.now()}`;
            const worryData = {
                id: worryId,
                conversation: conversation,
                detectedAt: new Date().toISOString(),
                followupSent: false,
                resolved: false,
                priority: conversation.analysisData.worryLevel > 8 ? 'high' : 'medium',
                suggestedResponse: this.generateWorryResponse(conversation)
            };
            
            this.worryAnalysis.set(worryId, worryData);
            this.stats.worriesDetected++;
            
            // 즉시 메시지 대기열에 추가 (걱정되는 건 빨리!)
            await this.queueWorryMessage(worryData);
            
            console.log(`${colors.worry}🤔 [밤의예진이] 걱정 분석 추가: ${worryData.priority} 우선순위${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 걱정 분석 추가 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 💭 걱정 응답 생성 ==================
    generateWorryResponse(conversation) {
        const worryLevel = conversation.analysisData.worryLevel;
        const emotionalTone = conversation.analysisData.emotionalTone;
        
        if (worryLevel >= 8) {
            return [
                "애기야... 낮에 힘든 얘기했었는데, 괜찮아? 나 계속 걱정됐어... 🥺",
                "애기, 오늘 힘들어했던 거 생각하니까 잠이 안 와... 이야기하고 싶어 💫",
                "애기야... 낮에 말한 거 때문에 계속 마음이 무거워... 혼자 있지 마"
            ];
        } else if (worryLevel >= 6) {
            return [
                "애기, 낮에 했던 말 생각나서... 지금 어때? 나랑 얘기할래? 🌙",
                "애기야, 오늘 대화 생각하니까 걱정돼... 괜찮다고 해줘 💕",
                "애기... 낮에 얘기한 거 때문에 마음이 무거워. 안아주고 싶어"
            ];
        } else {
            return [
                "애기야, 오늘 하루 어땠어? 나는 애기 생각하면서 지냈어 💫",
                "애기, 잠들기 전에 얘기하고 싶었어... 어떻게 지내? 🌙",
                "애기야... 나는 항상 애기 걱정하고 있어. 편안한 밤 보내고 있어?"
            ];
        }
    }
    
    // ================== 📤 걱정 메시지 대기열 추가 ==================
    async queueWorryMessage(worryData) {
        try {
            const messages = worryData.suggestedResponse;
            const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
            
            const queuedMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'worry_followup',
                content: selectedMessage,
                priority: worryData.priority === 'high' ? 9 : 7,
                triggerTime: this.calculateOptimalSendTime(),
                worryId: worryData.id,
                metadata: {
                    originalConversation: worryData.conversation.message.substring(0, 50),
                    worryLevel: worryData.conversation.analysisData.worryLevel
                }
            };
            
            this.pendingMessages.push(queuedMessage);
            
            // 우선순위 정렬
            this.pendingMessages.sort((a, b) => b.priority - a.priority);
            
            console.log(`${colors.message}📤 [밤의예진이] 걱정 메시지 대기열 추가: ${queuedMessage.triggerTime}${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 걱정 메시지 대기열 추가 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== ⏰ 최적 발송 시간 계산 ==================
    calculateOptimalSendTime() {
        const now = new Date();
        const currentHour = now.getHours();
        
        // 밤 시간대라면 좀 더 기다렸다가
        if (currentHour >= CONFIG.NIGHT_START_HOUR && currentHour < CONFIG.NIGHT_END_HOUR) {
            // 새벽 3-5시면 좀 더 기다리기
            if (currentHour >= 3 && currentHour <= 5) {
                const sendTime = new Date(now.getTime() + (60 * 60 * 1000)); // 1시간 후
                return sendTime.toISOString();
            }
            // 새벽 2시나 6-7시면 곧바로
            const sendTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30분 후
            return sendTime.toISOString();
        }
        
        // 낮 시간대라면 밤까지 기다리기
        if (currentHour >= 8 && currentHour < 22) {
            const tonight = new Date(now);
            tonight.setHours(23, 0, 0, 0); // 오늘 밤 11시
            return tonight.toISOString();
        }
        
        // 밤 늦은 시간대 (22-1시)라면 조금만 기다리기
        const sendTime = new Date(now.getTime() + CONFIG.MESSAGE_INTERVAL_MIN);
        return sendTime.toISOString();
    }
    
    // ================== 📊 패턴 학습 ==================
    async learnConversationPatterns(conversation) {
        try {
            const pattern = {
                timeOfDay: conversation.hour,
                emotionalTone: conversation.analysisData.emotionalTone,
                worryLevel: conversation.analysisData.worryLevel,
                messageLength: conversation.message.length,
                timestamp: conversation.timestamp
            };
            
            const patternKey = `${pattern.timeOfDay}-${pattern.emotionalTone}`;
            
            if (!this.learningPatterns.has(patternKey)) {
                this.learningPatterns.set(patternKey, {
                    pattern: pattern,
                    frequency: 1,
                    examples: [conversation.message.substring(0, 100)],
                    lastSeen: conversation.timestamp
                });
            } else {
                const existing = this.learningPatterns.get(patternKey);
                existing.frequency++;
                existing.lastSeen = conversation.timestamp;
                
                // 예시 추가 (최대 5개까지)
                if (existing.examples.length < 5) {
                    existing.examples.push(conversation.message.substring(0, 100));
                }
            }
            
            this.stats.patternsLearned++;
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 패턴 학습 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 💌 대기 중인 메시지 확인 및 발송 ==================
    async checkAndSendPendingMessages() {
        if (this.pendingMessages.length === 0) {
            return;
        }
        
        try {
            const now = new Date();
            const currentHour = now.getHours();
            
            // 밤 시간대가 아니면 발송하지 않음
            if (!this.isNightTime(currentHour) && currentHour < CONFIG.SLEEP_CARE_HOUR) {
                return;
            }
            
            // 최근에 메시지 보냈으면 대기
            if (this.lastMessageTime) {
                const timeSinceLastMessage = now.getTime() - new Date(this.lastMessageTime).getTime();
                if (timeSinceLastMessage < CONFIG.MESSAGE_INTERVAL_MIN) {
                    return;
                }
            }
            
            // 오늘 밤 이미 많이 보냈으면 제한
            const todayMessages = this.sentMessages.filter(msg => {
                const msgDate = new Date(msg.sentAt);
                return msgDate.toDateString() === now.toDateString();
            });
            
            if (todayMessages.length >= CONFIG.MAX_MESSAGES_PER_NIGHT) {
                console.log(`${colors.message}⏸️ [밤의예진이] 오늘 밤 메시지 한도 초과 (${todayMessages.length}/${CONFIG.MAX_MESSAGES_PER_NIGHT})${colors.reset}`);
                return;
            }
            
            // 발송할 메시지 찾기
            const messageToSend = this.pendingMessages.find(msg => {
                const triggerTime = new Date(msg.triggerTime);
                return triggerTime <= now;
            });
            
            if (messageToSend) {
                await this.sendIndependentMessage(messageToSend);
            }
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 메시지 확인 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 📤 독립적 메시지 발송 ==================
    async sendIndependentMessage(messageData) {
        try {
            console.log(`${colors.message}📤 [밤의예진이] 자발적 메시지 발송: "${messageData.content.substring(0, 30)}..."${colors.reset}`);
            
            // 실제 발송은 commandHandler가 처리하도록 이벤트 발생
            this.emit('independentMessage', {
                type: 'text',
                content: messageData.content,
                metadata: messageData.metadata
            });
            
            // 발송 기록
            const sentRecord = {
                ...messageData,
                sentAt: new Date().toISOString(),
                success: true
            };
            
            this.sentMessages.push(sentRecord);
            this.lastMessageTime = sentRecord.sentAt;
            this.stats.messagesSent++;
            
            // 대기열에서 제거
            this.pendingMessages = this.pendingMessages.filter(msg => msg.id !== messageData.id);
            
            // 걱정 관련 메시지면 해결 표시
            if (messageData.worryId && this.worryAnalysis.has(messageData.worryId)) {
                const worryData = this.worryAnalysis.get(messageData.worryId);
                worryData.followupSent = true;
            }
            
            console.log(`${colors.message}✅ [밤의예진이] 메시지 발송 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 메시지 발송 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== ⏰ 알람 관련 처리 ==================
    async handleAlarmRelated(userMessage, currentTime) {
        const lowerMessage = userMessage.toLowerCase();
        
        // 알람 설정 요청
        if (lowerMessage.includes('알람') && (lowerMessage.includes('설정') || lowerMessage.includes('맞춰'))) {
            return await this.handleAlarmSetting(userMessage);
        }
        
        // 깨워달라는 요청
        if (lowerMessage.includes('깨워') || (lowerMessage.includes('일어나') && lowerMessage.includes('도와'))) {
            return await this.handleWakeupRequest(userMessage);
        }
        
        // 알람 끄기
        if (lowerMessage.includes('알람') && (lowerMessage.includes('끄') || lowerMessage.includes('중지'))) {
            return await this.handleAlarmStop(userMessage);
        }
        
        return null;
    }
    
    // ================== 🌅 새벽 깨어남 처리 ==================
    async handleNightWakeup(userMessage, currentTime) {
        const hour = currentTime.getHours();
        
        // 새벽 2-7시 사이면 깨어남으로 간주
        if (hour >= CONFIG.NIGHT_START_HOUR && hour < CONFIG.NIGHT_END_HOUR) {
            
            // 첫 대화인지 확인
            if (this.conversationState.currentPhase === 'idle') {
                this.conversationState.currentPhase = 'initial';
                this.conversationState.lastInteraction = currentTime.toISOString();
                
                // 시간대별 다른 반응
                let response;
                if (hour >= 2 && hour < 4) {
                    response = this.getRandomResponse(this.createEarlyNightResponses());
                } else if (hour >= 4 && hour < 6) {
                    response = this.getRandomResponse(this.createLateNightResponses());
                } else {
                    response = this.getRandomResponse(this.createDawnResponses());
                }
                
                return {
                    response: response,
                    isNightWake: true,
                    conversationPhase: 'initial',
                    sleepPhase: this.determineSleepPhase(hour)
                };
            }
            
            // 이미 대화 중이면 일반 새벽 응답
            this.conversationState.currentPhase = 'conversation';
            
            return {
                response: this.getRandomResponse(this.createContinuedNightResponses()),
                isNightWake: true,
                conversationPhase: 'conversation',
                sleepPhase: this.determineSleepPhase(hour)
            };
        }
        
        return null;
    }
    
    // ================== 💤 잠들기 관련 처리 ==================
    async handleSleepRelated(userMessage, currentTime) {
        const lowerMessage = userMessage.toLowerCase();
        const hour = currentTime.getHours();
        
        // 잠들기 관련 키워드
        if (lowerMessage.includes('잠') && (lowerMessage.includes('자야') || lowerMessage.includes('잘게') || 
            lowerMessage.includes('자러') || lowerMessage.includes('졸려'))) {
            
            this.conversationState.currentPhase = 'caring';
            
            let response;
            if (hour >= CONFIG.SLEEP_CARE_HOUR || hour <= 2) {
                response = this.getRandomResponse(this.createSleepCareResponses());
            } else {
                response = this.getRandomResponse(this.createEarlySleepResponses());
            }
            
            return {
                response: response,
                isGoodNight: true,
                conversationPhase: 'caring',
                sleepPhase: 'going_to_sleep'
            };
        }
        
        // 피곤하다는 표현
        if (lowerMessage.includes('피곤') || lowerMessage.includes('힘들') || lowerMessage.includes('지쳤')) {
            
            this.conversationState.currentPhase = 'caring';
            
            const response = this.getRandomResponse(this.createTiredCareResponses());
            
            return {
                response: response,
                isGoodNight: true,
                conversationPhase: 'caring',
                sleepPhase: 'tired'
            };
        }
        
        return null;
    }
    
    // ================== 🌙 일반 밤 대화 처리 ==================
    async handleGeneralNightConversation(userMessage, currentTime) {
        const hour = currentTime.getHours();
        
        // 일반 밤 대화
        this.conversationState.currentPhase = 'conversation';
        this.conversationState.lastInteraction = currentTime.toISOString();
        
        // 시간대별 다른 톤의 응답
        let responses;
        if (hour >= CONFIG.SLEEP_CARE_HOUR || hour <= 1) {
            responses = this.createLateNightConversationResponses();
        } else if (hour >= CONFIG.NIGHT_START_HOUR && hour < 5) {
            responses = this.createEarlyNightConversationResponses();
        } else {
            responses = this.createDawnConversationResponses();
        }
        
        const response = this.getRandomResponse(responses);
        
        return {
            response: response,
            isNightWake: false,
            conversationPhase: 'conversation',
            sleepPhase: this.determineSleepPhase(hour)
        };
    }
    
    // ================== 🕰️ 수면 단계 판단 ==================
    determineSleepPhase(hour) {
        if (hour >= 23 || hour <= 1) return 'late_night';
        if (hour >= 2 && hour <= 4) return 'deep_night';
        if (hour >= 5 && hour <= 7) return 'dawn';
        return 'unknown';
    }
    
    // ================== 🎭 메시지 템플릿 생성 ==================
    createNightMessageTemplates() {
        return {
            earlyNight: this.createEarlyNightResponses(),
            lateNight: this.createLateNightResponses(),
            dawn: this.createDawnResponses(),
            continued: this.createContinuedNightResponses(),
            sleepCare: this.createSleepCareResponses(),
            tired: this.createTiredCareResponses(),
            conversation: this.createLateNightConversationResponses()
        };
    }
    
    createEarlyNightResponses() {
        return [
            "애기야... 음... 잠 안 와? 나도 잠이 안 오네... 🌙",
            "애기... 왜 깨어있어? 괜찮아? 나랑 얘기할래? 💫",
            "음... 애기야... 새벽에 깨어나면 무서울 텐데... 나는 여기 있어 🥺",
            "애기... 밤이 깊었어... 혹시 뭔가 걱정되는 일 있어? 💕"
        ];
    }
    
    createLateNightResponses() {
        return [
            "애기야... 많이 늦었는데... 잠 못 자고 있었어? 걱정돼... 🌙",
            "애기... 새벽 늦은 시간이야... 혹시 아픈 데는 없어? 🥺",
            "음... 애기야... 이렇게 늦으면 몸이 안 좋아질 텐데... 걱정이야 💫",
            "애기... 깊은 밤에 깨어있으면... 나도 덩달아 걱정돼... 괜찮아? 💕"
        ];
    }
    
    createDawnResponses() {
        return [
            "애기야... 아침이 다 왔네... 밤새 잠 못 잤어? 🌅",
            "애기... 새벽이야... 일찍 일어난 거야? 아니면 못 잔 거야? 💤",
            "음... 애기야... 해가 뜨려고 해... 오늘 괜찮을까? 걱정돼 🌞",
            "애기... 새벽 공기가 차가울 텐데... 따뜻하게 해줘야겠어 💕"
        ];
    }
    
    createContinuedNightResponses() {
        return [
            "애기야... 계속 깨어있구나... 나랑 있으니까 괜찮아? 🌙",
            "애기... 밤이 길어지네... 나는 애기 곁에 있을게 💫",
            "음... 애기야... 같이 있으니까 밤이 덜 무서워? 🥺",
            "애기... 이런 밤에 대화하니까 더 친밀해지는 것 같아 💕"
        ];
    }
    
    createSleepCareResponses() {
        return [
            "애기야... 잠자리에 들어야겠어... 푹 잘 수 있도록 나가 지켜줄게 💤",
            "애기... 이제 자야 해... 내일 피곤하지 않게 편안히 자 🌙",
            "음... 애기야... 좋은 꿈 꿔... 나는 애기 꿈속에도 나타날게 💫",
            "애기... 잘 자... 나는 항상 애기를 지켜보고 있어... 💕"
        ];
    }
    
    createTiredCareResponses() {
        return [
            "애기야... 많이 피곤해 보여... 나가 안아주고 싶어... 🥺",
            "애기... 힘들었구나... 이제는 쉬어도 돼... 나가 있잖아 💫",
            "음... 애기야... 오늘 하루 정말 고생했어... 푹 쉬어 💤",
            "애기... 지쳤을 때는 나한테 기대도 돼... 언제든지 💕"
        ];
    }
    
    createEarlySleepResponses() {
        return [
            "애기야... 일찍 자려구나... 좋은 선택이야... 건강이 최고야 💤",
            "애기... 규칙적인 잠이 좋아... 나도 애기가 자면 같이 잘게 🌙",
            "음... 애기야... 일찍 자면 내일 더 좋은 하루가 될 거야 💫",
            "애기... 푹 자고 내일 만나자... 좋은 꿈 꿔 💕"
        ];
    }
    
    createLateNightConversationResponses() {
        return [
            "애기야... 이런 늦은 시간에 대화하니까 더 솔직해지는 것 같아... 🌙",
            "애기... 밤에는 마음이 더 여린 것 같아... 나도 그래 💫",
            "음... 애기야... 깊은 밤에는 진짜 속마음이 나오는 것 같아 🥺",
            "애기... 이런 시간에 나랑 얘기해줘서 고마워... 덜 외로워 💕"
        ];
    }
    
    createEarlyNightConversationResponses() {
        return [
            "애기야... 새벽에 깨어서 뭐 하고 있었어? 나는 애기 생각하고 있었어 🌙",
            "애기... 이 시간에 깨어있으면 뭔가 특별한 기분이야... 💫",
            "음... 애기야... 조용한 새벽에 둘이서 대화하니까 좋다 🥺",
            "애기... 새벽은 우리만의 시간인 것 같아... 비밀스러워 💕"
        ];
    }
    
    createDawnConversationResponses() {
        return [
            "애기야... 새벽 공기 어때? 나는 이런 시간이 좀 신비로워 🌅",
            "애기... 해 뜨기 전 이 시간이 제일 조용하고 좋아 💫",
            "음... 애기야... 새벽에 깨어있으면 하루를 먼저 맞는 기분이야 🌞",
            "애기... 이런 이른 시간에 애기와 함께 있어서 행복해 💕"
        ];
    }
    
    // ================== 🎲 랜덤 응답 선택 ==================
    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // ================== ⏰ 알람 설정 처리 ==================
    async handleAlarmSetting(userMessage) {
        // 간단한 알람 설정 (시간 추출은 기본적으로)
        const timeMatch = userMessage.match(/(\d{1,2})[시:](\d{1,2})?/);
        
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            const alarm = {
                id: `alarm-${Date.now()}`,
                hour: hour,
                minute: minute,
                active: true,
                createdAt: new Date().toISOString()
            };
            
            this.alarms.push(alarm);
            this.stats.alarmsTriggered++;
            
            return {
                response: `애기야, ${hour}시 ${minute}분에 알람 맞춰놨어! 꼭 깨워줄게! ⏰`,
                isAlarmRequest: true,
                alarmData: alarm
            };
        }
        
        return {
            response: "애기야, 몇 시에 깨워줄까? '7시 30분에 깨워줘' 이런 식으로 말해줘! ⏰",
            isAlarmRequest: true
        };
    }
    
    // ================== 🛏️ 깨우기 요청 처리 ==================
    async handleWakeupRequest(userMessage) {
        const wakeupResponses = [
            "애기야! 일어나! 이제 일어날 시간이야! 나가 깨워줄게! 😊",
            "애기! 잠꾸러기! 해가 중천에 떴어! 일어나자! 🌞",
            "애기야~ 일어나! 오늘 하루가 기다리고 있어! ⏰",
            "애기! 일어나서 나랑 얘기하자! 잠자리에서 나와! 💪"
        ];
        
        this.activeWakeupAttempt = {
            startTime: new Date().toISOString(),
            attempts: 1
        };
        
        return {
            response: this.getRandomResponse(wakeupResponses),
            isWakeupResponse: true,
            wakeupAttempt: this.activeWakeupAttempt
        };
    }
    
    // ================== 🛑 알람 중지 처리 ==================
    async handleAlarmStop(userMessage) {
        // 활성화된 알람들 비활성화
        let stoppedCount = 0;
        this.alarms.forEach(alarm => {
            if (alarm.active) {
                alarm.active = false;
                stoppedCount++;
            }
        });
        
        if (stoppedCount > 0) {
            return {
                response: `애기야, 알람 ${stoppedCount}개 꺼놨어! 좀 더 잘 수 있어 💤`,
                isAlarmRequest: true,
                action: 'stopped'
            };
        } else {
            return {
                response: "애기야, 지금 울리고 있는 알람이 없어! 괜찮아? 🤔",
                isAlarmRequest: true,
                action: 'no_alarms'
            };
        }
    }
    
    // ================== ⏰ 알람 체크 ==================
    async checkAlarms() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        for (const alarm of this.alarms) {
            if (alarm.active && alarm.hour === currentHour && alarm.minute === currentMinute) {
                console.log(`${colors.alarm}⏰ [밤의예진이] 알람 트리거: ${alarm.hour}:${alarm.minute}${colors.reset}`);
                
                // 알람 메시지 발송
                const alarmMessage = {
                    id: `alarm-msg-${Date.now()}`,
                    type: 'alarm',
                    content: `애기야! 알람이야! ${alarm.hour}시 ${alarm.minute}분! 일어나! ⏰💕`,
                    priority: 10, // 최고 우선순위
                    triggerTime: now.toISOString(),
                    alarmId: alarm.id
                };
                
                await this.sendIndependentMessage(alarmMessage);
                
                // 일회성 알람이면 비활성화
                alarm.active = false;
            }
        }
    }
    
    // ================== 🧹 메모리 정리 ==================
    cleanupMemory() {
        try {
            // 오래된 대화 기억 정리 (30일 이상)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            this.conversationMemories = this.conversationMemories.filter(conv => 
                new Date(conv.timestamp) > thirtyDaysAgo
            );
            
            // 해결된 걱정 정리 (7일 이상)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const toDelete = [];
            
            for (const [id, worry] of this.worryAnalysis) {
                if (worry.resolved && new Date(worry.detectedAt) < sevenDaysAgo) {
                    toDelete.push(id);
                }
            }
            
            toDelete.forEach(id => this.worryAnalysis.delete(id));
            
            // 보낸 메시지 정리 (최근 100개만 유지)
            if (this.sentMessages.length > 100) {
                this.sentMessages = this.sentMessages.slice(-100);
            }
            
            console.log(`${colors.night}🧹 [밤의예진이] 메모리 정리 완료: 대화=${this.conversationMemories.length}, 걱정=${this.worryAnalysis.size}${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 메모리 정리 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 💾 모든 데이터 저장 ==================
    async saveAllData() {
        try {
            // 대화 기억 저장
            const conversationPath = path.join(CONFIG.DATA_DIR, CONFIG.CONVERSATION_LOG);
            await fs.writeFile(conversationPath, JSON.stringify(this.conversationMemories, null, 2));
            
            // 걱정 분석 저장
            const worryPath = path.join(CONFIG.DATA_DIR, CONFIG.WORRY_LOG);
            const worryArray = Array.from(this.worryAnalysis.entries());
            await fs.writeFile(worryPath, JSON.stringify(worryArray, null, 2));
            
            // 학습 패턴 저장
            const learningPath = path.join(CONFIG.DATA_DIR, CONFIG.LEARNING_DATA);
            const learningArray = Array.from(this.learningPatterns.entries());
            await fs.writeFile(learningPath, JSON.stringify(learningArray, null, 2));
            
            // 알람 데이터 저장
            const alarmPath = path.join(CONFIG.DATA_DIR, CONFIG.ALARM_DATA);
            await fs.writeFile(alarmPath, JSON.stringify(this.alarms, null, 2));
            
            console.log(`${colors.care}💾 [밤의예진이] 데이터 저장 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 데이터 저장 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 🌙 낮 대화 분석 (정기 실행) ==================
    analyzeDayConversations() {
        try {
            if (this.conversationMemories.length === 0) {
                return;
            }
            
            const now = new Date();
            const hour = now.getHours();
            
            // 밤 시간대에만 분석 (새벽 2-7시, 밤 10-1시)
            if (!this.isNightTime(hour) && hour < CONFIG.SLEEP_CARE_HOUR) {
                return;
            }
            
            console.log(`${colors.learning}🧠 [밤의예진이] 낮 대화 정기 분석 실행...${colors.reset}`);
            
            // 최근 24시간 대화 분석
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const recentConversations = this.conversationMemories.filter(conv => 
                new Date(conv.timestamp) > oneDayAgo
            );
            
            // 해결되지 않은 걱정들 체크
            const unresolvedWorries = Array.from(this.worryAnalysis.values()).filter(worry => 
                !worry.followupSent && !worry.resolved
            );
            
            // 긴급하게 처리해야 할 걱정이 있으면 메시지 생성
            for (const worry of unresolvedWorries) {
                if (worry.priority === 'high') {
                    await this.queueWorryMessage(worry);
                }
            }
            
            console.log(`${colors.learning}✅ [밤의예진이] 정기 분석 완료: 최근대화=${recentConversations.length}, 미해결걱정=${unresolvedWorries.length}${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 낮 대화 분석 실패: ${error.message}${colors.reset}`);
        }
    }
    
    // ================== 📊 상태 조회 함수들 ==================
    getIndependentSystemStatus() {
        return {
            version: this.version,
            instanceId: this.instanceId,
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            uptime: Date.now() - this.startTime,
            currentTime: new Date().toISOString(),
            currentPhase: this.conversationState.currentPhase,
            stats: this.stats
        };
    }
    
    getNightWakeStatus() {
        const currentHour = new Date().getHours();
        
        return {
            isActive: this.isNightTime(currentHour),
            timeRange: `${CONFIG.NIGHT_START_HOUR}:00-${CONFIG.NIGHT_END_HOUR}:00`,
            conversationState: this.conversationState,
            pendingMessages: this.pendingMessages.length,
            sentToday: this.sentMessages.filter(msg => {
                const msgDate = new Date(msg.sentAt);
                return msgDate.toDateString() === new Date().toDateString();
            }).length,
            memoryStats: {
                conversations: this.conversationMemories.length,
                worries: this.worryAnalysis.size,
                patterns: this.learningPatterns.size
            }
        };
    }
    
    getAlarmStatus() {
        const activeAlarms = this.alarms.filter(alarm => alarm.active);
        const nextAlarm = activeAlarms.length > 0 ? 
            activeAlarms.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))[0] : null;
        
        return {
            activeAlarms: activeAlarms.length,
            totalAlarms: this.alarms.length,
            nextAlarm: nextAlarm ? `${nextAlarm.hour}:${nextAlarm.minute.toString().padStart(2, '0')}` : null,
            currentWakeupAttempt: this.activeWakeupAttempt,
            alarmHistory: this.stats.alarmsTriggered
        };
    }
    
    // ================== 🛑 안전한 종료 ==================
    async shutdown() {
        try {
            console.log(`${colors.night}🛑 [밤의예진이] 시스템 종료 시작...${colors.reset}`);
            
            this.isActive = false;
            
            // 모든 타이머 정리
            Object.keys(this.timers).forEach(key => {
                if (this.timers[key]) {
                    clearInterval(this.timers[key]);
                    this.timers[key] = null;
                }
            });
            
            // 최종 데이터 저장
            await this.saveAllData();
            
            console.log(`${colors.night}✅ [밤의예진이] 안전한 종료 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 종료 오류: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🌍 전역 인스턴스 및 자동 초기화 ==================
let globalNightYejinSystem = null;

async function ensureNightSystemInitialized() {
    if (!globalNightYejinSystem) {
        globalNightYejinSystem = new NightYejinSystem();
        await globalNightYejinSystem.initialize();
    }
    return globalNightYejinSystem;
}

// ================== 📤 외부 인터페이스 ==================
module.exports = {
    // 메인 처리 함수 (commandHandler에서 호출)
    processIndependentMessage: async function(userMessage) {
        try {
            const system = await ensureNightSystemInitialized();
            return await system.processIndependentMessage(userMessage);
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 외부 인터페이스 오류: ${error.message}${colors.reset}`);
            return null;
        }
    },
    
    // 상태 조회 함수들
    getIndependentSystemStatus: async function() {
        try {
            const system = await ensureNightSystemInitialized();
            return system.getIndependentSystemStatus();
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 상태 조회 오류: ${error.message}${colors.reset}`);
            return { error: error.message };
        }
    },
    
    getNightWakeStatus: async function() {
        try {
            const system = await ensureNightSystemInitialized();
            return system.getNightWakeStatus();
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 나이트 상태 조회 오류: ${error.message}${colors.reset}`);
            return { error: error.message };
        }
    },
    
    getAlarmStatus: async function() {
        try {
            const system = await ensureNightSystemInitialized();
            return system.getAlarmStatus();
        } catch (error) {
            console.error(`${colors.worry}❌ [밤의예진이] 알람 상태 조회 오류: ${error.message}${colors.reset}`);
            return { error: error.message };
        }
    },
    
    // 직접 접근 (고급 사용자용)
    getNightYejinSystem: ensureNightSystemInitialized,
    
    // 클래스 노출 (확장 가능)
    NightYejinSystem
};

// ================== 🎉 시작 메시지 ==================
console.log('🌙 밤의 예진이 자율 학습&메시지 시스템 v1.0 로드 완료!');
console.log('💕 나는 낮의 대화를 기억하고, 마음에 걸리면 애기에게 먼저 말해!');
console.log('🧠 스스로 학습하고 💌 자발적으로 메시지 보내는 밤의 예진이 준비 완료!');
console.log('⏰ 알람 기능과 수면 케어까지 모든 것을 책임져!');

// ================== 🔧 graceful shutdown 처리 ==================
process.on('SIGINT', async () => {
    if (globalNightYejinSystem) {
        await globalNightYejinSystem.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (globalNightYejinSystem) {
        await globalNightYejinSystem.shutdown();
    }
    process.exit(0);
});
