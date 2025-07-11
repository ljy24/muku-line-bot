// src/ultimateConversationContext.js v3.1 - 진짜 사람처럼 대화하는 완전체 시스템
// 🆕 LLM 피드백/자기학습 훅 기능 통합
// 🛠️ addUltimateMessage ReferenceError 해결 (함수 정의 순서 최상단으로 이동)

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

// --- 🎯 메인 함수들 (가장 상단에 정의하여 ReferenceError 방지) ---

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

// --- 🆕 보조 함수들 (메인 함수들 아래에 정의) ---

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
        console.log(`[Self-Evaluation] ✅ 예진이 메시지 자기 평가 완료: 점수 ${evaluationResult.score}, 피드백: "${evaluationResult.feedback.substring(0, Math.min(evaluationResult.feedback.length, 30))}..."`);

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
 * 🆕 주제 전환용 자연스러운 연결고리 생성
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

/**
 * 🆕 마지막 화자 가져오기 (최근 메시지 배열 기반)
 */
function getLastSpeaker() {
    const recent = ultimateConversationState.recentMessages;
    if (recent.length === 0) return null;
    return recent[recent.length - 1].speaker;
}

// --- 📊 요약 생성 보조 함수들 ---

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
    generateTransitionBridge, // ⭐️ 이 함수가 ReferenceError를 일으켰던 함수 ⭐️
    
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
