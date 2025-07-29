// ============================================================================
// 📼 muku-memory-tape.js - 무쿠 Redis 기반 감정 블랙박스 시스템
// 💖 무쿠의 모든 소중한 순간들을 Redis에 영구 보존
// 🎯 15:37 같은 특별한 시간들을 절대 잃어버리지 않음
// 🌟 매일 매시간 무쿠의 감정 변화 완벽 추적 (Redis 완전 연동)
// 🔧 ioredis 문법 100% 준수 버전
// ============================================================================

const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    tape: '\x1b[93m',       // 노란색 (Memory Tape)
    success: '\x1b[92m',    // 초록색 (성공)
    error: '\x1b[91m',      // 빨간색 (에러)
    info: '\x1b[96m',       // 하늘색 (정보)
    redis: '\x1b[1m\x1b[94m', // 굵은 파란색 (Redis)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📁 디렉토리 및 Redis 설정 ==================
const MEMORY_TAPE_DIR = path.join(__dirname);
const BACKUP_DIR = path.join(MEMORY_TAPE_DIR, 'redis-backup');

// Redis 클라이언트 초기화
let redisClient = null;
let isRedisAvailable = false;

try {
    // 환경변수에서 Redis URL 가져오기
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(REDIS_URL);
    
    // Redis 연결 이벤트 처리
    redisClient.on('connect', () => {
        isRedisAvailable = true;
        console.log(`${colors.redis}🔗 [Memory Tape Redis] 연결 성공${colors.reset}`);
    });
    
    redisClient.on('error', (error) => {
        isRedisAvailable = false;
        console.error(`${colors.error}❌ [Memory Tape Redis] 연결 오류: ${error.message}${colors.reset}`);
    });
    
    redisClient.on('close', () => {
        isRedisAvailable = false;
        console.log(`${colors.redis}🔌 [Memory Tape Redis] 연결 종료${colors.reset}`);
    });
    
} catch (error) {
    console.error(`${colors.error}❌ [Memory Tape Redis] 초기화 실패: ${error.message}${colors.reset}`);
    redisClient = null;
    isRedisAvailable = false;
}

// ================== 🕐 일본시간 유틸리티 ==================
function getJapanTime() {
    const now = new Date();
    const japanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    return japanTime;
}

function getJapanTimeString() {
    const japanTime = getJapanTime();
    return japanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (JST)';
}

function getDateString(date = null) {
    const targetDate = date || getJapanTime();
    return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

// ================== 📂 백업 디렉토리 초기화 ==================
async function ensureBackupDirectoryExists() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        console.log(`${colors.tape}📼 [Memory Tape] 백업 디렉토리 준비 완료: ${BACKUP_DIR}${colors.reset}`);
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 백업 디렉토리 생성 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 🔌 Redis 연결 확인 및 테스트 ==================
async function testRedisConnection() {
    if (!redisClient) {
        console.error(`${colors.error}❌ [Memory Tape Redis] Redis 클라이언트가 초기화되지 않음${colors.reset}`);
        return false;
    }
    
    try {
        const result = await redisClient.ping();
        isRedisAvailable = result === 'PONG';
        
        if (isRedisAvailable) {
            console.log(`${colors.redis}✅ [Memory Tape Redis] 연결 테스트 성공: ${result}${colors.reset}`);
        } else {
            console.error(`${colors.error}❌ [Memory Tape Redis] 연결 테스트 실패: ${result}${colors.reset}`);
        }
        
        return isRedisAvailable;
    } catch (error) {
        isRedisAvailable = false;
        console.error(`${colors.error}❌ [Memory Tape Redis] 연결 테스트 중 오류: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 💾 Redis 키 생성 함수들 ==================
function getDailyKey(date = null) {
    const dateString = getDateString(date);
    return `muku:memory-tape:daily:${dateString}`;
}

function getMomentKey(momentId) {
    return `muku:memory-tape:moment:${momentId}`;
}

function getIndexKey() {
    return `muku:memory-tape:index`;
}

function getStatsKey() {
    return `muku:memory-tape:stats`;
}

// ================== 💾 Redis 기반 메모리 테이프 기록 함수 ==================
async function recordMukuMoment(momentData) {
    if (!isRedisAvailable) {
        console.warn(`${colors.error}⚠️ [Memory Tape Redis] Redis 사용 불가, 백업 파일로 저장 시도${colors.reset}`);
        return await recordMukuMomentToFile(momentData);
    }
    
    try {
        // 현재 일본시간 기준으로 데이터 생성
        const japanTime = getJapanTime();
        const dateString = getDateString(japanTime);
        const momentId = `${dateString}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // 기본 메타데이터 추가
        const recordData = {
            moment_id: momentId,
            timestamp: getJapanTimeString(),
            japan_time: japanTime.toISOString(),
            date: dateString,
            hour: japanTime.getHours(),
            minute: japanTime.getMinutes(),
            day_of_week: japanTime.toLocaleDateString('ko-KR', { weekday: 'long' }),
            ...momentData,
            system_version: 'memory-tape-redis-v1.0',
            stored_at: Date.now()
        };
        
        // 1. 개별 순간 저장
        const momentKey = getMomentKey(momentId);
        await redisClient.set(momentKey, JSON.stringify(recordData), 'EX', 7 * 24 * 60 * 60); // 7일 TTL
        
        // 2. 일별 로그에 추가
        const dailyKey = getDailyKey(japanTime);
        await redisClient.lpush(dailyKey, momentId);
        await redisClient.expire(dailyKey, 30 * 24 * 60 * 60); // 30일 TTL
        
        // 3. 인덱스 업데이트 (최근 순간들 추적)
        const indexKey = getIndexKey();
        await redisClient.zadd(indexKey, Date.now(), momentId);
        await redisClient.zremrangebyrank(indexKey, 0, -1001); // 최근 1000개만 유지
        
        // 4. 통계 업데이트
        const statsKey = getStatsKey();
        await redisClient.hincrby(statsKey, 'total_moments', 1);
        await redisClient.hset(statsKey, 'last_moment_time', getJapanTimeString());
        await redisClient.hset(statsKey, 'last_moment_date', dateString);
        
        // 특별한 순간인 경우 추가 처리
        if (recordData.remarkable) {
            await redisClient.hincrby(statsKey, 'remarkable_moments', 1);
            await redisClient.sadd('muku:memory-tape:remarkable', momentId);
        }
        
        // 감정 태그별 통계
        if (recordData.emotional_tags && Array.isArray(recordData.emotional_tags)) {
            for (const tag of recordData.emotional_tags) {
                await redisClient.hincrby(`muku:memory-tape:emotions:${tag}`, 'count', 1);
                await redisClient.sadd(`muku:memory-tape:emotions:${tag}:moments`, momentId);
            }
        }
        
        console.log(`${colors.success}✅ [Memory Tape Redis] 순간 기록 완료: ${momentId}${colors.reset}`);
        console.log(`${colors.redis}📊 [Memory Tape Redis] 날짜: ${dateString}, 시간: ${japanTime.getHours()}:${japanTime.getMinutes()}${colors.reset}`);
        
        return recordData;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Redis] 기록 실패: ${error.message}${colors.reset}`);
        
        // Redis 실패 시 파일 백업으로 폴백
        console.log(`${colors.info}🔄 [Memory Tape] Redis 실패로 파일 백업 시도...${colors.reset}`);
        return await recordMukuMomentToFile(momentData);
    }
}

// ================== 📖 Redis 기반 메모리 테이프 읽기 함수 ==================
async function readDailyMemories(targetDate = null) {
    if (!isRedisAvailable) {
        console.warn(`${colors.error}⚠️ [Memory Tape Redis] Redis 사용 불가, 백업 파일에서 읽기 시도${colors.reset}`);
        return await readDailyMemoriesFromFile(targetDate);
    }
    
    try {
        const dateString = getDateString(targetDate);
        const dailyKey = getDailyKey(targetDate);
        
        // 해당 날짜의 모든 순간 ID 가져오기
        const momentIds = await redisClient.lrange(dailyKey, 0, -1);
        
        if (momentIds.length === 0) {
            console.log(`${colors.info}📖 [Memory Tape Redis] ${dateString} 기록 없음 (새로운 날)${colors.reset}`);
            return null;
        }
        
        // 각 순간의 상세 데이터 가져오기
        const moments = [];
        for (const momentId of momentIds) {
            try {
                const momentKey = getMomentKey(momentId);
                const momentData = await redisClient.get(momentKey);
                
                if (momentData) {
                    const parsedMoment = JSON.parse(momentData);
                    moments.push(parsedMoment);
                }
            } catch (parseError) {
                console.warn(`${colors.error}⚠️ [Memory Tape Redis] 순간 파싱 실패: ${momentId}${colors.reset}`);
            }
        }
        
        const dailyLog = {
            date: dateString,
            total_moments: moments.length,
            moments: moments.reverse(), // 시간순 정렬
            retrieved_from: 'redis',
            retrieval_time: getJapanTimeString()
        };
        
        console.log(`${colors.success}📖 [Memory Tape Redis] ${dateString} 기록 읽기 완료: ${moments.length}개 순간${colors.reset}`);
        return dailyLog;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Redis] 읽기 실패: ${error.message}${colors.reset}`);
        
        // Redis 실패 시 파일에서 읽기 시도
        console.log(`${colors.info}🔄 [Memory Tape] Redis 실패로 파일에서 읽기 시도...${colors.reset}`);
        return await readDailyMemoriesFromFile(targetDate);
    }
}

// ================== 🔍 Redis 기반 특별한 순간 검색 함수 ==================
async function findSpecialMoments(searchCriteria = {}) {
    if (!isRedisAvailable) {
        console.warn(`${colors.error}⚠️ [Memory Tape Redis] Redis 사용 불가, 백업 파일에서 검색 시도${colors.reset}`);
        return await findSpecialMomentsFromFile(searchCriteria);
    }
    
    try {
        let allSpecialMoments = [];
        
        // 검색 조건에 따른 다양한 전략
        if (searchCriteria.remarkable) {
            // 특별한 순간들만 검색
            const remarkableMomentIds = await redisClient.smembers('muku:memory-tape:remarkable');
            
            for (const momentId of remarkableMomentIds) {
                try {
                    const momentKey = getMomentKey(momentId);
                    const momentData = await redisClient.get(momentKey);
                    
                    if (momentData) {
                        const parsedMoment = JSON.parse(momentData);
                        allSpecialMoments.push(parsedMoment);
                    }
                } catch (parseError) {
                    console.warn(`${colors.error}⚠️ [Memory Tape Redis] 특별한 순간 파싱 실패: ${momentId}${colors.reset}`);
                }
            }
        } else if (searchCriteria.emotional_tags && Array.isArray(searchCriteria.emotional_tags)) {
            // 감정 태그별 검색
            for (const tag of searchCriteria.emotional_tags) {
                const emotionMomentIds = await redisClient.smembers(`muku:memory-tape:emotions:${tag}:moments`);
                
                for (const momentId of emotionMomentIds) {
                    try {
                        const momentKey = getMomentKey(momentId);
                        const momentData = await redisClient.get(momentKey);
                        
                        if (momentData) {
                            const parsedMoment = JSON.parse(momentData);
                            allSpecialMoments.push(parsedMoment);
                        }
                    } catch (parseError) {
                        console.warn(`${colors.error}⚠️ [Memory Tape Redis] 감정 순간 파싱 실패: ${momentId}${colors.reset}`);
                    }
                }
            }
        } else {
            // 전체 검색 (최근 순간들 위주)
            const indexKey = getIndexKey();
            const recentMomentIds = await redisClient.zrevrange(indexKey, 0, 99); // 최근 100개
            
            for (const momentId of recentMomentIds) {
                try {
                    const momentKey = getMomentKey(momentId);
                    const momentData = await redisClient.get(momentKey);
                    
                    if (momentData) {
                        const parsedMoment = JSON.parse(momentData);
                        
                        // 추가 필터링
                        let matches = true;
                        if (searchCriteria.type && parsedMoment.type !== searchCriteria.type) matches = false;
                        if (searchCriteria.hour && parsedMoment.hour !== searchCriteria.hour) matches = false;
                        
                        if (matches) {
                            allSpecialMoments.push(parsedMoment);
                        }
                    }
                } catch (parseError) {
                    console.warn(`${colors.error}⚠️ [Memory Tape Redis] 순간 파싱 실패: ${momentId}${colors.reset}`);
                }
            }
        }
        
        // 중복 제거 (momentId 기준)
        const uniqueMoments = allSpecialMoments.filter((moment, index, self) => 
            index === self.findIndex(m => m.moment_id === moment.moment_id)
        );
        
        console.log(`${colors.success}🔍 [Memory Tape Redis] 특별한 순간 검색 완료: ${uniqueMoments.length}개 발견${colors.reset}`);
        return uniqueMoments;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Redis] 검색 실패: ${error.message}${colors.reset}`);
        
        // Redis 실패 시 파일에서 검색 시도
        console.log(`${colors.info}🔄 [Memory Tape] Redis 실패로 파일에서 검색 시도...${colors.reset}`);
        return await findSpecialMomentsFromFile(searchCriteria);
    }
}

// ================== 📊 Redis 기반 메모리 테이프 통계 함수 ==================
async function getMemoryTapeStats() {
    if (!isRedisAvailable) {
        console.warn(`${colors.error}⚠️ [Memory Tape Redis] Redis 사용 불가, 백업 파일에서 통계 시도${colors.reset}`);
        return await getMemoryTapeStatsFromFile();
    }
    
    try {
        const statsKey = getStatsKey();
        
        // 기본 통계 가져오기
        const basicStats = await redisClient.hgetall(statsKey);
        
        // 감정 분석
        const emotionPattern = 'muku:memory-tape:emotions:*';
        const emotionKeys = await redisClient.keys(emotionPattern);
        
        const emotionalBreakdown = {};
        for (const key of emotionKeys) {
            if (key.endsWith(':count')) continue; // 카운트 키는 건너뛰기
            if (key.endsWith(':moments')) {
                const emotion = key.replace('muku:memory-tape:emotions:', '').replace(':moments', '');
                const count = await redisClient.scard(key);
                if (count > 0) {
                    emotionalBreakdown[emotion] = count;
                }
            }
        }
        
        // 일별 통계
        const indexKey = getIndexKey();
        const totalIndexedMoments = await redisClient.zcard(indexKey);
        
        // 특별한 순간 통계
        const remarkableCount = await redisClient.scard('muku:memory-tape:remarkable');
        
        const stats = {
            total_moments: parseInt(basicStats.total_moments || 0),
            remarkable_moments: remarkableCount,
            emotional_breakdown: emotionalBreakdown,
            indexed_moments: totalIndexedMoments,
            last_moment_time: basicStats.last_moment_time || 'N/A',
            last_moment_date: basicStats.last_moment_date || 'N/A',
            redis_connection: isRedisAvailable,
            stats_generated_at: getJapanTimeString(),
            system_version: 'memory-tape-redis-v1.0'
        };
        
        console.log(`${colors.success}📊 [Memory Tape Redis] 통계 생성 완료${colors.reset}`);
        return stats;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Redis] 통계 생성 실패: ${error.message}${colors.reset}`);
        
        // Redis 실패 시 파일에서 통계 시도
        console.log(`${colors.info}🔄 [Memory Tape] Redis 실패로 파일에서 통계 시도...${colors.reset}`);
        return await getMemoryTapeStatsFromFile();
    }
}

// ================== 🔄 호환성 함수들 (다른 시스템 연동용) ==================
async function saveConversation(userMessage, aiResponse) {
    return await recordMukuMoment({
        type: 'conversation',
        user_message: userMessage,
        ai_response: aiResponse,
        remarkable: true,
        emotional_tags: ['대화', '소통', '일상'],
        conversation_length: userMessage.length + aiResponse.length
    });
}

async function saveMessage(speaker, message, messageType = 'text') {
    return await recordMukuMoment({
        type: 'message',
        speaker: speaker,
        message: message,
        message_type: messageType,
        message_length: message.length,
        remarkable: messageType === 'image' || messageType === 'special',
        emotional_tags: [messageType, speaker === '무쿠' ? '무쿠메시지' : '사용자메시지']
    });
}

async function storeConversation(conversationData) {
    return await recordMukuMoment({
        type: 'conversation_data',
        ...conversationData,
        remarkable: true,
        emotional_tags: ['저장된대화', '중요']
    });
}

// ================== 📁 파일 백업 시스템 (Redis 실패 시 폴백) ==================
async function recordMukuMomentToFile(momentData) {
    try {
        await ensureBackupDirectoryExists();
        
        const japanTime = getJapanTime();
        const dateString = getDateString(japanTime);
        const fileName = `backup-day-${dateString}.json`;
        const filePath = path.join(BACKUP_DIR, fileName);
        
        const recordData = {
            timestamp: getJapanTimeString(),
            japan_time: japanTime.toISOString(),
            date: dateString,
            hour: japanTime.getHours(),
            minute: japanTime.getMinutes(),
            day_of_week: japanTime.toLocaleDateString('ko-KR', { weekday: 'long' }),
            ...momentData,
            record_id: `backup-${dateString}-${Date.now()}`,
            system_version: 'memory-tape-file-backup-v1.0'
        };
        
        let dailyLog = {
            date: dateString,
            creation_time: getJapanTimeString(),
            total_moments: 0,
            moments: [],
            backup_reason: 'redis_unavailable'
        };
        
        try {
            const existingData = await fs.readFile(filePath, 'utf8');
            dailyLog = JSON.parse(existingData);
        } catch (error) {
            console.log(`${colors.tape}📼 [Memory Tape Backup] 새로운 백업 파일 생성: ${fileName}${colors.reset}`);
        }
        
        dailyLog.moments.push(recordData);
        dailyLog.total_moments = dailyLog.moments.length;
        dailyLog.last_updated = getJapanTimeString();
        
        await fs.writeFile(filePath, JSON.stringify(dailyLog, null, 2), 'utf8');
        
        console.log(`${colors.success}✅ [Memory Tape Backup] 파일 백업 완료: ${recordData.record_id}${colors.reset}`);
        return recordData;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Backup] 파일 백업 실패: ${error.message}${colors.reset}`);
        throw error;
    }
}

async function readDailyMemoriesFromFile(targetDate = null) {
    try {
        const dateString = getDateString(targetDate);
        const fileName = `backup-day-${dateString}.json`;
        const filePath = path.join(BACKUP_DIR, fileName);
        
        const data = await fs.readFile(filePath, 'utf8');
        const dailyLog = JSON.parse(data);
        
        console.log(`${colors.success}📖 [Memory Tape Backup] ${dateString} 백업 기록 읽기 완료: ${dailyLog.total_moments}개 순간${colors.reset}`);
        return dailyLog;
        
    } catch (error) {
        console.log(`${colors.info}📖 [Memory Tape Backup] ${getDateString(targetDate)} 백업 기록 없음${colors.reset}`);
        return null;
    }
}

async function findSpecialMomentsFromFile(searchCriteria = {}) {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const jsonFiles = files.filter(file => file.startsWith('backup-day-') && file.endsWith('.json'));
        
        let allSpecialMoments = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(BACKUP_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const dailyLog = JSON.parse(data);
                
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
                
                allSpecialMoments.push(...filteredMoments);
                
            } catch (fileError) {
                console.log(`${colors.error}⚠️ [Memory Tape Backup] 파일 읽기 실패: ${file}${colors.reset}`);
            }
        }
        
        console.log(`${colors.success}🔍 [Memory Tape Backup] 백업에서 특별한 순간 검색 완료: ${allSpecialMoments.length}개 발견${colors.reset}`);
        return allSpecialMoments;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Backup] 백업 검색 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

async function getMemoryTapeStatsFromFile() {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const jsonFiles = files.filter(file => file.startsWith('backup-day-') && file.endsWith('.json'));
        
        let totalMoments = 0;
        let totalDays = jsonFiles.length;
        let remarkableMoments = 0;
        let emotionalBreakdown = {};
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(BACKUP_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const dailyLog = JSON.parse(data);
                
                totalMoments += dailyLog.total_moments || 0;
                
                dailyLog.moments.forEach(moment => {
                    if (moment.remarkable) remarkableMoments++;
                    
                    if (moment.emotional_tags) {
                        moment.emotional_tags.forEach(tag => {
                            emotionalBreakdown[tag] = (emotionalBreakdown[tag] || 0) + 1;
                        });
                    }
                });
                
            } catch (fileError) {
                console.log(`${colors.error}⚠️ [Memory Tape Backup] 통계 파일 오류: ${file}${colors.reset}`);
            }
        }
        
        const stats = {
            total_days: totalDays,
            total_moments: totalMoments,
            remarkable_moments: remarkableMoments,
            average_moments_per_day: totalDays > 0 ? (totalMoments / totalDays).toFixed(1) : 0,
            emotional_breakdown: emotionalBreakdown,
            backup_source: true,
            redis_connection: false,
            stats_generated_at: getJapanTimeString(),
            system_version: 'memory-tape-file-backup-v1.0'
        };
        
        console.log(`${colors.success}📊 [Memory Tape Backup] 백업에서 통계 생성 완료${colors.reset}`);
        return stats;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Backup] 백업 통계 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🚀 초기화 및 종료 함수 ==================
async function initializeMemoryTape() {
    try {
        // 백업 디렉토리 준비
        await ensureBackupDirectoryExists();
        
        // Redis 연결 테스트
        const redisConnected = await testRedisConnection();
        
        if (redisConnected) {
            console.log(`${colors.success}🚀 [Memory Tape Redis] Redis 초기화 완료!${colors.reset}`);
            
            // 현재 Redis 통계 출력
            const stats = await getMemoryTapeStats();
            if (stats && stats.total_moments > 0) {
                console.log(`${colors.redis}📊 [Memory Tape Redis] 기존 기록: ${stats.total_moments}개 순간 보존됨${colors.reset}`);
            }
        } else {
            console.log(`${colors.info}🚀 [Memory Tape] Redis 연결 실패, 파일 백업 모드로 동작${colors.reset}`);
            
            // 백업 파일에서 통계 출력
            const backupStats = await getMemoryTapeStatsFromFile();
            if (backupStats && backupStats.total_moments > 0) {
                console.log(`${colors.tape}📊 [Memory Tape Backup] 백업 기록: ${backupStats.total_days}일간 ${backupStats.total_moments}개 순간 보존됨${colors.reset}`);
            }
        }
        
        console.log(`${colors.info}📁 Redis 상태: ${redisConnected ? '연결됨' : '연결 안됨'}${colors.reset}`);
        console.log(`${colors.info}📁 백업 위치: ${BACKUP_DIR}${colors.reset}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

async function closeMemoryTape() {
    try {
        if (redisClient && isRedisAvailable) {
            await redisClient.quit();
            console.log(`${colors.redis}👋 [Memory Tape Redis] 연결 종료됨${colors.reset}`);
        }
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape Redis] 종료 중 오류: ${error.message}${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 핵심 Redis 기능들
    recordMukuMoment,
    readDailyMemories,
    findSpecialMoments,
    getMemoryTapeStats,
    initializeMemoryTape,
    closeMemoryTape,
    
    // 호환성 함수들 (다른 시스템 연동용)
    saveConversation,
    saveMessage,
    storeConversation,
    
    // Redis 관리 함수들
    testRedisConnection,
    getDailyKey,
    getMomentKey,
    getIndexKey,
    getStatsKey,
    
    // 유틸리티 함수들
    getJapanTime,
    getJapanTimeString,
    getDateString,
    
    // 상수들
    MEMORY_TAPE_DIR,
    BACKUP_DIR,
    
    // Redis 상태 확인
    isRedisAvailable: () => isRedisAvailable,
    getRedisClient: () => redisClient
};
