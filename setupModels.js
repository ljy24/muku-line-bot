// setupModels.js - npm install 후 자동 실행되는 모델 다운로드 스크립트
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🚀 face-api 모델 자동 설정 시작...');

// 모델 파일들
const models = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1.bin',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1.bin', 
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1.bin',
    'face_recognition_model-shard2.bin'
];

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
function downloadModel(filename) {
    const url = `https://github.com/vladmandic/face-api/raw/master/model/${filename}`;
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
            // 리다이렉트 처리
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`HTTP ${redirectResponse.statusCode}`));
                        return;
                    }
                    redirectResponse.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        const stats = fs.statSync(filePath);
                        console.log(`✅ 완료: ${filename} (${Math.round(stats.size/1024)}KB)`);
                        resolve();
                    });
                    
                    file.on('error', reject);
                });
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(filePath);
                console.log(`✅ 완료: ${filename} (${Math.round(stats.size/1024)}KB)`);
                resolve();
            });
            
            file.on('error', reject);
        }).on('error', reject);
    });
}

// 모든 모델 다운로드
async function setupAll() {
    try {
        console.log('📁 디렉토리 생성 중...');
        createDirectories();
        
        console.log('📥 모델 파일 다운로드 중...');
        for (const model of models) {
            await downloadModel(model);
        }
        
        console.log('🎉 face-api 설정 완료!');
        console.log('📊 설치된 모델들:');
        
        const modelFiles = fs.readdirSync('models');
        let totalSize = 0;
        modelFiles.forEach(file => {
            const stats = fs.statSync(path.join('models', file));
            totalSize += stats.size;
            console.log(`   ${file} (${Math.round(stats.size/1024)}KB)`);
        });
        
        console.log(`💾 총 용량: ${Math.round(totalSize/1024)}KB`);
        console.log('🔍 얼굴 인식 시스템이 준비되었습니다!');
        
    } catch (error) {
        console.error('❌ 설정 실패:', error.message);
        console.log('⚡ 빠른 구분 모드로 동작합니다');
    }
}

// 실행
setupAll();
