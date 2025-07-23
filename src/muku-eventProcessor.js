// ============================================================================
// muku-eventProcessor.js - 무쿠 이벤트 처리 전용 모듈 + 실시간 학습 완전 연동 (수정)
// ✅ 메시지 처리, 이미지 처리, 명령어 처리 로직 분리
// 🔍 얼굴 인식, 새벽 대화, 생일 감지 등 모든 이벤트 처리
// 🧠 실시간 학습 시스템 연동 - 대화 패턴 학습 및 개인화
// 🎓 대화 완료 후 자동 학습 호출 - 매번 대화마다 학습 진행 ⭐️ 수정됨!
// 🎭 실시간 행동 스위치 시스템 완전 연동 - 모든 응답에 행동 모드 적용
// 🌏 일본시간(JST) 기준 시간 처리
// 💖 예진이의 감정과 기억을 더욱 생생하게 재현
// ⭐️ 행동 스위치 명령어 인식 100% 보장
// ⭐️ index.js의 handleLearningFromConversation() 함수와 연동 통일
// 🎂 생일 감지 오류 완전 수정 - detectBirthday → checkBirthday
// ============================================================================

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',     // 하늘색 (아저씨)
    yejin: '\x1b[95m',       // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',  // 굵은 빨간색 (PMS)
    system: '\x1b[92m',      // 연초록색 (시스템)
    learning: '\x1b[93m',    // 노란색 (학습)
    realtime: '\x1b[1m\x1b[93m', // 굵은 노란색 (실시간 학습) ⭐️ NEW!
    person: '\x1b[94m',      // 파란색 (사람 학습)
    behavior: '\x1b[35m',    // 마젠타색 (행동 스위치)
    error: '\x1b[91m',       // 빨간색 (에러)
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 🌏 일본시간 함수들 ==================
function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ================== 🎓 실시간 학습 시스템 처리 함수 (index.js 연동 방식으로 수정!) ==================
async function processRealTimeLearning(userMessage, mukuResponse, context, modules, enhancedLogging) {
    try {
        if (!modules.learningSystem) {
            console.log(`${colors.learning}🎓 [학습시스템] 비활성화 - 학습 건너뛰기${colors.reset}`);
            return null;
        }

        console.log(`${colors.realtime}🎓 [실시간학습] 대화 학습 시작...${colors.reset}`);
        console.log(`${colors.realtime}    📝 사용자: "${userMessage}"${colors.reset}`);
        console.log(`${colors.realtime}    💬 무쿠: "${mukuResponse}"${colors.reset}`);

        // ⭐️ index.js의 handleLearningFromConversation() 방식으로 통일 ⭐️
        // 학습 컨텍스트 구성 (index.js 스타일)
        const learningContext = {
            ...context,
            timestamp: new Date().toISOString(),
            japanTime: getJapanTimeString(), // index.js와 동일한 형식
            japanHour: getJapanHour()
        };

        // 현재 감정 상태 추가 (index.js와 동일한 방식)
        if (modules.emotionalContextManager && modules.emotionalContextManager.getCurrentEmotionalState) {
            try {
                const emotionalState = modules.emotionalContextManager.getCurrentEmotionalState();
                learningContext.currentEmotion = emotionalState.currentEmotion;
                learningContext.emotionalIntensity = emotionalState.intensity;
                console.log(`${colors.realtime}    💭 감정 상태: ${emotionalState.currentEmotion} (강도: ${emotionalState.intensity})${colors.reset}`);
            } catch (emotionError) {
                console.warn(`${colors.learning}⚠️ 감정 상태 조회 실패: ${emotionError.message}${colors.reset}`);
            }
        }

        // 삐짐 상태 추가 (index.js와 동일한 방식)
        if (modules.sulkyManager && modules.sulkyManager.getSulkinessState) {
            try {
                const sulkyState = modules.sulkyManager.getSulkinessState();
                learningContext.sulkyLevel = sulkyState.level;
                learningContext.isSulky = sulkyState.isSulky;
                console.log(`${colors.realtime}    😤 삐짐 상태: Level ${sulkyState.level} (${sulkyState.isSulky ? '삐짐' : '정상'})${colors.reset}`);
            } catch (sulkyError) {
                console.warn(`${colors.learning}⚠️ 삐짐 상태 조회 실패: ${sulkyError.message}${colors.reset}`);
            }
        }

        // 생리주기 상태 추가
        if (modules.emotionalContextManager && modules.emotionalContextManager.getCurrentCycleInfo) {
            try {
                const cycleInfo = modules.emotionalContextManager.getCurrentCycleInfo();
                learningContext.cycleDay = cycleInfo.day;
                learningContext.cyclePhase = cycleInfo.phase;
                learningContext.isPms = cycleInfo.isPms;
                console.log(`${colors.realtime}    🩸 생리주기: Day ${cycleInfo.day}, ${cycleInfo.phase}${cycleInfo.isPms ? ' (PMS)' : ''}${colors.reset}`);
            } catch (cycleError) {
                console.warn(`${colors.learning}⚠️ 생리주기 정보 조회 실패: ${cycleError.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️ 실시간 학습 실행 (index.js의 방식과 완전 동일!) ⭐️⭐️
        const learningResult = await modules.learningSystem.learnFromConversation(userMessage, mukuResponse, learningContext);

        if (learningResult) {
            console.log(`${colors.realtime}🎉 [학습완료] ${learningResult.improvements.length}개 개선사항 적용!${colors.reset}`);
            
            // 개선사항 상세 로그
            learningResult.improvements.forEach(improvement => {
                console.log(`${colors.realtime}    ✨ ${improvement.type}: ${improvement.reason || improvement.action || '개선됨'}${colors.reset}`);
            });

            // 학습 결과를 enhancedLogging에 기록 (index.js 방식)
            if (enhancedLogging && enhancedLogging.logSystemOperation) {
                enhancedLogging.logSystemOperation('실시간학습완료', 
                    `${learningResult.improvements.length}개 개선: ${learningResult.improvements.map(imp => imp.type).join(', ')}`
                );
            }

            return learningResult;
        } else {
            console.log(`${colors.learning}⚪ [학습결과] 학습할 내용 없음${colors.reset}`);
            return null;
        }

    } catch (error) {
        console.error(`${colors.error}❌ [실시간학습] 학습 처리 실패: ${error.message}${colors.reset}`);
        
        // 학습 에러도 로깅 (index.js 방식)
        if (enhancedLogging && enhancedLogging.logSystemOperation) {
            enhancedLogging.logSystemOperation('실시간학습실패', `${error.message}`);
        }
        
        return null;
    }
}

// ================== 🎭 실시간 행동 스위치 처리 함수 ==================
async function applyBehaviorModeToResponse(response, modules, messageContext) {
    try {
        if (!modules.realtimeBehaviorSwitch) {
            return response;
        }

        const currentMode = modules.realtimeBehaviorSwitch.getCurrentRolePlay();
        const currentBehaviorMode = modules.realtimeBehaviorSwitch.getCurrentBehaviorMode();
        
        if (!currentMode || currentMode === 'normal') {
            return response; // 일반 모드면 그대로 반환
        }

        console.log(`${colors.behavior}🎭 [행동모드] 현재 모드: ${currentMode} (강도: ${currentBehaviorMode.intensity}/10)${colors.reset}`);

        // 응답에 행동 모드 적용
        if (modules.realtimeBehaviorSwitch.applyBehaviorToResponse) {
            const modifiedResponse = modules.realtimeBehaviorSwitch.applyBehaviorToResponse(
                response.comment || response,
                messageContext
            );

            if (modifiedResponse && modifiedResponse !== (response.comment || response)) {
                console.log(`${colors.behavior}✨ [행동적용] 응답이 ${currentMode} 모드로 변경됨${colors.reset}`);
                
                if (typeof response === 'object') {
                    return {
                        ...response,
                        comment: modifiedResponse,
                        behaviorApplied: true,
                        behaviorMode: currentMode,
                        behaviorIntensity: currentBehaviorMode.intensity
                    };
                } else {
                    return modifiedResponse;
                }
            }
        }

        return response;
    } catch (error) {
        console.log(`${colors.error}⚠️ 행동 모드 적용 에러: ${error.message}${colors.reset}`);
        return response;
    }
}

async function processBehaviorSwitch(messageText, modules, client, userId) {
    try {
        if (!modules.realtimeBehaviorSwitch) {
            return null;
        }

        console.log(`${colors.behavior}🔍 [행동스위치] 명령어 감지 시도: "${messageText}"${colors.reset}`);

        // 메시지에서 행동 스위치 명령어 감지
        const switchResult = modules.realtimeBehaviorSwitch.processRealtimeBehaviorChange(messageText);
        
        if (switchResult && switchResult.length > 0) {
            console.log(`${colors.behavior}🎭 [행동변경] 명령어 인식 성공! 응답: "${switchResult}"${colors.reset}`);
            
            // 행동 변경 알림 메시지를 LINE으로 전송
            try {
                await client.pushMessage(userId, { 
                    type: 'text', 
                    text: switchResult 
                });
                
                console.log(`${colors.behavior}📤 [행동변경] 응답 메시지 전송 완료${colors.reset}`);
                
                return {
                    type: 'behavior_switch_handled',
                    handled: true,
                    response: null,
                    skipFurtherProcessing: true
                };
            } catch (error) {
                console.log(`${colors.error}❌ [행동변경] 메시지 전송 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.behavior}⚪ [행동스위치] 명령어 없음${colors.reset}`);
        }

        return null;
    } catch (error) {
        console.log(`${colors.error}⚠️ 행동 스위치 처리 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 👥 사람 학습 시스템 함수들 ==================
async function processPersonLearning(faceResult, imageMetadata, modules, enhancedLogging) {
    try {
        if (!modules.personLearningSystem) {
            return null;
        }

        const currentTime = getJapanTime();
        let personLearningResult = null;

        // 1. 얼굴 인식 결과에 따른 사람 학습 처리
        if (faceResult === '예진이' || faceResult === '아저씨') {
            // 기존 인물 재확인 및 카운트 증가
            personLearningResult = await modules.personLearningSystem.recordKnownPersonSighting(
                faceResult, 
                imageMetadata.timestamp,
                imageMetadata.context || 'photo_sharing'
            );
            
            console.log(`${colors.person}👥 [사람학습] ${faceResult} 재확인 - 총 ${personLearningResult.totalSightings}번째 목격${colors.reset}`);
            
        } else if (!faceResult || faceResult === 'unknown') {
            // 새로운 인물일 가능성 - 학습 시도
            const learningAttempt = await modules.personLearningSystem.attemptNewPersonLearning(
                imageMetadata.base64 || null,
                {
                    timestamp: currentTime,
                    context: 'unknown_face_detection',
                    imageSize: imageMetadata.imageSize
                }
            );
            
            if (learningAttempt.newPersonDetected) {
                console.log(`${colors.person}👥 [사람학습] 새로운 인물 감지 - ID: ${learningAttempt.personId}${colors.reset}`);
                personLearningResult = learningAttempt;
            } else {
                console.log(`${colors.person}👥 [사람학습] 얼굴 미감지 또는 학습 불가${colors.reset}`);
            }
        }

        // 2. 장소 정보 학습 (사진 메타데이터에서 추출 가능한 경우)
        if (personLearningResult && imageMetadata.location) {
            await modules.personLearningSystem.learnLocationContext(
                personLearningResult.personId || faceResult,
                imageMetadata.location,
                currentTime
            );
            
            console.log(`${colors.person}📍 [장소학습] ${imageMetadata.location} 정보 학습 완료${colors.reset}`);
        }

        // 3. 학습 결과 로깅
        if (personLearningResult && enhancedLogging && enhancedLogging.logPersonLearning) {
            enhancedLogging.logPersonLearning(personLearningResult);
        }

        return personLearningResult;

    } catch (error) {
        console.log(`${colors.error}⚠️ 사람 학습 처리 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

async function generatePersonalizedImageResponse(faceResult, personLearningResult, modules) {
    try {
        if (!modules.personLearningSystem) {
            return null; // 기본 응답 사용
        }

        // 사람 학습 데이터를 바탕으로 개인화된 응답 생성
        const personalizationData = await modules.personLearningSystem.getPersonalizationData(
            faceResult || 'unknown'
        );

        if (!personalizationData || personalizationData.sightingCount < 3) {
            return null; // 충분한 학습 데이터가 없으면 기본 응답 사용
        }

        // 개인화된 응답 생성 로직
        let personalizedResponse;

        if (faceResult === '예진이') {
            const responses = [
                `나야 나! 아저씨가 내 사진 ${personalizationData.sightingCount}번째 보는 거네~ 그렇게 좋아? ㅎㅎ`,
                `내 사진이다! 벌써 ${personalizationData.sightingCount}번이나 봤구나... 아저씨 나 엄청 그리워하는 것 같아 ㅎㅎ`,
                `이거 내 사진이네! ${personalizationData.lastSeenDaysAgo}일 전에도 봤는데... 아저씨는 정말 내 사진만 보고 있어! ㅋㅋ`
            ];
            personalizedResponse = responses[Math.floor(Math.random() * responses.length)];
            
        } else if (faceResult === '아저씨') {
            const responses = [
                `아저씨 사진! ${personalizationData.sightingCount}번째 셀카구나~ 아저씨 셀카 찍는 거 좋아하네? ㅎㅎ`,
                `우리 아저씨다! 이번이 ${personalizationData.sightingCount}번째 사진이야... 점점 잘생겨지는 것 같아!`,
                `아저씨 얼굴이야! ${personalizationData.recentFrequency}에 자주 보내주니까 기뻐~ 더 많이 보내줘!`
            ];
            personalizedResponse = responses[Math.floor(Math.random() * responses.length)];
            
        } else if (personLearningResult && personLearningResult.newPersonDetected) {
            const responses = [
                `어? 새로운 사람이네! 아저씨 친구야? 나도 알고 싶어! ㅎㅎ`,
                `이 사람 처음 보는 것 같은데... 누구야? 아저씨가 소개해줄래?`,
                `새로운 얼굴이다! 아저씨 주변에 사람이 많구나~ 나도 만나보고 싶어!`
            ];
            personalizedResponse = responses[Math.floor(Math.random() * responses.length)];
            
        } else {
            // 알 수 없는 사람이지만 여러 번 본 경우
            const responses = [
                `이 사람... ${personalizationData.sightingCount}번째 보는 것 같은데 누구야? 궁금해!`,
                `자주 보는 얼굴인데... 아저씨 친구? 나도 얘기하고 싶어!`,
                `이 사람 누구야? 종종 사진에 나오던데... 아저씨가 알려줘!`
            ];
            personalizedResponse = responses[Math.floor(Math.random() * responses.length)];
        }

        console.log(`${colors.person}💖 [개인화응답] 사람 학습 데이터 기반 개인화 완료 (목격: ${personalizationData.sightingCount}회)${colors.reset}`);
        
        return personalizedResponse;

    } catch (error) {
        console.log(`${colors.error}⚠️ 개인화 이미지 응답 생성 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

async function processLearningFromMessage(messageText, modules, enhancedLogging) {
    try {
        // 1. 대화 패턴 학습
        if (modules.conversationPatternLearner && modules.conversationPatternLearner.learnFromMessage) {
            const patternLearning = await modules.conversationPatternLearner.learnFromMessage(messageText);
            if (patternLearning.newPatternsLearned > 0) {
                console.log(`${colors.learning}🧠 [패턴학습] 새로운 패턴 ${patternLearning.newPatternsLearned}개 학습완료${colors.reset}`);
                
                if (enhancedLogging && enhancedLogging.logLearningEvent) {
                    enhancedLogging.logLearningEvent('pattern_learning', {
                        patterns: patternLearning.newPatternsLearned,
                        keywords: patternLearning.keywords
                    });
                }
            }
        }

        // 2. 실시간 학습 시스템 업데이트
        if (modules.realTimeLearningSystem && modules.realTimeLearningSystem.processUserMessage) {
            const learningResult = await modules.realTimeLearningSystem.processUserMessage(messageText);
            if (learningResult.emotionalInsights || learningResult.preferenceUpdates) {
                console.log(`${colors.learning}💡 [실시간학습] 감정통찰: ${learningResult.emotionalInsights?.length || 0}개, 선호도갱신: ${learningResult.preferenceUpdates?.length || 0}개${colors.reset}`);
                
                if (enhancedLogging && enhancedLogging.logLearningEvent) {
                    enhancedLogging.logLearningEvent('realtime_learning', learningResult);
                }
            }
        }

        // 3. 고급 감정 엔진 업데이트
        if (modules.advancedEmotionEngine && modules.advancedEmotionEngine.analyzeEmotionalContext) {
            const emotionAnalysis = await modules.advancedEmotionEngine.analyzeEmotionalContext(messageText);
            if (emotionAnalysis.dominantEmotion) {
                console.log(`${colors.learning}💝 [감정분석] 주요감정: ${emotionAnalysis.dominantEmotion}, 강도: ${emotionAnalysis.intensity}/10${colors.reset}`);
                
                // 감정 분석 결과를 감정 상태 관리자에 전달
                if (modules.emotionalContextManager && modules.emotionalContextManager.updateEmotionalContext) {
                    modules.emotionalContextManager.updateEmotionalContext(emotionAnalysis);
                }
            }
        }

        return true;
    } catch (error) {
        console.log(`${colors.error}⚠️ 학습 시스템 처리 에러: ${error.message}${colors.reset}`);
        return false;
    }
}

async function generatePersonalizedResponse(messageText, modules, baseResponse) {
    try {
        // 1. 맥락 기반 응답 생성기 활용
        if (modules.contextualResponseGenerator && modules.contextualResponseGenerator.enhanceResponse) {
            const enhancedResponse = await modules.contextualResponseGenerator.enhanceResponse(
                messageText, 
                baseResponse,
                {
                    includePersonalization: true,
                    emotionalTone: 'caring',
                    memoryIntegration: true
                }
            );
            
            if (enhancedResponse && enhancedResponse.response !== baseResponse.comment) {
                console.log(`${colors.learning}✨ [개인화응답] 기본 응답을 개인화된 응답으로 개선${colors.reset}`);
                return {
                    ...baseResponse,
                    comment: enhancedResponse.response,
                    personalized: true,
                    personalizationLevel: enhancedResponse.personalizationLevel
                };
            }
        }

        // 2. 동적 기억 관리자를 통한 기억 기반 응답
        if (modules.dynamicMemoryManager && modules.dynamicMemoryManager.getContextualMemories) {
            const relevantMemories = await modules.dynamicMemoryManager.getContextualMemories(messageText, 3);
            if (relevantMemories && relevantMemories.length > 0) {
                console.log(`${colors.learning}🔮 [동적기억] ${relevantMemories.length}개 관련 기억 발견${colors.reset}`);
                
                // 기억을 바탕으로 응답 보강
                if (modules.contextualResponseGenerator && modules.contextualResponseGenerator.integrateMemories) {
                    const memoryEnhancedResponse = await modules.contextualResponseGenerator.integrateMemories(
                        baseResponse.comment,
                        relevantMemories
                    );
                    
                    if (memoryEnhancedResponse) {
                        return {
                            ...baseResponse,
                            comment: memoryEnhancedResponse,
                            memoryIntegrated: true,
                            relevantMemories: relevantMemories.length
                        };
                    }
                }
            }
        }

        return baseResponse;
    } catch (error) {
        console.log(`${colors.error}⚠️ 개인화 응답 생성 에러: ${error.message}${colors.reset}`);
        return baseResponse;
    }
}

async function analyzeConversationContext(messageText, modules) {
    try {
        // 대화 분석 엔진을 통한 심층 분석
        if (modules.conversationAnalyzer && modules.conversationAnalyzer.analyzeMessage) {
            const analysis = await modules.conversationAnalyzer.analyzeMessage(messageText);
            
            if (analysis) {
                console.log(`${colors.learning}📊 [대화분석] 의도: ${analysis.intent}, 감정: ${analysis.emotion}, 주제: ${analysis.topic}${colors.reset}`);
                
                // 분석 결과를 다른 시스템들에 전파
                if (modules.ultimateContext && modules.ultimateContext.updateConversationContext) {
                    modules.ultimateContext.updateConversationContext(analysis);
                }
                
                return analysis;
            }
        }
        
        return null;
    } catch (error) {
        console.log(`${colors.error}⚠️ 대화 분석 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🔍 얼굴 인식 관련 함수들 ==================
async function detectFaceSafely(base64Image, faceMatcher, loadFaceMatcherSafely) {
    try {
        const matcher = faceMatcher || await loadFaceMatcherSafely();
        
        if (matcher && matcher.detectFaceMatch) {
            console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
            return await matcher.detectFaceMatch(base64Image);
        } else {
            console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
            return null;
        }
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 얼굴 인식 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== ✨ GPT 모델 버전 응답 처리 ==================
function processVersionCommand(messageText, getVersionResponse) {
    const versionResponse = getVersionResponse(messageText);
    return versionResponse;
}

// ================== 😤 삐짐 상태 해소 처리 ==================
async function processSulkyRelief(modules, enhancedLogging) {
    if (modules.sulkyManager && modules.sulkyManager.handleUserResponse) {
        try {
            const reliefMessage = await modules.sulkyManager.handleUserResponse();
            if (reliefMessage) {
                if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                    enhancedLogging.logSpontaneousAction('sulky_relief', reliefMessage);
                } else {
                    console.log(`${colors.yejin}😤→😊 [삐짐해소] ${reliefMessage}${colors.reset}`);
                }
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 삐짐 해소 처리 에러: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🌙 새벽 대화 감지 및 처리 ==================
async function processNightWakeMessage(messageText, modules, enhancedLogging) {
    const currentHour = getJapanHour();
    if (modules.nightWakeResponse && currentHour >= 2 && currentHour <= 7) {
        try {
            const nightResponse = await modules.nightWakeResponse.processNightMessage(messageText, currentHour);
            if (nightResponse && nightResponse.handled) {
                if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                    enhancedLogging.logSpontaneousAction('night_wake', nightResponse.response);
                } else {
                    console.log(`${colors.yejin}🌙 [새벽대화] ${nightResponse.response}${colors.reset}`);
                }
                return nightResponse;
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 새벽 대화 처리 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 🎂 생일 감지 및 처리 (오류 수정!) ==================
async function processBirthdayDetection(messageText, modules, enhancedLogging) {
    try {
        if (!modules.birthdayDetector) {
            console.log(`${colors.error}🎂 [생일감지] 시스템 비활성화 - 고정 기억 사용${colors.reset}`);
            return null;
        }

        // ✅ checkBirthday 함수 사용 (detectBirthday → checkBirthday 수정)
        const birthdayResponse = modules.birthdayDetector.checkBirthday(messageText);
        
        if (birthdayResponse) {
            console.log(`${colors.yejin}🎂 [생일감지] ${birthdayResponse}${colors.reset}`);
            
            if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                enhancedLogging.logSpontaneousAction('birthday_greeting', birthdayResponse);
            }
            
            return {
                handled: true,
                response: birthdayResponse
            };
        }
        
        return null;
    } catch (error) {
        console.log(`${colors.error}⚠️ 생일 감지 처리 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🧠 고정 기억 연동 처리 ==================
function processFixedMemory(messageText, modules) {
    if (modules.memoryManager && modules.memoryManager.getFixedMemory) {
        try {
            const relatedMemory = modules.memoryManager.getFixedMemory(messageText);
            if (relatedMemory) {
                console.log(`${colors.system}🧠 [고정기억] 관련 기억 발견: "${relatedMemory.substring(0, 30)}..."${colors.reset}`);
                if (modules.ultimateContext && modules.ultimateContext.addMemoryContext) {
                    modules.ultimateContext.addMemoryContext(relatedMemory);
                }
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 고정 기억 검색 에러: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🤖 명령어 처리 ==================
async function processCommand(messageText, userId, client, modules) {
    if (modules.commandHandler && modules.commandHandler.handleCommand) {
        try {
            const commandResult = await modules.commandHandler.handleCommand(messageText, userId, client);
            if (commandResult && commandResult.handled) {
                return commandResult;
            }
        } catch (error) {
            console.log(`${colors.error}⚠️ 명령어 처리 에러: ${error.message}${colors.reset}`);
        }
    }
    return null;
}

// ================== 💬 일반 대화 응답 처리 (학습 시스템 연동) ==================
async function processGeneralChat(messageText, modules, enhancedLogging, messageContext = {}) {
    try {
        // 1. 기본 응답 생성
        let botResponse = null;
        if (modules.autoReply && modules.autoReply.getReplyByMessage) {
            botResponse = await modules.autoReply.getReplyByMessage(messageText);
        }

        // 2. 응답이 없으면 시스템 분석기를 통한 지능형 응답 생성
        if (!botResponse && modules.systemAnalyzer && modules.systemAnalyzer.generateIntelligentResponse) {
            console.log(`${colors.learning}🤖 [지능형응답] 시스템 분석기를 통한 응답 생성 시도${colors.reset}`);
            botResponse = await modules.systemAnalyzer.generateIntelligentResponse(messageText, {
                includeEmotionalContext: true,
                usePersonalization: true,
                integrateDynamicMemory: true
            });
        }

        // 3. 기본 응답이 있으면 개인화 처리
        if (botResponse) {
            const personalizedResponse = await generatePersonalizedResponse(messageText, modules, botResponse);
            
            // 4. ⭐️ 실시간 행동 스위치 적용 ⭐️
            const behaviorAppliedResponse = await applyBehaviorModeToResponse(
                personalizedResponse, 
                modules, 
                { messageText, ...messageContext }
            );
            
            if (personalizedResponse.personalized) {
                console.log(`${colors.learning}💖 [개인화완료] 기본 응답 → 개인화된 응답으로 업그레이드${colors.reset}`);
            }
            
            return behaviorAppliedResponse;
        }

        return null;
    } catch (error) {
        console.log(`${colors.error}⚠️ 대화 응답 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📸 이미지 처리 함수들 (사람 학습 시스템 연동) ==================
function generateFaceRecognitionResponse(faceResult, modules, messageContext) {
    let baseResponse;
    
    if (faceResult === '예진이') {
        const responses = [
            '어? 이 사진 나야! 아저씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
            '이거 내 사진이네! 아저씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
            '아! 내 사진이다~ 아저씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ',
            '나야 나! 아저씨가 내 사진 볼 때마다 기뻐~ 더 많이 봐줘!',
            '내 사진이네! 이때 내가 예뻤지? 지금도 예쁘지만... ㅎㅎ'
        ];
        baseResponse = {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    } else if (faceResult === '아저씨') {
        const responses = [
            '아저씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
            '우리 아저씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
            '아저씨 얼굴이야! 이런 아저씨 좋아해~ 나만의 아저씨 ㅎㅎ',
            '아저씨! 셀카 찍었구나~ 나한테 보여주려고? 고마워 ㅎㅎ',
            '우리 아저씨 사진이다! 언제나 봐도 좋아... 더 보내줘!'
        ];
        baseResponse = {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    } else {
        const responses = [
            '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
            '이 사진 누구야? 아저씨 친구들이야? 나도 보고 싶어!',
            '사진이 잘 안 보여... 그래도 아저씨가 보낸 거니까 좋아! ㅎㅎ',
            '음... 누구인지 잘 모르겠지만 아저씨가 보낸 거니까 소중해!',
            '사진 고마워! 나도 언젠가 아저씨한테 사진 보내줄게!'
        ];
        baseResponse = {
            type: 'text',
            comment: responses[Math.floor(Math.random() * responses.length)]
        };
    }

    return baseResponse;
}

async function processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules) {
    try {
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

        // [수정된 로직 시작]
        const analysisResult = await detectFaceSafely(base64, faceMatcher, loadFaceMatcherSafely);
        console.log(`${colors.system}🎯 통합 분석 결과:`, (analysisResult ? `분류: ${analysisResult.type}`: '분석 실패'), `${colors.reset}`);

        let finalResponse;

        // AI가 생성한 반응(message)이 있으면 최우선으로 사용
        if (analysisResult && analysisResult.message) {
            finalResponse = {
                type: 'text',
                comment: analysisResult.message,
                personalized: true
            };
        } else {
            // AI 반응이 없다면, 분류(type)에 따라 기본 반응을 생성
            const faceType = analysisResult ? analysisResult.type : 'unknown';
            finalResponse = generateFaceRecognitionResponse(faceType, modules, {});
        }
        
        // ⭐️ 이미지 응답에도 실시간 행동 스위치 적용 ⭐️
        const behaviorAppliedResponse = await applyBehaviorModeToResponse(
            finalResponse,
            modules,
            { messageType: 'image', faceResult: analysisResult?.type }
        );
        
        const imageMetadata = { base64, imageSize: buffer.length, timestamp: getJapanTime(), context: 'photo_sharing' };
        await processPersonLearning(analysisResult?.type, imageMetadata, modules, enhancedLogging);

        return behaviorAppliedResponse;
        // [수정된 로직 끝]

    } catch (error) {
        console.error(`${colors.error}❌ 이미지 처리 에러: ${error.message}${colors.reset}`);
        const errorResponse = {
            type: 'text',
            comment: '사진이 잘 안 보여... 다시 보내줄래? ㅠㅠ'
        };
        
        // 에러 응답에도 행동 모드 적용 시도
        return await applyBehaviorModeToResponse(errorResponse, modules, { messageType: 'image', error: true });
    }
}

// ================== 📝 기타 메시지 타입 처리 ==================
async function processOtherMessageType(messageType, modules) {
    const responses = [
        '아저씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
        '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
        '아저씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!',
        '미안... 이 타입은 아직 내가 이해 못 해... 다시 말해줄래?',
        '아저씨가 보낸 건 알겠는데... 내가 아직 배우는 중이야 ㅠㅠ'
    ];
    
    const baseResponse = {
        type: 'text',
        comment: responses[Math.floor(Math.random() * responses.length)]
    };
    
    // ⭐️ 기타 메시지에도 실시간 행동 스위치 적용 ⭐️
    return await applyBehaviorModeToResponse(baseResponse, modules, { messageType: messageType });
}

// ================== 🎯 메인 이벤트 처리 함수 (실시간 학습 시스템 완전 연동) ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    try {
        const userId = event.source.userId;
        const userMessage = event.message;

        if (userMessage.type === 'text') {
            const messageText = userMessage.text.trim();
            if (enhancedLogging?.logConversation) {
                enhancedLogging.logConversation('아저씨', messageText, 'text');
            } else {
                console.log(`${colors.ajeossi}💬 아저씨: ${messageText}${colors.reset}`);
            }

            // ⭐️⭐️⭐️ 실시간 행동 스위치 처리 (최우선) ⭐️⭐️⭐️
            const behaviorSwitchResult = await processBehaviorSwitch(messageText, modules, client, userId);
            if (behaviorSwitchResult && behaviorSwitchResult.handled) {
                if (enhancedLogging?.logConversation) {
                    enhancedLogging.logConversation('나', '행동 설정 변경됨', 'text');
                } else {
                    console.log(`${colors.behavior}🎭 예진이: 행동 설정 변경 완료${colors.reset}`);
                }
                return null; // 아무것도 반환하지 않아서 추가 처리 완전 중단
            }

            console.log(`${colors.learning}🧠 [학습시작] 메시지 학습 및 분석 시작...${colors.reset}`);
            const conversationContext = await analyzeConversationContext(messageText, modules);
            await processLearningFromMessage(messageText, modules, enhancedLogging);

            const versionResponse = processVersionCommand(messageText, getVersionResponse);
            if (versionResponse) {
                // ⭐️ 버전 응답에도 행동 모드 적용 ⭐️
                const behaviorVersionResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: versionResponse },
                    modules,
                    { messageText, responseType: 'version' }
                );
                
                const finalVersionComment = behaviorVersionResponse.comment || versionResponse;
                
                // ⭐️⭐️ 버전 응답 후 실시간 학습 처리 ⭐️⭐️
                try {
                    await processRealTimeLearning(
                        messageText, 
                        finalVersionComment, 
                        { 
                            messageType: 'text', 
                            responseType: 'version',
                            conversationContext
                        }, 
                        modules, 
                        enhancedLogging
                    );
                } catch (learningError) {
                    console.warn(`${colors.learning}⚠️ 버전 응답 학습 실패: ${learningError.message}${colors.reset}`);
                }
                
                if (enhancedLogging?.logConversation) {
                    enhancedLogging.logConversation('나', finalVersionComment, 'text');
                } else {
                    console.log(`${colors.yejin}✨ 예진이 (버전응답): ${finalVersionComment}${colors.reset}`);
                }
                return { type: 'version_response', response: finalVersionComment };
            }

            await processSulkyRelief(modules, enhancedLogging);
            const nightResponse = await processNightWakeMessage(messageText, modules, enhancedLogging);
            if (nightResponse) {
                // ⭐️ 새벽 응답에도 행동 모드 적용 ⭐️
                const behaviorNightResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: nightResponse.response },
                    modules,
                    { messageText, responseType: 'night', hour: getJapanHour() }
                );
                
                const finalNightComment = behaviorNightResponse.comment || nightResponse.response;
                
                // ⭐️⭐️ 새벽 응답 후 실시간 학습 처리 ⭐️⭐️
                try {
                    await processRealTimeLearning(
                        messageText, 
                        finalNightComment, 
                        { 
                            messageType: 'text', 
                            responseType: 'night',
                            hour: getJapanHour(),
                            conversationContext
                        }, 
                        modules, 
                        enhancedLogging
                    );
                } catch (learningError) {
                    console.warn(`${colors.learning}⚠️ 새벽 응답 학습 실패: ${learningError.message}${colors.reset}`);
                }
                
                return { type: 'night_response', response: finalNightComment };
            }
            
            // ✅ 생일 감지 처리 (완전 수정됨!)
            const birthdayResponse = await processBirthdayDetection(messageText, modules, enhancedLogging);
            if (birthdayResponse && birthdayResponse.handled) {
                // ⭐️ 생일 응답에도 행동 모드 적용 ⭐️
                const behaviorBirthdayResponse = await applyBehaviorModeToResponse(
                    { type: 'text', comment: birthdayResponse.response },
                    modules,
                    { messageText, responseType: 'birthday' }
                );
                
                const finalBirthdayComment = behaviorBirthdayResponse.comment || birthdayResponse.response;
                
                // ⭐️⭐️ 생일 응답 후 실시간 학습 처리 ⭐️⭐️
                try {
                    await processRealTimeLearning(
                        messageText, 
                        finalBirthdayComment, 
                        { 
                            messageType: 'text', 
                            responseType: 'birthday',
                            conversationContext
                        }, 
                        modules, 
                        enhancedLogging
                    );
                } catch (learningError) {
                    console.warn(`${colors.learning}⚠️ 생일 응답 학습 실패: ${learningError.message}${colors.reset}`);
                }
                
                return { type: 'birthday_response', response: finalBirthdayComment };
            }
            
            processFixedMemory(messageText, modules);
            const commandResult = await processCommand(messageText, userId, client, modules);
            if (commandResult) return { type: 'command_response', response: commandResult };

            const chatResponse = await processGeneralChat(messageText, modules, enhancedLogging, { conversationContext });
            if (chatResponse) {
                const finalChatComment = chatResponse.comment || chatResponse;
                
                // ⭐️⭐️⭐️ 일반 대화 응답 후 실시간 학습 처리 (가장 중요!) ⭐️⭐️⭐️
                try {
                    await processRealTimeLearning(
                        messageText, 
                        finalChatComment, 
                        { 
                            messageType: 'text', 
                            responseType: 'chat',
                            personalized: chatResponse.personalized,
                            behaviorApplied: chatResponse.behaviorApplied,
                            conversationContext
                        }, 
                        modules, 
                        enhancedLogging
                    );
                } catch (learningError) {
                    console.warn(`${colors.learning}⚠️ 일반 대화 학습 실패: ${learningError.message}${colors.reset}`);
                }
                
                const logMessage = chatResponse.personalized ? `${finalChatComment} [개인화됨]` : finalChatComment;
                if (enhancedLogging?.logConversation) {
                    enhancedLogging.logConversation('나', logMessage, 'text');
                } else {
                    console.log(`${colors.yejin}💖 예진이: ${logMessage}${colors.reset}`);
                }
                return { type: 'chat_response', response: chatResponse, conversationContext: conversationContext };
            }
            
            // ⭐️ 폴백 응답에도 행동 모드 적용 ⭐️
            const fallbackResponse = await applyBehaviorModeToResponse(
                { type: 'text', comment: '아저씨~ 나 지금 시스템 준비 중이야... 조금만 기다려줘! ㅎㅎ' },
                modules,
                { messageText, responseType: 'fallback' }
            );
            
            const finalFallbackComment = fallbackResponse.comment || fallbackResponse;
            
            // ⭐️⭐️ 폴백 응답 후에도 학습 처리 ⭐️⭐️
            try {
                await processRealTimeLearning(
                    messageText, 
                    finalFallbackComment, 
                    { 
                        messageType: 'text', 
                        responseType: 'fallback',
                        conversationContext
                    }, 
                    modules, 
                    enhancedLogging
                );
            } catch (learningError) {
                console.warn(`${colors.learning}⚠️ 폴백 응답 학습 실패: ${learningError.message}${colors.reset}`);
            }
            
            return { type: 'fallback_response', response: fallbackResponse };
        }
        else if (userMessage.type === 'image') {
            if (enhancedLogging?.logConversation) {
                enhancedLogging.logConversation('아저씨', '이미지 전송', 'photo');
            } else {
                console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
            }

            const messageId = userMessage.id;
            const imageResponse = await processImageMessage(messageId, client, faceMatcher, loadFaceMatcherSafely, enhancedLogging, modules);
            
            const finalImageComment = imageResponse.comment || imageResponse;
            
            // ⭐️⭐️⭐️ 이미지 응답 후 실시간 학습 처리 ⭐️⭐️⭐️
            try {
                await processRealTimeLearning(
                    '이미지 전송', 
                    finalImageComment, 
                    { 
                        messageType: 'image', 
                        personalized: imageResponse.personalized,
                        behaviorApplied: imageResponse.behaviorApplied
                    }, 
                    modules, 
                    enhancedLogging
                );
            } catch (learningError) {
                console.warn(`${colors.learning}⚠️ 이미지 응답 학습 실패: ${learningError.message}${colors.reset}`);
            }
            
            const logMessage = imageResponse.personalized ? `${finalImageComment} [개인화됨]` : finalImageComment;
            if (enhancedLogging?.logConversation) {
                enhancedLogging.logConversation('나', logMessage, 'text');
            } else {
                console.log(`${colors.yejin}📸 예진이: ${logMessage}${colors.reset}`);
            }
            return { type: 'image_response', response: imageResponse };
        }
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${userMessage.type} 메시지${colors.reset}`);
            const otherResponse = await processOtherMessageType(userMessage.type, modules);
            
            const finalOtherComment = otherResponse.comment || otherResponse;
            
            // ⭐️⭐️ 기타 메시지 응답 후에도 학습 처리 ⭐️⭐️
            try {
                await processRealTimeLearning(
                    `${userMessage.type} 메시지`, 
                    finalOtherComment, 
                    { 
                        messageType: userMessage.type,
                        responseType: 'other'
                    }, 
                    modules, 
                    enhancedLogging
                );
            } catch (learningError) {
                console.warn(`${colors.learning}⚠️ 기타 메시지 학습 실패: ${learningError.message}${colors.reset}`);
            }
            
            return { type: 'other_response', response: otherResponse };
        }

    } catch (error) {
        console.error(`${colors.error}❌ 메시지 처리 에러: ${error.message}${colors.reset}`);
        if (modules.realTimeLearningSystem?.learnFromError) {
            try {
                await modules.realTimeLearningSystem.learnFromError(error, { messageType: event.message?.type, timestamp: getJapanTime() });
            } catch (learningError) {
                console.log(`${colors.error}⚠️ 에러 학습 실패: ${learningError.message}${colors.reset}`);
            }
        }
        
        // ⭐️ 에러 응답에도 행동 모드 적용 ⭐️
        const errorResponse = await applyBehaviorModeToResponse(
            { type: 'text', comment: '아저씨... 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ' },
            modules,
            { error: true, errorMessage: error.message }
        );
        
        const finalErrorComment = errorResponse.comment || errorResponse;
        
        // ⭐️⭐️ 에러 응답 후에도 학습 처리 (에러에서도 학습!) ⭐️⭐️
        try {
            await processRealTimeLearning(
                event.message?.text || '에러 발생', 
                finalErrorComment, 
                { 
                    messageType: event.message?.type || 'unknown',
                    responseType: 'error',
                    error: true,
                    errorMessage: error.message
                }, 
                modules, 
                enhancedLogging
            );
        } catch (learningError) {
            console.warn(`${colors.learning}⚠️ 에러 응답 학습 실패: ${learningError.message}${colors.reset}`);
        }
        
        return { type: 'error_response', response: errorResponse };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleEvent,
    processRealTimeLearning // ⭐️ 실시간 학습 함수도 내보내기 (다른 모듈에서 사용 가능)
};
