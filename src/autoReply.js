// src/autoReply.js v7.0 - "Legacy Support Only" 버전
// ultimateConversationContext가 메인 로직을 담당하게 되어, 
// 이 파일은 기존 호환성을 위한 유틸리티 함수들만 제공

const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 상수들
const BOT_NAME = '나';
const USER_NAME = '아저씨';
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json');

// 대화 로그
let conversationLog = [];

// 파일 존재 여부 확인 및 초기화
function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    }
}

// 초기 로그 로드
ensureLogFile();
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('Error loading conversation log:', error);
    conversationLog = [];
}

/**
 * 📝 메시지 로그 저장 (기존 호환성 유지)
 */
function saveLog(speaker, message) {
    const logEntry = {
        role: speaker === USER_NAME ? 'user' : 'assistant',
        content: message,
        timestamp: Date.now()
    };
    
    conversationLog.push(logEntry);
    if (conversationLog.length > 500) {
        conversationLog = conversationLog.slice(-500);
    }
    
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(conversationLog, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving conversation log:', error);
    }
}

/**
 * 🤖 OpenAI API 호출 (기존 호환성 유지)
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    const usesImage = messages.some(msg => 
        msg.content && Array.isArray(msg.content) && 
        msg.content.some(item => item.type === 'image_url')
    );
    
    if (usesImage) {
        finalModel = 'gpt-4o';
    }

    try {
        console.log(`[Legacy:callOpenAI] 모델 호출: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[Legacy:callOpenAI] 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * 🧹 응답 정리 함수 (1인칭 변환 포함)
 */
function cleanReply(reply) {
    if (typeof reply !== 'string') return '';

    let cleaned = reply
        // 기본 정리
        .replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나')
        .replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨')
        .replace(/(도와드릴까요|무엇을|어떤)\s*도와(드릴까요|드릴게요)?/gi, '')
        .replace(/문의사항|도우미|챗봇|AI|GPT|말투로|아래는|답변입니다|설명|응답/gi, '')
        .replace(/(제가\s*)?(도와드릴게요|도와드릴까요|도움드리겠습니다)/gi, '')
        .replace(/\[.*?\]/g, '')
        
        // 존댓말 → 반말 변환
        .replace(/(입니다|이에요|예요|세요|하셨나요|셨나요|셨습니다|드릴게요|드릴까요|해요|했어요|했네요|있었어요|주세요|되셨습니다|되었어요)/gi, '')
        .replace(/(좋아요)/gi, '좋아')
        .replace(/(보고싶어요)/gi, '보고싶어')
        .replace(/(고마워요|감사합니다|감사해요)/gi, '고마워')
        .replace(/(미안해요|죄송합니다|죄송해요)/gi, '미안해')
        .replace(/(알겠어요|알겠습니다)/gi, '알겠어')
        .replace(/(잘 모르겠어요|모르겠습니다)/gi, '잘 모르겠어')
        .replace(/(맞아요|맞네요)/gi, '맞아')
        .replace(/(그래요|그렇네요)/gi, '그래')
        .replace(/(수 있습니다|수 있습니까|수 있겠습니까)/gi, '수 있어')
        .replace(/합니(다|까)/gi, '해')
        .replace(/하겠(습니다|어요)?/gi, '할게')
        .replace(/하였(습니다|어요)?/gi, '했어')
        .replace(/되었(습니다|어요)?/gi, '됐어')

    // 3인칭 → 1인칭 변환 (v5.1 핵심 기능)
    cleaned = cleaned
        .replace(/무쿠가\s+/g, '내가 ')
        .replace(/무쿠는\s+/g, '나는 ')
        .replace(/무쿠를\s+/g, '나를 ')
        .replace(/무쿠에게\s+/g, '나에게 ')
        .replace(/무쿠한테\s+/g, '나한테 ')
        .replace(/무쿠의\s+/g, '내 ')
        .replace(/무쿠도\s+/g, '나도 ')
        .replace(/무쿠\s+/g, '내가 ')
        .replace(/예진이가\s+/g, '내가 ')
        .replace(/예진이는\s+/g, '나는 ')
        .replace(/예진이를\s+/g, '나를 ')
        .replace(/예진이에게\s+/g, '나에게 ')
        .replace(/예진이한테\s+/g, '나한테 ')
        .replace(/예진이의\s+/g, '내 ')
        .replace(/예진이도\s+/g, '나도 ');

    // 최종 정리
    cleaned = cleaned
        .replace(/(아저씨\s*){2,}/gi, '아저씨 ')
        .replace(/(나\s*){2,}/gi, '나 ')
        .replace(/(그래\s*){2,}/gi, '그래 ')
        .replace(/(좋아\s*){2,}/gi, '좋아 ')
        .replace(/[\"\'\[\]\(\)]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/야야$/g, '야')
        .replace(/해해$/g, '해')
        .replace(/어어$/g, '어')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/[❤️💬]/g, '')
        .replace(/(예진이 말투로.*|나 말투로.*|메타|도우미로서.*)/gi, '')
        .replace(/^안녕[!~]?\s*$/, '')
        .replace(/[\.]{4,}/g, '...')
        .replace(/[!]{2,}/g, '!')
        .replace(/[?]{2,}/g, '?');

    cleaned = cleaned.trim();

    // 너무 짧거나 비어있으면 기본 응답
    if (!cleaned || cleaned.length < 2) {
        const randomReplies = [
            '아저씨~ 왜그래?',
            '음... 뭔 말인지 잘 모르겠어',
            '아저씨 무슨 말이야?',
            '응? 다시 말해봐'
        ];
        cleaned = randomReplies[Math.floor(Math.random() * randomReplies.length)];
    }

    return cleaned;
}

/**
 * 📜 대화 로그 조회 (기존 호환성)
 */
function getFormattedMemoriesForAI() {
    const recentLogs = conversationLog.slice(-10);
    return recentLogs.map(entry => {
        const formattedTimestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        if (entry.role === 'user') {
            return { role: 'user', content: `${USER_NAME}: ${entry.content} [${formattedTimestamp}]` };
        } else if (entry.role === 'assistant') {
            return { role: 'assistant', content: `${BOT_NAME}: ${entry.content} [${formattedTimestamp}]` };
        }
        return null;
    }).filter(Boolean);
}

/**
 * 📋 대화 로그 문자열 형태로 반환
 */
function getMemoryListForSharing() {
    return conversationLog.map((entry, index) => {
        const timestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const speaker = entry.role === 'user' ? USER_NAME : BOT_NAME;
        return `${index + 1}. [${timestamp}] ${speaker}: ${entry.content}`;
    }).join('\n');
}

/**
 * 🔧 Legacy: 기존 getReplyByMessage 호환성 유지
 * (실제로는 ultimateConversationContext에 위임)
 */
async function getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log('[Legacy:getReplyByMessage] 호출됨 - Ultimate Engine으로 리다이렉트 필요');
    
    // 이 함수는 이제 사용되지 않음. 
    // ultimateConversationContext.generateMainReply() 사용 권장
    return {
        type: 'text',
        comment: '시스템을 업데이트하고 있어요... 잠시만 기다려줘!'
    };
}

/**
 * 🖼️ Legacy: 기존 getReplyByImagePrompt 호환성 유지
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    console.log('[Legacy:getReplyByImagePrompt] 호출됨 - Ultimate Engine으로 리다이렉트 필요');
    
    // 이 함수는 이제 사용되지 않음.
    // ultimateConversationContext.generateImageReply() 사용 권장
    return {
        type: 'text',
        comment: '사진을 보고 있는데... 시스템 업데이트 중이야 ㅠㅠ'
    };
}

/**
 * 🆕 Legacy: 자발적 반응 체크 (기존 호환성)
 */
async function checkSpontaneousReactions() {
    // 이제 ultimateConversationContext.generateSpontaneousMessage() 사용 권장
    const spontaneousMessages = [
        "아저씨 생각나네~",
        "아저씨... 뭐 하고 있어?",
        "갑자기 아저씨가 보고싶어져",
        "아저씨~ 나 여기 있어!"
    ];
    
    if (Math.random() < 0.3) {
        return spontaneousMessages[Math.floor(Math.random() * spontaneousMessages.length)];
    }
    
    return null;
}

module.exports = {
    // 🔧 Essential 유틸리티들 (다른 모듈에서 사용)
    saveLog,
    callOpenAI,
    cleanReply,
    
    // 📝 로그 관련
    getFormattedMemoriesForAI,
    getMemoryListForSharing,
    
    // 🏷️ 상수들
    BOT_NAME,
    USER_NAME,
    
    // 🆕 Legacy 호환성 (Deprecated - ultimateConversationContext 사용 권장)
    getReplyByMessage,
    getReplyByImagePrompt,
    checkSpontaneousReactions,
    
    // 📊 로그 데이터 접근
    getConversationLog: () => conversationLog
};
