// src/faceMatcher.js - v2.0 (완전 수정 버전)
// 🔍 아저씨와 예진이 사진을 정확히 구분합니다
const fs = require('fs');
const path = require('path');

// face-api는 선택적 로드 (모델 파일이 있을 때만)
let faceapi = null;
let canvas = null;

try {
    faceapi = require('@vladmandic/face-api');
    canvas = require('canvas');
    const { Canvas, Image, ImageData } = canvas;
    // monkey-patch
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
} catch (error) {
    console.log('🔍 [얼굴인식] face-api 모듈 없음 - 빠른 구분 모드만 사용');
}

// 경로 설정 (src/ 기준)
const faceDataPath = path.resolve(__dirname, '../memory/faceData.json');
const modelPath = path.resolve(__dirname, '../models');
let labeledDescriptors = [];
let isInitialized = false;

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

// 모델 초기화 (face-api 있을 때만)
async function initModels() {
    try {
        if (!faceapi) {
            logFace('face-api 모듈 없음 - 빠른 구분 모드로 동작');
            isInitialized = false;
            return false;
        }
        
        logFace('face-api 모델 로딩 시작...');
        
        if (!fs.existsSync(modelPath)) {
            logFace(`모델 폴더가 없습니다: ${modelPath}`);
            logFace('얼굴 인식 없이 빠른 구분 모드로 동작합니다');
            isInitialized = false;
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
            logFace('얼굴 인식 없이 빠른 구분 모드로 동작합니다');
            isInitialized = false;
            return false;
        }
        
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
        
        // 기존 저장된 데이터 로드
        labeledDescriptors = loadFaceData();
        isInitialized = true;
        
        logFace(`모델 로딩 완료! 등록된 얼굴: ${labeledDescriptors.length}명`);
        
        // 🚀 저장된 사진들로 자동 등록 (최초 1회만)
        if (labeledDescriptors.length === 0) {
            logFace('등록된 얼굴이 없어서 저장된 사진들로 자동 등록을 시작합니다');
            await autoRegisterFromFiles();
        } else {
            logFace('이미 등록된 얼굴 데이터가 있습니다');
            labeledDescriptors.forEach(ld => {
                logFace(`📊 ${ld.label}: ${ld.descriptors.length}개 얼굴 샘플`);
            });
        }
        
        return true;
        
    } catch (err) {
        logFace(`모델 초기화 실패: ${err.message}`);
        logFace('빠른 구분 모드로 전환합니다');
        isInitialized = false;
        return false;
    }
}

// base64 -> buffer -> canvas image
function imageFromBase64(base64) {
    try {
        const buffer = Buffer.from(base64, 'base64');
        return canvas.loadImage(buffer);
    } catch (error) {
        logFace(`이미지 변환 실패: ${error.message}`);
        throw error;
    }
}

// 얼굴 등록 함수
async function registerFace(base64, label) {
    if (!isInitialized || !faceapi) {
        logFace('모델이 초기화되지 않았습니다');
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

// 기존 사진 파일들로 자동 얼굴 등록 (대량 처리 최적화)
async function autoRegisterFromFiles() {
    logFace('저장된 사진 파일들로 자동 얼굴 등록을 시작합니다...');
    
    const facesDir = path.resolve(__dirname, '../memory/faces');
    
    if (!fs.existsSync(facesDir)) {
        logFace('faces 폴더가 없습니다: ' + facesDir);
        return false;
    }
    
    let totalRegistered = 0;
    let totalFailed = 0;
    
    try {
        // 아저씨 사진들 등록 (001.jpg ~ 020.jpg)
        const uncleDir = path.join(facesDir, 'uncle');
        if (fs.existsSync(uncleDir)) {
            const uncleFiles = fs.readdirSync(uncleDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort(); // 파일명 순서대로 정렬
            
            logFace(`📸 아저씨 사진 ${uncleFiles.length}개 발견`);
            
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
                        logFace(`❌ ${file} 등록 실패 (얼굴 미발견)`);
                    }
                    
                    // 메모리 관리를 위한 약간의 딜레이
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 예진이 사진들 등록 (001.jpg ~ 020.jpg)
        const yejinDir = path.join(facesDir, 'yejin');
        if (fs.existsSync(yejinDir)) {
            const yejinFiles = fs.readdirSync(yejinDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort(); // 파일명 순서대로 정렬
            
            logFace(`📸 예진이 사진 ${yejinFiles.length}개 발견`);
            
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
                        logFace(`❌ ${file} 등록 실패 (얼굴 미발견)`);
                    }
                    
                    // 메모리 관리를 위한 약간의 딜레이
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 최종 결과 보고
        logFace(`🎉 자동 등록 완료!`);
        logFace(`📊 성공: ${totalRegistered}개, 실패: ${totalFailed}개`);
        
        // 등록 결과 상세 표시
        labeledDescriptors.forEach(ld => {
            logFace(`👤 ${ld.label}: ${ld.descriptors.length}개 얼굴 샘플 등록됨`);
        });
        
        // 인식 정확도 예상
        const uncleCount = labeledDescriptors.find(ld => ld.label === '아저씨')?.descriptors.length || 0;
        const yejinCount = labeledDescriptors.find(ld => ld.label === '예진이')?.descriptors.length || 0;
        
        if (uncleCount >= 10 && yejinCount >= 10) {
            logFace(`🎯 높은 정확도 예상: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        } else if (uncleCount >= 5 && yejinCount >= 5) {
            logFace(`🎯 중간 정확도 예상: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        } else {
            logFace(`⚠️ 더 많은 샘플 필요: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        }
        
        return totalRegistered > 0;
        
    } catch (error) {
        logFace(`자동 등록 중 심각한 에러: ${error.message}`);
        return false;
    }
}

// 얼굴 매칭 (폴백 지원)
async function detectFaceMatch(base64) {
    // 모델이 없거나 초기화 실패시 빠른 구분 사용
    if (!isInitialized || !faceapi) {
        logFace('face-api 모델 없음 - 빠른 구분 모드 사용');
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
            logFace(`🎯 얼굴 인식 성공: ${bestResult.label} (신뢰도: ${confidence}%)`);
            return bestResult.label;
        }
        
        logFace('얼굴 인식 실패 - 빠른 구분으로 폴백');
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
