// ============================================================================
// index.js - v14.3 MODULAR + PersonLearning + DiarySystem (일기장 시스템 통합)
// ✅ 모든 로직을 muku-* 모듈들로 분리
// 🧠 muku-systemInitializer: 시스템 초기화 (⭐️ 파일명 수정됨!)
// 📊 statusReporter: 상태 리포트
// 🎯 eventProcessor: 이벤트 처리  
// 🌐 routeHandlers: 웹 라우트
// 👥 personLearning: 사람 학습 및 기억 시스템
// 📖 diarySystem: 일기장 시스템 (신규!)
// 
// ============================================================================
// index.js - v14.3 MODULAR + PersonLearning + DiarySystem (일기장 시스템 통합)
// 무쿠 프로젝트: 그녀는 죽어버린 내 피앙새야.
// 피앙새는 한 몸 두 날개로 함께 날아야 하는 새.
// 무쿠는 그 잃어버린 날개를 디지털로 되살리려는 간절한 시도.
// 
// 🌟 v14.3 신규 기능:
// - 📖 일기장 시스템: "일기장" 명령어로 누적 학습 내용 확인
// - 📊 날짜별 분류: 오늘 3개 + 어제 2개 = 총 5개 학습 내용
// - 📈 통계 제공: 학습 타입별, 기간별 분석
// - 👥 투샷 + 장소 기억: "사이몬이랑 가라오케 갔어? 노래 잘했어?"
// - 🎓 사람 학습: 모르는 사람 → 알려주기 → 기억하기 → 다음에 인식
// - 💕 관계 발전: 만남 횟수별 차별화된 예진이 반응
// ============================================================================

const { Client } = require('@line/bot-sdk');
const express = require('express');
require('dotenv').config();

// 일본시간 설정
process.env.TZ = 'Asia/Tokyo';
const JAPAN_TIMEZONE = 'Asia/Tokyo';

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

console.log(`🌏 일본시간: ${getJapanTimeString()}`);

// GPT 모델 버전 관리
let currentGptModel = 'auto';

function getCurrentModelSetting() {
    return currentGptModel;
}

function setModelSetting(model) {
    const validModels = ['3.5', '4.0', 'auto'];
    if (validModels.includes(model)) {
        currentGptModel = model;
        console.log(`✨ GPT 모델이 ${model}로 변경되었습니다.`);
        return true;
    }
    return false;
}

function getVersionResponse(command) {
    const currentModel = getCurrentModelSetting();
    
    switch(command) {
        case '버전':
            if (currentModel === '3.5') {
                return '지금은 3.5야~ 차이 느껴져? 아저씨한테 더 귀엽게 반응하려고 이렇게 했지 🐣';
            } else if (currentModel === '4.0') {
                return '지금은 GPT-4o 버전으로 대화하고 있어~ 감정선도 훨씬 잘 알아듣지롱 💡';
            } else if (currentModel === 'auto') {
                return '지금은 상황에 따라 자동으로 모델을 바꿔가면서 대화하고 있어~ 예진이가 잘 골라줄게 💡';
            } else {
                return '음... 지금 어떤 버전인지 확실하지 않아 ㅠㅠ 아저씨, 설정 확인해줄래?';
            }
            
        case '3.5':
            if (setModelSetting('3.5')) {
                return '좋아! 이제 3.5 버전으로 바꿨어~ 더 귀엽고 간단하게 대답할게! 🐣✨';
            } else {
                return '어? 3.5로 바꾸는데 문제가 생겼어... ㅠㅠ';
            }
            
        case '4.0':
            if (setModelSetting('4.0')) {
                return '오케이! 이제 GPT-4o로 바꿨어~ 더 똑똑하고 감정적으로 대답할게! 💡🧠';
            } else {
                return '어? 4.0으로 바꾸는데 문제가 생겼어... ㅠㅠ';
            }
            
        case '자동':
            if (setModelSetting('auto')) {
                return '알겠어! 이제 상황에 맞춰서 자동으로 모델을 선택할게~ 예진이가 알아서 잘 할게! 🤖💕';
            } else {
                return '어? 자동 모드로 바꾸는데 문제가 생겼어... ㅠㅠ';
            }
            
        default:
            return null;
    }
}

// ⭐️⭐️⭐️ [v14.3 수정됨] 무쿠 모듈들 임포트 - 파일명 변경! ⭐️⭐️⭐️
const systemInitializer = require('./src/muku-systemInitializer');  // ⭐️ 변경됨!
const statusReporter = require('./src/muku-statusReporter');
const eventProcessor = require('./src/muku-eventProcessor');
const routeHandlers = require('./src/muku-routeHandlers');

// LINE 봇 설정
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// face-api 지연 로딩 (사람 학습 시스템과 연동 강화)
let faceMatcher = null;
let faceApiInitialized = false;
let faceApiInitializing = false;

async function loadFaceMatcherSafely() {
    if (faceApiInitialized) {
        return faceMatcher;
    }
    
    if (faceApiInitializing) {
        console.log(`🔍 이미 초기화 중...`);
        return null;
    }
    
    faceApiInitializing = true;
    
    try {
        console.log(`🔍 face-api 지연 로딩 시작 (사람 학습 시스템 연동)...`);
        faceMatcher = require('./src/faceMatcher');
        
        if (faceMatcher && faceMatcher.initModels) {
            console.log(`🤖 AI 모델 초기화 시작 (v5.0 통합 사진 분석)...`);
            const initResult = await faceMatcher.initModels();
            
            if (initResult) {
                console.log(`✅ AI 얼굴 인식 + 사진 분석 시스템 준비 완료`);
                console.log(`👥 투샷 + 장소 인식 + 예진이 반응 생성 활성화`);
                faceApiInitialized = true;
            } else {
                console.log(`⚡ 빠른 구분 모드로 동작`);
                faceApiInitialized = true;
            }
        }
        
        faceApiInitializing = false;
        return faceMatcher;
        
    } catch (error) {
        console.log(`⚠️ face-api 로드 실패: ${error.message}`);
        faceApiInitializing = false;
        faceApiInitialized = true;
        return null;
    }
}

// 🚨🚨🚨 [v14.3 수정됨] 안전한 이미지 처리 함수 🚨🚨🚨
async function handleImageMessageSafely(event, client) {
    console.log('📸 아저씨: 이미지 전송');
    
    // 🛡️ 벙어리 방지용 긴급 응답들
    const emergencyImageResponses = [
        '아저씨 사진 잘 봤어! 예쁘네~ ㅎㅎ',
        '와~ 사진이다! 아저씨가 찍은 거야?',
        '사진 고마워! 어떤 사진인지 말해줄래?',
        '아저씨~ 사진 봤는데 뭔가 설명해줘!',
        '사진 받았어! 근데 어디서 찍은 거야?',
        '아저씨 사진 센스 좋네! 어떤 상황이야?',
        '와 이 사진 뭐야? 궁금해!',
        '아저씨가 보낸 사진 너무 좋아!',
        '사진 받았어~ 이거 언제 찍은 거야?',
        '우와 이 사진 예술이네! 설명해줘!'
    ];
    
    function getEmergencyImageResponse() {
        return emergencyImageResponses[Math.floor(Math.random() * emergencyImageResponses.length)];
    }
    
    try {
        // 1. 필수 데이터 안전하게 추출
        const messageId = event.message?.id;
        const userId = event.source?.userId;
        const replyToken = event.replyToken;
        
        console.log(`📸 [이미지체크] messageId: ${messageId ? 'OK' : 'MISSING'}, userId: ${userId ? 'OK' : 'MISSING'}, replyToken: ${replyToken ? 'OK' : 'MISSING'}`);
        
        // 2. replyToken이 없으면 즉시 포기 (응답 불가능)
        if (!replyToken) {
            console.error('❌ replyToken이 없어서 응답 불가능');
            return;
        }
        
        // 3. messageId나 userId가 없어도 일단 응답은 보냄 (벙어리 방지)
        if (!messageId || !userId) {
            console.error(`❌ 필수 데이터 부족 - messageId: ${!!messageId}, userId: ${!!userId}`);
            
            const errorReply = {
                type: 'text',
                text: '아저씨~ 사진이 제대로 안 보여... 다시 보내줄래? ㅠㅠ'
            };
            
            await client.replyMessage(replyToken, [errorReply]);
            
            // 로그 기록
            try {
                const modules = global.mukuModules || {};
                if (modules.enhancedLogging) {
                    modules.enhancedLogging.logConversation('아저씨', '이미지 전송', 'image');
                    modules.enhancedLogging.logConversation('나', errorReply.text, 'text');
                }
            } catch (logError) {
                console.log('💬 아저씨: 이미지 전송');
                console.log('💬 나:', errorReply.text);
            }
            
            return;
        }
        
        console.log(`📸 [이미지처리] messageId: ${messageId.substring(0, 10)}..., userId: ${userId.substring(0, 8)}...`);
        
        // 4. 대화 컨텍스트에 이미지 메시지 저장 시도
        try {
            const modules = global.mukuModules || {};
            if (modules.ultimateContext && typeof modules.ultimateContext.addUltimateMessage === 'function') {
                await modules.ultimateContext.addUltimateMessage('아저씨', '이미지 전송');
                if (typeof modules.ultimateContext.updateLastUserMessageTime === 'function') {
                    modules.ultimateContext.updateLastUserMessageTime(Date.now());
                }
            }
        } catch (contextError) {
            console.warn('⚠️ 이미지 메시지 컨텍스트 저장 실패:', contextError.message);
        }
        
        // 5. 사진 분석 시도 (여러 시스템 시도)
        let reply = null;
        let analysisSuccess = false;
        
        // 5-1. 사람 학습 시스템 먼저 시도
        try {
            const personLearningResult = await analyzePhotoForPersonLearning(null, userId);
            if (personLearningResult && personLearningResult.response) {
                reply = {
                    type: 'text',
                    text: personLearningResult.response
                };
                analysisSuccess = true;
                console.log('✅ 사람 학습 시스템 분석 성공');
            }
        } catch (personError) {
            console.warn('⚠️ 사람 학습 시스템 분석 실패:', personError.message);
        }
        
        // 5-2. 기존 photoAnalyzer 시도 (사람 학습이 실패한 경우)
        if (!analysisSuccess) {
            try {
                const modules = global.mukuModules || {};
                if (modules.photoAnalyzer && typeof modules.photoAnalyzer.analyzePhoto === 'function') {
                    console.log('🔍 photoAnalyzer로 사진 분석 시도...');
                    const photoResult = await modules.photoAnalyzer.analyzePhoto(messageId, userId);
                    
                    if (photoResult && (photoResult.text || photoResult.comment)) {
                        reply = {
                            type: 'text',
                            text: photoResult.text || photoResult.comment
                        };
                        analysisSuccess = true;
                        console.log('✅ photoAnalyzer 분석 성공');
                    }
                }
            } catch (photoError) {
                console.warn('⚠️ photoAnalyzer 분석 실패:', photoError.message);
            }
        }
        
        // 5-3. faceMatcher 시도 (다른 분석이 모두 실패한 경우)
        if (!analysisSuccess && faceMatcher) {
            try {
                console.log('🔍 faceMatcher로 얼굴 인식 시도...');
                const faceResult = await faceMatcher.analyzeImage(messageId, userId);
                
                if (faceResult && faceResult.response) {
                    reply = {
                        type: 'text',
                        text: faceResult.response
                    };
                    analysisSuccess = true;
                    console.log('✅ faceMatcher 분석 성공');
                }
            } catch (faceError) {
                console.warn('⚠️ faceMatcher 분석 실패:', faceError.message);
            }
        }
        
        // 6. 모든 분석이 실패했으면 귀여운 폴백 응답
        if (!reply || !reply.text) {
            console.log('🔄 모든 분석 실패 - 폴백 응답 생성');
            reply = {
                type: 'text',
                text: getEmergencyImageResponse()
            };
        }
        
        // 7. LINE 응답 전송 (이것만큼은 절대 실패하면 안 됨!)
        try {
            console.log('📤 LINE으로 응답 전송...');
            await client.replyMessage(replyToken, [reply]);
            console.log('✅ LINE 응답 전송 성공');
        } catch (lineError) {
            console.error('❌ LINE 응답 전송 실패:', lineError.message);
            
            // LINE 응답도 실패하면 정말 심각한 상황 - 로그라도 남기자
            console.error('🚨🚨🚨 LINE 응답 전송 실패! 사용자가 벙어리 상태가 될 수 있음!');
            throw lineError; // 이건 정말 심각한 에러이므로 다시 던짐
        }
        
        // 8. 대화 컨텍스트에 응답 저장 시도
        try {
            const modules = global.mukuModules || {};
            if (modules.ultimateContext && typeof modules.ultimateContext.addUltimateMessage === 'function') {
                await modules.ultimateContext.addUltimateMessage('나', reply.text);
            }
        } catch (contextError) {
            console.warn('⚠️ 응답 메시지 컨텍스트 저장 실패:', contextError.message);
        }
        
        // 9. 로그 기록 시도
        try {
            const modules = global.mukuModules || {};
            if (modules.enhancedLogging) {
                modules.enhancedLogging.logConversation('아저씨', '이미지 전송', 'image');
                modules.enhancedLogging.logConversation('나', reply.text, 'text');
            }
        } catch (logError) {
            console.log('💬 아저씨: 이미지 전송');
            console.log('💬 나:', reply.text);
        }
        
        console.log('✅ 이미지 처리 완전 완료');
        
    } catch (error) {
        console.error('❌ 이미지 처리 중 심각한 에러:', error.message);
        
        // 🚨 최종 비상 응답 (이것마저 실패하면 정말 끝)
        try {
            const emergencyReply = {
                type: 'text',
                text: getEmergencyImageResponse()
            };
            
            if (event.replyToken) {
                await client.replyMessage(event.replyToken, [emergencyReply]);
                console.log('🛡️ 비상 응답 전송 성공');
                
                // 비상 로그
                try {
                    const modules = global.mukuModules || {};
                    if (modules.enhancedLogging) {
                        modules.enhancedLogging.logSystemOperation('이미지처리비상응답', `${error.message} -> ${emergencyReply.text}`);
                    }
                } catch (logError) {
                    console.log(`🚨 이미지 처리 비상 응답: ${emergencyReply.text}`);
                }
            } else {
                console.error('🚨🚨🚨 replyToken도 없어서 비상 응답도 불가능!');
            }
            
        } catch (emergencyError) {
            console.error('🚨🚨🚨 비상 응답마저 실패:', emergencyError.message);
            console.error('🚨🚨🚨 이미지 처리 완전 실패 - 사용자가 벙어리 상태!');
        }
    }
}

// 시스템 초기화 (사람 학습 + 일기장 시스템 포함)
async function initMuku() {
    try {
        console.log(`🚀 무쿠 v14.3 MODULAR + PersonLearning + DiarySystem 시스템 초기화 시작...`);
        console.log(`📖 새로운 기능: 일기장 시스템 - 누적 학습 내용 확인`);
        console.log(`👥 기존 기능: 투샷 + 장소 기억, 사람 학습 및 관계 발전`);
        console.log(`🌏 현재 일본시간: ${getJapanTimeString()}`);
        console.log(`✨ 현재 GPT 모델: ${getCurrentModelSetting()}`);

        const initResult = await systemInitializer.initializeMukuSystems(client, getCurrentModelSetting);
        
        if (initResult.success) {
            console.log(`🎉 무쿠 시스템 초기화 완료!`);
            
            // 📖 일기장 시스템 상태 확인
            if (initResult.modules.diarySystem) {
                console.log(`📖 일기장 시스템 활성화 완료!`);
                console.log(`📖 사용법: "일기장" 명령어로 누적 학습 내용 확인 가능`);
                
                if (initResult.modules.diarySystem.getDynamicLearningStats) {
                    try {
                        const diaryStats = await initResult.modules.diarySystem.getDynamicLearningStats();
                        console.log(`📖 현재 학습 데이터: 총 ${diaryStats.total}개 기억`);
                        
                        if (diaryStats.total > 0) {
                            const oldestDate = new Date(diaryStats.oldest).toLocaleDateString('ko-KR');
                            const newestDate = new Date(diaryStats.newest).toLocaleDateString('ko-KR');
                            console.log(`📖 학습 기간: ${oldestDate} ~ ${newestDate}`);
                        }
                    } catch (statsError) {
                        console.log(`📖 학습 통계 조회 실패: ${statsError.message}`);
                    }
                }
            } else {
                console.log(`⚠️ 일기장 시스템 비활성화 - 기본 기억 관리만 사용`);
            }
            
            // 👥 사람 학습 시스템 상태 확인
            if (initResult.modules.personLearning) {
                console.log(`👥 사람 학습 시스템 활성화 완료!`);
                
                if (initResult.modules.personLearning.getPersonLearningStats) {
                    const stats = initResult.modules.personLearning.getPersonLearningStats();
                    console.log(`👥 등록된 사람: ${stats.totalPersons}명, 총 만남: ${stats.totalMeetings}회`);
                }
            } else {
                console.log(`⚠️ 사람 학습 시스템 비활성화 - 기본 얼굴 인식만 사용`);
            }
            
            global.mukuModules = initResult.modules;
            
            setTimeout(() => {
                statusReporter.formatPrettyStatus(initResult.modules, getCurrentModelSetting, {
                    initialized: faceApiInitialized,
                    initializing: faceApiInitializing
                });
            }, 3000);
            
        } else {
            console.log(`⚠️ 일부 문제 발생 - 기본 모드로 계속 진행`);
            global.mukuModules = initResult.modules || {};
        }

        console.log(`📋 v14.3 MODULAR: 모듈 완전 분리 + 일기장 + 사람 학습 + 이미지 처리 안전성 강화`);

    } catch (error) {
        console.error(`🚨 시스템 초기화 에러: ${error.message}`);
        console.log(`⚡ 기본 모드로 계속 진행...`);
        global.mukuModules = {};
    }
}

// 라우트 설정 (일기장 + 사람 학습 시스템 연동)
function setupAllRoutes() {
    const modules = global.mukuModules || {};
    
    const faceApiStatus = {
        initialized: faceApiInitialized,
        initializing: faceApiInitializing
    };

    // 📖 일기장 + 👥 사람 학습 시스템을 routeHandlers에 전달
    routeHandlers.setupRoutes(
        app,
        config,
        modules,
        statusReporter,
        eventProcessor,
        client,
        faceMatcher,
        loadFaceMatcherSafely,
        getCurrentModelSetting,
        getVersionResponse,
        modules.enhancedLogging,
        faceApiStatus,
        modules.personLearning,  // 👥 사람 학습 시스템
        handleImageMessageSafely,  // 🚨 안전한 이미지 처리 함수
        modules.diarySystem  // 📖 일기장 시스템 추가
    );
}

// 서버 시작
const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`  무쿠 v14.3 MODULAR + PersonLearning + DiarySystem`);
    console.log(`  서버 시작 (포트 ${PORT})`);
    console.log(`  🌏 일본시간: ${getJapanTimeString()}`);
    console.log(`  ✨ GPT 모델: ${getCurrentModelSetting()}`);
    console.log(`  🕊️ 피앙새의 디지털 부활 프로젝트`);
    console.log(`  🗂️ 모듈 분리 완료: 4개 핵심 모듈 + 확장`);
    console.log(`  📖 신규: 일기장 시스템 (누적 학습 내용 조회)`);
    console.log(`  👥 기존: 투샷 + 장소 기억 시스템`);
    console.log(`  🚨 이미지 처리 안전성 강화 (벙어리 방지)`);
    console.log(`  💖 모든 기능 100% 유지 + 확장`);
    console.log(`  ⭐️ systemInitializer → muku-systemInitializer 변경`);
    console.log(`==================================================\n`);

    await initMuku();
    setupAllRoutes();
    
    setTimeout(async () => {
        console.log(`🤖 백그라운드 face-api 초기화 (사진 분석 + 사람 학습 + 일기장 연동)...`);
        await loadFaceMatcherSafely();
        
        // 👥 Face-api 초기화 완료 후 사람 학습 시스템과 연동 확인
        if (global.mukuModules && global.mukuModules.personLearning) {
            console.log(`👥 face-api ↔ personLearning 연동 확인 완료`);
        }
        
        // 📖 일기장 시스템 연동 확인
        if (global.mukuModules && global.mukuModules.diarySystem) {
            console.log(`📖 memoryManager ↔ diarySystem 연동 확인 완료`);
        }
        
    }, 5000);
});

// 에러 처리
process.on('uncaughtException', (error) => {
    console.error(`❌ 처리되지 않은 예외: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`❌ 처리되지 않은 Promise 거부: ${error}`);
});

// =================== 📖 일기장 시스템 관련 유틸리티 함수들 ===================

/**
 * 📊 일기장 시스템 상태 확인
 * @returns {Object} 일기장 시스템 상태
 */
async function getDiarySystemStatus() {
    const modules = global.mukuModules || {};
    
    if (!modules.diarySystem) {
        return {
            available: false,
            message: "일기장 시스템이 비활성화되어 있습니다."
        };
    }
    
    try {
        const stats = await modules.diarySystem.getDynamicLearningStats();
        return {
            available: true,
            stats: stats,
            message: `총 학습 기억: ${stats.total}개`
        };
    } catch (error) {
        return {
            available: false,
            message: `일기장 시스템 오류: ${error.message}`
        };
    }
}

/**
 * 📝 사용자 입력에서 일기장 명령어 처리
 * @param {string} userInput - 사용자 입력 텍스트
 * @param {Function} saveLogFunc - 로그 저장 함수
 * @returns {Object} 일기장 처리 결과
 */
async function handleDiaryCommand(userInput, saveLogFunc) {
    const modules = global.mukuModules || {};
    
    if (!modules.diarySystem) {
        return null;
    }
    
    try {
        console.log(`📖 [DiarySystem] 일기장 명령어 처리 시도: "${userInput}"`);
        
        const diaryResult = await modules.diarySystem.handleDiaryCommand(userInput, saveLogFunc);
        
        if (diaryResult) {
            console.log(`📖 [DiarySystem] 일기장 명령어 처리 성공`);
            return diaryResult;
        }
        
        return null;
        
    } catch (error) {
        console.error(`📖 [DiarySystem] 일기장 명령어 처리 실패: ${error.message}`);
        return null;
    }
}

/**
 * 📈 오늘 학습한 내용 간단 조회
 * @returns {Object} 오늘 학습 통계
 */
async function getTodayLearningStats() {
    const modules = global.mukuModules || {};
    
    if (!modules.diarySystem) {
        return null;
    }
    
    try {
        const todayEntries = await modules.diarySystem.getTodayLearning();
        return {
            count: todayEntries.length,
            entries: todayEntries
        };
    } catch (error) {
        console.error(`📖 [DiarySystem] 오늘 학습 통계 조회 실패: ${error.message}`);
        return null;
    }
}

// =================== 👥 사람 학습 시스템 관련 유틸리티 함수들 ===================

/**
 * 🧠 사람 학습 시스템 상태 확인
 * @returns {Object} 사람 학습 시스템 상태
 */
function getPersonLearningStatus() {
    const modules = global.mukuModules || {};
    
    if (!modules.personLearning) {
        return {
            available: false,
            message: "사람 학습 시스템이 비활성화되어 있습니다."
        };
    }
    
    try {
        const stats = modules.personLearning.getPersonLearningStats();
        return {
            available: true,
            stats: stats,
            message: `등록된 사람: ${stats.totalPersons}명, 총 만남: ${stats.totalMeetings}회`
        };
    } catch (error) {
        return {
            available: false,
            message: `사람 학습 시스템 오류: ${error.message}`
        };
    }
}

/**
 * 👥 사진에서 사람 분석 및 학습 처리
 * @param {string} base64Image - Base64 인코딩된 이미지
 * @param {string} userId - 사용자 ID
 * @returns {Object} 분석 및 학습 결과
 */
async function analyzePhotoForPersonLearning(base64Image, userId) {
    const modules = global.mukuModules || {};
    
    if (!modules.personLearning) {
        console.log(`👥 [PersonLearning] 시스템 비활성화 - 기본 얼굴 인식만 사용`);
        return null;
    }
    
    try {
        console.log(`👥 [PersonLearning] 사진 분석 및 사람 학습 처리 시작...`);
        
        const learningResult = await modules.personLearning.analyzeAndLearnPerson(base64Image, userId);
        
        if (learningResult) {
            console.log(`👥 [PersonLearning] 분석 완료: ${learningResult.type}`);
            
            if (learningResult.isLearning) {
                console.log(`👥 [PersonLearning] 학습 요청 상태 - 사용자 응답 대기`);
            } else if (learningResult.type === 'known_person_meeting') {
                console.log(`👥 [PersonLearning] 알려진 사람과의 만남: ${learningResult.personName} @ ${learningResult.location}`);
            }
            
            return learningResult;
        }
        
        return null;
        
    } catch (error) {
        console.error(`👥 [PersonLearning] 사진 분석 실패: ${error.message}`);
        return null;
    }
}

/**
 * 🎓 사용자 입력으로 사람 이름 학습
 * @param {string} userInput - 사용자 입력 텍스트
 * @param {string} userId - 사용자 ID
 * @returns {Object} 학습 결과
 */
async function learnPersonFromUserMessage(userInput, userId) {
    const modules = global.mukuModules || {};
    
    if (!modules.personLearning) {
        return null;
    }
    
    try {
        console.log(`👥 [PersonLearning] 사용자 입력에서 이름 학습 시도: "${userInput}"`);
        
        const learningResult = await modules.personLearning.learnPersonFromUserInput(userInput, userId);
        
        if (learningResult && learningResult.success) {
            console.log(`👥 [PersonLearning] 학습 성공: ${learningResult.personName} @ ${learningResult.location}`);
            return learningResult;
        }
        
        return null;
        
    } catch (error) {
        console.error(`👥 [PersonLearning] 사용자 입력 학습 실패: ${error.message}`);
        return null;
    }
}

// 모듈 내보내기 (일기장 + 사람 학습 관련 함수들 + 안전한 이미지 처리 추가)
module.exports = {
    client,
    getCurrentModelSetting,
    setModelSetting,
    getVersionResponse,
    getJapanTime,
    getJapanTimeString,
    loadFaceMatcherSafely,
    app,
    // 📖 일기장 시스템 관련 함수들
    getDiarySystemStatus,
    handleDiaryCommand,
    getTodayLearningStats,
    // 👥 사람 학습 시스템 관련 함수들
    getPersonLearningStatus,
    analyzePhotoForPersonLearning,
    learnPersonFromUserMessage,
    // 🚨 안전한 이미지 처리
    handleImageMessageSafely
};
