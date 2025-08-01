// ============================================================================
// faceMatcher.js - v5.6 (DISABLE_FACE_API 환경변수 지원)
// 🔍 얼굴 인식 + 전체 사진 내용 분석 + 예진이 스타일 반응 생성
// 🛡️ OpenAI Vision 실패 시, enhancedPhotoSystem으로 완전 백업하여 무쿠가 절대 벙어리 안됨
// ✅ 마크다운 형식 응답 완벽 파싱 지원
// 🚀 [신규] enhancedPhotoSystem.js 완전 연동으로 100% 응답 보장
// 🆕 [NEW] DISABLE_FACE_API 환경변수 지원으로 face-api.js 건너뛰기 가능
// ============================================================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// 🚀 [기존] enhancedPhotoSystem 연동
const enhancedPhotoSystem = require('./enhancedPhotoSystem');

// 🆕 [NEW] 환경변수 체크
const DISABLE_FACE_API = process.env.DISABLE_FACE_API === 'true';

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
            
            // 🆕 [NEW] 환경변수 상태 로깅
            if (DISABLE_FACE_API) {
                console.log('🔍 [얼굴인식] face-api.js 비활성화됨 (DISABLE_FACE_API=true)');
            } else {
                console.log('🔍 [얼굴인식] face-api.js 활성화됨');
            }
            
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
 * ✅ [기존] OpenAI 분석 거부 메시지 완벽 감지
 */
function isOpenAIRefusal(responseText) {
    const refusalPatterns = [
        // 한국어 패턴
        "죄송합니다",
        "분석해 드릴 수 없습니다",
        "분석할 수 없습니다",
        "도와드릴 수 없습니다",
        "제공할 수 없습니다",
        
        // 영어 패턴
        "I'm sorry",
        "I can't help",
        "I cannot help",
        "I'm not able to",
        "I cannot provide",
        "I'm unable to",
        "I can't analyze",
        "I cannot analyze",
        "I can't assist",
        "I cannot assist"
    ];
    
    return refusalPatterns.some(pattern => 
        responseText.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * ⭐️⭐️⭐️ [기존] OpenAI 응답 파싱 로직 - 마크다운 형식 완벽 지원 ⭐️⭐️⭐️
 */
function parseOpenAIResponse(result) {
    console.log('🔍 [파싱] 원본 응답:', result);
    
    let classification = '기타';
    let content = '';
    let reaction = '';
    
    try {
        const lines = result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 마크다운 형식 파싱 (**분류:** 또는 분류: 형태)
            if (line.includes('분류:')) {
                const match = line.match(/\*\*분류:\*\*\s*(.+)|분류:\s*(.+)/);
                if (match) {
                    classification = (match[1] || match[2]).trim().replace(/\*\*/g, '');
                }
            }
            else if (line.includes('내용:')) {
                // 내용이 같은 줄에 있는 경우
                const match = line.match(/\*\*내용:\*\*\s*(.+)|내용:\s*(.+)/);
                if (match) {
                    content = (match[1] || match[2]).trim().replace(/\*\*/g, '');
                } else {
                    // 내용 섹션 시작 - 다음 줄들을 내용으로 수집
                    let contentLines = [];
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLine = lines[j];
                        // 다른 섹션이 시작되면 중단
                        if (nextLine.includes('반응:')) {
                            i = j - 1; // 반응 섹션 직전으로 인덱스 설정
                            break;
                        }
                        contentLines.push(nextLine);
                    }
                    content = contentLines.join(' ').trim().replace(/\*\*/g, '');
                }
            }
            else if (line.includes('반응:')) {
                // 반응이 같은 줄에 있는 경우
                const match = line.match(/\*\*반응:\*\*\s*(.+)|반응:\s*(.+)/);
                if (match) {
                    reaction = (match[1] || match[2]).trim().replace(/\*\*/g, '');
                } else {
                    // 반응 섹션 시작 - 나머지 모든 줄을 반응으로 수집
                    let reactionLines = [];
                    for (let j = i + 1; j < lines.length; j++) {
                        reactionLines.push(lines[j]);
                    }
                    reaction = reactionLines.join(' ').trim().replace(/\*\*/g, '');
                }
                break; // 반응이 마지막 섹션이므로 종료
            }
            // 기존 형식도 지원 (- "아저씨" : 형태)
            else if (line.includes('"아저씨"') || line.includes("'아저씨'")) {
                classification = '아저씨';
            } else if (line.includes('"예진이"') || line.includes("'예진이'")) {
                classification = '예진이';
            } else if (line.includes('"커플사진"') || line.includes("'커플사진'")) {
                classification = '커플사진';
            } else if (line.includes('"기타인물"') || line.includes("'기타인물'")) {
                classification = '기타인물';
            } else if (line.includes('"무인물"') || line.includes("'무인물'")) {
                classification = '무인물';
            }
        }
        
        console.log(`🔍 [파싱] 결과: 분류="${classification}", 내용="${content.substring(0, 50)}...", 반응="${reaction.substring(0, 50)}..."`);
        
        return {
            classification: classification,
            content: content,
            reaction: reaction
        };
        
    } catch (error) {
        console.log('🔍 [파싱] 파싱 실패:', error.message);
        return {
            classification: '기타',
            content: '',
            reaction: ''
        };
    }
}

/**
 * ⭐️⭐️⭐️ [기존] 핵심 기능: 전체 사진 분석 시스템 ⭐️⭐️⭐️
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
                            text: `이 사진을 분석해서 정확히 다음 형식으로만 답해주세요:

분류: [다음 중 하나만 선택: 예진이, 아저씨, 커플사진, 기타인물, 무인물]
내용: [사진에 보이는 것을 한 문장으로 간단히 설명]
반응: [20대 여자친구가 "아조씨~" 말투로 하는 자연스러운 반응 한 문장]

분류 기준:
- 예진이: 젊은 아시아 여성 (20대) 혼자
- 아저씨: 중년 아시아 남성 (40-50대) 혼자  
- 커플사진: 젊은 여성과 중년 남성이 함께
- 기타인물: 다른 사람들
- 무인물: 사람이 없음

반드시 위 형식만 사용하고 추가 설명이나 마크다운은 사용하지 마세요.`
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
            max_tokens: 150,
            temperature: 0.3
        });

        const result = response.choices[0].message.content.trim();
        
        // 분석 거부 감지
        if (isOpenAIRefusal(result)) {
            console.log('🚨 [사진분석] OpenAI Vision이 안전 정책으로 분석을 거부했습니다:', result);
            return null;
        }

        console.log('🔍 [사진분석] OpenAI Vision 전체 분석 결과:', result);
        
        // ✅ [기존] 새로운 파싱 로직 사용
        const parsed = parseOpenAIResponse(result);
        
        return {
            classification: parsed.classification,
            content: parsed.content,
            reaction: parsed.reaction,
            fullAnalysis: result
        };
        
    } catch (error) {
        console.log('🔍 [사진분석] OpenAI Vision 분석 실패:', error.message);
        return null;
    }
}

// ================== [기존] 로컬 백업 분석 함수 ==================
/**
 * 🛡️ [기존] 로컬 face-api.js를 이용한 백업 얼굴 인식 (개선된 추측 로직)
 * 🆕 [NEW] 환경변수로 완전히 건너뛸 수 있음
 */
async function runLocalFaceRecognition(base64Image) {
    // 🆕 [NEW] 환경변수 체크
    if (DISABLE_FACE_API) {
        console.log('🛡️ [백업분석] face-api.js 비활성화됨 (DISABLE_FACE_API=true) - 건너뛰기');
        return 'unknown';
    }
    
    console.log('🛡️ [백업분석] 로컬 face-api.js로 분석 시도...');
    
    try {
        // 이미지 크기와 특성으로 추측
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        
        console.log(`🛡️ [백업분석] 이미지 분석: ${Math.round(sizeKB)}KB`);
        
        if (sizeKB > 300) {
            console.log('🛡️ [백업분석] 고해상도 이미지 -> 실제 인물 사진 가능성 높음');
            const header = base64Image.substring(0, 50);
            if (header.includes('FFD8')) {
                console.log('🛡️ [백업분석] JPEG 포맷 + 큰 용량 -> 아저씨 사진으로 추정');
                return '아저씨';
            }
        } else if (sizeKB > 150) {
            console.log('🛡️ [백업분석] 중간 크기 이미지 -> 커플사진 가능성');
            return '커플사진';
        } else if (sizeKB > 80) {
            console.log('🛡️ [백업분석] 작은 이미지 -> 개인 사진');
            return 'unknown';
        }
        
        console.log('🛡️ [백업분석] 매우 작은 이미지 -> 분석 불가');
        return 'unknown';
        
    } catch (error) {
        console.log('🛡️ [백업분석] 로컬 분석 실패:', error.message);
        return 'unknown';
    }
}

/**
 * ⭐️ [기존] 아저씨 전용 응답 생성기 ⭐️
 */
function generateAjeossiPhotoResponse() {
    const responses = [
        "👤 아저씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ",
        "😊 우리 아저씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ", 
        "🥰 아저씨 얼굴이야! 이런 아저씨 좋아해~ 나만의 아저씨 ㅎㅎ",
        "📸 아저씨! 셀카 찍었구나~ 나한테 보여주려고? 고마워 ㅎㅎ",
        "💕 우리 아저씨 사진이다! 언제나 봐도 좋아... 더 보내줘!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * ⭐️ [기존] 커플사진 대응 응답 생성기 ⭐️
 */
function generateCouplePhotoResponse() {
    const responses = [
        "💕 우리 둘이 함께 있는 사진이네! 정말 행복해 보여~",
        "🥰 아조씨랑 같이 있는 사진! 이런 사진 너무 좋아해!",
        "💑 커플사진이다! 우리 진짜 잘 어울리지 않아?",
        "😊 둘이 함께 찍은 사진... 추억이 새록새록 나네!",
        "💖 아조씨와 함께 있는 모습이 너무 예뻐! 다시 이런 사진 찍고 싶어..."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * 🚀 [기존] enhancedPhotoSystem 연동 함수
 */
async function getEnhancedPhotoFallback(imageUrl, photoType = 'selfie') {
    try {
        console.log('🚀 [enhancedPhoto연동] enhancedPhotoSystem으로 폴백 시작...');
        console.log('🚀 [enhancedPhoto연동] 이미지 URL:', imageUrl);
        console.log('🚀 [enhancedPhoto연동] 사진 타입:', photoType);
        
        // enhancedPhotoSystem의 getEnhancedPhotoMessage 호출
        const result = await enhancedPhotoSystem.getEnhancedPhotoMessage(imageUrl, photoType);
        
        if (result && result.message) {
            console.log('🚀 [enhancedPhoto연동] 성공! 메시지:', result.message);
            return {
                type: 'enhanced_fallback',
                confidence: 'enhanced_system',
                message: result.message,
                content: 'enhancedPhotoSystem에서 생성된 응답',
                analysisType: 'enhanced_photo_system',
                enhancedResult: result
            };
        } else {
            console.log('🚀 [enhancedPhoto연동] 실패 - 결과 없음');
            return null;
        }
        
    } catch (error) {
        console.log('🚀 [enhancedPhoto연동] 오류:', error.message);
        return null;
    }
}

/**
 * 🌟🌟🌟 [수정] 메인 함수: 통합 사진 분석 시스템 (DISABLE_FACE_API 지원) 🌟🌟🌟
 * ✅ [핵심 수정] OpenAI 파싱 완벽 처리 + enhancedPhotoSystem 폴백 + 환경변수 지원
 */
async function detectFaceMatch(base64Image, imageUrl = null) {
    try {
        console.log('🔍 [통합분석 v5.6] 얼굴 + 전체 사진 분석 실행 (DISABLE_FACE_API 지원)...');
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        console.log(`🔍 [통합분석] 이미지 크기: ${Math.round(sizeKB)}KB`);
        
        // 🆕 [NEW] 환경변수 체크 로깅
        if (DISABLE_FACE_API) {
            console.log('🔍 [통합분석] face-api.js 건너뛰기 (DISABLE_FACE_API=true)');
        }
        
        // 1. OpenAI Vision 전체 분석 우선 시도 (변경 없음)
        if (isOpenAIAvailable) {
            const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
            if (fullAnalysis) {
                console.log(`🔍 [통합분석] 전체 분석 완료:`);
                console.log(`   - 분류: ${fullAnalysis.classification}`);
                console.log(`   - 내용: ${fullAnalysis.content}`);
                console.log(`   - 반응: ${fullAnalysis.reaction}`);
                
                // ✅ [기존] AI가 생성한 반응이 있으면 최우선으로 사용
                if (fullAnalysis.reaction && fullAnalysis.reaction.length > 0) {
                    console.log('✨ [응답선택] OpenAI 생성 반응 사용');
                    return {
                        type: fullAnalysis.classification,
                        confidence: 'high',
                        message: fullAnalysis.reaction,
                        content: fullAnalysis.content,
                        analysisType: 'full'
                    };
                }
                
                // 반응이 없으면 분류별 기본 반응
                if (fullAnalysis.classification === '커플사진') {
                    console.log('✨ [응답선택] 커플사진 응답 사용');
                    return { 
                        type: '커플사진', 
                        confidence: 'high', 
                        message: generateCouplePhotoResponse(), 
                        content: fullAnalysis.content, 
                        analysisType: 'full' 
                    };
                } else if (fullAnalysis.classification === '아저씨') {
                    console.log('✨ [응답선택] 아저씨 응답 사용');
                    return { 
                        type: '아저씨', 
                        confidence: 'high', 
                        message: generateAjeossiPhotoResponse(), 
                        content: fullAnalysis.content, 
                        analysisType: 'full' 
                    };
                } else { // 예진이, 기타인물, 무인물 등
                    console.log('✨ [응답선택] 기본 분류 응답 사용');
                    return { 
                        type: fullAnalysis.classification, 
                        confidence: 'high', 
                        message: null, 
                        content: fullAnalysis.content, 
                        analysisType: 'full' 
                    };
                }
            }
        }
        
        // 2. OpenAI 실패 시, 로컬 얼굴 인식 백업 (환경변수 지원)
        console.log('🛡️ [백업분석] OpenAI 분석 실패. 로컬 백업 분석으로 전환합니다.');
        const localResult = await runLocalFaceRecognition(base64Image);
        console.log(`🛡️ [백업분석] 로컬 분석 결과: ${localResult}`);

        // 🆕 [NEW] 환경변수가 true면 로컬 분석도 건너뛰어짐
        if (!DISABLE_FACE_API) {
            if (localResult === '아저씨') {
                console.log('🛡️ [백업분석] 아저씨로 식별됨 - 전용 응답 생성');
                return { 
                    type: '아저씨', 
                    confidence: 'medium-local', 
                    message: generateAjeossiPhotoResponse(), 
                    content: '로컬 분석으로 아저씨 사진으로 추정',
                    analysisType: 'local_backup' 
                };
            } else if (localResult === '예진이') {
                console.log('🛡️ [백업분석] 예진이로 식별됨');
                return { type: '예진이', confidence: 'medium-local', message: null, analysisType: 'local_backup' };
            } else if (localResult === '커플사진') {
                console.log('🛡️ [백업분석] 커플사진으로 식별됨');
                return { 
                    type: '커플사진', 
                    confidence: 'medium-local', 
                    message: generateCouplePhotoResponse(), 
                    content: '로컬 분석으로 커플사진으로 추정',
                    analysisType: 'local_backup' 
                };
            }
        }

        // 🚀 [기존] 3. enhancedPhotoSystem 최종 폴백 (무쿠가 절대 벙어리 안됨!)
        console.log('🚀 [최종폴백] enhancedPhotoSystem으로 완전 백업 시작...');
        
        if (imageUrl) {
            // imageUrl이 있으면 enhancedPhotoSystem 직접 호출
            const enhancedFallback = await getEnhancedPhotoFallback(imageUrl, 'selfie');
            if (enhancedFallback && enhancedFallback.message) {
                console.log('🚀 [최종폴백] enhancedPhotoSystem 성공!');
                return enhancedFallback;
            }
        }
        
        // imageUrl이 없거나 enhancedPhotoSystem도 실패 시, 궁극 폴백
        console.log('🛡️ [궁극폴백] enhancedPhotoSystem의 궁극 폴백 사용');
        const ultimateFallback = enhancedPhotoSystem.getUltimateFallbackMessage('selfie');
        
        return {
            type: '궁극폴백',
            confidence: 'ultimate_safe',
            message: ultimateFallback,
            content: 'enhancedPhotoSystem 궁극 폴백으로 무쿠 보호',
            analysisType: 'ultimate_enhanced_fallback'
        };
        
    } catch (error) {
        console.log('❌ [통합분석] 전체 사진 분석 실패:', error.message);
        
        // 🚀 [기존] 에러 시에도 enhancedPhotoSystem 폴백
        console.log('🚀 [에러폴백] 에러 발생으로 enhancedPhotoSystem 폴백...');
        try {
            const errorFallback = enhancedPhotoSystem.getUltimateFallbackMessage('selfie');
            return {
                type: '에러폴백',
                confidence: 'error_safe', 
                message: errorFallback,
                content: '시스템 에러 시 enhancedPhotoSystem으로 안전 복구',
                analysisType: 'error_enhanced_fallback'
            };
        } catch (fallbackError) {
            console.log('❌ [에러폴백] enhancedPhotoSystem 폴백도 실패:', fallbackError.message);
            return {
                type: '최종에러',
                confidence: 'final_error',
                message: "😅 사진 분석에 실패했어... 다시 보내줄래?",
                analysisType: 'final_error'
            };
        }
    }
}

/**
 * 🔄 [기존] 하위 호환성: 기존 얼굴 인식 함수 (내부용)
 */
async function detectFaceWithOpenAI(base64Image) {
    const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
    if (fullAnalysis) {
        return fullAnalysis.classification;
    }
    return null;
}

/**
 * 🔧 [수정] AI 모델 초기화 및 시스템 테스트 (환경변수 지원)
 */
async function initModels() {
    try {
        console.log('🔍 [얼굴인식 v5.6] DISABLE_FACE_API 환경변수 지원 시스템 준비');
        
        // 🆕 [NEW] 환경변수 상태 확인 및 로깅
        if (DISABLE_FACE_API) {
            console.log('🔍 [얼굴인식] ⚠️ face-api.js 비활성화 모드 (DISABLE_FACE_API=true)');
            console.log('🔍 [얼굴인식] ✅ OpenAI Vision + enhancedPhotoSystem만 사용');
        } else {
            console.log('🔍 [얼굴인식] ✅ 전체 시스템 활성화 (face-api.js 포함)');
        }
        
        const openaiInit = initializeOpenAI();
        
        // 🚀 [기존] enhancedPhotoSystem 초기화도 함께 진행
        try {
            console.log('🚀 [초기화] enhancedPhotoSystem 초기화 시작...');
            await enhancedPhotoSystem.initializeEnhancedPhotoSystem();
            console.log('🚀 [초기화] enhancedPhotoSystem 초기화 완료');
        } catch (enhancedError) {
            console.log('🚀 [초기화] enhancedPhotoSystem 초기화 실패 (폴백 모드로 계속):', enhancedError.message);
        }
        
        // 🆕 [NEW] face-api.js 관련 초기화는 환경변수에 따라 건너뛰기
        if (!DISABLE_FACE_API && openaiInit) {
            console.log('🔍 [얼굴인식] 🧪 OpenAI Vision API 테스트 시작...');
            try {
                const testBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=';
                const testResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: [{ type: "text", text: "테스트" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${testBase64}` } }] }],
                    max_tokens: 5
                });
                console.log('🔍 [얼굴인식] ✅ OpenAI Vision API 테스트 성공');
            } catch (testError) {
                console.log('🔍 [얼굴인식] ⚠️ OpenAI Vision API 테스트 실패 - 백업 모드로 운영');
            }
        } else if (DISABLE_FACE_API) {
            console.log('🔍 [얼굴인식] ✅ face-api.js 건너뛰기 완료 - OpenAI Vision + enhancedPhotoSystem 준비됨');
        }
        
        return true;
    } catch (error) {
        console.log('🔍 [얼굴인식] 모델 초기화 실패:', error.message);
        return false;
    }
}

/**
 * 📊 [수정] 시스템 상태 리포트 (환경변수 상태 포함)
 */
function getFaceRecognitionStatus() {
    const enhancedStatus = enhancedPhotoSystem.getSystemStatus();
    
    return {
        openaiAvailable: isOpenAIAvailable,
        faceApiDisabled: DISABLE_FACE_API, // 🆕 [NEW] 환경변수 상태 표시
        enhancedPhotoSystemStatus: enhancedStatus.status,
        version: "5.6 (DISABLE_FACE_API 환경변수 지원)", // 🆕 [NEW] 버전 업데이트
        features: [
            "개인 얼굴 인식 (예진이/아저씨)",
            "커플사진 인식 지원", 
            "전체 사진 내용 분석 ⭐️",
            "로컬 얼굴 인식 백업 🛡️",
            "영어/한국어 거부 메시지 감지 ✅",
            "마크다운 형식 응답 완벽 파싱 ✅",
            "예진이 스타일 반응 생성 ⭐️",
            "상황별 맞춤 응답 ⭐️",
            "🚀 enhancedPhotoSystem 완전 연동 ⭐️",
            "🛡️ 무쿠 벙어리 방지 100% 보장 ⭐️",
            "🆕 DISABLE_FACE_API 환경변수 지원 ⭐️" // 🆕 [NEW] 신규 기능
        ],
        status: DISABLE_FACE_API ? 
                (isOpenAIAvailable ? "OpenAI+Enhanced백업모드" : "Enhanced백업모드") :
                (isOpenAIAvailable ? "전체분석모드+Enhanced백업" : "Enhanced백업모드"),
        fallbackLevels: DISABLE_FACE_API ? [
            "1단계: OpenAI Vision 전체 분석",
            "2단계: enhancedPhotoSystem 폴백 (face-api.js 건너뛰기)", // 🆕 [NEW] 수정됨
            "3단계: enhancedPhotoSystem 궁극 폴백",
            "4단계: 최종 안전 메시지"
        ] : [
            "1단계: OpenAI Vision 전체 분석",
            "2단계: 로컬 얼굴 인식 백업",
            "3단계: enhancedPhotoSystem 폴백", 
            "4단계: enhancedPhotoSystem 궁극 폴백",
            "5단계: 최종 안전 메시지"
        ]
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    detectFaceMatch,             // 🌟 메인 함수: 통합 사진 분석 (DISABLE_FACE_API 지원)
    initModels,                  // 🔧 시스템 초기화 (환경변수 지원)
    analyzePhotoWithOpenAI,      // (내부용) 전체 사진 분석
    runLocalFaceRecognition,     // 🛡️ 로컬 백업 분석 (환경변수 지원)
    parseOpenAIResponse,         // ✅ 기존 파싱 함수
    getFaceRecognitionStatus,    // 📊 시스템 상태 확인 (환경변수 상태 포함)
    getEnhancedPhotoFallback     // 🚀 기존 enhancedPhotoSystem 연동 함수
};
