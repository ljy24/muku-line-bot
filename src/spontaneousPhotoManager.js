// ============================================================================
// spontaneousPhotoManager.js - v4.0 영구 저장 + 균등 분산 스케줄링 시스템
// ✅ 몰아서 오는 문제 완전 해결!
// 📅 하루 8건을 8시-23시 동안 균등 분산 (약 1시간 52분 간격)
// 🔄 시스템 재시작 시 남은 할당량에 맞춰 자동 조정
// 💾 서버 리셋해도 진행상황 유지 (영구 저장)
// ⏰ 스케줄: 8:00, 9:52, 11:44, 13:36, 15:28, 17:20, 19:12, 21:04
// ============================================================================

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const DAILY_PHOTO_TARGET = 8;  // 하루 목표 사진 전송 횟수
const PHOTO_START_HOUR = 8;    // 사진 전송 시작 시간 (오전 8시)
const PHOTO_END_HOUR = 23;     // 사진 전송 종료 시간 (밤 11시)
const TOTAL_HOURS = PHOTO_END_HOUR - PHOTO_START_HOUR; // 15시간

// ================== 💾 영구 저장 경로 ==================
const DATA_DIR = '/data';
const PHOTO_STATE_FILE = path.join(DATA_DIR, 'photo_status.json');

// 디렉토리 확인 및 생성
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ================== 📊 사진 전송 상태 관리 ==================
let photoScheduleState = {
    // 일일 통계
    dailyStats: {
        sentToday: 0,
        totalDaily: DAILY_PHOTO_TARGET,
        lastResetDate: moment().tz(TIMEZONE).format('YYYY-MM-DD'),
    },
    
    // 스케줄 관리
    schedule: {
        isSystemActive: false,
        nextScheduledTime: null,
        activeJobs: [],
        dailySchedule: [], // 하루 전체 스케줄
    },
    
    // 전송 이력
    sendHistory: {
        sentPhotos: [],
        lastSentTime: null,
    }
};

// ================== 🎨 변수들 ==================
let globalClient = null;
let globalUserId = null;
let getLastUserMessageTime = null;

// ================== 🔧 로깅 함수 ==================
function photoLog(message) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`📸 [${timestamp}] ${message}`);
}

// ================== 💾 영구 저장 함수들 ==================

/**
 * 사진 상태를 파일에 저장
 */
function savePhotoState() {
    try {
        const stateData = {
            dailyStats: photoScheduleState.dailyStats || {
                sentToday: 0,
                totalDaily: DAILY_PHOTO_TARGET,
                lastResetDate: moment().tz(TIMEZONE).format('YYYY-MM-DD')
            },
            sendHistory: photoScheduleState.sendHistory || {
                sentPhotos: [],
                lastSentTime: null
            },
            schedule: {
                isSystemActive: photoScheduleState.schedule?.isSystemActive || false,
                nextScheduledTime: photoScheduleState.schedule?.nextScheduledTime || null,
                // 🚨 FIX: 스케줄 저장 시 moment 객체를 JSON 호환 형태로 변환
                dailySchedule: (photoScheduleState.schedule?.dailySchedule || []).map(item => {
                    if (!item || typeof item !== 'object') return null;
                    
                    try {
                        const timeValue = moment.isMoment(item.time) ? item.time.valueOf() : moment(item.time).valueOf();
                        return {
                            index: item.index || 0,
                            time: timeValue, // timestamp로 저장
                            sent: !!item.sent
                        };
                    } catch (error) {
                        photoLog(`❌ 스케줄 저장 실패 (인덱스 ${item.index}): ${error.message}`);
                        return null;
                    }
                }).filter(item => item !== null),
                activeJobs: [] // 작업은 저장하지 않음 (재시작 시 재생성)
            },
            lastSaved: moment().tz(TIMEZONE).valueOf()
        };
        
        fs.writeFileSync(PHOTO_STATE_FILE, JSON.stringify(stateData, null, 2), 'utf8');
        photoLog(`💾 사진 상태 저장 완료: ${stateData.dailyStats.sentToday}/${stateData.dailyStats.totalDaily}건`);
        return true;
    } catch (error) {
        photoLog(`❌ 사진 상태 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 파일에서 사진 상태 복원
 */
function loadPhotoState() {
    try {
        if (!fs.existsSync(PHOTO_STATE_FILE)) {
            photoLog('📂 저장된 사진 상태 없음 - 새로 시작');
            return false;
        }
        
        const data = fs.readFileSync(PHOTO_STATE_FILE, 'utf8');
        const stateData = JSON.parse(data);
        
        // 날짜 확인 - 오늘이 아니면 리셋
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        if (stateData.dailyStats.lastResetDate !== today) {
            photoLog(`📅 날짜 변경됨 (${stateData.dailyStats.lastResetDate} → ${today}) - 새로 시작`);
            return false;
        }
        
        // 상태 복원
        photoScheduleState.dailyStats = stateData.dailyStats || {
            sentToday: 0,
            totalDaily: DAILY_PHOTO_TARGET,
            lastResetDate: today
        };
        photoScheduleState.sendHistory = stateData.sendHistory || {
            sentPhotos: [],
            lastSentTime: null
        };
        
        // 🚨 FIX: 스케줄 복원 시 moment 객체 변환
        if (stateData.schedule && stateData.schedule.dailySchedule) {
            const restoredSchedule = stateData.schedule.dailySchedule.map(item => ({
                index: item.index,
                time: moment(item.time).tz(TIMEZONE), // timestamp에서 moment 객체로 변환
                sent: item.sent
            }));
            photoScheduleState.schedule = {
                isSystemActive: stateData.schedule.isSystemActive || false,
                nextScheduledTime: stateData.schedule.nextScheduledTime || null,
                dailySchedule: restoredSchedule,
                activeJobs: [] // 작업은 복원하지 않음
            };
        } else {
            photoScheduleState.schedule = {
                isSystemActive: false,
                nextScheduledTime: null,
                activeJobs: [],
                dailySchedule: []
            };
        }
        
        photoLog(`🔄 사진 상태 복원 완료: ${photoScheduleState.dailyStats.sentToday}/${DAILY_PHOTO_TARGET}건`);
        photoLog(`📂 마지막 저장: ${moment(stateData.lastSaved).tz(TIMEZONE).format('HH:mm:ss')}`);
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 사진 상태 복원 실패: ${error.message}`);
        return false;
    }
}

// ================== ⏰ 균등 분산 스케줄링 함수들 ==================

/**
 * 하루 8건 균등 분산 스케줄 생성
 */
function generateDailyPhotoSchedule() {
    try {
        // 이미 스케줄이 있으면 재사용 (복원된 경우)
        if (photoScheduleState.schedule.dailySchedule.length > 0) {
            photoLog(`📅 기존 스케줄 사용: ${photoScheduleState.schedule.dailySchedule.length}건`);
            return photoScheduleState.schedule.dailySchedule;
        }
        
        const schedule = [];
        const intervalMinutes = (TOTAL_HOURS * 60) / DAILY_PHOTO_TARGET; // 약 112.5분 (1시간 52분)
        
        photoLog(`⏰ 계산된 기본 간격: ${Math.floor(intervalMinutes)}분`);
        
        for (let i = 0; i < DAILY_PHOTO_TARGET; i++) {
            const scheduleTime = moment().tz(TIMEZONE)
                .hour(PHOTO_START_HOUR)
                .minute(0)
                .second(0)
                .add(Math.floor(intervalMinutes * i), 'minutes')
                .add(Math.floor(Math.random() * 20 - 10), 'minutes'); // ±10분 랜덤
            
            // 시간 범위 검증 (8시-23시)
            if (scheduleTime.hour() < PHOTO_START_HOUR) {
                scheduleTime.hour(PHOTO_START_HOUR);
            } else if (scheduleTime.hour() >= PHOTO_END_HOUR) {
                scheduleTime.hour(PHOTO_END_HOUR - 1);
            }
            
            schedule.push({
                index: i + 1,
                time: scheduleTime.clone(),
                sent: false
            });
        }
        
        // 시간순 정렬
        schedule.sort((a, b) => a.time.diff(b.time));
        
        photoLog(`📅 일일 사진 스케줄 생성 완료: ${schedule.length}건`);
        schedule.forEach((item, index) => {
            photoLog(`   ${index + 1}. ${item.time.format('HH:mm')}`);
        });
        
        return schedule;
        
    } catch (error) {
        photoLog(`❌ 스케줄 생성 실패: ${error.message}`);
        return [];
    }
}

/**
 * 현재 시간 기준으로 다음 전송할 사진 찾기
 */
function findNextPhotoToSend() {
    const now = moment().tz(TIMEZONE);
    
    // 오늘 스케줄이 없으면 생성
    if (!photoScheduleState.schedule?.dailySchedule || photoScheduleState.schedule.dailySchedule.length === 0) {
        photoScheduleState.schedule.dailySchedule = generateDailyPhotoSchedule();
    }
    
    // 날짜가 바뀌었으면 리셋
    const today = now.format('YYYY-MM-DD');
    if (photoScheduleState.dailyStats?.lastResetDate !== today) {
        resetDailyStats();
        photoScheduleState.schedule.dailySchedule = generateDailyPhotoSchedule();
    }
    
    // 배열 안전성 확인
    if (!Array.isArray(photoScheduleState.schedule.dailySchedule)) {
        photoLog('❌ dailySchedule이 배열이 아님 - 새로 생성');
        photoScheduleState.schedule.dailySchedule = generateDailyPhotoSchedule();
    }
    
    // 🚨 FIX: moment 객체 안전성 보장
    const nextPhoto = photoScheduleState.schedule.dailySchedule.find(item => {
        if (!item || typeof item !== 'object') return false;
        
        // moment 객체가 아니면 변환
        if (!moment.isMoment(item.time)) {
            try {
                item.time = moment(item.time).tz(TIMEZONE);
            } catch (error) {
                photoLog(`❌ 시간 변환 실패: ${item.time}`);
                return false;
            }
        }
        
        return !item.sent && item.time.isAfter(now);
    });
    
    return nextPhoto;
}

/**
 * 다음 사진 시간 계산 (새로운 균등 분산 방식)
 */
function calculateNextPhotoTime() {
    try {
        const nextPhoto = findNextPhotoToSend();
        
        if (nextPhoto && nextPhoto.time) {
            // moment 객체 안전성 확인
            if (!moment.isMoment(nextPhoto.time)) {
                try {
                    nextPhoto.time = moment(nextPhoto.time).tz(TIMEZONE);
                } catch (error) {
                    photoLog(`❌ calculateNextPhotoTime: 시간 변환 실패: ${error.message}`);
                    return null;
                }
            }
            
            // 시간 유효성 검증
            if (!nextPhoto.time.isValid()) {
                photoLog(`❌ calculateNextPhotoTime: 유효하지 않은 시간`);
                return null;
            }
            
            photoLog(`🎯 다음 사진 예약: ${nextPhoto.time.format('HH:mm')} (${nextPhoto.index}번째)`);
            return nextPhoto.time;
        }
        
        // 오늘 할당량 모두 소진되었으면 내일 첫 스케줄로
        const tomorrowFirst = moment().tz(TIMEZONE)
            .add(1, 'day')
            .hour(PHOTO_START_HOUR)
            .minute(0)
            .second(0);
        
        photoLog(`📊 오늘 할당량(${DAILY_PHOTO_TARGET}건) 완료 - 내일 ${tomorrowFirst.format('HH:mm')}에 재시작`);
        return tomorrowFirst;
        
    } catch (error) {
        photoLog(`❌ calculateNextPhotoTime 실패: ${error.message}`);
        return null;
    }
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
        
        // 전송 기록
        recordPhotoSent(photoType, imageUrl, message);
        
        photoLog(`📸 사진 전송 성공: ${photoType} (${photoScheduleState.dailyStats.sentToday}/${DAILY_PHOTO_TARGET})`);
        
        // 다음 사진 스케줄링
        scheduleNextPhoto();
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 사진 전송 실패: ${error.message}`);
        // 실패해도 다음 스케줄은 유지
        scheduleNextPhoto();
        return false;
    }
}

function recordPhotoSent(photoType, imageUrl, message) {
    const now = moment().tz(TIMEZONE);
    
    // 일일 통계 업데이트
    if (!photoScheduleState.dailyStats) {
        photoScheduleState.dailyStats = {
            sentToday: 0,
            totalDaily: DAILY_PHOTO_TARGET,
            lastResetDate: now.format('YYYY-MM-DD')
        };
    }
    
    photoScheduleState.dailyStats.sentToday++;
    
    if (!photoScheduleState.sendHistory) {
        photoScheduleState.sendHistory = {
            sentPhotos: [],
            lastSentTime: null
        };
    }
    
    photoScheduleState.sendHistory.lastSentTime = now.valueOf();
    
    // 전송 이력 기록
    photoScheduleState.sendHistory.sentPhotos.push({
        timestamp: now.valueOf(),
        type: photoType,
        url: imageUrl,
        message: message,
        time: now.format('HH:mm')
    });
    
    // 스케줄에서 해당 사진 완료 표시
    const currentPhoto = findCurrentScheduledPhoto();
    if (currentPhoto) {
        currentPhoto.sent = true;
        photoLog(`✅ 스케줄 완료: ${currentPhoto.index}번째 사진 (${currentPhoto.time.format('HH:mm')})`);
    }
    
    // 💾 상태 저장
    savePhotoState();
}

function findCurrentScheduledPhoto() {
    const now = moment().tz(TIMEZONE);
    
    if (!photoScheduleState.schedule?.dailySchedule || !Array.isArray(photoScheduleState.schedule.dailySchedule)) {
        return null;
    }
    
    return photoScheduleState.schedule.dailySchedule.find(item => {
        if (!item || typeof item !== 'object') return false;
        
        // 🚨 FIX: moment 객체 안전성 보장
        if (!moment.isMoment(item.time)) {
            item.time = moment(item.time).tz(TIMEZONE);
        }
        return !item.sent && Math.abs(item.time.diff(now, 'minutes')) < 30;
    });
}

/**
 * 다음 사진 스케줄링 (새로운 균등 분산 방식)
 */
function scheduleNextPhoto() {
    try {
        // 오늘 할당량 체크
        if ((photoScheduleState.dailyStats?.sentToday || 0) >= DAILY_PHOTO_TARGET) {
            photoLog('📊 오늘 목표 달성 - 스케줄링 중단');
            if (photoScheduleState.schedule) {
                photoScheduleState.schedule.nextScheduledTime = null;
            }
            // 💾 상태 저장
            savePhotoState();
            return;
        }
        
        const nextTime = calculateNextPhotoTime();
        if (!nextTime || !moment.isMoment(nextTime)) {
            photoLog(`❌ nextTime이 유효하지 않음: ${nextTime}`);
            return;
        }
        
        // 시간 유효성 검증
        const now = moment().tz(TIMEZONE);
        if (nextTime.isBefore(now)) {
            photoLog(`❌ 다음 시간이 과거임: ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`);
            return;
        }
        
        if (!photoScheduleState.schedule) {
            photoScheduleState.schedule = {
                isSystemActive: false,
                nextScheduledTime: null,
                activeJobs: [],
                dailySchedule: []
            };
        }
        
        photoScheduleState.schedule.nextScheduledTime = nextTime.valueOf();
        
        // 기존 스케줄 취소
        if (Array.isArray(photoScheduleState.schedule.activeJobs)) {
            photoScheduleState.schedule.activeJobs.forEach(job => {
                if (job && typeof job.cancel === 'function') {
                    job.cancel();
                }
            });
        }
        photoScheduleState.schedule.activeJobs = [];
        
        // 크론 표현식 검증
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
            photoScheduleState.schedule.activeJobs.push(job);
            photoLog(`⏰ 다음 사진 예약: ${nextTime.format('HH:mm')} (${formatTimeUntil(nextTime)})`);
            
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

/**
 * 사진 스케줄링 시작 (새로운 균등 분산 방식)
 */
function startPhotoScheduling() {
    try {
        photoLog('🚀 균등 분산 사진 스케줄링 시작');
        
        // 스케줄 객체 안전성 확인
        if (!photoScheduleState.schedule) {
            photoScheduleState.schedule = {
                isSystemActive: false,
                nextScheduledTime: null,
                activeJobs: [],
                dailySchedule: []
            };
        }
        
        // 일일 스케줄 생성 (기존에 없을 때만)
        if (!Array.isArray(photoScheduleState.schedule.dailySchedule) || photoScheduleState.schedule.dailySchedule.length === 0) {
            photoScheduleState.schedule.dailySchedule = generateDailyPhotoSchedule();
        }
        
        photoScheduleState.schedule.isSystemActive = true;
        
        // 첫 번째 사진 스케줄링
        const nextPhoto = findNextPhotoToSend();
        if (nextPhoto && nextPhoto.time) {
            // 🚨 FIX: moment 객체 안전성 보장
            if (!moment.isMoment(nextPhoto.time)) {
                try {
                    nextPhoto.time = moment(nextPhoto.time).tz(TIMEZONE);
                } catch (error) {
                    photoLog(`❌ 시간 변환 실패: ${error.message}`);
                    return false;
                }
            }
            
            // 시간 유효성 검증
            const now = moment().tz(TIMEZONE);
            if (nextPhoto.time.isBefore(now)) {
                photoLog(`❌ 첫 번째 사진 시간이 과거임: ${nextPhoto.time.format('YYYY-MM-DD HH:mm:ss')}`);
                return false;
            }
            
            photoScheduleState.schedule.nextScheduledTime = nextPhoto.time.valueOf();
            
            // 크론 표현식 검증
            const minute = nextPhoto.time.minute();
            const hour = nextPhoto.time.hour();
            const date = nextPhoto.time.date();
            const month = nextPhoto.time.month() + 1;
            
            if (minute < 0 || minute > 59 || hour < 0 || hour > 23) {
                photoLog(`❌ 잘못된 첫 번째 사진 시간: ${hour}:${minute}`);
                return false;
            }
            
            const cronExpression = `${minute} ${hour} ${date} ${month} *`;
            
            photoLog(`🔧 [디버그] 크론 표현식: ${cronExpression}`);
            photoLog(`🔧 [디버그] 스케줄 시간: ${nextPhoto.time.format('YYYY-MM-DD HH:mm:ss')}`);
            
            const job = schedule.scheduleJob(cronExpression, async () => {
                photoLog(`🚀 [실행] 스케줄된 사진 전송: ${nextPhoto.time.format('HH:mm')}`);
                await sendSpontaneousPhoto();
            });
            
            if (job) {
                if (!Array.isArray(photoScheduleState.schedule.activeJobs)) {
                    photoScheduleState.schedule.activeJobs = [];
                }
                photoScheduleState.schedule.activeJobs.push(job);
                photoLog(`📅 첫 번째 사진 예약: ${nextPhoto.time.format('HH:mm')} (${nextPhoto.index}번째, ${formatTimeUntil(nextPhoto.time)})`);
            } else {
                photoLog('❌ 크론 작업 등록 실패');
                return false;
            }
        } else {
            photoLog('⏰ 오늘은 더 이상 전송할 사진이 없습니다');
        }
        
        return true;
        
    } catch (error) {
        photoLog(`❌ 스케줄링 시작 실패: ${error.message}`);
        photoLog(`🔧 [디버그] 에러 스택: ${error.stack}`);
        return false;
    }
}

// ================== 🌄 일일 리셋 함수 ==================
function resetDailyStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    
    // 안전한 초기화
    photoScheduleState.dailyStats = {
        sentToday: 0,
        totalDaily: DAILY_PHOTO_TARGET,
        lastResetDate: today,
    };
    
    if (!photoScheduleState.sendHistory) {
        photoScheduleState.sendHistory = {};
    }
    photoScheduleState.sendHistory.sentPhotos = [];
    photoScheduleState.sendHistory.lastSentTime = null;
    
    if (!photoScheduleState.schedule) {
        photoScheduleState.schedule = {
            isSystemActive: false,
            nextScheduledTime: null,
            activeJobs: [],
            dailySchedule: []
        };
    } else {
        photoScheduleState.schedule.dailySchedule = [];
        // activeJobs는 유지 (시스템이 활성화되어 있을 수 있음)
    }
    
    photoLog(`🌅 일일 통계 리셋 완료: ${today}`);
    
    // 💾 리셋된 상태 저장
    savePhotoState();
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

// ================== 📊 상태 조회 함수들 ==================
function getPhotoStatus() {
    const now = moment().tz(TIMEZONE);
    const nextTime = photoScheduleState.schedule.nextScheduledTime 
        ? moment(photoScheduleState.schedule.nextScheduledTime).tz(TIMEZONE)
        : null;
    
    return {
        sent: photoScheduleState.dailyStats?.sentToday || 0,
        total: photoScheduleState.dailyStats?.totalDaily || DAILY_PHOTO_TARGET,
        nextTime: nextTime ? nextTime.format('HH:mm') : '예약없음',
        nextTimeFormatted: nextTime ? formatTimeUntil(nextTime) : '예약없음',
        isActive: photoScheduleState.schedule?.isSystemActive || false,
        todaySchedule: (photoScheduleState.schedule?.dailySchedule || []).map(item => {
            // 🚨 FIX: moment 객체 안전성 보장
            const timeObj = moment.isMoment(item.time) ? item.time : moment(item.time).tz(TIMEZONE);
            return {
                index: item.index,
                time: timeObj.format('HH:mm'),
                sent: item.sent
            };
        })
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

// ================== 🔧 시스템 제어 함수들 ==================
function startSpontaneousPhotoScheduler(client, targetUserId, getLastUserMessageTimeFunc) {
    try {
        photoLog('📸 자발적 사진 전송 시스템 초기화');
        
        // 전역 변수 설정
        globalClient = client;
        globalUserId = targetUserId;
        getLastUserMessageTime = getLastUserMessageTimeFunc;
        
        // 💾 이전 상태 복원 시도
        const stateRestored = loadPhotoState();
        
        if (!stateRestored) {
            // 복원 실패 시 새로 시작
            const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
            photoScheduleState.dailyStats = {
                sentToday: 0,
                totalDaily: DAILY_PHOTO_TARGET,
                lastResetDate: today
            };
            resetDailyStats();
        }
        
        photoLog(`👤 타겟 사용자: ${targetUserId}`);
        photoLog(`📊 현재 상태: ${photoScheduleState.dailyStats.sentToday}/${DAILY_PHOTO_TARGET}건 전송 완료`);
        
        // 복원된 스케줄이 있으면 표시
        if (photoScheduleState.schedule.dailySchedule.length > 0) {
            const completedCount = photoScheduleState.schedule.dailySchedule.filter(item => item.sent).length;
            photoLog(`📅 기존 스케줄 복원: ${completedCount}/${photoScheduleState.schedule.dailySchedule.length}건 완료`);
            
            // 🚨 FIX: 복원된 스케줄의 moment 객체 확인
            photoScheduleState.schedule.dailySchedule.forEach((item, index) => {
                if (!moment.isMoment(item.time)) {
                    photoLog(`🔧 [수정] ${index + 1}번째 스케줄 시간 객체 복원: ${item.time}`);
                    item.time = moment(item.time).tz(TIMEZONE);
                }
            });
        }
        
        // 스케줄링 시작
        const startResult = startPhotoScheduling();
        
        if (startResult) {
            photoLog('🎉 자발적 사진 전송 시스템 시작 완료');
            // 💾 시작 상태 저장
            savePhotoState();
            return true;
        } else {
            photoLog('❌ 자발적 사진 전송 시스템 시작 실패');
            return false;
        }
        
    } catch (error) {
        photoLog(`❌ 초기화 실패: ${error.message}`);
        photoLog(`🔧 [디버그] 에러 스택: ${error.stack}`);
        return false;
    }
}

function stopSpontaneousPhotoScheduler() {
    try {
        photoLog('🛑 자발적 사진 전송 시스템 중지');
        
        // 모든 활성 작업 취소
        if (photoScheduleState.schedule && Array.isArray(photoScheduleState.schedule.activeJobs)) {
            photoScheduleState.schedule.activeJobs.forEach((job, index) => {
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
        if (!photoScheduleState.schedule) {
            photoScheduleState.schedule = {};
        }
        
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

async function forceSendPhoto() {
    photoLog('🚀 사진 강제 전송');
    return await sendSpontaneousPhoto();
}

// ================== 🔧 유틸리티 함수들 ==================
function getInternalState() {
    return {
        dailyStats: photoScheduleState.dailyStats || {
            sentToday: 0,
            totalDaily: DAILY_PHOTO_TARGET,
            lastResetDate: moment().tz(TIMEZONE).format('YYYY-MM-DD')
        },
        schedule: photoScheduleState.schedule || {
            isSystemActive: false,
            nextScheduledTime: null,
            activeJobs: [],
            dailySchedule: []
        },
        sendHistory: photoScheduleState.sendHistory || {
            sentPhotos: [],
            lastSentTime: null
        },
        globalClient: !!globalClient,
        globalUserId: globalUserId,
        timezone: TIMEZONE
    };
}

function restartScheduling() {
    photoLog('🔄 스케줄링 재시작');
    return startPhotoScheduling();
}

// ================== 📤 모듈 내보내기 ==================
photoLog('📸 spontaneousPhotoManager.js v4.0 로드 완료 (영구 저장 + 균등 분산 스케줄링)');

// 🌄 자정 0시마다 새로운 스케줄 생성
schedule.scheduleJob('0 0 * * *', () => {
    photoLog('🌄 자정 0시 - 새로운 하루 시작, 사진 스케줄 재생성');
    resetDailyStats();
    if (photoScheduleState.schedule.isSystemActive) {
        photoScheduleState.schedule.dailySchedule = generateDailyPhotoSchedule();
        startPhotoScheduling();
    }
});

module.exports = {
    // 🎯 핵심 시스템 함수들
    startSpontaneousPhotoScheduler,
    stopSpontaneousPhotoScheduler,
    
    // 📸 사진 전송 관련
    getPhotoStatus,              // ⭐️ 라인에서 "상태는?" 명령어용 핵심 함수!
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
    
    // 🧪 테스트 함수들
    testPhotoSending,
    testScheduling,
    
    // 🔧 유틸리티 함수들
    getInternalState,
    calculateNextPhotoTime,
    formatTimeUntil,
    recordPhotoSent,
    generateDailyPhotoSchedule,    // 새로운 균등 분산 함수
    findNextPhotoToSend,          // 새로운 스케줄 관리 함수
    
    // 💾 영구 저장 함수들 (새로 추가!)
    savePhotoState,
    loadPhotoState,
    
    // 📊 통계 관련
    photoScheduleState: () => ({
        dailyStats: photoScheduleState.dailyStats || {
            sentToday: 0,
            totalDaily: DAILY_PHOTO_TARGET,
            lastResetDate: moment().tz(TIMEZONE).format('YYYY-MM-DD')
        },
        schedule: photoScheduleState.schedule || {
            isSystemActive: false,
            nextScheduledTime: null,
            activeJobs: [],
            dailySchedule: []
        },
        sendHistory: photoScheduleState.sendHistory || {
            sentPhotos: [],
            lastSentTime: null
        }
    }),
    
    // 로그 함수
    photoLog
};
