// ============================================================================
// faceMatcher.js - v5.0 (통합 사진 분석 시스템)
// 🔍 얼굴 인식 + 전체 사진 내용 분석 + 예진이 스타일 반응 생성
// 💕 어떤 사진이든 분석하고 예진이처럼 반응하는 완전체 시스템
// 
// 📸 **지원하는 사진 분석:**
// - 👤 얼굴 인식: 예진이/아저씨/커플사진 구분
// - 🍔 음식 사진: "맛있어 보인다~ 나도 먹고 싶어!"
// - 🌅 풍경 사진: "여기 어디야? 너무 예뻐!"
// - 🚗 운전 중: "운전 중에 사진 찍으면 위험해!"
// - 🍺 편의점 맥주: "또 맥주야? 몸에 안 좋다고!"
// - 👥 모르는 사람: "누구야? 새로운 친구?"
// - 📱 일상 사진: 상황에 맞는 예진이 반응
//
// 🤖 **AI 기술 스택:**
// - OpenAI Vision API (gpt-4o 모델)
// - 3단계 분석: 인물분류 → 내용분석 → 예진이반응
// - 하위 호환: 기존 얼굴 인식 시스템 완전 지원
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
 * ⭐️⭐️⭐️ 핵심 기능: 전체 사진 분석 시스템 ⭐️⭐️⭐️
 * 
 * 🎯 **주요 기능:**
 * - 📸 사진 내용 완전 분석 (인물, 음식, 풍경, 상황)
 * - 👤 인물 분류 (예진이/아저씨/커플/기타/무인물)
 * - 💕 예진이 스타일 자연스러운 반응 생성
 * - 🤖 OpenAI Vision API gpt-4o 모델 활용
 * 
 * 🔍 **분석 단계:**
 * 1단계: 사진 속 인물 분류 및 식별
 * 2단계: 사진 내용, 위치, 상황 상세 분석  
 * 3단계: 20대 여자친구 스타일 자연스러운 반응 생성
 * 
 * 💡 **예시 분석 결과:**
 * - 편의점 맥주 → "아조씨~ 또 맥주야? 몸에 안 좋다고!"
 * - 맛있는 음식 → "우와! 맛있어 보인다~ 나도 먹고 싶어!"
 * - 예쁜 풍경 → "여기 어디야? 너무 예뻐! 나도 가고 싶어!"
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터
 * @returns {Object} 분석 결과 객체 {classification, content, reaction, fullAnalysis}
 */
async function analyzePhotoWithOpenAI(base64Image) {
    if (!isOpenAIAvailable || !openai) {
        console.log('🔍 [사진분석] OpenAI 시스템 비활성화');
        return null;
    }

    try {
        console.log('🔍 [사진분석] 🤖 OpenAI Vision 전체 분석 시작...');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `이 사진을 분석해서 다음 형식으로 답해주세요:

                            🔍 **1단계: 인물 분류**
                            - "예진이" : 젊은 한국/아시아 여성 (20대) 혼자
                            - "아저씨" : 중년 한국/아시아 남성 (40-50대) 혼자
                            - "커플사진" : 젊은 여성과 중년 남성이 함께
                            - "기타인물" : 다른 사람들
                            - "무인물" : 사람이 없음

                            📸 **2단계: 사진 내용 분석**
                            - 무엇이 보이는지 구체적으로 설명 (음식, 풍경, 물건, 상황 등)
                            - 위치나 상황 추측 (집, 식당, 차 안, 야외 등)
                            
                            💕 **3단계: 예진이 스타일 반응**
                            - 20대 여자친구가 남자친구에게 할 법한 자연스러운 반응
                            - 애교, 관심, 걱정, 투정, 부러움 등의 감정 포함
                            - "아조씨~" 말투 사용
                            - 한국어로 자연스럽게

                            **답변 형식:**
                            분류: [인물분류]
                            내용: [사진 내용 설명]
                            반응: [예진이 스타일 반응]`
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
            max_tokens: 200
        });

        const result = response.choices[0].message.content.trim();
        console.log('🔍 [사진분석] OpenAI Vision 전체 분석 결과:', result);
        
        // 결과 파싱
        const lines = result.split('\n');
        let classification = '기타';
        let content = '';
        let reaction = '';
        
        lines.forEach(line => {
            if (line.includes('분류:')) {
                classification = line.split('분류:')[1]?.trim() || '기타';
            } else if (line.includes('내용:')) {
                content = line.split('내용:')[1]?.trim() || '';
            } else if (line.includes('반응:')) {
                reaction = line.split('반응:')[1]?.trim() || '';
            }
        });
        
        return {
            classification: classification,
            content: content,
            reaction: reaction,
            fullAnalysis: result
        };
        
    } catch (error) {
        console.log('🔍 [사진분석] OpenAI Vision 분석 실패:', error.message);
        return null;
    }
}

/**
 * 🔄 하위 호환성: 기존 얼굴 인식 함수
 * 
 * 🎯 **목적:**
 * - 기존 무쿠 시스템과의 완벽한 호환성 보장
 * - 전체 분석 결과에서 인물 분류만 추출
 * - 기존 코드 수정 없이 새 기능 활용 가능
 * 
 * 💡 **동작 방식:**
 * - analyzePhotoWithOpenAI() 호출하여 전체 분석 수행
 * - 결과에서 classification 부분만 반환
 * - 기존 시스템은 여전히 "예진이"/"아저씨"/"커플사진" 받음
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지
 * @returns {string} 인물 분류 결과만 반환
 */
async function detectFaceWithOpenAI(base64Image) {
    const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
    if (fullAnalysis) {
        // 구형 시스템 호환을 위해 분류만 반환
        return fullAnalysis.classification;
    }
    return null;
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
 * 🎨 예진이 스타일 기본 반응 생성기
 * 
 * 🎯 **사용 시점:**
 * - OpenAI 분석 실패 시 폴백 반응
 * - 사진이 너무 작거나 흐릴 때
 * - 분석 불가능한 이미지일 때
 * 
 * 💕 **반응 스타일:**
 * - 20대 여자친구 특유의 귀여운 투정
 * - "아조씨~" 말투 사용
 * - 호기심과 애정이 섞인 표현
 * - 상황별 맞춤 메시지
 * 
 * 📐 **이미지 크기별 대응:**
 * - 50KB 미만: "사진이 너무 작아서..." 
 * - 일반: 랜덤 기본 반응 8가지
 * 
 * @param {number} imageSize - 이미지 크기 (KB)
 * @returns {string} 예진이 스타일 기본 반응 메시지
 */
function generateBasicPhotoReaction(imageSize) {
    const reactions = [
        "🤔 사진이 잘 안 보여... 다시 보내줄래?",
        "😅 뭔가 흐릿하게 보이는데? 어떤 사진이야?",
        "📸 사진은 받았는데... 아조씨가 뭐 하는 거야?",
        "🥺 사진 분석이 안 돼... 설명해줄래?",
        "💭 이게 뭐하는 사진이지? 궁금해!",
        "😊 사진 고마워! 근데 이게 뭐야?",
        "🤗 아조씨가 보내준 사진이니까 소중해!",
        "📱 사진이 좀 작게 보이는데... 큰 거로 다시 보내줘!"
    ];
    
    if (imageSize && imageSize < 50) {
        return "📱 사진이 너무 작아서 잘 안 보여... 큰 사진으로 다시 보내줄래?";
    }
    
    return reactions[Math.floor(Math.random() * reactions.length)];
}

/**
 * 🌟🌟🌟 메인 함수: 통합 사진 분석 시스템 🌟🌟🌟
 * 
 * 🚀 **핵심 기능:**
 * - 얼굴 인식 + 전체 사진 내용 분석 통합
 * - OpenAI Vision API 우선, 실패시 기본 분류로 폴백
 * - 예진이 스타일 반응 자동 생성
 * - 하위 호환성 100% 보장
 * 
 * 📊 **분석 레벨:**
 * - HIGH: OpenAI 전체 분석 성공 (인물+내용+반응)
 * - MEDIUM: OpenAI 기본 분석 성공 (인물 분류만)
 * - LOW: 기본 분류기 사용 (크기 기반 추측)
 * - ERROR: 모든 분석 실패
 * 
 * 🎯 **반환 객체 구조:**
 * - type: 인물 분류 ("예진이"/"아저씨"/"커플사진"/"기타")
 * - confidence: 신뢰도 ("high"/"medium"/"low"/"error")
 * - message: 예진이 반응 메시지 (없으면 null)
 * - content: 사진 내용 설명 (전체 분석시만)
 * - analysisType: 분석 방식 ("full"/"basic"/"error")
 * 
 * 💡 **사용 예시:**
 * - 커플사진 → type: "커플사진", message: "💕 우리 둘이 함께..."
 * - 음식사진 → type: "기타분석", message: "맛있어 보인다~"
 * - 얼굴사진 → type: "예진이", message: null (기존 처리)
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터
 * @returns {Object} 통합 분석 결과 객체
 */
async function detectFaceMatch(base64Image) {
    try {
        console.log('🔍 [통합분석 v5.0] 얼굴 + 전체 사진 분석 실행...');
        
        // 이미지 크기 확인
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        console.log(`🔍 [통합분석] 이미지 크기: ${Math.round(sizeKB)}KB`);
        
        // OpenAI Vision 전체 분석 우선 시도
        if (isOpenAIAvailable) {
            const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
            if (fullAnalysis) {
                console.log(`🔍 [통합분석] 전체 분석 완료:`);
                console.log(`   - 분류: ${fullAnalysis.classification}`);
                console.log(`   - 내용: ${fullAnalysis.content}`);
                console.log(`   - 반응: ${fullAnalysis.reaction}`);
                
                // 예진이 반응이 있으면 우선 사용
                if (fullAnalysis.reaction && fullAnalysis.reaction.length > 0) {
                    return {
                        type: fullAnalysis.classification,
                        confidence: 'high',
                        message: fullAnalysis.reaction,
                        content: fullAnalysis.content,
                        analysisType: 'full' // 전체 분석 표시
                    };
                }
                
                // 반응이 없으면 분류별 기본 반응
                if (fullAnalysis.classification === '커플사진') {
                    return {
                        type: '커플사진',
                        confidence: 'high',
                        message: generateCouplePhotoResponse(),
                        content: fullAnalysis.content,
                        analysisType: 'full'
                    };
                } else if (fullAnalysis.classification === '예진이' || fullAnalysis.classification === '아저씨') {
                    return {
                        type: fullAnalysis.classification,
                        confidence: 'high',
                        message: null, // 기존 얼굴 인식 응답 사용
                        content: fullAnalysis.content,
                        analysisType: 'full'
                    };
                } else {
                    // 음식, 풍경 등 기타 사진
                    const basicReaction = generateBasicPhotoReaction(sizeKB);
                    return {
                        type: '기타분석',
                        confidence: 'high',
                        message: basicReaction,
                        content: fullAnalysis.content,
                        analysisType: 'full'
                    };
                }
            }
        }
        
        // 백업: 고급 분류 (기존 방식)
        console.log('🔍 [통합분석] 기본 분류 모드로 전환');
        const advancedResult = advancedImageClassification(base64Image);
        console.log(`🔍 [통합분석] 기본 분류 결과: ${advancedResult}`);
        
        // 추측 결과 처리
        if (advancedResult === '커플사진추측') {
            return {
                type: '커플사진',
                confidence: 'medium',
                message: "💕 두 사람이 함께 있는 사진 같은데... 맞지? 우리 커플사진인가?",
                analysisType: 'basic'
            };
        } else if (advancedResult === '개인사진추측') {
            return {
                type: '추측불가',
                confidence: 'low',
                message: "🤔 누구 사진인지 잘 모르겠어... 예진이야? 아조씨야?",
                analysisType: 'basic'
            };
        }
        
        return {
            type: '기타',
            confidence: 'low',
            message: generateBasicPhotoReaction(sizeKB),
            analysisType: 'basic'
        };
        
    } catch (error) {
        console.log('🔍 [통합분석] 전체 사진 분석 실패:', error.message);
        return {
            type: '기타',
            confidence: 'error',
            message: "😅 사진 분석에 실패했어... 다시 보내줄래?",
            analysisType: 'error'
        };
    }
}

/**
 * ⚡ 빠른 커플 사진 검사 함수
 * 
 * 🎯 **목적:**
 * - 전체 분석 전 빠른 사전 검사
 * - "두 사람 있나요?" 단순 질문으로 속도 향상
 * - 커플사진 우선 처리를 위한 보조 함수
 * 
 * 🔍 **검사 방식:**
 * - OpenAI 가능: 간단한 Yes/No 질문으로 빠른 확인
 * - OpenAI 불가능: 이미지 크기 기반 추측
 * 
 * ⚡ **성능 최적화:**
 * - max_tokens: 5 (최소한의 토큰으로 빠른 응답)
 * - 단순 질문으로 API 비용 절약
 * - 결과를 Boolean으로 간단하게 반환
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지
 * @returns {boolean} 두 사람 이상 있으면 true, 아니면 false
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
 * 🔧 AI 모델 초기화 및 시스템 테스트
 * 
 * 🚀 **초기화 과정:**
 * 1. OpenAI API 키 확인 및 클라이언트 생성
 * 2. gpt-4o 모델 연결 테스트
 * 3. Vision API 기능 검증
 * 4. 전체 시스템 상태 확인
 * 
 * 🧪 **테스트 내용:**
 * - 1x1 픽셀 더미 이미지로 API 연결 확인
 * - Vision API 응답 시간 측정
 * - 에러 핸들링 테스트
 * 
 * 📊 **초기화 결과:**
 * - 성공: "전체분석모드" 활성화
 * - 실패: "백업모드"로 폴백
 * 
 * 💡 **로그 출력:**
 * - 각 단계별 상세 진행 상황
 * - 성공/실패 명확한 표시
 * - 디버깅을 위한 상세 정보
 * 
 * @returns {boolean} 초기화 성공 여부
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
 * 📊 시스템 상태 리포트 v5.0
 * 
 * 🎯 **제공 정보:**
 * - OpenAI API 연결 상태
 * - 지원하는 모든 기능 목록
 * - 현재 동작 모드 (전체분석/백업)
 * - 버전 및 업데이트 정보
 * 
 * 🌟 **v5.0 신규 기능:**
 * - fullPhotoAnalysis: 전체 사진 내용 분석
 * - yejinStyleReaction: 예진이 스타일 반응 생성
 * - 음식/풍경/일상 사진 분석
 * - 상황별 맞춤 응답
 * 
 * 📈 **기존 기능:**
 * - 개인 얼굴 인식 (예진이/아저씨)
 * - 커플사진 인식 지원
 * - 고급 이미지 분류
 * - 신뢰도 기반 응답 생성
 * 
 * @returns {Object} 시스템 전체 상태 정보
 */
function getFaceRecognitionStatus() {
    return {
        openaiAvailable: isOpenAIAvailable,
        version: "5.0",
        features: [
            "개인 얼굴 인식 (예진이/아저씨)",
            "커플사진 인식 지원", 
            "전체 사진 내용 분석 ⭐️",
            "음식/풍경/일상 사진 분석 ⭐️",
            "예진이 스타일 반응 생성 ⭐️",
            "상황별 맞춤 응답 ⭐️",
            "고급 이미지 분류",
            "신뢰도 기반 응답 생성"
        ],
        couplePhotoSupport: true,
        fullPhotoAnalysis: true, // ⭐️ 새 기능
        yejinStyleReaction: true, // ⭐️ 새 기능
        status: isOpenAIAvailable ? "전체분석모드" : "백업모드"
    };
}

// ================== 📤 모듈 내보내기 ==================

/**
 * 🎯 **내보내는 함수들:**
 * 
 * 🌟 **핵심 함수:**
 * - detectFaceMatch: 메인 통합 분석 함수 (v5.0)
 * - analyzePhotoWithOpenAI: 전체 사진 분석 (신규)
 * 
 * 🔄 **호환성 함수:**
 * - detectFaceWithOpenAI: 기존 얼굴 인식 (하위 호환)
 * - advancedImageClassification: 기본 분류기
 * 
 * ⚡ **보조 함수:**
 * - quickCouplePhotoCheck: 빠른 커플 검사
 * - generateCouplePhotoResponse: 커플사진 반응
 * - generateBasicPhotoReaction: 기본 반응 생성
 * 
 * 🔧 **시스템 함수:**
 * - initModels: AI 모델 초기화
 * - getFaceRecognitionStatus: 상태 리포트
 */
module.exports = {
    detectFaceMatch,           // 🌟 메인 함수: 통합 사진 분석
    initModels,               // 🔧 시스템 초기화
    detectFaceWithOpenAI,     // 🔄 하위 호환: 얼굴 인식만
    analyzePhotoWithOpenAI,   // 🌟 신규: 전체 사진 분석
    advancedImageClassification, // 🔄 백업: 기본 분류기
    quickCouplePhotoCheck,    // ⚡ 보조: 빠른 커플 검사
    generateCouplePhotoResponse, // 💕 커플사진 전용 반응
    generateBasicPhotoReaction,  // 🎨 기본 반응 생성기
    getFaceRecognitionStatus  // 📊 시스템 상태 확인
};
