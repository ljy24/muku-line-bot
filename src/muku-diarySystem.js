// ============================================================================
// muku-diarySystem.js - 일기장 시스템 (memoryManager 완전 통합!)
// 📖 누적 학습 내용을 일기장 형태로 제공하는 시스템
// 🧠 ultimateConversationContext의 동적 학습 내용 + memoryManager의 "기억해" 내용 통합!
// 🗓️ 날짜별 분류, 카테고리별 정리, 통계 제공
// 🔧 saveLogFunc is not a function 에러 완전 해결!
// 💾 "기억해"로 저장한 모든 내용들도 일기장에서 조회 가능!
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

// ================== 📚 전체 학습 내용 조회 (통합!) ==================
async function getAllDynamicLearning() {
    try {
        const allLearningData = [];
        
        // 1. ultimateConversationContext에서 동적 학습 내용 가져오기
        try {
            const ultimateContext = require('./ultimateConversationContext');
            
            if (ultimateContext && typeof ultimateContext.getAllDynamicLearning === 'function') {
                const dynamicLearning = await ultimateContext.getAllDynamicLearning();
                if (dynamicLearning && dynamicLearning.length > 0) {
                    console.log(`[DiarySystem] 동적 학습 데이터: ${dynamicLearning.length}개`);
                    allLearningData.push(...dynamicLearning);
                }
            } else {
                console.warn('[DiarySystem] ultimateConversationContext.getAllDynamicLearning 함수 없음');
            }
        } catch (error) {
            console.error('[DiarySystem] 동적 학습 조회 실패:', error.message);
        }
        
        // 2. memoryManager에서 고정 기억들 가져오기 (실제 존재하는 함수 사용!)
        try {
            const memoryManager = require('./memoryManager');
            
            if (memoryManager && memoryManager.fixedMemoriesDB) {
                console.log('[DiarySystem] memoryManager 고정 기억 데이터 접근 시도');
                
                // fixedMemoriesDB에서 직접 데이터 가져오기
                const fixedMemories = memoryManager.fixedMemoriesDB.fixedMemories || [];
                const loveHistory = memoryManager.fixedMemoriesDB.loveHistory || [];
                
                console.log(`[DiarySystem] 고정 기억: ${fixedMemories.length}개, 연애 기억: ${loveHistory.length}개`);
                
                // 고정 기억을 학습 데이터 형식으로 변환
                if (fixedMemories.length > 0) {
                    const convertedFixed = fixedMemories.map((memory, index) => ({
                        id: `fixed_${index}`,
                        timestamp: new Date('2023-01-01').toISOString(), // 기본 날짜
                        date: new Date('2023-01-01').toLocaleDateString(),
                        time: '00:00',
                        category: '고정기억',
                        content: `[고정 기억] ${memory}`,
                        context: {
                            source: 'memoryManager_fixed',
                            index: index
                        },
                        source: 'fixed_memory'
                    }));
                    
                    allLearningData.push(...convertedFixed);
                }
                
                // 연애 기억을 학습 데이터 형식으로 변환
                if (loveHistory.length > 0) {
                    const convertedLove = loveHistory.map((memory, index) => ({
                        id: `love_${index}`,
                        timestamp: new Date('2023-12-01').toISOString(), // 연애 시작 시기
                        date: new Date('2023-12-01').toLocaleDateString(),
                        time: '00:00',
                        category: '연애기억',
                        content: `[연애 기억] ${memory}`,
                        context: {
                            source: 'memoryManager_love',
                            index: index
                        },
                        source: 'love_memory'
                    }));
                    
                    allLearningData.push(...convertedLove);
                }
            } else {
                console.warn('[DiarySystem] memoryManager.fixedMemoriesDB 접근 불가');
            }
        } catch (error) {
            console.error('[DiarySystem] memoryManager 조회 실패:', error.message);
        }
        
        // 3. ultimateConversationContext의 사용자 기억들도 가져오기
        try {
            const ultimateContext = require('./ultimateConversationContext');
            
            if (ultimateContext && typeof ultimateContext.getYejinMemories === 'function') {
                const yejinMemories = ultimateContext.getYejinMemories();
                if (yejinMemories && yejinMemories.length > 0) {
                    console.log(`[DiarySystem] ultimateContext 사용자 기억: ${yejinMemories.length}개`);
                    
                    const convertedUltimateMemories = yejinMemories.map(memory => ({
                        id: memory.id || `umem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: memory.timestamp || new Date().toISOString(),
                        date: new Date(memory.timestamp || Date.now()).toLocaleDateString(),
                        time: new Date(memory.timestamp || Date.now()).toLocaleTimeString(),
                        category: '동적기억',
                        content: `[동적 기억] ${memory.content}`,
                        context: {
                            source: 'ultimateContext_memory',
                            category: memory.category,
                            originalData: memory
                        },
                        source: 'dynamic_memory'
                    }));
                    
                    allLearningData.push(...convertedUltimateMemories);
                }
            }
        } catch (error) {
            console.error('[DiarySystem] ultimateContext 사용자 기억 조회 실패:', error.message);
        }
        
        // 시간순으로 정렬
        allLearningData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        console.log(`[DiarySystem] 통합 데이터 조회 완료: 총 ${allLearningData.length}개`);
        return allLearningData;
        
    } catch (error) {
        console.error('[DiarySystem] 통합 학습 내용 조회 실패:', error.message);
        return [];
    }
}

// ================== 🗓️ 일기장 명령어 처리 (통합!) ==================
async function handleDiaryCommand(command) {
    try {
        console.log('[DiarySystem] 통합 일기장 조회 요청 받음');
        
        // 전체 학습 내용 조회 (memoryManager + ultimateContext 통합!)
        const allLearning = await getAllDynamicLearning();
        console.log(`[DiarySystem] 총 ${allLearning.length}개의 통합 학습 내용 조회됨`);
        
        // 오늘 학습 내용만 필터링
        const today = new Date().toDateString();
        const todayLearning = allLearning.filter(item => {
            const itemDate = new Date(item.timestamp).toDateString();
            return itemDate === today;
        });
        console.log(`[DiarySystem] 오늘 ${todayLearning.length}개의 학습 내용 조회됨`);
        
        // 카테고리별 분류
        const categoryStats = {};
        allLearning.forEach(item => {
            const category = item.category || '기타';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        });
        
        // 🔧 안전한 로깅 (saveLogFunc 에러 해결!)
        safeLog('diary_access', `통합 일기장 조회: 총 ${allLearning.length}개, 오늘 ${todayLearning.length}개`);
        
        // 응답 생성
        if (allLearning.length === 0) {
            return {
                success: true,
                response: "아직 내가 배운 게 없어! 아저씨랑 더 많이 대화하고 '기억해'도 해주면서 배워나갈게~ 💕"
            };
        }
        
        let response = `📚 내가 지금까지 배운 모든 것들 (총 ${allLearning.length}개):\n\n`;
        
        // 카테고리별 요약 표시
        response += `📊 카테고리별 요약:\n`;
        Object.entries(categoryStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([category, count]) => {
                response += `  • ${category}: ${count}개\n`;
            });
        response += `\n`;
        
        // 최근 10개 상세 표시
        const recentLearning = allLearning.slice(-10);
        response += `🗓️ 최근 학습 내용 (최근 ${recentLearning.length}개):\n\n`;
        
        recentLearning.forEach((item, index) => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const time = item.time || new Date(item.timestamp).toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            response += `${index + 1}. [${item.category}] ${date} ${time}\n`;
            response += `   "${item.content.substring(0, 60)}${item.content.length > 60 ? '...' : ''}"\n\n`;
        });
        
        if (allLearning.length > 10) {
            response += `... 그리고 ${allLearning.length - 10}개 더!\n\n`;
        }
        
        // 오늘 학습 내용이 있으면 추가 표시
        if (todayLearning.length > 0) {
            response += `📅 오늘 새로 배운 것 (${todayLearning.length}개):\n`;
            todayLearning.slice(-3).forEach((item, index) => {
                response += `  • [${item.category}] ${item.content.substring(0, 40)}...\n`;
            });
            response += `\n`;
        }
        
        response += `💕 아저씨랑 대화하고 "기억해"를 통해 계속 배우고 있어! 더 궁금한 게 있으면 말해줘~`;
        
        return {
            success: true,
            response: response
        };
        
    } catch (error) {
        console.error('[DiarySystem] 통합 일기장 조회 중 오류:', error);
        return {
            success: false,
            response: "일기장을 보려고 했는데 문제가 생겼어... 나중에 다시 시도해볼게! ㅠㅠ"
        };
    }
}

// ================== 📊 통합 학습 통계 조회 ==================
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
                averageLength: 0,
                sourceCounts: {}
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
        
        // 소스별 분류
        const sourceCounts = {};
        allLearning.forEach(item => {
            const source = item.source || '알 수 없음';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
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
            sourceCounts: sourceCounts,
            thisMonthCount: thisMonthCount,
            averageLength: averageLength
        };
        
    } catch (error) {
        console.error('[DiarySystem] 통합 통계 조회 실패:', error.message);
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
            const time = item.time || new Date(item.timestamp).toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            content += `${index + 1}. [${item.category}] ${time}\n`;
            content += `   ${item.content}\n\n`;
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
            let content = `${new Date(date).toLocaleDateString()}에 배운 것들:\n`;
            
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
            timestamp: item.timestamp,
            source: item.source
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
            timestamp: item.timestamp,
            source: item.source
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
        version: '1.1.0',
        lastAccessed: new Date().toISOString(),
        features: [
            '누적 학습 내용 조회',
            'memoryManager 통합',
            'ultimateContext 통합',
            '날짜별 분류',
            '카테고리별 통계',
            '키워드 검색',
            '통계 리포트'
        ],
        dataSources: [
            'ultimateConversationContext (동적 학습)',
            'memoryManager (기억해 내용)',
            'ultimateContext (사용자 기억)'
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
