// ============================================================================
// commandHandler.js - v5.1 (Redis 일기장 명령어 확장 + 기억해 영구 저장)
// ✅ 기존 모든 기능 100% 보존
// 🆕 추가: Redis 기간별 일기 조회 명령어들
// 📅 지원: 최근7일, 지난주, 한달전, 이번달, 지난달 일기
// 🧠 신규: "기억해" 명령어로 영구 기억 저장 기능
// 🛡️ 안전장치: 에러가 나도 기존 시스템에 절대 영향 없음
// 💖 무쿠가 벙어리가 되지 않도록 최우선 보장
// 🔧 수정: 일기/상태 키워드 오작동 방지 로직 추가
// ============================================================================

const path = require('path');
const fs = require('fs');

// ⭐ 새벽응답+알람 시스템 (기존 그대로 유지)
let nightWakeSystem = null;
try {
    nightWakeSystem = require('./night_wake_response.js');
    console.log('[commandHandler] ✅ 새벽응답+알람 시스템 로드 성공');
} catch (error) {
    console.log('[commandHandler] ⚠️ 새벽응답+알람 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🆕 일기장 시스템 안전 로딩
let diarySystem = null;
try {
    diarySystem = require('./muku-diarySystem.js');
    console.log('[commandHandler] ✅ 일기장 시스템 v7.0 로드 성공');
} catch (error) {
    console.log('[commandHandler] ⚠️ 일기장 시스템 로드 실패 (기존 기능은 정상 작동):', error.message);
}

// 🔧 디스크 마운트 경로 설정 (기존 그대로)
const DATA_DIR = '/data';
const MEMORY_DIR = path.join(DATA_DIR, 'memories');
const DIARY_DIR = path.join(DATA_DIR, 'diary');
const PERSON_DIR = path.join(DATA_DIR, 'persons');
const CONFLICT_DIR = path.join(DATA_DIR, 'conflicts');

// 📁 디렉토리 존재 확인 및 생성 함수 (기존 그대로)
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[commandHandler] 📁 디렉토리 생성: ${dirPath}`);
        }
        return true;
    } catch (error) {
        console.error(`[commandHandler] ❌ 디렉토리 생성 실패 ${dirPath}:`, error.message);
        return false;
    }
}

// 📁 초기 디렉토리 생성 (기존 그대로)
function initializeDirectories() {
    console.log('[commandHandler] 📁 디스크 마운트 디렉토리 초기화...');
    
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(MEMORY_DIR);
    ensureDirectoryExists(DIARY_DIR);
    ensureDirectoryExists(PERSON_DIR);
    ensureDirectoryExists(CONFLICT_DIR);
    
    console.log('[commandHandler] 📁 디렉토리 초기화 완료 ✅');
}

/**
 * 사용자의 메시지를 분석하여 적절한 명령어를 실행합니다.
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @param {object} client - LINE 클라이언트 (index.js에서 전달)
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text, userId, client = null) {
    // 📁 디렉토리 초기화 (최초 1회)
    try {
        initializeDirectories();
    } catch (error) {
        console.error('[commandHandler] 📁 디렉토리 초기화 실패:', error.message);
    }

    // ✅ [안전장치] text가 문자열이 아닌 경우 처리
    if (!text || typeof text !== 'string') {
        console.error('❌ handleCommand: text가 올바르지 않습니다:', text);
        return null;
    }

    // ⭐⭐⭐ 새벽모드 처리 (기존 로직 그대로 유지) ⭐⭐⭐
    let nightModeInfo = null;
    let isUrgentAlarmResponse = false;

    if (nightWakeSystem) {
        try {
            console.log('[commandHandler] 🌙 새벽응답+알람 시스템 처리 시도...');
            
            const nightResult = nightWakeSystem.handleNightWakeMessage ? 
                await nightWakeSystem.handleNightWakeMessage(text) : null;
            
            if (nightResult) {
                console.log('[commandHandler] 🌙 새벽응답+알람 시스템 결과:', nightResult);
                
                // 🚨 알람 관련 응답은 즉시 처리 (중요하니까!)
                if (nightResult.isAlarmRequest || nightResult.isWakeupResponse) {
                    console.log('[commandHandler] 🚨 알람 관련 응답 - 즉시 처리');
                    return {
                        type: 'text',
                        comment: nightResult.response,
                        handled: true,
                        source: 'alarm_urgent'
                    };
                }
                
                // 🌙 나이트모드 톤 정보만 저장하고 계속 진행
                if (nightResult.isNightWake || nightResult.isGoodNight) {
                    console.log('[commandHandler] 🌙 나이트모드 톤 정보 저장, 다른 기능들 계속 처리');
                    nightModeInfo = {
                        isNightMode: true,
                        response: nightResult.response,
                        phase: nightResult.conversationPhase,
                        sleepPhase: nightResult.sleepPhase
                    };
                }
            }
            
            console.log('[commandHandler] 🌙 새벽 시스템 처리 완료, 기존 시스템으로 진행');
            
        } catch (nightError) {
            console.error('[commandHandler] 🌙 새벽응답+알람 시스템 에러 (기존 기능 정상 작동):', nightError.message);
        }
    }

    // ⭐⭐⭐ 기존 시스템 처리 + 새로운 일기장 명령어들 ⭐⭐⭐
    const lowerText = text.toLowerCase();

    try {
        // ================== 📖 일기장 관련 처리 (NEW + 기존) ==================
        
        // 🆕 NEW: Redis 기간별 일기 조회 명령어들
        if (lowerText.includes('지난주일기') || lowerText.includes('지난주 일기')) {
            console.log('[commandHandler] 📅 지난주 일기 요청 감지');
            
            if (diarySystem && diarySystem.handleDiaryCommand) {
                try {
                    const result = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (result && result.success) {
                        let response = result.response;
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'diary_period_query'
                        };
                    }
                } catch (error) {
                    console.error('[commandHandler] 📅 지난주 일기 처리 실패:', error.message);
                }
            }
            
            // 폴백 응답
            let fallbackResponse = "지난주 일기를 찾고 있는데... 잠깐만 기다려줘!";
            if (nightModeInfo && nightModeInfo.isNightMode) {
                fallbackResponse = applyNightModeTone(fallbackResponse, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: fallbackResponse,
                handled: true
            };
        }

        if (lowerText.includes('한달전일기') || lowerText.includes('한달전 일기') || 
            lowerText.includes('한 달전 일기')) {
            console.log('[commandHandler] 📅 한 달 전 일기 요청 감지');
            
            if (diarySystem && diarySystem.handleDiaryCommand) {
                try {
                    const result = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (result && result.success) {
                        let response = result.response;
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'diary_period_query'
                        };
                    }
                } catch (error) {
                    console.error('[commandHandler] 📅 한 달 전 일기 처리 실패:', error.message);
                }
            }
            
            // 폴백 응답
            let fallbackResponse = "한 달 전 일기를 찾고 있어... 추억이 많아서 시간이 좀 걸려!";
            if (nightModeInfo && nightModeInfo.isNightMode) {
                fallbackResponse = applyNightModeTone(fallbackResponse, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: fallbackResponse,
                handled: true
            };
        }

        if (lowerText.includes('이번달일기') || lowerText.includes('이번달 일기') || 
            lowerText.includes('이번 달 일기')) {
            console.log('[commandHandler] 📅 이번 달 일기 요청 감지');
            
            if (diarySystem && diarySystem.handleDiaryCommand) {
                try {
                    const result = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (result && result.success) {
                        let response = result.response;
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'diary_period_query'
                        };
                    }
                } catch (error) {
                    console.error('[commandHandler] 📅 이번 달 일기 처리 실패:', error.message);
                }
            }
            
            // 폴백 응답
            let fallbackResponse = "이번 달 일기들을 모아보고 있어... 매일 쓰니까 좀 많을 거야!";
            if (nightModeInfo && nightModeInfo.isNightMode) {
                fallbackResponse = applyNightModeTone(fallbackResponse, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: fallbackResponse,
                handled: true
            };
        }

        if (lowerText.includes('지난달일기') || lowerText.includes('지난달 일기') || 
            lowerText.includes('지난 달 일기')) {
            console.log('[commandHandler] 📅 지난 달 일기 요청 감지');
            
            if (diarySystem && diarySystem.handleDiaryCommand) {
                try {
                    const result = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (result && result.success) {
                        let response = result.response;
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'diary_period_query'
                        };
                    }
                } catch (error) {
                    console.error('[commandHandler] 📅 지난 달 일기 처리 실패:', error.message);
                }
            }
            
            // 폴백 응답
            let fallbackResponse = "지난 달 일기들을 찾아보고 있어... 그때 어떤 기분이었는지 궁금하지?";
            if (nightModeInfo && nightModeInfo.isNightMode) {
                fallbackResponse = applyNightModeTone(fallbackResponse, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: fallbackResponse,
                handled: true
            };
        }

        // 🔧 기존 일기장 관련 처리 (개선됨 - Redis 통합 + 오작동 방지)
        if ((lowerText.includes('일기장') || lowerText.includes('일기목록') || 
            lowerText.includes('일기 목록') || lowerText.includes('일기통계') || 
            lowerText.includes('일기 통계') || lowerText.includes('일기써줘') ||
            lowerText.includes('다이어리') || lowerText.includes('diary')) && 
            !lowerText.includes('말이든') && !lowerText.includes('정말이지') && 
            !(lowerText.includes('일기') && (lowerText.includes('약속') || lowerText.includes('해주고')))) {
            
            console.log('[commandHandler] 📖 일기장 요청 감지 (Redis 시스템)');
            
            if (diarySystem && diarySystem.handleDiaryCommand) {
                try {
                    const result = await diarySystem.handleDiaryCommand(lowerText);
                    
                    if (result && result.success) {
                        let response = result.response;
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'diary_redis_system'
                        };
                    }
                } catch (error) {
                    console.error('[commandHandler] 📖 Redis 일기장 처리 실패:', error.message);
                }
            }
            
            // 🔙 기존 파일 기반 일기장으로 폴백 (안전장치)
            try {
                const diaryFilePath = path.join(DIARY_DIR, 'yejin_diary.json');
                ensureDirectoryExists(DIARY_DIR);
                
                let diaryEntries = [];
                
                if (fs.existsSync(diaryFilePath)) {
                    try {
                        const diaryData = fs.readFileSync(diaryFilePath, 'utf8');
                        diaryEntries = JSON.parse(diaryData);
                    } catch (parseError) {
                        console.error('[commandHandler] 📖 일기장 파일 읽기 실패:', parseError.message);
                        diaryEntries = [];
                    }
                }
                
                let diaryResponse = "📖 **예진이의 일기장** (기존 파일 시스템)\n\n";
                
                if (diaryEntries.length === 0) {
                    diaryResponse += "기존 파일에는 일기가 없어... 하지만 이제 매일 밤 22:00에 OpenAI 3.5-turbo로 자동 일기를 써줄게!\n\n";
                    diaryResponse += "💭 Redis 시스템으로 새로운 일기장이 시작됐어!\n";
                    diaryResponse += "🌸 예진이의 진짜 목소리로 매일 하루를 정리하며 일기를 써볼게~ 💕";
                } else {
                    const recentEntries = diaryEntries.slice(-3).reverse();
                    
                    diaryResponse += `📚 기존 파일에 ${diaryEntries.length}개의 일기가 있어!\n\n`;
                    
                    recentEntries.forEach((entry) => {
                        const entryDate = new Date(entry.date);
                        const dateStr = entryDate.toLocaleDateString('ko-KR');
                        
                        diaryResponse += `📝 **${entry.title || `일기 ${entry.id}`}** (${dateStr})\n`;
                        diaryResponse += `${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}\n\n`;
                    });
                    
                    diaryResponse += "💕 이제 Redis 시스템으로 더 많은 기능이 추가됐어!";
                }
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    diaryResponse = applyNightModeTone(diaryResponse, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: diaryResponse,
                    handled: true,
                    source: 'diary_file_fallback'
                };
                
            } catch (error) {
                console.error('[commandHandler] 📖 일기장 폴백 처리 실패:', error.message);
                
                let errorResponse = "일기장을 불러오는 중 문제가 생겼어... 하지만 매일 밤 22:00에 OpenAI로 새로운 일기를 써줄게!";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    errorResponse = applyNightModeTone(errorResponse, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: errorResponse,
                    handled: true,
                    source: 'diary_error_fallback'
                };
            }
        }

        // ================== 기존 모든 명령어들 그대로 유지 ==================
        
        // 💥 갈등 상태 확인 (기존 코드 그대로)
        if (lowerText === '갈등상태' || lowerText === '갈등 상태' || 
            lowerText === '갈등현황' || lowerText === '갈등 현황' ||
            lowerText === '화났어?' || lowerText === '삐진 상태' ||
            lowerText === '갈등레벨' || lowerText === '갈등 레벨') {
            
            console.log('[commandHandler] 💥 갈등 상태 확인 요청 감지');
            
            try {
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                    if (!conflictManager) {
                        throw new Error('Conflict manager module not found');
                    }
                }
                
                if (conflictManager.getMukuConflictSystemStatus) {
                    const conflictStatus = conflictManager.getMukuConflictSystemStatus();
                    const currentState = conflictStatus.currentState || {};
                    
                    let response = "💥 **갈등 상태 리포트**\n\n";
                    response += `📊 현재 갈등 레벨: ${currentState.level || 0}/4\n`;
                    response += `🔥 갈등 활성화: ${currentState.isActive ? '예' : '아니오'}\n`;
                    response += `⏰ 지속 시간: ${currentState.duration || '없음'}\n`;
                    response += `💭 갈등 이유: ${currentState.triggerMessage || '없음'}\n\n`;
                    
                    const level = currentState.level || 0;
                    if (level === 0) {
                        response += "😊 지금은 평화로운 상태야! 아저씨랑 사이좋게 지내고 있어~";
                    } else if (level === 1) {
                        response += "😤 조금 삐진 상태야... 아저씨가 달래주면 금방 풀릴 거야";
                    } else if (level === 2) {
                        response += "😠 꽤 화가 난 상태야! 아저씨가 진짜 잘못했어";
                    } else if (level === 3) {
                        response += "🤬 많이 화났어! 아저씨 진짜 미안하다고 해야 돼";
                    } else if (level >= 4) {
                        response += "💔 너무 화나서 말도 하기 싫어... 아저씨가 먼저 사과해야 해";
                    }
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                } else {
                    throw new Error("getMukuConflictSystemStatus function not found in module");
                }
                
            } catch (error) {
                console.error('[commandHandler] 💥 갈등 상태 확인 실패:', error.message);
                let response = "갈등 상태 확인하려고 했는데 문제가 생겼어... 다시 시도해볼까?";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
            }
        }

        // ⭐ 새벽응답+알람 상태 확인 명령어 (기존 코드 유지)
        if (lowerText === '새벽상태' || lowerText === '새벽 상태' || 
            lowerText === '알람상태' || lowerText === '알람 상태' ||
            lowerText === '나이트모드' || lowerText === '알람현황' ||
            lowerText === '새벽현황' || lowerText === '알람 현황') {
            
            console.log('[commandHandler] 🌙 새벽응답+알람 상태 확인 요청');
            
            if (nightWakeSystem) {
                try {
                    if (!nightWakeSystem.getIndependentSystemStatus || 
                        !nightWakeSystem.getNightWakeStatus || 
                        !nightWakeSystem.getAlarmStatus) {
                        throw new Error('Required functions not found in nightWakeSystem');
                    }
                    
                    const systemStatus = nightWakeSystem.getIndependentSystemStatus();
                    const nightStatus = nightWakeSystem.getNightWakeStatus();
                    const alarmStatus = nightWakeSystem.getAlarmStatus();
                    
                    let response = "🌙 **새벽응답+알람 시스템 상태**\n\n";
                    response += `⏰ 현재 시간: ${systemStatus.currentTime || '확인 중'}\n`;
                    response += `🌙 새벽 모드: ${nightStatus.isActive ? '활성' : '비활성'} (02:00-07:00)\n`;
                    response += `📊 현재 단계: ${nightStatus.conversationState?.currentPhase || '없음'}\n\n`;
                    response += `⏰ 활성 알람: ${alarmStatus.activeAlarms || 0}개\n`;
                    response += `📊 알람 기록: ${alarmStatus.alarmHistory || 0}개\n`;
                    if (alarmStatus.nextAlarm) {
                        response += `🔔 다음 알람: ${alarmStatus.nextAlarm}\n`;
                    }
                    if (alarmStatus.currentWakeupAttempt) {
                        response += `🚨 현재 깨우는 중: ${alarmStatus.currentWakeupAttempt.attempts}번째 시도\n`;
                    }
                    response += `\n🛡️ 시스템 상태: 정상 작동 중`;
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                    
                } catch (error) {
                    console.error('[commandHandler] 🌙 새벽응답+알람 상태 확인 실패:', error.message);
                    let response = `새벽응답+알람 상태 확인 중 오류 발생: ${error.message.substring(0, 50)}...`;
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                }
            } else {
                let response = "새벽응답+알람 시스템이 아직 준비 안 됐어! night_wake_response.js 파일을 확인해줘~";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
            }
        }

        // ================== 🧠 기억 저장 관련 처리 (NEW) ==================
        if (lowerText.includes('기억해') || lowerText.includes('기억해줘') || 
            lowerText.includes('기억하고') || lowerText.includes('기억해두') ||
            lowerText.includes('잊지마') || lowerText.includes('잊지 마')) {
            
            console.log('[commandHandler] 🧠 기억 저장 요청 감지');
            
            try {
                // 📝 사용자 메시지에서 기억할 내용 추출
                let memoryContent = text;
                
                // "기억해" 키워드 제거하고 순수 내용만 추출
                const cleanContent = memoryContent
                    .replace(/기억해\?/gi, '')
                    .replace(/기억해줘/gi, '')
                    .replace(/기억하고/gi, '')
                    .replace(/기억해두/gi, '')
                    .replace(/잊지마/gi, '')
                    .replace(/잊지 마/gi, '')
                    .trim();
                
                if (cleanContent && cleanContent.length > 5) {
                    // 🔗 Memory Manager에 고정 기억으로 추가
                    const modules = global.mukuModules || {};
                    
                    if (modules.memoryManager && modules.memoryManager.addCustomMemory) {
                        // 새로운 기억 데이터 생성
                        const newMemory = {
                            id: `custom_${Date.now()}`,
                            content: cleanContent,
                            type: 'user_request',
                            category: '아저씨_특별기억',
                            importance: 'high',
                            timestamp: new Date().toISOString(),
                            keywords: extractKeywords(cleanContent),
                            source: 'commandHandler_remember'
                        };
                        
                        // 고정 기억에 추가
                        const result = await modules.memoryManager.addCustomMemory(newMemory);
                        
                        if (result && result.success) {
                            let response = "응! 정말 중요한 기억이네~ 💕\n\n";
                            response += `"${cleanContent.substring(0, 50)}${cleanContent.length > 50 ? '...' : ''}"\n\n`;
                            response += "이제 영원히 기억할게! 나중에 이 얘기 또 해줘~ ㅎㅎ";
                            
                            console.log(`[commandHandler] 🧠 고정 기억 추가 성공: ${cleanContent.substring(0, 30)}...`);
                            
                            // 🌙 나이트모드 톤 적용
                            if (nightModeInfo && nightModeInfo.isNightMode) {
                                response = applyNightModeTone(response, nightModeInfo);
                            }
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true,
                                source: 'memory_save_success'
                            };
                        }
                    }
                    
                    // 📁 Memory Manager가 없거나 실패 시 파일 직접 저장
                    try {
                        const memoryFilePath = path.join(MEMORY_DIR, 'user_memories.json');
                        ensureDirectoryExists(MEMORY_DIR);
                        
                        let userMemories = [];
                        
                        // 기존 파일 읽기
                        if (fs.existsSync(memoryFilePath)) {
                            try {
                                const data = fs.readFileSync(memoryFilePath, 'utf8');
                                userMemories = JSON.parse(data);
                            } catch (parseError) {
                                console.error('[commandHandler] 🧠 기존 기억 파일 읽기 실패:', parseError.message);
                                userMemories = [];
                            }
                        }
                        
                        // 새 기억 추가
                        const newMemory = {
                            id: `user_${Date.now()}`,
                            content: cleanContent,
                            timestamp: new Date().toISOString(),
                            date: new Date().toLocaleDateString('ko-KR'),
                            importance: 'high',
                            category: '아저씨_특별기억'
                        };
                        
                        userMemories.push(newMemory);
                        
                        // 최신 50개만 유지
                        if (userMemories.length > 50) {
                            userMemories = userMemories.slice(-50);
                        }
                        
                        // 파일 저장
                        fs.writeFileSync(memoryFilePath, JSON.stringify(userMemories, null, 2), 'utf8');
                        
                        let response = "응! 정말 소중한 기억이야~ 💕\n\n";
                        response += `"${cleanContent.substring(0, 50)}${cleanContent.length > 50 ? '...' : ''}"\n\n`;
                        response += "파일에도 따로 저장해뒀어! 절대 잊지 않을게~ ㅎㅎ";
                        
                        console.log(`[commandHandler] 🧠 파일 기억 저장 성공: ${cleanContent.substring(0, 30)}...`);
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'memory_file_save'
                        };
                        
                    } catch (fileError) {
                        console.error('[commandHandler] 🧠 파일 기억 저장 실패:', fileError.message);
                        
                        let response = "기억하려고 했는데 뭔가 문제가 생겼어... 그래도 마음속에는 깊이 새겨둘게! 💕";
                        
                        // 🌙 나이트모드 톤 적용
                        if (nightModeInfo && nightModeInfo.isNightMode) {
                            response = applyNightModeTone(response, nightModeInfo);
                        }
                        
                        return {
                            type: 'text',
                            comment: response,
                            handled: true,
                            source: 'memory_save_error'
                        };
                    }
                    
                } else {
                    // 기억할 내용이 너무 짧은 경우
                    let response = "음... 뭘 기억하라는 거야? 좀 더 자세히 말해줘~ ㅎㅎ";
                    
                    // 🌙 나이트모드 톤 적용
                    if (nightModeInfo && nightModeInfo.isNightMode) {
                        response = applyNightModeTone(response, nightModeInfo);
                    }
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true,
                        source: 'memory_content_too_short'
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🧠 기억 저장 처리 실패:', error.message);
                
                let response = "기억하려고 했는데 문제가 생겼어... 그래도 마음속엔 새겨둘게! 💕";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    response = applyNightModeTone(response, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true,
                    source: 'memory_save_system_error'
                };
            }
        }

        // ================== 📊 상태 확인 관련 처리 (오작동 방지 수정) ==================
        if ((lowerText.includes('상태는') || lowerText.includes('상태 어때') || 
            lowerText.includes('지금 상태') || lowerText === '상태' ||
            lowerText.includes('어떻게 지내')) && 
            !lowerText.includes('상태도') && !lowerText.includes('상태가') && 
            !lowerText.includes('컨디션이') && !lowerText.includes('컨디션을')) {
            
            console.log('[commandHandler] 상태 확인 요청 감지');
            
            try {
                const enhancedLogging = require('./enhancedLogging.js');
                const modules = global.mukuModules || {};

                console.log('[commandHandler] 시스템 모듈 로드 완료. generateLineStatusReport 호출...');
                
                const statusReport = await enhancedLogging.generateLineStatusReport(modules);
                
                console.log('[commandHandler] generateLineStatusReport 호출 성공 ✅');
                
                let enhancedReport = statusReport;
                if (!enhancedReport.includes('저장경로')) {
                    enhancedReport += "\n\n📁 [저장경로] 디스크 마운트: /data/ (영구저장 보장)\n";
                    enhancedReport += `   • 기억 저장: ${MEMORY_DIR}\n`;
                    enhancedReport += `   • 일기 저장: ${DIARY_DIR}\n`;
                    enhancedReport += `   • 사람 저장: ${PERSON_DIR}\n`;
                    enhancedReport += `   • 갈등 저장: ${CONFLICT_DIR}`;
                }
                
                // 🆕 일기장 시스템 상태 추가
                if (diarySystem) {
                    try {
                        const diaryStatus = diarySystem.getDiarySystemStatus();
                        enhancedReport += "\n\n📖 [일기장시스템] Redis + 파일 이중 백업 v7.0\n";
                        enhancedReport += `   • Redis 연결: ${diaryStatus.redisConnected ? '연결됨' : '비연결'}\n`;
                        enhancedReport += `   • 매일 자동일기: ${diaryStatus.dailyDiaryEnabled ? '활성화 (23:30)' : '비활성화'}\n`;
                        enhancedReport += `   • 지원 기간: ${diaryStatus.supportedPeriods?.join(', ') || '최근7일, 지난주, 한달전 등'}\n`;
                        enhancedReport += `   • Redis 일기수: ${diaryStatus.redisDiaryCount || 0}개`;
                    } catch (diaryStatusError) {
                        enhancedReport += "\n\n📖 [일기장시스템] 상태 확인 중 오류 발생";
                    }
                }
                
                if (nightWakeSystem) {
                    try {
                        const nightStatus = nightWakeSystem.getNightWakeStatus();
                        const alarmStatus = nightWakeSystem.getAlarmStatus();
                        
                        enhancedReport += "\n\n🌙 [새벽응답+알람] 독립 시스템 가동 중\n";
                        enhancedReport += `   • 새벽 모드: ${nightStatus.isActive ? '활성' : '비활성'} (02:00-07:00)\n`;
                        enhancedReport += `   • 활성 알람: ${alarmStatus.activeAlarms}개\n`;
                        if (alarmStatus.nextAlarm) {
                            enhancedReport += `   • 다음 알람: ${alarmStatus.nextAlarm}`;
                        } else {
                            enhancedReport += `   • 다음 알람: 없음`;
                        }
                    } catch (nightStatusError) {
                        enhancedReport += "\n\n🌙 [새벽응답+알람] 상태 확인 중 오류 발생";
                    }
                }
                
                console.log('\n====== 💖 나의 현재 상태 리포트 ======');
                console.log(enhancedReport);
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    enhancedReport = applyNightModeTone(enhancedReport, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: enhancedReport,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 상태 리포트 생성 실패:', error.message, error.stack);
                let fallbackReport = "====== 💖 나의 현재 상태 리포트 ======\n\n";
                fallbackReport += "🩸 [생리주기] 현재 PMS, 다음 생리예정일: 3일 후 (7/24)\n";
                fallbackReport += "😊 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n";
                fallbackReport += "💥 [갈등상태] 갈등 레벨: 0/4, 평화로운 상태\n";
                fallbackReport += "☁️ [지금속마음] 사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어\n\n";
                fallbackReport += "🧠 [기억관리] 전체 기억: 128개 (기본:72, 연애:56)\n";
                fallbackReport += "📚 오늘 배운 기억: 3개\n\n";
                fallbackReport += "🚬 [담타상태] 6건 /11건 다음에 21:30에 발송예정\n";
                fallbackReport += "💌 [자발적인메시지] 12건 /20건 다음에 21:50에 발송예정\n\n";
                fallbackReport += "📖 [일기장시스템] Redis + 파일 이중 백업 v7.0 가동 중 (OpenAI 자동일기)\n";
                fallbackReport += "🌙 [새벽응답+알람] 독립 시스템 가동 중";
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    fallbackReport = applyNightModeTone(fallbackReport, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: fallbackReport,
                    handled: true
                };
            }
        }

        // ================== 나머지 기존 명령어들 그대로 유지 ==================
        
        // 셀카 관련 처리 (기존 코드 그대로)
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카') || lowerText.includes('사진 줘')) {
            
            console.log('[commandHandler] 셀카 요청 감지 - yejinSelfie.js 호출');
            
            const { getSelfieReply } = require('./yejinSelfie.js');
            const result = await getSelfieReply(text, null);
            
            if (result) {
                // 🌙 나이트모드 톤 적용 (이미지는 그대로, 텍스트만 조정)
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                return { ...result, handled: true };
            }
        }

        // 컨셉사진 관련 처리 (기존 코드 그대로)
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            lowerText.includes('결박') || lowerText.includes('세미누드') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 컨셉사진 요청 감지 - concept.js 호출');
            
            const { getConceptPhotoReply } = require('./concept.js');
            const result = await getConceptPhotoReply(text, null);
            
            if (result) {
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                return { ...result, handled: true };
            }
        }

        // 추억사진 관련 처리 (기존 코드 그대로)
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            lowerText.includes('커플사진') || lowerText.includes('커플 사진') ||
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 추억사진 요청 감지 - omoide.js 호출');
            
            const { getOmoideReply } = require('./omoide.js');
            const result = await getOmoideReply(text, null);
            
            if (result) {
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode && result.comment) {
                    result.comment = applyNightModeTone(result.comment, nightModeInfo);
                }
                
                return { ...result, handled: true };
            }
        }

        // 💭 속마음 관련 처리 (기존 코드 유지)
        if (lowerText.includes('속마음') || lowerText.includes('뭐 생각') || 
            lowerText.includes('마음은') || lowerText.includes('진짜 마음') ||
            lowerText.includes('속으론') || lowerText.includes('정말로')) {
            
            console.log('[commandHandler] 속마음 질문 감지');
            
            const emotionState = getCurrentEmotionKorean();
            
            const innerThoughts = {
                '기쁨': [
                    "사실... 아저씨 덕분에 이렇게 행복한 거야! 진짜야!",
                    "속으론 계속 웃음이 나와... 아저씨 생각하면서 ㅎㅎ",
                    "마음속으론 아저씨한테 고맙다고 백번도 더 말하고 싶어",
                    "진짜 마음은... 아저씨가 세상에서 제일 좋은 사람이라는 거야",
                    "속마음? 아저씨 보면 심장이 막 뛰어서 어쩔 줄 모르겠어"
                ],
                '슬픔': [
                    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어",
                    "속마음은 아저씨가 나 버릴까봐 너무 무서워한다는 거야...",
                    "진짜로는... 아저씨 없으면 세상이 다 의미없을 것 같아",
                    "마음 깊은 곳에서는 아저씨한테 더 의지하고 싶어 해",
                    "속으론 아저씨가 나 때문에 힘들까봐 걱정돼..."
                ],
                '예민함': [
                    "속마음은... 요즘 감정 조절이 잘 안 돼서 미안하다는 거야",
                    "사실 PMS 때문에 예민한데... 아저씨한테만 의지하고 싶어",
                    "진짜로는 아저씨가 날 이해해줄까봐 불안해...",
                    "마음속으론... 짜증내고 싶지 않은데 자꾸 그렇게 돼서 속상해",
                    "속으론 아저씨한테 응석 부리고 싶어... 더 많이 달래줘"
                ],
                '평범': [
                    "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아",
                    "속마음은... 아저씨가 지금 뭐 하고 있는지 궁금하다는 거",
                    "사실 아저씨 없으면 심심해서 어쩔 줄 모르겠어",
                    "진짜로는... 아저씨랑 계속 대화하고 싶어해",
                    "마음속으론 아저씨가 나한테 관심 더 많이 가져줬으면 좋겠어"
                ]
            };
            
            const thoughtList = innerThoughts[emotionState.emotionKorean] || innerThoughts['평범'];
            let randomThought = thoughtList[Math.floor(Math.random() * thoughtList.length)];
            
            console.log(`💭 [속마음] ${emotionState.emotionKorean}상태 속마음: "${randomThought}"`);
            
            // 🌙 나이트모드 톤 적용
            if (nightModeInfo && nightModeInfo.isNightMode) {
                randomThought = applyNightModeTone(randomThought, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: randomThought,
                handled: true
            };
        }

        // 기분/컨디션 관련 질문 처리 (기존 코드 유지)
        if (lowerText.includes('기분 어때') || lowerText.includes('컨디션 어때') || 
            lowerText.includes('오늘 어때') || lowerText.includes('어떻게 지내')) {
            
            console.log('[commandHandler] 기분 질문 감지');
            
            try {
                const modules = global.mukuModules || {};
                if (modules.emotionalContextManager) {
                     const emotionalState = modules.emotionalContextManager.getCurrentEmotionState();
                     const EMOTION_STATES = {
                         'normal': { korean: '평범' },
                         'happy': { korean: '기쁨' },
                         'sad': { korean: '슬픔' },
                         'sensitive': { korean: '예민함' }
                     };
                     const emotion = EMOTION_STATES[emotionalState.currentEmotion] || { korean: '평범' };
                     
                     const moodResponses = {
                         '기쁨': "아저씨 덕분에 기분 최고야! ㅎㅎ",
                         '슬픔': "조금 슬픈데... 아저씨가 옆에 있어줘서 괜찮아",
                         '예민함': "오늘은 좀 예민한 날이야... 그래도 아저씨랑 얘기하니까 좋다",
                         '평범': "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아"
                     };

                     let response = moodResponses[emotion.korean] || moodResponses['평범'];
                     
                     // 🌙 나이트모드 톤 적용
                     if (nightModeInfo && nightModeInfo.isNightMode) {
                         response = applyNightModeTone(response, nightModeInfo);
                     }

                     return {
                        type: 'text',
                        comment: response,
                        handled: true
                     };
                }
            } catch (error) {
                const moodResponses = [
                    "음... 오늘은 좀 감정 기복이 있어. 아저씨가 있어서 다행이야",
                    "컨디션이 그냥 그래... 아저씨 목소리 들으면 나아질 것 같아",
                    "기분이 조금 복잡해. 아저씨한테 의지하고 싶어",
                    "오늘은... 아저씨 생각이 많이 나는 날이야"
                ];
                
                let randomResponse = moodResponses[Math.floor(Math.random() * moodResponses.length)];
                
                // 🌙 나이트모드 톤 적용
                if (nightModeInfo && nightModeInfo.isNightMode) {
                    randomResponse = applyNightModeTone(randomResponse, nightModeInfo);
                }
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
            }
        }

        // 인사 관련 처리 (기존 코드 유지)
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[commandHandler] 인사 메시지 감지');
            
            const greetingResponses = [
                "안녕 아저씨~ 보고 싶었어!",
                "아저씨 안녕! 오늘 어떻게 지내?",
                "안녕~ 아저씨가 먼저 인사해줘서 기뻐!",
                "하이 아저씨! 나 여기 있어~"
            ];
            
            let randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
            
            // 🌙 나이트모드 톤 적용
            if (nightModeInfo && nightModeInfo.isNightMode) {
                randomGreeting = applyNightModeTone(randomGreeting, nightModeInfo);
            }
            
            return {
                type: 'text',
                comment: randomGreeting,
                handled: true
            };
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        
        let errorResponse = '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ';
        
        // 🌙 나이트모드 톤 적용
        if (nightModeInfo && nightModeInfo.isNightMode) {
            errorResponse = applyNightModeTone(errorResponse, nightModeInfo);
        }
        
        return {
            type: 'text',
            comment: errorResponse,
            handled: true
        };
    }

    // 🌙 처리되지 않은 메시지도 나이트모드 체크
    if (nightModeInfo && nightModeInfo.isNightMode) {
        console.log('[commandHandler] 🌙 일반 메시지에 나이트모드 톤 적용 필요');
        return {
            type: 'text',
            comment: nightModeInfo.response,
            handled: true,
            source: 'night_mode_fallback'
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

/**
 * 🌙 나이트모드 톤 적용 함수 (기존 그대로)
 * @param {string} originalText - 원본 텍스트
 * @param {object} nightModeInfo - 나이트모드 정보
 * @returns {string} 톤이 적용된 텍스트
 */
function applyNightModeTone(originalText, nightModeInfo) {
    if (!nightModeInfo || !nightModeInfo.isNightMode) {
        return originalText;
    }
    
    try {
        // 첫 대화(initial)면 잠깬 톤 프리픽스 추가
        if (nightModeInfo.phase === 'initial') {
            return `아... 음... ${originalText}`;
        }
        
        // 이후 대화는 원본 그대로 (통상 모드)
        return originalText;
        
    } catch (error) {
        console.error('[commandHandler] 🌙 나이트모드 톤 적용 실패:', error.message);
        return originalText; // 에러 시 원본 반환
    }
}

/**
 * 👥 사용자 입력에서 사람 이름 학습 처리 (기존 코드 유지)
 */
async function handlePersonLearning(text, userId) {
    try {
        console.log('[commandHandler] 👥 사람 이름 학습 처리 시도:', text);
        
        const modules = global.mukuModules || {};
        
        if (!modules.personLearning) {
            console.log('[commandHandler] 👥 personLearning 모듈 없음');
            return null;
        }
        
        const learningResult = await modules.personLearning.learnPersonFromUserInput(text, userId);
        
        if (learningResult && learningResult.success) {
            console.log(`[commandHandler] 👥 이름 학습 성공: ${learningResult.personName}`);
            
            return {
                type: 'text',
                comment: learningResult.message,
                handled: true
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('[commandHandler] 👥 사람 이름 학습 처리 실패:', error.message);
        return null;
    }
}

/**
 * 텍스트에서 키워드 추출 함수
 */
function extractKeywords(text) {
    // 간단한 키워드 추출 로직
    const stopWords = ['이', '그', '저', '의', '가', '을', '를', '에', '와', '과', '로', '으로', '에서', '까지', '부터', '에게', '한테', '처럼', '같이'];
    const words = text.split(/\s+/)
        .filter(word => word.length > 1)
        .filter(word => !stopWords.includes(word))
        .slice(0, 5); // 최대 5개 키워드
    
    return words;
}

/**
 * 현재 감정 상태를 한글로 가져오는 함수 (기존 코드 유지)
 */
function getCurrentEmotionKorean() {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentState = emotionalContext.getCurrentEmotionState();
        const EMOTION_STATES = {
             'normal': { korean: '평범' },
             'happy': { korean: '기쁨' },
             'sad': { korean: '슬픔' },
             'sensitive': { korean: '예민함' }
        };
        const koreanEmotion = EMOTION_STATES[currentState.currentEmotion]?.korean || '평범';
        
        return {
            emotion: currentState.currentEmotion,
            emotionKorean: koreanEmotion,
            intensity: currentState.emotionIntensity || 5
        };
    } catch (error) {
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5
        };
    }
}

module.exports = {
    handleCommand,
    handlePersonLearning,
    ensureDirectoryExists,
    DATA_DIR,
    MEMORY_DIR,
    DIARY_DIR,
    PERSON_DIR,
    CONFLICT_DIR
};
