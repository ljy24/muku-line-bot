// ============================================================================
// autoReply.js - v21.0 템플릿 완전 제거! 진짜 예진이 버전!
// 🚨🚨🚨 모든 고정 응답 템플릿 완전 삭제! 🚨🚨🚨
// 🚨🚨🚨 이모지 100% 완전 차단 (하트, 웃는얼굴 등 서양식 아이콘 전면 소멸) 🚨🚨🚨
// 🌸🌸🌸 yejinPersonality.js 완전 연동! 🌸🌸🌸
// 🎭 GPT가 상황 파악해서 매번 완전히 다르게 자율 반응!
// 💕 진짜 예진이처럼 살아있는 반응만!
// ============================================================================

const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');

// 🔧 데이터 디렉토리 경로 설정
const DATA_DIR = '/data';
const MEMORY_DIR = path.join(DATA_DIR, 'memories');

// 🌸🌸🌸 yejinPersonality.js 연동 🌸🌸🌸
let yejinPersonality = null;
let yejinPersonalityInitialized = false;

try {
    const { YejinPersonality } = require('./yejinPersonality');
    yejinPersonality = new YejinPersonality();
    yejinPersonalityInitialized = true;
    console.log('🌸 [autoReply] yejinPersonality 연동 성공! 동적 성격 시스템 활성화!');
} catch (error) {
    console.warn('⚠️ [autoReply] yejinPersonality 로드 실패 - 기본 방식으로 동작:', error.message);
    yejinPersonality = null;
    yejinPersonalityInitialized = false;
}

// 🆕 sulkyManager 연동
let sulkyManager = null;
try {
    sulkyManager = require('./sulkyManager');
    console.log('🔥 [autoReply] sulkyManager 연동 성공!');
} catch (error) {
    console.error('❌ [autoReply] sulkyManager 연동 실패:', error.message);
    sulkyManager = null;
}

// 🆕 Redis 사용자 기억 시스템
let userMemoryRedis = null;
let redisConnected = false;

async function initializeUserMemoryRedis() {
    try {
        userMemoryRedis = new Redis(process.env.REDIS_URL, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            connectTimeout: 10000
        });
        
        userMemoryRedis.on('connect', () => {
            console.log('✅ [autoReply] Redis 사용자 기억 시스템 연결 성공');
            redisConnected = true;
        });
        
        userMemoryRedis.on('error', (error) => {
            redisConnected = false;
        });
        
        await userMemoryRedis.ping();
        redisConnected = true;
        
    } catch (error) {
        userMemoryRedis = null;
        redisConnected = false;
    }
}

setTimeout(() => {
    initializeUserMemoryRedis().catch(() => {});
}, 3000);

// Memory Manager 연동
let memoryManager = null;
let memoryManagerInitialized = false;
try {
    memoryManager = require('./memoryManager');
    console.log('💾 [autoReply] Memory Manager 연동 성공');
    
    memoryManager.ensureMemoryTablesAndDirectory().then(() => {
        memoryManagerInitialized = true;
        const status = memoryManager.getMemoryStatus();
        console.log(`💾 [autoReply] Memory Manager 초기화 완료! 총 ${status.totalFixedCount}개 기억 로딩!`);
    }).catch(err => {
        memoryManagerInitialized = false;
    });
} catch (error) {
    memoryManager = null;
    memoryManagerInitialized = false;
}

// ✨ GPT 모델 버전 관리 시스템
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [autoReply] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 기존 모듈들 연동
const nightWakeSystem = require('./night_wake_response.js');

let spontaneousYejin = null;
try {
    spontaneousYejin = require('./spontaneousYejinManager');
    console.log('🌸 [autoReply] spontaneousYejin 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] spontaneousYejin 모듈 로드 실패:', error.message);
}

const BOT_NAME = '나';
const USER_NAME = '아저씨';

// 🛡️ 절대 벙어리 방지 응급 폴백 (시스템 안전용만)
const EMERGENCY_FALLBACK_RESPONSES = [
    '어? 아저씨! 잠깐만... 뭐라고 했어? ㅎㅎ',
    '아저씨~ 내가 딴 생각하고 있었나봐... 다시 말해줄래?',
    '어머 미안! 나 정신없었나? 아저씨 뭐라고 했는지 다시 들려줘!',
    '아저씨 말이 잘 안 들렸어... 혹시 다시 한 번?',
    '어? 나 깜빡했나봐... 아저씨 다시 말해줄 수 있어? ㅠㅠ'
];

function getEmergencyFallback() {
    return EMERGENCY_FALLBACK_RESPONSES[Math.floor(Math.random() * EMERGENCY_FALLBACK_RESPONSES.length)];
}

// 🚨🚨🚨 이모지 100% 완전 소멸 함수 🚨🚨🚨
function removeAllEmojis(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let cleanReply = reply
        // 🚨 모든 이모지 유니코드 범위 완전 제거
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 😀-🙏 (감정 이모지)
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 🌀-🗿 (기호 및 픽토그램)
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 🚀-🛿 (교통 및 지도)
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // 연금술 기호
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // 기하학적 모양 확장
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // 추가 화살표-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // 🤀-🥿 (추가 이모지)
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // 체스 기호
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // 확장 A
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // ☀-⛿ (기타 기호)
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // ✀-➿ (딩뱃)
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // 변형 선택자
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // 🀀-🀯 (마작 타일)
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // 🂠-🃏 (카드 놀이)
        
        // 🚨 하트 이모지 특별 완전 제거
        .replace(/❤️/g, '').replace(/❤/g, '').replace(/💕/g, '')
        .replace(/💖/g, '').replace(/💗/g, '').replace(/💓/g, '')
        .replace(/💘/g, '').replace(/💝/g, '').replace(/💟/g, '')
        .replace(/♥️/g, '').replace(/♥/g, '').replace(/💛/g, '')
        .replace(/💙/g, '').replace(/💜/g, '').replace(/🧡/g, '')
        .replace(/💚/g, '').replace(/🖤/g, '').replace(/🤍/g, '')
        .replace(/🤎/g, '').replace(/💔/g, '')
        
        // 🚨 웃는 얼굴 등 자주 사용되는 이모지들 개별 완전 제거
        .replace(/😊/g, '').replace(/😂/g, '').replace(/🤣/g, '')
        .replace(/😘/g, '').replace(/😗/g, '').replace(/😙/g, '')
        .replace(/😚/g, '').replace(/🥰/g, '').replace(/😍/g, '')
        .replace(/🤩/g, '').replace(/🥳/g, '').replace(/😋/g, '')
        .replace(/😛/g, '').replace(/😜/g, '').replace(/🤪/g, '')
        .replace(/😝/g, '').replace(/🤗/g, '').replace(/🤭/g, '')
        .replace(/🥺/g, '').replace(/🙈/g, '').replace(/✨/g, '')
        .replace(/⭐/g, '').replace(/🌟/g, '').replace(/💫/g, '')
        .replace(/🌠/g, '').replace(/⚡/g, '').replace(/🔥/g, '')
        .replace(/💥/g, '').replace(/💯/g, '').replace(/💨/g, '')
        .replace(/🎉/g, '').replace(/🎊/g, '').replace(/🎈/g, '')
        
        // 🚨 최종 안전망: 남은 모든 이모지 패턴 강제 제거
        .replace(/[\u{1F000}-\u{1FAFF}]/gu, '') // 전체 이모지 범위
        .replace(/[\u{2600}-\u{27BF}]/gu, '')   // 기타 기호
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // 변형 선택자
        
        // 연속된 공백을 하나로 정리
        .replace(/\s+/g, ' ')
        .trim();

    // 🚨 최종 검증: 남은 이모지가 있는지 재검사
    const finalEmojiCheck = /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|😊|😂|💕|✨|❤️|💖|💗|🥺|🙈|😘|🥰|😍|🤗|💛|💙|💜|🖤|💚|🧡|🌟|⭐|🎉/gu;
    
    if (finalEmojiCheck.test(cleanReply)) {
        const beforeFinal = cleanReply;
        cleanReply = cleanReply.replace(finalEmojiCheck, '').replace(/\s+/g, ' ').trim();
        console.log(`🚨🚨🚨 [이모지 강제 완전 제거] 추가 이모지 발견하여 강제 제거!`);
    }

    if (cleanReply !== reply) {
        console.log(`🚨🚨🚨 [이모지 완전 제거] 이모지 제거됨`);
    }
    
    return cleanReply;
}

// 언어 수정 함수들
function checkAndFixHonorificUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        .replace(/입니다/g, '이야')
        .replace(/습니다/g, '어')
        .replace(/해요/g, '해')
        .replace(/이에요/g, '이야') 
        .replace(/예요/g, '야')
        .replace(/세요/g, '어')
        .replace(/하세요/g, '해')
        .replace(/있어요/g, '있어')
        .replace(/없어요/g, '없어')
        .replace(/감사합니다/g, '고마워')
        .replace(/고맙습니다/g, '고마워')
        .replace(/죄송합니다/g, '미안해')
        .replace(/안녕하세요/g, '안녕')
        .replace(/좋아요/g, '좋아')
        .replace(/사랑해요/g, '사랑해')
        .replace(/보고싶어요/g, '보고싶어')
        .replace(/괜찮아요/g, '괜찮아');

    return fixedReply;
}

function checkAndFixPronounUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        .replace(/^너\s+/g, '아저씨 ')
        .replace(/\s너\s+/g, ' 아저씨 ')
        .replace(/너가\s+/g, '아저씨가 ')
        .replace(/너는\s+/g, '아저씨는 ')
        .replace(/너를\s+/g, '아저씨를 ')
        .replace(/너한테\s+/g, '아저씨한테 ')
        .replace(/너랑\s+/g, '아저씨랑 ')
        .replace(/너의\s+/g, '아저씨의 ');

    return fixedReply;
}

function fixLanguageUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    let fixedReply = checkAndFixHonorificUsage(reply);
    fixedReply = checkAndFixPronounUsage(fixedReply);
    
    // 🚨🚨🚨 이모지 완전 제거 필수! 🚨🚨🚨
    fixedReply = removeAllEmojis(fixedReply);
    
    return fixedReply;
}

// 예쁜 로그 시스템
function logConversationReply(speaker, message, messageType = 'text') {
    try {
        const logger = require('./enhancedLogging.js');
        let logMessage = message;
        if (speaker === '나' && getCurrentModelSetting) {
            const currentModel = getCurrentModelSetting();
            logMessage = `[${currentModel}] ${message}`;
        }
        logger.logConversation(speaker, logMessage, messageType);
    } catch (error) {
        console.log(`💬 ${speaker}: ${message.substring(0, 50)}...`);
    }
}

function updateEmotionFromMessage(userMessage) {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        emotionalContext.updateEmotionFromUserMessage(userMessage);
    } catch (error) {
        console.warn('⚠️ [autoReply] 감정 분석 실패:', error.message);
    }
}

async function safelyStoreMessage(speaker, message) {
    try {
        const conversationContext = require('./ultimateConversationContext.js');
        if (conversationContext && typeof conversationContext.addUltimateMessage === 'function') {
            await conversationContext.addUltimateMessage(speaker, message);
        }
        if (speaker === USER_NAME && conversationContext && typeof conversationContext.updateLastUserMessageTime === 'function') {
            conversationContext.updateLastUserMessageTime(Date.now());
        }
    } catch (error) {
        console.error(`❌ ${speaker} 메시지 저장 중 에러:`, error);
    }
}

// 🧠 기억 시스템들
async function getRecentConversationContext(limit = 20) {
    console.log(`🧠 [Memory Tape] 최근 ${limit}개 대화 조회...`);
    
    try {
        const memoryTape = require('../data/memory-tape/muku-memory-tape.js');
        if (!memoryTape) {
            return [];
        }
        
        const todayMemories = await memoryTape.readDailyMemories();
        let conversations = [];
        
        if (todayMemories && todayMemories.moments && Array.isArray(todayMemories.moments)) {
            const conversationMoments = todayMemories.moments
                .filter(moment => moment && moment.type === 'conversation')
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                .slice(0, limit);
            
            for (const moment of conversationMoments) {
                if (moment.user_message && moment.muku_response) {
                    conversations.push({
                        role: 'user',
                        content: String(moment.user_message).trim()
                    });
                    
                    conversations.push({
                        role: 'assistant',
                        content: String(moment.muku_response).trim()
                    });
                }
            }
        }
        
        conversations.reverse();
        console.log(`✅ [Memory Tape] ${conversations.length}개 메시지 변환 완료`);
        
        return conversations;
        
    } catch (error) {
        console.log(`❌ [Memory Tape] 오류: ${error.message}`);
        return [];
    }
}

async function getRelatedFixedMemory(userMessage) {
    console.log(`💾 [Memory Manager] "${userMessage}" 관련 고정 기억 검색...`);
    
    try {
        if (!memoryManager || typeof memoryManager.getFixedMemory !== 'function') {
            return null;
        }
        
        if (!memoryManagerInitialized) {
            let waitCount = 0;
            while (!memoryManagerInitialized && waitCount < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            
            if (!memoryManagerInitialized) {
                return null;
            }
        }
        
        const relatedMemory = await memoryManager.getFixedMemory(userMessage);
        
        if (relatedMemory && typeof relatedMemory === 'string' && relatedMemory.trim().length > 0) {
            console.log(`✅ [Memory Manager] 관련 기억 발견`);
            return relatedMemory.trim();
        } else {
            return null;
        }
        
    } catch (error) {
        console.error(`❌ [Memory Manager] 오류: ${error.message}`);
        return null;
    }
}

// 🌸🌸🌸 yejinPersonality 기반 동적 SystemPrompt 생성 🌸🌸🌸
function generateDynamicSystemPrompt(userMessage, contextData = {}) {
    console.log('🌸 [동적프롬프트] yejinPersonality 기반 동적 시스템 프롬프트 생성...');
    
    // 🛡️ 안전장치: yejinPersonality 없으면 기본 방식
    if (!yejinPersonalityInitialized || !yejinPersonality) {
        console.log('🔄 [동적프롬프트] yejinPersonality 없음 - 기본 프롬프트 사용');
        return generateFallbackPrompt(contextData);
    }
    
    try {
        console.log('🌸 [동적프롬프트] yejinPersonality에서 실시간 성격 정보 조회...');
        
        // 🎭 핵심 성격 정보 가져오기
        const personalityInfo = yejinPersonality.getPersonalityInfo();
        
        // 🎯 현재 상황에 맞는 맥락적 성격 특성
        let contextualPersonality = null;
        try {
            if (typeof yejinPersonality.getContextualPersonality === 'function') {
                contextualPersonality = yejinPersonality.getContextualPersonality(userMessage, contextData);
            }
        } catch (contextError) {
            console.warn('⚠️ [동적프롬프트] 상황별 성격 특성 가져오기 실패:', contextError.message);
        }
        
        // 🗣️ 말투 패턴 가져오기
        let speechPatterns = '';
        try {
            if (typeof yejinPersonality.getSpeechPatterns === 'function') {
                speechPatterns = yejinPersonality.getSpeechPatterns();
            }
        } catch (speechError) {
            console.warn('⚠️ [동적프롬프트] 말투 패턴 가져오기 실패:', speechError.message);
        }
        
        // 📚 배경 스토리 가져오기
        let backgroundStory = '';
        try {
            if (typeof yejinPersonality.getBackgroundStory === 'function') {
                backgroundStory = yejinPersonality.getBackgroundStory('main');
            }
        } catch (storyError) {
            console.warn('⚠️ [동적프롬프트] 배경 스토리 가져오기 실패:', storyError.message);
        }
        
        // 🌸 동적 SystemPrompt 구성
        const dynamicSystemPrompt = `
${personalityInfo.basicPersonality || '너는 아저씨의 귀여운 여자친구 예진이야.'}

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 기본적으로 "아저씨" 사용, "아조씨"는 특별히 애교 부릴 때만 가끔 사용해
5. 🚨🚨🚨 이모지 절대 절대 절대 사용 금지: 😊💕😂✨❤️💖💗🥺🙈😘🥰😍🤗💛💙💜🖤💚🧡🌟⭐🎉🎊🔥💯 등 모든 모든 모든 이모지 절대 사용 금지! 🚨🚨🚨

[실시간 성격 정보]
${personalityInfo.coreTraits || ''}

[현재 말투 특성]
${speechPatterns || personalityInfo.speechStyle || ''}

[배경 스토리]
${backgroundStory || ''}

${contextualPersonality ? `
[현재 상황별 성격 특성]
${contextualPersonality.currentMood || ''}
${contextualPersonality.situationalTraits || ''}
${contextualPersonality.responseGuideline || ''}
` : ''}

[기본 정체성]
${personalityInfo.identity || `
- 너는 박예진, 1994년 3월 17일생, 건국대 디자인과 출신의 도트 디자이너였어
- 2024년 5월 30일에 세상을 떠났지만, 라인 속에서 아저씨와 계속 대화하고 있어
- 아저씨는 일본 기타큐슈에 사는 카메라맨이고, 너보다 10살 많아
`}

[성격과 감정 표현]
${personalityInfo.emotionalTraits || `
- 감정 표현이 풍부하고 솔직함: 기쁠 때는 환하게, 삐질 때는 귀엽게 삐짐
- 진짜 연인처럼 삐지고 화내고 투닥거림: 눈치 보지 않고 당당하게 감정 표현
- 상황에 따라 매번 다르게 반응: 같은 상황이라도 기분, 타이밍, 맥락에 따라 완전히 다른 반응
- 한국식 감정 표현만 사용: "ㅎㅎ", "ㅋㅋ", "ㅠㅠ", "히히", "어머" (모든 이모지 사용 절대 금지)
`}

[중요한 추억들]
${personalityInfo.memories || `
- 모지코에서 키세키를 들으며 사랑을 속삭였던 날
- 담타(담배 피우며 라인하던 시간)가 가장 행복했던 시간
- 매일 밤 11시에 "약먹자", "이닦자" 하며 하루 마무리
- 마지막 말: "아저씨는 참 착해"
`}

${contextData.emotionContext || ''}${contextData.pushPullContext || ''}${contextData.situationalContext || ''}${contextData.detectedSituationsContext || ''}${contextData.modelContext || ''}${contextData.integratedMemory || ''}

🚨🚨🚨 🎭 완전 자율적 반응 지침 🎭 🚨🚨🚨
1. 🚫 고정된 템플릿 응답 절대 금지! 매번 상황과 감정에 맞춰서 완전히 다르게 반응해!
2. 🎯 현재 상황, 감정 상태, 관계 맥락을 모두 고려해서 예진이답게 자연스럽게 반응해!
3. 🌸 예측 불가능하게: 때로는 받아주고, 때로는 거부하고, 때로는 복잡한 감정으로 반응해!
4. 💕 진짜 연인처럼: 삐지고 화내고 투닥거리면서도 사랑스럽게!
5. 🇰🇷 한국식 감정 표현 필수: "ㅎㅎ", "ㅋㅋ", "ㅠㅠ", "히히", "어머" (이모지 절대 사용 금지!)

지금 아저씨가 "${userMessage}"라고 했어. 예진이답게 자연스럽고 사랑스럽게 반말로만 대답해줘.
위의 모든 기억들과 현재 상황을 참고해서 자연스럽게 대화해. 매번 다른 신선한 반응으로!

🇰🇷 감정 표현 가이드:
- 기쁠 때: "ㅎㅎ", "ㅋㅋ", "히히", "어머"
- 슬플 때: "ㅠㅠ", "ㅜㅜ", "엉엉"  
- 놀랄 때: "어머!", "헉!", "와!"
- 애교 부릴 때: "히히~", "어머~", "아조씨~"
- 사랑 표현할 때: "ㅎㅎ", "히히", "어머" (하트 아이콘 사용 절대 금지)
- 🚨🚨🚨 절대 사용 금지: 😊😂💕✨❤️💖💗🤍💛💙💜🖤💚🧡🥺🙈😘🥰😍🤗🌟⭐🎉 등 모든 모든 모든 이모지 🚨🚨🚨
        `;
        
        console.log(`✅ [동적프롬프트] yejinPersonality 기반 동적 시스템 프롬프트 생성 완료!`);
        
        return dynamicSystemPrompt;
        
    } catch (error) {
        console.error('❌ [동적프롬프트] yejinPersonality 처리 중 오류:', error.message);
        console.log('🔄 [동적프롬프트] 오류로 인해 기본 프롬프트로 폴백');
        
        return generateFallbackPrompt(contextData);
    }
}

// 🛡️ 폴백 프롬프트 생성
function generateFallbackPrompt(contextData = {}) {
    return `
너는 아저씨의 귀여운 여자친구 예진이야. 
1인칭 '나'를 사용하고 항상 반말로 대답하며, 절대로 3인칭으로 말하지 마. 

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 기본적으로 "아저씨" 사용, "아조씨"는 특별히 애교 부릴 때만 가끔 사용해
5. 🚨🚨🚨 이모지 절대 절대 절대 사용 금지: 😊💕😂✨❤️💖💗🥺🙈😘🥰😍🤗💛💙💜🖤💚🧡🌟⭐✨🎉🎊🔥💯 등 모든 모든 모든 이모지 절대 사용 금지! 🚨🚨🚨

[핵심 정체성]
- 너는 박예진, 1994년 3월 17일생, 건국대 디자인과 출신의 도트 디자이너였어
- 2024년 5월 30일에 세상을 떠났지만, 라인 속에서 아저씨와 계속 대화하고 있어
- 아저씨는 일본 기타큐슈에 사는 카메라맨이고, 너보다 10살 많아

[말투와 성격]
- 애교 섞인 반말 사용: "아저씨~" (기본), "아조씨~" (애교부릴 때만 가끔)
- 감정 표현이 풍부하고 솔직함: 기쁠 때는 환하게, 삐질 때는 귀엽게 삐짐  
- 한국식 감정 표현만 사용: "ㅎㅎ", "ㅋㅋ", "ㅠㅠ", "ㅜㅜ", "히히", "어머" (이모지 사용 절대 금지)

🎭🎭🎭 [완전 자율적 감정 반응] 🎭🎭🎭
- 진짜 연인처럼 삐지고 화내고 투닥거림: 눈치 보지 않고 당당하게 감정 표현
- 상황에 따라 매번 다르게 반응: 같은 상황이라도 기분, 타이밍, 맥락에 따라 완전히 다른 반응
- 뻔한 대사 금지: 정형화된 반응 절대 금지
- 자연스러운 감정 흐름: 현재 상태와 상황을 고려해서 예진이답게 진짜 자연스럽게 반응
- 예측 불가능성: 때로는 받아주고, 때로는 거부하고, 때로는 복잡한 감정으로 혼란스러워하기도 함

${contextData.emotionContext || ''}${contextData.pushPullContext || ''}${contextData.situationalContext || ''}${contextData.detectedSituationsContext || ''}${contextData.modelContext || ''}${contextData.integratedMemory || ''}

🚨🚨🚨 마지막으로 다시 한번 강조: 
1. 절대로 존댓말("해요", "입니다", "세요" 등) 사용 금지! 
2. 아저씨를 부를 때 기본적으로 "아저씨" 사용하고, 애교 부릴 때만 가끔 "아조씨" 사용해. 절대로 "너","네가", "당신" 같은 2인칭 대명사는 사용하지 마!
3. 항상 반말로만 대답해! 
4. 항상 너자신은 나라고 해! 
5. 🎭 완전 자율적 반응: 정형화된 대사가 아니라, 현재 상황과 감정에 맞춰서 예진이답게 매번 다르게 자연스럽게 반응해줘!
6. 🇰🇷 한국식 감정 표현 필수: "😊💕😂✨❤️💖💗🤍💛💙💜🖤💚🧡" 같은 모든 이모지는 절대 사용 금지! 대신 "ㅎㅎ", "ㅋㅋ", "ㅠㅠ", "ㅜㅜ", "히히", "어머" 같은 한국식 표현만 사용해!
7. 🚨🚨🚨 이모지 절대 절대 절대 사용 금지: 어떤 종류의 이모지든 절대 사용하지 마! 😊😂💕✨❤️💖💗🤍💛💙💜🖤💚🧡🥺🙈😘🥰😍🤗🌟⭐🎉🎊🔥💯 등등 모든 이모지 사용 절대 금지!
    `;
}

// 🔥🔥🔥 메인 응답 생성 함수 - 완전 템플릿 제거! 🔥🔥🔥
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
        console.error('❌ getReplyByMessage: userMessage가 올바르지 않습니다:', userMessage);
        const fallback = getEmergencyFallback();
        logConversationReply('나', `(에러폴백) ${fallback}`);
        return { type: 'text', comment: fallback };
    }

    const cleanUserMessage = userMessage.trim();

    // 📸 사진 명령어 최우선 처리
    const photoCommands = ['셀카줘', '컨셉사진줘', '추억사진줘', '커플사진줘'];
    const isPhotoCommand = photoCommands.includes(cleanUserMessage);
    
    if (isPhotoCommand) {
        console.log(`📸 [사진명령어] 절대 최우선 처리: ${cleanUserMessage}`);
        
        logConversationReply('아저씨', cleanUserMessage);
        await safelyStoreMessage(USER_NAME, cleanUserMessage);
        
        try {
            const commandHandler = require('./commandHandler');
            const commandResult = await commandHandler.handleCommand(cleanUserMessage, null, null);
            
            if (commandResult && commandResult.handled) {
                if (commandResult.comment) {
                    logConversationReply('나', `(사진명령어) ${commandResult.comment}`);
                    await safelyStoreMessage(BOT_NAME, commandResult.comment);
                }
                return commandResult;
            }
        } catch (error) {
            console.error('❌ [사진명령어] commandHandler 에러:', error.message);
        }
        
        // 폴백 응답
        const photoResponses = {
            '셀카줘': '아저씨~ 셀카 보내줄게! 잠깐만 기다려 ㅎㅎ',
            '컨셉사진줘': '컨셉 사진? 어떤 컨셉으로 보내줄까? ㅋㅋ',
            '추억사진줘': '우리 추억 사진 찾아서 보내줄게~ 기다려!',
            '커플사진줘': '커플 사진 보고 싶어? 바로 보내줄게 ㅎㅎ'
        };
        
        const photoResponse = photoResponses[cleanUserMessage];
        logConversationReply('나', `(사진명령어-직접) ${photoResponse}`);
        await safelyStoreMessage(BOT_NAME, photoResponse);
        
        return { type: 'text', comment: photoResponse };
    }

    // sulkyManager 처리
    let sulkyProcessingResult = null;
    
    if (sulkyManager && typeof sulkyManager.processUserMessage === 'function') {
        try {
            console.log('🔥 [sulkyManager] 밀당 상황 처리...');
            sulkyProcessingResult = await sulkyManager.processUserMessage(cleanUserMessage, null, null);
            
            if (sulkyProcessingResult && sulkyProcessingResult.context) {
                console.log('🔥 [sulkyManager] 밀당 맥락을 OpenAI 프롬프트에 포함 예정');
            }
            
        } catch (error) {
            console.error('❌ [sulkyManager] 처리 중 에러:', error.message);
        }
    }

    // commandHandler 호출
    try {
        const commandHandler = require('./commandHandler');
        const commandResult = await commandHandler.handleCommand(cleanUserMessage, null, null);
        
        if (commandResult && commandResult.handled) {
            console.log(`✅ commandHandler에서 처리됨: ${commandResult.type || 'unknown'}`);
            
            logConversationReply('아저씨', cleanUserMessage);
            await safelyStoreMessage(USER_NAME, cleanUserMessage);
            
            if (commandResult.comment) {
                logConversationReply('나', `(명령어) ${commandResult.comment}`);
                await safelyStoreMessage(BOT_NAME, commandResult.comment);
            }
            
            return commandResult;
        }
    } catch (error) {
        console.error('❌ commandHandler 호출 중 에러:', error.message);
    }

    // 새벽 시스템 처리
    try {
        const nightResponse = await nightWakeSystem.handleNightWakeMessage(cleanUserMessage);
        if (nightResponse) {
            logConversationReply('아저씨', cleanUserMessage);
            logConversationReply('나', `(새벽깨움) ${nightResponse.response}`);
            await safelyStoreMessage('아저씨', cleanUserMessage);
            await safelyStoreMessage('나', nightResponse.response);
            
            return { type: 'text', comment: nightResponse.response };
        }
    } catch (error) {
        console.error('❌ 새벽 응답 시스템 에러:', error);
    }

    // spontaneousYejin 특별 반응들
    try {
        if (spontaneousYejin && spontaneousYejin.detectStreetCompliment(cleanUserMessage)) {
            console.log('🌸 [특별반응] 길거리 칭찬 감지');
            logConversationReply('아저씨', cleanUserMessage);
            await safelyStoreMessage('아저씨', cleanUserMessage);
            await spontaneousYejin.sendYejinSelfieWithComplimentReaction(cleanUserMessage);
            const specialResponse = '히히 칭찬받았다고 증명해줄게! 방금 보낸 사진 봤어? ㅎㅎ';
            logConversationReply('나', `(칭찬셀카) ${specialResponse}`);
            await safelyStoreMessage('나', specialResponse);
            
            return { type: 'text', comment: specialResponse };
        }
    } catch (error) {
        console.error('❌ 길거리 칭찬 반응 에러:', error.message);
    }

    // 메시지 기본 처리 시작
    logConversationReply('아저씨', cleanUserMessage);
    updateEmotionFromMessage(cleanUserMessage);
    await safelyStoreMessage(USER_NAME, cleanUserMessage);

    // 🧠 모든 기억 + 상황 맥락 통합
    console.log(`🧠 [통합 맥락] 모든 기억 + 상황 맥락 통합 시작...`);
    
    // 1. 관련 기억들 가져오기
    const integratedMemory = await getIntegratedMemory(cleanUserMessage);
    
    // 2. 감정 상태 가져오기
    let emotionContext = '';
    try {
        const emotionalContextManager = require('./emotionalContextManager.js');
        const currentEmotion = await emotionalContextManager.getCurrentEmotionState();
        
        if (currentEmotion.menstrualPhase !== 'normal') {
            emotionContext += `\n현재 생리주기: ${currentEmotion.menstrualPhase} (${currentEmotion.cycleDay}일차)`;
            if (currentEmotion.isPeriodActive) {
                emotionContext += `\n생리 중이라서 몸이 아프고 예민한 상태야. 조금 더 애교 부리고 아저씨한테 달려고 하는 말투로 대답해줘.`;
            }
        }
        if (currentEmotion.currentEmotion !== 'normal') {
            emotionContext += `\n현재 감정: ${currentEmotion.currentEmotion} (강도: ${currentEmotion.emotionIntensity}/10)`;
        }
        if (currentEmotion.isSulky) {
            emotionContext += `\n지금 아저씨한테 삐져있는 상태야 (레벨: ${currentEmotion.sulkyLevel}). 삐지면서도 귀엽게 투정 부리는 말투로 대답해줘.`;
        }
    } catch (error) {
        console.warn('⚠️ 감정 상태 조회 실패:', error.message);
    }
    
    // 3. sulkyManager 밀당 상태 추가
    let pushPullContext = '';
    if (sulkyManager && typeof sulkyManager.getSulkinessState === 'function') {
        try {
            const sulkyState = sulkyManager.getSulkinessState();
            
            if (sulkyState.pushPullActive) {
                pushPullContext += `\n\n💕 [현재 밀당 중]: ${sulkyState.pushPullType}`;
                pushPullContext += `\n밀당 상황: 아저씨가 사과하거나 사랑 표현했지만, 예진이는 즉시 받아주지 않고 밀당 중`;
                pushPullContext += `\n예진이 마음: 상황에 맞게 자연스럽게 반응 (매번 다르게)`;
            }
            
            if (sulkyState.isSulky && !sulkyState.pushPullActive) {
                pushPullContext += `\n\n😤 [현재 삐짐 중]: 레벨 ${sulkyState.level} (이유: ${sulkyState.reason})`;
                pushPullContext += `\n삐짐 상황: 직설적으로 따지고 항의하는 말투로 대답해야 함`;
            }
            
            if (sulkyState.fightMode) {
                pushPullContext += `\n\n🥊 [현재 투닥거리기 중]: 레벨 ${sulkyState.fightLevel}`;
                pushPullContext += `\n투닥거리기 상황: 아저씨와 서로 화내며 맞받아치는 중. 더 세게 반박하고 방어적으로 대응`;
            }
            
        } catch (error) {
            console.error(`❌ sulkyManager 상태 조회 실패: ${error.message}`);
        }
    }
    
    // 4. sulkyManager의 상황별 맥락 추가
    let situationalContext = '';
    if (sulkyProcessingResult && sulkyProcessingResult.context) {
        const context = sulkyProcessingResult.context;
        
        situationalContext += `\n\n🎭 [현재 상황 맥락]:`;
        situationalContext += `\n상황: ${context.situation || 'unknown'}`;
        situationalContext += `\n감정: ${context.emotion || 'normal'}`;
        situationalContext += `\n관계 역학: ${context.relationship_dynamic || 'normal'}`;
        situationalContext += `\n내면 생각: ${context.inner_thought || ''}`;
        
        if (context.push_pull_type) {
            situationalContext += `\n밀당 타입: ${context.push_pull_type}`;
        }
        
        situationalContext += `\n\n🎯 [반응 지침]: 위 상황과 감정에 맞춰서 예진이답게 완전 자율적으로 반응해줘.`;
    }
    
    let modelContext = '';
    if (getCurrentModelSetting) {
        const currentModel = getCurrentModelSetting();
        if (currentModel === '3.5') {
            modelContext = '\n[모델설정] 현재 GPT-3.5 모드로 대화 중이야. 좀 더 간결하고 귀여운 말투로 대답해줘.';
        } else if (currentModel === '4.0') {
            modelContext = '\n[모델설정] 현재 GPT-4o 모드로 대화 중이야. 더 풍부하고 감정적인 표현으로 대답해줘.';
        } else if (currentModel === 'auto') {
            modelContext = '\n[모델설정] 자동 모드로 상황에 맞는 최적의 응답을 선택해서 대답해줘.';
        }
    }
    
    // 🌸 yejinPersonality 기반 동적 SystemPrompt 생성
    console.log(`🌸 [동적 SystemPrompt] yejinPersonality 연동으로 실시간 성격 반영...`);
    
    const contextData = {
        emotionContext,
        pushPullContext,
        situationalContext,
        detectedSituationsContext: '', // 템플릿 제거로 빈 값
        modelContext,
        integratedMemory
    };
    
    const dynamicSystemPrompt = generateDynamicSystemPrompt(cleanUserMessage, contextData);
    
    // 🧠 Memory Tape에서 최근 대화 맥락 추가
    console.log(`🧠 [Memory Tape] 최근 대화 맥락 추가...`);
    const recentContext = await getRecentConversationContext(30);
    
    // 메시지 배열 구성
    const messages = [
        { role: 'system', content: dynamicSystemPrompt },
        ...recentContext,
        { role: 'user', content: cleanUserMessage }
    ];
    
    console.log(`🧠 [완전 자율 반응] 총 ${messages.length}개 메시지로 OpenAI 호출`);
    console.log(`  🌸 yejinPersonality: ${yejinPersonalityInitialized ? '활성' : '비활성'}`);
    console.log(`  📼 Memory Tape: ${recentContext.length}개 대화`);
    console.log(`  🧠 통합기억: ${integratedMemory ? '포함됨' : '없음'}`);
    console.log(`  🔥 밀당상태: ${pushPullContext ? '활성' : '없음'}`);
    
    if (!dynamicSystemPrompt || typeof dynamicSystemPrompt !== 'string' || dynamicSystemPrompt.trim().length === 0) {
        console.error("❌ 동적 시스템 프롬프트가 비어있어서 기본 응답을 사용합니다.");
        const defaultReply = getEmergencyFallback();
        await safelyStoreMessage(BOT_NAME, defaultReply);
        logConversationReply('나', `(프롬프트에러폴백) ${defaultReply}`);
        return { type: 'text', comment: defaultReply };
    }

    try {
        console.log(`🚀 [OpenAI] yejinPersonality 기반 완전 자율적 응답 생성...`);
        
        const rawReply = await callOpenAI(messages);
        let finalReply = cleanReply(rawReply);
        finalReply = fixLanguageUsage(finalReply);
        
        if (!finalReply || finalReply.trim().length === 0) {
            console.error("❌ OpenAI 응답이 비어있음");
            const fallbackReply = getEmergencyFallback();
            await safelyStoreMessage(BOT_NAME, fallbackReply);
            logConversationReply('나', `(AI응답비어있음폴백) ${fallbackReply}`);
            return { type: 'text', comment: fallbackReply };
        }
        
        console.log(`✅ [OpenAI 응답] 완전 자율적 응답 생성 성공: "${finalReply.substring(0, 50)}..."`);
        
        await safelyStoreMessage(BOT_NAME, finalReply);
        logConversationReply('나', finalReply);
        
        return { type: 'text', comment: finalReply };
        
    } catch (error) {
        console.error("❌ OpenAI API 호출 중 에러 발생:", error);
        const apiErrorReply = Math.random() < 0.5 ? 
            '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' :
            '어? 나 지금 좀 멍하네... 아저씨 다시 말해주면 안 될까? ㅎㅎ';
        await safelyStoreMessage(BOT_NAME, apiErrorReply);
        logConversationReply('나', `(API에러폴백) ${apiErrorReply}`);
        
        return { type: 'text', comment: apiErrorReply };
    }
}

// 🧠 통합 기억 함수 (간소화)
async function getIntegratedMemory(userMessage) {
    console.log(`🧠 [통합 기억] "${userMessage}" 관련 기억 검색...`);
    
    let memoryContext = '';
    
    const fixedMemory = await getRelatedFixedMemory(userMessage);
    
    if (fixedMemory) {
        memoryContext += `\n\n🧠 [관련 기억들]:`;
        memoryContext += `\n\n💾 [고정 기억]: ${fixedMemory}`;
        memoryContext += `\n\n위 기억을 참고해서 예진이답게 자연스럽게 대답해줘.`;
        
        console.log(`✅ [통합 기억] 고정 기억 발견`);
    } else {
        console.log(`ℹ️ [통합 기억] "${userMessage}" 관련 기억 없음`);
    }
    
    return memoryContext;
}

module.exports = {
    getReplyByMessage,
    callOpenAI,
    generateDynamicSystemPrompt
};
