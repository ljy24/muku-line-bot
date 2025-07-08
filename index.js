// index.js - v1.3 (메시지 분류 및 에러 핸들링 개선)

const line = require('@line/bot-sdk');
const express = require('express');
const { getReplyByMessage, getReplyByImagePrompt, checkModelSwitchCommand, saveLog } = require('./src/autoReply'); // autoReply 모듈 불러오기
const { updateLastUserMessageTime } = require('./src/scheduler'); // scheduler에서 마지막 메시지 시간 업데이트 함수 불러오기
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

        // 1. 모델 전환 명령어 확인 (가장 먼저 처리)
        const modelSwitchReply = checkModelSwitchCommand(userMessage);
        if (modelSwitchReply) {
            await client.replyMessage(event.replyToken, { type: 'text', text: modelSwitchReply });
            saveLog({ role: 'assistant', content: modelSwitchReply, timestamp: Date.now() }); // 봇 응답 로그
            return;
        }

        let reply = null; // 애기의 응답을 저장할 변수

        // 2. 일반 대화 및 기분 확인, 생리 주기 질문 등 (autoReply.js로 위임 - 사진 요청보다 우선)
        // autoReply.js에서 기분 확인, "오늘 그날이야?" 등의 특별 응답을 먼저 처리하도록 설계됨
        reply = await getReplyByMessage(userMessage); 
        
        if (reply && reply.type === 'text' && reply.comment) {
            await client.replyMessage(event.replyToken, { type: 'text', text: reply.comment });
            // saveLog는 getReplyByMessage 내부에서 이미 처리되므로 여기서는 주석 처리
            return; 
        }
        // 만약 autoReply에서 텍스트 응답이 아니거나, null이 반환되면 다음 로직으로 넘어감.
        // 예를 들어, autoReply가 '사진 요청'으로 판단했지만, omoide.js로 넘기도록 결정한 경우.

        // 3. 사진 요청 처리 (omoide.js와 concept.js로 분기)
        // '셀카', '후지 사진', '인생네컷' 등 특정 키워드
        const photoKeywords = ['셀카', '후지 사진', '인생네컷', '커플사진', '일본 사진', '한국 사진', '출사', '필름카메라', '메이드', '흑심'];
        const isPhotoRequest = photoKeywords.some(keyword => userMessage.includes(keyword));

        if (isPhotoRequest) {
            const photoReply = await omoide.getOmoideReply(userMessage, saveLog); // omoide.js로 위임
            if (photoReply) {
                if (photoReply.type === 'photo') {
                    await client.replyMessage(event.replyToken, [
                        { type: 'image', originalContentUrl: photoReply.url, previewImageUrl: photoReply.url },
                        { type: 'text', text: photoReply.caption }
                    ]);
                } else if (photoReply.type === 'text') {
                    await client.replyMessage(event.replyToken, { type: 'text', text: photoReply.comment });
                }
                return; // 사진 요청 처리 후 종료
            }
        }
        // '컨셉 사진' 키워드는 concept.js에서 처리
        else if (userMessage.includes('컨셉 사진')) {
            const conceptReply = await concept.getConceptPhotoReply(userMessage, saveLog); // concept.js로 위임
            if (conceptReply) {
                if (conceptReply.type === 'photo') {
                    await client.replyMessage(event.replyToken, [
                        { type: 'image', originalContentUrl: conceptReply.url, previewImageUrl: conceptReply.url },
                        { type: 'text', text: conceptReply.caption }
                    ]);
                } else if (conceptReply.type === 'text') {
                    await client.replyMessage(event.replyToken, { type: 'text', text: conceptReply.comment });
                }
                return; // 컨셉 사진 요청 처리 후 종료
            }
        }

        // 4. 어떤 로직으로도 처리되지 않은 일반 텍스트 메시지 (Fallback)
        // 이 부분은 사실상 autoReply.getReplyByMessage에서 다 처리될 것이므로 거의 오지 않음
        // 하지만 혹시 모를 경우를 대비하여 폴백 메시지 추가
        if (!reply) { // reply가 아직 null인 경우
             const fallbackMessage = "음... 아저씨, 무슨 말인지 잘 모르겠어 ㅠㅠ 다시 한번 말해줄래?";
             await client.replyMessage(event.replyToken, { type: 'text', text: fallbackMessage });
             saveLog({ role: 'assistant', content: fallbackMessage, timestamp: Date.now() });
        }


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
