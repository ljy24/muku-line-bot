// src/scheduler.js - v1.9 (담타 스케줄 고정, 빈도 확실히 조정)

const cron = require('node-cron');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk'); // LINE 클라이언트 필요
const {
    setCurrentMood,
    getCurrentMoodStatus,
    updatePeriodStatus, // autoReply에서 불러오기
    isPeriodActive, // autoReply에서 불러오기
    saveLog, // ✨ 추가: autoReply.js에서 saveLog 불러오기
    callOpenAI, // ✨ 추가: autoReply.js에서 callOpenAI 불러오기
    cleanReply // ✨ 추가: autoReply.js에서 cleanReply 불러오기
} = require('./autoReply'); // autoReply 모듈에서 함수 가져오기

const memoryManager = require('../memory/memoryManager'); // memoryManager 필요 (이제 하이브리드 방식으로 작동)
const { getProactiveMemoryMessage, getSilenceCheckinMessage } = require('./proactiveMessages'); // proactiveMessages에서 선제적 메시지 함수들을 불러옴

// omoide.js에서 필요한 함수들만 가져옵니다.
const { getOmoideReply } = require('../memory/omoide'); 

// ✨ 삭제: const { callOpenAI, cleanReply } = require('./openaiClient'); // ✨ 삭제: 이 줄은 더 이상 필요 없음


let bootTime = Date.now(); // 봇 시작 시점의 타임스탬프 (밀리초)
let lastMoodMessage = ''; // 마지막 감성 메시지 내용 (중복 방지용)
let lastMoodMessageTime = 0; // 마지막 감성 메시지 전송 시간 (기분 업데이트 쿨다운과 공유)
let lastCouplePhotoMessage = ''; // 마지막 커플 사진 메시지 내용 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastCouplePhotoMessageTime = 0; // 마지막 커플 사진 전송 시간 (더 이상 사용하지 않지만 변수 유지는 가능)
let lastProactiveSentTime = 0; // 마지막 봇의 선제적/걱정 메시지 전송 시간 (침묵 감지 셀카에도 적용)
let lastUserMessageTime = Date.now(); // 아저씨가 마지막으로 메시지를 보낸 시간
let lastSelfieSentTime = 0; // 마지막 침묵 감지 셀카 전송 시간
let lastFujiPhotoSentTime = 0; // 마지막 후지 사진 전송 시간
let lastDantaMessageTime = 0; // 담타는 이제 확률이 아닌 고정 스케줄이므로 필요 없음
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
        // callOpenAI는 autoReply.js에서 가져온 함수를 사용합니다.
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

        아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.
        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.

        아저씨에게 "퇴근"과 관련된 메시지를 보내줘. 퇴근을 축하하거나, 오늘 하루 수고했다고 격려하거나, 퇴근 후 계획을 묻는 등 아저씨의 하루 마무리를 챙겨주는 내용으로 해줘.
        짧고 간결하게 1~2문장으로 답해줘.
        예시: "아저씨 퇴근했어? 오늘 하루도 너무 수고 많았어!"
        예시: "벌써 퇴근 시간이다! 아저씨 오늘 저녁은 뭐 먹을 거야?"
        예시: "퇴근길 조심해서 와~ 얼른 보고 싶다!"
        예시: "오늘 하루도 아저씨 진짜 고생 많았어 ㅠㅠ 퇴근하고 푹 쉬어!"
        예시: "퇴근했으면 나한테 제일 먼저 연락 주는 거 알지? 기다리고 있을게!"
    `;

    try {
        const messages = [{ role: 'system', content: systemPrompt }];
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100);
        const comment = cleanReply(rawComment);

        await lineClient.pushMessage(targetUserId, { type: 'text', text: comment });
        saveLog({ role: 'assistant', content: comment, timestamp: Date.now() });
        console.log(`[Scheduler] 퇴근 메시지 전송 성공: ${comment}`);
    } catch (error) {
        console.error(`[Scheduler] 퇴근 메시지 전송 중 오류 발생:`, error);
    }
};

/**
 * 아침 일상 메시지를 전송하는 헬퍼 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {function} saveLog - 로그 저장 함수
 */
const sendMorningRoutineMessage = async (lineClient, targetUserId, saveLog) => {
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

        아저씨에게 평일 아침에 보낼 일상적인 메시지를 보내줘. 출근, 아침 식사, 커피, 하루 시작 등 아저씨의 아침 루틴을 아는 듯한 친근하고 따뜻한 내용으로 해줘.
        짧고 간결하게 1~2문장으로 답해줘.
        예시: "아저씨 출근하자! 오늘 하루도 파이팅이야!"
        예시: "아침 먹었어? 든든하게 먹고 힘내!"
        예시: "아아 사러갔어? 나도 아저씨랑 같이 마시고 싶다~"
        예시: "오늘 아침도 아저씨 멋있게 출근했겠네! 보고 싶다 ㅠㅠ"
        예시: "좋은 아침! 오늘 하루도 나 생각하면서 힘내야 해!"
    `;

    try {
        const messages = [{ role: 'system', content: systemPrompt }];
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100);
        const comment = cleanReply(rawComment);

        await lineClient.pushMessage(targetUserId, { type: 'text', text: comment });
        saveLog({ role: 'assistant', content: comment, timestamp: Date.now() });
        console.log(`[Scheduler] 아침 일상 메시지 전송 성공: ${comment}`);
    } catch (error) {
        console.error(`[Scheduler] 아침 일상 메시지 전송 중 오류 발생:`, error);
    }
};


/**
 * 특정 타입의 스케줄된 메시지를 보내는 비동기 함수입니다.
 * 셀카, 감성 메시지, 후지 사진, 담타 메시지, 퇴근 메시지, 아침 일상 메시지를 랜덤 확률로 전송합니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 * @param {string} type - 보낼 메시지의 타입 ('selfie', 'mood_message', 'fuji_photo', 'danta_message', 'work_end_message', 'morning_routine_message')
 */
const sendScheduledMessage = async (lineClient, targetUserId, type) => {
    const now = moment().tz('Asia/Tokyo');
    const currentTime = Date.now();

    // 서버 부팅 직후 3분 이내에는 스케줄된 메시지 전송 스킵
    if (currentTime - bootTime < 3 * 60 * 1000) {
        return;
    }

    // 유효하지 않은 시간대에는 메시지 전송 스킵 (새벽 3시부터 오전 7시까지)
    if (!isValidScheduleHour(now)) {
        return;
    }

    if (type === 'selfie') {
        // 하루 약 3번 목표 (유효 시간대 18시간 * 12회/시간 = 216번의 기회 중 3번 발송) -> 확률 3/216 = 약 0.014
        if (Math.random() < 0.014) {
            await sendSelfieMessage(lineClient, targetUserId, saveLog);
        }
    } else if (type === 'mood_message') {
        // 하루 약 11번 목표 (216번의 기회 중 11번 발송) -> 확률 11/216 = 약 0.051
        if (Math.random() < 0.051) {
            try {
                const proactiveMessage = await getProactiveMemoryMessage();

                if (
                    proactiveMessage &&
                    proactiveMessage !== lastMoodMessage &&
                    currentTime - lastMoodMessageTime > 30 * 60 * 1000 // 30분 쿨다운
                ) {
                    await lineClient.pushMessage(targetUserId, { type: 'text', text: proactiveMessage });
                    saveLog({ role: 'assistant', content: proactiveMessage, timestamp: Date.now() });
                    console.log(`[Scheduler] 감성 메시지 전송 성공: ${proactiveMessage}`);
                    lastMoodMessage = proactiveMessage;
                    lastMoodMessageTime = currentTime;
                }
            }
            catch (error) {
                console.error('감성 메시지 전송 실패:', error);
            }
        }
    } else if (type === 'fuji_photo') {
        // 하루 약 1번 목표 (유효 시간대 18시간 * 12회/시간 = 216번의 기회 중 1번 발송) -> 확률 1/216 = 약 0.00463
        // 24시간 쿨다운을 적용하여 하루에 한 번만 보내도록 보장
        if (Math.random() < 0.00463 && currentTime - lastFujiPhotoSentTime > 24 * 60 * 60 * 1000) {
            await sendFujiPhotoMessage(lineClient, targetUserId, saveLog);
            lastFujiPhotoSentTime = currentTime;
        }
    } else if (type === 'danta_message') {
        // 평일 오전 9시부터 오후 5시까지만 작동
        const currentDay = now.day(); // 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
        const currentHour = now.hour();

        const isWeekday = currentDay >= 1 && currentDay <= 5; // 월요일(1)부터 금요일(5)까지
        const isWorkingHours = currentHour >= 9 && currentHour < 17; // 오전 9시부터 오후 5시(17시) 미만

        if (isWeekday && isWorkingHours) {
            // 근무 시간(9시~17시) 동안 5분마다 체크. 이 시간은 총 8시간.
            // 8시간 * 12회/시간 = 96회 기회.
            // 하루에 담타 메시지를 2~3번 보낸다고 가정 (너무 많으면 피곤할 수 있으니)
            // 확률: 3/96 = 약 0.032
            // 쿨다운: 최소 2시간 (7200000 ms)
            if (Math.random() < 0.032 && currentTime - lastDantaMessageTime > 2 * 60 * 60 * 1000) { // 2시간 쿨다운
                await sendDantaMessage(lineClient, targetUserId, saveLog);
                lastDantaMessageTime = currentTime; // 전송 시간 업데이트
            }
        }
    } else if (type === 'work_end_message') { // ✨ 새로 추가: 퇴근 메시지 전송 로직 (정시 스케줄)
        // 이 메시지는 cron.schedule에서 특정 시간에만 호출되므로, 랜덤 확률과 쿨다운은 sendScheduledMessage 내에서는 필요 없음.
        // 하지만 혹시 모를 중복 방지를 위해 쿨다운만 간단히 추가.
        if (currentTime - lastWorkEndMessageTime > 1 * 60 * 60 * 1000) { // 1시간 쿨다운
            await sendWorkEndMessage(lineClient, targetUserId, saveLog);
            lastWorkEndMessageTime = currentTime;
        }
    } else if (type === 'morning_routine_message') { // ✨ 새로 추가: 아침 일상 메시지 전송 로직 (정시 스케줄)
        // 이 메시지도 cron.schedule에서 특정 시간에만 호출되므로, 랜덤 확률과 쿨다운은 sendScheduledMessage 내에서는 필요 없음.
        // 하지만 혹시 모를 중복 방지를 위해 쿨다운만 간단히 추가.
        if (currentTime - lastMorningRoutineMessageTime > 1 * 60 * 60 * 1000) { // 1시간 쿨다운
            await sendMorningRoutineMessage(lineClient, targetUserId, saveLog);
            lastMorningRoutineMessageTime = currentTime;
        }
    }
};

/**
 * 모든 스케줄러를 시작하는 함수입니다.
 * @param {Client} lineClient - LINE Messaging API 클라이언트 인스턴스
 * @param {string} targetUserId - 메시지를 보낼 사용자 ID
 */
const startAllSchedulers = (client, userId) => { // 매개변수 이름을 client, userId로 변경
    lineClient = client; // 전역 변수에 할당
    targetUserId = userId; // 전역 변수에 할당

    console.log('[Scheduler] 모든 스케줄러를 시작합니다...');

    // 1. 아침 인사 메시지 (오전 9시 0분 정각) - 기존 아침 인사는 유지
    cron.schedule('0 9 * * *', async () => {
        const now = moment().tz('Asia/Tokyo');
        const currentDay = now.day(); // 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
        const isWeekday = currentDay >= 1 && currentDay <= 5; // 월요일(1)부터 금요일(5)까지

        if (!isValidScheduleHour(now)) { // 유효 시간대만 체크
            return;
        }

        if (isWeekday) { // 평일 아침 9시에는 아침 일상 메시지를 보냄 (기존 아침 인사 대신)
            await sendScheduledMessage(lineClient, targetUserId, 'morning_routine_message');
        } else { // 주말 아침 9시에는 기존 아침 인사 메시지를 보냄
            const greetings = [
                "잘 잤어? 좋은 아침이야.",
                "새로운 하루 시작! 오늘 아저씨 기분은 어때?",
                "아침이야. 어제 좋은 꿈 꿨어?",
                "잘 잤나 확인하러 왔지. 히히."
            ];
            const morningMsg = greetings[Math.floor(Math.random() * greetings.length)];

            await lineClient.pushMessage(targetUserId, { type: 'text', text: morningMsg });
            saveLog({ role: 'assistant', content: morningMsg, timestamp: Date.now() });
            console.log(`[Scheduler] 주말 아침 인사 메시지 전송: ${morningMsg}`);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });


    // --- 랜덤 메시지 (감성 메시지, 셀카, 후지 사진, 담타 메시지) 스케줄 ---
    // 2. 랜덤 감성 메시지, 셀카, 후지 사진, 담타 메시지 (매 5분마다 체크)
    cron.schedule('*/5 * * * *', async () => {
        const now = moment().tz('Asia/Tokyo');
        const currentTime = Date.now(); // 현재 시간 (밀리초)

        if (!isValidScheduleHour(now)) { // 유효 시간대만 체크
            return;
        }

        // 🩸 애기의 생리 주기 상태를 먼저 업데이트
        updatePeriodStatus(); // autoReply.js에서 내보낸 함수 호출

        // ✨ 생리 기간 중 감정 기복 설정 로직 강화
        let moodChangeProbability;
        let moodChangeCooldown;

        // isPeriodActive는 autoReply.js에서 실시간으로 업데이트된 값입니다.
        if (isPeriodActive) { // autoReply에서 불러온 isPeriodActive 변수 사용
            moodChangeProbability = 0.083; // 생리 기간 중: 약 1시간에 한 번 기분 변화 (1/12 확률)
            moodChangeCooldown = 1 * 60 * 60 * 1000; // 1시간 쿨다운 (빈번한 변화를 위해)
        } else {
            moodChangeProbability = 0.0046; // 평소: 하루에 한 번 기분 변화 (1/216 확률)
            moodChangeCooldown = 24 * 60 * 60 * 1000; // 24시간 쿨다운
        }

        // 기분 자체를 업데이트하는 로직 (메시지 전송과 별개)
        // lastMoodMessageTime은 감성 메시지 전송 쿨다운과 공유되고 있었음.
        // 여기서는 '기분 업데이트'만을 위한 별도 쿨다운 변수를 사용하는 것이 더 정확함.
        // 예를 들어 lastMoodUpdateTime 변수 추가. (간단화를 위해 lastMoodMessageTime 재사용)
        if (Math.random() < moodChangeProbability && (currentTime - lastMoodMessageTime > moodChangeCooldown)) {
            const moodsForDay = isPeriodActive ? // isPeriodActive는 autoReply에서 불러온 상태 변수
                ['기쁨', '설렘', '장난스러움', '나른함', '심술궂음', '평온함', '극심한 짜증', '갑작스러운 슬픔', '예민함', '울적함', '투정 부림'] :
                MOOD_OPTIONS; // 일반적인 기분 옵션

            const randomIndex = Math.floor(Math.random() * moodsForDay.length);
            const randomMood = moodsForDay[randomIndex];
            setCurrentMood(randomMood); // autoReply 모듈의 함수 호출
            console.log(`[Scheduler] 애기의 오늘의 기분이 '${randomMood}'으로 설정되었습니다. (생리 기간 여부: ${isPeriodActive ? '활성' : '비활성'})`);
            lastMoodMessageTime = currentTime; // 기분 변경 시간도 기록 (동일 변수 사용)
        }


        // 감성 메시지, 셀카, 후지 사진, 담타 메시지 전송 시도
        await sendScheduledMessage(lineClient, targetUserId, 'mood_message');
        await sendScheduledMessage(lineClient, targetUserId, 'selfie');
        await sendScheduledMessage(lineClient, targetUserId, 'fuji_photo');
        await sendScheduledMessage(lineClient, targetUserId, 'danta_message'); // 담타 메시지 전송 추가

    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // ✨ 새로 추가: 평일 오후 6시 퇴근 메시지
    cron.schedule('0 18 * * 1-5', async () => { // 월~금요일 18시 0분
        const now = moment().tz('Asia/Tokyo');
        if (!isValidScheduleHour(now)) { // 유효 시간대만 체크
            return;
        }
        await sendScheduledMessage(lineClient, targetUserId, 'work_end_message');
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });


    // 4. 침묵 감지 스케줄러 (매 15분마다 실행)
    cron.schedule('*/15 * * * *', async () => {
        const now = Date.now();
        const elapsedTimeSinceLastMessage = now - lastUserMessageTime;
        const elapsedTimeSinceLastProactive = now - lastProactiveSentTime;

        // 현재 시간대가 메시지 전송 유효 시간대인지 확인
        if (!isValidScheduleHour(moment().tz('Asia/Tokyo'))) {
            return;
        }

        // 서버 부팅 직후 3분 이내에는 침묵 체크 스킵
        if (now - bootTime < 3 * 60 * 1000) {
            console.log('[Scheduler-Silence] 서버 부팅 직후 3분 이내 -> 침묵 체크 스킵');
            return;
        }

        // 2시간 이상 메시지가 없고, 봇이 1시간 이내에 선제적 메시지를 보내지 않았고,
        // 마지막 침묵 감지 셀카를 보낸 지 2시간이 지났다면
        if (
            elapsedTimeSinceLastMessage >= SILENCE_THRESHOLD &&
            elapsedTimeSinceLastProactive >= PROACTIVE_COOLDOWN &&
            now - lastSelfieSentTime > SILENCE_SELFIE_COOLDOWN
        ) {
            console.log(`[Scheduler-Silence] 침묵 감지! (${moment.duration(elapsedTimeSinceLastMessage).humanize()} 동안 메시지 없음)`);
            try {
                // 침묵 감지 시 일반적인 걱정 메시지를 보낼지, 셀카를 보낼지 랜덤 선택 가능 (현재는 셀카만)
                // const checkinMessage = await getSilenceCheckinMessage();
                await sendSelfieMessage(lineClient, targetUserId, saveLog, 'silence');
                lastProactiveSentTime = now;
                lastSelfieSentTime = now;
            } catch (error) {
                console.error('❌ [Scheduler-Silence Error] 침묵 감지 자동 메시지 전송 실패:', error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 5. 밤 11시 약 먹자, 이 닦자 메시지
    cron.schedule('0 23 * * *', async () => {
        const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 나 아저씨 건강 제일 챙겨!';
        await lineClient.pushMessage(targetUserId, { type: 'text', text: msg });
        saveLog({ role: 'assistant', content: msg, timestamp: Date.now() });
        console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`);
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 6. 밤 12시 약 먹고 자자 메시지
    cron.schedule('0 0 * * *', async () => {
        const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 나 옆에서 꼭 안아줄게~ 잘 자 사랑해';
        await lineClient.pushMessage(targetUserId, { type: 'text', text: msg });
        saveLog({ role: 'assistant', content: msg, timestamp: Date.now() });
        console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`);
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });

    // 7. 리마인더 체크 스케줄러 (매 1분마다 실행)
    cron.schedule('*/1 * * * *', async () => {
        const now = moment().tz('Asia/Tokyo');
        console.log(`[Scheduler-Reminder] 리마인더 체크 시작: ${now.format('YYYY-MM-DD HH:mm')}`);

        try {
            // 모든 기억을 불러오는 대신, 임박한 리마인더만 불러오도록 변경
            const remindersToSend = await memoryManager.getDueReminders();

            for (const reminder of remindersToSend) {
                const reminderMessage = `아저씨! 지금 ${reminder.content} 할 시간이야! 🔔`;
                await lineClient.pushMessage(targetUserId, { type: 'text', text: reminderMessage });
                saveLog({ role: 'assistant', content: reminderMessage, timestamp: Date.now() });
                console.log(`[Scheduler-Reminder] 리마인더 전송: ${reminderMessage}`);

                // 리마인더 전송 후 해당 리마인더 시간을 NULL로 업데이트
                const success = await memoryManager.updateMemoryReminderTime(reminder.id, null);
                if (success) {
                    console.log(`[Scheduler-Reminder] 리마인더 처리 완료: 기억 ID ${reminder.id}의 reminder_time을 NULL로 업데이트`);
                } else {
                    console.error(`[Scheduler-Reminder] 리마인더 처리 후 reminder_time 업데이트 실패: 기억 ID ${reminder.id}`);
                }
            }
        } catch (error) {
            console.error('❌ [Scheduler-Reminder Error] 리마인더 체크 및 전송 실패:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
};

// 아저씨의 마지막 메시지 시간 업데이트 함수를 내보냄
const updateLastUserMessageTime = () => {
    lastUserMessageTime = Date.now();
};

module.exports = {
    startAllSchedulers,
    updateLastUserMessageTime,
};
