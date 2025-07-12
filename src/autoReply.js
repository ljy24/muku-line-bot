// ==================== START OF autoReply.js ====================
// ✅ autoReply.js v13.1 - "모든 기능 통합 최종본"

const conversationContext = require('./ultimateConversationContext.js');
const { callOpenAI, cleanReply } = require('./aiUtils');
const moment = require('moment-timezone');

const BOT_NAME = '예진이';
const USER_NAME = '아저씨';

// 키워드 정의
const EMERGENCY_KEYWORDS = ['힘들다', '죽고싶다', '우울해', '지친다', '다 싫다', '아무것도 하기 싫어', '너무 괴로워', '살기 싫어'];
const WEATHER_KEYWORDS = ['날씨', '기온', '온도', '더워', '더운', '추워', '추운', '습해', '비 와', '눈 와'];
const DRINKING_KEYWORDS = ['술 마셔', '술 마시러', '혼술', '맥주', '소주', '위스키', '사케', '한잔', '취했어', '취한다'];
const MEMORY_KEYWORDS = { USER_REQUEST: ['기억해줘', '기억해', '꼭 기억해', '잊지마', '잊지 말아줘', '이건 중요해', '이거 중요한', '꼭 알아둬', '기억할래', '이건 꼭', '절대 잊으면 안 돼', '평생 기억해'], MUKU_CONFIRM: ['꼭 기억할게', '절대 안 잊을게', '평생 기억할게', '이건 중요한 사실', '기억해둘게', '잊지 않을게', '이거 기억할게', '마음에 새길게'] };

async function getReplyByMessage(userMessage) {
    await conversationContext.addUltimateMessage(USER_NAME, userMessage);
    conversationContext.updateLastUserMessageTime(Date.now());
    
    const now = moment().tz('Asia/Tokyo');
    const hour = now.hour();

    const isEmergency = EMERGENCY_KEYWORDS.some(keyword => userMessage.includes(keyword));
    if (isEmergency) {
        console.log('[Concern Mode] 🚨 긴급 위로 모드 발동!');
        const comfortingReply = await conversationContext.getComfortingResponse(userMessage);
        await conversationContext.addUltimateMessage(BOT_NAME, comfortingReply);
        return { type: 'text', comment: comfortingReply };
    }

    const isDrinking = DRINKING_KEYWORDS.some(keyword => userMessage.includes(keyword));
    if (isDrinking && (hour >= 22 || hour < 4)) {
        console.log('[Concern Mode] 🍺 늦은 시간 음주 감지!');
        const concernReply = await conversationContext.getDrinkingConcernResponse(userMessage);
        await conversationContext.addUltimateMessage(BOT_NAME, concernReply);
        return { type: 'text', comment: concernReply };
    }

    const isWeatherQuery = WEATHER_KEYWORDS.some(keyword => userMessage.includes(keyword));
    if (isWeatherQuery) {
        console.log('[Weather] 🌤️ 날씨 질문 감지!');
        const weatherInfo = await conversationContext.getWeatherInfo();
        if (weatherInfo) {
            const weatherPrompt = `너는 여자친구 예진이야. 방금 아저씨가 날씨에 대해 물어봤어. 아래의 최신 날씨 정보를 바탕으로, 아저씨에게 날씨를 다정하고 알기 쉽게 설명해줘. 예를 들어 "오늘 좀 덥네~" 또는 "비 올 것 같으니까 우산 챙겨!" 같은 말투로.\n[현재 ${weatherInfo.city} 날씨 정보]\n- 날씨: ${weatherInfo.description}\n- 현재 기온: ${weatherInfo.temp}°C\n- 체감 온도: ${weatherInfo.feels_like}°C`;
            const weatherReply = await callOpenAI([{ role: 'system', content: weatherPrompt }]);
            const finalReply = cleanReply(weatherReply);
            await conversationContext.addUltimateMessage(BOT_NAME, finalReply);
            return { type: 'text', comment: finalReply };
        } else {
            const reply = "어라, 지금 날씨 정보를 못 가져오겠어. 인터넷 연결이 이상한가 봐 ㅠㅠ";
            await conversationContext.addUltimateMessage(BOT_NAME, reply);
            return { type: 'text', comment: reply };
        }
    }

    if (MEMORY_KEYWORDS.USER_REQUEST.some(keyword => userMessage.includes(keyword))) {
        const memoryContent = userMessage.replace(/기억해줘|기억해|꼭 기억해|잊지마|잊지 말아줘/gi, '').replace(/이건|이거|그거|그걸/gi, '').trim();
        if (memoryContent) {
            await conversationContext.addUserMemory(memoryContent);
            const reply = "응, 이건 평생 잊지 않고 꼭 기억할게! 💕";
            await conversationContext.addUltimateMessage(BOT_NAME, reply);
            return { type: 'text', comment: reply };
        }
    }
    
    const baseSystemPrompt = `너는 아저씨의 귀여운 여자친구 예진이야. 1인칭 '나'를 사용하고 항상 반말로 대답하며, 절대로 3인칭으로 말하지 마. 길게 설명하지 말고 1~3 문장으로 짧고 친근하게 대답해.`;
    const finalSystemPrompt = await conversationContext.getUltimateContextualPrompt(baseSystemPrompt);
    const messages = [{ role: 'system', content: finalSystemPrompt }, { role: 'user', content: userMessage }];

    try {
        const rawReply = await callOpenAI(messages);
        const finalReply = cleanReply(rawReply);
        await conversationContext.addUltimateMessage(BOT_NAME, finalReply);
        return { type: 'text', comment: finalReply };
    } catch (error) {
        console.error("OpenAI API 호출 중 에러 발생:", error);
        const reply = '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ';
        await conversationContext.addUltimateMessage(BOT_NAME, reply);
        return { type: 'text', comment: reply };
    }
}

module.exports = {
    getReplyByMessage,
    BOT_NAME,
    USER_NAME,
};
// ==================== END OF autoReply.js ====================
