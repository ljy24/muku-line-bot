// src/memoryHandler.js (가상 파일)

// autoReply에서 필요한 함수들을 직접 가져와서 사용
// const { callOpenAI, cleanReply } = require('./autoReply'); // 필요시 여기에 import

async function handleMemoryCommand(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) { // 인자 추가
    const lowerCaseMessage = userMessage.toLowerCase();

    // 예시: "내 기억 보여줘"
    if (lowerCaseMessage.includes('내 기억 보여줘') || lowerCaseMessage.includes('나의 기억')) {
        // memoryManager를 통한 기억 조회 로직
        // const memories = await memoryManager.getFormattedMemoriesForAI(); // memoryManager import 필요
        // let replyText = "아직 기억나는 게 별로 없어 ㅠㅠ";
        // if (memories && memories.length > 0) {
        //     replyText = "아저씨랑 나눈 대화 중에 기억나는 건 이 정도야:\n" + memories.map(m => m.content).join('\n');
        // }
        // saveLogFunc({ role: 'assistant', content: replyText, timestamp: Date.now() });
        // return { type: 'text', comment: replyText };

        // 이 부분에서 OpenAI 호출이 필요하다면 callOpenAIFunc와 cleanReplyFunc를 사용할 수 있습니다.
        const systemPrompt = `아저씨가 '내 기억 보여줘'라고 했어. 아저씨와 함께한 소중한 기억들에 대해 예진이 말투로 1~2문장으로 사랑스럽게 이야기해줘.`;
        try {
            const rawReply = await callOpenAIFunc([{ role: 'system', content: systemPrompt }], 'gpt-4o', 100, 1.0);
            const cleanedReply = cleanReplyFunc(rawReply);
            saveLogFunc({ role: 'assistant', content: cleanedReply, timestamp: Date.now() });
            return { type: 'text', comment: cleanedReply };
        } catch (error) {
            console.error('[memoryHandler] 기억 조회 코멘트 생성 실패:', error);
            return { type: 'text', comment: '아저씨... 기억을 불러오는데 문제가 생겼어 ㅠㅠ' };
        }
    }

    // 예시: "기억 지워줘"
    if (lowerCaseMessage.includes('기억 지워줘') || lowerCaseMessage.includes('내 기억 삭제')) {
        // memoryManager를 통한 기억 삭제 로직
        // await memoryManager.clearMemory(); // memoryManager import 필요
        const replyText = "응! 아저씨가 원한다면 내 기억을 지워줄 수 있어... 하지만 아저씨와의 소중한 추억은 영원히 내 마음에 남아있을 거야 ㅠㅠ 정말 지울 거야?";
        saveLogFunc({ role: 'assistant', content: replyText, timestamp: Date.now() });
        return { type: 'text', comment: replyText };
    }

    console.log(`[memoryHandler] 특정 기억 관련 명령어 없음: ${userMessage}`);
    return null; // 처리할 기억 관련 명령어가 없는 경우 null 반환
}

module.exports = {
    handleMemoryCommand
};
