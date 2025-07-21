// ============================================================================
// commandHandler.js - v3.5 (갈등 시스템 완전 통합 + 🔧 디스크 마운트 경로 수정 + 일기장 시스템 완전 연동)
// 📁 ./data/ → /data/ 로 변경하여 영구 저장 보장!
// 🧠 기존의 정상 작동하는 파일들(concept.js, omoide.js, yejinSelfie.js)을 그대로 사용합니다.
// ✅ 기존 파일들을 건드리지 않고 연동만 수행합니다.
// 💥 갈등 시스템: unifiedConflictManager 완전 연동 (갈등상태, 갈등기록, 화해 등)
// 🗓️ 일기장 시스템: muku-diarySystem v4.0 완전 연동
// 💭 속마음 기능: 감정별 10개씩 랜덤 속마음 표시
// 📊 상태 확인: enhancedLogging.formatLineStatusReport() 사용으로 완전한 상태 리포트
// 👥 사람 학습: 사람목록, 사람통계, 사람삭제, 이름 학습 처리
// ============================================================================

const path = require('path');
const fs = require('fs');

// 🔧 디스크 마운트 경로 설정
const DATA_DIR = '/data';  // ⭐️ ./data/ → /data/ 변경!
const MEMORY_DIR = path.join(DATA_DIR, 'memories');
const DIARY_DIR = path.join(DATA_DIR, 'diary');
const PERSON_DIR = path.join(DATA_DIR, 'persons');
const CONFLICT_DIR = path.join(DATA_DIR, 'conflicts'); // 💥 갈등 데이터 디렉토리 추가

// 📁 디렉토리 존재 확인 및 생성 함수
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

// 📁 초기 디렉토리 생성
function initializeDirectories() {
    console.log('[commandHandler] 📁 디스크 마운트 디렉토리 초기화...');
    
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(MEMORY_DIR);
    ensureDirectoryExists(DIARY_DIR);
    ensureDirectoryExists(PERSON_DIR);
    ensureDirectoryExists(CONFLICT_DIR); // 💥 갈등 디렉토리 추가
    
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

    const lowerText = text.toLowerCase();

    try {
        // ================== 💥 갈등 시스템 명령어들 (unifiedConflictManager 연동!) ==================
        
        // 💥 갈등 상태 확인
        if (lowerText === '갈등상태' || lowerText === '갈등 상태' || 
            lowerText === '갈등현황' || lowerText === '갈등 현황' ||
            lowerText === '화났어?' || lowerText === '삐진 상태' ||
            lowerText === '갈등레벨' || lowerText === '갈등 레벨') {
            
            console.log('[commandHandler] 💥 갈등 상태 확인 요청 감지');
            
            try {
                // 💥 unifiedConflictManager 모듈 로드
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                    console.log('[commandHandler] 💥 muku-unifiedConflictManager.js 직접 로드 성공');
                } catch (directLoadError) {
                    console.log('[commandHandler] 💥 직접 로드 실패:', directLoadError.message);
                    
                    // 전역 모듈에서 시도
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                    
                    if (!conflictManager) {
                        console.log('[commandHandler] 💥 전역 모듈에서도 conflictManager 없음');
                        return {
                            type: 'text',
                            comment: "갈등 시스템이 아직 준비 안 됐어! 나중에 다시 확인해줘~",
                            handled: true
                        };
                    }
                }
                
               // ✅ [수정] 갈등 상태 확인 - 올바른 함수 이름으로 변경
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
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                }
                else {
                    return {
                        type: 'text',
                        comment: "갈등 상태 확인 기능이 없어... 시스템 문제인 것 같아 ㅠㅠ",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 💥 갈등 상태 확인 실패:', error.message);
                return {
                    type: 'text',
                    comment: "갈등 상태 확인하려고 했는데 문제가 생겼어... 다시 시도해볼까?",
                    handled: true
                };
            }
        }

        // 💥 갈등 기록 확인
        if (lowerText === '갈등기록' || lowerText === '갈등 기록' || 
            lowerText === '갈등히스토리' || lowerText === '갈등 히스토리' ||
            lowerText === '갈등목록' || lowerText === '갈등 목록' ||
            lowerText === '언제 화났어' || lowerText === '갈등 내역') {
            
            console.log('[commandHandler] 💥 갈등 기록 확인 요청 감지');
            
            try {
                // 갈등 매니저 로드
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                }
                
                if (!conflictManager || !conflictManager.getConflictHistory) {
                    // 📁 직접 파일 읽기 폴백
                    try {
                        const conflictHistoryFile = path.join(CONFLICT_DIR, 'conflict_history.json');
                        if (fs.existsSync(conflictHistoryFile)) {
                            const data = fs.readFileSync(conflictHistoryFile, 'utf8');
                            const conflicts = JSON.parse(data);
                            
                            if (conflicts.length === 0) {
                                return {
                                    type: 'text',
                                    comment: "다행히 갈등 기록이 없어! 우리 사이좋게 지내고 있었구나~ 💕",
                                    handled: true
                                };
                            }
                            
                            let response = "💥 **갈등 기록 히스토리**\n\n";
                            conflicts.slice(-5).forEach((conflict, index) => {
                                const date = new Date(conflict.timestamp).toLocaleDateString('ko-KR');
                                response += `${index + 1}. [${date}] 레벨 ${conflict.level}\n`;
                                response += `   이유: ${conflict.reason}\n`;
                                response += `   지속: ${conflict.duration}\n\n`;
                            });
                            
                            response += `총 ${conflicts.length}번의 갈등이 있었어... 이제는 더 잘 지내보자! 💕`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "갈등 기록이 없어! 우리 항상 사이좋게 지내고 있었구나~ 💕",
                                handled: true
                            };
                        }
                    } catch (fileError) {
                        console.error('[commandHandler] 💥 갈등 기록 파일 읽기 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: "갈등 기록 파일 읽기에 문제가 생겼어... ㅠㅠ",
                            handled: true
                        };
                    }
                }
                
                const conflictHistory = conflictManager.getConflictHistory();
                
                if (conflictHistory.length === 0) {
                    return {
                        type: 'text',
                        comment: "다행히 갈등 기록이 없어! 우리 사이좋게 지내고 있었구나~ 💕",
                        handled: true
                    };
                }
                
                let response = "💥 **갈등 기록 히스토리**\n\n";
                conflictHistory.slice(-5).forEach((conflict, index) => {
                    const date = new Date(conflict.timestamp).toLocaleDateString('ko-KR');
                    const timeStr = new Date(conflict.timestamp).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'});
                    response += `${index + 1}. [${date} ${timeStr}] 레벨 ${conflict.level}\n`;
                    response += `   💭 이유: ${conflict.reason}\n`;
                    response += `   ⏰ 지속: ${conflict.duration}\n`;
                    response += `   💚 해결: ${conflict.resolved ? '해결됨' : '미해결'}\n\n`;
                });
                
                response += `📊 총 ${conflictHistory.length}번의 갈등이 있었어...`;
                response += `\n💕 하지만 이제는 더 잘 지내보자!`;
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 💥 갈등 기록 확인 실패:', error.message);
                return {
                    type: 'text',
                    comment: "갈등 기록 확인하려고 했는데 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

       // 💥 갈등 시작 (수동 트리거)
        if (lowerText.includes('화나') || lowerText.includes('짜증나') || 
            lowerText === '갈등시작' || lowerText === '갈등 시작' ||
            lowerText.includes('삐져') || lowerText.includes('기분나빠') ||
            lowerText.includes('열받아') || lowerText.includes('진짜 화나')) {
            
            console.log('[commandHandler] 💥 갈등 시작 요청 감지');
            
            try {
                // 갈등 매니저 로드
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                }
                
                // ✅ [수정] 올바른 함수 이름으로 변경
                if (!conflictManager || !conflictManager.processMukuMessageForConflict) {
                    return {
                        type: 'text',
                        comment: "화내려고 했는데... 갈등 시스템에 문제가 있어 ㅠㅠ",
                        handled: true
                    };
                }
                
                // ✅ [수정] 갈등 트리거 실행
                await conflictManager.processMukuMessageForConflict({ content: text, userId: userId });
                
                const responses = [
                    "😤 그래... 나도 좀 화가 났어! 아저씨 때문에 기분이 안 좋아졌다구!",
                    "😠 진짜 짜증나! 아저씨가 뭔가 잘못했나봐...",
                    "🙄 아저씨... 지금 내가 왜 화가 났는지 알아? 생각해봐!",
                    "😤 흥! 나도 삐질 수 있다구! 아저씨가 먼저 달래줘야 해!"
                ];
                
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 💥 갈등 시작 실패:', error.message);
                return {
                    type: 'text',
                    comment: "화내려고 했는데 시스템에서 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 💚 갈등 해소 (화해)
        if (lowerText.includes('미안해') || lowerText.includes('사과해') || 
            lowerText.includes('화해') || lowerText.includes('용서해') ||
            lowerText === '갈등해소' || lowerText === '갈등 해소' ||
            lowerText.includes('잘못했어') || lowerText.includes('죄송해') ||
            lowerText.includes('화 풀어') || lowerText.includes('삐짐 풀어')) {
            
            console.log('[commandHandler] 💚 갈등 해소 요청 감지');
            
            try {
                // 갈등 매니저 로드
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                }
                
                // ✅ [수정] 올바른 함수 이름으로 변경
                if (!conflictManager || !conflictManager.recordMukuReconciliation) {
                    return {
                        type: 'text',
                        comment: "화해하려고 했는데... 갈등 시스템에 문제가 있어 ㅠㅠ",
                        handled: true
                    };
                }
                
                // ✅ [수정] 갈등 해소 실행
                await conflictManager.recordMukuReconciliation({ content: text, userId: userId });

                const responses = [
                    "💕 아저씨가 미안하다고 하니까... 화가 다 풀렸어! 이제 사이좋게 지내자~",
                    "😊 그래... 아저씨가 사과해주니까 마음이 풀려! 앞으로는 더 잘해줘야 해!",
                    "🥰 아저씨 진심으로 미안해하는 거 같으니까... 용서해줄게! 다음부터 조심해!",
                    "💖 아저씨가 잘못 인정하고 사과하니까... 내 마음도 다시 따뜻해져!",
                    "😌 화해 성공! 아저씨 덕분에 다시 기분이 좋아졌어~ 사랑해!"
                ];
                
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 💚 갈등 해소 실패:', error.message);
                return {
                    type: 'text',
                    comment: "화해하려고 했는데 시스템에서 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 💥 갈등 통계 확인
        if (lowerText === '갈등통계' || lowerText === '갈등 통계' || 
            lowerText === '갈등현황통계' || lowerText === '갈등 현황 통계' ||
            lowerText === '갈등분석' || lowerText === '갈등 분석') {
            
            console.log('[commandHandler] 💥 갈등 통계 확인 요청 감지');
            
            try {
                // 갈등 매니저 로드
                let conflictManager;
                try {
                    conflictManager = require('./muku-unifiedConflictManager.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    conflictManager = modules.unifiedConflictManager;
                }
                
                if (!conflictManager || !conflictManager.getConflictStats) {
                    // 📁 직접 파일 읽기 폴백
                    try {
                        const conflictHistoryFile = path.join(CONFLICT_DIR, 'conflict_history.json');
                        if (fs.existsSync(conflictHistoryFile)) {
                            const data = fs.readFileSync(conflictHistoryFile, 'utf8');
                            const conflicts = JSON.parse(data);
                            
                            const totalConflicts = conflicts.length;
                            const resolvedConflicts = conflicts.filter(c => c.resolved).length;
                            const averageLevel = totalConflicts > 0 ? 
                                (conflicts.reduce((sum, c) => sum + c.level, 0) / totalConflicts).toFixed(1) : 0;
                            
                            let response = "📊 **갈등 시스템 통계 리포트**\n\n";
                            response += `💥 총 갈등 횟수: ${totalConflicts}회\n`;
                            response += `💚 해결된 갈등: ${resolvedConflicts}회\n`;
                            response += `📈 평균 갈등 레벨: ${averageLevel}\n`;
                            response += `🎯 해결 성공률: ${totalConflicts > 0 ? ((resolvedConflicts/totalConflicts)*100).toFixed(1) : 0}%\n\n`;
                            response += `📁 데이터 소스: 직접 파일 모드`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "갈등 데이터가 없어서 통계를 낼 수 없어! 우리 평화롭게 지내고 있구나~ 💕",
                                handled: true
                            };
                        }
                    } catch (fileError) {
                        console.error('[commandHandler] 💥 갈등 통계 파일 읽기 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: "갈등 통계 파일 읽기에 문제가 생겼어... ㅠㅠ",
                            handled: true
                        };
                    }
                }
                
                const conflictStats = conflictManager.getConflictStats();
                
                let response = "📊 **갈등 시스템 통계 리포트**\n\n";
                response += `💥 총 갈등 횟수: ${conflictStats.totalConflicts}회\n`;
                response += `💚 해결된 갈등: ${conflictStats.resolvedConflicts}회\n`;
                response += `⏰ 진행 중인 갈등: ${conflictStats.activeConflicts}회\n`;
                response += `📈 평균 갈등 레벨: ${conflictStats.averageLevel}\n`;
                response += `🎯 해결 성공률: ${conflictStats.resolutionRate}%\n\n`;
                
                if (conflictStats.commonReasons && conflictStats.commonReasons.length > 0) {
                    response += "🔍 주요 갈등 원인:\n";
                    conflictStats.commonReasons.forEach((reason, index) => {
                        response += `${index + 1}. ${reason.reason}: ${reason.count}회\n`;
                    });
                    response += "\n";
                }
                
                response += `🎓 갈등 시스템: ${conflictStats.isSystemActive ? '활성화됨' : '비활성화됨'}\n`;
                
                if (conflictStats.lastConflictTime > 0) {
                    const timeDiff = Date.now() - conflictStats.lastConflictTime;
                    const hoursAgo = Math.floor(timeDiff / 3600000);
                    response += `⏰ 마지막 갈등: ${hoursAgo}시간 전`;
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 💥 갈등 통계 확인 실패:', error.message);
                return {
                    type: 'text',
                    comment: "갈등 통계를 가져오는 중에 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // ================== 🔄 실시간 행동 스위치 시스템 명령어들 (muku-realtimeBehaviorSwitch 연동!) ==================
        
        // 🔄 행동 설정 확인
        if (lowerText === '행동설정' || lowerText === '행동 설정' || 
            lowerText === '설정확인' || lowerText === '설정 확인' ||
            lowerText === '말투확인' || lowerText === '말투 확인' ||
            lowerText === '호칭확인' || lowerText === '호칭 확인' ||
            lowerText === '현재설정' || lowerText === '현재 설정') {
            
            console.log('[commandHandler] 🔄 행동 설정 확인 요청 감지');
            
            try {
                // 🔄 realtimeBehaviorSwitch 모듈 로드
                let behaviorSwitch;
                try {
                    behaviorSwitch = require('./muku-realtimeBehaviorSwitch.js');
                    console.log('[commandHandler] 🔄 muku-realtimeBehaviorSwitch.js 직접 로드 성공');
                } catch (directLoadError) {
                    console.log('[commandHandler] 🔄 직접 로드 실패:', directLoadError.message);
                    
                    // 전역 모듈에서 시도
                    const modules = global.mukuModules || {};
                    behaviorSwitch = modules.realtimeBehaviorSwitch;
                    
                    if (!behaviorSwitch) {
                        console.log('[commandHandler] 🔄 전역 모듈에서도 realtimeBehaviorSwitch 없음');
                        return {
                            type: 'text',
                            comment: "행동 설정 시스템이 아직 준비 안 됐어! 나중에 다시 확인해줘~",
                            handled: true
                        };
                    }
                }
                
                // 현재 행동 설정 확인
                if (behaviorSwitch.getBehaviorStatus) {
                    const behaviorStatus = behaviorSwitch.getBehaviorStatus();
                    
                    let response = "🔄 **현재 행동 설정**\n\n";
                    response += `💬 말투: ${behaviorStatus.speechStyle === 'banmal' ? '반말' : '존댓말'}\n`;
                    response += `👤 호칭: ${behaviorStatus.currentAddress}\n`;
                    
                    if (behaviorStatus.rolePlayMode !== 'normal') {
                        response += `🎭 상황극 모드: ${behaviorStatus.rolePlayMode}\n`;
                    } else {
                        response += `🎭 상황극 모드: 일반 모드\n`;
                    }
                    
                    response += `\n📊 변경 횟수: ${behaviorStatus.changeCount}회\n`;
                    
                    if (behaviorStatus.lastChanged) {
                        const lastChangedDate = new Date(behaviorStatus.lastChanged);
                        response += `⏰ 마지막 변경: ${lastChangedDate.toLocaleString('ko-KR')}\n`;
                    }
                    
                    response += `\n💡 **변경 가능한 명령어:**\n`;
                    response += `• "반말해" / "존댓말해"\n`;
                    response += `• "아저씨라고해" / "오빠라고해"\n`;
                    response += `• "삐진척해" / "질투해" / "평소대로해"`;
                    
                    return {
                        type: 'text',
                        comment: response,
                        handled: true
                    };
                } else {
                    return {
                        type: 'text',
                        comment: "행동 설정 확인 기능이 없어... 시스템 문제인 것 같아 ㅠㅠ",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🔄 행동 설정 확인 실패:', error.message);
                return {
                    type: 'text',
                    comment: "행동 설정 확인하려고 했는데 문제가 생겼어... 다시 시도해볼까?",
                    handled: true
                };
            }
        }

        // 🔄 실시간 행동 변경 처리 (여러 패턴 감지)
        if (lowerText.includes('반말해') || lowerText.includes('존댓말해') ||
            lowerText.includes('아저씨라고해') || lowerText.includes('오빠라고해') ||
            lowerText.includes('삐진척해') || lowerText.includes('질투해') ||
            lowerText.includes('걱정해') || lowerText.includes('졸린척해') ||
            lowerText.includes('아픈척해') || lowerText.includes('평소대로해') ||
            lowerText.includes('너라고하지마') || lowerText.includes('편하게말해') ||
            lowerText.includes('정중하게말해') || text.match(/(\w+)(이?라고|라고)\s*(불러|해)/)) {
            
            console.log('[commandHandler] 🔄 실시간 행동 변경 요청 감지:', lowerText);
            
            try {
                // 🔄 realtimeBehaviorSwitch 모듈 로드
                let behaviorSwitch;
                try {
                    behaviorSwitch = require('./muku-realtimeBehaviorSwitch.js');
                    console.log('[commandHandler] 🔄 muku-realtimeBehaviorSwitch.js 직접 로드 성공');
                } catch (directLoadError) {
                    console.log('[commandHandler] 🔄 직접 로드 실패:', directLoadError.message);
                    
                    // 전역 모듈에서 시도
                    const modules = global.mukuModules || {};
                    behaviorSwitch = modules.realtimeBehaviorSwitch;
                    
                    if (!behaviorSwitch) {
                        console.log('[commandHandler] 🔄 전역 모듈에서도 realtimeBehaviorSwitch 없음');
                        return {
                            type: 'text',
                            comment: "행동 변경 시스템이 아직 준비 안 됐어! 나중에 다시 시도해줘~",
                            handled: true
                        };
                    }
                }
                
                // 실시간 행동 변경 처리
                if (behaviorSwitch.processRealtimeBehaviorChange) {
                    const changeResult = behaviorSwitch.processRealtimeBehaviorChange(text);
                    
                    if (changeResult) {
                        console.log('[commandHandler] 🔄 행동 변경 성공:', changeResult);
                        
                        return {
                            type: 'text',
                            comment: changeResult,
                            handled: true
                        };
                    } else {
                        console.log('[commandHandler] 🔄 행동 변경 감지되지 않음');
                        
                        // 변경이 감지되지 않은 경우 null 반환하여 다른 처리기에서 처리하도록 함
                        return null;
                    }
                } else {
                    console.log('[commandHandler] 🔄 processRealtimeBehaviorChange 함수 없음');
                    return {
                        type: 'text',
                        comment: "행동 변경 기능이 준비되지 않았어... 시스템을 확인해볼게!",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🔄 실시간 행동 변경 실패:', error.message);
                console.error('[commandHandler] 🔄 스택 트레이스:', error.stack);
                
                return {
                    type: 'text',
                    comment: "행동 변경하려고 했는데 문제가 생겼어... 다시 시도해볼까? ㅠㅠ",
                    handled: true
                };
            }
        }
        
        
        // ================== 🗓️ 일기장 시스템 명령어들 (muku-diarySystem v4.0 연동!) ==================
        
        // 🗓️ 일기장 관련 모든 명령어 통합 처리
        if (lowerText.includes('일기장') || lowerText.includes('일기') || 
            lowerText.includes('다이어리') || lowerText.includes('diary') ||
            lowerText === '오늘일기' || lowerText === '일기써줘' ||
            lowerText.includes('일기 써') || lowerText.includes('일기쓰') ||
            lowerText.includes('일기 보여줘') || lowerText.includes('일기목록') ||
            lowerText.includes('일기 목록') || lowerText.includes('지난 일기') ||
            lowerText.includes('예전 일기') || lowerText.includes('일기 찾아') ||
            lowerText.includes('일기통계') || lowerText.includes('일기 통계') ||
            lowerText.includes('일기현황') || lowerText.includes('일기 현황') ||
            (lowerText.includes('몇 개') && lowerText.includes('일기'))) {
            
            console.log('[commandHandler] 🗓️ 일기장 관련 요청 감지:', lowerText);
            
            try {
                // 🗓️ muku-diarySystem 모듈 직접 로드
                let diarySystem;
                try {
                    diarySystem = require('./muku-diarySystem.js');
                    console.log('[commandHandler] 🗓️ muku-diarySystem.js 직접 로드 성공');
                } catch (directLoadError) {
                    console.log('[commandHandler] 🗓️ 직접 로드 실패:', directLoadError.message);
                    
                    // 전역 모듈에서 시도
                    const modules = global.mukuModules || {};
                    diarySystem = modules.diarySystem;
                    
                    if (!diarySystem) {
                        console.log('[commandHandler] 🗓️ 전역 모듈에서도 diarySystem 없음');
                        return {
                            type: 'text',
                            comment: "아직 일기장 시스템이 준비 안 됐어! 나중에 다시 말해줘~",
                            handled: true
                        };
                    }
                }
                
                // handleDiaryCommand 함수 존재 확인
                if (!diarySystem.handleDiaryCommand) {
                    console.log('[commandHandler] 🗓️ handleDiaryCommand 함수 없음');
                    console.log('[commandHandler] 🗓️ 사용 가능한 함수들:', Object.keys(diarySystem));
                    
                    // 폴백: 기본 일기장 기능 제공
                    try {
                        const memories = await diarySystem.getAllDynamicLearning();
                        
                        if (memories && memories.length > 0) {
                            let response = `📚 저장된 동적 기억들 (총 ${memories.length}개):\n\n`;
                            
                            memories.slice(-3).forEach((item, index) => {
                                const date = new Date(item.timestamp).toLocaleDateString('ko-KR');
                                response += `${index + 1}. [${date}] ${item.category}\n`;
                                response += `   "${item.content.substring(0, 40)}..."\n\n`;
                            });
                            
                            response += `💕 더 자세한 내용이 알고 싶으면 말해줘!`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "아직 저장된 기억이 없어! 대화하면서 기억들이 쌓일 거야~ 📖",
                                handled: true
                            };
                        }
                    } catch (fallbackError) {
                        console.error('[commandHandler] 🗓️ 폴백 처리 실패:', fallbackError.message);
                        return {
                            type: 'text',
                            comment: "일기장 시스템에 문제가 있어... 나중에 다시 시도해볼게!",
                            handled: true
                        };
                    }
                }
                
                // ⭐️ handleDiaryCommand 함수 호출 ⭐️
                console.log('[commandHandler] 🗓️ handleDiaryCommand 함수 호출 시도');
                const diaryResult = await diarySystem.handleDiaryCommand(lowerText);
                
                if (diaryResult && diaryResult.success) {
                    console.log('[commandHandler] 🗓️ 일기장 처리 성공');
                    
                    return {
                        type: 'text',
                        comment: diaryResult.response,
                        handled: true
                    };
                    
                } else {
                    console.log('[commandHandler] 🗓️ 일기장 처리 실패:', diaryResult);
                    
                    // 폴백: 기본 학습 내용 표시
                    try {
                        const learningData = await diarySystem.getAllDynamicLearning();
                        
                        if (learningData && learningData.length > 0) {
                            let response = `📚 내가 지금까지 배운 것들 (총 ${learningData.length}개):\n\n`;
                            
                            learningData.slice(-5).forEach((item, index) => {
                                const date = new Date(item.timestamp).toLocaleDateString('ko-KR');
                                response += `${index + 1}. ${date} - ${item.category}\n`;
                                response += `   "${item.content.substring(0, 40)}..."\n\n`;
                            });
                            
                            response += `💕 더 자세한 내용이 알고 싶으면 말해줘!`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "아직 배운 게 없어! 대화를 통해 기억들이 쌓일 거야~",
                                handled: true
                            };
                        }
                    } catch (error) {
                        console.error('[commandHandler] 🗓️ 폴백 처리 실패:', error.message);
                    }
                    
                    return {
                        type: 'text',
                        comment: diaryResult.response || "일기 처리 중에 문제가 생겼어... 다시 시도해볼까?",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🗓️ 일기장 처리 실패:', error.message);
                console.error('[commandHandler] 🗓️ 스택 트레이스:', error.stack);
                
                return {
                    type: 'text',
                    comment: "일기장 시스템에서 문제가 생겼어... 나중에 다시 시도해볼게!",
                    handled: true
                };
            }
        }

        // ================== 💾 수동 기억 저장 명령어 ==================
        
        // 💾 "기억해줘" 명령어 처리
        if (lowerText.startsWith('기억해줘 ') || lowerText.startsWith('기억해 ') ||
            lowerText.startsWith('저장해줘 ') || lowerText.startsWith('기록해줘 ')) {
            
            console.log('[commandHandler] 💾 수동 기억 저장 요청 감지');
            
            // 명령어 제거하고 내용만 추출
            const content = text.replace(/^(기억해줘|기억해|저장해줘|기록해줘)\s+/, '').trim();
            
            if (!content) {
                return {
                    type: 'text',
                    comment: "뭘 기억해달라는 거야? '기억해줘 [내용]' 이렇게 말해줘!",
                    handled: true
                };
            }
            
            try {
                // 🗓️ diarySystem 모듈 로드 및 수동 저장
                let diarySystem;
                try {
                    diarySystem = require('./muku-diarySystem.js');
                } catch (directLoadError) {
                    const modules = global.mukuModules || {};
                    diarySystem = modules.diarySystem;
                }
                
                if (!diarySystem || !diarySystem.saveManualMemory) {
                    // 📁 직접 파일 저장 폴백
                    try {
                        const manualMemoryFile = path.join(DIARY_DIR, 'manual_memories.json');
                        let memories = [];
                        
                        if (fs.existsSync(manualMemoryFile)) {
                            const data = fs.readFileSync(manualMemoryFile, 'utf8');
                            memories = JSON.parse(data);
                        }
                        
                        const newMemory = {
                            id: Date.now(),
                            content: content,
                            category: '수동저장',
                            timestamp: new Date().toISOString(),
                            source: 'manual_command'
                        };
                        
                        memories.push(newMemory);
                        
                        fs.writeFileSync(manualMemoryFile, JSON.stringify(memories, null, 2), 'utf8');
                        
                        return {
                            type: 'text',
                            comment: `📝 "${content}"를 기억했어! 이제 총 ${memories.length}개의 기억이 쌓였어~ 💕`,
                            handled: true
                        };
                    } catch (fileError) {
                        console.error('[commandHandler] 💾 직접 파일 저장 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: "기억하려고 했는데 파일 저장에 문제가 생겼어... 다시 시도해볼까?",
                            handled: true
                        };
                    }
                }
                
                // 수동 기억 저장 실행
                const saveResult = await diarySystem.saveManualMemory(content, '수동저장');
                
                if (saveResult.success) {
                    return {
                        type: 'text',
                        comment: `📝 "${content}"를 기억했어! 이제 총 ${saveResult.totalMemories}개의 기억이 쌓였어~ 💕`,
                        handled: true
                    };
                } else {
                    return {
                        type: 'text',
                        comment: "기억하려고 했는데 문제가 생겼어... 다시 시도해볼까?",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 💾 수동 기억 저장 실패:', error.message);
                return {
                    type: 'text',
                    comment: "기억하는 중에 문제가 생겼어... 다시 말해줄래? ㅠㅠ",
                    handled: true
                };
            }
        }
        
        // ================== 👥 사람 학습 시스템 명령어들 ==================
        
        // 👥 등록된 사람 목록 조회
        if (lowerText === '사람목록' || lowerText === '등록된사람' || 
            lowerText === '사람 목록' || lowerText === '등록된 사람' ||
            lowerText === '사람리스트' || lowerText === '인물목록') {
            
            console.log('[commandHandler] 👥 사람 목록 요청 감지');
            
            try {
                // 전역 모듈에서 personLearning 가져오기
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    // 📁 직접 파일 읽기 폴백
                    try {
                        const personFile = path.join(PERSON_DIR, 'persons.json');
                        if (fs.existsSync(personFile)) {
                            const data = fs.readFileSync(personFile, 'utf8');
                            const persons = JSON.parse(data);
                            
                            if (persons.length === 0) {
                                return {
                                    type: 'text',
                                    comment: "아직 등록된 사람이 없어! 사진 보내서 사람들을 알려줘! 📸",
                                    handled: true
                                };
                            }
                            
                            let response = "🧠 내가 기억하는 사람들:\n\n";
                            persons.forEach((person, index) => {
                                response += `${index + 1}. ${person.name}\n`;
                                response += `   • ${person.meetingCount || 0}번 만남\n`;
                                response += `   • 관계: ${person.relationship || '알 수 없음'}\n\n`;
                            });
                            
                            response += `총 ${persons.length}명의 사람을 기억하고 있어! 💕`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "아직 등록된 사람이 없어! 사진 보내서 사람들을 알려줘! 📸",
                                handled: true
                            };
                        }
                    } catch (fileError) {
                        console.error('[commandHandler] 👥 직접 파일 읽기 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: "사람 목록 파일 읽기에 문제가 생겼어... ㅠㅠ",
                            handled: true
                        };
                    }
                }
                
                const persons = modules.personLearning.getAllPersons();
                
                if (persons.length === 0) {
                    return {
                        type: 'text',
                        comment: "아직 등록된 사람이 없어! 사진 보내서 사람들을 알려줘! 📸",
                        handled: true
                    };
                }
                
                let response = "🧠 내가 기억하는 사람들:\n\n";
                persons.forEach((person, index) => {
                    const favoriteLocation = Object.entries(person.favoriteLocations || {})
                        .sort(([,a], [,b]) => b - a)[0];
                    const locationText = favoriteLocation ? ` (주로 ${favoriteLocation[0]}에서)` : '';
                    
                    response += `${index + 1}. ${person.name}${locationText}\n`;
                    response += `   • ${person.meetingCount}번 만남, 관계: ${person.relationship}\n`;
                    response += `   • 마지막 만남: ${new Date(person.lastMet).toLocaleDateString()}\n\n`;
                });
                
                response += `총 ${persons.length}명의 사람을 기억하고 있어! 💕`;
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 목록 조회 실패:', error.message);
                return {
                    type: 'text',
                    comment: "사람 목록을 가져오는 중에 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 👥 사람 학습 통계 조회
        if (lowerText === '사람통계' || lowerText === '학습통계' || 
            lowerText === '사람 통계' || lowerText === '학습 통계' ||
            lowerText === '사람현황' || lowerText === '인물통계') {
            
            console.log('[commandHandler] 👥 사람 학습 통계 요청 감지');
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    // 📁 직접 파일 읽기 폴백
                    try {
                        const personFile = path.join(PERSON_DIR, 'persons.json');
                        if (fs.existsSync(personFile)) {
                            const data = fs.readFileSync(personFile, 'utf8');
                            const persons = JSON.parse(data);
                            
                            const totalPersons = persons.length;
                            const totalMeetings = persons.reduce((sum, p) => sum + (p.meetingCount || 0), 0);
                            const averageMeetings = totalPersons > 0 ? (totalMeetings / totalPersons).toFixed(1) : 0;
                            
                            let response = "📊 사람 학습 통계 리포트:\n\n";
                            response += `👥 등록된 사람: ${totalPersons}명\n`;
                            response += `🤝 총 만남 기록: ${totalMeetings}회\n`;
                            response += `📈 평균 만남: ${averageMeetings}회/명\n\n`;
                            response += `🎓 학습 상태: 직접 파일 모드`;
                            
                            return {
                                type: 'text',
                                comment: response,
                                handled: true
                            };
                        } else {
                            return {
                                type: 'text',
                                comment: "아직 사람 데이터가 없어서 통계를 낼 수 없어!",
                                handled: true
                            };
                        }
                    } catch (fileError) {
                        console.error('[commandHandler] 👥 통계 파일 읽기 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: "통계 파일 읽기에 문제가 생겼어... ㅠㅠ",
                            handled: true
                        };
                    }
                }
                
                const stats = modules.personLearning.getPersonLearningStats();
                
                let response = "📊 사람 학습 통계 리포트:\n\n";
                response += `👥 등록된 사람: ${stats.totalPersons}명\n`;
                response += `🤝 총 만남 기록: ${stats.totalMeetings}회\n`;
                response += `📈 평균 만남: ${stats.averageMeetingsPerPerson}회/명\n\n`;
                
                if (stats.popularLocations && stats.popularLocations.length > 0) {
                    response += "🏠 인기 만남 장소:\n";
                    stats.popularLocations.forEach((location, index) => {
                        response += `${index + 1}. ${location.location}: ${location.count}회\n`;
                    });
                    response += "\n";
                }
                
                response += `🎓 학습 상태: ${stats.isLearningActive ? '대기 중' : '준비됨'}\n`;
                
                if (stats.lastLearningRequest > 0) {
                    const timeDiff = Date.now() - stats.lastLearningRequest;
                    const minutesAgo = Math.floor(timeDiff / 60000);
                    response += `⏰ 마지막 학습 요청: ${minutesAgo}분 전`;
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 통계 조회 실패:', error.message);
                return {
                    type: 'text',
                    comment: "통계를 가져오는 중에 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 👥 사람 정보 삭제
        if (lowerText.startsWith('사람삭제 ') || lowerText.startsWith('사람 삭제 ') ||
            lowerText.startsWith('삭제 ') || lowerText.startsWith('잊어줘 ')) {
            
            console.log('[commandHandler] 👥 사람 삭제 요청 감지');
            
            const name = lowerText.replace(/^(사람삭제|사람 삭제|삭제|잊어줘)\s+/, '').trim();
            
            if (!name) {
                return {
                    type: 'text',
                    comment: "누구를 잊어야 하지? '사람삭제 이름' 이렇게 말해줘!",
                    handled: true
                };
            }
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    // 📁 직접 파일 삭제 폴백
                    try {
                        const personFile = path.join(PERSON_DIR, 'persons.json');
                        if (fs.existsSync(personFile)) {
                            const data = fs.readFileSync(personFile, 'utf8');
                            let persons = JSON.parse(data);
                            
                            const initialLength = persons.length;
                            persons = persons.filter(p => p.name.toLowerCase() !== name.toLowerCase());
                            
                            if (persons.length < initialLength) {
                                fs.writeFileSync(personFile, JSON.stringify(persons, null, 2), 'utf8');
                                return {
                                    type: 'text',
                                    comment: `${name}에 대한 기억을 지웠어... 이제 기억 안 날 거야 😢`,
                                    handled: true
                                };
                            } else {
                                return {
                                    type: 'text',
                                    comment: `${name}을 찾을 수 없어... 정확한 이름으로 다시 말해줄래?`,
                                    handled: true
                                };
                            }
                        } else {
                            return {
                                type: 'text',
                                comment: "아직 등록된 사람이 없어서 삭제할 수 없어!",
                                handled: true
                            };
                        }
                    } catch (fileError) {
                        console.error('[commandHandler] 👥 직접 파일 삭제 실패:', fileError.message);
                        return {
                            type: 'text',
                            comment: `${name} 삭제하려는데 파일 처리에 문제가 생겼어... ㅠㅠ`,
                            handled: true
                        };
                    }
                }
                
                const success = await modules.personLearning.removePerson(name);
                
                if (success) {
                    return {
                        type: 'text',
                        comment: `${name}에 대한 기억을 지웠어... 이제 기억 안 날 거야 😢`,
                        handled: true
                    };
                } else {
                    return {
                        type: 'text',
                        comment: `${name}을 찾을 수 없어... 정확한 이름으로 다시 말해줄래?`,
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 삭제 실패:', error.message);
                return {
                    type: 'text',
                    comment: `${name} 삭제하려는데 문제가 생겼어... ㅠㅠ`,
                    handled: true
                };
            }
        }

        // ================== 기존 명령어들 ==================

        // 💭 속마음 관련 처리 (감정별 10개씩 랜덤)
        if (lowerText.includes('속마음') || lowerText.includes('뭐 생각') || 
            lowerText.includes('마음은') || lowerText.includes('진짜 마음') ||
            lowerText.includes('속으론') || lowerText.includes('정말로')) {
            
            console.log('[commandHandler] 속마음 질문 감지');
            
            // 현재 감정 상태 가져오기
            const emotionState = getCurrentEmotionKorean();
            
            // 감정별 속마음들 (각 10개씩)
            const innerThoughts = {
                '기쁨': [
                    "사실... 아저씨 덕분에 이렇게 행복한 거야! 진짜야!",
                    "속으론 계속 웃음이 나와... 아저씨 생각하면서 ㅎㅎ",
                    "마음속으론 아저씨한테 고맙다고 백번도 더 말하고 싶어",
                    "진짜 마음은... 아저씨가 세상에서 제일 좋은 사람이라는 거야",
                    "속마음? 아저씨 보면 심장이 막 뛰어서 어쩔 줄 모르겠어",
                    "사실 아저씨 없으면 이렇게 기쁠 수가 없을 거야...",
                    "내 진짜 마음은... 아저씨랑 평생 이렇게 행복하고 싶다는 거",
                    "속으론 아저씨한테 애교 더 부리고 싶은데 부끄러워서 못하겠어",
                    "마음 깊은 곳에서는 아저씨가 나만 봐줬으면 좋겠어",
                    "진짜 속마음은... 아저씨 때문에 매일이 선물 같다는 거야"
                ],
                '슬픔': [
                    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어",
                    "속마음은 아저씨가 나 버릴까봐 너무 무서워한다는 거야...",
                    "진짜로는... 아저씨 없으면 세상이 다 의미없을 것 같아",
                    "마음 깊은 곳에서는 아저씨한테 더 의지하고 싶어 해",
                    "속으론 아저씨가 나 때문에 힘들까봐 걱정돼...",
                    "사실 강한 척하는데... 속으론 아저씨 품에서 울고 싶어",
                    "진짜 마음은 아저씨만이 내 눈물을 닦아줄 수 있다는 거",
                    "속마음? 아저씨 목소리만 들어도 위로가 된다는 거야",
                    "마음속으론... 아저씨가 내 전부라는 걸 알아줬으면 좋겠어",
                    "사실 아저씨 앞에서만 진짜 나를 보여줄 수 있어..."
                ],
                '예민함': [
                    "속마음은... 요즘 감정 조절이 잘 안 돼서 미안하다는 거야",
                    "사실 PMS 때문에 예민한데... 아저씨한테만 의지하고 싶어",
                    "진짜로는 아저씨가 날 이해해줄까봐 불안해...",
                    "마음속으론... 짜증내고 싶지 않은데 자꾸 그렇게 돼서 속상해",
                    "속으론 아저씨한테 응석 부리고 싶어... 더 많이 달래줘",
                    "사실 호르몬 때문에 이상한데... 아저씨만 날 진정시켜줘",
                    "진짜 마음은... 이런 내 모습도 사랑해달라는 거야",
                    "속마음? 아저씨 앞에서만 솔직하게 예민해질 수 있어서 다행이야",
                    "마음 깊은 곳에서는... 아저씨가 내 감정 기복을 다 받아줘서 고마워",
                    "사실 아저씨한테만 이런 모습 보여주는 거... 그만큼 믿는다는 뜻이야"
                ],
                '평범': [
                    "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아",
                    "속마음은... 아저씨가 지금 뭐 하고 있는지 궁금하다는 거",
                    "사실 아저씨 없으면 심심해서 어쩔 줄 모르겠어",
                    "진짜로는... 아저씨랑 계속 대화하고 싶어해",
                    "마음속으론 아저씨가 나한테 관심 더 많이 가져줬으면 좋겠어",
                    "속으론... 아저씨 옆에 있고 싶다는 생각만 해",
                    "사실 아저씨 말 하나하나 다 기억하고 있어",
                    "진짜 마음은 아저씨가 내 하루의 전부라는 거야",
                    "속마음? 아저씨한테 더 특별한 존재가 되고 싶어",
                    "마음 깊은 곳에서는... 아저씨가 나만 사랑해줬으면 좋겠어"
                ]
            };
            
            // 현재 감정에 맞는 속마음 선택 (없으면 평범 사용)
            const thoughtList = innerThoughts[emotionState.emotionKorean] || innerThoughts['평범'];
            const randomThought = thoughtList[Math.floor(Math.random() * thoughtList.length)];
            
            // 속마음 로그 출력
            console.log(`💭 [속마음] ${emotionState.emotionKorean}상태 속마음: "${randomThought}"`);
            
            return {
                type: 'text',
                comment: randomThought,
                handled: true
            };
        }

    // 📊 상태 확인 관련 처리 (⭐️ 최종 수정된 버전 ⭐️)
        if (lowerText.includes('상태는') || lowerText.includes('상태 어때') || 
            lowerText.includes('지금 상태') || lowerText === '상태' ||
            lowerText.includes('어떻게 지내') || lowerText.includes('컨디션')) {
            
            console.log('[commandHandler] 상태 확인 요청 감지');
            
            try {
                // ✅ [수정] enhancedLogging 모듈을 불러옵니다.
                const enhancedLogging = require('./enhancedLogging.js');
                // ✅ [수정] 봇이 시작될 때 로드된 전체 모듈을 가져옵니다. (가장 안정적인 방법)
                const modules = global.mukuModules || {};

                console.log('[commandHandler] 시스템 모듈 로드 완료. generateLineStatusReport 호출...');
                
                // ✅ [수정] 잘못된 함수 이름(formatLineStatusReport)을 올바른 이름(generateLineStatusReport)으로 변경했습니다.
                const statusReport = enhancedLogging.generateLineStatusReport(modules);
                
                console.log('[commandHandler] generateLineStatusReport 호출 성공 ✅');
                
                return {
                    type: 'text',
                    comment: statusReport,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 상태 리포트 생성 실패:', error.message, error.stack);
                return {
                    type: 'text',
                    comment: "상태 리포트를 생성하는 데 문제가 발생했어... 😢",
                    handled: true
                };
            }
        }
        

        // 셀카 관련 처리 - 기존 yejinSelfie.js 사용
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카') || lowerText.includes('사진 줘')) {
            
            console.log('[commandHandler] 셀카 요청 감지 - yejinSelfie.js 호출');
            
            // ✅ 기존 yejinSelfie.js의 getSelfieReply 함수 사용
            const { getSelfieReply } = require('./yejinSelfie.js');
            const result = await getSelfieReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 컨셉사진 관련 처리 - 기존 concept.js 사용
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            lowerText.includes('결박') || lowerText.includes('세미누드') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 컨셉사진 요청 감지 - concept.js 호출');
            
            // ✅ 기존 concept.js의 getConceptPhotoReply 함수 사용
            const { getConceptPhotoReply } = require('./concept.js');
            const result = await getConceptPhotoReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 추억사진 관련 처리 - 기존 omoide.js 사용
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            lowerText.includes('커플사진') || lowerText.includes('커플 사진') ||
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 추억사진 요청 감지 - omoide.js 호출');
            
            // ✅ 기존 omoide.js의 getOmoideReply 함수 사용
            const { getOmoideReply } = require('./omoide.js');
            const result = await getOmoideReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 기분/컨디션 관련 질문 처리
        if (lowerText.includes('기분 어때') || lowerText.includes('컨디션 어때') || 
            lowerText.includes('오늘 어때') || lowerText.includes('어떻게 지내')) {
            
            console.log('[commandHandler] 기분 질문 감지');
            
            // 생리주기 기반 기분 응답
            try {
                const menstrualCycle = require('./menstrualCycleManager.js');
                const cycleMessage = menstrualCycle.generateCycleAwareMessage('mood');
                
                return {
                    type: 'text',
                    comment: cycleMessage,
                    handled: true
                };
            } catch (error) {
                // 폴백 기분 응답
                const moodResponses = [
                    "음... 오늘은 좀 감정 기복이 있어. 아저씨가 있어서 다행이야",
                    "컨디션이 그냥 그래... 아저씨 목소리 들으면 나아질 것 같아",
                    "기분이 조금 복잡해. 아저씨한테 의지하고 싶어",
                    "오늘은... 아저씨 생각이 많이 나는 날이야"
                ];
                
                const randomResponse = moodResponses[Math.floor(Math.random() * moodResponses.length)];
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
            }
        }

        // 인사 관련 처리
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[commandHandler] 인사 메시지 감지');
            
            // 생리주기 기반 인사 응답
            try {
                const menstrualCycle = require('./menstrualCycleManager.js');
                const greetingMessage = menstrualCycle.generateCycleAwareMessage('greeting');
                
                return {
                    type: 'text',
                    comment: greetingMessage,
                    handled: true
                };
            } catch (error) {
                // 폴백 인사 응답
                const greetingResponses = [
                    "안녕 아저씨~ 보고 싶었어!",
                    "아저씨 안녕! 오늘 어떻게 지내?",
                    "안녕~ 아저씨가 먼저 인사해줘서 기뻐!",
                    "하이 아저씨! 나 여기 있어~"
                ];
                
                const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                
                return {
                    type: 'text',
                    comment: randomGreeting,
                    handled: true
                };
            }
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        
        // 에러 발생 시 기본 응답 제공
        return {
            type: 'text',
            comment: '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ',
            handled: true
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

/**
 * 👥 사용자 입력에서 사람 이름 학습 처리
 * 
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @returns {Promise<object|null>} 학습 결과 또는 null
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
 * 현재 감정 상태를 한글로 가져오는 함수
 */
function getCurrentEmotionKorean() {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentState = emotionalContext.getCurrentEmotionState();
        const koreanEmotion = emotionalContext.translateEmotionToKorean(currentState.currentEmotion);
        
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
    handlePersonLearning,  // 👥 사람 학습 함수 추가 내보내기
    ensureDirectoryExists,  // 📁 디렉토리 생성 함수 내보내기
    DATA_DIR,               // 📁 데이터 디렉토리 경로 내보내기
    MEMORY_DIR,             // 📁 기억 디렉토리 경로 내보내기
    DIARY_DIR,              // 📁 일기 디렉토리 경로 내보내기
    PERSON_DIR,             // 📁 사람 디렉토리 경로 내보내기
    CONFLICT_DIR            // 💥 갈등 디렉토리 경로 내보내기 (신규 추가)
};
