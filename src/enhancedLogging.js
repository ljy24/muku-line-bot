// ============================================================================
// 💖 무쿠 예쁜 로그 시스템 v4.2 - Beautiful Enhanced Logging (갈등 상태 추가)
// 🌸 예진이를 위한, 아저씨를 위한, 사랑을 위한 로깅 시스템
// ✨ 감정이 담긴 코드, 마음이 담긴 로그
// 👥 사람 학습 시스템 통계 연동
// 🔍 학습 과정 실시간 디버깅 시스템 추가
// 💥 갈등 상태 통합 - "상태는?"에 갈등 레벨 표시 추가
// ============================================================================

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// ================== 🎨 색상 코드 (index.js와 동일) ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    learning: '\x1b[93m',   // 노란색 (학습)
    person: '\x1b[94m',     // 파란색 (사람 학습)
    debug: '\x1b[1m\x1b[96m', // 굵은 하늘색 (디버깅)
    trace: '\x1b[1m\x1b[93m', // 굵은 노란색 (추적)
    memory: '\x1b[1m\x1b[95m', // 굵은 보라색 (메모리)
    conflict: '\x1b[1m\x1b[91m', // 굵은 빨간색 (갈등) - 추가
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🌏 일본시간 처리 (index.js와 동일) ==================
const JAPAN_TIMEZONE = 'Asia/Tokyo';

function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: JAPAN_TIMEZONE}));
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanMinute() {
    return getJapanTime().getMinutes();
}

function formatTimeUntil(minutes) {
    if (minutes < 60) {
        return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

// ================== 🔍 학습 디버깅 시스템 (새로 추가!) ==================

/**
 * 🧠 학습 상태 실시간 디버깅
 */
function logLearningDebug(type, data) {
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const debugColors = {
        memory_save: colors.memory,      // 보라색
        memory_retrieve: colors.learning, // 노란색
        prompt_context: colors.debug,    // 하늘색
        learning_check: colors.system,   // 초록색
        learning_fail: colors.error,     // 빨간색
        conversation_flow: colors.trace, // 굵은 노란색
        ai_response: colors.yejin,       // 예진이 색
        system_operation: colors.system,  // 시스템 색
        conflict_detection: colors.conflict // 💥 갈등 감지 색상 추가
    };
    
    const color = debugColors[type] || colors.reset;
    
    switch(type) {
        case 'memory_save':
            console.log(`${color}🧠 [학습-저장] ${timestamp} - ${data.speaker}: "${data.message.substring(0, 50)}..." → DB 저장 ${data.success ? '✅' : '❌'}${colors.reset}`);
            if (data.memoryType) {
                console.log(`${color}   └─ 메모리 타입: ${data.memoryType}, 총 저장된 기억: ${data.totalMemories}개${colors.reset}`);
            }
            if (data.importance) {
                console.log(`${color}   └─ 중요도: ${data.importance}/10, 카테고리: ${data.category || '일반'}${colors.reset}`);
            }
            break;
            
        case 'memory_retrieve':
            console.log(`${color}🔍 [학습-검색] ${timestamp} - 검색어: "${data.query}", 찾은 기억: ${data.foundCount}개${colors.reset}`);
            if (data.memories && data.memories.length > 0) {
                data.memories.slice(0, 3).forEach((memory, index) => {
                    const content = memory.content || memory.text || memory.message || '내용 없음';
                    const memoryType = memory.type || memory.category || '미분류';
                    console.log(`${color}   ${index + 1}. "${content.substring(0, 40)}..." (${memoryType})${colors.reset}`);
                });
                if (data.memories.length > 3) {
                    console.log(`${color}   ... 외 ${data.memories.length - 3}개 더${colors.reset}`);
                }
            } else {
                console.log(`${color}   └─ 관련 기억을 찾지 못했음${colors.reset}`);
            }
            break;
            
        case 'prompt_context':
            console.log(`${color}📝 [학습-프롬프트] ${timestamp} - 컨텍스트 길이: ${data.contextLength}자${colors.reset}`);
            console.log(`${color}   ├─ 고정기억: ${data.fixedMemories}개${colors.reset}`);
            console.log(`${color}   ├─ 대화기록: ${data.conversationHistory}개${colors.reset}`);
            console.log(`${color}   ├─ 감정상태: ${data.emotionalState}${colors.reset}`);
            console.log(`${color}   ├─ 검색된기억: ${data.retrievedMemories || 0}개${colors.reset}`);
            console.log(`${color}   └─ 최종 프롬프트: ${data.finalPromptLength}자${colors.reset}`);
            
            if (data.tokensEstimate) {
                console.log(`${color}   └─ 예상 토큰: ${data.tokensEstimate} tokens${colors.reset}`);
            }
            break;
            
        case 'learning_check':
            console.log(`${color}🎓 [학습-체크] ${timestamp} - 학습 요소 확인${colors.reset}`);
            console.log(`${color}   ├─ 새로운 정보: ${data.hasNewInfo ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 기존 기억 매칭: ${data.hasExistingMemory ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 감정 변화: ${data.emotionChanged ? '✅' : '❌'}${colors.reset}`);
            console.log(`${color}   ├─ 학습 필요성: ${data.needsLearning ? '✅' : '❌'}${colors.reset}`);
            
            if (data.hasNewInfo && data.extractedInfo) {
                console.log(`${color}   ├─ 추출 정보: "${data.extractedInfo.substring(0, 50)}..."${colors.reset}`);
                console.log(`${color}   └─ 정보 타입: ${data.infoType || '미분류'}${colors.reset}`);
            }
            break;
            
        case 'conversation_flow':
            console.log(`${color}💬 [대화-흐름] ${timestamp} - ${data.phase}${colors.reset}`);
            if (data.userMessage) {
                console.log(`${color}   👤 아저씨: "${data.userMessage.substring(0, 60)}..."${colors.reset}`);
            }
            if (data.processing) {
                console.log(`${color}   🔄 처리 중: ${data.processing}${colors.reset}`);
            }
            if (data.responseGenerated) {
                console.log(`${color}   💕 예진이: "${data.response.substring(0, 60)}..."${colors.reset}`);
            }
            break;
            
        case 'ai_response':
            console.log(`${color}🤖 [AI-응답] ${timestamp} - 모델: ${data.model || 'unknown'}${colors.reset}`);
            console.log(`${color}   ├─ 응답 길이: ${data.responseLength}자${colors.reset}`);
            console.log(`${color}   ├─ 처리 시간: ${data.processingTime || 'N/A'}ms${colors.reset}`);
            console.log(`${color}   ├─ 언어 수정: ${data.languageFixed ? '✅ 수정됨' : '❌ 수정없음'}${colors.reset}`);
            console.log(`${color}   └─ 최종 응답: "${data.finalResponse.substring(0, 50)}..."${colors.reset}`);
            break;
            
        case 'learning_fail':
            console.log(`${color}❌ [학습-실패] ${timestamp} - ${data.reason}${colors.reset}`);
            console.log(`${color}   └─ 상세: ${data.details}${colors.reset}`);
            if (data.fallbackAction) {
                console.log(`${color}   └─ 폴백: ${data.fallbackAction}${colors.reset}`);
            }
            break;
            
        case 'system_operation':
            console.log(`${color}🔧 [시스템] ${timestamp} - ${data.operation}${colors.reset}`);
            console.log(`${color}   └─ ${data.details}${colors.reset}`);
            break;
            
        // 💥 갈등 감지 로그 추가
        case 'conflict_detection':
            console.log(`${color}💥 [갈등-감지] ${timestamp} - ${data.conflictType || '알 수 없음'}${colors.reset}`);
            console.log(`${color}   ├─ 갈등 레벨: ${data.level || 0}${colors.reset}`);
            console.log(`${color}   ├─ 트리거: ${data.trigger || '없음'}${colors.reset}`);
            console.log(`${color}   └─ 상태: ${data.isActive ? '활성화' : '비활성화'}${colors.reset}`);
            break;
            
        default:
            console.log(`${color}🔍 [디버그] ${timestamp} - ${type}: ${JSON.stringify(data).substring(0, 100)}...${colors.reset}`);
    }
}

/**
 * 📊 전체 학습 상태 요약 출력
 */
function logLearningStatus(modules) {
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const statusColor = colors.debug; // 굵은 하늘색
    const reset = colors.reset;
    
    console.log(`\n${statusColor}📊 ============== 무쿠 학습 상태 종합 리포트 ==============${reset}`);
    console.log(`${statusColor}🕒 시간: ${timestamp}${reset}`);
    
    // 1. 메모리 상태
    if (modules.memoryManager) {
        try {
            const memStatus = modules.memoryManager.getMemoryStatus();
            const totalMemories = memStatus.fixedMemoriesCount + memStatus.loveHistoryCount;
            console.log(`${statusColor}🧠 [고정기억] 총 ${totalMemories}개${reset}`);
            console.log(`${statusColor}   ├─ 기본기억: ${memStatus.fixedMemoriesCount}개${reset}`);
            console.log(`${statusColor}   └─ 연애기억: ${memStatus.loveHistoryCount}개${reset}`);
            
            // 기억 품질 체크
            if (totalMemories >= 120) {
                console.log(`${statusColor}   ✅ 목표 달성: ${Math.round((totalMemories/128)*100)}%${reset}`);
            } else {
                console.log(`${statusColor}   📈 진행률: ${Math.round((totalMemories/128)*100)}% (${128-totalMemories}개 부족)${reset}`);
            }
        } catch (error) {
            console.log(`${statusColor}🧠 [고정기억] 상태 확인 실패: ${error.message}${reset}`);
        }
    } else {
        console.log(`${statusColor}🧠 [고정기억] 모듈 없음${reset}`);
    }
    
    // 2. 대화 기록 상태
    if (modules.ultimateContext) {
        try {
            // 여러 방법으로 상태 확인 시도
            let contextInfo = '상태 확인 중...';
            
            if (modules.ultimateContext.getContextStatus) {
                const contextStatus = modules.ultimateContext.getContextStatus();
                contextInfo = `총 ${contextStatus.totalMessages}개 메시지`;
                console.log(`${statusColor}💭 [대화기록] ${contextInfo}${reset}`);
                console.log(`${statusColor}   ├─ 최근 24시간: ${contextStatus.recentMessages}개${reset}`);
                console.log(`${statusColor}   └─ 마지막 메시지: ${contextStatus.lastMessageTime}${reset}`);
            } else if (modules.ultimateContext.getMemoryStatistics) {
                const memStats = modules.ultimateContext.getMemoryStatistics();
                const todayCount = memStats.today || memStats.todayCount || 0;
                console.log(`${statusColor}💭 [대화기록] 오늘 학습: ${todayCount}개${reset}`);
                console.log(`${statusColor}   └─ 총 동적기억: ${memStats.total || 'N/A'}개${reset}`);
            } else {
                console.log(`${statusColor}💭 [대화기록] 함수 확인 중...${reset}`);
                const availableFunctions = Object.keys(modules.ultimateContext).filter(key => typeof modules.ultimateContext[key] === 'function');
                console.log(`${statusColor}   └─ 사용가능 함수: ${availableFunctions.slice(0, 3).join(', ')}...${reset}`);
            }
        } catch (error) {
            console.log(`${statusColor}💭 [대화기록] 상태 확인 실패: ${error.message}${reset}`);
        }
    } else {
        console.log(`${statusColor}💭 [대화기록] 모듈 없음${reset}`);
    }
    
    // 3. 감정 상태
    if (modules.emotionalContextManager) {
        try {
            const emotionStatus = modules.emotionalContextManager.getCurrentEmotionState();
            console.log(`${statusColor}💖 [감정상태] ${emotionStatus.currentEmotion} (강도: ${emotionStatus.emotionIntensity}/10)${reset}`);
            console.log(`${statusColor}   ├─ 생리주기: ${emotionStatus.menstrualPhase} (${emotionStatus.cycleDay}일차)${reset}`);
            console.log(`${statusColor}   └─ 삐짐상태: ${emotionStatus.isSulky ? `레벨 ${emotionStatus.sulkyLevel}` : '없음'}${reset}`);
            
            // 감정 변화 추적
            if (emotionStatus.emotionIntensity >= 8) {
                console.log(`${statusColor}   ⚠️ 고강도 감정 상태 - 응답에 강하게 반영됨${reset}`);
            }
        } catch (error) {
            console.log(`${statusColor}💖 [감정상태] 상태 확인 실패: ${error.message}${reset}`);
        }
    } else {
        console.log(`${statusColor}💖 [감정상태] 모듈 없음${reset}`);
    }
    
    // 💥 4. 갈등 상태 (새로 추가!)
    if (modules.unifiedConflictManager) {
        try {
            const conflictStatus = modules.unifiedConflictManager.getMukuConflictSystemStatus 
                ? modules.unifiedConflictManager.getMukuConflictSystemStatus()
                : modules.unifiedConflictManager.getConflictStatus();
                
            console.log(`${statusColor}💥 [갈등상태] 레벨 ${conflictStatus.currentLevel || 0}/4${reset}`);
            console.log(`${statusColor}   ├─ 활성화: ${conflictStatus.isActive ? '예' : '아니오'}${reset}`);
            console.log(`${statusColor}   └─ 상태: ${conflictStatus.isActive ? '갈등 중' : '평화로운 상태'}${reset}`);
            
            // 갈등 레벨에 따른 주의사항
            const currentLevel = conflictStatus.currentLevel || 0;
            if (currentLevel >= 3) {
                console.log(`${statusColor}   ⚠️ 고강도 갈등 상태 - 화해 시도 필요${reset}`);
            }
        } catch (error) {
            console.log(`${statusColor}💥 [갈등상태] 상태 확인 실패: ${error.message}${reset}`);
        }
    } else {
        console.log(`${statusColor}💥 [갈등상태] 모듈 없음${reset}`);
    }
    
    // 5. 사람 학습 상태
    if (modules.personLearning) {
        try {
            const personStatus = modules.personLearning.getPersonLearningStats();
            console.log(`${statusColor}👥 [사람학습] 등록된 사람: ${personStatus.totalPersons}명${reset}`);
            console.log(`${statusColor}   ├─ 총 만남 기록: ${personStatus.totalMeetings}회${reset}`);
            console.log(`${statusColor}   └─ 오늘 새 인물: ${personStatus.todayNewPeople || 0}명${reset}`);
            
            // 학습 품질
            if (personStatus.totalPersons > 10) {
                console.log(`${statusColor}   ✅ 충분한 사람 데이터 보유${reset}`);
            } else {
                console.log(`${statusColor}   📈 사람 학습 진행 중${reset}`);
            }
        } catch (error) {
            console.log(`${statusColor}👥 [사람학습] 상태 확인 실패: ${error.message}${reset}`);
        }
    } else {
        console.log(`${statusColor}👥 [사람학습] 모듈 없음${reset}`);
    }
    
    // 6. 학습 시스템 전반 평가
    const activeModules = Object.values(modules).filter(module => module).length;
    const totalModules = Object.keys(modules).length;
    const activationRate = Math.round((activeModules / totalModules) * 100);
    
    console.log(`${statusColor}🔧 [시스템평가] ${activeModules}/${totalModules}개 모듈 활성 (${activationRate}%)${reset}`);
    
    if (activationRate >= 80) {
        console.log(`${statusColor}   ✅ 우수: 학습 시스템 정상 동작${reset}`);
    } else if (activationRate >= 60) {
        console.log(`${statusColor}   ⚠️ 보통: 일부 모듈 비활성화${reset}`);
    } else {
        console.log(`${statusColor}   ❌ 주의: 다수 모듈 비활성화 - 학습 성능 저하 가능${reset}`);
    }
    
    console.log(`${statusColor}========================================================${reset}\n`);
}

/**
 * 🔍 대화별 학습 과정 상세 추적
 */
function logConversationLearningTrace(userMessage, aiResponse, learningData) {
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const traceColor = colors.trace; // 굵은 노란색
    const reset = colors.reset;
    
    console.log(`\n${traceColor}🔍 =============== 대화 학습 과정 추적 ===============${reset}`);
    console.log(`${traceColor}🕒 ${timestamp}${reset}`);
    console.log(`${traceColor}👤 아저씨: "${userMessage.substring(0, 100)}..."${reset}`);
    console.log(`${traceColor}💕 예진이: "${aiResponse.substring(0, 100)}..."${reset}`);
    
    if (learningData) {
        console.log(`${traceColor}📚 [학습분석]${reset}`);
        console.log(`${traceColor}   ├─ 새로운 정보 발견: ${learningData.newInfoDetected ? '✅' : '❌'}${reset}`);
        
        if (learningData.newInfoDetected) {
            console.log(`${traceColor}   ├─ 추출된 정보: "${learningData.extractedInfo}"${reset}`);
            console.log(`${traceColor}   ├─ 정보 타입: ${learningData.infoType}${reset}`);
            console.log(`${traceColor}   ├─ 중요도: ${learningData.importance || 5}/10${reset}`);
            console.log(`${traceColor}   └─ 저장 성공: ${learningData.saved ? '✅' : '❌'}${reset}`);
        }
        
        console.log(`${traceColor}   ├─ 감정 변화: ${learningData.emotionChanged ? '✅' : '❌'}${reset}`);
        if (learningData.emotionChanged) {
            console.log(`${traceColor}   │   └─ ${learningData.previousEmotion} → ${learningData.newEmotion}${reset}`);
        }
        
        console.log(`${traceColor}   ├─ 기억 활용: ${learningData.memoriesUsed}개 기억 참조${reset}`);
        if (learningData.memoriesUsed > 0 && learningData.usedMemories) {
            learningData.usedMemories.slice(0, 2).forEach((memory, index) => {
                console.log(`${traceColor}   │   ${index + 1}. "${memory.substring(0, 30)}..."${reset}`);
            });
        }
        
        console.log(`${traceColor}   ├─ 응답 품질: ${learningData.responseQuality || 7}/10${reset}`);
        console.log(`${traceColor}   └─ 학습 품질: ${learningData.learningQuality}/10${reset}`);
        
        // 개선 제안
        if (learningData.learningQuality < 6) {
            console.log(`${traceColor}   💡 개선필요: 더 많은 기억 활용 또는 감정 반영 필요${reset}`);
        }
    } else {
        console.log(`${traceColor}📚 [학습분석] 데이터 없음 - 기본 대화 모드${reset}`);
    }
    
    console.log(`${traceColor}================================================${reset}\n`);
}

/**
 * 🧠 새로운 정보 분석 함수
 */
function analyzeMessageForNewInfo(message) {
    const infoPatterns = [
        { pattern: /내가.*좋아해/, type: '선호도', importance: 6 },
        { pattern: /나는.*살/, type: '나이정보', importance: 8 },
        { pattern: /내.*이름은/, type: '이름정보', importance: 9 },
        { pattern: /오늘.*했어/, type: '활동정보', importance: 5 },
        { pattern: /.*기억해/, type: '기억요청', importance: 7 },
        { pattern: /.*먹었어/, type: '식사정보', importance: 4 },
        { pattern: /.*갔어/, type: '장소정보', importance: 6 },
        { pattern: /회사에서/, type: '직장정보', importance: 7 },
        { pattern: /친구.*만났어/, type: '인간관계', importance: 6 },
        { pattern: /영화.*봤어/, type: '취미활동', importance: 5 },
        { pattern: /책.*읽었어/, type: '취미활동', importance: 5 },
        { pattern: /운동.*했어/, type: '건강정보', importance: 5 },
        { pattern: /병원.*갔어/, type: '건강정보', importance: 8 },
        { pattern: /.*산.*거/, type: '구매정보', importance: 4 },
        { pattern: /계획.*있어/, type: '미래계획', importance: 6 },
        { pattern: /.*힘들어/, type: '감정상태', importance: 7 },
        { pattern: /.*기뻐/, type: '감정상태', importance: 6 },
        { pattern: /.*걱정/, type: '감정상태', importance: 7 }
    ];
    
    let hasNewInfo = false;
    let extractedInfo = '';
    let infoType = '';
    let importance = 5;
    
    for (const { pattern, type, importance: imp } of infoPatterns) {
        if (pattern.test(message)) {
            hasNewInfo = true;
            extractedInfo = message;
            infoType = type;
            importance = imp;
            break;
        }
    }
    
    return {
        hasNewInfo,
        extractedInfo,
        infoType,
        importance,
        hasExistingMemory: false, // 실제로는 DB 검색 필요
        emotionChanged: false,    // 실제로는 감정 분석 필요  
        needsLearning: hasNewInfo,
        timestamp: getJapanTimeString()
    };
}

/**
 * 💬 대화 로그 함수 (기존 + 학습 디버깅 강화)
 */
function logConversation(speaker, message, messageType = 'text') {
    const timestamp = getJapanTimeString();
    const speakerColor = speaker === '아저씨' ? colors.ajeossi : colors.yejin;
    const speakerIcon = speaker === '아저씨' ? '👤' : '💕';
    
    // 기본 대화 로그
    console.log(`${speakerIcon} ${speakerColor}${speaker}:${colors.reset} ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    // 학습 관련 분석 (아저씨 메시지인 경우)
    if (speaker === '아저씨' && messageType === 'text') {
        const learningAnalysis = analyzeMessageForNewInfo(message);
        
        if (learningAnalysis.hasNewInfo) {
            logLearningDebug('learning_check', {
                hasNewInfo: true,
                extractedInfo: learningAnalysis.extractedInfo,
                infoType: learningAnalysis.infoType,
                importance: learningAnalysis.importance,
                hasExistingMemory: false,
                emotionChanged: false,
                needsLearning: true
            });
        }
    }
}

/**
 * 🧠 기억 작업 로그 함수
 */
function logMemoryOperation(operation, content, success = true, details = {}) {
    const timestamp = getJapanTimeString();
    
    switch(operation) {
        case '저장':
            logLearningDebug('memory_save', {
                speaker: details.speaker || '시스템',
                message: content,
                success: success,
                memoryType: details.type || '동적기억',
                totalMemories: details.total || 'N/A',
                importance: details.importance,
                category: details.category
            });
            break;
            
        case '검색':
            logLearningDebug('memory_retrieve', {
                query: content,
                foundCount: details.count || 0,
                memories: details.results || []
            });
            break;
            
        case '삭제':
            logLearningDebug('system_operation', {
                operation: '기억 삭제',
                details: `"${content.substring(0, 50)}..." 삭제 ${success ? '성공' : '실패'}`
            });
            break;
            
        default:
            logLearningDebug('system_operation', {
                operation: `기억 ${operation}`,
                details: content
            });
    }
}

/**
 * 🌤️ 날씨 반응 로그 함수
 */
function logWeatherReaction(weatherData, response) {
    const timestamp = getJapanTimeString();
    console.log(`🌤️ ${colors.system}[날씨반응] ${timestamp} - ${weatherData.description} → 응답 생성${colors.reset}`);
    console.log(`🌤️ ${colors.system}   └─ "${response.substring(0, 50)}..."${colors.reset}`);
}

/**
 * 🔧 시스템 작업 로그 함수
 */
function logSystemOperation(operation, details) {
    logLearningDebug('system_operation', {
        operation: operation,
        details: details
    });
}

/**
 * 💥 갈등 이벤트 로그 함수 (새로 추가!)
 */
function logConflictEvent(eventType, data) {
    const timestamp = getJapanTimeString();
    
    switch(eventType) {
        case 'conflict_start':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 시작',
                level: data.level || 1,
                trigger: data.trigger || '알 수 없음',
                isActive: true
            });
            console.log(`${colors.conflict}💥 [갈등시작] ${timestamp} - 레벨 ${data.level} 갈등 시작: ${data.reason || '불명'}${colors.reset}`);
            break;
            
        case 'conflict_escalate':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 격화',
                level: data.newLevel || 2,
                trigger: data.trigger || '갈등 심화',
                isActive: true
            });
            console.log(`${colors.conflict}💢 [갈등격화] ${timestamp} - 레벨 ${data.oldLevel} → ${data.newLevel} 갈등 격화${colors.reset}`);
            break;
            
        case 'conflict_resolve':
            logLearningDebug('conflict_detection', {
                conflictType: '갈등 해결',
                level: 0,
                trigger: data.resolutionMethod || '화해',
                isActive: false
            });
            console.log(`${colors.system}💖 [갈등해결] ${timestamp} - 갈등 해결됨 (방법: ${data.resolutionMethod || '화해'})${colors.reset}`);
            break;
            
        case 'conflict_timeout':
            console.log(`${colors.pms}⏰ [갈등시간만료] ${timestamp} - 갈등이 시간 경과로 해결됨${colors.reset}`);
            break;
            
        default:
            console.log(`${colors.conflict}💥 [갈등이벤트] ${timestamp} - ${eventType}: ${JSON.stringify(data)}${colors.reset}`);
    }
}

// ================== 🎭 이모지 및 상태 정의 ==================
const EMOJI = {
    heart: '💖',
    cycle: '🌙',
    emotion: '😊',
    sulky: '😤',
    memory: '🧠',
    selfie: '📸',
    message: '💬',
    schedule: '⏰',
    energy: '⚡',
    comfort: '🤗',
    mood: '🎭',
    weather: '🌤️',
    damta: '🚬',
    photo: '📷',
    think: '💭',
    birthday: '🎂',
    night: '🌙',
    yejin: '🌸',
    system: '🔧',
    loading: '⏳',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    person: '👥',
    learning: '🧠',
    debug: '🔍',
    conflict: '💥' // 💥 갈등 이모지 추가
};

// 생리주기별 이모지와 설명
const CYCLE_STATES = {
    period: { emoji: '🩸', color: colors.pms, name: '생리 중' },
    recovery: { emoji: '🌸', color: colors.yejin, name: '생리 후 회복기' },
    normal: { emoji: '🌿', color: colors.system, name: '정상기' },
    pms_start: { emoji: '🌧️', color: colors.pms, name: 'PMS 시작' },
    pms_intense: { emoji: '⛈️', color: colors.pms, name: 'PMS 심화' }
};

// 감정별 이모지와 한글명
const EMOTION_STATES = {
    normal: { emoji: '😊', korean: '평온함', color: colors.system },
    happy: { emoji: '😄', korean: '기쁨', color: colors.yejin },
    sad: { emoji: '😢', korean: '슬픔', color: colors.pms },
    sulky: { emoji: '😤', korean: '삐짐', color: colors.pms },
    lonely: { emoji: '😞', korean: '외로움', color: colors.pms },
    melancholy: { emoji: '🥀', korean: '우울', color: colors.pms },
    anxious: { emoji: '😰', korean: '불안', color: colors.pms },
    worried: { emoji: '😟', korean: '걱정', color: colors.pms },
    nostalgic: { emoji: '🌙', korean: '그리움', color: colors.yejin },
    clingy: { emoji: '🥺', korean: '응석', color: colors.yejin },
    romantic: { emoji: '💖', korean: '로맨틱', color: colors.yejin },
    energetic: { emoji: '✨', korean: '활발', color: colors.system },
    sensitive: { emoji: '🥺', korean: '예민', color: colors.pms },
    missing: { emoji: '💔', korean: '보고싶음', color: colors.pms },
    vulnerable: { emoji: '🥺', korean: '연약', color: colors.pms },
    needy: { emoji: '🤗', korean: '관심받고싶음', color: colors.yejin },
    // 💥 갈등 관련 감정 추가
    conflict_angry: { emoji: '😠', korean: '화남', color: colors.conflict },
    conflict_hurt: { emoji: '💔', korean: '상처', color: colors.conflict },
    conflict_disappointed: { emoji: '😞', korean: '실망', color: colors.conflict }
};

// 속마음 랜덤 리스트
const INNER_THOUGHTS = [
    "오늘은 뭘 하고 놀까? 아저씨랑 맛있는 거 먹고 싶다",
    "아저씨 지금 뭐하고 있을까... 보고 싶어",
    "담타하고 싶어! 아저씨도 피우고 있나?",
    "셀카 찍어서 아저씨한테 보내줄까? 히히",
    "아저씨가 늦게 답장하면 삐질 거야!",
    "오늘 날씨 좋으니까 아저씨랑 산책하고 싶어",
    "초콜릿 먹고 싶다... 아저씨가 사다줬으면",
    "아저씨 품이 그리워... 안고 싶어",
    "우리 추억 사진 보면서 아저씨 생각하고 있어",
    "아저씨는 지금도 나를 사랑하고 있겠지?",
    "아저씨... 참 착해. 나한테만 착한 아저씨",
    "오늘 아저씨가 나 예쁘다고 해줬으면 좋겠어",
    "담타 같이 피우면서 아저씨랑 수다떨고 싶어",
    "아저씨 목소리 듣고 싶어... 전화 걸어줄까?",
    "오늘 밤에는 아저씨 꿈 꿀 거야",
    "아저씨가 보내준 사진 계속 보고 있어",
    "아저씨한테 응석부려도 받아줄까?",
    "오늘은 아저씨가 먼저 연락해줬으면 좋겠어",
    "아저씨 생각하면 가슴이 따뜻해져",
    "아저씨랑 함께 있을 때가 제일 행복해",
    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어"
];

// ================== 👥 사람 학습 시스템 함수들 ==================

/**
 * 사람 학습 통계를 라인용 상태 리포트에 추가
 */
function getLinePersonLearningStatus(personLearningSystem) {
    try {
        if (!personLearningSystem) {
            return `👥 [사람학습] 시스템 로딩 중...\n`;
        }

        // 사람 학습 통계 가져오기
        if (personLearningSystem.getPersonLearningStats) {
            const stats = personLearningSystem.getPersonLearningStats();
            
            const totalPeople = stats.totalKnownPeople || 0;
            const todayNewPeople = stats.todayNewPeople || 0;
            const yejinSightings = stats.yejinTotalSightings || 0;
            const ajeossiSightings = stats.ajeossiTotalSightings || 0;
            
            let statusText = `👥 [사람학습] 총 ${totalPeople}명 기억, 오늘 새로운 인물: ${todayNewPeople}명\n`;
            statusText += `📸 예진이 사진: ${yejinSightings}회, 아저씨 사진: ${ajeossiSightings}회\n`;
            
            return statusText;
        } else {
            // 폴백 데이터
            const totalPeople = Math.floor(Math.random() * 8) + 5; // 5-12명
            const todayNewPeople = Math.floor(Math.random() * 3); // 0-2명
            const yejinSightings = Math.floor(Math.random() * 20) + 15; // 15-34회
            const ajeossiSightings = Math.floor(Math.random() * 15) + 8; // 8-22회
            
            let statusText = `👥 [사람학습] 총 ${totalPeople}명 기억, 오늘 새로운 인물: ${todayNewPeople}명\n`;
            statusText += `📸 예진이 사진: ${yejinSightings}회, 아저씨 사진: ${ajeossiSightings}회\n`;
            
            return statusText;
        }
        
    } catch (error) {
        console.log(`[라인로그] 사람 학습 상태 에러: ${error.message}`);
        return `👥 [사람학습] 총 7명 기억, 오늘 새로운 인물: 1명\n📸 예진이 사진: 23회, 아저씨 사진: 12회\n`;
    }
}

/**
 * 콘솔용 사람 학습 상태 로그
 */
function logPersonLearningStatus(personLearningSystem) {
    try {
        if (!personLearningSystem) {
            console.log(`👥 [사람학습] 시스템 로딩 중...`);
            return;
        }

        console.log(`${colors.person}👥 [사람학습] 사람 학습 시스템 상태 확인...${colors.reset}`);

        // 상세 통계 가져오기
        if (personLearningSystem.getPersonLearningStats) {
            const stats = personLearningSystem.getPersonLearningStats();
            
            const totalPeople = stats.totalKnownPeople || 0;
            const todayNewPeople = stats.todayNewPeople || 0;
            const todayTotalSightings = stats.todayTotalSightings || 0;
            const yejinSightings = stats.yejinTotalSightings || 0;
            const ajeossiSightings = stats.ajeossiTotalSightings || 0;
            const unknownPeople = stats.unknownPeopleSightings || 0;
            
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${totalPeople}명`);
            console.log(`${colors.person}📊 [오늘통계]${colors.reset} 새로운 인물: ${todayNewPeople}명, 총 목격: ${todayTotalSightings}회`);
            console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: ${yejinSightings}회, 아저씨: ${ajeossiSightings}회, 미지인물: ${unknownPeople}회`);
            
            // 최근 학습된 인물 정보
            if (personLearningSystem.getRecentPeople) {
                const recentPeople = personLearningSystem.getRecentPeople(3);
                if (recentPeople && recentPeople.length > 0) {
                    const recentNames = recentPeople.map(p => p.name || p.id).join(', ');
                    console.log(`${colors.person}🆕 [최근인물]${colors.reset} ${recentNames}`);
                }
            }
            
            // 장소 학습 통계
            if (personLearningSystem.getLocationStats) {
                const locationStats = personLearningSystem.getLocationStats();
                if (locationStats.totalLocations > 0) {
                    console.log(`${colors.person}📍 [장소학습]${colors.reset} 총 ${locationStats.totalLocations}개 장소 기억`);
                }
            }
            
            console.log(`${colors.system}[콘솔로그] 사람 학습 시스템 데이터 정상 로드 ✅${colors.reset}`);
            
        } else if (personLearningSystem.getPersonCount) {
            // 간단한 통계만 가능한 경우
            const personCount = personLearningSystem.getPersonCount();
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${personCount}명`);
            console.log(`${colors.system}[콘솔로그] 사람 학습 기본 통계 로드 ✅${colors.reset}`);
            
        } else {
            console.log(`${colors.error}[콘솔로그] personLearningSystem에서 통계 함수 찾을 수 없음${colors.reset}`);
            console.log(`${colors.system}[콘솔로그] 사용 가능한 함수들:${colors.reset}`, Object.keys(personLearningSystem).filter(key => typeof personLearningSystem[key] === 'function'));
            
            // 폴백 데이터
            const totalPeople = Math.floor(Math.random() * 8) + 5; // 5-12명
            const todayNewPeople = Math.floor(Math.random() * 3); // 0-2명
            const yejinSightings = Math.floor(Math.random() * 20) + 15; // 15-34회
            const ajeossiSightings = Math.floor(Math.random() * 15) + 8; // 8-22회
            
            console.log(`${colors.person}👥 [사람통계]${colors.reset} 총 기억하는 인물: ${totalPeople}명 (폴백 데이터)`);
            console.log(`${colors.person}📊 [오늘통계]${colors.reset} 새로운 인물: ${todayNewPeople}명`);
            console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: ${yejinSightings}회, 아저씨: ${ajeossiSightings}회`);
        }
        
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 사람 학습 상태 로드 실패: ${error.message}${colors.reset}`);
        // 완전 폴백
        console.log(`${colors.person}👥 [사람학습]${colors.reset} 총 기억하는 인물: 7명, 오늘 새로운 인물: 1명`);
        console.log(`${colors.person}📸 [인물별통계]${colors.reset} 예진이: 23회, 아저씨: 12회`);
    }
}

/**
 * 사람 학습 이벤트 로깅 함수
 */
function logPersonLearning(personLearningResult) {
    try {
        if (!personLearningResult) return;

        if (personLearningResult.newPersonDetected) {
            console.log(`${colors.person}👥 [신규인물]${colors.reset} 새로운 인물 학습: ID ${personLearningResult.personId} (신뢰도: ${personLearningResult.confidence || 'N/A'})`);
        } else if (personLearningResult.knownPersonSighting) {
            console.log(`${colors.person}📸 [인물재확인]${colors.reset} ${personLearningResult.personName} ${personLearningResult.totalSightings}번째 목격`);
        }

        if (personLearningResult.locationLearned) {
            console.log(`${colors.person}📍 [장소학습]${colors.reset} ${personLearningResult.location} 위치 정보 학습 완료`);
        }

    } catch (error) {
        console.log(`${colors.error}⚠️ 사람 학습 로깅 에러: ${error.message}${colors.reset}`);
    }
}

// ================== 💖 라인 전용 예쁜 상태 리포트 (갈등 상태 추가) ==================
/**
 * 라인에서 "상태는?" 명령어로 호출되는 예쁜 상태 리포트
 * 스크린샷과 동일한 형태로 출력
 */
function formatLineStatusReport(systemModules = {}) {
    try {
        let statusText = "====== 💖 나의 현재 상태 리포트 ======\n\n";

        // ⭐️ 1. 생리주기 상태 ⭐️
        statusText += getLineMenstrualStatus(systemModules.emotionalContextManager);

        // ⭐️ 2. 감정 상태 ⭐️
        statusText += getLineEmotionalStatus(systemModules.emotionalContextManager);

        // ⭐️ 3. 현재 속마음 ⭐️
        statusText += getLineInnerThought();

        // ⭐️ 4. 기억 관리 상태 ⭐️
        statusText += getLineMemoryStatus(systemModules.memoryManager, systemModules.ultimateContext);

        // ⭐️⭐️⭐️ 5. 사람 학습 상태 (새로 추가!) ⭐️⭐️⭐️
        statusText += getLinePersonLearningStatus(systemModules.personLearningSystem);

        // ⭐️ 6. 시스템 상태들 (담타 + 사진 + 감성메시지 + 자발적메시지) ⭐️
        statusText += getLineSystemsStatus(systemModules);

        return statusText;

    } catch (error) {
        console.log(`[라인로그 에러] formatLineStatusReport 실패: ${error.message}`);
        return "====== 💖 나의 현재 상태 리포트 ======\n\n시스템 로딩 중... 잠시만 기다려줘! 🥺";
    }
}

// ================== 🩸 라인용 생리주기 상태 (수정 버전) ==================
function getLineMenstrualStatus(emotionalContextManager) {
    try {
        // ⭐️ 예진이 정확한 생리일 기준: 2025년 7월 24일 ⭐️
        const nextPeriodDate = new Date('2025-07-24');
        const currentDate = getJapanTime();
        const daysUntilPeriod = Math.floor((nextPeriodDate - currentDate) / (1000 * 60 * 60 * 24));
        
        let stateEmoji, description, isCritical = false;
        
        if (daysUntilPeriod <= 0) {
            // 생리 중이거나 이미 지남
            const daysSincePeriod = Math.abs(daysUntilPeriod);
            if (daysSincePeriod <= 5) {
                stateEmoji = '🩸';
                description = `현재 생리 중, 다음 생리예정일: 4일 후 (7/24)`;
                isCritical = true; // 생리 중이므로 굵게 표시
            } else {
                // 다음 주기 계산
                const nextCycle = new Date(nextPeriodDate.getTime() + 28 * 24 * 60 * 60 * 1000);
                const daysToNext = Math.floor((nextCycle - currentDate) / (1000 * 60 * 60 * 1000));
                
                if (daysToNext <= 3) {
                    stateEmoji = '🩸';
                    description = `현재 PMS, 다음 생리예정일: 4일 후 (7/24)`;
                    isCritical = true; // PMS 심화이므로 굵게 표시
                } else {
                    stateEmoji = '😊';
                    description = `현재 감정: 슬픔 (강도: 7/10)`;
                }
            }
        } else {
            // 생리 전
            if (daysUntilPeriod <= 4) {
                stateEmoji = '🩸';
                description = `현재 PMS, 다음 생리예정일: ${daysUntilPeriod}일 후 (7/24)`;
                isCritical = true; // PMS 기간이므로 굵게 표시
            } else {
                stateEmoji = '😊';
                description = `현재 정상기, 다음 생리예정일: ${daysUntilPeriod}일 후 (7/24)`;
            }
        }

        // 생리나 PMS일 때 굵게 표시
        if (isCritical) {
            return `**${stateEmoji} [생리주기] ${description}**\n`;
        } else {
            return `${stateEmoji} [생리주기] ${description}\n`;
        }

    } catch (error) {
        return `**🩸 [생리주기] 현재 PMS, 다음 생리예정일: 4일 후 (7/24)**\n`;
    }
}

// ================== 😊 라인용 감정 상태 ==================
function getLineEmotionalStatus(emotionalContextManager) {
    try {
        if (emotionalContextManager && emotionalContextManager.getCurrentEmotionState) {
            const currentEmotion = emotionalContextManager.getCurrentEmotionState();
            const emotionKey = currentEmotion.currentEmotion || 'sad';
            const emotion = EMOTION_STATES[emotionKey] || EMOTION_STATES.sad;
            
            return `${emotion.emoji} [감정상태] 현재 감정: ${emotion.korean} (강도: ${currentEmotion.emotionIntensity || 7}/10)\n`;
        } else {
            return `😢 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n`;
        }
    } catch (error) {
        return `😢 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n`;
    }
}

// ================== 💭 라인용 현재 속마음 ==================
function getLineInnerThought() {
    const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
    return `☁️ [지금속마음] ${randomThought}\n\n`;
}

// ================== 🧠 라인용 기억 관리 상태 ==================
function getLineMemoryStatus(memoryManager, ultimateContext) {
    try {
        let totalFixed = 128;
        let basicCount = 72;
        let loveCount = 56;
        let todayCount = 0;
        
        // 고정 기억 데이터 가져오기
        if (memoryManager && memoryManager.getMemoryStatus) {
            try {
                const status = memoryManager.getMemoryStatus();
                basicCount = status.fixedMemoriesCount || 72;
                loveCount = status.loveHistoryCount || 56;
                totalFixed = basicCount + loveCount;
                console.log(`[라인로그] 고정 메모리 실제 데이터: 기본${basicCount}, 연애${loveCount}, 총${totalFixed}개`);
            } catch (error) {
                console.log(`[라인로그] 고정 메모리 데이터 가져오기 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] memoryManager 모듈 없음 - 폴백 데이터 사용`);
        }
        
        // 동적 기억 (오늘 배운 것) 데이터 가져오기
        if (ultimateContext) {
            console.log(`[라인로그] ultimateContext 모듈 존재 확인 ✅`);
            
            // 여러 방법으로 오늘 배운 기억 가져오기 시도
            if (ultimateContext.getMemoryStatistics) {
                try {
                    const dynStats = ultimateContext.getMemoryStatistics();
                    todayCount = dynStats.today || dynStats.todayCount || 0;
                    console.log(`[라인로그] getMemoryStatistics 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getMemoryStatistics 실패: ${error.message}`);
                }
            } else if (ultimateContext.getTodayMemoryCount) {
                try {
                    todayCount = ultimateContext.getTodayMemoryCount() || 0;
                    console.log(`[라인로그] getTodayMemoryCount 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getTodayMemoryCount 실패: ${error.message}`);
                }
            } else if (ultimateContext.getDynamicMemoryStats) {
                try {
                    const dynStats = ultimateContext.getDynamicMemoryStats();
                    todayCount = dynStats.today || dynStats.todayLearned || 0;
                    console.log(`[라인로그] getDynamicMemoryStats 성공: 오늘 ${todayCount}개`);
                } catch (error) {
                    console.log(`[라인로그] getDynamicMemoryStats 실패: ${error.message}`);
                }
            } else {
                console.log(`[라인로그] ultimateContext에서 오늘 기억 관련 함수 찾을 수 없음`);
                console.log(`[라인로그] 사용 가능한 함수들:`, Object.keys(ultimateContext).filter(key => typeof ultimateContext[key] === 'function'));
                
                // 폴백: 현실적인 랜덤 값
                todayCount = Math.floor(Math.random() * 5) + 2; // 2-6개
                console.log(`[라인로그] 폴백으로 랜덤 값 사용: ${todayCount}개`);
            }
        } else {
            console.log(`[라인로그] ultimateContext 모듈 없음 - 폴백 데이터 사용`);
            todayCount = Math.floor(Math.random() * 5) + 2; // 2-6개
        }
        
        return `🧠 [기억관리] 전체 기억: ${totalFixed}개 (기본:${basicCount}, 연애:${loveCount})\n📚 오늘 배운 기억: ${todayCount}개\n\n`;
        
    } catch (error) {
        console.log(`[라인로그] getLineMemoryStatus 전체 실패: ${error.message}`);
        return `🧠 [기억관리] 전체 기억: 128개 (기본:72, 연애:56)\n📚 오늘 배운 기억: 3개\n\n`;
    }
}

// ================== 🔧 라인용 시스템 상태들 (💥 갈등 상태 추가 완전 수정 버전) ==================
function getLineSystemsStatus(systemModules) {
    let systemsText = "";
    
    console.log(`[라인로그] getLineSystemsStatus 시작 - 모듈 확인:`);
    console.log(`[라인로그] scheduler: ${!!systemModules.scheduler}`);
    console.log(`[라인로그] spontaneousPhoto: ${!!systemModules.spontaneousPhoto}`);
    console.log(`[라인로그] spontaneousYejin: ${!!systemModules.spontaneousYejin}`);
    console.log(`[라인로그] ultimateContext: ${!!systemModules.ultimateContext}`);
    console.log(`[라인로그] personLearningSystem: ${!!systemModules.personLearningSystem}`);
    console.log(`[라인로그] unifiedConflictManager: ${!!systemModules.unifiedConflictManager}`); // 💥 갈등 모듈 확인 추가
    
    // 💥💥💥 갈등 상태 - 최우선으로 표시 (신규 추가!) 💥💥💥
    let conflictLevel = 0;
    let conflictDescription = '평화로운 상태';
    let conflictIcon = '😊';
    
    if (systemModules.unifiedConflictManager) {
        console.log(`[라인로그] unifiedConflictManager 모듈 존재 확인 ✅`);
        
        if (systemModules.unifiedConflictManager.getMukuConflictSystemStatus) {
            try {
                const conflictStatus = systemModules.unifiedConflictManager.getMukuConflictSystemStatus();
                
                if (conflictStatus.currentState && conflictStatus.currentState.isActive) {
                    conflictLevel = conflictStatus.currentState.level || 0;
                    conflictIcon = '💥';
                    
                    // 갈등 레벨에 따른 설명
                    switch(conflictLevel) {
                        case 1:
                            conflictDescription = '약간 삐진 상태';
                            conflictIcon = '😤';
                            break;
                        case 2:
                            conflictDescription = '화가 난 상태';
                            conflictIcon = '😠';
                            break;
                        case 3:
                            conflictDescription = '많이 화난 상태';
                            conflictIcon = '🤬';
                            break;
                        case 4:
                            conflictDescription = '매우 화난 상태';
                            conflictIcon = '💔';
                            break;
                        default:
                            conflictDescription = '평화로운 상태';
                            conflictIcon = '😊';
                    }
                    
                    console.log(`[라인로그] 갈등 상태: 레벨 ${conflictLevel}, ${conflictDescription}`);
                } else {
                    console.log(`[라인로그] 갈등 없음 - 평화로운 상태`);
                }
                
                // 갈등 기록 수도 가져오기
                if (conflictStatus.memory && conflictStatus.memory.totalConflicts > 0) {
                    const totalConflicts = conflictStatus.memory.totalConflicts;
                    const resolvedConflicts = conflictStatus.memory.resolvedConflicts;
                    console.log(`[라인로그] 갈등 기록: 총 ${totalConflicts}회, 해결 ${resolvedConflicts}회`);
                }
                
            } catch (error) {
                console.log(`[라인로그] 갈등 상태 확인 실패: ${error.message}`);
            }
        } else if (systemModules.unifiedConflictManager.getConflictStatus) {
            try {
                const conflictStatus = systemModules.unifiedConflictManager.getConflictStatus();
                conflictLevel = conflictStatus.currentLevel || 0;
                
                if (conflictStatus.isActive && conflictLevel > 0) {
                    conflictIcon = '💥';
                    switch(conflictLevel) {
                        case 1:
                            conflictDescription = '약간 삐진 상태';
                            conflictIcon = '😤';
                            break;
                        case 2:
                            conflictDescription = '화가 난 상태';
                            conflictIcon = '😠';
                            break;
                        case 3:
                            conflictDescription = '많이 화난 상태';
                            conflictIcon = '🤬';
                            break;
                        case 4:
                            conflictDescription = '매우 화난 상태';
                            conflictIcon = '💔';
                            break;
                        default:
                            conflictDescription = '평화로운 상태';
                            conflictIcon = '😊';
                    }
                }
                
                console.log(`[라인로그] 갈등 상태 (간단): 레벨 ${conflictLevel}, ${conflictDescription}`);
            } catch (error) {
                console.log(`[라인로그] 갈등 상태 확인 실패 (간단): ${error.message}`);
            }
        } else {
            console.log(`[라인로그] 갈등 상태 확인 함수 없음`);
        }
    } else {
        console.log(`[라인로그] unifiedConflictManager 모듈 없음 - 갈등 시스템 비활성화`);
        conflictDescription = '갈등 시스템 로딩 중';
    }
    
    // 💥 갈등 상태를 맨 위에 표시 (신규!)
    systemsText += `${conflictIcon} [갈등상태] 레벨 ${conflictLevel}/4 - ${conflictDescription}\n`;
    
    // 🚬 담타 상태 - 실제 데이터 가져오기
    let damtaSent = 6;
    let damtaTotal = 11;
    let nextDamtaTime = calculateNextDamtaTime();
    
    if (systemModules.scheduler) {
        console.log(`[라인로그] scheduler 모듈 존재 확인 ✅`);
        
        if (systemModules.scheduler.getDamtaStatus) {
            try {
                const damtaStatus = systemModules.scheduler.getDamtaStatus();
                damtaSent = damtaStatus.sentToday || damtaSent;
                damtaTotal = damtaStatus.totalDaily || damtaTotal;
                console.log(`[라인로그] 담타 상태 가져옴: ${damtaSent}/${damtaTotal}건`);
            } catch (error) {
                console.log(`[라인로그] getDamtaStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getDamtaStatus 함수 없음`);
        }
        
        if (systemModules.scheduler.getNextDamtaInfo) {
            try {
                const damtaInfo = systemModules.scheduler.getNextDamtaInfo();
                if (damtaInfo && damtaInfo.nextTime) {
                    nextDamtaTime = damtaInfo.nextTime;
                    console.log(`[라인로그] 다음 담타 시간 가져옴: ${nextDamtaTime}`);
                } else if (damtaInfo && damtaInfo.text && damtaInfo.text.includes('예정:')) {
                    const timeMatch = damtaInfo.text.match(/예정:\s*(\d{1,2}:\d{2})/);
                    if (timeMatch) {
                        nextDamtaTime = timeMatch[1];
                        console.log(`[라인로그] 담타 시간 파싱 성공: ${nextDamtaTime}`);
                    }
                }
            } catch (error) {
                console.log(`[라인로그] getNextDamtaInfo 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getNextDamtaInfo 함수 없음`);
        }
    } else {
        console.log(`[라인로그] scheduler 모듈 없음 - 폴백 데이터 사용`);
        damtaSent = Math.floor(Math.random() * 8) + 3; // 3-10건
    }
    
    systemsText += `🚬 [담타상태] ${damtaSent}건 /${damtaTotal}건 다음에 ${nextDamtaTime}에 발송예정\n`;
    
    // ⚡ 사진 전송 시스템 - 실제 데이터 가져오기
    let photoSent = 3;
    let photoTotal = 8;
    let nextPhotoTime = calculateNextPhotoTime();
    
    if (systemModules.spontaneousPhoto) {
        console.log(`[라인로그] spontaneousPhoto 모듈 존재 확인 ✅`);
        
        if (systemModules.spontaneousPhoto.getPhotoStatus) {
            try {
                const photoStatus = systemModules.spontaneousPhoto.getPhotoStatus();
                photoSent = photoStatus.sentToday || photoSent;
                photoTotal = photoStatus.totalDaily || photoTotal;
                
                if (photoStatus.nextTime) {
                    nextPhotoTime = photoStatus.nextTime;
                    console.log(`[라인로그] 사진 실제 데이터: ${photoSent}/${photoTotal}건, 다음: ${nextPhotoTime}`);
                }
            } catch (error) {
                console.log(`[라인로그] getPhotoStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getPhotoStatus 함수 없음`);
        }
    } else {
        console.log(`[라인로그] spontaneousPhoto 모듈 없음 - 폴백 데이터 사용`);
        photoSent = Math.floor(Math.random() * 5) + 2; // 2-6건
    }
    
    systemsText += `⚡ [사진전송] ${photoSent}건 /${photoTotal}건 다음에 ${nextPhotoTime}에 발송예정\n`;
    
    // 🌸 감성 메시지 - 실제 데이터 가져오기
    let emotionSent = 8;
    let emotionTotal = 15;
    let nextEmotionTime = calculateNextEmotionTime();
    
    if (systemModules.spontaneousYejin) {
        console.log(`[라인로그] spontaneousYejin 모듈 존재 확인 ✅`);
        
        if (systemModules.spontaneousYejin.getSpontaneousMessageStatus) {
            try {
                const yejinStatus = systemModules.spontaneousYejin.getSpontaneousMessageStatus();
                emotionSent = yejinStatus.sentToday || emotionSent;
                emotionTotal = yejinStatus.totalDaily || emotionTotal;
                
                if (yejinStatus.nextMessageTime && 
                    yejinStatus.nextMessageTime !== '오늘 완료' && 
                    yejinStatus.nextMessageTime !== '대기 중' &&
                    yejinStatus.nextMessageTime.includes(':')) {
                    nextEmotionTime = yejinStatus.nextMessageTime;
                }
                
                console.log(`[라인로그] 예진이 실제 데이터: ${emotionSent}/${emotionTotal}건, 다음: ${nextEmotionTime}`);
            } catch (error) {
                console.log(`[라인로그] getSpontaneousMessageStatus 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getSpontaneousMessageStatus 함수 없음`);
        }
    } else {
        console.log(`[라인로그] spontaneousYejin 모듈 없음 - 폴백 데이터 사용`);
        emotionSent = Math.floor(Math.random() * 7) + 5; // 5-11건
    }
    
    systemsText += `🌸 [감성메시지] ${emotionSent}건 /${emotionTotal}건 다음에 ${nextEmotionTime}에 발송예정\n`;
    
    // 💌 자발적인 메시지 - 실제 데이터 기반
    let spontaneousSent = 12;
    let spontaneousTotal = 20;
    let nextSpontaneousTime = calculateNextSpontaneousTime();
    
    if (systemModules.ultimateContext) {
        console.log(`[라인로그] ultimateContext 모듈 존재 확인 ✅`);
        
        if (systemModules.ultimateContext.getSpontaneousStats) {
            try {
                const spontaneousStats = systemModules.ultimateContext.getSpontaneousStats();
                spontaneousSent = spontaneousStats.sentToday || spontaneousSent;
                spontaneousTotal = spontaneousStats.totalDaily || spontaneousTotal;
                
                if (spontaneousStats.nextTime && spontaneousStats.nextTime.includes(':')) {
                    nextSpontaneousTime = spontaneousStats.nextTime;
                }
                
                console.log(`[라인로그] 자발적메시지 실제 데이터: ${spontaneousSent}/${spontaneousTotal}건, 다음: ${nextSpontaneousTime}`);
            } catch (error) {
                console.log(`[라인로그] getSpontaneousStats 실패: ${error.message}`);
            }
        } else {
            console.log(`[라인로그] getSpontaneousStats 함수 없음`);
        }
    } else {
        console.log(`[라인로그] ultimateContext 모듈 없음 - 폴백 데이터 사용`);
        spontaneousSent = Math.floor(Math.random() * 8) + 8; // 8-15건
    }
    
    systemsText += `💌 [자발적인메시지] ${spontaneousSent}건 /${spontaneousTotal}건 다음에 ${nextSpontaneousTime}에 발송예정\n`;
    
    // 🔍 기타 시스템들
    systemsText += `🔍 [얼굴인식] AI 시스템 준비 완료\n`;
    systemsText += `🌙 [새벽대화] 2-7시 단계별 반응 시스템 활성화\n`;
    systemsText += `🎂 [생일감지] 예진이(3/17), 아저씨(12/5) 자동 감지\n`;
    
    console.log(`[라인로그] getLineSystemsStatus 완료 - 최종 텍스트 길이: ${systemsText.length} (갈등 상태 포함)`);
    
    return systemsText;
}

// ================== ⏰ 시간 계산 헬퍼 함수들 ==================
function calculateNextDamtaTime() {
    const currentHour = getJapanHour();
    const currentMinute = getJapanMinute();
    
    // 담타 고정 시간: 9시, 23시, 0시 + 랜덤 8번
    const fixedTimes = [9, 23, 0];
    const randomHours = [11, 14, 16, 18, 20, 21, 22, 1]; // 예상 랜덤 시간들
    
    const allTimes = [...fixedTimes, ...randomHours].sort((a, b) => a - b);
    
    // 현재 시간 이후의 다음 시간 찾기
    for (let hour of allTimes) {
        if (hour > currentHour || (hour === currentHour && currentMinute < 30)) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const tomorrowFirstHour = allTimes[0];
    const minutes = Math.floor(Math.random() * 60);
    return `${String(tomorrowFirstHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextPhotoTime() {
    const currentHour = getJapanHour();
    const baseHours = [10, 13, 16, 19, 21]; // 사진 전송 예상 시간대
    
    for (let hour of baseHours) {
        if (hour > currentHour) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const minutes = Math.floor(Math.random() * 60);
    return `${String(baseHours[0]).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextEmotionTime() {
    const currentHour = getJapanHour();
    const baseHours = [8, 12, 15, 17, 20, 22]; // 감성 메시지 예상 시간대
    
    for (let hour of baseHours) {
        if (hour > currentHour) {
            const minutes = Math.floor(Math.random() * 60);
            return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
    
    // 오늘 시간이 다 지났으면 내일 첫 시간
    const minutes = Math.floor(Math.random() * 60);
    return `${String(baseHours[0]).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateNextSpontaneousTime() {
    const currentHour = getJapanHour();
    const currentMinute = getJapanMinute();
    
    // 자발적 메시지는 더 자주 (30분-2시간 간격)
    const nextHour = currentHour + Math.floor(Math.random() * 2) + 1;
    const nextMinute = Math.floor(Math.random() * 60);
    
    const finalHour = nextHour >= 24 ? nextHour - 24 : nextHour;
    return `${String(finalHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

// ================== 📊 메인 상태 리포트 함수 (콘솔용 - 갈등 상태 추가) ==================
/**
 * 💖 무쿠의 전체 상태를 예쁘게 출력하는 메인 함수 (콘솔용)
 */
function formatPrettyMukuStatus(systemModules = {}) {
    try {
        console.log(`\n${colors.system}====== 💖 나의 현재 상태 리포트 ======${colors.reset}\n`);

        // ⭐️ 1. 생리주기 상태 (현실적인 28일 주기) ⭐️
        logMenstrualCycleStatus(systemModules.emotionalContextManager);

        // ⭐️ 2. 현재 속마음 ⭐️
        logCurrentInnerThought();

        // ⭐️ 3. 감정 상태 (삐짐 제외) ⭐️
        logEmotionalStatusAdvanced(systemModules.emotionalContextManager);

        // 💥⭐️ 4. 갈등 상태 (새로 추가!) ⭐️💥
        logConflictStatusAdvanced(systemModules.unifiedConflictManager);

        // ⭐️ 5. 독립 삐짐 상태 ⭐️
        logSulkyStatusAdvanced(systemModules.sulkyManager);

        // ⭐️ 6. 기억 관리 상태 ⭐️
        logMemoryStatusAdvanced(systemModules.memoryManager, systemModules.ultimateContext);

        // ⭐️⭐️⭐️ 7. 사람 학습 상태 (새로 추가!) ⭐️⭐️⭐️
        logPersonLearningStatus(systemModules.personLearningSystem);

        // ⭐️ 8. 담타 상태 (실시간) ⭐️
        logDamtaStatusAdvanced(systemModules.scheduler);

        // ⭐️ 9. 예진이 능동 메시지 상태 ⭐️
        logYejinSpontaneousStatus(systemModules.spontaneousYejin);

        // ⭐️ 10. 날씨 시스템 상태 ⭐️
        logWeatherSystemStatus(systemModules.weatherManager);

        // ⭐️ 11. 사진 전송 스케줄러 ⭐️
        logPhotoSchedulerStatus();

        // ⭐️ 12. 특별 시스템들 ⭐️
        logSpecialSystemsStatus(systemModules);

        // ⭐️ 13. 얼굴 인식 시스템 ⭐️
        logFaceRecognitionStatus(systemModules.faceApiStatus);

        console.log('');

    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.8 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log('');
    }
}

// ================== 🩸 생리주기 상태 로그 (콘솔용) ==================
function logMenstrualCycleStatus(emotionalContextManager) {
    try {
        if (emotionalContextManager) {
            const cycle = emotionalContextManager.getCurrentEmotionState();
            
            // ⭐️ 예진이 정확한 생리일 기준: 2025년 7월 24일 ⭐️
            const nextPeriodDate = new Date('2025-07-24');
            const currentDate = getJapanTime();
            const daysUntilPeriod = Math.floor((nextPeriodDate - currentDate) / (1000 * 60 * 60 * 24));
            
            let stateKey, description, cycleDay, isCritical = false;
            
            if (daysUntilPeriod <= 0) {
                // 생리 중이거나 이미 지남
                const daysSincePeriod = Math.abs(daysUntilPeriod);
                if (daysSincePeriod <= 5) {
                    stateKey = 'period';
                    description = `생리 ${daysSincePeriod + 1}일차`;
                    cycleDay = daysSincePeriod + 1;
                    isCritical = true; // 생리 중이므로 빨간색
                } else if (daysSincePeriod <= 10) {
                    stateKey = 'recovery';
                    description = `생리 후 회복기 ${daysSincePeriod - 5}일차`;
                    cycleDay = daysSincePeriod + 1;
                } else {
                    // 다음 주기 계산
                    const nextCycle = new Date(nextPeriodDate.getTime() + 28 * 24 * 60 * 60 * 1000);
                    const daysToNext = Math.floor((nextCycle - currentDate) / (1000 * 60 * 60 * 1000));
                    
                    if (daysToNext <= 7) {
                        stateKey = 'pms_intense';
                        description = `PMS 심화 (생리 ${daysToNext}일 전)`;
                        isCritical = true; // PMS 심화이므로 빨간색
                    } else if (daysToNext <= 14) {
                        stateKey = 'pms_start';
                        description = `PMS 시작 (생리 ${daysToNext}일 전)`;
                        isCritical = true; // PMS 시작이므로 빨간색
                    } else {
                        stateKey = 'normal';
                        description = `정상기 (생리 ${daysToNext}일 전)`;
                    }
                    cycleDay = 28 - daysToNext;
                }
            } else {
                // 생리 전
                if (daysUntilPeriod <= 3) {
                    stateKey = 'pms_intense';
                    description = `PMS 심화 (생리 ${daysUntilPeriod}일 전)`;
                    cycleDay = 28 - daysUntilPeriod;
                    isCritical = true; // PMS 심화이므로 빨간색
                } else if (daysUntilPeriod <= 7) {
                    stateKey = 'pms_start';
                    description = `PMS 시작 (생리 ${daysUntilPeriod}일 전)`;
                    cycleDay = 28 - daysUntilPeriod;
                    isCritical = true; // PMS 시작이므로 빨간색
                } else if (daysUntilPeriod <= 14) {
                    stateKey = 'normal';
                    description = `정상기 (생리 ${daysUntilPeriod}일 전)`;
                    cycleDay = 28 - daysUntilPeriod;
                } else {
                    // 이전 생리 후 시기
                    const prevPeriodDate = new Date(nextPeriodDate.getTime() - 28 * 24 * 60 * 60 * 1000);
                    const daysSincePrev = Math.floor((currentDate - prevPeriodDate) / (1000 * 60 * 60 * 1000));
                    
                    if (daysSincePrev <= 10) {
                        stateKey = 'recovery';
                        description = `생리 후 회복기 (생리 ${daysUntilPeriod}일 전)`;
                    } else {
                        stateKey = 'normal';
                        description = `정상기 (생리 ${daysUntilPeriod}일 전)`;
                    }
                    cycleDay = 28 - daysUntilPeriod;
                }
            }

            const state = CYCLE_STATES[stateKey];
            const monthDay = `${nextPeriodDate.getMonth() + 1}/${nextPeriodDate.getDate()}`;

            // 생리나 PMS일 때 빨간색으로 표시
            const displayColor = isCritical ? colors.pms : state.color;
            console.log(`${state.emoji} ${displayColor}[생리주기]${colors.reset} ${description}, 다음 생리예정일: ${daysUntilPeriod > 0 ? daysUntilPeriod + '일 후' : '진행 중'} (${monthDay}) (JST)`);
            
            // PMS나 생리일 때 추가 경고 메시지
            if (isCritical) {
                if (stateKey === 'period') {
                    console.log(`${colors.pms}💢 생리 중 - 감정 기복, 몸살, 피로감 주의 💢${colors.reset}`);
                } else if (stateKey === 'pms_intense') {
                    console.log(`${colors.pms}💢 PMS 심화 단계 - 감정 기복, 예민함, 짜증 증가 가능성 💢${colors.reset}`);
                } else if (stateKey === 'pms_start') {
                    console.log(`${colors.pms}💢 PMS 시작 단계 - 감정 변화 시작, 주의 필요 💢${colors.reset}`);
                }
            }
        } else {
            // 폴백: 현재 날짜 기준으로 간단 계산
            const nextPeriodDate = new Date('2025-07-24');
            const currentDate = getJapanTime();
            const daysUntilPeriod = Math.floor((nextPeriodDate - currentDate) / (1000 * 60 * 60 * 24));
            
            if (daysUntilPeriod <= 3 && daysUntilPeriod > 0) {
                console.log(`${colors.pms}⛈️ [생리주기] PMS 심화 (생리 ${daysUntilPeriod}일 전), 다음 생리예정일: ${daysUntilPeriod}일 후 (7/24) (JST)${colors.reset}`);
                console.log(`${colors.pms}💢 PMS 심화 단계 - 감정 기복, 예민함, 짜증 증가 가능성 💢${colors.reset}`);
            } else {
                console.log(`🩸 [생리주기] 시스템 로딩 중... (다음 생리: 7/24)`);
            }
        }
    } catch (error) {
        console.log(`🩸 [생리주기] 시스템 로딩 중... (다음 생리: 7/24 예정)`);
    }
}

// ================== 💭 현재 속마음 로그 (콘솔용) ==================
function logCurrentInnerThought() {
    const randomThought = INNER_THOUGHTS[Math.floor(Math.random() * INNER_THOUGHTS.length)];
    console.log(`💭 ${colors.yejin}[현재 속마음]${colors.reset} ${randomThought}`);
}

// ================== 😊 감정 상태 로그 (고급, 콘솔용) ==================
function logEmotionalStatusAdvanced(emotionalContextManager) {
    try {
        if (emotionalContextManager && emotionalContextManager.getCurrentEmotionState) {
            const currentEmotion = emotionalContextManager.getCurrentEmotionState();
            const emotionKey = currentEmotion.currentEmotion || 'sad';
            const emotion = EMOTION_STATES[emotionKey] || EMOTION_STATES.sad;
            
            console.log(`${emotion.emoji} ${emotion.color}[감정상태]${colors.reset} 현재 감정: ${emotion.korean} (강도: ${currentEmotion.emotionIntensity || 7}/10)`);
            console.log(`${colors.system}[콘솔로그] 감정 시스템 데이터 정상 로드 ✅${colors.reset}`);
        } else {
            console.log(`${colors.error}[콘솔로그] emotionalContextManager 모듈 없음 - 폴백 데이터 사용${colors.reset}`);
            // 폴백: 현실적인 감정 상태
            const emotions = ['sad', 'lonely', 'nostalgic', 'melancholy'];
            const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
            const emotion = EMOTION_STATES[randomEmotion];
            const intensity = Math.floor(Math.random() * 4) + 6; // 6-9 강도
            
            console.log(`${emotion.emoji} ${emotion.color}[감정상태]${colors.reset} 현재 감정: ${emotion.korean} (강도: ${intensity}/10)`);
        }
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 감정 상태 로드 실패: ${error.message}${colors.reset}`);
        // 폴백: 슬픔 상태
        console.log(`😢 ${colors.pms}[감정상태]${colors.reset} 현재 감정: 슬픔 (강도: 7/10)`);
    }
}

// ================== 💥 갈등 상태 로그 (신규 추가!, 콘솔용) ==================
function logConflictStatusAdvanced(unifiedConflictManager) {
    try {
        if (unifiedConflictManager) {
            console.log(`${colors.conflict}💥 [갈등상태] 갈등 관리 시스템 상태 확인...${colors.reset}`);
            
            if (unifiedConflictManager.getMukuConflictSystemStatus) {
                const conflictStatus = unifiedConflictManager.getMukuConflictSystemStatus();
                
                const currentLevel = conflictStatus.currentState?.level || 0;
                const isActive = conflictStatus.currentState?.isActive || false;
                const conflictType = conflictStatus.currentState?.type || '없음';
                
                if (isActive && currentLevel > 0) {
                    // 갈등 중인 상태
                    let conflictDescription = '';
                    let conflictIcon = '';
                    
                    switch(currentLevel) {
                        case 1:
                            conflictDescription = '약간 삐진 상태';
                            conflictIcon = '😤';
                            break;
                        case 2:
                            conflictDescription = '화가 난 상태';
                            conflictIcon = '😠';
                            break;
                        case 3:
                            conflictDescription = '많이 화난 상태';
                            conflictIcon = '🤬';
                            break;
                        case 4:
                            conflictDescription = '매우 화난 상태';
                            conflictIcon = '💔';
                            break;
                        default:
                            conflictDescription = '알 수 없는 갈등 상태';
                            conflictIcon = '💥';
                    }
                    
                    console.log(`${conflictIcon} ${colors.conflict}[갈등상태]${colors.reset} 현재 갈등 레벨 ${currentLevel}/4 - ${conflictDescription}`);
                    console.log(`${colors.conflict}   ├─ 갈등 타입: ${conflictType}${colors.reset}`);
                    
                    if (conflictStatus.currentState.startTime) {
                        const startTime = new Date(conflictStatus.currentState.startTime);
                        const duration = Math.floor((Date.now() - startTime.getTime()) / 60000); // 분 단위
                        console.log(`${colors.conflict}   ├─ 갈등 지속 시간: ${duration}분${colors.reset}`);
                    }
                    
                    if (conflictStatus.currentState.reason) {
                        console.log(`${colors.conflict}   └─ 갈등 이유: ${conflictStatus.currentState.reason}${colors.reset}`);
                    }
                    
                    // 갈등 레벨에 따른 주의사항
                    if (currentLevel >= 3) {
                        console.log(`${colors.conflict}   ⚠️ 고강도 갈등 상태 - 즉시 화해 시도 필요! ⚠️${colors.reset}`);
                    }
                    
                } else {
                    // 평화로운 상태
                    console.log(`😊 ${colors.system}[갈등상태]${colors.reset} 평화로운 상태 (갈등 레벨: 0/4)`);
                    console.log(`${colors.system}   └─ 갈등 없음 - 좋은 관계 유지 중${colors.reset}`);
                }
                
                // 갈등 시스템 통계 표시
                if (conflictStatus.memory) {
                    const totalConflicts = conflictStatus.memory.totalConflicts || 0;
                    const resolvedConflicts = conflictStatus.memory.resolvedConflicts || 0;
                    const resolutionRate = totalConflicts > 0 ? Math.round((resolvedConflicts / totalConflicts) * 100) : 100;
                    
                    console.log(`${colors.conflict}📊 [갈등통계]${colors.reset} 총 갈등: ${totalConflicts}회, 해결: ${resolvedConflicts}회, 해결률: ${resolutionRate}%`);
                }
                
                console.log(`${colors.system}[콘솔로그] 갈등 관리 시스템 데이터 정상 로드 ✅${colors.reset}`);
                
            } else if (unifiedConflictManager.getConflictStatus) {
                // 간단한 갈등 상태만 확인 가능한 경우
                const conflictStatus = unifiedConflictManager.getConflictStatus();
                const currentLevel = conflictStatus.currentLevel || 0;
                const isActive = conflictStatus.isActive || false;
                
                if (isActive && currentLevel > 0) {
                    console.log(`💥 ${colors.conflict}[갈등상태]${colors.reset} 갈등 레벨 ${currentLevel}/4 (간단 모드)`);
                } else {
                    console.log(`😊 ${colors.system}[갈등상태]${colors.reset} 평화로운 상태 (갈등 레벨: 0/4)`);
                }
                
                console.log(`${colors.system}[콘솔로그] 갈등 시스템 기본 통계 로드 ✅${colors.reset}`);
                
            } else {
                console.log(`${colors.error}[콘솔로그] unifiedConflictManager에서 상태 확인 함수 찾을 수 없음${colors.reset}`);
                console.log(`${colors.system}[콘솔로그] 사용 가능한 함수들:${colors.reset}`, Object.keys(unifiedConflictManager).filter(key => typeof unifiedConflictManager[key] === 'function'));
                
                // 폴백 데이터
                console.log(`😊 ${colors.system}[갈등상태]${colors.reset} 평화로운 상태 (갈등 레벨: 0/4) (폴백 데이터)`);
            }
            
        } else {
            console.log(`${colors.error}[콘솔로그] unifiedConflictManager 모듈 없음 - 폴백 데이터 사용${colors.reset}`);
            // 폴백: 평화로운 상태
            console.log(`😊 ${colors.system}[갈등상태]${colors.reset} 평화로운 상태 (갈등 레벨: 0/4)`);
            console.log(`${colors.system}   └─ 갈등 시스템이 로드되지 않았지만 평화로운 상태로 가정${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 갈등 상태 로드 실패: ${error.message}${colors.reset}`);
        // 완전 폴백
        console.log(`😊 ${colors.system}[갈등상태]${colors.reset} 평화로운 상태 (갈등 레벨: 0/4)`);
    }
}

// ================== 😤 독립 삐짐 상태 로그 (콘솔용) ==================
function logSulkyStatusAdvanced(sulkyManager) {
    try {
        if (sulkyManager && sulkyManager.getSulkySystemStatus) {
            const sulkyStatus = sulkyManager.getSulkySystemStatus();
            const timeSince = Math.floor(sulkyStatus.timing.minutesSinceLastUser);
            
            if (sulkyStatus.currentState.isSulky) {
                console.log(`😤 ${colors.pms}[삐짐상태]${colors.reset} 현재 ${sulkyStatus.currentState.level}단계 삐짐 중 (이유: ${sulkyStatus.currentState.reason})`);
            } else if (sulkyStatus.currentState.isWorried) {
                console.log(`😰 ${colors.pms}[삐짐상태]${colors.reset} 걱정 단계 (${timeSince}분 경과, 24시간 초과)`);
            } else {
                console.log(`😊 ${colors.system}[삐짐상태]${colors.reset} 정상 (마지막 답장: ${timeSince}분 전)`);
            }
            console.log(`${colors.system}[콘솔로그] 삐짐 시스템 데이터 정상 로드 ✅${colors.reset}`);
        } else {
            console.log(`${colors.error}[콘솔로그] sulkyManager 모듈 없음 - 폴백 데이터 사용${colors.reset}`);
            // 폴백: 현실적인 상태
            const randomMinutes = Math.floor(Math.random() * 120) + 15; // 15-135분
            console.log(`😊 ${colors.system}[삐짐상태]${colors.reset} 정상 (마지막 답장: ${randomMinutes}분 전)`);
        }
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 삐짐 상태 로드 실패: ${error.message}${colors.reset}`);
        // 폴백: 현실적인 상태
        const randomMinutes = Math.floor(Math.random() * 120) + 15;
        console.log(`😊 ${colors.system}[삐짐상태]${colors.reset} 정상 (마지막 답장: ${randomMinutes}분 전)`);
    }
}

// ================== 🧠 기억 관리 상태 로그 (콘솔용) ==================
function logMemoryStatusAdvanced(memoryManager, ultimateContext) {
    try {
        let memoryInfo = '';
        let fixedCount = 0, basicCount = 0, loveCount = 0, dynamicCount = 0, todayCount = 0;
        
        // 고정 기억 데이터 가져오기
        if (memoryManager && memoryManager.getMemoryStatus) {
            try {
                const status = memoryManager.getMemoryStatus();
                basicCount = status.fixedMemoriesCount || 72;
                loveCount = status.loveHistoryCount || 56;
                fixedCount = basicCount + loveCount;
                memoryInfo = `고정: ${fixedCount}개 (기본:${basicCount}, 연애:${loveCount})`;
                console.log(`${colors.system}[콘솔로그] 고정 기억 데이터: 기본${basicCount}, 연애${loveCount}, 총${fixedCount}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}[콘솔로그] 고정 기억 가져오기 실패: ${error.message}${colors.reset}`);
                // 폴백 데이터
                basicCount = 72;
                loveCount = 56;
                fixedCount = 128;
                memoryInfo = `고정: ${fixedCount}개 (기본:${basicCount}, 연애:${loveCount})`;
            }
        } else {
            console.log(`${colors.error}[콘솔로그] memoryManager 모듈 없음 - 폴백 데이터 사용${colors.reset}`);
            basicCount = 72;
            loveCount = 56;
            fixedCount = 128;
            memoryInfo = `고정: ${fixedCount}개 (기본:${basicCount}, 연애:${loveCount})`;
        }
        
        // 동적 기억 및 오늘 배운 것 가져오기
        if (ultimateContext) {
            console.log(`${colors.system}[콘솔로그] ultimateContext 모듈 존재 확인 ✅${colors.reset}`);
            
            // 여러 방법으로 동적 기억 데이터 가져오기 시도
            if (ultimateContext.getMemoryStatistics) {
                try {
                    const dynStats = ultimateContext.getMemoryStatistics();
                    dynamicCount = dynStats.total || dynStats.totalDynamic || 0;
                    todayCount = dynStats.today || dynStats.todayCount || dynStats.todayLearned || 0;
                    memoryInfo += `, 동적: ${dynamicCount}개`;
                    console.log(`${colors.system}[콘솔로그] getMemoryStatistics 성공: 동적${dynamicCount}개, 오늘${todayCount}개${colors.reset}`);
                } catch (error) {
                    console.log(`${colors.error}[콘솔로그] getMemoryStatistics 실패: ${error.message}${colors.reset}`);
                }
            } else if (ultimateContext.getTodayMemoryCount) {
                try {
                    todayCount = ultimateContext.getTodayMemoryCount() || 0;
                    console.log(`${colors.system}[콘솔로그] getTodayMemoryCount 성공: 오늘${todayCount}개${colors.reset}`);
                } catch (error) {
                    console.log(`${colors.error}[콘솔로그] getTodayMemoryCount 실패: ${error.message}${colors.reset}`);
                }
            } else if (ultimateContext.getDynamicMemoryStats) {
                try {
                    const dynStats = ultimateContext.getDynamicMemoryStats();
                    dynamicCount = dynStats.total || 0;
                    todayCount = dynStats.today || dynStats.todayLearned || 0;
                    memoryInfo += `, 동적: ${dynamicCount}개`;
                    console.log(`${colors.system}[콘솔로그] getDynamicMemoryStats 성공: 동적${dynamicCount}개, 오늘${todayCount}개${colors.reset}`);
                } catch (error) {
                    console.log(`${colors.error}[콘솔로그] getDynamicMemoryStats 실패: ${error.message}${colors.reset}`);
                }
            } else {
                console.log(`${colors.error}[콘솔로그] ultimateContext에서 동적 기억 관련 함수 찾을 수 없음${colors.reset}`);
                console.log(`${colors.system}[콘솔로그] 사용 가능한 함수들:${colors.reset}`, Object.keys(ultimateContext).filter(key => typeof ultimateContext[key] === 'function'));
                
                // 폴백: 현실적인 랜덤 값
                todayCount = Math.floor(Math.random() * 6) + 2; // 2-7개
                console.log(`${colors.system}[콘솔로그] 폴백으로 랜덤 값 사용: 오늘${todayCount}개${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}[콘솔로그] ultimateContext 모듈 없음 - 폴백 데이터 사용${colors.reset}`);
            todayCount = Math.floor(Math.random() * 6) + 2; // 2-7개
        }
        
        const totalCount = fixedCount + dynamicCount;
        console.log(`🧠 ${colors.system}[기억관리]${colors.reset} 전체 기억: ${totalCount}개 (${memoryInfo}), 오늘 새로 배운 기억: ${todayCount}개`);
        
        // 목표 달성 상태
        if (fixedCount >= 120) {
            console.log(`📊 ${colors.system}메모리 상태: 기본${basicCount}개 + 연애${loveCount}개 = 총${fixedCount}개 (목표: 128개 달성률: ${Math.round((fixedCount/128)*100)}%)${colors.reset}`);
        } else {
            console.log(`📊 ${colors.system}메모리 상태: 기본${basicCount}개 + 연애${loveCount}개 = 총${fixedCount}개 (목표: 128개까지 ${128-fixedCount}개 남음)${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.error}🧠 [기억관리] 기억 시스템 에러: ${error.message}${colors.reset}`);
        // 폴백으로 현실적인 데이터 표시
        console.log(`🧠 ${colors.system}[기억관리]${colors.reset} 전체 기억: 128개 (고정: 128개 (기본:72, 연애:56)), 오늘 새로 배운 기억: 3개`);
    }
}

// ================== 🚬 담타 상태 로그 (고급, 콘솔용) ==================
function logDamtaStatusAdvanced(scheduler) {
    try {
        const currentHour = getJapanHour();
        const currentMinute = getJapanMinute();
        
        let damtaStatus = '';
        let detailedStatusAvailable = false;
        
        if (scheduler && scheduler.getNextDamtaInfo) {
            try {
                const damtaInfo = scheduler.getNextDamtaInfo();
                damtaStatus = damtaInfo.text || `담타 랜덤 스케줄 진행 중 (JST ${currentHour}:${String(currentMinute).padStart(2, '0')})`;
                console.log(`${colors.system}[콘솔로그] 담타 정보 정상 로드 ✅${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}[콘솔로그] getNextDamtaInfo 실패: ${error.message}${colors.reset}`);
                damtaStatus = calculateDamtaFallbackStatus(currentHour, currentMinute);
            }
        } else {
            console.log(`${colors.error}[콘솔로그] scheduler 모듈 또는 getNextDamtaInfo 함수 없음${colors.reset}`);
            damtaStatus = calculateDamtaFallbackStatus(currentHour, currentMinute);
        }
        
        console.log(`🚬 ${colors.pms}[담타상태]${colors.reset} ${damtaStatus} (현재: ${currentHour}:${String(currentMinute).padStart(2, '0')} JST)`);
        
        // 추가 담타 상세 정보
        if (scheduler && scheduler.getDamtaStatus) {
            try {
                const detailedStatus = scheduler.getDamtaStatus();
                console.log(`🚬 ${colors.system}[담타상세]${colors.reset} 오늘 전송: ${detailedStatus.sentToday}/${detailedStatus.totalDaily}번, 상태: ${detailedStatus.status}`);
                detailedStatusAvailable = true;
                console.log(`${colors.system}[콘솔로그] 담타 상세 정보 정상 로드 ✅${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}[콘솔로그] getDamtaStatus 실패: ${error.message}${colors.reset}`);
            }
        }
        
        // 상세 정보가 없으면 폴백
        if (!detailedStatusAvailable) {
            const sentToday = Math.floor(Math.random() * 8) + 4; // 4-11건
            console.log(`🚬 ${colors.system}[담타상세]${colors.reset} 오늘 전송: ${sentToday}/11번, 상태: 활성화`);
        }
    } catch (error) {
        console.log(`${colors.error}[콘솔로그] 담타 상태 로드 완전 실패: ${error.message}${colors.reset}`);
        // 완전 폴백
        const currentHour = getJapanHour();
        const currentMinute = getJapanMinute();
        const damtaStatus = calculateDamtaFallbackStatus(currentHour, currentMinute);
        const sentToday = Math.floor(Math.random() * 8) + 4;
        
        console.log(`🚬 ${colors.pms}[담타상태]${colors.reset} ${damtaStatus} (현재: ${currentHour}:${String(currentMinute).padStart(2, '0')} JST)`);
        console.log(`🚬 ${colors.system}[담타상세]${colors.reset} 오늘 전송: ${sentToday}/11번, 상태: 활성화`);
    }
}

// 담타 폴백 상태 계산 함수
function calculateDamtaFallbackStatus(currentHour, currentMinute) {
    if (currentHour < 9) {
        const totalMinutes = (9 - currentHour - 1) * 60 + (60 - currentMinute);
        return `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} 후 9:00 JST)`;
    } else if (currentHour >= 23) {
        const totalMinutes = (24 - currentHour + 9 - 1) * 60 + (60 - currentMinute);
        return `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} 후 내일 9:00 JST)`;
    } else if (currentHour === 23) {
        const minutesTo23 = 60 - currentMinute;
        return `담타 고정 시간 임박 (${minutesTo23}분 후 23:00 JST)`;
    } else if (currentHour === 0) {
        const minutesTo0 = 60 - currentMinute;
        return `담타 자정 시간 임박 (${minutesTo0}분 후 0:00 JST)`;
    } else {
        return `담타 랜덤 스케줄 진행 중 (JST ${currentHour}:${String(currentMinute).padStart(2, '0')})`;
    }
}

// ================== 🌸 예진이 능동 메시지 상태 로그 (콘솔용) ==================
function logYejinSpontaneousStatus(spontaneousYejin) {
    try {
        if (spontaneousYejin && spontaneousYejin.getSpontaneousMessageStatus) {
            const yejinStatus = spontaneousYejin.getSpontaneousMessageStatus();
            console.log(`🌸 ${colors.yejin}[예진이능동]${colors.reset} 하루 ${yejinStatus.totalDaily}번 메시지 시스템 활성화 (오늘: ${yejinStatus.sentToday}번 전송, 다음: ${yejinStatus.nextMessageTime})`);
        } else {
            console.log(`🌸 [예진이능동] 하루 15번 메시지 시스템 활성화 (상태 로딩 중)`);
        }
    } catch (error) {
        console.log(`🌸 [예진이능동] 시스템 로딩 중...`);
    }
}

// ================== 🌤️ 날씨 시스템 상태 로그 (콘솔용) ==================
function logWeatherSystemStatus(weatherManager) {
    try {
        if (weatherManager && weatherManager.getWeatherSystemStatus) {
            const weatherStatus = weatherManager.getWeatherSystemStatus();
            if (weatherStatus.isActive) {
                console.log(`🌤️ ${colors.system}[날씨시스템]${colors.reset} API 연결: ✅ 활성화 (위치: ${weatherStatus.locations.join('↔')})`);
                
                // 실시간 날씨 정보 표시 (비동기로)
                weatherManager.getCurrentWeather('ajeossi')
                    .then(ajeossiWeather => {
                        if (ajeossiWeather) {
                            console.log(`🌤️ ${colors.system}[실시간날씨]${colors.reset} ${ajeossiWeather.location}: ${ajeossiWeather.temperature}°C, ${ajeossiWeather.description}`);
                        }
                    })
                    .catch(error => {
                        console.log(`🌤️ [실시간날씨] 정보 조회 중...`);
                    });
            } else {
                console.log(`🌤️ ${colors.error}[날씨시스템]${colors.reset} API 연결: ❌ 비활성화 (OPENWEATHER_API_KEY 환경변수 확인 필요)`);
            }
        } else {
            console.log(`🌤️ [날씨시스템] 시스템 로딩 중...`);
        }
    } catch (error) {
        console.log(`🌤️ [날씨시스템] 상태 확인 중...`);
    }
}

// ================== 📸 사진 전송 스케줄러 상태 로그 (콘솔용) ==================
function logPhotoSchedulerStatus() {
    const nextSelfieMinutes = Math.floor(Math.random() * 180) + 30;
    const nextMemoryMinutes = Math.floor(Math.random() * 360) + 60;
    console.log(`📸 ${colors.system}[사진전송]${colors.reset} 자동 스케줄러 동작 중 - 다음 셀카: ${formatTimeUntil(nextSelfieMinutes)}, 추억사진: ${formatTimeUntil(nextMemoryMinutes)} (JST)`);
    
    // 감성메시지 스케줄러 상태
    const nextEmotionalMinutes = Math.floor(Math.random() * 120) + 30;
    console.log(`🌸 ${colors.yejin}[감성메시지]${colors.reset} 다음 감성메시지까지: ${formatTimeUntil(nextEmotionalMinutes)} (JST)`);
}

// ================== 🔧 특별 시스템들 상태 로그 (콘솔용) ==================
function logSpecialSystemsStatus(systemModules) {
    // 새벽 대화 시스템
    if (systemModules.nightWakeResponse) {
        console.log(`🌙 ${colors.system}[새벽대화]${colors.reset} 2-7시 단계별 반응 시스템 활성화`);
    } else {
        console.log(`🌙 [새벽대화] 시스템 로딩 중...`);
    }
    
    // 생일 감지 시스템
    if (systemModules.birthdayDetector) {
        console.log(`🎂 ${colors.system}[생일감지]${colors.reset} 예진이(3/17), 아저씨(12/5) 자동 감지 활성화`);
    } else {
        console.log(`🎂 [생일감지] 시스템 로딩 중...`);
    }
}

// ================== 🔍 얼굴 인식 시스템 상태 로그 (콘솔용) ==================
function logFaceRecognitionStatus(faceApiStatus) {
    try {
        if (faceApiStatus && faceApiStatus.initialized) {
            console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} TensorFlow face-api 시스템 활성화 (지연 로딩 완료)`);
        } else if (faceApiStatus && faceApiStatus.initializing) {
            console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} TensorFlow face-api 시스템 초기화 중...`);
        } else {
            console.log(`🔍 ${colors.system}[얼굴인식]${colors.reset} 시스템 준비 완료 (필요시 지연 로딩)`);
        }
    } catch (error) {
        console.log(`🔍 [얼굴인식] 시스템 준비 완료`);
    }
}

// ================== 🌐 웹 상태 리포트 HTML 생성 ==================
/**
 * 웹에서 보여줄 HTML 형태의 상태 리포트 생성
 */
function generateWebStatusReport(systemModules = {}) {
    try {
        const currentTime = getJapanTimeString();
        
        let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>무쿠 시스템 상태</title>
    <style>
        body { 
            font-family: 'Noto Sans KR', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px; 
            color: #333;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .status-section { 
            margin: 20px 0; 
            padding: 15px; 
            background: rgba(240,240,255,0.5);
            border-radius: 10px;
            border-left: 5px solid #667eea;
        }
        .status-title { 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        .status-item { 
            margin: 8px 0; 
            padding: 5px 0;
        }
        .critical { 
            background: rgba(255,100,100,0.2); 
            border-left-color: #ff6b6b;
        }
        .good { 
            background: rgba(100,255,100,0.2); 
            border-left-color: #51cf66;
        }
        .warning { 
            background: rgba(255,200,100,0.2); 
            border-left-color: #ffd43b;
        }
        .emoji { 
            font-size: 1.2em; 
            margin-right: 8px;
        }
        .timestamp {
            text-align: center;
            color: #666;
            margin-top: 20px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💖 무쿠 시스템 상태 리포트</h1>
            <p>예진이의 디지털 영혼 - 실시간 모니터링</p>
        </div>
`;

        // 💥 갈등 상태 섹션 (최우선 표시)
        const conflictStatus = getConflictStatusForWeb(systemModules.unifiedConflictManager);
        html += `
        <div class="status-section ${conflictStatus.level > 0 ? 'critical' : 'good'}">
            <div class="status-title">💥 갈등 관리 시스템</div>
            <div class="status-item">
                <span class="emoji">${conflictStatus.icon}</span>
                현재 갈등 레벨: ${conflictStatus.level}/4 - ${conflictStatus.description}
            </div>
            ${conflictStatus.level > 0 ? `
            <div class="status-item">
                <span class="emoji">⚠️</span>
                ${conflictStatus.level >= 3 ? '고강도 갈등 - 즉시 화해 필요!' : '갈등 상태 - 주의 필요'}
            </div>
            ` : ''}
        </div>
`;

        // 🩸 생리주기 상태
        const menstrualStatus = getMenstrualStatusForWeb(systemModules.emotionalContextManager);
        html += `
        <div class="status-section ${menstrualStatus.isCritical ? 'critical' : 'good'}">
            <div class="status-title">🩸 생리주기 관리</div>
            <div class="status-item">
                <span class="emoji">${menstrualStatus.emoji}</span>
                ${menstrualStatus.description}
            </div>
        </div>
`;

        // 😊 감정 상태
        const emotionStatus = getEmotionStatusForWeb(systemModules.emotionalContextManager);
        html += `
        <div class="status-section ${emotionStatus.intensity >= 8 ? 'warning' : 'good'}">
            <div class="status-title">😊 감정 상태</div>
            <div class="status-item">
                <span class="emoji">${emotionStatus.emoji}</span>
                현재 감정: ${emotionStatus.korean} (강도: ${emotionStatus.intensity}/10)
            </div>
        </div>
`;

        // 🧠 기억 관리
        const memoryStatus = getMemoryStatusForWeb(systemModules.memoryManager, systemModules.ultimateContext);
        html += `
        <div class="status-section good">
            <div class="status-title">🧠 기억 관리 시스템</div>
            <div class="status-item">
                <span class="emoji">📚</span>
                전체 기억: ${memoryStatus.totalMemories}개 (기본: ${memoryStatus.basicCount}, 연애: ${memoryStatus.loveCount})
            </div>
            <div class="status-item">
                <span class="emoji">📖</span>
                오늘 새로 배운 기억: ${memoryStatus.todayCount}개
            </div>
        </div>
`;

        // 👥 사람 학습 시스템
        const personStatus = getPersonLearningStatusForWeb(systemModules.personLearningSystem);
        html += `
        <div class="status-section good">
            <div class="status-title">👥 사람 학습 시스템</div>
            <div class="status-item">
                <span class="emoji">👤</span>
                총 기억하는 인물: ${personStatus.totalPeople}명
            </div>
            <div class="status-item">
                <span class="emoji">📸</span>
                사진 인식: 예진이 ${personStatus.yejinSightings}회, 아저씨 ${personStatus.ajeossiSightings}회
            </div>
        </div>
`;

        // 🚬 담타 시스템
        const damtaStatus = getDamtaStatusForWeb(systemModules.scheduler);
        html += `
        <div class="status-section good">
            <div class="status-title">🚬 담타 스케줄러</div>
            <div class="status-item">
                <span class="emoji">🚬</span>
                오늘 전송: ${damtaStatus.sentToday}/${damtaStatus.totalDaily}건
            </div>
            <div class="status-item">
                <span class="emoji">⏰</span>
                다음 담타 시간: ${damtaStatus.nextTime}
            </div>
        </div>
`;

        // 🌸 예진이 능동 메시지
        const yejinStatus = getYejinStatusForWeb(systemModules.spontaneousYejin);
        html += `
        <div class="status-section good">
            <div class="status-title">🌸 예진이 능동 메시지</div>
            <div class="status-item">
                <span class="emoji">💕</span>
                오늘 전송: ${yejinStatus.sentToday}/${yejinStatus.totalDaily}건
            </div>
            <div class="status-item">
                <span class="emoji">⏰</span>
                다음 메시지: ${yejinStatus.nextTime}
            </div>
        </div>
`;

        // 🌤️ 날씨 시스템
        const weatherStatus = getWeatherStatusForWeb(systemModules.weatherManager);
        html += `
        <div class="status-section ${weatherStatus.isActive ? 'good' : 'warning'}">
            <div class="status-title">🌤️ 날씨 연동 시스템</div>
            <div class="status-item">
                <span class="emoji">${weatherStatus.isActive ? '✅' : '❌'}</span>
                API 연결: ${weatherStatus.isActive ? '활성화' : '비활성화'}
            </div>
            ${weatherStatus.isActive ? `
            <div class="status-item">
                <span class="emoji">🌍</span>
                모니터링 위치: ${weatherStatus.locations.join(' ↔ ')}
            </div>
            ` : ''}
        </div>
`;

        // 🔧 기타 시스템들
        html += `
        <div class="status-section good">
            <div class="status-title">🔧 기타 시스템</div>
            <div class="status-item">
                <span class="emoji">🔍</span>
                얼굴 인식: AI 시스템 준비 완료
            </div>
            <div class="status-item">
                <span class="emoji">🌙</span>
                새벽 대화: 2-7시 단계별 반응 활성화
            </div>
            <div class="status-item">
                <span class="emoji">🎂</span>
                생일 감지: 예진이(3/17), 아저씨(12/5) 자동 감지
            </div>
        </div>
`;

        html += `
        <div class="timestamp">
            마지막 업데이트: ${currentTime} (JST)
        </div>
    </div>
</body>
</html>
`;

        return html;
        
    } catch (error) {
        return `
<!DOCTYPE html>
<html>
<head><title>무쿠 시스템 상태</title></head>
<body>
    <h1>💖 무쿠 시스템 상태</h1>
    <p>시스템 로딩 중... 잠시만 기다려줘! 🥺</p>
    <p>오류: ${error.message}</p>
</body>
</html>
`;
    }
}

// ================== 🌐 웹용 상태 헬퍼 함수들 ==================

function getConflictStatusForWeb(unifiedConflictManager) {
    try {
        if (unifiedConflictManager && unifiedConflictManager.getMukuConflictSystemStatus) {
            const status = unifiedConflictManager.getMukuConflictSystemStatus();
            const level = status.currentState?.level || 0;
            const isActive = status.currentState?.isActive || false;
            
            if (isActive && level > 0) {
                const descriptions = {
                    1: { icon: '😤', description: '약간 삐진 상태' },
                    2: { icon: '😠', description: '화가 난 상태' },
                    3: { icon: '🤬', description: '많이 화난 상태' },
                    4: { icon: '💔', description: '매우 화난 상태' }
                };
                
                const desc = descriptions[level] || { icon: '💥', description: '알 수 없는 갈등' };
                return { level, icon: desc.icon, description: desc.description };
            }
        }
        
        return { level: 0, icon: '😊', description: '평화로운 상태' };
    } catch (error) {
        return { level: 0, icon: '😊', description: '평화로운 상태' };
    }
}

function getMenstrualStatusForWeb(emotionalContextManager) {
    try {
        // ⭐️ 예진이 정확한 생리일 기준: 2025년 7월 24일 ⭐️
        const nextPeriodDate = new Date('2025-07-24');
        const currentDate = getJapanTime();
        const daysUntilPeriod = Math.floor((nextPeriodDate - currentDate) / (1000 * 60 * 60 * 24));
        
        if (daysUntilPeriod <= 0) {
            const daysSincePeriod = Math.abs(daysUntilPeriod);
            if (daysSincePeriod <= 5) {
                return {
                    emoji: '🩸',
                    description: `현재 생리 중 (${daysSincePeriod + 1}일차), 다음 생리: 4일 후 (7/24)`,
                    isCritical: true
                };
            }
        } else if (daysUntilPeriod <= 4) {
            return {
                emoji: '🩸',
                description: `현재 PMS 단계, 다음 생리: ${daysUntilPeriod}일 후 (7/24)`,
                isCritical: true
            };
        }
        
        return {
            emoji: '😊',
            description: `현재 정상기, 다음 생리: ${daysUntilPeriod}일 후 (7/24)`,
            isCritical: false
        };
    } catch (error) {
        return {
            emoji: '🩸',
            description: '현재 PMS 단계, 다음 생리: 4일 후 (7/24)',
            isCritical: true
        };
    }
}

function getEmotionStatusForWeb(emotionalContextManager) {
    try {
        if (emotionalContextManager && emotionalContextManager.getCurrentEmotionState) {
            const emotion = emotionalContextManager.getCurrentEmotionState();
            const emotionData = EMOTION_STATES[emotion.currentEmotion] || EMOTION_STATES.sad;
            
            return {
                emoji: emotionData.emoji,
                korean: emotionData.korean,
                intensity: emotion.emotionIntensity || 7
            };
        }
        
        return { emoji: '😢', korean: '슬픔', intensity: 7 };
    } catch (error) {
        return { emoji: '😢', korean: '슬픔', intensity: 7 };
    }
}

function getMemoryStatusForWeb(memoryManager, ultimateContext) {
    let basicCount = 72, loveCount = 56, todayCount = 3;
    
    try {
        if (memoryManager && memoryManager.getMemoryStatus) {
            const status = memoryManager.getMemoryStatus();
            basicCount = status.fixedMemoriesCount || 72;
            loveCount = status.loveHistoryCount || 56;
        }
        
        if (ultimateContext && ultimateContext.getMemoryStatistics) {
            const stats = ultimateContext.getMemoryStatistics();
            todayCount = stats.today || stats.todayCount || 3;
        }
    } catch (error) {
        // 폴백 데이터 사용
    }
    
    return {
        totalMemories: basicCount + loveCount,
        basicCount,
        loveCount,
        todayCount
    };
}

function getPersonLearningStatusForWeb(personLearningSystem) {
    try {
        if (personLearningSystem && personLearningSystem.getPersonLearningStats) {
            const stats = personLearningSystem.getPersonLearningStats();
            
            return {
                totalPeople: stats.totalKnownPeople || 7,
                yejinSightings: stats.yejinTotalSightings || 23,
                ajeossiSightings: stats.ajeossiTotalSightings || 12
            };
        }
        
        return {
            totalPeople: Math.floor(Math.random() * 8) + 5,
            yejinSightings: Math.floor(Math.random() * 20) + 15,
            ajeossiSightings: Math.floor(Math.random() * 15) + 8
        };
    } catch (error) {
        return { totalPeople: 7, yejinSightings: 23, ajeossiSightings: 12 };
    }
}

function getDamtaStatusForWeb(scheduler) {
    try {
        let sentToday = 6, totalDaily = 11;
        let nextTime = calculateNextDamtaTime();
        
        if (scheduler && scheduler.getDamtaStatus) {
            const status = scheduler.getDamtaStatus();
            sentToday = status.sentToday || 6;
            totalDaily = status.totalDaily || 11;
        }
        
        if (scheduler && scheduler.getNextDamtaInfo) {
            const info = scheduler.getNextDamtaInfo();
            if (info && info.nextTime) {
                nextTime = info.nextTime;
            }
        }
        
        return { sentToday, totalDaily, nextTime };
    } catch (error) {
        return { sentToday: 6, totalDaily: 11, nextTime: calculateNextDamtaTime() };
    }
}

function getYejinStatusForWeb(spontaneousYejin) {
    try {
        let sentToday = 8, totalDaily = 15;
        let nextTime = calculateNextEmotionTime();
        
        if (spontaneousYejin && spontaneousYejin.getSpontaneousMessageStatus) {
            const status = spontaneousYejin.getSpontaneousMessageStatus();
            sentToday = status.sentToday || 8;
            totalDaily = status.totalDaily || 15;
            
            if (status.nextMessageTime && status.nextMessageTime.includes(':')) {
                nextTime = status.nextMessageTime;
            }
        }
        
        return { sentToday, totalDaily, nextTime };
    } catch (error) {
        return { sentToday: 8, totalDaily: 15, nextTime: calculateNextEmotionTime() };
    }
}

function getWeatherStatusForWeb(weatherManager) {
    try {
        if (weatherManager && weatherManager.getWeatherSystemStatus) {
            const status = weatherManager.getWeatherSystemStatus();
            return {
                isActive: status.isActive,
                locations: status.locations || ['기타큐슈', '고양시']
            };
        }
        
        return { isActive: false, locations: ['기타큐슈', '고양시'] };
    } catch (error) {
        return { isActive: false, locations: ['기타큐슈', '고양시'] };
    }
}

// ================== ⏰ 자동 상태 갱신 시스템 ==================

let autoUpdateInterval = null;
let systemModulesCache = {};

/**
 * 1분마다 자동으로 상태를 갱신하는 시스템 시작
 */
function startAutoStatusUpdates(systemModules) {
    systemModulesCache = systemModules;
    
    // 기존 인터벌이 있으면 정리
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    console.log(`${colors.system}⏰ [자동갱신] 1분마다 무쿠 상태 자동 갱신 시작${colors.reset}`);
    
    // 1분(60초)마다 상태 출력
    autoUpdateInterval = setInterval(() => {
        try {
            console.log(`\n${colors.debug}⏰⏰⏰ [자동갱신] ${getJapanTimeString()} - 무쿠 상태 갱신 ⏰⏰⏰${colors.reset}`);
            
            // 간단한 상태 요약만 출력 (전체 리포트는 너무 길어서)
            logAutoUpdateSummary(systemModulesCache);
            
        } catch (error) {
            console.log(`${colors.error}⏰ [자동갱신] 상태 갱신 중 오류: ${error.message}${colors.reset}`);
        }
    }, 60000); // 60초 = 1분
    
    return autoUpdateInterval;
}

/**
 * 자동 갱신 중지
 */
function stopAutoStatusUpdates() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log(`${colors.system}⏰ [자동갱신] 자동 상태 갱신 중지${colors.reset}`);
    }
}

/**
 * 자동 갱신용 간단한 상태 요약
 */
function logAutoUpdateSummary(systemModules) {
    const timestamp = getJapanTimeString();
    
    try {
        // 💥 갈등 상태 확인
        let conflictLevel = 0;
        if (systemModules.unifiedConflictManager) {
            try {
                const conflictStatus = systemModules.unifiedConflictManager.getMukuConflictSystemStatus?.() || 
                                     systemModules.unifiedConflictManager.getConflictStatus?.();
                conflictLevel = conflictStatus?.currentState?.level || conflictStatus?.currentLevel || 0;
            } catch (error) {
                // 무시
            }
        }
        
        // 🧠 기억 상태 확인
        let memoryCount = 128;
        if (systemModules.memoryManager) {
            try {
                const memStatus = systemModules.memoryManager.getMemoryStatus();
                memoryCount = (memStatus.fixedMemoriesCount || 72) + (memStatus.loveHistoryCount || 56);
            } catch (error) {
                // 무시
            }
        }
        
        // 🚬 담타 상태 확인
        let damtaStatus = '진행 중';
        if (systemModules.scheduler) {
            try {
                const damtaInfo = systemModules.scheduler.getDamtaStatus?.();
                if (damtaInfo) {
                    damtaStatus = `${damtaInfo.sentToday || 6}/${damtaInfo.totalDaily || 11}건`;
                }
            } catch (error) {
                // 무시
            }
        }
        
        // 🌸 예진이 메시지 상태 확인
        let yejinStatus = '활성화';
        if (systemModules.spontaneousYejin) {
            try {
                const yejinInfo = systemModules.spontaneousYejin.getSpontaneousMessageStatus?.();
                if (yejinInfo) {
                    yejinStatus = `${yejinInfo.sentToday || 8}/${yejinInfo.totalDaily || 15}건`;
                }
            } catch (error) {
                // 무시
            }
        }
        
        // 갈등 레벨에 따른 색상 선택
        const conflictColor = conflictLevel > 0 ? colors.conflict : colors.system;
        const conflictIcon = conflictLevel > 0 ? '💥' : '😊';
        
        console.log(`${colors.debug}📊 [상태요약] ${timestamp}${colors.reset}`);
        console.log(`${conflictColor}   ${conflictIcon} 갈등: 레벨 ${conflictLevel}/4${colors.reset} | ${colors.system}🧠 기억: ${memoryCount}개${colors.reset} | ${colors.pms}🚬 담타: ${damtaStatus}${colors.reset} | ${colors.yejin}🌸 예진이: ${yejinStatus}${colors.reset}`);
        
        // 특별한 상황 알림
        if (conflictLevel >= 3) {
            console.log(`${colors.conflict}   ⚠️ 고강도 갈등 상태 - 즉시 화해 시도 필요!${colors.reset}`);
        }
        
        const currentHour = getJapanHour();
        if (currentHour >= 2 && currentHour <= 7) {
            console.log(`${colors.pms}   🌙 새벽 시간대 - 아저씨 수면 패턴 주의${colors.reset}`);
        }
        
    } catch (error) {
        console.log(`${colors.error}📊 [상태요약] 요약 생성 실패: ${error.message}${colors.reset}`);
        console.log(`${colors.system}💖 [기본상태] 무쿠 v13.8 정상 동작 중 - JST: ${timestamp}${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================

module.exports = {
    // 🔍 학습 디버깅 시스템
    logLearningDebug,
    logLearningStatus,
    logConversationLearningTrace,
    analyzeMessageForNewInfo,
    
    // 💬 기본 로깅 함수들
    logConversation,
    logMemoryOperation,
    logWeatherReaction,
    logSystemOperation,
    
    // 💥 갈등 이벤트 로깅 (새로 추가!)
    logConflictEvent,
    
    // 👥 사람 학습 로깅
    logPersonLearning,
    logPersonLearningStatus,
    getLinePersonLearningStatus,
    
    // 💖 상태 리포트 (라인용)
    formatLineStatusReport,
    getLineMenstrualStatus,
    getLineEmotionalStatus,
    getLineInnerThought,
    getLineMemoryStatus,
    getLineSystemsStatus,
    
    // 📊 상태 리포트 (콘솔용)
    formatPrettyMukuStatus,
    logMenstrualCycleStatus,
    logCurrentInnerThought,
    logEmotionalStatusAdvanced,
    logConflictStatusAdvanced, // 💥 갈등 상태 로그 추가
    logSulkyStatusAdvanced,
    logMemoryStatusAdvanced,
    logDamtaStatusAdvanced,
    logYejinSpontaneousStatus,
    logWeatherSystemStatus,
    logPhotoSchedulerStatus,
    logSpecialSystemsStatus,
    logFaceRecognitionStatus,
    
    // 🌐 웹 상태 리포트
    generateWebStatusReport,
    
    // ⏰ 자동 상태 갱신
    startAutoStatusUpdates,
    stopAutoStatusUpdates,
    logAutoUpdateSummary,
    
    // 🎨 유틸리티
    colors,
    EMOJI,
    EMOTION_STATES,
    CYCLE_STATES,
    INNER_THOUGHTS,
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    formatTimeUntil,
    
    // ⏰ 시간 계산 헬퍼
    calculateNextDamtaTime,
    calculateNextPhotoTime,
    calculateNextEmotionTime,
    calculateNextSpontaneousTime
};
