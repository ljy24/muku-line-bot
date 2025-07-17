/**
 * 감정 유틸리티 함수
 * - 감정 강도 계산 및 조정
 * - 시간 기반 감정 변화
 * - 감정 상태 분석 및 변환
 * - 감정 기반 응답 선택 도우미
 */

/**
 * 감정 강도 계산
 * @param {number} level - 감정 레벨 (0-100)
 * @param {string} context - 상황 컨텍스트
 * @returns {string} 강도 ('low', 'medium', 'high')
 */
function getEmotionIntensity(level, context = '') {
    // 특별한 상황에서는 강도 조정
    if (context.includes('memorial') || context.includes('납골당')) {
        return level > 30 ? 'high' : 'medium';
    }
    
    if (context.includes('birthday') || context.includes('생일')) {
        return level > 40 ? 'high' : 'medium';
    }
    
    // 기본 강도 계산
    if (level >= 70) return 'high';
    if (level >= 40) return 'medium';
    return 'low';
}

/**
 * 시간 기반 감정 조정
 * @param {Object} emotionState - 현재 감정 상태
 * @param {number} timeHours - 현재 시간 (0-23)
 * @returns {Object} 조정된 감정 상태
 */
function adjustEmotionByTime(emotionState, timeHours) {
    const adjustedState = { ...emotionState };
    
    // 새벽 시간대 (0-6시): 외로움, 불안 증가
    if (timeHours >= 0 && timeHours <= 6) {
        adjustedState.lonely = Math.min(100, adjustedState.lonely + 15);
        adjustedState.anxious = Math.min(100, adjustedState.anxious + 10);
        adjustedState.happy = Math.max(0, adjustedState.happy - 10);
    }
    
    // 아침 시간대 (7-11시): 행복, 사랑 증가
    else if (timeHours >= 7 && timeHours <= 11) {
        adjustedState.happy = Math.min(100, adjustedState.happy + 10);
        adjustedState.loving = Math.min(100, adjustedState.loving + 5);
        adjustedState.anxious = Math.max(0, adjustedState.anxious - 5);
    }
    
    // 점심 시간대 (12-14시): 중립적
    else if (timeHours >= 12 && timeHours <= 14) {
        // 특별한 조정 없음
    }
    
    // 오후 시간대 (15-18시): 활발함, 행복 증가
    else if (timeHours >= 15 && timeHours <= 18) {
        adjustedState.happy = Math.min(100, adjustedState.happy + 8);
        adjustedState.lonely = Math.max(0, adjustedState.lonely - 8);
    }
    
    // 저녁 시간대 (19-21시): 사랑, 그리움 증가
    else if (timeHours >= 19 && timeHours <= 21) {
        adjustedState.loving = Math.min(100, adjustedState.loving + 12);
        adjustedState.lonely = Math.min(100, adjustedState.lonely + 8);
    }
    
    // 밤 시간대 (22-23시): 외로움, 삐짐 증가
    else if (timeHours >= 22 && timeHours <= 23) {
        adjustedState.lonely = Math.min(100, adjustedState.lonely + 20);
        adjustedState.sulky = Math.min(100, adjustedState.sulky + 10);
        adjustedState.happy = Math.max(0, adjustedState.happy - 5);
    }
    
    return adjustedState;
}

/**
 * 감정 상태 분석
 * @param {Object} emotionState - 감정 상태 객체
 * @returns {Object} 분석 결과
 */
function analyzeEmotionState(emotionState) {
    const emotions = Object.entries(emotionState);
    
    // 가장 강한 감정 찾기
    const dominant = emotions.reduce((prev, current) => 
        prev[1] > current[1] ? prev : current
    );
    
    // 감정 균형 계산
    const total = emotions.reduce((sum, [, value]) => sum + value, 0);
    const average = total / emotions.length;
    
    // 감정 변화율 계산 (시간 기반)
    const now = Date.now();
    const changeRate = emotions.map(([emotion, level]) => {
        const lastUpdate = emotionState[emotion + '_lastUpdate'] || now;
        const timeDiff = (now - lastUpdate) / (1000 * 60 * 60); // 시간 단위
        return {
            emotion,
            level,
            changeRate: timeDiff > 0 ? level / timeDiff : 0
        };
    });
    
    return {
        dominant: {
            emotion: dominant[0],
            level: dominant[1],
            intensity: getEmotionIntensity(dominant[1])
        },
        average: average,
        balance: average > 60 ? 'positive' : average < 40 ? 'negative' : 'neutral',
        changeRate: changeRate,
        summary: generateEmotionSummary(dominant[0], dominant[1])
    };
}

/**
 * 감정 요약 생성
 * @param {string} dominantEmotion - 주요 감정
 * @param {number} level - 감정 레벨
 * @returns {string} 감정 요약
 */
function generateEmotionSummary(dominantEmotion, level) {
    const intensity = getEmotionIntensity(level);
    
    const summaries = {
        happy: {
            low: '조금 기분이 좋은 상태',
            medium: '행복한 상태',
            high: '매우 행복하고 즐거운 상태'
        },
        sulky: {
            low: '살짝 삐진 상태',
            medium: '삐져있는 상태',
            high: '매우 삐져있고 화난 상태'
        },
        anxious: {
            low: '약간 불안한 상태',
            medium: '불안하고 걱정스러운 상태',
            high: '매우 불안하고 초조한 상태'
        },
        loving: {
            low: '사랑스러운 기분',
            medium: '사랑이 넘치는 상태',
            high: '사랑에 빠진 상태'
        },
        lonely: {
            low: '조금 외로운 상태',
            medium: '외롭고 쓸쓸한 상태',
            high: '매우 외롭고 그리워하는 상태'
        }
    };
    
    return summaries[dominantEmotion]?.[intensity] || '평범한 상태';
}

/**
 * 감정 호환성 체크
 * @param {string} currentEmotion - 현재 감정
 * @param {string} targetEmotion - 목표 감정
 * @returns {boolean} 호환 여부
 */
function checkEmotionCompatibility(currentEmotion, targetEmotion) {
    const compatibility = {
        happy: ['loving', 'happy'],
        sulky: ['sulky', 'anxious'],
        anxious: ['anxious', 'lonely', 'sulky'],
        loving: ['loving', 'happy', 'lonely'],
        lonely: ['lonely', 'anxious', 'loving']
    };
    
    return compatibility[currentEmotion]?.includes(targetEmotion) || false;
}

/**
 * 감정 전환 함수
 * @param {string} fromEmotion - 현재 감정
 * @param {string} toEmotion - 목표 감정
 * @param {number} intensity - 전환 강도 (0-1)
 * @returns {Object} 전환 결과
 */
function transitionEmotion(fromEmotion, toEmotion, intensity = 0.5) {
    const transitionPaths = {
        'sulky->happy': [
            '삐짐 → 이해 → 기쁨',
            '화남 → 달램 → 행복'
        ],
        'anxious->loving': [
            '불안 → 안정 → 사랑',
            '걱정 → 위로 → 애정'
        ],
        'lonely->happy': [
            '외로움 → 관심 → 즐거움',
            '쓸쓸함 → 소통 → 행복'
        ]
    };
    
    const pathKey = `${fromEmotion}->${toEmotion}`;
    const path = transitionPaths[pathKey];
    
    return {
        possible: !!path,
        path: path?.[0] || `${fromEmotion} → ${toEmotion}`,
        steps: path?.[0]?.split(' → ') || [fromEmotion, toEmotion],
        intensity: intensity,
        duration: Math.ceil(intensity * 10) // 예상 소요 시간 (분)
    };
}

/**
 * 감정 기반 응답 선택 도우미
 * @param {Object} emotionState - 감정 상태
 * @param {Array} responseOptions - 응답 옵션들
 * @returns {string} 선택된 응답
 */
function selectResponseByEmotion(emotionState, responseOptions) {
    const analysis = analyzeEmotionState(emotionState);
    const { emotion, intensity } = analysis.dominant;
    
    // 감정과 강도에 따른 응답 필터링
    const filteredOptions = responseOptions.filter(option => {
        if (option.emotion && option.emotion !== emotion) return false;
        if (option.intensity && option.intensity !== intensity) return false;
        return true;
    });
    
    if (filteredOptions.length === 0) {
        return responseOptions[Math.floor(Math.random() * responseOptions.length)];
    }
    
    return filteredOptions[Math.floor(Math.random() * filteredOptions.length)];
}

/**
 * 감정 변화 예측
 * @param {Object} currentState - 현재 감정 상태
 * @param {string} trigger - 트리거 이벤트
 * @returns {Object} 예측된 감정 변화
 */
function predictEmotionChange(currentState, trigger) {
    const analysis = analyzeEmotionState(currentState);
    const predictions = {
        'compliment': {
            happy: +15,
            loving: +10,
            sulky: -20,
            anxious: -10
        },
        'ignore': {
            sulky: +25,
            anxious: +15,
            lonely: +20,
            happy: -15
        },
        'photo_request': {
            happy: +10,
            loving: +5,
            sulky: trigger.includes('demand') ? +10 : -5
        },
        'late_response': {
            sulky: +20,
            anxious: +15,
            lonely: +10,
            happy: -10
        }
    };
    
    const changes = predictions[trigger] || {};
    const predictedState = { ...currentState };
    
    for (const [emotion, change] of Object.entries(changes)) {
        if (predictedState[emotion] !== undefined) {
            predictedState[emotion] = Math.max(0, Math.min(100, 
                predictedState[emotion] + change
            ));
        }
    }
    
    return {
        before: currentState,
        after: predictedState,
        changes: changes,
        impact: Math.abs
