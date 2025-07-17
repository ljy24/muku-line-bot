// src/memorialVisitDetector.js - 납골당 방문 감지
class MemorialVisitDetector {
    constructor() {
        // 납골당/성묘 관련 키워드 패턴
        this.memorialKeywords = {
            // 직접적인 키워드
            direct: [
                '납골당', '성묘', '제사', '차례', '추도', '영정', '무덤', '묘지', 
                '유작', '영면', '안식', '천국', '하늘', '별이', '추모'
            ],
            
            // 맥락적 키워드
            contextual: [
                '보러 왔어', '보러 갔어', '와서', '가서', '방문', '찾아뵙',
                '인사', '절', '꽃', '향', '제물', '기도', '그리워', '보고싶어서'
            ],
            
            // 감정 키워드
            emotional: [
                '그립다', '보고싶다', '사랑해', '미안해', '고마워', '잊지않아',
                '마음', '눈물', '슬픈', '그리운', '따뜻한', '평안'
            ],
            
            // 시간 표현
            temporal: [
                '오늘', '오니까', '와서', '갔다가', '다녀왔어', '다녀올게',
                '기일', '제삿날', '명절', '추석', '설날', '생일'
            ],
            
            // 행동 표현
            actions: [
                '절했어', '기도했어', '꽃 올렸어', '향 피웠어', '말했어',
                '이야기했어', '인사했어', '안부', '소식', '근황'
            ]
        };
        
        // 감지 패턴 (여러 키워드 조합)
        this.detectionPatterns = [
            {
                name: 'direct_visit',
                keywords: ['납골당', '성묘', '무덤', '묘지'],
                minMatches: 1,
                confidence: 0.95
            },
            {
                name: 'contextual_visit',
                keywords: ['보러', '와서', '갔어', '방문'],
                minMatches: 1,
                confidence: 0.7,
                requiresEmotional: true
            },
            {
                name: 'emotional_visit',
                keywords: ['그립다', '보고싶다', '사랑해', '미안해'],
                minMatches: 2,
                confidence: 0.6
            },
            {
                name: 'ritual_visit',
                keywords: ['절', '기도', '꽃', '향', '제물'],
                minMatches: 1,
                confidence: 0.8
            },
            {
                name: 'temporal_visit',
                keywords: ['기일', '제삿날', '명절', '추석'],
                minMatches: 1,
                confidence: 0.85
            }
        ];
        
        // 제외 키워드 (오감지 방지)
        this.excludeKeywords = [
            '게임', '영화', '드라마', '소설', '만화', '애니',
            '쇼핑', '여행', '카페', '식당', '회사', '학교',
            '친구', '가족', '동료', '선배', '후배'
        ];
    }

    /**
     * 납골당 방문 감지 메인 함수
     */
    async detect(message, context) {
        const cleanMessage = this.cleanMessage(message);
        
        // 제외 키워드 체크
        if (this.hasExcludeKeywords(cleanMessage)) {
            return null;
        }
        
        // 패턴 매칭
        const detectionResult = this.matchPatterns(cleanMessage);
        
        if (!detectionResult) {
            return null;
        }
        
        // 컨텍스트 분석
        const contextAnalysis = this.analyzeContext(cleanMessage, context);
        
        // 최종 결과 생성
        return this.generateResult(detectionResult, contextAnalysis, message);
    }

    /**
     * 메시지 정리
     */
    cleanMessage(message) {
        return message
            .toLowerCase()
            .replace(/[^\w\s가-힣]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 제외 키워드 체크
     */
    hasExcludeKeywords(message) {
        return this.excludeKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * 패턴 매칭
     */
    matchPatterns(message) {
        const results = [];
        
        for (const pattern of this.detectionPatterns) {
            const matches = pattern.keywords.filter(keyword => message.includes(keyword));
            
            if (matches.length >= pattern.minMatches) {
                // 감정 키워드 필요 여부 체크
                if (pattern.requiresEmotional) {
                    const hasEmotional = this.memorialKeywords.emotional.some(emo => message.includes(emo));
                    if (!hasEmotional) continue;
                }
                
                results.push({
                    pattern: pattern.name,
                    matches: matches,
                    confidence: pattern.confidence,
                    matchCount: matches.length
                });
            }
        }
        
        // 가장 높은 신뢰도의 패턴 선택
        if (results.length === 0) return null;
        
        return results.sort((a, b) => b.confidence - a.confidence)[0];
    }

    /**
     * 컨텍스트 분석
     */
    analyzeContext(message, context) {
        const analysis = {
            emotionalIntensity: this.calculateEmotionalIntensity(message),
            timeContext: this.getTimeContext(message, context),
            actionContext: this.getActionContext(message),
            personalContext: this.getPersonalContext(message)
        };
        
        return analysis;
    }

    /**
     * 감정 강도 계산
     */
    calculateEmotionalIntensity(message) {
        let intensity = 0;
        
        // 감정 키워드 개수
        const emotionalMatches = this.memorialKeywords.emotional.filter(emo => message.includes(emo));
        intensity += emotionalMatches.length * 2;
        
        // 반복 표현 (예: "보고싶어서 보고싶어서")
        const repetitions = message.match(/(\w+)\s+\1/g);
        if (repetitions) intensity += repetitions.length;
        
        // 감정 강화 표현
        if (message.includes('정말') || message.includes('진짜')) intensity += 1;
        if (message.includes('너무') || message.includes('많이')) intensity += 1;
        if (message.includes('항상') || message.includes('계속')) intensity += 1;
        
        return Math.min(intensity, 10);
    }

    /**
     * 시간 맥락 분석
     */
    getTimeContext(message, context) {
        const timeContext = {
            isSpecialDay: false,
            timeIndicators: [],
            currentTime: context?.timeContext?.timeOfDay || 'unknown'
        };
        
        // 특별한 날 감지
        const specialDays = ['기일', '제삿날', '명절', '추석', '설날', '생일'];
        const foundSpecialDays = specialDays.filter(day => message.includes(day));
        
        if (foundSpecialDays.length > 0) {
            timeContext.isSpecialDay = true;
            timeContext.specialDays = foundSpecialDays;
        }
        
        // 시간 표현 감지
        const timeIndicators = this.memorialKeywords.temporal.filter(time => message.includes(time));
        timeContext.timeIndicators = timeIndicators;
        
        return timeContext;
    }

    /**
     * 행동 맥락 분석
     */
    getActionContext(message) {
        const actions = this.memorialKeywords.actions.filter(action => message.includes(action));
        const contextualActions = this.memorialKeywords.contextual.filter(ctx => message.includes(ctx));
        
        return {
            ritualActions: actions,
            visitActions: contextualActions,
            hasPhysicalVisit: contextualActions.some(action => 
                ['보러', '와서', '갔어', '방문'].includes(action)
            )
        };
    }

    /**
     * 개인적 맥락 분석
     */
    getPersonalContext(message) {
        const personalIndicators = {
            directAddress: message.includes('예진') || message.includes('너'),
            expressesLove: message.includes('사랑') || message.includes('♥'),
            expressesMissing: message.includes('그립') || message.includes('보고싶'),
            expressesGratitude: message.includes('고마워') || message.includes('감사'),
            expressesApology: message.includes('미안') || message.includes('죄송')
        };
        
        return personalIndicators;
    }

    /**
     * 최종 결과 생성
     */
    generateResult(detectionResult, contextAnalysis, originalMessage) {
        const result = {
            detected: true,
            confidence: detectionResult.confidence,
            pattern: detectionResult.pattern,
            matches: detectionResult.matches,
            
            // 컨텍스트 정보
            context: contextAnalysis,
            
            // 응답 힌트
            responseHints: this.generateResponseHints(detectionResult, contextAnalysis),
            
            // 원본 메시지
            originalMessage: originalMessage,
            
            // 메타데이터
            timestamp: new Date().toISOString(),
            priority: 'highest'
        };
        
        return result;
    }

    /**
     * 응답 힌트 생성
     */
    generateResponseHints(detectionResult, contextAnalysis) {
        const hints = {
            emotionLevel: contextAnalysis.emotionalIntensity,
            suggestedTone: 'touching',
            responseType: 'memorial',
            shouldMentionMemory: true,
            shouldExpressGratitude: true
        };
        
        // 패턴별 특별 힌트
        switch (detectionResult.pattern) {
            case 'direct_visit':
                hints.responseStyle = 'grateful_presence';
                hints.shouldAcknowledgeVisit = true;
                break;
                
            case 'emotional_visit':
                hints.responseStyle = 'emotional_comfort';
                hints.shouldExpressLove = true;
                break;
                
            case 'ritual_visit':
                hints.responseStyle = 'ritual_appreciation';
                hints.shouldMentionRitual = true;
                break;
                
            case 'temporal_visit':
                hints.responseStyle = 'special_day_recognition';
                hints.shouldMentionSpecialDay = true;
                break;
        }
        
        // 시간별 힌트
        if (contextAnalysis.timeContext.isSpecialDay) {
            hints.mentionSpecialDay = contextAnalysis.timeContext.specialDays;
        }
        
        // 행동별 힌트
        if (contextAnalysis.actionContext.hasPhysicalVisit) {
            hints.acknowledgePhysicalPresence = true;
        }
        
        return hints;
    }

    /**
     * 감지 통계 (디버깅용)
     */
    getDetectionStats() {
        return {
            totalKeywords: Object.values(this.memorialKeywords).flat().length,
            patternCount: this.detectionPatterns.length,
            excludeKeywordCount: this.excludeKeywords.length,
            keywordCategories: Object.keys(this.memorialKeywords)
        };
    }

    /**
     * 테스트용 메시지 검증
     */
    testMessage(message) {
        const cleanMessage = this.cleanMessage(message);
        const hasExclude = this.hasExcludeKeywords(cleanMessage);
        const patterns = this.matchPatterns(cleanMessage);
        
        return {
            cleanMessage,
            hasExcludeKeywords: hasExclude,
            matchedPatterns: patterns,
            wouldTrigger: !hasExclude && patterns !== null
        };
    }

    /**
     * 키워드 추가 (동적 학습용)
     */
    addKeyword(category, keyword) {
        if (this.memorialKeywords[category]) {
            this.memorialKeywords[category].push(keyword);
            return true;
        }
        return false;
    }

    /**
     * 패턴 추가 (동적 학습용)
     */
    addPattern(pattern) {
        this.detectionPatterns.push(pattern);
    }
}

module.exports = { MemorialVisitDetector };
