// src/conversationManager.js - 대화 맥락 관리
const fs = require('fs').promises;
const path = require('path');

class ConversationManager {
    constructor() {
        this.conversations = new Map(); // 메모리 내 대화 저장
        this.contextWindow = 10; // 유지할 대화 개수
        this.maxConversationAge = 24 * 60 * 60 * 1000; // 24시간
        
        // 대화 패턴 분석
        this.topicPatterns = {
            // 주제 연결 패턴
            continuing: ['그래서', '그런데', '그리고', '그러니까', '그렇다면'],
            referencing: ['그거', '저거', '그것', '그런', '저런', '아까'],
            questioning: ['왜', '어떻게', '언제', '어디서', '뭐', '누구'],
            
            // 감정 연결 패턴
            emotional: ['그래도', '하지만', '그러나', '근데', '그치만'],
            agreeing: ['맞아', '그래', '응', '네', '좋아'],
            disagreeing: ['아니', '안돼', '싫어', '거짓말', '진짜?']
        };
        
        // 주제 카테고리
        this.topics = {
            love: ['사랑', '좋아', '애정', '마음', '♥', '💕'],
            memory: ['기억', '추억', '그때', '예전', '옛날'],
            photo: ['사진', '셀카', '이미지', '모습', '얼굴'],
            daily: ['오늘', '어제', '내일', '요즘', '지금'],
            feeling: ['기분', '감정', '느낌', '마음', '상태'],
            future: ['미래', '나중', '앞으로', '계획', '약속']
        };
        
        // 파일 경로
        this.dataPath = path.join(__dirname, '../data');
        this.conversationFile = path.join(this.dataPath, 'conversation_history.json');
        this.contextFile = path.join(this.dataPath, 'conversation_context.json');
        
        // 초기화
        this.init();
    }

    /**
     * 초기화
     */
    async init() {
        try {
            // 데이터 폴더 확인
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // 기존 대화 불러오기
            await this.loadConversations();
            
            // 정리 스케줄러 시작
            this.startCleanupScheduler();
            
        } catch (error) {
            console.error('ConversationManager 초기화 오류:', error);
        }
    }

    /**
     * 대화 맥락 업데이트
     */
    async updateContext(userId, message, context) {
        try {
            // 현재 대화 가져오기
            const conversation = this.getConversation(userId);
            
            // 새 메시지 추가
            const messageData = {
                id: this.generateMessageId(),
                message: message,
                context: context,
                timestamp: new Date().toISOString(),
                analyzed: false
            };
            
            conversation.messages.push(messageData);
            
            // 대화 분석 및 업데이트
            const analysis = await this.analyzeConversation(conversation);
            conversation.analysis = analysis;
            conversation.lastUpdated = new Date().toISOString();
            
            // 맥락 유지 (최근 N개만 유지)
            if (conversation.messages.length > this.contextWindow) {
                conversation.messages = conversation.messages.slice(-this.contextWindow);
            }
            
            // 저장
            await this.saveConversation(userId, conversation);
            
            return analysis;
            
        } catch (error) {
            console.error('대화 맥락 업데이트 오류:', error);
            return null;
        }
    }

    /**
     * 대화 기록 가져오기
     */
    async getHistory(userId, limit = 5) {
        try {
            const conversation = this.getConversation(userId);
            const recentMessages = conversation.messages.slice(-limit);
            
            return recentMessages.map(msg => ({
                message: msg.message,
                response: msg.response || null,
                timestamp: msg.timestamp,
                context: msg.context
            }));
            
        } catch (error) {
            console.error('대화 기록 가져오기 오류:', error);
            return [];
        }
    }

    /**
     * 대화 상호작용 저장
     */
    async saveInteraction(userId, message, response) {
        try {
            const conversation = this.getConversation(userId);
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            
            if (lastMessage && lastMessage.message === message) {
                // 응답 추가
                lastMessage.response = response.text;
                lastMessage.responseType = response.type;
                lastMessage.responseEmotion = response.emotion;
                lastMessage.analyzed = true;
                
                // 상호작용 분석
                const interaction = await this.analyzeInteraction(message, response);
                conversation.interactions = conversation.interactions || [];
                conversation.interactions.push(interaction);
                
                // 저장
                await this.saveConversation(userId, conversation);
            }
            
        } catch (error) {
            console.error('상호작용 저장 오류:', error);
        }
    }

    /**
     * 대화 분석
     */
    async analyzeConversation(conversation) {
        const messages = conversation.messages;
        if (messages.length === 0) return {};
        
        const analysis = {
            // 기본 정보
            messageCount: messages.length,
            lastActivity: messages[messages.length - 1].timestamp,
            
            // 주제 분석
            topics: this.analyzeTopics(messages),
            continuity: this.analyzeContinuity(messages),
            
            // 감정 분석
            emotionalFlow: this.analyzeEmotionalFlow(messages),
            
            // 패턴 분석
            patterns: this.analyzePatterns(messages),
            
            // 맥락 정보
            contextInfo: this.extractContextInfo(messages)
        };
        
        return analysis;
    }

    /**
     * 주제 분석
     */
    analyzeTopics(messages) {
        const topicFrequency = {};
        const topicFlow = [];
        
        messages.forEach((msg, index) => {
            const detectedTopics = [];
            
            // 각 주제 카테고리에서 키워드 찾기
            for (const [topic, keywords] of Object.entries(this.topics)) {
                const matchCount = keywords.filter(keyword => 
                    msg.message.toLowerCase().includes(keyword)
                ).length;
                
                if (matchCount > 0) {
                    detectedTopics.push(topic);
                    topicFrequency[topic] = (topicFrequency[topic] || 0) + matchCount;
                }
            }
            
            if (detectedTopics.length > 0) {
                topicFlow.push({
                    messageIndex: index,
                    topics: detectedTopics,
                    timestamp: msg.timestamp
                });
            }
        });
        
        return {
            frequency: topicFrequency,
            flow: topicFlow,
            dominant: this.getDominantTopic(topicFrequency)
        };
    }

    /**
     * 대화 연속성 분석
     */
    analyzeContinuity(messages) {
        const continuity = {
            hasReferences: false,
            referenceCount: 0,
            connectionWords: [],
            topicChanges: 0
        };
        
        messages.forEach((msg, index) => {
            const message = msg.message.toLowerCase();
            
            // 참조 표현 찾기
            const references = this.topicPatterns.referencing.filter(ref => 
                message.includes(ref)
            );
            if (references.length > 0) {
                continuity.hasReferences = true;
                continuity.referenceCount += references.length;
                continuity.connectionWords.push(...references);
            }
            
            // 연결 표현 찾기
            const connections = this.topicPatterns.continuing.filter(conn => 
                message.includes(conn)
            );
            if (connections.length > 0) {
                continuity.connectionWords.push(...connections);
            }
        });
        
        return continuity;
    }

    /**
     * 감정 흐름 분석
     */
    analyzeEmotionalFlow(messages) {
        const emotionalFlow = messages.map((msg, index) => {
            const emotions = msg.context?.emotions || [];
            const intensity = msg.context?.intensity || 1;
            
            return {
                messageIndex: index,
                emotions: emotions,
                intensity: intensity,
                timestamp: msg.timestamp
            };
        });
        
        // 감정 변화 추적
        const changes = [];
        for (let i = 1; i < emotionalFlow.length; i++) {
            const prev = emotionalFlow[i - 1];
            const curr = emotionalFlow[i];
            
            if (JSON.stringify(prev.emotions) !== JSON.stringify(curr.emotions)) {
                changes.push({
                    from: prev.emotions,
                    to: curr.emotions,
                    intensityChange: curr.intensity - prev.intensity,
                    messageIndex: i
                });
            }
        }
        
        return {
            flow: emotionalFlow,
            changes: changes,
            stability: this.calculateEmotionalStability(emotionalFlow)
        };
    }

    /**
     * 패턴 분석
     */
    analyzePatterns(messages) {
        const patterns = {
            questionCount: 0,
            responsePatterns: [],
            timePatterns: this.analyzeTimePatterns(messages),
            lengthPatterns: this.analyzeLengthPatterns(messages)
        };
        
        messages.forEach((msg, index) => {
            const message = msg.message.toLowerCase();
            
            // 질문 패턴
            const questions = this.topicPatterns.questioning.filter(q => 
                message.includes(q)
            );
            if (questions.length > 0 || message.includes('?')) {
                patterns.questionCount++;
            }
            
            // 응답 패턴
            if (msg.response) {
                patterns.responsePatterns.push({
                    messageIndex: index,
                    responseType: msg.responseType,
                    emotion: msg.responseEmotion,
                    hasPhoto: msg.response.includes('사진') || msg.response.includes('이미지')
                });
            }
        });
        
        return patterns;
    }

    /**
     * 맥락 정보 추출
     */
    extractContextInfo(messages) {
        const contextInfo = {
            needsReference: false,
            possibleReferences: [],
            suggestedResponses: [],
            conversationMood: 'neutral'
        };
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            const message = lastMessage.message.toLowerCase();
            
            // 참조가 필요한 경우
            if (this.topicPatterns.referencing.some(ref => message.includes(ref))) {
                contextInfo.needsReference = true;
                contextInfo.possibleReferences = this.findPossibleReferences(messages);
            }
            
            // 전체 대화 분위기
            const recentEmotions = messages.slice(-3)
                .map(msg => msg.context?.emotions || [])
                .flat();
            
            contextInfo.conversationMood = this.calculateOverallMood(recentEmotions);
        }
        
        return contextInfo;
    }

    /**
     * 가능한 참조 찾기
     */
    findPossibleReferences(messages) {
        const references = [];
        const recentMessages = messages.slice(-5, -1); // 최근 메시지 제외하고 이전 메시지들
        
        recentMessages.forEach((msg, index) => {
            // 사진 관련 참조
            if (msg.context?.categories?.includes('photo_request')) {
                references.push({
                    type: 'photo',
                    messageIndex: index,
                    content: msg.message,
                    timestamp: msg.timestamp
                });
            }
            
            // 기억 관련 참조
            if (msg.context?.categories?.includes('memory_related')) {
                references.push({
                    type: 'memory',
                    messageIndex: index,
                    content: msg.message,
                    timestamp: msg.timestamp
                });
            }
            
            // 감정 관련 참조
            if (msg.context?.emotions?.length > 0) {
                references.push({
                    type: 'emotion',
                    messageIndex: index,
                    emotions: msg.context.emotions,
                    timestamp: msg.timestamp
                });
            }
        });
        
        return references;
    }

    /**
     * 상호작용 분석
     */
    async analyzeInteraction(message, response) {
        return {
            timestamp: new Date().toISOString(),
            messageLength: message.length,
            responseLength: response.text.length,
            responseType: response.type,
            emotion: response.emotion,
            hasPhoto: response.hasPhoto,
            satisfaction: this.calculateSatisfaction(message, response)
        };
    }

    /**
     * 만족도 계산
     */
    calculateSatisfaction(message, response) {
        let satisfaction = 5; // 기본값
        
        // 응답 타입별 가중치
        const typeWeights = {
            'special': 2,
            'memorial': 3,
            'photo': 1,
            'gpt': 1,
            'fallback': -2
        };
        
        satisfaction += typeWeights[response.type] || 0;
        
        // 감정 일치 여부
        if (response.emotion && response.emotion !== 'neutral') {
            satisfaction += 1;
        }
        
        // 사진 포함 여부
        if (response.hasPhoto) {
            satisfaction += 1;
        }
        
        return Math.max(1, Math.min(10, satisfaction));
    }

    /**
     * 유틸리티 메서드들
     */
    
    getDominantTopic(topicFrequency) {
        return Object.entries(topicFrequency)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general';
    }

    calculateEmotionalStability(emotionalFlow) {
        if (emotionalFlow.length < 2) return 1;
        
        let stability = 1;
        const changes = emotionalFlow.length - 1;
        
        for (let i = 1; i < emotionalFlow.length; i++) {
            const intensityChange = Math.abs(
                emotionalFlow[i].intensity - emotionalFlow[i-1].intensity
            );
            stability -= intensityChange / (changes * 10);
        }
        
        return Math.max(0, Math.min(1, stability));
    }

    analyzeTimePatterns(messages) {
        const intervals = [];
        
        for (let i = 1; i < messages.length; i++) {
            const prev = new Date(messages[i-1].timestamp);
            const curr = new Date(messages[i].timestamp);
            intervals.push(curr - prev);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        return {
            averageInterval: avgInterval,
            quickReplies: intervals.filter(i => i < 30000).length, // 30초 이내
            longPauses: intervals.filter(i => i > 300000).length   // 5분 이상
        };
    }

    analyzeLengthPatterns(messages) {
        const lengths = messages.map(msg => msg.message.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        
        return {
            averageLength: avgLength,
            shortMessages: lengths.filter(l => l < 10).length,
            longMessages: lengths.filter(l => l > 50).length
        };
    }

    calculateOverallMood(emotions) {
        const moodWeights = {
            love: 3,
            happy: 2,
            shy: 1,
            sad: -2,
            angry: -3,
            sulky: -1
        };
        
        let totalWeight = 0;
        emotions.forEach(emotion => {
            totalWeight += moodWeights[emotion] || 0;
        });
        
        if (totalWeight > 1) return 'positive';
        if (totalWeight < -1) return 'negative';
        return 'neutral';
    }

    /**
     * 데이터 관리 메서드들
     */
    
    getConversation(userId) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, {
                userId: userId,
                messages: [],
                interactions: [],
                analysis: {},
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }
        return this.conversations.get(userId);
    }

    async saveConversation(userId, conversation) {
        this.conversations.set(userId, conversation);
        // 주기적으로 파일에 저장 (메모리 백업)
        if (Math.random() < 0.1) { // 10% 확률로 저장
            await this.saveToFile();
        }
    }

    async loadConversations() {
        try {
            const data = await fs.readFile(this.conversationFile, 'utf8');
            const conversations = JSON.parse(data);
            
            for (const [userId, conversation] of Object.entries(conversations)) {
                this.conversations.set(userId, conversation);
            }
            
        } catch (error) {
            // 파일이 없는 경우는 정상
            if (error.code !== 'ENOENT') {
                console.error('대화 로드 오류:', error);
            }
        }
    }

    async saveToFile() {
        try {
            const data = Object.fromEntries(this.conversations);
            await fs.writeFile(this.conversationFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('대화 저장 오류:', error);
        }
    }

    startCleanupScheduler() {
        // 1시간마다 오래된 대화 정리
        setInterval(() => {
            this.cleanupOldConversations();
        }, 60 * 60 * 1000);
    }

    cleanupOldConversations() {
        const now = Date.now();
        
        for (const [userId, conversation] of this.conversations) {
            const lastUpdated = new Date(conversation.lastUpdated).getTime();
            
            if (now - lastUpdated > this.maxConversationAge) {
                // 오래된 대화는 파일에 저장 후 메모리에서 제거
                this.archiveConversation(userId, conversation);
                this.conversations.delete(userId);
            }
        }
    }

    async archiveConversation(userId, conversation) {
        // 아카이브 로직 (필요시 구현)
        console.log(`대화 아카이브: ${userId}`);
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 디버깅/통계 메서드들
     */
    
    getStats() {
        return {
            activeConversations: this.conversations.size,
            totalMessages: Array.from(this.conversations.values())
                .reduce((total, conv) => total + conv.messages.length, 0),
            contextWindow: this.contextWindow,
            maxAge: this.maxConversationAge
        };
    }

    getConversationSummary(userId) {
        const conversation = this.conversations.get(userId);
        if (!conversation) return null;
        
        return {
            messageCount: conversation.messages.length,
            interactionCount: conversation.interactions?.length || 0,
            created: conversation.created,
            lastUpdated: conversation.lastUpdated,
            analysis: conversation.analysis
        };
    }
}

module.exports = { ConversationManager };
