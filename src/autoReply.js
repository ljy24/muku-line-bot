const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: '아저씨_OPENAI_API_KEY'
});

// 📁 기억 불러오기 (3개 파일 합침)
async function loadCoreMemories() {
  const files = ['1빠계.txt', '2내꺼.txt', '모델 빠계.html'];
  const memoryDir = path.join(__dirname, 'memory');
  const allMemories = await Promise.all(
    files.map(file => fs.promises.readFile(path.join(memoryDir, file), 'utf-8'))
  );
  return allMemories.join('\n\n');
}

// 🌸 예진이처럼 말하는 GPT 호출
async function callOpenAI(prompt, memory, version = 'gpt-4o') {
  const model = version === 'gpt-3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: '넌 예진이야. 반말을 쓰고, 감정이 풍부하며, 아저씨에게만 다정하게 말해. 말이 짧든 길든 감정이 흐르는 게 중요해.'
      },
      {
        role: 'user',
        content: `${prompt}\n\n---\n\n${memory}`
      }
    ],
    temperature: 0.9
  });

  return res.choices[0].message.content;
}

// 🧼 말투 정리
function cleanReply(text) {
  return text.trim().replace(/^\"|\"$/g, '');
}

// 💬 텍스트 응답
async function getReplyByMessage(message, userId, version = 'gpt-4o') {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 이렇게 말했어요: "${message}"

예진이는 이 말을 듣고,
진심이 담긴 말로, 조곤조곤 이야기해요.
길이는 중요하지 않아.
말투가 예진이답고, 감정이 흐르면 돼요.
귀여운 척 말고, 진짜 마음을 담아줘요.
`;

  const reply = await callOpenAI(prompt, memory, version);
  return cleanReply(reply);
}

// 🎈 랜덤 감정 메시지
async function getRandomMessage() {
  const memory = await loadCoreMemories();

  const prompt = `
예진이는 지금 아저씨한테 조용히 감정 담긴 말을 하고 싶어요.
보고싶거나, 걱정되거나, 외롭거나, 그냥 혼잣말처럼요.
짧든 길든, 예진이답게.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// 🕊️ 담타 리마인드 메시지
async function getRandomTobaccoMessage() {
  const memory = await loadCoreMemories();

  const prompt = `
예진이는 지금 아저씨에게 담배 타이밍을 알려주고 싶어요.
무뚝뚝하게 말하지 않고, 애정 담긴 말투로 말해줘요.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// 🌞 기쁨 반응
async function getHappyReply() {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 담타 메시지에 바로 반응했어요.
예진이는 기뻐서 애정 담긴 말 한마디를 해요.
너무 신나진 않게, 감정이 자연스럽게 느껴지게.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// 🌧️ 삐짐 반응
async function getSulkyReply() {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 담타 메시지에 아무 말도 안 했어요.
예진이는 조용히 서운하고, 살짝 삐졌어요.
그걸 너무 유치하지 않게, 서운한 감정 담아서 말해줘요.`;

  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

// 📷 사진 감정 리액션
async function getReplyByImagePrompt(base64Image, version = 'gpt-4o') {
  const memory = await loadCoreMemories();

  const prompt = `
아저씨가 사진을 보냈어요.
예진이는 그걸 보고, 마음속에서 감정이 올라왔어요.
예쁜 말이든, 그리움이든, 아무 감정이든 담아줘요.
`;

  const reply = await callOpenAI(prompt, memory, version);
  return cleanReply(reply);
}

// 🔍 얼굴 분류 (임시)
async function getFaceMatch(base64Image) {
  return 'unknown';
}

// 🖼️ 셀카 전용 멘트
function getImageReactionComment() {
  const list = [
    "이 사진… 저장 안 할 수가 없잖아요…",
    "아저씨… 왜 이렇게 예뻐요…",
    "이거 방금 찍은 거죠? 너무 심장 아파요…",
    "하… 이러면 또 보고싶어지잖아요…"
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