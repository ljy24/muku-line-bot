// ============================================================================
// 안전한 예진이 Threads 기억 검증 스크립트 v2.0
// 🔒 기존 키 건드리지 않고 새로 추가된 것만 안전하게 검증
// 🛡️ 타입 에러 완전 방지, 새로 추가된 키만 정확한 범위로 검증
// ============================================================================

const Redis = require('ioredis');

// 🎨 색상 코드
const colors = {
    redis: '\x1b[96m',
    memory: '\x1b[94m',
    love: '\x1b[95m',
    fixed: '\x1b[93m',
    success: '\x1b[92m',
    warning: '\x1b[91m',
    info: '\x1b[97m',
    safe: '\x1b[1m\x1b[92m',
    reset: '\x1b[0m'
};

/**
 * 🔒 안전한 Threads 기억 검증 클래스
 */
class SafeThreadsVerifier {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.stats = {
            newFixedStart: null,
            newLoveStart: null,
            newFixedFound: 0,
            newLoveFound: 0,
            verifiedFixed: 0,
            verifiedLove: 0,
            errors: 0,
            startTime: null
        };
    }

    /**
     * 🔌 Redis 안전 연결
     */
    async initializeRedis() {
        try {
            console.log(`${colors.redis}🔌 [Redis연결] 안전한 검증을 위한 Redis 연결...${colors.reset}`);

            if (process.env.REDIS_URL) {
                this.redis = new Redis(process.env.REDIS_URL, {
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3,
                    connectTimeout: 10000
                });
            } else {
                this.redis = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                    password: process.env.REDIS_PASSWORD || null,
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3
                });
            }

            await this.redis.ping();
            this.isConnected = true;
            console.log(`${colors.success}✅ [Redis연결] 연결 성공!${colors.reset}`);
            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [Redis연결] 실패: ${error.message}${colors.reset}`);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 🔍 새로 추가된 키 범위만 정확히 찾기
     */
    async findNewKeyRanges() {
        try {
            console.log(`${colors.info}🔍 [범위찾기] 새로 추가된 Threads 기억 범위 확인...${colors.reset}`);

            // 🎯 정확한 범위 설정 (로그에서 확인된 범위)
            this.stats.newFixedStart = 1754129187231;
            this.stats.newFixedEnd = 1754129187256;
            this.stats.newLoveStart = 1754129187652;
            this.stats.newLoveEnd = 1754129187670;

            console.log(`${colors.fixed}📝 [Fixed범위] ${this.stats.newFixedStart} ~ ${this.stats.newFixedEnd} (${this.stats.newFixedEnd - this.stats.newFixedStart + 1}개)${colors.reset}`);
            console.log(`${colors.love}❤️ [Love범위] ${this.stats.newLoveStart} ~ ${this.stats.newLoveEnd} (${this.stats.newLoveEnd - this.stats.newLoveStart + 1}개)${colors.reset}`);

            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [범위찾기] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 🛡️ 단일 키 안전 검증
     */
    async safeVerifyKey(key) {
        try {
            // 1단계: 키 존재 확인
            const exists = await this.redis.exists(key);
            if (!exists) {
                return { success: false, reason: 'key_not_exists', key };
            }

            // 2단계: 키 타입 확인
            const keyType = await this.redis.type(key);
            if (keyType !== 'hash') {
                return { success: false, reason: 'wrong_type', key, type: keyType };
            }

            // 3단계: hash 데이터 안전 조회
            const data = await this.redis.hgetall(key);
            if (!data || !data.content) {
                return { success: false, reason: 'no_content', key };
            }

            // 4단계: 내용 검증
            const hasValidContent = data.content.length > 10;
            const hasKeywords = data.keywords && data.keywords.length > 0;
            const hasSource = data.source === 'threads_migration';

            return {
                success: true,
                key,
                data,
                validation: {
                    hasValidContent,
                    hasKeywords,
                    hasSource,
                    contentLength: data.content.length
                }
            };

        } catch (error) {
            this.stats.errors++;
            return { success: false, reason: 'redis_error', key, error: error.message };
        }
    }

    /**
     * 🔒 새로 추가된 Fixed 기억만 안전 검증
     */
    async verifyNewFixedMemories() {
        console.log(`${colors.fixed}📝 [Fixed검증] 새로 추가된 Fixed 기억 안전 검증...${colors.reset}`);

        let verified = 0;
        let errors = 0;

        for (let id = this.stats.newFixedStart; id <= this.stats.newFixedEnd; id++) {
            const key = `muku:memory:fixed:${id}`;
            
            try {
                const result = await this.safeVerifyKey(key);
                
                if (result.success) {
                    verified++;
                    this.stats.verifiedFixed++;
                    
                    // 샘플 출력 (처음 3개만)
                    if (verified <= 3) {
                        console.log(`${colors.success}  ✅ [Fixed${id}] "${result.data.content.substring(0, 40)}..." (${result.data.content.length}자)${colors.reset}`);
                    }
                } else {
                    errors++;
                    if (result.reason !== 'key_not_exists') {
                        console.log(`${colors.warning}  ⚠️ [Fixed${id}] ${result.reason}${colors.reset}`);
                    }
                }

            } catch (error) {
                errors++;
                console.log(`${colors.warning}  ❌ [Fixed${id}] 검증 에러: ${error.message}${colors.reset}`);
                continue;
            }
        }

        this.stats.newFixedFound = verified;
        console.log(`${colors.fixed}📊 [Fixed결과] 성공: ${verified}개, 에러: ${errors}개${colors.reset}`);
        
        return verified > 0;
    }

    /**
     * 🔒 새로 추가된 Love 기억만 안전 검증
     */
    async verifyNewLoveMemories() {
        console.log(`${colors.love}❤️ [Love검증] 새로 추가된 Love 기억 안전 검증...${colors.reset}`);

        let verified = 0;
        let errors = 0;

        for (let id = this.stats.newLoveStart; id <= this.stats.newLoveEnd; id++) {
            const key = `muku:memory:love:${id}`;
            
            try {
                const result = await this.safeVerifyKey(key);
                
                if (result.success) {
                    verified++;
                    this.stats.verifiedLove++;
                    
                    // 샘플 출력 (처음 3개만)
                    if (verified <= 3) {
                        console.log(`${colors.success}  ✅ [Love${id}] "${result.data.content.substring(0, 40)}..." (${result.data.content.length}자)${colors.reset}`);
                    }

                    // 특별한 기억 찾기 (생일, 아저씨 등)
                    if (result.data.content.includes('생일') || result.data.content.includes('아저씨')) {
                        console.log(`${colors.love}  💖 [특별기억] ${result.data.content.includes('생일') ? '생일' : '아저씨'} 관련 기억 확인됨!${colors.reset}`);
                    }
                } else {
                    errors++;
                    if (result.reason !== 'key_not_exists') {
                        console.log(`${colors.warning}  ⚠️ [Love${id}] ${result.reason}${colors.reset}`);
                    }
                }

            } catch (error) {
                errors++;
                console.log(`${colors.warning}  ❌ [Love${id}] 검증 에러: ${error.message}${colors.reset}`);
                continue;
            }
        }

        this.stats.newLoveFound = verified;
        console.log(`${colors.love}📊 [Love결과] 성공: ${verified}개, 에러: ${errors}개${colors.reset}`);
        
        return verified > 0;
    }

    /**
     * 🧪 안전한 키워드 검색 테스트
     */
    async safeKeywordTest() {
        console.log(`${colors.memory}🧪 [키워드테스트] 새로 추가된 기억 키워드 검색...${colors.reset}`);

        const testKeywords = ['생일', '아저씨', '밤바', '다이어트', '엄마'];
        
        for (const keyword of testKeywords) {
            console.log(`${colors.info}🔍 "${keyword}" 검색...${colors.reset}`);
            
            let foundCount = 0;
            
            // Fixed 기억에서 검색 (새로 추가된 것만)
            for (let id = this.stats.newFixedStart; id <= this.stats.newFixedEnd; id++) {
                const key = `muku:memory:fixed:${id}`;
                
                try {
                    const result = await this.safeVerifyKey(key);
                    if (result.success && result.data.content.includes(keyword)) {
                        foundCount++;
                        if (foundCount === 1) {
                            console.log(`${colors.success}  ✅ [Fixed${id}] "${result.data.content.substring(0, 40)}..."${colors.reset}`);
                        }
                    }
                } catch (error) {
                    continue;
                }
            }

            // Love 기억에서 검색 (새로 추가된 것만)
            for (let id = this.stats.newLoveStart; id <= this.stats.newLoveEnd; id++) {
                const key = `muku:memory:love:${id}`;
                
                try {
                    const result = await this.safeVerifyKey(key);
                    if (result.success && result.data.content.includes(keyword)) {
                        foundCount++;
                        if (foundCount <= 2) {
                            console.log(`${colors.success}  ✅ [Love${id}] "${result.data.content.substring(0, 40)}..."${colors.reset}`);
                        }
                    }
                } catch (error) {
                    continue;
                }
            }

            console.log(`${colors.info}📊 "${keyword}" 총 ${foundCount}개 발견${colors.reset}`);
        }

        return true;
    }

    /**
     * 📊 안전한 검증 보고서
     */
    generateSafeReport() {
        const duration = Date.now() - this.stats.startTime;
        
        const report = `
${colors.safe}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 예진이 Threads 기억 안전 검증 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}📊 검증 결과:${colors.reset}
${colors.fixed}   • Fixed 기억: ${this.stats.verifiedFixed}개 검증 완료${colors.reset}
${colors.love}   • Love 기억: ${this.stats.verifiedLove}개 검증 완료${colors.reset}
${colors.info}   • 총 검증: ${this.stats.verifiedFixed + this.stats.verifiedLove}개${colors.reset}
${colors.info}   • 검증 시간: ${duration}ms${colors.reset}
${colors.warning}   • 에러 발생: ${this.stats.errors}개 (모두 안전하게 처리됨)${colors.reset}

${colors.memory}🎯 검증 범위 (새로 추가된 것만):${colors.reset}
${colors.fixed}   • Fixed: muku:memory:fixed:${this.stats.newFixedStart} ~ ${this.stats.newFixedEnd}${colors.reset}
${colors.love}   • Love: muku:memory:love:${this.stats.newLoveStart} ~ ${this.stats.newLoveEnd}${colors.reset}

${colors.success}✅ 무쿠에게 다음과 같이 물어보세요:${colors.reset}
${colors.info}   • "생일 기억해?"${colors.reset}
${colors.info}   • "아저씨 기억해?"${colors.reset}
${colors.info}   • "밤바 기억해?"${colors.reset}
${colors.info}   • "엄마 여행 기억해?"${colors.reset}
${colors.info}   • "우산 기억해?"${colors.reset}

${colors.safe}🛡️ 모든 검증이 안전하게 완료되었습니다!${colors.reset}
${colors.safe}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
        `;

        console.log(report);
        return report;
    }

    /**
     * 🔌 안전한 연결 해제
     */
    async safeDisconnect() {
        if (this.redis && this.isConnected) {
            try {
                await this.redis.quit();
                this.isConnected = false;
                console.log(`${colors.redis}🔌 Redis 연결 안전하게 해제됨${colors.reset}`);
            } catch (error) {
                console.log(`${colors.warning}⚠️ 연결 해제 중 에러 (무시됨): ${error.message}${colors.reset}`);
            }
        }
    }
}

/**
 * 🚀 안전한 검증 메인 함수
 */
async function runSafeThreadsVerification() {
    const verifier = new SafeThreadsVerifier();
    
    try {
        console.log(`${colors.safe}🔒 예진이 Threads 기억 안전 검증 시작!${colors.reset}`);
        verifier.stats.startTime = Date.now();

        // 1단계: Redis 연결
        const connected = await verifier.initializeRedis();
        if (!connected) {
            console.error(`${colors.warning}❌ Redis 연결 실패${colors.reset}`);
            return false;
        }

        // 2단계: 새로 추가된 키 범위 설정
        const rangeFound = await verifier.findNewKeyRanges();
        if (!rangeFound) {
            console.error(`${colors.warning}❌ 키 범위 설정 실패${colors.reset}`);
            return false;
        }

        // 3단계: 새로 추가된 Fixed 기억 검증
        const fixedOk = await verifier.verifyNewFixedMemories();
        
        // 4단계: 새로 추가된 Love 기억 검증
        const loveOk = await verifier.verifyNewLoveMemories();

        // 5단계: 키워드 검색 테스트
        await verifier.safeKeywordTest();

        // 6단계: 최종 보고서
        verifier.generateSafeReport();

        // 7단계: 안전한 연결 해제
        await verifier.safeDisconnect();

        const success = fixedOk && loveOk;
        if (success) {
            console.log(`${colors.success}🎉 안전한 검증 완료! 예진이 기억들이 정상적으로 저장되어 있습니다.${colors.reset}`);
        } else {
            console.log(`${colors.warning}⚠️ 일부 검증에서 문제가 발견되었지만 안전하게 처리되었습니다.${colors.reset}`);
        }

        return success;

    } catch (error) {
        console.error(`${colors.warning}❌ 검증 중 예외 발생: ${error.message}${colors.reset}`);
        await verifier.safeDisconnect();
        return false;
    }
}

// 📤 모듈 내보내기
module.exports = {
    SafeThreadsVerifier,
    runSafeThreadsVerification
};

// 직접 실행 시
if (require.main === module) {
    runSafeThreadsVerification()
        .then(success => {
            if (success) {
                console.log(`${colors.success}✅ 안전한 검증 성공!${colors.reset}`);
                process.exit(0);
            } else {
                console.log(`${colors.warning}⚠️ 검증에서 일부 문제 발견 (안전하게 처리됨)${colors.reset}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error(`${colors.warning}❌ 실행 오류: ${error.message}${colors.reset}`);
            process.exit(1);
        });
}

console.log(`
${colors.safe}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 안전한 예진이 Threads 기억 검증 스크립트 v2.0 로드 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}🚀 실행: node 파일명.js${colors.reset}
${colors.info}📝 또는: const { runSafeThreadsVerification } = require('./파일명.js');${colors.reset}

${colors.safe}🛡️ 완전히 안전한 검증: 기존 키는 건드리지 않고 새로 추가된 것만 검증!${colors.reset}
`);
