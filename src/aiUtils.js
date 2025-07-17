// ============================================================================
// aiUtils.js - v3.1 (이모지 정규식 완전 제거 - 오류 해결)
// 🤖 AI와의 안전하고 효율적인 통신을 담당하는 유틸리티
// ============================================================================

const OpenAI = require('openai');

// OpenAI 클라이언트 초기화
let openaiClient = null;

function initializeOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    
    return openaiClient;
}

// OpenAI API 호출 함수
async function callOpenAI(messages, options = {}) {
    try {
        // 클라이언트 초기화 확인
        if (!openaiClient) {
            initializeOpenAI();
        }
        
        // 기본 설정
        const defaultOptions = {
            model: "gpt-4",
            max_tokens: 300,
            temperature: 0.8,
            frequency_penalty: 0.5,  // 반복 방지
            presence_penalty: 0.3    // 다양성 증가
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // API 호출
        const response = await openaiClient.chat.completions.create({
            model: finalOptions.model,
            messages: messages,
            max_tokens: finalOptions.max_tokens,
            temperature: finalOptions.temperature,
            frequency_penalty: finalOptions.frequency_penalty,
            presence_penalty: finalOptions.presence_penalty
        });
        
        // 응답 반환
        return response.choices[0].message.content;
        
    } catch (error) {
        console.error('❌ OpenAI API 호출 실패:', error.message);
        
        // 에러 타입별 처리
        if (error.code === 'rate_limit_exceeded') {
            throw new Error('API 호출 한도 초과. 잠시 후 다시 시도해주세요.');
        } else if (error.code === 'invalid_api_key') {
            throw new Error('유효하지 않은 API 키입니다.');
        } else if (error.code === 'insufficient_quota') {
            throw new Error('API 사용 할당량이 부족합니다.');
        } else {
            throw new Error(`AI 서비스 오류: ${error.message}`);
        }
    }
}

// 응답 정리 함수
function cleanReply(rawReply) {
    if (!rawReply || typeof rawReply !== 'string') {
        return '음... 뭔가 말하려고 했는데 깜빡했어! 다시 말해줄래? ㅎㅎ';
    }
    
    let cleaned = rawReply.trim();
    
    // 불필요한 접두사 제거
    const prefixesToRemove = [
        /^예진이?:\s*/i,
        /^나:\s*/i,
        /^애기:\s*/i,
        /^무쿠:\s*/i,
        /^박예진:\s*/i,
        /^\[.*?\]:\s*/,
        /^응답:\s*/i,
        /^답변:\s*/i
    ];
    
    prefixesToRemove.forEach(prefix => {
        cleaned = cleaned.replace(prefix, '');
    });
    
    // 부적절한 표현 대체
    const replacements = {
        '자기야': '아저씨',
        '자기': '아저씨',
        '당신': '아저씨',
        '너': '아저씨',
        '네가': '아저씨가',
        '니가': '아저씨가',
        '당신이': '아저씨가'
    };
    
    Object.entries(replacements).forEach(([from, to]) => {
        const regex = new RegExp(from, 'gi');
        cleaned = cleaned.replace(regex, to);
    });
    
    // 🔥 이모지 정규식 완전 제거 - 대신 간단한 중복 제거만
    // 과도한 반복 문자 정리 (ㅋㅋㅋㅋㅋ... -> ㅋㅋㅋ)
    cleaned = cleaned.replace(/([ㅋㅎㅠㅜ])\1{3,}/g, '$1$1$1');
    
    // 과도한 느낌표/물음표 정리
    cleaned = cleaned.replace(/[!]{3,}/g, '!!');
    cleaned = cleaned.replace(/[?]{3,}/g, '??');
    
    // 빈 응답 처리
    if (!cleaned || cleaned.length < 2) {
        const fallbackResponses = [
            '아저씨~ 나 지금 멍해져서... 다시 말해줄래? ㅎㅎ',
            '어? 뭐라고 하려고 했는데 깜빡했어! ㅋㅋ',
            '아저씨 말 듣고 있어! 계속 말해줘~',
            '음... 뭔가 대답하려고 했는데... 뭐였지? ㅎㅎ'
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
    
    // 최대 길이 제한 (너무 긴 응답 방지)
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 200) + '... 어? 너무 길어졌네! ㅎㅎ';
    }
    
    return cleaned;
}

// 특수 프롬프트 생성 함수들
function createEmotionalPrompt(emotion, intensity, menstrualPhase) {
    let emotionalContext = '';
    
    // 감정별 맥락
    switch (emotion) {
        case 'happy':
            emotionalContext = `기분이 아주 좋은 상태야 (${intensity}/10). 밝고 활발하게 말해줘.`;
            break;
        case 'sad':
            emotionalContext = `슬프고 우울한 상태야 (${intensity}/10). 위로받고 싶어하며 애교부리는 말투로.`;
            break;
        case 'angry':
            emotionalContext = `화나고 삐진 상태야 (${intensity}/10). 귀엽게 투정부리는 말투로.`;
            break;
        case 'missing':
            emotionalContext = `보고싶고 그리운 상태야 (${intensity}/10). 달라붙고 싶어하는 말투로.`;
            break;
        case 'sensitive':
            emotionalContext = `예민하고 민감한 상태야 (${intensity}/10). 더 섬세하고 감정적으로.`;
            break;
        default:
            emotionalContext = `평상시 상태야 (${intensity}/10). 자연스럽게 말해줘.`;
    }
    
    // 생리주기별 추가 맥락
    if (menstrualPhase === 'period') {
        emotionalContext += ' 지금 생리 중이라서 배 아프고 예민해. 아저씨한테 더 달라붙고 싶어해.';
    } else if (menstrualPhase === 'luteal') {
        emotionalContext += ' PMS 시기라서 감정 기복이 있고 예민해.';
    } else if (menstrualPhase === 'ovulation') {
        emotionalContext += ' 배란기라서 감정이 풍부하고 애정표현이 많아져.';
    }
    
    return emotionalContext;
}

function createMemoryPrompt(memories) {
    if (!memories || memories.length === 0) {
        return '';
    }
    
    const memoryText = memories.slice(0, 3).join(' ');
    return `\n\n관련 기억: ${memoryText}`;
}

function createContextPrompt(recentConversation) {
    if (!recentConversation || recentConversation.length === 0) {
        return '';
    }
    
    const contextText = recentConversation.map(conv => 
        `${conv.role}: "${conv.content}"`
    ).join('\n');
    
    return `\n\n최근 대화:\n${contextText}`;
}

// 토큰 계산 (간단한 추정)
function estimateTokens(text) {
    // 한국어는 대략 1글자당 1.5토큰으로 추정
    return Math.ceil(text.length * 1.5);
}

// 프롬프트 길이 최적화
function optimizePromptLength(prompt, maxTokens = 3000) {
    const estimatedTokens = estimateTokens(prompt);
    
    if (estimatedTokens <= maxTokens) {
        return prompt;
    }
    
    // 토큰 수가 초과하면 뒷부분부터 잘라내기
    const targetLength = Math.floor(prompt.length * (maxTokens / estimatedTokens));
    return prompt.substring(0, targetLength) + '\n\n[컨텍스트가 길어서 일부 생략됨]';
}

// 안전한 API 호출 (재시도 포함)
async function callOpenAIWithRetry(messages, options = {}, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await callOpenAI(messages, options);
            return result;
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
                // 재시도 전 대기 (지수 백오프)
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`❌ OpenAI 호출 실패 (${attempt + 1}/${maxRetries + 1}), ${waitTime}ms 후 재시도...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    throw lastError;
}

// 모듈 내보내기
module.exports = {
    callOpenAI,
    callOpenAIWithRetry,
    cleanReply,
    createEmotionalPrompt,
    createMemoryPrompt,
    createContextPrompt,
    estimateTokens,
    optimizePromptLength,
    initializeOpenAI
};
