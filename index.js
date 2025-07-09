// 파일 경로: /index.js
// 파일 이름: index.js
// 버전: v1.7
// 변경 내용: autoReply 모듈 require 누락 수정, 전체 흐름 정리 및 주석 강화

const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const autoReply = require('./autoReply'); // ✅ 누락되었던 autoReply 불러오기
const omoide = require('./omoide');
const concept = require('./concept');
const memoryManager = require('./memoryManager');

const app = express();
const port = process.env.PORT || 10000;

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.use(bodyParser.json());

// 🔔 Webhook 엔드포인트
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const message = event.message.text;
        const userId = event.source.userId;

        console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${new Date().toLocaleTimeString()}`);

        // ✅ 셀카 요청 메시지 감지
        const selfieKeywords = ['셀카', '얼굴', '얼굴 보여줘', '사진 줘', '얼굴보고싶어', '보고싶어'];
        const isSelfieRequest = selfieKeywords.some((word) => message.includes(word));

        if (isSelfieRequest) {
          console.log('[index.js] 셀카 요청 감지됨');

          // 셀카 전송 및 멘트 생성
          const imageUrl = await autoReply.sendRandomSelfieImage(client, userId);
          const comment = await autoReply.getImageReactionComment();

          await client.replyMessage(event.replyToken, [
            { type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl },
            { type: 'text', text: comment },
          ]);

          console.log('[index.js] 셀카 멘트 전송 완료');
          return;
        }

        // 🔄 일반 메시지에 대한 응답 처리
        const reply = await autoReply.getReplyByMessage(message);
        await client.replyMessage(event.replyToken, { type: 'text', text: reply });

        console.log('[index.js] 봇 응답 전송 완료 (타입: text)');

        // 기억 추출 시도
        await memoryManager.extractAndSaveMemory(message);
        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${message}")`);
      }

      // 이미지 메시지 처리
      if (event.type === 'message' && event.message.type === 'image') {
        const imageBuffer = await client.getMessageContent(event.message.id);
        const chunks = [];
        for await (let chunk of imageBuffer) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const base64Image = buffer.toString('base64');

        const reply = await autoReply.getReplyByImagePrompt(base64Image);
        await client.replyMessage(event.replyToken, { type: 'text', text: reply });

        console.log('[index.js] 이미지 응답 전송 완료');
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[index.js] 웹훅 처리 에러:', error);
    res.sendStatus(500);
  }
});

// 서버 기동
app.listen(port, () => {
  console.log(`무쿠 서버가 ${port}번 포트에서 실행 중입니다.`);
});
