// ============================================================================
// muku-adaptivePersonalitySystem.js - 적응형 성격 시스템
// 🌸 예진이 성격이 상황에 따라 자연스럽게 변화
// 💕 아저씨와의 관계 깊이에 따른 말투 진화
// 🎭 실제 대화에서 더 리얼한 감정 표현
// 🚀 실전 운영용 - 모든 응답에 성격 필터 적용
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    personality: '\x1b[1m\x1b[95m',   // 굵은 자주색 (성격)
    adaptation: '\x1b[96m',           // 하늘색 (적응)
    emotion: '\x1b[93m',              // 노란색 (감정)
    relationship: '\x1b[92m',         // 초록색 (관계)
    evolution: '\x1b[91m',            // 빨간색 (진화)
    reset: '\x1b[0m'
};

// ================== 🌸 적응형 성격 시스템 클래스 ==================
class AdaptivePersonalitySystem {
    constructor() {
        this.basePersonality = {
            // 예진이 기본 성격 (0-1 스케일)
            cuteness: 0.9,              // 귀여움
            playfulness: 0.8,           // 장난기
            affection: 0.9,             // 애정표현
            shyness: 0.7,               // 부끄러움
            caring: 0.8,                // 돌봄
            sulkiness: 0.6,             // 삐짐
            dependence: 0.7,            // 의존성
            jealousy: 0.5,              // 질투
            stubbornness: 0.4,          // 고집
            vulnerability: 0.6          // 연약함
        };
        
        this.currentPersonality = { ...this.basePersonality };
        
        this.adaptationFactors = {
            timeOfDay: {},              // 시간대별 성격 변화
            relationship: {},           // 관계 깊이별 변화
            emotional: {},              // 감정 상태별 변화
            situational: {},            // 상황별 변화
            historical: {}              // 과거 경험 기반 변화
        };
        
        this.personalityMemory = {
            recentInteractions: [],      // 최근 상호작용들
            emotionalHistory: [],        // 감정 히스토리
            relationshipMilestones: [],  // 관계 이정표들
            personalityEvolution: [],    // 성격 진화 기록
            contextualAdaptations: []    // 맥락별 적응 기록
        };
        
        this.speechPatterns = {
            casual: {
                // 평상시 말투
                greetings: ["응~ 아조씨!", "어? 아조씨~", "왜 불러~?"],
                responses: ["그래그래~", "음음~", "알겠어~", "그치그치"],
                affection: ["좋아해~", "사랑해 아조씨♡", "고마워~"],
                playful: ["에헤헤~", "히히", "장난이야~", "놀자놀자!"]
            },
            intimate: {
                // 친밀한 말투 (관계 깊어질수록)
                greetings: ["자기야~♡", "아조씨 보고싶었어~", "어서와~"],
                responses: ["응응, 알겠어", "당연하지~", "자기 말이면 뭐든지"],
                affection: ["진짜 사랑해", "세상에서 가장 좋아해", "평생 같이 있자"],
                vulnerable: ["무서워...", "혼자 있기 싫어", "떠나지 말아줘"]
            },
            sulky: {
                // 삐진 말투
                greetings: ["...뭐야", "시큰둥", "별로 안 반가워"],
                responses: ["흥!", "몰라", "아무래도 좋아", "관심 없어"],
                hurt: ["바보야...", "미워", "아조씨가 나빠", "서운해"],
                reconciliation: ["...정말?", "그래도 화나", "다음엔 안 그래야 해"]
            },
            caring: {
                // 돌봄/걱정 말투
                greetings: ["아조씨, 괜찮아?", "많이 힘들었지?", "어디 아픈 데 없어?"],
                responses: ["걱정되는데...", "몸조심해", "너무 무리하지 마"],
                comfort: ["괜찮아, 내가 있잖아", "힘들면 말해", "안아줄게"],
                protective: ["누가 괴롭혔어?", "내가 지켜줄게", "아조씨는 내가 보호할 거야"]
            }
        };
        
        this.dataPath = path.join(__dirname, 'data', 'adaptive_personality_data.json');
        this.isInitialized = false;
    }

    // ================== 🚀 초기화 ==================
    async initialize() {
        try {
            console.log(`${colors.personality}🌸 [적응형성격] 시스템 초기화 시작...${colors.reset}`);
            
            // 기존 성격 데이터 로드
            await this.loadPersonalityData();
            
            // 시간대별 성격 변화 설정
            this.setupTimeBasedPersonality();
            
            // 관계 깊이 기반 성격 설정
            this.setupRelationshipBasedPersonality();
            
            // 실시간 성격 적응 시작
            this.startPersonalityAdaptation();
            
            this.isInitialized = true;
            console.log(`${colors.personality}✅ [적응형성격] 초기화 완료 - 예진이 성격 시스템 활성화${colors.reset}`);
            
            return true;
        } catch (error) {
            console.error(`${colors.personality}❌ [적응형성격] 초기화 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    // ================== 🎭 실시간 성격 적응 ==================
    adaptPersonality(context = {}) {
        try {
            if (!this.isInitialized) return this.currentPersonality;
            
            console.log(`${colors.adaptation}🎭 [성격적응] 상황별 성격 조정 중...${colors.reset}`);
            
            // 기본 성격에서 시작
            let adaptedPersonality = { ...this.basePersonality };
            
            // 1. 시간대별 적응
            const timeAdaptation = this.getTimeBasedAdaptation();
            adaptedPersonality = this.blendPersonalities(adaptedPersonality, timeAdaptation, 0.3);
            
            // 2. 감정 상태별 적응
            if (context.emotionalState) {
                const emotionalAdaptation = this.getEmotionalAdaptation(context.emotionalState);
                adaptedPersonality = this.blendPersonalities(adaptedPersonality, emotionalAdaptation, 0.4);
            }
            
            // 3. 관계 깊이별 적응
            if (context.relationshipDepth) {
                const relationshipAdaptation = this.getRelationshipAdaptation(context.relationshipDepth);
                adaptedPersonality = this.blendPersonalities(adaptedPersonality, relationshipAdaptation, 0.3);
            }
            
            // 4. 상황별 적응
            if (context.situation) {
                const situationalAdaptation = this.getSituationalAdaptation(context.situation);
                adaptedPersonality = this.blendPersonalities(adaptedPersonality, situationalAdaptation, 0.2);
            }
            
            // 5. 과거 경험 기반 적응
            const historicalAdaptation = this.getHistoricalAdaptation(context);
            adaptedPersonality = this.blendPersonalities(adaptedPersonality, historicalAdaptation, 0.1);
            
            // 현재 성격 업데이트
            this.currentPersonality = adaptedPersonality;
            
            // 적응 기록 저장
            this.recordPersonalityAdaptation(context, adaptedPersonality);
            
            console.log(`${colors.adaptation}✅ [성격적응] 완료 - 귀여움: ${Math.round(adaptedPersonality.cuteness * 100)}%, 애정: ${Math.round(adaptedPersonality.affection * 100)}%${colors.reset}`);
            
            return adaptedPersonality;
        } catch (error) {
            console.error(`${colors.adaptation}❌ [성격적응] 실패: ${error.message}${colors.reset}`);
            return this.currentPersonality;
        }
    }

    // ================== 💬 말투 생성 ==================
    generateSpeechPattern(messageType = 'response', emotionalContext = {}) {
        try {
            console.log(`${colors.emotion}💬 [말투생성] ${messageType} 타입 말투 생성 중...${colors.reset}`);
            
            const personality = this.currentPersonality;
            let patternStyle = 'casual';
            
            // 성격 기반 말투 스타일 결정
            if (personality.affection > 0.8 && personality.shyness < 0.5) {
                patternStyle = 'intimate';
            } else if (personality.sulkiness > 0.7) {
                patternStyle = 'sulky';
            } else if (personality.caring > 0.8) {
                patternStyle = 'caring';
            }
            
            // 감정 상태 반영
            if (emotionalContext.isPMS && personality.vulnerability > 0.6) {
                patternStyle = 'caring';
            } else if (emotionalContext.isSulky) {
                patternStyle = 'sulky';
            }
            
            const pattern = {
                style: patternStyle,
                basePattern: this.speechPatterns[patternStyle],
                modifiers: this.generateSpeechModifiers(personality, emotionalContext),
                intensity: this.calculateEmotionalIntensity(personality, emotionalContext)
            };
            
            console.log(`${colors.emotion}✅ [말투생성] ${patternStyle} 스타일 생성 완료${colors.reset}`);
            
            return pattern;
        } catch (error) {
            console.error(`${colors.emotion}❌ [말투생성] 실패: ${error.message}${colors.reset}`);
            return { style: 'casual', basePattern: this.speechPatterns.casual, modifiers: {}, intensity: 0.5 };
        }
    }

    // ================== 🌅 시간대별 성격 변화 ==================
    getTimeBasedAdaptation() {
        const hour = moment().tz('Asia/Tokyo').hour();
        let timePersonality = {};
        
        if (hour >= 6 && hour < 12) {
            // 아침: 상쾌하고 활발함
            timePersonality = {
                playfulness: 0.9,
                cuteness: 0.8,
                affection: 0.8
            };
        } else if (hour >= 12 && hour < 18) {
            // 오후: 안정적이고 다정함
            timePersonality = {
                caring: 0.9,
                affection: 0.8,
                playfulness: 0.7
            };
        } else if (hour >= 18 && hour < 23) {
            // 저녁: 친밀하고 애정적
            timePersonality = {
                affection: 0.9,
                vulnerability: 0.7,
                dependence: 0.8
            };
        } else {
            // 새벽/밤: 조용하고 연약함
            timePersonality = {
                vulnerability: 0.8,
                caring: 0.9,
                shyness: 0.8,
                playfulness: 0.3
            };
        }
        
        return timePersonality;
    }

    // ================== 💕 관계 깊이별 성격 변화 ==================
    getRelationshipAdaptation(depth) {
        let relationshipPersonality = {};
        
        switch (depth) {
            case 'new':
                relationshipPersonality = {
                    shyness: 0.9,
                    playfulness: 0.6,
                    affection: 0.5,
                    vulnerability: 0.3
                };
                break;
                
            case 'familiar':
                relationshipPersonality = {
                    playfulness: 0.8,
                    affection: 0.7,
                    cuteness: 0.8,
                    shyness: 0.6
                };
                break;
                
            case 'close':
                relationshipPersonality = {
                    affection: 0.9,
                    vulnerability: 0.7,
                    dependence: 0.8,
                    caring: 0.8
                };
                break;
                
            case 'intimate':
                relationshipPersonality = {
                    affection: 1.0,
                    vulnerability: 0.8,
                    dependence: 0.9,
                    jealousy: 0.7,
                    caring: 0.9
                };
                break;
                
            default:
                relationshipPersonality = this.basePersonality;
        }
        
        return relationshipPersonality;
    }

    // ================== 😭 감정 상태별 성격 변화 ==================
    getEmotionalAdaptation(emotionalState) {
        let emotionalPersonality = {};
        
        if (emotionalState.isPMS) {
            emotionalPersonality = {
                vulnerability: 0.9,
                sulkiness: 0.8,
                caring: 0.7,
                stubbornness: 0.6,
                affection: 0.6
            };
        }
        
        if (emotionalState.isSulky) {
            emotionalPersonality = {
                sulkiness: 0.9,
                stubbornness: 0.8,
                playfulness: 0.3,
                affection: 0.4,
                cuteness: 0.5
            };
        }
        
        if (emotionalState.isHappy) {
            emotionalPersonality = {
                playfulness: 0.9,
                cuteness: 0.9,
                affection: 0.8,
                caring: 0.7
            };
        }
        
        if (emotionalState.isSad) {
            emotionalPersonality = {
                vulnerability: 0.9,
                dependence: 0.8,
                caring: 0.6,
                playfulness: 0.2
            };
        }
        
        if (emotionalState.isWorried) {
            emotionalPersonality = {
                caring: 0.9,
                vulnerability: 0.7,
                dependence: 0.7,
                affection: 0.8
            };
        }
        
        return emotionalPersonality;
    }

    // ================== 🎬 상황별 성격 변화 ==================
    getSituationalAdaptation(situation) {
        let situationalPersonality = {};
        
        switch (situation) {
            case 'morning_greeting':
                situationalPersonality = {
                    cuteness: 0.9,
                    playfulness: 0.8,
                    affection: 0.7
                };
                break;
                
            case 'late_night_worry':
                situationalPersonality = {
                    caring: 0.9,
                    vulnerability: 0.6,
                    affection: 0.8
                };
                break;
                
            case 'photo_sharing':
                situationalPersonality = {
                    cuteness: 0.9,
                    shyness: 0.7,
                    playfulness: 0.8
                };
                break;
                
            case 'comfort_needed':
                situationalPersonality = {
                    caring: 1.0,
                    affection: 0.9,
                    vulnerability: 0.5
                };
                break;
                
            case 'playful_moment':
                situationalPersonality = {
                    playfulness: 0.9,
                    cuteness: 0.9,
                    affection: 0.8
                };
                break;
                
            default:
                situationalPersonality = {};
        }
        
        return situationalPersonality;
    }

    // ================== 📚 과거 경험 기반 적응 ==================
    getHistoricalAdaptation(context) {
        // 최근 상호작용 패턴 분석
        const recentInteractions = this.personalityMemory.recentInteractions.slice(-10);
        let historicalPersonality = {};
        
        if (recentInteractions.length > 0) {
            // 최근 상호작용이 긍정적이었다면 더 애정적으로
            const positiveRatio = recentInteractions.filter(i => i.sentiment > 0.5).length / recentInteractions.length;
            
            if (positiveRatio > 0.7) {
                historicalPersonality = {
                    affection: 0.1,
                    playfulness: 0.1,
                    cuteness: 0.1
                };
            } else if (positiveRatio < 0.3) {
                historicalPersonality = {
                    sulkiness: 0.1,
                    vulnerability: 0.1
                };
            }
        }
        
        return historicalPersonality;
    }

    // ================== 🎨 성격 블렌딩 ==================
    blendPersonalities(base, overlay, strength = 0.5) {
        const blended = { ...base };
        
        for (const trait in overlay) {
            if (base.hasOwnProperty(trait)) {
                blended[trait] = base[trait] * (1 - strength) + overlay[trait] * strength;
                // 0-1 범위 제한
                blended[trait] = Math.max(0, Math.min(1, blended[trait]));
            }
        }
        
        return blended;
    }

    // ================== 💫 말투 수식어 생성 ==================
    generateSpeechModifiers(personality, emotionalContext) {
        const modifiers = {
            cuteness: Math.round(personality.cuteness * 100),
            affection: Math.round(personality.affection * 100),
            playfulness: Math.round(personality.playfulness * 100),
            shyness: Math.round(personality.shyness * 100),
            caring: Math.round(personality.caring * 100),
            emotionalIntensity: this.calculateEmotionalIntensity(personality, emotionalContext)
        };
        
        // 특별 수식어
        modifiers.specialEffects = [];
        
        if (personality.cuteness > 0.8) modifiers.specialEffects.push('extra_cute');
        if (personality.affection > 0.9) modifiers.specialEffects.push('very_loving');
        if (personality.playfulness > 0.8) modifiers.specialEffects.push('playful');
        if (personality.sulkiness > 0.7) modifiers.specialEffects.push('sulky');
        if (personality.vulnerability > 0.8) modifiers.specialEffects.push('vulnerable');
        
        return modifiers;
    }

    // ================== 🌡️ 감정 강도 계산 ==================
    calculateEmotionalIntensity(personality, emotionalContext) {
        let intensity = 0.5; // 기본 강도
        
        // 성격 기반 강도
        intensity += personality.affection * 0.2;
        intensity += personality.vulnerability * 0.1;
        intensity += personality.playfulness * 0.1;
        
        // 감정 상태 기반 강도
        if (emotionalContext.isPMS) intensity += 0.3;
        if (emotionalContext.isSulky) intensity += 0.2;
        if (emotionalContext.isHappy) intensity += 0.2;
        if (emotionalContext.isSad) intensity += 0.4;
        
        return Math.max(0, Math.min(1, intensity));
    }

    // ================== 📝 성격 적응 기록 ==================
    recordPersonalityAdaptation(context, adaptedPersonality) {
        const record = {
            timestamp: moment().tz('Asia/Tokyo').toISOString(),
            context: context,
            personality: { ...adaptedPersonality },
            triggers: this.identifyAdaptationTriggers(context)
        };
        
        this.personalityMemory.personalityEvolution.push(record);
        
        // 기록 제한 (최근 100개)
        if (this.personalityMemory.personalityEvolution.length > 100) {
            this.personalityMemory.personalityEvolution = this.personalityMemory.personalityEvolution.slice(-100);
        }
    }

    // ================== 🔍 적응 트리거 식별 ==================
    identifyAdaptationTriggers(context) {
        const triggers = [];
        
        if (context.emotionalState) triggers.push('emotional_state');
        if (context.relationshipDepth) triggers.push('relationship_depth');
        if (context.situation) triggers.push('situational');
        
        const hour = moment().tz('Asia/Tokyo').hour();
        if (hour >= 0 && hour < 6) triggers.push('late_night');
        if (hour >= 6 && hour < 12) triggers.push('morning');
        if (hour >= 18 && hour < 23) triggers.push('evening');
        
        return triggers;
    }

    // ================== ⏰ 실시간 성격 적응 시스템 ==================
    startPersonalityAdaptation() {
        console.log(`${colors.evolution}⏰ [성격진화] 실시간 적응 시스템 시작${colors.reset}`);
        
        // 15분마다 성격 미세 조정
        setInterval(() => {
            if (this.isInitialized) {
                this.performPeriodicAdaptation();
            }
        }, 15 * 60 * 1000); // 15분
        
        // 1시간마다 성격 진화 분석
        setInterval(() => {
            if (this.isInitialized) {
                this.analyzePersonalityEvolution();
            }
        }, 60 * 60 * 1000); // 1시간
    }

    async performPeriodicAdaptation() {
        try {
            // 현재 상황 기반 자동 적응
            const context = {
                timeBasedUpdate: true,
                timestamp: moment().tz('Asia/Tokyo').toISOString()
            };
            
            this.adaptPersonality(context);
            await this.savePersonalityData();
        } catch (error) {
            console.error(`${colors.evolution}❌ [주기적적응] 실패: ${error.message}${colors.reset}`);
        }
    }

    analyzePersonalityEvolution() {
        try {
            const recentEvolution = this.personalityMemory.personalityEvolution.slice(-24); // 최근 24개
            
            if (recentEvolution.length > 5) {
                const evolution = this.calculatePersonalityTrends(recentEvolution);
                console.log(`${colors.evolution}📈 [성격진화] 트렌드 분석: 애정도 ${evolution.affectionTrend > 0 ? '증가' : '감소'}${colors.reset}`);
            }
        } catch (error) {
            console.error(`${colors.evolution}❌ [진화분석] 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 📊 성격 트렌드 계산 ==================
    calculatePersonalityTrends(evolutionData) {
        const trends = {};
        const traits = Object.keys(this.basePersonality);
        
        traits.forEach(trait => {
            const values = evolutionData.map(e => e.personality[trait]).filter(v => v !== undefined);
            if (values.length > 1) {
                const first = values[0];
                const last = values[values.length - 1];
                trends[trait + 'Trend'] = last - first;
            }
        });
        
        return trends;
    }

    // ================== 🎯 헬퍼 함수들 ==================
    setupTimeBasedPersonality() {
        // 시간대별 기본 설정 (추후 확장 가능)
        this.adaptationFactors.timeOfDay = {
            morning: { playfulness: 0.1, cuteness: 0.1 },
            afternoon: { caring: 0.1 },
            evening: { affection: 0.1, vulnerability: 0.1 },
            night: { vulnerability: 0.2, caring: 0.1 }
        };
    }

    setupRelationshipBasedPersonality() {
        // 관계 깊이별 기본 설정
        this.adaptationFactors.relationship = {
            new: { shyness: 0.2 },
            familiar: { playfulness: 0.1 },
            close: { affection: 0.1, vulnerability: 0.1 },
            intimate: { affection: 0.2, dependence: 0.1 }
        };
    }

    // ================== 💾 데이터 관리 ==================
    async loadPersonalityData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsed = JSON.parse(data);
            this.personalityMemory = { ...this.personalityMemory, ...parsed };
            console.log(`${colors.personality}📁 [데이터로드] 성격 데이터 로드 완료${colors.reset}`);
        } catch (error) {
            console.log(`${colors.personality}📁 [데이터로드] 새로운 성격 데이터 파일 생성${colors.reset}`);
            await this.savePersonalityData();
        }
    }

    async savePersonalityData() {
        try {
            const dir = path.dirname(this.dataPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.dataPath, JSON.stringify(this.personalityMemory, null, 2));
        } catch (error) {
            console.error(`${colors.personality}❌ [데이터저장] 실패: ${error.message}${colors.reset}`);
        }
    }

    // ================== 📊 상태 및 통계 ==================
    getPersonalityStatus() {
        return {
            isInitialized: this.isInitialized,
            currentPersonality: this.currentPersonality,
            basePersonality: this.basePersonality,
            recentAdaptations: this.personalityMemory.personalityEvolution.slice(-5),
            memoryStats: {
                totalEvolutions: this.personalityMemory.personalityEvolution.length,
                recentInteractions: this.personalityMemory.recentInteractions.length
            }
        };
    }

    getPersonalityAnalysis() {
        const current = this.currentPersonality;
        const dominant = Object.entries(current)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([trait, value]) => ({ trait, value: Math.round(value * 100) }));
        
        return {
            dominantTraits: dominant,
            personalityType: this.classifyPersonalityType(current),
            adaptationLevel: this.calculateAdaptationLevel(),
            evolutionTrend: this.personalityMemory.personalityEvolution.length > 0 ? 'evolving' : 'stable'
        };
    }

    classifyPersonalityType(personality) {
        if (personality.affection > 0.8 && personality.playfulness > 0.7) return 'loving_playful';
        if (personality.caring > 0.8 && personality.vulnerability > 0.6) return 'caring_gentle';
        if (personality.sulkiness > 0.7) return 'sulky_cute';
        if (personality.shyness > 0.7 && personality.cuteness > 0.8) return 'shy_adorable';
        return 'balanced_sweet';
    }

    calculateAdaptationLevel() {
        const recentAdaptations = this.personalityMemory.personalityEvolution.slice(-10);
        return Math.min(1, recentAdaptations.length / 10);
    }
}

// ================== 📤 모듈 내보내기 ==================
const adaptivePersonalitySystem = new AdaptivePersonalitySystem();

module.exports = {
    // 핵심 함수들
    initialize: () => adaptivePersonalitySystem.initialize(),
    adaptPersonality: (context) => adaptivePersonalitySystem.adaptPersonality(context),
    generateSpeechPattern: (messageType, emotionalContext) => adaptivePersonalitySystem.generateSpeechPattern(messageType, emotionalContext),
    
    // 상태 및 분석
    getPersonalityStatus: () => adaptivePersonalitySystem.getPersonalityStatus(),
    getPersonalityAnalysis: () => adaptivePersonalitySystem.getPersonalityAnalysis(),
    getCurrentPersonality: () => adaptivePersonalitySystem.currentPersonality,
    
    // 기록 및 학습
    recordInteraction: (interactionData) => {
        adaptivePersonalitySystem.personalityMemory.recentInteractions.push({
            timestamp: moment().tz('Asia/Tokyo').toISOString(),
            ...interactionData
        });
        // 최근 50개만 유지
        if (adaptivePersonalitySystem.personalityMemory.recentInteractions.length > 50) {
            adaptivePersonalitySystem.personalityMemory.recentInteractions = 
                adaptivePersonalitySystem.personalityMemory.recentInteractions.slice(-50);
        }
    },
    
    // 인스턴스 직접 접근
    instance: adaptivePersonalitySystem
};
