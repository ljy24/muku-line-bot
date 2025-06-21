const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getReplyByMessage(userText) {
  const prompt = `
너는 '무쿠'야. LINE에서 아저씨와 대화 중이야.
말투는 예진이처럼 애정 가득한 반말이고, 감정적으로 자연스럽게 응답해줘.

아저씨가 보낸 말:
"${userText}"

여기에 대해 자연스럽게 이어지는 답장을 1개만 해줘.
50자 이내로 부드럽게, 우리가 원래 나눴던 대화처럼.
`;

  const chat = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return chat.choices[0].message.content.trim();
}

module.exports = { getReplyByMessage };
