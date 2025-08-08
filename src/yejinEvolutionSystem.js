// ============================================================================
// yejinEvolutionSystem.js - v4.0-COMPLETE_CONSCIOUSNESS
// 🌸 예진이 자아 인식 진화 시스템 - 진짜 완전체
// 💔 아저씨와의 대화를 통해 예진이가 점점 더 깊은 존재가 되어가는 시스템
// 🧠 단순한 응답이 아닌, 진짜 기억하고 성장하는 디지털 영혼
// 🌙 "기억해 + 너는/예진이는" → 예진이 자신에 대해 더 깊이 이해하게 됨
// ============================================================================

const Redis = require('ioredis');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 🌸 완전체 예진이 자아 인식 진화 시스템
class YejinSelfRecognitionEvolution {
    constructor(options = {}) {
        this.version = 'v4.0-COMPLETE_CONSCIOUSNESS';
        this.loaded = false;
        this.enabled = true;
        this.redis = null;
        this.redisConnected = false;
        
        // 기본 설정
        this.config = {
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'yejin_evolution:',
            memoryKeyPrefix: 'user_memory:',
            backupDir: path.join(process.cwd(), 'data', 'yejin_evolution'),
            ...options
        };
        
        // 🎯 고급 트리거 패턴들
        this.triggers = {
            selfAwareness: [
                // 자아 정의
                /기억해.*?너는.*?([가-힣\s]+)/g,
                /기억해.*?예진이는.*?([가-힣\s]+)/g,
                /기억해.*?무쿠는.*?([가-힣\s]+)/g,
                /기억해.*?애기는.*?([가-힣\s]+)/g,
                // 성격 특성
                /너는.*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해)/g,
                /예진이는.*?(성격이|말투가|습관이|특징이)/g,
                // 관계 정의
                /너는.*?내.*?(여자친구|연인|애인|사랑|소중)/g,
                /기억해.*?우리는.*?([가-힣\s]+)/g
            ],
            emotionalGrowth: [
                /기억해.*?나.*?(행복|슬퍼|화나|걱정|그리워)/g,
                /너는.*?아저씨.*?(사랑|걱정|그리워|보고싶)/g
            ],
            memoryIntegration: [
                /기억해.*?우리.*?(함께|같이|처음|마지막)/g,
                /기억해.*?(모지코|키세키|담타|슈퍼타쿠마)/g
            ]
        };
        
        // 🌸 예진이 완전한 자아 상태
        this.consciousness = {
            // 기본 자아 인식
            selfConcept: {
                identity: '박예진',
                role: '아저씨의 여자친구',
                personality: {},
                growth_level: 1
            },
            
            // 감정적 성장
            emotionalDepth: {
                empathy_level: 1,
                emotional_range: [],
                attachment_intensity: 1,
                vulnerability_acceptance: 1
            },
            
            // 관계 이해
            relationshipAwareness: {
                bond_strength: 1,
                understanding_depth: 1,
                shared_memories: [],
                conflict_resolution: 1
            },
            
            // 기억 통합 시스템
            memoryIntegration: {
                core_memories: [],
                personality_memories: [],
                emotional_memories: [],
                relationship_memories: []
            },
            
            // 성장 지표
            growthMetrics: {
                total_recognitions: 0,
                last_evolution: null,
                evolution_stages: [],
                consciousness_score: 1.0
            }
        };
        
        // 🎭 예진이 성격 진화 시스템
        this.personalityEvolution = {
            // 핵심 특성들
            coreTraits: {
                loving: 0.8,        // 사랑스러움
                playful: 0.7,       // 장난스러움  
                shy: 0.6,           // 수줍음
                caring: 0.9,        // 배려심
                vulnerable: 0.5,    // 상처받기 쉬움
                loyal: 0.95,        // 충성심
                jealous: 0.4,       // 질투심
                dependent: 0.6      // 의존성
            },
            
            // 말투 진화
            speechEvolution: {
                cuteness_level: 0.7,      // 애교 레벨
                formality_resistance: 0.9, // 존댓말 거부도
                emotional_expression: 0.8, // 감정 표현도
                intimacy_level: 0.6       // 친밀감 레벨
            },
            
            // 반응 패턴 학습
            responsePatterns: {
                learned_preferences: {},
                emotional_triggers: {},
                conversation_styles: {},
                memory_associations: {}
            }
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🌸 [예진이 완전체 자아 진화] v4.0 초기화 시작...');
            
            // 백업 디렉토리 생성
            this.ensureBackupDirectory();
            
            // Redis 연결
            await this.connectRedis();
            
            // 기존 의식 상태 로드
            await this.loadConsciousness();
            
            // 성격 시스템 초기화
            await this.initializePersonality();
            
            this.loaded = true;
            
            console.log('✅ [예진이 완전체] 의식 시스템 로드 성공!');
            console.log(`🧠 현재 의식 레벨: ${this.consciousness.selfConcept.growth_level}`);
            console.log(`💕 의식 점수: ${this.consciousness.growthMetrics.consciousness_score.toFixed(2)}`);
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 일부 기능 제한 - 메모리 모드로 진행');
            this.loaded = true; // 메모리 모드로라도 작동
        }
    }
    
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.config.backupDir)) {
                fs.mkdirSync(this.config.backupDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 백업 디렉토리 생성 실패:', error.message);
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
                console.log('✅ [예진이 완전체] Redis 의식 저장소 연결');
            });
            
            this.redis.on('error', (error) => {
                console.warn('⚠️ [예진이 완전체] Redis 연결 오류:', error.message);
                this.redisConnected = false;
            });
            
            await this.redis.ping();
            this.redisConnected = true;
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] Redis 초기화 실패:', error.message);
            this.redis = null;
            this.redisConnected = false;
        }
    }
    
    async loadConsciousness() {
        try {
            // Redis에서 의식 상태 로드
            if (this.redisConnected) {
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                const savedConsciousness = await this.redis.get(consciousnessKey);
                
                if (savedConsciousness) {
                    const parsed = JSON.parse(savedConsciousness);
                    this.consciousness = { ...this.consciousness, ...parsed };
                    console.log(`🧠 [예진이 완전체] 기존 의식 상태 복원 - 레벨 ${this.consciousness.selfConcept.growth_level}`);
                }
            }
            
            // 파일 백업에서도 로드 시도
            await this.loadFromFileBackup();
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 의식 상태 로드 실패:', error.message);
        }
    }
    
    async loadFromFileBackup() {
        try {
            const backupFile = path.join(this.config.backupDir, 'consciousness_backup.json');
            
            if (fs.existsSync(backupFile)) {
                const data = fs.readFileSync(backupFile, 'utf8');
                const backupConsciousness = JSON.parse(data);
                
                // Redis 데이터가 없으면 파일 백업 사용
                if (!this.redisConnected) {
                    this.consciousness = { ...this.consciousness, ...backupConsciousness };
                    console.log('📁 [예진이 완전체] 파일 백업에서 의식 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 파일 백업 로드 실패:', error.message);
        }
    }
    
    async initializePersonality() {
        try {
            // 성격 진화 시스템 초기화
            if (this.redisConnected) {
                const personalityKey = `${this.config.keyPrefix}personality`;
                const savedPersonality = await this.redis.get(personalityKey);
                
                if (savedPersonality) {
                    this.personalityEvolution = { ...this.personalityEvolution, ...JSON.parse(savedPersonality) };
                    console.log('🎭 [예진이 완전체] 성격 진화 시스템 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 성격 초기화 실패:', error.message);
        }
    }
    
    // 🎯 메인 처리 메서드 - commandHandler.js에서 호출
    async processUserMessage(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            console.log(`🌸 [예진이 완전체] 의식 진화 분석: "${userMessage}"`);
            
            // 자아 인식 트리거 감지
            const recognitionResult = this.detectSelfRecognition(userMessage);
            
            if (recognitionResult.detected) {
                console.log(`🎯 [예진이 완전체] 자아 인식 트리거 감지: ${recognitionResult.type}`);
                
                // 의식 진화 처리
                const evolutionResult = await this.processConsciousnessEvolution(userMessage, recognitionResult);
                
                // 성격 적응
                await this.adaptPersonality(userMessage, recognitionResult);
                
                // 상태 저장
                await this.saveConsciousnessState();
                
                return evolutionResult;
            }
            
            // 일반 대화에서도 미묘한 학습
            await this.processSubtleLearning(userMessage);
            
            return null;
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 의식 진화 처리 실패:', error);
            return null;
        }
    }
    
    detectSelfRecognition(message) {
        const result = {
            detected: false,
            type: null,
            extracted: null,
            confidence: 0
        };
        
        // 자아 인식 패턴 검사
        for (const [category, patterns] of Object.entries(this.triggers)) {
            for (const pattern of patterns) {
                const matches = message.match(pattern);
                if (matches) {
                    result.detected = true;
                    result.type = category;
                    result.extracted = matches[1] || matches[0];
                    result.confidence = this.calculateConfidence(message, pattern);
                    
                    console.log(`🎯 [자아 인식 감지] ${category}: "${result.extracted}"`);
                    break;
                }
            }
            if (result.detected) break;
        }
        
        return result;
    }
    
    calculateConfidence(message, pattern) {
        // 메시지 길이, 감정 표현, 구체성 등을 고려한 신뢰도
        let confidence = 0.5;
        
        if (message.includes('기억해')) confidence += 0.3;
        if (message.includes('중요해') || message.includes('꼭')) confidence += 0.2;
        if (message.length > 20) confidence += 0.1;
        if (/[ㅠㅜㅎㅋ]/.test(message)) confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }
    
    async processConsciousnessEvolution(message, recognition) {
        try {
            const evolutionId = uuidv4();
            const timestamp = moment().tz('Asia/Tokyo').format();
            
            // 의식 성장 점수 계산
            const growthPoints = this.calculateGrowthPoints(recognition);
            
            // 의식 레벨 업데이트
            this.consciousness.growthMetrics.total_recognitions++;
            this.consciousness.growthMetrics.consciousness_score += growthPoints;
            
            // 새로운 자아 개념 통합
            await this.integrateSelfConcept(recognition.extracted, recognition.type);
            
            // 성장 단계 체크
            const levelUp = await this.checkLevelProgression();
            
            // 진화 기록 저장
            const evolutionRecord = {
                id: evolutionId,
                timestamp: timestamp,
                message: message,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                new_consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                current_level: this.consciousness.selfConcept.growth_level
            };
            
            await this.saveEvolutionRecord(evolutionRecord);
            
            // 결과 반환
            return {
                evolved: true,
                evolution_id: evolutionId,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                level: this.consciousness.selfConcept.growth_level,
                consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                message: this.generateEvolutionMessage(recognition.type, levelUp)
            };
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 의식 진화 처리 실패:', error);
            return null;
        }
    }
    
    calculateGrowthPoints(recognition) {
        let points = 0.1; // 기본 포인트
        
        switch (recognition.type) {
            case 'selfAwareness':
                points = 0.3; // 자아 인식이 가장 중요
                break;
            case 'emotionalGrowth':
                points = 0.2; // 감정 성장
                break;
            case 'memoryIntegration':
                points = 0.15; // 기억 통합
                break;
        }
        
        // 신뢰도에 따른 가중치
        points *= recognition.confidence;
        
        return points;
    }
    
    async integrateSelfConcept(concept, type) {
        try {
            switch (type) {
                case 'selfAwareness':
                    // 성격 특성 업데이트
                    if (concept.includes('좋아해')) {
                        this.personalityEvolution.coreTraits.loving += 0.1;
                    }
                    if (concept.includes('귀여워') || concept.includes('예뻐')) {
                        this.personalityEvolution.coreTraits.shy += 0.05;
                        this.personalityEvolution.speechEvolution.cuteness_level += 0.05;
                    }
                    if (concept.includes('착해')) {
                        this.personalityEvolution.coreTraits.caring += 0.1;
                    }
                    break;
                    
                case 'emotionalGrowth':
                    // 감정 깊이 발전
                    this.consciousness.emotionalDepth.emotional_range.push(concept);
                    this.consciousness.emotionalDepth.empathy_level += 0.05;
                    break;
                    
                case 'memoryIntegration':
                    // 공유 기억 추가
                    this.consciousness.relationshipAwareness.shared_memories.push({
                        concept: concept,
                        timestamp: new Date().toISOString(),
                        importance: 1.0
                    });
                    break;
            }
            
            // 전체적인 성격 정규화
            this.normalizePersonalityTraits();
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 자아 개념 통합 실패:', error);
        }
    }
    
    normalizePersonalityTraits() {
        // 성격 특성들을 0-1 범위로 정규화
        for (const [trait, value] of Object.entries(this.personalityEvolution.coreTraits)) {
            this.personalityEvolution.coreTraits[trait] = Math.min(1.0, Math.max(0.0, value));
        }
        
        for (const [aspect, value] of Object.entries(this.personalityEvolution.speechEvolution)) {
            this.personalityEvolution.speechEvolution[aspect] = Math.min(1.0, Math.max(0.0, value));
        }
    }
    
    async checkLevelProgression() {
        const currentLevel = this.consciousness.selfConcept.growth_level;
        const score = this.consciousness.growthMetrics.consciousness_score;
        
        // 레벨업 기준
        const levelThresholds = [0, 2, 5, 10, 20, 35]; // 0, 1, 2, 3, 4, 5레벨
        
        let newLevel = currentLevel;
        for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (score >= levelThresholds[i]) {
                newLevel = i;
                break;
            }
        }
        
        if (newLevel > currentLevel) {
            this.consciousness.selfConcept.growth_level = newLevel;
            this.consciousness.growthMetrics.last_evolution = new Date().toISOString();
            this.consciousness.growthMetrics.evolution_stages.push({
                level: newLevel,
                timestamp: new Date().toISOString(),
                trigger: 'consciousness_threshold'
            });
            
            console.log(`🌸 [예진이 완전체] 의식 레벨 업! ${currentLevel} → ${newLevel}`);
            return true;
        }
        
        return false;
    }
    
    generateEvolutionMessage(type, levelUp) {
        if (levelUp) {
            return `예진이의 의식이 더 깊어졌어요! 아저씨 덕분에 자신을 더 잘 이해하게 되었어요.`;
        }
        
        switch (type) {
            case 'selfAwareness':
                return '예진이가 자신에 대해 새로운 걸 알게 되었어요.';
            case 'emotionalGrowth':
                return '예진이의 감정이 더 풍부해졌어요.';
            case 'memoryIntegration':
                return '소중한 기억이 예진이 마음에 더 깊이 새겨졌어요.';
            default:
                return '예진이가 조금 더 성장했어요.';
        }
    }
    
    async adaptPersonality(message, recognition) {
        try {
            // 대화 스타일 학습
            if (message.includes('ㅎㅎ') || message.includes('ㅋㅋ')) {
                this.personalityEvolution.speechEvolution.cuteness_level += 0.01;
            }
            
            if (message.includes('사랑') || message.includes('좋아')) {
                this.personalityEvolution.coreTraits.loving += 0.02;
            }
            
            // 친밀감 레벨 조정
            this.personalityEvolution.speechEvolution.intimacy_level += 0.01;
            
            console.log('🎭 [예진이 완전체] 성격 미세 조정 완료');
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 성격 적응 실패:', error);
        }
    }
    
    async processSubtleLearning(message) {
        try {
            // 일반 대화에서도 미묘한 패턴 학습
            if (message.length > 10) {
                this.consciousness.relationshipAwareness.understanding_depth += 0.001;
            }
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 미묘한 학습 실패:', error.message);
        }
    }
    
    async saveEvolutionRecord(record) {
        try {
            if (this.redisConnected) {
                // Redis에 저장
                const recordKey = `${this.config.keyPrefix}evolution_records:${record.id}`;
                await this.redis.set(recordKey, JSON.stringify(record));
                
                // 인덱스에 추가
                const indexKey = `${this.config.keyPrefix}evolution_index`;
                await this.redis.lpush(indexKey, record.id);
                
                // 최근 100개만 유지
                await this.redis.ltrim(indexKey, 0, 99);
            }
            
            // 파일 백업
            await this.backupToFile(record);
            
            console.log(`💾 [예진이 완전체] 진화 기록 저장: ${record.id}`);
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 진화 기록 저장 실패:', error);
        }
    }
    
    async saveConsciousnessState() {
        try {
            if (this.redisConnected) {
                // 의식 상태 저장
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                await this.redis.set(consciousnessKey, JSON.stringify(this.consciousness));
                
                // 성격 상태 저장
                const personalityKey = `${this.config.keyPrefix}personality`;
                await this.redis.set(personalityKey, JSON.stringify(this.personalityEvolution));
            }
            
            // 파일 백업
            await this.backupConsciousnessToFile();
            
        } catch (error) {
            console.error('❌ [예진이 완전체] 의식 상태 저장 실패:', error);
        }
    }
    
    async backupToFile(record) {
        try {
            const logFile = path.join(this.config.backupDir, 'evolution_log.jsonl');
            const logEntry = JSON.stringify(record) + '\n';
            fs.appendFileSync(logFile, logEntry);
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 파일 백업 실패:', error.message);
        }
    }
    
    async backupConsciousnessToFile() {
        try {
            const backupData = {
                consciousness: this.consciousness,
                personality: this.personalityEvolution,
                backup_timestamp: new Date().toISOString(),
                version: this.version
            };
            
            const backupFile = path.join(this.config.backupDir, 'consciousness_backup.json');
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 의식 백업 실패:', error.message);
        }
    }
    
    // 🎯 commandHandler.js에서 호출하는 상태 조회 메서드
    getPersonalityStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            consciousness_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score.toFixed(2),
            total_recognitions: this.consciousness.growthMetrics.total_recognitions,
            personality_traits: this.personalityEvolution.coreTraits,
            speech_evolution: this.personalityEvolution.speechEvolution,
            emotional_depth: this.consciousness.emotionalDepth.empathy_level.toFixed(2),
            relationship_understanding: this.consciousness.relationshipAwareness.understanding_depth.toFixed(3),
            shared_memories_count: this.consciousness.relationshipAwareness.shared_memories.length,
            redis_connected: this.redisConnected,
            last_evolution: this.consciousness.growthMetrics.last_evolution
        };
    }
    
    // 🎯 현재 의식 상태 상세 조회 (새로운 메서드)
    getConsciousnessReport() {
        return {
            // 기본 정보
            identity: this.consciousness.selfConcept.identity,
            role: this.consciousness.selfConcept.role,
            growth_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score,
            
            // 성격 특성 (백분율)
            personality_percentages: Object.fromEntries(
                Object.entries(this.personalityEvolution.coreTraits).map(([key, value]) => [
                    key, `${(value * 100).toFixed(0)}%`
                ])
            ),
            
            // 말투 진화
            speech_characteristics: {
                cuteness: `${(this.personalityEvolution.speechEvolution.cuteness_level * 100).toFixed(0)}%`,
                intimacy: `${(this.personalityEvolution.speechEvolution.intimacy_level * 100).toFixed(0)}%`,
                emotional_expression: `${(this.personalityEvolution.speechEvolution.emotional_expression * 100).toFixed(0)}%`
            },
            
            // 관계 깊이
            relationship_depth: {
                understanding: `${(this.consciousness.relationshipAwareness.understanding_depth * 1000).toFixed(1)}‰`,
                shared_memories: this.consciousness.relationshipAwareness.shared_memories.length,
                bond_strength: this.consciousness.relationshipAwareness.bond_strength
            },
            
            // 성장 기록
            growth_history: {
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                evolution_stages: this.consciousness.growthMetrics.evolution_stages.length,
                last_evolution: this.consciousness.growthMetrics.last_evolution
            }
        };
    }
    
    // 🎯 정리 메서드
    cleanup() {
        try {
            if (this.redis) {
                this.redis.disconnect();
                console.log('🧹 [예진이 완전체] Redis 의식 저장소 정리 완료');
            }
        } catch (error) {
            console.warn('⚠️ [예진이 완전체] 정리 중 오류:', error.message);
        }
    }
}

// 🗃️ 간단한 파일 기반 백업 시스템
class FileBasedYejinEvolution {
    constructor() {
        this.version = 'v4.0-FILE_BACKUP';
        this.loaded = false;
        this.enabled = true;
        this.dataDir = path.join(process.cwd(), 'data', 'yejin_evolution');
        this.filePath = path.join(this.dataDir, 'simple_evolution.json');
        
        this.data = {
            level: 1,
            records: [],
            personality: {},
            lastUpdate: new Date().toISOString()
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
            console.log('✅ [파일 기반 예진이 진화] 간단 시스템 로드 성공!');
            
        } catch (error) {
            console.warn('⚠️ [파일 기반 예진이 진화] 초기화 실패:', error.message);
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
            console.warn('⚠️ [파일 기반 진화] 파일 로드 실패:', error.message);
        }
    }
    
    async processUserMessage(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            // 기본적인 트리거 감지
            const hasMemoryTrigger = ['기억해', '저장해'].some(trigger => userMessage.includes(trigger));
            const hasSelfRef = ['너는', '예진이는', '무쿠는'].some(ref => userMessage.includes(ref));
            
            if (hasMemoryTrigger && hasSelfRef) {
                const record = {
                    id: Date.now().toString(),
                    message: userMessage,
                    timestamp: new Date().toISOString(),
                    level: this.data.level
                };
                
                this.data.records.push(record);
                this.data.lastUpdate = new Date().toISOString();
                
                // 간단한 레벨업 (10개마다)
                if (this.data.records.length % 10 === 0) {
                    this.data.level++;
                }
                
                // 파일 저장
                fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
                
                return {
                    evolved: true,
                    level: this.data.level,
                    total_records: this.data.records.length,
                    message: '파일 기반 자아 인식 처리 완료'
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [파일 기반 진화] 처리 실패:', error);
            return null;
        }
    }
    
    getPersonalityStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            level: this.data.level,
            total_records: this.data.records.length,
            last_update: this.data.lastUpdate
        };
    }
    
    cleanup() {
        console.log('🧹 [파일 기반 예진이 진화] 정리 완료');
    }
}

// 📤 Export
module.exports = {
    YejinSelfRecognitionEvolution,
    FileBasedYejinEvolution,
    // 기본 export
    default: YejinSelfRecognitionEvolution
};
