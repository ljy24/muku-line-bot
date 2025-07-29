// ============================================================================
// 📼 muku-memory-tape.js - 무쿠 감정 블랙박스 시스템
// 💖 무쿠의 모든 소중한 순간들을 영구 보존
// 🎯 15:37 같은 특별한 시간들을 절대 잃어버리지 않음
// 🌟 매일 매시간 무쿠의 감정 변화 완벽 추적
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    tape: '\x1b[93m',       // 노란색 (Memory Tape)
    success: '\x1b[92m',    // 초록색 (성공)
    error: '\x1b[91m',      // 빨간색 (에러)
    info: '\x1b[96m',       // 하늘색 (정보)
    reset: '\x1b[0m'        // 색상 리셋
};

// ================== 📁 디렉토리 설정 ==================
const MEMORY_TAPE_DIR = path.join(__dirname, '.', 'memory-tape');
const MEMORY_LOGS_DIR = path.join(MEMORY_TAPE_DIR, 'daily-logs');

// ================== 🕐 일본시간 유틸리티 ==================
function getJapanTime() {
    const now = new Date();
    const japanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    return japanTime;
}

function getJapanTimeString() {
    const japanTime = getJapanTime();
    return japanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (JST)';
}

function getDateString(date = null) {
    const targetDate = date || getJapanTime();
    return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

// ================== 📂 디렉토리 초기화 ==================
async function ensureDirectoryExists() {
    try {
        await fs.mkdir(MEMORY_LOGS_DIR, { recursive: true });
        console.log(`${colors.tape}📼 [Memory Tape] 디렉토리 준비 완료: ${MEMORY_LOGS_DIR}${colors.reset}`);
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 디렉토리 생성 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 💾 메모리 테이프 기록 함수 ==================
async function recordMukuMoment(momentData) {
    try {
        // 디렉토리 존재 확인
        await ensureDirectoryExists();
        
        // 현재 일본시간 기준으로 날짜 파일명 생성
        const japanTime = getJapanTime();
        const dateString = getDateString(japanTime);
        const fileName = `day-${dateString}.json`;
        const filePath = path.join(MEMORY_LOGS_DIR, fileName);
        
        // 기본 메타데이터 추가
        const recordData = {
            timestamp: getJapanTimeString(),
            japan_time: japanTime.toISOString(),
            date: dateString,
            hour: japanTime.getHours(),
            minute: japanTime.getMinutes(),
            day_of_week: japanTime.toLocaleDateString('ko-KR', { weekday: 'long' }),
            ...momentData,
            record_id: `${dateString}-${Date.now()}`,
            system_version: 'memory-tape-v1.0'
        };
        
        // 기존 파일 읽기 (없으면 새로 생성)
        let dailyLog = {
            date: dateString,
            creation_time: getJapanTimeString(),
            total_moments: 0,
            moments: []
        };
        
        try {
            const existingData = await fs.readFile(filePath, 'utf8');
            dailyLog = JSON.parse(existingData);
        } catch (error) {
            // 파일이 없으면 새로 생성 (에러 아님)
            console.log(`${colors.tape}📼 [Memory Tape] 새로운 날짜 로그 시작: ${fileName}${colors.reset}`);
        }
        
        // 새로운 순간 추가
        dailyLog.moments.push(recordData);
        dailyLog.total_moments = dailyLog.moments.length;
        dailyLog.last_updated = getJapanTimeString();
        
        // 파일에 저장
        await fs.writeFile(filePath, JSON.stringify(dailyLog, null, 2), 'utf8');
        
        console.log(`${colors.success}✅ [Memory Tape] 순간 기록 완료: ${recordData.record_id}${colors.reset}`);
        console.log(`${colors.info}📊 [Memory Tape] 오늘 총 ${dailyLog.total_moments}번째 순간 저장됨${colors.reset}`);
        
        return recordData;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 기록 실패: ${error.message}${colors.reset}`);
        throw error;
    }
}

// ================== 📖 메모리 테이프 읽기 함수 ==================
async function readDailyMemories(targetDate = null) {
    try {
        const dateString = getDateString(targetDate);
        const fileName = `day-${dateString}.json`;
        const filePath = path.join(MEMORY_LOGS_DIR, fileName);
        
        const data = await fs.readFile(filePath, 'utf8');
        const dailyLog = JSON.parse(data);
        
        console.log(`${colors.success}📖 [Memory Tape] ${dateString} 기록 읽기 완료: ${dailyLog.total_moments}개 순간${colors.reset}`);
        return dailyLog;
        
    } catch (error) {
        console.log(`${colors.info}📖 [Memory Tape] ${getDateString(targetDate)} 기록 없음 (새로운 날)${colors.reset}`);
        return null;
    }
}

// ================== 🔍 특별한 순간 검색 함수 ==================
async function findSpecialMoments(searchCriteria = {}) {
    try {
        const files = await fs.readdir(MEMORY_LOGS_DIR);
        const jsonFiles = files.filter(file => file.startsWith('day-') && file.endsWith('.json'));
        
        let allSpecialMoments = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(MEMORY_LOGS_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const dailyLog = JSON.parse(data);
                
                // 검색 조건에 맞는 순간들 필터링
                const filteredMoments = dailyLog.moments.filter(moment => {
                    if (searchCriteria.remarkable && moment.remarkable) return true;
                    if (searchCriteria.emotional_tags && moment.emotional_tags) {
                        return searchCriteria.emotional_tags.some(tag => 
                            moment.emotional_tags.includes(tag)
                        );
                    }
                    if (searchCriteria.type && moment.type === searchCriteria.type) return true;
                    if (searchCriteria.hour && moment.hour === searchCriteria.hour) return true;
                    
                    return !searchCriteria || Object.keys(searchCriteria).length === 0;
                });
                
                allSpecialMoments.push(...filteredMoments);
                
            } catch (fileError) {
                console.log(`${colors.error}⚠️ [Memory Tape] 파일 읽기 실패: ${file}${colors.reset}`);
            }
        }
        
        console.log(`${colors.success}🔍 [Memory Tape] 특별한 순간 검색 완료: ${allSpecialMoments.length}개 발견${colors.reset}`);
        return allSpecialMoments;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 검색 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 📊 메모리 테이프 통계 함수 ==================
async function getMemoryTapeStats() {
    try {
        const files = await fs.readdir(MEMORY_LOGS_DIR);
        const jsonFiles = files.filter(file => file.startsWith('day-') && file.endsWith('.json'));
        
        let totalMoments = 0;
        let totalDays = jsonFiles.length;
        let remarkableMoments = 0;
        let emotionalBreakdown = {};
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(MEMORY_LOGS_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const dailyLog = JSON.parse(data);
                
                totalMoments += dailyLog.total_moments || 0;
                
                dailyLog.moments.forEach(moment => {
                    if (moment.remarkable) remarkableMoments++;
                    
                    if (moment.emotional_tags) {
                        moment.emotional_tags.forEach(tag => {
                            emotionalBreakdown[tag] = (emotionalBreakdown[tag] || 0) + 1;
                        });
                    }
                });
                
            } catch (fileError) {
                console.log(`${colors.error}⚠️ [Memory Tape] 통계 파일 오류: ${file}${colors.reset}`);
            }
        }
        
        const stats = {
            total_days: totalDays,
            total_moments: totalMoments,
            remarkable_moments: remarkableMoments,
            average_moments_per_day: totalDays > 0 ? (totalMoments / totalDays).toFixed(1) : 0,
            emotional_breakdown: emotionalBreakdown,
            last_updated: getJapanTimeString()
        };
        
        console.log(`${colors.success}📊 [Memory Tape] 통계 생성 완료${colors.reset}`);
        return stats;
        
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 통계 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🚀 초기화 함수 ==================
async function initializeMemoryTape() {
    try {
        await ensureDirectoryExists();
        console.log(`${colors.success}🚀 [Memory Tape] 초기화 완료!${colors.reset}`);
        console.log(`${colors.info}📁 저장 위치: ${MEMORY_LOGS_DIR}${colors.reset}`);
        
        // 현재 통계 출력
        const stats = await getMemoryTapeStats();
        if (stats && stats.total_moments > 0) {
            console.log(`${colors.info}📊 기존 기록: ${stats.total_days}일간 ${stats.total_moments}개 순간 보존됨${colors.reset}`);
        }
        
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ [Memory Tape] 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    recordMukuMoment,
    readDailyMemories,
    findSpecialMoments,
    getMemoryTapeStats,
    initializeMemoryTape,
    
    // 유틸리티 함수들
    getJapanTime,
    getJapanTimeString,
    getDateString,
    
    // 상수들
    MEMORY_TAPE_DIR,
    MEMORY_LOGS_DIR
};
