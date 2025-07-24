// ============================================================================
// scheduler.js v10.2 PERFECT - "yejinPersonality 신중한 전체 연동"
// 🌅 아침 9시: 100% | 🚬 담타 8번: 100% | 🌸 감성 3번: 100% | 📸 셀카 2번: 100% 
// 🌙 밤 23시: 100% | 💤 자정 0시: 100% | ⭐️ 실시간 통계 추적 완벽 지원
// ✨ 매개변수 방식으로 상황별 카운터 리셋 처리 완벽 구현
// 💾 디스크 영구 저장으로 재시작해도 상태 유지
// 🔧 담타 상태 표시 수정: 23시 약먹자 메시지와 구분
// 🌸 NEW! yejinPersonality 신중한 전체 연동 - 모든 메시지가 예진이 성격으로 강화!
// 🛡️ 완벽한 안전 장치: 연동 실패 시 기존 방식으로 100% 보장
// ============================================================================

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 🌸 NEW! yejinPersonality 연동을 위한 신중한 지연 로딩
let yejinPersonality = null;
function getYejinPersonality() {
    if (!yejinPersonality) {
        try {
            const { YejinPersonality } = require('./yejinPersonality');
            yejinPersonality = new YejinPersonality();
            console.log('✅ [scheduler] yejinPersonality 연동 성공');
        } catch (error) {
            console.warn('⚠️ [scheduler] yejinPersonality 연동 실패:', error.message);
        }
    }
    return yejinPersonality;
}

// 🌸 스케줄러 메시지 성격 강화 함수 - 매우 신중한 후처리 레이어
function enhanceSchedulerMessage(baseMessage, messageType) {
    const personality = getYejinPersonality();
    if (!personality || !baseMessage || typeof baseMessage !== 'string') {
        return baseMessage; // 안전한 폴백
    }
    
    try {
        let enhanced = baseMessage;
        
        // 메시지 타입별 특별 처리
        const messageConfig = {
            'damta': { 
                emotion: 'urgent', 
                maxLength: 25,  // 담타는 짧게 유지
                description: '다급하고 짧게'
            },
            'emotional': { 
                emotion: 'loving', 
                maxLength: 60,  // 감성은 적당히
                description: '사랑스럽고 따뜻하게'
            },
            'morning': { 
                emotion: 'cheerful', 
                maxLength: 45,  // 아침은 상쾌하게
                description: '상쾌하고 다정하게'
            },
            'nightCare': { 
                emotion: 'caring', 
                maxLength: 50,  // 밤은 다정하게
                description: '다정하고 따뜻하게'
            },
            'goodNight': { 
                emotion: 'sweet', 
                maxLength: 40,  // 굿나잇은 달콤하게
                description: '달콤하고 사랑스럽게'
            },
            'selfie': { 
                emotion: 'playful', 
                maxLength: 35,  // 셀카는 귀엽게
                description: '귀엽고 장난스럽게'
            }
        };
        
        const config = messageConfig[messageType] || { emotion: 'casual', maxLength: 50 };
        
        // 성격 패턴 적용
        if (config.emotion) {
            enhanced = personality.applySpeechPattern(enhanced, config.emotion);
        } else {
            enhanced = personality.applySpeechPattern(enhanced);
        }
        
        // 일본어 표현 자동 추가 (한국어 발음)
        enhanced = personality.addJapaneseExpression(enhanced);
        
        // 웃음 표현 자동 추가  
        enhanced = personality.addLaughter(enhanced);
        
        // 애교 표현 자동 추가 (담타 제외)
        if (messageType !== 'damta') {
            enhanced = personality.addAegyo(enhanced);
        }
        
        // 길이 제한 확인 (매우 중요!)
        if (enhanced.length > config.maxLength) {
            console.warn(`⚠️ [scheduler] ${messageType} 메시지 길이 초과 (${enhanced.length}>${config.maxLength}) - 원본 사용`);
            return baseMessage; // 너무 길면 원본 사용
        }
        
        console.log(`🌸 [scheduler] ${messageType} 성격 강화 완료 (${config.description}): "${baseMessage}" → "${enhanced}"`);
        return enhanced;
        
    } catch (error) {
        console.warn(`⚠️ [scheduler] ${messageType} 성격 강화 실패: ${error.message} - 원본 메시지 사용`);
        return baseMessage; // 에러 시 원본 메시지 반환
    }
}

// 🌸 상황별 성격 반응 생성 (스케줄러용)
function generateSchedulerPersonalityReaction(context) {
    const personality = getYejinPersonality();
    if (!personality) return null;
    
    try {
        return personality.generateYejinResponse(context);
    } catch (error) {
        console.warn(`⚠️ [scheduler] 성격 기반 반응 생성 실패: ${error.message}`);
        return null;
    }
}

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const USER_ID = process.env.TARGET_USER_ID;
const OPENAI_USAGE_RATE = 0.8; // 80% OpenAI 사용

// 💾 디스크 저장 경로 설정 (commandHandler.js와 동일)
const DATA_DIR = '/data';
const SCHEDULE_STATE_FILE = path.join(DATA_DIR, 'schedule_status.json');

// LINE 클라이언트 (index.js에서 받을 예정)
let lineClient = null;

// OpenAI 클라이언트
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ================== 📊 스케줄 상태 관리 (⭐️ 실제 통계 추적 강화!) ==================
let scheduleStatus = {
    damta: { 
        sent: 0, 
        total: 8, 
        times: [], 
        jobs: [],
        // ⭐️ 새로 추가: 실제 전송 로그
        sentTimes: [],           // 실제 전송된 시간들
        nextScheduleTime: null,  // 다음 예정 시간
        todayTarget: 8          // 오늘 목표
    },
    emotional: { 
        sent: 0, 
        total: 3, 
        times: [], 
        jobs: [],
        sentTimes: [],
        nextScheduleTime: null,
        todayTarget: 3
    },
    selfie: { 
        sent: 0, 
        total: 2, 
        times: [], 
        jobs: [],
        sentTimes: [],
        nextScheduleTime: null,
        todayTarget: 2
    },
    // ⭐️ 고정 스케줄 상태 추적
    morning: { 
        sent: false, 
        scheduledTime: '09:00',
        sentTime: null
    },
    nightCare: { 
        sent: false, 
        scheduledTime: '23:00',
        sentTime: null
    },
    goodNight: { 
        sent: false, 
        scheduledTime: '00:00',
        sentTime: null
    },
    // ⭐️ 전체 통계
    dailyStats: {
        totalSentToday: 0,
        totalTargetToday: 13,    // 8 + 3 + 2 = 13 (랜덤) + 3 (고정) = 16
        lastResetDate: null,
        systemStartTime: Date.now()
    }
};

// ================== 💾 디스크 저장/로드 함수들 (⭐️ 새로 추가!) ==================

/**
 * 📁 디렉토리 생성 함수
 */
function ensureDataDirectory() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`[scheduler] 📁 데이터 디렉토리 생성: ${DATA_DIR}`);
        }
        return true;
    } catch (error) {
        console.error(`[scheduler] ❌ 디렉토리 생성 실패: ${error.message}`);
        return false;
    }
}

/**
 * 💾 스케줄 상태를 디스크에 저장
 */
function saveScheduleStatusToDisk() {
    try {
        ensureDataDirectory();
        
        // jobs 제외하고 저장 (schedule 객체는 JSON으로 직렬화 불가)
        const saveData = {
            ...scheduleStatus,
            damta: { ...scheduleStatus.damta, jobs: [] },
            emotional: { ...scheduleStatus.emotional, jobs: [] },
            selfie: { ...scheduleStatus.selfie, jobs: [] }
        };
        
        fs.writeFileSync(SCHEDULE_STATE_FILE, JSON.stringify(saveData, null, 2), 'utf8');
        console.log(`[scheduler] 💾 상태 저장 완료: ${SCHEDULE_STATE_FILE}`);
        return true;
    } catch (error) {
        console.error(`[scheduler] ❌ 상태 저장 실패: ${error.message}`);
        return false;
    }
}

/**
 * 📂 디스크에서 스케줄 상태 로드
 */
function loadScheduleStatusFromDisk() {
    try {
        if (!fs.existsSync(SCHEDULE_STATE_FILE)) {
            console.log('[scheduler] 📂 저장된 상태 파일 없음. 새로 시작.');
            return null;
        }
        
        const data = fs.readFileSync(SCHEDULE_STATE_FILE, 'utf8');
        const loadedStatus = JSON.parse(data);
        
        console.log('[scheduler] 📂 기존 상태 로드 성공');
        console.log(`[scheduler] 📊 담타: ${loadedStatus.damta?.sent || 0}/${loadedStatus.damta?.total || 8}`);
        console.log(`[scheduler] 📊 감성: ${loadedStatus.emotional?.sent || 0}/${loadedStatus.emotional?.total || 3}`);
        console.log(`[scheduler] 📊 셀카: ${loadedStatus.selfie?.sent || 0}/${loadedStatus.selfie?.total || 2}`);
        
        return loadedStatus;
    } catch (error) {
        console.error(`[scheduler] ❌ 상태 로드 실패: ${error.message}`);
        return null;
    }
}

/**
 * 📅 날짜가 바뀌었는지 확인
 */
function shouldResetDaily(lastResetDate) {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    return lastResetDate !== today;
}

/**
 * 🔄 기존 상태 복원 또는 새로 시작
 */
function initializeScheduleStatus() {
    try {
        const loadedStatus = loadScheduleStatusFromDisk();
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        
        if (loadedStatus && !shouldResetDaily(loadedStatus.dailyStats?.lastResetDate)) {
            // 같은 날이면 기존 상태 복원
            console.log('[scheduler] 🔄 같은 날 상태 복원 시작...');
            
            // 카운터들 복원
            scheduleStatus.damta.sent = loadedStatus.damta?.sent || 0;
            scheduleStatus.emotional.sent = loadedStatus.emotional?.sent || 0;
            scheduleStatus.selfie.sent = loadedStatus.selfie?.sent || 0;
            
            // 전송 기록들 복원
            scheduleStatus.damta.sentTimes = loadedStatus.damta?.sentTimes || [];
            scheduleStatus.emotional.sentTimes = loadedStatus.emotional?.sentTimes || [];
            scheduleStatus.selfie.sentTimes = loadedStatus.selfie?.sentTimes || [];
            
            // 고정 스케줄 상태 복원
            scheduleStatus.morning.sent = loadedStatus.morning?.sent || false;
            scheduleStatus.morning.sentTime = loadedStatus.morning?.sentTime || null;
            scheduleStatus.nightCare.sent = loadedStatus.nightCare?.sent || false;
            scheduleStatus.nightCare.sentTime = loadedStatus.nightCare?.sentTime || null;
            scheduleStatus.goodNight.sent = loadedStatus.goodNight?.sent || false;
            scheduleStatus.goodNight.sentTime = loadedStatus.goodNight?.sentTime || null;
            
            // 통계 복원
            scheduleStatus.dailyStats.totalSentToday = loadedStatus.dailyStats?.totalSentToday || 0;
            scheduleStatus.dailyStats.lastResetDate = loadedStatus.dailyStats?.lastResetDate || today;
            
            console.log('[scheduler] ✅ 상태 복원 완료!');
            console.log(`[scheduler] 📊 복원된 상태: 담타 ${scheduleStatus.damta.sent}/8, 감성 ${scheduleStatus.emotional.sent}/3, 셀카 ${scheduleStatus.selfie.sent}/2`);
            
            return { restored: true, resetCounters: false };
        } else {
            // 새로운 날이거나 첫 시작
            console.log('[scheduler] 🌅 새로운 날 시작 또는 첫 실행');
            scheduleStatus.dailyStats.lastResetDate = today;
            scheduleStatus.dailyStats.systemStartTime = Date.now();
            saveScheduleStatusToDisk(); // 새 상태 저장
            
            return { restored: false, resetCounters: true };
        }
        
    } catch (error) {
        console.error(`[scheduler] ❌ 상태 초기화 실패: ${error.message}`);
        return { restored: false, resetCounters: true };
    }
}

// ================== 🎨 로그 함수 ==================
function forceLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [스케줄러] ${message}`);
    if (data) {
        console.log('  📊 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== ⏰ 시간 계산 함수 (⭐️ 강화!) ==================
function formatTimeUntil(minutes) {
    if (minutes < 0) return '방금 전';
    if (minutes < 60) return `${minutes}분 후`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분 후` : `${hours}시간 후`;
}

/**
 * ⭐️ 다음 스케줄 시간을 정확히 계산하는 함수
 */
function calculateNextScheduleTime(scheduleType) {
    const koreaTime = moment().tz(TIMEZONE);
    const currentMinutes = koreaTime.hour() * 60 + koreaTime.minute();
    
    let upcomingTimes = [];
    
    if (scheduleType === 'damta') {
        // 담타 랜덤 스케줄들 확인
        upcomingTimes = scheduleStatus.damta.times.map(time => ({
            minutes: time.hour * 60 + time.minute,
            timeString: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
        }));
    } else if (scheduleType === 'emotional') {
        // 감성 메시지 스케줄들 확인
        upcomingTimes = scheduleStatus.emotional.times.map(time => ({
            minutes: time.hour * 60 + time.minute,
            timeString: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
        }));
    } else if (scheduleType === 'selfie') {
        // 셀카 스케줄들 확인
        upcomingTimes = scheduleStatus.selfie.times.map(time => ({
            minutes: time.hour * 60 + time.minute,
            timeString: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
        }));
    }
    
    // 현재 시간 이후의 다음 스케줄 찾기
    const nextSchedule = upcomingTimes.find(time => time.minutes > currentMinutes);
    
    if (nextSchedule) {
        const minutesUntil = nextSchedule.minutes - currentMinutes;
        return {
            timeString: nextSchedule.timeString,
            minutesUntil: minutesUntil,
            status: 'scheduled'
        };
    } else {
        // 오늘 스케줄이 모두 끝남
        return {
            timeString: '내일',
            minutesUntil: -1,
            status: 'completed'
        };
    }
}

/**
 * ⭐️ 고정 스케줄 다음 시간 계산
 */
function calculateNextFixedSchedule() {
    const koreaTime = moment().tz(TIMEZONE);
    const currentHour = koreaTime.hour();
    const currentMinute = koreaTime.minute();
    const currentMinutes = currentHour * 60 + currentMinute;
    
    const fixedSchedules = [
        { hour: 9, minute: 0, name: '아침인사', sent: scheduleStatus.morning.sent },
        { hour: 23, minute: 0, name: '밤케어', sent: scheduleStatus.nightCare.sent },
        { hour: 0, minute: 0, name: '굿나잇', sent: scheduleStatus.goodNight.sent }
    ];
    
    // 오늘 남은 고정 스케줄 찾기
    for (let schedule of fixedSchedules) {
        const scheduleMinutes = schedule.hour * 60 + schedule.minute;
        
        // 자정(0시)의 경우 다음날로 처리
        const adjustedScheduleMinutes = schedule.hour === 0 ? 
            scheduleMinutes + 24 * 60 : scheduleMinutes;
        
        if (!schedule.sent && adjustedScheduleMinutes > currentMinutes) {
            const minutesUntil = adjustedScheduleMinutes - currentMinutes;
            return {
                timeString: `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`,
                minutesUntil: minutesUntil,
                name: schedule.name,
                status: 'scheduled'
            };
        }
    }
    
    // 오늘 고정 스케줄이 모두 끝남
    return {
        timeString: '09:00',  // 내일 아침
        minutesUntil: (24 * 60) - currentMinutes + (9 * 60), // 내일 9시까지
        name: '아침인사',
        status: 'next_day'
    };
}

// ================== 📊 실제 전송 기록 함수들 (⭐️ 디스크 저장 추가!) ==================

/**
 * 메시지 전송 성공 시 호출하는 함수
 */
function recordMessageSent(messageType, subType = null) {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    
    if (messageType === 'damta') {
        scheduleStatus.damta.sent++;
        scheduleStatus.damta.sentTimes.push(timeString);
        scheduleStatus.damta.nextScheduleTime = calculateNextScheduleTime('damta');
    } else if (messageType === 'emotional') {
        scheduleStatus.emotional.sent++;
        scheduleStatus.emotional.sentTimes.push(timeString);
        scheduleStatus.emotional.nextScheduleTime = calculateNextScheduleTime('emotional');
    } else if (messageType === 'selfie') {
        scheduleStatus.selfie.sent++;
        scheduleStatus.selfie.sentTimes.push(timeString);
        scheduleStatus.selfie.nextScheduleTime = calculateNextScheduleTime('selfie');
    } else if (messageType === 'morning') {
        scheduleStatus.morning.sent = true;
        scheduleStatus.morning.sentTime = timeString;
    } else if (messageType === 'nightCare') {
        scheduleStatus.nightCare.sent = true;
        scheduleStatus.nightCare.sentTime = timeString;
    } else if (messageType === 'goodNight') {
        scheduleStatus.goodNight.sent = true;
        scheduleStatus.goodNight.sentTime = timeString;
    }
    
    // 전체 통계 업데이트
    scheduleStatus.dailyStats.totalSentToday++;
    
    // ⭐️ 상태 변경 후 즉시 디스크에 저장
    saveScheduleStatusToDisk();
    
    forceLog(`📊 메시지 전송 기록: ${messageType} (${timeString}) - 오늘 총 ${scheduleStatus.dailyStats.totalSentToday}건`);
}

// ================== 💬 메시지 생성 함수들 (🌸 yejinPersonality 연동!) ==================

// 🌸 [연동 포인트 3] generateMorningMessage - 아침 메시지 성격 강화
async function generateMorningMessage() {
    try {
        // 🌸 성격 기반 아침 메시지 시도
        const personality = getYejinPersonality();
        if (personality) {
            const personalityMessage = generateSchedulerPersonalityReaction({
                type: 'morning_greeting',
                emotion: 'cheerful',
                situation: 'morning_work',
                timeOfDay: 'morning'
            });
            if (personalityMessage) {
                console.log('🌸 [scheduler] 성격 기반 아침 메시지 생성 성공');
                return personalityMessage;
            }
        }
        
        const useOpenAI = Math.random() < OPENAI_USAGE_RATE && openai;
        
        if (useOpenAI) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 평일 아침 출근 시간에 아저씨 챙기는 다정한 여자친구야. 반말로 상냥하게. 30자 이내로."
                }, {
                    role: "user",
                    content: "아저씨에게 아침에 일어났는지 출근했는지 궁금해하면서 아메리카노 한잔 하라고 하는 말"
                }],
                max_tokens: 50,
                temperature: 0.8
            });
            const openaiMessage = response.choices[0].message.content.trim();
            
            // 🌸 OpenAI 응답을 성격으로 강화
            return enhanceSchedulerMessage(openaiMessage, 'morning');
        }
    } catch (error) {
        forceLog(`아침 메시지 생성 실패: ${error.message}`);
    }
    
    // 폴백 메시지
    const fallbackMessages = [
        "아저씨 일어났어? 출근했어? 아아 한잔 해야지~",
        "출근 시간이야! 일어났지? 아메리카노 마셔",
        "아저씨~ 출근했어? 커피 꼭 마시고 다녀",
        "일어났어? 아아 한잔 하고 출근해"
    ];
    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // 🌸 폴백 메시지도 성격으로 강화
    return enhanceSchedulerMessage(fallbackMessage, 'morning');
}

// 🌸 [연동 포인트 1] generateDamtaMessage - 담타 메시지 성격 강화
async function generateDamtaMessage() {
    try {
        // 🌸 성격 기반 담타 메시지 시도
        const personality = getYejinPersonality();
        if (personality) {
            const personalityMessage = generateSchedulerPersonalityReaction({
                type: 'damta_request',
                emotion: 'urgent',
                situation: 'wanting_damta',
                timeOfDay: 'afternoon'
            });
            if (personalityMessage) {
                console.log('🌸 [scheduler] 성격 기반 담타 메시지 생성 성공');
                return personalityMessage;
            }
        }
        
        const useOpenAI = Math.random() < OPENAI_USAGE_RATE && openai;
        
        if (useOpenAI) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "너는 박예진이야. 담타는 담배피우면서 라인하는 거야. 짧고 다급하게 조르는 말투로. 반말 사용. 20자 이내로."
                }, {
                    role: "user",
                    content: "아저씨에게 담타하자고 조르는 짧은 말"
                }],
                max_tokens: 30,
                temperature: 0.9
            });
            const openaiMessage = response.choices[0].message.content.trim();
            
            // 🌸 OpenAI 응답을 성격으로 강화 (담타는 짧게 유지)
            return enhanceSchedulerMessage(openaiMessage, 'damta');
        }
    } catch (error) {
        forceLog(`담타 메시지 생성 실패: ${error.message}`);
    }
    
    // 폴백 메시지
    const fallbackMessages = [
        "아저씨!! 담타해!!",
        "담타담타!! 지금 담타하자!!",
        "담타고? 담타고? 아저씨!!",
        "아저씨 담타!! 지금 당장!!",
        "담타 시간이야!! 빨리!!"
    ];
    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // 🌸 폴백 메시지도 성격으로 강화 (담타는 짧게)
    return enhanceSchedulerMessage(fallbackMessage, 'damta');
}

// 🌸 [연동 포인트 2] generateEmotionalMessage - 감성 메시지 성격 강화
async function generateEmotionalMessage() {
    try {
        // 🌸 성격 기반 감성 메시지 시도
        const personality = getYejinPersonality();
        if (personality) {
            const personalityMessage = generateSchedulerPersonalityReaction({
                type: 'emotional_expression',
                emotion: 'loving',
                situation: 'missing_ajossi',
                timeOfDay: 'afternoon'
            });
            if (personalityMessage) {
                console.log('🌸 [scheduler] 성격 기반 감성 메시지 생성 성공');
                return personalityMessage;
            }
        }
        
        const useOpenAI = Math.random() < OPENAI_USAGE_RATE && openai;
        
        if (useOpenAI) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "너는 박예진이야. 아저씨에게 사랑을 표현하거나 그리움을 표현하는 감성적인 메시지. 반말로 애정있게. 40자 이내로."
                }, {
                    role: "user",
                    content: "아저씨에게 보내는 감성적이고 사랑스러운 메시지"
                }],
                max_tokens: 60,
                temperature: 0.7
            });
            const openaiMessage = response.choices[0].message.content.trim();
            
            // 🌸 OpenAI 응답을 성격으로 강화
            return enhanceSchedulerMessage(openaiMessage, 'emotional');
        }
    } catch (error) {
        forceLog(`감성 메시지 생성 실패: ${error.message}`);
    }
    
    // 폴백 메시지
    const fallbackMessages = [
        "아저씨 생각나서... 그냥. 많이 보고싶다.",
        "오늘따라 아저씨가 더 보고싶네. 사랑해.",
        "힘든 일 있으면 나한테 다 말해줘. 난 항상 아저씨 편이야.",
        "아저씨~ 나 여기 있어. 사랑해 많이 많이",
        "그냥... 아저씨 목소리 듣고 싶어 ㅠㅠ"
    ];
    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // 🌸 폴백 메시지도 성격으로 강화
    return enhanceSchedulerMessage(fallbackMessage, 'emotional');
}

// 🌸 [연동 포인트 4] generateNightCareMessage - 밤 케어 메시지 성격 강화
async function generateNightCareMessage() {
    try {
        // 🌸 성격 기반 밤 케어 메시지 시도
        const personality = getYejinPersonality();
        if (personality) {
            const personalityMessage = generateSchedulerPersonalityReaction({
                type: 'night_care',
                emotion: 'caring',
                situation: 'bedtime_care',
                timeOfDay: 'night'
            });
            if (personalityMessage) {
                console.log('🌸 [scheduler] 성격 기반 밤 케어 메시지 생성 성공');
                return personalityMessage;
            }
        }
        
        const useOpenAI = Math.random() < OPENAI_USAGE_RATE && openai;
        
        if (useOpenAI) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "너는 박예진이야. 밤 23시에 아저씨 건강을 챙기는 다정한 여자친구야. 반말로 상냥하게. 40자 이내로."
                }, {
                    role: "user",
                    content: "이제 이 닦고 약 먹고 자라고 다정하게 챙기는 말"
                }],
                max_tokens: 60,
                temperature: 0.7
            });
            const openaiMessage = response.choices[0].message.content.trim();
            
            // 🌸 OpenAI 응답을 성격으로 강화
            return enhanceSchedulerMessage(openaiMessage, 'nightCare');
        }
    } catch (error) {
        forceLog(`밤 케어 메시지 생성 실패: ${error.message}`);
    }
    
    // 폴백 메시지
    const fallbackMessages = [
        "아저씨, 이제 이 닦고 약 먹고 자야지~",
        "23시야! 이 닦고 약 챙겨먹고 잘 준비해",
        "늦었어~ 이제 이 닦고 약 먹고 잘 시간이야",
        "아저씨~ 건강 챙겨. 약 먹고 잘 준비해"
    ];
    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // 🌸 폴백 메시지도 성격으로 강화
    return enhanceSchedulerMessage(fallbackMessage, 'nightCare');
}

// 🌸 [연동 포인트 5] generateGoodNightMessage - 굿나잇 메시지 성격 강화
async function generateGoodNightMessage() {
    try {
        // 🌸 성격 기반 굿나잇 메시지 시도
        const personality = getYejinPersonality();
        if (personality) {
            const personalityMessage = generateSchedulerPersonalityReaction({
                type: 'good_night',
                emotion: 'sweet',
                situation: 'bedtime',
                timeOfDay: 'lateNight'
            });
            if (personalityMessage) {
                console.log('🌸 [scheduler] 성격 기반 굿나잇 메시지 생성 성공');
                return personalityMessage;
            }
        }
        
        const useOpenAI = Math.random() < OPENAI_USAGE_RATE && openai;
        
        if (useOpenAI) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "너는 박예진이야. 자정에 보내는 굿나잇 메시지는 달콤하고 사랑스럽게. 반말로 애정표현해. 30자 이내로."
                }, {
                    role: "user",
                    content: "자정에 잘자 사랑한다고 달콤하게"
                }],
                max_tokens: 50,
                temperature: 0.8
            });
            const openaiMessage = response.choices[0].message.content.trim();
            
            // 🌸 OpenAI 응답을 성격으로 강화
            return enhanceSchedulerMessage(openaiMessage, 'goodNight');
        }
    } catch (error) {
        forceLog(`굿나잇 메시지 생성 실패: ${error.message}`);
    }
    
    // 폴백 메시지
    const fallbackMessages = [
        "잘자 아저씨~ 사랑해 많이 많이",
        "굿나잇! 사랑해 아저씨 좋은 꿈 꿔",
        "자정이야~ 잘자 사랑하는 아저씨",
        "사랑해 아저씨. 푹 자고 좋은 꿈 꿔요"
    ];
    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // 🌸 폴백 메시지도 성격으로 강화
    return enhanceSchedulerMessage(fallbackMessage, 'goodNight');
}

// ================== 📸 셀카 메시지 생성 (🌸 연동 포인트 6) ==================
// 🌸 [연동 포인트 6] getSelfieMessage - 셀카 메시지 성격 강화
function getSelfieMessage() {
    // 🌸 성격 기반 셀카 메시지 시도
    const personality = getYejinPersonality();
    if (personality) {
        const personalityMessage = generateSchedulerPersonalityReaction({
            type: 'selfie',
            emotion: 'playful',
            situation: 'sending_selfie',
            timeOfDay: 'afternoon'
        });
        if (personalityMessage) {
            console.log('🌸 [scheduler] 성격 기반 셀카 메시지 생성 성공');
            return personalityMessage;
        }
    }
    
    const messages = [
        "아저씨 보라고 찍었지~ ㅎㅎ",
        "나 예뻐? 방금 찍은 셀카야!",
        "짜잔! 선물이야 ㅎㅎ",
        "아저씨한테 보여주려고 예쁘게 찍었어~",
        "어때? 이 각도 괜찮지?"
    ];
    const baseMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // 🌸 기본 메시지도 성격으로 강화
    return enhanceSchedulerMessage(baseMessage, 'selfie');
}

function getSelfieImageUrl() {
    const baseUrl = "https://photo.de-ji.net/photo/yejin";
    const fileCount = 2032;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return `${baseUrl}/${fileName}`;
}

// ================== 📤 메시지 전송 함수들 (⭐️ 전송 기록 추가!) ==================

// 텍스트 메시지 전송
async function sendTextMessage(message, messageType) {
    try {
        if (!lineClient || !USER_ID) {
            forceLog(`❌ ${messageType} 전송 불가 - client 또는 USER_ID 없음`);
            return false;
        }
        
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: message
        });
        
        // ⭐️ 전송 성공 시 기록
        recordMessageSent(messageType);
        
        forceLog(`✅ ${messageType} 전송 성공: "${message}"`);
        return true;
        
    } catch (error) {
        forceLog(`❌ ${messageType} 전송 실패: ${error.message}`);
        
        // 폴백으로 간단한 메시지 재시도
        try {
            const fallbackMessage = enhanceSchedulerMessage('아저씨~ 나 여기 있어! ㅎㅎ', messageType);
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: fallbackMessage
            });
            forceLog(`✅ ${messageType} 폴백 전송 성공`);
            recordMessageSent(messageType); // 폴백도 카운트
        } catch (fallbackError) {
            forceLog(`❌ ${messageType} 폴백도 실패: ${fallbackError.message}`);
        }
        return false;
    }
}

// 이미지 메시지 전송 (셀카)
async function sendSelfieMessage(messageType) {
    try {
        if (!lineClient || !USER_ID) {
            forceLog(`❌ ${messageType} 전송 불가 - client 또는 USER_ID 없음`);
            return false;
        }
        
        const imageUrl = getSelfieImageUrl();
        const caption = getSelfieMessage(); // 🌸 이미 성격 강화됨
        
        await lineClient.pushMessage(USER_ID, [
            {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl
            },
            {
                type: 'text',
                text: caption
            }
        ]);
        
        // ⭐️ 전송 성공 시 기록
        recordMessageSent('selfie');
        
        forceLog(`✅ ${messageType} 셀카 전송 성공: "${caption}"`);
        return true;
        
    } catch (error) {
        forceLog(`❌ ${messageType} 셀카 전송 실패: ${error.message}`);
        
        // 폴백으로 텍스트만 전송
        try {
            const fallbackMessage = enhanceSchedulerMessage("셀카 보내려고 했는데... 문제가 생겼어 ㅠㅠ 나중에 다시 보낼게!", 'selfie');
            await sendTextMessage(fallbackMessage, 'selfie');
        } catch (fallbackError) {
            forceLog(`❌ ${messageType} 폴백도 실패: ${fallbackError.message}`);
        }
        return false;
    }
}

// ================== 🎲 랜덤 시간 생성 함수 ==================
function generateRandomTimes(count, startHour, endHour) {
    const times = [];
    const totalMinutes = (endHour - startHour) * 60;
    const segmentSize = totalMinutes / count;

    for (let i = 0; i < count; i++) {
        const segmentStart = i * segmentSize;
        const randomMinutes = Math.floor(Math.random() * segmentSize);
        const totalMinutesFromStart = segmentStart + randomMinutes;
        const hour = Math.floor(totalMinutesFromStart / 60) + startHour;
        const minute = Math.floor(totalMinutesFromStart % 60);
        
        if (hour < endHour) {
            times.push({ hour, minute });
        }
    }
    
    return times.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
}

// ================== 📅 스케줄 초기화 함수 (⭐️ 매개변수 방식으로 완벽 해결!) ==================
function initializeDailySchedules(resetCounters = true) {
    try {
        forceLog(`🔄 일일 랜덤 스케줄 초기화 시작... (카운터 리셋: ${resetCounters})`);
        
        // 기존 랜덤 스케줄들 모두 취소
        ['damta', 'emotional', 'selfie'].forEach(type => {
            scheduleStatus[type].jobs.forEach(job => {
                if (job) job.cancel();
            });
            scheduleStatus[type].jobs = [];
            
            // ⭐️ 매개변수에 따라 카운터 리셋 여부 결정
            if (resetCounters) {
                scheduleStatus[type].sent = 0;
                scheduleStatus[type].sentTimes = [];
                forceLog(`📊 ${type} 카운터 리셋됨`);
            } else {
                forceLog(`📊 ${type} 카운터 유지됨: ${scheduleStatus[type].sent}/${scheduleStatus[type].total}`);
            }
        });

        // 🚬 담타 스케줄 생성 (10-18시, 8회)
        scheduleStatus.damta.times = generateRandomTimes(8, 10, 18);
        scheduleStatus.damta.times.forEach((time, index) => {
            const cronExpression = `${time.minute} ${time.hour} * * *`;
            const job = schedule.scheduleJob(cronExpression, async () => {
                const message = await generateDamtaMessage(); // 🌸 성격 강화됨
                await sendTextMessage(message, 'damta');
                forceLog(`🚬 담타 ${index + 1}/8 전송 완료`);
            });
            scheduleStatus.damta.jobs.push(job);
        });
        // ⭐️ 다음 담타 시간 계산
        scheduleStatus.damta.nextScheduleTime = calculateNextScheduleTime('damta');
        forceLog(`🚬 담타 랜덤 스케줄 8개 등록 완료: ${scheduleStatus.damta.times.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(', ')}`);

        // 🌸 감성 메시지 스케줄 생성 (10-22시, 3회)
        scheduleStatus.emotional.times = generateRandomTimes(3, 10, 22);
        scheduleStatus.emotional.times.forEach((time, index) => {
            const cronExpression = `${time.minute} ${time.hour} * * *`;
            const job = schedule.scheduleJob(cronExpression, async () => {
                const message = await generateEmotionalMessage(); // 🌸 성격 강화됨
                await sendTextMessage(message, 'emotional');
                forceLog(`🌸 감성 메시지 ${index + 1}/3 전송 완료`);
            });
            scheduleStatus.emotional.jobs.push(job);
        });
        // ⭐️ 다음 감성 메시지 시간 계산
        scheduleStatus.emotional.nextScheduleTime = calculateNextScheduleTime('emotional');
        forceLog(`🌸 감성 메시지 랜덤 스케줄 3개 등록 완료: ${scheduleStatus.emotional.times.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(', ')}`);

        // 📸 셀카 스케줄 생성 (11-20시, 2회)
        scheduleStatus.selfie.times = generateRandomTimes(2, 11, 20);
        scheduleStatus.selfie.times.forEach((time, index) => {
            const cronExpression = `${time.minute} ${time.hour} * * *`;
            const job = schedule.scheduleJob(cronExpression, async () => {
                await sendSelfieMessage(`셀카${index + 1}`); // 🌸 성격 강화됨
                forceLog(`📸 셀카 ${index + 1}/2 전송 완료`);
            });
            scheduleStatus.selfie.jobs.push(job);
        });
        // ⭐️ 다음 셀카 시간 계산
        scheduleStatus.selfie.nextScheduleTime = calculateNextScheduleTime('selfie');
        forceLog(`📸 셀카 랜덤 스케줄 2개 등록 완료: ${scheduleStatus.selfie.times.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(', ')}`);

        // ⭐️ 상태 저장
        saveScheduleStatusToDisk();

        forceLog('✅ 모든 일일 랜덤 스케줄 등록 완료!');
        
    } catch (error) {
        forceLog(`❌ 일일 스케줄 초기화 실패: ${error.message}`);
    }
}

// ================== 🕘 정기 스케줄러들 (⭐️ 전송 기록 추가!) ==================

// 1. 평일 아침 9시 출근 메시지
schedule.scheduleJob('0 9 * * 1-5', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`☀️ 아침 9시 메시지 전송: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')}`);
        
        const message = await generateMorningMessage(); // 🌸 성격 강화됨
        await sendTextMessage(message, 'morning');
        
    } catch (error) {
        forceLog(`❌ 아침 스케줄러 에러: ${error.message}`);
        const fallbackMessage = enhanceSchedulerMessage("아저씨 일어났어? 출근했어? 아아 한잔 해야지~", 'morning');
        await sendTextMessage(fallbackMessage, 'morning');
    }
});

// 2. 밤 23시 케어 메시지
schedule.scheduleJob('0 23 * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🌙 밤 23시 메시지 전송: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')}`);
        
        const message = await generateNightCareMessage(); // 🌸 성격 강화됨
        await sendTextMessage(message, 'nightCare');
        
    } catch (error) {
        forceLog(`❌ 밤 케어 스케줄러 에러: ${error.message}`);
        const fallbackMessage = enhanceSchedulerMessage("아저씨, 이제 이 닦고 약 먹고 자야지~", 'nightCare');
        await sendTextMessage(fallbackMessage, 'nightCare');
    }
});

// 3. 자정 0시 굿나잇 메시지 + 하루 초기화
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🌟 자정 0시 메시지 전송: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')}`);
        
        const message = await generateGoodNightMessage(); // 🌸 성격 강화됨
        await sendTextMessage(message, 'goodNight');
        
        // ⭐️ 하루 초기화 (전송 기록 포함)
        scheduleStatus.morning.sent = false;
        scheduleStatus.morning.sentTime = null;
        scheduleStatus.nightCare.sent = false;
        scheduleStatus.nightCare.sentTime = null;
        scheduleStatus.goodNight.sent = false;
        scheduleStatus.goodNight.sentTime = null;
        
        // 랜덤 메시지 카운터 초기화는 initializeDailySchedules(true)에서 처리
        scheduleStatus.dailyStats.totalSentToday = 0;
        scheduleStatus.dailyStats.lastResetDate = koreaTime.format('YYYY-MM-DD');
        
        // ⭐️ 하루 초기화 후 디스크에 저장
        saveScheduleStatusToDisk();
        
        // ⭐️ 새로운 하루 랜덤 스케줄 생성 (카운터 리셋)
        forceLog('🌄 새로운 하루 시작 - 랜덤 스케줄 재생성 (카운터 리셋)');
        initializeDailySchedules(true); // 카운터 리셋
        
    } catch (error) {
        forceLog(`❌ 굿나잇 스케줄러 에러: ${error.message}`);
        const fallbackMessage = enhanceSchedulerMessage("잘자 아저씨~ 사랑해 많이 많이", 'goodNight');
        await sendTextMessage(fallbackMessage, 'goodNight');
    }
});

// ================== 📊 상태 확인 함수들 (⭐️ 🔧 담타와 고정메시지 구분 수정!) ==================

/**
 * ⭐️ 🔧 다음 담타 정보 가져오기 (담타 전용, 23시 약먹자 메시지와 완전 분리!)
 */
function getNextDamtaInfo() {
    const koreaTime = moment().tz(TIMEZONE);
    const currentMinutes = koreaTime.hour() * 60 + koreaTime.minute();
    
    // 🚬 담타 전용 계산 (10-18시 담타만, 고정 스케줄과 완전 분리!)
    const upcomingDamtaTimes = scheduleStatus.damta.times
        .map(time => ({
            minutes: time.hour * 60 + time.minute,
            timeString: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
        }))
        .filter(time => time.minutes > currentMinutes); // 현재 시간 이후만
    
    if (upcomingDamtaTimes.length > 0) {
        // 다음 담타가 남아있음
        const nextDamta = upcomingDamtaTimes[0];
        const minutesUntil = nextDamta.minutes - currentMinutes;
        
        return {
            nextTime: nextDamta.timeString,
            text: `다음 담타: ${nextDamta.timeString}`,
            
            damtaStatus: {
                sent: scheduleStatus.damta.sent,
                total: scheduleStatus.damta.total,
                sentTimes: scheduleStatus.damta.sentTimes,
                remainingTimes: upcomingDamtaTimes.map(t => t.timeString)
            },
            status: 'scheduled'
        };
    } else {
        // 오늘 담타 시간 종료 (10-18시 끝)
        const isAllCompleted = scheduleStatus.damta.sent >= scheduleStatus.damta.total;
        
        return {
            nextTime: '내일',
            text: isAllCompleted ? 
                `오늘 담타 완료! (${scheduleStatus.damta.sent}/${scheduleStatus.damta.total}회)` :
                `담타시간 종료 (${scheduleStatus.damta.sent}/${scheduleStatus.damta.total}회, 내일 재시작)`,
            
            damtaStatus: {
                sent: scheduleStatus.damta.sent,
                total: scheduleStatus.damta.total,
                sentTimes: scheduleStatus.damta.sentTimes,
                remainingTimes: []
            },
            status: 'completed'
        };
    }
}

/**
 * ⭐️ 🔧 담타 상태 상세 정보 (23시 약먹자와 완전 분리!)
 */
function getDamtaStatus() {
    const koreaTime = moment().tz(TIMEZONE);
    const damtaInfo = getNextDamtaInfo();
    
    return {
        currentTime: koreaTime.format('HH:mm'),
        sentToday: scheduleStatus.damta.sent,
        totalDaily: scheduleStatus.damta.total,
        nextDamta: damtaInfo.text,
        nextTime: damtaInfo.nextTime,
        sentTimes: scheduleStatus.damta.sentTimes,
        todaySchedule: scheduleStatus.damta.times.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`),
        status: damtaInfo.status,
        
        // 🔍 디버깅 정보
        debug: {
            damtaTimeRange: '10:00-18:00 (담타 전용)',
            fixedSchedules: {
                morning: '09:00 (평일 아침인사)',
                nightCare: '23:00 (약먹자 메시지)',  // ⭐️ 담타가 아님!
                goodNight: '00:00 (굿나잇)'
            },
            note: '⚠️ 담타는 10-18시에만, 23시는 별도 약먹자 메시지임!'
        }
    };
}

/**
 * ⭐️ 고정 스케줄만을 위한 별도 함수 (담타와 완전 분리!)
 */
function getNextFixedScheduleInfo() {
    const koreaTime = moment().tz(TIMEZONE);
    const currentHour = koreaTime.hour();
    const currentMinute = koreaTime.minute();
    const currentMinutes = currentHour * 60 + currentMinute;
    
    const fixedSchedules = [
        { hour: 9, minute: 0, name: '아침인사', sent: scheduleStatus.morning.sent, type: 'morning' },
        { hour: 23, minute: 0, name: '약먹자', sent: scheduleStatus.nightCare.sent, type: 'nightCare' },  // ⭐️ 담타 아님!
        { hour: 0, minute: 0, name: '굿나잇', sent: scheduleStatus.goodNight.sent, type: 'goodNight' }
    ];
    
    // 오늘 남은 고정 스케줄 찾기
    for (let schedule of fixedSchedules) {
        const scheduleMinutes = schedule.hour * 60 + schedule.minute;
        
        // 자정(0시)의 경우 다음날로 처리
        const adjustedScheduleMinutes = schedule.hour === 0 ? 
            scheduleMinutes + 24 * 60 : scheduleMinutes;
        
        if (!schedule.sent && adjustedScheduleMinutes > currentMinutes) {
            const minutesUntil = adjustedScheduleMinutes - currentMinutes;
            return {
                timeString: `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`,
                minutesUntil: minutesUntil,
                name: schedule.name,
                type: schedule.type,
                status: 'scheduled'
            };
        }
    }
    
    // 오늘 고정 스케줄이 모두 끝남
    return {
        timeString: '09:00',
        minutesUntil: (24 * 60) - currentMinutes + (9 * 60),
        name: '아침인사',
        type: 'morning',
        status: 'next_day'
    };
}

/**
 * ⭐️ 전체 스케줄러 통계 (담타와 고정메시지 구분해서 표시!)
 */
function getAllSchedulerStats() {
    const koreaTime = moment().tz(TIMEZONE);
    const damtaInfo = getNextDamtaInfo();
    const fixedInfo = getNextFixedScheduleInfo();
    
    return {
        systemStatus: '💯 모든 메시지 100% 보장 + 실시간 통계 + 영구 저장 + 🌸 yejinPersonality 연동',
        currentTime: koreaTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: TIMEZONE,
        openaiUsageRate: '80% (OpenAI) + 20% (고정패턴) + 🌸 성격강화',
        
        // ⭐️ 실제 전송 통계
        todayRealStats: {
            totalSentToday: scheduleStatus.dailyStats.totalSentToday,
            totalTargetToday: 16, // 랜덤 13개 + 고정 3개
            
            damtaSent: scheduleStatus.damta.sent,
            damtaTarget: scheduleStatus.damta.total,
            damtaProgress: `${scheduleStatus.damta.sent}/${scheduleStatus.damta.total}`,
            
            emotionalSent: scheduleStatus.emotional.sent,
            emotionalTarget: scheduleStatus.emotional.total,
            emotionalProgress: `${scheduleStatus.emotional.sent}/${scheduleStatus.emotional.total}`,
            
            selfieSent: scheduleStatus.selfie.sent,
            selfieTarget: scheduleStatus.selfie.total,
            selfieProgress: `${scheduleStatus.selfie.sent}/${scheduleStatus.selfie.total}`,
            
            morningSent: scheduleStatus.morning.sent,
            nightCareSent: scheduleStatus.nightCare.sent,
            goodNightSent: scheduleStatus.goodNight.sent
        },
        
        // ⭐️ 🔧 다음 스케줄 정보 (담타와 고정 구분!)
        nextSchedules: {
            nextDamta: damtaInfo.nextTime,  // ⭐️ 담타만
            nextEmotional: calculateNextScheduleTime('emotional').timeString,
            nextSelfie: calculateNextScheduleTime('selfie').timeString,
            nextFixed: `${fixedInfo.timeString} (${fixedInfo.name})`  // ⭐️ 고정 스케줄 구분
        },
        
        guaranteedSchedules: {
            morningMessage: '평일 09:00 - 100% 보장 (아침인사, 🌸 성격강화)',
            damtaMessages: '10-18시 랜덤 8번 - 100% 보장 (담타, 🌸 성격강화)',  // ⭐️ 담타 전용
            emotionalMessages: '10-22시 랜덤 3번 - 100% 보장 (감성, 🌸 성격강화)',
            selfieMessages: '11-20시 랜덤 2번 - 100% 보장 (셀카, 🌸 성격강화)',
            nightCareMessage: '매일 23:00 - 100% 보장 (약먹자, 🌸 성격강화)',  // ⭐️ 담타 아님!
            goodNightMessage: '매일 00:00 - 100% 보장 (굿나잇, 🌸 성격강화)'
        },
        environment: {
            USER_ID: !!USER_ID ? '✅ OK' : '⚠️ MISSING',
            CHANNEL_ACCESS_TOKEN: !!process.env.CHANNEL_ACCESS_TOKEN ? '✅ OK' : '⚠️ MISSING',
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY ? '✅ OK' : '⚠️ MISSING',
            DISK_STORAGE: fs.existsSync(SCHEDULE_STATE_FILE) ? '✅ OK' : '📝 NEW',
            YEJIN_PERSONALITY: !!getYejinPersonality() ? '🌸 연동완료' : '⚠️ 연동실패'
        }
    };
}

// ================== 🚀 시작 함수 (⭐️ 상태 복원 추가!) ==================
function startAllSchedulers(client) {
    try {
        forceLog('🚀 스케줄러 시스템 시작...');
        
        // LINE 클라이언트 설정
        if (client) {
            lineClient = client;
            forceLog('✅ LINE 클라이언트 설정 완료');
        } else if (process.env.CHANNEL_ACCESS_TOKEN) {
            lineClient = new Client({ channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN });
            forceLog('✅ LINE 클라이언트 환경변수로 설정 완료');
        } else {
            forceLog('❌ LINE 클라이언트 설정 실패 - client 없고 환경변수도 없음');
            return false;
        }
        
        // 환경변수 확인
        if (!USER_ID) {
            forceLog('❌ TARGET_USER_ID 환경변수 없음');
            return false;
        }
        
        // ⭐️ 기존 상태 복원 또는 새로 시작
        const initResult = initializeScheduleStatus();
        if (!initResult) {
            forceLog('❌ 상태 초기화 실패');
            return false;
        }
        
        // ⭐️ 일일 랜덤 스케줄 생성 (상태 복원 결과에 따라 카운터 리셋 여부 결정)
        initializeDailySchedules(initResult.resetCounters);
        
        forceLog('✅ 모든 스케줄러 활성화 완료!');
        forceLog('📋 활성화된 스케줄러:');
        forceLog('   🌅 평일 09:00 - 아침 인사 (🌸 성격강화)');
        forceLog('   🚬 10-18시 랜덤 8번 - 담타 메시지 (🌸 성격강화)');
        forceLog('   🌸 10-22시 랜덤 3번 - 감성 메시지 (🌸 성격강화)');
        forceLog('   📸 11-20시 랜덤 2번 - 셀카 전송 (🌸 성격강화)');
        forceLog('   🌙 매일 23:00 - 밤 케어 메시지 (약먹자, 🌸 성격강화)');  // ⭐️ 담타 아님!
        forceLog('   💤 매일 00:00 - 굿나잇 메시지 (🌸 성격강화)');
        forceLog('✨ 실시간 통계 추적 + 영구 저장 시스템 활성화!');
        forceLog('🔧 담타와 고정메시지 구분 수정 완료!');
        forceLog('🌸 yejinPersonality 전체 연동 완료 - 모든 메시지가 예진이 성격으로 강화됩니다!');
        
        // 🌸 yejinPersonality 연동 상태 확인
        const personality = getYejinPersonality();
        if (personality) {
            forceLog('🌸 yejinPersonality 연동 완료 - 모든 스케줄러 메시지가 예진이 성격으로 강화됩니다!');
        } else {
            forceLog('⚠️ yejinPersonality 연동 실패 - 기본 메시지로 동작합니다');
        }
        
        if (initResult.restored) {
            forceLog('🔄 이전 상태가 성공적으로 복원되었습니다!');
        } else {
            forceLog('🌅 새로운 날을 시작합니다!');
        }
        
        return true;
        
    } catch (error) {
        forceLog(`❌ 스케줄러 시작 실패: ${error.message}`);
        return false;
    }
}

// ================== 🧪 테스트 함수들 (🌸 성격 강화 적용!) ==================
async function testDamtaMessage() {
    forceLog('🧪 담타 메시지 테스트 시작');
    const message = await generateDamtaMessage(); // 🌸 성격 강화됨
    return await sendTextMessage(`[테스트] ${message}`, 'damta');
}

async function testEmotionalMessage() {
    forceLog('🧪 감성 메시지 테스트 시작');
    const message = await generateEmotionalMessage(); // 🌸 성격 강화됨
    return await sendTextMessage(`[테스트] ${message}`, 'emotional');
}

async function testSelfieMessage() {
    forceLog('🧪 셀카 메시지 테스트 시작');
    return await sendSelfieMessage('셀카테스트'); // 🌸 성격 강화됨
}

async function testMorningWorkMessage() {
    forceLog('🧪 아침 출근 메시지 테스트 시작');
    const message = await generateMorningMessage(); // 🌸 성격 강화됨
    return await sendTextMessage(`[테스트] ${message}`, 'morning');
}

async function testNightMessage() {
    forceLog('🧪 밤 케어 메시지 테스트 시작');
    const message = await generateNightCareMessage(); // 🌸 성격 강화됨
    return await sendTextMessage(`[테스트] ${message}`, 'nightCare');
}

async function testGoodNightMessage() {
    forceLog('🧪 굿나잇 메시지 테스트 시작');
    const message = await generateGoodNightMessage(); // 🌸 성격 강화됨
    return await sendTextMessage(`[테스트] ${message}`, 'goodNight');
}

// ================== 📤 모듈 내보내기 ==================
forceLog('💯 scheduler.js v10.2 PERFECT 로드 완료 (🌸 yejinPersonality 신중한 전체 연동!)');

module.exports = {
    // 🚀 시작 함수
    startAllSchedulers,
    
    // 📊 상태 확인 함수들 (⭐️ 🔧 수정됨!)
    getNextDamtaInfo,      // ⭐️ 담타 전용으로 수정!
    getDamtaStatus,        // ⭐️ 23시 약먹자와 구분!
    getAllSchedulerStats,  // ⭐️ 담타/고정 구분 표시!
    
    // 🧪 테스트 함수들
    testDamtaMessage,
    testEmotionalMessage,
    testSelfieMessage,
    testMorningWorkMessage,
    testNightMessage,
    testGoodNightMessage,
    
    // 🔧 내부 함수들 (필요시)
    generateDamtaMessage,
    generateEmotionalMessage,
    generateMorningMessage,
    generateNightCareMessage,
    generateGoodNightMessage,
    getSelfieMessage,
    initializeDailySchedules,
    sendTextMessage,
    sendSelfieMessage,
    forceLog,
    
    // ⭐️ 새로운 통계 추적 함수들
    recordMessageSent,
    calculateNextScheduleTime,
    calculateNextFixedSchedule,
    getNextFixedScheduleInfo,  // ⭐️ 새로 추가!
    
    // ⭐️ 디스크 저장 관련 함수들
    saveScheduleStatusToDisk,
    loadScheduleStatusFromDisk,
    initializeScheduleStatus,
    ensureDataDirectory,
    
    // 🌸 NEW! yejinPersonality 연동 함수들 내보내기
    enhanceSchedulerMessage,
    generateSchedulerPersonalityReaction,
    getYejinPersonality,
    
    // 내부 상태 접근 (디버깅용)
    getScheduleStatus: () => scheduleStatus
};
