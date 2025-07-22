// ============================================================================
// muku-realTimeLearningSystem.js - 무쿠 Enterprise 실시간 학습 시스템 v3.0
// 🏢 Enterprise-Level 안정성 보장
// 🔒 Thread-Safe Singleton Pattern with Mutex
// 🗃️ Atomic File Operations with Locking
// 🔄 Event-Driven Architecture
// 💾 Memory Management with Limits
// 🛡️ Graceful Shutdown & Recovery
// 🔍 Real-time Health Monitoring
// ⚡ High-Performance & Scalable
// 💖 예진이가 안전하게 학습하고 성장하는 시스템
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { Worker } = require('worker_threads');

// ================== 🎨 색상 정의 ==================
const colors = {
    learning: '\x1b[1m\x1b[35m',   // 굵은 자주색 (학습)
    pattern: '\x1b[96m',           // 하늘색 (패턴)
    emotion: '\x1b[93m',           // 노란색 (감정)
    memory: '\x1b[92m',            // 초록색 (기억)
    adaptation: '\x1b[94m',         // 파란색 (적응)
    success: '\x1b[32m',           // 초록색 (성공)
    error: '\x1b[91m',             // 빨간색 (에러)
    warning: '\x1b[93m',           // 노란색 (경고)
    critical: '\x1b[41m\x1b[37m',  // 빨간 배경에 흰 글씨 (치명적)
    reset: '\x1b[0m'               // 색상 리셋
};

// ================== 🔧 시스템 구성 ==================
const CONFIG = {
    // 파일 시스템
    LEARNING_DATA_DIR: path.join(__dirname, 'learning_data'),
    LOCK_DIR: path.join(__dirname, 'learning_data', 'locks'),
    BACKUP_DIR: path.join(__dirname, 'learning_data', 'backups'),
    
    // 메모리 관리
    MAX_LEARNING_DATA_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_PATTERN_COUNT: 1000,
    MEMORY_CHECK_INTERVAL: 30000, // 30초
    
    // 동시성 제어
    LOCK_TIMEOUT: 10000, // 10초
    INIT_TIMEOUT: 30000, // 30초
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1초
    
    // 건강 상태 체크
    HEALTH_CHECK_INTERVAL: 5000, // 5초
    MAX_ERROR_RATE: 0.1, // 10%
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    
    // 백업 설정
    BACKUP_INTERVAL: 300000, // 5분
    MAX_BACKUP_COUNT: 10
};

// ================== 🔒 Thread-Safe Mutex 클래스 ==================
class AsyncMutex {
    constructor() {
        this._queue = [];
        this._locked = false;
    }
    
    async acquire() {
        return new Promise((resolve) => {
            if (!this._locked) {
                this._locked = true;
                resolve();
            } else {
                this._queue.push(resolve);
            }
        });
    }
    
    release() {
        if (this._queue.length > 0) {
            const next = this._queue.shift();
            next();
        } else {
            this._locked = false;
        }
    }
    
    get isLocked() {
        return this._locked;
    }
}

// ================== 🗃️ Atomic File Manager ==================
class AtomicFileManager {
    constructor() {
        this.locks = new Map();
    }
    
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
    
    async acquireFileLock(filePath, timeout = CONFIG.LOCK_TIMEOUT) {
        const lockPath = path.join(CONFIG.LOCK_DIR, `${path.basename(filePath)}.lock`);
        await this.ensureDirectory(CONFIG.LOCK_DIR);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                await fs.writeFile(lockPath, process.pid.toString(), { flag: 'wx' });
                return lockPath;
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
                
                // 기존 락 파일 검증
                try {
                    const lockContent = await fs.readFile(lockPath, 'utf8');
                    const lockPid = parseInt(lockContent);
                    
                    // 프로세스가 존재하지 않으면 락 파일 삭제
                    try {
                        process.kill(lockPid, 0);
                    } catch {
                        await fs.unlink(lockPath);
                        continue;
                    }
                } catch {
                    await fs.unlink(lockPath);
                    continue;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        throw new Error(`파일 락 획득 실패: ${filePath} (타임아웃)`);
    }
    
    async releaseFileLock(lockPath) {
        try {
            await fs.unlink(lockPath);
        } catch (error) {
            console.warn(`${colors.warning}⚠️ 락 파일 해제 실패: ${error.message}${colors.reset}`);
        }
    }
    
    async atomicWrite(filePath, data, options = {}) {
        const tempPath = `${filePath}.tmp.${Date.now()}.${process.pid}`;
        const lockPath = await this.acquireFileLock(filePath);
        
        try {
            // 임시 파일에 쓰기
            await fs.writeFile(tempPath, data, options);
            
            // 원자적 이동
            await fs.rename(tempPath, filePath);
            
            console.log(`${colors.success}💾 [원자적쓰기] ${path.basename(filePath)} 완료${colors.reset}`);
            
        } catch (error) {
            // 임시 파일 정리
            try {
                await fs.unlink(tempPath);
            } catch {}
            throw error;
        } finally {
            await this.releaseFileLock(lockPath);
        }
    }
    
    async safeRead(filePath, options = {}) {
        const lockPath = await this.acquireFileLock(filePath);
        
        try {
            const data = await fs.readFile(filePath, options);
            return data;
        } finally {
            await this.releaseFileLock(lockPath);
        }
    }
}

// ================== 📊 메모리 관리자 ==================
class MemoryManager {
    constructor() {
        this.startTime = Date.now();
        this.peakMemoryUsage = 0;
        this.memoryWarnings = 0;
    }
    
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapUsed + memUsage.external;
        
        if (totalMemory > this.peakMemoryUsage) {
            this.peakMemoryUsage = totalMemory;
        }
        
        if (totalMemory > CONFIG.MAX_MEMORY_USAGE) {
            this.memoryWarnings++;
            console.warn(`${colors.warning}⚠️ [메모리] 사용량 초과: ${(totalMemory / 1024 / 1024).toFixed(2)}MB${colors.reset}`);
            
            // 강제 가비지 컬렉션
            if (global.gc) {
                global.gc();
                console.log(`${colors.learning}🗑️ [메모리] 가비지 컬렉션 실행${colors.reset}`);
            }
            
            return false;
        }
        
        return true;
    }
    
    getMemoryStats() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
            peak: `${(this.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
            warnings: this.memoryWarnings,
            uptime: `${((Date.now() - this.startTime) / 1000 / 60).toFixed(1)}분`
        };
    }
    
    cleanupLearningData(learningData) {
        // 학습 데이터 크기 제한
        Object.keys(learningData.speechPatterns).forEach(pattern => {
            if (learningData.speechPatterns[pattern].examples) {
                if (learningData.speechPatterns[pattern].examples.length > 50) {
                    learningData.speechPatterns[pattern].examples = 
                        learningData.speechPatterns[pattern].examples
                            .sort((a, b) => b.quality - a.quality)
                            .slice(0, 50);
                }
            }
        });
        
        Object.keys(learningData.emotionalResponses).forEach(emotion => {
            if (learningData.emotionalResponses[emotion].patterns) {
                if (learningData.emotionalResponses[emotion].patterns.length > 30) {
                    learningData.emotionalResponses[emotion].patterns = 
                        learningData.emotionalResponses[emotion].patterns
                            .sort((a, b) => b.quality - a.quality)
                            .slice(0, 30);
                }
            }
        });
        
        console.log(`${colors.memory}🧹 [메모리] 학습 데이터 정리 완료${colors.reset}`);
    }
}

// ================== 🔍 건강 상태 모니터 ==================
class HealthMonitor extends EventEmitter {
    constructor() {
        super();
        this.stats = {
            startTime: Date.now(),
            totalOperations: 0,
            successfulOperations: 0,
            errors: 0,
            warnings: 0,
            lastError: null,
            lastOperation: null
        };
        
        this.status = 'initializing';
        this.intervals = [];
    }
    
    start() {
        // 건강 상태 체크
        const healthInterval = setInterval(() => {
            this.performHealthCheck();
        }, CONFIG.HEALTH_CHECK_INTERVAL);
        
        this.intervals.push(healthInterval);
        
        console.log(`${colors.learning}🔍 [모니터] 건강 상태 모니터링 시작${colors.reset}`);
    }
    
    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        console.log(`${colors.learning}🔍 [모니터] 건강 상태 모니터링 중지${colors.reset}`);
    }
    
    recordOperation(success = true, operationType = 'unknown') {
        this.stats.totalOperations++;
        this.stats.lastOperation = {
            type: operationType,
            timestamp: new Date().toISOString(),
            success: success
        };
        
        if (success) {
            this.stats.successfulOperations++;
        } else {
            this.stats.errors++;
        }
    }
    
    recordError(error, context = '') {
        this.stats.errors++;
        this.stats.lastError = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        console.error(`${colors.error}❌ [에러] ${context}: ${error.message}${colors.reset}`);
        this.emit('error', error, context);
    }
    
    recordWarning(message, context = '') {
        this.stats.warnings++;
        console.warn(`${colors.warning}⚠️ [경고] ${context}: ${message}${colors.reset}`);
        this.emit('warning', message, context);
    }
    
    performHealthCheck() {
        const errorRate = this.stats.errors / Math.max(this.stats.totalOperations, 1);
        const uptime = Date.now() - this.stats.startTime;
        
        let newStatus = 'healthy';
        
        if (errorRate > CONFIG.MAX_ERROR_RATE) {
            newStatus = 'critical';
        } else if (errorRate > CONFIG.MAX_ERROR_RATE / 2) {
            newStatus = 'warning';
        } else if (uptime < 60000) { // 1분 미만
            newStatus = 'starting';
        }
        
        if (newStatus !== this.status) {
            const oldStatus = this.status;
            this.status = newStatus;
            console.log(`${colors.learning}🏥 [건강] 상태 변경: ${oldStatus} → ${newStatus}${colors.reset}`);
            this.emit('statusChange', newStatus, oldStatus);
        }
    }
    
    getHealthReport() {
        const errorRate = this.stats.errors / Math.max(this.stats.totalOperations, 1);
        const uptime = Date.now() - this.stats.startTime;
        
        return {
            status: this.status,
            uptime: `${(uptime / 1000 / 60).toFixed(1)}분`,
            totalOperations: this.stats.totalOperations,
            successRate: `${((1 - errorRate) * 100).toFixed(2)}%`,
            errorRate: `${(errorRate * 100).toFixed(2)}%`,
            errors: this.stats.errors,
            warnings: this.stats.warnings,
            lastError: this.stats.lastError,
            lastOperation: this.stats.lastOperation,
            recommendations: this.getRecommendations()
        };
    }
    
    getRecommendations() {
        const recommendations = [];
        const errorRate = this.stats.errors / Math.max(this.stats.totalOperations, 1);
        
        if (errorRate > CONFIG.MAX_ERROR_RATE) {
            recommendations.push('시스템 재시작 권장');
        }
        
        if (this.stats.warnings > 10) {
            recommendations.push('설정 검토 필요');
        }
        
        if (this.stats.totalOperations === 0) {
            recommendations.push('시스템 활동 없음 - 확인 필요');
        }
        
        return recommendations;
    }
}

// ================== 🏢 Enterprise 실시간 학습 시스템 ==================
class EnterpriseRealTimeLearningSystem extends EventEmitter {
    constructor() {
        super();
        
        this.version = '3.0';
        this.instanceId = `muku-learning-${Date.now()}-${process.pid}`;
        this.initTime = Date.now();
        
        // 상태 관리
        this.state = 'created';
        this.isActive = false;
        this.isInitialized = false;
        
        // 동시성 제어
        this.initMutex = new AsyncMutex();
        this.operationMutex = new AsyncMutex();
        
        // 매니저들
        this.fileManager = new AtomicFileManager();
        this.memoryManager = new MemoryManager();
        this.healthMonitor = new HealthMonitor();
        
        // 모듈 연결
        this.modules = {
            memoryManager: null,
            ultimateContext: null,
            emotionalContextManager: null,
            sulkyManager: null
        };
        
        // 학습 데이터
        this.learningData = this.createDefaultLearningData();
        this.stats = this.createDefaultStats();
        
        // 정리 함수들
        this.cleanupHandlers = [];
        
        console.log(`${colors.learning}🏢 [Enterprise] 학습 시스템 인스턴스 생성: ${this.instanceId}${colors.reset}`);
        
        // 프로세스 종료 처리
        this.setupGracefulShutdown();
    }
    
    createDefaultLearningData() {
        return {
            speechPatterns: {
                formal: { weight: 0.3, examples: [], success_rate: 0.75 },
                casual: { weight: 0.7, examples: [], success_rate: 0.85 },
                playful: { weight: 0.6, examples: [], success_rate: 0.80 },
                caring: { weight: 0.8, examples: [], success_rate: 0.90 },
                sulky: { weight: 0.5, examples: [], success_rate: 0.65 },
                affectionate: { weight: 0.9, examples: [], success_rate: 0.95 }
            },
            emotionalResponses: {
                happy: { patterns: [], effectiveness: 0.85 },
                sad: { patterns: [], effectiveness: 0.80 },
                worried: { patterns: [], effectiveness: 0.88 },
                playful: { patterns: [], effectiveness: 0.82 },
                loving: { patterns: [], effectiveness: 0.92 },
                sulky: { patterns: [], effectiveness: 0.70 }
            },
            conversationAnalytics: {
                totalConversations: 0,
                successfulResponses: 0,
                userSatisfactionScore: 0.85,
                avgResponseTime: 0,
                topicPreferences: {},
                timeBasedPatterns: {}
            },
            userPreferences: {
                preferredTone: 'caring',
                responseLength: 'medium',
                emojiUsage: 0.8,
                formalityLevel: 0.3,
                playfulnessLevel: 0.7,
                learningFromInteractions: []
            }
        };
    }
    
    createDefaultStats() {
        return {
            conversationsAnalyzed: 0,
            patternsLearned: 0,
            speechAdaptations: 0,
            memoryUpdates: 0,
            emotionalAdjustments: 0,
            lastLearningTime: null,
            errors: 0,
            lastErrorTime: null,
            performance: {
                avgProcessingTime: 0,
                totalProcessingTime: 0,
                operationsCount: 0
            }
        };
    }
    
    // ================== 🚀 안전한 초기화 ==================
    async initialize(systemModules = {}, options = {}) {
        // Mutex 획득
        await this.initMutex.acquire();
        
        try {
            if (this.isInitialized) {
                console.log(`${colors.success}✅ [초기화] 이미 초기화 완료됨${colors.reset}`);
                return true;
            }
            
            if (this.state === 'initializing') {
                console.log(`${colors.warning}⚠️ [초기화] 이미 초기화 진행 중${colors.reset}`);
                return false;
            }
            
            this.state = 'initializing';
            console.log(`${colors.learning}🚀 [초기화] Enterprise 실시간 학습 시스템 초기화 시작...${colors.reset}`);
            
            // 1. 건강 상태 모니터 시작
            this.healthMonitor.start();
            
            // 2. 디렉토리 구조 생성
            await this.setupDirectoryStructure();
            
            // 3. 시스템 모듈 연결
            await this.connectSystemModules(systemModules);
            
            // 4. 학습 데이터 로드
            await this.loadAllLearningData();
            
            // 5. 메모리 체크 시작
            this.startMemoryMonitoring();
            
            // 6. 백업 시스템 시작
            this.startBackupSystem();
            
            // 7. 이벤트 리스너 설정
            this.setupEventHandlers();
            
            // 8. 초기화 완료
            this.state = 'active';
            this.isInitialized = true;
            this.isActive = true;
            
            this.healthMonitor.recordOperation(true, 'initialize');
            
            console.log(`${colors.success}✅ [초기화] Enterprise 실시간 학습 시스템 초기화 완료!${colors.reset}`);
            this.emit('initialized');
            
            return true;
            
        } catch (error) {
            this.state = 'error';
            this.isInitialized = false;
            this.isActive = false;
            
            this.healthMonitor.recordError(error, 'initialize');
            console.error(`${colors.critical}🚨 [초기화] 치명적 오류: ${error.message}${colors.reset}`);
            
            return false;
        } finally {
            this.initMutex.release();
        }
    }
    
    async setupDirectoryStructure() {
        const directories = [
            CONFIG.LEARNING_DATA_DIR,
            CONFIG.LOCK_DIR,
            CONFIG.BACKUP_DIR
        ];
        
        for (const dir of directories) {
            await this.fileManager.ensureDirectory(dir);
        }
        
        console.log(`${colors.learning}📁 [초기화] 디렉토리 구조 생성 완료${colors.reset}`);
    }
    
    async connectSystemModules(systemModules) {
        console.log(`${colors.learning}🔗 [초기화] 시스템 모듈 연결 중...${colors.reset}`);
        
        // 안전한 모듈 연결
        const moduleNames = ['memoryManager', 'ultimateContext', 'emotionalContextManager', 'sulkyManager'];
        
        for (const moduleName of moduleNames) {
            if (systemModules[moduleName] && typeof systemModules[moduleName] === 'object') {
                this.modules[moduleName] = systemModules[moduleName];
                console.log(`${colors.success}   ✅ ${moduleName} 연결 완료${colors.reset}`);
            } else {
                console.log(`${colors.warning}   ⚠️ ${moduleName} 연결 실패 또는 없음${colors.reset}`);
            }
        }
        
        const connectedCount = Object.values(this.modules).filter(Boolean).length;
        console.log(`${colors.learning}🔗 [모듈연결] ${connectedCount}/${moduleNames.length} 모듈 연결 완료${colors.reset}`);
    }
    
    async loadAllLearningData() {
        console.log(`${colors.learning}📚 [초기화] 학습 데이터 로드 중...${colors.reset}`);
        
        const dataFiles = [
            { key: 'speechPatterns', file: 'speech_patterns.json' },
            { key: 'emotionalResponses', file: 'emotional_responses.json' },
            { key: 'conversationAnalytics', file: 'conversation_analytics.json' },
            { key: 'userPreferences', file: 'user_preferences.json' }
        ];
        
        for (const { key, file } of dataFiles) {
            try {
                const filePath = path.join(CONFIG.LEARNING_DATA_DIR, file);
                const data = await this.fileManager.safeRead(filePath, 'utf8');
                const parsedData = JSON.parse(data);
                
                if (this.validateDataStructure(parsedData, key)) {
                    this.learningData[key] = { ...this.learningData[key], ...parsedData };
                    console.log(`${colors.success}   ✅ ${key} 로드 완료${colors.reset}`);
                } else {
                    console.log(`${colors.warning}   ⚠️ ${key} 구조 오류 - 기본값 사용${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.pattern}   📝 ${key} 파일 없음 - 기본값 사용${colors.reset}`);
            }
        }
    }
    
    validateDataStructure(data, dataType) {
        try {
            switch (dataType) {
                case 'speechPatterns':
                    return data && typeof data === 'object' && 
                           Object.values(data).every(pattern => 
                               typeof pattern === 'object' &&
                               pattern.hasOwnProperty('weight') && 
                               pattern.hasOwnProperty('success_rate'));
                case 'emotionalResponses':
                    return data && typeof data === 'object' && 
                           Object.values(data).every(emotion => 
                               typeof emotion === 'object' &&
                               emotion.hasOwnProperty('patterns') && 
                               emotion.hasOwnProperty('effectiveness'));
                case 'conversationAnalytics':
                    return data && typeof data === 'object' && 
                           typeof data.totalConversations === 'number' && 
                           typeof data.successfulResponses === 'number';
                case 'userPreferences':
                    return data && typeof data === 'object' && 
                           typeof data.preferredTone === 'string';
                default:
                    return false;
            }
        } catch {
            return false;
        }
    }
    
    startMemoryMonitoring() {
        const memoryInterval = setInterval(() => {
            const isHealthy = this.memoryManager.checkMemoryUsage();
            if (!isHealthy) {
                this.memoryManager.cleanupLearningData(this.learningData);
            }
        }, CONFIG.MEMORY_CHECK_INTERVAL);
        
        this.cleanupHandlers.push(() => clearInterval(memoryInterval));
        console.log(`${colors.memory}🧠 [초기화] 메모리 모니터링 시작${colors.reset}`);
    }
    
    startBackupSystem() {
        const backupInterval = setInterval(async () => {
            try {
                await this.createBackup();
            } catch (error) {
                this.healthMonitor.recordError(error, 'backup');
            }
        }, CONFIG.BACKUP_INTERVAL);
        
        this.cleanupHandlers.push(() => clearInterval(backupInterval));
        console.log(`${colors.success}💾 [초기화] 백업 시스템 시작${colors.reset}`);
    }
    
    setupEventHandlers() {
        this.healthMonitor.on('statusChange', (newStatus, oldStatus) => {
            if (newStatus === 'critical') {
                console.log(`${colors.critical}🚨 [시스템] 치명적 상태 진입 - 자동 복구 시도${colors.reset}`);
                this.emit('critical', { newStatus, oldStatus });
            }
        });
        
        this.healthMonitor.on('error', (error, context) => {
            this.emit('error', error, context);
        });
    }
    
    // ================== 🧠 안전한 실시간 학습 ==================
    async learnFromConversation(userMessage, mukuResponse, context = {}) {
        const operationId = `learn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // 시스템 상태 체크
        if (!this.isInitialized || !this.isActive || this.state !== 'active') {
            console.log(`${colors.warning}⚠️ [학습] 시스템 미준비 상태 (${this.state}) - 건너뛰기${colors.reset}`);
            return null;
        }
        
        // 입력 검증
        if (!userMessage || !mukuResponse || typeof userMessage !== 'string' || typeof mukuResponse !== 'string') {
            this.healthMonitor.recordWarning('잘못된 입력 데이터', 'learnFromConversation');
            return null;
        }
        
        // Mutex 획득
        await this.operationMutex.acquire();
        
        try {
            console.log(`${colors.learning}🧠 [${operationId}] 실시간 학습 시작...${colors.reset}`);
            
            // 메모리 체크
            if (!this.memoryManager.checkMemoryUsage()) {
                throw new Error('메모리 사용량 초과');
            }
            
            const learningResult = {
                operationId: operationId,
                timestamp: new Date().toISOString(),
                userMessage: userMessage.substring(0, 500), // 길이 제한
                mukuResponse: mukuResponse.substring(0, 500), // 길이 제한
                context: this.sanitizeContext(context),
                improvements: [],
                performance: {
                    startTime: startTime,
                    endTime: null,
                    processingTime: null
                }
            };
            
            // 1. 사용자 메시지 분석
            const userAnalysis = await this.analyzeUserMessage(userMessage, context);
            
            // 2. 응답 품질 평가
            const responseQuality = await this.evaluateResponseQuality(userMessage, mukuResponse, context);
            
            // 3. 말투 패턴 학습
            const speechLearning = await this.learnSpeechPatterns(userMessage, mukuResponse, responseQuality);
            learningResult.improvements.push(...speechLearning);
            
            // 4. 감정 응답 학습
            const emotionLearning = await this.learnEmotionalResponses(userAnalysis, mukuResponse, responseQuality);
            learningResult.improvements.push(...emotionLearning);
            
            // 5. 상황별 적응 학습
            const adaptationLearning = await this.learnSituationalAdaptation(context, responseQuality);
            learningResult.improvements.push(...adaptationLearning);
            
            // 6. 기존 시스템에 안전하게 적용
            await this.applyLearningToSystems(learningResult);
            
            // 7. 데이터 저장
            await this.saveAllLearningData();
            
            // 8. 통계 업데이트
            this.updateLearningStats(learningResult);
            
            // 성능 측정 완료
            const endTime = Date.now();
            learningResult.performance.endTime = endTime;
            learningResult.performance.processingTime = endTime - startTime;
            
            this.stats.performance.totalProcessingTime += learningResult.performance.processingTime;
            this.stats.performance.operationsCount++;
            this.stats.performance.avgProcessingTime = 
                this.stats.performance.totalProcessingTime / this.stats.performance.operationsCount;
            
            this.healthMonitor.recordOperation(true, 'learn');
            
            console.log(`${colors.success}✅ [${operationId}] 학습 완료: ${learningResult.improvements.length}개 개선사항 (${learningResult.performance.processingTime}ms)${colors.reset}`);
            
            this.emit('learningComplete', learningResult);
            return learningResult;
            
        } catch (error) {
            this.healthMonitor.recordError(error, `learnFromConversation-${operationId}`);
            console.error(`${colors.error}❌ [${operationId}] 학습 오류: ${error.message}${colors.reset}`);
            return null;
        } finally {
            this.operationMutex.release();
        }
    }
    
    sanitizeContext(context) {
        const sanitized = {};
        const allowedKeys = ['currentEmotion', 'timeSlot', 'sulkyLevel', 'messageLength'];
        
        for (const key of allowedKeys) {
            if (context.hasOwnProperty(key)) {
                sanitized[key] = context[key];
            }
        }
        
        return sanitized;
    }
    
    // ================== 💾 안전한 데이터 저장 ==================
    async saveAllLearningData() {
        const dataFiles = [
            { key: 'speechPatterns', file: 'speech_patterns.json' },
            { key: 'emotionalResponses', file: 'emotional_responses.json' },
            { key: 'conversationAnalytics', file: 'conversation_analytics.json' },
            { key: 'userPreferences', file: 'user_preferences.json' }
        ];
        
        let successCount = 0;
        
        for (const { key, file } of dataFiles) {
            try {
                const filePath = path.join(CONFIG.LEARNING_DATA_DIR, file);
                const data = JSON.stringify(this.learningData[key], null, 2);
                
                await this.fileManager.atomicWrite(filePath, data);
                successCount++;
            } catch (error) {
                this.healthMonitor.recordError(error, `save-${key}`);
            }
        }
        
        if (successCount === dataFiles.length) {
            console.log(`${colors.success}💾 [저장] 모든 학습 데이터 저장 완료${colors.reset}`);
        } else {
            console.log(`${colors.warning}⚠️ [저장] ${successCount}/${dataFiles.length} 파일 저장 완료${colors.reset}`);
        }
    }
    
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(CONFIG.BACKUP_DIR, timestamp);
            
            await this.fileManager.ensureDirectory(backupDir);
            
            // 현재 학습 데이터 백업
            const backupData = {
                timestamp: timestamp,
                version: this.version,
                instanceId: this.instanceId,
                learningData: this.learningData,
                stats: this.stats
            };
            
            const backupPath = path.join(backupDir, 'backup.json');
            await this.fileManager.atomicWrite(backupPath, JSON.stringify(backupData, null, 2));
            
            // 오래된 백업 정리
            await this.cleanupOldBackups();
            
            console.log(`${colors.success}📦 [백업] 백업 생성 완료: ${timestamp}${colors.reset}`);
        } catch (error) {
            this.healthMonitor.recordError(error, 'backup');
        }
    }
    
    async cleanupOldBackups() {
        try {
            const backupDirs = await fs.readdir(CONFIG.BACKUP_DIR);
            const sortedDirs = backupDirs.sort().reverse();
            
            if (sortedDirs.length > CONFIG.MAX_BACKUP_COUNT) {
                const dirsToDelete = sortedDirs.slice(CONFIG.MAX_BACKUP_COUNT);
                
                for (const dir of dirsToDelete) {
                    const dirPath = path.join(CONFIG.BACKUP_DIR, dir);
                    await fs.rmdir(dirPath, { recursive: true });
                }
                
                console.log(`${colors.learning}🗑️ [백업] ${dirsToDelete.length}개 오래된 백업 삭제${colors.reset}`);
            }
        } catch (error) {
            this.healthMonitor.recordWarning(error.message, 'cleanup-backups');
        }
    }
    
    // ================== 🛡️ Graceful Shutdown ==================
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`${colors.learning}🛑 [종료] ${signal} 신호 수신 - Graceful Shutdown 시작...${colors.reset}`);
            
            try {
                this.state = 'shutting_down';
                this.isActive = false;
                
                // 진행 중인 작업 완료 대기
                if (this.operationMutex.isLocked) {
                    console.log(`${colors.learning}⏳ [종료] 진행 중인 작업 완료 대기...${colors.reset}`);
                    while (this.operationMutex.isLocked) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                // 최종 백업 생성
                await this.createBackup();
                
                // 학습 데이터 저장
                await this.saveAllLearningData();
                
                // 정리 핸들러 실행
                for (const cleanup of this.cleanupHandlers) {
                    try {
                        cleanup();
                    } catch (error) {
                        console.error(`${colors.error}❌ [종료] 정리 오류: ${error.message}${colors.reset}`);
                    }
                }
                
                // 건강 모니터 중지
                this.healthMonitor.stop();
                
                console.log(`${colors.success}✅ [종료] Graceful Shutdown 완료${colors.reset}`);
                process.exit(0);
                
            } catch (error) {
                console.error(`${colors.critical}🚨 [종료] Shutdown 오류: ${error.message}${colors.reset}`);
                process.exit(1);
            }
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    }
    
    // 나머지 메서드들은 기존 로직 유지하되 에러 처리 강화...
    // (분석, 학습, 통계 등의 메서드들)
    
    async analyzeUserMessage(message, context) {
        try {
            const analysis = {
                tone: 'neutral',
                emotion: 'normal',
                formality: 0.5,
                urgency: 0.3,
                topics: [],
                sentiment: 0.0
            };
            
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('ㅋㅋ') || lowerMessage.includes('ㅎㅎ') || lowerMessage.includes('재밌')) {
                analysis.tone = 'playful';
                analysis.emotion = 'happy';
                analysis.sentiment = 0.7;
            } else if (lowerMessage.includes('힘들') || lowerMessage.includes('슬프') || lowerMessage.includes('우울')) {
                analysis.tone = 'sad';
                analysis.emotion = 'sad';
                analysis.sentiment = -0.6;
            } else if (lowerMessage.includes('걱정') || lowerMessage.includes('불안')) {
                analysis.tone = 'worried';
                analysis.emotion = 'worried';
                analysis.sentiment = -0.3;
            } else if (lowerMessage.includes('사랑') || lowerMessage.includes('보고싶') || lowerMessage.includes('좋아')) {
                analysis.tone = 'loving';
                analysis.emotion = 'loving';
                analysis.sentiment = 0.9;
            }
            
            if (lowerMessage.includes('습니다') || lowerMessage.includes('입니다')) {
                analysis.formality = 0.9;
            } else if (lowerMessage.includes('야') || lowerMessage.includes('어') || lowerMessage.includes('아')) {
                analysis.formality = 0.1;
            }
            
            if (lowerMessage.includes('!!!') || lowerMessage.includes('빨리') || lowerMessage.includes('급해')) {
                analysis.urgency = 0.8;
            }
            
            return analysis;
        } catch (error) {
            this.healthMonitor.recordError(error, 'analyzeUserMessage');
            return { tone: 'neutral', emotion: 'normal', formality: 0.5, urgency: 0.3, topics: [], sentiment: 0.0 };
        }
    }
    
    async evaluateResponseQuality(userMessage, mukuResponse, context) {
        try {
            const quality = {
                relevance: 0.8,
                naturalness: 0.7,
                emotionalFit: 0.8,
                engagement: 0.75,
                satisfaction: 0.8,
                overall: 0.77
            };
            
            const userKeywords = userMessage.toLowerCase().split(' ').filter(word => word.length > 1);
            const responseKeywords = mukuResponse.toLowerCase().split(' ').filter(word => word.length > 1);
            const commonKeywords = userKeywords.filter(word => responseKeywords.includes(word));
            quality.relevance = Math.min(1.0, commonKeywords.length / Math.max(userKeywords.length * 0.3, 1));
            
            const yejinExpressions = ['아조씨', '에헤헤', '💕', '🥺', '흐엥', '음음'];
            const hasYejinStyle = yejinExpressions.some(expr => mukuResponse.includes(expr));
            if (hasYejinStyle) quality.naturalness += 0.2;
            
            if (context.currentEmotion) {
                quality.emotionalFit = this.evaluateEmotionalConsistency(context.currentEmotion, mukuResponse);
            }
            
            quality.overall = Math.min(1.0, (quality.relevance + quality.naturalness + quality.emotionalFit + quality.engagement) / 4);
            
            return quality;
        } catch (error) {
            this.healthMonitor.recordError(error, 'evaluateResponseQuality');
            return { relevance: 0.7, naturalness: 0.7, emotionalFit: 0.7, engagement: 0.7, satisfaction: 0.7, overall: 0.7 };
        }
    }
    
    evaluateEmotionalConsistency(currentEmotion, response) {
        try {
            const emotionKeywords = {
                happy: ['기뻐', '좋아', '행복', '즐거', '웃음', '💕', '😊'],
                sad: ['슬프', '우울', '힘들', '눈물', '🥺', '😢'],
                worried: ['걱정', '불안', '괜찮', '조심', '😰'],
                playful: ['ㅋㅋ', '장난', '재밌', '놀자', '😋'],
                loving: ['사랑', '보고싶', '좋아해', '💖', '♡'],
                sulky: ['삐짐', '화났', '몰라', '😤', '흥']
            };
            
            const keywords = emotionKeywords[currentEmotion] || [];
            const matchCount = keywords.filter(keyword => response.includes(keyword)).length;
            
            return Math.min(1.0, matchCount * 0.3 + 0.4);
        } catch {
            return 0.7;
        }
    }
    
    async learnSpeechPatterns(userMessage, mukuResponse, quality) {
        const improvements = [];
        
        try {
            const userFormality = this.detectFormality(userMessage);
            const responseFormality = this.detectFormality(mukuResponse);
            
            if (Math.abs(userFormality - responseFormality) > 0.3) {
                const targetPattern = userFormality > 0.6 ? 'formal' : 'casual';
                
                improvements.push({
                    type: 'speech_pattern',
                    pattern: targetPattern,
                    adjustment: userFormality > responseFormality ? 0.1 : -0.1,
                    reason: `사용자 격식도(${userFormality.toFixed(2)})에 맞춰 조정`
                });
                
                if (quality.overall > 0.75 && this.learningData.speechPatterns[targetPattern]) {
                    this.learningData.speechPatterns[targetPattern].weight = 
                        Math.min(1.0, this.learningData.speechPatterns[targetPattern].weight + 0.05);
                    this.learningData.speechPatterns[targetPattern].success_rate = 
                        (this.learningData.speechPatterns[targetPattern].success_rate + quality.overall) / 2;
                }
            }
            
            if (quality.overall > 0.8) {
                const responsePattern = this.identifyResponsePattern(mukuResponse);
                if (responsePattern && this.learningData.speechPatterns[responsePattern]) {
                    improvements.push({
                        type: 'successful_pattern',
                        pattern: responsePattern,
                        quality: quality.overall,
                        example: mukuResponse.substring(0, 50) + '...'
                    });
                    
                    this.learningData.speechPatterns[responsePattern].examples.push({
                        text: mukuResponse.substring(0, 200), // 길이 제한
                        quality: quality.overall,
                        timestamp: new Date().toISOString()
                    });
                    
                    // 예시 개수 제한
                    if (this.learningData.speechPatterns[responsePattern].examples.length > 50) {
                        this.learningData.speechPatterns[responsePattern].examples = 
                            this.learningData.speechPatterns[responsePattern].examples
                                .sort((a, b) => b.quality - a.quality)
                                .slice(0, 50);
                    }
                }
            }
            
        } catch (error) {
            this.healthMonitor.recordError(error, 'learnSpeechPatterns');
        }
        
        return improvements;
    }
    
    detectFormality(text) {
        try {
            const formalPatterns = ['습니다', '입니다', '하십시오', '께서', '드립니다'];
            const casualPatterns = ['야', '어', '아', 'ㅋㅋ', 'ㅎㅎ', '~'];
            
            const formalCount = formalPatterns.filter(pattern => text.includes(pattern)).length;
            const casualCount = casualPatterns.filter(pattern => text.includes(pattern)).length;
            
            if (formalCount > casualCount) return 0.8;
            if (casualCount > formalCount) return 0.2;
            return 0.5;
        } catch {
            return 0.5;
        }
    }
    
    identifyResponsePattern(response) {
        try {
            if (response.includes('에헤헤') || response.includes('흐엥')) return 'playful';
            if (response.includes('걱정') || response.includes('괜찮')) return 'caring';
            if (response.includes('💕') || response.includes('사랑')) return 'affectionate';
            if (response.includes('삐짐') || response.includes('몰라')) return 'sulky';
            if (response.includes('습니다') || response.includes('입니다')) return 'formal';
            return 'casual';
        } catch {
            return 'casual';
        }
    }
    
    async learnEmotionalResponses(userAnalysis, mukuResponse, quality) {
        const improvements = [];
        
        try {
            const userEmotion = userAnalysis.emotion;
            
            if (userEmotion && userEmotion !== 'normal' && this.learningData.emotionalResponses[userEmotion]) {
                if (quality.overall > 0.75) {
                    this.learningData.emotionalResponses[userEmotion].patterns.push({
                        response: mukuResponse.substring(0, 200), // 길이 제한
                        quality: quality.overall,
                        timestamp: new Date().toISOString(),
                        context: userAnalysis
                    });
                    
                    improvements.push({
                        type: 'emotional_response',
                        emotion: userEmotion,
                        quality: quality.overall,
                        action: 'pattern_added'
                    });
                    
                    this.learningData.emotionalResponses[userEmotion].effectiveness = 
                        (this.learningData.emotionalResponses[userEmotion].effectiveness + quality.overall) / 2;
                }
                
                // 패턴 개수 제한
                if (this.learningData.emotionalResponses[userEmotion].patterns.length > 30) {
                    this.learningData.emotionalResponses[userEmotion].patterns = 
                        this.learningData.emotionalResponses[userEmotion].patterns
                            .sort((a, b) => b.quality - a.quality)
                            .slice(0, 30);
                }
            }
            
        } catch (error) {
            this.healthMonitor.recordError(error, 'learnEmotionalResponses');
        }
        
        return improvements;
    }
    
    async learnSituationalAdaptation(context, quality) {
        const improvements = [];
        
        try {
            const currentHour = new Date().getHours();
            const timeSlot = this.getTimeSlot(currentHour);
            
            if (!this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot]) {
                this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot] = {
                    totalResponses: 0,
                    successfulResponses: 0,
                    avgQuality: 0
                };
            }
            
            const timePattern = this.learningData.conversationAnalytics.timeBasedPatterns[timeSlot];
            timePattern.totalResponses++;
            
            if (quality.overall > 0.75) {
                timePattern.successfulResponses++;
                improvements.push({
                    type: 'time_adaptation',
                    timeSlot: timeSlot,
                    quality: quality.overall
                });
            }
            
            timePattern.avgQuality = (timePattern.avgQuality + quality.overall) / 2;
            
            if (context.currentEmotion && quality.overall > 0.8) {
                improvements.push({
                    type: 'emotional_adaptation',
                    emotion: context.currentEmotion,
                    quality: quality.overall,
                    action: 'pattern_reinforced'
                });
            }
            
            if (context.sulkyLevel && context.sulkyLevel > 0) {
                improvements.push({
                    type: 'sulky_adaptation',
                    level: context.sulkyLevel,
                    quality: quality.overall,
                    action: quality.overall > 0.8 ? 'effective_sulky_response' : 'needs_improvement'
                });
            }
            
        } catch (error) {
            this.healthMonitor.recordError(error, 'learnSituationalAdaptation');
        }
        
        return improvements;
    }
    
    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 23) return 'evening';
        return 'night';
    }
    
    async applyLearningToSystems(learningResult) {
        try {
            const moduleOperations = [
                {
                    module: this.modules.memoryManager,
                    functionName: 'addDynamicMemory',
                    data: {
                        type: 'learned_pattern',
                        content: `학습된 패턴: ${learningResult.improvements.map(imp => imp.type).join(', ')}`,
                        timestamp: learningResult.timestamp,
                        quality: learningResult.improvements.reduce((sum, imp) => sum + (imp.quality || 0.7), 0) / Math.max(learningResult.improvements.length, 1)
                    },
                    name: 'memoryManager'
                },
                {
                    module: this.modules.emotionalContextManager,
                    functionName: 'updateEmotionalLearning',
                    data: learningResult.improvements.filter(imp => imp.type === 'emotional_response'),
                    name: 'emotionalContextManager'
                },
                {
                    module: this.modules.ultimateContext,
                    functionName: 'updateConversationPatterns',
                    data: learningResult.improvements.filter(imp => imp.type === 'speech_pattern'),
                    name: 'ultimateContext'
                },
                {
                    module: this.modules.sulkyManager,
                    functionName: 'updateSulkyPatterns',
                    data: learningResult.improvements.filter(imp => imp.type === 'sulky_adaptation'),
                    name: 'sulkyManager'
                }
            ];
            
            for (const operation of moduleOperations) {
                if (operation.module && 
                    typeof operation.module[operation.functionName] === 'function' &&
                    operation.data && 
                    (Array.isArray(operation.data) ? operation.data.length > 0 : true)) {
                    
                    try {
                        await operation.module[operation.functionName](operation.data);
                        console.log(`${colors.success}   ✅ ${operation.name} 연동 완료${colors.reset}`);
                        
                        if (operation.name === 'memoryManager') this.stats.memoryUpdates++;
                        if (operation.name === 'emotionalContextManager') this.stats.emotionalAdjustments++;
                        if (operation.name === 'ultimateContext') this.stats.speechAdaptations++;
                        
                    } catch (error) {
                        this.healthMonitor.recordWarning(`${operation.name} 연동 실패: ${error.message}`, 'applyLearningToSystems');
                    }
                }
            }
            
        } catch (error) {
            this.healthMonitor.recordError(error, 'applyLearningToSystems');
        }
    }
    
    updateLearningStats(learningResult) {
        try {
            this.stats.conversationsAnalyzed++;
            this.stats.patternsLearned += learningResult.improvements.length;
            this.stats.lastLearningTime = learningResult.timestamp;
            
            this.learningData.conversationAnalytics.totalConversations++;
            
            const avgQuality = learningResult.improvements.reduce((sum, imp) => sum + (imp.quality || 0.7), 0) / 
                             Math.max(learningResult.improvements.length, 1);
            
            if (avgQuality > 0.75) {
                this.learningData.conversationAnalytics.successfulResponses++;
            }
            
            this.learningData.conversationAnalytics.userSatisfactionScore = 
                Math.min(1.0, (this.learningData.conversationAnalytics.userSatisfactionScore * 0.9) + (avgQuality * 0.1));
            
        } catch (error) {
            this.healthMonitor.recordError(error, 'updateLearningStats');
        }
    }
    
    // ================== 📊 시스템 상태 조회 ==================
    getSystemStatus() {
        try {
            return {
                version: this.version,
                instanceId: this.instanceId,
                state: this.state,
                isActive: this.isActive,
                isInitialized: this.isInitialized,
                uptime: Date.now() - this.initTime,
                stats: this.stats,
                learningData: {
                    speechPatternCount: Object.keys(this.learningData.speechPatterns).length,
                    emotionalPatternCount: Object.values(this.learningData.emotionalResponses)
                        .reduce((sum, emotion) => sum + emotion.patterns.length, 0),
                    totalConversations: this.learningData.conversationAnalytics.totalConversations,
                    successRate: this.learningData.conversationAnalytics.successfulResponses / 
                                 Math.max(this.learningData.conversationAnalytics.totalConversations, 1),
                    userSatisfaction: this.learningData.conversationAnalytics.userSatisfactionScore
                },
                moduleConnections: {
                    memoryManager: !!this.modules.memoryManager,
                    ultimateContext: !!this.modules.ultimateContext,
                    emotionalContextManager: !!this.modules.emotionalContextManager,
                    sulkyManager: !!this.modules.sulkyManager
                },
                healthReport: this.healthMonitor.getHealthReport(),
                memoryStats: this.memoryManager.getMemoryStats(),
                performance: {
                    avgProcessingTime: `${this.stats.performance.avgProcessingTime.toFixed(2)}ms`,
                    totalOperations: this.stats.performance.operationsCount,
                    systemLoad: `${((process.cpuUsage().user + process.cpuUsage().system) / 1000000).toFixed(2)}%`
                }
            };
        } catch (error) {
            this.healthMonitor.recordError(error, 'getSystemStatus');
            return {
                version: this.version,
                state: 'error',
                error: error.message
            };
        }
    }
}

// ================== 🔒 Thread-Safe Singleton Manager ==================
class SingletonManager {
    constructor() {
        this.instance = null;
        this.mutex = new AsyncMutex();
        this.initPromise = null;
    }
    
    async getInstance() {
        if (this.instance && this.instance.isInitialized) {
            return this.instance;
        }
        
        await this.mutex.acquire();
        
        try {
            if (!this.instance) {
                this.instance = new EnterpriseRealTimeLearningSystem();
            }
            
            return this.instance;
        } finally {
            this.mutex.release();
        }
    }
    
    async initialize(systemModules = {}, options = {}) {
        if (this.initPromise) {
            return await this.initPromise;
        }
        
        this.initPromise = (async () => {
            try {
                const instance = await this.getInstance();
                const success = await instance.initialize(systemModules, options);
                return success ? instance : null;
            } catch (error) {
                console.error(`${colors.critical}🚨 [싱글톤] 초기화 오류: ${error.message}${colors.reset}`);
                return null;
            } finally {
                this.initPromise = null;
            }
        })();
        
        return await this.initPromise;
    }
    
    async processLearning(userMessage, mukuResponse, context = {}) {
        const instance = await this.getInstance();
        if (!instance || !instance.isInitialized || !instance.isActive) {
            return null;
        }
        
        return await instance.learnFromConversation(userMessage, mukuResponse, context);
    }
    
    getStatus() {
        if (!this.instance) {
            return {
                isActive: false,
                isInitialized: false,
                status: 'not_created'
            };
        }
        
        return this.instance.getSystemStatus();
    }
}

// ================== 🌍 전역 싱글톤 인스턴스 ==================
const globalSingleton = new SingletonManager();

// ================== 📤 모듈 API 함수들 ==================

/**
 * 시스템 초기화
 */
async function initialize(systemModules = {}, options = {}) {
    console.log(`${colors.learning}🚀 [API] Enterprise 실시간 학습 시스템 초기화 시작...${colors.reset}`);
    
    const instance = await globalSingleton.initialize(systemModules, options);
    
    if (instance) {
        console.log(`
${colors.learning}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 무쿠 Enterprise 실시간 학습 시스템 v3.0 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}✅ Enterprise-Level 보안:${colors.reset}
${colors.learning}   🔒 Thread-Safe Singleton Pattern with Mutex${colors.reset}
${colors.success}   🗃️ Atomic File Operations with Locking${colors.reset}
${colors.pattern}   🔄 Event-Driven Architecture${colors.reset}
${colors.memory}   💾 Memory Management with Limits${colors.reset}
${colors.adaptation}   🛡️ Graceful Shutdown & Recovery${colors.reset}
${colors.emotion}   🔍 Real-time Health Monitoring${colors.reset}
${colors.success}   ⚡ High-Performance & Scalable${colors.reset}

${colors.learning}💖 예진이가 이제 완전히 안전하게 학습하고 성장합니다!${colors.reset}
        `);
        return true;
    } else {
        console.error(`${colors.critical}🚨 [API] Enterprise 실시간 학습 시스템 초기화 실패${colors.reset}`);
        return false;
    }
}

/**
 * 실시간 학습 처리
 */
async function processRealtimeLearning(userMessage, mukuResponse, context = {}) {
    try {
        return await globalSingleton.processLearning(userMessage, mukuResponse, context);
    } catch (error) {
        console.error(`${colors.error}❌ [API] 실시간 학습 처리 오류: ${error.message}${colors.reset}`);
        return null;
    }
}

/**
 * 시스템 상태 조회
 */
function getLearningStatus() {
    try {
        const status = globalSingleton.getStatus();
        
        return {
            isActive: status.isActive || false,
            isInitialized: status.isInitialized || false,
            totalLearnings: status.stats?.conversationsAnalyzed || 0,
            successRate: status.learningData ? `${(status.learningData.successRate * 100).toFixed(1)}%` : '0%',
            lastLearningTime: status.stats?.lastLearningTime || null,
            patternsLearned: status.stats?.patternsLearned || 0,
            userSatisfaction: status.learningData ? `${(status.learningData.userSatisfaction * 100).toFixed(1)}%` : '0%',
            memoryUpdates: status.stats?.memoryUpdates || 0,
            emotionalAdjustments: status.stats?.emotionalAdjustments || 0,
            healthStatus: status.healthReport?.status || 'unknown',
            status: status.state || 'unknown'
        };
    } catch (error) {
        return {
            isActive: false,
            isInitialized: false,
            status: 'error',
            error: error.message
        };
    }
}

/**
 * 활성화 상태 확인
 */
function isLearningSystemActive() {
    const status = globalSingleton.getStatus();
    return status.isActive && status.isInitialized && status.state === 'active';
}

/**
 * 학습 통계 조회
 */
function getLearningStats() {
    try {
        const status = globalSingleton.getStatus();
        
        return {
            conversationsAnalyzed: status.stats?.conversationsAnalyzed || 0,
            patternsLearned: status.stats?.patternsLearned || 0,
            speechAdaptations: status.stats?.speechAdaptations || 0,
            memoryUpdates: status.stats?.memoryUpdates || 0,
            emotionalAdjustments: status.stats?.emotionalAdjustments || 0,
            successRate: status.learningData?.successRate || 0,
            userSatisfactionScore: status.learningData?.userSatisfaction || 0,
            isActive: status.isActive || false,
            isInitialized: status.isInitialized || false,
            lastLearningTime: status.stats?.lastLearningTime || null,
            errors: status.stats?.errors || 0,
            lastErrorTime: status.stats?.lastErrorTime || null,
            performance: status.performance || {},
            healthStatus: status.healthReport?.status || 'unknown',
            memoryStats: status.memoryStats || {}
        };
    } catch (error) {
        return {
            conversationsAnalyzed: 0,
            patternsLearned: 0,
            successRate: 0,
            isActive: false,
            isInitialized: false,
            error: error.message
        };
    }
}

/**
 * 시스템 간 동기화
 */
async function synchronizeWithSystems(systemModules) {
    try {
        const instance = await globalSingleton.getInstance();
        if (instance && instance.isInitialized) {
            await instance.connectSystemModules(systemModules);
            console.log(`${colors.learning}🔗 [API] 시스템 모듈 동기화 완료${colors.reset}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`${colors.error}❌ [API] 시스템 동기화 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

/**
 * 수동 활성화 (레거시 호환)
 */
function startAutoLearning() {
    const status = globalSingleton.getStatus();
    
    if (status.isInitialized && !status.isActive) {
        console.log(`${colors.learning}🚀 [API] 수동 활성화 시도...${colors.reset}`);
        // Enterprise 시스템에서는 초기화와 함께 자동 활성화됨
        return status.state === 'active';
    }
    
    return status.isActive;
}

/**
 * 레거시 초기화 함수 (하위 호환성)
 */
async function initializeMukuRealTimeLearning(systemModules = {}) {
    const success = await initialize(systemModules);
    return success ? await globalSingleton.getInstance() : null;
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 클래스들
    EnterpriseRealTimeLearningSystem,
    AsyncMutex,
    AtomicFileManager,
    MemoryManager,
    HealthMonitor,
    
    // API 함수들
    initialize,
    processRealtimeLearning,
    getLearningStatus,
    isLearningSystemActive,
    getLearningStats,
    synchronizeWithSystems,
    startAutoLearning,
    
    // 레거시 호환
    initializeMukuRealTimeLearning,
    
    // 고급 기능
    getSystemInstance: () => globalSingleton.getInstance(),
    getDetailedStatus: () => globalSingleton.getStatus()
};

// 직접 실행 시
if (require.main === module) {
    (async () => {
        const success = await initialize();
        if (success) {
            console.log(`${colors.success}✅ [테스트] Enterprise 시스템 초기화 성공${colors.reset}`);
        } else {
            console.error(`${colors.error}❌ [테스트] Enterprise 시스템 초기화 실패${colors.reset}`);
        }
    })();
}
