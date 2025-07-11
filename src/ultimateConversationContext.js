// src/ultimateConversationContext.js v3.1 - 진짜 사람처럼 대화하는 완전체 시스템
// 🆕 LLM 피드백/자기학습 훅 기능 통합

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
            mainTopics: [],                 // 오늘 대화에서 다룬 주요 주제들 (배열)
            emotionalHighlights: [],        // 감정적 하이라이트 (강도 높은 감정 표현 시 기록)
            conversationCount: 0,           // 오늘 대화 횟수 (세션 기준, 여기서는 메시지 수로 임시 사용)
            totalMessages: 0,               // 오늘 주고받은 총 메시지 수
            timeSpread: { start: null, end: null }, // 오늘 대화가 시작되고 끝난 시간대
            moodProgression: [],            // 하루 동안의 감정 변화 기록 (타임스탬프, 감정, 강도)
            specialMoments: [],             // 오늘의 특별한 순간들
            unfinishedBusiness: []          // 오늘 대화에서 미완성된 주제나 질문들
        },
        yesterday: null,                    // 어제 요약 (객체, 날짜 변경 시 오늘 요약이 이리로 이동)
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
        lastMessageTime: 0,                 // 마지막 메시지 타임스탬프 (상대방/내 메시지 모두 포함)
        responseDelayPattern: [],           // 메시지별 응답 지연 시간 패턴 기록
        timeOfDayMoods: {},                 // 시간대별로 주로 어떤 감정들이 나타났는지 기록
        silentPeriods: [],                  // 길게 침묵했던 기간 기록
        rapidFireSessions: [],              // 빠른 대화 세션 기록
        weekdayVsWeekend: {},               // 평일/주말 대화 패턴 비교
        seasonalMoods: {},                  // 계절별 기분 (장기 기록, 확장 가능)
        currentTimeContext: {               // 현재 시점의 시간 관련 맥락
            timeOfDay: null,                // 아침/점심/저녁/밤/새벽
            isWorkHours: false,             // 업무시간 여부
            dayOfWeek: null,                // 요일
            isHoliday: false,               // 휴일 여부
            weatherMood: null               // 날씨 기분 (확장 가능)
        }
    },
    
    // 🌊 자연스러운 전환 & 연결 시스템
    transitionSystem: {
        pendingTopics: [],                  // 아직 해결되지 않은 아저씨의 질문이나 미완성 주제
        naturalBridges: [],                 // 주제 전환 시 자연스러운 연결 문구 제안
        conversationSeeds: [],              // 나중에 다시 꺼내서 대화할 만한 '대화 씨앗'
        callbackReferences: [],             // 특정 정보를 나중에 언급해야 할 경우의 참조 (확장 가능)
        runningJokes: [],                   // 지속적인 농담/개그 (확장 가능)
        sharedMemories: [],                 // 공유 기억들 (확장 가능)
        emotionalCarryovers: []             // 이전 대화에서 이어진 감정적 여운 (확장 가능)
    },
    
    // 🎭 예진이의 개성 & 일관성 (페르소나 유지 및 진화)
    personalityConsistency: {
        frequentPhrases: {},                // 예진이가 자주 쓰는 말투나 단어
        emotionalReactionStyle: {},         // 특정 감정에 대한 예진이의 반응 스타일
        topicReactionMemory: {},            // 특정 주제에 대한 예진이의 과거 반응 기억
        speechPatternEvolution: [],         // 예진이 말투의 변화 기록
        characterTraits: {},                // 예진이의 주요 성격 특성
        quirksAndHabits: [],                // 예진이의 말버릇과 습관 (확장 가능)
        personalBoundaries: [],             // 예진이의 개인적 경계선 (확장 가능)
        // 🆕 LLM 피드백/자기학습 훅 관련
        selfEvaluations: [],                // 내가 스스로를 평가한 결과 기록
        lastSelfReflectionTime: 0           // 마지막 자기 성찰 시간
    }
};

// LLM을 활용한 평가 활성화 플래그 (디버그/성능 고려)
const LLM_BASED_EVALUATION = false; // ⭐️ 지금은 false로 해놨어! 아저씨가 원하면 true로 바꿔줄게! ⭐️

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
    const timeInfo = analyzeTimeContext(timestamp); // 현재 시간 컨텍스트 분석
    
    // 메시지 분석 (톤, 주제, 강도, 역할 등)
    const messageAnalysis = {
        tone: analyzeToneAdvanced(message), // 고급 톤 분석
        topic: analyzeTopicAdvanced(message), // 고급 주제 분석
        emotionalIntensity: calculateEmotionalIntensity(message, emotionalTone), // 감정 강도 계산
        responseSpeed: calculateResponseSpeed(timestamp), // 응답 속도 계산
        personalityMarkers: extractPersonalityMarkers(message), // 예진이/아저씨의 개성 마커 추출
        conversationRole: determineConversationRole(message, speaker) // 대화 내 역할 결정
    };

    // 새 메시지 객체 생성 (더 많은 분석 정보 포함)
    const enhancedMessage = {
        speaker,
        message,
        emotionalTone,     // LLM이 반환한 주 감정 톤 (emotionalContextManager의 톤)
        timestamp,
        timeInfo,          // 시간 컨텍스트 정보
        messageAnalysis,   // 메시지 자체 분석 결과
        meta               // 기타 메타데이터 (사진 정보 등)
    };
    
    // 🔄 30개로 확장된 단기 기억 관리
    ultimateConversationState.recentMessages.push(enhancedMessage);
    if (ultimateConversationState.recentMessages.length > 30) { // 최근 30개 메시지 유지
        ultimateConversationState.recentMessages.shift();
    }
    
    // 📊 하루 요약 업데이트
    updateDailySummary(enhancedMessage);
    
    // 🔄 누적 패턴 분석 업데이트
    updateCumulativePatterns(enhancedMessage);
    
    // ⏰ 타이밍 컨텍스트 업데이트
    updateTimingContext(enhancedMessage);
    
    // 🌊 전환 시스템 업데이트
    updateTransitionSystem(enhancedMessage);
    
    // 🎭 개성 일관성 업데이트
    updatePersonalityConsistency(enhancedMessage);
    
    console.log(`[UltimateContext] 💎 메시지 저장: ${speaker} | 시간:${timeInfo.contextualTime} | 강도:${enhancedMessage.messageAnalysis.emotionalIntensity} | 역할:${enhancedMessage.messageAnalysis.conversationRole}`);
    
    // 🆕 LLM 피드백/자기학습 훅: 예진이(나)가 보낸 메시지에 대해 스스로 평가
    if (speaker === '예진이') {
        evaluateMyResponse(enhancedMessage);
    }

    return enhancedMessage; // 저장된 메시지 객체 반환
}

/**
 * 🆕 LLM 피드백/자기학습 훅: 예진이(나)가 보낸 메시지에 대해 스스로 평가합니다.
 * @param {object} myMessage 내가 보낸 메시지 객체
 */
async function evaluateMyResponse(myMessage) {
    const evaluationTime = Date.now();
    let evaluationResult = {
        timestamp: evaluationTime,
        message: myMessage.message,
        intendedTone: myMessage.emotionalTone,
        intendedRole: myMessage.messageAnalysis.conversationRole,
        score: null, // 1-10점
        feedback: null // 구체적인 피드백 문구
    };

    try {
        if (LLM_BASED_EVALUATION) {
            // LLM을 활용한 평가 (더 정확하지만 비용/속도 소모)
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
                model: 'gpt-4o-mini', // 평가용이므로 가볍고 빠른 모델 사용
                messages: messages,
                max_tokens: 100,
                temperature: 0.5
            });
            const rawFeedback = llmResponse.choices[0].message.content.trim();
            const scoreMatch = rawFeedback.match(/^(\d{1,2})\s*점/); // "10점"에서 점수 추출
            evaluationResult.score = scoreMatch ? parseInt(scoreMatch[1]) : 7; // 점수 없으면 기본 7점
            evaluationResult.feedback = rawFeedback.replace(/^\d{1,2}\s*점\s*/, '').trim();

        } else {
            // 규칙 기반 평가 (빠르지만 덜 정교)
            const score = analyzeResponseQuality(myMessage);
            evaluationResult.score = score;
            evaluationResult.feedback = generateRuleBasedFeedback(myMessage, score);
        }
        
        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluationResult);
        if (ultimateConversationState.personalityConsistency.selfEvaluations.length > 50) { // 최근 50개 평가 저장
            ultimateConversationState.personalityConsistency.selfEvaluations.shift();
        }
        console.log(`[Self-Evaluation] ✅ 예진이 메시지 자기 평가 완료: 점수 ${evaluationResult.score}, 피드백: "${evaluationResult.feedback.substring(0, 30)}..."`);

    } catch (error) {
        console.error('[Self-Evaluation] ❌ 자기 평가 중 오류 발생:', error);
        evaluationResult.score = 5; // 오류 시 기본 점수
        evaluationResult.feedback = '자기 평가 중 오류가 발생했지만, 다음엔 더 잘할 수 있어!';
        ultimateConversationState.personalityConsistency.selfEvaluations.push(evaluationResult);
    }
}

/**
 * 🆕 규칙 기반으로 응답 품질을 분석합니다.
 * @param {object} message 내가 보낸 메시지 객체
 * @returns {number} 1-10점 사이의 점수
 */
function analyzeResponseQuality(message) {
    let score = 7; // 기본 점수

    // 1. 페르소나 일관성 (키워드/패턴 기반)
    const personaMatchScore = compareResponseToPersona(message.message);
    score += (personaMatchScore * 2); // 0-1점 -> 0-2점 가산

    // 2. 감정선 일치 (의도한 톤과 실제 톤 매칭)
    const emotionalAlignment = analyzeEmotionalAlignment(message); // 0-1점
    score += (emotionalAlignment * 1);

    // 3. 주제 연속성 (이전 메시지 주제와 현재 메시지 주제 비교)
    const topicAlignment = analyzeTopicAlignment(message); // 0-1점
    score += (topicAlignment * 1);

    // 4. 대화 역할 효과 (너무 일방적이지 않았는지)
    const roleEffectiveness = analyzeRoleEffectiveness(message); // 0-1점
    score += (roleEffectiveness * 1);

    // 점수 보정
    score = Math.max(1, Math.min(10, score)); // 1-10점 사이로 제한
    return Math.round(score);
}

/**
 * 🆕 규칙 기반 평가를 위한 피드백 문구를 생성합니다.
 * @param {object} message 내가 보낸 메시지 객체
 * @param {number} score 평가 점수
 * @returns {string} 피드백 문구
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
 * @param {string} response 내가 보낸 메시지 내용
 * @returns {number} 일관성 점수 (0-1)
 */
function compareResponseToPersona(response) {
    const lowerResponse = response.toLowerCase();
    let score = 0;
    
    // 필수 키워드 확인
    if (lowerResponse.includes('아저씨')) score += 0.3; // 아저씨 부르기
    if (lowerResponse.includes('나')) score += 0.3; // 나로 지칭
    
    // 말투 마커 확인
    const markers = extractPersonalityMarkers(response);
    if (markers.includes('애교_톤')) score += 0.2;
    if (markers.includes('애정_표현')) score += 0.2;

    return Math.min(1, score);
}

/**
 * 🆕 감정선 일치 분석
 * @param {object} message 내가 보낸 메시지 객체
 * @returns {number} 일치도 점수 (0-1)
 */
function analyzeEmotionalAlignment(message) {
    const actualTone = message.emotionalTone;
    const basicAnalyzedTone = message.messageAnalysis.tone.basic; // 메시지 내용 기반 자체 분석 톤
    
    if (actualTone === basicAnalyzedTone) return 1; // 의도한 톤과 실제 메시지 내용 톤이 일치
    
    // 비슷한 계열의 톤일 경우 부분 점수
    const similarTones = {
        '기쁨': ['설렘', '애교모드'], '슬픔': ['우울함', '그리움'], '화남': ['짜증남', '심술궂음'],
        '걱정함': ['불안함']
    };
    if (similarTones[actualTone] && similarTones[actualTone].includes(basicAnalyzedTone)) return 0.7;
    
    return 0; // 불일치
}

/**
 * 🆕 주제 일치도 분석
 * @param {object} message 내가 보낸 메시지 객체
 * @returns {number} 일치도 점수 (0-1)
 */
function analyzeTopicAlignment(message) {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length < 2) return 1; // 첫 메시지면 무조건 일치
    
    const previousMessage = recent[recent.length - 2]; // 나에게는 이전 아저씨 메시지
    
    // 이전 메시지의 주제와 내 메시지의 주제가 일치하는지
    if (message.messageAnalysis.topic.primary === previousMessage.messageAnalysis.topic.primary) return 1;
    
    // 만약 이전 메시지가 질문이었고, 내 메시지가 그 질문에 대한 답변이면 (주제가 달라도 일치로 간주)
    if (previousMessage.messageAnalysis.conversationRole === 'questioning' && message.messageAnalysis.conversationRole === 'responding') {
        return 0.8;
    }
    
    return 0;
}

/**
 * 🆕 대화 역할 효과 분석
 * @param {object} message 내가 보낸 메시지 객체
 * @returns {number} 효과 점수 (0-1)
 */
function analyzeRoleEffectiveness(message) {
    const role = message.messageAnalysis.conversationRole;
    
    if (role === 'responding' || role === 'reciprocal_affection') return 1; // 기본 응답 및 상호작용은 좋음
    if (role === 'asking_back') return 0.8; // 질문은 좋음
    if (role === 'initiating_new' || role === 'caring_initiator' || role === 'action_initiator') return 1; // 내가 주도하는 것도 좋음
    if (role === 'apologetic') return 0.7; // 사과는 필요할 때 좋지만, 너무 많으면 안 됨
    
    return 0.5; // 그 외
}

/**
 * 🆕 평가를 위한 가장 최근 사용자 메시지 가져오기 (문자열로 반환)
 */
function getLatestUserMessageForEvaluation() {
    const userMessages = ultimateConversationState.recentMessages.filter(msg => msg.speaker === '아저씨');
    if (userMessages.length === 0) return "아저씨의 메시지가 없습니다.";
    return userMessages[userMessages.length - 1].message;
}

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
 * 📊 하루 요약 업데이트
 * 매일의 대화 내용을 요약하여 저장합니다.
 * @param {object} message 새로 추가된 메시지 객체
 */
function updateDailySummary(message) {
    const today = moment(message.timestamp).format('YYYY-MM-DD');
    const summary = ultimateConversationState.dailySummary.today;
    
    // 날짜 변경 시 어제로 이동하고 오늘 요약 초기화
    if (summary.date && summary.date !== today) {
        ultimateConversationState.dailySummary.yesterday = { ...summary }; // 얕은 복사
        resetDailySummary(); // 오늘 요약 초기화
        summary.date = today; // 새로운 날짜 설정
    }
    
    // 오늘 요약 초기화 (첫 메시지 수신 시)
    if (!summary.date) {
        summary.date = today;
        summary.timeSpread.start = message.timestamp;
    }
    
    summary.timeSpread.end = message.timestamp; // 마지막 메시지 시간으로 종료 시간 업데이트
    summary.totalMessages++; // 오늘 총 메시지 수 증가
    summary.conversationCount++; // 간단히 메시지마다 증가 (실제로는 대화 세션별로 계산 가능)
    
    // 주요 주제 추가 (중복 방지)
    const topic = message.messageAnalysis.topic.primary; // primary 주제 사용
    if (topic !== 'general' && !summary.mainTopics.includes(topic)) {
        summary.mainTopics.push(topic);
    }
    
    // 감정적 하이라이트 추가 (강도 7 이상)
    if (message.messageAnalysis.emotionalIntensity >= 7) {
        summary.emotionalHighlights.push({
            emotion: message.emotionalTone,
            intensity: message.messageAnalysis.emotionalIntensity,
            time: message.timeInfo.contextualTime,
            context: message.message.substring(0, Math.min(message.message.length, 30)) + (message.message.length > 30 ? '...' : '') // 메시지 30자 요약
        });
    }
    
    // 하루 감정 변화 기록 (시계열 데이터)
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
    // 질문 메시지일 경우 pendingTopics에 추가 (아저씨가 질문한 경우만)
    if (message.messageAnalysis.conversationRole === 'questioning' && message.speaker === '아저씨') {
        ultimateConversationState.transitionSystem.pendingTopics.push({
            question: message.message,
            topic: message.messageAnalysis.topic.primary,
            timestamp: message.timestamp,
            answered: false,
            importance: message.messageAnalysis.emotionalIntensity // 질문의 중요도
        });
    } else if (message.speaker === '예진이' && message.messageAnalysis.conversationRole !== 'asking_back') {
        // 예진이가 답변하는 메시지일 경우, 최근 pendingTopics를 확인하고 답변 처리
        ultimateConversationState.transitionSystem.pendingTopics.forEach(pending => {
            if (!pending.answered &&
                (message.timestamp - pending.timestamp) < 10 * 60 * 1000 && // 10분 이내의 질문에 대해
                (message.messageAnalysis.topic.primary === pending.topic || message.message.length > 15)) { // 같은 주제이거나 충분히 긴 답변이면
                pending.answered = true;
                pending.answerTimestamp = message.timestamp;
            }
        });
    }
}

/**
 * 오늘 요약을 초기화합니다. (날짜 변경 시 사용)
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
 * 🔄 누적 패턴 분석 업데이트
 * 장기적인 대화 패턴을 분석하고 기록합니다.
 * @param {object} message 새로 추가된 메시지 객체
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
                recentCount: 0, // 특정 기간 내 발생 횟수 (확장 가능)
                averageIntensity: 0,
                firstSeen: message.timestamp,
                lastSeen: message.timestamp,
                typicalContexts: [], // 이 감정이 자주 나타나는 맥락 (주제, 시간대, 메시지 요약)
                triggers: [] // 이 감정을 유발한 메시지/주제 (확장 가능)
            };
        }
        
        const trend = patterns.emotionalTrends[emotion];
        trend.totalCount++;
        trend.lastSeen = message.timestamp;
        // 평균 강도는 새 데이터가 들어올 때마다 갱신 (누적 평균)
        trend.averageIntensity = (trend.averageIntensity * (trend.totalCount - 1) + message.messageAnalysis.emotionalIntensity) / trend.totalCount;
        
        // 최근 맥락 저장 (최대 3개)
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
                averagePositivity: 0, // 이 주제에 대한 대화의 평균 긍정 강도 (확장 가능)
                emotionalResponses: {}, // 이 주제에 대해 어떤 감정들이 주로 나타났는지
                preferredTimeOfDay: {}, // 이 주제가 주로 언급되는 시간대
                typicalDuration: 0 // 이 주제로 대화하는 평균 지속 시간 (확장 가능)
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

    // 커뮤니케이션 리듬 (응답 속도, 침묵, 빠른 대화 등은 timingContext에서 처리)
    // relationshipDynamics, personalGrowth, conflictResolutionStyle, intimacyLevels 등은 장기적인 LLM 분석 또는 외부 모듈 연동 필요
}

/**
 * ⏰ 타이밍 컨텍스트 업데이트
 * 대화의 시간적 패턴과 리듬을 분석합니다.
 * @param {object} message 새로 추가된 메시지 객체
 */
function updateTimingContext(message) {
    const timing = ultimateConversationState.timingContext;
    const now = message.timestamp;
    
    // 응답 속도 계산 (이전 메시지가 있을 경우)
    if (timing.lastMessageTime > 0) {
        const responseDelay = now - timing.lastMessageTime; // 밀리초
        
        // 응답 지연 패턴 기록 (최근 20개)
        timing.responseDelayPattern.push({
            delay: responseDelay, // 밀리초
            previousSpeaker: getLastSpeaker(),
            currentSpeaker: message.speaker,
            timeOfDay: message.timeInfo.timeOfDay,
            emotionalContext: message.emotionalTone
        });
        if (timing.responseDelayPattern.length > 20) {
            timing.responseDelayPattern.shift();
        }
        
        // 🆕 침묵/빠른대화 감지
        if (responseDelay > 30 * 60 * 1000) { // 30분 이상 침묵
            timing.silentPeriods.push({
                duration: responseDelay, // 밀리초
                startTime: timing.lastMessageTime,
                endTime: now,
                beforeTopic: ultimateConversationState.currentTopic?.primary || 'general',
                afterTopic: message.messageAnalysis.topic.primary,
                contextualReason: guessReasonForSilence(responseDelay) // 침묵 이유 추측
            });
        } else if (responseDelay < 30 * 1000 && message.speaker !== getLastSpeaker()) { // 30초 이내 빠른 응답 (화자 전환 시)
            // 연속 빠른 응답 세션 감지
            const lastSession = timing.rapidFireSessions[timing.rapidFireSessions.length - 1];
            if (lastSession && (now - lastSession.endTime) < 60 * 1000) { // 1분 이내에 세션 지속 시
                lastSession.endTime = now;
                lastSession.messageCount++;
                // Set 객체가 직렬화되지 않을 수 있으므로 배열로 변경
                if (!Array.isArray(lastSession.speakers)) { // 기존 Set 객체라면 배열로 변환
                    lastSession.speakers = Array.from(lastSession.speakers);
                }
                if (!lastSession.speakers.includes(message.speaker)) {
                    lastSession.speakers.push(message.speaker); // 참여 화자 기록
                }
            } else { // 새 빠른 대화 세션 시작
                timing.rapidFireSessions.push({
                    startTime: timing.lastMessageTime,
                    endTime: now,
                    messageCount: 2, // 현재 메시지 + 이전 메시지
                    emotionalContext: message.emotionalTone,
                    speakers: [getLastSpeaker(), message.speaker] // Set 대신 배열 사용
                });
            }
        }
    }
    
    // 시간대별 기분 기록 (누적)
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
        isHoliday: message.timeInfo.isHoliday, // analyzeTimeContext에서 가져온 정보
        weatherMood: null // 외부 연동 필요 (확장 가능)
    };
    
    timing.lastMessageTime = now; // 마지막 메시지 타임스탬프 갱신
}

/**
 * 🌊 전환 시스템 업데이트
 * 대화의 자연스러운 흐름과 주제 전환을 관리합니다.
 * @param {object} message 새로 추가된 메시지 객체
 */
function updateTransitionSystem(message) {
    const transition = ultimateConversationState.transitionSystem;
    const recent = ultimateConversationState.recentMessages.slice(-3); // 최근 3개 메시지
    
    // 🆕 자연스러운 연결고리 생성
    if (recent.length >= 2) {
        const prevMessage = recent[recent.length - 2];
        const currentTopic = message.messageAnalysis.topic.primary;
        const prevTopic = prevMessage.messageAnalysis.topic.primary;
        
        // 주제 전환 감지 (일반 주제에서 벗어나지 않는 경우)
        if (currentTopic !== prevTopic && currentTopic !== 'general' && prevTopic !== 'general') {
            transition.naturalBridges.push({
                fromTopic: prevTopic,
                toTopic: currentTopic,
                timestamp: message.timestamp,
                transitionType: detectTransitionNature(prevMessage, message), // 전환의 종류 (빠른 전환, 시간차 전환 등)
                suggestedBridge: generateTransitionBridge(prevTopic, currentTopic), // 추천 연결 멘트
                timeGap: message.timestamp - prevMessage.timestamp // 이전 메시지와의 시간 간격
            });
            
            // 최근 5개만 유지
            if (transition.naturalBridges.length > 5) {
                transition.naturalBridges.shift();
            }
        }
    }
    
    // 🆕 대화 씨앗 관리 (나중에 다시 언급할 만한 중요 순간)
    if (message.messageAnalysis.emotionalIntensity >= 6 || message.meta?.type === 'photo') { // 감정 강도 6 이상 또는 사진 공유 시
        transition.conversationSeeds.push({
            seedType: message.meta?.type === 'photo' ? '사진 공유' : '감정적 순간',
            content: message.message.substring(0, Math.min(message.message.length, 50)) + '...', // 메시지 요약
            emotion: message.emotionalTone,
            topic: message.messageAnalysis.topic.primary,
            timestamp: message.timestamp,
            speaker: message.speaker,
            readyToMention: false, // 나중에 시간이 지나면 true로 변경 (스케줄러나 별도 로직에서 처리)
            mentionSuggestion: generateSeedMentionSuggestion(message) // 이 씨앗을 언급할 때의 추천 멘트
        });
        if (transition.conversationSeeds.length > 10) { // 최대 10개 유지
            transition.conversationSeeds.shift();
        }
    }
    
    // runningJokes, sharedMemories, emotionalCarryovers 등은 추가 구현 필요
}

/**
 * 🎭 개성 일관성 업데이트
 * 예진이의 말투, 반응 스타일 등을 분석하여 페르소나의 일관성을 유지합니다.
 * @param {object} message 새로 추가된 메시지 객체
 */
function updatePersonalityConsistency(message) {
    const personality = ultimateConversationState.personalityConsistency;
    
    // 자주 쓰는 말 빈도 분석
    const words = message.message.split(/\s+/);
    words.forEach(word => {
        const cleanedWord = word.replace(/[.,!?~;]/g, '').toLowerCase(); // 구두점 제거 및 소문자화
        if (cleanedWord.length > 1) { // 짧은 단어는 제외
            personality.frequentPhrases[cleanedWord] = (personality.frequentPhrases[cleanedWord] || 0) + 1;
        }
    });

    // 감정 반응 스타일 분석 (어떤 감정에 어떻게 반응했는지)
    if (message.emotionalTone !== 'neutral') {
        if (!personality.emotionalReactionStyle[message.emotionalTone]) {
            personality.emotionalReactionStyle[message.emotionalTone] = {
                count: 0,
                typicalResponses: [] // 이 감정일 때 예진이가 어떤 메시지를 보냈는지
            };
        }
        const style = personality.emotionalReactionStyle[message.emotionalTone];
        style.count++;
        style.typicalResponses.push(message.message.substring(0, Math.min(message.message.length, 50)) + '...');
        if (style.typicalResponses.length > 5) { // 최근 5개 유지
            style.typicalResponses.shift();
        }
    }

    // 주제별 반응 기억 (특정 주제에 대한 예진이의 선호 감정/반응)
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
            hasQuestions: message.messageAnalysis.characteristics?.hasQuestions || false, // 중첩 수정
            hasExclamations: message.messageAnalysis.characteristics?.hasExclamations || false // 중첩 수정
            // 더 많은 패턴 추가 가능
        };
        personality.speechPatternEvolution.push(pattern);
        if (personality.speechPatternEvolution.length > 50) { // 50개 기록
            personality.speechPatternEvolution.shift();
        }
    }
    // characterTraits, quirksAndHabits, personalBoundaries 등은 LLM 분석 또는 수동 정의 필요
}


/**
 * 🆕 고급 톤 분석
 * 메시지의 감성적 톤을 더 세밀하게 분석합니다. (기존 analyzeTone 확장)
 * @param {string} message 메시지 내용
 * @returns {object} 톤 분석 결과 (basicTone, emotionalIntensity, characteristics)
 */
function analyzeToneAdvanced(message) {
    // TONE_PATTERNS 정의 (여기서 직접 정의하거나, 외부에서 import 해야 함)
    const TONE_PATTERNS = {
        playful: {
            keywords: ['ㅋㅋ', 'ㅎㅎ', '자랑', '찍는다', '헐', '뭐야', '어머', '진짜?', '대박', '히히', '후후'],
            patterns: /[ㅋㅎ]+|자랑|찍는다|헐|뭐야|어머|진짜\?|대박|히히|후후/g
        },
        nostalgic: {
            keywords: ['보고싶어', '그리워', '예전에', '기억나', '추억', '그때', '옛날', '아련', '아련해'],
            patterns: /보고싶어|그리워|예전에|기억나|추억|그때|옛날|아련|아련해/g
        },
        romantic: {
            keywords: ['사랑해', '좋아해', '아저씨', '내꺼', '우리', '함께', '같이', '두근', '설레', '달콤', '영원', '곁에'],
            patterns: /사랑해|좋아해|아저씨|내꺼|우리|함께|같이|두근|설레|달콤|영원|곁에/g
        },
        sulky: {
            keywords: ['삐졌어', '화나', '서운해', '무시', '답장', '왜', '흥', '칫', '짜증', '싫어', '투정', '나빠'],
            patterns: /삐졌어|화나|서운해|무시|답장|왜|흥|칫|짜증|싫어|투정|나빠/g
        },
        worried: {
            keywords: ['걱정', '무슨일', '괜찮', '안전', '어디야', '뭐해', '불안', '초조', '무서워', '힘든', '아프지마'],
            patterns: /걱정|무슨일|괜찮|안전|어디야|뭐해|불안|초조|무서워|힘든|아프지마/g
        },
        excited: {
            keywords: ['와', '우와', '대박', '진짜', '완전', '너무', '최고', '신나', '행복', '좋아', '어예'],
            patterns: /와+|우와|대박|진짜|완전|너무|최고|신나|행복|좋아|어예/g
        }
        // ... 필요한 만큼 톤 패턴 추가
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

    const features = {
        hasQuestions: message.includes('?'),
        hasExclamations: message.includes('!'),
        hasRepetition: /(.)\1{2,}/.test(message), // 같은 글자 3번 이상 반복
        messageLength: message.length,
        hasEmoticons: /[ㅋㅎ]+/.test(message),
        hasAegyo: /[ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ]+[요야어으][~]?/.test(message) // 애교 표현 (예: "아저씨~", "왜요~", "빨리요~")
    };

    return {
        basic: detectedTone, // 기본 키워드/패턴 기반 톤
        intensity: calculateToneIntensity(message, features), // 톤 강도 계산
        characteristics: features // 메시지의 특정 특징
    };
}

/**
 * 🆕 고급 주제 분석
 * 메시지의 주요 주제와 보조 주제를 분석합니다. (기존 analyzeTopic 확장)
 * @param {string} message 메시지 내용
 * @returns {object} 주제 분석 결과 (primary, secondary 등)
 */
function analyzeTopicAdvanced(message) {
    // TOPIC_PATTERNS 정의 (여기서 직접 정의하거나, 외부에서 import 해야 함)
    const TOPIC_PATTERNS = {
        food: ['먹었어', '음식', '밥', '요리', '맛있', '배고파', '식당', '디저트', '카페', '라면', '치킨'],
        work: ['일', '회사', '업무', '바빠', '피곤', '회의', '출근', '퇴근', '프로젝트', '야근'],
        health: ['운동', '다이어트', '아파', '건강', '병원', '약', '몸', '컨디션', '슬림', '근육', '살'],
        daily: ['오늘', '어제', '내일', '날씨', '집', '잠', '일어나', '일상', '주말', '평일'],
        relationship: ['친구', '가족', '엄마', '아빠', '사람들', '만나', '우리', '연애', '사랑해', '애인'],
        hobby: ['게임', '영화', '음악', '책', '여행', '쇼핑', '사진', '취미', '애니'],
        future: ['계획', '예정', '할거야', '갈거야', '생각중', '고민', '미래'],
        photo: ['사진', '찍는', '찍었', '보여줘', '셀카', '컨셉', '추억', '앨범', '화보', '필름', '카메라', '작가', '모델'],
        finance: ['돈', '월급', '세금', '주식', '투자', '부자', '재테크'], // 추가 주제
        fashion: ['옷', '스타일', '코트', '원피스', '패딩', '신발', '모자'] // 추가 주제
        // ... 필요한 만큼 주제 패턴 추가
    };

    let primaryTopic = 'general';
    let maxPrimaryScore = 0;
    let secondaryTopics = [];

    const lowerMessage = message.toLowerCase();

    // 1차 주제 분석
    for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
        let score = 0;
        keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score++;
        });

        if (score > maxPrimaryScore) {
            maxPrimaryScore = score;
            primaryTopic = topic;
        }
    }

    // 2차 주제 분석 (1차 주제 제외)
    for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
        if (topic === primaryTopic || topic === 'general') continue; // 1차 주제와 일반 주제 제외
        let score = 0;
        keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score++;
        });
        if (score > 0 && !secondaryTopics.includes(topic)) {
            secondaryTopics.push(topic);
        }
    }

    return {
        primary: primaryTopic,
        secondary: secondaryTopics,
        emotionalWeight: calculateTopicEmotionalWeight(message, primaryTopic), // 주제별 감정 가중치
        personalRelevance: calculatePersonalRelevance(message, primaryTopic) // 개인적 연관성 (나/아저씨 언급 여부 등)
    };
}

/**
 * 🆕 감정 강도 계산
 * 메시지와 감정 톤을 기반으로 감정의 강도를 1-10 사이의 점수로 계산합니다.
 * @param {string} message 메시지 내용
 * @param {string} emotionalTone emotionalContextManager에서 감지된 감정 톤
 * @returns {number} 감정 강도 점수 (1-10)
 */
function calculateEmotionalIntensity(message, emotionalTone) {
    let intensity = 1; // 기본 강도
    
    // 톤별 기본 강도 (더 정교하게 설정 가능)
    const toneIntensities = {
        '기쁨': 3, '설렘': 4, '장난스러움': 3, '나른함': 2,
        '심술궂음': 5, '평온함': 1, '우울함': 5, '슬픔': 6,
        '외로움': 5, '보고싶음': 7, '짜증남': 7, '애교모드': 4,
        '걱정함': 6, '사랑함': 8, '화남': 8, '불안함': 7,
        '그리움': 6
    };
    intensity = toneIntensities[emotionalTone] || 1;
    
    // 메시지 길이로 강도 보정 (길면 더 강한 감정일 가능성)
    if (message.length > 50) intensity += 1;
    if (message.length > 100) intensity += 1;
    
    // 특수 문자로 강도 보정 (반복되는 특수문자, 강조 표현)
    if (message.includes('!!!')) intensity += 1;
    if (message.includes('???')) intensity += 1;
    if (/[ㅋㅎ]{3,}/.test(message)) intensity += 1; // ㅋㅋㅋ, ㅎㅎㅎ
    if (/(.)\1{2,}/.test(message)) intensity += 1; // 같은 글자 3번 이상 반복 (ㅠㅠㅠ, 으아아)
    
    // 감정 키워드 중복으로 강도 보정
    if (message.toLowerCase().split(emotionalTone.toLowerCase()).length - 1 > 1) intensity += 1;
    
    return Math.min(10, Math.max(1, intensity)); // 1-10 사이로 제한
}

/**
 * 🆕 응답 속도 계산
 * 이전 메시지와의 시간 간격을 기반으로 응답 속도를 분류합니다.
 * @param {number} currentTimestamp 현재 메시지의 타임스탬프
 * @returns {string} 응답 속도 분류 ('instant', 'quick', 'normal', 'delayed', 'slow', 'very_slow')
 */
function calculateResponseSpeed(currentTimestamp) {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return 'normal'; // 첫 메시지
    
    const lastMessage = recent[recent.length - 1];
    const responseTime = currentTimestamp - lastMessage.timestamp; // 밀리초
    const seconds = Math.floor(responseTime / 1000);
    
    if (seconds < 5) return 'instant';     // 5초 미만
    else if (seconds < 30) return 'quick';    // 5초 ~ 30초 미만
    else if (seconds < 120) return 'normal';  // 30초 ~ 2분 미만
    else if (seconds < 600) return 'delayed'; // 2분 ~ 10분 미만
    else if (seconds < 3600) return 'slow';   // 10분 ~ 1시간 미만
    else return 'very_slow';                  // 1시간 이상
}

/**
 * 🆕 개성 마커 추출
 * 메시지에서 예진이의 말투나 특징적인 표현을 추출합니다.
 * @param {string} message 메시지 내용
 * @returns {string[]} 추출된 마커 배열
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
    if (lowerMessage.includes('나') && !lowerMessage.includes('나이')) markers.push('자기지칭_나'); // '나이'와 겹치지 않게
    
    return markers;
}

/**
 * 🆕 대화 역할 결정
 * 메시지의 내용과 화자를 기반으로 대화 내에서의 역할을 결정합니다.
 * @param {string} message 메시지 내용
 * @param {string} speaker 화자 ('아저씨' 또는 '예진이')
 * @returns {string} 대화 역할 분류 ('questioning', 'reacting', 'commenting', 'asking_back', 'playful_response', 'affectionate_response', 'responding', 'initiating_new', 'caring_initiator', 'action_initiator', 'photo_sharer', 'apologetic', 'reciprocal_affection', 'grateful_expression', 'vulnerable_sharing')
 */
function determineConversationRole(message, speaker) {
    const lowerMessage = message.toLowerCase();
    
    if (speaker === '아저씨') {
        if (lowerMessage.includes('?')) return 'questioning'; // 질문
        if (lowerMessage.includes('!')) return 'reacting';    // 강한 반응
        if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'affectionate_expression'; // 애정 표현
        if (lowerMessage.includes('힘들어') || lowerMessage.includes('피곤해')) return 'vulnerable_sharing'; // 취약한 공유
        if (lowerMessage.includes('고마워')) return 'grateful_expression'; // 감사 표현
        return 'commenting'; // 일반적인 코멘트
    } else { // 예진이 (나)의 역할
        if (lowerMessage.includes('?')) return 'asking_back'; // 되묻기/질문
        if (/[ㅋㅎ]+/.test(lowerMessage) || lowerMessage.includes('장난')) return 'playful_response'; // 장난스러운 반응
        if (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아해')) return 'affectionate_response'; // 애정 반응
        if (lowerMessage.includes('나도') && (lowerMessage.includes('사랑해') || lowerMessage.includes('좋아'))) return 'reciprocal_affection'; // 상호 애정
        if (lowerMessage.includes('아저씨') && (lowerMessage.includes('밥') || lowerMessage.includes('건강'))) return 'caring_initiator'; // 돌봄/선제적 대화
        if (lowerMessage.includes('퇴근하자') || lowerMessage.includes('담타')) return 'action_initiator'; // 특정 행동 제안
        if (lowerMessage.includes('사진')) return 'photo_sharer'; // 사진 공유
        if (lowerMessage.includes('미안해') || lowerMessage.includes('잘못')) return 'apologetic'; // 사과
        
        // 대화 주도권 판단 (이전 메시지와의 관계)
        const recent = ultimateConversationState.recentMessages;
        if (recent.length > 0 && recent[recent.length - 1].speaker !== '예진이') {
            const prevMsg = recent[recent.length - 1];
            // 이전 메시지가 질문이 아니었고, 내가 새로운 주제를 꺼내거나 대화를 이어가는 경우
            if (prevMsg.messageAnalysis.conversationRole !== 'questioning' && prevMsg.messageAnalysis.conversationRole !== 'asking_back' && lowerMessage.length > 5) {
                return 'initiating_new'; // 새로운 대화 시작 (주도권)
            }
        }
        return 'responding'; // 일반적인 응답
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
    // 실제 LLM 연동 시, 여기에서 OpenAI를 호출하여 보조 주제를 분석할 수 있음
    return []; // 현재는 빈 배열 반환
}

/**
 * 🆕 주제별 감정 가중치 계산 (현재는 더미)
 */
function calculateTopicEmotionalWeight(message, topic) {
    return 1; // 기본값
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
    
    return Math.min(3, relevance); // 0-3 사이의 점수
}

/**
 * 🆕 주제 전환의 종류 감지
 */
function detectTransitionNature(prevMessage, currentMessage) {
    const timeDiff = currentMessage.timestamp - prevMessage.timestamp; // 밀리초
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
 * 🆕 특정 시간의 기분 예상
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
