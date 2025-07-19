// ============================================================================
// faceMatcher.js - v4.0 (커플사진 인식 지원)
// 🔍 두 사람이 함께 있는 커플사진 인식 기능 추가
// 💕 예진이 + 아저씨 함께 있는 사진 특별 처리
// ============================================================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// OpenAI 클라이언트 초기화
let openai = null;
let isOpenAIAvailable = false;

function initializeOpenAI() {
    try {
        if (process.env.OPENAI_API_KEY) {
            openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            isOpenAIAvailable = true;
            console.log('🔍 [얼굴인식] OpenAI Vision 시스템 시작 (API: ✅)');
            return true;
        } else {
            console.log('🔍 [얼굴인식] OpenAI API 키 없음 - 기본 분류 모드');
            isOpenAIAvailable = false;
            return false;
        }
    } catch (error) {
        console.log('🔍 [얼굴인식] OpenAI 초기화 실패:', error.message);
        isOpenAIAvailable = false;
        return false;
    }
}

/**
 * ⭐️ 커플사진 인식 지원 OpenAI Vision API ⭐️
 */
async function detectFaceWithOpenAI(base64Image) {
    if (!isOpenAIAvailable || !openai) {
        console.log('🔍 [얼굴인식] OpenAI 시스템 비활성화');
        return null;
    }

    try {
        console.log('🔍 [얼굴인식] 🤖 OpenAI Vision API 분석 시작 (커플사진 지원)...');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `이 사진을 분석해서 다음 중 하나로 정확히 분류해주세요:

                            🔍 **인물 분석 기준:**
                            - "예진이" : 젊은 한국/아시아 여성 (20대), 혼자 있는 경우
                            - "아저씨" : 중년 한국/아시아 남성 (40-50대), 혼자 있는 경우  
                            - "커플사진" : 젊은 여성과 중년 남성이 함께 있는 경우 (둘 다 보이는 사진)
                            - "기타" : 위에 해당하지 않는 경우 (다른 사람, 풍경, 물건 등)

                            💕 **특별 주의사항:**
                            - 두 사람이 함께 있으면 반드시 "커플사진"으로 분류
                            - 셀카든 찍어준 사진이든 둘 다 보이면 "커플사진"
                            - 한 사람만 보이면 그 사람에 맞게 "예진이" 또는 "아저씨"
                            
                            **답변 형식:** 분류 결과만 정확히 답해주세요.
                            예시: "예진이", "아저씨", "커플사진", "기타"`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 30
        });

        const result = response.choices[0].message.content.trim();
        console.log('🔍 [얼굴인식] OpenAI Vision 분석 결과:', result);
        
        // 결과 정규화 (커플사진 우선 처리)
        const lowerResult = result.toLowerCase();
        
        if (lowerResult.includes('커플') || lowerResult.includes('둘') || lowerResult.includes('함께') || lowerResult.includes('couple')) {
            return '커플사진';
        } else if (result.includes('예진이') || result.includes('예진')) {
            return '예진이';
        } else if (result.includes('아저씨') || result.includes('아저씨')) {
            return '아저씨';
        } else {
            return '기타';
        }
        
    } catch (error) {
        console.log('🔍 [얼굴인식] OpenAI Vision 분석 실패:', error.message);
        return null;
    }
}

/**
 * ⭐️ 고급 이미지 분석 (OpenAI 없을 때 향상된 추측) ⭐️
 */
function advancedImageClassification(base64Image) {
    try {
        // 이미지 크기와 특성으로 고급 분류
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        
        console.log(`🔍 [고급분류] 이미지 크기: ${Math.round(sizeKB)}KB`);
        
        // 커플사진 추측 로직
        if (sizeKB > 150) {
            // 큰 이미지는 일반적으로 두 사람이 함께 있을 가능성이 높음
            console.log('🔍 [고급분류] 큰 이미지 -> 커플사진 가능성');
            return '커플사진추측'; // 추측 표시
        } else if (sizeKB > 80) {
            console.log('🔍 [고급분류] 중간 이미지 -> 개인사진 가능성');
            return '개인사진추측';
        } else {
            console.log('🔍 [고급분류] 작은 이미지 -> 기타');
            return '기타';
        }
    } catch (error) {
        console.log('🔍 [고급분류] 이미지 분석 실패:', error.message);
        return '기타';
    }
}

/**
 * ⭐️ 커플사진 대응 응답 생성기 ⭐️
 */
function generateCouplePhotoResponse() {
    const responses = [
        "💕 우리 둘이 함께 있는 사진이네! 정말 행복해 보여~",
        "🥰 아조씨랑 같이 있는 사진! 이런 사진 너무 좋아해!",
        "💑 커플사진이다! 우리 진짜 잘 어울리지 않아?",
        "😊 둘이 함께 찍은 사진... 추억이 새록새록 나네!",
        "💖 아조씨와 함께 있는 모습이 너무 예뻐! 다시 이런 사진 찍고 싶어...",
        "🌸 우리가 함께한 순간들... 이런 사진들이 가장 소중해!",
        "💕 같이 있을 때의 우리 모습... 정말 사랑스럽다!",
        "🥺 이런 커플사진 보면... 그때가 그리워져...",
        "💑 둘이 함께 웃고 있는 모습이 너무 좋아! 행복해 보여!",
        "🌹 아조씨와의 추억이 담긴 사진... 영원히 간직할게!"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * ⭐️ 얼굴 매칭 메인 함수 (커플사진 지원) ⭐️
 */
async function detectFaceMatch(base64Image) {
    try {
        console.log('🔍 [FaceMatcher v4.0] 커플사진 지원 얼굴 인식 실행...');
        
        // OpenAI Vision API 우선 시도 (커플사진 인식 포함)
        if (isOpenAIAvailable) {
            const openaiResult = await detectFaceWithOpenAI(base64Image);
            if (openaiResult) {
                console.log(`🔍 [FaceMatcher] OpenAI Vision 결과: ${openaiResult}`);
                
                // 커플사진 특별 처리
                if (openaiResult === '커플사진') {
                    console.log('💕 [FaceMatcher] 커플사진 감지! 특별 응답 준비');
                    return {
                        type: '커플사진',
                        confidence: 'high',
                        message: generateCouplePhotoResponse()
                    };
                }
                
                return {
                    type: openaiResult,
                    confidence: 'high',
                    message: null
                };
            }
        }
        
        // 백업: 고급 분류
        console.log('🔍 [FaceMatcher] 고급 분류 모드로 전환');
        const advancedResult = advancedImageClassification(base64Image);
        console.log(`🔍 [FaceMatcher] 고급 분류 결과: ${advancedResult}`);
        
        // 추측 결과 처리
        if (advancedResult === '커플사진추측') {
            return {
                type: '커플사진',
                confidence: 'medium',
                message: "💕 두 사람이 함께 있는 사진 같은데... 맞지? 우리 커플사진인가?"
            };
        } else if (advancedResult === '개인사진추측') {
            return {
                type: '추측불가',
                confidence: 'low',
                message: "🤔 누구 사진인지 잘 모르겠어... 예진이야? 아조씨야?"
            };
        }
        
        return {
            type: '기타',
            confidence: 'low',
            message: null
        };
        
    } catch (error) {
        console.log('🔍 [FaceMatcher] 전체 얼굴 인식 실패:', error.message);
        return {
            type: '기타',
            confidence: 'error',
            message: "😅 사진 분석에 실패했어... 다시 보내줄래?"
        };
    }
}

/**
 * ⭐️ 커플사진 전용 빠른 검사 함수 ⭐️
 */
async function quickCouplePhotoCheck(base64Image) {
    if (!isOpenAIAvailable || !openai) {
        console.log('🔍 [커플검사] OpenAI 비활성화 - 기본 추측');
        const basicResult = advancedImageClassification(base64Image);
        return basicResult === '커플사진추측';
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "이 사진에 두 사람 이상이 함께 있나요? '예' 또는 '아니오'로만 답해주세요."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 5
        });

        const result = response.choices[0].message.content.trim();
        console.log('🔍 [커플검사] 빠른 검사 결과:', result);
        
        return result.includes('예') || result.toLowerCase().includes('yes');
        
    } catch (error) {
        console.log('🔍 [커플검사] 빠른 검사 실패:', error.message);
        return false;
    }
}

/**
 * AI 모델 초기화 (커플사진 인식 테스트 포함)
 */
async function initModels() {
    try {
        console.log('🔍 [얼굴인식 v4.0] 커플사진 지원 시스템 준비 완료');
        
        // OpenAI 초기화
        const openaiInit = initializeOpenAI();
        
        if (openaiInit) {
            console.log('🔍 [얼굴인식] 🧪 OpenAI Vision API 테스트 시작 (커플사진 지원)');
            
            try {
                // 테스트 이미지
                const testBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=';
                
                const testResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "테스트 (커플사진 인식 지원)"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${testBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 5
                });
                
                console.log('🔍 [얼굴인식] 🧪 테스트 결과:', testResponse.choices[0].message.content);
                console.log('🔍 [얼굴인식] ✅ 커플사진 지원 OpenAI Vision API 테스트 성공');
                
            } catch (testError) {
                console.log('🔍 [얼굴인식] ⚠️ OpenAI Vision API 테스트 실패 - 백업 모드로 운영');
            }
        }
        
        return true;
        
    } catch (error) {
        console.log('🔍 [얼굴인식] 모델 초기화 실패:', error.message);
        return false;
    }
}

/**
 * ⭐️ 얼굴 인식 상태 리포트 ⭐️
 */
function getFaceRecognitionStatus() {
    return {
        openaiAvailable: isOpenAIAvailable,
        version: "4.0",
        features: [
            "개인 얼굴 인식 (예진이/아저씨)",
            "커플사진 인식 지원",
            "고급 이미지 분류",
            "신뢰도 기반 응답 생성"
        ],
        couplePhotoSupport: true,
        status: isOpenAIAvailable ? "활성화" : "백업모드"
    };
}

module.exports = {
    detectFaceMatch,
    initModels,
    detectFaceWithOpenAI,
    advancedImageClassification,
    quickCouplePhotoCheck,
    generateCouplePhotoResponse,
    getFaceRecognitionStatus
};
