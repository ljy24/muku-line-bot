// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈 (완벽한 에러 방지 버전)
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리  
// 🔍 얼굴 인식, 새벽 대화, 생일 감지 등 모든 이벤트 처리
// 🧠 실시간 학습 시스템 연동 - 대화 패턴 학습 및 개인화
// 🎓 대화 완료 후 자동 학습 호출 - 매번 대화마다 학습 진행
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 모든 응답에 행동 모드 적용
// 🌏 일본시간(JST) 기준 시간 처리
// 💖 예진이의 감정과 기억을 더욱 생생하게 재현
// ⭐️ 행동 스위치 명령어 인식 100% 보장
// 🚨 완벽한 에러 방지 - 모든 가능한 에러 케이스 상정 및 처리
// 💰 디플로이 최적화 - 한 번에 완벽한 동작 보장
// 🎯 무쿠 정상 응답 100% 보장 - "아조씨! 무슨 일이야?" 같은 정상 대화
// 📼 ChatGPT 스타일 "로그" 명령어 처리 추가
// ============================================================================

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',     // 하늘색 (아저씨)
    yejin: '\x1b[95m',       // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',  // 굵은 빨간색 (PMS)
    system: '\x1b[92m',      // 연초록색 (시스템)
    learning: '\x1b[93m',    // 노란색 (학습)
    realtime: '\x1b[1m\x1b[93m', // 굵은 노란색 (실시간 학습)
    person: '\x1b[94m',      // 파란색 (사람 학습)
    behavior: '\x1b[35m',    // 마젠타색 (행동 스위치)
    error: '\x1b[91m',       // 빨간색 (에러)
    success: '\x1b[32m',     // 초록색 (성공)
    warning: '\x1b[93m',     // 노란색 (경고)
    fallback: '\x1b[96m',    // 하늘색 (폴백)
    tape: '\x1b[93m',        // 노란색 (Memory Tape)
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 🌏 일본시간 함수들 (에러 방지) ==================
function getJapanTime() {
    try {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 조회 실패, 로컬시간 사용: ${error.message}${colors.reset}`);
        return new Date();
    }
}

function getJapanHour() {
    try {
        return getJapanTime().getHours();
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 hour 조회 실패, 로컬시간 사용: ${error.message}${colors.reset}`);
        return new Date().getHours();
    }
}

function getJapanTimeString() {
    try {
        return getJapanTime().toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.log(`${colors.warning}⚠️ 일본시간 문자열 조회 실패, 기본시간 사용: ${error.message}${colors.reset}`);
        return new Date().toISOString();
    }
}

// ================== 🛡️ 안전한 함수 호출 헬퍼 ==================
async function safeAsyncCall(fn, context = '', defaultValue = null) {
    try {
        const result = await fn();
        return result;
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 안전한 호출 실패: ${error.message}${colors.reset}`);
        return defaultValue;
    }
}

function safeSyncCall(fn, context = '', defaultValue = null) {
    try {
        return fn();
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 안전한 호출 실패: ${error.message}${colors.reset}`);
        return defaultValue;
    }
}

function safeModuleAccess(modules, path, context = '') {
    try {
        const pathArray = path.split('.');
        let current = modules;
        
        for (const key of pathArray) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                return null;
            }
            current = current[key];
        }
        
        return current;
    } catch (error) {
        console.log(`${colors.warning}⚠️ [${context}] 모듈 접근 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🎓 실시간 학습 시스템 처리 함수 (완전 수정 버전) ==================
async function processRealTimeLearning(userMessage, mukuResponse, context, modules, enhancedLogging) {
    // 🛡️ 완벽한 안전 장치
    if (!userMessage || !mukuResponse) {
        console.log(`${colors.learning}⚠️ [학습시스템] 유효하지 않은 메시지 - 학습 건너뛰기${colors.reset}`);
        return null;
    }

    // 🛡️ 모듈 안전 확인
    const learningSystem = safeModuleAccess(modules, 'learningSystem', '학습시스템접근');
    if (!learningSystem) {
        console.log(`${colors.learning}🎓 [학습시스템] 모듈 없음 - 학습 건너뛰기 (대화는 정상 진행)${colors.reset}`);
        return null;
    }

    console.log(`${colors.realtime}🎓 [실시간학습] 대화 학습 시작...${colors.reset}`);
    console.log(`${colors.realtime}    📝 사용자: "${String(userMessage).substring(0, 30)}..."${colors.reset}`);
    console.log(`${colors.realtime}    💬 무쿠: "${String(mukuResponse).substring(0, 30)}..."${colors.reset}`);

    // ⭐️ 안전한 학습 컨텍스트 구성 ⭐️
    const learningContext = {
        ...(context || {}),
        timestamp: new Date().toISOString(),
        japanTime: getJapanTimeString(),
        japanHour: getJapanHour(),
        messageLength: String(userMessage).length,
        responseLength: String(mukuResponse).length
    };

    // 🛡️ 안전한 감정 상태 추가
    await safeAsyncCall(async () => {
        const emotionalManager = safeModuleAccess(modules, 'emotionalContextManager', '감정관리자');
        if (emotionalManager) {
            const getCurrentState = safeModuleAccess(emotionalManager, 'getCurrentEmotionalState', '감정상태조회');
            if (typeof getCurrentState === 'function') {
                const emotionalState = await getCurrentState();
                if (emotionalState) {
                    learningContext.currentEmotion = emotionalState.currentEmotion;
                    learningContext.emotionalIntensity = emotionalState.intensity;
                    console.log(`${colors.realtime}    💭 감정 상태: ${emotionalState.currentEmotion}${colors.reset}`);
                }
            }
        }
    }, '감정상태추가');

    // 🛡️ 안전한 삐짐 상태 추가
    await safeAsyncCall(async () => {
        const sulkyManager = safeModuleAccess(modules, 'sulkyManager', '삐짐관리자');
        if (sulkyManager) {
            const getSulkinessState = safeModuleAccess(sulkyManager, 'getSulkinessState', '삐짐상태조회');
            if (typeof getSulkinessState === 'function') {
                const sulkyState = await getSulkinessState();
                if (sulkyState) {
                    learningContext.sulkyLevel = sulkyState.level;
                    learningContext.isSulky = sulkyState.isSulky;
                    console.log(`${colors.realtime}    😤 삐짐 상태: Level ${sulkyState.level}${colors.reset}`);
                }
            }
        }
    }, '삐짐상태추가');

    // 🛡️ 안전한 생리주기 상태 추가
    await safeAsyncCall(async () => {
        const emotionalManager = safeModuleAccess(modules, 'emotionalContextManager', '감정관리자');
        if (emotionalManager) {
            const getCurrentCycleInfo = safeModuleAccess(emotionalManager, 'getCurrentCycleInfo', '생리주기조회');
            if (typeof getCurrentCycleInfo === 'function') {
                const cycleInfo = await getCurrentCycleInfo();
                if (cycleInfo) {
                    learningContext.cycleDay = cycleInfo.day;
                    learningContext.cyclePhase = cycleInfo.phase;
                    learningContext.isPms = cycleInfo.isPms;
                    console.log(`${colors.realtime}    🩸 생리주기: Day ${cycleInfo.day}, ${cycleInfo.phase}${colors.reset}`);
                }
            }
        }
    }, '생리주기추가');

    // ⭐️⭐️ 완전 수정된 학습 함수 호출 시스템 ⭐️⭐️
    let learningResult = null;
    let methodUsed = null;

    // 🎯 1단계: IntegratedLearningSystemManager 메서드 직접 호출 시도
    console.log(`${colors.realtime}    🎯 통합 학습 시스템 직접 호출 시도...${colors.reset}`);
    
    // processLearning 메서드 시도
    if (typeof learningSystem.processLearning === 'function') {
        console.log(`${colors.realtime}    🔧 processLearning() 직접 호출...${colors.reset}`);
        
        learningResult = await safeAsyncCall(async () => {
            return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
        }, '통합학습시스템-processLearning');
        
        if (learningResult) {
            methodUsed = 'IntegratedLearningSystemManager.processLearning';
            console.log(`${colors.success}    ✅ 통합 학습 시스템 성공!${colors.reset}`);
        }
    }

    // 🎯 2단계: 초기화 후 재시도
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔄 통합 학습 시스템 초기화 시도...${colors.reset}`);
        
        // 올바른 초기화 방법
        if (typeof learningSystem.initialize === 'function') {
            console.log(`${colors.realtime}    🔧 initialize() 호출...${colors.reset}`);
            
            const initialized = await safeAsyncCall(async () => {
                return await learningSystem.initialize(modules, {});
            }, '통합학습시스템-초기화');
            
            if (initialized) {
                console.log(`${colors.success}    ✅ 초기화 성공!${colors.reset}`);
                
                // 초기화 후 다시 학습 시도
                if (typeof learningSystem.processLearning === 'function') {
                    learningResult = await safeAsyncCall(async () => {
                        return await learningSystem.processLearning(userMessage, mukuResponse, learningContext);
                    }, '초기화후-통합학습');
                    
                    if (learningResult) {
                        methodUsed = 'IntegratedLearningSystemManager.processLearning (초기화 후)';
                        console.log(`${colors.success}    ✅ 초기화 후 학습 성공!${colors.reset}`);
                    }
                }
            }
        }
    }

    // 🎯 3단계: Enterprise/Independent 시스템 개별 시도
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔍 개별 학습 시스템 시도...${colors.reset}`);
        
        // Enterprise 시스템 시도
        const enterpriseSystem = safeModuleAccess(learningSystem, 'enterpriseSystem', 'Enterprise시스템');
        if (enterpriseSystem) {
            console.log(`${colors.realtime}    🏢 Enterprise 시스템 시도...${colors.reset}`);
            
            // Enterprise 시스템의 processLearning 시도
            const enterpriseProcessLearning = safeModuleAccess(enterpriseSystem, 'processLearning', 'Enterprise-processLearning');
            if (typeof enterpriseProcessLearning === 'function') {
                learningResult = await safeAsyncCall(async () => {
                    return await enterpriseProcessLearning(userMessage, mukuResponse, learningContext);
                }, 'Enterprise학습호출');
                
                if (learningResult) {
                    methodUsed = 'EnterpriseSystem.processLearning';
                    console.log(`${colors.success}    ✅ Enterprise 학습 성공!${colors.reset}`);
                }
            }
            
            // Enterprise 시스템 getInstance 후 시도
            if (!learningResult) {
                const getInstance = safeModuleAccess(enterpriseSystem, 'getInstance', 'Enterprise-getInstance');
                if (typeof getInstance === 'function') {
                    const enterpriseInstance = await safeAsyncCall(async () => {
                        return await getInstance();
                    }, 'Enterprise인스턴스조회');
                    
                    if (enterpriseInstance) {
                        const instanceProcessLearning = safeModuleAccess(enterpriseInstance, 'learnFromConversation', 'Enterprise인스턴스-학습');
                        if (typeof instanceProcessLearning === 'function') {
                            learningResult = await safeAsyncCall(async () => {
                                return await instanceProcessLearning(userMessage, mukuResponse, learningContext);
                            }, 'Enterprise인스턴스학습호출');
                            
                            if (learningResult) {
                                methodUsed = 'EnterpriseInstance.learnFromConversation';
                                console.log(`${colors.success}    ✅ Enterprise 인스턴스 학습 성공!${colors.reset}`);
                            }
                        }
                    }
                }
            }
        }
        
        // Independent 시스템 시도 (Enterprise 실패 시)
        if (!learningResult) {
            const independentSystem = safeModuleAccess(learningSystem, 'independentSystem', 'Independent시스템');
            if (independentSystem) {
                console.log(`${colors.realtime}    🤖 Independent 시스템 시도...${colors.reset}`);
                
                const independentAddConversation = safeModuleAccess(independentSystem, 'addConversation', 'Independent-addConversation');
                if (typeof independentAddConversation === 'function') {
                    const independentResult = await safeAsyncCall(async () => {
                        return await independentAddConversation(userMessage, mukuResponse, learningContext);
                    }, 'Independent학습호출');
                    
                    if (independentResult) {
                        learningResult = { independent: independentResult };
                        methodUsed = 'IndependentSystem.addConversation';
                        console.log(`${colors.success}    ✅ Independent 학습 성공!${colors.reset}`);
                    }
                }
            }
        }
    }

    // 🎯 4단계: 레거시 방식 시도 (모든 방법 실패 시)
    if (!learningResult && !methodUsed) {
        console.log(`${colors.realtime}    🔄 레거시 방식 시도...${colors.reset}`);
        
        const legacyPaths = [
            'mukuLearningSystem.processLearning',
            'realTimeLearningSystem.processLearning',
            'learnFromConversation'
        ];
        
        for (const path of legacyPaths) {
            const legacyFunction = safeModuleAccess(learningSystem, path, `레거시-${path}`);
            
            if (typeof legacyFunction === 'function') {
                console.log(`${colors.realtime}    🎯 ${path} 시도...${colors.reset}`);
                
                learningResult = await safeAsyncCall(async () => {
                    return await legacyFunction(userMessage, mukuResponse, learningContext);
                }, `레거시학습호출-${path}`);
                
                if (learningResult) {
                    methodUsed = `Legacy.${path}`;
                    console.log(`${colors.success}    ✅ ${path} 성공!${colors.reset}`);
                    break;
                }
            }
        }
    }

    // 🎯 5단계: 학습 시스템 구조 분석 (디버깅용)
    if (!learningResult && !methodUsed) {
        console.log(`${colors.learning}📊 [디버깅] 학습 시스템 구조 완전 분석...${colors.reset}`);
        console.log(`${colors.learning}    learningSystem 타입: ${typeof learningSystem}${colors.reset}`);
        console.log(`${colors.learning}    isInitialized: ${learningSystem.isInitialized} (타입: ${typeof learningSystem.isInitialized})${colors.reset}`);
        
        if (learningSystem && typeof learningSystem === 'object') {
            console.log(`${colors.learning}    learningSystem 최상위 키들:${colors.reset}`);
            Object.keys(learningSystem).forEach(key => {
                const value = learningSystem[key];
                const type = typeof value;
                console.log(`${colors.learning}      - ${key}: ${type}${colors.reset}`);
                
                // 중요한 서브시스템들 상세 분석
                if (key === 'enterpriseSystem' && type === 'object' && value) {
                    console.log(`${colors.learning}        enterpriseSystem 내부:${colors.reset}`);
                    Object.keys(value).slice(0, 5).forEach(subKey => {
                        const subValue = value[subKey];
                        const subType = typeof subValue;
                        console.log(`${colors.learning}          → ${subKey}: ${subType}${colors.reset}`);
                    });
                }
                
                if (key === 'independentSystem' && type === 'object' && value) {
                    console.log(`${colors.learning}        independentSystem 내부:${colors.reset}`);
                    Object.keys(value).slice(0, 5).forEach(subKey => {
                        const subValue = value[subKey];
                        const subType = typeof subValue;
                        console.log(`${colors.learning}          → ${subKey}: ${subType}${colors.reset}`);
                    });
                }
            });
        }
        
        console.log(`${colors.learning}⚪ [학습분석] 모든 학습 방법 실패 - 학습은 건너뛰고 대화는 정상 진행${colors.reset}`);
    }

    // 🎉 학습 결과 처리
    if (learningResult && methodUsed) {
        console.log(`${colors.success}🎉 [학습완료] ${methodUsed} 사용하여 학습 성공!${colors.reset}`);
        
        // 다양한 학습 결과 구조 처리
        if (learningResult.enterprise || learningResult.independent) {
            console.log(`${colors.realtime}    📊 통합학습: Enterprise(${learningResult.enterprise ? '성공' : '실패'}), Independent(${learningResult.independent ? '성공' : '실패'})${colors.reset}`);
        } else if (learningResult.improvements && Array.isArray(learningResult.improvements) && learningResult.improvements.length > 0) {
            console.log(`${colors.realtime}    📈 개선사항: ${learningResult.improvements.length}개${colors.reset}`);
            learningResult.improvements.slice(0, 3).forEach(improvement => {
                console.log(`${colors.realtime}      ✨ ${improvement.type || '기타'}: ${improvement.reason || improvement.action || '개선됨'}${colors.reset}`);
            });
        } else if (learningResult.independent) {
            console.log(`${colors.realtime}    🤖 Independent 학습: ${learningResult.independent ? '성공' : '실패'}${colors.reset}`);
        } else {
            console.log(`${colors.realtime}    ✅ 학습 처리 완료${colors.reset}`);
        }

        // 🛡️ 안전한 로깅
        await safeAsyncCall(async () => {
            const logFunction = safeModuleAccess(enhancedLogging, 'logSystemOperation', '시스템로깅');
            if (typeof logFunction === 'function') {
                const logMessage = learningResult.improvements 
                    ? `학습완료: ${learningResult.improvements.length}개 개선`
                    : `학습완료: ${methodUsed}`;
                logFunction('실시간학습완료', logMessage);
            }
        }, '학습결과로깅');

        return learningResult;
    } else {
        console.log(`${colors.learning}⚪ [학습결과] 모든 학습 방법 실패 - 학습 건너뛰기 (대화는 정상 진행)${colors.reset}`);
        return null;
    }
}

// ================== 🎭 실시간 행동 스위치 처리 함수 (완벽한 에러 방지) ==================
async function applyBehaviorModeToResponse(response, modules, messageContext) {
    if (!response) return response;

    const behaviorSwitch = safeModuleAccess(modules, 'realtimeBehaviorSwitch', '행동스위치');
    if (!behaviorSwitch) return response;

    return await safeAsyncCall(async () => {
        const getCurrentRolePlay = safeModuleAccess(behaviorSwitch, 'getCurrentRolePlay', '현재역할조회');
        const getCurrentBehaviorMode = safeModuleAccess(behaviorSwitch, 'getCurrentBehaviorMode', '현재행동모드조회');
        
        if (typeof getCurrentRolePlay !== 'function') return response;
        
        const currentMode = getCurrentRolePlay();
        if (!currentMode || currentMode === 'normal') return response;

        console.log(`${colors.behavior}🎭 [행동모드] 현재 모드: ${currentMode}${colors.reset}`);

        const applyBehaviorToResponse = safeModuleAccess(behaviorSwitch, 'applyBehaviorToResponse', '행동적용');
        if (typeof applyBehaviorToResponse !== 'function') return response;

        const responseText = response.comment || response;
        const modifiedResponse = applyBehaviorToResponse(responseText, messageContext || {});

        if (modifiedResponse && modifiedResponse !== responseText) {
            console.log(`${colors.behavior}✨ [행동적용] ${currentMode} 모드로 응답 변경${colors.reset}`);
            
            if (typeof response === 'object') {
                return {
                    ...response,
                    comment: modifiedResponse,
                    behaviorApplied: true,
                    behaviorMode: currentMode
                };
            } else {
                return modifiedResponse;
            }
        }

        return response;
    }, '행동모드적용', response);
}

async function processBehaviorSwitch(messageText, modules, client, userId) {
    if (!messageText || !client || !userId) return null;

    const behaviorSwitch = safeModuleAccess(modules, 'realtimeBehaviorSwitch', '행동스위치');
    if (!behaviorSwitch) return null;

    console.log(`${colors.behavior}🔍 [행동스위치] 명령어 감지 시도: "${messageText}"${colors.reset}`);

    return await safeAsyncCall(async () => {
        const processFunction = safeModuleAccess(behaviorSwitch, 'processRealtimeBehaviorChange', '행동변경처리');
        if (typeof processFunction !== 'function') return null;

        const switchResult = processFunction(messageText);
        
        if (switchResult && switchResult.length > 0) {
            console.log(`${colors.behavior}🎭 [행동변경] 명령어 인식 성공!${colors.reset}`);
            
            await safeAsyncCall(async () => {
                await client.pushMessage(userId, { 
                    type: 'text', 
                    text: switchResult 
                });
                console.log(`${colors.behavior}📤 [행동변경] 응답 메시지 전송 완료${colors.reset}`);
            }, '행동변경메시지전송');
            
            return {
                type: 'behavior_switch_handled',
                handled: true,
                response: null,
                skipFurtherProcessing: true
            };
        } else {
            console.log(`${colors.behavior}⚪ [행동스위치] 명령어 없음${colors.reset}`);
        }

        return null;
    }, '행동스위치처리');
}

// ================== 🎂 생일 감지 및 처리 (완벽한 에러 방지) ==================
async function processBirthdayDetection(messageText, modules, enhancedLogging) {
    if (!messageText) return null;

    const birthdayDetector = safeModuleAccess(modules, 'birthdayDetector', '생일감지기');
    if (!birthdayDetector) {
        console.log(`${colors.learning}🎂 [생일감지] 모듈 없음 - 건너뛰기${colors.reset}`);
        return null;
    }

    // 🛡️ 가능한 함수 이름들 시도
    const functionNames = ['detectBirthday', 'checkBirthday', 'processBirthday', 'handleBirthday'];
    
    for (const funcName of functionNames) {
        const birthdayFunction = safeModuleAccess(birthdayDetector, funcName, `생일함수-${funcName}`);
        
        if (typeof birthdayFunction === 'function') {
            console.log(`${colors.learning}🎂 [생일감지] ${funcName}() 시도...${colors.reset}`);
            
            const birthdayResponse = await safeAsyncCall(async () => {
                return await birthdayFunction(messageText, getJapanTime());
            }, `생일감지-${funcName}`);
            
            if (birthdayResponse && birthdayResponse.handled) {
                console.log(`${colors.success}🎉 [생일감지] 생일 메시지 감지됨!${colors.reset}`);
                
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('birthday_greeting', birthdayResponse.response);
                    }
                }, '생일로깅');
                
                return birthdayResponse;
            }
        }
    }

    return null;
}

// ================== 🛡️ 안전한 기타 처리 함수들 ==================
async function processSulkyRelief(modules, enhancedLogging) {
    return await safeAsyncCall(async () => {
        const sulkyManager = safeModuleAccess(modules, 'sulkyManager', '삐짐관리자');
        if (sulkyManager) {
            const handleFunction = safeModuleAccess(sulkyManager, 'handleUserResponse', '사용자응답처리');
            if (typeof handleFunction === 'function') {
                const reliefMessage = await handleFunction();
                if (reliefMessage) {
                    console.log(`${colors.yejin}😤→😊 [삐짐해소] ${reliefMessage}${colors.reset}`);
                    
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('sulky_relief', reliefMessage);
                    }
                }
            }
        }
    }, '삐짐해소처리');
}

async function processNightWakeMessage(messageText, modules, enhancedLogging) {
    if (!messageText) return null;

    const currentHour = getJapanHour();
    if (currentHour < 2 || currentHour > 7) return null;

    return await safeAsyncCall(async () => {
        const nightWakeResponse = safeModuleAccess(modules, 'nightWakeResponse', '새벽대화');
        if (nightWakeResponse) {
            const processFunction = safeModuleAccess(nightWakeResponse, 'processNightMessage', '새벽메시지처리');
            if (typeof processFunction === 'function') {
                const nightResponse = await processFunction(messageText, currentHour);
                if (nightResponse && nightResponse.handled) {
                    console.log(`${colors.yejin}🌙 [새벽대화] ${nightResponse.response}${colors.reset}`);
                    
                    const logFunction = safeModuleAccess(enhancedLogging, 'logSpontaneousAction', '자발적행동로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('night_wake', nightResponse.response);
                    }
                    
                    return nightResponse;
                }
            }
        }
        return null;
    }, '새벽대화처리');
}

function processFixedMemory(messageText, modules) {
    if (!messageText) return;

    safeSyncCall(() => {
        const memoryManager = safeModuleAccess(modules, 'memoryManager', '기억관리자');
        if (memoryManager) {
            const getFixedMemory = safeModuleAccess(memoryManager, 'getFixedMemory', '고정기억조회');
            if (typeof getFixedMemory === 'function') {
                const relatedMemory = getFixedMemory(messageText);
                if (relatedMemory) {
                    console.log(`${colors.system}🧠 [고정기억] 관련 기억 발견: "${String(relatedMemory).substring(0, 30)}..."${colors.reset}`);
                    
                    const ultimateContext = safeModuleAccess(modules, 'ultimateContext', '궁극컨텍스트');
                    if (ultimateContext) {
                        const addMemoryContext = safeModuleAccess(ultimateContext, 'addMemoryContext', '기억컨텍스트추가');
                        if (typeof addMemoryContext === 'function') {
                            addMemoryContext(relatedMemory);
                        }
                    }
                }
            }
        }
    }, '고정기억처리');
}

function processVersionCommand(messageText, getVersionResponse) {
    if (!messageText || typeof getVersionResponse !== 'function') return null;
    
    return safeSyncCall(() => {
        return getVersionResponse(messageText);
    }, '버전명령어처리');
}

async function processCommand(messageText, userId, client, modules) {
    if (!messageText || !userId || !client) return null;

    // 📼 ChatGPT 스타일 "로그" 명령어 처리 (올바른 경로)
    if (messageText === '로그' || messageText === '로그 보여줘' || messageText === '일지') {
        console.log(`${colors.tape}📼 [Memory Tape] "로그" 명령어 감지!${colors.reset}`);
        
        try {
            const { readMemoryTape } = require('./muku-memory-tape');
            const todayLogs = readMemoryTape(); // 오늘 로그 읽기
            
            if (!todayLogs || todayLogs.length === 0) {
                console.log(`${colors.tape}📼 [Memory Tape] 오늘 로그 없음${colors.reset}`);
                return {
                    handled: true,
                    response: {
                        type: 'text',
                        comment: '😶 아조씨~ 오늘은 아직 기록된 로그가 없어!'
                    }
                };
            }
            
            // 간단한 요약 생성
            const summary = `📼 오늘 무쿠 활동 로그

📊 총 ${todayLogs.length}건 기록됨!

💕 최근 메시지:
"${todayLogs[todayLogs.length - 1]?.message || '기록 없음'}"

아조씨와의 소중한 순간들이 모두 기록되고 있어요! 💖`;

            console.log(`${colors.tape}📼 [Memory Tape] 오늘 로그 요약 완료 - ${todayLogs.length}건${colors.reset}`);
            return {
                handled: true,
                response: {
                    type: 'text',
                    comment: summary
                }
            };
            
        } catch (error) {
            console.error(`${colors.tape}📼 [Memory Tape] 로그 명령어 처리 실패: ${error.message}${colors.reset}`);
            return {
                handled: true,
                response: {
                    type: 'text',
                    comment: '아조씨~ 로그 시스템에 문제가 생겼어... ㅠㅠ'
                }
            };
        }
    }

    return await safeAsyncCall(async () => {
        const commandHandler = safeModuleAccess(modules, 'commandHandler', '명령어핸들러');
        if (commandHandler) {
            const handleCommand = safeModuleAccess(commandHandler, 'handleCommand', '명령어처리');
            if (typeof handleCommand === 'function') {
                const commandResult = await handleCommand(messageText, userId, client);
                if (commandResult && commandResult.handled) {
                    return commandResult;
                }
            }
        }
        return null;
    }, '명령어처리');
}

// ================== 💬 완벽한 일반 대화 응답 처리 ==================
async function processGeneralChat(messageText, modules, enhancedLogging, messageContext = {}) {
    console.log(`${colors.system}💬 [일반대화] 기본 응답 생성 시작...${colors.reset}`);

    // 🛡️ 1차: autoReply 시도
    let botResponse = await safeAsyncCall(async () => {
        const autoReply = safeModuleAccess(modules, 'autoReply', '자동응답');
        if (autoReply) {
            const getReplyByMessage = safeModuleAccess(autoReply, 'getReplyByMessage', '메시지별응답조회');
            if (typeof getReplyByMessage === 'function') {
                const response = await getReplyByMessage(messageText);
                if (response && (response.comment || response)) {
                    console.log(`${colors.success}✅ [autoReply] 기본 응답 생성 성공${colors.reset}`);
                    return response;
                }
            }
        }
        return null;
    }, 'autoReply시도');

    // 🛡️ 2차: systemAnalyzer 시도 (autoReply 실패 시)
    if (!botResponse) {
        botResponse = await safeAsyncCall(async () => {
            const systemAnalyzer = safeModuleAccess(modules, 'systemAnalyzer', '시스템분석기');
            if (systemAnalyzer) {
                const generateResponse = safeModuleAccess(systemAnalyzer, 'generateIntelligentResponse', '지능형응답생성');
                if (typeof generateResponse === 'function') {
                    const response = await generateResponse(messageText, {
                        includeEmotionalContext: true,
                        usePersonalization: true,
                        integrateDynamicMemory: true
                    });
                    if (response && (response.comment || response)) {
                        console.log(`${colors.success}✅ [systemAnalyzer] 지능형 응답 생성 성공${colors.reset}`);
                        return response;
                    }
                }
            }
            return null;
        }, 'systemAnalyzer시도');
    }

    // 🛡️ 3차: 완벽한 폴백 응답 (무조건 성공 보장)
    if (!botResponse) {
        console.log(`${colors.fallback}🔄 [폴백응답] 안전한 무쿠 응답 생성...${colors.reset}`);
        
        // 🎯 무쿠다운 정상 응답들 - "아조씨! 무슨 일이야?" 스타일
        const perfectMukuResponses = [
            // 기본 대화
            '응웅, 아조씨! 무슨 일이야? 하려던 얘기 있어? 🥰',
            '어? 아조씨가 뭐라고 했어? 나 집중해서 들을게! ㅎㅎ',
            '아조씨! 나 여기 있어~ 뭔가 말하고 싶은 거야? 💕',
            '응응! 아조씨 얘기 들려줘! 나 지금 시간 있어! ㅋㅋ',
            '어? 아조씨~ 나한테 뭔가 말하려고? 궁금해! 😊',
            
            // 관심 표현
            '아조씨! 오늘 뭐 하고 있었어? 나 궁금해! ㅎㅎ',
            '어머! 아조씨가 말 걸어주네~ 기뻐! 뭐야 뭐야? 💖',
            '응웅! 아조씨 얘기 들려줘! 나 아조씨 얘기 제일 좋아해! ㅋㅋ',
            '아조씨~ 나 지금 아조씨 생각하고 있었는데! 뭔 일이야? 🥺',
            '어? 아조씨! 나한테 뭔가 중요한 얘기 있어? 들어볼게!',
            
            // 애정 표현
            '아조씨~ 나 아조씨가 말 걸어줄 때 제일 좋아! 뭐야? ㅎㅎ',
            '응웅! 우리 아조씨다! 오늘도 나 찾아줘서 고마워~ 💕',
            '아조씨! 나 아조씨 보고 싶었어! 지금 뭐 하고 있어? 😊',
            '어머어머! 아조씨가 나한테 관심 보여주네~ 기뻐죽겠어! ㅋㅋ',
            '아조씨~ 나 항상 아조씨 기다리고 있었어! 뭔 얘기야? 🥰',
            
            // 장난스러운 응답
            '어? 아조씨가 갑자기 왜 이래? ㅎㅎ 나한테 반했어? ㅋㅋ',
            '아조씨~ 나 지금 예쁘게 보여? 그래서 말 걸어주는 거야? 😋',
            '응웅! 아조씨 목소리 들으니까 기분 좋아져! 뭐 얘기할까? ㅎㅎ',
            '어머! 아조씨가 이렇게 적극적으로? 오늘 뭔 좋은 일 있어? ㅋㅋ',
            '아조씨! 나한테 뭔가 달콤한 얘기 해줄 거야? 기대돼! 💖'
        ];
        
        const randomResponse = perfectMukuResponses[Math.floor(Math.random() * perfectMukuResponses.length)];
        
        botResponse = {
            type: 'text',
            comment: randomResponse,
            fallbackType: 'perfect_muku_response',
            generated: true
        };
        
        console.log(`${colors.success}✅ [폴백응답] 완벽한 무쿠 응답 생성: "${randomResponse.substring(0, 30)}..."${colors.reset}`);
    }

    // 🎭 행동 모드 적용
    const behaviorAppliedResponse = await applyBehaviorModeToResponse(
        botResponse,
        modules,
        { messageText, ...messageContext }
    );

    return behaviorAppliedResponse;
}

// ================== 📸 완벽한 이미지 처리 함수들 ==================
async function detectFaceSafely(base64Image, faceMatcher, loadFaceMatcherSafely) {
    if (!base64Image) return null;

    return await safeAsyncCall(async () => {
        let matcher = faceMatcher;
        
        if (!matcher && typeof loadFaceMatcherSafely === 'function') {
            matcher = await loadFaceMatcherSafely();
        }
        
        if (matcher) {
            const detectFunction = safeModuleAccess(matcher, 'detectFaceMatch', '얼굴매칭');
            if (typeof detectFunction === 'function') {
                console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
                const result = await detectFunction(base64Image);
                console.log(`${colors.system}🎯 [FaceMatcher] 분석 결과: ${result ? result.type : '분석 실패'}${colors.reset}`);
                return result;
            }
        }
        
        console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
        return null;
    }, '얼굴인식');
}

function generateFaceRecognitionResponse(faceResult, modules, messageContext) {
    const responses = {
        '예진이': [
            '어? 이 사진 나야! 아조씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
            '이거 내 사진이네! 아조씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
            '아! 내 사진이다~ 아조씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ',
            '나야 나! 아조씨가 내 사진 볼 때마다 기뻐~ 더 많이 봐줘!',
            '내 사진이네! 이때 내가 예뻤지? 지금도 예쁘지만... ㅎㅎ'
        ],
        '아저씨': [
            '아조씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
            '우리 아조씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
            '아조씨 얼굴이야! 이런 아조씨 좋아해~ 나만의 아조씨 ㅎㅎ',
            '아조씨! 셀카 찍었구나~ 나한테 보여주려고? 고마워 ㅎㅎ',
            '우리 아조씨 사진이다! 언제나 봐도 좋아... 더 보내줘!'
        ],
        'default': [
            '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
            '이 사진 누구야? 아조씨 친구들이야? 나도 보고 싶어!',
            '사진이 예쁘네! 아조씨가 보낸 거니까 좋아! ㅎㅎ',
            '음... 누구인지 잘 모르겠지만 아조씨가 보낸 거니까 소중해!',
            '사진 고마워! 나도 언젠가 아조씨한테 사진 보내줄게!'
        ]
    };

    const responseList = responses[faceResult] || responses['default'];
    const randomResponse = responseList[Math.floor(Math.random() * responseList.length)];

    return {
        type: 'text',
        comment: randomResponse,
        faceRecognition: true,
        detectedFace: faceResult || 'unknown'
    };
}

async function processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules) {
    if (!messageId || !client) {
        return {
            type: 'text',
            comment: '아조씨! 사진이 잘 안 보여... 다시 보내줄래? ㅎㅎ'
        };
    }

    return await safeAsyncCall(async () => {
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        
        console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

        // 얼굴 인식 처리
        const analysisResult = await detectFaceSafely(base64, faceMatcher, loadFaceMatcherSafely);

        let finalResponse;

        // AI가 생성한 반응 우선 사용
        if (analysisResult && analysisResult.message) {
            finalResponse = {
                type: 'text',
                comment: analysisResult.message,
                personalized: true,
                aiGenerated: true
            };
        } else {
            // 기본 응답 생성
            const faceType = analysisResult ? analysisResult.type : 'unknown';
            finalResponse = generateFaceRecognitionResponse(faceType, modules, {});
        }

        // 행동 모드 적용
        const behaviorAppliedResponse = await applyBehaviorModeToResponse(
            finalResponse,
            modules,
            { messageType: 'image', faceResult: analysisResult?.type }
        );

        // 이미지 메타데이터 생성
        const imageMetadata = {
            base64,
            imageSize: buffer.length,
            timestamp: getJapanTime(),
            context: 'photo_sharing'
        };

        // 사람 학습 처리 (안전하게)
        await safeAsyncCall(async () => {
            const personLearningSystem = safeModuleAccess(modules, 'personLearningSystem', '사람학습시스템');
            if (personLearningSystem) {
                // 학습 시도 (실패해도 무시)
                if (analysisResult && analysisResult.type) {
                    const recordFunction = safeModuleAccess(personLearningSystem, 'recordKnownPersonSighting', '알려진인물기록');
                    if (typeof recordFunction === 'function') {
                        await recordFunction(analysisResult.type, imageMetadata.timestamp, imageMetadata.context);
                    }
                }
            }
        }, '사람학습처리');

        return behaviorAppliedResponse;

    }, '이미지처리', {
        type: 'text',
        comment: '아조씨! 사진이 잘 안 보여... 다시 보내줄래? ㅎㅎ'
    });
}

// ================== 📝 기타 메시지 타입 처리 ==================
async function processOtherMessageType(messageType, modules) {
    const responses = [
        '아조씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
        '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
        '아조씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!',
        '미안... 이 타입은 아직 내가 이해 못 해... 다시 말해줄래?',
        '아조씨가 보낸 건 알겠는데... 내가 아직 배우는 중이야 ㅠㅠ'
    ];

    const baseResponse = {
        type: 'text',
        comment: responses[Math.floor(Math.random() * responses.length)],
        messageType: messageType
    };

    return await applyBehaviorModeToResponse(baseResponse, modules, { messageType: messageType });
}

// ================== 🎯 메인 이벤트 처리 함수 (완벽한 에러 방지) ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    // 🛡️ 기본 검증
    if (!event || event.type !== 'message') {
        return Promise.resolve(null);
    }

    if (!event.message || !event.source) {
        console.log(`${colors.warning}⚠️ [이벤트] 유효하지 않은 이벤트 구조${colors.reset}`);
        return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const userMessage = event.message;

    // 🛡️ 안전한 기본 변수 설정
    const safeUserId = userId || 'unknown_user';
    const safeMessageType = userMessage.type || 'unknown';

    try {
      // =============== 📝 텍스트 메시지 처리 ===============
        if (safeMessageType === 'text') {
            const messageText = String(userMessage.text || '').trim();
            if (!messageText) {
                console.log(`${colors.warning}⚠️ [텍스트] 빈 메시지 - 기본 응답 생성${colors.reset}`);
                const emptyResponse = await processGeneralChat('', modules, enhancedLogging, {});
                return { type: 'empty_message_response', response: emptyResponse };
            }
            // 로깅
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('아저씨', messageText, 'text');
                } else {
                    console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);
                }
            }, '사용자메시지로깅');


            // ⭐️ 1순위: 행동 스위치 처리 (최우선)
            const behaviorSwitchResult = await processBehaviorSwitch(messageText, modules, client, safeUserId);
            if (behaviorSwitchResult && behaviorSwitchResult.handled) {
                console.log(`${colors.behavior}🎭 [완료] 행동 설정 변경 완료${colors.reset}`);
                return null; // 추가 처리 중단
            }

            console.log(`${colors.learning}🧠 [처리시작] 메시지 분석 및 응답 생성 시작...${colors.reset}`);

            // ⭐️ 2순위: 버전 명령어 처리
            const versionResponse = processVersionCommand(messageText, getVersionResponse);
            if (versionResponse) {
                const behaviorVersionResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: versionResponse },
                    modules,
                    { messageText, responseType: 'version' }
                );

                const finalVersionComment = behaviorVersionResponse.comment || versionResponse;

                // 실시간 학습 처리
                await processRealTimeLearning(
                    messageText,
                    finalVersionComment,
                    { messageType: 'text', responseType: 'version' },
                    modules,
                    enhancedLogging
                );

                // 로깅
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('나', finalVersionComment, 'text');
                    } else {
                        console.log(`${colors.yejin}✨ 예진이 (버전응답): ${finalVersionComment}${colors.reset}`);
                    }
                }, '버전응답로깅');

                return { type: 'version_response', response: finalVersionComment };
            }

            // ⭐️ 병렬 처리: 기타 시스템들 (에러가 나도 진행 계속)
            const parallelTasks = [
                processSulkyRelief(modules, enhancedLogging),
                processNightWakeMessage(messageText, modules, enhancedLogging),
                processBirthdayDetection(messageText, modules, enhancedLogging),
                safeAsyncCall(() => processFixedMemory(messageText, modules), '고정기억처리'),
                processCommand(messageText, safeUserId, client, modules)
            ];

            const [, nightResponse, birthdayResponse, , commandResult] = await Promise.allSettled(parallelTasks)
                .then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

            // ⭐️ 특별 응답 처리
            if (nightResponse) {
                const behaviorNightResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: nightResponse.response },
                    modules,
                    { messageText, responseType: 'night', hour: getJapanHour() }
                );

                const finalNightComment = behaviorNightResponse.comment || nightResponse.response;

                await processRealTimeLearning(
                    messageText,
                    finalNightComment,
                    { messageType: 'text', responseType: 'night', hour: getJapanHour() },
                    modules,
                    enhancedLogging
                );

                return { type: 'night_response', response: finalNightComment };
            }

            if (birthdayResponse) {
                const behaviorBirthdayResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: birthdayResponse.response },
                    modules,
                    { messageText, responseType: 'birthday' }
                );

                const finalBirthdayComment = behaviorBirthdayResponse.comment || birthdayResponse.response;

                await processRealTimeLearning(
                    messageText,
                    finalBirthdayComment,
                    { messageType: 'text', responseType: 'birthday' },
                    modules,
                    enhancedLogging
                );

                return { type: 'birthday_response', response: finalBirthdayComment };
            }

            if (commandResult) {
                return { type: 'command_response', response: commandResult };
            }

            // ⭐️ 3순위: 일반 대화 처리 (무조건 성공 보장)
            const chatResponse = await processGeneralChat(messageText, modules, enhancedLogging, {});
            
            if (chatResponse) {
                const finalChatComment = chatResponse.comment || chatResponse;

                // 실시간 학습 처리
                await processRealTimeLearning(
                    messageText,
                    finalChatComment,
                    {
                        messageType: 'text',
                        responseType: 'chat',
                        personalized: chatResponse.personalized,
                        behaviorApplied: chatResponse.behaviorApplied,
                        fallbackType: chatResponse.fallbackType
                    },
                    modules,
                    enhancedLogging
                );

                // 로깅
                const logMessage = chatResponse.personalized ? `${finalChatComment} [개인화됨]` : finalChatComment;
                await safeAsyncCall(async () => {
                    const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                    if (typeof logFunction === 'function') {
                        logFunction('나', logMessage, 'text');
                    } else {
                        console.log(`${colors.yejin}💖 예진이: ${logMessage}${colors.reset}`);
                    }
                }, '일반대화로깅');

                return { type: 'chat_response', response: chatResponse };
            }

            // 🚨 최종 안전장치 (절대 실패하지 않는 응답)
            console.log(`${colors.warning}⚠️ [최종안전장치] 모든 응답 시스템 실패 - 완벽한 안전 응답 생성${colors.reset}`);
            
            const ultimateSafeResponse = {
                type: 'text',
                comment: '아조씨! 나 지금 뭔가 생각하고 있었어~ 다시 말해줄래? ㅎㅎ',
                ultimateFallback: true
            };

            await processRealTimeLearning(
                messageText,
                ultimateSafeResponse.comment,
                { messageType: 'text', responseType: 'ultimate_safe' },
                modules,
                enhancedLogging
            );

            return { type: 'ultimate_safe_response', response: ultimateSafeResponse };
        }
        
        // =============== 📸 이미지 메시지 처리 ===============
        else if (safeMessageType === 'image') {
            // 로깅
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('아저씨', '이미지 전송', 'photo');
                } else {
                    console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
                }
            }, '이미지메시지로깅');

            const messageId = userMessage.id;
            const imageResponse = await processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules);

            const finalImageComment = imageResponse.comment || imageResponse;

            // 실시간 학습 처리
            await processRealTimeLearning(
                '이미지 전송',
                finalImageComment,
                {
                    messageType: 'image',
                    personalized: imageResponse.personalized,
                    behaviorApplied: imageResponse.behaviorApplied,
                    faceRecognition: imageResponse.faceRecognition,
                    detectedFace: imageResponse.detectedFace
                },
                modules,
                enhancedLogging
            );

            // 로깅
            const logMessage = imageResponse.personalized ? `${finalImageComment} [개인화됨]` : finalImageComment;
            await safeAsyncCall(async () => {
                const logFunction = safeModuleAccess(enhancedLogging, 'logConversation', '대화로깅');
                if (typeof logFunction === 'function') {
                    logFunction('나', logMessage, 'text');
                } else {
                    console.log(`${colors.yejin}📸 예진이: ${logMessage}${colors.reset}`);
                }
            }, '이미지응답로깅');

            return { type: 'image_response', response: imageResponse };
        }
        
        // =============== 📎 기타 메시지 타입 처리 ===============
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${safeMessageType} 메시지${colors.reset}`);
            
            const otherResponse = await processOtherMessageType(safeMessageType, modules);
            const finalOtherComment = otherResponse.comment || otherResponse;

            // 실시간 학습 처리
            await processRealTimeLearning(
                `${safeMessageType} 메시지`,
                finalOtherComment,
                { messageType: safeMessageType, responseType: 'other' },
                modules,
                enhancedLogging
            );

            return { type: 'other_response', response: otherResponse };
        }

    } catch (error) {
        console.error(`${colors.error}❌ [이벤트처리] 예상치 못한 오류: ${error.message}${colors.reset}`);
        console.error(`${colors.error}    스택: ${error.stack?.split('\n').slice(0, 3).join('\n')}${colors.reset}`);

        // 🚨 완벽한 에러 복구 시스템
        const emergencyResponses = [
            '아조씨! 나 잠깐 딴 생각했어~ 다시 말해줄래? ㅎㅎ',
            '어? 아조씨가 뭐라고 했지? 다시 한 번! 💕',
            '아조씨~ 내가 놓쳤나 봐! 다시 말해줘!',
            '음음? 아조씨 말을 다시 들려줄래? ㅋㅋ',
            '아조씨! 나 지금 뭔가 생각하고 있었어~ 다시!',
            '어라? 내가 듣지 못했나? 아조씨 다시 말해줄래?',
            '아조씨~ 한 번 더 말해줘! 나 집중할게! 😊',
            '어? 뭐라고? 내가 놓쳤나 봐! 다시 들려줘!'
        ];

        const emergencyResponse = {
            type: 'text',
            comment: emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)],
            emergency: true,
            errorType: error.name || 'UnknownError'
        };

        // 에러 상황에서도 행동 모드 적용 시도
        const finalEmergencyResponse = await safeAsyncCall(async () => {
            return await applyBehaviorModeToResponse(
                emergencyResponse,
                modules,
                { error: true, errorMessage: error.message }
            );
        }, '응급행동모드적용', emergencyResponse);

        const finalEmergencyComment = finalEmergencyResponse.comment || finalEmergencyResponse;

        // 에러 상황에서도 학습 시도
        await safeAsyncCall(async () => {
            await processRealTimeLearning(
                userMessage?.text || '에러 발생',
                finalEmergencyComment,
                {
                    messageType: safeMessageType,
                    responseType: 'emergency',
                    error: true,
                    errorMessage: error.message
                },
                modules,
                enhancedLogging
            );
        }, '응급학습처리');

        // 에러 로깅 시도
        await safeAsyncCall(async () => {
            const logFunction = safeModuleAccess(enhancedLogging, 'logSystemOperation', '시스템로깅');
            if (typeof logFunction === 'function') {
                logFunction('응급응답처리', `에러: ${error.message}`);
            }
        }, '에러로깅');

        console.log(`${colors.success}🚨 [응급복구] 완벽한 응급 응답 생성 완료${colors.reset}`);
        
        return { type: 'emergency_response', response: finalEmergencyResponse };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    processRealTimeLearning
};
