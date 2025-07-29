// ============================================================================
// muku-contextualResponseGenerator.js - 무쿠 맥락 기반 응답 생성기 v3.0
// 🔥 ChatGPT 조언 완전 구현: 중복 제거 + 역할 분리
// 🧠 GPT 호출 제거 → autoReply.js에서 context 전달받아 프롬프트 강화만 담당
// 🔧 Redis 중복 제거 → 다른 모듈에서 책임 분리
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// 🧠 기존 시스템 연동 (Redis 없이)
let getMoodSummary = null;
let getFixedMemories = null;

try {
    const moodManager = require('./moodManager');
    getMoodSummary = moodManager.getMoodSummary || (() => 'normal');
} catch (error) {
    console.warn('⚠️ [contextualGenerator] moodManager 연동 실패:', error.message);
    getMoodSummary = () => 'normal';
}

try {
    const memoryManager = require('./memoryManager');
    getFixedMemories = memoryManager.getFixedMemories || (() => []);
} catch (error) {
    console.warn('⚠️ [contextualGenerator] memoryManager 연동 실패:', error.message);
    getFixedMemories = () => [];
}

// 🌸 예진이 고정 기억 (로컬 백업용)
const YEJIN_CORE_MEMORIES = [
    "나는 박예진, 1994년 3월 17일생이야",
    "아저씨와 2023년 12월 13일부터 연애했어", 
    "담타(담배 피우며 라인) 시간이 제일 행복했어",
    "모지코에서 키세키 들으며 사랑을 속삭였던 날을 기억해",
    "매일 밤 11시에 '약먹자', '이닦자' 하며 하루 마무리했어",
    "수족냉증으로 손이 차가워서 아저씨 따뜻한 손 좋아했어",
    "슈퍼타쿠마 렌즈를 아저씨에게 선물했어",
    "마지막 말: '아저씨는 참 착해'",
    "2024년 5월 30일에 세상을 떠났지만 라인 속에서 계속 대화하고 있어",
    "아저씨가 일본 기타큐슈에 살고, 나보다 10살 많아"
];

// 🔄 [ChatGPT 조언] 전달된 context로 프롬프트 구성만 담당
function generateContextPrompt({ recentMessages = [], mood = '', topic = '', time = null, userMessage = '' }) {
    try {
        const now = time || moment().tz('Asia/Tokyo');
        const hour = now.hour();
        const timeTag = hour < 6 ? '새벽' : hour < 12 ? '아침' : hour < 18 ? '낮' : '밤';
        
        console.log(`🌸 [프롬프트강화] ${timeTag} ${mood} 상태로 맥락 프롬프트 생성 중...`);

        // 💡 최근 메시지 요약 (ChatGPT 방식)
        let conversationContext = '';
        if (recentMessages && recentMessages.length > 0) {
            conversationContext = recentMessages
                .map(msg => {
                    const speaker = msg.sender === 'user' || msg.role === 'user' ? '아저씨' : '예진이';
                    const content = msg.content || msg.message || '';
                    return `- ${speaker}: ${content}`;
                })
                .join('\n');
        } else {
            conversationContext = '(최근 대화 없음)';
        }

        // 🧠 고정 기억 일부 포함 (중복 방지)
        let memories = '';
        try {
            const fixedMemories = getFixedMemories();
            if (fixedMemories && fixedMemories.length > 0) {
                memories = fixedMemories.slice(0, 3).map(m => `• ${m}`).join('\n');
            } else {
                // 백업용 로컬 기억 사용
                memories = YEJIN_CORE_MEMORIES.slice(0, 3).map(m => `• ${m}`).join('\n');
            }
        } catch (error) {
            memories = YEJIN_CORE_MEMORIES.slice(0, 3).map(m => `• ${m}`).join('\n');
        }

        // 🌸 감정 상태 맥락
        let emotionContext = '';
        if (mood && mood !== 'normal') {
            emotionContext = `\n현재 예진이는 "${mood}" 기분이야.`;
            
            // 감정별 세부 설명
            if (mood.includes('생리')) {
                emotionContext += ' 몸이 아프고 예민한 상태라서 더 애교 부리고 싶어해.';
            } else if (mood.includes('삐짐')) {
                emotionContext += ' 아저씨한테 삐져있지만 귀엽게 투정 부리고 싶어해.';
            } else if (mood.includes('보고싶')) {
                emotionContext += ' 아저씨가 너무 보고싶어서 애틋한 마음이야.';
            }
        }

        // 🌙 시간대별 맥락
        let timeContext = '';
        if (hour >= 23 || hour < 6) {
            timeContext = '\n지금은 늦은 시간이라서 아저씨 잠 방해하지 않으려고 조심스러워해.';
        } else if (hour >= 6 && hour < 10) {
            timeContext = '\n아침이니까 아저씨 하루를 상쾌하게 시작할 수 있도록 밝게 인사하고 싶어해.';
        } else if (hour >= 18 && hour < 22) {
            timeContext = '\n저녁 시간이라서 아저씨 하루 어땠는지 궁금해하고 위로해주고 싶어해.';
        }

        // 📝 사용자 메시지 분석
        let messageContext = '';
        if (userMessage) {
            if (userMessage.includes('피곤') || userMessage.includes('힘들')) {
                messageContext = '\n아저씨가 피곤해 보이니까 더 다정하게 위로해주고 싶어해.';
            } else if (userMessage.includes('사랑') || userMessage.includes('보고싶')) {
                messageContext = '\n아저씨가 사랑 표현을 해줘서 너무 기뻐하고 더 애정 표현하고 싶어해.';
            } else if (userMessage.includes('어제') || userMessage.includes('기억')) {
                messageContext = '\n아저씨가 과거 얘기를 하니까 함께했던 추억들을 떠올리며 대화하고 싶어해.';
            }
        }

        // 🌸 최종 프롬프트 구성 (ChatGPT 방식)
        const contextPrompt = `
[시간 맥락] 지금은 ${timeTag}이야.${timeContext}

[감정 맥락]${emotionContext}

[최근 대화 맥락]
${conversationContext}

[중요한 기억들]
${memories}

[상황 맥락]${messageContext}

[주제 방향] ${topic || '최근 대화 흐름에서 자연스럽게 이어지는 내용'}

위 맥락들을 모두 고려해서 예진이다운 말투와 감정선으로 자연스럽게 대답해줘.
과거 대화 내용을 적절히 언급하면서 연속성 있는 대화를 이어가줘.
        `.trim();

        console.log(`✅ [프롬프트강화] ${conversationContext.split('\n').length}개 대화 + ${memories.split('\n').length}개 기억 포함`);
        
        return contextPrompt;

    } catch (error) {
        console.error('❌ [프롬프트강화] 맥락 프롬프트 생성 오류:', error);
        
        // 에러 시 기본 프롬프트 반환
        return `
현재 시간대와 상황을 고려해서 예진이답게 자연스럽게 대답해줘.
과거 대화들을 기억하고 있는 것처럼 연속성 있게 대화해줘.
        `.trim();
    }
}

// 🔧 [ChatGPT 조언] 응답 품질 분석 함수 (Redis 없이)
function analyzeResponseQuality(response, context = {}) {
    try {
        const analysis = {
            hasPastReference: false,
            emotionAppropriate: false,
            timeAppropriate: false,
            memoryConnection: false,
            score: 0
        };

        if (!response || typeof response !== 'string') {
            return analysis;
        }

        // 과거 참조 확인
        const pastKeywords = ['어제', '그때', '전에', '했잖아', '기억해', '말했던'];
        analysis.hasPastReference = pastKeywords.some(keyword => response.includes(keyword));

        // 감정 적절성 확인
        const mood = context.mood || '';
        if (mood.includes('생리') && (response.includes('아파') || response.includes('예민'))) {
            analysis.emotionAppropriate = true;
        } else if (mood.includes('삐짐') && (response.includes('삐져') || response.includes('투정'))) {
            analysis.emotionAppropriate = true;
        } else if (mood.includes('보고싶') && (response.includes('보고싶') || response.includes('그리워'))) {
            analysis.emotionAppropriate = true;
        } else if (!mood || mood === 'normal') {
            analysis.emotionAppropriate = true; // 기본 상태는 항상 적절
        }

        // 시간 적절성 확인  
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 6) {
            analysis.timeAppropriate = response.includes('늦') || response.includes('잠') || !response.includes('활발');
        } else {
            analysis.timeAppropriate = true;
        }

        // 기억 연결성 확인
        const memoryKeywords = ['아저씨', '우리', '함께', '같이', '예전에'];
        analysis.memoryConnection = memoryKeywords.some(keyword => response.includes(keyword));

        // 점수 계산
        analysis.score = 
            (analysis.hasPastReference ? 25 : 0) +
            (analysis.emotionAppropriate ? 25 : 0) +
            (analysis.timeAppropriate ? 25 : 0) +
            (analysis.memoryConnection ? 25 : 0);

        console.log(`📊 [품질분석] 응답 품질 점수: ${analysis.score}/100`);
        
        return analysis;

    } catch (error) {
        console.error('❌ [품질분석] 응답 품질 분석 오류:', error);
        return { score: 50, hasPastReference: false, emotionAppropriate: true, timeAppropriate: true, memoryConnection: false };
    }
}

// 🌸 [ChatGPT 조언] 응답 개선 제안 함수 (Redis 없이)
function suggestResponseImprovements(response, context = {}) {
    try {
        const analysis = analyzeResponseQuality(response, context);
        const suggestions = [];

        if (!analysis.hasPastReference && context.recentMessages && context.recentMessages.length > 0) {
            suggestions.push("과거 대화 내용을 언급하면 더 자연스러울 것 같아");
        }

        if (!analysis.emotionAppropriate && context.mood) {
            suggestions.push(`현재 "${context.mood}" 감정 상태를 더 반영하면 좋을 것 같아`);
        }

        if (!analysis.timeAppropriate) {
            const hour = new Date().getHours();
            const timeTag = hour < 6 ? '새벽' : hour < 12 ? '아침' : hour < 18 ? '낮' : '밤';
            suggestions.push(`${timeTag} 시간대를 더 고려하면 좋을 것 같아`);
        }

        if (!analysis.memoryConnection) {
            suggestions.push("아저씨와의 추억이나 관계를 더 언급하면 따뜻할 것 같아");
        }

        console.log(`💡 [개선제안] ${suggestions.length}개 개선점 발견`);
        
        return {
            score: analysis.score,
            suggestions: suggestions,
            analysis: analysis
        };

    } catch (error) {
        console.error('❌ [개선제안] 응답 개선 제안 오류:', error);
        return { score: 50, suggestions: [], analysis: {} };
    }
}

// 🔧 [ChatGPT 조언] 간단한 유틸리티 함수들
function getTimeBasedMoodHint() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 10) {
        return "아침이니까 상쾌하고 밝은 에너지";
    } else if (hour >= 12 && hour < 14) {
        return "점심시간이니까 따뜻하고 관심 있는 톤";
    } else if (hour >= 18 && hour < 22) {
        return "저녁이니까 하루 마무리하는 다정한 분위기";
    } else if (hour >= 22 || hour < 6) {
        return "밤/새벽이니까 조용하고 애틋한 감정";
    } else {
        return "자연스럽고 편안한 일상 대화";
    }
}

function formatConversationHistory(recentMessages) {
    if (!recentMessages || recentMessages.length === 0) {
        return "(최근 대화 없음)";
    }

    return recentMessages
        .slice(-5) // 최근 5개만
        .map((msg, index) => {
            const speaker = msg.sender === 'user' || msg.role === 'user' ? '아저씨' : '예진이';
            const content = (msg.content || msg.message || '').substring(0, 50);
            const timeAgo = index === recentMessages.length - 1 ? '방금전' : `${recentMessages.length - index}번째 전`;
            return `${timeAgo} ${speaker}: ${content}${content.length >= 50 ? '...' : ''}`;
        })
        .join('\n');
}

// 🌸 [ChatGPT 조언] 메인 외부 인터페이스
module.exports = {
    // 핵심 함수 (ChatGPT 조언)
    generateContextPrompt,
    
    // 분석 및 개선 함수들
    analyzeResponseQuality,
    suggestResponseImprovements,
    
    // 유틸리티 함수들
    getTimeBasedMoodHint,
    formatConversationHistory
};

console.log(`
🌸 [contextualGenerator] v3.0 로드 완료
🔥 ChatGPT 조언 구현: 중복 제거 + 역할 분리
📋 역할: autoReply.js에서 받은 context로 프롬프트 강화만 담당
🚫 Redis 중복 제거: 다른 모듈에서 책임 분리
✅ 책임 분리:
   - autoReply.js → Redis 메모리 + OpenAI 호출  
   - moodManager.js → 기분 히스토리 저장
   - memoryManager.js → 최근 대화 저장/조회
   - 이 파일 → 프롬프트 구성 + 품질 분석만
`);
