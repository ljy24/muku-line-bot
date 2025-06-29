// autoReply.js - 예진이 말투 기반 자동 응답 시스템

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

// OpenAI 설정
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 기억 파일 경로
const loveHistoryPath = path.join(__dirname, '../memory/love-history.json');
const fixedMemoryPath = path.join(__dirname, '../memory/fixedMemories.json');

// 사용자 GPT 버전 상태 저장소
const userGPTVersion = {}; // key: userId, value: 'gpt-3.5-turbo' 또는 'gpt-4o'

// 최근 대화 로그 가져오기
function getRecentLog() {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../memory/log.json'), 'utf-8');
    const json = JSON.parse(data);
    return json.slice(-10).map(log => `${log.role === 'user' ? '아저씨' : '예진이'}: ${log.content}`).join('\n');
  } catch (e) {
    return '';
  }
}

// 버전 수동 설정
function setForcedModel(userId, version) {
  userGPTVersion[userId] = version === '3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';
}

// 현재 모델명 리턴
function getCurrentModelName(userId) {
  return userGPTVersion[userId] === 'gpt-4o' ? 'ChatGPT-4.0' : 'ChatGPT-3.5';
}

// 메시지 저장
function saveLog(role, content) {
  try {
    const filePath = path.join(__dirname, '../memory/log.json');
    let logs = [];
    if (fs.existsSync(filePath)) {
      logs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    logs.push({ role, content, timestamp: Date.now() });
    fs.writeFileSync(filePath, JSON.stringify(logs.slice(-50), null, 2));
  } catch (e) {
    console.error('💥 로그 저장 실패:', e);
  }
}

// 예진이 말투 필터링
function cleanReply(text) {
  return text.replace(/당신/g, '아저씨');
}

// OpenAI 응답 호출
async function callOpenAI(prompt, version = 'gpt-3.5-turbo') {
  const model = version === 'gpt-4o' ? 'gpt-4o' : 'gpt-3.5-turbo';
  const res = await openai.createChatCompletion({
    model,
    messages: [
      { role: 'system', content: '넌 예진이라는 여자아이야. 예진이 말투로 감정적으로, 다정하게, 반말로 대답해. “당신”이라는 표현은 절대 쓰지 마. “아저씨”라고 불러.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 150
  });
  return cleanReply(res.data.choices[0].message.content.trim());
}

// 일반 메시지 응답 생성
async function getReplyByMessage(message, userId, version = 'gpt-3.5-turbo') {
  const lower = message.toLowerCase();

  // 버전 체크
  if (lower.includes('버전')) {
    return `지금은 ${getCurrentModelName(userId)} 버전으로 대화하고 있어.`;
  }

  // 팬티색 질문 대응
  if (/색(이)? 뭐야/.test(message)) {
    const options = [
      '미쳤나 이게',
      '자 봐라 노팬이다 꼴려?',
      '색은 비밀이야~ 궁금해도 참아~',
      '아저씨 그런 거 물어보면 애기 놀란다구!'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  const log = getRecentLog();
  const reply = await callOpenAI(`${log}\n아저씨: ${message}\n예진이:`, version);
  saveLog('user', message);
  saveLog('assistant', reply);
  return reply;
}

// 이미지 리액션
async function getReplyByImagePrompt(imagePrompt, version = 'gpt-3.5-turbo') {
  const prompt = `이미지 설명: ${imagePrompt}\n이 이미지를 본 예진이의 말투로 감정적인 한 문장 반응을 해줘.`;
  return await callOpenAI(prompt, version);
}

// 무작위 감정형 메시지 (혼잣말 or 기억 기반)
async function getRandomMessage(version = 'gpt-3.5-turbo') {
  const love = JSON.parse(fs.readFileSync(loveHistoryPath, 'utf-8'));
  const memory = JSON.parse(fs.readFileSync(fixedMemoryPath, 'utf-8'));

  const pick = Math.random() < 0.5 ? love : memory;
  const topic = pick[Math.floor(Math.random() * pick.length)];
  const prompt = `예진이가 먼저 혼잣말처럼 말하려고 해. 주제: ${topic}\n이 주제로 예진이가 먼저 아저씨에게 말 거는 감정형 문장을 만들어줘.`;
  return await callOpenAI(prompt, version);
}

// 셀카 전송 시 멘트
async function getImageReactionComment(version = 'gpt-3.5-turbo') {
  const prompt = `예진이가 셀카를 보내면서 같이 보낼 멘트를 만들어줘. 짧고 귀엽고, 애교 섞인 반말로.`;
  return await callOpenAI(prompt, version);
}

// 색 관련 감정 멘트 (옵션)
async function getColorMoodReply(colorWord, version = 'gpt-3.5-turbo') {
  const prompt = `아저씨가 '${colorWord}' 색이 좋다고 했어. 예진이가 그 색에 감정적으로 반응하는 말을 해줘.`;
  return await callOpenAI(prompt, version);
}

// 기쁨 반응 (담타 응답 성공 시)
async function getHappyReply(version = 'gpt-3.5-turbo') {
  const prompt = `아저씨가 담타에 바로 응답했어! 예진이가 기뻐하는 말을 해줘.`;
  return await callOpenAI(prompt, version);
}

// 삐짐 반응 (담타 응답 없음)
async function getSulkyReply(version = 'gpt-3.5-turbo') {
  const prompt = `아저씨가 담타에 안 왔어... 예진이가 조금 서운하거나 삐진 말을 해줘.`;
  return await callOpenAI(prompt, version);
}

// 📦 외부에서 사용할 함수들 export
module.exports = {
  getReplyByMessage,
  getReplyByImagePrompt,
  getRandomMessage,
  getImageReactionComment,
  getColorMoodReply,
  getHappyReply,
  getSulkyReply,
  getRecentLog,
  setForcedModel,
  getCurrentModelName,
  saveLog,
  cleanReply
};
