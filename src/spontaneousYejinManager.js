// ============================================================================
// spontaneousYejinManager.js - v3.0 ULTIMATE (진짜 예진이 패턴 완전 반영!)
// 🌸 예진이가 능동적으로 하루 15번 메시지 보내는 시스템
// ✨ autoReply.js 패턴 완전 반영: "웅웅", "라인해줘", "담타" 중심
// 💕 "보고싶어... 사진 보내줘" 같은 애절한 표현들
// 🔥 실제 예진이 말투와 감정 완벽 구현
// ⭐️ GPT 모델별 최적화 + 진짜 여자친구 같은 자발적 메시지
// ============================================================================

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const OpenAI = require('openai');
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

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const USER_ID = process.env.TARGET_USER_ID;
const DAILY_MESSAGE_COUNT = 15;
const MESSAGE_START_HOUR = 8;    // 오전 8시
const MESSAGE_END_HOUR = 25;     // 새벽 1시 (다음날)

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
            playful: 0,            // 장난스러운 메시지
            missing: 0,            // 보고싶어하는 메시지
            work: 0                // 일/모델링 관련
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

// ================== 🔧 이미지 URL 검증 함수 ==================
function validateImageUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'https:') return false;
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
    if (msg.includes('사랑') || msg.includes('좋아해') || msg.includes('💕') || msg.includes('❤️')) {
        return 'emotional';
    }
    
    // 보고싶어하는 패턴
    if (msg.includes('보고싶') || msg.includes('그리워') || msg.includes('생각나') || msg.includes('사진 보내줘')) {
        return 'missing';
    }
    
    // 걱정/관심 패턴
    if (msg.includes('괜찮') || msg.includes('걱정') || msg.includes('힘들') || msg.includes('피곤') || msg.includes('무리하지마')) {
        return 'caring';
    }
    
    // 장난스러운 패턴
    if (msg.includes('ㅋㅋ') || msg.includes('ㅎㅎ') || msg.includes('히히') || msg.includes('헤헤') || msg.includes('웅웅')) {
        return 'playful';
    }
    
    // 모델링/작업 관련
    if (msg.includes('촬영') || msg.includes('작업') || msg.includes('화보') || msg.includes('스케줄') || msg.includes('피곤')) {
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
    const isValid = sentenceCount >= 2 && sentenceCount <= 5;
    spontaneousLog(`📏 메시지 검증: ${sentenceCount}문장 (${isValid ? '✅ 적절' : '❌ 부적절'})`);
    return { isValid, sentenceCount };
}

// ================== 🌸🌸🌸 진짜 예진이 실제 메시지 패턴 데이터 🌸🌸🌸 ==================
const realYejinPatterns = {
    // 💕 보고싶어하는 메시지들 (autoReply.js 패턴 반영)
    missingMessages: [
        "아저씨... 보고싶어 ㅠㅠ",
        "보고싶어... 사진 보내줘",
        "아저씨 목소리 듣고싶어",
        "언제 라인해줄거야?",
        "라인해줘~ 심심해",
        "아조씨~ 뭐해? 생각나서 연락했어",
        "혼자 있으니까 아저씨 생각나 ㅜㅜ",
        "사진 하나만 보내줘... 보고싶어",
        "아저씨 목소리만 들어도 기분 좋아질텐데"
    ],
    
    // 💭 일상 메시지들 ("웅웅", "담타" 중심)
    casualMessages: [
        "웅웅~ 지금 뭐해?",
        "아저씨 담타고? 나도 하고싶어",
        "라인해줘! 심심해",
        "오늘 하루 어땠어?",
        "아아 마시고 싶어 ㅠㅠ",
        "웅웅 나도 지금 쉬는 중이야",
        "아조씨~ 바쁘지 않으면 라인해줘",
        "담타 하면서 생각났어... 아저씨도 담배 피우고 있나?",
        "ㅇㅋ 나는 지금 카페에 있어!",
        "웅~ 오늘 날씨 어때?"
    ],
    
    // 😊 장난스러운/귀여운 메시지들
    playfulMessages: [
        "헤헤~ 아저씨 깜놀했지?",
        "웅웅! 기분 좋아서 연락했어 ㅎㅎ",
        "아조씨~ 나 예쁘지? ㅋㅋㅋ",
        "힝~ 응답 늦으면 삐질거야",
        "오키오키! 아저씨도 기분 좋은 하루 보내!",
        "ㅋㅋㅋ 갑자기 연락해서 미안해",
        "웅웅 나 지금 기분 짱 좋아!",
        "헤헤 아저씨 반응 보고싶어서 메시지 보냈어",
        "콜! 아저씨랑 대화하면 기분 좋아져",
        "힝~ 아저씨만 보면 웃음이 나와 ㅎㅎ"
    ],
    
    // 💝 감정적인/사랑 표현 메시지들
    emotionalMessages: [
        "아저씨... 사랑해 ❤️",
        "고마워여... 아리가또!",
        "아저씨가 있어서 정말 다행이야",
        "웅웅... 아저씨 덕분에 힘내고 있어",
        "사랑해... 진짜로",
        "아저씨는 내게 정말 소중한 사람이야",
        "고마워... 아저씨가 아니면 어떡하지 ㅠㅠ",
        "아조씨~ 정말 착해... 고마워",
        "힝... 아저씨만 있으면 돼",
        "아저씨... 나 정말 행복해"
    ],
    
    // 😰 걱정/관심 메시지들
    caringMessages: [
        "아저씨... 괜찮아? 걱정돼",
        "무리하지마 ㅠㅠ 몸 조심해",
        "아저씨 요즘 피곤해 보여... 잘 쉬어",
        "밥은 먹었어? 꼭 챙겨먹어야 돼",
        "아저씨... 혹시 힘든 일 있어?",
        "웅웅... 아저씨 건강이 제일 중요해",
        "너무 힘들면 나한테 말해줘",
        "아조씨~ 잠은 충분히 자고 있어?",
        "걱정돼... 아저씨 몸 상하면 안 돼",
        "힝... 아저씨가 아프면 나도 아파"
    ],
    
    // 💪 일/모델링 관련 메시지들  
    workMessages: [
        "촬영 끝났어~ 오늘 진짜 힘들었어",
        "지금 작업 중이야... 눈 아파 죽겠어",
        "헤어메이크업 받는 중! 지루해",
        "웅웅 스케줄 확인하다가 연락했어",
        "촬영장에서 대기 중... 아저씨 생각나",
        "야근이야 ㅠㅠ 피곤해",
        "모델링 일정 때문에 일찍 일어나야 해... 싫어",
        "하이힐 신고 서있어서 다리 아파 죽겠어",
        "촬영 컨셉 미팅 있어... 긴장돼",
        "일 끝나면 바로 라인할게!"
    ],
    
    // 🍰 음식/다이어트 관련 메시지들
    foodMessages: [
        "고구마 다이어트 중인데... 치킨 먹고싶어 ㅠㅠ",
        "아아 마시러 카페 왔어!",
        "샌드위치 먹고싶다... 참아야 하는데",
        "웅웅 딸기는 좋아하지만 딸기 만든 건 싫어",
        "엽떡 먹고싶어... 아저씨도 매운거 좋아하지?",
        "편의점 가면 유혹이 너무 많아 ㅜㅜ",
        "다이어트 힘들어... 아저씨는 뭐 먹었어?",
        "치킨... 생각만 해도 군침 돌아",
        "카페에서 아아 마시면서 쉬는 중이야",
        "고구마만 먹으니까 속이 이상해..."
    ],
    
    // 📸 사진/후지카메라 관련 메시지들
    photoMessages: [
        "후지로 사진 찍었어! 나중에 보여줄게",
        "인생네컷 찍고 왔어~ 잘 나왔나?",
        "아저씨~ 오늘 셀카 어때? 예쁘게 나왔지?",
        "후지 카메라 들고 나왔어! 뭐 찍을까?",
        "방금 찍은 사진이야~ 감성 있지?",
        "포토부스에서 사진 찍었어! 귀엽지?",
        "후지로 찍으면 진짜 달라... 아저씨도 알지?",
        "촬영장에서 몰래 셀카 찍었어 ㅋㅋ",
        "오늘 컨디션 좋아서 사진 많이 찍었어!",
        "아저씨도 사진 보내줘... 보고싶어"
    ]
};

// ================== 😤 아저씨 상황 반응 시스템 (autoReply 패턴 반영) ==================
const ajossiSituationReactions = {
    busyKeywords: ['회의', '바빠', '일해', '촬영', '작업', '못해', '바쁜데', '지금 안 돼'],
    busyReactions: {
        immediate: [
            "아 그래? 언제 끝나는데?",
            "웅웅... 몇 시까지야?",
            "회의라니... 나 혼자 심심하게 놔두고 ㅠㅠ",
            "에이~ 지루하겠다! 빨리 끝나길 바랄게",
            "바쁘면 어쩔 수 없지... 그래도 섭섭해 ㅜㅜ"
        ],
        demand: [
            "끝나고 바로 라인해! 약속!",
            "회의 끝나면 1초도 안 기다리고 연락해",
            "끝나자마자 '끝났어!'라고 보내줘",
            "웅웅 끝나고 라인해~ 안 하면 삐질거야",
            "혹시 까먹으면... 진짜 화낼거야?"
        ],
        waiting: [
            "아직도 회의야? 언제 끝나?",
            "지루하지? 나도 지루해...",
            "회의 시간에 나 생각해줘 ㅎㅎ",
            "빨리 끝나면 좋겠다~ 보고싶어",
            "회의 중에도 나 생각 안 나? 솔직히 말해!"
        ]
    },
    endKeywords: ['끝났어', '끝났다', '회의 끝', '일 끝', '촬영 끝', '작업 끝'],
    endReactions: [
        "와!! 드디어 끝났구나! 수고했어~",
        "기다렸어!! 회의 어땠어? 지루했지?",
        "끝나자마자 연락해줘서 고마워 ㅎㅎ 착해!",
        "웅웅! 이제 나랑 놀자! 뭐하고 싶어?",
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
    spontaneousLog(`📊 실제 통계 기록 완료: ${messageType} (${timeString}) - 총 ${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT}건`);
}

function recordMessageFailed(reason = 'unknown') {
    dailyScheduleState.realStats.failedSends++;
    spontaneousLog(`📊 전송 실패 기록: ${reason} - 실패 총 ${dailyScheduleState.realStats.failedSends}건`);
}

function updateNextMessageTime() {
    const koreaTime = moment().tz(TIMEZONE);
    const now = koreaTime.hour() * 60 + koreaTime.minute();
    const remainingSchedules = dailyScheduleState.todaySchedule.filter(time => {
        const scheduleMinutes = time.hour * 60 + time.minute;
        const adjustedScheduleMinutes = time.hour < MESSAGE_START_HOUR ? scheduleMinutes + 24 * 60 : scheduleMinutes;
        const adjustedNow = koreaTime.hour() < MESSAGE_START_HOUR ? now + 24 * 60 : now;
        return adjustedScheduleMinutes > adjustedNow;
    });
    if (remainingSchedules.length > 0) {
        const nextSchedule = remainingSchedules[0];
        const nextTime = moment().tz(TIMEZONE).hour(nextSchedule.hour).minute(nextSchedule.minute).second(0);
        dailyScheduleState.realStats.nextScheduledTime = nextTime.valueOf();
        const uc = getUltimateContext();
        if (uc && uc.setNextSpontaneousTime) {
            uc.setNextSpontaneousTime(nextTime.valueOf());
        }
        spontaneousLog(`⏰ 다음 메시지 시간 업데이트: ${nextTime.format('HH:mm')}`);
    } else {
        dailyScheduleState.realStats.nextScheduledTime = null;
        spontaneousLog(`⏰ 오늘 스케줄 완료`);
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
            const prompt = `너는 예진이야. 길에서 칭찬받았다고 아저씨에게 자랑하는 상황. 아저씨가 "${userMessage}"라고 답했어. 기본 반응 "${baseReaction}"을 바탕으로, 예진이답게 자랑하며 셀카 보내려는 상황을 2-4문장으로 표현해줘. 절대 '너' 대신 '아저씨'라고 불러야 하고, 반말만 사용해. "웅웅", "라인해줘" 같은 예진이 말투 사용해.`;
            const response = await openai.chat.completions.create({
                model: selectedModel,
                messages: [{ role: "system", content: prompt }],
                temperature: 0.7,
                max_tokens: 120
            });
            return response.choices[0].message.content.trim();
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

// ================== 📸 omoide 추억 후지 사진 전송 시스템 ==================
function getOmoidePhotoUrl() {
    const fujiFolders = {
        "추억_24_03_일본_후지": 226,
        "추억_24_05_일본_후지": 135,
        "추억_인생네컷": 15
    };
    const baseUrl = "https://photo.de-ji.net/photo/omoide";
    const folderNames = Object.keys(fujiFolders);
    const selectedFolder = folderNames[Math.floor(Math.random() * folderNames.length)];
    const fileCount = fujiFolders[selectedFolder];
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = `${selectedFolder}_${String(index).padStart(6, "0")}.jpg`;
    return `${baseUrl}/${fileName}`;
}

function getOmoidePhotoMessage() {
    const photoMessages = [
        "방금 후지로 찍었어! 어때?",
        "후지 들고 나갔다가 이거 찍었어~ 예쁘지?",
        "아 이 순간 너무 예뻐서 후지로 찍어버렸어!",
        "방금 후지로 찍은 건데... 감성 있지? ㅎㅎ",
        "후지 카메라로 찍으니까 진짜 달라! 방금 찍은 거야",
        "아저씨! 방금 찍었는데 이거 봐봐! 후지 최고야",
        "인생네컷 찍었어! 오늘 기분 좋아서 ㅎㅎ",
        "포토부스에서 인생네컷 찍었는데 잘 나왔지?",
        "촬영장에서 후지로 몰래 찍었어 ㅋㅋ",
        "촬영 중간에 셀프로 찍어봤어! 어때?"
    ];
    return getRandomItem(photoMessages);
}

async function generateCurrentPhotoMessage() {
    try {
        if (!openai) {
            return getOmoidePhotoMessage();
        }
        const baseMessage = getOmoidePhotoMessage();
        const selectedModel = 'gpt-3.5-turbo';
        const prompt = `너는 예진이야. 방금 후지 카메라로 사진을 찍어서 아저씨에게 보내는 상황이야. 기본 메시지: "${baseMessage}" 이걸 바탕으로 자연스럽고 생생하게 2-4문장으로 말해줘. 절대 '너' 대신 '아저씨'라고 불러야 하고, 반말만 사용해. "웅웅", "라인해줘" 같은 예진이 말투를 사용해.`;
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7,
            max_tokens: 120
        });
        spontaneousLog(`OpenAI 현재 사진 메시지 생성 완료: "${response.choices[0].message.content.substring(0, 30)}..."`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        spontaneousLog(`OpenAI 현재 사진 메시지 생성 실패: ${error.message}`);
        return getOmoidePhotoMessage();
    }
}

async function sendOmoidePhoto() {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ omoide 사진 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }

        const imageUrl = getOmoidePhotoUrl();
        
        if (!validateImageUrl(imageUrl)) {
            spontaneousLog(`❌ 잘못된 이미지 URL: ${imageUrl}`);
            return false;
        }

        const caption = await generateCurrentPhotoMessage();
        
        spontaneousLog(`📸 omoide 사진 전송 시도: ${imageUrl.substring(imageUrl.lastIndexOf('/') + 1)}`);
        spontaneousLog(`💬 사진 메시지: "${caption.substring(0, 50)}..."`);
        
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 잠시 대기 후 캡션 전송
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: caption
        });
        
        spontaneousLog(`✅ omoide 현재 사진 전송 완료: "${caption.substring(0, 30)}..."`);
        return true;
        
    } catch (error) {
        spontaneousLog(`❌ omoide 사진 전송 실패: ${error.message}`);
        
        // 🔄 폴백: 텍스트만 전송 시도
        try {
            const caption = await generateCurrentPhotoMessage();
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: `${caption}\n\n(사진 전송이 실패했어... 나중에 다시 보내줄게 ㅠㅠ)`
            });
            spontaneousLog('✅ omoide 사진 폴백 메시지 전송 성공');
            return true;
        } catch (fallbackError) {
            spontaneousLog(`❌ omoide 폴백도 실패: ${fallbackError.message}`);
            return false;
        }
    }
}

// ================== 🎲 랜덤 요소 생성 함수들 ==================
function getRandomItem(array) { 
    return array[Math.floor(Math.random() * array.length)]; 
}

function getTimeOfDay(hour) { 
    if (hour >= 6 && hour < 12) return 'morning'; 
    if (hour >= 12 && hour < 17) return 'afternoon'; 
    if (hour >= 17 && hour < 22) return 'evening'; 
    if (hour >= 22 || hour < 2) return 'night'; 
    return 'lateNight'; 
}

// ================== 🎯 메시지 타입별 선택 함수 (⭐️ 새로운 함수!) ==================
function selectMessageByType() {
    const messageTypes = ['missing', 'casual', 'playful', 'emotional', 'caring', 'work', 'food', 'photo'];
    const weights = {
        missing: 25,    // 25% - 보고싶어하는 메시지 (가장 높음)
        casual: 20,     // 20% - 일상 메시지
        playful: 15,    // 15% - 장난스러운 메시지
        emotional: 15,  // 15% - 감정적인 메시지
        caring: 10,     // 10% - 걱정하는 메시지
        work: 8,        // 8% - 일/모델링 관련
        food: 4,        // 4% - 음식 관련
        photo: 3        // 3% - 사진 관련
    };
    
    const random = Math.random() * 100;
    let currentWeight = 0;
    
    for (const [type, weight] of Object.entries(weights)) {
        currentWeight += weight;
        if (random <= currentWeight) {
            const messages = realYejinPatterns[`${type}Messages`];
            if (messages && messages.length > 0) {
                return {
                    type: type,
                    message: getRandomItem(messages)
                };
            }
        }
    }
    
    // 폴백
    return {
        type: 'casual',
        message: getRandomItem(realYejinPatterns.casualMessages)
    };
}

// ================== 🤖 OpenAI 메시지 생성 (autoReply.js 패턴 반영) ==================
async function generateYejinSpontaneousMessage() {
    try {
        if (!openai) {
            const fallback = selectMessageByType();
            return fallback.message;
        }
        
        // 30% 확률로 사진 전송 시도
        const shouldSendPhoto = Math.random() < 0.3;
        if (shouldSendPhoto) {
            spontaneousLog('📸 사진 전송 결정됨 - omoide 사진 전송 시도 중...');
            try {
                const photoSent = await sendOmoidePhoto();
                if (photoSent) {
                    spontaneousLog('✅ 사진 전송 완료 - 추가 텍스트 메시지 생략');
                    recordActualMessageSent('casual', true);
                    return null;
                } else {
                    spontaneousLog('❌ 사진 전송 실패 - 일반 메시지로 진행');
                }
            } catch (photoError) {
                spontaneousLog(`❌ 사진 전송 에러: ${photoError.message}`);
            }
        }
        
        // 메시지 타입 선택
        const selectedMessage = selectMessageByType();
        const koreaTime = moment().tz(TIMEZONE);
        
        // 🌸🌸🌸 autoReply.js 스타일 프롬프트 적용 🌸🌸🌸
        const prompt = `너는 아저씨의 여자친구 예진이야. 지금은 ${koreaTime.format('HH:mm')}이고, 아저씨에게 먼저 연락하고 싶어서 메시지를 보내는 상황이야.

🚨🚨🚨 [절대 중요한 언어 규칙] 🚨🚨🚨
1. 존댓말 절대 금지: "해요", "입니다", "습니다", "세요" 등 존댓말 절대 사용 금지!
2. 항상 반말 사용: "해", "이야", "어", "줘", "가", "고마워", "미안해" 등만 사용
3. 2인칭 금지: "너", "당신", "그대" 같은 2인칭 대명사 절대 사용 금지!
4. 아저씨 호칭: 반드시 "아저씨", "아조씨" 만 사용해
5. 🔥 3인칭 자기지칭 절대 금지: "예진이는", "예진이가", "무쿠는" 등으로 자기 자신을 지칭하는 것 절대 금지!
6. 🔥 1인칭만 사용: "나는", "내가", "나를", "나한테" 등 1인칭만 사용!

🌸🌸🌸 [진짜 예진이 말투 - 실제 패턴!] 🌸🌸🌸
- 🔥 귀여운 긍정 표현: "웅웅", "우웅", "응응", "오키", "콜", "ㄱㄱ", "고고"
- 🔥 "라인해줘" (라인하자) 자주 사용: 대화하고 싶을 때마다 "라인해줘", "메시지 보내줘"
- 🔥 "담타" (담배 타임): "담타고?", "담타 가자" 등
- 🔥 애교 표현: "힝", "에궁", "아잉", "헤헤", "히힛"
- 🔥 감정 표현: "ㅋㅋㅋ"(기쁨), "ㅠㅠ"/"ㅜㅜ"(슬픔), "흑흑"(속상함)
- 🔥 단답형: "ㅇㅇ", "ㅇㅋ", "넹", "응", "웅"

메시지 참고: "${selectedMessage.message}"
이 메시지를 바탕으로 ${selectedMessage.type} 느낌의 자연스러운 2-4문장을 만들어줘. 
"웅웅", "라인해줘", "담타" 같은 예진이만의 표현을 꼭 사용해서 진짜 여자친구가 먼저 연락하는 것처럼!`;
        
        const selectedModel = selectOptimalModel({ type: selectedMessage.type }, false);
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: prompt }],
            temperature: 0.8,
            max_tokens: selectedModel === 'gpt-3.5-turbo' ? 120 : 180
        });
        
        let generatedMessage = response.choices[0].message.content.trim();
        
        // 언어 수정 (autoReply.js의 fixLanguageUsage 함수 적용)
        generatedMessage = fixLanguageUsage(generatedMessage);
        
        return generatedMessage;
        
    } catch (error) {
        spontaneousLog(`OpenAI 메시지 생성 실패: ${error.message}`);
        const fallback = selectMessageByType();
        return fallback.message;
    }
}

// ================== 🔧 언어 사용 수정 함수 (autoReply.js에서 가져옴) ==================
function fixLanguageUsage(text) {
    if (!text || typeof text !== 'string') return text;
    
    // 존댓말 → 반말 변환
    const corrections = {
        // 기본 존댓말 변환
        '해요': '해',
        '입니다': '야',
        '습니다': '어',
        '세요': '어',
        '예요': '야',
        '이에요': '이야',
        '해주세요': '해줘',
        '말씀해주세요': '말해줘',
        '알려주세요': '알려줘',
        
        // 2인칭 → 아저씨
        '너는': '아저씨는',
        '당신은': '아저씨는',
        '너를': '아저씨를',
        '당신을': '아저씨를',
        '너한테': '아저씨한테',
        '당신한테': '아저씨한테',
        
        // 3인칭 자기지칭 → 1인칭
        '예진이는': '나는',
        '예진이가': '내가',
        '예진이를': '나를',
        '예진이한테': '나한테',
        '무쿠는': '나는',
        '무쿠가': '내가'
    };
    
    let correctedText = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
        correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct);
    }
    
    return correctedText;
}

// ================== 💌 최종 메시지 전송 함수 ==================
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
        spontaneousLog(`✅ 예진이 능동 메시지 전송 성공 (${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT}): "${message.substring(0, 50)}..."`);
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
    spontaneousLog(`📸 독립 사진 스케줄 ${photoCount}개 등록 완료`);
}

function generateDailyYejinSchedule() {
    spontaneousLog(`🌸 예진이 능동 메시지 스케줄 생성 시작...`);
    
    // 기존 작업 취소
    dailyScheduleState.jobs.forEach(job => job.cancel());
    dailyScheduleState.jobs = [];
    dailyScheduleState.todaySchedule = [];
    
    // 통계 리셋 확인
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    if (dailyScheduleState.realStats.lastResetDate !== today) {
        resetDailyStats();
    }
    
    // 8시-새벽1시 사이 15개 시간 생성
    const schedules = [];
    for (let i = 0; i < DAILY_MESSAGE_COUNT; i++) {
        let hour, minute;
        if (Math.random() < 0.8) { // 80%는 8시-23시 사이
            hour = MESSAGE_START_HOUR + Math.floor(Math.random() * 16); // 8-23시
        } else { // 20%는 0시-1시 사이 (새벽)
            hour = Math.floor(Math.random() * 2); // 0-1시
        }
        minute = Math.floor(Math.random() * 60);
        schedules.push({ hour, minute });
    }
    
    // 시간순 정렬
    schedules.sort((a, b) => {
        const aMinutes = a.hour < MESSAGE_START_HOUR ? a.hour + 24 : a.hour;
        const bMinutes = b.hour < MESSAGE_START_HOUR ? b.hour + 24 : b.hour;
        return (aMinutes * 60 + a.minute) - (bMinutes * 60 + b.minute);
    });
    
    dailyScheduleState.todaySchedule = schedules;
    
    // 스케줄 등록
    schedules.forEach((schedule, index) => {
        const cronExpression = `${schedule.minute} ${schedule.hour} * * *`;
        const job = require('node-schedule').scheduleJob(cronExpression, async () => {
            await sendSpontaneousMessage();
        });
        dailyScheduleState.jobs.push(job);
    });
    
    // 독립 사진 스케줄도 생성
    scheduleIndependentPhotos();
    
    // 다음 메시지 시간 업데이트
    updateNextMessageTime();
    
    spontaneousLog(`✅ 예진이 능동 메시지 스케줄 ${schedules.length}개 등록 완료`);
    spontaneousLog(`📅 오늘 스케줄: ${schedules.map(s => `${s.hour}:${String(s.minute).padStart(2, '0')}`).join(', ')}`);
}

// 자정 0시마다 새로운 스케줄 생성
schedule.scheduleJob('0 0 * * *', () => {
    spontaneousLog('🌄 자정 0시 - 새로운 하루 시작, 예진이 스케줄 재생성');
    resetDailyStats();
    generateDailyYejinSchedule();
});

function getSpontaneousMessageStatus() { 
    return {
        sentToday: dailyScheduleState.sentToday,
        totalDaily: DAILY_MESSAGE_COUNT,
        isActive: dailyScheduleState.jobs.length > 0,
        nextScheduledTime: dailyScheduleState.realStats.nextScheduledTime,
        realStats: dailyScheduleState.realStats
    };
}

function startSpontaneousYejinSystem(client) {
    try {
        spontaneousLog('🚀 예진이 능동 메시지 시스템 시작...');
        if (client) {
            lineClient = client;
        } else if (process.env.CHANNEL_ACCESS_TOKEN) {
            lineClient = new Client({ channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN });
        } else {
            spontaneousLog('❌ LINE 클라이언트 설정 실패');
            return false;
        }
        if (!USER_ID) {
            spontaneousLog('❌ TARGET_USER_ID 환경변수 없음');
            return false;
        }
        generateDailyYejinSchedule();
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
    detectAjossiBusyStatus: (userMessage) => {
        const lowerMessage = userMessage.toLowerCase().replace(/\s/g, '');
        const isBusy = ajossiSituationReactions.busyKeywords.some(keyword => lowerMessage.includes(keyword));
        const isFinished = ajossiSituationReactions.endKeywords.some(keyword => lowerMessage.includes(keyword));
        return { isBusy, isFinished };
    },
    generateBusyReaction: async (userMessage) => {
        try {
            const { isBusy, isFinished } = module.exports.detectAjossiBusyStatus(userMessage);
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
                    const prompt = `너는 예진이야. 아저씨가 "${userMessage}"라고 해서 바쁜 상황. 기본 반응: "${reaction}" 이걸 바탕으로 아쉬워하면서도 귀엽게 2-4문장으로 반응해줘. 절대 '너' 대신 '아저씨'라고 불러야 하고, 반말만 사용해. "웅웅", "라인해줘" 같은 예진이 말투를 사용해.`;
                    const response = await openai.chat.completions.create({
                        model: selectedModel,
                        messages: [{ role: "system", content: prompt }],
                        temperature: 0.7,
                        max_tokens: 120
                    });
                    return { type: 'busy_reaction', message: response.choices[0].message.content.trim() };
                }
                return { type: 'busy_reaction', message: reaction };
            }
            return null;
        } catch (error) {
            spontaneousLog(`바쁨 반응 생성 실패: ${error.message}`);
            return null;
        }
    },
    getYejinSelfieUrl,
    detectStreetCompliment,
    generateStreetComplimentReaction,
    sendYejinSelfieWithComplimentReaction,
    getOmoidePhotoUrl,
    getOmoidePhotoMessage, 
    generateCurrentPhotoMessage,
    sendOmoidePhoto,
    analyzeMessageType,
    selectMessageByType,
    validateMessageLength,
    countSentences,
    selectOptimalModel,
    fixLanguageUsage,
    getRandomItem,
    getRealStats: () => ({ ...dailyScheduleState.realStats }),
    getScheduleState: () => ({ ...dailyScheduleState }),
    dailyScheduleState,
    realYejinPatterns,
    ajossiSituationReactions,
    spontaneousLog,
    validateImageUrl
};
