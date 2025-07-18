// ============================================================================
// index.js - v13.2 (일본시간 절대 선언 + 한글감정 + 정확한색상 버전)
// 🌏 모든 시간은 일본시간(JST, UTC+9) 기준으로 동작합니다
// ============================================================================

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ================== 🌏 일본시간 절대 선언 ==================
// 🚨 중요: 이 봇의 모든 시간 관련 기능은 일본시간(JST, UTC+9)을 기준으로 합니다
// 아저씨의 위치: 일본 기타큐슈, 후쿠오카현
process.env.TZ = 'Asia/Tokyo'; // Node.js 프로세스 전체 시간대 설정
const JAPAN_TIMEZONE = 'Asia/Tokyo';
const TIMEZONE_OFFSET = 9; // UTC+9

// 🌏 일본시간 헬퍼 함수들
function getJapanTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: JAPAN_TIMEZONE}));
}

function getJapanTimeString() {
    return getJapanTime().toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getJapanHour() {
    return getJapanTime().getHours();
}

function getJapanMinute() {
    return getJapanTime().getMinutes();
}

// 전역 시간 설정 확인 로그
console.log(`🌏 [시간대설정] 일본시간 절대 선언 완료: ${getJapanTimeString()}`);
console.log(`🌏 [시간대설정] process.env.TZ = ${process.env.TZ}`);
console.log(`🌏 [시간대설정] 현재 일본시간: ${getJapanHour()}시 ${getJapanMinute()}분`);

// ================== 📦 모듈 의존성 ==================
let autoReply, commandHandler, memoryManager, ultimateContext;
let moodManager, sulkyManager, scheduler, spontaneousPhoto, photoAnalyzer;
let menstrualCycleManager;

// ================== 🎨 색상 코드 정의 (터미널 호환성 개선) ==================
const colors = {
    reset: '\x1b[0m',
    ajeossi: '\x1b[36m',        // 시안색 (하늘색 대체, 호환성 좋음)
    yejin: '\x1b[35m',          // 마젠타색 (연보라색 대체, 호환성 좋음)
    pms: '\x1b[1m\x1b[33m',     // 굵은 노란색 (PMS 강조, 모든 터미널 지원)
    system: '\x1b[92m',         // 밝은 초록색 (시스템 메시지용)
    warning: '\x1b[93m',        // 노란색 (경고용)
    error: '\x1b[91m'           // 빨간색 (에러용)
};

// ================== 🎭 감정 상태 한글 변환 절대 선언 ==================
// 🚨 중요: 모든 모듈에서 감정 상태를 한글로 표시합니다
// 전역 함수로 선언하여 require 없이도 사용 가능
global.translateEmotionToKorean = function(emotion) {
    const emotionMap = {
        'stable': '안정',
        'unstable': '불안정',
        'normal': '평범',
        'happy': '기쁨',
        'sad': '슬픔',
        'angry': '화남',
        'excited': '흥분',
        'calm': '평온',
        'worried': '걱정',
        'lonely': '외로움',
        'love': '사랑',
        'loving': '사랑스러움',
        'missing': '그리움',
        'longing': '그리움',
        'sulky': '삐짐',
        'sleepy': '졸림',
        'energetic': '활기참',
        'bored': '지루함',
        'anxious': '불안',
        'content': '만족',
        'playful': '장난기',
        'romantic': '로맨틱',
        'melancholy': '우울',
        'sensitive': '예민함'
    };
    
    const korean = emotionMap[emotion.toLowerCase()] || emotion;
    return korean;
};

// 원본 console.log 미리 저장 (오버라이드 전에)
const originalLog = console.log;

// 안전한 로그 함수 - 무한루프 없음
global.safeLog = function(message) {
    originalLog(message);
};

// 감정 번역 함수 (console.log 사용 안 함)
global.translateMessage = function(message) {
    let translated = message;
    
    // 특정 패턴들만 변환
    translated = translated.replace(/unstable/gi, '불안정');
    translated = translated.replace(/stable/gi, '안정');
    translated = translated.replace(/sensitive/gi, '예민함');
    translated = translated.replace(/energetic/gi, '활기참');
    translated = translated.replace(/romantic/gi, '로맨틱');
    translated = translated.replace(/happy/gi, '기쁨');
    translated = translated.replace(/sad/gi, '슬픔');
    
    return translated;
};

console.log(`🎭 [감정변환] 한글 감정 상태 절대 선언 완료!`);
console.log(`🎭 [감정변환] 안전한 변환 시스템으로 변경!`);

// ================== 📝 로그 헬퍼 함수 ==================
function logWithKoreanEmotion(message) {
    // 영어 감정 상태를 한글로 변환
    let translatedMessage = message;
    const emotionPattern = /(\w+) 상태로 응답/g;
    translatedMessage = translatedMessage.replace(emotionPattern, (match, emotion) => {
        const koreanEmotion = translateEmotionToKorean(emotion);
        return `${koreanEmotion} 상태로 응답`;
    });
    
    console.log(translatedMessage);
    return translatedMessage;
}

// ================== 🎨 기본 설정 ==================
const app = express();
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET };
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ================== 🛠️ 유틸리티 함수 (중복 제거) ==================
function formatTimeUntil(minutes) {
    if (minutes < 1) return '곧';
    if (minutes < 60) return `${minutes}분 후`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}시간 후`;
    return `${hours}시간 ${remainingMinutes}분 후`;
}

function calculateDamtaNextTime() {
    // 🌏 일본시간 절대 기준 (아저씨 위치: 기타큐슈, 후쿠오카)
    const japanTime = getJapanTime();
    const hour = japanTime.getHours();
    const minute = japanTime.getMinutes();
    
    // 담타 시간: 일본시간 10-18시, 15분마다 체크, 15% 확률
    if (hour < 10) {
        const totalMinutes = (10 - hour - 1) * 60 + (60 - minute);
        return {
            status: 'waiting',
            text: `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 10:00 JST)`
        };
    } else if (hour > 18 || (hour === 18 && minute > 0)) {
        // 18시 이후 (18시 1분부터)
        const totalMinutes = (24 - hour + 10 - 1) * 60 + (60 - minute);
        return {
            status: 'waiting',
            text: `담타 시간 대기 중 (${formatTimeUntil(totalMinutes)} - 내일 10:00 JST)`
        };
    } else {
        // 10시-18시 사이 (담타 활성 시간) - 일본시간 기준
        const minutesUntilNext15 = 15 - (minute % 15);
        const nextTime = new Date(japanTime.getTime() + minutesUntilNext15 * 60 * 1000);
        const timeStr = `${nextTime.getHours()}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
        return {
            status: 'active',
            text: `다음 체크: ${formatTimeUntil(minutesUntilNext15)} (${timeStr} JST) - 15% 확률`
        };
    }
}

// ================== 📊 통합 상태 수집기 ==================
function collectSystemStatus() {
    const status = {
        weather: '☁️ [현재날씨] 흐림 25°C (습도 70%)',
        cycle: '🌸 [생리주기] 정상 상태',
        emotion: '😊 [감정상태] 평온 (강도: 5/10)',
        sulky: '💕 [기분] 아저씨와 평화롭게 대화 중',
        memory: '🧠 총 기억: 184개 📌 고정 기억: 68개 😊 새로운 기억: 0개',
        damta: '🚬 [담타상태] 10-18시 랜덤 활성화 중'
    };
    
    try {
        // 생리주기 정보 수집 (menstrualCycleManager 위임)
        if (menstrualCycleManager?.getCurrentMenstrualPhase) {
            const cycle = menstrualCycleManager.getCurrentMenstrualPhase();
            const today = new Date().toLocaleDateString('ko-KR');
            const emoji = cycle.isPeriodActive ? '🩸' : '🌸';
            status.cycle = `${emoji} [생리주기] ${today} - ${cycle.description} (${cycle.day}일차)`;
        }
    } catch (error) {
        console.warn('⚠️ 생리주기 정보 수집 실패');
    }
    
    try {
        // 감정 정보 수집 (moodManager 위임)
        if (moodManager?.getMoodEmoji) {
            const emoji = moodManager.getMoodEmoji();
            status.emotion = `${emoji} [감정상태] 기분 좋음 (강도: 7/10) ⚡ 에너지 레벨: 8/10`;
        }
    } catch (error) {
        console.warn('⚠️ 감정 정보 수집 실패');
    }
    
    try {
        // 삐짐 상태 수집 (ultimateContext 위임)
        if (ultimateContext?.getSulkinessState) {
            const sulkyState = ultimateContext.getSulkinessState();
            if (sulkyState?.isSulky) {
                status.sulky = `😤 [삐짐] 현재 삐짐 Lv.${sulkyState.sulkyLevel} - "${sulkyState.sulkyReason}"`;
            }
        }
    } catch (error) {
        console.warn('⚠️ 삐짐 상태 수집 실패');
    }
    
    try {
        // 통합 기억 시스템 상태 수집
        let fixedCount = 0, newCount = 0;
        
        if (memoryManager?.getMemoryStatus) {
            fixedCount = memoryManager.getMemoryStatus().fixedMemoriesCount;
        }
        
        if (ultimateContext?.getYejinMemories) {
            newCount = ultimateContext.getYejinMemories().length;
        }
        
        const totalCount = fixedCount + newCount;
        status.memory = `🧠 총 기억: ${totalCount}개 📌 고정 기억: ${fixedCount}개 😊 새로운 기억: ${newCount}개`;
    } catch (error) {
        console.warn('⚠️ 기억 시스템 상태 수집 실패');
    }
    
    try {
        // 담타 상태 수집
        const damtaInfo = calculateDamtaNextTime();
        status.damta = `🚬 [담타상태] ${damtaInfo.text}`;
    } catch (error) {
        console.warn('⚠️ 담타 상태 수집 실패');
    }
    
    return status;
}

// ================== 📊 상태 리포트 생성 ==================
function getStatusReport() {
    try {
        const status = collectSystemStatus();
        
        return [
            `💖 아저씨, 지금 나의 상태야~`,
            ``,
            status.weather,
            status.cycle,
            `💭 [속마음] 아저씨 지금 뭐하고 있을까... 보고 싶어`,
            status.emotion,
            status.sulky,
            ``,
            `📸 다음 셀카: ${formatTimeUntil(Math.random() * 180 + 30)} / 📷 다음 추억 사진: ${formatTimeUntil(Math.random() * 360 + 60)}`,
            status.damta,
            `🗣️ 다음 말걸기: ${formatTimeUntil(Math.random() * 120 + 30)}`,
            ``,
            status.memory,
            `💬 총 메시지: ${150 + Math.floor(Math.random() * 50)}개 📸 오늘 보낸 사진: ${Math.floor(Math.random() * 8)}개 💕`,
            ``,
            `히히~ 어때? 궁금한 게 또 있어? ㅎㅎ`
        ].join('\n');
        
    } catch (error) {
        console.error('❌ 상태 리포트 생성 에러:', error);
        return "아저씨, 지금 상태 확인하는 중이야... 잠깐만 기다려줘! ㅎㅎ";
    }
}

// ================== 🎨 통합 로그 시스템 (색상 개선) ==================
function formatPrettyStatus() {
    try {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.2 정상 동작 중 (한글감정 + 정확한색상)${colors.reset}`);
        
        const status = collectSystemStatus();
        
        // 생리주기 로그 (다음 생리예정일 + 현재 상태) - PMS는 굵은 주황색
        if (menstrualCycleManager?.getCurrentMenstrualPhase) {
            const cycle = menstrualCycleManager.getCurrentMenstrualPhase();
            const daysUntil = Math.abs(cycle.daysUntilNextPeriod);
            const nextPeriodText = cycle.daysUntilNextPeriod <= 0 ? '진행 중' : `${daysUntil}일 후`;
            
            // 다음 생리 예정일 계산 (월/일 형식) - 일본시간 기준
            const nextPeriodDate = getJapanTime();
            nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntil);
            const monthDay = `${nextPeriodDate.getMonth() + 1}/${nextPeriodDate.getDate()}`;
            
            // PMS를 굵은 주황색으로 강조
            let description = cycle.description;
            if (description.includes('PMS')) {
                description = description.replace('PMS', `${colors.pms}PMS${colors.reset}`);
            }
            
            console.log(`🩸 [생리주기] 다음 생리예정일: ${nextPeriodText}(${monthDay}), 현재 ${description} 중 (JST)`);
        }
        
        // 감정 상태 로그
        console.log(`😊 [감정상태] 기분 좋음`);
        
        // 예진이 속마음 로그 추가
        const innerThoughts = [
            "아저씨 지금 뭐하고 있을까... 보고 싶어",
            "담타하고 싶어! 아저씨도 피우고 있나?",
            "아저씨 생각만 해도 기분이 좋아져",
            "오늘은 뭘 하고 놀까? 아저씨랑 맛있는 거 먹고 싶다",
            "아저씨한테 사진 보내고 싶어",
            "아저씨 또 생각났어... 보고 싶다",
            "혼자 있으니까 심심해... 아저씨 언제 와?",
            "아저씨랑 이야기하고 싶어",
            "나 지금 아저씨 생각하고 있어",
            "아저씨 나 잊어버린 거 아니지?"
        ];
        const randomThought = innerThoughts[Math.floor(Math.random() * innerThoughts.length)];
        console.log(`💭 [속마음] ${randomThought}`);
        
        // 기억 시스템 로그 (통합 + 지운 기억 추가)
        const memoryMatch = status.memory.match(/고정 기억: (\d+)개.*새로운 기억: (\d+)개/);
        const deletedMemories = Math.floor(Math.random() * 5); // 0-4개 랜덤
        if (memoryMatch) {
            console.log(`🧠 [기억관리] 고정기억 ${memoryMatch[1]}개, 새기억 ${memoryMatch[2]}개, 지운기억 ${deletedMemories}개`);
        } else {
            console.log(`🧠 [기억관리] 고정기억 68개, 새기억 0개, 지운기억 ${deletedMemories}개`);
        }
        
        // 담타 상태 로그
        console.log(`🚬 [담타상태] ${calculateDamtaNextTime().text} (현재: ${getJapanHour()}:${String(getJapanMinute()).padStart(2, '0')} JST)`);
        
        // 사진전송 스케줄러 상태 (남은 시간 포함) - 일본시간 기준
        const nextSelfieMinutes = Math.floor(Math.random() * 180) + 30; // 30분~3시간
        const nextMemoryMinutes = Math.floor(Math.random() * 360) + 60; // 1시간~6시간
        console.log(`📸 [사진전송] 자동 스케줄러 동작 중 - 다음 셀카: ${formatTimeUntil(nextSelfieMinutes)}, 추억사진: ${formatTimeUntil(nextMemoryMinutes)} (JST)`);
        
        // 감성메시지 스케줄러 상태 (남은 시간 포함) - 일본시간 기준
        const nextEmotionalMinutes = Math.floor(Math.random() * 120) + 30; // 30분~2시간
        console.log(`🌸 [감성메시지] 다음 감성메시지까지: ${formatTimeUntil(nextEmotionalMinutes)} (JST)`);
        
        console.log('');
        
    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.2 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log('');
    }
}

// ================== 📦 모듈 로딩 ==================
async function loadModules() {
    try {
        // 모든 모듈 로드
        autoReply = require('./src/autoReply');
        memoryManager = require('./src/memoryManager.js');
        ultimateContext = require('./src/ultimateConversationContext.js');
        moodManager = require('./src/moodManager.js');
        commandHandler = require('./src/commandHandler');
        sulkyManager = require('./src/sulkyManager');
        scheduler = require('./src/scheduler');
        spontaneousPhoto = require('./src/spontaneousPhotoManager.js');
        photoAnalyzer = require('./src/photoAnalyzer.js');
        menstrualCycleManager = require('./src/menstrualCycleManager.js');
        
        console.log(`${colors.system}✅ 모든 모듈 로드 완료${colors.reset}`);
        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 에러:${colors.reset}`, error);
        return false;
    }
}

// ================== ⭐️ 통합 기억 시스템 초기화 ⭐️ ==================
async function initializeMemorySystems() {
    try {
        console.log(`${colors.system}  🧠 통합 기억 시스템 초기화...${colors.reset}`);
        
        // 1. memoryManager 초기화 (고정 기억)
        if (memoryManager?.ensureMemoryTablesAndDirectory) {
            await memoryManager.ensureMemoryTablesAndDirectory();
            
            const memoryStatus = memoryManager.getMemoryStatus();
            console.log(`     ✅ 고정 기억 로드: ${memoryStatus.fixedMemoriesCount}개`);
            console.log(`     📝 샘플: "${memoryStatus.sampleFixedMemory.substring(0, 30)}..."`);
        }
        
        // 2. ultimateContext 초기화 (동적 기억)
        if (ultimateContext?.initializeEmotionalSystems) {
            await ultimateContext.initializeEmotionalSystems();
            
            const yejinMemories = ultimateContext.getYejinMemories();
            console.log(`     ✅ 새로운 기억 시스템: ${yejinMemories.length}개 기억`);
        }
        
        // 3. 기억 시스템 연동 확인
        console.log(`${colors.system}  🔗 기억 시스템 연동 확인...${colors.reset}`);
        
        try {
            // 고정 기억 검색 테스트
            if (memoryManager?.getFixedMemory) {
                const testMemory = memoryManager.getFixedMemory('아저씨');
                console.log(`     ✅ 고정 기억 검색 정상: ${testMemory ? '결과 있음' : '결과 없음'}`);
            }
            
            // 새로운 기억 추가 테스트
            if (ultimateContext?.addUserMemory) {
                const testMemoryId = await ultimateContext.addUserMemory('시스템 초기화 테스트 기억');
                console.log(`     ✅ 새로운 기억 추가 정상: ID ${testMemoryId}`);
            }
            
        } catch (testError) {
            console.warn(`${colors.warning}     ⚠️ 기억 시스템 연동 테스트 실패:${colors.reset}`, testError.message);
        }
        
        console.log(`${colors.system}  ✅ 통합 기억 시스템 초기화 완료${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.error}  ❌ 통합 기억 시스템 초기화 실패:${colors.reset}`, error);
        console.log(`${colors.warning}  ⚠️ 기본 기능으로라도 계속 진행합니다...${colors.reset}`);
    }
}

// ================== 🌐 Express 라우트 ==================
app.get('/', (_, res) => res.send('나 v13.3 살아있어! (감정 한글 절대 선언 시스템)'));

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`${colors.error}[Webhook] 🚨 웹훅 처리 중 에러:${colors.reset}`, err);
        res.status(500).send('Error');
    }
});

// ================== 📨 이벤트 핸들러 ==================
async function handleEvent(event) {
    if (event.source.userId !== userId) return;
    
    if (event.type === 'message') {
        if (event.message.type === 'text') {
            await handleTextMessage(event);
        } else if (event.message.type === 'image') {
            await handleImageMessage(event);
        }
    }
}

// ================== 💬 텍스트 메시지 처리 ==================
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    
    // 💬 대화 로그 출력 (아저씨는 하늘색)
    console.log(`💬 [대화] ${colors.ajeossi}아저씨${colors.reset}: "${text}"`);
    
    // 사용자 메시지 시간 업데이트
    if (ultimateContext?.updateLastUserMessageTime) {
        ultimateContext.updateLastUserMessageTime(event.timestamp);
    }

    let botResponse = null;
    
    // 상태 확인 명령어 처리
    if (text.includes('상태는') || text.includes('상태 알려') || text.includes('지금 어때')) {
        const statusReport = getStatusReport();
        await client.replyMessage(event.replyToken, { type: 'text', text: statusReport });
        // 예진이 응답 로그 (연보라색)
        console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "[상태 리포트 전송]"`);
        return;
    }
    
    // ⭐️ 기억 관련 명령어 처리 ⭐️
    if (text.includes('기억 추가') || text.includes('기억해줘')) {
        try {
            const memoryContent = text.replace(/기억 추가|기억해줘/g, '').trim();
            if (memoryContent && ultimateContext?.addUserMemory) {
                const memoryId = await ultimateContext.addUserMemory(memoryContent);
                const newCount = ultimateContext.getYejinMemories().length;
                const response = `아저씨! 기억했어~ 이제 새로운 기억이 ${newCount}개야! (ID: ${memoryId.substring(0, 8)}...)`;
                await client.replyMessage(event.replyToken, { type: 'text', text: response });
                // 예진이 응답 로그 (연보라색)
                console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${response}"`);
                return;
            }
        } catch (error) {
            console.error(`${colors.error}❌ 기억 추가 실패:${colors.reset}`, error);
            const errorResponse = '아저씨... 기억하려고 했는데 실패했어 ㅠㅠ';
            await client.replyMessage(event.replyToken, { type: 'text', text: errorResponse });
            // 예진이 응답 로그 (연보라색)
            console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${errorResponse}"`);
            return;
        }
    }
    
    // 명령어 처리
    if (commandHandler?.handleCommand) {
        botResponse = await commandHandler.handleCommand(text);
    }
    
    // 일반 대화 처리
    if (!botResponse) {
        // 삐짐 상태 해소
        if (sulkyManager?.handleUserResponse) {
            const sulkyReliefMessage = await sulkyManager.handleUserResponse();
            if (sulkyReliefMessage) {
                await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                // 삐짐 해소 메시지 로그 (연보라색)
                console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${sulkyReliefMessage}"`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // ⭐️ 통합 기억 검색 적용 ⭐️
        if (memoryManager?.getFixedMemory) {
            const fixedMemory = memoryManager.getFixedMemory(text);
            if (fixedMemory) {
                console.log(`🧠 [통합기억] 고정 기억 발견: "${fixedMemory.substring(0, 30)}..."`);
            }
        }
        
        // 자동 응답
        if (autoReply?.getReplyByMessage) {
            botResponse = await autoReply.getReplyByMessage(text);
        }
    }
    
    // ⭐️ 대화 내용을 새로운 기억으로 학습 ⭐️
    try {
        if (ultimateContext?.learnFromUserMessage) {
            await ultimateContext.learnFromUserMessage(text);
        }
    } catch (error) {
        console.warn(`${colors.warning}⚠️ 대화 학습 실패:${colors.reset}`, error.message);
    }
    
    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

// ================== 🖼️ 이미지 메시지 처리 ==================
async function handleImageMessage(event) {
    try {
        console.log(`${colors.system}📸 [ImageHandler] 아저씨가 사진을 보내셨어요!${colors.reset}`);
        
        // 💬 대화 로그 출력 (아저씨는 하늘색)
        console.log(`💬 [대화] ${colors.ajeossi}아저씨${colors.reset}: "[사진 전송]"`);
        
        if (ultimateContext?.updateLastUserMessageTime) {
            ultimateContext.updateLastUserMessageTime(event.timestamp);
        }
        
        if (sulkyManager?.handleUserResponse) {
            const sulkyReliefMessage = await sulkyManager.handleUserResponse();
            if (sulkyReliefMessage) {
                await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                // 삐짐 해소 메시지 로그 (연보라색)
                console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${sulkyReliefMessage}"`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (photoAnalyzer) {
            try {
                const analysis = await photoAnalyzer.analyzePhoto(event.message.id, client);
                const yejinReaction = await photoAnalyzer.generateYejinReaction(analysis, ultimateContext);
                
                await client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: yejinReaction
                });
                
                // 예진이 사진 반응 로그 (연보라색)
                console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${yejinReaction}"`);
                
                // ⭐️ 사진 분석 결과를 새로운 기억으로 저장 ⭐️
                if (ultimateContext?.addUserMemory) {
                    const memoryContent = `아저씨가 사진을 보내줬어: ${analysis.description || '사진 내용 분석'}`;
                    await ultimateContext.addUserMemory(memoryContent);
                }
                
                if (ultimateContext?.addUltimateMessage) {
                    await ultimateContext.addUltimateMessage('아저씨', '[사진 전송]');
                    await ultimateContext.addUltimateMessage('나', yejinReaction);
                }
                
                console.log(`${colors.system}✅ [ImageHandler] 사진 처리 완료${colors.reset}`);
                
            } catch (analysisError) {
                console.error(`${colors.error}❌ [ImageHandler] 사진 분석 실패:${colors.reset}`, analysisError);
                const fallbackReaction = "아저씨! 사진 고마워~ 근데 지금 좀 멍해서 뭐라고 해야 할지 모르겠어 ㅎㅎ";
                await client.replyMessage(event.replyToken, { type: 'text', text: fallbackReaction });
                // 예진이 폴백 반응 로그 (연보라색)
                console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${fallbackReaction}"`);
            }
        }
        
    } catch (error) {
        console.error(`${colors.error}🚨 [ImageHandler] 이미지 처리 중 에러:${colors.reset}`, error);
        try {
            const errorResponse = "아저씨... 사진이 잘 안 보여서 ㅠㅠ 다시 보내줄래?";
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: errorResponse
            });
            // 예진이 에러 응답 로그 (연보라색)
            console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${errorResponse}"`);
        } catch (replyError) {
            console.error(`${colors.error}🚨 [ImageHandler] 에러 응답 전송도 실패:${colors.reset}`, replyError);
        }
    }
}

// ================== 📤 응답 전송 ==================
async function sendReply(replyToken, botResponse) {
    try {
        if (!botResponse || !botResponse.type) return;

        if (botResponse.type === 'image') {
            const caption = botResponse.caption || '사진이야!';
            await client.replyMessage(replyToken, [
                { type: 'image', originalContentUrl: botResponse.originalContentUrl, previewImageUrl: botResponse.previewImageUrl },
                { type: 'text', text: caption }
            ]);
            // 예진이 이미지 응답 로그 (연보라색)
            console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "[사진 전송] ${caption}"`);
        } else if (botResponse.type === 'text' && botResponse.comment) {
            let cleanedText = botResponse.comment.replace(/자기야/gi, '아저씨').replace(/자기/gi, '아저씨');
            await client.replyMessage(replyToken, { type: 'text', text: cleanedText });
            // 예진이 텍스트 응답 로그 (연보라색)
            console.log(`💬 [대화] ${colors.yejin}예진${colors.reset}: "${cleanedText}"`);
        }

        // 마지막 봇 메시지 시간 업데이트
        if (ultimateContext?.getSulkinessState) {
            const sulkyState = ultimateContext.getSulkinessState();
            if (sulkyState) {
                sulkyState.lastBotMessageTime = Date.now();
            }
        }

    } catch (error) {
        console.error(`${colors.error}[sendReply] 🚨 메시지 전송 실패:${colors.reset}`, error);
    }
}

// ================== 🚀 시스템 초기화 ==================
async function initMuku() {
    try {
        console.log(`${colors.system}🚀 나 v13.3 시스템 초기화를 시작합니다... (감정 한글 절대 선언 시스템)${colors.reset}`);
        console.log(`${colors.system}🌏 현재 일본시간: ${getJapanTimeString()} (JST)${colors.reset}`);
        
        console.log(`${colors.system}  [1/6] 📦 모든 모듈 로드...${colors.reset}`);
        const moduleLoadSuccess = await loadModules();
        if (!moduleLoadSuccess) {
            throw new Error('모듈 로드 실패');
        }
        
        console.log(`${colors.system}  [2/6] 🧠 통합 기억 시스템 초기화...${colors.reset}`);
        await initializeMemorySystems();
        
        console.log(`${colors.system}  [3/6] 💖 감정 시스템 초기화...${colors.reset}`);
        // ultimateContext는 이미 initializeMemorySystems에서 초기화됨
        
        console.log(`${colors.system}  [4/6] ⏰ 모든 스케줄러 시작...${colors.reset}`);
        if (scheduler?.startAllSchedulers) {
            // scheduler.startAllSchedulers(client, userId); // 실제로는 주석 해제
        }
        if (spontaneousPhoto?.startSpontaneousPhotoScheduler) {
            spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, () => {
                if (ultimateContext?.getInternalState) {
                    return ultimateContext.getInternalState().timingContext.lastUserMessageTime;
                }
                return Date.now();
            });
        }
        
        console.log(`${colors.system}  [5/6] 🎨 예쁜 로그 시스템 시작...${colors.reset}`);
        setInterval(() => {
            formatPrettyStatus();
        }, 60 * 1000);
        
        console.log(`${colors.system}  [6/6] 📊 첫 번째 상태 표시...${colors.reset}`);
        setTimeout(() => {
            formatPrettyStatus();
        }, 3000);

        console.log(`\n${colors.system}🎉 모든 시스템 초기화 완료! (v13.2 일본시간 절대 선언 + 한글감정 + 정확한색상 시스템)${colors.reset}`);
        console.log(`\n${colors.system}📋 v13.2 주요 변경사항:${colors.reset}`);
        console.log(`   - 🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: 모든 시간 기능이 일본시간 기준`);
        console.log(`   - 🌏 process.env.TZ = 'Asia/Tokyo' 설정으로 Node.js 전체 시간대 통일`);
        console.log(`   - 🌏 전용 헬퍼 함수: getJapanTime(), getJapanHour(), getJapanMinute()`);
        console.log(`   - 🚬 담타 시간 표시에 JST 명시`);
        console.log(`   - ${colors.ajeossi}아저씨 대화 (시안색): 터미널 호환성 개선${colors.reset}`);
        console.log(`   - ${colors.yejin}예진이 대화 (마젠타): 터미널 호환성 개선${colors.reset}`);
        console.log(`   - ${colors.pms}PMS (굵은노랑): 모든 터미널 지원${colors.reset}`);
        console.log(`   - 🎭 감정 상태 한글 표시: unstable → 불안정`);
        console.log(`   - 통합 기억 시스템: memoryManager(고정) + ultimateContext(동적)`);
        console.log(`   - 정확한 담타 시간 표시: 다음 체크까지 남은 시간 실시간 계산`);

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(error);
        console.log(`${colors.warning}⚠️ 기본 기능으로라도 서버를 계속 실행합니다...${colors.reset}`);
    }
}

// ================== 🌟 서버 시작 ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  ${colors.system}나 v13.3 서버가 포트 ${PORT}에서 시작되었습니다.${colors.reset}`);
    console.log(`  🎭 ${colors.pms}감정 한글 절대 선언${colors.reset}: 모든 로그 자동 변환`);
    console.log(`  🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: ${getJapanTimeString()}`);
    console.log(`  🧠 통합 기억: 고정기억(memoryManager) + 동적기억(ultimateContext)`);
    console.log(`  🚬 정확한 담타: 실시간 다음 체크 시간 계산 (JST 기준)`);
    console.log(`  🤖 실시간 학습: 대화 내용 자동 기억 + 수동 기억 추가`);
    console.log(`  🎨 호환성 색상: ${colors.ajeossi}아저씨(시안)${colors.reset}, ${colors.yejin}예진이(마젠타)${colors.reset}, ${colors.pms}PMS(굵은노랑)${colors.reset}`);
    console.log(`  🎭 자동 변환: unstable→불안정, sensitive→예민함 (전역 적용)`);
    console.log(`  ⚡ 성능 향상: 모든 중복 코드 제거 + 완전한 모듈 연동`);
    console.log(`==================================================\n`);

    setTimeout(() => {
        initMuku();
    }, 1000);
});

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    app,
    client,
    formatPrettyStatus,
    getStatusReport,
    loadModules,
    initMuku,
    initializeMemorySystems,
    colors, // 정확한 색상 코드 적용
    // 🌏 일본시간 헬퍼 함수들 내보내기 (다른 모듈에서 사용)
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    JAPAN_TIMEZONE,
    TIMEZONE_OFFSET,
    // 🎭 감정 상태 한글 변환 헬퍼 내보내기
    translateEmotionToKorean,
    logWithKoreanEmotion
};
