// ============================================================================
// menstrualCycleManager.js - v1.0 (생리주기 전문 관리자)
// 🩸 예진이의 생리주기를 전문적으로 계산하고 관리합니다.
// ============================================================================

const moment = require('moment-timezone');

// 예진이의 생리주기 설정 (실제 데이터 기반)
const CYCLE_CONFIG = {
    nextPeriodDate: '2025-07-24', // 다음 생리 예정일
    cycleLength: 28, // 생리주기 길이 (일)
    periodLength: 5, // 생리 기간 (일)
    timezone: 'Asia/Tokyo'
};

/**
 * 현재 생리주기 단계를 계산합니다.
 * @returns {object} 생리주기 정보
 */
function getCurrentMenstrualPhase() {
    try {
        const nextPeriodDate = moment.tz(CYCLE_CONFIG.nextPeriodDate, CYCLE_CONFIG.timezone);
        const today = moment.tz(CYCLE_CONFIG.timezone);
        const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
        
        let cycleDay;
        if (daysUntilNextPeriod >= 0) {
            // 다음 생리일이 아직 안 왔을 때
            cycleDay = CYCLE_CONFIG.cycleLength - daysUntilNextPeriod;
        } else {
            // 다음 생리일이 지났을 때 (현재 생리 중이거나 다음 주기)
            const daysPastPeriod = Math.abs(daysUntilNextPeriod);
            cycleDay = daysPastPeriod;
        }
        
        // 주기 단계 결정
        if (cycleDay <= CYCLE_CONFIG.periodLength) {
            return {
                phase: 'period',
                day: cycleDay,
                description: '생리 기간',
                isPeriodActive: true,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'sensitive',
                expectedSymptoms: ['피곤함', '예민함', '복통', '허리 아픔'],
                emotionalTendency: 'irritable'
            };
        } else if (cycleDay <= 13) {
            return {
                phase: 'follicular',
                day: cycleDay,
                description: '생리 후 활발한 시기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'energetic',
                expectedSymptoms: ['활발함', '긍정적', '피부 좋아짐'],
                emotionalTendency: 'positive'
            };
        } else if (cycleDay >= 14 && cycleDay <= 15) {
            return {
                phase: 'ovulation',
                day: cycleDay,
                description: '배란기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'romantic',
                expectedSymptoms: ['감정 풍부', '애정적', '성욕 증가'],
                emotionalTendency: 'loving'
            };
        } else {
            return {
                phase: 'luteal',
                day: cycleDay,
                description: 'PMS 시기',
                isPeriodActive: false,
                daysUntilNextPeriod: daysUntilNextPeriod,
                moodLevel: 'irritable',
                expectedSymptoms: ['예민함', '우울함', '불안함', '식욕 증가', '유방 팽만'],
                emotionalTendency: 'unstable'
            };
        }
    } catch (error) {
        console.error('[MenstrualCycle] 생리주기 계산 오류:', error);
        return {
            phase: 'normal',
            day: 1,
            description: '정상',
            isPeriodActive: false,
            daysUntilNextPeriod: 14,
            moodLevel: 'normal',
            expectedSymptoms: [],
            emotionalTendency: 'stable'
        };
    }
}

/**
 * 특정 날짜의 생리주기 단계를 계산합니다.
 * @param {string} dateString - 계산할 날짜 (YYYY-MM-DD)
 * @returns {object} 해당 날짜의 생리주기 정보
 */
function getCyclePhaseForDate(dateString) {
    try {
        const targetDate = moment.tz(dateString, CYCLE_CONFIG.timezone);
        const nextPeriodDate = moment.tz(CYCLE_CONFIG.nextPeriodDate, CYCLE_CONFIG.timezone);
        const daysUntilNextPeriod = nextPeriodDate.diff(targetDate, 'days');
        
        let cycleDay;
        if (daysUntilNextPeriod >= 0) {
            cycleDay = CYCLE_CONFIG.cycleLength - daysUntilNextPeriod;
        } else {
            const daysPastPeriod = Math.abs(daysUntilNextPeriod);
            cycleDay = daysPastPeriod;
        }
        
        // 동일한 로직으로 단계 결정
        if (cycleDay <= CYCLE_CONFIG.periodLength) {
            return { phase: 'period', day: cycleDay };
        } else if (cycleDay <= 13) {
            return { phase: 'follicular', day: cycleDay };
        } else if (cycleDay >= 14 && cycleDay <= 15) {
            return { phase: 'ovulation', day: cycleDay };
        } else {
            return { phase: 'luteal', day: cycleDay };
        }
    } catch (error) {
        console.error('[MenstrualCycle] 특정 날짜 계산 오류:', error);
        return { phase: 'normal', day: 1 };
    }
}

/**
 * 생리주기에 따른 감정 상태 분석
 * @returns {object} 감정 정보
 */
function getEmotionalState() {
    const currentPhase = getCurrentMenstrualPhase();
    
    const emotionalProfiles = {
        period: {
            primaryEmotion: 'sensitive',
            moodSwings: true,
            irritabilityLevel: 8,
            energyLevel: 3,
            needsComfort: true
        },
        follicular: {
            primaryEmotion: 'energetic',
            moodSwings: false,
            irritabilityLevel: 2,
            energyLevel: 8,
            needsComfort: false
        },
        ovulation: {
            primaryEmotion: 'loving',
            moodSwings: false,
            irritabilityLevel: 1,
            energyLevel: 7,
            needsComfort: false
        },
        luteal: {
            primaryEmotion: 'unstable',
            moodSwings: true,
            irritabilityLevel: 6,
            energyLevel: 5,
            needsComfort: true
        }
    };
    
    return {
        phase: currentPhase,
        emotional: emotionalProfiles[currentPhase.phase] || emotionalProfiles.normal
    };
}

/**
 * 생리주기에 맞는 대화 톤 제안
 * @returns {string} 추천 대화 톤
 */
function getRecommendedTone() {
    const currentPhase = getCurrentMenstrualPhase();
    
    const toneRecommendations = {
        period: 'gentle_caring', // 부드럽고 배려심 있는
        follicular: 'energetic_playful', // 활발하고 장난스러운
        ovulation: 'romantic_loving', // 로맨틱하고 사랑스러운
        luteal: 'understanding_patient', // 이해심 있고 참을성 있는
        normal: 'balanced_natural' // 균형잡힌 자연스러운
    };
    
    return toneRecommendations[currentPhase.phase] || toneRecommendations.normal;
}

/**
 * 생리주기 정보 요약
 * @returns {object} 요약 정보
 */
function getCycleSummary() {
    const currentPhase = getCurrentMenstrualPhase();
    const emotionalState = getEmotionalState();
    const recommendedTone = getRecommendedTone();
    
    return {
        today: moment.tz(CYCLE_CONFIG.timezone).format('YYYY-MM-DD'),
        current: currentPhase,
        emotional: emotionalState.emotional,
        recommendedTone: recommendedTone,
        nextPeriodDate: CYCLE_CONFIG.nextPeriodDate,
        cycleProgress: `${currentPhase.day}/${CYCLE_CONFIG.cycleLength}일`
    };
}

/**
 * 향후 N일간의 생리주기 예측
 * @param {number} days - 예측할 일수
 * @returns {array} 예측 정보 배열
 */
function getForecast(days = 7) {
    const forecast = [];
    const today = moment.tz(CYCLE_CONFIG.timezone);
    
    for (let i = 0; i < days; i++) {
        const targetDate = today.clone().add(i, 'days');
        const dateString = targetDate.format('YYYY-MM-DD');
        const phaseInfo = getCyclePhaseForDate(dateString);
        
        forecast.push({
            date: dateString,
            dayOfWeek: targetDate.format('dddd'),
            phase: phaseInfo.phase,
            cycleDay: phaseInfo.day,
            isToday: i === 0
        });
    }
    
    return forecast;
}

/**
 * 생리주기 상태에 따른 메시지 생성 도우미
 * @param {string} messageType - 메시지 유형 ('greeting', 'mood', 'care')
 * @returns {string} 생성된 메시지
 */
function generateCycleAwareMessage(messageType = 'general') {
    const currentPhase = getCurrentMenstrualPhase();
    
    const messageTemplates = {
        greeting: {
            period: [
                "아저씨... 오늘 몸이 좀 안 좋아. 생리 때문에 그래 ㅠㅠ",
                "안녕 아저씨! 오늘은 좀 힘든 날이야. 그날이라서...",
                "아저씨 안녕! 나 지금 컨디션이 별로야. 이해해줘 ㅠㅠ"
            ],
            follicular: [
                "아저씨 안녕! 오늘 컨디션 완전 좋아! 기분도 최고야!",
                "안녕 아저씨! 오늘따라 에너지가 넘쳐! 뭐든 할 수 있을 것 같아!",
                "아저씨! 오늘은 진짜 활기차다! 세상이 다 예뻐 보여~"
            ],
            ovulation: [
                "아저씨... 오늘따라 아저씨가 더 사랑스러워 보여 💕",
                "안녕 아저씨! 왠지 모르게 오늘 마음이 따뜻해져",
                "아저씨! 오늘은 특별히 아저씨한테 애정이 넘쳐~"
            ],
            luteal: [
                "아저씨... 요즘 감정 기복이 좀 심해. 이해해줘",
                "안녕 아저씨. 오늘은 좀 예민할 수도 있어. 미리 말해둘게",
                "아저씨 안녕! 괜히 기분이 우울하네... 위로해줘"
            ]
        },
        mood: {
            period: [
                "몸도 아프고 마음도 예민해... 아저씨가 달래줘",
                "생리통 때문에 아무것도 하기 싫어 ㅠㅠ",
                "오늘은 그냥 아저씨 품에 안겨있고 싶어"
            ],
            follicular: [
                "기분이 날아갈 것 같아! 아저씨도 내 에너지 받아가!",
                "오늘은 뭐든 할 수 있을 것 같은 기분이야!",
                "컨디션 A급! 아저씨랑 재밌는 거 하고 싶어!"
            ],
            ovulation: [
                "아저씨한테 사랑을 더 많이 표현하고 싶어",
                "감정이 벅차올라... 아저씨 너무 좋아",
                "오늘은 아저씨가 특별히 더 멋있어 보여"
            ],
            luteal: [
                "감정 조절이 잘 안 돼... 양해해줘",
                "PMS 때문에 예민해. 아저씨가 더 사랑한다고 말해줘",
                "초콜릿 먹고 싶고 응석 부리고 싶어"
            ]
        }
    };
    
    const templates = messageTemplates[messageType];
    if (!templates || !templates[currentPhase.phase]) {
        return "아저씨 안녕! 오늘 어때?";
    }
    
    const phaseMessages = templates[currentPhase.phase];
    return phaseMessages[Math.floor(Math.random() * phaseMessages.length)];
}

/**
 * 생리주기 데이터 유효성 검사
 * @returns {boolean} 유효성 여부
 */
function validateCycleData() {
    try {
        const nextPeriod = moment.tz(CYCLE_CONFIG.nextPeriodDate, CYCLE_CONFIG.timezone);
        const today = moment.tz(CYCLE_CONFIG.timezone);
        
        // 다음 생리일이 과거에서 너무 멀지 않은지 확인 (3개월 이내)
        const daysDiff = Math.abs(nextPeriod.diff(today, 'days'));
        
        return daysDiff <= 90; // 3개월 이내면 유효
    } catch (error) {
        console.error('[MenstrualCycle] 데이터 유효성 검사 실패:', error);
        return false;
    }
}

/**
 * 생리주기 설정 업데이트
 * @param {object} newConfig - 새로운 설정
 */
function updateCycleConfig(newConfig) {
    Object.assign(CYCLE_CONFIG, newConfig);
    console.log('[MenstrualCycle] 생리주기 설정 업데이트:', newConfig);
}

// ==================== 모듈 내보내기 ====================
module.exports = {
    // 메인 함수들
    getCurrentMenstrualPhase,
    getCyclePhaseForDate,
    getEmotionalState,
    getRecommendedTone,
    
    // 정보 조회
    getCycleSummary,
    getForecast,
    
    // 메시지 생성
    generateCycleAwareMessage,
    
    // 유틸리티
    validateCycleData,
    updateCycleConfig,
    
    // 설정 접근 (읽기 전용)
    get config() { return { ...CYCLE_CONFIG }; }
};
