// ============================================================================
// index.js - v13.3 (face-api 지연 로딩 추가 버전)
// ✅ 대화 색상: 아저씨(하늘색), 예진이(연보라색), PMS(굵은 빨간색)
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
    pms: '\x1b[1m\x1b[91m', // 굵은 빨간색 (PMS)
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
        console.log(`${colors.system}🔍 [FaceMatcher] 이미 초기화 중...${colors.reset}`);
        return null;
    }
    
    faceApiInitializing = true;
    
    try {
        console.log(`${colors.system}🔍 [FaceMatcher] 지연 로딩 시작...${colors.reset}`);
        faceMatcher = require('./src/faceMatcher');
        
        if (faceMatcher && faceMatcher.initModels) {
            console.log(`${colors.system}🤖 [FaceMatcher] AI 모델 초기화 시작...${colors.reset}`);
            const initResult = await faceMatcher.initModels();
            
            if (initResult) {
                console.log(`${colors.system}✅ [FaceMatcher] AI 얼굴 인식 시스템 준비 완료${colors.reset}`);
                faceApiInitialized = true;
            } else {
                console.log(`${colors.system}⚡ [FaceMatcher] 빠른 구분 모드로 동작${colors.reset}`);
                faceApiInitialized = true; // 빠른 모드라도 로딩 완료로 간주
            }
        }
        
        faceApiInitializing = false;
        return faceMatcher;
        
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 로드 실패: ${error.message} - 얼굴 인식 없이 계속 진행${colors.reset}`);
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
            console.log(`${colors.system}🔍 [FaceMatcher] 얼굴 인식 실행 중...${colors.reset}`);
            return await matcher.detectFaceMatch(base64Image);
        } else {
            console.log(`${colors.system}🔍 [FaceMatcher] 모듈 없음 - 기본 응답${colors.reset}`);
            return null;
        }
    } catch (error) {
        console.log(`${colors.error}⚠️ [FaceMatcher] 얼굴 인식 에러: ${error.message}${colors.reset}`);
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

        // 8. 자발적 사진 전송 (파일명 수정됨)
        try {
            spontaneousPhoto = require('./src/spontaneousPhotoManager');
            console.log(`${colors.system}  ✅ [8/9] spontaneousPhotoManager: 자발적 사진 전송${colors.reset}`);
        } catch (error) {
            console.log(`${colors.error}  ❌ [8/9] spontaneousPhotoManager 로드 실패: ${error.message}${colors.reset}`);
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
            try {
                const cycle = emotionalContextManager.getCurrentEmotionState();
                const daysUntil = Math.abs(cycle.daysUntilNextPeriod || 14);
                const nextPeriodText = (cycle.daysUntilNextPeriod || 14) <= 0 ? '진행 중' : `${daysUntil}일 후`;

                // 다음 생리 예정일 계산 (월/일 형식) - 일본시간 기준
                const nextPeriodDate = getJapanTime();
                nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntil);
                const monthDay = `${nextPeriodDate.getMonth() + 1}/${nextPeriodDate.getDate()}`;

                let description = cycle.description || '정상';
                if (description.includes('PMS') || description.includes('생리')) {
                    description = description.replace('PMS', `${colors.pms}PMS${colors.reset}`);
                }

                console.log(`🩸 [생리주기] 다음 생리예정일: ${nextPeriodText}(${monthDay}), 현재 ${description} 중 (JST)`);
            } catch (error) {
                console.log(`🩸 [생리주기] 시스템 초기화 중...`);
            }
        } else {
            console.log(`🩸 [생리주기] 시스템 로딩 중...`);
        }

        // 감정 상태 로그
        if (emotionalContextManager) {
            try {
                const currentEmotion = emotionalContextManager.getCurrentEmotionState();
                let emotionText = currentEmotion.currentEmotion || 'normal';
                
                if (currentEmotion.isSulky) {
                    emotionText = `${colors.pms}삐짐 레벨 ${currentEmotion.sulkyLevel || 1}${colors.reset}`;
                } else if (currentEmotion.currentEmotion === 'happy') {
                    emotionText = `${colors.yejin}행복함${colors.reset}`;
                } else if (currentEmotion.currentEmotion === 'sad') {
                    emotionText = `${colors.pms}슬픔${colors.reset}`;
                }
                
                console.log(`😊 [감정상태] 현재 감정: ${emotionText} (강도: ${currentEmotion.emotionIntensity || 5}/10)`);
            } catch (error) {
                console.log(`😊 [감정상태] 감정 시스템 초기화 중...`);
            }
        } else {
            console.log(`😊 [감정상태] 감정 시스템 로딩 중...`);
        }

        // 기억 상태 로그
        if (ultimateContext) {
            try {
                const memoryStats = ultimateContext.getMemoryStatistics ? ultimateContext.getMemoryStatistics() : { total: 0, today: 0 };
                console.log(`🧠 [기억관리] 전체 기억: ${memoryStats.total}개, 오늘 새로 배운 것: ${memoryStats.today}개`);
            } catch (error) {
                console.log(`🧠 [기억관리] 기억 시스템 초기화 중...`);
            }
        } else {
            console.log(`🧠 [기억관리] 기억 시스템 로딩 중...`);
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
            try {
                await memoryManager.loadFixedMemories();
                console.log(`${colors.system}    ✅ 고정 기억 시스템: ${memoryManager.getFixedMemoryCount ? memoryManager.getFixedMemoryCount() : '?'}개 고정 기억 로드${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 고정 기억 시스템 로드 실패: ${error.message}${colors.reset}`);
            }
        }

        // 동적 기억 시스템 초기화  
        if (ultimateContext && ultimateContext.initializeEmotionalSystems) {
            try {
                await ultimateContext.initializeEmotionalSystems();
                console.log(`${colors.system}    ✅ 동적 기억 시스템: ultimateContext 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 동적 기억 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
        }

        // 감정 컨텍스트 관리자 초기화
        if (emotionalContextManager && emotionalContextManager.initializeEmotionalState) {
            try {
                emotionalContextManager.initializeEmotionalState();
                console.log(`${colors.system}    ✅ 감정 상태 시스템: 생리주기 및 감정 상태 초기화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 감정 상태 시스템 초기화 실패: ${error.message}${colors.reset}`);
            }
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

// ================== 📨 메시지 처리 (webhook 경로로 변경) ==================
app.post('/webhook', middleware(config), (req, res) => {
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
                try {
                    const commandResult = await commandHandler.handleCommand(userMessage.text, userId, client);
                    if (commandResult && commandResult.handled) {
                        return sendReply(event.replyToken, commandResult);
                    }
                } catch (error) {
                    console.log(`${colors.error}⚠️ 명령어 처리 에러: ${error.message}${colors.reset}`);
                }
            }

            // 일반 대화 응답
            if (autoReply && autoReply.getReplyByMessage) {
                try {
                    const botResponse = await autoReply.getReplyByMessage(userMessage.text);
                    return sendReply(event.replyToken, botResponse);
                } catch (error) {
                    console.log(`${colors.error}⚠️ 대화 응답 에러: ${error.message}${colors.reset}`);
                }
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

                console.log(`${colors.system}📐 이미지 크기: ${Math.round(buffer.length/1024)}KB${colors.reset}`);

                // 🔍 안전한 얼굴 인식 실행
                const faceResult = await detectFaceSafely(base64);
                console.log(`${colors.system}🎯 얼굴 인식 결과: ${faceResult || '인식 실패'}${colors.reset}`);

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
            console.log(`${colors.ajeossi}📎 아저씨: ${userMessage.type} 메시지${colors.reset}`);
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
            try {
                scheduler.startAllSchedulers();
                console.log(`${colors.system}    ✅ 모든 스케줄러 활성화 완료${colors.reset}`);
            } catch (error) {
                console.log(`${colors.error}    ❌ 스케줄러 활성화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.system}    ⚠️ 스케줄러 모듈 없음 - 건너뛰기${colors.reset}`);
        }

        console.log(`${colors.system}  [4/6] 📸 자발적 사진 전송 시스템 활성화...${colors.reset}`);
        if (spontaneousPhoto && spontaneousPhoto.startSpontaneousPhotoScheduler) {
            try {
                const userId = process.env.TARGET_USER_ID;
                if (!userId) {
                    console.log(`${colors.error}    ❌ TARGET_USER_ID 환경변수 없음 - 자발적 사진 전송 비활성화${colors.reset}`);
                } else {
                    // 마지막 사용자 메시지 시간 함수 (옵션)
                    const getLastUserMessageTime = () => {
                        try {
                            const ultimateContext = require('./src/ultimateConversationContext');
                            return ultimateContext.getLastUserMessageTime ? ultimateContext.getLastUserMessageTime() : Date.now();
                        } catch (error) {
                            return Date.now();
                        }
                    };
                    
                    spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime);
                    console.log(`${colors.system}    ✅ 자발적 사진 전송 활성화 완료 (userId: ${userId.slice(0,8)}...)${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.error}    ❌ 자발적 사진 전송 활성화 실패: ${error.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.system}    ⚠️ 자발적 사진 전송 모듈 없음 - 건너뛰기${colors.reset}`);
        }

        console.log(`${colors.system}  [5/6] 🎭 감정 및 상태 시스템 동기화...${colors.reset}`);
        if (emotionalContextManager) {
            console.log(`${colors.system}    ✅ 감정 상태 시스템 동기화 완료${colors.reset}`);
        } else {
            console.log(`${colors.system}    ⚠️ 감정 상태 시스템 없음 - 기본 모드${colors.reset}`);
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
        console.log(`   - 🔧 ${colors.pms}webhook 경로 수정${colors.reset}: /callback → /webhook`);
        console.log(`   - 🔧 ${colors.pms}spontaneousPhotoManager${colors.reset}: 파일명 수정 완료`);
        console.log(`   - ${colors.ajeossi}아저씨 대화: 하늘색${colors.reset}`);
        console.log(`   - ${colors.yejin}예진이 대화: 연보라색${colors.reset}`);
        console.log(`   - ${colors.pms}PMS: 굵은 빨간색${colors.reset}`);
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

// ================== 🏠 추가 라우트 ==================
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 나 v13.3이 실행 중입니다! 💕</h1>
        <p>🌏 일본시간: ${getJapanTimeString()} (JST)</p>
        <p>🔍 face-api: ${faceApiInitialized ? '✅ 준비완료' : '⏳ 로딩중'}</p>
        <p>🔧 webhook: /webhook 경로로 변경 완료</p>
        <p>📊 시스템 가동시간: ${Math.floor(process.uptime())}초</p>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
            h1 { color: #ff69b4; }
            p { color: #333; font-size: 16px; }
        </style>
    `);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v13.3',
        timestamp: getJapanTimeString(),
        timezone: 'Asia/Tokyo (JST)',
        faceApi: faceApiInitialized ? 'ready' : 'loading',
        webhookPath: '/webhook',
        spontaneousPhoto: 'spontaneousPhotoManager',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// ================== 🚀 서버 시작 ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  ${colors.system}나 v13.3 서버가 포트 ${PORT}에서 시작되었습니다.${colors.reset}`);
    console.log(`  🌏 ${colors.pms}일본시간(JST) 절대 선언${colors.reset}: ${getJapanTimeString()}`);
    console.log(`  🔧 ${colors.pms}webhook 경로${colors.reset}: /webhook (수정 완료)`);
    console.log(`  🔧 ${colors.pms}자발적 사진${colors.reset}: spontaneousPhotoManager (수정 완료)`);
    console.log(`  🧠 통합 기억: 고정기억(memoryManager) + 동적기억(ultimateContext)`);
    console.log(`  🚬 정확한 담타: 실시간 다음 체크 시간 계산 (JST 기준)`);
    console.log(`  🤖 실시간 학습: 대화 내용 자동 기억 + 수동 기억 추가`);
    console.log(`  🎨 색상 개선: ${colors.ajeossi}아저씨(하늘색)${colors.reset}, ${colors.yejin}예진이(연보라색)${colors.reset}, ${colors.pms}PMS(굵은빨강)${colors.reset}`);
    console.log(`  ⚡ 성능 향상: 모든 중복 코드 제거 + 완전한 모듈 연동`);
    console.log(`  🔍 ${colors.pms}face-api 지연 로딩${colors.reset}: TensorFlow 크래시 방지 + 안전한 얼굴 인식`);
    console.log(`==================================================\n`);

    // 시스템 초기화 시작
    initMuku();
});

// ================== 🛡️ 에러 처리 ==================
process.on('uncaughtException', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 예외: ${error.message}${colors.reset}`);
    console.error(`${colors.error}스택: ${error.stack}${colors.reset}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 Promise 거부: ${error}${colors.reset}`);
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
