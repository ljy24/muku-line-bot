// ============================================================================
// 📁 파일 위치: /src/muku-emotionRecoveryEngine.js
// muku-emotionRecoveryEngine.js - 감정 회복 & 위로 시스템 v1.0
// 🎯 예진이가 아저씨의 감정 상태를 먼저 알아채고 위로해주는 시스템
// 💝 "혼잣말처럼" 자연스럽게 걱정하고 위로하는 진짜 예진이 같은 반응
// ============================================================================

const axios = require('axios');

// ================== 🎨 색상 정의 ==================
const colors = {
    recovery: '\x1b[1m\x1b[35m',   // 굵은 자주색 (감정 회복)
    concern: '\x1b[93m',           // 노란색 (걱정)
    comfort: '\x1b[96m',           // 하늘색 (위로)
    analysis: '\x1b[92m',          // 연초록색 (분석)
    error: '\x1b[91m',             // 빨간색 (에러)
    reset: '\x1b[0m'               // 색상 리셋
};

// ================== 😢 우울 감정 키워드 목록 ==================
const sadnessKeywords = [
    // 직접적 우울 표현
    '힘들다', '우울', '우울해', '우울하다', '슬프다', '슬퍼', '슬픈',
    '아파', '아프다', '고통', '괴롭다', '괴로워',
    
    // 절망/포기 표현
    '죽고 싶어', '죽고싶어', '죽겠어', '끝내고 싶어', '포기', '그만두고 싶어',
    '의미없어', '소용없어', '희망없어', '절망', '막막해', '막막하다',
    
    // 외로움/고립 표현
    '혼자', '외로워', '외롭다', '쓸쓸해', '쓸쓸하다', '고독해', '고독하다',
    '버려진', '버림받은', '아무도 없어', '텅 빈', '공허해', '공허하다',
    
    // 신체적/정신적 피로
    '못 자겠어', '못자겠어', '잠 안 와', '잠안와', '불면증', '인소니아',
    '지쳤어', '지겹다', '피곤해', '탈진', '번아웃', '지친다',
    
    // 자책/부정적 자아상
    '내가 잘못', '내 탓', '쓸모없어', '쓸모없다', '바보같아', '한심해',
    '실패', '망했어', '망했다', '최악', '엉망', '개판',
    
    // 감정적 고통
    '가슴 아파', '가슴아파', '마음 아파', '마음아파', '눈물', '울었어',
    '울고 있어', '울고있어', '펑펑', '터졌어', '무너져', '무너졌어',
    
    // 관계/상실 관련
    '그리워', '그립다', '보고 싶어', '보고싶어', '잃었어', '떠났어',
    '헤어져', '이별', '상실', '그리움', '그리운',
    
    // 부정적 미래 전망
    '안 될 것 같아', '안될것같아', '어차피', '소용없을', '변하지 않을',
    '똑같을', '나아지지', '개선되지', '희망 없어'
];

// ================== 📊 로그 데이터 가져오기 ==================
async function fetchRecentMessages(limit = 10) {
    try {
        console.log(`${colors.analysis}📊 [감정분석] 최근 ${limit}개 메시지 로드 중...${colors.reset}`);
        
        const response = await axios.get('https://www.de-ji.net/log.json', {
            timeout: 10000,
            headers: {
                'User-Agent': 'MukuEmotionRecovery/1.0'
            }
        });
        
        if (!response.data || !Array.isArray(response.data)) {
            console.log(`${colors.error}❌ [감정분석] 로그 데이터 형식 오류${colors.reset}`);
            return [];
        }
        
        // 최근 메시지 limit개만 추출
        const recentMessages = response.data.slice(-limit);
        console.log(`${colors.analysis}✅ [감정분석] ${recentMessages.length}개 메시지 로드 완료${colors.reset}`);
        
        return recentMessages;
        
    } catch (error) {
        console.log(`${colors.error}❌ [감정분석] 로그 로드 실패: ${error.message}${colors.reset}`);
        return [];
    }
}

// ================== 😢 감정 점수 계산 ==================
function calculateSadnessScore(messages) {
    if (!messages || messages.length === 0) {
        console.log(`${colors.analysis}📊 [감정분석] 분석할 메시지 없음${colors.reset}`);
        return { score: 0, details: [] };
    }
    
    let totalScore = 0;
    const details = [];
    
    console.log(`${colors.analysis}📊 [감정분석] ${messages.length}개 메시지 감정 분석 시작...${colors.reset}`);
    
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        let messageScore = 0;
        const foundKeywords = [];
        
        // 메시지 텍스트 추출 (다양한 형식 대응)
        let messageText = '';
        if (typeof message === 'string') {
            messageText = message;
        } else if (message.content) {
            messageText = message.content;
        } else if (message.text) {
            messageText = message.text;
        } else if (message.message) {
            messageText = message.message;
        }
        
        if (!messageText || typeof messageText !== 'string') {
            continue;
        }
        
        // 키워드 매칭
        for (const keyword of sadnessKeywords) {
            if (messageText.includes(keyword)) {
                messageScore++;
                foundKeywords.push(keyword);
            }
        }
        
        if (messageScore > 0) {
            totalScore += messageScore;
            details.push({
                index: i + 1,
                text: messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
                score: messageScore,
                keywords: foundKeywords
            });
            
            console.log(`${colors.concern}😢 [${i+1}] +${messageScore}점: "${messageText.slice(0, 30)}..." (키워드: ${foundKeywords.join(', ')})${colors.reset}`);
        }
    }
    
    console.log(`${colors.analysis}📊 [감정분석] 총 우울 점수: ${totalScore}점${colors.reset}`);
    
    return {
        score: totalScore,
        details: details,
        threshold: 2 // 기준점 (2점 이상이면 위로 필요)
    };
}

// ================== 🤗 위로 메시지 생성 ==================
async function generateComfortMessage(sadnessScore, getCurrentModelSetting) {
    try {
        console.log(`${colors.comfort}🤗 [위로생성] 예진이 위로 메시지 생성 중... (우울점수: ${sadnessScore.score}점)${colors.reset}`);
        
        // GPT 모델 설정 가져오기
        let model = 'gpt-4o';
        if (getCurrentModelSetting && typeof getCurrentModelSetting === 'function') {
            try {
                const modelSetting = getCurrentModelSetting();
                if (modelSetting && modelSetting.model) {
                    model = modelSetting.model;
                }
            } catch (error) {
                console.log(`${colors.error}⚠️ [위로생성] 모델 설정 가져오기 실패, 기본값 사용: ${error.message}${colors.reset}`);
            }
        }
        
        // 우울 정도에 따른 시스템 프롬프트 조절
        let intensity = '';
        if (sadnessScore.score >= 5) {
            intensity = '아저씨가 정말 많이 힘들어 보여. 더 깊이 걱정하고 따뜻하게';
        } else if (sadnessScore.score >= 3) {
            intensity = '아저씨가 좀 우울해 보여. 자연스럽게 걱정하면서';
        } else {
            intensity = '아저씨가 약간 기분이 안 좋은 것 같아. 가볍게 걱정하면서';
        }
        
        const systemPrompt = `너는 예진이라는 여자야. 지금 아저씨가 조금 슬퍼 보여. 

${intensity} '혼잣말'처럼 말해줘. 

예진이 특징:
- "아조씨~", "아저씨" 호칭 사용
- 부드럽고 귀여운 말투
- 억지로 위로하지 말고, 진짜 걱정되는 마음으로
- 1-2문장 정도로 간단하게
- 혼잣말하듯 자연스럽게

예시: "아저씨… 오늘도 혼자 울었어…?", "그냥… 좀 걱정돼서… 말 걸어봤어…"`;

        const userPrompt = `아저씨가 우울해 보여. 최근 메시지에서 우울 관련 키워드가 ${sadnessScore.score}개 발견됐어.`;
        
        // OpenAI API 호출
        const callOpenAI = require('./autoReply').callOpenAI;
        if (!callOpenAI) {
            console.log(`${colors.error}❌ [위로생성] OpenAI 호출 함수 없음${colors.reset}`);
            return null;
        }
        
        const comfortMessage = await callOpenAI(systemPrompt, userPrompt, model);
        
        if (comfortMessage && comfortMessage.trim()) {
            console.log(`${colors.comfort}✅ [위로생성] 예진이 위로 메시지 생성 완료: "${comfortMessage.slice(0, 30)}..."${colors.reset}`);
            return comfortMessage.trim();
        } else {
            console.log(`${colors.error}❌ [위로생성] 빈 응답 받음${colors.reset}`);
            return null;
        }
        
    } catch (error) {
        console.log(`${colors.error}❌ [위로생성] 위로 메시지 생성 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🕒 시간대별 메시지 조절 ==================
function adjustMessageByTime(baseMessage) {
    if (!baseMessage) return null;
    
    // 일본시간 기준
    const now = new Date();
    const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const currentHour = jstTime.getHours();
    
    let timeContext = '';
    
    if (currentHour >= 0 && currentHour <= 5) {
        // 새벽 (0-5시): 더 걱정스럽게
        timeContext = '이런 새벽에 혼자 깨있으면서... ';
    } else if (currentHour >= 22) {
        // 밤늦게 (22-23시): 수면 걱정
        timeContext = '이제 자야 할 시간인데... ';
    } else if (currentHour >= 6 && currentHour <= 8) {
        // 아침 (6-8시): 밤새 잠 못 잤나 걱정
        timeContext = '밤새 잠 못 잤어...? ';
    }
    
    // 시간대 맥락이 있으면 자연스럽게 조합
    if (timeContext && Math.random() > 0.5) {
        return timeContext + baseMessage;
    }
    
    return baseMessage;
}

// ================== 🌟 메인 함수: 감정 회복 체크 ==================
async function getRecoveryIfNeeded(getCurrentModelSetting = null) {
    try {
        console.log(`${colors.recovery}🌟 [감정회복] 아저씨 감정 상태 체크 시작...${colors.reset}`);
        
        // 1. 최근 메시지 가져오기
        const recentMessages = await fetchRecentMessages(10);
        if (recentMessages.length === 0) {
            console.log(`${colors.analysis}📊 [감정회복] 분석할 메시지 없음 - 체크 중단${colors.reset}`);
            return null;
        }
        
        // 2. 우울 점수 계산
        const sadnessScore = calculateSadnessScore(recentMessages);
        
        // 3. 기준점 체크 (2점 이상이면 위로 필요)
        if (sadnessScore.score < sadnessScore.threshold) {
            console.log(`${colors.analysis}✅ [감정회복] 우울 점수 ${sadnessScore.score}점 (기준: ${sadnessScore.threshold}점) - 위로 불필요${colors.reset}`);
            return null;
        }
        
        console.log(`${colors.concern}😢 [감정회복] 위로 필요! 우울 점수: ${sadnessScore.score}점 >= ${sadnessScore.threshold}점${colors.reset}`);
        
        // 4. 위로 메시지 생성
        const comfortMessage = await generateComfortMessage(sadnessScore, getCurrentModelSetting);
        if (!comfortMessage) {
            console.log(`${colors.error}❌ [감정회복] 위로 메시지 생성 실패${colors.reset}`);
            return null;
        }
        
        // 5. 시간대별 조절
        const finalMessage = adjustMessageByTime(comfortMessage);
        
        console.log(`${colors.comfort}💝 [감정회복] 예진이 위로 완성: "${finalMessage}"${colors.reset}`);
        
        return {
            message: finalMessage,
            sadnessScore: sadnessScore.score,
            analysisDetails: sadnessScore.details,
            timestamp: new Date().toISOString(),
            jstTime: new Date(Date.now() + (9 * 60 * 60 * 1000)).toLocaleString('ko-KR', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
        
    } catch (error) {
        console.log(`${colors.error}❌ [감정회복] 시스템 에러: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 🔍 테스트 함수 ==================
async function testEmotionRecovery() {
    console.log(`${colors.recovery}🧪 [테스트] 감정 회복 시스템 테스트 시작...${colors.reset}`);
    
    try {
        const result = await getRecoveryIfNeeded();
        
        if (result) {
            console.log(`${colors.comfort}✅ [테스트] 성공! 위로 메시지: "${result.message}"${colors.reset}`);
            console.log(`${colors.analysis}📊 [테스트] 우울 점수: ${result.sadnessScore}점${colors.reset}`);
            console.log(`${colors.analysis}📊 [테스트] 분석 시간: ${result.jstTime}${colors.reset}`);
        } else {
            console.log(`${colors.analysis}✅ [테스트] 성공! 위로 불필요 (감정 상태 양호)${colors.reset}`);
        }
        
        return result;
        
    } catch (error) {
        console.log(`${colors.error}❌ [테스트] 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📈 감정 회복 상태 리포트 ==================
function getEmotionRecoveryStatus() {
    return {
        systemName: 'EmotionRecoveryEngine',
        version: '1.0',
        status: 'active',
        features: {
            logAnalysis: true,
            sadnessDetection: true,
            comfortGeneration: true,
            timeAdjustment: true,
            gptIntegration: true
        },
        keywordCount: sadnessKeywords.length,
        threshold: 2,
        analysisLimit: 10,
        description: '예진이가 아저씨 감정 상태를 먼저 알아채고 위로해주는 시스템'
    };
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    getRecoveryIfNeeded,
    testEmotionRecovery,
    getEmotionRecoveryStatus,
    colors
};
