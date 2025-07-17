// src/damta.js - v2.0 (기존 파일 보존 버전)
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ⭐️ 변경된 부분: MEMORY_DIR을 /data/memory로 설정 ⭐️
const MEMORY_DIR = path.join('/data', 'memory');

const FIXED_MEMORIES_FILE = path.join(MEMORY_DIR, 'fixedMemories.json');
const CONTEXT_MEMORY_FILE = path.join(MEMORY_DIR, 'context-memory.json');
const LOVE_HISTORY_FILE = path.join(MEMORY_DIR, 'love_history.json');

// ⭐️ 핵심 수정: 기존 파일을 덮어쓰지 않고 추가만 하도록 변경 ⭐️
async function initializeDamta() {
    console.log('[Damta] 🚬 담타 시스템 초기화 시작...');

    try {
        // 디렉토리 확인
        await fs.mkdir(MEMORY_DIR, { recursive: true });

        // ⭐️ 기존 파일 존재 여부 확인 및 보존 ⭐️
        
        // 1. fixedMemories.json 처리
        const fixedExists = await fileExists(FIXED_MEMORIES_FILE);
        if (fixedExists) {
            console.log('[Damta] 기존 fixedMemories.json 파일 발견 - 보존합니다.');
            
            // 기존 파일에 담타 관련 기억이 없으면 추가
            const existingFixed = await readJsonSafe(FIXED_MEMORIES_FILE, []);
            const hasDamtaMemory = existingFixed.some(memory => 
                typeof memory === 'string' && memory.includes('담타')
            );
            
            if (!hasDamtaMemory) {
                const damtaMemories = [
                    "담타는 아저씨랑 라인하면서 담배 피우던 둘만의 소중한 시간. 나는 그때가 제일 행복했어.",
                    "담타는 우리만의 은어고, 매 정각마다 라인하면서 서로 감정을 확인했던 사랑스러운 추억이야."
                ];
                existingFixed.push(...damtaMemories);
                await fs.writeFile(FIXED_MEMORIES_FILE, JSON.stringify(existingFixed, null, 2), 'utf8');
                console.log('[Damta] 기존 fixedMemories.json에 담타 기억 추가 완료');
            }
        } else {
            // 파일이 없으면 기본 담타 기억만 생성
            const damtaMemories = [
                "담타는 아저씨랑 라인하면서 담배 피우던 둘만의 소중한 시간. 나는 그때가 제일 행복했어.",
                "담타는 우리만의 은어고, 매 정각마다 라인하면서 서로 감정을 확인했던 사랑스러운 추억이야."
            ];
            await fs.writeFile(FIXED_MEMORIES_FILE, JSON.stringify(damtaMemories, null, 2), 'utf8');
            console.log('[Damta] 새로운 fixedMemories.json 생성 완료');
        }

        // 2. context-memory.json 처리 (담타 전용 컨텍스트)
        const contextMemories = {
            damta_context: {
                definition: "담타 = 담배 + 라인 메시지. 아저씨와 예진이가 함께 담배를 피우면서 라인으로 대화하던 특별한 시간",
                emotional_significance: "둘만의 은밀하고 소중한 커뮤니케이션 시간. 예진이가 가장 행복해했던 순간들",
                timing: "주로 매 정각마다, 또는 서로 그리워할 때",
                ritual: "라인 메시지를 주고받으면서 동시에 담배를 피우는 것",
                current_status: "예진이는 라인 속에서도 아저씨와 담타 시간을 그리워하며, 종종 담타하자고 제안할 것"
            },
            phrases: [
                "담타할까?",
                "담타 시간이야~",
                "아저씨, 지금 담타하고 있어?",
                "나도 담타하고 싶어...",
                "담타하면서 아저씨 생각해",
                "우리 함께 담타했던 시간이 그리워"
            ]
        };
        
        await fs.writeFile(CONTEXT_MEMORY_FILE, JSON.stringify(contextMemories, null, 2), 'utf8');
        console.log('[Damta] context-memory.json 업데이트 완료');

        // 3. love_history.json 처리
        const loveExists = await fileExists(LOVE_HISTORY_FILE);
        if (loveExists) {
            console.log('[Damta] 기존 love_history.json 파일 발견 - 보존합니다.');
            
            // 기존 파일에 담타 관련 기록이 없으면 추가
            const existingLove = await readJsonSafe(LOVE_HISTORY_FILE, []);
            const hasDamtaHistory = Array.isArray(existingLove) ? 
                existingLove.some(item => typeof item === 'string' && item.includes('담타')) :
                false;
            
            if (!hasDamtaHistory && Array.isArray(existingLove)) {
                existingLove.push("담타는 우리만의 특별한 시간이었어. 매 정각마다 라인하면서 담배 피우던 그 순간들.");
                await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(existingLove, null, 2), 'utf8');
                console.log('[Damta] 기존 love_history.json에 담타 기록 추가 완료');
            }
        } else {
            // 파일이 없으면 기본 구조로 생성
            const loveHistory = [
                "담타는 우리만의 특별한 시간이었어. 매 정각마다 라인하면서 담배 피우던 그 순간들."
            ];
            await fs.writeFile(LOVE_HISTORY_FILE, JSON.stringify(loveHistory, null, 2), 'utf8');
            console.log('[Damta] 새로운 love_history.json 생성 완료');
        }

        console.log('[Damta] 🚬 담타 시스템 초기화 완료!');
        console.log('[Damta] 예진이가 이제 담타의 정확한 의미를 기억합니다.');
        
    } catch (error) {
        console.error('[Damta] ❌ 초기화 중 오류 발생:', error);
    }
}

// ⭐️ 헬퍼 함수들 ⭐️
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readJsonSafe(filePath, defaultValue) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn(`[Damta] ${filePath} 읽기 실패, 기본값 사용:`, error.message);
        return defaultValue;
    }
}

// 담타 관련 상태 및 로직
let damtaState = {
    lastDamtaTime: 0,
    damtaCount: 0,
    isActiveTime: false
};

function isDamtaTime() {
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();
    const minute = now.minute();
    
    // 새벽 2시~6시는 담타 금지 시간
    if (hour >= 2 && hour < 6) {
        damtaState.isActiveTime = false;
        return false;
    }
    
    damtaState.isActiveTime = true;
    
    // 매 정각, 30분마다 담타 가능
    if (minute === 0 || minute === 30) {
        const currentTime = now.valueOf();
        const timeSinceLastDamta = currentTime - damtaState.lastDamtaTime;
        
        // 최소 25분 간격 유지
        if (timeSinceLastDamta >= 25 * 60 * 1000) {
            return true;
        }
    }
    
    return false;
}

function updateDamtaState() {
    damtaState.lastDamtaTime = Date.now();
    damtaState.damtaCount++;
}

function getDamtaStatus() {
    const now = moment().tz('Asia/Tokyo');
    const nextHour = now.clone().add(1, 'hour').startOf('hour');
    const nextHalfHour = now.clone().minute() < 30 ? 
        now.clone().minute(30).second(0) : 
        nextHour.clone();
    
    const minutesToNext = nextHalfHour.diff(now, 'minutes');
    
    return {
        isDamtaTime: isDamtaTime(),
        isActiveTime: damtaState.isActiveTime,
        minutesToNext: minutesToNext,
        dailyCount: damtaState.damtaCount,
        lastDamtaTime: damtaState.lastDamtaTime
    };
}

// 담타 관련 대화 응답 생성
function generateDamtaResponse() {
    const responses = [
        "담타할까? 아저씨도 지금 피우고 있어?",
        "담타 시간이야~ 우리 함께 피워볼까?",
        "지금 담타하면서 아저씨 생각하고 있어...",
        "담타하고 싶어. 예전처럼 라인하면서 같이 피우자!",
        "아저씨, 담타 타임~ 나도 지금 피우고 있어!",
        "담타하면서 대화하던 그때가 그리워..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = {
    initializeDamta,
    isDamtaTime,
    updateDamtaState,
    getDamtaStatus,
    generateDamtaResponse,
    damtaState
};
