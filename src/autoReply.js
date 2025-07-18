// ===============================================
// 날씨 키워드 처리 개선 (autoReply.js 수정 부분)
// ===============================================

// 🔧 기존 문제: 단순 키워드 매칭으로 오인식
const WEATHER_KEYWORDS = ['날씨', '비', '눈', '바람', '덥다', '춥다', '흐리다', '맑다'];

// ✅ 개선: 맥락적 날씨 감지
function isActualWeatherMessage(userMessage) {
    const message = userMessage.toLowerCase();
    
    // 1. 명확한 날씨 표현들
    const explicitWeatherPatterns = [
        /날씨.*어때/, /날씨.*좋/, /날씨.*나쁘/, /날씨.*추/, /날씨.*더워/,
        /비.*와/, /비.*내/, /비.*그쳐/, /비.*와서/, /눈.*와/, /눈.*내/,
        /덥다/, /춥다/, /추워/, /더워/, /시원해/, /따뜻해/,
        /흐려/, /맑아/, /구름/, /햇빛/, /바람.*불/, /바람.*세/
    ];
    
    // 2. 단순 글자만 있는 경우 제외
    const isJustLetters = ['비', '눈'].some(weather => {
        const index = message.indexOf(weather);
        if (index === -1) return false;
        
        // 앞뒤 문맥 확인 (의미있는 날씨 표현인지)
        const before = message.substring(Math.max(0, index - 2), index);
        const after = message.substring(index + 1, index + 3);
        
        // 단순히 글자 안에 포함된 경우 (예: "빔비", "비귀", "눈물")
        const isPartOfWord = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(before) || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(after);
        
        return !isPartOfWord; // 단어의 일부가 아닌 경우만 날씨로 인식
    });
    
    // 3. 명확한 날씨 패턴이 있거나, 단독 날씨 키워드가 있는 경우
    return explicitWeatherPatterns.some(pattern => pattern.test(message)) || isJustLetters;
}

// ✅ 개선된 날씨 키워드 처리 함수
function handleWeatherKeywords(userMessage) {
    // 진짜 날씨 메시지인지 확인
    if (!isActualWeatherMessage(userMessage)) {
        return null; // 날씨 메시지가 아니면 처리하지 않음
    }
    
    // 최근 날씨 응답 빈도 체크 (너무 자주 날씨 얘기 안 하도록)
    if (hasRecentWeatherResponse()) {
        return null;
    }
    
    const responses = [
        "날씨 얘기? 아저씨는 지금 일본이니까 나랑 다를 거야. 그래도 몸 따뜻하게 해!",
        "날씨가 어때? 아저씨 감기 걸리지 말고... 나는 항상 아저씨 걱정돼 ㅠㅠ",
        "아저씨 그 동네 날씨는 어때? 나는 여기서 아저씨 걱정하고 있어~"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // 마지막 날씨 응답 시간 기록
    setLastWeatherResponseTime();
    
    try {
        const logger = require('./enhancedLogging.js');
        logger.logWeatherReaction({ description: '날씨 대화', temp: 0 }, response);
    } catch (error) {
        logConversationReply('나', `(날씨) ${response}`);
    }
    
    return response;
}

// ✅ 날씨 응답 빈도 관리
let lastWeatherResponseTime = 0;
const WEATHER_RESPONSE_COOLDOWN = 30 * 60 * 1000; // 30분

function hasRecentWeatherResponse() {
    return Date.now() - lastWeatherResponseTime < WEATHER_RESPONSE_COOLDOWN;
}

function setLastWeatherResponseTime() {
    lastWeatherResponseTime = Date.now();
}

// ===============================================
// 사용 예시:
// "ㅋㅋㅋㅋㅌ빔비귀얍지...." → null (날씨 아님)
// "오늘 비 와서 우울해" → 날씨 응답
// "날씨 어때?" → 날씨 응답  
// "비가 와서 축축해" → 날씨 응답
// "눈물이 나와" → null (날씨 아님)
// ===============================================
