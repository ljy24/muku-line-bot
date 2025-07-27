// ============================================================================
// photo-analyzer.js - 예진이 후지 사진 1481장 Vision API 분석 스크립트
// 💰 예상 비용: $3.33 (약 4,600원) - 1회성 투자
// 🎯 목표: 정확한 사진-메시지 매칭으로 자연스러운 대화 구현
// 🛡️ 안전: 기존 코드 건드리지 않고 별도 실행
// ============================================================================

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// ================== 🌏 설정 ==================
const PHOTO_BASE_URL = "https://photo.de-ji.net/photo/fuji";
const TOTAL_PHOTOS = 1481;
const ANALYSIS_OUTPUT_FILE = '/data/photo-analysis.json';
const TEST_MODE = false; // true: 5장만 테스트, false: 전체 1481장
const FORCE_REANALYZE = true; // true: 기존 데이터 무시하고 재분석, false: 기존 데이터 건너뛰기
const TEST_PHOTOS = [1, 250, 500, 750, 1000]; // 테스트용 사진 번호들

// OpenAI 클라이언트
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
}

// ================== 🎨 로그 함수 ==================
function log(message) {
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Tokyo' });
    console.log(`[${timestamp}] [사진분석] ${message}`);
}

// ================== 📸 사진 URL 생성 ==================
function getPhotoUrl(photoNumber) {
    const fileName = String(photoNumber).padStart(6, "0") + ".jpg";
    return `${PHOTO_BASE_URL}/${fileName}`;
}

// ================== 🤖 Vision API 사진 분석 ==================
async function analyzePhoto(photoNumber) {
    try {
        const imageUrl = getPhotoUrl(photoNumber);
        
        log(`📸 사진 분석 시작: ${String(photoNumber).padStart(6, "0")}.jpg`);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",  // Vision 지원 모델
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `이 사진을 분석해서 다음 형태의 JSON으로 답변해줘:
{
  "category": "landscape|portrait|daily|food|object|indoor|outdoor",
  "mainSubject": "사진의 주요 피사체 (한글 2-4단어)",
  "mood": "peaceful|cute|cheerful|calm|dreamy|nostalgic|bright|cozy",
  "timeOfDay": "morning|afternoon|evening|night|unknown",
  "description": "사진에 대한 간단한 설명 (한글 10-20자)",
  "photoStyle": "selfie|landscape|closeup|wide|artistic|casual",
  "colors": "dominant_color,secondary_color (예: warm,soft)",
  "isYejinPhoto": true|false
}

정확한 JSON 형태로만 답변하고 다른 텍스트는 추가하지 마세요.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: "low"  // 비용 절약을 위해 low 해상도 사용
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300,
            temperature: 0.1  // 일관성을 위해 낮은 온도
        });
        
        let analysisText = response.choices[0].message.content.trim();
        
        // 🔧 FIX: JSON 코드 블록 제거
        if (analysisText.startsWith('```json')) {
            analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (analysisText.startsWith('```')) {
            analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // JSON 파싱 시도
        let analysis;
        try {
            analysis = JSON.parse(analysisText);
        } catch (jsonError) {
            log(`❌ JSON 파싱 실패: ${jsonError.message}`);
            log(`📝 원본 응답: ${analysisText}`);
            
            // 폴백 분석 데이터
            analysis = {
                category: "unknown",
                mainSubject: "알 수 없음",
                mood: "calm",
                timeOfDay: "unknown",
                description: "사진 분석 실패",
                photoStyle: "casual",
                colors: "neutral,soft",
                isYejinPhoto: true,
                error: "JSON parsing failed",
                rawResponse: analysisText
            };
        }
        
        // 사진 번호와 URL 추가
        analysis.photoNumber = photoNumber;
        analysis.fileName = String(photoNumber).padStart(6, "0") + ".jpg";
        analysis.url = imageUrl;
        analysis.analyzedAt = new Date().toISOString();
        
        log(`✅ 분석 완료: ${analysis.category} - ${analysis.mainSubject} (${analysis.mood})`);
        
        return analysis;
        
    } catch (error) {
        log(`❌ 사진 분석 실패 (${photoNumber}): ${error.message}`);
        
        // 에러 시 기본 데이터 반환
        return {
            photoNumber: photoNumber,
            fileName: String(photoNumber).padStart(6, "0") + ".jpg",
            url: getPhotoUrl(photoNumber),
            category: "error",
            mainSubject: "분석 실패",
            mood: "calm",
            timeOfDay: "unknown",
            description: "분석 중 오류 발생",
            photoStyle: "casual",
            colors: "neutral,soft",
            isYejinPhoto: true,
            error: error.message,
            analyzedAt: new Date().toISOString()
        };
    }
}

// ================== 💾 데이터 저장 ==================
async function saveAnalysisData(analysisData) {
    try {
        // 디렉토리 생성 확인
        const dir = path.dirname(ANALYSIS_OUTPUT_FILE);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            log('📁 /data 디렉토리 생성 완료');
        }
        
        // JSON 파일로 저장
        const jsonData = JSON.stringify(analysisData, null, 2);
        await fs.writeFile(ANALYSIS_OUTPUT_FILE, jsonData, 'utf8');
        
        log(`💾 분석 데이터 저장 완료: ${Object.keys(analysisData).length}장`);
        log(`📄 저장 경로: ${ANALYSIS_OUTPUT_FILE}`);
        
        return true;
    } catch (error) {
        log(`❌ 데이터 저장 실패: ${error.message}`);
        return false;
    }
}

// ================== 🔄 기존 데이터 로딩 ==================
async function loadExistingAnalysis() {
    try {
        const data = await fs.readFile(ANALYSIS_OUTPUT_FILE, 'utf8');
        const existingData = JSON.parse(data);
        log(`📂 기존 분석 데이터 로딩: ${Object.keys(existingData).length}장`);
        return existingData;
    } catch (error) {
        log('📂 기존 분석 데이터 없음 - 새로 시작');
        return {};
    }
}

// ================== 📊 진행률 계산 ==================
function calculateProgress(current, total) {
    const percentage = ((current / total) * 100).toFixed(1);
    const progressBar = '█'.repeat(Math.floor(current / total * 20)) + 
                       '░'.repeat(20 - Math.floor(current / total * 20));
    return `${progressBar} ${percentage}% (${current}/${total})`;
}

// ================== 💰 비용 계산 ==================
function calculateCost(photoCount) {
    const costPerPhoto = 0.00225; // Vision API 대략적 비용 (저해상도 기준)
    const totalCost = photoCount * costPerPhoto;
    const costInKRW = totalCost * 1380; // 1 USD = 1380 KRW 가정
    
    return {
        usd: totalCost.toFixed(3),
        krw: Math.round(costInKRW)
    };
}

// ================== 🚀 메인 분석 함수 ==================
async function analyzeAllPhotos() {
    log('🚀 사진 분석 시작!');
    
    // 분석할 사진 목록 결정
    const photosToAnalyze = TEST_MODE ? TEST_PHOTOS : Array.from({length: TOTAL_PHOTOS}, (_, i) => i + 1);
    
    // 비용 안내
    const cost = calculateCost(photosToAnalyze.length);
    log(`💰 예상 비용: ${cost.usd} (약 ${cost.krw}원)`);
    log(`📊 분석 대상: ${photosToAnalyze.length}장 ${TEST_MODE ? '(테스트 모드)' : '(전체 모드)'}`);
    log(`🔄 재분석 모드: ${FORCE_REANALYZE ? 'ON (기존 데이터 무시)' : 'OFF (기존 데이터 건너뛰기)'}`);
    
    // 기존 분석 데이터 로딩
    let analysisData = await loadExistingAnalysis();
    
    // 분석 시작
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < photosToAnalyze.length; i++) {
        const photoNumber = photosToAnalyze[i];
        const fileName = String(photoNumber).padStart(6, "0");
        
        // 이미 분석된 사진은 건너뛰기 (FORCE_REANALYZE가 false일 때만)
        if (!FORCE_REANALYZE && analysisData[fileName]) {
            log(`⏭️ 건너뛰기: ${fileName}.jpg (이미 분석됨)`);
            continue;
        } else if (FORCE_REANALYZE && analysisData[fileName]) {
            log(`🔄 재분석: ${fileName}.jpg (강제 재분석 모드)`);
        }
        
        // 진행률 표시
        log(`📈 진행률: ${calculateProgress(i + 1, photosToAnalyze.length)}`);
        
        try {
            // 사진 분석
            const analysis = await analyzePhoto(photoNumber);
            
            // 결과 저장
            analysisData[fileName] = analysis;
            
            if (analysis.error) {
                errorCount++;
            } else {
                successCount++;
            }
            
            // 중간 저장 (10장마다)
            if ((i + 1) % 10 === 0) {
                await saveAnalysisData(analysisData);
                log(`💾 중간 저장 완료: ${i + 1}장`);
            }
            
            // API 호출 제한 방지를 위한 딜레이
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            log(`❌ 사진 ${photoNumber} 분석 중 오류: ${error.message}`);
            errorCount++;
        }
    }
    
    // 최종 저장
    await saveAnalysisData(analysisData);
    
    // 결과 요약
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(1); // 분 단위
    
    log('🎉 분석 완료!');
    log(`📊 결과 요약:`);
    log(`   - 성공: ${successCount}장`);
    log(`   - 실패: ${errorCount}장`);
    log(`   - 총 시간: ${duration}분`);
    log(`   - 저장 위치: ${ANALYSIS_OUTPUT_FILE}`);
    
    // 샘플 데이터 표시
    const sampleKeys = Object.keys(analysisData).slice(0, 3);
    log(`📝 샘플 분석 결과:`);
    sampleKeys.forEach(key => {
        const data = analysisData[key];
        log(`   ${key}: ${data.category} - ${data.mainSubject} (${data.mood})`);
    });
}

// ================== 🧪 테스트 함수 ==================
async function testSinglePhoto() {
    log('🧪 단일 사진 테스트 시작');
    
    const testPhotoNumber = 1;
    const analysis = await analyzePhoto(testPhotoNumber);
    
    log('🧪 테스트 결과:');
    console.log(JSON.stringify(analysis, null, 2));
    
    return analysis;
}

// ================== 📋 사용법 안내 ==================
function showUsage() {
    console.log(`
🎯 사진 분석 스크립트 사용법:

📋 명령어:
  node photo-analyzer.js                 # 분석 실행 (테스트/전체 모드는 코드에서 설정)
  node photo-analyzer.js test            # 단일 사진 테스트
  node photo-analyzer.js help            # 이 도움말 표시

⚙️ 설정 변경:
  - TEST_MODE = true        : 5장만 테스트 (약 15원)
  - TEST_MODE = false       : 전체 1481장 (약 4,600원)
  - FORCE_REANALYZE = true  : 기존 데이터 무시하고 재분석
  - FORCE_REANALYZE = false : 기존 데이터 건너뛰기

📁 출력 파일:
  - ${ANALYSIS_OUTPUT_FILE}

💡 사용 전 확인사항:
  1. OPENAI_API_KEY 환경변수 설정
  2. /data 디렉토리 쓰기 권한
  3. 인터넷 연결 상태
`);
}

// ================== 🚀 메인 실행 ==================
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'test':
            await testSinglePhoto();
            break;
        case 'help':
            showUsage();
            break;
        default:
            await analyzeAllPhotos();
            break;
    }
}

// 스크립트 직접 실행 시에만 main 함수 호출
if (require.main === module) {
    main().catch(error => {
        log(`❌ 스크립트 실행 실패: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    analyzePhoto,
    analyzeAllPhotos,
    testSinglePhoto,
    saveAnalysisData,
    loadExistingAnalysis,
    getPhotoUrl,
    calculateCost,
    log
};
