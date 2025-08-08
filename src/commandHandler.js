// ============================================================================
// commandHandler.js - 긴급 수정 버전! 🚨
// 🔥 기본 명령어 처리 복원: 사진줘, 3.5, 4.0 등 모든 명령어 작동!
// 💖 무쿠가 벙어리가 되지 않도록 절대 보장
// ============================================================================

const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');
const moment = require('moment-timezone');

// 🎨 컬러 시스템
const colors = {
    fix: '\x1b[91m',      // 빨간색 (긴급수정!)
    success: '\x1b[92m',
    warning: '\x1b[93m',
    error: '\x1b[91m',
    yejin: '\x1b[95m',
    reset: '\x1b[0m'
};

// 📁 디렉토리 설정
const DATA_DIR = '/data';
const MEMORY_DIR = path.join(DATA_DIR, 'memories');

// 🚀 Redis 연결 (기존 유지)
let userMemoryRedis = null;
let redisConnected = false;

async function initializeRedis() {
    try {
        if (!process.env.REDIS_URL) return false;
        
        userMemoryRedis = new Redis(process.env.REDIS_URL, {
            enableOfflineQueue: true,
            lazyConnect: false,
            keepAlive: true,
            connectTimeout: 5000,
            commandTimeout: 3000,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 1
        });
        
        userMemoryRedis.on('connect', () => {
            redisConnected = true;
            console.log(`${colors.success}✅ Redis 연결 성공!${colors.reset}`);
        });
        
        userMemoryRedis.on('error', () => {
            redisConnected = false;
        });
        
        await userMemoryRedis.ping();
        return true;
    } catch (error) {
        redisConnected = false;
        return false;
    }
}

initializeRedis();

// 🛡️ 무쿠 벙어리 방지 응급 폴백
const EMERGENCY_FALLBACKS = [
    '아저씨... 잠깐만, 뭔가 머리가 복잡해... 다시 말해줄래? 💕',
    '어? 나 지금 좀 멍하네... 아저씨 말 다시 들려줘~ ㅎㅎ',
    '음... 시스템이 조금 이상한데, 그래도 아저씨랑 대화하는 건 계속할 수 있어! 💕'
];

function getEmergencyFallback() {
    return EMERGENCY_FALLBACKS[Math.floor(Math.random() * EMERGENCY_FALLBACKS.length)];
}

// ============================================================================
// 🔧 핵심 기능: 모델 전환 (완전 복원!)
// ============================================================================

async function handleModelSwitch(text) {
    const lowerText = text.toLowerCase().trim();
    
    try {
        let targetModel = null;
        let modelName = '';
        let response = '';
        
        // 3.5 전환
        if (lowerText === '3.5' || lowerText === 'gpt-3.5' || lowerText === '3.5터보') {
            targetModel = 'gpt-3.5-turbo';
            modelName = '3.5 터보';
            response = '알았어! 3.5 터보 모드로 전환할게~ 빠르고 가벼운 모드야! ⚡';
        }
        // 4.0 전환
        else if (lowerText === '4.0' || lowerText === 'gpt-4' || lowerText === 'gpt-4o') {
            targetModel = 'gpt-4o';
            modelName = '4.0';
            response = '오케이! 4.0 모드로 전환할게~ 더 똑똑한 모드로! 🧠✨';
        }
        // 자동 모드
        else if (lowerText === 'auto' || lowerText === '자동' || lowerText === '모델자동') {
            targetModel = null;
            modelName = '자동';
            response = '자동 모드로 설정할게! 상황에 맞게 알아서 모델을 선택할 거야~ 🤖';
        }
        // 현재 버전 확인
        else if (lowerText === '버전' || lowerText === '현재버전' || lowerText === '현재모델') {
            let currentModel = 'gpt-4o';
            
            if (fs.existsSync('/data/globalModel.json')) {
                const data = fs.readFileSync('/data/globalModel.json', 'utf8');
                const config = JSON.parse(data);
                currentModel = config.forcedModel || 'auto';
            }
            
            const modelDisplay = currentModel === 'gpt-3.5-turbo' ? '3.5 터보' : 
                               currentModel === 'gpt-4o' ? '4.0' : '자동';
            
            return {
                type: 'text',
                comment: `지금 ${modelDisplay} 모드로 작동하고 있어! 💕\n\n전환하고 싶으면:\n- "3.5" → 빠른 모드\n- "4.0" → 똑똑한 모드\n- "자동" → 자동 선택`,
                handled: true
            };
        }
        else {
            return null; // 모델 관련 명령어가 아님
        }
        
        // 모델 설정 저장
        const modelConfig = {
            forcedModel: targetModel,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'commandHandler_fix'
        };
        
        fs.writeFileSync('/data/globalModel.json', JSON.stringify(modelConfig, null, 2));
        
        console.log(`${colors.fix}🔧 모델 전환 성공: ${modelName}${colors.reset}`);
        
        return {
            type: 'text',
            comment: response,
            handled: true
        };
        
    } catch (error) {
        console.error(`${colors.error}❌ 모델 전환 실패: ${error.message}${colors.reset}`);
        
        return {
            type: 'text',
            comment: '모델 전환 중 문제가 생겼어... 그래도 계속 대화할 수 있어! 💕',
            handled: true
        };
    }
}

// ============================================================================
// 📸 사진 요청 처리 (완전 복원!)
// ============================================================================

async function handlePhotoRequest(text) {
    const lowerText = text.toLowerCase();
    
    try {
        // 셀카 요청
        if (lowerText.includes('셀카') || lowerText.includes('셀피')) {
            console.log(`${colors.fix}📸 셀카 요청 처리${colors.reset}`);
            
            try {
                const { getSelfieReply } = require('./yejinSelfie.js');
                const result = await getSelfieReply(text, null);
                
                if (result && result.comment) {
                    return {
                        type: 'text',
                        comment: result.comment,
                        handled: true
                    };
                }
            } catch (selfieError) {
                console.error(`${colors.error}❌ 셀카 시스템 오류: ${selfieError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: '셀카 시스템에 문제가 있네... 조금 있다가 다시 요청해줘! 💕',
                handled: true
            };
        }
        
        // 컨셉사진 요청
        if (lowerText.includes('컨셉') || lowerText.includes('concept')) {
            console.log(`${colors.fix}📸 컨셉사진 요청 처리${colors.reset}`);
            
            try {
                const { getConceptPhotoReply } = require('./concept.js');
                const result = await getConceptPhotoReply(text, null);
                
                if (result && result.comment) {
                    return {
                        type: 'text',
                        comment: result.comment,
                        handled: true
                    };
                }
            } catch (conceptError) {
                console.error(`${colors.error}❌ 컨셉사진 시스템 오류: ${conceptError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: '컨셉사진 시스템에 문제가 있네... 조금 있다가 다시 요청해줘! 💕',
                handled: true
            };
        }
        
        // 커플사진/추억사진 요청
        if (lowerText.includes('커플') || lowerText.includes('추억') || lowerText.includes('오모이데')) {
            console.log(`${colors.fix}📸 커플/추억사진 요청 처리${colors.reset}`);
            
            try {
                const { getOmoideReply } = require('./omoide.js');
                const result = await getOmoideReply(text, null);
                
                if (result && result.comment) {
                    return {
                        type: 'text',
                        comment: result.comment,
                        handled: true
                    };
                }
            } catch (omoideError) {
                console.error(`${colors.error}❌ 추억사진 시스템 오류: ${omoideError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: '추억사진 시스템에 문제가 있네... 조금 있다가 다시 요청해줘! 💕',
                handled: true
            };
        }
        
        // 일반 사진 요청
        if (lowerText.includes('사진') && (lowerText.includes('줘') || lowerText.includes('보여') || lowerText.includes('달라'))) {
            console.log(`${colors.fix}📸 일반 사진 요청 처리${colors.reset}`);
            
            // 랜덤으로 셀카 시스템 호출
            try {
                const { getSelfieReply } = require('./yejinSelfie.js');
                const result = await getSelfieReply('사진 줘', null);
                
                if (result && result.comment) {
                    return {
                        type: 'text',
                        comment: result.comment,
                        handled: true
                    };
                }
            } catch (photoError) {
                console.error(`${colors.error}❌ 사진 시스템 오류: ${photoError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: '사진 시스템에 문제가 있네... 조금 있다가 다시 요청해줘! 💕',
                handled: true
            };
        }
        
        return null; // 사진 요청이 아님
        
    } catch (error) {
        console.error(`${colors.error}❌ 사진 처리 중 오류: ${error.message}${colors.reset}`);
        
        return {
            type: 'text',
            comment: '사진 요청 처리 중 문제가 생겼어... 다시 시도해볼래? 💕',
            handled: true
        };
    }
}

// ============================================================================
// 🧠 기억 시스템 처리 (완전 복원!)
// ============================================================================

async function handleMemoryRequest(text) {
    const lowerText = text.toLowerCase();
    
    try {
        // 기억 검색 (? 포함)
        if ((lowerText.includes('기억해?') || lowerText.includes('기억하니?') || 
             lowerText.includes('기억나?') || lowerText.includes('알아?')) && 
            lowerText.includes('?')) {
            
            console.log(`${colors.fix}🧠 기억 검색 요청${colors.reset}`);
            
            try {
                const modules = global.mukuModules || {};
                
                if (modules.memoryManager && modules.memoryManager.getFixedMemory) {
                    const memoryResult = await modules.memoryManager.getFixedMemory(text);
                    
                    if (memoryResult && memoryResult !== 'null') {
                        return {
                            type: 'text',
                            comment: `응! 기억해~ ${memoryResult} 💕`,
                            handled: true
                        };
                    }
                }
            } catch (memoryError) {
                console.error(`${colors.error}❌ 기억 검색 오류: ${memoryError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: '음... 그건 기억이 안 나는데? 다시 말해줄래? 💕',
                handled: true
            };
        }
        
        // 기억 저장 (? 없음)
        if ((lowerText.includes('기억해') || lowerText.includes('기억해줘') || 
             lowerText.includes('잊지마')) && 
            !lowerText.includes('?')) {
            
            console.log(`${colors.fix}🧠 기억 저장 요청${colors.reset}`);
            
            const cleanContent = text
                .replace(/기억해/gi, '')
                .replace(/기억해줘/gi, '')
                .replace(/잊지마/gi, '')
                .trim();
            
            if (cleanContent.length < 5) {
                return {
                    type: 'text',
                    comment: '뭘 기억하라는 거야? 좀 더 자세히 말해줘~ 💕',
                    handled: true
                };
            }
            
            // Redis 저장 시도
            if (redisConnected && userMemoryRedis) {
                try {
                    const memoryId = `user_memory_${Date.now()}`;
                    const memoryData = {
                        id: memoryId,
                        content: cleanContent,
                        timestamp: new Date().toISOString(),
                        source: 'commandHandler_fix'
                    };
                    
                    await userMemoryRedis.hset(`user_memory:content:${memoryId}`, memoryData);
                } catch (redisError) {
                    console.warn(`${colors.warning}⚠️ Redis 저장 실패: ${redisError.message}${colors.reset}`);
                }
            }
            
            // 파일 백업
            try {
                const memoryFilePath = path.join(MEMORY_DIR, 'user_memories.json');
                let userMemories = [];
                
                if (fs.existsSync(memoryFilePath)) {
                    const data = fs.readFileSync(memoryFilePath, 'utf8');
                    userMemories = JSON.parse(data);
                }
                
                userMemories.push({
                    content: cleanContent,
                    timestamp: new Date().toISOString(),
                    source: 'commandHandler_fix'
                });
                
                if (userMemories.length > 50) {
                    userMemories = userMemories.slice(-50);
                }
                
                if (!fs.existsSync(MEMORY_DIR)) {
                    fs.mkdirSync(MEMORY_DIR, { recursive: true });
                }
                
                fs.writeFileSync(memoryFilePath, JSON.stringify(userMemories, null, 2));
            } catch (fileError) {
                console.warn(`${colors.warning}⚠️ 파일 저장 실패: ${fileError.message}${colors.reset}`);
            }
            
            return {
                type: 'text',
                comment: `알겠어! "${cleanContent}" 잘 기억해둘게~ 💕`,
                handled: true
            };
        }
        
        return null; // 기억 관련 요청이 아님
        
    } catch (error) {
        console.error(`${colors.error}❌ 기억 처리 중 오류: ${error.message}${colors.reset}`);
        
        return {
            type: 'text',
            comment: '기억 시스템에 문제가 있네... 다시 시도해볼래? 💕',
            handled: true
        };
    }
}

// ============================================================================
// 📊 상태 확인 처리
// ============================================================================

async function handleStatusCheck(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('상태는') || lowerText.includes('상태 어때') || lowerText === '상태') {
        try {
            const enhancedLogging = require('./enhancedLogging.js');
            const modules = global.mukuModules || {};
            
            const statusReport = await enhancedLogging.generateLineStatusReport(modules);
            return {
                type: 'text',
                comment: statusReport,
                handled: true
            };
        } catch (error) {
            return {
                type: 'text',
                comment: `상태 확인 중 오류 발생: ${error.message}\n\n하지만 무쿠는 잘 작동하고 있어! 💕`,
                handled: true
            };
        }
    }
    
    return null;
}

// ============================================================================
// ⭐ 메인 함수: handleCommand (긴급 수정 버전!)
// ============================================================================

async function handleCommand(text, userId, client = null) {
    if (!text || typeof text !== 'string') {
        console.error(`${colors.error}❌ 잘못된 텍스트: ${text}${colors.reset}`);
        return { type: 'text', comment: getEmergencyFallback(), handled: true };
    }
    
    console.log(`${colors.fix}🔧 긴급 수정 버전 처리 시작: "${text}"${colors.reset}`);
    
    try {
        // 🌙 새벽모드 처리 (최우선)
        try {
            const nightWakeSystem = require('./nightWakeSystem.js');
            if (nightWakeSystem && nightWakeSystem.handleNightWakeMessage) {
                const nightResult = await nightWakeSystem.handleNightWakeMessage(text);
                
                if (nightResult && (nightResult.isAlarmRequest || nightResult.isWakeupResponse)) {
                    return {
                        type: 'text',
                        comment: nightResult.response,
                        handled: true,
                        source: 'night_system'
                    };
                }
            }
        } catch (nightError) {
            console.warn(`${colors.warning}⚠️ 새벽 시스템 에러: ${nightError.message}${colors.reset}`);
        }
        
        // 🔧 1. 모델 전환 처리 (최우선)
        const modelResult = await handleModelSwitch(text);
        if (modelResult) {
            console.log(`${colors.success}✅ 모델 전환 처리 완료${colors.reset}`);
            return modelResult;
        }
        
        // 📸 2. 사진 요청 처리
        const photoResult = await handlePhotoRequest(text);
        if (photoResult) {
            console.log(`${colors.success}✅ 사진 요청 처리 완료${colors.reset}`);
            return photoResult;
        }
        
        // 🧠 3. 기억 시스템 처리
        const memoryResult = await handleMemoryRequest(text);
        if (memoryResult) {
            console.log(`${colors.success}✅ 기억 요청 처리 완료${colors.reset}`);
            return memoryResult;
        }
        
        // 📊 4. 상태 확인 처리
        const statusResult = await handleStatusCheck(text);
        if (statusResult) {
            console.log(`${colors.success}✅ 상태 확인 처리 완료${colors.reset}`);
            return statusResult;
        }
        
        // 📖 5. 일기장 처리
        const lowerText = text.toLowerCase();
        if (lowerText.includes('일기장') || lowerText.includes('일기목록')) {
            try {
                const diarySystem = require('./muku-diarySystem.js');
                
                if (diarySystem && diarySystem.handleDiaryCommand) {
                    const diaryResult = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (diaryResult && diaryResult.success) {
                        return {
                            type: diaryResult.type || 'text',
                            comment: diaryResult.response || diaryResult.message,
                            handled: true,
                            source: 'diary_system'
                        };
                    }
                }
            } catch (diaryError) {
                console.warn(`${colors.warning}⚠️ 일기 시스템 에러: ${diaryError.message}${colors.reset}`);
                
                return {
                    type: 'text',
                    comment: '일기 시스템에 문제가 있네... 조금 있다가 다시 시도해줘! 💕',
                    handled: true
                };
            }
        }
        
        // 어떤 명령어도 해당하지 않음 - autoReply.js에서 처리
        console.log(`${colors.warning}⚠️ 특정 명령어 미감지 - 일반 대화로 처리${colors.reset}`);
        return null;
        
    } catch (error) {
        console.error(`${colors.error}❌ 처리 중 에러: ${error.message}${colors.reset}`);
        
        return {
            type: 'text',
            comment: getEmergencyFallback(),
            handled: true,
            source: 'emergency_fallback'
        };
    }
}

// 정리 함수
function cleanup() {
    try {
        if (userMemoryRedis) {
            userMemoryRedis.disconnect();
        }
        
        console.log(`${colors.success}✅ commandHandler 정리 완료${colors.reset}`);
    } catch (error) {
        console.error(`${colors.error}❌ 정리 중 에러: ${error.message}${colors.reset}`);
    }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
    handleCommand,
    handleModelSwitch,
    handlePhotoRequest,
    handleMemoryRequest,
    handleStatusCheck,
    cleanup
};

console.log(`${colors.fix}🚨 commandHandler.js 긴급 수정 완료! 모든 기본 명령어 복원! 🚨${colors.reset}`);
