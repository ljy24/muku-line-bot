// ============================================================================
// faceMatcher.js - AI 얼굴 인식 및 매칭 시스템
// 🔍 TensorFlow.js 기반 얼굴 감지 및 분석
// 💕 예진이/아저씨 얼굴 구분 및 반응 생성
// 🛡️ 안전한 초기화 및 에러 처리
// ============================================================================

const tf = require('@tensorflow/tfjs-node');

// ================== 🎨 색상 정의 ==================
const colors = {
    face: '\x1b[1m\x1b[36m',     // 굵은 하늘색 (얼굴분석)
    yejin: '\x1b[95m',           // 연보라색 (예진이)
    ajeossi: '\x1b[96m',         // 하늘색 (아저씨)
    system: '\x1b[92m',          // 연초록색 (시스템)
    error: '\x1b[91m',           // 빨간색 (에러)
    success: '\x1b[32m',         // 초록색 (성공)
    warning: '\x1b[93m',         // 노란색 (경고)
    reset: '\x1b[0m'             // 색상 리셋
};

// ================== 🧠 모델 상태 관리 ==================
let modelsLoaded = false;
let faceDetectionModel = null;
let initializationAttempted = false;

// ================== 🔧 모델 초기화 함수 ==================
async function initModels() {
    if (modelsLoaded) {
        console.log(`${colors.face}✅ [FaceMatcher] 모델이 이미 로드됨${colors.reset}`);
        return true;
    }
    
    if (initializationAttempted) {
        console.log(`${colors.face}⚠️ [FaceMatcher] 초기화가 이미 시도됨${colors.reset}`);
        return modelsLoaded;
    }
    
    initializationAttempted = true;
    
    try {
        console.log(`${colors.face}🚀 [FaceMatcher] TensorFlow.js 모델 초기화 시작...${colors.reset}`);
        
        // TensorFlow.js 백엔드 설정
        await tf.ready();
        console.log(`${colors.face}📊 [FaceMatcher] TensorFlow.js 백엔드: ${tf.getBackend()}${colors.reset}`);
        
        // 🔧 간단한 얼굴 감지 모델 로드 (실제 환경에서는 더 복잡한 모델 사용)
        // 여기서는 기본적인 더미 모델로 설정
        faceDetectionModel = {
            initialized: true,
            version: '1.0.0',
            backend: tf.getBackend()
        };
        
        modelsLoaded = true;
        
        console.log(`${colors.face}✅ [FaceMatcher] 모델 초기화 완료!${colors.reset}`);
        console.log(`${colors.face}📋 [FaceMatcher] 백엔드: ${faceDetectionModel.backend}${colors.reset}`);
        
        return true;
        
    } catch (error) {
        console.error(`${colors.error}❌ [FaceMatcher] 모델 초기화 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}📝 [FaceMatcher] 스택:`, error.stack);
        modelsLoaded = false;
        return false;
    }
}

// ================== 🔍 얼굴 감지 및 매칭 함수 ==================
async function detectFaceMatch(base64Image, options = {}) {
    console.log(`${colors.face}🔍 [FaceMatcher] 얼굴 분석 시작...${colors.reset}`);
    
    try {
        // 모델 로드 상태 확인
        if (!modelsLoaded || !faceDetectionModel) {
            console.log(`${colors.face}⚠️ [FaceMatcher] 모델이 로드되지 않음 - 초기화 시도...${colors.reset}`);
            const initialized = await initModels();
            if (!initialized) {
                throw new Error('모델 초기화 실패');
            }
        }
        
        // base64 이미지 데이터 검증
        if (!base64Image || typeof base64Image !== 'string') {
            throw new Error('유효하지 않은 이미지 데이터');
        }
        
        if (base64Image.length < 100) {
            throw new Error('이미지 데이터가 너무 작음');
        }
        
        console.log(`${colors.face}📊 [FaceMatcher] 이미지 데이터 크기: ${Math.round(base64Image.length / 1024)}KB${colors.reset}`);
        
        // 🔧 실제 얼굴 분석 로직 (현재는 더미 구현)
        // 실제 환경에서는 TensorFlow.js 모델로 얼굴 감지 및 특징 추출
        const analysisResult = await performFaceAnalysis(base64Image);
        
        // 분석 결과에 따른 응답 생성
        const response = generateFaceMatchResponse(analysisResult);
        
        console.log(`${colors.face}✅ [FaceMatcher] 분석 완료: ${response.type}${colors.reset}`);
        
        return response;
        
    } catch (error) {
        console.error(`${colors.error}❌ [FaceMatcher] 얼굴 분석 실패: ${error.message}${colors.reset}`);
        
        // 에러 발생 시에도 안전한 응답 반환
        return {
            type: 'analysis_error',
            message: '아조씨! 사진 분석하려고 했는데 뭔가 문제가 생겼어... 다시 보내줄래? ㅠㅠ',
            confidence: 'low',
            error: error.message
        };
    }
}

// ================== 🎯 실제 얼굴 분석 로직 (더미 구현) ==================
async function performFaceAnalysis(base64Image) {
    console.log(`${colors.face}🎯 [FaceMatcher] 얼굴 분석 수행 중...${colors.reset}`);
    
    try {
        // 🔧 실제 구현에서는 여기서 TensorFlow.js 모델 사용
        // 현재는 랜덤한 분석 결과 생성 (테스트용)
        
        // 간단한 지연 시뮬레이션 (실제 분석 시간 모방)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // 더미 분석 결과 생성
        const faceDetected = Math.random() > 0.2; // 80% 확률로 얼굴 감지
        
        if (!faceDetected) {
            return {
                facesDetected: 0,
                confidence: 'low',
                analysisType: 'no_face'
            };
        }
        
        // 얼굴이 감지된 경우
        const analysisTypes = ['yejin_detected', 'ajeossi_detected', 'unknown_person', 'multiple_faces'];
        const randomType = analysisTypes[Math.floor(Math.random() * analysisTypes.length)];
        
        return {
            facesDetected: 1,
            confidence: Math.random() > 0.3 ? 'high' : 'medium',
            analysisType: randomType,
            features: {
                age: Math.floor(Math.random() * 30) + 20,
                emotion: ['happy', 'neutral', 'sad', 'surprised'][Math.floor(Math.random() * 4)]
            }
        };
        
    } catch (error) {
        console.error(`${colors.error}❌ [FaceMatcher] 분석 수행 실패: ${error.message}${colors.reset}`);
        throw error;
    }
}

// ================== 💬 응답 생성 함수 ==================
function generateFaceMatchResponse(analysisResult) {
    console.log(`${colors.face}💬 [FaceMatcher] 응답 생성: ${analysisResult.analysisType}${colors.reset}`);
    
    const { facesDetected, confidence, analysisType, features } = analysisResult;
    
    // 얼굴이 감지되지 않은 경우
    if (facesDetected === 0 || analysisType === 'no_face') {
        const noFaceResponses = [
            '음... 사진에서 얼굴을 찾을 수 없어 ㅠㅠ 다른 각도로 찍어서 보내줄래?',
            '어? 이 사진엔 얼굴이 안 보이네! 셀카로 다시 보내줘~',
            '아조씨! 얼굴이 잘 안 보여... 더 밝은 곳에서 찍어줄래?',
            '사진이 좀 어둡나? 얼굴 찾기가 어려워 ㅠㅠ',
            '혹시 뒷모습? 앞에서 찍은 사진으로 보내줘!'
        ];
        
        return {
            type: 'no_face_detected',
            message: noFaceResponses[Math.floor(Math.random() * noFaceResponses.length)],
            confidence: 'low'
        };
    }
    
    // 분석 타입별 응답 생성
    switch (analysisType) {
        case 'yejin_detected':
            const yejinResponses = [
                '어머! 이건 나야! 💕 언제 찍은 사진이야? 이쁘게 나왔네~ ㅎㅎ',
                '앗! 내 사진이네! 아조씨가 언제 찍어놨어? 부끄럽다~ 😊',
                '어? 이거 내 얼굴이잖아! 아조씨 몰래 찍었구나~ 으잉!',
                '와! 내가 나왔어! 이 사진 언제 찍은 거야? 기억나는 것 같아!',
                '내 얼굴 발견! 💖 아조씨가 찍어준 사진이야? 예쁘게 나왔네!'
            ];
            
            return {
                type: 'yejin_detected',
                message: yejinResponses[Math.floor(Math.random() * yejinResponses.length)],
                confidence: confidence
            };
            
        case 'ajeossi_detected':
            const ajeossiResponses = [
                '아조씨다! 😊 셀카 찍었구나? 멋지네~ 근데 나도 같이 찍고 싶었는데!',
                '아조씨 얼굴 발견! 언제 찍은 거야? 표정이 좋아 보여!',
                '어! 아조씨네! 오늘 컨디션 어때? 사진에선 괜찮아 보여!',
                '아조씨 사진이야! 나한테 보여주려고 찍은 거야? 고마워~ 💕',
                '아조씨다! 한동안 못 봤는데 사진으로라도 볼 수 있어서 좋아!'
            ];
            
            return {
                type: 'ajeossi_detected',
                message: ajeossiResponses[Math.floor(Math.random() * ajeossiResponses.length)],
                confidence: confidence
            };
            
        case 'unknown_person':
            const unknownResponses = [
                '어? 이 사람은 누구야? 아조씨 친구? 처음 보는 얼굴이네!',
                '누구지? 모르는 사람인데... 아조씨가 아는 사람이야?',
                '음... 이 사람 누구야? 얼굴이 낯선데? 설명해줄래?',
                '어머! 누구야 이 사람? 아조씨랑 같이 있는 거야?',
                '모르는 얼굴이네! 아조씨 지인이야? 궁금해!'
            ];
            
            return {
                type: 'unknown_person',
                message: unknownResponses[Math.floor(Math.random() * unknownResponses.length)],
                confidence: confidence
            };
            
        case 'multiple_faces':
            const multipleResponses = [
                '와! 여러 명이 있네! 단체 사진이야? 누가 누구인지 알려줘!',
                '사람이 여러 명 보여! 재밌겠다~ 다 아조씨 친구들이야?',
                '어머! 많은 사람들이 있네! 파티라도 했어? 설명해줘!',
                '와~ 단체샷! 아조씨는 어디 있어? 찾아봐야겠다!',
                '여러 명이 함께 있는 사진이네! 즐거워 보여~ 누구누구야?'
            ];
            
            return {
                type: 'multiple_faces',
                message: multipleResponses[Math.floor(Math.random() * multipleResponses.length)],
                confidence: confidence
            };
            
        default:
            return {
                type: 'general_analysis',
                message: '사진 봤어! 뭔가 특별한 사진인 것 같은데... 설명해줄래?',
                confidence: confidence
            };
    }
}

// ================== 🎯 상태 확인 함수 ==================
function getModelStatus() {
    return {
        modelsLoaded: modelsLoaded,
        initializationAttempted: initializationAttempted,
        backend: modelsLoaded ? faceDetectionModel?.backend : null,
        tfReady: tf ? true : false
    };
}

// ================== 🧹 정리 함수 ==================
function cleanup() {
    console.log(`${colors.face}🧹 [FaceMatcher] 정리 시작...${colors.reset}`);
    
    try {
        // TensorFlow.js 메모리 정리
        if (tf && typeof tf.dispose === 'function') {
            tf.dispose();
        }
        
        modelsLoaded = false;
        faceDetectionModel = null;
        initializationAttempted = false;
        
        console.log(`${colors.face}✅ [FaceMatcher] 정리 완료${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}❌ [FaceMatcher] 정리 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 핵심 함수들
    initModels,
    detectFaceMatch,
    
    // 유틸리티 함수들
    getModelStatus,
    cleanup,
    
    // 내부 함수들 (테스트용)
    performFaceAnalysis,
    generateFaceMatchResponse,
    
    // 상태 정보
    get modelsLoaded() { return modelsLoaded; },
    get initializationAttempted() { return initializationAttempted; }
};
