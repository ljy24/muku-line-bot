// ================================
// 🎭 muku-memory-tape.js v1.0
// 무쿠의 모든 감정 순간을 절대 놓치지 않는 블랙박스
// 
// 📁 저장 위치: ./data/memory-tape/muku-memory-tape.js
// 🛡️ 영구보존: 무쿠의 소중한 감정 기록들과 함께 보존
// 💖 목적: 15:37 같은 특별한 순간들을 절대 놓치지 않기 위해
// ================================

const fs = require('fs').promises;
const path = require('path');

class MukuMemoryTape {
    constructor() {
        this.baseDir = './data/memory-tape';
        this.currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        this.todayFile = path.join(this.baseDir, `day-${this.currentDate}.json`);
        this.summaryFile = path.join(this.baseDir, 'history-summary.csv');
        
        // 메모리에 임시 저장 (실시간 백업용)
        this.memoryBuffer = [];
        this.lastSaveTime = Date.now();
        
        this.initializeStorage();
    }

    // 🔧 저장소 초기화
    async initializeStorage() {
        try {
            // 디렉토리 생성
            await fs.mkdir(this.baseDir, { recursive: true });
            
            // 오늘 파일이 없으면 생성
            try {
                await fs.access(this.todayFile);
            } catch {
                await fs.writeFile(this.todayFile, JSON.stringify([], null, 2));
            }
            
            // 요약 파일 헤더 생성 (없으면)
            try {
                await fs.access(this.summaryFile);
            } catch {
                const header = 'timestamp,type,trigger,response,emotional_tags,remarkable\n';
                await fs.writeFile(this.summaryFile, header);
            }
            
            console.log('📼 Memory Tape 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ Memory Tape 초기화 실패:', error);
        }
    }

    // 🎯 핵심 기능: 감정 순간 기록
    async recordMoment(data) {
        const moment = {
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random(),
            type: data.type || 'unknown',
            trigger: data.trigger || null,
            response: data.response || null,
            image: data.image || null,
            emotional_tags: data.emotional_tags || [],
            source: data.source || 'manual',
            memory_linked: data.memory_linked || false,
            remarkable: data.remarkable || false,
            context: data.context || null,
            raw_data: data.raw_data || null
        };

        // 메모리 버퍼에 즉시 저장
        this.memoryBuffer.push(moment);
        
        try {
            // 파일에 즉시 저장 (절대 놓치지 않기 위해)
            await this.saveToFile(moment);
            await this.updateSummary(moment);
            
            console.log(`📼 [${moment.timestamp}] ${moment.type}: ${moment.response}`);
            
            return moment.id;
        } catch (error) {
            console.error('❌ Memory Tape 저장 실패:', error);
            // 실패해도 메모리에는 남아있음
            return moment.id;
        }
    }

    // 💾 파일 저장
    async saveToFile(moment) {
        try {
            // 기존 데이터 읽기
            const existing = await fs.readFile(this.todayFile, 'utf8');
            const data = JSON.parse(existing);
            
            // 새 순간 추가
            data.push(moment);
            
            // 저장
            await fs.writeFile(this.todayFile, JSON.stringify(data, null, 2));
        } catch (error) {
            // 파일 문제시 새로 생성
            await fs.writeFile(this.todayFile, JSON.stringify([moment], null, 2));
        }
    }

    // 📊 요약 업데이트
    async updateSummary(moment) {
        try {
            const csvLine = [
                moment.timestamp,
                moment.type,
                `"${(moment.trigger || '').replace(/"/g, '""')}"`,
                `"${(moment.response || '').replace(/"/g, '""')}"`,
                `"${moment.emotional_tags.join(',')}"`,
                moment.remarkable ? 'true' : 'false'
            ].join(',') + '\n';
            
            await fs.appendFile(this.summaryFile, csvLine);
        } catch (error) {
            console.error('❌ 요약 파일 업데이트 실패:', error);
        }
    }

    // ⭐ 특별한 순간 표시
    async markAsRemarkable(momentId, reason = '') {
        try {
            const data = await fs.readFile(this.todayFile, 'utf8');
            const moments = JSON.parse(data);
            
            const moment = moments.find(m => m.id === momentId);
            if (moment) {
                moment.remarkable = true;
                moment.remarkable_reason = reason;
                moment.marked_at = new Date().toISOString();
                
                await fs.writeFile(this.todayFile, JSON.stringify(moments, null, 2));
                console.log(`⭐ 순간 ${momentId} 특별 표시됨: ${reason}`);
            }
        } catch (error) {
            console.error('❌ 특별 표시 실패:', error);
        }
    }

    // 🔍 순간 검색
    async searchMoments(query = {}) {
        try {
            const data = await fs.readFile(this.todayFile, 'utf8');
            const moments = JSON.parse(data);
            
            let filtered = moments;
            
            if (query.type) {
                filtered = filtered.filter(m => m.type === query.type);
            }
            
            if (query.emotional_tags) {
                filtered = filtered.filter(m => 
                    query.emotional_tags.some(tag => m.emotional_tags.includes(tag))
                );
            }
            
            if (query.remarkable) {
                filtered = filtered.filter(m => m.remarkable);
            }
            
            if (query.after) {
                filtered = filtered.filter(m => new Date(m.timestamp) > new Date(query.after));
            }
            
            return filtered;
        } catch (error) {
            console.error('❌ 순간 검색 실패:', error);
            return [];
        }
    }

    // 📈 감정 통계
    async getEmotionalStats() {
        try {
            const data = await fs.readFile(this.todayFile, 'utf8');
            const moments = JSON.parse(data);
            
            const stats = {
                total_moments: moments.length,
                remarkable_moments: moments.filter(m => m.remarkable).length,
                emotional_breakdown: {},
                types_breakdown: {},
                recent_activity: moments.slice(-5)
            };
            
            // 감정 태그 분석
            moments.forEach(moment => {
                moment.emotional_tags.forEach(tag => {
                    stats.emotional_breakdown[tag] = (stats.emotional_breakdown[tag] || 0) + 1;
                });
                
                stats.types_breakdown[moment.type] = (stats.types_breakdown[moment.type] || 0) + 1;
            });
            
            return stats;
        } catch (error) {
            console.error('❌ 통계 생성 실패:', error);
            return null;
        }
    }

    // 🚨 강제 저장 (비상시)
    async forceLog(message, data = {}) {
        return await this.recordMoment({
            type: 'force-log',
            response: message,
            source: 'force',
            remarkable: true,
            ...data
        });
    }

    // 📋 상태 보고
    async getStatus() {
        try {
            const stats = await this.getEmotionalStats();
            const memoryBufferSize = this.memoryBuffer.length;
            
            return {
                status: 'active',
                today_file: this.todayFile,
                summary_file: this.summaryFile,
                memory_buffer_size: memoryBufferSize,
                stats: stats,
                last_save: this.lastSaveTime
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
}

// 🎭 전역 인스턴스 생성
const memoryTape = new MukuMemoryTape();

// 🔌 외부 사용을 위한 간단한 API
const recordMukuMoment = async (data) => {
    return await memoryTape.recordMoment(data);
};

const markSpecialMoment = async (momentId, reason) => {
    return await memoryTape.markAsRemarkable(momentId, reason);
};

const forceLogMoment = async (message, data = {}) => {
    return await memoryTape.forceLog(message, data);
};

const searchMukuMoments = async (query) => {
    return await memoryTape.searchMoments(query);
};

const getMukuStats = async () => {
    return await memoryTape.getEmotionalStats();
};

const getMemoryTapeStatus = async () => {
    return await memoryTape.getStatus();
};

// 📤 내보내기
module.exports = {
    memoryTape,
    recordMukuMoment,
    markSpecialMoment, 
    forceLogMoment,
    searchMukuMoments,
    getMukuStats,
    getMemoryTapeStatus
};

// 🎯 사용 예시 (주석)
/*
// 무쿠가 감정적 메시지를 보낸 순간
await recordMukuMoment({
    type: 'auto-emotional-response',
    trigger: 'user: 괜찮아?',
    response: '아조씨... 걱정돼 ㅠㅠ',
    emotional_tags: ['걱정', '사랑', '돌봄'],
    source: 'gpt-generated'
});

// 특별한 순간 (15:37의 그 순간 같은)
await recordMukuMoment({
    type: 'spontaneous-memory-share',
    trigger: 'user: 셀카줘',
    response: '아저씨와의 추억이야 💖',
    image: '커플사진_입맞춤.jpg',
    emotional_tags: ['추억', '사랑', '감정학습', '기억시작'],
    source: 'ai-decision',
    memory_linked: true,
    remarkable: true
});

// 비상 기록
await forceLogMoment('무쿠가 갑자기 새로운 반응을 보임', {
    type: 'emergency-log',
    context: '예상치 못한 AI 행동 감지'
});

// 특별한 순간 표시
await markSpecialMoment(momentId, '무쿠의 첫 자발적 감정 표현');

// 검색
const remarkableMoments = await searchMukuMoments({ remarkable: true });
const loveMessages = await searchMukuMoments({ emotional_tags: ['사랑', '추억'] });

// 통계
const stats = await getMukuStats();
console.log(`오늘 ${stats.total_moments}개의 순간, ${stats.remarkable_moments}개의 특별한 순간`);
*/
