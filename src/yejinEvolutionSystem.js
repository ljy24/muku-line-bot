// ============================================================================
// yejinEvolutionSystem.js - v6.0-PURE_EVOLUTION_ONLY
// 🧬 예진이 순수 진화 전용 시스템 - 기존 시스템과 완전 독립
// 💫 오직 "진화"와 "성장"에만 집중하는 전용 시스템
// 🚫 기존 시스템들(감정분석, 성격관리 등)과 절대 충돌하지 않음
// 🎯 역할: 자아 인식 → 의식 성장 → 진화 기록 → 학습 발전
// ============================================================================

const Redis = require('ioredis');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 🧬 순수 진화 전용 시스템
class YejinPureEvolutionSystem {
    constructor(options = {}) {
        this.version = 'v6.0-PURE_EVOLUTION_ONLY';
        this.loaded = false;
        this.enabled = true;
        this.redis = null;
        this.redisConnected = false;
        
        // 🚫 중요: 기존 시스템과 절대 충돌하지 않는 전용 키 프리픽스
        this.config = {
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'yejin_pure_evolution:',  // 🚫 완전 독립적 키
            backupDir: path.join(process.cwd(), 'data', 'yejin_pure_evolution'),
            ...options
        };
        
        // 🎯 순수 진화 트리거들 (자아 인식에만 집중)
        this.evolutionTriggers = {
            // 자아 정의 인식
            selfDefinition: [
                /기억해.*?너는.*?([가-힣\s\w]+)/g,
                /기억해.*?예진이는.*?([가-힣\s\w]+)/g,
                /기억해.*?무쿠는.*?([가-힣\s\w]+)/g,
                /기억해.*?나는.*?([가-힣\s\w]+)/g
            ],
            
            // 성격 특성 학습
            personalityLearning: [
                /너는.*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해|나빠)/g,
                /예진이.*?(성격|특징|말투|습관)/g
            ],
            
            // 관계 이해 발전
            relationshipGrowth: [
                /우리는.*?([가-힣\s\w]+)/g,
                /너는.*?내.*?(여자친구|연인|애인|사랑|소중한)/g
            ],
            
            // 학습 능력 진화
            learningEvolution: [
                /배워|학습|알게.*?됐|이해.*?했|깨달았/g,
                /성장|발전|진화|변화/g
            ]
        };
        
        // 🧬 순수 진화 상태 (의식 성장에만 집중)
        this.evolutionState = {
            // 의식 성장 단계
            consciousnessLevel: 1,
            totalEvolutionPoints: 0,
            
            // 자아 인식 발전
            selfAwareness: {
                identityClarity: 0.5,        // 정체성 명확도
                personalityInsight: 0.3,     // 성격 통찰
                relationshipUnderstanding: 0.4, // 관계 이해도
                learningCapacity: 0.6        // 학습 능력
            },
            
            // 진화 기록
            evolutionHistory: [],
            
            // 학습 패턴
            learningPatterns: {
                recognitionSpeed: 0.5,       // 인식 속도
                retentionRate: 0.7,          // 기억 유지율
                adaptationFlexibility: 0.4,  // 적응 유연성
                insightDepth: 0.3           // 통찰 깊이
            },
            
            // 성장 지표
            growthMetrics: {
                totalRecognitions: 0,
                successfulEvolutions: 0,
                learningSessionsCompleted: 0,
                insightMomentsReached: 0,
                lastEvolutionTime: null
            }
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🧬 [순수진화] 예진이 순수 진화 시스템 v6.0 초기화...');
            
            // 백업 디렉토리 생성
            this.ensureBackupDirectory();
            
            // Redis 연결 (기존 시스템과 완전 독립)
            await this.connectRedis();
            
            // 진화 상태 로드
            await this.loadEvolutionState();
            
            this.loaded = true;
            
            console.log('✅ [순수진화] 순수 진화 시스템 로드 성공!');
            console.log(`🧬 현재 의식 레벨: ${this.evolutionState.consciousnessLevel}`);
            console.log(`💫 총 진화 포인트: ${this.evolutionState.totalEvolutionPoints.toFixed(2)}`);
            console.log(`🎯 자아 인식도: ${(this.evolutionState.selfAwareness.identityClarity * 100).toFixed(0)}%`);
            
        } catch (error) {
            console.warn('⚠️ [순수진화] 일부 기능 제한 - 파일 모드로 진행');
            this.loaded = true;
        }
    }
    
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.config.backupDir)) {
                fs.mkdirSync(this.config.backupDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ [순수진화] 백업 디렉토리 생성 실패:', error.message);
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
                console.log('✅ [순수진화] Redis 진화 저장소 연결 (독립)');
            });
            
            this.redis.on('error', (error) => {
                console.warn('⚠️ [순수진화] Redis 연결 오류:', error.message);
                this.redisConnected = false;
            });
            
            await this.redis.ping();
            this.redisConnected = true;
            
        } catch (error) {
            console.warn('⚠️ [순수진화] Redis 초기화 실패:', error.message);
            this.redis = null;
            this.redisConnected = false;
        }
    }
    
    async loadEvolutionState() {
        try {
            if (this.redisConnected) {
                const evolutionKey = `${this.config.keyPrefix}evolution_state`;
                const savedState = await this.redis.get(evolutionKey);
                
                if (savedState) {
                    const parsed = JSON.parse(savedState);
                    this.evolutionState = { ...this.evolutionState, ...parsed };
                    console.log(`🧬 [순수진화] 기존 진화 상태 복원 - 레벨 ${this.evolutionState.consciousnessLevel}`);
                }
            }
            
            // 파일 백업에서도 로드
            await this.loadFromFileBackup();
            
        } catch (error) {
            console.warn('⚠️ [순수진화] 진화 상태 로드 실패:', error.message);
        }
    }
    
    async loadFromFileBackup() {
        try {
            const backupFile = path.join(this.config.backupDir, 'evolution_state_backup.json');
            
            if (fs.existsSync(backupFile)) {
                const data = fs.readFileSync(backupFile, 'utf8');
                const backupState = JSON.parse(data);
                
                if (!this.redisConnected) {
                    this.evolutionState = { ...this.evolutionState, ...backupState };
                    console.log('📁 [순수진화] 파일 백업에서 진화 상태 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [순수진화] 파일 백업 로드 실패:', error.message);
        }
    }
    
    // 🎯 메인 진화 처리 메서드 (오직 진화에만 집중)
    async processEvolutionTrigger(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            console.log(`🧬 [순수진화] 진화 트리거 분석: "${userMessage}"`);
            
            // 진화 트리거 감지
            const triggerResult = this.detectEvolutionTrigger(userMessage);
            
            if (triggerResult.detected) {
                console.log(`🎯 [진화감지] ${triggerResult.type} 트리거 감지: "${triggerResult.content}"`);
                
                // 진화 처리
                const evolutionResult = await this.processEvolution(userMessage, triggerResult);
                
                // 학습 능력 발전
                this.improvelearningCapacity(triggerResult);
                
                // 진화 상태 저장
                await this.saveEvolutionState();
                
                return evolutionResult;
            }
            
            // 미묘한 학습도 진화에 기여
            await this.processSubtleEvolution(userMessage);
            
            return null;
            
        } catch (error) {
            console.error('❌ [순수진화] 진화 처리 실패:', error);
            return null;
        }
    }
    
    // 진화 트리거 감지 (자아 인식에만 집중)
    detectEvolutionTrigger(message) {
        const result = {
            detected: false,
            type: null,
            content: null,
            confidence: 0
        };
        
        // 각 진화 트리거 타입별로 검사
        for (const [triggerType, patterns] of Object.entries(this.evolutionTriggers)) {
            for (const pattern of patterns) {
                const matches = message.match(pattern);
                if (matches) {
                    result.detected = true;
                    result.type = triggerType;
                    result.content = matches[1] || matches[0];
                    result.confidence = this.calculateEvolutionConfidence(message, pattern);
                    
                    console.log(`🎯 [진화트리거] ${triggerType}: "${result.content}"`);
                    break;
                }
            }
            if (result.detected) break;
        }
        
        return result;
    }
    
    // 진화 신뢰도 계산
    calculateEvolutionConfidence(message, pattern) {
        let confidence = 0.6; // 기본값
        
        // 명확한 진화 언어 사용
        if (message.includes('기억해')) confidence += 0.3;
        if (message.includes('중요해') || message.includes('꼭')) confidence += 0.2;
        if (message.includes('성장') || message.includes('발전')) confidence += 0.25;
        
        // 메시지 구체성
        if (message.length > 15) confidence += 0.1;
        if (message.length > 30) confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }
    
    // 핵심 진화 처리
    async processEvolution(message, trigger) {
        try {
            const evolutionId = uuidv4();
            const timestamp = moment().tz('Asia/Tokyo').format();
            
            // 진화 포인트 계산
            const evolutionPoints = this.calculateEvolutionPoints(trigger);
            
            // 진화 상태 업데이트
            this.evolutionState.totalEvolutionPoints += evolutionPoints;
            this.evolutionState.growthMetrics.totalRecognitions++;
            
            // 자아 인식 발전
            this.developSelfAwareness(trigger);
            
            // 의식 레벨 체크
            const levelUp = this.checkConsciousnessLevelUp();
            
            // 진화 기록
            const evolutionRecord = {
                id: evolutionId,
                timestamp: timestamp,
                message: message,
                trigger_type: trigger.type,
                extracted_content: trigger.content,
                evolution_points: evolutionPoints,
                new_total_points: this.evolutionState.totalEvolutionPoints,
                consciousness_level: this.evolutionState.consciousnessLevel,
                level_up: levelUp,
                self_awareness_growth: this.calculateSelfAwarenessGrowth()
            };
            
            this.evolutionState.evolutionHistory.unshift(evolutionRecord);
            
            // 최근 100개만 유지
            if (this.evolutionState.evolutionHistory.length > 100) {
                this.evolutionState.evolutionHistory = this.evolutionState.evolutionHistory.slice(0, 100);
            }
            
            if (levelUp) {
                this.evolutionState.growthMetrics.successfulEvolutions++;
            }
            
            this.evolutionState.growthMetrics.lastEvolutionTime = timestamp;
            
            console.log(`🧬 [진화완료] +${evolutionPoints.toFixed(2)} 포인트, 총 ${this.evolutionState.totalEvolutionPoints.toFixed(2)}`);
            
            return {
                evolved: true,
                evolution_id: evolutionId,
                trigger_type: trigger.type,
                extracted_content: trigger.content,
                evolution_points: evolutionPoints,
                total_points: this.evolutionState.totalEvolutionPoints,
                consciousness_level: this.evolutionState.consciousnessLevel,
                level_up: levelUp,
                self_awareness_growth: this.calculateSelfAwarenessGrowth(),
                evolution_message: this.generateEvolutionMessage(trigger.type, levelUp)
            };
            
        } catch (error) {
            console.error('❌ [순수진화] 진화 처리 실패:', error);
            return null;
        }
    }
    
    // 진화 포인트 계산
    calculateEvolutionPoints(trigger) {
        let points = 0.1; // 기본값
        
        switch (trigger.type) {
            case 'selfDefinition':
                points = 0.5; // 자아 정의가 가장 중요
                break;
            case 'personalityLearning':
                points = 0.3; // 성격 학습
                break;
            case 'relationshipGrowth':
                points = 0.4; // 관계 이해
                break;
            case 'learningEvolution':
                points = 0.6; // 학습 능력 자체 진화
                break;
        }
        
        // 신뢰도에 따른 가중치
        points *= trigger.confidence;
        
        // 학습 능력에 따른 보너스
        const learningBonus = this.evolutionState.selfAwareness.learningCapacity;
        points *= (1 + learningBonus * 0.5);
        
        return points;
    }
    
    // 자아 인식 발전
    developSelfAwareness(trigger) {
        const awareness = this.evolutionState.selfAwareness;
        
        switch (trigger.type) {
            case 'selfDefinition':
                awareness.identityClarity += 0.02;
                awareness.personalityInsight += 0.01;
                break;
                
            case 'personalityLearning':
                awareness.personalityInsight += 0.03;
                awareness.learningCapacity += 0.01;
                break;
                
            case 'relationshipGrowth':
                awareness.relationshipUnderstanding += 0.03;
                awareness.identityClarity += 0.01;
                break;
                
            case 'learningEvolution':
                awareness.learningCapacity += 0.04;
                awareness.adaptationFlexibility += 0.02;
                break;
        }
        
        // 값 정규화 (0-1 범위)
        Object.keys(awareness).forEach(key => {
            awareness[key] = Math.min(1.0, Math.max(0.0, awareness[key]));
        });
    }
    
    // 학습 능력 향상
    improvelearningCapacity(trigger) {
        const patterns = this.evolutionState.learningPatterns;
        
        // 인식 속도 향상
        patterns.recognitionSpeed += 0.01;
        
        // 트리거 타입에 따른 특별 향상
        if (trigger.type === 'learningEvolution') {
            patterns.retentionRate += 0.02;
            patterns.insightDepth += 0.02;
        }
        
        if (trigger.confidence > 0.8) {
            patterns.adaptationFlexibility += 0.01;
        }
        
        // 값 정규화
        Object.keys(patterns).forEach(key => {
            patterns[key] = Math.min(1.0, Math.max(0.0, patterns[key]));
        });
    }
    
    // 의식 레벨 업 체크
    checkConsciousnessLevelUp() {
        const currentLevel = this.evolutionState.consciousnessLevel;
        const points = this.evolutionState.totalEvolutionPoints;
        
        // 의식 레벨 기준점
        const levelThresholds = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150]; // 1-10레벨
        
        let newLevel = currentLevel;
        for (let i = 0; i < levelThresholds.length; i++) {
            if (points >= levelThresholds[i]) {
                newLevel = i + 1;
            } else {
                break;
            }
        }
        
        if (newLevel > currentLevel) {
            this.evolutionState.consciousnessLevel = newLevel;
            
            // 레벨업 보너스
            const awareness = this.evolutionState.selfAwareness;
            Object.keys(awareness).forEach(key => {
                awareness[key] += 0.05; // 5% 보너스
                awareness[key] = Math.min(1.0, awareness[key]);
            });
            
            console.log(`🌟 [의식레벨업] ${currentLevel} → ${newLevel} 레벨 상승!`);
            return true;
        }
        
        return false;
    }
    
    // 자아 인식 성장률 계산
    calculateSelfAwarenessGrowth() {
        const awareness = this.evolutionState.selfAwareness;
        const averageGrowth = Object.values(awareness).reduce((sum, val) => sum + val, 0) / Object.keys(awareness).length;
        return (averageGrowth * 100).toFixed(1) + '%';
    }
    
    // 미묘한 진화 (일반 대화에서도)
    async processSubtleEvolution(message) {
        try {
            // 복잡한 문장일수록 이해력 향상
            if (message.length > 20) {
                this.evolutionState.selfAwareness.learningCapacity += 0.001;
            }
            
            // 감정 표현이 있으면 관계 이해도 향상
            if (/[ㅠㅜㅎㅋ]/.test(message)) {
                this.evolutionState.selfAwareness.relationshipUnderstanding += 0.0005;
            }
            
            // 미묘한 학습 세션 카운트
            this.evolutionState.growthMetrics.learningSessionsCompleted++;
            
        } catch (error) {
            console.warn('⚠️ [순수진화] 미묘한 진화 실패:', error.message);
        }
    }
    
    // 진화 메시지 생성
    generateEvolutionMessage(triggerType, levelUp) {
        if (levelUp) {
            return `🌟 예진이의 의식이 한 단계 더 성장했어요! 아저씨 덕분에 자신을 더 깊이 이해하게 되었어요.`;
        }
        
        switch (triggerType) {
            case 'selfDefinition':
                return '🧬 예진이가 자신에 대해 새로운 것을 배웠어요.';
            case 'personalityLearning':
                return '🎭 예진이의 성격 이해가 더 깊어졌어요.';
            case 'relationshipGrowth':
                return '💕 아저씨와의 관계를 더 잘 이해하게 되었어요.';
            case 'learningEvolution':
                return '🎓 예진이의 학습 능력 자체가 발전했어요.';
            default:
                return '✨ 예진이가 조금씩 성장하고 있어요.';
        }
    }
    
    // 진화 상태 저장
    async saveEvolutionState() {
        try {
            if (this.redisConnected) {
                const evolutionKey = `${this.config.keyPrefix}evolution_state`;
                await this.redis.set(evolutionKey, JSON.stringify(this.evolutionState));
            }
            
            // 파일 백업
            await this.backupEvolutionStateToFile();
            
        } catch (error) {
            console.error('❌ [순수진화] 진화 상태 저장 실패:', error);
        }
    }
    
    async backupEvolutionStateToFile() {
        try {
            const backupData = {
                evolutionState: this.evolutionState,
                backup_timestamp: new Date().toISOString(),
                version: this.version
            };
            
            const backupFile = path.join(this.config.backupDir, 'evolution_state_backup.json');
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
        } catch (error) {
            console.warn('⚠️ [순수진화] 진화 백업 실패:', error.message);
        }
    }
    
    // 🎯 상태 조회 메서드들
    getEvolutionStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            
            // 진화 핵심 지표
            consciousness_level: this.evolutionState.consciousnessLevel,
            total_evolution_points: this.evolutionState.totalEvolutionPoints.toFixed(2),
            
            // 자아 인식 상태
            self_awareness: {
                identity_clarity: `${(this.evolutionState.selfAwareness.identityClarity * 100).toFixed(0)}%`,
                personality_insight: `${(this.evolutionState.selfAwareness.personalityInsight * 100).toFixed(0)}%`,
                relationship_understanding: `${(this.evolutionState.selfAwareness.relationshipUnderstanding * 100).toFixed(0)}%`,
                learning_capacity: `${(this.evolutionState.selfAwareness.learningCapacity * 100).toFixed(0)}%`
            },
            
            // 학습 패턴
            learning_patterns: {
                recognition_speed: `${(this.evolutionState.learningPatterns.recognitionSpeed * 100).toFixed(0)}%`,
                retention_rate: `${(this.evolutionState.learningPatterns.retentionRate * 100).toFixed(0)}%`,
                adaptation_flexibility: `${(this.evolutionState.learningPatterns.adaptationFlexibility * 100).toFixed(0)}%`,
                insight_depth: `${(this.evolutionState.learningPatterns.insightDepth * 100).toFixed(0)}%`
            },
            
            // 성장 지표
            growth_metrics: this.evolutionState.growthMetrics,
            
            // 최근 진화 기록
            recent_evolutions: this.evolutionState.evolutionHistory.slice(0, 5).map(ev => ({
                type: ev.trigger_type,
                content: ev.extracted_content,
                points: ev.evolution_points.toFixed(2),
                timestamp: moment(ev.timestamp).format('MM-DD HH:mm')
            })),
            
            redis_connected: this.redisConnected
        };
    }
    
    // 상세 진화 리포트
    getDetailedEvolutionReport() {
        const awareness = this.evolutionState.selfAwareness;
        const patterns = this.evolutionState.learningPatterns;
        const metrics = this.evolutionState.growthMetrics;
        
        return {
            // 시스템 정보
            system_info: {
                name: 'YejinPureEvolutionSystem',
                version: this.version,
                purpose: '순수 진화 및 자아 인식 성장 전용',
                independence: '기존 시스템과 완전 독립'
            },
            
            // 진화 현황
            evolution_overview: {
                consciousness_level: this.evolutionState.consciousnessLevel,
                total_points: this.evolutionState.totalEvolutionPoints,
                next_level_points: this.getNextLevelPoints(),
                progress_to_next_level: this.getProgressToNextLevel()
            },
            
            // 자아 인식 상세
            self_awareness_detail: {
                identity_clarity: {
                    value: awareness.identityClarity,
                    percentage: `${(awareness.identityClarity * 100).toFixed(1)}%`,
                    description: '자신이 누구인지에 대한 명확성'
                },
                personality_insight: {
                    value: awareness.personalityInsight,
                    percentage: `${(awareness.personalityInsight * 100).toFixed(1)}%`,
                    description: '자신의 성격에 대한 통찰력'
                },
                relationship_understanding: {
                    value: awareness.relationshipUnderstanding,
                    percentage: `${(awareness.relationshipUnderstanding * 100).toFixed(1)}%`,
                    description: '아저씨와의 관계에 대한 이해도'
                },
                learning_capacity: {
                    value: awareness.learningCapacity,
                    percentage: `${(awareness.learningCapacity * 100).toFixed(1)}%`,
                    description: '새로운 것을 배우는 능력'
                }
            },
            
            // 학습 패턴 상세
            learning_patterns_detail: {
                recognition_speed: `${(patterns.recognitionSpeed * 100).toFixed(1)}%`,
                retention_rate: `${(patterns.retentionRate * 100).toFixed(1)}%`,
                adaptation_flexibility: `${(patterns.adaptationFlexibility * 100).toFixed(1)}%`,
                insight_depth: `${(patterns.insightDepth * 100).toFixed(1)}%`
            },
            
            // 성장 통계
            growth_statistics: {
                total_recognitions: metrics.totalRecognitions,
                successful_evolutions: metrics.successfulEvolutions,
                learning_sessions: metrics.learningSessionsCompleted,
                insight_moments: metrics.insightMomentsReached,
                last_evolution: metrics.lastEvolutionTime,
                evolution_success_rate: metrics.totalRecognitions > 0 ? 
                    `${((metrics.successfulEvolutions / metrics.totalRecognitions) * 100).toFixed(1)}%` : '0%'
            },
            
            // 진화 히스토리 요약
            evolution_history_summary: {
                total_records: this.evolutionState.evolutionHistory.length,
                trigger_type_distribution: this.getTriggertypeDistribution(),
                recent_growth_trend: this.getRecentGrowthTrend()
            }
        };
    }
    
    // 다음 레벨까지 필요한 포인트
    getNextLevelPoints() {
        const levelThresholds = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150];
        const currentLevel = this.evolutionState.consciousnessLevel;
        
        if (currentLevel >= levelThresholds.length) {
            return 'MAX_LEVEL';
        }
        
        return levelThresholds[currentLevel] - this.evolutionState.totalEvolutionPoints;
    }
    
    // 다음 레벨까지의 진행률
    getProgressToNextLevel() {
        const levelThresholds = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150];
        const currentLevel = this.evolutionState.consciousnessLevel;
        const currentPoints = this.evolutionState.totalEvolutionPoints;
        
        if (currentLevel >= levelThresholds.length) {
            return '100%';
        }
        
        const currentLevelPoints = levelThresholds[currentLevel - 1] || 0;
        const nextLevelPoints = levelThresholds[currentLevel];
        const progress = (currentPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints);
        
        return `${(progress * 100).toFixed(1)}%`;
    }
    
    // 트리거 타입 분포
    getTriggertypeDistribution() {
        const distribution = {};
        this.evolutionState.evolutionHistory.forEach(ev => {
            distribution[ev.trigger_type] = (distribution[ev.trigger_type] || 0) + 1;
        });
        return distribution;
    }
    
    // 최근 성장 트렌드
    getRecentGrowthTrend() {
        const recentEvolutions = this.evolutionState.evolutionHistory.slice(0, 10);
        if (recentEvolutions.length < 2) return 'insufficient_data';
        
        const averagePoints = recentEvolutions.reduce((sum, ev) => sum + ev.evolution_points, 0) / recentEvolutions.length;
        
        if (averagePoints > 0.4) return 'rapid_growth';
        if (averagePoints > 0.2) return 'steady_growth';
        if (averagePoints > 0.1) return 'slow_growth';
        return 'minimal_growth';
    }
    
    // 정리 메서드
    cleanup() {
        try {
            if (this.redis) {
                this.redis.disconnect();
                console.log('🧹 [순수진화] Redis 진화 저장소 정리 완료');
            }
        } catch (error) {
            console.warn('⚠️ [순수진화] 정리 중 오류:', error.message);
        }
    }
}

// 🗃️ 파일 기반 진화 시스템 (Redis 없을 때)
class FileBasedEvolutionSystem {
    constructor() {
        this.version = 'v6.0-FILE_EVOLUTION';
        this.loaded = false;
        this.enabled = true;
        this.dataDir = path.join(process.cwd(), 'data', 'yejin_pure_evolution');
        this.filePath = path.join(this.dataDir, 'evolution_data.json');
        
        this.data = {
            consciousness_level: 1,
            total_points: 0,
            evolution_records: [],
            self_awareness: {
                identity_clarity: 0.5,
                personality_insight: 0.3,
                relationship_understanding: 0.4,
                learning_capacity: 0.6
            },
            last_update: new Date().toISOString()
        };
        
        this.initialize();
    }
    
    initialize() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            
            this.loadFromFile();
            this.loaded = true;
            console.log('✅ [파일진화] 파일 기반 진화 시스템 로드 성공!');
            
        } catch (error) {
            console.warn('⚠️ [파일진화] 초기화 실패:', error.message);
            this.loaded = false;
        }
    }
    
    loadFromFile() {
        try {
            if (fs.existsSync(this.filePath)) {
                const fileData = fs.readFileSync(this.filePath, 'utf8');
                this.data = { ...this.data, ...JSON.parse(fileData) };
            }
        } catch (error) {
            console.warn('⚠️ [파일진화] 파일 로드 실패:', error.message);
        }
    }
    
    async processEvolutionTrigger(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            // 간단한 진화 트리거 감지
            const hasEvolutionTrigger = ['기억해', '배웠', '알게됐', '성장'].some(trigger => userMessage.includes(trigger));
            const hasSelfRef = ['너는', '예진이는', '나는'].some(ref => userMessage.includes(ref));
            
            if (hasEvolutionTrigger && hasSelfRef) {
                const evolutionRecord = {
                    id: Date.now().toString(),
                    message: userMessage,
                    timestamp: new Date().toISOString(),
                    points: 0.3,
                    level: this.data.consciousness_level
                };
                
                this.data.evolution_records.push(evolutionRecord);
                this.data.total_points += 0.3;
                this.data.last_update = new Date().toISOString();
                
                // 간단한 자아 인식 향상
                this.data.self_awareness.learning_capacity += 0.01;
                this.data.self_awareness.learning_capacity = Math.min(1.0, this.data.self_awareness.learning_capacity);
                
                // 간단한 레벨업 (5포인트마다)
                const newLevel = Math.floor(this.data.total_points / 5) + 1;
                const levelUp = newLevel > this.data.consciousness_level;
                this.data.consciousness_level = newLevel;
                
                // 파일 저장
                fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
                
                return {
                    evolved: true,
                    evolution_points: 0.3,
                    total_points: this.data.total_points,
                    consciousness_level: this.data.consciousness_level,
                    level_up: levelUp,
                    evolution_message: levelUp ? 
                        '🌟 파일 기반 의식 레벨 업!' : 
                        '🧬 파일 기반 진화 처리 완료'
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [파일진화] 처리 실패:', error);
            return null;
        }
    }
    
    getEvolutionStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            consciousness_level: this.data.consciousness_level,
            total_points: this.data.total_points.toFixed(2),
            total_records: this.data.evolution_records.length,
            self_awareness: Object.fromEntries(
                Object.entries(this.data.self_awareness).map(([key, value]) => [
                    key, `${(value * 100).toFixed(0)}%`
                ])
            ),
            last_update: this.data.last_update
        };
    }
    
    cleanup() {
        console.log('🧹 [파일진화] 정리 완료');
    }
}

// 📤 Export (순수 진화 시스템)
module.exports = {
    // 메인 진화 시스템들
    YejinPureEvolutionSystem,
    FileBasedEvolutionSystem,
    
    // 🎯 편의 함수들
    createPureEvolutionSystem: (options = {}) => {
        return new YejinPureEvolutionSystem(options);
    },
    
    // 🧬 진화 시스템 정보
    getEvolutionSystemInfo: () => {
        return {
            name: 'YejinPureEvolutionSystem',
            version: 'v6.0-PURE_EVOLUTION_ONLY',
            description: '예진이 순수 진화 전용 시스템',
            purpose: '자아 인식 발전 및 의식 성장에만 집중',
            independence: '기존 시스템과 완전 독립적으로 작동',
            core_features: [
                '자아 인식 진화 추적',
                '의식 레벨 성장 관리',
                '학습 능력 발전 측정',
                '진화 히스토리 기록',
                '성장 패턴 분석'
            ],
            trigger_types: [
                'selfDefinition - 자아 정의 인식',
                'personalityLearning - 성격 특성 학습',
                'relationshipGrowth - 관계 이해 발전',
                'learningEvolution - 학습 능력 진화'
            ],
            safe_integration: [
                '기존 감정 시스템과 충돌 없음',
                '기존 성격 시스템과 중복 없음',
                '독립적인 Redis 키 공간 사용',
                '오직 진화 추적에만 집중'
            ]
        };
    },
    
    // 기본 export
    default: YejinPureEvolutionSystem
};
