// ============================================================================
// diarySystem.js - 누적 동적기억만 표시하는 일기장 시스템
// 🧠 고정기억 120개 제외, 오직 동적으로 쌓이는 기억들만 표시
// 📅 날짜별 누적 기억 관리 및 표시
// ✨ 사용자 "기억해" + 자동 학습 내용만 포함
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 🎨 색상 정의 ==================
const colors = {
    diary: '\x1b[96m',      // 하늘색 (일기장)
    memory: '\x1b[95m',     // 연보라색 (기억)
    date: '\x1b[93m',       // 노란색 (날짜)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

class DynamicMemoryDiarySystem {
    constructor() {
        this.dataDir = './data';
        this.diaryFile = path.join(this.dataDir, 'dynamic_memory_diary.json');
        this.dailyMemoriesFile = path.join(this.dataDir, 'daily_memories.json');
        
        // 동적 기억 파일들
        this.dynamicFiles = {
            userMemories: path.join(this.dataDir, 'yejin_memories.json'),
            dynamicLearning: path.join(this.dataDir, 'dynamic_learning.json'),
            conversationPatterns: path.join(this.dataDir, 'conversation_patterns.json'),
            emotionalMemory: path.join(this.dataDir, 'emotional_memory.json'),
            dailyInteractions: path.join(this.dataDir, 'daily_interactions.json'),
            importantMoments: path.join(this.dataDir, 'important_moments.json')
        };
    }

    // 📁 데이터 디렉토리 및 파일 초기화
    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
            console.log(`${colors.diary}📁 데이터 디렉토리 생성: ${this.dataDir}${colors.reset}`);
        }

        // 일기장 파일 초기화
        try {
            await fs.access(this.diaryFile);
        } catch {
            const initialDiary = {
                createdAt: new Date().toISOString(),
                totalEntries: 0,
                entries: [],
                metadata: {
                    description: "무쿠의 누적 동적기억 일기장 - 고정기억 제외",
                    version: "2.0"
                }
            };
            await fs.writeFile(this.diaryFile, JSON.stringify(initialDiary, null, 2));
            console.log(`${colors.diary}📔 일기장 파일 초기화 완료${colors.reset}`);
        }
    }

    // 🧠 동적 기억들만 수집 (고정기억 완전 제외)
    async collectDynamicMemoriesOnly() {
        const dynamicMemories = {
            userDefinedMemories: [],     // 사용자가 "기억해"로 추가한 것들
            autoLearnedMemories: [],     // 대화에서 자동 학습된 것들  
            conversationPatterns: [],    // 대화 패턴들
            emotionalMemories: [],       // 감정 기억들
            dailyInteractions: [],       // 일일 상호작용들
            importantMoments: [],        // 중요한 순간들
            totalCount: 0
        };

        try {
            // 1. 사용자 정의 기억들 (yejin_memories.json)
            try {
                const userMemData = await fs.readFile(this.dynamicFiles.userMemories, 'utf8');
                const userData = JSON.parse(userMemData);
                if (userData.memories && Array.isArray(userData.memories)) {
                    dynamicMemories.userDefinedMemories = userData.memories.map(mem => ({
                        content: mem.content || mem,
                        addedAt: mem.addedAt || mem.timestamp || new Date().toISOString(),
                        category: mem.category || 'user_defined',
                        importance: mem.importance || 5,
                        source: '사용자 추가 기억'
                    }));
                }
                console.log(`${colors.memory}✅ 사용자 정의 기억: ${dynamicMemories.userDefinedMemories.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 사용자 정의 기억 파일 없음 (정상)${colors.reset}`);
            }

            // 2. 자동 학습된 기억들 (dynamic_learning.json)  
            try {
                const learningData = await fs.readFile(this.dynamicFiles.dynamicLearning, 'utf8');
                const learning = JSON.parse(learningData);
                if (learning.learningHistory && Array.isArray(learning.learningHistory)) {
                    dynamicMemories.autoLearnedMemories = learning.learningHistory.map(item => ({
                        content: this.extractLearningContent(item.data),
                        learnedAt: item.timestamp,
                        source: '자동 학습',
                        confidence: item.data.confidence || 0.5
                    }));
                }
                console.log(`${colors.memory}✅ 자동 학습 기억: ${dynamicMemories.autoLearnedMemories.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 자동 학습 기억 파일 없음 (정상)${colors.reset}`);
            }

            // 3. 대화 패턴들 (conversation_patterns.json)
            try {
                const patternsData = await fs.readFile(this.dynamicFiles.conversationPatterns, 'utf8');
                const patterns = JSON.parse(patternsData);
                if (patterns.patterns && Array.isArray(patterns.patterns)) {
                    dynamicMemories.conversationPatterns = patterns.patterns.map(pattern => ({
                        content: this.extractPatternContent(pattern.data),
                        discoveredAt: pattern.timestamp,
                        source: '대화 패턴 학습'
                    }));
                }
                console.log(`${colors.memory}✅ 대화 패턴: ${dynamicMemories.conversationPatterns.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 대화 패턴 파일 없음 (정상)${colors.reset}`);
            }

            // 4. 감정 기억들 (emotional_memory.json)
            try {
                const emotionData = await fs.readFile(this.dynamicFiles.emotionalMemory, 'utf8');
                const emotions = JSON.parse(emotionData);
                if (emotions.significantMoments && Array.isArray(emotions.significantMoments)) {
                    dynamicMemories.emotionalMemories = emotions.significantMoments.map(moment => ({
                        content: `${moment.emotion} 감정 (강도: ${moment.intensity}/10) - ${moment.context}`,
                        experiencedAt: moment.timestamp,
                        source: '감정 기억',
                        emotion: moment.emotion,
                        intensity: moment.intensity
                    }));
                }
                console.log(`${colors.memory}✅ 감정 기억: ${dynamicMemories.emotionalMemories.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 감정 기억 파일 없음 (정상)${colors.reset}`);
            }

            // 5. 일일 상호작용들 (daily_interactions.json)
            try {
                const dailyData = await fs.readFile(this.dynamicFiles.dailyInteractions, 'utf8');
                const daily = JSON.parse(dailyData);
                for (const [date, dayData] of Object.entries(daily)) {
                    if (dayData.significantEvents && Array.isArray(dayData.significantEvents)) {
                        const dayMemories = dayData.significantEvents.map(event => ({
                            content: event.description || event,
                            happenedAt: `${date}T${event.time || '12:00:00'}.000Z`,
                            source: '일일 상호작용',
                            date: date
                        }));
                        dynamicMemories.dailyInteractions.push(...dayMemories);
                    }
                }
                console.log(`${colors.memory}✅ 일일 상호작용: ${dynamicMemories.dailyInteractions.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 일일 상호작용 파일 없음 (정상)${colors.reset}`);
            }

            // 6. 중요한 순간들 (important_moments.json)
            try {
                const momentsData = await fs.readFile(this.dynamicFiles.importantMoments, 'utf8');
                const moments = JSON.parse(momentsData);
                if (moments.moments && Array.isArray(moments.moments)) {
                    dynamicMemories.importantMoments = moments.moments.map(moment => ({
                        content: moment.content,
                        happenedAt: moment.timestamp,
                        source: '중요한 순간',
                        importance: moment.importance,
                        type: moment.type,
                        emotions: moment.emotions
                    }));
                }
                console.log(`${colors.memory}✅ 중요한 순간: ${dynamicMemories.importantMoments.length}개${colors.reset}`);
            } catch (error) {
                console.log(`${colors.system}ℹ️ 중요한 순간 파일 없음 (정상)${colors.reset}`);
            }

            // 전체 개수 계산
            dynamicMemories.totalCount = 
                dynamicMemories.userDefinedMemories.length +
                dynamicMemories.autoLearnedMemories.length +
                dynamicMemories.conversationPatterns.length +
                dynamicMemories.emotionalMemories.length +
                dynamicMemories.dailyInteractions.length +
                dynamicMemories.importantMoments.length;

            console.log(`${colors.diary}📊 총 동적 기억 수집: ${dynamicMemories.totalCount}개${colors.reset}`);
            return dynamicMemories;

        } catch (error) {
            console.error(`${colors.error}❌ 동적 기억 수집 실패: ${error.message}${colors.reset}`);
            return dynamicMemories;
        }
    }

    // 🧠 학습 내용 추출
    extractLearningContent(learningData) {
        if (typeof learningData === 'string') return learningData;
        if (learningData.pattern) return learningData.pattern;
        if (learningData.newPattern) return learningData.newPattern;
        if (learningData.content) return learningData.content;
        return JSON.stringify(learningData).substring(0, 100) + '...';
    }

    // 🗣️ 패턴 내용 추출
    extractPatternContent(patternData) {
        if (typeof patternData === 'string') return patternData;
        if (patternData.pattern) return patternData.pattern;
        if (patternData.description) return patternData.description;
        if (patternData.frequentPhrases) {
            const phrases = Object.keys(patternData.frequentPhrases).slice(0, 3);
            return `자주 사용하는 표현: ${phrases.join(', ')}`;
        }
        return JSON.stringify(patternData).substring(0, 100) + '...';
    }

    // 📅 날짜별로 동적 기억 분류
    organizeDynamicMemoriesByDate(dynamicMemories) {
        const organizedByDate = {};
        const today = new Date().toISOString().split('T')[0];

        // 모든 동적 기억들을 하나의 배열로 합치기
        const allMemories = [
            ...dynamicMemories.userDefinedMemories,
            ...dynamicMemories.autoLearnedMemories,
            ...dynamicMemories.conversationPatterns,
            ...dynamicMemories.emotionalMemories,
            ...dynamicMemories.dailyInteractions,
            ...dynamicMemories.importantMoments
        ];

        // 날짜별로 분류
        allMemories.forEach(memory => {
            const dateKey = memory.addedAt || memory.learnedAt || memory.discoveredAt || 
                           memory.experiencedAt || memory.happenedAt || today;
            const date = dateKey.split('T')[0];

            if (!organizedByDate[date]) {
                organizedByDate[date] = {
                    date: date,
                    memories: [],
                    totalCount: 0,
                    categories: {
                        userDefined: 0,
                        autoLearned: 0,
                        patterns: 0,
                        emotions: 0,
                        interactions: 0,
                        important: 0
                    }
                };
            }

            organizedByDate[date].memories.push(memory);
            organizedByDate[date].totalCount++;

            // 카테고리별 카운트
            switch(memory.source) {
                case '사용자 추가 기억':
                    organizedByDate[date].categories.userDefined++;
                    break;
                case '자동 학습':
                    organizedByDate[date].categories.autoLearned++;
                    break;
                case '대화 패턴 학습':
                    organizedByDate[date].categories.patterns++;
                    break;
                case '감정 기억':
                    organizedByDate[date].categories.emotions++;
                    break;
                case '일일 상호작용':
                    organizedByDate[date].categories.interactions++;
                    break;
                case '중요한 순간':
                    organizedByDate[date].categories.important++;
                    break;
            }
        });

        return organizedByDate;
    }

    // 📔 일기장 생성 (동적 기억만 포함)
    async generateDynamicMemoryDiary() {
        try {
            await this.ensureDataDirectory();

            console.log(`${colors.diary}📔 동적 기억 일기장 생성 시작...${colors.reset}`);

            // 동적 기억들만 수집 (고정기억 제외!)
            const dynamicMemories = await this.collectDynamicMemoriesOnly();

            if (dynamicMemories.totalCount === 0) {
                return {
                    success: true,
                    message: "아직 누적된 동적 기억이 없어요. 대화하면서 기억들이 쌓일 거예요! 😊",
                    totalMemories: 0,
                    diary: null
                };
            }

            // 날짜별로 분류
            const organizedMemories = this.organizeDynamicMemoriesByDate(dynamicMemories);

            // 일기장 데이터 생성
            const diaryData = {
                generatedAt: new Date().toISOString(),
                totalDynamicMemories: dynamicMemories.totalCount,
                totalDays: Object.keys(organizedMemories).length,
                memoriesByDate: organizedMemories,
                statistics: {
                    userDefinedMemories: dynamicMemories.userDefinedMemories.length,
                    autoLearnedMemories: dynamicMemories.autoLearnedMemories.length,
                    conversationPatterns: dynamicMemories.conversationPatterns.length,
                    emotionalMemories: dynamicMemories.emotionalMemories.length,
                    dailyInteractions: dynamicMemories.dailyInteractions.length,
                    importantMoments: dynamicMemories.importantMoments.length
                },
                metadata: {
                    description: "무쿠의 누적 동적기억 일기장 - 고정기억 120개 제외",
                    onlyDynamicMemories: true,
                    excludesFixedMemories: true
                }
            };

            // 일기장 파일 저장
            await fs.writeFile(this.diaryFile, JSON.stringify(diaryData, null, 2));

            console.log(`${colors.diary}✅ 동적 기억 일기장 생성 완료!${colors.reset}`);
            console.log(`${colors.diary}   📊 총 ${dynamicMemories.totalCount}개 동적 기억${colors.reset}`);
            console.log(`${colors.diary}   📅 총 ${Object.keys(organizedMemories).length}일간의 기록${colors.reset}`);

            return {
                success: true,
                message: `동적 기억 일기장이 생성되었어요! 총 ${dynamicMemories.totalCount}개의 누적 기억들이 있어요 😊`,
                totalMemories: dynamicMemories.totalCount,
                totalDays: Object.keys(organizedMemories).length,
                diary: diaryData,
                filePath: this.diaryFile
            };

        } catch (error) {
            console.error(`${colors.error}❌ 동적 기억 일기장 생성 실패: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                totalMemories: 0,
                diary: null
            };
        }
    }

    // 📖 일기장 읽기 (동적 기억만)
    async readDynamicMemoryDiary() {
        try {
            const diaryData = await fs.readFile(this.diaryFile, 'utf8');
            const diary = JSON.parse(diaryData);

            return {
                success: true,
                diary: diary,
                summary: {
                    totalMemories: diary.totalDynamicMemories || 0,
                    totalDays: diary.totalDays || 0,
                    lastGenerated: diary.generatedAt,
                    onlyDynamicMemories: true
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                diary: null
            };
        }
    }

    // 📊 동적 기억 통계
    async getDynamicMemoryStatistics() {
        try {
            const dynamicMemories = await this.collectDynamicMemoriesOnly();
            
            return {
                totalDynamicMemories: dynamicMemories.totalCount,
                breakdown: {
                    userDefinedMemories: dynamicMemories.userDefinedMemories.length,
                    autoLearnedMemories: dynamicMemories.autoLearnedMemories.length,
                    conversationPatterns: dynamicMemories.conversationPatterns.length,
                    emotionalMemories: dynamicMemories.emotionalMemories.length,
                    dailyInteractions: dynamicMemories.dailyInteractions.length,
                    importantMoments: dynamicMemories.importantMoments.length
                },
                excludesFixedMemories: true,
                description: "고정기억 120개 제외, 오직 누적 동적기억만 포함"
            };

        } catch (error) {
            return {
                error: error.message,
                totalDynamicMemories: 0
            };
        }
    }

    // 🎯 특정 날짜의 동적 기억 조회
    async getDynamicMemoriesForDate(targetDate) {
        try {
            const dynamicMemories = await this.collectDynamicMemoriesOnly();
            const organizedMemories = this.organizeDynamicMemoriesByDate(dynamicMemories);
            
            return organizedMemories[targetDate] || {
                date: targetDate,
                memories: [],
                totalCount: 0,
                message: "해당 날짜에는 누적된 동적 기억이 없어요."
            };

        } catch (error) {
            return {
                error: error.message,
                date: targetDate,
                memories: []
            };
        }
    }

    // 🔍 동적 기억 검색
    async searchDynamicMemories(searchTerm) {
        try {
            const dynamicMemories = await this.collectDynamicMemoriesOnly();
            const allMemories = [
                ...dynamicMemories.userDefinedMemories,
                ...dynamicMemories.autoLearnedMemories,
                ...dynamicMemories.conversationPatterns,
                ...dynamicMemories.emotionalMemories,
                ...dynamicMemories.dailyInteractions,
                ...dynamicMemories.importantMoments
            ];

            const searchResults = allMemories.filter(memory => 
                memory.content.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return {
                searchTerm: searchTerm,
                totalResults: searchResults.length,
                results: searchResults,
                onlyDynamicMemories: true
            };

        } catch (error) {
            return {
                error: error.message,
                searchTerm: searchTerm,
                results: []
            };
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    DynamicMemoryDiarySystem,
    
    // 기존 함수들을 새 클래스로 래핑
    async generateDiary() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.generateDynamicMemoryDiary();
    },

    async readDiary() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.readDynamicMemoryDiary();
    },

    async getMemoryStatistics() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.getDynamicMemoryStatistics();
    },

    async searchMemories(searchTerm) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.searchDynamicMemories(searchTerm);
    },

    async getMemoriesForDate(date) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.getDynamicMemoriesForDate(date);
    }
};

    // 💾 새로운 동적 기억 추가
    async addDynamicMemory(memoryData) {
        try {
            await this.ensureDataDirectory();
            
            const timestamp = new Date().toISOString();
            const memoryEntry = {
                id: Date.now() + Math.random(),
                content: memoryData.content,
                addedAt: timestamp,
                category: memoryData.category || 'general',
                importance: memoryData.importance || 5,
                source: memoryData.source || '사용자 추가 기억',
                tags: memoryData.tags || [],
                context: memoryData.context || ''
            };

            // 사용자 기억 파일에 추가
            let userMemories = { memories: [], totalCount: 0 };
            try {
                const data = await fs.readFile(this.dynamicFiles.userMemories, 'utf8');
                userMemories = JSON.parse(data);
            } catch {
                // 파일이 없으면 새로 생성
            }

            userMemories.memories.push(memoryEntry);
            userMemories.totalCount = userMemories.memories.length;
            userMemories.lastUpdated = timestamp;

            await fs.writeFile(
                this.dynamicFiles.userMemories,
                JSON.stringify(userMemories, null, 2),
                'utf8'
            );

            console.log(`${colors.memory}✅ 새로운 동적 기억 추가: ${memoryData.content}${colors.reset}`);
            return {
                success: true,
                memory: memoryEntry,
                totalMemories: userMemories.totalCount
            };

        } catch (error) {
            console.error(`${colors.error}❌ 동적 기억 추가 실패: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🗑️ 동적 기억 삭제
    async deleteDynamicMemory(memoryId) {
        try {
            let userMemories = { memories: [], totalCount: 0 };
            try {
                const data = await fs.readFile(this.dynamicFiles.userMemories, 'utf8');
                userMemories = JSON.parse(data);
            } catch {
                return { success: false, error: '기억 파일을 찾을 수 없습니다.' };
            }

            const initialCount = userMemories.memories.length;
            userMemories.memories = userMemories.memories.filter(mem => mem.id !== memoryId);
            const deletedCount = initialCount - userMemories.memories.length;

            if (deletedCount > 0) {
                userMemories.totalCount = userMemories.memories.length;
                userMemories.lastUpdated = new Date().toISOString();

                await fs.writeFile(
                    this.dynamicFiles.userMemories,
                    JSON.stringify(userMemories, null, 2),
                    'utf8'
                );

                console.log(`${colors.memory}✅ 동적 기억 삭제 완료: ID ${memoryId}${colors.reset}`);
                return {
                    success: true,
                    deletedCount: deletedCount,
                    remainingCount: userMemories.totalCount
                };
            } else {
                return {
                    success: false,
                    error: '해당 ID의 기억을 찾을 수 없습니다.'
                };
            }

        } catch (error) {
            console.error(`${colors.error}❌ 동적 기억 삭제 실패: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 📝 동적 기억 수정
    async updateDynamicMemory(memoryId, updateData) {
        try {
            let userMemories = { memories: [], totalCount: 0 };
            try {
                const data = await fs.readFile(this.dynamicFiles.userMemories, 'utf8');
                userMemories = JSON.parse(data);
            } catch {
                return { success: false, error: '기억 파일을 찾을 수 없습니다.' };
            }

            const memoryIndex = userMemories.memories.findIndex(mem => mem.id === memoryId);
            if (memoryIndex === -1) {
                return { success: false, error: '해당 ID의 기억을 찾을 수 없습니다.' };
            }

            // 기억 업데이트
            const updatedMemory = {
                ...userMemories.memories[memoryIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            userMemories.memories[memoryIndex] = updatedMemory;
            userMemories.lastUpdated = new Date().toISOString();

            await fs.writeFile(
                this.dynamicFiles.userMemories,
                JSON.stringify(userMemories, null, 2),
                'utf8'
            );

            console.log(`${colors.memory}✅ 동적 기억 수정 완료: ID ${memoryId}${colors.reset}`);
            return {
                success: true,
                updatedMemory: updatedMemory
            };

        } catch (error) {
            console.error(`${colors.error}❌ 동적 기억 수정 실패: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 📈 동적 기억 성장 추적
    async trackMemoryGrowth() {
        try {
            const currentStats = await this.getDynamicMemoryStatistics();
            const growthFile = path.join(this.dataDir, 'memory_growth.json');
            
            let growthData = { dailyGrowth: {}, totalGrowth: [] };
            try {
                const data = await fs.readFile(growthFile, 'utf8');
                growthData = JSON.parse(data);
            } catch {
                // 새 파일 생성
            }

            const today = new Date().toISOString().split('T')[0];
            growthData.dailyGrowth[today] = currentStats.totalDynamicMemories;
            growthData.totalGrowth.push({
                date: today,
                total: currentStats.totalDynamicMemories,
                breakdown: currentStats.breakdown
            });

            await fs.writeFile(growthFile, JSON.stringify(growthData, null, 2), 'utf8');

            // 최근 7일간 성장률 계산
            const recentGrowth = growthData.totalGrowth.slice(-7);
            const growthRate = recentGrowth.length > 1 ? 
                recentGrowth[recentGrowth.length - 1].total - recentGrowth[0].total : 0;

            return {
                currentTotal: currentStats.totalDynamicMemories,
                weeklyGrowth: growthRate,
                dailyAverage: Math.round(growthRate / 7 * 10) / 10,
                growthHistory: recentGrowth
            };

        } catch (error) {
            console.error(`${colors.error}❌ 기억 성장 추적 실패: ${error.message}${colors.reset}`);
            return { error: error.message };
        }
    }

    // 🎨 예쁜 일기장 포맷 생성
    generatePrettyDiaryFormat(diaryData) {
        if (!diaryData || !diaryData.memoriesByDate) {
            return "📔 아직 누적된 동적 기억이 없어요. 대화하면서 기억들이 쌓일 거예요! 😊";
        }

        let diaryText = `📔 **무쿠의 누적 동적기억 일기장** 📔\n`;
        diaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        diaryText += `📊 총 ${diaryData.totalDynamicMemories}개의 동적 기억 (고정기억 제외)\n`;
        diaryText += `📅 총 ${diaryData.totalDays}일간의 누적 기록\n`;
        diaryText += `⏰ 생성일시: ${new Date(diaryData.generatedAt).toLocaleString('ko-KR', {timeZone: 'Asia/Tokyo'})}\n\n`;

        // 통계 정보
        diaryText += `📈 **기억 유형별 통계**\n`;
        diaryText += `   💭 사용자 정의 기억: ${diaryData.statistics.userDefinedMemories}개\n`;
        diaryText += `   🧠 자동 학습 기억: ${diaryData.statistics.autoLearnedMemories}개\n`;
        diaryText += `   🗣️ 대화 패턴: ${diaryData.statistics.conversationPatterns}개\n`;
        diaryText += `   💖 감정 기억: ${diaryData.statistics.emotionalMemories}개\n`;
        diaryText += `   📅 일일 상호작용: ${diaryData.statistics.dailyInteractions}개\n`;
        diaryText += `   ⭐ 중요한 순간: ${diaryData.statistics.importantMoments}개\n\n`;

        // 날짜별 기억들
        const sortedDates = Object.keys(diaryData.memoriesByDate).sort((a, b) => new Date(b) - new Date(a));
        
        for (const date of sortedDates.slice(0, 10)) { // 최근 10일만 표시
            const dayData = diaryData.memoriesByDate[date];
            const displayDate = new Date(date).toLocaleDateString('ko-KR', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });

            diaryText += `📅 **${displayDate}** (${dayData.totalCount}개 기억)\n`;
            diaryText += `   ├─ 💭 사용자 정의: ${dayData.categories.userDefined}개\n`;
            diaryText += `   ├─ 🧠 자동 학습: ${dayData.categories.autoLearned}개\n`;
            diaryText += `   ├─ 🗣️ 대화 패턴: ${dayData.categories.patterns}개\n`;
            diaryText += `   ├─ 💖 감정 기억: ${dayData.categories.emotions}개\n`;
            diaryText += `   ├─ 📋 상호작용: ${dayData.categories.interactions}개\n`;
            diaryText += `   └─ ⭐ 중요한 순간: ${dayData.categories.important}개\n`;

            // 기억 내용 (최대 3개까지)
            const recentMemories = dayData.memories.slice(0, 3);
            for (let i = 0; i < recentMemories.length; i++) {
                const memory = recentMemories[i];
                const timeStr = memory.addedAt || memory.learnedAt || memory.discoveredAt || 
                               memory.experiencedAt || memory.happenedAt || '';
                const time = timeStr ? new Date(timeStr).toLocaleTimeString('ko-KR', {
                    timeZone: 'Asia/Tokyo',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '';

                const sourceIcon = this.getSourceIcon(memory.source);
                diaryText += `     ${sourceIcon} [${time}] ${memory.content.substring(0, 80)}${memory.content.length > 80 ? '...' : ''}\n`;
            }

            if (dayData.memories.length > 3) {
                diaryText += `     📝 ... 외 ${dayData.memories.length - 3}개 더\n`;
            }
            diaryText += `\n`;
        }

        if (sortedDates.length > 10) {
            diaryText += `📝 ... 외 ${sortedDates.length - 10}일의 기록이 더 있어요\n\n`;
        }

        diaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        diaryText += `💝 무쿠의 기억은 계속 쌓여가고 있어요! 🌸`;

        return diaryText;
    }

    // 🎨 소스별 아이콘 반환
    getSourceIcon(source) {
        const icons = {
            '사용자 추가 기억': '💭',
            '자동 학습': '🧠',
            '대화 패턴 학습': '🗣️',
            '감정 기억': '💖',
            '일일 상호작용': '📋',
            '중요한 순간': '⭐'
        };
        return icons[source] || '📝';
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    DynamicMemoryDiarySystem,
    
    // 기존 함수들을 새 클래스로 래핑
    async generateDiary() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.generateDynamicMemoryDiary();
    },

    async readDiary() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.readDynamicMemoryDiary();
    },

    async getMemoryStatistics() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.getDynamicMemoryStatistics();
    },

    async searchMemories(searchTerm) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.searchDynamicMemories(searchTerm);
    },

    async getMemoriesForDate(date) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.getDynamicMemoriesForDate(date);
    },

    async addMemory(memoryData) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.addDynamicMemory(memoryData);
    },

    async deleteMemory(memoryId) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.deleteDynamicMemory(memoryId);
    },

    async updateMemory(memoryId, updateData) {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.updateDynamicMemory(memoryId, updateData);
    },

    async trackGrowth() {
        const diarySystem = new DynamicMemoryDiarySystem();
        return await diarySystem.trackMemoryGrowth();
    },

    async getPrettyDiary() {
        const diarySystem = new DynamicMemoryDiarySystem();
        const result = await diarySystem.generateDynamicMemoryDiary();
        if (result.success && result.diary) {
            return diarySystem.generatePrettyDiaryFormat(result.diary);
        } else {
            return result.message || "일기장을 생성할 수 없어요.";
        }
    }
};

// ================== 📋 사용 예시 ==================
/*

// 동적 기억 일기장 생성 (고정기억 제외)
const diarySystem = new DynamicMemoryDiarySystem();
const result = await diarySystem.generateDynamicMemoryDiary();

console.log('📔 일기장 결과:', result.message);
console.log('📊 총 동적 기억:', result.totalMemories);

// 특정 날짜 기억 조회
const todayMemories = await diarySystem.getDynamicMemoriesForDate('2024-07-20');

// 동적 기억 검색
const searchResults = await diarySystem.searchDynamicMemories('아저씨');

// 통계 조회
const stats = await diarySystem.getDynamicMemoryStatistics();

// 새로운 기억 추가
const newMemory = await diarySystem.addDynamicMemory({
    content: "아저씨가 오늘 기분이 좋아보였어",
    category: "observation",
    importance: 6,
    tags: ["mood", "observation"]
});

// 예쁜 일기장 포맷으로 출력
const prettyDiary = diarySystem.generatePrettyDiaryFormat(result.diary);
console.log(prettyDiary);

// 기억 성장 추적
const growth = await diarySystem.trackMemoryGrowth();
console.log('📈 기억 성장률:', growth);

*/
