// ============================================================================
// faceMatcher.js - v3.1 (OpenAI Vision API 모델 수정)
// 🔍 gpt-4-vision-preview → gpt-4o 모델 변경으로 deprecated 오류 해결
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
 * OpenAI Vision API를 사용한 얼굴 인식 (모델 수정)
 */
async function detectFaceWithOpenAI(base64Image) {
    if (!isOpenAIAvailable || !openai) {
        console.log('🔍 [얼굴인식] OpenAI 시스템 비활성화');
        return null;
    }

    try {
        console.log('🔍 [얼굴인식] 🤖 OpenAI Vision API 분석 시작...');
        
        // ⭐️ 모델 변경: gpt-4-vision-preview → gpt-4o ⭐️
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // ← 수정된 모델명
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `이 사진을 분석해서 다음 중 하나로 분류해주세요:
                            1. "예진이" - 젊은 한국/아시아 여성 (20대)
                            2. "아저씨" - 중년 한국/아시아 남성 (40-50대)
                            3. "기타" - 위에 해당하지 않는 경우
                            
                            단순히 분류 결과만 답해주세요. 예: "예진이", "아저씨", "기타"`
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
            max_tokens: 20
        });

        const result = response.choices[0].message.content.trim();
        console.log('🔍 [얼굴인식] OpenAI Vision 분석 결과:', result);
        
        // 결과 정규화
        if (result.includes('예진이') || result.includes('예진')) {
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
 * 기본 이미지 분류 (OpenAI 없을 때)
 */
function simpleImageClassification(base64Image) {
    try {
        // 이미지 크기로 간단 분류
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        
        console.log(`🔍 [기본분류] 이미지 크기: ${Math.round(sizeKB)}KB`);
        
        // 크기 기반 추측 (매우 기본적)
        if (sizeKB > 100) {
            return '사진'; // 큰 이미지는 일반적으로 사진
        } else {
            return '기타'; // 작은 이미지는 스크린샷 등
        }
    } catch (error) {
        console.log('🔍 [기본분류] 이미지 분석 실패:', error.message);
        return '기타';
    }
}

/**
 * 얼굴 매칭 메인 함수
 */
async function detectFaceMatch(base64Image) {
    try {
        console.log('🔍 [FaceMatcher] 얼굴 인식 실행 중...');
        
        // OpenAI Vision API 우선 시도
        if (isOpenAIAvailable) {
            const openaiResult = await detectFaceWithOpenAI(base64Image);
            if (openaiResult) {
                console.log(`🔍 [FaceMatcher] OpenAI Vision 결과: ${openaiResult}`);
                return openaiResult;
            }
        }
        
        // 백업: 기본 분류
        console.log('🔍 [FaceMatcher] 기본 분류 모드로 전환');
        const basicResult = simpleImageClassification(base64Image);
        console.log(`🔍 [FaceMatcher] 기본 분류 결과: ${basicResult}`);
        
        return basicResult;
        
    } catch (error) {
        console.log('🔍 [FaceMatcher] 전체 얼굴 인식 실패:', error.message);
        return '기타';
    }
}

/**
 * AI 모델 초기화 (OpenAI 연결 테스트 포함)
 */
async function initModels() {
    try {
        console.log('🔍 [얼굴인식] OpenAI Vision 시스템 준비 완료 (API: 활성화)');
        
        // OpenAI 초기화
        const openaiInit = initializeOpenAI();
        
        if (openaiInit) {
            // ⭐️ OpenAI Vision API 테스트 (간단한 테스트) ⭐️
            console.log('🔍 [얼굴인식] 🧪 OpenAI Vision API 테스트 시작');
            
            try {
                // 작은 테스트 이미지 (1x1 픽셀)
                const testBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=';
                
                const testResponse = await openai.chat.completions.create({
                    model: "gpt-4o", // ← 수정된 모델명
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "테스트"
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
                console.log('🔍 [얼굴인식] ✅ OpenAI Vision API 테스트 성공');
                
            } catch (testError) {
                console.log('🔍 [얼굴인식] 🧪 테스트 결과:', null);
                console.log('🔍 [얼굴인식] ⚠️ OpenAI Vision API 테스트 실패 - 백업 모드로 운영');
            }
        }
        
        return true;
        
    } catch (error) {
        console.log('🔍 [얼굴인식] 모델 초기화 실패:', error.message);
        return false;
    }
}

module.exports = {
    detectFaceMatch,
    initModels,
    detectFaceWithOpenAI,
    simpleImageClassification
};
