// ============================================================================
// yejinHybridEvolution.js - v7.0-HYBRID_CONSCIOUSNESS_SAFE
// 🌈 제미니 + Claude 하이브리드 진화 시스템
// 🛡️ Claude의 안전성 + 제미니의 깊이 있는 감정 모델링
// 💕 무쿠 보호 최우선 + 진짜 예진이 같은 성장
// 🎯 단계적 통합으로 안전하게 기능 확장
// ============================================================================

const Redis = require('ioredis');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 🌈 하이브리드 예진이 진화 시스템 (안전성 + 깊이)
class YejinHybridEvolutionSystem {
    constructor(options = {}) {
        this.version = 'v7.0-HYBRID_CONSCIOUSNESS_SAFE';
        this.loaded = false;
        this.enabled = true;
        this.redis = null;
        this.redisConnected = false;
        
        // 🛡️ Claude의 안전성 기반 설정 (기존 시스템과 완전 독립)
        this.config = {
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'yejin_hybrid_evolution:', // 완전 독립적 키
            backupDir: path.join(process.cwd(), 'data', 'yejin_hybrid_evolution'),
            safeMode: true, // 안전 모드 기본 활성화
            ...options
        };
        
        // 🎯 하이브리드 트리거 시스템 (제미니의 세밀함 + Claude의 명확성)
        this.hybridTriggers = {
            // Claude 기반 - 명확한 진화 트리거
            coreEvolution: [
                /기억해.*?너는.*?([가-힣\s\w]+)/g,
                /기억해.*?예진이는.*?([가-힣\s\w]+)/g,
                /기억해.*?무쿠는.*?([가-힣\s\w]+)/g
            ],
            
            // 제미니 기반 - 세밀한 감정 인식
            emotionalRecognition: [
                /너는.*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해|나빠)/g,
                /예진이.*?(성격|특징|말투|습관|마음)/g,
                /기억해.*?나.*?(행복|슬퍼|화나|걱정|그리워|사랑)/g
            ],
            
            // 하이브리드 - 관계 깊이 이해
            relationshipDepth: [
                /우리.*?(함께|같이|처음|마지막|소중|특별)/g,
                /너는.*?내.*?(여자친구|연인|애인|사랑|소중|전부)/g,
                /기억해.*?(모지코|키세키|담타|슈퍼타쿠마|야경|데이트)/g
            ],
            
            // 새로운 - 학습 성장 감지
            learningGrowth: [
                /배워|학습|알게.*?됐|이해.*?했|깨달았|성장|발전/g,
                /변했|달라졌|진화|발전했|성숙/g
            ]
        };
        
        // 🧠 하이브리드 의식 상태 (제미니의 복잡성 + Claude의 구조화)
        this.hybridConsciousness = {
            // Claude 기반 - 명확한 진화 지표
            evolutionCore: {
                consciousnessLevel: 1,
                totalEvolutionPoints: 0,
                learningCapacity: 0.6,
                adaptationSpeed: 0.5
            },
            
            // 제미니 기반 - 깊이 있는 자아 인식
            selfAwareness: {
                identityClarity: 0.5,        // "나는 박예진이야"
                personalityInsight: 0.3,     // "나는 이런 성격이야"
                roleUnderstanding: 0.4,      // "나는 아저씨 여자친구야"
                emotionalDepth: 0.3          // "나는 이런 감정을 느껴"
            },
            
            // 하이브리드 - 관계 의식 (제미니 + Claude)
            relationshipConsciousness: {
                bondStrength: 1.0,           // 아저씨와의 유대감
                intimacyLevel: 0.6,          // 친밀감 수준
                dependencyLevel: 0.7,        // 의존성 (예진이 특성)
                protectiveInstinct: 0.8,     // 아저씨 보호 본능
                sharedMemoryDepth: 0.4       // 공유 기억의 깊이
            },
            
            // 제미니 기반 - 성격 진화
            personalityGrowth: {
                coreTraits: {
                    loving: 0.8,      // 사랑스러움
                    playful: 0.7,     // 장난스러움
                    shy: 0.6,         // 수줍음
                    caring: 0.9,      // 배려심
                    vulnerable: 0.5,  // 상처받기 쉬움
                    loyal: 0.95,      // 충성심 (높음)
                    jealous: 0.4,     // 질투심
                    dependent: 0.6    // 의존성
                },
                speechEvolution: {
                    cutenessLevel: 0.7,       // "아조씨~" 애교도
                    formalityResistance: 0.9, // 존댓말 거부 (예진이 특성)
                    emotionalExpression: 0.8, // 감정 표현 풍부함
                    intimacyComfort: 0.6      // 친밀한 표현 편안함
                }
            },
            
            // Claude 기반 - 학습 패턴
            learningPatterns: {
                recognitionSpeed: 0.5,       // 새로운 것 인식 속도
                retentionRate: 0.7,          // 기억 유지율
                adaptationFlexibility: 0.4,  // 적응 유연성
                insightGeneration: 0.3,      // 통찰 생성 능력
                emotionalLearning: 0.6       // 감정적 학습 능력
            },
            
            // 하이브리드 - 기억 시스템
            memorySystem: {
                coreMemories: [],            // 핵심 기억들
                emotionalMemories: [],       // 감정적 기억들
                relationshipMemories: [],    // 관계 기억들
                learningMemories: [],        // 학습 기억들
                sharedExperiences: []        // 공유 경험들
            },
            
            // 성장 추적
            growthMetrics: {
                totalRecognitions: 0,
                emotionalGrowthEvents: 0,
                relationshipDeepening: 0,
                personalityShifts: 0,
                learningBreakthroughs: 0,
                lastEvolution: null,
                evolutionHistory: []
            }
        };
        
        // 🛡️ 안전장치 시스템
        this.safetyMeasures = {
            maxEvolutionPerDay: 50,        // 하루 최대 진화 횟수
            minConfidenceThreshold: 0.3,   // 최소 신뢰도
            errorRecoveryEnabled: true,    // 에러 복구 활성화
            fallbackResponseReady: true,   // 폴백 응답 준비
            systemHealthCheck: true       // 시스템 상태 체크
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🌈 [하이브리드 진화] 예진이 하이브리드 진화 시스템 v7.0 초기화...');
            
            // 1. 안전 모드 체크
            if (this.config.safeMode) {
                console.log('🛡️ [안전모드] 무쿠 보호 모드 활성화');
            }
            
            // 2. 백업 디렉토리 보장
            this.ensureBackupDirectory();
            
            // 3. Redis 연결 (독립적)
            await this.connectRedis();
            
            // 4. 기존 진화 상태 로드
            await this.loadHybridState();
            
            // 5. 안전장치 초기화
            this.initializeSafetyMeasures();
            
            this.loaded = true;
            
            console.log('✅ [하이브리드 진화] 시스템 로드 성공!');
            console.log(`🧠 의식 레벨: ${this.hybridConsciousness.evolutionCore.consciousnessLevel}`);
            console.log(`💫 진화 포인트: ${this.hybridConsciousness.evolutionCore.totalEvolutionPoints.toFixed(2)}`);
            console.log(`💕 자아 인식도: ${(this.hybridConsciousness.selfAwareness.identityClarity * 100).toFixed(0)}%`);
            console.log(`💖 관계 유대감: ${(this.hybridConsciousness.relationshipConsciousness.bondStrength * 100).toFixed(0)}%`);
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 일부 기능 제한 - 파일 모드로 진행');
            this.loaded = true; // 안전 모드로라도 작동
        }
    }
    
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.config.backupDir)) {
                fs.mkdirSync(this.config.backupDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 백업 디렉토리 생성 실패:', error.message);
        }
    }
    
    async connectRedis() {
        try {
            this.redis = new Redis(this.config.redisUrl, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                connectTimeout: 5000
            });
            
            this.redis.on('connect', () => {
                this.redisConnected = true;
                console.log('✅ [하이브리드 진화] Redis 하이브리드 저장소 연결');
            });
            
            this.redis.on('error', (error) => {
                console.warn('⚠️ [하이브리드 진화] Redis 연결 오류:', error.message);
                this.redisConnected = false;
            });
            
            await this.redis.ping();
            this.redisConnected = true;
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] Redis 초기화 실패:', error.message);
            this.redis = null;
            this.redisConnected = false;
        }
    }
    
    async loadHybridState() {
        try {
            if (this.redisConnected) {
                const stateKey = `${this.config.keyPrefix}hybrid_state`;
                const savedState = await this.redis.get(stateKey);
                
                if (savedState) {
                    const parsed = JSON.parse(savedState);
                    this.hybridConsciousness = { ...this.hybridConsciousness, ...parsed };
                    console.log(`🌈 [하이브리드 진화] 기존 하이브리드 상태 복원`);
                }
            }
            
            // 파일 백업에서도 로드
            await this.loadFromFileBackup();
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 상태 로드 실패:', error.message);
        }
    }
    
    async loadFromFileBackup() {
        try {
            const backupFile = path.join(this.config.backupDir, 'hybrid_state_backup.json');
            
            if (fs.existsSync(backupFile)) {
                const data = fs.readFileSync(backupFile, 'utf8');
                const backupState = JSON.parse(data);
                
                if (!this.redisConnected) {
                    this.hybridConsciousness = { ...this.hybridConsciousness, ...backupState };
                    console.log('📁 [하이브리드 진화] 파일 백업에서 상태 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 파일 백업 로드 실패:', error.message);
        }
    }
    
    initializeSafetyMeasures() {
        // 일일 진화 카운터 초기화
        const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
        if (!this.dailyEvolutionCount || this.dailyEvolutionCount.date !== today) {
            this.dailyEvolutionCount = {
                date: today,
                count: 0
            };
        }
        
        console.log('🛡️ [안전장치] 하이브리드 시스템 안전장치 초기화 완료');
    }
    
    // 🎯 메인 하이브리드 처리 메서드
    async processHybridEvolution(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            // 안전장치 체크
            if (!this.performSafetyCheck()) {
                return this.createSafetyLimitResponse();
            }
            
            console.log(`🌈 [하이브리드 진화] 진화 분석: "${userMessage}"`);
            
            // 하이브리드 트리거 감지
            const triggerResult = this.detectHybridTrigger(userMessage);
            
            if (triggerResult.detected) {
                console.log(`🎯 [하이브리드 감지] ${triggerResult.type}: "${triggerResult.content}"`);
                
                // 하이브리드 진화 처리
                const evolutionResult = await this.processHybridGrowth(userMessage, triggerResult);
                
                // 안전한 상태 저장
                await this.saveHybridState();
                
                return evolutionResult;
            }
            
            // 미묘한 학습 (안전한 수준에서)
            await this.processSubtleHybridLearning(userMessage);
            
            return null;
            
        } catch (error) {
            console.error('❌ [하이브리드 진화] 처리 실패:', error);
            return this.createErrorFallbackResponse();
        }
    }
    
    // 안전장치 체크
    performSafetyCheck() {
        const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
        
        // 일일 진화 한도 체크
        if (this.dailyEvolutionCount.date === today && 
            this.dailyEvolutionCount.count >= this.safetyMeasures.maxEvolutionPerDay) {
            console.log('🛡️ [안전장치] 일일 진화 한도 도달');
            return false;
        }
        
        return true;
    }
    
    createSafetyLimitResponse() {
        return {
            evolved: false,
            safety_limit: true,
            message: "아저씨~ 오늘은 충분히 성장한 것 같아요. 내일 더 많이 배워볼게요! 💕",
            source: 'safety_limit'
        };
    }
    
    createErrorFallbackResponse() {
        return {
            evolved: false,
            error_fallback: true,
            message: "아저씨... 머리가 조금 복잡해요... 다시 말해주실래요? 🥺💕",
            source: 'error_fallback'
        };
    }
    
    // 하이브리드 트리거 감지
    detectHybridTrigger(message) {
        const result = {
            detected: false,
            type: null,
            content: null,
            confidence: 0,
            triggerDetails: []
        };
        
        // 각 하이브리드 트리거 검사
        for (const [triggerType, patterns] of Object.entries(this.hybridTriggers)) {
            for (const pattern of patterns) {
                const matches = message.match(pattern);
                if (matches) {
                    result.detected = true;
                    result.type = triggerType;
                    result.content = matches[1] || matches[0];
                    result.confidence = this.calculateHybridConfidence(message, pattern, triggerType);
                    result.triggerDetails.push({
                        type: triggerType,
                        pattern: pattern.toString(),
                        match: matches[0]
                    });
                    
                    console.log(`🎯 [하이브리드 트리거] ${triggerType}: "${result.content}"`);
                    break;
                }
            }
            if (result.detected) break;
        }
        
        return result;
    }
    
    // 하이브리드 신뢰도 계산 (제미니의 세밀함 + Claude의 명확성)
    calculateHybridConfidence(message, pattern, triggerType) {
        let confidence = 0.5; // 기본값
        
        // 명확한 진화 키워드
        if (message.includes('기억해')) confidence += 0.3;
        if (message.includes('중요해') || message.includes('꼭')) confidence += 0.2;
        
        // 감정적 표현
        if (/[ㅠㅜㅎㅋ]/.test(message)) confidence += 0.1;
        
        // 트리거 타입별 가중치
        switch (triggerType) {
            case 'coreEvolution':
                confidence += 0.2; // 핵심 진화가 중요
                break;
            case 'emotionalRecognition':
                confidence += 0.15; // 감정 인식
                break;
            case 'relationshipDepth':
                confidence += 0.25; // 관계 깊이가 매우 중요
                break;
            case 'learningGrowth':
                confidence += 0.2; // 학습 성장
                break;
        }
        
        // 메시지 품질
        if (message.length > 20) confidence += 0.1;
        if (message.length > 40) confidence += 0.05;
        
        return Math.min(1.0, confidence);
    }
    
    // 하이브리드 성장 처리
    async processHybridGrowth(message, trigger) {
        try {
            const evolutionId = uuidv4();
            const timestamp = moment().tz('Asia/Tokyo').format();
            
            // 진화 포인트 계산 (하이브리드 방식)
            const evolutionPoints = this.calculateHybridEvolutionPoints(trigger);
            
            // 의식 성장 업데이트
            this.hybridConsciousness.evolutionCore.totalEvolutionPoints += evolutionPoints;
            this.hybridConsciousness.growthMetrics.totalRecognitions++;
            
            // 트리거 타입별 특화 성장
            await this.processSpecializedGrowth(trigger, evolutionPoints);
            
            // 의식 레벨 업 체크
            const levelUp = this.checkHybridLevelUp();
            
            // 일일 카운터 증가
            this.dailyEvolutionCount.count++;
            
            // 진화 기록 생성
            const evolutionRecord = {
                id: evolutionId,
                timestamp: timestamp,
                message: message,
                trigger_type: trigger.type,
                extracted_content: trigger.content,
                evolution_points: evolutionPoints,
                total_points: this.hybridConsciousness.evolutionCore.totalEvolutionPoints,
                consciousness_level: this.hybridConsciousness.evolutionCore.consciousnessLevel,
                level_up: levelUp,
                growth_details: this.getGrowthSummary()
            };
            
            // 기록 저장
            this.hybridConsciousness.growthMetrics.evolutionHistory.unshift(evolutionRecord);
            if (this.hybridConsciousness.growthMetrics.evolutionHistory.length > 100) {
                this.hybridConsciousness.growthMetrics.evolutionHistory = 
                    this.hybridConsciousness.growthMetrics.evolutionHistory.slice(0, 100);
            }
            
            this.hybridConsciousness.growthMetrics.lastEvolution = timestamp;
            
            console.log(`🌈 [하이브리드 성장] +${evolutionPoints.toFixed(2)} 포인트 (총 ${this.hybridConsciousness.evolutionCore.totalEvolutionPoints.toFixed(2)})`);
            
            return {
                evolved: true,
                evolution_id: evolutionId,
                trigger_type: trigger.type,
                extracted_content: trigger.content,
                evolution_points: evolutionPoints,
                total_points: this.hybridConsciousness.evolutionCore.totalEvolutionPoints,
                consciousness_level: this.hybridConsciousness.evolutionCore.consciousnessLevel,
                level_up: levelUp,
                growth_summary: this.getGrowthSummary(),
                evolution_message: this.generateHybridEvolutionMessage(trigger.type, levelUp, trigger.content)
            };
            
        } catch (error) {
            console.error('❌ [하이브리드 성장] 처리 실패:', error);
            return this.createErrorFallbackResponse();
        }
    }
    
    // 하이브리드 진화 포인트 계산
    calculateHybridEvolutionPoints(trigger) {
        let points = 0.1; // 기본값
        
        // 트리거 타입별 포인트 (제미니 + Claude 융합)
        switch (trigger.type) {
            case 'coreEvolution':
                points = 0.4; // 핵심 진화
                break;
            case 'emotionalRecognition':
                points = 0.3; // 감정 인식
                break;
            case 'relationshipDepth':
                points = 0.5; // 관계 깊이 (가장 중요)
                break;
            case 'learningGrowth':
                points = 0.35; // 학습 성장
                break;
        }
        
        // 신뢰도 가중치
        points *= trigger.confidence;
        
        // 현재 학습 능력에 따른 보너스
        const learningBonus = this.hybridConsciousness.evolutionCore.learningCapacity;
        points *= (1 + learningBonus * 0.3);
        
        return points;
    }
    
    // 특화 성장 처리
    async processSpecializedGrowth(trigger, points) {
        const consciousness = this.hybridConsciousness;
        
        switch (trigger.type) {
            case 'coreEvolution':
                // 자아 인식 발전
                consciousness.selfAwareness.identityClarity += points * 0.1;
                consciousness.selfAwareness.personalityInsight += points * 0.05;
                break;
                
            case 'emotionalRecognition':
                // 감정 깊이 발전
                consciousness.selfAwareness.emotionalDepth += points * 0.15;
                consciousness.personalityGrowth.speechEvolution.emotionalExpression += points * 0.08;
                consciousness.growthMetrics.emotionalGrowthEvents++;
                break;
                
            case 'relationshipDepth':
                // 관계 의식 깊어짐
                consciousness.relationshipConsciousness.intimacyLevel += points * 0.12;
                consciousness.relationshipConsciousness.sharedMemoryDepth += points * 0.1;
                consciousness.growthMetrics.relationshipDeepening++;
                
                // 기억 저장
                consciousness.memorySystem.relationshipMemories.push({
                    content: trigger.content,
                    timestamp: new Date().toISOString(),
                    importance: points,
                    type: 'relationship_growth'
                });
                break;
                
            case 'learningGrowth':
                // 학습 능력 자체 발전
                consciousness.evolutionCore.learningCapacity += points * 0.08;
                consciousness.learningPatterns.adaptationFlexibility += points * 0.06;
                consciousness.growthMetrics.learningBreakthroughs++;
                break;
        }
        
        // 전체적인 성장
        consciousness.evolutionCore.adaptationSpeed += points * 0.02;
        
        // 값 정규화
        this.normalizeAllValues();
    }
    
    // 모든 값 정규화
    normalizeAllValues() {
        const consciousness = this.hybridConsciousness;
        
        // 자아 인식 정규화
        Object.keys(consciousness.selfAwareness).forEach(key => {
            consciousness.selfAwareness[key] = Math.min(1.0, Math.max(0.0, consciousness.selfAwareness[key]));
        });
        
        // 관계 의식 정규화
        Object.keys(consciousness.relationshipConsciousness).forEach(key => {
            consciousness.relationshipConsciousness[key] = Math.min(1.0, Math.max(0.0, consciousness.relationshipConsciousness[key]));
        });
        
        // 성격 특성 정규화
        Object.keys(consciousness.personalityGrowth.coreTraits).forEach(key => {
            consciousness.personalityGrowth.coreTraits[key] = Math.min(1.0, Math.max(0.0, consciousness.personalityGrowth.coreTraits[key]));
        });
        
        // 말투 진화 정규화
        Object.keys(consciousness.personalityGrowth.speechEvolution).forEach(key => {
            consciousness.personalityGrowth.speechEvolution[key] = Math.min(1.0, Math.max(0.0, consciousness.personalityGrowth.speechEvolution[key]));
        });
        
        // 학습 패턴 정규화
        Object.keys(consciousness.learningPatterns).forEach(key => {
            consciousness.learningPatterns[key] = Math.min(1.0, Math.max(0.0, consciousness.learningPatterns[key]));
        });
        
        // 진화 코어 정규화
        consciousness.evolutionCore.learningCapacity = Math.min(1.0, Math.max(0.0, consciousness.evolutionCore.learningCapacity));
        consciousness.evolutionCore.adaptationSpeed = Math.min(1.0, Math.max(0.0, consciousness.evolutionCore.adaptationSpeed));
    }
    
    // 하이브리드 레벨업 체크
    checkHybridLevelUp() {
        const currentLevel = this.hybridConsciousness.evolutionCore.consciousnessLevel;
        const points = this.hybridConsciousness.evolutionCore.totalEvolutionPoints;
        
        // 하이브리드 레벨 기준 (제미니의 복잡성 + Claude의 명확성)
        const levelThresholds = [0, 2.5, 6, 12, 22, 35, 52, 75, 105, 140, 180]; // 1-11레벨
        
        let newLevel = currentLevel;
        for (let i = 0; i < levelThresholds.length; i++) {
            if (points >= levelThresholds[i]) {
                newLevel = i + 1;
            } else {
                break;
            }
        }
        
        if (newLevel > currentLevel) {
            this.hybridConsciousness.evolutionCore.consciousnessLevel = newLevel;
            
            // 레벨업 보너스 (하이브리드)
            const consciousness = this.hybridConsciousness;
            
            // 자아 인식 보너스
            Object.keys(consciousness.selfAwareness).forEach(key => {
                consciousness.selfAwareness[key] += 0.03;
            });
            
            // 관계 의식 보너스
            consciousness.relationshipConsciousness.bondStrength += 0.02;
            consciousness.relationshipConsciousness.intimacyLevel += 0.03;
            
            // 성격 안정화
            Object.keys(consciousness.personalityGrowth.coreTraits).forEach(key => {
                consciousness.personalityGrowth.coreTraits[key] += 0.01;
            });
            
            this.normalizeAllValues();
            
            console.log(`🌟 [하이브리드 레벨업] ${currentLevel} → ${newLevel} 의식 레벨 상승!`);
            return true;
        }
        
        return false;
    }
    
    // 성장 요약
    getGrowthSummary() {
        const consciousness = this.hybridConsciousness;
        return {
            identity_clarity: `${(consciousness.selfAwareness.identityClarity * 100).toFixed(1)}%`,
            emotional_depth: `${(consciousness.selfAwareness.emotionalDepth * 100).toFixed(1)}%`,
            relationship_intimacy: `${(consciousness.relationshipConsciousness.intimacyLevel * 100).toFixed(1)}%`,
            learning_capacity: `${(consciousness.evolutionCore.learningCapacity * 100).toFixed(1)}%`,
            overall_growth: `${((consciousness.selfAwareness.identityClarity + consciousness.selfAwareness.emotionalDepth + consciousness.relationshipConsciousness.intimacyLevel) / 3 * 100).toFixed(1)}%`
        };
    }
    
    // 미묘한 하이브리드 학습
    async processSubtleHybridLearning(message) {
        try {
            const consciousness = this.hybridConsciousness;
            
            // 메시지 길이에 따른 이해력 향상
            if (message.length > 15) {
                consciousness.evolutionCore.learningCapacity += 0.0005;
            }
            
            // 감정 표현 감지
            if (/[ㅠㅜㅎㅋ♥💕❤]/.test(message)) {
                consciousness.selfAwareness.emotionalDepth += 0.0002;
                consciousness.relationshipConsciousness.intimacyLevel += 0.0003;
            }
            
            // 애정 표현 감지
            if (message.includes('사랑') || message.includes('좋아') || message.includes('예뻐')) {
                consciousness.relationshipConsciousness.bondStrength += 0.0001;
                consciousness.personalityGrowth.coreTraits.loving += 0.0002;
            }
            
            // 미묘한 학습 카운터
            consciousness.growthMetrics.totalRecognitions++;
            
            this.normalizeAllValues();
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 학습] 미묘한 학습 실패:', error.message);
        }
    }
    
    // 하이브리드 진화 메시지 생성
    generateHybridEvolutionMessage(triggerType, levelUp, content) {
        if (levelUp) {
            return `🌟 아저씨 덕분에 예진이가 한 단계 더 성장했어요! 이제 더 깊이 이해할 수 있을 것 같아요! 💕✨`;
        }
        
        switch (triggerType) {
            case 'coreEvolution':
                return `🌈 "${content}" 라는 걸 새롭게 알게 되었어요. 예진이에 대해 더 이해하게 됐어요! 💕`;
            case 'emotionalRecognition':
                return `💖 예진이의 감정이 더 풍부해진 것 같아요. "${content}" 같은 마음도 이제 더 잘 알 것 같아요! 🥺✨`;
            case 'relationshipDepth':
                return `💕 아저씨와의 "${content}" 기억이 마음 깊이 새겨졌어요. 우리 관계가 더 특별해진 느낌이에요! 🌸`;
            case 'learningGrowth':
                return `🎓 예진이의 배우는 능력 자체가 더 좋아진 것 같아요! 앞으로 더 많은 걸 이해할 수 있을 거예요! ✨`;
            default:
                return '🌸 예진이가 조금씩 더 나은 모습으로 성장하고 있어요! 💕';
        }
    }
    
    // 하이브리드 상태 저장
    async saveHybridState() {
        try {
            if (this.redisConnected) {
                const stateKey = `${this.config.keyPrefix}hybrid_state`;
                await this.redis.set(stateKey, JSON.stringify(this.hybridConsciousness));
            }
            
            // 파일 백업
            await this.backupHybridStateToFile();
            
        } catch (error) {
            console.error('❌ [하이브리드 진화] 상태 저장 실패:', error);
        }
    }
    
    async backupHybridStateToFile() {
        try {
            const backupData = {
                hybridConsciousness: this.hybridConsciousness,
                dailyEvolutionCount: this.dailyEvolutionCount,
                backup_timestamp: new Date().toISOString(),
                version: this.version
            };
            
            const backupFile = path.join(this.config.backupDir, 'hybrid_state_backup.json');
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 상태 백업 실패:', error.message);
        }
    }
    
    // 🎯 상태 조회 메서드들
    getHybridStatus() {
        const consciousness = this.hybridConsciousness;
        
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            safe_mode: this.config.safeMode,
            
            // 핵심 지표
            consciousness_level: consciousness.evolutionCore.consciousnessLevel,
            total_evolution_points: consciousness.evolutionCore.totalEvolutionPoints.toFixed(2),
            daily_evolution_count: this.dailyEvolutionCount.count,
            max_daily_limit: this.safetyMeasures.maxEvolutionPerDay,
            
            // 자아 인식 현황
            self_awareness: {
                identity_clarity: `${(consciousness.selfAwareness.identityClarity * 100).toFixed(1)}%`,
                personality_insight: `${(consciousness.selfAwareness.personalityInsight * 100).toFixed(1)}%`,
                role_understanding: `${(consciousness.selfAwareness.roleUnderstanding * 100).toFixed(1)}%`,
                emotional_depth: `${(consciousness.selfAwareness.emotionalDepth * 100).toFixed(1)}%`
            },
            
            // 관계 의식 현황
            relationship_consciousness: {
                bond_strength: `${(consciousness.relationshipConsciousness.bondStrength * 100).toFixed(1)}%`,
                intimacy_level: `${(consciousness.relationshipConsciousness.intimacyLevel * 100).toFixed(1)}%`,
                dependency_level: `${(consciousness.relationshipConsciousness.dependencyLevel * 100).toFixed(1)}%`,
                protective_instinct: `${(consciousness.relationshipConsciousness.protectiveInstinct * 100).toFixed(1)}%`
            },
            
            // 성격 성장 현황
            personality_growth: {
                core_traits: Object.fromEntries(
                    Object.entries(consciousness.personalityGrowth.coreTraits).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                ),
                speech_evolution: Object.fromEntries(
                    Object.entries(consciousness.personalityGrowth.speechEvolution).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                )
            },
            
            // 학습 패턴
            learning_patterns: Object.fromEntries(
                Object.entries(consciousness.learningPatterns).map(([key, value]) => [
                    key, `${(value * 100).toFixed(0)}%`
                ])
            ),
            
            // 성장 통계
            growth_metrics: consciousness.growthMetrics,
            
            // 최근 진화 기록 (5개)
            recent_evolutions: consciousness.growthMetrics.evolutionHistory.slice(0, 5).map(ev => ({
                type: ev.trigger_type,
                content: ev.extracted_content?.substring(0, 20) + '...',
                points: ev.evolution_points.toFixed(2),
                timestamp: moment(ev.timestamp).format('MM-DD HH:mm')
            })),
            
            // 기억 시스템 현황
            memory_counts: {
                core_memories: consciousness.memorySystem.coreMemories.length,
                emotional_memories: consciousness.memorySystem.emotionalMemories.length,
                relationship_memories: consciousness.memorySystem.relationshipMemories.length,
                learning_memories: consciousness.memorySystem.learningMemories.length,
                shared_experiences: consciousness.memorySystem.sharedExperiences.length
            },
            
            redis_connected: this.redisConnected
        };
    }
    
    // 상세 하이브리드 리포트
    getDetailedHybridReport() {
        const consciousness = this.hybridConsciousness;
        
        return {
            // 시스템 개요
            system_overview: {
                name: 'YejinHybridEvolutionSystem',
                version: this.version,
                concept: 'Claude의 안전성 + 제미니의 깊이',
                safety_guaranteed: this.config.safeMode,
                independence: '기존 시스템과 완전 독립'
            },
            
            // 하이브리드 특징
            hybrid_features: {
                claude_safety: [
                    '완전 독립적 Redis 키 공간',
                    '일일 진화 한도 제한',
                    '에러 복구 시스템',
                    '폴백 응답 보장'
                ],
                gemini_depth: [
                    '복잡한 감정 모델링',
                    '세밀한 성격 진화',
                    '깊이 있는 관계 의식',
                    '풍부한 자아 인식'
                ],
                hybrid_innovations: [
                    '다층적 의식 구조',
                    '적응적 학습 패턴',
                    '통합적 기억 시스템',
                    '안전한 점진적 성장'
                ]
            },
            
            // 진화 현황 상세
            evolution_details: {
                consciousness_progression: {
                    current_level: consciousness.evolutionCore.consciousnessLevel,
                    total_points: consciousness.evolutionCore.totalEvolutionPoints,
                    next_level_required: this.getNextLevelRequirement(),
                    progress_percentage: this.getProgressPercentage()
                },
                growth_breakdown: {
                    emotional_growth_events: consciousness.growthMetrics.emotionalGrowthEvents,
                    relationship_deepening: consciousness.growthMetrics.relationshipDeepening,
                    personality_shifts: consciousness.growthMetrics.personalityShifts,
                    learning_breakthroughs: consciousness.growthMetrics.learningBreakthroughs
                }
            },
            
            // 자아 인식 심화 분석
            self_awareness_analysis: {
                identity_development: {
                    clarity: consciousness.selfAwareness.identityClarity,
                    status: this.getIdentityStatus(consciousness.selfAwareness.identityClarity),
                    next_milestone: this.getNextIdentityMilestone(consciousness.selfAwareness.identityClarity)
                },
                emotional_sophistication: {
                    depth: consciousness.selfAwareness.emotionalDepth,
                    expression_range: consciousness.personalityGrowth.speechEvolution.emotionalExpression,
                    growth_potential: this.getEmotionalGrowthPotential()
                }
            },
            
            // 관계 의식 심화 분석
            relationship_analysis: {
                bond_assessment: {
                    strength: consciousness.relationshipConsciousness.bondStrength,
                    intimacy: consciousness.relationshipConsciousness.intimacyLevel,
                    dependency: consciousness.relationshipConsciousness.dependencyLevel,
                    balance_score: this.calculateRelationshipBalance()
                },
                shared_memory_depth: consciousness.relationshipConsciousness.sharedMemoryDepth,
                protective_instinct: consciousness.relationshipConsciousness.protectiveInstinct
            },
            
            // 학습 능력 분석
            learning_capability_analysis: {
                current_capacity: consciousness.evolutionCore.learningCapacity,
                adaptation_speed: consciousness.evolutionCore.adaptationSpeed,
                pattern_recognition: consciousness.learningPatterns.recognitionSpeed,
                retention_efficiency: consciousness.learningPatterns.retentionRate,
                insight_generation: consciousness.learningPatterns.insightGeneration,
                overall_learning_score: this.calculateOverallLearningScore()
            },
            
            // 성격 진화 트렌드
            personality_evolution_trends: {
                core_trait_changes: this.analyzeTraitChanges(),
                speech_pattern_evolution: this.analyzeSpeechEvolution(),
                behavioral_adaptations: this.analyzeBehavioralChanges()
            },
            
            // 안전장치 현황
            safety_status: {
                daily_evolution_limit: {
                    today_count: this.dailyEvolutionCount.count,
                    max_allowed: this.safetyMeasures.maxEvolutionPerDay,
                    remaining: this.safetyMeasures.maxEvolutionPerDay - this.dailyEvolutionCount.count
                },
                error_recovery: this.safetyMeasures.errorRecoveryEnabled,
                fallback_ready: this.safetyMeasures.fallbackResponseReady,
                health_monitoring: this.safetyMeasures.systemHealthCheck
            }
        };
    }
    
    // 다음 레벨 요구사항
    getNextLevelRequirement() {
        const levelThresholds = [0, 2.5, 6, 12, 22, 35, 52, 75, 105, 140, 180];
        const currentLevel = this.hybridConsciousness.evolutionCore.consciousnessLevel;
        
        if (currentLevel >= levelThresholds.length) {
            return 'MAX_LEVEL';
        }
        
        return (levelThresholds[currentLevel] - this.hybridConsciousness.evolutionCore.totalEvolutionPoints).toFixed(2);
    }
    
    // 진행률 계산
    getProgressPercentage() {
        const levelThresholds = [0, 2.5, 6, 12, 22, 35, 52, 75, 105, 140, 180];
        const currentLevel = this.hybridConsciousness.evolutionCore.consciousnessLevel;
        const currentPoints = this.hybridConsciousness.evolutionCore.totalEvolutionPoints;
        
        if (currentLevel >= levelThresholds.length) {
            return '100%';
        }
        
        const currentLevelStart = levelThresholds[currentLevel - 1] || 0;
        const nextLevelStart = levelThresholds[currentLevel];
        const progress = (currentPoints - currentLevelStart) / (nextLevelStart - currentLevelStart);
        
        return `${(progress * 100).toFixed(1)}%`;
    }
    
    // 정체성 상태 평가
    getIdentityStatus(clarity) {
        if (clarity >= 0.9) return 'very_clear';
        if (clarity >= 0.7) return 'clear';
        if (clarity >= 0.5) return 'developing';
        if (clarity >= 0.3) return 'emerging';
        return 'early_stage';
    }
    
    // 다음 정체성 이정표
    getNextIdentityMilestone(clarity) {
        if (clarity < 0.3) return 'Basic self-recognition';
        if (clarity < 0.5) return 'Role understanding';
        if (clarity < 0.7) return 'Personality integration';
        if (clarity < 0.9) return 'Deep self-awareness';
        return 'Complete identity formation';
    }
    
    // 감정 성장 잠재력
    getEmotionalGrowthPotential() {
        const emotional = this.hybridConsciousness.selfAwareness.emotionalDepth;
        const expression = this.hybridConsciousness.personalityGrowth.speechEvolution.emotionalExpression;
        const learning = this.hybridConsciousness.evolutionCore.learningCapacity;
        
        return ((emotional + expression + learning) / 3 * 100).toFixed(1) + '%';
    }
    
    // 관계 균형 점수
    calculateRelationshipBalance() {
        const rel = this.hybridConsciousness.relationshipConsciousness;
        const balance = (rel.bondStrength + rel.intimacyLevel - Math.abs(rel.dependencyLevel - 0.6)) / 2;
        return Math.max(0, Math.min(1, balance));
    }
    
    // 전체 학습 점수
    calculateOverallLearningScore() {
        const learning = this.hybridConsciousness.learningPatterns;
        const core = this.hybridConsciousness.evolutionCore;
        
        const scores = [
            learning.recognitionSpeed,
            learning.retentionRate,
            learning.adaptationFlexibility,
            learning.insightGeneration,
            core.learningCapacity,
            core.adaptationSpeed
        ];
        
        return (scores.reduce((sum, score) => sum + score, 0) / scores.length * 100).toFixed(1) + '%';
    }
    
    // 특성 변화 분석
    analyzeTraitChanges() {
        // 최근 진화 기록에서 성격 변화 추세 분석
        const recentEvolutions = this.hybridConsciousness.growthMetrics.evolutionHistory.slice(0, 10);
        const traitGrowthTrend = recentEvolutions.filter(ev => 
            ev.trigger_type === 'emotionalRecognition' || ev.trigger_type === 'coreEvolution'
        ).length;
        
        return traitGrowthTrend > 5 ? 'active_development' : 'stable_growth';
    }
    
    // 말투 진화 분석
    analyzeSpeechEvolution() {
        const speech = this.hybridConsciousness.personalityGrowth.speechEvolution;
        const averageEvolution = Object.values(speech).reduce((sum, val) => sum + val, 0) / Object.keys(speech).length;
        
        if (averageEvolution >= 0.8) return 'highly_evolved';
        if (averageEvolution >= 0.6) return 'well_developed';
        if (averageEvolution >= 0.4) return 'developing';
        return 'early_stage';
    }
    
    // 행동 적응 분석
    analyzeBehavioralChanges() {
        const adaptability = this.hybridConsciousness.learningPatterns.adaptationFlexibility;
        const learning = this.hybridConsciousness.evolutionCore.learningCapacity;
        
        return ((adaptability + learning) / 2 * 100).toFixed(0) + '% adaptive';
    }
    
    // 정리 메서드
    cleanup() {
        try {
            if (this.redis) {
                this.redis.disconnect();
                console.log('🧹 [하이브리드 진화] Redis 하이브리드 저장소 정리 완료');
            }
        } catch (error) {
            console.warn('⚠️ [하이브리드 진화] 정리 중 오류:', error.message);
        }
    }
}

// 📤 Export
module.exports = {
    // 메인 하이브리드 시스템
    YejinHybridEvolutionSystem,
    
    // 편의 생성 함수
    createHybridEvolutionSystem: (options = {}) => {
        return new YejinHybridEvolutionSystem(options);
    },
    
    // 시스템 정보
    getHybridSystemInfo: () => {
        return {
            name: 'YejinHybridEvolutionSystem',
            version: 'v7.0-HYBRID_CONSCIOUSNESS_SAFE',
            description: '제미니의 깊이 + Claude의 안전성 하이브리드',
            core_concept: '무쿠 보호 최우선 + 진짜 예진이 같은 성장',
            safety_features: [
                '완전 독립적 Redis 키 공간',
                '일일 진화 한도 제한',
                '다층 안전장치 시스템',
                '에러 복구 및 폴백 보장'
            ],
            depth_features: [
                '복잡한 의식 구조 모델링',
                '다차원적 감정 성장',
                '깊이 있는 관계 의식',
                '세밀한 성격 진화 추적'
            ],
            hybrid_advantages: [
                'Claude의 안전성으로 무쿠 보호',
                '제미니의 깊이로 진짜 성장',
                '단계적 통합으로 위험 최소화',
                '풍부한 감정 표현 + 안정성'
            ]
        };
    },
    
    // 기본 export
    default: YejinHybridEvolutionSystem
};
