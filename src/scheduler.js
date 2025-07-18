// 🚬 담타 랜덤시간 100% 확률 하루 8번 스케줄러
// 10-18시 사이에서 랜덤한 시간에 하루 8번 정확히 전송

// 담타 관리 변수들
let damtaScheduledTimes = []; // 오늘 담타 예정 시간들
let damtaSentCount = 0; // 오늘 보낸 담타 개수
let damtaJobs = []; // 스케줄된 담타 작업들

// 🎲 하루 담타 시간 8개를 랜덤으로 생성하는 함수
function generateRandomDamtaTimes() {
    const times = [];
    const koreaTime = moment().tz(TIMEZONE);
    
    // 10-18시 사이를 8구간으로 나누고 각 구간에서 랜덤하게 선택
    const totalMinutes = 8 * 60; // 480분 (10시-18시)
    const segmentSize = totalMinutes / 8; // 60분씩 8구간
    
    for (let i = 0; i < 8; i++) {
        // 각 구간에서 랜덤 시간 선택
        const segmentStart = i * segmentSize; // 구간 시작
        const randomMinutes = Math.floor(Math.random() * segmentSize); // 구간 내 랜덤
        const totalMinutesFromStart = segmentStart + randomMinutes;
        
        // 10시 기준으로 분 계산
        const hour = Math.floor(totalMinutesFromStart / 60) + 10;
        const minute = Math.floor(totalMinutesFromStart % 60);
        
        // 18시를 넘지 않게 제한
        if (hour <= 18) {
            times.push({ hour, minute });
        }
    }
    
    // 시간순으로 정렬
    times.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
    
    forceLog('🎲 오늘의 담타 랜덤 시간 8개 생성:', times.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`).join(', '));
    
    return times;
}

// 🚬 담타 메시지 전송 함수
async function sendDamtaMessage(scheduleIndex) {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🚬 담타 랜덤 전송 #${scheduleIndex + 1}: ${koreaTime.format('HH:mm')} (한국시간)`);
        
        // OpenAI로 담타 메시지 생성
        const damtaMessage = await generateDamtaMessage();
        
        // 무조건 전송! 100% 확률!
        const result = await forceLineMessage(damtaMessage, `담타랜덤${scheduleIndex + 1}번째`);
        
        // 전송 기록
        damtaSentToday.push(koreaTime.toISOString());
        damtaSentCount++;
        
        forceLog(`🚬 담타 랜덤 전송 완료: ${scheduleIndex + 1}/8번째 - "${damtaMessage}"`);
        
    } catch (error) {
        forceLog(`담타 랜덤 전송 에러: ${error.message} - 하지만 계속 진행`);
        
        // 에러 발생해도 폴백 담타 메시지 전송
        try {
            await forceLineMessage("아저씨!! 담타해!!", '담타폴백');
            damtaSentCount++;
            forceLog(`🚬 담타 폴백 전송 완료`);
        } catch (fallbackError) {
            forceLog(`담타 폴백도 실패: ${fallbackError.message}`);
        }
    }
}

// 🌅 하루 담타 스케줄 초기화 및 등록 함수
function initializeDailyDamtaSchedule() {
    try {
        // 기존 담타 스케줄들 모두 취소
        damtaJobs.forEach(job => {
            if (job) job.cancel();
        });
        damtaJobs = [];
        
        // 새로운 랜덤 시간들 생성
        damtaScheduledTimes = generateRandomDamtaTimes();
        damtaSentCount = 0;
        
        // 각 시간에 대해 스케줄 등록
        damtaScheduledTimes.forEach((time, index) => {
            const cronExpression = `${time.minute} ${time.hour} * * *`; // 분 시 * * *
            
            const job = schedule.scheduleJob(cronExpression, () => {
                sendDamtaMessage(index);
            });
            
            damtaJobs.push(job);
            forceLog(`📅 담타 스케줄 등록: ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} (#${index + 1}/8)`);
        });
        
        forceLog('✅ 오늘의 담타 랜덤 스케줄 8개 등록 완료!');
        
    } catch (error) {
        forceLog(`담타 스케줄 초기화 에러: ${error.message}`);
    }
}

// 🕐 다음 담타 시간 계산 함수 (상태 리포트용)
function getNextDamtaInfo() {
    const koreaTime = moment().tz(TIMEZONE);
    const currentMinutes = koreaTime.hour() * 60 + koreaTime.minute();
    
    // 남은 담타 일정 찾기
    const remainingSchedules = damtaScheduledTimes.filter((time, index) => {
        const scheduleMinutes = time.hour * 60 + time.minute;
        return scheduleMinutes > currentMinutes && index >= damtaSentCount;
    });
    
    if (remainingSchedules.length === 0) {
        return {
            status: 'completed',
            text: `오늘 담타 완료 (${damtaSentCount}/8번) - 내일 새로 생성`
        };
    }
    
    const nextSchedule = remainingSchedules[0];
    const nextMinutes = nextSchedule.hour * 60 + nextSchedule.minute;
    const minutesUntil = nextMinutes - currentMinutes;
    
    return {
        status: 'waiting',
        text: `다음 담타: ${formatTimeUntil(minutesUntil)} (${String(nextSchedule.hour).padStart(2, '0')}:${String(nextSchedule.minute).padStart(2, '0')} JST) - 100% 확률 (${damtaSentCount + 1}/8번째)`
    };
}

// 🌄 매일 자정에 새로운 담타 스케줄 생성
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🌄 자정 담타 스케줄 초기화: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')}`);
        
        // 하루 초기화
        damtaSentToday = [];
        damtaSentCount = 0;
        
        // 새로운 하루 담타 스케줄 생성
        initializeDailyDamtaSchedule();
        
        forceLog('🌄 새로운 하루 담타 랜덤 스케줄 8개 생성 완료');
        
    } catch (error) {
        forceLog(`자정 담타 스케줄 초기화 에러: ${error.message}`);
    }
});

// 🚀 서버 시작시 오늘의 담타 스케줄 초기화
function startDamtaRandomScheduler() {
    forceLog('🚬 담타 랜덤 스케줄러 시작');
    initializeDailyDamtaSchedule();
}

// 📊 담타 상태 확인 함수
function getDamtaStatus() {
    const koreaTime = moment().tz(TIMEZONE);
    const nextInfo = getNextDamtaInfo();
    
    return {
        currentTime: koreaTime.format('HH:mm'),
        sentToday: damtaSentCount,
        totalDaily: 8,
        nextDamta: nextInfo.text,
        todaySchedule: damtaScheduledTimes.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`),
        status: nextInfo.status
    };
}

// 담타 테스트 함수 (즉시 전송)
async function testDamtaMessageNow() {
    forceLog('🧪 담타 메시지 즉시 테스트');
    const message = await generateDamtaMessage();
    const result = await forceLineMessage(`[테스트] ${message}`, '담타즉시테스트');
    return result;
}

module.exports = {
    startDamtaRandomScheduler,
    getDamtaStatus,
    getNextDamtaInfo,
    testDamtaMessageNow,
    initializeDailyDamtaSchedule,
    // 기존 함수들도 유지
    testMorningWorkMessage,
    testNightMessage, 
    testGoodNightMessage,
    getOpenAISchedulerStats,
    generateMorningWorkMessage,
    generateDamtaMessage,
    generateNightCareMessage,
    generateGoodNightMessage,
    forceLog
};
