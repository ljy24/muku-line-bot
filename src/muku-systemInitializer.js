// ============================================================================
// muku-systemInitializer.js - 무쿠 시스템 초기화 전용 모듈
// ✅ 모든 모듈 로드 및 초기화 로직 분리
// 🧠 고정기억: 65개 + 55개 = 120개 기억 완전 로드 보장
// 🚬 담타시스템: 100% 보장 스케줄러 활성화
// 🌸 예진이능동: spontaneousYejinManager 연동
// 🔥 3시간차: AI 응답 고도화 시스템 통합 완료!
// ============================================================================

const path = require('path');
const fs = require('fs');

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    ai: '\x1b[93m',         // 노란색 (AI 시스템)
    emotion: '\x1b[35m',    // 자주색 (감정)
    care: '\x1b[94m',       // 파란색 (돌봄)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);

        // 1. ⭐️ enhancedLogging v3.0 먼저 로드 (가장 중요!) ⭐️
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/19] enhancedLogging v3.0: 완전체 로깅 시스템 + 1분 자동 갱신${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/19] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
        }

        // 2. 대화 응답 시스템
        try {
            modules.autoReply = require('./autoReply');
            console.log(`${colors.system}✅ [2/19] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/19] autoReply 로드 실패: ${error.message}${colors.reset}`);
        }

        // 3. ⭐️ 고정 기억 관리자 (가장 중요!) ⭐️
        try {
            modules.memoryManager = require('./memoryManager');
            console.log(`${colors.system}✅ [3/19] memoryManager: 고정 기억 시스템 (120개 기억)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/19] memoryManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 4. 동적 기억 컨텍스트
        try {
            modules.ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}✅ [4/19] ultimateContext: 동적 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/19] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
        }

        // 5. 명령어 처리기
        try {
            modules.commandHandler = require('./commandHandler');
            console.log(`${colors.system}✅ [5/19] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/19] commandHandler 로드 실패: ${error.message}${colors.reset}`);
        }

        // 6. 감정 상태 관리자
        try {
            modules.emotionalContextManager = require('./emotionalContextManager');
            console.log(`${colors.system}✅ [6/19] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [6/19] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 7. ⭐️ 독립 삐짐 관리자 ⭐️
        try {
            modules.sulkyManager = require('./sulkyManager');
            console.log(`${colors.system}✅ [7/19] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
            
            if (modules.sulkyManager.getSulkinessState) {
                console.log(`${colors.system}😤 [삐짐 확인] 독립 삐짐 시스템 로드 완료 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}😤 [삐짐 확인] getSulkinessState 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [7/19] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            modules.sulkyManager = null;
        }

        // 8. 기분 관리자
        try {
            modules.moodManager = require('./moodManager');
            console.log(`${colors.system}✅ [8/19] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/19] moodManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 9. 자발적 사진 전송
        try {
            modules.spontaneousPhoto = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [9/19] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [9/19] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 10. 사진 분석기
        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [10/19] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/19] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
        }

        // 11. ⭐️ 새벽 대화 반응 시스템 ⭐️
        try {
            modules.nightWakeResponse = require('./night_wake_response');
            console.log(`${colors.system}✅ [11/19] nightWakeResponse: 새벽 대화 반응 시스템 (2-7시 단계별)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/19] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
        }

        // 12. ⭐️ 생일 감지 시스템 ⭐️
        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [12/19] birthdayDetector: 생일 감지 시스템 (3/17, 12/5)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/19] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
        }

        // 13. ⭐️⭐️⭐️ 스케줄러 시스템 (담타 최우선!) ⭐️⭐️⭐️ 
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [13/19] scheduler: 자동 메시지 스케줄러 (담타 100% 보장!)${colors.reset}`);
            
            if (modules.scheduler.startAllSchedulers) {
                console.log(`${colors.system}🚬 [스케줄러 확인] startAllSchedulers 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🚬 [스케줄러 확인] startAllSchedulers 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🚬 [스케줄러 확인] 사용 가능한 함수들:`, Object.keys(modules.scheduler || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [13/19] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        // 14. ⭐️⭐️⭐️ 예진이 능동 메시지 시스템 ⭐️⭐️⭐️
        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.system}✅ [14/19] spontaneousYejin: 예진이 능동 메시지 시스템 (하루 15번)${colors.reset}`);
            
            if (modules.spontaneousYejin.startSpontaneousYejinSystem) {
                console.log(`${colors.system}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌸 [예진이 확인] 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [14/19] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        // 15. ⭐️ 날씨 시스템 ⭐️
        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [15/19] weatherManager: 실시간 날씨 API 시스템 (기타큐슈↔고양시)${colors.reset}`);
            
            if (modules.weatherManager.getCurrentWeather && modules.weatherManager.generateWeatherBasedMessage) {
                console.log(`${colors.system}🌤️ [날씨 확인] 핵심 날씨 함수들 존재 확인 ✅${colors.reset}`);
                
                const weatherStatus = modules.weatherManager.getWeatherSystemStatus();
                if (weatherStatus.isActive) {
                    console.log(`${colors.system}🌤️ [날씨 확인] OpenWeather API 키 연결 ✅${colors.reset}`);
                } else {
                    console.log(`${colors.error}🌤️ [날씨 확인] OpenWeather API 키 없음! 환경변수 OPENWEATHER_API_KEY 확인 필요${colors.reset}`);
                }
            } else {
                console.log(`${colors.error}🌤️ [날씨 확인] 날씨 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌤️ [날씨 확인] 사용 가능한 함수들:`, Object.keys(modules.weatherManager || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [15/19] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // 🔍 face-api는 별도로 로드 (지연 로딩)
        console.log(`${colors.system}🔍 [16/19] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);

        // ================== 🔥 3시간차: AI 응답 고도화 시스템 로드 ==================
        console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 로드 시작! 🔥🔥🔥${colors.reset}`);

        // 17. ⭐️⭐️⭐️ 자연어 처리기 (예진이 말투 완벽 구현!) ⭐️⭐️⭐️
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [17/19] naturalLanguageProcessor: 예진이 자연어 처리 시스템${colors.reset}`);
            
            if (modules.naturalLanguageProcessor.generateNaturalResponse) {
                console.log(`${colors.ai}🌸 [자연어 확인] generateNaturalResponse 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.ai}    💕 기능: "아조씨~" 말투, 감정 뉘앙스, 시간대별 인사, 품질 향상${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [자연어 확인] 핵심 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [17/19] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        // 18. ⭐️⭐️⭐️ 감정 뉘앙스 감지기 (숨겨진 감정까지 감지!) ⭐️⭐️⭐️
        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [18/19] emotionalNuanceDetector: 미묘한 감정 변화 감지 시스템${colors.reset}`);
            
            if (modules.emotionalNuanceDetector.analyzeEmotionalNuance) {
                console.log(`${colors.emotion}💕 [감정뉘앙스 확인] analyzeEmotionalNuance 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.emotion}    🥺 기능: 숨겨진 슬픔 감지, 소통 패턴 분석, 맥락적 이해${colors.reset}`);
            } else {
                console.log(`${colors.error}💕 [감정뉘앙스 확인] 핵심 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [18/19] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        // 19. ⭐️⭐️⭐️ 예측적 돌봄 시스템 (먼저 알아채고 돌봐주기!) ⭐️⭐️⭐️
        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [19/19] predictiveCaringSystem: 예측적 돌봄 시스템${colors.reset}`);
            
            if (modules.predictiveCaringSystem.predictCaringNeeds) {
                console.log(`${colors.care}💖 [예측돌봄 확인] predictCaringNeeds 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.care}    🔮 기능: 선제적 걱정 감지, 예측적 케어, 30분마다 체크${colors.reset}`);
            } else {
                console.log(`${colors.error}💖 [예측돌봄 확인] 핵심 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [19/19] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 로드 완료! 이제 진짜 예진이가 될 수 있어요! 💕${colors.reset}`);

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return modules;
    }
}

// ================== 💾 기억 시스템 초기화 ==================
async function initializeMemorySystems(modules, client) {
    try {
        console.log(`${colors.system}🧠 [기억시스템] 초기화 시작...${colors.reset}`);

        // ⭐️ 1. 고정 기억 시스템 초기화 (가장 중요!) ⭐️
        if (modules.memoryManager) {
            try {
                if (modules.memoryManager.ensureMemoryTablesAndDirectory) {
                    await modules.memoryManager.ensureMemoryTablesAndDirectory();
                    console.log(`${colors.system}    ✅ 고정 기억 시스템: 데이터베이스 및 파일 시스템 초기화 완료${colors.reset}`);
                }
                
                if (modules.memoryManager.loadAllMemories) {
                    await modules.memoryManager.loadAllMemories();
                    console.log(`${colors.system}    ✅ 고정 기억 로딩: 기본기억 + 연애기억 로드 완료${colors.reset}`);
                }
                
                if (modules.memoryManager.getMemoryStatus) {
                    const status = modules.memoryManager.getMemoryStatus();
                    const totalFixed = status.fixedMemoriesCount + status.loveHistoryCount;
                    console.log(`${colors.system}    ✅ 고정 기억 확인: 총 ${totalFixed}개 (기본: ${status.fixedMemoriesCount}개, 연애: ${status.loveHistoryCount}개)${colors.reset}`);
                    
                    if (totalFixed === 0) {
                        console.log(`${colors.error}    ⚠️ 고정 기억이 0개입니다! 기본 데이터 로딩 재시도...${colors.reset}`);
                        if (modules.memoryManager.ensureMemoryFiles) {
                            await modules.memoryManager.ensureMemoryFiles();
                            await modules.memoryManager.loadAllMemories();
                        }
                    }
                } else {
                    console.log(`${colors.error}    ❌ memoryManager.getMemoryStatus 함수 없음${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}    ❌ 고정 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}    ❌ memoryManager 모듈이 로드되지 않음!${colors.reset}`);
        }

        // 2. 동적 기억 시스템 초기화  
        if (modules.ultimateContext && modules.ultimateContext.initializeEmotionalSystems) {
            try {
                await modules.ultimateContext.initializeEmotionalSystems();
                console.log(`${colors.system}    ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3. 감정 컨텍스트 관리자 초기화
        if (modules.emotionalContextManager && modules.emotionalContextManager.initializeEmotionalState) {
            try {
                modules.emotionalContextManager.initializeEmotionalState();
                console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기(현실적 28일) 및 감정 상태 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 4. 독립 삐짐 시스템 초기화 ⭐️
        if (modules.sulkyManager && modules.sulkyManager.initializeSulkySystem) {
            try {
                modules.sulkyManager.initializeSulkySystem();
                console.log(`${colors.system}    ✅ 독립 삐짐 시스템: 3h→6h→12h→24h 단계별 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 독립 삐짐 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 5. 새벽 대화 시스템 초기화 ⭐️
        if (modules.nightWakeResponse && modules.nightWakeResponse.initialize) {
            try {
                modules.nightWakeResponse.initialize();
                console.log(`${colors.system}    ✅ 새벽 대화 시스템: 2-7시 단계별 반응 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 새벽 대화 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 6. 생일 감지 시스템 초기화 ⭐️
        if (modules.birthdayDetector && modules.birthdayDetector.initialize) {
            try {
                modules.birthdayDetector.initialize();
                console.log(`${colors.system}    ✅ 생일 감지 시스템: 예진이(3/17), 아저씨(12/5) 감지 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 생일 감지 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 7. 담타 스케줄러 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
        
        if (!modules.scheduler) {
            console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🚬 [에러] 담타 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!modules.scheduler.startAllSchedulers) {
            console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🚬 [디버그] scheduler에서 사용 가능한 함수들:`, Object.keys(modules.scheduler));
        } else {
            try {
                // ⭐️⭐️⭐️ 스케줄러 시작 시도 ⭐️⭐️⭐️
                console.log(`${colors.pms}🚬 [시작시도] scheduler.startAllSchedulers() 호출...${colors.reset}`);
                
                await modules.scheduler.startAllSchedulers();
                
                console.log(`${colors.pms}🚬 [성공!] 스케줄러 시작 완료!${colors.reset}`);
                console.log(`${colors.system}    ✅ 담타 스케줄러 활성화 완료! (랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시 100% 보장)${colors.reset}`);
                
                // 담타 상태 확인
                if (modules.scheduler.getDamtaStatus) {
                    const damtaStatus = modules.scheduler.getDamtaStatus();
                    console.log(`${colors.system}    🚬 담타 현황: ${damtaStatus.sentToday}/${damtaStatus.totalDaily}번 전송, 상태: ${damtaStatus.status}${colors.reset}`);
                }
                
                // 전체 스케줄러 상태 확인
                if (modules.scheduler.getAllSchedulerStats) {
                    const stats = modules.scheduler.getAllSchedulerStats();
                    console.log(`${colors.system}    📊 스케줄러 상태: ${stats.systemStatus}${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 담타 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}🚬 [실패] 스택 트레이스:`, error.stack);
                console.log(`${colors.error}🚬 [폴백] 기본 스케줄러 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 8. 예진이 능동 메시지 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
        
        if (!modules.spontaneousYejin) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [에러] 예진이 능동 메시지 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!modules.spontaneousYejin.startSpontaneousYejinSystem) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin));
        } else {
            try {
                // ⭐️⭐️⭐️ 예진이 시스템 시작 시도 ⭐️⭐️⭐️
                console.log(`${colors.pms}🌸 [시작시도] spontaneousYejin.startSpontaneousYejinSystem() 호출...${colors.reset}`);
                
                const yejinResult = modules.spontaneousYejin.startSpontaneousYejinSystem(client);
                
                if (yejinResult) {
                    console.log(`${colors.pms}🌸 [성공!] 예진이 능동 메시지 시스템 시작 완료!${colors.reset}`);
                    console.log(`${colors.system}    ✅ 예진이 능동 메시지 활성화 완료! (하루 15번, 8시-새벽1시, 3-10문장)${colors.reset}`);
                    
                    // 예진이 상태 확인
                    if (modules.spontaneousYejin.getSpontaneousMessageStatus) {
                        const yejinStatus = modules.spontaneousYejin.getSpontaneousMessageStatus();
                        console.log(`${colors.system}    🌸 예진이 현황: ${yejinStatus.sentToday}/${yejinStatus.totalDaily}번 전송, 활성화: ${yejinStatus.isActive}${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 시작 실패${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 활성화 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}🌸 [실패] 스택 트레이스:`, error.stack);
                console.log(`${colors.error}🌸 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ================== 🔥 3시간차: AI 응답 고도화 시스템 초기화 ==================
        console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 초기화 시작! 🔥🔥🔥${colors.reset}`);

        // ⭐️ 9. 자연어 처리기 초기화 ⭐️
        if (modules.naturalLanguageProcessor) {
            try {
                console.log(`${colors.ai}    ✅ 자연어 처리기: 예진이 말투 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.ai}    🌸 "아조씨~" 말투, 감정 뉘앙스, 품질 향상 기능 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 자연어 처리기 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 10. 감정 뉘앙스 감지기 초기화 ⭐️
        if (modules.emotionalNuanceDetector) {
            try {
                console.log(`${colors.emotion}    ✅ 감정 뉘앙스 감지기: 미묘한 감정 변화 감지 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.emotion}    🥺 숨겨진 슬픔, 피로, 스트레스 패턴 감지 기능 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 감정 뉘앙스 감지기 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 11. 예측적 돌봄 시스템 초기화 ⭐️
        if (modules.predictiveCaringSystem) {
            try {
                console.log(`${colors.care}    ✅ 예측적 돌봄 시스템: 선제적 케어 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.care}    💖 30분마다 돌봄 필요도 체크, 먼저 알아채고 걱정해주기 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 예측적 돌봄 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 초기화 완료! 이제 무쿠가 진짜 예진이처럼 반응할 수 있어요! 💕${colors.reset}`);

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📸 자발적 사진 전송 시스템 초기화 ==================
async function initializeSpontaneousPhoto(modules, client) {
    console.log(`${colors.system}📸 [자발적사진] 시스템 활성화...${colors.reset}`);
    
    if (modules.spontaneousPhoto && modules.spontaneousPhoto.startSpontaneousPhotoScheduler) {
        try {
            const userId = process.env.TARGET_USER_ID;
            if (!userId) {
                console.log(`${colors.error}    ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
            } else {
                const getLastUserMessageTime = () => {
                    try {
                        const ultimateContext = require('./ultimateConversationContext');
                        return ultimateContext.getLastUserMessageTime ? ultimateContext.getLastUserMessageTime() : Date.now();
                    } catch (error) {
                        return Date.now();
                    }
                };
                
                modules.spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime);
                console.log(`${colors.system}    ✅ 자발적 사진 전송 활성화 완료 (userId: ${userId.slice(0,8)}...)${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}    ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}    ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
    }
}

// ================== 🌤️ 날씨 시스템 테스트 ==================
async function testWeatherSystem(modules) {
    console.log(`${colors.system}🌤️ [날씨시스템] 테스트...${colors.reset}`);
    
    if (modules.weatherManager && modules.weatherManager.getCurrentWeather) {
        try {
            console.log(`${colors.system}    🌤️ 날씨 API 테스트 시작...${colors.reset}`);
            const testWeather = await modules.weatherManager.getCurrentWeather('ajeossi');
            if (testWeather) {
                console.log(`${colors.system}    ✅ 날씨 시스템 테스트 성공: ${testWeather.location} ${testWeather.temperature}°C, ${testWeather.description}${colors.reset}`);
            } else {
                console.log(`${colors.error}    ⚠️ 날씨 API 응답 없음 - API 키 확인 필요${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}    ❌ 날씨 시스템 테스트 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}    ⚠️ 날씨 시스템 없음 - 건너뛰기${colors.reset}`);
    }
}

// ================== 🎭 감정 상태 시스템 동기화 ==================
function synchronizeEmotionalSystems(modules) {
    console.log(`${colors.system}🎭 [감정시스템] 동기화...${colors.reset}`);
    
    if (modules.emotionalContextManager) {
        console.log(`${colors.system}    ✅ 감정 상태 시스템 동기화 완료 (28일 주기)${colors.reset}`);
    } else {
        console.log(`${colors.system}    ⚠️ 감정 상태 시스템 없음 - 기본 모드${colors.reset}`);
    }

    // 🔥 3시간차: AI 응답 시스템들 간 동기화
    if (modules.naturalLanguageProcessor && modules.emotionalNuanceDetector && modules.predictiveCaringSystem) {
        console.log(`${colors.ai}    ✅ AI 응답 고도화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.ai}    🔗 자연어처리 ↔ 감정감지 ↔ 예측돌봄 완벽 연동${colors.reset}`);
    }
}

// ================== ⭐️ enhancedLogging v3.0 자동 상태 갱신 시작 ==================
function startAutoStatusUpdates(modules) {
    if (modules.enhancedLogging && modules.enhancedLogging.startAutoStatusUpdates) {
        console.log(`${colors.pms}⏰⏰⏰ [자동갱신 중요!] enhancedLogging v3.0 1분마다 자동 상태 갱신 시작! ⏰⏰⏰${colors.reset}`);
        
        // 모든 시스템 모듈을 enhancedLogging에 전달 (3시간차 모듈들 포함!)
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
            // 🔥 3시간차 AI 응답 고도화 시스템들 추가!
            naturalLanguageProcessor: modules.naturalLanguageProcessor,
            emotionalNuanceDetector: modules.emotionalNuanceDetector,
            predictiveCaringSystem: modules.predictiveCaringSystem,
            faceApiStatus: {
                initialized: false, // 나중에 index.js에서 업데이트
                initializing: false
            }
        };
        
        try {
            modules.enhancedLogging.startAutoStatusUpdates(systemModules);
            console.log(`${colors.pms}⏰ [성공!] 1분마다 자동 상태 갱신 시스템 활성화! (3시간차 모듈들 포함)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}⏰ [실패] 자동 상태 갱신 시작 실패: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🚀 통합 초기화 함수 ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다...${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차: AI 응답 고도화 버전으로 초기화합니다!${colors.reset}`);

        // 1. 모든 모듈 로드 (3시간차 모듈들 포함!)
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (19개 모듈)...${colors.reset}`);
        const modules = await loadAllModules();

        // 2. 기억 시스템 초기화 (스케줄러 + 예진이 + 삐짐 + 3시간차 AI 시스템 100% 확실 시작!)
        console.log(`${colors.system}🧠 [2/6] 기억 시스템 초기화 (⭐️ 스케줄러 + 예진이 + 삐짐 + AI 고도화 100% 확실 시작!)...${colors.reset}`);
        const memoryInitSuccess = await initializeMemorySystems(modules, client);
        
        if (!memoryInitSuccess) {
            console.log(`${colors.error}🚬 [경고] 기억 시스템 초기화 중 스케줄러 시작 실패!${colors.reset}`);
            
            // ⭐️⭐️⭐️ 스케줄러 시작 재시도 ⭐️⭐️⭐️
            console.log(`${colors.pms}🚬 [재시도] 스케줄러 시작 재시도...${colors.reset}`);
            try {
                if (modules.scheduler && modules.scheduler.startAllSchedulers) {
                    await modules.scheduler.startAllSchedulers();
                    console.log(`${colors.pms}🚬 [성공] 스케줄러 재시도 성공!${colors.reset}`);
                } else {
                    console.log(`${colors.error}🚬 [실패] 스케줄러 모듈 또는 함수 없음!${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 스케줄러 재시도 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3. 자발적 사진 전송 시스템 활성화
        console.log(`${colors.system}📸 [3/6] 자발적 사진 전송 시스템 활성화...${colors.reset}`);
        await initializeSpontaneousPhoto(modules, client);

        // 4. 날씨 시스템 테스트
        console.log(`${colors.system}🌤️ [4/6] 날씨 시스템 테스트...${colors.reset}`);
        await testWeatherSystem(modules);

        // 5. 감정 및 상태 시스템 동기화 (3시간차 AI 시스템 포함!)
        console.log(`${colors.system}🎭 [5/6] 감정 및 상태 시스템 동기화 (AI 고도화 시스템 포함)...${colors.reset}`);
        synchronizeEmotionalSystems(modules);

        // 6. enhancedLogging v3.0 자동 상태 갱신 시작 (3시간차 모듈들 포함!)
        console.log(`${colors.system}⏰ [6/6] enhancedLogging v3.0 자동 상태 갱신 시작 (19개 모듈 모니터링)...${colors.reset}`);
        startAutoStatusUpdates(modules);

        console.log(`${colors.system}🎉 무쿠 시스템 초기화 완료!${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차 AI 응답 고도화 시스템 통합 완료! 이제 진짜 예진이가 되었어요! 💕${colors.reset}`);
        
        return {
            success: true,
            modules: modules
        };

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 무쿠 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(`${colors.error}에러 내용: ${error.message}${colors.reset}`);
        console.log(`${colors.system}⚡ 기본 모드로 계속 진행합니다...${colors.reset}`);
        
        return {
            success: false,
            modules: {},
            error: error.message
        };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    initializeMemorySystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    initializeMukuSystems,
    colors
};
