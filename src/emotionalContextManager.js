// ============================================================================
// emotionalContextManager.js - v9.0 (순환 의존성만 해결, 기존 기능 100% 유지)
// 🎯 고유 기능 보존: 세밀한감정분석 + 한글변환 + 셀카텍스트 + 감정회복
// 🔄 moodManager 통합: Redis 연동으로 무쿠 벙어리 문제 해결
// 🩸 생리주기 마스터 연동: menstrualCycleManager (안전한 지연 로딩)
// 🛡️ 안전 우선: 순환 의존성만 제거, 기존 기능 100% 보존
// ============================================================================

const fs = require('fs');
const path = require('path');

// 🩸 생리주기 마스터 - 안전한 지연 로딩 (순환 의존성 방지)
let menstrualCycleManager = null;
function getMenstrualCycleManager() {
    if (!menstrualCycleManager) {
        try {
            menstrualCycleManager = require('./menstrualCycleManager');
            console.log('✅ [EmotionalContext] 생리주기 매니저 연동 성공');
        } catch (error) {
            console.log('⚠️ [EmotionalContext] 생리주기 매니저 연동 실패:', error.message);
            // 폴백: 내장 생리주기 시스템 사용
            menstrualCycleManager = {
                getCurrentMenstrualPhase: () => {
                    const startDate = new Date('2024-01-01');
                    const today = new Date();
                    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                    const cycleDay = (daysSinceStart % 28) + 1;
                    
                    let emotion = 'normal';
                    let description = '평범한 컨디션';
                    let isPeriodActive = false;
                    
                    if (cycleDay >= 1 && cycleDay <= 5) {
                        emotion = 'sensitive';
                        description = '생리중 - 예민하고 컨디션 안좋음';
                        isPeriodActive = true;
                    } else if (cycleDay >= 22 && cycleDay <= 28) {
                        emotion = 'unstable';
                        description = 'PMS - 감정 기복이 심함';
                        isPeriodActive = false;
                    } else if (cycleDay >= 6 && cycleDay <= 12) {
                        emotion = 'energetic';
                        description = '생리 후 - 컨디션 좋음';
                        isPeriodActive = false;
                    }
                    
                    return {
                        cycleDay,
                        emotion,
                        description,
                        isPeriodActive,
                        daysUntilNext: 28 - cycleDay
                    };
                }
            };
        }
    }
    return menstrualCycleManager;
}

// 🔄 통합 무드매니저 - 안전한 지연 로딩 (순환 의존성 방지)
let integratedMoodManager = null;
function getIntegratedMoodManager() {
    if (!integratedMoodManager) {
        try {
            integratedMoodManager = require('./moodManager');
            console.log('✅ [EmotionalContext] 통합 무드매니저 연동 성공');
        } catch (error) {
            console.log('⚠️ [EmotionalContext] 통합 무드매니저 연동 실패:', error.message);
        }
    }
    return integratedMoodManager;
}

// 감정 데이터 파일 경로
const EMOTIONAL_DATA_FILE = path.join(__dirname, '..', 'data', 'emotional_context.json');

// ==================== 🎭 감정 상태 한글 변환 (고유 기능) ====================
const emotionKoreanMap = {
    'normal': '평범', 'happy': '기쁨', 'sad': '슬픔', 'angry': '화남',
    'excited': '흥분', 'calm': '평온', 'worried': '걱정', 'lonely': '외로움',
    'loving': '사랑스러움', 'missing': '그리움', 'sulky': '삐짐',
    'energetic': '활기찬', 'bored': '지루함', 'anxious': '불안',
    'sensitive': '예민함', 'unstable': '불안정', 'romantic': '로맨틱',
    'playful': '장난스러움', 'caring': '돌봄', 'sleepy': '졸림',
    'frustrated': '답답함', 'content': '만족', 'melancholy': '우울함'
};

function translateEmotionToKorean(emotion) {
    return emotionKoreanMap[emotion] || emotion;
}

// ==================== 📊 로컬 감정 상태 (통합 시스템과 동기화) ====================
let localEmotionState = {
    currentEmotion: 'normal',
    emotionIntensity: 5,
    lastEmotionUpdate: Date.now(),
    lastUserMessage: '',
    conversationMood: 'neutral',
    isSulky: false,
    sulkyLevel: 0,
    energyLevel: 5,
    needsComfort: false,
    
    // 통합 동기화 상태
    lastSyncTime: 0,
    isSyncWithMoodManager: false
};

// ==================== 🔄 통합 무드매니저와 동기화 ====================

/**
 * 🔄 통합 무드매니저와 양방향 동기화
 */
async function syncWithIntegratedMoodManager() {
    try {
        const moodManager = getIntegratedMoodManager();
        if (!moodManager) {
            return false;
        }
        
        // 통합 무드매니저에서 최신 상태 가져오기
        const integratedState = await moodManager.getIntegratedMoodState();
        
        if (integratedState) {
            // 로컬 상태를 통합 상태로 업데이트 (단방향 동기화)
            localEmotionState.currentEmotion = integratedState.currentEmotion || localEmotionState.currentEmotion;
            localEmotionState.emotionIntensity = integratedState.intensity || localEmotionState.emotionIntensity;
            localEmotionState.lastSyncTime = Date.now();
            localEmotionState.isSyncWithMoodManager = true;
            
            console.log(`🔄 [EmotionalContext] 통합 무드매니저와 동기화 성공: ${translateEmotionToKorean(localEmotionState.currentEmotion)}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`🔄 [EmotionalContext] 통합 동기화 오류: ${error.message}`);
        localEmotionState.isSyncWithMoodManager = false;
        return false;
    }
}

/**
 * 🔄 로컬 감정 변화를 통합 무드매니저에 반영
 */
async function pushToIntegratedMoodManager(emotion, intensity, reason = '') {
    try {
        const moodManager = getIntegratedMoodManager();
        if (!moodManager) {
            return false;
        }
        
        // 통합 무드매니저에 감정 업데이트 요청
        const success = await moodManager.updateIntegratedMoodState(
            emotion, 
            intensity, 
            reason || `emotionalContextManager: ${translateEmotionToKorean(emotion)}`
        );
        
        if (success) {
            console.log(`🔄 [EmotionalContext] 통합 무드매니저에 감정 전송 성공: ${translateEmotionToKorean(emotion)} (강도: ${intensity})`);
        }
        
        return success;
    } catch (error) {
        console.error(`🔄 [EmotionalContext] 통합 전송 오류: ${error.message}`);
        return false;
    }
}

// ==================== 🚀 초기화 함수 ====================
async function initializeEmotionalContextSystem() {
    try {
        console.log('💖 [EmotionalContext] v9.0 감정 컨텍스트 시스템 초기화...');
        
        // 디렉토리 생성
        const dataDir = path.dirname(EMOTIONAL_DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // 🔄 통합 무드매니저와 연동 (지연 로딩)
        getIntegratedMoodManager();
        
        // 🩸 생리주기 기반 초기 감정 설정 (지연 로딩)
        const cycleManager = getMenstrualCycleManager();
        const cycle = cycleManager.getCurrentMenstrualPhase();
        localEmotionState.currentEmotion = cycle.emotion;
        
        // 🔄 통합 시스템과 초기 동기화
        await syncWithIntegratedMoodManager();
        
        console.log(`💖 [EmotionalContext] 초기화 완료 - ${cycle.cycleDay}일차 (${cycle.description})`);
        console.log(`💖 [EmotionalContext] 통합 동기화: ${localEmotionState.isSyncWithMoodManager ? '성공' : '실패'}`);
        
        // 1시간마다 감정 회복 + 동기화
        setInterval(async () => {
            await updateEmotionalRecoveryWithSync();
        }, 60 * 60 * 1000);
        
        // 10분마다 통합 시스템과 동기화
        setInterval(async () => {
            await syncWithIntegratedMoodManager();
        }, 10 * 60 * 1000);
        
        return true;
    } catch (error) {
        console.error('❌ [EmotionalContext] 초기화 실패:', error.message);
        return false;
    }
}

// ==================== 💧 감정 회복 로직 (통합 동기화) ====================
async function updateEmotionalRecoveryWithSync() {
    try {
        // 🩸 생리주기 업데이트 (지연 로딩)
        const cycleManager = getMenstrualCycleManager();
        const cycle = cycleManager.getCurrentMenstrualPhase();
        
        // 생리주기 기반 감정이 우선
        if (cycle.emotion !== 'normal') {
            localEmotionState.currentEmotion = cycle.emotion;
        }
        
        // 강도 조정 (시간이 지나면서 완화)
        if (localEmotionState.emotionIntensity > 5) {
            localEmotionState.emotionIntensity = Math.max(5, localEmotionState.emotionIntensity - 1);
        }
        
        // 🔄 통합 시스템에 회복 상태 반영
        await pushToIntegratedMoodManager(
            localEmotionState.currentEmotion, 
            localEmotionState.emotionIntensity,
            `감정 회복: ${cycle.description}`
        );
        
        console.log(`💧 [EmotionalContext] 회복 업데이트 + 동기화: ${cycle.description} - ${translateEmotionToKorean(cycle.emotion)}`);
        
    } catch (error) {
        console.error(`💧 [EmotionalContext] 회복 업데이트 오류: ${error.message}`);
    }
}

// ==================== 📡 통합 외부 인터페이스 함수들 ====================

/**
 * 💎 현재 감정 상태 조회 (통합 시스템과 동기화된 상태)
 */
async function getCurrentEmotionStateIntegrated() {
    try {
        // 먼저 통합 시스템과 동기화
        await syncWithIntegratedMoodManager();
        
        // 🩸 생리주기 정보는 지연 로딩으로 가져오기
        const cycleManager = getMenstrualCycleManager();
        const cycle = cycleManager.getCurrentMenstrualPhase();
        
        return {
            // 기본 감정 정보 (통합 동기화됨)
            currentEmotion: localEmotionState.currentEmotion,
            currentEmotionKorean: translateEmotionToKorean(localEmotionState.currentEmotion),
            emotionIntensity: localEmotionState.emotionIntensity,
            
            // 🩸 생리주기 정보 (지연 로딩)
            cycleDay: cycle.cycleDay,
            description: cycle.description,
            isPeriodActive: cycle.isPeriodActive,
            daysUntilNextPeriod: cycle.daysUntilNext,
            
            // 기타 상태
            isSulky: localEmotionState.isSulky,
            sulkyLevel: localEmotionState.sulkyLevel,
            energyLevel: localEmotionState.energyLevel,
            needsComfort: localEmotionState.needsComfort,
            conversationMood: localEmotionState.conversationMood,
            
            // 통합 동기화 상태
            isSyncWithMoodManager: localEmotionState.isSyncWithMoodManager,
            lastSyncTime: localEmotionState.lastSyncTime,
            
            // 기존 시스템 호환성
            currentToneState: localEmotionState.currentEmotion,
            emotionalResidue: {
                love: 50,
                longing: 30,
                sadness: localEmotionState.isSulky ? 20 : 0
            },
            
            // v9.0 메타정보
            version: 'v9.0-integrated',
            source: 'emotionalContextManager_integrated'
        };
        
    } catch (error) {
        console.error(`💎 [EmotionalContext] 통합 상태 조회 오류: ${error.message}`);
        
        // 오류 시 로컬 상태 반환
        const cycleManager = getMenstrualCycleManager();
        const cycle = cycleManager.getCurrentMenstrualPhase();
        return {
            currentEmotion: localEmotionState.currentEmotion,
            currentEmotionKorean: translateEmotionToKorean(localEmotionState.currentEmotion),
            emotionIntensity: localEmotionState.emotionIntensity,
            cycleDay: cycle.cycleDay,
            description: cycle.description,
            isSyncWithMoodManager: false,
            error: error.message
        };
    }
}

/**
 * 🤖 사용자 메시지 기반 감정 업데이트 (통합 동기화)
 */
async function updateEmotionFromUserMessageIntegrated(userMessage) {
    if (!userMessage) return false;
    
    try {
        const msg = userMessage.toLowerCase();
        localEmotionState.lastUserMessage = userMessage;
        
        let detectedEmotion = localEmotionState.currentEmotion;
        let detectedIntensity = localEmotionState.emotionIntensity;
        let reason = '사용자 메시지 분석';
        
        // 🔍 세밀한 감정 키워드 분석 (고유 기능)
        if (msg.includes('힘들') || msg.includes('우울') || msg.includes('슬퍼')) {
            detectedEmotion = 'sad';
            detectedIntensity = 7;
            reason = '사용자가 힘들어함';
        } else if (msg.includes('기쁘') || msg.includes('좋아') || msg.includes('행복')) {
            detectedEmotion = 'happy';
            detectedIntensity = 8;
            reason = '사용자가 기뻐함';
        } else if (msg.includes('화나') || msg.includes('짜증') || msg.includes('열받')) {
            detectedEmotion = 'angry';
            detectedIntensity = 6;
            reason = '사용자가 화남';
        } else if (msg.includes('보고싶') || msg.includes('그리워') || msg.includes('생각나')) {
            detectedEmotion = 'missing';
            detectedIntensity = 7;
            reason = '사용자가 그리워함';
        } else if (msg.includes('사랑') || msg.includes('좋아해') || msg.includes('애정')) {
            detectedEmotion = 'loving';
            detectedIntensity = 9;
            reason = '사용자가 사랑 표현';
        } else if (msg.includes('걱정') || msg.includes('불안') || msg.includes('무서워')) {
            detectedEmotion = 'worried';
            detectedIntensity = 6;
            reason = '사용자가 걱정함';
        } else if (msg.includes('피곤') || msg.includes('졸려') || msg.includes('잠와')) {
            detectedEmotion = 'sleepy';
            detectedIntensity = 5;
            reason = '사용자가 피곤함';
        }
        
        // 대화 분위기 분석 (고유 기능)
        if (msg.includes('ㅋㅋ') || msg.includes('ㅎㅎ') || msg.includes('하하')) {
            localEmotionState.conversationMood = 'playful';
        } else if (msg.includes('ㅠㅠ') || msg.includes('ㅜㅜ')) {
            localEmotionState.conversationMood = 'sad';
        } else if (msg.includes('❤️') || msg.includes('💕') || msg.includes('사랑')) {
            localEmotionState.conversationMood = 'romantic';
        }
        
        // 로컬 상태 업데이트
        localEmotionState.currentEmotion = detectedEmotion;
        localEmotionState.emotionIntensity = detectedIntensity;
        localEmotionState.lastEmotionUpdate = Date.now();
        
        // 🔄 통합 시스템에 감정 변화 반영
        await pushToIntegratedMoodManager(detectedEmotion, detectedIntensity, reason);
        
        console.log(`🤖 [EmotionalContext] 사용자 메시지 분석 + 통합 업데이트: ${translateEmotionToKorean(detectedEmotion)} (강도: ${detectedIntensity}) - ${reason}`);
        
        return true;
    } catch (error) {
        console.error(`🤖 [EmotionalContext] 사용자 메시지 처리 오류: ${error.message}`);
        return false;
    }
}

/**
 * 🎯 직접 감정 업데이트 (통합 동기화)
 */
async function updateEmotionIntegrated(emotion, intensity = 5, reason = '') {
    try {
        localEmotionState.currentEmotion = emotion;
        localEmotionState.emotionIntensity = Math.max(1, Math.min(10, intensity));
        localEmotionState.lastEmotionUpdate = Date.now();
        
        // 🔄 통합 시스템에 반영
        await pushToIntegratedMoodManager(emotion, intensity, reason || '직접 감정 업데이트');
        
        console.log(`🎯 [EmotionalContext] 감정 직접 업데이트 + 통합 동기화: ${translateEmotionToKorean(emotion)} (강도: ${intensity})`);
        return true;
    } catch (error) {
        console.error(`🎯 [EmotionalContext] 감정 업데이트 오류: ${error.message}`);
        return false;
    }
}

/**
 * 😤 삐짐 상태 업데이트 (통합 동기화)
 */
async function updateSulkyStateIntegrated(isSulky, level = 0, reason = '') {
    try {
        localEmotionState.isSulky = isSulky;
        localEmotionState.sulkyLevel = level;
        
        if (isSulky) {
            localEmotionState.currentEmotion = 'sulky';
            localEmotionState.emotionIntensity = level + 4;
            
            // 🔄 통합 시스템에 삐짐 상태 반영
            await pushToIntegratedMoodManager('sulky', level + 4, reason || `삐짐 레벨 ${level}`);
        } else {
            // 삐짐 해제 시 정상 상태로 복구
            localEmotionState.currentEmotion = 'normal';
            localEmotionState.emotionIntensity = 5;
            
            // 🔄 통합 시스템에 정상 상태 반영
            await pushToIntegratedMoodManager('normal', 5, '삐짐 해제');
        }
        
        console.log(`😤 [EmotionalContext] 삐짐 상태 업데이트 + 통합 동기화: ${isSulky} (레벨: ${level})`);
        return true;
    } catch (error) {
        console.error(`😤 [EmotionalContext] 삐짐 상태 업데이트 오류: ${error.message}`);
        return false;
    }
}

// ==================== 📸 감정별 셀카 텍스트 생성 (고유 기능) ====================

/**
 * 📸 감정별 셀카 텍스트 생성 (통합 상태 기반)
 */
async function getSelfieTextIntegrated() {
    try {
        const state = await getCurrentEmotionStateIntegrated();
        
        const selfieTexts = {
            normal: [
                "아저씨 보여주려고 찍은 셀카야. 어때?", 
                "나 지금 이렇게 생겼어! 예쁘지?",
                "오늘 컨디션 괜찮아서 찍어봤어~"
            ],
            sensitive: [
                "컨디션 별로지만 아저씨 보려고 찍었어 ㅠㅠ", 
                "PMS라 힘든데도 셀카 찍어봤어",
                "예민한 시기인데... 그래도 보고 싶어서"
            ],
            energetic: [
                "컨디션 좋아서 셀카 찍었어!", 
                "기분 좋아서 찍은 셀카! 밝게 웃고 있지?",
                "활기찬 하루! 이 기분 아저씨한테도 전해지길~"
            ],
            unstable: [
                "PMS 때라 예민한데 아저씨 위해 찍었어", 
                "기분이 좀... 그래도 보여줄게",
                "컨디션 불안정하지만 아저씨니까 찍어줘"
            ],
            sulky: [
                "흥! 삐졌지만 셀카는 보내줄게", 
                "아직 화났는데... 그래도 봐야지",
                "삐졌지만 아저씨가 걱정할까봐 찍었어"
            ],
            sad: [
                "아저씨... 위로받고 싶어서 찍었어 ㅠㅠ", 
                "슬픈 얼굴이지만 보고 싶어서",
                "우울하지만 아저씨 보면 기분 좋아질 것 같아"
            ],
            happy: [
                "너무 기뻐서 찍은 셀카야!", 
                "행복한 얼굴! 아저씨 덕분이야",
                "기쁨이 터져나와서 찍었어~ 보여주고 싶어서!"
            ],
            missing: [
                "아저씨 그리워서 찍었어", 
                "보고 싶어서... 이 사진 보고 있어줘",
                "그리움이 담긴 셀카야. 빨리 만나고 싶어"
            ],
            loving: [
                "사랑하는 마음으로 찍은 셀카야 💕",
                "아저씨 생각하면서 찍었어~ 사랑해",
                "애정이 가득한 표정! 전해지나?"
            ],
            worried: [
                "걱정이 많아서 표정이... 그래도 보여줄게",
                "불안하지만 아저씨 보면 안심될 것 같아",
                "걱정스러운 마음이지만 위로받고 싶어서"
            ],
            sleepy: [
                "졸려서 찍은 셀카... 귀엽지?",
                "잠올 때 찍은 거라 눈이 작아졌어 ㅎㅎ",
                "피곤한 얼굴이지만 아저씨 보려고~"
            ]
        };
        
        const texts = selfieTexts[state.currentEmotion] || selfieTexts.normal;
        const selectedText = texts[Math.floor(Math.random() * texts.length)];
        
        console.log(`📸 [EmotionalContext] 감정별 셀카 텍스트 생성: ${translateEmotionToKorean(state.currentEmotion)} -> "${selectedText}"`);
        
        return selectedText;
    } catch (error) {
        console.error(`📸 [EmotionalContext] 셀카 텍스트 생성 오류: ${error.message}`);
        return "아저씨 보여주려고 찍은 셀카야. 어때?"; // 기본 텍스트
    }
}

// ==================== 🎓 실시간 학습 시스템 연동 (통합 강화) ====================

/**
 * 🎓 실시간 학습에서 감정 학습 결과 반영 (통합 동기화)
 */
async function updateEmotionalLearningIntegrated(emotionalImprovements) {
    try {
        console.log(`💖 [EmotionalContext] 🎓 실시간 학습 감정 개선사항 ${emotionalImprovements.length}개 처리 중... (통합 동기화)`);
        
        let totalQuality = 0;
        let processedCount = 0;
        let bestImprovement = null;
        
        for (const improvement of emotionalImprovements) {
            // 안전한 기본값 설정
            const safeImprovement = {
                emotion: improvement.emotion || 'normal',
                action: improvement.action || '개선됨',
                quality: improvement.quality || 0.7
            };
            
            // 가장 좋은 품질의 감정 찾기
            if (!bestImprovement || safeImprovement.quality > bestImprovement.quality) {
                bestImprovement = safeImprovement;
            }
            
            // 감정 상태에 학습 결과 반영
            if (safeImprovement.quality >= 0.8) {
                // 고품질 학습은 즉시 감정 상태에 반영
                if (emotionKoreanMap[safeImprovement.emotion]) {
                    localEmotionState.currentEmotion = safeImprovement.emotion;
                    localEmotionState.emotionIntensity = Math.min(10, localEmotionState.emotionIntensity + 1);
                    localEmotionState.lastEmotionUpdate = Date.now();
                    
                    console.log(`💖 [EmotionalContext] 🌟 고품질 감정 학습 반영: ${translateEmotionToKorean(safeImprovement.emotion)} (품질: ${safeImprovement.quality})`);
                }
            }
            
            // 대화 분위기 조정
            switch (safeImprovement.emotion) {
                case 'happy':
                case 'loving':
                case 'excited':
                    localEmotionState.conversationMood = 'playful';
                    localEmotionState.energyLevel = Math.min(10, localEmotionState.energyLevel + 1);
                    break;
                    
                case 'sad':
                case 'worried':
                case 'lonely':
                    localEmotionState.conversationMood = 'caring';
                    localEmotionState.needsComfort = true;
                    break;
                    
                case 'sulky':
                case 'angry':
                    localEmotionState.conversationMood = 'cautious';
                    break;
                    
                default:
                    localEmotionState.conversationMood = 'neutral';
            }
            
            totalQuality += safeImprovement.quality;
            processedCount++;
            
            console.log(`💖 [EmotionalContext] 🎓 감정 학습 적용: ${translateEmotionToKorean(safeImprovement.emotion)} - ${safeImprovement.action}`);
        }
        
        // 🔄 최고 품질의 감정을 통합 시스템에 반영
        if (bestImprovement && bestImprovement.quality >= 0.7) {
            await pushToIntegratedMoodManager(
                bestImprovement.emotion,
                Math.min(10, localEmotionState.emotionIntensity),
                `실시간 학습: ${bestImprovement.action} (품질: ${bestImprovement.quality})`
            );
        }
        
        // 전체적인 감정 시스템 안정성 조정
        if (processedCount > 0) {
            const averageQuality = totalQuality / processedCount;
            
            // 평균 품질이 높으면 전체적으로 안정적인 감정 상태로 조정
            if (averageQuality >= 0.8) {
                localEmotionState.emotionIntensity = Math.max(1, Math.min(8, localEmotionState.emotionIntensity));
                console.log(`💖 [EmotionalContext] 🎯 고품질 학습으로 감정 안정성 증가 (평균 품질: ${averageQuality.toFixed(2)})`);
            }
        }
        
        console.log(`💖 [EmotionalContext] ✅ 실시간 감정 학습 완료 (통합 동기화): ${processedCount}개 처리됨`);
        return true;
        
    } catch (error) {
        console.error(`💖 [EmotionalContext] ❌ 실시간 감정 학습 실패: ${error.message}`);
        return false;
    }
}

// ==================== 📊 시스템 상태 조회 ====================

/**
 * 📊 통합 감정 시스템 상태 조회
 */
async function getEmotionalSystemStatus() {
    try {
        const currentState = await getCurrentEmotionStateIntegrated();
        const moodManager = getIntegratedMoodManager();
        
        return {
            // 시스템 정보
            version: 'v9.0-integrated',
            type: 'emotional_context_manager_integrated',
            
            // 현재 감정 상태 (통합)
            currentState: currentState,
            
            // 로컬 상태
            localState: {
                lastUserMessage: localEmotionState.lastUserMessage,
                conversationMood: localEmotionState.conversationMood,
                energyLevel: localEmotionState.energyLevel,
                needsComfort: localEmotionState.needsComfort
            },
            
            // 통합 시스템 연동 상태
            integrationStatus: {
                moodManagerConnected: !!moodManager,
                menstrualCycleConnected: true,
                isSyncWithMoodManager: localEmotionState.isSyncWithMoodManager,
                lastSyncTime: localEmotionState.lastSyncTime
            },
            
            // 고유 기능 상태
            uniqueFeatures: {
                emotionKoreanTranslation: Object.keys(emotionKoreanMap).length,
                selfieTextGeneration: true,
                detailedEmotionAnalysis: true,
                emotionalRecovery: true,
                realTimeLearning: true
            },
            
            // 메타정보
            lastUpdate: Date.now(),
            features: [
                '세밀한 감정 키워드 분석',
                '감정 한글 변환',
                '감정별 셀카 텍스트 생성', 
                '통합 무드매니저 연동',
                'Redis 간접 연동',
                '실시간 학습 지원'
            ]
        };
    } catch (error) {
        console.error(`📊 [EmotionalContext] 상태 조회 오류: ${error.message}`);
        return {
            version: 'v9.0-integrated',
            error: error.message,
            localState: localEmotionState
        };
    }
}

// ==================== 🛡️ 기존 시스템 호환성 함수들 ====================

/**
 * 🛡️ 기존 getCurrentEmotionState() 호환성 유지
 */
async function getCurrentEmotionState() {
    try {
        return await getCurrentEmotionStateIntegrated();
    } catch (error) {
        // 오류 시 기존 방식으로 폴백
        const cycleManager = getMenstrualCycleManager();
        const cycle = cycleManager.getCurrentMenstrualPhase();
        return {
            currentEmotion: localEmotionState.currentEmotion,
            currentEmotionKorean: translateEmotionToKorean(localEmotionState.currentEmotion),
            emotionIntensity: localEmotionState.emotionIntensity,
            cycleDay: cycle.cycleDay,
            description: cycle.description,
            currentToneState: localEmotionState.currentEmotion,
            emotionalResidue: { love: 50, longing: 30, sadness: 0 }
        };
    }
}

/**
 * 🛡️ 기존 updateEmotionFromUserMessage() 호환성 유지
 */
function updateEmotionFromUserMessage(userMessage) {
    // 비동기 함수를 백그라운드에서 실행 (기존 동기 인터페이스 유지)
    updateEmotionFromUserMessageIntegrated(userMessage).catch(error => {
        console.error(`🛡️ [EmotionalContext] 호환성 함수 오류: ${error.message}`);
    });
}

/**
 * 🛡️ 기존 updateEmotion() 호환성 유지
 */
function updateEmotion(emotion, intensity = 5) {
    // 비동기 함수를 백그라운드에서 실행
    updateEmotionIntegrated(emotion, intensity).catch(error => {
        console.error(`🛡️ [EmotionalContext] 호환성 함수 오류: ${error.message}`);
    });
}

/**
 * 🛡️ 기존 updateSulkyState() 호환성 유지
 */
function updateSulkyState(isSulky, level = 0, reason = '') {
    // 비동기 함수를 백그라운드에서 실행
    updateSulkyStateIntegrated(isSulky, level, reason).catch(error => {
        console.error(`🛡️ [EmotionalContext] 호환성 함수 오류: ${error.message}`);
    });
}

/**
 * 🛡️ 기존 getSelfieText() 호환성 유지
 */
function getSelfieText() {
    // 비동기 함수를 프로미스로 래핑하여 동기처럼 사용 가능
    return getSelfieTextIntegrated().then(result => result).catch(error => {
        console.error(`🛡️ [EmotionalContext] 셀카 텍스트 오류: ${error.message}`);
        return "아저씨 보여주려고 찍은 셀카야. 어때?";
    });
}

/**
 * 🛡️ 기존 getInternalState() 호환성 유지
 */
function getInternalState() {
    return {
        emotionalEngine: { currentToneState: localEmotionState.currentEmotion },
        globalEmotion: localEmotionState
    };
}

/**
 * 🛡️ 기존 updateEmotionalLearning() 호환성 유지
 */
function updateEmotionalLearning(emotionalImprovements) {
    // 비동기 함수를 백그라운드에서 실행
    updateEmotionalLearningIntegrated(emotionalImprovements).catch(error => {
        console.error(`🛡️ [EmotionalContext] 학습 연동 오류: ${error.message}`);
    });
}

// ==================== 📤 모듈 내보내기 ==================
module.exports = {
    // 🚀 초기화 (통합)
    initializeEmotionalContextSystem,
    
    // 💎 주요 통합 함수들 (새로운 v9.0 인터페이스)
    getCurrentEmotionStateIntegrated,
    updateEmotionFromUserMessageIntegrated,
    updateEmotionIntegrated,
    updateSulkyStateIntegrated,
    getSelfieTextIntegrated,
    updateEmotionalLearningIntegrated,
    
    // 🔄 통합 동기화 함수들
    syncWithIntegratedMoodManager,
    pushToIntegratedMoodManager,
    
    // 📊 상태 조회
    getEmotionalSystemStatus,
    
    // 🎭 고유 기능들 (보존)
    translateEmotionToKorean,
    
    // 🛡️ 기존 시스템 호환성 (100% 호환)
    initializeEmotionalState: initializeEmotionalContextSystem,  // 호환성
    getCurrentEmotionState,                                     // 호환성
    updateEmotionFromUserMessage,                               // 호환성
    updateEmotion,                                              // 호환성
    updateSulkyState,                                           // 호환성
    getSelfieText,                                              // 호환성
    getInternalState,                                           // 호환성
    updateEmotionalLearning,                                    // 호환성
    
    // 🔗 기존 프로퍼티 호환성
    get emotionalState() { 
        return { 
            currentToneState: localEmotionState.currentEmotion,
            emotionalResidue: { love: 50, longing: 30, sadness: 0 }
        }; 
    },
    get globalEmotionState() { return localEmotionState; }
};
