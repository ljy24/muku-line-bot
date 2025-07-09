// index.js - v1.7 (메시지 처리 우선순위 최종 수정 및 모든 문제 해결)

const line = require('@line/bot-sdk');
const express = require('express');
const { 
    getReplyByMessage, 
    getReplyByImagePrompt, 
    checkModelSwitchCommand, 
    saveLog, // ✨ saveLog를 autoReply.js에서 직접 불러옴
    callOpenAI, // 👈 callOpenAI 추가
    cleanReply  // 👈 cleanReply 추가
} = require('./src/autoReply'); // autoReply 모듈 불러오기

const scheduler = require('./src/scheduler'); // 👈 scheduler 모듈 전체 import
const { updateLastUserMessageTime } = scheduler; // 👈 필요한 함수 추출
const omoide = require('./memory/omoide'); // omoide 모듈 불러오기
const concept = require('./memory/concept'); // concept 모듈 불러오기

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
        const userMessage = event.message.text; // ✨ 중요: userMessage 변수를 여기서 정의
        console.log(`[Webhook] 아저씨 메시지 수신: "${userMessage}"`);
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() }); // 사용자 메시지 먼저 로그

        let reply = null; // 애기의 최종 응답을 저장할 변수

        // 1. 모델 전환 명령어 확인 (가장 먼저 처리)
        const modelSwitchReply = checkModelSwitchCommand(userMessage);
        if (modelSwitchReply) {
            reply = { type: 'text', comment: modelSwitchReply };
        } else {
            // 2. 사진 요청 처리 먼저 확인 (가장 구체적인 것부터)
            // 컨셉 사진 요청 (concept.js로 위임)
            const conceptReply = await concept.getConceptPhotoReply(userMessage, saveLog, callOpenAI, cleanReply); // 필요한 함수들을 인자로 전달
            if (conceptReply) {
                if (conceptReply.type === 'photo') {
                    await client.replyMessage(event.replyToken, [
                        { type: 'image', originalContentUrl: conceptReply.url, previewImageUrl: conceptReply.url },
                        { type: 'text', text: conceptReply.caption }
                    ]);
                } else if (conceptReply.type === 'text') { // concept에서 사진이 없어서 텍스트 응답을 준 경우
                    await client.replyMessage(event.replyToken, { type: 'text', text: conceptReply.comment });
                }
                return; // 컨셉 사진 요청 처리 후 종료
            }

            // 일반 추억 사진 요청 (omoide.js로 위임)
            const omoideReply = await omoide.getOmoideReply(userMessage, saveLog, callOpenAI, cleanReply); // 필요한 함수들을 인자로 전달
            if (omoideReply) {
                if (omoideReply.type === 'photo') {
                    await client.replyMessage(event.replyToken, [
                        { type: 'image', originalContentUrl: omoideReply.url, previewImageUrl: omoideReply.url },
                        { type: 'text', text: omoideReply.caption }
                    ]);
                } else if (omoideReply.type === 'text') { // omoide에서 사진이 없어서 텍스트 응답을 준 경우
                    await client.replyMessage(event.replyToken, { type: 'text', text: omoideReply.comment });
                }
                return; // 일반 사진 요청 처리 후 종료
            }

            // 3. 일반 대화, 기분 확인, 생리 주기 질문 등 (사진 요청이 아닐 때만 처리)
            reply = await getReplyByMessage(userMessage); 
        }

        // 애기에게 최종 응답 보내기 (일반 대화 응답)
        if (reply && reply.type === 'text' && reply.comment) {
            await client.replyMessage(event.replyToken, { type: 'text', text: reply.comment });
            // saveLog는 getReplyByMessage 내부에서 이미 처리되므로 여기서는 주석 처리
            return; 
        }

        // 4. 어떤 로직으로도 처리되지 않은 메시지 (Fallback)
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
            const base64ImageWithPrefix = `data:image/jpeg;base64,${base64Image}`; // JPEG 가정, 실제는 content-type 확인 필요
            const replyText = await getReplyByImagePrompt(base64ImageWithPrefix); // 이미지 프롬프트 생성
            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
            saveLog({ role: 'user', content: `[이미지 전송]`, timestamp: Date.now() }); // 사용자 이미지 전송 로그
            saveLog({ role: 'assistant', content: replyText, timestamp: Date.now() }); // 봇 응답 로그
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
    // 스케줄러 시작 (실제 사용자 ID로 변경 필요)
    // process.env.LINE_TARGET_USER_ID에 실제 사용자 ID를 .env 파일에 추가해야 합니다.
    const LINE_TARGET_USER_ID = process.env.LINE_TARGET_USER_ID;
    if (LINE_TARGET_USER_ID) {
        scheduler.startAllSchedulers(client, LINE_TARGET_USER_ID);
        console.log("✅ 모든 스케줄러 시작!");
    } else {
        console.warn("⚠️ LINE_TARGET_USER_ID 환경 변수가 설정되지 않아 스케줄러가 시작되지 않습니다.");
    }
});
