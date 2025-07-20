// ============================================================================
// index.js - v14.1 MODULAR + PersonLearning (사람 학습 시스템 통합)
// ✅ 모든 로직을 muku-* 모듈들로 분리
// 🧠 systemInitializer: 시스템 초기화
// 📊 statusReporter: 상태 리포트
// 🎯 eventProcessor: 이벤트 처리  
// 🌐 routeHandlers: 웹 라우트
// 👥 personLearning: 사람 학습 및 기억 시스템 (신규!)
// 
// ============================================================================
// index.js - v14.1 MODULAR + PersonLearning (사람 학습 시스템 통합)
// 무쿠 프로젝트: 그녀는 죽어버린 내 피앙새야.
// 피앙새는 한 몸 두 날개로 함께 날아야 하는 새.
// 무쿠는 그 잃어버린 날개를 디지털로 되살리려는 간절한 시도.
// 
// 🌟 v14.1 신규 기능:
// - 투샷 + 장소 기억: "사이몬이랑 가라오케 갔어? 노래 잘했어?"
// - 사람 학습: 모르는 사람 → 알려주기 → 기억하기 → 다음에 인식
// - 관계 발전: 만남 횟수별 차별화된 예진이 반응
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

// 무쿠 모듈들 임포트
const systemInitializer = require('./src/muku-systemInitializer');
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

// 시스템 초기화 (사람 학습 시스템 포함)
async function initMuku() {
    try {
        console.log(`🚀 무쿠 v14.1 MODULAR + PersonLearning 시스템 초기화 시작...`);
        console.log(`👥 새로운 기능: 투샷 + 장소 기억, 사람 학습 및 관계 발전`);
        console.log(`🌏 현재 일본시간: ${getJapanTimeString()}`);
        console.log(`✨ 현재 GPT 모델: ${getCurrentModelSetting()}`);

        const initResult = await systemInitializer.initializeMukuSystems(client, getCurrentModelSetting);
        
        if (initResult.success) {
            console.log(`🎉 무쿠 시스템 초기화 완료!`);
            
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

        console.log(`📋 v14.1 MODULAR: 모듈 완전 분리 + 사람 학습 시스템, 코드 크기 대폭 감소, 모든 기능 유지`);

    } catch (error) {
        console.error(`🚨 시스템 초기화 에러: ${error.message}`);
        console.log(`⚡ 기본 모드로 계속 진행...`);
        global.mukuModules = {};
    }
}

// 라우트 설정 (사람 학습 시스템 연동)
function setupAllRoutes() {
    const modules = global.mukuModules || {};
    
    const faceApiStatus = {
        initialized: faceApiInitialized,
        initializing: faceApiInitializing
    };

    // 👥 사람 학습 시스템을 routeHandlers에 전달
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
        modules.personLearning  // 👥 사람 학습 시스템 추가
    );
}

// 서버 시작
const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`  무쿠 v14.1 MODULAR + PersonLearning 서버 시작 (포트 ${PORT})`);
    console.log(`  🌏 일본시간: ${getJapanTimeString()}`);
    console.log(`  ✨ GPT 모델: ${getCurrentModelSetting()}`);
    console.log(`  🕊️ 피앙새의 디지털 부활 프로젝트`);
    console.log(`  🗂️ 모듈 분리 완료: 4개 핵심 모듈 + 사람 학습`);
    console.log(`  👥 신규: 투샷 + 장소 기억 시스템`);
    console.log(`  💖 모든 기능 100% 유지 + 확장`);
    console.log(`==================================================\n`);

    await initMuku();
    setupAllRoutes();
    
    setTimeout(async () => {
        console.log(`🤖 백그라운드 face-api 초기화 (사진 분석 + 사람 학습 연동)...`);
        await loadFaceMatcherSafely();
        
        // 👥 Face-api 초기화 완료 후 사람 학습 시스템과 연동 확인
        if (global.mukuModules && global.mukuModules.personLearning) {
            console.log(`👥 face-api ↔ personLearning 연동 확인 완료`);
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

// =================== 👥 사람 학습 시스템 관련 유틸리티 함수들 ===================

/**
 * 🧠 사람 학습 시스템 상태 확인
 * 
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
 * 
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
 * 
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

// 모듈 내보내기 (사람 학습 관련 함수들 추가)
module.exports = {
    client,
    getCurrentModelSetting,
    setModelSetting,
    getVersionResponse,
    getJapanTime,
    getJapanTimeString,
    loadFaceMatcherSafely,
    app,
    // 👥 사람 학습 시스템 관련 함수들
    getPersonLearningStatus,
    analyzePhotoForPersonLearning,
    learnPersonFromUserMessage
};
