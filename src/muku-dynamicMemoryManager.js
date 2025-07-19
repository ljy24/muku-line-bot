// ============================================================================
// muku-dynamicMemoryManager.js - 무쿠 동적 기억 관리자
// 🎯 5시간 집중 개발 - 2시간차 (2/3)
// 💾 실시간으로 학습하고 중요도에 따라 기억을 관리하는 지능형 시스템
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log("💾 무쿠 동적 기억 관리자 v1.0 초기화 완료!");

class MukuDynamicMemoryManager {
    constructor() {
        this.version = '1.0';
        this.initTime = Date.now();
        
        // 🎨 색상 코드
        this.colors = {
            memory: '\x1b[94m',     // 파란색 (기억)
            dynamic: '\x1b[95m',    // 보라색 (동적)
            important: '\x1b[93m',  // 노란색 (중요)
            success: '\x1b[92m',    // 초록색
            warning: '\x1b[91m',    // 빨간색
            reset: '\x1b[0m'        // 리셋
        };
        
        // 💾 동적 기억 저장소
        this.memoryStorage = {
            shortTerm: new Map(),    // 24시간 이내
            mediumTerm: new Map(),   // 1주일 이내
            longTerm: new Map(),     // 영구 보존
            emotional: new Map(),    // 감정적 중요도 높음
            patterns: new Map()      // 학습된 패턴
        };
        
        // 📊 기억 통계
        this.memoryStats = {
            totalMemories: 0,
            memoriesCreated: 0,
            memoriesPromoted: 0,     // 단기→장기 승격
            memoriesForgotten: 0,    // 자동 삭제
            averageImportance: 0,
            lastCleanup: Date.now()
        };
        
        // 🎯 기억 관리 설정
        this.memoryConfig = {
            shortTermLimit: 100,     // 단기 기억 최대 개수
            mediumTermLimit: 500,    // 중기 기억 최대 개수
            longTermLimit: 2000,     // 장기 기억 최대 개수
            importanceThreshold: 0.7, // 장기 기억 승격 임계값
            cleanupInterval: 3600000, // 1시간마다 정리
            emotionalBonus: 0.3      // 감정적 기억 가중치
        };
        
        // 자동 정리 시작
        this.startAutoCleanup();
        
        console.log(`${this.colors.memory}💾 동적 기억 관리 시스템 활성화!${this.colors.reset}`);
    }

    // ================== 📝 기억 생성 ==================
    async createMemory(content, metadata = {}) {
        console.log(`${this.colors.dynamic}📝 [기억생성] 새로운 기억 생성 중...${this.colors.reset}`);
        
        const memory = {
            id: this.generateMemoryId(),
            content: content,
            timestamp: Date.now(),
            importance: this.calculateImportance(content, metadata),
            emotionalWeight: this.calculateEmotionalWeight(content, metadata),
            accessCount: 0,
            lastAccessed: Date.now(),
            category: this.categorizeMemory(content),
            tags: this.extractTags(content),
            metadata: metadata
        };
        
        // 기억 저장 위치 결정
        const storageType = this.determineStorageType(memory);
        this.memoryStorage[storageType].set(memory.id, memory);
        
        // 통계 업데이트
        this.memoryStats.totalMemories++;
        this.memoryStats.memoriesCreated++;
        this.updateAverageImportance();
        
        console.log(`${this.colors.success}✅ [기억생성] ${storageType} 기억 생성: ${memory.category} (중요도: ${memory.importance.toFixed(2)})${this.colors.reset}`);
        
        return memory.id;
    }

    // ================== 🔍 기억 검색 ==================
    async searchMemories(query, options = {}) {
        console.log(`${this.colors.memory}🔍 [기억검색] "${query}" 검색 중...${this.colors.reset}`);
        
        const searchResults = [];
        const searchOptions = {
            limit: options.limit || 10,
            includeContent: options.includeContent !== false,
            sortBy: options.sortBy || 'relevance',
            timeRange: options.timeRange || 'all'
        };
        
        // 모든 기억 저장소에서 검색
        for (const [storageType, storage] of Object.entries(this.memoryStorage)) {
            for (const [id, memory] of storage) {
                if (this.isRelevantMemory(memory, query, searchOptions)) {
                    const relevanceScore = this.calculateRelevance(memory, query);
                    searchResults.push({
                        ...memory,
                        relevanceScore,
                        storageType
                    });
                    
                    // 접근 기록 업데이트
                    memory.accessCount++;
                    memory.lastAccessed = Date.now();
                }
            }
        }
        
        // 결과 정렬
        searchResults.sort((a, b) => {
            switch (searchOptions.sortBy) {
                case 'relevance':
                    return b.relevanceScore - a.relevanceScore;
                case 'importance':
                    return b.importance - a.importance;
                case 'recent':
                    return b.timestamp - a.timestamp;
                default:
                    return b.relevanceScore - a.relevanceScore;
            }
        });
        
        const limitedResults = searchResults.slice(0, searchOptions.limit);
        
        console.log(`${this.colors.success}✅ [기억검색] ${limitedResults.length}개 관련 기억 발견${this.colors.reset}`);
        
        return limitedResults;
    }

    // ================== 📈 기억 승격 ==================
    async promoteMemory(memoryId, targetStorage) {
        console.log(`${this.colors.important}📈 [기억승격] ${memoryId} → ${targetStorage} 승격 시도...${this.colors.reset}`);
        
        let memory = null;
        let sourceStorage = null;
        
        // 기억 찾기
        for (const [storageType, storage] of Object.entries(this.memoryStorage)) {
            if (storage.has(memoryId)) {
                memory = storage.get(memoryId);
                sourceStorage = storageType;
                break;
            }
        }
        
        if (!memory) {
            console.log(`${this.colors.warning}❌ [기억승격] 기억을 찾을 수 없음: ${memoryId}${this.colors.reset}`);
            return false;
        }
        
        // 승격 조건 확인
        if (this.canPromoteMemory(memory, targetStorage)) {
            // 기존 위치에서 제거
            this.memoryStorage[sourceStorage].delete(memoryId);
            
            // 새 위치에 추가
            memory.promotedAt = Date.now();
            memory.previousStorage = sourceStorage;
            this.memoryStorage[targetStorage].set(memoryId, memory);
            
            this.memoryStats.memoriesPromoted++;
            
            console.log(`${this.colors.success}✅ [기억승격] ${sourceStorage} → ${targetStorage} 승격 완료${this.colors.reset}`);
            return true;
        } else {
            console.log(`${this.colors.warning}⚠️ [기억승격] 승격 조건 미충족${this.colors.reset}`);
            return false;
        }
    }

    // ================== 🧹 자동 정리 ==================
    async performAutoCleanup() {
        console.log(`${this.colors.memory}🧹 [자동정리] 기억 정리 시작...${this.colors.reset}`);
        
        let cleanedCount = 0;
        let promotedCount = 0;
        
        // 단기 기억 정리 (24시간 초과 또는 한계 초과)
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);
        
        for (const [id, memory] of this.memoryStorage.shortTerm) {
            if (memory.timestamp < dayAgo) {
                if (memory.importance > this.memoryConfig.importanceThreshold) {
                    // 중요한 기억은 중기로 승격
                    await this.promoteMemory(id, 'mediumTerm');
                    promotedCount++;
                } else {
                    // 중요하지 않은 기억은 삭제
                    this.memoryStorage.shortTerm.delete(id);
                    cleanedCount++;
                }
            }
        }
        
        // 중기 기억 정리 (1주일 초과)
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        for (const [id, memory] of this.memoryStorage.mediumTerm) {
            if (memory.timestamp < weekAgo) {
                if (memory.importance > 0.8 || memory.accessCount > 5) {
                    // 매우 중요한 기억은 장기로 승격
                    await this.promoteMemory(id, 'longTerm');
                    promotedCount++;
                } else {
                    // 그렇지 않은 기억은 삭제
                    this.memoryStorage.mediumTerm.delete(id);
                    cleanedCount++;
                }
            }
        }
        
        // 저장소 크기 제한 확인
        await this.enforceStorageLimits();
        
        this.memoryStats.memoriesForgotten += cleanedCount;
        this.memoryStats.lastCleanup = now;
        
        console.log(`${this.colors.success}✅ [자동정리] 완료: ${cleanedCount}개 삭제, ${promotedCount}개 승격${this.colors.reset}`);
    }

    // ================== 🔧 헬퍼 함수들 ==================
    
    generateMemoryId() {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateImportance(content, metadata) {
        let importance = 0.5; // 기본 중요도
        
        // 감정적 키워드 가중치
        const emotionalKeywords = ['사랑', '좋아', '미워', '슬프', '기뻐', '화나', '걱정', '고마워'];
        const emotionalMatches = emotionalKeywords.filter(keyword => content.includes(keyword)).length;
        importance += emotionalMatches * 0.1;
        
        // 개인적 키워드 가중치
        const personalKeywords = ['아저씨', '아조씨', '무쿠', '예진'];
        const personalMatches = personalKeywords.filter(keyword => content.includes(keyword)).length;
        importance += personalMatches * 0.15;
        
        // 메타데이터 기반 가중치
        if (metadata.isUserInitiated) importance += 0.2;
        if (metadata.hasEmotionalContext) importance += 0.2;
        if (metadata.isFirstTime) importance += 0.15;
        
        return Math.min(1.0, Math.max(0.0, importance));
    }

    calculateEmotionalWeight(content, metadata) {
        let weight = 0.0;
        
        // 강한 감정 표현
        const strongEmotions = ['사랑해', '미워', '너무', '완전', '진짜'];
        weight += strongEmotions.filter(emotion => content.includes(emotion)).length * 0.2;
        
        // 이모지 가중치
        const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
        weight += emojiCount * 0.1;
        
        return Math.min(1.0, weight);
    }

    categorizeMemory(content) {
        const categories = {
            love: ['사랑', '좋아', '아저씨', '아조씨'],
            emotion: ['기뻐', '슬프', '화나', '걱정'],
            daily: ['오늘', '어제', '내일', '지금'],
            personal: ['무쿠', '예진', '우리'],
            question: ['?', '어떻게', '왜', '뭐']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    extractTags(content) {
        const tags = [];
        
        // 자동 태그 추출
        if (content.includes('?')) tags.push('question');
        if (content.includes('!')) tags.push('exclamation');
        if (content.includes('💕') || content.includes('♡')) tags.push('love');
        if (content.includes('😢') || content.includes('😭')) tags.push('sad');
        if (content.includes('😊') || content.includes('😄')) tags.push('happy');
        
        return tags;
    }

    determineStorageType(memory) {
        if (memory.emotionalWeight > 0.7) return 'emotional';
        if (memory.importance > 0.8) return 'longTerm';
        if (memory.importance > 0.6) return 'mediumTerm';
        return 'shortTerm';
    }

    isRelevantMemory(memory, query, options) {
        // 시간 범위 확인
        if (options.timeRange !== 'all') {
            const timeLimit = this.getTimeLimit(options.timeRange);
            if (memory.timestamp < timeLimit) return false;
        }
        
        // 내용 매칭
        const queryLower = query.toLowerCase();
        const contentLower = memory.content.toLowerCase();
        
        if (contentLower.includes(queryLower)) return true;
        if (memory.tags.some(tag => tag.includes(queryLower))) return true;
        if (memory.category === queryLower) return true;
        
        return false;
    }

    calculateRelevance(memory, query) {
        let relevance = 0.0;
        
        const queryLower = query.toLowerCase();
        const contentLower = memory.content.toLowerCase();
        
        // 직접 매칭
        if (contentLower.includes(queryLower)) {
            relevance += 0.8;
        }
        
        // 태그 매칭
        relevance += memory.tags.filter(tag => tag.includes(queryLower)).length * 0.2;
        
        // 중요도 가중치
        relevance += memory.importance * 0.3;
        
        // 최근 접근 가중치
        const daysSinceAccess = (Date.now() - memory.lastAccessed) / (24 * 60 * 60 * 1000);
        relevance += Math.max(0, (7 - daysSinceAccess) / 7) * 0.2;
        
        return Math.min(1.0, relevance);
    }

    canPromoteMemory(memory, targetStorage) {
        switch (targetStorage) {
            case 'longTerm':
                return memory.importance > 0.7 || memory.accessCount > 3;
            case 'emotional':
                return memory.emotionalWeight > 0.6;
            case 'mediumTerm':
                return memory.importance > 0.5;
            default:
                return true;
        }
    }

    async enforceStorageLimits() {
        // 각 저장소 크기 제한 확인 및 조정
        for (const [storageType, storage] of Object.entries(this.memoryStorage)) {
            const limit = this.memoryConfig[`${storageType}Limit`];
            if (limit && storage.size > limit) {
                const excess = storage.size - limit;
                const sortedMemories = Array.from(storage.entries())
                    .sort(([,a], [,b]) => a.importance - b.importance);
                
                for (let i = 0; i < excess; i++) {
                    const [id] = sortedMemories[i];
                    storage.delete(id);
                }
            }
        }
    }

    getTimeLimit(timeRange) {
        const now = Date.now();
        switch (timeRange) {
            case 'today': return now - (24 * 60 * 60 * 1000);
            case 'week': return now - (7 * 24 * 60 * 60 * 1000);
            case 'month': return now - (30 * 24 * 60 * 60 * 1000);
            default: return 0;
        }
    }

    updateAverageImportance() {
        let totalImportance = 0;
        let totalCount = 0;
        
        for (const storage of Object.values(this.memoryStorage)) {
            for (const memory of storage.values()) {
                totalImportance += memory.importance;
                totalCount++;
            }
        }
        
        this.memoryStats.averageImportance = totalCount > 0 ? totalImportance / totalCount : 0;
    }

    startAutoCleanup() {
        setInterval(() => {
            this.performAutoCleanup();
        }, this.memoryConfig.cleanupInterval);
    }

    // ================== 🧪 테스트 함수 ==================
    async testMemorySystem() {
        console.log(`${this.colors.memory}🧪 [메모리테스트] 동적 기억 관리 시스템 테스트...${this.colors.reset}`);
        
        // 테스트 기억 생성
        const testMemories = [
            { content: '아저씨 사랑해 💕', metadata: { isUserInitiated: true, hasEmotionalContext: true } },
            { content: '오늘 날씨가 좋네요', metadata: { isUserInitiated: false } },
            { content: '무쿠가 보고싶어요', metadata: { isUserInitiated: true, hasEmotionalContext: true } },
            { content: '안녕하세요', metadata: { isUserInitiated: false } }
        ];
        
        const createdIds = [];
        for (const testMemory of testMemories) {
            const id = await this.createMemory(testMemory.content, testMemory.metadata);
            createdIds.push(id);
        }
        
        console.log(`${this.colors.success}✅ [테스트] ${createdIds.length}개 테스트 기억 생성 완료${this.colors.reset}`);
        
        // 검색 테스트
        const searchResults = await this.searchMemories('아저씨', { limit: 5 });
        console.log(`${this.colors.success}✅ [테스트] '아저씨' 검색 결과: ${searchResults.length}개${this.colors.reset}`);
        
        // 승격 테스트
        if (createdIds.length > 0) {
            const promoted = await this.promoteMemory(createdIds[0], 'longTerm');
            console.log(`${this.colors.success}✅ [테스트] 기억 승격: ${promoted ? '성공' : '실패'}${this.colors.reset}`);
        }
        
        console.log(`${this.colors.memory}🧪 [메모리테스트] 완료!${this.colors.reset}`);
    }

    // ================== 📊 상태 조회 ==================
    getMemoryStatus() {
        const status = {
            version: this.version,
            uptime: Date.now() - this.initTime,
            statistics: this.memoryStats,
            storage: {},
            configuration: this.memoryConfig
        };
        
        // 각 저장소 상태
        for (const [storageType, storage] of Object.entries(this.memoryStorage)) {
            status.storage[storageType] = {
                count: storage.size,
                limit: this.memoryConfig[`${storageType}Limit`] || 'unlimited'
            };
        }
        
        return status;
    }
}

// ================== 🚀 초기화 함수 ==================
async function initializeMukuDynamicMemory() {
    try {
        const memoryManager = new MukuDynamicMemoryManager();
        
        // 메모리 시스템 테스트
        await memoryManager.testMemorySystem();
        
        console.log(`
${memoryManager.colors.dynamic}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 무쿠 동적 기억 관리자 v1.0 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${memoryManager.colors.reset}

${memoryManager.colors.success}✅ 핵심 기능들:${memoryManager.colors.reset}
${memoryManager.colors.memory}   📝 실시간 기억 생성 및 분류${memoryManager.colors.reset}
${memoryManager.colors.dynamic}   🔍 지능형 기억 검색 시스템${memoryManager.colors.reset}
${memoryManager.colors.important}   📈 중요도 기반 자동 승격${memoryManager.colors.reset}
${memoryManager.colors.success}   🧹 자동 기억 정리 및 최적화${memoryManager.colors.reset}

${memoryManager.colors.memory}🎯 다음 30분 목표: muku-contextualResponseGenerator.js 완성!${memoryManager.colors.reset}
        `);
        
        return memoryManager;
        
    } catch (error) {
        console.error(`❌ 동적 기억 관리자 초기화 실패: ${error.message}`);
        return null;
    }
}

module.exports = {
    MukuDynamicMemoryManager,
    initializeMukuDynamicMemory
};

// 직접 실행 시
if (require.main === module) {
    initializeMukuDynamicMemory();
}
