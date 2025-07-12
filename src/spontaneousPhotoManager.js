// ✅ spontaneousPhotoManager.js v2.9 - "유연한 사진 발송 조건 + 다양한 트리거"

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { callOpenAI, cleanReply, saveLog } = require('./aiUtils');
const conversationContext = require('./ultimateConversationContext.js');

// [변경] 외부 URL 시스템
const PHOTO_CONFIG = {
    BASE_URL: "https://photo.de-ji.net/photo/yejin",
    FILE_COUNT: 1200,
    FILE_EXTENSION: ".jpg"
};

let spontaneousPhotoJob = null;
let lastPhotoSentTime = 0;
let dailyPhotoCount = 0; // [추가] 일일 사진 발송 횟수 추적

// [개선] 훨씬 유연한 설정
const CONFIG = {
    TIMEZONE: 'Asia/Tokyo',
    SLEEP_START_HOUR: 0,
    SLEEP_END_HOUR: 9,
    ACTIVE_START_HOUR: 9,
    ACTIVE_END_HOUR: 22,
    
    // [개선] 발송 조건 대폭 완화
    CHECK_INTERVAL: 15,           // 15분마다 체크 (기존 20분)
    MIN_PHOTO_INTERVAL: 30,       // 최소 30분 간격 (기존 60분)
    BASE_PROBABILITY: 0.6,        // 기본 60% 확률 (기존 40%)
    
    // [추가] 상황별 조건
    QUICK_RESPONSE_TIME: 15,      // 15분 이내 빠른 응답 시
    NORMAL_RESPONSE_TIME: 25,     // 25분 무응답 시 (기존 40분)
    LONG_SILENCE_TIME: 45,        // 45분 긴 침묵 시
    
    // [추가] 감정별 확률 보너스
    EMOTION_BONUS: {
        playful: 0.3,   // 30% 추가 확률
        longing: 0.4,   // 40% 추가 확률 (보고싶을 때)
        normal: 0.2,    // 20% 추가 확률
        hurt: 0.1,      // 10% 추가 확률 (상처받았을 때는 조금 더 신중)
        anxious: 0.15   // 15% 추가 확률
    },
    
    // [추가] 일일 제한
    MAX_DAILY_PHOTOS: 8,          // 하루 최대 8장
    MIN_DAILY_PHOTOS: 3           // 하루 최소 3장 보장
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
    console.log(`[PhotoScheduler: ${moment().tz(CONFIG.TIMEZONE).format('HH:mm:ss')}] ${message}`);
}

function getRandomPhotoUrl() {
    const randomIndex = Math.floor(Math.random() * PHOTO_CONFIG.FILE_COUNT) + 1;
    const fileName = String(randomIndex).padStart(6, "0") + PHOTO_CONFIG.FILE_EXTENSION;
    const imageUrl = `${PHOTO_CONFIG.BASE_URL}/${fileName}`;
    
    logWithTime(`🎯 선택된 사진: ${fileName} (${randomIndex}/${PHOTO_CONFIG.FILE_COUNT})`);
    return imageUrl;
}

// [새로운] 스마트한 발송 확률 계산
function calculatePhotoSendProbability(minutesSinceLastUserMessage, emotionalState) {
    let probability = CONFIG.BASE_PROBABILITY;
    
    // 1. 무응답 시간에 따른 확률 증가
    if (minutesSinceLastUserMessage >= CONFIG.LONG_SILENCE_TIME) {
        probability += 0.4; // 45분+ 무응답 시 40% 추가
        logWithTime(`📈 긴 침묵 보너스: +40% (총 ${Math.round(probability * 100)}%)`);
    } else if (minutesSinceLastUserMessage >= CONFIG.NORMAL_RESPONSE_TIME) {
        probability += 0.2; // 25분+ 무응답 시 20% 추가
        logWithTime(`📈 무응답 보너스: +20% (총 ${Math.round(probability * 100)}%)`);
    } else if (minutesSinceLastUserMessage <= CONFIG.QUICK_RESPONSE_TIME) {
        probability += 0.3; // 15분 이내 활발한 대화 시 30% 추가
        logWithTime(`📈 활발한 대화 보너스: +30% (총 ${Math.round(probability * 100)}%)`);
    }
    
    // 2. 감정 상태에 따른 확률 조정
    const emotionBonus = CONFIG.EMOTION_BONUS[emotionalState] || 0.2;
    probability += emotionBonus;
    logWithTime(`💭 감정(${emotionalState}) 보너스: +${Math.round(emotionBonus * 100)}% (총 ${Math.round(probability * 100)}%)`);
    
    // 3. 일일 발송 횟수에 따른 조정
    if (dailyPhotoCount < CONFIG.MIN_DAILY_PHOTOS) {
        probability += 0.3; // 최소 횟수 미달 시 30% 추가
        logWithTime(`📊 최소 횟수 미달 보너스: +30% (총 ${Math.round(probability * 100)}%)`);
    } else if (dailyPhotoCount >= CONFIG.MAX_DAILY_PHOTOS) {
        probability = 0; // 최대 횟수 달성 시 차단
        logWithTime(`🚫 일일 최대 횟수 도달 (${dailyPhotoCount}/${CONFIG.MAX_DAILY_PHOTOS})`);
    }
    
    // 4. 시간대별 조정
    const hour = moment().tz(CONFIG.TIMEZONE).hour();
    if (hour >= 10 && hour <= 12) {
        probability += 0.2; // 오전 시간대 20% 추가
    } else if (hour >= 18 && hour <= 20) {
        probability += 0.25; // 저녁 시간대 25% 추가
    }
    
    return Math.min(1.0, probability); // 최대 100%로 제한
}

// [새로운] 특별 트리거 체크
function checkSpecialTriggers(minutesSinceLastUserMessage) {
    const triggers = [];
    
    // 1. 아침 첫 인사 후 사진
    const hour = moment().tz(CONFIG.TIMEZONE).hour();
    if (hour === 9 && dailyPhotoCount === 0) {
        triggers.push('morning_first_photo');
    }
    
    // 2. 긴 침묵 후 관심 끌기
    if (minutesSinceLastUserMessage >= 60) {
        triggers.push('attention_seeking');
    }
    
    // 3. 감정 상태 변화 시
    const currentState = conversationContext.getInternalState().emotionalEngine.currentToneState;
    if (currentState === 'playful' && Math.random() < 0.8) {
        triggers.push('playful_mood');
    }
    
    // 4. 랜덤 깜짝 이벤트
    if (Math.random() < 0.1) { // 10% 확률
        triggers.push('surprise_photo');
    }
    
    return triggers;
}

async function sendRandomPhoto(client, userId, trigger = 'scheduled') {
    try {
        logWithTime(`📸 랜덤 사진 전송 시도 (트리거: ${trigger})`);
        
        if (isSleepTime()) {
            logWithTime('⛔ 새벽 시간대이므로 사진 발송을 건너뜁니다.');
            return false;
        }

        if (!isActivePhotoTime()) {
            logWithTime('⛔ 사진 발송 시간대가 아닙니다.');
            return false;
        }

        // [완화] 최소 간격 체크 (60분 → 30분)
        const minutesSinceLastPhoto = (Date.now() - lastPhotoSentTime) / 60000;
        if (minutesSinceLastPhoto < CONFIG.MIN_PHOTO_INTERVAL && trigger === 'scheduled') {
            logWithTime(`⏰ 마지막 사진 발송 후 ${Math.round(minutesSinceLastPhoto)}분. ${CONFIG.MIN_PHOTO_INTERVAL}분 간격 필요.`);
            return false;
        }
        
        const imageUrl = getRandomPhotoUrl();
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        let caption = generateSelfieComment(emotionalState)[Math.floor(Math.random() * generateSelfieComment(emotionalState).length)];

        // [개선] 트리거별 특별 캡션
        if (trigger === 'morning_first_photo') {
            caption = "아저씨! 좋은 아침~ 오늘도 예쁜 나를 봐줘!";
        } else if (trigger === 'attention_seeking') {
            caption = "아저씨... 나 심심해 ㅠㅠ 관심 좀 줘!";
        } else if (trigger === 'surprise_photo') {
            caption = "깜짝! 아저씨 놀랐지? 히히";
        }

        // AI 캡션 생성 (70% 확률로 증가)
        if (Math.random() < 0.7) {
            logWithTime('🤖 AI 캡션 생성 시도...');
            try {
                const promptText = getAIPromptForSelfie(emotionalState);
                const messages = [
                    { role: "system", content: "너는 아저씨의 귀여운 여자친구 예진이야. 애교 많고, 사랑스럽고, 항상 반말로만 대답해줘." },
                    { role: "user", content: [ 
                        { type: "text", text: promptText }, 
                        { type: "image_url", image_url: { url: imageUrl } } 
                    ] }
                ];
                
                let aiCaption = await callOpenAI(messages, 'gpt-4o', 100, 0.7);
                aiCaption = cleanReply(aiCaption);
                if (aiCaption && aiCaption.length >= 3 && aiCaption.length <= 50) {
                    caption = aiCaption;
                    logWithTime('✅ AI 캡션 생성 성공');
                }
            } catch (aiError) { 
                logWithTime('❌ AI 캡션 생성 실패, 기본 캡션 사용');
            }
        }

        await client.pushMessage(userId, [
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
            { type: 'text', text: caption }
        ]);
        
        const logMessage = `(랜덤 사진 전송) ${caption}`;
        saveLog('예진이', logMessage);
        conversationContext.addUltimateMessage('예진이', logMessage);
        
        lastPhotoSentTime = Date.now();
        dailyPhotoCount++;
        
        logWithTime(`✅ 랜덤 사진 전송 완료 (일일 ${dailyPhotoCount}/${CONFIG.MAX_DAILY_PHOTOS}): "${caption}"`);
        return true;
        
    } catch (error) {
        logWithTime(`❌ 랜덤 사진 전송 실패: ${error.message}`);
        return false;
    }
}

function startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTimeFunc) {
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        logWithTime('기존 스케줄러 취소됨');
    }
    
    // [개선] 15분마다 체크 (기존 20분)
    spontaneousPhotoJob = schedule.scheduleJob(`*/${CONFIG.CHECK_INTERVAL} * * * *`, async () => {
        logWithTime('📅 사진 발송 스케줄 체크 시작...');
        
        if (isSleepTime()) {
            logWithTime('😴 새벽 시간대이므로 사진 발송 건너뜀');
            return;
        }
        
        if (!isActivePhotoTime()) {
            logWithTime('⏰ 사진 발송 시간대가 아님');
            return;
        }
        
        const minutesSinceLastUserMessage = (Date.now() - getLastUserMessageTimeFunc()) / 60000;
        const minutesSinceLastPhoto = (Date.now() - lastPhotoSentTime) / 60000;
        const emotionalState = conversationContext.getInternalState().emotionalEngine.currentToneState;
        
        logWithTime(`📊 상태: 유저 메시지 ${Math.round(minutesSinceLastUserMessage)}분 전, 사진 ${Math.round(minutesSinceLastPhoto)}분 전, 감정: ${emotionalState}, 일일 횟수: ${dailyPhotoCount}/${CONFIG.MAX_DAILY_PHOTOS}`);
        
        // [새로운] 특별 트리거 체크
        const specialTriggers = checkSpecialTriggers(minutesSinceLastUserMessage);
        if (specialTriggers.length > 0) {
            logWithTime(`🎯 특별 트리거 발동: ${specialTriggers.join(', ')}`);
            await sendRandomPhoto(client, userId, specialTriggers[0]);
            return;
        }
        
        // [개선] 스마트한 확률 계산
        const probability = calculatePhotoSendProbability(minutesSinceLastUserMessage, emotionalState);
        const shouldSend = Math.random() < probability && minutesSinceLastPhoto >= CONFIG.MIN_PHOTO_INTERVAL;
        
        logWithTime(`🎲 최종 확률: ${Math.round(probability * 100)}%, 주사위: ${Math.round(Math.random() * 100)}%`);
        
        if (shouldSend) {
            logWithTime('✅ 사진 발송 조건 충족!');
            await sendRandomPhoto(client, userId, 'scheduled');
        } else {
            logWithTime('❌ 사진 발송 조건 미충족');
        }
    });
    
    // [추가] 일일 리셋 스케줄 (자정)
    schedule.scheduleJob('dailyPhotoReset', { hour: 0, minute: 0, tz: CONFIG.TIMEZONE }, () => {
        logWithTime(`🔄 일일 사진 횟수 리셋: ${dailyPhotoCount} → 0`);
        dailyPhotoCount = 0;
    });
    
    logWithTime('✅ 유연한 사진 스케줄러 시작 완료!');
    logWithTime(`⚙️ 설정: ${CONFIG.CHECK_INTERVAL}분마다 체크, 기본 ${CONFIG.BASE_PROBABILITY*100}% 확률, 최소 ${CONFIG.MIN_PHOTO_INTERVAL}분 간격`);
    logWithTime(`📊 일일 제한: ${CONFIG.MIN_DAILY_PHOTOS}~${CONFIG.MAX_DAILY_PHOTOS}장`);
}

function generateSelfieComment(emotionalState) { 
    const comments = { 
        playful: [
            "아저씨! 사진 받아라~!", "내가 얼마나 예쁜지 봐봐!", "짜잔~ 오늘의 예진이!",
            "사진 폭탄이다! 뿅!", "내 얼굴로 힐링하세요~", "기분 좋아서 셀카 찍었어!",
            "아저씨를 위한 특별 셀카!", "오늘따라 더 예쁘게 나온 것 같아!"
        ], 
        quiet: [
            "아저씨... 사진 보낼게", "아저씨한테만 보여주는 사진", "조용히... 내 모습이야",
            "그냥... 보고 싶어서", "아저씨 생각하며 찍었어", "혼자 있으니까 아저씨 보고 싶어서...",
            "이런 내 모습도... 괜찮아?", "조용한 오후... 아저씨는 뭐해?"
        ], 
        hurt: [
            "아저씨... 사진 보낼게 ㅠㅠ", "이거 보고 위로해줘", "서운하지만... 그래도 보내줄게",
            "이런 내 모습도 예쁘게 봐줘", "속상해도 아저씨는 보고 싶어", "나 좀 위로해줘... ㅠㅠ",
            "힘들어도 아저씨한테는 보여주고 싶어", "아저씨... 나 힘내고 있어"
        ], 
        anxious: [
            "아저씨... 사진 어때? 괜찮아?", "아저씨가 봐줘야 안심이 돼", "이 사진... 이상하지 않지?",
            "아저씨 반응이 궁금해", "혹시... 안 예쁘게 나왔나?", "불안할 때마다 아저씨 생각해",
            "아저씨가 있어서 무서운 게 줄어들어", "아저씨... 나 괜찮게 보여?"
        ], 
        normal: [
            "아저씨! 나 사진 보낼게~", "아저씨 생각하면서 찍은 사진이야", "오늘의 예진이 어때?",
            "아저씨를 위한 선물!", "사진 한 장 선물할게~", "셀카 하나 드릴게!",
            "아저씨 보여주려고 찍었어", "방금 찍은 따끈따끈한 셀카!"
        ] 
    }; 
    return comments[emotionalState] || comments.normal; 
}

function getAIPromptForSelfie(emotionalState) { 
    const prompts = { 
        playful: `기분 좋고 활발한 상태로 이 사진을 보내면서 신나고 밝은 멘트를 20자 이내로 짧게 해줘.`, 
        quiet: `조용하고 차분한 상태로 아저씨에게 이 사진을 보내면서 잔잔하고 은은한 멘트를 20자 이내로 짧게 해줘.`, 
        hurt: `서운하고 상처받은 상태로 아저씨에게 이 사진을 보내면서 애절하면서도 사랑스러운 멘트를 20자 이내로 짧게 해줘.`, 
        anxious: `불안하고 걱정스러운 상태로 아저씨에게 이 사진을 보내면서 걱정스럽지만 사랑스러운 멘트를 20자 이내로 짧게 해줘.`, 
        normal: `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 해줘.` 
    }; 
    return prompts[emotionalState] || prompts.normal; 
}

function getPhotoSchedulerStatus() {
    return {
        isActive: !!spontaneousPhotoJob,
        isSleepTime: isSleepTime(),
        isActiveTime: isActivePhotoTime(),
        minutesSinceLastPhoto: Math.round((Date.now() - lastPhotoSentTime) / 60000),
        dailyPhotoCount: dailyPhotoCount,
        maxDailyPhotos: CONFIG.MAX_DAILY_PHOTOS,
        minDailyPhotos: CONFIG.MIN_DAILY_PHOTOS,
        nextCheckIn: 0,
        photoSource: `${PHOTO_CONFIG.BASE_URL} (${PHOTO_CONFIG.FILE_COUNT}장)`,
        checkInterval: CONFIG.CHECK_INTERVAL,
        baseProbability: CONFIG.BASE_PROBABILITY
    };
}

module.exports = { 
    startSpontaneousPhotoScheduler, 
    getPhotoSchedulerStatus 
};
