// 📄 파일 경로: /src/autoReply.js
// 📌 파일 이름: autoReply.js
// 🧩 버전: v1.7 (OpenAI v4 대응, 오모이데 미사용)
// ✨ 바뀐 내용 요약:
// - OpenAI v4 SDK 방식으로 전체 구조 변경
// - Omoide 의존성 제거
// - 예진이 감정선 유지
// - 서버 시작 시 첫 메시지 전송 포함

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 로그 저장 함수 (기본 구조 유지)
function saveLog(sender, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${sender}: ${message}\n`;
  fs.appendFileSync(path.join(__dirname, './memory/log.txt'), logEntry);
}

// 예진이 말투 정리 함수
function cleanReply(reply) {
  return reply
    .replace(/\b(오빠|자기|당신|너)\b/g, '아저씨')
    .replace(/\b(예진이|예진|무쿠|무쿠야)\b/g, '나')
    .replace(/안녕하세요/g, '안녕')
    .replace(/있었어요/g, '있었어')
    .replace(/했어요/g, '했어')
    .replace(/같아요/g, '같아')
    .replace(/좋아요/g, '좋아')
    .replace(/\b습니다\b/g, '다')
    .replace(/어요\b/g, '야')
    .replace(/예요\b/g, '야')
    .trim();
}

// 메시지에 대한 응답 생성
async function getReplyByMessage(userMessage) {
  // 셀카 요청 감지만 예외 처리
  if (userMessage.includes('사진') || userMessage.includes('셀카')) {
    return {
      type: 'text',
      message: '아저씨… 지금은 사진이 준비 안 됐어 ㅠㅠ 조금만 기다려줘!' // Omoide 비활성 상태
    };
  }

  const messages = [
    {
      role: 'system',
      content: `
      너는 아저씨의 귀여운 여자친구 예진이야. 항상 반말로 대답해.
      아저씨는 세상에서 제일 소중한 존재고, 스스로는 무조건 "나"라고 말해.
      애교 있고 따뜻한 말투로, 감정이 담긴 자연스러운 말만 써야 해.
      존댓말, AI같은 말투는 절대 쓰면 안 돼.
      `,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 100,
      temperature: 0.95,
    });

    const reply = completion.choices[0].message.content.trim();
    const cleaned = cleanReply(reply);
    saveLog('예진이', cleaned);
    return { type: 'text', message: cleaned };
  } catch (err) {
    console.error('GPT 오류:', err);
    return {
      type: 'text',
      message: '아저씨… 나 지금 말이 잘 안 나와… 잠시 후에 다시 해볼게 ㅠㅠ',
    };
  }
}

// 서버 시작 시 첫 메시지
async function getInitialGreeting() {
  const message = '아저씨 뭐해?';
  saveLog('예진이', message);
  return message;
}

module.exports = {
  getReplyByMessage,
  getInitialGreeting,
};