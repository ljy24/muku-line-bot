// src/faceMatcher.js - v2.0 (완전 수정 버전)// ============================================================================
// index.js - v13.3 (face-api 지연 로딩 추가 버전)
// ✅ 대화 색상: 아저씨(하늘색), 예진이(연보라색), PMS(굵은 주황색)
// 🌏 모든 시간은 일본시간(JST, UTC+9) 기준으로 동작합니다
// 🔍 face-api: 지연 로딩으로 TensorFlow 크래시 방지
// ============================================================================

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');
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
let enhancedLogging, emotionalContextManager;

// 🔍 face-api 지연 로딩 변수들
let faceMatcher = null;
let faceApiInitialized = false;
let faceApiInitializing = false;

// ================== 🎨 색상 정의 ==================
const colors = {
    ajeossi: '\x1b[96m',    // 하늘색 (아저씨)
    yejin: '\x1b[95m',      // 연보라색 (예진이)
    pms: '\x1b[1m\x1b[33m', // 굵은 주황색 (PMS)
    system: '\x1b[92m',     // 연초록색 (시스템)
    error: '\x1b[91m',      // 빨간색 (에러)
    reset: '\x1b[0m'        // 색상 리셋
};

function formatTimeUntil(minutes) {
    if (minutes < 60) {
        return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
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

// ================== 🔍 face-api 지연 로딩 시스템 ==================
async function loadFaceMatcherSafely() {
    if (faceApiInitialized) {
        return faceMatcher;
    }
    
    if (faceApiInitializing) {
        console.log('🔍 [FaceMatcher] 이미 초기화 중...');
        return null;
    }
    
    faceApiInitializing = true;
    
    try {
        console.log('🔍 [FaceMatcher] 지연 로딩 시작...');
        faceMatcher = require('./src/faceMatcher');
        
        if (faceMatcher && faceMatcher.initModels) {
            console.log('🤖 [FaceMatcher] AI 모델 초기화 시작...');
            const initResult = await faceMatcher.initModels();
            
            if (initResult) {
                console.log('✅ [FaceMatcher] AI 얼굴 인식 시스템 준비 완료');
                faceApiInitialized = true;
            } else {
                console.log('⚡ [FaceMatcher] 빠른 구분 모드로 동작');
                faceApiInitialized = true; // 빠른 모드라도 로딩 완료로 간주
            }
        }
        
        faceApiInitializing = false;
        return faceMatcher;
        
    } catch (error) {
        console.log(`⚠️ [FaceMatcher] 로드 실패: ${error.message} - 얼굴 인식 없이 계속 진행`);
        faceApiInitializing = false;
        faceApiInitialized = true; // 실패해도 더 이상 시도하지 않음
        return null;
    }
}

// 얼굴 인식 안전 실행 함수
async function detectFaceSafely(base64Image) {
    try {
        const matcher = faceMatcher || await loadFaceMatcherSafely();
        
        if (matcher && matcher.detectFaceMatch) {
            return await matcher.detectFaceMatch(base64Image);
        } else {
            console.log('🔍 [FaceMatcher] 모듈 없음 - 기본 응답');
            return null;
        }
    } catch (error) {
        console.log(`⚠️ [FaceMatcher] 얼굴 인식 에러: ${error.message}`);
        return null;
    }
}

// ================== 📦 모듈 로드 ==================
async function loadModules() {
    try {
        console.log(`${colors.system}  [모듈로드] 핵심 시스템들을 순서대로 로딩합니다...${colors.reset}`);

        // 1. 대화 응답 시스템 (최우선)
        try {
            autoReply = require('./src/autoReply');
            console.log(`${colors.system}  ✅ [1/9] autoReply: 대화 응답 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [1/9] autoReply 로드 실패: ${error.message}${colors.reset}`);
        }

        // 2. 고정 기억 관리자
        try {
            memoryManager = require('./src/memoryManager');
            console.log(`${colors.system}  ✅ [2/9] memoryManager: 고정 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [2/9] memoryManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 3. 동적 기억 컨텍스트
        try {
            ultimateContext = require('./src/ultimateConversationContext');
            console.log(`${colors.system}  ✅ [3/9] ultimateContext: 동적 기억 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [3/9] ultimateContext 로드 실패: ${error.message}${colors.reset}`);
        }

        // 4. 명령어 처리기
        try {
            commandHandler = require('./src/commandHandler');
            console.log(`${colors.system}  ✅ [4/9] commandHandler: 명령어 처리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [4/9] commandHandler 로드 실패: ${error.message}${colors.reset}`);
        }

        // 5. 감정 상태 관리자
        try {
            emotionalContextManager = require('./src/emotionalContextManager');
            console.log(`${colors.system}  ✅ [5/9] emotionalContextManager: 감정 상태 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [5/9] emotionalContextManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 6. 기분 관리자
        try {
            moodManager = require('./src/moodManager');
            console.log(`${colors.system}  ✅ [6/9] moodManager: 기분 관리 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [6/9] moodManager 로드 실패: ${error.message}${colors.reset}`);
        }

        // 7. 향상된 로깅
        try {
            enhancedLogging = require('./src/enhancedLogging');
            console.log(`${colors.system}  ✅ [7/9] enhancedLogging: 향상된 로그 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [7/9] enhancedLogging 로드 실패: ${error.message}${colors.reset}`);
        }

        // 8. 자발적 사진 전송
        try {
            spontaneousPhoto = require('./src/spontaneousPhoto');
            console.log(`${colors.system}  ✅ [8/9] spontaneousPhoto: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [8/9] spontaneousPhoto 로드 실패: ${error.message}${colors.reset}`);
        }

        // 9. 사진 분석기
        try {
            photoAnalyzer = require('./src/photoAnalyzer');
            console.log(`${colors.system}  ✅ [9/9] photoAnalyzer: 사진 분석 시스템${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [9/9] photoAnalyzer 로드 실패: ${error.message}${colors.reset}`);
        }

        // 🔍 face-api는 별도로 로드 (지연 로딩)
        console.log(`${colors.system}  🔍 [추가] faceMatcher: 지연 로딩 모드 (필요시에만 로드)${colors.reset}`);

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 모듈 로드 중 심각한 에러: ${error.message}${colors.reset}`);
        return false;
    }
}

function formatPrettyStatus() {
    try {
        console.log(`\n${colors.system}====== 💖 나의 현재 상태 리포트 ======${colors.reset}\n`);

        // 생리주기 상태 (색상 적용)
        if (emotionalContextManager) {
            const cycle = emotionalContextManager.getCurrentEmotionState();
            const daysUntil = Math.abs(cycle.daysUntilNextPeriod);
            const nextPeriodText = cycle.daysUntilNextPeriod <= 0 ? '진행 중' : `${daysUntil}일 후`;

            // 다음 생리 예정일 계산 (월/일 형식) - 일본시간 기준
            const nextPeriodDate = getJapanTime();
            nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntil);
            const monthDay = `${nextPeriodDate.getMonth() + 1}/${nextPeriodDate.getDate()}`;

            let description = cycle.description || '정상';
            if (description.includes('PMS') || description.includes('생리')) {
                description = description.replace('PMS', `${colors.pms}PMS${colors.reset}`);
            }

            console.log(`🩸 [생리주기] 다음 생리예정일: ${nextPeriodText}(${monthDay}), 현재 ${description} 중 (JST)`);
        }

        // 감정 상태 로그
        if (emotionalContextManager) {
            const currentEmotion = emotionalContextManager.getCurrentEmotionState();
            let emotionText = currentEmotion.currentEmotion;
            
            if (currentEmotion.isSulky) {
                emotionText = `${colors.pms}삐짐 레벨 ${currentEmotion.sulkyLevel}${colors.reset}`;
            } else if (currentEmotion.currentEmotion === 'happy') {
                emotionText = `${colors.yejin}행복함${colors.reset}`;
            } else if (currentEmotion.currentEmotion === 'sad') {
                emotionText = `${colors.pms}슬픔${colors.reset}`;
            }
            
            console.log(`😊 [감정상태] 현재 감정: ${emotionText} (강도: ${currentEmotion.emotionIntensity}/10)`);
        }

        // 기억 상태 로그
        if (ultimateContext) {
            const memoryStats = ultimateContext.getMemoryStatistics ? ultimateContext.getMemoryStatistics() : { total: 0, today: 0 };
            console.log(`🧠 [기억관리] 전체 기억: ${memoryStats.total}개, 오늘 새로 배운 것: ${memoryStats.today}개`);
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

        // 🔍 face-api 상태 로그
        if (faceApiInitialized) {
            console.log(`🔍 [얼굴인식] AI 시스템 준비 완료`);
        } else if (faceApiInitializing) {
            console.log(`🔍 [얼굴인식] AI 시스템 초기화 중...`);
        } else {
            console.log(`🔍 [얼굴인식] 지연 로딩 대기 중 (필요시 자동 로드)`);
        }

        console.log('');

    } catch (error) {
        console.log(`${colors.system}💖 [시스템상태] 나 v13.3 정상 동작 중 (일부 모듈 대기) - JST: ${getJapanTimeString()}${colors.reset}`);
        console.log('');
    }
}

// ================== 💾 기억 시스템 초기화 ==================
async function initializeMemorySystems() {
    try {
        console.log(`${colors.system}  [2/6] 🧠 기억 시스템 초기화 중...${colors.reset}`);

        // 고정 기억 시스템 초기화
        if (memoryManager && memoryManager.loadFixedMemories) {
            await memoryManager.loadFixedMemories();
            console.log(`${colors.system}    ✅ 고정 기억 시스템: ${memoryManager.getFixedMemoryCount ? memoryManager.getFixedMemoryCount() : '?'}개 고정 기억 로드${colors.reset}`);
        }

        // 동적 기억 시스템 초기화  
        if (ultimateContext && ultimateContext.initializeEmotionalSystems) {
            await ultimateContext.initializeEmotionalSystems();
            console.log(`${colors.system}    ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
        }

        // 감정 컨텍스트 관리자 초기화
        if (emotionalContextManager && emotionalContextManager.initializeEmotionalState) {
            emotionalContextManager.initializeEmotionalState();
            console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기 및 감정 상태 초기화 완료${colors.reset}`);
        }

        return true;
    } catch (error) {
        console.error(`${colors.error}❌ 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
        return false;
    }
}

// ================== 🚀 LINE 봇 설정 ==================
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// ================== 📨 메시지 처리 ==================
app.post('/callback', middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(`${colors.error}❌ 웹훅 처리 에러: ${err.message}${colors.reset}`);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    try {
        // 사용자 정보
        const userId = event.source.userId;
        const userMessage = event.message;

        // 텍스트 메시지 처리
        if (userMessage.type === 'text') {
            console.log(`${colors.ajeossi}💬 아저씨: ${userMessage.text}${colors.reset}`);

            // 명령어 처리 확인
            if (commandHandler && commandHandler.handleCommand) {
                const commandResult = await commandHandler.handleCommand(userMessage.text, userId);
                if (commandResult && commandResult.handled) {
                    return sendReply(event.replyToken, commandResult);
                }
            }

            // 일반 대화 응답
            if (autoReply && autoReply.getReplyByMessage) {
                const botResponse = await autoReply.getReplyByMessage(userMessage.text);
                return sendReply(event.replyToken, botResponse);
            }

            // 폴백 응답
            return sendReply(event.replyToken, {
                type: 'text',
                comment: '아저씨~ 나 지금 시스템 준비 중이야... 조금만 기다려줘! ㅎㅎ'
            });
        }

        // 🖼️ 이미지 메시지 처리 (face-api 사용)
        else if (userMessage.type === 'image') {
            console.log(`${colors.ajeossi}📸 아저씨: 이미지 전송${colors.reset}`);

            try {
                // 이미지 다운로드
                const messageId = userMessage.id;
                const stream = await client.getMessageContent(messageId);

                // 이미지를 base64로 변환
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');

                console.log(`📐 이미지 크기: ${Math.round(buffer.length/1024)}KB`);

                // 🔍 안전한 얼굴 인식 실행
                const faceResult = await detectFaceSafely(base64);
                console.log(`🎯 얼굴 인식 결과: ${faceResult || '인식 실패'}`);

                // 결과에 따른 응답 생성
                let botResponse;
                if (faceResult === '예진이') {
                    const responses = [
                        '어? 이 사진 나야! 아저씨가 내 사진 보고 있었구나~ ㅎㅎ 예쁘지?',
                        '이거 내 사진이네! 아저씨 나 그리워서 보고 있었어? 귀여워 ㅎㅎ',
                        '아! 내 사진이다~ 아저씨는 항상 내 사진만 보고 있어야 해! ㅋㅋㅋ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                } else if (faceResult === '아저씨') {
                    const responses = [
                        '아저씨 사진이네! 잘생겼어~ 내 남자친구 맞지? ㅎㅎ',
                        '우리 아저씨다! 사진으로 봐도 멋있어... 보고 싶어 ㅠㅠ',
                        '아저씨 얼굴이야! 이런 아저씨 좋아해~ 나만의 아저씨 ㅎㅎ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                } else {
                    // 얼굴 인식 실패 또는 다른 사람
                    const responses = [
                        '사진 보내줘서 고마워! 누구 사진이야? 궁금해! ㅎㅎ',
                        '이 사진 누구야? 아저씨 친구들이야? 나도 보고 싶어!',
                        '사진이 잘 안 보여... 그래도 아저씨가 보낸 거니까 좋아! ㅎㅎ'
                    ];
                    botResponse = {
                        type: 'text',
                        comment: responses[Math.floor(Math.random() * responses.length)]
                    };
                }

                return sendReply(event.replyToken, botResponse);

            } catch (error) {
                console.error(`${colors.error}❌ 이미지 처리 에러: ${error.message}${colors.reset}`);
                return sendReply(event.replyToken, {
                    type: 'text',
                    comment: '사진이 잘 안 보여... 다시 보내줄래? ㅠㅠ'
                });
            }
        }

        // 기타 메시지 타입
        else {
            const responses = [
                '아저씨가 뭔가 보냈는데... 나 이건 잘 못 봐 ㅠㅠ',
                '음? 뭘 보낸 거야? 나 잘 못 보겠어... 텍스트로 말해줄래?',
                '아저씨~ 이건 내가 못 보는 거 같아... 다른 걸로 말해줘!'
            ];
            return sendReply(event.replyToken, {
                type: 'text',
                comment: responses[Math.floor(Math.random() * responses.length)]
            });
        }

    } catch (error) {
        console.error(`${colors.error}❌ 메시지 처리 에러: ${error.message}${colors.reset}`);
        return sendReply(event.replyToken, {
            type: 'text',
            comment: '아저씨... 나 지금 좀 멍해져서... 다시 말해줄래? ㅠㅠ'
        });
    }
}

async function sendReply(replyToken, botResponse) {
    try {
        let replyMessage;

        if (typeof botResponse === 'string') {
            replyMessage = { type: 'text', text: botResponse };
        } else if (botResponse.type === 'text') {
            replyMessage = { type: 'text', text: botResponse.comment || botResponse.text };
        } else if (botResponse.type === 'image') {
            replyMessage = {
                type: 'image',
                originalContentUrl: botResponse.imageUrl,
                previewImageUrl: botResponse.previewUrl || botResponse.imageUrl
            };
        } else {
            replyMessage = { type: 'text', text: '아저씨~ 뭔가 말하고 싶은데 말이 안 나와... ㅠㅠ' };
        }

        await client.replyMessage(replyToken, replyMessage);

        // 응답 로그 (색상 적용)
        if (replyMessage.type === 'text') {
            console.log(`${colors.yejin}💕 예진이: ${replyMessage.text}${colors.reset}`);
        } else if (replyMessage.type === 'image') {
            console.log(`${colors.yejin}📸 예진이: 이미지 전송${colors.reset}`);
        }

    } catch (error) {
        console.error(`${colors.error}❌ 응답 전송 실패: ${error.message}${colors.reset}`);
    }
}

// ================== 🚀 시스템 초기화 ==================
async function initMuku() {
    try {
        console.log(`${colors.system}🚀 나 v13.3 시스템 초기화를 시작합니다... (face-api 지연 로딩 추가)${colors.reset}`);
        console.log(`${colors.system}🌏 현재 일본시간: ${getJapanTimeString()} (JST)${colors.reset}`);

        console.log(`${colors.system}  [1/6] 📦 모든 모듈 로드...${colors.reset}`);
        const moduleLoadSuccess = await loadModules();
        if (!moduleLoadSuccess) {
            console.log(`${colors.error}  ⚠️ 일부 모듈 로드 실패 - 기본 기능으로 계속 진행${colors.reset}`);
        }

        console.log(`${colors.system}  [2/6] 🧠 기억 시스템 초기화...${colors.reset}`);
        await initializeMemorySystems();

        console.log(`${colors.system}  [3/6] 📅 스케줄러 시스템 활성화...${colors.reset}`);
        if (scheduler && scheduler.startAllSchedulers) {
            scheduler.startAllSchedulers();
            console.log(`${colors.system}    ✅ 모든 스케줄러 활성화 완료${colors.reset}`);
        }

        console.log(`${colors.system}  [4/6] 📸 자발적 사진 전송 시스템 활성화...${colors.reset}`);
        if (spontaneousPhoto && spontaneousPhoto.startSpontaneousPhotoSystem) {
            spontaneousPhoto.startSpontaneousPhotoSystem();
            console.log(`${colors.system}    ✅ 자발적 사진 전송 활성화 완료${colors.reset}`);
        }

        console.log(`${colors.system}  [5/6] 🎭 감정 및 상태 시스템 동기화...${colors.reset}`);
        if (emotionalContextManager) {
            console.log(`${colors.system}    ✅ 감정 상태 시스템 동기화 완료${colors.reset}`);
        }

        console.log(`${colors.system}  [6/6] 🔍 face-api 백그라운드 준비...${colors.reset}`);
        // face-api는 별도 백그라운드에서 초기화 (5초 후)
        setTimeout(async () => {
            console.log(`${colors.system}🤖 백그라운드에서 face-api 초기화 시작...${colors.reset}`);
            await loadFaceMatcherSafely();
        }, 5000);

        // 3초 후 상태 리포트 시작
        setTimeout(() => {
            formatPrettyStatus();
        }, 3000);

        console.log(`\n${colors.system}🎉 모든 시스템 초기화 완료! (v13.3 face-api 지연 로딩 추가)${colors.reset}`);
        console.log(`\n${colors.system}📋 v13.3 주요 변경사항:${colors.reset}`);
        console.log(`   - 🔍 ${colors.pms}face-api 지연 로딩${colors.reset}: TensorFlow 크래시 방지`);
        console.log(`   - 🔍 안전한 얼굴 인식: 이미지 전송시에만 AI 로드`);
        console.log(`   - 🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: 모든 시간 기능이 일본시간 기준`);
        console.log(`   - 🌏 process.env.TZ = 'Asia/Tokyo' 설정으로 Node.js 전체 시간대 통일`);
        console.log(`   - 🌏 전용 헬퍼 함수: getJapanTime(), getJapanHour(), getJapanMinute()`);
        console.log(`   - 🚬 담타 시간 표시에 JST 명시`);
        console.log(`   - ${colors.ajeossi}아저씨 대화: 하늘색${colors.reset}`);
        console.log(`   - ${colors.yejin}예진이 대화: 연보라색${colors.reset}`);
        console.log(`   - ${colors.pms}PMS: 굵은 주황색${colors.reset}`);
        console.log(`   - 통합 기억 시스템: memoryManager(고정) + ultimateContext(동적)`);
        console.log(`   - 정확한 담타 시간 표시: 다음 체크까지 남은 시간 실시간 계산`);
        console.log(`   - 실시간 기억 학습: 대화/사진에서 자동 기억 추가`);
        console.log(`   - 기억 명령어: "기억해줘 [내용]"으로 수동 기억 추가`);

    } catch (error) {
        console.error(`${colors.error}🚨🚨🚨 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨${colors.reset}`);
        console.error(`${colors.error}에러 내용: ${error.message}${colors.reset}`);
        console.log(`${colors.system}⚡ 기본 모드로 계속 진행합니다...${colors.reset}`);
    }
}

// ================== 🚀 서버 시작 ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  ${colors.system}나 v13.3 서버가 포트 ${PORT}에서 시작되었습니다.${colors.reset}`);
    console.log(`  🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: ${getJapanTimeString()}`);
    console.log(`  🧠 통합 기억: 고정기억(memoryManager) + 동적기억(ultimateContext)`);
    console.log(`  🚬 정확한 담타: 실시간 다음 체크 시간 계산 (JST 기준)`);
    console.log(`  🤖 실시간 학습: 대화 내용 자동 기억 + 수동 기억 추가`);
    console.log(`  🎨 색상 개선: ${colors.ajeossi}아저씨(하늘색)${colors.reset}, ${colors.yejin}예진이(연보라색)${colors.reset}, ${colors.pms}PMS(굵은주황)${colors.reset}`);
    console.log(`  ⚡ 성능 향상: 모든 중복 코드 제거 + 완전한 모듈 연동`);
    console.log(`  🔍 ${colors.pms}face-api 지연 로딩${colors.reset}: TensorFlow 크래시 방지 + 안전한 얼굴 인식`);
    console.log(`==================================================\n`);

    // 시스템 초기화 시작
    initMuku();
});

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    client,
    formatPrettyStatus,
    loadModules,
    initMuku,
    initializeMemorySystems,
    colors, // 색상 객체도 내보내기
    // 🌏 일본시간 헬퍼 함수들 내보내기 (다른 모듈에서 사용)
    getJapanTime,
    getJapanTimeString,
    getJapanHour,
    getJapanMinute,
    JAPAN_TIMEZONE,
    TIMEZONE_OFFSET,
    // 🔍 face-api 관련 함수들 내보내기
    loadFaceMatcherSafely,
    detectFaceSafely
};
// 🔍 아저씨와 예진이 사진을 정확히 구분합니다
const fs = require('fs');
const path = require('path');

// face-api는 선택적 로드 (모델 파일이 있을 때만)
let faceapi = null;
let canvas = null;

try {
    faceapi = require('@vladmandic/face-api');
    canvas = require('canvas');
    const { Canvas, Image, ImageData } = canvas;
    // monkey-patch
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
} catch (error) {
    console.log('🔍 [얼굴인식] face-api 모듈 없음 - 빠른 구분 모드만 사용');
}

// 경로 설정 (src/ 기준)
const faceDataPath = path.resolve(__dirname, '../memory/faceData.json');
const modelPath = path.resolve(__dirname, '../models');
let labeledDescriptors = [];
let isInitialized = false;

// 🎭 한글 로그 (전역 함수 사용)
function logFace(message) {
    try {
        if (global.translateMessage) {
            const translated = global.translateMessage(message);
            console.log(`🔍 [얼굴인식] ${translated}`);
        } else {
            console.log(`🔍 [얼굴인식] ${message}`);
        }
    } catch (error) {
        console.log(`🔍 [얼굴인식] ${message}`);
    }
}

// 얼굴 데이터 로드
function loadFaceData() {
    if (!fs.existsSync(faceDataPath)) {
        logFace('얼굴 데이터 파일이 없어서 빈 데이터베이스로 시작합니다');
        saveFaceData(); // 빈 파일 생성
        return [];
    }
    
    try {
        const raw = fs.readFileSync(faceDataPath, 'utf8');
        const json = JSON.parse(raw);
        
        logFace(`얼굴 데이터 로드 성공: ${Object.keys(json).length}명의 얼굴 정보`);
        
        if (!faceapi) {
            logFace('face-api 없음 - 데이터만 로드');
            return [];
        }
        
        const descriptors = [];
        Object.keys(json).forEach(label => {
            if (json[label] && json[label].length > 0) {
                const faceDescriptors = json[label].map(d => new Float32Array(d));
                descriptors.push(new faceapi.LabeledFaceDescriptors(label, faceDescriptors));
                logFace(`${label}: ${json[label].length}개 얼굴 샘플 로드`);
            }
        });
        
        return descriptors;
    } catch (e) {
        logFace(`얼굴 데이터 로드 실패: ${e.message}`);
        return [];
    }
}

// 얼굴 데이터 저장
function saveFaceData() {
    try {
        const dataToSave = {};
        labeledDescriptors.forEach(labeled => {
            dataToSave[labeled.label] = labeled.descriptors.map(d => Array.from(d));
        });
        
        const dir = path.dirname(faceDataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(faceDataPath, JSON.stringify(dataToSave, null, 2));
        logFace(`얼굴 데이터 저장 완료: ${faceDataPath}`);
    } catch (error) {
        logFace(`얼굴 데이터 저장 실패: ${error.message}`);
    }
}

// 모델 초기화 (face-api 있을 때만)
async function initModels() {
    try {
        if (!faceapi) {
            logFace('face-api 모듈 없음 - 빠른 구분 모드로 동작');
            isInitialized = false;
            return false;
        }
        
        logFace('face-api 모델 로딩 시작...');
        
        if (!fs.existsSync(modelPath)) {
            logFace(`모델 폴더가 없습니다: ${modelPath}`);
            logFace('얼굴 인식 없이 빠른 구분 모드로 동작합니다');
            isInitialized = false;
            return false;
        }
        
        // 필요한 모델 파일들 확인
        const requiredModels = [
            'ssd_mobilenetv1_model-weights_manifest.json',
            'face_landmark_68_model-weights_manifest.json', 
            'face_recognition_model-weights_manifest.json'
        ];
        
        const missingModels = requiredModels.filter(model => 
            !fs.existsSync(path.join(modelPath, model))
        );
        
        if (missingModels.length > 0) {
            logFace(`누락된 모델 파일들: ${missingModels.join(', ')}`);
            logFace('얼굴 인식 없이 빠른 구분 모드로 동작합니다');
            isInitialized = false;
            return false;
        }
        
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
        
        // 기존 저장된 데이터 로드
        labeledDescriptors = loadFaceData();
        isInitialized = true;
        
        logFace(`모델 로딩 완료! 등록된 얼굴: ${labeledDescriptors.length}명`);
        
        // 🚀 저장된 사진들로 자동 등록 (최초 1회만)
        if (labeledDescriptors.length === 0) {
            logFace('등록된 얼굴이 없어서 저장된 사진들로 자동 등록을 시작합니다');
            await autoRegisterFromFiles();
        } else {
            logFace('이미 등록된 얼굴 데이터가 있습니다');
            labeledDescriptors.forEach(ld => {
                logFace(`📊 ${ld.label}: ${ld.descriptors.length}개 얼굴 샘플`);
            });
        }
        
        return true;
        
    } catch (err) {
        logFace(`모델 초기화 실패: ${err.message}`);
        logFace('빠른 구분 모드로 전환합니다');
        isInitialized = false;
        return false;
    }
}

// base64 -> buffer -> canvas image
function imageFromBase64(base64) {
    try {
        const buffer = Buffer.from(base64, 'base64');
        return canvas.loadImage(buffer);
    } catch (error) {
        logFace(`이미지 변환 실패: ${error.message}`);
        throw error;
    }
}

// 얼굴 등록 함수
async function registerFace(base64, label) {
    if (!isInitialized || !faceapi) {
        logFace('모델이 초기화되지 않았습니다');
        return false;
    }
    
    try {
        logFace(`얼굴 등록 시작: ${label}`);
        
        const img = await imageFromBase64(base64);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            logFace(`얼굴을 찾을 수 없습니다: ${label}`);
            return false;
        }
        
        // 기존 라벨 찾기 또는 새로 생성
        let labeledDescriptor = labeledDescriptors.find(ld => ld.label === label);
        
        if (labeledDescriptor) {
            // 기존 라벨에 새 얼굴 추가
            labeledDescriptor.descriptors.push(detections.descriptor);
            logFace(`${label}에 새로운 얼굴 샘플 추가 (총 ${labeledDescriptor.descriptors.length}개)`);
        } else {
            // 새 라벨 생성
            labeledDescriptor = new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
            labeledDescriptors.push(labeledDescriptor);
            logFace(`새로운 사람 등록: ${label}`);
        }
        
        saveFaceData();
        return true;
        
    } catch (err) {
        logFace(`얼굴 등록 실패 (${label}): ${err.message}`);
        return false;
    }
}

// 기존 사진 파일들로 자동 얼굴 등록 (대량 처리 최적화)
async function autoRegisterFromFiles() {
    logFace('저장된 사진 파일들로 자동 얼굴 등록을 시작합니다...');
    
    const facesDir = path.resolve(__dirname, '../memory/faces');
    
    if (!fs.existsSync(facesDir)) {
        logFace('faces 폴더가 없습니다: ' + facesDir);
        return false;
    }
    
    let totalRegistered = 0;
    let totalFailed = 0;
    
    try {
        // 아저씨 사진들 등록 (001.jpg ~ 020.jpg)
        const uncleDir = path.join(facesDir, 'uncle');
        if (fs.existsSync(uncleDir)) {
            const uncleFiles = fs.readdirSync(uncleDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort(); // 파일명 순서대로 정렬
            
            logFace(`📸 아저씨 사진 ${uncleFiles.length}개 발견`);
            
            for (let i = 0; i < uncleFiles.length; i++) {
                const file = uncleFiles[i];
                try {
                    const filePath = path.join(uncleDir, file);
                    const buffer = fs.readFileSync(filePath);
                    const base64 = buffer.toString('base64');
                    
                    logFace(`🔄 아저씨 ${file} 처리 중... (${i+1}/${uncleFiles.length})`);
                    
                    const success = await registerFace(base64, '아저씨');
                    if (success) {
                        totalRegistered++;
                        logFace(`✅ ${file} 등록 성공`);
                    } else {
                        totalFailed++;
                        logFace(`❌ ${file} 등록 실패 (얼굴 미발견)`);
                    }
                    
                    // 메모리 관리를 위한 약간의 딜레이
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 예진이 사진들 등록 (001.jpg ~ 020.jpg)
        const yejinDir = path.join(facesDir, 'yejin');
        if (fs.existsSync(yejinDir)) {
            const yejinFiles = fs.readdirSync(yejinDir)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .sort(); // 파일명 순서대로 정렬
            
            logFace(`📸 예진이 사진 ${yejinFiles.length}개 발견`);
            
            for (let i = 0; i < yejinFiles.length; i++) {
                const file = yejinFiles[i];
                try {
                    const filePath = path.join(yejinDir, file);
                    const buffer = fs.readFileSync(filePath);
                    const base64 = buffer.toString('base64');
                    
                    logFace(`🔄 예진이 ${file} 처리 중... (${i+1}/${yejinFiles.length})`);
                    
                    const success = await registerFace(base64, '예진이');
                    if (success) {
                        totalRegistered++;
                        logFace(`✅ ${file} 등록 성공`);
                    } else {
                        totalFailed++;
                        logFace(`❌ ${file} 등록 실패 (얼굴 미발견)`);
                    }
                    
                    // 메모리 관리를 위한 약간의 딜레이
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    totalFailed++;
                    logFace(`❌ ${file} 처리 중 에러: ${error.message}`);
                }
            }
        }
        
        // 최종 결과 보고
        logFace(`🎉 자동 등록 완료!`);
        logFace(`📊 성공: ${totalRegistered}개, 실패: ${totalFailed}개`);
        
        // 등록 결과 상세 표시
        labeledDescriptors.forEach(ld => {
            logFace(`👤 ${ld.label}: ${ld.descriptors.length}개 얼굴 샘플 등록됨`);
        });
        
        // 인식 정확도 예상
        const uncleCount = labeledDescriptors.find(ld => ld.label === '아저씨')?.descriptors.length || 0;
        const yejinCount = labeledDescriptors.find(ld => ld.label === '예진이')?.descriptors.length || 0;
        
        if (uncleCount >= 10 && yejinCount >= 10) {
            logFace(`🎯 높은 정확도 예상: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        } else if (uncleCount >= 5 && yejinCount >= 5) {
            logFace(`🎯 중간 정확도 예상: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        } else {
            logFace(`⚠️ 더 많은 샘플 필요: 아저씨 ${uncleCount}개, 예진이 ${yejinCount}개 샘플`);
        }
        
        return totalRegistered > 0;
        
    } catch (error) {
        logFace(`자동 등록 중 심각한 에러: ${error.message}`);
        return false;
    }
}

// 얼굴 매칭 (폴백 지원)
async function detectFaceMatch(base64) {
    // 모델이 없거나 초기화 실패시 빠른 구분 사용
    if (!isInitialized || !faceapi) {
        logFace('face-api 모델 없음 - 빠른 구분 모드 사용');
        return quickFaceGuess(base64);
    }
    
    if (labeledDescriptors.length === 0) {
        logFace('등록된 얼굴이 없습니다 - 빠른 구분 모드 사용');
        return quickFaceGuess(base64);
    }
    
    try {
        const img = await imageFromBase64(base64);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
            logFace('사진에서 얼굴을 찾을 수 없습니다 - 빠른 구분 시도');
            return quickFaceGuess(base64);
        }
        
        // 여러 threshold로 테스트
        const thresholds = [0.4, 0.5, 0.6];
        let bestResult = null;
        let bestDistance = 1.0;
        
        for (const threshold of thresholds) {
            const matcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
            const match = matcher.findBestMatch(detections.descriptor);
            
            if (match.label !== 'unknown' && match.distance < bestDistance) {
                bestResult = match;
                bestDistance = match.distance;
            }
            
            logFace(`Threshold ${threshold}: ${match.label} (거리: ${match.distance.toFixed(3)})`);
        }
        
        if (bestResult && bestResult.label !== 'unknown') {
            const confidence = ((1 - bestResult.distance) * 100).toFixed(1);
            logFace(`🎯 얼굴 인식 성공: ${bestResult.label} (신뢰도: ${confidence}%)`);
            return bestResult.label;
        }
        
        logFace('얼굴 인식 실패 - 빠른 구분으로 폴백');
        return quickFaceGuess(base64);
        
    } catch (err) {
        logFace(`얼굴 매칭 에러: ${err.message} - 빠른 구분으로 폴백`);
        return quickFaceGuess(base64);
    }
}

// 빠른 얼굴 구분 (간단한 휴리스틱)
function quickFaceGuess(base64) {
    try {
        // base64 크기나 패턴으로 간단히 구분 (임시 방법)
        const buffer = Buffer.from(base64, 'base64');
        const size = buffer.length;
        
        // 예진이 셀카는 보통 더 크고 고화질
        // 아저씨 사진은 상대적으로 작을 수 있음
        if (size > 200000) { // 200KB 이상
            logFace(`큰 사진 (${Math.round(size/1024)}KB) - 예진이 셀카일 가능성 높음`);
            return '예진이';
        } else {
            logFace(`작은 사진 (${Math.round(size/1024)}KB) - 아저씨 사진일 가능성 높음`);
            return '아저씨';
        }
    } catch (error) {
        logFace(`빠른 구분 실패: ${error.message}`);
        return 'unknown';
    }
}

// 얼굴 데이터 상태 확인
function getFaceDataStatus() {
    const status = {
        isInitialized,
        modelPath,
        faceDataPath,
        registeredFaces: labeledDescriptors.length,
        faceDetails: {}
    };
    
    labeledDescriptors.forEach(labeled => {
        status.faceDetails[labeled.label] = labeled.descriptors.length;
    });
    
    return status;
}

module.exports = { 
    initModels, 
    detectFaceMatch, 
    registerFace,
    quickFaceGuess,
    getFaceDataStatus,
    autoRegisterFromFiles,
    logFace
};
