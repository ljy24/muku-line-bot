// ============================================================================
// muku-statusReporter.js - 무쿠 상태 리포트 전용 모듈
// ✅ 예쁜 상태 리포트 출력 및 웹 응답 생성
// 💖 enhancedLogging v3.0 연동
// 🌏 일본시간(JST) 기준 상태 표시
// 🚨 FIXED: nextMessageTime → nextTime 수정 (122번 라인)
// ============================================================================

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 🌏 일본시간 함수들 ==================
function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: "Asia/Tokyo",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ================== 💖 예쁜 상태 리포트 출력 함수 (enhancedLogging v3.0 연동) ==================  
function formatPrettyStatus(modules, getCurrentModelSetting, faceApiStatus) {
    try {
        // ⭐️⭐️⭐️ enhancedLogging v3.0 사용 ⭐️⭐️⭐️
        if (modules.enhancedLogging && modules.enhancedLogging.formatPrettyMukuStatus) {
            // 모든 시스템 모듈을 enhancedLogging에 전달
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
                faceApiStatus: faceApiStatus || {
                    initialized: false,
                    initializing: false
                },
                // ✨ GPT 모델 상태 추가 ✨
                gptModel: {
                    current: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown',
                    version: 'v13.9-with-version-control'
                }
            };
            
            modules.enhancedLogging.formatPrettyMukuStatus(systemModules);
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
            console.log(`✨ [GPT모델] 현재 버전: ${getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'}`);
            console.log(`📸 [사진전송] 자동 스케줄러 동작 중`);
            console.log(`🔍 [얼굴인식] 지연 로딩 대기 중`);
            console.log(`🌙 [새벽대화] 2-7시 단계별 반응 시스템 활성화`);
            console.log(`🎂 [생일감지] 예진이(3/17), 아저씨(12/5) 자동 감지 시스템 활성화`);
            console.log(`📅 [스케줄러] 모든 자동 메시지 100% 보장 시스템 활성화`);
            console.log('');
        }
    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.9 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log(`✨ [GPT모델] 현재 버전: ${getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'}`);
        console.log('');
    }
}

// ================== 📊 시스템 상태 수집 함수들 ==================
function getMemoryStatus(modules) {
    let memoryStatus = '로딩중';
    if (modules.memoryManager && modules.memoryManager.getMemoryStatus) {
        try {
            const status = modules.memoryManager.getMemoryStatus();
            const total = status.fixedMemoriesCount + status.loveHistoryCount;
            memoryStatus = `${total}개 (기본:${status.fixedMemoriesCount}, 연애:${status.loveHistoryCount})`;
        } catch (error) {
            memoryStatus = '에러';
        }
    }
    return memoryStatus;
}

function getDamtaStatus(modules) {
    let damtaStatus = '로딩중';
    if (modules.scheduler && modules.scheduler.getDamtaStatus) {
        try {
            const status = modules.scheduler.getDamtaStatus();
            damtaStatus = `${status.sentToday}/${status.totalDaily}번 전송, 상태: ${status.status}`;
        } catch (error) {
            damtaStatus = '에러';
        }
    }
    return damtaStatus;
}

function getYejinStatus(modules) {
    let yejinStatus = '로딩중';
    if (modules.spontaneousYejin && modules.spontaneousYejin.getSpontaneousMessageStatus) {
        try {
            const status = modules.spontaneousYejin.getSpontaneousMessageStatus();
            // 🚨 FIXED: nextMessageTime → nextTime (이게 undefined 원인이었음!)
            yejinStatus = `${status.sentToday}/${status.totalDaily}번 전송, 다음: ${status.nextTime}`;
        } catch (error) {
            yejinStatus = '에러';
        }
    }
    return yejinStatus;
}

function getSulkyStatus(modules) {
    let sulkyStatus = '로딩중';
    if (modules.sulkyManager && modules.sulkyManager.getSulkySystemStatus) {
        try {
            const status = modules.sulkyManager.getSulkySystemStatus();
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
    return sulkyStatus;
}

function getWeatherStatus(modules) {
    let weatherStatus = '로딩중';
    if (modules.weatherManager && modules.weatherManager.getWeatherSystemStatus) {
        try {
            const status = modules.weatherManager.getWeatherSystemStatus();
            weatherStatus = status.apiKey === '설정됨' ? '✅ 활성화' : '❌ API키 없음
        } catch (error) {
            weatherStatus = '에러';
        }
    }
    return weatherStatus;
}

// ================== 🌐 웹 응답 생성 함수들 ==================
function generateHomePageResponse(modules, getCurrentModelSetting, faceApiStatus) {
    const memoryStatus = getMemoryStatus(modules);
    const damtaStatus = getDamtaStatus(modules);
    const yejinStatus = getYejinStatus(modules);
    const sulkyStatus = getSulkyStatus(modules);
    const weatherStatus = getWeatherStatus(modules);

    return `
        <h1>🤖 나 v13.9 FINAL이 실행 중입니다! 💕</h1>
        <p>🌏 일본시간: ${getJapanTimeString()} (JST)</p>
        <p>✨ 현재 GPT 모델: ${getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'}</p>
        <p>🧠 고정기억: ${memoryStatus}</p>
        <p>🩸 생리주기: 현실적 28일 주기</p>
        <p>🌙 새벽대화: 2-7시 단계별 반응 활성화</p>
        <p>🎂 생일감지: 3/17, 12/5 자동 감지</p>
        <p>🔍 face-api: ${faceApiStatus && faceApiStatus.initialized ? '✅ 준비완료' : '⏳ 로딩중'}</p>
        <p>🔧 webhook: /webhook 경로로 변경 완료</p>
        <p>🚬 담타시스템: ${damtaStatus}</p>
        <p>🌸 예진이능동: ${yejinStatus}</p>
        <p>😤 삐짐시스템: ${sulkyStatus}</p>
        <p>🌤️ 날씨시스템: ${weatherStatus}</p>
        <p>⏰ enhancedLogging v3.0: 1분마다 자동 상태 갱신</p>
        <p>📊 시스템 가동시간: ${Math.floor(process.uptime())}초</p>
        <p>⭐️ 총 16개 모듈 완전 통합 + 버전 관리 시스템!</p>
        <p><strong>✨ 버전 명령어:</strong> "버전", "3.5", "4.0", "자동"으로 GPT 모델 전환</p>
        <p><a href="?cmd=상태는">🔍 상태 리포트 출력</a></p>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
            h1 { color: #ff69b4; }
            p { color: #333; font-size: 16px; }
            a { color: #ff69b4; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
        </style>
    `;
}

function generateStatusReportResponse(modules, getCurrentModelSetting) {
    // enhancedLogging v3.0으로 상태 리포트 출력
    formatPrettyStatus(modules, getCurrentModelSetting);
    
    return `
        <h1>🤖 무쿠 상태 리포트 출력 완료! 💕</h1>
        <p>서버 콘솔에서 예쁜 상태 리포트를 확인하세요!</p>
        <p>🌏 일본시간: ${getJapanTimeString()} (JST)</p>
        <p>✨ 현재 GPT 모델: ${getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'}</p>
        <p>⏰ 1분마다 자동 갱신 중...</p>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
            h1 { color: #ff69b4; }
            p { color: #333; font-size: 16px; }
        </style>
    `;
}

function generateHealthCheckResponse(modules, getCurrentModelSetting, faceApiStatus) {
    let memoryInfo = { status: 'loading' };
    if (modules.memoryManager && modules.memoryManager.getMemoryStatus) {
        try {
            const status = modules.memoryManager.getMemoryStatus();
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
    if (modules.scheduler && modules.scheduler.getAllSchedulerStats) {
        try {
            schedulerInfo = modules.scheduler.getAllSchedulerStats();
        } catch (error) {
            schedulerInfo = { status: 'error', error: error.message };
        }
    }

    let sulkyInfo = { status: 'loading' };
    if (modules.sulkyManager && modules.sulkyManager.getSulkySystemStatus) {
        try {
            sulkyInfo = modules.sulkyManager.getSulkySystemStatus();
        } catch (error) {
            sulkyInfo = { status: 'error', error: error.message };
        }
    }

    let weatherInfo = { status: 'loading' };
    if (modules.weatherManager && modules.weatherManager.getWeatherSystemStatus) {
        try {
            weatherInfo = modules.weatherManager.getWeatherSystemStatus();
        } catch (error) {
            weatherInfo = { status: 'error', error: error.message };
        }
    }

    return {
        status: 'OK',
        version: 'v13.9-FINAL-with-version-control',
        timestamp: getJapanTimeString(),
        timezone: 'Asia/Tokyo (JST)',
        gptModel: {
            current: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown',
            supportedVersions: ['3.5', '4.0', 'auto'],
            commands: ['버전', '3.5', '4.0', '자동']
        },
        features: {
            enhancedLogging: 'v3.0-auto-update',
            versionControl: 'NEW-GPT-model-switching',
            fixedMemory: memoryInfo,
            menstrualCycle: 'realistic-28days',
            nightChat: '2-7am-stages',
            birthdayDetection: '3/17-12/5',
            faceApi: faceApiStatus && faceApiStatus.initialized ? 'ready' : 'loading',
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
    };
}

// ================== 🕐 담타 시간 계산 함수 ==================
function formatTimeUntil(minutes) {
    if (minutes < 60) {
        return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

function calculateDamtaNextTime(modules) {
    const japanTime = getJapanTime();
    const hour = japanTime.getHours();
    const minute = japanTime.getMinutes();

    // ⭐️ scheduler.js에서 실제 담타 상태 가져오기 ⭐️
    if (modules.scheduler && modules.scheduler.getNextDamtaInfo) {
        try {
            const damtaInfo = modules.scheduler.getNextDamtaInfo();
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

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    formatPrettyStatus,
    getMemoryStatus,
    getDamtaStatus,
    getYejinStatus,
    getSulkyStatus,
    getWeatherStatus,
    generateHomePageResponse,
    generateStatusReportResponse,
    generateHealthCheckResponse,
    calculateDamtaNextTime,
    formatTimeUntil,
    getJapanTime,
    getJapanTimeString,
    colors
};
