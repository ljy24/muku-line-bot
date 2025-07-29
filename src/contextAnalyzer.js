// ============================================================================
// contextAnalyzer.js - v2.0 (통합 시스템 연동 + 중복 해결 완성)
// 🎯 고유 기능 보존: 세밀한메시지분석 + 패턴매칭 + 카테고리화 + 응답힌트
// 🔄 통합 시스템 연동: 기존 감정 시스템들과 협력하여 중복 제거
// 🛡️ 안전 우선: 기존 분석 기능 100% 보존하면서 통합 레이어 추가
// 💾 Redis 통합: 분석 결과를 Redis에 캐싱하여 다른 시스템과 공유
// ============================================================================

// 🔄 통합 시스템들 연동 (의존성 안전 처리)
let integratedSystems = {
    moodManager: null,
    emotionalContext: null,
    autonomousSystem: null,
    commandHandler: null
};

/**
 * 🔄 통합 시스템들 안전 로딩
 */
function loadIntegratedSystems() {
    // moodManager (통합 감정 관리)
    if (!integratedSystems.moodManager) {
        try {
            integratedSystems.moodManager = require('./moodManager');
            console.log('[ContextAnalyzer] ✅ 통합 무드매니저 연동 성공');
        } catch (error) {
            console.log('[ContextAnalyzer] ⚠️ 통합 무드매니저 연동 실패:', error.message);
        }
    }
    
    // emotionalContextManager (세밀한 감정 분석)
    if (!integratedSystems.emotionalContext) {
        try {
            integratedSystems.emotionalContext = require('./emotionalContextManager');
            console.log('[ContextAnalyzer] ✅ 감정 컨텍스트 매니저 연동 성공');
        } catch (error) {
            console.log('[ContextAnalyzer] ⚠️ 감정 컨텍스트 매니저 연동 실패:', error.message);
        }
    }
    
    // muku-autonomousYejinSystem (Redis 중앙)
    if (!integratedSystems.autonomousSystem) {
        try {
            const autonomousModule = require('./muku-autonomousYejinSystem');
            integratedSystems.autonomousSystem = autonomousModule.getGlobalInstance();
            console.log('[ContextAnalyzer] ✅ 자율 시스템 연동 성공');
        } catch (error) {
            console.log('[ContextAnalyzer] ⚠️ 자율 시스템 연동 실패:', error.message);
        }
    }
    
    // commandHandler (명령어 라우팅)
    if (!integratedSystems.commandHandler) {
        try {
            integratedSystems.commandHandler = require('./commandHandler');
            console.log('[ContextAnalyzer] ✅ 명령어 핸들러 연동 성공');
        } catch (error) {
            console.log('[ContextAnalyzer] ⚠️ 명령어 핸들러 연동 실패:', error.message);
        }
    }
    
    return integratedSystems;
}

// ⚠️ 안전한 의존성 처리 (YejinPersonality, EmotionUtils가 없어도 동작)
let yejinPersonality = null;
let emotionUtils = null;

try {
    const { YejinPersonality } = require('./yejinPersonality');
    yejinPersonality = new YejinPersonality();
    console.log('[ContextAnalyzer] ✅ YejinPersonality 로드 성공');
} catch (error) {
    console.log('[ContextAnalyzer] ⚠️ YejinPersonality 로드 실패 (기본 기능으로 동작):', error.message);
}

try {
    const { EmotionUtils } = require('./emotionUtils');
    emotionUtils = new EmotionUtils();
    console.log('[ContextAnalyzer] ✅ EmotionUtils 로드 성공');
} catch (error) {
    console.log('[ContextAnalyzer] ⚠️ EmotionUtils 로드 실패 (기본 기능으로 동작):', error.message);
}

// ==================== 🎯 통합 컨텍스트 분석기 클래스 ====================
class IntegratedContextAnalyzer {
    constructor() {
        this.version = 'v2.0-integrated';
        this.instanceId = `context-analyzer-${Date.now()}`;
        
        // 🔄 통합 시스템들 로딩
        loadIntegratedSystems();
        
        // 📊 분석 통계
        this.analysisStats = {
            totalAnalyses: 0,
            emotionDetections: 0,
            keywordExtractions: 0,
            categoryClassifications: 0,
            redisIntegrations: 0,
            integrationSuccessRate: 1.0
        };
        
        // ==================== 🏷️ 키워드 패턴들 (고유 기능 보존) ====================
        this.patterns = {
            // 감정 키워드 (확장됨)
            love: ['사랑', '좋아', '예뻐', '귀여', '보고싶', '그리워', '♥', '💕', '😍', '🥰', '애정', '마음에 들어', '좋아해'],
            sad: ['슬퍼', '우울', '힘들어', '아파', '외로워', '눈물', '😢', '😭', '💔', '울어', '서럽', '마음아파'],
            angry: ['화나', '짜증', '빡쳐', '열받', '미워', '싫어', '😡', '🤬', '💢', '분노', '억울', '기분나빠'],
            happy: ['기뻐', '행복', '좋아', '신나', '웃겨', '즐거워', '😊', '😄', '🎉', '만족', '기분좋아', '상쾌'],
            shy: ['부끄러워', '창피', '민망', '😳', '🙈', '😅', '쑥스러워', '낯뜨거워'],
            sulky: ['삐졌', '토라졌', '서운', '실망', '섭섭', '😤', '😑', '화났어', '기분상해'],
            worried: ['걱정', '불안', '무서워', '근심', '염려', '두려워', '조마조마'],
            excited: ['흥분', '설레', '두근두근', '기대', '신나는', '떨려'],
            
            // 행동 키워드 (확장됨)
            photo: ['사진', '셀카', 'pic', '픽', '이미지', '모습', '얼굴', '📸', '📷', '찍어', '보여줘'],
            memory: ['기억', '추억', '그때', '예전', '과거', '옛날', '생각나', '떠올라', '기억해'],
            future: ['미래', '나중', '앞으로', '다음', '계획', '약속', '예정', '할거야'],
            
            // 특수 상황 (확장됨)
            memorial: ['납골당', '성묘', '제사', '차례', '추도', '영정', '무덤', '묘지', '제사상', '고인'],
            birthday: ['생일', '생신', '축하', '케이크', '파티', '🎂', '🎁', '🎉', '태어난 날', '기념일'],
            date: ['데이트', '만나', '보자', '같이', '함께', '약속', '나가자', '놀자', '만날까'],
            
            // 시간 표현 (확장됨)
            morning: ['아침', '굿모닝', '일찍', '새벽', '🌅', '☀️', '오전', '일어나'],
            night: ['밤', '굿나잇', '자자', '잠', '늦게', '🌙', '😴', '오후', '저녁'],
            today: ['오늘', '지금', '현재', '당장', '방금', '이제'],
            
            // 호칭/관계 (확장됨)
            calling: ['아저씨', '오빠', '자기', '여보', '사랑', '예진', '애기', '달링'],
            
            // 생리주기 관련 (확장됨)
            period: ['생리', '월경', '그날', '아파', '배아파', '컨디션', 'PMS', '생리통', '불편해'],
            
            // 질문/요청 (확장됨)
            question: ['?', '뭐', '어떻게', '왜', '언제', '어디서', '누구', '어떤', '무슨'],
            request: ['해줘', '주세요', '부탁', '도와줘', '알려줘', '가르쳐줘', '말해줘'],
            
            // 🆕 새로운 패턴들
            compliment: ['예뻐', '잘생겼', '멋져', '대단해', '최고', '훌륭해', '완벽해'],
            complaint: ['싫어', '별로', '이상해', '마음에 안들어', '불만', '아쉬워'],
            health: ['아파', '피곤', '졸려', '몸살', '감기', '건강', '컨디션', '몸조리'],
            weather: ['날씨', '비', '눈', '바람', '덥다', '춥다', '맑다', '흐려']
        };
    }

    // ==================== 🔍 메시지 종합 분석 (통합 개선) ====================

    /**
     * 🔍 메시지 종합 분석 (통합 시스템과 연동)
     */
    async analyzeIntegrated(message, userId) {
        try {
            this.analysisStats.totalAnalyses++;
            
            const cleanMessage = this.cleanMessage(message);
            const systems = loadIntegratedSystems();
            
            console.log(`[ContextAnalyzer] 🔍 통합 메시지 분석 시작: "${message.substring(0, 50)}..."`);
            
            // 기본 분석 (고유 기능)
            const basicAnalysis = {
                originalMessage: message,
                cleanMessage,
                length: cleanMessage.length,
                timestamp: new Date().toISOString(),
                userId,
                instanceId: this.instanceId,
                version: this.version
            };
            
            // 1. 🎭 감정 분석 (통합 시스템과 협력)
            const emotionAnalysis = await this.analyzeEmotionsIntegrated(cleanMessage, userId);
            
            // 2. 🏷️ 키워드 분석 (고유 기능)
            const keywordAnalysis = this.extractKeywordsAdvanced(cleanMessage);
            
            // 3. 📊 카테고리 분석 (고유 기능)
            const categoryAnalysis = this.categorizeMessageAdvanced(cleanMessage);
            
            // 4. 🏗️ 구조 분석 (고유 기능)
            const structureAnalysis = this.analyzeMessageStructure(message, cleanMessage);
            
            // 5. 🕐 맥락 분석 (고유 기능)
            const contextAnalysis = this.analyzeMessageContext(cleanMessage);
            
            // 6. 💡 응답 힌트 생성 (통합 개선)
            const responseHints = await this.generateIntegratedResponseHints(cleanMessage, emotionAnalysis, keywordAnalysis);
            
            // 종합 분석 결과
            const comprehensiveAnalysis = {
                ...basicAnalysis,
                
                // 감정 분석 (통합)
                emotions: emotionAnalysis,
                
                // 키워드 분석 (고유)
                keywords: keywordAnalysis.keywords,
                keywordStats: keywordAnalysis.stats,
                
                // 카테고리 분석 (고유)
                categories: categoryAnalysis.categories,
                categoryConfidence: categoryAnalysis.confidence,
                
                // 구조 분석 (고유)
                structure: structureAnalysis,
                
                // 맥락 분석 (고유)
                context: contextAnalysis,
                
                // 응답 힌트 (통합)
                responseHints: responseHints,
                
                // 메타정보
                analysisMetadata: {
                    integrationStatus: {
                        moodManager: !!systems.moodManager,
                        emotionalContext: !!systems.emotionalContext,
                        autonomousSystem: !!systems.autonomousSystem
                    },
                    analysisTime: Date.now(),
                    confidence: this.calculateOverallConfidence(emotionAnalysis, keywordAnalysis, categoryAnalysis)
                }
            };
            
            // 🔄 Redis에 분석 결과 캐싱
            await this.cacheAnalysisResult(comprehensiveAnalysis);
            
            console.log(`[ContextAnalyzer] ✅ 통합 분석 완료: ${comprehensiveAnalysis.emotions.detectedEmotions.length}개 감정, ${comprehensiveAnalysis.keywords.length}개 키워드 그룹`);
            
            return comprehensiveAnalysis;
            
        } catch (error) {
            console.error(`[ContextAnalyzer] ❌ 통합 분석 오류: ${error.message}`);
            
            // 오류 시 기본 분석 반환
            return this.analyzeBasic(message, userId);
        }
    }

    // ==================== 🎭 감정 분석 (통합 시스템과 협력) ====================

    /**
     * 🎭 감정 분석 (통합 시스템과 협력)
     */
    async analyzeEmotionsIntegrated(message, userId) {
        try {
            const systems = loadIntegratedSystems();
            
            // 1. 로컬 감정 감지 (고유 기능)
            const localEmotions = this.detectEmotionsLocal(message);
            
            // 2. 감정 강도 계산 (고유 기능)
            const intensity = this.calculateIntensityAdvanced(message);
            
            // 3. 통합 감정 시스템에서 현재 상태 가져오기
            let integratedEmotionState = null;
            
            if (systems.moodManager && systems.moodManager.getIntegratedMoodState) {
                try {
                    integratedEmotionState = await systems.moodManager.getIntegratedMoodState();
                    console.log(`[ContextAnalyzer] 🎭 통합 무드매니저에서 감정 상태 조회 성공`);
                } catch (error) {
                    console.log(`[ContextAnalyzer] 🎭 통합 무드매니저 조회 실패: ${error.message}`);
                }
            }
            
            // 4. 감정 컨텍스트 매니저에 감정 업데이트 요청 (중복 방지)
            if (localEmotions.length > 0 && systems.emotionalContext) {
                try {
                    if (systems.emotionalContext.updateEmotionFromUserMessageIntegrated) {
                        await systems.emotionalContext.updateEmotionFromUserMessageIntegrated(message);
                        console.log(`[ContextAnalyzer] 🎭 감정 컨텍스트 매니저에 감정 업데이트 요청 완료`);
                    }
                } catch (error) {
                    console.log(`[ContextAnalyzer] 🎭 감정 컨텍스트 매니저 업데이트 실패: ${error.message}`);
                }
            }
            
            this.analysisStats.emotionDetections++;
            
            return {
                // 로컬 분석 결과 (고유 기능)
                detectedEmotions: localEmotions,
                intensity: intensity,
                confidence: localEmotions.length > 0 ? 0.8 : 0.3,
                
                // 통합 시스템 상태
                integratedState: integratedEmotionState ? {
                    currentEmotion: integratedEmotionState.currentEmotion,
                    currentEmotionKorean: integratedEmotionState.currentEmotionKorean,
                    intensity: integratedEmotionState.intensity,
                    source: integratedEmotionState.source || 'integrated_mood_manager'
                } : null,
                
                // 분석 메타데이터
                analysisMethod: 'integrated_emotion_analysis',
                localAnalysisCount: localEmotions.length,
                hasIntegratedState: !!integratedEmotionState
            };
            
        } catch (error) {
            console.error(`[ContextAnalyzer] 🎭 통합 감정 분석 오류: ${error.message}`);
            
            // 오류 시 로컬 분석만 반환
            return {
                detectedEmotions: this.detectEmotionsLocal(message),
                intensity: this.calculateIntensityAdvanced(message),
                confidence: 0.5,
                integratedState: null,
                error: error.message
            };
        }
    }

    /**
     * 🎭 로컬 감정 감지 (고유 기능)
     */
    detectEmotionsLocal(message) {
        const detectedEmotions = [];
        
        for (const [emotion, keywords] of Object.entries(this.patterns)) {
            if (['love', 'sad', 'angry', 'happy', 'shy', 'sulky', 'worried', 'excited'].includes(emotion)) {
                const matchedKeywords = keywords.filter(keyword => message.includes(keyword));
                if (matchedKeywords.length > 0) {
                    detectedEmotions.push({
                        emotion: emotion,
                        matchedKeywords: matchedKeywords,
                        confidence: Math.min(1.0, matchedKeywords.length * 0.3)
                    });
                }
            }
        }
        
        return detectedEmotions;
    }

    /**
     * 🎭 감정 강도 계산 (고유 기능 확장)
     */
    calculateIntensityAdvanced(message) {
        let intensity = 1;
        
        // 반복 문자 (예: "사랑해애애애")
        const repetitions = message.match(/(.)\1{2,}/g);
        if (repetitions) {
            intensity += repetitions.length * 0.5;
        }
        
        // 감탄부호
        const exclamations = (message.match(/[!]/g) || []).length;
        intensity += exclamations * 0.3;
        
        // 물음표 (강조용)
        const questions = (message.match(/[?]/g) || []).length;
        intensity += questions * 0.2;
        
        // 이모티콘 개수
        const emojis = (message.match(/[😍🥰😢😭💔😡🤬💢😊😄🎉😳🙈😅😤😑]/g) || []).length;
        intensity += emojis * 0.4;
        
        // 대문자 사용 (한글에서는 ㅋㅋㅋ, ㅎㅎㅎ 등)
        const laughter = (message.match(/[ㅋㅎ]{3,}/g) || []).length;
        intensity += laughter * 0.5;
        
        // 길이 보정
        if (message.length > 50) intensity += 0.5;
        if (message.length > 100) intensity += 0.5;
        if (message.length > 200) intensity += 1;
        
        return Math.min(Math.max(intensity, 1), 10); // 1-10 범위
    }

    // ==================== 🏷️ 키워드 분석 (고유 기능 확장) ====================

    /**
     * 🏷️ 고급 키워드 추출 (고유 기능)
     */
    extractKeywordsAdvanced(message) {
        const keywordGroups = [];
        let totalMatches = 0;
        
        for (const [category, words] of Object.entries(this.patterns)) {
            const matchedWords = words.filter(word => message.includes(word));
            if (matchedWords.length > 0) {
                keywordGroups.push({
                    category: category,
                    words: matchedWords,
                    count: matchedWords.length,
                    confidence: Math.min(1.0, matchedWords.length * 0.25)
                });
                totalMatches += matchedWords.length;
            }
        }
        
        this.analysisStats.keywordExtractions++;
        
        return {
            keywords: keywordGroups,
            stats: {
                totalCategories: keywordGroups.length,
                totalMatches: totalMatches,
                averageMatches: keywordGroups.length > 0 ? totalMatches / keywordGroups.length : 0
            }
        };
    }

    // ==================== 📊 카테고리 분석 (고유 기능 확장) ====================

    /**
     * 📊 고급 메시지 분류 (고유 기능)
     */
    categorizeMessageAdvanced(message) {
        const categories = [];
        let totalConfidence = 0;
        
        // 주요 카테고리 체크 (확장됨)
        const categoryChecks = [
            { name: 'photo_request', patterns: ['photo'], weight: 1.0 },
            { name: 'memory_related', patterns: ['memory'], weight: 0.8 },
            { name: 'memorial', patterns: ['memorial'], weight: 1.0 },
            { name: 'birthday', patterns: ['birthday'], weight: 1.0 },
            { name: 'health_related', patterns: ['period', 'health'], weight: 0.7 },
            { name: 'emotional_expression', patterns: ['love', 'sad', 'angry', 'happy'], weight: 0.6 },
            { name: 'question', patterns: ['question'], weight: 0.5 },
            { name: 'request', patterns: ['request'], weight: 0.5 },
            { name: 'greeting', patterns: ['calling'], weight: 0.4 },
            { name: 'time_reference', patterns: ['morning', 'night', 'today'], weight: 0.3 },
            { name: 'weather_related', patterns: ['weather'], weight: 0.4 },
            { name: 'compliment', patterns: ['compliment'], weight: 0.6 },
            { name: 'complaint', patterns: ['complaint'], weight: 0.7 }
        ];
        
        for (const check of categoryChecks) {
            let hasMatch = false;
            let matchCount = 0;
            
            for (const patternName of check.patterns) {
                if (this.patterns[patternName] && this.patterns[patternName].some(word => message.includes(word))) {
                    hasMatch = true;
                    matchCount += this.patterns[patternName].filter(word => message.includes(word)).length;
                }
            }
            
            if (hasMatch) {
                const confidence = Math.min(1.0, (matchCount * 0.3) * check.weight);
                categories.push({
                    category: check.name,
                    confidence: confidence,
                    matchCount: matchCount
                });
                totalConfidence += confidence;
            }
        }
        
        this.analysisStats.categoryClassifications++;
        
        return {
            categories: categories,
            confidence: categories.length > 0 ? totalConfidence / categories.length : 0
        };
    }

    // ==================== 🏗️ 구조 분석 (고유 기능) ====================

    /**
     * 🏗️ 메시지 구조 분석 (고유 기능)
     */
    analyzeMessageStructure(originalMessage, cleanMessage) {
        return {
            hasQuestion: this.hasQuestion(cleanMessage),
            hasRequest: this.hasRequest(cleanMessage),
            hasEmoji: this.hasEmoji(originalMessage),
            hasRepetition: /(.)\1{2,}/.test(cleanMessage),
            hasLaughter: /[ㅋㅎ]{2,}/.test(cleanMessage),
            hasExclamation: originalMessage.includes('!'),
            sentenceCount: (cleanMessage.match(/[.!?]/g) || []).length + 1,
            wordCount: cleanMessage.split(/\s+/).length,
            isShort: cleanMessage.length < 10,
            isLong: cleanMessage.length > 100
        };
    }

    // ==================== 🕐 맥락 분석 (고유 기능) ====================

    /**
     * 🕐 메시지 맥락 분석 (고유 기능)
     */
    analyzeMessageContext(message) {
        return {
            timeContext: this.getTimeContext(),
            topicHints: this.extractTopicHints(message),
            continuationHints: this.extractContinuationHints(message),
            urgencyLevel: this.assessUrgencyLevel(message)
        };
    }

    /**
     * 🕐 시간 맥락 파악 (고유 기능)
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
            isWeekend: now.getDay() === 0 || now.getDay() === 6,
            isEarlyMorning: hour >= 5 && hour < 8,
            isLateNight: hour >= 23 || hour < 5
        };
    }

    /**
     * 🕐 주제 힌트 추출 (고유 기능)
     */
    extractTopicHints(message) {
        const hints = [];
        
        // 지시대명사 체크
        if (message.includes('그거') || message.includes('저거') || message.includes('그것')) {
            hints.push('needs_context_reference');
        }
        
        // 계속되는 대화 체크
        if (message.includes('그래서') || message.includes('그런데') || message.includes('그리고') || message.includes('근데')) {
            hints.push('continuation');
        }
        
        // 과거 참조
        if (message.includes('아까') || message.includes('전에') || message.includes('어제')) {
            hints.push('past_reference');
        }
        
        // 미래 참조
        if (message.includes('내일') || message.includes('다음에') || message.includes('나중에')) {
            hints.push('future_reference');
        }
        
        return hints;
    }

    /**
     * 🕐 연속성 힌트 추출 (고유 기능)
     */
    extractContinuationHints(message) {
        const hints = [];
        
        if (message.includes('또') || message.includes('다시')) {
            hints.push('repetition_request');
        }
        
        if (message.includes('더') || message.includes('계속')) {
            hints.push('continuation_request');
        }
        
        if (message.includes('그만') || message.includes('끝')) {
            hints.push('termination_request');
        }
        
        return hints;
    }

    /**
     * 🚨 긴급도 평가 (고유 기능)
     */
    assessUrgencyLevel(message) {
        let urgency = 1; // 기본값
        
        // 긴급 키워드
        if (message.includes('급해') || message.includes('빨리') || message.includes('당장')) {
            urgency += 3;
        }
        
        // 감탄부호 개수
        const exclamations = (message.match(/[!]/g) || []).length;
        urgency += Math.min(exclamations, 3);
        
        // 반복 강조
        if (/(.)\1{3,}/.test(message)) {
            urgency += 2;
        }
        
        // 부정적 감정
        if (this.patterns.angry.some(word => message.includes(word)) || 
            this.patterns.sad.some(word => message.includes(word))) {
            urgency += 1;
        }
        
        return Math.min(urgency, 10);
    }

    // ==================== 💡 응답 힌트 생성 (통합 개선) ====================

    /**
     * 💡 통합 응답 힌트 생성 (통합 개선)
     */
    async generateIntegratedResponseHints(message, emotionAnalysis, keywordAnalysis) {
        try {
            const hints = [];
            const systems = loadIntegratedSystems();
            
            // 1. 감정 기반 힌트 (통합)
            if (emotionAnalysis.detectedEmotions.length > 0) {
                hints.push({
                    type: 'emotional_response_needed',
                    priority: 'high',
                    details: emotionAnalysis.detectedEmotions.map(e => e.emotion),
                    source: 'emotion_analysis'
                });
            }
            
            // 2. 카테고리 기반 힌트 (고유)
            for (const keywordGroup of keywordAnalysis.keywords) {
                switch (keywordGroup.category) {
                    case 'photo':
                        hints.push({
                            type: 'photo_response_needed',
                            priority: 'high',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                        
                    case 'memory':
                        hints.push({
                            type: 'memory_reference_needed',
                            priority: 'medium',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                        
                    case 'birthday':
                        hints.push({
                            type: 'birthday_response_needed',
                            priority: 'very_high',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                        
                    case 'memorial':
                        hints.push({
                            type: 'memorial_response_needed',
                            priority: 'very_high',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                        
                    case 'question':
                        hints.push({
                            type: 'direct_answer_needed',
                            priority: 'high',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                        
                    case 'request':
                        hints.push({
                            type: 'action_required',
                            priority: 'high',
                            details: keywordGroup.words,
                            source: 'keyword_analysis'
                        });
                        break;
                }
            }
            
            // 3. 통합 시스템 기반 힌트
            if (systems.commandHandler) {
                try {
                    // commandHandler에서 처리 가능한지 확인
                    const commandResult = await systems.commandHandler.handleCommand(message, 'context_analyzer_check', null);
                    if (commandResult && commandResult.handled) {
                        hints.push({
                            type: 'command_handler_available',
                            priority: 'medium',
                            details: commandResult.type,
                            source: 'command_handler_integration'
                        });
                    }
                } catch (error) {
                    // 에러는 무시하고 계속
                }
            }
            
            // 4. 우선순위 정렬
            hints.sort((a, b) => {
                const priorities = { 'very_high': 4, 'high': 3, 'medium': 2, 'low': 1 };
                return priorities[b.priority] - priorities[a.priority];
            });
            
            return {
                hints: hints,
                totalHints: hints.length,
                hasHighPriority: hints.some(h => h.priority === 'high' || h.priority === 'very_high'),
                integratedSources: [...new Set(hints.map(h => h.source))]
            };
            
        } catch (error) {
            console.error(`[ContextAnalyzer] 💡 응답 힌트 생성 오류: ${error.message}`);
            
            // 오류 시 기본 힌트 반환
            return this.generateBasicResponseHints(message);
        }
    }

    /**
     * 💡 기본 응답 힌트 생성 (폴백)
     */
    generateBasicResponseHints(message) {
        const hints = [];
        
        // 기본적인 힌트만 생성
        if (this.detectEmotionsLocal(message).length > 0) {
            hints.push({
                type: 'emotional_response_needed',
                priority: 'medium',
                source: 'basic_analysis'
            });
        }
        
        if (this.patterns.photo.some(word => message.includes(word))) {
            hints.push({
                type: 'photo_response_needed',
                priority: 'high',
                source: 'basic_analysis'
            });
        }
        
        return {
            hints: hints,
            totalHints: hints.length,
            hasHighPriority: false,
            integratedSources: ['basic_analysis']
        };
    }

    // ==================== 🔄 Redis 통합 (새로운 기능) ====================

    /**
     * 🔄 분석 결과를 Redis에 캐싱
     */
    async cacheAnalysisResult(analysisResult) {
        try {
            const systems = loadIntegratedSystems();
            
            if (systems.autonomousSystem && systems.autonomousSystem.redisCache) {
                const cacheData = {
                    analysisResult: analysisResult,
                    userId: analysisResult.userId,
                    timestamp: Date.now(),
                    source: 'context_analyzer_v2',
                    version: this.version
                };
                
                // Redis에 분석 결과 캐싱
                await systems.autonomousSystem.redisCache.cacheLearningPattern('message_analysis', cacheData);
                
                this.analysisStats.redisIntegrations++;
                console.log(`[ContextAnalyzer] 🔄 분석 결과 Redis 캐싱 완료`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`[ContextAnalyzer] 🔄 Redis 캐싱 오류: ${error.message}`);
            return false;
        }
    }

    // ==================== 🛠️ 헬퍼 함수들 (기존 유지) ====================

    /**
     * 📝 메시지 정리 (기존 유지)
     */
    cleanMessage(message) {
        return message
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s가-힣?!.,~♥💕😍🥰😢😭💔😡🤬💢😊😄🎉😳🙈😅😤😑📸📷🎂🎁🌅☀️🌙😴]/g, '')
            .trim()
            .toLowerCase();
    }

    /**
     * ❓ 질문 여부 체크 (기존 유지)
     */
    hasQuestion(message) {
        return message.includes('?') || 
               this.patterns.question.some(q => message.includes(q));
    }

    /**
     * 🙏 요청 여부 체크 (기존 유지)
     */
    hasRequest(message) {
        return this.patterns.request.some(r => message.includes(r));
    }

    /**
     * 😊 이모티콘 여부 체크 (기존 유지)
     */
    hasEmoji(message) {
        return /[😀-🿿]/.test(message);
    }

    /**
     * 📊 전체 신뢰도 계산
     */
    calculateOverallConfidence(emotionAnalysis, keywordAnalysis, categoryAnalysis) {
        const weights = {
            emotion: 0.4,
            keyword: 0.3,
            category: 0.3
        };
        
        const emotionConfidence = emotionAnalysis.confidence || 0;
        const keywordConfidence = keywordAnalysis.stats.totalMatches > 0 ? 0.8 : 0.3;
        const categoryConfidence = categoryAnalysis.confidence || 0;
        
        return (emotionConfidence * weights.emotion + 
                keywordConfidence * weights.keyword + 
                categoryConfidence * weights.category);
    }

    // ==================== 🛡️ 기존 인터페이스 호환성 ====================

    /**
     * 🛡️ 기존 analyze() 메서드 호환성 (폴백)
     */
    async analyze(message, userId) {
        try {
            return await this.analyzeIntegrated(message, userId);
        } catch (error) {
            console.error(`[ContextAnalyzer] 🛡️ 통합 분석 실패, 기본 분석으로 폴백: ${error.message}`);
            return this.analyzeBasic(message, userId);
        }
    }

    /**
     * 🛡️ 기본 분석 (폴백)
     */
    analyzeBasic(message, userId) {
        const cleanMessage = this.cleanMessage(message);
        
        return {
            originalMessage: message,
            cleanMessage,
            length: cleanMessage.length,
            timestamp: new Date().toISOString(),
            userId,
            
            emotions: this.detectEmotionsLocal(cleanMessage),
            intensity: this.calculateIntensityAdvanced(cleanMessage),
            
            keywords: this.extractKeywordsAdvanced(cleanMessage).keywords,
            categories: this.categorizeMessageAdvanced(cleanMessage).categories,
            
            hasQuestion: this.hasQuestion(cleanMessage),
            hasRequest: this.hasRequest(cleanMessage),
            hasEmoji: this.hasEmoji(message),
            
            timeContext: this.getTimeContext(),
            topicHints: this.extractTopicHints(cleanMessage),
            
            responseHints: this.generateBasicResponseHints(cleanMessage),
            
            version: this.version,
            analysisMode: 'basic_fallback'
        };
    }

    // ==================== 📊 시스템 상태 조회 ====================

    /**
     * 📊 컨텍스트 분석기 상태 조회
     */
    getContextAnalyzerStatus() {
        const systems = loadIntegratedSystems();
        
        return {
            version: this.version,
            instanceId: this.instanceId,
            type: 'integrated_context_analyzer',
            
            // 통합 시스템 연동 상태
            integrationStatus: {
                moodManager: !!systems.moodManager,
                emotionalContext: !!systems.emotionalContext,
                autonomousSystem: !!systems.autonomousSystem,
                commandHandler: !!systems.commandHandler,
                yejinPersonality: !!yejinPersonality,
                emotionUtils: !!emotionUtils
            },
            
            // 분석 통계
            analysisStats: this.analysisStats,
            
            // 패턴 정보
            patternInfo: {
                totalPatterns: Object.keys(this.patterns).length,
                emotionPatterns: ['love', 'sad', 'angry', 'happy', 'shy', 'sulky', 'worried', 'excited'].length,
                behaviorPatterns: ['photo', 'memory', 'future'].length,
                specialPatterns: ['memorial', 'birthday', 'date'].length
            },
            
            // 고유 기능들
            uniqueFeatures: [
                '세밀한 메시지 분석',
                '패턴 기반 키워드 매칭',
                '고급 감정 강도 계산',
                '카테고리 분류 시스템',
                '응답 힌트 생성',
                'Redis 분석 결과 캐싱',
                '통합 시스템 연동'
            ],
            
            // 메타정보
            lastUpdate: Date.now()
        };
    }
}

// ==================== 📤 모듈 내보내기 ==================

// 전역 인스턴스
let globalContextAnalyzer = null;

/**
 * 🎯 전역 컨텍스트 분석기 인스턴스 가져오기
 */
function getGlobalContextAnalyzer() {
    if (!globalContextAnalyzer) {
        globalContextAnalyzer = new IntegratedContextAnalyzer();
    }
    return globalContextAnalyzer;
}

console.log('[ContextAnalyzer] v2.0 통합 컨텍스트 분석기 로드 완료');

module.exports = { 
    // 🎯 메인 클래스 (새로운 통합 버전)
    IntegratedContextAnalyzer,
    
    // 🎯 전역 인스턴스 함수
    getGlobalContextAnalyzer,
    
    // 🛡️ 기존 호환성 (레거시 지원)
    ContextAnalyzer: IntegratedContextAnalyzer // 기존 이름으로도 사용 가능
};
