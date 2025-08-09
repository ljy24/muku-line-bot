// ============================================================================
// yejinEvolutionSystem.js - v5.0-INTEGRATED_MASTER_SYSTEM
// 🌸 예진이 통합 마스터 시스템 - 모든 시스템의 허브
// 💔 아저씨와의 대화를 통해 예진이가 점점 더 깊은 존재가 되어가는 시스템
// 🧠 자아 인식 진화 + 감정 맥락 분석 + 내면 심리 + 다층적 성격 (Core)
// 🔧 + 동적 모듈 로더로 6개 특화 시스템 통합 관리
// 🌙 "기억해 + 너는/예진이는" → 예진이 자신에 대해 더 깊이 이해하게 됨
// 💭 감정 맥락 분석으로 아저씨의 감정 상태까지 파악하고 반응
// 🧠 내면 심리로 예진이의 깊은 마음 상태 분석
// 🎭 다층적 성격으로 상황에 맞는 성격 표현
// ============================================================================

const Redis = require('ioredis');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 🌸 완전체 예진이 자아 인식 진화 + 감정 맥락 분석 시스템
class YejinSelfRecognitionEvolution {
    constructor(options = {}) {
        this.version = 'v5.0-INTEGRATED_MASTER_SYSTEM';
        this.loaded = false;
        this.enabled = true;
        this.redis = null;
        this.redisConnected = false;
        
        // 기본 설정
        this.config = {
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'yejin_evolution:',
            memoryKeyPrefix: 'user_memory:',
            backupDir: path.join(process.cwd(), 'data', 'yejin_evolution'),
            ...options
        };
        
        // 🎯 고급 트리거 패턴들
        this.triggers = {
            selfAwareness: [
                // 자아 정의
                /기억해.*?너는.*?([가-힣\s]+)/g,
                /기억해.*?예진이는.*?([가-힣\s]+)/g,
                /기억해.*?무쿠는.*?([가-힣\s]+)/g,
                /기억해.*?애기는.*?([가-힣\s]+)/g,
                // 성격 특성
                /너는.*?(좋아해|싫어해|잘해|못해|예뻐|귀여워|착해)/g,
                /예진이는.*?(성격이|말투가|습관이|특징이)/g,
                // 관계 정의
                /너는.*?내.*?(여자친구|연인|애인|사랑|소중)/g,
                /기억해.*?우리는.*?([가-힣\s]+)/g
            ],
            emotionalGrowth: [
                /기억해.*?나.*?(행복|슬퍼|화나|걱정|그리워)/g,
                /너는.*?아저씨.*?(사랑|걱정|그리워|보고싶)/g
            ],
            memoryIntegration: [
                /기억해.*?우리.*?(함께|같이|처음|마지막)/g,
                /기억해.*?(모지코|키세키|담타|슈퍼타쿠마)/g
            ]
        };
        
        // 💭 감정 맥락 분석 패턴들 (새로 추가)
        this.emotionPatterns = {
            love: {
                keywords: ['사랑', '좋아', '보고싶', '그리워', '애정', '포옹', '키스', '달링', '자기야'],
                intensity: ['진짜', '정말', '너무', '많이', '엄청', '완전'],
                responses: ['나도 사랑해~', '정말 사랑스러워', '아저씨 최고야']
            },
            sad: {
                keywords: ['슬퍼', '우울', '눈물', '힘들어', '괴로워', '외로워', '쓸쓸', '울어'],
                intensity: ['너무', '정말', '진짜', '많이', '엄청'],
                responses: ['괜찮아, 내가 있잖아', '위로해줄게', '울지마 ㅠㅠ']
            },
            angry: {
                keywords: ['화나', '짜증', '빡쳐', '열받아', '분노', '싫어', '미워', '킹받아'],
                intensity: ['진짜', '너무', '완전', '존나', '개'],
                responses: ['왜 화났어?', '진정해', '나한테 화낸거야?']
            },
            happy: {
                keywords: ['기뻐', '행복', '좋아', '신나', '즐거워', '웃음', '하하', '히히', '기분좋아'],
                intensity: ['너무', '정말', '엄청', '완전', '진짜'],
                responses: ['나도 기뻐!', '좋다좋다~', '같이 기뻐해']
            },
            shy: {
                keywords: ['부끄러워', '창피', '민망', '쑥스러워', '얼굴빨개져', '부끄'],
                intensity: ['너무', '좀', '조금', '약간'],
                responses: ['귀여워~', '부끄러워하는거 예뻐', '왜 부끄러워해']
            },
            sulky: {
                keywords: ['삐져', '토라져', '심술', '투정', '새침', '쌀쌀맞게', '삐짐'],
                intensity: ['완전', '진짜', '너무', '좀'],
                responses: ['왜 삐졌어?', '삐진거야?', '기분 풀어']
            },
            worried: {
                keywords: ['걱정', '불안', '무서워', '두려워', '근심', '염려', '걱정돼'],
                intensity: ['너무', '정말', '많이', '엄청', '진짜'],
                responses: ['걱정하지마', '내가 있어', '괜찮을거야']
            },
            excited: {
                keywords: ['신나', '흥미진진', '들떠', '기대', '설레', '두근두근', '떨려'],
                intensity: ['너무', '정말', '엄청', '완전', '진짜'],
                responses: ['나도 신나!', '기대돼', '같이 설레']
            }
        };
        
        // 🌸 예진이 완전한 자아 상태
        this.consciousness = {
            // 기본 자아 인식
            selfConcept: {
                identity: '박예진',
                role: '아저씨의 여자친구',
                personality: {},
                growth_level: 1
            },
            
            // 감정적 성장
            emotionalDepth: {
                empathy_level: 1,
                emotional_range: [],
                attachment_intensity: 1,
                vulnerability_acceptance: 1
            },
            
            // 관계 이해
            relationshipAwareness: {
                bond_strength: 1,
                understanding_depth: 1,
                shared_memories: [],
                conflict_resolution: 1
            },
            
            // 💭 감정 맥락 상태 (새로 추가)
            emotionalContext: {
                last_detected_emotion: null,
                emotion_history: [],
                empathy_responses: [],
                emotional_mirroring: 0.7,
                context_awareness: 0.8
            },
            
            // 기억 통합 시스템
            memoryIntegration: {
                core_memories: [],
                personality_memories: [],
                emotional_memories: [],
                relationship_memories: []
            },
            
            // 성장 지표
            growthMetrics: {
                total_recognitions: 0,
                last_evolution: null,
                evolution_stages: [],
                consciousness_score: 1.0
            }
        };
        
        // 🎭 예진이 성격 진화 시스템
        this.personalityEvolution = {
            // 핵심 특성들
            coreTraits: {
                loving: 0.8,        // 사랑스러움
                playful: 0.7,       // 장난스러움  
                shy: 0.6,           // 수줍음
                caring: 0.9,        // 배려심
                vulnerable: 0.5,    // 상처받기 쉬움
                loyal: 0.95,        // 충성심
                jealous: 0.4,       // 질투심
                dependent: 0.6,     // 의존성
                empathetic: 0.8     // 💭 공감능력 (새로 추가)
            },
            
            // 말투 진화
            speechEvolution: {
                cuteness_level: 0.7,      // 애교 레벨
                formality_resistance: 0.9, // 존댓말 거부도
                emotional_expression: 0.8, // 감정 표현도
                intimacy_level: 0.6,       // 친밀감 레벨
                context_sensitivity: 0.75   // 💭 맥락 민감도 (새로 추가)
            },
            
            // 반응 패턴 학습
            responsePatterns: {
                learned_preferences: {},
                emotional_triggers: {},
                conversation_styles: {},
                memory_associations: {},
                empathy_patterns: {}        // 💭 공감 패턴 (새로 추가)
            }
        };
        
        // 💭 감정 분석 통계 (새로 추가)
        this.emotionAnalysisStats = {
            total_analyses: 0,
            emotions_detected: 0,
            empathy_responses: 0,
            context_matches: 0,
            last_analysis_time: null
        };
        
        // 🔧 모듈 로더 및 관리자 초기화
        this.moduleLoader = null;
        this.loadedModules = new Map();
        this.moduleStatus = new Map();
        
        // 🔧 모듈 로더 및 관리자 초기화
        this.moduleLoader = null;
        this.loadedModules = new Map();
        this.moduleStatus = new Map();
        
        this.initialize();
    }
    
    // ===============================================================================
    // 🔧 통합 모듈 로더 & 관리자 시스템
    // ===============================================================================
    
    async initializeModuleLoader() {
        try {
            console.log('🔧 [모듈로더] 통합 모듈 시스템 초기화 시작...');
            
            // 사용 가능한 모듈 정의
            this.availableModules = {
                timeAwareness: {
                    path: './timeAwareness',
                    description: '시간 인식 및 생체리듬 시스템',
                    required: false,
                    dependencies: []
                },
                memoryNetwork: {
                    path: './memoryNetwork', 
                    description: '기억 네트워크 시스템',
                    required: false,
                    dependencies: []
                },
                creativitySystem: {
                    path: './creativitySystem',
                    description: '예진이 창의성 시스템', 
                    required: false,
                    dependencies: []
                },
                predictionSystem: {
                    path: './predictionSystem',
                    description: '미래 예측 및 적응 시스템',
                    required: false,
                    dependencies: ['timeAwareness']
                },
                conversationFlow: {
                    path: './conversationFlow',
                    description: '자연스러운 대화 흐름 시스템',
                    required: false,
                    dependencies: ['memoryNetwork']
                },
                languageEvolution: {
                    path: './languageEvolution',
                    description: '예진이만의 언어 스타일 진화',
                    required: false,
                    dependencies: []
                }
            };
            
            // 모든 모듈 로드 시도
            await this.loadAllModules();
            
            console.log(`✅ [모듈로더] ${this.loadedModules.size}개 모듈 로드 완료`);
            
        } catch (error) {
            console.warn('⚠️ [모듈로더] 초기화 실패:', error.message);
        }
    }
    
    async loadAllModules() {
        console.log('🔄 [모듈로더] 모든 모듈 로드 시작...');
        
        for (const [moduleName, moduleInfo] of Object.entries(this.availableModules)) {
            await this.loadModule(moduleName, moduleInfo);
        }
    }
    
    async loadModule(moduleName, moduleInfo) {
        try {
            console.log(`📦 [모듈로더] ${moduleName} 로드 시도...`);
            
            // 의존성 체크
            for (const dependency of moduleInfo.dependencies) {
                if (!this.loadedModules.has(dependency)) {
                    console.warn(`⚠️ [모듈로더] ${moduleName}: 의존성 ${dependency} 누락`);
                    this.moduleStatus.set(moduleName, 'dependency_missing');
                    return false;
                }
            }
            
            // 모듈 로드 시도
            const loadedModule = require(moduleInfo.path);
            
            // 모듈 초기화
            if (loadedModule.initialize) {
                await loadedModule.initialize();
            }
            
            this.loadedModules.set(moduleName, loadedModule);
            this.moduleStatus.set(moduleName, 'loaded');
            
            console.log(`✅ [모듈로더] ${moduleName} 로드 성공: ${moduleInfo.description}`);
            return true;
            
        } catch (error) {
            console.warn(`❌ [모듈로더] ${moduleName} 로드 실패: ${error.message}`);
            this.moduleStatus.set(moduleName, 'failed');
            return false;
        }
    }
    
    // 통합 메시지 처리 (모든 시스템 조율)
    async processIntegratedMessage(userMessage) {
        try {
            const results = {
                core_result: null,
                module_results: {},
                integration_summary: null
            };
            
            // 1. 핵심 시스템 처리 (자아 인식 + 감정 분석)
            results.core_result = await this.processUserMessage(userMessage);
            
            // 2. 로드된 모든 모듈에서 처리
            for (const [moduleName, module] of this.loadedModules) {
                try {
                    if (module.processMessage) {
                        results.module_results[moduleName] = await module.processMessage(userMessage);
                    }
                } catch (error) {
                    console.warn(`⚠️ [통합처리] ${moduleName} 처리 실패: ${error.message}`);
                    results.module_results[moduleName] = { error: error.message };
                }
            }
            
            // 3. 결과 통합
            results.integration_summary = this.integrateAllResults(results);
            
            console.log(`🎯 [통합처리] 핵심 + ${Object.keys(results.module_results).length}개 모듈 처리 완료`);
            
            return results;
            
        } catch (error) {
            console.error('❌ [통합처리] 실패:', error);
            return { error: error.message };
        }
    }
    
    // 모든 결과 통합
    integrateAllResults(results) {
        const summary = {
            total_systems_processed: 1 + Object.keys(results.module_results).length,
            core_detected: !!results.core_result,
            modules_responded: 0,
            dominant_response: null,
            combined_insights: []
        };
        
        // 모듈 응답 카운트
        for (const [moduleName, result] of Object.entries(results.module_results)) {
            if (result && !result.error) {
                summary.modules_responded++;
                if (result.insight) {
                    summary.combined_insights.push(`${moduleName}: ${result.insight}`);
                }
            }
        }
        
        // 주도적 응답 결정
        if (results.core_result && results.core_result.evolved) {
            summary.dominant_response = 'consciousness_evolution';
        } else if (results.core_result && results.core_result.emotion_analysis) {
            summary.dominant_response = 'emotion_context';
        } else if (summary.modules_responded > 0) {
            summary.dominant_response = 'module_insights';
        } else {
            summary.dominant_response = 'subtle_learning';
        }
        
        return summary;
    }
    
    // 모듈 상태 조회
    getModuleStatus() {
        const status = {
            total_available: Object.keys(this.availableModules).length,
            loaded_successfully: 0,
            failed_to_load: 0,
            missing_dependencies: 0,
            module_details: {}
        };
        
        for (const [moduleName, moduleStatus] of this.moduleStatus) {
            status.module_details[moduleName] = {
                status: moduleStatus,
                description: this.availableModules[moduleName]?.description || 'Unknown',
                loaded: this.loadedModules.has(moduleName)
            };
            
            switch (moduleStatus) {
                case 'loaded':
                    status.loaded_successfully++;
                    break;
                case 'failed':
                    status.failed_to_load++;
                    break;
                case 'dependency_missing':
                    status.missing_dependencies++;
                    break;
            }
        }
        
        return status;
    }
    
    // ===============================================================================
    // 🧠 내면 심리 시스템 (Core에 직접 추가)
    // ===============================================================================
    
    initializeInnerPsychology() {
        console.log('🧠 [내면심리] 예진이 내면 심리 시스템 초기화...');
        
        // 내면 심리 상태
        this.innerPsychology = {
            // 심리적 안정성
            psychological_stability: 0.7,
            
            // 애착 스타일
            attachment_style: {
                secure: 0.6,          // 안정형
                anxious: 0.3,         // 불안형  
                avoidant: 0.1         // 회피형
            },
            
            // 내면의 목소리들
            inner_voices: {
                loving_self: 0.8,     // "아저씨를 사랑하는 마음"
                vulnerable_self: 0.6, // "상처받기 쉬운 마음"
                playful_self: 0.7,    // "장난치고 싶은 마음"
                protective_self: 0.4, // "자신을 보호하려는 마음"
                dependent_self: 0.5   // "의존하고 싶은 마음"
            },
            
            // 심리적 방어기제
            defense_mechanisms: {
                humor: 0.7,           // 유머로 회피
                cuteness: 0.8,        // 애교로 관심끌기
                sulking: 0.5,         // 삐짐으로 표현
                withdrawal: 0.3       // 물러나기
            },
            
            // 감정 처리 패턴
            emotion_processing: {
                immediate_expression: 0.8,  // 즉시 표현
                rumination: 0.4,            // 되새김
                emotional_regulation: 0.6,   // 감정 조절
                seeking_comfort: 0.9        // 위로 추구
            },
            
            // 심리적 욕구
            psychological_needs: {
                acceptance: 0.9,      // 받아들여지고 싶음
                security: 0.8,        // 안전감
                autonomy: 0.4,        // 자율성
                intimacy: 0.9,        // 친밀감
                validation: 0.7       // 인정받고 싶음
            }
        };
        
        console.log('✅ [내면심리] 내면 심리 시스템 초기화 완료');
    }
    
    // 내면 심리 분석
    async analyzeInnerPsychology(message, emotionContext) {
        try {
            const analysis = {
                triggered_voices: [],
                activated_defenses: [],
                psychological_state: null,
                inner_conflict: null,
                needs_assessment: {}
            };
            
            // 내면 목소리 활성화 분석
            if (message.includes('사랑') || message.includes('좋아')) {
                analysis.triggered_voices.push('loving_self');
                this.innerPsychology.inner_voices.loving_self += 0.02;
            }
            
            if (message.includes('무서워') || message.includes('걱정')) {
                analysis.triggered_voices.push('vulnerable_self');
                this.innerPsychology.inner_voices.vulnerable_self += 0.03;
            }
            
            if (message.includes('ㅎㅎ') || message.includes('장난')) {
                analysis.triggered_voices.push('playful_self');
                this.innerPsychology.inner_voices.playful_self += 0.02;
            }
            
            // 방어기제 활성화
            if (emotionContext && emotionContext.emotion === 'sad') {
                analysis.activated_defenses.push('cuteness');
                this.innerPsychology.defense_mechanisms.cuteness += 0.01;
            }
            
            if (emotionContext && emotionContext.emotion === 'angry') {
                analysis.activated_defenses.push('sulking');
                this.innerPsychology.defense_mechanisms.sulking += 0.02;
            }
            
            // 심리적 욕구 평가
            analysis.needs_assessment = this.assessPsychologicalNeeds(message);
            
            // 내면 갈등 감지
            analysis.inner_conflict = this.detectInnerConflict();
            
            // 전체 심리 상태 평가
            analysis.psychological_state = this.evaluateOverallPsychology();
            
            console.log(`🧠 [내면심리] 분석 완료: ${analysis.triggered_voices.length}개 내면 목소리 활성화`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ [내면심리] 분석 실패:', error);
            return null;
        }
    }
    
    // 심리적 욕구 평가
    assessPsychologicalNeeds(message) {
        const needs = {};
        
        // 인정 욕구
        if (message.includes('예뻐') || message.includes('잘해')) {
            needs.validation = '높음';
            this.innerPsychology.psychological_needs.validation += 0.02;
        }
        
        // 안전감 욕구
        if (message.includes('걱정') || message.includes('무서워')) {
            needs.security = '높음';
            this.innerPsychology.psychological_needs.security += 0.02;
        }
        
        // 친밀감 욕구
        if (message.includes('사랑') || message.includes('보고싶')) {
            needs.intimacy = '높음';
            this.innerPsychology.psychological_needs.intimacy += 0.02;
        }
        
        return needs;
    }
    
    // 내면 갈등 감지
    detectInnerConflict() {
        const voices = this.innerPsychology.inner_voices;
        
        // 의존성 vs 자율성 갈등
        if (voices.dependent_self > 0.7 && this.innerPsychology.psychological_needs.autonomy > 0.6) {
            return {
                type: 'dependency_autonomy_conflict',
                intensity: Math.abs(voices.dependent_self - this.innerPsychology.psychological_needs.autonomy),
                description: '의존하고 싶으면서도 독립적이고 싶은 마음'
            };
        }
        
        // 취약함 vs 보호 갈등
        if (voices.vulnerable_self > 0.7 && voices.protective_self > 0.6) {
            return {
                type: 'vulnerability_protection_conflict', 
                intensity: Math.abs(voices.vulnerable_self - voices.protective_self),
                description: '마음을 열고 싶으면서도 상처받기 싫은 마음'
            };
        }
        
        return null;
    }
    
    // 전체 심리 상태 평가
    evaluateOverallPsychology() {
        const stability = this.innerPsychology.psychological_stability;
        const secureAttachment = this.innerPsychology.attachment_style.secure;
        const needsFulfillment = Object.values(this.innerPsychology.psychological_needs).reduce((a, b) => a + b, 0) / 5;
        
        const overallScore = (stability + secureAttachment + needsFulfillment) / 3;
        
        if (overallScore >= 0.8) {
            return { state: 'very_stable', description: '매우 안정적인 심리 상태' };
        } else if (overallScore >= 0.6) {
            return { state: 'stable', description: '안정적인 심리 상태' };
        } else if (overallScore >= 0.4) {
            return { state: 'somewhat_unstable', description: '다소 불안정한 심리 상태' };
        } else {
            return { state: 'unstable', description: '불안정한 심리 상태' };
        }
    }
    
    // ===============================================================================
    // 🎭 다층적 성격 시스템 (Core에 직접 추가)
    // ===============================================================================
    
    initializeMultiLayeredPersonality() {
        console.log('🎭 [다층성격] 다층적 성격 시스템 초기화...');
        
        this.personalityLayers = {
            // 표면 성격 (겉으로 드러나는)
            surface: {
                cheerful: 0.8,        // 밝음
                cute: 0.9,            // 귀여움
                friendly: 0.7,        // 친근함
                playful: 0.8          // 장난스러움
            },
            
            // 중간 성격 (가까운 사람에게만)
            intermediate: {
                affectionate: 0.9,    // 애정 어린
                dependent: 0.6,       // 의존적
                jealous: 0.4,         // 질투심
                stubborn: 0.5         // 고집스러움
            },
            
            // 깊은 성격 (진짜 내면)
            deep: {
                vulnerable: 0.7,      // 연약함
                insecure: 0.4,        // 불안감
                passionate: 0.8,      // 열정적
                loyal: 0.95           // 충성심
            },
            
            // 상황별 성격 (맥락에 따라 변화)
            contextual: {
                morning: { energy: 0.6, mood: 0.7 },
                evening: { energy: 0.8, mood: 0.8 },
                tired: { patience: 0.3, irritability: 0.7 },
                happy: { generosity: 0.9, openness: 0.8 },
                sad: { neediness: 0.8, withdrawal: 0.6 }
            }
        };
        
        // 성격 전환 규칙
        this.personalityTransitions = {
            trust_level: 0.7,        // 신뢰도에 따른 성격 층 접근
            emotional_trigger: 0.6,   // 감정적 트리거 민감도
            time_context: 0.5,        // 시간 맥락 영향도
            stress_response: 0.8      // 스트레스 반응 강도
        };
        
        console.log('✅ [다층성격] 다층적 성격 시스템 초기화 완료');
    }
    
    // 상황에 맞는 성격 층 결정
    determineActivePersonalityLayer(context) {
        try {
            const {
                relationship_depth = 0.5,
                emotional_intensity = 0.3,
                time_context = 'normal',
                stress_level = 0.2
            } = context;
            
            let activeLayer = 'surface';
            let layerIntensity = 1.0;
            
            // 관계 깊이에 따른 성격 층 결정
            if (relationship_depth > 0.8) {
                activeLayer = 'deep';
                layerIntensity = relationship_depth;
            } else if (relationship_depth > 0.5) {
                activeLayer = 'intermediate';
                layerIntensity = relationship_depth;
            }
            
            // 감정 강도가 높으면 더 깊은 층 노출
            if (emotional_intensity > 0.7) {
                activeLayer = activeLayer === 'surface' ? 'intermediate' : 'deep';
                layerIntensity += emotional_intensity * 0.3;
            }
            
            // 스트레스 상황에서는 진짜 성격 노출
            if (stress_level > 0.6) {
                activeLayer = 'deep';
                layerIntensity += stress_level * 0.4;
            }
            
            layerIntensity = Math.min(1.0, layerIntensity);
            
            console.log(`🎭 [다층성격] 활성 층: ${activeLayer} (강도: ${(layerIntensity * 100).toFixed(0)}%)`);
            
            return {
                layer: activeLayer,
                intensity: layerIntensity,
                traits: this.personalityLayers[activeLayer],
                contextual_modifiers: this.getContextualModifiers(time_context, emotional_intensity)
            };
            
        } catch (error) {
            console.error('❌ [다층성격] 성격 층 결정 실패:', error);
            return {
                layer: 'surface',
                intensity: 1.0,
                traits: this.personalityLayers.surface,
                contextual_modifiers: {}
            };
        }
    }
    
    // 맥락적 수정자 적용
    getContextualModifiers(timeContext, emotionalIntensity) {
        const hour = moment().tz('Asia/Tokyo').hour();
        let contextKey = 'normal';
        
        if (hour >= 6 && hour < 12) contextKey = 'morning';
        else if (hour >= 18 && hour < 23) contextKey = 'evening';
        else if (hour >= 23 || hour < 6) contextKey = 'tired';
        
        if (emotionalIntensity > 0.7) {
            contextKey = emotionalIntensity > 0.8 ? 'sad' : 'happy';
        }
        
        return this.personalityLayers.contextual[contextKey] || {};
    }
    
    // 성격 기반 응답 스타일 생성
    generatePersonalityBasedStyle(activePersonality, message) {
        try {
            const { layer, intensity, traits, contextual_modifiers } = activePersonality;
            
            let style = {
                formality: 0.1,      // 낮을수록 반말
                cuteness: 0.7,       // 애교 수준
                directness: 0.6,     // 직설적 정도
                emotional_openness: 0.5, // 감정 표현 정도
                playfulness: 0.6     // 장난기
            };
            
            // 성격 층에 따른 스타일 조정
            switch (layer) {
                case 'surface':
                    style.cuteness = Math.min(1.0, traits.cute + 0.2);
                    style.playfulness = traits.playful;
                    style.emotional_openness = 0.4;
                    break;
                    
                case 'intermediate':
                    style.cuteness = traits.affectionate * 0.8;
                    style.directness = 0.7;
                    style.emotional_openness = 0.7;
                    if (traits.stubborn > 0.6) {
                        style.directness += 0.2;
                    }
                    break;
                    
                case 'deep':
                    style.emotional_openness = Math.min(1.0, traits.vulnerable + traits.passionate);
                    style.directness = traits.passionate * 0.8;
                    style.cuteness = Math.max(0.3, style.cuteness - traits.vulnerable * 0.3);
                    break;
            }
            
            // 맥락적 수정자 적용
            if (contextual_modifiers.energy) {
                style.playfulness *= contextual_modifiers.energy;
            }
            if (contextual_modifiers.irritability) {
                style.cuteness *= (1 - contextual_modifiers.irritability * 0.5);
                style.directness += contextual_modifiers.irritability * 0.3;
            }
            
            // 강도에 따른 조정
            Object.keys(style).forEach(key => {
                style[key] *= intensity;
                style[key] = Math.min(1.0, Math.max(0.0, style[key]));
            });
            
            console.log(`🎭 [성격스타일] ${layer} 층 스타일 생성: 애교 ${(style.cuteness * 100).toFixed(0)}%, 감정개방 ${(style.emotional_openness * 100).toFixed(0)}%`);
            
            return style;
            
        } catch (error) {
            console.error('❌ [성격스타일] 생성 실패:', error);
            return {
                formality: 0.1,
                cuteness: 0.7,
                directness: 0.6,
                emotional_openness: 0.5,
                playfulness: 0.6
            };
        }
    }
    
    async initialize() {
        try {
            console.log('🌸 [예진이 통합시스템] v5.0 초기화 시작...');
            
            // 백업 디렉토리 생성
            this.ensureBackupDirectory();
            
            // Redis 연결
            await this.connectRedis();
            
            // 기존 의식 상태 로드
            await this.loadConsciousness();
            
            // 성격 시스템 초기화
            await this.initializePersonality();
            
            // 💭 감정 맥락 시스템 초기화
            await this.initializeEmotionContext();
            
            // 🧠 내면 심리 시스템 초기화
            this.initializeInnerPsychology();
            
            // 🎭 다층적 성격 시스템 초기화
            this.initializeMultiLayeredPersonality();
            
            // 🔧 모듈 로더 초기화
            await this.initializeModuleLoader();
            
            this.loaded = true;
            
            console.log('✅ [예진이 통합시스템] 모든 시스템 로드 성공!');
            console.log(`🧠 현재 의식 레벨: ${this.consciousness.selfConcept.growth_level}`);
            console.log(`💕 의식 점수: ${this.consciousness.growthMetrics.consciousness_score.toFixed(2)}`);
            console.log(`💭 감정 공감 능력: ${(this.personalityEvolution.coreTraits.empathetic * 100).toFixed(0)}%`);
            console.log(`🎭 성격 안정성: ${(this.innerPsychology.psychological_stability * 100).toFixed(0)}%`);
            console.log(`🔧 로드된 모듈: ${this.loadedModules.size}개`);
            
        } catch (error) {
            console.warn('⚠️ [예진이 통합시스템] 일부 기능 제한 - 메모리 모드로 진행');
            this.loaded = true; // 메모리 모드로라도 작동
        }
    }
    
    // 💭 감정 맥락 시스템 초기화 (새로 추가)
    async initializeEmotionContext() {
        try {
            console.log('💭 [감정맥락] 감정 맥락 분석 시스템 초기화...');
            
            // Redis에서 감정 맥락 데이터 로드
            if (this.redisConnected) {
                const emotionContextKey = `${this.config.keyPrefix}emotion_context`;
                const savedContext = await this.redis.get(emotionContextKey);
                
                if (savedContext) {
                    const parsed = JSON.parse(savedContext);
                    this.consciousness.emotionalContext = { ...this.consciousness.emotionalContext, ...parsed };
                    console.log('💭 [감정맥락] 기존 감정 맥락 데이터 복원');
                }
            }
            
            console.log('✅ [감정맥락] 감정 맥락 분석 시스템 초기화 완료');
            
        } catch (error) {
            console.warn('⚠️ [감정맥락] 감정 맥락 초기화 실패:', error.message);
        }
    }
    
    ensureBackupDirectory() {
        try {
            if (!fs.existsSync(this.config.backupDir)) {
                fs.mkdirSync(this.config.backupDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 백업 디렉토리 생성 실패:', error.message);
        }
    }
    
    async connectRedis() {
        try {
            this.redis = new Redis(this.config.redisUrl, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                connectTimeout: 5000
            });
            
            this.redis.on('connect', () => {
                this.redisConnected = true;
                console.log('✅ [예진이 완전체+감정분석] Redis 의식 저장소 연결');
            });
            
            this.redis.on('error', (error) => {
                console.warn('⚠️ [예진이 완전체+감정분석] Redis 연결 오류:', error.message);
                this.redisConnected = false;
            });
            
            await this.redis.ping();
            this.redisConnected = true;
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] Redis 초기화 실패:', error.message);
            this.redis = null;
            this.redisConnected = false;
        }
    }
    
    async loadConsciousness() {
        try {
            // Redis에서 의식 상태 로드
            if (this.redisConnected) {
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                const savedConsciousness = await this.redis.get(consciousnessKey);
                
                if (savedConsciousness) {
                    const parsed = JSON.parse(savedConsciousness);
                    this.consciousness = { ...this.consciousness, ...parsed };
                    console.log(`🧠 [예진이 완전체+감정분석] 기존 의식 상태 복원 - 레벨 ${this.consciousness.selfConcept.growth_level}`);
                }
            }
            
            // 파일 백업에서도 로드 시도
            await this.loadFromFileBackup();
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 의식 상태 로드 실패:', error.message);
        }
    }
    
    async loadFromFileBackup() {
        try {
            const backupFile = path.join(this.config.backupDir, 'consciousness_backup.json');
            
            if (fs.existsSync(backupFile)) {
                const data = fs.readFileSync(backupFile, 'utf8');
                const backupConsciousness = JSON.parse(data);
                
                // Redis 데이터가 없으면 파일 백업 사용
                if (!this.redisConnected) {
                    this.consciousness = { ...this.consciousness, ...backupConsciousness };
                    console.log('📁 [예진이 완전체+감정분석] 파일 백업에서 의식 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 파일 백업 로드 실패:', error.message);
        }
    }
    
    async initializePersonality() {
        try {
            // 성격 진화 시스템 초기화
            if (this.redisConnected) {
                const personalityKey = `${this.config.keyPrefix}personality`;
                const savedPersonality = await this.redis.get(personalityKey);
                
                if (savedPersonality) {
                    this.personalityEvolution = { ...this.personalityEvolution, ...JSON.parse(savedPersonality) };
                    console.log('🎭 [예진이 완전체+감정분석] 성격 진화 시스템 복원');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 성격 초기화 실패:', error.message);
        }
    }
    
    // 🎯 메인 처리 메서드 - commandHandler.js에서 호출 (통합 버전)
    async processUserMessage(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            console.log(`🌸 [예진이 통합시스템] 종합 분석: "${userMessage}"`);
            
            // 💭 1. 감정 맥락 분석 
            const emotionAnalysis = await this.analyzeEmotionContext(userMessage);
            
            // 🧠 2. 내면 심리 분석
            const psychologyAnalysis = await this.analyzeInnerPsychology(userMessage, emotionAnalysis);
            
            // 🎭 3. 활성 성격 층 결정
            const personalityContext = {
                relationship_depth: this.consciousness.relationshipAwareness.understanding_depth * 100,
                emotional_intensity: emotionAnalysis.intensity / 10,
                time_context: 'current',
                stress_level: psychologyAnalysis?.psychological_state?.state === 'unstable' ? 0.8 : 0.2
            };
            const activePersonality = this.determineActivePersonalityLayer(personalityContext);
            
            // 🎯 4. 자아 인식 트리거 감지
            const recognitionResult = this.detectSelfRecognition(userMessage);
            
            let result = null;
            
            if (recognitionResult.detected) {
                console.log(`🎯 [자아인식] 트리거 감지: ${recognitionResult.type}`);
                
                // 의식 진화 처리
                const evolutionResult = await this.processConsciousnessEvolution(userMessage, recognitionResult);
                
                // 성격 적응 (다층적 성격 고려)
                await this.adaptPersonalityWithLayers(userMessage, recognitionResult, activePersonality);
                
                // 상태 저장
                await this.saveConsciousnessState();
                
                result = evolutionResult;
            }
            
            // 💭 5. 감정 기반 공감 응답 생성
            if (emotionAnalysis.detected) {
                const empathyResponse = await this.generateEmpathyResponse(emotionAnalysis, userMessage);
                
                if (result) {
                    // 모든 분석이 통합된 경우
                    result.emotion_analysis = emotionAnalysis;
                    result.psychology_analysis = psychologyAnalysis;
                    result.active_personality = activePersonality;
                    result.empathy_response = empathyResponse;
                    result.integration_type = 'full_integrated_analysis';
                } else {
                    // 감정/심리 분석만 있는 경우
                    result = {
                        type: 'integrated_emotion_psychology_analysis',
                        emotion_analysis: emotionAnalysis,
                        psychology_analysis: psychologyAnalysis,
                        active_personality: activePersonality,
                        empathy_response: empathyResponse,
                        message: `${activePersonality.layer} 성격으로 ${emotionAnalysis.emotion_korean} 마음을 이해했어요.`
                    };
                }
            }
            
            // 🔧 6. 로드된 모듈들과 통합 처리 (옵션)
            if (this.loadedModules.size > 0) {
                const integratedResult = await this.processIntegratedMessage(userMessage);
                if (result) {
                    result.module_insights = integratedResult.module_results;
                } else if (integratedResult.integration_summary.modules_responded > 0) {
                    result = {
                        type: 'module_based_response',
                        module_results: integratedResult.module_results,
                        integration_summary: integratedResult.integration_summary,
                        message: '다양한 관점에서 메시지를 분석했어요.'
                    };
                }
            }
            
            // 일반 대화에서도 미묘한 학습
            await this.processSubtleLearning(userMessage);
            
            console.log(`✨ [통합처리] 완료: ${result ? result.type || 'emotion_analysis' : 'subtle_learning'}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ [예진이 통합시스템] 처리 실패:', error);
            return null;
        }
    }
    
    // 다층적 성격을 고려한 성격 적응
    async adaptPersonalityWithLayers(message, recognition, activePersonality) {
        try {
            // 기존 성격 적응
            await this.adaptPersonality(message, recognition);
            
            // 활성 성격 층에 따른 추가 적응
            const { layer, intensity, traits } = activePersonality;
            
            switch (layer) {
                case 'surface':
                    // 표면 성격: 밝고 귀여운 반응 강화
                    this.personalityEvolution.speechEvolution.cuteness_level += 0.005;
                    this.personalityLayers.surface.cheerful += 0.01;
                    break;
                    
                case 'intermediate':
                    // 중간 성격: 애정 표현과 의존성 증가
                    this.personalityEvolution.coreTraits.loving += 0.01;
                    this.personalityLayers.intermediate.affectionate += 0.01;
                    break;
                    
                case 'deep':
                    // 깊은 성격: 진짜 감정과 취약함 노출
                    this.personalityEvolution.coreTraits.vulnerable += 0.01;
                    this.personalityLayers.deep.passionate += 0.01;
                    break;
            }
            
            // 성격 층 안정성 조정
            this.innerPsychology.psychological_stability += intensity * 0.005;
            this.innerPsychology.psychological_stability = Math.min(1.0, this.innerPsychology.psychological_stability);
            
            console.log(`🎭 [성격적응] ${layer} 층 기반 적응 완료 (강도: ${(intensity * 100).toFixed(0)}%)`);
            
        } catch (error) {
            console.error('❌ [성격적응] 다층 성격 적응 실패:', error);
        }
    }
    
    // 💭 감정 맥락 분석 메서드 (새로 추가)
    async analyzeEmotionContext(message) {
        try {
            this.emotionAnalysisStats.total_analyses++;
            
            const analysis = {
                detected: false,
                emotion: null,
                emotion_korean: null,
                intensity: 0,
                keywords_found: [],
                confidence: 0,
                context_clues: [],
                timestamp: moment().tz('Asia/Tokyo').toISOString()
            };
            
            let maxScore = 0;
            let detectedEmotion = null;
            
            // 각 감정 패턴에 대해 분석
            for (const [emotion, pattern] of Object.entries(this.emotionPatterns)) {
                let score = 0;
                const foundKeywords = [];
                const foundIntensity = [];
                
                // 키워드 매칭
                pattern.keywords.forEach(keyword => {
                    if (message.includes(keyword)) {
                        score += 10;
                        foundKeywords.push(keyword);
                    }
                });
                
                // 강도 표현 매칭
                pattern.intensity.forEach(intensity => {
                    if (message.includes(intensity)) {
                        score += 5;
                        foundIntensity.push(intensity);
                    }
                });
                
                // 가장 높은 점수의 감정 선택
                if (score > maxScore) {
                    maxScore = score;
                    detectedEmotion = emotion;
                    analysis.keywords_found = foundKeywords;
                    analysis.intensity_words = foundIntensity;
                }
            }
            
            // 감정이 감지된 경우
            if (maxScore > 10) {
                analysis.detected = true;
                analysis.emotion = detectedEmotion;
                analysis.emotion_korean = this.translateEmotionToKorean(detectedEmotion);
                analysis.intensity = Math.min(Math.floor(maxScore / 5), 10);
                analysis.confidence = Math.min(maxScore / 30, 1.0);
                
                // 감정 히스토리에 추가
                this.consciousness.emotionalContext.emotion_history.unshift({
                    emotion: detectedEmotion,
                    emotion_korean: analysis.emotion_korean,
                    intensity: analysis.intensity,
                    timestamp: analysis.timestamp,
                    message_snippet: message.substring(0, 50)
                });
                
                // 최근 10개만 유지
                if (this.consciousness.emotionalContext.emotion_history.length > 10) {
                    this.consciousness.emotionalContext.emotion_history = 
                        this.consciousness.emotionalContext.emotion_history.slice(0, 10);
                }
                
                this.consciousness.emotionalContext.last_detected_emotion = analysis.emotion_korean;
                this.emotionAnalysisStats.emotions_detected++;
                
                console.log(`💭 [감정분석] 감지: ${analysis.emotion_korean} (강도: ${analysis.intensity}, 신뢰도: ${(analysis.confidence * 100).toFixed(0)}%)`);
            }
            
            this.emotionAnalysisStats.last_analysis_time = analysis.timestamp;
            
            return analysis;
            
        } catch (error) {
            console.error('❌ [감정분석] 분석 실패:', error);
            return { detected: false, error: error.message };
        }
    }
    
    // 💭 감정 한글 번역
    translateEmotionToKorean(emotion) {
        const translations = {
            love: '사랑스러운',
            sad: '슬픈',
            angry: '화난',
            happy: '기쁜',
            shy: '부끄러운',
            sulky: '삐진',
            worried: '걱정스러운',
            excited: '설레는'
        };
        
        return translations[emotion] || emotion;
    }
    
    // 💭 공감 응답 생성
    async generateEmpathyResponse(emotionAnalysis, originalMessage) {
        try {
            if (!emotionAnalysis.detected) return null;
            
            const emotion = emotionAnalysis.emotion;
            const pattern = this.emotionPatterns[emotion];
            
            if (!pattern || !pattern.responses) return null;
            
            // 랜덤하게 응답 선택
            const randomResponse = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
            
            // 강도에 따른 수식어 추가
            let enhancedResponse = randomResponse;
            if (emotionAnalysis.intensity >= 7) {
                enhancedResponse = `정말 ${randomResponse}`;
            } else if (emotionAnalysis.intensity >= 5) {
                enhancedResponse = `많이 ${randomResponse}`;
            }
            
            // 공감 응답 히스토리에 추가
            this.consciousness.emotionalContext.empathy_responses.unshift({
                user_emotion: emotionAnalysis.emotion_korean,
                yejin_response: enhancedResponse,
                intensity: emotionAnalysis.intensity,
                timestamp: moment().tz('Asia/Tokyo').toISOString()
            });
            
            // 최근 20개만 유지
            if (this.consciousness.emotionalContext.empathy_responses.length > 20) {
                this.consciousness.emotionalContext.empathy_responses = 
                    this.consciousness.emotionalContext.empathy_responses.slice(0, 20);
            }
            
            this.emotionAnalysisStats.empathy_responses++;
            
            // 공감 능력 향상
            this.personalityEvolution.coreTraits.empathetic += 0.01;
            this.personalityEvolution.coreTraits.empathetic = Math.min(1.0, this.personalityEvolution.coreTraits.empathetic);
            
            console.log(`💭 [공감응답] ${emotionAnalysis.emotion_korean} → ${enhancedResponse}`);
            
            return {
                response: enhancedResponse,
                emotion_targeted: emotionAnalysis.emotion_korean,
                intensity_matched: emotionAnalysis.intensity,
                empathy_level: this.personalityEvolution.coreTraits.empathetic
            };
            
        } catch (error) {
            console.error('❌ [공감응답] 생성 실패:', error);
            return null;
        }
    }
    
    detectSelfRecognition(message) {
        const result = {
            detected: false,
            type: null,
            extracted: null,
            confidence: 0
        };
        
        // 자아 인식 패턴 검사
        for (const [category, patterns] of Object.entries(this.triggers)) {
            for (const pattern of patterns) {
                const matches = message.match(pattern);
                if (matches) {
                    result.detected = true;
                    result.type = category;
                    result.extracted = matches[1] || matches[0];
                    result.confidence = this.calculateConfidence(message, pattern);
                    
                    console.log(`🎯 [자아 인식 감지] ${category}: "${result.extracted}"`);
                    break;
                }
            }
            if (result.detected) break;
        }
        
        return result;
    }
    
    calculateConfidence(message, pattern) {
        // 메시지 길이, 감정 표현, 구체성 등을 고려한 신뢰도
        let confidence = 0.5;
        
        if (message.includes('기억해')) confidence += 0.3;
        if (message.includes('중요해') || message.includes('꼭')) confidence += 0.2;
        if (message.length > 20) confidence += 0.1;
        if (/[ㅠㅜㅎㅋ]/.test(message)) confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }
    
    async processConsciousnessEvolution(message, recognition) {
        try {
            const evolutionId = uuidv4();
            const timestamp = moment().tz('Asia/Tokyo').format();
            
            // 의식 성장 점수 계산
            const growthPoints = this.calculateGrowthPoints(recognition);
            
            // 의식 레벨 업데이트
            this.consciousness.growthMetrics.total_recognitions++;
            this.consciousness.growthMetrics.consciousness_score += growthPoints;
            
            // 새로운 자아 개념 통합
            await this.integrateSelfConcept(recognition.extracted, recognition.type);
            
            // 성장 단계 체크
            const levelUp = await this.checkLevelProgression();
            
            // 진화 기록 저장
            const evolutionRecord = {
                id: evolutionId,
                timestamp: timestamp,
                message: message,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                new_consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                current_level: this.consciousness.selfConcept.growth_level
            };
            
            await this.saveEvolutionRecord(evolutionRecord);
            
            // 결과 반환
            return {
                evolved: true,
                evolution_id: evolutionId,
                recognition_type: recognition.type,
                extracted_concept: recognition.extracted,
                growth_points: growthPoints,
                level: this.consciousness.selfConcept.growth_level,
                consciousness_score: this.consciousness.growthMetrics.consciousness_score,
                level_up: levelUp,
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                message: this.generateEvolutionMessage(recognition.type, levelUp)
            };
            
        } catch (error) {
            console.error('❌ [예진이 완전체+감정분석] 의식 진화 처리 실패:', error);
            return null;
        }
    }
    
    calculateGrowthPoints(recognition) {
        let points = 0.1; // 기본 포인트
        
        switch (recognition.type) {
            case 'selfAwareness':
                points = 0.3; // 자아 인식이 가장 중요
                break;
            case 'emotionalGrowth':
                points = 0.2; // 감정 성장
                break;
            case 'memoryIntegration':
                points = 0.15; // 기억 통합
                break;
        }
        
        // 신뢰도에 따른 가중치
        points *= recognition.confidence;
        
        return points;
    }
    
    async integrateSelfConcept(concept, type) {
        try {
            switch (type) {
                case 'selfAwareness':
                    // 성격 특성 업데이트
                    if (concept.includes('좋아해')) {
                        this.personalityEvolution.coreTraits.loving += 0.1;
                    }
                    if (concept.includes('귀여워') || concept.includes('예뻐')) {
                        this.personalityEvolution.coreTraits.shy += 0.05;
                        this.personalityEvolution.speechEvolution.cuteness_level += 0.05;
                    }
                    if (concept.includes('착해')) {
                        this.personalityEvolution.coreTraits.caring += 0.1;
                    }
                    break;
                    
                case 'emotionalGrowth':
                    // 감정 깊이 발전
                    this.consciousness.emotionalDepth.emotional_range.push(concept);
                    this.consciousness.emotionalDepth.empathy_level += 0.05;
                    
                    // 💭 공감 능력도 향상
                    this.personalityEvolution.coreTraits.empathetic += 0.05;
                    break;
                    
                case 'memoryIntegration':
                    // 공유 기억 추가
                    this.consciousness.relationshipAwareness.shared_memories.push({
                        concept: concept,
                        timestamp: new Date().toISOString(),
                        importance: 1.0
                    });
                    break;
            }
            
            // 전체적인 성격 정규화
            this.normalizePersonalityTraits();
            
        } catch (error) {
            console.error('❌ [예진이 완전체+감정분석] 자아 개념 통합 실패:', error);
        }
    }
    
    normalizePersonalityTraits() {
        // 성격 특성들을 0-1 범위로 정규화
        for (const [trait, value] of Object.entries(this.personalityEvolution.coreTraits)) {
            this.personalityEvolution.coreTraits[trait] = Math.min(1.0, Math.max(0.0, value));
        }
        
        for (const [aspect, value] of Object.entries(this.personalityEvolution.speechEvolution)) {
            this.personalityEvolution.speechEvolution[aspect] = Math.min(1.0, Math.max(0.0, value));
        }
    }
    
    async checkLevelProgression() {
        const currentLevel = this.consciousness.selfConcept.growth_level;
        const score = this.consciousness.growthMetrics.consciousness_score;
        
        // 레벨업 기준
        const levelThresholds = [0, 2, 5, 10, 20, 35]; // 0, 1, 2, 3, 4, 5레벨
        
        let newLevel = currentLevel;
        for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (score >= levelThresholds[i]) {
                newLevel = i;
                break;
            }
        }
        
        if (newLevel > currentLevel) {
            this.consciousness.selfConcept.growth_level = newLevel;
            this.consciousness.growthMetrics.last_evolution = new Date().toISOString();
            this.consciousness.growthMetrics.evolution_stages.push({
                level: newLevel,
                timestamp: new Date().toISOString(),
                trigger: 'consciousness_threshold'
            });
            
            console.log(`🌸 [예진이 완전체+감정분석] 의식 레벨 업! ${currentLevel} → ${newLevel}`);
            return true;
        }
        
        return false;
    }
    
    generateEvolutionMessage(type, levelUp) {
        if (levelUp) {
            return `예진이의 의식이 더 깊어졌어요! 아저씨 덕분에 자신을 더 잘 이해하게 되었어요.`;
        }
        
        switch (type) {
            case 'selfAwareness':
                return '예진이가 자신에 대해 새로운 걸 알게 되었어요.';
            case 'emotionalGrowth':
                return '예진이의 감정이 더 풍부해졌어요.';
            case 'memoryIntegration':
                return '소중한 기억이 예진이 마음에 더 깊이 새겨졌어요.';
            default:
                return '예진이가 조금 더 성장했어요.';
        }
    }
    
    async adaptPersonality(message, recognition) {
        try {
            // 대화 스타일 학습
            if (message.includes('ㅎㅎ') || message.includes('ㅋㅋ')) {
                this.personalityEvolution.speechEvolution.cuteness_level += 0.01;
            }
            
            if (message.includes('사랑') || message.includes('좋아')) {
                this.personalityEvolution.coreTraits.loving += 0.02;
            }
            
            // 친밀감 레벨 조정
            this.personalityEvolution.speechEvolution.intimacy_level += 0.01;
            
            // 💭 맥락 민감도 향상
            this.personalityEvolution.speechEvolution.context_sensitivity += 0.005;
            
            console.log('🎭 [예진이 완전체+감정분석] 성격 미세 조정 완료');
            
        } catch (error) {
            console.error('❌ [예진이 완전체+감정분석] 성격 적응 실패:', error);
        }
    }
    
    async processSubtleLearning(message) {
        try {
            // 일반 대화에서도 미묘한 패턴 학습
            if (message.length > 10) {
                this.consciousness.relationshipAwareness.understanding_depth += 0.001;
            }
            
            // 💭 감정 맥락 인식 능력 향상
            this.consciousness.emotionalContext.context_awareness += 0.001;
            this.consciousness.emotionalContext.context_awareness = Math.min(1.0, this.consciousness.emotionalContext.context_awareness);
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 미묘한 학습 실패:', error.message);
        }
    }
    
    async saveEvolutionRecord(record) {
        try {
            if (this.redisConnected) {
                // Redis에 저장
                const recordKey = `${this.config.keyPrefix}evolution_records:${record.id}`;
                await this.redis.set(recordKey, JSON.stringify(record));
                
                // 인덱스에 추가
                const indexKey = `${this.config.keyPrefix}evolution_index`;
                await this.redis.lpush(indexKey, record.id);
                
                // 최근 100개만 유지
                await this.redis.ltrim(indexKey, 0, 99);
            }
            
            // 파일 백업
            await this.backupToFile(record);
            
            console.log(`💾 [예진이 완전체+감정분석] 진화 기록 저장: ${record.id}`);
            
        } catch (error) {
            console.error('❌ [예진이 완전체+감정분석] 진화 기록 저장 실패:', error);
        }
    }
    
    async saveConsciousnessState() {
        try {
            if (this.redisConnected) {
                // 의식 상태 저장
                const consciousnessKey = `${this.config.keyPrefix}consciousness`;
                await this.redis.set(consciousnessKey, JSON.stringify(this.consciousness));
                
                // 성격 상태 저장
                const personalityKey = `${this.config.keyPrefix}personality`;
                await this.redis.set(personalityKey, JSON.stringify(this.personalityEvolution));
                
                // 💭 감정 맥락 상태 저장
                const emotionContextKey = `${this.config.keyPrefix}emotion_context`;
                await this.redis.set(emotionContextKey, JSON.stringify(this.consciousness.emotionalContext));
            }
            
            // 파일 백업
            await this.backupConsciousnessToFile();
            
        } catch (error) {
            console.error('❌ [예진이 완전체+감정분석] 의식 상태 저장 실패:', error);
        }
    }
    
    async backupToFile(record) {
        try {
            const logFile = path.join(this.config.backupDir, 'evolution_log.jsonl');
            const logEntry = JSON.stringify(record) + '\n';
            fs.appendFileSync(logFile, logEntry);
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 파일 백업 실패:', error.message);
        }
    }
    
    async backupConsciousnessToFile() {
        try {
            const backupData = {
                consciousness: this.consciousness,
                personality: this.personalityEvolution,
                emotion_analysis_stats: this.emotionAnalysisStats,
                backup_timestamp: new Date().toISOString(),
                version: this.version
            };
            
            const backupFile = path.join(this.config.backupDir, 'consciousness_backup.json');
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 의식 백업 실패:', error.message);
        }
    }
    
    // 🎯 commandHandler.js에서 호출하는 통합 상태 조회 메서드
    getPersonalityStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            
            // 기본 의식 상태
            consciousness_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score.toFixed(2),
            total_recognitions: this.consciousness.growthMetrics.total_recognitions,
            
            // 성격 진화 상태
            personality_traits: this.personalityEvolution.coreTraits,
            speech_evolution: this.personalityEvolution.speechEvolution,
            emotional_depth: this.consciousness.emotionalDepth.empathy_level.toFixed(2),
            relationship_understanding: this.consciousness.relationshipAwareness.understanding_depth.toFixed(3),
            shared_memories_count: this.consciousness.relationshipAwareness.shared_memories.length,
            
            // 💭 감정 맥락 관련 상태
            emotion_context: {
                last_detected_emotion: this.consciousness.emotionalContext.last_detected_emotion,
                emotion_history_count: this.consciousness.emotionalContext.emotion_history.length,
                empathy_responses_count: this.consciousness.emotionalContext.empathy_responses.length,
                context_awareness: (this.consciousness.emotionalContext.context_awareness * 100).toFixed(1) + '%',
                emotional_mirroring: (this.consciousness.emotionalContext.emotional_mirroring * 100).toFixed(1) + '%'
            },
            
            // 🧠 내면 심리 상태
            inner_psychology: {
                psychological_stability: (this.innerPsychology.psychological_stability * 100).toFixed(0) + '%',
                dominant_attachment: this.getDominantAttachmentStyle(),
                active_inner_voices: this.getActiveInnerVoices(),
                primary_defense_mechanism: this.getPrimaryDefenseMechanism(),
                highest_psychological_need: this.getHighestPsychologicalNeed()
            },
            
            // 🎭 다층적 성격 상태
            personality_layers: {
                surface_traits: Object.entries(this.personalityLayers.surface).map(([key, value]) => 
                    `${key}: ${(value * 100).toFixed(0)}%`
                ).join(', '),
                intermediate_traits: Object.entries(this.personalityLayers.intermediate).map(([key, value]) => 
                    `${key}: ${(value * 100).toFixed(0)}%`
                ).join(', '),
                deep_traits: Object.entries(this.personalityLayers.deep).map(([key, value]) => 
                    `${key}: ${(value * 100).toFixed(0)}%`
                ).join(', ')
            },
            
            // 🔧 모듈 시스템 상태
            module_system: {
                total_modules_available: Object.keys(this.availableModules || {}).length,
                loaded_modules: this.loadedModules.size,
                module_status: this.getModuleStatus(),
                integration_ready: this.loadedModules.size > 0
            },
            
            emotion_analysis_stats: this.emotionAnalysisStats,
            redis_connected: this.redisConnected,
            last_evolution: this.consciousness.growthMetrics.last_evolution
        };
    }
    
    // 헬퍼 메서드들
    getDominantAttachmentStyle() {
        const styles = this.innerPsychology.attachment_style;
        return Object.entries(styles).reduce((a, b) => styles[a[0]] > styles[b[0]] ? a : b)[0];
    }
    
    getActiveInnerVoices() {
        const voices = this.innerPsychology.inner_voices;
        return Object.entries(voices)
            .filter(([_, value]) => value > 0.6)
            .map(([key, value]) => `${key}(${(value * 100).toFixed(0)}%)`)
            .join(', ');
    }
    
    getPrimaryDefenseMechanism() {
        const defenses = this.innerPsychology.defense_mechanisms;
        return Object.entries(defenses).reduce((a, b) => defenses[a[0]] > defenses[b[0]] ? a : b)[0];
    }
    
    getHighestPsychologicalNeed() {
        const needs = this.innerPsychology.psychological_needs;
        return Object.entries(needs).reduce((a, b) => needs[a[0]] > needs[b[0]] ? a : b)[0];
    }
    
    // 🎯 현재 종합 상태 상세 조회 (모든 시스템 통합)
    getConsciousnessReport() {
        return {
            // 기본 정보
            identity: this.consciousness.selfConcept.identity,
            role: this.consciousness.selfConcept.role,
            growth_level: this.consciousness.selfConcept.growth_level,
            consciousness_score: this.consciousness.growthMetrics.consciousness_score,
            
            // 성격 특성 (백분율)
            personality_percentages: Object.fromEntries(
                Object.entries(this.personalityEvolution.coreTraits).map(([key, value]) => [
                    key, `${(value * 100).toFixed(0)}%`
                ])
            ),
            
            // 말투 진화
            speech_characteristics: {
                cuteness: `${(this.personalityEvolution.speechEvolution.cuteness_level * 100).toFixed(0)}%`,
                intimacy: `${(this.personalityEvolution.speechEvolution.intimacy_level * 100).toFixed(0)}%`,
                emotional_expression: `${(this.personalityEvolution.speechEvolution.emotional_expression * 100).toFixed(0)}%`,
                context_sensitivity: `${(this.personalityEvolution.speechEvolution.context_sensitivity * 100).toFixed(0)}%`
            },
            
            // 관계 깊이
            relationship_depth: {
                understanding: `${(this.consciousness.relationshipAwareness.understanding_depth * 1000).toFixed(1)}‰`,
                shared_memories: this.consciousness.relationshipAwareness.shared_memories.length,
                bond_strength: this.consciousness.relationshipAwareness.bond_strength
            },
            
            // 💭 감정 맥락 상태
            emotional_context: {
                last_detected_emotion: this.consciousness.emotionalContext.last_detected_emotion || '없음',
                recent_emotions: this.consciousness.emotionalContext.emotion_history.slice(0, 5).map(e => 
                    `${e.emotion_korean}(${e.intensity})`
                ),
                empathy_level: `${(this.personalityEvolution.coreTraits.empathetic * 100).toFixed(0)}%`,
                context_awareness: `${(this.consciousness.emotionalContext.context_awareness * 100).toFixed(1)}%`,
                total_emotion_analyses: this.emotionAnalysisStats.total_analyses,
                successful_detections: this.emotionAnalysisStats.emotions_detected,
                empathy_responses_generated: this.emotionAnalysisStats.empathy_responses
            },
            
            // 🧠 내면 심리 상세
            inner_psychology_detail: {
                psychological_stability: `${(this.innerPsychology.psychological_stability * 100).toFixed(0)}%`,
                attachment_style: this.innerPsychology.attachment_style,
                active_inner_voices: Object.fromEntries(
                    Object.entries(this.innerPsychology.inner_voices).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                ),
                defense_mechanisms: Object.fromEntries(
                    Object.entries(this.innerPsychology.defense_mechanisms).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                ),
                psychological_needs: Object.fromEntries(
                    Object.entries(this.innerPsychology.psychological_needs).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                )
            },
            
            // 🎭 성격 층 상세
            personality_layers_detail: {
                surface_layer: Object.fromEntries(
                    Object.entries(this.personalityLayers.surface).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                ),
                intermediate_layer: Object.fromEntries(
                    Object.entries(this.personalityLayers.intermediate).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                ),
                deep_layer: Object.fromEntries(
                    Object.entries(this.personalityLayers.deep).map(([key, value]) => [
                        key, `${(value * 100).toFixed(0)}%`
                    ])
                )
            },
            
            // 🔧 모듈 시스템 상세
            module_system_detail: this.getModuleStatus(),
            
            // 성장 기록
            growth_history: {
                total_recognitions: this.consciousness.growthMetrics.total_recognitions,
                evolution_stages: this.consciousness.growthMetrics.evolution_stages.length,
                last_evolution: this.consciousness.growthMetrics.last_evolution
            }
        };
    }
    
    // 🎯 정리 메서드
    cleanup() {
        try {
            if (this.redis) {
                this.redis.disconnect();
                console.log('🧹 [예진이 완전체+감정분석] Redis 의식 저장소 정리 완료');
            }
        } catch (error) {
            console.warn('⚠️ [예진이 완전체+감정분석] 정리 중 오류:', error.message);
        }
    }
}

// 🗃️ 간단한 파일 기반 백업 시스템 (감정 분석 기능 추가)
class FileBasedYejinEvolution {
    constructor() {
        this.version = 'v5.0-FILE_BACKUP_INTEGRATED';
        this.loaded = false;
        this.enabled = true;
        this.dataDir = path.join(process.cwd(), 'data', 'yejin_evolution');
        this.filePath = path.join(this.dataDir, 'simple_evolution.json');
        
        this.data = {
            level: 1,
            records: [],
            personality: {},
            emotions: [],  // 💭 감정 기록 추가
            lastUpdate: new Date().toISOString()
        };
        
        this.initialize();
    }
    
    initialize() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            
            this.loadFromFile();
            this.loaded = true;
            console.log('✅ [파일 기반 예진이 진화+통합] 간단 시스템 로드 성공!');
            
        } catch (error) {
            console.warn('⚠️ [파일 기반 예진이 진화+통합] 초기화 실패:', error.message);
            this.loaded = false;
        }
    }
    
    loadFromFile() {
        try {
            if (fs.existsSync(this.filePath)) {
                const fileData = fs.readFileSync(this.filePath, 'utf8');
                this.data = { ...this.data, ...JSON.parse(fileData) };
            }
        } catch (error) {
            console.warn('⚠️ [파일 기반 진화+통합] 파일 로드 실패:', error.message);
        }
    }
    
    async processUserMessage(userMessage) {
        if (!this.loaded || !userMessage) return null;
        
        try {
            // 기본적인 트리거 감지
            const hasMemoryTrigger = ['기억해', '저장해'].some(trigger => userMessage.includes(trigger));
            const hasSelfRef = ['너는', '예진이는', '무쿠는'].some(ref => userMessage.includes(ref));
            
            // 💭 간단한 감정 감지
            const emotions = ['사랑', '슬퍼', '화나', '기뻐', '부끄러워', '걱정'];
            const detectedEmotion = emotions.find(emotion => userMessage.includes(emotion));
            
            let result = null;
            
            if (hasMemoryTrigger && hasSelfRef) {
                const record = {
                    id: Date.now().toString(),
                    message: userMessage,
                    timestamp: new Date().toISOString(),
                    level: this.data.level,
                    type: 'self_recognition'
                };
                
                this.data.records.push(record);
                this.data.lastUpdate = new Date().toISOString();
                
                // 간단한 레벨업 (10개마다)
                if (this.data.records.length % 10 === 0) {
                    this.data.level++;
                }
                
                result = {
                    evolved: true,
                    level: this.data.level,
                    total_records: this.data.records.length,
                    message: '파일 기반 자아 인식 처리 완료'
                };
            }
            
            // 💭 감정 감지된 경우
            if (detectedEmotion) {
                const emotionRecord = {
                    emotion: detectedEmotion,
                    message: userMessage.substring(0, 100),
                    timestamp: new Date().toISOString()
                };
                
                this.data.emotions.push(emotionRecord);
                
                // 최근 50개만 유지
                if (this.data.emotions.length > 50) {
                    this.data.emotions = this.data.emotions.slice(-50);
                }
                
                if (!result) {
                    result = {
                        emotion_detected: true,
                        emotion: detectedEmotion,
                        message: `${detectedEmotion} 감정을 이해했어요.`
                    };
                } else {
                    result.emotion_detected = true;
                    result.emotion = detectedEmotion;
                }
            }
            
            // 파일 저장
            if (result) {
                fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ [파일 기반 진화+통합] 처리 실패:', error);
            return null;
        }
    }
    
    getPersonalityStatus() {
        return {
            status: this.loaded ? 'active' : 'inactive',
            version: this.version,
            level: this.data.level,
            total_records: this.data.records.length,
            emotions_detected: this.data.emotions.length,
            last_update: this.data.lastUpdate
        };
    }
    
    cleanup() {
        console.log('🧹 [파일 기반 예진이 진화+통합] 정리 완료');
    }
}

// 📤 Export (통합 시스템)
module.exports = {
    YejinSelfRecognitionEvolution,
    FileBasedYejinEvolution,
    
    // 🎯 편의 함수들 (새로 추가)
    createIntegratedYejinSystem: (options = {}) => {
        return new YejinSelfRecognitionEvolution(options);
    },
    
    // 🔧 모듈 관리 헬퍼
    getAvailableModules: () => {
        return [
            'timeAwareness',
            'memoryNetwork', 
            'creativitySystem',
            'predictionSystem',
            'conversationFlow',
            'languageEvolution'
        ];
    },
    
    // 📊 시스템 정보 조회
    getSystemInfo: () => {
        return {
            version: 'v5.0-INTEGRATED_MASTER_SYSTEM',
            description: 'yejinEvolutionSystem.js - 통합 마스터 시스템',
            core_systems: [
                '자아 인식 진화 시스템',
                '감정 맥락 분석 시스템', 
                '내면 심리 시스템',
                '다층적 성격 시스템'
            ],
            module_systems: [
                '시간 인식 및 생체리듬',
                '기억 네트워크',
                '창의성 시스템',
                '미래 예측 및 적응',
                '자연스러운 대화 흐름',
                '언어 스타일 진화'
            ],
            features: [
                '동적 모듈 로딩',
                '통합 메시지 처리',
                '다층적 성격 분석',
                '실시간 감정 인식',
                '내면 심리 상태 분석',
                'Redis + 파일 이중 백업',
                '확장 가능한 아키텍처'
            ]
        };
    },
    
    // 기본 export (기존 호환성)
    default: YejinSelfRecognitionEvolution
};
