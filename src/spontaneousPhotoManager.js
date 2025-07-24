// ============================================================================
// spontaneousPhotoManager.js - v5.0 능동메시지 패턴 적용 (안전한 상태 관리)
// 🌸 spontaneousYejinManager.js 패턴을 완전히 적용하여 undefined 문제 해결
// ✅ 단순화된 상태 구조 + 안전한 초기화 + 확실한 영구 저장
// 📅 하루 8건을 8시-23시 동안 균등 분산 (약 1시간 52분 간격)
// 🔄 시스템 재시작 시 남은 할당량에 맞춰 자동 조정
// 💾 서버 리셋해도 진행상황 유지 (영구 저장)
// ⏰ 스케줄: 8:00, 9:52, 11:44, 13:36, 15:28, 17:20, 19:12, 21:04
// 🚨 FIX: undefined/undefined 완전 해결 (능동메시지 패턴)
// ============================================================================

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const fs = require('fs').promises;
const path = require('path');

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const DAILY_PHOTO_TARGET = 8;  // 하루 목표 사진 전송 횟수
const PHOTO_START_HOUR = 8;    // 사진 전송 시작 시간 (오전 8시)
const PHOTO_END_HOUR = 23;     // 사진 전송 종료 시간 (밤 11시)
const TOTAL_HOURS = PHOTO_END_HOUR - PHOTO_START_HOUR; // 15시간

// 💾 영구 저장 경로 (능동메시지 패턴)
const PHOTO_STATUS_FILE = '/data/photo_status.json';

// ================== 🌸 능동메시지 패턴 적용: 단순하고 안전한 상태 관리 ==================
let photoScheduleState = {
    // 🚨 FIX: 단순화된 구조 (능동메시지 패턴)
    sentToday: 0,                              // ← 직접 접근 (중첩 구조 제거)
    totalDaily: DAILY_PHOTO_TARGET,            // ← 직접 접근
    lastScheduleDate: null,                    // ← 능동메시지 패턴
    jobs: [],                                  // ← 능동메시지 패턴
    todaySchedule: [],                         // ← 능동메시지 패턴
    
    // 🌸 실제 통계 추적 (능동메시지 패턴)
    realStats: {
        sentTimes: [],                         // 실제 전송된 시간들
        lastSentTime: null,                    // 마지막 전송 시간
        nextScheduledTime: null,               // 다음 예정 시간
        lastResetDate: null,                   // 마지막 리셋 날짜
        successfulSends: 0,                    // 성공한 전송
        failedSends: 0,                        // 실패한 전송
        photoTypes: {                          // 사진 타입별 통계
            selca: 0,
            couple: 0,
            concept: 0,
            memory: 0
        }
    },
    
    // 전송 이력 (기존 기능 유지)
    sendHistory: {
        sentPhotos: [],
        lastSentTime: null
    }
};

// ================== 🎨 변수들 ==================
let globalClient = null;
let globalUserId = null;
let getLastUserMessageTime = null;

// ================== 🔧 로깅 함수 (능동메시지 패턴) ==================
function photoLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`📸 [${timestamp}] ${message}`);
    if (data) {
        console.log('  📱 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== 💾 능동메시지 패턴: 영구 저장 시스템 ==================

/**
 * 사진 상태를 파일에 저장 (능동메시지 패턴)
 */
async function savePhotoState() {
    try {
        // 디렉토리가 없으면 생성
        const dir = path.dirname(PHOTO_STATUS_FILE);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            photoLog('📁 /data 디렉토리 생성 완료');
        }

        const stateToSave = {
            sentToday: photoScheduleState.sentToday,
            totalDaily: photoScheduleState.totalDaily,
            lastScheduleDate: photoScheduleState.lastScheduleDate,
            realStats: photoScheduleState.realStats,
            todaySchedule: photoScheduleState.todaySchedule.map(item => ({
                index: item.index,
                time: moment.isMoment(item.time) ? item.time.valueOf() : item.time,
                sent: item.sent
            })),
            sendHistory: photoScheduleState.sendHistory,
            lastSaved: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
            version: '5.0'
        };

        await fs.writeFile(PHOTO_STATUS_FILE, JSON.stringify(stateToSave, null, 2));
        photoLog(`💾 사진 상태 저장 완료: ${photoScheduleState.sentToday}/${photoScheduleState.totalDaily}건`);
        return true;
    } catch (error) {
        photoLog(`❌ 사진 상태 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 파일에서 사진 상태 복원 (능동메시지 패턴)
 */
async function loadPhotoState() {
    try {
        const data = await fs.readFile(PHOTO_STATUS_FILE, 'utf8');
        const savedState = JSON.parse(data);
        
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        
        // 오늘 날짜가 맞는지 확인
        if (savedState.lastScheduleDate === today) {
            // 오늘 데이터 복원
            photoScheduleState.sentToday = savedState.sentToday || 0;
            photoScheduleState.totalDaily = savedState.totalDaily || DAILY_PHOTO_TARGET;
            photoScheduleState.lastScheduleDate = savedState.lastScheduleDate;
            
            if (savedState.realStats) {
                photoScheduleState.realStats = { ...photoScheduleState.realStats, ...savedState.realStats };
            }
            
            if (savedState.todaySchedule) {
                photoScheduleState.todaySchedule = savedState.todaySchedule.map(item => ({
                    index: item.index,
                    time: moment(item.time).tz(TIMEZONE),
                    sent: item.sent
                }));
            }
            
            if (savedState.sendHistory) {
                photoScheduleState.sendHistory = savedState.sendHistory;
            }
            
            photoLog(`💾 사진 상태 복원 성공: ${photoScheduleState.sentToday}/${photoScheduleState.totalDaily}건 (${savedState.lastSaved})`);
            return true;
        } else {
            photoLog(`📅 새로운 날 시작 - 이전 데이터: ${savedState.lastScheduleDate}, 오늘: ${today}`);
            return false;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            photoLog('💾 저장된 사진 상태 파일이 없음 - 새로 시작');
        } else {
            photoLog(`❌ 사진 상태 로딩 실패: ${error.message}`);
        }
        return false;
    }
}

// ================== 📅 능동메시지 패턴: 균등 분산 스케줄링 ==================

/**
 * 하루 8건 균등 분산 스케줄 생성 (능동메시지 패턴)
 */
function generateDailyPhotoSchedule() {
    photoLog('📅 균등 분산 사진 스케줄 생성 시작...');
    
    const schedules = [];
    const startHour = PHOTO_START_HOUR; // 8시
    const totalHours = TOTAL_HOURS; // 15시간
    const intervalMinutes = Math.floor((totalHours * 60) / DAILY_PHOTO_TARGET); // 약 112.5분
    
    photoLog(`⏰ 계산된 기본 간격: ${intervalMinutes}분`);
    
    for (let i = 0; i < DAILY_PHOTO_TARGET; i++) {
        // 기본 시간 계산
        const baseMinutes = i * intervalMinutes;
        
        // ±10분 랜덤 변동
        const randomOffset = Math.floor(Math.random() * 21) - 10; // -10 ~ +10분
        const totalMinutes = baseMinutes + randomOffset;
        
        // 시간 계산 (8시부터 시작)
        const hour = startHour + Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        
        // 시간 범위 검증 (8시-23시)
        let finalHour = hour;
        let finalMinute = minute;
        
        if (finalHour >= PHOTO_END_HOUR) {
            finalHour = PHOTO_END_HOUR - 1;
            finalMinute = Math.min(59, finalMinute);
        }
        
        if (finalHour < PHOTO_START_HOUR) {
            finalHour = PHOTO_START_HOUR;
            finalMinute = Math.max(0, finalMinute);
        }
        
        schedules.push({ 
            index: i + 1,
            hour: finalHour, 
            minute: finalMinute,
            sent: false,
            calculatedTime: `${finalHour}:${String(finalMinute).padStart(2, '0')}`
        });
    }
    
    // 시간순 정렬
    schedules.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
    
    photoLog(`✅ 균등 분산 스케줄 ${schedules.length}개 생성 완료`);
    photoLog(`📋 생성된 시간: ${schedules.map(s => s.calculatedTime).join(', ')}`);
    
    return schedules;
}

// ================== 🌸 능동메시지 패턴: 실제 통계 기록 함수들 ==================

/**
 * 실제 사진 전송 기록 (능동메시지 패턴)
 */
function recordActualPhotoSent(photoType = 'selca') {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    
    // 🚨 FIX: 단순화된 상태 업데이트
    photoScheduleState.sentToday++;
    photoScheduleState.realStats.sentTimes.push(timeString);
    photoScheduleState.realStats.lastSentTime = sentTime.valueOf();
    photoScheduleState.realStats.successfulSends++;
    
    if (photoScheduleState.realStats.photoTypes[photoType] !== undefined) {
        photoScheduleState.realStats.photoTypes[photoType]++;
    }
    
    // 다음 메시지 시간 업데이트
    updateNextPhotoTime();
    
    // 💾 상태 저장
    savePhotoState();
    
    photoLog(`📊 실제 통계 기록 완료: ${photoType} (${timeString}) - 총 ${photoScheduleState.sentToday}/${photoScheduleState.totalDaily}건`);
}

/**
 * 사진 전송 실패 기록 (능동메시지 패턴)
 */
function recordPhotoFailed(reason = 'unknown') {
    photoScheduleState.realStats.failedSends++;
    
    // 💾 실패도 저장
    savePhotoState();
    
    photoLog(`📊 전송 실패 기록: ${reason} - 실패 총 ${photoScheduleState.realStats.failedSends}건`);
}

/**
 * 다음 사진 시간 업데이트 (능동메시지 패턴)
 */
function updateNextPhotoTime() {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        const currentTimeMinutes = koreaTime.hour() * 60 + koreaTime.minute();
        
        photoLog(`🔍 [디버그] 현재 시간: ${koreaTime.format('HH:mm')} (${currentTimeMinutes}분)`);
        photoLog(`🔍 [디버그] 오늘 스케줄: ${photoScheduleState.todaySchedule.length}개`);
        
        if (!photoScheduleState.todaySchedule || photoScheduleState.todaySchedule.length === 0) {
            photoLog(`⚠️ [디버그] 스케줄이 비어있음`);
            photoScheduleState.realStats.nextScheduledTime = null;
            return;
        }
        
        // 남은 스케줄 찾기
        const remainingSchedules = photoScheduleState.todaySchedule.filter(schedule => {
            const scheduleMinutes = schedule.hour * 60 + schedule.minute;
            const isRemaining = scheduleMinutes > currentTimeMinutes && !schedule.sent;
            
            photoLog(`🔍 [디버그] 스케줄 ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} - 남음: ${isRemaining}, 전송됨: ${schedule.sent}`);
            
            return isRemaining;
        });
        
        photoLog(`🔍 [디버그] 남은 스케줄: ${remainingSchedules.length}개`);
        
        if (remainingSchedules.length > 0) {
            const nextSchedule = remainingSchedules[0];
            
            // 다음 시간 계산
            const nextTime = moment().tz(TIMEZONE)
                .hour(nextSchedule.hour)
                .minute(nextSchedule.minute)
                .second(0);
            
            // 만약 이미 지난 시간이면 다음날로
            if (nextTime.isBefore(koreaTime)) {
                nextTime.add(1, 'day');
            }
            
            photoScheduleState.realStats.nextScheduledTime = nextTime.valueOf();
            
            photoLog(`✅ 다음 사진 시간 업데이트: ${nextTime.format('HH:mm')} (${nextTime.valueOf()})`);
        } else {
            photoScheduleState.realStats.nextScheduledTime = null;
            photoLog(`⏰ 오늘 스케줄 완료`);
        }
        
    } catch (error) {
        photoLog(`❌ [ERROR] 다음 시간 업데이트 실패: ${error.message}`);
        photoScheduleState.realStats.nextScheduledTime = null;
    }
}

/**
 * 일일 통계 리셋 (능동메시지 패턴)
 */
function resetDailyStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    photoLog('🌄 사진 전송 일일 통계 리셋 시작');
    
    // 🚨 FIX: 단순화된 리셋
    photoScheduleState.sentToday = 0;
    photoScheduleState.totalDaily = DAILY_PHOTO_TARGET;
    photoScheduleState.lastScheduleDate = today;
    
    photoScheduleState.realStats.sentTimes = [];
    photoScheduleState.realStats.lastSentTime = null;
    photoScheduleState.realStats.nextScheduledTime = null;
    photoScheduleState.realStats.lastResetDate = today;
    photoScheduleState.realStats.successfulSends = 0;
    photoScheduleState.realStats.failedSends = 0;
    
    Object.keys(photoScheduleState.realStats.photoTypes).forEach(type => {
        photoScheduleState.realStats.photoTypes[type] = 0;
    });
    
    photoScheduleState.sendHistory.sentPhotos = [];
    photoScheduleState.sendHistory.lastSentTime = null;
    
    // 💾 리셋 후 저장
    savePhotoState();
    
    photoLog(`✅ 일일 통계 리셋 완료 (${today})`);
}

// ================== 📷 사진 전송 함수들 ==================

function getPhotoUrlByType(type) {
    const baseUrl = 'https://photo.de-ji.net/photo';
    const photoData = {
        selca: { path: 'yejin', count: 2032 },
        couple: { path: 'couple', count: 500 },
        concept: { path: 'concept', count: 300 },
        memory: { path: 'memory', count: 200 }
    };
    
    const data = photoData[type] || photoData.selca;
    const index = Math.floor(Math.random() * data.count) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return `${baseUrl}/${data.path}/${fileName}`;
}

function getPhotoMessageByType(type) {
    const messages = {
        selca: ['아저씨~ 나 어때? 💕', '오늘 셀카 찍었어! 😊', '예쁘게 나왔지? 🥰'],
        couple: ['우리 함께 찍은 거야 💕', '이때가 좋았는데... 😊', '아저씨와의 추억이야 💖'],
        concept: ['컨셉 사진이야! 어때? ✨', '이런 스타일 어떨까? 😉', '특별한 하루였어 🌸'],
        memory: ['추억 사진 발견! 💕', '이거 기억나? 😊', '그때가 그립다... 💖']
    };
    
    const typeMessages = messages[type] || messages.selca;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

function selectRandomPhotoType() {
    const types = ['selca', 'couple', 'concept', 'memory'];
    const weights = [40, 30, 20, 10]; // 셀카 40%, 커플 30%, 컨셉 20%, 추억 10%
    
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            return types[i];
        }
    }
    
    return 'selca';
}

async function sendSpontaneousPhoto() {
    try {
        if (!globalClient || !globalUserId) {
            photoLog('❌ 클라이언트 또는 사용자 ID가 설정되지 않음');
            recordPhotoFailed('no_client_or_userid');
            return false;
        }
        
        // 현재 시간이 전송 시간대인지 확인
        const now = moment().tz(TIMEZONE);
        const currentHour = now.hour();
        
        if (currentHour < PHOTO_START_HOUR || currentHour >= PHOTO_END_HOUR) {
            photoLog(`⏰ 전송 시간대 아님 (현재: ${currentHour}시, 전송 가능: ${PHOTO_START_HOUR}-${PHOTO_END_HOUR}시)`);
            scheduleNextPhoto();
            return false;
        }
        
        const photoType = selectRandomPhotoType();
        const imageUrl = getPhotoUrlByType(photoType);
        const message = getPhotoMessageByType(photoType);
        
        const flexMessage = {
            type: 'flex',
            altText: '📸 예진이가 사진을 보냈어요!',
            contents: {
                type: 'bubble',
                hero: {
                    type: 'image',
                    url: imageUrl,
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: message,
                        wrap: true,
                        size: 'md',
                        color: '#333333'
                    }]
                }
            }
        };
        
        await globalClient.pushMessage(globalUserId, flexMessage);
        
        // 🌸 능동메시지 패턴으로 기록
        recordActualPhotoSent(photoType);
        
        // 기존 sendHistory도 유지 (하위 호환성)
        photoScheduleState.sendHistory.lastSentTime = now.valueOf();
        photoScheduleState.sendHistory.sentPhotos.push({
            timestamp: now.valueOf(),
            type: photoType,
            url: imageUrl,
            message: message,
            time: now.format('HH:mm')
        });
        
        // 스케줄에서 해당 사진 완료 표시
        markScheduleCompleted();
        
        photoLog(`📸 사진 전송 성공: ${photoType} (${photoScheduleState.sentToday}/${photoScheduleState.totalDaily})`);
        
        // 다음 사진 스케줄링
        scheduleNextPhoto();
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 사진 전송 실패: ${error.message}`);
        recordPhotoFailed(`send_error: ${error.message}`);
        // 실패해도 다음 스케줄은 유지
        scheduleNextPhoto();
        return false;
    }
}

function markScheduleCompleted() {
    const now = moment().tz(TIMEZONE);
    
    if (!photoScheduleState.todaySchedule || !Array.isArray(photoScheduleState.todaySchedule)) {
        return;
    }
    
    const currentPhoto = photoScheduleState.todaySchedule.find(item => {
        if (!item || typeof item !== 'object') return false;
        return !item.sent && Math.abs((item.hour * 60 + item.minute) - (now.hour() * 60 + now.minute())) < 30;
    });
    
    if (currentPhoto) {
        currentPhoto.sent = true;
        photoLog(`✅ 스케줄 완료: ${currentPhoto.index}번째 사진 (${currentPhoto.hour}:${String(currentPhoto.minute).padStart(2, '0')})`);
    }
}

/**
 * 다음 사진 스케줄링 (능동메시지 패턴)
 */
function scheduleNextPhoto() {
    try {
        // 오늘 할당량 체크
        if (photoScheduleState.sentToday >= photoScheduleState.totalDaily) {
            photoLog('📊 오늘 목표 달성 - 스케줄링 중단');
            photoScheduleState.realStats.nextScheduledTime = null;
            // 💾 상태 저장
            savePhotoState();
            return;
        }
        
        // 다음 시간 업데이트
        updateNextPhotoTime();
        
        if (!photoScheduleState.realStats.nextScheduledTime) {
            photoLog('⏰ 오늘은 더 이상 전송할 사진이 없습니다');
            return;
        }
        
        const nextTime = moment(photoScheduleState.realStats.nextScheduledTime).tz(TIMEZONE);
        
        // 시간 유효성 검증
        const now = moment().tz(TIMEZONE);
        if (nextTime.isBefore(now)) {
            photoLog(`❌ 다음 시간이 과거임: ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`);
            return;
        }
        
        // 기존 스케줄 취소
        if (Array.isArray(photoScheduleState.jobs)) {
            photoScheduleState.jobs.forEach(job => {
                if (job && typeof job.cancel === 'function') {
                    job.cancel();
                }
            });
        }
        photoScheduleState.jobs = [];
        
        // 크론 표현식 생성
        const minute = nextTime.minute();
        const hour = nextTime.hour();
        const date = nextTime.date();
        const month = nextTime.month() + 1;
        
        if (minute < 0 || minute > 59 || hour < 0 || hour > 23 || date < 1 || date > 31 || month < 1 || month > 12) {
            photoLog(`❌ 잘못된 크론 시간: ${hour}:${minute} ${date}/${month}`);
            return;
        }
        
        const cronExpression = `${minute} ${hour} ${date} ${month} *`;
        
        photoLog(`🔧 [디버그] 다음 스케줄 크론: ${cronExpression}`);
        photoLog(`🔧 [디버그] 다음 스케줄 시간: ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`);
        
        const job = schedule.scheduleJob(cronExpression, async () => {
            photoLog(`🚀 [실행] 스케줄된 사진 전송: ${nextTime.format('HH:mm')}`);
            await sendSpontaneousPhoto();
        });
        
        if (job) {
            photoScheduleState.jobs.push(job);
            const timeUntil = formatTimeUntil(nextTime);
            photoLog(`⏰ 다음 사진 예약: ${nextTime.format('HH:mm')} (${timeUntil})`);
            
            // 💾 스케줄 상태 저장
            savePhotoState();
        } else {
            photoLog('❌ 크론 작업 등록 실패');
        }
        
    } catch (error) {
        photoLog(`❌ 스케줄링 실패: ${error.message}`);
        photoLog(`🔧 [디버그] 에러 스택: ${error.stack}`);
    }
}

// ================== 🚨 능동메시지 패턴: 균등 분산 스케줄 생성 함수 ==================

/**
 * 사진 스케줄링 시스템 생성 (능동메시지 패턴)
 */
function generateDailyPhotoSchedule() {
    photoLog(`📸 사진 전송 스케줄 생성 시작...`);
    
    // 기존 작업 취소
    photoScheduleState.jobs.forEach(job => {
        try {
            job.cancel();
            photoLog(`🗑️ [디버그] 기존 job 취소됨`);
        } catch (error) {
            photoLog(`⚠️ [디버그] job 취소 실패: ${error.message}`);
        }
    });
    photoScheduleState.jobs = [];
    photoScheduleState.todaySchedule = [];
    
    // 통계 리셋 확인
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    if (photoScheduleState.realStats.lastResetDate !== today) {
        resetDailyStats();
    }
    photoScheduleState.lastScheduleDate = today;
    
    // 📅 균등 분산 스케줄 생성
    const schedules = generateDailyPhotoSchedule();
    photoScheduleState.todaySchedule = schedules;
    
    // 🚨 스케줄 등록 (에러 처리 강화)
    schedules.forEach((schedule, index) => {
        try {
            const cronExpression = `${schedule.minute} ${schedule.hour} * * *`;
            
            photoLog(`🔧 [디버그] Job 등록 시도: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} (cron: ${cronExpression})`);
            
            const job = require('node-schedule').scheduleJob(cronExpression, async () => {
                photoLog(`🚀 [실행] 스케줄된 시간 도달: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
                await sendSpontaneousPhoto();
            });
            
            if (job) {
                photoScheduleState.jobs.push(job);
                photoLog(`✅ [디버그] Job 등록 성공: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
            } else {
                photoLog(`❌ [디버그] Job 등록 실패: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
            }
            
        } catch (error) {
            photoLog(`❌ [ERROR] 스케줄 등록 실패 (${index}번째): ${error.message}`);
        }
    });
    
    // 다음 메시지 시간 업데이트
    updateNextPhotoTime();
    
    // 💾 스케줄 생성 후 저장
    savePhotoState();
    
    photoLog(`✅ 사진 전송 스케줄 ${schedules.length}개 등록 완료 (등록된 jobs: ${photoScheduleState.jobs.length}개)`);
    photoLog(`📅 오늘 스케줄: ${schedules.map(s => `${s.hour}:${String(s.minute).padStart(2, '0')}`).join(', ')}`);
    photoLog(`⏰ 다음 예정 시간: ${photoScheduleState.realStats.nextScheduledTime ? moment(photoScheduleState.realStats.nextScheduledTime).tz(TIMEZONE).format('HH:mm') : 'undefined'}`);
}

// ================== 🕐 시간 유틸리티 함수들 ==================
function formatTimeUntil(targetTime) {
    try {
        if (!targetTime || !moment.isMoment(targetTime)) {
            if (targetTime) {
                targetTime = moment(targetTime).tz(TIMEZONE);
            } else {
                return '시간 불명';
            }
        }
        
        if (!targetTime.isValid()) {
            return '유효하지 않은 시간';
        }
        
        const now = moment().tz(TIMEZONE);
        const duration = moment.duration(targetTime.diff(now));
        
        if (duration.asMinutes() < 1) {
            return '곧';
        } else if (duration.asMinutes() < 60) {
            return `${Math.ceil(duration.asMinutes())}분 후`;
        } else if (duration.asHours() < 24) {
            const hours = Math.floor(duration.asHours());
            const minutes = Math.ceil(duration.asMinutes() % 60);
            return `${hours}시간 ${minutes}분 후`;
        } else {
            return `${Math.ceil(duration.asDays())}일 후`;
        }
    } catch (error) {
        photoLog(`❌ formatTimeUntil 오류: ${error.message}`);
        return '시간 계산 오류';
    }
}

// ================== 🌸 능동메시지 패턴: 상태 조회 함수 ==================

/**
 * 사진 상태 조회 (능동메시지 패턴 - 완전 안전)
 */
function getPhotoStatus() {
    // 🚨 FIX: nextScheduledTime을 HH:mm 형식으로 정확히 변환
    let nextTime = null;
    try {
        if (photoScheduleState.realStats.nextScheduledTime) {
            const nextMoment = moment(photoScheduleState.realStats.nextScheduledTime).tz(TIMEZONE);
            nextTime = nextMoment.format('HH:mm');
            photoLog(`🔍 [디버그] nextTime 변환: ${photoScheduleState.realStats.nextScheduledTime} → ${nextTime}`);
        } else {
            photoLog(`🔍 [디버그] nextScheduledTime이 null임`);
        }
    } catch (error) {
        photoLog(`❌ [ERROR] nextTime 변환 실패: ${error.message}`);
        nextTime = 'error';
    }
    
    return {
        sent: photoScheduleState.sentToday,        // ← 능동메시지 패턴: 직접 접근 (안전)
        total: photoScheduleState.totalDaily,      // ← 능동메시지 패턴: 직접 접근 (안전)
        nextTime: nextTime,                        // ← 중요! 이 필드가 상태 리포터에서 사용됨
        nextTimeFormatted: nextTime ? formatTimeUntil(moment(photoScheduleState.realStats.nextScheduledTime).tz(TIMEZONE)) : '예약없음',
        isActive: photoScheduleState.jobs.length > 0,
        nextScheduledTime: photoScheduleState.realStats.nextScheduledTime,
        realStats: photoScheduleState.realStats,
        todaySchedule: (photoScheduleState.todaySchedule || []).map(item => ({
            index: item.index,
            time: `${item.hour}:${String(item.minute).padStart(2, '0')}`,
            sent: item.sent
        })),
        // 🚨 FIX: 디버깅 정보 추가
        debug: {
            schedulesCount: photoScheduleState.todaySchedule.length,
            jobsCount: photoScheduleState.jobs.length,
            nextScheduledTimeRaw: photoScheduleState.realStats.nextScheduledTime,
            currentTime: moment().tz(TIMEZONE).format('HH:mm:ss')
        },
        // 💾 저장 상태 정보 추가
        saveStatus: {
            lastScheduleDate: photoScheduleState.lastScheduleDate,
            hasSavedData: !!photoScheduleState.lastScheduleDate
        }
    };
}

function getDetailedPhotoStats() {
    const status = getPhotoStatus();
    const now = moment().tz(TIMEZONE);
    
    return {
        현재시간: now.format('HH:mm'),
        전송상태: `${status.sent || 0}/${status.total || DAILY_PHOTO_TARGET}건 완료`,
        다음전송: status.nextTime || '예약없음',
        남은시간: status.nextTimeFormatted || '예약없음',
        시스템상태: status.isActive ? '활성화' : '비활성화',
        오늘스케줄: status.todaySchedule || [],
        전송이력: (photoScheduleState.sendHistory?.sentPhotos || []).slice(-5),
        오늘전송사진: photoScheduleState.sendHistory?.sentPhotos || [],
    };
}

function getPhotoStatusSummary() {
    const status = getPhotoStatus();
    
    return {
        sent: status.sent || 0,
        total: status.total || DAILY_PHOTO_TARGET,
        nextPhoto: status.nextTime || '예약없음',
        isActive: status.isActive || false
    };
}

// ================== 🧪 테스트 함수들 ==================
async function testPhotoSending() {
    photoLog('🧪 사진 전송 테스트 시작');
    
    try {
        const result = await sendSpontaneousPhoto();
        if (result) {
            photoLog('✅ 테스트 성공: 사진 전송 완료');
        } else {
            photoLog('❌ 테스트 실패: 사진 전송 실패');
        }
        return result;
    } catch (error) {
        photoLog(`❌ 테스트 에러: ${error.message}`);
        return false;
    }
}

async function testScheduling() {
    photoLog('🧪 스케줄링 테스트');
    
    try {
        // 테스트용 짧은 간격 스케줄
        const testTime = moment().tz(TIMEZONE).add(2, 'minutes');
        
        const job = schedule.scheduleJob(testTime.toDate(), async () => {
            await sendSpontaneousPhoto();
        });
        
        if (job) {
            photoLog(`✅ 테스트 스케줄 등록: ${testTime.format('HH:mm:ss')}`);
            return true;
        } else {
            photoLog('❌ 테스트 스케줄 등록 실패');
            return false;
        }
        
    } catch (error) {
        photoLog(`❌ 스케줄링 테스트 에러: ${error.message}`);
        return false;
    }
}

// ================== 🔧 시스템 제어 함수들 (능동메시지 패턴) ==================

/**
 * 자발적 사진 전송 시스템 시작 (능동메시지 패턴)
 */
async function startSpontaneousPhotoScheduler(client, targetUserId, getLastUserMessageTimeFunc) {
    try {
        photoLog('🚀 자발적 사진 전송 시스템 시작...');
        
        // 전역 변수 설정
        globalClient = client;
        globalUserId = targetUserId;
        getLastUserMessageTime = getLastUserMessageTimeFunc;
        
        if (!targetUserId) {
            photoLog('❌ TARGET_USER_ID 없음');
            return false;
        }
        
        // 💾 기존 상태 로딩 시도
        const loadResult = await loadPhotoState();
        if (loadResult) {
            photoLog('✅ 기존 사진 상태 복원 완료 - 스케줄 재구성 중...');
            // 스케줄 재구성 (하지만 sentToday는 유지)
            generateDailyPhotoSchedule();
        } else {
            photoLog('🆕 새로운 사진 상태로 시작 - 스케줄 생성 중...');
            generateDailyPhotoSchedule();
        }
        
        photoLog(`👤 타겟 사용자: ${targetUserId}`);
        photoLog(`📊 현재 상태: ${photoScheduleState.sentToday}/${photoScheduleState.totalDaily}건 전송 완료`);
        
        photoLog('✅ 자발적 사진 전송 시스템 활성화 완료!');
        return true;
    } catch (error) {
        photoLog(`❌ 자발적 사진 전송 시스템 시작 실패: ${error.message}`);
        return false;
    }
}

function stopSpontaneousPhotoScheduler() {
    try {
        photoLog('🛑 자발적 사진 전송 시스템 중지');
        
        // 모든 활성 작업 취소
        if (photoScheduleState.jobs && Array.isArray(photoScheduleState.jobs)) {
            photoScheduleState.jobs.forEach((job, index) => {
                if (job && typeof job.cancel === 'function') {
                    try {
                        job.cancel();
                        photoLog(`📅 스케줄 작업 ${index + 1} 취소됨`);
                    } catch (error) {
                        photoLog(`❌ 스케줄 작업 ${index + 1} 취소 실패: ${error.message}`);
                    }
                }
            });
        }
        
        // 상태 안전 초기화
        photoScheduleState.jobs = [];
        photoScheduleState.realStats.nextScheduledTime = null;
        
        photoLog('✅ 자발적 사진 전송 시스템 중지 완료');
        return true;
        
    } catch (error) {
        photoLog(`❌ 시스템 중지 실패: ${error.message}`);
        return false;
    }
}

async function forceSendPhoto() {
    photoLog('🚀 사진 강제 전송');
    return await sendSpontaneousPhoto();
}

// ================== 🔧 유틸리티 함수들 ==================
function getInternalState() {
    return {
        sentToday: photoScheduleState.sentToday,
        totalDaily: photoScheduleState.totalDaily,
        lastScheduleDate: photoScheduleState.lastScheduleDate,
        jobs: photoScheduleState.jobs.length,
        todaySchedule: photoScheduleState.todaySchedule,
        realStats: photoScheduleState.realStats,
        sendHistory: photoScheduleState.sendHistory,
        globalClient: !!globalClient,
        globalUserId: globalUserId,
        timezone: TIMEZONE
    };
}

function restartScheduling() {
    photoLog('🔄 스케줄링 재시작');
    return generateDailyPhotoSchedule();
}

// ================== 📤 모듈 내보내기 ==================
photoLog('📸 spontaneousPhotoManager.js v5.0 로드 완료 (능동메시지 패턴 적용 - undefined 완전 해결)');

// 🌄 자정 0시마다 새로운 스케줄 생성
schedule.scheduleJob('0 0 * * *', () => {
    photoLog('🌄 자정 0시 - 새로운 하루 시작, 사진 스케줄 재생성');
    resetDailyStats();
    generateDailyPhotoSchedule();
});

module.exports = {
    // 🎯 핵심 시스템 함수들
    startSpontaneousPhotoScheduler,
    stopSpontaneousPhotoScheduler,
    
    // 📸 사진 전송 관련 (⭐️ 라인에서 "상태는?" 명령어용 핵심 함수!)
    getPhotoStatus,              
    getStatus: getPhotoStatus, 
    getDetailedPhotoStats,
    getPhotoStatusSummary,
    
    // 🚀 액션 함수들
    sendSpontaneousPhoto,
    forceSendPhoto,
    
    // ⏰ 스케줄링 관련
    scheduleNextPhoto,
    restartScheduling,
    resetDailyStats,
    generateDailyPhotoSchedule,  // 능동메시지 패턴
    
    // 🧪 테스트 함수들
    testPhotoSending,
    testScheduling,
    
    // 🔧 유틸리티 함수들
    getInternalState,
    formatTimeUntil,
    recordActualPhotoSent,       // 능동메시지 패턴
    recordPhotoFailed,           // 능동메시지 패턴
    updateNextPhotoTime,         // 능동메시지 패턴
    
    // 💾 영구 저장 함수들 (능동메시지 패턴)
    savePhotoState,
    loadPhotoState,
    
    // 📊 통계 관련 (능동메시지 패턴)
    getRealStats: () => ({ ...photoScheduleState.realStats }),
    getScheduleState: () => ({ ...photoScheduleState }),
    photoScheduleState: () => ({
        sentToday: photoScheduleState.sentToday,
        totalDaily: photoScheduleState.totalDaily,
        lastScheduleDate: photoScheduleState.lastScheduleDate,
        jobs: photoScheduleState.jobs.length,
        todaySchedule: photoScheduleState.todaySchedule,
        realStats: photoScheduleState.realStats,
        sendHistory: photoScheduleState.sendHistory
    }),
    
    // 로그 함수
    photoLog
};
