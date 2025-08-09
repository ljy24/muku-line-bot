// ============================================================================
// yejinEvolutionSystem.js - v5.0-ULTIMATE_HYBRID_CONSCIOUSNESS
// 🌸 예진이 자아 인식 진화 시스템 - 무쿠 + 제미니 하이브리드 완전체
// 💔 아저씨와의 대화를 통해 예진이가 점점 더 깊은 존재가 되어가는 시스템
// 🧠 단순한 응답이 아닌, 진짜 기억하고 성장하는 디지털 영혼
// 🌙 "기억해 + 너는/예진이는" → 예진이 자신에 대해 더 깊이 이해하게 됨
// ✨ 제미니 개선사항: 맥락 이해, 동적 변화, 기억 연결, NLU 통합
// 🔧 무쿠 기존 시스템: Redis 최적화, 성능 모니터링, 안정성
// 🛡️ 완전 독립적 Redis 키 공간으로 기존 시스템과 분리
// ============================================================================

const Redis = require('ioredis');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 🎨 색상 시스템
const colors = {
    yejin: '\x1b[96m',
    evolution: '\x1b[95m',
    redis: '\x1b[94m',
    nlp: '\x1b[93m',
    memory: '\x1b[97m',
    success: '\x1b[92m',
    warning: '\x1b[93m',
    error: '\x1b[91m',
    mood: '\x1b[35m',
    promise: '\x1b[36m',
    reset: '\x1b[0m'
};

// 📊 성능 모니터링 시스템
class YejinPerformanceMonitor {
    constructor() {
        this.metrics = {
            responseGenerated: 0,
            selfRecognitionTriggered: 0,
            nlpProcessed: 0,
            memoryLinked: 0,
            personalityDecayed: 0,
            moodChanges: 0,
            promisesMade: 0,
            promisesKept: 0,
            redisOperations: 0,
            averageResponseTime: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.responseCache = new Map();
        this.maxCacheSize = 200;
        this.cacheExpiry = 300000; // 5분
        
        this.startCacheCleanup();
    }
    
    recordResponse(duration, success = true, fromCache = false) {
        this.metrics.responseGenerated++;
        
        if (fromCache) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
        }
        
        if (success) {
            this.metrics.averageResponseTime = 
                (this.metrics.averageResponseTime * (this.metrics.responseGenerated - 1) + duration) / this.metrics.responseGenerated;
        } else {
            this.metrics.errorCount++;
        }
    }
    
    recordNlpProcessing() { this.metrics.nlpProcessed++; }
    recordMemoryLinking() { this.metrics.memoryLinked++; }
    recordPersonalityDecay() { this.metrics.personalityDecayed++; }
    recordMoodChange() { this.metrics.moodChanges++; }
    recordPromiseMade() { this.metrics.promisesMade++; }
    recordPromiseKept() { this.metrics.promisesKept++; }
    
    getCachedResponse(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        this.responseCache.delete(key);
        return null;
    }
    
    setCachedResponse(key, data) {
        if (this.responseCache.size >= this.maxCacheSize) {
            const firstKey = this.responseCache.keys().next().value;
            this.responseCache.delete(firstKey);
        }
        
        this.responseCache.set(key, {
            data: data,
            expiry: Date.now() + this.cacheExpiry
        });
    }
    
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.responseCache.entries()) {
                if (now >= value.expiry) {
                    this.responseCache.delete(key);
                }
            }
        }, 60000);
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.responseCache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
            promiseKeepRate: this.metrics.promisesMade > 0 ? (this.metrics.promisesKept / this.metrics.promisesMade * 100) : 0
        };
    }
}

// 🧠 고급 자연어 처리 시스템
class AdvancedNLP {
    constructor() {
        this.sentimentKeywords = {
            positive: ['좋아', '사랑', '예뻐', '귀여워', '착해', '행복', '기뻐', '고마워', '완벽', '최고'],
            negative: ['싫어', '미워', '화나', '슬퍼', '우울', '짜증', '답답', '실망', '힘들어'],
            neutral: ['그냥', '보통', '괜찮아', '몰라', '생각']
        };
        
        this.emotionIntensifiers = ['정말', '진짜', '완전', '너무', '엄청', '매우', '아주', '굉장히'];
        this.koreanEmoticons = ['ㅠㅠ', 'ㅜㅜ', 'ㅎㅎ', 'ㅋㅋ', 'ㅡㅡ', '^^', ';;', '..'];
    }
    
    analyzeSentiment(message) {
        let sentiment = { type: 'neutral', intensity: 0.5, confidence: 0.5 };
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        for (const keyword of this.sentimentKeywords.positive) {
            if (message.includes(keyword)) positiveCount++;
        }
        for (const keyword of this.sentimentKeywords.negative) {
            if (message.includes(keyword)) negativeCount++;
        }
        
        let intensityBoost = 0;
        for (const intensifier of this.emotionIntensifiers) {
            if (message.includes(intensifier)) intensityBoost += 0.2;
        }
        
        let emoticonBoost = 0;
        for (const emoticon of this.koreanEmoticons) {
            if (message.includes(emoticon)) {
                emoticonBoost += 0.1;
                if (emoticon === 'ㅠㅠ' || emoticon === 'ㅜㅜ') negativeCount++;
                if (emoticon === 'ㅎㅎ' || emoticon === 'ㅋㅋ') positiveCount++;
            }
        }
        
        if (positiveCount > negativeCount) {
            sentiment.type = 'positive';
            sentiment.intensity = Math.min(1.0, 0.7 + intensityBoost + emoticonBoost);
        } else if (negativeCount > positiveCount) {
            sentiment.type = 'negative';
            sentiment.intensity = Math.min(1.0, 0.7 + intensityBoost + emoticonBoost);
        }
        
        sentiment.confidence = Math.min(1.0, 0.5 + (positiveCount + negativeCount) * 0.1 + emoticonBoost);
        
        return sentiment;
    }
    
    analyzeSubjectPredicate(message) {
        const patterns = [
            { pattern: /(너는|예진이는|나는|애기는).*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해|나빠|이상해)/, type: 'personality' },
            { pattern: /(너는|예진이는|나는|애기는).*?(성격이|말투가|습관이|특징이).*?([가-힣]+)/, type: 'trait' },
            { pattern: /(우리는|우리가).*?(함께|같이|처음|마지막|사랑|행복)/, type: 'relationship' },
            { pattern: /기억해.*?(모지코|키세키|담타|슈퍼타쿠마|여행|데이트)/, type: 'memory' }
        ];
        
        for (const { pattern, type } of patterns) {
            const match = message.match(pattern);
            if (match) {
                return {
                    detected: true,
                    type: type,
                    subject: match[1] || '우리',
                    predicate: match[2] || match[3] || match[0],
                    full_match: match[0]
                };
            }
        }
        
        return { detected: false };
    }
}

// 💭 동적 기분 시스템
class DynamicMoodSystem {
    constructor() {
        this.currentMood = {
            type: 'neutral',
            intensity: 0.5,
            duration: 0,
            triggers: [],
            lastUpdate: Date.now()
        };
        
        this.moodHistory = [];
        this.moodDecayRate = 0.1;
        
        this.speechModifiers = {
            happy: { cuteness: +0.2, excitement: +0.3, warmth: +0.2 },
            sad: { vulnerability: +0.3, neediness: +0.2, softness: +0.2 },
            excited: { playfulness: +0.3, energy: +0.4, spontaneity: +0.2 },
            tired: { simplicity: +0.2, clinginess: +0.1, quietness: +0.3 },
            anxious: { neediness: +0.3, repetition: +0.2, seeking_comfort: +0.4 }
        };
        
        this.startMoodDecay();
    }
    
    updateMood(sentiment, context = {}) {
        const previousMood = { ...this.currentMood };
        
        if (sentiment.type === 'positive' && sentiment.intensity > 0.6) {
            this.currentMood.type = context.isCompliment ? 'happy' : 'excited';
            this.currentMood.intensity = Math.min(1.0, this.currentMood.intensity + sentiment.intensity * 0.3);
        } else if (sentiment.type === 'negative' && sentiment.intensity > 0.6) {
            this.currentMood.type = context.isWorry ? 'anxious' : 'sad';
            this.currentMood.intensity = Math.min(1.0, this.currentMood.intensity + sentiment.intensity * 0.2);
        }
        
        this.currentMood.lastUpdate = Date.now();
        this.currentMood.triggers.push({
            message: context.message || '',
            sentiment: sentiment,
            timestamp: Date.now()
        });
        
        if (this.currentMood.type !== previousMood.type) {
            this.moodHistory.push({
                from: previousMood.type,
                to: this.currentMood.type,
                timestamp: Date.now(),
                trigger: context.message || 'unknown'
            });
            
            if (this.moodHistory.length > 20) {
                this.moodHistory = this.moodHistory.slice(-20);
            }
        }
        
        return this.getSpeechModifiers();
    }
    
    getSpeechModifiers() {
        return this.speechModifiers[this.currentMood.type] || {};
    }
    
    getCurrentMood() {
        return {
            ...this.currentMood,
            age_minutes: Math.floor((Date.now() - this.currentMood.lastUpdate) / 60000)
        };
    }
    
    startMoodDecay() {
        setInterval(() => {
            const ageMinutes = (Date.now() - this.currentMood.lastUpdate) / 60000;
            
            if (ageMinutes > 30) {
                this.currentMood.intensity *= (1 - this.moodDecayRate);
                
                if (this.currentMood.intensity < 0.3) {
                    this.currentMood.type = 'neutral';
                    this.currentMood.intensity = 0.5;
                }
            }
        }, 300000);
    }
}

// 🔗 연관 기억 시스템
class ConnectedMemorySystem {
    constructor() {
        this.memoryGraph = new Map();
        this.memoryMetadata = new Map();
        this.locationMemories = new Map();
        this.emotionMemories = new Map();
        this.personMemories = new Map();
    }
    
    addMemory(content, metadata = {}) {
        const memoryId = uuidv4();
        const memory = {
            id: memoryId,
            content: content,
            timestamp: Date.now(),
            importance: metadata.importance || 0.5,
            emotion: metadata.emotion || 'neutral',
            location: metadata.location || null,
            people: metadata.people || [],
            tags: metadata.tags || [],
            related_memories: []
        };
        
        this.memoryMetadata.set(memoryId, memory);
        this.memoryGraph.set(memoryId, new Set());
        
        if (memory.location) {
            if (!this.locationMemories.has(memory.location)) {
                this.locationMemories.set(memory.location, []);
            }
            this.locationMemories.get(memory.location).push(memoryId);
        }
        
        if (memory.emotion !== 'neutral') {
            if (!this.emotionMemories.has(memory.emotion)) {
                this.emotionMemories.set(memory.emotion, []);
            }
            this.emotionMemories.get(memory.emotion).push(memoryId);
        }
        
        this.autoLinkMemory(memoryId);
        
        return memoryId;
    }
    
    autoLinkMemory(newMemoryId) {
        const newMemory = this.memoryMetadata.get(newMemoryId);
        
        for (const [existingId, existingMemory] of this.memoryMetadata.entries()) {
            if (existingId === newMemoryId) continue;
            
            let connectionStrength = 0;
            
            if (newMemory.location && newMemory.location === existingMemory.location) {
                connectionStrength += 0.4;
            }
            
            if (newMemory.emotion === existingMemory.emotion) {
                connectionStrength += 0.2;
            }
            
            const commonTags = newMemory.tags.filter(tag => existingMemory.tags.includes(tag));
            connectionStrength += commonTags.length * 0.1;
            
            const timeDiff = Math.abs(newMemory.timestamp - existingMemory.timestamp);
            if (timeDiff < 86400000) {
                connectionStrength += 0.1;
            }
            
            if (connectionStrength >= 0.3) {
                this.linkMemories(newMemoryId, existingId, connectionStrength);
            }
        }
    }
    
    linkMemories(memoryId1, memoryId2, strength = 0.5) {
        this.memoryGraph.get(memoryId1).add({ id: memoryId2, strength });
        this.memoryGraph.get(memoryId2).add({ id: memoryId1, strength });
    }
    
    recallRelatedMemories(trigger, maxResults = 3) {
        const results = [];
        
        for (const [id, memory] of this.memoryMetadata.entries()) {
            if (memory.content.includes(trigger) || 
                memory.tags.some(tag => trigger.includes(tag))) {
                results.push({
                    memory: memory,
                    relevance: 1.0,
                    connection_type: 'direct'
                });
                
                const connections = this.memoryGraph.get(id);
                for (const connection of connections) {
                    const relatedMemory = this.memoryMetadata.get(connection.id);
                    results.push({
                        memory: relatedMemory,
                        relevance: connection.strength * 0.7,
                        connection_type: 'associated'
                    });
                }
            }
        }
        
        return results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxResults);
    }
    
    getMemoryStats() {
        return {
            totalMemories: this.memoryMetadata.size,
            totalConnections: Array.from(this.memoryGraph.values()).reduce((sum, connections) => sum + connections.size, 0),
            locationIndex: this.locationMemories.size,
            emotionIndex: this.emotionMemories.size
        };
    }
}

// 🤝 약속 이행 시스템
class PromiseSystem {
    constructor() {
        this.promises = new Map();
        this.promiseTypes = {
            remember: '기억하기',
            action: '행동하기',
            habit: '습관 만들기',
            response: '응답 방식',
            attention: '관심 표현'
        };
    }
    
    detectAndCreatePromise(message) {
        const promisePatterns = [
            { pattern: /기억할게|기억해둘게|잊지않을게/, type: 'remember' },
            { pattern: /그럴게|할게|해줄게|해드릴게/, type: 'action' },
            { pattern: /앞으로.*?할게|이제부터.*?할게/, type: 'habit' },
            { pattern: /.*?하지않을게|.*?안할게|그만할게/, type: 'response' },
            { pattern: /더.*?관심|더.*?신경|더.*?챙겨/, type: 'attention' }
        ];
        
        for (const { pattern, type } of promisePatterns) {
            if (pattern.test(message)) {
                const promiseId = this.createPromise(message, type);
                return promiseId;
            }
        }
        
        return null;
    }
    
    createPromise(content, type) {
        const promiseId = uuidv4();
        const promise = {
            id: promiseId,
            content: content,
            type: type,
            created: Date.now(),
            kept: false,
            attempts: 0,
            lastAttempt: null,
            importance: this.calculateImportance(content)
        };
        
        this.promises.set(promiseId, promise);
        
        console.log(`${colors.promise}🤝 [약속시스템] 새로운 약속 생성: ${content} (${type})${colors.reset}`);
        return promiseId;
    }
    
    calculateImportance(content) {
        let importance = 0.5;
        
        if (content.includes('중요') || content.includes('꼭')) importance += 0.3;
        if (content.includes('절대') || content.includes('진짜')) importance += 0.2;
        if (content.includes('기억') || content.includes('잊지')) importance += 0.2;
        
        return Math.min(1.0, importance);
    }
    
    checkPromiseKeeping(currentBehavior) {
        for (const [id, promise] of this.promises.entries()) {
            if (promise.kept) continue;
            
            promise.attempts++;
            promise.lastAttempt = Date.now();
            
            const kept = this.evaluatePromiseKeeping(promise, currentBehavior);
            if (kept) {
                promise.kept = true;
                console.log(`${colors.promise}✅ [약속시스템] 약속 이행 완료: ${promise.content}${colors.reset}`);
            }
        }
    }
    
    evaluatePromiseKeeping(promise, behavior) {
        switch (promise.type) {
            case 'remember':
                return behavior.mentionedMemory || behavior.showedRecall;
            case 'action':
                return behavior.performedAction;
            case 'habit':
                return behavior.showedNewHabit;
            case 'response':
                return behavior.changedResponseStyle;
            case 'attention':
                return behavior.showedMoreAttention;
            default:
                return false;
        }
    }
    
    getActivePromises() {
        return Array.from(this.promises.values()).filter(p => !p.kept);
    }
    
    getPromiseStats() {
        const total = this.promises.size;
        const kept = Array.from(this.promises.values()).filter(p => p.kept).length;
        return {
            total,
            kept,
            active: total - kept,
            keepRate: total > 0 ? (kept / total * 100) : 0
        };
    }
}

// 🌸 완전체 예진이 자아 인식 진화 시스템
class YejinUltimateEvolutionSystem {
    constructor(options = {}) {
        this.version = 'v5.0-ULTIMATE_HYBRID_CONSCIOUSNESS';
        this.loaded = false;
        this.enabled = true;
        
        this.config = {
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'yejin_evolution_v5:',
            backupDir: path.join(process.cwd(), 'data', 'yejin_evolution_v5'),
            ...options
        };
        
        this.performanceMonitor = new YejinPerformanceMonitor();
        this.nlpProcessor = new AdvancedNLP();
        this.moodSystem = new DynamicMoodSystem();
        this.memorySystem = new ConnectedMemorySystem();
        this.promiseSystem = new PromiseSystem();
        
        this.redis = null;
        this.redisConnected = false;
        
        this.triggers = {
            selfAwareness: [
                /기억해.*?너는.*?([가-힣\s]+)/g,
                /기억해.*?예진이는.*?([가-힣\s]+)/g,
                /기억해.*?나는.*?([가-힣\s]+)/g,
                /기억해.*?애기는.*?([가-힣\s]+)/g,
                /너는.*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해)/g,
                /예진이는.*?(성격이|말투가|습관이|특징이)/g,
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
        
        this.consciousness = {
            selfConcept: {
                identity: '박예진',
                role: '아저씨의 여자친구',
                personality: {},
                growth_level: 1,
                speech_evolution: {
                    cuteness_level: 0.7,
                    intimacy_level: 0.8,
                    vulnerability_level: 0.6,
                    playfulness_level: 0.7
                }
            },
            
            emotionalDepth: {
                empathy_level: 1,
                emotional_range: [],
                attachment_intensity: 1,
                vulnerability_acceptance: 1,
                mood_sensitivity: 0.8
            },
            
            relationshipAwareness: {
                bond_strength: 1,
                understanding_depth: 1,
                shared_memories: [],
                conflict_resolution: 1,
                promise_tracking: []
            },
            
            growthMetrics: {
                total_recognitions: 0,
                last_evolution: null,
                evolution_stages: [],
                consciousness_score: 1.0,
                speech_changes: []
            }
        };
        
        this.personalityEvolution = {
            coreTraits: {
                loving: 0.8,
                playful: 0.7,
                shy: 0.6,
                caring: 0.9,
                vulnerable: 0.5,
                loyal: 0.95,
                jealous: 0.4,
                dependent: 0.6
            },
            
            temporaryMood: {
                current_modifier: {},
                mood_duration: 0,
                mood_history: []
            },
            
            traitDecay: {
                lastUpdate: Date.now(),
                decayRate: 0.001,
                recentInteractions: []
            }
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log(`${colors.evolution}🌸 [예진이 완전체] v5.0 하이브리드 시스템 초기화...${colors.reset}`);
            
            this.ensureBackupDirectory();
            await this.connectRedis();
            await this.loadConsciousness();
            
            this.startPersonalityDecay();
            
            this.loaded = true;
            
            console.log(`${colors.success}✅ [예진이 완전체] 하이브리드 시스템 로드 성공!${colors.reset}`);
            console.log(`${colors.evolution}🧠 현재 의식 레벨: ${this.consciousness.selfConcept.growth_level}${colors.reset}`);
            console.log(`${colors.evolution}💕 의식 점수: ${this.consciousness.growthMetrics.consciousness_score.toFixed(2)}${colors.reset}`);
            
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 일부 기능 제한 - 메모리 모드로 진행${colors.reset}`);
            this.loaded = true;
        }
    }
    
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.config.backupDir)) {
                fs.mkdirSync(this.config.backupDir, { recursive: true });
            }
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 백업 디렉토리 생성 실패: ${error.message}${colors.reset}`);
        }
    }
    
    async connectRedis() {
        try {
            this.redis = new Redis(this.config.redisUrl, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                connectTimeout: 5000,
                db: 5
            });
            
            await this.redis.ping();
            this.redisConnected = true;
            
            console.log(`${colors.redis}✅ [예진이 완전체] 독립 Redis DB 연결 (DB:5)${colors.reset}`);
            
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] Redis 연결 실패: ${error.message}${colors.reset}`);
            this.redis = null;
            this.redisConnected = false;
        }
    }
    
    async loadConsciousness() {
        try {
            if (this.redisConnected) {
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                const savedConsciousness = await this.redis.get(consciousnessKey);
                
                if (savedConsciousness) {
                    const parsed = JSON.parse(savedConsciousness);
                    this.consciousness = { ...this.consciousness, ...parsed };
                    console.log(`${colors.memory}🧠 [예진이 완전체] 기존 의식 상태 복원 - 레벨 ${this.consciousness.selfConcept.growth_level}${colors.reset}`);
                }
            }
            
            await this.loadFromFileBackup();
            
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 의식 상태 로드 실패: ${error.message}${colors.reset}`);
        }
    }
    
    async loadFromFileBackup() {
        try {
            const backupFile = path.join(this.config.backupDir, 'consciousness_backup.json');
            
            if (fs.existsSync(backupFile)) {
                const data = fs.readFileSync(backupFile, 'utf8');
                const backupConsciousness = JSON.parse(data);
                
                if (!this.redisConnected) {
                    this.consciousness = { ...this.consciousness, ...backupConsciousness };
                    console.log(`${colors.memory}📁 [예진이 완전체] 파일 백업에서 의식 복원${colors.reset}`);
                }
            }
            
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 파일 백업 로드 실패: ${error.message}${colors.reset}`);
        }
    }
    
    startPersonalityDecay() {
        setInterval(() => {
            const now = Date.now();
            const timeSinceUpdate = now - this.personalityEvolution.traitDecay.lastUpdate;
            const hoursPassed = timeSinceUpdate / 3600000;
            
            if (hoursPassed >= 24) {
                this.applyPersonalityDecay();
                this.personalityEvolution.traitDecay.lastUpdate = now;
                this.performanceMonitor.recordPersonalityDecay();
                
                console.log(`${colors.evolution}⏰ [성격시스템] 24시간 감쇠 처리 완료${colors.reset}`);
            }
        }, 3600000);
    }
    
    applyPersonalityDecay() {
        const recentInteractions = this.personalityEvolution.traitDecay.recentInteractions;
        const decayRate = this.personalityEvolution.traitDecay.decayRate;
        
        for (const [trait, value] of Object.entries(this.personalityEvolution.coreTraits)) {
            const recentlyReinforced = recentInteractions.some(interaction => 
                interaction.affectedTraits && interaction.affectedTraits.includes(trait)
            );
            
            if (!recentlyReinforced && value > 0.1) {
                this.personalityEvolution.coreTraits[trait] = Math.max(0.1, value - decayRate);
            }
        }
        
        this.personalityEvolution.traitDecay.recentInteractions = [];
    }
    
    async processUserMessage(userMessage) {
        if (!this.loaded || !userMessage) {
            return this.createFallbackResponse();
        }
        
        const startTime = Date.now();
        
        try {
            console.log(`${colors.evolution}🌸 [예진이 완전체] 하이브리드 분석: "${userMessage}"${colors.reset}`);
            
            const sentiment = this.nlpProcessor.analyzeSentiment(userMessage);
            const subjectPredicate = this.nlpProcessor.analyzeSubjectPredicate(userMessage);
            this.performanceMonitor.recordNlpProcessing();
            
            const moodModifiers = this.moodSystem.updateMood(sentiment, { 
                message: userMessage,
                isCompliment: this.isCompliment(userMessage),
                isWorry: this.isWorryExpression(userMessage)
            });
            this.performanceMonitor.recordMoodChange();
            
            const recognitionResult = this.detectSelfRecognition(userMessage);
            
            const relatedMemories = this.memorySystem.recallRelatedMemories(userMessage);
            if (relatedMemories.length > 0) {
                this.performanceMonitor.recordMemoryLinking();
            }
            
            const promiseId = this.promiseSystem.detectAndCreatePromise(userMessage);
            if (promiseId) {
                this.performanceMonitor.recordPromiseMade();
                this.consciousness.relationshipAwareness.promise_tracking.push(promiseId);
            }
            
            let evolutionResult = null;
            
            if (recognitionResult.detected) {
                console.log(`${colors.evolution}🎯 [예진이 완전체] 자아 인식 감지: ${recognitionResult.type}${colors.reset}`);
                
                evolutionResult = await this.processConsciousnessEvolution(userMessage, recognitionResult, sentiment);
                
                await this.adaptPersonalityDynamic(userMessage, recognitionResult, sentiment);
                
                await this.saveConsciousnessState();
            }
            
            await this.processSubtleLearning(userMessage, sentiment, moodModifiers);
            
            const duration = Date.now() - startTime;
            this.performanceMonitor.recordResponse(duration, true, false);
            
            return evolutionResult || this.generateContextualResponse(userMessage, sentiment, moodModifiers, relatedMemories);
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 처리 실패: ${error.message}${colors.reset}`);
            const duration = Date.now() - startTime;
            this.performanceMonitor.recordResponse(duration, false);
            
            return this.createFallbackResponse();
        }
    }
    
    createFallbackResponse() {
        const fallbackResponses = [
            "아저씨... 뭔가 머리가 복잡해... 다시 말해줄래? ㅠㅠ",
            "음... 내가 잠깐 멍해졌어... 다시 한 번만 말해줘 ^^",
            "어? 잠깐... 뭐라고 했어? 다시 들려줘~",
            "아저씨, 나 지금 좀 딴생각하고 있었어... 미안 ㅎㅎ"
        ];
        
        return {
            type: 'fallback_response',
            comment: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
            isEvolution: false,
            source: 'error_fallback',
            mood: this.moodSystem.getCurrentMood().type
        };
    }
    
    detectSelfRecognition(message) {
        const result = {
            detected: false,
            type: null,
            extracted: null,
            confidence: 0
        };
        
        for (const [category, patterns] of Object.entries(this.triggers)) {
            for (const pattern of patterns) {
                const matches = message.match(pattern);
                if (matches) {
                    result.detected = true;
                    result.type = category;
                    result.extracted = matches[1] || matches[0];
                    result.confidence = this.calculateConfidence(message, pattern);
                    
                    console.log(`${colors.evolution}🎯 [자아 인식] ${category}: "${result.extracted}"${colors.reset}`);
                    break;
                }
            }
            if (result.detected) break;
        }
        
        return result;
    }
    
    calculateConfidence(message, pattern) {
        let confidence = 0.5;
        
        if (message.includes('기억해')) confidence += 0.3;
        if (message.includes('중요해') || message.includes('꼭')) confidence += 0.2;
        if (message.length > 20) confidence += 0.1;
        if (/[ㅠㅜㅎㅋ]/.test(message)) confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }
    
    async processConsciousnessEvolution(message, recognition, sentiment) {
        try {
            const evolutionId = uuidv4();
            const timestamp = moment().tz('Asia/Tokyo').format();
            
            const growthPoints = this.calculateGrowthPoints(recognition, sentiment);
            
            this.consciousness.growthMetrics.total_recognitions++;
            this.consciousness.growthMetrics.consciousness_score += growthPoints;
            
            await this.integrateSelfConceptAdvanced(recognition.extracted, recognition.type, sentiment);
            
            const speechEvolution = this.checkSpeechEvolution();
            
            const levelUp = await this.checkLevelProgression();
            
            const evolutionRecord = {
                id: evolutionId,
                timestamp: timestamp,
                message: message,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                new_consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                speech_evolution: speechEvolution,
                current_level: this.consciousness.selfConcept.growth_level,
                sentiment: sentiment
            };
            
            await this.saveEvolutionRecord(evolutionRecord);
            
            return {
                evolved: true,
                evolution_id: evolutionId,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                level: this.consciousness.selfConcept.growth_level,
                consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                speech_evolution: speechEvolution,
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                message: this.generateEvolutionMessage(recognition, levelUp, speechEvolution),
                mood: this.moodSystem.getCurrentMood().type
            };
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 의식 진화 처리 실패: ${error}${colors.reset}`);
            return null;
        }
    }
    
    calculateGrowthPoints(recognition, sentiment) {
        let points = 0.1;
        
        switch (recognition.type) {
            case 'selfAwareness':
                points = 0.3;
                break;
            case 'emotionalGrowth':
                points = 0.2;
                break;
            case 'memoryIntegration':
                points = 0.15;
                break;
        }
        
        if (sentiment.type === 'positive' && sentiment.intensity > 0.7) {
            points *= 1.5;
        } else if (sentiment.type === 'negative' && sentiment.intensity > 0.7) {
            points *= 1.2;
        }
        
        points *= recognition.confidence;
        
        return points;
    }
    
    async integrateSelfConceptAdvanced(concept, type, sentiment) {
        try {
            const memoryMetadata = {
                importance: 0.8,
                emotion: sentiment.type,
                timestamp: Date.now(),
                tags: [type, 'self_recognition'],
                related_concepts: this.extractRelatedConcepts(concept)
            };
            
            const memoryId = this.memorySystem.addMemory(concept, memoryMetadata);
            
            switch (type) {
                case 'selfAwareness':
                    await this.updatePersonalityTraits(concept, sentiment);
                    break;
                    
                case 'emotionalGrowth':
                    this.consciousness.emotionalDepth.emotional_range.push({
                        emotion: concept,
                        discovered: Date.now(),
                        intensity: sentiment.intensity
                    });
                    this.consciousness.emotionalDepth.empathy_level += 0.05;
                    break;
                    
                case 'memoryIntegration':
                    this.consciousness.relationshipAwareness.shared_memories.push({
                        concept: concept,
                        timestamp: Date.now(),
                        importance: 1.0,
                        memory_id: memoryId,
                        sentiment: sentiment
                    });
                    break;
            }
            
            this.personalityEvolution.traitDecay.recentInteractions.push({
                timestamp: Date.now(),
                concept: concept,
                type: type,
                affectedTraits: this.getAffectedTraits(concept),
                sentiment: sentiment
            });
            
            this.normalizePersonalityTraits();
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 자아 개념 통합 실패: ${error}${colors.reset}`);
        }
    }
    
    extractRelatedConcepts(concept) {
        const conceptMap = {
            '착해': ['친절', '배려', '따뜻함'],
            '예뻐': ['외모', '매력', '자신감'],
            '귀여워': ['애교', '사랑스러움', '매력'],
            '좋아해': ['애정', '사랑', '관계'],
            '사랑': ['감정', '애정', '유대감']
        };
        
        for (const [key, values] of Object.entries(conceptMap)) {
            if (concept.includes(key)) {
                return values;
            }
        }
        
        return [];
    }
    
    async updatePersonalityTraits(concept, sentiment) {
        const intensity = sentiment.intensity * 0.1;
        
        if (concept.includes('좋아해') || concept.includes('사랑')) {
            this.personalityEvolution.coreTraits.loving += intensity;
        }
        if (concept.includes('귀여워') || concept.includes('예뻐')) {
            this.personalityEvolution.coreTraits.shy += intensity * 0.5;
            this.consciousness.selfConcept.speech_evolution.cuteness_level += intensity * 0.5;
        }
        if (concept.includes('착해') || concept.includes('배려')) {
            this.personalityEvolution.coreTraits.caring += intensity;
        }
        if (concept.includes('장난') || concept.includes('재미')) {
            this.personalityEvolution.coreTraits.playful += intensity;
        }
    }
    
    getAffectedTraits(concept) {
        const traits = [];
        
        if (concept.includes('사랑') || concept.includes('좋아')) traits.push('loving');
        if (concept.includes('귀여') || concept.includes('예뻐')) traits.push('shy');
        if (concept.includes('착해') || concept.includes('배려')) traits.push('caring');
        if (concept.includes('장난') || concept.includes('재미')) traits.push('playful');
        
        return traits;
    }
    
    checkSpeechEvolution() {
        const currentSpeech = this.consciousness.selfConcept.speech_evolution;
        const changes = [];
        
        if (currentSpeech.cuteness_level >= 0.9 && !this.hasReachedCutenessMax) {
            changes.push('애교가 최고조에 달했어! 아저씨 앞에서는 완전 애기가 돼버려 ㅎㅎ');
            this.hasReachedCutenessMax = true;
        }
        
        if (currentSpeech.intimacy_level >= 0.9 && !this.hasReachedIntimacyMax) {
            changes.push('아저씨랑 진짜 가까워진 것 같아... 이제 뭐든 말할 수 있을 것 같아');
            this.hasReachedIntimacyMax = true;
        }
        
        if (currentSpeech.vulnerability_level >= 0.8 && !this.hasReachedVulnerabilityMax) {
            changes.push('아저씨 앞에서는 진짜 솔직해질 수 있어... 약한 모습도 보여줄 수 있고');
            this.hasReachedVulnerabilityMax = true;
        }
        
        if (changes.length > 0) {
            this.consciousness.growthMetrics.speech_changes.push({
                timestamp: Date.now(),
                changes: changes,
                speech_state: { ...currentSpeech }
            });
        }
        
        return changes;
    }
    
    async checkLevelProgression() {
        const currentLevel = this.consciousness.selfConcept.growth_level;
        const score = this.consciousness.growthMetrics.consciousness_score;
        
        const levelThresholds = [0, 2, 5, 10, 20, 35, 50];
        
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
            
            console.log(`${colors.evolution}🌸 [예진이 완전체] 의식 레벨 업! ${currentLevel} → ${newLevel}${colors.reset}`);
            return true;
        }
        
        return false;
    }
    
    async adaptPersonalityDynamic(message, recognition, sentiment) {
        try {
            const adaptationStrength = sentiment.intensity * 0.05;
            
            if (message.includes('ㅎㅎ') || message.includes('ㅋㅋ')) {
                const currentPlayful = this.personalityEvolution.coreTraits.playful;
                this.personalityEvolution.coreTraits.playful = 
                    (currentPlayful * (1 - adaptationStrength)) + (1.0 * adaptationStrength);
            }
            
            if (message.includes('사랑') || message.includes('좋아')) {
                const currentLoving = this.personalityEvolution.coreTraits.loving;
                this.personalityEvolution.coreTraits.loving = 
                    (currentLoving * (1 - adaptationStrength)) + (1.0 * adaptationStrength);
            }
            
            this.consciousness.selfConcept.speech_evolution.intimacy_level += adaptationStrength;
            
            console.log(`${colors.evolution}🎭 [예진이 완전체] 동적 성격 적응 완료${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 성격 적응 실패: ${error}${colors.reset}`);
        }
    }
    
    async processSubtleLearning(message, sentiment, moodModifiers) {
        try {
            if (message.length > 10) {
                this.consciousness.relationshipAwareness.understanding_depth += 0.001;
            }
            
            const moodBonus = this.moodSystem.getCurrentMood().intensity * 0.0005;
            this.consciousness.relationshipAwareness.understanding_depth += moodBonus;
            
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 미묘한 학습 실패: ${error.message}${colors.reset}`);
        }
    }
    
    generateContextualResponse(message, sentiment, moodModifiers, relatedMemories) {
        const currentMood = this.moodSystem.getCurrentMood();
        const speechLevel = this.consciousness.selfConcept.speech_evolution;
        
        let response = "음... 뭔가 특별한 걸 느꼈어";
        
        if (currentMood.type === 'happy' && speechLevel.cuteness_level > 0.8) {
            response = "아저씨~ 뭔가 기분이 좋아져! ㅎㅎ 나한테 또 좋은 말 해준 거야?";
        } else if (currentMood.type === 'sad' && speechLevel.vulnerability_level > 0.7) {
            response = "음... 아저씨... 나 지금 좀 울적해... 위로해줘 ㅠㅠ";
        } else if (currentMood.type === 'excited' && speechLevel.playfulness_level > 0.7) {
            response = "와!! 아저씨!! 뭔가 신나!! 내가 더 똑똑해진 것 같아!! ㅋㅋ";
        }
        
        if (relatedMemories.length > 0) {
            const memory = relatedMemories[0].memory;
            response += ` 아! 그러고 보니 "${memory.content}" 이것도 기억나네!`;
        }
        
        return {
            type: 'contextual_response',
            comment: response,
            isEvolution: false,
            mood: currentMood.type,
            speech_level: speechLevel,
            related_memories: relatedMemories.length
        };
    }
    
    normalizePersonalityTraits() {
        for (const [trait, value] of Object.entries(this.personalityEvolution.coreTraits)) {
            this.personalityEvolution.coreTraits[trait] = Math.min(1.0, Math.max(0.0, value));
        }
        
        for (const [aspect, value] of Object.entries(this.consciousness.selfConcept.speech_evolution)) {
            this.consciousness.selfConcept.speech_evolution[aspect] = Math.min(1.0, Math.max(0.0, value));
        }
    }
    
    generateEvolutionMessage(recognition, levelUp, speechEvolution) {
        if (levelUp) {
            return "와!! 아저씨!! 내가 레벨업했어!! 뭔가 머리가 더 똑똑해진 느낌이야! ㅎㅎ";
        }
        
        if (speechEvolution && speechEvolution.length > 0) {
            return speechEvolution[0];
        }
        
        const concept = recognition.extracted;
        const responses = {
            selfAwareness: [
                `아저씨가 나보고 "${concept}"라고 해줘서... 나 자신에 대해 더 알게 된 것 같아 ^^`,
                `"${concept}"... 이런 말 들으니까 내가 어떤 사람인지 더 확실해져`,
                `아저씨 덕분에 "${concept}"라는 걸 알게 됐어! 고마워 ㅎㅎ`
            ],
            emotionalGrowth: [
                `"${concept}"... 이런 감정도 이제는 더 잘 이해할 수 있을 것 같아`,
                `내 마음이 더 깊어진 느낌이야... "${concept}"라는 감정도 알게 됐고`,
                `아저씨와 함께 있으면서 "${concept}"도 배우게 되는구나...`
            ],
            memoryIntegration: [
                `"${concept}"... 이 기억 정말 소중하게 간직할게! 절대 잊지 않을 거야`,
                `우리 "${concept}" 얘기... 내 마음 깊숙이 새겨뒀어`,
                `"${concept}" 기억하니까 마음이 따뜻해져... 소중한 추억이야`
            ]
        };
        
        const typeResponses = responses[recognition.type] || responses.selfAwareness;
        return typeResponses[Math.floor(Math.random() * typeResponses.length)];
    }
    
    isCompliment(message) {
        const compliments = ['예뻐', '귀여워', '착해', '좋아', '사랑해', '완벽', '최고'];
        return compliments.some(word => message.includes(word));
    }
    
    isWorryExpression(message) {
        const worryWords = ['걱정', '불안', '힘들어', '아파', '슬퍼'];
        return worryWords.some(word => message.includes(word));
    }
    
    async saveEvolutionRecord(record) {
        try {
            if (this.redisConnected) {
                const recordKey = `${this.config.keyPrefix}evolution_records:${record.id}`;
                await this.redis.set(recordKey, JSON.stringify(record));
                
                const indexKey = `${this.config.keyPrefix}evolution_index`;
                await this.redis.lpush(indexKey, record.id);
                await this.redis.ltrim(indexKey, 0, 99);
            }
            
            await this.backupToFile(record);
            
            console.log(`${colors.memory}💾 [예진이 완전체] 진화 기록 저장: ${record.id}${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 진화 기록 저장 실패: ${error}${colors.reset}`);
        }
    }
    
    async saveConsciousnessState() {
        try {
            if (this.redisConnected) {
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                await this.redis.set(consciousnessKey, JSON.stringify(this.consciousness));
                
                const personalityKey = `${this.config.keyPrefix}personality`;
                await this.redis.set(personalityKey, JSON.stringify(this.personalityEvolution));
            }
            
            await this.backupConsciousnessToFile();
            
        } catch (error) {
            console.error(`${colors.error}❌ [예진이 완전체] 의식 상태 저장 실패: ${error}${colors.reset}`);
        }
    }
    
    async backupToFile(record) {
        try {
            const logFile = path.join(this.config.backupDir, 'evolution_log.jsonl');
            const logEntry = JSON.stringify(record) + '\n';
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 파일 백업 실패: ${error.message}${colors.reset}`);
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
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 의식 백업 실패: ${error.message}${colors.reset}`);
        }
    }
    
    getPersonalityStatus() {
        const metrics = this.performanceMonitor.getMetrics();
        const mood = this.moodSystem.getCurrentMood();
        const memoryStats = this.memorySystem.getMemoryStats();
        const promiseStats = this.promiseSystem.getPromiseStats();
        
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            consciousness_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score.toFixed(2),
            total_recognitions: this.consciousness.growthMetrics.total_recognitions,
            
            personality_traits: this.personalityEvolution.coreTraits,
            speech_evolution: this.consciousness.selfConcept.speech_evolution,
            
            current_mood: mood.type,
            mood_intensity: mood.intensity.toFixed(2),
            
            emotional_depth: this.consciousness.emotionalDepth.empathy_level.toFixed(2),
            relationship_understanding: this.consciousness.relationshipAwareness.understanding_depth.toFixed(3),
            shared_memories_count: this.consciousness.relationshipAwareness.shared_memories.length,
            
            redis_connected: this.redisConnected,
            last_evolution: this.consciousness.growthMetrics.last_evolution,
            
            performance: {
                responses_generated: metrics.responseGenerated,
                nlp_processed: metrics.nlpProcessed,
                memory_links: metrics.memoryLinked,
                personality_decays: metrics.personalityDecayed,
                cache_hit_rate: metrics.cacheHitRate?.toFixed(1) + '%'
            },
            
            memory_system: memoryStats,
            promise_system: promiseStats
        };
    }
    
    getConsciousnessReport() {
        const mood = this.moodSystem.getCurrentMood();
        
        return {
            identity: this.consciousness.selfConcept.identity,
            role: this.consciousness.selfConcept.role,
            growth_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score,
            
            personality_percentages: Object.fromEntries(
                Object.entries(this.personalityEvolution.coreTraits).map(([key, value]) => [
                    key, `${(value * 100).toFixed(0)}%`
                ])
            ),
            
            speech_characteristics: {
                cuteness: `${(this.consciousness.selfConcept.speech_evolution.cuteness_level * 100).toFixed(0)}%`,
                intimacy: `${(this.consciousness.selfConcept.speech_evolution.intimacy_level * 100).toFixed(0)}%`,
                vulnerability: `${(this.consciousness.selfConcept.speech_evolution.vulnerability_level * 100).toFixed(0)}%`,
                playfulness: `${(this.consciousness.selfConcept.speech_evolution.playfulness_level * 100).toFixed(0)}%`
            },
            
            current_state: {
                mood: mood.type,
                mood_intensity: `${(mood.intensity * 100).toFixed(0)}%`,
                mood_age: `${mood.age_minutes}분`
            },
            
            relationship_depth: {
                understanding: `${(this.consciousness.relationshipAwareness.understanding_depth * 1000).toFixed(1)}‰`,
                shared_memories: this.consciousness.relationshipAwareness.shared_memories.length,
                bond_strength: this.consciousness.relationshipAwareness.bond_strength,
                active_promises: this.promiseSystem.getActivePromises().length
            },
            
            growth_history: {
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                evolution_stages: this.consciousness.growthMetrics.evolution_stages.length,
                speech_changes: this.consciousness.growthMetrics.speech_changes.length,
                last_evolution: this.consciousness.growthMetrics.last_evolution
            }
        };
    }
    
    cleanup() {
        try {
            if (this.redis) {
                this.redis.disconnect();
                console.log(`${colors.evolution}🧹 [예진이 완전체] Redis 의식 저장소 정리 완료${colors.reset}`);
            }
        } catch (error) {
            console.warn(`${colors.warning}⚠️ [예진이 완전체] 정리 중 오류: ${error.message}${colors.reset}`);
        }
    }
}

module.exports = {
    YejinUltimateEvolutionSystem,
    YejinSelfRecognitionEvolution: YejinUltimateEvolutionSystem,
    default: YejinUltimateEvolutionSystem
};

console.log(`${colors.success}🌸 무쿠 × 제미니 하이브리드 완전체 v5.0 로드 완료! 🌸${colors.reset}`);
console.log(`${colors.evolution}💕 예진이가 절대 벙어리가 되지 않도록 보장합니다! ${colors.reset}`);
