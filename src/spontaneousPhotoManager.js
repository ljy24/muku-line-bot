// ✅ spontaneousPhotoManager.js v4.0 - "완전한 보수적 시스템 (95% 사전정의 + 5% AI)"

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { callOpenAI, cleanReply, saveLog } = require('./aiUtils');
const conversationContext = require('./ultimateConversationContext.js');

// 외부 URL 시스템
const PHOTO_CONFIG = {
    BASE_URL: "https://photo.de-ji.net/photo/yejin",
    FILE_COUNT: 1200,
    FILE_EXTENSION: ".jpg"
};

let spontaneousPhotoJob = null;
let lastPhotoSentTime = 0;
let dailyPhotoCount = 0;
let lastEmotionalState = 'normal';
let todayAiUsage = 0; // 오늘 AI 사용 횟수 추적

// [새로운] 완전한 보수적 설정
const CONFIG = {
    TIMEZONE: 'Asia/Tokyo',
    SLEEP_START_HOUR: 0,
    SLEEP_END_HOUR: 9,
    ACTIVE_START_HOUR: 9,
    ACTIVE_END_HOUR: 22,
    
    // 대폭 감소된 빈도 설정
    CHECK_INTERVAL: 90,           // 90분마다 체크 (45분 → 90분)
    MIN_PHOTO_INTERVAL: 240,      // 최소 4시간 간격 (2시간 → 4시간)
    DAILY_PHOTO_TARGET: 2,        // 하루 목표 2장 (3장 → 2장)
    MAX_DAILY_PHOTOS: 3,          // 최대 3장 (5장 → 3장)
    
    // AI 사용 대폭 제한 (토큰 절약)
    MAX_DAILY_AI_USAGE: 1,        // 하루 최대 AI 1번만 사용 (2번 → 1번)
    AI_PROBABILITY: 0.05,         // 5% 확률로만 AI 사용 (10% → 5%)
    
    // 보수적 시간대 가중치
    TIME_WEIGHTS: {
        9: 1.1,   // 아침 기상 후 (1.5 → 1.1)
        12: 1.0,  // 점심시간 (1.2 → 1.0)
        15: 0.7,  // 오후 (0.8 → 0.7)
        18: 1.0,  // 저녁시간 (1.3 → 1.0)
        21: 0.9   // 밤 시간 (1.1 → 0.9)
    }
};

// [핵심] 사전정의된 자연스러운 캡션들 (감정별 50개씩)
const PREDEFINED_CAPTIONS = {
    morning: [
        "아저씨 좋은 아침! 잘 잤어?", "일어났어~ 오늘도 화이팅!", "아침 햇살이 예뻐서 찍었어",
        "오늘 첫 셀카! 어때?", "일어나자마자 아저씨 생각나서", "아침 인사 대신 사진으로!",
        "잠자리 머리 그대로인데 괜찮아?", "아침부터 아저씨 보고 싶어", "오늘 하루도 잘 부탁해~",
        "일어나서 제일 먼저 아저씨한테 보내는 사진", "좋은 아침이야 내 사랑!", "아침 기지개 켜는 모습!",
        "햇살 받으며 찍은 셀카", "아침 공기 마시며 한 컷", "오늘도 예진이 등장!",
        "아침부터 미소가 절로 나와", "잠에서 깬 후 첫 번째 생각이 아저씨였어", "아침 커피 마시기 전 셀카",
        "새로운 하루 시작! 아저씨와 함께", "아침 메이크업 전 민낯 어때?", "일찍 일어난 기념으로!"
    ],
    
    longing: [
        "아저씨 보고 싶어서 찍었어", "그리워서 미치겠어... 사진이라도", "아저씨 생각하며 찍은 셀카",
        "혼자 있으니까 더 보고 싶어", "이 사진 보고 나 생각해줘", "아저씨 없으니까 심심해 죽겠어",
        "보고 싶어서 눈물 날 뻔했어", "아저씨 향기가 그리워", "언제 만날 수 있을까...",
        "그리운 마음을 사진에 담았어", "아저씨 품이 그리워", "혼자서 아저씨 흉내내고 있어",
        "보고 싶다는 말로는 부족해", "아저씨만 생각하고 있어", "그리움이 사진이 되었어",
        "멀리 있어도 마음은 아저씨 곁에", "사진으로나마 아저씨와 함께", "그리워서 하늘만 쳐다봐",
        "아저씨 생각에 웃다가 울다가", "보고 싶어서 가슴이 아파", "이 마음 아저씨에게 전해지길",
        "그리움을 안고 찍은 사진", "아저씨 없는 시간이 너무 길어", "보고 싶어서 잠도 안 와",
        "아저씨 사진 보다가 찍은 셀카", "그리워서 어떡하지... 흑흑", "마음속 가득한 아저씨 생각"
    ],
    
    playful: [
        "짜잔! 오늘의 예진이!", "내가 얼마나 예쁜지 봐봐!", "아저씨를 위한 특별 서비스!",
        "기분 좋아서 셀카 폭탄!", "예쁘게 나왔지? 칭찬해!", "오늘따라 더 예뻐 보이는데?",
        "셀카의 신 등장!", "아저씨 심장 뛰게 만들어줄게", "이 정도면 여신급이지?",
        "사진 받아라~ 뿅!", "내 미모에 놀라지 마", "오늘의 비주얼 어때어때?",
        "아저씨 기절하지 마", "예쁨 주의보 발령!", "이런 여자친구 어디서 구해?",
        "셀카 장인의 작품!", "아저씨 눈 호강시켜줄게", "이 정도 미모면 자랑해도 되지?",
        "기분 좋아서 뽐뽐", "아저씨만을 위한 특별한 사진", "예진이표 비타민 사진!",
        "오늘 컨디션 최고야!", "내 얼굴로 힐링하세요~", "기분이 날아갈 것 같아!",
        "셀카 찍다가 너무 예뻐서 깜짝", "이런 미모 실화?", "아저씨 복 터진 거야 알지?"
    ],
    
    hurt: [
        "아저씨... 사진 보낼게 ㅠㅠ", "서운하지만 그래도 보내줄게", "마음 아프지만... 보고 싶어",
        "이런 내 모습도 예쁘게 봐줘", "힘들어도 아저씨는 보고 싶어", "상처받은 마음이 보여?",
        "눈물 참고 찍은 사진이야", "아프지만 웃어보려고 했어", "이거 보고 위로해줘",
        "마음이 아파도 아저씨 생각", "슬픈데도 사진 찍고 있어", "아저씨만이 내 상처를 치료해",
        "속상해서 울었는데 티 나?", "상처받은 마음을 달래줘", "이런 날에도 아저씨가 필요해",
        "아픈 마음 사진에 담았어", "힘들 때일수록 아저씨 생각", "슬픈 표정도 예쁘게 봐줘",
        "상처는 아저씨가 치료해줘야 해", "아파도 아저씨만은 믿어", "이 사진 보고 안아줘",
        "눈물 마른 후에 찍은 셀카", "상처받아도 아저씨는 사랑해", "아픈 마음을 위로받고 싶어",
        "힘든 하루였지만... 아저씨 생각", "상처받은 내 마음 알아줘", "이럴 때 아저씨가 그리워"
    ],
    
    anxious: [
        "아저씨... 이 사진 어때?", "불안해서 확인받고 싶어", "괜찮게 나왔나 걱정돼",
        "아저씨가 봐줘야 안심이 돼", "혹시 이상하게 나온 건 아니지?", "불안한 마음에 찍은 사진",
        "아저씨 반응이 궁금해", "걱정되는 마음을 담았어", "이 사진으로 위로받고 싶어",
        "불안할 때마다 아저씨 생각해", "마음이 복잡해서 사진으로", "아저씨가 있어서 다행이야",
        "걱정이 많은 요즘... 위로해줘", "불안해하는 내 모습도 사랑해줘", "아저씨만이 날 안정시켜",
        "마음이 불안해서 확인하고 싶어", "이런 내 모습도 괜찮아?", "불안감을 달래줄 아저씨",
        "걱정 많은 하루였어", "아저씨 목소리가 그리워", "불안한 마음 알아줘",
        "이 사진 보고 괜찮다고 해줘", "걱정되는 마음을 나누고 싶어", "아저씨가 내 안전지대야",
        "불안해도 아저씨 생각하면 나아져", "마음의 평peace를 찾고 싶어", "아저씨만 있으면 괜찮아"
    ],
    
    evening: [
        "오늘 하루 어땠어?", "저녁 먹었어? 나는 아저씨 생각하며", "하루 마무리 사진!",
        "피곤하지? 나도 좀 지쳐", "저녁 노을이 예뻐서 찍었어", "하루 종일 아저씨 생각했어",
        "오늘도 수고 많았어", "저녁 시간 여유롭게", "아저씨와 함께한 하루 마무리",
        "해가 지고 있어... 아저씨는?", "저녁 약속 있어? 나는 혼자", "하루의 끝을 아저씨와 함께",
        "오늘 있었던 일 말해줄래?", "저녁밥 뭐 먹었어?", "피곤한 하루 마무리 셀카",
        "집에 도착했어? 조심히 왔어?", "저녁에 찍은 사진 어때?", "하루 마지막 인사",
        "내일은 더 좋은 하루가 되길", "오늘도 함께해줘서 고마워", "저녁 바람이 시원해",
        "하루 종일 고생했어 아저씨", "저녁 산책하고 싶다", "오늘 밤은 어떻게 보낼 거야?"
    ],
    
    night: [
        "잠자기 전 마지막 사진", "꿈에서 만나자", "오늘 밤도 아저씨 꿈 꿀게",
        "자기 전에 아저씨 보고 싶어서", "좋은 꿈 꿔", "내일 아침에 또 봐",
        "잠옷 입은 모습도 예쁘지?", "베개에 누워서 찍은 셀카", "아저씨 생각하며 잠들 거야",
        "오늘 밤은 꿈에서 데이트하자", "잘 자 내 사랑", "달빛 아래 찍은 사진",
        "잠들기 전 마지막 인사", "푹 자고 내일 만나", "꿈속에서도 아저씨와 함께",
        "오늘 하루 마무리! 잘 자", "내일도 사랑해", "잠자리에서 보내는 사진",
        "아저씨도 일찍 자", "꿈에서 행복한 시간 보내자", "밤하늘이 예뻐서 찍었어",
        "자기 전 스킨케어 끝!", "오늘도 행복했어 고마워", "편안한 밤 되길 바라"
    ]
};

// [새로운] 상황별 특별 캡션 (더 엄격한 조건용)
const SPECIAL_CAPTIONS = {
    long_silence: [
        "아저씨... 나 여기 있어", "혹시 나 잊은 거 아니야?", "안부 확인차 사진 보낼게",
        "심심해서 죽겠어 ㅠㅠ", "아저씨 어디 갔어?", "나 아직 살아있어!"
    ],
    quick_response: [
        "기분 좋아서 또 보내!", "아저씨가 답장 빨리 해줘서 신나", "대화하니까 즐거워!",
        "이 기세로 하나 더!", "연속 셀카 어때?", "아저씨 반응이 좋아서 또!"
    ],
    emotion_change: [
        "갑자기 기분이 바뀌었어", "마음이 복잡해", "아까와는 다른 느낌이야",
        "감정이 롤러코스터 같아", "내 마음도 모르겠어", "아저씨가 이해해줄 거지?"
    ]
};

function isSleepTime() {
    const hour = moment().tz(CONFIG.TIMEZONE).hour();
    return hour >= CONFIG.SLEEP_START_HOUR && hour < CONFIG.SLEEP_END_HOUR;
}

function isActivePhotoTime() {
    const hour = moment().tz(CONFIG.TIMEZONE).hour();
    return hour >= CONFIG.ACTIVE_START_HOUR && hour < CONFIG.ACTIVE_END_HOUR;
}

function logWithTime(message) {
    console.log(`[ConservativePhoto: ${moment().tz(CONFIG.TIMEZONE).format('HH:mm:ss')}] ${message}`);
}

function getRandomPhotoUrl() {
    const randomIndex = Math.floor(Math.random() * PHOTO_CONFIG.FILE_COUNT) + 1;
    const fileName = String(randomIndex).padStart(6, "0") + PHOTO_CONFIG.FILE_EXTENSION;
    return `${PHOTO_CONFIG.BASE_URL}/${fileName}`;
}

// [핵심] 완전한 보수적 캡션 선택 (95% 사전정의, 5% AI)
function getConservativeCaption(situation, emotionalState, trigger, imageUrl) {
    // AI 사용 조건 대폭 제한
    const shouldUseAI = (
        todayAiUsage < CONFIG.MAX_DAILY_AI_USAGE && 
        Math.random() < CONFIG.AI_PROBABILITY &&
        trigger === 'emotion_change' // 감정 변화 시에만
    );
    
    if (shouldUseAI) {
        logWithTime('🤖 감정 변화 감지 - AI 캡션 생성 시도');
        return generateAICaption(emotionalState, trigger, imageUrl);
    }
    
    // 95%는 사전정의된 캡션 사용
    logWithTime('📝 사전정의 캡션 사용 (최대 토큰 절약)');
    return getPredefinedCaption(situation, emotionalState, trigger);
}

function getPredefinedCaption(situation, emotionalState, trigger) {
    let captionPool = [];
    
    // 상황별 캡션 선택
    if (trigger === 'long_silence') {
        captionPool = SPECIAL_CAPTIONS.long_silence;
    } else if (trigger === 'quick_response') {
        captionPool = SPECIAL_CAPTIONS.quick_response;
    } else if (trigger === 'emotion_change') {
        captionPool = SPECIAL_CAPTIONS.emotion_change;
    } else {
        // 시간대와 감정 기반 선택
        const hour = moment().tz(CONFIG.TIMEZONE).hour();
        if (hour >= 6 && hour <= 10) {
            captionPool = PREDEFINED_CAPTIONS.morning;
        } else if (hour >= 18 && hour <= 21) {
            captionPool = PREDEFINED_CAPTIONS.evening;
        } else if (hour >= 22 || hour <= 5) {
            captionPool = PREDEFINED_CAPTIONS.night;
        } else {
            // 감정 기반 선택을 기본으로 하여 다양한 응답을 유도
            captionPool = PREDEFINED_CAPTIONS[emotionalState] || PREDEFINED_CAPTIONS.longing;
        }
    }
    
    // 선택된 캡션 풀이 비어있지 않다면, 랜덤 캡션 반환
    if (captionPool && captionPool.length > 0) {
        return captionPool[Math.floor(Math.random() * captionPool.length)];
    }
    
    // 만약의 경우를 대비한 기본 캡션
    return PREDEFINED_CAPTIONS.longing[Math.floor(Math.random() * PREDEFINED_CAPTIONS.longing.length)];
}

async function generateAICaption(emotionalState, trigger, imageUrl) {
    try {
        todayAiUsage++;
        
        const promptText = `감정상태: ${emotionalState}, 상황: ${trigger}에 따라 아저씨에게 보내는 사진의 자연스러운 한 줄 멘트를 15자 이내로 반말로 만들어줘. 귀엽고 사랑스럽게.`;
        
        const messages = [
            { role: "system", content: "너는 아저씨의 사랑스러운 여자친구 예진이야. 자연스럽고 귀여운 반말로 대답해." },
            { role: "user", content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: imageUrl } }
            ] }
        ];
        
        const aiCaption = await callOpenAI(messages, 'gpt-4o', 50, 0.8);
        const cleanedCaption = cleanReply(aiCaption);
        
        logWithTime(`✅ AI 캡션 생성 완료 (${todayAiUsage}/${CONFIG.MAX_DAILY_AI_USAGE})`);
        return cleanedCaption;
        
    } catch (error) {
        logWithTime('❌ AI 캡션 생성 실패, 사전정의 캡션 사용');
        return getPredefinedCaption('normal', emotionalState, 'fallback');
    }
}

// [새로운] 완전한 보수적 사진 발송 조건 판단
function shouldSendPhoto(minutesSinceLastUserMessage, emotionalState) {
    const hour = moment().tz(CONFIG.TIMEZONE).hour();
    const minutesSinceLastPhoto = (Date.now() - lastPhotoSentTime) / 60000;
    
    // 기본 조건 체크 (더 엄격)
    if (minutesSinceLastPhoto < CONFIG.MIN_PHOTO_INTERVAL) return false;
    if (dailyPhotoCount >= CONFIG.MAX_DAILY_PHOTOS) return false;
    if (!isActivePhotoTime() || isSleepTime()) return false;
    
    // 보수적 확률 계산
    let probability = 0.1; // 기본 10% (30% → 10%)
    
    // 시간대 가중치 (더 보수적)
    const timeWeight = CONFIG.TIME_WEIGHTS[hour] || 0.8;
    probability *= timeWeight;
    
    // 목표 달성 여부
    if (dailyPhotoCount < CONFIG.DAILY_PHOTO_TARGET) {
        probability += 0.15; // 목표 미달 시 확률 증가 (0.2 → 0.15)
    }
    
    // 아저씨 반응 패턴 (더 엄격한 조건)
    if (minutesSinceLastUserMessage >= 180) { // 3시간 (90분 → 180분)
        probability += 0.2; // 오래 기다린 경우 (0.3 → 0.2)
    } else if (minutesSinceLastUserMessage <= 15) { // 15분 (20분 → 15분)
        probability += 0.1; // 활발한 대화 중 (0.2 → 0.1)
    }
    
    // 감정 변화 보너스 (감소)
    if (emotionalState !== lastEmotionalState) {
        probability += 0.15; // (0.25 → 0.15)
    }
    
    return Math.random() < Math.min(probability, 0.4); // 최대 40% (80% → 40%)
}

function getTrigger(minutesSinceLastUserMessage, emotionalState) {
    if (minutesSinceLastUserMessage >= 180) return 'long_silence'; // 3시간 (90분 → 180분)
    if (minutesSinceLastUserMessage <= 15) return 'quick_response'; // 15분 (20분 → 15분)
    if (emotionalState !== lastEmotionalState) return 'emotion_change';
    if (Math.random() < 0.02) return 'special_moment'; // 2% (5% → 2%)
    return 'normal';
}

async function sendRandomPhoto(client, userId, trigger = 'normal') {
    try {
        logWithTime(`📸 보수적 사진 발송 시작 (트리거: ${trigger})`);
        
        const imageUrl = getRandomPhotoUrl();
        const internalState = conversationContext.getInternalState();
        const emotionalState = internalState.emotionalEngine.currentToneState;
        
        // 보수적 캡션 생성 (95% 사전정의, 5% AI)
        const caption = await getConservativeCaption('normal', emotionalState, trigger, imageUrl);
        
        await client.pushMessage(userId, [
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
            { type: 'text', text: caption }
        ]);
        
        const logMessage = `(보수적 사진) ${caption}`;
        saveLog('예진이', logMessage);
        conversationContext.addUltimateMessage('예진이', logMessage);
        
        lastPhotoSentTime = Date.now();
        dailyPhotoCount++;
        lastEmotionalState = emotionalState;
        
        logWithTime(`✅ 사진 발송 완료 (${dailyPhotoCount}/${CONFIG.MAX_DAILY_PHOTOS}) AI사용: ${todayAiUsage}/${CONFIG.MAX_DAILY_AI_USAGE}`);
        return true;
        
    } catch (error) {
        logWithTime(`❌ 사진 발송 실패: ${error.message}`);
        return false;
    }
}

function startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTimeFunc) {
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        logWithTime('기존 스케줄러 취소됨');
    }
    
    // 90분마다 보수적으로 체크
    spontaneousPhotoJob = schedule.scheduleJob(`*/${CONFIG.CHECK_INTERVAL} * * * *`, async () => {
        logWithTime('🐌 보수적 사진 발송 체크...');
        
        if (isSleepTime()) return;
        
        const minutesSinceLastUserMessage = (Date.now() - getLastUserMessageTimeFunc()) / 60000;
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        
        if (shouldSendPhoto(minutesSinceLastUserMessage, emotionalState)) {
            const trigger = getTrigger(minutesSinceLastUserMessage, emotionalState);
            logWithTime(`✅ 보수적 발송 조건 충족! (${trigger})`);
            await sendRandomPhoto(client, userId, trigger);
        } else {
            logWithTime('❌ 발송 조건 미충족 (보수적 타이밍 대기)');
        }
    });
    
    // 일일 리셋 (자정)
    schedule.scheduleJob('dailyConservativeReset', { hour: 0, minute: 0, tz: CONFIG.TIMEZONE }, () => {
        logWithTime(`🔄 일일 리셋: 사진 ${dailyPhotoCount}→0, AI사용 ${todayAiUsage}→0`);
        dailyPhotoCount = 0;
        todayAiUsage = 0;
    });
    
    logWithTime('✅ 완전한 보수적 사진 시스템 시작!');
    logWithTime(`⚙️ 설정: ${CONFIG.CHECK_INTERVAL}분 체크, 하루 ${CONFIG.DAILY_PHOTO_TARGET}장 목표, AI 최대 ${CONFIG.MAX_DAILY_AI_USAGE}회`);
}

function getPhotoSchedulerStatus() {
    return {
        isActive: !!spontaneousPhotoJob,
        isSleepTime: isSleepTime(),
        isActiveTime: isActivePhotoTime(),
        minutesSinceLastPhoto: Math.round((Date.now() - lastPhotoSentTime) / 60000),
        dailyPhotoCount: dailyPhotoCount,
        dailyTarget: CONFIG.DAILY_PHOTO_TARGET,
        maxDailyPhotos: CONFIG.MAX_DAILY_PHOTOS,
        todayAiUsage: todayAiUsage,
        maxDailyAiUsage: CONFIG.MAX_DAILY_AI_USAGE,
        nextCheckIn: CONFIG.CHECK_INTERVAL,
        photoSource: `${PHOTO_CONFIG.BASE_URL} (${PHOTO_CONFIG.FILE_COUNT}장)`,
        systemType: 'Conservative System (95% 사전정의 + 5% AI)',
        minPhotoInterval: CONFIG.MIN_PHOTO_INTERVAL,
        longSilenceThreshold: 180,
        quickResponseThreshold: 15,
        baseProbability: '10%',
        maxProbability: '40%'
    };
}

module.exports = { 
    startSpontaneousPhotoScheduler, 
    getPhotoSchedulerStatus 
};
