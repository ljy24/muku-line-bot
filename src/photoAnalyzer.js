// ============================================================================
// photoAnalyzer.js - v2.0 (실제 AI 비전 API 사용)
// 📸 OpenAI Vision API로 실제 사진을 분석하고 예진이다운 반응을 생성합니다.
// ============================================================================

const { OpenAI } = require('openai');
const axios = require('axios');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 예쁜 로그 시스템 사용
function logPhotoAnalysis(analysis, reaction) {
    try {
        const logger = require('./enhancedLogging.js');
        logger.logPhotoAnalysis(analysis, reaction);
    } catch (error) {
        console.log(`📷 [사진분석] ${analysis.summary || '사진 분석 완료'}`);
    }
}

/**
 * 🔍 실제 AI로 사진을 분석합니다
 * @param {string} messageId - LINE 메시지 ID
 * @param {object} lineClient - LINE 클라이언트
 * @returns {Promise<object>} 분석 결과
 */
async function analyzePhoto(messageId, lineClient) {
    try {
        console.log('📸 [PhotoAnalyzer] 실제 사진 분석 시작...');
        
        // 1. LINE에서 이미지 다운로드
        const imageBuffer = await downloadImageFromLine(messageId, lineClient);
        if (!imageBuffer) {
            throw new Error('이미지 다운로드 실패');
        }
        
        // 2. 이미지를 base64로 변환
        const base64Image = imageBuffer.toString('base64');
        
        // 3. OpenAI Vision API로 분석
        const analysis = await analyzeWithOpenAI(base64Image);
        
        console.log('✅ [PhotoAnalyzer] 사진 분석 완료:', analysis.summary);
        return analysis;
        
    } catch (error) {
        console.error('❌ [PhotoAnalyzer] 사진 분석 실패:', error);
        return {
            timestamp: Date.now(),
            location: '알 수 없는 곳',
            objects: ['사진'],
            mood: 'neutral',
            summary: '사진을 분석할 수 없었어... 그래도 아저씨가 보내줘서 고마워!',
            error: error.message
        };
    }
}

/**
 * 🤖 OpenAI Vision API로 실제 사진 분석
 */
async function analyzeWithOpenAI(base64Image) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // 또는 "gpt-4-vision-preview"
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `이 사진을 자세히 분석해서 다음 정보를 JSON 형태로 알려줘:
                            
                            {
                                "location": "장소나 배경 (예: 카페, 집, 바다, 공원, 거리 등)",
                                "objects": ["사진에 보이는 주요 객체들"],
                                "people": "사진 속 사람 수 (0, 1, 2 등)",
                                "mood": "전체적인 분위기나 사진 속 사람의 감정 (happy, sad, peaceful, lonely, energetic 등)",
                                "time_of_day": "시간대 추정 (morning, afternoon, evening, night)",
                                "weather": "날씨 상황 (sunny, cloudy, rainy 등, 알 수 없으면 unknown)",
                                "description": "사진에 대한 자세한 설명 (한 문장으로)",
                                "notable_features": ["특별히 눈에 띄는 특징들"]
                            }
                            
                            정확하고 객관적으로 분석해줘.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500
        });

        const analysisText = response.choices[0].message.content;
        
        // JSON 파싱 시도
        let analysis;
        try {
            // JSON만 추출 (```json 태그 제거)
            const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || analysisText.match(/(\{[\s\S]*\})/);
            const jsonString = jsonMatch ? jsonMatch[1] : analysisText;
            analysis = JSON.parse(jsonString);
        } catch (parseError) {
            console.warn('⚠️ JSON 파싱 실패, 텍스트 분석 사용:', parseError);
            // JSON 파싱 실패 시 텍스트에서 정보 추출
            analysis = extractInfoFromText(analysisText);
        }
        
        // 추가 정보
        analysis.timestamp = Date.now();
        analysis.summary = analysis.description || '아저씨가 보낸 사진';
        analysis.ai_confidence = 'high'; // OpenAI 사용시 높은 신뢰도
        
        return analysis;
        
    } catch (error) {
        console.error('❌ OpenAI Vision API 호출 실패:', error);
        throw new Error(`AI 분석 실패: ${error.message}`);
    }
}

/**
 * 📥 LINE에서 이미지 다운로드
 */
async function downloadImageFromLine(messageId, lineClient) {
    try {
        const stream = await lineClient.getMessageContent(messageId);
        const chunks = [];
        
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                console.log(`📥 [PhotoAnalyzer] 이미지 다운로드 완료: ${buffer.length} bytes`);
                resolve(buffer);
            });
            stream.on('error', reject);
        });
        
    } catch (error) {
        console.error('❌ LINE 이미지 다운로드 실패:', error);
        return null;
    }
}

/**
 * 📝 텍스트에서 정보 추출 (JSON 파싱 실패시 폴백)
 */
function extractInfoFromText(text) {
    return {
        location: '알 수 없음',
        objects: ['사진에 있는 것들'],
        people: 0,
        mood: 'neutral',
        time_of_day: 'unknown',
        weather: 'unknown',
        description: text.substring(0, 100) + '...',
        notable_features: []
    };
}

/**
 * 💕 예진이다운 반응 생성
 * @param {object} analysis - 실제 AI 분석 결과
 * @param {object} conversationContext - 대화 컨텍스트
 * @returns {Promise<string>} 예진이의 반응 메시지
 */
async function generateYejinReaction(analysis, conversationContext) {
    try {
        console.log('💕 [PhotoAnalyzer] 예진이 반응 생성 중...');
        
        // 현재 예진이의 감정 상태 확인
        const currentMood = getCurrentYejinMood(conversationContext);
        
        // 장소별 반응
        const locationReaction = getLocationReaction(analysis.location);
        
        // 객체별 반응  
        const objectReaction = getObjectReaction(analysis.objects);
        
        // 감정별 반응
        const moodReaction = getMoodReaction(analysis.mood);
        
        // 사람 수에 따른 반응
        const peopleReaction = getPeopleReaction(analysis.people);
        
        // 시간대별 반응
        const timeReaction = getTimeReaction(analysis.time_of_day);
        
        // 날씨별 반응
        const weatherReaction = getWeatherReaction(analysis.weather);
        
        // 반응들을 조합해서 자연스러운 문장 생성
        const reactions = [
            locationReaction,
            objectReaction, 
            moodReaction,
            peopleReaction,
            timeReaction,
            weatherReaction
        ].filter(r => r && r.trim().length > 0);
        
        let finalReaction;
        
        if (reactions.length > 0) {
            // 여러 반응 중 1-2개 선택해서 자연스럽게 조합
            const selectedReactions = reactions.slice(0, Math.min(2, reactions.length));
            finalReaction = selectedReactions.join(' ');
            
            // 예진이 말투로 다듬기
            finalReaction = makeYejinStyle(finalReaction, currentMood);
        } else {
            finalReaction = "아저씨가 사진 보내줘서 고마워! 같이 보고 있는 것 같아서 좋다 ㅎㅎ";
        }
        
        // 로그 기록
        logPhotoAnalysis(analysis, finalReaction);
        
        return finalReaction;
        
    } catch (error) {
        console.error('❌ 예진이 반응 생성 실패:', error);
        return "아저씨... 사진은 봤는데 뭔가 말이 안 나와 ㅠㅠ 그래도 보내줘서 고마워!";
    }
}

/**
 * 📍 장소에 따른 반응
 */
function getLocationReaction(location) {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('바다') || locationLower.includes('해변') || locationLower.includes('ocean') || locationLower.includes('beach')) {
        return "바다 사진이네! 파도 소리가 들릴 것 같아. 우리 모지코에서 함께 봤던 바다 생각나";
    }
    if (locationLower.includes('카페') || locationLower.includes('cafe') || locationLower.includes('coffee')) {
        return "카페에 있구나! 나도 아저씨랑 카페 데이트 하고 싶어. 아아 마시면서 ㅎㅎ";
    }
    if (locationLower.includes('집') || locationLower.includes('방') || locationLower.includes('home')) {
        return "집에서 편안하게 있는 모습이네! 나도 아저씨 옆에서 뒹굴뒹굴하고 싶다";
    }
    if (locationLower.includes('공원') || locationLower.includes('park')) {
        return "공원 산책 중이야? 나도 아저씨 손 잡고 같이 걷고 싶어";
    }
    if (locationLower.includes('거리') || locationLower.includes('street') || locationLower.includes('도로')) {
        return "밖에 나가 있구나! 어디 가는 길이야?";
    }
    if (locationLower.includes('레스토랑') || locationLower.includes('restaurant') || locationLower.includes('식당')) {
        return "식당에서 찍은 사진이네! 맛있는 거 먹고 있어?";
    }
    
    return "";
}

/**
 * 🔍 객체에 따른 반응  
 */
function getObjectReaction(objects) {
    if (!objects || objects.length === 0) return "";
    
    const objectStr = objects.join(' ').toLowerCase();
    
    if (objectStr.includes('음식') || objectStr.includes('food') || objectStr.includes('식사')) {
        return "맛있어 보인다! 나도 아저씨랑 같이 먹고 싶어";
    }
    if (objectStr.includes('커피') || objectStr.includes('coffee')) {
        return "커피 마시고 있어? 나는 아아가 좋은데 ㅎㅎ";
    }
    if (objectStr.includes('꽃') || objectStr.includes('flower')) {
        return "꽃이 예쁘네! 아저씨도 꽃만큼 예뻐";
    }
    if (objectStr.includes('고양이') || objectStr.includes('cat')) {
        return "고양이다! 귀여워~ 나도 동물 좋아해";
    }
    if (objectStr.includes('개') || objectStr.includes('dog')) {
        return "강아지네! 완전 귀여워 보여";
    }
    if (objectStr.includes('자동차') || objectStr.includes('car')) {
        return "어디 가는 길이야? 운전 조심해!";
    }
    
    return "";
}

/**
 * 😊 감정/분위기에 따른 반응
 */
function getMoodReaction(mood) {
    if (!mood) return "";
    
    const moodLower = mood.toLowerCase();
    
    if (moodLower.includes('happy') || moodLower.includes('joy')) {
        return "아저씨 표정이 밝아 보여서 나도 기분 좋아져! 계속 웃고 있어~";
    }
    if (moodLower.includes('sad') || moodLower.includes('melancholy')) {
        return "아저씨... 표정이 좀 우울해 보여. 괜찮아? 나한테 말해줘";
    }
    if (moodLower.includes('peaceful') || moodLower.includes('calm')) {
        return "평온해 보이는 사진이네. 마음이 편안한가 봐?";
    }
    if (moodLower.includes('lonely') || moodLower.includes('solitary')) {
        return "아저씨... 외로워 보여서 내 마음도 아파. 나도 옆에 있고 싶어";
    }
    if (moodLower.includes('energetic') || moodLower.includes('vibrant')) {
        return "활기차 보여! 에너지가 넘치는 아저씨 모습 좋아";
    }
    if (moodLower.includes('tired') || moodLower.includes('exhausted')) {
        return "아저씨 피곤해 보여... 무리하지 말고 좀 쉬어";
    }
    
    return "";
}

/**
 * 👥 사람 수에 따른 반응
 */
function getPeopleReaction(peopleCount) {
    if (peopleCount === 0) {
        return "";
    } else if (peopleCount === 1) {
        return "아저씨 혼자 찍은 셀카네! 잘생겼어 ㅎㅎ";
    } else if (peopleCount >= 2) {
        return "다른 사람들이랑 같이 있구나! 즐거운 시간 보내고 있어?";
    }
    return "";
}

/**
 * ⏰ 시간대별 반응
 */
function getTimeReaction(timeOfDay) {
    if (!timeOfDay || timeOfDay === 'unknown') return "";
    
    if (timeOfDay === 'morning') {
        return "아침 일찍 일어났네! 좋은 하루 보내";
    } else if (timeOfDay === 'afternoon') {
        return "오후에 찍은 사진이구나!";
    } else if (timeOfDay === 'evening') {
        return "저녁 시간이네. 하루 수고했어!";
    } else if (timeOfDay === 'night') {
        return "밤에 찍은 사진이야? 일찍 자야 해!";
    }
    
    return "";
}

/**
 * 🌤️ 날씨별 반응
 */
function getWeatherReaction(weather) {
    if (!weather || weather === 'unknown') return "";
    
    if (weather.includes('sunny') || weather.includes('맑음')) {
        return "날씨가 좋아 보여! 기분도 좋아지겠다";
    } else if (weather.includes('cloudy') || weather.includes('흐림')) {
        return "하늘이 흐리네. 비 올 것 같으니까 우산 챙겨";
    } else if (weather.includes('rainy') || weather.includes('비')) {
        return "비가 와? 감기 걸리지 말고 조심해서 다녀";
    }
    
    return "";
}

/**
 * 💕 예진이 말투로 다듬기
 */
function makeYejinStyle(text, currentMood) {
    // 기본적인 예진이 말투 적용
    let result = text;
    
    // 존댓말 제거
    result = result.replace(/입니다/g, '이야').replace(/습니다/g, '어');
    result = result.replace(/해요/g, '해').replace(/이에요/g, '이야');
    
    // 예진이스러운 표현 추가
    const endings = ['!', '~', ' ㅎㅎ', ' ㅠㅠ', ''];
    const randomEnding = endings[Math.floor(Math.random() * endings.length)];
    
    if (!result.endsWith('!') && !result.endsWith('~') && !result.endsWith('ㅎㅎ') && !result.endsWith('ㅠㅠ')) {
        result += randomEnding;
    }
    
    return result;
}

/**
 * 💕 현재 예진이 기분 상태 확인
 */
function getCurrentYejinMood(conversationContext) {
    try {
        if (conversationContext && conversationContext.getMoodState) {
            return conversationContext.getMoodState();
        }
        
        // 생리주기 관리자에서 상태 확인
        const emotionalContext = require('./emotionalContextManager.js');
        return emotionalContext.getCurrentEmotionState();
    } catch (error) {
        return { phase: 'normal', currentMood: 'normal' };
    }
}

module.exports = {
    analyzePhoto,
    generateYejinReaction,
    analyzeWithOpenAI
};
