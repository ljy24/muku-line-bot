// ==================== menstrualCycleManager.js ====================
// 생리주기 전용 관리 모듈 - 스케줄러에서 사용

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = path.join('/data', 'memory');
const MENSTRUAL_DATA_FILE = path.join(MEMORY_DIR, 'menstrual_cycle.json');

// 기본 생리주기 데이터 구조
let menstrualState = {
    lastPeriodStartDate: moment().subtract(15, 'days').toISOString(),
    cycleLength: 28,
    periodLength: 5,
    cycleHistory: [],
    symptoms: {
        current: [],
        history: []
    },
    moodPatterns: {
        period: { level: 'low', description: '예민하고 피곤함' },
        follicular: { level: 'high', description: '기분 좋고 활발함' },
        ovulation: { level: 'peak', description: '가장 애정적이고 예뻐함' },
        luteal: { level: 'declining', description: '점점 예민해짐, PMS' }
    }
};

// ==================== 파일 입출력 ====================
async function readJsonFile(filePath, defaultValue) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const data = await fs.readFile(filePath, 'utf8');
        if (!data) {
            await writeJsonFile(filePath, defaultValue);
            return defaultValue;
        }
        return JSON.parse(data);
    } catch (e) {
        if (e.code === 'ENOENT') {
            if (defaultValue !== undefined) {
                await writeJsonFile(filePath, defaultValue);
                return defaultValue;
            }
            return null;
        }
        console.warn(`⚠️ ${filePath} 파일 읽기 오류. 기본값으로 복구:`, e.message);
        if (defaultValue !== undefined) {
            await writeJsonFile(filePath, defaultValue);
            return defaultValue;
        }
        return null;
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`❌ ${filePath} 파일 쓰기 실패:`, error);
    }
}

// ==================== 생리주기 계산 ====================
function getCurrentMenstrualPhase() {
    try {
        const lastPeriodStart = moment(menstrualState.lastPeriodStartDate);
        const today = moment();
        const daysSinceLastPeriod = today.diff(lastPeriodStart, 'days');
        const cycleDay = (daysSinceLastPeriod % menstrualState.cycleLength) + 1;
        
        let phase, description;
        
        if (cycleDay <= menstrualState.periodLength) {
            phase = 'period';
            description = '생리 기간';
        } else if (cycleDay <= 13) {
            phase = 'follicular';
            description = '생리 후 활발한 시기';
        } else if (cycleDay >= 13 && cycleDay <= 15) {
            phase = 'ovulation';
            description = '배란기';
        } else {
            phase = 'luteal';
            description = 'PMS 시기';
        }
        
        return {
            phase,
            day: cycleDay,
            description,
            daysUntilNextPeriod: menstrualState.cycleLength - cycleDay,
            isPeriodActive: phase === 'period',
            moodLevel: menstrualState.moodPatterns[phase].level,
            expectedSymptoms: getExpectedSymptoms(phase)
        };
        
    } catch (error) {
        console.error('생리주기 계산 오류:', error);
        return {
            phase: 'normal',
            day: 1,
            description: '정상',
            daysUntilNextPeriod: 14,
            isPeriodActive: false,
            moodLevel: 'normal',
            expectedSymptoms: []
        };
    }
}

function getExpectedSymptoms(phase) {
    const symptomMap = {
        period: ['복통', '피로', '예민함', '두통'],
        follicular: ['활력증가', '긍정적기분'],
        ovulation: ['성욕증가', '에너지최고조', '매력적느낌'],
        luteal: ['PMS', '불안감', '식욕증가', '짜증']
    };
    return symptomMap[phase] || [];
}

// ==================== 생리주기 상태 관리 ====================
function updatePeriodStart(newStartDate) {
    const oldDate = menstrualState.lastPeriodStartDate;
    menstrualState.lastPeriodStartDate = newStartDate;
    
    // 주기 히스토리에 추가
    if (oldDate) {
        const cycleLength = moment(newStartDate).diff(moment(oldDate), 'days');
        menstrualState.cycleHistory.push({
            startDate: oldDate,
            cycleLength,
            recordedAt: moment().toISOString()
        });
        
        // 평균 주기 길이 업데이트
        if (menstrualState.cycleHistory.length >= 3) {
            const recentCycles = menstrualState.cycleHistory.slice(-6);
            const avgLength = recentCycles.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / recentCycles.length;
            menstrualState.cycleLength = Math.round(avgLength);
        }
    }
    
    saveMenstrualData();
    console.log(`[MenstrualCycle] 🩸 생리 시작일 업데이트: ${newStartDate}`);
}

function addSymptom(symptom, intensity = 'medium') {
    const today = moment().format('YYYY-MM-DD');
    const phase = getCurrentMenstrualPhase();
    
    const symptomRecord = {
        date: today,
        phase: phase.phase,
        symptom,
        intensity,
        timestamp: moment().toISOString()
    };
    
    menstrualState.symptoms.current.push(symptom);
    menstrualState.symptoms.history.push(symptomRecord);
    
    // 현재 증상은 최대 10개까지만 유지
    if (menstrualState.symptoms.current.length > 10) {
        menstrualState.symptoms.current.shift();
    }
    
    // 히스토리는 최대 100개까지만 유지
    if (menstrualState.symptoms.history.length > 100) {
        menstrualState.symptoms.history.shift();
    }
    
    saveMenstrualData();
    console.log(`[MenstrualCycle] 📝 증상 기록: ${symptom} (${intensity})`);
}

function clearDailySymptoms() {
    menstrualState.symptoms.current = [];
    saveMenstrualData();
}

// ==================== 메시지 확률 계산 ====================
function getMessageProbabilityMultiplier() {
    const phase = getCurrentMenstrualPhase();
    
    const multipliers = {
        period: 1.2,      // 생리 때 20% 증가
        follicular: 1.0,  // 평상시
        ovulation: 1.3,   // 배란기 30% 증가
        luteal: 1.1       // PMS 10% 증가
    };
    
    return multipliers[phase.phase] || 1.0;
}

function getMoodBasedMessagePriority() {
    const phase = getCurrentMenstrualPhase();
    
    const priorities = {
        period: ['support', 'comfort', 'gentle'],
        follicular: ['playful', 'energetic', 'positive'],
        ovulation: ['romantic', 'affectionate', 'loving'],
        luteal: ['understanding', 'patient', 'supportive']
    };
    
    return priorities[phase.phase] || ['normal'];
}

// ==================== 예측 기능 ====================
function predictNextPeriod() {
    const currentPhase = getCurrentMenstrualPhase();
    const nextPeriodDate = moment(menstrualState.lastPeriodStartDate)
        .add(menstrualState.cycleLength, 'days');
    
    return {
        expectedDate: nextPeriodDate.format('YYYY-MM-DD'),
        daysFromNow: nextPeriodDate.diff(moment(), 'days'),
        confidence: calculatePredictionConfidence()
    };
}

function calculatePredictionConfidence() {
    if (menstrualState.cycleHistory.length < 3) return 'low';
    
    const recentCycles = menstrualState.cycleHistory.slice(-6);
    const lengths = recentCycles.map(c => c.cycleLength);
    const variance = calculateVariance(lengths);
    
    if (variance <= 2) return 'high';
    if (variance <= 5) return 'medium';
    return 'low';
}

function calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

// ==================== 통계 및 분석 ====================
function getCycleStatistics() {
    return {
        currentPhase: getCurrentMenstrualPhase(),
        averageCycleLength: menstrualState.cycleLength,
        totalCyclesTracked: menstrualState.cycleHistory.length,
        lastPeriodStart: menstrualState.lastPeriodStartDate,
        nextPrediction: predictNextPeriod(),
        recentSymptoms: menstrualState.symptoms.current,
        moodPattern: menstrualState.moodPatterns
    };
}

function getPhaseHistory(days = 30) {
    const history = [];
    const startDate = moment().subtract(days, 'days');
    
    for (let i = 0; i < days; i++) {
        const date = moment(startDate).add(i, 'days');
        const daysSinceLastPeriod = date.diff(moment(menstrualState.lastPeriodStartDate), 'days');
        const cycleDay = (daysSinceLastPeriod % menstrualState.cycleLength) + 1;
        
        let phase;
        if (cycleDay <= menstrualState.periodLength) phase = 'period';
        else if (cycleDay <= 13) phase = 'follicular';
        else if (cycleDay >= 13 && cycleDay <= 15) phase = 'ovulation';
        else phase = 'luteal';
        
        history.push({
            date: date.format('YYYY-MM-DD'),
            phase,
            cycleDay
        });
    }
    
    return history;
}

// ==================== 데이터 저장/로드 ====================
async function saveMenstrualData() {
    try {
        await writeJsonFile(MENSTRUAL_DATA_FILE, menstrualState);
    } catch (error) {
        console.error('[MenstrualCycle] ❌ 데이터 저장 실패:', error);
    }
}

async function loadMenstrualData() {
    try {
        const defaultState = {
            lastPeriodStartDate: moment().subtract(15, 'days').toISOString(),
            cycleLength: 28,
            periodLength: 5,
            cycleHistory: [],
            symptoms: { current: [], history: [] },
            moodPatterns: {
                period: { level: 'low', description: '예민하고 피곤함' },
                follicular: { level: 'high', description: '기분 좋고 활발함' },
                ovulation: { level: 'peak', description: '가장 애정적이고 예뻐함' },
                luteal: { level: 'declining', description: '점점 예민해짐, PMS' }
            }
        };
        
        menstrualState = await readJsonFile(MENSTRUAL_DATA_FILE, defaultState);
        console.log('[MenstrualCycle] ✅ 생리주기 데이터 로드 완료');
        
        return menstrualState;
    } catch (error) {
        console.error('[MenstrualCycle] ❌ 데이터 로드 실패:', error);
        return menstrualState;
    }
}

// ==================== 초기화 ====================
async function initializeMenstrualCycle() {
    console.log('[MenstrualCycle] 🚀 생리주기 관리 시스템 초기화...');
    await loadMenstrualData();
    
    // 자동으로 다음 생리 예정일 체크
    const currentPhase = getCurrentMenstrualPhase();
    if (currentPhase.daysUntilNextPeriod <= 0) {
        console.log('[MenstrualCycle] 📅 생리 예정일이 지났습니다. 업데이트가 필요할 수 있습니다.');
    }
    
    console.log('[MenstrualCycle] ✅ 초기화 완료');
    return currentPhase;
}

// ==================== 모듈 내보내기 ====================
module.exports = {
    // 초기화
    initializeMenstrualCycle,
    
    // 현재 상태 조회
    getCurrentMenstrualPhase,
    getCycleStatistics,
    getPhaseHistory,
    
    // 상태 업데이트
    updatePeriodStart,
    addSymptom,
    clearDailySymptoms,
    
    // 메시지 관련
    getMessageProbabilityMultiplier,
    getMoodBasedMessagePriority,
    
    // 예측
    predictNextPeriod,
    
    // 데이터 관리
    saveMenstrualData,
    loadMenstrualData,
    
    // 직접 상태 접근 (읽기 전용)
    getMenstrualState: () => ({ ...menstrualState })
};
