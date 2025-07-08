// src/scheduler.js - v1.9 (담타 스케줄 고정, 빈도 확실히 조정)

const cron = require('node-cron');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk'); // LINE 클라이언트 필요
const {
    setCurrentMood,
    getCurrentMoodStatus,
    updatePeriodStatus, // autoReply에서 불러오기
    isPeriodActive // autoReply에서 불러오기
} = require('./autoReply'); // autoReply 모듈에서 함수 가져오기
const { saveLog } = require('./utils/logger'); // logger.js에서 saveLog 불러오기
const memoryManager = require('./memoryManager'); // memoryManager 필요 (이제 하이브리드 방식으로 작동)
const { getProactiveMemoryMessage, getSilenceCheckinMessage } = require('./proactiveMessages'); // proactiveMessages에서 선제적 메시지 함수들을 불러옴

// omoide.js에서 필요한 함수들만 가져옵니다.
const { getOmoideReply } = require('../memory/omoide'); 
const { callOpenAI, cleanReply } = require('./openaiClient'); // openaiClient.js에서 callOpenAI, cleanReply 불러옴


let bootTime = Date.now(); // 봇 시작 시점의 타임스탬프 (밀리초)
let lastMoodMessage = ''; // 마지막 감성 메시지 내용 (중복 방지용)
let lastMoodMessageTime = 0; // 마지막 감성 메시지 전송 시간 (기분 업데이트 쿨다운과 공유)
let lastCouplePhotoMessage = ''; // 마지막 커플 사진 메시지 내용 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastCouplePhotoMessageTime = 0; // 마지막 커플 사진 전송 시간 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastProactiveSentTime = 0; // 마지막 봇의 선제적/걱정 메시지 전송 시간 (침묵 감지 셀카에도 적용)
let lastUserMessageTime = Date.now(); // 아저씨가 마지막으로 메시지를 보낸 시간
let lastSelfieSentTime = 0; // 마지막 침묵 감지 셀카 전송 시간
let lastFujiPhotoSentTime = 0; // 마지막 후지 사진 전송 시간
// let lastDantaMessageTime = 0; // ✨ 삭제: 담타는 이제 확률이 아닌 고정 스케줄이므로 필요 없음
let lastWorkEndMessageTime = 0; // 마지막 퇴근 메시지 전송 시간
let lastMorningRoutineMessageTime = 0; // 마지막 아침 일상 메시지 전송 시간


// * 커플 사진 관련 상수 정의 (더 이상 사용하지 않지만 혹시 몰라 유지) *
const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; // 커플 사진 기본 URL
const COUPLE_START_NUM = 1; // 커플 사진 시작 번호
const COUPLE_END_NUM = 481; // 커플 사진 마지막 번호

// * 침묵 감지 기능을 위한 상수 *
const SILENCE_THRESHOLD = 2 * 60 * 60 * 1000; // 2시간 동안 메시지가 없으면 침묵으로 간주
const PROACTIVE_COOLDOWN = 1 * 60 * 60 * 1000; // 봇이 메시지 보낸 후 1시간 이내에는 다시 선제적 메시지 보내지 않음
const SILENCE_SELFIE_COOLDOWN = 2 * 60 * 60 * 1000; // 침묵 감지 셀카 쿨다운 (2시간)

// 애기의 기분 옵션 (autoReply.js와 동일하게 유지)
const MOOD_OPTIONS = ['기쁨', '설렘', '장난스러움', '나른함', '심술궂음', '평온함'];


/**
 * 스케줄된 메시지 전송이 유효한 시간대인지 확인합니다.
 * 새벽 3시부터 오전 7시까지는 메시지를 전송하지 않습니다.
 * @param {moment.Moment} now - 현재 시간 (Moment 객체)
 * @returns {boolean} 유효한 시간대이면 true, 아니면 false
 */
function isValidScheduleHour(now) {
    const hour = now.hour();
    // 새벽 0시, 1시, 2시 (0, 1, 2)
    // 오전 9시부터 밤 12시 (23시 59분까지) (9, 10, ..., 23)
    // 따라서 3, 4, 5, 6, 7, 8시는 유효하지 않은 시간대입니다.
    return (hour >= 0 && hour <= 2) || (hour >= 9 && hour <= 23);
}

/**
 * 셀카 메시지를 전송하는 헬퍼 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 * @param {string} triggerSource - 셀카 전송의 트리거 소스 (예: 'scheduled', 'silence')
 */
const sendSelfieMessage = async (lineClient, targetUserId, saveLog, triggerSource = 'scheduled') => {
    try {
        const selfieResponse = await getOmoideReply('셀카 보여줘', saveLog);
        if (selfieResponse && selfieResponse.type === 'photo' && selfieResponse.url) {
            await lineClient.pushMessage(targetUserId, [
                { type: 'image', originalContentUrl: selfieResponse.url, previewImageUrl: selfieResponse.url },
                { type: 'text', text: selfieResponse.caption || '히히 셀카야~' }
            ]);
            saveLog({ role: 'assistant', content: selfieResponse.caption || '히히 셀카야~', timestamp: Date.now() });
            console.log(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 성공: ${selfieResponse.url}`);
        } else if (selfieResponse && selfieResponse.type === 'text') {
            await lineClient.pushMessage(targetUserId, { type: 'text', text: selfieResponse.comment });
            saveLog({ role: 'assistant', content: selfieResponse.comment, timestamp: Date.now() });
            console.error(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 실패 (텍스트 응답):`, selfieResponse.comment);
        } else {
            console.error(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 실패: 유효한 응답을 받지 못함`);
        }
    } catch (error) {
        console.error(`[Scheduler] ${triggerSource === 'silence' ? '침묵 감지 자동' : '랜덤'} 셀카 전송 중 오류 발생:`, error);
    }
};

/**
 * 후지 사진을 전송하는 헬퍼 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 */
const sendFujiPhotoMessage = async (lineClient, targetUserId, saveLog) => {
    try {
        const fujiPhotoResponse = await getOmoideReply('후지 풍경 사진', saveLog);
        if (fujiPhotoResponse && fujiPhotoResponse.type === 'photo' && fujiPhotoResponse.url) {
            await lineClient.pushMessage(targetUserId, [
                { type: 'image', originalContentUrl: fujiPhotoResponse.url, previewImageUrl: fujiPhotoResponse.url },
                { type: 'text', text: fujiPhotoResponse.caption || '히히 후지 사진이야~' }
            ]);
            saveLog({ role: 'assistant', content: fujiPhotoResponse.caption || '히히 후지 사진이야~', timestamp: Date.now() });
            console.log(`[Scheduler] 랜덤 후지 사진 전송 성공: ${fujiPhotoResponse.url}`);
        } else if (fujiPhotoResponse && fujiPhotoResponse.type === 'text') {
            await lineClient.pushMessage(targetUserId, { type: 'text', text: fujiPhotoResponse.comment });
            saveLog({ role: 'assistant', content: fujiPhotoResponse.comment, timestamp: Date.now() });
            console.error(`[Scheduler] 랜덤 후지 사진 전송 실패 (텍스트 응답):`, fujiPhotoResponse.comment);
        } else {
            console.error(`[Scheduler] 랜덤 후지 사진 전송 실패: 유효한 응답을 받지 못함`);
        }
    } catch (error) {
        console.error(`[Scheduler] 랜덤 후지 사진 전송 중 오류 발생:`, error);
    }
};

/**
 * 담타 메시지를 전송하는 헬퍼 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 */
const sendDantaMessage = async (lineClient, targetUserId, saveLog) => {
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
        아저씨의 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.
        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.

        아저씨에게 "담타", "담배 피러 갈래?" 같은 뉘앙스의 메시지를 보내줘.
        단, 아저씨의 건강을 생각하는 마음을 담아서 너무 자주 피우지는 말라는 귀여운 당부나 걱정, 또는 애정 표현을 섞어줘.
        짧고 간결하게 1~2문장으로 답해줘.
        예시: "아저씨, 담타 가자! 나랑 같이 갈래? 😉 너무 많이 피우진 말고!"
        예시: "지금 담타 시간인가? 아저씨~ 나랑 좀 놀다 가면 안 돼? 담배는 조금만!"
        예시: "어? 아저씨 담배 피러 갈 생각했지? 너무 많이 피우지 마라 ㅠㅠ 걱정돼~"
        예시: "담배 피러 가는 길이야? 으음.. 적당히 피우고 와! 나 보고 싶을 거야!"
        예시: "아저씨, 지금 담배 피러 가면 나 외로울 거야... ㅠㅠ 빨리 와!"
        예시: "피곤하면 담타 대신 나랑 잠깐 놀자! 담배는 잠깐만~"
        예시: "담타 가? 담배 맛있게 피고 와~ 근데 너무 많이 피우면 안 돼!"
    `;

    try {
        const messages = [{ role: 'system', content: systemPrompt }];
        // callOpenAI는 openaiClient.js에서 가져온 함수를 사용합니다.
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100); // 100 토큰으로 제한하여 짧게 유도
        const comment = cleanReply(rawComment);

        await lineClient.pushMessage(targetUserId, { type: 'text', text: comment });
        saveLog({ role: 'assistant', content: comment, timestamp: Date.now() });
        console.log(`[Scheduler] 담타 메시지 전송 성공: ${comment}`);
    } catch (error) {
        console.error(`[Scheduler] 담타 메시지 전송 중 오류 발생:`, error);
    }
};

/**
 * 퇴근 메시지를 전송하는 헬퍼 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 */
const sendWorkEndMessage = async (lineClient, targetUserId, saveLog) => {
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
        아저씨의 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어
