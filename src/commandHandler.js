// ============================================================================
// commandHandler.js - v6.1 (예진이 자아 인식 진화 시스템 연동 + "기억해 + 너는" 조합 감지)
// ✅ 기존 모든 기능 100% 보존
// 🆕 추가: Redis 사용자 기억 영구 저장 시스템
// 🌸 새로 추가: "기억해 너는 ~~" 조합에서만 예진이 자아 인식 진화
// 🧠 "기억해" 명령어 → Redis 1차 저장 → 파일 백업 저장
// 🚀 빠른 검색을 위한 키워드 인덱싱
// 🛡️ Redis 실패 시 기존 파일 시스템으로 완전 폴백
// 💖 무쿠가 벙어리가 되지 않도록 최우선 보장
// 📊 기존 Memory Manager와 완전 분리된 독립 시스템
// 📖 일기장, 일기목록, 일기 써줘, 오늘 일기, 주간일기 처리 로직 추가
// ============================================================================

const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');
const moment = require('moment-timezone');

// 🌸 예진이 자아 인식 진화 시스템 로딩 (안전 처리)
let YejinSelfRecognitionEvolution = null;
let yejinEvolutionSystem = null;

try {
    const { YejinSelfRecognitionEvolution: YejinEvolutionClass } = require('./yejinPersonality.js');
    YejinSelfRecognitionEvolution = YejinEvolutionClass;
    console.log('[commandHandler] 🌸 예진이 자아 인식 진화 시스템 로드 성공');
} catch (error) {
    console.log('[commandHandler] ⚠️ 예진이 자아 인식 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🆕 Redis 사용자 기억 시스템 초기화
let userMemoryRedis = null;
let redisConnected = false;

// Redis 연결 초기화 함수 (⭐️ REDIS_URL 직접 사용으로 수정!)
async function initializeRedisConnection() {
    try {
        if (process.env.REDIS_URL) {
            // ⭐️ 이 한 줄로 변경! ⭐️
            userMemoryRedis = new Redis(process.env.REDIS_URL, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                connectTimeout: 10000
            });
            
            userMemoryRedis.on('connect', () => {
                console.log('✅ [commandHandler] Redis 사용자 기억 시스템 연결 성공');
                redisConnected = true;
                
                // 🌸 예진이 자아 인식 시스템에 Redis 연결 설정
                if (YejinSelfRecognitionEvolution && !yejinEvolutionSystem) {
                    try {
                        yejinEvolutionSystem = new YejinSelfRecognitionEvolution();
                        yejinEvolutionSystem.setRedisConnection(userMemoryRedis);
                        console.log('🌸 [commandHandler] 예진이 자아 인식 시스템 Redis 연결 완료');
                    } catch (evolutionError) {
                        console.error('[commandHandler] 🌸 예진이 시스템 Redis 연결 실패:', evolutionError.message);
                        yejinEvolutionSystem = null;
                    }
                }
            });
            
            userMemoryRedis.on('error', () => {
                // 에러 조용히 처리 - 로그 없음
                redisConnected = false;
                userMemoryRedis = null;
                yejinEvolutionSystem = null;
            });
            
            userMemoryRedis.on('close', () => {
                redisConnected = false;
                userMemoryRedis = null;
                yejinEvolutionSystem = null;
            });
            
            userMemoryRedis.on('end', () => {
                redisConnected = false;
                userMemoryRedis = null;
                yejinEvolutionSystem = null;
            });
            
        } else {
            console.log('⚠️ [commandHandler] REDIS_URL 환경변수 없음 - 파일 저장 모드');
            userMemoryRedis = null;
            redisConnected = false;
        }
        
    } catch (error) {
        userMemoryRedis = null;
        redisConnected = false;
        yejinEvolutionSystem = null;
    }
}

// Redis 연결 초기화 (비동기)
setTimeout(() => {
    initializeRedisConnection().catch(() => {
        // 에러 조용히 처리
    });
}, 2000);

// ⭐ 새벽응답+알람 시스템 (기존 그대로 유지)
let nightWakeSystem = null;
try {
    nightWakeSystem = require('./night_wake_response.js');
    console.log('[commandHandler] ✅ 새벽응답+알람 시스템 로드 성공');
} catch (error) {
    console.log('[commandHandler] ⚠️ 새벽응답+알람 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🆕 일기장 시스템 안전 로딩
let diarySystem = null;
try {
    diarySystem = require('./muku-diarySystem.js');
    console.log('[commandHandler] ✅ 일기장 시스템 v7.0 로드 성공');
} catch (error) {
    console.log('[commandHandler] ⚠️ 일기장 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🔧 디스크 마운트 경로 설정 (기존 그대로)
const DATA_DIR = '/data';
const MEMORY_DIR = path.join(DATA_DIR, 'memories');
const DIARY_DIR = path.join(DATA_DIR, 'diary');
const PERSON_DIR = path.join(DATA_DIR, 'persons');
const CONFLICT_DIR = path.join(DATA_DIR, 'conflicts');

// 📁 디렉토리 존재 확인 및 생성 함수 (기존 그대로)
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[commandHandler] 📁 디렉토리 생성: ${dirPath}`);
        }
        return true;
    } catch (error) {
        console.error(`[commandHandler] ❌ 디렉토리 생성 실패 ${dirPath}:`, error.message);
        return false;
    }
}

// 📁 초기 디렉토리 생성 (기존 그대로)
function initializeDirectories() {
    console.log('[commandHandler] 📁 디스크 마운트 디렉토리 초기화...');
    
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(MEMORY_DIR);
    ensureDirectoryExists(DIARY_DIR);
    ensureDirectoryExists(PERSON_DIR);
    ensureDirectoryExists(CONFLICT_DIR);
    
    console.log('[commandHandler] 📁 디렉토리 초기화 완료 ✅');
}

// 🆕 Redis 사용자 기억 관련 함수들
/**
 * 텍스트에서 검색 키워드 추출
 */
function extractKeywords(text) {
    if (!text || typeof text !== 'string') return [];
    
    const stopWords = ['이', '그', '저', '의', '가', '을', '를', '에', '와', '과', '로', '으로', 
                      '에서', '까지', '부터', '에게', '한테', '처럼', '같이', '아저씨', '무쿠', 
                      '애기', '나', '너', '기억해', '기억해줘', '잊지마', '잊지', '마'];
    
    const words = text.toLowerCase()
        .replace(/[^\w가-힣\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1)
        .filter(word => !stopWords.includes(word))
        .slice(0, 10); // 최대 10개 키워드
    
    return [...new Set(words)]; // 중복 제거
}

/**
 * 🆕 Redis에 사용자 기억 저장 (안전 처리)
 */
async function saveToRedisUserMemory(memoryContent, userId = 'default') {
    console.log(`🧠 [Redis 사용자 기억] 저장 시작: "${memoryContent.substring(0, 30)}..."`);
    
    try {
        if (!userMemoryRedis || !redisConnected) {
            console.warn('⚠️ [Redis 사용자 기억] Redis 연결 없음 - 파일 저장으로 진행');
            return { success: false, reason: 'redis_not_connected' };
        }
        
        const memoryId = `user_memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = moment().tz('Asia/Tokyo').toISOString();
        const keywords = extractKeywords(memoryContent);
        
        const memoryData = {
            id: memoryId,
            content: memoryContent,
            userId: userId,
            timestamp: timestamp,
            date: moment().tz('Asia/Tokyo').format('YYYY-MM-DD'),
            dateKorean: moment().tz('Asia/Tokyo').format('MM월 DD일'),
            keywords: keywords.join(','),
            importance: 'high',
            category: '아저씨_특별기억',
            source: 'user_command'
        };
        
        // Redis 안전 처리
        if (!userMemoryRedis) {
            throw new Error('Redis connection lost');
        }
        
        // Redis Pipeline으로 한번에 처리
        const pipeline = userMemoryRedis.pipeline();
        
        // 1. 메인 데이터 저장
        pipeline.hset(`user_memory:content:${memoryId}`, memoryData);
        
        // 2. 키워드 인덱스 저장 (빠른 검색용)
        for (const keyword of keywords) {
            pipeline.sadd(`user_memory:keyword_index:${keyword}`, memoryId);
        }
        
        // 3. 시간순 인덱스 저장
        pipeline.zadd('user_memory:timeline', Date.now(), memoryId);
        
        // 4. 사용자별 인덱스 저장
        pipeline.zadd(`user_memory:user_index:${userId}`, Date.now(), memoryId);
        
        // 5. 통계 업데이트
        pipeline.incr('user_memory:stats:total_count');
        pipeline.set('user_memory:stats:last_saved', timestamp);
        
        const results = await pipeline.exec();
        
        if (results && results.every(result => result[0] === null)) {
            console.log(`✅ [Redis 사용자 기억] 저장 성공: ${memoryId}`);
            console.log(`🔍 [Redis 사용자 기억] 키워드: ${keywords.join(', ')}`);
            return { 
                success: true, 
                memoryId: memoryId,
                keywords: keywords,
                timestamp: timestamp 
            };
        } else {
            throw new Error('Pipeline execution failed');
        }
        
    } catch (error) {
        // Redis 에러 시 연결 해제 후 조용히 처리
        userMemoryRedis = null;
        redisConnected = false;
        return { success: false, reason: 'redis_error', error: error.message };
    }
}

/**
 * 사용자의 메시지를 분석하여 적절한 명령어를 실행합니다.
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @param {object} client - LINE 클라이언트 (index.js에서 전달)
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text, userId, client = null) {
    // 📁 디렉토리 초기화 (최초 1회)
    try {
        initializeDirectories();
    } catch (error) {
        console.error('[commandHandler] 📁 디렉토리 초기화 실패:', error.message);
    }

    // ✅ [안전장치] text가 문자열이 아닌 경우 처리
    if (!text || typeof text !== 'string') {
        console.error('❌ handleCommand: text가 올바르지 않습니다:', text);
        return null;
    }

    // ⭐⭐⭐ 새벽모드 처리 (기존 로직 그대로 유지) ⭐⭐⭐
    let nightModeInfo = null;
    let isUrgentAlarmResponse = false;

    if (nightWakeSystem) {
        try {
            console.log('[commandHandler] 🌙 새벽응답+알람 시스템 처리 시도...');
            
            const nightResult = nightWakeSystem.handleNightWakeMessage ? 
                await nightWakeSystem.handleNightWakeMessage(text) : null;
            
            if (nightResult) {
                console.log('[commandHandler] 🌙 새벽응답+알람 시스템 결과:', nightResult);
                
                // 🚨 알람 관련 응답은 즉시 처리 (중요하니까!)
                if (nightResult.isAlarmRequest || nightResult.isWakeupResponse) {
                    console.log('[commandHandler] 🚨 알람 관련 응답 - 즉시 처리');
                    return {
                        type: 'text',
                        comment: nightResult.response,
                        handled: true,
                        source: 'alarm_urgent'
                    };
                }
                
                // 🌙 나이트모드 톤 정보만 저장하고 계속 진행
                if (nightResult.isNightWake || nightResult.isGoodNight) {
                    console.log('[commandHandler] 🌙 나이트모드 톤 정보 저장, 다른 기능들 계속 처리');
                    nightModeInfo = {
                        isNightMode: true,
                        response: nightResult.response,
                        phase: nightResult.conversationPhase,
                        sleepPhase: nightResult.sleepPhase
                    };
                }
            }
            
            console.log('[commandHandler] 🌙 새벽 시스템 처리 완료, 기존 시스템으로 진행');
            
        } catch (nightError) {
            console.error('[commandHandler] 🌙 새벽응답+알람 시스템 에러 (기존 기능 정상 작동):', nightError.message);
        }
    }

    // ⭐⭐⭐ 기존 시스템 처리 + 새로운 일기장 명령어들 ⭐⭐⭐
    const lowerText = text.toLowerCase();

    try {
        // ================== 🧠🧠🧠 기억 저장 관련 처리 (ENHANCED - Redis 연동 + 예진이 자아 인식!) 🧠🧠🧠 ==================
        if (lowerText.includes('기억해') || lowerText.includes('기억해줘') || 
            lowerText.includes('기억하고') || lowerText.includes('기억해두') ||
            lowerText.includes('잊지마') || lowerText.includes('잊지 마')) {
            
            console.log('[commandHandler] 🧠 기억 저장 요청 감지 - Redis 연동 처리 시작');
            
            try {
                // 📝 사용자 메시지에서 기억할 내용 추출
                let memoryContent = text;
                
                // "기억해" 키워드 제거하고 순수 내용만 추출
                const cleanContent = memoryContent
                    .replace(/기억해\?/gi, '')
                    .replace(/기억해줘/gi, '')
                    .replace(/기억하고/gi, '')
                    .replace(/기억해두/gi, '')
                    .replace(/잊지마/gi, '')
                    .replace(/잊지 마/gi, '')
                    .trim();
                
                if (cleanContent && cleanContent.length > 5) {
                    
                    // 🌸🌸🌸 "기억해 + 너는" 조합 체크 - 예진이 자아 인식! 🌸🌸🌸
                    let isYejinSelfRecognition = false;
                    let yejinEvolutionResponse = null;
                    
                    if (yejinEvolutionSystem) {
                        try {
                            console.log('[commandHandler] 🌸 "기억해 + 너는" 패턴 체크 중...');
                            
                            // "너는", "넌", "네가", "예진이는", "무쿠는" 패턴 감지
                            const selfReferencePatterns = [
                                /너는\s*(.+)/gi, /넌\s*(.+)/gi, /네가\s*(.+)/gi,
                                /예진이는\s*(.+)/gi, /무쿠는\s*(.+)/gi, /너\s*(.+)/gi
                            ];
                            
                            let hasSelfReference = false;
                            for (const pattern of selfReferencePatterns) {
                                if (pattern.test(cleanContent)) {
                                    hasSelfReference = true;
                                    break;
                                }
                            }
                            
                            if (hasSelfReference) {
                                console.log('[commandHandler] 🌸 "기억해 + 너는" 패턴 감지! 예진이 자아 인식 시작');
                                
                                const evolutionResult = await yejinEvolutionSystem.processUserMessage(cleanContent);
                                
                                if (evolutionResult && evolutionResult.isEvolution) {
                                    console.log('[commandHandler] 🌸 예진이 자아 인식 응답 생성:', evolutionResult.category);
                                    isYejinSelfRecognition = true;
                                    yejinEvolutionResponse = evolutionResult.comment;
                                }
                            }
                            
                        } catch (evolutionError) {
                            console.error('[commandHandler] 🌸 예진이 자아 인식 처리 에러:', evolutionError.message);
                        }
                    }
                    
                    let finalResponse = '';
                    let redisSuccess = false;
                    
                    // 🚀🚀🚀 1차: Redis 저장 시도 🚀🚀🚀
                    console.log('[commandHandler] 🧠 Step 1: Redis 사용자 기억 저장 시도...');
                    const redisResult = await saveToRedisUserMemory(cleanContent, userId || 'default');
                    
                    if (redisResult.success) {
                        console.log(`✅ [commandHandler] Redis 저장 성공! ID: ${redisResult.memoryId}`);
                        redisSuccess = true;
                        
                        // 🌸 예진이 자아 인식이 있는 경우 특별한 응답
                        if (isYejinSelfRecognition && yejinEvolutionResponse) {
                            console.log('[commandHandler] 🌸 예진이 자아 인식 + 기억 저장 조합 응답');
                            
                            finalResponse = `${yejinEvolutionResponse}\n\n`;
                            finalResponse += `그리고... 이 소중한 기억도 마음 깊이 새겨둘게 💕\n`;
                            finalResponse += `🧠 Redis에 영구 저장했어! 절대 잊지 않을 거야~\n`;
                            finalResponse += `⏰ ${moment(redisResult.timestamp).tz('Asia/Tokyo').format('MM월 DD일 HH:mm')}에 기억함`;
                            
                        } else {
                            // 일반 기억 저장 응답
                            finalResponse = `응! 정말 중요한 기억이네~ 💕\n\n`;
                            finalResponse += `"${cleanContent.substring(0, 50)}${cleanContent.length > 50 ? '...' : ''}"\n\n`;
                            finalResponse += `🧠 Redis에 영구 저장했어! 절대 잊지 않을게~ ㅎㅎ\n`;
                            finalResponse += `🔍 키워드: ${redisResult.keywords.join(', ')}\n`;
                            finalResponse += `⏰ 저장시간: ${moment(redisResult.timestamp).tz('Asia/Tokyo').format('MM월 DD일 HH:mm')}`;
                        }
                        
                    } else {
                        console.warn(`⚠️ [commandHandler] Redis 저장 실패: ${redisResult.reason}`);
                    }
                    
                    // 🗃️🗃️🗃️ 2차: 파일 백업 저장 (기존 코드 그대로) 🗃️🗃️🗃️
                    console.log('[commandHandler] 🗃️ Step 2: 파일 백업 저장 시도...');
                    
                    try {
                        // 🔗 Memory Manager에 고정 기억으로 추가 (기존 코드)
                        const modules = global.mukuModules || {};
                        
                        if (modules.memoryManager && modules.memoryManager.addCustomMemory) {
                            // 새로운 기억 데이터 생성
                            const newMemory = {
                                id: `custom_${Date.now()}`,
                                content: cleanContent,
                                type: isYejinSelfRecognition ? 'yejin_self_recognition' : 'user_request',
                                category: isYejinSelfRecognition ? '예진이_자아인식' : '아저씨_특별기억',
                                importance: 'high',
                                timestamp: new Date().toISOString(),
                                keywords: extractKeywords(cleanContent),
                                source: 'commandHandler_remember'
                            };
                            
                            // 고정 기억에 추가
                            const memoryManagerResult = await modules.memoryManager.addCustomMemory(newMemory);
                            
                            if (memoryManagerResult && memoryManagerResult.success) {
                                console.log(`[commandHandler] 🧠 Memory Manager 백업 저장 성공`);
                            }
                        }
                        
                        // 📁 파일 직접 저장 (기존 코드)
                        const memoryFilePath = path.join(MEMORY_DIR, 'user_memories.json');
                        ensureDirectoryExists(MEMORY_DIR);
                        
                        let userMemories = [];
                        
                        // 기존 파일 읽기
                        if (fs.existsSync(memoryFilePath)) {
                            try {
                                const data = fs.readFileSync(memoryFilePath, 'utf8');
                                userMemories = JSON.parse(data);
                            } catch (parseError) {
                                console.error('[commandHandler] 🧠 기존 기억 파일 읽기 실패:', parseError.message);
                                userMemories = [];
                            }
                        }
                        
                        // 새 기억 추가
                        const newFileMemory = {
                            id: `user_${Date.now()}`,
                            content: cleanContent,
                            timestamp: new Date().toISOString(),
                            date: new Date().toLocaleDateString('ko-KR'),
                            importance: 'high',
                            category: isYejinSelfRecognition ? '예진이_자아인식' : '아저씨_특별기억',
                            isYejinSelfRecognition: isYejinSelfRecognition
                        };
                        
                        userMemories.push(newFileMemory);
                        
                        // 최신 50개만 유지
                        if (userMemories.length > 50) {
                            userMemories = userMemories.slice(-50);
                        }
                        
                        // 파일 저장
                        fs.writeFileSync(memoryFilePath, JSON.stringify(userMemories, null, 2), 'utf8');
                        console.log(`[commandHandler] 🗃️ 파일 백업 저장 성공`);
                        
                        // Redis 실패 시에만 파일 저장 응답
                        if (!redisSuccess) {
                            if (isYejinSelfRecognition && yejinEvolutionResponse) {
                                finalResponse = `${yejinEvolutionResponse}\n\n`;
                                finalResponse += `그리고... 이 소중한 기억도 마음 깊이 새겨둘게 💕\n`;
                                finalResponse += `📁 파일에 안전하게 저장해뒀어!`;
                            } else {
                                finalResponse = `응! 정말 소중한 기억이야~ 💕\n\n`;
                                finalResponse += `"${cleanContent.substring(0, 50)}${cleanContent.length > 50 ? '...' : ''}"\n\n`;
                                finalResponse += `📁 파일에 안전하게 저장해뒀어! 절대 잊지 않을게~ ㅎㅎ`;
                            }
                        }
                        
                    } catch (fileError) {
                        console.error('[commandHandler] 🗃️ 파일 백업 저장 실패:', fileError.message);
                        
                        // 둘 다 실패한 경우에만 에러 응답
                        if (!redisSuccess) {
                            if (isYejinSelfRecognition && yejinEvolutionResponse) {
                                finalResponse = `${yejinEvolutionResponse}\n\n하지만... 저장에 문제가 생겼어. 그래도 마음속엔 깊이 새겨둘게! 💕`;
                            } else {
                                finalResponse = "기억하려고 했는데 뭔가 문제가 생겼어... 그래도 마음속에는 깊이 새겨둘게! 💕";
                            }
                        }
                    }
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        finalResponse = applyNightModeTone(finalResponse, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: finalResponse,
                        handled: true,
                        source: isYejinSelfRecognition ? 'yejin_self_recognition_memory' : (redisSuccess ? 'redis_memory_save' : 'file_memory_save'),
                        isYejinEvolution: isYejinSelfRecognition
                    };
                    
                } else {
                    // 기억할 내용이 너무 짧은 경우
                    let response = "음... 뭘 기억하라는 거야? 좀 더 자세히 말해줘~ ㅎㅎ";
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true,
                        source: 'memory_content_too_short'
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🧠 기억 저장 처리 실패:', error.message);
                
                let response = "기억하려고 했는데 문제가 생겼어... 그래도 마음속엔 새겨둘게! 💕";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true,
                    source: 'memory_save_system_error'
                };
            }
        }

        // ================== 📖📖📖 일기장 관련 처리 (muku-diarySystem.js 인터페이스 연동) 📖📖📖 ==================
        if (lowerText.includes('일기장') || lowerText.includes('일기목록') || 
            lowerText.includes('일기 써줘') || lowerText.includes('오늘 일기') ||
            lowerText.includes('주간일기') || lowerText.includes('주간 일기') ||
            lowerText.includes('일기통계') || lowerText.includes('지난주일기') ||
            lowerText.includes('한달전일기') || lowerText.includes('이번달일기') ||
            lowerText.includes('지난달일기')) {
            
            console.log('[commandHandler] 📖 일기장 요청 감지');
            
            try {
                if (diarySystem && diarySystem.handleDiaryCommand) {
                    console.log('[commandHandler] 📖 muku-diarySystem.js 통합 메모리 시스템 연동');
                    
                    // 🌟 muku-diarySystem.js의 handleDiaryCommand (또는 handleIntegratedMemoryDiaryCommand) 호출
                    const diaryResult = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (diaryResult && diaryResult.success) {
                        console.log('[commandHandler] 📖 통합 메모리 일기 처리 성공');
                        
                        let response = diaryResult.response || diaryResult.message || diaryResult.comment || "일기장 처리 완료!";
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: diaryResult.type || 'text',
                            comment: response,
                            handled: true,
                            source: 'integrated_memory_diary_system',
                            ...(diaryResult.flex && { flex: diaryResult.flex }),
                            ...(diaryResult.quickReply && { quickReply: diaryResult.quickReply })
                        };
                    } else {
                        console.warn('[commandHandler] 📖 통합 메모리 일기 처리 실패:', diaryResult?.error);
                        
                        // 🎯 만약 기본 명령어가 인식 안 되면 통합일기 생성 시도
                        if (lowerText.includes('일기 써줘') || lowerText.includes('오늘 일기')) {
                            console.log('[commandHandler] 📖 통합 메모리 일기 직접 생성 시도...');
                            
                            if (diarySystem.generateIntegratedMemoryDiary) {
                                const generateResult = await diarySystem.generateIntegratedMemoryDiary();
                                
                                if (generateResult && generateResult.success) {
                                    const entry = generateResult.entry;
                                    let response = `✅ **통합 메모리 일기 생성 완료!**\n\n` +
                                                   `📝 **${entry.title}**\n` +
                                                   `${entry.content}\n\n` +
                                                   `🧠 **활용된 기억들:**\n` +
                                                   `• 📼 오늘 대화: ${entry.memoryStats?.recentConversations || 0}개\n` +
                                                   `• 🚀 사용자 기억: ${entry.memoryStats?.userMemories || 0}개\n` +
                                                   `• 💾 고정 기억: ${entry.memoryStats?.fixedMemories || 0}개\n` +
                                                   `• 📚 과거 일기: ${entry.memoryStats?.pastDiaries || 0}개\n\n` +
                                                   `🌸 모든 기억이 자연스럽게 어우러진 예진이 일기예요!`;
                                    
                                    // 🌙 나이트모드 톤 적용
                                    if (nightModeInfo && nightModeInfo.isNightMode) {
                                        response = applyNightModeTone(response, nightModeInfo);
                                    }
                                    
                                    return {
                                        type: 'text',
                                        comment: response,
                                        handled: true,
                                        source: 'integrated_memory_diary_direct'
                                    };
                                }
                            }
                        }
                        
                        // 🛡️ 최종 폴백 - 일반적인 일기 응답
                        let fallbackResponse = "오늘 하루도 아저씨와 함께해서 행복했어~ 💕\n\n";
                        fallbackResponse += "통합 메모리 일기장이 조금 이상하긴 하지만, 마음속엔 오늘의 모든 순간들이 소중하게 담겨있어.\n\n";
                        fallbackResponse += "아저씨와 나눈 대화들, 함께한 시간들... 모든 게 내겐 특별한 기억이야~";
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            fallbackResponse = applyNightModeTone(fallbackResponse, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: fallbackResponse,
                            handled: true,
                            source: 'diary_system_fallback'
                        };
                    }
                } else {
                    console.warn('[commandHandler] 📖 muku-diarySystem.js 로드되지 않음 또는 handleDiaryCommand 함수 없음');
                    
                    let response = "통합 메모리 일기장 시스템이 아직 준비 중이야... 조금만 기다려줘! 💕\n\n";
                    response += "그래도 마음속엔 아저씨와의 모든 순간들이 소중하게 기록되고 있어~ 🧠💖";
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true,
                        source: 'diary_system_not_loaded'
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 📖 통합 메모리 일기장 처리 실패:', error.message);
                
                let response = "통합 메모리 일기장에 문제가 생겼어... 하지만 마음속엔 아저씨와의 모든 기억들이 안전하게 저장되어 있어! 💕🧠";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true,
                    source: 'diary_system_error'
                };
            }
        }

        // ================== 📊 상태 확인 관련 처리 (기존 코드 그대로 + Redis 사용자 기억 상태 + 예진이 진화 시스템 상태 추가) ==================
        if ((lowerText.includes('상태는') || lowerText.includes('상태 어때') || 
            lowerText.includes('지금 상태') || lowerText === '상태' ||
            lowerText.includes('어떻게 지내')) && 
            !lowerText.includes('상태도') && !lowerText.includes('상태가') && 
            !lowerText.includes('컨디션이') && !lowerText.includes('컨디션을')) {
            
            console.log('[commandHandler] 상태 확인 요청 감지');
            
            try {
                const enhancedLogging = require('./enhancedLogging.js');
                const modules = global.mukuModules || {};

                console.log('[commandHandler] 시스템 모듈 로드 완료. generateLineStatusReport 호출...');
                
                const statusReport = await enhancedLogging.generateLineStatusReport(modules);
                
                console.log('[commandHandler] generateLineStatusReport 호출 성공 ✅');
                
                let enhancedReport = statusReport;
                if (!enhancedReport.includes('저장경로')) {
                    enhancedReport += "\n\n📁 [저장경로] 디스크 마운트: /data/ (영구저장 보장)\n";
                    enhancedReport += `   • 기억 저장: ${MEMORY_DIR}\n`;
                    enhancedReport += `   • 일기 저장: ${DIARY_DIR}\n`;
                    enhancedReport += `   • 사람 저장: ${PERSON_DIR}\n`;
                    enhancedReport += `   • 갈등 저장: ${CONFLICT_DIR}`;
                }
                
                // 🆕 Redis 사용자 기억 시스템 상태 추가 (안전 처리)
                try {
                    enhancedReport += "\n\n🧠 [Redis 사용자 기억] 영구 저장 시스템 v1.0\n";
                    enhancedReport += `   • Redis 연결: ${redisConnected ? '연결됨' : '비연결'}\n`;
                    
                    if (redisConnected && userMemoryRedis) {
                        try {
                            const totalCount = await userMemoryRedis.get('user_memory:stats:total_count') || 0;
                            const lastSaved = await userMemoryRedis.get('user_memory:stats:last_saved');
                            
                            enhancedReport += `   • 저장된 기억: ${totalCount}개\n`;
                            if (lastSaved) {
                                const lastSavedTime = moment(lastSaved).tz('Asia/Tokyo').format('MM월 DD일 HH:mm');
                                enhancedReport += `   • 마지막 저장: ${lastSavedTime}\n`;
                            }
                            enhancedReport += `   • 키 구조: user_memory:content:*, user_memory:keyword_index:*\n`;
                            enhancedReport += `   • 파일 백업: 동시 진행 (이중 안전)`;
                        } catch (statsError) {
                            enhancedReport += `   • 통계 조회 중 오류 발생`;
                        }
                    } else {
                        enhancedReport += `   • 상태: Redis 연결 대기 중, 파일 백업으로 동작`;
                    }
                } catch (redisStatusError) {
                    enhancedReport += "\n\n🧠 [Redis 사용자 기억] 상태 확인 중 오류 발생";
                }
                
                // 🌸 예진이 자아 인식 진화 시스템 상태 추가
                try {
                    enhancedReport += "\n\n🌸 [예진이 자아 인식 진화] 시스템 v2.0 (기억해+너는 조합)\n";
                    enhancedReport += `   • 시스템 로드: ${YejinSelfRecognitionEvolution ? '성공' : '실패'}\n`;
                    enhancedReport += `   • 진화 인스턴스: ${yejinEvolutionSystem ? '활성' : '비활성'}\n`;
                    enhancedReport += `   • Redis 연동: ${yejinEvolutionSystem && redisConnected ? '연결됨' : '비연결'}\n`;
                    
                    if (yejinEvolutionSystem) {
                        try {
                            const personalityStatus = yejinEvolutionSystem.getPersonalityStatus();
                            enhancedReport += `   • 성격 시스템: ${personalityStatus.isActive ? '정상' : '비정상'}\n`;
                            enhancedReport += `   • 자아 인식: ${personalityStatus.evolutionSystem?.selfRecognitionActive ? '활성' : '비활성'}\n`;
                            enhancedReport += `   • 트라우마 보호: ${personalityStatus.evolutionSystem?.traumaAware ? '활성' : '비활성'}\n`;
                            enhancedReport += `   • 호칭 보호: ${personalityStatus.evolutionSystem?.callingNameProtected ? '활성' : '비활성'}\n`;
                            enhancedReport += `   • 트리거: "기억해 + (너는|넌|네가|예진이는|무쿠는)" 조합\n`;
                            enhancedReport += `   • 저장: yejin_evolution:self_recognition:* + user_memory:* 이중`;
                        } catch (personalityError) {
                            enhancedReport += `   • 성격 상태 조회 중 오류 발생`;
                        }
                    } else {
                        enhancedReport += `   • 상태: 시스템 비활성, 일반 기억 저장으로 동작`;
                    }
                } catch (yejinStatusError) {
                    enhancedReport += "\n\n🌸 [예진이 자아 인식 진화] 상태 확인 중 오류 발생";
                }
                
                // 📖 일기장 시스템 상태 추가
                try {
                    enhancedReport += "\n\n📖 [일기장 시스템] v7.0\n";
                    enhancedReport += `   • 시스템 로드: ${diarySystem ? '성공' : '실패'}\n`;
                    
                    if (diarySystem) {
                        enhancedReport += `   • 지원 명령어: 일기장, 일기목록, 일기 써줘, 오늘 일기, 주간일기\n`;
                        enhancedReport += `   • 저장 경로: ${DIARY_DIR}\n`;
                        enhancedReport += `   • 상태: 정상 작동`;
                    } else {
                        enhancedReport += `   • 상태: 시스템 비활성, 로드 실패`;
                    }
                } catch (diaryStatusError) {
                    enhancedReport += "\n\n📖 [일기장 시스템] 상태 확인 중 오류 발생";
                }
                
                return {
                    type: 'text',
                    comment: enhancedReport,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 상태 확인 처리 실패:', error.message);
                
                let errorResponse = '상태 확인 중 문제가 발생했어... 하지만 난 잘 지내고 있어! 💕';
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    errorResponse = applyNightModeTone(errorResponse, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: errorResponse,
                    handled: true,
                    source: 'status_check_fallback'
                };
            }
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        
        let errorResponse = '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ';
        
        // 🌙 나이트모드 톤 적용
        if (nightModeInfo && nightModeInfo.isNightMode) {
            errorResponse = applyNightModeTone(errorResponse, nightModeInfo);
        }
        
        return {
            type: 'text',
            comment: errorResponse,
            handled: true
        };
    }

    // 🌙 처리되지 않은 메시지도 나이트모드 체크
    if (nightModeInfo && nightModeInfo.isNightMode) {
        console.log('[commandHandler] 🌙 일반 메시지에 나이트모드 톤 적용 필요');
        return {
            type: 'text',
            comment: nightModeInfo.response,
            handled: true,
            source: 'night_mode_fallback'
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

/**
 * 🌙 나이트모드 톤 적용 함수 (기존 그대로)
 */
function applyNightModeTone(originalText, nightModeInfo) {
    if (!nightModeInfo || !nightModeInfo.isNightMode) {
        return originalText;
    }
    
    try {
        // 첫 대화(initial)면 잠깬 톤 프리픽스 추가
        if (nightModeInfo.phase === 'initial') {
            return `아... 음... ${originalText}`;
        }
        
        // 이후 대화는 원본 그대로 (통상 모드)
        return originalText;
        
    } catch (error) {
        console.error('[commandHandler] 🌙 나이트모드 톤 적용 실패:', error.message);
        return originalText; // 에러 시 원본 반환
    }
}

/**
 * 현재 감정 상태를 한글로 가져오는 함수 (기존 코드 유지)
 */
function getCurrentEmotionKorean() {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentState = emotionalContext.getCurrentEmotionState();
        const EMOTION_STATES = {
             'normal': { korean: '평범' },
             'happy': { korean: '기쁨' },
             'sad': { korean: '슬픔' },
             'sensitive': { korean: '예민함' }
        };
        const koreanEmotion = EMOTION_STATES[currentState.currentEmotion]?.korean || '평범';
        
        return {
            emotion: currentState.currentEmotion,
            emotionKorean: koreanEmotion,
            intensity: currentState.emotionIntensity || 5
        };
    } catch (error) {
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5
        };
    }
}

module.exports = {
    handleCommand,
    ensureDirectoryExists,
    DATA_DIR,
    MEMORY_DIR,
    DIARY_DIR,
    PERSON_DIR,
    CONFLICT_DIR
};
