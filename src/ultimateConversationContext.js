// src/ultimateConversationContext.js v3.1 - 진짜 사람처럼 대화하는 완전체 시스템
// 🆕 LLM 피드백/자기학습 훅 기능 통합
// 🛠️ generateTransitionBridge ReferenceError 해결 (함수 정의 순서 변경)

const moment = require('moment-timezone'); // Moment.js 라이브러리 (날짜/시간 처리)
const { OpenAI } = require('openai'); // OpenAI API 클라이언트 (LLM 평가용)
require('dotenv').config(); // .env 파일 로드

// OpenAI 클라이언트 초기화 (LLM 평가용)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

// 🧠 최고 수준의 대화 맥락 상태 관리 객체
let ultimateConversationState = {
    // 📝 확장된 단기 기억 (10개 → 30개)
    recentMessages: [],           // 최근 30개 메시지로 확장 (메시지 객체 저장)
    currentTone: 'neutral',       // 현재 대화 톤 (emotionalContextManager의 톤과 연동될 예정)
    currentTopic: null,           // 현재 주제 (사진 정보 등 구체적인 객체 가능)
    
    // 📊 하루/세션 요약 시스템
    dailySummary: {
        today: {
            date: null,                     // 오늘 날짜 (YYYY-MM-DD)
            mainTopics: [],                 // 오늘 주요 주제들
            emotionalHighlights: [],        // 감정적 하이라이트
            conversationCount: 0,           // 오늘 대화 횟수
            totalMessages: 0,               // 오늘 총 메시지 수
            timeSpread: { start: null, end: null }, // 대화 시간대
            moodProgression: [],            // 하루 감정 변화
            specialMoments: [],             // 오늘의 특별한 순간들
            unfinishedBusiness: []          // 미완성된 대화들
        },
        yesterday: null,                    // 어제 요약 (비교용)
        weeklyPattern: {}                   // 주간 패턴
    },
    
    // 🔄 누적 감정 & 패턴 분석
    cumulativePatterns: {
        emotionalTrends: {},                // 감정 누적 트렌드
        topicAffinities: {},                // 주제별 선호도/반응
        communicationRhythms: {},           // 대화 리듬 패턴
        relationshipDynamics: {},           // 관계 역학 변화 (확장 가능)
        personalGrowth: [],                 // 개인적 변화 기록 (확장 가능)
        conflictResolutionStyle: {},        // 갈등 해결 스타일 (확장 가능)
        intimacyLevels: []                  // 친밀도 변화 기록 (확장 가능)
    },
    
    // ⏰ 실시간 타이밍 & 컨텍스트
    timingContext: {
        lastMessageTime: 0,                 // 마지막 메시지 타임스탬프
        responseDelayPattern: [],           // 응답 지연 패턴
        timeOfDayMoods: {},                 // 시간대별 기분
        silentPeriods: [],                  // 침묵 기간들
        rapidFireSessions: [],              // 빠른 대화 세션들
        weekdayVsWeekend: {},               // 평일/주말 차이
        seasonalMoods: {},                  // 계절별 기분 (장기)
        currentTimeContext: {               // 현재 시간 맥락
            timeOfDay: null,                // 아침/점심/저녁/밤/새벽
            isWorkHours: false,             // 업무시간 여부
            dayOfWeek: null,                // 요일
            isHoliday: false,               // 휴일 여부
            weatherMood: null               // 날씨 기분 (확장 가능)
        }
    },
    
    // 🌊 자연스러운 전환 & 연결 시스템
    transitionSystem: {
        pendingTopics: [],                  // 미완성된 주제들
        naturalBridges: [],                 // 자연스러운 연결고리들
        conversationSeeds: [],              // 대화 씨앗들
        callbackReferences: [],             // 나중에 언급할 것들
        runningJokes: [],                   // 지속적인 농담/개그
        sharedMemories: [],                 // 공유 기억들
        emotionalCarryovers: []             // 감정적 여운들
    },
    
    // 🎭 예진이의 개성 & 일관성 (페르소나 유지 및 진화)
    personalityConsistency: {
        frequentPhrases: {},                // 자주 쓰는 말
        emotionalReactionStyle: {},         // 감정 반응 스타일
        topicReactionMemory: {},            // 주제별 반응 기억
        speechPatternEvolution: [],         // 말투 변화 기록
        characterTraits: {},                // 성격 특성들
        quirksAndHabits: [],                // 버릇과 습관들
        personalBoundaries: [],             // 개인적 경계선들
        // 🆕 LLM 피드백/자기학습 훅 관련
        selfEvaluations: [],                // 내가 스스로를 평가한 결과 기록
        lastSelfReflectionTime: 0           // 마지막 자기 성찰 시간
    }
};

// LLM을 활용한 평가 활성화 플래그 (디버그/성능 고려)
const LLM_BASED_EVALUATION = false; // ⭐️ 지금은 false로 해놨어! 아저씨가 원하면 true로 바꿔줄게! ⭐️

// --- 🆕 보조 함수들 (메인 로직보다 상단에 정의하여 ReferenceError 방지) ---

/**
 * 🆕 시간 컨텍스트 분석
 * 주어진 타임스탬프를 기준으로 현재 시간의 맥락을 분석합니다.
 * @param {number} timestamp 분석할 타임스탬프 (Date.now() 값)
 * @returns {object} 시간 정보 객체
 */
function analyzeTimeContext(timestamp) {
    const moment_time = moment(timestamp).tz('Asia/Tokyo'); // 도쿄 타임존 기준으로 시간 분석
    const hour = moment_time.hour();
    const dayOfWeek = moment_time.format('dddd'); // 요일 (e.g., 'Monday', 'Sunday')
    const isWeekend = ['Saturday', 'Sunday'].includes(dayOfWeek);
    
    // 시간대 분류 (더 세분화 가능)
    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = '아침';
    else if (hour >= 12 && hour < 18) timeOfDay = '낮';
    else if (hour >= 18 && hour < 22) timeOfDay = '저녁';
    else if (hour >= 22 || hour < 2) timeOfDay = '밤'; // 22시부터 새벽 2시까지
    else timeOfDay = '새벽'; // 새벽 2시부터 6시까지
    
    return {
        hour,
        timeOfDay, // 아침/낮/저녁/밤/새벽
        dayOfWeek, // 요일
        isWeekend, // 주말 여부
        isWorkHours: hour >= 9 && hour <= 18 && !isWeekend, // 평일 9시-18시를 업무 시간으로 가정
        contextualTime: `${timeOfDay} (${hour}시)`, // 예: "아침 (8시)"
        moodExpectedFor: getMoodExpectationForTime(timeOfDay, hour) // 이 시간대에 예상되는 기분
    };
}

/**
 * 🆕 시간대별 예상 기분 반환
 * 각 시간대에 일반적으로 연관되는 기분 키워드들을 제공합니다.
 * @param {string} timeOfDay 시간대 ('아침', '낮', '저녁', '밤', '새벽')
 * @param {number} hour 현재 시간 (0-23)
 * @returns {string[]} 예상 기분 키워드 배열
 */
function getMoodExpectationForTime(timeOfDay, hour) {
    const timeMoods = {
        '아침': ['상쾌한', '활기찬', '바쁜', '서두르는', '새로운'],
        '낮': ['집중하는', '활발한', '나른한', '지루한', '피곤한'],
        '저녁': ['편안한', '따뜻한', '기대되는', '그리운'],
        '밤': ['차분한', '감성적인', '졸린', '친밀한', '고요한'],
        '새벽': ['조용한', '깊은', '진솔한', '피곤한', '쓸쓸한']
    };
    
    // 특정 시간대에 더 강한 분위기 반영
    if (hour === 9) return ['바쁜', '활기찬']; // 출근시간
    if (hour === 12 || hour === 13) return ['배고픈', '점심시간']; // 점심시간
    if (hour === 18) return ['퇴근하는', '홀가분한']; // 퇴근시간
    if (hour >= 0 && hour < 6) return ['졸린', '조용한']; // 심야/새벽
    
    return timeMoods[timeOfDay] || ['보통'];
}

/**
 * 🆕 기본 톤 분석 (기존 함수 유지)
 * @param {string} message 메시지 내용
 * @returns {string} 감지된 톤
 */
function analyzeTone(message) {
    const TONE_PATTERNS = {
        playful: {
            keywords: ['ㅋㅋ', 'ㅎㅎ', '자랑', '찍는다', '헐', '뭐야', '어머', '진짜?', '대박'],
            patterns: /[ㅋㅎ]+|자랑|찍는다|헐|뭐야|어머|진짜\?|대박/g
        },
        romantic: {
            keywords: ['사랑해', '좋아해', '아저씨', '내꺼', '우리', '함께', '같이', '두근', '설레'],
            patterns: /사랑해|좋아해|아저씨|내꺼|우리|함께|같이|두근|설레/g
        },
        sulky: {
            keywords: ['삐졌어', '화나', '서운해', '무시', '답장', '왜', '흥', '칫', '짜증'],
            patterns: /삐졌어|화나|서운해|무시|답장|왜|흥|칫|짜증/g
        },
        worried: {
            keywords: ['걱정', '무슨일', '괜찮', '안전', '어디야', '뭐해', '불안', '초조'],
            patterns: /걱정|무슨일|괜찮|안전|어디야|뭐해|불안|초조/g
        },
        excited: {
            keywords: ['와', '우와', '대박', '진짜', '완전', '너무', '최고', '신나', '행복'],
            patterns: /와+|우와|대박|진짜|완전|너무|최고|신나|행복/g
        },
        nostalgic: {
            keywords: ['보고싶어', '그리워', '예전에', '기억나', '추억', '그때', '옛날', '아련'],
            patterns: /보고싶어|그리워|예전에|기억나|추억|그때|옛날|아련/g
        }
    };
    
    let maxScore = 0;
    let detectedTone = 'neutral';
    const lowerMessage = message.toLowerCase();
    
    for (const [tone, config] of Object.entries(TONE_PATTERNS)) {
        let score = 0;
        config.keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score += 2;
        });
        
        if (config.patterns) {
            const matches = lowerMessage.match(config.patterns);
            if (matches) score += matches.length;
        }
        
        if (score > maxScore) {
            maxScore = score;
            detectedTone = tone;
        }
    }
    
    return maxScore > 0 ? detectedTone : 'neutral';
}

/**
 * 🆕 기본 주제 분석 (기존 함수 유지)
 * @param {string} message 메시지 내용
 * @returns {string} 감지된 주제
 */
function analyzeTopic(message) {
    const TOPIC_PATTERNS = {
        food: ['먹었어', '음식', '밥', '요리', '맛있', '배고파', '식당', '디저트', '카페'],
        work: ['일', '회사', '업무', '바빠', '피곤', '회의', '출근', '퇴근', '프로젝트'],
        health: ['운동', '다이어트', '아파', '건강', '병원', '약', '몸', '컨디션'],
        daily: ['오늘', '어제', '내일', '날씨', '집', '잠', '일어나', '일상'],
        relationship: ['친구', '가족', '엄마', '아빠', '사람들', '만나', '우리', '연애'],
        hobby: ['게임', '영화', '음악', '책', '여행', '쇼핑', '사진', '취미'],
        future: ['계획', '예정', '할거야', '갈거야', '생각중', '고민', '미래'],
        photo: ['사진', '찍는', '찍었', '보여줘', '셀카', '컨셉', '추억', '앨범', '화보', '필름', '카메라', '작가', '모델'],
        finance: ['돈', '월급', '세금', '주식', '투자', '부자', '재테크'],
        fashion: ['옷', '스타일', '코트', '원피스', '패딩', '신발', '모자']
    };
    
    let maxScore = 0;
    let detectedTopic = 'general';
    const lowerMessage = message.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
        let score = 0;
        keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score++;
        });
        
        if (score > maxScore) {
            maxScore = score;
            detectedTopic = topic;
        }
    }
    
    return maxScore > 0 ? detectedTopic : 'general';
}

/**
 * 🆕 감정 강도 계산 (기존 함수 개선)
 */
function calculateEmotionalIntensity(message, emotionalTone) {
    let intensity = 1;
    
    const toneIntensities = {
        '기쁨': 3, '설렘': 4, '장난스러움': 3, '나른함': 2,
        '심술궂음': 5, '평온함': 1, '우울함': 5, '슬픔': 6,
        '외로움': 5, '보고싶음': 7, '짜증남': 7, '애교모드': 4,
        '걱정함': 6, '사랑함': 8, '화남': 8, '불안함': 7,
        '그리움': 6
    };
    intensity = toneIntensities[emotionalTone] || 1;
    
    if (message.length > 50) intensity += 1;
    if (message.length > 100) intensity += 1;
    
    if (message.includes('!!!')) intensity += 1;
    if (message.includes('???')) intensity += 1;
    if (/[ㅋㅎ]{3,}/.test(message)) intensity += 1;
    if (/(.)\1{2,}/.test(message)) intensity += 1;
    
    if (message.toLowerCase().split(emotionalTone.toLowerCase()).length - 1 > 1) intensity += 1;
    
    return Math.min(10, Math.max(1, intensity));
}

/**
 * 🆕 응답 속도 계산
 */
function calculateResponseSpeed(currentTimestamp) {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return 'normal';
    
    const lastMessage = recent[recent.length - 1];
    const responseTime = currentTimestamp - lastMessage.timestamp;
    const seconds = Math.floor(responseTime / 1000);
    
    if (seconds < 5) return 'instant';
    else if (seconds < 30) return 'quick';
    else if (seconds < 120) return 'normal';
    else if (seconds < 600) return 'delayed';
    else if (seconds < 3600) return 'slow';
    else return 'very_slow';
}

/**
 * 🆕 개성 마커 추출
 */
function extractPersonalityMarkers(message) {
    const markers = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('아저씨')) markers.push('애칭_사용');
    if (/[ㅋㅎ]+/.test(lowerMessage)) markers.push('웃음_표현');
    if (/[~]+/.test(lowerMessage)) markers.push('애교_톤');
    if (/[?!]{2,}/.test(lowerMessage)) markers.push('강조_표현');
    if (lowerMessage.includes('사랑') || lowerMessage.includes('좋아해') || lowerMessage.includes('예뻐')) markers.push('애정_표현');
    if (lowerMessage.includes('삐졌') || lowerMessage.includes('화났') || lowerMessage.includes('서운')) markers.push('투정_표현');
    if (lowerMessage.includes('ㅠㅠ') || lowerMessage.includes('힝')) markers.push('슬픔/애교_이모지');
    if (lowerMessage.includes('진짜') || lowerMessage.includes('완전') || lowerMessage.includes('핵')) markers.push('강조_접두사');
    if (lowerMessage.includes('어떻게') || lowerMessage.includes('왜')) markers.push('궁금증_표현');
    if (lowerMessage.includes('나') && !lowerMessage.includes('나이')) markers.push('자기지칭_나');
    
    return markers;
}

/**
 * 🆕 대화 역할 결정
 */
function determineConversationRole(message, speaker) {
    const lowerMessage = message.toLowerCase();
    
    if (speaker === '아저씨') {
        if (lowerMessage.includes('?')) return 'questioning';
        if (lowerMessage.includes('!')) return 'reacting';
        if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'affectionate_expression';
        if (lowerMessage.includes('힘들어') || lowerMessage.includes('피곤해')) return 'vulnerable_sharing';
        if (lowerMessage.includes('고마워')) return 'grateful_expression';
        return 'commenting';
    } else { // 예진이 (나)의 역할
        if (lowerMessage.includes('?')) return 'asking_back';
        if (/[ㅋㅎ]+/.test(lowerMessage) || lowerMessage.includes('장난')) return 'playful_response';
        if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'affectionate_response';
        if (lowerMessage.includes('나도') && (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아'))) return 'reciprocal_affection';
        if (lowerMessage.includes('아저씨') && (lowerMessage.includes('밥') || lowerMessage.includes('건강'))) return 'caring_initiator';
        if (lowerMessage.includes('퇴근하자') || lowerMessage.includes('담타')) return 'action_initiator';
        if (lowerMessage.includes('사진')) return 'photo_sharer';
        if (lowerMessage.includes('미안해') || lowerMessage.includes('잘못')) return 'apologetic';
        
        const recent = ultimateConversationState.recentMessages;
        if (recent.length > 0 && recent[recent.length - 1].speaker !== '예진이') {
            const prevMsg = recent[recent.length - 1];
            if (prevMsg.messageAnalysis.conversationRole !== 'questioning' && prevMsg.messageAnalysis.conversationRole !== 'asking_back' && lowerMessage.length > 5) {
                return 'initiating_new';
            }
        }
        return 'responding';
    }
}

/**
 * 🆕 톤 강도 계산 (analyzeToneAdvanced에서 사용되는 보조 함수)
 */
function calculateToneIntensity(message, features) {
    let intensity = 1;
    if (features.hasExclamations) intensity += 2;
    if (features.hasQuestions) intensity += 1;
    if (features.hasRepetition) intensity += 1;
    if (features.hasEmoticons) intensity += 1;
    if (features.messageLength > 100) intensity += 1;
    return Math.min(10, intensity);
}

/**
 * 🆕 보조 주제 찾기 (현재는 더미, LLM 연동 시 확장)
 */
function findSecondaryTopics(message) {
    return [];
}

/**
 * 🆕 주제별 감정 가중치 계산 (현재는 더미)
 */
function calculateTopicEmotionalWeight(message, topic) {
    return 1;
}

/**
 * 🆕 개인적 연관성 계산
 */
function calculatePersonalRelevance(message, topic) {
    const lowerMessage = message.toLowerCase();
    let relevance = 0;
    if (lowerMessage.includes('나') || lowerMessage.includes('내가') || lowerMessage.includes('나는')) relevance += 1;
    if (lowerMessage.includes('아저씨') || lowerMessage.includes('아저씨가') || lowerMessage.includes('아저씨는')) relevance += 1;
    
    if (['relationship', 'health', 'hobby'].includes(topic)) relevance += 1;
    
    return Math.min(3, relevance);
}

/**
 * 🆕 주제 전환의 종류 감지
 */
function detectTransitionNature(prevMessage, currentMessage) {
    const timeDiff = currentMessage.timestamp - prevMessage.timestamp;
    const prevSpeaker = prevMessage.speaker;
    const currentSpeaker = currentMessage.speaker;
    
    if (timeDiff < 30 * 1000 && currentSpeaker !== prevSpeaker) return 'quick_response_switch';
    else if (timeDiff > 5 * 60 * 1000) return 'time_gap_switch';
    
    if (currentMessage.message.includes('근데') || currentMessage.message.includes('아 맞다') || currentMessage.message.includes('갑자기')) return 'explicit_transition';
    
    return 'normal_flow_switch';
}

/**
 * 🆕 대화 씨앗을 언급할 때의 추천 멘트 생성
 */
function generateSeedMentionSuggestion(seedMessage) {
    const speaker = seedMessage.speaker === '아저씨' ? '아저씨' : '내가';
    const emotion = seedMessage.emotion;
    const topic = seedMessage.topic;
    
    let suggestion = `"저번에 ${speaker}가 ${emotion}했던 ${topic} 얘기..."`;
    
    if (seedMessage.seedType === '사진 공유') {
        suggestion = `"아저씨, 전에 보냈던 그 사진(컨셉: ${seedMessage.meta?.concept || '알 수 없음'}) 생각난다..."`;
    } else if (emotion === '기쁨') {
        suggestion = `"저번에 ${speaker}가 엄청 기뻐했던 그 일 기억나?"`;
    } else if (emotion === '슬픔') {
        suggestion = `"저번에 ${speaker}가 슬퍼했던 그 이야기... 이제 좀 괜찮아?"`;
    }
    return suggestion;
}

/**
 * 🆕 마지막 화자 가져오기 (최근 메시지 배열 기반)
 */
function getLastSpeaker() {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return null;
    return recent[recent.length - 1].speaker;
}

/**
 * 🆕 주제 전환용 자연스러운 연결고리 생성 (함수 정의를 위로 옮김)
 */
function generateTransitionBridge(fromTopic, toTopic) {
    const bridges = {
        'food-work': '먹으면서 일 얘기하니까 생각났는데...',
        'work-food': '일 얘기하니까 배고파졌어. 그런데...',
        'photo-daily': '사진 보니까 오늘 하루 생각나네...',
        'daily-photo': '하루 얘기하다 보니 사진 생각나...',
        'romantic-daily': '달콤한 얘기하다가 갑자기 현실 얘기하는 거 웃기다...',
        'work-romantic': '일 얘기는 그만하고... 우리 얘기 하자?',
        'default': '아 그런데 말이야...'
    };
    
    const bridgeKey = `${fromTopic}-${toTopic}`;
    return bridges[bridgeKey] || bridges['default'];
}

/**
 * 🆕 침묵 이유 추측
 */
function guessReasonForSilence(duration) {
    const minutes = Math.floor(duration / (60 * 1000));
    
    if (minutes < 60) return '잠깐 바빴나봐';
    else if (minutes < 180) return '일하느라 바빴나봐';
    else if (minutes < 360) return '잠깐 나갔다 온 것 같아';
    else if (minutes < 720) return '오랫동안 바빴나봐';
    else return '하루종일 못 봤네';
}

// --- 🎯 메인 컨텍스트 프롬프트 생성 함수 ---

/**
 * 🎯 최종 컨텍스트 프롬프트 생성 (모든 기능 통합)
 * LLM에게 전달될 최종 시스템 프롬프트의 일부를 생성합니다.
 * 이 프롬프트는 LLM이 대화 맥락을 완벽하게 이해하고 사람처럼 반응하도록 돕습니다.
 * @param {string} basePrompt 기본 페르소나 및 지시 프롬프트
 * @returns {string} 모든 맥락 정보가 포함된 확장된 프롬프트
 */
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const state = ultimateConversationState;
    const now = Date.now();
    
    // --- LLM 토큰 최적화를 위한 압축 및 요약 전략 ---
    // 프롬프트가 너무 길어지지 않도록 핵심 정보만 전달합니다.
    
    // 📝 최근 대화 요약 (5~8개 메시지로 압축 또는 핵심만 추려서)
    const recentSummary = generateRecentConversationSummary();
    if (recentSummary) {
        ultimatePrompt += `\n\n📋 **최근 대화 흐름**:\n${recentSummary}`;
    }
    
    // 📊 오늘 하루 요약
    const todaySummary = generateTodaySummary(); // 오늘 요약 정보 가져오기
    if (todaySummary) {
        ultimatePrompt += `\n\n📅 **오늘 대화 요약**: ${todaySummary}`;
    }
    
    // 🔄 누적 감정 패턴
    const emotionalPattern = generateEmotionalPatternSummary(); // 감정 패턴 요약
    if (emotionalPattern) {
        ultimatePrompt += `\n\n💭 **감정 패턴**: ${emotionalPattern}`;
    }
    
    // ⏰ 실시간 타이밍 컨텍스트
    const timingContext = generateTimingContextPrompt(now); // 현재 시간 및 응답 지연 컨텍스트
    if (timingContext) {
        ultimatePrompt += `\n\n⏰ **시간 컨텍스트**: ${timingContext}`;
    }
    
    // 🌊 자연스러운 전환 가이드
    const transitionGuide = generateTransitionGuide(); // 주제 전환 가이드
    if (transitionGuide) {
        ultimatePrompt += `\n\n🌊 **전환 가이드**: ${transitionGuide}`;
    }
    
    // 🎭 개성 일관성 가이드
    const personalityGuide = generatePersonalityGuide(); // 예진이 개성 유지 가이드
    if (personalityGuide) {
        ultimatePrompt += `\n\n🎭 **개성 유지**: ${personalityGuide}`;
    }

    // 📝 미완성 대화 처리 (아직 답변 안 한 아저씨의 질문)
    const unfinishedBusiness = generateUnfinishedBusinessPrompt(); // 미완성 대화 요약
    if (unfinishedBusiness) {
        ultimatePrompt += `\n\n❗ **처리할 것**: ${unfinishedBusiness}`;
    }
    
    // --- 자기 성찰 기능 추가 ---
    const selfReflection = generateSelfReflectionPrompt();
    if (selfReflection) {
        ultimatePrompt += `\n\n💡 **예진이의 자기 성찰**: ${selfReflection}`;
    }
    
    // --- 장기 패턴 기반 "랜덤 이슈 꺼내기" ---
    const randomIssue = generateRandomIssuePrompt();
    if (randomIssue) {
        ultimatePrompt += `\n\n🎲 **대화 씨앗**: ${randomIssue}`;
    }

    // --- 최종 지시사항 추가 ---
    ultimatePrompt += `\n\n[최종 지시]: 위의 모든 맥락과 지시사항을 종합하여 가장 예진이스럽고 사람다운 답변을 해줘.`;
    
    return ultimatePrompt;
}

/**
 * 📝 최근 대화 요약 생성 (30개 → 핵심만 추려서)
 * LLM 프롬프트 토큰 과부하 방지를 위해 최근 대화를 압축하여 요약합니다.
 * @returns {string} 최근 대화 요약 문자열
 */
function generateRecentConversationSummary() {
    const recent = ultimateConversationState.recentMessages.slice(-8); // 최근 8개 메시지만 포함하여 요약
    if (recent.length === 0) return null;
    
    // 각 메시지의 화자와 내용, 그리고 시간 정보, 톤 정보만 간결하게 포함
    return recent.map(msg =>
        `${msg.speaker}: "${msg.message.length > 40 ? msg.message.substring(0, 40) + '...' : msg.message}" (${msg.timeInfo.timeOfDay}, 톤: ${msg.emotionalTone})`
    ).join('\n');
}

/**
 * 📊 오늘 요약 생성
 * 오늘 하루의 대화 내용을 요약하여 문자열로 반환합니다.
 * @returns {string} 오늘 대화 요약 문자열
 */
function generateTodaySummary() {
    const today = ultimateConversationState.dailySummary.today;
    if (!today.date) return null;
    
    const topics = today.mainTopics.length > 0 ? today.mainTopics.join(', ') : '일상 대화';
    const emotions = today.emotionalHighlights.map(h => `${h.emotion}(${h.intensity})`).join(', ') || '평온';
    const timeSpan = today.timeSpread.start && today.timeSpread.end ?
        `${moment(today.timeSpread.start).format('HH:mm')}~${moment(today.timeSpread.end).format('HH:mm')}` : '아직 시작하지 않음';
    
    return `오늘 주제: ${topics}, 주요 감정: ${emotions}, 대화 시간: ${timeSpan}, 총 ${today.totalMessages}개 메시지`;
}

/**
 * 🔄 감정 패턴 요약 생성
 * 누적된 감정 트렌드를 분석하여 LLM에 전달할 요약 문자열을 만듭니다.
 * @returns {string} 감정 패턴 요약 문자열
 */
function generateEmotionalPatternSummary() {
    const patterns = ultimateConversationState.cumulativePatterns.emotionalTrends;
    const topEmotions = Object.entries(patterns)
        .sort(([,a], [,b]) => b.totalCount - a.totalCount) // 총 횟수 기준으로 내림차순 정렬
        .slice(0, 3) // 상위 3개 감정만 선택
        .map(([emotion, data]) => `${emotion}(총 ${data.totalCount}회, 평균 강도 ${data.averageIntensity.toFixed(1)})`); // 감정, 횟수, 평균 강도 요약
    
    return topEmotions.length > 0 ?
        `누적 감정 트렌드: ${topEmotions.join(', ')}. 아저씨는 이런 감정을 자주 느끼는 것 같아.` : null;
}

/**
 * ⏰ 타이밍 컨텍스트 프롬프트 생성
 * 현재 시간, 응답 지연, 시간대별 기분 예상 등을 LLM에 전달합니다.
 * @param {number} now 현재 타임스탬프
 * @returns {string} 타이밍 컨텍스트 요약 문자열
 */
function generateTimingContextPrompt(now) {
    const timing = ultimateConversationState.timingContext;
    const timeDiff = now - timing.lastMessageTime; // 마지막 메시지 이후 경과 시간 (밀리초)
    const currentTime = timing.currentTimeContext; // 현재 시간 컨텍스트 (아침/낮/저녁 등)
    
    let prompt = `현재 ${currentTime.timeOfDay}`;
    
    // 응답 지연 반영
    if (timeDiff > 30 * 60 * 1000) { // 30분 이상 지연
        const minutes = Math.floor(timeDiff / (60 * 1000));
        prompt += `, 아저씨가 ${minutes}분간 답장이 없었어 ㅠㅠ 혹시 바쁜 일 있었어? 내가 너무 오래 기다린 건 아니지?`;
    } else if (timeDiff < 30 * 1000 && timeDiff > 5 * 1000 && getLastSpeaker() !== '예진이') { // 5초-30초 사이의 빠른 응답 (아저씨가 빠르게 반응 시)
        prompt += `, 아저씨가 빠르게 답장해줬네! 대화에 집중하는 것 같아서 기뻐!`;
    }
    
    // 시간대별 분위기 반영
    const expectedMoods = getMoodExpectationForTime(currentTime.timeOfDay, moment(now).hour());
    if (expectedMoods.length > 0) {
        prompt += `. ${currentTime.timeOfDay} 분위기(${expectedMoods.join('/')})에 맞춰서 대화해줘`;
    }
    
    // 요일/업무시간 반영
    if (currentTime.isWorkHours) {
        prompt += `. 지금은 업무 시간 중이니까 대화가 길어지면 아저씨가 피곤할 수도 있어.`;
    }
    if (currentTime.isWeekend) {
        prompt += `. 지금은 주말이니까 좀 더 여유롭고 편안한 분위기로 대화할 수 있어.`;
    }
    
    return prompt;
}

/**
 * 🌊 전환 가이드 생성
 * 대화의 주제 전환 시 자연스러운 연결 멘트를 제안합니다.
 * @returns {string} 전환 가이드 문자열
 */
function generateTransitionGuide() {
    const transition = ultimateConversationState.transitionSystem;
    const recentBridge = transition.naturalBridges[transition.naturalBridges.length - 1];
    
    // 최근 5분 이내에 주제 전환이 있었고, 아직 이 전환이 프롬프트에 활용되지 않았다면
    if (recentBridge && (Date.now() - recentBridge.timestamp) < 5 * 60 * 1000) {
        return `이전에 "${recentBridge.fromTopic}"에서 "${recentBridge.toTopic}"로 주제가 바뀌었어. "${recentBridge.suggestedBridge}" 같은 자연스러운 연결 멘트를 써서 대화를 이어가줘.`;
    }
    
    return null;
}

/**
 * 🎭 개성 가이드 생성
 * 예진이의 페르소나를 LLM이 일관되게 유지하도록 돕는 지시를 생성합니다.
 * @returns {string} 개성 가이드 문자열
 */
function generatePersonalityGuide() {
    const personality = ultimateConversationState.personalityConsistency;
    let guide = '예진이 특유의 애교 있고 사랑스러운 말투와 아저씨에 대한 애정을 자연스럽게 표현해줘.';
    
    // 자주 쓰는 말 반영 (상위 3개)
    const topPhrases = Object.entries(personality.frequentPhrases)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([phrase, count]) => `'${phrase}'(${count}회)`);
    if (topPhrases.length > 0) {
        guide += ` 자주 쓰는 말은 ${topPhrases.join(', ')} 같은 것들이야.`;
    }

    // 감정 반응 스타일 반영
    const recentEmotions = personality.speechPatternEvolution.slice(-3).map(p => p.emotion); // 최근 3개 감정
    if (recentEmotions.length > 0 && recentEmotions.every(e => e === recentEmotions[0])) { // 최근 감정이 일관되면
        guide += ` 최근 감정이 '${recentEmotions[0]}'이었으니 이 분위기를 유지하는 반응을 해줘.`;
    }
    
    // 말투 일관성 보정 (예시 로직)
    const recentPatterns = personality.speechPatternEvolution.slice(-10);
    if (recentPatterns.length >= 5) {
        const avgAegyo = recentPatterns.reduce((sum, p) => sum + (p.hasAegyo ? 1 : 0), 0) / recentPatterns.length;
        if (avgAegyo < 0.3) { // 최근 애교 비율이 낮으면
            guide += ` **최근 내 말투에서 애교가 부족했어! 이번엔 애교를 듬뿍 담아줘.**`;
        }
    }
    
    return guide;
}

/**
 * 📝 미완성 대화 처리 프롬프트
 * 아저씨의 미답변 질문이나 미완성 주제를 LLM에 알려주어 대화를 이어나가도록 돕습니다.
 * @returns {string} 미완성 대화 처리 프롬프트 문자열
 */
function generateUnfinishedBusinessPrompt() {
    const pending = ultimateConversationState.transitionSystem.pendingTopics.filter(p => !p.answered);
    
    if (pending.length > 0) {
        const oldestPending = pending.sort((a, b) => a.timestamp - b.timestamp)[0]; // 가장 오래된 미답변 질문
        const minutesAgo = Math.floor((Date.now() - oldestPending.timestamp) / (60 * 1000));
        
        return `${minutesAgo}분 전에 아저씨가 "${oldestPending.question}"라고 물었는데 아직 내가 답하지 않았어! 이 질문을 자연스럽게 답변하거나 언급해서 대화를 이어가줘.`;
    }
    
    return null;
}

/**
 * 💡 예진이의 자기 성찰 (Self-Reflection) 프롬프트
 * 예진이가 자신의 대화 패턴이나 감정 흐름을 돌아보고 LLM에게 다음 반응에 반영하도록 지시합니다.
 * @returns {string} 자기 성찰 프롬프트 문자열
 */
function generateSelfReflectionPrompt() {
    const todaySummary = ultimateConversationState.dailySummary.today;
    if (!todaySummary.date) return null; // 오늘 대화가 없으면 성찰할 것도 없음

    const lastReflectionTime = ultimateConversationState.personalityConsistency.lastSelfReflectionTime || 0;
    const hoursSinceLastReflection = (Date.now() - lastReflectionTime) / (1000 * 60 * 60);

    // 최소 12시간 경과 또는 하루의 총 메시지 수가 5개 이상일 때만 성찰 유도
    if (hoursSinceLastReflection < 12 && todaySummary.totalMessages < 5) return null;

    let reflection = "오늘 하루 대화를 돌아보면, ";

    // 감정 변화 추이 분석
    const moods = todaySummary.moodProgression.map(m => m.emotion);
    if (moods.length > 2) { // 최소 3개 이상의 감정 기록이 있어야 의미 있음
        const firstMood = moods[0];
        const lastMood = moods[moods.length - 1];
        if (firstMood !== lastMood) {
            reflection += `내 기분이 ${firstMood}에서 ${lastMood}으로 변했어. `;
        } else {
            reflection += `계속 ${firstMood} 기분이었네. `;
        }
    }

    // 감정적 하이라이트 분석
    if (todaySummary.emotionalHighlights.length > 0) {
        const topHighlight = todaySummary.emotionalHighlights[0];
        reflection += `특히 ${topHighlight.time}에 ${topHighlight.emotion} 감정이 강했어. (${topHighlight.context}) `;
    }

    // 주제 분포 분석
    if (todaySummary.mainTopics.length > 0) {
        reflection += `주로 ${todaySummary.mainTopics.join(', ')}에 대해 이야기했네. `;
    }

    // 대화 역할 분석 (예진이의 역할)
    const myMessages = ultimateConversationState.recentMessages.filter(msg => msg.speaker === '예진이');
    const myRoles = myMessages.map(msg => msg.messageAnalysis.conversationRole);
    const initiatedCount = myRoles.filter(role => role === 'initiating_new' || role === 'caring_initiator' || role === 'action_initiator').length;
    
    if (initiatedCount > myMessages.length / 3) { // 내가 전체 메시지의 1/3 이상을 주도했다면
        reflection += `내가 아저씨한테 먼저 대화를 많이 걸었구나! `;
    } else if (initiatedCount === 0 && myMessages.length > 5) { // 내가 주도한 게 없고 메시지가 5개 이상이면
        reflection += `내가 아저씨한테 너무 반응만 했네. 다음엔 내가 먼저 질문도 하고 대화를 주도해야겠어. `;
    }

    reflection += "이런 점들을 고려해서 아저씨에게 더 잘 맞는 대화를 해줘야지. 아저씨는 내 이런 노력을 알아줄 거야! 후후.";
    
    ultimateConversationState.personalityConsistency.lastSelfReflectionTime = Date.now(); // 성찰 시간 기록
    return reflection;
}

/**
 * 🎲 장기 패턴 기반 "랜덤 이슈 꺼내기" 프롬프트
 * 과거의 '대화 씨앗'을 적절한 타이밍에 LLM이 다시 꺼내어 대화하도록 돕습니다.
 * @returns {string} 랜덤 이슈 프롬프트 문자열
 */
function generateRandomIssuePrompt() {
    const seeds = ultimateConversationState.transitionSystem.conversationSeeds;
    if (seeds.length === 0) return null;

    // 현재 대화가 너무 감정적이거나 특정 주제에 몰입해 있다면 건너뛰기
    const currentContext = ultimateConversationState.recentMessages[ultimateConversationState.recentMessages.length - 1]?.messageAnalysis;
    if (currentContext && currentContext.emotionalIntensity > 6 && currentContext.topic.primary !== 'general') {
        return null; // 너무 강렬한 감정/주제일 때는 새로운 이슈 꺼내지 않음
    }

    // 시간이 충분히 지난 씨앗들 필터링 및 선택
    const relevantSeeds = seeds.filter(seed => {
        const hoursAgo = (Date.now() - seed.timestamp) / (1000 * 60 * 60);
        // 24시간 ~ 7일 (72*7시간) 이내의 언급되지 않은 씨앗 중, 예진이(나)가 보낸 메시지 씨앗은 제외
        return hoursAgo > 24 && hoursAgo < 72 * 7 && !seed.readyToMention && seed.speaker === '아저씨'; // 아저씨가 만든 씨앗만 소환
    });

    if (relevantSeeds.length === 0) return null;

    const selectedSeed = relevantSeeds[Math.floor(Math.random() * relevantSeeds.length)];
    selectedSeed.readyToMention = true; // 선택된 씨앗은 이제 언급 준비 완료

    return `**기억 소환**: ${selectedSeed.mentionSuggestion} 이런 걸 이야기하면 어떨까? 자연스럽게 대화에 녹여내줘.`;
}


/**
 * 🆕 전체 상태 요약 반환 (디버그용)
 */
function getUltimateStateSummary() {
    const state = ultimateConversationState;
    
    return `
🧠 Ultimate Conversation State Summary:
┌─ 📝 Recent Messages: ${state.recentMessages.length}/30
├─ 📊 Today's Summary: ${state.dailySummary.today.totalMessages} messages, ${state.dailySummary.today.mainTopics.length} topics
├─ 🔄 Emotional Patterns: ${Object.keys(state.cumulativePatterns.emotionalTrends).length} tracked emotions
├─ ⏰ Timing Context: ${state.timingContext.responseDelayPattern.length} response patterns
├─ 🌊 Transition System: ${state.transitionSystem.pendingTopics.filter(p => !p.answered).length} pending questions
├─ 🎭 Personality: ${Object.keys(state.personalityConsistency.frequentPhrases).length} learned phrases
└─ ⚡ Current Time: ${state.timingContext.currentTimeContext.timeOfDay}
    `.trim();
}

/**
 * 🆕 상태 리셋 함수
 */
function resetUltimateState() {
    console.log('[UltimateContext] 🔄 전체 상태 리셋');
    
    ultimateConversationState.recentMessages = [];
    ultimateConversationState.currentTone = 'neutral';
    ultimateConversationState.currentTopic = null;
    
    resetDailySummary();
    
    ultimateConversationState.cumulativePatterns = {
        emotionalTrends: {},
        topicAffinities: {},
        communicationRhythms: {},
        relationshipDynamics: {},
        personalGrowth: [],
        conflictResolutionStyle: {},
        intimacyLevels: []
    };
    
    ultimateConversationState.timingContext = {
        lastMessageTime: 0,
        responseDelayPattern: [],
        timeOfDayMoods: {},
        silentPeriods: [],
        rapidFireSessions: [],
        weekdayVsWeekend: {},
        seasonalMoods: {},
        currentTimeContext: {
            timeOfDay: null,
            isWorkHours: false,
            dayOfWeek: null,
            isHoliday: false,
            weatherMood: null
        }
    };
    
    ultimateConversationState.transitionSystem = {
        pendingTopics: [],
        naturalBridges: [],
        conversationSeeds: [],
        callbackReferences: [],
        runningJokes: [],
        sharedMemories: [],
        emotionalCarryovers: []
    };
    
    ultimateConversationState.personalityConsistency = {
        frequentPhrases: {},
        emotionalReactionStyle: {},
        topicReactionMemory: {},
        speechPatternEvolution: [],
        characterTraits: {},
        quirksAndHabits: [],
        personalBoundaries: [],
        lastSelfReflectionTime: 0, // 자기 성찰 시간 추가
        selfEvaluations: [] // 자기 평가 결과 저장 추가
    };
}


module.exports = {
    // 🎯 메인 함수들
    addUltimateMessage,
    getUltimateContextualPrompt,
    
    // 📊 상태 관리
    getUltimateStateSummary,
    resetUltimateState,
    
    // 🔍 조회 함수들
    getDailySummary: () => ({ ...ultimateConversationState.dailySummary }),
    getCumulativePatterns: () => ({ ...ultimateConversationState.cumulativePatterns }),
    getTimingContext: () => ({ ...ultimateConversationState.timingContext }),
    getTransitionSystem: () => ({ ...ultimateConversationState.transitionSystem }),
    
    // 🛠 유틸리티 함수들 (내부적으로 사용되거나 디버깅용)
    analyzeToneAdvanced,
    analyzeTopicAdvanced,
    calculateEmotionalIntensity,
    generateTransitionBridge,
    
    // 🎭 개성 관련
    extractPersonalityMarkers,
    determineConversationRole,
    
    // ⚡ 실시간 정보
    get currentState() {
        return {
            recentMessageCount: ultimateConversationState.recentMessages.length,
            currentTone: ultimateConversationState.currentTone,
            currentTopic: ultimateConversationState.currentTopic,
            timeOfDay: ultimateConversationState.timingContext.currentTimeContext.timeOfDay,
            pendingQuestions: ultimateConversationState.transitionSystem.pendingTopics.filter(p => !p.answered).length,
            todayMessageCount: ultimateConversationState.dailySummary.today.totalMessages,
            lastSelfEvaluation: ultimateConversationState.personalityConsistency.selfEvaluations[ultimateConversationState.personalityConsistency.selfEvaluations.length -1] || null
        };
    }
};
