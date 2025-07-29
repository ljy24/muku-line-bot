// ============================================================================
// autoReply.js - v15.5 (관련 기억 검색 기능 추가)
// 🧠 기억 관리, 키워드 반응, 예진이 특별반응, 최종 프롬프트 생성을 책임지는 핵심 두뇌
// 🌸 길거리 칭찬 → 셀카, 위로 → 고마워함, 바쁨 → 삐짐 반응 추가
// 🛡️ 절대 벙어리 방지: 모든 에러 상황에서도 예진이는 반드시 대답함!
// 🌦️ 날씨 오인식 해결: "빔비" 같은 글자에서 '비' 감지 안 함
// 🎂 생일 감지 에러 해결: checkBirthday 메소드 추가
// ✨ GPT 모델 버전 전환: aiUtils.js의 자동 모델 선택 기능 활용
// 🔧 selectedModel undefined 에러 완전 해결
// ⭐️ 2인칭 "너" 사용 완전 방지: 시스템 프롬프트 + 후처리 안전장치
// 🚨 존댓말 완전 방지: 절대로 존댓말 안 함, 항상 반말만 사용
// 🆕 NEW: commandHandler 호출 추가 - "셀카줘", "컨셉사진줘", "추억사진줘" 명령어 지원!
// 💕 NEW: 애정표현 우선처리 - "사랑해"를 위로가 아닌 애정표현으로 올바르게 인식!
// 🧠 NEW: 안전한 맥락 시스템 연동 - 실패해도 기존 기능 100% 보장!
// 🔍 NEW: 관련 기억 검색 시스템 - 실제 과거 대화에서 관련 내용 검색하여 자연스러운 기억 연상!
// ============================================================================

const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

// 🧠 [NEW] 안전한 맥락 엔진 연동
let contextEngine = null;
try {
    contextEngine = require('./muku-contextEngine');
    console.log('🧠 [autoReply] 맥락 엔진 연동 성공 - 똑똑한 대화 시작!');
} catch (error) {
    console.log('⚠️ [autoReply] 맥락 엔진 없음 - 기본 모드로 작동');
    console.warn('맥락 엔진 로드 실패:', error.message);
}

// 🔍 [NEW] Redis 클라이언트 연동 (Memory Tape 검색용)
let redisClient = null;
try {
    const redis = require('redis');
    redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    });
    console.log('🔍 [autoReply] Redis 클라이언트 연동 성공 - 기억 검색 준비 완료');
} catch (error) {
    console.warn('⚠️ [autoReply] Redis 클라이언트 연동 실패:', error.message);
}

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [autoReply] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// 🧠 [추가] 학습 과정 추적을 위한 의존성
let logLearningDebug = () => {}; // 기본 빈 함수
let analyzeMessageForNewInfo = () => ({ hasNewInfo: false });
let searchMemories = async () => [];
let getRecentMessages = async () => [];
try {
    // enhancedLogging에서 로그 함수 가져오기 (가정)
    const enhancedLogging = require('./enhancedLogging');
    logLearningDebug = enhancedLogging.logLearningDebug || logLearningDebug;

    // ultimateContext에서 분석 및 검색 함수 가져오기 (가정)
    const ultimateContext = require('./ultimateConversationContext');
    analyzeMessageForNewInfo = ultimateContext.analyzeMessageForNewInfo || analyzeMessageForNewInfo;
    searchMemories = ultimateContext.searchMemories || searchMemories;
    getRecentMessages = ultimateContext.getRecentMessages || getRecentMessages;
} catch(error) {
    console.warn('⚠️ [autoReply] 학습 추적 모듈 연동 실패:', error.message);
}

// ⭐ 새벽 응답 시스템 추가
const nightWakeSystem = require('./night_wake_response.js');

// 🌸 예진이 특별 반응 시스템 추가
let spontaneousYejin = null;
try {
    spontaneousYejin = require('./spontaneousYejinManager');
    console.log('🌸 [autoReply] spontaneousYejin 모듈 로드 성공');
} catch (error) {
    console.warn('⚠️ [autoReply] spontaneousYejin 모듈 로드 실패:', error.message);
}

// 🎂 생일 감지 시스템 추가
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

// 🛡️ 절대 벙어리 방지 응답들 (모두 반말로!)
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

// 🔍🔍🔍 [NEW] 관련 기억 검색 시스템 - 실제 과거 대화에서 관련 내용 검색 🔍🔍🔍
async function getRelevantConversationHistory(userMessage) {
    try {
        if (!redisClient) {
            console.log('🔍 [기억검색] Redis 클라이언트 없음 - 검색 불가');
            return [];
        }

        // 키워드 추출 (간단한 방식으로 시작)
        const keywords = extractKeywords(userMessage);
        console.log(`🔍 [기억검색] 키워드 추출: ${keywords.join(', ')}`);

        if (keywords.length === 0) {
            console.log('🔍 [기억검색] 키워드 없음 - 최근 대화 몇 개만 포함');
            return await getRecentConversationsForContext(3);
        }

        let relevantConversations = [];

        // 각 키워드별로 관련 대화 검색
        for (const keyword of keywords) {
            const conversations = await searchConversationsByKeyword(keyword);
            relevantConversations.push(...conversations);
        }

        // 중복 제거 및 시간순 정렬
        relevantConversations = removeDuplicateConversations(relevantConversations);
        relevantConversations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // 너무 많으면 최신 것들만 선택 (10개 정도로 제한)
        if (relevantConversations.length > 10) {
            relevantConversations = relevantConversations.slice(-10);
        }

        console.log(`🔍 [기억검색] 관련 대화 ${relevantConversations.length}개 발견`);

        // OpenAI 형식으로 변환
        return convertToOpenAIFormat(relevantConversations);

    } catch (error) {
        console.error('❌ [기억검색] 검색 중 에러:', error.message);
        // 에러 발생시 최근 대화 몇 개라도 포함
        return await getRecentConversationsForContext(3);
    }
}

// 🔍 키워드 추출 함수
function extractKeywords(message) {
    const keywords = [];
    
    // 명사/고유명사 추출 (간단한 패턴)
    const importantWords = [
        '하카타', '기타큐슈', '일본', '한국', '서울', '부산',
        '컨셉', '사진', '촬영', '모델', '카메라',
        '어제', '오늘', '내일', '지난번', '그때',
        '피곤', '힘들', '우울', '행복', '기뻐',
        '담배', '술', '커피', '음식', '밥',
        '날씨', '비', '눈', '더워', '추워',
        '생일', '3월', '12월', '선물',
        '사랑', '보고싶', '그리워', '미안', '고마워'
    ];

    for (const word of importantWords) {
        if (message.includes(word)) {
            keywords.push(word);
        }
    }

    // 시간 관련 키워드 특별 처리
    if (message.includes('어제')) {
        const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
        keywords.push(yesterday);
    }
    if (message.includes('오늘')) {
        const today = moment().format('YYYY-MM-DD');
        keywords.push(today);
    }

    return [...new Set(keywords)]; // 중복 제거
}

// 🔍 키워드로 대화 검색
async function searchConversationsByKeyword(keyword) {
    try {
        const conversations = [];
        
        // Memory Tape에서 검색 (일별 키 패턴)
        const datePattern = 'muku:conversation:daily:*';
        const keys = await redisClient.keys(datePattern);
        
        for (const key of keys) {
            const dailyConversations = await redisClient.lrange(key, 0, -1);
            
            for (const conversationStr of dailyConversations) {
                try {
                    const conversation = JSON.parse(conversationStr);
                    
                    // 메시지 내용에 키워드가 포함된 경우
                    if (conversation.userMessage && conversation.userMessage.includes(keyword)) {
                        conversations.push({
                            timestamp: conversation.timestamp,
                            userMessage: conversation.userMessage,
                            aiMessage: conversation.aiMessage,
                            source: 'user'
                        });
                    }
                    
                    if (conversation.aiMessage && conversation.aiMessage.includes(keyword)) {
                        conversations.push({
                            timestamp: conversation.timestamp,
                            userMessage: conversation.userMessage,
                            aiMessage: conversation.aiMessage,
                            source: 'ai'
                        });
                    }
                } catch (parseError) {
                    // JSON 파싱 실패는 조용히 넘어감
                }
            }
        }
        
        return conversations.slice(-5); // 최신 5개만
        
    } catch (error) {
        console.error(`❌ [기억검색] ${keyword} 검색 실패:`, error.message);
        return [];
    }
}

// 🔍 최근 대화 가져오기 (컨텍스트용)
async function getRecentConversationsForContext(limit = 3) {
    try {
        const today = moment().format('YYYY-MM-DD');
        const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
        
        const conversations = [];
        
        // 오늘과 어제 대화 확인
        for (const date of [today, yesterday]) {
            const key = `muku:conversation:daily:${date}`;
            const dailyConversations = await redisClient.lrange(key, -limit, -1);
            
            for (const conversationStr of dailyConversations) {
                try {
                    const conversation = JSON.parse(conversationStr);
                    conversations.push(conversation);
                } catch (parseError) {
                    // 조용히 넘어감
                }
            }
        }
        
        return conversations.slice(-limit);
        
    } catch (error) {
        console.error('❌ [기억검색] 최근 대화 가져오기 실패:', error.message);
        return [];
    }
}

// 🔍 중복 대화 제거
function removeDuplicateConversations(conversations) {
    const seen = new Set();
    return conversations.filter(conv => {
        const key = `${conv.timestamp}-${conv.userMessage}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// 🔍 OpenAI 형식으로 변환
function convertToOpenAIFormat(conversations) {
    const messages = [];
    
    for (const conv of conversations) {
        if (conv.userMessage) {
            messages.push({
                role: 'user',
                content: conv.userMessage
            });
        }
        
        if (conv.aiMessage) {
            messages.push({
                role: 'assistant', 
                content: conv.aiMessage
            });
        }
    }
    
    return messages;
}

// 🚨🚨🚨 [긴급 추가] 존댓말 완전 방지 함수 (전체 버전) 🚨🚨🚨
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
        .replace(/말씀해주세요/g, '말해줘')
        .replace(/말씀드리면/g, '말하면')
        .replace(/말씀드릴게요/g, '말해줄게')
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
        .replace(/더워요/g, '더워')
        .replace(/더우세요/g, '더워')
        .replace(/추우세요/g, '추워')
        .replace(/가세요/g, '가')
        .replace(/오세요/g, '와')
        .replace(/계세요/g, '있어')
        .replace(/계십니다/g, '있어')
        .replace(/있으세요/g, '있어')
        .replace(/없으세요/g, '없어')
        .replace(/드세요/g, '먹어')
        .replace(/잡수세요/g, '먹어')
        .replace(/주무세요/g, '자')
        .replace(/일어나세요/g, '일어나')
        .replace(/앉으세요/g, '앉아')
        .replace(/서세요/g, '서')
        .replace(/보세요/g, '봐')
        .replace(/들어보세요/g, '들어봐')
        .replace(/생각해보세요/g, '생각해봐')
        .replace(/기억하세요/g, '기억해')
        .replace(/알아보세요/g, '알아봐')
        .replace(/찾아보세요/g, '찾아봐')
        .replace(/확인해보세요/g, '확인해봐')
        .replace(/연락하세요/g, '연락해')
        .replace(/전화하세요/g, '전화해')
        .replace(/메시지하세요/g, '메시지해')
        .replace(/이해하세요/g, '이해해')
        .replace(/참으세요/g, '참아')
        .replace(/기다리세요/g, '기다려')
        .replace(/조심하세요/g, '조심해')
        .replace(/건강하세요/g, '건강해')
        .replace(/잘하세요/g, '잘해')
        .replace(/화이팅하세요/g, '화이팅해')
        .replace(/힘내세요/g, '힘내')
        .replace(/수고하세요/g, '수고해')
        .replace(/잘자요/g, '잘자')
        .replace(/잘 주무세요/g, '잘자')
        .replace(/편안히 주무세요/g, '편안히 자')
        .replace(/달콤한 꿈 꾸세요/g, '달콤한 꿈 꿔')
        .replace(/고생하셨어요/g, '고생했어')
        .replace(/괜찮으시면/g, '괜찮으면')
        .replace(/괜찮으세요/g, '괜찮아')
        .replace(/힘드시겠어요/g, '힘들겠어')
        .replace(/피곤하시겠어요/g, '피곤하겠어')
        .replace(/바쁘시겠어요/g, '바쁘겠어')
        .replace(/바쁘세요/g, '바빠')
        .replace(/시간 있으세요/g, '시간 있어')
        .replace(/시간 되세요/g, '시간 돼')
        .replace(/가능하세요/g, '가능해')
        .replace(/불가능하세요/g, '불가능해')
        .replace(/어려우세요/g, '어려워')
        .replace(/쉬우세요/g, '쉬워')
        .replace(/복잡하세요/g, '복잡해')
        .replace(/간단하세요/g, '간단해')
        .replace(/빠르세요/g, '빨라')
        .replace(/느리세요/g, '느려')
        .replace(/크세요/g, '커')
        .replace(/작으세요/g, '작아')
        .replace(/높으세요/g, '높아')
        .replace(/낮으세요/g, '낮아')
        .replace(/넓으세요/g, '넓어')
        .replace(/좁으세요/g, '좁아')
        .replace(/두꺼우세요/g, '두꺼워')
        .replace(/얇으세요/g, '얇아')
        .replace(/무거우세요/g, '무거워')
        .replace(/가벼우세요/g, '가벼워')
        .replace(/예쁘세요/g, '예뻐')
        .replace(/멋있으세요/g, '멋있어')
        .replace(/잘생기셨어요/g, '잘생겼어')
        .replace(/귀여우세요/g, '귀여워')
        .replace(/웃기세요/g, '웃겨')
        .replace(/재미있어요/g, '재밌어')
        .replace(/지루해요/g, '지루해')
        .replace(/신나요/g, '신나')
        .replace(/설레요/g, '설레')
        .replace(/떨려요/g, '떨려')
        .replace(/무서워요/g, '무서워')
        .replace(/걱정돼요/g, '걱정돼')
        .replace(/안심돼요/g, '안심돼')
        .replace(/다행이에요/g, '다행이야')
        .replace(/축하해요/g, '축하해')
        .replace(/축하드려요/g, '축하해')
        .replace(/축하드립니다/g, '축하해')
        .replace(/생일 축하해요/g, '생일 축하해')
        .replace(/생일 축하드려요/g, '생일 축하해')
        .replace(/새해 복 많이 받으세요/g, '새해 복 많이 받아')
        .replace(/메리 크리스마스에요/g, '메리 크리스마스')
        .replace(/즐거운 하루 되세요/g, '즐거운 하루 돼')
        .replace(/좋은 하루 되세요/g, '좋은 하루 돼')
        .replace(/행복한 하루 되세요/g, '행복한
