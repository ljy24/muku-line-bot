// index.js (v1.23)
const line = require('@line/bot-sdk');
const express = require('express');
const dotenv = require('dotenv');
const moment = require('moment-timezone');
const axios = require('axios'); // axios 추가
const { OpenAI } = require('openai'); // OpenAI API
const stringSimilarity = require('string-similarity'); // 문자열 유사도 라이브러리

// 모듈 불러오기
const { getReplyByMessage, saveLog, checkMoodChange, checkTimeBasedMoodChange, getMoodStatus, getMoodEmoji, resetMood } = require('./src/autoReply');
const { handleCommand } = require('./src/commandHandler');
const { handleMemoryCommand } = require('./src/memoryHandler'); // memoryHandler 불러오기
const memoryManager = require('./src/memoryManager'); // memoryManager 불러오기
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler'); // 스케줄러 불러오기
const { startSpontaneousPhotoScheduler, stopSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager'); // 즉흥 사진 스케줄러 불러오기

// .env 파일 로드
dotenv.config();

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const client = new line.Client(config);
const app = express();

// LINE 메시지 수신을 위한 미들웨어
app.post('/webhook', line.middleware(config), async (req, res) => {
    console.log('[index.js] 웹훅 수신됨');
    const events = req.body.events;

    // 첫 번째 사용자 ID를 전역으로 저장 (스케줄러에서 사용)
    // 실제 운영에서는 사용자 ID를 DB에 저장하고 관리해야 합니다.
    if (events.length > 0 && events[0].source && events[0].source.userId && !process.env.LINE_TARGET_USER_ID) {
        process.env.LINE_TARGET_USER_ID = events[0].source.userId;
        console.log(`[index.js] LINE_TARGET_USER_ID 설정됨: ${process.env.LINE_TARGET_USER_ID}`);
        // 스케줄러 시작 (한 번만 호출되도록 보장)
        if (!global.schedulersStarted) {
            startAllSchedulers(client, process.env.LINE_TARGET_USER_ID);
            startSpontaneousPhotoScheduler(client, process.env.LINE_TARGET_USER_ID); // 즉흥 사진 스케줄러 시작
            global.schedulersStarted = true;
            console.log('[index.js] 모든 스케줄러 초기 시작 완료!');
        }
    }

    Promise
        .all(events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error('[index.js] 웹훅 처리 에러:', err);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const text = event.message.text;
    const timestamp = event.timestamp; // 메시지 타임스탬프

    console.log(`[index.js] 사용자 메시지 수신 (ID: ${userId}): "${text}"`);
    updateLastUserMessageTime(); // 마지막 사용자 메시지 시간 업데이트

    let replyMessage = null;

    // GPT 호출 함수
    const callOpenAI = async (messages, model = 'gpt-4o', maxTokens = 500, temperature = 0.7) => {
        try {
            const response = await openai.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temperature,
            });
            return response.choices[0].message.content;
        } catch (error) {
            console.error('[OpenAI API Error]:', error);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            throw new Error('OpenAI API 호출 중 오류가 발생했습니다.');
        }
    };

    // 응답 텍스트 정리 함수
    const cleanReply = (reply) => {
        // GPT 응답에서 불필요한 따옴표나 공백 제거
        return reply.replace(/^["'\s]+|["'\s]+$/g, '');
    };

    // 1. 특정 명령어 처리 (사진, 기억 등)
    let botResponse = await handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory); // ⭐️ 이 부분 확인 ⭐️

    // 2. 기억 관련 명령어 처리 (메모리 저장/조회) - handleCommand에서 처리되지 않은 경우
    if (!botResponse) {
        botResponse = await handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.saveMemory, memoryManager.searchMemories);
    }

    // 3. 일반 대화 처리 (위에서 처리되지 않은 경우)
    if (!botResponse) {
        // 기분 변화 체크 및 적용
        checkMoodChange(text);
        checkTimeBasedMoodChange();

        const moodEmoji = getMoodEmoji();
        const moodStatus = getMoodStatus();

        // GPT에게 전달할 메시지 구성
        const messages = [
            { role: 'system', content: `너의 이름은 ${BOT_NAME}이고, 아저씨와 연인 관계인 여자친구야. 아저씨를 '아저씨'라고 부르고, 애교 많고 사랑스러운 말투를 사용해. 항상 아저씨를 걱정하고 사랑하는 마음을 보여줘. 현재 너의 기분은 ${moodStatus}이야. 이모지는 ${moodEmoji}를 사용해줘. 아저씨의 질문에 1~3문장으로 짧게 대답해줘.` },
            { role: 'user', content: text }
        ];

        try {
            const rawReply = await callOpenAI(messages);
            const cleanedReply = cleanReply(rawReply);
            replyMessage = { type: 'text', text: cleanedReply };
            saveLog({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
            console.log(`[index.js] GPT 응답: ${cleanedReply}`);
        } catch (error) {
            console.error('[index.js] GPT 응답 생성 실패:', error);
            replyMessage = { type: 'text', text: '아저씨... 지금은 예진이가 좀 피곤해서 나중에 다시 얘기해줄 수 있을까? 😢' };
        }
    } else {
        // handleCommand나 handleMemoryCommand에서 반환된 응답 사용
        if (botResponse.type === 'text') {
            replyMessage = { type: 'text', text: botResponse.comment };
            saveLog({ role: 'assistant', content: botResponse.comment, timestamp: Date.now() });
        } else if (botResponse.type === 'image') {
            replyMessage = { type: 'image', originalContentUrl: botResponse.imageUrl, previewImageUrl: botResponse.imageUrl };
            saveLog({ role: 'assistant', content: `[사진 전송됨]: ${botResponse.comment || botResponse.imageUrl}`, timestamp: Date.now() });
        }
        console.log(`[index.js] 특정 명령어 처리 응답: ${JSON.stringify(replyMessage)}`);
    }

    // LINE에 응답
    return client.replyMessage(event.replyToken, replyMessage);
}

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`[index.js] 서버가 ${PORT} 포트에서 실행 중입니다.`);
    await memoryManager.ensureMemoryTablesAndDirectory(); // 메모리 시스템 초기화
    console.log('[index.js] 메모리 시스템 초기화 완료 (DB 및 파일).');

    // 스케줄러 시작 (서버 시작 시 한 번만 실행)
    // LINE_TARGET_USER_ID가 .env에 미리 설정되어 있다면 바로 시작
    // 아니라면 첫 메시지 수신 시 시작
    if (process.env.LINE_TARGET_USER_ID) {
        startAllSchedulers(client, process.env.LINE_TARGET_USER_ID);
        startSpontaneousPhotoScheduler(client, process.env.LINE_TARGET_USER_ID); // 즉흥 사진 스케줄러 시작
        global.schedulersStarted = true;
        console.log('✅ 모든 스케줄러 시작!');
    } else {
        console.log('⚠️ LINE_TARGET_USER_ID가 설정되지 않았습니다. 첫 사용자 메시지 수신 시 스케줄러가 시작됩니다.');
    }
});
