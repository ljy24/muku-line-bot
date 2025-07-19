// ============================================================================
// aiUtils.js v2.5 - selectedModel 에러 수정 버전
// 파일 저장 대신 console.log로 변경 + 모델별 최적화 지원
// ✨ "3.5", "4.0", "auto" 모드에 따라 다른 모델 사용
// 🔧 selectedModel undefined 에러 완전 수정
// ============================================================================

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✨ index.js에서 현재 모델 설정을 가져오는 함수
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [aiUtils] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [aiUtils] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

/**
 * [수정] 대화 내용을 console.log로 직접 출력합니다.
 */
async function saveLog(speaker, message) {
    // 파일에 저장하는 대신, 로그창에 바로 표시합니다.
    console.log(`[대화로그] ${speaker}: ${message}`);
}

/**
 * [수정] 사진 URL과 캡션을 console.log로 직접 출력합니다.
 */
async function saveImageLog(speaker, caption, imageUrl) {
    // 파일에 저장하는 대신, 로그창에 바로 표시합니다.
    console.log(`[사진로그] ${speaker}: ${caption} (URL: ${imageUrl})`);
}

// ✨ GPT 모델 자동 선택 로직
function getOptimalModelForMessage(userMessage, contextLength = 0) {
    if (!userMessage) return 'gpt-4o';
    
    // 길고 복잡한 메시지는 GPT-4o
    if (userMessage.length > 100 || contextLength > 3000) {
        return 'gpt-4o';
    }
    
    // 감정적이거나 복잡한 키워드가 있으면 GPT-4o
    const complexKeywords = [
        '감정', '기분', '슬퍼', '화나', '우울', '행복', '사랑', '그리워',
        '기억', '추억', '과거', '미래', '꿈', '희망', '불안', '걱정',
        '철학', '의미', '인생', '관계', '심리', '마음', '힘들', '아프'
    ];
    
    const hasComplexKeyword = complexKeywords.some(keyword => userMessage.includes(keyword));
    if (hasComplexKeyword) {
        return 'gpt-4o';
    }
    
    // 간단한 일상 대화는 GPT-3.5
    return 'gpt-3.5-turbo';
}

// ✨ GPT 모델 결정 함수
function determineGptModel(userMessage = '', contextLength = 0) {
    if (!getCurrentModelSetting) {
        console.warn('⚠️ [모델선택] 버전 관리 시스템 없음 - 기본값 사용');
        return 'gpt-4o'; // 기본값
    }
    
    const currentSetting = getCurrentModelSetting();
    
    switch(currentSetting) {
        case '3.5':
            console.log('✨ [모델선택] 사용자 설정: GPT-3.5-turbo');
            return 'gpt-3.5-turbo';
            
        case '4.0':
            console.log('✨ [모델선택] 사용자 설정: GPT-4o');
            return 'gpt-4o';
            
        case 'auto':
            const selectedModel = getOptimalModelForMessage(userMessage, contextLength);
            console.log(`✨ [모델선택] 자동 선택: ${selectedModel} (메시지길이: ${userMessage.length}, 컨텍스트: ${contextLength})`);
            return selectedModel;
            
        default:
            console.warn(`⚠️ [모델선택] 알 수 없는 설정: ${currentSetting} - 기본값 사용`);
            return 'gpt-4o';
    }
}

// ✨ 모델별 최적화된 설정을 반환하는 함수
function getModelOptimizedSettings(model) {
    switch(model) {
        case 'gpt-3.5-turbo':
            return {
                temperature: 0.9,  // 조금 더 일관성 있게 (기존 0.95에서 약간 낮춤)
                max_tokens: 120,   // 간결하게 (기존 150에서 줄임)
            };
            
        case 'gpt-4o':
            return {
                temperature: 0.95, // 창의적으로 (기존 유지)
                max_tokens: 200,   // 풍부하게 (기존 150에서 늘림)
            };
            
        default:
            return {
                temperature: 0.95,
                max_tokens: 150
            };
    }
}

// ✨ [완전 수정] 모델 버전 전환을 지원하는 callOpenAI 함수 - selectedModel 에러 해결
async function callOpenAI(messages, modelOverride = null, maxTokensOverride = null, temperatureOverride = null) {
    let selectedModel = 'gpt-4o'; // 기본값 설정
    
    try {
        // 1. 모델 결정 (오버라이드가 있으면 그것을 사용, 없으면 자동 선택)
        if (modelOverride) {
            selectedModel = modelOverride;
            console.log(`🎯 [모델강제] 오버라이드로 ${selectedModel} 사용`);
        } else {
            // messages에서 사용자 메시지 추출 (자동 선택용)
            const userMessage = messages.find(m => m.role === 'user')?.content || '';
            const contextLength = JSON.stringify(messages).length;
            selectedModel = determineGptModel(userMessage, contextLength);
        }
        
        // 2. 모델별 최적화된 설정 가져오기
        const optimizedSettings = getModelOptimizedSettings(selectedModel);
        
        // 3. 최종 설정 (오버라이드가 있으면 우선 적용)
        const finalSettings = {
            model: selectedModel,
            messages: messages,
            max_tokens: maxTokensOverride || optimizedSettings.max_tokens,
            temperature: temperatureOverride || optimizedSettings.temperature
        };
        
        console.log(`🤖 [OpenAI] 모델: ${finalSettings.model}, 온도: ${finalSettings.temperature}, 최대토큰: ${finalSettings.max_tokens}`);
        
        const response = await openai.chat.completions.create(finalSettings);
        
        // 토큰 사용량 로그
        if (response.usage) {
            console.log(`📊 [OpenAI] 토큰 사용량 - 입력: ${response.usage.prompt_tokens}, 출력: ${response.usage.completion_tokens}, 총합: ${response.usage.total_tokens}`);
        }
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        console.error(`[aiUtils] OpenAI API 호출 실패 (모델: ${selectedModel}):`, error.message);
        
        // ✨ 폴백 시스템: GPT-4o 실패 시 GPT-3.5로 재시도
        if (!modelOverride && selectedModel === 'gpt-4o') {
            console.log('🔄 [폴백] GPT-4o 실패 → GPT-3.5-turbo로 재시도');
            try {
                const fallbackResponse = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    max_tokens: 120,
                    temperature: 0.9
                });
                console.log('✅ [폴백] GPT-3.5-turbo로 재시도 성공');
                return fallbackResponse.choices[0].message.content.trim();
            } catch (fallbackError) {
                console.error('❌ [폴백] GPT-3.5-turbo도 실패:', fallbackError.message);
            }
        }
        
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

function cleanReply(reply) {
    if (typeof reply !== 'string') return '';
    let cleaned = reply;

    // 1. '자기야' 및 모든 '자기' → '아저씨'로 치환 (반말, 존댓말, 띄어쓰기 포함)
    cleaned = cleaned.replace(/\b자기야\b/gi, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/gi, '아저씨'); // 단독 '자기'도

    // 2. 1인칭/3인칭/존칭 치환 (예진이→나, 무쿠→나, 저→나, 너/자기/당신 등→아저씨)
    cleaned = cleaned.replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나');
    cleaned = cleaned.replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨');

    // 3. 존댓말 제거 및 자연스러운 말투로 변환
    cleaned = cleaned.replace(/(입니다|이에요|예요|하세요|하셨나요|셨습니다|드릴게요|드릴까요)/gi, '');
    cleaned = cleaned.replace(/좋아요/gi, '좋아');
    cleaned = cleaned.replace(/고마워요|감사합니다/gi, '고마워');
    cleaned = cleaned.replace(/미안해요|죄송합니다/gi, '미안해');
    cleaned = cleaned.replace(/합니(다|까)/gi, '해');
    cleaned = cleaned.replace(/하겠(습니다|어요)?/gi, '할게');

    // 4. 예진이/무쿠 1인칭 처리 반복(누락 방지)
    cleaned = cleaned.replace(/무쿠가/g, '내가')
        .replace(/무쿠는/g, '나는')
        .replace(/무쿠를/g, '나를')
        .replace(/예진이가/g, '내가')
        .replace(/예진이는/g, '나는')
        .replace(/예진이를/g, '나를');

    // 5. 불필요한 문자, 연속 공백 정리
    cleaned = cleaned.replace(/[\"\'\[\]]/g, '').replace(/\s\s+/g, ' ').trim();

    // 6. 만약 "자기야"나 "자기"가 혹시라도 남았으면 마지막으로 한 번 더 강제 치환
    cleaned = cleaned.replace(/자기야/gi, '아저씨').replace(/자기/gi, '아저씨');

    // 7. 최소 길이 보장
    if (!cleaned || cleaned.length < 2) {
        return '응? 다시 말해봐 아저씨';
    }

    return cleaned;
}

// ✨ 현재 설정된 모델 정보를 반환하는 함수 (디버그용)
function getCurrentModelInfo() {
    if (!getCurrentModelSetting) {
        return { setting: 'unknown', model: 'gpt-4o' };
    }
    
    const currentSetting = getCurrentModelSetting();
    let actualModel = 'gpt-4o';
    
    switch(currentSetting) {
        case '3.5':
            actualModel = 'gpt-3.5-turbo';
            break;
        case '4.0':
            actualModel = 'gpt-4o';
            break;
        case 'auto':
            actualModel = 'auto-select';
            break;
    }
    
    return { setting: currentSetting, model: actualModel };
}

// ✨ 안전한 모델 검증 함수
function validateModel(model) {
    const validModels = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo', 'gpt-4'];
    if (!model || !validModels.includes(model)) {
        console.warn(`⚠️ [모델검증] 유효하지 않은 모델: ${model}, 기본값 사용`);
        return 'gpt-4o';
    }
    return model;
}

module.exports = {
    saveLog,
    saveImageLog,
    callOpenAI,
    cleanReply,
    // ✨ 새로운 함수들 추가
    determineGptModel,
    getOptimalModelForMessage,
    getModelOptimizedSettings,
    getCurrentModelInfo,
    validateModel
};
