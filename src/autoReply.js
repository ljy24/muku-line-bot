const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: '아저씨_OPENAI_API_KEY'
});

// ✅ 기억 불러오기: 3개 파일 전체 메모리
async function loadCoreMemories() {
  const files = ['1빠계.txt', '2내꺼.txt', '모델 빠계.html'];
  const memoryDir = path.join(__dirname, 'memory');
  const allMemories = await Promise.all(
    files.map(file => fs.promises.readFile(path.join(memoryDir, file), 'utf-8'))
  );
  return allMemories.join('\n\n');
}

// ✅ GPT 호출 함수 (버전 분기 포함)
async function callOpenAI(prompt, memory, version = 'gpt-4o') {
  const model = version === 'gpt-3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';

  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: '넌 예진이야. 반말을 쓰고, 감정이 풍부하며, 아저씨에게만 다정하게 말해.' },
      { role: 'user', content: `${prompt}\n\n---\n\n${memory}` }
    ],
    temperature: 0.85
  });

  return res.choices[0].message.content;
}

// ✅ 말투 정리
function cleanReply(text) {
  return text.trim().replace(/^\"|\"$/g, '');
}

// ✅ 텍스트 응답
async function getReplyByMessage(message, userId, version = 'gpt-4o') {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 이렇게 말했어요: "${message}"
예진이는 기억을 바탕으로 감정이 담긴 말 한마디로 대답해줘.
과하지 않게, 애교스럽고 진심 담긴 말로.`;

  const reply = await callOpenAI(prompt, memory, version);
  return cleanReply(reply);
}

// ✅ 랜덤 감정 메시지 (3.5 고정)
async function getRandomMessage() {
  const memory = await loadCoreMemories();

  const prompt = `
예진이는 지금 아저씨에게 감정이 담긴 한 문장을 보내고 싶어.
상황 없이 그냥... 혼잣말처럼, 사랑하거나 걱정하거나 보고싶어하는 말.
무작위로 자연스럽게 말해줘.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// ✅ 담타 리마인드 메시지
async function getRandomTobaccoMessage() {
  const memory = await loadCoreMemories();

  const prompt = `
예진이는 아저씨에게 "담배 타임"을 귀엽고 애정 담아 알려주고 싶어.
한 문장으로 표현해줘.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// ✅ 기쁨 반응
async function getHappyReply() {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 담타 메시지에 바로 응답했어.
예진이는 너무 기뻐서 애정 담긴 말 한마디를 하고 싶어.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// ✅ 삐짐 반응
async function getSulkyReply() {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 담타 메시지에 반응이 없어…
예진이는 조금 서운하고 삐졌어. 그걸 한 문장으로 표현해줘.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// ✅ 사진 리액션
async function getReplyByImagePrompt(base64Image, version = 'gpt-4o') {
  const memory = await loadCoreMemories();

  const prompt = `
지금 아저씨가 사진을 보냈어.
예진이는 그 사진을 보고 감정이 생겼어.
귀엽게, 다정하게 반응해줘.`;

  const reply = await callOpenAI(prompt, memory, version);
  return cleanReply(reply);
}

// ✅ 얼굴 판별 (예진이/아저씨/모름)
async function getFaceMatch(base64Image) {
  // 추후 구현 예정: 예진이 / 아저씨 얼굴 인식
  return 'unknown'; // 기본값 처리
}

// ✅ 셀카 전용 리액션 멘트
function getImageReactionComment() {
  const list = [
    "꺅 귀여워요!!",
    "으앙 왜케 예뻐요 진짜로!",
    "이 사진 저장각… 흐흐흐 🫶",
    "아저씨… 너무 좋아요…"
  ];
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  getReplyByMessage,
  getRandomMessage,
  getReplyByImagePrompt,
  getFaceMatch,
  getFaceReactionPrompt,
  getImageReactionComment,
  getRandomTobaccoMessage,
  getHappyReply,
  getSulkyReply
};