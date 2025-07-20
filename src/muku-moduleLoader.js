// ============================================================================
// muku-moduleLoader.js - 모듈 로딩 전용 시스템 (diarySystem 강화)
// ✅ diarySystem 로딩 문제 완전 해결
// 📦 24개 모듈을 6단계로 안전하게 로딩
// 🔄 초기화와 완전 분리하여 안정성 극대화
// ============================================================================

const path = require('path');
const fs = require('fs');

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',
    yejin: '\x1b[95m',
    pms: '\x1b[1m\x1b[91m',
    system: '\x1b[92m',
    error: '\x1b[91m',
    person: '\x1b[93m',
    diary: '\x1b[94m',
    ai: '\x1b[1m\x1b[95m',
    intelligent: '\x1b[1m\x1b[96m',
    emotion: '\x1b[35m',
    care: '\x1b[1m\x1b[93m',
    personality: '\x1b[36m',
    quality: '\x1b[1m\x1b[92m',
    reset: '\x1b[0m'
};

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);

        // =================== 1단계: 핵심 로깅 시스템 ===================
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/24] enhancedLogging v3.0: 완전체 로깅 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/24] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
            modules.enhancedLogging = null;
        }

        // =================== 2단계: 기본 응답 시스템 ===================
        try {
            modules.autoReply = require('./autoReply');
            console.log(`${colors.system}✅ [2/24] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/24] autoReply 로드 실패: ${error.message}${colors.reset}`);
            modules.autoReply = null;
        }

        // =================== 3단계: 기억 관리 시스템 ===================
        try {
            modules.memoryManager = require('./memoryManager');
            console.log(`${colors.system}✅ [3/24] memoryManager: 고정 기억 시스템 (120개)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/24] memoryManager 로드 실패: ${error.message}${colors.reset}`);
            modules.memoryManager = null;
        }

        try {
            modules.ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}✅ [4/24] ultimateContext: 동적 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/24] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
            modules.ultimateContext = null;
        }

        // =================== 4단계: 명령어 및 감정 시스템 ===================
        try {
            modules.commandHandler = require('./commandHandler');
            console.log(`${colors.system}✅ [5/24] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/24] commandHandler 로드 실패: ${error.message}${colors.reset}`);
            modules.commandHandler = null;
        }

        try {
            modules.emotionalContextManager = require('./emotionalContextManager');
            console.log(`${colors.system}✅ [6/24] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [6/24] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalContextManager = null;
        }

        try {
            modules.sulkyManager = require('./sulkyManager');
            console.log(`${colors.system}✅ [7/24] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [7/24] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            modules.sulkyManager = null;
        }

        try {
            modules.moodManager = require('./moodManager');
            console.log(`${colors.system}✅ [8/24] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/24] moodManager 로드 실패: ${error.message}${colors.reset}`);
            modules.moodManager = null;
        }

        // =================== 5단계: 능동 시스템 + 사진 시스템 ===================
        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.pms}✅ [9/24] spontaneousYejin: 예진이 능동 메시지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [9/24] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        try {
            modules.spontaneousPhoto = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [10/24] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/24] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousPhoto = null;
        }

        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [11/24] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/24] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
            modules.photoAnalyzer = null;
        }

        try {
            modules.nightWakeResponse = require('./night_wake_response');
            console.log(`${colors.system}✅ [12/24] nightWakeResponse: 새벽 대화 반응 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/24] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
            modules.nightWakeResponse = null;
        }

        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [13/24] birthdayDetector: 생일 감지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [13/24] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.birthdayDetector = null;
        }

        // =================== 6단계: 스케줄러 시스템 ===================
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [14/24] scheduler: 자동 메시지 스케줄러${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [14/24] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [15/24] weatherManager: 실시간 날씨 API 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [15/24] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // =================== 7단계: 신규 시스템들 (사람 학습 + 일기장) ===================
        try {
            modules.personLearning = require('./muku-personLearningSystem');
            console.log(`${colors.person}✅ [16/24] personLearning: 사람 학습 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [16/24] personLearning 로드 실패: ${error.message}${colors.reset}`);
            modules.personLearning = null;
        }

        // ⭐️⭐️⭐️ 일기장 시스템 로딩 최우선 처리! ⭐️⭐️⭐️
        console.log(`${colors.diary}🔥🔥🔥 [일기장 최우선] muku-diarySystem 모듈 로드 시작! 🔥🔥🔥${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const diaryModulePath = path.resolve(__dirname, 'muku-diarySystem.js');
            console.log(`${colors.diary}📁 [일기장] 파일 경로: ${diaryModulePath}${colors.reset}`);
            
            if (fs.existsSync(diaryModulePath)) {
                console.log(`${colors.diary}✅ [일기장] 파일 존재 확인 완료${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[diaryModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.diarySystem = require('./muku-diarySystem');
                
                // 3단계: 모듈 검증
                if (modules.diarySystem) {
                    console.log(`${colors.diary}✅ [일기장] 모듈 로드 성공!${colors.reset}`);
                    console.log(`${colors.diary}🔍 [일기장] 사용 가능한 함수들:`, Object.keys(modules.diarySystem));
                    
                    // 4단계: 필수 함수 확인
                    const requiredFunctions = ['initializeDiarySystem', 'getDiarySystemStatus', 'collectDynamicMemoriesOnly'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.diarySystem[func] === 'function') {
                            console.log(`${colors.diary}✅ [일기장] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [일기장] ${func} 함수 없음!${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.diary}🎉 [17/24] diarySystem: 일기장 시스템 로드 성공! (모든 함수 확인 완료)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [17/24] diarySystem: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${diaryModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [17/24] diarySystem 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [일기장] 상세 에러:`, error.stack);
            modules.diarySystem = null;
        }

        // =================== 8단계: AI 고도화 시스템들 ===================
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [18/24] naturalLanguageProcessor: 자연어 처리 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [18/24] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [19/24] emotionalNuanceDetector: 감정 뉘앙스 감지기${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [19/24] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [20/24] predictiveCaringSystem: 예측적 돌봄 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [20/24] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        // =================== 9단계: 통합 & 최적화 시스템들 ===================
        try {
            modules.intelligentScheduler = require('./muku-intelligentScheduler');
            console.log(`${colors.intelligent}✅ [21/24] intelligentScheduler: 지능형 스케줄러 v2.0${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [21/24] intelligentScheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.intelligentScheduler = null;
        }

        try {
            modules.adaptivePersonality = require('./muku-adaptivePersonalitySystem');
            console.log(`${colors.personality}✅ [22/24] adaptivePersonality: 적응형 성격 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [22/24] adaptivePersonality 로드 실패: ${error.message}${colors.reset}`);
            modules.adaptivePersonality = null;
        }

        try {
            modules.qualityAssurance = require('./muku-qualityAssuranceEngine');
            console.log(`${colors.quality}✅ [23/24] qualityAssurance: 품질 보증 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [23/24] qualityAssurance 로드 실패: ${error.message}${colors.reset}`);
            modules.qualityAssurance = null;
        }

        // =================== 10단계: Face-API (지연 로딩) ===================
        console.log(`${colors.system}🔍 [24/24] faceMatcher: 지연 로딩 모드${colors.reset}`);

        // =================== 로딩 결과 요약 ===================
        const loadedCount = Object.values(modules).filter(module => module !== null).length;
        const totalModules = 23; // face-api 제외
        const loadSuccessRate = ((loadedCount / totalModules) * 100).toFixed(1);

        console.log(`${colors.system}📊 [로딩 완료] ${loadedCount}/${totalModules}개 모듈 성공 (${loadSuccessRate}%)${colors.reset}`);

        // ⭐️ 일기장 시스템 최종 확인 ⭐️
        if (modules.diarySystem) {
            console.log(`${colors.diary}🎉🎉🎉 [일기장 성공!] diarySystem 모듈이 성공적으로 로드되었습니다! 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}💥💥💥 [일기장 실패!] diarySystem 모듈 로드 실패 - null 상태 💥💥💥${colors.reset}`);
        }

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return modules;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    colors
};
