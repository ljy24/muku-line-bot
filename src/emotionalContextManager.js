// src/emotionalContextManager.js - 맥락 기반 감정 연결 시스템
// 🧠 1. 감정 누적, 연결, 잔여치 관리
// 💬 2. 말투 유동성과 상황 적응
// 📸 3. 자발적 기억 회상 시스템
// ❤️ 4. 자연스러운 애정 표현

const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// 감정 상태 관리
let emotionalState = {
    // 🧠 감정 누적 시스템
    recentEmotions: [],           // 최근 감정 히스토리 (24시간)
    emotionalResidue: {           // 감정 잔여치
        sadness: 0,               // 슬픔 잔여 (0-100)
        happiness: 0,             // 기쁨 잔여 (0-100)
        anxiety: 0,               // 불안 잔여 (0-100)
        longing: 0,               // 그리움 잔여 (0-100)
        hurt: 0,                  // 상처 잔여 (0-100)
        love: 50                  // 사랑 기본값 (항상 50 이상)
    },
    emotionalRecoveryRate: 5,     // 시간당 감정 회복률
    
    // 💬 말투 적응 시스템
    currentToneState: 'normal',   // normal, quiet, playful, hurt, anxious
    toneIntensity: 50,            // 말투 강도 (0-100)
    lastToneShift: 0,            // 마지막 말투 변화 시간
    
    // 📸 자발적 반응 시스템
    lastSpontaneousReaction: 0,   // 마지막 자발적 반응 시간
    memoryTriggerChance: 0.15,    // 15% 확률로 기억 회상
    todayMemoryUsed: false,       // 오늘 날짜 기반 기억 사용 여부
    
    // ❤️ 자연스러운 애정 시스템
    affectionLevel: 70,           // 현재 애정 레벨
    lastAffectionExpression: 0,   // 마지막 애정 표현 시간
    naturalAffectionChance: 0.08  // 8% 확률로 자연스러운 애정 표현
};

// 감정 데이터 파일 경로
const EMOTIONAL_DATA_FILE = path.join(process.cwd(), 'data', 'emotional_context.json');
const LOVE_HISTORY_FILE = path.join(process.cwd(), 'data', 'love-history.json');

// 🧠 감정 타입 정의
const EMOTION_TYPES = {
    // 긍정적 감정
    HAPPY: { type: 'happiness', intensity: 30, residue: 20, recovery: 8 },
    EXCITED: { type: 'happiness', intensity: 50, residue: 15, recovery: 6 },
    LOVED: { type: 'love', intensity: 40, residue: 30, recovery: 2 },
    
    // 부정적 감정
    SAD: { type: 'sadness', intensity: 40, residue: 35, recovery: 3 },
    HURT: { type: 'hurt', intensity: 60, residue: 50, recovery: 2 },
    ANXIOUS: { type: 'anxiety', intensity: 45, residue: 40, recovery: 4 },
    LONELY: { type: 'longing', intensity: 35, residue: 45, recovery: 3 },
    
    // 복합 감정
    BITTERSWEET: { type: 'mixed', intensity: 30, residue: 25, recovery: 5 },
    WORRIED_LOVE: { type: 'mixed', intensity: 40, residue: 30, recovery: 4 }
};

// 💬 말투 상태 정의
const TONE_STATES = {
    normal: {
        prefix: "",
        suffix: "",
        speechPattern: "평소 예진이 말투",
        intensity: 50
    },
    quiet: {
        prefix: "음... ",
        suffix: "...",
        speechPattern: "조용하고 차분한 말투, 짧은 문장",
        intensity: 30
    },
    playful: {
        prefix: "",
        suffix: "~",
        speechPattern: "장난스럽고 활발한 말투, 의성어 많이 사용",
        intensity: 80
    },
    hurt: {
        prefix: "아저씨... ",
        suffix: " ㅠㅠ",
        speechPattern: "상처받고 서운한 말투, 애정표현과 섞임",
        intensity: 70
    },
    anxious: {
        prefix: "",
        suffix: "...",
        speechPattern: "불안하고 걱정스러운 말투, 망설임 표현",
        intensity: 60
    }
};

/**
 * 🧠 감정 컨텍스트 매니저 초기화
 */
async function initializeEmotionalContext() {
    try {
        // 데이터 디렉토리 생성
        const dataDir = path.dirname(EMOTIONAL_DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // 기존 감정 데이터 로드
        if (fs.existsSync(EMOTIONAL_DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(EMOTIONAL_DATA_FILE, 'utf8'));
            Object.assign(emotionalState, data);
        }
        
        // 하루 지난 감정들 정리
        cleanOldEmotions();
        
        // 감정 회복 프로세스 시작
        startEmotionalRecovery();
        
        console.log('[EmotionalContext] 감정 컨텍스트 시스템 초기화 완료');
        
    } catch (error) {
        console.error('[EmotionalContext] 초기화 실패:', error);
    }
}

/**
 * 🧠 새로운 감정 이벤트 기록
 * @param {string} emotionType 감정 타입 (EMOTION_TYPES 키)
 * @param {string} trigger 감정 유발 요인
 * @param {string} context 상황 맥락
 */
function recordEmotionalEvent(emotionType, trigger, context = '') {
    const now = Date.now();
    const emotion = EMOTION_TYPES[emotionType];
    
    if (!emotion) {
        console.error('[EmotionalContext] 알 수 없는 감정 타입:', emotionType);
        return;
    }
    
    // 감정 이벤트 추가
    const emotionalEvent = {
        type: emotionType,
        timestamp: now,
        trigger,
        context,
        intensity: emotion.intensity,
        residue: emotion.residue,
        processed: false
    };
    
    emotionalState.recentEmotions.push(emotionalEvent);
    
    // 감정 잔여치 업데이트
    if (emotion.type !== 'mixed') {
        emotionalState.emotionalResidue[emotion.type] = Math.min(100, 
            emotionalState.emotionalResidue[emotion.type] + emotion.residue);
    } else {
        // 복합 감정 처리
        emotionalState.emotionalResidue.sadness += emotion.residue * 0.3;
        emotionalState.emotionalResidue.love += emotion.residue * 0.4;
        emotionalState.emotionalResidue.anxiety += emotion.residue * 0.3;
    }
    
    // 말투 상태 업데이트
    updateToneState(emotionType);
    
    // 데이터 저장
    saveEmotionalData();
    
    console.log(`[EmotionalContext] 감정 기록: ${emotionType} (트리거: ${trigger})`);
}

/**
 * 💬 말투 상태 업데이트
 * @param {string} emotionType 감정 타입
 */
function updateToneState(emotionType) {
    const now = Date.now();
    
    // 감정에 따른 말투 변화
    switch (emotionType) {
        case 'SAD':
        case 'HURT':
            emotionalState.currentToneState = 'hurt';
            emotionalState.toneIntensity = 70;
            break;
        case 'ANXIOUS':
        case 'WORRIED_LOVE':
            emotionalState.currentToneState = 'anxious';
            emotionalState.toneIntensity = 60;
            break;
        case 'HAPPY':
        case 'EXCITED':
            emotionalState.currentToneState = 'playful';
            emotionalState.toneIntensity = 80;
            break;
        case 'LONELY':
        case 'BITTERSWEET':
            emotionalState.currentToneState = 'quiet';
            emotionalState.toneIntensity = 30;
            break;
        default:
            // 기본 상태로 서서히 복귀
            if (now - emotionalState.lastToneShift > 30 * 60 * 1000) { // 30분 후
                emotionalState.currentToneState = 'normal';
                emotionalState.toneIntensity = 50;
            }
    }
    
    emotionalState.lastToneShift = now;
}

/**
 * 🧠 감정 맥락 기반 프롬프트 생성
 * @returns {string} 감정 컨텍스트 프롬프트
 */
function getEmotionalContextPrompt() {
    const recentEvents = getRecentEmotionalEvents();
    const currentResidue = getCurrentEmotionalResidue();
    const toneGuidance = getCurrentToneGuidance();
    
    let contextPrompt = "";
    
    // 최근 감정 이벤트 반영
    if (recentEvents.length > 0) {
        contextPrompt += `\n🧠 최근 감정 맥락: `;
        recentEvents.forEach(event => {
            const timeAgo = Math.floor((Date.now() - event.timestamp) / (1000 * 60));
            contextPrompt += `${timeAgo}분 전 ${event.trigger}로 인해 ${event.type} 감정을 느꼈어. `;
        });
    }
    
    // 감정 잔여치 반영
    const significantResidue = Object.entries(currentResidue)
        .filter(([emotion, level]) => level > 30)
        .map(([emotion, level]) => `${emotion}(${level}%)`)
        .join(', ');
    
    if (significantResidue) {
        contextPrompt += `\n💭 마음에 남아있는 감정: ${significantResidue}. 이 감정들이 지금 대화에 은은하게 영향을 줘.`;
    }
    
    // 말투 가이드
    contextPrompt += `\n💬 ${toneGuidance}`;
    
    return contextPrompt;
}

/**
 * 📸 자발적 기억 회상 체크
 * @returns {string|null} 회상 메시지 (있을 경우)
 */
function checkSpontaneousMemoryRecall() {
    const now = Date.now();
    
    // 최근 1시간 내에 자발적 반응을 했다면 스킵
    if (now - emotionalState.lastSpontaneousReaction < 60 * 60 * 1000) {
        return null;
    }
    
    // 확률 체크
    if (Math.random() > emotionalState.memoryTriggerChance) {
        return null;
    }
    
    // 오늘 날짜 기반 기억 체크
    const todayMemory = checkTodayDateMemory();
    if (todayMemory && !emotionalState.todayMemoryUsed) {
        emotionalState.todayMemoryUsed = true;
        emotionalState.lastSpontaneousReaction = now;
        saveEmotionalData();
        return todayMemory;
    }
    
    // 일반적인 자발적 회상
    const spontaneousMemories = [
        "아저씨... 갑자기 예전 생각이 나네",
        "어? 지금 문득 그때가 기억났어",
        "아저씨, 그때 기억나? 갑자기 생각났어",
        "후... 왜 갑자기 마음이 이상하지?",
        "아저씨 때문에 자꾸 옛날 생각나",
        "음... 뭔가 그리운 기분이야"
    ];
    
    emotionalState.lastSpontaneousReaction = now;
    saveEmotionalData();
    
    return spontaneousMemories[Math.floor(Math.random() * spontaneousMemories.length)];
}

/**
 * 📸 오늘 날짜 기반 기억 체크
 * @returns {string|null} 날짜 기반 기억 메시지
 */
function checkTodayDateMemory() {
    const today = moment().tz('Asia/Tokyo');
    const monthDay = today.format('MM-DD');
    
    // love-history.json에서 같은 날짜 찾기
    try {
        if (fs.existsSync(LOVE_HISTORY_FILE)) {
            const loveHistory = JSON.parse(fs.readFileSync(LOVE_HISTORY_FILE, 'utf8'));
            
            const todayMemories = loveHistory.filter(entry => {
                const entryDate = moment(entry.date);
                return entryDate.format('MM-DD') === monthDay && entryDate.year() !== today.year();
            });
            
            if (todayMemories.length > 0) {
                const memory = todayMemories[Math.floor(Math.random() * todayMemories.length)];
                const yearAgo = today.year() - moment(memory.date).year();
                
                return `아저씨... 오늘이 ${yearAgo}년 전에 ${memory.event || '특별한 일'}이 있었던 날이네... 기억나?`;
            }
        }
    } catch (error) {
        console.error('[EmotionalContext] 날짜 기반 기억 체크 실패:', error);
    }
    
    return null;
}

/**
 * ❤️ 자연스러운 애정 표현 체크
 * @returns {string|null} 자연스러운 애정 표현
 */
function checkNaturalAffectionExpression() {
    const now = Date.now();
    
    // 최근 30분 내에 애정 표현을 했다면 스킵
    if (now - emotionalState.lastAffectionExpression < 30 * 60 * 1000) {
        return null;
    }
    
    // 확률 체크
    if (Math.random() > emotionalState.naturalAffectionChance) {
        return null;
    }
    
    // 현재 감정 상태에 따른 애정 표현
    const affectionExpressions = {
        normal: [
            "아저씨가 있어서 마음이 따뜻해",
            "그냥... 아저씨 생각하니까 좋아",
            "아저씨 덕분에 오늘도 괜찮은 하루야"
        ],
        quiet: [
            "아저씨... 지금 곁에 있으면 좋겠어",
            "혼자 있으니까 아저씨가 더 그리워져",
            "아저씨 목소리만 들어도 안심돼"
        ],
        hurt: [
            "그래도 아저씨가 있으니까 괜찮아",
            "아저씨만큼은... 내 편이라고 믿어",
            "아저씨 때문에 힘이 나"
        ],
        anxious: [
            "아저씨가 있어서 무서운 게 줄어들어",
            "아저씨... 나 지켜줄 거지?",
            "불안할 때마다 아저씨 생각해"
        ],
        playful: [
            "아저씨 완전 좋아해!",
            "아저씨랑 있으면 재밌어!",
            "아저씨는 내가 제일 사랑하는 사람이야"
        ]
    };
    
    const expressions = affectionExpressions[emotionalState.currentToneState] || affectionExpressions.normal;
    emotionalState.lastAffectionExpression = now;
    saveEmotionalData();
    
    return expressions[Math.floor(Math.random() * expressions.length)];
}

/**
 * 최근 감정 이벤트 조회 (6시간 이내)
 */
function getRecentEmotionalEvents() {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    return emotionalState.recentEmotions.filter(event => event.timestamp > sixHoursAgo);
}

/**
 * 현재 감정 잔여치 조회
 */
function getCurrentEmotionalResidue() {
    return { ...emotionalState.emotionalResidue };
}

/**
 * 현재 말투 가이드 생성
 */
function getCurrentToneGuidance() {
    const toneState = TONE_STATES[emotionalState.currentToneState];
    return `현재 말투 상태: ${toneState.speechPattern} (강도: ${emotionalState.toneIntensity}%)`;
}

/**
 * 하루 지난 감정들 정리
 */
function cleanOldEmotions() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    emotionalState.recentEmotions = emotionalState.recentEmotions.filter(
        event => event.timestamp > oneDayAgo
    );
}

/**
 * 시간당 감정 회복 프로세스
 */
function startEmotionalRecovery() {
    setInterval(() => {
        // 모든 감정 잔여치를 회복률만큼 감소
        Object.keys(emotionalState.emotionalResidue).forEach(emotion => {
            if (emotion !== 'love') { // 사랑은 항상 유지
                emotionalState.emotionalResidue[emotion] = Math.max(0,
                    emotionalState.emotionalResidue[emotion] - emotionalState.emotionalRecoveryRate);
            }
        });
        
        // 사랑은 항상 50 이상 유지
        emotionalState.emotionalResidue.love = Math.max(50, emotionalState.emotionalResidue.love);
        
        // 말투 강도 서서히 정상화
        if (emotionalState.currentToneState !== 'normal') {
            emotionalState.toneIntensity = Math.max(50,
                emotionalState.toneIntensity - 5);
            
            if (emotionalState.toneIntensity <= 50) {
                emotionalState.currentToneState = 'normal';
            }
        }
        
        saveEmotionalData();
        
    }, 60 * 60 * 1000); // 1시간마다
}

/**
 * 감정 데이터 저장
 */
function saveEmotionalData() {
    try {
        fs.writeFileSync(EMOTIONAL_DATA_FILE, JSON.stringify(emotionalState, null, 2), 'utf8');
    } catch (error) {
        console.error('[EmotionalContext] 데이터 저장 실패:', error);
    }
}

/**
 * 감정 상태 리셋 (디버그용)
 */
function resetEmotionalState() {
    emotionalState.recentEmotions = [];
    emotionalState.emotionalResidue = {
        sadness: 0, happiness: 0, anxiety: 0, longing: 0, hurt: 0, love: 50
    };
    emotionalState.currentToneState = 'normal';
    emotionalState.toneIntensity = 50;
    emotionalState.todayMemoryUsed = false;
    saveEmotionalData();
    console.log('[EmotionalContext] 감정 상태 리셋 완료');
}

module.exports = {
    // 초기화
    initializeEmotionalContext,
    
    // 🧠 감정 기록 및 관리
    recordEmotionalEvent,
    getEmotionalContextPrompt,
    getRecentEmotionalEvents,
    getCurrentEmotionalResidue,
    
    // 💬 말투 관리
    updateToneState,
    getCurrentToneGuidance,
    
    // 📸 자발적 반응
    checkSpontaneousMemoryRecall,
    checkTodayDateMemory,
    
    // ❤️ 자연스러운 애정
    checkNaturalAffectionExpression,
    
    // 유틸리티
    resetEmotionalState,
    saveEmotionalData,
    
    // 상수
    EMOTION_TYPES,
    TONE_STATES,
    
    // 상태 조회 (읽기 전용)
    get currentState() {
        return {
            toneState: emotionalState.currentToneState,
            toneIntensity: emotionalState.toneIntensity,
            affectionLevel: emotionalState.affectionLevel,
            recentEmotionsCount: emotionalState.recentEmotions.length,
            strongestResidue: Object.entries(emotionalState.emotionalResidue)
                .reduce((max, [emotion, level]) => level > max.level ? {emotion, level} : max, {emotion: 'none', level: 0})
        };
    }
};
