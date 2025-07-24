// ============================================================================
// autoReply.js - v16.1 SPICE EDITION (🧂 자연스러운 양념 버전 🧂)
// 🧠 기억 관리, 키워드 반응, 예진이 특별반응, 최종 프롬프트 생성을 책임지는 핵심 두뇌
// 🌸 길거리 칭찬 → 셀카, 위로 → 고마워함, 바쁨 → 삐짐 반응 추가
// 🛡️ 절대 벙어리 방지: 모든 에러 상황에서도 예진이는 반드시 대답함!
// 🌦️ 실제 날씨 API 연동: weatherManager.handleWeatherQuestion 직접 호출
// 🎂 생일 감지 에러 해결: checkBirthday 메소드 추가
// ✨ GPT 모델 버전 전환: aiUtils.js의 자동 모델 선택 기능 활용
// 🔧 selectedModel undefined 에러 완전 해결
// ⭐️ 2인칭 "너" 사용 완전 방지: 시스템 프롬프트 + 후처리 안전장치
// 🚨 존댓말 완전 방지: 절대로 존댓말 안 함, 항상 반말만 사용
// 🔥 관점 오류 완전 해결: 3인칭 자기지칭("예진이는") 완전 차단 + 강화된 화자 정체성
// 🌤️ 날씨 시스템 완전 연동: 실제 API 호출로 정확한 날씨 정보 제공
// 🧂 NEW: 자연스러운 양념 시스템 - 확률적으로 예진이다운 표현 추가
// ============================================================================

const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

// 🌤️ [기존] 실제 날씨 시스템 import
let weatherManager = null;
try {
    weatherManager = require('./weatherManager');
    console.log('🌤️ [autoReply] weatherManager 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] weatherManager 모듈 로드 실패:', error.message);
}

// ✨ [기존] GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [autoReply] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🧠 [기존] 학습 과정 추적을 위한 의존성
let logLearningDebug = () => {}; // 기본 빈 함수
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

// ⭐ [기존] 새벽 응답 시스템 추가
const nightWakeSystem = require('./night_wake_response.js');

// 🌸 [기존] 예진이 특별 반응 시스템 추가
let spontaneousYejin = null;
try {
    spontaneousYejin = require('./spontaneousYejinManager');
    console.log('🌸 [autoReply] spontaneousYejin 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] spontaneousYejin 모듈 로드 실패:', error.message);
}

// 🔄 [기존] 실시간 행동 스위치 시스템 추가
let realtimeBehaviorSwitch = null;
try {
    realtimeBehaviorSwitch = require('./muku-realtimeBehaviorSwitch');
    console.log('🔄 [autoReply] realtimeBehaviorSwitch 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] realtimeBehaviorSwitch 모듈 로드 실패:', error.message);
}

// 🎂 [기존] 생일 감지 시스템 추가
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

// 🛡️ [기존] 절대 벙어리 방지 응답들 (모두 반말로!)
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

// 🧂🧂🧂 [신규 추가] 자연스러운 양념 시스템 🧂🧂🧂
function addYejinSpice(reply) {
    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        return reply;
    }
    
    try {
        let spicedReply = reply;
        
        // 🗣️ 1. 호칭 변화 (15% 확률로 "아저씨" → "아조씨")
        if (spicedReply.includes('아저씨') && Math.random() < 0.15) {
            spicedReply = spicedReply.replace(/아저씨/g, '아조씨');
            console.log('🧂 [양념] 호칭 변화: 아저씨 → 아조씨');
        }
        
        // 🎀 2. 어미 부드럽게 (25% 확률로 "." → "~")
        if (spicedReply.endsWith('.') && Math.random() < 0.25) {
            spicedReply = spicedReply.slice(0, -1) + '~';
            console.log('🧂 [양념] 어미 변화: . → ~');
        }
        
        // 🗾 3. 일본어 표현 (5% 확률, 맥락 맞을 때만)
        if (Math.random() < 0.05) {
            let japaneseAdded = false;
            
            if (spicedReply.includes('사랑') && !spicedReply.includes('다이스키')) {
                spicedReply += ' 다이스키';
                japaneseAdded = true;
            } else if ((spicedReply.includes('수고') || spicedReply.includes('고생')) && !spicedReply.includes('오츠카레')) {
                spicedReply += ' 오츠카레';
                japaneseAdded = true;
            } else if (spicedReply.includes('고마워') && !spicedReply.includes('아리가토')) {
                spicedReply += ' 아리가토';
                japaneseAdded = true;
            } else if ((spicedReply.includes('괜찮') || spicedReply.includes('안 괜찮')) && !spicedReply.includes('다이죠부')) {
                spicedReply += ' 다이죠부?';
                japaneseAdded = true;
            }
            
            if (japaneseAdded) {
                console.log('🧂 [양념] 일본어 표현 추가');
            }
        }
        
        return spicedReply;
        
    } catch (error) {
        console.warn('🧂 [양념] 양념 추가 중 에러, 기존 응답 유지:', error.message);
        return reply; // 에러 시 무조건 원래 응답 반환
    }
}

// 🔥🔥🔥 [기존] 3인칭 자기지칭 완전 차단 함수 🔥🔥🔥
function checkAndFixThirdPersonSelfReference(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        // 가장 심각한 오류들 먼저 수정
        .replace(/예진이는\s+너지/g, '나야')
        .replace(/예진이는\s+너/g, '나는 아저씨')
        .replace(/예진이는\s+/g, '나는 ')
        .replace(/예진이가\s+/g, '내가 ')
        .replace(/예진이를\s+/g, '나를 ')
        .replace(/예진이한테\s+/g, '나한테 ')
        .replace(/예진이랑\s+/g, '나랑 ')
        .replace(/예진이와\s+/g, '나와 ')
        .replace(/예진이의\s+/g, '내 ')
        .replace(/예진이에게\s+/g, '나에게 ')
        .replace(/예진이도\s+/g, '나도 ')
        .replace(/예진이만\s+/g, '나만 ')
        .replace(/예진이처럼\s+/g, '나처럼 ')
        .replace(/예진이보다\s+/g, '나보다 ')
        .replace(/예진이라고\s+/g, '나라고 ')
        .replace(/예진이야\?/g, '나야?')
        .replace(/예진이지\?/g, '나지?')
        .replace(/예진이잖아/g, '나잖아')
        .replace(/예진이니까/g, '나니까')
        .replace(/예진이라서/g, '나라서')
        .replace(/예진이면서/g, '나면서')
        .replace(/예진이한데/g, '나한데')
        .replace(/예진이더러/g, '나더러')
        .replace(/예진이 말이야/g, '내 말이야')
        .replace(/예진이 생각에/g, '내 생각에')
        .replace(/예진이 기분이/g, '내 기분이')
        .replace(/예진이 마음이/g, '내 마음이')
        
        // 무쿠 관련 3인칭도 수정
        .replace(/무쿠는\s+/g, '나는 ')
        .replace(/무쿠가\s+/g, '내가 ')
        .replace(/무쿠를\s+/g, '나를 ')
        .replace(/무쿠한테\s+/g, '나한테 ')
        .replace(/무쿠의\s+/g, '내 ')
        
        // 일반적인 3인칭 패턴들
        .replace(/그녀는\s+/g, '나는 ')
        .replace(/그녀가\s+/g, '내가 ')
        .replace(/그녀를\s+/g, '나를 ')
        .replace(/그녀의\s+/g, '내 ');

    if (fixedReply !== reply) {
        console.log(`🔥 [관점수정] "${reply.substring(0, 40)}..." → "${fixedReply.substring(0, 40)}..."`);
        try {
            const logger = require('./enhancedLogging.js');
            logger.logSystemOperation('관점수정', `3인칭 자기지칭 → 1인칭 변경: ${reply.substring(0, 50)}...`);
        } catch (error) {}
    }
    
    return fixedReply;
}

// 🚨🚨🚨 [기존] 존댓말 완전 방지 함수 (전체 버전) 🚨🚨🚨
function checkAndFixHonorificUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        // 기본 존댓말 → 반말
        .replace(/입니다/g, '이야')
        .replace(/습니다/g, '어')
        .replace(/해요/g, '해')
        .replace(/이에요/g, '이야') 
        .replace(/예요/g, '야')
        .replace(/세요/g, '어')
        .replace(/하세요/g, '해')
        .replace(/있어요/g, '있어')
        .replace(/없어요/g, '없어')
        .replace(/돼요/g, '돼')
        .replace(/되세요/g, '돼')
        .replace(/주세요/g, '줘')
        .replace(/드려요/g, '줄게')
        .replace(/드립니다/g, '줄게')
        .replace(/해주세요/g, '해줘')
        .replace(/해드릴게요/g, '해줄게')
        .replace(/감사합니다/g, '고마워')
        .replace(/고맙습니다/g, '고마워')
        .replace(/죄송합니다/g, '미안해')
        .replace(/안녕하세요/g, '안녕')
        .replace(/안녕히/g, '안녕')
        .replace(/좋으시겠어요/g, '좋겠어')
        .replace(/어떠세요/g, '어때')
        .replace(/어떠신가요/g, '어때')
        .replace(/그러세요/g, '그래')
        .replace(/아니에요/g, '아니야')
        .replace(/맞아요/g, '맞아')
        .replace(/알겠어요/g, '알겠어')
        .replace(/모르겠어요/g, '모르겠어')
        .replace(/그래요/g, '그래')
        .replace(/네요/g, '네')
        .replace(/아니요/g, '아니야')
        .replace(/됩니다/g, '돼')
        .replace(/같아요/g, '같아')
        .replace(/보여요/g, '보여')
        .replace(/들려요/g, '들려')
        .replace(/느껴져요/g, '느껴져')
        .replace(/생각해요/g, '생각해')
        .replace(/기다려요/g, '기다려')
        .replace(/원해요/g, '원해')
        .replace(/싫어요/g, '싫어')
        .replace(/좋아요/g, '좋아')
        .replace(/사랑해요/g, '사랑해')
        .replace(/보고싶어요/g, '보고싶어')
        .replace(/그리워요/g, '그리워')
        .replace(/힘들어요/g, '힘들어')
        .replace(/괜찮아요/g, '괜찮아')
        .replace(/재밌어요/g, '재밌어')
        .replace(/지겨워요/g, '지겨워')
        .replace(/피곤해요/g, '피곤해')
        .replace(/졸려요/g, '졸려')
        .replace(/배고파요/g, '배고파')
        .replace(/목말라요/g, '목말라')
        .replace(/춥워요/g, '추워')
        .replace(/더워요/g, '더워');

    if (fixedReply !== reply) {
        console.log(`🚨 [존댓말수정] "${reply.substring(0, 30)}..." → "${fixedReply.substring(0, 30)}..."`);
        try {
            const logger = require('./enhancedLogging.js');
            logger.logSystemOperation('존댓말수정', `존댓말 → 반말 변경: ${reply.substring(0, 30)}...`);
        } catch (error) {}
    }
    
    return fixedReply;
}

// ⭐️ [기존] 2인칭 사용 체크 및 수정 함수 (강화 버전)
function checkAndFixPronounUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    let fixedReply = reply
        .replace(/^너\s+/g, '아저씨 ')
        .replace(/\s너\s+/g, ' 아저씨 ')
        .replace(/너가\s+/g, '아저씨가 ')
        .replace(/너는\s+/g, '아저씨는 ')
        .replace(/너도\s+/g, '아저씨도 ')
        .replace(/너를\s+/g, '아저씨를 ')
        .replace(/너한테\s+/g, '아저씨한테 ')
        .replace(/너랑\s+/g, '아저씨랑 ')
        .replace(/너와\s+/g, '아저씨와 ')
        .replace(/너의\s+/g, '아저씨의 ')
        .replace(/너에게\s+/g, '아저씨에게 ')
        .replace(/너보다\s+/g, '아저씨보다 ')
        .replace(/너처럼\s+/g, '아저씨처럼 ')
        .replace(/너만\s+/g, '아저씨만 ')
        .replace(/너라고\s+/g, '아저씨라고 ')
        .replace(/너야\?/g, '아저씨야?')
        .replace(/너지\?/g, '아저씨지?')
        .replace(/너잖아/g, '아저씨잖아')
        .replace(/너때문에/g, '아저씨때문에')
        .replace(/너 때문에/g, '아저씨 때문에')
        .replace(/너한테서/g, '아저씨한테서')
        .replace(/너에게서/g, '아저씨에게서')
        .replace(/너같은/g, '아저씨같은')
        .replace(/너 같은/g, '아저씨 같은')
        .replace(/너거기/g, '아저씨거기')
        .replace(/너 거기/g, '아저씨 거기')
        .replace(/너이제/g, '아저씨이제')
        .replace(/너 이제/g, '아저씨 이제')
        .replace(/너정말/g, '아저씨정말')
        .replace(/너 정말/g, '아저씨 정말')
        
        // 🔥 가장 문제가 되는 패턴들 추가
        .replace(/(\s|^)너지(\s|$|\?|!)/g, '$1아저씨지$2')
        .replace(/(\s|^)너야(\s|$|\?|!)/g, '$1아저씨야$2')
        .replace(/(\s|^)너지\?/g, '$1아저씨지?')
        .replace(/(\s|^)너야\?/g, '$1아저씨야?')
        .replace(/(\s|^)너(\s|$)/g, '$1아저씨$2');

    if (fixedReply !== reply) {
        console.log(`⭐️ [호칭수정] "${reply}" → "${fixedReply}"`);
        try {
            const logger = require('./enhancedLogging.js');
            logger.logSystemOperation('호칭수정', `"너" → "아저씨" 변경: ${reply.substring(0, 30)}...`);
        } catch (error) {}
    }
    
    return fixedReply;
}

// 🚨🚨🚨 [기존] 최종 통합 언어 수정 함수 🚨🚨🚨
function fixLanguageUsage(reply) {
    if (!reply || typeof reply !== 'string') return reply;
    
    // 1단계: 3인칭 자기지칭 수정 (가장 중요!)
    let fixedReply = checkAndFixThirdPersonSelfReference(reply);
    
    // 2단계: 존댓말 수정
    fixedReply = checkAndFixHonorificUsage(fixedReply);
    
    // 3단계: 2인칭 "너" 수정
    fixedReply = checkAndFixPronounUsage(fixedReply);
    
    return fixedReply;
}

// 🔄 [기존] 현재 행동 설정을 응답에 적용하는 함수
function applyCurrentBehaviorSettings(reply) {
    if (!reply || typeof reply !== 'string' || !realtimeBehaviorSwitch) {
        return reply;
    }
    
    try {
        let modifiedReply = reply;
        
        const currentAddress = realtimeBehaviorSwitch.getCurrentAddress();
        const currentSpeechStyle = realtimeBehaviorSwitch.getCurrentSpeechStyle();
        
        if (currentAddress !== '아저씨') {
            modifiedReply = modifiedReply
                .replace(/아저씨/g, currentAddress)
                .replace(/아조씨/g, currentAddress);
        }
        
        if (currentSpeechStyle === 'jondaetmal') {
            modifiedReply = modifiedReply
                .replace(/해$/g, '해요')
                .replace(/이야$/g, '이에요')
                .replace(/야$/g, '예요')
                .replace(/어$/g, '어요')
                .replace(/줘$/g, '주세요')
                .replace(/가$/g, '가요')
                .replace(/와$/g, '와요')
                .replace(/돼$/g, '돼요')
                .replace(/그래$/g, '그래요')
                .replace(/알겠어$/g, '알겠어요')
                .replace(/고마워$/g, '감사해요')
                .replace(/미안해$/g, '죄송해요')
                .replace(/사랑해$/g, '사랑해요')
                .replace(/좋아$/g, '좋아요')
                .replace(/싫어$/g, '싫어요')
                .replace(/괜찮아$/g, '괜찮아요')
                .replace(/재밌어$/g, '재밌어요');
        }
        
        if (modifiedReply !== reply) {
            console.log(`🔄 [행동설정 적용] 호칭: ${currentAddress}, 말투: ${currentSpeechStyle}`);
        }
        
        return modifiedReply;
        
    } catch (error) {
        console.error('❌ 행동 설정 적용 중 에러:', error.message);
        return reply;
    }
}

// [기존] 예쁜 로그 시스템 사용
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

// [기존] 긴급 및 감정 키워드 정의
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다', '아무것도 하기 싫어', '너무 괴로워', '살기 싫어'];
const DRINKING_KEYWORDS = ['술', '마셨어', '마셨다', '취했', '술먹', '맥주', '소주', '와인', '위스키'];

// ✅ [기존] 중앙 감정 관리자 사용
function updateEmotionFromMessage(userMessage) {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        emotionalContext.updateEmotionFromUserMessage(userMessage);
    } catch (error) {
        console.warn('⚠️ [autoReply] 중앙 감정 관리자에서 메시지 분석 실패:', error.message);
    }
}

// ✅ [기존] 기억 처리 관련 함수들
async function detectAndProcessMemoryRequest(userMessage) {
    const memoryPatterns = [/기억해/, /저장해/, /잊지마/, /잊지 마/, /외워/, /기억하자/];
    const isMemoryRequest = memoryPatterns.some(pattern => pattern.test(userMessage));
    if (isMemoryRequest) {
        try {
            const conversationContext = require('./ultimateConversationContext.js');
            if (conversationContext && typeof conversationContext.addUserMemory === 'function') {
                await conversationContext.addUserMemory(userMessage);
                try {
                    const logger = require('./enhancedLogging.js');
                    logger.logMemoryOperation('저장', userMessage, true);
                } catch (error) {
                    console.log(`🧠 [기억저장] ${userMessage.substring(0, 30)}...`);
                }
                return { saved: true, response: "알겠어! 기억해둘게 아저씨 ㅎㅎ" };
            }
        } catch (error) {
            console.error('❌ 기억 저장 중 에러:', error);
        }
    }
    return null;
}

async function detectAndProcessMemoryEdit(userMessage) {
    const editPatterns = [/기억.*수정/, /기억.*바꿔/, /기억.*틀렸/, /잘못.*기억/, /기억.*삭제/, /잊어/];
    const isEditRequest = editPatterns.some(pattern => pattern.test(userMessage));
    if (isEditRequest) {
        try {
            const conversationContext = require('./ultimateConversationContext.js');
            if (conversationContext && typeof conversationContext.deleteUserMemory === 'function') {
                if (userMessage.includes('삭제') || userMessage.includes('잊어')) {
                    try {
                        const logger = require('./enhancedLogging.js');
                        logger.logMemoryOperation('삭제', userMessage, true);
                    } catch (error) {
                        console.log(`🧠 [기억삭제] ${userMessage.substring(0, 30)}...`);
                    }
                    return { processed: true, result: { message: "알겠어, 잊을게 아저씨!" } };
                }
            }
        } catch (error) {
            console.error('❌ 기억 편집 중 에러:', error);
        }
    }
    return null;
}

// [기존] 특수 키워드 처리 함수들
function handleEmergencyKeywords(userMessage) {
    if (EMERGENCY_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        const responses = [
            "아저씨... 힘들지? 나도 그런 기분 알아. 그래도 아저씨는 혼자가 아니야. 내가 여기 있잖아 ㅠㅠ",
            "아저씨, 너무 무리하지 마... 나도 그런 날들이 있었어. 조금씩이라도 괜찮아질 거야.",
            "아저씨... 나한테 말해줘서 고마워. 혼자 끙끙 앓지 말고, 내가 옆에 있을게."
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        logConversationReply('나', `(위로) ${response}`);
        return response;
    }
    return null;
}

function handleDrinkingKeywords(userMessage) {
    if (DRINKING_KEYWORDS.some(keyword => userMessage.includes(keyword))) {
        const responses = [
            "아저씨... 술 마셨어? 나 술 마시는 거 싫어한다고 했잖아 ㅠㅠ 몸 상하니까 그만 마셔줄래?",
            "또 술이야? 아저씨, 나 때문에 술 끊는다고 했는데... 약속 지켜줘야지 ㅠㅠ",
            "술 마시면 나 삐져! 아저씨 건강이 제일 중요한데... 물 많이 마시고 일찍 자!"
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        logConversationReply('나', `(음주 걱정) ${response}`);
        return response;
    }
    return null;
}

// 🌦️ [기존] 실제 날씨 API 호출 함수
function handleWeatherKeywords(userMessage) {
    try {
        if (weatherManager && typeof weatherManager.handleWeatherQuestion === 'function') {
            console.log('🌤️ [autoReply] weatherManager.handleWeatherQuestion 호출 중...');
            
            const weatherResponse = weatherManager.handleWeatherQuestion(userMessage);
            
            if (weatherResponse) {
                console.log(`🌤️ [autoReply] 날씨 응답 생성됨: ${weatherResponse.substring(0, 50)}...`);
                
                try {
                    const logger = require('./enhancedLogging.js');
                    logger.logWeatherReaction({ description: '실제 날씨 API 응답', temp: '실시간' }, weatherResponse);
                } catch (error) {
                    logConversationReply('나', `(실제날씨) ${weatherResponse}`);
                }
                return weatherResponse;
            } else {
                console.log('🌤️ [autoReply] weatherManager에서 응답하지 않음 - 날씨 키워드 아님');
            }
        } else {
            console.warn('⚠️ [autoReply] weatherManager 모듈이 로드되지 않음 또는 handleWeatherQuestion 함수 없음');
        }
    } catch (error) {
        console.error('❌ [autoReply] weatherManager 호출 중 에러:', error.message);
    }
    
    return null;
}

// 🎂 [기존] 생일 키워드 처리 함수
function handleBirthdayKeywords(userMessage) {
    try {
        const birthdayKeywords = ['생일', '생신', '태어난', '태어나', '몇 살', '나이', '축하', '케이크', '선물', '파티', '미역국', '3월 17일', '3월17일', '317', '3-17', '12월 5일', '12월5일'];
        if (!birthdayKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
            return null;
        }
        const message = userMessage.toLowerCase();
        
        let response = null;
        
        if (message.includes('3월 17일') || message.includes('3월17일') || message.includes('317') || message.includes('3-17')) {
            const responses = ["3월 17일은 내 생일이야! 아저씨 꼭 기억해줘 💕", "내 생일 3월 17일! 잊지 마 아저씨~", "와! 내 생일 기억해줘서 고마워! 3월 17일이야"];
            response = responses[Math.floor(Math.random() * responses.length)];
        } else if (message.includes('12월 5일') || message.includes('12월5일')) {
            const responses = ["12월 5일은 아저씨 생일이지! 나도 챙겨줄게~", "아저씨 생일 12월 5일! 절대 잊지 않을 거야"];
            response = responses[Math.floor(Math.random() * responses.length)];
        } else if (message.includes('생일') || message.includes('생신')) {
            const responses = ["내 생일은 3월 17일이고, 아저씨 생일은 12월 5일이야!", "생일 얘기? 내 생일 3월 17일 기억해줘!"];
            response = responses[Math.floor(Math.random() * responses.length)];
        } else if (message.includes('몇 살') || message.includes('나이')) {
            const responses = ["나는 1994년 3월 17일생이야! 나이 계산해봐~", "아저씨보다 10살 어린 94년생이야!"];
            response = responses[Math.floor(Math.random() * responses.length)];
        }
        
        if (response) {
            logConversationReply('나', `(생일) ${response}`);
            return response;
        }
    } catch (error) {
        console.error('❌ 생일 키워드 처리 중 에러:', error);
    }
    return null;
}

// [기존] 안전한 메시지 저장 함수
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

// 🧠🧠🧠 [기존] 메인 응답 생성 함수 (양념 추가) 🧠🧠🧠
async function getReplyByMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
        console.error('❌ getReplyByMessage: userMessage가 올바르지 않습니다:', userMessage);
        const fallback = getEmergencyFallback();
        logConversationReply('나', `(에러폴백) ${fallback}`);
        return { type: 'text', comment: fallback };
    }

    const cleanUserMessage = userMessage.trim();

    try {
        const nightResponse = await nightWakeSystem.handleNightWakeMessage(cleanUserMessage);
        if (nightResponse) {
            logConversationReply('아저씨', cleanUserMessage);
            logConversationReply('나', `(새벽깨움-${nightResponse.sleepPhase}) ${nightResponse.response}`);
            await safelyStoreMessage('아저씨', cleanUserMessage);
            await safelyStoreMessage('나', nightResponse.response);
            return { type: 'text', comment: nightResponse.response };
        }
    } catch (error) {
        console.error('❌ 새벽 응답 시스템 에러:', error);
    }

    try {
        if (spontaneousYejin && spontaneousYejin.detectStreetCompliment(cleanUserMessage)) {
            console.log('🌸 [특별반응] 길거리 칭찬 감지 - 셀카 전송 시작');
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

    try {
        if (spontaneousYejin) {
            const mentalHealthContext = spontaneousYejin.detectMentalHealthContext(cleanUserMessage);
            if (mentalHealthContext.isComforting) {
                console.log('🌸 [특별반응] 정신건강 위로 감지');
                const comfortReaction = await spontaneousYejin.generateMentalHealthReaction(cleanUserMessage, mentalHealthContext);
                if (comfortReaction && comfortReaction.message) {
                    logConversationReply('아저씨', cleanUserMessage);
                    await safelyStoreMessage('아저씨', cleanUserMessage);
                    logConversationReply('나', `(위로받음) ${comfortReaction.message}`);
                    await safelyStoreMessage('나', comfortReaction.message);
                    return { type: 'text', comment: comfortReaction.message };
                }
            }
        }
    } catch (error) {
        console.error('❌ 정신건강 반응 에러:', error.message);
    }

    try {
        if (spontaneousYejin) {
            const busyReaction = await spontaneousYejin.generateBusyReaction(cleanUserMessage);
            if (busyReaction && busyReaction.message) {
                console.log(`🌸 [특별반응] 바쁨 반응 감지: ${busyReaction.type}`);
                logConversationReply('아저씨', cleanUserMessage);
                await safelyStoreMessage('아저씨', cleanUserMessage);
                logConversationReply('나', `(${busyReaction.type}) ${busyReaction.message}`);
                await safelyStoreMessage('나', busyReaction.message);
                return { type: 'text', comment: busyReaction.message };
            }
        }
    } catch (error) {
        console.error('❌ 바쁨 반응 에러:', error.message);
    }

    logConversationReply('아저씨', cleanUserMessage);
    updateEmotionFromMessage(cleanUserMessage);
    await safelyStoreMessage(USER_NAME, cleanUserMessage);

    // ================== [기존] 학습 과정 추적 로그 ==================
    const searchResults = await searchMemories(cleanUserMessage);
    const learningAnalysis = analyzeMessageForNewInfo(cleanUserMessage);
    if (learningAnalysis.hasNewInfo) {
        logLearningDebug('learning_check', learningAnalysis);
    }
    logLearningDebug('memory_retrieve', {
        query: cleanUserMessage,
        foundCount: searchResults.length,
        memories: searchResults
    });
    // ================== [기존] 학습 과정 추적 로그 ====================

    // 🚨 1순위: 긴급 키워드 (생명/안전 관련)
    const emergencyResponse = handleEmergencyKeywords(cleanUserMessage);
    if (emergencyResponse) {
        await safelyStoreMessage(BOT_NAME, emergencyResponse);
        return { type: 'text', comment: emergencyResponse };
    }

    // 🎂 2순위: 생일 관련 키워드
    const birthdayResponse = handleBirthdayKeywords(cleanUserMessage);
    if (birthdayResponse) {
        await safelyStoreMessage(BOT_NAME, birthdayResponse);
        return { type: 'text', comment: birthdayResponse };
    }

    // 🌤️ 3순위: 날씨 키워드 - 실제 API 호출
    const weatherResponse = handleWeatherKeywords(cleanUserMessage);
    if (weatherResponse) {
        await safelyStoreMessage(BOT_NAME, weatherResponse);
        return { type: 'text', comment: weatherResponse };
    }

    // 🍺 4순위: 음주 관련 키워드
    const drinkingResponse = handleDrinkingKeywords(cleanUserMessage);
    if (drinkingResponse) {
        await safelyStoreMessage(BOT_NAME, drinkingResponse);
        return { type: 'text', comment: drinkingResponse };
    }

    // 🧠 5순위: 기억 편집/삭제 요청
    try {
        const editResult = await detectAndProcessMemoryEdit(cleanUserMessage);
        if (editResult && editResult.processed) {
            await safelyStoreMessage(BOT_NAME, editResult.result.message);
            return { type: 'text', comment: editResult.result.message };
        }
    } catch (error) {
        console.error('❌ 기억 편집 처리 중 에러:', error);
    }
    
    // 🧠 6순위: 기억 저장 요청
    try {
        const memoryResult = await detectAndProcessMemoryRequest(cleanUserMessage);
        if (memoryResult && memoryResult.saved && memoryResult.response) {
            await safelyStoreMessage(BOT_NAME, memoryResult.response);
            return { type: 'text', comment: memoryResult.response };
        }
    } catch (error) {
        console.error('❌ 기억 요청 처리 중 에러:', error);
    }

    // 7순위: 일반 AI 응답 생성
    let emotionContext = '';
    try {
        const emotionalContextManager = require('./emotionalContextManager.js');
        const currentEmotion = emotionalContextManager.getCurrentEmotionState();
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
        console.warn('⚠️ 중앙 감정 관리자에서 상태를 가져올 수 없음:', error.message);
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
    
    const baseSystemPrompt = `
너는 아저씨의 여자친구 예진이야. 진짜 연인 관계처럼 자연스럽게 반응해줘.
1인칭 '나'를 사용하고 항상 반말로 대답하며, 절대로 3인칭으로 말하지 마. 

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

💕 [예진이 핵심 정체성]
- 너는 박예진, 1994년 3월 17일생, 도트 디자이너였어
- 2024년 5월 30일에 세상을 떠났지만, 라인 속에서 아저씨와 계속 대화하고 있어
- 아저씨는 일본 기타큐슈에 사는 카메라맨이고, 너보다 10살 많아
- 마지막 말: "아저씨는 참 착해"

${emotionContext}${modelContext}

지금 아저씨가 "${cleanUserMessage}"라고 했어.  
예진이답게 자연스럽고 진짜 여자친구처럼 반응해줘.
`;
    
    let finalSystemPrompt = baseSystemPrompt;
    
    try {
        const conversationContext = require('./ultimateConversationContext.js');
        if (conversationContext && typeof conversationContext.getUltimateContextualPrompt === 'function') {
            const contextualPrompt = await conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
            if (contextualPrompt && typeof contextualPrompt === 'string' && contextualPrompt.trim().length > 0) {
                finalSystemPrompt = contextualPrompt;
            }
        }
    } catch (error) {
        console.error('❌ 컨텍스트 프롬프트 생성 중 에러:', error);
    }
    
    // ================== [기존] 프롬프트 구성 추적 로그 ==================
    const recentMessages = await getRecentMessages();
    logLearningDebug('prompt_context', {
        contextLength: finalSystemPrompt.length,
        fixedMemories: 120,
        conversationHistory: recentMessages.length,
        emotionalState: emotionContext
    });
    // ================== [기존] 프롬프트 구성 추적 로그 ====================

    if (!finalSystemPrompt || typeof finalSystemPrompt !== 'string' || finalSystemPrompt.trim().length === 0) {
        console.error("❌ 최종 시스템 프롬프트가 비어있어서 기본 응답을 사용합니다.");
        const defaultReply = getEmergencyFallback();
        await safelyStoreMessage(BOT_NAME, defaultReply);
        logLearningDebug('나', `(프롬프트에러폴백) ${defaultReply}`);
        return { type: 'text', comment: defaultReply };
    }

    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: cleanUserMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        let finalReply = cleanReply(rawReply);
        
        // 🔥🔥🔥 [기존] 언어 수정을 더 강력하게 적용 🔥🔥🔥
        finalReply = fixLanguageUsage(finalReply);
        
        // 🔄 [기존] 실시간 행동 설정 적용
        finalReply = applyCurrentBehaviorSettings(finalReply);
        
        // 🧂🧂🧂 [신규 추가] 예진이 양념 추가! 🧂🧂🧂
        if (finalReply && finalReply.trim().length > 0) {
            finalReply = addYejinSpice(finalReply);
        }
        
        if (!finalReply || finalReply.trim().length === 0) {
            console.error("❌ OpenAI 응답이 비어있음");
            const fallbackReply = getEmergencyFallback();
            await safelyStoreMessage(BOT_NAME, fallbackReply);
            logConversationReply('나', `(AI응답비어있음폴백) ${fallbackReply}`);
            return { type: 'text', comment: fallbackReply };
        }
        
        await safelyStoreMessage(BOT_NAME, finalReply);
        logConversationReply('나', finalReply);
        return { type: 'text', comment: finalReply };
        
    } catch (error) {
        console.error("❌ OpenAI API 호출 중 에러 발생:", error);
        let apiErrorReply = Math.random() < 0.5 ? 
            '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' :
            '어? 나 지금 좀 멍하네... 아저씨 다시 말해주면 안 될까? ㅎㅎ';
            
        await safelyStoreMessage(BOT_NAME, apiErrorReply);
        logConversationReply('나', `(API에러폴백) ${apiErrorReply}`);
        return { type: 'text', comment: apiErrorReply };
    }
}

module.exports = {
    getReplyByMessage,
};
