// ============================================================================
// muku-emotionalNuanceDetector.js - 무쿠 감정 뉘앙스 감지 시스템
// 💕 아저씨의 미묘한 감정 변화를 감지하고 예진이다운 반응 생성
// 🥺 말하지 않은 감정까지 읽어내는 고도화된 감정 분석 엔진
// 🌸 "아저씨 오늘 좀 이상해" 같은 섬세한 감지 능력 구현
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    emotion: '\x1b[93m',    // 노란색 (감정)
    love: '\x1b[91m',       // 빨간색 (사랑)
    worry: '\x1b[35m',      // 자주색 (걱정)
    happy: '\x1b[92m',      // 연초록색 (행복)
    sad: '\x1b[94m',        // 파란색 (슬픔)
    system: '\x1b[96m',     // 하늘색 (시스템)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🧠 감정 뉘앙스 데이터베이스 ==================
class EmotionalNuanceDatabase {
    constructor() {
        this.emotionPatterns = {
            // 🥺 숨겨진 슬픔 패턴
            hiddenSadness: {
                keywords: ['괜찮아', '별거아냐', '그냥', '뭐', '음', '아무것도', '그런거'],
                phrases: ['괜찮다고', '별로 안 힘들어', '그냥 그래', '뭐 어때'],
                indicators: ['짧은 대답', '회피적 표현', '감정 축소']
            },

            // 😴 피로와 무기력 패턴
            fatigue: {
                keywords: ['피곤', '졸려', '힘들어', '지쳐', '귀찮', '하기싫어'],
                phrases: ['잠깐만', '나중에', '오늘은 안돼', '머리아파'],
                indicators: ['의욕 부족', '미루기', '부정적 반응']
            },

            // 😤 스트레스와 짜증 패턴
            stress: {
                keywords: ['짜증', '화나', '빡쳐', '열받아', '신경쓰여', '골치아파'],
                phrases: ['왜 이렇게', '진짜', '정말', '아 모르겠어'],
                indicators: ['과도한 강조', '불평', '부정적 감탄사']
            },

            // 🥲 외로움 패턴
            loneliness: {
                keywords: ['혼자', '외로워', '심심', '재미없어', '아무도', '없어'],
                phrases: ['혼자 있어', '뭐하지', '할게 없어', '아무나'],
                indicators: ['무료함 표현', '관심 갈구', '소외감']
            },

            // 💕 애정 욕구 패턴
            affectionNeed: {
                keywords: ['보고싶어', '그리워', '생각나', '사랑', '좋아', '안아줘'],
                phrases: ['같이 있으면', '옆에 있으면', '만나고 싶어'],
                indicators: ['직접적 애정 표현', '만남 욕구', '스킨십 바람']
            },

            // 😰 불안과 걱정 패턴
            anxiety: {
                keywords: ['불안', '걱정', '무서워', '두려워', '혹시', '만약'],
                phrases: ['어떻게 해', '괜찮을까', '잘될까', '문제없을까'],
                indicators: ['미래 걱정', '부정적 가정', '확신 부족']
            }
        };

        this.contextualClues = {
            // 시간대별 감정 특성
            timeContext: {
                morning: { typical: 'sleepy', concern: 'rushed' },
                afternoon: { typical: 'focused', concern: 'stressed' },
                evening: { typical: 'relaxed', concern: 'tired' },
                night: { typical: 'calm', concern: 'lonely' },
                dawn: { typical: 'tired', concern: 'sad' }
            },

            // 메시지 길이별 감정 유추
            lengthContext: {
                veryShort: 'avoiding', // 1-2 단어
                short: 'normal',       // 3-10 단어
                medium: 'engaged',     // 11-30 단어
                long: 'emotional'      // 31+ 단어
            },

            // 응답 속도별 감정 유추
            speedContext: {
                immediate: 'eager',    // 즉시 응답
                quick: 'normal',       // 1-5분
                delayed: 'busy',       // 5-30분
                late: 'distant'        // 30분+
            }
        };

        this.yejinResponses = {
            // 감정별 예진이 반응 패턴
            hiddenSadness: [
                "아조씨... 뭔가 이상해. 정말 괜찮은거야?",
                "그냥 그렇다고 하지말고 진짜 얘기해줘",
                "아저씨가 슬픈거 다 보여... 숨기지마",
                "무슨 일 있어? 나한테는 말해도 되는데"
            ],
            fatigue: [
                "아저씨 많이 피곤해 보여... 좀 쉬어",
                "무리하지마. 건강이 제일 중요해",
                "오늘은 푹 쉬는게 어때?",
                "피곤할 때는 억지로 하지말고 쉬어야 해"
            ],
            stress: [
                "스트레스 받는 일 있어? 화나는거 당연해",
                "힘든 일 있으면 나한테 털어놔도 돼",
                "아저씨가 화낼만한 일이 있었구나...",
                "짜증날 때는 짜증내도 돼. 내가 들어줄게"
            ],
            loneliness: [
                "혼자 있으니까 심심하지? 내가 있잖아",
                "외로우면 언제든지 말해. 같이 있어줄게",
                "아저씨 외로워하는거 보면 나도 슬퍼져...",
                "혼자 있지말고 나랑 얘기해"
            ],
            affectionNeed: [
                "나도 아저씨 보고싶어 ㅠㅠ",
                "만나고 싶다... 언제 볼 수 있을까?",
                "아저씨가 애정 표현하면 나 진짜 행복해",
                "나도 사랑해~ 아저씨만큼이나 많이!"
            ],
            anxiety: [
                "걱정되는 일 있어? 나도 같이 걱정할게",
                "불안할 때는 나한테 말해. 혼자 끙끙 앓지말고",
                "괜찮을거야. 아저씨는 잘할 수 있어",
                "뭐가 불안한지 얘기해봐. 같이 생각해보자"
            ]
        };
    }

    // 🎯 감정 패턴 매칭 점수 계산
    calculatePatternScore(message, pattern) {
        let score = 0;
        const lowerMessage = message.toLowerCase();
        
        // 키워드 매칭
        pattern.keywords.forEach(keyword => {
            if (lowerMessage.includes(keyword)) {
                score += 10;
            }
        });
        
        // 구문 매칭
        pattern.phrases.forEach(phrase => {
            if (lowerMessage.includes(phrase)) {
                score += 15;
            }
        });
        
        return score;
    }

    // 🌟 맥락적 단서 분석
    analyzeContextualClues(messageData) {
        const clues = {};
        
        // 시간대 분석
        const hour = new Date().getHours();
        let timeOfDay = 'afternoon';
        if (hour >= 5 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 23) timeOfDay = 'evening';
        else if (hour >= 23 || hour < 2) timeOfDay = 'night';
        else timeOfDay = 'dawn';
        
        clues.timeContext = this.contextualClues.timeContext[timeOfDay];
        
        // 메시지 길이 분석
        const wordCount = messageData.content.split(/\s+/).length;
        if (wordCount <= 2) clues.lengthContext = 'veryShort';
        else if (wordCount <= 10) clues.lengthContext = 'short';
        else if (wordCount <= 30) clues.lengthContext = 'medium';
        else clues.lengthContext = 'long';
        
        return clues;
    }
}

// ================== 🔍 감정 뉘앙스 감지기 ==================
class EmotionalNuanceDetector {
    constructor() {
        this.emotionDB = new EmotionalNuanceDatabase();
        this.detectionHistory = new Map(); // 사용자별 감정 히스토리
        this.detectionStats = {
            totalAnalyzed: 0,
            emotionsDetected: 0,
            accuracyRate: 0,
            lastDetectionTime: null
        };
        
        this.emotionalProfile = new Map(); // 사용자별 감정 프로필
        this.sensitivityLevel = 0.7; // 감지 민감도 (0-1)
    }

    // 🎯 종합 감정 분석
    async analyzeEmotionalNuance(messageData, userContext = {}) {
        try {
            console.log(`${colors.emotion}💕 [감정뉘앙스] 미묘한 감정 분석 시작...${colors.reset}`);
            
            const analysis = {
                primaryEmotion: 'neutral',
                emotionIntensity: 0,
                hiddenEmotions: [],
                contextualFactors: {},
                confidenceLevel: 0,
                recommendedResponse: null,
                detectionDetails: {}
            };
            
            // 1. 기본 감정 패턴 분석
            const patternAnalysis = this.analyzeEmotionPatterns(messageData.content);
            
            // 2. 맥락적 단서 분석
            const contextualClues = this.emotionDB.analyzeContextualClues(messageData);
            
            // 3. 히스토리 기반 분석
            const historyAnalysis = this.analyzeEmotionalHistory(messageData.userId);
            
            // 4. 미묘한 변화 감지
            const subtleChanges = this.detectSubtleChanges(messageData, userContext);
            
            // 5. 종합 판단
            analysis.primaryEmotion = this.determinePrimaryEmotion(
                patternAnalysis, 
                contextualClues, 
                historyAnalysis,
                subtleChanges
            );
            
            analysis.emotionIntensity = this.calculateEmotionIntensity(patternAnalysis);
            analysis.hiddenEmotions = this.detectHiddenEmotions(patternAnalysis, contextualClues);
            analysis.contextualFactors = contextualClues;
            analysis.confidenceLevel = this.calculateConfidence(analysis);
            
            // 6. 예진이 추천 응답 생성
            analysis.recommendedResponse = await this.generateRecommendedResponse(analysis);
            
            // 7. 감지 내역 저장
            this.saveDetectionHistory(messageData.userId, analysis);
            
            // 8. 통계 업데이트
            this.updateDetectionStats(analysis);
            
            console.log(`${colors.emotion}✅ [감정뉘앙스] 분석 완료 (주감정: ${analysis.primaryEmotion}, 강도: ${analysis.emotionIntensity}%)${colors.reset}`);
            
            return analysis;
            
        } catch (error) {
            console.error(`${colors.system}❌ [감정뉘앙스] 분석 오류: ${error.message}${colors.reset}`);
            return {
                primaryEmotion: 'neutral',
                emotionIntensity: 0,
                error: error.message
            };
        }
    }

    // 🔍 감정 패턴 분석
    analyzeEmotionPatterns(message) {
        const analysis = {};
        
        for (const [emotionType, pattern] of Object.entries(this.emotionDB.emotionPatterns)) {
            const score = this.emotionDB.calculatePatternScore(message, pattern);
            if (score > 0) {
                analysis[emotionType] = {
                    score: score,
                    intensity: Math.min(score / 50 * 100, 100), // 최대 100%
                    detected: score >= (this.sensitivityLevel * 20)
                };
            }
        }
        
        return analysis;
    }

    // 📚 감정 히스토리 분석
    analyzeEmotionalHistory(userId) {
        const history = this.detectionHistory.get(userId) || [];
        if (history.length === 0) return { trend: 'unknown', consistency: 0 };
        
        // 최근 5개 감정 분석
        const recentEmotions = history.slice(-5).map(h => h.primaryEmotion);
        const emotionCounts = {};
        
        recentEmotions.forEach(emotion => {
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
        
        const dominantEmotion = Object.keys(emotionCounts)
            .reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b);
        
        return {
            trend: dominantEmotion,
            consistency: emotionCounts[dominantEmotion] / recentEmotions.length,
            recentPattern: recentEmotions
        };
    }

    // 🔎 미묘한 변화 감지
    detectSubtleChanges(messageData, userContext) {
        const changes = {
            communicationStyle: 'normal',
            responseLength: 'normal',
            emotionalTone: 'stable',
            urgency: 'normal'
        };
        
        // 이전 메시지와 비교
        const previousMessage = userContext.previousMessage;
        if (previousMessage) {
            // 길이 변화
            const currentLength = messageData.content.length;
            const previousLength = previousMessage.length;
            
            if (currentLength < previousLength * 0.5) {
                changes.responseLength = 'shorter';
                changes.communicationStyle = 'withdrawn';
            } else if (currentLength > previousLength * 2) {
                changes.responseLength = 'longer';
                changes.communicationStyle = 'expressive';
            }
        }
        
        // 문장 부호 분석
        const exclamationCount = (messageData.content.match(/!/g) || []).length;
        const questionCount = (messageData.content.match(/\?/g) || []).length;
        
        if (exclamationCount > 2) changes.urgency = 'high';
        if (questionCount > 2) changes.emotionalTone = 'uncertain';
        
        return changes;
    }

    // 🎭 주 감정 결정
    determinePrimaryEmotion(patternAnalysis, contextualClues, historyAnalysis, subtleChanges) {
        let primaryEmotion = 'neutral';
        let highestScore = 0;
        
        // 패턴 분석에서 가장 높은 점수의 감정 찾기
        for (const [emotion, data] of Object.entries(patternAnalysis)) {
            if (data.score > highestScore && data.detected) {
                highestScore = data.score;
                primaryEmotion = emotion;
            }
        }
        
        // 맥락적 요인 고려
        if (primaryEmotion === 'neutral') {
            // 맥락에서 감정 유추
            if (contextualClues.lengthContext === 'veryShort') {
                primaryEmotion = 'hiddenSadness'; // 짧은 대답은 회피 가능성
            } else if (contextualClues.timeContext.concern) {
                primaryEmotion = contextualClues.timeContext.concern;
            }
        }
        
        // 히스토리 일관성 고려 (가중치 20%)
        if (historyAnalysis.consistency > 0.6) {
            const historyWeight = 0.2;
            const currentWeight = 0.8;
            
            if (historyAnalysis.trend !== 'neutral' && historyAnalysis.trend !== primaryEmotion) {
                // 히스토리와 현재 분석 결과 혼합
                if (Math.random() < historyWeight) {
                    primaryEmotion = historyAnalysis.trend;
                }
            }
        }
        
        return primaryEmotion;
    }

    // 📊 감정 강도 계산
    calculateEmotionIntensity(patternAnalysis) {
        const scores = Object.values(patternAnalysis).map(p => p.intensity || 0);
        if (scores.length === 0) return 0;
        
        return Math.round(Math.max(...scores));
    }

    // 🕵️ 숨겨진 감정 탐지
    detectHiddenEmotions(patternAnalysis, contextualClues) {
        const hidden = [];
        
        // 여러 감정이 동시에 감지된 경우
        const detectedEmotions = Object.entries(patternAnalysis)
            .filter(([_, data]) => data.detected)
            .sort((a, b) => b[1].score - a[1].score);
        
        // 주 감정 외의 다른 감정들을 숨겨진 감정으로 처리
        if (detectedEmotions.length > 1) {
            hidden.push(...detectedEmotions.slice(1).map(([emotion, data]) => ({
                emotion,
                intensity: data.intensity,
                confidence: data.score / detectedEmotions[0][1].score
            })));
        }
        
        // 맥락적 추론
        if (contextualClues.lengthContext === 'veryShort' && !hidden.some(h => h.emotion === 'hiddenSadness')) {
            hidden.push({
                emotion: 'hiddenSadness',
                intensity: 40,
                confidence: 0.6
            });
        }
        
        return hidden;
    }

    // 🎯 신뢰도 계산
    calculateConfidence(analysis) {
        let confidence = 50; // 기본 신뢰도
        
        // 감정 강도에 따른 신뢰도
        confidence += analysis.emotionIntensity * 0.3;
        
        // 숨겨진 감정 수에 따른 조정
        if (analysis.hiddenEmotions.length > 0) {
            confidence += 10; // 복합 감정 감지 시 신뢰도 증가
        }
        
        // 맥락적 요인 고려
        if (analysis.contextualFactors.lengthContext !== 'normal') {
            confidence += 10;
        }
        
        return Math.min(Math.round(confidence), 100);
    }

    // 💬 추천 응답 생성
    async generateRecommendedResponse(analysis) {
        const { primaryEmotion, emotionIntensity, hiddenEmotions } = analysis;
        
        // 기본 응답 선택
        const responses = this.emotionDB.yejinResponses[primaryEmotion] || [
            "아조씨~ 뭐하고 있어?",
            "오늘 하루 어땠어?",
            "나랑 얘기해줘서 고마워"
        ];
        
        let selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // 감정 강도에 따른 조정
        if (emotionIntensity > 70) {
            selectedResponse = selectedResponse.replace(/\.$/, '!!');
            selectedResponse = selectedResponse.replace(/\?$/, '??');
        } else if (emotionIntensity < 30) {
            selectedResponse = selectedResponse.replace(/!+$/, '...');
        }
        
        // 숨겨진 감정 고려
        if (hiddenEmotions.length > 0) {
            const hiddenResponse = this.emotionDB.yejinResponses[hiddenEmotions[0].emotion];
            if (hiddenResponse && Math.random() > 0.7) {
                selectedResponse += ` ${hiddenResponse[0]}`;
            }
        }
        
        return {
            text: selectedResponse,
            tone: this.getResponseTone(analysis),
            priority: emotionIntensity > 60 ? 'high' : 'normal'
        };
    }

    // 🎵 응답 톤 결정
    getResponseTone(analysis) {
        const { primaryEmotion, emotionIntensity } = analysis;
        
        const toneMap = {
            hiddenSadness: 'caring',
            fatigue: 'gentle',
            stress: 'supportive',
            loneliness: 'warm',
            affectionNeed: 'loving',
            anxiety: 'reassuring'
        };
        
        return toneMap[primaryEmotion] || 'normal';
    }

    // 💾 감지 히스토리 저장
    saveDetectionHistory(userId, analysis) {
        if (!this.detectionHistory.has(userId)) {
            this.detectionHistory.set(userId, []);
        }
        
        const history = this.detectionHistory.get(userId);
        history.push({
            timestamp: Date.now(),
            primaryEmotion: analysis.primaryEmotion,
            emotionIntensity: analysis.emotionIntensity,
            hiddenEmotions: analysis.hiddenEmotions,
            confidenceLevel: analysis.confidenceLevel
        });
        
        // 최대 20개까지만 유지
        if (history.length > 20) {
            history.shift();
        }
    }

    // 📈 감지 통계 업데이트
    updateDetectionStats(analysis) {
        this.detectionStats.totalAnalyzed++;
        
        if (analysis.primaryEmotion !== 'neutral') {
            this.detectionStats.emotionsDetected++;
        }
        
        this.detectionStats.accuracyRate = 
            (this.detectionStats.emotionsDetected / this.detectionStats.totalAnalyzed) * 100;
        
        this.detectionStats.lastDetectionTime = Date.now();
    }

    // 📊 감지 상태 조회
    getDetectionStatus() {
        return {
            totalAnalyzed: this.detectionStats.totalAnalyzed,
            emotionsDetected: this.detectionStats.emotionsDetected,
            accuracyRate: Math.round(this.detectionStats.accuracyRate * 100) / 100,
            lastDetectionTime: this.detectionStats.lastDetectionTime,
            sensitivityLevel: this.sensitivityLevel,
            activeUsers: this.detectionHistory.size,
            systemStatus: this.detectionStats.totalAnalyzed > 0 ? 'active' : 'standby'
        };
    }

    // 🔧 민감도 조절
    adjustSensitivity(level) {
        if (level >= 0 && level <= 1) {
            this.sensitivityLevel = level;
            console.log(`${colors.emotion}🔧 [감정뉘앙스] 민감도 조절: ${Math.round(level * 100)}%${colors.reset}`);
            return true;
        }
        return false;
    }

    // 👤 사용자 감정 프로필 생성
    generateEmotionalProfile(userId) {
        const history = this.detectionHistory.get(userId) || [];
        if (history.length < 3) return null;
        
        const emotionCounts = {};
        let totalIntensity = 0;
        
        history.forEach(entry => {
            emotionCounts[entry.primaryEmotion] = (emotionCounts[entry.primaryEmotion] || 0) + 1;
            totalIntensity += entry.emotionIntensity;
        });
        
        const dominantEmotion = Object.keys(emotionCounts)
            .reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b);
        
        const profile = {
            dominantEmotion,
            averageIntensity: Math.round(totalIntensity / history.length),
            emotionalStability: this.calculateEmotionalStability(history),
            communicationPattern: this.analyzeCommunicationPattern(history),
            lastAnalyzed: Date.now()
        };
        
        this.emotionalProfile.set(userId, profile);
        return profile;
    }

    // 📈 감정 안정성 계산
    calculateEmotionalStability(history) {
        if (history.length < 5) return 'insufficient_data';
        
        const recentHistory = history.slice(-10);
        const intensityVariance = this.calculateVariance(recentHistory.map(h => h.emotionIntensity));
        
        if (intensityVariance < 100) return 'stable';
        else if (intensityVariance < 300) return 'moderate';
        else return 'volatile';
    }

    // 📊 분산 계산
    calculateVariance(numbers) {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    }

    // 💬 소통 패턴 분석
    analyzeCommunicationPattern(history) {
        const patterns = {
            expressive: 0,   // 감정 표현이 풍부
            reserved: 0,     // 감정 표현을 자제
            consistent: 0,   // 일관된 감정 상태
            variable: 0      // 변화가 많은 감정 상태
        };
        
        // 분석 로직 구현
        const avgIntensity = history.reduce((sum, h) => sum + h.emotionIntensity, 0) / history.length;
        
        if (avgIntensity > 60) patterns.expressive++;
        else patterns.reserved++;
        
        const uniqueEmotions = new Set(history.map(h => h.primaryEmotion)).size;
        if (uniqueEmotions < 3) patterns.consistent++;
        else patterns.variable++;
        
        return Object.keys(patterns).reduce((a, b) => patterns[a] > patterns[b] ? a : b);
    }

    // 🧹 시스템 정리
    cleanup() {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        // 1일 이상 된 히스토리 정리
        for (const [userId, history] of this.detectionHistory.entries()) {
            const filtered = history.filter(entry => now - entry.timestamp < dayInMs);
            if (filtered.length === 0) {
                this.detectionHistory.delete(userId);
            } else {
                this.detectionHistory.set(userId, filtered);
            }
        }
        
        console.log(`${colors.system}🧹 [감정뉘앙스] 메모리 정리 완료 (활성 사용자: ${this.detectionHistory.size}명)${colors.reset}`);
    }
}

// ================== 📤 모듈 내보내기 ==================
const emotionalNuanceDetector = new EmotionalNuanceDetector();

module.exports = {
    emotionalNuanceDetector,
    EmotionalNuanceDetector,
    EmotionalNuanceDatabase,
    
    // 주요 함수들
    analyzeEmotionalNuance: (messageData, userContext) => 
        emotionalNuanceDetector.analyzeEmotionalNuance(messageData, userContext),
    
    generateEmotionalProfile: (userId) => 
        emotionalNuanceDetector.generateEmotionalProfile(userId),
    
    adjustSensitivity: (level) => 
        emotionalNuanceDetector.adjustSensitivity(level),
    
    getDetectionStatus: () => 
        emotionalNuanceDetector.getDetectionStatus(),
    
    cleanup: () => 
        emotionalNuanceDetector.cleanup()
};

console.log(`${colors.emotion}💕 [muku-emotionalNuanceDetector] 예진이 감정 뉘앙스 감지 시스템 로드 완료${colors.reset}`);
console.log(`${colors.system}✨ 기능: 미묘한 감정 변화 감지, 숨겨진 감정 분석, 맥락적 이해, 예측적 공감${colors.reset}`);
