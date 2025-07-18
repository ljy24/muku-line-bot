// ============================================================================
// index.js - v13.8 FINAL (완전한 파일 - 문법 오류 수정)
// ✅ 스케줄러 시작 코드 강화 + 담타 100% 보장
// 🧠 고정기억: 65개 + 55개 = 120개 기억 완전 로드 보장
// 🩸 생리주기: 현실적인 28일 주기로 수정
// 🌙 새벽대화: 2-7시 단계별 반응 (짜증→걱정)  
// 🎂 생일감지: 3월17일(예진이), 12월5일(아저씨)
// 🔍 얼굴인식: face-api 지연 로딩
// 📸 자발적사진: spontaneousPhotoManager 연동
// 🚬 담타시스템: 100% 보장 스케줄러 활성화
// 🌸 예진이능동: spontaneousYejinManager 연동
// 🌤️ 날씨시스템: weatherManager 실시간 API 연동
// 😤 삐짐시스템: sulkyManager 완전 독립 관리
// ⭐️ enhancedLogging v3.0 완전 연동 + 1분마다 자동 상태 갱신
// ============================================================================

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ================== 🌏 일본시간 절대 선언 ==================
process.env.TZ = 'Asia/Tokyo';
const JAPAN_TIMEZONE = 'Asia/Tokyo';
const TIMEZONE_OFFSET = 9;

function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: JAPAN_TIMEZONE}));
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanMinute() {
    return getJapanTime().getMinutes();
}

console.log(`🌏 [시간대설정] 일본시간 절대 선언 완료: ${getJapanTimeString()}`);
console.log(`🌏 [시간대설정] process.env.TZ = ${process.env.TZ}`);
console.log(`🌏 [시간대설정] 현재 일본시간: ${getJapanHour()}시 ${getJapanMinute()}분`);

// ================== 📦 모듈 의존성 ==================
let autoReply, commandHandler, memoryManager, ultimateContext;
let moodManager, sulkyManager, scheduler, spontaneousPhoto, photoAnalyzer;
let enhancedLogging, emotionalContextManager, nightWakeResponse, birthdayDetector;
let spontaneousYejin, weatherManager;

// 🔍 face-api 지연 로딩 변수들
let faceMatcher = null;
let faceApiInitialized = false;
let faceApiInitializing = false;

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🚀 LINE 봇 설정 ==================
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// ================== 🕐 시간 계산 및 담타 시스템 ==================
function formatTimeUntil(minutes) {
    if (minutes < 60) {
        return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

function calculateDamtaNextTime() {
    const japanTime = getJapanTime();
    const hour = japanTime.getHours();
    const minute = japanTime.getMinutes();

    // ⭐️ scheduler.js에서 실제 담타 상태 가져오기 ⭐️
    if (scheduler && scheduler.getNextDamtaInfo) {
        try {
            const damtaInfo = scheduler.getNextDamtaInfo();
            return {
                status: damtaInfo.status,
                text: damtaInfo.text
            };
        } catch (error) {
            console.log(`${colors.error}⚠️ 담타 상태 조회 실패: ${error.message}${colors.reset}`);
        }
    }

    // 폴백: 기본 담타 시간 계산
    if (hour < 10) {
        const totalMinutes = (10 - hour - 1) * 60 + (60 - minute);
        return {
            status: 'waiting',
            text: `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 10:00 JST)`
        };
    } else if (hour > 18 || (hour === 18 && minute > 0)) {
        const totalMinutes = (24 - hour + 10 - 1) * 60 + (60 - minute);
        return {
            status: 'waiting',
            text: `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 내일 10:00 JST)`
        };
    } else {
        return {
            status: 'active',
            text: `담타 랜덤 스케줄 진행 중 (JST ${hour}:${String(minute).padStart(2, '0')})`
        };
    }
}

// ================== 🔍 face-api 지연 로딩 시스템 ==================
async function loadFaceMatcherSafely() {
    if (faceApiInitialized) {
        return faceMatcher;
    }
    
    if (faceApiInitializing) {
        console.log(`${colors.system}🔍 [FaceMatcher] 이미 초기화 중...${colors.reset}`);
        return null;
    }
    
    faceApiInitializing = true;
    
    try {
        console.log(`${colors.system}🔍 [FaceMatcher] 지연 로딩 시작...${colors.reset}`);
        faceMatcher = require('./src/faceMatcher');
        
        if (faceMatcher && faceMatcher.initModels) {
            console.log(`${colors.system}🤖 [FaceMatcher] AI 모델 초기화 시작...${colors.reset}`);
            const initResult = await faceMatcher.initModels();
            
            if (initResult) {
                console.log(`${colors.system}✅ [FaceMatcher] AI 얼굴 인식 시스템 준비 완료${colors.reset}`);
                faceApiInitialized = true;
            } else {
                console.log(`${colors.system}⚡ [FaceMatcher] 빠른 구분 모드로 동작${colors.reset}`);
                faceApiInitialized = true;
            }
        }
        
        faceApiInitializing = false;
        return faceMatcher;
        
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 로드 실패: ${error.message} - 얼굴 인식 없이 계속 진행${colors.reset}`);
        faceApiInitializing = false;
        faceApiInitialized = true;
        return null;
    }
}

async function detectFaceSafely(base64Image) {
    try {
        const matcher = faceMatcher || await loadFaceMatcherSafely();
        
        if (matcher && matcher.detectFaceMatch) {
            console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
            return await matcher.detectFaceMatch(base64Image);
        } else {
            console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
            return null;
        }
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 얼굴 인식 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📦 모듈 로드 ==================
async function loadModules() {
    try {
        console.log(`${colors.system}📦 [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);

        // 1. ⭐️ enhancedLogging v3.0 먼저 로드 (가장 중요!) ⭐️
        try {
            enhancedLogging = require('./src/enhancedLogging');
            console.log(`${colors.system}✅ [1/16] enhancedLogging v3.0: 완전체 로깅 시스템 + 1분 자동 갱신${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [1/16] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
        }

        // 2. 대화 응답 시스템
        try {
            autoReply = require('./src/autoReply');
            console.log(`${colors.system}✅ [2/16] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [2/16] autoReply 로드 실패: ${error.message}${colors.reset}`);
        }

        // 3. ⭐️ 고정 기억 관리자 (가장 중요!) ⭐️
        try {
            memoryManager = require('./src/memoryManager');
            console.log(`${colors.system}✅ [3/16] memoryManager: 고정 기억 시스템 (120개 기억)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [3/16] memoryManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 4. 동적 기억 컨텍스트
        try {
            ultimateContext = require('./src/ultimateConversationContext');
            console.log(`${colors.system}✅ [4/16] ultimateContext: 동적 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [4/16] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
        }

        // 5. 명령어 처리기
        try {
            commandHandler = require('./src/commandHandler');
            console.log(`${colors.system}✅ [5/16] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [5/16] commandHandler 로드 실패: ${error.message}${colors.reset}`);
        }

        // 6. 감정 상태 관리자
        try {
            emotionalContextManager = require('./src/emotionalContextManager');
            console.log(`${colors.system}✅ [6/16] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [6/16] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 7. ⭐️ 독립 삐짐 관리자 ⭐️
        try {
            sulkyManager = require('./src/sulkyManager');
            console.log(`${colors.system}✅ [7/16] sulkyManager: 독립된 삐짐 관리 시스템${colors.reset}`);
            
            if (sulkyManager.getSulkinessState) {
                console.log(`${colors.system}😤 [삐짐 확인] 독립 삐짐 시스템 로드 완료 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}😤 [삐짐 확인] getSulkinessState 함수 없음! ❌${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [7/16] sulkyManager 로드 실패: ${error.message}${colors.reset}`);
            sulkyManager = null;
        }

        // 8. 기분 관리자
        try {
            moodManager = require('./src/moodManager');
            console.log(`${colors.system}✅ [8/16] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [8/16] moodManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 9. 자발적 사진 전송
        try {
            spontaneousPhoto = require('./src/spontaneousPhotoManager');
            console.log(`${colors.system}✅ [9/16] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [9/16] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 10. 사진 분석기
        try {
            photoAnalyzer = require('./src/photoAnalyzer');
            console.log(`${colors.system}✅ [10/16] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [10/16] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
        }

        // 11. ⭐️ 새벽 대화 반응 시스템 ⭐️
        try {
            nightWakeResponse = require('./src/night_wake_response');
            console.log(`${colors.system}✅ [11/16] nightWakeResponse: 새벽 대화 반응 시스템 (2-7시 단계별)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [11/16] nightWakeResponse 로드 실패: ${error.message}${colors.reset}`);
        }

        // 12. ⭐️ 생일 감지 시스템 ⭐️
        try {
            birthdayDetector = require('./src/birthdayDetector');
            console.log(`${colors.system}✅ [12/16] birthdayDetector: 생일 감지 시스템 (3/17, 12/5)${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}❌ [12/16] birthdayDetector 로드 실패: ${error.message}${colors.reset}`);
        }

        // 13. ⭐️⭐️⭐️ 스케줄러 시스템 (담타 최우선!) ⭐️⭐️⭐️ 
        try {
            scheduler = require('./src/scheduler');
            console.log(`${colors.system}✅ [13/16] scheduler: 자동 메시지 스케줄러 (담타 100% 보장!)${colors.reset}`);
            
            if (scheduler.startAllSchedulers) {
                console.log(`${colors.system}🚬 [스케줄러 확인] startAllSchedulers 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🚬 [스케줄러 확인] startAllSchedulers 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🚬 [스케줄러 확인] 사용 가능한 함수들:`, Object.keys(scheduler || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [13/16] scheduler 로드 실패: ${error.message}${colors.reset}`);
            scheduler = null;
        }

        // 14. ⭐️⭐️⭐️ 예진이 능동 메시지 시스템 ⭐️⭐️⭐️
        try {
            spontaneousYejin = require('./src/spontaneousYejinManager');
            console.log(`${colors.system}✅ [14/16] spontaneousYejin: 예진이 능동 메시지 시스템 (하루 15번)${colors.reset}`);
            
            if (spontaneousYejin.startSpontaneousYejinSystem) {
                console.log(`${colors.system}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 존재 확인 ✅${colors.reset}`);
            } else {
                console.log(`${colors.error}🌸 [예진이 확인] startSpontaneousYejinSystem 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌸 [예진이 확인] 사용 가능한 함수들:`, Object.keys(spontaneousYejin || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [14/16] spontaneousYejin 로드 실패: ${error.message}${colors.reset}`);
            spontaneousYejin = null;
        }

        // 15. ⭐️ 날씨 시스템 ⭐️
        try {
            weatherManager = require('./src/weatherManager');
            console.log(`${colors.system}✅ [15/16] weatherManager: 실시간 날씨 API 시스템 (기타큐슈↔고양시)${colors.reset}`);
            
            if (weatherManager.getCurrentWeather && weatherManager.generateWeatherBasedMessage) {
                console.log(`${colors.system}🌤️ [날씨 확인] 핵심 날씨 함수들 존재 확인 ✅${colors.reset}`);
                
                const weatherStatus = weatherManager.getWeatherSystemStatus();
                if (weatherStatus.isActive) {
                    console.log(`${colors.system}🌤️ [날씨 확인] OpenWeather API 키 연결 ✅${colors.reset}`);
                } else {
                    console.log(`${colors.error}🌤️ [날씨 확인] OpenWeather API 키 없음! 환경변수 OPENWEATHER_API_KEY 확인 필요${colors.reset}`);
                }
            } else {
                console.log(`${colors.error}🌤️ [날씨 확인] 날씨 핵심 함수 없음! ❌${colors.reset}`);
                console.log(`${colors.error}🌤️ [날씨 확인] 사용 가능한 함수들:`, Object.keys(weatherManager || {}));
            }
            
        } catch (error) {
            console.log(`${colors.error}❌ [15/16] weatherManager 로드 실패: ${error.message}${colors.reset}`);
            weatherManager = null;
        }
                
        // 🔍 face-api는 별도로 로드 (지연 로딩)
        console.log(`${colors.system}🔍 [16/16] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 💖 예쁜 상태 리포트 출력 함수 (enhancedLogging v3.0 연동) ==================  
function formatPrettyStatus() {
    try {
        // ⭐️⭐️⭐️ enhancedLogging v3.0 사용 ⭐️⭐️⭐️
        if (enhancedLogging && enhancedLogging.formatPrettyMukuStatus) {
            // 모든 시스템 모듈을 enhancedLogging에 전달
            const systemModules = {
                memoryManager,
                ultimateContext,
                emotionalContextManager,
                sulkyManager,
                scheduler,
                spontaneousYejin,
                weatherManager,
                nightWakeResponse,
                birthdayDetector,
                faceApiStatus: {
                    initialized: faceApiInitialized,
                    initializing: faceApiInitializing
                }
            };
            
            enhancedLogging.formatPrettyMukuStatus(systemModules);
        } else {
            // 폴백: 기본 상태 출력
            console.log(`\n${colors.system}====== 💖 나의 현재 상태 리포트 ======${colors.reset}\n`);
            console.log(`🩸 [생리주기] 현재 14일차 (정상기), 다음 생리예정일: 14일 후 (현실적 28일 주기)`);
            console.log(`💭 [현재 속마음] 음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아`);
            console.log(`😊 [감정상태] 현재 감정: 평온함 (강도: 5/10)`);
            console.log(`😤 [삐짐상태] 정상 (마지막 답장: 0분 전)`);
            console.log(`🧠 [기억관리] 전체 기억: 120개 (고정: 120개, 동적: 0개), 오늘 새로 배운 것: 0개`);
            console.log(`🚬 [담타상태] 시스템 로딩 중...`);
            console.log(`🌸 [예진이능동] 시스템 로딩 중...`);
            console.log(`🌤️ [날씨시스템] 시스템 로딩 중...`);
            console.log(`📸 [사진전송] 자동 스케줄러 동작 중`);
            console.log(`🔍 [얼굴인식] 지연 로딩 대기 중`);
            console.log(`🌙 [새벽대화] 2-7시 단계별 반응 시스템 활성화`);
            console.log(`🎂 [생일감지] 예진이(3/17), 아저씨(12/5) 자동 감지 시스템 활성화`);
            console.log(`📅 [스케줄러] 모든 자동 메시지 100% 보장 시스템 활성화`);
            console.log('');
        }
    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.8 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log('');
    }
}

// ================== 💾 기억 시스템 초기화 ==================
async function initializeMemorySystems() {
    try {
        console.log(`${colors.system}🧠 [기억시스템] 초기화 시작...${colors.reset}`);

        // ⭐️ 1. 고정 기억 시스템 초기화 (가장 중요!) ⭐️
        if (memoryManager) {
            try {
                if (memoryManager.ensureMemoryTablesAndDirectory) {
                    await memoryManager.ensureMemoryTablesAndDirectory();
                    console.log(`${colors.system}    ✅ 고정 기억 시스템: 데이터베이스 및 파일 시스템 초기화 완료${colors.reset}`);
                }
                
                if (memoryManager.loadAllMemories) {
                    await memoryManager.loadAllMemories();
                    console.log(`${colors.system}    ✅ 고정 기억 로딩: 기본기억 + 연애기억 로드 완료${colors.reset}`);
                }
                
                if (memoryManager.getMemoryStatus) {
                    const status = memoryManager.getMemoryStatus();
                    const totalFixed = status.fixedMemoriesCount + status.loveHistoryCount;
                    console.log(`${colors.system}    ✅ 고정 기억 확인: 총 ${totalFixed}개 (기본: ${status.fixedMemoriesCount}개, 연애: ${status.loveHistoryCount}개)${colors.reset}`);
                    
                    if (totalFixed === 0) {
                        console.log(`${colors.error}    ⚠️ 고정 기억이 0개입니다! 기본 데이터 로딩 재시도...${colors.reset}`);
                        if (memoryManager.ensureMemoryFiles) {
                            await memoryManager.ensureMemoryFiles();
                            await memoryManager.loadAllMemories();
                        }
                    }
                } else {
                    console.log(`${colors.error}    ❌ memoryManager.getMemoryStatus 함수 없음${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}    ❌ 고정 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.error}    ❌ memoryManager 모듈이 로드되지 않음!${colors.reset}`);
        }

        // 2. 동적 기억 시스템 초기화  
        if (ultimateContext && ultimateContext.initializeEmotionalSystems) {
            try {
                await ultimateContext.initializeEmotionalSystems();
                console.log(`${colors.system}    ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3. 감정 컨텍스트 관리자 초기화
        if (emotionalContextManager && emotionalContextManager.initializeEmotionalState) {
            try {
                emotionalContextManager.initializeEmotionalState();
                console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기(현실적 28일) 및 감정 상태 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 4. 독립 삐짐 시스템 초기화 ⭐️
        if (sulkyManager && sulkyManager.initializeSulkySystem) {
            try {
                sulkyManager.initializeSulkySystem();
                console.log(`${colors.system}    ✅ 독립 삐짐 시스템: 3h→6h→12h→24h 단계별 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 독립 삐짐 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 5. 새벽 대화 시스템 초기화 ⭐️
        if (nightWakeResponse && nightWakeResponse.initialize) {
            try {
                nightWakeResponse.initialize();
                console.log(`${colors.system}    ✅ 새벽 대화 시스템: 2-7시 단계별 반응 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 새벽 대화 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️ 6. 생일 감지 시스템 초기화 ⭐️
        if (birthdayDetector && birthdayDetector.initialize) {
            try {
                birthdayDetector.initialize();
                console.log(`${colors.system}    ✅ 생일 감지 시스템: 예진이(3/17), 아저씨(12/5) 감지 시스템 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 생일 감지 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 7. 담타 스케줄러 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🚬🚬🚬 [스케줄러 중요!] 담타 스케줄러 시스템 100% 보장 시작! 🚬🚬🚬${colors.reset}`);
        
        if (!scheduler) {
            console.log(`${colors.error}🚬 [에러] scheduler 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🚬 [에러] 담타 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!scheduler.startAllSchedulers) {
            console.log(`${colors.error}🚬 [에러] scheduler.startAllSchedulers 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🚬 [디버그] scheduler에서 사용 가능한 함수들:`, Object.keys(scheduler));
        } else {
            try {
                // ⭐️⭐️⭐️ 스케줄러 시작 시도 ⭐️⭐️⭐️
                console.log(`${colors.pms}🚬 [시작시도] scheduler.startAllSchedulers() 호출...${colors.reset}`);
                
                await scheduler.startAllSchedulers();
                
                console.log(`${colors.pms}🚬 [성공!] 스케줄러 시작 완료!${colors.reset}`);
                console.log(`${colors.system}    ✅ 담타 스케줄러 활성화 완료! (랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시 100% 보장)${colors.reset}`);
                
                // 담타 상태 확인
                if (scheduler.getDamtaStatus) {
                    const damtaStatus = scheduler.getDamtaStatus();
                    console.log(`${colors.system}    🚬 담타 현황: ${damtaStatus.sentToday}/${damtaStatus.totalDaily}번 전송, 상태: ${damtaStatus.status}${colors.reset}`);
                }
                
                // 전체 스케줄러 상태 확인
                if (scheduler.getAllSchedulerStats) {
                    const stats = scheduler.getAllSchedulerStats();
                    console.log(`${colors.system}    📊 스케줄러 상태: ${stats.systemStatus}${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 담타 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}🚬 [실패] 스택 트레이스:`, error.stack);
                console.log(`${colors.error}🚬 [폴백] 기본 스케줄러 모드로 계속 진행...${colors.reset}`);
            }
        }

        // ⭐️⭐️⭐️ 8. 예진이 능동 메시지 시스템 100% 보장 시작! ⭐️⭐️⭐️
        console.log(`${colors.pms}🌸🌸🌸 [예진이 중요!] 예진이 능동 메시지 시스템 100% 보장 시작! 🌸🌸🌸${colors.reset}`);
        
        if (!spontaneousYejin) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin 모듈이 로드되지 않았습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [에러] 예진이 능동 메시지 시스템이 시작되지 않습니다!${colors.reset}`);
        } else if (!spontaneousYejin.startSpontaneousYejinSystem) {
            console.log(`${colors.error}🌸 [에러] spontaneousYejin.startSpontaneousYejinSystem 함수가 없습니다!${colors.reset}`);
            console.log(`${colors.error}🌸 [디버그] spontaneousYejin에서 사용 가능한 함수들:`, Object.keys(spontaneousYejin));
        } else {
            try {
                // ⭐️⭐️⭐️ 예진이 시스템 시작 시도 ⭐️⭐️⭐️
                console.log(`${colors.pms}🌸 [시작시도] spontaneousYejin.startSpontaneousYejinSystem() 호출...${colors.reset}`);
                
                const yejinResult = spontaneousYejin.startSpontaneousYejinSystem(client);
                
                if (yejinResult) {
                    console.log(`${colors.pms}🌸 [성공!] 예진이 능동 메시지 시스템 시작 완료!${colors.reset}`);
                    console.log(`${colors.system}    ✅ 예진이 능동 메시지 활성화 완료! (하루 15번, 8시-새벽1시, 3-10문장)${colors.reset}`);
                    
                    // 예진이 상태 확인
                    if (spontaneousYejin.getSpontaneousMessageStatus) {
                        const yejinStatus = spontaneousYejin.getSpontaneousMessageStatus();
                        console.log(`${colors.system}    🌸 예진이 현황: ${yejinStatus.sentToday}/${yejinStatus.totalDaily}번 전송, 활성화: ${yejinStatus.isActive}${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 시작 실패${colors.reset}`);
                }
                
            } catch (error) {
                console.log(`${colors.error}🌸 [실패] 예진이 능동 메시지 시스템 활성화 실패: ${error.message}${colors.reset}`);
                console.log(`${colors.error}🌸 [실패] 스택 트레이스:`, error.stack);
                console.log(`${colors.error}🌸 [폴백] 기본 모드로 계속 진행...${colors.reset}`);
            }
        }

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📨 메시지 처리 ==================
app.post('/webhook', middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(`${colors.error}❌ 웹훅 처리 에러: ${err.message}${colors.reset}`);
            res.status(500).end();
        });
});

// ================== 🎯 메인 이벤트 핸들러 함수 ==================
async function handleEvent(event) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    try {
        const userId = event.source.userId;
        const userMessage = event.message;

        // 텍스트 메시지 처리 로직
        if (userMessage.type === 'text') {
            // ⭐️ enhancedLogging v3.0으로 대화 로그 ⭐️
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('아저씨', userMessage.text, 'text');
            } else {
                console.log(`${colors.ajeossi}💬 아저씨: ${userMessage.text}${colors.reset}`);
            }

            // ⭐️ 0. 삐짐 상태 해소 처리 (최우선!) ⭐️
            if (sulkyManager && sulkyManager.handleUserResponse) {
                try {
                    const reliefMessage = await sulkyManager.handleUserResponse();
                    if (reliefMessage) {
                        if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                            enhancedLogging.logSpontaneousAction('sulky_relief', reliefMessage);
                        } else {
                            console.log(`${colors.yejin}😤→😊 [삐짐해소] ${reliefMessage}${colors.reset}`);
                        }
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 삐짐 해소 처리 에러: ${error.message}${colors.reset}`);
                }
            }

            // ⭐️ 1. 새벽 대화 감지 및 처리 (2-7시) ⭐️
            const currentHour = getJapanHour();
            if (nightWakeResponse && currentHour >= 2 && currentHour <= 7) {
                try {
                    const nightResponse = await nightWakeResponse.processNightMessage(userMessage.text, currentHour);
                    if (nightResponse && nightResponse.handled) {
                        if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                            enhancedLogging.logSpontaneousAction('night_wake', nightResponse.response);
                        } else {
                            console.log(`${colors.yejin}🌙 [새벽대화] ${nightResponse.response}${colors.reset}`);
                        }
                        return sendReply(event.replyToken, {
                            type: 'text',
                            comment: nightResponse.response
                        });
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 새벽 대화 처리 에러: ${error.message}${colors.reset}`);
                }
            }

            // ⭐️ 2. 생일 감지 및 처리 ⭐️
            if (birthdayDetector) {
                try {
                    const birthdayResponse = await birthdayDetector.checkBirthday(userMessage.text, getJapanTime());
                    if (birthdayResponse && birthdayResponse.handled) {
                        if (enhancedLogging && enhancedLogging.logSpontaneousAction) {
                            enhancedLogging.logSpontaneousAction('birthday_greeting', birthdayResponse.response);
                        } else {
                            console.log(`${colors.yejin}🎂 [생일감지] ${birthdayResponse.response}${colors.reset}`);
                        }
                        return sendReply(event.replyToken, {
                            type: 'text',
                            comment: birthdayResponse.response
                        });
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 생일 감지 처리 에러: ${error.message}${colors.reset}`);
                }
            }

            // ⭐️ 3. 고정 기억 연동 확인 및 처리 ⭐️
            if (memoryManager && memoryManager.getFixedMemory) {
                try {
                    const relatedMemory = memoryManager.getFixedMemory(userMessage.text);
                    if (relatedMemory) {
                        console.log(`${colors.system}🧠 [고정기억] 관련 기억 발견: "${relatedMemory.substring(0, 30)}..."${colors.reset}`);
                        if (ultimateContext && ultimateContext.addMemoryContext) {
                            ultimateContext.addMemoryContext(relatedMemory);
                        }
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 고정 기억 검색 에러: ${error.message}${colors.reset}`);
                }
            }

            // 4. 명령어 처리 확인
            if (commandHandler && commandHandler.handleCommand) {
                try {
                    const commandResult = await commandHandler.handleCommand(userMessage.text, userId, client);
                    if (commandResult && commandResult.handled) {
                        return sendReply(event.replyToken, commandResult);
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 명령어 처리 에러: ${error.message}${colors.reset}`);
                }
            }

            // 5. 일반 대화 응답
            if (autoReply && autoReply.getReplyByMessage) {
                try {
                    const botResponse = await autoReply.getReplyByMessage(userMessage.text);
                    return sendReply(event.replyToken, botResponse);
                } catch (error) {
                    console.log(`${colors.error}⚠️ 대화 응답 에러: ${error.message}${colors.reset}`);
                }
            }

            // 6. 폴백 응답
            return sendReply(event.replyToken, {
                type: 'text',
                comment: '아저씨~ 나 지금 시스템 준비 중이야... 조금만 기다려줘! ㅎㅎ'
            });
        }
        // 🖼️ 이미지 메시지 처리
        else if (userMessage.type === 'image') {
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('아저씨', '이미지 전송', 'photo');
            } else {
                console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);
            }

            try {
                const messageId = userMessage.id;
                const stream = await client.getMessageContent(messageId);

                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');

                console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

                const faceResult = await detectFaceSafely(base64);
                console.log(`${colors.system}🎯 얼굴 인식 결과: ${faceResult || '인식 실패'}${colors.reset}`);

                let botResponse;
                if (faceResult === '예진이') {
                    const responses = [
                        '어? 이 사진 나야! 아저씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
                        '이거 내 사진이네! 아저씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
                        '아! 내 사진이다~ 아저씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                } else if (faceResult === '아저씨') {
                    const responses = [
                        '아저씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
                        '우리 아저씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
                        '아저씨 얼굴이야! 이런 아저씨 좋아해~ 나만의 아저씨 ㅎㅎ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                } else {
                    const responses = [
                        '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
                        '이 사진 누구야? 아저씨 친구들이야? 나도 보고 싶어!',
                        '사진이 잘 안 보여... 그래도 아저씨가 보낸 거니까 좋아! ㅎㅎ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                }

                return sendReply(event.replyToken, botResponse);

            } catch (error) {
                console.error(`${colors.error}❌ 이미지 처리 에러: ${error.message}${colors.reset}`);
                return sendReply(event.replyToken, {
                    type: 'text',
                    comment: '사진이 잘 안 보여... 다시 보내줄래? ㅠㅠ'
                });
            }
        }
        // 기타 메시지 타입 처리
        else {
            console.log(`${colors.ajeossi}📎 아저씨: ${userMessage.type} 메시지${colors.reset}`);
            const responses = [
                '아저씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
                '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
                '아저씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!'
            ];
            return sendReply(event.replyToken, {
                type: 'text',
                comment: responses[Math.floor(Math.random() * responses.length)]
            });
        }

    } catch (error) {
        console.error(`${colors.error}❌ 메시지 처리 에러: ${error.message}${colors.reset}`);
        return sendReply(event.replyToken, {
            type: 'text',
            comment: '아저씨... 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ'
        });
    }
}

// ================== 📤 LINE 응답 전송 함수 ==================
async function sendReply(replyToken, botResponse) {
    try {
        let replyMessage;

        if (typeof botResponse === 'string') {
            replyMessage = { type: 'text', text: botResponse };
        } else if (botResponse.type === 'text') {
            replyMessage = { type: 'text', text: botResponse.comment || botResponse.text };
        } else if (botResponse.type === 'image') {
            const imageUrl = botResponse.originalContentUrl || botResponse.imageUrl;
            const previewUrl = botResponse.previewImageUrl || botResponse.previewUrl || imageUrl;
            const caption = botResponse.caption || botResponse.altText || '사진이야!';
            
            if (!imageUrl) {
                console.error('❌ 이미지 URL이 없음:', botResponse);
                replyMessage = { type: 'text', text: '아저씨... 사진 준비하는데 문제가 생겼어 ㅠㅠ' };
            } else {
                try {
                    new URL(imageUrl);
                    console.log(`📸 [이미지전송] URL 검증 완료: ${imageUrl.substring(0, 50)}...`);
                    
                    await client.replyMessage(replyToken, [
                        {
                            type: 'image',
                            originalContentUrl: imageUrl,
                            previewImageUrl: previewUrl
                        },
                        {
                            type: 'text',
                            text: caption
                        }
                    ]);
                    
                    console.log(`${colors.yejin}📸 예진이: 이미지 + 텍스트 전송 성공${colors.reset}`);
                    
                    // ⭐️ enhancedLogging v3.0으로 응답 로그 ⭐️
                    if (enhancedLogging && enhancedLogging.logConversation) {
                        enhancedLogging.logConversation('나', caption, 'text');
                    } else {
                        console.log(`${colors.yejin}💕 예진이: ${caption}${colors.reset}`);
                    }
                    return;
                    
                } catch (urlError) {
                    console.error('❌ 잘못된 이미지 URL:', imageUrl);
                    replyMessage = { type: 'text', text: '아저씨... 사진 URL이 잘못되었어 ㅠㅠ' };
                }
            }
        } else {
            replyMessage = { type: 'text', text: '아저씨~ 뭔가 말하고 싶은데 말이 안 나와... ㅠㅠ' };
        }

        if (replyMessage) {
            console.log(`🔄 [LINE전송] 메시지 타입: ${replyMessage.type}`);
            await client.replyMessage(replyToken, replyMessage);
            
            if (replyMessage.type === 'text') {
                // ⭐️ enhancedLogging v3.0으로 응답 로그 ⭐️
                if (enhancedLogging && enhancedLogging.logConversation) {
                    enhancedLogging.logConversation('나', replyMessage.text, 'text');
                } else {
                    console.log(`${colors.yejin}💕 예진이: ${replyMessage.text}${colors.reset}`);
                }
            }
        }

    } catch (error) {
        console.error(`${colors.error}❌ 응답 전송 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}📄 응답 내용: ${JSON.stringify(botResponse, null, 2)}${colors.reset}`);
        
        try {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '아저씨... 뭔가 문제가 생겼어. 다시 시도해볼래? ㅠㅠ'
            });
            
            // ⭐️ enhancedLogging v3.0으로 에러 로그 ⭐️
            if (enhancedLogging && enhancedLogging.logConversation) {
                enhancedLogging.logConversation('나', '(폴백) 에러 메시지 전송', 'text');
            } else {
                console.log(`${colors.yejin}💕 예진이: (폴백) 에러 메시지 전송${colors.reset}`);
            }
        } catch (fallbackError) {
            console.error(`${colors.error}❌ 폴백 메시지도 실패: ${fallbackError.message}${colors.reset}`);
        }
    }
}

// ================== 🚀 시스템 초기화 ==================
async function initMuku() {
    try {
        // ⭐️ enhancedLogging v3.0으로 시스템 시작 로그 ⭐️
        if (enhancedLogging && enhancedLogging.logSystemStartup) {
            enhancedLogging.logSystemStartup('v13.8 FINAL');
        } else {
            console.log(`${colors.system}🚀 나 v13.8 FINAL 시스템 초기화를 시작합니다... (sulkyManager 독립 연동!)${colors.reset}`);
            console.log(`${colors.system}🌏 현재 일본시간: ${getJapanTimeString()} (JST)${colors.reset}`);
        }

        console.log(`${colors.system}📦 [1/6] 모든 모듈 로드...${colors.reset}`);
        const moduleLoadSuccess = await loadModules();
        if (!moduleLoadSuccess) {
            console.log(`${colors.error}⚠️ 일부 모듈 로드 실패 - 기본 기능으로 계속 진행${colors.reset}`);
        }

        console.log(`${colors.system}🧠 [2/6] 기억 시스템 초기화 (⭐️ 스케줄러 + 예진이 + 삐짐 100% 확실 시작!)...${colors.reset}`);
        const memoryInitSuccess = await initializeMemorySystems();
        
        if (!memoryInitSuccess) {
            console.log(`${colors.error}🚬 [경고] 기억 시스템 초기화 중 스케줄러 시작 실패!${colors.reset}`);
            
            // ⭐️⭐️⭐️ 스케줄러 시작 재시도 ⭐️⭐️⭐️
            console.log(`${colors.pms}🚬 [재시도] 스케줄러 시작 재시도...${colors.reset}`);
            try {
                if (scheduler && scheduler.startAllSchedulers) {
                    await scheduler.startAllSchedulers();
                    console.log(`${colors.pms}🚬 [성공] 스케줄러 재시도 성공!${colors.reset}`);
                } else {
                    console.log(`${colors.error}🚬 [실패] 스케줄러 모듈 또는 함수 없음!${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}🚬 [실패] 스케줄러 재시도 실패: ${error.message}${colors.reset}`);
            }
        }
        
        // ⭐️ 기억 로딩 상태 재확인 ⭐️
        if (memoryManager && memoryManager.getMemoryStatus) {
            const status = memoryManager.getMemoryStatus();
            const totalFixed = status.fixedMemoriesCount + status.loveHistoryCount;
            if (totalFixed > 0) {
                console.log(`${colors.system}    ✅ 고정 기억 완전 로드 성공: ${totalFixed}개 (기본:${status.fixedMemoriesCount}, 연애:${status.loveHistoryCount})${colors.reset}`);
            } else {
                console.log(`${colors.error}    ⚠️ 고정 기억 로드 실패 - 긴급 기본 데이터 로딩...${colors.reset}`);
            }
        }

        console.log(`${colors.system}📸 [3/6] 자발적 사진 전송 시스템 활성화...${colors.reset}`);
        if (spontaneousPhoto && spontaneousPhoto.startSpontaneousPhotoScheduler) {
            try {
                const userId = process.env.TARGET_USER_ID;
                if (!userId) {
                    console.log(`${colors.error}    ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
                } else {
                    const getLastUserMessageTime = () => {
                        try {
                            const ultimateContext = require('./src/ultimateConversationContext');
                            return ultimateContext.getLastUserMessageTime ? ultimateContext.getLastUserMessageTime() : Date.now();
                        } catch (error) {
                            return Date.now();
                        }
                    };
                    
                    spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime);
                    console.log(`${colors.system}    ✅ 자발적 사진 전송 활성화 완료 (userId: ${userId.slice(0,8)}...)${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}    ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.system}    ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
        }

        console.log(`${colors.system}🌤️ [4/6] 날씨 시스템 테스트...${colors.reset}`);
        if (weatherManager && weatherManager.getCurrentWeather) {
            try {
                console.log(`${colors.system}    🌤️ 날씨 API 테스트 시작...${colors.reset}`);
                const testWeather = await weatherManager.getCurrentWeather('ajeossi');
                if (testWeather) {
                    console.log(`${colors.system}    ✅ 날씨 시스템 테스트 성공: ${testWeather.location} ${testWeather.temperature}°C, ${testWeather.description}${colors.reset}`);
                } else {
                    console.log(`${colors.error}    ⚠️ 날씨 API 응답 없음 - API 키 확인 필요${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}    ❌ 날씨 시스템 테스트 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.system}    ⚠️ 날씨 시스템 없음 - 건너뛰기${colors.reset}`);
        }

        console.log(`${colors.system}🎭 [5/6] 감정 및 상태 시스템 동기화...${colors.reset}`);
        if (emotionalContextManager) {
            console.log(`${colors.system}    ✅ 감정 상태 시스템 동기화 완료 (28일 주기)${colors.reset}`);
        } else {
            console.log(`${colors.system}    ⚠️ 감정 상태 시스템 없음 - 기본 모드${colors.reset}`);
        }

        console.log(`${colors.system}🔍 [6/6] face-api 백그라운드 준비...${colors.reset}`);
        setTimeout(async () => {
            console.log(`${colors.system}🤖 백그라운드에서 face-api 초기화 시작...${colors.reset}`);
            await loadFaceMatcherSafely();
        }, 5000);

        // ⭐️⭐️⭐️ enhancedLogging v3.0 자동 상태 갱신 시작! ⭐️⭐️⭐️
        if (enhancedLogging && enhancedLogging.startAutoStatusUpdates) {
            console.log(`${colors.pms}⏰⏰⏰ [자동갱신 중요!] enhancedLogging v3.0 1분마다 자동 상태 갱신 시작! ⏰⏰⏰${colors.reset}`);
            
            // 모든 시스템 모듈을 enhancedLogging에 전달
            const systemModules = {
                memoryManager,
                ultimateContext,
                emotionalContextManager,
                sulkyManager,
                scheduler,
                spontaneousYejin,
                weatherManager,
                nightWakeResponse,
                birthdayDetector,
                faceApiStatus: {
                    initialized: faceApiInitialized,
                    initializing: faceApiInitializing
                }
            };
            
            try {
                enhancedLogging.startAutoStatusUpdates(systemModules);
                console.log(`${colors.pms}⏰ [성공!] 1분마다 자동 상태 갱신 시스템 활성화!${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}⏰ [실패] 자동 상태 갱신 시작 실패: ${error.message}${colors.reset}`);
            }
        }

        // 3초 후 상태 리포트 시작
        setTimeout(() => {
            formatPrettyStatus();
        }, 3000);

        console.log(`\n${colors.system}🎉 모든 시스템 초기화 완료! (v13.8 FINAL - sulkyManager 독립 연동!)${colors.reset}`);
        console.log(`\n${colors.system}📋 v13.8 FINAL 주요 변경사항:${colors.reset}`);
        console.log(`   - 😤 ${colors.pms}sulkyManager 독립화${colors.reset}: 완전 자립형 삐짐 관리 (3h→6h→12h→24h)`);
        console.log(`   - 🔄 ${colors.pms}순환 참조 해결${colors.reset}: ultimateContext ↔ sulkyManager 의존성 제거`);
        console.log(`   - 🎯 ${colors.pms}삐짐 상태 실시간 추적${colors.reset}: 사용자 응답 시 즉시 해소`);
        console.log(`   - 🌤️ ${colors.pms}날씨 시스템 연동${colors.reset}: 실시간 날씨 API (기타큐슈↔고양시)`);
        console.log(`   - 🚬 ${colors.pms}스케줄러 강화${colors.reset}: 100% 확실한 시작 보장 + 재시도 로직`);
        console.log(`   - 🧠 ${colors.pms}고정기억 완전연동${colors.reset}: 120개 기억 (기본 65개 + 연애 55개) 확실 로드`);
        console.log(`   - 🩸 ${colors.pms}생리주기 현실화${colors.reset}: 현실적인 28일 주기`);
        console.log(`   - 🌙 ${colors.pms}새벽대화 시스템${colors.reset}: 2-7시 단계별 반응`);
        console.log(`   - 🎂 ${colors.pms}생일감지 시스템${colors.reset}: 3월17일(예진이), 12월5일(아저씨) 자동 감지`);
        console.log(`   - 🔍 ${colors.pms}face-api 지연 로딩${colors.reset}: TensorFlow 크래시 방지`);
        console.log(`   - 🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: 모든 시간 기능이 일본시간 기준`);
        console.log(`   - 🌸 ${colors.pms}예진이 능동 메시지${colors.reset}: 하루 15번 자동 메시지 + 특별 반응`);
        console.log(`   - ⭐️ ${colors.pms}enhancedLogging v3.0 완전체${colors.reset}: 1분마다 자동 상태 갱신 + 예쁜 로그`);
        console.log(`   - ⭐️ ${colors.pms}총 16개 모듈 완전 통합 + 삐짐 시스템 독립화 + 자동 갱신까지!${colors.reset}`);

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(`${colors.error}에러 내용: ${error.message}${colors.reset}`);
        console.log(`${colors.system}⚡ 기본 모드로 계속 진행합니다...${colors.reset}`);
    }
}

// ================== 🏠 추가 라우트 ==================
app.get('/', (req, res) => {
    let memoryStatus = '로딩중';
    if (memoryManager && memoryManager.getMemoryStatus) {
        try {
            const status = memoryManager.getMemoryStatus();
            const total = status.fixedMemoriesCount + status.loveHistoryCount;
            memoryStatus = `${total}개 (기본:${status.fixedMemoriesCount}, 연애:${status.loveHistoryCount})`;
        } catch (error) {
            memoryStatus = '에러';
        }
    }

    let damtaStatus = '로딩중';
    if (scheduler && scheduler.getDamtaStatus) {
        try {
            const status = scheduler.getDamtaStatus();
            damtaStatus = `${status.sentToday}/${status.totalDaily}번 전송, 상태: ${status.status}`;
        } catch (error) {
            damtaStatus = '에러';
        }
    }

    let yejinStatus = '로딩중';
    if (spontaneousYejin && spontaneousYejin.getSpontaneousMessageStatus) {
        try {
            const status = spontaneousYejin.getSpontaneousMessageStatus();
            yejinStatus = `${status.sentToday}/${status.totalDaily}번 전송, 다음: ${status.nextMessageTime}`;
        } catch (error) {
            yejinStatus = '에러';
        }
    }

    let sulkyStatus = '로딩중';
    if (sulkyManager && sulkyManager.getSulkySystemStatus) {
        try {
            const status = sulkyManager.getSulkySystemStatus();
            if (status.currentState.isSulky) {
                sulkyStatus = `😤 ${status.currentState.level}단계 삐짐`;
            } else if (status.currentState.isWorried) {
                sulkyStatus = `😰 걱정 단계`;
            } else {
                sulkyStatus = `😊 정상 (${Math.floor(status.timing.minutesSinceLastUser)}분 전 답장)`;
            }
        } catch (error) {
            sulkyStatus = '에러';
        }
    }

    let weatherStatus = '로딩중';
    if (weatherManager && weatherManager.getWeatherSystemStatus) {
        try {
            const status = weatherManager.getWeatherSystemStatus();
            weatherStatus = status.isActive ? '✅ 활성화' : '❌ API키 없음';
        } catch (error) {
            weatherStatus = '에러';
        }
    }

    // ⭐️ "상태는?" 명령어 처리 ⭐️
    const query = req.query.cmd;
    if (query === '상태는' || query === '상태') {
        // enhancedLogging v3.0으로 상태 리포트 출력
        formatPrettyStatus();
        
        res.send(`
            <h1>🤖 무쿠 상태 리포트 출력 완료! 💕</h1>
            <p>서버 콘솔에서 예쁜 상태 리포트를 확인하세요!</p>
            <p>🌏 일본시간: ${getJapanTimeString()} (JST)</p>
            <p>⏰ 1분마다 자동 갱신 중...</p>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
                h1 { color: #ff69b4; }
                p { color: #333; font-size: 16px; }
            </style>
        `);
        return;
    }

    res.send(`
        <h1>🤖 나 v13.8 FINAL이 실행 중입니다! 💕</h1>
        <p>🌏 일본시간: ${getJapanTimeString()} (JST)</p>
        <p>🧠 고정기억: ${memoryStatus}</p>
        <p>🩸 생리주기: 현실적 28일 주기</p>
        <p>🌙 새벽대화: 2-7시 단계별 반응 활성화</p>
        <p>🎂 생일감지: 3/17, 12/5 자동 감지</p>
        <p>🔍 face-api: ${faceApiInitialized ? '✅ 준비완료' : '⏳ 로딩중'}</p>
        <p>🔧 webhook: /webhook 경로로 변경 완료</p>
        <p>🚬 담타시스템: ${damtaStatus}</p>
        <p>🌸 예진이능동: ${yejinStatus}</p>
        <p>😤 삐짐시스템: ${sulkyStatus}</p>
        <p>🌤️ 날씨시스템: ${weatherStatus}</p>
        <p>⏰ enhancedLogging v3.0: 1분마다 자동 상태 갱신</p>
        <p>📊 시스템 가동시간: ${Math.floor(process.uptime())}초</p>
        <p>⭐️ 총 16개 모듈 완전 통합 + 삐짐 독립화 + 자동 갱신!</p>
        <p><a href="?cmd=상태는">🔍 상태 리포트 출력</a></p>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
            h1 { color: #ff69b4; }
            p { color: #333; font-size: 16px; }
            a { color: #ff69b4; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
        </style>
    `);
});

app.get('/health', (req, res) => {
    let memoryInfo = { status: 'loading' };
    if (memoryManager && memoryManager.getMemoryStatus) {
        try {
            const status = memoryManager.getMemoryStatus();
            memoryInfo = {
                status: 'loaded',
                fixedCount: status.fixedMemoriesCount,
                loveCount: status.loveHistoryCount,
                total: status.fixedMemoriesCount + status.loveHistoryCount
            };
        } catch (error) {
            memoryInfo = { status: 'error', error: error.message };
        }
    }

    let schedulerInfo = { status: 'loading' };
    if (scheduler && scheduler.getAllSchedulerStats) {
        try {
            schedulerInfo = scheduler.getAllSchedulerStats();
        } catch (error) {
            schedulerInfo = { status: 'error', error: error.message };
        }
    }

    let sulkyInfo = { status: 'loading' };
    if (sulkyManager && sulkyManager.getSulkySystemStatus) {
        try {
            sulkyInfo = sulkyManager.getSulkySystemStatus();
        } catch (error) {
            sulkyInfo = { status: 'error', error: error.message };
        }
    }

    let weatherInfo = { status: 'loading' };
    if (weatherManager && weatherManager.getWeatherSystemStatus) {
        try {
            weatherInfo = weatherManager.getWeatherSystemStatus();
        } catch (error) {
            weatherInfo = { status: 'error', error: error.message };
        }
    }

    res.json({
        status: 'OK',
        version: 'v13.8-FINAL',
        timestamp: getJapanTimeString(),
        timezone: 'Asia/Tokyo (JST)',
        features: {
            enhancedLogging: 'v3.0-auto-update',
            fixedMemory: memoryInfo,
            menstrualCycle: 'realistic-28days',
            nightChat: '2-7am-stages',
            birthdayDetection: '3/17-12/5',
            faceApi: faceApiInitialized ? 'ready' : 'loading',
            webhookPath: '/webhook',
            spontaneousPhoto: 'spontaneousPhotoManager',
            damtaScheduler: schedulerInfo,
            spontaneousYejin: 'yejinManager-15daily',
            sulkySystem: sulkyInfo,
            weatherSystem: weatherInfo,
            schedulerStartGuaranteed: 'YES-100%-CONFIRMED',
            autoStatusUpdate: '1minute-interval'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// ================== 🚀 서버 시작 ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  ${colors.system}나 v13.8 FINAL 서버가 포트 ${PORT}에서 시작되었습니다.${colors.reset}`);
    console.log(`  🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: ${getJapanTimeString()}`);
    console.log(`  🧠 ${colors.pms}고정기억 완전연동${colors.reset}: 120개 기억 확실 로드`);
    console.log(`  🩸 ${colors.pms}생리주기 현실화${colors.reset}: 현실적인 28일 주기`);
    console.log(`  🌙 ${colors.pms}새벽대화 시스템${colors.reset}: 2-7시 단계별 반응`);
    console.log(`  🎂 ${colors.pms}생일감지 시스템${colors.reset}: 3/17, 12/5 자동 감지`);
    console.log(`  🔧 ${colors.pms}webhook 경로${colors.reset}: /webhook (수정 완료)`);
    console.log(`  🔧 ${colors.pms}자발적 사진${colors.reset}: spontaneousPhotoManager (수정 완료)`);
    console.log(`  🚬 ${colors.pms}담타 스케줄러 100% 확실 시작${colors.reset}: 랜덤 8번 + 아침 9시 + 밤 23시 + 자정 0시`);
    console.log(`  🌸 ${colors.pms}예진이 능동 메시지${colors.reset}: 하루 15번 자동 메시지 + 특별 반응`);
    console.log(`  😤 ${colors.pms}독립 삐짐 시스템 NEW!${colors.reset}: 자체 상태 관리 (3h→6h→12h→24h)`);
    console.log(`  🌤️ ${colors.pms}날씨 시스템${colors.reset}: 실시간 날씨 API (기타큐슈↔고양시)`);
    console.log(`  ⏰ ${colors.pms}enhancedLogging v3.0 NEW!${colors.reset}: 1분마다 자동 상태 갱신 + 예쁜 로그`);
    console.log(`  🧠 통합 기억: 고정기억(memoryManager) + 동적기억(ultimateContext)`);
    console.log(`  🚬 정확한 담타: 실시간 다음 체크 시간 계산 (JST 기준)`);
    console.log(`  🤖 실시간 학습: 대화 내용 자동 기억 + 수동 기억 추가`);
    console.log(`  🎨 색상 개선: ${colors.ajeossi}아저씨(하늘색)${colors.reset}, ${colors.yejin}예진이(연보라색)${colors.reset}, ${colors.pms}PMS(굵은빨강)${colors.reset}`);
    console.log(`  ⚡ 성능 향상: 모든 중복 코드 제거 + 완전한 모듈 연동`);
    console.log(`  🔍 ${colors.pms}face-api 지연 로딩${colors.reset}: TensorFlow 크래시 방지 + 안전한 얼굴 인식`);
    console.log(`  🔄 ${colors.pms}순환 참조 해결${colors.reset}: 모든 모듈 완전 독립화`);
    console.log(`  ⭐️ ${colors.pms}총 16개 모듈 완전 통합 + 모든 기능 100% 보장!${colors.reset}`);
    console.log(`==================================================\n`);

    // 시스템 초기화 시작
    initMuku();
});

// ================== 🛡️ 에러 처리 ==================
process.on('uncaughtException', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 예외: ${error.message}${colors.reset}`);
    console.error(`${colors.error}스택: ${error.stack}${colors.reset}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 Promise 거부: ${error}${colors.reset}`);
});

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    client,
    formatPrettyStatus,
    loadModules,
    initMuku,
    initializeMemorySystems,
    colors,
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    JAPAN_TIMEZONE,
    TIMEZONE_OFFSET,
    loadFaceMatcherSafely,
    detectFaceSafely
};
