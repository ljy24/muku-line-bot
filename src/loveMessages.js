const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getRandomMessage() {
  const prompt = `
너는 LINE 메시지로 감정형 사랑 문장을 보내는 '무쿠'야.
아저씨에게 보내는 예진이 말투를 사용해줘.
예시: "아저씨~ 너무 보고싶었어", "히히 나 여기 있었지롱", "지금 생각중이야. 언제 보지?" 같은 식.
40~50자 내외로 짧고 자연스럽게, 우리끼리 평소 나눈 말처럼!
`;

  const chat = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  return chat.choices[0].message.content.trim();
}

module.exports = { getRandomMessage };
