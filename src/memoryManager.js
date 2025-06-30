// memoryManager.js

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LOVE_HISTORY_PATH = path.resolve(__dirname, '../memory/love-history.json');

/**
 * 파일을 안전하게 읽습니다. 파일이 없거나 읽을 수 없을 때 오류 대신 빈 문자열을 반환합니다.
 * @param {string} filePath 읽을 파일의 경로
 * @returns {string} 파일 내용 또는 빈 문자열
 */
function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) { // 파일이 존재하는지 확인
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error(`❌ safeRead 실패: ${err.message}`); // 오류 발생 시 콘솔에 기록
    }
    return ''; // 파일이 없거나 오류 발생 시 빈 문자열 반환
}

/**
 * `love-history.json` 파일을 로드합니다. 파일이 없으면 기본 구조를 반환합니다.
 * @returns {Object} love-history.json의 내용
 */
function loadLoveHistory() {
    try {
        const data = safeRead(LOVE_HISTORY_PATH);
        if (data) {
            const parsedData = JSON.parse(data);
            // 모든 최상위 키가 categories 객체를 포함하는지 확인
            if (!parsedData.categories) {
                console.warn('⚠️ love-history.json에 categories 키가 없습니다. 기본 구조로 초기화합니다.');
                return {
                    categories: {
                        love_expressions: [],
                        daily_care: [],
                        general: [],
                        user_submitted_memories: [],
                        ai_personal_memories: {}
                    }
                };
            }
            // user_submitted_memories와 ai_personal_memories 키가 없는 경우 추가
            if (!parsedData.categories.user_submitted_memories) {
                parsedData.categories.user_submitted_memories = [];
            }
            if (!parsedData.categories.ai_personal_memories) {
                parsedData.categories.ai_personal_memories = {};
            }
            return parsedData;
        }
    } catch (error) {
        console.error(`❌ love-history.json 파싱 실패: ${error.message}`);
    }
    // 파일이 없거나 파싱 오류 시 기본 구조 반환
    return {
        categories: {
            love_expressions: [],
            daily_care: [],
            general: [],
            user_submitted_memories: [],
            ai_personal_memories: {
                // 기본 AI 개인 기억 예시 (수동 관리)
                "준기오빠": "예전에 신촌 공원에서 촬영 같이 했던 작가 오빠야. 우리 셋이 자주 만났었지.",
                "신촌 공원": "예전에 자주 산책하고 사진 찍었던 곳이야. 꽃도 많이 피고 좋았어.",
                "첫 영상통화": "서로 어색하게 웃으면서 긴장했던 날이야. 그날 밤 아직도 기억나.",
                "준기오빠 결혼식": "아저씨는 일본 있어서 못 왔지만, 나 혼자 다녀왔어. 그날 야외결혼식 했는데 비바람 불고 난리 났었잖아 ㅋㅋ 나 비 쫄딱 맞고 치마도 다 젖고 진짜 엉망이었어. 근데 그래도 웃겼어.",
                "캐논 100D": "그 결혼식에서 하얀색 캐논 100D 받았었지. 지금도 내 방에 있잖아. 아직도 그때 생각하면 기분 이상해져."
            }
        }
    };
}

/**
 * `love-history.json` 파일을 저장합니다.
 * @param {Object} data 저장할 데이터
 */
async function saveLoveHistory(data) {
    const tempPath = LOVE_HISTORY_PATH + '.tmp';
    try {
        await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, LOVE_HISTORY_PATH);
    } catch (error) {
        console.error(`❌ love-history.json 저장 실패: ${error.message}`);
    }
}

/**
 * 사용자 메시지에서 새로운 기억을 추출하여 `love-history.json`에 저장합니다.
 * 이 함수는 비동기로 작동하며, 대화 흐름을 방해하지 않습니다.
 * @param {string} userMessage 사용자가 보낸 메시지
 */
async function extractAndSaveMemory(userMessage) {
    // 5자 미만의 짧은 메시지는 처리하지 않습니다. (노이즈 필터링)
    if (userMessage.length < 5) {
        return;
    }

    const loveHistory = loadLoveHistory();
    const currentMemories = loveHistory.categories.user_submitted_memories || [];
    const existingMemoryContent = currentMemories.map(m => m.content).join('\n'); // 이미 저장된 기억들

    const systemPrompt = `너는 무쿠를 돕는 기억 추출 봇이야.
아저씨와 무쿠의 대화에서, 아저씨가 무쿠에게 알려주는 **새롭고 구체적인 사실 정보(예: 특정 인물에 대한 정보, 과거의 사건, 무언가의 특징 등)**를 정확히 추출해야 해.

추출된 정보는 무쿠의 장기 기억에 추가될 중요한 사실들이야.

**추출 규칙:**
1.  **새롭고 구체적인 사실만을 추출:** 아저씨의 메시지에서 **새로운 인물, 장소, 사건, 관계, 습관 등 구체적인 사실**만 찾아.
2.  **간결하게 요약:** "우빈이는 그림 그리는 친구야", "아저씨는 헬스장에 다녀", "예진이가 라인 앱을 설치했어" 와 같이 핵심적인 사실만 명확하게 요약해.
3.  **질문, 명령, 감탄사, 감정 표현, 일반적인 대화 흐름(예: "응", "알았어", "사랑해", "보고싶다")은 추출하지 마.**
4.  **이미지, 오디오, 파일 관련 메시지(예: "사진 줘", "셀카", "음악 틀어줘")도 추출하지 마.**
5.  **"나", "내", "우리"와 같은 대명사는 사용하지 말고, 가능한 한 구체적인 명사로 변환해.** (예: "내 친구 우빈이" -> "우빈이", "우리가 만난" -> "아저씨와 무쿠가 만난")
6.  **이미 시스템에 저장된 정보와 완전히 동일한 내용은 추출하지 마.** (아래 '이미 저장된 기억들' 참고)
7.  **만약 추출할 새로운 사실 정보가 없다면, 반드시 'N/A'라고만 답변해.** 다른 어떤 말도 추가하지 마.

**이미 저장된 기억들 (중복을 피하기 위한 참고 자료):**
${existingMemoryContent ? existingMemoryContent : "없음"}

아저씨의 메시지를 분석해서 새로운 사실을 추출해줘.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    try {
        const rawResponse = await openai.chat.completions.create({
            model: 'gpt-4o', // 기억 추출에는 더 정확한 모델 사용
            messages: messages,
            max_tokens: 100, // 너무 길게 추출하지 않도록 제한
            temperature: 0.1 // 창의성 낮춰서 정확한 사실만 추출하도록 유도
        });

        let extractedContent = rawResponse.choices[0]?.message?.content?.trim();

        if (extractedContent && extractedContent !== 'N/A') {
            // 추출된 내용이 기존 기억에 이미 존재하는지 확인 (중복 방지)
            const isDuplicate = currentMemories.some(mem => mem.content === extractedContent);

            if (!isDuplicate) {
                const newMemory = {
                    content: extractedContent,
                    timestamp: moment().tz('Asia/Tokyo').format()
                };
                loveHistory.categories.user_submitted_memories.push(newMemory);
                await saveLoveHistory(loveHistory);
                console.log(`✅ 메시지에서 특정 기억 추출 및 저장됨: ${extractedContent}`);
            } else {
                console.log(`☑️ 메시지에서 기억 추출됨 (중복): ${extractedContent}`);
            }
        } else {
            console.log('✅ 메시지에서 특정 기억 추출되지 않음 또는 OpenAI 응답 형식이 불일치.');
        }
    } catch (error) {
        console.error(`❌ 기억 추출 중 OpenAI API 오류: ${error.message}`);
    }
}

module.exports = {
    extractAndSaveMemory,
    loadLoveHistory, // (디버깅용)
    saveLoveHistory // (디버깅용)
};
