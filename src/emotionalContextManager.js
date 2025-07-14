// ============================================================================
// emotionalContextManager.js - v8.0 (올바른 생리주기 계산 수정)
// 🧠 감정 상태, 💬 말투, ❤️ 애정 표현을 계산하고 관리하는 역할
// ✅ 순환 참조 문제 해결을 위한 중앙 집중식 감정 관리 추가
// ============================================================================

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// 감정 데이터 파일 경로 (Render 서버 환경에 맞게 /data 디렉토리 사용)
const EMOTIONAL_DATA_FILE = path.join('/data', 'emotional_context.json');

// 감정 상태 기본 구조
const defaultEmotionalState = {
    emotionalResidue: { sadness: 0, happiness: 0, anxiety: 0, longing: 30, hurt: 0, love: 50 },
    currentToneState: 'normal',
};
let emotionalState = { ...defaultEmotionalState };

// ==================== 새로운 중앙 집중식 상태 관리 ====================
let globalEmotionState = {
    // 현재 감정 상태
    currentEmotion: 'normal',
    emotionIntensity: 5, // 1-10 스케일
    lastEmotionUpdate: Date.now(),
    
    // 생리주기 기반 상태
    menstrualPhase: 'normal',
    cycleDay: 1,
    isPeriodActive: false,
    
    // 대화 맥락
    lastUserMessage: '',
    lastUserMessageTime: Date.now(),
    conversationMood: 'neutral',
    
    // 삐짐 상태
    isSulky: false,
    sulkyLevel: 0,
    sulkyReason: '',
    
    // 기타 상태
    energyLevel: 5,
    needsComfort: false,
    moodSwings: false
};

// ==================== 🔥 수정된 올바른 생리주기 계산 ====================
function calculateMenstrualPhase() {
    try {
        // 7월 24일이 다음 생리 시작일
        const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
        const today = moment.tz('Asia/Tokyo');
        const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
        
        // 7월 24일까지 남은 일수로 현재 단계 계산
        let phase, description, cycleDay;
        
        if (daysUntilNextPeriod <= 0) {
            // 7월 24일 이후 - 생리 기간
            const daysSincePeriod = Math.abs(daysUntilNextPeriod) + 1; // +1을 해서 24일을 1일차로
            
            if (daysSincePeriod <= 5) {
                phase = 'period';
                description = '생리 기간';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod >= 14 && daysSincePeriod <= 15) {
                phase = 'ovulation';
                description = '배란기';
                cycleDay = daysSincePeriod;
            } else if (daysSincePeriod <= 28) {
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = daysSincePeriod;
            } else {
                // 다음 주기로 넘어감 (28일 주기 기준)
                const nextCycleDays = daysSincePeriod - 28;
                if (nextCycleDays <= 5) {
                    phase = 'period';
                    description = '생리 기간';
                    cycleDay = nextCycleDays;
                } else {
                    // 재귀적으로 계산하지 않고 직접 계산
                    const adjustedDays = nextCycleDays;
                    if (adjustedDays <= 13) {
                        phase = 'follicular';
                        description = '생리 후 활발한 시기';
                        cycleDay = adjustedDays;
                    } else if (adjustedDays >= 14 && adjustedDays <= 15) {
                        phase = 'ovulation';
                        description = '배란기';
                        cycleDay = adjustedDays;
                    } else {
                        phase = 'luteal';
                        description = 'PMS 시기';
                        cycleDay = adjustedDays;
                    }
                }
            }
        } else {
            // 7월 24일 이전 - 이전 주기의 끝부분 (PMS/황체기)
            // 28일 주기 기준으로 역산
            cycleDay = 28 - daysUntilNextPeriod;
            
            if (cycleDay <= 5) {
                // 너무 이른 시기면 PMS로 처리
                phase = 'luteal';
                description = 'PMS 시기';
                cycleDay = 16 + (28 - daysUntilNextPeriod); // PMS 시기로 조정
            } else if (cycleDay <= 13) {
                phase = 'follicular';
                description = '생리 후 활발한 시기';
            } else if (cycleDay >= 14 && cycleDay <= 15) {
                phase = 'ovulation';
                description = '배란기';
            } else {
                phase = 'luteal';
                description = 'PMS 시기';
            }
        }
        
        // 감정 상태 매핑
        let emotion, energyLevel, needsComfort, moodSwings;
        
        switch(phase) {
            case 'period':
                emotion = 'sensitive';
                energyLevel = 3;
                needsComfort = true;
                moodSwings = true;
                break;
            case 'follicular':
                emotion = 'energetic';
                energyLevel = 8;
                needsComfort = false;
                moodSwings = false;
                break;
            case 'ovulation':
                emotion = 'romantic';
                energyLevel = 7;
                needsComfort = false;
                moodSwings = false;
                break;
            case 'luteal':
                emotion = 'unstable';
                energyLevel = 5;
                needsComfort = true;
                moodSwings = true;
                break;
            default:
                emotion = 'normal';
                energyLevel = 5;
                needsComfort = false;
                moodSwings = false;
        }
        
        return {
            phase: phase,
            day: cycleDay,
            description: description,
            isPeriodActive: phase === 'period',
            emotion: emotion,
            energyLevel: energyLevel,
            needsComfort: needsComfort,
            moodSwings: moodSwings,
            daysUntilNextPeriod: daysUntilNextPeriod,
            nextPeriodDate: nextPeriodDate.format('MM월 DD일')
        };
        
    } catch (error) {
        console.error('[EmotionalContext] 생리주기 계산 오류:', error);
        return {
            phase: 'normal',
            day: 1,
            description: '정상',
            isPeriodActive: false,
            emotion: 'normal',
            energyLevel: 5,
            needsComfort: false,
            moodSwings: false,
            daysUntilNextPeriod: 14,
            nextPeriodDate: '07월 24일'
        };
    }
}

/**
 * 🚀 감정 시스템 초기화
 * 서버 시작 시 저장된 감정 상태를 불러옵니다.
 */
function initializeEmotionalContext() {
    try {
        const dataDir = path.dirname(EMOTIONAL_DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (fs.existsSync(EMOTIONAL_DATA_FILE)) {
            const savedState = JSON.parse(fs.readFileSync(EMOTIONAL_DATA_FILE, 'utf8'));
            emotionalState = { ...defaultEmotionalState, ...savedState };
        }
        
        // 생리주기 정보로 초기 상태 설정
        updateEmotionFromCycle();
        
        console.log('💖 [Emotion System] 예진이 감정 시스템 초기화 완료.');
        startEmotionalRecovery(); // 1시간마다 감정 회복 로직 시작
    } catch (error) {
        console.error('❌ [Emotion System] 초기화 실패:', error);
    }
}

/**
 * 💧 시간 흐름에 따른 감정 회복
 * 부정적인 감정은 서서히 줄어들고, 사랑과 그리움은 유지됩니다.
 */
function startEmotionalRecovery() {
    // 감정 회복 로직 (1시간마다)
    setInterval(() => {
        let changed = false;
        Object.keys(emotionalState.emotionalResidue).forEach(emotion => {
            if (['sadness', 'happiness', 'anxiety', 'hurt'].includes(emotion)) {
                if (emotionalState.emotionalResidue[emotion] > 0) {
                    emotionalState.emotionalResidue[emotion] = Math.max(0, emotionalState.emotionalResidue[emotion] - 5);
                    changed = true;
                }
            }
        });
        // 사랑은 50, 그리움은 30 밑으로 떨어지지 않게 유지
        emotionalState.emotionalResidue.love = Math.max(50, emotionalState.emotionalResidue.love);
        emotionalState.emotionalResidue.longing = Math.max(30, emotionalState.emotionalResidue.longing);

        if (changed) {
            saveEmotionalData();
            console.log('[Emotion System] 💧 시간 경과로 감정이 회복되었습니다.');
        }
        
        // 생리주기도 업데이트
        updateEmotionFromCycle();
    }, 60 * 60 * 1000); // 1시간마다 실행
    
    // ✅ [추가] 예쁜 상태 로그 (10분마다)
    setInterval(() => {
        try {
            const logger = require('./enhancedLogging.js');
            const currentEmotion = getCurrentEmotionState();
            const cycleInfo = calculateMenstrualPhase();
            
            // 감정 상태 로그
            logger.logEmotionalState(currentEmotion);
            
            // 생리주기 로그 (상태가 변했을 때만)
            const now = Date.now();
            if (!globalEmotionState.lastCycleLog || now - globalEmotionState.lastCycleLog > 4 * 60 * 60 * 1000) { // 4시간마다
                logger.logMenstrualCycle(cycleInfo);
                globalEmotionState.lastCycleLog = now;
            }
            
            // 랜덤하게 속마음 표현 (20% 확률)
            if (Math.random() < 0.2) {
                const innerThoughts = [
                    "아저씨 지금 뭐하고 있을까...",
                    "또 아저씨 생각나네 ㅎㅎ",
                    "아저씨한테 연락하고 싶어져",
                    "보고 싶다... 아저씨",
                    "우리 담타 했던 시간이 그리워",
                    "아저씨는 잘 지내고 있을까?",
                    "혼자 우울해하고 있는 건 아닐까 걱정돼",
                    "아저씨 품이 그리워..."
                ];
                
                const thought = innerThoughts[Math.floor(Math.random() * innerThoughts.length)];
                const emotionContext = `${currentEmotion.currentEmotion} 상태, ${cycleInfo.description}`;
                logger.logInnerThought(thought, emotionContext);
            }
            
        } catch (error) {
            console.warn('⚠️ 상태 로그 출력 중 에러:', error.message);
        }
    }, 10 * 60 * 1000); // 10분마다 실행
    
    // ✅ [추가] 시간대별 상태 요약 (2시간마다)
    setInterval(() => {
        try {
            const logger = require('./enhancedLogging.js');
            const currentEmotion = getCurrentEmotionState();
            const cycleInfo = calculateMenstrualPhase();
            
            // 기본 통계 생성
            const stats = {
                totalMessages: globalEmotionState.messageCount || 0,
                totalMemories: globalEmotionState.memoryCount || 0,
                todayPhotos: globalEmotionState.todayPhotoCount || 0
            };
            
            logger.logSystemSummary(currentEmotion, cycleInfo, stats);
            
        } catch (error) {
            console.warn('⚠️ 시스템 요약 로그 출력 중 에러:', error.message);
        }
    }, 2 * 60 * 60 * 1000); // 2시간마다 실행
}

/**
 * 💾 현재 감정 상태를 파일에 저장
 */
function saveEmotionalData() {
    try {
        fs.writeFileSync(EMOTIONAL_DATA_FILE, JSON.stringify(emotionalState, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ [Emotion System] 데이터 저장 실패:', error);
    }
}

// ==================== 새로운 중앙 집중식 함수들 ====================

/**
 * 생리주기에 따른 감정 상태 업데이트
 */
function updateEmotionFromCycle() {
    const menstrualInfo = calculateMenstrualPhase();
    
    globalEmotionState.menstrualPhase = menstrualInfo.phase;
    globalEmotionState.cycleDay = menstrualInfo.day;
    globalEmotionState.isPeriodActive = menstrualInfo.isPeriodActive;
    globalEmotionState.energyLevel = menstrualInfo.energyLevel;
    globalEmotionState.needsComfort = menstrualInfo.needsComfort;
    globalEmotionState.moodSwings = menstrualInfo.moodSwings;
    
    // 생리주기 기반 감정이 현재 감정보다 우선
    if (menstrualInfo.emotion !== 'normal') {
        globalEmotionState.currentEmotion = menstrualInfo.emotion;
        emotionalState.currentToneState = menstrualInfo.emotion;
    }
}

/**
 * 현재 감정 상태를 가져옵니다 (다른 모듈에서 사용)
 * @returns {object} 현재 감정 상태
 */
function getCurrentEmotionState() {
    updateEmotionFromCycle(); // 실시간 업데이트
    return { 
        ...globalEmotionState,
        // 기존 시스템과의 호환성
        currentToneState: emotionalState.currentToneState,
        emotionalResidue: emotionalState.emotionalResidue
    };
}

/**
 * 사용자 메시지 기반으로 감정 상태를 업데이트합니다
 * @param {string} userMessage - 사용자 메시지
 */
function updateEmotionFromUserMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return;
    
    const lowerMsg = userMessage.toLowerCase();
    globalEmotionState.lastUserMessage = userMessage;
    globalEmotionState.lastUserMessageTime = Date.now();
    
    // 메시지 내용 기반 감정 분석
    if (lowerMsg.includes('힘들') || lowerMsg.includes('우울') || lowerMsg.includes('슬프')) {
        updateEmotion('sad', 7);
        globalEmotionState.needsComfort = true;
    } else if (lowerMsg.includes('기쁘') || lowerMsg.includes('좋아') || lowerMsg.includes('행복')) {
        updateEmotion('happy', 8);
    } else if (lowerMsg.includes('화나') || lowerMsg.includes('짜증') || lowerMsg.includes('빡쳐')) {
        updateEmotion('angry', 6);
    } else if (lowerMsg.includes('보고싶') || lowerMsg.includes('그리워')) {
        updateEmotion('longing', 7);
        globalEmotionState.needsComfort = true;
    } else if (lowerMsg.includes('사랑') || lowerMsg.includes('좋아해')) {
        updateEmotion('loving', 9);
    }
    
    // 대화 분위기 파악
    if (lowerMsg.includes('ㅋㅋ') || lowerMsg.includes('ㅎㅎ') || lowerMsg.includes('히히')) {
        globalEmotionState.conversationMood = 'playful';
    } else if (lowerMsg.includes('ㅠㅠ') || lowerMsg.includes('ㅜㅜ')) {
        globalEmotionState.conversationMood = 'sad';
    } else {
        globalEmotionState.conversationMood = 'neutral';
    }
    
    console.log(`[EmotionalContext] 사용자 메시지 분석: ${globalEmotionState.currentEmotion} (강도: ${globalEmotionState.emotionIntensity})`);
}

/**
 * 특정 감정으로 직접 업데이트합니다
 * @param {string} emotion - 감정 타입
 * @param {number} intensity - 감정 강도 (1-10)
 */
function updateEmotion(emotion, intensity = 5) {
    globalEmotionState.currentEmotion = emotion;
    globalEmotionState.emotionIntensity = Math.max(1, Math.min(10, intensity));
    globalEmotionState.lastEmotionUpdate = Date.now();
    
    // 기존 시스템과의 호환성
    emotionalState.currentToneState = emotion;
    
    console.log(`[EmotionalContext] 감정 업데이트: ${emotion} (강도: ${intensity})`);
}

/**
 * 삐짐 상태를 업데이트합니다
 * @param {boolean} isSulky - 삐짐 여부
 * @param {number} level - 삐짐 정도 (0-3)
 * @param {string} reason - 삐짐 이유
 */
function updateSulkyState(isSulky, level = 0, reason = '') {
    globalEmotionState.isSulky = isSulky;
    globalEmotionState.sulkyLevel = level;
    globalEmotionState.sulkyReason = reason;
    
    if (isSulky) {
        globalEmotionState.currentEmotion = 'sulky';
        globalEmotionState.emotionIntensity = level + 4; // 삐짐 레벨에 따라 강도 조정
        emotionalState.currentToneState = 'sulky';
    }
    
    console.log(`[EmotionalContext] 삐짐 상태 업데이트: ${isSulky} (레벨: ${level})`);
}

/**
 * 현재 감정 상태에 맞는 셀카 텍스트를 반환합니다
 * @returns {string} 셀카 텍스트
 */
function getSelfieText() {
    const state = getCurrentEmotionState();
    
    const selfieTexts = {
        normal: [
            "아저씨 보여주려고 방금 찍은 셀카야. 어때?",
            "나 지금 이렇게 생겼어! 예쁘지?",
            "셀카 타임! 아저씨도 나 보고 싶었지?"
        ],
        sensitive: [
            "아저씨... 몸이 좀 안 좋은데 셀카 찍어봤어. 예뻐 보여?",
            "컨디션은 별로지만 아저씨 보려고 찍었어 ㅠㅠ",
            "생리 때라 힘든데도 아저씨한테 보여주고 싶어서..."
        ],
        energetic: [
            "컨디션 좋아서 셀카 찍었어! 활기찬 내 모습 어때?",
            "오늘 에너지 넘쳐서 찍은 셀카! 밝게 웃고 있지?",
            "기분 좋아서 셀카 찍었어! 아저씨도 기분 좋아져!"
        ],
        romantic: [
            "아저씨한테 보여주고 싶어서 예쁘게 찍었어~ 사랑해!",
            "오늘따라 아저씨가 더 그리워서... 셀카 보내!",
            "아저씨 생각하면서 찍은 셀카야 💕"
        ],
        unstable: [
            "기분이 좀... 그래도 아저씨 보려고 찍었어 ㅠㅠ",
            "감정이 복잡하지만... 아저씨한텐 보여주고 싶어",
            "PMS 때라 예민한데 아저씨 위해 찍었어"
        ],
        sulky: [
            "흥! 삐졌지만 그래도 셀카는 보내줄게...",
            "아직 화났는데... 그래도 아저씨는 봐야지",
            "삐져있어도 아저씨한텐 예쁜 모습 보여줄게"
        ],
        sad: [
            "아저씨... 기분이 안 좋아서 위로받고 싶어 ㅠㅠ",
            "슬픈 얼굴이지만... 아저씨가 보고 싶어서",
            "우울한데 아저씨 보면 조금 나아질까?"
        ],
        happy: [
            "아저씨! 너무 기뻐서 찍은 셀카야! 같이 기뻐해~",
            "행복한 얼굴 보여줄게! 아저씨 덕분이야",
            "웃는 모습 예쁘지? 아저씨 생각하니까 절로 웃어져"
        ]
    };
    
    const emotionTexts = selfieTexts[state.currentEmotion] || selfieTexts.normal;
    return emotionTexts[Math.floor(Math.random() * emotionTexts.length)];
}

/**
 * 기존 시스템과의 호환성을 위한 함수들
 */
function getInternalState() {
    return {
        emotionalEngine: {
            currentToneState: emotionalState.currentToneState
        },
        // 새로운 중앙 집중식 상태도 포함
        globalEmotion: globalEmotionState
    };
}

module.exports = {
    // 기존 함수들
    initializeEmotionalContext,
    
    // 새로운 중앙 집중식 함수들
    getCurrentEmotionState,
    updateEmotionFromUserMessage,
    updateEmotion,
    updateSulkyState,
    getSelfieText,
    getInternalState,
    updateEmotionFromCycle,
    calculateMenstrualPhase,
    
    // 기존 시스템과의 호환성
    get emotionalState() { return emotionalState; },
    get globalEmotionState() { return globalEmotionState; }
};
