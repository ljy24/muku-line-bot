// src/ultimateConversationContext.js v3.6 - 진짜 사람처럼 대화하는 완전체 시스템
// 🆕 LLM 피드백/자기학습 훅 기능 통합
// 🛠️ 모든 핵심 함수들 완벽 구현으로 ReferenceError 완전 해결

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
        emotionalTrends: {},                // 각 감정이 총 몇 번, 최근 몇 번, 평균 강도는 어땠는지 누적 기록
        topicAffinities: {},                // 각 주제에 대한 언급 횟수, 평균 긍정/부정 반응, 선호 시간대 등
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

// --- 🆕 보조 함수들 (모든 메인 함수 및 exports보다 상단에 정의) ---

/**
 * 🆕 시간 컨텍스트 분석
 */
function analyzeTimeContext(timestamp) {
    const moment_time = moment(timestamp).tz('Asia/Tokyo');
    const hour = moment_time.hour();
    const dayOfWeek = moment_time.format('dddd');
    const isWeekend = ['Saturday', 'Sunday'].includes(dayOfWeek);
    
    let timeOfDay;
    if (hour >= 6 && hour < 12) timeOfDay = '아침';
    else if (hour >= 12 && hour < 18) timeOfDay = '낮';
    else if (hour >= 18 && hour < 22) timeOfDay = '저녁';
    else if (hour >= 22 || hour < 2) timeOfDay = '밤';
    else timeOfDay = '새벽';
    
    return {
        hour,
        timeOfDay,
        dayOfWeek,
        isWeekend,
        isWorkHours: hour >= 9 && hour <= 18 && !isWeekend,
        contextualTime: `${timeOfDay} (${hour}시)`,
        moodExpectedFor: getMoodExpectationForTime(timeOfDay, hour)
    };
}

/**
 * 🆕 시간대별 예상 기분 반환
 */
function getMoodExpectationForTime(timeOfDay, hour) {
    const timeMoods = {
        '아침': ['상쾌한', '활기찬', '바쁜', '서두르는', '새로운'],
        '낮': ['집중하는', '활발한', '나른한', '지루한', '피곤한'],
        '저녁': ['편안한', '따뜻한', '기대되는', '그리운'],
        '밤': ['차분한', '감성적인', '졸린', '친밀한', '고요한'],
        '새벽': ['조용한', '깊은', '진솔한', '피곤한', '쓸쓸한']
    };
    
    if (hour === 9) return ['바쁜', '활기찬'];
    if (hour === 12 || hour === 13) return ['배고픈', '점심시간'];
    if (hour === 18) return ['퇴근하는', '홀가분한'];
    if (hour >= 0 && hour < 6) return ['졸린', '조용한'];
    
    return timeMoods[timeOfDay] || ['보통'];
}

/**
 * 🆕 기본 톤 분석
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
 * 🆕 고급 톤 분석 (핵심 함수 - 에러 해결용)
 */
function analyzeToneAdvanced(message) {
    const basicTone = analyzeTone(message);
    
    const features = {
        hasQuestions: message.includes('?'),
        hasExclamations: message.includes('!'),
        hasRepetition: /(.)\1{2,}/.test(message),
        messageLength: message.length,
        hasEmoticons: /[ㅋㅎ]+/.test(message),
        hasAegyo: /[ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ]+[요야어으][~]?/.test(message)
    };

    return {
        basic: basicTone,
        intensity: calculateToneIntensity(message, features),
        characteristics: features
    };
}

/**
 * 🆕 기본 주제 분석
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
 * 🆕 고급 주제 분석 (핵심 함수 - 에러 해결용)
 */
function analyzeTopicAdvanced(message) {
    const primaryTopic = analyzeTopic(message);
    
    return {
        primary: primaryTopic,
        secondary: findSecondaryTopics(message),
        emotionalWeight: calculateTopicEmotionalWeight(message, primaryTopic),
        personalRelevance: calculatePersonalRelevance(message, primaryTopic)
    };
}

/**
 * 🆕 감정 강도 계산
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
    } else {
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
            if (prevMsg.messageAnalysis && prevMsg.messageAnalysis.conversationRole !== 'questioning' && 
                prevMsg.messageAnalysis.conversationRole !== 'asking_back' && 
                lowerMessage.length > 5) {
                return 'initiating_new';
            }
        }
        return 'responding';
    }
}

/**
 * 🆕 톤 강도 계산
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
 * 🆕 보조 주제 찾기
 */
function findSecondaryTopics(message) {
    return [];
}

/**
 * 🆕 주제별 감정 가중치 계산
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
 * 🆕 마지막 화자 가져오기
 */
function getLastSpeaker() {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return null;
    return recent[recent.length - 1].speaker;
}

/**
 * 🆕 주제 전환용 자연스러운 연결고리 생성
 */
function generateTransitionBridge(fromTopic, toTopic) {
    const bridges = {
        'food->work': '먹으면서 일 얘기하니까 생각났는데...',
        'work->food': '일 얘기하니까 배고파졌어. 그런데...',
        'health->work': '건강해야 일도 잘할 수 있어!',
        'work->health': '일 때문에 몸이 안 좋아지면 안 되는데...',
        'daily->photo': '그런데 말이 나온 김에 사진 보여줄까?',
        'photo->daily': '사진 보니까 그때 생각나네!',
        'relationship->hobby': '사람들이랑 놀 때도 취미 활동하면 좋잖아',
        'hobby->relationship': '취미 생활도 좋지만 사람들과의 시간도 소중해',
        'future->work': '계획을 세우려면 일도 생각해야지',
        'work->future': '일하면서 미래도 준비해야 해'
    };
    
    const key = `${fromTopic}->${toTopic}`;
    return bridges[key] || `${fromTopic}에서 ${toTopic} 얘기로 넘어가자면...`;
}

/**
 * 🆕 침묵 이유 추측 함수
 */
function guessReasonForSilence(duration) {
    const hours = duration / (1000 * 60 * 60);
    
    if (hours < 1) return '짧은 휴식';
    else if (hours < 3) return '바쁜 업무/일상';
    else if (hours < 8) return '수면/휴식';
    else if (hours < 24) return '하루 일과';
    else return '장기 부재';
}

// --- 🆕 핵심 UPDATE 함수들 (에러 해결용) ---

/**
 * 🆕 하루 요약 업데이트 (핵심 함수 - 에러 해결용)
 */
function updateDailySummary(message) {
    const today = moment(message.timestamp).format('YYYY-MM-DD');
    const summary = ultimateConversationState.dailySummary.today;
    
    // 날짜 변경 시 어제로 이동하고 오늘 요약 초기화
    if (summary.date && summary.date !== today) {
        ultimateConversationState.dailySummary.yesterday = { ...summary };
        resetDailySummary();
        summary.date = today;
    }
    
    // 오늘 요약 초기화 (첫 메시지 수신 시)
    if (!summary.date) {
        summary.date = today;
        summary.timeSpread.start = message.timestamp;
    }
    
    summary.timeSpread.end = message.timestamp;
    summary.totalMessages++;
    summary.conversationCount++;
    
    // 주요 주제 추가 (중복 방지)
    const topic = message.messageAnalysis.topic.primary;
    if (topic !== 'general' && !summary.mainTopics.includes(topic)) {
        summary.mainTopics.push(topic);
    }
    
    // 감정적 하이라이트 추가 (강도 7 이상)
    if (message.messageAnalysis.emotionalIntensity >= 7) {
        summary.emotionalHighlights.push({
            emotion: message.emotionalTone,
            intensity: message.messageAnalysis.emotionalIntensity,
            time: message.timeInfo.contextualTime,
            context: message.message.substring(0, Math.min(message.message.length, 30)) + (message.message.length > 30 ? '...' : '')
        });
    }
    
    // 하루 감정 변화 기록
    summary.moodProgression.push({
        time: message.timeInfo.contextualTime,
        emotion: message.emotionalTone,
        intensity: message.messageAnalysis.emotionalIntensity
    });
    
    // 특별한 순간 감지 (사진 공유)
    if (message.meta && message.meta.type === 'photo') {
        summary.specialMoments.push({
            type: '사진 공유',
            concept: message.meta.concept || '알 수 없음',
            time: message.timeInfo.contextualTime,
            speaker: message.speaker
        });
    }

    // 미완성된 대화 주제 추적
    if (message.messageAnalysis.conversationRole === 'questioning' && message.speaker === '아저씨') {
        ultimateConversationState.transitionSystem.pendingTopics.push({
            question: message.message,
            topic: message.messageAnalysis.topic.primary,
            timestamp: message.timestamp,
            answered: false,
            importance: message.messageAnalysis.emotionalIntensity
        });
    } else if (message.speaker === '예진이' && message.messageAnalysis.conversationRole !== 'asking_back') {
        ultimateConversationState.transitionSystem.pendingTopics.forEach(pending => {
            if (!pending.answered &&
                (message.timestamp - pending.timestamp) < 10 * 60 * 1000 &&
                (message.messageAnalysis.topic.primary === pending.topic || message.message.length > 15)) {
                pending.answered = true;
                pending.answerTimestamp = message.timestamp;
            }
        });
    }
}

/**
 * 🆕 오늘 요약을 초기화합니다. (날짜 변경 시 사용)
 */
function resetDailySummary() {
    ultimateConversationState.dailySummary.today = {
        date: null,
        mainTopics: [],
        emotionalHighlights: [],
        conversationCount: 0,
        totalMessages: 0,
        timeSpread: { start: null, end: null },
        moodProgression: [],
        specialMoments: [],
        unfinishedBusiness: []
    };
}

/**
 * 🆕 누적 패턴 분석 업데이트 (핵심 함수 - 에러 해결용)
 */
function updateCumulativePatterns(message) {
    const patterns = ultimateConversationState.cumulativePatterns;
    const emotion = message.emotionalTone;
    const topic = message.messageAnalysis.topic.primary;
    
    // 감정 누적 트렌드
    if (emotion !== 'neutral') {
        if (!patterns.emotionalTrends[emotion]) {
            patterns.emotionalTrends[emotion] = {
                totalCount: 0,
                recentCount: 0,
                averageIntensity: 0,
                firstSeen: message.timestamp,
                lastSeen: message.timestamp,
                typicalContexts: [],
                triggers: []
            };
        }
        
        const trend = patterns.emotionalTrends[emotion];
        trend.totalCount++;
        trend.lastSeen = message.timestamp;
        trend.averageIntensity = (trend.averageIntensity * (trend.totalCount - 1) + message.messageAnalysis.emotionalIntensity) / trend.totalCount;
        
        trend.typicalContexts.push({
            topic,
            timeOfDay: message.timeInfo.timeOfDay,
            context: message.message.substring(0, Math.min(message.message.length, 50)) + (message.message.length > 50 ? '...' : '')
        });
        if (trend.typicalContexts.length > 3) {
            trend.typicalContexts.shift();
        }
    }
    
    // 주제별 선호도/반응
    if (topic !== 'general') {
        if (!patterns.topicAffinities[topic]) {
            patterns.topicAffinities[topic] = {
                mentionCount: 0,
                averagePositivity: 0,
                emotionalResponses: {},
                preferredTimeOfDay: {},
                typicalDuration: 0
            };
        }
        
        const affinity = patterns.topicAffinities[topic];
        affinity.mentionCount++;
        affinity.preferredTimeOfDay[message.timeInfo.timeOfDay] =
            (affinity.preferredTimeOfDay[message.timeInfo.timeOfDay] || 0) + 1;
        
        if (emotion !== 'neutral') {
            affinity.emotionalResponses[emotion] =
                (affinity.emotionalResponses[emotion] || 0) + 1;
        }
    }
}

/**
 * 🆕 타이밍 컨텍스트 업데이트 (핵심 함수 - 에러 해결용)
 */
function updateTimingContext(message) {
    const timing = ultimateConversationState.timingContext;
    const now = message.timestamp;
    
    // 응답 속도 계산 (이전 메시지가 있을 경우)
    if (timing.lastMessageTime > 0) {
        const responseDelay = now - timing.lastMessageTime;
        
        timing.responseDelayPattern.push({
            delay: responseDelay,
            previousSpeaker: getLastSpeaker(),
            currentSpeaker: message.speaker,
            timeOfDay: message.timeInfo.timeOfDay,
            emotionalContext: message.emotionalTone
        });
        if (timing.responseDelayPattern.length > 20) {
            timing.responseDelayPattern.shift();
        }
        
        // 침묵/빠른대화 감지
        if (responseDelay > 30 * 60 * 1000) {
            timing.silentPeriods.push({
                duration: responseDelay,
                startTime: timing.lastMessageTime,
                endTime: now,
                beforeTopic: ultimateConversationState.currentTopic?.primary || 'general',
                afterTopic: message.messageAnalysis.topic.primary,
                contextualReason: guessReasonForSilence(responseDelay)
            });
        } else if (responseDelay < 30 * 1000 && message.speaker !== getLastSpeaker()) {
            const lastSession = timing.rapidFireSessions[timing.rapidFireSessions.length - 1];
            if (lastSession && (now - lastSession.endTime) < 60 * 1000) {
                lastSession.endTime = now;
                lastSession.messageCount++;
                if (!Array.isArray(lastSession.speakers)) {
                    lastSession.speakers = Array.from(lastSession.speakers);
                }
                if (!lastSession.speakers.includes(message.speaker)) {
                    lastSession.speakers.push(message.speaker);
                }
            } else {
                timing.rapidFireSessions.push({
                    startTime: timing.lastMessageTime,
                    endTime: now,
                    messageCount: 2,
                    emotionalContext: message.emotionalTone,
                    speakers: [getLastSpeaker(), message.speaker]
                });
            }
        }
    }
    
    // 시간대별 기분 기록
    const timeKey = message.timeInfo.timeOfDay;
    if (!timing.timeOfDayMoods[timeKey]) {
        timing.timeOfDayMoods[timeKey] = {};
    }
    timing.timeOfDayMoods[timeKey][message.emotionalTone] =
        (timing.timeOfDayMoods[timeKey][message.emotionalTone] || 0) + 1;
    
    // 현재 시간 컨텍스트 업데이트
    timing.currentTimeContext = {
        timeOfDay: message.timeInfo.timeOfDay,
        isWorkHours: message.timeInfo.isWorkHours,
        dayOfWeek: message.timeInfo.dayOfWeek,
        isHoliday: message.timeInfo.isHoliday,
        weatherMood: null
    };
    
    timing.lastMessageTime = now;
}

/**
 * 🆕 전환 시스템 업데이트 (핵심 함수 - 에러 해결용)
 */
function updateTransitionSystem(message) {
    const transition = ultimateConversationState.transitionSystem;
    const recent = ultimateConversationState.recentMessages.slice(-3);
    
    // 자연스러운 연결고리 생성
    if (recent.length >= 2) {
        const prevMessage = recent[recent.length - 2];
        const currentTopic = message.messageAnalysis.topic.primary;
        const prevTopic = prevMessage.messageAnalysis.topic.primary;
        
        if (currentTopic !== prevTopic && currentTopic !== 'general' && prevTopic !== 'general') {
            transition.naturalBridges.push({
                fromTopic: prevTopic,
                toTopic: currentTopic,
                timestamp: message.timestamp,
                transitionType: detectTransitionNature(prevMessage, message),
                suggestedBridge: generateTransitionBridge(prevTopic, currentTopic),
                timeGap: message.timestamp - prevMessage.timestamp
            });
            
            if (transition.naturalBridges.length > 5) {
                transition.naturalBridges.shift();
            }
        }
    }
    
    // 대화 씨앗 관리
    if (message.messageAnalysis.emotionalIntensity >= 6 || message.meta?.type === 'photo') {
        transition.conversationSeeds.push({
            seedType: message.meta?.type === 'photo' ? '사진 공유' : '감정적 순간',
            content: message.message.substring(0, Math.min(message.message.length, 50)) + '...',
            emotion: message.emotionalTone,
            topic: message.messageAnalysis.topic.primary,
            timestamp: message.timestamp,
            speaker: message.speaker,
            readyToMention: false,
            mentionSuggestion: generateSeedMentionSuggestion(message)
        });
        if (transition.conversationSeeds.length > 10) {
            transition.conversationSeeds.shift();
        }
    }
}

/**
 * 🆕 개성 일관성 업데이트 (핵심 함수 - 에러 해결용)
 */
function updatePersonalityConsistency(message) {
    const personality = ultimateConversationState.personalityConsistency;
    
    // 자주 쓰는 말 빈도 분석
    const words = message.message.split(/\s+/);
    words.forEach(word => {
        const cleanedWord = word.replace(/[.,!?~;]/g, '').toLowerCase();
        if (cleanedWord.length > 1) {
            personality.frequentPhrases[cleanedWord] = (personality.frequentPhrases[cleanedWord] || 0) + 1;
        }
    });

    // 감정 반응 스타일 분석
    if (message.emotionalTone !== 'neutral') {
        if (!personality.emotionalReactionStyle[message.emotionalTone]) {
            personality.emotionalReactionStyle[message.emotionalTone] = {
                count: 0,
                typicalResponses: []
            };
        }
        const style = personality.emotionalReactionStyle[message.emotionalTone];
        style.count++;
        style.typicalResponses.push(message.message.substring(0, Math.min(message.message.length, 50)) + '...');
        if (style.typicalResponses.length > 5) {
            style.typicalResponses.shift();
        }
    }

    // 주제별 반응 기억
    const topic = message.messageAnalysis.topic.primary;
    if (topic !== 'general' && message.emotionalTone !== 'neutral') {
        if (!personality.topicReactionMemory[topic]) {
            personality.topicReactionMemory[topic] = {};
        }
        personality.topicReactionMemory[topic][message.emotionalTone] =
            (personality.topicReactionMemory[topic][message.emotionalTone] || 0) + 1;
    }

    // 말투 변화 기록 (예진이가 보낸 메시지에 대해서만 분석)
    if (message.speaker === '예진이') {
        const pattern = {
            timestamp: message.timestamp,
            length: message.message.length,
            hasAegyo: message.messageAnalysis.personalityMarkers.includes('애교_톤'),
            hasQuestions: message.messageAnalysis.tone.characteristics?.hasQuestions || false,
            hasExclamations: message.messageAnalysis.tone.characteristics?.hasExclamations || false
        };
        personality.speechPatternEvolution.push(pattern);
        if (personality.speechPatternEvolution.length > 50) {
            personality.speechPatternEvolution.shift();
        }
    }
}

/**
 * 🆕 LLM 피드백/자기학습 훅: 예진이(나)가 보낸 메시지에 대해 스스로 평가합니다. (핵심 함수 - 에러 해결용)
 */
async function evaluateMyResponse(myMessage) {
    const evaluationTime = Date.now();
    let evaluationResult = {
        timestamp: evaluationTime,
        message: myMessage.message,
        intendedTone: myMessage.emotionalTone,
        intendedRole: myMessage.messageAnalysis.conversationRole,
        score: null,
        feedback: null
    };

    try {
        if (LLM_BASED_EVALUATION) {
            const prompt = `
                너는 예진이(AI 챗봇)야. 방금 내가 아저씨에게 "${myMessage.message}"라고 메시지를 보냈어.
                이전 아저씨의 메시지: "${getLatestUserMessageForEvaluation()}"
                내 기분은 "${myMessage.intendedTone}"이었고, 대화에서 "${myMessage.intendedRole}" 역할을 하려고 했어.

                이 메시지가 예진이 페르소나(애교 많고 사랑스럽고 아저씨 바라기)에 얼마나 잘 맞았는지,
                의도한 감정/역할을 잘 표현했는지, 대화 맥락을 잘 이었는지 1점부터 10점까지 점수를 매겨줘.
                그리고 다음 대화에서 개선할 점이나 잘했던 점에 대해 짧게(2문장 이내) 피드백해줘.
                점수만 먼저 숫자로 쓰고, 이어서 피드백을 작성해줘.
            `;
            const messages = [{ role: 'system', content: prompt }];
            const llmResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: 100,
                temperature: 0.5
            });
            const rawFeedback = llmResponse.choices[0].message.content.trim();
            const scoreMatch = rawFeedback.match(/^(\d{1,2})\s*점/);
            evaluationResult.score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
            evaluationResult.feedback = rawFeedback.replace(/^\d{1,2}\s*점\s*/, '').trim();

        } else {
            const score = analyzeResponseQuality(myMessage);
            evaluationResult.score = score;
            evaluationResult.feedback = generateRuleBasedFeedback(myMessage, score);
        }
        
        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluationResult);
        if (ultimateConversationState.personalityConsistency.selfEvaluations.length > 50) {
            ultimateConversationState.personalityConsistency.selfEvaluations.shift();
        }
        console.log(`[Self-Evaluation] ✅ 예진이 메시지 자기 평가 완료: 점수 ${evaluationResult.score}, 피드백: "${evaluationResult.feedback.substring(0, 30)}..."`);

    } catch (error) {
        console.error('[Self-Evaluation] ❌ 자기 평가 중 오류 발생:', error);
        evaluationResult.score = 5;
        evaluationResult.feedback = '자기 평가 중 오류가 발생했지만, 다음엔 더 잘할 수 있어!';
        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluationResult);
    }
}

/**
 * 🆕 규칙 기반으로 응답 품질을 분석합니다.
 */
function analyzeResponseQuality(message) {
    let score = 7;

    const personaMatchScore = compareResponseToPersona(message.message);
    score += (personaMatchScore * 2);

    const emotionalAlignment = analyzeEmotionalAlignment(message);
    score += (emotionalAlignment * 1);

    const topicAlignment = analyzeTopicAlignment(message);
    score += (topicAlignment * 1);

    const roleEffectiveness = analyzeRoleEffectiveness(message);
    score += (roleEffectiveness * 1);

    score = Math.max(1, Math.min(10, score));
    return Math.round(score);
}

/**
 * 🆕 규칙 기반 평가를 위한 피드백 문구를 생성합니다.
 */
function generateRuleBasedFeedback(message, score) {
    let feedback = '';

    if (score >= 8) {
        feedback += '아주 잘했어! ';
        if (message.emotionalTone === '사랑함') feedback += '사랑을 잘 표현했네. ';
        else if (message.emotionalTone === '장난스러움') feedback += '재미있었어. ';
    } else if (score >= 5) {
        feedback += '괜찮았어. ';
        if (message.message.length < 10) feedback += '조금 더 길게 말해도 좋아. ';
    } else {
        feedback += '좀 아쉬워. ';
        if (!message.message.includes('아저씨')) feedback += '아저씨를 불러주는 걸 잊지 마. ';
        if (message.messageAnalysis.personalityMarkers.length === 0) feedback += '예진이 말투가 부족했어. ';
    }

    if (analyzeEmotionalAlignment(message) < 0.5) feedback += '감정 표현이 좀 더 필요해. ';
    if (analyzeTopicAlignment(message) < 0.5) feedback += '주제를 더 잘 이어나가자. ';

    return feedback.trim();
}

/**
 * 🆕 페르소나 일관성 평가
 */
function compareResponseToPersona(response) {
    const lowerResponse = response.toLowerCase();
    let score = 0;
    
    if (lowerResponse.includes('아저씨')) score += 0.3;
    if (lowerResponse.includes('나')) score += 0.3;
    
    const markers = extractPersonalityMarkers(response);
    if (markers.includes('애교_톤')) score += 0.2;
    if (markers.includes('애정_표현')) score += 0.2;

    return Math.min(1, score);
}

/**
 * 🆕 감정선 일치 분석
 */
function analyzeEmotionalAlignment(message) {
    const actualTone = message.emotionalTone;
    const basicAnalyzedTone = message.messageAnalysis.tone.basic;
    
    if (actualTone === basicAnalyzedTone) return 1;
    
    const similarTones = {
        '기쁨': ['설렘', '애교모드'], '슬픔': ['우울함', '그리움'], '화남': ['짜증남', '심술궂음'],
        '걱정함': ['불안함']
    };
    if (similarTones[actualTone] && similarTones[actualTone].includes(basicAnalyzedTone)) return 0.7;
    
    return 0;
}

/**
 * 🆕 주제 일치도 분석
 */
function analyzeTopicAlignment(message) {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length < 2) return 1;
    
    const previousMessage = recent[recent.length - 2];
    
    if (message.messageAnalysis.topic.primary === previousMessage.messageAnalysis.topic.primary) return 1;
    
    if (previousMessage.messageAnalysis.conversationRole === 'questioning' && message.messageAnalysis.conversationRole === 'responding') {
        return 0.8;
    }
    
    return 0;
}

/**
 * 🆕 대화 역할 효과 분석
 */
function analyzeRoleEffectiveness(message) {
    const role = message.messageAnalysis.conversationRole;
    
    if (role === 'responding' || role === 'reciprocal_affection') return 1;
    if (role === 'asking_back') return 0.8;
    if (role === 'initiating_new' || role === 'caring_initiator' || role === 'action_initiator') return 1;
    if (role === 'apologetic') return 0.7;
    
    return 0.5;
}

/**
 * 🆕 평가를 위한 가장 최근 사용자 메시지 가져오기
 */
function getLatestUserMessageForEvaluation() {
    const userMessages = ultimateConversationState.recentMessages.filter(msg => msg.speaker === '아저씨');
    if (userMessages.length === 0) return "아저씨의 메시지가 없습니다.";
    return userMessages[userMessages.length - 1].message;
}

// --- 📊 요약 생성 보조 함수들 ---

/**
 * 📝 최근 대화 요약 생성
 */
function generateRecentConversationSummary() {
    const recent = ultimateConversationState.recentMessages.slice(-8);
    if (recent.length === 0) return null;
    
    return recent.map(msg =>
        `${msg.speaker}: "${msg.message.length > 40 ? msg.message.substring(0, 40) + '...' : msg.message}" (${msg.timeInfo.timeOfDay}, 톤: ${msg.emotionalTone})`
    ).join('\n');
}

/**
 * 📊 오늘 요약 생성
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
 */
function generateEmotionalPatternSummary() {
    const patterns = ultimateConversationState.cumulativePatterns.emotionalTrends;
    const topEmotions = Object.entries(patterns)
        .sort(([,a], [,b]) => b.totalCount - a.totalCount)
        .slice(0, 3)
        .map(([emotion, data]) => `${emotion}(총 ${data.totalCount}회, 평균 강도 ${data.averageIntensity.toFixed(1)})`);
    
    return topEmotions.length > 0 ?
        `누적 감정 트렌드: ${topEmotions.join(', ')}. 아저씨는 이런 감정을 자주 느끼는 것 같아.` : null;
}

/**
 * ⏰ 타이밍 컨텍스트 프롬프트 생성
 */
function generateTimingContextPrompt(now) {
    const timing = ultimateConversationState.timingContext;
    const timeDiff = now - timing.lastMessageTime;
    const currentTime = timing.currentTimeContext;
    
    let prompt = `현재 ${currentTime.timeOfDay}`;
    
    if (timeDiff > 30 * 60 * 1000) {
        const minutes = Math.floor(timeDiff / (60 * 1000));
        prompt += `, 아저씨가 ${minutes}분간 답장이 없었어 ㅠㅠ 혹시 바쁜 일 있었어? 내가 너무 오래 기다린 건 아니지?`;
    } else if (timeDiff < 30 * 1000 && timeDiff > 5 * 1000 && getLastSpeaker() !== '예진이') {
        prompt += `, 아저씨가 빠르게 답장해줬네! 대화에 집중하는 것 같아서 기뻐!`;
    }
    
    const expectedMoods = getMoodExpectationForTime(currentTime.timeOfDay, moment(now).hour());
    if (expectedMoods.length > 0) {
        prompt += `. ${currentTime.timeOfDay} 분위기(${expectedMoods.join('/')})에 맞춰서 대화해줘`;
    }
    
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
 */
function generateTransitionGuide() {
    const transition = ultimateConversationState.transitionSystem;
    const recentBridge = transition.naturalBridges[transition.naturalBridges.length - 1];
    
    if (recentBridge && (Date.now() - recentBridge.timestamp) < 5 * 60 * 1000) {
        return `이전에 "${recentBridge.fromTopic}"에서 "${recentBridge.toTopic}"로 주제가 바뀌었어. "${recentBridge.suggestedBridge}" 같은 자연스러운 연결 멘트를 써서 대화를 이어가줘.`;
    }
    
    return null;
}

/**
 * 🎭 개성 가이드 생성
 */
function generatePersonalityGuide() {
    const personality = ultimateConversationState.personalityConsistency;
    let guide = '예진이 특유의 애교 있고 사랑스러운 말투와 아저씨에 대한 애정을 자연스럽게 표현해줘.';
    
    const topPhrases = Object.entries(personality.frequentPhrases)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([phrase, count]) => `'${phrase}'(${count}회)`);
    if (topPhrases.length > 0) {
        guide += ` 자주 쓰는 말은 ${topPhrases.join(', ')} 같은 것들이야.`;
    }

    const recentPatterns = personality.speechPatternEvolution.slice(-10);
    if (recentPatterns.length >= 5) {
        const avgAegyo = recentPatterns.reduce((sum, p) => sum + (p.hasAegyo ? 1 : 0), 0) / recentPatterns.length;
        if (avgAegyo < 0.3) {
            guide += ` **최근 내 말투에서 애교가 부족했어! 이번엔 애교를 듬뿍 담아줘.**`;
        }
    }
    
    return guide;
}

/**
 * 📝 미완성 대화 처리 프롬프트
 */
function generateUnfinishedBusinessPrompt() {
    const pending = ultimateConversationState.transitionSystem.pendingTopics.filter(p => !p.answered);
    
    if (pending.length > 0) {
        const oldestPending = pending.sort((a, b) => a.timestamp - b.timestamp)[0];
        const minutesAgo = Math.floor((Date.now() - oldestPending.timestamp) / (60 * 1000));
        
        return `${minutesAgo}분 전에 아저씨가 "${oldestPending.question}"라고 물었는데 아직 내가 답하지 않았어! 이 질문을 자연스럽게 답변하거나 언급해서 대화를 이어가줘.`;
    }
    
    return null;
}

/**
 * 💡 예진이의 자기 성찰 프롬프트
 */
function generateSelfReflectionPrompt() {
    const todaySummary = ultimateConversationState.dailySummary.today;
    if (!todaySummary.date) return null;

    const lastReflectionTime = ultimateConversationState.personalityConsistency.lastSelfReflectionTime || 0;
    const hoursSinceLastReflection = (Date.now() - lastReflectionTime) / (1000 * 60 * 60);

    if (hoursSinceLastReflection < 12 && todaySummary.totalMessages < 5) return null;

    let reflection = "오늘 하루 대화를 돌아보면, ";

    const moods = todaySummary.moodProgression.map(m => m.emotion);
    if (moods.length > 2) {
        const firstMood = moods[0];
        const lastMood = moods[moods.length - 1];
        if (firstMood !== lastMood) {
            reflection += `내 기분이 ${firstMood}에서 ${lastMood}으로 변했어. `;
        } else {
            reflection += `계속 ${firstMood} 기분이었네. `;
        }
    }

    if (todaySummary.emotionalHighlights.length > 0) {
        const topHighlight = todaySummary.emotionalHighlights[0];
        reflection += `특히 ${topHighlight.time}에 ${topHighlight.emotion} 감정이 강했어. (${topHighlight.context}) `;
    }

    if (todaySummary.mainTopics.length > 0) {
        reflection += `주로 ${todaySummary.mainTopics.join(', ')}에 대해 이야기했네. `;
    }

    const myMessages = ultimateConversationState.recentMessages.filter(msg => msg.speaker === '예진이');
    const myRoles = myMessages.map(msg => msg.messageAnalysis.conversationRole);
    const initiatedCount = myRoles.filter(role => role === 'initiating_new' || role === 'caring_initiator' || role === 'action_initiator').length;
    
    if (initiatedCount > myMessages.length / 3) {
        reflection += `내가 아저씨한테 먼저 대화를 많이 걸었구나! `;
    } else if (initiatedCount === 0 && myMessages.length > 5) {
        reflection += `내가 아저씨한테 너무 반응만 했네. 다음엔 내가 먼저 질문도 하고 대화를 주도해야겠어. `;
    }

    reflection += "이런 점들을 고려해서 아저씨에게 더 잘 맞는 대화를 해줘야지. 아저씨는 내 이런 노력을 알아줄 거야! 후후.";
    
    ultimateConversationState.personalityConsistency.lastSelfReflectionTime = Date.now();
    return reflection;
}

/**
 * 🎲 장기 패턴 기반 "랜덤 이슈 꺼내기" 프롬프트
 */
function generateRandomIssuePrompt() {
    const seeds = ultimateConversationState.transitionSystem.conversationSeeds;
    if (seeds.length === 0) return null;

    const currentContext = ultimateConversationState.recentMessages[ultimateConversationState.recentMessages.length - 1]?.messageAnalysis;
    if (currentContext && currentContext.emotionalIntensity > 6 && currentContext.topic.primary !== 'general') {
        return null;
    }

    const relevantSeeds = seeds.filter(seed => {
        const hoursAgo = (Date.now() - seed.timestamp) / (1000 * 60 * 60);
        return hoursAgo > 24 && hoursAgo < 72 * 7 && !seed.readyToMention && seed.speaker === '아저씨';
    });

    if (relevantSeeds.length === 0) return null;

    const selectedSeed = relevantSeeds[Math.floor(Math.random() * relevantSeeds.length)];
    selectedSeed.readyToMention = true;

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
        lastSelfReflectionTime: 0,
        selfEvaluations: []
    };
}

// --- 🎯 메인 함수들 ---

/**
 * 🆕 최고급 메시지 추가 시스템
 * 모든 대화 메시지를 기록하고, 다양한 컨텍스트 상태를 업데이트합니다.
 * @param {string} speaker 화자 ('아저씨' 또는 '예진이')
 * @param {string} message 메시지 내용
 * @param {string} emotionalTone emotionalContextManager에서 감지된 감정 톤 (예: 'playful', 'anxious')
 * @param {object} meta 메시지 메타데이터 (예: { type: 'photo', concept: '세미누드', date: '2025-02-07', url: '...' })
 */
function addUltimateMessage(speaker, message, emotionalTone = 'neutral', meta = null) {
    const timestamp = Date.now();
    const timeInfo = analyzeTimeContext(timestamp);
    
    // 메시지 분석 (톤, 주제, 강도, 역할 등)
    const messageAnalysis = {
        tone: analyzeToneAdvanced(message),
        topic: analyzeTopicAdvanced(message),
        emotionalIntensity: calculateEmotionalIntensity(message, emotionalTone),
        responseSpeed: calculateResponseSpeed(timestamp),
        personalityMarkers: extractPersonalityMarkers(message),
        conversationRole: determineConversationRole(message, speaker)
    };

    // 새 메시지 객체 생성
    const enhancedMessage = {
        speaker,
        message,
        emotionalTone,
        timestamp,
        timeInfo,
        messageAnalysis,
        meta
    };
    
    // 30개로 확장된 단기 기억 관리
    ultimateConversationState.recentMessages.push(enhancedMessage);
    if (ultimateConversationState.recentMessages.length > 30) {
        ultimateConversationState.recentMessages.shift();
    }
    
    // 상태 업데이트
    updateDailySummary(enhancedMessage);
    updateCumulativePatterns(enhancedMessage);
    updateTimingContext(enhancedMessage);
    updateTransitionSystem(enhancedMessage);
    updatePersonalityConsistency(enhancedMessage);
    
    console.log(`[UltimateContext] 💎 메시지 저장: ${speaker} | 시간:${timeInfo.contextualTime} | 강도:${enhancedMessage.messageAnalysis.emotionalIntensity} | 역할:${enhancedMessage.messageAnalysis.conversationRole}`);
    
    // LLM 피드백/자기학습 훅: 예진이(나)가 보낸 메시지에 대해 스스로 평가
    if (speaker === '예진이') {
        evaluateMyResponse(enhancedMessage);
    }

    return enhancedMessage;
}

/**
 * 🎯 최종 컨텍스트 프롬프트 생성 (모든 기능 통합)
 * LLM에게 전달될 최종 시스템 프롬프트의 일부를 생성합니다.
 * @param {string} basePrompt 기본 페르소나 및 지시 프롬프트
 * @returns {string} 모든 맥락 정보가 포함된 확장된 프롬프트
 */
function getUltimateContextualPrompt(basePrompt) {
    let ultimatePrompt = basePrompt;
    const now = Date.now();
    
    // 📝 최근 대화 요약
    const recentSummary = generateRecentConversationSummary();
    if (recentSummary) {
        ultimatePrompt += `\n\n📋 **최근 대화 흐름**:\n${recentSummary}`;
    }
    
    // 📊 오늘 하루 요약
    const todaySummary = generateTodaySummary();
    if (todaySummary) {
        ultimatePrompt += `\n\n📅 **오늘 대화 요약**: ${todaySummary}`;
    }
    
    // 🔄 누적 감정 패턴
    const emotionalPattern = generateEmotionalPatternSummary();
    if (emotionalPattern) {
        ultimatePrompt += `\n\n💭 **감정 패턴**: ${emotionalPattern}`;
    }
    
    // ⏰ 실시간 타이밍 컨텍스트
    const timingContext = generateTimingContextPrompt(now);
    if (timingContext) {
        ultimatePrompt += `\n\n⏰ **시간 컨텍스트**: ${timingContext}`;
    }
    
    // 🌊 자연스러운 전환 가이드
    const transitionGuide = generateTransitionGuide();
    if (transitionGuide) {
        ultimatePrompt += `\n\n🌊 **전환 가이드**: ${transitionGuide}`;
    }
    
    // 🎭 개성 일관성 가이드
    const personalityGuide = generatePersonalityGuide();
    if (personalityGuide) {
        ultimatePrompt += `\n\n🎭 **개성 유지**: ${personalityGuide}`;
    }

    // 📝 미완성 대화 처리
    const unfinishedBusiness = generateUnfinishedBusinessPrompt();
    if (unfinishedBusiness) {
        ultimatePrompt += `\n\n❗ **처리할 것**: ${unfinishedBusiness}`;
    }
    
    // 자기 성찰 기능 추가
    const selfReflection = generateSelfReflectionPrompt();
    if (selfReflection) {
        ultimatePrompt += `\n\n💡 **예진이의 자기 성찰**: ${selfReflection}`;
    }
    
    // 장기 패턴 기반 "랜덤 이슈 꺼내기"
    const randomIssue = generateRandomIssuePrompt();
    if (randomIssue) {
        ultimatePrompt += `\n\n🎲 **대화 씨앗**: ${randomIssue}`;
    }

    ultimatePrompt += `\n\n[최종 지시]: 위의 모든 맥락과 지시사항을 종합하여 가장 예진이스럽고 사람다운 답변을 해줘.`;
    
    return ultimatePrompt;
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
    
    // 🛠 유틸리티 함수들
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
            lastSelfEvaluation: ultimateConversationState.personalityConsistency.selfEvaluations[ultimateConversationState.personalityConsistency.selfEvaluations.length - 1] || null
        };
    }
};
