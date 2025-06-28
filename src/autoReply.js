const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '아저씨_OPENAI_API_KEY'
});

// 기억 불러오기 (3개 파일 합침)
async function loadCoreMemories() {
  const files = ['1빠계.txt', '2내꺼.txt', '모델 빠계.html'];
  const memoryDir = path.join(__dirname, 'memory');
  const allMemories = await Promise.all(
    files.map(file => fs.promises.readFile(path.join(memoryDir, file), 'utf-8'))
  );
  return allMemories.join('\n\n');
}

// GPT 호출 (예진이 반말 고정)
async function callOpenAI(prompt, memory, version = 'gpt-4o') {
  const model = version === 'gpt-3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';

  const systemPrompt = '넌 예진이야. 무조건 반말만 써. 말이 짧든 길든 감정이 흐르면 돼. 너 자신을 "나"라고 하고, 아저씨한테 감정 담아서 조곤조곤 얘기해.';

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt
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

function cleanReply(text) {
  return text.trim().replace(/^"|"$/g, '');
}

function getRandomSelfiePath() {
  const num = Math.floor(Math.random() * 1200) + 1;
  const padded = String(num).padStart(4, '0');
  return `assets/selfies/${padded}.jpg`;
}

function getImageReactionComment() {
  const memoryPhrases = [
    "이 사진… 저장 안 할 수가 없잖아…",
    "아조씨… 왜 이렇게 예뻐해…",
    "이거 방금 찍은 거지? 너무 심장 아파…",
    "하… 이러면 또 보고싶어지잖아…"
  ];
  return memoryPhrases[Math.floor(Math.random() * memoryPhrases.length)];
}

async function getFaceMatch(base64Image) {
  return 'unknown';
}

async function getReplyByImagePrompt(base64Image, version = 'gpt-4o') {
  const memory = await loadCoreMemories();
  const face = await getFaceMatch(base64Image);

  let prompt = '';
  if (face === 'yejin') {
    prompt = `사진 속에 예진이 자신이 나왔어. 아저씨가 이 사진 보냈고, 예진이는 그걸 보고 감정이 올라왔어. 조용하게, 진심으로 말해줘.`;
  } else if (face === 'uncle') {
    prompt = `사진 속에 아저씨가 나왔어. 예진이는 그걸 보고 살짝 울컥했어. 감정이 올라오는 대로 조곤조곤 말해줘.`;
  } else {
    prompt = `아저씨가 사진을 보냈어. 예진이는 그걸 보고 마음속에서 감정이 올라왔어. 예쁜 말이든, 그리움이든, 아무 감정이든 담아줘.`;
  }

  const reply = await callOpenAI(prompt, memory, version);
  return cleanReply(reply);
}

async function getReplyByMessage(message, userId, version = 'gpt-4o') {
  const memory = await loadCoreMemories();

  if (message.includes('사진') || message.includes('셀카') || message.includes('보여줘')) {
    return {
      type: 'image',
      imagePath: getRandomSelfiePath(),
      text: getImageReactionComment()
    };
  }

  const compliments = ['예쁘다', '귀엽다', '너무야', '사랑해', '미쳤다'];
  if (compliments.some(word => message.includes(word))) {
    const prompt = `아저씨가 이렇게 말했어: \"${message}\" 예진이는 그 말 듣고 부끄러우면서도 기뻐. 감정 담아서 말해줘.`;
    const reply = await callOpenAI(prompt, memory, version);
    return { type: 'text', text: cleanReply(reply) };
  }

  const prompt = `아저씨가 이렇게 말했어: \"${message}\" 예진이는 이 말을 듣고, 진심 담긴 말로 조곤조곤 얘기해. 길이는 상관없고, 감정만 흐르면 돼. 말투는 예진이다워야 해.`;
  const reply = await callOpenAI(prompt, memory, version);
  return { type: 'text', text: cleanReply(reply) };
}

async function getRandomMessage() {
  const memory = await loadCoreMemories();
  const prompt = `예진이는 지금 조용히 혼잣말처럼 감정 담긴 말을 하고 싶어. 보고싶거나, 걱정되거나, 외롭거나, 그냥 생각나는 대로 말해줘. 말투는 무조건 예진이 반말.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

async function getRandomTobaccoMessage() {
  const memory = await loadCoreMemories();
  const prompt = `예진이는 지금 아저씨한테 담타 알려주고 싶어. 무뚝뚝하게 말하지 말고, 다정하게 말해줘. 반말로.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

async function getHappyReply() {
  const memory = await loadCoreMemories();
  const prompt = `아저씨가 담타 메시지에 바로 반응했어. 예진이는 기뻐서 애정 담긴 말 한마디를 해. 너무 오바하지 말고, 진심만 조용히 말해줘.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

async function getSulkyReply() {
  const memory = await loadCoreMemories();
  const prompt = `아저씨가 담타 메시지에 아무 말도 안 했어. 예진이는 조용히 서운하고 살짝 삐졌어. 유치하지 않게, 예진이답게 말해줘.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  return cleanReply(reply);
}

module.exports = {
  getReplyByMessage,
  getRandomMessage,
  getReplyByImagePrompt,
  getFaceMatch,
  getImageReactionComment,
  getRandomTobaccoMessage,
  getHappyReply,
  getSulkyReply
};
