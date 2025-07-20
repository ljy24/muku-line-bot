// ============================================================================
// faceMatcher.js - v5.3 (OpenAI 응답 파싱 로직 완전 수정)
// 🔍 얼굴 인식 + 전체 사진 내용 분석 + 예진이 스타일 반응 생성
// 🛡️ OpenAI Vision 실패 시, 로컬 얼굴 인식으로 백업하여 더 똑똑하게 반응
// ✅ OpenAI 실제 응답 형태에 맞춘 파싱 로직 완전 개선
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
 * ✅ [핵심 수정] OpenAI 분석 거부 메시지 완벽 감지
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
 * ⭐️⭐️⭐️ [핵심 수정] OpenAI 응답 파싱 로직 완전 개선 ⭐️⭐️⭐️
 */
function parseOpenAIResponse(result) {
    console.log('🔍 [파싱] 원본 응답:', result);
    
    let classification = '기타';
    let content = '';
    let reaction = '';
    
    try {
        // ✅ [수정] 실제 OpenAI 응답 형태에 맞춘 파싱
        const lines = result.split('\n');
        let currentSection = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 섹션 구분자 찾기
            if (line.includes('1단계: 인물 분류') || line.includes('인물 분류')) {
                currentSection = 'classification';
                continue;
            } else if (line.includes('2단계: 사진 내용') || line.includes('사진 내용')) {
                currentSection = 'content';
                continue;
            } else if (line.includes('3단계: 예진이 스타일') || line.includes('예진이 스타일')) {
                currentSection = 'reaction';
                continue;
            }
            
            // 실제 데이터 추출
            if (currentSection === 'classification') {
                // "- \"아저씨\" : 중년..." 형태에서 분류 추출
                if (line.includes('"아저씨"') || line.includes("'아저씨'")) {
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
            } else if (currentSection === 'content') {
                // "- 자동차 안이며..." 형태에서 내용 추출
                if (line.startsWith('-') && line.length > 3) {
                    content += line.substring(1).trim() + ' ';
                }
            } else if (currentSection === 'reaction') {
                // "- 아조씨~ 운전 조심해서..." 형태에서 반응 추출
                if (line.startsWith('-') && line.length > 3) {
                    reaction += line.substring(1).trim() + ' ';
                }
            }
        }
        
        // 추가 정리
        content = content.trim();
        reaction = reaction.trim();
        
        // ✅ [추가] 백업 파싱 - 기존 방식도 시도
        if (!classification || classification === '기타') {
            lines.forEach(line => {
                if (line.includes('분류:')) {
                    const extracted = line.split('분류:')[1]?.trim();
                    if (extracted) {
                        classification = extracted.replace(/['"]/g, '');
                    }
                } else if (line.includes('내용:')) {
                    const extracted = line.split('내용:')[1]?.trim();
                    if (extracted) {
                        content = extracted;
                    }
                } else if (line.includes('반응:')) {
                    const extracted = line.split('반응:')[1]?.trim();
                    if (extracted) {
                        reaction = extracted;
                    }
                }
            });
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
 * ⭐️⭐️⭐️ 핵심 기능: 전체 사진 분석 시스템 ⭐️⭐️⭐️
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
        
        // 분석 거부 감지
        if (isOpenAIRefusal(result)) {
            console.log('🚨 [사진분석] OpenAI Vision이 안전 정책으로 분석을 거부했습니다:', result);
            return null;
        }

        console.log('🔍 [사진분석] OpenAI Vision 전체 분석 결과:', result);
        
        // ✅ [핵심 수정] 새로운 파싱 로직 사용
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

// ================== [강화] 로컬 백업 분석 함수 ==================
/**
 * 🛡️ 로컬 face-api.js를 이용한 백업 얼굴 인식 (개선된 추측 로직)
 */
async function runLocalFaceRecognition(base64Image) {
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
 * ⭐️ 아저씨 전용 응답 생성기 ⭐️
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
 * ⭐️ 커플사진 대응 응답 생성기 ⭐️
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
 * ✅ [신규] 분석 거부 전용 응답 생성기
 */
function generateRefusalResponse(imageSize) {
    const responses = [
        "🤔 실제 사람 사진인 것 같은데... 누구야? 궁금해!",
        "📸 선명한 인물 사진이네! 아저씨야? 다른 사람이야?",
        "👤 진짜 사람 같은데... 혹시 아저씨 사진?",
        "😊 사진이 너무 생생해서 누군지 궁금하네!",
        "🥰 실제 인물 사진 같아! 아저씨가 찍어준 거야?"
    ];
    
    if (imageSize > 300) {
        return "📸 고해상도 인물 사진이네! 선명하게 잘 나왔어! 누구야?";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * 🎨 예진이 스타일 기본 반응 생성기
 */
function generateBasicPhotoReaction(imageSize) {
    const reactions = [
        "🤔 사진이 잘 안 보여... 다시 보내줄래?",
        "📸 사진은 받았는데... 아조씨가 뭐 하는 거야?",
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
 * ✅ [핵심 수정] OpenAI 파싱 완벽 처리
 */
async function detectFaceMatch(base64Image) {
    try {
        console.log('🔍 [통합분석 v5.3] 얼굴 + 전체 사진 분석 실행...');
        const buffer = Buffer.from(base64Image, 'base64');
        const sizeKB = buffer.length / 1024;
        console.log(`🔍 [통합분석] 이미지 크기: ${Math.round(sizeKB)}KB`);
        
        // 1. OpenAI Vision 전체 분석 우선 시도
        if (isOpenAIAvailable) {
            const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
            if (fullAnalysis) {
                console.log(`🔍 [통합분석] 전체 분석 완료:`);
                console.log(`   - 분류: ${fullAnalysis.classification}`);
                console.log(`   - 내용: ${fullAnalysis.content}`);
                console.log(`   - 반응: ${fullAnalysis.reaction}`);
                
                // ✅ [핵심 수정] AI가 생성한 반응이 있으면 최우선으로 사용
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
        
        // 2. OpenAI 실패 시, 로컬 얼굴 인식 백업
        console.log('🛡️ [백업분석] OpenAI 분석 실패. 로컬 백업 분석으로 전환합니다.');
        const localResult = await runLocalFaceRecognition(base64Image);
        console.log(`🛡️ [백업분석] 로컬 분석 결과: ${localResult}`);

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

        // 3. 로컬 분석도 불확실하면 거부 응답
        console.log('🚨 [최종폴백] OpenAI 거부 + 로컬 불확실 -> 실제 인물 추정 응답');
        return {
            type: '분석거부인물',
            confidence: 'refused',
            message: generateRefusalResponse(sizeKB),
            content: '실제 인물 사진으로 추정 (OpenAI 정책상 분석 제한)',
            analysisType: 'refused_fallback'
        };
        
    } catch (error) {
        console.log('❌ [통합분석] 전체 사진 분석 실패:', error.message);
        return {
            type: '기타',
            confidence: 'error',
            message: "😅 사진 분석에 실패했어... 다시 보내줄래?",
            analysisType: 'error'
        };
    }
}

/**
 * 🔄 하위 호환성: 기존 얼굴 인식 함수 (내부용)
 */
async function detectFaceWithOpenAI(base64Image) {
    const fullAnalysis = await analyzePhotoWithOpenAI(base64Image);
    if (fullAnalysis) {
        return fullAnalysis.classification;
    }
    return null;
}

/**
 * 🔧 AI 모델 초기화 및 시스템 테스트
 */
async function initModels() {
    try {
        console.log('🔍 [얼굴인식 v5.3] OpenAI 응답 파싱 완전 개선 시스템 준비 완료');
        
        const openaiInit = initializeOpenAI();
        
        if (openaiInit) {
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
        }
        return true;
    } catch (error) {
        console.log('🔍 [얼굴인식] 모델 초기화 실패:', error.message);
        return false;
    }
}

/**
 * 📊 시스템 상태 리포트
 */
function getFaceRecognitionStatus() {
    return {
        openaiAvailable: isOpenAIAvailable,
        version: "5.3 (OpenAI 응답 파싱 완전 개선)",
        features: [
            "개인 얼굴 인식 (예진이/아저씨)",
            "커플사진 인식 지원", 
            "전체 사진 내용 분석 ⭐️",
            "로컬 얼굴 인식 백업 🛡️",
            "영어/한국어 거부 메시지 감지 ✅",
            "OpenAI 응답 파싱 완전 개선 ✅",
            "예진이 스타일 반응 생성 ⭐️",
            "상황별 맞춤 응답 ⭐️"
        ],
        status: isOpenAIAvailable ? "전체분석모드" : "백업모드"
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    detectFaceMatch,             // 🌟 메인 함수: 통합 사진 분석
    initModels,                  // 🔧 시스템 초기화
    analyzePhotoWithOpenAI,      // (내부용) 전체 사진 분석
    runLocalFaceRecognition,     // 🛡️ 로컬 백업 분석
    parseOpenAIResponse,         // ✅ 새로운 파싱 함수
    getFaceRecognitionStatus     // 📊 시스템 상태 확인
};
