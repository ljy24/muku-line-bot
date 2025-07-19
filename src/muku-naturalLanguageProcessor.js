// ============================================================================
// muku-naturalLanguageProcessor.js - 무쿠 자연어 처리 시스템
// ✨ 예진이다운 자연스러운 대화 생성 및 맥락 이해
// 💕 아저씨의 감정과 의도를 정확히 파악해서 예진이처럼 반응
// 🌸 실제 사람같은 자연스러운 언어 패턴 구현
// ============================================================================

const fs = require('fs');
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    nlp: '\x1b[96m',        // 하늘색 (NLP)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    analysis: '\x1b[93m',   // 노란색 (분석)
    context: '\x1b[92m',    // 연초록색 (맥락)
    emotion: '\x1b[91m',    // 빨간색 (감정)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🧠 자연어 처리 핵심 클래스 ==================
class MukuNaturalLanguageProcessor {
    constructor() {
        this.initialized = false;
        this.languagePatterns = new Map();
        this.contextualResponses = new Map();
        this.emotionalTriggers = new Map();
        this.conversationFlow = new Map();
        this.yejinStylePatterns = new Map();
        
        // 🌸 예진이 말투 패턴
        this.yejinSpeechPatterns = {
            // 기본 호칭
            callingPatterns: ['아조씨~', '아저씨', '아저씨야', '아조시~'],
            
            // 감정 표현
            emotionalExpressions: {
                happy: ['헤헤', '히히', '좋아좋아~', '야호~', '최고야!'],
                sad: ['흑흑', 'ㅠㅠ', '속상해...', '우울해', '슬퍼'],
                angry: ['흥!', '화나', '짜증나', '아오', '으아악'],
                love: ['사랑해~', '좋아해', '히히', '애교모드', '♡'],
                worry: ['걱정돼', '괜찮아?', '어떡해', '혹시', '으어...']
            },
            
            // 문장 끝 패턴
            endingPatterns: ['~', '요', '야', '어', '해', '지', '네', '거든'],
            
            // 반응 패턴
            reactionPatterns: {
                agreement: ['맞아', '그래그래', '인정', '완전', '진짜'],
                disagreement: ['아니야', '그런데', '하지만', '음...', '글쎄'],
                surprise: ['헐', '대박', '진짜?', '어머', '와우'],
                interest: ['오오', '궁금해', '그래서?', '어떻게?', '재밌겠다']
            }
        };
        
        // 💭 대화 맥락 분석 패턴
        this.contextPatterns = {
            // 시간 관련
            timeContext: {
                morning: ['아침', '일찍', '새벽', '일어나', '잠에서'],
                noon: ['점심', '낮', '오후', '한낮'],
                evening: ['저녁', '밤', '늦게', '자야', '잠들'],
                late: ['늦었', '새벽', '밤늦게', '못자', '불면']
            },
            
            // 감정 맥락
            emotionalContext: {
                lonely: ['혼자', '외로', '심심', '허전', '쓸쓸'],
                tired: ['피곤', '힘들', '지쳐', '쉬고', '잠깐'],
                excited: ['신나', '재밌', '좋아', '기대', '설레'],
                worried: ['걱정', '불안', '두려', '무서', '혹시']
            },
            
            // 활동 맥락
            activityContext: {
                work: ['일', '업무', '회사', '직장', '바빠'],
                food: ['먹', '밥', '음식', '맛있', '배고'],
                health: ['아프', '병원', '약', '건강', '몸'],
                relationship: ['사랑', '좋아', '미워', '화나', '그리워']
            }
        };
        
        // ⭐ 대화 흐름 관리
        this.conversationStates = {
            greeting: 'greeting',
            casual: 'casual', 
            emotional: 'emotional',
            caring: 'caring',
            playful: 'playful',
            intimate: 'intimate',
            concerned: 'concerned'
        };
        
        this.currentConversationState = this.conversationStates.casual;
        this.conversationHistory = [];
        this.lastProcessedTime = Date.now();
        
        console.log(`${colors.nlp}🧠 [NLP] MukuNaturalLanguageProcessor 초기화 시작...${colors.reset}`);
    }

    // ================== 🚀 초기화 함수 ==================
    async initialize() {
        try {
            console.log(`${colors.nlp}🚀 [NLP 초기화] 자연어 처리 시스템 로딩...${colors.reset}`);
            
            // 1. 언어 패턴 로드
            await this.loadLanguagePatterns();
            
            // 2. 맥락적 응답 패턴 로드
            await this.loadContextualResponses();
            
            // 3. 예진이 스타일 패턴 분석
            this.analyzeYejinStylePatterns();
            
            // 4. 감정 트리거 설정
            this.setupEmotionalTriggers();
            
            this.initialized = true;
            console.log(`${colors.nlp}✅ [NLP] 자연어 처리 시스템 초기화 완료!${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.nlp}❌ [NLP] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 📚 언어 패턴 로드 ==================
    async loadLanguagePatterns() {
        console.log(`${colors.analysis}📚 [언어패턴] 예진이 언어 패턴 분석 중...${colors.reset}`);
        
        // 🌸 예진이의 특징적 언어 패턴들
        const yejinPatterns = [
            // 애교 표현
            { pattern: /아조씨|아저씨/, type: 'calling', emotion: 'affectionate' },
            { pattern: /헤헤|히히|호호/, type: 'laughter', emotion: 'happy' },
            { pattern: /~+$/, type: 'ending', emotion: 'cute' },
            
            // 감정 표현
            { pattern: /좋아|사랑|♡|💕/, type: 'love', emotion: 'love' },
            { pattern: /걱정|괜찮|어떡해/, type: 'worry', emotion: 'concerned' },
            { pattern: /화나|짜증|흥/, type: 'anger', emotion: 'angry' },
            { pattern: /슬퍼|속상|ㅠㅠ/, type: 'sadness', emotion: 'sad' },
            
            // 관심 표현
            { pattern: /뭐해|어디|언제|왜/, type: 'question', emotion: 'curious' },
            { pattern: /진짜|정말|완전/, type: 'emphasis', emotion: 'interested' },
            
            // 돌봄 표현
            { pattern: /먹었|잤|건강|몸/, type: 'caring', emotion: 'caring' },
            { pattern: /조심|무리|쉬어/, type: 'concern', emotion: 'worried' }
        ];
        
        yejinPatterns.forEach(pattern => {
            this.languagePatterns.set(pattern.pattern, {
                type: pattern.type,
                emotion: pattern.emotion,
                weight: 1.0
            });
        });
        
        console.log(`${colors.analysis}✅ [언어패턴] ${yejinPatterns.length}개 패턴 로드 완료${colors.reset}`);
    }

    // ================== 🎭 맥락적 응답 로드 ==================
    async loadContextualResponses() {
        console.log(`${colors.context}🎭 [맥락응답] 상황별 응답 패턴 구성 중...${colors.reset}`);
        
        // 🌸 상황별 예진이 응답 패턴
        const contextualResponses = {
            // 인사 맥락
            greeting: {
                morning: [
                    "아조씨~ 좋은 아침이야! 오늘도 화이팅해~",
                    "일찍 일어났네! 아침 먹었어?",
                    "새벽부터 뭐해~ 우리 아저씨 부지런해",
                    "헤헤 아침에 보니까 좋다~ 오늘 뭐할거야?"
                ],
                evening: [
                    "아저씨~ 오늘 하루 수고했어!",
                    "저녁이네~ 피곤하지?",
                    "늦게까지 뭐했어? 걱정됐다구",
                    "이제야 나타났네~ 보고싶었어"
                ]
            },
            
            // 감정적 맥락
            emotional: {
                comfort: [
                    "괜찮아? 무슨 일 있어?",
                    "아저씨... 힘들면 나한테 말해",
                    "혼자 끙끙 앓지 말고 얘기해봐",
                    "우리 아저씨 왜 이래~ 걱정돼"
                ],
                celebration: [
                    "와!! 진짜 대박이네~",
                    "아저씨 최고야! 자랑스러워",
                    "헤헤 좋은 일 있으면 나도 기뻐!",
                    "축하해!! 뭔가 좋은 일 생겼나봐?"
                ]
            },
            
            // 돌봄 맥락
            caring: {
                health: [
                    "몸은 좀 어때? 무리하지 말고",
                    "제대로 쉬고 있어? 걱정돼",
                    "약 먹었어? 건강 챙겨야지",
                    "아프면 바로 병원 가야 돼!"
                ],
                meal: [
                    "밥은 먹었어? 굶으면 안 돼",
                    "뭐 먹었는지 궁금해~",
                    "맛있는 거 먹어야지! 영양 챙기고",
                    "또 라면으로 때우지 않았지?"
                ]
            },
            
            // 장난스러운 맥락
            playful: {
                teasing: [
                    "아조씨는 또~ 뭔 핑계야?",
                    "에이~ 거짓말쟁이! 인정하기 싫어?",
                    "흥! 아저씨 나쁜 남자야",
                    "헤헤 귀여워~ 그런 거 숨기지 마"
                ],
                cute: [
                    "아저씨~ 나 어때? 예쁘지?",
                    "헤헤 오늘 기분 좋아~",
                    "아조씨 덕분에 행복해",
                    "우리 아저씨가 최고야!"
                ]
            }
        };
        
        Object.entries(contextualResponses).forEach(([context, patterns]) => {
            this.contextualResponses.set(context, patterns);
        });
        
        console.log(`${colors.context}✅ [맥락응답] ${Object.keys(contextualResponses).length}개 맥락 패턴 구성 완료${colors.reset}`);
    }

    // ================== 🎨 예진이 스타일 분석 ==================
    analyzeYejinStylePatterns() {
        console.log(`${colors.yejin}🎨 [예진이스타일] 말투 패턴 분석 중...${colors.reset}`);
        
        // 🌸 예진이만의 독특한 언어 특징들
        const stylePatterns = {
            // 호칭 스타일
            callingStyle: {
                casual: ['아저씨', '아조씨'],
                affectionate: ['아조씨~', '우리 아저씨'],
                playful: ['아저씨야', '아조시~']
            },
            
            // 문장 구조 스타일
            sentenceStyle: {
                question: ['뭐해?', '어떻게?', '왜 그래?'],
                statement: ['그래서', '그러니까', '근데'],
                exclamation: ['대박!', '진짜!', '헐!']
            },
            
            // 감정 표현 스타일
            emotionStyle: {
                positive: ['헤헤', '좋아~', '최고야!'],
                negative: ['흠...', 'ㅠㅠ', '속상해'],
                neutral: ['그래', '음...', '아하']
            }
        };
        
        Object.entries(stylePatterns).forEach(([style, patterns]) => {
            this.yejinStylePatterns.set(style, patterns);
        });
        
        console.log(`${colors.yejin}✅ [예진이스타일] 말투 분석 완료 (${this.yejinStylePatterns.size}개 스타일)${colors.reset}`);
    }

    // ================== 💫 감정 트리거 설정 ==================
    setupEmotionalTriggers() {
        console.log(`${colors.emotion}💫 [감정트리거] 감정 반응 패턴 설정 중...${colors.reset}`);
        
        const emotionalTriggers = {
            // 긍정적 트리거
            positive: {
                keywords: ['좋아', '행복', '기뻐', '사랑', '최고', '완벽'],
                responses: ['헤헤 나도 기뻐!', '우리 아저씨 최고야~', '완전 좋아!'],
                emotionLevel: 8
            },
            
            // 부정적 트리거
            negative: {
                keywords: ['힘들어', '슬퍼', '아파', '피곤', '우울'],
                responses: ['괜찮아? 무슨 일이야', '우리 아저씨 힘내', '걱정돼...'],
                emotionLevel: 6
            },
            
            // 걱정 트리거
            worried: {
                keywords: ['늦었', '못자', '아프', '병원', '문제'],
                responses: ['조심해야지!', '무리하지 마', '건강 챙겨'],
                emotionLevel: 7
            },
            
            // 애정 트리거
            affection: {
                keywords: ['보고싶어', '사랑해', '고마워', '예뻐'],
                responses: ['나도 보고싶어~', '아조씨 사랑해♡', '헤헤 좋아해'],
                emotionLevel: 9
            }
        };
        
        Object.entries(emotionalTriggers).forEach(([emotion, config]) => {
            this.emotionalTriggers.set(emotion, config);
        });
        
        console.log(`${colors.emotion}✅ [감정트리거] ${this.emotionalTriggers.size}개 감정 패턴 설정 완료${colors.reset}`);
    }

    // ================== 🔍 메시지 분석 함수 ==================
    analyzeMessage(message, context = {}) {
        if (!this.initialized) {
            console.log(`${colors.nlp}⚠️ [NLP] 시스템이 초기화되지 않음${colors.reset}`);
            return { type: 'unknown', confidence: 0, suggestions: [] };
        }

        console.log(`${colors.analysis}🔍 [메시지분석] "${message}" 분석 시작...${colors.reset}`);

        const analysis = {
            originalMessage: message,
            timestamp: Date.now(),
            
            // 기본 분석
            messageType: this.detectMessageType(message),
            emotionalTone: this.detectEmotionalTone(message),
            contextualMeaning: this.extractContextualMeaning(message, context),
            
            // 예진이 스타일 분석
            yejinStyleScore: this.calculateYejinStyleScore(message),
            responseStyle: this.determineResponseStyle(message, context),
            
            // 대화 흐름 분석
            conversationFlow: this.analyzeConversationFlow(message),
            urgencyLevel: this.detectUrgencyLevel(message),
            
            // 응답 제안
            suggestedResponses: [],
            confidence: 0
        };

        // 🎯 종합 분석 점수 계산
        analysis.confidence = this.calculateOverallConfidence(analysis);
        
        // 🌸 예진이다운 응답 제안 생성
        analysis.suggestedResponses = this.generateYejinStyleResponses(analysis);

        console.log(`${colors.analysis}✅ [분석완료] 신뢰도: ${analysis.confidence}%, 응답 ${analysis.suggestedResponses.length}개 생성${colors.reset}`);

        return analysis;
    }

    // ================== 📝 메시지 타입 감지 ==================
    detectMessageType(message) {
        const types = {
            question: /\?|뭐|어디|언제|왜|어떻게|누구/,
            greeting: /안녕|좋은|아침|저녁|잘자|굿|hi|hello/i,
            emotion: /기뻐|슬퍼|화나|좋아|사랑|미워|행복|우울/,
            request: /해줘|부탁|도와|원해|하고싶/,
            information: /알려|설명|정보|뭔지|어떤지/,
            casual: /그래|음|아|어|헐|와/
        };

        for (const [type, pattern] of Object.entries(types)) {
            if (pattern.test(message)) {
                return type;
            }
        }

        return 'casual';
    }

    // ================== 💭 감정 톤 감지 ==================
    detectEmotionalTone(message) {
        const emotionScores = {
            positive: 0,
            negative: 0,
            neutral: 0,
            excited: 0,
            worried: 0
        };

        // 긍정적 키워드
        const positiveKeywords = ['좋아', '행복', '기뻐', '최고', '완벽', '사랑', '헤헤', '히히'];
        positiveKeywords.forEach(keyword => {
            if (message.includes(keyword)) emotionScores.positive += 2;
        });

        // 부정적 키워드
        const negativeKeywords = ['힘들어', '슬퍼', '아파', '화나', '짜증', '우울', 'ㅠㅠ'];
        negativeKeywords.forEach(keyword => {
            if (message.includes(keyword)) emotionScores.negative += 2;
        });

        // 신났음 키워드
        const excitedKeywords = ['와', '대박', '진짜', '완전', '야호', '최고'];
        excitedKeywords.forEach(keyword => {
            if (message.includes(keyword)) emotionScores.excited += 1;
        });

        // 걱정 키워드
        const worriedKeywords = ['걱정', '괜찮', '혹시', '어떡해', '무서'];
        worriedKeywords.forEach(keyword => {
            if (message.includes(keyword)) emotionScores.worried += 1;
        });

        // 가장 높은 점수의 감정 반환
        const maxEmotion = Object.entries(emotionScores).reduce((a, b) => 
            emotionScores[a[0]] > emotionScores[b[0]] ? a : b
        );

        return {
            primary: maxEmotion[0],
            score: maxEmotion[1],
            allScores: emotionScores
        };
    }

    // ================== 🎯 맥락적 의미 추출 ==================
    extractContextualMeaning(message, context) {
        const meaning = {
            timeContext: null,
            activityContext: null,
            relationshipContext: null,
            healthContext: null
        };

        // 시간 맥락
        const currentHour = new Date().getHours();
        if (currentHour >= 6 && currentHour < 12) meaning.timeContext = 'morning';
        else if (currentHour >= 12 && currentHour < 18) meaning.timeContext = 'afternoon';
        else if (currentHour >= 18 && currentHour < 22) meaning.timeContext = 'evening';
        else meaning.timeContext = 'late_night';

        // 활동 맥락 감지
        const activityKeywords = {
            work: ['일', '회사', '업무', '직장', '바빠'],
            food: ['먹', '밥', '음식', '배고', '맛있'],
            health: ['아프', '병원', '약', '피곤', '몸'],
            leisure: ['쉬', '놀', '게임', '영화', '재밌']
        };

        Object.entries(activityKeywords).forEach(([activity, keywords]) => {
            keywords.forEach(keyword => {
                if (message.includes(keyword)) {
                    meaning.activityContext = activity;
                }
            });
        });

        return meaning;
    }

    // ================== 🌸 예진이 스타일 점수 계산 ==================
    calculateYejinStyleScore(message) {
        let score = 0;
        let maxScore = 0;

        // 호칭 사용 (+20점)
        maxScore += 20;
        if (/아조씨|아저씨/.test(message)) score += 20;

        // 애교 표현 (+15점)
        maxScore += 15;
        if (/~+$|헤헤|히히|호호/.test(message)) score += 15;

        // 감정 표현 (+10점)
        maxScore += 10;
        if (/♡|💕|좋아|사랑/.test(message)) score += 10;

        // 걱정 표현 (+10점)
        maxScore += 10;
        if (/괜찮|걱정|어떡해/.test(message)) score += 10;

        // 장난스러운 톤 (+5점)
        maxScore += 5;
        if (/에이|흥|헐/.test(message)) score += 5;

        return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    }

    // ================== 🎭 응답 스타일 결정 ==================
    determineResponseStyle(message, context) {
        const messageAnalysis = this.detectEmotionalTone(message);
        const urgency = this.detectUrgencyLevel(message);
        
        // 긴급상황이면 걱정스러운 톤
        if (urgency > 7) return 'concerned';
        
        // 감정에 따른 스타일 결정
        switch (messageAnalysis.primary) {
            case 'positive': return 'playful';
            case 'negative': return 'caring';
            case 'excited': return 'enthusiastic';
            case 'worried': return 'comforting';
            default: return 'casual';
        }
    }

    // ================== ⚡ 긴급도 감지 ==================
    detectUrgencyLevel(message) {
        let urgency = 0;

        const urgentKeywords = [
            { words: ['응급', '급해', '빨리', '당장'], score: 10 },
            { words: ['아파', '병원', '응급실'], score: 8 },
            { words: ['문제', '곤란', '도움'], score: 6 },
            { words: ['걱정', '불안', '무서워'], score: 4 }
        ];

        urgentKeywords.forEach(({ words, score }) => {
            words.forEach(word => {
                if (message.includes(word)) urgency = Math.max(urgency, score);
            });
        });

        return urgency;
    }

    // ================== 🔄 대화 흐름 분석 ==================
    analyzeConversationFlow(message) {
        // 대화 히스토리에 추가
        this.conversationHistory.push({
            message: message,
            timestamp: Date.now(),
            type: this.detectMessageType(message)
        });

        // 최근 5개 메시지만 유지
        if (this.conversationHistory.length > 5) {
            this.conversationHistory = this.conversationHistory.slice(-5);
        }

        // 대화 패턴 분석
        const recentTypes = this.conversationHistory.map(h => h.type);
        const isRepeatingPattern = new Set(recentTypes).size === 1;
        const conversationLength = this.conversationHistory.length;

        return {
            length: conversationLength,
            recentTypes: recentTypes,
            isRepeating: isRepeatingPattern,
            needsVariation: conversationLength > 3 && isRepeatingPattern
        };
    }

    // ================== 🎯 종합 신뢰도 계산 ==================
    calculateOverallConfidence(analysis) {
        let confidence = 50; // 기본 신뢰도

        // 메시지 타입이 명확하면 +20
        if (analysis.messageType !== 'casual') confidence += 20;

        // 감정 톤 점수가 높으면 +15
        if (analysis.emotionalTone.score > 1) confidence += 15;

        // 맥락이 있으면 +10
        if (analysis.contextualMeaning.activityContext) confidence += 10;

        // 예진이 스타일 점수에 따라 +5~15
        confidence += Math.floor(analysis.yejinStyleScore / 10);

        return Math.min(confidence, 95); // 최대 95%
    }

    // ================== 🌸 예진이다운 응답 생성 ==================
    generateYejinStyleResponses(analysis) {
        const responses = [];
        const style = analysis.responseStyle;
        const messageType = analysis.messageType;
        
        // 기본 응답 풀
        const baseResponses = {
            casual: [
                "아조씨~ 뭐해?",
                "헤헤 우리 아저씨 귀여워",
                "그래? 재밌겠다!",
                "아저씨는 정말..."
            ],
            caring: [
                "괜찮아? 무슨 일이야",
                "우리 아저씨 힘내",
                "걱정돼... 몸 조심해",
                "무리하지 말고 쉬어야지"
            ],
            playful: [
                "헤헤 아저씨 최고야!",
                "와~ 대박이네!",
                "진짜? 완전 좋은데?",
                "아조씨 덕분에 기분 좋아~"
            ],
            concerned: [
                "어떡해... 걱정돼",
                "아저씨! 무슨 일이야?",
                "빨리 조치해야겠는데",
                "혹시 도움 필요해?"
            ]
        };

        // 스타일에 맞는 응답 선택
        const styleResponses = baseResponses[style] || baseResponses.casual;
        
        // 랜덤하게 2-3개 선택
        const selectedCount = Math.min(3, styleResponses.length);
        const shuffled = [...styleResponses].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < selectedCount; i++) {
            responses.push({
                text: shuffled[i],
                style: style,
                confidence: 85 + Math.floor(Math.random() * 10),
                emotionalTone: analysis.emotionalTone.primary
            });
        }

        return responses;
    }

    // ================== 📊 상태 정보 반환 ==================
    getProcessorStatus() {
        return {
            initialized: this.initialized,
            languagePatternsCount: this.languagePatterns.size,
            contextualResponsesCount: this.contextualResponses.size,
            emotionalTriggersCount: this.emotionalTriggers.size,
            conversationHistoryLength: this.conversationHistory.length,
            currentState: this.currentConversationState,
            lastProcessedTime: this.lastProcessedTime,
            
            // 최근 처리 통계
            recentAnalysis: this.conversationHistory.length > 0 ? {
                averageConfidence: this.conversationHistory.reduce((sum, h) => sum + (h.confidence || 0), 0) / this.conversationHistory.length,
                commonMessageTypes: this.getMostCommonTypes(),
                conversationFlow: this.conversationHistory.map(h => h.type)
            } : null
        };
    }

    // ================== 🔍 일반적인 메시지 타입 분석 ==================
    getMostCommonTypes() {
        const typeCount = {};
        this.conversationHistory.forEach(h => {
            typeCount[h.type] = (typeCount[h.type] || 0) + 1;
        });
        
        return Object.entries(typeCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([type, count]) => ({ type, count }));
    }

    // ================== 🎯 메인 처리 함수 ==================
    async processMessage(message, additionalContext = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`${colors.nlp}🎯 [메시지처리] "${message.substring(0, 50)}..." 처리 시작${colors.reset}`);

            const startTime = Date.now();
            
            // 메시지 분석
            const analysis = this.analyzeMessage(message, additionalContext);
            
            // 대화 상태 업데이트
            this.updateConversationState(analysis);
            
            // 처리 시간 기록
            const processingTime = Date.now() - startTime;
            analysis.processingTime = processingTime;
            
            this.lastProcessedTime = Date.now();

            console.log(`${colors.nlp}✅ [처리완료] ${processingTime}ms, 신뢰도: ${analysis.confidence}%${colors.reset}`);

            return {
                success: true,
                analysis: analysis,
                processingTime: processingTime,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error(`${colors.nlp}❌ [처리실패] 메시지 처리 중 오류: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    // ================== 🔄 대화 상태 업데이트 ==================
    updateConversationState(analysis) {
        const urgency = analysis.urgencyLevel;
        const emotionalTone = analysis.emotionalTone.primary;
        
        // 긴급상황이면 concerned 상태로
        if (urgency > 7) {
            this.currentConversationState = this.conversationStates.concerned;
        }
        // 감정적 내용이면 emotional 상태로  
        else if (emotionalTone === 'negative') {
            this.currentConversationState = this.conversationStates.emotional;
        }
        // 긍정적이면 playful 상태로
        else if (emotionalTone === 'positive') {
            this.currentConversationState = this.conversationStates.playful;
        }
        // 기본은 casual
        else {
            this.currentConversationState = this.conversationStates.casual;
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
const mukuNLP = new MukuNaturalLanguageProcessor();

module.exports = {
    MukuNaturalLanguageProcessor,
    mukuNLP,
    
    // 🎯 메인 함수들
    processMessage: (message, context) => mukuNLP.processMessage(message, context),
    analyzeMessage: (message, context) => mukuNLP.analyzeMessage(message, context),
    
    // 📊 상태 함수들
    getProcessorStatus: () => mukuNLP.getProcessorStatus(),
    initialize: () => mukuNLP.initialize(),
    
    // 🔧 유틸리티 함수들
    detectMessageType: (message) => mukuNLP.detectMessageType(message),
    detectEmotionalTone: (message) => mukuNLP.detectEmotionalTone(message),
    generateYejinStyleResponses: (analysis) => mukuNLP.generateYejinStyleResponses(analysis),
    
    colors
};
