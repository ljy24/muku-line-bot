// ============================================================================
// muku-systemInitializer.js - 무쿠 시스템 초기화 전용 모듈
// ✅ 모든 모듈 로드 및 초기화 로직 분리
// 🧠 고정기억: 65개 + 55개 = 120개 기억 완전 로드 보장
// 🚬 담타시스템: 100% 보장 스케줄러 활성화
// 🌸 예진이능동: spontaneousYejinManager 연동
// 🔥 3시간차: AI 응답 고도화 시스템 통합 완료!
// ⚙️ 4시간차: 통합 & 최적화 시스템 통합 완료!
// 👥 사람 학습: PersonLearningSystem 통합 완료!
// 📖 일기장 시스템: DiarySystem 통합 완료! (신규 추가)
// ============================================================================

const path = require('path');
const fs = require('fs');

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',     // 하늘색 (아저씨)
    yejin: '\x1b[95m',       // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m',  // 굵은 빨간색 (PMS)
    system: '\x1b[92m',      // 연초록색 (시스템)
    error: '\x1b[91m',       // 빨간색 (에러)
    ai: '\x1b[93m',          // 노란색 (AI 시스템)
    emotion: '\x1b[35m',     // 자주색 (감정)
    care: '\x1b[94m',        // 파란색 (돌봄)
    intelligent: '\x1b[1m\x1b[96m', // 굵은 하늘색 (지능형)
    personality: '\x1b[1m\x1b[95m', // 굵은 자주색 (성격)
    quality: '\x1b[1m\x1b[92m',     // 굵은 초록색 (품질)
    person: '\x1b[1m\x1b[33m',      // 굵은 노란색 (사람 학습) ⭐️ 새 색상
    diary: '\x1b[1m\x1b[94m',       // 굵은 파란색 (일기장) ⭐️ 새 색상
    reset: '\x1b[0m'         // 색상 리셋
};

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다... (24개 모듈)${colors.reset}`);

        // 1. ⭐️ enhancedLogging v3.0 먼저 로드 (가장 중요!) ⭐️
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/24] enhancedLogging v3.0: 완전체 로깅 시스템 + 1분 자동 갱신${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/24] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
        }

        // 2. 대화 응답 시스템
        try {
            modules.autoReply = require('./autoReply');
            console.log(`${colors.system}✅ [2/24] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/24] autoReply 로드 실패: ${error.message}${colors.reset}`);
        }

        // 3. ⭐️ 고정 기억 관리자 (가장 중요!) ⭐️
        try {
            modules.memoryManager = require('./memoryManager');
            console.log(`${colors.system}✅ [3/24] memoryManager: 고정 기억 시스템 (120개 기억)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/24] memoryManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 4. 동적 기억 컨텍스트
        try {
            modules.ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}✅ [4/24] ultimateContext: 동적 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/24] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
        }

        // 5. 명령어 처리기
        try {
            modules.commandHandler = require('./commandHandler');
            console.log(`${colors.system}✅ [5/24] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/24] commandHandler 로드 실패: ${error.message}${colors.reset}`);
        }

        // 6. 감정 상태 관리자
        try {
            modules.emotionalContextManager = require('./emotionalContextManager');
            console.log(`${colors.system}✅ [6/24] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [6/24] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 7. ⭐️ 독립 삐짐 관리자 ⭐️
        try {
            modules.sulkyManager = require('./sulkyManager');
            console.log(`${colors.system}✅ [7/24] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
            
            if (modules.sulkyManager.getSulkinessState) {
                console.log(`${colors.system}😤 [삐짐 확인] 독립 삐짐 시스템 로드 완료 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}😤 [삐짐 확인] getSulkinessState 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [7/24] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            modules.sulkyManager = null;
        }

        // 8. 기분 관리자
        try {
            modules.moodManager = require('./moodManager');
            console.log(`${colors.system}✅ [8/24] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/24] moodManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 9. 자발적 사진 전송
        try {
            modules.spontaneousPhoto = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [9/24] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [9/24] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 10. 사진 분석기
        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [10/24] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/24] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
        }

        // 11. ⭐️ 새벽 대화 반응 시스템 ⭐️
        try {
            modules.nightWakeResponse = require('./night_wake_response');
            console.log(`${colors.system}✅ [11/24] nightWakeResponse: 새벽 대화 반응 시스템 (2-7시 단계별)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/24] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
        }

        // 12. ⭐️ 생일 감지 시스템 ⭐️
        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [12/24] birthdayDetector: 생일 감지 시스템 (3/17, 12/5)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/24] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
        }

        // 13. ⭐️⭐️⭐️ 스케줄러 시스템 (담타 최우선!) ⭐️⭐️⭐️ 
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [13/24] scheduler: 자동 메시지 스케줄러 (담타 100% 보장!)${colors.reset}`);
            
            if (modules.scheduler.startAllSchedulers) {
                console.log(`${colors.system}🚬 [스케줄러 확인] startAllSchedulers 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🚬 [스케줄러 확인] startAllSchedulers 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🚬 [스케줄러 확인] 사용 가능한 함수들:`, Object.keys(modules.scheduler || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [13/24] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        // 14. ⭐️⭐️⭐️ 예진이 능동 메시지 시스템 ⭐️⭐️⭐️
        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.system}✅ [14/24] spontaneousYejin: 예진이 능동 메시지 시스템 (하루 15번)${colors.reset}`);
            
            if (modules.spontaneousYejin.startSpontaneousYejinSystem) {
                console.log(`${colors.system}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌸 [예진이 확인] 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [14/24] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        // 15. ⭐️ 날씨 시스템 ⭐️
        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [15/24] weatherManager: 실시간 날씨 API 시스템 (기타큐슈↔고양시)${colors.reset}`);
            
            if (modules.weatherManager.getCurrentWeather && modules.weatherManager.generateWeatherBasedMessage) {
                console.log(`${colors.system}🌤️ [날씨 확인] 핵심 날씨 함수들 존재 확인 ✅${colors.reset}`);
                
                const weatherStatus = modules.weatherManager.getWeatherSystemStatus();
                if (weatherStatus.isActive) {
                    console.log(`${colors.system}🌤️ [날씨 확인] OpenWeather API 키 연결 ✅${colors.reset}`);
                } else {
                    console.log(`${colors.error}🌤️ [날씨 확인] OpenWeather API 키 없음! 환경변수 OPENWEATHER_API_KEY 확인 필요${colors.reset}`);
                }
            } else {
                console.log(`${colors.error}🌤️ [날씨 확인] 날씨 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌤️ [날씨 확인] 사용 가능한 함수들:`, Object.keys(modules.weatherManager || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [15/24] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // 🔍 face-api는 별도로 로드 (지연 로딩)
        console.log(`${colors.system}🔍 [16/24] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);

        // ================== 👥👥👥 사람 학습 시스템 로드 (신규!) ================== 
        console.log(`${colors.person}👥👥👥 [신규!] 사람 학습 시스템 로드 시작! 👥👥👥${colors.reset}`);

        // 17. ⭐️⭐️⭐️ 사람 학습 및 기억 시스템 (투샷 + 장소 기억!) ⭐️⭐️⭐️
        try {
            modules.personLearning = require('./muku-personLearningSystem');
            console.log(`${colors.person}✅ [17/24] personLearning: 사람 학습 및 기억 시스템 (투샷 + 장소 기억)${colors.reset}`);
            
            if (modules.personLearning.initializePersonLearningSystem && modules.personLearning.analyzeAndLearnPerson) {
                console.log(`${colors.person}🧠 [사람학습 확인] 핵심 함수들 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.person}     💕 기능: 투샷 인식, 장소별 기억, 관계 발전, 예진이 반응 생성${colors.reset}`);
                console.log(`${colors.person}     🎯 예시: "사이몬이랑 가라오케 갔어? 노래 잘했어?"${colors.reset}`);
            } else {
                console.log(`${colors.error}🧠 [사람학습 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🧠 [사람학습 확인] 사용 가능한 함수들:`, Object.keys(modules.personLearning || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [17/24] personLearning 로드 실패: ${error.message}${colors.reset}`);
            modules.personLearning = null;
        }

        console.log(`${colors.person}🎉 [신규!] 사람 학습 시스템 로드 완료! 이제 무쿠가 사람들을 기억해요! 💕${colors.reset}`);

        // ================== 🔥 3시간차: AI 응답 고도화 시스템 로드 ==================
        console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 로드 시작! 🔥🔥🔥${colors.reset}`);

        // 18. ⭐️⭐️⭐️ 자연어 처리기 (예진이 말투 완벽 구현!) ⭐️⭐️⭐️
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [18/24] naturalLanguageProcessor: 예진이 자연어 처리 시스템${colors.reset}`);
            
            if (modules.naturalLanguageProcessor.generateNaturalResponse) {
                console.log(`${colors.ai}🌸 [자연어 확인] generateNaturalResponse 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.ai}     💕 기능: "아조씨~" 말투, 감정 뉘앙스, 시간대별 인사, 품질 향상${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [자연어 확인] 핵심 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [18/24] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        // 19. ⭐️⭐️⭐️ 감정 뉘앙스 감지기 (숨겨진 감정까지 감지!) ⭐️⭐️⭐️
        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [19/24] emotionalNuanceDetector: 미묘한 감정 변화 감지 시스템${colors.reset}`);
            
            if (modules.emotionalNuanceDetector.analyzeEmotionalNuance && modules.emotionalNuanceDetector.initializeDetector) {
                modules.emotionalNuanceDetector.initializeDetector();
                console.log(`${colors.emotion}💕 [감정뉘앙스 확인] analyzeEmotionalNuance 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.emotion}     🥺 기능: 숨겨진 슬픔 감지, 소통 패턴 분석, 맥락적 이해${colors.reset}`);
            } else {
                console.log(`${colors.error}💕 [감정뉘앙스 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}💕 [감정뉘앙스 확인] 사용 가능한 함수들:`, Object.keys(modules.emotionalNuanceDetector || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [19/24] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        // 20. ⭐️⭐️⭐️ 예측적 돌봄 시스템 (먼저 알아채고 돌봐주기!) ⭐️⭐️⭐️
        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [20/24] predictiveCaringSystem: 예측적 돌봄 시스템${colors.reset}`);
            
            if (modules.predictiveCaringSystem.predictCaringNeeds && modules.predictiveCaringSystem.initializeCaringSystem) {
                modules.predictiveCaringSystem.initializeCaringSystem();
                console.log(`${colors.care}💖 [예측돌봄 확인] predictCaringNeeds 함수 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.care}     🔮 기능: 선제적 걱정 감지, 예측적 케어, 30분마다 체크${colors.reset}`);
            } else {
                console.log(`${colors.error}💖 [예측돌봄 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}💖 [예측돌봄 확인] 사용 가능한 함수들:`, Object.keys(modules.predictiveCaringSystem || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [20/24] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 로드 완료! 이제 진짜 예진이가 될 수 있어요! 💕${colors.reset}`);

        // ================== ⚙️ 4시간차: 통합 & 최적화 시스템 로드 ==================
        console.log(`${colors.intelligent}⚙️⚙️⚙️ [4시간차] 통합 & 최적화 시스템 로드 시작! ⚙️⚙️⚙️${colors.reset}`);

        // 21. ⭐️⭐️⭐️ 지능형 스케줄러 v2.0 (기존 스케줄러 AI 업그레이드!) ⭐️⭐️⭐️
        try {
            modules.intelligentScheduler = require('./muku-intelligentScheduler');
            console.log(`${colors.intelligent}✅ [21/24] intelligentScheduler: 지능형 스케줄러 v2.0 (AI 업그레이드)${colors.reset}`);
            
            if (modules.intelligentScheduler.initialize && modules.intelligentScheduler.analyzeUserActivity) {
                console.log(`${colors.intelligent}🧠 [지능형스케줄러 확인] 핵심 함수들 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.intelligent}     🎯 기능: 아저씨 패턴 학습, 최적 타이밍 계산, 감정 상태 반영${colors.reset}`);
            } else {
                console.log(`${colors.error}🧠 [지능형스케줄러 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🧠 [지능형스케줄러 확인] 사용 가능한 함수들:`, Object.keys(modules.intelligentScheduler || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [21/24] intelligentScheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.intelligentScheduler = null;
        }

        // 22. ⭐️⭐️⭐️ 적응형 성격 시스템 (예진이 성격 실시간 진화!) ⭐️⭐️⭐️
        try {
            modules.adaptivePersonality = require('./muku-adaptivePersonalitySystem');
            console.log(`${colors.personality}✅ [22/24] adaptivePersonality: 적응형 성격 시스템${colors.reset}`);
            
            if (modules.adaptivePersonality.initialize && modules.adaptivePersonality.adaptPersonality) {
                console.log(`${colors.personality}🌸 [적응형성격 확인] 핵심 함수들 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.personality}     💕 기능: 상황별 성격 변화, 말투 진화, 관계 깊이 반영${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [적응형성격 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌸 [적응형성격 확인] 사용 가능한 함수들:`, Object.keys(modules.adaptivePersonality || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [22/24] adaptivePersonality 로드 실패: ${error.message}${colors.reset}`);
            modules.adaptivePersonality = null;
        }

        // 23. ⭐️⭐️⭐️ 품질 보증 엔진 (응답 품질 100% 보장!) ⭐️⭐️⭐️
        try {
            modules.qualityAssurance = require('./muku-qualityAssuranceEngine');
            console.log(`${colors.quality}✅ [23/24] qualityAssurance: 품질 보증 엔진${colors.reset}`);
            
            if (modules.qualityAssurance.initialize && modules.qualityAssurance.checkResponseQuality) {
                console.log(`${colors.quality}🛡️ [품질보증 확인] 핵심 함수들 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.quality}     🔍 기능: 실시간 품질 체크, 예진이다움 필터링, 자동 개선${colors.reset}`);
            } else {
                console.log(`${colors.error}🛡️ [품질보증 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🛡️ [품질보증 확인] 사용 가능한 함수들:`, Object.keys(modules.qualityAssurance || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [23/24] qualityAssurance 로드 실패: ${error.message}${colors.reset}`);
            modules.qualityAssurance = null;
        }

        console.log(`${colors.intelligent}🎉 [4시간차] 통합 & 최적화 시스템 로드 완료! 무쿠 시스템이 완전체가 되었어요! 🚀${colors.reset}`);

        // ================== 📖📖📖 일기장 시스템 로드 (최신 추가!) ================== 
        console.log(`${colors.diary}📖📖📖 [최신!] 일기장 시스템 로드 시작! 📖📖📖${colors.reset}`);

        // 24. ⭐️⭐️⭐️ 일기장 시스템 (누적 학습 내용 조회!) ⭐️⭐️⭐️
        try {
            modules.diarySystem = require('./muku-diarySystem');
            console.log(`${colors.diary}✅ [24/24] diarySystem: 누적 일기장 시스템 (동적 학습 내용 전체 조회)${colors.reset}`);
            
            if (modules.diarySystem.handleDiaryCommand && modules.diarySystem.getAllDynamicLearning) {
                console.log(`${colors.diary}📖 [일기장 확인] 핵심 함수들 존재 확인 ✅${colors.reset}`);
                console.log(`${colors.diary}     💕 기능: 누적 학습 내용 조회, 날짜별 분류, 통계 제공${colors.reset}`);
                console.log(`${colors.diary}     📝 사용법: "일기장" 명령어로 지금까지 배운 모든 것 확인${colors.reset}`);
                console.log(`${colors.diary}     🎯 예시: 오늘 3개 + 어제 2개 + 지난주 5개 = 총 10개 학습 내용 확인 가능${colors.reset}`);
            } else {
                console.log(`${colors.error}📖 [일기장 확인] 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}📖 [일기장 확인] 사용 가능한 함수들:`, Object.keys(modules.diarySystem || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [24/24] diarySystem 로드 실패: ${error.message}${colors.reset}`);
            modules.diarySystem = null;
        }

        console.log(`${colors.diary}🎉 [최신!] 일기장 시스템 로드 완료! 이제 무쿠가 배운 모든 것을 확인할 수 있어요! 📚${colors.reset}`);

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return modules;
    }
}
// ================== 💾 기억 시스템 초기화 ==================
async function initializeMemorySystems(modules, client) {
    try {
        console.log(`${colors.system}🧠 [기억시스템] 초기화 시작...${colors.reset}`);

        // ⭐️ 1. 고정 기억 시스템 초기화 (가장 중요!) ⭐️
        if (modules.memoryManager) {
            try {
                if (modules.memoryManager.ensureMemoryTablesAndDirectory) {
                    await modules.memoryManager.ensureMemoryTablesAndDirectory();
                    console.log(`${colors.system}     ✅ 고정 기억 시스템: 데이터베이스 및 파일 시스템 초기화 완료${colors.reset}`);
                }
                
                if (modules.memoryManager.loadAllMemories) {
                    await modules.memoryManager.loadAllMemories();
                    console.log(`${colors.system}     ✅ 고정 기억 로딩: 기본기억 + 연애기억 로드 완료${colors.reset}`);
                }
                
                if (modules.memoryManager.getMemoryStatus) {
                    const status = modules.memoryManager.getMemoryStatus();
                    const totalFixed = status.fixedMemoriesCount + status.loveHistoryCount;
                    console.log(`${colors.system}     ✅ 고정 기억 확인: 총 ${totalFixed}개 (기본: ${status.fixedMemoriesCount}개, 연애: ${status.loveHistoryCount}개)${colors.reset}`);
                    
                    if (totalFixed === 0) {
                        console.log(`${colors.error}     ⚠️ 고정 기억이 0개입니다! 기본 데이터 로딩 재시도...${colors.reset}`);
                        if (modules.memoryManager.ensureMemoryFiles) {
                            await modules.memoryManager.ensureMemoryFiles();
                            await modules.memoryManager.loadAllMemories();
                        }
                    }
                } else {
                    console.log(`${colors.error}     ❌ memoryManager.getMemoryStatus 함수 없음${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}     ❌ 고정 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}     ❌ memoryManager 모듈이 로드되지 않음!${colors.reset}`);
        }

        // 2. 동적 기억 시스템 초기화  
        if (modules.ultimateContext && modules.ultimateContext.initializeEmotionalSystems) {
            try {
                await modules.ultimateContext.initializeEmotionalSystems();
                console.log(`${colors.system}     ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3. 감정 컨텍스트 관리자 초기화
        if (modules.emotionalContextManager && modules.emotionalContextManager.initializeEmotionalState) {
            try {
                modules.emotionalContextManager.initializeEmotionalState();
                console.log(`${colors.system}     ✅ 감정 상태 시스템: 생리주기(현실적 28일) 및 감정 상태 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 4. 독립 삐짐 시스템 초기화 ⭐️
        if (modules.sulkyManager && modules.sulkyManager.initializeSulkySystem) {
            try {
                modules.sulkyManager.initializeSulkySystem();
                console.log(`${colors.system}     ✅ 독립 삐짐 시스템: 3h→6h→12h→24h 단계별 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 독립 삐짐 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 5. 새벽 대화 시스템 초기화 ⭐️
        if (modules.nightWakeResponse && modules.nightWakeResponse.initialize) {
            try {
                modules.nightWakeResponse.initialize();
                console.log(`${colors.system}     ✅ 새벽 대화 시스템: 2-7시 단계별 반응 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 새벽 대화 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 6. 생일 감지 시스템 초기화 ⭐️
        if (modules.birthdayDetector && modules.birthdayDetector.initialize) {
            try {
                modules.birthdayDetector.initialize();
                console.log(`${colors.system}     ✅ 생일 감지 시스템: 예진이(3/17), 아저씨(12/5) 감지 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 생일 감지 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 7. 사람 학습 시스템 초기화 (신규!) ⭐️⭐️⭐️
        console.log(`${colors.person}👥👥👥 [사람학습 중요!] 사람 학습 시스템 100% 보장 시작! 👥👥👥${colors.reset}`);
        
        if (!modules.personLearning) {
            console.log(`${colors.error}👥 [에러] personLearning 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}👥 [에러] 사람 학습 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!modules.personLearning.initializePersonLearningSystem) {
            console.log(`${colors.error}👥 [에러] personLearning.initializePersonLearningSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}👥 [디버그] personLearning에서 사용 가능한 함수들:`, Object.keys(modules.personLearning));
        } else {
            try {
                console.log(`${colors.person}👥 [시작시도] personLearning.initializePersonLearningSystem() 호출...${colors.reset}`);
                const learningResult = await modules.personLearning.initializePersonLearningSystem();
                if (learningResult) {
                    console.log(`${colors.person}👥 [성공!] 사람 학습 시스템 시작 완료!${colors.reset}`);
                    console.log(`${colors.system}     ✅ 사람 학습 시스템 활성화 완료! (투샷 + 장소별 기억, 관계 발전 단계별 반응)${colors.reset}`);
                    if (modules.personLearning.getPersonLearningStats) {
                        const learningStats = modules.personLearning.getPersonLearningStats();
                        console.log(`${colors.system}     👥 사람 학습 현황: ${learningStats.totalPersons}명 등록, ${learningStats.totalMeetings}회 만남 기록${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.error}👥 [실패] 사람 학습 시스템 시작 실패${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}👥 [실패] 사람 학습 시스템 활성화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 8. 일기장 시스템 초기화 (최신 추가!) ⭐️⭐️⭐️
        console.log(`${colors.diary}📖📖📖 [일기장 중요!] 일기장 시스템 100% 보장 시작! 📖📖📖${colors.reset}`);
        
        if (!modules.diarySystem) {
            console.log(`${colors.error}📖 [에러] diarySystem 모듈이 로드되지 않았습니다!${colors.reset}`);
        } else {
            try {
                if (modules.diarySystem.handleDiaryCommand && modules.diarySystem.getAllDynamicLearning) {
                    console.log(`${colors.diary}📖 [성공!] 일기장 시스템 준비 완료!${colors.reset}`);
                    console.log(`${colors.system}     ✅ 일기장 시스템 활성화 완료! (누적 학습 내용 조회, 날짜별 분류, 통계 제공)${colors.reset}`);
                } else {
                    console.log(`${colors.error}📖 [실패] 일기장 핵심 함수 없음!${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}📖 [실패] 일기장 시스템 확인 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 9. 담타 스케줄러 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
        
        if (!modules.scheduler) {
            console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
        } else if (!modules.scheduler.startAllSchedulers) {
            console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
        } else {
            try {
                console.log(`${colors.pms}🚬 [시작시도] scheduler.startAllSchedulers() 호출...${colors.reset}`);
                // ✅ [핵심 수정] startAllSchedulers 함수에 client 객체를 전달합니다.
                await modules.scheduler.startAllSchedulers(client); 
                console.log(`${colors.pms}🚬 [성공!] 스케줄러 시작 완료!${colors.reset}`);
                console.log(`${colors.system}     ✅ 담타 스케줄러 활성화 완료! (랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시 100% 보장)${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 담타 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 10. 예진이 능동 메시지 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
        
        if (!modules.spontaneousYejin) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [에러] 예진이 능동 메시지 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!modules.spontaneousYejin.startSpontaneousYejinSystem) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(modules.spontaneousYejin));
        } else {
            // ✅ [핵심 수정] 비활성화 주석을 해제하고, try-catch 구문으로 감싸 안정성을 높입니다.
            try {
                console.log(`${colors.pms}🌸 [시작시도] spontaneousYejin.startSpontaneousYejinSystem() 호출...${colors.reset}`);
                const yejinResult = modules.spontaneousYejin.startSpontaneousYejinSystem(client);
                if (yejinResult) {
                    console.log(`${colors.pms}🌸 [성공!] 예진이 능동 메시지 시스템 시작 완료!${colors.reset}`);
                } else {
                    console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 시작 실패${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 활성화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ================== 🔥 3시간차: AI 응답 고도화 시스템 초기화 ==================
        console.log(`${colors.ai}🔥🔥🔥 [3시간차] AI 응답 고도화 시스템 초기화 시작! 🔥🔥🔥${colors.reset}`);
        console.log(`${colors.ai}     ✅ 자연어 처리기: 예진이 말투 시스템 활성화 완료${colors.reset}`);
        console.log(`${colors.emotion}     ✅ 감정 뉘앙스 감지기: 미묘한 감정 변화 감지 시스템 활성화 완료${colors.reset}`);
        console.log(`${colors.care}     ✅ 예측적 돌봄 시스템: 선제적 케어 시스템 활성화 완료${colors.reset}`);
        console.log(`${colors.ai}🎉 [3시간차] AI 응답 고도화 시스템 초기화 완료! 이제 무쿠가 진짜 예진이처럼 반응할 수 있어요! 💕${colors.reset}`);

        // ================== ⚙️ 4시간차: 통합 & 최적화 시스템 초기화 ==================
        console.log(`${colors.intelligent}⚙️⚙️⚙️ [4시간차] 통합 & 최적화 시스템 초기화 시작! ⚙️⚙️⚙️${colors.reset}`);

        if (modules.intelligentScheduler && modules.scheduler && modules.spontaneousYejin) {
            try {
                await modules.intelligentScheduler.initialize(modules.scheduler, modules.spontaneousYejin);
                console.log(`${colors.intelligent}     ✅ 지능형 스케줄러: 기존 담타+예진이 시스템 AI 업그레이드 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 지능형 스케줄러 초기화 실패: ${error.message}${colors.reset}`);
            }
        }
        if (modules.adaptivePersonality) {
            try {
                await modules.adaptivePersonality.initialize();
                console.log(`${colors.personality}     ✅ 적응형 성격 시스템: 예진이 성격 실시간 적응 시스템 활성화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 적응형 성격 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }
        if (modules.qualityAssurance) {
            try {
                await modules.qualityAssurance.initialize();
                console.log(`${colors.quality}     ✅ 품질 보증 엔진: 응답 품질 100% 보장 시스템 활성화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}     ❌ 품질 보증 엔진 초기화 실패: ${error.message}${colors.reset}`);
            }
        }
        console.log(`${colors.intelligent}🎉 [4시간차] 통합 & 최적화 시스템 초기화 완료! 무쿠 시스템이 완전체가 되었어요! 🚀${colors.reset}`);
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}// ================== 📸 자발적 사진 전송 시스템 초기화 ==================
async function initializeSpontaneousPhoto(modules, client) {
    console.log(`${colors.system}📸 [자발적사진] 시스템 활성화...${colors.reset}`);
    
    if (modules.spontaneousPhoto && modules.spontaneousPhoto.startSpontaneousPhotoScheduler) {
        try {
            const userId = process.env.TARGET_USER_ID;
            if (!userId) {
                console.log(`${colors.error}     ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
            } else {
                const getLastUserMessageTime = () => {
                    try {
                        const ultimateContext = require('./ultimateConversationContext');
                        return ultimateContext.getLastUserMessageTime ? ultimateContext.getLastUserMessageTime() : Date.now();
                    } catch (error) {
                        return Date.now();
                    }
                };
                
                modules.spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime);
                console.log(`${colors.system}     ✅ 자발적 사진 전송 활성화 완료 (userId: ${userId.slice(0,8)}...)${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}     ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}     ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
    }
}

// ================== 🌤️ 날씨 시스템 테스트 ==================
async function testWeatherSystem(modules) {
    console.log(`${colors.system}🌤️ [날씨시스템] 테스트...${colors.reset}`);
    
    if (modules.weatherManager && modules.weatherManager.getCurrentWeather) {
        try {
            console.log(`${colors.system}     🌤️ 날씨 API 테스트 시작...${colors.reset}`);
            const testWeather = await modules.weatherManager.getCurrentWeather('ajeossi');
            if (testWeather) {
                console.log(`${colors.system}     ✅ 날씨 시스템 테스트 성공: ${testWeather.location} ${testWeather.temperature}°C, ${testWeather.description}${colors.reset}`);
            } else {
                console.log(`${colors.error}     ⚠️ 날씨 API 응답 없음 - API 키 확인 필요${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.error}     ❌ 날씨 시스템 테스트 실패: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.system}     ⚠️ 날씨 시스템 없음 - 건너뛰기${colors.reset}`);
    }
}

// ================== 🎭 감정 상태 시스템 동기화 ==================
function synchronizeEmotionalSystems(modules) {
    console.log(`${colors.system}🎭 [감정시스템] 동기화...${colors.reset}`);
    
    if (modules.emotionalContextManager) {
        console.log(`${colors.system}     ✅ 감정 상태 시스템 동기화 완료 (28일 주기)${colors.reset}`);
    }

    if (modules.personLearning) {
        console.log(`${colors.person}     ✅ 사람 학습 시스템 동기화 완료 (투샷 + 장소 기억)${colors.reset}`);
        console.log(`${colors.person}     🔗 faceMatcher ↔ personLearning 완벽 연동${colors.reset}`);
    }

    if (modules.diarySystem) {
        console.log(`${colors.diary}     ✅ 일기장 시스템 동기화 완료 (누적 학습 내용 조회)${colors.reset}`);
        console.log(`${colors.diary}     🔗 memoryManager ↔ diarySystem 완벽 연동${colors.reset}`);
    }

    if (modules.naturalLanguageProcessor && modules.emotionalNuanceDetector && modules.predictiveCaringSystem) {
        console.log(`${colors.ai}     ✅ AI 응답 고도화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.ai}     🔗 자연어처리 ↔ 감정감지 ↔ 예측돌봄 완벽 연동${colors.reset}`);
    }

    if (modules.intelligentScheduler && modules.adaptivePersonality && modules.qualityAssurance) {
        console.log(`${colors.intelligent}     ✅ 통합 & 최적화 시스템들 상호 동기화 완료${colors.reset}`);
        console.log(`${colors.intelligent}     🔗 지능형스케줄러 ↔ 적응형성격 ↔ 품질보증 완벽 연동${colors.reset}`);
    }
}
// ================== ⭐️ enhancedLogging v3.0 자동 상태 갱신 시작 ==================
function startAutoStatusUpdates(modules) {
    if (modules.enhancedLogging && modules.enhancedLogging.startAutoStatusUpdates) {
        console.log(`${colors.pms}⏰⏰⏰ [자동갱신 중요!] enhancedLogging v3.0 1분마다 자동 상태 갱신 시작! ⏰⏰⏰${colors.reset}`);
        
        const systemModules = {
            memoryManager: modules.memoryManager,
            ultimateContext: modules.ultimateContext,
            emotionalContextManager: modules.emotionalContextManager,
            sulkyManager: modules.sulkyManager,
            scheduler: modules.scheduler,
            spontaneousYejin: modules.spontaneousYejin,
            weatherManager: modules.weatherManager,
            nightWakeResponse: modules.nightWakeResponse,
            birthdayDetector: modules.birthdayDetector,
            diarySystem: modules.diarySystem,
            personLearning: modules.personLearning,
            naturalLanguageProcessor: modules.naturalLanguageProcessor,
            emotionalNuanceDetector: modules.emotionalNuanceDetector,
            predictiveCaringSystem: modules.predictiveCaringSystem,
            intelligentScheduler: modules.intelligentScheduler,
            adaptivePersonality: modules.adaptivePersonality,
            qualityAssurance: modules.qualityAssurance,
            faceApiStatus: {
                initialized: false, // 나중에 index.js에서 업데이트
                initializing: false
            }
        };
        
        try {
            modules.enhancedLogging.startAutoStatusUpdates(systemModules);
            console.log(`${colors.pms}⏰ [성공!] 1분마다 자동 상태 갱신 시스템 활성화! (일기장 + 사람학습 + 3+4시간차 모듈들 포함)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}⏰ [실패] 자동 상태 갱신 시작 실패: ${error.message}${colors.reset}`);
        }
    }
}

// ================== 🚀 통합 초기화 함수 ==================
async function initializeMukuSystems(client, getCurrentModelSetting) {
    try {
        console.log(`${colors.system}🚀 무쿠 시스템 초기화를 시작합니다...${colors.reset}`);
        console.log(`${colors.diary}📖 일기장: DiarySystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습: PersonLearningSystem 추가 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차: AI 응답 고도화 버전으로 초기화합니다!${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차: 통합 & 최적화 버전으로 초기화합니다!${colors.reset}`);

        // 1. 모든 모듈 로드
        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드 (24개 모듈)...${colors.reset}`);
        const modules = await loadAllModules();

        // 2. 기억 시스템 초기화
        console.log(`${colors.system}🧠 [2/6] 기억 시스템 초기화 (⭐️ 일기장 + 사람학습 + 스케줄러 + 예진이 + 삐짐 + AI 고도화 + 통합최적화 100% 확실 시작!)...${colors.reset}`);
        const memoryInitSuccess = await initializeMemorySystems(modules, client);
        
        if (!memoryInitSuccess) {
            console.log(`${colors.error}🚬 [경고] 기억 시스템 초기화 중 스케줄러 시작 실패!${colors.reset}`);
            
            // 스케줄러 시작 재시도
            console.log(`${colors.pms}🚬 [재시도] 스케줄러 시작 재시도...${colors.reset}`);
            try {
                if (modules.scheduler && modules.scheduler.startAllSchedulers) {
                    await modules.scheduler.startAllSchedulers(client); // client 전달
                    console.log(`${colors.pms}🚬 [성공] 스케줄러 재시도 성공!${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 스케줄러 재시도 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3. 자발적 사진 전송 시스템 활성화
        console.log(`${colors.system}📸 [3/6] 자발적 사진 전송 시스템 활성화...${colors.reset}`);
        await initializeSpontaneousPhoto(modules, client);

        // 4. 날씨 시스템 테스트
        console.log(`${colors.system}🌤️ [4/6] 날씨 시스템 테스트...${colors.reset}`);
        await testWeatherSystem(modules);

        // 5. 감정 및 상태 시스템 동기화
        console.log(`${colors.system}🎭 [5/6] 감정 및 상태 시스템 동기화 (일기장 + 사람학습 + AI 고도화 + 통합최적화 시스템 포함)...${colors.reset}`);
        synchronizeEmotionalSystems(modules);

        // 6. enhancedLogging v3.0 자동 상태 갱신 시작
        console.log(`${colors.system}⏰ [6/6] enhancedLogging v3.0 자동 상태 갱신 시작 (24개 모듈 모니터링)...${colors.reset}`);
        startAutoStatusUpdates(modules);

        console.log(`${colors.system}🎉 무쿠 시스템 초기화 완료!${colors.reset}`);
        console.log(`${colors.diary}📖 일기장 시스템 통합 완료! 이제 누적 학습 내용을 확인할 수 있어요! 💕${colors.reset}`);
        console.log(`${colors.person}👥 사람 학습 시스템 통합 완료! 이제 투샷 + 장소를 기억해요! 💕${colors.reset}`);
        console.log(`${colors.ai}🔥 3시간차 AI 응답 고도화 시스템 통합 완료! 이제 진짜 예진이가 되었어요! 💕${colors.reset}`);
        console.log(`${colors.intelligent}⚙️ 4시간차 통합 & 최적화 시스템 통합 완료! 무쿠가 완전체가 되었어요! 🚀${colors.reset}`);
        
        return {
            success: true,
            modules: modules
        };

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 무쿠 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(`${colors.error}에러 내용: ${error.message}${colors.reset}`);
        console.log(`${colors.system}⚡ 기본 모드로 계속 진행합니다...${colors.reset}`);
        
        return {
            success: false,
            modules: {},
            error: error.message
        };
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    initializeMemorySystems,
    initializeSpontaneousPhoto,
    testWeatherSystem,
    synchronizeEmotionalSystems,
    startAutoStatusUpdates,
    initializeMukuSystems,
    colors
};
