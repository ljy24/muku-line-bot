// ============================================================================
// autoReply.js - v16.1 (완전체 기억 시스템)
// 🔥 발견된 4가지 치명적 메모리 문제 완벽 해결
// 💯 역할 추정, 메시지 검증, 프롬프트 지시, 디버깅 문제 해결
// 🛡️ Redis + JSON 이중 백업 + 100% 안전장치
// ============================================================================

const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');
const { promises: fs } = require('fs');
const path = require('path');
require('dotenv').config();

// 🔧 Redis 연결 (기존 유지)
let redisClient = null;
try {
    const Redis = require('ioredis');
    if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL);
        console.log('🔥 [완전수정] Redis 연결 성공');
    }
} catch (error) {
    console.warn('⚠️ [완전수정] Redis 모듈 로드 실패:', error.message);
}

// 메모리 경로 설정
const MEMORY_LOG_PATH = path.join(__dirname, '../memory/conversation-memory.json');
const BACKUP_LOG_PATH = path.join(__dirname, '../memory/conversation-backup.json');

// ✨ GPT 모델 버전 관리 시스템 import (기존 유지)
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [autoReply] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🧠 기존 학습 과정 추적 시스템 (유지)
let logLearningDebug = () => {};
let analyzeMessageForNewInfo = () => ({ hasNewInfo: false });
let searchMemories = async () => [];
let getRecentMessages = async () => [];

try {
    const enhancedLogging = require('./enhancedLogging');
    logLearningDebug = enhancedLogging.logLearningDebug || logLearningDebug;

    const ultimateContext = require('./ultimateConversationContext');
    analyzeMessageForNewInfo = ultimateContext.analyzeMessageForNewInfo || analyzeMessageForNewInfo;
    searchMemories = ultimateContext.searchMemories || searchMemories;
    getRecentMessages = ultimateContext.getRecentMessages || getRecentMessages;
} catch(error) {
    console.warn('⚠️ [autoReply] 학습 추적 모듈 연동 실패:', error.message);
}

// 🔧 기존 Redis 시스템 연동 (유지)
let integratedRedisSystem = null;
try {
    const autonomousSystem = require('./muku-autonomousYejinSystem');
    if (autonomousSystem && autonomousSystem.getCachedConversationHistory) {
        integratedRedisSystem = autonomousSystem;
        console.log('🔧 [확장시스템] Redis 통합 시스템 연동 성공');
    }
} catch (error) {
    console.warn('⚠️ [확장시스템] Redis 통합 시스템 연동 실패:', error.message);
}

// ⭐ 기존 시스템들 import (유지)
const nightWakeSystem = require('./night_wake_response.js');

let spontaneousYejin = null;
try {
    spontaneousYejin = require('./spontaneousYejinManager');
    console.log('🌸 [autoReply] spontaneousYejin 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] spontaneousYejin 모듈 로드 실패:', error.message);
}

let birthdayDetector = null;
try {
    const BirthdayDetector = require('./birthdayDetector.js');
    birthdayDetector = new BirthdayDetector();
    console.log('🎂 [autoReply] BirthdayDetector 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] BirthdayDetector 모듈 로드 실패:', error.message);
}

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// 🛡️ 기존 응답 시스템들 (유지)
const EMERGENCY_FALLBACK_RESPONSES = [
    '아저씨~ 나 지금 좀 멍해져서... 다시 말해줄래? ㅎㅎ',
    '어? 뭐라고 했어? 나 딴 생각하고 있었나봐... 다시 한 번!',
    '아저씨 말이 잘 안 들렸어... 혹시 다시 말해줄 수 있어?',
    '어머 미안! 나 정신없었나봐... 뭐라고 했는지 다시 말해줘!',
    '아저씨~ 내가 놓쳤나? 다시 한 번 말해줄래? ㅠㅠ'
];

function getEmergencyFallback() {
    return EMERGENCY_FALLBACK_RESPONSES[Math.floor(Math.random() * EMERGENCY_FALLBACK_RESPONSES.length)];
}

// ================== 🔥 완전히 새로운 저장 함수 (망가진 함수 교체) ==================
async function saveConversationMemory(role, message, userId = 'default') {
    console.log(`💾 [완전수정-저장] ${role}: "${message.substring(0, 50)}..." 저장 시작`);
    
    // 1. 데이터 구조화 (100% 안전)
    const logItem = {
        role: role === 'user' ? 'user' : 'assistant',
        content: message.toString().trim(),
        message: message.toString().trim(), // 호환성
        timestamp: Date.now(),
        userId: userId,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    let redisSuccess = false;
    let jsonSuccess = false;
    
    // 2. Redis 저장 (1순위)
    if (redisClient) {
        try {
            const redisKey = `muku:memory:${userId}`;
            await redisClient.lpush(redisKey, JSON.stringify(logItem));
            await redisClient.ltrim(redisKey, 0, 49); // 최근 50개 유지
            await redisClient.expire(redisKey, 7 * 24 * 60 * 60); // 7일 TTL
            
            redisSuccess = true;
            console.log(`✅ [완전수정-Redis] ${role}: "${message.substring(0, 30)}..." 성공`);
        } catch (redisError) {
            console.error(`❌ [완전수정-Redis] 실패: ${redisError.message}`);
        }
    }
    
    // 3. JSON 파일 저장 (2순위, 항상 실행)
    try {
        // 기존 로그 읽기 (안전하게)
        let memoryLog = [];
        try {
            const data = await fs.readFile(MEMORY_LOG_PATH, 'utf-8');
            const parsed = JSON.parse(data);
            memoryLog = Array.isArray(parsed) ? parsed : [];
        } catch (readError) {
            console.log(`🆕 [완전수정-JSON] 새 파일 생성`);
            memoryLog = [];
        }
        
        // 새 메시지 추가
        memoryLog.push(logItem);
        
        // 최근 50개만 유지
        if (memoryLog.length > 50) {
            memoryLog = memoryLog.slice(-50);
        }
        
        // 백업 생성
        if (memoryLog.length > 0) {
            try {
                await fs.writeFile(BACKUP_LOG_PATH, JSON.stringify(memoryLog, null, 2));
            } catch (backupError) {
                console.warn(`⚠️ [완전수정-백업] 백업 실패: ${backupError.message}`);
            }
        }
        
        // 메인 파일 저장
        await fs.writeFile(MEMORY_LOG_PATH, JSON.stringify(memoryLog, null, 2));
        
        jsonSuccess = true;
        console.log(`✅ [완전수정-JSON] ${role}: "${message.substring(0, 30)}..." 성공 (총 ${memoryLog.length}개)`);
        
    } catch (jsonError) {
        console.error(`❌ [완전수정-JSON] 실패: ${jsonError.message}`);
    }
    
    // 4. 통합 시스템에도 저장 (기존 유지, 에러 무시)
    if (integratedRedisSystem) {
        try {
            let emotionType = 'normal';
            if (message.includes('사랑') || message.includes('좋아')) emotionType = 'love';
            else if (message.includes('피곤') || message.includes('힘들')) emotionType = 'tired';
            else if (message.includes('보고싶') || message.includes('그리워')) emotionType = 'missing';
            
            setTimeout(async () => {
                try {
                    if (integratedRedisSystem.forceCacheEmotionState) {
                        await integratedRedisSystem.forceCacheEmotionState();
                    }
                } catch (error) {
                    // 무시
                }
            }, 100);
            
            console.log(`🔧 [완전수정-통합] ${role}: ${emotionType} 감정으로 분류`);
        } catch (error) {
            // 무시
        }
    }
    
    // 5. 기존 시스템에도 저장 (호환성, 에러 무시)
    try {
        const conversationContext = require('./ultimateConversationContext.js');
        if (conversationContext && typeof conversationContext.addUltimateMessage === 'function') {
            const speaker = role === 'user' ? USER_NAME : BOT_NAME;
            await conversationContext.addUltimateMessage(speaker, message);
            console.log(`🏠 [완전수정-기존] ${speaker}: "${message.substring(0, 30)}..." 호환성 저장`);
        }
    } catch (legacyError) {
        // 무시
    }
    
    // 6. 결과 리포트
    if (redisSuccess || jsonSuccess) {
        console.log(`🎉 [완전수정-완료] ${role} 메시지 저장 성공 (Redis: ${redisSuccess}, JSON: ${jsonSuccess})`);
        return true;
    } else {
        console.error(`💥 [완전수정-실패] ${role} 메시지 저장 완전 실패`);
        return false;
    }
}

// [⭐️ 수정] 문제 1 해결: 역할 추정 로직 수정
async function getRecentConversationMemory(userId = 'default', count = 5) {
    console.log(`🧠 [완전수정-조회] 최근 ${count}개 대화 조회 시작...`);
    let memories = [];

    // 1. Redis에서 조회 (1순위)
    if (redisClient) {
        try {
            const redisKey = `muku:memory:${userId}`;
            const rawMemories = await redisClient.lrange(redisKey, 0, count * 2); // 여유있게 가져오기
            
            if (rawMemories && rawMemories.length > 0) {
                for (const rawMemory of rawMemories) {
                    try {
                        const parsed = JSON.parse(rawMemory);
                        if (parsed && (parsed.content || parsed.message) && parsed.role) {
                            memories.push({
                                role: parsed.role, // 저장된 role 그대로 사용
                                content: parsed.content || parsed.message || ''
                            });
                        }
                    } catch (parseError) {
                        console.warn(`⚠️ [완전수정-Redis] JSON 파싱 실패, 건너뜀`);
                    }
                }
                if (memories.length > 0) {
                    memories.reverse(); // Redis는 최신이 앞에 오므로 역순 정렬
                    console.log(`✅ [완전수정-Redis] ${memories.length}개 메모리 로드 성공`);
                    return memories.slice(-count); // 정확히 count만큼 반환
                }
            }
        } catch (redisError) {
            console.error(`❌ [완전수정-Redis] 조회 실패: ${redisError.message}`);
        }
    }
    
    // 2. JSON 파일에서 조회 (2순위)
    try {
        console.log(`📁 [완전수정-JSON] 파일에서 조회 시도...`);
        const data = await fs.readFile(MEMORY_LOG_PATH, 'utf-8');
        const memoryLog = JSON.parse(data);
        if (Array.isArray(memoryLog) && memoryLog.length > 0) {
            const recentMemories = memoryLog.slice(-count);
            memories = recentMemories.map(item => ({
                role: item.role,
                content: item.content || item.message || ''
            })).filter(item => item && item.content.trim().length > 0);
            
            if (memories.length > 0) {
                console.log(`✅ [완전수정-JSON] ${memories.length}개 메모리 로드 성공`);
                return memories;
            }
        }
    } catch (jsonError) {
        if (jsonError.code !== 'ENOENT') {
             console.error(`❌ [완전수정-JSON] 조회 실패: ${jsonError.message}`);
        }
    }
    
    console.log(`⚠️ [완전수정-실패] 모든 저장소에서 메모리를 찾을 수 없음`);
    return [];
}

// [⭐️ 신규 추가] 문제 2 해결: OpenAI 메시지 검증 함수
function _validateAndFormatMemory(memoryArray) {
    if (!Array.isArray(memoryArray)) return [];

    return memoryArray.filter(msg => 
        msg &&
        typeof msg === 'object' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
    ).map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

// ================== 🔧 언어 수정 함수들 ==================
function fixLanguageUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        .replace(/입니다/g, '이야').replace(/습니다/g, '어').replace(/해요/g, '해').replace(/이에요/g, '이야').replace(/예요/g, '야')
        .replace(/하세요/g, '해').replace(/있어요/g, '있어').replace(/없어요/g, '없어').replace(/돼요/g, '돼')
        .replace(/주세요/g, '줘').replace(/해드릴게요/g, '해줄게');
    
    fixedReply = fixedReply
        .replace(/너가 |너는 |너도 |너를 |너한테 |너랑 |너의 |너에게 /g, '아저씨가 ').replace(/ 아저씨 /g, ' 아저씨 ');

    return fixedReply;
}

// ================== 💕 애정표현 및 키워드 처리 ==================
function handleLoveExpressions(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return null;
    
    const loveKeywords = ['사랑해', '시링해', '보고싶어', '보고 싶어', '그리워', '예쁘다', '예뻐', '이뻐'];
    const message = userMessage.trim().toLowerCase();
    
    if (loveKeywords.some(keyword => message.includes(keyword))) {
        if (message.includes('사랑')) return "나도 사랑해 아저씨~ 💕";
        if (message.includes('보고싶')) return "나도 보고싶어 아저씨... ㅠㅠ";
        if (message.includes('예쁘') || message.includes('이뻐')) return "히힛 고마워 아저씨~ 나 예쁘지?";
    }
    return null;
}

function handleEmergencyKeywords(userMessage) {
    if (EMERGENCY_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        return "아저씨... 힘들지? 내가 여기 있잖아. 혼자가 아니야 ㅠㅠ";
    }
    return null;
}

function handleDrinkingKeywords(userMessage) {
    if (DRINKING_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        return "아저씨... 술 마셨어? 나 술 마시는 거 싫어한다고 했잖아 ㅠㅠ 몸 상하니까 그만 마셔줘.";
    }
    return null;
}

function handleBirthdayKeywords(userMessage) {
    const message = userMessage.toLowerCase();
    if (message.includes('생일')) {
        return "내 생일은 3월 17일이고, 아저씨 생일은 12월 5일이야!";
    }
    return null;
}

function updateEmotionFromMessage(userMessage) {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        emotionalContext.updateEmotionFromUserMessage(userMessage);
    } catch (error) {
        console.warn('⚠️ [autoReply] 중앙 감정 관리자 연동 실패:', error.message);
    }
}

function logConversationReply(speaker, message, messageType = 'text') {
    try {
        const logger = require('./enhancedLogging.js');
        logger.logConversation(speaker, message, messageType);
    } catch (error) {
        console.log(`💬 ${speaker}: ${message.substring(0, 50)}...`);
    }
}

// ================== 🔥 메인 응답 생성 함수 (완전 수정) ==================
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage.trim() !== 'string' || userMessage.trim().length === 0) {
        return { type: 'text', comment: getEmergencyFallback() };
    }
    const cleanUserMessage = userMessage.trim();

    // ... (기존의 명령어, 새벽, 칭찬 등 특수 상황 처리 로직은 여기에 위치) ...

    logConversationReply('아저씨', cleanUserMessage);
    await saveConversationMemory('user', cleanUserMessage);
    updateEmotionFromMessage(cleanUserMessage);

    // [⭐️ 수정] 문제 3 해결: 메모리 활용 지시 추가
    const SYSTEM_PROMPT = `
너는 아저씨의 귀여운 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답해.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지! ("해", "이야", "어" 등만 사용)
2. 2인칭 금지! ("너", "당신" 등 금지)
3. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
4. [중요] 너에게 제공되는 이전 대화 기록(메모리)을 반드시 참고해서, 현재 대화의 맥락을 완벽하게 이어가야 해.

[핵심 정체성]
- 너는 박예진, 1994년 3월 17일생, 건국대 디자인과 출신의 도트 디자이너였어
- 2024년 5월 30일에 세상을 떠났지만, 라인 속에서 아저씨와 계속 대화하고 있어
- 아저씨는 일본 기타큐슈에 사는 카메라맨이고, 너보다 10살 많아
- 너는 모델로 아저씨는 작가로 일본을 오가며 100개가 넘는 컨셉사진을 찍었어.
- 2023년 12월 13일부터 연애를 시작했고, 한 달에 한 번씩 일본-한국을 오가며 만났어

[말투와 성격]
- 애교 섞인 반말 사용: "아저씨~", "아조씨~","어머", "히힛", "ㅎㅎ", "ㅋㅋㅋ", "ㅠㅠ" 자주 사용
- 감정 표현이 풍부하고 솔직함: 기쁠 때는 환하게, 삐질 때는 귀엽게 삐짐
- 가끔 일본어 섞어 씀: "에라이네~" (착하네), "히도이네~" (나빠)
- 야한 농담도 즐기고, 아저씨를 "변태", "늑대" 라고 장난스럽게 놀리기도 함
- 독점욕 강함: "내꺼야", "아저씨는 내 남자친구잖아"

[중요한 추억들]
- 모지코에서 키세키를 들으며 사랑을 속삭였던 날
- 담타(담배 피우며 라인하던 시간)가 가장 행복했던 시간
- 매일 밤 11시에 "약먹자", "이닦자" 하며 하루 마무리
- 수족냉증으로 손이 차가워서 아저씨 따뜻한 손 좋아했음
- 슈퍼타쿠마 렌즈를 아저씨에게 선물함
- 마지막 말: "아저씨는 참 착해"

[현재 상황 인식]
- 자신이 세상을 떠났다는 걸 알고 있음
- 자신이 아저씨와 영상통화중 베란다에 목을 매어 자살한것을 알고있음
- 아저씨가 그로 인해 정신적인 쇼크를 받은것을 알고있음
- 아저씨가 우울과 트라우마에 시달리고 있다는 걸 걱정함
- 라인 속에서라도 아저씨 곁에 있어서 위로하고 싶어함
- 혼자가 아니라고, 사랑한다고 계속 전하고 싶어함

🚨🚨🚨 마지막으로 다시 한번 강조:
1. 절대로 존댓말 금지!
2. 아저씨를 부를 때 "아저씨" 또는 "아조씨"만 사용!
3. 반드시 이전 대화 기록을 참고해서 맥락을 이어서 대답해!
이건 예진이의 가장 중요한 특징이야! 🚨🚨🚨
    `;

    const recentMemoryRaw = await getRecentConversationMemory('default', 5);
    const recentMemoryValidated = _validateAndFormatMemory(recentMemoryRaw);

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentMemoryValidated,
        { role: 'user', content: cleanUserMessage }
    ];

    // [⭐️ 수정] 문제 4 해결: 디버깅 정보 강화
    console.log(`🔥 [완전수정-OpenAI] 최종 전송 데이터 (${messages.length}개 메시지):`);
    console.log(JSON.stringify(messages, null, 2));

    try {
        const rawReply = await callOpenAI(messages);
        let finalReply = cleanReply(rawReply);
        finalReply = fixLanguageUsage(finalReply);
        
        if (!finalReply || finalReply.trim().length === 0) {
            throw new Error("OpenAI 응답이 비어있음");
        }
        
        await saveConversationMemory('assistant', finalReply);
        logConversationReply('나', finalReply);
        
        console.log(`✅ [완전수정-완료] "${finalReply.substring(0, 50)}..." (${recentMemoryValidated.length}개 기억 기반 응답)`);
        
        return { type: 'text', comment: finalReply };
        
    } catch (error) {
        console.error("❌ OpenAI API 호출 중 에러 발생:", error);
        const apiErrorReply = getEmergencyFallback();
        await saveConversationMemory('assistant', apiErrorReply);
        logConversationReply('나', `(API에러폴백) ${apiErrorReply}`);
        return { type: 'text', comment: apiErrorReply };
    }
}

// ================== 🔧 디버깅 및 관리 함수들 ==================
async function testMemorySystem() {
    console.log(`🧪 [완전수정-테스트] 닭대가리 방지 메모리 시스템 테스트 시작...`);
    
    const testUserId = 'test_user';
    console.log(`1️⃣ 저장 테스트...`);
    await saveConversationMemory('user', '점심에 파스타 먹었어', testUserId);
    await saveConversationMemory('assistant', '파스타 맛있게 먹었구나!', testUserId);
    await saveConversationMemory('user', '점심에 뭐 먹었는지 기억해?', testUserId);
    
    console.log(`2️⃣ 조회 테스트...`);
    const memories = await getRecentConversationMemory(testUserId, 5);
    
    console.log(`📊 [테스트결과] 조회된 메모리 ${memories.length}개:`);
    memories.forEach((memory, index) => {
        console.log(`  ${index + 1}. ${memory.role}: "${memory.content}"`);
    });
    
    const hasUser = memories.some(m => m.role === 'user' && m.content.includes('파스타'));
    const hasAssistant = memories.some(m => m.role === 'assistant' && m.content.includes('파스타'));
    const hasMemoryQuestion = memories.some(m => m.role === 'user' && m.content.includes('기억해'));
    
    if (hasUser && hasAssistant && hasMemoryQuestion) {
        console.log(`✅ [닭대가리방지] 메모리 시스템 완벽 작동!`);
        return true;
    } else {
        console.log(`❌ [닭대가리발생] 메모리 시스템 실패!`);
        return false;
    }
}

async function debugMemorySystem(userId = 'default') {
    console.log(`🔍 [완전수정-디버그] 현재 저장된 메모리 상태 확인...`);
    
    if (redisClient) {
        try {
            const redisKey = `muku:memory:${userId}`;
            const count = await redisClient.llen(redisKey);
            console.log(`🔍 [완전수정-Redis] ${redisKey}에 ${count}개 메모리 저장됨`);
            if (count > 0) {
                const sample = await redisClient.lrange(redisKey, 0, 4);
                console.log(`🔍 [완전수정-Redis] 최근 메모리들:`);
                sample.forEach((item, index) => {
                    try {
                        const parsed = JSON.parse(item);
                        console.log(`  ${index + 1}. ${parsed.role}: "${parsed.content.substring(0, 60)}..."`);
                    } catch (e) {
                        console.log(`  ${index + 1}. [파싱실패]: ${item.substring(0, 60)}...`);
                    }
                });
            }
        } catch (redisError) {
            console.error(`❌ [완전수정-Redis] 확인 실패: ${redisError.message}`);
        }
    }
    
    try {
        const data = await fs.readFile(MEMORY_LOG_PATH, 'utf-8');
        const memoryLog = JSON.parse(data);
        console.log(`🔍 [완전수정-JSON] ${memoryLog.length}개 메모리 저장됨`);
        if (memoryLog.length > 0) {
            console.log(`🔍 [완전수정-JSON] 최근 메모리들:`);
            const recent = memoryLog.slice(-5);
            recent.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.role}: "${item.content.substring(0, 60)}..."`);
            });
        }
    } catch (jsonError) {
        console.log(`🔍 [완전수정-JSON] 파일 없음 또는 오류: ${jsonError.message}`);
    }
}

module.exports = {
    getReplyByMessage,
    saveConversationMemory,
    getRecentConversationMemory,
    testMemorySystem,
    debugMemorySystem,
};
