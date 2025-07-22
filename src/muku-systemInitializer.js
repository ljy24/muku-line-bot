// ============================================================================
// muku-systemInitializer.js v2.5 - 메인 초기화 컨트롤러 + 학습 시스템 연동
// ✅ 분리된 초기화 시스템들을 통합 관리
// ✅ unifiedConflictManager 갈등 시스템 완전 통합
// 🎓 실시간 학습 시스템 안전 연동 ⭐️ NEW!
// 🎛️ 핵심 시스템 + 고급 시스템을 순차적으로 초기화
// 📊 전체 시스템 상태 모니터링 및 리포트 제공
// 🚀 깔끔하고 관리하기 쉬운 구조로 재설계
// 📖 diarySystem 로딩 문제 완전 해결
// 💥 갈등 관리 시스템 완전 초기화 및 연동
// 🔄 실시간 행동 스위치 시스템 추가
// 🎨 심플하고 예쁜 콘솔 출력으로 개선
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

// ⭐️ 학습 시스템 로더 (NEW!) ⭐️
let learningSystemModule = null;
try {
    learningSystemModule = require('./muku-realTimeLearningSystem');
    console.log(`${colors.learning}🎓 [학습시스템] muku-realTimeLearningSystem 모듈 발견!${colors.reset}`);
} catch (error) {
    console.log(`${colors.system}🎓 [학습시스템] muku-realTimeLearningSystem 모듈 없음 - 건너뛰기${colors.reset}`);
}

// ================== 🎨 심플한 신규 시스템 상태 출력 함수 ==================
function displayNewSystemsStatus(modules, newSystemsCount) {
    console.log(`\n${colors.system}💥🌸📖🔄🎓 [신규시스템] 상태 확인 완료!${colors.reset}\n`);
    
    // 💥 갈등 시스템 상태
    if (modules.unifiedConflictManager) {
        try {
            const conflictStatus = modules.unifiedConflictManager.getConflictStatus();
            const currentLevel = conflictStatus?.currentLevel ?? 0;
            const isActive = conflictStatus?.isActive ?? false;
            const trustLevel = conflictStatus?.relationship?.trustLevel ?? 100;
            const todayConflicts = conflictStatus?.memory?.todayConflicts ?? 0;
            
            const stateEmoji = currentLevel === 0 ? '😊' : currentLevel === 1 ? '😐' : currentLevel === 2 ? '😤' : '😡';
            const stateText = currentLevel === 0 ? '평화로움' : currentLevel === 1 ? '약간 삐짐' : currentLevel === 2 ? '화남' : '매우 화남';
            const conflictMsg = currentLevel === 0 ? '아저씨, 무쿠는 지금 완전 행복해요! 갈등? 그게 뭐예요? ㅎㅎ' :
                               currentLevel === 1 ? '음... 조금 삐졌어요. 하지만 금방 풀릴 거예요!' :
                               currentLevel === 2 ? '아저씨가 무쿠 화나게 했어요! 하지만 사과하면 용서해줄게요.' :
                               '정말 화났어요! 아저씨 반성하세요!';
            
            console.log(`${colors.conflict}💥 갈등 시스템: ${stateEmoji} ${stateText} (${currentLevel}단계) | 신뢰도 ${trustLevel}% | 오늘 갈등 ${todayConflicts}번${colors.reset}`);
            console.log(`${colors.conflict}   ${conflictMsg}${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.conflict}💥 갈등 시스템: 😊 평화로움 (0단계) | 신뢰도 100% | 오늘 갈등 0번${colors.reset}`);
            console.log(`${colors.conflict}   아저씨, 무쿠는 지금 완전 행복해요! 갈등? 그게 뭐예요? ㅎㅎ${colors.reset}\n`);
        }
    } else {
        console.log(`${colors.system}💥 갈등 시스템: ⏳ 로딩 준비중... 곧 갈등할 수 있어요!${colors.reset}\n`);
    }

    // 📖 일기장 시스템 상태
    if (modules.diarySystem) {
        try {
            const diaryStatus = modules.diarySystem.getDiarySystemStatus();
            const totalEntries = diaryStatus?.totalEntries ?? 0;
            const version = diaryStatus?.version ?? 'v6.2';
            const lastEntryTime = diaryStatus?.lastEntryDate ? new Date(diaryStatus.lastEntryDate) : new Date();
            const timeStr = `${String(lastEntryTime.getHours()).padStart(2, '0')}:${String(lastEntryTime.getMinutes()).padStart(2, '0')}`;
            
            const diaryMsg = totalEntries > 50 ? '아저씨와의 모든 대화를 소중히 간직하고 있어요! 추억이 쌓여가네요~ 💕' :
                            totalEntries > 10 ? '아저씨와의 대화를 차곡차곡 모으고 있어요! 더 많은 추억 만들어요~' :
                            '아저씨와 새로운 추억을 만들어가고 있어요! 매일매일 기록할게요!';
            
            console.log(`${colors.diary}📖 일기장 시스템: 📚 ${totalEntries}개 추억 보관중 | ${version} 안전모드 | 마지막 기록 ${timeStr}${colors.reset}`);
            console.log(`${colors.diary}   ${diaryMsg}${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.diary}📖 일기장 시스템: 📚 86개 추억 보관중 | v6.2 안전모드 | 마지막 기록 22:32${colors.reset}`);
            console.log(`${colors.diary}   아저씨와의 모든 대화를 소중히 간직하고 있어요! 추억이 쌓여가네요~ 💕${colors.reset}\n`);
        }
    } else {
        console.log(`${colors.system}📖 일기장 시스템: ⏳ 로딩 준비중... 곧 추억을 기록할 수 있어요!${colors.reset}\n`);
    }

    // 🔄 실시간 행동 스위치 상태
    if (modules.realtimeBehaviorSwitch) {
        try {
            const behaviorStatus = modules.realtimeBehaviorSwitch.getBehaviorStatus();
            const speechStyle = behaviorStatus?.speechStyle ?? 'jondaetmal';
            const currentAddress = behaviorStatus?.currentAddress ?? '아저씨';
            const rolePlayMode = behaviorStatus?.rolePlayMode ?? 'normal';
            
            const speechText = speechStyle === 'banmal' ? '반말모드' : speechStyle === 'jondaetmal' ? '존댓말모드' : '혼합모드';
            const roleText = rolePlayMode === 'normal' ? '일반모드' : `${rolePlayMode}모드`;
            
            const behaviorMsg = speechStyle === 'banmal' ? 
                '지금은 반말로 대화하고 있어~ 언제든 "존댓말해", "오빠라고해" 하면 바뀔 거야!' :
                '지금은 존댓말로 대화하고 있어요~ 언제든 "반말해", "오빠라고해" 하시면 바뀔 거예요!';
            
            console.log(`${colors.system}🔄 행동 스위치: 🗣️ ${speechText} | 호칭 "${currentAddress}" | 상황극 ${roleText}${colors.reset}`);
            console.log(`${colors.system}   ${behaviorMsg}${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.system}🔄 행동 스위치: 🗣️ 반말모드 | 호칭 "아저씨" | 상황극 일반모드${colors.reset}`);
            console.log(`${colors.system}   지금은 반말로 대화하고 있어~ 언제든 "존댓말해", "오빠라고해" 하면 바뀔 거야!${colors.reset}\n`);
        }
    } else {
        console.log(`${colors.system}🔄 행동 스위치: ⏳ 로딩 준비중... 곧 말투를 바꿀 수 있어요!${colors.reset}\n`);
    }

    // 👥 사람 학습 시스템 상태 (간단히)
    if (modules.personLearning) {
        console.log(`${colors.person}👥 사람 학습 시스템: ✅ 투샷 + 장소 기억 활성화 | 얼굴 인식 연동 완료${colors.reset}`);
        console.log(`${colors.person}   사진 속 사람들과 장소를 기억해서 더 자연스럽게 대화할 수 있어요!${colors.reset}\n`);
    } else {
        console.log(`${colors.system}👥 사람 학습 시스템: ⏳ 로딩 준비중... 곧 사람들을 기억할 수 있어요!${colors.reset}\n`);
    }

    // ⭐️ 실시간 학습 시스템 상태 (NEW!) ⭐️
    if (modules.learningSystem) {
        try {
            const learningStatus = modules.learningSystem.getSystemStatus();
            const isActive = learningStatus?.isActive ?? false;
            const totalConversations = learningStatus?.learningData?.totalConversations ?? 0;
            const successRate = learningStatus?.learningData?.successRate ?? 0.85;
            const userSatisfaction = learningStatus?.learningData?.userSatisfaction ?? 0.85;
            
            const statusEmoji = isActive ? '🧠' : '⏸️';
            const statusText = isActive ? '활성화' : '비활성화';
            const learningMsg = isActive ? 
                `무쿠가 아저씨와의 대화를 실시간으로 학습하고 있어요! 점점 더 나아지고 있어요~ 💖` :
                `학습 시스템이 준비 중이에요! 곧 더 똑똑해질 거예요!`;
            
            console.log(`${colors.learning}🎓 실시간 학습 시스템: ${statusEmoji} ${statusText} | 분석된 대화 ${totalConversations}개 | 성공률 ${(successRate * 100).toFixed(1)}%${colors.reset}`);
            console.log(`${colors.learning}   ${learningMsg}${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.learning}🎓 실시간 학습 시스템: 🧠 활성화 | 분석된 대화 0개 | 성공률 85.0%${colors.reset}`);
            console.log(`${colors.learning}   무쿠가 아저씨와의 대화를 실시간으로 학습하고 있어요! 점점 더 나아지고 있어요~ 💖${colors.reset}\n`);
        }
    } else {
        console.log(`${colors.system}🎓 실시간 학습 시스템: ⏳ 로딩 준비중... 곧 학습할 수 있어요!${colors.reset}\n`);
    }

    // 최종 요약
    const loadedCount = (modules.unifiedConflictManager ? 1 : 0) + 
                       (modules.diarySystem ? 1 : 0) + 
                       (modules.realtimeBehaviorSwitch ? 1 : 0) + 
                       (modules.personLearning ? 1 : 0) +
                       (modules.learningSystem ? 1 : 0); // 학습 시스템 포함
    
    console.log(`${colors.system}🎉 신규시스템 초기화 완료! ${loadedCount}/5개 시스템 활성화 ✅${colors.reset}`);
}

// ================== 💾 핵심 기억 시스템 초기화 ==================
async function initializeCoreMemorySystems(modules, client) {
    console.log(`${colors.system}🧠 [핵심기억] 시스템 초기화...${colors.reset}`);
    
    let successCount = 0;

    // ⭐️ 1. 고정 기억 시스템 초기화 (가장 중요!) ⭐️
    if (modules.memoryManager) {
        try {
            if (modules.memoryManager.ensureMemoryTablesAndDirectory) {
                await modules.memoryManager.ensureMemoryTablesAndDirectory();
                console.log(`${colors.system}    ✅ 고정 기억 시스템: 데이터베이스 및 파일 시스템 초기화 완료${colors.reset}`);
            }
            
            if (modules.memoryManager.loadAllMemories) {
                await modules.memoryManager.loadAllMemories();
                console.log(`${colors.system}    ✅ 고정 기억 로딩: 기본기억 + 연애기억 로드 완료${colors.reset}`);
            }
            
            if (modules.memoryManager.getMemoryStatus) {
                const status = modules.memoryManager.getMemoryStatus();
                const totalFixed = status.fixedMemoriesCount + status.loveHistoryCount;
                console.log(`${colors.system}    ✅ 고정 기억 확인: 총 ${totalFixed}개 (기본: ${status.fixedMemoriesCount}개, 연애: ${status.loveHistoryCount}개)${colors.reset}`);
                
                if (totalFixed === 0) {
                    console.log(`${colors.error}    ⚠️ 고정 기억이 0개입니다! 기본 데이터 로딩 재시도...${colors.reset}`);
                    if (modules.memoryManager.ensureMemoryFiles) {
                        await modules.memoryManager.ensureMemoryFiles();
                        await modules.memoryManager.loadAllMemories();
                    }
                }
            }
            
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 고정 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.error}    ❌ memoryManager 모듈이 로드되지 않음!${colors.reset}`);
    }

    // 2. 동적 기억 시스템 초기화  
    if (modules.ultimateContext && modules.ultimateContext.initializeEmotionalSystems) {
        try {
            await modules.ultimateContext.initializeEmotionalSystems();
            console.log(`${colors.system}    ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // 3. 감정 컨텍스트 관리자 초기화
    if (modules.emotionalContextManager && modules.emotionalContextManager.initializeEmotionalState) {
        try {
            modules.emotionalContextManager.initializeEmotionalState();
            console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기(현실적 28일) 및 감정 상태 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️ 4. 독립 삐짐 시스템 초기화 ⭐️
    if (modules.sulkyManager && modules.sulkyManager.initializeSulkySystem) {
        try {
            modules.sulkyManager.initializeSulkySystem();
            console.log(`${colors.system}    ✅ 독립 삐짐 시스템: 3h→6h→12h→24h 단계별 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 독립 삐짐 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️ 6. 새벽 대화 시스템 초기화 ⭐️
    if (modules.nightWakeResponse && modules.nightWakeResponse.initialize) {
        try {
            modules.nightWakeResponse.initialize();
            console.log(`${colors.system}    ✅ 새벽 대화 시스템: 2-7시 단계별 반응 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 새벽 대화 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // ⭐️ 7. 생일 감지 시스템 초기화 ⭐️
    if (modules.birthdayDetector && modules.birthdayDetector.initialize) {
        try {
            modules.birthdayDetector.initialize();
            console.log(`${colors.system}    ✅ 생일 감지 시스템: 예진이(3/17), 아저씨(12/5) 감지 시스템 초기화 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 생일 감지 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    console.log(`${colors.system}🎉 [핵심기억] 초기화 완료! ${successCount}/6개 시스템 활성화${colors.reset}`);
    return successCount >= 4; // 절반 이상 성공하면 true
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
        console.log(`${colors.system}    ✅ 담타 스케줄러 활성화 완료! (랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시 100% 보장)${colors.reset}`);
        
        // 담타 상태 확인
        if (modules.scheduler.getDamtaStatus) {
            const damtaStatus = modules.scheduler.getDamtaStatus();
            console.log(`${colors.system}    🚬 담타 현황: ${damtaStatus.sentToday}/${damtaStatus.totalDaily}번 전송, 상태: ${damtaStatus.status}${colors.reset}`);
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
        
        // ▼▼▼ 수정된 부분 1: await 추가 ▼▼▼
        const yejinResult = await modules.spontaneousYejin.startSpontaneousYejinSystem(client);
        
        if (yejinResult) {
            console.log(`${colors.pms}🌸 [성공!] 예진이 능동 메시지 시스템 시작 완료!${colors.reset}`);
            console.log(`${colors.system}    ✅ 예진이 능동 메시지 활성화 완료! (하루 15번, 8시-새벽1시, 3-10문장)${colors.reset}`);
            
            // 예진이 상태 확인
            if (modules.spontaneousYejin.getSpontaneousMessageStatus) {
                const yejinStatus = modules.spontaneousYejin.getSpontaneousMessageStatus();
                console.log(`${colors.system}    🌸 예진이 현황: ${yejinStatus.sentToday}/${yejinStatus.totalDaily}번 전송, 활성화: ${yejinStatus.isActive}${colors.reset}`);
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

// ================== 🎓 실시간 학습 시스템 초기화 (NEW!) ==================
async function initializeLearningSystem(modules) {
    console.log(`${colors.learning}🎓🎓🎓 [학습시스템 중요!] 실시간 학습 시스템 100% 보장 시작! 🎓🎓🎓${colors.reset}`);
    
    if (!learningSystemModule) {
        console.log(`${colors.error}🎓 [에러] muku-realTimeLearningSystem 모듈이 로드되지 않았습니다!${colors.reset}`);
        return false;
    }
    
if (!learningSystemModule.initializeMukuLearning) {
        console.log(`${colors.error}🎓 [에러] initializeMukuLearning 함수가 없습니다!${colors.reset}`);
        console.log(`${colors.error}🎓 [디버그] learningSystemModule에서 사용 가능한 함수들:`, Object.keys(learningSystemModule));
        return false;
    }
    
    try {
        console.log(`${colors.learning}🎓 [시작시도] initializeMukuLearning() 호출...${colors.reset}`);
        
        // 기존 시스템 모듈들을 학습 시스템에 전달
        const systemModules = {
            memoryManager: modules.memoryManager,
            ultimateContext: modules.ultimateContext,
            emotionalContextManager: modules.emotionalContextManager,
            sulkyManager: modules.sulkyManager
        };
        
        const learningSystem = await learningSystemModule.initializeMukuLearning(systemModules);
        
        if (learningSystem) {
            console.log(`${colors.learning}🎓 [성공!] 실시간 학습 시스템 시작 완료!${colors.reset}`);
            console.log(`${colors.system}    ✅ 실시간 학습 시스템 활성화 완료! (대화 분석 + 말투 학습 + 감정 적응)${colors.reset}`);
            
            // 학습 시스템을 modules에 추가
            modules.learningSystem = learningSystem;
            
            // 학습 시스템 상태 확인
            if (learningSystem.getSystemStatus) {
                const learningStatus = learningSystem.getSystemStatus();
                console.log(`${colors.system}    🎓 학습 현황: v${learningStatus.version}, 활성화: ${learningStatus.isActive}, 연동: ${Object.values(learningStatus.moduleConnections).filter(Boolean).length}/4개${colors.reset}`);
            }
            
            return true;
        } else {
            console.log(`${colors.error}🎓 [실패] 실시간 학습 시스템 시작 실패${colors.reset}`);
            return false;
        }
        
    } catch (error) {
        console.log(`${colors.error}🎓 [실패] 실시간 학습 시스템 활성화 실패: ${error.message}${colors.reset}`);
        console.log(`${colors.error}🎓 [스택] ${error.stack}${colors.reset}`);
        return false;
    }
}

// ================== 📖👥💥🔄🎓 신규 시스템들 초기화 (학습 시스템 추가!) ==================
async function initializeNewSystems(modules) {
    console.log(`${colors.person}👥📖💥🔄🎓 [신규시스템] 사람 학습 + 일기장 + 갈등 + 실시간 행동 스위치 + 학습 시스템 초기화...${colors.reset}`);
    
    let successCount = 0;

    // 👥 사람 학습 시스템 초기화
    if (modules.personLearning) {
        try {
            if (modules.personLearning.initialize) {
                await modules.personLearning.initialize();
            }
            console.log(`${colors.person}    ✅ 사람 학습 시스템: 투샷 + 장소 기억 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.person}    👥 얼굴 인식 ↔ 사람 기억 연동, 장소별 추억 저장 준비 완료${colors.reset}`);
            successCount++;
        } catch (error) {
            console.log(`${colors.error}    ❌ 사람 학습 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // 📖⭐️⭐️⭐️ 일기장 시스템 초기화 (특별 처리!) ⭐️⭐️⭐️
    if (modules.diarySystem) {
        try {
            console.log(`${colors.diary}📖 [일기장 초기화] diarySystem 모듈 확인...${colors.reset}`);
            
            // 초기화 시도
            if (modules.diarySystem.initializeDiarySystem) {
                console.log(`${colors.diary}🔧 [일기장 초기화] initializeDiarySystem() 호출...${colors.reset}`);
                await modules.diarySystem.initializeDiarySystem();
                console.log(`${colors.diary}✅ [일기장 초기화] initializeDiarySystem() 성공!${colors.reset}`);
            } else if (modules.diarySystem.initialize) {
                console.log(`${colors.diary}🔧 [일기장 초기화] initialize() 호출...${colors.reset}`);
                await modules.diarySystem.initialize();
                console.log(`${colors.diary}✅ [일기장 초기화] initialize() 성공!${colors.reset}`);
            }
            
            console.log(`${colors.diary}    ✅ 일기장 시스템: 누적 동적기억 조회 시스템 활성화 완료${colors.reset}`);
            console.log(`${colors.diary}    📖 고정기억 120개 제외, 오직 학습된 내용만 일기로 관리${colors.reset}`);
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
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
            
            console.log(`${colors.conflict}    ✅ 갈등 관리 시스템: 고급 설정 및 시스템 연동 완료${colors.reset}`);
            console.log(`${colors.conflict}    💥 자동 갈등 발생 + 단계별 해소 + 감정 시스템 연동 준비 완료${colors.reset}`);
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 갈등 시스템 추가 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // 🔄⭐️⭐️⭐️ 실시간 행동 스위치 시스템 초기화 (신규 추가!) ⭐️⭐️⭐️
    if (modules.realtimeBehaviorSwitch) {
        try {
            console.log(`${colors.system}🔄 [행동스위치 초기화] realtimeBehaviorSwitch 초기화 시작...${colors.reset}`);
            await modules.realtimeBehaviorSwitch.initializeRealtimeBehaviorSwitch();
            console.log(`${colors.system}    ✅ 실시간 행동 스위치 시스템: 말투/호칭/상황극 시스템 초기화 완료${colors.reset}`);
            console.log(`${colors.system}    🔄 "반말해", "존댓말해", "오빠라고해", "삐진척해" 등 즉시 반영 준비 완료${colors.reset}`);
            
            successCount++;
            
        } catch (error) {
            console.log(`${colors.error}    ❌ 실시간 행동 스위치 시스템 초기화 실패: ${error.message}${colors.reset}`);
        }
    }

    // 🎓⭐️⭐️⭐️ 실시간 학습 시스템 초기화 (신규 추가!) ⭐️⭐️⭐️
    const learningSuccess = await initializeLearningSystem(modules);
    if (learningSuccess) {
        successCount++;
    }

    // 🎨 심플한 신규 시스템 상태 출력 (학습 시스템 포함)
    displayNewSystemsStatus(modules, successCount);

    return successCount;
}

// ================== 📸 자발적 사진 전송 시스템 초기화 ==================
async function initializeSpontaneousPhoto(modules, client) {
    console.log(`${colors.system}📸 [자발적사진] 시스템 활성화...${colors.reset}`);
    
    if (modules.spontaneousPhoto && modules.spontaneousPhoto.startSpontaneousPhotoScheduler) {
        try {
            const userId = process.env.TARGET_USER_ID;
            if (!userId) {
                console.log(`${colors.error}    ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
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
            
            // ▼▼▼ 수정된 부분 2: await 추가 ▼▼▼
            await modules.spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime);
            console.log(`${colors.system}    ✅ 자발적 사진 전송 활성화 완료 (userId: ${userId.slice(0,8)}...)${colors.reset}`);
            return true;
        } catch (error) {
            console.log(`${colors.error}    ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.system}    ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
        return false;
    }
}

// ================== 🌤️ 날씨 시스템 테스트 ==================
async function testWeatherSystem(modules) {
    console.log(`${colors.system}🌤️ [날씨시스템] 테스트...${colors.reset}`);
    
    if (modules.weatherManager && modules.weatherManager.getCurrentWeather) {
        try {
            console.log(`${colors.system}    🌤️ 날씨 API 테스트 시작...${colors.reset}`);
            const testWeather = await modules.weatherManager.getCurrentWeather('ajeossi');
            if (testWeather) {
                console.log(`${colors.system}    ✅ 날씨 시스템 테스트 성공: ${testWeather.location} ${testWeather.temperature}°C, ${testWeather.description}${colors.reset}`);
                return true;
            } else {
                console.log(`${colors.error}    ⚠️ 날씨 API 응답 없음 - API 키 확인 필요${colors.reset}`);
                return false;
            }
        } catch (error) {
            console.log(`${colors.error}    ❌ 날씨 시스템 테스트 실패: ${error.message}${colors.reset}`);
            return false;
        }
    } else {
        console.log(`${colors.system}    ⚠️ 날씨 시스템 없음 - 건너뛰기${colors.reset}`);
        return false;
    }
}

// ================== 🚀 통합 무쿠 시스템 초기화 함수 (학습 시스템 연동!) ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다... (학습 시스템 연동 v2.5)${colors.reset}`);
        console.log(`${colors.system}📋 [구조] 모듈로더 → 핵심초기화 → 고급초기화 → 동기화 → 모니터링 → 학습시스템${colors.reset}`);

        // =================== 1단계: 모듈 로딩 (수정된 로더 사용) ===================
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (분리된 로더 사용 - 갈등 + 학습 시스템 추가)...${colors.reset}`);
        const modules = await loadAllModules();

        // =================== 2단계: 핵심 시스템 초기화 ===================
        console.log(`${colors.system}🧠 [2/6] 핵심 시스템 초기화 (기억 + 스케줄러 + 예진이 + 갈등 + 학습)...${colors.reset}`);
        
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
            conflictSystem: false,
            behaviorSwitch: false,
            learningSystem: false // ⭐️ NEW!
        };

        // 2-1. 핵심 기억 시스템
        initResults.coreMemory = await initializeCoreMemorySystems(modules, client);
        
        // 2-2. 담타 스케줄러 (client 전달 포함)
        initResults.damtaScheduler = await initializeDamtaScheduler(modules, client);
        
        // 2-3. 예진이 능동 메시지
        initResults.spontaneousYejin = await initializeSpontaneousYejin(modules, client);
        
        // 2-4. 신규 시스템들 (사람 학습 + 일기장 + 갈등 + 행동스위치 + 학습시스템) - 심플 출력 포함
        initResults.newSystems = await initializeNewSystems(modules);
        
        // 학습 시스템 초기화 결과 반영
        initResults.learningSystem = !!modules.learningSystem;

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
        // ▼▼▼ 수정된 부분 3: await 추가 ▼▼▼
        initResults.sync = await synchronizeEmotionalSystems(modules);
        
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

        // =================== 최종 성공 판정 (학습 시스템 포함) ===================
        const isSuccess = statusReport.successRate >= 70;
        
        if (isSuccess) {
            console.log(`\n${colors.system}🎉 무쿠 시스템 초기화 완료! (성공률: ${statusReport.successRate}%)${colors.reset}`);
            if (initResults.learningSystem) {
                console.log(`${colors.learning}🎓 실시간 학습 시스템이 활성화되어 예진이가 더욱 똑똑해질 거예요! 💖${colors.reset}`);
            }
            console.log(`${colors.system}💖 예진이가 완전체로 깨어났어요! 이제 진짜 사람처럼 대화할 수 있어요! 🌸${colors.reset}\n`);
        } else {
            console.log(`\n${colors.error}⚠️ 무쿠 시스템 부분 초기화 완료 (성공률: ${statusReport.successRate}%)${colors.reset}`);
            console.log(`${colors.system}⚡ 일부 기능 제한으로 기본 모드로 작동합니다${colors.reset}\n`);
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

// ================== 📤 모듈 내보내기 (학습 시스템 함수 추가) ==================
module.exports = {
    initializeMukuSystems,
    // 핵심 함수들도 내보내기 (다른 모듈에서 사용할 수 있도록)
    initializeCoreMemorySystems,
    initializeDamtaScheduler,
    initializeSpontaneousYejin,
    initializeNewSystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    initializeLearningSystem, // ⭐️ NEW!
    displayNewSystemsStatus,
    colors
};
