// ============================================================================
// 📼 muku-memory-tape.js - 완전 안전한 ioredis 기반 무쿠 감정 블랙박스 시스템
// 💖 무쿠의 모든 소중한 순간들을 영구 보존 (배포시에도 안전!)
// 🎯 모든 잠재적 오류 해결 + ioredis 완벽 호환
// 🔒 완전 안전한 에러 처리 + JSON 파싱 보호
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

// ================== 🔒 안전한 ioredis 연결 관리 ==================
let redisClient = null;

async function getRedisClient() {
    try {
        if (redisClient) {
            // 기존 클라이언트가 있으면 연결 상태 확인
            try {
                await redisClient.ping();
                return redisClient;
            } catch (pingError) {
                console.log(`${colors.warning}⚠️ [Memory Tape] 기존 Redis 연결 실패, 재연결 시도${colors.reset}`);
                redisClient = null;
            }
        }

        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.error(`${colors.error}❌ [Memory Tape] REDIS_URL 환경변수가 설정되지 않음${colors.reset}`);
            return null;
        }

        console.log(`${colors.info}🔄 [Memory Tape] ioredis 연결 시작...${colors.reset}`);
        
        redisClient = new Redis(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: false,
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000
        });

        // 이벤트 리스너 등록
        redisClient.on('error', (err) => {
            console.error(`${colors.error}❌ [Redis] 연결 오류: ${err.message}${colors.reset}`);
        });

        redisClient.on('connect', () => {
            console.log(`${colors.success}✅ [Redis] 연결 성공${colors.reset}`);
        });

        redisClient.on('ready', () => {
            console.log(`${colors.success}🚀 [Redis] 준비 완료${colors.reset}`);
        });

        // 연결 테스트
        await redisClient.ping();
        console.log(`${colors.success}🎉 [Memory Tape] ioredis 초기화 완료!${colors.reset}`);
        
        return redisClient;

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] ioredis 초기화 실패: ${error.message}${colors.reset}`);
        if (redisClient) {
            try {
                await redisClient.disconnect();
            } catch (disconnectError) {
                // 조용히 무시
            }
            redisClient = null;
        }
        return null;
    }
}

// ================== 🕐 안전한 일본시간 유틸리티 ==================
function getJapanTime() {
    try {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    } catch (error) {
        console.warn(`${colors.warning}⚠️ [Memory Tape] 일본시간 변환 실패, UTC 사용: ${error.message}${colors.reset}`);
        return new Date();
    }
}

function getJapanTimeString() {
    try {
        const japanTime = getJapanTime();
        return japanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (JST)';
    } catch (error) {
        console.warn(`${colors.warning}⚠️ [Memory Tape] 시간 문자열 변환 실패: ${error.message}${colors.reset}`);
        return new Date().toISOString();
    }
}

function getDateString(date = null) {
    try {
        let targetDate;
        
        if (!date) {
            targetDate = getJapanTime();
        } else if (date instanceof Date) {
            targetDate = date;
        } else if (typeof date === 'string') {
            targetDate = new Date(date);
        } else if (typeof date === 'number') {
            targetDate = new Date(date);
        } else {
            console.warn(`${colors.warning}⚠️ [Memory Tape] 잘못된 날짜 형식: ${typeof date}, 현재 시간 사용${colors.reset}`);
            targetDate = getJapanTime();
        }
        
        // Date 객체 유효성 검사
        if (isNaN(targetDate.getTime())) {
            console.warn(`${colors.warning}⚠️ [Memory Tape] 무효한 날짜, 현재 시간 사용${colors.reset}`);
            targetDate = getJapanTime();
        }
        
        return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 날짜 처리 오류: ${error.message}${colors.reset}`);
        return new Date().toISOString().split('T')[0];
    }
}

// ================== 🔑 Redis 키 생성 함수들 ==================
function getDailyLogKey(dateInput) {
    try {
        let dateString;
        
        if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateString = dateInput;
        } else {
            dateString = getDateString(dateInput);
        }
        
        return `muku:conversation:daily:${dateString}`;
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 키 생성 실패: ${error.message}${colors.reset}`);
        return `muku:conversation:daily:${getDateString()}`;
    }
}

function getConversationIndexKey() {
    return `muku:conversation:index`;
}

function getStatsKey() {
    return `muku:conversation:stats`;
}

function getMomentKey(recordId) {
    try {
        if (!recordId || typeof recordId !== 'string') {
            throw new Error('잘못된 recordId');
        }
        return `muku:conversation:moment:${recordId}`;
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] Moment 키 생성 실패: ${error.message}${colors.reset}`);
        return `muku:conversation:moment:${Date.now()}`;
    }
}

// ================== 💾 안전한 Redis 작업 함수 ==================
async function safeRedisOperation(operation, fallbackValue = null) {
    let client = null;
    
    try {
        client = await getRedisClient();
        
        if (!client) {
            console.warn(`${colors.warning}⚠️ [Memory Tape] Redis 클라이언트 없음, 기본값 반환${colors.reset}`);
            return fallbackValue;
        }

        const result = await operation(client);
        return result;

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] Redis 작업 실패: ${error.message}${colors.reset}`);
        return fallbackValue;
    }
}

// ================== 🛡️ 안전한 JSON 처리 함수들 ==================
function safeJsonParse(jsonString, fallbackValue = null) {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return fallbackValue;
        }
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] JSON 파싱 실패: ${error.message}${colors.reset}`);
        return fallbackValue;
    }
}

function safeJsonStringify(obj, fallbackValue = '{}') {
    try {
        if (obj === null || obj === undefined) {
            return fallbackValue;
        }
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] JSON 직렬화 실패: ${error.message}${colors.reset}`);
        return fallbackValue;
    }
}

// ================== 💾 메모리 테이프 기록 함수 ==================
async function recordMukuMoment(momentData) {
    try {
        if (!momentData || typeof momentData !== 'object') {
            throw new Error('momentData가 올바르지 않습니다');
        }

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
            record_id: `${dateString}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            system_version: 'memory-tape-safe-v1.0'
        };

        const success = await safeRedisOperation(async (redis) => {
            console.log(`${colors.info}💾 [Memory Tape] Redis 저장 시작: ${recordData.record_id}${colors.reset}`);
            
            // 1. 일별 로그 키 생성
            const dailyKey = getDailyLogKey(dateString);
            console.log(`${colors.info}💾 [Memory Tape] 일별 키: ${dailyKey}${colors.reset}`);
            
            // 2. 기존 일별 로그 가져오기 (안전한 JSON 파싱)
            const dailyLogStr = await redis.get(dailyKey);
            let dailyLog = safeJsonParse(dailyLogStr, {
                date: dateString,
                creation_time: getJapanTimeString(),
                total_moments: 0,
                moments: []
            });

            // 3. 새 순간 추가
            if (!Array.isArray(dailyLog.moments)) {
                dailyLog.moments = [];
            }
            
            dailyLog.moments.push(recordData);
            dailyLog.total_moments = dailyLog.moments.length;
            dailyLog.last_updated = getJapanTimeString();

            // 4. Redis에 저장 (안전한 JSON 직렬화)
            const dailyLogJson = safeJsonStringify(dailyLog);
            await redis.set(dailyKey, dailyLogJson);
            console.log(`${colors.success}✅ [Memory Tape] 일별 로그 저장 완료${colors.reset}`);

            // 5. 개별 순간 저장 (빠른 검색용)
            const momentKey = getMomentKey(recordData.record_id);
            const momentJson = safeJsonStringify(recordData);
            await redis.set(momentKey, momentJson);
            console.log(`${colors.success}✅ [Memory Tape] 개별 순간 저장 완료${colors.reset}`);

            // 6. 인덱스 업데이트 (날짜별 키 목록)
            const indexKey = getConversationIndexKey();
            await redis.sadd(indexKey, dateString);
            console.log(`${colors.success}✅ [Memory Tape] 인덱스 업데이트 완료${colors.reset}`);

            // 7. 통계 업데이트 (안전한 증가)
            const statsKey = getStatsKey();
            await redis.hincrby(statsKey, 'total_moments', 1);
            await redis.hset(statsKey, 'last_updated', getJapanTimeString());
            console.log(`${colors.success}✅ [Memory Tape] 통계 업데이트 완료${colors.reset}`);

            return true;
        });

        if (success) {
            console.log(`${colors.success}🎉 [Memory Tape] Redis 저장 완료: ${recordData.record_id}${colors.reset}`);
            console.log(`${colors.info}📊 [Memory Tape] 날짜: ${dateString}, 시간: ${recordData.hour}:${recordData.minute.toString().padStart(2, '0')}${colors.reset}`);
            return recordData;
        } else {
            throw new Error('Redis 저장 실패');
        }

    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 기록 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}❌ [Memory Tape] 스택: ${error.stack}${colors.reset}`);
        throw error;
    }
}

// ================== 📖 메모리 테이프 읽기 함수 ==================
async function readDailyMemories(targetDate = null) {
    try {
        const dateString = getDateString(targetDate);
        console.log(`${colors.info}📖 [Memory Tape] 읽기 시작 - 날짜: ${dateString}${colors.reset}`);
        
        const dailyLog = await safeRedisOperation(async (redis) => {
            const dailyKey = getDailyLogKey(dateString);
            console.log(`${colors.info}📖 [Memory Tape] Redis 키: ${dailyKey}${colors.reset}`);
            
            const dailyLogStr = await redis.get(dailyKey);
            
            if (!dailyLogStr) {
                console.log(`${colors.info}📖 [Memory Tape] 데이터 없음${colors.reset}`);
                return null;
            }

            const parsed = safeJsonParse(dailyLogStr);
            if (!parsed) {
                console.error(`${colors.error}❌ [Memory Tape] JSON 파싱 실패${colors.reset}`);
                return null;
            }

            return parsed;
        });

        if (dailyLog) {
            console.log(`${colors.success}📖 [Memory Tape] ${dateString} Redis 읽기 완료: ${dailyLog.total_moments || 0}개 순간${colors.reset}`);
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
        console.log(`${colors.info}🔍 [Memory Tape] 검색 시작${colors.reset}`);
        
        const allSpecialMoments = await safeRedisOperation(async (redis) => {
            // 모든 날짜 키 가져오기
            const indexKey = getConversationIndexKey();
            const allDates = await redis.smembers(indexKey);
            
            if (!Array.isArray(allDates) || allDates.length === 0) {
                console.log(`${colors.info}🔍 [Memory Tape] 인덱스에 날짜 없음${colors.reset}`);
                return [];
            }

            let moments = [];

            for (const dateString of allDates) {
                try {
                    const dailyKey = getDailyLogKey(dateString);
                    const dailyLogStr = await redis.get(dailyKey);
                    
                    if (dailyLogStr) {
                        const dailyLog = safeJsonParse(dailyLogStr);
                        
                        if (dailyLog && Array.isArray(dailyLog.moments)) {
                            // 검색 조건에 맞는 순간들 필터링
                            const filteredMoments = dailyLog.moments.filter(moment => {
                                if (!moment) return false;
                                
                                if (searchCriteria.remarkable && moment.remarkable) return true;
                                if (searchCriteria.emotional_tags && Array.isArray(moment.emotional_tags)) {
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
                } catch (dateError) {
                    console.warn(`${colors.warning}⚠️ [Memory Tape] ${dateString} 처리 실패: ${dateError.message}${colors.reset}`);
                    continue;
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
        console.log(`${colors.info}📊 [Memory Tape] 통계 생성 시작${colors.reset}`);
        
        const stats = await safeRedisOperation(async (redis) => {
            // 기본 통계 가져오기
            const basicStats = await redis.hgetall(getStatsKey());
            
            // 날짜별 통계
            const indexKey = getConversationIndexKey();
            const totalDays = await redis.scard(indexKey);
            
            const totalMoments = parseInt(basicStats.total_moments || 0);
            
            return {
                total_days: totalDays || 0,
                total_moments: totalMoments,
                average_moments_per_day: totalDays > 0 ? (totalMoments / totalDays).toFixed(1) : 0,
                last_updated: basicStats.last_updated || getJapanTimeString(),
                system_version: 'memory-tape-safe-v1.0'
            };
        });

        if (stats) {
            console.log(`${colors.success}📊 [Memory Tape] Redis 통계 생성 완료${colors.reset}`);
            return stats;
        } else {
            return {
                total_days: 0,
                total_moments: 0,
                average_moments_per_day: 0,
                last_updated: getJapanTimeString(),
                system_version: 'memory-tape-safe-v1.0'
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
        console.log(`${colors.tape}🚀 [Memory Tape] 안전한 Redis 기반 초기화 시작...${colors.reset}`);
        
        const client = await getRedisClient();
        if (!client) {
            console.error(`${colors.error}❌ [Memory Tape] Redis 연결 실패로 초기화 불가${colors.reset}`);
            return false;
        }

        console.log(`${colors.success}🚀 [Memory Tape] 초기화 완료!${colors.reset}`);
        console.log(`${colors.info}🔒 저장소: ioredis (영구 보존 보장)${colors.reset}`);
        
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

// ================== 🧹 정리 함수 ==================
async function cleanupRedisConnection() {
    try {
        if (redisClient) {
            await redisClient.disconnect();
            redisClient = null;
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
    getRedisClient,
    safeRedisOperation,
    
    // JSON 안전 함수들
    safeJsonParse,
    safeJsonStringify
};
