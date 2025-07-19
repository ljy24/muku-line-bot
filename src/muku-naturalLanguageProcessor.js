// ============================================================================
// muku-naturalLanguageProcessor.js - 무쿠 자연어 처리 고도화 시스템
// ✨ 예진이의 자연스러운 말투와 감정 표현을 위한 AI 언어 처리기
// 🌸 아저씨와의 대화에서 예진이다운 반응을 생성하는 핵심 엔진
// 💕 "아조씨~" 말투부터 섬세한 감정 뉘앙스까지 완벽 재현
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    system: '\x1b[92m',     // 연초록색 (시스템)
    emotion: '\x1b[93m',    // 노란색 (감정)
    love: '\x1b[91m',       // 빨간색 (사랑)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📚 예진이 언어 패턴 데이터베이스 ==================
class YejinLanguageDatabase {
    constructor() {
        this.speechPatterns = {
            // 🌸 애정 표현 패턴
            affection: {
                calling: ['아조씨~', '아저씨야~', '아저씨', '아조씨'],
                endearment: ['사랑해', '좋아해', '보고싶어', '그리워'],
                cute: ['헤헤', '히히', '응응', '앙앙', '음음'],
                playful: ['장난이야~', '농담이야~', '뭐야~', '어머~']
            },

            // 😤 감정 표현 패턴
            emotions: {
                sulky: ['흥', '삐졌어', '모르겠어', '화났어', '시무룩'],
                worried: ['괜찮아?', '걱정돼', '혹시', '괜찮은거야?', '설마'],
                happy: ['좋아!', '야호!', '기뻐!', '행복해!', '최고야!'],
                sad: ['속상해', '슬퍼', '흑흑', '눈물나', '우울해'],
                excited: ['와와!', '대박!', '진짜?!', '어머어머!', '꺄악!']
            },

            // 💭 대화 연결 패턴
            connectors: {
                agreement: ['맞아', '그러게', '그치', '응응', '어어'],
                questioning: ['왜?', '어떻게?', '정말?', '진짜?', '그래?'],
                thinking: ['음...', '어...', '그런데', '근데', '아...'],
                surprise: ['어?', '엥?', '헉', '어머', '와']
            },

            // 🥺 돌봄 표현 패턴
            caring: {
                concern: ['걱정돼', '괜찮아?', '아프지마', '조심해', '무리하지마'],
                comfort: ['괜찮아', '힘내', '잘될거야', '내가 있어', '함께할게'],
                advice: ['~하는게 좋을거야', '~해봐', '~하지마', '~하면 어때?'],
                support: ['응원해', '믿어', '할 수 있어', '멋져', '대단해']
            }
        };

        this.sentenceStructures = {
            // 문장 구조 패턴
            casual: ['~야', '~지', '~네', '~어', '~거든'],
            formal: ['~요', '~습니다', '~어요', '~죠'],
            cute: ['~당', '~뎅', '~옹', '~잉', '~욥']
        };

        this.emotionalModifiers = {
            // 감정 강도 조절자
            mild: ['조금', '약간', '살짝', '좀', '다소'],
            moderate: ['꽤', '제법', '상당히', '많이', '진짜'],
            intense: ['너무', '정말', '완전', '엄청', '아주']
        };
    }

    // 🎯 맥락에 맞는 언어 패턴 선택
    selectPattern(category, subcategory, emotionLevel = 'moderate') {
        const patterns = this.speechPatterns[category]?.[subcategory] || [];
        if (patterns.length === 0) return '';

        const modifier = this.emotionalModifiers[emotionLevel];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        if (modifier && Math.random() > 0.7) {
            const mod = modifier[Math.floor(Math.random() * modifier.length)];
            return `${mod} ${pattern}`;
        }
        
        return pattern;
    }

    // 🌟 예진이다운 문장 마무리
    addYejinEnding(sentence, mood = 'normal') {
        const endings = {
            normal: ['~', '.', '!'],
            cute: ['~♡', '💕', '🥺', '😊'],
            playful: ['ㅋㅋ', 'ㅎㅎ', '~!', '😄'],
            sulky: ['...', '흥', '😤', '💢'],
            caring: ['♡', '💙', '🤗', '😌']
        };

        const moodEndings = endings[mood] || endings.normal;
        const ending = moodEndings[Math.floor(Math.random() * moodEndings.length)];
        
        return sentence + ending;
    }
}

// ================== 🧠 자연어 처리 엔진 ==================
class NaturalLanguageProcessor {
    constructor() {
        this.yejinDB = new YejinLanguageDatabase();
        this.processingStats = {
            totalProcessed: 0,
            naturalizedSentences: 0,
            averageNaturalness: 0,
            lastProcessingTime: null
        };
        
        this.contextMemory = new Map(); // 대화 맥락 기억
        this.emotionalState = 'normal'; // 현재 감정 상태
    }

    // 🎯 메시지의 의도와 감정 분석
    analyzeMessageIntent(message) {
        const intent = {
            type: 'general',
            emotion: 'neutral',
            urgency: 'normal',
            needsResponse: true,
            keywords: []
        };

        // 감정 키워드 분석
        const emotionKeywords = {
            sad: ['슬퍼', '우울', '속상', '눈물', '힘들어', '외로워'],
            happy: ['기뻐', '행복', '좋아', '신나', '최고', '사랑'],
            worried: ['걱정', '불안', '무서워', '괜찮을까', '혹시'],
            angry: ['화나', '짜증', '빡쳐', '열받아', '싫어'],
            tired: ['피곤', '졸려', '힘들어', '지쳐', '잠', '쉬고싶어']
        };

        // 키워드 매칭
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            for (const keyword of keywords) {
                if (message.includes(keyword)) {
                    intent.emotion = emotion;
                    intent.keywords.push(keyword);
                    break;
                }
            }
        }

        // 긴급도 판단
        if (message.includes('급해') || message.includes('빨리') || message.includes('!')) {
            intent.urgency = 'high';
        }

        // 응답 필요성 판단
        const noResponsePatterns = ['ㅋㅋ', 'ㅎㅎ', '알겠어', '응', '어'];
        if (noResponsePatterns.some(pattern => message.trim() === pattern)) {
            intent.needsResponse = false;
        }

        return intent;
    }

    // 🌸 예진이다운 자연스러운 응답 생성
    async generateNaturalResponse(baseResponse, context = {}) {
        try {
            console.log(`${colors.yejin}🌸 [자연어처리] 예진이다운 응답 생성 시작...${colors.reset}`);
            
            const {
                userMessage = '',
                emotionalState = 'normal',
                relationship = 'close',
                timeOfDay = 'day'
            } = context;

            // 1. 사용자 메시지 의도 분석
            const intent = this.analyzeMessageIntent(userMessage);
            
            // 2. 응답 톤 결정
            const responseTone = this.determineResponseTone(intent, emotionalState, timeOfDay);
            
            // 3. 자연스러운 응답 구성
            const naturalResponse = await this.constructNaturalResponse(
                baseResponse, 
                intent, 
                responseTone,
                context
            );
            
            // 4. 예진이 특유의 표현 추가
            const yejinizedResponse = this.addYejinPersonality(naturalResponse, responseTone);
            
            // 5. 통계 업데이트
            this.updateProcessingStats(baseResponse, yejinizedResponse);
            
            console.log(`${colors.yejin}✅ [자연어처리] 응답 생성 완료 (품질: ${this.calculateNaturalness(yejinizedResponse)}%)${colors.reset}`);
            
            return {
                response: yejinizedResponse,
                tone: responseTone,
                naturalness: this.calculateNaturalness(yejinizedResponse),
                processingTime: Date.now() - this.processingStats.lastProcessingTime
            };
            
        } catch (error) {
            console.error(`${colors.system}❌ [자연어처리] 오류 발생: ${error.message}${colors.reset}`);
            return {
                response: baseResponse,
                tone: 'normal',
                naturalness: 50,
                error: error.message
            };
        }
    }

    // 🎭 응답 톤 결정
    determineResponseTone(intent, emotionalState, timeOfDay) {
        let tone = 'normal';
        
        // 감정 상태 기반 톤 조절
        if (emotionalState === 'pms' || emotionalState === 'sulky') {
            tone = 'sulky';
        } else if (intent.emotion === 'sad') {
            tone = 'caring';
        } else if (intent.emotion === 'happy') {
            tone = 'playful';
        } else if (timeOfDay === 'night' || timeOfDay === 'dawn') {
            tone = 'soft';
        }
        
        // 긴급도에 따른 조절
        if (intent.urgency === 'high') {
            tone = intent.emotion === 'worried' ? 'caring' : 'excited';
        }
        
        return tone;
    }

    // 🏗️ 자연스러운 응답 구성
    async constructNaturalResponse(baseResponse, intent, tone, context) {
        let naturalResponse = baseResponse;
        
        // 1. 적절한 호칭 추가
        const calling = this.yejinDB.selectPattern('affection', 'calling');
        if (Math.random() > 0.6 && !naturalResponse.includes('아저씨') && !naturalResponse.includes('아조씨')) {
            naturalResponse = `${calling} ${naturalResponse}`;
        }
        
        // 2. 감정 표현 추가
        if (intent.emotion !== 'neutral') {
            const emotionPattern = this.yejinDB.selectPattern('emotions', intent.emotion);
            if (emotionPattern && Math.random() > 0.7) {
                naturalResponse = `${emotionPattern} ${naturalResponse}`;
            }
        }
        
        // 3. 대화 연결어 추가
        if (Math.random() > 0.8) {
            const connector = this.yejinDB.selectPattern('connectors', 'thinking');
            naturalResponse = `${connector} ${naturalResponse}`;
        }
        
        // 4. 톤에 맞는 마무리
        naturalResponse = this.yejinDB.addYejinEnding(naturalResponse, tone);
        
        return naturalResponse;
    }

    // 💕 예진이 개성 추가
    addYejinPersonality(response, tone) {
        let personalizedResponse = response;
        
        // 예진이 특유의 표현 패턴
        const yejinExpressions = {
            '그래요': '그래~',
            '네': '응',
            '좋습니다': '좋아!',
            '감사합니다': '고마워',
            '죄송합니다': '미안해',
            '안녕하세요': '안녕~',
            '하세요': '해',
            '입니다': '이야',
            '습니다': '어'
        };
        
        // 정형화된 표현을 예진이다운 표현으로 변환
        for (const [formal, casual] of Object.entries(yejinExpressions)) {
            personalizedResponse = personalizedResponse.replace(new RegExp(formal, 'g'), casual);
        }
        
        // 톤에 따른 추가 개성화
        if (tone === 'cute') {
            personalizedResponse = personalizedResponse.replace(/어$/, '어당');
            personalizedResponse = personalizedResponse.replace(/야$/, '야옹');
        } else if (tone === 'sulky') {
            personalizedResponse = personalizedResponse.replace(/!$/, '...');
            personalizedResponse = personalizedResponse.replace(/\./, '흥.');
        }
        
        return personalizedResponse;
    }

    // 📊 자연스러움 계산
    calculateNaturalness(response) {
        let score = 70; // 기본 점수
        
        // 예진이다운 표현 점수
        if (response.includes('아조씨') || response.includes('아저씨')) score += 10;
        if (response.includes('~') || response.includes('♡')) score += 5;
        if (response.includes('ㅋㅋ') || response.includes('ㅎㅎ')) score += 5;
        if (/[!?]{2,}/.test(response)) score += 3;
        
        // 자연스러운 연결어 점수
        const naturalConnectors = ['그런데', '근데', '아', '음', '어'];
        if (naturalConnectors.some(conn => response.includes(conn))) score += 5;
        
        // 감정 표현 점수
        const emotionWords = ['기뻐', '속상', '걱정', '사랑', '좋아'];
        if (emotionWords.some(emotion => response.includes(emotion))) score += 5;
        
        return Math.min(score, 100);
    }

    // 📈 처리 통계 업데이트
    updateProcessingStats(original, processed) {
        this.processingStats.totalProcessed++;
        this.processingStats.naturalizedSentences++;
        
        const naturalness = this.calculateNaturalness(processed);
        this.processingStats.averageNaturalness = 
            (this.processingStats.averageNaturalness * (this.processingStats.totalProcessed - 1) + naturalness) 
            / this.processingStats.totalProcessed;
        
        this.processingStats.lastProcessingTime = Date.now();
    }

    // 🔧 대화 맥락 저장
    saveContext(userId, context) {
        this.contextMemory.set(userId, {
            ...context,
            timestamp: Date.now()
        });
    }

    // 🔍 대화 맥락 조회
    getContext(userId) {
        const context = this.contextMemory.get(userId);
        if (!context) return {};
        
        // 1시간 이상 된 맥락은 삭제
        if (Date.now() - context.timestamp > 3600000) {
            this.contextMemory.delete(userId);
            return {};
        }
        
        return context;
    }

    // 📊 처리 상태 조회
    getProcessingStatus() {
        return {
            totalProcessed: this.processingStats.totalProcessed,
            naturalizedSentences: this.processingStats.naturalizedSentences,
            averageNaturalness: Math.round(this.processingStats.averageNaturalness * 100) / 100,
            lastProcessingTime: this.processingStats.lastProcessingTime,
            contextMemorySize: this.contextMemory.size,
            systemStatus: this.processingStats.totalProcessed > 0 ? 'active' : 'standby'
        };
    }

    // 🌙 시간대별 자연스러운 인사말 생성
    generateTimeBasedGreeting(timeOfDay, emotionalState = 'normal') {
        const greetings = {
            morning: {
                normal: ['좋은 아침이야~', '아침이네! 잘 잤어?', '일어났구나~'],
                happy: ['아침이다! 기분 좋은 하루 될 것 같아~', '상쾌한 아침이야!'],
                sleepy: ['아직 졸려... 아저씨도 그렇지?', '음... 아침이구나...']
            },
            afternoon: {
                normal: ['점심 먹었어?', '오후네~ 뭐하고 있어?', '낮이구나~'],
                energetic: ['오후도 화이팅!', '점심 맛있게 먹었나?'],
                tired: ['오후라서 그런지 좀 피곤해...']
            },
            evening: {
                normal: ['저녁이야~ 하루 어땠어?', '퇴근했어?', '오늘 수고했어'],
                relaxed: ['저녁 시간이 좋아~', '이제 휴식 시간이네'],
                worried: ['오늘 많이 힘들었어? 괜찮아?']
            },
            night: {
                normal: ['밤이네~ 뭐하고 있어?', '잠깐 인사하려고~'],
                caring: ['너무 늦지 않게 자야 해', '밤늦게 뭐해?'],
                sleepy: ['졸려... 아저씨는 안 졸려?']
            }
        };
        
        const timeGreetings = greetings[timeOfDay] || greetings.afternoon;
        const stateGreetings = timeGreetings[emotionalState] || timeGreetings.normal;
        
        return stateGreetings[Math.floor(Math.random() * stateGreetings.length)];
    }

    // 🎨 메시지 품질 향상
    async enhanceMessageQuality(message, targetQuality = 90) {
        let enhanced = message;
        let currentQuality = this.calculateNaturalness(enhanced);
        
        // 품질이 목표에 도달할 때까지 개선
        while (currentQuality < targetQuality) {
            // 더 자연스러운 표현으로 교체
            enhanced = this.replaceWithNaturalExpressions(enhanced);
            
            // 예진이다운 터치 추가
            if (Math.random() > 0.5) {
                enhanced = this.addYejinTouch(enhanced);
            }
            
            const newQuality = this.calculateNaturalness(enhanced);
            if (newQuality <= currentQuality) break; // 더 이상 개선되지 않으면 중단
            
            currentQuality = newQuality;
        }
        
        return {
            original: message,
            enhanced: enhanced,
            qualityImprovement: currentQuality - this.calculateNaturalness(message)
        };
    }

    // 🔄 자연스러운 표현으로 교체
    replaceWithNaturalExpressions(message) {
        const replacements = {
            '그렇습니다': '그래',
            '좋겠습니다': '좋겠어',
            '어떻게 생각하세요': '어떻게 생각해?',
            '괜찮으세요': '괜찮아?',
            '무엇을': '뭘',
            '어디에': '어디',
            '언제': '언제',
            '왜냐하면': '왜냐면',
            '그러므로': '그래서'
        };
        
        let natural = message;
        for (const [formal, casual] of Object.entries(replacements)) {
            natural = natural.replace(new RegExp(formal, 'g'), casual);
        }
        
        return natural;
    }

    // ✨ 예진이다운 터치 추가
    addYejinTouch(message) {
        // 랜덤하게 예진이다운 요소 추가
        const touches = [
            () => message.replace(/\.$/, '~'),
            () => message.replace(/!$/, '!!'),
            () => message.includes('아저씨') ? message : `아조씨, ${message}`,
            () => message + ' ㅎㅎ',
            () => message + ' 💕'
        ];
        
        const randomTouch = touches[Math.floor(Math.random() * touches.length)];
        return randomTouch();
    }

    // 🧹 시스템 정리 (메모리 관리)
    cleanup() {
        // 오래된 컨텍스트 정리
        const now = Date.now();
        for (const [userId, context] of this.contextMemory.entries()) {
            if (now - context.timestamp > 3600000) { // 1시간 이상
                this.contextMemory.delete(userId);
            }
        }
        
        console.log(`${colors.system}🧹 [자연어처리] 메모리 정리 완료 (남은 컨텍스트: ${this.contextMemory.size}개)${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
const naturalLanguageProcessor = new NaturalLanguageProcessor();

module.exports = {
    naturalLanguageProcessor,
    NaturalLanguageProcessor,
    YejinLanguageDatabase,
    
    // 주요 함수들
    generateNaturalResponse: (baseResponse, context) => 
        naturalLanguageProcessor.generateNaturalResponse(baseResponse, context),
    
    analyzeMessageIntent: (message) => 
        naturalLanguageProcessor.analyzeMessageIntent(message),
    
    generateTimeBasedGreeting: (timeOfDay, emotionalState) => 
        naturalLanguageProcessor.generateTimeBasedGreeting(timeOfDay, emotionalState),
    
    enhanceMessageQuality: (message, targetQuality) => 
        naturalLanguageProcessor.enhanceMessageQuality(message, targetQuality),
    
    getProcessingStatus: () => 
        naturalLanguageProcessor.getProcessingStatus(),
    
    cleanup: () => 
        naturalLanguageProcessor.cleanup()
};

console.log(`${colors.yejin}🌸 [muku-naturalLanguageProcessor] 예진이 자연어 처리 시스템 로드 완료${colors.reset}`);
console.log(`${colors.system}✨ 기능: 자연스러운 말투 생성, 감정 분석, 품질 향상, 맥락 이해${colors.reset}`);
