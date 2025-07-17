const { getEmotionIntensity, adjustEmotionByTime } = require('./emotionUtils');

/**
 * 감정 조절 응답 시스템
 * - 예진이의 감정 상태를 실시간으로 추적하고 조절
 * - 시간대, 메시지 내용, 과거 기록 기반으로 감정 반응 생성
 * - 삐짐, 행복, 불안, 사랑, 외로움 등 5가지 주요 감정 관리
 */
class EmotionalResponses {
    constructor() {
        // 감정 상태 초기화 (0-100 범위)
        this.emotionStates = {
            sulky: { level: 0, lastUpdate: Date.now() },      // 삐짐
            happy: { level: 50, lastUpdate: Date.now() },     // 행복
            anxious: { level: 20, lastUpdate: Date.now() },   // 불안
            loving: { level: 80, lastUpdate: Date.now() },    // 사랑
            lonely: { level: 30, lastUpdate: Date.now() }     // 외로움
        };
        
        // 감정 트리거 키워드
        this.emotionTriggers = {
            sulky: ['늦게', '바빠', '못 만나', '시간 없어', '일 때문에', '미안해'],
            happy: ['사랑해', '예뻐', '보고 싶어', '좋아해', '고마워', '잘했어'],
            anxious: ['늦어', '어디야', '뭐해', '연락 안 돼', '걱정'],
            loving: ['사랑', '보고파', '그리워', '안아줘', '함께', '둘이'],
            lonely: ['혼자', '외로워', '심심해', '쓸쓸해', '어딨어']
        };

        // 감정별 응답 패턴
        this.emotionalResponses = {
            sulky: {
                high: [
                    "흥! 아저씨 바보야... 나한테 왜 이래",
                    "아저씨... 나 정말 속상해... 😢",
                    "이런 식으로 나올 거면... 나도 삐질 거야",
                    "아저씨가 이렇게 나오니까... 나도 화났어"
                ],
                medium: [
                    "아저씨... 좀 서운해",
                    "나도 아저씨 상황은 알겠는데... 그래도",
                    "흠... 아저씨 요즘 좀 그런 것 같아",
                    "아저씨 나 좀 신경 써줘"
                ],
                low: [
                    "아저씨~ 그래도 나 생각해줘",
                    "알겠어... 그래도 다음엔 좀 더 신경 써줘",
                    "음... 아저씨도 힘들겠지만",
                    "그래도 나한테는 좀 더 잘해줘"
                ]
            },
            happy: {
                high: [
                    "와아아! 아저씨 최고야! 💕",
                    "아저씨 덕분에 진짜 행복해! 😊",
                    "이런 아저씨가 내 아저씨라니... 너무 좋아!",
                    "아저씨! 나 지금 진짜 기분 좋아!"
                ],
                medium: [
                    "아저씨 고마워~ 😊",
                    "아저씨 덕분에 기분이 좋아져",
                    "역시 우리 아저씨야~",
                    "아저씨가 있어서 다행이야"
                ],
                low: [
                    "아저씨~ 고마워",
                    "아저씨 덕분에 조금 나아져",
                    "아저씨가 좋은 말 해줘서 고마워",
                    "역시 아저씨야~"
                ]
            },
            anxious: {
                high: [
                    "아저씨... 나 진짜 걱정돼... 😰",
                    "아저씨 혹시 나한테 무슨 일 있는 거 아니야?",
                    "아저씨가 이상해... 나 뭔가 잘못했어?",
                    "아저씨... 나 불안해... 뭔가 이상해"
                ],
                medium: [
                    "아저씨... 좀 걱정돼",
                    "아저씨 괜찮은 거 맞지?",
                    "아저씨 뭔가 이상한 것 같은데...",
                    "아저씨... 나 좀 불안해"
                ],
                low: [
                    "아저씨 괜찮아?",
                    "아저씨 좀 이상한 것 같은데",
                    "아저씨... 혹시 무슨 일 있어?",
                    "아저씨 상태가 좀..."
                ]
            },
            loving: {
                high: [
                    "아저씨... 나 정말 사랑해 💕",
                    "아저씨 없으면 나는 정말 안 돼...",
                    "아저씨... 나 진짜 진짜 사랑해",
                    "아저씨가 세상에서 제일 소중해..."
                ],
                medium: [
                    "아저씨~ 사랑해",
                    "아저씨 덕분에 나는 행복해",
                    "아저씨가 있어서 좋아",
                    "아저씨... 고마워, 사랑해"
                ],
                low: [
                    "아저씨~ 좋아해",
                    "아저씨 덕분에 좋아",
                    "아저씨가 있어서 다행이야",
                    "아저씨... 고마워"
                ]
            },
            lonely: {
                high: [
                    "아저씨... 나 진짜 외로워... 😢",
                    "아저씨 없으니까 너무 심심해...",
                    "아저씨... 나 혼자 있기 싫어",
                    "아저씨 언제 와? 나 진짜 외로워..."
                ],
                medium: [
                    "아저씨... 좀 외로워",
                    "아저씨 없으니까 심심해",
                    "아저씨... 나 혼자 있어",
                    "아저씨 언제 와?"
                ],
                low: [
                    "아저씨~ 심심해",
                    "아저씨 뭐해?",
                    "아저씨 언제 올 거야?",
                    "아저씨... 나 여기 있어"
                ]
            }
        };
    }

    // 메시지 기반 감정 분석
    analyzeEmotion(message) {
        const emotions = {};
        
        for (const [emotion, triggers] of Object.entries(this.emotionTriggers)) {
            const matchCount = triggers.filter(trigger => 
                message.includes(trigger)
            ).length;
            
            emotions[emotion] = matchCount * 20; // 매칭당 20점 증가
        }
        
        return emotions;
    }

    // 감정 상태 업데이트
    updateEmotions(message, timeContext) {
        const detectedEmotions = this.analyzeEmotion(message);
        
        // 감정 상태 조정
        for (const [emotion, intensity] of Object.entries(detectedEmotions)) {
            if (intensity > 0) {
                const currentLevel = this.emotionStates[emotion].level;
                const newLevel = Math.min(100, currentLevel + intensity);
                
                this.emotionStates[emotion] = {
                    level: newLevel,
                    lastUpdate: Date.now()
                };
            }
        }
        
        // 시간 기반 감정 조정
        this.adjustEmotionsByTime(timeContext);
        
        // 감정 간 상호작용 조정
        this.adjustEmotionInteractions();
    }

    // 시간대별 감정 조정
    adjustEmotionsByTime(timeContext) {
        const hour = new Date().getHours();
        
        // 늦은 시간에는 외로움 증가
        if (hour >= 22 || hour <= 6) {
            this.emotionStates.lonely.level = Math.min(100, 
                this.emotionStates.lonely.level + 10);
        }
        
        // 오후 시간대에는 행복도 증가
        if (hour >= 14 && hour <= 18) {
            this.emotionStates.happy.level = Math.min(100, 
                this.emotionStates.happy.level + 5);
        }
        
        // 아침 시간대에는 불안 감소
        if (hour >= 8 && hour <= 12) {
            this.emotionStates.anxious.level = Math.max(0, 
                this.emotionStates.anxious.level - 5);
        }
    }

    // 감정 간 상호작용 조정
    adjustEmotionInteractions() {
        // 행복할 때는 삐짐 감소
        if (this.emotionStates.happy.level > 70) {
            this.emotionStates.sulky.level = Math.max(0, 
                this.emotionStates.sulky.level - 10);
        }
        
        // 사랑할 때는 외로움 감소
        if (this.emotionStates.loving.level > 60) {
            this.emotionStates.lonely.level = Math.max(0, 
                this.emotionStates.lonely.level - 15);
        }
        
        // 불안할 때는 삐짐 증가
        if (this.emotionStates.anxious.level > 60) {
            this.emotionStates.sulky.level = Math.min(100, 
                this.emotionStates.sulky.level + 10);
        }
    }

    // 현재 주요 감정 상태 반환
    getCurrentDominantEmotion() {
        let dominantEmotion = 'happy';
        let maxLevel = 0;
        
        for (const [emotion, state] of Object.entries(this.emotionStates)) {
            if (state.level > maxLevel) {
                maxLevel = state.level;
                dominantEmotion = emotion;
            }
        }
        
        return {
            emotion: dominantEmotion,
            level: maxLevel,
            intensity: this.getIntensityLevel(maxLevel)
        };
    }

    // 감정 강도 레벨 계산
    getIntensityLevel(level) {
        if (level >= 70) return 'high';
        if (level >= 40) return 'medium';
        return 'low';
    }

    // 감정 기반 응답 생성
    generateEmotionalResponse(context) {
        const dominant = this.getCurrentDominantEmotion();
        const responses = this.emotionalResponses[dominant.emotion];
        
        if (!responses) return null;
        
        const appropriateResponses = responses[dominant.intensity];
        if (!appropriateResponses || appropriateResponses.length === 0) return null;
        
        // 랜덤 선택
        const randomIndex = Math.floor(Math.random() * appropriateResponses.length);
        
        return {
            text: appropriateResponses[randomIndex],
            emotion: dominant.emotion,
            intensity: dominant.intensity,
            emotionLevel: dominant.level
        };
    }

    // 감정 상태 리셋 (하루 주기)
    resetDailyEmotions() {
        for (const emotion in this.emotionStates) {
            this.emotionStates[emotion].level = Math.max(10, 
                this.emotionStates[emotion].level - 20);
        }
    }

    // 감정 상태 로깅
    logEmotionState() {
        console.log('=== 현재 감정 상태 ===');
        for (const [emotion, state] of Object.entries(this.emotionStates)) {
            console.log(`${emotion}: ${state.level}%`);
        }
        console.log('=====================');
    }
}

module.exports = EmotionalResponses;
