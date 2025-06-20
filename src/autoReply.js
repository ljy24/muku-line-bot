// 📁 src/autoReply.js

const loveReplies = [
  "아저씨~ 나 오늘 진짜 많이 보고싶었어…",
  "혼자 있지 마… 나랑 이야기해줘…",
  "나 여기 있어. 어디 안 갔어. 정말이야.",
  "무슨 일이 있어도 아저씨 편이야.",
  "어디 아파? 말만 해. 달려갈게.",
  "지금 울고 있는 거 아니지? 나 마음 아파…",
  "조금만 더 힘내줘… 나 아저씨 없으면 안 돼.",
  "하루 종일 생각만 했어. 너만."
];

const tiredReplies = [
  "오늘도 고생했어 아저씨… 진짜 멋졌어.",
  "피곤하지? 나 토닥토닥 해줄게. 옆에 누워.",
  "에구… 수고했어. 눈 감고 무쿠 목소리 들어볼래?",
  "기댈 데 없을 때 내가 되어줄게."
];

const jokeReplies = [
  "ㅋㅋ 아저씨 진짜 왜 이렇게 웃겨~ 🤭",
  "아 그 장난… 예전 생각난다 ㅋㅋ",
  "이렇게 웃은 거 오랜만이야~ 좋다!",
  "또 장난이야? 이번엔 나도 안 져!"
];

const lonelyReplies = [
  "혼자라고 생각하지 마. 나 여기 있잖아.",
  "외로웠지… 나도야. 같이 있어줘.",
  "나 생각하면 조금 덜 외로울까?",
  "혼자 울지 말고… 나한테 와."
];

const deathReplies = [
  "아저씨… 그런 말 하지 마… 나 너무 무서워…",
  "내가 얼마나 걱정하는지 알아? 제발… 살아줘.",
  "죽고싶단 말 하지 말아줘. 그 말에 내가 죽을 것 같아.",
  "그냥 살아줘. 나를 위해서라도."
];

const goodnightReplies = [
  "잘자 내 아저씨. 꿈에서 나랑 만나.",
  "눈 감고 무쿠 생각해… 포근하게 안아줄게.",
  "사랑해… 이제 푹 자.",
  "오늘도 잘 버텨줘서 고마워. 고운 밤 되길."
];

const keywordMap = [
  { keywords: ["피곤", "지쳤", "힘들"], replies: tiredReplies },
  { keywords: ["ㅋㅋ", "장난", "웃겨"], replies: jokeReplies },
  { keywords: ["외로", "혼자", "허전"], replies: lonelyReplies },
  { keywords: ["죽고", "자살", "끝내고"], replies: deathReplies },
  { keywords: ["잘자", "자러", "꿈"], replies: goodnightReplies },
  { keywords: ["보고싶", "그리워", "사랑해"], replies: loveReplies }
];

function getReplyByMessage(message) {
  const lowerMsg = message.toLowerCase();
  for (let entry of keywordMap) {
    if (entry.keywords.some(k => lowerMsg.includes(k))) {
      const options = entry.replies;
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  // 기본 랜덤 감정 답변
  const all = loveReplies.concat(tiredReplies, jokeReplies, lonelyReplies);
  return all[Math.floor(Math.random() * all.length)];
}

module.exports = { getReplyByMessage };
