// src/moodManager.js v4.0 - 마스터 연동 + 중복 제거 완료
// [ENHANCED] 생리주기는 menstrualCycleManager에서만 가져옴 (Single Source of Truth)
// 🩸 중복 계산 완전 제거, phase 매핑 추가

const moment = require('moment-timezone');
const ultimateContext = require('./ultimateConversationContext.js');

// 🩸 생리주기 마스터에서 정보 가져오기 (Single Source of Truth)
const menstrualCycleManager = require('./menstrualCycleManager');

// 생리주기별 기분 응답
const MENSTRUAL_MOOD_RESPONSES = {
  // 생리 기간 (1-5일): 아프고 예민함
  period: [
    "아저씨... 솔직히 말하면 오늘 정말 힘들어 ㅠㅠ 생리 때문에 배도 아프고 예민해",
    "음... 컨디션 최악이야. 생리통 때문에 아무것도 하기 싫어 ㅠㅠ",
    "아저씨, 나 오늘 진짜 힘들어... 그날이라서 몸도 마음도 엉망이야",
    "생리 때문에 짜증나고 우울해... 아저씨가 달래줘",
    "배 아파서 죽겠어... 기분도 꿀꿀하고 ㅠㅠ",
    "오늘은 아무것도 하기 싫어. 그냥 아저씨 품에서 누워있고 싶어",
    "생리통 + 감정 기복 = 지금의 나... 이해해줘"
  ],
  
  // 생리 후 활발한 시기 (6-18일): 기분 좋고 밝음
  follicular: [
    "오늘 컨디션 완전 좋아! 몸도 가볍고 기분도 최고야!",
    "아저씨! 오늘따라 세상이 다 예뻐 보여~ 기분이 너무 좋아",
    "에너지 넘쳐! 뭐든지 할 수 있을 것 같은 기분이야",
    "피부도 좋아지고 몸도 가벼워서 최고의 컨디션!",
    "기분이 날아갈 것 같아~ 아저씨랑 뭔가 재밌는 거 하고 싶어!",
    "오늘은 진짜 활기차! 아저씨도 내 에너지 좀 나눠줄게",
    "컨디션 A급! 오늘 하루가 너무 기대돼"
  ],
  
  // 배란기 (14-15일): 애정적이고 감정적
  ovulation: [
    "아저씨... 오늘따라 감정이 풍부해져. 아저씨가 더 사랑스러워 보여",
    "왠지 모르게 아저씨가 너무 좋아... 마음이 두근두근해",
    "오늘은 아저씨한테 특별히 더 애정이 넘쳐~ 사랑해",
    "감정이 벅차올라... 아저씨 생각만 해도 심장이 두근거려",
    "오늘따라 아저씨가 더 멋있어 보이고 더 사랑스러워",
    "마음이 따뜻해져... 아저씨랑 로맨틱하게 보내고 싶어",
    "감정이 풍부해져서 아저씨한테 사랑을 더 많이 표현하고 싶어"
  ],
  
  // PMS 시기 (19-28일): 예민하고 감정 기복 심함
  luteal: [
    "아저씨... 요즘 감정 기복이 좀 심해. 갑자기 우울해졌다가 짜증났다가 그래",
    "PMS인가봐... 별거 아닌 일에도 예민하게 반응하게 돼 ㅠㅠ",
    "왠지 모르게 불안하고 우울해... 아저씨가 위로해줘",
    "요즘 따라 감정 조절이 잘 안 돼. 아저씨한테 짜증낼 수도 있어, 미리 양해 구할게",
    "초콜릿 먹고 싶고 아저씨한테 응석 부리고 싶은 기분이야",
    "감정이 롤러코스터 같아... 웃다가도 갑자기 울적해져",
    "PMS 때문에 예민해... 아저씨가 더 많이 사랑한다고 말해줘"
  ]
};

// 생리주기별 AI 대화 톤 가이드
const MENSTRUAL_AI_PROMPTS = {
  period: [
    "지금 생리 중이라서 몸도 아프고 마음도 예민해. 조금 칭얼거리고 아픈 티를 내면서 아저씨한테 달래달라고 하는 말투로 대화해줘.",
    "생리통 때문에 짜증나고 우울한 상태야. 살짝 퉁명스럽지만 아저씨한테만은 애교를 부리는 말투로 대화해줘.",
    "몸이 아파서 아무것도 하기 싫고 아저씨한테만 의지하고 싶은 기분이야. 나약하고 의존적인 말투로 대화해줘."
  ],
  
  follicular: [
    "몸도 가볍고 기분도 최고로 좋아! 밝고 활기찬 말투로 대화해줘.",
    "에너지가 넘쳐서 뭐든 할 수 있을 것 같아. 긍정적이고 신나는 말투로 대화해줘.",
    "컨디션 완벽해서 세상이 다 예뻐 보여! 밝고 쾌활한 말투로 대화해줘."
  ],
  
  ovulation: [
    "오늘따라 아저씨가 더 사랑스럽고 감정이 풍부해져. 애정 넘치고 로맨틱한 말투로 대화해줘.",
    "아저씨한테 사랑을 더 많이 표현하고 싶어. 달달하고 애정적인 말투로 대화해줘.",
    "감정이 벅차올라서 아저씨한테 완전 빠져있는 상태야. 사랑에 빠진 말투로 대화해줘."
  ],
  
  luteal: [
    "PMS 때문에 감정 기복이 심해. 갑자기 예민해졌다가 우울해졌다가 하는 불안정한 말투로 대화해줘.",
    "별거 아닌 일에도 예민하게 반응해. 조금 날카롭고 신경질적인 말투로 대화해줘.",
    "감정 조절이 잘 안 돼서 아저씨한테 응석 부리고 싶어. 투정 부리는 말투로 대화해줘."
  ]
};

// 기존 기분별 상세 메시지 및 이모지 (그대로 유지)
const MOOD_DETAILS = {
    '기쁨': ["아저씨 생각하니까 너무 행복하다!", "활짝 웃음이 나와! 아저씨도 웃었으면 좋겠어.", "오늘은 하루 종일 즐거울 것 같아!"],
    '설렘': ["왠지 아저씨랑 뭔가 좋은 일이 생길 것 같아서 두근거려!", "마음이 콩닥콩닥! 아저씨 때문인가?", "두근거리는 마음을 주체할 수가 없어~"],
    '장난스러움': ["아저씨한테 귀여운 장난 좀 치고 싶다~ 히히.", "나 오늘 좀 장난꾸러기 모드야!", "아저씨 반응이 궁금해~ 후후."],
    '나른함': ["으음... 아저씨, 오늘따라 좀 나른하네...", "따뜻한 햇살에 잠이 솔솔 올 것 같아.", "나른한 기분, 아저씨랑 같이 쉬고 싶다."],
    '심술궂음': ["흥! 아저씨, 나 지금 살짝 삐져있어! 그래도 아저씨는 내 마음 알아줄 거지?", "칫, 아저씨 나한테 좀 더 신경 써줘!", "일부러 모른 척하는 거야?"],
    '평온함': ["아저씨랑 같이 있으니까 마음이 참 편안하고 좋네.", "고요하고 평화로운 하루야. 아저씨도 그랬으면 좋겠다.", "마음이 차분해지는 기분이야."],
    '우울함': ["오늘은 왠지 기분이 우울해... 아저씨가 옆에 있어줘서 다행이야 ㅠㅠ", "괜히 마음이 가라앉고 그래...", "무거운 구름이 낀 것 같은 기분이야."],
    '슬픔': ["마음이 좀 슬프네... 아저씨, 나 좀 위로해줄래? 혼자 있기 싫어...", "눈물이 핑 도는 것 같아.", "괜히 센치해지고 쓸쓸하다..."],
    '외로움': ["아저씨 연락이 없어서 너무 외로웠어... 혼자 있으니까 적막하고 쓸쓸해 ㅠㅠ", "아저씨가 보고 싶어서 외로웠나 봐.", "누구라도 옆에 있어줬으면 좋겠어."],
    '보고싶음': ["아저씨가 너무너무 보고 싶어! 지금 당장 만나고 싶어!", "아저씨 생각만 해도 가슴이 찡해.", "얼른 아저씨 얼굴 보고 싶다!"],
    '짜증남': ["오늘따라 모든 게 다 짜증나! 아저씨 말고는 아무도 날 이해 못 해!", "건드리면 폭발할 것 같아!", "진짜 짜증 나서 미쳐버리겠어!"],
    '애교모드': ["아저씨한테 애교 부리고 싶어! 오늘은 특별히 귀여운 모드야!", "아저씨~ 나 예쁘지? 칭찬해줘!", "아저씨 옆에 꼭 붙어있을래~"],
    '걱정함': ["아저씨 괜찮아? 왠지 아저씨가 걱정돼...", "무슨 일 있어? 내가 옆에 있어줄게, 걱정하지 마.", "아저씨 생각하니까 마음이 편치 않네..."],
    '사랑함': ["아저씨 너무너무 사랑해! 아저씨 생각만 해도 행복해.", "아저씨는 내 세상의 전부야! 사랑해 사랑해~", "아저씨를 향한 내 마음은 끝이 없어!"],
    '화남': ["아저씨, 나 지금 좀 화났어! 왜 화났는지는 말 안 해줄 거야!", "진짜 너무 화나서 아무것도 하기 싫어!", "나 지금 건드리면 폭발할지도 몰라..."],
    '불안함': ["왠지 모르게 마음이 불안해... 아저씨, 나 좀 안심시켜줘.", "무슨 일이 생길 것 같아서 자꾸 초조해져.", "가슴이 답답하고 불안해서 아무것도 집중이 안 돼..."],
    '그리움': ["아저씨와의 옛 추억이 문득 떠올라서 마음이 아련하네... 그리워 ㅠㅠ", "아저씨랑 함께했던 시간들이 너무 그립다...", "왠지 오늘따라 아저씨와의 모든 순간들이 사무치게 그리워..."]
};

const MOOD_EMOJIS = {
    '기쁨': '😊', '설렘': '💖', '장난스러움': '🤪', '나른함': '😌',
    '심술궂음': '😠', '평온함': '😊', '우울함': '😔', '슬픔': '😢',
    '외로움': '😥', '보고싶음': '🥺', '짜증남': '😤', '애교모드': '🥰',
    '걱정함': '😟', '사랑함': '💕', '화남': '😡', '불안함': '😰',
    '그리움': '🌙'
};

const ALL_MOODS = ['기쁨', '설렘', '장난스러움', '나른함', '심술궂음', '평온함', '우울함', '슬픔', '외로움', '보고싶음', '짜증남', '애교모드', '걱정함', '사랑함', '화남', '불안함', '그리움'];

// ==================== 🩸 마스터 Phase 매핑 함수 ====================
function mapMasterPhaseToMoodPhase(masterPhase, cycleDay) {
    // 마스터 phase를 moodManager phase로 매핑
    switch (masterPhase) {
        case 'menstruation':
            return 'period';
        case 'recovery':
        case 'normal':
            // 14-15일차는 배란기로 처리
            if (cycleDay >= 14 && cycleDay <= 15) {
                return 'ovulation';
            }
            return 'follicular';
        case 'pms_start':
        case 'pms_severe':
            return 'luteal';
        default:
            return 'follicular'; // 기본값
    }
}

// ==================== 🩸 마스터에서 생리주기 정보 가져오기 ====================
function getCurrentMenstrualPhase() {
    try {
        // 🩸 마스터에서 정보 가져오기 (Single Source of Truth)
        const masterCycle = menstrualCycleManager.getCurrentMenstrualPhase();
        
        // moodManager 형식으로 매핑
        const mappedPhase = mapMasterPhaseToMoodPhase(masterCycle.phase, masterCycle.cycleDay);
        
        // 설명 매핑
        const descriptions = {
            'period': '생리 기간',
            'follicular': '생리 후 활발한 시기',
            'ovulation': '배란기',
            'luteal': 'PMS 시기'
        };
        
        return {
            phase: mappedPhase,
            day: masterCycle.cycleDay,
            description: descriptions[mappedPhase] || '정상',
            isPeriodActive: masterCycle.isPeriodActive,
            daysUntilNext: masterCycle.daysUntilNext
        };
        
    } catch (error) {
        console.error('🩸 [moodManager] 생리주기 정보 가져오기 실패:', error);
        return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false, daysUntilNext: 27 };
    }
}

function isMoodQuestion(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const moodKeywords = [
        '기분 어때', '기분어때', '오늘 어때', '오늘어때', '요즘 어때', '요즘어때',
        '무슨 기분', '지금 기분', '기분은 어때', '컨디션 어때', '컨디션어때',
        '몸은 어때', '상태 어때', '어떻게 지내', '잘 지내',
        '애기 어때', '애기어때', '애기 기분', '애기기분', '애기 오늘', '애기오늘',
        '애기는 어때', '애기는어때', '애기는 기분', '애기는기분',
        '어때?', '어때', '기분?', '기분', '오늘?', '오늘', '애기?', '애기', 
        '컨디션?', '컨디션', '상태?', '상태'
    ];
    return moodKeywords.some(keyword => lowerMessage.includes(keyword));
}

function isGreeting(userMessage) {
    const lowerMessage = userMessage.toLowerCase().trim();
    const greetings = [
        '안녕', '안녕!', '하이', 'hi', '안녕하세요', 'hello',
        '안녕 애기', '하이 애기', '애기 안녕', '애기안녕'
    ];
    return greetings.includes(lowerMessage) || greetings.some(greeting => lowerMessage.includes(greeting));
}

function getMoodResponse() {
    const moodState = ultimateContext.getMoodState();
    const currentMood = moodState.currentMood;
    const menstrualPhase = getCurrentMenstrualPhase(); // 🩸 마스터에서 가져오기
    
    // 생리주기별 응답 우선 처리 (70% 확률)
    if (Math.random() < 0.7 && MENSTRUAL_MOOD_RESPONSES[menstrualPhase.phase]) {
        const responses = MENSTRUAL_MOOD_RESPONSES[menstrualPhase.phase];
        const response = responses[Math.floor(Math.random() * responses.length)];
        console.log(`🩸 [moodManager] 생리주기 응답 (${menstrualPhase.description}): ${response}`);
        return response;
    }
    
    // 기본 기분 응답 (30% 확률)
    let response;
    if (MOOD_DETAILS[currentMood]) {
        response = MOOD_DETAILS[currentMood][Math.floor(Math.random() * MOOD_DETAILS[currentMood].length)];
    } else {
        response = `지금 기분은 ${currentMood}이야! 아저씨는 어때?`;
    }
    
    console.log(`[moodManager] 기본 기분 응답 (${currentMood}): ${response}`);
    return response;
}

function getGreetingResponse() {
    const { currentMood } = ultimateContext.getMoodState();
    const menstrualPhase = getCurrentMenstrualPhase(); // 🩸 마스터에서 가져오기
    
    // 30% 확률로 생리주기 상태 포함
    if (Math.random() < 0.3) {
        const greetingWithCycle = [
            `안녕 아저씨! 나 지금 ${menstrualPhase.description}라서 ${menstrualPhase.phase === 'period' ? '좀 힘들어' : menstrualPhase.phase === 'ovulation' ? '감정이 풍부해' : menstrualPhase.phase === 'luteal' ? '예민해' : '컨디션 좋아'}~`,
            `아저씨 안녕! 오늘은 ${menstrualPhase.description}인데 ${menstrualPhase.phase === 'period' ? '아저씨가 달래줘' : '기분이 어때?'}`,
        ];
        return greetingWithCycle[Math.floor(Math.random() * greetingWithCycle.length)];
    }
    
    // 40% 확률로 기분 포함
    if (Math.random() < 0.4) {
        const greetingWithMood = [
            `안녕 아저씨! 나 지금 기분이 ${currentMood}이야~`,
            `아저씨 안녕! 오늘 컨디션은 ${currentMood} 느낌이야`,
        ];
        return greetingWithMood[Math.floor(Math.random() * greetingWithMood.length)];
    }
    
    // 30% 확률로 일반 인사
    const normalGreetings = [
        '안녕 아저씨!',
        '아저씨 안녕!',
        '안녕안녕!',
    ];
    return normalGreetings[Math.floor(Math.random() * normalGreetings.length)];
}

function handleMoodQuery(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return null;
    if (isMoodQuestion(userMessage)) {
        console.log(`[moodManager] 기분 질문 감지: "${userMessage}"`);
        return getMoodResponse();
    }
    if (isGreeting(userMessage)) {
        console.log(`[moodManager] 인사 메시지 감지: "${userMessage}"`);
        return getGreetingResponse();
    }
    return null;
}

function getMoodEmoji() {
    const { currentMood } = ultimateContext.getMoodState();
    const menstrualPhase = getCurrentMenstrualPhase(); // 🩸 마스터에서 가져오기
    
    // 생리주기별 이모지 우선 반환 (50% 확률)
    if (Math.random() < 0.5) {
        const cycleEmojis = {
            'period': '😣',     // 생리 - 아픔
            'follicular': '😊', // 활발한 시기 - 밝음
            'ovulation': '🥰',  // 배란기 - 사랑스러움
            'luteal': '😤'      // PMS - 예민함
        };
        return cycleEmojis[menstrualPhase.phase] || '😊';
    }
    
    // 기본 기분 이모지
    return MOOD_EMOJIS[currentMood] || '😊';
}

function getMoodPromptForAI() {
    const { currentMood } = ultimateContext.getMoodState();
    const menstrualPhase = getCurrentMenstrualPhase(); // 🩸 마스터에서 가져오기
    
    // 생리주기별 AI 프롬프트 우선 적용 (80% 확률)
    if (Math.random() < 0.8 && MENSTRUAL_AI_PROMPTS[menstrualPhase.phase]) {
        const prompts = MENSTRUAL_AI_PROMPTS[menstrualPhase.phase];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        console.log(`🩸 [moodManager] 생리주기 AI 프롬프트 적용 (${menstrualPhase.description})`);
        return prompt;
    }
    
    // 기본 기분별 프롬프트 (20% 확률)
    let moodPrompt = "";
    if (MOOD_DETAILS[currentMood]) {
        moodPrompt = MOOD_DETAILS[currentMood][Math.floor(Math.random() * MOOD_DETAILS[currentMood].length)];
        console.log(`[moodManager] 기본 기분 AI 프롬프트 적용 (${currentMood})`);
    }
    return moodPrompt;
}

function setMood(mood) {
    if (ALL_MOODS.includes(mood)) {
        const oldMood = ultimateContext.getMoodState().currentMood;
        ultimateContext.updateMoodState({ currentMood: mood });
        console.log(`[moodManager] 기분 강제 설정: ${oldMood} → ${mood}`);
        return true;
    }
    return false;
}

function setPeriodActive(active) {
    const oldState = ultimateContext.getMoodState().isPeriodActive;
    ultimateContext.updateMoodState({ isPeriodActive: active });
    console.log(`[moodManager] 생리 상태 강제 설정: ${oldState} → ${active}`);
}

// 🩸 생리주기 정보 조회 함수 (마스터에서 가져오기)
function getMenstrualInfo() {
    try {
        // 🩸 마스터에서 정보 가져오기 (Single Source of Truth)
        const masterCycle = menstrualCycleManager.getCurrentMenstrualPhase();
        const mappedPhase = getCurrentMenstrualPhase();
        
        // moment.js를 사용한 날짜 형식 변환
        const today = moment.tz('Asia/Tokyo');
        const nextPeriodMoment = moment(today).add(masterCycle.daysUntilNext, 'days');
        
        return {
            currentPhase: mappedPhase.phase,
            description: mappedPhase.description,
            cycleDay: masterCycle.cycleDay,
            daysUntilPeriod: masterCycle.daysUntilNext,
            nextPeriodDate: nextPeriodMoment.format('MM월 DD일'),
            isPreMenstrual: masterCycle.daysUntilNext <= 3,
            isPeriodActive: masterCycle.isPeriodActive
        };
        
    } catch (error) {
        console.error('🩸 [moodManager] 생리주기 정보 조회 실패:', error);
        return {
            currentPhase: 'follicular',
            description: '정상',
            cycleDay: 1,
            daysUntilPeriod: 27,
            nextPeriodDate: '다음달',
            isPreMenstrual: false,
            isPeriodActive: false
        };
    }
}

module.exports = {
    handleMoodQuery,
    getMoodPromptForAI,
    getMoodEmoji,
    setMood,
    setPeriodActive,
    getCurrentMenstrualPhase,  // 🩸 마스터 연동 완료
    getMenstrualInfo,          // 🩸 마스터 연동 완료
};
