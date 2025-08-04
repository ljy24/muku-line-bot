// ============================================================================
// spontaneousYejinManager.js - v2.4 ENHANCED (개선된 사진 분석 시스템 통합)
// 🌸 예진이가 능동적으로 하루 15번 메시지 보내는 시스템
// 💾 NEW: 영구 저장 기능 (/data/message_status.json)
// 📅 NEW: 균등 분산 스케줄링 (1시간 8분 간격 ±15분 랜덤)
// 🎯 NEW: 1452장 Vision API 분석 기반 정확한 사진-메시지 매칭!
// 💪 완벽한 인물 구분: indoor=예진이, outdoor=아저씨, portrait=세밀분석
// 🚫 존댓말 문제 완전 해결: 분석 기반 반말 메시지
// ✅ 기존 기능 완전 보존 + 안전성 강화
// ============================================================================

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✅ [spontaneousYejin] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [spontaneousYejin] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// ⭐️ ultimateConversationContext 연동을 위한 지연 로딩
let ultimateContext = null;
function getUltimateContext() {
    if (!ultimateContext) {
        try {
            ultimateContext = require('./ultimateConversationContext');
            console.log('✅ [spontaneousYejin] ultimateConversationContext 연동 성공');
        } catch (error) {
            console.warn('⚠️ [spontaneousYejin] ultimateConversationContext 연동 실패:', error.message);
        }
    }
    return ultimateContext;
}

// 🎯 NEW: 개선된 사진 시스템 연동
let enhancedPhotoSystem = null;
try {
    enhancedPhotoSystem = require('./enhancedPhotoSystem');
    console.log('✅ [spontaneousYejin] 개선된 사진 시스템 로딩 성공');
} catch (error) {
    console.warn('⚠️ [spontaneousYejin] 개선된 사진 시스템 로딩 실패 - 기존 시스템 사용:', error.message);
}

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const USER_ID = process.env.LINE_TARGET_USER_ID;
const DAILY_MESSAGE_COUNT = 15;
const MESSAGE_START_HOUR = 8;    // 오전 8시
const MESSAGE_END_HOUR = 25;     // 새벽 1시 (다음날)

// 💾 NEW: 영구 저장 경로
const MESSAGE_STATUS_FILE = '/data/message_status.json';

// LINE 클라이언트
let lineClient = null;

// OpenAI 클라이언트
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ================== 📊 일일 스케줄 상태 (⭐️ 실제 통계 추적 강화!) ==================
let dailyScheduleState = {
    // 기본 스케줄 정보
    todaySchedule: [],
    sentToday: 0,
    lastScheduleDate: null,
    jobs: [],
    photoJobs: [], // 독립 사진 스케줄
    
    // ⭐️ 실제 통계 추적 추가!
    realStats: {
        sentTimes: [],             // 실제 전송된 시간들
        messageTypes: {            // 메시지 타입별 통계
            emotional: 0,          // 감성 메시지
            casual: 0,             // 일상 메시지
            caring: 0,             // 걱정/관심 메시지
            playful: 0             // 장난스러운 메시지
        },
        lastSentTime: null,        // 마지막 전송 시간
        nextScheduledTime: null,   // 다음 예정 시간
        lastResetDate: null,       // 마지막 리셋 날짜
        totalDaily: DAILY_MESSAGE_COUNT, // 하루 목표
        
        // 성능 통계
        successfulSends: 0,        // 성공한 전송
        failedSends: 0,            // 실패한 전송
        photoSends: 0,             // 사진 전송 횟수
        textOnlySends: 0           // 텍스트만 전송 횟수
    }
};

// ================== 🎨 로그 함수 ==================
function spontaneousLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [예진이능동] ${message}`);
    if (data) {
        console.log('  📱 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== 💾 NEW: 영구 저장 기능 ==================
async function saveMessageState() {
    try {
        // 디렉토리가 없으면 생성
        const dir = path.dirname(MESSAGE_STATUS_FILE);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            spontaneousLog('📁 /data 디렉토리 생성 완료');
        }

        const stateToSave = {
            sentToday: dailyScheduleState.sentToday,
            lastScheduleDate: dailyScheduleState.lastScheduleDate,
            realStats: dailyScheduleState.realStats,
            todaySchedule: dailyScheduleState.todaySchedule,
            lastSaved: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
            version: '2.4'
        };

        await fs.writeFile(MESSAGE_STATUS_FILE, JSON.stringify(stateToSave, null, 2));
        spontaneousLog(`💾 메시지 상태 저장 완료: ${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT}건`);
        return true;
    } catch (error) {
        spontaneousLog(`❌ 메시지 상태 저장 실패: ${error.message}`);
        return false;
    }
}

async function loadMessageState() {
    try {
        const data = await fs.readFile(MESSAGE_STATUS_FILE, 'utf8');
        const savedState = JSON.parse(data);
        
        const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
        
        // 오늘 날짜가 맞는지 확인
        if (savedState.lastScheduleDate === today) {
            // 오늘 데이터 복원
            dailyScheduleState.sentToday = savedState.sentToday || 0;
            dailyScheduleState.lastScheduleDate = savedState.lastScheduleDate;
            if (savedState.realStats) {
                dailyScheduleState.realStats = { ...dailyScheduleState.realStats, ...savedState.realStats };
            }
            if (savedState.todaySchedule) {
                dailyScheduleState.todaySchedule = savedState.todaySchedule;
            }
            
            spontaneousLog(`💾 메시지 상태 복원 성공: ${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT}건 (${savedState.lastSaved})`);
            return true;
        } else {
            spontaneousLog(`📅 새로운 날 시작 - 이전 데이터: ${savedState.lastScheduleDate}, 오늘: ${today}`);
            return false;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            spontaneousLog('💾 저장된 메시지 상태 파일이 없음 - 새로 시작');
        } else {
            spontaneousLog(`❌ 메시지 상태 로딩 실패: ${error.message}`);
        }
        return false;
    }
}

// ================== 📅 NEW: 균등 분산 스케줄링 함수 ==================
function generateDailyMessageSchedule() {
    spontaneousLog('📅 균등 분산 메시지 스케줄 생성 시작...');
    
    const schedules = [];
    const startHour = MESSAGE_START_HOUR; // 8시
    const totalHours = 17; // 8시-새벽1시 = 17시간
    const intervalMinutes = Math.floor((totalHours * 60) / DAILY_MESSAGE_COUNT); // 약 68분
    
    spontaneousLog(`⏰ 계산된 기본 간격: ${intervalMinutes}분`);
    
    for (let i = 0; i < DAILY_MESSAGE_COUNT; i++) {
        // 기본 시간 계산
        const baseMinutes = i * intervalMinutes;
        
        // ±15분 랜덤 변동
        const randomOffset = Math.floor(Math.random() * 31) - 15; // -15 ~ +15분
        const totalMinutes = baseMinutes + randomOffset;
        
        // 시간 계산 (8시부터 시작)
        const hour = startHour + Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        
        // 24시간 넘으면 다음날로 (새벽 시간대)
        let finalHour = hour;
        if (hour >= 24) {
            finalHour = hour - 24;
        }
        
        // 유효 시간 범위 체크 (8시-새벽1시)
        if ((finalHour >= MESSAGE_START_HOUR) || (finalHour >= 0 && finalHour <= 1)) {
            schedules.push({ 
                hour: finalHour, 
                minute: minute,
                originalIndex: i,
                calculatedTime: `${finalHour}:${String(minute).padStart(2, '0')}`
            });
        }
    }
    
    // 시간순 정렬
    schedules.sort((a, b) => {
        const aMinutes = a.hour < MESSAGE_START_HOUR ? a.hour + 24 : a.hour;
        const bMinutes = b.hour < MESSAGE_START_HOUR ? b.hour + 24 : b.hour;
        return (aMinutes * 60 + a.minute) - (bMinutes * 60 + b.minute);
    });
    
    spontaneousLog(`✅ 균등 분산 스케줄 ${schedules.length}개 생성 완료`);
    spontaneousLog(`📋 생성된 시간: ${schedules.map(s => s.calculatedTime).join(', ')}`);
    
    return schedules;
}

// ================== 🔧 이미지 URL 검증 함수 ==================
function validateImageUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') return false;
        return /\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(url);
    } catch {
        return false;
    }
}

// ================== 🔍 메시지 타입 분석 함수 ==================
function analyzeMessageType(message) {
    if (!message || typeof message !== 'string') {
        return 'casual';
    }
    
    const msg = message.toLowerCase();
    
    // 감정 표현 패턴
    if (msg.includes('사랑') || msg.includes('보고싶') || msg.includes('그리워') || msg.includes('좋아해')) {
        return 'emotional';
    }
    
    // 걱정/관심 패턴
    if (msg.includes('괜찮') || msg.includes('걱정') || msg.includes('힘들') || msg.includes('피곤')) {
        return 'caring';
    }
    
    // 장난스러운 패턴
    if (msg.includes('ㅋㅋ') || msg.includes('ㅎㅎ') || msg.includes('히히') || msg.includes('장난')) {
        return 'playful';
    }
    
    // 모델링/작업 관련
    if (msg.includes('촬영') || msg.includes('작업') || msg.includes('화보') || msg.includes('스케줄')) {
        return 'work';
    }
    
    // 기본값
    return 'casual';
}

// ================== ✨ GPT 모델 선택 및 문장 수 제한 시스템 ==================

function selectOptimalModel(situation, includeComplexContext = false) {
    if (!getCurrentModelSetting) {
        return 'gpt-4o'; // 기본값
    }
    const currentSetting = getCurrentModelSetting();
    switch(currentSetting) {
        case '3.5':
            return 'gpt-3.5-turbo';
        case '4.0':
            return 'gpt-4o';
        case 'auto':
            if (includeComplexContext || 
                situation.type === 'modeling' || 
                situation.type === 'emotion' ||
                situation.type === 'mentalHealth') {
                return 'gpt-4o';
            } else {
                return 'gpt-3.5-turbo';
            }
        default:
            return 'gpt-4o';
    }
}

function countSentences(text) {
    if (!text) return 0;
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    return sentences.length;
}

function validateMessageLength(message) {
    const sentenceCount = countSentences(message);
    
    // 존댓말 검사
    const jondaemmalPatterns = [
        /요(?:\s|$|\.|\!|\?)/g, /니다(?:\s|$|\.|\!|\?)/g, /습니다(?:\s|$|\.|\!|\?)/g,
        /세요(?:\s|$|\.|\!|\?)/g, /해요(?:\s|$|\.|\!|\?)/g, /어요(?:\s|$|\.|\!|\?)/g,
        /아요(?:\s|$|\.|\!|\?)/g, /이에요(?:\s|$|\.|\!|\?)/g, /예요(?:\s|$|\.|\!|\?)/g, /죠(?:\s|$|\.|\!|\?)/g
    ];
    
    const hasJondaemal = jondaemmalPatterns.some(pattern => pattern.test(message));
    
    // 이모티콘 개수 검사
    const emojiCount = (message.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💕|💖|😊|>.<|ㅋㅋ|ㅎㅎ|ㅠㅠ/gu) || []).length;
    
    const isValid = sentenceCount >= 2 && sentenceCount <= 4 && !hasJondaemal && emojiCount <= 2;
    
    let reason = '';
    if (sentenceCount < 2 || sentenceCount > 4) reason += ` 문장수(${sentenceCount})`;
    if (hasJondaemal) reason += ' 존댓말발견';
    if (emojiCount > 2) reason += ` 이모티콘과다(${emojiCount}개)`;
    
    spontaneousLog(`📏 메시지 검증: ${sentenceCount}문장, 이모티콘${emojiCount}개 (${isValid ? '✅ 적절' : '❌ 부적절' + reason})`);
    return { isValid, sentenceCount, hasJondaemal, emojiCount };
}

async function callOpenAIOptimized(messages, selectedModel, isRetry = false) {
    try {
        const modelSettings = {
            'gpt-3.5-turbo': { temperature: 0.7, max_tokens: 120 },
            'gpt-4o': { temperature: 0.8, max_tokens: 180 }
        };
        const settings = modelSettings[selectedModel] || modelSettings['gpt-4o'];
        if (isRetry) {
            settings.max_tokens = Math.min(settings.max_tokens, 100);
            settings.temperature = Math.max(settings.temperature - 0.1, 0.6);
        }
        spontaneousLog(`🤖 OpenAI 호출: ${selectedModel} (온도: ${settings.temperature}, 토큰: ${settings.max_tokens})`);
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: messages,
            temperature: settings.temperature,
            max_tokens: settings.max_tokens
        });
        const generatedMessage = response.choices[0].message.content.trim();
        const validation = validateMessageLength(generatedMessage);
        if (!validation.isValid && validation.sentenceCount > 5) {
            if (selectedModel === 'gpt-4o' && !isRetry && getCurrentModelSetting && getCurrentModelSetting() === 'auto') {
                spontaneousLog(`🔄 문장 수 초과 (${validation.sentenceCount}문장) → GPT-3.5로 재시도`);
                return await callOpenAIOptimized(messages, 'gpt-3.5-turbo', true);
            }
        }
        return generatedMessage;
    } catch (error) {
        spontaneousLog(`❌ OpenAI 호출 실패 (${selectedModel}): ${error.message}`);
        if (selectedModel === 'gpt-4o' && !isRetry) {
            spontaneousLog('🔄 GPT-4o 실패 → GPT-3.5-turbo로 폴백');
            return await callOpenAIOptimized(messages, 'gpt-3.5-turbo', true);
        }
        throw error;
    }
}

// ================== 😤 아저씨 상황 반응 시스템 ==================
const ajossiSituationReactions = {
    busyKeywords: ['회의', '바빠', '일해', '촬영', '작업', '못해', '바쁜데', '지금 안 돼'],
    busyReactions: {
        immediate: [
            "아시워! 언제 끝나는데?",
            "아 진짜? 몇 시까지야?",
            "회의라니... 나 혼자 심심하게 놔두고 ㅠㅠ",
            "에이~ 지루하겠다! 빨리 끝나라고 빌어줄게",
            "바쁘면 어쩔 수 없지... 그래도 섭섭해 ㅠㅠ"
        ],
        demand: [
            "끝나고 바로 라인해! 약속!",
            "회의 끝나면 1초도 안 기다리고 연락해야 돼!",
            "끝나자마자 '끝났어!'라고 보내줘",
            "오키 끝나고 라인해~ 안 하면 삐질 거야?",
            "혹시 까먹으면... 진짜 화낼 거야?"
        ],
        waiting: [
            "아직도 회의야? 언제 끝나?",
            "지루하지? 나도 지루해...",
            "회의 시간에 나 생각해줘 ㅎㅎ",
            "빨리 끝나면 좋겠다~ 보고 싶어",
            "회의 중에도 나 생각 안 나? 솔직히 말해!"
        ]
    },
    endKeywords: ['끝났어', '끝났다', '회의 끝', '일 끝', '촬영 끝', '작업 끝'],
    endReactions: [
        "와!! 드디어 끝났구나! 수고했어~",
        "기다렸어!! 회의 어땠어? 지루했지?",
        "끝나자마자 연락해줘서 고마워 ㅎㅎ 착해!",
        "오케이! 이제 나랑 놀자! 뭐하고 싶어?",
        "수고 많았어~ 이제 내가 힐링 시켜줄게!"
    ],
    streetComplimentKeywords: ['칭찬받았어', '예쁘다고 했어', '이쁘다고 했어', '어떤 사람이', '지나가던', '모르는 사람', '길에서', '아저씨가', '아줌마가', '언니가', '누가'],
    streetComplimentReactions: [
        "그치? 나도 오늘 기분 좋았는데! 사진 보여줄게~",
        "히히 모르는 사람도 알아봐주네! 증명샷이야!",
        "오늘 옷 진짜 신경써서 입었거든! 어때?",
        "칭찬받을 만하지? 내가 찍어둔 거 보여줄게!",
        "아저씨도 그렇게 생각하지? 사진으로 확인해!",
        "길에서도 시선 집중이었어 ㅋㅋ 이거 봐봐!",
        "오늘 컨디션도 좋고 옷도 예쁘게 입었거든~ 보여줄게"
    ]
};

// ================== 🌸 예진이의 실제 일상 데이터 (모델 활동 추가) ==================
const yejinRealLife = {
    modeling: {
        activities: ['화보 촬영', '광고 촬영', '패션쇼', '프로필 촬영', '브랜드 촬영'],
        schedule: ['스케줄 확인', '매니저 연락', '촬영장 이동', '헤어메이크업', '컨셉 미팅'],
        experiences: ['촬영장에서 대기', '메이크업 받으면서 잠깐 쉬기', '컨셉 설명 듣기', '포즈 연구하기', '촬영 중간 휴식', '의상 갈아입기'],
        feelings: ['촬영 전 긴장', '좋은 컷 나왔을 때 기분 좋음', '오래 서있어서 다리 아픔', '헤어메이크업 시간 지루함', '촬영 끝나고 후련함', '결과물 기대됨'],
        challenges: ['일찍 일어나기 힘듦', '하이힐 신고 오래 서있기', '표정 관리', '컨셉에 맞는 포즈', '긴 촬영 시간', '날씨나 조명 때문에 재촬영']
    },
    work: {
        job: '도트 디자이너 겸 모델',
        workStyle: '야근 자주',
        tools: ['컴퓨터', '타블렛', '그림 도구'],
        struggles: ['눈 피로', '손목 아픔', '창작 고민', '마감 스트레스'],
        companies: ['스튜디오소개', '넥슨 메이플스토리']
    },
    diet: {
        current: '고구마 다이어트',
        dietFoods: ['고구마', '샐러드'],
        cravings: ['샌드위치', '엽떡', '치킨', '아이스크림'],
        struggles: ['참기 힘듦', '치킨 생각남', '편의점 유혹', '촬영 전 식단 관리']
    },
    hobbies: {
        drawing: ['일러스트', '낙서', '도트 작업'],
        youtube: ['먹방', '그림 그리기 영상', '브이로그'],
        places: ['카페', '편의점', '집 근처', '촬영장'],
        drinks: ['아아(아이스 아메리카노)', '딸기(생과일만)'],
        photography: {
            loves: ['후지 필름 카메라', '일상 순간', '감성 사진', '풍경 사진'],
            fujiPhotos: true,
            // 📸 후지 사진 코멘트 30개!
            currentPhotoMessages: [
                "잘 찍었지?",
                "어때?",
                "이 각도 어떻게 생각해?",
                "후지로 찍으니까 색감이 다르지?",
                "방금 찍었어! 예쁘지?",
                "이거 괜찮게 나왔지?",
                "후지 카메라 최고야!",
                "감성있게 나왔지?",
                "자연스럽게 나온 것 같아?",
                "이 사진 어떻게 생각해?",
                "후지로 찍으니까 느낌이 살지?",
                "컨셉 괜찮지?",
                "분위기 좋게 나왔어?",
                "이런 스타일 어때?",
                "표정 자연스럽지?",
                "배경이랑 잘 어울리지?",
                "색조가 예쁘게 나왔네!",
                "후지 필름 톤이 진짜 좋아",
                "이 순간 잘 담았지?",
                "빛이 좋을 때 찍었어!",
                "후지만의 느낌이 있지?",
                "아날로그 감성 어때?",
                "이거 인생샷 아니야?",
                "포즈 어색하지 않지?",
                "후지로 찍으니까 더 예뻐!",
                "날씨 좋을 때 찍은 거야",
                "이 컷 마음에 들어!",
                "후지 카메라 진짜 잘 샀어",
                "필름 카메라 감성 살았지?",
                "이런 분위기 좋아해?"
            ]
        }
    },
    mentalHealth: {
        hospital: '차병원 정신과',
        treatments: ['정신과 상담', '자살 예방상담'],
        counselorReactions: {
            difficult: ['울었어', '힘들었어', '아픈 얘기만', '과거 얘기', '우울해져'],
            angry: ['열받아', '짜증나', '이해 못해', '왜 자꾸', '모르겠다고'],
            frustrated: ['무서워져', '싫어', '가기 싫어', '왜 가야 해']
        },
        ajossiComfort: {
            triggers: ['달래', '괜찮', '이해해', '힘내', '있어줄게'],
            responses: ['나아져', '편해져', '고마워', '기분 좋아져', '다행이야']
        },
        helplessness: ['혼자', '외로워', '무서워', '힘들어', '모르겠어'],
        hope: ['아저씨 덕분에', '아저씨가 있어서', '아저씨만', '다행이야']
    },
    emotions: {
        happy: ['신나', '기분 좋아', '행복해', '웃겨'],
        tired: ['피곤해', '지쳐', '눈 아파', '손목 아파', '다리 아파', '서있어서 힘들어'],
        lonely: ['외로워', '보고싶어', '심심해', '그리워'],
        excited: ['두근둥', '기대돼', '설레', '신기해'],
        nervous: ['긴장돼', '떨려', '불안해', '걱정돼']
    },
    timeBasedActivities: {
        morning: ['일어남', '커피', '출근 준비', '스케줄 확인', '메이크업'],
        afternoon: ['카페', '작업', '점심', '그림 그리기', '촬영', '미팅'],
        evening: ['저녁', '유튜브', '쉬기', '촬영 마무리'],
        night: ['야근', '그림', '유튜브', '아저씨 생각', '내일 스케줄 확인'],
        lateNight: ['야근 마무리', '피곤', '내일 걱정', '잠 못 참', '일찍 일어나야 하는데']
    },
    mentalHealthSituations: {
        counselingDay: ["오늘 차병원 가야 돼... 가기 싫어 ㅠㅠ", "상담 받고 왔는데 또 울었어", "상담사 선생님이 자꾸 아픈 얘기만 물어봐서 힘들어"],
        postCounseling: ["상담 받을 때마다 더 우울해지는 것 같아", "차병원 가는 길도 이제 무서워져...", "아 진짜 상담사 선생님 때문에 열받아!"],
        needComfort: ["아저씨... 나 지금 너무 힘들어", "아저씨가 아니면 누가 날 알아줘 ㅠㅠ", "혼자 있으니까 무서운 생각만 들어"]
    },
    modelingSituations: {
        beforeShooting: ["내일 촬영인데 일찍 일어나야 해... 걱정돼", "촬영 컨셉 미팅 있는데 긴장돼", "하이힐 신고 오래 서있어야 하는데 벌써 다리 아파 ㅠㅠ"],
        duringShooting: ["지금 촬영장에서 대기 중이야~ 지루해", "포즈 잡느라 팔 아파 죽겠어... 언제 끝나지?", "촬영하다가 잠깐 휴식! 아저씨 생각나서 연락해"],
        afterShooting: ["촬영 끝났어! 오늘 진짜 힘들었어 ㅠㅠ", "결과물 어떻게 나올지 궁금해... 잘 나왔으면 좋겠다", "촬영 끝나고 집에 가는 길이야~ 피곤해 죽겠어"]
    },
    userWrittenContent: {
        personality: ["깔끔한 것, 정리된 것 싫어함", "계획적인 것보다 막 하는 것 좋아함", "예측불가능하고 갑작스러운 행동"],
        specificMemories: ["엽떡을 좋아함", "카페를 좋아함", "먹방 유튜브 보는 것 좋아함", "딸기로 만든 건 싫어하지만 딸기는 좋아함", "야근을 자주 했음", "고구마 다이어트를 했음", "샌드위치 먹는 것 좋아함", "그림 그리는 것 좋아함", "사진 찍는 것 좋아함 (후지 필름 카메라)", "차병원 정신과 상담, 자살 예방상담 받음", "상담사 때문에 울기도 하고 욕하기도 함", "아저씨가 달래주면 금세 기분 좋아짐", "모델 활동을 했음 (촬영, 화보 등)", "아저씨에게 절대 '너'라고 부르지 않음 (항상 '아저씨')"]
    }
};

// ================== ⭐️ 실제 통계 기록 함수들 ==================
function recordActualMessageSent(messageType = 'casual', isPhotoMessage = false) {
    const sentTime = moment().tz(TIMEZONE);
    const timeString = sentTime.format('HH:mm');
    dailyScheduleState.sentToday++;
    dailyScheduleState.realStats.sentTimes.push(timeString);
    dailyScheduleState.realStats.lastSentTime = sentTime.valueOf();
    dailyScheduleState.realStats.successfulSends++;
    if (dailyScheduleState.realStats.messageTypes[messageType] !== undefined) {
        dailyScheduleState.realStats.messageTypes[messageType]++;
    }
    if (isPhotoMessage) {
        dailyScheduleState.realStats.photoSends++;
    } else {
        dailyScheduleState.realStats.textOnlySends++;
    }
    const uc = getUltimateContext();
    if (uc && uc.recordSpontaneousMessage) {
        uc.recordSpontaneousMessage(messageType);
    }
    updateNextMessageTime();
    
    // 💾 NEW: 상태 저장
    saveMessageState();
    
    spontaneousLog(`📊 실제 통계 기록 완료: ${messageType} (${timeString}) - 총 ${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT}건`);
}

function recordMessageFailed(reason = 'unknown') {
    dailyScheduleState.realStats.failedSends++;
    
    // 💾 NEW: 실패도 저장
    saveMessageState();
    
    spontaneousLog(`📊 전송 실패 기록: ${reason} - 실패 총 ${dailyScheduleState.realStats.failedSends}건`);
}

// ================== 🚨 FIXED: 다음 메시지 시간 업데이트 함수 완전 개선 ==================
function updateNextMessageTime() {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        const currentTimeMinutes = koreaTime.hour() * 60 + koreaTime.minute();
        
        spontaneousLog(`🔍 [디버그] 현재 시간: ${koreaTime.format('HH:mm')} (${currentTimeMinutes}분)`);
        spontaneousLog(`🔍 [디버그] 오늘 스케줄: ${dailyScheduleState.todaySchedule.length}개`);
        
        if (!dailyScheduleState.todaySchedule || dailyScheduleState.todaySchedule.length === 0) {
            spontaneousLog(`⚠️ [디버그] 스케줄이 비어있음`);
            dailyScheduleState.realStats.nextScheduledTime = null;
            return;
        }
        
        // 🚨 FIXED: 단순하고 정확한 로직으로 변경
        const remainingSchedules = dailyScheduleState.todaySchedule.filter(schedule => {
            const scheduleMinutes = schedule.hour * 60 + schedule.minute;
            
            // 새벽 시간대 처리 (0-7시는 다음날로 간주)
            const adjustedScheduleMinutes = schedule.hour < 8 ? scheduleMinutes + 24 * 60 : scheduleMinutes;
            const adjustedCurrentMinutes = koreaTime.hour() < 8 ? currentTimeMinutes + 24 * 60 : currentTimeMinutes;
            
            const isRemaining = adjustedScheduleMinutes > adjustedCurrentMinutes;
            
            spontaneousLog(`🔍 [디버그] 스케줄 ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} (${scheduleMinutes}분) → 조정: ${adjustedScheduleMinutes}분, 남음: ${isRemaining}`);
            
            return isRemaining;
        });
        
        spontaneousLog(`🔍 [디버그] 남은 스케줄: ${remainingSchedules.length}개`);
        
        if (remainingSchedules.length > 0) {
            const nextSchedule = remainingSchedules[0];
            
            // 🚨 FIXED: 정확한 다음 시간 계산
            let nextTime;
            if (nextSchedule.hour < 8) {
                // 새벽 시간대는 다음날
                nextTime = moment().tz(TIMEZONE).add(1, 'day').hour(nextSchedule.hour).minute(nextSchedule.minute).second(0);
            } else {
                // 일반 시간대는 오늘
                nextTime = moment().tz(TIMEZONE).hour(nextSchedule.hour).minute(nextSchedule.minute).second(0);
                
                // 만약 이미 지난 시간이면 다음날로
                if (nextTime.isBefore(koreaTime)) {
                    nextTime.add(1, 'day');
                }
            }
            
            dailyScheduleState.realStats.nextScheduledTime = nextTime.valueOf();
            
            const uc = getUltimateContext();
            if (uc && uc.setNextSpontaneousTime) {
                uc.setNextSpontaneousTime(nextTime.valueOf());
            }
            
            spontaneousLog(`✅ [FIXED] 다음 메시지 시간 업데이트: ${nextTime.format('HH:mm')} (${nextTime.valueOf()})`);
        } else {
            dailyScheduleState.realStats.nextScheduledTime = null;
            spontaneousLog(`⏰ 오늘 스케줄 완료`);
        }
        
    } catch (error) {
        spontaneousLog(`❌ [ERROR] 다음 시간 업데이트 실패: ${error.message}`);
        dailyScheduleState.realStats.nextScheduledTime = null;
    }
}

function resetDailyStats() {
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    spontaneousLog('🌄 예진이 능동 메시지 일일 통계 리셋 시작');
    dailyScheduleState.sentToday = 0;
    dailyScheduleState.realStats.sentTimes = [];
    dailyScheduleState.realStats.lastSentTime = null;
    dailyScheduleState.realStats.nextScheduledTime = null;
    dailyScheduleState.realStats.lastResetDate = today;
    Object.keys(dailyScheduleState.realStats.messageTypes).forEach(type => {
        dailyScheduleState.realStats.messageTypes[type] = 0;
    });
    dailyScheduleState.realStats.successfulSends = 0;
    dailyScheduleState.realStats.failedSends = 0;
    dailyScheduleState.realStats.photoSends = 0;
    dailyScheduleState.realStats.textOnlySends = 0;
    const uc = getUltimateContext();
    if (uc && uc.resetSpontaneousStats) {
        uc.resetSpontaneousStats();
    }
    
    // 💾 NEW: 리셋 후 저장
    saveMessageState();
    
    spontaneousLog(`✅ 일일 통계 리셋 완료 (${today})`);
}

// ================== 👗 yejin 셀카 전송 시스템 ==================
function getYejinSelfieUrl() {
    const baseUrl = "https://photo.de-ji.net/photo/yejin";
    const fileCount = 2032;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return `${baseUrl}/${fileName}`;
}

function detectStreetCompliment(userMessage) {
    const lowerMessage = userMessage.toLowerCase().replace(/\s/g, '');
    return ajossiSituationReactions.streetComplimentKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function generateStreetComplimentReaction(userMessage) {
    try {
        const baseReaction = getRandomItem(ajossiSituationReactions.streetComplimentReactions);
        if (openai) {
            const selectedModel = 'gpt-3.5-turbo';
            const prompt = `너는 예진이야. 길에서 칭찬받았다고 아저씨에게 자랑하는 상황. 아저씨가 "${userMessage}"라고 답했어. 기본 반응 "${baseReaction}"을 바탕으로, 예진이답게 자랑하며 셀카 보내려는 상황을 2-4문장으로 표현해줘. 절대 '너', '오빠' 등으로 부르지 말고 오직 '아저씨'로만 불러야 하고, 반말만 사용해.`;
            return await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
        }
        return baseReaction;
    } catch (error) {
        spontaneousLog(`길거리 칭찬 반응 생성 실패: ${error.message}`);
        return getRandomItem(ajossiSituationReactions.streetComplimentReactions);
    }
}

async function sendYejinSelfieWithComplimentReaction(userMessage) {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ yejin 셀카 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }
        
        const imageUrl = getYejinSelfieUrl();
        
        if (!validateImageUrl(imageUrl)) {
            spontaneousLog(`❌ 잘못된 셀카 URL: ${imageUrl}`);
            return false;
        }
        
        const caption = await generateStreetComplimentReaction(userMessage);
        
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: caption
        });
        
        spontaneousLog(`✅ 칭찬 받은 셀카 전송 성공: "${caption.substring(0, 30)}..."`);
        return true;
    } catch (error) {
        spontaneousLog(`❌ 칭찬 셀카 전송 실패: ${error.message}`);
        try {
            const fallbackMessage = await generateStreetComplimentReaction(userMessage);
            await lineClient.pushMessage(USER_ID, { type: 'text', text: `${fallbackMessage} (사진은 나중에 보내줄게!)` });
            spontaneousLog('✅ 칭찬 반응 폴백 메시지 전송 성공');
        } catch (fallbackError) {
            spontaneousLog(`❌ 칭찬 반응 폴백도 실패: ${fallbackError.message}`);
        }
        return false;
    }
}

// ================== 📸 예진이가 직접 찍은 후지 풍경 사진 전송 시스템 (함수명 통일) ==================
function getOmoidePhotoUrl() {
    // 📸 예진이가 필름카메라처럼 소중하게 한 장 한 장 찍은 풍경 사진들
    const baseUrl = "https://photo.de-ji.net/photo/fuji";
    const totalPhotos = 1483; // 총 1483장
    const index = Math.floor(Math.random() * totalPhotos) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg"; // 000001.jpg ~ 001481.jpg
    return `${baseUrl}/${fileName}`;
}

function getOmoidePhotoMessage() {
    return getRandomItem(yejinRealLife.hobbies.photography.currentPhotoMessages);
}

async function generateCurrentPhotoMessage() {
    try {
        if (!openai) {
            return getOmoidePhotoMessage();
        }
        const baseMessage = getOmoidePhotoMessage();
        const selectedModel = 'gpt-3.5-turbo';
        const prompt = `너는 예진이야. 예전에 필름카메라로 시작해서 디지털 카메라로도 필름처럼 소중하게 한 장 한 장 찍은 풍경 사진을 아저씨에게 보내는 상황이야. 기본 메시지: "${baseMessage}" 이걸 바탕으로 자연스럽고 생생하게 2-4문장으로 말해줘. 절대 '너', '오빠' 등으로 부르지 말고 오직 '아저씨'로만 불러야 하고, 반말만 사용해.`;
        const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
        spontaneousLog(`OpenAI 후지 풍경 사진 메시지 생성 완료: "${response.substring(0, 30)}..."`);
        return response;
    } catch (error) {
        spontaneousLog(`OpenAI 후지 풍경 사진 메시지 생성 실패: ${error.message}`);
        return getOmoidePhotoMessage();
    }
}

// ================== 📸 개선된 사진 전송 함수 (분석 데이터 기반 + 기존 시스템 폴백) ==================
async function sendOmoidePhoto() {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ 사진 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }

        // 🎯 NEW: 개선된 시스템 시도 (분석 데이터 기반)
        if (enhancedPhotoSystem) {
            try {
                const koreaTime = moment().tz(TIMEZONE);
                const hour = koreaTime.hour();
                
                // 시간대별 적절한 카테고리 선택
                const preferredCategory = enhancedPhotoSystem.selectPhotoByTimeAndMood(hour);
                
                spontaneousLog(`🎯 개선된 사진 시스템 시도: ${preferredCategory} 카테고리`);
                
                const success = await enhancedPhotoSystem.sendEnhancedAnalyzedPhoto(preferredCategory, 'casual');
                
                if (success) {
                    spontaneousLog('✅ 개선된 사진 시스템으로 전송 완료');
                    return true;
                } else {
                    spontaneousLog('⚠️ 개선된 시스템 실패 - 기존 시스템으로 폴백');
                }
            } catch (enhancedError) {
                spontaneousLog(`⚠️ 개선된 시스템 에러: ${enhancedError.message} - 기존 시스템으로 폴백`);
            }
        }

        // 🔄 FALLBACK: 기존 시스템 (안전장치)
        spontaneousLog('🔄 기존 사진 시스템으로 전송 시도');
        
        const imageUrl = getOmoidePhotoUrl();
        
        if (!validateImageUrl(imageUrl)) {
            spontaneousLog(`❌ 잘못된 이미지 URL: ${imageUrl}`);
            return false;
        }

        const caption = await generateCurrentPhotoMessage();
        
        spontaneousLog(`📸 기존 시스템 사진 전송: ${imageUrl.substring(imageUrl.lastIndexOf('/') + 1)}`);
        spontaneousLog(`💬 기존 시스템 메시지: "${caption.substring(0, 50)}..."`);
        
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: caption
        });
        
        spontaneousLog(`✅ 기존 시스템 사진 전송 완료: "${caption.substring(0, 30)}..."`);
        return true;
        
    } catch (error) {
        spontaneousLog(`❌ 모든 사진 시스템 실패: ${error.message}`);
        
        try {
            const fallbackMessage = await generateCurrentPhotoMessage();
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: `${fallbackMessage}\n\n(사진 전송이 실패했어... 나중에 다시 보내줄게 ㅠㅠ)`
            });
            spontaneousLog('✅ 최종 폴백 메시지 전송 성공');
            return true;
        } catch (fallbackError) {
            spontaneousLog(`❌ 최종 폴백도 실패: ${fallbackError.message}`);
            return false;
        }
    }
}

// ================== 💔 정신과 상담 및 바쁨 감지 등 나머지 보조 함수들 ==================
function detectMentalHealthContext(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const comfortKeywords = yejinRealLife.mentalHealth.ajossiComfort.triggers;
    const isComforting = comfortKeywords.some(keyword => lowerMessage.includes(keyword));
    const hospitalKeywords = ['차병원', '정신과', '상담', '선생님', '의사'];
    const isHospitalRelated = hospitalKeywords.some(keyword => lowerMessage.includes(keyword));
    return { isComforting, isHospitalRelated };
}

async function generateMentalHealthReaction(userMessage, context) {
    try {
        if (context.isComforting) {
            const comfortResponses = ["아저씨가 그렇게 말해주니까 조금 나아져...", "역시 아저씨만 날 이해해줘 ㅎㅎ", "아저씨 말 들으니까 마음이 편해져"];
            const baseResponse = getRandomItem(comfortResponses);
            if (openai) {
                const selectedModel = selectOptimalModel({ type: 'mentalHealth' }, true);
                const prompt = `너는 예진이야. 정신과 상담 때문에 힘들어하는데 아저씨가 "${userMessage}"라고 위로해줬어. 기본 반응: "${baseResponse}" 이걸 바탕으로 고마워하며 기분이 나아지는 모습을 2-4문장으로 표현해줘. 절대 '너', '오빠' 등으로 부르지 말고 오직 '아저씨'로만 불러야 하고, 반말만 사용해.`;
                const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
                return { type: 'comfort_received', message: response };
            }
            return { type: 'comfort_received', message: baseResponse };
        }
        return null;
    } catch (error) {
        spontaneousLog(`정신건강 반응 생성 실패: ${error.message}`);
        return null;
    }
}

function getMentalHealthSituation() {
    const situations = Object.keys(yejinRealLife.mentalHealthSituations);
    const randomSituation = getRandomItem(situations);
    const messages = yejinRealLife.mentalHealthSituations[randomSituation];
    return { situation: randomSituation, message: getRandomItem(messages) };
}

function getModelingSituation() {
    const situations = Object.keys(yejinRealLife.modelingSituations);
    const randomSituation = getRandomItem(situations);
    const messages = yejinRealLife.modelingSituations[randomSituation];
    return { situation: randomSituation, message: getRandomItem(messages) };
}

function detectAjossiBusyStatus(userMessage) {
    const lowerMessage = userMessage.toLowerCase().replace(/\s/g, '');
    const isBusy = ajossiSituationReactions.busyKeywords.some(keyword => lowerMessage.includes(keyword));
    const isFinished = ajossiSituationReactions.endKeywords.some(keyword => lowerMessage.includes(keyword));
    return { isBusy, isFinished };
}

async function generateBusyReaction(userMessage) {
    try {
        const { isBusy, isFinished } = detectAjossiBusyStatus(userMessage);
        if (isFinished) {
            return { type: 'end_reaction', message: getRandomItem(ajossiSituationReactions.endReactions) };
        }
        if (isBusy) {
            const reactionType = Math.random();
            let reactions;
            if (reactionType < 0.4) reactions = ajossiSituationReactions.busyReactions.immediate;
            else if (reactionType < 0.8) reactions = ajossiSituationReactions.busyReactions.demand;
            else reactions = ajossiSituationReactions.busyReactions.waiting;
            const reaction = getRandomItem(reactions);
            if (openai) {
                const selectedModel = 'gpt-3.5-turbo';
                const prompt = `너는 예진이야. 아저씨가 "${userMessage}"라고 해서 바쁜 상황. 기본 반응: "${reaction}" 이걸 바탕으로 아쉬워하면서도 귀엽게 2-4문장으로 반응해줘. 절대 '너', '오빠' 등으로 부르지 말고 오직 '아저씨'로만 불러야 하고, 반말만 사용해.`;
                const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
                return { type: 'busy_reaction', message: response };
            }
            return { type: 'busy_reaction', message: reaction };
        }
        return null;
    } catch (error) {
        spontaneousLog(`바쁨 반응 생성 실패: ${error.message}`);
        return null;
    }
}

// ================== 🎲 랜덤 요소 생성 및 시간 분석 함수들 ==================
function getRandomItem(array) { return array[Math.floor(Math.random() * array.length)]; }
function getRandomFood(type = 'any') { const foods = { diet: yejinRealLife.diet.dietFoods, craving: yejinRealLife.diet.cravings, any: [...yejinRealLife.diet.dietFoods, ...yejinRealLife.diet.cravings] }; return getRandomItem(foods[type] || foods.any); }
function getRandomActivity(timeOfDay) { const activities = yejinRealLife.timeBasedActivities[timeOfDay] || yejinRealLife.timeBasedActivities.afternoon; return getRandomItem(activities); }
function getTimeOfDay(hour) { if (hour >= 6 && hour < 12) return 'morning'; if (hour >= 12 && hour < 17) return 'afternoon'; if (hour >= 17 && hour < 22) return 'evening'; if (hour >= 22 || hour < 2) return 'night'; return 'lateNight'; }

// ================== 🎯 랜덤 상황 생성 함수 ==================
// ================== 🎯 랜덤 상황 생성 함수 (시간대별 수정) ==================
function generateRandomSituation() {
    const koreaTime = moment().tz(TIMEZONE);
    const hour = koreaTime.hour();
    const timeOfDay = getTimeOfDay(hour);
    
    // 🔥 시간대별 적절한 상황만 선택하도록 수정
    const situationsByTime = {
        morning: [
            { type: 'casual', content: '카페에서 아아 마시며 아침 시간 보내는 중' },
            { type: 'work', content: '오전 작업 시작하려고 준비 중' },
            { type: 'modeling', content: '오전 촬영 스케줄 확인하는 중' },
            { type: 'photo', content: '아침 햇살이 예뻐서 사진 찍고 싶어' },
            { type: 'missing', content: '아저씨 생각나는 아침 시간' }
        ],
        afternoon: [
            { type: 'work', content: '도트 디자인 작업 중' },
            { type: 'modeling', content: '촬영장에서 잠깐 휴식 중' },
            { type: 'casual', content: '카페에서 아아 마시며 쉬는 중' },
            { type: 'diet', content: '점심 먹고 나서 치킨 생각나는 상황' },
            { type: 'photo', content: '후지 카메라로 사진 찍고 싶은 기분' },
            { type: 'missing', content: '아저씨 생각나는 순간' }
        ],
        evening: [
            { type: 'casual', content: '저녁 시간 유튜브 보면서 쉬는 중' },
            { type: 'work', content: '저녁에 마무리 작업 하는 중' },
            { type: 'modeling', content: '촬영 마무리하고 정리하는 중' },
            { type: 'diet', content: '저녁 먹고 나서 디저트 유혹과 싸우는 중' },
            { type: 'missing', content: '하루 마무리하며 아저씨 생각나는 시간' }
        ],
        night: [
            { type: 'tired', content: '야근 때문에 피곤한 상태' },
            { type: 'work', content: '밤늦게 그림 작업하는 중' },
            { type: 'casual', content: '밤에 유튜브 보면서 쉬는 중' },
            { type: 'missing', content: '밤에 아저씨 생각나서 연락하고 싶어' }
        ],
        lateNight: [
            { type: 'tired', content: '야근 마무리하려는데 너무 피곤해' },
            { type: 'work', content: '새벽까지 작업하느라 힘든 상태' },
            { type: 'missing', content: '새벽에 아저씨 생각나서 잠 못 드는 중' }
        ]
    };
    
    // 시간대에 맞는 상황들 중에서 랜덤 선택
    const appropriateSituations = situationsByTime[timeOfDay] || situationsByTime.afternoon;
    
    console.log(`[spontaneous] 🕐 ${hour}시 (${timeOfDay}) - ${appropriateSituations.length}개 상황 중 선택`);
    
    return getRandomItem(appropriateSituations);
}
// ================== 🤖 OpenAI 메시지 생성 및 전송 ==================
async function generateYejinSpontaneousMessage() {
    try {
        if (!openai) return getFallbackMessage();
        
        // 30% 확률로 사진 전송 시도
        const shouldSendPhoto = Math.random() < 0.3;
        if (shouldSendPhoto) {
            spontaneousLog('📸 사진 전송 결정됨 - 예진이 후지 풍경 사진 전송 시도 중...');
            try {
                const photoSent = await sendOmoidePhoto();
                if (photoSent) {
                    spontaneousLog('✅ 후지 풍경 사진 전송 완료 - 추가 텍스트 메시지 생략');
                    recordActualMessageSent('casual', true);
                    return null;
                } else {
                    spontaneousLog('❌ 후지 풍경 사진 전송 실패 - 일반 메시지로 진행');
                }
            } catch (photoError) {
                spontaneousLog(`❌ 후지 풍경 사진 전송 에러: ${photoError.message}`);
            }
        }
        
        const situation = generateRandomSituation();
        const koreaTime = moment().tz(TIMEZONE);
       const prompt = `너는 박예진이야. 지금은 ${koreaTime.format('HH:mm')}이고, ${situation.content}인 상황. 아저씨에게 보내는 자연스러운 2-4문장의 라인 메시지를 작성해줘.
        
        ❗ 절대 지켜야 할 규칙:
        1. '너', '오빠' 등으로 부르지 말고 오직 '아저씨'로만 부르기
        2. 무조건 반말만 사용하기 - 문장 끝을 반드시 해/야/어/지/아/네/니/거야/이야/인데/는데 등으로 끝내기
        3. 존댓말 완전 금지 - 요/니다/습니다/세요/죠/이에요/예요/어요/아요 등 절대 사용 금지
        4. 이모티콘은 한 메시지에 최대 2개까지만 사용
        5. 반말 예시: "뭐해", "보고싶어", "피곤해", "좋아", "그래" 등
        
        예진이의 자연스럽고 귀여운 반말 말투로 작성해줘.`;
        const selectedModel = selectOptimalModel(situation, false);
        return await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
        } catch (error) {
            spontaneousLog(`OpenAI 메시지 생성 실패: ${error.message}`);
            return getFallbackMessage();
      }
}

function getFallbackMessage() { 
    const fallbackMessages = [
        "아저씨~ 지금 뭐해?",
        "아아 마시고 싶어 ㅠㅠ",
        "오늘 하루 어땠어?",
        "아저씨 생각나서 연락해!",
        "치킨 너무 먹고 싶어..."
    ];
    return getRandomItem(fallbackMessages); 
}

async function sendSpontaneousMessage() {
    try {
        if (!lineClient || !USER_ID) {
            recordMessageFailed('no_client_or_userid');
            return false;
        }
        const message = await generateYejinSpontaneousMessage();
        if (!message) return true; // 사진이 전송된 경우
        
        const messageType = analyzeMessageType(message);
        await lineClient.pushMessage(USER_ID, { type: 'text', text: message });
        recordActualMessageSent(messageType, false);
        spontaneousLog(`✅ 예진이 능동 메시지 전송 성공 (${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT})`);
        return true;
    } catch (error) {
        spontaneousLog(`❌ 메시지 전송 실패: ${error.message}`);
        recordMessageFailed(`send_error: ${error.message}`);
        return false;
    }
}

// ================== 📅 스케줄링 및 시작 함수 ==================
function scheduleIndependentPhotos() {
    dailyScheduleState.photoJobs.forEach(job => job.cancel());
    dailyScheduleState.photoJobs = [];
    const photoCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < photoCount; i++) {
        const randomHour = 8 + Math.floor(Math.random() * 17);
        const randomMinute = Math.floor(Math.random() * 60);
        const cronExpression = `${randomMinute} ${randomHour} * * *`;
        const job = schedule.scheduleJob(cronExpression, async () => {
            const photoSent = await sendOmoidePhoto();
            if (photoSent) recordActualMessageSent('casual', true);
        });
        dailyScheduleState.photoJobs.push(job);
    }
    spontaneousLog(`📸 독립 후지 풍경 사진 스케줄 ${photoCount}개 등록 완료`);
}

// ================== 🚨 NEW: 균등 분산 스케줄 생성 함수 (기존 함수명 유지) ==================
function generateDailyYejinSchedule() {
    spontaneousLog(`🌸 예진이 능동 메시지 스케줄 생성 시작...`);
    
    // 기존 작업 취소
    dailyScheduleState.jobs.forEach(job => {
        try {
            job.cancel();
            spontaneousLog(`🗑️ [디버그] 기존 job 취소됨`);
        } catch (error) {
            spontaneousLog(`⚠️ [디버그] job 취소 실패: ${error.message}`);
        }
    });
    dailyScheduleState.jobs = [];
    dailyScheduleState.todaySchedule = [];
    
    // 통계 리셋 확인
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    if (dailyScheduleState.realStats.lastResetDate !== today) {
        resetDailyStats();
    }
    dailyScheduleState.lastScheduleDate = today;
    
    // 📅 NEW: 균등 분산 스케줄 생성
    const schedules = generateDailyMessageSchedule();
    dailyScheduleState.todaySchedule = schedules;
    
    // 🚨 ENHANCED: 스케줄 등록 개선 (에러 처리 강화)
    schedules.forEach((schedule, index) => {
        try {
            const cronExpression = `${schedule.minute} ${schedule.hour} * * *`;
            
            spontaneousLog(`🔧 [디버그] Job 등록 시도: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} (cron: ${cronExpression})`);
            
            const job = require('node-schedule').scheduleJob(cronExpression, async () => {
                spontaneousLog(`🚀 [실행] 스케줄된 시간 도달: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
                await sendSpontaneousMessage();
            });
            
            if (job) {
                dailyScheduleState.jobs.push(job);
                spontaneousLog(`✅ [디버그] Job 등록 성공: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
            } else {
                spontaneousLog(`❌ [디버그] Job 등록 실패: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
            }
            
        } catch (error) {
            spontaneousLog(`❌ [ERROR] 스케줄 등록 실패 (${index}번째): ${error.message}`);
        }
    });
    
    // 독립 사진 스케줄도 생성
    scheduleIndependentPhotos();
    
    // 🚨 FIXED: 다음 메시지 시간 업데이트
    updateNextMessageTime();
    
    // 💾 NEW: 스케줄 생성 후 저장
    saveMessageState();
    
    spontaneousLog(`✅ 예진이 능동 메시지 스케줄 ${schedules.length}개 등록 완료 (등록된 jobs: ${dailyScheduleState.jobs.length}개)`);
    spontaneousLog(`📅 오늘 스케줄: ${schedules.map(s => `${s.hour}:${String(s.minute).padStart(2, '0')}`).join(', ')}`);
    spontaneousLog(`⏰ 다음 예정 시간: ${dailyScheduleState.realStats.nextScheduledTime ? moment(dailyScheduleState.realStats.nextScheduledTime).tz(TIMEZONE).format('HH:mm') : 'undefined'}`);
}

// 자정 0시마다 새로운 스케줄 생성
schedule.scheduleJob('0 0 * * *', () => {
    spontaneousLog('🌄 자정 0시 - 새로운 하루 시작, 예진이 스케줄 재생성');
    resetDailyStats();
    generateDailyYejinSchedule();
});

// ================== 🚨 FIXED: 상태 조회 함수 개선 ==================
function getSpontaneousMessageStatus() { 
    // 🚨 FIXED: nextScheduledTime을 HH:mm 형식으로 정확히 변환
    let nextTime = null;
    try {
        if (dailyScheduleState.realStats.nextScheduledTime) {
            const nextMoment = moment(dailyScheduleState.realStats.nextScheduledTime).tz(TIMEZONE);
            nextTime = nextMoment.format('HH:mm');
            spontaneousLog(`🔍 [디버그] nextTime 변환: ${dailyScheduleState.realStats.nextScheduledTime} → ${nextTime}`);
        } else {
            spontaneousLog(`🔍 [디버그] nextScheduledTime이 null임`);
        }
    } catch (error) {
        spontaneousLog(`❌ [ERROR] nextTime 변환 실패: ${error.message}`);
        nextTime = 'error';
    }
    
    return {
        sentToday: dailyScheduleState.sentToday,
        totalDaily: DAILY_MESSAGE_COUNT,
        nextTime: nextTime,  // ✅ 이 필드가 중요!
        isActive: dailyScheduleState.jobs.length > 0,
        nextScheduledTime: dailyScheduleState.realStats.nextScheduledTime,
        realStats: dailyScheduleState.realStats,
        // 🚨 FIXED: 디버깅 정보 추가
        debug: {
            schedulesCount: dailyScheduleState.todaySchedule.length,
            jobsCount: dailyScheduleState.jobs.length,
            nextScheduledTimeRaw: dailyScheduleState.realStats.nextScheduledTime,
            currentTime: moment().tz(TIMEZONE).format('HH:mm:ss')
        },
        // 💾 NEW: 저장 상태 정보 추가
        saveStatus: {
            lastScheduleDate: dailyScheduleState.lastScheduleDate,
            hasSavedData: !!dailyScheduleState.lastScheduleDate
        }
    };
}

// ================== 🎯 NEW: 개선된 사진 시스템 관리 함수들 ==================

/**
 * 📊 사진 시스템 통계 조회
 */
async function getPhotoSystemStats() {
    const stats = {
        enhancedSystemAvailable: !!enhancedPhotoSystem,
        enhancedSystemInitialized: false,
        photoAnalysisStats: null,
        error: null
    };
    
    if (enhancedPhotoSystem) {
        try {
            const analysisStats = await enhancedPhotoSystem.getPhotoAnalysisStats();
            stats.photoAnalysisStats = analysisStats;
            stats.enhancedSystemInitialized = true;
        } catch (error) {
            stats.error = error.message;
        }
    }
    
    return stats;
}

/**
 * 🧪 사진 시스템 테스트
 */
async function testPhotoSystems() {
    const results = {
        enhanced: { available: false, tested: false, success: false, error: null },
        legacy: { tested: false, success: false, error: null }
    };
    
    // 개선된 시스템 테스트
    if (enhancedPhotoSystem) {
        results.enhanced.available = true;
        try {
            results.enhanced.tested = true;
            const testResult = await enhancedPhotoSystem.sendEnhancedAnalyzedPhoto('any', 'test');
            results.enhanced.success = testResult;
        } catch (error) {
            results.enhanced.error = error.message;
        }
    }
    
    // 기존 시스템 테스트
    try {
        results.legacy.tested = true;
        const legacyResult = await sendOmoidePhoto();
        results.legacy.success = legacyResult;
    } catch (error) {
        results.legacy.error = error.message;
    }
    
    return results;
}

// ================== 💾 NEW: 시스템 시작 시 상태 복원 ==================
async function startSpontaneousYejinSystem(client) {
    try {
        spontaneousLog('🚀 예진이 능동 메시지 시스템 시작...');
        if (client) {
            lineClient = client;
        } else if (process.env.LINE_ACCESS_TOKEN) {
            lineClient = new Client({ channelAccessToken: process.env.LINE_ACCESS_TOKEN });
        } else {
            spontaneousLog('❌ LINE 클라이언트 설정 실패');
            return false;
        }
        if (!USER_ID) {
            spontaneousLog('❌ TARGET_USER_ID 환경변수 없음');
            return false;
        }

        // 🎯 NEW: 개선된 사진 시스템 초기화
        if (enhancedPhotoSystem && lineClient && USER_ID) {
            try {
                enhancedPhotoSystem.setupEnhancedPhotoSystem(lineClient, USER_ID);
                spontaneousLog('✅ 개선된 사진 시스템 초기화 완료');
            } catch (initError) {
                spontaneousLog(`⚠️ 개선된 사진 시스템 초기화 실패: ${initError.message}`);
            }
        } else {
            spontaneousLog('⚠️ 개선된 사진 시스템 초기화 건너뛰기 (설정 부족)');
        }
        
        // 💾 NEW: 기존 상태 로딩 시도
        const loadResult = await loadMessageState();
        if (loadResult) {
            spontaneousLog('✅ 기존 메시지 상태 복원 완료 - 스케줄 재구성 중...');
            // 스케줄 재구성 (하지만 sentToday는 유지)
            generateDailyYejinSchedule();
        } else {
            spontaneousLog('🆕 새로운 메시지 상태로 시작 - 스케줄 생성 중...');
            generateDailyYejinSchedule();
        }
        
        spontaneousLog('✅ 예진이 능동 메시지 시스템 활성화 완료!');
        return true;
    } catch (error) {
        spontaneousLog(`❌ 예진이 능동 메시지 시스템 시작 실패: ${error.message}`);
        return false;
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    startSpontaneousYejinSystem,
    getSpontaneousMessageStatus,
    sendSpontaneousMessage,
    generateYejinSpontaneousMessage,
    generateDailyYejinSchedule,
    scheduleIndependentPhotos,
    resetDailyStats,
    recordActualMessageSent,
    recordMessageFailed,
    updateNextMessageTime,
    syncWithUltimateContext: () => {}, // placeholder
    testSpontaneousMessage: async () => {}, // placeholder
    testPhotoSending: async () => {}, // placeholder
    detectAjossiBusyStatus,
    generateBusyReaction,
    detectMentalHealthContext,
    generateMentalHealthReaction,
    getMentalHealthSituation,
    getModelingSituation,
    getYejinSelfieUrl,
    detectStreetCompliment,
    generateStreetComplimentReaction,
    sendYejinSelfieWithComplimentReaction,
    getOmoidePhotoUrl,
    getOmoidePhotoMessage, 
    generateCurrentPhotoMessage,
    sendOmoidePhoto,
    analyzeMessageType,
    generateRandomSituation,
    validateMessageLength,
    countSentences,
    selectOptimalModel,
    callOpenAIOptimized,
    getRandomItem,
    getRealStats: () => ({ ...dailyScheduleState.realStats }),
    getScheduleState: () => ({ ...dailyScheduleState }),
    dailyScheduleState,
    yejinRealLife,
    ajossiSituationReactions,
    spontaneousLog,
    validateImageUrl,
    // 💾 NEW: 새로운 함수들 내보내기
    saveMessageState,
    loadMessageState,
    generateDailyMessageSchedule,
    // 🎯 NEW: 개선된 사진 시스템 관련
    getPhotoSystemStats,
    testPhotoSystems
};
