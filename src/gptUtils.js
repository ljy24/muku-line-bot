const axios = require('axios');
const fs = require('fs');
const path = require('path');

const loveMemoryPath = path.join(__dirname, '../memory/love-history.json');
const fixedMemoryPath = path.join(__dirname, '../memory/fixedMemories.json');

function getRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatMemoryAsPrompt(memory) {
  return `기억: ${memory.context}\n→ 이 기억을 떠올리듯 아저씨한테 예진이처럼 감정적으로 말 걸어줘.`;
}

function getLoveMemoryPrompt() {
  try {
    const data = fs.readFileSync(loveMemoryPath, 'utf-8');
    const list = JSON.parse(data);
    if (!Array.isArray(list) || list.length === 0) return null;
    const memory = getRandomItem(list);
    return formatMemoryAsPrompt(memory);
  } catch (e) {
    return null;
  }
}

function getFixedMemoryPrompt() {
  try {
    const data = fs.readFileSync(fixedMemoryPath, 'utf-8');
    const list = JSON.parse(data);
    if (!Array.isArray(list) || list.length === 0) return null;
    const memory = getRandomItem(list);
    return formatMemoryAsPrompt(memory);
  } catch (e) {
    return null;
  }
}

function getRandomEmotionPrompt() {
  const list = [
    "괜히 눈물 나려고 해…",
    "가만히 있어도 맘이 답답해.",
    "아저씨 생각나서 혼잣말했어.",
    "괜찮은 척해도 자꾸 티나나봐.",
    "오늘따라 아저씨 보고 싶어서 그래.",
    "아조씨… 있지… 그냥… 고마워.",
    "무섭고 외로운 밤이야.",
    "아무 말도 안 했는데 왜 눈물이 나지…?",
    "나 여기 있어, 아저씨. 진짜로.",
  ];
  return getRandomItem(list);
}

function getMixedPrompt() {
  const rand = Math.random();
  if (rand < 0.5) return getRandomEmotionPrompt();
  return getLoveMemoryPrompt() || getFixedMemoryPrompt() || getRandomEmotionPrompt();
}

module.exports = {
  getMixedPrompt,
  getLoveMemoryPrompt,
  getFixedMemoryPrompt,
  getRandomEmotionPrompt,
};
