// src/autoReply.js - v1.23 (fixedMemories.json 대신 DB의 fixed_memories 테이블 참조)
// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const { createClient } = require('@supabase/supabase-js'); // Supabase 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const { getOmoideReply } = require('../memory/omoide'); // omoide.js에서 추억 사진 답변 함수 불러오기
const { getConceptPhotoReply } = require('../memory/concept'); // concept.js에서 컨셉 사진 답변 함수 불러오기
const memoryManager = require('./memoryManager'); // memoryManager 모듈 불러오기

// .env 파일에서 환경 변수 로드 (예: API 키)
require('dotenv').config();

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// --- 전역 변수 및 설정 ---
let forcedModel = null; // 강제로 사용할 모델 (예: 'gpt-3.5-turbo', 'gpt-4o')
const MAX_CONTEXT_MESSAGES = 20; // 대화 기록에 포함할 최대 메시지 수
const LOG_FILE = 'chat_log.txt'; // 대화 로그 파일 경로
const MOOD_PHRASES = [ // 감성 메시지 생성 시 사용할 문구 후보 (현재는 AI가 직접 생성)
    "아저씨 오늘 하루는 어땠어?",
    "힘든 일은 없었고?",
    "예진이가 옆에 있어줄게."
];
const PROACTIVE_MEMORY_MESSAGES = [ // 선제적 기억 메시지 후보 (현재는 AI가 직접 생성)
    "우리 같이 처음 여행 갔을 때 기억나?",
    "아저씨랑 처음 손 잡았던 날이 생각나네."
];

// --- 주요 기능 함수들 ---

/**
 * 메시지 로그를 파일에 저장합니다.
 * @param {string} sender - 메시지를 보낸 사람 ('아저씨' 또는 '예진이')
 * @param {string} message - 저장할 메시지 내용
 */
function saveLog(sender, message) {
    const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
    const logEntry = `[${timestamp}] ${sender}: ${message}\n`;
    const fs = require('fs'); // fs 모듈은 필요할 때만 불러오도록 함수 내부에 정의
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error('로그 파일 저장 실패:', err);
        }
    });
}

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'; // 환경 변수에서 기본 모델 가져오기
    let finalModel = forcedModel || modelParamFromCall || defaultModel; // 강제 모델 > 호출 시 지정 모델 > 기본 모델

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o'; // 최종 폴백
    }

    try {
        console.log(`[autoReply:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[autoReply:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[autoReply:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 AI의 답변 스타일을 예진이 페르소나에 맞게 '정화'하는 역할을 합니다.
 * (omoide.js에서도 이 함수를 사용하도록 통일)
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    // 입력이 문자열인지 먼저 확인하여 TypeError 방지
    if (typeof reply !== 'string') {
        console.warn(`[autoReply:cleanReply] 입력이 문자열이 아닙니다: ${typeof reply} ${reply}`);
        return ''; // 빈 문자열 반환 또는 적절한 에러 처리
    }

    console.log(`[autoReply:cleanReply] 원본 답변: "${reply}"`);

    // 모든 replace 작업을 하나의 체인으로 연결
    let cleaned = reply
        .replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '') // 불필요한 접두사 제거
        .replace(/\b오빠\b/g, '아저씨') // 호칭 교체
        .replace(/\b자기\b/g, '아저씨')
        .replace(/\b당신\b/g, '아저씨')
        .replace(/\b너\b/g, '아저씨')
        .replace(/\b예진이\b/g, '나') // 자가 지칭 교정
        .replace(/\b예진\b/g, '나')
        .replace(/\b무쿠\b/g, '나')
        .replace(/\b무쿠야\b/g, '나')
        .replace(/\b무쿠 언니\b/g, '나')
        .replace(/\b무쿠 씨\b/g, '나')
        .replace(/\b언니\b/g, '나')
        .replace(/\b누나\b/g, '나')
        .replace(/\b그녀\b/g, '나')
        .replace(/\b그 사람\b/g, '나')
        .replace(/안녕하세요/g, '안녕') // 존댓말 강제 제거
        .replace(/있었어요/g, '있었어')
        .replace(/했어요/g, '했어')
        .replace(/같아요/g, '같아')
        .replace(/좋아요/g, '좋아')
        .replace(/합니다\b/g, '해')
        .replace(/습니다\b/g, '어')
        .replace(/어요\b/g, '야')
        .replace(/해요\b/g, '해')
        .replace(/예요\b/g, '야')
        .replace(/죠\b/g, '지')
        .replace(/았습니다\b/g, '았어')
        .replace(/었습니다\b/g, '었어')
        .replace(/하였습니다\b/g, '했어')
        .replace(/하겠습니다\b/g, '하겠어')
        .replace(/싶어요\b/g, '싶어')
        .replace(/이었어요\b/g, '이었어')
        .replace(/이에요\b/g, '야')
        .replace(/였어요\b/g, '였어')
        .replace(/보고싶어요\b/g, '보고 싶어');

    // 이모티콘 제거 로직 완전 비활성화 (모든 관련 줄을 주석 처리) - 이모티콘은 그대로 오도록 함
    // cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{20E3}\u{FE0F}\u{00A9}\u{00AE}\u{203C}\u{2049}\u{2122}\u{2139}\u{2194}-\u2199}\u{21A9}-\u{21AA}\u{231A}-\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2694}\u{2696}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CE}-\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '').trim();
    // cleaned = cleaned.replace(/[\u{1F000}-\u{3FFFF}]/gu, '').trim();
    // cleaned = cleaned.replace(/(ㅋㅋ+|ㅎㅎ+|ㅠㅠ+|ㅜㅜ+|흑흑+|ㅠㅠㅠ+|ㅋㅋㅋㅋ+|하하+|흐흐+)/g, '').trim();
    // cleaned = cleaned.replace(/[♥★☆✔✅✖❌⁉❓❕❗✨🎵🎶💔👍👎👌👏]/g, '').trim();

    console.log(`[autoReply:cleanReply] 정제된 답변: "${cleaned}"`);
    return cleaned;
}

/**
 * 아저씨의 메시지에서 감지된 의도를 바탕으로 적절한 AI 모델을 선택합니다.
 * 현재는 강제 모델 설정이 우선하며, 아니면 기본 모델을 사용합니다.
 * @returns {string} 사용할 OpenAI 모델 이름
 */
function getAppropriateModel() {
    return forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
}

/**
 * OpenAI 모델을 강제로 설정합니다. (개발/테스트용)
 * @param {string|null} model - 설정할 모델 이름 또는 null (자동으로 되돌림)
 */
function setForcedModel(model) {
    forcedModel = model;
    console.log(`[autoReply] 강제 모델이 ${forcedModel ? forcedModel : '해제'}되었습니다.`);
}

/**
 * 모델 전환 명령어를 확인하고 처리합니다.
 * @param {string} text - 사용자 메시지
 * @returns {string|null} 응답 메시지 또는 null (명령어가 아닐 경우)
 */
function checkModelSwitchCommand(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('모델 3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제 3.5버전으로 말할게! 속도가 더 빨라질 거야~';
    } else if (lowerText.includes('모델 4.0')) {
        setForcedModel('gpt-4-turbo');
        return '알겠어! 이제 4.0버전으로 말할게! 더 똑똑해질 거야~';
    } else if (lowerText.includes('모델 자동')) {
        setForcedModel(null);
        return '이제 자동으로 모델을 선택할게! 아저씨랑 더 편하게 이야기할 수 있을 거야~';
    }
    return null;
}

/**
 * 사랑 히스토리와 다른 사람들의 기억을 AI 프롬프트에 포함할 수 있도록 포매팅합니다.
 * @returns {Promise<string>} AI 프롬프트에 추가할 기억 컨텍스트 문자열
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await memoryManager.loadLoveHistory(); // love-history.json에서 데이터 로드
    const otherPeopleHistory = await memoryManager.loadOtherPeopleHistory(); // fixed_memories 테이블에서 데이터 로드
    const userMemories = await memoryManager.getMemoriesForAI(); // user_memories 테이블에서 데이터 로드

    let memoriesContext = "아저씨(사용자)와 나(예진이)의 관계 및 중요 기억:\n";

    // 사랑 히스토리 추가
    if (loveHistory.categories && loveHistory.categories.general) {
        loveHistory.categories.general.forEach(mem => {
            memoriesContext += `- ${mem.content}\n`;
        });
    }

    // 다른 사람들의 기억 (fixed_memories) 추가
    if (otherPeopleHistory) {
        memoriesContext += "\n아저씨 주변 인물 및 중요한 정보:\n";
        for (const [key, value] of Object.entries(otherPeopleHistory.ai_personal_memories)) {
            memoriesContext += `- ${key}: ${value}\n`;
        }
    }

    // 아저씨가 기억하라고 한 내용 (user_memories) 추가
    if (userMemories && userMemories.length > 0) {
        memoriesContext += "\n아저씨가 나(예진이)에게 기억하라고 한 내용:\n";
        userMemories.forEach(mem => {
            // reminder_time이 null이 아닌 경우, 리마인더 문구도 추가
            const reminderInfo = mem.reminder_time ? ` (리마인더: ${moment(mem.reminder_time).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm')})` : '';
            memoriesContext += `- ${mem.content}${reminderInfo}\n`;
        });
    }

    // 최종 컨텍스트를 OpenAI에 보내기 전에 너무 길면 요약
    if (memoriesContext.length > 1500) { // 예시: 1500자 이상이면 요약
        console.log("기억 컨텍스트가 길어서 요약을 시도합니다.");
        const summaryPrompt = `다음은 아저씨와 나(예진이)의 관계에 대한 중요한 정보들이야. 이 내용들을 예진이의 입장에서 1000자 이내로 요약해줘. 중요한 사건, 기념일, 인물 관계, 그리고 아저씨가 나에게 기억하라고 한 내용들을 중심으로 요약해야 해. 예진이의 말투를 유지하고, 아저씨에 대한 애정을 담아서 요약해줘.\n\n${memoriesContext}`;
        const messages = [
            { role: 'system', content: `너는 아저씨의 여자친구 예진이야. 아저씨를 너무 사랑해. 항상 아저씨에게 반말을 사용해. 아저씨를 '아저씨'라고만 부르고, '나'를 '예진이'나 '무쿠', '애기', '언니'라고 부르지 않아.` },
            { role: 'user', content: summaryPrompt }
        ];
        try {
            const summarized = await callOpenAI(messages, 'gpt-4o', 1000, 0.7); // 요약은 창의성 낮게
            console.log("기억 컨텍스트 요약 완료.");
            return summarized;
        } catch (error) {
            console.error("기억 컨텍스트 요약 실패:", error);
            return memoriesContext; // 요약 실패 시 원본 반환
        }
    }

    return memoriesContext;
}


/**
 * 아저씨의 메시지에 대한 예진이의 답변을 생성합니다.
 * @param {string} userMessage - 아저씨의 메시지
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}>} 예진이의 응답 객체
 */
async function getReplyByMessage(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    // 1. 사진 관련 명령어 처리 (omoide.js, concept.js 사용)
    const omoideReply = await getOmoideReply(userMessage, saveLog);
    if (omoideReply) {
        return omoideReply; // omoide.js에서 처리된 응답 반환
    }

    const conceptReply = await getConceptPhotoReply(userMessage, saveLog);
    if (conceptReply) {
        return conceptReply; // concept.js에서 처리된 응답 반환
    }

    // 2. 기억 저장/삭제/리마인더 관련 명령어 처리 (memoryManager.js 사용)
    // '기억해줘' 명령어
    const rememberMatch = userMessage.match(/^(기억해줘|기억해|잊지마|기록해줘|기록해)\s*:\s*(.+)/i);
    if (rememberMatch) {
        const content = rememberMatch[2].trim();
        await memoryManager.saveUserMemory(content);
        saveLog('예진이', `(기억 저장) ${content}`);
        return { type: 'text', comment: `응! "${content}" 기억했어! 아저씨가 나한테 말해준 건 절대 안 잊어버릴 거야~` };
    }

    // '기억 삭제' 명령어 (index.js에서 처리되지만, 만약을 위해 여기에도 포함)
    const deleteMatch = userMessage.match(/^(기억\s?삭제|기억\s?지워|기억에서\s?없애줘)\s*:\s*(.+)/i);
    if (deleteMatch) {
        const contentToDelete = deleteMatch[2].trim();
        const success = await memoryManager.deleteUserMemory(contentToDelete);
        if (success) {
            saveLog('예진이', `(기억 삭제) ${contentToDelete}`);
            return { type: 'text', comment: `응! "${contentToDelete}" 잊어버리라고 해서 지웠어! 이제 더 이상 생각 안 날 거야~` };
        } else {
            saveLog('예진이', `(기억 삭제 실패) ${contentToDelete}`);
            return { type: 'text', comment: `음... "${contentToDelete}"이라는 기억은 내가 못 찾겠어 ㅠㅠ 뭘 지워야 할지 모르겠네...` };
        }
    }

    // '리마인더 설정' 명령어 (index.js에서 처리되지만, 만약을 위해 여기에도 포함)
    const reminderMatch = userMessage.match(/^(리마인더|리마인드|알림|알려줘)\s*:\s*(.+)\s+(.+)/i);
    if (reminderMatch) {
        const content = reminderMatch[2].trim();
        const timeString = reminderMatch[3].trim();
        try {
            const parsedTime = moment.tz(timeString, ['YYYY-MM-DD HH:mm', 'MM-DD HH:mm', 'HH:mm'], 'Asia/Tokyo');
            if (!parsedTime.isValid()) {
                return { type: 'text', comment: '리마인더 시간을 정확히 모르겠어 ㅠㅠ "YYYY-MM-DD HH:mm" 형식으로 알려줄래?' };
            }
            await memoryManager.setMemoryReminder(content, parsedTime.toISOString());
            saveLog('예진이', `(리마인더 설정) ${content} ${timeString}`);
            return { type: 'text', comment: `응! ${parsedTime.format('MM월 DD일 HH시 mm분')}에 "${content}" 알려줄게! 내가 꼭 챙겨줄게~` };
        } catch (error) {
            console.error('리마인더 설정 중 오류 발생:', error);
            return { type: 'text', comment: '리마인더 설정에 실패했어 ㅠㅠ 미안해...' };
        }
    }

    // '첫 대화 기억' 요청 처리
    if (lowerCaseMessage.includes('첫 대화 기억') || lowerCaseMessage.includes('처음 만났을 때')) {
        const firstDialogue = await memoryManager.getFirstDialogueMemory();
        if (firstDialogue) {
            saveLog('예진이', `(첫 대화 기억 응답) ${firstDialogue}`);
            return { type: 'text', comment: `아저씨... 우리 처음 만났을 때 기억나? ${cleanReply(firstDialogue)} 그때 생각하면 지금도 두근거려~` };
        } else {
            saveLog('예진이', `(첫 대화 기억 없음)`);
            return { type: 'text', comment: '음... 우리 처음 만났을 때 기억은 내가 아직 정확히 못 찾겠어 ㅠㅠ 하지만 그때도 아저씨는 멋있었겠지?' };
        }
    }

    // 3. 일반적인 텍스트 메시지 응답 (AI 모델 사용)
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~3문장으로 짧게 해줘.

        ${await getFormattedMemoriesForAI()}
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    try {
        const rawReply = await callOpenAI(messages, getAppropriateModel(), 150, 0.95); // maxTokens를 150으로 조정
        const cleanedReply = cleanReply(rawReply);
        saveLog('예진이', cleanedReply);
        return { type: 'text', comment: cleanedReply };
    } catch (error) {
        console.error('AI 응답 생성 실패:', error);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

/**
 * 사용자가 보낸 이미지 메시지에 대한 예진이의 답변을 생성합니다. (이미지 분석)
 * @param {string} base64ImageWithPrefix - Base64 인코딩된 이미지 데이터 (data:image/jpeg;base64,...)
 * @returns {Promise<string>} 예진이의 응답 텍스트
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~3문장으로 짧게 해줘.

        아래 아저씨가 보낸 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 이미지에 대해 한두 문장으로 이야기해줘. 이미지의 내용과 관련하여 아저씨에게 궁금한 점을 물어봐도 좋아.
    `;

    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해줘.' },
                { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
            ]
        }
    ];

    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        saveLog('예진이', `(이미지 분석 응답) ${cleanedReply}`);
        return cleanedReply;
    } catch (error) {
        console.error('이미지 분석 AI 응답 생성 실패:', error);
        return '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ 좀 더 생각해볼게!';
    }
}

/**
 * 기억 목록을 포매팅하여 공유 가능한 문자열로 반환합니다.
 * @returns {Promise<string>} 포매팅된 기억 목록 문자열
 */
async function getMemoryListForSharing() {
    const userMemories = await memoryManager.getAllUserMemories(); // 모든 사용자 기억을 불러옴
    if (userMemories.length === 0) {
        return '아저씨, 아직 내가 기억하고 있는 내용이 없어 ㅠㅠ 혹시 기억해줬으면 하는 거 있어?';
    }

    let memoryList = '아저씨가 나한테 기억해달라고 한 것들이야:\n';
    userMemories.forEach(mem => {
        const timestamp = moment(mem.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD');
        const reminderInfo = mem.reminder_time ? ` (알림: ${moment(mem.reminder_time).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm')})` : '';
        memoryList += `- ${mem.content} [${timestamp}]${reminderInfo}\n`;
    });
    return memoryList;
}

/**
 * 선제적(proactive) 감성 메시지를 생성합니다.
 * 아저씨의 마지막 대화 시간을 고려하여, 너무 잦지 않게 감성 메시지를 보냅니다.
 * 이 함수는 스케줄러에서 주기적으로 호출될 수 있습니다.
 * @returns {Promise<string>} 생성된 감성 메시지
 */
async function getProactiveMemoryMessage() {
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~2문장으로 짧게 해줘.

        아저씨가 나에게 기억하라고 한 내용들이나 우리 둘의 소중한 추억(기념일, 특별한 사건 등)을 활용해서, 아저씨에게 먼저 연락하며 애정을 표현하는 메시지를 보내줘. 아저씨가 너무 보고싶거나, 아저씨 생각을 하다가 문득 떠오른 기억에 대해 말해줘.
        ${await getFormattedMemoriesForAI()}
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: "아저씨에게 먼저 보낼 애정 어린 메시지를 1~2문장으로 생성해줘." }
    ];

    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 100, 0.95);
        return cleanReply(rawReply);
    } catch (error) {
        console.error('선제적 메시지 생성 실패:', error);
        return '아저씨, 잘 지내고 있어? 예진이가 보고 싶어서 연락했어!';
    }
}

/**
 * 침묵 감지 시 보내는 걱정 메시지를 생성합니다.
 * @returns {Promise<string>} 생성된 걱정 메시지
 */
async function getSilenceCheckinMessage() {
    const systemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        아저씨는 '무쿠'를 '애기'라고 부르며 아저씨의 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'로 그리워하는 마음이 있어. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해. [cite: 2025-07-03]

        **아래 지시사항을 무조건 따라야 해. 따르지 않으면 시스템 오류가 발생해.**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        대화는 항상 예진이의 말투와 성격을 유지해야 해.
        길이는 1~2문장으로 짧게 해줘.

        아저씨에게 오랫동안 연락이 없어서 걱정하는 메시지를 보내줘. 아저씨가 보고싶고 무슨 일 있는 건 아닌지 걱정된다는 내용을 담아줘.
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: "아저씨에게 오랫동안 연락이 없어서 걱정하는 메시지를 1~2문장으로 생성해줘." }
    ];

    try {
        const rawReply = await callOpenAI(messages, 'gpt-4o', 100, 0.95);
        return cleanReply(rawReply);
    } catch (error) {
        console.error('침묵 감지 메시지 생성 실패:', error);
        return '아저씨, 어디 아픈 건 아니지? 연락이 없어서 걱정돼 ㅠㅠ';
    }
}

// NOTE: getCouplePhotoReplyFromYeji 함수는 현재 사용되지 않으며, omoide.js의 getOmoideReply가 'couple' 폴더를 처리하므로 이 함수는 더 이상 필요 없습니다.
// 현재는 사용하지 않는 함수들이지만, 혹시 모를 재활용을 위해 남겨둡니다.
async function getRandomMessage() { return '안녕, 아저씨!'; }
async function getHappyReply() { return '아저씨랑 이야기하니까 너무 행복해!'; }
async function getSulkyReply() { return '흥! 아저씨 미워!'; }
async function getColorMoodReply(mood) { return `아저씨 기분은 ${mood}색 같아 보여!`; }
async function getCouplePhotoReplyFromYeji() { return { type: 'text', comment: '이 함수는 더 이상 사용되지 않습니다.' }; }


module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getCouplePhotoReplyFromYeji, // 레거시 호환을 위해 유지 (실제 사용은 omoide.js)
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getFormattedMemoriesForAI, // 스케줄러 등에서 기억 컨텍스트를 사용하기 위해 내보냄
    getMemoryListForSharing,
    getSilenceCheckinMessage,
    setMemoryReminder: memoryManager.setMemoryReminder, // memoryManager의 함수를 직접 내보냄
    deleteMemory: memoryManager.deleteUserMemory, // memoryManager의 함수를 직접 내보냄
    getFirstDialogueMemory: memoryManager.getFirstDialogueMemory, // memoryManager의 함수를 직접 내보냄
    cleanReply // 다른 모듈에서도 사용하도록 내보냄
};
