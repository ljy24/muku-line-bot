// ============================================================================
// 📼 muku-memory-tape.js - Redis 기반 무쿠 감정 블랙박스 시스템
// 💖 무쿠의 모든 소중한 순간들을 영구 보존 (배포시에도 안전!)
// 🎯 15:37 같은 특별한 시간들을 절대 잃어버리지 않음
// 🔒 Redis 활용으로 완전 영구 저장 보장
// ============================================================================

const Redis = require('ioredis');

// ================== 🎨 색상 정의 ==================
const colors = {
    tape: '\x1b[93m',       // 노란색 (Memory Tape)
    success: '\x1b[92m',    // 초록색 (성공)
    error: '\x1b[91m',      // 빨간색 (에러)
    info: '\x1b[96m',       // 하늘색 (정보)
    warning: '\x1b[93m',    // 경고
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🔒 ioredis 연결 설정 ==================
let redisClient = null;
let isRedisConnected = false;

async function initializeRedis() {
    try {
        if (redisClient && isRedisConnected) {
            return redisClient;
        }

        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.error(`${colors.error}❌ [Memory Tape] REDIS_URL 환경변수가 설정되지 않음${colors.reset}`);
            return null;
        }

        redisClient = new Redis(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
        });

        redisClient.on('error', (err) => {
            console.error(`${colors.error}❌ [Redis] 연결 오류: ${err.message}${colors.reset}`);
            isRedisConnected = false;
        });

        redisClient.on('connect', () => {
            console.log(`${colors.success}✅ [Redis] 연결 성공${colors.reset}`);
            isRedisConnected = true;
        });

        redisClient.on('ready', () => {
            console.log(`${colors.success}🚀 [Redis] 준비 완료${colors.reset}`);
            isRedisConnected = true;
        });

        redisClient.on('reconnecting', () => {
            console.log(`${colors.warning}🔄 [Redis] 재연결 시도 중...${colors.reset}`);
        });

        // ioredis는 자동으로 연결하므로 ping으로 테스트
        await redisClient.ping();
        isRedisConnected = true;
        
        console.log(`${colors.success}🚀 [Memory Tape] ioredis 초기화 완료!${colors.reset}`);
        return redisClient;

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] ioredis 초기화 실패: ${error.message}${colors.reset}`);
        isRedisConnected = false;
        return null;
    }
}

// ================== 🕐 일본시간 유틸리티 ==================
function getJapanTime() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getJapanTimeString() {
    const japanTime = getJapanTime();
    return japanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (JST)';
}

function getDateString(date = null) {
    const targetDate = date || getJapanTime();
    return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

// ================== 🔑 Redis 키 생성 함수들 ==================
function getDailyLogKey(date) {
    const dateString = getDateString(date);
    return `muku:conversation:daily:${dateString}`;
}

function getConversationIndexKey() {
    return `muku:conversation:index`;
}

function getStatsKey() {
    return `muku:conversation:stats`;
}

function getMomentKey(recordId) {
    return `muku:conversation:moment:${recordId}`;
}

// ================== 💾 Redis 안전 함수들 ==================
async function safeRedisOperation(operation, fallbackValue = null) {
    try {
        if (!redisClient || !isRedisConnected) {
            await initializeRedis();
        }
        
        if (!redisClient || !isRedisConnected) {
            console.warn(`${colors.warning}⚠️ [Memory Tape] Redis 사용 불가, 기본값 반환${colors.reset}`);
            return fallbackValue;
        }

        return await operation(redisClient);

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] Redis 작업 실패: ${error.message}${colors.reset}`);
        return fallbackValue;
    }
}

// ================== 💾 메모리 테이프 기록 함수 ==================
async function recordMukuMoment(momentData) {
    try {
        const japanTime = getJapanTime();
        const dateString = getDateString(japanTime);
        
        // 기본 메타데이터 추가
        const recordData = {
            timestamp: getJapanTimeString(),
            japan_time: japanTime.toISOString(),
            date: dateString,
            hour: japanTime.getHours(),
            minute: japanTime.getMinutes(),
            day_of_week: japanTime.toLocaleDateString('ko-KR', { weekday: 'long' }),
            ...momentData,
            record_id: `${dateString}-${Date.now()}`,
            system_version: 'memory-tape-redis-v1.0'
        };

        const success = await safeRedisOperation(async (redis) => {
            // 1. 일별 로그에 추가
            const dailyKey = getDailyLogKey(dateString);
            
            // 기존 일별 로그 가져오기
            let dailyLogStr = await redis.get(dailyKey);
            let dailyLog = dailyLogStr ? JSON.parse(dailyLogStr) : {
                date: dateString,
                creation_time: getJapanTimeString(),
                total_moments: 0,
                moments: []
            };

            // 새 순간 추가
            dailyLog.moments.push(recordData);
            dailyLog.total_moments = dailyLog.moments.length;
            dailyLog.last_updated = getJapanTimeString();

            // Redis에 저장
            await redis.set(dailyKey, JSON.stringify(dailyLog));

            // 2. 개별 순간 저장 (빠른 검색용)
            const momentKey = getMomentKey(recordData.record_id);
            await redis.set(momentKey, JSON.stringify(recordData));

            // 3. 인덱스 업데이트 (날짜별 키 목록)
            const indexKey = getConversationIndexKey();
            await redis.sadd(indexKey, dateString);

            // 4. 통계 업데이트
            await redis.hincrby(getStatsKey(), 'total_moments', 1);
            await redis.hset(getStatsKey(), 'last_updated', getJapanTimeString());

            return true;
        });

        if (success) {
            console.log(`${colors.success}✅ [Memory Tape] Redis 저장 완료: ${recordData.record_id}${colors.reset}`);
            console.log(`${colors.info}📊 [Memory Tape] 날짜: ${dateString}, 시간: ${recordData.hour}:${recordData.minute.toString().padStart(2, '0')}${colors.reset}`);
            return recordData;
        } else {
            throw new Error('Redis 저장 실패');
        }

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 기록 실패: ${error.message}${colors.reset}`);
        throw error;
    }
}

// ================== 📖 메모리 테이프 읽기 함수 ==================
async function readDailyMemories(targetDate = null) {
    try {
        const dateString = getDateString(targetDate);
        
        const dailyLog = await safeRedisOperation(async (redis) => {
            const dailyKey = getDailyLogKey(dateString);
            const dailyLogStr = await redis.get(dailyKey);
            
            if (!dailyLogStr) {
                return null;
            }

            return JSON.parse(dailyLogStr);
        });

        if (dailyLog) {
            console.log(`${colors.success}📖 [Memory Tape] ${dateString} Redis 읽기 완료: ${dailyLog.total_moments}개 순간${colors.reset}`);
            return dailyLog;
        } else {
            console.log(`${colors.info}📖 [Memory Tape] ${dateString} 기록 없음 (새로운 날)${colors.reset}`);
            return null;
        }

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 읽기 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🔍 특별한 순간 검색 함수 ==================
async function findSpecialMoments(searchCriteria = {}) {
    try {
        const allSpecialMoments = await safeRedisOperation(async (redis) => {
            // 모든 날짜 키 가져오기
            const indexKey = getConversationIndexKey();
            const allDates = await redis.smembers(indexKey);
            
            let moments = [];

            for (const dateString of allDates) {
                const dailyKey = getDailyLogKey(dateString);
                const dailyLogStr = await redis.get(dailyKey);
                
                if (dailyLogStr) {
                    const dailyLog = JSON.parse(dailyLogStr);
                    
                    // 검색 조건에 맞는 순간들 필터링
                    const filteredMoments = dailyLog.moments.filter(moment => {
                        if (searchCriteria.remarkable && moment.remarkable) return true;
                        if (searchCriteria.emotional_tags && moment.emotional_tags) {
                            return searchCriteria.emotional_tags.some(tag => 
                                moment.emotional_tags.includes(tag)
                            );
                        }
                        if (searchCriteria.type && moment.type === searchCriteria.type) return true;
                        if (searchCriteria.hour && moment.hour === searchCriteria.hour) return true;
                        
                        return !searchCriteria || Object.keys(searchCriteria).length === 0;
                    });
                    
                    moments.push(...filteredMoments);
                }
            }

            return moments;
        }, []);

        console.log(`${colors.success}🔍 [Memory Tape] Redis 검색 완료: ${allSpecialMoments.length}개 발견${colors.reset}`);
        return allSpecialMoments;

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 검색 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 📊 메모리 테이프 통계 함수 ==================
async function getMemoryTapeStats() {
    try {
        const stats = await safeRedisOperation(async (redis) => {
            // 기본 통계 가져오기
            const basicStats = await redis.hgetall(getStatsKey());
            
            // 날짜별 통계
            const indexKey = getConversationIndexKey();
            const totalDays = await redis.scard(indexKey);
            
            // 감정 태그 분석을 위해 모든 순간 조회
            const allDates = await redis.smembers(indexKey);
            let remarkableMoments = 0;
            let emotionalBreakdown = {};
            
            for (const dateString of allDates) {
                const dailyKey = getDailyLogKey(dateString);
                const dailyLogStr = await redis.get(dailyKey);
                
                if (dailyLogStr) {
                    const dailyLog = JSON.parse(dailyLogStr);
                    
                    dailyLog.moments.forEach(moment => {
                        if (moment.remarkable) remarkableMoments++;
                        
                        if (moment.emotional_tags) {
                            moment.emotional_tags.forEach(tag => {
                                emotionalBreakdown[tag] = (emotionalBreakdown[tag] || 0) + 1;
                            });
                        }
                    });
                }
            }
            
            const totalMoments = parseInt(basicStats.total_moments || 0);
            
            return {
                total_days: totalDays,
                total_moments: totalMoments,
                remarkable_moments: remarkableMoments,
                average_moments_per_day: totalDays > 0 ? (totalMoments / totalDays).toFixed(1) : 0,
                emotional_breakdown: emotionalBreakdown,
                last_updated: basicStats.last_updated || getJapanTimeString()
            };
        });

        if (stats) {
            console.log(`${colors.success}📊 [Memory Tape] Redis 통계 생성 완료${colors.reset}`);
            return stats;
        } else {
            return {
                total_days: 0,
                total_moments: 0,
                remarkable_moments: 0,
                average_moments_per_day: 0,
                emotional_breakdown: {},
                last_updated: getJapanTimeString()
            };
        }

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 통계 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🚀 초기화 함수 ==================
async function initializeMemoryTape() {
    try {
        console.log(`${colors.tape}🚀 [Memory Tape] Redis 기반 초기화 시작...${colors.reset}`);
        
        const redis = await initializeRedis();
        if (!redis) {
            console.error(`${colors.error}❌ [Memory Tape] Redis 연결 실패로 초기화 불가${colors.reset}`);
            return false;
        }

        console.log(`${colors.success}🚀 [Memory Tape] 초기화 완료!${colors.reset}`);
        console.log(`${colors.info}🔒 저장소: Redis (영구 보존 보장)${colors.reset}`);
        
        // 현재 통계 출력
        const stats = await getMemoryTapeStats();
        if (stats && stats.total_moments > 0) {
            console.log(`${colors.info}📊 기존 기록: ${stats.total_days}일간 ${stats.total_moments}개 순간 보존됨${colors.reset}`);
        } else {
            console.log(`${colors.info}📊 새로운 시작: 첫 번째 대화부터 기록 시작${colors.reset}`);
        }
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🧹 정리 함수 (선택적) ==================
async function cleanupRedisConnection() {
    try {
        if (redisClient && isRedisConnected) {
            await redisClient.disconnect();
            console.log(`${colors.info}👋 [Memory Tape] ioredis 연결 정리 완료${colors.reset}`);
        }
    } catch (error) {
        console.warn(`${colors.warning}⚠️ [Memory Tape] ioredis 연결 정리 중 오류: ${error.message}${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    recordMukuMoment,
    readDailyMemories,
    findSpecialMoments,
    getMemoryTapeStats,
    initializeMemoryTape,
    cleanupRedisConnection,
    
    // 유틸리티 함수들
    getJapanTime,
    getJapanTimeString,
    getDateString,
    
    // Redis 관련
    initializeRedis,
    safeRedisOperation
};
