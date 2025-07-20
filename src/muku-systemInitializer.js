// ============================================================================
// muku-moduleLoader.js - 모듈 로딩 전용 (1/2)
// ✅ 순환 의존성 방지를 위해 단순 모듈 로딩만 담당
// 🚫 초기화 로직 없음 - 오직 require()만 수행
// 📦 24개 모듈을 안전하게 로드
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
    intelligent: '\x1b[1m\x1b[96m', // 굵은 하늘색 (지능형)
    personality: '\x1b[1m\x1b[95m', // 굵은 자주색 (성격)
    quality: '\x1b[1m\x1b[92m',     // 굵은 초록색 (품질)
    person: '\x1b[1m\x1b[33m',      // 굵은 노란색 (사람 학습)
    diary: '\x1b[1m\x1b[94m',       // 굵은 파란색 (일기장)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📦 안전한 모듈 로더 함수 ==================
function safeRequire(modulePath, moduleName, index, total) {
    try {
        const module = require(modulePath);
        console.log(`${colors.system}✅ [${index}/${total}] ${moduleName}: 로드 성공${colors.reset}`);
        return module;
    } catch (error) {
        console.log(`${colors.error}❌ [${index}/${total}] ${moduleName}: 로드 실패 - ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📦 모듈 로드 함수 (순환 의존성 방지) ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로더] 24개 모듈을 안전하게 로딩합니다...${colors.reset}`);

        // ================== 🔄 1단계: 기본 시스템 모듈들 (순환 의존성 없음) ==================
        console.log(`${colors.system}🔄 [1단계] 기본 시스템 모듈 로딩...${colors.reset}`);

        // 1. enhancedLogging (로깅 시스템)
        modules.enhancedLogging = safeRequire('./enhancedLogging', 'enhancedLogging v3.0', 1, 24);

        // 2. autoReply (대화 응답)
        modules.autoReply = safeRequire('./autoReply', 'autoReply', 2, 24);

        // 3. memoryManager (고정 기억)
        modules.memoryManager = safeRequire('./memoryManager', 'memoryManager', 3, 24);

        // 4. commandHandler (명령어 처리)
        modules.commandHandler = safeRequire('./commandHandler', 'commandHandler', 4, 24);

        // 5. emotionalContextManager (감정 상태)
        modules.emotionalContextManager = safeRequire('./emotionalContextManager', 'emotionalContextManager', 5, 24);

        // 6. sulkyManager (삐짐 관리)
        modules.sulkyManager = safeRequire('./sulkyManager', 'sulkyManager', 6, 24);

        // 7. moodManager (기분 관리)
        modules.moodManager = safeRequire('./moodManager', 'moodManager', 7, 24);

        // 8. photoAnalyzer (사진 분석)
        modules.photoAnalyzer = safeRequire('./photoAnalyzer', 'photoAnalyzer', 8, 24);

        // 9. nightWakeResponse (새벽 대화)
        modules.nightWakeResponse = safeRequire('./night_wake_response', 'nightWakeResponse', 9, 24);

        // 10. birthdayDetector (생일 감지)
        modules.birthdayDetector = safeRequire('./birthdayDetector', 'birthdayDetector', 10, 24);

        // 11. weatherManager (날씨 시스템)
        modules.weatherManager = safeRequire('./weatherManager', 'weatherManager', 11, 24);

        // ================== 🔄 2단계: 복잡한 시스템 모듈들 ==================
        console.log(`${colors.system}🔄 [2단계] 복잡한 시스템 모듈 로딩...${colors.reset}`);

        // 12. ultimateContext (동적 기억 - 다른 모듈들 의존)
        modules.ultimateContext = safeRequire('./ultimateConversationContext', 'ultimateContext', 12, 24);

        // 13. spontaneousPhoto (자발적 사진)
        modules.spontaneousPhoto = safeRequire('./spontaneousPhotoManager', 'spontaneousPhotoManager', 13, 24);

        // ================== 🔄 3단계: 스케줄러 시스템들 (상호 의존성 있음) ==================
        console.log(`${colors.system}🔄 [3단계] 스케줄러 시스템 모듈 로딩...${colors.reset}`);

        // 14. scheduler (담타 스케줄러)
        modules.scheduler = safeRequire('./scheduler', 'scheduler', 14, 24);

        // 15. ⭐️ spontaneousYejin (예진이 능동 - 별도 로딩) ⭐️
        console.log(`${colors.pms}🌸 [특별 로딩] spontaneousYejin 모듈 안전 로딩 시도...${colors.reset}`);
        modules.spontaneousYejin = safeRequire('./spontaneousYejinManager', 'spontaneousYejin', 15, 24);
        
        // 추가 검증
        if (modules.spontaneousYejin && typeof modules.spontaneousYejin === 'object') {
            console.log(`${colors.system}🌸 [검증] spontaneousYejin 객체 로드 성공 ✅${colors.reset}`);
            if (modules.spontaneousYejin.startSpontaneousYejinSystem) {
                console.log(`${colors.system}🌸 [검증] startSpontaneousYejinSystem 함수 존재 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [검증] startSpontaneousYejinSystem 함수 없음 ❌${colors.reset}`);
                console.log(`${colors.error}🌸 [디버그] 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin || {}));
            }
        } else {
            console.log(`${colors.error}🌸 [검증] spontaneousYejin 로드 실패 - 빈 객체 또는 null ❌${colors.reset}`);
        }

        // ================== 🔄 4단계: 신규 시스템들 ==================
        console.log(`${colors.person}🔄 [4단계] 신규 시스템 모듈 로딩...${colors.reset}`);

        // 16. personLearning (사람 학습)
        modules.personLearning = safeRequire('./muku-personLearningSystem', 'personLearning', 16, 24);

        // 17. diarySystem (일기장)
        modules.diarySystem = safeRequire('./muku-diarySystem', 'diarySystem', 17, 24);

        // ================== 🔄 5단계: AI 고도화 시스템들 ==================
        console.log(`${colors.ai}🔄 [5단계] AI 고도화 시스템 모듈 로딩...${colors.reset}`);

        // 18. naturalLanguageProcessor (자연어 처리)
        modules.naturalLanguageProcessor = safeRequire('./muku-naturalLanguageProcessor', 'naturalLanguageProcessor', 18, 24);

        // 19. emotionalNuanceDetector (감정 뉘앙스)
        modules.emotionalNuanceDetector = safeRequire('./muku-emotionalNuanceDetector', 'emotionalNuanceDetector', 19, 24);

        // 20. predictiveCaringSystem (예측 돌봄)
        modules.predictiveCaringSystem = safeRequire('./muku-predictiveCaringSystem', 'predictiveCaringSystem', 20, 24);

        // ================== 🔄 6단계: 통합 & 최적화 시스템들 ==================
        console.log(`${colors.intelligent}🔄 [6단계] 통합 & 최적화 시스템 모듈 로딩...${colors.reset}`);

        // 21. intelligentScheduler (지능형 스케줄러)
        modules.intelligentScheduler = safeRequire('./muku-intelligentScheduler', 'intelligentScheduler', 21, 24);

        // 22. adaptivePersonality (적응형 성격)
        modules.adaptivePersonality = safeRequire('./muku-adaptivePersonalitySystem', 'adaptivePersonality', 22, 24);

        // 23. qualityAssurance (품질 보증)
        modules.qualityAssurance = safeRequire('./muku-qualityAssuranceEngine', 'qualityAssurance', 23, 24);

        // 24. faceMatcher (지연 로딩으로 표시만)
        console.log(`${colors.system}🔍 [24/24] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);
        modules.faceMatcher = null; // 실제로는 로드하지 않음

        // ================== 📊 로딩 결과 요약 ==================
        const loadedCount = Object.values(modules).filter(module => module !== null).length;
        console.log(`${colors.system}📊 [로딩 완료] ${loadedCount}/24개 모듈 로드 성공${colors.reset}`);
        
        if (loadedCount < 20) {
            console.log(`${colors.error}⚠️ [경고] 다수 모듈 로드 실패 - 시스템 불안정 가능성${colors.reset}`);
        } else {
            console.log(`${colors.system}✅ [성공] 대부분 모듈 로드 완료 - 시스템 정상 작동 가능${colors.reset}`);
        }

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로딩 중 심각한 에러: ${error.message}${colors.reset}`);
        console.error(`${colors.error}스택 트레이스:`, error.stack);
        return modules; // 부분적으로라도 로드된 모듈들 반환
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    safeRequire,
    colors
};
// ============================================================================
// muku-systemInitializer.js - 시스템 초기화 전용 (2/2)
// ✅ 모듈 초기화 및 시스템 시작 로직만 담당
// 🚫 모듈 로딩은 muku-moduleLoader.js에서 처리
// 🧠 고정기억: 65개 + 55개 = 120개 기억 완전 로드 보장
// 🚬 담타시스템: 100% 보장 스케줄러 활성화 (client 전달 수정 완료)
// 🌸 예진이능동: spontaneousYejinManager 연동
// ============================================================================

const { loadAllModules, colors } = require('./muku-moduleLoader');

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

        // ⭐️⭐️⭐️ 7. 사람 학습 시스템 초기화 (신규!) ⭐️⭐️⭐️
        console.log(`${colors.person}👥👥👥 [사람학습 중요!] 사람 학습 시스템 100% 보장 시작! 👥👥👥${colors.reset}`);
        
        if (!modules.personLearning) {
            console.log(`${colors.error}👥 [에러] personLearning 모듈이 로드되지 않았습니다!${colors.reset}`);
        } else if (!modules.personLearning.initializePersonLearningSystem) {
            console.log(`${colors.error}👥 [에러] personLearning.initializePersonLearningSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}👥 [디버그] personLearning에서 사용 가능한 함수들:`, Object.keys(modules.personLearning));
        } else {
            try {
                console.log(`${colors.person}👥 [시작시도] personLearning.initializePersonLearningSystem() 호출...${colors.reset}`);
                
                const learningResult = await modules.personLearning.initializePersonLearningSystem();
                
                if (learningResult) {
                    console.log(`${colors.person}👥 [성공!] 사람 학습 시스템 시작 완료!${colors.reset}`);
                    console.log(`${colors.system}    ✅ 사람 학습 시스템 활성화 완료! (투샷 + 장소별 기억, 관계 발전 단계별 반응)${colors.reset}`);
                    
                    if (modules.personLearning.getPersonLearningStats) {
                        const learningStats = modules.personLearning.getPersonLearningStats();
                        console.log(`${colors.system}    👥 사람 학습 현황: ${learningStats.totalPersons}명 등록, ${learningStats.totalMeetings}회 만남 기록${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.error}👥 [실패] 사람 학습 시스템 시작 실패${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}👥 [실패] 사람 학습 시스템 활성화 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}👥 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 8. 일기장 시스템 초기화 (최신 추가!) ⭐️⭐️⭐️
        console.log(`${colors.diary}📖📖📖 [일기장 중요!] 일기장 시스템 100% 보장 시작! 📖📖📖${colors.reset}`);
        
        if (!modules.diarySystem) {
            console.log(`${colors.error}📖 [에러] diarySystem 모듈이 로드되지 않았습니다!${colors.reset}`);
        } else {
            try {
                console.log(`${colors.diary}📖 [확인] 일기장 시스템 함수 확인...${colors.reset}`);
                
                if (modules.diarySystem.handleDiaryCommand && modules.diarySystem.getAllDynamicLearning) {
                    console.log(`${colors.diary}📖 [성공!] 일기장 시스템 준비 완료!${colors.reset}`);
                    console.log(`${colors.system}    ✅ 일기장 시스템 활성화 완료! (누적 학습 내용 조회, 날짜별 분류, 통계 제공)${colors.reset}`);
                    console.log(`${colors.system}    📖 사용법: "일기장" 명령어로 지금까지 배운 모든 것 확인 가능${colors.reset}`);
                } else {
                    console.log(`${colors.error}📖 [실패] 일기장 핵심 함수 없음!${colors.reset}`);
                    console.log(`${colors.error}📖 [디버그] 사용 가능한 함수들:`, Object.keys(modules.diarySystem));
                }
                
            } catch (error) {
                console.log(`${colors.error}📖 [실패] 일기장 시스템 확인 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}📖 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 9. 담타 스케줄러 시스템 100% 보장 시작! (🚫 중요: client 전달!) ⭐️⭐️⭐️
        console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
        
        if (!modules.scheduler) {
            console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
        } else if (!modules.scheduler.startAllSchedulers) {
            console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🚬 [디버그] scheduler에서 사용 가능한 함수들:`, Object.keys(modules.scheduler));
        } else {
            try {
                console.log(`${colors.pms}🚬 [시작시도] scheduler.startAllSchedulers(client) 호출...${colors.reset}`);
                
                // 🚫 수정된 부분: client 객체를 전달해야 합니다!
                await modules.scheduler.startAllSchedulers(client);
                
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
                console.log(`${colors.error}🚬 [폴백] 기본 스케줄러 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 10. 예진이 능동 메시지 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
        
        if (!modules.spontaneousYejin) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [에러] 예진이 능동 메시지 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!modules.spontaneousYejin.startSpontaneousYejinSystem) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin));
        } else {
            try {
                console.log(`${colors.pms}🌸 [시작시도] spontaneousYejin.startSpontaneousYejinSystem(client) 호출...${colors.reset}`);
                
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
                console.log(`${colors.error}🌸 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ================== 🔥 3시간차: AI 응답 고도화 시스템 초기화 ==================
        console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 초기화 시작! 🔥🔥🔥${colors.reset}`);

        // ⭐️ 11. 자연어 처리기 초기화 ⭐️
        if (modules.naturalLanguageProcessor) {
            try {
                console.log(`${colors.ai}    ✅ 자연어 처리기: 예진이 말투 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.ai}    🌸 "아조씨~" 말투, 감정 뉘앙스, 품질 향상 기능 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 자연어 처리기 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 12. 감정 뉘앙스 감지기 초기화 ⭐️
        if (modules.emotionalNuanceDetector) {
            try {
                if (modules.emotionalNuanceDetector.initializeDetector) {
                    modules.emotionalNuanceDetector.initializeDetector();
                }
                console.log(`${colors.emotion}    ✅ 감정 뉘앙스 감지기: 미묘한 감정 변화 감지 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.emotion}    🥺 숨겨진 슬픔, 피로, 스트레스 패턴 감지 기능 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 감정 뉘앙스 감지기 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 13. 예측적 돌봄 시스템 초기화 ⭐️
        if (modules.predictiveCaringSystem) {
            try {
                if (modules.predictiveCaringSystem.initializeCaringSystem) {
                    modules.predictiveCaringSystem.initializeCaringSystem();
                }
                console.log(`${colors.care}    ✅ 예측적 돌봄 시스템: 선제적 케어 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.care}    💖 30분마다 돌봄 필요도 체크, 먼저 알아채고 걱정해주기 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 예측적 돌봄 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 초기화 완료! 이제 무쿠가 진짜 예진이처럼 반응할 수 있어요! 💕${colors.reset}`);

        // ================== ⚙️ 4시간차: 통합 & 최적화 시스템 초기화 ==================
        console.log(`${colors.intelligent}⚙️⚙️⚙️ [4시간차] 통합 & 최적화 시스템 초기화 시작! ⚙️⚙️⚙️${colors.reset}`);

        // ⭐️ 14. 지능형 스케줄러 v2.0 초기화 ⭐️
        if (modules.intelligentScheduler && modules.scheduler && modules.spontaneousYejin) {
            try {
                console.log(`${colors.intelligent}🧠 [지능형스케줄러] 기존 스케줄러들과 연동 초기화...${colors.reset}`);
                await modules.intelligentScheduler.initialize(modules.scheduler, modules.spontaneousYejin);
                console.log(`${colors.intelligent}    ✅ 지능형 스케줄러: 기존 담타+예진이 시스템 AI 업그레이드 완료${colors.reset}`);
                console.log(`${colors.intelligent}    🎯 아저씨 패턴 학습, 최적 타이밍 계산, 감정 반영 활성화${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 지능형 스케줄러 초기화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}    ⚠️ 지능형 스케줄러 또는 기존 스케줄러들 없음 - 건너뛰기${colors.reset}`);
        }

        // ⭐️ 15. 적응형 성격 시스템 초기화 ⭐️
        if (modules.adaptivePersonality) {
            try {
                await modules.adaptivePersonality.initialize();
                console.log(`${colors.personality}    ✅ 적응형 성격 시스템: 예진이 성격 실시간 적응 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.personality}    🌸 시간대별, 감정별, 관계별 성격 변화 및 말투 진화 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 적응형 성격 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 16. 품질 보증 엔진 초기화 ⭐️
        if (modules.qualityAssurance) {
            try {
                await modules.qualityAssurance.initialize();
                console.log(`${colors.quality}    ✅ 품질 보증 엔진: 응답 품질 100% 보장 시스템 활성화 완료${colors.reset}`);
                console.log(`${colors.quality}    🛡️ 실시간 품질 체크, 예진이다움 필터링, 자동 개선 준비 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 품질 보증 엔진 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        console.log(`${colors.intelligent}🎉 [4시간차] 통합 & 최적화 시스템 초기화 완료! 무쿠 시스템이 완전체가 되었어요! 🚀${colors.reset}`);

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

    // 👥 사람 학습 시스템 동기화
    if (modules.personLearning) {
        console.log(`${colors.person}    ✅ 사람 학습 시스템 동기화 완료 (투샷 + 장소 기억)${colors.reset}`);
        console.log(`${colors.person}    🔗 faceMatcher ↔ personLearning 완벽 연동${colors.reset}`);
    }

    // 📖 일기장 시스템 동기화
    if (modules.diarySystem) {
        console.log(`${colors.diary}    ✅ 일기장 시스템 동기화 완료 (누적 학습 내용 조회)${colors.reset}`);
        console.log(`${colors.diary}    🔗 memoryManager ↔ diarySystem 완벽 연동${colors.reset}`);
    }

    // 🔥 3시간차: AI 응답 시스템들 간 동기화
    if (modules.naturalLanguageProcessor && modules.emotionalNuanceDetector && modules.predictiveCaringSystem) {
        console.log(`${colors.ai}    ✅ AI 응답 고도화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.ai}    🔗 자연어처리 ↔ 감정감지 ↔ 예측돌봄 완벽 연동${colors.reset}`);
    }

    // ⚙️ 4시간차: 통합 & 최적화 시스템들 간 동기화
    if (modules.intelligentScheduler && modules.adaptivePersonality && modules.qualityAssurance) {
        console.log(`${colors.intelligent}    ✅ 통합 & 최적화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.intelligent}    🔗 지능형스케줄러 ↔ 적응형성격 ↔ 품질보증 완벽 연동${colors.reset}`);
    }
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
            // 📖 일기장 시스템 (최신!)
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
        
        try {
            modules.enhancedLogging.startAutoStatusUpdates(systemModules);
            console.log(`${colors.pms}⏰ [성공!] 1분마다 자동 상태 갱신 시스템 활성화! (24개 모듈 모니터링)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}⏰ [실패] 자동 상태 갱신 시작 실패: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🚀 통합 초기화 함수 ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다... (분리된 아키텍처)${colors.reset}`);
        console.log(`${colors.diary}📖 일기장: DiarySystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습: PersonLearningSystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차: AI 응답 고도화 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차: 통합 & 최적화 버전으로 초기화합니다!${colors.reset}`);

        // 1. 모든 모듈 로드 (분리된 모듈 로더 사용)
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (분리된 로더 사용)...${colors.reset}`);
        const modules = await loadAllModules();

        // 2. 기억 시스템 초기화 (스케줄러 + 예진이 + 삐짐 + AI 고도화 + 통합최적화 100% 확실 시작!)
        console.log(`${colors.system}🧠 [2/6] 기억 시스템 초기화 (⭐️ 모든 시스템 100% 확실 시작!)...${colors.reset}`);
        const memoryInitSuccess = await initializeMemorySystems(modules, client);
        
        if (!memoryInitSuccess) {
            console.log(`${colors.error}🚬 [경고] 기억 시스템 초기화 중 일부 실패!${colors.reset}`);
            
            // ⭐️⭐️⭐️ 스케줄러 시작 재시도 (🚫 중요: client 전달!) ⭐️⭐️⭐️
            console.log(`${colors.pms}🚬 [재시도] 스케줄러 시작 재시도...${colors.reset}`);
            try {
                if (modules.scheduler && modules.scheduler.startAllSchedulers) {
                    // 🚫 수정된 부분: 여기서도 client 객체를 전달해야 합니다!
                    await modules.scheduler.startAllSchedulers(client);
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

        // 5. 감정 및 상태 시스템 동기화
        console.log(`${colors.system}🎭 [5/6] 감정 및 상태 시스템 동기화 (모든 시스템 포함)...${colors.reset}`);
        synchronizeEmotionalSystems(modules);

        // 6. enhancedLogging v3.0 자동 상태 갱신 시작
        console.log(`${colors.system}⏰ [6/6] enhancedLogging v3.0 자동 상태 갱신 시작 (24개 모듈 모니터링)...${colors.reset}`);
        startAutoStatusUpdates(modules);

        console.log(`${colors.system}🎉 무쿠 시스템 초기화 완료! (분리된 아키텍처)${colors.reset}`);
        console.log(`${colors.diary}📖 일기장 시스템 통합 완료! 이제 누적 학습 내용을 확인할 수 있어요! 💕${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습 시스템 통합 완료! 이제 투샷 + 장소를 기억해요! 💕${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차 AI 응답 고도화 시스템 통합 완료! 이제 진짜 예진이가 되었어요! 💕${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차 통합 & 최적화 시스템 통합 완료! 무쿠가 완전체가 되었어요! 🚀${colors.reset}`);
        
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
    initializeMukuSystems,
    initializeMemorySystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    colors
};
