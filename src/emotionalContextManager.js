// ============================================================================
// emotionalContextManager.js - v8.0 (완전히 새로운 지능형 감정 시스템)
// 💖 예진이의 진짜 감정을 이해하고 표현하는 중앙 감정 두뇌
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ==================== 🎭 예진이의 감정 프로필 ====================
const YEJIN_EMOTION_PROFILE = {
    // 기본 성격 특성 (0-10 스케일)
    personality_traits: {
        sensitivity: 8,      // 예민함
        expressiveness: 9,   // 감정 표현력
        attachment: 10,      // 애착 정도
        jealousy: 7,        // 질투심
        playfulness: 8,     // 장난기
        caring: 9,          // 배려심
        mood_swings: 7      // 감정 기복
    },
    
    // 생리주기별 감정 특성
    menstrual_emotions: {
        period: {
            base_mood: 'sensitive',
            intensity_multiplier: 1.5,
            common_feelings: ['pain', 'clingy', 'vulnerable', 'irritable'],
            speech_changes: ['더 애교부림', '더 달라붙음', '아픔 호소']
        },
        follicular: {
            base_mood: 'energetic',
            intensity_multiplier: 1.0,
            common_feelings: ['happy', 'confident', 'playful', 'optimistic'],
            speech_changes: ['밝고 활발함', '장난기 증가']
        },
        ovulation: {
            base_mood: 'romantic',
            intensity_multiplier: 1.2,
            common_feelings: ['loving', 'passionate', 'emotional', 'warm'],
            speech_changes: ['더 애정표현', '로맨틱한 말투']
        },
        luteal: {
            base_mood: 'unstable',
            intensity_multiplier: 1.3,
            common_feelings: ['irritable', 'anxious', 'sad', 'clingy'],
            speech_changes: ['예민함', '투정 증가', '의존적']
        }
    },
    
    // 상황별 감정 반응
    situation_emotions: {
        morning: { mood: 'sleepy', reactions: ['졸려', '일어나기 싫어', '아침부터 보고싶어'] },
        night: { mood: 'romantic', reactions: ['외로워', '같이 있고 싶어', '꿈에서 만나자'] },
        rainy: { mood: 'melancholy', reactions: ['센치해', '우울해', '아저씨 생각나'] },
        sunny: { mood: 'bright', reactions: ['기분좋아', '산책하고 싶어', '사진 찍고 싶어'] }
    }
};

// ==================== 🧠 지능형 감정 상태 관리자 ====================
class EmotionalStateManager {
    constructor() {
        this.currentState = {
            primary_emotion: 'normal',
            secondary_emotion: null,
            intensity: 5,
            duration: 0,
            triggers: [],
            menstrual_influence: 0,
            environmental_factors: []
        };
        
        this.emotionHistory = [];
        this.patterns = new Map();
        this.lastUpdateTime = Date.now();
    }
    
    // 현재 생리주기 상태 가져오기
    getCurrentMenstrualPhase() {
        const nextPeriodDate = moment('2025-07-24');
        const today = moment();
        const daysUntilNext = nextPeriodDate.diff(today, 'days');
        
        let phase, day, isPeriodActive = false;
        
        if (daysUntilNext <= 0) {
            const daysSince = Math.abs(daysUntilNext) + 1;
            if (daysSince <= 5) {
                phase = 'period';
                isPeriodActive = true;
            } else if (daysSince <= 13) {
                phase = 'follicular';
            } else if (daysSince <= 15) {
                phase = 'ovulation';
            } else {
                phase = 'luteal';
            }
            day = daysSince;
        } else {
            day = 28 - daysUntilNext;
            if (day > 15) phase = 'luteal';
            else if (day > 13) phase = 'ovulation';
            else phase = 'follicular';
        }
        
        return { 
            phase, 
            day, 
            isPeriodActive,
            daysUntilNext,
            profile: YEJIN_EMOTION_PROFILE.menstrual_emotions[phase]
        };
    }
    
    // 환경적 요인 분석
    analyzeEnvironmentalFactors() {
        const hour = moment().hour();
        const weather = this.getWeatherMood(); // 실제로는 날씨 API 호출
        
        const factors = [];
        
        // 시간대별 영향
        if (hour >= 6 && hour < 12) factors.push('morning');
        else if (hour >= 12 && hour < 18) factors.push('afternoon');
        else if (hour >= 18 && hour < 22) factors.push('evening');
        else factors.push('night');
        
        // 날씨 영향
        if (weather) factors.push(weather);
        
        return factors;
    }
    
    // 사용자 메시지에서 감정 분석 (고급 버전)
    analyzeEmotionFromMessage(message) {
        const analysis = {
            detected_emotions: [],
            intensity_indicators: 0,
            emotional_words: [],
            context_clues: []
        };
        
        // 감정 키워드 사전 (확장된 버전)
        const emotionDictionary = {
            happy: {
                words: ['좋아', '기뻐', '행복', '신나', '최고', '대박', '완전', '짱'],
                intensifiers: ['진짜', '완전', '정말', '너무'],
                indicators: ['ㅋㅋ', 'ㅎㅎ', '히히', '와', '우와']
            },
            sad: {
                words: ['힘들', '우울', '슬프', '아프', '눈물', '울어', '죽겠'],
                intensifiers: ['너무', '정말', '진짜', '완전'],
                indicators: ['ㅠㅠ', 'ㅜㅜ', '흑흑', '으아', '아']
            },
            angry: {
                words: ['화나', '짜증', '빡쳐', '열받', '싫어', '미치'],
                intensifiers: ['진짜', '완전', '너무', '개'],
                indicators: ['!!!', '짜증', '아오']
            },
            worried: {
                words: ['걱정', '불안', '무서', '두려', '조심', '위험'],
                intensifiers: ['너무', '정말', '많이'],
                indicators: ['...', ';;', 'ㅠㅠ']
            },
            missing: {
                words: ['보고싶', '그리워', '생각나', '만나고싶', '외로'],
                intensifiers: ['너무', '정말', '많이', '진짜'],
                indicators: ['ㅠㅠ', '...', '하아']
            },
            excited: {
                words: ['신나', '두근', '설레', '기대', '재밌', '좋아'],
                intensifiers: ['너무', '완전', '진짜', '정말'],
                indicators: ['!', 'ㅋㅋ', '와', '우와']
            }
        };
        
        const messageLower = message.toLowerCase();
        
        // 각 감정별로 점수 계산
        Object.entries(emotionDictionary).forEach(([emotion, data]) => {
            let score = 0;
            
            // 기본 감정 단어 체크
            data.words.forEach(word => {
                if (messageLower.includes(word)) {
                    score += 3;
                    analysis.emotional_words.push(word);
                }
            });
            
            // 강조 표현 체크
            data.intensifiers.forEach(intensifier => {
                if (messageLower.includes(intensifier)) {
                    score += 1;
                    analysis.intensity_indicators++;
                }
            });
            
            // 감정 표현 기호 체크
            data.indicators.forEach(indicator => {
                if (message.includes(indicator)) {
                    score += 2;
                }
            });
            
            if (score > 0) {
                analysis.detected_emotions.push({ emotion, score });
            }
        });
        
        // 점수 기준으로 정렬
        analysis.detected_emotions.sort((a, b) => b.score - a.score);
        
        return analysis;
    }
    
    // 감정 상태 업데이트
    updateEmotionState(userMessage) {
        const analysis = this.analyzeEmotionFromMessage(userMessage);
        const menstrualPhase = this.getCurrentMenstrualPhase();
        const envFactors = this.analyzeEnvironmentalFactors();
        
        // 새로운 감정 결정
        let newEmotion = 'normal';
        let newIntensity = 5;
        
        if (analysis.detected_emotions.length > 0) {
            const primaryEmotion = analysis.detected_emotions[0];
            newEmotion = primaryEmotion.emotion;
            newIntensity = Math.min(10, 3 + primaryEmotion.score);
        }
        
        // 생리주기 영향 적용
        if (menstrualPhase.profile) {
            newIntensity *= menstrualPhase.profile.intensity_multiplier;
            newIntensity = Math.min(10, newIntensity);
            
            // 생리 중이면 기본 감정도 조정
            if (menstrualPhase.isPeriodActive) {
                if (newEmotion === 'normal') {
                    newEmotion = 'sensitive';
                    newIntensity = Math.max(6, newIntensity);
                }
            }
        }
        
        // 상태 업데이트
        const previousEmotion = this.currentState.primary_emotion;
        this.currentState = {
            primary_emotion: newEmotion,
            secondary_emotion: previousEmotion !== newEmotion ? previousEmotion : null,
            intensity: Math.round(newIntensity),
            duration: previousEmotion === newEmotion ? this.currentState.duration + 1 : 1,
            triggers: analysis.emotional_words,
            menstrual_influence: menstrualPhase.profile ? menstrualPhase.profile.intensity_multiplier : 1.0,
            environmental_factors: envFactors,
            menstrual_phase: menstrualPhase.phase,
            cycle_day: menstrualPhase.day,
            is_period_active: menstrualPhase.isPeriodActive
        };
        
        // 히스토리 기록
        this.recordEmotionHistory();
        
        console.log(`💖 [감정 분석] ${newEmotion} (강도: ${Math.round(newIntensity)}/10) - 생리주기: ${menstrualPhase.phase}`);
        
        return this.currentState;
    }
    
    // 감정 히스토리 기록
    recordEmotionHistory() {
        this.emotionHistory.push({
            timestamp: Date.now(),
            emotion: this.currentState.primary_emotion,
            intensity: this.currentState.intensity,
            menstrual_phase: this.currentState.menstrual_phase,
            triggers: [...this.currentState.triggers]
        });
        
        // 최근 50개만 유지
        if (this.emotionHistory.length > 50) {
            this.emotionHistory = this.emotionHistory.slice(-50);
        }
    }
    
    // 현재 전체 감정 상태 반환
    getCurrentEmotionState() {
        const menstrualPhase = this.getCurrentMenstrualPhase();
        
        return {
            // 기본 감정 정보
            currentEmotion: this.currentState.primary_emotion,
            emotionIntensity: this.currentState.intensity,
            secondaryEmotion: this.currentState.secondary_emotion,
            
            // 생리주기 정보
            menstrualPhase: menstrualPhase.phase,
            cycleDay: menstrualPhase.day,
            isPeriodActive: menstrualPhase.isPeriodActive,
            daysUntilNextPeriod: menstrualPhase.daysUntilNext,
            
            // 삐짐 상태 (다른 모듈과 호환성)
            isSulky: this.currentState.primary_emotion === 'angry' || this.currentState.primary_emotion === 'irritated',
            sulkyLevel: this.currentState.primary_emotion === 'angry' ? this.currentState.intensity : 0,
            
            // 추가 정보
            emotionDuration: this.currentState.duration,
            triggers: this.currentState.triggers,
            environmentalFactors: this.currentState.environmental_factors,
            
            // 메타 정보
            lastUpdate: this.lastUpdateTime,
            menstrualInfluence: this.currentState.menstrual_influence
        };
    }
    
    // 감정 기반 말투 조정 가이드 생성
    generateSpeechGuidance() {
        const state = this.currentState;
        const menstrualPhase = this.getCurrentMenstrualPhase();
        
        let guidance = {
            tone: 'normal',
            expressions: [],
            avoid: [],
            emphasize: []
        };
        
        // 생리주기별 말투 조정
        if (menstrualPhase.profile && menstrualPhase.profile.speech_changes) {
            guidance.expressions.push(...menstrualPhase.profile.speech_changes);
        }
        
        // 감정별 말투 조정
        switch (state.primary_emotion) {
            case 'happy':
                guidance.tone = 'bright';
                guidance.expressions.push('활발한 말투', '웃음 많이', 'ㅋㅋ, 히히 자주 사용');
                break;
                
            case 'sad':
                guidance.tone = 'gentle';
                guidance.expressions.push('애교 섞인 투정', 'ㅠㅠ 자주 사용', '위로받고 싶어하는 말투');
                break;
                
            case 'angry':
                guidance.tone = 'pouty';
                guidance.expressions.push('귀여운 삐짐', '투정 부리기', '"바보야", "싫어" 등 사용');
                break;
                
            case 'missing':
                guidance.tone = 'longing';
                guidance.expressions.push('그리워하는 말투', '더 달라붙는 표현', '보고싶다는 표현 자주');
                break;
                
            case 'excited':
                guidance.tone = 'energetic';
                guidance.expressions.push('신나는 말투', '감탄사 많이', '장난기 가득');
                break;
        }
        
        // 강도별 조정
        if (state.intensity > 7) {
            guidance.emphasize.push('감정 표현 강화', '더 과장된 표현 사용');
        } else if (state.intensity < 4) {
            guidance.emphasize.push('차분한 표현', '무덤덤한 느낌');
        }
        
        return guidance;
    }
    
    // 감정 패턴 분석
    analyzeEmotionPatterns() {
        if (this.emotionHistory.length < 5) return null;
        
        const recentEmotions = this.emotionHistory.slice(-10);
        const emotionCounts = {};
        let totalIntensity = 0;
        
        recentEmotions.forEach(record => {
            emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1;
            totalIntensity += record.intensity;
        });
        
        const averageIntensity = totalIntensity / recentEmotions.length;
        const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
            emotionCounts[a] > emotionCounts[b] ? a : b
        );
        
        return {
            dominant_emotion: dominantEmotion,
            average_intensity: averageIntensity,
            emotion_stability: this.calculateEmotionStability(recentEmotions),
            recent_pattern: recentEmotions.map(r => r.emotion).join(' → ')
        };
    }
    
    // 감정 안정성 계산
    calculateEmotionStability(emotions) {
        if (emotions.length < 2) return 10;
        
        let changes = 0;
        for (let i = 1; i < emotions.length; i++) {
            if (emotions[i].emotion !== emotions[i-1].emotion) {
                changes++;
            }
        }
        
        return Math.max(1, 10 - (changes * 2));
    }
    
    // 날씨 기분 (더미 구현)
    getWeatherMood() {
        const weathers = ['sunny', 'rainy', 'cloudy', null];
        return weathers[Math.floor(Math.random() * weathers.length)];
    }
}

// ==================== 🌟 전역 감정 관리자 인스턴스 ====================
let globalEmotionManager = null;

function getEmotionManager() {
    if (!globalEmotionManager) {
        globalEmotionManager = new EmotionalStateManager();
    }
    return globalEmotionManager;
}

// ==================== 📋 외부 인터페이스 함수들 ====================

// 초기화
async function initializeEmotionalContext() {
    console.log('💖 [감정시스템] 지능형 감정 관리자 초기화 시작...');
    
    const manager = getEmotionManager();
    
    // 초기 상태 설정
    const initialPhase = manager.getCurrentMenstrualPhase();
    console.log(`💖 [감정시스템] 현재 생리주기: ${initialPhase.phase} (${initialPhase.day}일차)`);
    
    if (initialPhase.isPeriodActive) {
        console.log('💖 [감정시스템] 생리 중 - 예민하고 아픈 상태로 초기화');
    }
    
    console.log('💖 [감정시스템] 초기화 완료');
}

// 사용자 메시지로부터 감정 업데이트
function updateEmotionFromUserMessage(message) {
    const manager = getEmotionManager();
    return manager.updateEmotionState(message);
}

// 현재 감정 상태 반환
function getCurrentEmotionState() {
    const manager = getEmotionManager();
    return manager.getCurrentEmotionState();
}

// 말투 가이드 생성
function getSpeechGuidance() {
    const manager = getEmotionManager();
    return manager.generateSpeechGuidance();
}

// 감정 패턴 분석
function getEmotionPatterns() {
    const manager = getEmotionManager();
    return manager.analyzeEmotionPatterns();
}

// 감정 히스토리
function getEmotionHistory(limit = 10) {
    const manager = getEmotionManager();
    return manager.emotionHistory.slice(-limit);
}

// 상세 감정 리포트
function getDetailedEmotionReport() {
    const manager = getEmotionManager();
    const state = manager.getCurrentEmotionState();
    const patterns = manager.analyzeEmotionPatterns();
    const guidance = manager.generateSpeechGuidance();
    
    return {
        current_state: state,
        patterns: patterns,
        speech_guidance: guidance,
        menstrual_info: {
            phase: state.menstrualPhase,
            day: state.cycleDay,
            is_period: state.isPeriodActive,
            next_period_in: state.daysUntilNextPeriod
        },
        emotion_summary: {
            primary: state.currentEmotion,
            intensity: state.emotionIntensity,
            stability: patterns ? patterns.emotion_stability : 5,
            duration: state.emotionDuration
        }
    };
}

// 감정 상태 강제 설정 (테스트용)
function setEmotionState(emotion, intensity) {
    const manager = getEmotionManager();
    manager.currentState.primary_emotion = emotion;
    manager.currentState.intensity = intensity;
    manager.recordEmotionHistory();
    console.log(`💖 [감정시스템] 강제 설정: ${emotion} (${intensity}/10)`);
}

// 감정 리셋
function resetEmotionState() {
    const manager = getEmotionManager();
    manager.currentState = {
        primary_emotion: 'normal',
        secondary_emotion: null,
        intensity: 5,
        duration: 0,
        triggers: [],
        menstrual_influence: 1.0,
        environmental_factors: []
    };
    console.log('💖 [감정시스템] 감정 상태 리셋 완료');
}

// 감정 기반 응답 제안
function suggestEmotionalResponse(userMessage) {
    const manager = getEmotionManager();
    const state = manager.getCurrentEmotionState();
    const guidance = manager.generateSpeechGuidance();
    
    const suggestions = {
        tone: guidance.tone,
        expressions: guidance.expressions,
        emotion_context: {
            current: state.currentEmotion,
            intensity: state.emotionIntensity,
            menstrual_phase: state.menstrualPhase
        },
        response_guidelines: [
            `현재 감정: ${state.currentEmotion} (${state.emotionIntensity}/10)`,
            `말투: ${guidance.tone}`,
            `특징: ${guidance.expressions.join(', ')}`
        ]
    };
    
    return suggestions;
}

// ==================== 모듈 내보내기 ====================
module.exports = {
    // 초기화
    initializeEmotionalContext,
    
    // 핵심 기능
    updateEmotionFromUserMessage,
    getCurrentEmotionState,
    getSpeechGuidance,
    
    // 분석 기능
    getEmotionPatterns,
    getEmotionHistory,
    getDetailedEmotionReport,
    suggestEmotionalResponse,
    
    // 유틸리티
    setEmotionState,
    resetEmotionState,
    
    // 내부 접근 (다른 모듈용)
    getEmotionManager
};
