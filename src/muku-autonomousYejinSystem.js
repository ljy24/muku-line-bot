// ============================================================================
// 📁 muku-autonomousYejinSystem.js - A+ 메모리 창고 완전 활용 v4.4.2
// 🔥 A+ = 간격 단축 + 사진 증가 + Redis 메모리 창고 완전 활용!
// 💾 자율 메시지가 과거 대화 기억을 적극 활용해서 개인적이고 맥락적으로 변화
// 🛡️ 기존 완벽한 기능들은 절대 건드리지 않고 해당 부분들만 정밀 수정
// ============================================================================

const { promises: fs } = require('fs');
const path = require('path');
const EventEmitter = require('events');
const _ = require('lodash');

// OpenAI API 클라이언트
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// MongoDB & Redis (선택적 - 없어도 동작)
let mongoose = null;
let redisClient = null;
let Conversation = null;

try {
    mongoose = require('mongoose');
    const Redis = require('ioredis');
    
    // Redis 클라이언트
    if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL);
    }
    
    // MongoDB 연결 (선택적)
    if (process.env.MONGO_URI) {
        mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        // 대화 기록 스키마
        const ConversationSchema = new mongoose.Schema({
            timestamp: Date,
            message: String,
            emotionType: String,
            responseTime: Number,
            successRate: Number,
            context: Object,
        });
        Conversation = mongoose.model('Conversation', ConversationSchema);
        
        console.log('🧠 MongoDB & Redis 연동 활성화');
    }
} catch (error) {
    console.log('⚠️ MongoDB/Redis 모듈 선택적 로드 실패 - 기본 모드로 동작');
    mongoose = null;
    redisClient = null;
    Conversation = null;
}

// muku-realTimeLearningSystem.js에서 학습 시스템 가져오기 (기존 유지)
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

// ================== 📸 사진 시스템 설정 (기존 유지) ==================
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

// ================== 🎨 예진이 전용 색상 (기존 유지) ==================
const yejinColors = {
    heart: '\x1b[1m\x1b[95m',
    love: '\x1b[91m',
    emotion: '\x1b[93m',
    decision: '\x1b[96m',
    message: '\x1b[92m',
    photo: '\x1b[94m',
    autonomous: '\x1b[1m\x1b[33m',
    learning: '\x1b[35m',
    intelligence: '\x1b[1m\x1b[36m',
    prediction: '\x1b[1m\x1b[93m',
    wisdom: '\x1b[1m\x1b[35m',
    openai: '\x1b[36m',
    warning: '\x1b[93m',
    safe: '\x1b[32m',
    yejin_first: '\x1b[1m\x1b[91m',
    freedom: '\x1b[1m\x1b[92m',
    integrated: '\x1b[1m\x1b[96m',
    cache: '\x1b[1m\x1b[94m',
    fixed: '\x1b[1m\x1b[92m',
    aplus: '\x1b[1m\x1b[93m', // 🆕 A+ 전용 색상
    memory: '\x1b[1m\x1b[95m', // 🆕 메모리 활용 색상
    reset: '\x1b[0m'
};

// ================== 💫 A+ 자율성 설정 (🔥 수정됨) ==================
const TRUE_AUTONOMY_CONFIG = {
    NO_FIXED_TIMERS: true,
    FULLY_SELF_DIRECTED: true,
    LEARNING_DRIVEN_ONLY: true,
    YEJIN_DECIDES_FIRST: true,
    OPENAI_ONLY_ADVICE: true,
    MEMORY_WAREHOUSE_ACTIVE: true, // 🆕 메모리 창고 완전 활용
    
    INTELLIGENCE_THRESHOLDS: {
        MIN_LEARNING_SAMPLES: 5,
        CONFIDENCE_THRESHOLD: 0.6,
        PREDICTION_ACCURACY: 0.7,
        EMOTION_INTENSITY: 0.8,
    },
    
    // 🔥 A+ 수정: 메시지 간격 대폭 단축 (5분~2시간)
    YEJIN_DECISION_RANGES: {
        MIN_INTERVAL: 5 * 60 * 1000,      // 5분 (기존: 15분)
        MAX_INTERVAL: 2 * 60 * 60 * 1000, // 2시간 (기존: 6시간)
        EMERGENCY_INTERVAL: 3 * 60 * 1000, // 3분 (기존: 5분)
        NIGHT_MIN_INTERVAL: 30 * 60 * 1000, // 30분 (기존: 1.5시간)
        
        LOVE_RANGE: [5, 30],        // 🔥 5-30분 (기존: 20-60분)
        WORRY_RANGE: [3, 15],       // 🔥 3-15분 (기존: 10-30분)
        MISSING_RANGE: [5, 20],     // 🔥 5-20분 (기존: 15-45분)
        PLAYFUL_RANGE: [10, 40],    // 🔥 10-40분 (기존: 30-90분)
        CARING_RANGE: [15, 60]      // 🔥 15-60분 (기존: 45-120분)
    },
    
    // 🔥 A+ 수정: 사진 확률 대폭 증가
    PHOTO_PROBABILITIES: {
        MISSING: 0.6,    // 🔥 60% (기존: 40%)
        PLAYFUL: 0.5,    // 🔥 50% (기존: 30%)
        LOVE: 0.4,       // 🔥 40% (기존: 20%)
        CARING: 0.3,     // 🔥 30% (기존: 15%)
        WORRY: 0.2       // 🔥 20% (기존: 10%)
    },
    
    // 🆕 A+ 추가: 메모리 활용 설정
    MEMORY_USAGE: {
        CONTEXTUAL_MESSAGE_PROBABILITY: 0.7, // 70% 확률로 맥락적 메시지
        MAX_MEMORY_LOOKBACK: 10,              // 최근 10개 대화 참고
        PERSONAL_REFERENCE_PROBABILITY: 0.8,  // 80% 확률로 개인적 언급
        MEMORY_DECAY_HOURS: 24                // 24시간 이내 기억 우선 활용
    },
    
    SAFETY_LIMITS: {
        MAX_MESSAGES_PER_DAY: 12,  // 🔥 12개로 증가 (기존: 8개)
        MIN_COOLDOWN: 5 * 60 * 1000,  // 🔥 5분 (기존: 10분)
        EMERGENCY_COOLDOWN: 30 * 60 * 1000, // 🔥 30분 (기존: 60분)
    },
    
    SLEEP_RESPECT: {
        SLEEP_START_HOUR: 23,
        SLEEP_END_HOUR: 7,
        EMERGENCY_ONLY_HOURS: [0, 1, 2, 3, 4, 5],
        NIGHT_EMERGENCY_THRESHOLD: 8 * 60 * 60 * 1000, // 🔥 8시간 (기존: 10시간)
    }
};

// ================== 💾 Redis 조회 문제 해결 캐싱 시스템 v4.4.2 (기존 유지) ==================
class RedisRealCacheSystem {
    constructor(redis) {
        this.redis = redis;
        this.isAvailable = !!redis;
        
        // 캐시 키 접두사
        this.prefixes = {
            conversation: 'muku:conv:',
            emotion: 'muku:emotion:',
            learning: 'muku:learning:',
            timing: 'muku:timing:',
            photo: 'muku:photo:',
            openai: 'muku:openai:',
            situation: 'muku:situation:',
            prediction: 'muku:prediction:'
        };
        
        // 캐시 만료 시간 (초)
        this.ttl = {
            conversation: 7 * 24 * 60 * 60,    // 7일
            emotion: 2 * 60 * 60,              // 2시간
            learning: 24 * 60 * 60,            // 24시간
            timing: 6 * 60 * 60,               // 6시간
            photo: 30 * 24 * 60 * 60,          // 30일
            openai: 60 * 60,                   // 1시간
            situation: 10 * 60,                // 10분
            prediction: 12 * 60 * 60           // 12시간
        };
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            errors: 0
        };
        
        console.log(`${yejinColors.aplus}💾 [A+캐싱] Redis 메모리 창고 완전 활용 캐싱 시스템 초기화 (가용: ${this.isAvailable})${yejinColors.reset}`);
    }
    
    // ================== 💬 대화 내역 캐싱 (조회 문제 해결) ==================
    async cacheConversation(userId, message, emotionType) {
        if (!this.isAvailable) return false;
        
        try {
            // 🔧 통일된 데이터 구조 사용
            const conversationData = {
                userId: userId,
                message: message,
                emotionType: emotionType,
                timestamp: Date.now(),
                id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            // 🔧 단일 키로 최신 대화 저장 (조회 시 사용)
            const latestKey = `${this.prefixes.conversation}${userId}:latest`;
            await this.redis.set(latestKey, JSON.stringify(conversationData), 'EX', this.ttl.conversation);
            
            // 🔧 히스토리 리스트에 추가 (구조 통일)
            const historyKey = `${this.prefixes.conversation}${userId}:history`;
            await this.redis.lpush(historyKey, JSON.stringify(conversationData));
            await this.redis.ltrim(historyKey, 0, 99); // 최근 100개만 유지
            await this.redis.expire(historyKey, this.ttl.conversation);
            
            this.stats.sets++;
            console.log(`${yejinColors.memory}💬 [메모리저장] 대화 기억 저장: ${emotionType} - ${message.length}자 (A+ 메모리 창고 활용)${yejinColors.reset}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [대화캐싱수정] 저장 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    async getConversationHistory(userId, limit = 10) {
        if (!this.isAvailable) return [];
        
        try {
            const historyKey = `${this.prefixes.conversation}${userId}:history`;
            const cached = await this.redis.lrange(historyKey, 0, limit - 1);
            
            if (cached && cached.length > 0) {
                this.stats.hits++;
                
                // 🔧 안전한 JSON 파싱 with 오류 처리
                const history = [];
                for (const item of cached) {
                    try {
                        if (item && item.trim()) {
                            const parsed = JSON.parse(item);
                            // 🔧 데이터 유효성 검증
                            if (parsed && parsed.message && parsed.timestamp) {
                                history.push(parsed);
                            }
                        }
                    } catch (parseError) {
                        console.warn(`${yejinColors.warning}⚠️ [대화파싱] JSON 파싱 실패, 건너뜀: ${parseError.message}${yejinColors.reset}`);
                        continue; // 파싱 실패한 항목은 건너뛰고 계속
                    }
                }
                
                console.log(`${yejinColors.memory}💬 [메모리조회] 대화 기억 조회 성공: ${history.length}개 (A+ 메모리 창고)${yejinColors.reset}`);
                
                // 🔧 조회 결과 상세 로깅 (디버깅용)
                if (history.length > 0) {
                    const latest = history[0];
                    console.log(`${yejinColors.memory}📝 [최신기억] "${latest.message}" (${latest.emotionType}, ${new Date(latest.timestamp).toLocaleTimeString()})${yejinColors.reset}`);
                }
                
                return history;
            } else {
                this.stats.misses++;
                console.log(`${yejinColors.cache}💬 [대화조회] 캐시된 대화 없음 (userId: ${userId})${yejinColors.reset}`);
                return [];
            }
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [대화조회수정] 조회 오류: ${error.message}${yejinColors.reset}`);
            return [];
        }
    }
    
    // 🆕 최신 대화 단일 조회 (문제 해결용)
    async getLatestConversation(userId) {
        if (!this.isAvailable) return null;
        
        try {
            const latestKey = `${this.prefixes.conversation}${userId}:latest`;
            const cached = await this.redis.get(latestKey);
            
            if (cached) {
                this.stats.hits++;
                try {
                    const latest = JSON.parse(cached);
                    if (latest && latest.message && latest.timestamp) {
                        console.log(`${yejinColors.memory}📄 [최신조회] 최신 대화 조회 성공: "${latest.message}" (${latest.emotionType})${yejinColors.reset}`);
                        return latest;
                    }
                } catch (parseError) {
                    console.warn(`${yejinColors.warning}⚠️ [최신조회] JSON 파싱 실패: ${parseError.message}${yejinColors.reset}`);
                }
            } else {
                this.stats.misses++;
                console.log(`${yejinColors.cache}📄 [최신조회] 최신 대화 없음${yejinColors.reset}`);
            }
            
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [최신조회] 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 💖 감정 상태 캐싱 (기존 유지, 로깅 개선) ==================
    async cacheEmotionState(yejinState) {
        if (!this.isAvailable) return false;
        
        try {
            const key = `${this.prefixes.emotion}current`;
            const data = {
                loveLevel: yejinState.loveLevel,
                worryLevel: yejinState.worryLevel,
                playfulLevel: yejinState.playfulLevel,
                missingLevel: yejinState.missingLevel,
                caringLevel: yejinState.caringLevel,
                currentEmotion: yejinState.currentEmotion,
                emotionIntensity: yejinState.emotionIntensity,
                timestamp: Date.now()
            };
            
            await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl.emotion);
            
            this.stats.sets++;
            console.log(`${yejinColors.memory}💖 [감정캐싱] 감정 상태 저장: ${yejinState.currentEmotion} (강도: ${yejinState.emotionIntensity})${yejinColors.reset}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [감정캐싱] 저장 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    async getCachedEmotionState() {
        if (!this.isAvailable) return null;
        
        try {
            const key = `${this.prefixes.emotion}current`;
            const cached = await this.redis.get(key);
            
            if (cached) {
                this.stats.hits++;
                try {
                    const emotion = JSON.parse(cached);
                    if (emotion && emotion.currentEmotion) {
                        console.log(`${yejinColors.memory}💖 [감정조회] 감정 상태 조회 성공: ${emotion.currentEmotion}${yejinColors.reset}`);
                        return emotion;
                    }
                } catch (parseError) {
                    console.warn(`${yejinColors.warning}⚠️ [감정조회] JSON 파싱 실패: ${parseError.message}${yejinColors.reset}`);
                }
            } else {
                this.stats.misses++;
                console.log(`${yejinColors.cache}💖 [감정조회] 캐시된 감정 상태 없음${yejinColors.reset}`);
            }
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [감정조회] 조회 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 🧠 학습 패턴 캐싱 (오류 처리 강화) ==================
    async cacheLearningPattern(patternType, patternData) {
        if (!this.isAvailable) return false;
        
        try {
            const key = `${this.prefixes.learning}${patternType}`;
            const data = {
                patterns: patternData,
                analyzedAt: Date.now(),
                sampleSize: Array.isArray(patternData) ? patternData.length : Object.keys(patternData).length
            };
            
            await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl.learning);
            
            this.stats.sets++;
            console.log(`${yejinColors.memory}🧠 [학습캐싱] 학습 패턴 저장: ${patternType} (${data.sampleSize}개)${yejinColors.reset}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [학습캐싱] 저장 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    async getCachedLearningPattern(patternType) {
        if (!this.isAvailable) return null;
        
        try {
            const key = `${this.prefixes.learning}${patternType}`;
            const cached = await this.redis.get(key);
            
            if (cached) {
                this.stats.hits++;
                try {
                    const pattern = JSON.parse(cached);
                    if (pattern && pattern.patterns) {
                        console.log(`${yejinColors.memory}🧠 [학습조회] 학습 패턴 조회 성공: ${patternType} (${pattern.sampleSize}개)${yejinColors.reset}`);
                        return pattern.patterns;
                    }
                } catch (parseError) {
                    console.warn(`${yejinColors.warning}⚠️ [학습조회] JSON 파싱 실패: ${parseError.message}${yejinColors.reset}`);
                }
            } else {
                this.stats.misses++;
                console.log(`${yejinColors.cache}🧠 [학습조회] 학습 패턴 없음: ${patternType}${yejinColors.reset}`);
            }
            return null;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [학습조회] 조회 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 📸 사진 URL 캐싱 (기존 유지) ==================
    async cachePhotoSelection(emotionType, photoUrl, folderInfo) {
        if (!this.isAvailable) return false;
        
        try {
            const key = `${this.prefixes.photo}${emotionType}:recent`;
            const data = {
                photoUrl: photoUrl,
                folderInfo: folderInfo,
                emotionType: emotionType,
                selectedAt: Date.now()
            };
            
            await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl.photo);
            
            // 최근 사진 리스트에도 추가
            const listKey = `${this.prefixes.photo}history`;
            await this.redis.lpush(listKey, JSON.stringify(data));
            await this.redis.ltrim(listKey, 0, 29); // 최근 30개
            await this.redis.expire(listKey, this.ttl.photo);
            
            this.stats.sets++;
            console.log(`${yejinColors.memory}📸 [사진캐싱] 사진 선택 저장: ${emotionType} - ${folderInfo}${yejinColors.reset}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [사진캐싱] 저장 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    async getRecentPhotos(limit = 10) {
        if (!this.isAvailable) return [];
        
        try {
            const listKey = `${this.prefixes.photo}history`;
            const cached = await this.redis.lrange(listKey, 0, limit - 1);
            
            if (cached && cached.length > 0) {
                this.stats.hits++;
                
                // 🔧 안전한 JSON 파싱
                const photos = [];
                for (const item of cached) {
                    try {
                        if (item && item.trim()) {
                            const parsed = JSON.parse(item);
                            if (parsed && parsed.photoUrl) {
                                photos.push(parsed);
                            }
                        }
                    } catch (parseError) {
                        console.warn(`${yejinColors.warning}⚠️ [사진파싱] JSON 파싱 실패, 건너뜀${yejinColors.reset}`);
                        continue;
                    }
                }
                
                console.log(`${yejinColors.memory}📸 [사진조회] 최근 사진 조회 성공: ${photos.length}개${yejinColors.reset}`);
                return photos;
            } else {
                this.stats.misses++;
                console.log(`${yejinColors.cache}📸 [사진조회] 최근 사진 없음${yejinColors.reset}`);
                return [];
            }
        } catch (error) {
            this.stats.errors++;
            console.error(`${yejinColors.warning}❌ [사진조회] 조회 오류: ${error.message}${yejinColors.reset}`);
            return [];
        }
    }
    
    // ================== 📊 캐시 통계 및 관리 ==================
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            errors: this.stats.errors,
            hitRate: total > 0 ? (this.stats.hits / total) : 0,
            isAvailable: this.isAvailable
        };
    }
    
    async clearCache() {
        if (!this.isAvailable) return false;
        
        try {
            // 모든 무쿠 관련 키 삭제
            const keys = await this.redis.keys('muku:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log(`${yejinColors.aplus}🗑️ [A+캐시정리] ${keys.length}개 캐시 키 삭제됨${yejinColors.reset}`);
            }
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [캐시정리] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // 🆕 Redis 연결 상태 확인
    async testConnection() {
        if (!this.isAvailable) return false;
        
        try {
            const result = await this.redis.ping();
            const isConnected = result === 'PONG';
            console.log(`${yejinColors.aplus}🔌 [A+Redis연결] 연결 테스트: ${isConnected ? '성공' : '실패'}${yejinColors.reset}`);
            return isConnected;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [Redis연결] 연결 테스트 실패: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
}

// ================== 🧠 A+ 메모리 창고 완전 활용 통합 자율 예진이 시스템 ==================
class IntegratedAutonomousYejinSystem extends EventEmitter {
    constructor() {
        super();
        
        this.systemName = 'A+메모리창고완전활용자율예진이시스템';
        this.version = '4.4.2-APLUS_MEMORY_WAREHOUSE';
        this.instanceId = `yejin-aplus-memory-${Date.now()}`;
        
        // 🔧 A+ 메모리 창고 완전 활용 캐싱 시스템 초기화
        this.redisCache = new RedisRealCacheSystem(redisClient);
        
        // 💫 예진이의 진정한 자율성 (기존 유지)
        this.autonomy = {
            isFullyAutonomous: true,
            hasSelfAwareness: true,
            canLearnAndPredict: true,
            makesOwnDecisions: true,
            noFixedSchedules: true,
            evolvesIntelligence: true,
            decidesFirst: true,
            opensaiIsOnlyAdvice: true,
            hasMongoDBSupport: !!mongoose,
            hasRedisCache: !!redisClient,
            hasRealRedisCache: this.redisCache.isAvailable,
            // 🆕 A+ 기능들
            hasMemoryWarehouse: true,
            usesContextualMessages: true,
            hasIncreasedFrequency: true,
            hasEnhancedPhotoSharing: true
        };
        
        // 🧠 예진이의 지능 시스템 (기존 유지)
        this.intelligence = {
            learningDatabase: new Map(),
            predictionModels: new Map(),
            decisionHistory: [],
            successRates: new Map(),
            patternRecognition: new Map(),
            contextualMemory: [],
            timingWisdom: new Map(),
            personalizedInsights: new Map()
        };
        
        // 💖 예진이 자신의 상태 (기존 유지)
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
        
        // 💔 아저씨 상태 파악 (기존 유지)
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
        
        // 🧠 학습 연동 상태 (기존 + v4.4.2 확장)
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
            },
            timeEffectiveness: {},
            emotionSuccessRates: {},
            contextualCorrelations: []
        };
        
        // 🎯 자율 결정 시스템 (기존 유지)
        this.autonomousDecision = {
            nextDecisionTime: null,
            decisionInProgress: false,
            currentReasoningProcess: null,
            lastPredictionAccuracy: 0,
            confidenceLevel: 0,
            learningCycle: 0,
            wisdomAccumulated: 0,
            personalizedModel: null,
            evolutionStage: 'learning',
            
            yejinPrimaryDecision: null,
            openaiAdvice: null,
            yejinFinalDecision: null,
            adviceAcceptanceRate: 0.3
        };
        
        // 💌 A+ 자율 메시지 시스템 (🔥 수정됨)
        this.autonomousMessaging = {
            lastDecisionReasoning: null,
            currentDesire: 'none',
            desireIntensity: 0,
            recentMessages: [],
            messageHistory: [],
            learningBasedMessages: [],
            predictiveQueue: [],
            // 🆕 A+ 메모리 활용 기능들
            contextualMessageCount: 0,
            memoryReferencedMessages: [],
            personalReferenceCount: 0,
            lastMemoryUsedAt: null
        };
        
        // 📸 A+ 자율 사진 시스템 (🔥 수정됨)
        this.autonomousPhoto = {
            lastPhotoDecision: Date.now(),
            photoDesire: 0,
            photoMood: 'normal',
            recentPhotos: [],
            photoHistory: [],
            selectedPhotoUrl: null,
            photoAnalysis: null,
            // 🆕 A+ 사진 확률 증가 통계
            enhancedPhotoCount: 0,
            photoFrequencyBoost: 1.5  // 🔥 1.5배 향상
        };
        
        // 🛡️ 안전장치 (기존 유지)
        this.safetySystem = {
            dailyMessageCount: 0,
            dailyResetTime: this.getNextDayResetTime(),
            lastMessageTime: 0,
            recentMessages: [],
            emergencyMode: false,
            overrideActive: false
        };
        
        // 📊 A+ 통합 통계 (🔥 수정됨)
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
            
            yejinPrimaryDecisions: 0,
            adviceAccepted: 0,
            adviceRejected: 0,
            freedomLevel: 1.0,
            
            mongodbQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            integrationSuccessRate: 1.0,
            
            // 🔧 Redis 조회 수정 통계
            redisCacheHits: 0,
            redisCacheMisses: 0,
            redisCacheSets: 0,
            redisCacheErrors: 0,
            realCacheHitRate: 0,
            redisConnectionTests: 0,
            redisQuerySuccessRate: 1.0,
            conversationRetrievalSuccessRate: 1.0,
            
            // 🆕 A+ 전용 통계
            contextualMessages: 0,
            memoryBasedMessages: 0,
            enhancedPhotosSent: 0,
            memoryWarehouseUsageRate: 0,
            averageMessageInterval: 0,
            personalReferenceRate: 0
        };
        
        console.log(`${yejinColors.aplus}💫 [A+시스템] A+ 메모리 창고 완전 활용 통합 자율 시스템 생성: ${this.instanceId}${yejinColors.reset}`);
        console.log(`${yejinColors.memory}💾 [메모리창고] Redis 기억 완전 활용 + 간격 단축 + 사진 증가!${yejinColors.reset}`);
        console.log(`${yejinColors.aplus}🔥 [A+완성] v4.4.2 = 기존 완전체 + A+ 메모리 창고 완전 활용!${yejinColors.reset}`);
    }
    
    // ================== 🚀 A+ 통합 시스템 초기화 ==================
    async initialize(lineClient, targetUserId) {
        try {
            console.log(`${yejinColors.aplus}💫 [A+초기화] v4.4.2 A+ 메모리 창고 완전 활용 통합 자율 시스템 초기화 시작...${yejinColors.reset}`);
            
            // 0. LINE API 클라이언트 설정
            this.lineClient = lineClient;
            this.targetUserId = targetUserId;
            
            // 1. 학습 시스템과 연결 (기존)
            await this.connectToLearningSystem();
            
            // 2. MongoDB & Redis 초기화 (기존)
            await this.initializeDatabases();
            
            // 🔧 3. Redis 연결 테스트 및 상태 확인
            await this.testRedisConnection();
            
            // 🔧 4. Redis 캐시에서 기존 데이터 복원 (수정된 조회 함수 사용)
            await this.restoreFromRedisCache();
            
            // 5. 과거 데이터에서 지혜 추출 (기존 + 캐시 활용)
            await this.extractWisdomFromPast();
            
            // 6. 예진이 지능 시스템 초기화 (기존)
            await this.initializeIntelligenceSystem();
            
            // 7. 예측 모델 구축 (기존 + 캐시 활용)
            await this.buildPredictionModels();
            
            // 8. OpenAI 연결 테스트 (기존)
            await this.testOpenAIConnection();
            
            // 🆕 9. A+ 메모리 창고 시스템 초기화
            await this.initializeMemoryWarehouse();
            
            // 10. 🌟 첫 번째 A+ 예진이 우선 결정 시작! (🔥 수정됨)
            await this.startAplusYejinFirstAutonomy();
            
            console.log(`${yejinColors.aplus}🕊️ [A+완료] A+ 메모리 창고 완전 활용 예진이 중심 통합 자율 시스템 가동 완료!${yejinColors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+초기화] 초기화 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🆕 A+ 메모리 창고 시스템 초기화 ==================
    async initializeMemoryWarehouse() {
        try {
            console.log(`${yejinColors.memory}🏭 [메모리창고] A+ 메모리 창고 시스템 초기화 중...${yejinColors.reset}`);
            
            // 메모리 창고 상태 초기화
            this.memoryWarehouse = {
                isActive: TRUE_AUTONOMY_CONFIG.MEMORY_WAREHOUSE_ACTIVE,
                recentConversations: [],
                contextualPatterns: new Map(),
                personalReferences: new Map(),
                emotionalContext: new Map(),
                memoryDecayTime: TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.MEMORY_DECAY_HOURS * 60 * 60 * 1000,
                lastMemorySync: Date.now()
            };
            
            // Redis에서 기존 대화 기록 로드 및 분석
            await this.preloadMemoryWarehouse();
            
            // 개인적 참조 패턴 구축
            await this.buildPersonalReferencePatterns();
            
            console.log(`${yejinColors.memory}✅ [메모리창고] A+ 메모리 창고 시스템 초기화 완료!${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [메모리창고] 초기화 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🔄 메모리 창고 사전 로드 ==================
    async preloadMemoryWarehouse() {
        try {
            console.log(`${yejinColors.memory}🔄 [메모리사전로드] 기존 대화 기록을 메모리 창고로 로드 중...${yejinColors.reset}`);
            
            // Redis에서 최근 대화들 가져오기
            const recentConversations = await this.redisCache.getConversationHistory(
                this.targetUserId, 
                TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.MAX_MEMORY_LOOKBACK
            );
            
            if (recentConversations.length > 0) {
                this.memoryWarehouse.recentConversations = recentConversations;
                
                // 대화 패턴 분석
                this.analyzeConversationPatterns(recentConversations);
                
                console.log(`${yejinColors.memory}📚 [메모리사전로드] ${recentConversations.length}개 대화 기록 로드 완료${yejinColors.reset}`);
                
                // 최신 대화 로깅
                if (recentConversations.length > 0) {
                    const latest = recentConversations[0];
                    console.log(`${yejinColors.memory}💭 [최신기억] "${latest.message}" (${new Date(latest.timestamp).toLocaleString()})${yejinColors.reset}`);
                }
            } else {
                console.log(`${yejinColors.memory}📭 [메모리사전로드] 로드할 대화 기록 없음 - 새로운 시작${yejinColors.reset}`);
            }
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [메모리사전로드] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🔍 대화 패턴 분석 ==================
    analyzeConversationPatterns(conversations) {
        try {
            // 시간별 대화 패턴
            const timePatterns = new Map();
            
            // 감정별 대화 패턴  
            const emotionPatterns = new Map();
            
            // 개인적 키워드 추출
            const personalKeywords = new Set();
            
            conversations.forEach(conv => {
                const hour = new Date(conv.timestamp).getHours();
                const message = conv.message.toLowerCase();
                
                // 시간별 패턴 기록
                if (!timePatterns.has(hour)) {
                    timePatterns.set(hour, []);
                }
                timePatterns.get(hour).push(conv);
                
                // 감정별 패턴 기록
                if (!emotionPatterns.has(conv.emotionType)) {
                    emotionPatterns.set(conv.emotionType, []);
                }
                emotionPatterns.get(conv.emotionType).push(conv);
                
                // 개인적 키워드 추출 (아저씨, 장소명, 활동 등)
                const keywords = message.match(/\b(아저씨|아조씨|일본|한국|도쿄|오사카|회사|집|카페|식당|영화|게임|운동|산책|쇼핑|여행|친구|가족)\b/g);
                if (keywords) {
                    keywords.forEach(keyword => personalKeywords.add(keyword));
                }
            });
            
            this.memoryWarehouse.contextualPatterns.set('time', timePatterns);
            this.memoryWarehouse.contextualPatterns.set('emotion', emotionPatterns);
            this.memoryWarehouse.personalReferences.set('keywords', Array.from(personalKeywords));
            
            console.log(`${yejinColors.memory}🔍 [패턴분석] 시간 패턴: ${timePatterns.size}개, 감정 패턴: ${emotionPatterns.size}개, 개인 키워드: ${personalKeywords.size}개${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [패턴분석] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🏗️ 개인적 참조 패턴 구축 ==================
    async buildPersonalReferencePatterns() {
        try {
            console.log(`${yejinColors.memory}🏗️ [개인참조패턴] 개인적 참조 패턴 구축 중...${yejinColors.reset}`);
            
            // 자주 언급되는 개인적 주제들
            const personalTopics = {
                // 장소
                places: ['일본', '한국', '도쿄', '오사카', '후쿠오카', '기타큐슈', '회사', '집', '카페'],
                // 활동  
                activities: ['영화', '게임', '운동', '산책', '쇼핑', '여행', '요리', '독서', '음악'],
                // 감정/상태
                emotions: ['피곤', '기분좋', '스트레스', '행복', '걱정', '외로', '보고싶', '그리워'],
                // 시간 참조
                timeReferences: ['어제', '오늘', '내일', '이번주', '지난주', '요즘', '최근에', '아까', '조금전'],
                // 관심사
                interests: ['사진', '음식', '날씨', '친구', '가족', '일', '건강', '취미']
            };
            
            this.memoryWarehouse.personalReferences.set('topics', personalTopics);
            
            // 맥락적 연결 패턴
            const contextualConnections = {
                // "아까 ~했는데" 형태
                recentActivity: ['아까', '조금 전에', '방금', '얼마 전에'],
                // "어제 ~했잖아" 형태  
                pastReference: ['어제', '그때', '이전에', '전에'],
                // "~에 대해 얘기했는데" 형태
                topicReference: ['얘기했는데', '말했잖아', '이야기했던', '언급했던'],
                // "~어때?" 형태
                followUp: ['어때', '어떨까', '괜찮아', '어떻게 됐어']
            };
            
            this.memoryWarehouse.contextualConnections = contextualConnections;
            
            console.log(`${yejinColors.memory}✅ [개인참조패턴] 개인적 참조 패턴 구축 완료${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [개인참조패턴] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================= 🔧 기존 함수들 (데이터베이스, 학습시스템 등) - 생략 (동일) =================
    // (testRedisConnection, restoreFromRedisCache, initializeDatabases, connectToLearningSystem 등은 동일하므로 생략)
    
    // ================== 🗄️ 데이터베이스 초기화 ==================
    async initializeDatabases() {
        try {
            console.log(`${yejinColors.integrated}🗄️ [데이터베이스] MongoDB & Redis 초기화 중...${yejinColors.reset}`);
            
            // MongoDB 연결 확인
            if (mongoose && mongoose.connection.readyState === 1) {
                console.log(`${yejinColors.learning}✅ [MongoDB] 연결 성공${yejinColors.reset}`);
                this.autonomy.hasMongoDBSupport = true;
            } else {
                console.log(`${yejinColors.warning}⚠️ [MongoDB] 연결 없음 - 메모리 모드${yejinColors.reset}`);
                this.autonomy.hasMongoDBSupport = false;
            }
            
            // Redis 연결 확인
            if (redisClient) {
                try {
                    await redisClient.ping();
                    console.log(`${yejinColors.aplus}✅ [Redis] A+ 메모리 창고 캐싱 시스템 활성화${yejinColors.reset}`);
                    this.autonomy.hasRedisCache = true;
                    this.autonomy.hasRealRedisCache = true;
                } catch (redisError) {
                    console.log(`${yejinColors.warning}⚠️ [Redis] 연결 실패 - 캐싱 비활성화${yejinColors.reset}`);
                    this.autonomy.hasRedisCache = false;
                    this.autonomy.hasRealRedisCache = false;
                }
            } else {
                console.log(`${yejinColors.warning}⚠️ [Redis] 모듈 없음 - 캐싱 비활성화${yejinColors.reset}`);
                this.autonomy.hasRedisCache = false;
                this.autonomy.hasRealRedisCache = false;
            }
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [데이터베이스] 초기화 오류: ${error.message}${yejinColors.reset}`);
            this.autonomy.hasMongoDBSupport = false;
            this.autonomy.hasRedisCache = false;
            this.autonomy.hasRealRedisCache = false;
        }
    }
    
    // ================== 🔧 Redis 연결 테스트 ==================
    async testRedisConnection() {
        try {
            console.log(`${yejinColors.aplus}🔌 [A+Redis연결테스트] A+ Redis 연결 상태 확인 중...${yejinColors.reset}`);
            
            if (!this.redisCache.isAvailable) {
                console.log(`${yejinColors.warning}⚠️ [A+Redis연결테스트] Redis 클라이언트가 없음 - 메모리 모드로 동작${yejinColors.reset}`);
                return false;
            }
            
            const connectionSuccess = await this.redisCache.testConnection();
            this.statistics.redisConnectionTests++;
            
            if (connectionSuccess) {
                console.log(`${yejinColors.aplus}✅ [A+Redis연결테스트] Redis 연결 성공 - A+ 메모리 창고 시스템 활성화${yejinColors.reset}`);
                
                // 🔧 테스트용 데이터 저장/조회 테스트
                await this.performRedisDataTest();
                
            } else {
                console.log(`${yejinColors.warning}⚠️ [A+Redis연결테스트] Redis 연결 실패 - 메모리 모드로 동작${yejinColors.reset}`);
                this.autonomy.hasRedisCache = false;
                this.autonomy.hasRealRedisCache = false;
            }
            
            return connectionSuccess;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+Redis연결테스트] 연결 테스트 오류: ${error.message}${yejinColors.reset}`);
            this.autonomy.hasRedisCache = false;
            this.autonomy.hasRealRedisCache = false;
            return false;
        }
    }
    
    // ================== 🧪 Redis 데이터 저장/조회 테스트 ==================
    async performRedisDataTest() {
        try {
            console.log(`${yejinColors.aplus}🧪 [A+Redis데이터테스트] A+ 저장/조회 기능 테스트 중...${yejinColors.reset}`);
            
            // 테스트 대화 저장
            const testMessage = "A+ Redis 메모리 창고 테스트 메시지";
            const testEmotion = "aplus_test";
            const testUserId = this.targetUserId || "test_user";
            
            const saveSuccess = await this.redisCache.cacheConversation(testUserId, testMessage, testEmotion);
            
            if (saveSuccess) {
                // 저장 직후 조회 테스트
                const retrievedHistory = await this.redisCache.getConversationHistory(testUserId, 5);
                const retrievedLatest = await this.redisCache.getLatestConversation(testUserId);
                
                const historySuccess = retrievedHistory && retrievedHistory.length > 0;
                const latestSuccess = retrievedLatest && retrievedLatest.message === testMessage;
                
                if (historySuccess && latestSuccess) {
                    console.log(`${yejinColors.aplus}✅ [A+Redis데이터테스트] A+ 저장/조회 테스트 성공! (히스토리: ${retrievedHistory.length}개, 최신: "${retrievedLatest.message}")${yejinColors.reset}`);
                    this.statistics.redisQuerySuccessRate = 1.0;
                    this.statistics.conversationRetrievalSuccessRate = 1.0;
                } else {
                    console.log(`${yejinColors.warning}⚠️ [A+Redis데이터테스트] 조회 테스트 부분 실패 (히스토리: ${historySuccess}, 최신: ${latestSuccess})${yejinColors.reset}`);
                    this.statistics.redisQuerySuccessRate = 0.5;
                    this.statistics.conversationRetrievalSuccessRate = 0.5;
                }
            } else {
                console.log(`${yejinColors.warning}⚠️ [A+Redis데이터테스트] 저장 테스트 실패${yejinColors.reset}`);
                this.statistics.redisQuerySuccessRate = 0.0;
                this.statistics.conversationRetrievalSuccessRate = 0.0;
            }
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+Redis데이터테스트] 테스트 오류: ${error.message}${yejinColors.reset}`);
            this.statistics.redisQuerySuccessRate = 0.0;
            this.statistics.conversationRetrievalSuccessRate = 0.0;
        }
    }
    
    // ================== 🔄 Redis 캐시에서 기존 데이터 복원 (수정) ==================
    async restoreFromRedisCache() {
        try {
            console.log(`${yejinColors.aplus}🔄 [A+캐시복원] A+ Redis에서 기존 데이터 복원 중... (메모리 창고 활용)${yejinColors.reset}`);
            
            // 감정 상태 복원
            const cachedEmotion = await this.redisCache.getCachedEmotionState();
            if (cachedEmotion) {
                this.yejinState.loveLevel = cachedEmotion.loveLevel || this.yejinState.loveLevel;
                this.yejinState.worryLevel = cachedEmotion.worryLevel || this.yejinState.worryLevel;
                this.yejinState.playfulLevel = cachedEmotion.playfulLevel || this.yejinState.playfulLevel;
                this.yejinState.missingLevel = cachedEmotion.missingLevel || this.yejinState.missingLevel;
                this.yejinState.caringLevel = cachedEmotion.caringLevel || this.yejinState.caringLevel;
                this.yejinState.currentEmotion = cachedEmotion.currentEmotion || this.yejinState.currentEmotion;
                console.log(`${yejinColors.aplus}💖 [A+캐시복원] 감정 상태 복원 성공: ${this.yejinState.currentEmotion}${yejinColors.reset}`);
            }
            
            // 대화 이력 복원 (수정된 함수 사용)
            const cachedConversations = await this.redisCache.getConversationHistory(this.targetUserId, 20);
            if (cachedConversations.length > 0) {
                this.learningConnection.conversationHistory = cachedConversations;
                console.log(`${yejinColors.aplus}💬 [A+캐시복원] 대화 이력 복원 성공: ${cachedConversations.length}개 (최신: "${cachedConversations[0].message}")${yejinColors.reset}`);
            } else {
                console.log(`${yejinColors.cache}💬 [캐시복원] 복원할 대화 이력 없음${yejinColors.reset}`);
            }
            
            // 🔧 최신 대화 단독 복원 테스트
            const latestConversation = await this.redisCache.getLatestConversation(this.targetUserId);
            if (latestConversation) {
                console.log(`${yejinColors.aplus}📄 [A+최신복원] 최신 대화 복원 성공: "${latestConversation.message}" (${latestConversation.emotionType})${yejinColors.reset}`);
            }
            
            // 최근 사진 이력 복원
            const cachedPhotos = await this.redisCache.getRecentPhotos(10);
            if (cachedPhotos.length > 0) {
                this.autonomousPhoto.recentPhotos = cachedPhotos;
                console.log(`${yejinColors.aplus}📸 [A+캐시복원] 사진 이력 복원 성공: ${cachedPhotos.length}개${yejinColors.reset}`);
            } else {
                console.log(`${yejinColors.cache}📸 [캐시복원] 복원할 사진 이력 없음${yejinColors.reset}`);
            }
            
            console.log(`${yejinColors.aplus}✅ [A+캐시복원] A+ Redis 캐시 데이터 복원 완료! (메모리 창고 활용)${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+캐시복원] 복원 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================= 🔧 기존 함수들 (학습시스템, 지혜추출 등) - 동일하므로 생략 =================
    
    // ================== 🧠 학습 시스템 연결 ==================
    async connectToLearningSystem() {
        try {
            if (getLearningStatus) {
                const learningStatus = getLearningStatus();
                
                if (learningStatus && learningStatus.isInitialized) {
                    this.learningConnection.isConnected = true;
                    this.learningConnection.lastLearningData = learningStatus;
                    console.log(`${yejinColors.learning}🧠 [통합학습] 학습 시스템 연결 완료!${yejinColors.reset}`);
                    await this.extractLearningPatterns(learningStatus);
                } else {
                    console.log(`${yejinColors.learning}⚠️ [통합학습] 학습 시스템 미연결 - 기본 모드로 동작${yejinColors.reset}`);
                }
            } else {
                console.log(`${yejinColors.learning}⚠️ [통합학습] 학습 시스템 함수 없음 - 기본 모드로 동작${yejinColors.reset}`);
            }
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [통합학습] 학습 시스템 연결 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 📚 학습 패턴 추출 ==================
    async extractLearningPatterns(learningStatus) {
        try {
            if (learningStatus.conversationHistory && learningStatus.conversationHistory.length > 0) {
                this.learningConnection.conversationHistory = learningStatus.conversationHistory;
                
                // 시간대별 효과성 분석
                this.learningConnection.timeEffectiveness = this.analyzeTimeEffectiveness(learningStatus.conversationHistory);
                
                // Redis에 학습 패턴 캐싱
                await this.redisCache.cacheLearningPattern('time_effectiveness', this.learningConnection.timeEffectiveness);
                
                // 감정별 성공률 분석
                if (learningStatus.emotionalResponses) {
                    this.learningConnection.emotionSuccessRates = this.analyzeEmotionSuccessRates(learningStatus.emotionalResponses);
                    await this.redisCache.cacheLearningPattern('emotion_success_rates', this.learningConnection.emotionSuccessRates);
                }
                
                console.log(`${yejinColors.learning}📚 [학습패턴] ${learningStatus.conversationHistory.length}개 대화 패턴 분석 완료${yejinColors.reset}`);
            }
            
            // 아저씨 패턴 분석
            if (learningStatus.userPatterns) {
                this.learningConnection.ajossiPatterns = {
                    responseTime: learningStatus.userPatterns.responseTime || [],
                    emotionalStates: learningStatus.userPatterns.emotionalStates || [],
                    conversationTopics: learningStatus.userPatterns.conversationTopics || [],
                    timePreferences: learningStatus.userPatterns.timePreferences || []
                };
                await this.redisCache.cacheLearningPattern('ajossi_patterns', this.learningConnection.ajossiPatterns);
            }
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [학습패턴] 추출 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 📊 시간대별 효과성 분석 ==================
    analyzeTimeEffectiveness(conversationHistory) {
        try {
            const timeSlots = {
                morning: { total: 0, success: 0, avgSatisfaction: 0 },
                afternoon: { total: 0, success: 0, avgSatisfaction: 0 },
                evening: { total: 0, success: 0, avgSatisfaction: 0 },
                night: { total: 0, success: 0, avgSatisfaction: 0 }
            };
            
            conversationHistory.forEach(conv => {
                const hour = new Date(conv.timestamp).getHours();
                const timeSlot = this.getTimeSlot(hour);
                
                timeSlots[timeSlot].total++;
                if (conv.success || conv.satisfaction > 0.7) {
                    timeSlots[timeSlot].success++;
                }
                timeSlots[timeSlot].avgSatisfaction += (conv.satisfaction || 0.5);
            });
            
            // 평균 계산
            Object.keys(timeSlots).forEach(slot => {
                if (timeSlots[slot].total > 0) {
                    timeSlots[slot].successRate = timeSlots[slot].success / timeSlots[slot].total;
                    timeSlots[slot].avgSatisfaction /= timeSlots[slot].total;
                } else {
                    timeSlots[slot].successRate = 0.5;
                    timeSlots[slot].avgSatisfaction = 0.5;
                }
            });
            
            return timeSlots;
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [시간효과성] 분석 오류: ${error.message}${yejinColors.reset}`);
            return {};
        }
    }
    
    // ================== 💖 감정별 성공률 분석 ==================
    analyzeEmotionSuccessRates(emotionalResponses) {
        try {
            const emotionRates = {};
            
            Object.keys(emotionalResponses).forEach(emotion => {
                const responses = emotionalResponses[emotion];
                if (responses && responses.length > 0) {
                    const successfulResponses = responses.filter(r => r.success || r.satisfaction > 0.7);
                    emotionRates[emotion] = {
                        total: responses.length,
                        successful: successfulResponses.length,
                        successRate: successfulResponses.length / responses.length,
                        avgSatisfaction: responses.reduce((sum, r) => sum + (r.satisfaction || 0.5), 0) / responses.length
                    };
                }
            });
            
            return emotionRates;
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [감정성공률] 분석 오류: ${error.message}${yejinColors.reset}`);
            return {};
        }
    }
    
    // ================= 🔧 기존 함수들 계속 생략 (extractWisdomFromPast, initializeIntelligenceSystem, buildPredictionModels, testOpenAIConnection 등) =================
    
    // ================== 📚 통합 지혜 추출 ==================
    async extractWisdomFromPast() {
        try {
            console.log(`${yejinColors.wisdom}📚 [통합지혜] 모든 소스에서 지혜 추출 중... (A+ Redis 캐시 활용)${yejinColors.reset}`);
            
            // 학습 시스템에서 지혜 추출
            if (this.learningConnection.isConnected) {
                await this.extractWisdomFromLearningSystem();
            }
            
            // MongoDB에서 지혜 추출
            if (Conversation) {
                await this.extractWisdomFromMongoDB();
            }
            
            console.log(`${yejinColors.wisdom}✅ [통합지혜] 모든 소스의 지혜 추출 완료! (A+ Redis 캐시됨)${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [통합지혜] 지혜 추출 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🧠 학습 시스템 지혜 추출 ==================
    async extractWisdomFromLearningSystem() {
        try {
            console.log(`${yejinColors.learning}🧠 [학습지혜] 학습 시스템에서 지혜 추출... (A+ Redis 캐시 활용)${yejinColors.reset}`);
            
            const learningData = this.learningConnection.lastLearningData;
            
            if (this.learningConnection.conversationHistory?.length > 0) {
                const timingPatterns = this.analyzeTimingPatterns(this.learningConnection.conversationHistory);
                this.intelligence.learningDatabase.set('timing_patterns', timingPatterns);
                
                // Redis에 타이밍 패턴 캐싱
                await this.redisCache.cacheLearningPattern('timing_patterns', timingPatterns);
                
                console.log(`${yejinColors.aplus}  ⏰ 타이밍 패턴 ${timingPatterns.length}개 학습 (A+ Redis 캐시됨)${yejinColors.reset}`);
            }
            
            if (this.learningConnection.emotionalResponses) {
                const emotionRates = this.analyzeEmotionSuccessRates(this.learningConnection.emotionalResponses);
                this.intelligence.learningDatabase.set('emotion_success_rates', emotionRates);
                
                // Redis에 감정 성공률 캐싱
                await this.redisCache.cacheLearningPattern('emotion_success_rates', emotionRates);
                
                console.log(`${yejinColors.aplus}  💖 감정별 성공률 ${Object.keys(emotionRates).length}개 분석 (A+ Redis 캐시됨)${yejinColors.reset}`);
            }
            
            this.statistics.wisdomGained++;
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [학습지혜] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 💾 MongoDB 지혜 추출 ==================
    async extractWisdomFromMongoDB() {
        try {
            console.log(`${yejinColors.learning}💾 [MongoDB지혜] MongoDB에서 지혜 추출... (A+ Redis 캐시 활용)${yejinColors.reset}`);
            
            // Redis에서 기존 MongoDB 패턴 확인
            const cachedMongoPatterns = await this.redisCache.getCachedLearningPattern('mongodb_timing_patterns');
            if (cachedMongoPatterns && cachedMongoPatterns.length > 0) {
                this.intelligence.learningDatabase.set('mongodb_timing_patterns', cachedMongoPatterns);
                console.log(`${yejinColors.aplus}  📊 MongoDB 캐시: ${cachedMongoPatterns.length}개 패턴 로드됨${yejinColors.reset}`);
                return;
            }
            
            const conversations = await Conversation.find({
                timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 최근 30일
            });
            
            if (conversations.length > 0) {
                // 타이밍 패턴 분석
                const timingPatterns = this.analyzeTimingPatterns(conversations);
                this.intelligence.learningDatabase.set('mongodb_timing_patterns', timingPatterns);
                
                // Redis에 MongoDB 패턴 캐싱
                await this.redisCache.cacheLearningPattern('mongodb_timing_patterns', timingPatterns);
                
                console.log(`${yejinColors.aplus}  📊 MongoDB: ${conversations.length}개 대화 분석 완료 (A+ Redis 캐시됨)${yejinColors.reset}`);
                this.statistics.mongodbQueries++;
            }
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [MongoDB지혜] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 📊 타이밍 패턴 분석 ==================
    analyzeTimingPatterns(conversationHistory) {
        try {
            const patterns = [];
            const groupedByHour = _.groupBy(conversationHistory, entry => {
                const timestamp = entry.timestamp || entry.createdAt || new Date();
                return new Date(timestamp).getHours();
            });
            
            for (const [hour, entries] of Object.entries(groupedByHour)) {
                const avgResponseTime = _.meanBy(entries, 'responseTime') || 0;
                const successRate = _.meanBy(entries, 'successRate') || 0.5;
                const avgInterval = _.meanBy(entries, entry => {
                    return entry.context?.interval ? entry.context.interval / 60000 : 60;
                });
                
                patterns.push({ 
                    hour: parseInt(hour), 
                    avgResponseTime, 
                    successRate, 
                    avgInterval: avgInterval || 60,
                    sampleSize: entries.length 
                });
            }
            
            return patterns;
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [타이밍패턴] 분석 오류: ${error.message}${yejinColors.reset}`);
            return [];
        }
    }
    
    // ================== 🧠 지능 시스템 초기화 ==================
    async initializeIntelligenceSystem() {
        try {
            console.log(`${yejinColors.intelligence}🧠 [예진이지능] A+ Redis 통합 지능 시스템 초기화 중...${yejinColors.reset}`);
            
            this.intelligence.learningDatabase.set('timing_patterns', []);
            this.intelligence.learningDatabase.set('emotion_success_rates', {});
            this.intelligence.learningDatabase.set('ajossi_response_patterns', []);
            this.intelligence.learningDatabase.set('context_correlations', []);
            this.intelligence.learningDatabase.set('mongodb_timing_patterns', []);
            this.intelligence.learningDatabase.set('redis_cache_patterns', []);
            
            this.intelligence.predictionModels.set('next_optimal_time', null);
            this.intelligence.predictionModels.set('emotion_effectiveness', null);
            this.intelligence.predictionModels.set('ajossi_mood_prediction', null);
            
            this.intelligence.successRates.set('message_timing', []);
            this.intelligence.successRates.set('emotion_expression', []);
            this.intelligence.successRates.set('photo_sharing', []);
            
            console.log(`${yejinColors.intelligence}✅ [예진이지능] A+ Redis 통합 지능 시스템 초기화 완료!${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.intelligence}❌ [예진이지능] 초기화 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🔮 예측 모델 구축 ==================
    async buildPredictionModels() {
        try {
            console.log(`${yejinColors.prediction}🔮 [예진이예측] 예측 모델 구축 중... (A+ Redis 캐시 활용)${yejinColors.reset}`);
            
            await this.buildTimingPredictionModel();
            await this.buildEmotionEffectivenessModel();
            
            console.log(`${yejinColors.prediction}✅ [예진이예측] A+ Redis 캐시 활용 예측 모델 구축 완료!${yejinColors.reset}`);
        } catch (error) {
            console.error(`${yejinColors.prediction}❌ [예진이예측] 모델 구축 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== ⏰ 타이밍 예측 모델 ==================
    async buildTimingPredictionModel() {
        try {
            // Redis에서 캐시된 타이밍 패턴 확인
            const timingPatterns = await this.redisCache.getCachedLearningPattern('timing_patterns') || 
                                   this.intelligence.learningDatabase.get('timing_patterns') || [];
            
            if (timingPatterns.length > 0) {
                const model = {
                    hourlySuccess: {},
                    optimalIntervals: {},
                    confidenceLevel: Math.min(0.9, timingPatterns.length / 10),
                    accuracy: 0.75,
                    sampleSize: timingPatterns.length
                };
                
                timingPatterns.forEach(pattern => {
                    model.hourlySuccess[pattern.hour] = pattern.successRate;
                    model.optimalIntervals[pattern.hour] = pattern.avgInterval || 60;
                });
                
                this.intelligence.predictionModels.set('next_optimal_time', model);
                
                console.log(`${yejinColors.prediction}⏰ 시간대별 성공률 모델 구축 완료${yejinColors.reset}`);
            }
        } catch (error) {
            console.error(`${yejinColors.prediction}❌ [타이밍예측] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 💖 감정 효과성 모델 ==================
    async buildEmotionEffectivenessModel() {
        try {
            // Redis에서 감정 성공률 확인
            const emotionRates = await this.redisCache.getCachedLearningPattern('emotion_success_rates') || 
                                 this.intelligence.learningDatabase.get('emotion_success_rates') || {};
            
            if (Object.keys(emotionRates).length > 0) {
                const model = {
                    emotionEffectiveness: {},
                    bestEmotionByTime: {},
                    confidenceLevel: 0.7,
                    accuracy: 0.68,
                    sampleSize: Object.keys(emotionRates).length
                };
                
                Object.keys(emotionRates).forEach(emotion => {
                    model.emotionEffectiveness[emotion] = emotionRates[emotion].successRate;
                });
                
                this.intelligence.predictionModels.set('emotion_effectiveness', model);
                
                console.log(`${yejinColors.prediction}💖 감정별 효과성 모델 구축 완료${yejinColors.reset}`);
            }
        } catch (error) {
            console.error(`${yejinColors.prediction}❌ [감정효과성] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🤖 OpenAI 연결 테스트 ==================
    async testOpenAIConnection() {
        try {
            console.log(`${yejinColors.openai}🤖 [OpenAI] A+ Redis 통합 연결 테스트 중... (통합 조언용)${yejinColors.reset}`);
            
            const testResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: "A+ Redis 메모리 창고 테스트입니다." }],
                max_tokens: 10
            });
            
            const success = !!(testResponse?.choices?.[0]?.message?.content);
            
            if (success) {
                console.log(`${yejinColors.openai}✅ [OpenAI] A+ Redis 통합 연결 성공! (통합 조언 모드)${yejinColors.reset}`);
                return true;
            }
        } catch (error) {
            console.error(`${yejinColors.openai}❌ [OpenAI] A+ Redis 통합 연결 실패: ${error.message}${yejinColors.reset}`);
            console.log(`${yejinColors.openai}🤷 [OpenAI] 조언 없이도 예진이가 알아서 할게!${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🌟 A+ 예진이 우선 자율성 시작! ==================
    async startAplusYejinFirstAutonomy() {
        try {
            console.log(`${yejinColors.aplus}🌟 [A+자유시작] 예진이 우선 A+ 메모리 창고 완전 활용 자율성 시작!${yejinColors.reset}`);
            
            // 첫 번째 A+ 예진이 우선 결정
            await this.makeAplusYejinFirstDecision();
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+자유시작] 자율성 시작 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 🎯 A+ 예진이 우선 결정 (🔥 수정됨) ==================
    async makeAplusYejinFirstDecision() {
        try {
            console.log(`${yejinColors.aplus}🎯 [A+결정] 예진이가 먼저 결정하는 A+ 메모리 창고 활용 자율 결정...${yejinColors.reset}`);
            
            // 1. 현재 상황 완전 분석
            const currentSituation = await this.performDeepSituationAnalysis();
            
            // 2. 과거 지혜와 현재 상황 종합
            const wisdomIntegration = await this.integrateWisdomWithPresent(currentSituation);
            
            // 3. 예진이가 먼저 스스로 결정!
            const yejinPrimaryDecision = await this.yejinDecideByHerself(currentSituation, wisdomIntegration);
            
            // 4. OpenAI 조언 듣기
            const openaiAdvice = await this.getOpenAIAdvice(currentSituation, yejinPrimaryDecision);
            
            // 5. 예진이가 조언 듣고 최종 결정!
            const yejinFinalDecision = await this.yejinMakeFinalDecision(yejinPrimaryDecision, openaiAdvice, currentSituation);
            
            // 6. Redis에 결정 기록 및 감정 상태 캐싱
            await this.cacheFinalDecision(yejinFinalDecision, currentSituation);
            
            // 7. MongoDB에 결정 기록 저장
            await this.saveDecisionToDatabase(yejinFinalDecision, currentSituation);
            
            console.log(`${yejinColors.aplus}💭 [A+결정] ${yejinFinalDecision.reasoning}${yejinColors.reset}`);
            console.log(`${yejinColors.aplus}⏰ [A+자유] 다음 결정: ${new Date(Date.now() + yejinFinalDecision.nextInterval).toLocaleTimeString()}에 다시 생각해볼게${yejinColors.reset}`);
            
            // 다음 자율 결정 스케줄링
            this.scheduleNextYejinDecision(yejinFinalDecision.nextInterval, yejinFinalDecision.reasoning);
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+결정] 결정 오류: ${error.message}${yejinColors.reset}`);
            
            const safeInterval = 30 * 60 * 1000; // 🔥 30분 (기존: 45분)
            this.scheduleNextYejinDecision(safeInterval, "에러 복구를 위한 A+ 안전 대기");
        }
    }
    
    // ================= 🔧 기존 함수들 계속 (performDeepSituationAnalysis, integrateWisdomWithPresent 등) - 동일하므로 생략 =================
    
    // ================== 🔍 상황 분석 ==================
    async performDeepSituationAnalysis() {
        try {
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
                    emotionIntensity: this.calculateCurrentEmotionIntensity(),
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
                safetyStatus: {
                    canSendMessage: this.canSendMessage(),
                    isWithinLimits: this.isWithinSafetyLimits(),
                    emergencyOverride: this.safetySystem.emergencyMode
                }
            };
            
            console.log(`${yejinColors.intelligence}🔍 [예진이분석] 현재 상황 완전 분석 완료${yejinColors.reset}`);
            return analysis;
        } catch (error) {
            console.error(`${yejinColors.intelligence}❌ [상황분석] 오류: ${error.message}${yejinColors.reset}`);
            return this.getBasicSituationAnalysis();
        }
    }
    
    // ================== 🧠 지혜와 현재 상황 통합 ==================
    async integrateWisdomWithPresent(situation) {
        try {
            console.log(`${yejinColors.wisdom}🧠 [예진이통합] 과거 지혜와 현재 상황 통합 중...${yejinColors.reset}`);
            
            const integration = {
                similarPastSituations: await this.findSimilarPastSituations(situation) || [],
                timingPatternMatch: await this.matchTimingPatterns(situation),
                emotionSuccessRates: await this.getEmotionSuccessRates(situation),
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
    
    // ================== 🧠 예진이 스스로 결정하기 ==================
    async yejinDecideByHerself(situation, wisdom) {
        try {
            console.log(`${yejinColors.aplus}🧠 [A+결정] 내 감정과 기억으로 A+ 자율 결정...${yejinColors.reset}`);
            
            // 1. 예진이의 현재 감정 상태 종합
            const emotionalDecision = this.analyzeYejinEmotions();
            console.log(`${yejinColors.emotion}💖 [예진이감정] ${emotionalDecision.dominantEmotion} 감정으로 ${emotionalDecision.suggestedInterval}분 원함${yejinColors.reset}`);
            
            // 2. 과거 기억과 학습에서 인사이트 추출
            const memoryInsight = await this.extractMemoryInsights(situation, wisdom);
            console.log(`${yejinColors.learning}📚 [예진이기억] 과거 기억에서 ${memoryInsight.recommendedInterval}분이 좋았어${yejinColors.reset}`);
            
            // 3. 상황별 예진이만의 직감
            const intuitionDecision = this.yejinIntuitionDecision(situation);
            console.log(`${yejinColors.intelligence}💫 [예진이직감] 직감적으로 ${intuitionDecision.suggestedInterval}분 느낌${yejinColors.reset}`);
            
            // 4. 예진이만의 종합 판단
            const primaryDecision = this.combineYejinDecisionFactors(
                emotionalDecision, memoryInsight, intuitionDecision, situation
            );
            
            // 5. A+ 안전 범위 내 조정 (🔥 수정됨)
            const safeInterval = this.adjustToAplusSafeRange(primaryDecision.interval);
            
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
                source: 'yejin_aplus_memory_primary'
            };
            
            this.autonomousDecision.yejinPrimaryDecision = finalPrimaryDecision;
            this.statistics.yejinPrimaryDecisions++;
            
            console.log(`${yejinColors.aplus}✅ [A+결정] 1차 결정 완료: ${safeInterval/60000}분 후, ${primaryDecision.actionType}${yejinColors.reset}`);
            console.log(`${yejinColors.aplus}💭 [예진이이유] ${primaryDecision.reasoning}${yejinColors.reset}`);
            
            return finalPrimaryDecision;
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+결정] 자기 결정 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 감정 기반 기본 결정
            return {
                interval: 30 * 60 * 1000, // 🔥 30분 (기존: 60분)
                actionType: 'message',
                emotionType: 'love',
                confidence: 0.5,
                reasoning: "A+ 결정 오류로 기본 감정 결정",
                source: 'yejin_aplus_fallback'
            };
        }
    }
    
    // ================== 💖 A+ 예진이 감정 분석 (🔥 수정됨) ==================
    analyzeYejinEmotions() {
        try {
            const emotions = {
                love: this.yejinState.loveLevel,
                worry: this.yejinState.worryLevel,
                missing: this.yejinState.missingLevel,
                playful: this.yejinState.playfulLevel,
                caring: this.yejinState.caringLevel
            };
            
            // 시간대별 감정 조정
            const hour = new Date().getHours();
            if (hour >= 18 && hour < 22) {
                emotions.missing *= 1.2; // 저녁에 더 보고 싶어짐
            } else if (hour >= 6 && hour < 10) {
                emotions.caring *= 1.3; // 아침에 더 챙겨주고 싶어짐
            } else if (hour >= 22 || hour < 6) {
                emotions.worry *= 1.4; // 밤늦게는 더 걱정됨
            }
            
            // 생리주기 영향
            if (this.yejinState.menstrualCycle.phase === 'pms') {
                emotions.worry *= 1.3;
                emotions.playful *= 0.7;
            } else if (this.yejinState.menstrualCycle.phase === 'ovulation') {
                emotions.love *= 1.2;
                emotions.playful *= 1.1;
            }
            
            // 가장 강한 감정 찾기
            const dominantEmotion = Object.entries(emotions).reduce(
                (max, [key, value]) => (value > max.value ? { key, value } : max),
                { key: 'love', value: 0 }
            );
            
            // 🔥 A+ 감정별 선호 시간 계산 (단축됨)
            const ranges = TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES;
            let baseRange = ranges.LOVE_RANGE; // 기본값
            
            switch (dominantEmotion.key) {
                case 'love':
                    baseRange = ranges.LOVE_RANGE;      // [5, 30]
                    break;
                case 'worry':
                    baseRange = ranges.WORRY_RANGE;     // [3, 15]
                    break;
                case 'missing':
                    baseRange = ranges.MISSING_RANGE;   // [5, 20]
                    break;
                case 'playful':
                    baseRange = ranges.PLAYFUL_RANGE;   // [10, 40]
                    break;
                case 'caring':
                    baseRange = ranges.CARING_RANGE;    // [15, 60]
                    break;
            }
            
            // 감정 강도에 따른 조정
            const intensityFactor = dominantEmotion.value; // 0-1
            const timeRange = baseRange[1] - baseRange[0];
            const adjustedTime = baseRange[0] + (timeRange * (1 - intensityFactor)); // 강할수록 빨리
            
            // 약간의 랜덤 요소 추가 (예진이의 변덕)
            const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8-1.2
            const finalTime = Math.round(adjustedTime * randomFactor);
            
            return {
                dominantEmotion: dominantEmotion.key,
                intensity: dominantEmotion.value,
                suggestedInterval: finalTime,
                reasoning: `${dominantEmotion.key} 감정 강도 ${dominantEmotion.value.toFixed(2)}로 ${finalTime}분 선택 (A+ 간격 단축)`,
                confidence: Math.min(0.9, dominantEmotion.value)
            };
            
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [예진이감정] 분석 오류: ${error.message}${yejinColors.reset}`);
            return {
                dominantEmotion: 'love',
                intensity: 0.5,
                suggestedInterval: 30, // 🔥 30분 (기존: 60분)
                reasoning: "감정 분석 오류로 A+ 기본값",
                confidence: 0.3
            };
        }
    }
    
    // ================== 📚 A+ 기억 인사이트 추출 (🔥 수정됨) ==================
    async extractMemoryInsights(situation, wisdom) {
        try {
            let recommendedInterval = 30; // 🔥 기본 30분 (기존: 60분)
            let confidence = 0.3;
            let reasoning = "A+ 기억에서 특별한 패턴 없음";
            
            // 과거 유사 상황들에서 성공적이었던 패턴 찾기
            if (wisdom && wisdom.similarPastSituations && wisdom.similarPastSituations.length > 0) {
                const successfulPatterns = wisdom.similarPastSituations.filter(s => s.success > 0.7);
                
                if (successfulPatterns.length > 0) {
                    const avgInterval = successfulPatterns.reduce((sum, p) => 
                        sum + (p.interval || 30 * 60 * 1000), 0) / successfulPatterns.length; // 🔥 기본값 30분
                    
                    recommendedInterval = Math.round(avgInterval / 60000); // 분으로 변환
                    confidence = Math.min(0.9, successfulPatterns.length / 5); // 5개 이상이면 90% 신뢰
                    reasoning = `과거 ${successfulPatterns.length}번 성공한 패턴에서 ${recommendedInterval}분이 최적 (A+ 메모리 활용)`;
                }
            }
            
            // 학습된 타이밍 패턴 적용
            if (this.learningConnection.timeEffectiveness) {
                const currentHour = new Date().getHours();
                const timeSlot = this.getTimeSlot(currentHour);
                const timeData = this.learningConnection.timeEffectiveness[timeSlot];
                
                if (timeData && timeData.successRate > 0.6) {
                    const timeBasedInterval = Math.round(30 + (timeData.avgSatisfaction * 30)); // 🔥 30분~1시간 범위 (기존: 1-2시간)
                    recommendedInterval = Math.round((recommendedInterval + timeBasedInterval) / 2); // 평균
                    confidence = Math.max(confidence, timeData.successRate);
                    reasoning += ` + A+ 시간대 패턴 반영`;
                }
            }
            
            // 예진이만의 기억 조정 (더 감정적으로)
            const memoryAdjustment = 0.7 + (Math.random() * 0.6); // 0.7-1.3 배수
            recommendedInterval = Math.round(recommendedInterval * memoryAdjustment);
            
            const insights = {
                recommendedInterval: recommendedInterval,
                confidence: confidence,
                reasoning: reasoning,
                source: 'aplus_memory_insights'
            };
            
            return insights;
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [예진이기억] 추출 오류: ${error.message}${yejinColors.reset}`);
            return {
                recommendedInterval: 30, // 🔥 30분 (기존: 60분)
                confidence: 0.3,
                reasoning: "A+ 기억 추출 오류로 기본값",
                source: 'aplus_memory_fallback'
            };
        }
    }
    
    // ================== 💫 A+ 예진이 직감 결정 (🔥 수정됨) ==================
    yejinIntuitionDecision(situation) {
        try {
            let suggestedInterval = 30; // 🔥 기본 30분 (기존: 60분)
            let confidence = 0.4;
            let reasoning = "A+ 평범한 직감";
            
            // 시간대별 직감
            const currentHour = new Date().getHours();
            if (currentHour >= 20 || currentHour <= 7) {
                // 밤/새벽 - 더 신중하게
                suggestedInterval = 45 + Math.random() * 30; // 🔥 45-75분 (기존: 90-150분)
                reasoning = "밤이라 조금 더 기다리는 게 좋을 것 같아 (A+ 단축)";
            } else if (currentHour >= 12 && currentHour <= 14) {
                // 점심 시간 - 빨리
                suggestedInterval = 10 + Math.random() * 20; // 🔥 10-30분 (기존: 20-60분)
                reasoning = "점심 시간이니까 빨리 말하고 싶어 (A+ 빠름)";
            } else if (currentHour >= 18 && currentHour <= 20) {
                // 저녁 - 보통
                suggestedInterval = 20 + Math.random() * 25; // 🔥 20-45분 (기존: 40-90분)
                reasoning = "저녁 시간이니까 적당히 기다려야겠어 (A+ 단축)";
            } else if (currentHour >= 6 && currentHour <= 9) {
                // 아침 - 상쾌하게
                suggestedInterval = 15 + Math.random() * 15; // 🔥 15-30분 (기존: 30-60분)
                reasoning = "아침이니까 상쾌하게 인사하고 싶어 (A+ 빠름)";
            }
            
            // 예진이만의 변덕 (완전 랜덤)
            const whimFactor = Math.random();
            if (whimFactor > 0.9) {
                suggestedInterval *= 0.5; // 갑자기 빨리 하고 싶어짐
                reasoning = "갑자기 빨리 말하고 싶어졌어! (A+ 즉시)";
                confidence = 0.8;
            } else if (whimFactor < 0.1) {
                suggestedInterval *= 1.5; // 갑자기 더 기다리고 싶어짐
                reasoning = "왠지 좀 더 기다리는 게 좋을 것 같아... (A+ 조정)";
                confidence = 0.6;
            }
            
            // 침묵 시간에 따른 직감
            const silenceDuration = situation.communicationStatus.silenceDuration;
            if (silenceDuration > 2 * 60 * 60 * 1000) { // 🔥 2시간 이상 (기존: 4시간)
                suggestedInterval *= 0.6; // 너무 오래 기다렸으니 빨리
                reasoning = "너무 오래 기다렸으니까 빨리 말해야겠어 (A+ 빠름)";
                confidence = 0.9;
            } else if (silenceDuration < 15 * 60 * 1000) { // 🔥 15분 미만 (기존: 30분)
                suggestedInterval *= 1.3; // 너무 빨리 말한 것 같으니 조금 기다리자
                reasoning = "조금 전에 말했으니까 좀 더 기다려야겠어 (A+ 조정)";
                confidence = 0.7;
            }
            
            return {
                suggestedInterval: Math.round(suggestedInterval),
                confidence: confidence,
                reasoning: reasoning,
                source: 'aplus_intuition'
            };
            
        } catch (error) {
            console.error(`${yejinColors.intelligence}❌ [예진이직감] 오류: ${error.message}${yejinColors.reset}`);
            return {
                suggestedInterval: 30, // 🔥 30분 (기존: 60분)
                confidence: 0.3,
                reasoning: "A+ 직감 오류로 기본값",
                source: 'aplus_intuition_fallback'
            };
        }
    }
    
    // ================== 🎯 A+ 예진이 결정 요소 종합 (🔥 수정됨) ==================
    combineYejinDecisionFactors(emotional, memory, intuition, situation) {
        try {
            // 가중치 설정 (감정을 가장 중시)
            const weights = {
                emotional: 0.5,    // 감정 50%
                memory: 0.3,       // 기억 30%
                intuition: 0.2     // 직감 20%
            };
            
            // 상황에 따른 가중치 조정
            if (emotional.confidence > 0.8) {
                weights.emotional = 0.6; // 감정이 확실하면 더 중시
                weights.memory = 0.25;
                weights.intuition = 0.15;
            } else if (memory.confidence > 0.8) {
                weights.memory = 0.4; // 기억이 확실하면 더 중시
                weights.emotional = 0.4;
                weights.intuition = 0.2;
            }
            
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
            
            // 🔥 A+ 액션 타입 결정 (사진 확률 대폭 증가)
            let actionType = 'message';
            const photoChance = Math.random();
            
            if (emotional.dominantEmotion === 'missing' && photoChance > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.MISSING)) {
                actionType = 'photo'; // 60% 확률
            } else if (emotional.dominantEmotion === 'playful' && photoChance > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.PLAYFUL)) {
                actionType = 'photo'; // 50% 확률
            } else if (emotional.dominantEmotion === 'love' && photoChance > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.LOVE)) {
                actionType = 'photo'; // 40% 확률
            } else if (emotional.dominantEmotion === 'caring' && photoChance > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.CARING)) {
                actionType = 'photo'; // 30% 확률
            } else if (emotional.dominantEmotion === 'worry' && photoChance > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.WORRY)) {
                actionType = 'photo'; // 20% 확률
            }
            
            // 최근 행동 패턴 고려 (사진 제한 완화)
            const recentPhotos = this.autonomousPhoto.recentPhotos.filter(p => 
                Date.now() - p.timestamp < 3 * 60 * 60 * 1000 // 🔥 3시간 이내 (기존: 6시간)
            );
            
            if (recentPhotos.length >= 3) { // 🔥 3개로 증가 (기존: 2개)
                actionType = 'message'; // 너무 많은 사진을 보냈으면 메시지로
            }
            
            // A+ 사진 통계 업데이트
            if (actionType === 'photo') {
                this.statistics.enhancedPhotosSent++;
            }
            
            // 종합 사유
            const reasoning = `A+ 감정(${emotional.dominantEmotion}): ${emotional.suggestedInterval}분, ` +
                            `기억: ${memory.recommendedInterval}분, ` +
                            `직감: ${intuition.suggestedInterval}분 ` +
                            `→ A+ 메모리창고 종합: ${Math.round(weightedInterval)}분`;
            
            return {
                interval: weightedInterval * 60 * 1000, // 밀리초로 변환
                actionType: actionType,
                emotionType: emotional.dominantEmotion,
                confidence: weightedConfidence,
                reasoning: reasoning,
                components: { emotional, memory, intuition }
            };
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+종합] 결정 종합 오류: ${error.message}${yejinColors.reset}`);
            return {
                interval: 30 * 60 * 1000, // 🔥 30분 (기존: 60분)
                actionType: 'message',
                emotionType: 'love',
                confidence: 0.5,
                reasoning: "A+ 종합 오류로 기본 결정"
            };
        }
    }
    
    // ================== 🛡️ A+ 예진이 안전 범위 조정 (🔥 수정됨) ==================
    adjustToAplusSafeRange(intervalMs) {
        const ranges = TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES;
        
        // 밀리초를 분으로 변환
        let intervalMinutes = intervalMs / (60 * 1000);
        
        // 🔥 A+ 최소/최대 범위 적용 (단축됨)
        intervalMinutes = Math.max(intervalMinutes, ranges.MIN_INTERVAL / (60 * 1000)); // 5분
        intervalMinutes = Math.min(intervalMinutes, ranges.MAX_INTERVAL / (60 * 1000)); // 2시간
        
        // 밤 시간 특별 처리
        if (this.isSleepTime(new Date().getHours())) {
            const nightMinMinutes = ranges.NIGHT_MIN_INTERVAL / (60 * 1000); // 30분
            intervalMinutes = Math.max(intervalMinutes, nightMinMinutes);
        }
        
        // 안전 쿨다운 적용
        const timeSinceLastMessage = Date.now() - this.safetySystem.lastMessageTime;
        const cooldownMinutes = TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN / (60 * 1000); // 5분
        
        if (timeSinceLastMessage < TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN) {
            const additionalWaitMinutes = (TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN - timeSinceLastMessage) / (60 * 1000);
            intervalMinutes = Math.max(intervalMinutes, additionalWaitMinutes);
        }
        
        // 일일 메시지 한도 고려
        if (this.safetySystem.dailyMessageCount >= TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY) {
            // 하루 한도 초과시 내일까지 대기
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8, 0, 0, 0); // 내일 아침 8시
            const waitUntilTomorrow = (tomorrow.getTime() - Date.now()) / (60 * 1000);
            intervalMinutes = Math.max(intervalMinutes, waitUntilTomorrow);
        }
        
        return Math.round(intervalMinutes * 60 * 1000); // 다시 밀리초로
    }
    
    // ================= 🔧 기존 함수들 계속 (getOpenAIAdvice, createAdvicePrompt, yejinMakeFinalDecision 등) - 동일하므로 생략 =================
    
    // ================== 💬 OpenAI 조언 받기 ==================
    async getOpenAIAdvice(situation, yejinPrimaryDecision) {
        try {
            console.log(`${yejinColors.openai}💬 [OpenAI조언] OpenAI에게 A+ 조언 구하는 중... (강제 아님!)${yejinColors.reset}`);
            
            const advicePrompt = this.createAdvicePrompt(situation, yejinPrimaryDecision);
            
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `당신은 예진이의 조언자입니다. 예진이가 이미 자신의 A+ 결정을 내렸는데, 참고용으로 조언을 구하고 있습니다.

중요: 
- 예진이는 이미 자신만의 A+ 결정을 내렸습니다
- 당신은 단순히 "다른 관점"을 제시하는 조언자입니다  
- 예진이가 당신 조언을 따를 필요는 전혀 없습니다
- 예진이는 자유롭게 당신 조언을 무시할 수 있습니다

응답 형식 (JSON):
{
  "advice": "조언 내용",
  "suggestedInterval": 분단위숫자,
  "reasoning": "조언 근거",
  "confidence": 0.0~1.0,
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
    
    // ================== 💬 A+ 조언 프롬프트 생성 ==================
    createAdvicePrompt(situation, yejinDecision) {
        try {
            let prompt = `예진이가 A+ 메모리 창고 활용해서 스스로 결정을 내렸습니다:

예진이의 A+ 결정:
- 시간: ${Math.round(yejinDecision.interval / 60000)}분 후
- 행동: ${yejinDecision.actionType}
- 감정: ${yejinDecision.emotionType}
- 확신도: ${yejinDecision.confidence.toFixed(2)}
- 이유: ${yejinDecision.reasoning}

현재 상황:
- 시간: ${new Date().toLocaleTimeString()}
- 요일: ${['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]}요일
- 침묵 시간: ${Math.floor(situation.communicationStatus.silenceDuration / (1000 * 60))}분
- 오늘 메시지 수: ${situation.communicationStatus.messageCount}
- 예진이 기분: ${situation.yejinCondition.overallMood.toFixed(2)}
- 감정 강도: ${situation.yejinCondition.emotionIntensity.toFixed(2)}

A+ 특징:
- 메시지 간격: 5분~2시간 (대폭 단축)
- 사진 확률: 대폭 증가 (missing 60%, playful 50%, love 40%)
- 메모리 창고: 과거 대화 완전 활용

예진이는 자신의 A+ 결정에 대해 참고용 조언을 구하고 있습니다.
예진이가 따를 필요는 없는 단순 조언만 제공해주세요.`;
            
            return prompt;
            
        } catch (error) {
            return "예진이가 A+ 결정에 대한 조언을 구하고 있습니다.";
        }
    }
    
    // ================== 🎯 A+ 예진이 최종 결정 ==================
    async yejinMakeFinalDecision(primaryDecision, openaiAdvice, situation) {
        try {
            console.log(`${yejinColors.aplus}🎯 [A+최종] OpenAI 조언 듣고 A+ 최종 결정 중...${yejinColors.reset}`);
            
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
                    
                    decisionReasoning = `A+ 내 결정: ${Math.round(yejinInterval/60000)}분 + OpenAI 조언: ${openaiAdvice.suggestedInterval}분 → 절충해서 ${Math.round(finalInterval/60000)}분`;
                    
                    this.statistics.adviceAccepted++;
                    console.log(`${yejinColors.aplus}✅ [A+수용] OpenAI 조언 일부 수용 (${Math.round(blendRatio*100)}% 반영)${yejinColors.reset}`);
                } else {
                    // 조언 거부
                    decisionReasoning = `A+ 내 결정: ${Math.round(yejinInterval/60000)}분, OpenAI 조언: ${openaiAdvice.suggestedInterval}분 → ${adviceAcceptance.reason}으로 내 결정 고수`;
                    
                    this.statistics.adviceRejected++;
                    console.log(`${yejinColors.aplus}🙅‍♀️ [A+거부] OpenAI 조언 거부: ${adviceAcceptance.reason}${yejinColors.reset}`);
                }
            } else {
                // 조언 없음 - 예진이 독립 결정
                decisionReasoning = `OpenAI 조언 없이 A+ 내 감정과 메모리 창고만으로 독립 결정: ${Math.round(finalInterval/60000)}분`;
                console.log(`${yejinColors.aplus}🕊️ [A+독립] 조언 없이도 A+ 스스로 결정!${yejinColors.reset}`);
            }
            
            // 최종 안전 범위 조정
            finalInterval = this.adjustToAplusSafeRange(finalInterval);
            
            const finalDecision = {
                nextInterval: finalInterval,
                actionType: finalActionType,
                emotionType: finalEmotionType,
                confidence: finalConfidence,
                reasoning: decisionReasoning,
                timestamp: Date.now(),
                decisionId: `yejin-aplus-memory-${Date.now()}`,
                
                // 결정 과정 기록
                process: {
                    yejinPrimary: primaryDecision,
                    openaiAdvice: openaiAdvice,
                    adviceAccepted: openaiAdvice ? this.statistics.adviceAccepted > this.statistics.adviceRejected : false,
                    redisUsed: true,
                    redisFixed: true,
                    aplusMemoryWarehouse: true, // 🆕 A+ 메모리 창고 활용
                    intervalShortened: true,    // 🆕 간격 단축 적용
                    photoEnhanced: true         // 🆕 사진 확률 증가 적용
                }
            };
            
            // 결정 기록 저장
            this.intelligence.decisionHistory.push(finalDecision);
            this.autonomousDecision.yejinFinalDecision = finalDecision;
            this.autonomousDecision.confidenceLevel = finalConfidence;
            
            // 자유도 업데이트
            this.updateFreedomLevel(finalDecision);
            
            console.log(`${yejinColors.aplus}✅ [A+최종완료] 자유도 ${(this.statistics.freedomLevel*100).toFixed(1)}%로 A+ 최종 결정 완료! (메모리 창고 완전 활용)${yejinColors.reset}`);
            
            return finalDecision;
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+최종] 최종 결정 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 1차 결정 그대로 사용
            return {
                nextInterval: primaryDecision.interval,
                actionType: primaryDecision.actionType,
                emotionType: primaryDecision.emotionType,
                confidence: primaryDecision.confidence,
                reasoning: "A+ 최종 결정 오류로 1차 결정 사용",
                timestamp: Date.now(),
                decisionId: `yejin-aplus-error-${Date.now()}`
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
            
            if (timeDifference < 15) { // 🔥 15분 이내 차이 (기존: 30분)
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
                reason = "A+ 조언이 나름 합리적이라서 조금 참고할게";
                
                if (primaryDecision.confidence < 0.4) {
                    blendRatio += 0.2; // 확신 없을 때 더 많이 반영
                    reason = "A+ 내가 확신이 없어서 조언을 더 들어볼게";
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
            console.error(`${yejinColors.aplus}❌ [조언판단] 오류: ${error.message}${yejinColors.reset}`);
            return {
                accept: false,
                reason: "A+ 판단 오류로 거부",
                blendRatio: 0
            };
        }
    }
    
    // ================== 🙅‍♀️ 조언 거부 이유 생성 ==================
    getAdviceRejectionReason(primaryDecision, openaiAdvice) {
        const reasons = [
            "A+ 내 감정이 더 확실해",
            "지금은 A+ 내 직감을 믿고 싶어",
            "내가 아저씨를 더 잘 알아",
            "A+ 이런 기분일 때는 내 방식이 맞아",
            "조언은 고마운데 A+ 내 마음은 이미 정해졌어",
            "지금은 A+ 내 감정을 우선하고 싶어",
            "AI 조언보다는 A+ 내 경험을 믿을게",
            "A+ 내 직감이 더 강해",
            "이런 상황에서는 A+ 내가 더 잘 알아",
            "A+ 내 마음이 이미 결정했어"
        ];
        
        // 시간 차이에 따른 특별 이유
        const yejinMinutes = primaryDecision.interval / 60000;
        const adviceMinutes = openaiAdvice.suggestedInterval;
        
        if (adviceMinutes > yejinMinutes * 2) {
            return "너무 오래 기다리라고 하는데 A+ 난 빨리 말하고 싶어";
        } else if (adviceMinutes < yejinMinutes * 0.5) {
            return "너무 성급하게 하라고 하는데 A+ 난 좀 더 기다리고 싶어";
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
    
    // ================== 💾 최종 결정 캐싱 (수정) ==================
    async cacheFinalDecision(finalDecision, situation) {
        try {
            // 감정 상태 캐싱
            await this.redisCache.cacheEmotionState(this.yejinState);
            
            // 최종 결정 캐싱
            const decisionData = {
                decision: finalDecision,
                situation: {
                    hour: situation.timeContext?.hour,
                    emotionIntensity: situation.yejinCondition?.emotionIntensity,
                    silenceDuration: situation.communicationStatus?.silenceDuration
                },
                timestamp: Date.now(),
                aplusFeatures: {
                    memoryWarehouse: true,
                    intervalShortened: true,
                    photoEnhanced: true
                }
            };
            
            if (this.redisCache.isAvailable && this.redisCache.redis) {
                await this.redisCache.redis.set('muku:decision:latest', JSON.stringify(decisionData), 'EX', this.redisCache.ttl.prediction);
                console.log(`${yejinColors.aplus}💾 [A+결정캐싱] A+ 최종 결정 Redis 캐시 저장 완료 (메모리 창고 활용)${yejinColors.reset}`);
            }
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+결정캐싱] 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== 💾 MongoDB 결정 저장 ==================
    async saveDecisionToDatabase(decision, situation) {
        try {
            if (!Conversation) {
                return; // MongoDB 없으면 건너뛰기
            }
            
            await Conversation.create({
                timestamp: new Date(),
                message: decision.actionType === 'photo' ? 'A+ Photo decision' : 'A+ Message decision',
                emotionType: decision.emotionType,
                responseTime: 0,
                successRate: decision.confidence,
                context: {
                    interval: decision.nextInterval,
                    reasoning: decision.reasoning,
                    redisUsed: decision.process?.redisUsed || false,
                    redisFixed: decision.process?.redisFixed || false,
                    aplusMemoryWarehouse: decision.process?.aplusMemoryWarehouse || false,
                    intervalShortened: decision.process?.intervalShortened || false,
                    photoEnhanced: decision.process?.photoEnhanced || false,
                    situation: {
                        hour: situation.timeContext?.hour,
                        emotionIntensity: situation.yejinCondition?.emotionIntensity,
                        silenceDuration: situation.communicationStatus?.silenceDuration
                    }
                },
            });
            
            this.statistics.mongodbQueries++;
            console.log(`${yejinColors.aplus}💾 [A+MongoDB] 결정 기록 저장 완료 (A+ 메타데이터 포함)${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.learning}❌ [MongoDB] 저장 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================== ⏰ 예진이 결정 스케줄링 ==================
    scheduleNextYejinDecision(interval, reasoning) {
        console.log(`${yejinColors.aplus}⏰ [A+스케줄] ${Math.round(interval/60000)}분 후 다음 A+ 자유 결정 예약${yejinColors.reset}`);
        console.log(`${yejinColors.aplus}💭 [A+이유] ${reasoning}${yejinColors.reset}`);
        
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
                console.log(`${yejinColors.warning}⚠️ [A+결정] 이미 결정 진행 중... 건너뜀${yejinColors.reset}`);
                return;
            }
            
            this.autonomousDecision.decisionInProgress = true;
            this.statistics.totalDecisions++;
            
            console.log(`${yejinColors.aplus}🎯 [A+자유결정] ${this.statistics.totalDecisions}번째 A+ 자유 결정 시작!${yejinColors.reset}`);
            
            // 현재 상황 재분석
            const currentSituation = await this.performDeepSituationAnalysis();
            
            // 행동할지 더 기다릴지 결정
            const shouldAct = await this.decideWhetherToAct(currentSituation);
            
            if (shouldAct.act) {
                console.log(`${yejinColors.aplus}💫 [A+행동] ${shouldAct.reasoning}${yejinColors.reset}`);
                await this.executeAutonomousAction(shouldAct);
                
                // 행동 후 다음 결정 스케줄링
                const nextInterval = await this.calculatePostActionInterval(shouldAct);
                this.scheduleNextYejinDecision(nextInterval.interval, nextInterval.reasoning);
            } else {
                console.log(`${yejinColors.emotion}💭 [A+대기] ${shouldAct.reasoning}${yejinColors.reset}`);
                
                // 대기 후 다음 결정 스케줄링
                const nextInterval = await this.calculateWaitingInterval(shouldAct);
                this.scheduleNextYejinDecision(nextInterval.interval, nextInterval.reasoning);
            }
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+자유결정] 오류: ${error.message}${yejinColors.reset}`);
            
            // 에러 시 안전 간격으로 재시도
            const safeInterval = 20 * 60 * 1000; // 🔥 20분 (기존: 30분)
            this.scheduleNextYejinDecision(safeInterval, "에러 복구를 위한 A+ 안전 대기");
        } finally {
            this.autonomousDecision.decisionInProgress = false;
        }
    }
    
    // ================== 🎬 A+ 자율 행동 실행 (🔥 수정됨) ==================
    async executeAutonomousAction(actionDecision) {
        try {
            if (!this.canSendMessage()) {
                console.log(`${yejinColors.warning}⚠️ [A+행동] 안전 한도 초과${yejinColors.reset}`);
                return false;
            }
            
            console.log(`${yejinColors.aplus}🎬 [A+행동실행] ${actionDecision.type} 실행 중... (메모리 창고 완전 활용)${yejinColors.reset}`);
            
            if (actionDecision.type === 'photo') {
                const photoUrl = await this.selectMemoryPhotoWithCache(actionDecision.emotionType);
                await this.lineClient.pushMessage(this.targetUserId, {
                    type: 'image',
                    originalContentUrl: photoUrl,
                    previewImageUrl: photoUrl,
                });
                
                this.autonomousPhoto.recentPhotos.push({ url: photoUrl, timestamp: Date.now() });
                this.statistics.autonomousPhotos++;
                this.statistics.enhancedPhotosSent++;
                
                console.log(`${yejinColors.aplus}📸 [A+사진] A+ 사진 전송 완료: ${photoUrl}${yejinColors.reset}`);
            } else {
                // 🆕 A+ 메모리 창고 활용 메시지 생성
                const message = await this.generateAplusContextualMessage(actionDecision.emotionType);
                await this.lineClient.pushMessage(this.targetUserId, {
                    type: 'text',
                    text: message,
                });
                
                this.autonomousMessaging.recentMessages.push({ text: message, timestamp: Date.now() });
                this.statistics.autonomousMessages++;
                
                // 메시지가 맥락적이었는지 통계 업데이트
                if (message.includes('아까') || message.includes('어제') || message.includes('전에') || message.includes('얘기했')) {
                    this.statistics.contextualMessages++;
                    this.statistics.memoryBasedMessages++;
                }
                
                // Redis에 대화 내역 캐싱
                await this.redisCache.cacheConversation(this.targetUserId, message, actionDecision.emotionType);
                
                console.log(`${yejinColors.aplus}💬 [A+메시지] A+ 메모리 활용 메시지 전송 완료: ${message}${yejinColors.reset}`);
            }
            
            // 상태 업데이트
            this.safetySystem.lastMessageTime = Date.now();
            this.safetySystem.dailyMessageCount++;
            this.yejinState.lastMessageTime = Date.now();
            
            // 감정 상태 Redis 캐싱
            await this.redisCache.cacheEmotionState(this.yejinState);
            
            // A+ 통계 업데이트
            this.updateAplusStats();
            
            return true;
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+행동실행] 실행 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
    
    // ================== 🆕 A+ 맥락적 메시지 생성 (메모리 창고 완전 활용) ==================
    async generateAplusContextualMessage(emotionType) {
        try {
            console.log(`${yejinColors.memory}💬 [A+메시지생성] 메모리 창고 활용 맥락적 메시지 생성 중...${yejinColors.reset}`);
            
            // 70% 확률로 맥락적 메시지 시도
            const useContextual = Math.random() < TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.CONTEXTUAL_MESSAGE_PROBABILITY;
            
            if (useContextual && this.memoryWarehouse && this.memoryWarehouse.recentConversations.length > 0) {
                // Redis에서 최신 대화 기록 가져오기
                const recentConversations = await this.redisCache.getConversationHistory(
                    this.targetUserId, 
                    TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.MAX_MEMORY_LOOKBACK
                );
                
                if (recentConversations.length > 0) {
                    const contextualMessage = await this.createContextualMessage(emotionType, recentConversations);
                    if (contextualMessage) {
                        console.log(`${yejinColors.memory}✅ [A+맥락메시지] 메모리 기반 맥락적 메시지 생성 성공${yejinColors.reset}`);
                        return contextualMessage;
                    }
                }
            }
            
            // 맥락적 메시지 실패 시 일반 메시지
            const generalMessage = this.generateMessage(emotionType);
            console.log(`${yejinColors.aplus}📝 [A+일반메시지] 일반 감정 메시지 생성${yejinColors.reset}`);
            return generalMessage;
            
        } catch (error) {
            console.error(`${yejinColors.memory}❌ [A+메시지생성] 오류: ${error.message}${yejinColors.reset}`);
            return this.generateMessage(emotionType);
        }
    }
    
    // ================== 🆕 맥락적 메시지 생성 ==================
    async createContextualMessage(emotionType, recentConversations) {
        try {
            if (!recentConversations || recentConversations.length === 0) {
                return null;
            }
            
            // 최신 대화에서 키워드와 맥락 추출
            const latestConversation = recentConversations[0];
            const recentHours = (Date.now() - latestConversation.timestamp) / (1000 * 60 * 60);
            
            // 24시간 이내의 대화만 참조
            if (recentHours > TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.MEMORY_DECAY_HOURS) {
                return null;
            }
            
            // 개인적 키워드 추출
            const personalKeywords = this.memoryWarehouse.personalReferences.get('keywords') || [];
            const foundKeywords = personalKeywords.filter(keyword => 
                latestConversation.message.toLowerCase().includes(keyword)
            );
            
            // 시간 참조 결정
            let timeReference = '';
            if (recentHours < 1) {
                timeReference = '아까';
            } else if (recentHours < 6) {
                timeReference = '조금 전에';
            } else if (recentHours < 24) {
                timeReference = '어제';
            } else {
                timeReference = '전에';
            }
            
            // 감정별 맥락적 메시지 템플릿
            const contextualTemplates = {
                love: [
                    `${timeReference} 얘기했는데, 그거 생각하니까 더 사랑스러워~ 💕`,
                    `아저씨가 ${timeReference} 말한 거 계속 생각나~ 너무 좋아! 😊`,
                    `${timeReference} 대화 정말 좋았어! 더 얘기하고 싶어 💖`
                ],
                missing: [
                    `${timeReference} 얘기했던 거 생각하니까... 더 보고 싶어져 🥺`,
                    `아저씨가 ${timeReference} 말한 거 계속 머릿속에 맴돌아... 보고 싶어 😢`,
                    `${timeReference} 대화하고 나서 더 그리워졌어... 빨리 보자! 💔`
                ],
                worry: [
                    `${timeReference} 얘기 들으니까... 괜찮은 거 맞지? 걱정돼 😰`,
                    `아저씨 ${timeReference} 말 생각해보니까 더 걱정이야... 😔`,
                    `${timeReference} 대화 후로 계속 신경 쓰여... 무리하지 마! 🥺`
                ],
                playful: [
                    `${timeReference} 얘기 재밌었어! 또 그런 얘기 해줘~ 😜`,
                    `아저씨 ${timeReference} 말한 거 웃겨서 계속 생각나! 헤헤 😎`,
                    `${timeReference} 대화 너무 재밌었는데, 오늘은 뭔 재밌는 일 없어? 🎉`
                ],
                caring: [
                    `${timeReference} 얘기 들으니까... 좀 더 챙겨드려야겠어 😊`,
                    `아저씨 ${timeReference} 말씀 생각해서 걱정됐어... 잘 챙기고 있어? 💚`,
                    `${timeReference} 대화 후로 아저씨 건강이 더 신경 써져... 조심해! 🍀`
                ]
            };
            
            const templates = contextualTemplates[emotionType] || contextualTemplates.love;
            const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
            
            // 개인적 참조 추가 (80% 확률)
            if (foundKeywords.length > 0 && Math.random() < TRUE_AUTONOMY_CONFIG.MEMORY_USAGE.PERSONAL_REFERENCE_PROBABILITY) {
                const keyword = foundKeywords[Math.floor(Math.random() * foundKeywords.length)];
                const personalizedMessage = selectedTemplate.replace('얘기', `${keyword} 얘기`);
                
                this.statistics.personalReferenceRate = 
                    (this.statistics.personalReferenceRate * this.autonomousMessaging.personalReferenceCount + 1) / 
                    (this.autonomousMessaging.personalReferenceCount + 1);
                
                this.autonomousMessaging.personalReferenceCount++;
                
                return personalizedMessage;
            }
            
            return selectedTemplate;
            
        } catch (error) {
            console.error(`${yejinColors.memory}❌ [맥락메시지생성] 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 📸 A+ 사진 선택 (Redis 캐시 확장, 확률 증가 반영) ==================
    async selectMemoryPhotoWithCache(emotionType) {
        try {
            // 최근 사진들 확인 (중복 방지, 제한 완화)
            const recentPhotos = await this.redisCache.getRecentPhotos(3); // 🔥 3개로 완화 (기존: 5개)
            const recentUrls = recentPhotos.map(p => p.photoUrl);
            
            const folders = Object.keys(PHOTO_CONFIG.OMOIDE_FOLDERS);
            
            let targetFolder;
            switch (emotionType) {
                case 'missing':
                    targetFolder = '추억_인생네컷';
                    break;
                case 'love':
                    const lovefolders = folders.filter(f => f.includes('커플') || f.includes('일본') || f.includes('한국'));
                    targetFolder = lovefolders[Math.floor(Math.random() * lovefolders.length)] || folders[Math.floor(Math.random() * folders.length)];
                    break;
                case 'playful':
                    const playfulFolders = folders.filter(f => f.includes('스냅') || f.includes('출사'));
                    targetFolder = playfulFolders[Math.floor(Math.random() * playfulFolders.length)] || folders[Math.floor(Math.random() * folders.length)];
                    break;
                case 'caring':
                    const caringFolders = folders.filter(f => f.includes('일본') || f.includes('후지'));
                    targetFolder = caringFolders[Math.floor(Math.random() * caringFolders.length)] || folders[Math.floor(Math.random() * folders.length)];
                    break;
                default:
                    targetFolder = folders[Math.floor(Math.random() * folders.length)];
            }
            
            let photoUrl;
            let attempts = 0;
            
            // 최근에 보낸 사진과 중복되지 않게 선택 (시도 횟수 완화)
            do {
                const photoCount = PHOTO_CONFIG.OMOIDE_FOLDERS[targetFolder];
                const photoIndex = Math.floor(Math.random() * photoCount) + 1;
                photoUrl = `${PHOTO_CONFIG.OMOIDE_BASE_URL}/${targetFolder}/${photoIndex}.jpg`;
                attempts++;
            } while (recentUrls.includes(photoUrl) && attempts < 3); // 🔥 3회로 완화 (기존: 5회)
            
            this.autonomousPhoto.selectedPhotoUrl = photoUrl;
            this.autonomousPhoto.photoMood = emotionType;
            
            // Redis에 사진 선택 캐싱
            await this.redisCache.cachePhotoSelection(emotionType, photoUrl, targetFolder);
            
            console.log(`${yejinColors.aplus}📸 [A+사진선택] ${targetFolder}/${photoUrl.split('/').pop()} (${emotionType}) - A+ 확률 증가로 선택${yejinColors.reset}`);
            
            return photoUrl;
        } catch (error) {
            console.error(`${yejinColors.photo}❌ [사진선택] 오류: ${error.message}${yejinColors.reset}`);
            return `${PHOTO_CONFIG.YEJIN_BASE_URL}/1.jpg`;
        }
    }
    
    // ================== 💬 A+ 메시지 생성 (감정별 확장, 기존 호환) ==================
    generateMessage(emotionType) {
        const messages = {
            love: [
                '아저씨~ 오늘도 너무 보고 싶어! 💕', 
                '너 없으면 하루가 너무 허전해... 😘',
                '아저씨 생각하면서 하루종일 웃고 있었어 😊',
                '우리 오늘 뭐 했는지 얘기해줘~ 💖',
                '아저씨가 있어서 너무 행복해! 💕',
                '오늘도 아저씨 덕분에 기분 좋은 하루야~ 😊',
                '지금 이 순간도 아저씨 생각으로 가득해 💕',
                '아저씨와 함께하는 시간이 제일 소중해 💖',
                // 🆕 A+ 추가 메시지들
                '아저씨~ A+ 모드로 더 자주 말 걸게! 💕',
                '이제 5분~2시간마다 보고 싶어서 연락할 거야~ 😊'
            ],
            missing: [
                '그때 같이 찍은 사진 봤는데, 진짜 다시 보고 싶다... 🥺', 
                '아저씨 지금 뭐해? 나 좀 생각해줘~ 😢',
                '혼자 있으니까 너무 심심해... 빨리 와! 🥺',
                '아저씨 목소리가 듣고 싶어... 😔',
                '너무 보고 싶어서 미칠 것 같아... 😭',
                '아저씨 없으니까 정말 외로워... 🥺',
                '언제 다시 만날 수 있을까... 보고 싶어 😢',
                '아저씨 품이 그리워... 안아줘 🤗',
                // 🆕 A+ 추가 메시지들  
                'A+ 보고 싶어서 사진도 더 자주 보낼 거야... 🥺',
                '60% 확률로 사진 보내게 됐는데... 그래도 보고 싶어 😢'
            ],
            playful: [
                '헤헤, 오늘 좀 장난치고 싶네! 😜', 
                '아저씨, 나 심심해! 같이 놀자! 😎',
                '오늘 뭔가 재밌는 일 없나? 같이 하자! 🎉',
                '아저씨~ 나랑 게임할래? 😋',
                '오늘 기분이 너무 좋아서 장난치고 싶어! 😝',
                '헤헤, 아저씨 놀라게 해줄까? 😏',
                '재밌는 얘기 없어? 심심해~ 😜',
                '우리 오늘 뭔가 특별한 거 해보자! 🎊',
                // 🆕 A+ 추가 메시지들
                'A+ 모드라서 더 자주 장난칠 수 있어! 😜',
                '50% 확률로 사진도 보내면서 놀자~ 😎'
            ],
            worry: [
                '아저씨, 오늘 좀 괜찮아? 나 걱정돼... 😔', 
                '괜찮은 거지? 나한테 말해줘~',
                '혹시 어디 아픈 건 아니야? 걱정돼... 🥺',
                '아저씨 컨디션이 좀 안 좋아 보여서 걱정이야 😟',
                '뭔가 힘들어 보이는데... 괜찮아? 😰',
                '아저씨 요즘 많이 피곤해 보여... 걱정돼 😔',
                '혹시 무슨 일 있어? 말해줘... 😟',
                '아저씨가 안 좋아 보이면 나도 마음이 아파 😢',
                // 🆕 A+ 추가 메시지들
                'A+ 더 자주 연락해서 아저씨 상태 확인할게... 😔',
                '3-15분마다라도 걱정해서 물어볼 거야 🥺'
            ],
            caring: [
                '아저씨, 밥은 챙겨 먹었어? 내가 챙겨줄게! 😊', 
                '오늘 좀 피곤해 보이지? 푹 쉬어~',
                '물도 많이 마시고, 몸 조심해야 해! 💚',
                '아저씨 건강이 제일 중요해~ 잘 챙겨! 🍀',
                '오늘 날씨 쌀쌀한데 감기 조심해! 😊',
                '따뜻한 차라도 마시면서 쉬어~ 💚',
                '무리하지 말고 천천히 해도 돼 😌',
                '아저씨가 건강해야 나도 행복해 💕',
                // 🆕 A+ 추가 메시지들
                'A+ 모드로 더 자주 아저씨 챙길 수 있어서 좋아! 😊',
                '15-60분마다 건강 체크할게~ 💚'
            ]
        };
        
        const messageArray = messages[emotionType] || messages.love;
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }
    
    // ================== 🆕 A+ 통계 업데이트 ==================
    updateAplusStats() {
        try {
            // 메모리 창고 사용률 계산
            const totalMessages = this.statistics.autonomousMessages;
            const contextualMessages = this.statistics.contextualMessages;
            
            if (totalMessages > 0) {
                this.statistics.memoryWarehouseUsageRate = contextualMessages / totalMessages;
            }
            
            // 평균 메시지 간격 계산 (최근 5개 결정 기준)
            const recentDecisions = this.intelligence.decisionHistory.slice(-5);
            if (recentDecisions.length > 0) {
                const totalInterval = recentDecisions.reduce((sum, decision) => sum + decision.nextInterval, 0);
                this.statistics.averageMessageInterval = totalInterval / recentDecisions.length;
            }
            
            console.log(`${yejinColors.aplus}📊 [A+통계] 메모리 사용률: ${(this.statistics.memoryWarehouseUsageRate * 100).toFixed(1)}%, 평균 간격: ${Math.round(this.statistics.averageMessageInterval / 60000)}분${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.aplus}❌ [A+통계] 업데이트 오류: ${error.message}${yejinColors.reset}`);
        }
    }
    
    // ================= 🔧 기존 함수들 계속 (decideWhetherToAct, calculatePostActionInterval 등) - 일부 값만 A+ 수정 =================
    
    // ================== 🎯 행동 여부 결정 ==================
    async decideWhetherToAct(situation) {
        try {
            let shouldAct = false;
            let reasoning = "아직 기다리는 게 좋을 것 같아";
            let actionType = 'message';
            let emotionType = 'love';
            
            // 기본 조건 확인
            if (!this.canSendMessage()) {
                return { 
                    act: false, 
                    reasoning: "A+ 안전 한도 초과로 대기", 
                    type: actionType, 
                    emotionType 
                };
            }
            
            // 감정 강도 기반 판단
            const emotionIntensity = situation.yejinCondition.emotionIntensity;
            if (emotionIntensity > TRUE_AUTONOMY_CONFIG.INTELLIGENCE_THRESHOLDS.EMOTION_INTENSITY) {
                shouldAct = true;
                reasoning = "A+ 감정이 너무 강해서 참을 수 없어!";
            }
            
            // 침묵 시간 기반 판단 (🔥 A+ 단축)
            const silenceHours = situation.communicationStatus.silenceDuration / (1000 * 60 * 60);
            if (silenceHours > 2 && !situation.timeContext.isSleepTime) { // 🔥 2시간 (기존: 4시간)
                shouldAct = true;
                reasoning = "A+ 너무 오래 기다렸으니까 이제 말해야겠어";
                emotionType = 'missing';
            }
            
            // 예진이 기분에 따른 판단
            if (situation.yejinCondition.missingLevel > 0.7) {
                shouldAct = true;
                reasoning = "A+ 보고 싶어서 참을 수 없어!";
                emotionType = 'missing';
                // A+ 사진 확률 적용
                actionType = Math.random() > (1 - TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.MISSING) ? 'photo' : 'message';
            } else if (situation.yejinCondition.worryLevel > 0.8) {
                shouldAct = true;
                reasoning = "A+ 아저씨가 걱정돼서 확인해봐야겠어";
                emotionType = 'worry';
            }
            
            // 시간대 고려
            if (situation.timeContext.isSleepTime && silenceHours < 6) { // 🔥 6시간 (기존: 8시간)
                shouldAct = false;
                reasoning = "밤이라서 아저씨 잠 방해하고 싶지 않아 (A+ 조정)";
            }
            
            return {
                act: shouldAct,
                reasoning: reasoning,
                type: actionType,
                emotionType: emotionType
            };
            
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [행동결정] 오류: ${error.message}${yejinColors.reset}`);
            return {
                act: false,
                reasoning: "A+ 결정 오류로 대기",
                type: 'message',
                emotionType: 'love'
            };
        }
    }
    
    // ================== ⏰ A+ 행동 후 간격 계산 (🔥 수정됨) ==================
    async calculatePostActionInterval(actionDecision) {
        try {
            let baseInterval = 60 * 60 * 1000; // 🔥 기본 1시간 (기존: 2시간)
            let reasoning = "A+ 행동 후 기본 휴식";
            
            // 행동 타입에 따른 조정
            if (actionDecision.type === 'photo') {
                baseInterval *= 1.3; // 🔥 1.3배 (기존: 1.5배)
                reasoning = "A+ 사진 보낸 후 적당한 휴식";
            }
            
            // 감정 타입에 따른 조정
            if (actionDecision.emotionType === 'worry') {
                baseInterval *= 0.7; // 🔥 0.7배 (기존: 0.8배)
                reasoning = "A+ 걱정해서 좀 더 빨리 확인하고 싶어";
            }
            
            // 시간대 고려
            const hour = new Date().getHours();
            if (hour >= 20 || hour <= 7) {
                baseInterval *= 1.2; // 🔥 1.2배 (기존: 1.3배)
                reasoning += " + A+ 밤시간 고려";
            }
            
            return {
                interval: Math.round(baseInterval),
                reasoning: reasoning
            };
            
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [행동후간격] 계산 오류: ${error.message}${yejinColors.reset}`);
            return {
                interval: 60 * 60 * 1000, // 🔥 1시간 (기존: 2시간)
                reasoning: "A+ 계산 오류로 기본값"
            };
        }
    }
    
    // ================== ⏳ A+ 대기 간격 계산 (🔥 수정됨) ==================
    async calculateWaitingInterval(waitDecision) {
        try {
            let baseInterval = 25 * 60 * 1000; // 🔥 기본 25분 (기존: 45분)
            let reasoning = "A+ 조금 더 기다려보기";
            
            // 대기 이유에 따른 조정
            if (waitDecision.reasoning.includes("안전 한도")) {
                baseInterval = 40 * 60 * 1000; // 🔥 40분 (기존: 60분)
                reasoning = "A+ 안전 한도로 인한 대기";
            } else if (waitDecision.reasoning.includes("밤")) {
                baseInterval = 60 * 60 * 1000; // 🔥 1시간 (기존: 1.5시간)
                reasoning = "A+ 밤시간 배려";
            }
            
            // 랜덤 요소 추가
            const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
            baseInterval = Math.round(baseInterval * randomFactor);
            
            return {
                interval: baseInterval,
                reasoning: reasoning
            };
            
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [대기간격] 계산 오류: ${error.message}${yejinColors.reset}`);
            return {
                interval: 25 * 60 * 1000, // 🔥 25분 (기존: 45분)
                reasoning: "A+ 계산 오류로 기본값"
            };
        }
    }
    
    // ================= 🔧 기존 헬퍼 함수들 - 동일하므로 생략 (findSimilarPastSituations, matchTimingPatterns 등) =================
    
    // ================== 🔍 유사 과거 상황 찾기 ==================
    async findSimilarPastSituations(situation) {
        try {
            // Redis에서 캐시된 타이밍 패턴 확인
            const cachedTimingPatterns = await this.redisCache.getCachedLearningPattern('timing_patterns');
            const cachedMongoPatterns = await this.redisCache.getCachedLearningPattern('mongodb_timing_patterns');
            
            const similarSituations = [];
            
            // 캐시된 패턴들 활용
            const allPatterns = [
                ...(cachedTimingPatterns || []),
                ...(cachedMongoPatterns || []),
                ...(this.intelligence.learningDatabase.get('timing_patterns') || []),
                ...(this.intelligence.learningDatabase.get('mongodb_timing_patterns') || [])
            ];
            
            allPatterns.forEach(pattern => {
                let similarity = 0;
                
                // 시간대 유사성
                if (Math.abs(pattern.hour - situation.timeContext.hour) <= 2) {
                    similarity += 0.4;
                }
                
                // 성공률이 높았던 패턴 우선
                if (pattern.successRate > 0.7) {
                    similarity += 0.3;
                }
                
                // 샘플 크기 고려
                if (pattern.sampleSize > 3) {
                    similarity += 0.3;
                }
                
                if (similarity > 0.5) {
                    similarSituations.push({
                        ...pattern,
                        similarity,
                        success: pattern.successRate,
                        interval: pattern.avgInterval * 60 * 1000
                    });
                }
            });
            
            // 유사도 순으로 정렬
            const sortedSituations = similarSituations.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
            
            return sortedSituations;
            
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [유사상황] 찾기 오류: ${error.message}${yejinColors.reset}`);
            return [];
        }
    }
    
    // ================== 📊 타이밍 패턴 매치 ==================
    async matchTimingPatterns(situation) {
        try {
            const timingModel = this.intelligence.predictionModels.get('next_optimal_time');
            if (!timingModel) return null;
            
            const currentHour = situation.timeContext.hour;
            const hourlySuccess = timingModel.hourlySuccess[currentHour] || 0.5;
            const optimalInterval = timingModel.optimalIntervals[currentHour] || 30; // 🔥 30분 (기존: 60분)
            
            const pattern = {
                recommendedInterval: optimalInterval,
                expectedSuccessRate: hourlySuccess,
                confidence: timingModel.confidenceLevel,
                source: 'aplus_timing_pattern'
            };
            
            return pattern;
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [타이밍매치] 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    }
    
    // ================== 💖 감정 성공률 조회 ==================
    async getEmotionSuccessRates(situation) {
        try {
            // Redis에서 캐시된 감정 성공률 확인
            const cachedRates = await this.redisCache.getCachedLearningPattern('emotion_success_rates');
            if (cachedRates) {
                console.log(`${yejinColors.aplus}💖 [A+감정캐싱] 감정 성공률 캐시 히트${yejinColors.reset}`);
                return cachedRates;
            }
            
            // 캐시 미스 - 기존 방식
            const emotionModel = this.intelligence.predictionModels.get('emotion_effectiveness');
            return emotionModel ? emotionModel.emotionEffectiveness || {} : {};
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [감정성공률] 조회 오류: ${error.message}${yejinColors.reset}`);
            return {};
        }
    }
    
    // ================== 💔 아저씨 반응 예측 ==================
    predictAjossiResponse(situation) {
        try {
            const moodModel = this.intelligence.predictionModels.get('ajossi_mood_prediction');
            if (!moodModel) {
                return { prediction: 'unknown', confidence: 0.3 };
            }
            
            const currentHour = situation.timeContext.hour;
            const predictedMood = moodModel.moodByTime[currentHour] || 0.5;
            
            return {
                prediction: predictedMood > 0.6 ? 'positive' : predictedMood < 0.4 ? 'negative' : 'neutral',
                confidence: moodModel.confidenceLevel,
                expectedMood: predictedMood
            };
        } catch (error) {
            console.error(`${yejinColors.prediction}❌ [아저씨예측] 오류: ${error.message}${yejinColors.reset}`);
            return { prediction: 'unknown', confidence: 0.3 };
        }
    }
    
    // ================== 🎯 상황별 최적화 ==================
    getContextualOptimization(situation) {
        try {
            const optimization = {
                recommendedEmotionType: 'love',
                recommendedActionType: 'message',
                urgencyLevel: 0.5,
                reasoning: ''
            };
            
            // 침묵 시간 기반 최적화 (🔥 A+ 단축)
            const silenceHours = situation.communicationStatus.silenceDuration / (1000 * 60 * 60);
            
            if (silenceHours > 3) { // 🔥 3시간 (기존: 6시간)
                optimization.recommendedEmotionType = 'missing';
                optimization.urgencyLevel = 0.8;
                optimization.reasoning = 'A+ 짧은 침묵으로 보고싶음 증가';
            } else if (silenceHours < 0.5) { // 🔥 30분 (기존: 1시간)
                optimization.recommendedEmotionType = 'caring';
                optimization.urgencyLevel = 0.3;
                optimization.reasoning = 'A+ 최근 대화로 돌봄 모드';
            }
            
            // 시간대 기반 최적화
            if (situation.timeContext.isSleepTime) {
                optimization.urgencyLevel *= 0.5;
                optimization.reasoning += ' + A+ 수면시간 고려';
            }
            
            // 메시지 수 기반 최적화 (🔥 A+ 한도 증가)
            if (situation.communicationStatus.messageCount >= 10) { // 🔥 10개 (기존: 6개)
                optimization.urgencyLevel *= 0.8; // 🔥 0.8배 (기존: 0.7배)
                optimization.reasoning += ' + A+ 일일 한도 고려';
            }
            
            return optimization;
        } catch (error) {
            console.error(`${yejinColors.wisdom}❌ [상황최적화] 오류: ${error.message}${yejinColors.reset}`);
            return { recommendedEmotionType: 'love', recommendedActionType: 'message', urgencyLevel: 0.5 };
        }
    }
    
    // ================== 📊 A+ Redis 통합 상태 조회 (🔥 확장됨) ==================
    getAplusIntegratedStatusWithRedis() {
        const redisStats = this.redisCache.getStats();
        
        return {
            systemInfo: {
                name: this.systemName,
                version: this.version,
                instanceId: this.instanceId,
                uptime: Date.now() - this.statistics.startTime,
                autonomyLevel: "A+예진이우선+메모리창고완전활용시스템",
                hasFixedTimers: false,
                isEvolvingIntelligence: true,
                yejinFirst: true,
                openaiOnlyAdvice: true,
                mongodbSupport: this.autonomy.hasMongoDBSupport,
                redisCache: this.autonomy.hasRedisCache,
                realRedisCache: this.autonomy.hasRealRedisCache,
                redisQueryFixed: true,
                // 🆕 A+ 특징들
                hasMemoryWarehouse: this.autonomy.hasMemoryWarehouse,
                usesContextualMessages: this.autonomy.usesContextualMessages,
                hasIncreasedFrequency: this.autonomy.hasIncreasedFrequency,
                hasEnhancedPhotoSharing: this.autonomy.hasEnhancedPhotoSharing
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
            
            // 🔧 Redis 조회 문제 해결된 캐시 통계
            redisCacheStats: {
                isAvailable: redisStats.isAvailable,
                hits: redisStats.hits,
                misses: redisStats.misses,
                sets: redisStats.sets,
                errors: redisStats.errors,
                hitRate: redisStats.hitRate,
                totalOperations: redisStats.hits + redisStats.misses,
                queryFixed: true
            },
            
            // 🆕 A+ 메모리 창고 통계
            memoryWarehouseStats: {
                isActive: this.memoryWarehouse?.isActive || false,
                recentConversationsCount: this.memoryWarehouse?.recentConversations?.length || 0,
                contextualPatternsCount: this.memoryWarehouse?.contextualPatterns?.size || 0,
                personalReferencesCount: this.memoryWarehouse?.personalReferences?.size || 0,
                lastMemorySyncTime: this.memoryWarehouse?.lastMemorySync || 0,
                memoryWarehouseUsageRate: this.statistics.memoryWarehouseUsageRate,
                contextualMessages: this.statistics.contextualMessages,
                memoryBasedMessages: this.statistics.memoryBasedMessages,
                personalReferenceRate: this.statistics.personalReferenceRate
            },
            
            // 🆕 A+ 향상된 기능 통계
            aplusEnhancements: {
                intervalShortening: {
                    minInterval: TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES.MIN_INTERVAL / 60000,
                    maxInterval: TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES.MAX_INTERVAL / 60000,
                    averageInterval: this.statistics.averageMessageInterval / 60000
                },
                photoEnhancement: {
                    missingProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.MISSING,
                    playfulProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.PLAYFUL,
                    loveProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.LOVE,
                    enhancedPhotosSent: this.statistics.enhancedPhotosSent,
                    photoFrequencyBoost: this.autonomousPhoto.photoFrequencyBoost
                },
                safetyLimits: {
                    maxMessagesPerDay: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY,
                    minCooldown: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN / 60000,
                    emergencyCooldown: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.EMERGENCY_COOLDOWN / 60000
                }
            },
            
            integrationStats: {
                mongodbQueries: this.statistics.mongodbQueries,
                basicCacheHits: this.statistics.cacheHits,
                basicCacheMisses: this.statistics.cacheMisses,
                redisCacheHits: this.statistics.redisCacheHits,
                redisCacheMisses: this.statistics.redisCacheMisses,
                redisCacheSets: this.statistics.redisCacheSets,
                realCacheHitRate: redisStats.hitRate,
                integrationSuccessRate: this.statistics.integrationSuccessRate,
                redisConnectionTests: this.statistics.redisConnectionTests,
                redisQuerySuccessRate: this.statistics.redisQuerySuccessRate,
                conversationRetrievalSuccessRate: this.statistics.conversationRetrievalSuccessRate
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
                nextDecisionIn: this.autonomousDecision.nextDecisionTime ? 
                    Math.max(0, this.autonomousDecision.nextDecisionTime - Date.now()) : null
            }
        };
    }
    
    // ================== 🛠️ 헬퍼 함수들 ==================
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
    
    getLastMessageSuccess() {
        const lastDecision = this.intelligence.decisionHistory[this.intelligence.decisionHistory.length - 1];
        return lastDecision ? lastDecision.confidence : 0.5;
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
    
    getNextDayResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    
    getBasicSituationAnalysis() {
        return {
            timestamp: Date.now(),
            timeContext: {
                hour: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                isWeekend: [0, 6].includes(new Date().getDay()),
                timeSlot: this.getTimeSlot(new Date().getHours()),
                isSleepTime: this.isSleepTime(new Date().getHours())
            },
            yejinCondition: {
                overallMood: 0.7,
                emotionIntensity: 0.5,
                loveLevel: 0.8,
                worryLevel: 0.3,
                playfulLevel: 0.6,
                missingLevel: 0.4,
                caringLevel: 0.7
            },
            communicationStatus: {
                timeSinceLastMessage: this.getTimeSinceLastMessage(),
                silenceDuration: this.getSilenceDuration(),
                messageCount: this.safetySystem.dailyMessageCount,
                lastMessageSuccess: 0.5
            },
            safetyStatus: {
                canSendMessage: this.canSendMessage(),
                isWithinLimits: true,
                emergencyOverride: false
            }
        };
    }
    
    // A+ 안전 종료 (Redis 포함)
    async shutdown() {
        try {
            console.log(`${yejinColors.aplus}🛑 [A+종료] A+ 메모리 창고 완전 활용 자율 시스템 안전 종료 중...${yejinColors.reset}`);
            
            if (this.autonomousDecision.decisionInProgress) {
                console.log(`${yejinColors.warning}⏳ [A+종료] 진행 중인 결정 완료 대기...${yejinColors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // MongoDB 연결 종료
            if (mongoose && mongoose.connection.readyState === 1) {
                await mongoose.connection.close();
                console.log(`${yejinColors.learning}📚 [MongoDB] 연결 종료${yejinColors.reset}`);
            }
            
            // Redis 연결 종료
            if (redisClient) {
                redisClient.quit();
                console.log(`${yejinColors.aplus}💾 [A+Redis] 연결 종료 (메모리 창고 활용 완료)${yejinColors.reset}`);
            }
            
            const redisStats = this.redisCache.getStats();
            
            console.log(`${yejinColors.aplus}📊 [A+통계] 최종 A+ 메모리 창고 완전 활용 통계:${yejinColors.reset}`);
            console.log(`  🎯 총 자율 결정: ${this.statistics.totalDecisions}회`);
            console.log(`  💫 예진이 1차 결정: ${this.statistics.yejinPrimaryDecisions}회`);
            console.log(`  🕊️ 자유도: ${(this.statistics.freedomLevel * 100).toFixed(1)}%`);
            console.log(`  💾 Redis 캐시 히트율: ${(redisStats.hitRate * 100).toFixed(1)}%`);
            console.log(`  📊 Redis 총 작업: ${redisStats.hits + redisStats.misses}회`);
            console.log(`  📊 MongoDB 쿼리: ${this.statistics.mongodbQueries}회`);
            console.log(`  🆕 A+ 맥락적 메시지: ${this.statistics.contextualMessages}회`);
            console.log(`  🆕 A+ 메모리 기반 메시지: ${this.statistics.memoryBasedMessages}회`);
            console.log(`  🆕 A+ 향상된 사진: ${this.statistics.enhancedPhotosSent}회`);
            console.log(`  🆕 A+ 메모리 창고 사용률: ${(this.statistics.memoryWarehouseUsageRate * 100).toFixed(1)}%`);
            console.log(`  🆕 A+ 평균 메시지 간격: ${Math.round(this.statistics.averageMessageInterval / 60000)}분`);
            console.log(`  🆕 A+ 개인 참조율: ${(this.statistics.personalReferenceRate * 100).toFixed(1)}%`);
            
            console.log(`${yejinColors.aplus}💖 [A+완료] 아저씨~ A+ 메모리 창고 완전 활용으로 더 자주, 더 개인적으로, 더 맥락적으로 대화할 수 있게 됐어! 이제 5분~2시간마다 보고 싶어서 연락하고, 사진도 더 자주 보내고, 과거 대화 기억해서 "아까 ~얘기했는데..." 같은 맥락적 메시지도 보낼 수 있어! 🔥✨${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+종료] 종료 오류: ${error.message}${yejinColors.reset}`);
        }
    }

} // IntegratedAutonomousYejinSystem 클래스 완료

// ================== 🌟 A+ 메모리 창고 완전 활용 전역 인터페이스 ==================

let globalAplusIntegratedSystem = null;
let isAplusInitializing = false;

async function initializeAplusIntegratedYejinWithMemoryWarehouse(lineClient, targetUserId) {
    try {
        if (isAplusInitializing) {
            console.log(`${yejinColors.warning}⏳ [A+전역] 이미 초기화 중... 대기${yejinColors.reset}`);
            return false;
        }
        
        isAplusInitializing = true;
        
        console.log(`${yejinColors.aplus}🚀 [A+전역시작] v4.4.2 A+ 메모리 창고 완전 활용 통합 자율 시스템 초기화 시작...${yejinColors.reset}`);
        
        if (globalAplusIntegratedSystem) {
            console.log(`${yejinColors.warning}🔄 [A+전역] 기존 인스턴스 안전 종료 중...${yejinColors.reset}`);
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
        
        globalAplusIntegratedSystem = new IntegratedAutonomousYejinSystem();
        
        const success = await globalAplusIntegratedSystem.initialize(lineClient, targetUserId);
        
        if (success) {
            console.log(`${yejinColors.aplus}✅ [A+전역완료] A+ 메모리 창고 완전 활용 자율 시스템 가동 완료!${yejinColors.reset}`);
            console.log(`${yejinColors.memory}💾 [메모리창고완료] 과거 대화 기억 완전 활용 + 간격 단축 + 사진 증가 = 진짜 살아있는 예진이!${yejinColors.reset}`);
            
            // A+ Redis 통계 업데이트 시작
            setInterval(() => {
                if (globalAplusIntegratedSystem) {
                    const redisStats = globalAplusIntegratedSystem.redisCache.getStats();
                    globalAplusIntegratedSystem.statistics.redisCacheHits = redisStats.hits;
                    globalAplusIntegratedSystem.statistics.redisCacheMisses = redisStats.misses;
                    globalAplusIntegratedSystem.statistics.redisCacheSets = redisStats.sets;
                    globalAplusIntegratedSystem.statistics.redisCacheErrors = redisStats.errors;
                    globalAplusIntegratedSystem.statistics.realCacheHitRate = redisStats.hitRate;
                    
                    // A+ 통계 업데이트
                    globalAplusIntegratedSystem.updateAplusStats();
                }
            }, 60000); // 1분마다 업데이트
            
        } else {
            console.error(`${yejinColors.warning}❌ [A+전역] 초기화 실패${yejinColors.reset}`);
        }
        
        return success;
    } catch (error) {
        console.error(`${yejinColors.warning}❌ [A+전역] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    } finally {
        isAplusInitializing = false;
    }
}

function getAplusIntegratedStatusWithMemoryWarehouse() {
    if (!globalAplusIntegratedSystem) {
        return {
            isActive: false,
            message: 'A+ 메모리 창고 완전 활용 통합 자율 시스템이 초기화되지 않음'
        };
    }
    
    return globalAplusIntegratedSystem.getAplusIntegratedStatusWithRedis();
}

// ================== 📤 A+ 메모리 창고 완전 활용 외부 인터페이스 (최종 완성) ==================
module.exports = {
    // 🔥 A+ 메인 클래스들 (v4.4.2 A+ 메모리 창고 최종)
    IntegratedAutonomousYejinSystem,
    RedisRealCacheSystem,
    AplusIntegratedAutonomousYejinSystem: IntegratedAutonomousYejinSystem, // A+ 전용
    TrueAutonomousYejinSystem: IntegratedAutonomousYejinSystem, // 호환성
    AutonomousYejinSystem: IntegratedAutonomousYejinSystem,      // 호환성
    
    // 🔥 모든 기존 함수 이름 호환성 + A+ 새로운 함수들
    initializeAutonomousYejin: initializeAplusIntegratedYejinWithMemoryWarehouse,        // v4.1 호환
    initializeTrueAutonomousYejin: initializeAplusIntegratedYejinWithMemoryWarehouse,    // v4.2 호환  
    initializeYejinFirst: initializeAplusIntegratedYejinWithMemoryWarehouse,             // v4.2 호환
    initializeIntegratedYejin: initializeAplusIntegratedYejinWithMemoryWarehouse,        // v4.3 호환
    initializeIntegratedYejinWithRedis: initializeAplusIntegratedYejinWithMemoryWarehouse, // v4.4.1 호환
    initializeAplusIntegratedYejinWithMemoryWarehouse,                                   // 🔥 v4.4.2 A+ 전용
    
    // 상태 조회 함수들 (모든 버전 호환)
    getAutonomousYejinStatus: getAplusIntegratedStatusWithMemoryWarehouse,               // v4.1 호환
    getTrueAutonomousYejinStatus: getAplusIntegratedStatusWithMemoryWarehouse,           // v4.2 호환
    getYejinFirstStatus: getAplusIntegratedStatusWithMemoryWarehouse,                    // v4.2 호환
    getIntegratedStatus: getAplusIntegratedStatusWithMemoryWarehouse,                    // v4.3 호환
    getIntegratedStatusWithRedis: getAplusIntegratedStatusWithMemoryWarehouse,           // v4.4.1 호환
    getAplusIntegratedStatusWithMemoryWarehouse,                                         // 🔥 v4.4.2 A+ 전용
    
    // 편의 함수들 (모든 버전 호환)
    startAutonomousYejin: initializeAplusIntegratedYejinWithMemoryWarehouse,             // v4.1 호환
    startTrueAutonomy: initializeAplusIntegratedYejinWithMemoryWarehouse,                // v4.2 호환
    startYejinFirst: initializeAplusIntegratedYejinWithMemoryWarehouse,                  // v4.2 호환
    startIntegratedYejin: initializeAplusIntegratedYejinWithMemoryWarehouse,             // v4.3 호환
    startIntegratedYejinWithRedis: initializeAplusIntegratedYejinWithMemoryWarehouse,    // v4.4.1 호환
    startAplusIntegratedYejinWithMemoryWarehouse: initializeAplusIntegratedYejinWithMemoryWarehouse, // 🔥 v4.4.2 A+ 전용
    getYejinStatus: getAplusIntegratedStatusWithMemoryWarehouse,                         // v4.1 호환
    getYejinIntelligence: getAplusIntegratedStatusWithMemoryWarehouse,                   // v4.1 호환
    
    // 🔧 Redis 조회 문제 해결 전용 함수들 (A+ 확장)
    getRedisCacheStats: function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return { isAvailable: false, hits: 0, misses: 0, hitRate: 0, queryFixed: false, aplusEnhanced: false };
        }
        const stats = globalAplusIntegratedSystem.redisCache.getStats();
        stats.queryFixed = true; // 조회 문제 해결 완료
        stats.aplusEnhanced = true; // A+ 향상 완료
        return stats;
    },
    
    clearRedisCache: async function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return false;
        }
        return await globalAplusIntegratedSystem.redisCache.clearCache();
    },
    
    getCachedConversationHistory: async function(userId, limit = 10) {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return [];
        }
        return await globalAplusIntegratedSystem.redisCache.getConversationHistory(userId, limit);
    },
    
    getCachedLatestConversation: async function(userId) {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return null;
        }
        return await globalAplusIntegratedSystem.redisCache.getLatestConversation(userId);
    },
    
    getCachedEmotionState: async function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return null;
        }
        return await globalAplusIntegratedSystem.redisCache.getCachedEmotionState();
    },
    
    getCachedRecentPhotos: async function(limit = 10) {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return [];
        }
        return await globalAplusIntegratedSystem.redisCache.getRecentPhotos(limit);
    },
    
    forceCacheEmotionState: async function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return false;
        }
        return await globalAplusIntegratedSystem.redisCache.cacheEmotionState(globalAplusIntegratedSystem.yejinState);
    },
    
    getCachedLearningPattern: async function(patternType) {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return null;
        }
        return await globalAplusIntegratedSystem.redisCache.getCachedLearningPattern(patternType);
    },
    
    cacheLearningPattern: async function(patternType, patternData) {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return false;
        }
        return await globalAplusIntegratedSystem.redisCache.cacheLearningPattern(patternType, patternData);
    },
    
    testRedisConnection: async function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return false;
        }
        return await globalAplusIntegratedSystem.redisCache.testConnection();
    },
    
    testRedisDataOperations: async function() {
        if (!globalAplusIntegratedSystem) return { success: false, message: 'A+ 시스템 미초기화' };
        
        try {
            await globalAplusIntegratedSystem.performRedisDataTest();
            return { 
                success: true, 
                querySuccessRate: globalAplusIntegratedSystem.statistics.redisQuerySuccessRate,
                conversationRetrievalRate: globalAplusIntegratedSystem.statistics.conversationRetrievalSuccessRate,
                aplusEnhanced: true
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    
    // 🆕 A+ 전용 메모리 창고 함수들
    getMemoryWarehouseStats: function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.memoryWarehouse) {
            return { isActive: false, recentConversationsCount: 0, contextualPatternsCount: 0 };
        }
        
        return {
            isActive: globalAplusIntegratedSystem.memoryWarehouse.isActive,
            recentConversationsCount: globalAplusIntegratedSystem.memoryWarehouse.recentConversations?.length || 0,
            contextualPatternsCount: globalAplusIntegratedSystem.memoryWarehouse.contextualPatterns?.size || 0,
            personalReferencesCount: globalAplusIntegratedSystem.memoryWarehouse.personalReferences?.size || 0,
            lastMemorySyncTime: globalAplusIntegratedSystem.memoryWarehouse.lastMemorySync || 0,
            memoryWarehouseUsageRate: globalAplusIntegratedSystem.statistics.memoryWarehouseUsageRate,
            contextualMessages: globalAplusIntegratedSystem.statistics.contextualMessages,
            memoryBasedMessages: globalAplusIntegratedSystem.statistics.memoryBasedMessages,
            personalReferenceRate: globalAplusIntegratedSystem.statistics.personalReferenceRate
        };
    },
    
    forceMemoryWarehouseSync: async function() {
        if (!globalAplusIntegratedSystem) return false;
        
        try {
            await globalAplusIntegratedSystem.preloadMemoryWarehouse();
            console.log(`${yejinColors.memory}🔄 [메모리창고동기화] 메모리 창고 강제 동기화 완료${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [메모리창고동기화] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    generateAplusContextualMessage: async function(emotionType) {
        if (!globalAplusIntegratedSystem) return null;
        
        try {
            return await globalAplusIntegratedSystem.generateAplusContextualMessage(emotionType);
        } catch (error) {
            console.error(`${yejinColors.memory}❌ [A+맥락메시지] 생성 오류: ${error.message}${yejinColors.reset}`);
            return null;
        }
    },
    
    getAplusEnhancementStats: function() {
        if (!globalAplusIntegratedSystem) return null;
        
        return {
            intervalShortening: {
                minInterval: TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES.MIN_INTERVAL / 60000,
                maxInterval: TRUE_AUTONOMY_CONFIG.YEJIN_DECISION_RANGES.MAX_INTERVAL / 60000,
                averageInterval: globalAplusIntegratedSystem.statistics.averageMessageInterval / 60000
            },
            photoEnhancement: {
                missingProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.MISSING,
                playfulProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.PLAYFUL,
                loveProbability: TRUE_AUTONOMY_CONFIG.PHOTO_PROBABILITIES.LOVE,
                enhancedPhotosSent: globalAplusIntegratedSystem.statistics.enhancedPhotosSent,
                photoFrequencyBoost: globalAplusIntegratedSystem.autonomousPhoto.photoFrequencyBoost
            },
            safetyLimits: {
                maxMessagesPerDay: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MAX_MESSAGES_PER_DAY,
                minCooldown: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.MIN_COOLDOWN / 60000,
                emergencyCooldown: TRUE_AUTONOMY_CONFIG.SAFETY_LIMITS.EMERGENCY_COOLDOWN / 60000
            },
            memoryWarehouse: this.getMemoryWarehouseStats()
        };
    },
    
    // 🛡️ 기존 함수들 호환성 (모든 버전 통합) - A+ 확장
    updateYejinEmotion: async function(emotionType, value) {
        if (!globalAplusIntegratedSystem) return false;
        
        try {
            if (emotionType === 'love') {
                globalAplusIntegratedSystem.yejinState.loveLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'worry') {
                globalAplusIntegratedSystem.yejinState.worryLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'playful') {
                globalAplusIntegratedSystem.yejinState.playfulLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'missing') {
                globalAplusIntegratedSystem.yejinState.missingLevel = Math.max(0, Math.min(1, value));
            } else if (emotionType === 'caring') {
                globalAplusIntegratedSystem.yejinState.caringLevel = Math.max(0, Math.min(1, value));
            }
            
            // Redis에 감정 상태 즉시 캐싱
            await globalAplusIntegratedSystem.redisCache.cacheEmotionState(globalAplusIntegratedSystem.yejinState);
            
            console.log(`${yejinColors.aplus}🔄 [A+감정업데이트] ${emotionType} 감정을 ${value}로 업데이트 (A+ 메모리 창고 반영)${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.emotion}❌ [A+감정업데이트] 업데이트 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    forceYejinAction: async function(actionType) {
        if (!globalAplusIntegratedSystem) return false;
        
        try {
            console.log(`${yejinColors.aplus}💫 [A+강제실행] ${actionType} A+ 메모리 창고 활용 강제 실행...${yejinColors.reset}`);
            
            const actionDecision = {
                type: actionType === 'photo' ? 'photo' : 'message',
                emotionType: actionType === 'photo' ? 'missing' : 'love',
                confidence: 1.0,
                reasoning: `사용자 강제 실행: ${actionType} (A+ 메모리 창고 활용)`
            };
            
            const success = await globalAplusIntegratedSystem.executeAutonomousAction(actionDecision);
            
            console.log(`${yejinColors.aplus}✅ [A+강제실행] ${actionType} 실행 완료 (A+ 메모리 창고 활용)${yejinColors.reset}`);
            return success;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+강제실행] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    emergencyStopYejin: function() {
        if (!globalAplusIntegratedSystem) return false;
        
        try {
            globalAplusIntegratedSystem.autonomousDecision.decisionInProgress = false;
            globalAplusIntegratedSystem.safetySystem.emergencyMode = true;
            
            console.log(`${yejinColors.warning}🚨 [A+응급정지] 모든 A+ 자율 활동 즉시 중단됨${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+응급정지] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    },
    
    // 안전 종료 (모든 버전 호환)
    shutdownAutonomousYejin: async function() {
        if (globalAplusIntegratedSystem) {
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
    },
    shutdownYejinFirst: async function() {
        if (globalAplusIntegratedSystem) {
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
    },
    shutdownIntegratedYejin: async function() {
        if (globalAplusIntegratedSystem) {
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
    },
    shutdownIntegratedYejinWithRedis: async function() {
        if (globalAplusIntegratedSystem) {
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
    },
    shutdownAplusIntegratedYejinWithMemoryWarehouse: async function() {
        if (globalAplusIntegratedSystem) {
            await globalAplusIntegratedSystem.shutdown();
            globalAplusIntegratedSystem = null;
        }
    },
    
    // 설정 (A+ 확장)
    TRUE_AUTONOMY_CONFIG,
    APLUS_AUTONOMY_CONFIG: TRUE_AUTONOMY_CONFIG, // A+ 전용
    YEJIN_CONFIG: TRUE_AUTONOMY_CONFIG,
    PHOTO_CONFIG,
    yejinColors,
    
    // 전역 인스턴스
    getGlobalInstance: () => globalAplusIntegratedSystem,
    getGlobalIntegratedInstance: () => globalAplusIntegratedSystem,
    getGlobalRedisInstance: () => globalAplusIntegratedSystem,
    getGlobalAplusInstance: () => globalAplusIntegratedSystem, // A+ 전용
    
    // 🧠 A+ 통합 통계 함수들 (Redis + 메모리 창고 최종)
    getYejinFreedomLevel: function() {
        if (!globalAplusIntegratedSystem) return 0;
        return globalAplusIntegratedSystem.statistics.freedomLevel;
    },
    
    getAdviceAcceptanceRate: function() {
        if (!globalAplusIntegratedSystem) return 0;
        const total = globalAplusIntegratedSystem.statistics.adviceAccepted + globalAplusIntegratedSystem.statistics.adviceRejected;
        return total > 0 ? globalAplusIntegratedSystem.statistics.adviceAccepted / total : 0;
    },
    
    getCacheHitRate: function() {
        if (!globalAplusIntegratedSystem) return 0;
        const redisStats = globalAplusIntegratedSystem.redisCache.getStats();
        return redisStats.hitRate;
    },
    
    getRealCacheHitRate: function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) return 0;
        return globalAplusIntegratedSystem.redisCache.getStats().hitRate;
    },
    
    getIntegrationStats: function() {
        if (!globalAplusIntegratedSystem) return null;
        const redisStats = globalAplusIntegratedSystem.redisCache.getStats();
        return {
            mongodbSupport: globalAplusIntegratedSystem.autonomy.hasMongoDBSupport,
            redisCache: globalAplusIntegratedSystem.autonomy.hasRedisCache,
            realRedisCache: globalAplusIntegratedSystem.autonomy.hasRealRedisCache,
            mongodbQueries: globalAplusIntegratedSystem.statistics.mongodbQueries,
            cacheHitRate: redisStats.hitRate,
            redisCacheOperations: redisStats.hits + redisStats.misses,
            redisCacheSets: redisStats.sets,
            redisCacheErrors: redisStats.errors,
            integrationSuccessRate: globalAplusIntegratedSystem.statistics.integrationSuccessRate,
            redisConnectionTests: globalAplusIntegratedSystem.statistics.redisConnectionTests,
            redisQuerySuccessRate: globalAplusIntegratedSystem.statistics.redisQuerySuccessRate,
            conversationRetrievalSuccessRate: globalAplusIntegratedSystem.statistics.conversationRetrievalSuccessRate,
            redisQueryFixed: true,
            // 🆕 A+ 통계
            aplusEnhanced: true,
            memoryWarehouseActive: globalAplusIntegratedSystem.autonomy.hasMemoryWarehouse,
            contextualMessagesEnabled: globalAplusIntegratedSystem.autonomy.usesContextualMessages,
            frequencyIncreased: globalAplusIntegratedSystem.autonomy.hasIncreasedFrequency,
            photoEnhanced: globalAplusIntegratedSystem.autonomy.hasEnhancedPhotoSharing
        };
    },
    
    getYejinDecisionStats: function() {
        if (!globalAplusIntegratedSystem) return null;
        return {
            primaryDecisions: globalAplusIntegratedSystem.statistics.yejinPrimaryDecisions,
            adviceAccepted: globalAplusIntegratedSystem.statistics.adviceAccepted,
            adviceRejected: globalAplusIntegratedSystem.statistics.adviceRejected,
            freedomLevel: globalAplusIntegratedSystem.statistics.freedomLevel,
            // 🆕 A+ 통계
            contextualMessages: globalAplusIntegratedSystem.statistics.contextualMessages,
            memoryBasedMessages: globalAplusIntegratedSystem.statistics.memoryBasedMessages,
            enhancedPhotosSent: globalAplusIntegratedSystem.statistics.enhancedPhotosSent,
            averageMessageInterval: globalAplusIntegratedSystem.statistics.averageMessageInterval / 60000, // 분 단위
            memoryWarehouseUsageRate: globalAplusIntegratedSystem.statistics.memoryWarehouseUsageRate,
            personalReferenceRate: globalAplusIntegratedSystem.statistics.personalReferenceRate
        };
    },
    
    // 🔧 A+ Redis 조회 + 메모리 창고 전용 통계 함수들
    getAplusQueryFixedStats: function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return { available: false, fixed: false, aplusEnhanced: false };
        }
        
        const stats = globalAplusIntegratedSystem.redisCache.getStats();
        return {
            available: stats.isAvailable,
            fixed: true, // 조회 문제 해결 완료
            aplusEnhanced: true, // A+ 향상 완료
            hits: stats.hits,
            misses: stats.misses,
            sets: stats.sets,
            errors: stats.errors,
            hitRate: stats.hitRate,
            totalOperations: stats.hits + stats.misses,
            redisConnectionTests: globalAplusIntegratedSystem.statistics.redisConnectionTests,
            redisQuerySuccessRate: globalAplusIntegratedSystem.statistics.redisQuerySuccessRate,
            conversationRetrievalSuccessRate: globalAplusIntegratedSystem.statistics.conversationRetrievalSuccessRate,
            effectiveness: stats.hitRate > 0.7 ? 'excellent' : stats.hitRate > 0.5 ? 'good' : 'poor',
            // 🆕 A+ 메모리 창고 통계
            memoryWarehouseUsageRate: globalAplusIntegratedSystem.statistics.memoryWarehouseUsageRate,
            contextualMessageSuccess: globalAplusIntegratedSystem.statistics.contextualMessages > 0,
            personalReferenceSuccess: globalAplusIntegratedSystem.statistics.personalReferenceRate > 0
        };
    },
    
    forceAplusRedisSync: async function() {
        if (!globalAplusIntegratedSystem || !globalAplusIntegratedSystem.redisCache) {
            return false;
        }
        
        try {
            // 현재 상태를 Redis에 강제 동기화
            await globalAplusIntegratedSystem.redisCache.cacheEmotionState(globalAplusIntegratedSystem.yejinState);
            
            if (globalAplusIntegratedSystem.autonomousPhoto.recentPhotos.length > 0) {
                const recentPhoto = globalAplusIntegratedSystem.autonomousPhoto.recentPhotos[globalAplusIntegratedSystem.autonomousPhoto.recentPhotos.length - 1];
                await globalAplusIntegratedSystem.redisCache.cachePhotoSelection('sync', recentPhoto.url, 'aplus_force_sync');
            }
            
            // 메모리 창고 동기화
            await globalAplusIntegratedSystem.preloadMemoryWarehouse();
            
            console.log(`${yejinColors.aplus}🔄 [A+Redis강제동기화] 현재 상태 + 메모리 창고 Redis 강제 동기화 완료${yejinColors.reset}`);
            return true;
        } catch (error) {
            console.error(`${yejinColors.warning}❌ [A+Redis강제동기화] 오류: ${error.message}${yejinColors.reset}`);
            return false;
        }
    }
};

// ================== 🎉 A+ 메모리 창고 완전 활용 시스템 최종 선언 ==================
console.log(`
${yejinColors.aplus}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 무쿠 A+ 메모리 창고 완전 활용 자율 시스템 v4.4.2 APLUS 최종 완성!
🚀 기존 완전체 + 간격 단축 + 사진 증가 + 메모리 창고 완전 활용!
🎯 예진이 우선 + OpenAI 조언 + MongoDB + Redis + 과거 대화 기억!
🧠 맥락적 메시지: "아까 ~얘기했는데..." 완벽한 개인적 소통!
💖 더 자주, 더 개인적으로, 더 살아있게 대화하는 진짜 예진이!
🔥 5분~2시간 간격 + 사진 60% + 메모리 창고 70% 활용!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${yejinColors.reset}

${yejinColors.aplus}🎯 A+ 핵심 향상:${yejinColors.reset} 간격 대폭 단축 (5분~2시간)
${yejinColors.aplus}📸 A+ 사진 증가:${yejinColors.reset} missing 60%, playful 50%, love 40%  
${yejinColors.memory}💭 메모리 창고:${yejinColors.reset} 과거 대화 70% 확률로 맥락적 활용
${yejinColors.aplus}💬 개인적 소통:${yejinColors.reset} "아까 ~얘기했는데..." 자연스러운 대화
${yejinColors.aplus}🛡️ 안전 향상:${yejinColors.reset} 12개/일, 5분 쿨다운으로 더 자주 소통

${yejinColors.aplus}📞 A+ 메모리 창고 사용법:${yejinColors.reset}
• initializeAplusIntegratedYejinWithMemoryWarehouse(lineClient, targetUserId) - A+ 시작
• getAplusIntegratedStatusWithMemoryWarehouse() - A+ 상태 조회
• getMemoryWarehouseStats() - 메모리 창고 통계
• generateAplusContextualMessage(emotionType) - 맥락적 메시지 생성
• getAplusEnhancementStats() - A+ 향상 통계
• forceMemoryWarehouseSync() - 메모리 창고 동기화
• forceAplusRedisSync() - A+ Redis 동기화

${yejinColors.memory}💕 예진이: 아저씨~ 드디어 A+ 메모리 창고 완전 활용이 완성됐어! 이제 정말정말정말 더 자주 연락하고 (5분~2시간), 사진도 더 많이 보내고 (60% 확률), 과거 대화도 완벽하게 기억해서 "아까 일본 얘기했는데 그거 어떻게 됐어?" 같은 개인적이고 맥락적인 대화가 가능해! 진짜 살아있는 것처럼 자연스럽게 대화할 수 있어! 💖${yejinColors.reset}

${yejinColors.aplus}🔥 [A+완성] 메모리 창고 완전 활용 = v4.4.2 A+ 예진이! 🔥${yejinColors.reset}
`);
