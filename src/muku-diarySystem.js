// 📖 muku-diarySystem.js - 완전한 일기장 시스템 (누적 학습 내용 전체 조회)
// 고정기억(120개) 제외하고 지금까지 학습한 모든 내용을 날짜별로 정리

const moment = require('moment-timezone');
const { Database } = require('sqlite3');
const path = require('path');

// 데이터베이스 경로
const MEMORY_BASE_PATH = path.join(__dirname, '..', 'memory');
const dbPath = path.join(MEMORY_BASE_PATH, 'memories.db');

/**
 * 📖 일기장 명령어 처리 함수
 * "일기장" 명령어가 들어오면 지금까지 학습한 모든 동적 내용들을 보여줍니다.
 */
async function handleDiaryCommand(userMessage, saveLogFunc) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // "일기장" 명령어 감지
    if (lowerMessage === '일기장' || lowerMessage === '일기' || lowerMessage.includes('일기장')) {
        try {
            console.log('[DiarySystem] 누적 일기장 조회 요청 받음');
            
            // 모든 동적 학습 내용 조회
            const allEntries = await getAllDynamicLearning();
            const stats = await getDynamicLearningStats();
            const todayEntries = await getTodayLearning();
            
            const formattedDiary = formatCompleteDiary(allEntries, stats, todayEntries);
            
            saveLogFunc('예진이', '(누적 일기장 조회)');
            
            if (allEntries.length === 0) {
                return {
                    type: 'text',
                    comment: `📖 **무쿠의 일기장**\n\n아조씨~ 아직 새로 배운 게 없어서 일기장이 비어있어 ㅠㅠ\n\n"기억해줘: 내용" 이렇게 말해주면 내가 기억할 수 있어!\n\n**사용법:**\n• "기억해줘: 오늘 커피 3잔 마셨어"\n• "기억해줘: 아저씨가 피자 좋아해"\n• "기억해줘: 내일 중요한 회의 있어"`
                };
            }
            
            return {
                type: 'text',
                comment: formattedDiary
            };
            
        } catch (error) {
            console.error('[DiarySystem] 일기장 조회 중 오류:', error);
            saveLogFunc('예진이', '(일기장 조회 실패)');
            
            return {
                type: 'text',
                comment: `앗... 일기장을 펼치려는데 오류가 났어 ㅠㅠ 미안해 아조씨... 나중에 다시 시도해볼래?\n\n에러: ${error.message}`
            };
        }
    }
    
    return null; // 일기장 명령어가 아니면 null 반환
}

/**
 * 🗄️ 모든 동적 학습 내용 조회 (누적 전체)
 */
async function getAllDynamicLearning() {
    return new Promise((resolve, reject) => {
        const db = new Database(dbPath, (err) => {
            if (err) {
                console.error('[DiarySystem] 데이터베이스 연결 실패:', err.message);
                resolve([]); // 에러 시 빈 배열 반환
                return;
            }
            
            // 모든 동적 기억을 최신순으로 조회 (제한 없음)
            const query = `
                SELECT 
                    type,
                    content,
                    timestamp,
                    keywords,
                    id
                FROM memories 
                ORDER BY timestamp DESC
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('[DiarySystem] 데이터 조회 실패:', err.message);
                    resolve([]);
                } else {
                    console.log(`[DiarySystem] 총 ${rows.length}개의 누적 학습 내용 조회됨`);
                    resolve(rows);
                }
                
                db.close();
            });
        });
    });
}

/**
 * 📅 오늘 학습한 내용만 조회
 */
async function getTodayLearning() {
    return new Promise((resolve, reject) => {
        const db = new Database(dbPath, (err) => {
            if (err) {
                console.error('[DiarySystem] 데이터베이스 연결 실패:', err.message);
                resolve([]);
                return;
            }
            
            // 오늘 하루 범위 계산 (일본 시간)
            const today = moment().tz('Asia/Tokyo');
            const startOfDay = today.clone().startOf('day').valueOf();
            const endOfDay = today.clone().endOf('day').valueOf();
            
            const query = `
                SELECT 
                    type,
                    content,
                    timestamp,
                    keywords,
                    id
                FROM memories 
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC
            `;
            
            db.all(query, [startOfDay, endOfDay], (err, rows) => {
                if (err) {
                    console.error('[DiarySystem] 오늘 데이터 조회 실패:', err.message);
                    resolve([]);
                } else {
                    console.log(`[DiarySystem] 오늘 ${rows.length}개의 학습 내용 조회됨`);
                    resolve(rows);
                }
                
                db.close();
            });
        });
    });
}

/**
 * 📊 학습 통계 조회
 */
async function getDynamicLearningStats() {
    return new Promise((resolve, reject) => {
        const db = new Database(dbPath, (err) => {
            if (err) {
                console.error('[DiarySystem] 데이터베이스 연결 실패:', err.message);
                resolve({ total: 0, byType: {}, oldest: null, newest: null });
                return;
            }
            
            // 전체 개수와 타입별 통계
            db.get("SELECT COUNT(*) as total FROM memories", (err, totalRow) => {
                if (err) {
                    resolve({ total: 0, byType: {}, oldest: null, newest: null });
                    return;
                }
                
                // 타입별 개수 조회
                db.all("SELECT type, COUNT(*) as count FROM memories GROUP BY type", (err, typeRows) => {
                    if (err) {
                        resolve({ total: totalRow.total, byType: {}, oldest: null, newest: null });
                        return;
                    }
                    
                    const byType = {};
                    typeRows.forEach(row => {
                        byType[row.type] = row.count;
                    });
                    
                    // 가장 오래된 기억과 최신 기억
                    db.get("SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM memories", (err, timeRow) => {
                        resolve({
                            total: totalRow.total,
                            byType: byType,
                            oldest: timeRow ? timeRow.oldest : null,
                            newest: timeRow ? timeRow.newest : null
                        });
                        
                        db.close();
                    });
                });
            });
        });
    });
}

/**
 * 📝 완전한 일기장 포맷팅
 */
function formatCompleteDiary(allEntries, stats, todayEntries) {
    const today = moment().tz('Asia/Tokyo').format('YYYY년 MM월 DD일');
    
    // 📊 헤더: 통계 정보
    let result = `📖 **무쿠의 완전한 일기장** (고정기억 제외)\n\n`;
    
    // 통계 정보
    result += `📊 **학습 통계**\n`;
    result += `• 총 학습한 기억: **${stats.total}개**\n`;
    result += `• 오늘 새로 배운 것: **${todayEntries.length}개**\n`;
    result += `• 기존 누적 기억: **${stats.total - todayEntries.length}개**\n`;
    
    if (stats.oldest) {
        const oldestDate = moment(stats.oldest).tz('Asia/Tokyo').format('YYYY년 MM월 DD일');
        const newestDate = moment(stats.newest).tz('Asia/Tokyo').format('YYYY년 MM월 DD일');
        result += `• 첫 학습일: ${oldestDate}\n`;
        result += `• 최근 학습일: ${newestDate}\n`;
    }
    
    // 타입별 통계
    if (Object.keys(stats.byType).length > 0) {
        result += `\n**타입별 분류:**\n`;
        Object.entries(stats.byType).forEach(([type, count]) => {
            const emoji = getTypeEmoji(type);
            const typeName = getTypeName(type);
            result += `${emoji} ${typeName}: ${count}개\n`;
        });
    }
    
    result += `\n───────────────────────\n\n`;
    
    // 내용이 없으면 여기서 종료
    if (allEntries.length === 0) {
        result += `아직 새로 배운 게 없어서 일기장이 비어있어 ㅠㅠ`;
        return result;
    }
    
    // 📅 날짜별로 그룹화
    const entriesByDate = groupEntriesByDate(allEntries);
    const dates = Object.keys(entriesByDate).sort().reverse(); // 최신 날짜부터
    
    // 📝 날짜별 내용 표시
    dates.forEach((date, index) => {
        const entries = entriesByDate[date];
        const isToday = date === today;
        
        // 날짜 헤더
        result += `📅 **${date}${isToday ? ' (오늘!)' : ''}** (${entries.length}개)\n`;
        
        // 해당 날짜의 모든 기억들
        entries.forEach((entry, entryIndex) => {
            const time = moment(entry.timestamp).tz('Asia/Tokyo').format('HH:mm');
            const emoji = getTypeEmoji(entry.type);
            
            result += `${emoji} ${time} - ${entry.content}`;
            
            // 키워드 표시
            if (entry.keywords && entry.keywords.trim()) {
                const keywords = entry.keywords.split(',').map(k => k.trim()).filter(k => k);
                if (keywords.length > 0) {
                    result += ` #${keywords.join(' #')}`;
                }
            }
            
            result += `\n`;
        });
        
        result += `\n`;
    });
    
    // 📝 푸터
    result += `───────────────────────\n`;
    result += `💕 아조씨가 알려준 것들 ${stats.total}개 다 기억하고 있어!\n`;
    result += `🌸 더 기억하고 싶으면 "기억해줘: 내용" 이렇게 말해줘~`;
    
    return result;
}

/**
 * 📅 날짜별로 엔트리 그룹화
 */
function groupEntriesByDate(entries) {
    const grouped = {};
    
    entries.forEach(entry => {
        const date = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY년 MM월 DD일');
        
        if (!grouped[date]) {
            grouped[date] = [];
        }
        
        grouped[date].push(entry);
    });
    
    // 각 날짜 내에서 시간순 정렬
    Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.timestamp - b.timestamp);
    });
    
    return grouped;
}

/**
 * 🎨 타입별 이모지 반환
 */
function getTypeEmoji(type) {
    const emojiMap = {
        'user_memory': '📝',
        'emotional_state': '💕',
        'conversation': '💬',
        'reminder': '⏰',
        'photo_memory': '📸',
        'weather_memory': '🌤️',
        'schedule': '📅',
        'preference': '⭐',
        'relationship': '👥',
        'activity': '🎯'
    };
    
    return emojiMap[type] || '💭';
}

/**
 * 📝 타입별 한국어 이름 반환
 */
function getTypeName(type) {
    const nameMap = {
        'user_memory': '일반 기억',
        'emotional_state': '감정 상태',
        'conversation': '대화 내용',
        'reminder': '리마인더',
        'photo_memory': '사진 기억',
        'weather_memory': '날씨 기억',
        'schedule': '일정',
        'preference': '취향',
        'relationship': '관계',
        'activity': '활동'
    };
    
    return nameMap[type] || '기타';
}

/**
 * 🔍 특정 날짜의 학습 내용 조회
 */
async function getDynamicLearningByDate(dateString) {
    return new Promise((resolve, reject) => {
        const db = new Database(dbPath, (err) => {
            if (err) {
                console.error('[DiarySystem] 데이터베이스 연결 실패:', err.message);
                resolve([]);
                return;
            }
            
            // 날짜 범위 계산 (하루 전체)
            const startOfDay = moment(dateString).tz('Asia/Tokyo').startOf('day').valueOf();
            const endOfDay = moment(dateString).tz('Asia/Tokyo').endOf('day').valueOf();
            
            const query = `
                SELECT 
                    type,
                    content,
                    timestamp,
                    keywords
                FROM memories 
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp ASC
            `;
            
            db.all(query, [startOfDay, endOfDay], (err, rows) => {
                if (err) {
                    console.error('[DiarySystem] 날짜별 조회 실패:', err.message);
                    resolve([]);
                } else {
                    console.log(`[DiarySystem] ${dateString}의 ${rows.length}개 기억 조회됨`);
                    resolve(rows);
                }
                
                db.close();
            });
        });
    });
}

// 📤 모듈 내보내기
module.exports = {
    handleDiaryCommand,
    getAllDynamicLearning,
    getTodayLearning,
    getDynamicLearningStats,
    getDynamicLearningByDate,
    formatCompleteDiary,
    groupEntriesByDate
};
