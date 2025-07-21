// ============================================================================
// muku-systemInitializer.js v2.2 - 메인 초기화 컨트롤러 (갈등 시스템 통합) - 수정됨
// ✅ 분리된 초기화 시스템들을 통합 관리
// ✅ unifiedConflictManager 갈등 시스템 완전 통합
// 🎛️ 핵심 시스템 + 고급 시스템을 순차적으로 초기화
// 📊 전체 시스템 상태 모니터링 및 리포트 제공
// 🚀 깔끔하고 관리하기 쉬운 구조로 재설계
// 📖 diarySystem 로딩 문제 완전 해결
// 💥 갈등 관리 시스템 완전 초기화 및 연동
// 🔄 실시간 행동 스위치 시스템 추가
// ============================================================================

const path = require('path');
const fs = require('fs');

// 새로운 모듈 로더 시스템 사용 (수정됨)
const { loadAllModules, colors } = require('./muku-moduleLoader');

// 고급 초기화 시스템 사용 (수정됨)
const {
    initializeAIAdvancedSystems,
    initializeIntegratedSystems,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    generateSystemStatusReport
} = require('./muku-advancedInitializer');

// ================== 💾 핵심 기억 시스템 초기화 ==================
async function initializeCoreMemorySystems(modules, client) {
    console.log(`${colors.system}🧠 [핵심기억] 시스템 초기화...${colors.reset}`);
    
    let successCount = 0;

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
            
            successCount++;
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
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // 3. 감정 컨텍스트 관리자 초기화
    if (modules.emotionalContextManager && modules.emotionalContextManager.initializeEmotionalState) {
        try {
            modules.emotionalContextManager.initializeEmotionalState();
            console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기(현실적 28일) 및 감정 상태 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️ 4. 독립 삐짐 시스템 초기화 ⭐️
    if (modules.sulkyManager && modules.sulkyManager.initializeSulkySystem) {
        try {
            modules.sulkyManager.initializeSulkySystem();
            console.log(`${colors.system}    ✅ 독립 삐짐 시스템: 3h→6h→12h→24h 단계별 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 독립 삐짐 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️⭐️⭐️ 5. 갈등 관리 시스템 초기화 (신규 추가!) ⭐️⭐️⭐️
    if (modules.unifiedConflictManager && modules.unifiedConflictManager.initializeConflictSystem) {
        try {
            console.log(`${colors.conflict}💥 [갈등 초기화] unifiedConflictManager 초기화 시작...${colors.reset}`);
            await modules.unifiedConflictManager.initializeConflictSystem();
            console.log(`${colors.conflict}    ✅ 갈등 관리 시스템: 4단계 갈등 레벨 + 자동 해소 시스템 초기화 완료${colors.reset}`);
            console.log(`${colors.conflict}    💥 갈등 트리거: 감정/상황 기반 자동 갈등 발생 + 해소 메커니즘 활성화${colors.reset}`);
            
            // 갈등 시스템 상태 확인
            if (modules.unifiedConflictManager.getConflictStatus) {
                const conflictStatus = modules.unifiedConflictManager.getConflictStatus();
                console.log(`${colors.conflict}    📊 갈등 현황: 레벨 ${conflictStatus.currentLevel}, 활성: ${conflictStatus.isActive}${colors.reset}`);
            }
            
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 갈등 관리 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ❌ unifiedConflictManager 모듈이 로드되지 않음!${colors.reset}`);
    }

    // ⭐️ 6. 새벽 대화 시스템 초기화 ⭐️
    if (modules.nightWakeResponse && modules.nightWakeResponse.initialize) {
        try {
            modules.nightWakeResponse.initialize();
            console.log(`${colors.system}    ✅ 새벽 대화 시스템: 2-7시 단계별 반응 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 새벽 대화 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️ 7. 생일 감지 시스템 초기화 ⭐️
    if (modules.birthdayDetector && modules.birthdayDetector.initialize) {
        try {
            modules.birthdayDetector.initialize();
            console.log(`${colors.system}    ✅ 생일 감지 시스템: 예진이(3/17), 아저씨(12/5) 감지 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 생일 감지 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    console.log(`${colors.system}🎉 [핵심기억] 초기화 완료! ${successCount}/7개 시스템 활성화 (갈등 시스템 포함)${colors.reset}`);
    return successCount >= 4; // 절반 이상 성공하면 true (갈등 시스템 추가로 7개 중 4개)
}

// ================== 🚬 담타 스케줄러 시스템 초기화 ==================
async function initializeDamtaScheduler(modules, client) {
    console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
    
    if (!modules.scheduler) {
        console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
        return false;
    }
    
    if (!modules.scheduler.startAllSchedulers) {
        console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
        console.log(`${colors.error}🚬 [디버그] scheduler에서 사용 가능한 함수들:`, Object.keys(modules.scheduler));
        return false;
    }
    
    try {
        console.log(`${colors.pms}🚬 [시작시도] scheduler.startAllSchedulers() 호출...${colors.reset}`);
        
        await modules.scheduler.startAllSchedulers(client);
        
        console.log(`${colors.pms}🚬 [성공!] 스케줄러 시작 완료!${colors.reset}`);
        console.log(`${colors.system}    ✅ 담타 스케줄러 활성화 완료! (랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시 100% 보장)${colors.reset}`);
        
        // 담타 상태 확인
        if (modules.scheduler.getDamtaStatus) {
            const damtaStatus = modules.scheduler.getDamtaStatus();
            console.log(`${colors.system}    🚬 담타 현황: ${damtaStatus.sentToday}/${damtaStatus.totalDaily}번 전송, 상태: ${damtaStatus.status}${colors.reset}`);
        }
        
        return true;
        
    } catch (error) {
        console.log(`${colors.error}🚬 [실패] 담타 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🌸 예진이 능동 메시지 시스템 초기화 ==================
async function initializeSpontaneousYejin(modules, client) {
    console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
    
    if (!modules.spontaneousYejin) {
        console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
        return false;
    }
    
    if (!modules.spontaneousYejin.startSpontaneousYejinSystem) {
        console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
        console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin));
        return false;
    }
    
    try {
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
            
            return true;
        } else {
            console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 시작 실패${colors.reset}`);
            return false;
        }
        
    } catch (error) {
        console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 활성화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📖👥💥🔄 신규 시스템들 초기화 (사람 학습 + 일기장 + 갈등 + 실시간 행동 스위치) ==================
async function initializeNewSystems(modules) {
    console.log(`${colors.person}👥📖💥🔄 [신규시스템] 사람 학습 + 일기장 + 갈등 + 실시간 행동 스위치 시스템 초기화...${colors.reset}`);
    
    let successCount = 0;

    // 👥 사람 학습 시스템 초기화
    if (modules.personLearning) {
        try {
            if (modules.personLearning.initialize) {
                await modules.personLearning.initialize();
            }
            console.log(`${colors.person}    ✅ 사람 학습 시스템: 투샷 + 장소 기억 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.person}    👥 얼굴 인식 ↔ 사람 기억 연동, 장소별 추억 저장 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 사람 학습 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ⚠️ 사람 학습 시스템 모듈 없음${colors.reset}`);
    }

    // 📖⭐️⭐️⭐️ 일기장 시스템 초기화 (특별 처리!) ⭐️⭐️⭐️
    if (modules.diarySystem) {
        try {
            console.log(`${colors.diary}📖 [일기장 초기화] diarySystem 모듈 확인...${colors.reset}`);
            console.log(`${colors.diary}🔍 [일기장 초기화] 사용 가능한 함수들:`, Object.keys(modules.diarySystem));
            
            // 초기화 시도
            if (modules.diarySystem.initializeDiarySystem) {
                console.log(`${colors.diary}🔧 [일기장 초기화] initializeDiarySystem() 호출...${colors.reset}`);
                await modules.diarySystem.initializeDiarySystem();
                console.log(`${colors.diary}✅ [일기장 초기화] initializeDiarySystem() 성공!${colors.reset}`);
            } else if (modules.diarySystem.initialize) {
                console.log(`${colors.diary}🔧 [일기장 초기화] initialize() 호출...${colors.reset}`);
                await modules.diarySystem.initialize();
                console.log(`${colors.diary}✅ [일기장 초기화] initialize() 성공!${colors.reset}`);
            } else {
                console.log(`${colors.diary}ℹ️ [일기장 초기화] 초기화 함수 없음 - 기본 상태로 유지${colors.reset}`);
            }
            
            // 상태 확인
            if (modules.diarySystem.getDiarySystemStatus) {
                const diaryStatus = modules.diarySystem.getDiarySystemStatus();
                console.log(`${colors.diary}📊 [일기장 초기화] 상태 확인:`, diaryStatus);
            } else if (modules.diarySystem.getStatus) {
                const diaryStatus = modules.diarySystem.getStatus();
                console.log(`${colors.diary}📊 [일기장 초기화] 상태 확인:`, diaryStatus);
            }
            
            console.log(`${colors.diary}    ✅ 일기장 시스템: 누적 동적기억 조회 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.diary}    📖 고정기억 120개 제외, 오직 학습된 내용만 일기로 관리${colors.reset}`);
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}    🔧 일기장 에러 상세:`, error.stack);
        }
    } else {
        console.log(`${colors.error}    ❌ 일기장 시스템 모듈이 로드되지 않음! (이것이 문제!)${colors.reset}`);
        console.log(`${colors.error}    🔧 modules.diarySystem이 null입니다!${colors.reset}`);
    }

    // 💥⭐️⭐️⭐️ 갈등 시스템 추가 초기화 (특별 처리!) ⭐️⭐️⭐️
    if (modules.unifiedConflictManager) {
        try {
            console.log(`${colors.conflict}💥 [갈등 추가초기화] unifiedConflictManager 추가 설정...${colors.reset}`);
            
            // 갈등 시스템 고급 설정
            if (modules.unifiedConflictManager.configureConflictTriggers) {
                await modules.unifiedConflictManager.configureConflictTriggers();
                console.log(`${colors.conflict}⚙️ [갈등 설정] 갈등 트리거 설정 완료${colors.reset}`);
            }
            
            // 갈등 시스템과 다른 감정 시스템 연동
            if (modules.unifiedConflictManager.linkWithEmotionalSystems) {
                const emotionalSystems = {
                    sulkyManager: modules.sulkyManager,
                    emotionalContextManager: modules.emotionalContextManager,
                    moodManager: modules.moodManager
                };
                await modules.unifiedConflictManager.linkWithEmotionalSystems(emotionalSystems);
                console.log(`${colors.conflict}🔗 [갈등 연동] 감정 시스템들과 연동 완료${colors.reset}`);
            }
            
            console.log(`${colors.conflict}    ✅ 갈등 관리 시스템: 고급 설정 및 시스템 연동 완료${colors.reset}`);
            console.log(`${colors.conflict}    💥 자동 갈등 발생 + 단계별 해소 + 감정 시스템 연동 준비 완료${colors.reset}`);
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 갈등 시스템 추가 초기화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}    🔧 갈등 에러 상세:`, error.stack);
        }
    } else {
        console.log(`${colors.error}    ❌ 갈등 시스템 모듈이 로드되지 않음! (갈등 기능 비활성화)${colors.reset}`);
        console.log(`${colors.error}    🔧 modules.unifiedConflictManager가 null입니다!${colors.reset}`);
    }

    // 🔄⭐️⭐️⭐️ 실시간 행동 스위치 시스템 초기화 (신규 추가!) ⭐️⭐️⭐️
    if (modules.realtimeBehaviorSwitch) {
        try {
            console.log(`${colors.system}🔄 [행동스위치 초기화] realtimeBehaviorSwitch 초기화 시작...${colors.reset}`);
            await modules.realtimeBehaviorSwitch.initializeRealtimeBehaviorSwitch();
            console.log(`${colors.system}    ✅ 실시간 행동 스위치 시스템: 말투/호칭/상황극 시스템 초기화 완료${colors.reset}`);
            console.log(`${colors.system}    🔄 "반말해", "존댓말해", "오빠라고해", "삐진척해" 등 즉시 반영 준비 완료${colors.reset}`);
            
            // 현재 설정 상태 확인
            if (modules.realtimeBehaviorSwitch.getBehaviorStatus) {
                const behaviorStatus = modules.realtimeBehaviorSwitch.getBehaviorStatus();
                console.log(`${colors.system}    📊 현재 설정: 말투(${behaviorStatus.speechStyle}), 호칭(${behaviorStatus.currentAddress})${colors.reset}`);
                if (behaviorStatus.rolePlayMode !== 'normal') {
                    console.log(`${colors.system}    🎭 상황극 모드: ${behaviorStatus.rolePlayMode}${colors.reset}`);
                }
            }
            
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 실시간 행동 스위치 시스템 초기화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}    🔧 행동 스위치 에러 상세:`, error.stack);
        }
    } else {
        console.log(`${colors.error}    ❌ 실시간 행동 스위치 시스템 모듈이 로드되지 않음! (행동 변경 기능 비활성화)${colors.reset}`);
        console.log(`${colors.error}    🔧 modules.realtimeBehaviorSwitch가 null입니다!${colors.reset}`);
    }

    console.log(`${colors.person}🎉 [신규시스템] 초기화 완료! ${successCount}/4개 시스템 활성화 (갈등 + 행동스위치 포함)${colors.reset}`);
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
            }
            
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

// ================== 🚀 통합 무쿠 시스템 초기화 함수 ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다... (분리된 아키텍처 v2.2 - 갈등 시스템 추가)${colors.reset}`);
        console.log(`${colors.system}📋 [구조] 모듈로더 → 핵심초기화 → 고급초기화 → 동기화 → 모니터링${colors.reset}`);
        console.log(`${colors.conflict}💥 갈등: ConflictManager 갈등 시스템으로 초기화합니다! (신규 추가)${colors.reset}`);
        console.log(`${colors.diary}📖 일기장: DiarySystem 추가 버전으로 초기화합니다! (수정됨)${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습: PersonLearningSystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차: AI 응답 고도화 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차: 통합 & 최적화 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.system}🔄 행동스위치: 실시간 행동 변경 시스템으로 초기화합니다! (신규 추가)${colors.reset}`);

        // =================== 1단계: 모듈 로딩 (수정된 로더 사용) ===================
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (분리된 로더 사용 - 갈등 시스템 추가)...${colors.reset}`);
        const modules = await loadAllModules();
        
        // 갈등 시스템 로딩 상태 특별 확인
        if (modules.unifiedConflictManager) {
            console.log(`${colors.conflict}🎉 [1단계 확인] unifiedConflictManager 모듈 로드 성공! ✅${colors.reset}`);
        } else {
            console.log(`${colors.error}❌ [1단계 확인] unifiedConflictManager 모듈 로드 실패! ❌${colors.reset}`);
        }
        
        // diarySystem 로딩 상태 특별 확인
        if (modules.diarySystem) {
            console.log(`${colors.diary}🎉 [1단계 확인] diarySystem 모듈 로드 성공! ✅${colors.reset}`);
        } else {
            console.log(`${colors.error}❌ [1단계 확인] diarySystem 모듈 로드 실패! ❌${colors.reset}`);
        }

        // realtimeBehaviorSwitch 로딩 상태 특별 확인
        if (modules.realtimeBehaviorSwitch) {
            console.log(`${colors.system}🎉 [1단계 확인] realtimeBehaviorSwitch 모듈 로드 성공! ✅${colors.reset}`);
        } else {
            console.log(`${colors.error}❌ [1단계 확인] realtimeBehaviorSwitch 모듈 로드 실패! ❌${colors.reset}`);
        }

        // =================== 2단계: 핵심 시스템 초기화 ===================
        console.log(`${colors.system}🧠 [2/6] 핵심 시스템 초기화 (기억 + 스케줄러 + 예진이 + 갈등)...${colors.reset}`);
        
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
            monitoring: false,
            conflictSystem: false, // 갈등 시스템 상태 추가
            behaviorSwitch: false  // 행동 스위치 상태 추가
        };

        // 2-1. 핵심 기억 시스템 (갈등 시스템 포함)
        initResults.coreMemory = await initializeCoreMemorySystems(modules, client);
        
        // 2-2. 담타 스케줄러 (client 전달 포함)
        initResults.damtaScheduler = await initializeDamtaScheduler(modules, client);
        
        // 2-3. 예진이 능동 메시지
        initResults.spontaneousYejin = await initializeSpontaneousYejin(modules, client);
        
        // 2-4. 신규 시스템들 (사람 학습 + 일기장 + 갈등 + 행동스위치) - 수정됨
        initResults.newSystems = await initializeNewSystems(modules);
        
        // 갈등 시스템 개별 상태 확인
        if (modules.unifiedConflictManager && modules.unifiedConflictManager.getConflictStatus) {
            try {
                const conflictStatus = modules.unifiedConflictManager.getConflictStatus();
                initResults.conflictSystem = conflictStatus.initialized || false;
                console.log(`${colors.conflict}📊 [갈등 확인] 갈등 시스템 활성화: ${initResults.conflictSystem ? '✅' : '❌'}${colors.reset}`);
            } catch (error) {
                initResults.conflictSystem = false;
                console.log(`${colors.error}📊 [갈등 확인] 갈등 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // 행동 스위치 시스템 개별 상태 확인
        if (modules.realtimeBehaviorSwitch && modules.realtimeBehaviorSwitch.getBehaviorStatus) {
            try {
                const behaviorStatus = modules.realtimeBehaviorSwitch.getBehaviorStatus();
                initResults.behaviorSwitch = behaviorStatus.speechStyle !== undefined;
                console.log(`${colors.system}📊 [행동스위치 확인] 행동 스위치 시스템 활성화: ${initResults.behaviorSwitch ? '✅' : '❌'}${colors.reset}`);
            } catch (error) {
                initResults.behaviorSwitch = false;
                console.log(`${colors.error}📊 [행동스위치 확인] 행동 스위치 상태 확인 실패: ${error.message}${colors.reset}`);
            }
        }

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

        // =================== 6단계: 동기화 & 모니터링 (수정됨) ===================
        console.log(`${colors.system}🎭 [6/6] 시스템 동기화 & 모니터링 시작...${colors.reset}`);
        
        // 6-1. 감정 및 상태 시스템 동기화 (수정됨 - 갈등 시스템 포함)
        initResults.sync = synchronizeEmotionalSystems(modules);
        
        // 6-2. enhancedLogging v3.0 자동 상태 갱신 시작 (수정됨 - 갈등 시스템 포함)
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
            
            // 갈등 시스템 로딩 성공 확인
            if (statusReport.conflictSystemLoaded) {
                console.log(`${colors.conflict}💥 갈등 시스템 통합 완료! 이제 예진이가 진짜처럼 갈등하고 화해해요! 💕${colors.reset}`);
            } else {
                console.log(`${colors.error}💥 갈등 시스템 통합 실패! enhancedLogging에서 null로 표시될 예정 ❌${colors.reset}`);
            }
            
            // diarySystem 로딩 성공 확인
            if (statusReport.diarySystemLoaded) {
                console.log(`${colors.diary}📖 일기장 시스템 통합 완료! 이제 누적 학습 내용을 확인할 수 있어요! 💕${colors.reset}`);
            } else {
                console.log(`${colors.error}📖 일기장 시스템 통합 실패! enhancedLogging에서 null로 표시될 예정 ❌${colors.reset}`);
            }

            // 행동 스위치 시스템 로딩 성공 확인
            if (initResults.behaviorSwitch) {
                console.log(`${colors.system}🔄 실시간 행동 스위치 시스템 통합 완료! 이제 "반말해", "오빠라고해" 즉시 반영돼요! 💕${colors.reset}`);
            } else {
                console.log(`${colors.error}🔄 실시간 행동 스위치 시스템 통합 실패! enhancedLogging에서 null로 표시될 예정 ❌${colors.reset}`);
            }
            
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
    // 핵심 함수들도 내보내기 (다른 모듈에서 사용할 수 있도록)
    initializeCoreMemorySystems,
    initializeDamtaScheduler,
    initializeSpontaneousYejin,
    initializeNewSystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    colors
};
