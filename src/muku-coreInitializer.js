// ============================================================================
// muku-coreInitializer.js - 핵심 시스템 초기화 (1/2)
// ✅ 기본 모듈 + 스케줄러 + 예진이 시스템 초기화 담당
// 🧠 고정기억, 담타, 예진이, 삐짐 등 핵심 시스템만 처리
// 🚬 담타시스템: 100% 보장 스케줄러 활성화 (client 전달 수정 완료)
// 🌸 예진이능동: spontaneousYejinManager 연동
// ============================================================================

const { loadAllModules, colors } = require('./muku-moduleLoader');

// ================== 💾 핵심 기억 시스템 초기화 ==================
async function initializeCoreMemorySystems(modules, client) {
    try {
        console.log(`${colors.system}🧠 [핵심시스템] 기억 시스템 초기화 시작...${colors.reset}`);

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

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 핵심 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🚬 담타 스케줄러 시스템 초기화 ==================
async function initializeDamtaScheduler(modules, client) {
    console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
    
    if (!modules.scheduler) {
        console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
        return false;
    } else if (!modules.scheduler.startAllSchedulers) {
        console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
        console.log(`${colors.error}🚬 [디버그] scheduler에서 사용 가능한 함수들:`, Object.keys(modules.scheduler));
        return false;
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
            
            return true;
        } catch (error) {
            console.log(`${colors.error}🚬 [실패] 담타 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🚬 [폴백] 기본 스케줄러 모드로 계속 진행...${colors.reset}`);
            return false;
        }
    }
}

// ================== 🌸 예진이 능동 메시지 시스템 초기화 ==================
async function initializeSpontaneousYejin(modules, client) {
    console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
    
    if (!modules.spontaneousYejin) {
        console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
        console.log(`${colors.error}🌸 [에러] 예진이 능동 메시지 시스템이 시작되지 않습니다!${colors.reset}`);
        return false;
    } else if (!modules.spontaneousYejin.startSpontaneousYejinSystem) {
        console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
        console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin));
        return false;
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
                return true;
            } else {
                console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 시작 실패${colors.reset}`);
                return false;
            }
            
        } catch (error) {
            console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 활성화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🌸 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            return false;
        }
    }
}

// ================== 👥📖 신규 시스템 초기화 ==================
async function initializeNewSystems(modules) {
    let successCount = 0;
    
    // ⭐️⭐️⭐️ 사람 학습 시스템 초기화 (신규!) ⭐️⭐️⭐️
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
                successCount++;
            } else {
                console.log(`${colors.error}👥 [실패] 사람 학습 시스템 시작 실패${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}👥 [실패] 사람 학습 시스템 활성화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}👥 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
        }
    }

    // ⭐️⭐️⭐️ 일기장 시스템 초기화 (최신 추가!) ⭐️⭐️⭐️
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
                successCount++;
            } else {
                console.log(`${colors.error}📖 [실패] 일기장 핵심 함수 없음!${colors.reset}`);
                console.log(`${colors.error}📖 [디버그] 사용 가능한 함수들:`, Object.keys(modules.diarySystem));
            }
            
        } catch (error) {
            console.log(`${colors.error}📖 [실패] 일기장 시스템 확인 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}📖 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
        }
    }

    return successCount;
}

// ================== 📸 자발적 사진 전송 시스템 초기화 ==================
async function initializeSpontaneousPhoto(modules, client) {
    console.log(`${colors.system}📸 [자발적사진] 시스템 활성화...${colors.reset}`);
    
    if (modules.spontaneousPhoto && modules.spontaneousPhoto.startSpontaneousPhotoScheduler) {
        try {
            const userId = process.env.TARGET_USER_ID;
            if (!userId) {
                console.log(`${colors.error}    ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
                return false;
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
                return true;
            }
        } catch (error) {
            console.log(`${colors.error}    ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.system}    ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
        return false;
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
                return true;
            } else {
                console.log(`${colors.error}    ⚠️ 날씨 API 응답 없음 - API 키 확인 필요${colors.reset}`);
                return false;
            }
        } catch (error) {
            console.log(`${colors.error}    ❌ 날씨 시스템 테스트 실패: ${error.message}${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.system}    ⚠️ 날씨 시스템 없음 - 건너뛰기${colors.reset}`);
        return false;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    initializeCoreMemorySystems,
    initializeDamtaScheduler,
    initializeSpontaneousYejin,
    initializeNewSystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    colors
};
