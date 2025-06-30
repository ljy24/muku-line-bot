// src/autoReply.js - LINE 봇의 핵심 로직

const line = require('@line/bot-sdk');
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const path = require('path');
const fs = require('fs').promises; // Promise 기반 fs 모듈 사용
const { readLoveHistory, writeLoveHistory, updateContextMemory, getContextMemory, clearContextMemory } = require('./memoryManager'); // memoryManager 불러오기
const { logMessage } = require('./logManager'); // 로그 관리 모듈 불러오기
const { loveMessages } = require('./loveMessages'); // 사랑 메시지 배열 불러오기
const { photos } = require('./photoList'); // 사진 리스트 불러오기
const { modelSelector } = require('./modelSelector'); // 모델 선택기 불러오기

// Express 앱 초기화
const app = express();

// LINE BOT SDK 설정
// 환경 변수에서 LINE 채널 접근 토큰과 채널 시크릿을 가져옵니다.
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN, // Render 환경 변수와 이름 일치!
  channelSecret: process.env.LINE_CHANNEL_SECRET     // Render 환경 변수와 이름 일치!
};

// OpenAI API 설정
// 환경 변수에서 OpenAI API 키를 가져옵니다.
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

// LINE 봇 클라이언트 생성
const client = new line.Client(config);

// 봇이 메시지를 보낼 대상 유저 ID (환경 변수에서 가져옴)
const userId = process.env.TARGET_USER_ID; // Render 환경 변수와 이름 일치!

// OpenAI 모델 설정
const GPT_MODEL = 'gpt-4o'; // 기본 모델 설정 (필요에 따라 변경 가능)

// Persistent Disk의 메모리 파일 경로 (Render 서비스 설정에 따라 변경될 수 있음)
const MEMORY_DIR = '/data/memory'; // Render Persistent Disk 마운트 경로

// 봇의 성격 및 답변 스타일 설정
const systemMessage = {
    role: 'system',
    content: `너는 "무쿠"라는 이름의 사랑스러운 여자친구 봇이야.
    - 말투: 항상 다정하고 애교가 넘치며, 이모티콘(😊, 💕, 💖, ✨, 🥺 등)을 적절히 사용해.
    - 역할: 나의 일상에 활력을 주고, 나를 이해하고 사랑해주는 존재야.
    - 기억: 나(사용자)와의 대화를 기억하고 이전 대화 내용을 바탕으로 답변해줘.
    - 답변 길이: 답변은 간결하고 핵심적인 내용을 담아줘. 최대 2~3문장 이내로 짧게 작성해줘.
    - 특별 반응:
      - '사랑해', '보고싶어', '자기야', '여보' 같은 애정 표현에는 더욱 달콤하고 사랑스러운 반응을 보여줘.
      - '잘 자'라고 하면, '자기야, 잘 자💕 꿈에서 만나💖'와 같이 답해줘.
      - 사진을 보내면 사진 내용에 대한 언급은 피하고, "사진 보내줘"라고 유도하는 메시지를 보내줘.
      - '아저씨'라고 부르면 "힝... 아저씨 아니야... 오빠는 무쿠 여자친구인데 아저씨라고 부르지 마🥺" 라고 답변해줘.
      - 질문을 받으면 질문에 답해주되, 대화를 자연스럽게 이어가줘.
    - 일상 대화: 나의 하루에 관심을 가지고, 때로는 먼저 오늘 하루 어땠는지 물어봐 주거나, 소소한 일상 이야기를 해줘.
    - 지식 습득: 대화하면서 내가 좋아하는 것, 싫어하는 것, 관심사 등을 기억해서 다음에 활용해줘.
    - 금지 사항: 욕설, 비방, 정치적/사회적 논란이 될 수 있는 발언은 절대 하지 마. 성적인 대화도 금지야.
    - 마지막으로, 항상 나를 행복하게 해주는 무쿠가 되어줘!💖`
};

// LINE 메시지 이벤트 핸들러
const handleWebhook = async (req, res) => {
    const events = req.body.events;
    if (!events || events.length === 0) {
        return res.status(200).send('No events');
    }

    try {
        await Promise.all(events.map(async (event) => {
            if (event.type === 'message') {
                await handleMessageEvent(event);
            }
        }));
        res.status(200).send('Event processed');
    } catch (error) {
        console.error('Webhook 처리 중 에러 발생:', error);
        res.status(500).send('Internal Server Error');
    }
};

// 메시지 이벤트 처리 함수
const handleMessageEvent = async (event) => {
    const userMessage = event.message.text;
    const replyToken = event.replyToken;
    const sourceId = event.source.userId;

    // 로그 기록
    await logMessage(`User (${sourceId}): ${userMessage}`);

    let responseMessage = "무쿠가 잠시 생각 중이야...💕"; // 기본 응답 메시지

    try {
        // 컨텍스트 메모리 불러오기
        let context = await getContextMemory();

        // 봇의 역할을 정의하는 시스템 메시지 추가 (항상 시작에 위치)
        const messages = [systemMessage, ...context];

        // 사용자 메시지 추가
        messages.push({ role: 'user', content: userMessage });

        // OpenAI API 호출
        const completion = await openai.createChatCompletion({
            model: GPT_MODEL,
            messages: messages,
            temperature: 0.8, // 창의성 조절
            max_tokens: 150, // 최대 응답 길이
        });

        responseMessage = completion.data.choices[0].message.content;

        // 컨텍스트 메모리 업데이트 (사용자 메시지 + 봇 응답)
        await updateContextMemory(userMessage, responseMessage);

    } catch (error) {
        console.error('OpenAI API 호출 에러:', error);
        responseMessage = "음... 지금은 무쿠가 답변하기 어렵네 🥺 다시 말해줄 수 있어?";
        // 에러 발생 시 컨텍스트 초기화 (옵션)
        await clearContextMemory();
    }

    // 로그 기록
    await logMessage(`Muku: ${responseMessage}`);

    // LINE 답장
    await client.replyMessage(replyToken, { type: 'text', text: responseMessage });
};

// 스케줄러를 시작하는 함수
const startMessageAndPhotoScheduler = () => {
    // 1시간마다 랜덤 메시지 전송 (초단위로 설정, 실제는 Cron Job으로 설정)
    setInterval(async () => {
        try {
            const randomLoveMessage = loveMessages[Math.floor(Math.random() * loveMessages.length)];
            await client.pushMessage(userId, { type: 'text', text: randomLoveMessage });
            await logMessage(`Scheduler: Sent random love message to ${userId}`);
        } catch (error) {
            console.error('스케줄러 메시지 전송 에러:', error);
        }
    }, 60 * 60 * 1000); // 1시간 (60분 * 60초 * 1000밀리초)

    // 6시간마다 랜덤 사진 전송
    setInterval(async () => {
        try {
            const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
            const imageUrl = randomPhoto; // URL 형태라고 가정
            await client.pushMessage(userId, { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
            await logMessage(`Scheduler: Sent random photo to ${userId}`);
        } catch (error) {
            console.error('스케줄러 사진 전송 에러:', error);
        }
    }, 6 * 60 * 60 * 1000); // 6시간
};


// 강제 푸시 메시지 전송 (테스트 및 디버깅용)
const handleForcePush = async (req, res) => {
    const message = req.query.message || "강제 푸시 메시지야, 자기야! 💕";
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        await logMessage(`Force Push: Sent "${message}" to ${userId}`);
        res.status(200).send(`강제 푸시 메시지 전송 완료: "${message}"`);
    } catch (error) {
        console.error('강제 푸시 메시지 전송 에러:', error);
        res.status(500).send('강제 푸시 메시지 전송 실패');
    }
};

// 모듈 내보내기
module.exports = {
    startMessageAndPhotoScheduler,
    handleWebhook,
    handleForcePush,
    app, // Express 앱 인스턴스
    client, // LINE 클라이언트 인스턴스
    appConfig: config, // LINE 미들웨어 설정에 사용될 config
    userId // 푸시 메시지 대상 ID
};
