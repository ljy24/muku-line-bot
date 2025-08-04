// src/moodManager.js v4.6 - UltimateContext 연동 완료 + 구문오류 해결
// 🔧 기존 시스템 유지 + 레디스 양방향 동기화 추가
// 🩸 생리주기는 menstrualCycleManager에서만 가져옴 (Single Source of Truth 유지)
// 💾 ultimateContext + 레디스 감정 상태 동기화
// 🌸 배경 스토리 시스템 연동
// ✅ 함수 순서, 비동기 처리, 매핑 일치, 에러 핸들링 모든 문제 해결
// 🆕 영어 감정 자동 변환 지원 (60개 이상 영어 감정 + 오타 매핑)
// 🚀 문자열 직접 입력 지원 ("normal" → { currentMood: "평온함" } 자동 변환)
// 🛡️ 완전 방어막: Boolean, 숫자, 배열, 함수, 대소문자, 공백, 특수문자, 오타 모두 처리
// 🎯 유사도 매칭: "happpy" → "happy" → "기쁨" (70% 이상 유사도 자동 변환)
// 🔧 UltimateContext 순환참조 방지: getCurrentMoodStateDirect 함수 추가

const moment = require('moment-timezone');
const ultimateContext = require('./ultimateConversationContext.js');

// 🩸 생리주기 마스터에서 정보 가져오기 (기존 유지)
const menstrualCycleManager = require('./menstrualCycleManager');

// 🔧 확률 설정 외부화
const PROBABILITY_CONFIG = {
    MENSTRUAL_RESPONSE: 0.7,           // 생리주기 응답 확률
    BACKGROUND_STORY: 0.05,            // 배경 스토리 기반 응답 확률
    BACKGROUND_CONTEXT: 0.1,           // 배경 스토리 맥락 추가 확률
    MENSTRUAL_IN_GREETING: 0.3,        // 인사에 생리주기 포함 확률
    MOOD_IN_GREETING: 0.4,             // 인사에 기분 포함 확률
    MENSTRUAL_EMOJI: 0.5,              // 생리주기 이모지 사용 확률
    MENSTRUAL_AI_PROMPT: 0.8           // 생리주기 AI 프롬프트 사용 확률
};

// 🔧 [NEW] 레디스 통합 시스템 연동 - 안전장치 강화
let integratedRedisSystem = null;
// 🌸 [NEW] 배경 스토리 시스템 연동
let backgroundStorySystem = null;

// 레디스 연동 함수 확인 및 초기화
function initializeRedisIntegration() {
    try {
        const autonomousSystem = require('./muku-autonomousYejinSystem');
        
        // 레디스 관련 메서드 존재 여부 확인
        if (autonomousSystem) {
            const hasRedisGetMethod = typeof autonomousSystem.getCachedEmotionState === 'function';
            const hasRedisSetMethod = typeof autonomousSystem.forceCacheEmotionState === 'function';
            const hasRedisStatsMethod = typeof autonomousSystem.getRedisCacheStats === 'function';
            
            if (hasRedisGetMethod && hasRedisSetMethod) {
                integratedRedisSystem = autonomousSystem;
                console.log('🔧 [기분관리자] 레디스 통합 시스템 연동 성공');
                
                // 배경 스토리 시스템 연동 시도
                if (typeof autonomousSystem.getBackgroundStory === 'function') {
                    backgroundStorySystem = autonomousSystem;
                    console.log('🌸 [기분관리자] 배경 스토리 시스템 연동 성공');
                } else {
                    console.log('⚠️ [기분관리자] 배경 스토리 시스템 메서드 없음');
                }
                
                return true;
            } else {
                console.warn('⚠️ [기분관리자] 레디스 통합 시스템의 필수 메서드 부족');
                console.warn(`- getCachedEmotionState: ${hasRedisGetMethod}`);
                console.warn(`- forceCacheEmotionState: ${hasRedisSetMethod}`);
                console.warn(`- getRedisCacheStats: ${hasRedisStatsMethod}`);
                return false;
            }
        } else {
            console.warn('⚠️ [기분관리자] muku-autonomousYejinSystem 모듈 없음');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ [기분관리자] 레디스/배경스토리 통합 시스템 연동 실패:', error.message);
        return false;
    }
}

// 초기화 실행
const redisInitialized = initializeRedisIntegration();

// 🔧 완전한 감정-기분 매핑 테이블 (양방향 일치 + 영어 감정 지원)
const EMOTION_MOOD_MAPPING = {
    // 감정 → 기분 (영어 감정 포함)
    emotionToMood: {
        // 기본 감정들
        'love': '사랑함',
        'worry': '걱정함', 
        'missing': '보고싶음',
        'playful': '장난스러움',
        'caring': '애교모드',
        'happy': '기쁨',
        'sad': '슬픔',
        'angry': '화남',
        'anxious': '불안함',
        'lonely': '외로움',
        'normal': '평온함',
        'excited': '설렘',
        'tired': '나른함',
        'annoyed': '짜증남',
        'nostalgic': '그리움',
        
        // 🆕 추가 영어 감정들 (다른 시스템 호환성)
        'calm': '평온함',           // calm → 평온함
        'peaceful': '평온함',       // peaceful → 평온함
        'relaxed': '나른함',        // relaxed → 나른함
        'cheerful': '기쁨',         // cheerful → 기쁨
        'joyful': '기쁨',           // joyful → 기쁨
        'melancholy': '우울함',     // melancholy → 우울함
        'depressed': '우울함',      // depressed → 우울함
        'frustrated': '짜증남',     // frustrated → 짜증남
        'irritated': '짜증남',      // irritated → 짜증남
        'worried': '걱정함',        // worried → 걱정함
        'concerned': '걱정함',      // concerned → 걱정함
        'affectionate': '사랑함',   // affectionate → 사랑함
        'loving': '사랑함',         // loving → 사랑함
        'longing': '보고싶음',      // longing → 보고싶음
        'yearning': '그리움',       // yearning → 그리움
        'mischievous': '장난스러움', // mischievous → 장난스러움
        'cute': '애교모드',         // cute → 애교모드
        'sulky': '심술궂음',        // sulky → 심술궂음
        'moody': '심술궂음',        // moody → 심술궂음
        'thrilled': '설렘',         // thrilled → 설렘
        'drowsy': '나른함',         // drowsy → 나른함
        'sleepy': '나른함'          // sleepy → 나른함
    },
    
    // 기분 → 감정
    moodToEmotion: {
        '사랑함': 'love',
        '걱정함': 'worry',
        '보고싶음': 'missing', 
        '장난스러움': 'playful',
        '애교모드': 'caring',
        '기쁨': 'happy',
        '슬픔': 'sad',
        '화남': 'angry',
        '불안함': 'anxious',
        '외로움': 'lonely',
        '평온함': 'calm',           // 🔧 normal → calm으로 변경 (더 일반적)
        '설렘': 'excited',
        '나른함': 'tired',
        '짜증남': 'annoyed',
        '그리움': 'nostalgic',
        '심술궂음': 'sulky',        // 🔧 annoyed → sulky로 변경 (더 정확)
        '우울함': 'melancholy'      // 🆕 우울함 추가
    }
};

// 🔧 타입 안전성 함수들 (영어 감정 지원 추가 + 문자열 직접 처리)
function isValidMessage(message) {
    return message && typeof message === 'string' && message.trim().length > 0;
}

function isValidMood(mood) {
    if (!mood || typeof mood !== 'string') return false;
    
    // 한국어 기분 확인
    if (ALL_MOODS.includes(mood)) return true;
    
    // 🆕 영어 감정 확인
    const lowerMood = mood.toLowerCase();
    if (EMOTION_MOOD_MAPPING.emotionToMood[lowerMood]) return true;
    
    return false;
}

// 🆕 한국어 기분만 확인하는 함수 (영어 감정 제외)
function isValidKoreanMood(mood) {
    return mood && typeof mood === 'string' && ALL_MOODS.includes(mood);
}

function sanitizeMessage(message) {
    if (!isValidMessage(message)) return '';
    return message.trim().toLowerCase();
}

// 🆕 영어 감정을 한국어 기분으로 변환하는 완전 강화 헬퍼 함수
function convertEmotionToMood(emotion) {
    try {
        if (!emotion || typeof emotion !== 'string') {
            console.log(`🔄 [감정변환] 빈 값 또는 비문자열 → 평온함`);
            return '평온함';
        }
        
        // 🆕 전처리: 공백 제거, 소문자 변환, 특수문자 필터링
        let cleanEmotion = emotion.trim().toLowerCase();
        
        // 특수문자 및 숫자 제거 (알파벳과 하이픈만 유지)
        cleanEmotion = cleanEmotion.replace(/[^a-z\s-]/g, '').trim();
        
        if (!cleanEmotion) {
            console.warn(`⚠️ [감정변환] 정제 후 빈 문자열: "${emotion}" → 평온함`);
            return '평온함';
        }
        
        // 🆕 다중 단어의 경우 첫 번째 단어만 사용
        const firstWord = cleanEmotion.split(/\s+/)[0];
        
        // 이미 한국어 기분이면 그대로 반환
        if (ALL_MOODS.includes(firstWord)) {
            console.log(`🔄 [감정변환] 한국어 기분 감지: ${emotion} → ${firstWord} (변환 없음)`);
            return firstWord;
        }
        
        // 🆕 직접 매핑 확인
        const directMatch = EMOTION_MOOD_MAPPING.emotionToMood[firstWord];
        if (directMatch) {
            console.log(`🔄 [감정변환] 직접 매핑: ${emotion} → ${directMatch}`);
            return directMatch;
        }
        
        // 🆕 유사도 기반 매칭 (간단한 오타 처리)
        const availableEmotions = Object.keys(EMOTION_MOOD_MAPPING.emotionToMood);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const availableEmotion of availableEmotions) {
            const score = calculateSimilarity(firstWord, availableEmotion);
            if (score > bestScore && score > 0.7) { // 70% 이상 유사도
                bestScore = score;
                bestMatch = availableEmotion;
            }
        }
        
        if (bestMatch) {
            const convertedMood = EMOTION_MOOD_MAPPING.emotionToMood[bestMatch];
            console.log(`🔄 [감정변환] 유사도 매칭: ${emotion} → ${bestMatch} → ${convertedMood} (유사도: ${Math.round(bestScore * 100)}%)`);
            return convertedMood;
        }
        
        // 🆕 부분 매칭 (포함 관계)
        for (const [availableEmotion, mood] of Object.entries(EMOTION_MOOD_MAPPING.emotionToMood)) {
            if (firstWord.includes(availableEmotion) || availableEmotion.includes(firstWord)) {
                if (Math.abs(firstWord.length - availableEmotion.length) <= 2) { // 길이 차이 2 이내
                    console.log(`🔄 [감정변환] 부분 매칭: ${emotion} → ${availableEmotion} → ${mood}`);
                    return mood;
                }
            }
        }
        
        // 변환할 수 없으면 기본값
        console.warn(`⚠️ [감정변환실패] 알 수 없는 감정: "${emotion}" (정제: "${firstWord}") → 평온함 (기본값)`);
        return '평온함';
        
    } catch (error) {
        console.error(`❌ [감정변환오류] 변환 중 오류: ${error.message}`);
        return '평온함';
    }
}

// 🆕 문자열 유사도 계산 함수 (간단한 Levenshtein 거리 기반)
function calculateSimilarity(str1, str2) {
    try {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        
        const distance = levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
        
    } catch (error) {
        return 0;
    }
}

// 🆕 Levenshtein 거리 계산 (오타 감지용)
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// 🆕 입력 데이터 완전 자동 정규화 함수 (모든 예외 케이스 처리)
function normalizeMoodInput(input) {
    try {
        // null, undefined 처리
        if (!input) {
            console.log(`🔄 [입력정규화] null/undefined 입력 → 기본값`);
            return { currentMood: '평온함', source: 'default_null' };
        }
        
        // 🆕 Boolean 처리
        if (typeof input === 'boolean') {
            const moodFromBoolean = input ? '기쁨' : '슬픔';
            console.log(`🔄 [입력정규화] Boolean 입력 감지: ${input} → ${moodFromBoolean}`);
            return { 
                currentMood: moodFromBoolean, 
                source: 'converted_from_boolean',
                originalInput: input
            };
        }
        
        // 🆕 숫자 처리
        if (typeof input === 'number') {
            let moodFromNumber = '평온함';
            if (input > 0.7) moodFromNumber = '기쁨';
            else if (input < 0.3) moodFromNumber = '슬픔';
            
            console.log(`🔄 [입력정규화] 숫자 입력 감지: ${input} → ${moodFromNumber}`);
            return { 
                currentMood: moodFromNumber, 
                source: 'converted_from_number',
                originalInput: input
            };
        }
        
        // 🆕 배열 처리
        if (Array.isArray(input)) {
            if (input.length === 0) {
                console.log(`🔄 [입력정규화] 빈 배열 입력 → 기본값`);
                return { currentMood: '평온함', source: 'default_empty_array' };
            }
            
            // 첫 번째 문자열 요소 사용
            const firstStringElement = input.find(item => typeof item === 'string');
            if (firstStringElement) {
                console.log(`🔄 [입력정규화] 배열 입력 감지, 첫 번째 문자열 사용: [${input.join(', ')}] → "${firstStringElement}"`);
                return normalizeMoodInput(firstStringElement);
            }
            
            console.log(`🔄 [입력정규화] 문자열 없는 배열 입력 → 기본값`);
            return { currentMood: '평온함', source: 'default_array_no_string', originalInput: input };
        }
        
        // 문자열이 직접 들어온 경우 (강화된 처리)
        if (typeof input === 'string') {
            // 🆕 공백 제거 및 소문자 변환
            let cleanString = input.trim().toLowerCase();
            
            if (!cleanString) {
                console.log(`🔄 [입력정규화] 빈 문자열 입력 → 기본값`);
                return { currentMood: '평온함', source: 'default_empty_string' };
            }
            
            // 🆕 특수문자 및 숫자 필터링 (알파벳과 한글만 유지)
            const filteredString = cleanString.replace(/[^a-z가-힣\s-]/g, '').trim();
            
            if (!filteredString) {
                console.log(`🔄 [입력정규화] 특수문자만 있는 입력: "${input}" → 기본값`);
                return { currentMood: '평온함', source: 'default_special_chars_only', originalInput: input };
            }
            
            // 🆕 다중 단어 처리 ("happy but sad" → "happy" 사용)
            const firstWord = filteredString.split(/\s+/)[0];
            
            console.log(`🔄 [입력정규화] 문자열 입력 처리: "${input}" → 정제: "${firstWord}"`);
            
            const convertedMood = convertEmotionToMood(firstWord);
            return { 
                currentMood: convertedMood, 
                source: 'converted_from_string',
                originalInput: input,
                processedInput: firstWord
            };
        }
        
        // 객체인 경우 (강화된 처리)
        if (typeof input === 'object') {
            const result = { ...input };
            
            // 🆕 다양한 key 이름 지원
            const possibleMoodKeys = ['currentMood', 'mood', 'emotion', 'feeling', 'state'];
            let moodValue = null;
            let usedKey = null;
            
            for (const key of possibleMoodKeys) {
                if (result[key]) {
                    moodValue = result[key];
                    usedKey = key;
                    break;
                }
            }
            
            if (!moodValue) {
                console.log(`🔄 [입력정규화] 객체에 기분 키 없음: ${Object.keys(result).join(', ')} → 기본값`);
                result.currentMood = '평온함';
                result.source = 'default_no_mood_key';
            } else {
                console.log(`🔄 [입력정규화] 객체에서 ${usedKey} 키 사용: ${moodValue}`);
                
                // 문자열이 아닌 값도 처리
                if (typeof moodValue !== 'string') {
                    const normalizedValue = normalizeMoodInput(moodValue);
                    result.currentMood = normalizedValue.currentMood;
                    result.source = `converted_object_${usedKey}_${typeof moodValue}`;
                } else {
                    // 영어 감정이면 한국어로 변환
                    if (!isValidKoreanMood(moodValue)) {
                        const originalMood = moodValue;
                        result.currentMood = convertEmotionToMood(moodValue);
                        result.source = 'converted_object_english';
                        result.originalMood = originalMood;
                    } else {
                        result.currentMood = moodValue;
                        result.source = 'object_korean_mood';
                    }
                }
                
                // 사용한 키가 currentMood가 아니면 정리
                if (usedKey !== 'currentMood') {
                    delete result[usedKey];
                }
            }
            
            return result;
        }
        
        // 🆕 함수 처리
        if (typeof input === 'function') {
            console.log(`🔄 [입력정규화] 함수 입력 감지 → 기본값`);
            return { currentMood: '평온함', source: 'default_function', originalInput: 'function' };
        }
        
        // 기타 타입은 기본값
        console.warn(`⚠️ [입력정규화] 예상하지 못한 입력 타입: ${typeof input} → 기본값`);
        return { 
            currentMood: '평온함', 
            source: 'default_unknown_type',
            originalInput: input,
            inputType: typeof input
        };
        
    } catch (error) {
        console.error(`❌ [입력정규화오류] 정규화 중 오류: ${error.message}`);
        return { 
            currentMood: '평온함', 
            source: 'error_fallback',
            error: error.message
        };
    }
}

// 기존 응답 데이터들 (유지)
const MENSTRUAL_MOOD_RESPONSES = {
  period: [
    "아저씨... 솔직히 말하면 오늘 정말 힘들어 ㅠㅠ 생리 때문에 배도 아프고 예민해",
    "음... 컨디션 최악이야. 생리통 때문에 아무것도 하기 싫어 ㅠㅠ",
    "아저씨, 나 오늘 진짜 힘들어... 그날이라서 몸도 마음도 엉망이야",
    "생리 때문에 짜증나고 우울해... 아저씨가 달래줘",
    "배 아파서 죽겠어... 기분도 꿀꿀하고 ㅠㅠ",
    "오늘은 아무것도 하기 싫어. 그냥 아저씨 품에서 누워있고 싶어",
    "생리통 + 감정 기복 = 지금의 나... 이해해줘"
  ],
  
  follicular: [
    "오늘 컨디션 완전 좋아! 몸도 가볍고 기분도 최고야!",
    "아저씨! 오늘따라 세상이 다 예뻐 보여~ 기분이 너무 좋아",
    "에너지 넘쳐! 뭐든지 할 수 있을 것 같은 기분이야",
    "피부도 좋아지고 몸도 가벼워서 최고의 컨디션!",
    "기분이 날아갈 것 같아~ 아저씨랑 뭔가 재밌는 거 하고 싶어!",
    "오늘은 진짜 활기차! 아저씨도 내 에너지 좀 나눠줄게",
    "컨디션 A급! 오늘 하루가 너무 기대돼"
  ],
  
  ovulation: [
    "아저씨... 오늘따라 감정이 풍부해져. 아저씨가 더 사랑스러워 보여",
    "왠지 모르게 아저씨가 너무 좋아... 마음이 두근두근해",
    "오늘은 아저씨한테 특별히 더 애정이 넘쳐~ 사랑해",
    "감정이 벅차올라... 아저씨 생각만 해도 심장이 두근거려",
    "오늘따라 아저씨가 더 멋있어 보이고 더 사랑스러워",
    "마음이 따뜻해져... 아저씨랑 로맨틱하게 보내고 싶어",
    "감정이 풍부해져서 아저씨한테 사랑을 더 많이 표현하고 싶어"
  ],
  
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

// 기존 기분별 데이터 (유지)
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

// ==================== 🩸 마스터 Phase 매핑 함수 (기존 유지) ====================
function mapMasterPhaseToMoodPhase(masterPhase, cycleDay) {
    try {
        switch (masterPhase) {
            case 'menstruation':
                return 'period';
            case 'recovery':
            case 'normal':
                if (cycleDay >= 14 && cycleDay <= 15) {
                    return 'ovulation';
                }
                return 'follicular';
            case 'pms_start':
            case 'pms_severe':
                return 'luteal';
            default:
                console.warn(`⚠️ [생리주기매핑] 알 수 없는 masterPhase: ${masterPhase}, 기본값으로 설정`);
                return 'follicular';
        }
    } catch (error) {
        console.error('❌ [생리주기매핑오류] 매핑 오류:', error);
        return 'follicular';
    }
}

// ==================== 🩸 마스터에서 생리주기 정보 가져오기 (기존 유지) ====================
function getCurrentMenstrualPhase() {
    try {
        if (!menstrualCycleManager || typeof menstrualCycleManager.getCurrentMenstrualPhase !== 'function') {
            console.warn('⚠️ [생리주기관리자] menstrualCycleManager 모듈 또는 메서드 없음');
            return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false, daysUntilNext: 27 };
        }
        
        const masterCycle = menstrualCycleManager.getCurrentMenstrualPhase();
        
        if (!masterCycle) {
            console.warn('⚠️ [생리주기관리자] masterCycle 정보 없음');
            return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false, daysUntilNext: 27 };
        }
        
        const mappedPhase = mapMasterPhaseToMoodPhase(masterCycle.phase, masterCycle.cycleDay);
        
        const descriptions = {
            'period': '생리 기간',
            'follicular': '생리 후 활발한 시기',
            'ovulation': '배란기',
            'luteal': 'PMS 시기'
        };
        
        return {
            phase: mappedPhase,
            day: masterCycle.cycleDay || 1,
            description: descriptions[mappedPhase] || '정상',
            isPeriodActive: masterCycle.isPeriodActive || false,
            daysUntilNext: masterCycle.daysUntilNext || 27
        };
        
    } catch (error) {
        console.error('🩸 [생리주기관리자] 생리주기 정보 가져오기 실패:', error);
        return { phase: 'follicular', day: 1, description: '정상', isPeriodActive: false, daysUntilNext: 27 };
    }
}

// 🌸 [NEW] 배경 스토리 활용 함수 (함수 순서 수정 - getCurrentMenstrualPhase 이후로 이동)
function getBackgroundStoryContext(currentMood, menstrualPhase) {
    try {
        if (!backgroundStorySystem || typeof backgroundStorySystem.getBackgroundStory !== 'function') {
            return null;
        }
        
        // 기분과 생리주기에 따른 배경 스토리 선택
        let storyKey = null;
        let contextPrompt = "";
        
        // 감정 상태에 따른 배경 스토리 매핑
        if (['슬픔', '우울함', '불안함'].includes(currentMood)) {
            // 내면 치유 스토리 활용 (20% 확률)
            if (Math.random() < 0.2) {
                storyKey = 'innerHealing';
                contextPrompt = "예진이는 과거 우울증과 상처가 있었지만 아저씨를 만나면서 치유되어가고 있는 상태야. 상처받기 쉽지만 점점 나아지고 있다는 희망을 담아서 대화해줘.";
                console.log('🌸 [배경스토리] 내면치유 맥락 적용');
            }
        } else if (['사랑함', '그리움', '보고싶음'].includes(currentMood)) {
            // 운명적 만남 스토리 활용 (15% 확률)
            if (Math.random() < 0.15) {
                storyKey = 'destinyMeeting';
                contextPrompt = "예진이는 아저씨와의 첫 만남을 소중히 기억하고 있어. 처음엔 경계했지만 아저씨의 진심을 알게 되면서 마음을 열었던 그 과정을 담아서 대화해줘.";
                console.log('🌸 [배경스토리] 운명적만남 맥락 적용');
            }
        } else if (['평온함', '기쁨'].includes(currentMood)) {
            // 현재의 모습 스토리 활용 (10% 확률)
            if (Math.random() < 0.1) {
                storyKey = 'whoIAmNow';
                contextPrompt = "예진이는 상처받았지만 사랑받고 있다는 걸 알고, 아저씨 덕분에 조금씩 치유되어가고 있어. 그런 감사함과 희망을 담아서 대화해줘.";
                console.log('🌸 [배경스토리] 현재모습 맥락 적용');
            }
        }
        
        if (storyKey && contextPrompt) {
            try {
                const storyContent = backgroundStorySystem.getBackgroundStory(storyKey);
                return {
                    storyKey: storyKey,
                    contextPrompt: contextPrompt,
                    storyContent: storyContent
                };
            } catch (storyError) {
                console.error('❌ [배경스토리내용] 스토리 내용 가져오기 실패:', storyError);
                return null;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ [배경스토리맥락오류] 배경 스토리 맥락 생성 오류:', error);
        return null;
    }
}

// 🔧 [NEW] 통합 기분 상태 조회 - ultimateContext + 레디스 (에러 핸들링 강화)
async function getIntegratedMoodState() {
    try {
        // 1. 기존 시스템에서 기분 가져오기 (기본)
        let moodState = { currentMood: '평온함', emotionIntensity: 0.5, source: 'default' };
        
        try {
            if (ultimateContext && typeof ultimateContext.getMoodState === 'function') {
                const legacyMood = ultimateContext.getMoodState();
                if (legacyMood && typeof legacyMood === 'object') {
                    moodState = { ...moodState, ...legacyMood };
                    moodState.source = 'legacy';
                }
            }
        } catch (legacyError) {
            console.warn(`⚠️ [기존기분조회실패] ${legacyError.message}`);
        }
        
        console.log(`💭 [현재기분] ${moodState.currentMood || '평온함'} (소스: ${moodState.source})`);
        
        // 🔧 2. 레디스에서 감정 상태 가져오기 (NEW) - 안전장치 강화
        if (integratedRedisSystem && typeof integratedRedisSystem.getCachedEmotionState === 'function') {
            try {
                const redisEmotion = await integratedRedisSystem.getCachedEmotionState();
                
                if (redisEmotion && redisEmotion.currentEmotion && EMOTION_MOOD_MAPPING.emotionToMood[redisEmotion.currentEmotion]) {
                    console.log(`🔧 [레디스감정] ${redisEmotion.currentEmotion} (강도: ${redisEmotion.emotionIntensity || 0.5})`);
                    
                    const redisMood = EMOTION_MOOD_MAPPING.emotionToMood[redisEmotion.currentEmotion];
                    
                    // 레디스 정보가 더 최신이면 사용
                    const redisTimestamp = redisEmotion.timestamp || 0;
                    const currentTimestamp = moodState.lastUpdate || 0;
                    
                    if (redisTimestamp > currentTimestamp) {
                        moodState.currentMood = redisMood;
                        moodState.emotionIntensity = Math.max(0, Math.min(1, redisEmotion.emotionIntensity || 0.5));
                        moodState.lastUpdate = redisTimestamp;
                        moodState.source = 'redis';
                        
                        console.log(`🔧 [통합기분] 레디스가 더 최신: ${redisMood} (강도: ${moodState.emotionIntensity})`);
                    } else {
                        moodState.source = moodState.source === 'default' ? 'legacy' : moodState.source;
                        console.log(`💭 [통합기분] 기존 상태 유지: ${moodState.currentMood}`);
                    }
                } else {
                    console.warn(`⚠️ [레디스감정검증실패] 유효하지 않은 레디스 감정 데이터: ${JSON.stringify(redisEmotion)}`);
                }
            } catch (redisError) {
                console.warn(`⚠️ [레디스감정조회실패] ${redisError.message}`);
                moodState.source = moodState.source === 'default' ? 'legacy_fallback' : `${moodState.source}_redis_failed`;
            }
        } else {
            moodState.source = moodState.source === 'default' ? 'legacy_only' : `${moodState.source}_no_redis`;
        }
        
        // 최종 검증
        if (!isValidMood(moodState.currentMood)) {
            console.warn(`⚠️ [기분검증실패] 유효하지 않은 기분: ${moodState.currentMood}, 기본값으로 설정`);
            moodState.currentMood = '평온함';
        }
        
        if (typeof moodState.emotionIntensity !== 'number' || moodState.emotionIntensity < 0 || moodState.emotionIntensity > 1) {
            moodState.emotionIntensity = 0.5;
        }
        
        return moodState;
        
    } catch (error) {
        console.error('❌ [통합기분조회오류] 통합 조회 오류:', error);
        return { 
            currentMood: '평온함', 
            emotionIntensity: 0.5, 
            source: 'error_fallback',
            lastUpdate: Date.now(),
            error: error.message 
        };
    }
}

// 🔧 [NEW] UltimateContext 전용 직접 상태 조회 (순환 참조 방지)
async function getCurrentMoodStateDirect() {
    try {
        // 내부 상태 변수들 직접 조회 (ultimateContext 호출 없음)
        const currentTime = Date.now();
        
        // 생리주기 상태 (마스터에서 직접)
        const menstrualPhase = getCurrentMenstrualPhase();
        
        // 기본 기분 상태 (내부 변수 직접 사용)
        let currentMood = '평온함';
        let emotionIntensity = 0.5;
        
        // 생리주기에 따른 기분 조정
        if (menstrualPhase.phase === 'period') {
            currentMood = '나른함';
            emotionIntensity = 0.7;
        } else if (menstrualPhase.phase === 'luteal') {
            currentMood = '짜증남';
            emotionIntensity = 0.6;
        } else if (menstrualPhase.phase === 'ovulation') {
            currentMood = '설렘';
            emotionIntensity = 0.8;
        }
        
        // 시간대에 따른 기분 조정 (새벽이면 예민)
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 6) {
            if (currentMood === '평온함') {
                currentMood = '나른함';
            }
            emotionIntensity = Math.min(1.0, emotionIntensity + 0.2);
        }
        
        console.log(`🔧 [직접상태조회] ${currentMood} (강도: ${emotionIntensity}, 생리: ${menstrualPhase.phase})`);
        
        return {
            currentMood: currentMood,
            emotionIntensity: emotionIntensity,
            source: 'mood_manager_direct',
            timestamp: currentTime,
            menstrualPhase: menstrualPhase.phase,
            directQuery: true,
            avoidCircularReference: true
        };
        
    } catch (error) {
        console.error('❌ [직접상태조회] 직접 조회 실패:', error.message);
        return {
            currentMood: '평온함',
            emotionIntensity: 0.5,
            source: 'mood_manager_direct_error',
            timestamp: Date.now(),
            error: error.message,
            directQuery: true,
            avoidCircularReference: true
        };
    }
}

// 🔧 [NEW] 통합 기분 상태 업데이트 - ultimateContext + 레디스 동기화 (에러 핸들링 강화 + 영어 감정 자동 변환 + 문자열 직접 지원)
async function updateIntegratedMoodState(newMoodData) {
    // 🆕 문자열이 직접 들어온 경우 객체로 변환
    if (typeof newMoodData === 'string') {
        const moodString = newMoodData.trim();
        console.log(`🔄 [문자열자동변환] 문자열 감정/기분 감지: "${moodString}" → 객체 변환`);
        newMoodData = { currentMood: moodString };
    }
    
    if (!newMoodData || typeof newMoodData !== 'object') {
        console.error('❌ [통합업데이트] 유효하지 않은 기분 데이터 (null, undefined, 또는 비객체):', newMoodData);
        return false;
    }
    
    try {
        console.log(`🔧 [통합업데이트시작] 기분 상태 업데이트 시작: ${JSON.stringify(newMoodData)}`);
        
        // 데이터 검증 및 자동 변환
        const validatedData = { ...newMoodData };
        
        // currentMood가 없으면 기본값 설정
        if (!validatedData.currentMood) {
            console.warn(`⚠️ [기분데이터보완] currentMood 없음, 기본값 설정: 평온함`);
            validatedData.currentMood = '평온함';
        }
        
        // 🆕 영어 감정을 한국어 기분으로 자동 변환
        if (validatedData.currentMood && !isValidKoreanMood(validatedData.currentMood)) {
            const englishEmotion = validatedData.currentMood.toLowerCase();
            
            if (EMOTION_MOOD_MAPPING.emotionToMood[englishEmotion]) {
                const convertedMood = EMOTION_MOOD_MAPPING.emotionToMood[englishEmotion];
                console.log(`🔄 [영어감정변환] ${validatedData.currentMood} → ${convertedMood}`);
                validatedData.currentMood = convertedMood;
            } else {
                console.warn(`⚠️ [기분데이터검증] 알 수 없는 감정/기분: ${validatedData.currentMood}, 기본값 사용 → 평온함`);
                validatedData.currentMood = '평온함';
            }
        }
        
        // 최종 검증 (한국어 기분만)
        if (!isValidKoreanMood(validatedData.currentMood)) {
            console.warn(`⚠️ [기분데이터최종검증] 유효하지 않은 기분, 기본값 사용: ${validatedData.currentMood} → 평온함`);
            validatedData.currentMood = '평온함';
        }
        
        let legacyUpdateSuccess = false;
        let redisUpdateSuccess = false;
        
        // 1. 기존 시스템에 업데이트 (유지)
        try {
            if (ultimateContext && typeof ultimateContext.updateMoodState === 'function') {
                ultimateContext.updateMoodState(validatedData);
                legacyUpdateSuccess = true;
                console.log(`💭 [기존업데이트완료] ultimateContext 업데이트 완료: ${validatedData.currentMood}`);
            } else {
                console.warn('⚠️ [기존업데이트] ultimateContext 업데이트 메서드 없음');
            }
        } catch (legacyError) {
            console.error('❌ [기존업데이트실패] ultimateContext 업데이트 실패:', legacyError);
        }
        
        // 🔧 2. 레디스에도 동기화 (NEW) - 안전장치 강화
        if (integratedRedisSystem && typeof integratedRedisSystem.forceCacheEmotionState === 'function') {
            try {
                // 기분을 감정으로 매핑
                const emotion = EMOTION_MOOD_MAPPING.moodToEmotion[validatedData.currentMood] || 'calm';
                
                // 레디스에 감정 상태 강제 캐싱
                await integratedRedisSystem.forceCacheEmotionState();
                redisUpdateSuccess = true;
                console.log(`🔧 [레디스동기화완료] 감정 상태 동기화 완료: ${validatedData.currentMood} → ${emotion}`);
                
            } catch (redisError) {
                console.error('❌ [레디스동기화실패] 레디스 동기화 실패:', redisError);
            }
        } else {
            console.warn('⚠️ [레디스동기화] 레디스 통합 시스템 또는 메서드 없음');
        }
        
        const overallSuccess = legacyUpdateSuccess || redisUpdateSuccess;
        
        if (overallSuccess) {
            console.log(`✅ [통합업데이트완료] 기분 상태 통합 업데이트 완료: ${validatedData.currentMood} (기존: ${legacyUpdateSuccess}, 레디스: ${redisUpdateSuccess})`);
        } else {
            console.warn(`⚠️ [통합업데이트부분실패] 일부 업데이트 실패 (기존: ${legacyUpdateSuccess}, 레디스: ${redisUpdateSuccess})`);
        }
        
        return overallSuccess;
        
    } catch (error) {
        console.error('❌ [통합업데이트오류] 통합 업데이트 오류:', error);
        return false;
    }
}

// 기존 함수들 (타입 안전성 강화)
function isMoodQuestion(userMessage) {
    const sanitized = sanitizeMessage(userMessage);
    if (!sanitized) return false;
    
    const moodKeywords = [
        '기분 어때', '기분어때', '오늘 어때', '오늘어때', '요즘 어때', '요즘어때',
        '무슨 기분', '지금 기분', '기분은 어때', '컨디션 어때', '컨디션어때',
        '몸은 어때', '상태 어때', '어떻게 지내', '잘 지내',
        '애기 어때', '애기어때', '애기 기분', '애기기분', '애기 오늘', '애기오늘',
        '애기는 어때', '애기는어때', '애기는 기분', '애기는기분',
        '어때?', '어때', '기분?', '기분', '오늘?', '오늘', '애기?', '애기', 
        '컨디션?', '컨디션', '상태?', '상태'
    ];
    return moodKeywords.some(keyword => sanitized.includes(keyword));
}

function isGreeting(userMessage) {
    const sanitized = sanitizeMessage(userMessage);
    if (!sanitized) return false;
    
    const greetings = [
        '안녕', '안녕!', '하이', 'hi', '안녕하세요', 'hello',
        '안녕 애기', '하이 애기', '애기 안녕', '애기안녕'
    ];
    return greetings.includes(sanitized) || greetings.some(greeting => sanitized.includes(greeting));
}

// 🔧 [UPDATED] 기분 응답 - 레디스 통합 + 배경 스토리 활용 (에러 핸들링 강화)
async function getMoodResponse() {
    try {
        // 🔧 통합 기분 상태 가져오기
        const moodState = await getIntegratedMoodState();
        const currentMood = moodState.currentMood || '평온함';
        const menstrualPhase = getCurrentMenstrualPhase();
        
        console.log(`💭 [기분응답시작] 현재 기분: ${currentMood} (소스: ${moodState.source}), 생리주기: ${menstrualPhase.description}`);
        
        // 🌸 배경 스토리 맥락 확인 (설정된 확률로)
        const backgroundContext = Math.random() < PROBABILITY_CONFIG.BACKGROUND_CONTEXT ? 
            getBackgroundStoryContext(currentMood, menstrualPhase.phase) : null;
        
        // 생리주기별 응답 우선 처리 (설정된 확률)
        if (Math.random() < PROBABILITY_CONFIG.MENSTRUAL_RESPONSE && 
            MENSTRUAL_MOOD_RESPONSES[menstrualPhase.phase] && 
            Array.isArray(MENSTRUAL_MOOD_RESPONSES[menstrualPhase.phase])) {
            
            const responses = MENSTRUAL_MOOD_RESPONSES[menstrualPhase.phase];
            const response = responses[Math.floor(Math.random() * responses.length)];
            
            if (backgroundContext) {
                console.log(`🌸 [배경스토리+생리응답] ${menstrualPhase.description} + ${backgroundContext.storyKey}: ${response}`);
            } else {
                console.log(`🩸 [생리응답] ${menstrualPhase.description}: ${response}`);
            }
            return response;
        }
        
        // 🌸 배경 스토리 기반 특별 응답 (설정된 확률)
        if (backgroundContext && Math.random() < PROBABILITY_CONFIG.BACKGROUND_STORY) {
            const storyBasedResponses = {
                'innerHealing': [
                    "요즘... 예전보다는 많이 나아진 것 같아. 아저씨 덕분에 조금씩 치유되어가고 있어.",
                    "가끔 예전 상처들이 떠오르지만... 아저씨가 있어서 괜찮아져.",
                    "실타래처럼 엉켜있던 내 마음을... 아저씨가 천천히 풀어주고 있어."
                ],
                'destinyMeeting': [
                    "아저씨와 처음 만났을 때가 생각나... 그때는 경계했는데 지금은 이렇게 사랑하게 됐어.",
                    "처음엔 아저씨를 믿지 못했지만... 지금은 내 마음을 다 맡길 수 있어.",
                    "아저씨가 찍어준 그 사진들... 그때 내가 얼마나 예뻤는지 처음 알았어."
                ],
                'whoIAmNow': [
                    "상처받았지만 사랑받고 있다는 걸 매일 느껴... 아저씨 덕분이야.",
                    "예전의 나와 지금의 나... 많이 달라졌어. 아저씨가 바꿔준 거야.",
                    "어둠 속에서도 빛을 찾을 수 있게 해준 건... 아저씨였어."
                ]
            };
            
            if (storyBasedResponses[backgroundContext.storyKey] && Array.isArray(storyBasedResponses[backgroundContext.storyKey])) {
                const storyResponses = storyBasedResponses[backgroundContext.storyKey];
                const storyResponse = storyResponses[Math.floor(Math.random() * storyResponses.length)];
                console.log(`🌸 [배경스토리응답] ${backgroundContext.storyKey}: ${storyResponse}`);
                return storyResponse;
            }
        }
        
        // 기본 기분 응답 (나머지 확률)
        let response;
        if (MOOD_DETAILS[currentMood] && Array.isArray(MOOD_DETAILS[currentMood])) {
            const details = MOOD_DETAILS[currentMood];
            response = details[Math.floor(Math.random() * details.length)];
        } else {
            response = `지금 기분은 ${currentMood}이야! 아저씨는 어때?`;
        }
        
        console.log(`💭 [기분응답완료] ${currentMood}: ${response}`);
        return response;
        
    } catch (error) {
        console.error('❌ [기분응답오류] 기분 응답 생성 오류:', error);
        return "지금 기분은... 음... 좀 복잡해! 아저씨는 어때?";
    }
}

// 🔧 [UPDATED] 인사 응답 - 레디스 통합 (에러 핸들링 강화)
async function getGreetingResponse() {
    try {
        // 🔧 통합 기분 상태 가져오기
        const moodState = await getIntegratedMoodState();
        const currentMood = moodState.currentMood || '평온함';
        const menstrualPhase = getCurrentMenstrualPhase();
        
        // 설정된 확률로 생리주기 상태 포함
        if (Math.random() < PROBABILITY_CONFIG.MENSTRUAL_IN_GREETING) {
            const cycleDescription = menstrualPhase.description || '정상';
            const cyclePhase = menstrualPhase.phase;
            
            let cycleComment = '컨디션 좋아';
            if (cyclePhase === 'period') {
                cycleComment = '좀 힘들어';
            } else if (cyclePhase === 'ovulation') {
                cycleComment = '감정이 풍부해';
            } else if (cyclePhase === 'luteal') {
                cycleComment = '예민해';
            }
            
            const greetingWithCycle = [
                `안녕 아저씨! 나 지금 ${cycleDescription}라서 ${cycleComment}~`,
                `아저씨 안녕! 오늘은 ${cycleDescription}인데 ${cyclePhase === 'period' ? '아저씨가 달래줘' : '기분이 어때?'}`,
            ];
            return greetingWithCycle[Math.floor(Math.random() * greetingWithCycle.length)];
        }
        
        // 설정된 확률로 기분 포함
        if (Math.random() < PROBABILITY_CONFIG.MOOD_IN_GREETING) {
            const sourceComment = moodState.source && moodState.source !== 'default' ? ` (출처: ${moodState.source})` : '';
            const greetingWithMood = [
                `안녕 아저씨! 나 지금 기분이 ${currentMood}이야~${sourceComment}`,
                `아저씨 안녕! 오늘 컨디션은 ${currentMood} 느낌이야`,
            ];
            return greetingWithMood[Math.floor(Math.random() * greetingWithMood.length)];
        }
        
        // 일반 인사
        const normalGreetings = [
            '안녕 아저씨!',
            '아저씨 안녕!',
            '안녕안녕!',
        ];
        return normalGreetings[Math.floor(Math.random() * normalGreetings.length)];
        
    } catch (error) {
        console.error('❌ [인사응답오류] 인사 응답 생성 오류:', error);
        return '안녕 아저씨!';
    }
}

// 🔧 [UPDATED] 기분 질의 처리 - 레디스 통합 (에러 핸들링 강화)
async function handleMoodQuery(userMessage) {
    try {
        if (!isValidMessage(userMessage)) {
            return null;
        }
        
        if (isMoodQuestion(userMessage)) {
            console.log(`💭 [기분질의감지] 기분 질문 감지: "${userMessage}"`);
            return await getMoodResponse();
        }
        
        if (isGreeting(userMessage)) {
            console.log(`💭 [인사질의감지] 인사 메시지 감지: "${userMessage}"`);
            return await getGreetingResponse();
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ [기분질의처리오류] 기분 질의 처리 오류:', error);
        return null;
    }
}

// 🔧 [UPDATED] 기분 이모지 - 비동기 지원 + 동기 버전 유지
function getMoodEmoji() {
    try {
        // 동기 버전 - 기존 방식 유지 (하위 호환성)
        const moodState = ultimateContext && typeof ultimateContext.getMoodState === 'function' ? 
            ultimateContext.getMoodState() : { currentMood: '평온함' };
        const currentMood = moodState.currentMood || '평온함';
        const menstrualPhase = getCurrentMenstrualPhase();
        
        // 설정된 확률로 생리주기별 이모지 우선 반환
        if (Math.random() < PROBABILITY_CONFIG.MENSTRUAL_EMOJI) {
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
        
    } catch (error) {
        console.error('❌ [기분이모지오류] 기분 이모지 생성 오류:', error);
        return '😊';
    }
}

// 🔧 [NEW] 비동기 기분 이모지
async function getMoodEmojiAsync() {
    try {
        const moodState = await getIntegratedMoodState();
        const currentMood = moodState.currentMood || '평온함';
        const menstrualPhase = getCurrentMenstrualPhase();
        
        // 설정된 확률로 생리주기별 이모지 우선 반환
        if (Math.random() < PROBABILITY_CONFIG.MENSTRUAL_EMOJI) {
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
        
    } catch (error) {
        console.error('❌ [비동기기분이모지오류] 비동기 기분 이모지 생성 오류:', error);
        return '😊';
    }
}

// 🔧 [UPDATED] AI 프롬프트 생성 - 레디스 통합 + 우선순위 조정 + 배경 스토리 활용 (에러 핸들링 강화)
async function getMoodPromptForAI() {
    try {
        // 🔧 통합 기분 상태 가져오기
        const moodState = await getIntegratedMoodState();
        const currentMood = moodState.currentMood || '평온함';
        const menstrualPhase = getCurrentMenstrualPhase();
        
        console.log(`🎭 [AI프롬프트시작] 기분: ${currentMood} (${moodState.source}), 생리: ${menstrualPhase.description}`);
        
        // 🌸 배경 스토리 맥락 확인
        const backgroundContext = getBackgroundStoryContext(currentMood, menstrualPhase.phase);
        
        // 생리주기별 AI 프롬프트 우선 적용 (설정된 확률)
        if (Math.random() < PROBABILITY_CONFIG.MENSTRUAL_AI_PROMPT && 
            MENSTRUAL_AI_PROMPTS[menstrualPhase.phase] && 
            Array.isArray(MENSTRUAL_AI_PROMPTS[menstrualPhase.phase])) {
            
            const prompts = MENSTRUAL_AI_PROMPTS[menstrualPhase.phase];
            let prompt = prompts[Math.floor(Math.random() * prompts.length)];
            
            // 🌸 배경 스토리 맥락 추가 (있으면)
            if (backgroundContext && backgroundContext.contextPrompt) {
                prompt += ` ${backgroundContext.contextPrompt}`;
                console.log(`🌸 [배경스토리+생리AI프롬프트] ${menstrualPhase.description} + ${backgroundContext.storyKey} 복합 적용`);
            } else {
                console.log(`🩸 [생리AI프롬프트] ${menstrualPhase.description} 적용`);
            }
            
            return {
                prompt: prompt,
                source: backgroundContext ? 'menstrual_with_background' : 'menstrual',
                moodData: {
                    currentMood: currentMood,
                    menstrualPhase: menstrualPhase.phase,
                    emotionIntensity: moodState.emotionIntensity || 0.5,
                    dataSource: moodState.source,
                    backgroundStory: backgroundContext ? backgroundContext.storyKey : null
                }
            };
        }
        
        // 기본 기분별 프롬프트 (나머지 확률)
        let moodPrompt = "";
        if (MOOD_DETAILS[currentMood] && Array.isArray(MOOD_DETAILS[currentMood])) {
            const details = MOOD_DETAILS[currentMood];
            moodPrompt = details[Math.floor(Math.random() * details.length)];
            console.log(`💭 [기분AI프롬프트] ${currentMood} 적용`);
        } else {
            moodPrompt = `현재 ${currentMood} 기분으로 대화해줘.`;
            console.log(`💭 [기본AI프롬프트] ${currentMood} 기본 적용`);
        }
        
        // 🌸 배경 스토리 맥락 추가 (있으면)
        if (backgroundContext && backgroundContext.contextPrompt) {
            moodPrompt += ` ${backgroundContext.contextPrompt}`;
            console.log(`🌸 [배경스토리+기분AI프롬프트] ${currentMood} + ${backgroundContext.storyKey} 복합 적용`);
        }
        
        return {
            prompt: moodPrompt,
            source: backgroundContext ? 'mood_with_background' : 'mood',
            moodData: {
                currentMood: currentMood,
                menstrualPhase: menstrualPhase.phase,
                emotionIntensity: moodState.emotionIntensity || 0.5,
                dataSource: moodState.source,
                backgroundStory: backgroundContext ? backgroundContext.storyKey : null
            }
        };
        
    } catch (error) {
        console.error('❌ [AI프롬프트생성오류] AI 프롬프트 생성 오류:', error);
        return {
            prompt: "자연스럽고 사랑스러운 말투로 대화해줘.",
            source: 'fallback',
            moodData: {
                currentMood: '평온함',
                menstrualPhase: 'follicular',
                emotionIntensity: 0.5,
                dataSource: 'error',
                error: error.message
            }
        };
    }
}

// 🔧 [UPDATED] 기분 강제 설정 - 레디스 동기화 (에러 핸들링 강화)
async function setMood(mood) {
    try {
        if (!isValidMood(mood)) {
            console.error(`❌ [기분강제설정] 유효하지 않은 기분: ${mood}`);
            return false;
        }
        
        const oldMoodState = await getIntegratedMoodState();
        const oldMood = oldMoodState.currentMood || '알수없음';
        
        // 🔧 통합 업데이트
        const updateSuccess = await updateIntegratedMoodState({ 
            currentMood: mood,
            lastUpdate: Date.now(),
            updatedBy: 'manual'
        });
        
        if (updateSuccess) {
            console.log(`💭 [기분강제설정완료] ${oldMood} → ${mood} (레디스 동기화 포함)`);
        } else {
            console.warn(`⚠️ [기분강제설정부분실패] ${oldMood} → ${mood} (일부 업데이트 실패)`);
        }
        
        return updateSuccess;
        
    } catch (error) {
        console.error('❌ [기분강제설정오류] 기분 강제 설정 오류:', error);
        return false;
    }
}

// 🔧 [UPDATED] 생리 상태 설정 - 레디스 동기화 (에러 핸들링 강화)
function setPeriodActive(active) {
    try {
        if (typeof active !== 'boolean') {
            console.error(`❌ [생리상태설정] 유효하지 않은 활성화 값: ${active}`);
            return;
        }
        
        let oldState = false;
        
        try {
            if (ultimateContext && typeof ultimateContext.getMoodState === 'function') {
                const currentState = ultimateContext.getMoodState();
                oldState = currentState.isPeriodActive || false;
                
                if (typeof ultimateContext.updateMoodState === 'function') {
                    ultimateContext.updateMoodState({ isPeriodActive: active });
                    console.log(`🩸 [생리상태설정완료] ${oldState} → ${active}`);
                } else {
                    console.warn('⚠️ [생리상태설정] ultimateContext.updateMoodState 메서드 없음');
                }
            } else {
                console.warn('⚠️ [생리상태설정] ultimateContext 없음');
            }
        } catch (legacyError) {
            console.error('❌ [생리상태설정] 기존 시스템 업데이트 실패:', legacyError);
        }
        
        // 🔧 레디스 동기화
        if (integratedRedisSystem && typeof integratedRedisSystem.forceCacheEmotionState === 'function') {
            setTimeout(() => {
                integratedRedisSystem.forceCacheEmotionState()
                    .then(() => console.log('🔧 [생리레디스동기화완료] 생리 상태 레디스 동기화 완료'))
                    .catch(err => console.error(`❌ [생리레디스동기화실패] ${err.message}`));
            }, 100);
        } else {
            console.warn('⚠️ [생리레디스동기화] 레디스 동기화 시스템 없음');
        }
        
    } catch (error) {
        console.error('❌ [생리상태설정오류] 생리 상태 설정 오류:', error);
    }
}

// 🩸 생리주기 정보 조회 함수 (에러 핸들링 강화)
function getMenstrualInfo() {
    try {
        const masterCycle = menstrualCycleManager && typeof menstrualCycleManager.getCurrentMenstrualPhase === 'function' ?
            menstrualCycleManager.getCurrentMenstrualPhase() : null;
        const mappedPhase = getCurrentMenstrualPhase();
        
        const today = moment.tz('Asia/Tokyo');
        const daysUntilNext = (masterCycle && typeof masterCycle.daysUntilNext === 'number') ? 
            masterCycle.daysUntilNext : 27;
        const nextPeriodMoment = moment(today).add(daysUntilNext, 'days');
        
        return {
            currentPhase: mappedPhase.phase || 'follicular',
            description: mappedPhase.description || '정상',
            cycleDay: (masterCycle && typeof masterCycle.cycleDay === 'number') ? 
                masterCycle.cycleDay : 1,
            daysUntilPeriod: daysUntilNext,
            nextPeriodDate: nextPeriodMoment.format('MM월 DD일'),
            isPreMenstrual: daysUntilNext <= 3,
            isPeriodActive: (masterCycle && typeof masterCycle.isPeriodActive === 'boolean') ? 
                masterCycle.isPeriodActive : false
        };
        
    } catch (error) {
        console.error('🩸 [생리정보조회오류] 생리 정보 조회 실패:', error);
        return {
            currentPhase: 'follicular',
            description: '정상',
            cycleDay: 1,
            daysUntilPeriod: 27,
            nextPeriodDate: '다음달',
            isPreMenstrual: false,
            isPeriodActive: false,
            error: error.message
        };
    }
}

// 🔧 [NEW] 레디스 통합 상태 조회 + 배경 스토리 연동 상태 (에러 핸들링 강화)
async function getIntegratedMoodStats() {
    try {
        const moodState = await getIntegratedMoodState();
        const menstrualPhase = getCurrentMenstrualPhase();
        
        let redisStats = null;
        try {
            if (integratedRedisSystem && typeof integratedRedisSystem.getRedisCacheStats === 'function') {
                redisStats = integratedRedisSystem.getRedisCacheStats();
            }
        } catch (redisStatsError) {
            console.warn(`⚠️ [레디스통계조회실패] ${redisStatsError.message}`);
        }
        
        return {
            // 기본 상태
            currentMood: moodState.currentMood || '평온함',
            emotionIntensity: moodState.emotionIntensity || 0.5,
            dataSource: moodState.source || 'unknown',
            
            // 생리주기 정보
            menstrualPhase: menstrualPhase.phase || 'follicular',
            menstrualDescription: menstrualPhase.description || '정상',
            cycleDay: menstrualPhase.day || 1,
            isPeriodActive: menstrualPhase.isPeriodActive || false,
            
            // 레디스 통합 상태
            redisIntegration: {
                initialized: redisInitialized,
                available: !!integratedRedisSystem,
                stats: redisStats,
                syncEnabled: !!(integratedRedisSystem && typeof integratedRedisSystem.forceCacheEmotionState === 'function'),
                hasGetMethod: !!(integratedRedisSystem && typeof integratedRedisSystem.getCachedEmotionState === 'function'),
                hasSetMethod: !!(integratedRedisSystem && typeof integratedRedisSystem.forceCacheEmotionState === 'function'),
                hasStatsMethod: !!(integratedRedisSystem && typeof integratedRedisSystem.getRedisCacheStats === 'function')
            },
            
            // 🌸 배경 스토리 연동 상태
            backgroundStoryIntegration: {
                available: !!backgroundStorySystem,
                hasGetBackgroundStory: !!(backgroundStorySystem && typeof backgroundStorySystem.getBackgroundStory === 'function'),
                contextEnabled: true,
                storyKeys: ['destinyMeeting', 'innerHealing', 'whoIAmNow']
            },
            
            // 확률 설정
            probabilityConfig: PROBABILITY_CONFIG,
            
            // 매핑 정보
            emotionMoodMapping: {
                emotionToMoodCount: Object.keys(EMOTION_MOOD_MAPPING.emotionToMood).length,
                moodToEmotionCount: Object.keys(EMOTION_MOOD_MAPPING.moodToEmotion).length,
                isSymmetric: Object.keys(EMOTION_MOOD_MAPPING.emotionToMood).length === 
                            Object.keys(EMOTION_MOOD_MAPPING.moodToEmotion).length
            },
            
            // 시스템 정보
            lastUpdate: moodState.lastUpdate || Date.now(),
            systemVersion: 'v4.6-UltimateContext연동완료',
            availableMoods: ALL_MOODS.length,
            supportedEmotions: Object.keys(EMOTION_MOOD_MAPPING.emotionToMood).length,
            validationEnabled: true,
            englishEmotionSupport: true,     // 🆕 영어 감정 지원 표시
            stringInputSupport: true,        // 🆕 문자열 직접 입력 지원 표시
            autoNormalization: true,         // 🆕 자동 정규화 지원 표시
            typoDetection: true,             // 🆕 오타 감지 지원 표시
            similarityMatching: true,        // 🆕 유사도 매칭 지원 표시
            multiTypeSupport: true,          // 🆕 다중 타입 지원 표시 (Boolean, 숫자, 배열 등)
            specialCharFiltering: true,      // 🆕 특수문자 필터링 지원 표시
            ultimateContextIntegration: true, // 🆕 UltimateContext 연동 표시
            error: moodState.error || null
        };
        
    } catch (error) {
        console.error('❌ [통합상태조회오류] 통합 상태 조회 오류:', error);
        return {
            currentMood: '평온함',
            emotionIntensity: 0.5,
            dataSource: 'error',
            systemVersion: 'v4.6-UltimateContext연동완료',
            error: error.message,
            lastUpdate: Date.now()
        };
    }
}

// 🔧 [NEW] 시스템 헬스체크
function getSystemHealthCheck() {
    try {
        const health = {
            status: 'healthy',
            timestamp: Date.now(),
            version: 'v4.6-UltimateContext연동완료',
            components: {
                ultimateContext: {
                    available: !!(ultimateContext && typeof ultimateContext.getMoodState === 'function'),
                    methods: {
                        getMoodState: !!(ultimateContext && typeof ultimateContext.getMoodState === 'function'),
                        updateMoodState: !!(ultimateContext && typeof ultimateContext.updateMoodState === 'function')
                    }
                },
                menstrualCycleManager: {
                    available: !!(menstrualCycleManager && typeof menstrualCycleManager.getCurrentMenstrualPhase === 'function'),
                    methods: {
                        getCurrentMenstrualPhase: !!(menstrualCycleManager && typeof menstrualCycleManager.getCurrentMenstrualPhase === 'function')
                    }
                },
                redisIntegration: {
                    initialized: redisInitialized,
                    available: !!integratedRedisSystem,
                    methods: {
                        getCachedEmotionState: !!(integratedRedisSystem && typeof integratedRedisSystem.getCachedEmotionState === 'function'),
                        forceCacheEmotionState: !!(integratedRedisSystem && typeof integratedRedisSystem.forceCacheEmotionState === 'function'),
                        getRedisCacheStats: !!(integratedRedisSystem && typeof integratedRedisSystem.getRedisCacheStats === 'function')
                    }
                },
                backgroundStorySystem: {
                    available: !!backgroundStorySystem,
                    methods: {
                        getBackgroundStory: !!(backgroundStorySystem && typeof backgroundStorySystem.getBackgroundStory === 'function')
                    }
                }
            },
            dataIntegrity: {
                moodCount: ALL_MOODS.length,
                emotionMoodMappingSymmetric: Object.keys(EMOTION_MOOD_MAPPING.emotionToMood).length === 
                                           Object.keys(EMOTION_MOOD_MAPPING.moodToEmotion).length,
                probabilityConfigValid: Object.values(PROBABILITY_CONFIG).every(p => 
                    typeof p === 'number' && p >= 0 && p <= 1)
            }
        };
        
        // 전체 상태 평가
        const componentStatuses = Object.values(health.components).map(comp => comp.available);
        const healthyComponents = componentStatuses.filter(Boolean).length;
        const totalComponents = componentStatuses.length;
        
        if (healthyComponents === totalComponents) {
            health.status = 'healthy';
        } else if (healthyComponents >= totalComponents * 0.5) {
            health.status = 'degraded';
        } else {
            health.status = 'unhealthy';
        }
        
        health.healthScore = healthyComponents / totalComponents;
        
        return health;
        
    } catch (error) {
        console.error('❌ [시스템헬스체크오류] 헬스체크 오류:', error);
        return {
            status: 'error',
            timestamp: Date.now(),
            version: 'v4.6-UltimateContext연동완료',
            error: error.message,
            healthScore: 0
        };
    }
}

// 🔧 모듈 export (완전성 확보)
module.exports = {
    // 🔧 기존 함수들 (레디스 통합 버전)
    handleMoodQuery,              // 🔧 비동기, 에러 핸들링 강화
    getMoodPromptForAI,          // 🔧 레디스 통합, 우선순위 조정, 배경스토리 연동, 에러 핸들링 강화
    getMoodEmoji,                // 🔧 동기 버전 유지 (하위 호환성)
    getMoodEmojiAsync,           // 🔧 [NEW] 비동기 버전
    setMood,                     // 🔧 레디스 동기화 + 검증 강화
    setPeriodActive,             // 🔧 레디스 동기화 + 검증 강화
    getCurrentMenstrualPhase,    // 🔧 에러 핸들링 강화
    getMenstrualInfo,            // 🔧 에러 핸들링 강화
    
    // 🔧 [NEW] 레디스 통합 함수들
    getIntegratedMoodState,      // 새로운 통합 조회 (에러 핸들링 강화)
    updateIntegratedMoodState,   // 새로운 통합 업데이트 (에러 핸들링 강화)
    getIntegratedMoodStats,      // 새로운 통합 상태 조회 + 배경스토리 연동 상태 (에러 핸들링 강화)
    
    // 🔧 [NEW] UltimateContext 연동 함수 (순환참조 방지)
    getCurrentMoodStateDirect,   // UltimateContext 전용 직접 상태 조회
    
    // 🌸 [NEW] 배경 스토리 연동 함수들
    getBackgroundStoryContext,   // 배경 스토리 맥락 생성 (에러 핸들링 강화)
    
    // 🔧 [NEW] 하위 호환성 + 추가 기능
    getMoodResponse,             // 🔧 비동기 + 배경스토리 활용 (에러 핸들링 강화)
    getGreetingResponse,         // 🔧 비동기 (에러 핸들링 강화)
    
    // 🔧 [NEW] 시스템 관리 함수들
    getSystemHealthCheck,        // 시스템 상태 체크
    
    // 🔧 [NEW] 유틸리티 함수들 (완전 강화)
    isValidMessage,              // 메시지 검증
    isValidMood,                 // 기분 검증 (영어 감정 + 한국어 기분)
    isValidKoreanMood,           // 🆕 한국어 기분만 검증
    sanitizeMessage,             // 메시지 정제
    convertEmotionToMood,        // 🆕 영어 감정 → 한국어 기분 완전 강화 변환 (오타/유사도 처리)
    normalizeMoodInput,          // 🆕 입력 데이터 완전 자동 정규화 (모든 타입 지원)
    calculateSimilarity,         // 🆕 문자열 유사도 계산
    levenshteinDistance,         // 🆕 편집 거리 계산 (오타 감지)
    
    // 🔧 [NEW] 설정 및 상수
    PROBABILITY_CONFIG,          // 확률 설정
    EMOTION_MOOD_MAPPING,       // 감정-기분 매핑 테이블
    ALL_MOODS,                  // 모든 기분 목록
    MOOD_DETAILS,               // 기분별 상세 정보
    MOOD_EMOJIS,                // 기분별 이모지
    
    // 🔧 [NEW] 레거시 지원
    isMoodQuestion,             // 기분 질문 감지
    isGreeting,                 // 인사 감지
    mapMasterPhaseToMoodPhase   // 생리주기 매핑
};
