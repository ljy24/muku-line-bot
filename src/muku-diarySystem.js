// ============================================================================
// muku-diarySystem.js - 일기장 시스템 (saveLogFunc 에러 완전 수정!)
// 📖 누적 학습 내용을 일기장 형태로 제공하는 시스템
// 🧠 ultimateConversationContext의 동적 학습 내용을 활용
// 🗓️ 날짜별 분류, 카테고리별 정리, 통계 제공
// 🔧 saveLogFunc is not a function 에러 완전 해결!
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🔧 안전한 로깅 함수 ==================
function safeLog(category, message) {
    try {
        // enhancedLogging 사용 시도
        const enhancedLogging = require('./enhancedLogging');
        if (enhancedLogging && typeof enhancedLogging.logSystemOperation === 'function') {
            enhancedLogging.logSystemOperation(category, message);
        } else {
            console.log(`[DiarySystem] ${category}: ${message}`);
        }
    } catch (error) {
        // 폴백: 기본 콘솔 로그
        console.log(`[DiarySystem] ${category}: ${message}`);
    }
}

// ================== 📚 전체 학습 내용 조회 ==================
async function getAllDynamicLearning() {
    try {
        // ultimateConversationContext에서 동적 학습 내용 가져오기
        const ultimateContext = require('./ultimateConversationContext');
        
        if (ultimateContext && typeof ultimateContext.getAllDynamicLearning === 'function') {
            const learningData = await ultimateContext.getAllDynamicLearning();
            return learningData || [];
        } else {
            console.warn('[DiarySystem] ultimateConversationContext.getAllDynamicLearning 함수 없음');
            return [];
        }
    } catch (error) {
        console.error('[DiarySystem] 학습 내용 조회 실패:', error.message);
        return [];
    }
}

// ================== 🗓️ 일기장 명령어 처리 ==================
async function handleDiaryCommand(command) {
    try {
        console.log('[DiarySystem] 누적 일기장 조회 요청 받음');
        
        // 전체 학습 내용 조회
        const allLearning = await getAllDynamicLearning();
        console.log(`[DiarySystem] 총 ${allLearning.length}개의 누적 학습 내용 조회됨`);
        
        // 오늘 학습 내용만 필터링
        const today = new Date().toDateString();
        const todayLearning = allLearning.filter(item => 
            new Date(item.timestamp).toDateString() === today
        );
        console.log(`[DiarySystem] 오늘 ${todayLearning.length}개의 학습 내용 조회됨`);
        
        // 🔧 안전한 로깅 (saveLogFunc 에러 해결!)
        safeLog('diary_access', `일기장 조회: 총 ${allLearning.length}개, 오늘 ${todayLearning.length}개`);
        
        // 응답 생성
        if (allLearning.length === 0) {
            return {
                success: true,
                response: "아직 내가 배운 게 없어! 아저씨랑 더 많이 대화하면서 배워나갈게~ 💕"
            };
        }
        
        let response = `📚 내가 지금까지 배운 것들 (총 ${allLearning.length}개):\n\n`;
        
        // 최근 10개만 표시
        const recentLearning = allLearning.slice(-10);
        
        recentLearning.forEach((item, index) => {
            const date = new Date(item.timestamp).toLocaleDateString();
            response += `${index + 1}. ${date} - ${item.category}\n`;
            response += `   "${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}"\n\n`;
        });
        
        if (allLearning.length > 10) {
            response += `... 그리고 ${allLearning.length - 10}개 더!\n\n`;
        }
        
        response += `💕 아저씨랑 대화하면서 계속 배우고 있어! 더 궁금한 게 있으면 말해줘~`;
        
        return {
            success: true,
            response: response
        };
        
    } catch (error) {
        console.error('[DiarySystem] 일기장 조회 중 오류:', error);
        return {
            success: false,
            response: "일기장을 보려고 했는데 문제가 생겼어... 나중에 다시 시도해볼게! ㅠㅠ"
        };
    }
}

// ================== 📊 학습 통계 조회 ==================
async function getDiaryStatistics() {
    try {
        const allLearning = await getAllDynamicLearning();
        
        if (allLearning.length === 0) {
            return {
                totalEntries: 0,
                firstEntryDate: null,
                lastEntryDate: null,
                categoryCounts: {},
                thisMonthCount: 0,
                averageLength: 0
            };
        }
        
        // 날짜 정보 추출
        const dates = allLearning.map(item => new Date(item.timestamp));
        const firstDate = new Date(Math.min(...dates));
        const lastDate = new Date(Math.max(...dates));
        
        // 카테고리별 분류
        const categoryCounts = {};
        allLearning.forEach(item => {
            const category = item.category || '기타';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        // 이번 달 학습 내용 카운트
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisMonthCount = allLearning.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate.getMonth() === thisMonth && itemDate.getFullYear() === thisYear;
        }).length;
        
        // 평균 길이 계산
        const totalLength = allLearning.reduce((sum, item) => sum + (item.content?.length || 0), 0);
        const averageLength = Math.round(totalLength / allLearning.length);
        
        return {
            totalEntries: allLearning.length,
            firstEntryDate: firstDate.toLocaleDateString(),
            lastEntryDate: lastDate.toLocaleDateString(),
            categoryCounts: categoryCounts,
            thisMonthCount: thisMonthCount,
            averageLength: averageLength
        };
        
    } catch (error) {
        console.error('[DiarySystem] 통계 조회 실패:', error.message);
        return null;
    }
}

// ================== 🗓️ 특정 날짜 학습 내용 조회 ==================
async function getDiaryByDate(targetDate) {
    try {
        const allLearning = await getAllDynamicLearning();
        
        // 특정 날짜의 학습 내용 필터링
        const targetDateObj = new Date(targetDate);
        const dateString = targetDateObj.toDateString();
        
        const dayLearning = allLearning.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate.toDateString() === dateString;
        });
        
        if (dayLearning.length === 0) {
            return null;
        }
        
        // 해당 날짜의 학습 내용을 하나의 일기로 합치기
        let content = `${targetDate}에 배운 것들:\n\n`;
        
        dayLearning.forEach((item, index) => {
            content += `${index + 1}. [${item.category}] ${item.content}\n\n`;
        });
        
        return {
            date: targetDate,
            content: content,
            count: dayLearning.length,
            categories: [...new Set(dayLearning.map(item => item.category))]
        };
        
    } catch (error) {
        console.error('[DiarySystem] 특정 날짜 조회 실패:', error.message);
        return null;
    }
}

// ================== 📖 최근 학습 내용 조회 ==================
async function getRecentDiaries(count = 5) {
    try {
        const allLearning = await getAllDynamicLearning();
        
        if (allLearning.length === 0) {
            return [];
        }
        
        // 날짜별로 그룹화
        const learningByDate = {};
        allLearning.forEach(item => {
            const date = new Date(item.timestamp).toDateString();
            if (!learningByDate[date]) {
                learningByDate[date] = [];
            }
            learningByDate[date].push(item);
        });
        
        // 최근 날짜부터 정렬
        const sortedDates = Object.keys(learningByDate).sort((a, b) => new Date(b) - new Date(a));
        
        // 요청된 개수만큼 반환
        return sortedDates.slice(0, count).map(date => {
            const dayLearning = learningByDate[date];
            let content = `${date}에 배운 것들:\n`;
            
            dayLearning.forEach((item, index) => {
                content += `${index + 1}. [${item.category}] ${item.content.substring(0, 100)}...\n`;
            });
            
            return {
                date: new Date(date).toLocaleDateString(),
                content: content,
                count: dayLearning.length,
                categories: [...new Set(dayLearning.map(item => item.category))]
            };
        });
        
    } catch (error) {
        console.error('[DiarySystem] 최근 일기 조회 실패:', error.message);
        return [];
    }
}

// ================== 🎯 카테고리별 학습 내용 조회 ==================
async function getLearningByCategory(category) {
    try {
        const allLearning = await getAllDynamicLearning();
        
        const categoryLearning = allLearning.filter(item => 
            item.category === category
        );
        
        return categoryLearning.map(item => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            content: item.content,
            timestamp: item.timestamp
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
    } catch (error) {
        console.error('[DiarySystem] 카테고리별 조회 실패:', error.message);
        return [];
    }
}

// ================== 🔍 키워드 검색 ==================
async function searchLearningContent(keyword) {
    try {
        const allLearning = await getAllDynamicLearning();
        
        const searchResults = allLearning.filter(item => 
            item.content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        return searchResults.map(item => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            content: item.content,
            category: item.category,
            timestamp: item.timestamp
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
    } catch (error) {
        console.error('[DiarySystem] 키워드 검색 실패:', error.message);
        return [];
    }
}

// ================== 📈 시스템 상태 조회 ==================
function getDiarySystemStatus() {
    return {
        isActive: true,
        version: '1.0.0',
        lastAccessed: new Date().toISOString(),
        features: [
            '누적 학습 내용 조회',
            '날짜별 분류',
            '카테고리별 통계',
            '키워드 검색',
            '통계 리포트'
        ]
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    handleDiaryCommand,
    getAllDynamicLearning,
    getDiaryStatistics,
    getDiaryByDate,
    getRecentDiaries,
    getLearningByCategory,
    searchLearningContent,
    getDiarySystemStatus,
    safeLog
};
