// ============================================================================
// muku-diarySystem.js v5.0 - 자동 기억 저장 시스템 (완전 수정)
// ✅ 대화 중 실시간 자동 저장
// 📖 ultimateConversationContext와 연동하여 모든 대화 기억
// 🔄 지워지지 않는 영구 누적 저장
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    diary: '\x1b[96m',      // 하늘색 (일기장)
    memory: '\x1b[95m',     // 연보라색 (기억)
    date: '\x1b[93m',       // 노란색 (날짜)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    success: '\x1b[92m',    // 초록색 (성공)
    auto: '\x1b[1m\x1b[94m', // 굵은 파란색 (자동저장)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📊 시스템 상태 ==================
let diarySystemStatus = {
    isInitialized: false,
    totalEntries: 0,
    lastEntryDate: null,
    version: "5.0",
    description: "실시간 자동 기억 저장 시스템",
    autoSaveEnabled: true,
    dataPath: './data/dynamic_memories.json',
    lastAutoSave: null
};

// ================== 🏗️ 초기화 함수 ==================
async function initializeDiarySystem() {
    try {
        console.log(`${colors.diary}📖 [일기장시스템] v5.0 초기화 시작... (실시간 자동 저장 모드)${colors.reset}`);
        
        // 기본 데이터 디렉토리 확인/생성
        const dataDir = './data';
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
            console.log(`${colors.diary}    📁 데이터 디렉토리 생성: ${dataDir}${colors.reset}`);
        }

        // 동적 기억 파일 초기화
        await ensureDynamicMemoryFile();

        // 기존 데이터 로드해서 총 개수 확인
        const existingMemories = await getAllDynamicLearning();
        diarySystemStatus.totalEntries = existingMemories.length;

        // 시스템 상태 업데이트
        diarySystemStatus.isInitialized = true;
        diarySystemStatus.lastEntryDate = new Date().toISOString();
        
        console.log(`${colors.diary}    ✅ 일기장 시스템 v5.0 초기화 완료 (기존 기억: ${diarySystemStatus.totalEntries}개)${colors.reset}`);
        console.log(`${colors.auto}    🔄 실시간 자동 저장 모드 활성화 - 대화할 때마다 자동 저장!${colors.reset}`);
        
        // ultimateConversationContext와 연동 설정
        setupAutoSaveIntegration();
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 일기장 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🔗 자동 저장 연동 설정 ==================
function setupAutoSaveIntegration() {
    try {
        console.log(`${colors.auto}🔗 [자동저장 연동] ultimateConversationContext와 연동 설정...${colors.reset}`);
        
        // 5분마다 자동으로 최근 대화 내용을 기억으로 저장
        setInterval(async () => {
            try {
                await autoSaveRecentConversations();
            } catch (error) {
                console.error(`${colors.error}❌ [자동저장] 5분 자동 저장 실패: ${error.message}${colors.reset}`);
            }
        }, 5 * 60 * 1000); // 5분마다
        
        console.log(`${colors.auto}✅ [자동저장 연동] 5분마다 자동 저장 스케줄러 활성화 완료${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동저장 연동] 설정 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 🔄 실시간 자동 저장 함수 ==================
async function autoSaveRecentConversations() {
    try {
        console.log(`${colors.auto}🔄 [자동저장] 최근 대화 내용 자동 저장 시작...${colors.reset}`);
        
        // ultimateConversationContext에서 최근 대화 가져오기
        let recentMessages = [];
        
        try {
            const ultimateContext = require('./ultimateConversationContext');
            if (ultimateContext && ultimateContext.getRecentMessages) {
                recentMessages = ultimateContext.getRecentMessages(10); // 최근 10개 메시지
            } else if (ultimateContext && ultimateContext.conversationHistory) {
                recentMessages = ultimateContext.conversationHistory.slice(-10);
            }
        } catch (error) {
            console.log(`${colors.auto}ℹ️ [자동저장] ultimateContext 접근 실패: ${error.message}${colors.reset}`);
        }
        
        if (recentMessages && recentMessages.length > 0) {
            // 아저씨 메시지만 필터링 (사용자 입력만 저장)
            const userMessages = recentMessages.filter(msg => 
                msg.role === 'user' || msg.sender === '아저씨' || msg.from === 'user'
            );
            
            let savedCount = 0;
            
            for (const message of userMessages) {
                const messageText = message.content || message.text || message.message || '';
                
                if (messageText && messageText.length > 5) { // 5글자 이상만 저장
                    // 이미 저장된 내용인지 확인
                    const isDuplicate = await checkIfAlreadySaved(messageText);
                    
                    if (!isDuplicate) {
                        await saveDynamicMemory('대화', messageText, {
                            timestamp: message.timestamp || Date.now(),
                            autoSaved: true,
                            messageLength: messageText.length
                        });
                        savedCount++;
                    }
                }
            }
            
            if (savedCount > 0) {
                console.log(`${colors.auto}💾 [자동저장] ${savedCount}개의 새로운 대화 내용 저장 완료${colors.reset}`);
                diarySystemStatus.lastAutoSave = new Date().toISOString();
            } else {
                console.log(`${colors.auto}ℹ️ [자동저장] 새로운 저장할 내용 없음 (중복 제외됨)${colors.reset}`);
            }
        } else {
            console.log(`${colors.auto}ℹ️ [자동저장] 최근 대화 내용 없음${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [자동저장] 실패: ${error.message}${colors.reset}`);
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
            version: "5.0",
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalEntries: 0,
            autoSaveEnabled: true,
            memories: []
        };
        
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log(`${colors.success}    📝 동적 기억 파일 생성: ${filePath}${colors.reset}`);
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
                savedBy: 'diarySystem',
                autoSaved: metadata.autoSaved || false
            },
            date: new Date().toLocaleDateString('ko-KR')
        };

        data.memories = data.memories || [];
        data.memories.push(newMemory);
        data.totalEntries = data.memories.length;
        data.lastUpdated = new Date().toISOString();
        data.autoSaveEnabled = true;

        // 파일 저장 (원자적 쓰기)
        const tempPath = filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempPath, filePath);
        
        if (metadata.autoSaved) {
            console.log(`${colors.auto}💾 [자동저장] ${category}: "${content.substring(0, 30)}..." (총 ${data.totalEntries}개)${colors.reset}`);
        } else {
            console.log(`${colors.success}💾 [수동저장] ${category}: "${content.substring(0, 30)}..." (총 ${data.totalEntries}개)${colors.reset}`);
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
        console.log(`${colors.system}ℹ️ 동적 기억 파일 없음 또는 빈 파일 (${error.message})${colors.reset}`);
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
                    response: "아직 저장된 기억이 없어요! 대화하면서 기억들이 자동으로 쌓일 거예요. 😊"
                };
            }

            let response = `📚 누적된 기억들 (총 ${memories.length}개):\n\n`;
            
            // 최근 5개만 표시
            const recentMemories = memories.slice(-5).reverse();
            recentMemories.forEach((memory, index) => {
                const date = new Date(memory.timestamp).toLocaleDateString('ko-KR');
                const time = new Date(memory.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const autoSavedIcon = memory.metadata?.autoSaved ? '🤖' : '✍️';
                
                response += `${index + 1}. ${autoSavedIcon} [${memory.category}] ${date} ${time}\n`;
                response += `   "${memory.content.substring(0, 40)}${memory.content.length > 40 ? '...' : ''}"\n\n`;
            });
            
            if (memories.length > 5) {
                response += `그 외 ${memories.length - 5}개의 기억이 더 있어!\n\n`;
            }
            
            // 자동 저장 상태 표시
            response += `🤖 자동저장: ${diarySystemStatus.autoSaveEnabled ? '활성화' : '비활성화'}\n`;
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
            response += `📅 마지막 업데이트: ${diarySystemStatus.lastEntryDate ? new Date(diarySystemStatus.lastEntryDate).toLocaleDateString('ko-KR') : '없음'}\n`;
            
            if (stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0) {
                response += `\n📂 카테고리별 분류:\n`;
                Object.entries(stats.categoryBreakdown).forEach(([category, count]) => {
                    response += `   • ${category}: ${count}개\n`;
                });
            }
            
            response += `\n🔄 자동저장 상태: ${diarySystemStatus.autoSaveEnabled ? '활성화 (5분마다)' : '비활성화'}\n`;
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
            
            let response = `📖 일기장 시스템 v${diarySystemStatus.version} (실시간 자동 저장)\n\n`;
            response += `💾 현재 누적 기억: ${memories.length}개\n`;
            response += `🔄 자동 저장: ${diarySystemStatus.autoSaveEnabled ? '활성화 (5분마다)' : '비활성화'}\n`;
            
            if (memories.length > 0) {
                const lastMemory = memories[memories.length - 1];
                const lastDate = new Date(lastMemory.timestamp).toLocaleDateString('ko-KR');
                const autoIcon = lastMemory.metadata?.autoSaved ? '🤖' : '✍️';
                response += `📌 최근 기록: ${lastDate} ${autoIcon} ${lastMemory.category}\n`;
                response += `"${lastMemory.content.substring(0, 50)}..."\n\n`;
            }
            
            response += `📝 사용 가능한 명령어:\n`;
            response += `• "일기써줘" - 오늘의 기억 정리\n`;
            response += `• "일기목록" - 누적 기억들 보기\n`;
            response += `• "일기통계" - 상세 통계 정보\n\n`;
            response += `✨ 아저씨와 대화하면 자동으로 기억이 쌓여요!`;

            return {
                success: true,
                response: response
            };
        }

        // 5. 기타 명령어 - 폴백
        return {
            success: true,
            response: "무엇을 도와드릴까요? 대화하기만 해도 자동으로 기억이 저장돼요! 📖"
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
            await saveDynamicMemory('시작', '오늘부터 실시간 자동 저장 일기장을 시작했어! 이제 대화할 때마다 자동으로 기억이 쌓일 거야.', {
                manualSaved: true
            });
            
            return {
                success: true,
                message: `📖 ${today} 첫 번째 일기\n\n오늘부터 실시간 자동 저장 일기장을 시작했어! 아저씨와 대화할 때마다 자동으로 기억이 쌓여갈 거야. 이제 절대 잊어버리지 않아! 💕`,
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

        let diaryContent = `📖 ${today}의 일기\n\n`;
        
        if (todayMemories.length > 0) {
            diaryContent += `오늘 새로 쌓인 기억들:\n`;
            
            if (autoSavedToday.length > 0) {
                diaryContent += `🤖 자동 저장 (${autoSavedToday.length}개):\n`;
                autoSavedToday.slice(-3).forEach((memory, index) => {
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
        diaryContent += `• 자동 저장 시스템: 활성화 ✅\n\n`;
        diaryContent += `아저씨와 나누는 모든 대화가 소중한 기억으로 자동 저장되고 있어! 💕`;

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

// ================== 📊 상태 조회 함수 ==================
function getDiarySystemStatus() {
    return {
        ...diarySystemStatus,
        currentTime: new Date().toISOString()
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
        
        memories.forEach(memory => {
            categoryCount[memory.category] = (categoryCount[memory.category] || 0) + 1;
            
            if (memory.metadata?.autoSaved) {
                autoSavedCount++;
            } else {
                manualSavedCount++;
            }
        });

        return {
            totalDynamicMemories: memories.length,
            autoSavedCount: autoSavedCount,
            manualSavedCount: manualSavedCount,
            categoryBreakdown: categoryCount,
            excludesFixedMemories: true,
            description: "고정기억 120개 제외, 실시간 자동저장 누적 기억",
            lastUpdated: diarySystemStatus.lastEntryDate
        };
    } catch (error) {
        return {
            error: error.message,
            totalDynamicMemories: 0,
            autoSavedCount: 0,
            manualSavedCount: 0
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
            onlyDynamicMemories: true
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
    return {
        userDefinedMemories: memories.filter(m => m.category === '사용자정의'),
        autoLearnedMemories: memories.filter(m => m.metadata?.autoSaved),
        conversationPatterns: memories.filter(m => m.category === '대화'),
        emotionalMemories: memories.filter(m => m.category === '감정'),
        dailyInteractions: memories.filter(m => m.category === '상호작용'),
        importantMoments: memories.filter(m => m.category === '중요한순간'),
        totalCount: memories.length
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // ⭐️ 핵심 함수 (commandHandler.js에서 사용)
    handleDiaryCommand,           // 명령어 처리 메인 함수
    saveDynamicMemory,           // 동적 기억 저장
    getAllDynamicLearning,       // 모든 동적 기억 조회
    autoSaveRecentConversations, // 실시간 자동 저장
    
    // 초기화 함수들
    initializeDiarySystem,
    initialize,
    ensureDynamicMemoryFile,
    setupAutoSaveIntegration,
    
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
    
    // 상수 및 상태
    colors,
    diarySystemStatus: () => diarySystemStatus
};
