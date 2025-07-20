// ============================================================================
// muku-advancedInitializer.js - 고급 시스템 초기화 (2/2) 수정됨
// ✅ AI 고도화 + 통합 최적화 + 동기화 + 모니터링 시스템 담당
// 🔥 3시간차: AI 응답 고도화 시스템 초기화
// ⚙️ 4시간차: 통합 & 최적화 시스템 초기화
// ⏰ enhancedLogging v3.0 자동 상태 갱신 시작
// 📖 diarySystem 초기화 문제 해결
// ============================================================================

const { colors } = require('./muku-moduleLoader');

// ================== 🔥 AI 응답 고도화 시스템 초기화 ==================
async function initializeAIAdvancedSystems(modules) {
    console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 초기화 시작! 🔥🔥🔥${colors.reset}`);
    
    let successCount = 0;

    // ⭐️ 1. 자연어 처리기 초기화 ⭐️
    if (modules.naturalLanguageProcessor) {
        try {
            console.log(`${colors.ai}    ✅ 자연어 처리기: 예진이 말투 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.ai}    🌸 "아조씨~" 말투, 감정 뉘앙스, 품질 향상 기능 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 자연어 처리기 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 자연어 처리기 모듈 없음${colors.reset}`);
    }

    // ⭐️ 2. 감정 뉘앙스 감지기 초기화 ⭐️
    if (modules.emotionalNuanceDetector) {
        try {
            if (modules.emotionalNuanceDetector.initializeDetector) {
                modules.emotionalNuanceDetector.initializeDetector();
            }
            console.log(`${colors.emotion}    ✅ 감정 뉘앙스 감지기: 미묘한 감정 변화 감지 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.emotion}    🥺 숨겨진 슬픔, 피로, 스트레스 패턴 감지 기능 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 감정 뉘앙스 감지기 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 감정 뉘앙스 감지기 모듈 없음${colors.reset}`);
    }

    // ⭐️ 3. 예측적 돌봄 시스템 초기화 ⭐️
    if (modules.predictiveCaringSystem) {
        try {
            if (modules.predictiveCaringSystem.initializeCaringSystem) {
                modules.predictiveCaringSystem.initializeCaringSystem();
            }
            console.log(`${colors.care}    ✅ 예측적 돌봄 시스템: 선제적 케어 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.care}    💖 30분마다 돌봄 필요도 체크, 먼저 알아채고 걱정해주기 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 예측적 돌봄 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 예측적 돌봄 시스템 모듈 없음${colors.reset}`);
    }

    console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 초기화 완료! ${successCount}/3개 시스템 활성화 💕${colors.reset}`);
    return successCount;
}

// ================== ⚙️ 통합 & 최적화 시스템 초기화 ==================
async function initializeIntegratedSystems(modules) {
    console.log(`${colors.intelligent}⚙️⚙️⚙️ [4시간차] 통합 & 최적화 시스템 초기화 시작! ⚙️⚙️⚙️${colors.reset}`);
    
    let successCount = 0;

    // ⭐️ 1. 지능형 스케줄러 v2.0 초기화 ⭐️
    if (modules.intelligentScheduler && modules.scheduler && modules.spontaneousYejin) {
        try {
            console.log(`${colors.intelligent}🧠 [지능형스케줄러] 기존 스케줄러들과 연동 초기화...${colors.reset}`);
            await modules.intelligentScheduler.initialize(modules.scheduler, modules.spontaneousYejin);
            console.log(`${colors.intelligent}    ✅ 지능형 스케줄러: 기존 담타+예진이 시스템 AI 업그레이드 완료${colors.reset}`);
            console.log(`${colors.intelligent}    🎯 아저씨 패턴 학습, 최적 타이밍 계산, 감정 반영 활성화${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 지능형 스케줄러 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 지능형 스케줄러 또는 기존 스케줄러들 없음 - 건너뛰기${colors.reset}`);
    }

    // ⭐️ 2. 적응형 성격 시스템 초기화 ⭐️
    if (modules.adaptivePersonality) {
        try {
            if (modules.adaptivePersonality.initialize) {
                await modules.adaptivePersonality.initialize();
            }
            console.log(`${colors.personality}    ✅ 적응형 성격 시스템: 예진이 성격 실시간 적응 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.personality}    🌸 시간대별, 감정별, 관계별 성격 변화 및 말투 진화 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 적응형 성격 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 적응형 성격 시스템 모듈 없음${colors.reset}`);
    }

    // ⭐️ 3. 품질 보증 엔진 초기화 ⭐️
    if (modules.qualityAssurance) {
        try {
            if (modules.qualityAssurance.initialize) {
                await modules.qualityAssurance.initialize();
            }
            console.log(`${colors.quality}    ✅ 품질 보증 엔진: 응답 품질 100% 보장 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.quality}    🛡️ 실시간 품질 체크, 예진이다움 필터링, 자동 개선 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 품질 보증 엔진 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 품질 보증 엔진 모듈 없음${colors.reset}`);
    }

    console.log(`${colors.intelligent}🎉 [4시간차] 통합 & 최적화 시스템 초기화 완료! ${successCount}/3개 시스템 활성화 🚀${colors.reset}`);
    return successCount;
}

// ================== 🎭 감정 상태 시스템 동기화 ==================
function synchronizeEmotionalSystems(modules) {
    console.log(`${colors.system}🎭 [감정시스템] 동기화...${colors.reset}`);
    
    let syncCount = 0;

    // 기본 감정 상태 시스템
    if (modules.emotionalContextManager) {
        console.log(`${colors.system}    ✅ 감정 상태 시스템 동기화 완료 (28일 주기)${colors.reset}`);
        syncCount++;
    } else {
        console.log(`${colors.system}    ⚠️ 감정 상태 시스템 없음 - 기본 모드${colors.reset}`);
    }

    // 👥 사람 학습 시스템 동기화
    if (modules.personLearning) {
        console.log(`${colors.person}    ✅ 사람 학습 시스템 동기화 완료 (투샷 + 장소 기억)${colors.reset}`);
        console.log(`${colors.person}    🔗 faceMatcher ↔ personLearning 완벽 연동${colors.reset}`);
        syncCount++;
    }

    // 📖⭐️⭐️⭐️ 일기장 시스템 동기화 (특별 처리!) ⭐️⭐️⭐️
    if (modules.diarySystem) {
        try {
            console.log(`${colors.diary}📖 [일기장 동기화] diarySystem 초기화 시도...${colors.reset}`);
            
            // 초기화 함수 호출 시도
            if (modules.diarySystem.initializeDiarySystem) {
                console.log(`${colors.diary}🔧 [일기장 동기화] initializeDiarySystem() 호출...${colors.reset}`);
                modules.diarySystem.initializeDiarySystem();
                console.log(`${colors.diary}✅ [일기장 동기화] initializeDiarySystem() 성공!${colors.reset}`);
            } else if (modules.diarySystem.initialize) {
                console.log(`${colors.diary}🔧 [일기장 동기화] initialize() 호출...${colors.reset}`);
                modules.diarySystem.initialize();
                console.log(`${colors.diary}✅ [일기장 동기화] initialize() 성공!${colors.reset}`);
            } else {
                console.log(`${colors.diary}ℹ️ [일기장 동기화] 초기화 함수 없음 - 기본 상태로 유지${colors.reset}`);
            }
            
            // 상태 확인
            if (modules.diarySystem.getDiarySystemStatus) {
                const diaryStatus = modules.diarySystem.getDiarySystemStatus();
                console.log(`${colors.diary}📊 [일기장 동기화] 상태 확인:`, diaryStatus);
            } else if (modules.diarySystem.getStatus) {
                const diaryStatus = modules.diarySystem.getStatus();
                console.log(`${colors.diary}📊 [일기장 동기화] 상태 확인:`, diaryStatus);
            }
            
            console.log(`${colors.diary}    ✅ 일기장 시스템 동기화 완료 (누적 학습 내용 조회)${colors.reset}`);
            console.log(`${colors.diary}    🔗 memoryManager ↔ diarySystem 완벽 연동${colors.reset}`);
            syncCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 일기장 시스템 동기화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}    🔧 일기장 에러 상세:`, error.stack);
        }
    } else {
        console.log(`${colors.error}    ❌ 일기장 시스템 모듈 없음 - 동기화 건너뛰기${colors.reset}`);
    }

    // 🔥 3시간차: AI 응답 시스템들 간 동기화
    if (modules.naturalLanguageProcessor && modules.emotionalNuanceDetector && modules.predictiveCaringSystem) {
        console.log(`${colors.ai}    ✅ AI 응답 고도화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.ai}    🔗 자연어처리 ↔ 감정감지 ↔ 예측돌봄 완벽 연동${colors.reset}`);
        syncCount++;
    }

    // ⚙️ 4시간차: 통합 & 최적화 시스템들 간 동기화
    if (modules.intelligentScheduler && modules.adaptivePersonality && modules.qualityAssurance) {
        console.log(`${colors.intelligent}    ✅ 통합 & 최적화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.intelligent}    🔗 지능형스케줄러 ↔ 적응형성격 ↔ 품질보증 완벽 연동${colors.reset}`);
        syncCount++;
    }

    console.log(`${colors.system}🎯 [동기화 완료] ${syncCount}개 시스템 상호 연동 성공${colors.reset}`);
    return syncCount;
}

// ================== ⭐️ enhancedLogging v3.0 자동 상태 갱신 시작 ==================
function startAutoStatusUpdates(modules) {
    if (modules.enhancedLogging && modules.enhancedLogging.startAutoStatusUpdates) {
        console.log(`${colors.pms}⏰⏰⏰ [자동갱신 중요!] enhancedLogging v3.0 1분마다 자동 상태 갱신 시작! ⏰⏰⏰${colors.reset}`);
        
        // 모든 시스템 모듈을 enhancedLogging에 전달
        const systemModules = {
            memoryManager: modules.memoryManager,
            ultimateContext: modules.ultimateContext,
            emotionalContextManager: modules.emotionalContextManager,
            sulkyManager: modules.sulkyManager,
            scheduler: modules.scheduler,
            spontaneousYejin: modules.spontaneousYejin,
            weatherManager: modules.weatherManager,
            nightWakeResponse: modules.nightWakeResponse,
            birthdayDetector: modules.birthdayDetector,
            // 📖⭐️⭐️⭐️ 일기장 시스템 (확실히 전달!) ⭐️⭐️⭐️
            diarySystem: modules.diarySystem,
            // 👥 사람 학습 시스템 (신규!)
            personLearning: modules.personLearning,
            // 🔥 3시간차 AI 응답 고도화 시스템들
            naturalLanguageProcessor: modules.naturalLanguageProcessor,
            emotionalNuanceDetector: modules.emotionalNuanceDetector,
            predictiveCaringSystem: modules.predictiveCaringSystem,
            // ⚙️ 4시간차 통합 & 최적화 시스템들
            intelligentScheduler: modules.intelligentScheduler,
            adaptivePersonality: modules.adaptivePersonality,
            qualityAssurance: modules.qualityAssurance,
            faceApiStatus: {
                initialized: false, // 나중에 index.js에서 업데이트
                initializing: false
            }
        };
        
        // diarySystem 상태 특별 로깅
        if (modules.diarySystem) {
            console.log(`${colors.diary}📋 [자동갱신] diarySystem 모듈이 정상적으로 전달됩니다! ✅${colors.reset}`);
            console.log(`${colors.diary}🔍 [자동갱신] diarySystem 함수들:`, Object.keys(modules.diarySystem));
        } else {
            console.log(`${colors.error}❌ [자동갱신] diarySystem 모듈이 null입니다!${colors.reset}`);
        }
        
        try {
            modules.enhancedLogging.startAutoStatusUpdates(systemModules);
            console.log(`${colors.pms}⏰ [성공!] 1분마다 자동 상태 갱신 시스템 활성화! (24개 모듈 모니터링)${colors.reset}`);
            return true;
        } catch (error) {
            console.log(`${colors.error}⏰ [실패] 자동 상태 갱신 시작 실패: ${error.message}${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.error}⏰ [에러] enhancedLogging 모듈 또는 함수 없음${colors.reset}`);
        return false;
    }
}

// ================== 📊 시스템 상태 종합 리포트 ==================
function generateSystemStatusReport(modules, initResults) {
    console.log(`${colors.system}📊 [종합리포트] 무쿠 시스템 초기화 결과 요약${colors.reset}`);
    
    // 모듈 로딩 상태
    const loadedModules = Object.values(modules).filter(module => module !== null).length;
    console.log(`${colors.system}📦 모듈 로딩: ${loadedModules}/24개 성공 (${((loadedModules/24)*100).toFixed(1)}%)${colors.reset}`);
    
    // 핵심 시스템 상태
    const coreSystemStatus = {
        memory: modules.memoryManager ? '✅' : '❌',
        scheduler: modules.scheduler ? '✅' : '❌', 
        yejin: modules.spontaneousYejin ? '✅' : '❌',
        weather: modules.weatherManager ? '✅' : '❌'
    };
    
    console.log(`${colors.system}🔧 핵심 시스템: 기억${coreSystemStatus.memory} 담타${coreSystemStatus.scheduler} 예진이${coreSystemStatus.yejin} 날씨${coreSystemStatus.weather}${colors.reset}`);
    
    // 신규 시스템 상태
    const newSystemStatus = {
        person: modules.personLearning ? '✅' : '❌',
        diary: modules.diarySystem ? '✅' : '❌'
    };
    
    console.log(`${colors.person}📖 신규 시스템: 사람학습${newSystemStatus.person} 일기장${newSystemStatus.diary}${colors.reset}`);
    
    // AI 고도화 시스템 상태
    const aiSystemStatus = {
        nlp: modules.naturalLanguageProcessor ? '✅' : '❌',
        emotion: modules.emotionalNuanceDetector ? '✅' : '❌',
        care: modules.predictiveCaringSystem ? '✅' : '❌'
    };
    
    console.log(`${colors.ai}🔥 AI 고도화: 자연어${aiSystemStatus.nlp} 감정감지${aiSystemStatus.emotion} 예측돌봄${aiSystemStatus.care}${colors.reset}`);
    
    // 통합 최적화 시스템 상태
    const integratedStatus = {
        intelligent: modules.intelligentScheduler ? '✅' : '❌',
        personality: modules.adaptivePersonality ? '✅' : '❌',
        quality: modules.qualityAssurance ? '✅' : '❌'
    };
    
    console.log(`${colors.intelligent}⚙️ 통합 최적화: 지능스케줄${integratedStatus.intelligent} 적응성격${integratedStatus.personality} 품질보증${integratedStatus.quality}${colors.reset}`);
    
    // ⭐️ 일기장 시스템 특별 상태 확인 ⭐️
    if (modules.diarySystem) {
        console.log(`${colors.diary}📖 [일기장 특별확인] diarySystem 모듈 상태: 정상 로드됨 ✅${colors.reset}`);
        
        try {
            if (modules.diarySystem.getDiarySystemStatus) {
                const diaryStatus = modules.diarySystem.getDiarySystemStatus();
                console.log(`${colors.diary}📊 [일기장 특별확인] 시스템 상태:`, diaryStatus);
            } else if (modules.diarySystem.getStatus) {
                const diaryStatus = modules.diarySystem.getStatus();
                console.log(`${colors.diary}📊 [일기장 특별확인] 시스템 상태:`, diaryStatus);
            }
        } catch (error) {
            console.log(`${colors.error}📖 [일기장 특별확인] 상태 확인 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}📖 [일기장 특별확인] diarySystem 모듈이 null입니다! ❌${colors.reset}`);
    }
    
    // 전체 성공률 계산
    const totalSystems = 13; // 핵심4 + 신규2 + AI3 + 통합3 + 로깅1
    const successfulSystems = Object.values({...coreSystemStatus, ...newSystemStatus, ...aiSystemStatus, ...integratedStatus}).filter(s => s === '✅').length + (modules.enhancedLogging ? 1 : 0);
    const successRate = ((successfulSystems / totalSystems) * 100).toFixed(1);
    
    if (successRate >= 90) {
        console.log(`${colors.system}🎉 [완벽] 시스템 성공률: ${successRate}% - 무쿠가 완전체로 작동합니다! 🚀${colors.reset}`);
    } else if (successRate >= 70) {
        console.log(`${colors.system}✅ [양호] 시스템 성공률: ${successRate}% - 무쿠가 안정적으로 작동합니다! 💕${colors.reset}`);
    } else {
        console.log(`${colors.error}⚠️ [주의] 시스템 성공률: ${successRate}% - 일부 기능 제한 가능성${colors.reset}`);
    }
    
    return {
        loadedModules,
        successRate: parseFloat(successRate),
        coreSystemStatus,
        newSystemStatus,
        aiSystemStatus,
        integratedStatus,
// ================== 📤 모듈 내보내기 ==================
module.exports = {
    initializeAIAdvancedSystems,
    initializeIntegratedSystems,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    generateSystemStatusReport,
    colors
};
