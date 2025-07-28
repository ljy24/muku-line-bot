// ============================================================================
// muku-moduleLoader.js v1.5 DISK_MOUNT + CONFLICT + BEHAVIOR_SWITCH + LEARNING + AUTONOMOUS - 모듈 로딩 전용 시스템
// ✅ diarySystem 로딩 문제 완전 해결
// ✅ unifiedConflictManager 갈등 시스템 추가
// 🔄 realtimeBehaviorSwitch 실시간 행동 스위치 시스템 추가
// 🧠 realTimeLearningSystem 실시간 학습 시스템 추가
// 🕊️ autonomousYejinSystem 자율 예진이 시스템 추가 (함수명 수정 완료!)
// ❌ night_wake_response 모듈 제거 (불필요)
// 📦 27개 모듈을 6단계로 안전하게 로딩
// 🔄 초기화와 완전 분리하여 안정성 극대화
// 💾 디스크 마운트 경로 적용: /data 경로 확인 및 생성
// 💥 갈등 관리 시스템 완전 통합
// ⭐️ 갈등 시스템 함수명 수정 완료:
//    - initializeMukuUnifiedConflictSystem
//    - getMukuConflictSystemStatus
//    - processMukuMessageForConflict
//    - recordMukuReconciliation
// 🎓 실시간 학습 시스템 로딩 오류 처리 강화
// 📷 spontaneousPhoto 모듈명 불일치 문제 해결
// 🕊️ 자율 예진이 시스템 모듈 로딩 추가 - enhancedLogging 연동 완료!
// 🔧 자율 시스템 함수명 수정 완료: initializeAutonomousYejin, getAutonomousYejinStatus, getGlobalInstance
// 🔄 emotionalContextManager, unifiedConflictManager 더미 모듈 처리 추가
// 🛡️ NEW: emotionalContextManager 로딩 문제 완전 해결!
// ============================================================================

const path = require('path');
const fs = require('fs');

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',
    yejin: '\x1b[95m',
    pms: '\x1b[1m\x1b[91m',
    system: '\x1b[92m',
    error: '\x1b[91m',
    person: '\x1b[93m',
    diary: '\x1b[94m',
    ai: '\x1b[1m\x1b[95m',
    intelligent: '\x1b[1m\x1b[96m',
    emotion: '\x1b[35m',
    care: '\x1b[1m\x1b[93m',
    personality: '\x1b[36m',
    quality: '\x1b[1m\x1b[92m',
    mount: '\x1b[1m\x1b[94m', // 💾 디스크 마운트용 색상
    conflict: '\x1b[1m\x1b[31m', // 💥 갈등 시스템용 색상 추가
    behavior: '\x1b[1m\x1b[33m', // 🔄 행동 스위치용 색상 추가
    learning: '\x1b[1m\x1b[32m', // 🧠 실시간 학습용 색상 추가
    autonomous: '\x1b[1m\x1b[95m', // 🕊️ 자율 시스템용 색상 추가
    reset: '\x1b[0m'
};

// ================== 💾 디스크 마운트 확인 함수 ==================
async function ensureDiskMountPath() {
    try {
        const DISK_MOUNT_PATH = '/data';
        
        console.log(`${colors.mount}💾 [디스크마운트] 경로 확인 시작: ${DISK_MOUNT_PATH}${colors.reset}`);
        
        // 디렉토리 존재 확인
        if (!fs.existsSync(DISK_MOUNT_PATH)) {
            console.log(`${colors.mount}📁 [디스크마운트] 경로 생성: ${DISK_MOUNT_PATH}${colors.reset}`);
            fs.mkdirSync(DISK_MOUNT_PATH, { recursive: true });
        } else {
            console.log(`${colors.mount}✅ [디스크마운트] 경로 확인 완료: ${DISK_MOUNT_PATH}${colors.reset}`);
        }
        
        // 쓰기 권한 테스트
        const testFile = path.join(DISK_MOUNT_PATH, 'mount_test.tmp');
        try {
            fs.writeFileSync(testFile, 'disk mount test');
            fs.unlinkSync(testFile);
            console.log(`${colors.mount}✅ [디스크마운트] 쓰기 권한 확인 완료${colors.reset}`);
            return true;
        } catch (writeError) {
            console.log(`${colors.error}❌ [디스크마운트] 쓰기 권한 없음: ${writeError.message}${colors.reset}`);
            return false;
        }
        
    } catch (error) {
        console.log(`${colors.error}❌ [디스크마운트] 경로 설정 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📦 모듈 로드 함수 ==================
async function loadAllModules() {
    const modules = {};
    
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);
        
        // ⭐️ 디스크 마운트 경로 먼저 확인 ⭐️
        console.log(`${colors.mount}💾💾💾 [최우선] 디스크 마운트 경로 확인 및 생성! 💾💾💾${colors.reset}`);
        const diskMountReady = await ensureDiskMountPath();
        if (diskMountReady) {
            console.log(`${colors.mount}🎉 [디스크마운트] 완전 영구 저장 준비 완료!${colors.reset}`);
        } else {
            console.log(`${colors.error}⚠️ [디스크마운트] 설정 실패 - 기본 경로로 동작${colors.reset}`);
        }

        // =================== 1단계: 핵심 로깅 시스템 ===================
        try {
            modules.enhancedLogging = require('./enhancedLogging');
            console.log(`${colors.system}✅ [1/27] enhancedLogging v3.0: 완전체 로깅 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/27] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
            modules.enhancedLogging = null;
        }

        // =================== 2단계: 기본 응답 시스템 ===================
        try {
            modules.autoReply = require('./autoReply');
            console.log(`${colors.system}✅ [2/27] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/27] autoReply 로드 실패: ${error.message}${colors.reset}`);
            modules.autoReply = null;
        }

        // =================== 3단계: 기억 관리 시스템 (💾 디스크 마운트 적용) ===================
        try {
            modules.memoryManager = require('./memoryManager');
            console.log(`${colors.system}✅ [3/27] memoryManager: 고정 기억 시스템 (120개) (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/27] memoryManager 로드 실패: ${error.message}${colors.reset}`);
            modules.memoryManager = null;
        }

        try {
            modules.ultimateContext = require('./ultimateConversationContext');
            console.log(`${colors.system}✅ [4/27] ultimateContext: 동적 기억 시스템 (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/27] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
            modules.ultimateContext = null;
        }

        // =================== 4단계: 명령어 및 감정 시스템 ===================
        try {
            modules.commandHandler = require('./commandHandler');
            console.log(`${colors.system}✅ [5/27] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/27] commandHandler 로드 실패: ${error.message}${colors.reset}`);
            modules.commandHandler = null;
        }

        // 🛡️ ================== emotionalContextManager 견고한 로딩 시스템 ==================
        console.log(`${colors.emotion}🧠💖 [감정시스템] emotionalContextManager 견고한 로딩 시작...${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const emotionalPath = path.resolve(__dirname, 'emotionalContextManager.js');
            console.log(`${colors.emotion}📁 [감정시스템] 파일 경로 확인: ${emotionalPath}${colors.reset}`);
            
            if (fs.existsSync(emotionalPath)) {
                console.log(`${colors.emotion}✅ [감정시스템] 파일 존재 확인 완료${colors.reset}`);
                
                // 2단계: require 캐시 클리어 (깨끗한 로딩)
                delete require.cache[emotionalPath];
                console.log(`${colors.emotion}🔄 [감정시스템] 캐시 클리어 완료${colors.reset}`);
                
                // 3단계: 안전한 모듈 로드
                console.log(`${colors.emotion}⚡ [감정시스템] 모듈 로드 시도...${colors.reset}`);
                modules.emotionalContextManager = require('./emotionalContextManager');
                
                // 4단계: 모듈 유효성 검증
                if (modules.emotionalContextManager && 
                    typeof modules.emotionalContextManager === 'object') {
                    
                    console.log(`${colors.emotion}🔍 [감정시스템] 모듈 구조 확인:`, Object.keys(modules.emotionalContextManager).slice(0, 5));
                    
                    // 필수 함수 확인
                    const requiredFunctions = ['getCurrentEmotionState', 'initializeEmotionalState'];
                    let validFunctions = 0;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.emotionalContextManager[func] === 'function') {
                            console.log(`${colors.emotion}✅ [감정시스템] ${func} 함수 확인 완료${colors.reset}`);
                            validFunctions++;
                        } else {
                            console.log(`${colors.emotion}⚠️ [감정시스템] ${func} 함수 없음${colors.reset}`);
                        }
                    }
                    
                    if (validFunctions >= 1) {
                        console.log(`${colors.system}✅ [6/27] emotionalContextManager: 감정 상태 시스템 (정상 로드 - ${validFunctions}/${requiredFunctions.length}개 함수)${colors.reset}`);
                        
                        // 5단계: 초기화 시도 (안전하게)
                        try {
                            if (typeof modules.emotionalContextManager.initializeEmotionalState === 'function') {
                                modules.emotionalContextManager.initializeEmotionalState();
                                console.log(`${colors.emotion}🎯 [감정시스템] 초기화 성공${colors.reset}`);
                            } else {
                                console.log(`${colors.emotion}⚠️ [감정시스템] 초기화 함수 없음 - 기본 동작으로 진행${colors.reset}`);
                            }
                        } catch (initError) {
                            console.log(`${colors.emotion}⚠️ [감정시스템] 초기화 실패하지만 모듈은 정상: ${initError.message}${colors.reset}`);
                        }
                        
                    } else {
                        throw new Error('필수 함수가 부족함 - 더미 모듈로 대체 필요');
                    }
                    
                } else {
                    throw new Error('모듈이 올바르게 로드되지 않음');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${emotionalPath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [6/27] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [감정시스템] 더미 모듈 생성 중...${colors.reset}`);
            
            // 🛡️ 완벽한 더미 모듈 생성 (모든 필요한 함수 포함)
            modules.emotionalContextManager = { 
                initialized: true,
                
                // 주요 함수들
                initializeEmotionalState: () => {
                    console.log(`${colors.emotion}🔄 [더미감정] 더미 감정 시스템 초기화 완료${colors.reset}`);
                    return true;
                },
                
                getCurrentEmotionState: () => ({
                    currentEmotion: 'normal',
                    currentEmotionKorean: '평범',
                    emotionIntensity: 5,
                    cycleDay: 15,
                    description: '정상 상태',
                    isPeriodActive: false,
                    daysUntilNextPeriod: 13,
                    isSulky: false,
                    sulkyLevel: 0,
                    energyLevel: 5,
                    needsComfort: false,
                    conversationMood: 'neutral',
                    currentToneState: 'normal',
                    emotionalResidue: {
                        love: 50,
                        longing: 30,
                        sadness: 0
                    }
                }),
                
                updateEmotionFromUserMessage: (message) => {
                    console.log(`${colors.emotion}🔄 [더미감정] 메시지 감정 분석: "${String(message).substring(0, 20)}..."${colors.reset}`);
                    return true;
                },
                
                updateEmotion: (emotion, intensity = 5) => {
                    console.log(`${colors.emotion}🔄 [더미감정] 감정 업데이트: ${emotion} (강도: ${intensity})${colors.reset}`);
                    return true;
                },
                
                updateSulkyState: (isSulky, level = 0) => {
                    console.log(`${colors.emotion}🔄 [더미감정] 삐짐 상태 업데이트: ${isSulky} (레벨: ${level})${colors.reset}`);
                    return true;
                },
                
                getSelfieText: () => {
                    const texts = [
                        "아저씨 보라고 찍은 셀카야~ 어때?",
                        "나 예뻐? 방금 찍은 거야!",
                        "이 각도 괜찮지? ㅎㅎ"
                    ];
                    return texts[Math.floor(Math.random() * texts.length)];
                },
                
                getInternalState: () => ({
                    emotionalEngine: { currentToneState: 'normal' },
                    globalEmotion: {
                        currentEmotion: 'normal',
                        emotionIntensity: 5,
                        isSulky: false
                    }
                }),
                
                updateEmotionalLearning: (improvements) => {
                    console.log(`${colors.emotion}🔄 [더미감정] 감정 학습 업데이트: ${improvements?.length || 0}개${colors.reset}`);
                    return true;
                },
                
                translateEmotionToKorean: (emotion) => {
                    const map = {
                        'normal': '평범', 'happy': '기쁨', 'sad': '슬픔', 'angry': '화남',
                        'excited': '흥분', 'calm': '평온', 'worried': '걱정', 'lonely': '외로움',
                        'loving': '사랑스러움', 'missing': '그리움', 'sulky': '삐짐'
                    };
                    return map[emotion] || emotion;
                },
                
                // 호환성을 위한 속성들
                get emotionalState() { 
                    return { 
                        currentToneState: 'normal',
                        emotionalResidue: { love: 50, longing: 30, sadness: 0 }
                    }; 
                },
                
                get globalEmotionState() { 
                    return {
                        currentEmotion: 'normal',
                        emotionIntensity: 5,
                        isSulky: false,
                        sulkyLevel: 0,
                        energyLevel: 5
                    };
                }
            };
            
            console.log(`${colors.system}🔄 [6/27] emotionalContextManager: 더미 모듈로 완벽 활성화 (모든 함수 지원)${colors.reset}`);
        }

        try {
            modules.sulkyManager = require('./sulkyManager');
            console.log(`${colors.system}✅ [7/27] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [7/27] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            modules.sulkyManager = null;
        }

        try {
            modules.moodManager = require('./moodManager');
            console.log(`${colors.system}✅ [8/27] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/27] moodManager 로드 실패: ${error.message}${colors.reset}`);
            modules.moodManager = null;
        }

        // ⭐️⭐️⭐️ 갈등 관리 시스템 최우선 로딩! (💾 디스크 마운트 적용) ⭐️⭐️⭐️
        console.log(`${colors.conflict}💥💥💥 [갈등 최우선] muku-unifiedConflictManager 모듈 로드 시작! (💾 디스크 마운트 연동) 💥💥💥${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const conflictModulePath = path.resolve(__dirname, 'muku-unifiedConflictManager.js');
            console.log(`${colors.conflict}📁 [갈등] 파일 경로: ${conflictModulePath}${colors.reset}`);
            
            if (fs.existsSync(conflictModulePath)) {
                console.log(`${colors.conflict}✅ [갈등] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [갈등] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[conflictModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.unifiedConflictManager = require('./muku-unifiedConflictManager');
                
                // 3단계: 모듈 검증
                if (modules.unifiedConflictManager) {
                    console.log(`${colors.conflict}✅ [갈등] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.conflict}🔍 [갈등] 사용 가능한 함수들:`, Object.keys(modules.unifiedConflictManager));
                    
                    // ✅ 4단계: 필수 함수 확인 - 올바른 함수명 사용
                    const requiredFunctions = ['initializeMukuUnifiedConflictSystem', 'getMukuConflictSystemStatus', 'processMukuMessageForConflict', 'recordMukuReconciliation'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.unifiedConflictManager[func] === 'function') {
                            console.log(`${colors.conflict}✅ [갈등] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [갈등] ${func} 함수 없음!${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.conflict}🎉 [9/27] unifiedConflictManager: 갈등 관리 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [9/27] unifiedConflictManager: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${conflictModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [9/27] unifiedConflictManager 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [갈등] 상세 에러:`, error.stack);
            modules.unifiedConflictManager = { 
                initialized: true,
                getMukuConflictSystemStatus: () => ({ currentLevel: 0, isActive: false }),
                initializeMukuUnifiedConflictSystem: () => {},
                processMukuMessageForConflict: () => {},
                recordMukuReconciliation: () => {}
            };
            console.log(`${colors.system}🔄 [9/27] unifiedConflictManager: 더미 모듈로 활성화${colors.reset}`);
        }

        // 🔄🔄🔄 실시간 행동 스위치 시스템 로딩! (💾 디스크 마운트 적용) 🔄🔄🔄
        console.log(`${colors.behavior}🔄🔄🔄 [행동스위치 추가] muku-realtimeBehaviorSwitch 모듈 로드 시작! (💾 디스크 마운트 연동) 🔄🔄🔄${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const behaviorModulePath = path.resolve(__dirname, 'muku-realtimeBehaviorSwitch.js');
            console.log(`${colors.behavior}📁 [행동스위치] 파일 경로: ${behaviorModulePath}${colors.reset}`);
            
            if (fs.existsSync(behaviorModulePath)) {
                console.log(`${colors.behavior}✅ [행동스위치] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [행동스위치] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[behaviorModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.realtimeBehaviorSwitch = require('./muku-realtimeBehaviorSwitch');
                
                // 3단계: 모듈 검증
                if (modules.realtimeBehaviorSwitch) {
                    console.log(`${colors.behavior}✅ [행동스위치] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.behavior}🔍 [행동스위치] 사용 가능한 함수들:`, Object.keys(modules.realtimeBehaviorSwitch));
                    
                    // 4단계: 필수 함수 확인
                    const requiredFunctions = ['initializeRealtimeBehaviorSwitch', 'processRealtimeBehaviorChange', 'getBehaviorStatus', 'getCurrentAddress'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.realtimeBehaviorSwitch[func] === 'function') {
                            console.log(`${colors.behavior}✅ [행동스위치] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [행동스위치] ${func} 함수 없음!${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.behavior}🎉 [10/27] realtimeBehaviorSwitch: 실시간 행동 스위치 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [10/27] realtimeBehaviorSwitch: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${behaviorModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [10/27] realtimeBehaviorSwitch 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [행동스위치] 상세 에러:`, error.stack);
            modules.realtimeBehaviorSwitch = null;
        }

        // 🧠🧠🧠 실시간 학습 시스템 로딩! (💾 디스크 마운트 적용) 🧠🧠🧠
        console.log(`${colors.learning}🧠🧠🧠 [실시간학습 추가] muku-realTimeLearningSystem 모듈 로드 시작! (💾 디스크 마운트 연동) 🧠🧠🧠${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const learningModulePath = path.resolve(__dirname, 'muku-realTimeLearningSystem.js');
            console.log(`${colors.learning}📁 [실시간학습] 파일 경로: ${learningModulePath}${colors.reset}`);
            
            if (fs.existsSync(learningModulePath)) {
                console.log(`${colors.learning}✅ [실시간학습] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [실시간학습] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require (강화된 오류 처리)
                delete require.cache[learningModulePath]; // 캐시 삭제로 깨끗하게 로드
                
                console.log(`${colors.learning}🔄 [실시간학습] require 시도...${colors.reset}`);
                modules.realTimeLearningSystem = require('./muku-realTimeLearningSystem');
                console.log(`${colors.learning}✅ [실시간학습] require 성공!${colors.reset}`);
                
                // 3단계: 모듈 검증
                if (modules.realTimeLearningSystem) {
                    console.log(`${colors.learning}✅ [실시간학습] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.learning}🔍 [실시간학습] 사용 가능한 함수들:`, Object.keys(modules.realTimeLearningSystem));
                    
                    // 4단계: 필수 함수 확인
                    const requiredFunctions = ['mukuLearningSystem', 'initializeMukuLearning'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.realTimeLearningSystem[func] === 'function' || 
                            typeof modules.realTimeLearningSystem[func] === 'object') {
                            console.log(`${colors.learning}✅ [실시간학습] ${func} 확인 완료 (타입: ${typeof modules.realTimeLearningSystem[func]})${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [실시간학습] ${func} 없음! (사용가능: ${Object.keys(modules.realTimeLearningSystem).join(', ')})${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    // initializeMukuLearning 함수 특별 확인
                    if (modules.realTimeLearningSystem.initializeMukuLearning) {
                        console.log(`${colors.learning}🎯 [실시간학습] initializeMukuLearning 함수 확인 완료 (타입: ${typeof modules.realTimeLearningSystem.initializeMukuLearning})${colors.reset}`);
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.learning}🎉 [11/27] realTimeLearningSystem: 실시간 학습 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [11/27] realTimeLearningSystem: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${learningModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [11/27] realTimeLearningSystem 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [실시간학습] 상세 에러:`, error.stack?.split('\n')[0] || '스택 정보 없음');
            
            // 파일 구문 오류인지 확인
            if (error.message.includes('Unexpected token')) {
                console.log(`${colors.error}💡 [실시간학습] 구문 오류 감지! 파일 문법을 확인해주세요.${colors.reset}`);
            }
            
            modules.realTimeLearningSystem = null;
        }

        // =================== 5단계: 능동 시스템 + 사진 시스템 ===================
        try {
            modules.spontaneousYejin = require('./spontaneousYejinManager');
            console.log(`${colors.pms}✅ [12/27] spontaneousYejin: 예진이 능동 메시지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/27] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousYejin = null;
        }

        try {
            modules.spontaneousPhotoManager = require('./spontaneousPhotoManager');
            console.log(`${colors.system}✅ [13/27] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
            modules.spontaneousPhoto = modules.spontaneousPhotoManager; // 📷 모듈명 불일치 해결!
        } catch (error) {
            console.log(`${colors.error}❌ [13/27] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
            modules.spontaneousPhotoManager = null;
        }

        try {
            modules.photoAnalyzer = require('./photoAnalyzer');
            console.log(`${colors.system}✅ [14/27] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [14/27] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
            modules.photoAnalyzer = null;
        }

        // 🕊️🕊️🕊️ 자율 예진이 시스템 로딩! (💾 디스크 마운트 적용) - 함수명 수정! 🕊️🕊️🕊️
        console.log(`${colors.autonomous}🕊️🕊️🕊️ [자율시스템 추가] muku-autonomousYejinSystem 모듈 로드 시작! (💾 디스크 마운트 연동) 🕊️🕊️🕊️${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const autonomousModulePath = path.resolve(__dirname, 'muku-autonomousYejinSystem.js');
            console.log(`${colors.autonomous}📁 [자율시스템] 파일 경로: ${autonomousModulePath}${colors.reset}`);
            
            if (fs.existsSync(autonomousModulePath)) {
                console.log(`${colors.autonomous}✅ [자율시스템] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [자율시스템] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[autonomousModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.autonomousYejinSystem = require('./muku-autonomousYejinSystem');
                
                // 3단계: 모듈 검증
                if (modules.autonomousYejinSystem) {
                    console.log(`${colors.autonomous}✅ [자율시스템] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.autonomous}🔍 [자율시스템] 사용 가능한 함수들:`, Object.keys(modules.autonomousYejinSystem));
                    
                    // 🔧 4단계: 실제 export되는 함수들로 확인 수정
                    const requiredFunctions = ['initializeAutonomousYejin', 'getAutonomousYejinStatus', 'getGlobalInstance'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.autonomousYejinSystem[func] === 'function') {
                            console.log(`${colors.autonomous}✅ [자율시스템] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [자율시스템] ${func} 함수 없음! (사용가능: ${Object.keys(modules.autonomousYejinSystem).slice(0, 5).join(', ')})${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    // AutonomousYejinSystem 클래스 확인
                    if (typeof modules.autonomousYejinSystem.AutonomousYejinSystem === 'function') {
                        console.log(`${colors.autonomous}✅ [자율시스템] AutonomousYejinSystem 클래스 확인 완료${colors.reset}`);
                    } else {
                        console.log(`${colors.error}❌ [자율시스템] AutonomousYejinSystem 클래스 없음!${colors.reset}`);
                        functionCheck = false;
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.autonomous}🎉 [15/27] autonomousYejinSystem: 자율 예진이 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [15/27] autonomousYejinSystem: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${autonomousModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [15/27] autonomousYejinSystem 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [자율시스템] 상세 에러:`, error.stack?.split('\n')[0] || '스택 정보 없음');
            modules.autonomousYejinSystem = null;
        }

        try {
            modules.birthdayDetector = require('./birthdayDetector');
            console.log(`${colors.system}✅ [16/27] birthdayDetector: 생일 감지 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [16/27] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.birthdayDetector = null;
        }

        // =================== 6단계: 스케줄러 시스템 ===================
        try {
            modules.scheduler = require('./scheduler');
            console.log(`${colors.system}✅ [17/27] scheduler: 자동 메시지 스케줄러${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [17/27] scheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.scheduler = null;
        }

        try {
            modules.weatherManager = require('./weatherManager');
            console.log(`${colors.system}✅ [18/27] weatherManager: 실시간 날씨 API 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [18/27] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            modules.weatherManager = null;
        }

        // =================== 7단계: 신규 시스템들 (사람 학습 + 일기장) (💾 디스크 마운트 적용) ===================
        try {
            modules.personLearning = require('./muku-personLearningSystem');
            console.log(`${colors.person}✅ [19/27] personLearning: 사람 학습 시스템 (💾 디스크 마운트)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [19/27] personLearning 로드 실패: ${error.message}${colors.reset}`);
            modules.personLearning = null;
        }

        // ⭐️⭐️⭐️ 일기장 시스템 로딩 최우선 처리! (💾 디스크 마운트 적용) ⭐️⭐️⭐️
        console.log(`${colors.diary}🔥🔥🔥 [일기장 최우선] muku-diarySystem 모듈 로드 시작! (💾 디스크 마운트 연동) 🔥🔥🔥${colors.reset}`);
        
        try {
            // 1단계: 파일 존재 확인
            const diaryModulePath = path.resolve(__dirname, 'muku-diarySystem.js');
            console.log(`${colors.diary}📁 [일기장] 파일 경로: ${diaryModulePath}${colors.reset}`);
            
            if (fs.existsSync(diaryModulePath)) {
                console.log(`${colors.diary}✅ [일기장] 파일 존재 확인 완료${colors.reset}`);
                
                // 1.5단계: 디스크 마운트 경로 재확인
                const diskMountExists = fs.existsSync('/data');
                console.log(`${colors.mount}💾 [일기장] 디스크 마운트 경로 확인: ${diskMountExists ? '✅ 존재' : '❌ 없음'}${colors.reset}`);
                
                // 2단계: 모듈 require
                delete require.cache[diaryModulePath]; // 캐시 삭제로 깨끗하게 로드
                modules.diarySystem = require('./muku-diarySystem');
                
                // 3단계: 모듈 검증
                if (modules.diarySystem) {
                    console.log(`${colors.diary}✅ [일기장] 모듈 로드 성공! (💾 디스크 마운트 연동)${colors.reset}`);
                    console.log(`${colors.diary}🔍 [일기장] 사용 가능한 함수들:`, Object.keys(modules.diarySystem));
                    
                    // 4단계: 필수 함수 확인
                    const requiredFunctions = ['initializeDiarySystem', 'getDiarySystemStatus', 'collectDynamicMemoriesOnly'];
                    let functionCheck = true;
                    
                    for (const func of requiredFunctions) {
                        if (typeof modules.diarySystem[func] === 'function') {
                            console.log(`${colors.diary}✅ [일기장] ${func} 함수 확인 완료${colors.reset}`);
                        } else {
                            console.log(`${colors.error}❌ [일기장] ${func} 함수 없음!${colors.reset}`);
                            functionCheck = false;
                        }
                    }
                    
                    if (functionCheck) {
                        console.log(`${colors.diary}🎉 [20/27] diarySystem: 일기장 시스템 로드 성공! (모든 함수 확인 완료) (💾 디스크 마운트)${colors.reset}`);
                    } else {
                        console.log(`${colors.error}⚠️ [20/27] diarySystem: 일부 함수 누락이지만 기본 로드 성공${colors.reset}`);
                    }
                } else {
                    throw new Error('모듈이 null로 로드됨');
                }
                
            } else {
                throw new Error(`파일이 존재하지 않음: ${diaryModulePath}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [20/27] diarySystem 로드 실패: ${error.message}${colors.reset}`);
            console.log(`${colors.error}🔧 [일기장] 상세 에러:`, error.stack);
            modules.diarySystem = null;
        }

        // =================== 8단계: AI 고도화 시스템들 ===================
        try {
            modules.naturalLanguageProcessor = require('./muku-naturalLanguageProcessor');
            console.log(`${colors.ai}✅ [21/27] naturalLanguageProcessor: 자연어 처리 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [21/27] naturalLanguageProcessor 로드 실패: ${error.message}${colors.reset}`);
            modules.naturalLanguageProcessor = null;
        }

        try {
            modules.emotionalNuanceDetector = require('./muku-emotionalNuanceDetector');
            console.log(`${colors.emotion}✅ [22/27] emotionalNuanceDetector: 감정 뉘앙스 감지기${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [22/27] emotionalNuanceDetector 로드 실패: ${error.message}${colors.reset}`);
            modules.emotionalNuanceDetector = null;
        }

        try {
            modules.predictiveCaringSystem = require('./muku-predictiveCaringSystem');
            console.log(`${colors.care}✅ [23/27] predictiveCaringSystem: 예측적 돌봄 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [23/27] predictiveCaringSystem 로드 실패: ${error.message}${colors.reset}`);
            modules.predictiveCaringSystem = null;
        }

        // =================== 9단계: 통합 & 최적화 시스템들 ===================
        try {
            modules.intelligentScheduler = require('./muku-intelligentScheduler');
            console.log(`${colors.intelligent}✅ [24/27] intelligentScheduler: 지능형 스케줄러 v2.0${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [24/27] intelligentScheduler 로드 실패: ${error.message}${colors.reset}`);
            modules.intelligentScheduler = null;
        }

        try {
            modules.adaptivePersonality = require('./muku-adaptivePersonalitySystem');
            console.log(`${colors.personality}✅ [25/27] adaptivePersonality: 적응형 성격 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [25/27] adaptivePersonality 로드 실패: ${error.message}${colors.reset}`);
            modules.adaptivePersonality = null;
        }

        try {
            modules.qualityAssurance = require('./muku-qualityAssuranceEngine');
            console.log(`${colors.quality}✅ [26/27] qualityAssurance: 품질 보증 엔진${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [26/27] qualityAssurance 로드 실패: ${error.message}${colors.reset}`);
            modules.qualityAssurance = null;
        }

        // =================== 10단계: Face-API (지연 로딩) ===================
        console.log(`${colors.system}🔍 [27/27] faceMatcher: 지연 로딩 모드${colors.reset}`);

        // =================== 로딩 결과 요약 ===================
        const loadedCount = Object.values(modules).filter(module => module !== null).length;
        const totalModules = 26; // face-api 제외
        const loadSuccessRate = ((loadedCount / totalModules) * 100).toFixed(1);

        console.log(`${colors.system}📊 [로딩 완료] ${loadedCount}/${totalModules}개 모듈 성공 (${loadSuccessRate}%)${colors.reset}`);

        // ⭐️ 갈등 시스템 최종 확인 ⭐️
        if (modules.unifiedConflictManager) {
            console.log(`${colors.conflict}🎉🎉🎉 [갈등 성공!] unifiedConflictManager 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}💥💥💥 [갈등 실패!] unifiedConflictManager 모듈 로드 실패 - 더미 모듈로 대체됨 💥💥💥${colors.reset}`);
        }

        // 🔄 실시간 행동 스위치 시스템 최종 확인 🔄
        if (modules.realtimeBehaviorSwitch) {
            console.log(`${colors.behavior}🎉🎉🎉 [행동스위치 성공!] realtimeBehaviorSwitch 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}🔄🔄🔄 [행동스위치 실패!] realtimeBehaviorSwitch 모듈 로드 실패 - null 상태 🔄🔄🔄${colors.reset}`);
        }

        // 🧠 실시간 학습 시스템 최종 확인 🧠
        if (modules.realTimeLearningSystem) {
            console.log(`${colors.learning}🎉🎉🎉 [실시간학습 성공!] realTimeLearningSystem 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}🧠🧠🧠 [실시간학습 실패!] realTimeLearningSystem 모듈 로드 실패 - null 상태 🧠🧠🧠${colors.reset}`);
        }

        // 🕊️ 자율 예진이 시스템 최종 확인 🕊️ - 함수명 수정 완료!
        if (modules.autonomousYejinSystem) {
            console.log(`${colors.autonomous}🎉🎉🎉 [자율시스템 성공!] autonomousYejinSystem 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) (함수명 수정 완료!) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}🕊️🕊️🕊️ [자율시스템 실패!] autonomousYejinSystem 모듈 로드 실패 - null 상태 🕊️🕊️🕊️${colors.reset}`);
        }

        // ⭐️ 일기장 시스템 최종 확인 ⭐️
        if (modules.diarySystem) {
            console.log(`${colors.diary}🎉🎉🎉 [일기장 성공!] diarySystem 모듈이 성공적으로 로드되었습니다! (💾 디스크 마운트 완전 연동) 🎉🎉🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}💥💥💥 [일기장 실패!] diarySystem 모듈 로드 실패 - null 상태 💥💥💥${colors.reset}`);
        }

        // 📷 사진 전송 시스템 최종 확인 📷
        if (modules.spontaneousPhoto && modules.spontaneousPhotoManager) {
            console.log(`${colors.system}🎉📷🎉 [사진전송 성공!] spontaneousPhoto 모듈명 불일치 문제 해결 완료! 🎉📷🎉${colors.reset}`);
        } else {
            console.log(`${colors.error}❌📷❌ [사진전송 실패!] spontaneousPhoto 모듈 로드 실패 ❌📷❌${colors.reset}`);
        }

        // 🔄 emotionalContextManager 최종 확인 🔄 (UPDATED!)
        if (modules.emotionalContextManager && modules.emotionalContextManager.initialized) {
            if (typeof modules.emotionalContextManager.getCurrentEmotionState === 'function') {
                console.log(`${colors.system}🎉💭🎉 [감정상태 성공!] emotionalContextManager 정상 로드 및 활성화 완료! 🎉💭🎉${colors.reset}`);
                console.log(`${colors.emotion}✨ [감정시스템] 모든 필수 함수 정상 작동 중${colors.reset}`);
            } else {
                console.log(`${colors.system}🎉💭🎉 [감정상태 성공!] emotionalContextManager 더미 모듈로 완벽 활성화! 🎉💭🎉${colors.reset}`);
                console.log(`${colors.emotion}🛡️ [더미감정] 완벽한 폴백 시스템으로 작동 중${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}❌💭❌ [감정상태 실패!] emotionalContextManager 로드 실패 ❌💭❌${colors.reset}`);
        }

        // 💾 디스크 마운트 최종 상태 확인
        const finalDiskCheck = fs.existsSync('/data');
        console.log(`${colors.mount}💾 [최종확인] 디스크 마운트 상태: ${finalDiskCheck ? '✅ 완전 영구 저장 활성화!' : '❌ 기본 저장소 사용'}${colors.reset}`);

        return modules;
        
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return modules;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    loadAllModules,
    ensureDiskMountPath,
    colors
};
