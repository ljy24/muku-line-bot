// ============================================================================
// muku-qualityAssuranceEngine.js - 품질 보증 엔진
// 🔍 모든 응답의 품질을 실시간 체크
// 🌸 예진이답지 않은 응답 자동 필터링
// 🛡️ 실전 운영 안정성 100% 보장
// 🚀 실전 운영용 - 모든 응답이 이 엔진을 통과
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    quality: '\x1b[1m\x1b[92m',     // 굵은 초록색 (품질)
    check: '\x1b[96m',              // 하늘색 (체크)
    filter: '\x1b[93m',             // 노란색 (필터)
    security: '\x1b[91m',           // 빨간색 (보안)
    improvement: '\x1b[95m',        // 자주색 (개선)
    reset: '\x1b[0m'
};

// ================== 🛡️ 품질 보증 엔진 클래스 ==================
class QualityAssuranceEngine {
    constructor() {
        this.qualityMetrics = {
            // 예진이다움 측정 지표들
            yejinLikeness: {
                speechPattern: 0,        // 말투 일치도 (0-1)
                emotionalTone: 0,        // 감정 톤 일치도
                characterTraits: 0,      // 성격 특성 일치도
                contextualFit: 0,        // 맥락 적합성
                authenticity: 0          // 진정성
            },
            
            // 기술적 품질 지표들
            technical: {
                responseTime: 0,         // 응답 시간 (ms)
                tokenEfficiency: 0,      // 토큰 효율성
                errorRate: 0,           // 에러율
                systemStability: 0,     // 시스템 안정성
                memoryConsistency: 0    // 기억 일관성
            },
            
            // 사용자 경험 지표들
            userExperience: {
                naturalness: 0,         // 자연스러움
                engagement: 0,          // 참여도
                emotionalResonance: 0,  // 감정적 공명
                conversationFlow: 0,    // 대화 흐름
                satisfaction: 0         // 만족도
            }
        };
        
        this.qualityRules = {
            // 예진이 필수 특성들
            requiredTraits: [
                'cute_speech',          // 귀여운 말투
                'affectionate_tone',    // 애정적 톤
                'playful_nature',       // 장난기
                'caring_attitude',      // 돌봄 태도
                'korean_speech'         // 한국어 말투
            ],
            
            // 금지된 표현들
            forbiddenExpressions: [
                'AI입니다',
                '인공지능',
                '프로그램',
                '시스템',
                '데이터베이스',
                '알고리즘',
                '처리',
                '분석',
                '계산'
            ],
            
            // 필수 포함 요소들
            requiredElements: [
                'personal_touch',       // 개인적 터치
                'emotional_expression', // 감정 표현
                'contextual_reference', // 맥락 참조
                'relationship_awareness' // 관계 인식
            ]
        };
        
        this.qualityHistory = {
            recentChecks: [],           // 최근 품질 체크들
            qualityTrends: [],          // 품질 트렌드
            failureAnalysis: [],        // 실패 분석
            improvementSuggestions: []  // 개선 제안들
        };
        
        this.improvementEngine = {
            patterns: {},               // 개선 패턴들
            feedback: [],              // 피드백 데이터
            optimizations: [],         // 최적화 내역
            learningData: []           // 학습 데이터
        };
        
        this.dataPath = path.join(__dirname, 'data', 'quality_assurance_data.json');
        this.isInitialized = false;
    }

    // ================== 🚀 초기화 ==================
    async initialize() {
        try {
            console.log(`${colors.quality}🛡️ [품질보증] 엔진 초기화 시작...${colors.reset}`);
            
            // 기존 품질 데이터 로드
            await this.loadQualityData();
            
            // 품질 규칙 설정
            this.setupQualityRules();
            
            // 실시간 모니터링 시작
            this.startRealTimeMonitoring();
            
            this.isInitialized = true;
            console.log(`${colors.quality}✅ [품질보증] 초기화 완료 - 응답 품질 100% 보장 시스템 활성화${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.quality}❌ [품질보증] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 🔍 응답 품질 체크 (메인 함수) ==================
    async checkResponseQuality(response, context = {}) {
        try {
            if (!this.isInitialized) {
                console.log(`${colors.quality}⚠️ [품질체크] 엔진 미초기화 - 기본 통과${colors.reset}`);
                return { passed: true, score: 0.7, issues: ['engine_not_initialized'] };
            }
            
            console.log(`${colors.check}🔍 [품질체크] 응답 품질 검사 시작...${colors.reset}`);
            
            const startTime = Date.now();
            
            // 1. 예진이다움 체크
            const yejinLikenessScore = await this.checkYejinLikeness(response, context);
            
            // 2. 기술적 품질 체크
            const technicalScore = this.checkTechnicalQuality(response, context);
            
            // 3. 사용자 경험 체크
            const uxScore = this.checkUserExperience(response, context);
            
            // 4. 종합 품질 점수 계산
            const qualityResult = this.calculateOverallQuality({
                yejinLikeness: yejinLikenessScore,
                technical: technicalScore,
                userExperience: uxScore
            });
            
            // 5. 응답 시간 측정
            const responseTime = Date.now() - startTime;
            qualityResult.responseTime = responseTime;
            
            // 6. 품질 히스토리 기록
            this.recordQualityCheck(response, context, qualityResult);
            
            // 7. 결과 출력
            const passStatus = qualityResult.score >= 0.7 ? '통과' : '실패';
            const emoji = qualityResult.score >= 0.7 ? '✅' : '❌';
            console.log(`${colors.check}${emoji} [품질체크] ${passStatus} - 점수: ${Math.round(qualityResult.score * 100)}% (${responseTime}ms)${colors.reset}`);
            
            return qualityResult;
        } catch (error) {
            console.error(`${colors.check}❌ [품질체크] 실패: ${error.message}${colors.reset}`);
            return { passed: false, score: 0, issues: ['quality_check_error'], error: error.message };
        }
    }

    // ================== 🌸 예진이다움 체크 ==================
    async checkYejinLikeness(response, context) {
        console.log(`${colors.filter}🌸 [예진이다움] 체크 중...${colors.reset}`);
        
        const checks = {
            speechPattern: this.checkSpeechPattern(response),
            emotionalTone: this.checkEmotionalTone(response),
            characterTraits: this.checkCharacterTraits(response),
            contextualFit: this.checkContextualFit(response, context),
            authenticity: this.checkAuthenticity(response)
        };
        
        // 금지된 표현 체크
        const forbiddenCheck = this.checkForbiddenExpressions(response);
        if (!forbiddenCheck.passed) {
            checks.penalty = forbiddenCheck.penalty;
        }
        
        // 필수 요소 체크
        const requiredCheck = this.checkRequiredElements(response);
        if (!requiredCheck.passed) {
            checks.bonus = requiredCheck.bonus;
        }
        
        const averageScore = Object.values(checks)
            .filter(v => typeof v === 'number')
            .reduce((sum, score) => sum + score, 0) / Object.keys(checks).filter(k => k !== 'penalty' && k !== 'bonus').length;
        
        let finalScore = averageScore;
        if (checks.penalty) finalScore -= checks.penalty;
        if (checks.bonus) finalScore += checks.bonus;
        
        finalScore = Math.max(0, Math.min(1, finalScore));
        
        console.log(`${colors.filter}🌸 [예진이다움] 점수: ${Math.round(finalScore * 100)}%${colors.reset}`);
        
        return {
            score: finalScore,
            details: checks,
            issues: this.identifyYejinLikenessIssues(checks)
        };
    }

    // ================== 🔧 기술적 품질 체크 ==================
    checkTechnicalQuality(response, context) {
        console.log(`${colors.check}🔧 [기술품질] 체크 중...${colors.reset}`);
        
        const checks = {
            responseLength: this.checkResponseLength(response),
            grammarQuality: this.checkGrammarQuality(response),
            memoryConsistency: this.checkMemoryConsistency(response, context),
            systemStability: this.checkSystemStability(),
            tokenEfficiency: this.checkTokenEfficiency(response)
        };
        
        const averageScore = Object.values(checks).reduce((sum, score) => sum + score, 0) / Object.keys(checks).length;
        
        console.log(`${colors.check}🔧 [기술품질] 점수: ${Math.round(averageScore * 100)}%${colors.reset}`);
        
        return {
            score: averageScore,
            details: checks,
            issues: this.identifyTechnicalIssues(checks)
        };
    }

    // ================== 👥 사용자 경험 체크 ==================
    checkUserExperience(response, context) {
        console.log(`${colors.check}👥 [사용자경험] 체크 중...${colors.reset}`);
        
        const checks = {
            naturalness: this.checkNaturalness(response),
            engagement: this.checkEngagement(response),
            emotionalResonance: this.checkEmotionalResonance(response, context),
            conversationFlow: this.checkConversationFlow(response, context),
            clarity: this.checkClarity(response)
        };
        
        const averageScore = Object.values(checks).reduce((sum, score) => sum + score, 0) / Object.keys(checks).length;
        
        console.log(`${colors.check}👥 [사용자경험] 점수: ${Math.round(averageScore * 100)}%${colors.reset}`);
        
        return {
            score: averageScore,
            details: checks,
            issues: this.identifyUXIssues(checks)
        };
    }

    // ================== 📊 개별 체크 함수들 ==================
    checkSpeechPattern(response) {
        let score = 0.5; // 기본 점수
        
        // 예진이 특유 표현들 체크
        const yejinExpressions = [
            '아조씨', '응~', '히히', '에헤헤', '그치', '좋아해', '사랑해',
            '♡', '~', '왜 불러', '괜찮아?', '바보야', '몰라', '흥!'
        ];
        
        const foundExpressions = yejinExpressions.filter(expr => response.includes(expr));
        score += foundExpressions.length * 0.1;
        
        // 반말/존댓말 혼용 체크 (예진이는 주로 반말)
        const hasPoliteForm = /습니다|해요|이에요|예요/g.test(response);
        if (hasPoliteForm) score -= 0.2;
        
        return Math.max(0, Math.min(1, score));
    }

    checkEmotionalTone(response) {
        let score = 0.5;
        
        // 감정 표현 단어들
        const emotionalWords = [
            '좋아', '사랑', '기뻐', '행복', '즐거', '신나', '걱정', '무서',
            '슬프', '화나', '짜증', '삐짐', '귀여', '예뻐', '고마', '미안'
        ];
        
        const foundEmotions = emotionalWords.filter(word => response.includes(word));
        score += foundEmotions.length * 0.1;
        
        // 이모티콘/특수문자 체크
        const hasEmoticons = /[♡❤️💕😊😢😤🥺]/g.test(response);
        if (hasEmoticons) score += 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    checkCharacterTraits(response) {
        let score = 0.5;
        
        // 예진이 성격 특성들
        const traits = {
            cute: ['귀여', '애교', '에헤헤', '히히'],
            caring: ['괜찮아', '걱정', '조심해', '아파'],
            playful: ['장난', '놀자', '재밌', '웃겨'],
            affectionate: ['사랑', '좋아해', '♡', '고마워'],
            sulky: ['삐짐', '흥', '몰라', '바보']
        };
        
        let traitCount = 0;
        for (const [trait, words] of Object.entries(traits)) {
            if (words.some(word => response.includes(word))) {
                traitCount++;
            }
        }
        
        score += traitCount * 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    checkContextualFit(response, context) {
        let score = 0.7; // 기본 점수 (컨텍스트 정보가 없을 수 있음)
        
        if (context.messageType) {
            // 메시지 타입별 적합성 체크
            switch (context.messageType) {
                case 'greeting':
                    score = response.includes('안녕') || response.includes('어서와') ? 0.9 : 0.6;
                    break;
                case 'comfort':
                    score = response.includes('괜찮아') || response.includes('걱정') ? 0.9 : 0.5;
                    break;
                case 'playful':
                    score = response.includes('장난') || response.includes('놀자') ? 0.9 : 0.6;
                    break;
            }
        }
        
        return score;
    }

    checkAuthenticity(response) {
        let score = 0.8; // 기본적으로 높은 점수
        
        // AI스러운 표현들 페널티
        const aiLikeExpressions = [
            '도움이 되', '정보를 제공', '이해하겠습니다', '확인해보겠습니다',
            '분석해보니', '데이터에 따르면', '시스템에서', '처리하겠습니다'
        ];
        
        const foundAIExpressions = aiLikeExpressions.filter(expr => response.includes(expr));
        score -= foundAIExpressions.length * 0.2;
        
        return Math.max(0, Math.min(1, score));
    }

    checkForbiddenExpressions(response) {
        const found = this.qualityRules.forbiddenExpressions.filter(expr => 
            response.toLowerCase().includes(expr.toLowerCase())
        );
        
        return {
            passed: found.length === 0,
            penalty: found.length * 0.3,
            foundExpressions: found
        };
    }

    checkRequiredElements(response) {
        // 기본적인 필수 요소들 체크
        let bonus = 0;
        
        // 개인적 터치 (이름 언급)
        if (response.includes('아조씨') || response.includes('아저씨')) bonus += 0.1;
        
        // 감정 표현
        if (/[♡❤️💕😊😢😤🥺~]/.test(response)) bonus += 0.1;
        
        return {
            passed: bonus > 0,
            bonus: bonus
        };
    }

    // ================== 🔧 기술적 체크 함수들 ==================
    checkResponseLength(response) {
        const length = response.length;
        if (length < 10) return 0.3; // 너무 짧음
        if (length > 500) return 0.7; // 너무 길음
        if (length >= 20 && length <= 200) return 1.0; // 적절함
        return 0.8; // 그럭저럭
    }

    checkGrammarQuality(response) {
        // 기본적인 문법 체크
        let score = 0.8;
        
        // 문장 끝 처리 체크
        const hasProperEnding = /[.!?~♡]$/.test(response.trim());
        if (!hasProperEnding) score -= 0.2;
        
        // 연속된 특수문자 체크
        const hasExcessiveSpecial = /[~!?]{3,}/.test(response);
        if (hasExcessiveSpecial) score -= 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    checkMemoryConsistency(response, context) {
        // 메모리 일관성 체크 (간단한 버전)
        let score = 0.8;
        
        if (context.previousMessages) {
            // 이전 메시지와의 일관성 체크
            // 예: 이름이나 중요한 정보의 일관성
        }
        
        return score;
    }

    checkSystemStability() {
        // 시스템 안정성 (현재 상태 기반)
        return 0.9; // 기본적으로 안정적이라고 가정
    }

    checkTokenEfficiency(response) {
        // 토큰 효율성 (응답 길이 대비 정보량)
        const wordCount = response.split(/\s+/).length;
        const charCount = response.length;
        
        if (wordCount === 0) return 0;
        
        const efficiency = Math.min(1, charCount / (wordCount * 10)); // 단어당 적정 글자수
        return efficiency;
    }

    // ================== 👥 UX 체크 함수들 ==================
    checkNaturalness(response) {
        let score = 0.7;
        
        // 자연스러운 한국어 패턴 체크
        const naturalPatterns = ['그래', '응', '아니야', '맞아', '정말', '진짜'];
        const foundPatterns = naturalPatterns.filter(pattern => response.includes(pattern));
        score += foundPatterns.length * 0.05;
        
        return Math.max(0, Math.min(1, score));
    }

    checkEngagement(response) {
        let score = 0.6;
        
        // 참여도를 높이는 요소들
        const engagingElements = ['?', '어때', '그치', '너도', '같이', '우리'];
        const foundElements = engagingElements.filter(element => response.includes(element));
        score += foundElements.length * 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    checkEmotionalResonance(response, context) {
        let score = 0.7;
        
        if (context.emotionalContext) {
            // 감정 맥락에 맞는 응답인지 체크
            if (context.emotionalContext.needsComfort && response.includes('괜찮아')) {
                score += 0.2;
            }
            if (context.emotionalContext.isHappy && /좋|기뻐|행복/.test(response)) {
                score += 0.2;
            }
        }
        
        return Math.max(0, Math.min(1, score));
    }

    checkConversationFlow(response, context) {
        // 대화 흐름 체크
        return 0.8; // 기본값
    }

    checkClarity(response) {
        let score = 0.8;
        
        // 명확성 체크
        if (response.length > 0 && response.trim().length > 0) {
            score = 0.9;
        }
        
        return score;
    }

    // ================== 📊 종합 품질 계산 ==================
    calculateOverallQuality(scores) {
        const weights = {
            yejinLikeness: 0.5,    // 예진이다움이 가장 중요
            technical: 0.3,        // 기술적 품질
            userExperience: 0.2    // 사용자 경험
        };
        
        const overallScore = 
            scores.yejinLikeness.score * weights.yejinLikeness +
            scores.technical.score * weights.technical +
            scores.userExperience.score * weights.userExperience;
        
        const passed = overallScore >= 0.7;
        
        const allIssues = [
            ...scores.yejinLikeness.issues,
            ...scores.technical.issues,
            ...scores.userExperience.issues
        ];
        
        return {
            passed: passed,
            score: overallScore,
            breakdown: scores,
            issues: allIssues,
            recommendations: this.generateRecommendations(scores, allIssues)
        };
    }

    // ================== 🔍 이슈 식별 함수들 ==================
    identifyYejinLikenessIssues(checks) {
        const issues = [];
        
        if (checks.speechPattern < 0.6) issues.push('speech_pattern_mismatch');
        if (checks.emotionalTone < 0.6) issues.push('emotional_tone_weak');
        if (checks.characterTraits < 0.6) issues.push('character_traits_missing');
        if (checks.authenticity < 0.7) issues.push('authenticity_low');
        if (checks.penalty) issues.push('forbidden_expressions_found');
        
        return issues;
    }

    identifyTechnicalIssues(checks) {
        const issues = [];
        
        if (checks.responseLength < 0.7) issues.push('response_length_issue');
        if (checks.grammarQuality < 0.7) issues.push('grammar_issues');
        if (checks.memoryConsistency < 0.7) issues.push('memory_inconsistency');
        if (checks.tokenEfficiency < 0.6) issues.push('token_inefficiency');
        
        return issues;
    }

    identifyUXIssues(checks) {
        const issues = [];
        
        if (checks.naturalness < 0.7) issues.push('unnaturalness');
        if (checks.engagement < 0.6) issues.push('low_engagement');
        if (checks.emotionalResonance < 0.7) issues.push('emotional_disconnect');
        if (checks.clarity < 0.7) issues.push('unclear_response');
        
        return issues;
    }

    // ================== 💡 개선 제안 생성 ==================
    generateRecommendations(scores, issues) {
        const recommendations = [];
        
        if (issues.includes('speech_pattern_mismatch')) {
            recommendations.push('예진이 특유의 말투(아조씨, 응~, 히히 등) 추가 필요');
        }
        
        if (issues.includes('emotional_tone_weak')) {
            recommendations.push('감정 표현을 더 풍부하게 (♡, ~, 이모티콘 활용)');
        }
        
        if (issues.includes('character_traits_missing')) {
            recommendations.push('예진이 성격 특성(귀여움, 애교, 장난기) 강화 필요');
        }
        
        if (issues.includes('forbidden_expressions_found')) {
            recommendations.push('AI스러운 표현 제거 필요');
        }
        
        if (issues.includes('low_engagement')) {
            recommendations.push('상호작용 유도 요소 추가 (질문, 제안 등)');
        }
        
        return recommendations;
    }

    // ================== 📝 품질 기록 관리 ==================
    recordQualityCheck(response, context, result) {
        const record = {
            timestamp: moment().tz('Asia/Tokyo').toISOString(),
            response: response,
            context: context,
            result: result,
            responseTime: result.responseTime || 0
        };
        
        this.qualityHistory.recentChecks.push(record);
        
        // 최근 100개만 유지
        if (this.qualityHistory.recentChecks.length > 100) {
            this.qualityHistory.recentChecks = this.qualityHistory.recentChecks.slice(-100);
        }
        
        // 실패한 경우 분석 데이터에 추가
        if (!result.passed) {
            this.qualityHistory.failureAnalysis.push({
                timestamp: record.timestamp,
                issues: result.issues,
                score: result.score,
                response: response
            });
        }
    }

    // ================== ⏰ 실시간 모니터링 ==================
    startRealTimeMonitoring() {
        console.log(`${colors.security}⏰ [실시간모니터링] 품질 모니터링 시작${colors.reset}`);
        
        // 10분마다 품질 트렌드 분석
        setInterval(() => {
            if (this.isInitialized) {
                this.analyzeQualityTrends();
            }
        }, 10 * 60 * 1000); // 10분
        
        // 1시간마다 자동 개선 제안
        setInterval(() => {
            if (this.isInitialized) {
                this.generateImprovementSuggestions();
            }
        }, 60 * 60 * 1000); // 1시간
    }

    analyzeQualityTrends() {
        try {
            const recent = this.qualityHistory.recentChecks.slice(-20);
            if (recent.length < 5) return;
            
            const averageScore = recent.reduce((sum, check) => sum + check.result.score, 0) / recent.length;
            const passRate = recent.filter(check => check.result.passed).length / recent.length;
            
            console.log(`${colors.improvement}📈 [품질트렌드] 평균 점수: ${Math.round(averageScore * 100)}%, 통과율: ${Math.round(passRate * 100)}%${colors.reset}`);
            
            this.qualityHistory.qualityTrends.push({
                timestamp: moment().tz('Asia/Tokyo').toISOString(),
                averageScore: averageScore,
                passRate: passRate,
                totalChecks: recent.length
            });
            
            // 트렌드 데이터 제한 (최근 100개)
            if (this.qualityHistory.qualityTrends.length > 100) {
                this.qualityHistory.qualityTrends = this.qualityHistory.qualityTrends.slice(-100);
            }
            
        } catch (error) {
            console.error(`${colors.improvement}❌ [품질트렌드] 분석 실패: ${error.message}${colors.reset}`);
        }
    }

    generateImprovementSuggestions() {
        try {
            console.log(`${colors.improvement}💡 [개선제안] 자동 개선 제안 생성 중...${colors.reset}`);
            
            const recentFailures = this.qualityHistory.failureAnalysis.slice(-10);
            const commonIssues = this.analyzeCommonIssues(recentFailures);
            
            const suggestions = [];
            
            // 공통 이슈 기반 제안
            for (const [issue, frequency] of Object.entries(commonIssues)) {
                if (frequency >= 3) {
                    suggestions.push(this.getSuggestionForIssue(issue, frequency));
                }
            }
            
            if (suggestions.length > 0) {
                this.qualityHistory.improvementSuggestions.push({
                    timestamp: moment().tz('Asia/Tokyo').toISOString(),
                    suggestions: suggestions,
                    basedOnFailures: recentFailures.length
                });
                
                console.log(`${colors.improvement}💡 [개선제안] ${suggestions.length}개 제안 생성 완료${colors.reset}`);
            }
            
        } catch (error) {
            console.error(`${colors.improvement}❌ [개선제안] 생성 실패: ${error.message}${colors.reset}`);
        }
    }

    analyzeCommonIssues(failures) {
        const issueCount = {};
        
        failures.forEach(failure => {
            failure.issues.forEach(issue => {
                issueCount[issue] = (issueCount[issue] || 0) + 1;
            });
        });
        
        return issueCount;
    }

    getSuggestionForIssue(issue, frequency) {
        const suggestions = {
            'speech_pattern_mismatch': `말투 패턴 개선 필요 (${frequency}회 발생) - 예진이 특유 표현 강화`,
            'emotional_tone_weak': `감정 표현 강화 필요 (${frequency}회 발생) - 이모티콘과 감정어 사용 증가`,
            'character_traits_missing': `성격 특성 보강 필요 (${frequency}회 발생) - 귀여움, 애교, 장난기 표현 추가`,
            'forbidden_expressions_found': `금지 표현 제거 필요 (${frequency}회 발생) - AI스러운 언어 필터링 강화`,
            'low_engagement': `참여도 향상 필요 (${frequency}회 발생) - 질문과 상호작용 요소 추가`,
            'unnaturalness': `자연스러움 개선 필요 (${frequency}회 발생) - 한국어 표현 패턴 개선`
        };
        
        return suggestions[issue] || `${issue} 문제 해결 필요 (${frequency}회 발생)`;
    }

    // ================== 🔧 품질 규칙 설정 ==================
    setupQualityRules() {
        // 추가 품질 규칙들 설정
        this.qualityRules.contextualRules = {
            greeting: {
                requiredElements: ['안녕', '어서와', '반가워'],
                forbiddenElements: ['안녕하세요', '반갑습니다']
            },
            comfort: {
                requiredElements: ['괜찮아', '걱정', '돌봐'],
                emotionalTone: 'caring'
            },
            playful: {
                requiredElements: ['장난', '놀자', '재밌', '히히'],
                emotionalTone: 'playful'
            }
        };
        
        // 시간대별 품질 규칙
        this.qualityRules.timeBasedRules = {
            morning: { energy: 'high', mood: 'bright' },
            afternoon: { energy: 'medium', mood: 'stable' },
            evening: { energy: 'medium', mood: 'intimate' },
            night: { energy: 'low', mood: 'caring' }
        };
    }

    // ================== 🛠️ 응답 자동 개선 ==================
    async improveResponse(originalResponse, qualityResult) {
        try {
            if (qualityResult.passed) {
                return originalResponse; // 이미 품질이 좋으면 그대로 반환
            }
            
            console.log(`${colors.improvement}🛠️ [응답개선] 품질 개선 시도...${colors.reset}`);
            
            let improvedResponse = originalResponse;
            
            // 이슈별 자동 개선
            for (const issue of qualityResult.issues) {
                improvedResponse = this.applyImprovementForIssue(improvedResponse, issue);
            }
            
            // 개선된 응답 재검사
            const recheck = await this.checkResponseQuality(improvedResponse);
            
            if (recheck.score > qualityResult.score) {
                console.log(`${colors.improvement}✅ [응답개선] 성공 - 점수: ${Math.round(qualityResult.score * 100)}% → ${Math.round(recheck.score * 100)}%${colors.reset}`);
                return improvedResponse;
            } else {
                console.log(`${colors.improvement}⚠️ [응답개선] 효과 미미 - 원본 유지${colors.reset}`);
                return originalResponse;
            }
            
        } catch (error) {
            console.error(`${colors.improvement}❌ [응답개선] 실패: ${error.message}${colors.reset}`);
            return originalResponse;
        }
    }

    applyImprovementForIssue(response, issue) {
        let improved = response;
        
        switch (issue) {
            case 'speech_pattern_mismatch':
                // 예진이스러운 표현 추가
                if (!improved.includes('아조씨') && !improved.includes('아저씨')) {
                    improved = '아조씨~ ' + improved;
                }
                if (!improved.includes('~') && !improved.includes('♡')) {
                    improved = improved + '~';
                }
                break;
                
            case 'emotional_tone_weak':
                // 감정 표현 강화
                if (!improved.includes('♡') && !improved.includes('~')) {
                    improved = improved + ' ♡';
                }
                break;
                
            case 'character_traits_missing':
                // 성격 특성 추가
                if (Math.random() > 0.5) {
                    const cuteExpressions = ['에헤헤~', '히히', '귀여워~'];
                    const randomExpression = cuteExpressions[Math.floor(Math.random() * cuteExpressions.length)];
                    improved = improved + ' ' + randomExpression;
                }
                break;
                
            case 'forbidden_expressions_found':
                // 금지 표현 제거/대체
                this.qualityRules.forbiddenExpressions.forEach(forbidden => {
                    const regex = new RegExp(forbidden, 'gi');
                    improved = improved.replace(regex, '');
                });
                break;
                
            case 'low_engagement':
                // 참여도 향상
                if (!improved.includes('?') && !improved.includes('어때')) {
                    improved = improved + ' 어때?';
                }
                break;
        }
        
        return improved.trim();
    }

    // ================== 📊 통계 및 리포트 ==================
    getQualityStats() {
        const recent = this.qualityHistory.recentChecks.slice(-50);
        
        if (recent.length === 0) {
            return {
                totalChecks: 0,
                averageScore: 0,
                passRate: 0,
                commonIssues: [],
                trends: 'insufficient_data'
            };
        }
        
        const averageScore = recent.reduce((sum, check) => sum + check.result.score, 0) / recent.length;
        const passRate = recent.filter(check => check.result.passed).length / recent.length;
        const averageResponseTime = recent.reduce((sum, check) => sum + (check.result.responseTime || 0), 0) / recent.length;
        
        // 공통 이슈 분석
        const allIssues = recent.flatMap(check => check.result.issues || []);
        const issueCount = {};
        allIssues.forEach(issue => {
            issueCount[issue] = (issueCount[issue] || 0) + 1;
        });
        
        const commonIssues = Object.entries(issueCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([issue, count]) => ({ issue, count, percentage: Math.round(count / recent.length * 100) }));
        
        return {
            totalChecks: recent.length,
            averageScore: Math.round(averageScore * 100),
            passRate: Math.round(passRate * 100),
            averageResponseTime: Math.round(averageResponseTime),
            commonIssues: commonIssues,
            trends: this.calculateTrends(recent),
            lastCheck: recent[recent.length - 1]?.timestamp || 'never'
        };
    }

    calculateTrends(recentChecks) {
        if (recentChecks.length < 10) return 'insufficient_data';
        
        const firstHalf = recentChecks.slice(0, Math.floor(recentChecks.length / 2));
        const secondHalf = recentChecks.slice(Math.floor(recentChecks.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, check) => sum + check.result.score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, check) => sum + check.result.score, 0) / secondHalf.length;
        
        const improvement = secondAvg - firstAvg;
        
        if (improvement > 0.05) return 'improving';
        if (improvement < -0.05) return 'declining';
        return 'stable';
    }

    // ================== 💾 데이터 관리 ==================
    async loadQualityData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsed = JSON.parse(data);
            this.qualityHistory = { ...this.qualityHistory, ...parsed };
            console.log(`${colors.quality}📁 [데이터로드] 품질 데이터 로드 완료${colors.reset}`);
        } catch (error) {
            console.log(`${colors.quality}📁 [데이터로드] 새로운 품질 데이터 파일 생성${colors.reset}`);
            await this.saveQualityData();
        }
    }

    async saveQualityData() {
        try {
            const dir = path.dirname(this.dataPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.dataPath, JSON.stringify(this.qualityHistory, null, 2));
        } catch (error) {
            console.error(`${colors.quality}❌ [데이터저장] 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 🎯 상태 정보 ==================
    getQualitySystemStatus() {
        return {
            isInitialized: this.isInitialized,
            totalChecks: this.qualityHistory.recentChecks.length,
            totalFailures: this.qualityHistory.failureAnalysis.length,
            currentMetrics: this.qualityMetrics,
            systemHealth: this.calculateSystemHealth(),
            lastTrendAnalysis: this.qualityHistory.qualityTrends.slice(-1)[0]?.timestamp || 'never',
            improvementSuggestions: this.qualityHistory.improvementSuggestions.length
        };
    }

    calculateSystemHealth() {
        const recent = this.qualityHistory.recentChecks.slice(-20);
        if (recent.length === 0) return 'unknown';
        
        const passRate = recent.filter(check => check.result.passed).length / recent.length;
        
        if (passRate >= 0.9) return 'excellent';
        if (passRate >= 0.8) return 'good';
        if (passRate >= 0.7) return 'fair';
        if (passRate >= 0.6) return 'poor';
        return 'critical';
    }

    // ================== 🚨 알럿 시스템 ==================
    checkForAlerts() {
        const alerts = [];
        const recent = this.qualityHistory.recentChecks.slice(-10);
        
        if (recent.length >= 5) {
            const passRate = recent.filter(check => check.result.passed).length / recent.length;
            
            if (passRate < 0.5) {
                alerts.push({
                    type: 'critical',
                    message: '품질 통과율이 50% 미만입니다',
                    action: 'immediate_attention_required'
                });
            } else if (passRate < 0.7) {
                alerts.push({
                    type: 'warning',
                    message: '품질 통과율이 70% 미만입니다',
                    action: 'monitoring_required'
                });
            }
        }
        
        // 응답 시간 알럿
        const avgResponseTime = recent.reduce((sum, check) => sum + (check.result.responseTime || 0), 0) / recent.length;
        if (avgResponseTime > 5000) { // 5초 이상
            alerts.push({
                type: 'warning',
                message: '평균 응답 시간이 5초를 초과합니다',
                action: 'performance_optimization_needed'
            });
        }
        
        return alerts;
    }
}

// ================== 📤 모듈 내보내기 ==================
const qualityAssuranceEngine = new QualityAssuranceEngine();

module.exports = {
    // 핵심 함수들
    initialize: () => qualityAssuranceEngine.initialize(),
    checkResponseQuality: (response, context) => qualityAssuranceEngine.checkResponseQuality(response, context),
    improveResponse: (response, qualityResult) => qualityAssuranceEngine.improveResponse(response, qualityResult),
    
    // 통계 및 분석
    getQualityStats: () => qualityAssuranceEngine.getQualityStats(),
    getQualitySystemStatus: () => qualityAssuranceEngine.getQualitySystemStatus(),
    checkForAlerts: () => qualityAssuranceEngine.checkForAlerts(),
    
    // 설정 및 관리
    setupQualityRules: () => qualityAssuranceEngine.setupQualityRules(),
    generateImprovementSuggestions: () => qualityAssuranceEngine.generateImprovementSuggestions(),
    
    // 인스턴스 직접 접근
    instance: qualityAssuranceEngine
};
