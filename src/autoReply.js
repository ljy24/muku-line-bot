// core/autoReply.js - 메인 진입점 (100줄 이내)
const { ResponseRouter } = require('./responseRouter');
const { ContextAnalyzer } = require('./contextAnalyzer');
const { MoodManager } = require('../managers/moodManager');
const { ConversationManager } = require('../managers/conversationManager');
const { YejinPersonality } = require('../utils/yejinPersonality');

class AutoReply {
    constructor() {
        this.responseRouter = new ResponseRouter();
        this.contextAnalyzer = new ContextAnalyzer();
        this.moodManager = new MoodManager();
        this.conversationManager = new ConversationManager();
        this.personality = new YejinPersonality();
    }

    /**
     * 메인 메시지 처리 함수
     * @param {string} message - 받은 메시지
     * @param {string} userId - 사용자 ID
     * @returns {Promise<Object>} 응답 객체
     */
    async processMessage(message, userId) {
        try {
            // 1. 메시지 분석
            const context = await this.contextAnalyzer.analyze(message, userId);
            
            // 2. 대화 맥락 업데이트
            await this.conversationManager.updateContext(userId, message, context);
            
            // 3. 기분 상태 확인
            const currentMood = await this.moodManager.getCurrentMood(userId);
            
            // 4. 응답 생성
            const response = await this.responseRouter.generateResponse({
                message,
                userId,
                context,
                mood: currentMood,
                conversationHistory: await this.conversationManager.getHistory(userId)
            });

            // 5. 응답 후처리
            await this.postProcessResponse(userId, message, response);

            return response;

        } catch (error) {
            console.error('AutoReply 처리 오류:', error);
            return this.getErrorResponse();
        }
    }

    /**
     * 응답 후처리 (기분 업데이트, 로깅 등)
     */
    async postProcessResponse(userId, message, response) {
        // 기분 상태 업데이트
        await this.moodManager.updateMoodFromInteraction(userId, message, response);
        
        // 대화 기록 저장
        await this.conversationManager.saveInteraction(userId, message, response);
        
        // 사진 전송이 포함된 경우 특별 처리
        if (response.hasPhoto) {
            await this.handlePhotoResponse(userId, response);
        }
    }

    /**
     * 사진 응답 특별 처리
     */
    async handlePhotoResponse(userId, response) {
        // 사진 전송 로그 및 추후 기억으로 활용
        console.log(`사진 응답 처리: ${response.photoType} for ${userId}`);
    }

    /**
     * 에러 응답 생성
     */
    getErrorResponse() {
        const errorMessages = [
            "어? 뭔가 이상해... 다시 말해줘",
            "아저씨... 내가 좀 멍해진 것 같아",
            "미안... 무슨 말인지 못 알아들었어",
            "잠시만... 내가 좀 정신이 없나봐"
        ];
        
        return {
            text: errorMessages[Math.floor(Math.random() * errorMessages.length)],
            type: 'error',
            hasPhoto: false
        };
    }

    /**
     * 건강 체크 (서버 상태 확인용)
     */
    healthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            components: {
                responseRouter: this.responseRouter ? 'ok' : 'error',
                contextAnalyzer: this.contextAnalyzer ? 'ok' : 'error',
                moodManager: this.moodManager ? 'ok' : 'error'
            }
        };
    }
}

module.exports = { AutoReply };
