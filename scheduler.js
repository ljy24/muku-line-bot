// 📅 예진이 자동 감정 메시지 전송 스케줄러
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { client } = require('@line/bot-sdk');
const { getRandomMessage } = require('./autoReply');
require('dotenv').config();

// 📌 하루 메시지 전송 횟수 및 대상 유저 설정
const DAILY_LIMIT = 8;
const USER_ID = process.env.ONLY_USER_ID;

// 🧠 오늘 날짜에 몇 번 보냈는지 추적용 메모리
let sentTimestamps = [];

// 🔄 자정마다 초기화
schedule.scheduleJob('0 0 * * *', () => {
  sentTimestamps = [];
  console.log('🌙 자정 초기화 완료: 예진이 감정 메시지 카운터 reset');
});

// ⏰ 매 5분마다 실행 → 전송 조건을 만족하는 랜덤 타이밍에만 전송
schedule.scheduleJob('*/5 * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const hour = now.hour();
  const minute = now.minute();

  // 이미 5번 보냈으면 오늘은 더 안 보냄
  if (sentTimestamps.length >= DAILY_LIMIT) return;

  // 전송 시간 범위: 일본 기준 오전 9시 ~ 다음날 새벽 3시
  const inAllowedTime =
    (hour >= 9 && hour <= 23) || (hour >= 0 && hour < 3);

  if (!inAllowedTime) return;

  // 이미 전송된 시간과 겹치지 않도록 체크
  const currentTimestamp = now.format('HH:mm');
  if (sentTimestamps.includes(currentTimestamp)) return;

  // 5분마다 실행 중, 랜덤 확률로 전송 결정 (대략 30% 확률)
  const shouldSend = Math.random() < 0.3;
  if (!shouldSend) return;

  try {
    const msg = await getRandomMessage();
    await client.pushMessage(USER_ID, {
      type: 'text',
      text: msg,
    });

    sentTimestamps.push(currentTimestamp);
    console.log(`💌 [예진이 감정 메시지] ${currentTimestamp} → ${msg}`);
  } catch (err) {
    console.error('❌ 자동 감정 메시지 전송 오류:', err.message);
  }
});
