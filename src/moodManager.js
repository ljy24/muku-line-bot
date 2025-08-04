// moodManager.js의 module.exports 부분에 추가할 함수

/**
 * 🔧 [NEW] UltimateContext 전용 직접 상태 조회 (순환 참조 방지)
 * - ultimateContext를 호출하지 않고 내부 상태만 직접 반환
 * - 무한루프 완전 방지
 */
async function getCurrentMoodStateDirect() {
    try {
        // 내부 상태 변수들 직접 조회 (ultimateContext 호출 없음)
        const currentTime = Date.now();
        
        // 생리주기 상태 (마스터에서 직접)
        const menstrualPhase = getCurrentMenstrualPhase();
        
        // 기본 기분 상태 (내부 변수 직접 사용)
        let currentMood = '평온함';
        let emotionIntensity = 0.5;
        
        // 생리주기에 따른 기분 조정
        if (menstrualPhase.phase === 'period') {
            currentMood = '나른함';
            emotionIntensity = 0.7;
        } else if (menstrualPhase.phase === 'luteal') {
            currentMood = '짜증남';
            emotionIntensity = 0.6;
        } else if (menstrualPhase.phase === 'ovulation') {
            currentMood = '설렘';
            emotionIntensity = 0.8;
        }
        
        // 시간대에 따른 기분 조정 (새벽이면 예민)
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 6) {
            if (currentMood === '평온함') {
                currentMood = '나른함';
            }
            emotionIntensity = Math.min(1.0, emotionIntensity + 0.2);
        }
        
        console.log(`🔧 [직접상태조회] ${currentMood} (강도: ${emotionIntensity}, 생리: ${menstrualPhase.phase})`);
        
        return {
            currentMood: currentMood,
            emotionIntensity: emotionIntensity,
            source: 'mood_manager_direct',
            timestamp: currentTime,
            menstrualPhase: menstrualPhase.phase,
            directQuery: true,
            avoidCircularReference: true
        };
        
    } catch (error) {
        console.error('❌ [직접상태조회] 직접 조회 실패:', error.message);
        return {
            currentMood: '평온함',
            emotionIntensity: 0.5,
            source: 'mood_manager_direct_error',
            timestamp: Date.now(),
            error: error.message,
            directQuery: true,
            avoidCircularReference: true
        };
    }
}

// module.exports에 추가
getCurrentMoodStateDirect,
