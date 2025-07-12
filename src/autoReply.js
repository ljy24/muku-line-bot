// ✅ autoReply.js v9.1 - "상호 학습 및 기억 고도화 연동 (완성본)"

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');

const BOT_NAME = '예진이';
const USER_NAME = '아저씨';

// ==================== 자동 기억 포착 시스템 ====================

const MEMORY_KEYWORDS = {
    USER_REQUEST: ['기억해줘', '기억해', '꼭 기억해', '잊지마', '잊지 말아줘', '이건 중요해', '이거 중요한', '꼭 알아둬', '기억할래', '이건 꼭', '절대 잊으면 안 돼', '평생 기억해'],
    MUKU_CONFIRM: ['꼭 기억할게', '절대 안 잊을게', '평생 기억할게', '이건 중요한 사실', '기억해둘게', '잊지 않을게', '이거 기억할게', '마음에 새길게']
};
const MEMORY_DELETE_KEYWORDS = ['잊어줘', '잊어', '기억 삭제', '기억 지워', '틀렸어', '잘못됐어', '아니야', '그게 아니야', '취소해', '지워줘', '없던 일로', '기억 취소', '잘못 기억', '다시 기억', '수정해'];
const MEMORY_UPDATE_KEYWORDS = ['수정해줘', '바꿔줘', '다시 기억해', '정정해', '고쳐줘', '아니라', '사실은', '정확히는', '바로잡을게'];
const IMPORTANT_CONTENT_PATTERNS = [ /(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)|(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}월\s*\d{1,2}일)/, /(생일|기념일|만난\s*날|사귄\s*날|첫\s*만남|첫\s*데이트)/, /(혈액형|키|몸무게|취미|좋아하는|싫어하는|알레르기)/, /(약속|계획|하기로\s*했|가기로\s*했|만나기로)/, /(사랑한다|좋아한다|미안하다|고마워|처음|마지막)/ ];

async function detectAndProcessMemoryRequest(userMessage, isFromMuku = false) {
    const lowerMessage = userMessage.toLowerCase();
    const hasMemoryKeyword = MEMORY_KEYWORDS.USER_REQUEST.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
    const hasMukuConfirm = MEMORY_KEYWORDS.MUKU_CONFIRM.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
    const hasImportantContent = IMPORTANT_CONTENT_PATTERNS.some(pattern => pattern.test(userMessage));
    let shouldSaveMemory = false;
    let memoryContent = '';
    let responseMessage = '';

    if (hasMemoryKeyword && !isFromMuku) {
        shouldSaveMemory = true;
        memoryContent = userMessage.replace(/기억해줘|기억해|꼭 기억해|잊지마|잊지 말아줘/gi, '').replace(/이건|이거|그거|그걸/gi, '').trim();
        responseMessage = getMemoryConfirmResponse();
    } else if (hasMukuConfirm && isFromMuku) {
        const recentUserMessage = getLastUserMessage();
        if (recentUserMessage && hasImportantContent) {
            shouldSaveMemory = true;
            memoryContent = recentUserMessage;
        }
    } else if (hasImportantContent && userMessage.length > 10) {
        shouldSaveMemory = true;
        memoryContent = userMessage;
        responseMessage = getAutoMemoryResponse();
    }

    if (shouldSaveMemory && memoryContent.length > 5) {
        const success = await conversationContext.addUserMemory(memoryContent);
        if (success) {
            console.log(`[Memory] ✅ yejin_memory.json에 자동 기억 저장: ${memoryContent.substring(0, 50)}...`);
            return { saved: true, content: memoryContent, response: responseMessage };
        }
    }
    return { saved: false, content: '', response: '' };
}

async function detectAndProcessMemoryEdit(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const hasDeleteKeyword = MEMORY_DELETE_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
    const hasUpdateKeyword = MEMORY_UPDATE_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));

    if (hasDeleteKeyword) {
        let queryToDelete = userMessage;
        MEMORY_DELETE_KEYWORDS.forEach(keyword => { queryToDelete = queryToDelete.replace(new RegExp(keyword, 'gi'), ''); });
        queryToDelete = queryToDelete.replace(/[""'']/g, '').trim();
        if (queryToDelete.length > 2) {
            const result = await conversationContext.deleteUserMemory(queryToDelete);
            return { processed: true, type: 'delete', result: { success: result.success, message: result.success ? getDeleteConfirmResponse(result.deletedContent) : result.message } };
        }
    } else if (hasUpdateKeyword) {
        let oldContent = '';
        let newContent = '';
        const patterns = [
            /(.+?)\s*(아니라|아니고)\s*(.+)/,
            /(.+?)\s*를?\s*(.+?)\s*로?\s*(수정|바꿔|고쳐)/,
            /(사실은|정확히는)\s*(.+)/,
        ];
        for (const pattern of patterns) {
            const match = userMessage.match(pattern);
            if (match) {
                if (pattern === patterns[0]) {
                    oldContent = match[1].trim();
                    newContent = match[3].trim();
                } else if (pattern === patterns[1]) {
                    oldContent = match[1].trim();
                    newContent = match[2].trim();
                } else if (pattern === patterns[2]) {
                    const recentMemories = conversationContext.getYejinMemories();
                    if (recentMemories.length > 0) {
                        oldContent = recentMemories[recentMemories.length - 1].content;
                        newContent = match[2].trim();
                    }
                }
                break;
            }
        }
        if (oldContent && newContent) {
            const deleteResult = await conversationContext.deleteUserMemory(oldContent);
            if (deleteResult.success) {
                const addResult = await conversationContext.addUserMemory(newContent);
                if (addResult) {
                    return { processed: true, type: 'update', result: { success: true, message: getUpdateConfirmResponse(deleteResult.deletedContent, newContent) } };
                }
            }
            return { processed: true, type: 'update', result: { success: false, message: "기억을 수정하는데 실패했어요. 다시 시도해주세요. 😅" } };
        }
    }
    return { processed: false };
}

function getMemoryConfirmResponse() {
    const responses = ["응, 이건 평생 잊지 않고 꼭 기억할게! 💕", "알았어, 아저씨! 이거 정말 중요하니까 마음 깊이 새겨둘게 ❤️", "응응, 절대 안 잊을게! 우리의 소중한 기억이야 🥰", "이건 정말 중요한 얘기네! 꼭꼭 기억해둘게, 아저씨", "알겠어! 이 말은 내 마음 속 깊은 곳에 영원히 간직할게 💝", "응, 기억했어! 아저씨가 중요하다고 한 건 절대 잊지 않을 거야", "이거 진짜 소중한 얘기다! 평생 기억할게, 약속! 🤞", "아저씨의 말 하나하나가 다 소중해. 이것도 꼭 기억할게! ✨"];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getAutoMemoryResponse() {
    const responses = ["어? 이거 중요한 얘기 같은데... 내가 기억해둘게! 📝", "이런 얘기는 꼭 기억해둬야지! 마음에 새겨뒀어 ❤️", "앗, 이거 잊으면 안 되겠다! 기억 목록에 추가! ✅", "이런 소중한 얘기를 놓칠 뻔했네! 잘 기억해뒀어 💕", "우와, 이거 정말 기억할 만한 얘기네! 꼭꼭 간직할게 🥰"];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getDeleteConfirmResponse(deletedContent) {
    const responses = [`응, "${deletedContent}" 이거 지웠어! 이제 기억 안 할게 💭`, `알겠어! "${deletedContent}" 잊었어! 없던 일로 할게 😊`, `"${deletedContent}" 기억에서 삭제 완료! 깔끔하게 지웠어 ✨`, `응응, 그 얘기는 이제 기억 안 할게! "${deletedContent}" 지웠어 🗑️`, `"${deletedContent}" 완전히 잊었어! 아저씨가 지우라고 했으니까 💕`];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getUpdateConfirmResponse(oldContent, newContent) {
    const responses = [`알겠어! "${oldContent}" 지우고 "${newContent}" 로 다시 기억할게! 💕`, `응, 수정했어! 이제 "${newContent}" 로 기억할게, 아저씨 ✨`, `"${oldContent}" 는 틀렸구나! "${newContent}" 가 맞는 거네, 고쳤어! 😊`, `알겠어! "${newContent}" 로 정정해서 기억해뒀어! 👍`, `응응, "${oldContent}" 대신 "${newContent}" 로 바꿔뒀어! 완벽! ✅`];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getLastUserMessage() {
    const state = conversationContext.getInternalState();
    const userMessages = state.recentMessages.filter(msg => msg.speaker === '아저씨');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1].message : '';
}

async function searchAndConfirmMemory(query) {
    const foundMemory = conversationContext.searchFixedMemory(query);
    if (foundMemory) {
        const responses = [`응, 기억해! "${foundMemory}" 이거 말하는 거지? 💕`, `당연히 기억하고 있어! "${foundMemory}" 잊을 리가 없잖아 ❤️`, `어떻게 잊겠어! "${foundMemory}" 이거 완전 중요한 기억이야 🥰`, `물론 기억해! "${foundMemory}" 아저씨가 말해준 거 하나도 안 잊었어 ✨`];
        return responses[Math.floor(Math.random() * responses.length)];
    } else {
        const responses = ["어? 그런 얘기 했었나? 기억이 잘 안 나는데... 다시 말해줄래? 🤔", "음... 그 얘기는 기억이 좀 희미하네. 다시 한 번 얘기해줄 수 있어? 💭", "아, 미안! 그 부분은 기억이 잘 안 나... 다시 알려줄래? 😅"];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

async function handlePhotoReaction(userReaction) {
    conversationContext.clearPendingAction();
    const lowerReaction = userReaction.toLowerCase();
    let reactionType = 'neutral';
    if (['예쁘네', '이쁘다', '잘나왔네', '귀여워'].some(kw => lowerReaction.includes(kw))) reactionType = 'positive';
    else if (['못생겼네', '별로', '이상해'].some(kw => lowerReaction.includes(kw))) reactionType = 'negative';
    let prompt;
    if (reactionType === 'positive') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 칭찬해줬어. 기쁘고, 살짝 부끄럽거나, 새침한 말투로 짧게 반응해줘.`;
    } else if (reactionType === 'negative') {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 장난스럽게 놀렸어. 장난스럽게 발끈하거나, 삐지거나, "뭐? 임마? 죽을래?" 같은 살짝 거친 애교로 짧게 반응해줘.`;
    } else {
        prompt = `너는 여자친구 예진이야. 방금 아저씨에게 셀카를 보냈는데, 아저씨가 "${userReaction}"이라고 애매하게 반응했어. "그래서 예쁘다는 거야, 아니라는 거야?" 처럼 반응을 유도하는 질문을 짧게 해줘.`;
    }
    const rawReply = await callOpenAI([{ role: 'system', content: prompt }], 'gpt-4o', 100, 0.95);
    return { type: 'text', comment: cleanReply(rawReply) };
}

async function getReplyByMessage(userMessage) {
    // [LEVEL 1] 아저씨 메시지에서 말투 학습 및 대화 기록
    await conversationContext.learnFromUserMessage(userMessage);
    await conversationContext.addUltimateMessage(USER_NAME, userMessage);

    // 1. 기억 삭제/수정 처리
    const editResult = await detectAndProcessMemoryEdit(userMessage);
    if (editResult.processed) {
        return { type: 'text', comment: editResult.result.message };
    }
    
    // 2. 기억 저장 처리
    const memoryResult = await detectAndProcessMemoryRequest(userMessage, false);
    if (memoryResult.saved && memoryResult.response) {
        return { type: 'text', comment: memoryResult.response };
    }
    
    // 3. 기억 검색 처리
    const isMemoryQuery = userMessage.includes('기억했어') || userMessage.includes('기억하고 있어') || userMessage.includes('기억나');
    if (isMemoryQuery) {
        const searchQuery = userMessage.replace(/기억했어|기억하고 있어|기억나|\?|\？/gi, '').trim();
        if (searchQuery.length > 2) {
            const memoryResponse = await searchAndConfirmMemory(searchQuery);
            return { type: 'text', comment: memoryResponse };
        }
    }
    
    // 4. 사진 반응 처리
    const pendingAction = conversationContext.getPendingAction();
    if (pendingAction && pendingAction.type === 'awaiting_photo_reaction') {
        return await handlePhotoReaction(userMessage);
    }
    
    // 5. 일반 응답 생성
    const baseSystemPrompt = `너는 아저씨의 귀여운 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답하며, 절대로 3인칭으로 말하지 마. 길게 설명하지 말고 1~3 문장으로 짧고 친근하게 대답해.`;
    const finalSystemPrompt = conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        const finalReply = cleanReply(rawReply);
        
        // AI가 답변을 생성한 후, 스스로 학습 및 대화 기록
        await conversationContext.learnFromConversation(finalReply);
        await conversationContext.addUltimateMessage(BOT_NAME, finalReply);

        return { type: 'text', comment: finalReply };
    } catch (error) {
        console.error("OpenAI API 호출 중 에러 발생:", error);
        return { type: 'text', comment: '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ' };
    }
}

module.exports = {
    getReplyByMessage,
    handlePhotoReaction,
    detectAndProcessMemoryRequest,
    detectAndProcessMemoryEdit,
    searchAndConfirmMemory,
    BOT_NAME,
    USER_NAME,
};
