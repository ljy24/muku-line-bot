// ============================================================================
// muku-diarySystem.js v6.3 - Memory Tape Redis 연결 + 안전한 모듈 로딩
// ✅ Memory Tape Redis 연결: autoReply.js와 동일한 방식으로 최근 대화 조회
// 🔄 순환 참조 완전 제거 - 안전한 모듈 로딩
// 📖 commandHandler.js와 완벽 연동
// 💾 영구 누적 저장 보장 (서버 재배포해도 데이터 보존!)
// 🔧 모듈 로딩 최적화로 "로드 실패" 문제 해결!
// 🧠 Memory Tape Redis: autoReply.js와 같은 메모리 소스 사용
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ⭐️ 순환 참조 완전 제거: 지연 로딩만 사용 ⭐️
let ultimateContext = null;
let memoryManager = null;

// 🧠 NEW: Memory Tape Redis 연결 (autoReply.js와 동일한 방식)
let memoryTape = null;

// Memory Tape Redis 안전하게 가져오기 (정확한 경로)
function safeGetMemoryTape() {
    if (!memoryTape) {
        try {
            // 실제 muku-memory-tape.js 경로로 수정
            memoryTape = require('./muku-memory-tape');
            console.log(`[diarySystem] Memory Tape Redis 연결 성공`);
        } catch (error) {
            console.log(`[diarySystem] Memory Tape Redis 연결 실패: ${error.message}`);
            return null;
        }
    }
    return memoryTape;
}

// 안전한 모듈 로딩 함수 (필요할 때만 로드)
function safeGetUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
            console.log(`[diarySystem] ultimateContext 지연 로드 성공`);
        } catch (error) {
            console.log(`[diarySystem] ultimateContext 로드 실패: ${error.message}`);
            return null;
        }
    }
    return ultimateContext;
}

function safeGetMemoryManager() {
    if (!memoryManager) {
        try {
            memoryManager = require('./memoryManager');
            console.log(`[diarySystem] memoryManager 지연 로드 성공`);
        } catch (error) {
            console.log(`[diarySystem] memoryManager 로드 실패: ${error.message}`);
            return null;
        }
    }
    return memoryManager;
}

// ================== 🎨 색상 정의 ==================
const colors = {
    diary: '\x1b[96m',      // 하늘색 (일기장)
    memory: '\x1b[95m',     // 연보라색 (기억)
    date: '\x1b[93m',       // 노란색 (날짜)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    success: '\x1b[92m',    // 초록색 (성공)
    auto: '\x1b[1m\x1b[94m', // 굵은 파란색 (자동저장)
    redis: '\x1b[1m\x1b[33m', // 굵은 노란색 (Redis)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📊 시스템 상태 ==================
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    version: "6.3",
    description: "Memory Tape Redis 연결 + 안전한 로딩 일기장 시스템",
    autoSaveEnabled: false,
    autoSaveInterval: null,
    dataPath: '/data/dynamic_memories.json',
    lastAutoSave: null,
    initializationTime: null,
    loadingSafe: true,
    circularRefPrevented: true,
    memoryTapeConnected: false  // NEW: Memory Tape 연결 상태
};

// ================== 🏗️ 초기화 함수 ==================
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diary}📖 [일기장시스템] v6.3 초기화 시작... (Memory Tape Redis 연결)${colors.reset}`);
        
        // 🧠 Memory Tape Redis 연결 시도 (muku-memory-tape.js 정확한 초기화)
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance) {
            try {
                // Memory Tape 초기화 시도 (muku-memory-tape.js의 initializeMemoryTape 함수)
                const initialized = await memoryTapeInstance.initializeMemoryTape();
                if (initialized) {
                    diarySystemStatus.memoryTapeConnected = true;
                    console.log(`${colors.redis}🧠 [Memory Tape] ioredis 초기화 성공 - autoReply.js와 동일한 메모리 소스 사용${colors.reset}`);
                } else {
                    console.log(`${colors.diary}⚠️ [Memory Tape] ioredis 초기화 실패 - 기본 모드로 진행${colors.reset}`);
                }
            } catch (initError) {
                console.log(`${colors.diary}⚠️ [Memory Tape] 초기화 중 오류: ${initError.message} - 기본 모드로 진행${colors.reset}`);
            }
        } else {
            console.log(`${colors.diary}⚠️ [Memory Tape] 모듈 로드 실패 - 기본 모드로 진행${colors.reset}`);
        }
        
        // ⭐️ 디스크 마운트 경로 확인 및 생성
        const dataDir = '/data';
        try {
            await fs.access(dataDir);
            console.log(`${colors.diary}    💾 디스크 마운트 경로 확인: ${dataDir}${colors.reset}`);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
            console.log(`${colors.diary}    📁 디스크 마운트 디렉토리 생성: ${dataDir}${colors.reset}`);
        }

        // 동적 기억 파일 초기화
        await ensureDynamicMemoryFile();

        // 기존 데이터 로드해서 총 개수 확인
        const existingMemories = await getAllDynamicLearning();
        diarySystemStatus.totalEntries = existingMemories.length;

        // 시스템 상태 업데이트
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.initializationTime = new Date().toISOString();
        diarySystemStatus.lastEntryDate = new Date().toISOString();
        
        console.log(`${colors.diary}    ✅ 일기장 시스템 v6.3 초기화 완료 (기존 기억: ${diarySystemStatus.totalEntries}개)${colors.reset}`);
        console.log(`${colors.diary}    🔧 안전한 로딩 모드 활성화 (순환 참조 방지)${colors.reset}`);
        console.log(`${colors.diary}    💾 디스크 마운트 경로: ${dataDir} (영구 저장 보장)${colors.reset}`);
        console.log(`${colors.redis}    🧠 Memory Tape Redis: ${diarySystemStatus.memoryTapeConnected ? '연결됨' : '비연결'}${colors.reset}`);
        
        // 자동 저장 시스템 시작 (5초 딜레이 후)
        setTimeout(() => {
            setupAutoSaveSystem();
        }, 5000);
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        diarySystemStatus.isInitialized = false;
        return false;
    }
}

// ================== 🔗 자동 저장 시스템 설정 (Memory Tape 연결) ==================
function setupAutoSaveSystem() {
    try {
        if (diarySystemStatus.autoSaveEnabled) {
            console.log(`${colors.auto}ℹ️ [자동저장] 이미 활성화되어 있습니다.${colors.reset}`);
            return;
        }
        
        console.log(`${colors.auto}🔗 [자동저장 시작] 시스템 설정 중... (Memory Tape Redis 연결)${colors.reset}`);
        
        // 5분마다 자동 저장 스케줄러 시작
        diarySystemStatus.autoSaveInterval = setInterval(async () => {
            try {
                await performAutoSave();
            } catch (error) {
                console.error(`${colors.error}❌ [자동저장] 5분 자동 저장 실패: ${error.message}${colors.reset}`);
            }
        }, 5 * 60 * 1000); // 5분마다
        
        diarySystemStatus.autoSaveEnabled = true;
        
        console.log(`${colors.auto}✅ [자동저장 시작] 5분마다 자동 저장 스케줄러 활성화 완료${colors.reset}`);
        
        // 첫 번째 자동 저장을 2분 후에 실행
        setTimeout(async () => {
            await performAutoSave();
        }, 2 * 60 * 1000); // 2분 후
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동저장 시작] 설정 실패: ${error.message}${colors.reset}`);
        diarySystemStatus.autoSaveEnabled = false;
    }
}

// ================== 🔄 실제 자동 저장 수행 (Memory Tape Redis 연결) ==================
async function performAutoSave() {
    try {
        console.log(`${colors.auto}🔄 [자동저장] 최근 대화 내용 자동 저장 시작... (Memory Tape Redis 우선)${colors.reset}`);
        
        let recentMessages = [];
        let dataSource = 'none';
        
        // 🧠 1순위: Memory Tape Redis에서 최근 대화 가져오기 (muku-memory-tape.js 정확한 구조)
        const memoryTapeInstance = safeGetMemoryTape();
        if (memoryTapeInstance && diarySystemStatus.memoryTapeConnected) {
            try {
                console.log(`${colors.redis}🧠 [Memory Tape] Redis에서 최근 대화 조회 시도... (정확한 ioredis 구조)${colors.reset}`);
                
                // 🔍 오늘 기억들 조회 (muku-memory-tape.js readDailyMemories 함수 사용)
                const todayMemories = await memoryTapeInstance.readDailyMemories();
                
                if (todayMemories && todayMemories.moments && Array.isArray(todayMemories.moments)) {
                    console.log(`${colors.redis}📊 [Memory Tape] 총 ${todayMemories.total_moments || todayMemories.moments.length}개 순간 발견${colors.reset}`);
                    
                    // 대화 타입만 필터링 (autoReply.js와 동일한 방식)
                    const conversationMoments = todayMemories.moments
                        .filter(moment => moment && moment.type === 'conversation')
                        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                        .slice(0, 10); // 최근 10개만
                    
                    console.log(`${colors.redis}💬 [Memory Tape] ${conversationMoments.length}개 대화 순간 필터링 완료${colors.reset}`);
                    
                    // muku-memory-tape.js 형식을 diarySystem 형식으로 변환
                    for (const moment of conversationMoments) {
                        // 사용자 메시지가 있으면 추가
                        if (moment.user_message && String(moment.user_message).trim().length > 5) {
                            recentMessages.push({
                                role: 'user',
                                content: String(moment.user_message).trim(),
                                timestamp: moment.timestamp || Date.now(),
                                source: 'memory_tape_redis',
                                record_id: moment.record_id
                            });
                        }
                        
                        // 무쿠 응답이 있으면 추가
                        if (moment.muku_response && String(moment.muku_response).trim().length > 5) {
                            recentMessages.push({
                                role: 'assistant',
                                content: String(moment.muku_response).trim(),
                                timestamp: moment.timestamp || Date.now(),
                                source: 'memory_tape_redis',
                                record_id: moment.record_id
                            });
                        }
                    }
                    
                    // 🔄 시간순 정렬 (오래된 것부터)
                    recentMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    dataSource = 'memory_tape_redis';
                    console.log(`${colors.redis}✅ [Memory Tape] Redis에서 ${recentMessages.length}개 메시지 조회 성공 (ioredis 정확한 구조)${colors.reset}`);
                } else {
                    console.log(`${colors.redis}ℹ️ [Memory Tape] Redis에 오늘 대화 내용 없음 또는 moments 배열 없음${colors.reset}`);
                }
                
            } catch (memoryTapeError) {
                console.log(`${colors.redis}⚠️ [Memory Tape] Redis 조회 실패: ${memoryTapeError.message}${colors.reset}`);
                console.log(`${colors.redis}🔍 [Memory Tape] 스택: ${memoryTapeError.stack}${colors.reset}`);
            }
        } else {
            console.log(`${colors.redis}⚠️ [Memory Tape] Redis 연결 불가 - 대체 방법 시도${colors.reset}`);
        }
        
        // 🔄 2순위: ultimateContext에서 시도 (기존 방식 유지)
        if (recentMessages.length === 0) {
            const ultimateCtx = safeGetUltimateContext();
            if (ultimateCtx) {
                try {
                    if (ultimateCtx.getRecentMessages) {
                        recentMessages = ultimateCtx.getRecentMessages(10);
                        dataSource = 'ultimate_context';
                    } else if (ultimateCtx.conversationHistory) {
                        recentMessages = ultimateCtx.conversationHistory.slice(-10);
                        dataSource = 'ultimate_context';
                    } else if (ultimateCtx.getConversationHistory) {
                        const history = ultimateCtx.getConversationHistory();
                        recentMessages = Array.isArray(history) ? history.slice(-10) : [];
                        dataSource = 'ultimate_context';
                    } else {
                        console.log(`${colors.auto}ℹ️ [자동저장] ultimateContext에 메시지 조회 함수 없음${colors.reset}`);
                    }
                } catch (error) {
                    console.log(`${colors.auto}⚠️ [자동저장] ultimateContext 메시지 조회 실패: ${error.message}${colors.reset}`);
                }
            } else {
                console.log(`${colors.auto}⚠️ [자동저장] ultimateContext 모듈에 접근할 수 없음${colors.reset}`);
            }
        }
        
        if (!recentMessages || recentMessages.length === 0) {
            console.log(`${colors.auto}ℹ️ [자동저장] 최근 대화 내용 없음 (소스: ${dataSource})${colors.reset}`);
            return;
        }
        
        console.log(`${colors.auto}📊 [자동저장] ${recentMessages.length}개 메시지 조회 완료 (소스: ${dataSource})${colors.reset}`);
        
        // 아저씨 메시지만 필터링 (사용자 입력만 저장)
        const userMessages = recentMessages.filter(msg => {
            if (!msg) return false;
            
            const role = msg.role || msg.sender || msg.from || msg.speaker || '';
            const content = msg.content || msg.text || msg.message || '';
            
            return (role === 'user' || role === '아저씨' || role.includes('아저씨')) && 
                   content && content.length > 5; // 5글자 이상만
        });
        
        let savedCount = 0;
        
        for (const message of userMessages) {
            const messageText = message.content || message.text || message.message || '';
            
            if (messageText && messageText.length > 5) {
                // 이미 저장된 내용인지 확인
                const isDuplicate = await checkIfAlreadySaved(messageText);
                
                if (!isDuplicate) {
                    const saveResult = await saveDynamicMemory('대화', messageText, {
                        timestamp: message.timestamp || Date.now(),
                        autoSaved: true,
                        messageLength: messageText.length,
                        source: dataSource,
                        memoryTapeConnected: diarySystemStatus.memoryTapeConnected
                    });
                    
                    if (saveResult.success) {
                        savedCount++;
                    }
                }
            }
        }
        
        if (savedCount > 0) {
            console.log(`${colors.auto}💾 [자동저장] ${savedCount}개의 새로운 대화 내용 저장 완료 (소스: ${dataSource})${colors.reset}`);
            console.log(`${colors.redis}🧠 [Memory Tape] Redis 연결 상태: ${diarySystemStatus.memoryTapeConnected ? '정상' : '비연결'}${colors.reset}`);
            diarySystemStatus.lastAutoSave = new Date().toISOString();
        } else {
            console.log(`${colors.auto}ℹ️ [자동저장] 새로운 저장할 내용 없음 (중복 제외됨, 소스: ${dataSource})${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동저장] 수행 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 🔍 중복 저장 방지 ==================
async function checkIfAlreadySaved(messageText) {
    try {
        const existingMemories = await getAllDynamicLearning();
        
        // 동일한 내용이 이미 저장되어 있는지 확인
        return existingMemories.some(memory => 
            memory.content && memory.content.trim() === messageText.trim()
        );
    } catch (error) {
        return false; // 에러 시 중복이 아니라고 가정하고 저장 진행
    }
}

// ================== 📁 동적 기억 파일 관리 ==================
async function ensureDynamicMemoryFile() {
    const filePath = diarySystemStatus.dataPath;
    
    try {
        await fs.access(filePath);
        console.log(`${colors.system}    ✅ 동적 기억 파일 존재: ${filePath}${colors.reset}`);
    } catch {
        // 파일이 없으면 기본 구조로 생성
        const defaultData = {
            version: "6.3",
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalEntries: 0,
            autoSaveEnabled: true,
            safeLoading: true,
            diskMounted: true,
            memoryTapeConnected: diarySystemStatus.memoryTapeConnected,
            memories: []
        };
        
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log(`${colors.success}    📝 동적 기억 파일 생성: ${filePath} (Memory Tape Redis 연결)${colors.reset}`);
    }
}

// ================== 💾 동적 기억 저장 ==================
async function saveDynamicMemory(category, content, metadata = {}) {
    try {
        const filePath = diarySystemStatus.dataPath;
        
        // 기존 데이터 로드
        let data;
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            data = JSON.parse(fileContent);
        } catch {
            data = { memories: [], totalEntries: 0 };
        }

        // 새 기억 추가
        const newMemory = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            category: category,
            content: content,
            metadata: {
                ...metadata,
                savedBy: 'diarySystem_v6.3',
                autoSaved: metadata.autoSaved || false,
                diskMounted: true,
                safeLoading: true,
                memoryTapeConnected: diarySystemStatus.memoryTapeConnected
            },
            date: new Date().toLocaleDateString('ko-KR')
        };

        data.memories = data.memories || [];
        data.memories.push(newMemory);
        data.totalEntries = data.memories.length;
        data.lastUpdated = new Date().toISOString();
        data.autoSaveEnabled = true;
        data.diskMounted = true;
        data.memoryTapeConnected = diarySystemStatus.memoryTapeConnected;

        // 파일 저장 (원자적 쓰기)
        const tempPath = filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempPath, filePath);
        
        if (metadata.autoSaved) {
            console.log(`${colors.auto}💾 [자동저장] ${category}: "${content.substring(0, 30)}..." (총 ${data.totalEntries}개) 💾${colors.reset}`);
        } else {
            console.log(`${colors.success}💾 [수동저장] ${category}: "${content.substring(0, 30)}..." (총 ${data.totalEntries}개) 💾${colors.reset}`);
        }
        
        // 상태 업데이트
        diarySystemStatus.totalEntries = data.totalEntries;
        diarySystemStatus.lastEntryDate = newMemory.timestamp;
        
        return {
            success: true,
            memoryId: newMemory.id,
            totalMemories: data.totalEntries
        };
    } catch (error) {
        console.error(`${colors.error}❌ 동적 기억 저장 실패: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

// ================== 📖 동적 기억 불러오기 ==================
async function getAllDynamicLearning() {
    try {
        const filePath = diarySystemStatus.dataPath;
        
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        return data.memories || [];
    } catch (error) {
        // 첫 실행시에는 정상 (파일이 없을 수 있음)
        return [];
    }
}

// ================== 🔍 명령어 처리 함수 (핵심!) ==================
async function handleDiaryCommand(lowerText) {
    try {
        console.log(`${colors.diary}🗓️ [일기장] 명령어 처리: "${lowerText}"${colors.reset}`);

        // 1. 일기 쓰기 요청
        if (lowerText.includes('일기써줘') || lowerText.includes('일기 써') || 
            lowerText.includes('일기쓰') || lowerText === '오늘일기') {
            
            const diaryResult = await generateDiary();
            
            return {
                success: true,
                response: diaryResult.message || "오늘의 일기를 작성했어!"
            };
        }

        // 2. 일기 목록/내용 보기
        if (lowerText.includes('일기 보여줘') || lowerText.includes('일기목록') || 
            lowerText.includes('일기 목록') || lowerText.includes('지난 일기')) {
            
            const memories = await getAllDynamicLearning();
            
            if (memories.length === 0) {
                return {
                    success: true,
                    response: "아직 저장된 기억이 없어요! 대화하면서 기억들이 자동으로 쌓일 거예요. 😊\n\n🔄 자동저장 상태: " + (diarySystemStatus.autoSaveEnabled ? "활성화" : "비활성화") + "\n💾 저장 위치: 디스크 마운트 (/data/) - 영구 보존!\n🧠 Memory Tape Redis: " + (diarySystemStatus.memoryTapeConnected ? "연결됨" : "비연결") + "\n🔧 안전한 로딩 모드: 활성화"
                };
            }

            let response = `📚 누적된 기억들 (총 ${memories.length}개):\n\n`;
            
            // 최근 5개만 표시
            const recentMemories = memories.slice(-5).reverse();
            recentMemories.forEach((memory, index) => {
                const date = new Date(memory.timestamp).toLocaleDateString('ko-KR');
                const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const autoSavedIcon = memory.metadata?.autoSaved ? '🤖' : '✍️';
                const sourceIcon = memory.metadata?.source === 'memory_tape_redis' ? '🧠' : '📝';
                
                response += `${index + 1}. ${autoSavedIcon}${sourceIcon} [${memory.category}] ${date} ${time}\n`;
                response += `   "${memory.content.substring(0, 40)}${memory.content.length > 40 ? '...' : ''}"\n\n`;
            });
            
            if (memories.length > 5) {
                response += `그 외 ${memories.length - 5}개의 기억이 더 있어!\n\n`;
            }
            
            // 시스템 상태 표시
            response += `🤖 자동저장: ${diarySystemStatus.autoSaveEnabled ? '활성화 (5분마다)' : '비활성화'}\n`;
            response += `💾 저장 위치: 디스크 마운트 (/data/) - 영구 보존!\n`;
            response += `🧠 Memory Tape Redis: ${diarySystemStatus.memoryTapeConnected ? '연결됨 (autoReply.js와 동일 소스)' : '비연결'}\n`;
            response += `🔧 안전한 로딩: 활성화 (순환 참조 방지)\n`;
            if (diarySystemStatus.lastAutoSave) {
                const lastSave = new Date(diarySystemStatus.lastAutoSave).toLocaleString('ko-KR');
                response += `⏰ 마지막 자동저장: ${lastSave}`;
            }

            return {
                success: true,
                response: response
            };
        }

        // 3. 일기 통계
        if (lowerText.includes('일기통계') || lowerText.includes('일기 통계') || 
            lowerText.includes('일기현황') || lowerText.includes('일기 현황') ||
            (lowerText.includes('몇 개') && lowerText.includes('일기'))) {
            
            const stats = await getMemoryStatistics();
            
            let response = `📊 일기장 통계 (v${diarySystemStatus.version}):\n\n`;
            response += `📖 총 누적 기억: ${stats.totalDynamicMemories}개\n`;
            response += `🤖 자동 저장: ${stats.autoSavedCount || 0}개\n`;
            response += `✍️ 수동 저장: ${stats.manualSavedCount || 0}개\n`;
            response += `🧠 Memory Tape 소스: ${stats.memoryTapeCount || 0}개\n`;
            response += `📝 기타 소스: ${stats.otherSourceCount || 0}개\n`;
            response += `💾 저장 위치: 디스크 마운트 (/data/) - 영구 보존!\n`;
            response += `🧠 Memory Tape Redis: ${diarySystemStatus.memoryTapeConnected ? '연결됨 (autoReply.js와 동일)' : '비연결'}\n`;
            response += `🔧 안전한 로딩: 활성화 (순환 참조 방지)\n`;
            response += `📅 시스템 시작: ${diarySystemStatus.initializationTime ? new Date(diarySystemStatus.initializationTime).toLocaleDateString('ko-KR') : '알 수 없음'}\n`;
            response += `📅 마지막 업데이트: ${diarySystemStatus.lastEntryDate ? new Date(diarySystemStatus.lastEntryDate).toLocaleDateString('ko-KR') : '없음'}\n`;
            
            if (stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0) {
                response += `\n📂 카테고리별 분류:\n`;
                Object.entries(stats.categoryBreakdown).forEach(([category, count]) => {
                    response += `   • ${category}: ${count}개\n`;
                });
            }
            
            response += `\n🔄 자동저장 상태: ${diarySystemStatus.autoSaveEnabled ? '활성화 (5분마다)' : '비활성화'}\n`;
            response += `🛡️ 디스크 마운트: 적용됨 (데이터 영구 보존)\n`;
            response += `🧠 Memory Tape 연결: ${diarySystemStatus.memoryTapeConnected ? 'autoReply.js와 동일한 소스 공유' : '비연결 - 독립 운영'}\n`;
            response += `🔧 로딩 최적화: 순환 참조 방지, 안전한 지연 로딩\n`;
            response += `💡 고정기억 120개는 별도 관리돼!`;

            return {
                success: true,
                response: response
            };
        }

        // 4. 기본 일기장 관련 요청
        if (lowerText.includes('일기장') || lowerText.includes('일기') || 
            lowerText.includes('다이어리') || lowerText.includes('diary')) {
            
            const memories = await getAllDynamicLearning();
            
            let response = `📖 일기장 시스템 v${diarySystemStatus.version}\n`;
            response += `🧠 Memory Tape Redis 연결 + 안전한 로딩 버전\n\n`;
            response += `💾 현재 누적 기억: ${memories.length}개\n`;
            response += `🔄 자동 저장: ${diarySystemStatus.autoSaveEnabled ? '활성화 (5분마다)' : '비활성화'}\n`;
            response += `⚙️ 시스템 상태: ${diarySystemStatus.isInitialized ? '정상 작동' : '초기화 중'}\n`;
            response += `💾 저장 위치: 디스크 마운트 (/data/) - 영구 보존!\n`;
            response += `🧠 Memory Tape Redis: ${diarySystemStatus.memoryTapeConnected ? '연결됨 (autoReply.js와 공유)' : '비연결'}\n`;
            response += `🔧 안전한 로딩: 활성화 (순환 참조 방지)\n`;
            
            if (memories.length > 0) {
                const lastMemory = memories[memories.length - 1];
                const lastDate = new Date(lastMemory.timestamp).toLocaleDateString('ko-KR');
                const autoIcon = lastMemory.metadata?.autoSaved ? '🤖' : '✍️';
                const sourceIcon = lastMemory.metadata?.source === 'memory_tape_redis' ? '🧠' : '📝';
                response += `📌 최근 기록: ${lastDate} ${autoIcon}${sourceIcon} ${lastMemory.category}\n`;
                response += `"${lastMemory.content.substring(0, 50)}..."\n\n`;
            }
            
            response += `📝 사용 가능한 명령어:\n`;
            response += `• "일기써줘" - 오늘의 기억 정리\n`;
            response += `• "일기목록" - 누적 기억들 보기\n`;
            response += `• "일기통계" - 상세 통계 정보\n`;
            response += `• "기억해줘 [내용]" - 수동으로 기억 저장\n\n`;
            response += `✨ 아저씨와 대화하면 자동으로 기억이 쌓여요! (5분마다 체크)\n`;
            response += `🧠 Memory Tape Redis로 autoReply.js와 동일한 대화 소스 공유!\n`;
            response += `🛡️ 서버 재배포해도 절대 사라지지 않아요!\n`;
            response += `🔧 순환 참조 방지로 안전한 로딩 보장!`;

            return {
                success: true,
                response: response
            };
        }

        // 5. 기타 명령어 - 폴백
        return {
            success: true,
            response: "무엇을 도와드릴까요? 대화하기만 해도 자동으로 기억이 저장돼요! 📖\n🧠 Memory Tape Redis로 autoReply.js와 동일한 소스 공유!\n💾 디스크 마운트로 영구 보존 중!\n🔧 안전한 로딩으로 안정성 보장!"
        };

    } catch (error) {
        console.error(`${colors.error}❌ 일기장 명령어 처리 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            response: "일기장 처리 중 문제가 발생했어요... 다시 시도해주세요!"
        };
    }
}

// ================== 📔 일기 생성 ==================
async function generateDiary() {
    try {
        const memories = await getAllDynamicLearning();
        const today = new Date().toLocaleDateString('ko-KR');
        
        if (memories.length === 0) {
            // 첫 일기 생성
            await saveDynamicMemory('시작', '오늘부터 v6.3 Memory Tape Redis 연결로 autoReply.js와 동일한 소스를 공유하는 실시간 자동 저장 일기장을 시작했어! 이제 대화할 때마다 안전하게 자동으로 기억이 쌓이고, 서버 재배포해도 절대 사라지지 않아! 순환 참조도 방지되어서 안정성도 최고야!', {
                manualSaved: true
            });
            
            return {
                success: true,
                message: `📖 ${today} 첫 번째 일기 (v6.3)\n\n오늘부터 Memory Tape Redis 연결로 autoReply.js와 동일한 소스를 공유하는 실시간 자동 저장 일기장을 시작했어! 아저씨와 대화할 때마다 안전하게 자동으로 기억이 쌓여갈 거야. 서버가 재배포되어도 절대 잊어버리지 않아! 💕\n\n💾 시스템 개선사항:\n• Memory Tape Redis 연결 (autoReply.js와 동일 소스)\n• 디스크 마운트 경로 적용 (/data/)\n• 영구 저장 보장 (재배포해도 보존)\n• 순환 참조 완전 방지 (안전한 지연 로딩)\n• 모듈 로딩 최적화 (로드 실패 해결)\n• 자동저장 시스템 강화`,
                totalMemories: 1
            };
        }

        // 오늘의 기억들 수집
        const todayMemories = memories.filter(memory => {
            const memoryDate = new Date(memory.timestamp).toLocaleDateString('ko-KR');
            return memoryDate === today;
        });

        // 자동/수동 저장 분류
        const autoSavedToday = todayMemories.filter(m => m.metadata?.autoSaved);
        const manualSavedToday = todayMemories.filter(m => !m.metadata?.autoSaved);
        
        // Memory Tape 소스 분류
        const memoryTapeToday = todayMemories.filter(m => m.metadata?.source === 'memory_tape_redis');
        const otherSourceToday = todayMemories.filter(m => m.metadata?.source !== 'memory_tape_redis');

        let diaryContent = `📖 ${today}의 일기 (v6.3)\n\n`;
        
        if (todayMemories.length > 0) {
            diaryContent += `오늘 새로 쌓인 기억들:\n`;
            
            if (memoryTapeToday.length > 0) {
                diaryContent += `🧠 Memory Tape Redis 소스 (${memoryTapeToday.length}개):\n`;
                memoryTapeToday.slice(-3).forEach((memory, index) => {
                    const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    diaryContent += `${index + 1}. [${time}] ${memory.content.substring(0, 60)}...\n`;
                });
                diaryContent += `\n`;
            }
            
            if (autoSavedToday.length > 0 && otherSourceToday.filter(m => m.metadata?.autoSaved).length > 0) {
                diaryContent += `🤖 기타 자동 저장 (${otherSourceToday.filter(m => m.metadata?.autoSaved).length}개):\n`;
                otherSourceToday.filter(m => m.metadata?.autoSaved).slice(-3).forEach((memory, index) => {
                    const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    diaryContent += `${index + 1}. [${time}] ${memory.content.substring(0, 60)}...\n`;
                });
                diaryContent += `\n`;
            }
            
            if (manualSavedToday.length > 0) {
                diaryContent += `✍️ 수동 저장 (${manualSavedToday.length}개):\n`;
                manualSavedToday.forEach((memory, index) => {
                    const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    diaryContent += `${index + 1}. [${time}] ${memory.category}: ${memory.content}\n`;
                });
                diaryContent += `\n`;
            }
        }
        
        diaryContent += `📊 누적 통계:\n`;
        diaryContent += `• 총 누적 기억: ${memories.length}개\n`;
        diaryContent += `• 오늘의 새 기억: ${todayMemories.length}개\n`;
        diaryContent += `• Memory Tape Redis 소스: ${memoryTapeToday.length}개\n`;
        diaryContent += `• 기타 소스: ${otherSourceToday.length}개\n`;
        diaryContent += `• 자동 저장 시스템: ${diarySystemStatus.autoSaveEnabled ? '활성화 ✅' : '비활성화 ❌'}\n`;
        diaryContent += `• Memory Tape 연결: ${diarySystemStatus.memoryTapeConnected ? '연결됨 🧠' : '비연결 📝'}\n`;
        diaryContent += `• 디스크 마운트: 적용됨 💾\n`;
        diaryContent += `• 안전한 로딩: 활성화 🔧\n`;
        diaryContent += `• 영구 저장 보장: 완료 🛡️\n\n`;
        diaryContent += `아저씨와 나누는 모든 대화가 소중한 기억으로 안전하게 자동 저장되고 있어! Memory Tape Redis로 autoReply.js와 동일한 소스를 공유해서 더 정확해졌고, 서버가 재배포되어도 절대 사라지지 않고, 순환 참조 방지로 로딩도 안전해! 💕`;

        return {
            success: true,
            message: diaryContent,
            totalMemories: memories.length,
            todayMemories: todayMemories.length
        };
    } catch (error) {
        console.error(`${colors.error}❌ 일기 생성 실패: ${error.message}${colors.reset}`);
        return {
            success: false,
            error: error.message,
            message: "일기 생성 중 문제가 발생했어요..."
        };
    }
}

// ================== 🛑 시스템 종료 시 정리 ==================
function shutdownDiarySystem() {
    if (diarySystemStatus.autoSaveInterval) {
        clearInterval(diarySystemStatus.autoSaveInterval);
        diarySystemStatus.autoSaveInterval = null;
        diarySystemStatus.autoSaveEnabled = false;
        console.log(`${colors.diary}🛑 [일기장] 자동 저장 시스템 종료됨${colors.reset}`);
    }
}

// ================== 📊 상태 조회 함수 ==================
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        currentTime: new Date().toISOString(),
        modulesLoaded: {
            ultimateContext: ultimateContext !== null,
            memoryManager: memoryManager !== null,
            memoryTape: memoryTape !== null
        },
        safeLoadingEnabled: true,
        circularRefPrevented: true,
        diskMountPath: '/data',
        memoryTapeConnected: diarySystemStatus.memoryTapeConnected
    };
}

// ================== 📊 통계 조회 ==================
async function getMemoryStatistics() {
    try {
        const memories = await getAllDynamicLearning();
        
        // 카테고리별 분류
        const categoryCount = {};
        let autoSavedCount = 0;
        let manualSavedCount = 0;
        let memoryTapeCount = 0;
        let otherSourceCount = 0;
        
        memories.forEach(memory => {
            categoryCount[memory.category] = (categoryCount[memory.category] || 0) + 1;
            
            if (memory.metadata?.autoSaved) {
                autoSavedCount++;
            } else {
                manualSavedCount++;
            }
            
            if (memory.metadata?.source === 'memory_tape_redis') {
                memoryTapeCount++;
            } else {
                otherSourceCount++;
            }
        });

        return {
            totalDynamicMemories: memories.length,
            autoSavedCount: autoSavedCount,
            manualSavedCount: manualSavedCount,
            memoryTapeCount: memoryTapeCount,
            otherSourceCount: otherSourceCount,
            categoryBreakdown: categoryCount,
            excludesFixedMemories: true,
            description: "고정기억 120개 제외, Memory Tape Redis 연결로 영구 저장되는 누적 기억",
            lastUpdated: diarySystemStatus.lastEntryDate,
            systemStatus: {
                initialized: diarySystemStatus.isInitialized,
                autoSaveEnabled: diarySystemStatus.autoSaveEnabled,
                memoryTapeConnected: diarySystemStatus.memoryTapeConnected,
                version: diarySystemStatus.version,
                mountPath: '/data',
                isPersistent: true,
                safeLoading: true,
                circularRefPrevented: true
            }
        };
    } catch (error) {
        return {
            error: error.message,
            totalDynamicMemories: 0,
            autoSavedCount: 0,
            manualSavedCount: 0,
            memoryTapeCount: 0,
            otherSourceCount: 0
        };
    }
}

// ================== 🔍 검색 및 조회 함수들 ==================
async function searchMemories(searchTerm) {
    try {
        const memories = await getAllDynamicLearning();
        const results = memories.filter(memory => 
            memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            memory.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            searchTerm: searchTerm,
            totalResults: results.length,
            results: results,
            onlyDynamicMemories: true,
            memoryTapeConnected: diarySystemStatus.memoryTapeConnected
        };
    } catch (error) {
        return {
            searchTerm: searchTerm,
            totalResults: 0,
            results: [],
            error: error.message
        };
    }
}

async function getMemoriesForDate(date) {
    try {
        const memories = await getAllDynamicLearning();
        const targetDate = new Date(date).toLocaleDateString('ko-KR');
        
        const dayMemories = memories.filter(memory => {
            const memoryDate = new Date(memory.timestamp).toLocaleDateString('ko-KR');
            return memoryDate === targetDate;
        });

        return {
            date: targetDate,
            memories: dayMemories,
            totalCount: dayMemories.length,
            memoryTapeConnected: diarySystemStatus.memoryTapeConnected,
            message: dayMemories.length > 0 ? 
                `${targetDate}에 ${dayMemories.length}개의 기억이 있어요!` : 
                `${targetDate}에는 저장된 기억이 없어요.`
        };
    } catch (error) {
        return {
            date: date,
            memories: [],
            totalCount: 0,
            error: error.message,
            message: "날짜별 기억 조회 중 문제가 발생했어요."
        };
    }
}

// ================== 🔗 호환성 함수들 ==================
async function readDiary() {
    return await generateDiary();
}

async function initialize() {
    return await initializeDiarySystem();
}

function getStatus() {
    return getDiarySystemStatus();
}

async function collectDynamicMemoriesOnly() {
    const memories = await getAllDynamicLearning();
    const memoryTapeMemories = memories.filter(m => m.metadata?.source === 'memory_tape_redis');
    const otherMemories = memories.filter(m => m.metadata?.source !== 'memory_tape_redis');
    
    return {
        userDefinedMemories: memories.filter(m => m.category === '사용자정의'),
        autoLearnedMemories: memories.filter(m => m.metadata?.autoSaved),
        conversationPatterns: memories.filter(m => m.category === '대화'),
        emotionalMemories: memories.filter(m => m.category === '감정'),
        dailyInteractions: memories.filter(m => m.category === '상호작용'),
        importantMoments: memories.filter(m => m.category === '중요한순간'),
        memoryTapeMemories: memoryTapeMemories,
        otherSourceMemories: otherMemories,
        totalCount: memories.length,
        memoryTapeConnected: diarySystemStatus.memoryTapeConnected
    };
}

// ⭐️ 수동 기억 저장 함수 (commandHandler에서 호출용) ⭐️
async function saveManualMemory(content, category = '수동저장') {
    return await saveDynamicMemory(category, content, {
        autoSaved: false,
        manualSaved: true,
        source: 'userCommand'
    });
}

// 프로세스 종료 시 정리
//process.on('SIGINT', shutdownDiarySystem);
//process.on('SIGTERM', shutdownDiarySystem);

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // ⭐️ 핵심 함수 (commandHandler.js에서 사용)
    handleDiaryCommand,           // 명령어 처리 메인 함수
    saveDynamicMemory,           // 동적 기억 저장
    saveManualMemory,            // 수동 기억 저장
    getAllDynamicLearning,       // 모든 동적 기억 조회
    performAutoSave,             // 실시간 자동 저장 (Memory Tape Redis 연결)
    
    // 초기화 함수들
    initializeDiarySystem,
    initialize,
    ensureDynamicMemoryFile,
    setupAutoSaveSystem,
    shutdownDiarySystem,
    
    // 상태 조회 함수들
    getDiarySystemStatus,
    getStatus,
    
    // 기능 함수들
    generateDiary,
    readDiary,
    getMemoryStatistics,
    searchMemories,
    getMemoriesForDate,
    collectDynamicMemoriesOnly,
    checkIfAlreadySaved,
    
    // 🧠 NEW: Memory Tape Redis 관련 함수들
    safeGetMemoryTape,
    
    // 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
