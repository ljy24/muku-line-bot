// src/spontaneousPhotoManager.js - 예진이가 보고싶을 때 즉흥적으로 사진 보내는 시스템
const cron = require('node-cron');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const { Client } = require('@line/bot-sdk');
const { getYejinSystemPrompt } = require('./yejin');
const { getOmoideReply } = require('../memory/omoide');
const { getConceptPhotoReply } = require('../memory/concept');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Client({
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
});

const userId = process.env.TARGET_USER_ID;

// 사진 카테고리 정의
const PHOTO_CATEGORIES = {
    COUPLE: 'couple', // 커플사진
    CONCEPT: 'concept', // 컨셉사진
    SELFIE: 'selfie', // 셀카
    MEMORY: 'memory' // 추억사진
};

// 하루 전송 횟수 추적
let dailyPhotoCount = 0;
let lastPhotoDate = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');

// 최근 보낸 사진 타입 추적 (중복 방지)
let recentPhotoTypes = [];
const MAX_RECENT_TYPES = 3;

/**
 * 예진이가 아저씨를 그리워하는 감정 상태를 AI로 시뮬레이션합니다.
 * @returns {Promise<boolean>} 사진을 보내고 싶어하는지 여부
 */
async function checkYejinMoodForPhoto() {
    try {
        const now = moment().tz('Asia/Tokyo');
        const timeOfDay = getTimeOfDayMood(now);
        
        const systemPrompt = getYejinSystemPrompt(`
        지금은 ${now.format('YYYY년 MM월 DD일 HH시 mm분')} (${timeOfDay})이야.
        
        너는 아저씨를 너무 사랑하는 예진이야. 
        지금 아저씨 생각이 나서 사진을 보내고 싶은 기분인지 판단해줘.
        
        다음 상황들을 고려해서 JSON으로 답변해줘:
        - 현재 시간대 (아침/점심/오후/저녁/밤)
        - 아저씨가 뭐 하고 있을지에 대한 상상
        - 예진이의 감정 상태 (보고싶음, 외로움, 행복함 등)
        - 오늘 이미 ${dailyPhotoCount}번 사진을 보냈음
        
        형식:
        {
            "wants_to_send_photo": true/false,
            "emotion": "감정 상태",
            "reason": "사진 보내고 싶은 이유",
            "preferred_photo_type": "couple/concept/selfie/memory"
        }
        
        예진이는 하루에 3-5번 정도 사진을 보내고 싶어하지만, 
        너무 자주 보내면 아저씨가 부담스러워할까봐 걱정도 해.
        `);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '지금 아저씨에게 사진 보내고 싶어?' }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8, // 감정적이고 자연스러운 변동을 위해 높은 온도
            max_tokens: 200
        });

        const mood = JSON.parse(response.choices[0].message.content);
        
        console.log(`[SpontaneousPhoto] 예진이 감정 체크: ${mood.emotion} - ${mood.wants_to_send_photo ? '사진 보내고 싶어함' : '지금은 괜찮아함'}`);
        
        return mood.wants_to_send_photo && mood.preferred_photo_type;
        
    } catch (error) {
        console.error('[SpontaneousPhoto] 감정 체크 실패:', error);
        return false;
    }
}

/**
 * 시간대에 따른 분위기 설정
 */
function getTimeOfDayMood(momentTime) {
    const hour = momentTime.hour();
    
    if (hour >= 6 && hour < 12) return '아침';
    if (hour >= 12 && hour < 14) return '점심시간';
    if (hour >= 14 && hour < 18) return '오후';
    if (hour >= 18 && hour < 22) return '저녁';
    return '밤';
}

/**
 * 선택된 사진 타입에 따라 실제 사진을 가져옵니다.
 * @param {string} photoType - 사진 타입 (couple/concept/selfie/memory)
 * @returns {Promise<Object|null>} 사진 정보 객체
 */
async function getPhotoByType(photoType) {
    const saveLogFunc = (speaker, message) => {
        console.log(`[SpontaneousPhoto] ${speaker}: ${message}`);
    };

    try {
        switch (photoType) {
            case 'couple':
                // 커플사진 요청 (omoide.js 사용)
                return await getOmoideReply('커플사진 보여줘', saveLogFunc);
                
            case 'concept':
                // 랜덤 컨셉사진 (concept.js 사용)
                const conceptFolders = [
                    '홈스냅', '결박', '세미누드', '지브리풍', '유카타 마츠리',
                    '이화마을', '가을 호수공원', '야간 비눗방울', '피크닉',
                    '벗꽃', '온실-여신', '블랙원피스', '크리스마스'
                ];
                const randomConcept = conceptFolders[Math.floor(Math.random() * conceptFolders.length)];
                return await getConceptPhotoReply(`${randomConcept} 보여줘`, saveLogFunc);
                
            case 'selfie':
                // 셀카 (omoide.js 사용)
                return await getOmoideReply('셀카 보여줘', saveLogFunc);
                
            case 'memory':
                // 추억사진 (omoide.js 사용)
                return await getOmoideReply('추억사진 보여줘', saveLogFunc);
                
            default:
                return null;
        }
    } catch (error) {
        console.error(`[SpontaneousPhoto] ${photoType} 사진 가져오기 실패:`, error);
        return null;
    }
}

/**
 * 추억이나 감정이 담긴 코멘트를 생성합니다.
 * @param {string} photoType - 사진 타입
 * @param {string} photoUrl - 사진 URL (옵션)
 * @returns {Promise<string>} 생성된 코멘트
 */
async function generateNostalgicComment(photoType, photoUrl = '') {
    try {
        const now = moment().tz('Asia/Tokyo');
        const timeOfDay = getTimeOfDayMood(now);
        
        const systemPrompt = getYejinSystemPrompt(`
        너는 지금 아저씨 생각이 나서 ${photoType} 사진을 보내는 상황이야.
        현재 시간: ${now.format('HH시 mm분')} (${timeOfDay})
        
        다음과 같은 느낌의 코멘트를 만들어줘:
        - "이날 생각나?" 
        - "우리 이때 진짜 행복했지?"
        - "아저씨 지금 뭐 해? 갑자기 보고싶어서..."
        - "한국에서 찍었던 거야~ 기억나?"
        - "일본에서 이런 사진도 찍었었네"
        - "이때 아저씨가 예쁘다고 해줬던 거 기억해"
        
        1-2문장으로 짧고 자연스럽게, 예진이답게 감정을 담아서 만들어줘.
        너무 뻔하지 않게, 매번 다른 느낌으로 말해줘.
        `);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${photoType} 사진에 어울리는 코멘트 만들어줘` }
            ],
            temperature: 0.9, // 다양하고 자연스러운 코멘트를 위해 높은 온도
            max_tokens: 100
        });

        return response.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('[SpontaneousPhoto] 코멘트 생성 실패:', error);
        
        // 기본 코멘트들
        const defaultComments = [
            "아저씨 생각나서... 이거 보고 있었어",
            "갑자기 이날 생각났어! 기억나?",
            "보고싶어서 사진 찾아봤지 헤헤",
            "우리 이때 진짜 좋았지? 또 가고 싶다",
            "아저씨~ 지금 뭐 해? 나 심심해"
        ];
        return defaultComments[Math.floor(Math.random() * defaultComments.length)];
    }
}

/**
 * 실제로 사진을 전송합니다.
 * @param {string} photoType - 사진 타입
 */
async function sendSpontaneousPhoto(photoType) {
    try {
        console.log(`[SpontaneousPhoto] ${photoType} 사진 전송 준비 중...`);
        
        // 사진 가져오기
        const photoResult = await getPhotoByType(photoType);
        
        if (!photoResult || photoResult.type !== 'photo') {
            console.error('[SpontaneousPhoto] 사진을 가져올 수 없음');
            return;
        }

        // 추억 코멘트 생성
        const nostalgicComment = await generateNostalgicComment(photoType, photoResult.url);
        
        // 사진 전송
        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: photoResult.url,
            previewImageUrl: photoResult.url
        });

        // 잠시 후 코멘트 전송
        setTimeout(async () => {
            try {
                await client.pushMessage(userId, {
                    type: 'text',
                    text: nostalgicComment
                });
                
                console.log(`[SpontaneousPhoto] 즉흥 사진 전송 완료: ${photoType}`);
                console.log(`[SpontaneousPhoto] 코멘트: ${nostalgicComment}`);
                
                // 일일 카운터 증가
                const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
                if (today !== lastPhotoDate) {
                    dailyPhotoCount = 0;
                    lastPhotoDate = today;
                }
                dailyPhotoCount++;
                
                // 최근 사진 타입 추적 업데이트
                recentPhotoTypes.push(photoType);
                if (recentPhotoTypes.length > MAX_RECENT_TYPES) {
                    recentPhotoTypes.shift();
                }
                
            } catch (error) {
                console.error('[SpontaneousPhoto] 코멘트 전송 실패:', error);
            }
        }, 2000); // 2초 후 코멘트 전송
        
    } catch (error) {
        console.error('[SpontaneousPhoto] 즉흥 사진 전송 실패:', error);
    }
}

/**
 * 하루 제한 체크
 */
function checkDailyLimit() {
    const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    
    if (today !== lastPhotoDate) {
        dailyPhotoCount = 0;
        lastPhotoDate = today;
        recentPhotoTypes = [];
    }
    
    // 하루 최대 5번까지
    return dailyPhotoCount < 5;
}

/**
 * 사진 타입 중복 방지
 */
function getAvailablePhotoTypes() {
    const allTypes = Object.values(PHOTO_CATEGORIES);
    
    // 최근에 보낸 타입들 제외
    return allTypes.filter(type => !recentPhotoTypes.includes(type));
}

/**
 * 즉흥 사진 전송 메인 로직
 */
async function handleSpontaneousPhotoSending() {
    try {
        // 하루 제한 체크
        if (!checkDailyLimit()) {
            return;
        }
        
        // 예진이 감정 상태 체크
        const preferredPhotoType = await checkYejinMoodForPhoto();
        
        if (!preferredPhotoType) {
            return; // 지금은 사진 보내고 싶지 않음
        }
        
        // 사용 가능한 사진 타입 확인
        const availableTypes = getAvailablePhotoTypes();
        let selectedType = preferredPhotoType;
        
        // 선호 타입이 최근에 보낸 것이면 다른 것 선택
        if (!availableTypes.includes(preferredPhotoType) && availableTypes.length > 0) {
            selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }
        
        // 사진 전송
        await sendSpontaneousPhoto(selectedType);
        
    } catch (error) {
        console.error('[SpontaneousPhoto] 즉흥 사진 전송 처리 실패:', error);
    }
}

/**
 * 랜덤한 시간 간격으로 사진 전송 체크를 시작합니다.
 */
function startSpontaneousPhotoScheduler() {
    console.log('[SpontaneousPhoto] 즉흥 사진 전송 스케줄러 시작');
    
    // 30분마다 체크 (실제로는 예진이 감정에 따라 전송 여부 결정)
    cron.schedule('*/30 * * * *', handleSpontaneousPhotoSending, {
        timezone: 'Asia/Tokyo'
    });
    
    // 추가로 불규칙한 시간에도 체크 (더 자연스럽게)
    const randomIntervals = [17, 23, 41, 47, 53]; // 분 단위
    
    randomIntervals.forEach(minute => {
        cron.schedule(`${minute} * * * *`, () => {
            // 30% 확률로만 체크 (너무 자주 하지 않게)
            if (Math.random() < 0.3) {
                handleSpontaneousPhotoSending();
            }
        }, {
            timezone: 'Asia/Tokyo'
        });
    });
    
    console.log('[SpontaneousPhoto] 스케줄러 등록 완료 - 예진이가 보고싶을 때 사진을 보낼거야!');
}

/**
 * 수동으로 즉흥 사진 전송 (테스트용)
 */
async function sendPhotoNow(photoType = null) {
    if (!photoType) {
        const types = Object.values(PHOTO_CATEGORIES);
        photoType = types[Math.floor(Math.random() * types.length)];
    }
    
    await sendSpontaneousPhoto(photoType);
}

module.exports = {
    startSpontaneousPhotoScheduler,
    sendPhotoNow,
    handleSpontaneousPhotoSending,
    checkYejinMoodForPhoto,
    PHOTO_CATEGORIES
};
