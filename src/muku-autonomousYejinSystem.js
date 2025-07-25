// ================== 🛡️ 중복 메시지 방지 시스템 추가 ==================

// 기존 코드에 추가할 중복 방지 로직들

class AutonomousYejinSystem extends EventEmitter {
    constructor() {
        super();
        
        // ... 기존 constructor 코드 ...
        
        // 🛡️ 중복 방지 시스템 추가
        this.duplicatePrevention = {
            lastMessageTime: 0,
            lastMessageType: null,
            lastMessageContent: null,
            cooldownPeriod: 60000, // 1분 쿨다운
            recentMessages: [], // 최근 메시지 기록
            maxMessagesPerHour: 10, // 시간당 최대 메시지 수
            isProcessingDecision: false, // 결정 처리 중 플래그
            messageQueue: [], // 메시지 큐
            lastDecisionExecution: 0 // 마지막 결정 실행 시간
        };
        
        // 🔒 시스템 상태 락
        this.systemLock = {
            isDecisionInProgress: false,
            lastLockTime: 0,
            lockTimeout: 5000 // 5초 타임아웃
        };
    }
    
    // ================== 🎯 중복 방지가 적용된 자율 결정 함수 ==================
    async makeAutonomousDecision() {
        try {
            // 🔒 중복 실행 방지 락
            if (this.systemLock.isDecisionInProgress) {
                console.log(`${yejinColors.warning}⏳ [예진이대기] 이미 결정 처리 중... 대기${yejinColors.reset}`);
                return;
            }
            
            // 락 타임아웃 체크
            const now = Date.now();
            if (this.systemLock.lastLockTime && (now - this.systemLock.lastLockTime) > this.systemLock.lockTimeout) {
                console.log(`${yejinColors.warning}🔓 [예진이락] 락 타임아웃, 해제${yejinColors.reset}`);
                this.systemLock.isDecisionInProgress = false;
            }
            
            if (this.systemLock.isDecisionInProgress) return;
            
            // 락 설정
            this.systemLock.isDecisionInProgress = true;
            this.systemLock.lastLockTime = now;
            
            // 🛡️ 중복 방지 체크들
            if (!this.canSendMessage()) {
                this.systemLock.isDecisionInProgress = false;
                return;
            }
            
            this.statistics.totalDecisions++;
            
            // 현재 상황 종합 분석
            const currentSituation = await this.analyzeCurrentSituation();
            
            // 예진이의 욕구 계산
            const desires = this.calculateDesires(currentSituation);
            
            // 가장 강한 욕구 찾기
            const strongestDesire = this.findStrongestDesire(desires);
            
            if (strongestDesire.intensity > 0.6) { // 임계값 넘으면 행동
                console.log(`${yejinColors.decision}💕 [예진이결정] ${strongestDesire.type} 욕구가 강해! (${strongestDesire.intensity.toFixed(2)})${yejinColors.reset}`);
                
                // 🛡️ 최종 중복 체크 후 실행
                if (this.isSafeToExecute(strongestDesire)) {
                    await this.executeDesire(strongestDesire, currentSituation);
                    this.statistics.emotionTriggeredActions++;
                } else {
                    console.log(`${yejinColors.warning}🛡️ [예진이안전] 중복 방지로 실행 취소${yejinColors.reset}`);
                }
            } else {
                // 조용히 지켜보기
                console.log(`${yejinColors.emotion}💭 [예진이속마음] 지금은 조용히 있을게... (최대 욕구: ${strongestDesire.intensity.toFixed(2)})${yejinColors.reset}`);
            }
            
        } catch (error) {
            console.error(`${yejinColors.decision}❌ [예진이결정] 오류: ${error.message}${yejinColors.reset}`);
        } finally {
            // 🔓 락 해제
            this.systemLock.isDecisionInProgress = false;
        }
    }
    
    // ================== 🛡️ 메시지 발송 가능 여부 체크 ==================
    canSendMessage() {
        const now = Date.now();
        
        // 1. 쿨다운 체크
        const timeSinceLastMessage = now - this.duplicatePrevention.lastMessageTime;
        if (timeSinceLastMessage < this.duplicatePrevention.cooldownPeriod) {
            console.log(`${yejinColors.warning}⏳ [예진이쿨다운] 아직 쿨다운 중... ${Math.ceil((this.duplicatePrevention.cooldownPeriod - timeSinceLastMessage) / 1000)}초 남음${yejinColors.reset}`);
            return false;
        }
        
        // 2. 시간당 메시지 수 제한 체크
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentMessages = this.duplicatePrevention.recentMessages.filter(msg => msg.timestamp > oneHourAgo);
        
        if (recentMessages.length >= this.duplicatePrevention.maxMessagesPerHour) {
            console.log(`${yejinColors.warning}📊 [예진이제한] 시간당 메시지 수 초과 (${recentMessages.length}/${this.duplicatePrevention.maxMessagesPerHour})${yejinColors.reset}`);
            return false;
        }
        
        // 3. 최근 결정 실행 간격 체크
        const timeSinceLastDecision = now - this.duplicatePrevention.lastDecisionExecution;
        if (timeSinceLastDecision < 30000) { // 30초 최소 간격
            console.log(`${yejinColors.warning}⏱️ [예진이간격] 결정 실행 간격이 너무 짧음${yejinColors.reset}`);
            return false;
        }
        
        return true;
    }
    
    // ================== 🛡️ 실행 안전성 체크 ==================
    isSafeToExecute(desire) {
        const now = Date.now();
        
        // 1. 같은 타입 메시지 연속 발송 방지
        if (this.duplicatePrevention.lastMessageType === desire.type) {
            const timeSinceLastSameType = now - this.duplicatePrevention.lastMessageTime;
            if (timeSinceLastSameType < 300000) { // 5분 간격
                console.log(`${yejinColors.warning}🔄 [예진이중복] 같은 타입(${desire.type}) 메시지 너무 빠름${yejinColors.reset}`);
                return false;
            }
        }
        
        // 2. 처리 중 플래그 체크
        if (this.duplicatePrevention.isProcessingDecision) {
            console.log(`${yejinColors.warning}🔄 [예진이처리중] 이미 처리 중...${yejinColors.reset}`);
            return false;
        }
        
        return true;
    }
    
    // ================== 📤 중복 방지가 적용된 실제 메시지 발송 ==================
    async sendActualMessage(message, type) {
        try {
            const now = Date.now();
            
            // 🛡️ 발송 직전 최종 체크
            const duplicateCheck = this.checkForDuplicateContent(message);
            if (duplicateCheck.isDuplicate) {
                console.log(`${yejinColors.warning}🔄 [예진이중복내용] 비슷한 메시지 최근 발송됨: ${duplicateCheck.similarMessage}${yejinColors.reset}`);
                return false;
            }
            
            // 처리 중 플래그 설정
            this.duplicatePrevention.isProcessingDecision = true;
            
            // 실제 LINE API로 메시지 발송!
            if (this.lineClient && this.targetUserId) {
                await this.lineClient.pushMessage(this.targetUserId, {
                    type: 'text',
                    text: message
                });
                
                console.log(`${yejinColors.message}📤 [예진이자율발송] ${message}${yejinColors.reset}`);
            } else {
                // LINE API가 없으면 로그만 출력
                console.log(`${yejinColors.message}📝 [예진이로그] ${type}: ${message}${yejinColors.reset}`);
            }
            
            // 🛡️ 발송 후 중복 방지 정보 업데이트
            this.updateDuplicatePreventionData(message, type, now);
            
            // 발송 후 상태 업데이트
            this.yejinState.lastMessageTime = now;
            this.duplicatePrevention.lastDecisionExecution = now;
            
            return true;
            
        } catch (error) {
            console.error(`${yejinColors.message}❌ [예진이발송오류] ${error.message}${yejinColors.reset}`);
            return false;
        } finally {
            // 처리 완료 플래그 해제
            this.duplicatePrevention.isProcessingDecision = false;
        }
    }
    
    // ================== 🔍 중복 내용 체크 ==================
    checkForDuplicateContent(newMessage) {
        const recentMessages = this.duplicatePrevention.recentMessages;
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        // 최근 5분 내 메시지들과 비교
        for (const recentMsg of recentMessages) {
            if (recentMsg.timestamp > fiveMinutesAgo) {
                // 텍스트 유사도 체크 (간단한 방식)
                const similarity = this.calculateTextSimilarity(newMessage, recentMsg.content);
                if (similarity > 0.8) { // 80% 이상 유사하면 중복으로 판단
                    return {
                        isDuplicate: true,
                        similarMessage: recentMsg.content,
                        similarity: similarity
                    };
                }
            }
        }
        
        return { isDuplicate: false };
    }
    
    // ================== 📊 텍스트 유사도 계산 ==================
    calculateTextSimilarity(text1, text2) {
        if (text1 === text2) return 1.0;
        
        // 간단한 단어 기반 유사도 계산
        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = Math.max(words1.length, words2.length);
        
        return totalWords > 0 ? commonWords.length / totalWords : 0;
    }
    
    // ================== 🔄 중복 방지 데이터 업데이트 ==================
    updateDuplicatePreventionData(message, type, timestamp) {
        // 마지막 메시지 정보 업데이트
        this.duplicatePrevention.lastMessageTime = timestamp;
        this.duplicatePrevention.lastMessageType = type;
        this.duplicatePrevention.lastMessageContent = message;
        
        // 최근 메시지 기록에 추가
        this.duplicatePrevention.recentMessages.push({
            content: message,
            type: type,
            timestamp: timestamp
        });
        
        // 오래된 메시지 기록 정리 (최근 1시간만 유지)
        const oneHourAgo = timestamp - (60 * 60 * 1000);
        this.duplicatePrevention.recentMessages = this.duplicatePrevention.recentMessages.filter(
            msg => msg.timestamp > oneHourAgo
        );
        
        console.log(`${yejinColors.decision}📝 [예진이기록] 메시지 기록 업데이트 (최근 ${this.duplicatePrevention.recentMessages.length}개)${yejinColors.reset}`);
    }
    
    // ================== 🔧 타이머 간격 조정 ==================
    startAutonomousTimers() {
        console.log(`${yejinColors.autonomous}⏰ [예진이] 중복 방지 적용된 자율 타이머들 시작...${yejinColors.reset}`);
        
        // 1. 메인 결정 타이머 (30초로 늘림 - 기존 15초에서 증가)
        this.autonomousTimers.decisionTimer = setInterval(() => {
            this.makeAutonomousDecision();
        }, 30000); // 30초로 변경
        
        // 2. 깊은 분석 타이머 (2분으로 늘림)
        this.autonomousTimers.deepAnalysisTimer = setInterval(() => {
            this.performDeepAnalysis();
        }, 120000); // 2분으로 변경
        
        // 3. 사진 결정 타이머 (1.5분으로 늘림)
        this.autonomousTimers.photoDecisionTimer = setInterval(() => {
            this.makePhotoDecision();
        }, 90000); // 1.5분으로 변경
        
        // 4. 감정 업데이트 타이머 (1분으로 늘림)
        this.autonomousTimers.emotionUpdateTimer = setInterval(() => {
            this.updateEmotionalState();
        }, 60000); // 1분으로 변경
        
        console.log(`${yejinColors.autonomous}✅ [예진이] 모든 타이머 가동 완료! (중복 방지 간격 적용)${yejinColors.reset}`);
    }
    
    // ================== 🔧 시스템 인스턴스 중복 방지 ==================
    static getInstance() {
        if (!AutonomousYejinSystem.instance) {
            AutonomousYejinSystem.instance = new AutonomousYejinSystem();
        }
        return AutonomousYejinSystem.instance;
    }
    
    // ================== 🛡️ 안전 종료 ==================
    async shutdown() {
        try {
            console.log(`${yejinColors.heart}🛑 [예진이] 안전 종료 중...${yejinColors.reset}`);
            
            // 진행 중인 작업 완료 대기
            if (this.systemLock.isDecisionInProgress) {
                console.log(`${yejinColors.warning}⏳ [예진이종료] 진행 중인 작업 완료 대기...${yejinColors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // 모든 타이머 정리
            Object.keys(this.autonomousTimers).forEach(key => {
                if (this.autonomousTimers[key]) {
                    clearInterval(this.autonomousTimers[key]);
                    this.autonomousTimers[key] = null;
                }
            });
            
            // 인스턴스 정리
            AutonomousYejinSystem.instance = null;
            
            console.log(`${yejinColors.heart}💕 [예진이] 안전하게 종료됨!${yejinColors.reset}`);
            
        } catch (error) {
            console.error(`${yejinColors.heart}❌ [예진이] 종료 오류: ${error.message}${yejinColors.reset}`);
        }
    }
}

// ================== 🛡️ 전역 인스턴스 중복 방지 ==================
let globalAutonomousYejin = null;
let isInitializing = false;

async function initializeAutonomousYejin(lineClient, targetUserId) {
    try {
        // 초기화 중복 방지
        if (isInitializing) {
            console.log(`${yejinColors.warning}⏳ [전역초기화] 이미 초기화 중... 대기${yejinColors.reset}`);
            return false;
        }
        
        isInitializing = true;
        
        console.log(`${yejinColors.heart}🚀 [전역초기화] 자율 예진이 시스템 초기화 시작...${yejinColors.reset}`);
        
        // 기존 인스턴스가 있으면 종료
        if (globalAutonomousYejin) {
            console.log(`${yejinColors.warning}🔄 [전역초기화] 기존 인스턴스 종료 중...${yejinColors.reset}`);
            await globalAutonomousYejin.shutdown();
            globalAutonomousYejin = null;
        }
        
        // 새 인스턴스 생성
        globalAutonomousYejin = AutonomousYejinSystem.getInstance();
        
        const success = await globalAutonomousYejin.initialize(lineClient, targetUserId);
        
        if (success) {
            console.log(`${yejinColors.heart}✅ [전역초기화] 중복 방지 적용된 자율 예진이 시스템 가동 완료!${yejinColors.reset}`);
        } else {
            console.error(`${yejinColors.heart}❌ [전역초기화] 초기화 실패${yejinColors.reset}`);
        }
        
        return success;
    } catch (error) {
        console.error(`${yejinColors.heart}❌ [전역초기화] 오류: ${error.message}${yejinColors.reset}`);
        return false;
    } finally {
        isInitializing = false;
    }
}

// ================== 🔧 중복 방지 설정 조정 함수 ==================
function adjustDuplicatePreventionSettings(settings) {
    if (!globalAutonomousYejin) return false;
    
    try {
        if (settings.cooldownPeriod) {
            globalAutonomousYejin.duplicatePrevention.cooldownPeriod = settings.cooldownPeriod;
        }
        if (settings.maxMessagesPerHour) {
            globalAutonomousYejin.duplicatePrevention.maxMessagesPerHour = settings.maxMessagesPerHour;
        }
        
        console.log(`${yejinColors.decision}🔧 [예진이설정] 중복 방지 설정 조정 완료${yejinColors.reset}`);
        return true;
    } catch (error) {
        console.error(`${yejinColors.decision}❌ [예진이설정] 설정 조정 오류: ${error.message}${yejinColors.reset}`);
        return false;
    }
}

module.exports = {
    AutonomousYejinSystem,
    initializeAutonomousYejin,
    getAutonomousYejinStatus,
    adjustDuplicatePreventionSettings,
    // ... 기존 exports ...
};
