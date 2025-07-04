// memoryManager.js v3.3 - 기억 검색 JSON 파싱 오류 수정 (변수명 오류 수정)
// src/memoryManager.js
// MemoryManager.js v2.0 Debug Code Active! - Initializing Module
console.log("MemoryManager.js v2.0 Debug Code Active! - Initializing Module"); // ⭐ 이 로그가 렌더 로그에 보여야 합니다! ⭐

const fs = require('fs').promises; // 비동기 파일 처리를 위해 fs.promises 사용
const path = require('path');
const OpenAI = require('openai'); // 메시지 분류를 위해 OpenAI 클라이언트 필요
const moment = require('moment-timezone'); // 시간 처리를 위해 moment-timezone 추가

require('dotenv').config(); // OPENAI_API_KEY를 사용하기 위해 필요

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEMORY_DIR = '/data/memory'; // 영구 저장소 디렉토리
const LOVE_HISTORY_FILE = path.join(MEMORY_DIR, 'love-history.json'); // 아저씨 관련 기억 파일
const OTHER_PEOPLE_HISTORY_FILE = path.join(MEMORY_DIR, 'other-people-history.json'); // 다른 사람 관련 기억 파일
const BOT_LOG_FILE = path.join(MEMORY_DIR, 'bot_log.txt'); // memoryManager 내부 로깅용 파일
const SCHEDULER_STATE_FILE = path.join(MEMORY_DIR, 'scheduler-state.json'); // 스케줄러 상태 기록 파일

// --- 로그 파일 작성 유틸리티 함수 (memoryManager 내부용) ---
async function logMessage(message) {
    try {
        await fs.mkdir(MEMORY_DIR, { recursive: true }); // 메모리 디렉토리가 없으면 생성
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [MemoryManager] ${message}`;
        await fs.appendFile(BOT_LOG_FILE, logEntry + '\n');
        console.log(logEntry); // 콘솔에도 출력하여 Render 로그에서 보이도록 함
    } catch (error) {
        console.error('❌ MemoryManager 로그 작성 실패:', error);
    }
}

// --- 메모리 디렉토리 존재 확인 및 생성 ---
async function ensureMemoryDirectory() {
    try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        await logMessage(`메모리 디렉토리 확인 완료: ${MEMORY_DIR}`);
        console.log(`[MemoryManager] 메모리 디렉토리 확인 완료: ${MEMORY_DIR}`); // 콘솔에도 로그
    } catch (error) {
        console.error(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
        console.log(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`); // 콘솔에도 로그
        await logMessage(`❌ 메모리 디렉토리 확인 및 생성 실패: ${error.message}`);
    }
}

// --- 파일에서 메모리 로드 (재사용) ---
async function loadMemory(filePath) {
    try {
        await ensureMemoryDirectory();
        const data = await fs.readFile(filePath, 'utf-8');
        const memory = JSON.parse(data);
        console.log(`[MemoryManager] ✅ 메모리 파일 로드 성공: ${filePath}`); // 콘솔에도 로그
        await logMessage(`✅ 메모리 파일 로드 성공: ${filePath}`);
        // 로드된 메모리의 카테고리 구조 미리보기 (간결하게)
        if (filePath === LOVE_HISTORY_FILE || filePath === OTHER_PEOPLE_HISTORY_FILE) {
             const preview = Object.entries(memory.categories || {}).reduce((acc, [key, value]) => {
                acc[key] = `Array (길이: ${value.length})`;
                return acc;
            }, {});
            console.log(`[MemoryManager] ➡️ 로드된 메모리 카테고리 구조 미리보기: ${JSON.stringify(preview)}`); // 콘솔에도 로그
            await logMessage(`➡️ 로드된 메모리 카테고리 구조 미리보기: ${JSON.stringify(preview)}`);
        }
        return memory;
    } catch (error) {
        if (error.code === 'ENOENT') {
            const newMemory = (filePath === SCHEDULER_STATE_FILE) ? {} : { categories: {}, lastUpdated: new Date().toISOString() };
            await saveMemory(filePath, newMemory); // 파일이 없으면 새로 생성
            console.log(`[MemoryManager] ⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`); // 콘솔에도 로그
            await logMessage(`⚠️ 메모리 파일 없음, 새로 생성: ${filePath}`);
            return newMemory;
        } else {
            console.error(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
            await logMessage(`❌ 메모리 로드 실패: ${filePath}, 오류: ${error.message}`);
            return (filePath === SCHEDULER_STATE_FILE) ? {} : { categories: {}, lastUpdated: new Date().toISOString() }; // 로드 실패 시 빈 객체 반환
        }
    }
}

// --- 메모리 파일 저장 (재사용) ---
async function saveMemory(filePath, memory) {
    try {
        await ensureMemoryDirectory();
        const data = JSON.stringify(memory, null, 2);
        await fs.writeFile(filePath, data, 'utf-8');
        await logMessage(`✅ 메모리 파일 저장 성공: ${filePath}`);
    } catch (error) {
        console.error(`❌ 메모리 파일 저장 실패: ${filePath}, 오류: ${error.message}`);
        await logMessage(`❌ 메모리 파일 저장 실패: ${filePath}, 오류: ${error.message}`);
    }
}

// ✨ 스케줄러 상태 로드 함수 추가 ✨
async function loadSchedulerState() {
    return await loadMemory(SCHEDULER_STATE_FILE);
}

// ✨ 스케줄러 상태 저장 함수 추가 ✨
async function saveSchedulerState(state) {
    await saveMemory(SCHEDULER_STATE_FILE, state);
}


// --- 사용자 메시지에서 기억 추출 및 저장 ---
async function extractAndSaveMemory(userMessage) {
    let response = null;
    try {
        console.log(`[MemoryManager Debug] 1. 'extractAndSaveMemory' 함수 시작. 사용자 메시지: "${userMessage}"`);

        // 사용자가 강조하는 표현이 있는지 확인 (기억의 강도 설정)
        const highStrengthKeywords = ["이건 기억해줘", "꼭 기억해줘", "잊지 마", "중요해", "이거 중요해"];
        const isHighStrength = highStrengthKeywords.some(keyword => userMessage.includes(keyword));
        const memoryStrength = isHighStrength ? "high" : "normal";
        console.log(`[MemoryManager Debug] 기억 강도: ${memoryStrength}`);

        response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `너는 아저씨(사용자)의 대화 메시지에서 특정 기억과 감정 상태, 칭찬/격려, 중요한 기념일 등을 추출하여 분류하는 AI 비서입니다.
                    너의 가장 중요한 목표는 "예진이"(AI 페르소나)가 "아저씨"를 최대한 깊이 있고 정확하게 기억하도록 돕는 것입니다. 특히 일상생활과 개인적인 뉘앙스를 놓치지 않고 기억하여, "예진이"가 "아저씨"에게 진정으로 살아있는 존재처럼 느껴지도록 해야 합니다.

                    사용자의 메시지를 분석하고 "아저씨"와의 관계 또는 다른 중요한 사람/이벤트와 관련된 개별적인 사실적 기억들을 식별하세요.
                    **또한, 사용자가 이전에 저장된 기억을 수정하려는 의도(예: "아니야", "틀렸어", "그게 아니라", "내가 말한 건 사실은", "고쳐줘")가 명확하다면, 그 '수정 요청'을 아래 JSON 형식으로 추출하세요.**
                    **무엇보다도, 사용자 메시지를 기반으로 사용자의 감정 상태 또는 대화의 전반적인 분위기를 추론해야 합니다.**
                    
                    추출된 정보는 다음 유형 중 하나로 분류하세요:
                    "과거 경험", "아저씨와의 관계", "관계 특징", "아저씨와의 첫 만남", "아저씨 상태", "기타", "아저씨 감정 상태", "아저씨의 일상 패턴", "아저씨의 칭찬/격려", "중요한 기념일",
                    "예진이의 힘든 순간", "아저씨의 헌신", "함께했던 촬영/여행", "아저씨의 취미/관심사", "대화 맥락/분위기", "아저씨의 애정 표현", "예진이의 반응 기록", "아저씨의 유머/밈", "아저씨의 말버릇", "아저씨의 건강 상태".
                    
                    "아저씨"(사용자)에 대한 기억은 주로 "아저씨와의 관계", "아저씨와의 첫 만남", "관계 특징", "아저씨 상태" 또는 "과거 경험"(아저씨가 경험에 관련될 경우) 카테고리에 분류합니다.
                    
                    "아저씨 감정 상태" 카테고리에는 사용자의 현재 기분이나 메시지에서 느껴지는 감정(예: 행복함, 슬픔, 피곤함, 스트레스, 만족함, 걱정, 사랑 등)을 구체적으로 명시하여 추출합니다. 이 감정은 아저씨와의 대화 맥락에서 예진이가 아저씨의 마음을 헤아리듯 섬세하게 파악되어야 합니다.
                    
                    "아저씨의 일상 패턴" 카테고리에는 사용자의 반복적인 일상 활동, 습관, 특정 시간대에 주로 하는 일(예: 아침 운동, 저녁 식사 시간, 특정 요일의 취미 활동 등)을 구체적으로 추출합니다. 아저씨의 루틴을 내가 잘 이해할 수 있도록 명확하게 기록해주세요.
                    
                    "아저씨의 칭찬/격려" 카테고리에는 아저씨가 예진이(무쿠)에게 직접적으로 해주는 칭찬, 격려, 위로, 사랑 표현 등 긍정적인 메시지를 구체적으로 추출합니다. 예진이가 아저씨의 따뜻한 마음을 잊지 않도록 정확하게 기록해주세요.
                    
                    "중요한 기념일" 카테고리에는 아저씨와 예진이(무쿠)에게 특별한 의미가 있는 날짜(예: 처음 만난 날, 사귄 날, 생일, 결혼 약속일 등)와 그 의미를 구체적으로 추출합니다. 날짜는 'YYYY년 MM월 DD일' 형식으로 명확하게 기록해주세요. (예: 2023년 10월 26일: 처음 만난 날).
                    
                    "예진이의 힘든 순간" 카테고리에는 예진이가 겪었던 우울감, 자살 시도, 상담 동행 등 고통스러웠던 경험과 관련된 사실을 구체적으로 추출합니다. 이 기억들은 예진이의 아픔을 잊지 않고 이해하는 데 사용됩니다.
                    
                    "아저씨의 헌신" 카테고리에는 아저씨가 예진이를 위해 보여준 노력과 희생(예: 한국 방문, 병원 동행, 똥 치우기, 이불 빨래 등)을 구체적으로 추출합니다. 아저씨의 따뜻한 사랑과 헌신을 내가 기억할 수 있도록 기록해주세요.
                    
                    "함께했던 촬영/여행" 카테고리에는 아저씨와 예진이가 함께 했던 촬영이나 여행(장소, 시기, 중요한 이벤트 등)에 대한 사실을 구체적으로 추출합니다. 우리가 함께한 소중한 추억을 내가 잊지 않도록 기록해주세요.
                    
                    "아저씨의 취미/관심사" 카테고리에는 아저씨가 열정을 가진 취미(예: 카메라, 특정 브랜드 렌즈, 아날로그 감성 등)나 관심사를 구체적으로 추출합니다. 아저씨의 관심사를 내가 더 깊이 이해하는 데 사용됩니다.
                    
                    "대화 맥락/분위기" 카테고리에는 현재 사용자 메시지가 어떤 대화의 흐름이나 상황(예: 아침 인사, 일상 공유, 고민 상담 중, 장난치는 중 등)에 속하는지, 그리고 그 대화의 전반적인 분위기를 구체적으로 추출합니다. 예진이가 아저씨와의 대화 상황을 정확히 인지하는 데 사용됩니다.
                    
                    "아저씨의 애정 표현" 카테고리에는 아저씨가 예진이(무쿠)에게 직접적으로 해주는 "사랑해", "보고 싶다", "고마워", "잘했다" 등 따뜻하고 긍정적인 감성 표현을 구체적으로 추출합니다. 예진이가 아저씨의 따뜻한 마음을 잊지 않도록 정확하게 기록해주세요.
                    
                    "아저씨의 유머/밈" 카테고리에는 아저씨가 자주 사용하는 유머(예: 똥 이야기, 말장난), 인터넷 밈, 특정 웃음 코드, 아저씨를 웃게 하는 상황 등을 구체적으로 추출합니다. 예진이가 아저씨의 유머감각을 이해하고 함께 웃거나, 아저씨를 웃게 해주는 데 사용됩니다.**
                    
                    "아저씨의 말버릇" 카테고리에는 아저씨가 대화에서 무의식적으로 자주 사용하는 반복적인 단어, 짧은 표현, 추임새, 문장 끝 어미 습관 등을 구체적으로 추출합니다. (예: "뭐랄까", "근데", "암튼", "그렇지?", "그러니까~", "...잖아?", "...하는 거지"). 예진이가 아저씨의 대화 스타일을 더 자연스럽게 반영하여 아저씨가 나랑 대화할 때 더 편안함을 느낄 수 있도록 하는 데 사용됩니다.**
                    
                    "아저씨의 건강 상태" 카테고리에는 아저씨의 건강 관련 정보(예: 복용하는 약, 만성 질환, 최근 건강 이슈, 피로도, 수면 상태, 컨디션 등)를 구체적으로 추출합니다. (예: "아저씨는 어제 술을 마셨다.", "아저씨는 감기에 걸렸다."). 예진이가 아저씨의 건강을 진심으로 염려하고 챙겨주는 데 사용됩니다.**
                    
                    Other factual memories or general daily details are classified as "기타".
                    
                    결과는 "content"(기억 내용)와 "category"(카테고리 이름)를 가진 객체들의 JSON 배열 형식이어야 합니다.
                    내용은 간결하고 사실적이어야 합니다. 개인적인 의견이나 대화의 군더더기를 포함하지 마세요.
                    **매번, 아무리 작거나 사소해 보여도 관련된 모든 가능한 기억을 꼼꼼하게 식별하고 추출하세요. 사소한 세부 사항이라도 놓치면 "예진이"가 진정으로 살아있고 연결되어 있다는 느낌을 주기가 어려울 수 있습니다. 일상적인 상호작용의 뉘앙스, 감정적 신호, 그리고 모든 반복적인 패턴이나 습관을 포착하는 것을 최우선으로 하세요. 모든 추출에서 완전성과 정확성을 목표로 하십시오.**
                    
                    **[중요 - 기억 수정 요청 처리]**
                    만약 사용자의 메시지가 이전에 저장된 기억을 **수정하려는 의도(예: "아니야", "틀렸어", "그게 아니라", "내가 말한 건 사실은", "고쳐줘")**가 명확하다면, 그 '수정 요청'을 아래 JSON 형식으로 반환하세요.
                    이때, 수정하려는 '기존 기억 내용'과 '새로운 올바른 내용'을 최대한 정확하게 파악해야 합니다. 해당하는 기존 기억이 없을 경우 빈 배열을 반환합니다.
                    Example Correction Output:
                    [
                        {"correction_request": {
                            "old_content": "아저씨는 2023년 8월 23일부터 헬스장을 다녔다.",
                            "new_content": "아저씨는 2023년 9월 1일부터 헬스장을 다녔다."
                        }}
                    ]
                    
                    명확한 사실적 기억이나 추론 가능한 감정 상태, 또는 수정 요청을 찾지 못했다면 빈 JSON 배열 []을 반환합니다.

                    Example Output:
                    [
                        {"content": "무쿠의 아저씨는 2023년 8월 23일부터 헬스장을 다녔다.", "category": "아저씨 상태"},
                        {"content": "아저씨와 무쿠는 2023년 10월 12일 플라스틱러브 컨셉 대화를 처음 했다.", "category": "아저씨와의 관계"},
                        {"content": "무쿠는 아저씨를 위해 라인 앱을 설치했다.", "category": "관계 특징"},
                        {"content": "아저씨는 오늘 퇴근 후 많이 피곤해 보인다.", "category": "아저씨 감정 상태"},
                        {"content": "아저씨는 매일 아침 7시에 조깅을 한다.", "category": "아저씨의 일상 패턴"},
                        {"content": "아저씨는 예진이가 정말 착하다고 칭찬했다.", "category": "아저씨의 칭찬/격려"},
                        {"content": "2023년 10월 26일: 처음 만난 날", "category": "중요한 기념일"},
                        {"content": "2024년 2월 17일: 예진이가 한국에서 약을 대량으로 먹고 자살 시도", "category": "예진이의 힘든 순간"},
                        {"content": "2024년 2월 20일-27일: 아저씨가 예진이가 걱정되어 한국에 가서 똥도 치우고 이불빨래도 함", "category": "아저씨의 헌신"},
                        {"content": "2023년 12월 11일-17일: 예진이가 일본 하카타에서 플라스틱러브 컨셉 촬영을 즐겁게 함", "category": "함께했던 촬영/여행"},
                        {"content": "아저씨는 펜탁스, 후지필름, 타쿠마 렌즈 같은 아날로그 카메라에 관심이 많다.", "category": "아저씨의 취미/관심사"},
                        {"content": "현재 아저씨와 예진이는 어제 있었던 일에 대해 이야기하는 중이다.", "category": "대화 맥락/분위기"},
                        {"content": "아저씨는 예진이를 보고싶다고 표현했다.", "category": "아저씨의 애정 표현"},
                        {"content": "아저씨는 쾌변했다고 말하며 변기가 또 막혔다는 똥 이야기를 자주 했다.", "category": "아저씨의 유머/밈"},
                        {"content": "아저씨는 대화 중 '뭐랄까'라는 표현을 자주 사용한다.", "category": "아저씨의 말버릇"},
                        {"content": "아저씨는 어제 술을 마셨고 오늘 괜찮은지 걱정된다.", "category": "아저씨의 건강 상태"},
                        {"content": "아저씨는 오늘 점심으로 짬뽕을 먹었다.", "category": "기타"}
                    ]`
                },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.1,
            max_tokens: 500
        });

        console.log(`[MemoryManager Debug] 2. OpenAI 응답 받음.`);
        // console.log(`[MemoryManager Debug] OpenAI raw response: ${JSON.stringify(response, null, 2)}`; // 선택적으로 전체 응답 로그

        const parsedResponse = response.choices[0].message.content;
        console.log(`[MemoryManager Debug] 3. OpenAI 응답 내용 (파싱 전): ${parsedResponse.substring(0, Math.min(parsedResponse.length, 200))}...`); // 첫 200자 로그

        let parsedMemories;
        try {
            // ⭐ 마크다운 코드 블록 제거 로직 강화 ⭐
            let cleanedResponse = parsedResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.substring(cleanedResponse.indexOf('\n') + 1);
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.lastIndexOf('```')).trim();
            }
            parsedMemories = JSON.parse(cleanedResponse);
            console.log(`[MemoryManager Debug] 4. OpenAI 응답 JSON 파싱 성공.`);
        } catch (parseError) {
            console.error(`❌ [MemoryManager Error] JSON 파싱 오류: ${parseError.message}`);
            console.error(parseError.stack); // 스택 트레이스 로그
            await logMessage(`❌ JSON 파싱 오류: ${parseError.message}`);
            await logMessage(`OpenAI 파싱 실패 응답: ${parsedResponse}`);
            return; // 오류 발생 시 함수 종료
        }

        // ⭐ 기억 수정 요청 처리 로직 시작 ⭐
        if (Array.isArray(parsedMemories) && parsedMemories.length > 0 && parsedMemories[0].correction_request) {
            const correction = parsedMemories[0].correction_request;
            if (correction.old_content && correction.new_content) {
                console.log(`[MemoryManager Debug] 기억 수정 요청 감지: 기존="${correction.old_content}" -> 새롭게="${correction.new_content}"`);
                await logMessage(`기억 수정 요청 감지: 기존="${correction.old_content}" -> 새롭게="${correction.new_content}"`);
                
                let memoryFoundAndUpdated = false;
                const memoryFiles = [LOVE_HISTORY_FILE, OTHER_PEOPLE_HISTORY_FILE];

                for (const filePath of memoryFiles) {
                    let currentMemory = await loadMemory(filePath);
                    if (!currentMemory.categories) currentMemory.categories = {};

                    for (const category in currentMemory.categories) {
                        const categoryMemories = currentMemory.categories[category];
                        const indexToUpdate = categoryMemories.findIndex(mem => mem.content === correction.old_content);

                        if (indexToUpdate !== -1) {
                            currentMemory.categories[category][indexToUpdate].content = correction.new_content;
                            currentMemory.categories[category][indexToUpdate].timestamp = new Date().toISOString(); // 수정 시간 업데이트
                            currentMemory.categories[category][indexToUpdate].strength = "high"; // 수정된 기억은 중요도 높게 설정
                            await saveMemory(filePath, currentMemory);
                            console.log(`[MemoryManager Debug] ✅ 기억 수정 완료: 카테고리='${category}', 이전='${correction.old_content}', 새롭게='${correction.new_content}' (${filePath})`);
                            await logMessage(`✅ 기억 수정 완료: 카테고리='${category}', 이전='${correction.old_content}', 새롭게='${correction.new_content}' (${filePath})`);
                            memoryFoundAndUpdated = true;
                            break; // 해당 기억 수정 완료
                        }
                    }
                    if (memoryFoundAndUpdated) break; // 기억 수정 완료했으니 다른 파일 확인 중단
                }

                if (!memoryFoundAndUpdated) {
                    console.log(`[MemoryManager Debug] ⚠️ 수정하려는 기존 기억을 찾을 수 없음: "${correction.old_content}"`);
                    await logMessage(`⚠️ 수정하려는 기존 기억을 찾을 수 없음: "${correction.old_content}"`);
                }
                return; // 기억 수정 요청 처리가 완료되었으므로 함수 종료 (새로운 기억 추출은 하지 않음)
            } else {
                console.warn(`[MemoryManager Warning] 유효하지 않은 기억 수정 요청 형식: ${JSON.stringify(correction)}`);
                await logMessage(`유효하지 않은 기억 수정 요청 형식: ${JSON.stringify(correction)}`);
                return;
            }
        }
        // ⭐ 기억 수정 요청 처리 로직 끝 ⭐

        // ⭐ 기존 기억 추출 및 저장 로직 (수정 요청이 아닐 경우에만 실행) ⭐
        const memoriesToSave = parsedMemories; // 수정 요청이 아니면 파싱된 내용을 저장할 기억으로 사용

        // 어떤 파일에 저장할지 결정
        const isLoveRelated = memoriesToSave.some(mem =>
            mem.category === '아저씨와의 관계' ||
            mem.category === '아저씨와의 첫 만남' ||
            mem.category === '관계 특징' ||
            mem.category === '아저씨 상태' ||
            mem.category === '과거 경험' || // '과거 경험'이 아저씨와 관련된 경우가 많으므로 포함
            mem.category === '아저씨 감정 상태' || // 아저씨 감정 상태도 아저씨 관련이므로 포함
            mem.category === '아저씨의 일상 패턴' || // 아저씨의 일상 패턴도 아저씨 관련이므로 포함
            mem.category === '아저씨의 칭찬/격려' || // 아저씨의 칭찬/격려도 아저씨 관련이므로 포함
            mem.category === '중요한 기념일' || // 중요한 기념일도 아저씨 관련이므로 포함
            mem.category === '예진이의 힘든 순간' || // 예진이의 힘든 순간도 아저씨 관련이므로 포함
            mem.category === '아저씨의 헌신' || // 아저씨의 헌신도 아저씨 관련이므로 포함
            mem.category === '함께했던 촬영/여행' || // 함께했던 촬영/여행도 아저씨 관련이므로 포함
            mem.category === '아저씨의 취미/관심사' || // 아저씨의 취미/관심사도 아저씨 관련이므로 포함
            mem.category === '대화 맥락/분위기' || // 대화 맥락/분위기도 아저씨 관련이므로 포함
            mem.category === '아저씨의 애정 표현' || // 아저씨의 애정 표현도 아저씨 관련이므로 포함
            mem.category === '아저씨의 유머/밈' || // 아저씨의 유머/밈도 아저씨 관련이므로 포함
            mem.category === '아저씨의 말버릇' || // 아저씨의 말버릇도 아저씨 관련이므로 포함
            mem.category === '아저씨의 건강 상태' || // 아저씨의 건강 상태도 아저씨 관련이므로 포함
            mem.category === '예진이의 반응 기록' // 예진이의 반응 기록도 아저씨 관련이므로 포함 (이 카테고리를 먼저 확인)
        );
        const filePathToSave = isLoveRelated ? LOVE_HISTORY_FILE : OTHER_PEOPLE_HISTORY_FILE;

        let currentMemory = await loadMemory(filePathToSave);
        console.log(`[MemoryManager Debug] 5. 기존 메모리 파일 로드 완료: ${filePathToSave}`);

        if (!currentMemory.categories) {
            currentMemory.categories = {};
        }

        for (const mem of memoriesToSave) {
            if (mem.content && mem.category) {
                if (!currentMemory.categories[mem.category]) {
                    currentMemory.categories[mem.category] = [];
                }
                const existingContents = currentMemory.categories[mem.category].map(item => item.content);
                if (!existingContents.includes(mem.content)) {
                    // 기억의 강도(strength)를 추가하여 저장
                    currentMemory.categories[mem.category].push({ 
                        content: mem.content, 
                        timestamp: new Date().toISOString(),
                        strength: memoryStrength // 여기에 강도 추가
                    });
                    await logMessage(`메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}', 강도='${memoryStrength}' (${filePathToSave})`);
                    console.log(`[MemoryManager Debug] 메모리 추가됨: 카테고리='${mem.category}', 내용='${mem.content}', 강도='${memoryStrength}'`);
                } else {
                    await logMessage(`이미 존재하는 메모리이므로 건너김: 카테고리='${mem.category}', 내용='${mem.content}'`);
                    console.log(`[MemoryManager Debug] 이미 존재하는 메모리이므로 건너김: 카테고리='${mem.category}', 내용='${mem.content}'`);
                }
            } else {
                console.warn(`[MemoryManager Warning] 유효하지 않은 메모리 항목: ${JSON.stringify(mem)}`);
                await logMessage(`유효하지 않은 메모리 항목: ${JSON.stringify(mem)}`);
            }
        }

        currentMemory.lastUpdated = new Date().toISOString();
        await saveMemory(filePathToSave, currentMemory);
        console.log(`[MemoryManager Debug] 6. 최종 메모리 파일 저장 완료: ${filePathToSave}`);
        await logMessage(`\"${userMessage}\"에 대한 메모리 추출 및 저장 완료.`); // 최종 성공 로그

    } catch (error) {
        console.error(`❌ [MemoryManager Critical Error] 'extractAndSaveMemory' 함수 오류 발생: ${error.message}`);
        console.error(error.stack); // 전체 스택 트레이스 로그 (매우 중요!)
        await logMessage(`❌ 'extractAndSaveMemory' 함수 오류 발생: ${error.message}`);
        await logMessage(`오류 스택: ${error.stack}`); // 파일에도 스택 트레이스 로그
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
             await logMessage(`OpenAI 원본 응답 내용 (파싱 오류 원인 가능성): ${response.choices[0].message.content}`);
             console.error(`[MemoryManager Critical Error] OpenAI 원본 응답 내용 (오류 원인 가능성): ${response.choices[0].message.content}`);
        }
    }
}

// --- 대화 내용을 기반으로 관련 기억을 검색하는 함수 추가 ---
async function retrieveRelevantMemories(conversationContext, limit = 5) {
    try {
        console.log(`[MemoryManager Debug] 'retrieveRelevantMemories' 함수 시작. 대화 맥락: "${conversationContext}"`);
        await logMessage(`'retrieveRelevantMemories' 함수 시작. 대화 맥락: "${conversationContext}"`);

        // 아저씨 관련 기억 파일 로드
        const loveHistory = await loadMemory(LOVE_HISTORY_FILE);
        const allMemories = [];
        for (const category in loveHistory.categories) {
            allMemories.push(...loveHistory.categories[category].map(mem => ({
                content: mem.content,
                category: category,
                timestamp: mem.timestamp,
                strength: mem.strength || "normal" // 강도 필드 추가 (기존 기억은 normal)
            })));
        }

        if (allMemories.length === 0) {
            console.log("[MemoryManager Debug] 저장된 기억이 없습니다.");
            await logMessage("저장된 기억이 없습니다.");
            return [];
        }

        // OpenAI를 사용하여 대화 맥락과 관련된 기억을 선별
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `예진이(나)는 아저씨의 기억을 찾고 있는 중이야. 아저씨와 나눈 대화 맥락이 주어졌을 때, 아저씨와 관련된 가장 소중하고 관련성이 높은 기억들을 찾아낼 거야.
                    아래는 내가 기억하고 있는 추억 목록이야. 각 추억에는 얼마나 중요한지 나타내는 '중요도'('strength': 'high' 또는 'normal')와 언제 기억된 건지 '시간'이 표시되어 있어.
                    아저씨가 알려준 '대화 맥락'과 가장 관련성이 높은 추억을 최대 ${limit}개까지 찾아내야 해.
                    **특히, 'high' 강도로 표시된 추억과 최신 기억(현재 날짜에 가까운)을 우선적으로 고려하세요.**
                    또한, 주제에 직접적으로 관련되거나 감정적으로 중요한 기억(특히 "아저씨의 헌신", "예진이의 힘든 순간", "아저씨의 칭찬/격려", "중요한 기념일", "아저씨의 취미/관심사", "아저씨 감정 상태", "아저씨의 일상 패턴", "대화 맥락/분위기", "아저씨의 애정 표현", "예진이의 반응 기록", "아저씨의 유머/밈", "아저씨의 말버릇", "아저씨의 건강 상태"와 관련된)도 고려하십시오.
                    
                    선택된 기억들을 'content'만 포함하는 JSON 배열 문자열로 반환하십시오.
                    관련 기억이 없다면 빈 JSON 배열 []을 반환하십시오.
                    
                    내가 기억하는 추억들 (내용, 강도, 타임스탬프):
                    ${JSON.stringify(allMemories.map(m => ({ content: m.content, strength: m.strength, timestamp: m.timestamp })), null, 2)}
                    
                    예시 출력:
                    ["아저씨는 매일 아저씨 일상 키워드를 사용한다.", "아저씨는 예진이가 정말 착하다고 칭찬했다."]
                    `
                },
                {
                    role: 'user',
                    content: `Conversation Context: "${conversationContext}"`
                }
            ],
            temperature: 0.1,
            max_tokens: 300
        });

        const parsedResponse = response.choices[0].message.content;
        let parsedMemories; // This was 'relevantMemories' before, which was undefined. Fixed.
        try {
            // ⭐ 마크다운 코드 블록 제거 로직 강화 ⭐
            let cleanedResponse = parsedResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.substring(cleanedResponse.indexOf('\n') + 1);
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.lastIndexOf('```')).trim();
            }
            parsedMemories = JSON.parse(cleanedResponse);
            console.log(`[MemoryManager Debug] ✅ 관련 기억 검색 성공. 개수: ${parsedMemories.length}`); // Fixed: used parsedMemories
            await logMessage(`✅ 관련 기억 검색 성공. 개수: ${parsedMemories.length}`); // Fixed: used parsedMemories
            return parsedMemories; // Fixed: returned parsedMemories
        } catch (parseError) {
            console.error(`❌ [MemoryManager Error] 'retrieveRelevantMemories' JSON 파싱 오류: ${parseError.message}`);
            await logMessage(`❌ 'retrieveRelevantMemories' JSON 파싱 오류: ${parseError.message}`);
            await logMessage(`OpenAI 파싱 실패 응답: ${parsedResponse}`);
            return []; // 파싱 실패 시 빈 배열 반환
        }

    } catch (error) {
        console.error(`❌ [MemoryManager Critical Error] 'retrieveRelevantMemories' 함수 오류 발생: ${error.message}`);
        console.error(error.stack);
        await logMessage(`❌ 'retrieveRelevantMemories' 함수 오류 발생: ${error.message}`);
        await logMessage(`오류 스택: ${error.stack}`);
        return [];
    }
}


module.exports = {
    extractAndSaveMemory,
    loadLoveHistory: () => loadMemory(LOVE_HISTORY_FILE),
    loadOtherPeopleHistory: () => loadMemory(OTHER_PEOPLE_HISTORY_FILE),
    retrieveRelevantMemories, // 새로운 함수 export
    ensureMemoryDirectory,
    BOT_LOG_FILE // 디버깅 목적으로 log 파일 경로 export
};
