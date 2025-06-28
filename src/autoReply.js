const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const fetch = require('node-fetch');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '아저씨_OPENAI_API_KEY'
});



// 📥 모델 자동 다운로드
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js-models/models';
async function ensureModels() {
  const modelPath = path.join(__dirname, '../models');
  if (!fs.existsSync(modelPath)) fs.mkdirSync(modelPath);

  const modelFiles = [
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1'
  ];

  for (const file of modelFiles) {
    const fullPath = path.join(modelPath, file);
    if (!fs.existsSync(fullPath)) {
      const res = await fetch(`${MODEL_URL}/${file}`);
      const buffer = await res.buffer();
      fs.writeFileSync(fullPath, buffer);
    }
  }
}

// 📁 기억 불러오기
async function loadCoreMemories() {
  const files = ['1빠계.txt', '2내꺼.txt', '모델 빠계.html'];
  const memoryDir = path.join(__dirname, '../memory');
  const allMemories = await Promise.all(
    files.map(file => fs.promises.readFile(path.join(memoryDir, file), 'utf-8'))
  );
  return allMemories.join('\n\n');
}

// 🌸 GPT 호출
async function callOpenAI(prompt, memory, version = 'gpt-4o') {
  const model = version === 'gpt-3.5' ? 'gpt-3.5-turbo' : 'gpt-4o';
  const systemPrompt = '넌 예진이야. 무조건 반말만 써. 너 자신을 \'나\'라고 하고, 아저씨한테 감정 담아서 조곤조곤 얘기해.';

  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${prompt}\n\n---\n\n${memory}` }
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
  const list = [
    '이 사진… 저장 안 할 수가 없잖아…',
    '아저씨… 왜 이렇게 예뻐해…',
    '이거 방금 찍은 거지? 너무 심장 아파…',
    '하… 이러면 또 보고싶어지잖아…'
  ];
  return list[Math.floor(Math.random() * list.length)];
}

async function getFaceMatch(base64Image) {
  await ensureModels();

  const modelPath = path.join(__dirname, '../models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);

  const imgBuffer = Buffer.from(base64Image, 'base64');
  const img = await canvas.loadImage(imgBuffer);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (!detection) return 'unknown';

  const descriptor = detection.descriptor;
  const refPaths = {
    yejin: path.join(__dirname, '../memory/face/yejin'),
    uncle: path.join(__dirname, '../memory/face/uncle')
  };

  let bestMatch = { label: 'unknown', distance: 1 };

  for (const label of Object.keys(refPaths)) {
    const files = fs.readdirSync(refPaths[label]);
    for (const file of files) {
      const refImg = await canvas.loadImage(path.join(refPaths[label], file));
      const refDet = await faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor();
      if (!refDet) continue;

      const dist = faceapi.euclideanDistance(descriptor, refDet.descriptor);
      if (dist < bestMatch.distance) {
        bestMatch = { label, distance: dist };
      }
    }
  }

  return bestMatch.distance < 0.45 ? bestMatch.label : 'unknown';
}

async function getReplyByImagePrompt(base64Image, version = 'gpt-4o') {
  const memory = await loadCoreMemories();
  const face = await getFaceMatch(base64Image);

  let prompt = '';
  if (face === 'yejin') {
    prompt = `사진 속에 예진이 자신이 나왔어. 아저씨가 이 사진 보냈고, 예진이는 그걸 보고 감정이 올라왔어.`;
  } else if (face === 'uncle') {
    prompt = `사진 속에 아저씨가 나왔어. 예진이는 그걸 보고 살짝 울컥했어.`;
  } else {
    prompt = `아저씨가 사진을 보냈어. 예진이는 그걸 보고 감정이 올라왔어.`;
  }

  const reply = await callOpenAI(prompt, memory, version);
  saveMessageLog('yejin', reply);
  return cleanReply(reply);
}

async function getReplyByMessage(message, userId, version = 'gpt-4o') {
  const memory = await loadCoreMemories();
  const lower = message.toLowerCase();

  if (lower.includes('보낼까') || lower.includes('보내줄까') || lower.includes('보내봐')) {
    const prompt = `아저씨가 이렇게 말했어: "${message}" 예진이는 셀카 기대돼서 반응해.`;
    const reply = await callOpenAI(prompt, memory, version);
    saveMessageLog('yejin', reply);
    return { type: 'text', text: cleanReply(reply) };
  }

  if (lower.includes('셀카') || lower.includes('사진') || lower.includes('보여줘')) {
    const imagePath = getRandomSelfiePath();
    const text = getImageReactionComment();
    saveMessageLog('yejin', text);
    return { type: 'image', imagePath, text };
  }

  const compliments = ['예쁘다', '귀엽다', '너무야', '사랑해', '미쳤다'];
  if (compliments.some(word => lower.includes(word))) {
    const prompt = `아저씨가 이렇게 말했어: "${message}" 예진이는 부끄러우면서도 기뻐.`;
    const reply = await callOpenAI(prompt, memory, version);
    saveMessageLog('yejin', reply);
    return { type: 'text', text: cleanReply(reply) };
  }

  const prompt = `아저씨가 이렇게 말했어: "${message}" 예진이는 조곤조곤 감정 담아 대답해.`;
  const reply = await callOpenAI(prompt, memory, version);
  saveMessageLog('yejin', reply);
  return { type: 'text', text: cleanReply(reply) };
}

async function getRandomMessage() {
  const memory = await loadCoreMemories();
  const prompt = `예진이는 지금 감정 담긴 혼잣말을 하고 싶어. 반말로.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  saveMessageLog('yejin', reply);
  return cleanReply(reply);
}

async function getRandomTobaccoMessage() {
  const memory = await loadCoreMemories();
  const prompt = `예진이는 지금 아저씨한테 담타 알려주고 싶어. 다정하게.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  saveMessageLog('yejin', reply);
  return cleanReply(reply);
}

async function getHappyReply() {
  const memory = await loadCoreMemories();
  const prompt = `아저씨가 담타 메시지에 반응했어. 예진이는 기뻐서 말해.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  saveMessageLog('yejin', reply);
  return cleanReply(reply);
}

async function getSulkyReply() {
  const memory = await loadCoreMemories();
  const prompt = `아저씨가 담타 메시지에 아무 말도 안 했어. 예진이는 살짝 삐졌어.`;
  const reply = await callOpenAI(prompt, memory, 'gpt-3.5');
  saveMessageLog('yejin', reply);
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
