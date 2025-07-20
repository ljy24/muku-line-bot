// ============================================================================
// muku-moduleLoader.js v1.2 DISK_MOUNT + CONFLICT - 모듈 로딩 전용 시스템 (갈등 시스템 추가)
// ✅ diarySystem 로딩 문제 완전 해결
// ✅ unifiedConflictManager 갈등 시스템 추가
// 📦 25개 모듈을 6단계로 안전하게 로딩
// 🔄 초기화와 완전 분리하여 안정성 극대화
// 💾 디스크 마운트 경로 적용: /data 경로 확인 및 생성
// 💥 갈등 관리 시스템 완전 통합
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
    mount: '\x1b[1m\x1b[94m', // 💾 디스크 마운트용 색상
    conflict: '\x1b[1m\x1b[31m', // 💥 갈등 시스템용 색상 추가
    reset: '\x1b[0m'
};

// ================== 💾 디스크 마운트 확인 함수 ==================
async function ensureDiskMountPath() {
    try {
        const DISK_MOUNT_PATH = '/data';
        
        console.log(`${colors.mount}💾 [디스크마운트] 경로 확인 시작: ${DISK_MOUNT_PATH}${colors.reset}`);
        
        // 디렉토리 존재 확인
        if (!fs.existsSync(DISK_MOUNT_PATH)) {
            console.log(`${colors.mount}📁 [디스크마운트] 경로 생성: ${DISK_MOUNT_PATH}${colors.reset}`);
            fs.mkdirSync(DISK_MOUNT_PATH, { recursive: true });
        } else {
            console.log(`${colors.mount}✅ [디스크마운트] 경로 확인 완료: ${DISK_MOUNT_PATH}${colors.reset}`);
        }
        
        // 쓰기 권한 테스트
        const testFile = path.join(DISK_MOUNT_PATH, 'mount_test.tmp');
        try {
            fs.writeFileSync(testFile, 'disk mount test');
            fs.unlinkSync(testFile);
            console.log(`${colors.mount}✅ [디스크마운트] 쓰기 권한 확인 완료${colors.reset}`);
            return true;
        } catch (writeError) {
            console.log(`${colors.error}❌ [디스크마운트] 쓰기 권한 없음: ${writeError.message}${colors.reset}`);
            return false;
        }
        
    } catch (error) {
        console.log(`${colors.error}❌ [디스크마운트] 경로 설정 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);
        
        // ⭐️ 디스크 마운트 경로 먼저 확인 ⭐️
        console.log(`${colors.mount}💾💾💾 [최우선] 디스크 마운트 경로 확인 및 생성! 💾💾💾${colors.reset}`);
        const diskMountReady = await ensureDiskMountPath();
        if (diskMountReady) {
            console.log(`${colors.mount}🎉 [디스크마운트] 완전 영구 저장 준비 완료!${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ [디스크마운트] 설정 실패 - 기본 경로로 동작${colors.reset}`);
        }

        // =================== 1단계: 핵심 로깅 시스템 ===================
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/25] enhancedLogging v3.0: 완전체 로깅 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/25] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
            modules.enhancedLogging = null;
        }

        // =================== 2단계: 기본 응답 시스템 ===================
        try {
            modules.autoReply = require('./autoReply');
            console.log(`${colors.system}✅ [2/25] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/25] autoReply 로드 실패: ${error.message}${colors.reset}`);
            modules.autoReply = null;
        }

        // =================== 3단계: 기억 관리 시스템 (💾 디스크 마운트 적용) ===================
        try {
            modules.memoryManager = require('./memoryManager');
            console.log(`${colors.system}✅ [3/25] memoryManager: 고정 기억 시스템 (120개) (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/25] memoryManager 로드 실패: ${error.message}${colors.reset}`);
            modules.memoryManager = null;
        }

        try {
            modules.ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}✅ [4/25] ultimateContext: 동적 기억 시스템 (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/25] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
            modules.ultimateContext = null;
        }

        // =================== 4단계: 명령어 및 감정 시스템 ===================
        try {
            modules.commandHandler = require('./commandHandler');
            console.log(`${colors.system}✅ [5/25] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/25] commandHandler 로드 실패: ${error.message}${colors.reset}`);
            modules.commandHandler = null;
        }

        try {
            modules.emotionalContextManager = require('./emotionalContextManager');
            console.log(`${colors.system}✅ [6/25] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [6/25] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalContextManager = null;
        }

        try {
            modules.sulkyManager = require('./sulkyManager');
            console.log(`${colors.system}✅ [7/25] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [7/25] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            modules.sulkyManager = null;
        }

        try {
            modules.moodManager = require('./moodManager');
            console.log(`${colors.system}✅ [8/25] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/25] moodManager 로드 실패: ${error.message}${colors.reset}`);
            modules.moodManager = null;
        }

        // ⭐️⭐️⭐️ 갈등 관리 시스템 최우선 로딩! (💾 디스크 마운트 적용) ⭐️⭐️⭐️
        console.log(`${colors.conflict}💥💥💥 [갈등 최우선] muku-unifiedConflictManager 모듈 로드 시작! (💾 디스크 마운트 연동) 💥💥💥${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const conflictModulePath = path.resolve(__dirname, 'muku-unifiedConflictManager.js');
            console.log(`${colors.conflict}📁 [갈등] 파일 경로: ${conflictModulePath}${colors.reset}`);
            
            if (fs.existsSync(conflictModulePath)) {
                console.log(`${colors.conflict}✅ [갈등] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [갈등] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[conflictModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.unifiedConflictManager = require('./muku-unifiedConflictManager');
                
                // 3단계: 모듈 검증
                if (modules.unifiedConflictManager) {
                    console.log(`${colors.conflict}✅ [갈등] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.conflict}🔍 [갈등] 사용 가능한 함수들:`, Object.keys(modules.unifiedConflictManager));
                    
                    // 4단계: 필수 함수 확인
                    const requiredFunctions = ['initializeConflictSystem', 'getConflictStatus', 'triggerConflict', 'resolveConflict'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.unifiedConflictManager[func] === 'function') {
                            console.log(`${colors.conflict}✅ [갈등] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [갈등] ${func} 함수 없음!${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.conflict}🎉 [9/25] unifiedConflictManager: 갈등 관리 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [9/25] unifiedConflictManager: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${conflictModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [9/25] unifiedConflictManager 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [갈등] 상세 에러:`, error.stack);
            modules.unifiedConflictManager = null;
        }

        // =================== 5단계: 능동 시스템 + 사진 시스템 ===================
        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.pms}✅ [10/25] spontaneousYejin: 예진이 능동 메시지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/25] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        try {
            modules.spontaneousPhoto = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [11/25] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/25] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousPhoto = null;
        }

        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [12/25] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/25] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
            modules.photoAnalyzer = null;
        }

        try {
            modules.nightWakeResponse = require('./night_wake_response');
            console.log(`${colors.system}✅ [13/25] nightWakeResponse: 새벽 대화 반응 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [13/25] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
            modules.nightWakeResponse = null;
        }

        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [14/25] birthdayDetector: 생일 감지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [14/25] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.birthdayDetector = null;
        }

        // =================== 6단계: 스케줄러 시스템 ===================
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [15/25] scheduler: 자동 메시지 스케줄러${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [15/25] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [16/25] weatherManager: 실시간 날씨 API 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [16/25] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // =================== 7단계: 신규 시스템들 (사람 학습 + 일기장) (💾 디스크 마운트 적용) ===================
        try {
            modules.personLearning = require('./muku-personLearningSystem');
            console.log(`${colors.person}✅ [17/25] personLearning: 사람 학습 시스템 (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [17/25] personLearning 로드 실패: ${error.message}${colors.reset}`);
            modules.personLearning = null;
        }

        // ⭐️⭐️⭐️ 일기장 시스템 로딩 최우선 처리! (💾 디스크 마운트 적용) ⭐️⭐️⭐️
        console.log(`${colors.diary}🔥🔥🔥 [일기장 최우선] muku-diarySystem 모듈 로드 시작! (💾 디스크 마운트 연동) 🔥🔥🔥${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const diaryModulePath = path.resolve(__dirname, 'muku-diarySystem.js');
            console.log(`${colors.diary}📁 [일기장] 파일 경로: ${diaryModulePath}${colors.reset}`);
            
            if (fs.existsSync(diaryModulePath)) {
                console.log(`${colors.diary}✅ [일기장] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [일기장] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[diaryModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.diarySystem = require('./muku-diarySystem');
                
                // 3단계: 모듈 검증
                if (modules.diarySystem) {
                    console.log(`${colors.diary}✅ [일기장] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
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
                        console.log(`${colors.diary}🎉 [18/25] diarySystem: 일기장 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [18/25] diarySystem: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${diaryModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [18/25] diarySystem 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [일기장] 상세 에러:`, error.stack);
            modules.diarySystem = null;
        }

        // =================== 8단계: AI 고도화 시스템들 ===================
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [19/25] naturalLanguageProcessor: 자연어 처리 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [19/25] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [20/25] emotionalNuanceDetector: 감정 뉘앙스 감지기${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [20/25] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [21/25] predictiveCaringSystem: 예측적 돌봄 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [21/25] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        // =================== 9단계: 통합 & 최적화 시스템들 ===================
        try {
            modules.intelligentScheduler = require('./muku-intelligentScheduler');
            console.log(`${colors.intelligent}✅ [22/25] intelligentScheduler: 지능형 스케줄러 v2.0${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [22/25] intelligentScheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.intelligentScheduler = null;
        }

        try {
            modules.adaptivePersonality = require('./muku-adaptivePersonalitySystem');
            console.log(`${colors.personality}✅ [23/25] adaptivePersonality: 적응형 성격 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [23/25] adaptivePersonality 로드 실패: ${error.message}${colors.reset}`);
            modules.adaptivePersonality = null;
        }

        try {
            modules.qualityAssurance = require('./muku-qualityAssuranceEngine');
            console.log(`${colors.quality}✅ [24/25] qualityAssurance: 품질 보증 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [24/25] qualityAssurance 로드 실패: ${error.message}${colors.reset}`);
            modules.qualityAssurance = null;
        }

        // =================== 10단계: Face-API (지연 로딩) ===================
        console.log(`${colors.system}🔍 [25/25] faceMatcher: 지연 로딩 모드${colors.reset}`);

        // =================== 로딩 결과 요약 ===================
        const loadedCount = Object.values(modules).filter(module => module !== null).length;
        const totalModules = 24; // face-api 제외
        const loadSuccessRate = ((loadedCount / totalModules) * 100).toFixed(1);

        console.log(`${colors.system}📊 [로딩 완료] ${loadedCount}/${totalModules}개 모듈 성공 (${loadSuccessRate}%)${colors.reset}`);

        // ⭐️ 갈등 시스템 최종 확인 ⭐️
        if (modules.unifiedConflictManager) {
            console.log(`${colors.conflict}🎉🎉🎉 [갈등 성공!] unifiedConflictManager 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}💥💥💥 [갈등 실패!] unifiedConflictManager 모듈 로드 실패 - null 상태 💥💥💥${colors.reset}`);
        }

        // ⭐️ 일기장 시스템 최종 확인 ⭐️
        if (modules.diarySystem) {
            console.log(`${colors.diary}🎉🎉🎉 [일기장 성공!] diarySystem 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}💥💥💥 [일기장 실패!] diarySystem 모듈 로드 실패 - null 상태 💥💥💥${colors.reset}`);
        }

        // 💾 디스크 마운트 최종 상태 확인
        const finalDiskCheck = fs.existsSync('/data');
        console.log(`${colors.mount}💾 [최종확인] 디스크 마운트 상태: ${finalDiskCheck ? '✅ 완전 영구 저장 활성화!' : '❌ 기본 저장소 사용'}${colors.reset}`);

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return modules;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    ensureDiskMountPath,
    colors
};
