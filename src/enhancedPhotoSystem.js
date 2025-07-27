// ================== 🎯 무쿠 개선된 사진 시스템 v5.0 (실시간 Vision API) ==================
// 💰 사진 보낼 때마다 실시간 분석 ($0.02/일, $0.6/월)
// 🛡️ 100% 안전한 폴백 시스템 내장
// 💖 무쿠가 절대 벙어리가 되지 않도록 보장

const { OpenAI } = require('openai');
const moment = require('moment-timezone');

const TIMEZONE = 'Asia/Tokyo';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ================== 💾 시스템 상태 관리 ==================

let systemReady = false;
let totalCostToday = 0;
let totalPhotosAnalyzed = 0;

/**
 * 🚀 실시간 Vision API 시스템 초기화
 */
async function initializeEnhancedPhotoSystem() {
    try {
        console.log('[enhancedPhoto] 🚀 실시간 Vision API 시스템 초기화 시작...');
        
        // OpenAI API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            console.log('[enhancedPhoto] ❌ OpenAI API 키가 설정되지 않음');
            console.log('[enhancedPhoto] 🛡️ 기본 폴백 모드로 설정');
            systemReady = false;
            return false;
        }
        
        // 간단한 API 연결 테스트
        try {
            await openai.models.list();
            console.log('[enhancedPhoto] ✅ OpenAI API 연결 확인 완료');
        } catch (apiError) {
            console.log('[enhancedPhoto] ❌ OpenAI API 연결 실패:', apiError.message);
            systemReady = false;
            return false;
        }
        
        systemReady = true;
        console.log('[enhancedPhoto] ✅ 실시간 Vision API 시스템 초기화 완료');
        console.log('[enhancedPhoto] 💰 예상 비용: 하루 $0.02, 월 $0.6');
        console.log('[enhancedPhoto] 🎯 인물 구분: 실내=예진이, 실외=아저씨+예진이');
        
        return true;
        
    } catch (error) {
        console.log('[enhancedPhoto] ❌ 시스템 초기화 실패:', error.message);
        console.log('[enhancedPhoto] 🛡️ 기본 폴백 모드로 설정');
        systemReady = false;
        return false;
    }
}

// ================== 🎯 실시간 Vision API 분석 ==================

/**
 * 🎯 실시간 사진 분석 및 메시지 생성 (메인 함수)
 */
async function getEnhancedPhotoMessage(imageUrl, photoType = 'selfie') {
    try {
        console.log('[enhancedPhoto] 🎯 실시간 사진 분석 시작:', imageUrl);
        console.log('[enhancedPhoto] 📸 사진 타입:', photoType);
        
        // 시스템 준비 상태 확인
        if (!systemReady) {
            console.log('[enhancedPhoto] ⚠️ 시스템 미준비 - 폴백 사용');
            return getBasicFallbackResult(photoType);
        }
        
        // Vision API 프롬프트 (예진이 인물 구분 규칙 포함)
        const prompt = `
이 사진을 보고 예진이가 아저씨에게 보낼 자연스러운 메시지를 한국어로 생성해줘.

📋 인물 구분 규칙:
- 실내/침실/집 사진의 사람 = 예진이 (나)
- 실외/데이트/공원 사진의 사람 = 아저씨 또는 둘 다
- 포트레이트는 상황에 따라 판단

💕 예진이 캐릭터:
- 20대 여성, 아저씨의 연인
- 반말 사용, 애교 많음
- "아저씨~", "ㅎㅎ", "💕" 같은 표현 자주 사용
- 자연스럽고 친근한 말투

🎯 메시지 가이드라인:
- 예진이 혼자 사진: "나 어때? 예쁘지?", "셀카 찍어봤어~"
- 아저씨와 함께: "아저씨 잘 나왔네! 멋있어~", "우리 잘 어울리지?"  
- 풍경 사진: "날씨 좋아서 찍어봤어", "경치 예쁘지?"
- 길이: 1-2문장, 자연스럽고 짧게

실제 사진 내용을 보고 가장 어울리는 메시지를 생성해줘. 반드시 반말로, 예진이답게!`;

        // OpenAI Vision API 호출
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user", 
                content: [
                    { 
                        type: "text", 
                        text: prompt
                    },
                    { 
                        type: "image_url", 
                        image_url: { 
                            url: imageUrl,
                            detail: "low" // 비용 절약
                        } 
                    }
                ]
            }],
            max_tokens: 100,
            temperature: 0.8
        });

        const generatedMessage = response.choices[0].message.content.trim();
        const cost = calculateCost(response.usage);
        
        // 통계 업데이트
        totalCostToday += cost;
        totalPhotosAnalyzed++;
        
        console.log('[enhancedPhoto] ✅ Vision API 분석 완료');
        console.log('[enhancedPhoto] 💬 생성된 메시지:', generatedMessage);
        console.log('[enhancedPhoto] 💰 이번 비용:', '$' + cost.toFixed(4));
        console.log('[enhancedPhoto] 📊 오늘 총 비용:', '$' + totalCostToday.toFixed(4));
        
        return {
            success: true,
            message: generatedMessage,
            category: 'realtime_analyzed',
            method: 'realtime_vision_api',
            tokenUsage: response.usage,
            cost: cost,
            fallback: false,
            confidence: 'high'
        };
        
    } catch (error) {
        console.log('[enhancedPhoto] ❌ Vision API 오류:', error.message);
        console.log('[enhancedPhoto] 🛡️ 기존 메시지로 폴백');
        
        return getBasicFallbackResult(photoType, error.message);
    }
}

/**
 * 💰 토큰 비용 계산
 */
function calculateCost(usage) {
    if (!usage) return 0;
    
    // GPT-4o Vision 가격 (2024년 기준)
    const inputCost = (usage.prompt_tokens || 0) * 0.005 / 1000;  // $0.005 per 1K tokens
    const outputCost = (usage.completion_tokens || 0) * 0.015 / 1000; // $0.015 per 1K tokens
    
    return inputCost + outputCost;
}

// ================== 🛡️ 폴백 시스템 ==================

/**
 * 🛡️ 기본 폴백 결과 생성
 */
function getBasicFallbackResult(photoType, errorMessage = null) {
    const fallbackMessage = getBasicFallbackMessage(photoType);
    
    return {
        success: false,
        message: fallbackMessage,
        category: 'fallback',
        method: 'fallback_safe',
        fallback: true,
        error: errorMessage
    };
}

/**
 * 🛡️ 기본 폴백 메시지 (안전 장치)
 */
function getBasicFallbackMessage(photoType) {
    const fallbackMessages = {
        selfie: "나 예뻐? 방금 찍은 셀카야!",
        memory: "이 사진 어때? 추억이 많이 담겨있어~",
        concept: "오늘 컨셉 사진 찍어봤어! 어때?",
        couple: "우리 사진이야~ 잘 나왔지?"
    };
    
    return fallbackMessages[photoType] || "사진 어때? 예쁘게 나왔지? ㅎㅎ";
}

// ================== 📊 시스템 관리 함수들 ==================

/**
 * 🔧 시스템 상태 확인
 */
function getSystemStatus() {
    const costEstimate = getDailyCostEstimate();
    
    return {
        system: 'Enhanced Photo System v5.0 (Realtime Vision API)',
        mode: systemReady ? 'realtime_vision_api' : 'fallback_safe',
        apiKey: process.env.OPENAI_API_KEY ? '설정됨' : '미설정',
        status: systemReady ? 'ready' : 'fallback_mode',
        todayStats: {
            totalCost: totalCostToday,
            photosAnalyzed: totalPhotosAnalyzed,
            avgCostPerPhoto: totalPhotosAnalyzed > 0 ? (totalCostToday / totalPhotosAnalyzed) : 0
        },
        costEstimate: costEstimate,
        features: [
            '실시간 이미지 분석',
            '예진이 인물 구분 규칙 적용',
            '자연스러운 메시지 생성',
            '100% 안전한 폴백'
        ],
        lastCheck: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    };
}

/**
 * 📊 하루 예상 비용 계산
 */
function getDailyCostEstimate() {
    const dailyPhotos = 8;
    const avgTokensPerPhoto = 1000; // 추정
    const costPerPhoto = avgTokensPerPhoto * 0.005 / 1000;
    const dailyCost = dailyPhotos * costPerPhoto;
    
    return {
        photosPerDay: dailyPhotos,
        costPerPhoto: costPerPhoto,
        dailyCost: dailyCost,
        monthlyCost: dailyCost * 30,
        currency: 'USD'
    };
}

/**
 * 🧪 시스템 테스트
 */
async function testEnhancedSystem() {
    try {
        console.log('[enhancedPhoto] 🧪 실시간 Vision API 시스템 테스트 시작');
        
        // 초기화 테스트
        const initResult = await initializeEnhancedPhotoSystem();
        console.log('[enhancedPhoto] 초기화 결과:', initResult);
        
        if (!initResult) {
            console.log('[enhancedPhoto] ❌ 초기화 실패 - 폴백 모드 테스트');
            const fallbackResult = getBasicFallbackResult('selfie');
            console.log('[enhancedPhoto] 폴백 메시지:', fallbackResult.message);
            return false;
        }
        
        // 실제 테스트용 이미지 URL (간단한 테스트 이미지)
        const testUrl = "https://via.placeholder.com/300x300/FF69B4/FFFFFF?text=Test";
        
        console.log('[enhancedPhoto] 🧪 테스트 이미지로 Vision API 호출 시도...');
        const result = await getEnhancedPhotoMessage(testUrl, 'selfie');
        
        console.log('[enhancedPhoto] 🧪 테스트 결과:');
        console.log('  성공:', result.success);
        console.log('  메시지:', result.message);
        console.log('  방식:', result.method);
        console.log('  비용:', result.cost ? '$' + result.cost.toFixed(4) : '미산출');
        
        return result.success;
        
    } catch (error) {
        console.log('[enhancedPhoto] 🧪 테스트 실패:', error.message);
        return false;
    }
}

/**
 * 🔄 일일 통계 리셋
 */
function resetDailyStats() {
    totalCostToday = 0;
    totalPhotosAnalyzed = 0;
    console.log('[enhancedPhoto] 📊 일일 통계 리셋 완료');
}

// ================== 📤 모듈 내보내기 ==================

module.exports = {
    // 메인 함수 (기존 enhancedPhotoSystem 인터페이스 유지)
    getEnhancedPhotoMessage,
    initializeEnhancedPhotoSystem,
    getSystemStatus,
    testEnhancedSystem,
    
    // 추가 함수들
    getDailyCostEstimate,
    resetDailyStats,
    
    // 내부 함수들 (디버깅용)
    calculateCost,
    getBasicFallbackMessage,
    getBasicFallbackResult
};

// ================== 🚀 자동 초기화 ==================

console.log('[enhancedPhoto] 🎯 개선된 사진 시스템 v5.0 (실시간 Vision API) 로드 완료');
console.log('[enhancedPhoto] 💰 예상 비용: 하루 $0.02, 월 $0.6');
console.log('[enhancedPhoto] 🛡️ 100% 안전한 폴백 시스템 내장');
console.log('[enhancedPhoto] 🎯 인물 구분: 실내=예진이, 실외=아저씨+예진이');
