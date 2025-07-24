// ============================================================================
// emotionalContextManager.js - v8.1 FINAL (생리주기 현실화 + 간단명료)
// 🧠 감정 상태, 💬 말투, ❤️ 애정 표현을 계산하고 관리
// 🩸 현실적인 28일 생리주기 직접 계산 (23일차 PMS로 수정)
// 💬 설명충 해결: 간단명료한 로직으로 수정
// 🎓 실시간 학습 시스템 연동 추가 (v8.2)
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

// ==================== 🩸 현실적인 28일 생리주기 계산 ====================
function calculateMenstrualCycle() {
    // 🩸 마지막 생리 시작일 (예시: 2024년 12월 1일)
    const lastPeriodDate = new Date('2025-07-24');
    const currentDate = new Date();
    
    // 현재 몇 일차인지 계산
    const daysSinceLastPeriod = Math.floor((currentDate - lastPeriodDate) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysSinceLastPeriod % 28) + 1; // 1-28일 순환
    
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
        // 19-25일차: PMS 시작 ⭐️ 23일차는 여기!
        phase = 'pms_start';
        description = 'PMS 시작';
        emotion = 'sensitive';
    } else {
        // 26-28일차: PMS 심화
        phase = 'pms_severe';
        description = 'PMS 심화';
        emotion = 'unstable';
    }
    
    // 다음 생리까지 남은 일수
    const daysUntilNext = 28 - cycleDay;
    
    return {
        cycleDay,
        phase,
        description,
        emotion,
        isPeriodActive,
        daysUntilNext,
        emotionKorean: translateEmotionToKorean(emotion)
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
        
        console.log(`💖 [Emotion] 감정 시스템 초기화 완료 - ${cycle.cycleDay}일차 (${cycle.description})`);
        
        // 1시간마다 감정 회복
        setInterval(updateEmotionalRecovery, 60 * 60 * 1000);
        
    } catch (error) {
        console.error('❌ [Emotion] 초기화 실패:', error.message);
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
    
    console.log(`💧 [Emotion] 회복 업데이트: ${cycle.description} - ${translateEmotionToKorean(cycle.emotion)}`);
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
        
        // 🩸 생리주기 정보
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
    
    console.log(`[Emotion] 업데이트: ${translateEmotionToKorean(emotion)} (강도: ${intensity})`);
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
    
    console.log(`[Emotion] 삐짐: ${isSulky} (레벨: ${level})`);
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

// ==================== 🎓 실시간 학습 시스템 연동 함수 (NEW!) ====================

/**
 * 🎓 실시간 학습에서 감정 학습 결과 반영 (muku-realTimeLearningSystem.js 연동용)
 * @param {Array} emotionalImprovements - 감정 개선사항 배열
 * @param {string} emotionalImprovements[].emotion - 개선된 감정 타입
 * @param {string} emotionalImprovements[].action - 개선 내용
 * @param {number} emotionalImprovements[].quality - 품질 점수 (0-1)
 */
function updateEmotionalLearning(emotionalImprovements) {
    try {
        console.log(`💖 [Emotion] 🎓 실시간 학습 감정 개선사항 ${emotionalImprovements.length}개 처리 중...`);
        
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
                    
                    console.log(`💖 [Emotion] 🌟 고품질 감정 학습 반영: ${translateEmotionToKorean(safeImprovement.emotion)} (품질: ${safeImprovement.quality})`);
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
            
            console.log(`💖 [Emotion] 🎓 감정 학습 적용: ${translateEmotionToKorean(safeImprovement.emotion)} - ${safeImprovement.action}`);
        }
        
        // 전체적인 감정 시스템 안정성 조정
        if (processedCount > 0) {
            const averageQuality = totalQuality / processedCount;
            
            // 평균 품질이 높으면 전체적으로 안정적인 감정 상태로 조정
            if (averageQuality >= 0.8) {
                globalEmotionState.emotionIntensity = Math.max(1, Math.min(8, globalEmotionState.emotionIntensity));
                console.log(`💖 [Emotion] 🎯 고품질 학습으로 감정 안정성 증가 (평균 품질: ${averageQuality.toFixed(2)})`);
            }
        }
        
        console.log(`💖 [Emotion] ✅ 실시간 감정 학습 완료: ${processedCount}개 처리됨`);
        return true;
        
    } catch (error) {
        console.error(`💖 [Emotion] ❌ 실시간 감정 학습 실패: ${error.message}`);
        return false;
    }
}

// ==================== 📤 모듈 내보내기 ====================
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
    
    // 🎓 실시간 학습 연동 함수 (NEW!)
    updateEmotionalLearning,
    
    // 생리주기 관련
    calculateMenstrualPhase: calculateMenstrualCycle,
    
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
