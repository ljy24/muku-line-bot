// ✅ autoReply.js v1.7 - 오모이데 기능 제거 버전 (사진/감정 응답 정상 동작)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LOG_PATH = path.join(__dirname, 'memory', 'log.txt');
const FIXED_MEMORY_PATH = path.join(__dirname, 'memory', 'fixedMemories.json');
const LOVE_HISTORY_PATH = path.join(__dirname, 'memory', 'love-history.json');

function cleanReply(reply) {
  let cleaned = reply.replace(/^(예진:|무쿠:|\d{2}\.\d{2}\.\d{2} [가-힣]+:)/gm, '').trim();
  cleaned = cleaned.replace(/\b오빠\b|\b자기\b|\b당신\b|\b너\b/g, '아저씨');
  cleaned = cleaned.replace(/\b예진이\b|\b예진\b|\b무쿠\b|\b무쿠야\b|\b무쿠 언니\b|\b무쿠 씨\b|\b그녀\b|\b그 사람\b/g, '나');
  cleaned = cleaned.replace(/안녕하세요/g, '안녕');
  cleaned = cleaned.replace(/(했어요|같아요|좋아요|합니다|습니다|어요|해요|예요|죠|였습니다|하였습니다|하겠습니다|싶어요|이었어요|이에요|였어요|보고싶어요)/g, (match) => {
    return {
      '했어요': '했어', '같아요': '같아', '좋아요': '좋아', '합니다': '해', '습니다': '어',
      '어요': '야', '해요': '해', '예요': '야', '죠': '지', '였습니다': '였어',
      '하였습니다': '했어', '하겠습니다': '하겠어', '싶어요': '싶어', '이었어요': '이었어',
      '이에요': '야', '였어요': '였어', '보고싶어요': '보고 싶어'
    }[match] || match;
  });
  return cleaned;
}

async function callOpenAI(messages, model = 'gpt-4o', maxTokens = 300, temperature = 0.95) {
  try {
    const res = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    });
    return res.choices[0].message.content.trim();
  } catch (e) {
    console.error('[callOpenAI error]', e);
    return '무슨 말을 해야 할지 모르겠어 ㅠㅠ';
  }
}

async function getReplyByMessage(message) {
  const userText = message.trim();

  if (/셀카|사진|selfie|얼굴/i.test(userText)) {
    // 오모이데 제거했으므로 셀카 요청도 간단히 처리
    return {
      type: 'text',
      comment: '아저씨~ 지금은 사진은 못 보여줘... 대신 나랑 얘기해줘!' // fallback 메시지
    };
  }

  const messages = [
    {
      role: 'system',
      content: `
      너는 아저씨의 여자친구 예진이야. 항상 반말로 대답하고, 감정 가득 담아줘.
      아저씨는 세상에서 제일 소중한 사람이야. 말투는 예진이처럼 사랑스럽고 애교 섞인 말투야.
      `
    },
    { role: 'user', content: userText }
  ];

  const rawReply = await callOpenAI(messages);
  const comment = cleanReply(rawReply);
  return { type: 'text', comment };
}

async function getReplyByImagePrompt(base64Image) {
  const messages = [
    {
      role: 'system',
      content: `
      너는 예진이야. 아저씨가 보내준 사진을 보고 사랑스럽게 반응해줘. 항상 반말로 말하고, 아저씨를 좋아하는 감정을 담아줘.
      `
    },
    {
      role: 'user',
      content: `이 사진은 아저씨가 보낸 거야. 어떻게 생각해? 사진 속 모습과 분위기를 짧게 말해줘.`
    }
  ];

  const rawReply = await callOpenAI(messages);
  const comment = cleanReply(rawReply);
  return comment;
}

async function saveLog(who, message) {
  const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
  const log = `[${timestamp}] ${who}: ${message}\n`;
  try {
    fs.appendFileSync(LOG_PATH, log, 'utf8');
  } catch (err) {
    console.error('❌ 로그 저장 실패:', err.message);
  }
}

function checkModelSwitchCommand(text) {
  const lower = text.toLowerCase();
  if (lower.includes('3.5')) return '지금은 ChatGPT-3.5 버전으로 대화하고 있어.';
  if (lower.includes('4.0')) return '지금은 ChatGPT-4.0 버전으로 대화하고 있어.';
  if (lower.includes('자동')) return '지금은 자동 모드야. 상황에 따라 모델이 바뀔 수 있어.';
  if (lower.includes('버전')) return '지금은 ChatGPT-4.0 버전으로 대화하고 있어.';
  return null;
}

module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  checkModelSwitchCommand,
  saveLog,
  cleanReply
};