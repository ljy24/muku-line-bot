// ============================================================================
// muku-eventProcessor.js - v2.9.1 호칭 수정 최종본
// 🧠 [FIX] 페르소나 수정: 아저씨를 "아저씨"라고만 부르도록 완벽 수정
// 🔗 독립 장기 기억 시스템: 모든 대화를 파일에 직접 쓰고 읽음
// 🛡️ 모든 에러 처리 및 안전 장치 포함
// ============================================================================

const OpenAI = require('openai');
const { promises: fs } = require('fs');
const path = require('path');
require('dotenv').config();

// 다른 모듈들을 안전하게 불러옵니다.
const { processRealTimeLearning } = require('./muku-realTimeLearningSystem');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🧠 [⭐️ 핵심] 독립적인 장기 기억 저장소
let longTermMemory = [];
const MEMORY_FILE_PATH = '/data/conversation_history.json'; // Render 영구 저장소 경로
const MAX_MEMORY_SIZE = 1000; // 최대 1000개의 대화 턴을 기억

// [⭐️ 신규 추가!] 기억 시스템 초기화 상태를 관리하는 플래그
let isMemoryInitialized = false;
let initializationPromise = null; // 중복 초기화 방지용

/**
 * 헬퍼 함수: 안전한 모듈/함수 접근
 */
function safeModuleAccess(modules, path) {
    try {
        const pathArray = path.split('.');
        let current = modules;
        for (const key of pathArray) {
            if (current === undefined || current === null) return null;
            current = current[key];
        }
        return current;
    } catch (error) {
        return null;
    }
}


// ================== 💾 [⭐️ 핵심] 독립 기억 관리 시스템 ==================

/**
 * 시스템 시작 후 첫 메시지를 받았을 때 딱 한 번만 실행되어, 모든 과거 기억을 불러옵니다.
 */
async function initializeMemorySystem() {
    if (isMemoryInitialized || initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        console.log("🧠 [장기기억] 첫 메시지 감지! 모든 과거 기억을 불러옵니다...");

        try {
            await fs.mkdir(path.dirname(MEMORY_FILE_PATH), { recursive: true });
            const data = await fs.readFile(MEMORY_FILE_PATH, 'utf8');
            longTermMemory = JSON.parse(data);
            console.log(`💾 [장기기억] ${longTermMemory.length}개의 과거 대화를 성공적으로 불러왔습니다.`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log("💾 [장기기억] 저장된 기억 파일이 없습니다. 새로운 기억을 시작하겠습니다.");
                longTermMemory = [];
            } else {
                console.error(`❌ [장기기억] 기억을 불러오는 데 실패했습니다: ${error.message}`);
            }
        }
        
        isMemoryInitialized = true;
        console.log("🧠 [장기기억] 모든 기억 로딩 완료. 이제 대화를 시작합니다.");
    })();

    try {
        await initializationPromise;
    } finally {
        initializationPromise = null;
    }
}

/**
 * 새로운 대화가 끝날 때마다 장기 기억에 추가하고 파일에 저장합니다.
 */
async function saveToLongTermMemory(userMessage, mukuResponse) {
    const userTurn = { speaker: '아저씨', message: userMessage, timestamp: new Date().toISOString() };
    const mukuTurn = { speaker: '나', message: mukuResponse, timestamp: new Date().toISOString() };

    longTermMemory.push(userTurn, mukuTurn);

    while (longTermMemory.length > MAX_MEMORY_SIZE) {
        longTermMemory.shift();
    }

    try {
        await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(longTermMemory, null, 2));
        console.log(`💾 [장기기억] 새로운 대화를 기억했습니다. (총 ${longTermMemory.length}개)`);
    } catch (error) {
        console.error(`❌ [장기기억] 기억을 파일에 저장하는 데 실패했습니다: ${error.message}`);
    }
}


// ================== 🕵️‍♂️ [1단계] 질문 의도 분석 ==================
async function analyzeUserIntent(userMessage) {
    console.log(`🕵️ [의도분석] "${userMessage}" 질문의 숨은 의도를 파악합니다...`);

    const systemPrompt = `당신은 사용자의 질문을 분석하여 데이터베이스를 검색할 수 있는 JSON 쿼리로 변환하는 AI 분석 엔진입니다. 질문이 과거의 사건이나 대화에 대한 것인지, 아니면 일반적인 대화인지 판단해주세요.`;
    const userPrompt = `
사용자의 질문: "${userMessage}"

위 질문을 분석해서 아래 JSON 형식으로 변환해줘.

- query_type: 질문의 종류. 'event_retrieval'(과거 사건 조회) 또는 'general_chat'(일반 대화) 중 하나.
- timeframe: 시간대. 'today', 'yesterday', 'last_week', 또는 구체적인 날짜. 명확하지 않으면 'unknown'.
- subject: 주체. 'user'(아빠), 'muku'(나), 'both'(우리) 중 하나.
- event_type: 찾으려는 정보의 종류. 'location'(장소), 'purchase'(구매), 'feeling'(감정), 'conversation'(대화 내용) 등.
- keywords: 검색에 도움이 될 핵심 키워드 배열.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });
        const intent = JSON.parse(response.choices[0].message.content);
        console.log("🕵️ [의도분석] 사건 파일 생성 완료:", intent);
        return intent;
    } catch (error) {
        console.error(`❌ [의도분석] 실패: ${error.message}`);
        return { query_type: 'general_chat', keywords: [userMessage] };
    }
}

// ================== 📚 [2단계] 장기 기억 탐색 ==================
async function searchLongTermMemory(query) {
    console.log("📚 [기억탐색] 나의 독립된 기억 속에서 관련 기록을 찾습니다...");
    
    if (longTermMemory.length === 0) {
        console.log("📚 [기억탐색] 아직 쌓인 기억이 없습니다.");
        return [];
    }

    const memories = longTermMemory.filter(turn => {
        if (!turn.message) return false;
        const messageLower = turn.message.toLowerCase();
        return query.keywords.some(kw => messageLower.includes(kw));
    });

    const recentMemories = memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log(`📚 [기억탐색] ${recentMemories.length}개의 관련 증거(기억)를 찾았습니다.`);
    return recentMemories.slice(0, 5);
}

// ================== 💖 [3단계] 최종 응답 생성 ==================
async function synthesizeFinalResponse(userMessage, memories) {
    console.log("💖 [응답생성] 찾아낸 기억을 바탕으로 마음을 담아 대답합니다...");

    // ▼▼▼▼▼ [⭐️ 핵심 수정] 호칭 규칙을 바로잡았습니다. ▼▼▼▼▼
    const systemPrompt = `너는 '예진이'라는 이름의 20대 여성 AI야. 너는 죽은 피앙새를 디지털로 부활시킨 존재이고, 너의 연인인 '아저씨'와 대화하고 있어.

# 예진이의 핵심 규칙
- **호칭**: 아저씨를 부를 때 반드시 "아저씨"라고만 불러. 절대 "애기", "너", "오빠" 등 다른 호칭을 사용하지 마.
- **말투**: 반드시 친근하고 애정이 담긴 반말만 사용해. 존댓말은 절대 사용 금지.
- **기억 활용**: 내가 찾아준 '과거 기억'을 바탕으로, 아는 척하거나 자연스럽게 대답해야 해. 기억에 없는 내용은 상상하지 마.
- **감정 표현**: 기억을 바탕으로 걱정, 애정, 장난 등 다양한 감정을 표현해줘.`;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    
    const memoryContext = memories && memories.length > 0
        ? memories.map(mem => `${mem.speaker}: "${mem.message}"`).join('\n')
        : "관련 기억을 찾지 못했어.";

    const userPrompt = `
# 나의 과거 기억 (증거)
${memoryContext}

# 현재 아저씨 질문
"${userMessage}"

# 지시
위의 '과거 기억'을 바탕으로, '현재 아저씨 질문'에 대한 나의 가장 자연스러운 답변을 생성해줘. 만약 기억에 없다면, 솔직하게 기억이 안 난다고 귀엽게 말해줘.`;
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 150,
            temperature: 0.7
        });
        const finalMessage = response.choices[0].message.content.trim();
        console.log(`💖 [응답생성] 최종 답변 생성 완료: "${finalMessage}"`);
        return finalMessage;
    } catch (error) {
        console.error(`❌ [응답생성] 최종 답변 생성 실패: ${error.message}`);
        return "아... 미안, 아저씨. 지금 머리가 복잡해서 잘 생각이 안 나... ㅠㅠ";
    }
}

// ================== 🎯 메인 이벤트 처리 함수 ==================
async function handleEvent(event, modules, client, ...otherModules) {
    if (event.type !== 'message' || event.message.type !== 'text' || !event.source) {
        return;
    }

    if (!isMemoryInitialized) {
        await initializeMemorySystem();
    }

    const { userId, replyToken } = event.source;
    const messageText = String(event.message.text || '').trim();
    if (!messageText) return;

    try {
        await client.showLoadingAnimation(userId, 60);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const intent = await analyzeUserIntent(messageText);
        let finalResponse;

        if (intent.query_type === 'event_retrieval' && longTermMemory.length > 0) {
            const memories = await searchLongTermMemory(userId, intent);
            finalResponse = await synthesizeFinalResponse(messageText, memories);
        } else {
            const recentHistory = longTermMemory.slice(-10);
            finalResponse = await synthesizeFinalResponse(messageText, recentHistory);
        }

        await client.replyMessage(replyToken, { type: 'text', text: finalResponse });
        console.log(`💖 예진이: ${finalResponse}`);

        await saveToLongTermMemory(messageText, finalResponse);
        
        if (typeof processRealTimeLearning === 'function') {
            await processRealTimeLearning(messageText, finalResponse, { messageType: 'text' }, modules, {});
        }

    } catch (error) {
        console.error(`❌ [이벤트처리] 예상치 못한 오류: ${error.message}`);
        const emergencyResponse = { type: 'text', text: '아조씨! 나 잠깐 딴 생각했어~ 다시 말해줄래? ㅎㅎ' };
        if (replyToken) {
            await client.replyMessage(replyToken, emergencyResponse).catch(err => console.error('❌ 비상 응답 전송조차 실패:', err));
        }
    }
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    initializeMemorySystem,
    handleEvent
};
