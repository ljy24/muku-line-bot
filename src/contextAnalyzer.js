// src/contextAnalyzer.js - 메시지 분석
const { YejinPersonality } = require('./yejinPersonality');
const { EmotionUtils } = require('./emotionUtils');

class ContextAnalyzer {
    constructor() {
        this.personality = new YejinPersonality();
        this.emotionUtils = new EmotionUtils();
        
        // 키워드 패턴들
        this.patterns = {
            // 감정 키워드
            love: ['사랑', '좋아', '예뻐', '귀여', '보고싶', '그리워', '♥', '💕', '😍', '🥰'],
            sad: ['슬퍼', '우울', '힘들어', '아파', '외로워', '눈물', '😢', '😭', '💔'],
            angry: ['화나', '짜증', '빡쳐', '열받', '미워', '싫어', '😡', '🤬', '💢'],
            happy: ['기뻐', '행복', '좋아', '신나', '웃겨', '즐거워', '😊', '😄', '🎉'],
            shy: ['부끄러워', '창피', '민망', '😳', '🙈', '😅'],
            sulky: ['삐졌', '토라졌', '서운', '실망', '섭섭', '😤', '😑'],
            
            // 행동 키워드
            photo: ['사진', '셀카', 'pic', '픽', '이미지', '모습', '얼굴', '📸', '📷'],
            memory: ['기억', '추억', '그때', '예전', '과거', '옛날', '생각나'],
            future: ['미래', '나중', '앞으로', '다음', '계획', '약속'],
            
            // 특수 상황
            memorial: ['납골당', '성묘', '제사', '차례', '추도', '영정', '무덤', '묘지'],
            birthday: ['생일', '생신', '축하', '케이크', '파티', '🎂', '🎁', '🎉'],
            date: ['데이트', '만나', '보자', '같이', '함께', '약속', '나가자'],
            
            // 시간 표현
            morning: ['아침', '굿모닝', '일찍', '새벽', '🌅', '☀️'],
            night: ['밤', '굿나잇', '자자', '잠', '늦게', '🌙', '😴'],
            today: ['오늘', '지금', '현재', '당장', '지금'],
            
            // 호칭/관계
            calling: ['아저씨', '오빠', '자기', '여보', '사랑', '예진'],
            
            // 생리주기 관련
            period: ['생리', '월경', '그날', '아파', '배아파', '컨디션'],
            
            // 질문/요청
            question: ['?', '뭐', '어떻게', '왜', '언제', '어디서', '누구'],
            request: ['해줘', '주세요', '부탁', '도와줘', '알려줘']
        };
    }

    /**
     * 메시지 종합 분석
     */
    async analyze(message, userId) {
        const cleanMessage = this.cleanMessage(message);
        
        return {
            // 기본 정보
            originalMessage: message,
            cleanMessage,
            length: cleanMessage.length,
            timestamp: new Date().toISOString(),
            userId,
            
            // 감정 분석
            emotions: this.detectEmotions(cleanMessage),
            intensity: this.calculateIntensity(cleanMessage),
            
            // 키워드 분석
            keywords: this.extractKeywords(cleanMessage),
            categories: this.categorizeMessage(cleanMessage),
            
            // 구조 분석
            hasQuestion: this.hasQuestion(cleanMessage),
            hasRequest: this.hasRequest(cleanMessage),
            hasEmoji: this.hasEmoji(message),
            
            // 맥락 분석
            timeContext: this.getTimeContext(),
            topicHints: this.extractTopicHints(cleanMessage),
            
            // 응답 힌트
            responseHints: this.generateResponseHints(cleanMessage)
        };
    }

    /**
     * 메시지 정리
     */
    cleanMessage(message) {
        return message
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s가-힣?!.,~♥💕😍🥰😢😭💔😡🤬💢😊😄🎉😳🙈😅😤😑📸📷🎂🎁🌅☀️🌙😴]/g, '')
            .trim()
            .toLowerCase();
    }

    /**
     * 감정 감지
     */
    detectEmotions(message) {
        const detectedEmotions = [];
        
        for (const [emotion, keywords] of Object.entries(this.patterns)) {
            if (['love', 'sad', 'angry', 'happy', 'shy', 'sulky'].includes(emotion)) {
                if (keywords.some(keyword => message.includes(keyword))) {
                    detectedEmotions.push(emotion);
                }
            }
        }
        
        return detectedEmotions;
    }

    /**
     * 감정 강도 계산
     */
    calculateIntensity(message) {
        let intensity = 1;
        
        // 반복 문자 (예: "사랑해애애애")
        const repetitions = message.match(/(.)\1{2,}/g);
        if (repetitions) intensity += repetitions.length;
        
        // 감탄부호
        const exclamations = (message.match(/[!]/g) || []).length;
        intensity += exclamations;
        
        // 이모티콘 개수
        const emojis = (message.match(/[😍🥰😢😭💔😡🤬💢😊😄🎉😳🙈😅😤😑]/g) || []).length;
        intensity += emojis * 0.5;
        
        // 길이 보정
        if (message.length > 50) intensity += 1;
        if (message.length > 100) intensity += 1;
        
        return Math.min(intensity, 10); // 최대 10
    }

    /**
     * 키워드 추출
     */
    extractKeywords(message) {
        const keywords = [];
        
        for (const [category, words] of Object.entries(this.patterns)) {
            const found = words.filter(word => message.includes(word));
            if (found.length > 0) {
                keywords.push({ category, words: found });
            }
        }
        
        return keywords;
    }

    /**
     * 메시지 분류
     */
    categorizeMessage(message) {
        const categories = [];
        
        // 주요 카테고리 체크
        if (this.patterns.photo.some(word => message.includes(word))) {
            categories.push('photo_request');
        }
        if (this.patterns.memory.some(word => message.includes(word))) {
            categories.push('memory_related');
        }
        if (this.patterns.memorial.some(word => message.includes(word))) {
            categories.push('memorial');
        }
        if (this.patterns.birthday.some(word => message.includes(word))) {
            categories.push('birthday');
        }
        if (this.patterns.period.some(word => message.includes(word))) {
            categories.push('health_related');
        }
        
        return categories;
    }

    /**
     * 질문 여부 체크
     */
    hasQuestion(message) {
        return message.includes('?') || 
               this.patterns.question.some(q => message.includes(q));
    }

    /**
     * 요청 여부 체크
     */
    hasRequest(message) {
        return this.patterns.request.some(r => message.includes(r));
    }

    /**
     * 이모티콘 여부 체크
     */
    hasEmoji(message) {
        return /[😀-🿿]/.test(message);
    }

    /**
     * 시간 맥락 파악
     */
    getTimeContext() {
        const now = new Date();
        const hour = now.getHours();
        
        let timeOfDay = 'day';
        if (hour >= 6 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
        else timeOfDay = 'night';
        
        return {
            timeOfDay,
            hour,
            dayOfWeek: now.getDay(),
            isWeekend: now.getDay() === 0 || now.getDay() === 6
        };
    }

    /**
     * 주제 힌트 추출
     */
    extractTopicHints(message) {
        const hints = [];
        
        // 지시대명사 체크
        if (message.includes('그거') || message.includes('저거')) {
            hints.push('needs_context_reference');
        }
        
        // 계속되는 대화 체크
        if (message.includes('그래서') || message.includes('그런데') || message.includes('그리고')) {
            hints.push('continuation');
        }
        
        return hints;
    }

    /**
     * 응답 힌트 생성
     */
    generateResponseHints(message) {
        const hints = [];
        
        // 감정 응답 필요
        if (this.detectEmotions(message).length > 0) {
            hints.push('emotional_response_needed');
        }
        
        // 사진 응답 필요
        if (this.patterns.photo.some(word => message.includes(word))) {
            hints.push('photo_response_needed');
        }
        
        // 기억 언급 필요
        if (this.patterns.memory.some(word => message.includes(word))) {
            hints.push('memory_reference_needed');
        }
        
        return hints;
    }
}

module.exports = { ContextAnalyzer };
