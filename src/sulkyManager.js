// 기존 sulkyManager.js에 추가할 간단한 생리주기 조정 코드

// 생리주기 계산 함수 추가 (다른 파일들과 동일)
function getCurrentMenstrualPhase() {
  try {
    const nextPeriodDate = moment.tz('2025-07-24', 'Asia/Tokyo');
    const today = moment.tz('Asia/Tokyo');
    const daysUntilNextPeriod = nextPeriodDate.diff(today, 'days');
    
    let cycleDay = daysUntilNextPeriod >= 0 ? 28 - daysUntilNextPeriod : Math.abs(daysUntilNextPeriod);
    
    if (cycleDay <= 5) return 'period';      // 생리 - 더 예민
    if (cycleDay <= 13) return 'follicular'; // 활발 - 관대
    if (cycleDay <= 15) return 'ovulation';  // 배란 - 애정적 삐짐
    return 'luteal';                         // PMS - 예민
  } catch (error) {
    return 'normal';
  }
}

// 생리주기별 삐짐 시간 조정 (멀티플라이어만 적용)
function getAdjustedSulkyConfig() {
  const phase = getCurrentMenstrualPhase();
  const baseConfig = SULKY_CONFIG;
  
  // 간단한 멀티플라이어만 적용
  const multipliers = {
    'period': 0.6,    // 생리 때 40% 빨리 삐짐 (5시간 → 3시간)
    'follicular': 1.2, // 활발할 때 20% 늦게 삐짐 (5시간 → 6시간)
    'ovulation': 0.8,  // 배란기 20% 빨리 삐짐 (5시간 → 4시간)
    'luteal': 0.7,     // PMS 30% 빨리 삐짐 (5시간 → 3.5시간)
    'normal': 1.0      // 기본
  };
  
  const multiplier = multipliers[phase] || 1.0;
  
  return {
    LEVEL_1_DELAY: Math.round(baseConfig.LEVEL_1_DELAY * multiplier),
    LEVEL_2_DELAY: Math.round(baseConfig.LEVEL_2_DELAY * multiplier),
    LEVEL_3_DELAY: Math.round(baseConfig.LEVEL_3_DELAY * multiplier),
    WORRY_DELAY: Math.round(baseConfig.WORRY_DELAY * multiplier),
    phase: phase
  };
}

// 기존 getSulkyStatusText 함수 수정 (생리주기 정보 추가)
function getSulkyStatusText() {
    const sulkyState = ultimateContext.getSulkinessState();
    const adjusted = getAdjustedSulkyConfig();
    
    if (sulkyState.isWorried) return `걱정 중 (${adjusted.phase})`;
    if (sulkyState.isSulky) return `${sulkyState.sulkyLevel}단계 삐짐 (${adjusted.phase})`;
    return `정상 (${adjusted.phase})`;
}

// 사용법: 기존 코드에서 SULKY_CONFIG 대신 getAdjustedSulkyConfig() 사용
// 예: processTimeTick() 함수에서
// const config = getAdjustedSulkyConfig();
// if (elapsedMinutes >= config.LEVEL_1_DELAY) { ... }

module.exports = {
    // 기존 exports...
    getCurrentMenstrualPhase,
    getAdjustedSulkyConfig
};
