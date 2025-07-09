
// memory/omoide.js - v2.5 (셀카 고정 응답 개선 및 경로 안정화)
const { callOpenAI, cleanReply } = require("../src/autoReply");
const { getFaceMatch } = require("../src/autoReply");
const fs = require("fs");
const path = require("path");

function getSelfieReplyFromYeji() {
  const replies = [
    "이거 방금 찍은 셀카야, 아저씨~ 예뻐?",
    "조금 부끄럽지만… 예쁘게 봐줄 거지?",
    "아저씨 보여주려고 고른 셀카야. 어때?",
    "오늘따라 잘 나온 것 같지 않아?",
    "아저씨, 나 또 셀카 찍었어! 보고 싶었지?"
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

async function getOmoideReply(message) {
  const lowerMsg = message.trim().toLowerCase();
  let folder = "";
  let type = "";

  if (lowerMsg.includes("셀카")) {
    folder = "yejin";
    type = "selfie";
  } else if (lowerMsg.includes("커플")) {
    folder = "couple";
    type = "couple";
  } else if (lowerMsg.includes("추억") || lowerMsg.includes("기억")) {
    folder = "memory";
    type = "memory";
  } else {
    return null;
  }

  const baseUrl = "https://photo.de-ji.net/photo";
  const folderPath = path.join("/mnt/data/photo", folder);
  const fileCount = 1200; // 예진 셀카 기준 고정 수
  const index = Math.floor(Math.random() * fileCount);
  const fileName = String(index).padStart(6, "0") + ".jpg";
  const imageUrl = `${baseUrl}/${folder}/${fileName}`;

  if (folder === "yejin") {
    const text = getSelfieReplyFromYeji();
    return { imageUrl, text };
  }

  // 비-셀카일 경우 GPT 분석
  const prompt = `이 사진은 '${folder}' 폴더에 있는 예진이 관련 사진이야. 예진이 말투로 아저씨에게 보여줄 멘트를 만들어줘.`;
  const rawReply = await callOpenAI(prompt, imageUrl);
  const cleanedReply = cleanReply(rawReply);
  return { imageUrl, text: cleanedReply };
}

module.exports = {
  getOmoideReply
};
