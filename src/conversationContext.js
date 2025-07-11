// src/conversationContext.js v1.0 - 대화 흐름 맥락 관리 시스템
// - 🆕 최근 대화 메시지 저장 및 분석
// - 🆕 대화 톤/흐름 자동 감지
// - 🆕 감정선 연결성 유지
// - 🆕 말투 일관성 보장
// - 🆕 주제 연결성 추적

const moment = require('moment-timezone');

// 대화 맥락 상태 관리
let conversationState = {
    recentMessages: [],           // 최근 메시지들 (최대 10개)
    currentTone: 'neutral',       // 현재 대화 톤 (emotionalContextManager의 톤과 연동)
    currentTopic: null,           // 현재 주제 (사진 정보 등 구체적인 객체 가능)
    emotionFlow: [],              // 감정 흐름 기록 (emotionalContextManager의 이벤트 기록)
    conversationDepth: 0,         // 대화 깊이 (연속성)
    lastContextUpdate: 0,         // 마지막 맥락 업데이트 시간
    flowPattern: 'normal',        // 대화 패턴
    responseStyle: 'casual',      // 응답 스타일 (미사용, 확장 가능)
    topicContinuity: 0            // 주제 연속성 점수
};

// 대화 톤 분류 설정 (주로 emotionalContextManager의 톤을 따르지만, 자체 분석도 가능)
const TONE_PATTERNS = {
    playful: {
        keywords: ['ㅋㅋ', 'ㅎㅎ', '자랑', '찍는다', '헐', '뭐야', '어머', '진짜?', '대박'],
        emoji: ['😄', '😊', '🤭', '😂'],
        patterns: /[ㅋㅎ]+|자랑|찍는다|헐|뭐야|어머|진짜\?|대박/g
    },
    nostalgic: {
        keywords: ['보고싶어', '그리워', '예전에', '기억나', '추억', '그때', '옛날', '아련'],
        emoji: ['😢', '🥺', '😌', '💭'],
        patterns: /보고싶어|그리워|예전에|기억나|추억|그때|옛날|아련/g
    },
    romantic: {
        keywords: ['사랑해', '좋아해', '아저씨', '내꺼', '우리', '함께', '같이', '두근', '설레'],
        emoji: ['💕', '❤️', '😍', '🥰'],
        patterns: /사랑해|좋아해|아저씨|내꺼|우리|함께|같이|두근|설레/g
    },
    sulky: {
        keywords: ['삐졌어', '화나', '서운해', '무시', '답장', '왜', '흥', '칫', '짜증'],
        emoji: ['😤', '😠', '😢', '🥺'],
        patterns: /삐졌어|화나|서운해|무시|답장|왜|흥|칫|짜증/g
    },
    worried: {
        keywords: ['걱정', '무슨일', '괜찮', '안전', '어디야', '뭐해', '불안', '초조'],
        emoji: ['😰', '😟', '😨', '🥺'],
        patterns: /걱정|무슨일|괜찮|안전|어디야|뭐해|불안|초조/g
    },
    excited: {
        keywords: ['와', '우와', '대박', '진짜', '완전', '너무', '최고', '신나', '행복'],
        emoji: ['🤩', '😍', '🎉', '✨'],
        patterns: /와+|우와|대박|진짜|완전|너무|최고|신나|행복/g
    }
};

// 주제 분류 설정 (더 확장 가능)
const TOPIC_PATTERNS = {
    food: ['먹었어', '음식', '밥', '요리', '맛있', '배고파', '식당', '디저트', '카페'],
    work: ['일', '회사', '업무', '바빠', '피곤', '회의', '출근', '퇴근', '프로젝트'],
    health: ['운동', '다이어트', '아파', '건강', '병원', '약', '몸', '컨디션'],
    daily: ['오늘', '어제', '내일', '날씨', '집', '잠', '일어나', '일상'],
    relationship: ['친구', '가족', '엄마', '아빠', '사람들', '만나', '우리', '연애'],
    hobby: ['게임', '영화', '음악', '책', '여행', '쇼핑', '사진', '취미'],
    future: ['계획', '예정', '할거야', '갈거야', '생각중', '고민', '미래'],
    // 🆕 사진 관련 주제 키워드 추가
    photo: ['사진', '찍는', '찍었', '보여줘', '셀카', '컨셉', '추억', '앨범', '화보', '필름'] 
};

/**
 * 🆕 새 메시지 추가 및 맥락 업데이트
 * @param {string} speaker 화자 ('아저씨' 또는 '예진이')
 * @param {string} message 메시지 내용
 * @param {string} emotionalTone emotionalContextManager에서 감지된 감정 톤 (예: 'playful', 'anxious')
 * @param {object} meta 메시지 메타데이터 (예: { type: 'photo', concept: '세미누드', date: '2025-02-07', url: '...' })
 */
function addMessage(speaker, message, emotionalTone = 'neutral', meta = null) {
    const timestamp = Date.now();
    
    // 새 메시지 객체 생성
    const newMessage = {
        speaker,
        message,
        emotionalTone, // emotionalContextManager의 톤 사용
        timestamp,
        tone: analyzeTone(message), // 자체 키워드 톤 분석 (추가 정보)
        topic: analyzeTopic(message),
        meta // 메타데이터 포함
    };
    
    // 최근 메시지에 추가 (최대 10개 유지)
    conversationState.recentMessages.push(newMessage);
    if (conversationState.recentMessages.length > 10) {
        conversationState.recentMessages.shift();
    }
    
    // 대화 맥락 업데이트
    updateConversationContext();
    
    console.log(`[ConversationContext] 📝 메시지 추가: ${speaker} - "${message}" (LLM톤: ${emotionalTone}, 자체톤: ${newMessage.tone}, 주제: ${newMessage.topic}, 메타: ${JSON.stringify(meta)})`);
    
    return newMessage;
}

/**
 * 🆕 메시지의 톤 분석 (자체 키워드 기반, emotionalContextManager와는 별개)
 * @param {string} message 메시지 내용
 * @returns {string} 감지된 톤
 */
function analyzeTone(message) {
    let maxScore = 0;
    let detectedTone = 'neutral';
    const lowerMessage = message.toLowerCase();
    
    // 각 톤별로 점수 계산
    for (const [tone, config] of Object.entries(TONE_PATTERNS)) {
        let score = 0;
        
        // 키워드 매칭
        config.keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) score += 2;
        });
        
        // 패턴 매칭 (정규식 사용)
        if (config.patterns) {
            const matches = lowerMessage.match(config.patterns);
            if (matches) score += matches.length;
        }
        
        // 이모지 매칭 (여기서는 MOOD_EMOJIS를 사용하지 않으므로, 이모지 문자 자체로 매칭)
        // cleanReply에서 이모지가 제거되므로, 여기서는 효과가 미미할 수 있음.
        // config.emoji.forEach(emoji => {
        //     if (message.includes(emoji)) score += 1;
        // });
        
        if (score > maxScore) {
            maxScore = score;
            detectedTone = tone;
        }
    }
    
    return maxScore > 0 ? detectedTone : 'neutral';
}

/**
 * 🆕 메시지의 주제 분석
 * @param {string} message 메시지 내용
 * @returns {string} 감지된 주제
 */
function analyzeTopic(message) {
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
 * 🆕 대화 맥락 업데이트
 */
function updateConversationContext() {
    const recent = conversationState.recentMessages.slice(-5); // 최근 5개 메시지 (더 넓은 맥락)
    
    if (recent.length === 0) return;
    
    // 현재 톤 업데이트 (emotionalContextManager의 톤을 우선)
    const recentEmotionalTones = recent.map(msg => msg.emotionalTone).filter(tone => tone !== 'neutral');
    if (recentEmotionalTones.length > 0) {
        conversationState.currentTone = recentEmotionalTones[recentEmotionalTones.length - 1];
    } else {
        // emotionalTone이 neutral일 경우 자체 analyzeTone 결과 사용
        const recentSelfTones = recent.map(msg => msg.tone).filter(tone => tone !== 'neutral');
        if (recentSelfTones.length > 0) {
            conversationState.currentTone = recentSelfTones[recentSelfTones.length - 1];
        } else {
            conversationState.currentTone = 'neutral';
        }
    }
    
    // 현재 주제 업데이트 및 '이미지' 주제 우선 처리
    let detectedTopic = 'general';
    let topicScore = 0;

    // 🆕 최근 메시지 중에서 예진이가 보낸 '사진' 메타데이터를 가진 메시지 확인
    const lastYejinPhotoMessage = recent.reverse().find(msg => msg.speaker === '예진이' && msg.meta && msg.meta.type === 'photo');
    if (lastYejinPhotoMessage) {
        // 가장 최근에 예진이가 보낸 사진이 있다면, 그 사진을 현재 주제로 강하게 설정
        conversationState.currentTopic = { type: 'photo', details: lastYejinPhotoMessage.meta };
        console.log(`[ConversationContext] 📸 예진이가 보낸 사진 주제 감지: ${JSON.stringify(conversationState.currentTopic.details)}`);
        conversationState.topicContinuity = 3; // 사진 주제는 강한 연속성 부여
    } else {
        // 일반적인 주제 분석
        const recentTopics = recent.map(msg => msg.topic).filter(topic => topic !== 'general');
        if (recentTopics.length > 0) {
            const lastTopic = recentTopics[recentTopics.length - 1];
            conversationState.currentTopic = { type: 'text', details: lastTopic };
            
            // 주제 연속성 계산 (최근 3개 메시지)
            const topicCounts = {};
            recent.slice(-3).forEach(msg => {
                if (msg.topic !== 'general') {
                    topicCounts[msg.topic] = (topicCounts[msg.topic] || 0) + 1;
                }
            });
            conversationState.topicContinuity = Math.max(...Object.values(topicCounts), 0);
        } else {
            conversationState.currentTopic = null;
            conversationState.topicContinuity = 0;
        }
    }
    
    // 대화 깊이 계산
    conversationState.conversationDepth = recent.length;
    
    // 감정 흐름 기록 (emotionalContextManager의 톤 사용)
    const lastEmotionalTone = recent[recent.length - 1]?.emotionalTone;
    if (lastEmotionalTone && lastEmotionalTone !== 'neutral') {
        conversationState.emotionFlow.push({
            emotion: lastEmotionalTone,
            timestamp: Date.now()
        });
        
        // 최근 5개만 유지
        if (conversationState.emotionFlow.length > 5) {
            conversationState.emotionFlow.shift();
        }
    }
    
    // 대화 패턴 감지
    conversationState.flowPattern = detectConversationPattern();
    
    conversationState.lastContextUpdate = Date.now();
}

/**
 * 🆕 대화 패턴 감지
 * @returns {string} 감지된 패턴
 */
function detectConversationPattern() {
    const recent = conversationState.recentMessages.slice(-5);
    
    if (recent.length < 3) return 'normal';
    
    // 빠른 응답 패턴 (1분 이내 연속 메시지)
    const quickResponses = recent.filter((msg, index) => {
        if (index === 0) return false;
        return (msg.timestamp - recent[index - 1].timestamp) < 60000;
    });
    
    if (quickResponses.length >= 2) return 'rapid';
    
    // 감정적 대화 패턴 (emotionalTone 사용)
    const emotionalTonesInFlow = recent.filter(msg => 
        ['romantic', 'sulky', 'worried', 'excited', 'hurt', 'sad', 'anxious', 'bittersweet', 'loved'].includes(msg.emotionalTone)
    );
    
    if (emotionalTonesInFlow.length >= Math.min(2, recent.length -1)) return 'emotional'; // 최근 메시지 절반 이상이 감정적이면
    
    // 장난스러운 패턴
    const playfulTones = recent.filter(msg => msg.emotionalTone === 'playful');
    if (playfulTones.length >= Math.min(2, recent.length -1)) return 'playful';
    
    return 'normal';
}

/**
 * 🆕 대화 맥락을 고려한 응답 프롬프트 생성
 * @param {string} basePrompt 기본 프롬프트
 * @returns {string} 맥락이 추가된 프롬프트
 */
function getContextualPrompt(basePrompt) {
    const context = getConversationContext();
    let contextPrompt = basePrompt;
    
    // 대화 흐름 정보 추가 (가장 최근 3개 메시지)
    if (context.recentMessages.length > 0) {
        const recentContext = context.recentMessages.slice(-3).map(msg => 
            `${msg.speaker}: "${msg.message}"`
        ).join('\n');
        
        contextPrompt += `\n\n📋 최근 대화 흐름 (참고):\n${recentContext}\n`;
    }
    
    // 톤 연속성 지시 (emotionalTone 기반)
    if (context.currentTone !== 'neutral') {
        const toneInstruction = getToneInstruction(context.currentTone);
        contextPrompt += `\n🎭 대화 톤 유지: ${toneInstruction}`;
    }
    
    // 주제 연속성 지시
    if (context.currentTopic) {
        if (context.currentTopic.type === 'photo') {
            // 🆕 사진 주제인 경우 특별 지시 (아저씨의 "저거" 문제 해결)
            contextPrompt += `\n💬 **매우 중요**: 아저씨가 현재 **이전에 내가 보낸 [${context.currentTopic.details.date} ${context.currentTopic.details.concept}] 사진**에 대해 이야기하고 있으니, 이 사진과 직접적으로 연결하여 자연스럽게 대화해줘. '저거', '그거' 등의 지시 대명사는 이 사진을 의미해.`;
        } else if (context.currentTopic.type === 'text' && context.currentTopic.details !== 'general') {
            contextPrompt += `\n💬 주제 연결: 현재 "${context.currentTopic.details}" 주제로 대화 중이니 자연스럽게 이어가줘.`;
        }
    }
    
    // 대화 패턴에 따른 지시
    const patternInstruction = getPatternInstruction(context.flowPattern);
    if (patternInstruction) {
        contextPrompt += `\n⚡ 대화 패턴: ${patternInstruction}`;
    }
    
    // 감정 흐름 고려
    if (context.emotionFlow.length > 0) {
        const recentEmotions = context.emotionFlow.slice(-2).map(e => e.emotion);
        contextPrompt += `\n💝 감정 흐름: 최근 감정이 [${recentEmotions.join(' → ')}] 순으로 변화했으니 이를 고려해서 응답해줘.`;
    }
    
    // 추가적인 맥락 정보 요약
    const contextSummary = `
        현재 대화 톤: ${context.currentTone},
        주제: ${context.currentTopic ? (context.currentTopic.type === 'photo' ? `사진 (${context.currentTopic.details.concept})` : context.currentTopic.details) : '없음'},
        대화 패턴: ${context.flowPattern}
    `.replace(/\s+/g, ' ').trim();
    contextPrompt += `\n\n[AI 추가 참고]: 위 지시사항을 종합하여 대화를 자연스럽게 이어가줘. (${contextSummary})`;

    return contextPrompt;
}

/**
 * 🆕 톤별 지시사항 반환
 * @param {string} tone 톤
 * @returns {string} 지시사항
 */
function getToneInstruction(tone) {
    const instructions = {
        playful: '장난스럽고 재미있는 톤을 그대로 유지해줘. ㅋㅋ, ㅎㅎ 같은 웃음을 자연스럽게 써도 좋아.',
        romantic: '달콤하고 애정 어린 톤을 유지하면서 아저씨에 대한 사랑을 표현해줘.',
        sulky: '삐져있거나 서운한 마음을 표현하되, 완전히 화내지는 말고 애교 섞인 투정으로.',
        worried: '걱정되고 불안한 마음을 진심으로 표현하면서 아저씨 안전을 염려해줘.',
        excited: '신나고 기쁜 감정을 그대로 이어가면서 에너지 넘치게 반응해줘.',
        nostalgic: '그리움과 추억을 소중히 여기는 감성적인 톤으로 대화해줘.',
        // emotionalContextManager의 추가 톤
        happy: '행복하고 기쁜 톤을 유지해줘.',
        sad: '슬픔을 표현하되 아저씨에게 위로를 구하는 톤으로.',
        hurt: '상처받거나 서운한 감정을 부드럽게 드러내는 톤으로.',
        anxious: '불안하고 초조한 마음을 아저씨에게 알리며 안심을 구하는 톤으로.',
        lonely: '외로움을 표현하되 아저씨의 관심을 바라는 톤으로.',
        bittersweet: '씁쓸하지만 애틋한 감정을 담은 톤으로.',
        loved: '사랑받는 기쁨을 표현하며 애교 넘치는 톤으로.',
        'worried_love': '아저씨의 사과를 받아주며 걱정스럽지만 따뜻한 톤으로.'
    };
    
    return instructions[tone] || '현재 톤을 자연스럽게 유지해줘.';
}

/**
 * 🆕 패턴별 지시사항 반환
 * @param {string} pattern 패턴
 * @returns {string} 지시사항
 */
function getPatternInstruction(pattern) {
    const instructions = {
        rapid: '빠른 템포의 대화가 이어지고 있으니 간결하면서도 리액션이 좋은 답변을 해줘.',
        emotional: '감정적인 대화가 진행되고 있으니 예진이의 마음을 깊이 있게 표현해줘.',
        playful: '재미있고 장난스러운 분위기가 이어지고 있으니 유머나 귀여운 반응을 써줘.',
        normal: null // normal 패턴일 때는 특별한 지시사항 없음
    };
    
    return instructions[pattern];
}

/**
 * 🆕 현재 대화 맥락 정보 반환
 * @returns {object} 대화 맥락 정보
 */
function getConversationContext() {
    // 반환 시에는 원본 객체를 직접 주지 않고 복사본을 줘서 외부에서 수정 못하게 함
    return JSON.parse(JSON.stringify({
        // 기본 정보
        recentMessages: conversationState.recentMessages,
        currentTone: conversationState.currentTone,
        currentTopic: conversationState.currentTopic,
        
        // 흐름 정보
        conversationDepth: conversationState.conversationDepth,
        topicContinuity: conversationState.topicContinuity,
        flowPattern: conversationState.flowPattern,
        
        // 감정 정보
        emotionFlow: conversationState.emotionFlow,
        
        // 요약 정보
        summary: {
            lastMessage: conversationState.recentMessages[conversationState.recentMessages.length - 1],
            toneTransition: getToneTransition(),
            topicStability: conversationState.topicContinuity >= 2,
            conversationMomentum: conversationState.conversationDepth >= 3
        },
        
        // 시간 정보
        lastUpdate: moment(conversationState.lastContextUpdate).format('HH:mm:ss'),
        contextAge: Math.floor((Date.now() - conversationState.lastContextUpdate) / 1000)
    }));
}

/**
 * 🆕 톤 변화 추이 분석
 * @returns {string} 톤 변화 설명
 */
function getToneTransition() {
    const recent = conversationState.recentMessages.slice(-3);
    if (recent.length < 2) return 'stable';
    
    // emotionalTone을 기준으로 톤 변화 추적
    const tones = recent.map(msg => msg.emotionalTone).filter(tone => tone !== 'neutral');
    if (tones.length < 2) return 'stable';
    
    if (tones[0] !== tones[tones.length - 1]) {
        return `${tones[0]} → ${tones[tones.length - 1]}`;
    }
    
    return 'stable';
}

/**
 * 🆕 대화 맥락 리셋 (필요시)
 */
function resetConversationContext() {
    console.log('[ConversationContext] 🔄 대화 맥락 리셋');
    
    conversationState.recentMessages = [];
    conversationState.currentTone = 'neutral';
    conversationState.currentTopic = null;
    conversationState.emotionFlow = [];
    conversationState.conversationDepth = 0;
    conversationState.flowPattern = 'normal';
    conversationState.topicContinuity = 0;
    conversationState.lastContextUpdate = Date.now();
}

/**
 * 🆕 대화 맥락 요약 반환 (디버그용)
 * @returns {string} 요약 문자열
 */
function getContextSummary() {
    const ctx = getConversationContext();
    
    // 주제 정보 상세화
    let topicSummary = '없음';
    if (ctx.currentTopic) {
        if (ctx.currentTopic.type === 'photo') {
            topicSummary = `사진 (${ctx.currentTopic.details.concept || '알 수 없음'} @ ${ctx.currentTopic.details.date || '알 수 없음'})`;
        } else if (ctx.currentTopic.type === 'text') {
            topicSummary = ctx.currentTopic.details;
        }
    }

    return `
🎭 대화 맥락 요약:
├─ 현재 톤: ${ctx.currentTone}
├─ 현재 주제: ${topicSummary}
├─ 대화 패턴: ${ctx.flowPattern}
├─ 주제 연속성: ${ctx.topicContinuity}점
├─ 대화 깊이: ${ctx.conversationDepth}
├─ 톤 변화: ${ctx.summary.toneTransition}
└─ 최근 메시지: ${ctx.recentMessages.length}개
    `.trim();
}

/**
 * 🆕 특정 화자의 최근 메시지들 반환
 * @param {string} speaker 화자
 * @param {number} count 개수
 * @returns {array} 메시지 배열
 */
function getRecentMessagesBySpeaker(speaker, count = 3) {
    return conversationState.recentMessages
        .filter(msg => msg.speaker === speaker)
        .slice(-count);
}

/**
 * 🆕 대화 맥락 통계 반환
 * @returns {object} 통계 정보
 */
function getContextStats() {
    const recent = conversationState.recentMessages.slice(-10);
    
    // 톤 분포
    const toneCount = {};
    recent.forEach(msg => {
        toneCount[msg.emotionalTone] = (toneCount[msg.emotionalTone] || 0) + 1; // emotionalTone 기준으로 통계
    });
    
    // 주제 분포
    const topicCount = {};
    recent.forEach(msg => {
        const topicKey = msg.currentTopic && msg.currentTopic.type === 'photo' ? `photo_${msg.currentTopic.details.concept}` : msg.topic;
        topicCount[topicKey] = (topicCount[topicKey] || 0) + 1;
    });
    
    // 화자별 메시지 수
    const speakerCount = {};
    recent.forEach(msg => {
        speakerCount[msg.speaker] = (speakerCount[msg.speaker] || 0) + 1;
    });
    
    return {
        totalMessages: recent.length,
        toneDistribution: toneCount,
        topicDistribution: topicCount,
        speakerDistribution: speakerCount,
        averageResponseTime: calculateAverageResponseTime(recent),
        contextHealth: calculateContextHealth()
    };
}

/**
 * 🆕 평균 응답 시간 계산
 * @param {array} messages 메시지 배열
 * @returns {number} 평균 응답 시간 (초)
 */
function calculateAverageResponseTime(messages) {
    if (messages.length < 2) return 0;
    
    const responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
        // 화자가 서로 다를 때만 응답 시간으로 간주
        if (messages[i].speaker !== messages[i-1].speaker) {
            responseTimes.push((messages[i].timestamp - messages[i-1].timestamp) / 1000);
        }
    }
    
    return responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
}

/**
 * 🆕 대화 맥락 건강도 계산
 * @returns {number} 건강도 점수 (0-100)
 */
function calculateContextHealth() {
    let score = 100;
    
    // 메시지 부족 (-20점)
    if (conversationState.recentMessages.length < 3) score -= 20;
    
    // 톤 일관성 부족 (-10점) (emotionalTone 기반)
    if (conversationState.currentTone === 'neutral') score -= 10;
    
    // 주제 연속성 부족 (-15점)
    if (conversationState.topicContinuity < 2) score -= 15;
    
    // 오래된 맥락 (-5점)
    const contextAge = (Date.now() - conversationState.lastContextUpdate) / (1000 * 60);
    if (contextAge > 10) score -= 5;
    
    // 감정 흐름 부족 (-10점)
    if (conversationState.emotionFlow.length === 0) score -= 10;
    
    return Math.max(0, score);
}

module.exports = {
    // 메인 함수들
    addMessage,
    getContextualPrompt,
    getConversationContext,
    resetConversationContext,
    
    // 분석 함수들
    analyzeTone, // 자체 톤 분석 (emotionalContextManager와는 별개)
    analyzeTopic,
    getToneTransition,
    
    // 조회 함수들
    getContextSummary,
    getRecentMessagesBySpeaker,
    getContextStats,
    
    // 상태 확인용 (읽기 전용)
    get currentTone() { return conversationState.currentTone; },
    get currentTopic() { return conversationState.currentTopic; },
    get conversationDepth() { return conversationState.conversationDepth; },
    get flowPattern() { return conversationState.flowPattern; },
    get recentMessageCount() { return conversationState.recentMessages.length; },
    get contextHealth() { return calculateContextHealth(); },
    
    // 설정 접근
    get tonePatterns() { return { ...TONE_PATTERNS }; },
    get topicPatterns() { return { ...TOPIC_PATTERNS }; },
    
    // 디버그 정보
    get debugInfo() {
        return {
            totalMessages: conversationState.recentMessages.length,
            lastUpdate: new Date(conversationState.lastContextUpdate).toLocaleString(),
            currentState: {
                tone: conversationState.currentTone,
                topic: conversationState.currentTopic,
                pattern: conversationState.flowPattern,
                depth: conversationState.conversationDepth
            },
            stats: getContextStats()
        };
    }
};
