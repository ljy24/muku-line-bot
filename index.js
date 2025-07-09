// index.js - v1.8 (메시지 처리 우선순위 및 순환 의존성 문제 최종 해결)

const line = require('@line/bot-sdk');
const express = require('express');
const { 
    getReplyByMessage, 
    getReplyByImagePrompt, 
    checkModelSwitchCommand, 
    saveLog, 
    callOpenAI, 
    cleanReply  
} = require('./src/autoReply'); // autoReply 모듈 불러오기

const scheduler = require('./src/scheduler'); 
const { updateLastUserMessageTime } = scheduler; 

require('dotenv').config(); // .env 파일 로드

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

// 웹훅 이벤트 핸들러
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error('[index.js] 웹훅 처리 에러:', err);
            res.status(500).end();
        });
});

// 이벤트 핸들 함수
async function handleEvent(event) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    // 아저씨의 메시지 수신 시간 업데이트 (스케줄러에서 사용)
    updateLastUserMessageTime();

    if (event.message.type === 'text') {
        const userMessage = event.message.text; 
        console.log(`[Webhook] 아저씨 메시지 수신: "${userMessage}"`);
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() }); 

        let reply = null; 

        // 1. 모델 전환 명령어 확인 (가장 먼저 처리)
        const modelSwitchReply = checkModelSwitchCommand(userMessage);
        if (modelSwitchReply) {
            reply = { type: 'text', comment: modelSwitchReply };
        } else {
            // 모든 텍스트 메시지 처리는 getReplyByMessage로 위임
            // getReplyByMessage 내부에서 사진 요청 (셀카, 컨셉, 추억/커플) 및 일반 대화 처리 우선순위가 정해집니다.
            reply = await getReplyByMessage(userMessage, saveLog, callOpenAI, cleanReply); 
        }

        // 애기에게 최종 응답 보내기 (일반 대화 응답 및 사진 응답)
        if (reply) {
            if (reply.type === 'text') {
                if (reply.comment) {
                    await client.replyMessage(event.replyToken, { type: 'text', text: reply.comment });
                }
            } else if (reply.type === 'image') {
                await client.replyMessage(event.replyToken, [
                    { type: 'image', originalContentUrl: reply.originalContentUrl, previewImageUrl: reply.previewImageUrl },
                    { type: 'text', text: reply.caption || reply.altText } 
                ]);
            }
            return; 
        }
        
        // 어떤 로직으로도 처리되지 않은 메시지 (Fallback)
        const fallbackMessage = "음... 아저씨, 무슨 말인지 잘 모르겠어 ㅠㅠ 다시 한번 말해줄래?";
        await client.replyMessage(event.replyToken, { type: 'text', text: fallbackMessage });
        saveLog({ role: 'assistant', content: fallbackMessage, timestamp: Date.now() });

    } else if (event.message.type === 'image') {
        // 이미지 메시지 처리 (Line에서 이미지를 받으면 Base64로 인코딩하여 AI에 전달)
        const content = await client.getMessageContent(event.message.id);
        const buffer = [];
        content.on('data', (chunk) => buffer.push(chunk));
        content.on('end', async () => {
            const base64Image = Buffer.concat(buffer).toString('base64');
            const base64ImageWithPrefix = `data:image/jpeg;base64,${base64Image}`; 
            const replyText = await getReplyByImagePrompt(base64ImageWithPrefix); 
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
            saveLog({ role: 'user', content: `[이미지 전송]`, timestamp: Date.now() }); 
            saveLog({ role: 'assistant', content: replyText, timestamp: Date.now() }); 
        });
        return;
    }

    // 기타 메시지 타입 (스티커, 동영상 등)은 무시
    return Promise.resolve(null);
}

// 서버 시작
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`무쿠 서버 스타트! 포트: ${port}`);
    const LINE_TARGET_USER_ID = process.env.LINE_TARGET_USER_ID;
    if (LINE_TARGET_USER_ID) {
        scheduler.startAllSchedulers(client, LINE_TARGET_USER_ID);
        console.log("✅ 모든 스케줄러 시작!");
    } else {
        console.warn("⚠️ LINE_TARGET_USER_ID 환경 변수가 설정되지 않아 스케줄러가 시작되지 않습니다.");
    }
});
