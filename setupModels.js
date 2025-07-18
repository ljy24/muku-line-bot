// setupModels.js - 수정된 모델 다운로드 스크립트
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🚀 face-api 모델 자동 설정 시작...');

// 올바른 모델 URL들 (face-api.js 공식 저장소)
const modelUrls = {
    'ssd_mobilenetv1_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
    'face_landmark_68_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
    'face_recognition_model-shard2': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
};

// 디렉토리 생성
function createDirectories() {
    const dirs = [
        'models',
        'memory',
        'memory/faces',
        'memory/faces/uncle', 
        'memory/faces/yejin'
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 생성: ${dir}`);
        }
    });
}

// 모델 다운로드 함수
function downloadModel(filename, url) {
    const filePath = path.join('models', filename);
    
    // 이미 존재하면 스킵
    if (fs.existsSync(filePath)) {
        console.log(`⏭️  이미 존재: ${filename}`);
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        console.log(`📥 다운로드: ${filename}...`);
        
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                console.log(`❌ ${filename}: HTTP ${response.statusCode}`);
                file.close();
                fs.unlink(filePath, () => {});
                resolve(); // 에러여도 계속 진행
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(filePath);
                console.log(`✅ 완료: ${filename} (${Math.round(stats.size/1024)}KB)`);
                resolve();
            });
            
            file.on('error', (err) => {
                console.log(`❌ ${filename}: ${err.message}`);
                fs.unlink(filePath, () => {});
                resolve(); // 에러여도 계속 진행
            });
        }).on('error', (err) => {
            console.log(`❌ ${filename}: ${err.message}`);
            resolve(); // 에러여도 계속 진행
        });
    });
}

// 대안: npm에서 직접 복사
async function copyFromNodeModules() {
    try {
        const faceApiPath = path.join('node_modules', '@vladmandic', 'face-api', 'model');
        
        if (fs.existsSync(faceApiPath)) {
            console.log('📦 node_modules에서 모델 파일 복사 중...');
            
            // node_modules에서 models 폴더로 복사
            const modelFiles = fs.readdirSync(faceApiPath);
            
            for (const file of modelFiles) {
                const src = path.join(faceApiPath, file);
                const dest = path.join('models', file);
                
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(src, dest);
                    const stats = fs.statSync(dest);
                    console.log(`📋 복사: ${file} (${Math.round(stats.size/1024)}KB)`);
                }
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ node_modules 복사 실패:', error.message);
        return false;
    }
}

// 모든 모델 다운로드
async function setupAll() {
    try {
        console.log('📁 디렉토리 생성 중...');
        createDirectories();
        
        // 먼저 node_modules에서 복사 시도
        const copiedFromNodeModules = await copyFromNodeModules();
        
        if (!copiedFromNodeModules) {
            console.log('📥 온라인에서 모델 파일 다운로드 중...');
            
            for (const [filename, url] of Object.entries(modelUrls)) {
                await downloadModel(filename, url);
            }
        }
        
        // 결과 확인
        const modelFiles = fs.readdirSync('models');
        
        if (modelFiles.length > 0) {
            console.log('🎉 face-api 설정 완료!');
            console.log('📊 설치된 모델들:');
            
            let totalSize = 0;
            modelFiles.forEach(file => {
                const stats = fs.statSync(path.join('models', file));
                totalSize += stats.size;
                console.log(`   ${file} (${Math.round(stats.size/1024)}KB)`);
            });
            
            console.log(`💾 총 용량: ${Math.round(totalSize/1024)}KB`);
            console.log('🔍 얼굴 인식 시스템이 준비되었습니다!');
        } else {
            console.log('⚠️ 모델 파일 다운로드 실패');
            console.log('⚡ 빠른 구분 모드로 동작합니다');
        }
        
    } catch (error) {
        console.error('❌ 설정 실패:', error.message);
        console.log('⚡ 빠른 구분 모드로 동작합니다');
    }
}

// 실행
setupAll();
