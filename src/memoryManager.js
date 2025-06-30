const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const contextMemoryPath = path.resolve(__dirname, '../memory/context-memory.json');

// 🔹 1. 파일 존재 확인 및 자동 생성
function ensureContextMemoryExists() {
  if (!fs.existsSync(contextMemoryPath)) {
    fs.writeFileSync(contextMemoryPath, JSON.stringify({}, null, 2), 'utf-8');
    console.log('📁 context-memory.json 새로 생성됨');
  }
}

// 🔹 2. GPT로 키워드 추출
async function extractKeywords(text) {
  const prompt = [
    {
      role: 'system',
      content: `사용자 메시지에서 기억으로 저장할 만한 고유명사나 장소, 사람 이름, 사건 등을 뽑아서 ["키워드1", "키워드2"] 형식으로만 응답해줘.`
    },
    { role: 'user', content: text }
  ];

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: prompt,
      temperature: 0.7,
      max_tokens: 100
    });

    const raw = res.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(k => typeof k === 'string');
    }
  } catch (err) {
    console.error('❌ 키워드 추출 실패:', err.message);
  }
  return [];
}

// 🔹 3. context-memory.json에 저장
async function extractAndSaveMemory(userMessage) {
  try {
    if (!userMessage || typeof userMessage !== 'string') return;
    ensureContextMemoryExists();

    const keywords = await extractKeywords(userMessage);
    if (!keywords || keywords.length === 0) return;

    const raw = fs.readFileSync(contextMemoryPath, 'utf-8');
    const memory = JSON.parse(raw);
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Tokyo' });

    let changed = false;

    for (const keyword of keywords) {
      if (!memory[keyword]) {
        memory[keyword] = `${timestamp} 기준 대화에서 등장한 키워드야. 기억 저장 필요해.`;
        changed = true;
        console.log(`🧠 새로운 기억 저장: ${keyword}`);
      }
    }

    if (changed) {
      const tmp = contextMemoryPath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(memory, null, 2), 'utf-8');
      fs.renameSync(tmp, contextMemoryPath);
      console.log('✅ context-memory.json 저장 완료');
    }
  } catch (err) {
    console.error('❌ context-memory 저장 실패:', err.message);
  }
}
