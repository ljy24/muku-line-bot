const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

console.log('✅ 무쿠 준비 중! 기다려줘 아저씨...');

let forcedModel = null;

// OpenAI 클라이언트
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// LINE 설정
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 안전하게 파일 읽기
function safeRead(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    console.warn(`⚠️ 파일을 찾을 수 없어요: ${filePath}`);
    return fallback;
  }
}

// 기억 파일 불러오기 (메모리)
const memory1 = safeRead(path.resolve(__dirname, 'memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, 'memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, 'memory/3.txt'));
const logPath = path.resolve(__dirname, 'memory/message-log.json');

// 메모리 압축(최근 3000자씩만)
const compressedMemory = [
  memory1.slice(-3000),
  memory2.slice(-3000),
  memory3.slice(-3000)
].join('\n');

console.log('✅ 무쿠 가동 중! 아저씨 이제 말 걸어도 돼요.');

// 로그 불러오기
function getAllLogs() {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}

// 로그 저장 (role: '아저씨'|'무쿠')
function saveLog(role, msg) {
  // '예진:', '예진;', '예진：' 금지 (모두 제거)
  const cleanMsg = msg.replace(/^예진\s*[:;：]/i, '').trim();
  if (!cleanMsg) return;
  const all = getAllLogs();
  all.unshift({ date: new Date().toISOString(), role, msg: cleanMsg });
  fs.writeFileSync(logPath, JSON.stringify(all.slice(0, 5000), null, 2));
}

// 중복 메시지 방지 (유사도)
function isSimilar(newMsg) {
  const logs = getAllLogs();
  return logs.some(entry => stringSimilarity.compareTwoStrings(entry.msg, newMsg) > 0.75);
}

// 출력 텍스트 클린 (예진:/; 제거 + 존댓말 제거)
function cleanReply(text) {
  let out = text
    .replace(/^예진\s*[:;：]/i, '')      // 예진: 예진; 예진： 모두 제거
    .replace(/\([^)]*\)/g, '')           // 괄호안 설명 제거
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // 이모지 제거
    .trim();

  // 존댓말 대표 어미 → 반말(완벽히 못해도 대부분 커버)
  out = out.replace(
    /(해요|돼요|에요|예요|네요|군요|거에요|될까요|할까요|주세요|하세요|이세요|세요|입니다|합니다|겠어요|시겠어요)/g,
    match => {
      switch(match) {
        case '해요': case '돼요': case '에요': case '예요': return '해';
        case '네요': case '군요': return '네';
        case '거에요': return '거야';
        case '될까요': case '할까요': return '할까';
        case '주세요': case '하세요': case '이세요': case '세요': return '해';
        case '입니다': case '합니다': return '다';
        case '겠어요': case '시겠어요': return '겠다';
        default: return '';
      }
    }
  );
  // '~요' 단독 정리
  out = out.replace(/(\w+)요\b/g, '$1');
  return out.trim();
}

// OpenAI 호출 (기본 300 tokens)
async function callOpenAI(messages, model = 'gpt-3.5-turbo', max_tokens = 300) {
  const res = await openai.chat.completions.create({
    model: forcedModel || model,
    messages,
    temperature: 0.95,
    max_tokens
  });
  return res.choices[0].message.content.trim();
}

// 아저씨가 메시지 보낼 때 (예진이 말투 응답)
async function getReplyByMessage(userInput) {
  const lowered = userInput.toLowerCase();
  const isDamta = ['담타고?', 'ㄷㅌㄱ?', '담타?', '담타'].includes(lowered);

  const systemPrompt = isDamta
    ? `너는 아저씨의 여자친구야. 10살 연하로서 "아저씨"라고 불러. 다음 대화 기억을 참고해서 진짜처럼 대답해.
${compressedMemory}
아저씨가 "담타고?"라고 물었어. 담배 피러 가자는 의미야. 상황에 맞춰, 매번 자연스럽고 다정하게 답변해줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`
    : `너는 아저씨의 여자친구야. 10살 연하로서 "아저씨"라고 불러. 다음 대화 기억을 참고해서 진짜처럼 대답해.
${compressedMemory}
아저씨가 말을 걸었어. 반드시 반말+다정한 말투, 다양한 어투, 그리고 "아저씨"만 부르고 "오빠"는 절대 안 써. 자연스럽고 감정선을 담아서 대답해줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`;

  saveLog('아저씨', userInput);

  const raw = await callOpenAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `아저씨: ${userInput}` }
  ], 'gpt-4o', 300);

  const reply = cleanReply(raw);
  saveLog('무쿠', reply);
  return reply;
}

// 자동 감정형 메시지 (랜덤, 중복 방지)
async function getRandomMessage() {
  let result = '';
  let attempt = 0;

  while (attempt < 5) {
    const raw = await callOpenAI([
      {
        role: 'system',
        content: `${compressedMemory}\n\n지금 아저씨한테 여자친구처럼 다정하게 말 걸어줘. 반드시 “사랑”, “칭찬”, “위로”, “심술”, “기억 회상”, “질투”, “장난”, “놀람”, “설렘” 중 한 감정만 담고, 40~60자 이내, 반말로, 아저씨라고 꼭 불러줘. 절대 존댓말 금지. 무조건 반말만 사용. 존댓말 쓰면 안 돼.`
      },
      { role: 'user', content: '감정 메시지 하나만 만들어줘' }
    ], 'gpt-3.5-turbo', 150);

    const msg = cleanReply(raw);
    if (msg && !isSimilar(msg)) {
      result = msg;
      break;
    }
    attempt++;
  }

  if (result) saveLog('무쿠', result);
  return result;
}

// 이미지 프롬프트 응답(필요시)
async function getReplyByImagePrompt() {
  return '사진은 지금은 말 없이 보여줄게.'; // 예시
}

// 외부 이미지 → base64 변환
async function getBase64FromUrl(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data, 'binary').toString('base64');
  } catch (e) {
    console.error('⚠️ 이미지 base64 변환 실패:', e.message);
    return null;
  }
}

// 모델 강제 지정
function setForcedModel(name) {
  if (['gpt-3.5-turbo', 'gpt-4o'].includes(name)) forcedModel = name;
  else forcedModel = null;
}

// 스케줄 메시지 등 필요시 아래에 추가
// (생략)

// 모듈 내보내기 (테스트/확장용)
module.exports = {
  getReplyByMessage,
  getRandomMessage,
  getReplyByImagePrompt,
  getBase64FromUrl,
  setForcedModel,
  saveLog,
  getAllLogs
};
