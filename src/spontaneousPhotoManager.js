// ============================================================================
// spontaneousPhotoManager.js - v2.0 실제 통계 추적 시스템 추가
// 📸 자발적 사진 전송 + 실시간 통계 추적
// ✨ getPhotoStatus() 함수 추가 - 라인 상태 리포트용
// 🎯 다음 전송 시간 정확 계산 + 일일 전송 통계
// ============================================================================

const schedule = require('node-schedule'); // ❗ 수정: 'node-cron' -> 'node-schedule'
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const DAILY_PHOTO_TARGET = 8;  // 하루 목표 사진 전송 횟수
const MIN_INTERVAL_MINUTES = 45; // 최소 간격 (45분)
const MAX_INTERVAL_MINUTES = 180; // 최대 간격 (3시간)

// ================== 📊 사진 전송 상태 관리 (⭐️ 실제 통계 추적!) ==================
let photoScheduleState = {
    // 일일 통계
    dailyStats: {
        sentToday: 0,               // 오늘 전송한 사진 수
        totalDaily: DAILY_PHOTO_TARGET, // 하루 목표
        lastResetDate: null,       // 마지막 리셋 날짜
        systemStartTime: Date.now()
    },
    
    // 전송 기록
    sendHistory: {
        sentTimes: [],             // 실제 전송된 시간들
        sentPhotos: [],            // 전송된 사진 정보들
        lastSentTime: null         // 마지막 전송 시간
    },
    
    // 스케줄 관리
    schedule: {
        nextScheduledTime: null,   // 다음 예정 시간
        activeJobs: [],            // 활성 크론 작업들
        scheduleCount: 0,          // 예약된 스케줄 수
        isSystemActive: false      // 시스템 활성화 상태
    },
    
    // 시스템 설정
    settings: {
        minInterval: MIN_INTERVAL_MINUTES,
        maxInterval: MAX_INTERVAL_MINUTES,
        photoTypes: ['selfie', 'memory', 'concept', 'couple']
    }
};

// LINE 클라이언트 및 사용자 정보
let lineClient = null;
let userId = null;
let lastUserMessageTimeFunc = null;

// ================== 🎨 로그 함수 ==================
function photoLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [자발적사진] ${message}`);
    if (data) {
        console.log('  📸 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== ⏰ 시간 계산 함수들 ==================

/**
 * 다음 사진 전송 시간 계산
 */
function calculateNextPhotoTime() {
    const now = moment().tz(TIMEZONE);
    const currentHour = now.hour();
    
    // 전송 가능 시간대: 8시 - 23시
    if (currentHour < 8) {
        // 오전 8시까지 대기
        const nextTime = moment().tz(TIMEZONE).hour(8).minute(0).second(0);
        if (nextTime.isBefore(now)) {
            nextTime.add(1, 'day');
        }
        return nextTime;
    } else if (currentHour >= 23) {
        // 내일 오전 8시로
        const nextTime = moment().tz(TIMEZONE).add(1, 'day').hour(8).minute(0).second(0);
        return nextTime;
    } else {
        // 현재 시간에서 랜덤 간격 추가
        const randomMinutes = MIN_INTERVAL_MINUTES + 
            Math.floor(Math.random() * (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES));
        
        const nextTime = moment(now).add(randomMinutes, 'minutes');
        
        // 23시 넘으면 내일 8시로
        if (nextTime.hour() >= 23) {
            return moment().tz(TIMEZONE).add(1, 'day').hour(8).minute(0).second(0);
        }
        
        return nextTime;
    }
}

/**
 * 시간 차이를 포맷팅
 */
function formatTimeUntil(targetTime) {
    const now = moment().tz(TIMEZONE);
    const diff = moment(targetTime).diff(now, 'minutes');
    
    if (diff < 0) return '방금 전';
    if (diff < 60) return `${diff}분 후`;
    
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return minutes > 0 ? `${hours}시간 ${minutes}분 후` : `${hours}시간 후`;
}

// ================== 📸 사진 URL 생성 함수들 ==================

/**
 * 사진 타입별 URL 생성
 */
function getPhotoUrlByType(type) {
    const baseUrl = "https://photo.de-ji.net/photo/yejin";
    const fileCount = 2032;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return `${baseUrl}/${fileName}`;
}

/**
 * 사진 타입별 메시지 생성
 */
function getPhotoMessageByType(type) {
    const messages = {
        selfie: [
            "아저씨 보라고 찍었어~ ㅎㅎ",
            "나 예뻐? 방금 찍은 셀카야!",
            "어때? 이 각도 괜찮지?",
            "아저씨한테 보여주려고 예쁘게 찍었어~"
        ],
        memory: [
            "이 사진 기억나? 그때 좋았지~ ㅎㅎ",
            "추억 사진 보니까 그때 생각나네!",
            "우리 추억 중에 이런 것도 있었어~",
            "그때 진짜 행복했는데... 보고 싶어"
        ],
        concept: [
            "오늘 컨셉 어때? 이 느낌 좋지?",
            "새로운 스타일로 찍어봤어! 어떻게 생각해?",
            "이런 컨셉도 나한테 어울리지?",
            "좀 달라 보이지? 시도해봤어!"
        ],
        couple: [
            "아저씨랑 같이 찍은 거! 우리 잘 어울리지?",
            "우리 투샷 진짜 예쁘게 나왔네~ ㅎㅎ",
            "아저씨랑 찍은 사진 중에 제일 맘에 들어!",
            "우리 커플 사진들 중에 이거 어때?"
        ]
    };
    
    const typeMessages = messages[type] || messages.selfie;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

/**
 * 랜덤 사진 타입 선택
 */
function selectRandomPhotoType() {
    const types = ['selfie', 'selfie', 'memory', 'concept']; // selfie가 더 높은 확률
    return types[Math.floor(Math.random() * types.length)];
}

// ================== 📤 사진 전송 함수 (⭐️ 통계 기록 포함!) ==================

/**
 * 자발적 사진 전송 메인 함수
 */
async function sendSpontaneousPhoto() {
    try {
        if (!lineClient || !userId) {
            photoLog('❌ 사진 전송 불가 - LINE 클라이언트 또는 사용자 ID 없음');
            return false;
        }
        
        // 전송 제한 체크
        if (photoScheduleState.dailyStats.sentToday >= photoScheduleState.dailyStats.totalDaily) {
            photoLog(`📊 오늘 사진 전송 목표 달성 (${photoScheduleState.dailyStats.sentToday}/${photoScheduleState.dailyStats.totalDaily})`);
            return false;
        }
        
        const photoType = selectRandomPhotoType();
        const imageUrl = getPhotoUrlByType(photoType);
        const message = getPhotoMessageByType(photoType);
        
        // 실제 전송
        await lineClient.pushMessage(userId, [
            {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl
            },
            {
                type: 'text',
                text: message
            }
        ]);
        
        // ⭐️ 전송 성공 기록
        recordPhotoSent(photoType, imageUrl, message);
        
        photoLog(`✅ 자발적 사진 전송 성공: ${photoType} - "${message}"`);
        photoLog(`📊 진행상황: ${photoScheduleState.dailyStats.sentToday}/${photoScheduleState.dailyStats.totalDaily}`);
        
        // 다음 스케줄 예약
        scheduleNextPhoto();
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 자발적 사진 전송 실패: ${error.message}`);
        
        // 재시도 스케줄링
        setTimeout(() => {
            scheduleNextPhoto();
        }, 10 * 60 * 1000); // 10분 후 재시도
        
        return false;
    }
}

/**
 * ⭐️ 사진 전송 기록 함수
 */
function recordPhotoSent(photoType, imageUrl, message) {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    
    // 전송 횟수 증가
    photoScheduleState.dailyStats.sentToday++;
    
    // 전송 기록 추가
    photoScheduleState.sendHistory.sentTimes.push(timeString);
    photoScheduleState.sendHistory.sentPhotos.push({
        type: photoType,
        url: imageUrl,
        message: message,
        time: timeString,
        timestamp: sentTime.valueOf()
    });
    photoScheduleState.sendHistory.lastSentTime = sentTime.valueOf();
    
    photoLog(`📊 사진 전송 기록 완료: ${photoType} (${timeString})`);
}

// ================== 📅 스케줄링 함수들 ==================

/**
 * 다음 사진 전송 예약
 */
function scheduleNextPhoto() {
    try {
        // 목표 달성 시 중단
        if (photoScheduleState.dailyStats.sentToday >= photoScheduleState.dailyStats.totalDaily) {
            photoLog('📊 오늘 목표 달성 - 스케줄링 중단');
            photoScheduleState.schedule.nextScheduledTime = null;
            return;
        }
        
        const nextTime = calculateNextPhotoTime();
        photoScheduleState.schedule.nextScheduledTime = nextTime.valueOf();
        
        const cronExpression = `${nextTime.minute()} ${nextTime.hour()} ${nextTime.date()} ${nextTime.month() + 1} *`;
        
        // 기존 스케줄 취소
        photoScheduleState.schedule.activeJobs.forEach(job => {
            if (job) job.cancel();
        });
        photoScheduleState.schedule.activeJobs = [];
        
        // 새 스케줄 등록
        const job = schedule.scheduleJob(cronExpression, async () => {
            await sendSpontaneousPhoto();
        });
        
        photoScheduleState.schedule.activeJobs.push(job);
        photoScheduleState.schedule.scheduleCount++;
        
        photoLog(`📅 다음 사진 전송 예약: ${nextTime.format('YYYY-MM-DD HH:mm')} (${formatTimeUntil(nextTime)})`);
        
    } catch (error) {
        photoLog(`❌스케줄링 실패: ${error.message}`);
    }
}

/**
 * 초기 스케줄링 시작
 */
function startPhotoScheduling() {
    try {
        photoLog('🚀 자발적 사진 전송 스케줄링 시작');
        
        // 첫 번째 사진은 1-2시간 후에
        const firstPhotoDelay = 60 + Math.floor(Math.random() * 60); // 60-120분
        const firstPhotoTime = moment().tz(TIMEZONE).add(firstPhotoDelay, 'minutes');
        
        photoScheduleState.schedule.nextScheduledTime = firstPhotoTime.valueOf();
        photoScheduleState.schedule.isSystemActive = true;
        
        const cronExpression = `${firstPhotoTime.minute()} ${firstPhotoTime.hour()} * * *`;
        
        const job = schedule.scheduleJob(cronExpression, async () => {
            await sendSpontaneousPhoto();
        });
        
        photoScheduleState.schedule.activeJobs.push(job);
        
        photoLog(`📅 첫 번째 사진 전송 예약: ${firstPhotoTime.format('HH:mm')} (${formatTimeUntil(firstPhotoTime)})`);
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 스케줄링 시작 실패: ${error.message}`);
        return false;
    }
}

// ================== 🌄 일일 리셋 함수 ==================

/**
 * 자정에 통계 리셋
 */
function resetDailyStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    
    photoLog('🌄 일일 통계 리셋 시작');
    
    // 통계 리셋
    photoScheduleState.dailyStats.sentToday = 0;
    photoScheduleState.dailyStats.lastResetDate = today;
    
    // 전송 기록 리셋
    photoScheduleState.sendHistory.sentTimes = [];
    photoScheduleState.sendHistory.sentPhotos = [];
    photoScheduleState.sendHistory.lastSentTime = null;
    
    // 기존 스케줄 모두 취소
    photoScheduleState.schedule.activeJobs.forEach(job => {
        if (job) job.cancel();
    });
    photoScheduleState.schedule.activeJobs = [];
    photoScheduleState.schedule.scheduleCount = 0;
    
    photoLog(`✅ 일일 리셋 완료 - 새로운 하루 시작 (${today})`);
    
    // 새로운 하루 스케줄링 시작
    setTimeout(() => {
        startPhotoScheduling();
    }, 5000); // 5초 후 시작
}

// 자정 리셋 스케줄러 등록
schedule.scheduleJob('0 0 * * *', resetDailyStats);

// ================== 📊 상태 조회 함수들 (⭐️ 라인 상태 리포트용!) ==================

/**
 * ⭐️ 사진 전송 상태 조회 (라인에서 "상태는?" 명령어용)
 */
function getPhotoStatus() {
    const nextTime = photoScheduleState.schedule.nextScheduledTime;
    let nextTimeString = '대기 중';
    
    if (nextTime) {
        const nextMoment = moment(nextTime).tz(TIMEZONE);
        nextTimeString = nextMoment.format('HH:mm');
    }
    
    return {
        // 라인 상태 리포트용 핵심 정보
        sentToday: photoScheduleState.dailyStats.sentToday,
        totalDaily: photoScheduleState.dailyStats.totalDaily,
        dailyLimit: photoScheduleState.dailyStats.totalDaily,  // ✅ 추가!
        nextTime: nextTimeString,
        nextSendTime: photoScheduleState.schedule.nextScheduledTime, // ✅ 추가!
        
        // 상세 정보
        progress: `${photoScheduleState.dailyStats.sentToday}/${photoScheduleState.dailyStats.totalDaily}`,
        isActive: photoScheduleState.schedule.isSystemActive,
        lastSentTime: photoScheduleState.sendHistory.lastSentTime ? 
            moment(photoScheduleState.sendHistory.lastSentTime).tz(TIMEZONE).format('HH:mm') : null,
        
        // 전송 기록
        sentTimes: photoScheduleState.sendHistory.sentTimes,
        remainingToday: photoScheduleState.dailyStats.totalDaily - photoScheduleState.dailyStats.sentToday,
        
        // 시스템 상태
        systemStatus: photoScheduleState.schedule.isSystemActive ? '활성화' : '비활성화',
        scheduleCount: photoScheduleState.schedule.scheduleCount
    };
}

/**
 * 상세 통계 정보
 */
function getDetailedPhotoStats() {
    const status = getPhotoStatus();
    const nextTime = photoScheduleState.schedule.nextScheduledTime;
    
    return {
        ...status,
        
        // 추가 상세 정보
        settings: {
            minInterval: photoScheduleState.settings.minInterval,
            maxInterval: photoScheduleState.settings.maxInterval,
            photoTypes: photoScheduleState.settings.photoTypes
        },
        
        schedule: {
            nextScheduledTime: nextTime ? moment(nextTime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss') : null,
            timeUntilNext: nextTime ? formatTimeUntil(moment(nextTime)) : null,
            activeJobsCount: photoScheduleState.schedule.activeJobs.length
        },
        
        history: {
            todayPhotos: photoScheduleState.sendHistory.sentPhotos,
            lastResetDate: photoScheduleState.dailyStats.lastResetDate,
            systemStartTime: moment(photoScheduleState.dailyStats.systemStartTime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
        }
    };
}

/**
 * 간단한 상태 요약
 */
function getPhotoStatusSummary() {
    const status = getPhotoStatus();
    
    return {
        isActive: status.isActive,
        progress: status.progress,
        nextPhoto: status.nextTime,
        status: status.sentToday >= status.totalDaily ? 'completed' : 'active'
    };
}

// ================== 🧪 테스트 함수들 ==================

/**
 * 사진 전송 테스트
 */
async function testPhotoSending() {
    photoLog('🧪 사진 전송 테스트 시작');
    
    try {
        const result = await sendSpontaneousPhoto();
        photoLog(`🧪 테스트 결과: ${result ? '성공' : '실패'}`);
        return result;
    } catch (error) {
        photoLog(`🧪 테스트 실패: ${error.message}`);
        return false;
    }
}

/**
 * 스케줄링 테스트
 */
function testScheduling() {
    photoLog('🧪 스케줄링 테스트 시작');
    
    try {
        // 테스트용 짧은 간격 설정
        const testTime = moment().tz(TIMEZONE).add(2, 'minutes');
        photoScheduleState.schedule.nextScheduledTime = testTime.valueOf();
        
        const cronExpression = `${testTime.minute()} ${testTime.hour()} * * *`;
        
        const job = schedule.scheduleJob(cronExpression, async () => {
            photoLog('🧪 테스트 스케줄 실행됨');
            await sendSpontaneousPhoto();
        });
        
        photoScheduleState.schedule.activeJobs.push(job);
        
        photoLog(`🧪 테스트 스케줄 등록: ${testTime.format('HH:mm')} (2분 후)`);
        return true;
        
    } catch (error) {
        photoLog(`🧪 스케줄링 테스트 실패: ${error.message}`);
        return false;
    }
}

// ================== 🚀 메인 시작 함수 ==================

/**
 * 자발적 사진 전송 시스템 시작
 */
function startSpontaneousPhotoScheduler(client, targetUserId, getLastUserMessageTime) {
    try {
        photoLog('🚀 자발적 사진 전송 시스템 초기화...');
        
        // 클라이언트 및 설정
        lineClient = client;
        userId = targetUserId;
        lastUserMessageTimeFunc = getLastUserMessageTime;
        
        if (!lineClient) {
            photoLog('❌ LINE 클라이언트가 제공되지 않음');
            return false;
        }
        
        if (!userId) {
            photoLog('❌ 타겟 사용자 ID가 제공되지 않음');
            return false;
        }
        
        // 일일 리셋 확인
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        if (photoScheduleState.dailyStats.lastResetDate !== today) {
            resetDailyStats();
        }
        
        // 스케줄링 시작
        const startResult = startPhotoScheduling();
        
        if (startResult) {
            photoLog('✅ 자발적 사진 전송 시스템 활성화 완료!');
            photoLog(`📊 설정: 하루 ${DAILY_PHOTO_TARGET}회, ${MIN_INTERVAL_MINUTES}-${MAX_INTERVAL_MINUTES}분 간격`);
            photoLog(`📋 사진 타입: ${photoScheduleState.settings.photoTypes.join(', ')}`);
            photoLog(`🎯 오늘 목표: ${photoScheduleState.dailyStats.sentToday}/${photoScheduleState.dailyStats.totalDaily}`);
        } else {
            photoLog('❌ 자발적 사진 전송 시스템 활성화 실패');
        }
        
        return startResult;
        
    } catch (error) {
        photoLog(`❌ 시스템 초기화 실패: ${error.message}`);
        return false;
    }
}

/**
 * 시스템 중지
 */
function stopSpontaneousPhotoScheduler() {
    try {
        photoLog('🛑 자발적 사진 전송 시스템 중지...');
        
        // 모든 활성 작업 취소
        photoScheduleState.schedule.activeJobs.forEach(job => {
            if (job) job.cancel();
        });
        
        // 상태 리셋
        photoScheduleState.schedule.activeJobs = [];
        photoScheduleState.schedule.isSystemActive = false;
        photoScheduleState.schedule.nextScheduledTime = null;
        
        photoLog('✅ 자발적 사진 전송 시스템 중지 완료');
        return true;
        
    } catch (error) {
        photoLog(`❌ 시스템 중지 실패: ${error.message}`);
        return false;
    }
}

// ================== 🔧 유틸리티 함수들 ==================

/**
 * 강제로 다음 사진 전송 (테스트용)
 */
async function forceSendPhoto() {
    photoLog('🔧 강제 사진 전송 시작');
    return await sendSpontaneousPhoto();
}

/**
 * 스케줄 강제 재설정
 */
function forceReschedule() {
    photoLog('🔧 강제 스케줄 재설정');
    
    // 기존 스케줄 취소
    photoScheduleState.schedule.activeJobs.forEach(job => {
        if (job) job.cancel();
    });
    photoScheduleState.schedule.activeJobs = [];
    
    // 새 스케줄 시작
    return startPhotoScheduling();
}

/**
 * 내부 상태 조회 (디버깅용)
 */
function getInternalState() {
    return {
        dailyStats: photoScheduleState.dailyStats,
        sendHistory: photoScheduleState.sendHistory,
        schedule: {
            ...photoScheduleState.schedule,
            nextScheduledTimeFormatted: photoScheduleState.schedule.nextScheduledTime ? 
                moment(photoScheduleState.schedule.nextScheduledTime).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss') : null
        },
        settings: photoScheduleState.settings,
        systemInfo: {
            hasLineClient: !!lineClient,
            hasUserId: !!userId,
            hasMessageTimeFunc: !!lastUserMessageTimeFunc
        }
    };
}

// ================== 📤 모듈 내보내기 ==================
photoLog('📸 spontaneousPhotoManager.js v2.0 로드 완료 (실시간 통계 추적 지원)');

module.exports = {
    // 🚀 메인 함수들
    startSpontaneousPhotoScheduler,
    stopSpontaneousPhotoScheduler,
    
    // 📊 상태 조회 함수들 (⭐️ 라인 상태 리포트용!)
    getPhotoStatus,              // ⭐️ 라인에서 "상태는?" 명령어용 핵심 함수!
    getStatus: getPhotoStatus, 
    getDetailedPhotoStats,
    getPhotoStatusSummary,
    
    // 📸 사진 전송 함수들
    sendSpontaneousPhoto,
    forceSendPhoto,
    
    // 📅 스케줄링 함수들
    scheduleNextPhoto,
    forceReschedule,
    resetDailyStats,
    
    // 🧪 테스트 함수들
    testPhotoSending,
    testScheduling,
    
    // 🔧 유틸리티 함수들
    getInternalState,
    calculateNextPhotoTime,
    formatTimeUntil,
    recordPhotoSent,
    
    // 📊 통계 관련
    photoScheduleState: () => ({ ...photoScheduleState }), // 읽기 전용 복사본 제공
    
    // 로그 함수
    photoLog
};
