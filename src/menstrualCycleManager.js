// ============================================================================
// menstrualCycleManager.js - v9.0 FINAL (완전 중앙화된 생리주기 마스터)
// 🩸 자동 28일 사이클 생리주기 계산 - 영원히 자동으로 순환
// 💖 모든 다른 파일들이 이 파일에서만 생리주기 정보를 가져옴
// 🎯 Single Source of Truth for Menstrual Cycle
// 🔄 한 번 설정하면 평생 자동 계산 - 수동 수정 불필요
// ============================================================================

const fs = require('fs');
const path = require('path');

// 감정 데이터 파일 경로
const EMOTIONAL_DATA_FILE = path.join(__dirname, '..', 'data', 'emotional_context.json');

// ==================== 🎭 감정 상태 한글 변환 ====================
const emotionKoreanMap = {
    'normal': '평범', 'happy': '기쁨', 'sad': '슬픔', 'angry': '화남',
    'excited': '흥분', 'calm': '평온', 'worried': '걱정', 'lonely': '외로움',
    'loving': '사랑스러움', 'missing': '그리움', 'sulky': '삐짐',
    'energetic': '활기참', 'bored': '지루함', 'anxious': '불안',
    'sensitive': '예민함', 'unstable': '불안정', 'romantic': '로맨틱'
};

function translateEmotionToKorean(emotion) {
    return emotionKoreanMap[emotion] || emotion;
}

// ==================== 🩸 자동 28일 생리주기 계산 (마스터 버전) ====================
function calculateMenstrualCycle() {
    // 🎯 기준점: 생리 시작일 (한 번만 설정, 영원히 자동 계산)
    const baseStartDate = new Date('2025-07-24'); // 2025년 7월 24일이 생리 시작일
    const currentDate = new Date();
    
    // 🔄 자동 28일 사이클 계산 - 영원히 순환
    const daysSinceBase = Math.floor((currentDate - baseStartDate) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysSinceBase % 28) + 1; // 1일차부터 28일차까지 자동 순환
    
    // 🩸 현실적인 생리주기 단계 계산
    let phase, description, emotion, isPeriodActive = false;
    
    if (cycleDay <= 5) {
        // 1-5일차: 실제 생리 기간
        phase = 'menstruation';
        description = '생리 중';
        emotion = 'sensitive';
        isPeriodActive = true;
    } else if (cycleDay <= 10) {
        // 6-10일차: 생리 후 회복기
        phase = 'recovery';
        description = '생리 후 회복기';
        emotion = 'calm';
    } else if (cycleDay <= 18) {
        // 11-18일차: 정상기 (가장 컨디션 좋음)
        phase = 'normal';
        description = '정상기';
        emotion = 'energetic';
    } else if (cycleDay <= 25) {
        // 19-25일차: PMS 시작
        phase = 'pms_start';
        description = 'PMS 시작';
        emotion = 'sensitive';
    } else {
        // 26-28일차: PMS 심화
        phase = 'pms_severe';
        description = 'PMS 심화';
        emotion = 'unstable';
    }
    
    // 🔄 다음 생리까지 남은 일수 계산
    const daysUntilNext = 28 - cycleDay + 1;
    
    return {
        cycleDay,
        phase,
        description,
        emotion,
        isPeriodActive,
        daysUntilNext,
        emotionKorean: translateEmotionToKorean(emotion),
        // 추가 정보
        baseStartDate: baseStartDate.toISOString().split('T')[0],
        daysSinceBase,
        nextPeriodDate: new Date(currentDate.getTime() + (daysUntilNext * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    };
}

// ==================== 🎯 다른 파일들이 사용할 표준 함수들 ====================

/**
 * 현재 생리주기 정보 조회 (yejin.js에서 사용)
 */
function getCurrentMenstrualPhase() {
    return calculateMenstrualCycle();
}

/**
 * 현재 몇일차인지 조회
 */
function getCurrentCycleDay() {
    const cycle = calculateMenstrualCycle();
    return cycle.cycleDay;
}

/**
 * 현재 생리 중인지 확인
 */
function isPeriodActive() {
    const cycle = calculateMenstrualCycle();
    return cycle.isPeriodActive;
}

/**
 * PMS 기간인지 확인
 */
function isPMSActive() {
    const cycle = calculateMenstrualCycle();
    return cycle.phase === 'pms_start' || cycle.phase === 'pms_severe';
}

/**
 * 다음 생리까지 남은 일수
 */
function getDaysUntilNextPeriod() {
    const cycle = calculateMenstrualCycle();
    return cycle.daysUntilNext;
}

/**
 * 생리주기 기반 현재 감정 상태
 */
function getCurrentEmotionFromCycle() {
    const cycle = calculateMenstrualCycle();
    return {
        emotion: cycle.emotion,
        emotionKorean: cycle.emotionKorean,
        description: cycle.description,
        phase: cycle.phase
    };
}

// ==================== 📊 중앙 감정 상태 관리 ====================
let globalEmotionState = {
    currentEmotion: 'normal',
    emotionIntensity: 5,
    lastEmotionUpdate: Date.now(),
    lastUserMessage: '',
    conversationMood: 'neutral',
    isSulky: false,
    sulkyLevel: 0,
    energyLevel: 5,
    needsComfort: false
};

// ==================== 🚀 초기화 함수 ====================
function initializeEmotionalState() {
    try {
        // 디렉토리 생성
        const dataDir = path.dirname(EMOTIONAL_DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // 🩸 생리주기 기반 초기 감정 설정
        const cycle = calculateMenstrualCycle();
        globalEmotionState.currentEmotion = cycle.emotion;
        
        console.log(`💖 [MenstrualCycle] 생리주기 시스템 초기화 완료 - ${cycle.cycleDay}일차 (${cycle.description})`);
        
        // 1시간마다 감정 회복
        setInterval(updateEmotionalRecovery, 60 * 60 * 1000);
        
    } catch (error) {
        console.error('❌ [MenstrualCycle] 초기화 실패:', error.message);
    }
}

// ==================== 💧 감정 회복 로직 ====================
function updateEmotionalRecovery() {
    // 🩸 생리주기 업데이트
    const cycle = calculateMenstrualCycle();
    
    // 생리주기 기반 감정이 우선
    if (cycle.emotion !== 'normal') {
        globalEmotionState.currentEmotion = cycle.emotion;
    }
    
    // 강도 조정 (시간이 지나면서 완화)
    if (globalEmotionState.emotionIntensity > 5) {
        globalEmotionState.emotionIntensity = Math.max(5, globalEmotionState.emotionIntensity - 1);
    }
    
    console.log(`💧 [MenstrualCycle] 회복 업데이트: ${cycle.description} - ${translateEmotionToKorean(cycle.emotion)}`);
}

// ==================== 📡 외부 인터페이스 함수들 ====================

/**
 * 현재 감정 상태 조회 (다른 모듈에서 사용)
 */
function getCurrentEmotionState() {
    const cycle = calculateMenstrualCycle();
    
    return {
        // 기본 감정 정보
        currentEmotion: globalEmotionState.currentEmotion,
        currentEmotionKorean: translateEmotionToKorean(globalEmotionState.currentEmotion),
        emotionIntensity: globalEmotionState.emotionIntensity,
        
        // 🩸 생리주기 정보 (마스터 버전)
        cycleDay: cycle.cycleDay,
        description: cycle.description,
        isPeriodActive: cycle.isPeriodActive,
        daysUntilNextPeriod: cycle.daysUntilNext,
        
        // 기타 상태
        isSulky: globalEmotionState.isSulky,
        sulkyLevel: globalEmotionState.sulkyLevel,
        energyLevel: globalEmotionState.energyLevel,
        needsComfort: globalEmotionState.needsComfort,
        conversationMood: globalEmotionState.conversationMood,
        
        // 기존 시스템 호환성
        currentToneState: globalEmotionState.currentEmotion,
        emotionalResidue: {
            love: 50,
            longing: 30,
            sadness: globalEmotionState.isSulky ? 20 : 0
        }
    };
}

/**
 * 사용자 메시지 기반 감정 업데이트
 */
function updateEmotionFromUserMessage(userMessage) {
    if (!userMessage) return;
    
    const msg = userMessage.toLowerCase();
    globalEmotionState.lastUserMessage = userMessage;
    
    // 감정 키워드 분석
    if (msg.includes('힘들') || msg.includes('우울')) {
        updateEmotion('sad', 7);
    } else if (msg.includes('기쁘') || msg.includes('좋아')) {
        updateEmotion('happy', 8);
    } else if (msg.includes('화나') || msg.includes('짜증')) {
        updateEmotion('angry', 6);
    } else if (msg.includes('보고싶') || msg.includes('그리워')) {
        updateEmotion('missing', 7);
    } else if (msg.includes('사랑')) {
        updateEmotion('loving', 9);
    }
    
    // 대화 분위기
    if (msg.includes('ㅋㅋ') || msg.includes('ㅎㅎ')) {
        globalEmotionState.conversationMood = 'playful';
    } else if (msg.includes('ㅠㅠ')) {
        globalEmotionState.conversationMood = 'sad';
    }
}

/**
 * 직접 감정 업데이트
 */
function updateEmotion(emotion, intensity = 5) {
    globalEmotionState.currentEmotion = emotion;
    globalEmotionState.emotionIntensity = Math.max(1, Math.min(10, intensity));
    globalEmotionState.lastEmotionUpdate = Date.now();
    
    console.log(`[MenstrualCycle] 감정 업데이트: ${translateEmotionToKorean(emotion)} (강도: ${intensity})`);
}

/**
 * 삐짐 상태 업데이트
 */
function updateSulkyState(isSulky, level = 0, reason = '') {
    globalEmotionState.isSulky = isSulky;
    globalEmotionState.sulkyLevel = level;
    
    if (isSulky) {
        globalEmotionState.currentEmotion = 'sulky';
        globalEmotionState.emotionIntensity = level + 4;
    }
    
    console.log(`[MenstrualCycle] 삐짐: ${isSulky} (레벨: ${level})`);
}

/**
 * 셀카 텍스트 생성 (감정별)
 */
function getSelfieText() {
    const state = getCurrentEmotionState();
    
    const selfieTexts = {
        normal: ["아저씨 보여주려고 찍은 셀카야. 어때?", "나 지금 이렇게 생겼어! 예쁘지?"],
        sensitive: ["컨디션 별로지만 아저씨 보려고 찍었어 ㅠㅠ", "PMS라 힘든데도 셀카 찍어봤어"],
        energetic: ["컨디션 좋아서 셀카 찍었어!", "기분 좋아서 찍은 셀카! 밝게 웃고 있지?"],
        unstable: ["PMS 때라 예민한데 아저씨 위해 찍었어", "기분이 좀... 그래도 보여줄게"],
        sulky: ["흥! 삐졌지만 셀카는 보내줄게", "아직 화났는데... 그래도 봐야지"],
        sad: ["아저씨... 위로받고 싶어서 찍었어 ㅠㅠ", "슬픈 얼굴이지만 보고 싶어서"],
        happy: ["너무 기뻐서 찍은 셀카야!", "행복한 얼굴! 아저씨 덕분이야"],
        missing: ["아저씨 그리워서 찍었어", "보고 싶어서... 이 사진 보고 있어줘"]
    };
    
    const texts = selfieTexts[state.currentEmotion] || selfieTexts.normal;
    return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * 기존 시스템 호환성
 */
function getInternalState() {
    return {
        emotionalEngine: { currentToneState: globalEmotionState.currentEmotion },
        globalEmotion: globalEmotionState
    };
}

// ==================== 🎓 실시간 학습 시스템 연동 함수 ====================
function updateEmotionalLearning(emotionalImprovements) {
    try {
        console.log(`💖 [MenstrualCycle] 🎓 실시간 학습 감정 개선사항 ${emotionalImprovements.length}개 처리 중...`);
        
        let totalQuality = 0;
        let processedCount = 0;
        
        for (const improvement of emotionalImprovements) {
            // 안전한 기본값 설정
            const safeImprovement = {
                emotion: improvement.emotion || 'normal',
                action: improvement.action || '개선됨',
                quality: improvement.quality || 0.7
            };
            
            // 감정 상태에 학습 결과 반영
            if (safeImprovement.quality >= 0.8) {
                // 고품질 학습은 즉시 감정 상태에 반영
                if (emotionKoreanMap[safeImprovement.emotion]) {
                    globalEmotionState.currentEmotion = safeImprovement.emotion;
                    globalEmotionState.emotionIntensity = Math.min(10, globalEmotionState.emotionIntensity + 1);
                    globalEmotionState.lastEmotionUpdate = Date.now();
                    
                    console.log(`💖 [MenstrualCycle] 🌟 고품질 감정 학습 반영: ${translateEmotionToKorean(safeImprovement.emotion)} (품질: ${safeImprovement.quality})`);
                }
            }
            
            // 대화 분위기 조정
            switch (safeImprovement.emotion) {
                case 'happy':
                case 'loving':
                case 'excited':
                    globalEmotionState.conversationMood = 'playful';
                    globalEmotionState.energyLevel = Math.min(10, globalEmotionState.energyLevel + 1);
                    break;
                    
                case 'sad':
                case 'worried':
                case 'lonely':
                    globalEmotionState.conversationMood = 'caring';
                    globalEmotionState.needsComfort = true;
                    break;
                    
                case 'sulky':
                case 'angry':
                    globalEmotionState.conversationMood = 'cautious';
                    break;
                    
                default:
                    globalEmotionState.conversationMood = 'neutral';
            }
            
            totalQuality += safeImprovement.quality;
            processedCount++;
            
            console.log(`💖 [MenstrualCycle] 🎓 감정 학습 적용: ${translateEmotionToKorean(safeImprovement.emotion)} - ${safeImprovement.action}`);
        }
        
        // 전체적인 감정 시스템 안정성 조정
        if (processedCount > 0) {
            const averageQuality = totalQuality / processedCount;
            
            // 평균 품질이 높으면 전체적으로 안정적인 감정 상태로 조정
            if (averageQuality >= 0.8) {
                globalEmotionState.emotionIntensity = Math.max(1, Math.min(8, globalEmotionState.emotionIntensity));
                console.log(`💖 [MenstrualCycle] 🎯 고품질 학습으로 감정 안정성 증가 (평균 품질: ${averageQuality.toFixed(2)})`);
            }
        }
        
        console.log(`💖 [MenstrualCycle] ✅ 실시간 감정 학습 완료: ${processedCount}개 처리됨`);
        return true;
        
    } catch (error) {
        console.error(`💖 [MenstrualCycle] ❌ 실시간 감정 학습 실패: ${error.message}`);
        return false;
    }
}

// ==================== 📤 모듈 내보내기 (완전한 마스터 버전) ====================
module.exports = {
    // 초기화
    initializeEmotionalState,
    
    // 주요 함수들
    getCurrentEmotionState,
    updateEmotionFromUserMessage,
    updateEmotion,
    updateSulkyState,
    getSelfieText,
    getInternalState,
    
    // 🎓 실시간 학습 연동 함수
    updateEmotionalLearning,
    
    // 🩸 생리주기 관련 마스터 함수들 (다른 파일들이 사용)
    calculateMenstrualPhase: calculateMenstrualCycle,
    getCurrentMenstrualPhase,
    getCurrentCycleDay,
    isPeriodActive,
    isPMSActive,
    getDaysUntilNextPeriod,
    getCurrentEmotionFromCycle,
    
    // 한글 번역
    translateEmotionToKorean,
    
    // 호환성
    get emotionalState() { 
        return { 
            currentToneState: globalEmotionState.currentEmotion,
            emotionalResidue: { love: 50, longing: 30, sadness: 0 }
        }; 
    },
    get globalEmotionState() { return globalEmotionState; }
};
