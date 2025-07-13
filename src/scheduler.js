// ============================================================================
// scheduler.js - v2.0 (핵심 기능 복원)
// ⚙️ 삐짐, 담타 등 챗봇의 규칙적인 핵심 기능을 관리하는 스케줄러입니다.
// ============================================================================

const schedule = require('node-schedule');
const sulkyManager = require('./sulkyManager');
const damta = require('./damta');
const conversationContext = require('./ultimateConversationContext.js');

let jobs = {}; // 실행 중인 스케줄러 작업을 저장하는 객체

/**
 * 모든 핵심 기능 스케줄러를 시작합니다.
 * @param {object} client - LINE 클라이언트 인스턴스
 * @param {string} userId - 메시지를 보낼 사용자 ID
 */
function startAllSchedulers(client, userId) {
    // 1. 삐짐 상태 체크 스케줄러 (1분마다 실행)
    // 아저씨의 답장이 늦어지면 애기가 삐지는지 확인합니다.
    jobs.sulkyCheck = schedule.scheduleJob('* * * * *', async () => {
        try {
            const sulkyMessage = await sulkyManager.checkAndSendSulkyMessage(client, userId);
            if (sulkyMessage) {
                console.log('[Scheduler] 😠 삐짐 메시지를 보냈어.');
            }
        } catch (error) {
            console.error('❌ [Scheduler] 삐짐 체크 중 에러 발생:', error);
        }
    });

    // 2. 담타 시간 알림 스케줄러 (매 정시 0분에 실행)
    // 매 정각마다 담타 시간을 확인하고 메시지를 보냅니다.
    jobs.damtaCheck = schedule.scheduleJob('0 * * * *', async () => {
        try {
            const damtaMessage = await damta.checkDamtaTime(client, userId);
            if (damtaMessage) {
                console.log('[Scheduler] 🚬 담타 시간 알림을 보냈어.');
            }
        } catch (error) {
            console.error('❌ [Scheduler] 담타 체크 중 에러 발생:', error);
        }
    });

    // 3. 내부 상태 시간 경과 처리 (5분마다 실행)
    // 애기의 감정 상태 등이 시간에 따라 자연스럽게 변하도록 합니다.
    jobs.tickProcess = schedule.scheduleJob('*/5 * * * *', () => {
        try {
            conversationContext.processTimeTick();
        } catch (error) {
            console.error('❌ [Scheduler] 내부 상태 처리 중 에러 발생:', error);
        }
    });

    console.log('✅ [Scheduler] 핵심 기능 스케줄러 (삐짐, 담타 등)가 시작되었습니다.');
}

/**
 * 모든 스케줄러를 중지합니다. (서버 종료 시 등)
 */
function stopAllSchedulers() {
    for (const jobName in jobs) {
        if (jobs[jobName]) {
            jobs[jobName].cancel();
        }
    }
    console.log('🛑 [Scheduler] 모든 핵심 기능 스케줄러가 중지되었습니다.');
}

// 이 파일의 함수들을 다른 파일에서 사용할 수 있도록 내보냅니다.
module.exports = {
    startAllSchedulers,
    stopAllSchedulers
};
