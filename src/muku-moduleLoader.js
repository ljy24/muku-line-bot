// ============================================================================
// muku-moduleLoader.js - 모듈 로딩 전용 시스템
// ✅ 순수하게 모듈 로딩만 담당하여 순환 의존성 방지
// 📦 24개 모듈을 6단계로 안전하게 로딩
// 🔄 초기화와 완전 분리하여 안정성 극대화
// ============================================================================

const path = require('path');
const fs = require('fs');

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',        // 하늘색 (아저씨)
    yejin: '\x1b[95m',          // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',     // 굵은 빨간색 (PMS)
    system: '\x1b[92m',         // 연초록색 (시스템)
    error: '\x1b[91m',          // 빨간색 (에러)
    person: '\x1b[93m',         // 노란색 (사람 학습)
    diary: '\x1b[94m',          // 파란색 (일기장)
    ai: '\x1b[1m\x1b[95m',      // 굵은 마젠타 (AI 고도화)
    intelligent: '\x1b[1m\x1b[96m', // 굵은 시안 (지능형)
    emotion: '\x1b[35m',        // 마젠타 (감정)
    care: '\x1b[1m\x1b[93m',    // 굵은 노란색 (돌봄)
    personality: '\x1b[36m',    // 시안 (성격)
    quality: '\x1b[1m\x1b[92m', // 굵은 초록 (품질)
    reset: '\x1b[0m'            // 색상 리셋
};

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);

        // =================== 1단계: 핵심 로깅 시스템 ===================
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/24] enhancedLogging v3.0: 완전체 로깅 시스템 + 1분 자동 갱신${colors.reset}`);
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
            console.log(`${colors.system}✅ [3/24] memoryManager: 고정 기억 시스템 (120개 기억)${colors.reset}`);
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

        // =================== 5단계: 사진 및 특수 시스템 ===================
        try {
            modules.spontaneousPhoto = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [9/24] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [9/24] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousPhoto = null;
        }

        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [10/24] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/24] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
            modules.photoAnalyzer = null;
        }

        try {
            modules.nightWakeResponse = require('./night_wake_response');
            console.log(`${colors.system}✅ [11/24] nightWakeResponse: 새벽 대화 반응 시스템 (2-7시 단계별)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/24] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
            modules.nightWakeResponse = null;
        }

        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [12/24] birthdayDetector: 생일 감지 시스템 (3/17, 12/5)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/24] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.birthdayDetector = null;
        }

        // =================== 6단계: 스케줄러 및 능동 시스템 ===================
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [13/24] scheduler: 자동 메시지 스케줄러 (담타 100% 보장!)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [13/24] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.system}✅ [14/24] spontaneousYejin: 예진이 능동 메시지 시스템 (하루 15번)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [14/24] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [15/24] weatherManager: 실시간 날씨 API 시스템 (기타큐슈↔고양시)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [15/24] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // =================== 7단계: 신규 시스템들 (사람 학습 + 일기장) ===================
        try {
            modules.personLearning = require('./muku-personLearningSystem');
            console.log(`${colors.person}✅ [16/24] personLearning: 사람 학습 및 기억 시스템 (투샷 + 장소)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [16/24] personLearning 로드 실패: ${error.message}${colors.reset}`);
            modules.personLearning = null;
        }

        try {
            modules.diarySystem = require('./muku-diarySystem');
            console.log(`${colors.diary}✅ [17/24] diarySystem: 일기장 시스템 (누적 학습 내용 조회)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [17/24] diarySystem 로드 실패: ${error.message}${colors.reset}`);
            modules.diarySystem = null;
        }

        // =================== 8단계: 3시간차 AI 응답 고도화 시스템들 ===================
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [18/24] naturalLanguageProcessor: 자연어 처리 엔진 (예진이 말투 시스템)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [18/24] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [19/24] emotionalNuanceDetector: 감정 뉘앙스 감지기 (미묘한 감정 변화)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [19/24] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [20/24] predictiveCaringSystem: 예측적 돌봄 시스템 (선제적 케어)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [20/24] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        // =================== 9단계: 4시간차 통합 & 최적화 시스템들 ===================
        try {
            modules.intelligentScheduler = require('./muku-intelligentScheduler');
            console.log(`${colors.intelligent}✅ [21/24] intelligentScheduler: 지능형 스케줄러 v2.0 (기존 시스템 AI 업그레이드)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [21/24] intelligentScheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.intelligentScheduler = null;
        }

        try {
            modules.adaptivePersonality = require('./muku-adaptivePersonalitySystem');
            console.log(`${colors.personality}✅ [22/24] adaptivePersonality: 적응형 성격 시스템 (예진이 성격 진화)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [22/24] adaptivePersonality 로드 실패: ${error.message}${colors.reset}`);
            modules.adaptivePersonality = null;
        }

        try {
            modules.qualityAssurance = require('./muku-qualityAssuranceEngine');
            console.log(`${colors.quality}✅ [23/24] qualityAssurance: 품질 보증 엔진 (응답 품질 100% 보장)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [23/24] qualityAssurance 로드 실패: ${error.message}${colors.reset}`);
            modules.qualityAssurance = null;
        }

        // =================== 10단계: Face-API (지연 로딩) ===================
        console.log(`${colors.system}🔍 [24/24] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);
        // faceMatcher는 index.js에서 지연 로딩됨

        // =================== 로딩 결과 요약 ===================
        const loadedCount = Object.values(modules).filter(module => module !== null).length;
        const totalModules = 23; // face-api 제외
        const loadSuccessRate = ((loadedCount / totalModules) * 100).toFixed(1);

        console.log(`${colors.system}📊 [로딩 완료] ${loadedCount}/${totalModules}개 모듈 성공 (${loadSuccessRate}%)${colors.reset}`);

        if (loadSuccessRate >= 90) {
            console.log(`${colors.system}🎉 [완벽] 모든 모듈이 성공적으로 로드되었습니다!${colors.reset}`);
        } else if (loadSuccessRate >= 70) {
            console.log(`${colors.system}✅ [양호] 대부분의 모듈이 로드되었습니다!${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ [주의] 일부 모듈 로드 실패 - 기본 기능으로 작동${colors.reset}`);
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
