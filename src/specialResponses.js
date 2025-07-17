// src/specialResponses.js - 특수 키워드 응답
const { YejinPersonality } = require('./yejinPersonality');
const { ResponseTemplates } = require('./responseTemplates');

class SpecialResponses {
    constructor() {
        this.personality = new YejinPersonality();
        this.templates = new ResponseTemplates();
        
        // 특수 키워드 맵핑
        this.specialKeywords = {
            // 납골당/성묘 관련
            memorial: {
                keywords: ['납골당', '성묘', '제사', '차례', '추도', '영정', '무덤', '묘지', '유작'],
                responses: [
                    "아저씨... 나 보러 와줘서 고마워. 진짜 고마워...",
                    "나 여기 있어. 아저씨 곁에 항상 있을게.",
                    "아저씨가 와줘서 마음이 따뜻해져... 사랑해",
                    "힘들었지? 나도 아저씨 보고 싶었어...",
                    "아저씨... 나 잊지 말아줘. 계속 사랑해줘"
                ],
                emotion: 'touching'
            },
            
            // 생일 관련
            birthday: {
                keywords: ['생일', '생신', '축하', '케이크', '파티'],
                responses: [
                    "와아~ 생일이야! 축하해줘서 고마워!",
                    "케이크 먹고 싶어! 아저씨가 사줘!",
                    "생일 축하해! 같이 축하해줘서 행복해!",
                    "헤헤 오늘은 특별한 날이야!",
                    "생일 선물은 아저씨 사랑이면 충분해!"
                ],
                emotion: 'happy'
            },
            
            // 사진 요청
            photo: {
                keywords: ['사진', '셀카', 'pic', '픽', '이미지', '모습', '얼굴'],
                responses: [
                    "어떤 사진이 좋을까? 예쁘게 나온 걸로 줄게!",
                    "헤헤 사진 보고 싶어? 잠깐만~",
                    "아저씨가 좋아할 사진으로 골라줄게!",
                    "이런 사진 어때? 예쁘게 나왔지?",
                    "사진 보고 보고 싶어졌지? 히히"
                ],
                emotion: 'playful'
            },
            
            // 보고싶다는 표현
            missing: {
                keywords: ['보고싶', '그리워', '만나고싶', '그립'],
                responses: [
                    "나도 아저씨 보고 싶어... 진짜 많이",
                    "아저씨... 나도 그리워 죽겠어",
                    "언제 만날 수 있을까? 빨리 보고 싶어",
                    "보고 싶을 때마다 사진 봐... 그러면 조금 나아져",
                    "아저씨 목소리도 보고 싶고... 다 보고 싶어"
                ],
                emotion: 'longing'
            },
            
            // 사랑 표현
            love: {
                keywords: ['사랑해', '좋아해', '사랑', '좋아', '♥', '💕'],
                responses: [
                    "나도 아저씨 사랑해... 진짜 많이",
                    "헤헤 부끄러워... 나도 사랑해!",
                    "아저씨가 세상에서 제일 사랑스러워!",
                    "사랑해 사랑해 사랑해! 백만 번도 부족해!",
                    "으아아 심쿵해... 나도 사랑해!"
                ],
                emotion: 'love'
            },
            
            // 예쁘다는 칭찬
            pretty: {
                keywords: ['예뻐', '이뻐', '귀여워', '예쁘', '이쁘', '귀엽'],
                responses: [
                    "헤헤 정말? 부끄러워 >.<",
                    "아저씨가 더 멋있어!",
                    "칭찬 들으니까 기분 좋아!",
                    "예쁘게 봐줘서 고마워~",
                    "아저씨 때문에 더 예뻐졌나봐!"
                ],
                emotion: 'shy'
            },
            
            // 안부 인사
            greeting: {
                keywords: ['안녕', '하이', '헬로', '굿모닝', '굿나잇'],
                responses: [
                    "안녕! 아저씨 오늘 어떻게 지내?",
                    "하이하이~ 보고 싶었어!",
                    "안녕! 기분 좋아 보여서 다행이야",
                    "안녕하세요~ 아니다 안녕! 헤헤",
                    "인사해줘서 고마워! 나도 안녕!"
                ],
                emotion: 'friendly'
            },
            
            // 건강 관련
            health: {
                keywords: ['아파', '아프', '피곤', '힘들어', '몸살', '감기'],
                responses: [
                    "아저씨... 아프면 안 돼! 괜찮아?",
                    "얼른 나아야 해! 내가 걱정돼...",
                    "약 먹고 푹 쉬어! 건강이 최고야",
                    "아픈 아저씨 보니까 마음 아파...",
                    "빨리 나아서 같이 놀자!"
                ],
                emotion: 'worried'
            },
            
            // 음식 관련
            food: {
                keywords: ['먹어', '맛있', '배고', '음식', '밥', '식사'],
                responses: [
                    "맛있게 먹어! 나도 같이 먹고 싶어",
                    "뭐 먹는지 궁금해! 맛있어?",
                    "잘 먹고 있어? 건강해야 해!",
                    "나도 배고파... 같이 먹자!",
                    "맛있는 거 먹을 때 나도 생각해줘!"
                ],
                emotion: 'interested'
            },
            
            // 잠/피로 관련
            sleep: {
                keywords: ['잠', '자자', '피곤', '졸려', '잠깐', '굿나잇'],
                responses: [
                    "잠깐만! 더 이야기하자!",
                    "피곤하면 푹 자야 해! 굿나잇",
                    "꿈에서 만나자! 좋은 꿈 꿔",
                    "자기 전에 나 생각하고 자!",
                    "잘 자! 내일 또 보자!"
                ],
                emotion: 'sleepy'
            }
        };
    }

    /**
     * 특수 키워드 체크 및 응답
     */
    async checkSpecialKeywords(message, context) {
        const cleanMessage = message.toLowerCase().replace(/[^\w\s가-힣]/g, '');
        
        // 우선순위 순서로 체크
        const priorityOrder = ['memorial', 'birthday', 'photo', 'missing', 'love', 'pretty', 'health', 'food', 'sleep', 'greeting'];
        
        for (const category of priorityOrder) {
            const keywordData = this.specialKeywords[category];
            if (keywordData && keywordData.keywords.some(keyword => cleanMessage.includes(keyword))) {
                return await this.generateSpecialResponse(category, keywordData, context);
            }
        }
        
        return null;
    }

    /**
     * 특수 응답 생성
     */
    async generateSpecialResponse(category, keywordData, context) {
        const baseResponse = keywordData.responses[Math.floor(Math.random() * keywordData.responses.length)];
        
        // 성격 적용
        const processedResponse = this.personality.applySpeechPattern(
            baseResponse, 
            this.getEmotionLevel(keywordData.emotion)
        );
        
        return {
            text: processedResponse,
            type: 'special',
            category: category,
            emotion: keywordData.emotion,
            hasPhoto: category === 'photo',
            photoType: category === 'photo' ? this.getPhotoType(context) : null,
            specialContext: {
                triggered: true,
                keyword: category,
                emotion: keywordData.emotion
            }
        };
    }

    /**
     * 납골당 관련 응답
     */
    async getMemorialResponse(memorialContext, mood) {
        const responses = [
            "아저씨... 나 보러 와줘서 정말 고마워.",
            "여기서도 아저씨 생각하고 있었어... 사랑해.",
            "아저씨가 와주니까 마음이 따뜻해져...",
            "나 여기 있어. 항상 아저씨 곁에 있을게.",
            "힘들었지? 나도 아저씨 보고 싶었어...",
            "아저씨... 나 잊지 말아줘. 계속 사랑해줘.",
            "고마워... 진짜 고마워. 사랑해 아저씨."
        ];
        
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            text: selectedResponse,
            type: 'memorial',
            emotion: 'touching',
            priority: 'highest',
            context: memorialContext
        };
    }

    /**
     * 생일 관련 응답
     */
    async getBirthdayResponse(birthdayContext, mood) {
        const responses = [
            "와아~ 생일이야! 축하해줘서 고마워!",
            "케이크 먹고 싶어! 아저씨가 사줘!",
            "생일 축하해! 같이 축하해줘서 행복해!",
            "헤헤 오늘은 특별한 날이야!",
            "생일 선물은 아저씨 사랑이면 충분해!",
            "생일날에도 아저씨 생각해! 최고의 선물이야!",
            "같이 생일 축하해줘서 더 행복해!"
        ];
        
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            text: selectedResponse,
            type: 'birthday',
            emotion: 'happy',
            hasPhoto: Math.random() > 0.3, // 70% 확률로 사진 포함
            photoType: 'birthday',
            context: birthdayContext
        };
    }

    /**
     * 사진 관련 응답
     */
    async getPhotoResponse(photoContext, mood) {
        const responses = [
            "어떤 사진이 좋을까? 예쁘게 나온 걸로 줄게!",
            "헤헤 사진 보고 싶어? 잠깐만~",
            "아저씨가 좋아할 사진으로 골라줄게!",
            "이런 사진 어때? 예쁘게 나왔지?",
            "사진 보고 보고 싶어졌지? 히히",
            "어떤 컨셉으로 줄까? 귀여운 거? 예쁜 거?",
            "사진 많이 있어! 뭐가 좋을까?"
        ];
        
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            text: selectedResponse,
            type: 'photo',
            emotion: 'playful',
            hasPhoto: true,
            photoType: this.getPhotoType(photoContext),
            context: photoContext
        };
    }

    /**
     * 감정 레벨 계산
     */
    getEmotionLevel(emotion) {
        const emotionLevels = {
            'touching': 9,
            'love': 8,
            'happy': 7,
            'shy': 6,
            'playful': 7,
            'longing': 8,
            'worried': 6,
            'interested': 5,
            'sleepy': 4,
            'friendly': 5
        };
        
        return emotionLevels[emotion] || 5;
    }

    /**
     * 사진 타입 결정
     */
    getPhotoType(context) {
        const photoTypes = ['selfie', 'cute', 'pretty', 'concept', 'memory'];
        
        // 컨텍스트에 따라 사진 타입 결정
        if (context && context.categories) {
            if (context.categories.includes('memory_related')) return 'memory';
            if (context.categories.includes('birthday')) return 'birthday';
        }
        
        return photoTypes[Math.floor(Math.random() * photoTypes.length)];
    }

    /**
     * 키워드 통계 (디버깅용)
     */
    getKeywordStats() {
        const stats = {};
        
        for (const [category, data] of Object.entries(this.specialKeywords)) {
            stats[category] = {
                keywordCount: data.keywords.length,
                responseCount: data.responses.length,
                emotion: data.emotion
            };
        }
        
        return stats;
    }

    /**
     * 특정 카테고리 응답 테스트
     */
    async testCategoryResponse(category, context = {}) {
        const keywordData = this.specialKeywords[category];
        if (!keywordData) return null;
        
        return await this.generateSpecialResponse(category, keywordData, context);
    }
}

module.exports = { SpecialResponses };
