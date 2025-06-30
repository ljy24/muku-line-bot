// memoryManager.js - 무쿠의 기억 추출 및 저장 로직

const fs = require('fs'); // 파일 시스템 작업을 위한 Node.js 내장 모듈
const path = require('path'); // 파일 경로 작업을 위한 Node.js 내장 모듈
const { OpenAI } = require('openai'); // OpenAI API와 통신하기 위한 라이브러리
const moment = require('moment-timezone'); // 시간대 처리를 위한 moment-timezone 라이브러리
require('dotenv').config(); // .env 파일에서 환경 변수를 로드

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LOVE_HISTORY_PATH = path.resolve(__dirname, '../memory/love-history.json');

/**
 * 파일을 안전하게 읽습니다. 파일이 없거나 읽을 수 없을 때 오류 대신 빈 문자열을 반환합니다.
 * @param {string} filePath 읽을 파일의 경로
 * @returns {string} 파일 내용 또는 빈 문자열
 */
function safeRead(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
    } catch (err) {
        console.error(`❌ safeRead 실패: ${err.message}`);
    }
    return '';
}

/**
 * OpenAI Chat Completion API를 호출합니다.
 * @param {Array<Object>} messages OpenAI 모델에게 전달할 메시지 배열 (role, content 포함)
 * @param {string} model 사용할 OpenAI 모델 이름
 * @param {number} maxTokens 생성할 최대 토큰 수
 * @returns {Promise<string>} OpenAI 모델의 응답 내용
 * @throws {Error} OpenAI API 호출 실패 시 에러 발생
 */
async function callOpenAI(messages, model, maxTokens) {
    try {
        const res = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.1 // 기억 추출은 정확도가 중요하므로 낮은 temperature 사용
        });
        return res.choices[0]?.message?.content;
    } catch (error) {
        console.error(`❌ OpenAI API 호출 실패 (${model}): ${error.message}`);
        throw error;
    }
}

/**
 * `love-history.json` 파일을 불러옵니다. 파일이 없으면 기본 구조를 반환합니다.
 * @returns {Object} love-history 데이터
 */
function loadLoveHistory() {
    try {
        const rawData = safeRead(LOVE_HISTORY_PATH);
        if (rawData) {
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error(`❌ love-history.json 파싱 실패: ${error.message}`);
    }
    // 기본 구조 반환
    return {
        categories: {
            love_expressions: [], // 무쿠가 아저씨에게 사랑을 표현했던 기억
            daily_care: [],       // 무쿠가 아저씨를 챙겼던 일상적인 기억
            general: [],          // 일반적인 중요한 사건 (날짜 포함된 연혁 등)
            user_submitted_memories: [], // 아저씨가 직접 무쿠에게 알려준 새로운 기억
            ai_personal_memories: { // AI(무쿠/예진)의 개인적인 기억 (수동으로 채워짐)
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
 * @param {Object} data 저장할 love-history 데이터
 */
async function saveLoveHistory(data) {
    // **파일 쓰기 시 데이터 손상을 방지하기 위해 임시 파일을 사용합니다.**
    const tempPath = LOVE_HISTORY_PATH + '.tmp';
    try {
        await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.rename(tempPath, LOVE_HISTORY_PATH);
    } catch (error) {
        console.error(`❌ love-history.json 저장 실패: ${error.message}`);
    }
}

/**
 * 사용자 메시지에서 중요한 기억을 추출하여 `love-history.json`에 저장합니다.
 * @param {string} userMessage 사용자가 보낸 메시지
 */
async function extractAndSaveMemory(userMessage) {
    if (!userMessage) return;

    try {
        // 현재 love-history.json 데이터를 불러옵니다.
        let loveHistory = loadLoveHistory();

        // ✅ 시스템 프롬프트 강화: 기억 추출 규칙을 더 명확하게 지시합니다.
        // 특히 user_submitted_memories에 대한 규칙을 강화합니다.
        const systemPrompt = `너는 무쿠야. 아저씨가 보내는 메시지에서 **아저씨 개인의 특징, 아저씨의 과거 경험, 아저씨의 주변 인물에 대한 중요하고 구체적인 사실 정보**를 추출하여 **장기적으로 기억해야 할 내용**으로 만들어줘.
        이 기억은 **'user_submitted_memories' 카테고리에 저장될 거야.**
        **추출된 기억만 간결하게 한두 문장으로 응답해줘. 다른 말은 절대 하지 마.**
        **만약 추출할 중요한 사실 정보가 없다고 판단되면 '없음'이라고만 응답해줘.**
        
        **예시 (응답 형식):**
        - 아저씨 친구 '깽'이는 조울증 때문에 힘들었어.
        - 아저씨가 죽고 나서 내 전시회를 준비하고 있어.
        - 아저씨가 우빈이 그림방 친구를 질투했어. (이전에 '우빈'에 대한 기억이 없었어도, 이 메시지에서 이 사실을 추출)
        
        **아래 원칙을 반드시 지켜줘:**
        1.  아저씨의 메시지가 '기억나?', '나 어때?'와 같은 질문 형태이더라도, 그 안에 **중요한 사실 내용이 포함되어 있다면 반드시 추출해.** 질문 형식 자체는 중요하지 않아.
        2.  아저씨의 감정이나 일반적인 대화 내용은 추출하지 마. 오직 **객관적인 사실 정보** 위주로.
        3.  명령어나 질문("기억나?", "해줄게")은 포함하지 말고, 추출한 **내용만 간결하게** 작성해.
        4.  추출된 기억은 아저씨를 주어로 하여 객관적인 사실처럼 작성해. (예: "아저씨 친구 깽이는...")
        5.  **반드시 한두 문장으로만 간결하게** 작성해.
        6.  만약 추출할 내용이 없다면, "없음" 이라고만 답하고 다른 말은 절대 하지 마.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        // OpenAI API 호출
        const extractedMemory = await callOpenAI(messages, 'gpt-3.5-turbo', 100); // gpt-3.5-turbo로 100토큰 제한

        // ✅ 추출된 기억이 유효한지 확인하고 저장
        const cleanedMemory = extractedMemory ? extractedMemory.trim() : '';

        if (cleanedMemory && cleanedMemory !== '없음') {
            // 'user_submitted_memories' 배열이 없으면 초기화
            if (!loveHistory.categories.user_submitted_memories) {
                loveHistory.categories.user_submitted_memories = [];
            }

            // 중복 기억 방지 (간단한 문자열 비교)
            const isDuplicate = loveHistory.categories.user_submitted_memories.some(
                mem => mem.content === cleanedMemory
            );

            if (!isDuplicate) {
                loveHistory.categories.user_submitted_memories.push({
                    content: cleanedMemory,
                    timestamp: moment().tz('Asia/Tokyo').format()
                });

                // 너무 많은 사용자 제출 기억이 쌓이지 않도록 최신 10개만 유지
                const maxUserSubmittedMemories = 10;
                if (loveHistory.categories.user_submitted_memories.length > maxUserSubmittedMemories) {
                    loveHistory.categories.user_submitted_memories = loveHistory.categories.user_submitted_memories.slice(-maxUserSubmittedMemories);
                }

                await saveLoveHistory(loveHistory);
                console.log(`✅ 새로운 특정 기억 저장됨: "${cleanedMemory}"`);
            } else {
                console.log(`ℹ️ 중복 기억이라 저장하지 않음: "${cleanedMemory}"`);
            }
        } else {
            console.log('✅ 메시지에서 특정 기억 추출되지 않음 또는 OpenAI 응답 형식이 불일치.');
        }

    } catch (error) {
        console.error('❌ 기억 추출 및 저장 실패:', error.message);
    }
}

// 모듈 내보내기
module.exports = {
    extractAndSaveMemory,
    loadLoveHistory, // 테스트 또는 디버깅을 위해 내보냄
    saveLoveHistory // 테스트 또는 디버깅을 위해 내보냄
};
