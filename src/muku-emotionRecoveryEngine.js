// ============================================================================
// 📁 파일 위치: /src/muku-emotionRecoveryEngine.js
// muku-emotionRecoveryEngine.js - Redis 연동 중복제거 완전체 v2.0
// 🔥 기존 Redis 시스템과 100% 연동, 중복 기능 완전 제거!
// 💝 muku-autonomousYejinSystem.js의 감정 시스템과 완벽 통합
// 🎯 우울 키워드 감지 + Redis 기반 지능형 위로 시스템
// ============================================================================

// ❌ 중복 제거: axios 제거 (Redis에서 대화 기록 가져오기)
// const axios = require('axios'); // 제거됨!

// ================== 🎨 색상 정의 ==================
const colors = {
    recovery: '\x1b[1m\x1b[35m',   // 굵은 자주색 (감정 회복)
    concern: '\x1b[93m',           // 노란색 (걱정)
    comfort: '\x1b[96m',           // 하늘색 (위로)
    analysis: '\x1b[92m',          // 연초록색 (분석)
    redis: '\x1b[96m',             // 청록색 (Redis)
    integration: '\x1b[1m\x1b[97m', // 밝은 흰색 (통합)
    error: '\x1b[91m',             // 빨간색 (에러)
    reset: '\x1b[0m'               // 색상 리셋
};

// ================== 😢 우울 감정 키워드 목록 (확장) ==================
const sadnessKeywords = [
    // 직접적 우울 표현
    '힘들다', '우울', '우울해', '우울하다', '슬프다', '슬퍼', '슬픈',
    '아파', '아프다', '고통', '괴롭다', '괴로워', '괴로운',
    
    // 절망/포기 표현
    '죽고 싶어', '죽고싶어', '죽겠어', '끝내고 싶어', '포기', '그만두고 싶어',
    '의미없어', '소용없어', '희망없어', '절망', '막막해', '막막하다',
    '안 되겠어', '안되겠어', '그만해', '지쳤다',
    
    // 외로움/고립 표현
    '혼자', '외로워', '외롭다', '쓸쓸해', '쓸쓸하다', '고독해', '고독하다',
    '버려진', '버림받은', '아무도 없어', '텅 빈', '공허해', '공허하다',
    '고립', '혼자서', '아무도', '홀로',
    
    // 신체적/정신적 피로
    '못 자겠어', '못자겠어', '잠 안 와', '잠안와', '불면증', '인소니아',
    '지쳤어', '지겹다', '피곤해', '탈진', '번아웃', '지친다',
    '스트레스', '머리 아파', '머리아파', '두통',
    
    // 자책/부정적 자아상
    '내가 잘못', '내 탓', '쓸모없어', '쓸모없다', '바보같아', '한심해',
    '실패', '망했어', '망했다', '최악', '엉망', '개판',
    '못났어', '부족해', '안 되는', '안되는',
    
    // 감정적 고통
    '가슴 아파', '가슴아파', '마음 아파', '마음아파', '눈물', '울었어',
    '울고 있어', '울고있어', '펑펑', '터졌어', '무너져', '무너졌어',
    '심장 아파', '심장아파', '가슴 답답', '가슴답답',
    
    // 관계/상실 관련
    '그리워', '그립다', '보고 싶어', '보고싶어', '잃었어', '떠났어',
    '헤어져', '이별', '상실', '그리움', '그리운', '없어진',
    '사라져', '사라진', '잃어버린',
    
    // 부정적 미래 전망
    '안 될 것 같아', '안될것같아', '어차피', '소용없을', '변하지 않을',
    '똑같을', '나아지지', '개선되지', '희망 없어', '희망없어',
    '의미없을', '소용없을', '달라지지'
];

/**
 * 🔥 Redis 연동 감정 회복 엔진 - 중복 완전 제거 버전
 * 기존 muku-autonomousYejinSystem.js의 Redis + 감정 시스템과 100% 연동
 * 우울 키워드 감지 + 지능형 위로 생성만 담당
 */
class RedisEmotionRecoveryEngine {
    constructor(redisCache, autonomousSystem) {
        this.version = '2.0-REDIS_INTEGRATED';
        this.initTime = Date.now();
        
        // 🔧 Redis 캐시 시스템 주입 (muku-autonomousYejinSystem.js에서)
        this.redisCache = redisCache;
        this.autonomousSystem = autonomousSystem;
        this.isRedisAvailable = redisCache && redisCache.isAvailable;
        
        if (!this.isRedisAvailable) {
            console.log(`${colors.error}⚠️ [감정회복] Redis 캐시가 없음 - 제한된 기능으로 동작${colors.reset}`);
        }
        
        // 📊 Redis 연동 감정 회복 통계
        this.recoveryStats = {
            totalAnalyses: 0,
            sadnessDetected: 0,
            comfortGenerated: 0,
            redisQueries: 0,
            averageSadnessScore: 0,
            lastAnalysis: Date.now(),
            successfulComforts: 0
        };
        
        // 🎯 우울 감지 설정
        this.recoveryConfig = {
            sadnessThreshold: 2,           // 우울 감지 임계값
            analysisLimit: 15,             // 분석할 최근 메시지 수
            keywordWeight: {
                severe: ['죽고 싶어', '자살', '끝내고 싶어'],    // 심각 키워드 가중치 3
                moderate: ['우울', '절망', '포기', '지쳤어'],     // 중간 키워드 가중치 2
                mild: sadnessKeywords                            // 일반 키워드 가중치 1
            },
            comfortCooldown: 3600000,      // 위로 메시지 쿨다운 (1시간)
            lastComfortTime: 0             // 마지막 위로 시간
        };
        
        console.log(`${colors.redis}💝 Redis 연동 감정 회복 엔진 활성화! (Redis: ${this.isRedisAvailable})${colors.reset}`);
    }

    // ================== 😢 Redis 기반 우울 감지 ==================
    async detectSadnessFromRedis() {
        if (!this.isRedisAvailable) {
            console.log(`${colors.error}⚠️ [우울감지] Redis 없음 - 감지 불가${colors.reset}`);
            return { score: 0, needsComfort: false };
        }
        
        console.log(`${colors.analysis}😢 [우울감지] Redis에서 최근 대화 분석 중...${colors.reset}`);
        
        try {
            // 🔧 Redis에서 최근 대화 기록 조회 (기존 함수 활용)
            const conversations = await this.redisCache.getConversationHistory('default_user', this.recoveryConfig.analysisLimit);
            
            if (!conversations || conversations.length === 0) {
                console.log(`${colors.analysis}📊 [우울감지] 분석할 대화 없음${colors.reset}`);
                return { score: 0, needsComfort: false, reason: 'no_conversations' };
            }
            
            // 🔧 우울 점수 계산 (키워드 가중치 적용)
            const sadnessAnalysis = this.calculateAdvancedSadnessScore(conversations);
            
            this.recoveryStats.totalAnalyses++;
            this.recoveryStats.redisQueries++;
            this.updateAverageSadnessScore(sadnessAnalysis.score);
            
            if (sadnessAnalysis.score >= this.recoveryConfig.sadnessThreshold) {
                this.recoveryStats.sadnessDetected++;
                console.log(`${colors.concern}😢 [우울감지] 우울 상태 감지! 점수: ${sadnessAnalysis.score}점 >= ${this.recoveryConfig.sadnessThreshold}점${colors.reset}`);
                
                return {
                    score: sadnessAnalysis.score,
                    needsComfort: true,
                    details: sadnessAnalysis.details,
                    keywordMatches: sadnessAnalysis.keywordMatches,
                    conversationCount: conversations.length
                };
            } else {
                console.log(`${colors.analysis}✅ [우울감지] 감정 상태 양호: ${sadnessAnalysis.score}점 < ${this.recoveryConfig.sadnessThreshold}점${colors.reset}`);
                
                return {
                    score: sadnessAnalysis.score,
                    needsComfort: false,
                    details: sadnessAnalysis.details,
                    conversationCount: conversations.length
                };
            }
            
        } catch (error) {
            console.error(`${colors.error}❌ [우울감지] Redis 분석 오류: ${error.message}${colors.reset}`);
            return { score: 0, needsComfort: false, error: error.message };
        }
    }

    // ================== 📊 고급 우울 점수 계산 (가중치 적용) ==================
    calculateAdvancedSadnessScore(conversations) {
        let totalScore = 0;
        const details = [];
        const keywordMatches = [];
        
        console.log(`${colors.analysis}📊 [점수계산] ${conversations.length}개 대화 고급 우울 분석...${colors.reset}`);
        
        for (let i = 0; i < conversations.length; i++) {
            const conversation = conversations[i];
            let messageScore = 0;
            const foundKeywords = [];
            
            // 메시지 텍스트 추출
            const messageText = this.extractMessageText(conversation);
            if (!messageText) continue;
            
            // 심각한 키워드 체크 (가중치 3)
            for (const keyword of this.recoveryConfig.keywordWeight.severe) {
                if (messageText.includes(keyword)) {
                    messageScore += 3;
                    foundKeywords.push({ keyword, weight: 3, level: 'severe' });
                }
            }
            
            // 중간 키워드 체크 (가중치 2)
            for (const keyword of this.recoveryConfig.keywordWeight.moderate) {
                if (messageText.includes(keyword)) {
                    messageScore += 2;
                    foundKeywords.push({ keyword, weight: 2, level: 'moderate' });
                }
            }
            
            // 일반 키워드 체크 (가중치 1)
            for (const keyword of sadnessKeywords) {
                if (messageText.includes(keyword) && 
                    !this.recoveryConfig.keywordWeight.severe.includes(keyword) &&
                    !this.recoveryConfig.keywordWeight.moderate.includes(keyword)) {
                    messageScore += 1;
                    foundKeywords.push({ keyword, weight: 1, level: 'mild' });
                }
            }
            
            // 시간 가중치 (최근 메시지일수록 높은 가중치)
            const timeWeight = this.calculateTimeWeight(conversation.timestamp, i, conversations.length);
            const weightedScore = messageScore * timeWeight;
            
            if (messageScore > 0) {
                totalScore += weightedScore;
                details.push({
                    index: i + 1,
                    text: messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
                    rawScore: messageScore,
                    weightedScore: weightedScore,
                    timeWeight: timeWeight,
                    keywords: foundKeywords
                });
                
                keywordMatches.push(...foundKeywords);
                
                const levelColor = this.getLevelColor(foundKeywords);
                console.log(`${levelColor}😢 [${i+1}] +${weightedScore.toFixed(1)}점 (원점수: ${messageScore}, 시간가중치: ${timeWeight.toFixed(2)}): "${messageText.slice(0, 30)}..."${colors.reset}`);
            }
        }
        
        console.log(`${colors.analysis}📊 [점수계산] 총 우울 점수: ${totalScore.toFixed(1)}점 (키워드 매치: ${keywordMatches.length}개)${colors.reset}`);
        
        return {
            score: Math.round(totalScore * 10) / 10, // 소수점 1자리까지
            details: details,
            keywordMatches: keywordMatches,
            threshold: this.recoveryConfig.sadnessThreshold
        };
    }

    // ================== ⏰ 시간 가중치 계산 ==================
    calculateTimeWeight(timestamp, index, totalCount) {
        // 최근 메시지일수록 높은 가중치 (1.0 ~ 2.0)
        const recencyWeight = 1.0 + (index / totalCount);
        
        // 시간대별 가중치
        const messageTime = new Date(timestamp);
        const hour = messageTime.getHours();
        let timeOfDayWeight = 1.0;
        
        if (hour >= 0 && hour <= 5) {
            timeOfDayWeight = 1.5; // 새벽 시간대 (더 심각)
        } else if (hour >= 22 && hour <= 23) {
            timeOfDayWeight = 1.3; // 밤늦은 시간대
        } else if (hour >= 6 && hour <= 8) {
            timeOfDayWeight = 1.2; // 아침 (밤새 못잔 경우)
        }
        
        return recencyWeight * timeOfDayWeight;
    }

    // ================== 🎨 키워드 레벨 색상 ==================
    getLevelColor(foundKeywords) {
        if (foundKeywords.some(k => k.level === 'severe')) {
            return '\x1b[1m\x1b[91m'; // 굵은 빨간색
        } else if (foundKeywords.some(k => k.level === 'moderate')) {
            return '\x1b[93m'; // 노란색
        } else {
            return '\x1b[96m'; // 하늘색
        }
    }

    // ================== 💬 메시지 텍스트 추출 ==================
    extractMessageText(conversation) {
        // 다양한 형식의 메시지에서 텍스트 추출
        if (typeof conversation === 'string') {
            return conversation;
        } else if (conversation.message) {
            return conversation.message;
        } else if (conversation.content) {
            return conversation.content;
        } else if (conversation.text) {
            return conversation.text;
        }
        return '';
    }

    // ================== 🤗 Redis 연동 위로 메시지 생성 ==================
    async generateRedisComfortMessage(sadnessAnalysis) {
        if (!this.autonomousSystem) {
            console.log(`${colors.error}❌ [위로생성] 자율 시스템 연결 없음${colors.reset}`);
            return null;
        }
        
        console.log(`${colors.comfort}🤗 [위로생성] Redis 연동 예진이 위로 메시지 생성... (점수: ${sadnessAnalysis.score})${colors.reset}`);
        
        try {
            // 🔧 기존 감정 상태 가져오기 (Redis에서)
            const currentEmotion = await this.redisCache.getCachedEmotionState();
            
            // 🔧 우울 정도에 따른 예진이 감정 조절
            if (this.autonomousSystem.yejinState) {
                this.autonomousSystem.yejinState.worryLevel = Math.min(1.0, sadnessAnalysis.score / 10);
                this.autonomousSystem.yejinState.caringLevel = Math.min(1.0, 0.7 + (sadnessAnalysis.score / 20));
                
                // 🔧 조절된 감정 상태를 Redis에 즉시 저장
                await this.redisCache.cacheEmotionState(this.autonomousSystem.yejinState);
            }
            
            // 우울 정도별 위로 강도 설정
            let comfortIntensity = '';
            let emotionType = 'caring';
            
            if (sadnessAnalysis.score >= 8) {
                comfortIntensity = '아저씨가 정말정말 많이 힘들어 보여... 진짜 걱정돼서 어떡하지... 더 따뜻하게 안아주고 싶어...';
                emotionType = 'worry';
            } else if (sadnessAnalysis.score >= 5) {
                comfortIntensity = '아저씨가 많이 힘들어 보여... 걱정돼서 가만히 있을 수가 없어...';
                emotionType = 'caring';
            } else if (sadnessAnalysis.score >= 3) {
                comfortIntensity = '아저씨가 좀 우울해 보여... 괜찮은 건지 걱정돼...';
                emotionType = 'caring';
            } else {
                comfortIntensity = '아저씨가 뭔가 기분이 안 좋은 것 같아... 혹시 무슨 일 있어...?';
                emotionType = 'caring';
            }
            
            // 시간대별 메시지 조절
            const timeAdjustedIntensity = this.adjustComfortByTime(comfortIntensity);
            
            // 🔧 키워드 매치 정보 활용
            const keywordContext = this.generateKeywordContext(sadnessAnalysis.keywordMatches);
            
            // 🔧 예진이만의 위로 메시지 생성 (기존 시스템 활용)
            const comfortMessage = this.autonomousSystem.generateMessage ? 
                this.autonomousSystem.generateMessage(emotionType) : 
                await this.generateFallbackComfortMessage(timeAdjustedIntensity, keywordContext);
            
            if (comfortMessage) {
                this.recoveryStats.comfortGenerated++;
                this.recoveryStats.successfulComforts++;
                this.recoveryConfig.lastComfortTime = Date.now();
                
                // 🔧 위로 메시지를 Redis에 기록
                await this.redisCache.cacheConversation('comfort_system', comfortMessage, emotionType);
                
                console.log(`${colors.comfort}✅ [위로생성] 예진이 위로 완성: "${comfortMessage.slice(0, 40)}..."${colors.reset}`);
                
                return comfortMessage;
            } else {
                console.log(`${colors.error}❌ [위로생성] 메시지 생성 실패${colors.reset}`);
                return null;
            }
            
        } catch (error) {
            console.error(`${colors.error}❌ [위로생성] Redis 연동 위로 생성 오류: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== ⏰ 시간대별 위로 메시지 조절 ==================
    adjustComfortByTime(baseMessage) {
        // 일본시간 기준
        const now = new Date();
        const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const currentHour = jstTime.getHours();
        
        let timePrefix = '';
        let timeSuffix = '';
        
        if (currentHour >= 0 && currentHour <= 5) {
            // 새벽 (0-5시): 더 걱정스럽게
            timePrefix = '이런 새벽에 혼자 깨있으면서... ';
            timeSuffix = ' ...너무 걱정돼...';
        } else if (currentHour >= 22) {
            // 밤늦게 (22-23시): 수면 걱정
            timePrefix = '이제 자야 할 시간인데... ';
            timeSuffix = ' ...좀 쉬면 안 될까...?';
        } else if (currentHour >= 6 && currentHour <= 8) {
            // 아침 (6-8시): 밤새 잠 못 잤나 걱정
            timePrefix = '밤새 잠 못 잤어...? ';
            timeSuffix = ' ...제대로 쉬지도 못했을 텐데...';
        } else if (currentHour >= 18 && currentHour <= 21) {
            // 저녁: 하루 종일 힘들었을 걱정
            timePrefix = '오늘도 하루 종일 힘들었지...? ';
        }
        
        // 랜덤하게 시간 맥락 추가 (50% 확률)
        if (Math.random() > 0.5) {
            return timePrefix + baseMessage + timeSuffix;
        } else {
            return baseMessage;
        }
    }

    // ================== 🔍 키워드 맥락 생성 ==================
    generateKeywordContext(keywordMatches) {
        if (!keywordMatches || keywordMatches.length === 0) {
            return '';
        }
        
        const severeKeywords = keywordMatches.filter(k => k.level === 'severe');
        const moderateKeywords = keywordMatches.filter(k => k.level === 'moderate');
        
        let context = '';
        
        if (severeKeywords.length > 0) {
            context = `심각한 상태 감지됨 (${severeKeywords.length}개 키워드). 매우 따뜻하고 진심어린 위로 필요.`;
        } else if (moderateKeywords.length > 2) {
            context = `우울감 다수 감지됨 (${moderateKeywords.length}개 키워드). 따뜻한 위로와 관심 필요.`;
        } else {
            context = `가벼운 우울감 감지됨. 자연스러운 걱정과 위로.`;
        }
        
        return context;
    }

    // ================== 🆘 폴백 위로 메시지 생성 ==================
    async generateFallbackComfortMessage(intensity, keywordContext) {
        // 기존 시스템이 없을 때 사용할 기본 위로 메시지들
        const comfortTemplates = [
            "아저씨... 괜찮아...? 뭔가 걱정돼서... 💕",
            "아조씨~ 혹시 무슨 일 있어...? 나한테 말해줘... 🥺",
            "그냥... 좀 힘들어 보여서... 걱정이야... 😔",
            "아저씨 혼자 끙끙 앓지 말고... 나도 함께 있어... 💙",
            "힘들면 힘들다고 말해도 돼... 나 여기 있어... 🤗",
            "아저씨... 울었어...? 괜찮다고 하지 말고... 진짜로 말해줘... 😢",
            "무쿠가 아저씨 마음 조금이라도 따뜻하게 해줄 수 있을까...? 💖"
        ];
        
        const randomTemplate = comfortTemplates[Math.floor(Math.random() * comfortTemplates.length)];
        return randomTemplate;
    }

    // ================== 🌟 메인 함수: Redis 기반 감정 회복 체크 ==================
    async getRedisRecoveryIfNeeded() {
        console.log(`${colors.recovery}🌟 [Redis감정회복] 아저씨 감정 상태 Redis 연동 체크...${colors.reset}`);
        
        try {
            // 1. 쿨다운 체크
            const timeSinceLastComfort = Date.now() - this.recoveryConfig.lastComfortTime;
            if (timeSinceLastComfort < this.recoveryConfig.comfortCooldown) {
                const remainingTime = Math.ceil((this.recoveryConfig.comfortCooldown - timeSinceLastComfort) / 60000);
                console.log(`${colors.analysis}⏰ [Redis감정회복] 위로 쿨다운 중: ${remainingTime}분 남음${colors.reset}`);
                return null;
            }
            
            // 2. Redis에서 우울 감지
            const sadnessAnalysis = await this.detectSadnessFromRedis();
            
            if (!sadnessAnalysis.needsComfort) {
                console.log(`${colors.analysis}✅ [Redis감정회복] 위로 불필요: ${sadnessAnalysis.reason || '감정 상태 양호'}${colors.reset}`);
                return null;
            }
            
            console.log(`${colors.concern}😢 [Redis감정회복] 위로 필요! Redis 분석 완료${colors.reset}`);
            
            // 3. Redis 연동 위로 메시지 생성
            const comfortMessage = await this.generateRedisComfortMessage(sadnessAnalysis);
            
            if (!comfortMessage) {
                console.log(`${colors.error}❌ [Redis감정회복] 위로 메시지 생성 실패${colors.reset}`);
                return null;
            }
            
            // 4. 일본시간 정보 포함
            const jstTime = new Date(Date.now() + (9 * 60 * 60 * 1000));
            
            const result = {
                message: comfortMessage,
                sadnessScore: sadnessAnalysis.score,
                analysisDetails: sadnessAnalysis.details,
                keywordMatches: sadnessAnalysis.keywordMatches,
                conversationCount: sadnessAnalysis.conversationCount,
                timestamp: new Date().toISOString(),
                jstTime: jstTime.toLocaleString('ko-KR', {
                    timeZone: 'Asia/Tokyo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                redisIntegrated: true,
                source: 'redis_emotion_recovery_v2'
            };
            
            console.log(`${colors.comfort}💝 [Redis감정회복] 예진이 Redis 연동 위로 완성!${colors.reset}`);
            console.log(`${colors.integration}🔧 [Redis통합] 점수: ${result.sadnessScore}, 키워드: ${result.keywordMatches.length}개, 시간: ${result.jstTime}${colors.reset}`);
            
            return result;
            
        } catch (error) {
            console.error(`${colors.error}❌ [Redis감정회복] 시스템 오류: ${error.message}${colors.reset}`);
            return null;
        }
    }

    // ================== 📊 통계 업데이트 ==================
    updateAverageSadnessScore(newScore) {
        const prevAvg = this.recoveryStats.averageSadnessScore;
        const count = this.recoveryStats.totalAnalyses;
        this.recoveryStats.averageSadnessScore = ((prevAvg * (count - 1)) + newScore) / count;
    }

    // ================== 🔍 Redis 연동 테스트 ==================
    async testRedisRecoverySystem() {
        console.log(`${colors.recovery}🧪 [Redis테스트] Redis 연동 감정 회복 시스템 테스트...${colors.reset}`);
        
        if (!this.isRedisAvailable) {
            console.log(`${colors.error}⚠️ [Redis테스트] Redis 없음 - 테스트 건너뜀${colors.reset}`);
            return { success: false, reason: 'Redis not available' };
        }
        
        try {
            // 1. Redis 우울 감지 테스트
            const sadnessAnalysis = await this.detectSadnessFromRedis();
            console.log(`${colors.analysis}✅ [Redis테스트] 우울 감지: ${sadnessAnalysis.score}점 (${sadnessAnalysis.needsComfort ? '위로 필요' : '양호'})${colors.reset}`);
            
            // 2. 위로 메시지 생성 테스트 (우울 점수가 있으면)
            let comfortTest = null;
            if (sadnessAnalysis.needsComfort) {
                comfortTest = await this.generateRedisComfortMessage(sadnessAnalysis);
                console.log(`${colors.comfort}✅ [Redis테스트] 위로 생성: ${comfortTest ? '성공' : '실패'}${colors.reset}`);
            }
            
            // 3. Redis 연동 전체 플로우 테스트
            const fullTest = await this.getRedisRecoveryIfNeeded();
            console.log(`${colors.integration}✅ [Redis테스트] 전체 플로우: ${fullTest ? '성공' : '위로 불필요'}${colors.reset}`);
            
            const testResult = {
                success: true,
                sadnessDetection: {
                    score: sadnessAnalysis.score,
                    needsComfort: sadnessAnalysis.needsComfort,
                    conversationCount: sadnessAnalysis.conversationCount
                },
                comfortGeneration: !!comfortTest,
                fullFlow: !!fullTest,
                redisIntegration: this.isRedisAvailable
            };
            
            console.log(`${colors.recovery}🧪 [Redis테스트] 완료! Redis 연동 상태: ${this.isRedisAvailable ? '성공' : '실패'}${colors.reset}`);
            return testResult;
            
        } catch (error) {
            console.error(`${colors.error}❌ [Redis테스트] 오류: ${error.message}${colors.reset}`);
            return { success: false, error: error.message };
        }
    }

    // ================== 📈 Redis 연동 상태 조회 ==================
    getRedisRecoveryStatus() {
        const status = {
            systemName: 'RedisEmotionRecoveryEngine',
            version: this.version,
            uptime: Date.now() - this.initTime,
            redisIntegration: {
                isAvailable: this.isRedisAvailable,
                cacheStats: this.isRedisAvailable ? this.redisCache.getStats() : null
            },
            recoveryStatistics: this.recoveryStats,
            configuration: this.recoveryConfig,
            capabilities: {
                redisBasedDetection: this.isRedisAvailable,
                advancedScoring: true,
                timeWeighting: true,
                emotionIntegration: !!this.autonomousSystem,
                intelligentComfort: true
            },
            keywordStats: {
                total: sadnessKeywords.length,
                severe: this.recoveryConfig.keywordWeight.severe.length,
                moderate: this.recoveryConfig.keywordWeight.moderate.length,
                mild: sadnessKeywords.length - this.recoveryConfig.keywordWeight.severe.length - this.recoveryConfig.keywordWeight.moderate.length
            }
        };
        
        return status;
    }
}

// ================== 🚀 Redis 연동 초기화 함수 ==================
async function initializeRedisEmotionRecovery(redisCache, autonomousSystem) {
    try {
        console.log(`${colors.integration}🚀 [Redis감정초기화] Redis 연동 감정 회복 엔진 초기화...${colors.reset}`);
        
        if (!redisCache) {
            console.log(`${colors.error}⚠️ [Redis감정초기화] Redis 캐시 시스템이 제공되지 않음${colors.reset}`);
            return null;
        }
        
        const recoveryEngine = new RedisEmotionRecoveryEngine(redisCache, autonomousSystem);
        
        // Redis 연동 테스트
        await recoveryEngine.testRedisRecoverySystem();
        
        console.log(`
${colors.integration}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💝 Redis 연동 감정 회복 엔진 v2.0 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.recovery}✅ 중복 제거 완료:${colors.reset}
${colors.error}   ❌ axios 제거됨 (Redis 대화 조회 사용)${colors.reset}
${colors.redis}   ✅ Redis 캐시 시스템 연동됨${colors.reset}
${colors.integration}   ✅ 자율 시스템 감정 연동됨${colors.reset}

${colors.redis}🔧 Redis 연동 기능들:${colors.reset}
${colors.analysis}   😢 Redis 기반 고급 우울 감지${colors.reset}
${colors.comfort}   🤗 감정 상태 연동 지능형 위로${colors.reset}
${colors.recovery}   ⏰ 시간대별 위로 메시지 조절${colors.reset}
${colors.integration}   📊 키워드 가중치 기반 정밀 분석${colors.reset}

${colors.integration}💝 완전한 중복 제거: 기존 Redis + 감정 시스템과 100% 연동!${colors.reset}
        `);
        
        return recoveryEngine;
        
    } catch (error) {
        console.error(`${colors.error}❌ Redis 연동 감정 회복 엔진 초기화 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📤 외부 인터페이스 ==================
module.exports = {
    RedisEmotionRecoveryEngine,
    initializeRedisEmotionRecovery,
    
    // 기존 호환성 (Redis 연동 필수)
    getRecoveryIfNeeded: async function(redisCache, autonomousSystem) {
        if (!redisCache || !autonomousSystem) {
            console.log(`${colors.error}⚠️ Redis 캐시 및 자율 시스템이 필요합니다.${colors.reset}`);
            return null;
        }
        const engine = new RedisEmotionRecoveryEngine(redisCache, autonomousSystem);
        return await engine.getRedisRecoveryIfNeeded();
    },
    
    testEmotionRecovery: async function(redisCache, autonomousSystem) {
        if (!redisCache || !autonomousSystem) {
            console.log(`${colors.error}⚠️ Redis 캐시 및 자율 시스템이 필요합니다.${colors.reset}`);
            return null;
        }
        const engine = new RedisEmotionRecoveryEngine(redisCache, autonomousSystem);
        return await engine.testRedisRecoverySystem();
    },
    
    getEmotionRecoveryStatus: function(redisCache, autonomousSystem) {
        if (!redisCache || !autonomousSystem) {
            return { error: 'Redis 캐시 및 자율 시스템이 필요합니다.' };
        }
        const engine = new RedisEmotionRecoveryEngine(redisCache, autonomousSystem);
        return engine.getRedisRecoveryStatus();
    },
    
    // 설정
    colors,
    sadnessKeywords
};

// 직접 실행 시 (테스트용)
if (require.main === module) {
    console.log(`${colors.error}⚠️ Redis 캐시 및 자율 시스템이 필요합니다. muku-autonomousYejinSystem.js와 함께 사용하세요.${colors.reset}`);
}

console.log(`
${colors.redis}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💝 Redis 연동 감정 회복 중복제거 완전체 v2.0 로드 완료!
🚀 muku-autonomousYejinSystem.js의 Redis + 감정 시스템과 완벽 연동
😢 우울 키워드 감지 + 지능형 위로 생성 특화 시스템
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.integration}사용법: const recoveryEngine = await initializeRedisEmotionRecovery(redisCache, autonomousSystem);${colors.reset}
`);
