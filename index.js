// 📦 기본 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 🧠 자동응답 함수들
const {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getRandomSelfieImage,
  saveLog,
  setForcedModel,
  saveMemory,
  updateHonorificUsage
} = require('./src/autoReply');

// 📱 LINE API 설정
const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// ✅ 로그 파일 쓰기 확인
fs.access('memory/message-log.json', fs.constants.W_OK, (err) => {
  if (err) console.error('❌ message-log.json 쓰기 불가!');
  else console.log('✅ message-log.json 쓰기 가능!');
});

// 🏠 기본 응답
app.get('/', (_, res) => res.send('무쿠 살아있엉 🐣'));

// 💥 강제 메시지 푸시
app.get('/force-push', async (req, res) => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send(`✅ 전송됨: ${msg}`);
  } else res.send('❌ 메시지 생성 실패');
});

// 🚀 서버 시작 시 감정형 메시지 전송
(async () => {
  const msg = await getRandomMessage();
  if (msg) {
    await client.pushMessage(userId, { type: 'text', text: msg });
    saveLog('예진이', msg);
    console.log(`[서버시작랜덤] ${msg}`);
  }
})();

// 🌐 웹훅 처리
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          saveLog('아저씨', text);

          // ✅ GPT 모델 강제 전환 명령
          if (/^(3\.5|gpt-?3\.5)$/i.test(text)) {
            setForcedModel('gpt-3.5-turbo');
            await client.replyMessage(event.replyToken, { type: 'text', text: 'gpt-3.5로 설정했어!' });
            return;
          }
          if (/^(4\.0|gpt-?4|gpt-?4o)$/i.test(text)) {
            setForcedModel('gpt-4o');
            await client.replyMessage(event.replyToken, { type: 'text', text: 'gpt-4o로 설정했어!' });
            return;
          }
          if (/^(auto|자동)$/i.test(text)) {
            setForcedModel(null);
            await client.replyMessage(event.replyToken, { type: 'text', text: '자동 모드로 전환했어!' });
            return;
          }

          // ✅ 색 관련 감정 메시지
          if (/무슨\s*색|기분.*색|오늘.*색/i.test(text)) {
            const reply = await getColorMoodReply();
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
            return;
          }

          // ✅ 셀카 요청 반응 (이미지 + 예진이 말투 멘트)
          if (/사진|셀카|얼굴|보고싶어|보고 싶어/i.test(text)) {
            const imageUrl = await getRandomSelfieImage(); // 예: https://de-ji.net/yejin/0001.jpg
            const imageComment = await getImageReactionComment();
            await client.replyMessage(event.replyToken, [
              {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl
              },
              {
                type: 'text',
                text: imageComment
              }
            ]);
            saveLog('예진이', imageComment);
            return;
          }

          // ✅ 일반 대화 메시지
          const reply = await getReplyByMessage(text);
          const final = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
          saveLog('예진이', final);
          await client.replyMessage(event.replyToken, { type: 'text', text: final });
        }

        // ✅ 이미지 메시지
        if (message.type === 'image') {
          try {
            const stream = await client.getMessageContent(message.id);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const reply = await getReplyByImagePrompt(buffer.toString('base64'));
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: reply?.trim() || '사진에 반응 못했어 ㅠㅠ'
            });
          } catch (err) {
            console.error('🖼️ 이미지 처리 실패:', err);
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
            });
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('웹훅 처리 에러:', err);
    res.status(200).send('OK');
  }
});

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
});