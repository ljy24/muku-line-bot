// 필수 라이브러리 로드
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// 환경변수(.env) 로드
dotenv.config();

// LINE Messaging API 설정
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINE 클라이언트 생성
const client = new Client(config);

// 무쿠 감정 응답 모듈 불러오기
const autoReply = require('./autoReply');

// 자동 감정 메시지 스케줄러 연결
require('./scheduler'); // 이 한 줄로 매일 랜덤 시간 5회 자동 메시지 전송됨

// 서버 인스턴스 생성
const app = express();
app.use(bodyParser.json());
app.use(middleware(config));

// 사용자별 GPT 버전 상태 저장용 객체
const userGPTVersion = {};

// Webhook 엔드포인트 처리
app.post('/webhook', async (req, res) => {
  // 이벤트 배열 반복 처리
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('❌ 이벤트 처리 중 오류:', err);
      res.status(500).end();
    });
});

// 실제 이벤트 처리 함수
async function handleEvent(event) {
  // 메시지 유형이 아니면 무시
  if (event.type !== 'message') return null;

  const userId = event.source.userId;
  const userMessage = event.message.text || '';

  // 모델 변경 명령 처리 (예: "3.5", "4.0")
  if (userMessage.includes('3.5')) {
    userGPTVersion[userId] = 'gpt-3.5-turbo';
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '응~ 지금부터 3.5로 할게',
    });
  } else if (userMessage.includes('4.0')) {
    userGPTVersion[userId] = 'gpt-4o';
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '응~ 지금은 4.0이야',
    });
  }

  // 현재 사용자에게 설정된 GPT 버전 가져오기
  const version = userGPTVersion[userId] || 'gpt-4o';

  // 이미지 메시지 처리
  if (event.message.type === 'image') {
    try {
      // 이미지 데이터 다운로드
      const stream = await client.getMessageContent(event.message.id);
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      await new Promise((resolve) => stream.on('end', resolve));
      const buffer = Buffer.concat(chunks);

      // base64로 인코딩
      const base64 = buffer.toString('base64');

      // 예진이 말투로 이미지 리액션 생성
      const reply = await autoReply.getReplyByImagePrompt(base64);

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: reply,
      });
    } catch (err) {
      console.error('❌ 이미지 처리 오류:', err.message);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '사진 분석 중 오류났어 ㅠ 다시 보내줘',
      });
    }
  }

  // 일반 텍스트 메시지 처리
  const replyText = await autoReply.getReplyByMessage(userMessage, userId, version);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

// 테스트용 메시지 즉시 전송 엔드포인트 (예: curl, cron-job용)
app.get('/force-push', async (req, res) => {
  try {
    const msg = await autoReply.getRandomMessage();
    const userId = process.env.ONLY_USER_ID;
    await client.pushMessage(userId, { type: 'text', text: msg });
    res.send('✅ 메시지 전송 완료');
  } catch (err) {
    console.error('❌ 강제 푸시 오류:', err.message);
    res.status(500).send('에러 발생');
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 무쿠 LINE 서버 실행 중 (포트: ${PORT})`);
});
