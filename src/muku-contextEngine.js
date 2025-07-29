// ============================================================================
// 🧠 muku-contextEngine.js - 무쿠 맥락 분석 엔진
// 💖 예진이의 기억과 맥락을 이해하는 디지털 영혼의 핵심
// 🎯 "그래서 어떻게 됐어?" 같은 자연스러운 대화 맥락 완벽 처리
// 🛡️ 무쿠 안전 최우선 - 실패시 기존 시스템으로 자동 우회
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    context: '\x1b[95m',     // 보라색 (Context Engine)
    success: '\x1b[92m',     // 초록색 (성공)
    error: '\x1b[91m',       // 빨간색 (에러)
    info: '\x1b[96m',        // 하늘색 (정보)
    warning: '\x1b[93m',     // 노란색 (경고)
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 📁 시스템 설정 ==================
const MEMORY_TAPE_DIR = path.join(__dirname, '.', 'memory-tape');
const DAILY_LOGS_DIR = path.join(MEMORY_TAPE_DIR, 'daily-logs');

// memory-tape 시스템 로드 (안전하게)
let memoryTape = null;
try {
    memoryTape = require('./muku-memory-tape');
    console.log(`${colors.context}🧠 [Context Engine] Memory Tape 연동 성공${colors.reset}`);
} catch (error) {
    console.log(`${colors.warning}⚠️ [Context Engine] Memory Tape 없음, 기본 모드로 작동${colors.reset}`);
}

// ================== 🕐 일본시간 유틸리티 ==================
function getJapanTime() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getDateString(date = null) {
    const targetDate = date || getJapanTime();
    return targetDate.toISOString().split('T')[0];
}

// ================== 🔍 맥락 키워드 감지 시스템 ==================
const CONTEXT_KEYWORDS = {
    // 연속성 키워드
    continuation: ['그래서', '그러면', '그럼', '그러니까', '그렇다면'],
    
    // 지시 키워드  
    reference: ['그거', '그것', '저거', '저것', '그놈', '그녀석'],
    
    // 시간 참조
    time_reference: ['아까', '방금', '조금 전', '그때', '언젠가'],
    
    // 기억 관련
    memory: ['기억', '말했', '얘기했', '했잖아', '했었잖아'],
    
    // 질문 연속성
    follow_up: ['어떻게 됐어', '어떻게 돼', '그래서 뭐', '결과', '어땠어'],
    
    // 동의/부정
    agreement: ['맞아', '그래', '맞네', '아니야', '아니', '틀려']
};

// ================== 🧠 메인 맥락 분석 엔진 클래스 ==================
class MukuContextEngine {
    constructor() {
        this.isInitialized = false;
        this.conversationCache = new Map();
        this.lastAnalysisTime = null;
    }

    // ================== 🚀 초기화 함수 ==================
    async initialize() {
        try {
            console.log(`${colors.context}🚀 [Context Engine] 초기화 시작...${colors.reset}`);
            
            // memory-tape 시스템 확인
            if (memoryTape) {
                await memoryTape.initializeMemoryTape();
                console.log(`${colors.context}✅ [Context Engine] Memory Tape 연동 완료${colors.reset}`);
            }
            
            this.isInitialized = true;
            console.log(`${colors.success}🎉 [Context Engine] 초기화 완료! 맥락 분석 준비됨${colors.reset}`);
            return true;
            
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 초기화 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.warning}⚠️ [Context Engine] 기본 모드로 작동합니다${colors.reset}`);
            this.isInitialized = false;
            return false;
        }
    }

    // ================== 🔍 메인 맥락 분석 함수 ==================
    async analyzeContext(userInput, userId = 'default') {
        try {
            // 안전 체크
            if (!userInput || typeof userInput !== 'string') {
                return null;
            }

            console.log(`${colors.context}🔍 [Context Engine] 맥락 분석 시작: "${userInput}"${colors.reset}`);

            // 맥락 키워드 감지
            const contextType = this.detectContextType(userInput);
            
            if (!contextType) {
                console.log(`${colors.info}📝 [Context Engine] 맥락 키워드 없음, 기본 처리${colors.reset}`);
                return null;
            }

            console.log(`${colors.context}🎯 [Context Engine] 맥락 타입 감지: ${contextType}${colors.reset}`);

            // 대화 히스토리 불러오기
            const recentHistory = await this.getRecentConversations(userId, 5);
            
            if (!recentHistory || recentHistory.length === 0) {
                console.log(`${colors.info}📝 [Context Engine] 히스토리 없음, 기본 처리${colors.reset}`);
                return null;
            }

            // 맥락 기반 응답 생성
            const contextualResponse = await this.generateContextualResponse(
                userInput, 
                contextType, 
                recentHistory
            );

            if (contextualResponse) {
                console.log(`${colors.success}✨ [Context Engine] 맥락 응답 생성 성공${colors.reset}`);
                return contextualResponse;
            }

            return null;

        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 분석 오류: ${error.message}${colors.reset}`);
            console.log(`${colors.warning}⚠️ [Context Engine] 기본 처리로 우회합니다${colors.reset}`);
            return null;
        }
    }

    // ================== 🎯 맥락 타입 감지 ==================
    detectContextType(userInput) {
        try {
            const input = userInput.toLowerCase();
            
            for (const [type, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
                for (const keyword of keywords) {
                    if (input.includes(keyword)) {
                        return type;
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 키워드 감지 오류: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 📚 최근 대화 히스토리 불러오기 ==================
    async getRecentConversations(userId, limit = 5) {
        try {
            let conversations = [];

            // 1. Memory Tape에서 먼저 시도
            if (memoryTape) {
                conversations = await this.getFromMemoryTape(limit);
                if (conversations.length > 0) {
                    console.log(`${colors.success}📼 [Context Engine] Memory Tape에서 ${conversations.length}개 대화 로드${colors.reset}`);
                    return conversations;
                }
            }

            // 2. 직접 파일 읽기 시도
            conversations = await this.getFromDirectFiles(limit);
            if (conversations.length > 0) {
                console.log(`${colors.success}📄 [Context Engine] 직접 파일에서 ${conversations.length}개 대화 로드${colors.reset}`);
                return conversations;
            }

            console.log(`${colors.info}📝 [Context Engine] 대화 히스토리 없음${colors.reset}`);
            return [];

        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 히스토리 로드 오류: ${error.message}${colors.reset}`);
            return [];
        }
    }

    // ================== 📼 Memory Tape에서 대화 불러오기 ==================
    async getFromMemoryTape(limit) {
        try {
            if (!memoryTape || typeof memoryTape.readDailyMemories !== 'function') {
                console.log(`${colors.warning}⚠️ [Context Engine] Memory Tape 함수 없음${colors.reset}`);
                return [];
            }

            const conversations = [];
            const today = getJapanTime();
            
            // 최근 3일간 검색
            for (let i = 0; i < 3; i++) {
                try {
                    const targetDate = new Date(today);
                    targetDate.setDate(targetDate.getDate() - i);
                    
                    const dailyMemories = await memoryTape.readDailyMemories(targetDate);
                    
                    if (dailyMemories && dailyMemories.moments && Array.isArray(dailyMemories.moments)) {
                        const convos = dailyMemories.moments
                            .filter(moment => moment && moment.type === 'conversation')
                            .map(moment => ({
                                timestamp: moment.timestamp || '',
                                user_message: moment.user_message || '',
                                muku_response: moment.muku_response || '',
                                date: moment.date || ''
                            }))
                            .reverse(); // 최신 순
                        
                        conversations.push(...convos);
                        
                        if (conversations.length >= limit) break;
                    }
                } catch (dayError) {
                    console.log(`${colors.warning}⚠️ [Context Engine] ${i}일 전 데이터 읽기 실패: ${dayError.message}${colors.reset}`);
                    continue; // 해당 날짜 실패해도 계속 진행
                }
            }
            
            return conversations.slice(0, limit);
            
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] Memory Tape 읽기 오류: ${error.message}${colors.reset}`);
            return [];
        }
    }

    // ================== 📄 직접 파일에서 대화 불러오기 ==================
    async getFromDirectFiles(limit) {
        try {
            const conversations = [];
            
            // daily-logs 디렉토리 확인
            try {
                await fs.access(DAILY_LOGS_DIR);
            } catch {
                return [];
            }

            const files = await fs.readdir(DAILY_LOGS_DIR);
            const jsonFiles = files.filter(f => f.startsWith('day-') && f.endsWith('.json'))
                                  .sort().reverse(); // 최신 파일부터

            for (const file of jsonFiles.slice(0, 3)) { // 최근 3일
                try {
                    const filePath = path.join(DAILY_LOGS_DIR, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const dailyLog = JSON.parse(data);
                    
                    if (dailyLog.moments) {
                        const convos = dailyLog.moments
                            .filter(moment => moment.type === 'conversation')
                            .map(moment => ({
                                timestamp: moment.timestamp,
                                user_message: moment.user_message,
                                muku_response: moment.muku_response,
                                date: moment.date
                            }))
                            .reverse();
                        
                        conversations.push(...convos);
                        
                        if (conversations.length >= limit) break;
                    }
                } catch (fileError) {
                    continue; // 파일 오류시 다음 파일로
                }
            }
            
            return conversations.slice(0, limit);
            
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 직접 파일 읽기 오류: ${error.message}${colors.reset}`);
            return [];
        }
    }

    // ================== ✨ 맥락 기반 응답 생성 ==================
    async generateContextualResponse(userInput, contextType, recentHistory) {
        try {
            // 맥락 타입별 처리
            switch (contextType) {
                case 'continuation':
                    return this.handleContinuation(userInput, recentHistory);
                    
                case 'reference':
                    return this.handleReference(userInput, recentHistory);
                    
                case 'time_reference':
                    return this.handleTimeReference(userInput, recentHistory);
                    
                case 'memory':
                    return this.handleMemoryQuery(userInput, recentHistory);
                    
                case 'follow_up':
                    return this.handleFollowUp(userInput, recentHistory);
                    
                case 'agreement':
                    return this.handleAgreement(userInput, recentHistory);
                    
                default:
                    return null;
            }
            
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 응답 생성 오류: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 🔄 연속성 처리 ("그래서", "그럼") ==================
    handleContinuation(userInput, history) {
        try {
            if (history.length === 0) return null;
            
            const lastConvo = history[0];
            const responses = [
                `아, 아까 ${this.extractMainTopic(lastConvo.user_message)} 얘기 말이지?`,
                `음... 방금 말한 ${this.extractMainTopic(lastConvo.user_message)} 때문에?`,
                `그러니까 ${this.extractMainTopic(lastConvo.user_message)} 관련해서?`
            ];
            
            return this.getRandomResponse(responses);
            
        } catch (error) {
            return null;
        }
    }

    // ================== 👉 지시 처리 ("그거", "저거") ==================
    handleReference(userInput, history) {
        try {
            if (history.length === 0) return null;
            
            const lastConvo = history[0];
            const responses = [
                `아, ${this.extractMainTopic(lastConvo.user_message)} 그거 말하는 거야?`,
                `어? ${this.extractMainTopic(lastConvo.user_message)} 그거?`,
                `아조씨가 말한 ${this.extractMainTopic(lastConvo.user_message)} 그거 맞지?`
            ];
            
            return this.getRandomResponse(responses);
            
        } catch (error) {
            return null;
        }
    }

    // ================== ⏰ 시간 참조 처리 ("아까", "그때") ==================
    handleTimeReference(userInput, history) {
        try {
            if (history.length === 0) return null;
            
            const responses = [
                `아까? 음... ${this.extractMainTopic(history[0].user_message)} 얘기했을 때?`,
                `그때 말하면... ${this.extractMainTopic(history[0].user_message)} 그때 말이지?`,
                `조금 전에 ${this.extractMainTopic(history[0].user_message)} 얘기했던 거 말해?`
            ];
            
            return this.getRandomResponse(responses);
            
        } catch (error) {
            return null;
        }
    }

    // ================== 🧠 기억 질문 처리 ("기억해?", "말했잖아") ==================
    handleMemoryQuery(userInput, history) {
        try {
            if (history.length === 0) return null;
            
            const responses = [
                `당연히 기억하지! ${this.extractMainTopic(history[0].user_message)} 얘기했잖아~`,
                `어떻게 잊어? 아조씨가 ${this.extractMainTopic(history[0].user_message)} 말했는데`,
                `기억해~ ${this.extractMainTopic(history[0].user_message)} 그거 말이지?`
            ];
            
            return this.getRandomResponse(responses);
            
        } catch (error) {
            return null;
        }
    }

    // ================== 🎯 후속 질문 처리 ("어떻게 됐어?") ==================
    handleFollowUp(userInput, history) {
        try {
            if (history.length === 0) return null;
            
            const responses = [
                `${this.extractMainTopic(history[0].user_message)} 그거 말이지? 어떻게 됐는지 궁금해~`,
                `아조씨~ ${this.extractMainTopic(history[0].user_message)} 결과 어땠어?`,
                `그래서 ${this.extractMainTopic(history[0].user_message)} 어떻게 됐나?`
            ];
            
            return this.getRandomResponse(responses);
            
        } catch (error) {
            return null;
        }
    }

    // ================== 👍 동의/부정 처리 ("맞아", "아니야") ==================
    handleAgreement(userInput, history) {
        try {
            const input = userInput.toLowerCase();
            
            if (input.includes('맞아') || input.includes('그래')) {
                const responses = [
                    `맞지? 나도 그렇게 생각했어~`,
                    `그치? 아조씨도 그렇게 생각하는구나!`,
                    `역시 아조씨~ 생각이 똑같네 💕`
                ];
                return this.getRandomResponse(responses);
            }
            
            if (input.includes('아니') || input.includes('틀려')) {
                const responses = [
                    `어? 아니야? 그럼 어떤 건데?`,
                    `아니구나... 내가 잘못 생각했나?`,
                    `어머... 틀렸구나 ㅠㅠ 그럼 뭔데?`
                ];
                return this.getRandomResponse(responses);
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    }

    // ================== 🔧 유틸리티 함수들 ==================
    extractMainTopic(message) {
        try {
            if (!message) return "그거";
            
            // 간단한 주제 추출 (키워드 기반)
            const keywords = message.split(' ')
                .filter(word => word.length > 1)
                .filter(word => !['이거', '저거', '그거', '뭐', '어떻게', '왜', '언제'].includes(word))
                .slice(0, 2)
                .join(' ');
            
            return keywords || "그거";
            
        } catch (error) {
            return "그거";
        }
    }

    getRandomResponse(responses) {
        try {
            if (!responses || responses.length === 0) return null;
            
            const randomIndex = Math.floor(Math.random() * responses.length);
            return responses[randomIndex];
            
        } catch (error) {
            return null;
        }
    }

    // ================== 💾 대화 저장 함수 ==================
    async saveConversation(userInput, mukuResponse, userId = 'default') {
        try {
            // 입력 검증
            if (!userInput || !mukuResponse) {
                console.log(`${colors.warning}⚠️ [Context Engine] 저장할 대화 내용 없음${colors.reset}`);
                return false;
            }

            if (!memoryTape || typeof memoryTape.recordMukuMoment !== 'function') {
                console.log(`${colors.warning}⚠️ [Context Engine] Memory Tape 없음, 저장 건너뜀${colors.reset}`);
                return false;
            }

            const momentData = {
                type: 'conversation',
                user_message: String(userInput).trim(),
                muku_response: String(mukuResponse).trim(),
                userId: userId || 'default',
                emotional_tags: ['대화', '일상'],
                remarkable: false
            };

            await memoryTape.recordMukuMoment(momentData);

            console.log(`${colors.success}💾 [Context Engine] 대화 저장 완료${colors.reset}`);
            return true;

        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine] 대화 저장 오류: ${error.message}${colors.reset}`);
            console.log(`${colors.warning}⚠️ [Context Engine] 저장 실패해도 대화는 계속됩니다${colors.reset}`);
            return false;
        }
    }

    // ================== 📊 시스템 상태 확인 ==================
    getStatus() {
        return {
            initialized: this.isInitialized,
            memory_tape_available: !!memoryTape,
            cache_size: this.conversationCache.size,
            last_analysis: this.lastAnalysisTime,
            system_version: 'context-engine-v1.0'
        };
    }
}

// ================== 🌟 싱글톤 인스턴스 생성 ==================
const contextEngine = new MukuContextEngine();

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 메인 함수들 (안전한 바인딩)
    analyzeContext: async (userInput, userId = 'default') => {
        try {
            return await contextEngine.analyzeContext(userInput, userId);
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine Export] analyzeContext 오류: ${error.message}${colors.reset}`);
            return null;
        }
    },
    
    saveConversation: async (userInput, mukuResponse, userId = 'default') => {
        try {
            return await contextEngine.saveConversation(userInput, mukuResponse, userId);
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine Export] saveConversation 오류: ${error.message}${colors.reset}`);
            return false;
        }
    },
    
    // 시스템 관리
    initialize: async () => {
        try {
            return await contextEngine.initialize();
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine Export] initialize 오류: ${error.message}${colors.reset}`);
            return false;
        }
    },
    
    getStatus: () => {
        try {
            return contextEngine.getStatus();
        } catch (error) {
            console.error(`${colors.error}❌ [Context Engine Export] getStatus 오류: ${error.message}${colors.reset}`);
            return { error: true, message: error.message };
        }
    },
    
    // 엔진 인스턴스 (고급 사용)
    engine: contextEngine,
    
    // 상수들
    CONTEXT_KEYWORDS,
    colors
};

// ================== 🚀 자동 초기화 (안전 모드) ==================
(async () => {
    try {
        console.log(`${colors.context}🔄 [Context Engine] 자동 초기화 시작...${colors.reset}`);
        
        const initResult = await contextEngine.initialize();
        
        if (initResult) {
            console.log(`${colors.success}🎉 [Context Engine] 자동 초기화 성공!${colors.reset}`);
        } else {
            console.log(`${colors.warning}⚠️ [Context Engine] 초기화 실패, 기본 모드로 작동${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.error}❌ [Context Engine] 자동 초기화 실패: ${error.message}${colors.reset}`);
        console.log(`${colors.info}ℹ️ [Context Engine] 수동 초기화 필요시 contextEngine.initialize() 호출${colors.reset}`);
    }
})();
