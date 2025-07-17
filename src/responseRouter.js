// src/responseRouter.js - 응답 라우팅 로직
const { SpecialResponses } = require('./specialResponses');
const { GPTResponses } = require('./gptResponses');
const { EmotionalResponses } = require('./emotionalResponses');
const { MemorialVisitDetector } = require('./memorialVisitDetector');
const { BirthdayDetector } = require('./birthdayDetector');
const { PhotoRequestDetector } = require('./photoRequestDetector');

class ResponseRouter {
    constructor() {
        this.specialResponses = new SpecialResponses();
        this.gptResponses = new GPTResponses();
        this.emotionalResponses = new EmotionalResponses();
        
        // 감지기들
        this.memorialDetector = new MemorialVisitDetector();
        this.birthdayDetector = new BirthdayDetector();
        this.photoDetector = new PhotoRequestDetector();
    }

    /**
     * 메시지 타입에 따라 적절한 응답 생성
     */
    async generateResponse(data) {
        const { message, userId, context, mood, conversationHistory } = data;

        // 1. 긴급/특수 상황 감지 (최우선)
        const emergencyResponse = await this.checkEmergencyResponses(message, userId, context);
        if (emergencyResponse) return emergencyResponse;

        // 2. 납골당 방문 감지
        const memorialResponse = await this.memorialDetector.detect(message, context);
        if (memorialResponse) {
            return await this.specialResponses.getMemorialResponse(memorialResponse, mood);
        }

        // 3. 생일 관련 감지
        const birthdayResponse = await this.birthdayDetector.detect(message, context);
        if (birthdayResponse) {
            return await this.specialResponses.getBirthdayResponse(birthdayResponse, mood);
        }

        // 4. 사진 요청 감지
        const photoRequest = await this.photoDetector.detect(message, context);
        if (photoRequest) {
            return await this.specialResponses.getPhotoResponse(photoRequest, mood);
        }

        // 5. 특수 키워드 응답
        const specialResponse = await this.specialResponses.checkSpecialKeywords(message, context);
        if (specialResponse) return specialResponse;

        // 6. 감정 조절이 필요한 상황
        const emotionalResponse = await this.emotionalResponses.checkEmotionalNeeds(
            message, mood, conversationHistory
        );
        if (emotionalResponse) return emotionalResponse;

        // 7. 일반 GPT 응답
        return await this.gptResponses.generateResponse({
            message,
            userId,
            context,
            mood,
            conversationHistory
        });
    }

    /**
     * 긴급/특수 상황 감지
     */
    async checkEmergencyResponses(message, userId, context) {
        // 삐짐 상태 체크
        if (context.emotions?.includes('sulky') || context.emotions?.includes('angry')) {
            return await this.emotionalResponses.getSulkyResponse(message, context);
        }

        // 우울/힘든 상황 체크
        if (context.emotions?.includes('sad') || context.emotions?.includes('depressed')) {
            return await this.emotionalResponses.getComfortResponse(message, context);
        }

        // 과도한 애정 표현 (당황)
        if (context.intensity > 8 && context.emotions?.includes('love')) {
            return await this.emotionalResponses.getShyResponse(message, context);
        }

        return null;
    }

    /**
     * 응답 타입별 통계 (디버깅용)
     */
    getResponseStats() {
        return {
            totalResponses: this.responseCount || 0,
            responseTypes: {
                emergency: this.emergencyCount || 0,
                memorial: this.memorialCount || 0,
                birthday: this.birthdayCount || 0,
                photo: this.photoCount || 0,
                special: this.specialCount || 0,
                emotional: this.emotionalCount || 0,
                gpt: this.gptCount || 0
            }
        };
    }

    /**
     * 응답 우선순위 검증 (테스트용)
     */
    async testResponsePriority(message, context) {
        const tests = [
            { name: 'emergency', fn: () => this.checkEmergencyResponses(message, 'test', context) },
            { name: 'memorial', fn: () => this.memorialDetector.detect(message, context) },
            { name: 'birthday', fn: () => this.birthdayDetector.detect(message, context) },
            { name: 'photo', fn: () => this.photoDetector.detect(message, context) },
            { name: 'special', fn: () => this.specialResponses.checkSpecialKeywords(message, context) }
        ];

        const results = {};
        for (const test of tests) {
            try {
                results[test.name] = await test.fn();
            } catch (error) {
                results[test.name] = { error: error.message };
            }
        }

        return results;
    }
}

module.exports = { ResponseRouter };
