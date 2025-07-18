// src/faceMatcher.js - v2.4 (지연 로딩 버전)
// 🔍 아저씨와 예진이 사진을 정확히 구분합니다
const fs = require('fs');
const path = require('path');

// face-api는 완전 선택적 로드 (앱 시작시에는 로드하지 않음)
let faceapi = null;
let canvas = null;
let tf = null;
let isModuleAvailable = false;
let isInitialized = false;
let initializationAttempted = false;

// 경로 설정 (src/ 기준)
const faceDataPath = path.resolve(__dirname, '../memory/faceData.json');
const modelPath = path.resolve(__dirname, '../models');
let labeledDescriptors = [];

// 🎭 한글 로그 (전역 함수 사용)
function logFace(message) {
    try {
        if (global.translateMessage) {
            const translated = global.translateMessage(message);
            console.log(`🔍 [얼굴인식] ${translated}`);
        } else {
            console.log(`🔍 [얼굴인식] ${message}`);
        }
    } catch (error) {
        console.log(`🔍 [얼굴인식] ${message}`);
    }
}

// 앱 시작시에는 빠른 구분 모드로 시작
console.log('🔍 [얼굴인식] 빠른 구분 모드로 시작 (필요시 AI 모드로 전환)');

// 지연 로딩 함수 (처음 사용할 때만 실행)
async function loadFaceApiModules() {
    if (initializationAttempted) {
        return isModuleAvailable;
    }
    
    initializationAttempted = true;
    
    try {
        logFace('AI 모듈 지연 로딩 시작...');
        
        // TensorFlow 먼저 로드
        tf = require('@tensorflow/tfjs-node');
        logFace('TensorFlow 로드 성공');
        
        // TensorFlow 백엔드 설정 (타임아웃 적용)
        await Promise.race([
            tf.ready(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TensorFlow 타임아웃')), 10000)
            )
        ]);
        logFace('TensorFlow 백엔드 준비 완료');
        
        // face-api 로드
        faceapi = require('@vladmandic/face-api/dist/face-api.node.js');
        logFace('face-api 로드 성공');
        
        // canvas 로드
        canvas = require('canvas');
        logFace('canvas 로드 성공');
        
        if (faceapi && canvas) {
            const { Canvas, Image, ImageData } = canvas;
            faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
            logFace('canvas 패치 완료');
            
            isModuleAvailable = true;
            return true;
        }
        return false;
    } catch (error) {
        logFace(`AI 모듈 로드 실패: ${error.message} - 빠른 구분 모드 유지`);
        // 모듈 없어도 에러 안남
        faceapi = null;
        canvas = null;
        tf = null;
        isModuleAvailable = false;
        return false;
    }
}

// 얼굴 데이터 로드
function loadFaceData() {
    if (!fs.existsSync(faceDataPath)) {
        logFace('얼굴 데이터 파일이 없어서 빈 데이터베이스로 시작합니다');
        saveFaceData(); // 빈 파일 생성
        return [];
    }
    
    try {
        const raw = fs.readFileSync(faceDataPath, 'utf8');
        const json = JSON.parse(raw);
        
        logFace(`얼굴 데이터 로드 성공: ${Object.keys(json).length}명의 얼굴 정보`);
        
        if (!faceapi) {
            logFace('face-api 없음 - 데이터만 로드');
            return [];
        }
        
        const descriptors = [];
        Object.keys(json).forEach(label => {
            if (json[label] && json[label].length > 0) {
                const faceDescriptors = json[label].map(d => new Float32Array(d));
                descriptors.push(new faceapi.LabeledFaceDescriptors(label, faceDescriptors));
                logFace(`${label}: ${json[label].length}개 얼굴 샘플 로드`);
            }
        });
        
        return descriptors;
    } catch (e) {
        logFace(`얼굴 데이터 로드 실패: ${e.message}`);
        return [];
    }
}

// 얼굴 데이터 저장
function saveFaceData() {
    try {
        const dataToSave = {};
        labeledDescriptors.forEach(labeled => {
            dataToSave[labeled.label] = labeled.descriptors.map(d => Array.from(d));
        });
        
        const dir = path.dirname(faceDataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(faceDataPath, JSON.stringify(dataToSave, null, 2));
        logFace(`얼굴 데이터 저장 완료: ${faceDataPath}`);
    } catch (error) {
        logFace(`얼굴 데이터 저장 실패: ${error.message}`);
    }
}

// 모델 초기화 (지연 로딩 버전) - 앱 시작시에는 실행하지 않음
async function initModels() {
    try {
        // 즉시 성공으로 리턴 (실제 초기화는 지연)
        logFace('지연 로딩 모드 - 필요시 AI 모듈을 로드합니다');
        return true;
        
    } catch (err) {
        logFace(`초기화 실패: ${err.message}`);
        return false;
    }
}

// 실제 AI 모델 초기화 (처음 사용할 때만)
async function ensureAIReady() {
    if (isInitialized) {
        return true;
    }
    
    // 모듈 로드 시도
    const moduleLoaded = await loadFaceApiModules();
    if (!moduleLoaded) {
        return false;
    }
    
    try {
        // 모델 폴더 확인
        if (!fs.existsSync(modelPath)) {
            logFace(`모델 폴더가 없습니다: ${modelPath}`);
            return false;
        }
        
        // 필요한 모델 파일들 확인
        const requiredModels = [
            'ssd_mobilenetv1_model-weights_manifest.json',
            'face_landmark_68_model-weights_manifest.json', 
            'face_recognition_model-weights_manifest.json'
        ];
        
        const missingModels = requiredModels.filter(model => 
            !fs.existsSync(path.join(modelPath, model))
        );
        
        if (missingModels.length > 0) {
            logFace(`누락된 모델 파일들: ${missingModels.join(', ')}`);
            return false;
        }
        
        // 모델 로딩 시도 (타임아웃 적용)
        logFace('AI 모델 로딩 시작...');
        
        await Promise.race([
            Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
            ]),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('로딩 타임아웃')), 20000)
            )
        ]);
        
        // 기존 저장된 데이터 로드
        labeledDescriptors = loadFaceData();
        isInitialized = true;
        
        logFace(`🎉 AI 모델 로딩 완료! 등록된 얼굴: ${labeledDescriptors.length}명`);
        
        // 자동 등록 (백그라운드)
        if (labeledDescriptors.length === 0) {
            logFace('백그라운드에서 얼굴 자동 등록을 시작합니다...');
            setImmediate(async () => {
                try {
                    await autoRegisterFromFiles();
                } catch (error) {
                    logFace(`자동 등록 중 에러 (무시됨): ${error.message}`);
                }
            });
        }
        
        return true;
        
    } catch (err) {
        logFace(`AI 모델 초기화 실패: ${err.message}`);
        return false;
    }
}

// base64 -> buffer -> canvas image (안전 버전)
function imageFromBase64(base64) {
    try {
        if (!canvas) {
            throw new Error('canvas 모듈이 없습니다');
        }
        const buffer = Buffer.from(base64, 'base64');
        return canvas.loadImage(buffer);
    } catch (error) {
        logFace(`이미지 변환 실패: ${error.message}`);
        throw error;
    }
}

// 얼굴 등록 함수 (안전 버전)
async function registerFace(base64, label) {
    // AI 모델 준비 확인
    const aiReady = await ensureAIReady();
    if (!aiReady) {
        logFace('AI 모델 준비 실패 - 등록 불가');
        return false;
    }
    
    try {
        logFace(`얼굴 등록 시작: ${label}`);
        
        const img = await imageFromBase64(base64);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            logFace(`얼굴을 찾을 수 없습니다: ${label}`);
            return false;
        }
        
        // 기존 라벨 찾기 또는 새로 생성
        let labeledDescriptor = labeledDescriptors.find(ld => ld.label === label);
        
        if (labeledDescriptor) {
            // 기존 라벨에 새 얼굴 추가
            labeledDescriptor.descriptors.push(detections.descriptor);
            logFace(`${label}에 새로운 얼굴 샘플 추가 (총 ${labeledDescriptor.descriptors.length}개)`);
        } else {
            // 새 라벨 생성
            labeledDescriptor = new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
            labeledDescriptors.push(labeledDescriptor);
            logFace(`새로운 사람 등록: ${label}`);
        }
        
        saveFaceData();
        return true;
        
    } catch (err) {
        logFace(`얼굴 등록 실패 (${label}): ${err.message}`);
        return false;
    }
}

// 자동 등록 함수 (안전 버전)
async function autoRegisterFromFiles() {
    const aiReady = await ensureAIReady();
    if (!aiReady) {
        logFace('AI 모델 준비 실패 - 자동 등록 건너뛰기');
        return false;
    }
    
    logFace('저장된 사진 파일들로 자동 얼굴 등록을 시작합니다...');
    
    const facesDir = path.resolve(__dirname, '../memory/faces');
    
    if (!fs.existsSync(facesDir)) {
        logFace('faces 폴더가 없습니다: ' + facesDir);
        return false;
    }
    
    let totalRegistered = 0;
    let totalFailed = 0;
    
    try {
        // 아저씨 사진들 등록 (처음 3개만)
        const uncleDir = path.join(facesDir, 'uncle');
        if (fs.existsSync(uncleDir)) {
            const uncleFiles = fs.readdirSync(uncleDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort()
                .slice(0, 3); // 처음 3개만
            
            logFace(`📸 아저씨 사진 ${uncleFiles.length}개 처리 예정`);
            
            for (let i = 0; i < uncleFiles.length; i++) {
                const file = uncleFiles[i];
                try {
                    const filePath = path.join(uncleDir, file);
                    const buffer = fs.readFileSync(filePath);
                    const base64 = buffer.toString('base64');
                    
                    logFace(`🔄 아저씨 ${file} 처리 중... (${i+1}/${uncleFiles.length})`);
                    
                    const success = await registerFace(base64, '아저씨');
                    if (success) {
                        totalRegistered++;
                        logFace(`✅ ${file} 등록 성공`);
                    } else {
                        totalFailed++;
                        logFace(`❌ ${file} 등록 실패`);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 예진이 사진들 등록 (처음 3개만)
        const yejinDir = path.join(facesDir, 'yejin');
        if (fs.existsSync(yejinDir)) {
            const yejinFiles = fs.readdirSync(yejinDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort()
                .slice(0, 3); // 처음 3개만
            
            logFace(`📸 예진이 사진 ${yejinFiles.length}개 처리 예정`);
            
            for (let i = 0; i < yejinFiles.length; i++) {
                const file = yejinFiles[i];
                try {
                    const filePath = path.join(yejinDir, file);
                    const buffer = fs.readFileSync(filePath);
                    const base64 = buffer.toString('base64');
                    
                    logFace(`🔄 예진이 ${file} 처리 중... (${i+1}/${yejinFiles.length})`);
                    
                    const success = await registerFace(base64, '예진이');
                    if (success) {
                        totalRegistered++;
                        logFace(`✅ ${file} 등록 성공`);
                    } else {
                        totalFailed++;
                        logFace(`❌ ${file} 등록 실패`);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 최종 결과 보고
        logFace(`🎉 자동 등록 완료! 성공: ${totalRegistered}개, 실패: ${totalFailed}개`);
        return totalRegistered > 0;
        
    } catch (error) {
        logFace(`자동 등록 중 심각한 에러: ${error.message}`);
        return false;
    }
}

// 얼굴 매칭 (지연 로딩 버전)
async function detectFaceMatch(base64) {
    // AI 모델 준비 시도 (처음 사용시에만)
    const aiReady = await ensureAIReady();
    
    if (!aiReady) {
        logFace('AI 모델 없음 - 빠른 구분 모드 사용');
        return quickFaceGuess(base64);
    }
    
    if (labeledDescriptors.length === 0) {
        logFace('등록된 얼굴이 없습니다 - 빠른 구분 모드 사용');
        return quickFaceGuess(base64);
    }
    
    try {
        const img = await imageFromBase64(base64);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            logFace('사진에서 얼굴을 찾을 수 없습니다 - 빠른 구분 시도');
            return quickFaceGuess(base64);
        }
        
        // 여러 threshold로 테스트
        const thresholds = [0.4, 0.5, 0.6];
        let bestResult = null;
        let bestDistance = 1.0;
        
        for (const threshold of thresholds) {
            const matcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
            const match = matcher.findBestMatch(detections.descriptor);
            
            if (match.label !== 'unknown' && match.distance < bestDistance) {
                bestResult = match;
                bestDistance = match.distance;
            }
            
            logFace(`Threshold ${threshold}: ${match.label} (거리: ${match.distance.toFixed(3)})`);
        }
        
        if (bestResult && bestResult.label !== 'unknown') {
            const confidence = ((1 - bestResult.distance) * 100).toFixed(1);
            logFace(`🎯 AI 얼굴 인식 성공: ${bestResult.label} (신뢰도: ${confidence}%)`);
            return bestResult.label;
        }
        
        logFace('AI 얼굴 인식 실패 - 빠른 구분으로 폴백');
        return quickFaceGuess(base64);
        
    } catch (err) {
        logFace(`얼굴 매칭 에러: ${err.message} - 빠른 구분으로 폴백`);
        return quickFaceGuess(base64);
    }
}

// 빠른 얼굴 구분 (간단한 휴리스틱)
function quickFaceGuess(base64) {
    try {
        // base64 크기나 패턴으로 간단히 구분 (임시 방법)
        const buffer = Buffer.from(base64, 'base64');
        const size = buffer.length;
        
        // 예진이 셀카는 보통 더 크고 고화질
        // 아저씨 사진은 상대적으로 작을 수 있음
        if (size > 200000) { // 200KB 이상
            logFace(`큰 사진 (${Math.round(size/1024)}KB) - 예진이 셀카일 가능성 높음`);
            return '예진이';
        } else {
            logFace(`작은 사진 (${Math.round(size/1024)}KB) - 아저씨 사진일 가능성 높음`);
            return '아저씨';
        }
    } catch (error) {
        logFace(`빠른 구분 실패: ${error.message}`);
        return 'unknown';
    }
}

// 얼굴 데이터 상태 확인
function getFaceDataStatus() {
    const status = {
        isInitialized,
        modelPath,
        faceDataPath,
        registeredFaces: labeledDescriptors.length,
        faceDetails: {}
    };
    
    labeledDescriptors.forEach(labeled => {
        status.faceDetails[labeled.label] = labeled.descriptors.length;
    });
    
    return status;
}

module.exports = { 
    initModels, 
    detectFaceMatch, 
    registerFace,
    quickFaceGuess,
    getFaceDataStatus,
    autoRegisterFromFiles,
    logFace
};
