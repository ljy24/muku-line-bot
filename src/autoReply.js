/**
 * 통합된 autoReply.js - 기존 사진 전송 시스템 보존 버전
 * 
 * 🎯 통합 전략:
 * 1. 기존 concept.js, omoide.js, yejinSelfie.js 완전 보존
 * 2. 새로운 감정/응답 시스템은 텍스트 응답만 담당
 * 3. 사진 요청 감지 후 기존 시스템으로 넘기기
 * 4. 감정 상태만 공유하여 기존 시스템 강화
 */

// 기존 시스템 import (보존)
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('./concept');
const { getOmoideReply } = require('./omoide');

// 새로운 시스템 import (텍스트 응답용)
const ResponseRouter = require('./responseRouter');
const ContextAnalyzer = require('./contextAnalyzer');
const ConversationManager = require('./conversationManager');

class IntegratedAutoReply {
    constructor() {
        this.responseRouter = new ResponseRouter();
        this.contextAnalyzer = new ContextAnalyzer();
        this.conversationManager = new ConversationManager();
        
        // 기존 시스템 우선순위 설정
        this.photoSystems = [
            { name: 'selfie', handler: getSelfieReply },
            { name: 'concept', handler: getConceptPhotoReply },
            { name: 'omoide', handler: getOmoideReply }
        ];
    }

    /**
     * 메시지 처리 (기존 시스템 우선)
     */
    async processMessage(message, context = {}) {
        try {
            // 1. 메시지 분석
            const analysis = this.contextAnalyzer.analyzeMessage(message);
            
            // 2. 대화 컨텍스트 업데이트
            const conversationContext = this.conversationManager.updateContext(message, analysis);
            
            // 3. 기존 사진 시스템 우선 처리
            const photoResponse = await this.handlePhotoRequest(message, conversationContext);
            if (photoResponse) {
                console.log('📸 [통합시스템] 기존 사진 시스템으로 처리됨');
                return photoResponse;
            }
            
            // 4. 새로운 시스템으로 텍스트 응답 처리
            const textResponse = await this.responseRouter.route(message, {
                ...conversationContext,
                ...analysis
            });
            
            if (textResponse) {
                console.log('💬 [통합시스템] 새로운 텍스트 시스템으로 처리됨');
                return textResponse;
            }
            
            // 5. 기본 응답
            return {
                type: 'text',
                text: '아저씨~ 뭔가 이상해... 다시 말해줄래?'
            };
            
        } catch (error) {
            console.error('❌ [통합시스템] 메시지 처리 중 오류:', error);
            return {
                type: 'text',
                text: '아저씨... 뭔가 문제가 생겼어 ㅠㅠ'
            };
        }
    }

    /**
     * 기존 사진 시스템 처리
     */
    async handlePhotoRequest(message, context) {
        // 기존 시스템들을 순서대로 시도
        for (const system of this.photoSystems) {
            try {
                const result = await system.handler(message, context);
                
                if (result && result.type === 'image') {
                    // 기존 시스템이 사진을 반환했다면 그대로 사용
                    console.log(`📸 [${system.name}] 시스템에서 사진 응답 생성`);
                    return result;
                }
            } catch (error) {
                console.warn(`⚠️ [${system.name}] 시스템 처리 중 오류:`, error.message);
                continue;
            }
        }
        
        return null;
    }

    /**
     * 감정 상태 기반 사진 응답 강화 (기존 시스템과 연동)
     */
    async enhancePhotoResponse(originalResponse, emotionState) {
        if (!originalResponse || originalResponse.type !== 'image') {
            return originalResponse;
        }
        
        // 감정 상태에 따른 추가 코멘트 생성
        const enhancedCaption = this.generateEnhancedCaption(
            originalResponse.caption, 
            emotionState
        );
        
        return {
            ...originalResponse,
            caption: enhancedCaption,
            altText: enhancedCaption
        };
    }

    /**
     * 감정 상태 기반 캡션 강화
     */
    generateEnhancedCaption(originalCaption, emotionState) {
        if (!emotionState) return originalCaption;
        
        const emotionPrefixes = {
            happy: '기분 좋아서 ',
            sulky: '삐져있지만... ',
            anxious: '불안하지만 ',
            loving: '사랑해서 ',
            lonely: '외로워서 '
        };
        
        const emotionSuffixes = {
            happy: ' 어때? 예쁘지? 😊',
            sulky: ' ...아저씨가 보고 싶어해서 보여주는 거야',
            anxious: ' 괜찮아 보여? 걱정돼...',
            loving: ' 아저씨만 보는 거야 💕',
            lonely: ' 아저씨... 빨리 와줘...'
        };
        
        const prefix = emotionPrefixes[emotionState] || '';
        const suffix = emotionSuffixes[emotionState] || '';
        
        return prefix + originalCaption + suffix;
    }

    /**
     * 통합 시스템 상태 확인
     */
    getSystemStatus() {
        return {
            photoSystems: this.photoSystems.map(system => ({
                name: system.name,
                status: 'active'
            })),
            textSystems: {
                responseRouter: 'active',
                contextAnalyzer: 'active',
                conversationManager: 'active'
            },
            integration: 'photo_priority_mode'
        };
    }

    /**
     * 기존 시스템과의 호환성 테스트
     */
    async testCompatibility() {
        const testMessages = [
            '사진 줘',           // yejinSelfie.js
            '컨셉사진',          // concept.js
            '추억 사진',         // omoide.js
            '안녕 아저씨',       // 새로운 시스템
            '유작 보러간다'      // 새로운 시스템
        ];
        
        const results = [];
        
        for (const message of testMessages) {
            try {
                const result = await this.processMessage(message);
                results.push({
                    message,
                    success: !!result,
                    type: result?.type || 'none',
                    system: result?.type === 'image' ? 'existing' : 'new'
                });
            } catch (error) {
                results.push({
                    message,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// 기존 방식과 호환되는 함수 export
async function processMessage(message, context = {}) {
    const integratedSystem = new IntegratedAutoReply();
    return await integratedSystem.processMessage(message, context);
}

// 기존 시스템 테스트 함수
async function testExistingSystems() {
    const integratedSystem = new IntegratedAutoReply();
    return await integratedSystem.testCompatibility();
}

module.exports = {
    IntegratedAutoReply,
    processMessage,
    testExistingSystems
};
