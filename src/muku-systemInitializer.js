// ============================================================================
// muku-systemInitializer.js - 메인 초기화 컨트롤러 (최종 통합)
// ✅ 분리된 초기화 시스템들을 통합 관리
// 🎛️ 핵심 시스템 + 고급 시스템을 순차적으로 초기화
// 📊 전체 시스템 상태 모니터링 및 리포트 제공
// 🚀 깔끔하고 관리하기 쉬운 구조로 재설계
// ============================================================================

const { loadAllModules, colors } = require('./muku-moduleLoader');
const {
    initializeCoreMemorySystems,
    initializeDamtaScheduler,
    initializeSpontaneousYejin,
    initializeNewSystems,
    initializeSpontaneousPhoto,
    testWeatherSystem
} = require('./muku-coreInitializer');
const {
    initializeAIAdvancedSystems,
    initializeIntegratedSystems,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    generateSystemStatusReport
} = require('./muku-advancedInitializer');

// ================== 🚀 통합 무쿠 시스템 초기화 함수 ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다... (분리된 아키텍처 v2.0)${colors.reset}`);
        console.log(`${colors.system}📋 [구조] 모듈로더 → 핵심초기화 → 고급초기화 → 동기화 → 모니터링${colors.reset}`);
        console.log(`${colors.diary}📖 일기장: DiarySystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습: PersonLearningSystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차: AI 응답 고도화 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차: 통합 & 최적화 버전으로 초기화합니다!${colors.reset}`);

        // =================== 1단계: 모듈 로딩 ===================
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (분리된 로더 사용)...${colors.reset}`);
        const modules = await loadAllModules();

        // =================== 2단계: 핵심 시스템 초기화 ===================
        console.log(`${colors.system}🧠 [2/6] 핵심 시스템 초기화 (기억 + 스케줄러 + 예진이)...${colors.reset}`);
        
        const initResults = {
            coreMemory: false,
            damtaScheduler: false,
            spontaneousYejin: false,
            newSystems: 0,
            photo: false,
            weather: false,
            aiSystems: 0,
            integratedSystems: 0,
            sync: 0,
            monitoring: false
        };

        // 2-1. 핵심 기억 시스템
        initResults.coreMemory = await initializeCoreMemorySystems(modules, client);
        
        // 2-2. 담타 스케줄러 (client 전달 포함)
        initResults.damtaScheduler = await initializeDamtaScheduler(modules, client);
        
        // 2-3. 예진이 능동 메시지
        initResults.spontaneousYejin = await initializeSpontaneousYejin(modules, client);
        
        // 2-4. 신규 시스템들 (사람 학습 + 일기장)
        initResults.newSystems = await initializeNewSystems(modules);

        // =================== 3단계: 추가 시스템 활성화 ===================
        console.log(`${colors.system}📸 [3/6] 추가 시스템 활성화 (사진 + 날씨)...${colors.reset}`);
        
        // 3-1. 자발적 사진 전송
        initResults.photo = await initializeSpontaneousPhoto(modules, client);
        
        // 3-2. 날씨 시스템 테스트
        initResults.weather = await testWeatherSystem(modules);

        // =================== 4단계: AI 고도화 시스템 ===================
        console.log(`${colors.ai}🔥 [4/6] AI 고도화 시스템 초기화...${colors.reset}`);
        initResults.aiSystems = await initializeAIAdvancedSystems(modules);

        // =================== 5단계: 통합 & 최적화 시스템 ===================
        console.log(`${colors.intelligent}⚙️ [5/6] 통합 & 최적화 시스템 초기화...${colors.reset}`);
        initResults.integratedSystems = await initializeIntegratedSystems(modules);

        // =================== 6단계: 동기화 & 모니터링 ===================
        console.log(`${colors.system}🎭 [6/6] 시스템 동기화 & 모니터링 시작...${colors.reset}`);
        
        // 6-1. 감정 및 상태 시스템 동기화
        initResults.sync = synchronizeEmotionalSystems(modules);
        
        // 6-2. enhancedLogging v3.0 자동 상태 갱신 시작
        initResults.monitoring = startAutoStatusUpdates(modules);

        // =================== 최종 리포트 생성 ===================
        const statusReport = generateSystemStatusReport(modules, initResults);

        // =================== 스케줄러 재시도 로직 (필요시) ===================
        if (!initResults.damtaScheduler && modules.scheduler && modules.scheduler.startAllSchedulers) {
            console.log(`${colors.pms}🚬 [재시도] 담타 스케줄러 재시도...${colors.reset}`);
            try {
                await modules.scheduler.startAllSchedulers(client);
                console.log(`${colors.pms}🚬 [성공] 스케줄러 재시도 성공!${colors.reset}`);
                initResults.damtaScheduler = true;
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 스케줄러 재시도 실패: ${error.message}${colors.reset}`);
            }
        }

        // =================== 최종 성공 판정 ===================
        const isSuccess = statusReport.successRate >= 70; // 70% 이상이면 성공으로 판정
        
        if (isSuccess) {
            console.log(`${colors.system}🎉 무쿠 시스템 초기화 완료! (성공률: ${statusReport.successRate}%)${colors.reset}`);
            console.log(`${colors.diary}📖 일기장 시스템 통합 완료! 이제 누적 학습 내용을 확인할 수 있어요! 💕${colors.reset}`);
            console.log(`${colors.person}👥 사람 학습 시스템 통합 완료! 이제 투샷 + 장소를 기억해요! 💕${colors.reset}`);
            console.log(`${colors.ai}🔥 3시간차 AI 응답 고도화 시스템 통합 완료! 이제 진짜 예진이가 되었어요! 💕${colors.reset}`);
            console.log(`${colors.intelligent}⚙️ 4시간차 통합 & 최적화 시스템 통합 완료! 무쿠가 완전체가 되었어요! 🚀${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ 무쿠 시스템 부분 초기화 완료 (성공률: ${statusReport.successRate}%)${colors.reset}`);
            console.log(`${colors.system}⚡ 일부 기능 제한으로 기본 모드로 작동합니다${colors.reset}`);
        }
        
        return {
            success: isSuccess,
            modules: modules,
            initResults: initResults,
            statusReport: statusReport
        };

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 무쿠 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(`${colors.error}에러 내용: ${error.message}${colors.reset}`);
        console.error(`${colors.error}스택 트레이스:`, error.stack);
        console.log(`${colors.system}⚡ 기본 모드로 계속 진행합니다...${colors.reset}`);
        
        return {
            success: false,
            modules: {},
            error: error.message,
            initResults: null,
            statusReport: null
        };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    initializeMukuSystems,
    colors
};
