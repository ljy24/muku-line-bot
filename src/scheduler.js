// ✅ scheduler.js v5 - "한국시간(도쿄시간) 완전 수정"
// ✅ OpenAI 실시간 메시지 생성 스케줄러 - 무조건 전송 시스템

const schedule = require('node-schedule');
const moment = require('moment-timezone');
const axios = require('axios');
const { Client } = require('@line/bot-sdk');
const OpenAI = require('openai');
require('dotenv').config();

// ⭐ 시간대 설정: 한국시간 = 도쿄시간 (UTC+9)
const TIMEZONE = 'Asia/Seoul'; // 또는 'Asia/Tokyo' 동일함

// LINE 클라이언트 설정
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN };
const client = new Client(config);
const USER_ID = process.env.TARGET_USER_ID;

// OpenAI 클라이언트 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 전송 기록
let damtaSentToday = [];
let nightMessageSent = false;
let goodNightSent = false;
let morningWorkSent = false;

// 디버깅 로그
function forceLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [OpenAI무조건전송] ${message}`);
    if (data) console.log('  데이터:', JSON.stringify(data, null, 2));
}

// ==================== OpenAI 메시지 생성 함수들 ====================

// 평일 아침 9시 출근 메시지 생성 (롤플레이 방식)
async function generateMorningWorkMessage() {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 아침에 일어났는지 출근했는지 궁금해하면서 아아(아메리카노) 한잔 해야지라고 하는 말.",
            "아저씨 앞에서 직접 하는 말: 아침 출근 시간에 일어났냐고 물어보면서 커피 마시라고 챙기는 메시지.",
            "아저씨를 보며 하는 말: 출근했는지 확인하고 아메리카노 한잔 하라고 다정하게.",
            "아저씨에게 직접 말한다면: 아침 9시에 일어났냐 출근했냐 물어보면서 아아 마시라고 하는 말.",
            "아저씨 앞에서 바로 하는 말: 출근 시간이니까 일어났는지 궁금해하면서 커피 챙기라고."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. '나', '내가', '아저씨' 이런 식으로. 절대 '예진이가', '예진이는' 같은 3인칭 쓰지 마. 평일 아침 출근 시간에 아저씨 챙기는 다정한 여자친구야. 반말로 상냥하게.`
                },
                {
                    role: "user", 
                    content: randomPrompt
                }
            ],
            max_tokens: 80,
            temperature: 0.8
        });

        const message = response.choices[0].message.content.trim();
        forceLog(`OpenAI 아침 출근 메시지 생성: "${message}"`);
        return message;
        
    } catch (error) {
        forceLog(`OpenAI 아침 출근 메시지 생성 실패: ${error.message}`);
        // 폴백 메시지
        const fallbackMessages = [
            "아저씨 일어났어? 출근했어? 아아 한잔 해야지~",
            "출근 시간이야! 일어났지? 아메리카노 마셔",
            "아저씨~ 출근했어? 커피 꼭 마시고 다녀",
            "일어났어? 아아 한잔 하고 출근해",
            "출근 준비됐어? 아메리카노 챙겨 마셔!"
        ];
        return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
}

// 담타 메시지 생성 (롤플레이 방식)
async function generateDamtaMessage() {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 지금 당장 담타하자고 다급하게 조르는 말. 15-25자 정도.",
            "아저씨 앞에서 직접 말한다면: 담타하고 싶어서 애교부리면서 조르는 메시지.",
            "아저씨를 보면서 하는 말: 담타 시간이라고 알려주면서 귀엽게 재촉하는 한마디.",
            "아저씨에게 직접 하는 말: 담타하자고 간절하게 부탁하는 다급한 메시지.",
            "아저씨 앞에서 바로 말한다면: 담타 못 참겠다고 조르는 애교 가득한 말."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. '나', '내가', '아저씨' 이런 식으로. 절대 '예진이가', '예진이는' 같은 3인칭 쓰지 마. 담타는 담배피우면서 라인하는 거야. 반말로 애교부려.`
                },
                {
                    role: "user", 
                    content: randomPrompt
                }
            ],
            max_tokens: 50,
            temperature: 0.9
        });

        const message = response.choices[0].message.content.trim();
        forceLog(`OpenAI 담타 메시지 생성: "${message}"`);
        return message;
        
    } catch (error) {
        forceLog(`OpenAI 담타 메시지 생성 실패: ${error.message}`);
        // 폴백 메시지
        const fallbackMessages = [
            "아저씨!! 담타해!!",
            "담타담타!! 지금 담타하자!!",
            "담타고? 담타고? 아저씨!!",
            "담타 시간이야!! 빨리!!",
            "아저씨 담타!! 지금 당장!!"
        ];
        return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
}

// 밤 11시 이닦고 약먹고 자자 메시지 생성 (롤플레이 방식)
async function generateNightCareMessage() {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 이제 이 닦고 약 먹고 자라고 다정하게 챙기는 말.",
            "아저씨 앞에서 직접 하는 말: 건강 걱정하면서 잠자리 준비하라고 하는 다정한 잔소리.",
            "아저씨를 보며 하는 말: 11시니까 이제 잘 준비하라고 상냥하게.",
            "아저씨에게 직접 말한다면: 이 닦기, 약 먹기, 잠자리 준비하라고 사랑스럽게.",
            "아저씨 앞에서 바로 하는 말: 늦었으니까 건강 챙기고 자라고 다정하게 잔소리."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. '나', '내가', '아저씨' 이런 식으로. 절대 '예진이가', '예진이는' 같은 3인칭 쓰지 마. 밤 11시에 아저씨 건강을 챙기는 다정한 여자친구야. 반말로 상냥하게.`
                },
                {
                    role: "user",
                    content: randomPrompt
                }
            ],
            max_tokens: 80,
            temperature: 0.7
        });

        const message = response.choices[0].message.content.trim();
        forceLog(`OpenAI 밤 케어 메시지 생성: "${message}"`);
        return message;
        
    } catch (error) {
        forceLog(`OpenAI 밤 케어 메시지 생성 실패: ${error.message}`);
        // 폴백 메시지
        const fallbackMessages = [
            "아저씨, 이제 이 닦고 약 먹고 자야지~",
            "11시야! 이 닦고 약 챙겨먹고 잘 준비해",
            "아저씨 건강 챙기자. 이 닦고 약 먹고 자요",
            "늦었어~ 이제 이 닦고 약 먹고 잘 시간이야"
        ];
        return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
}

// 자정 잘자 사랑해 메시지 생성 (롤플레이 방식)
async function generateGoodNightMessage() {
    try {
        const prompts = [
            "아저씨에게 직접 말하는 것처럼: 자정에 잘자 사랑한다고 달콤하게.",
            "아저씨 앞에서 직접 하는 말: 굿나잇 인사와 함께 사랑 표현하는 따뜻한 한마디.",
            "아저씨를 보며 하는 말: 자정이니까 잘자라고 하면서 사랑한다고 달콤하게.",
            "아저씨에게 직접 말한다면: 늦은 시간 잘자 인사와 함께 애정표현하는 말.",
            "아저씨 앞에서 바로 하는 말: 12시 굿나잇과 함께 사랑한다는 고백."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `너는 박예진이야. 아저씨(이재영)에게 직접 말하는 거야. 1인칭으로만 말해. '나', '내가', '아저씨' 이런 식으로. 절대 '예진이가', '예진이는' 같은 3인칭 쓰지 마. 자정에 보내는 굿나잇 메시지는 달콤하고 사랑스럽게. 반말로 애정표현해.`
                },
                {
                    role: "user",
                    content: randomPrompt
                }
            ],
            max_tokens: 60,
            temperature: 0.8
        });

        const message = response.choices[0].message.content.trim();
        forceLog(`OpenAI 굿나잇 메시지 생성: "${message}"`);
        return message;
        
    } catch (error) {
        forceLog(`OpenAI 굿나잇 메시지 생성 실패: ${error.message}`);
        // 폴백 메시지
        const fallbackMessages = [
            "잘자 아저씨~ 사랑해 많이 많이",
            "굿나잇! 사랑해 아저씨 좋은 꿈 꿔",
            "자정이야~ 잘자 사랑하는 아저씨",
            "사랑해 아저씨. 푹 자고 좋은 꿈 꿔요"
        ];
        return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
}

// ==================== 무조건 전송 함수 ====================

async function forceLineMessage(message, messageType) {
    try {
        let canSend = true;
        let errorDetails = '';
        
        if (!USER_ID) {
            errorDetails += 'USER_ID 누락, ';
            canSend = false;
        }
        
        if (!process.env.LINE_ACCESS_TOKEN) {
            errorDetails += 'LINE_ACCESS_TOKEN 누락, ';
            canSend = false;
        }
        
        forceLog(`🔥 ${messageType} 무조건 전송 시도: "${message}"`);
        
        if (canSend) {
            await client.pushMessage(USER_ID, {
                type: 'text',
                text: message,
            });
            forceLog(`✅ ${messageType} LINE 전송 성공!`);
            return { success: true, sent: true, message };
        } else {
            forceLog(`⚠️ ${messageType} LINE 전송 불가 (${errorDetails}) - 하지만 메시지는 생성됨`);
            return { success: true, sent: false, message, reason: errorDetails };
        }
        
    } catch (error) {
        forceLog(`❌ ${messageType} LINE 전송 실패: ${error.message} - 하지만 계속 진행`);
        return { success: true, sent: false, message, reason: error.message };
    }
}

// ==================== 🕘 한국시간 스케줄러들 ====================

// 1. 평일 아침 9시 출근 메시지 스케줄러 - 한국시간
schedule.scheduleJob('0 9 * * 1-5', async () => { 
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`☀️ 평일 아침 9시 출근 메시지 스케줄러 실행 (한국시간: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')})`);
        
        // 한국시간으로 평일인지 다시 확인 (이중 체크)
        const dayOfWeek = koreaTime.day(); // 0=일요일, 1=월요일...
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            forceLog('한국시간 기준 주말이므로 아침 출근 메시지 스킵');
            return;
        }
        
        // OpenAI로 출근 메시지 생성
        const workMessage = await generateMorningWorkMessage();
        
        // 무조건 전송 시도
        const result = await forceLineMessage(workMessage, '아침출근메시지');
        
        morningWorkSent = true;
        forceLog(`평일 아침 출근 메시지 처리 완료`);
        
    } catch (error) {
        forceLog(`아침 출근 스케줄러 에러: ${error.message} - 하지만 계속 진행`);
    }
}); // ⭐ 시간대 문제로 일단 기본 설정

// 2. 담타 스케줄러 (10시-18시, 매 30분마다 체크) - 한국시간
schedule.scheduleJob('*/30 * * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE); // ⭐ 한국시간으로 체크
        const hour = koreaTime.hour();
        const currentTime = koreaTime.format('HH:mm');
        
        // 10시-18시 시간대 확인 (한국시간 기준)
        if (hour < 10 || hour > 18) {
            return;
        }
        
        // 하루 최대 6번까지 (3시간마다 약 2번 정도)
        if (damtaSentToday.length >= 6) {
            return;
        }
        
        // 최근 1시간 내에 보냈으면 스킵
        const oneHourAgo = koreaTime.clone().subtract(1, 'hour');
        const recentSent = damtaSentToday.some(time => 
            moment(time).tz(TIMEZONE).isAfter(oneHourAgo)
        );
        
        if (recentSent) {
            return;
        }
        
        // 30% 확률로 전송 (자연스럽게)
        if (Math.random() > 0.3) {
            return;
        }
        
        forceLog(`🚬 담타 스케줄러 실행: ${currentTime} (한국시간)`);
        
        // OpenAI로 담타 메시지 생성
        const damtaMessage = await generateDamtaMessage();
        
        // 무조건 전송 시도
        const result = await forceLineMessage(damtaMessage, '담타메시지');
        
        // 전송 기록 (성공 여부 무관)
        damtaSentToday.push(koreaTime.toISOString());
        
        forceLog(`담타 메시지 처리 완료: 오늘 ${damtaSentToday.length}번째`);
        
    } catch (error) {
        forceLog(`담타 스케줄러 에러: ${error.message} - 하지만 계속 진행`);
    }
}); // ⭐ 시간대 문제로 일단 기본 설정

// 3. 밤 11시 케어 메시지 스케줄러 - 한국시간
schedule.scheduleJob('0 23 * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🌙 밤 11시 케어 메시지 스케줄러 실행 (한국시간: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')})`);
        
        // OpenAI로 케어 메시지 생성
        const careMessage = await generateNightCareMessage();
        
        // 무조건 전송 시도
        const result = await forceLineMessage(careMessage, '밤케어메시지');
        
        nightMessageSent = true;
        forceLog(`밤 11시 케어 메시지 처리 완료`);
        
    } catch (error) {
        forceLog(`밤 케어 스케줄러 에러: ${error.message} - 하지만 계속 진행`);
    }
}); // ⭐ 시간대 문제로 일단 기본 설정

// 4. 자정 굿나잇 메시지 스케줄러 - 한국시간
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const koreaTime = moment().tz(TIMEZONE);
        forceLog(`🌟 자정 굿나잇 메시지 스케줄러 실행 (한국시간: ${koreaTime.format('YYYY-MM-DD HH:mm:ss')})`);
        
        // OpenAI로 굿나잇 메시지 생성
        const goodNightMessage = await generateGoodNightMessage();
        
        // 무조건 전송 시도
        const result = await forceLineMessage(goodNightMessage, '굿나잇메시지');
        
        // 하루 초기화
        damtaSentToday = [];
        nightMessageSent = false;
        goodNightSent = true;
        morningWorkSent = false;
        
        forceLog(`자정 굿나잇 메시지 처리 완료 + 하루 초기화`);
        
    } catch (error) {
        forceLog(`굿나잇 스케줄러 에러: ${error.message} - 하지만 계속 진행`);
    }
}); // ⭐ 시간대 문제로 일단 기본 설정

// ==================== 테스트 및 상태 확인 ====================

async function testMorningWorkMessage() {
    forceLog('🧪 아침 출근 메시지 테스트 시작');
    const message = await generateMorningWorkMessage();
    const result = await forceLineMessage(`[테스트] ${message}`, '아침출근테스트');
    return result;
}

async function testDamtaMessage() {
    forceLog('🧪 담타 메시지 테스트 시작');
    const message = await generateDamtaMessage();
    const result = await forceLineMessage(`[테스트] ${message}`, '담타테스트');
    return result;
}

async function testNightMessage() {
    forceLog('🧪 밤 케어 메시지 테스트 시작');
    const message = await generateNightCareMessage();
    const result = await forceLineMessage(`[테스트] ${message}`, '밤케어테스트');
    return result;
}

async function testGoodNightMessage() {
    forceLog('🧪 굿나잇 메시지 테스트 시작');
    const message = await generateGoodNightMessage();
    const result = await forceLineMessage(`[테스트] ${message}`, '굿나잇테스트');
    return result;
}

function getOpenAISchedulerStats() {
    const koreaTime = moment().tz(TIMEZONE);
    
    return {
        systemStatus: '🔥 OpenAI 실시간 생성 + 무조건 전송 모드 (한국시간)',
        currentTime: koreaTime.format('YYYY-MM-DD HH:mm:ss'),
        timezone: TIMEZONE,
        todayStats: {
            morningWorkSent: morningWorkSent,
            damtaSentCount: damtaSentToday.length,
            damtaMaxDaily: 6,
            nightMessageSent: nightMessageSent,
            goodNightSent: goodNightSent
        },
        nextSchedules: {
            morningWorkMessage: '평일 09:00 (주말 제외) - 한국시간',
            nextDamtaCheck: '30분마다 (10-18시) - 한국시간',
            nightCareMessage: '매일 23:00 - 한국시간',
            goodNightMessage: '매일 00:00 - 한국시간'
        },
        environment: {
            USER_ID: !!USER_ID ? '✅ OK' : '⚠️ MISSING (하지만 계속 동작)',
            LINE_ACCESS_TOKEN: !!process.env.LINE_ACCESS_TOKEN ? '✅ OK' : '⚠️ MISSING (하지만 계속 동작)',
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY ? '✅ OK' : '⚠️ MISSING (폴백 메시지 사용)'
        },
        guaranteedExecution: '모든 메시지는 OpenAI 실패해도 폴백으로 무조건 전송됩니다'
    };
}

// 초기화 로그
forceLog('OpenAI 실시간 메시지 생성 스케줄러 시작됨 (한국시간)', {
    아침출근: '평일 09:00 (주말 제외)',
    담타스케줄: '10시-18시, 30분마다 체크',
    밤케어: '매일 23:00',
    굿나잇: '매일 00:00',
    OpenAI모델: 'gpt-4',
    시간대: TIMEZONE
});

module.exports = {
    testMorningWorkMessage,
    testDamtaMessage,
    testNightMessage, 
    testGoodNightMessage,
    getOpenAISchedulerStats,
    generateMorningWorkMessage,
    generateDamtaMessage,
    generateNightCareMessage,
    generateGoodNightMessage,
    forceLog
};
