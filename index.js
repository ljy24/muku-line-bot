// LINE 응답 전송 함수 (v11.8.1 성공 방식 적용)
// 🎯 기능: 생성된 응답을 LINE 메신저를 통해 사용자에게 전송
// 📝 텍스트: 일반 텍스트 메시지 전송
// 📸 이미지: 이미지 + 캡션을 배열로 동시 전송 (400 에러 방지)
// 🛡️ 안전: URL 검증, 에러 처리, 폴백 시스템 완비
// 🎨 로깅: 전송 상태를 컬러 로그로 표시
// 🔄 폴백: 전송 실패시 텍스트 메시지로 대체 전송// 메인 이벤트 핸들러 함수
// 🎯 기능: LINE에서 수신된 이벤트를 타입별로 분류하여 처리
// 📝 텍스트: 사용자 텍스트 메시지 → 명령어 처리 또는 AI 대화 응답
// 📸 이미지: 업로드된 이미지 → 얼굴 인식 후 감정 반응 생성
// 📎 기타: 스티커, 파일 등 → 적절한 반응 메시지 생성
// 👤 사용자: userId를 통한 사용자 식별 및 개인화된 응답
// 🔄 컨텍스트: 모든 대화 내용을 기억 시스템에 저장// 예쁜 상태 리포트 출력 함수  
// 🎯 기능: 예진이 봇의 현재 상태를 예쁜 이모지와 색상으로 표시
// 🩸 생리주기: 현재 생리 상태 및 다음 예정일 표시
// 😊 감정상태: 현재 감정과 강도(1-10) 표시
// 🧠 기억관리: 전체 기억 개수와 오늘 새로 배운 기억 표시  
// 🚬 담타상태: 다음 담타 시간과 확률 표시
// 📸 사진전송: 다음 셀카/추억사진 전송 예정 시간
// 🌸 감성메시지: 다음 감성 메시지 전송 예정 시간
// 🔍 얼굴인식: AI 시스템 준비 상태 표시
// 🎨 색상: PMS는 굵은 빨간색으로 강조 표시// 🚬 담타 시간 계산 함수
// 🎯 기능: 다음 담타(담배+라인) 시간까지 남은 시간 계산
// ⏰ 활성 시간: 일본시간 10시-18시 (아저씨 근무 시간)
// 🎲 확률: 15분마다 체크, 15% 확률로 담타 메시지 전송
// 📊 상태: 'waiting'(대기중) 또는 'active'(활성중) 반환
// 🌏 모든 계산은 일본시간(JST) 기준으로 수행// 🕐 시간 계산 유틸리티 함수
// 🎯 기능: 남은 시간을 사용자 친화적인 한국어 형식으로 변환
// ⏰ 분 단위로 입력받아 "X분", "X시간 Y분" 형태로 반환
// 📊 상태 리포트에서 다음 이벤트까지 남은 시간 표시용// ============================================================================
// index.js - v13.3 (face-api 지연 로딩 추가 버전)
// ✅ 대화 색상: 아저씨(하늘색), 예진이(연보라색), PMS(굵은 빨간색)
// 🌏 모든 시간은 일본시간(JST, UTC+9) 기준으로 동작합니다
// 🔍 face-api: 지연 로딩으로 TensorFlow 크래시 방지
// 
// 🎯 주요 기능들:
// 📱 LINE Bot 웹훅 처리 (/webhook 엔드포인트)
// 🤖 AI 대화 응답 시스템 (OpenAI GPT 기반)
// 📸 사진 전송 시스템 (셀카, 컨셉사진, 추억사진)
// 🔍 얼굴 인식 시스템 (face-api.js 기반)
// 💬 명령어 처리 시스템 (사진 요청, 기분 질문 등)
// 🧠 기억 관리 시스템 (고정 기억 + 동적 기억)
// 😊 감정 상태 관리 (생리주기 연동)
// 🩸 생리주기 계산 및 감정 연동
// 📅 자동 스케줄링 (사진 전송, 감정 메시지)
// 🎨 예쁜 컬러 로그 시스템
// 🌏 일본시간(JST) 기준 시간 처리
// 🛡️ 에러 처리 및 폴백 시스템
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
// 🎯 기능: Node.js 프로세스 전체 시간대를 일본시간으로 통일
// 📍 아저씨의 위치: 일본 기타큐슈, 후쿠오카현
// 🕐 모든 스케줄러, 로그, 시간 계산이 일본시간 기준으로 동작
// ================================================================================
process.env.TZ = 'Asia/Tokyo'; // Node.js 프로세스 전체 시간대 설정
const JAPAN_TIMEZONE = 'Asia/Tokyo';
const TIMEZONE_OFFSET = 9; // UTC+9

// 🌏 일본시간 헬퍼 함수들
// 🎯 기능: 다른 모듈에서 사용할 수 있는 일본시간 유틸리티 함수들
// 📅 getJapanTime(): 현재 일본시간을 Date 객체로 반환
// 📝 getJapanTimeString(): 일본시간을 한국어 형식 문자열로 반환
// ⏰ getJapanHour(): 현재 일본시간의 시간(0-23) 반환
// ⏱️ getJapanMinute(): 현재 일본시간의 분(0-59) 반환
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
// 🎯 기능: 예진이 봇의 핵심 기능들을 담당하는 모듈들
// 💬 autoReply: AI 대화 응답 생성 (OpenAI GPT 기반)
// 🛠️ commandHandler: 사용자 명령어 처리 (셀카줘, 컨셉사진줘 등)
// 🗃️ memoryManager: 고정 기억 관리 시스템
// 🧠 ultimateContext: 동적 대화 기억 및 컨텍스트 관리
// 🎭 emotionalContextManager: 감정 상태 및 생리주기 관리
// 😤 sulkyManager: 삐짐 상태 관리
// 📅 scheduler: 자동 메시지 스케줄링
// 📸 spontaneousPhoto: 자발적 사진 전송 시스템
// 🔍 photoAnalyzer: 사진 분석 및 얼굴 인식
// 📊 enhancedLogging: 향상된 로그 시스템
// ================================================================
let autoReply, commandHandler, memoryManager, ultimateContext;
let moodManager, sulkyManager, scheduler, spontaneousPhoto, photoAnalyzer;
let enhancedLogging, emotionalContextManager;

// 🔍 face-api 지연 로딩 변수들
// 🎯 기능: TensorFlow 크래시 방지를 위한 안전한 얼굴 인식 시스템
// 🤖 faceMatcher: 얼굴 인식 모듈 (필요시에만 로드)
// ✅ faceApiInitialized: 초기화 완료 상태 플래그
// ⏳ faceApiInitializing: 초기화 진행 중 상태 플래그
// 🔄 지연 로딩: 이미지 전송시에만 AI 모델 로드하여 메모리 절약
let faceMatcher = null;
let faceApiInitialized = false;
let faceApiInitializing = false;

// ================== 🎨 색상 정의 ==================
// 🎯 기능: 콘솔 로그에 예쁜 색상을 적용하여 가독성 향상
// 🌀 ajeossi: 하늘색 - 아저씨의 메시지 표시
// 💜 yejin: 연보라색 - 예진이의 메시지 표시  
// 🔴 pms: 굵은 빨간색 - PMS 관련 상태 강조 표시
// 🟢 system: 연초록색 - 시스템 메시지 표시
// 🔴 error: 빨간색 - 에러 메시지 표시
// 🔄 reset: 색상 리셋 - 색상 초기화
// =========================================================
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
// 🎯 기능: TensorFlow 크래시 방지를 위한 안전한 얼굴 인식 시스템
// ⚡ 지연 로딩: 서버 시작시 바로 로드하지 않고 필요시에만 로드
// 🤖 AI 모델: 예진이와 아저씨 얼굴을 구분할 수 있는 학습된 모델
// 🛡️ 안전 장치: 로딩 실패시에도 봇이 정상 동작하도록 폴백 처리
// 🔄 중복 방지: 이미 초기화 중이면 추가 로딩 시도하지 않음
// 📸 사용 시점: 사용자가 이미지를 전송했을 때만 동작
// ========================================================================
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
// 🎯 기능: 업로드된 이미지에서 얼굴을 인식하고 예진이/아저씨 구분
// 🔍 입력: base64 인코딩된 이미지 데이터
// 🎭 출력: '예진이', '아저씨', 또는 null(인식 실패)
// 🛡️ 안전: faceMatcher 로딩 실패시에도 에러 없이 null 반환
// 🤖 AI 모델: 사전 학습된 얼굴 인식 모델로 정확도 향상
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
// 🎯 기능: 예진이 봇의 모든 핵심 모듈들을 순서대로 안전하게 로딩
// 🔄 순서: 1.대화응답 → 2.기억관리 → 3.동적기억 → 4.명령어 → 5.감정관리 → 6.기분관리 → 7.로깅 → 8.사진전송 → 9.사진분석
// 🛡️ 안전: 각 모듈 로딩 실패시에도 다른 모듈에 영향 없이 계속 진행
// 📊 결과: 로딩 성공/실패 현황을 컬러 로그로 표시
// ⚡ 최적화: 필수 모듈 우선 로딩으로 빠른 봇 응답 보장
// ================================================================
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
// 🎯 기능: 예진이의 기억 시스템들을 초기화하고 연동
// 🗃️ 고정 기억: memoryManager에서 변하지 않는 핵심 기억들 로드
// 🧠 동적 기억: ultimateContext에서 대화를 통해 학습한 기억들 로드
// 🎭 감정 상태: emotionalContextManager에서 생리주기 및 감정 상태 초기화
// 🔄 연동: 각 시스템이 서로 정보를 공유할 수 있도록 연결
// 📊 통계: 로딩된 기억 개수와 상태를 로그로 표시
// ================================================================
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
// 🎯 기능: LINE Bot API 클라이언트 및 Express 서버 설정
// 🔑 인증: 환경변수에서 LINE 채널 토큰과 시크릿 로드
// 🌐 서버: Express 웹서버로 LINE 웹훅 엔드포인트 제공
// 📱 채널: LINE 공식 계정과 연동하여 메시지 송수신
// =========================================================
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// ================== 📨 메시지 처리 (webhook 경로로 변경) ==================
// 🎯 기능: LINE에서 전송되는 모든 메시지와 이벤트를 처리하는 핵심 엔드포인트
// 🌐 경로: POST /webhook (LINE Developers Console에 등록된 경로)
// 📱 처리: 텍스트 메시지, 이미지, 스티커 등 모든 LINE 메시지 타입 지원
// 🔄 흐름: 메시지 수신 → 이벤트 타입 확인 → 적절한 핸들러로 라우팅
// 🛡️ 안전: 에러 발생시에도 LINE 서버에 정상 응답하여 재전송 방지
// ==================================================================================
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

        // 텍스트 메시지 처리 로직
        // 🎯 기능: 사용자의 텍스트 메시지를 분석하여 적절한 응답 생성
        // 🛠️ 1단계: 명령어 처리 (셀카줘, 컨셉사진줘, 추억사진줘 등)
        // 🤖 2단계: AI 대화 응답 (OpenAI GPT 기반 자연스러운 대화)
        // 🛡️ 3단계: 폴백 응답 (시스템 준비 중 메시지)
        if (userMessage.type === 'text') {
            console.log(`${colors.ajeossi}💬 아저씨: ${userMessage.text}${colors.reset}`);

            // 명령어 처리 확인
            // 🎯 기능: 특정 키워드에 대한 즉시 응답 (셀카, 컨셉사진, 추억사진 등)
            // 📸 지원 명령어: "셀카줘", "컨셉사진줘", "추억사진줘", "기분어때" 등
            // ⚡ 우선 처리: AI 대화보다 먼저 처리하여 빠른 응답 제공
            // 🔄 handled 플래그: 명령어 처리 완료시 일반 대화 응답 스킵
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
            // 🎯 기능: OpenAI GPT를 활용한 자연스러운 AI 대화 응답
            // 🧠 컨텍스트: 기억 시스템과 감정 상태를 반영한 개인화된 응답
            // 💬 말투: 예진이의 고유한 말투와 성격을 유지하는 응답 생성
            // 🎭 감정: 현재 생리주기와 감정 상태에 따른 적절한 톤 적용
            if (autoReply && autoReply.getReplyByMessage) {
                try {
                    const botResponse = await autoReply.getReplyByMessage(userMessage.text);
                    return sendReply(event.replyToken, botResponse);
                } catch (error) {
                    console.log(`${colors.error}⚠️ 대화 응답 에러: ${error.message}${colors.reset}`);
                }
            }

            // 폴백 응답
            // 🎯 기능: 명령어나 AI 응답이 모두 실패했을 때의 안전망
            // 💬 내용: 시스템 준비 중임을 알리는 친근한 메시지
            // 🛡️ 안전: 어떤 상황에서도 사용자가 응답을 받을 수 있도록 보장
            return sendReply(event.replyToken, {
                type: 'text',
                comment: '아저씨~ 나 지금 시스템 준비 중이야... 조금만 기다려줘! ㅎㅎ'
            });
        }

        // 🖼️ 이미지 메시지 처리 (face-api 사용)
        // 🎯 기능: 사용자가 업로드한 이미지를 분석하여 감정적 반응 생성
        // 📥 다운로드: LINE 서버에서 이미지 데이터를 가져와 base64로 변환
        // 🔍 얼굴 인식: AI 모델로 예진이/아저씨/기타 인물 구분
        // 💬 반응 생성: 인식 결과에 따른 개인화된 감정 반응 메시지
        // 📊 로깅: 이미지 크기와 인식 결과를 로그로 기록
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
                // 🎯 기능: 지연 로딩된 face-api로 안전하게 얼굴 인식 수행
                // 🤖 AI 처리: 업로드된 이미지에서 얼굴 특징 추출 및 비교
                // 🛡️ 안전: AI 모델 로딩 실패시에도 기본 응답 제공
                // 📊 결과: '예진이', '아저씨', 또는 null(인식 실패) 반환
                const faceResult = await detectFaceSafely(base64);
                console.log(`${colors.system}🎯 얼굴 인식 결과: ${faceResult || '인식 실패'}${colors.reset}`);

                // 결과에 따른 응답 생성
                // 🎯 기능: 얼굴 인식 결과에 따른 개인화된 감정 반응 생성
                // 💜 예진이 사진: 자신의 사진임을 인식하고 귀여운 반응
                // 💙 아저씨 사진: 남자친구 사진에 대한 애정 어린 반응  
                // ❓ 기타/실패: 호기심 어린 반응 또는 재요청 메시지
                // 🎲 랜덤: 각 카테고리별로 여러 응답 중 랜덤 선택
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

        // 기타 메시지 타입 처리
        // 🎯 기능: 텍스트/이미지 외의 메시지 타입에 대한 반응
        // 📎 지원 타입: 스티커, 오디오, 비디오, 파일, 위치 등
        // 💬 반응: 해당 타입을 처리할 수 없음을 귀엽게 알리는 메시지
        // 🎲 랜덤: 여러 반응 메시지 중 랜덤 선택으로 자연스러움 연출
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
            // 🔧 v11.8.1 성공 방식 적용: 이미지 + 텍스트 배열 전송
            const imageUrl = botResponse.originalContentUrl || botResponse.imageUrl;
            const previewUrl = botResponse.previewImageUrl || botResponse.previewUrl || imageUrl;
            const caption = botResponse.caption || botResponse.altText || '사진이야!';
            
            if (!imageUrl) {
                console.error('❌ 이미지 URL이 없음:', botResponse);
                replyMessage = { type: 'text', text: '아저씨... 사진 준비하는데 문제가 생겼어 ㅠㅠ' };
            } else {
                // URL 검증
                try {
                    new URL(imageUrl);
                    console.log(`📸 [이미지전송] URL 검증 완료: ${imageUrl.substring(0, 50)}...`);
                    
            // 🎯 성공 방식: 이미지와 캡션을 배열로 동시 전송
            // 📸 방법: v11.8.1에서 검증된 안정적인 이미지 전송 방식 적용
            // 🛡️ 안전: LINE API 400 에러 방지를 위한 필드 순서 최적화
            // 💬 배열: [이미지 객체, 텍스트 객체] 순서로 전송하여 안정성 확보
                    await client.replyMessage(replyToken, [
                        {
                            type: 'image',
                            originalContentUrl: imageUrl,
                            previewImageUrl: previewUrl
                        },
                        {
                            type: 'text',
                            text: caption
                        }
                    ]);
                    
                    console.log(`${colors.yejin}📸 예진이: 이미지 + 텍스트 전송 성공${colors.reset}`);
                    console.log(`${colors.yejin}💕 예진이: ${caption}${colors.reset}`);
                    return; // 성공시 함수 종료
                    
                } catch (urlError) {
                    console.error('❌ 잘못된 이미지 URL:', imageUrl);
                    replyMessage = { type: 'text', text: '아저씨... 사진 URL이 잘못되었어 ㅠㅠ' };
                }
            }
        } else {
            replyMessage = { type: 'text', text: '아저씨~ 뭔가 말하고 싶은데 말이 안 나와... ㅠㅠ' };
        }

        // 텍스트 메시지 전송 (이미지가 아닌 경우)
        // 🎯 기능: 일반 텍스트 메시지를 LINE으로 전송
        // 📝 처리: 문자열 또는 객체 형태의 텍스트 응답 처리
        // 🔤 타입: 응답 타입 확인 및 로그 출력
        if (replyMessage) {
            console.log(`🔄 [LINE전송] 메시지 타입: ${replyMessage.type}`);
            await client.replyMessage(replyToken, replyMessage);
            
            if (replyMessage.type === 'text') {
                console.log(`${colors.yejin}💕 예진이: ${replyMessage.text}${colors.reset}`);
            }
        }

    } catch (error) {
        console.error(`${colors.error}❌ 응답 전송 실패: ${error.message}${colors.reset}`);
        console.error(`${colors.error}📄 응답 내용: ${JSON.stringify(botResponse, null, 2)}${colors.reset}`);
        
        // 🔧 에러 발생시 텍스트로 폴백
        // 🎯 기능: 이미지 전송 실패시 사용자에게 알리는 안전망
        // 🛡️ 안전: 어떤 상황에서도 사용자가 응답을 받을 수 있도록 보장
        // 📊 로깅: 상세한 에러 정보와 응답 내용을 개발자용 로그로 기록
        try {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '아저씨... 뭔가 문제가 생겼어. 다시 시도해볼래? ㅠㅠ'
            });
            console.log(`${colors.yejin}💕 예진이: (폴백) 에러 메시지 전송${colors.reset}`);
        } catch (fallbackError) {
            console.error(`${colors.error}❌ 폴백 메시지도 실패: ${fallbackError.message}${colors.reset}`);
        }
    }
}

// ================== 🚀 시스템 초기화 ==================
// 🎯 기능: 예진이 봇의 모든 시스템을 순서대로 초기화하는 메인 함수
// 📦 1단계: 모든 모듈 로드 (대화, 기억, 감정, 사진 등)
// 🧠 2단계: 기억 시스템 초기화 (고정 기억 + 동적 기억)
// 📅 3단계: 스케줄러 시스템 활성화 (자동 메시지)
// 📸 4단계: 자발적 사진 전송 시스템 활성화
// 🎭 5단계: 감정 및 상태 시스템 동기화
// 🔍 6단계: face-api 백그라운드 준비 (지연 로딩)
// 🎨 로깅: 각 단계별 진행 상황을 컬러 로그로 표시
// ================================================================
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
        // 🎯 기능: 예진이가 자발적으로 셀카와 추억사진을 보내는 스케줄러 시작
        // ⏰ 주기: 셀카(3시간마다 30% 확률), 추억사진(6시간마다 15% 확률)  
        // 🌏 시간: 일본시간 기준으로 활동 시간(9시-23시)에만 전송
        // 🎭 감정: 현재 감정 상태에 맞는 메시지와 함께 사진 전송
        // 🔗 연동: LINE client와 userId를 전달하여 실제 전송 가능
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
// 🎯 기능: 봇 상태 확인 및 헬스체크를 위한 웹 엔드포인트들
// 🌐 GET /: 봇 기본 정보 및 현재 상태 표시 (웹 브라우저 접근 가능)
// 💊 GET /health: 헬스체크 엔드포인트 (서버 모니터링용)
// 📊 상태 정보: 버전, 시간, face-api 상태, 가동시간 등 표시
// 🎨 스타일: 사용자 친화적인 HTML 스타일링 적용
// =========================================================
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
// 🎯 기능: Express 서버를 지정된 포트에서 시작하고 초기화 실행
// 🌐 포트: 환경변수 PORT 또는 기본값 10000 사용
// 📊 배너: 서버 시작시 예쁜 배너와 주요 기능 목록 표시
// 🎨 로깅: 컬러풀한 로그로 시작 상태와 주요 변경사항 표시
// ⚡ 비동기: 서버 시작 후 별도로 초기화 함수 실행
// ====================================================
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
// 🎯 기능: 예상치 못한 에러 발생시 서버 안정성을 유지하는 글로벌 에러 핸들러
// 💥 uncaughtException: 처리되지 않은 예외 상황에 대한 로깅 및 안전 처리
// 🚫 unhandledRejection: 처리되지 않은 Promise 거부에 대한 로깅 및 안전 처리
// 📊 로깅: 에러 메시지와 스택 트레이스를 상세히 기록
// 🛡️ 안전: 에러 발생시에도 서버가 완전히 죽지 않도록 보호
// ================================================================
process.on('uncaughtException', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 예외: ${error.message}${colors.reset}`);
    console.error(`${colors.error}스택: ${error.stack}${colors.reset}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`${colors.error}❌ 처리되지 않은 Promise 거부: ${error}${colors.reset}`);
});

// ================== 📤 모듈 내보내기 ==================
// 🎯 기능: 다른 모듈에서 사용할 수 있도록 핵심 함수와 객체들을 내보냄
// 📱 client: LINE Bot API 클라이언트 (다른 모듈에서 메시지 전송용)
// 📊 함수들: 상태 표시, 모듈 로딩, 초기화 함수들
// 🎨 colors: 컬러 로그 객체 (다른 모듈에서 일관된 색상 사용)
// 🌏 시간: 일본시간 헬퍼 함수들 (다른 모듈에서 시간 계산용)
// 🔍 얼굴인식: face-api 관련 함수들 (다른 모듈에서 얼굴 인식용)
// ================================================================
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
