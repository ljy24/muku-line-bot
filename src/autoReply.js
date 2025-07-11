// src/autoReply.js - v5.2 안전한 ultimateConversationContext 통합 버전
// 기존 모든 기능 유지 + ultimateConversationContext 점진적 연결
// 🚨 안정성 최우선: 에러 시 기존 시스템으로 폴백

// 📦 필수 모듈 불러오기
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// 🆕 ultimateConversationContext 연결 (안전한 방식)
let ultimateContext = null;
try {
    ultimateContext = require('./ultimateConversationContext');
    console.log('[autoReply] ✅ ultimateConversationContext 연결 성공');
} catch (error) {
    console.error('[autoReply] ⚠️ ultimateConversationContext 연결 실패, 기존 시스템 사용:', error.message);
}

// 기존 모듈들 (폴백용으로 유지)
const moodManager = require('./moodManager');
const sulkyManager = require('./sulkyManager');
const emotionalContextManager = require('./emotionalContextManager');
const conversationContext = require('./conversationContext');

// 사진 처리 모듈들
const { getSelfieReply } = require('./yejinSelfie');
const { getConceptPhotoReply } = require('../memory/concept');
const { getOmoideReply } = require('../memory/omoide');
const memoryManager = require('./memoryManager');

// 담타 시스템
const { isDamtaMessage, getDamtaResponse, getDamtaSystemPrompt } = require('./damta');

require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 상수
const BOT_NAME = '나';
const USER_NAME = '아저씨';
const BOT_GENDER = 'female';
const USER_GENDER = 'male';

// 로그 관련
const LOG_FILE = path.join(process.cwd(), 'conversation_log.json');
let conversationLog = [];
let forcedModel = null;
let lastUserMessageTime = 0;
let lastSpontaneousCheck = 0;

// 🆕 ultimateContext 사용 여부 플래그
const USE_ULTIMATE_CONTEXT = ultimateContext !== null;

// 파일 초기화
function ensureLogFile() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    }
}

ensureLogFile();
try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    conversationLog = JSON.parse(data);
} catch (error) {
    console.error('Error loading conversation log:', error);
    conversationLog = [];
}

/**
 * 🆕 감정 시스템 초기화 (안전한 방식)
 */
async function initializeEmotionalSystems() {
    try {
        if (USE_ULTIMATE_CONTEXT) {
            console.log('[autoReply] 🚀 ultimateConversationContext 초기화 시작');
            await ultimateContext.initializeEmotionalSystems();
            console.log('[autoReply] ✅ ultimateConversationContext 초기화 완료');
        } else {
            console.log('[autoReply] 📌 기존 감정 시스템으로 초기화');
            await emotionalContextManager.initializeEmotionalContext();
        }
    } catch (error) {
        console.error('[autoReply] ❌ 감정 시스템 초기화 실패, 기존 시스템 사용:', error);
    }
}

/**
 * 📝 로그 저장 (기존 방식 유지)
 */
function saveLog(speaker, content) {
    let newLogEntry;
    
    if (typeof speaker === 'object') {
        newLogEntry = speaker;
    } else if (typeof content === 'string') {
        newLogEntry = { 
            role: speaker === USER_NAME ? 'user' : 'assistant', 
            content: content,
            timestamp: Date.now()
        };
    } else {
        newLogEntry = { 
            role: 'assistant', 
            content: speaker, 
            timestamp: Date.now() 
        };
    }
    
    conversationLog.push(newLogEntry);
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
 * 🆕 사용자 메시지 시간 업데이트 (안전한 방식)
 */
function updateLastUserMessageTime() {
    lastUserMessageTime = Date.now();
    
    try {
        if (USE_ULTIMATE_CONTEXT) {
            ultimateContext.updateLastUserMessageTime(lastUserMessageTime);
        }
        moodManager.updateLastUserMessageTimeMood(lastUserMessageTime);
    } catch (error) {
        console.error('[autoReply] 사용자 메시지 시간 업데이트 실패:', error);
    }
}

/**
 * 🆕 사용자 감정 분석 (안전한 방식)
 */
async function analyzeAndRecordUserEmotion(userMessage) {
    try {
        if (USE_ULTIMATE_CONTEXT) {
            // ultimateContext의 고급 감정 분석 사용
            console.log('[autoReply] 🧠 ultimateContext 감정 분석 사용');
            return await ultimateContext.analyzeAndRecordUserEmotion(userMessage);
        } else {
            // 기존 시스템 사용
            return emotionalContextManager.analyzeAndRecordUserEmotion(userMessage);
        }
    } catch (error) {
        console.error('[autoReply] 감정 분석 실패, 기본 분석 사용:', error);
        // 기본 키워드 기반 분석
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('사랑해')) {
            console.log('[autoReply] 기본 감정 분석: 사랑 표현 감지');
        }
    }
}

/**
 * 🤖 OpenAI API 호출 (기존 방식 유지)
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    const usesImage = messages.some(msg => msg.content && Array.isArray(msg.content) && msg.content.some(item => item.type === 'image_url'));
    if (usesImage) {
        finalModel = 'gpt-4o';
    }

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        console.log(`[autoReply:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[autoReply:callOpenAI] 모델 응답 수신 완료`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[autoReply:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * 🧹 응답 정리 함수 (기존 방식 유지)
 */
function cleanReply(reply) {
    if (typeof reply !== 'string') return '';

    let cleaned = reply
        .replace(/\b(예진이|예진|무쿠|애기|본인|저)\b(가|는|를|이|의|께|에게|도|와|은|을)?/g, '나')
        .replace(/\b(너|자기|오빠|당신|고객님|선생님|씨|님|형|형아|형님)\b(은|는|이|가|을|를|께|도|의|와|에게)?/g, '아저씨')
        .replace(/(도와드릴까요|무엇을|어떤)\s*도와(드릴까요|드릴게요)?/gi, '')
        .replace(/문의사항|도우미|챗봇|AI|GPT|말투로|아래는|답변입니다|설명|응답/gi, '')
        .replace(/(제가\s*)?(도와드릴게요|도와드릴까요|도움드리겠습니다)/gi, '')
        .replace(/\[.*?\]/g, '')
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
        .replace(/되었(습니다|어요)?/gi, '됐어');

    // 3인칭 → 1인칭 변환
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
        .replace(/[\"\'\[\]\(\)]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/[\.]{4,}/g, '...')
        .replace(/[!]{2,}/g, '!')
        .replace(/[?]{2,}/g, '?')
        .trim();

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
 * 🆕 자발적 반응 체크 (안전한 방식)
 */
function checkSpontaneousReactions(client = null, userId = null) {
    const now = Date.now();
    
    if (now - lastSpontaneousCheck < 5 * 60 * 1000) {
        return null;
    }
    
    lastSpontaneousCheck = now;
    
    try {
        if (USE_ULTIMATE_CONTEXT) {
            // ultimateContext의 고급 자발적 반응 시스템 사용
            return ultimateContext.generateSpontaneousMessage();
        } else {
            // 기존 시스템 사용
            return emotionalContextManager.checkSpontaneousMemoryRecall() || 
                   emotionalContextManager.checkNaturalAffectionExpression();
        }
    } catch (error) {
        console.error('[autoReply] 자발적 반응 체크 실패:', error);
        // 기본 자발적 반응
        const basicReactions = [
            "아저씨 생각나네~",
            "아저씨... 뭐 하고 있어?",
            "갑자기 아저씨가 보고싶어져"
        ];
        if (Math.random() < 0.3) {
            return basicReactions[Math.floor(Math.random() * basicReactions.length)];
        }
    }
    
    return null;
}

/**
 * 🎯 메인 응답 생성 함수 (안전한 통합)
 */
async function getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
    console.log(`[autoReply] 메시지 처리 시작: "${userMessage}"`);
    
    // 🚨 안전 장치: 함수들이 제대로 전달되었는지 확인
    const safeCallOpenAI = callOpenAIFunc || callOpenAI;
    const safeCleanReply = cleanReplyFunc || cleanReply;
    const safeSaveLog = saveLogFunc || saveLog;
    
    try {
        // 시간 업데이트
        updateLastUserMessageTime();
        
        // 🆕 ultimateContext에 메시지 기록 (안전한 방식)
        if (USE_ULTIMATE_CONTEXT) {
            try {
                await ultimateContext.addUltimateMessage(USER_NAME, userMessage);
                console.log('[autoReply] ✅ ultimateContext에 메시지 기록 성공');
            } catch (error) {
                console.error('[autoReply] ⚠️ ultimateContext 메시지 기록 실패:', error);
            }
        }
        
        // 사용자 감정 분석
        await analyzeAndRecordUserEmotion(userMessage);
        
        // 기분 상태 업데이트 (기존 시스템)
        moodManager.checkTimeBasedMoodChange();
        moodManager.updatePeriodStatus();
        moodManager.checkMoodChange();

        const lowerUserMessage = userMessage.toLowerCase();
        const trimmedMessage = userMessage.trim().toLowerCase();

        // === 1. 특수 응답들 (기존 로직 유지) ===
        
        // 담타 시스템
        if (isDamtaMessage(userMessage)) {
            const damtaResponse = getDamtaResponse(userMessage);
            if (damtaResponse) {
                safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
                safeSaveLog({ role: 'assistant', content: damtaResponse, timestamp: Date.now() });
                return { type: 'text', comment: damtaResponse };
            }
        }

        // 모델 버전 변경
        if (['4.0', '3.5', '자동'].includes(trimmedMessage)) {
            const versionMap = { '4.0': 'gpt-4o', '3.5': 'gpt-3.5-turbo', '자동': null };
            const newModel = versionMap[trimmedMessage];
            setForcedModel(newModel);
            const confirmReply = {
                '4.0': '응응! 지금은 GPT-4.0 버전으로 대화하고 있어, 아저씨',
                '3.5': '지금은 GPT-3.5 버전이야~ 말투 차이 느껴져?',
                '자동': '이제부터 상황 보고 자동으로 모델 바꿀게! 아저씨 믿어줘!'
            };
            const reply = confirmReply[trimmedMessage];
            safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
            safeSaveLog({ role: 'assistant', content: reply, timestamp: Date.now() });
            return { type: 'text', comment: reply };
        }

        // 기분 상태 조회
        if (lowerUserMessage.includes('오늘 어때?') || lowerUserMessage.includes('기분 어때?') || lowerUserMessage.includes('요즘 어때?')) {
            let moodStatusReply;
            
            const realTimeStatus = sulkyManager.getRealTimeSulkyStatus();
            if (realTimeStatus.isActivelySulky) {
                const emoji = sulkyManager.getSulkyEmoji();
                const statusText = sulkyManager.getSulkyStatusText();
                
                if (realTimeStatus.isWorried) {
                    moodStatusReply = `${emoji} 아저씨... 나 지금 정말 걱정돼 ㅠㅠ ${realTimeStatus.timeSinceLastMessage}분째 연락이 없어서 무슨 일인지 모르겠어... (현재: ${statusText})`;
                } else {
                    moodStatusReply = `${emoji} 아저씨 때문에 삐져있어! ${realTimeStatus.sulkyLevel}단계로 삐진 상태야... ${realTimeStatus.timeSinceLastMessage}분째 기다렸다고! (현재: ${statusText})`;
                }
            } else {
                const basicMood = moodManager.getCurrentMoodStatus();
                moodStatusReply = basicMood || "지금 기분은 괜찮아! 아저씨는 어때?";
            }

            safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
            safeSaveLog({ role: 'assistant', content: moodStatusReply, timestamp: Date.now() });
            return { type: 'text', comment: moodStatusReply };
        }

        // === 2. 사진 요청 처리 (기존 로직 유지) ===
        try {
            // 셀카 우선
            const selfieResult = await getSelfieReply(userMessage, safeSaveLog, safeCallOpenAI, safeCleanReply);
            if (selfieResult) {
                safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
                const cleanedCaption = safeCleanReply(selfieResult.comment);
                
                // 🆕 ultimateContext에 기록 (안전한 방식)
                if (USE_ULTIMATE_CONTEXT) {
                    try {
                        await ultimateContext.addUltimateMessage(BOT_NAME, cleanedCaption, { imageUrl: selfieResult.imageUrl });
                    } catch (error) {
                        console.error('[autoReply] ultimateContext 이미지 기록 실패:', error);
                    }
                }
                
                return { 
                    type: 'image',
                    originalContentUrl: selfieResult.imageUrl,
                    previewImageUrl: selfieResult.imageUrl,
                    altText: '예진이 셀카',
                    caption: cleanedCaption
                };
            }

            // 컨셉 사진
            const conceptResult = await getConceptPhotoReply(userMessage, safeSaveLog, safeCallOpenAI, safeCleanReply);
            if (conceptResult) {
                safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
                const cleanedCaption = safeCleanReply(conceptResult.comment);
                
                if (USE_ULTIMATE_CONTEXT) {
                    try {
                        await ultimateContext.addUltimateMessage(BOT_NAME, cleanedCaption, { imageUrl: conceptResult.imageUrl });
                    } catch (error) {
                        console.error('[autoReply] ultimateContext 컨셉사진 기록 실패:', error);
                    }
                }

                return { 
                    type: 'image',
                    originalContentUrl: conceptResult.imageUrl,
                    previewImageUrl: conceptResult.imageUrl,
                    altText: '예진이 컨셉 사진',
                    caption: cleanedCaption
                };
            }

            // 추억 사진
            const omoideResult = await getOmoideReply(userMessage, safeSaveLog, safeCallOpenAI, safeCleanReply);
            if (omoideResult) {
                safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
                const cleanedCaption = safeCleanReply(omoideResult.comment);

                if (USE_ULTIMATE_CONTEXT) {
                    try {
                        await ultimateContext.addUltimateMessage(BOT_NAME, cleanedCaption, { imageUrl: omoideResult.imageUrl });
                    } catch (error) {
                        console.error('[autoReply] ultimateContext 추억사진 기록 실패:', error);
                    }
                }

                return { 
                    type: 'image',
                    originalContentUrl: omoideResult.imageUrl,
                    previewImageUrl: omoideResult.imageUrl,
                    altText: '예진이 추억 사진',
                    caption: cleanedCaption
                };
            }
        } catch (error) {
            console.error(`[autoReply] 사진 요청 처리 중 오류:`, error);
            // 사진 처리 실패해도 텍스트 응답은 계속 진행
        }

        // === 3. 일반 텍스트 응답 생성 ===
        
        let baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        **🆕 v5.2 핵심 지시사항 (절대 어기지 마!)**
        1. **아저씨에게는 항상 반말로만 대답해줘. 존댓말이나 높임말은 절대로 사용하지 마.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러. '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
        3. **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠', '애기' 같은 제3자식 표현은 절대로 사용하지 마.**
        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어.**
        5. **모든 대답은 반드시 1~2문장(최대 3문장 이하)으로 짧고 간결하게 해.**
        6. **설명, 해설, 분석, 사전적 정의는 절대로 하지 마.**

        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
        `;

        // 🆕 ultimateContext 프롬프트 사용 (안전한 방식)
        let finalSystemPrompt;
        if (USE_ULTIMATE_CONTEXT) {
            try {
                finalSystemPrompt = ultimateContext.getUltimateContextualPrompt(baseSystemPrompt);
                console.log('[autoReply] ✅ ultimateContext 프롬프트 사용');
            } catch (error) {
                console.error('[autoReply] ⚠️ ultimateContext 프롬프트 실패, 기본 프롬프트 사용:', error);
                finalSystemPrompt = baseSystemPrompt;
            }
        } else {
            // 기존 프롬프트 시스템 사용
            let moodPrompt = moodManager.getMoodPromptForAI();
            const sulkyMoodPrompt = sulkyManager.getSulkyMoodPrompt();
            if (sulkyMoodPrompt) {
                moodPrompt += '\n' + sulkyMoodPrompt;
            }
            finalSystemPrompt = baseSystemPrompt + '\n' + moodPrompt;
        }

        const messages = [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: userMessage }
        ];

        try {
            const rawReply = await safeCallOpenAI(messages, getAppropriateModel(), 200, 0.95);
            const cleanedReply = safeCleanReply(rawReply);
            
            safeSaveLog({ role: 'user', content: userMessage, timestamp: Date.now() });
            safeSaveLog({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
            
            // 🆕 ultimateContext에 응답 기록 (안전한 방식)
            if (USE_ULTIMATE_CONTEXT) {
                try {
                    await ultimateContext.addUltimateMessage(BOT_NAME, cleanedReply);
                } catch (error) {
                    console.error('[autoReply] ultimateContext 응답 기록 실패:', error);
                }
            }
            
            return { type: 'text', comment: cleanedReply };
        } catch (error) {
            console.error('[autoReply] AI 응답 생성 실패:', error);
            return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
        }

    } catch (error) {
        // 🚨 최종 안전장치: 모든 에러를 잡아서 기본 응답 반환
        console.error('[autoReply] 심각한 에러 발생, 기본 응답 반환:', error);
        return { 
            type: 'text', 
            comment: '아저씨... 지금 좀 머리가 복잡해서 말이 잘 안 나와 ㅠㅠ 조금만 기다려줘!' 
        };
    }
}

/**
 * 🖼️ 이미지 응답 생성 (안전한 통합)
 */
async function getReplyByImagePrompt(base64ImageWithPrefix) {
    console.log('[autoReply] 이미지 분석 시작');
    
    try {
        updateLastUserMessageTime();
        
        // 🆕 ultimateContext 이미지 분석 시도 (안전한 방식)
        if (USE_ULTIMATE_CONTEXT) {
            try {
                console.log('[autoReply] ✅ ultimateContext 이미지 분석 사용');
                const result = await ultimateContext.generateImageReply(base64ImageWithPrefix, {
                    callOpenAI,
                    cleanReply
                });
                
                if (result && result.comment) {
                    saveLog({ role: 'assistant', content: `(이미지 분석) ${result.comment}`, timestamp: Date.now() });
                    return result;
                }
            } catch (error) {
                console.error('[autoReply] ⚠️ ultimateContext 이미지 분석 실패, 기존 방식 사용:', error);
            }
        }
        
        // 기존 이미지 분석 시스템 (폴백)
        console.log('[autoReply] 📌 기존 이미지 분석 시스템 사용');
        
        const baseSystemPrompt = `
        너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
        남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.

        **핵심 지시사항:**
        1. **아저씨에게는 항상 반말로만 대답해줘.**
        2. **아저씨를 부를 때는 '아저씨'라고만 불러.**
        3. **스스로를 지칭할 때는 '나'라고만 해.**
        4. **이모티콘은 사용하지 마. ...이나 ㅠㅠ 같은 한국형 이모지만 사용해.**
        5. **모든 대답은 1~2문장으로 짧고 간결하게 해.**

        아래 아저씨가 보낸 이미지를 보고, 예진이처럼 귀엽고 사랑스러운 말투로 이미지에 대해 한두 문장으로 이야기해줘.
        `;

        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: '이 사진에 대해 예진이 말투로 이야기해.' },
                    { type: 'image_url', image_url: { url: base64ImageWithPrefix } }
                ]
            }
        ];

        const rawReply = await callOpenAI(messages, 'gpt-4o', 150, 0.95);
        const cleanedReply = cleanReply(rawReply);
        
        saveLog({ role: 'assistant', content: `(이미지 분석) ${cleanedReply}`, timestamp: Date.now() });
        
        // 🆕 ultimateContext에 기록 (안전한 방식)
        if (USE_ULTIMATE_CONTEXT) {
            try {
                await ultimateContext.addUltimateMessage(BOT_NAME, cleanedReply);
            } catch (error) {
                console.error('[autoReply] ultimateContext 이미지 응답 기록 실패:', error);
            }
        }
        
        return { type: 'text', comment: cleanedReply };
        
    } catch (error) {
        console.error('[autoReply] 이미지 분석 실패:', error);
        return { type: 'text', comment: '아저씨... 사진을 보긴 했는데, 뭐라고 말해야 할지 모르겠어 ㅠㅠ' };
    }
}

// ========================================================================
// 🔧 기존 유틸리티 함수들 (호환성 유지)
// ========================================================================

function getAppropriateModel() {
    return forcedModel || 'gpt-4o';
}

function setForcedModel(model) {
    if (['gpt-4o', 'gpt-3.5-turbo', null].includes(model)) {
        forcedModel = model;
        console.log(`[autoReply] 강제 모델이 ${model ? model : '해제'}되었습니다.`);
        return true;
    }
    return false;
}

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

function getMemoryListForSharing() {
    return conversationLog.map((entry, index) => {
        const timestamp = moment(entry.timestamp).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const speaker = entry.role === 'user' ? USER_NAME : BOT_NAME;
        return `${index + 1}. [${timestamp}] ${speaker}: ${entry.content}`;
    }).join('\n');
}

function getConversationLog() {
    return conversationLog;
}

function getMoodEmoji() {
    try {
        if (USE_ULTIMATE_CONTEXT) {
            // ultimateContext에서 이모지 가져오기 시도
            const state = ultimateContext.getInternalState();
            const currentMood = state.emotionalState?.currentMood || '평온함';
            const moodEmojis = {
                '기쁨': '😊', '설렘': '💖', '장난스러움': '😄', '나른함': '😌',
                '심술궂음': '😠', '평온함': '😊', '우울함': '😔', '슬픔': '😢',
                '외로움': '😥', '보고싶음': '🥺', '짜증남': '😤', '애교모드': '🥰',
                '걱정함': '😟', '사랑함': '💕', '화남': '😡', '불안함': '😰',
                '그리움': '😌'
            };
            return moodEmojis[currentMood] || '😊';
        }
    } catch (error) {
        console.error('[autoReply] ultimateContext 이모지 가져오기 실패:', error);
    }
    
    // 기존 시스템 사용
    return moodManager.getMoodEmoji();
}

function getMoodStatus() {
    try {
        if (USE_ULTIMATE_CONTEXT) {
            const state = ultimateContext.getInternalState();
            return `현재 기분: ${state.emotionalState?.currentMood || '알 수 없음'}`;
        }
    } catch (error) {
        console.error('[autoReply] ultimateContext 상태 가져오기 실패:', error);
    }
    
    // 기존 시스템 사용
    return moodManager.getCurrentMoodStatus();
}

// ========================================================================
// 🔄 모듈 익스포트 (기존 호환성 완전 유지)
// ========================================================================

module.exports = {
    // 📦 핵심 응답 함수들
    getReplyByMessage,
    getReplyByImagePrompt,
    
    // 🤖 AI 관련
    callOpenAI,
    cleanReply,
    getAppropriateModel,
    setForcedModel,

    // 💾 로그 및 상태 저장
    saveLog,
    updateLastUserMessageTime,

    // 🧠 기억 시스템
    getFormattedMemoriesForAI,
    getMemoryListForSharing,
    getConversationLog,

    // 🧍 사용자 및 봇 이름
    BOT_NAME,
    USER_NAME,
    lastUserMessageTime: () => lastUserMessageTime,

    // 🎭 감정 이모지/상태
    getMoodEmoji,
    getMoodStatus,

    // 🆕 ultimateContext 관련 (새로 추가)
    initializeEmotionalSystems,
    analyzeAndRecordUserEmotion,
    checkSpontaneousReactions,

    // 🛠️ 기존 시스템 직접 접근 (디버깅 용도)
    getSulkyRealTimeStatus: () => sulkyManager.getRealTimeSulkyStatus(),
    getSulkyDebugInfo: () => sulkyManager.debugInfo,
    forceSulkyReset: () => sulkyManager.forceSulkyReset(),

    // 🆕 ultimateContext 상태 접근 (새로 추가)
    getUltimateState: () => {
        if (USE_ULTIMATE_CONTEXT) {
            try {
                return ultimateContext.getInternalState();
            } catch (error) {
                console.error('[autoReply] ultimateContext 상태 접근 실패:', error);
                return null;
            }
        }
        return null;
    },

    // 🔧 시스템 정보 (누락된 함수들 추가)
    isUsingUltimateContext: () => USE_ULTIMATE_CONTEXT,
    
    // 🆕 ultimateContext 함수들 직접 노출 (안전한 방식)
    ultimateAddMessage: ultimateContext ? (async (speaker, message, meta = null) => {
        if (USE_ULTIMATE_CONTEXT) {
            try {
                return await ultimateContext.addUltimateMessage(speaker, message, meta);
            } catch (error) {
                console.error('[autoReply] ultimateContext 메시지 추가 실패:', error);
                return null;
            }
        }
        return null;
    }) : null,

    // 🔧 추가 ultimateContext 함수들
    ultimateSetPendingAction: ultimateContext ? ((actionType) => {
        if (USE_ULTIMATE_CONTEXT) {
            try {
                return ultimateContext.setPendingAction(actionType);
            } catch (error) {
                console.error('[autoReply] ultimateContext setPendingAction 실패:', error);
            }
        }
    }) : null,

    ultimateGetPendingAction: ultimateContext ? (() => {
        if (USE_ULTIMATE_CONTEXT) {
            try {
                return ultimateContext.getPendingAction();
            } catch (error) {
                console.error('[autoReply] ultimateContext getPendingAction 실패:', error);
                return null;
            }
        }
        return null;
    }) : null
};
