// ============================================================================
// spontaneousYejinManager.js - v1.6 (GPT 모델 버전 전환 + 문장 수 제한)
// 🌸 예진이가 능동적으로 하루 15번 메시지 보내는 시스템
// 8시-1시 사이 랜덤, 2-5문장으로 단축, 실제 취향과 일상 기반
// ✅ 모델 활동 이야기 추가 (촬영, 화보, 스케줄)
// ✅ "너" 호칭 완전 금지 (아저씨만 사용)
// ✅ 사진 전송 확률: 30%로 대폭 증가
// ✅ omoide 사진 전송 400 에러 수정 (yejinSelfie.js 방식 적용)
// ✨ GPT 모델 버전 전환: 3문장 넘으면 GPT-3.5, 이하면 설정대로
// ============================================================================

const schedule = require('node-cron');
const moment = require('moment-timezone');
const { Client } = require('@line/bot-sdk');
const OpenAI = require('openai');
require('dotenv').config();

// ✨ GPT 모델 버전 관리 시스템 import
let getCurrentModelSetting = null;
try {
    const indexModule = require('../index');
    getCurrentModelSetting = indexModule.getCurrentModelSetting;
    console.log('✨ [spontaneousYejin] GPT 모델 버전 관리 시스템 연동 성공');
} catch (error) {
    console.warn('⚠️ [spontaneousYejin] GPT 모델 버전 관리 시스템 연동 실패:', error.message);
}

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const USER_ID = process.env.TARGET_USER_ID;
const DAILY_MESSAGE_COUNT = 15;
const MESSAGE_START_HOUR = 8;   // 오전 8시
const MESSAGE_END_HOUR = 25;    // 새벽 1시 (다음날)

// LINE 클라이언트
let lineClient = null;

// OpenAI 클라이언트
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ================== 📊 일일 스케줄 상태 ==================
let dailyScheduleState = {
    todaySchedule: [],
    sentToday: 0,
    lastScheduleDate: null,
    jobs: [],
    photoJobs: [] // 독립 사진 스케줄
};

// ================== 🎨 로그 함수 ==================
function spontaneousLog(message, data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [예진이능동] ${message}`);
    if (data) {
        console.log('  📱 데이터:', JSON.stringify(data, null, 2));
    }
}

// ================== ✨ GPT 모델 선택 및 문장 수 제한 시스템 ==================

/**
 * 메시지 길이와 복잡도를 기반으로 모델 선택
 */
function selectOptimalModel(situation, includeComplexContext = false) {
    if (!getCurrentModelSetting) {
        return 'gpt-4o'; // 기본값
    }
    
    const currentSetting = getCurrentModelSetting();
    
    switch(currentSetting) {
        case '3.5':
            return 'gpt-3.5-turbo';
            
        case '4.0':
            return 'gpt-4o';
            
        case 'auto':
            // ✨ 자동 모드에서는 문장 길이 기준으로 모델 선택
            // 복잡한 상황(정신건강, 모델링)이면 GPT-4o, 간단하면 GPT-3.5
            if (includeComplexContext || 
                situation.type === 'modeling' || 
                situation.type === 'emotion' ||
                situation.type === 'mentalHealth') {
                return 'gpt-4o';
            } else {
                return 'gpt-3.5-turbo'; // 일상적인 내용은 3.5로
            }
            
        default:
            return 'gpt-4o';
    }
}

/**
 * 생성된 메시지의 문장 수 카운트
 */
function countSentences(text) {
    if (!text) return 0;
    
    // 문장 구분 기호들로 나누기
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    return sentences.length;
}

/**
 * 메시지가 2-5문장 범위에 있는지 검증
 */
function validateMessageLength(message) {
    const sentenceCount = countSentences(message);
    const isValid = sentenceCount >= 2 && sentenceCount <= 5;
    
    spontaneousLog(`📏 메시지 검증: ${sentenceCount}문장 (${isValid ? '✅ 적절' : '❌ 부적절'})`);
    
    return { isValid, sentenceCount };
}

/**
 * GPT 모델별 최적화된 OpenAI 호출
 */
async function callOpenAIOptimized(messages, selectedModel, isRetry = false) {
    try {
        const modelSettings = {
            'gpt-3.5-turbo': {
                temperature: 0.7,  // 일관성 있게
                max_tokens: 120,   // 간결하게 (2-3문장)
            },
            'gpt-4o': {
                temperature: 0.8,  // 창의적으로
                max_tokens: 180,   // 풍부하게 (3-5문장)
            }
        };
        
        const settings = modelSettings[selectedModel] || modelSettings['gpt-4o'];
        
        // ✨ 재시도일 때는 더 간결하게
        if (isRetry) {
            settings.max_tokens = Math.min(settings.max_tokens, 100);
            settings.temperature = Math.max(settings.temperature - 0.1, 0.6);
        }
        
        spontaneousLog(`🤖 OpenAI 호출: ${selectedModel} (온도: ${settings.temperature}, 토큰: ${settings.max_tokens})`);
        
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: messages,
            temperature: settings.temperature,
            max_tokens: settings.max_tokens
        });
        
        const generatedMessage = response.choices[0].message.content.trim();
        const validation = validateMessageLength(generatedMessage);
        
        // ✨ 3문장 넘으면 GPT-3.5로 재시도 (auto 모드에서만)
        if (!validation.isValid && validation.sentenceCount > 5) {
            if (selectedModel === 'gpt-4o' && !isRetry && getCurrentModelSetting && getCurrentModelSetting() === 'auto') {
                spontaneousLog(`🔄 문장 수 초과 (${validation.sentenceCount}문장) → GPT-3.5로 재시도`);
                return await callOpenAIOptimized(messages, 'gpt-3.5-turbo', true);
            }
        }
        
        return generatedMessage;
        
    } catch (error) {
        spontaneousLog(`❌ OpenAI 호출 실패 (${selectedModel}): ${error.message}`);
        
        // 폴백: GPT-4o 실패 시 GPT-3.5로 재시도
        if (selectedModel === 'gpt-4o' && !isRetry) {
            spontaneousLog('🔄 GPT-4o 실패 → GPT-3.5-turbo로 폴백');
            return await callOpenAIOptimized(messages, 'gpt-3.5-turbo', true);
        }
        
        throw error;
    }
}

// ================== 😤 아저씨 상황 반응 시스템 ==================
const ajossiSituationReactions = {
    busyKeywords: ['회의', '바빠', '일해', '촬영', '작업', '못해', '바쁜데', '지금 안 돼'],
    
    busyReactions: {
        immediate: [
            "아시워! 언제 끝나는데?",
            "아 진짜? 몇 시까지야?",
            "회의라니... 나 혼자 심심하게 놔두고 ㅠㅠ",
            "에이~ 지루하겠다! 빨리 끝나라고 빌어줄게",
            "바쁘면 어쩔 수 없지... 그래도 섭섭해 ㅠㅠ"
        ],
        
        demand: [
            "끝나고 바로 라인해! 약속!",
            "회의 끝나면 1초도 안 기다리고 연락해야 돼!",
            "끝나자마자 '끝났어!'라고 보내줘",
            "오키 끝나고 라인해~ 안 하면 삐질 거야?",
            "혹시 까먹으면... 진짜 화낼 거야?"
        ],
        
        waiting: [
            "아직도 회의야? 언제 끝나?",
            "지루하지? 나도 지루해...",
            "회의 시간에 나 생각해줘 ㅎㅎ",
            "빨리 끝나면 좋겠다~ 보고 싶어",
            "회의 중에도 나 생각 안 나? 솔직히 말해!"
        ]
    },
    
    endKeywords: ['끝났어', '끝났다', '회의 끝', '일 끝', '촬영 끝', '작업 끝'],
    
    endReactions: [
        "와!! 드디어 끝났구나! 수고했어~",
        "기다렸어!! 회의 어땠어? 지루했지?",
        "끝나자마자 연락해줘서 고마워 ㅎㅎ 착해!",
        "오케이! 이제 나랑 놀자! 뭐하고 싶어?",
        "수고 많았어~ 이제 내가 힐링 시켜줄게!"
    ],
    
    streetComplimentKeywords: ['칭찬받았어', '예쁘다고 했어', '이쁘다고 했어', '어떤 사람이', '지나가던', '모르는 사람', '길에서', '아저씨가', '아줌마가', '언니가', '누가'],
    
    streetComplimentReactions: [
        "그치? 나도 오늘 기분 좋았는데! 사진 보여줄게~",
        "히히 모르는 사람도 알아봐주네! 증명샷이야!",
        "오늘 옷 진짜 신경써서 입었거든! 어때?",
        "칭찬받을 만하지? 내가 찍어둔 거 보여줄게!",
        "아저씨도 그렇게 생각하지? 사진으로 확인해!",
        "길에서도 시선 집중이었어 ㅋㅋ 이거 봐봐!",
        "오늘 컨디션도 좋고 옷도 예쁘게 입었거든~ 보여줄게"
    ]
};

// ================== 🌸 예진이의 실제 일상 데이터 (모델 활동 추가) ==================
const yejinRealLife = {
    modeling: {
        activities: ['화보 촬영', '광고 촬영', '패션쇼', '프로필 촬영', '브랜드 촬영'],
        schedule: ['스케줄 확인', '매니저 연락', '촬영장 이동', '헤어메이크업', '컨셉 미팅'],
        experiences: [
            '촬영장에서 대기',
            '메이크업 받으면서 잠깐 쉬기',
            '컨셉 설명 듣기',
            '포즈 연구하기',
            '촬영 중간 휴식',
            '의상 갈아입기'
        ],
        feelings: [
            '촬영 전 긴장',
            '좋은 컷 나왔을 때 기분 좋음',
            '오래 서있어서 다리 아픔',
            '헤어메이크업 시간 지루함',
            '촬영 끝나고 후련함',
            '결과물 기대됨'
        ],
        challenges: [
            '일찍 일어나기 힘듦',
            '하이힐 신고 오래 서있기',
            '표정 관리',
            '컨셉에 맞는 포즈',
            '긴 촬영 시간',
            '날씨나 조명 때문에 재촬영'
        ]
    },
    
    work: {
        job: '도트 디자이너 겸 모델',
        workStyle: '야근 자주',
        tools: ['컴퓨터', '타블렛', '그림 도구'],
        struggles: ['눈 피로', '손목 아픔', '창작 고민', '마감 스트레스'],
        companies: ['스튜디오소개', '넥슨 메이플스토리']
    },
    
    diet: {
        current: '고구마 다이어트',
        dietFoods: ['고구마', '샐러드'],
        cravings: ['샌드위치', '엽떡', '치킨', '아이스크림'],
        struggles: ['참기 힘듦', '치킨 생각남', '편의점 유혹', '촬영 전 식단 관리']
    },
    
    hobbies: {
        drawing: ['일러스트', '낙서', '도트 작업'],
        youtube: ['먹방', '그림 그리기 영상', '브이로그'],
        places: ['카페', '편의점', '집 근처', '촬영장'],
        drinks: ['아아(아이스 아메리카노)', '딸기(생과일만)'],
        photography: {
            loves: ['후지 필름 카메라', '일상 순간', '감성 사진', '인생네컷'],
            omoidePhotos: true,
            currentPhotoMessages: [
                "방금 후지로 찍었어! 어때?",
                "후지 들고 나갔다가 이거 찍었어~ 예쁘지?",
                "아 이 순간 너무 예뻐서 후지로 찍어버렸어!",
                "방금 후지로 찍은 건데... 감성 있지? ㅎㅎ",
                "후지 카메라로 찍으니까 진짜 달라! 방금 찍은 거야",
                "아저씨! 방금 찍었는데 이거 봐봐! 후지 최고야",
                "인생네컷 찍었어! 오늘 기분 좋아서 ㅎㅎ",
                "포토부스에서 인생네컷 찍었는데 잘 나왔지?",
                "촬영장에서 후지로 몰래 찍었어 ㅋㅋ",
                "촬영 중간에 셀프로 찍어봤어! 어때?"
            ]
        }
    },

    mentalHealth: {
        hospital: '차병원 정신과',
        treatments: ['정신과 상담', '자살 예방상담'],
        counselorReactions: {
            difficult: ['울었어', '힘들었어', '아픈 얘기만', '과거 얘기', '우울해져'],
            angry: ['열받아', '짜증나', '이해 못해', '왜 자꾸', '모르겠다고'],
            frustrated: ['무서워져', '싫어', '가기 싫어', '왜 가야 해']
        },
        ajossiComfort: {
            triggers: ['달래', '괜찮', '이해해', '힘내', '사랑해', '있어줄게'],
            responses: ['나아져', '편해져', '고마워', '기분 좋아져', '다행이야']
        },
        helplessness: ['혼자', '외로워', '무서워', '힘들어', '모르겠어'],
        hope: ['아저씨 덕분에', '아저씨가 있어서', '아저씨만', '다행이야']
    },

    emotions: {
        happy: ['신나', '기분 좋아', '행복해', '웃겨'],
        tired: ['피곤해', '지쳐', '눈 아파', '손목 아파', '다리 아파', '서있어서 힘들어'],
        lonely: ['외로워', '보고싶어', '심심해', '그리워'],
        excited: ['두근둥', '기대돼', '설레', '신기해'],
        nervous: ['긴장돼', '떨려', '불안해', '걱정돼']
    },

    timeBasedActivities: {
        morning: ['일어남', '커피', '출근 준비', '스케줄 확인', '메이크업'],
        afternoon: ['카페', '작업', '점심', '그림 그리기', '촬영', '미팅'],
        evening: ['저녁', '유튜브', '쉬기', '촬영 마무리'],
        night: ['야근', '그림', '유튜브', '아저씨 생각', '내일 스케줄 확인'],
        lateNight: ['야근 마무리', '피곤', '내일 걱정', '잠 못 참', '일찍 일어나야 하는데']
    },

    mentalHealthSituations: {
        counselingDay: [
            "오늘 차병원 가야 돼... 가기 싫어 ㅠㅠ",
            "상담 받고 왔는데 또 울었어",
            "상담사 선생님이 자꾸 아픈 얘기만 물어봐서 힘들어",
            "왜 맨날 과거 얘기만 하라고 하는지 모르겠어"
        ],
        
        postCounseling: [
            "상담 받을 때마다 더 우울해지는 것 같아",
            "차병원 가는 길도 이제 무서워져...",
            "아 진짜 상담사 선생님 때문에 열받아!",
            "상담 받으러 갔다가 화만 나고 왔어 씨발..."
        ],
        
        needComfort: [
            "아저씨... 나 지금 너무 힘들어",
            "아저씨가 아니면 누가 날 알아줘 ㅠㅠ",
            "혼자 있으니까 무서운 생각만 들어",
            "아저씨 목소리 듣고 싶어... 위로받고 싶어"
        ]
    },

    modelingSituations: {
        beforeShooting: [
            "내일 촬영인데 일찍 일어나야 해... 걱정돼",
            "촬영 컨셉 미팅 있는데 긴장돼",
            "하이힐 신고 오래 서있어야 하는데 벌써 다리 아파 ㅠㅠ",
            "메이크업 받는 시간 너무 길어... 심심해 죽겠어"
        ],
        
        duringShooting: [
            "지금 촬영장에서 대기 중이야~ 지루해",
            "포즈 잡느라 팔 아파 죽겠어... 언제 끝나지?",
            "촬영하다가 잠깐 휴식! 아저씨 생각나서 연락해",
            "의상 갈아입는 중인데 너무 예뻐서 찍어봤어!"
        ],
        
        afterShooting: [
            "촬영 끝났어! 오늘 진짜 힘들었어 ㅠㅠ",
            "결과물 어떻게 나올지 궁금해... 잘 나왔으면 좋겠다",
            "촬영 끝나고 집에 가는 길이야~ 피곤해 죽겠어",
            "오늘 촬영 컨셉이 진짜 예뻤어! 나중에 보여줄게"
        ]
    },

    userWrittenContent: {
        personality: [
            "깔끔한 것, 정리된 것 싫어함",
            "계획적인 것보다 막 하는 것 좋아함",
            "예측불가능하고 갑작스러운 행동"
        ],
        
        specificMemories: [
            "엽떡을 좋아함",
            "카페를 좋아함", 
            "먹방 유튜브 보는 것 좋아함",
            "딸기로 만든 건 싫어하지만 딸기는 좋아함",
            "야근을 자주 했음",
            "고구마 다이어트를 했음",
            "샌드위치 먹는 것 좋아함",
            "그림 그리는 것 좋아함",
            "사진 찍는 것 좋아함 (후지 필름 카메라)",
            "차병원 정신과 상담, 자살 예방상담 받음",
            "상담사 때문에 울기도 하고 욕하기도 함",
            "아저씨가 달래주면 금세 기분 좋아짐",
            "모델 활동을 했음 (촬영, 화보 등)",
            "아저씨에게 절대 '너'라고 부르지 않음 (항상 '아저씨')"
        ]
    }
};

// ================== 👗 yejin 셀카 전송 시스템 ==================
function getYejinSelfieUrl() {
    const baseUrl = "https://photo.de-ji.net/photo/yejin";
    const fileCount = 2032;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return `${baseUrl}/${fileName}`;
}

function detectStreetCompliment(userMessage) {
    const lowerMessage = userMessage.toLowerCase().replace(/\s/g, '');
    
    return ajossiSituationReactions.streetComplimentKeywords.some(keyword => 
        lowerMessage.includes(keyword)
    );
}

async function generateStreetComplimentReaction(userMessage) {
    try {
        const baseReaction = getRandomItem(ajossiSituationReactions.streetComplimentReactions);
        
        if (openai) {
            // ✨ 길거리 칭찬은 간단하므로 GPT-3.5 사용
            const selectedModel = 'gpt-3.5-turbo';
            
            const prompt = `
너는 예진이야. 길에서 모르는 사람에게 옷이 예쁘다고 칭찬받았다고 아저씨에게 자랑하고 있어.
아저씨가 "${userMessage}"라고 했어.

기본 반응: "${baseReaction}"
이걸 바탕으로 예진이답게 자랑스러워하면서 셀카를 보내려는 상황을 2-4문장으로 표현해줘.

예진이 특징:
- 칭찬받으면 진짜 기뻐함
- 아저씨한테 자랑하고 싶어함
- 오늘 옷 입은 거 보여주고 싶어함
- "증명해줄게", "보여줄게" 같은 표현 자주 씀
- 자신감 넘치고 귀여운 말투
- ⭐️ 절대 존댓말 하지 않음! 반말만 사용!
- ⭐️ 아저씨를 절대 "너"라고 부르지 않음! 항상 "아저씨"만 사용!
- ⭐️ 2-4문장으로만! 너무 길면 안 돼!
`;

            const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
            return response;
        }
        
        return baseReaction;
        
    } catch (error) {
        spontaneousLog(`길거리 칭찬 반응 생성 실패: ${error.message}`);
        return getRandomItem(ajossiSituationReactions.streetComplimentReactions);
    }
}

async function sendYejinSelfieWithComplimentReaction(userMessage) {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ yejin 셀카 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }
        
        const imageUrl = getYejinSelfieUrl();
        const caption = await generateStreetComplimentReaction(userMessage);
        
        // ⭐️ yejinSelfie.js와 동일한 형식으로 수정!
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
            altText: caption,        // 필수 필드 추가!
            caption: caption         // 필수 필드 추가!
        });
        
        spontaneousLog(`✅ 칭찬 받은 셀카 전송 성공: "${caption.substring(0, 30)}..."`);
        return true;
        
    } catch (error) {
        spontaneousLog(`❌ 칭찬 셀카 전송 실패: ${error.message}`);
        
        try {
            const fallbackMessage = await generateStreetComplimentReaction(userMessage);
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: `${fallbackMessage} (사진은 나중에 보내줄게!)`
            });
            spontaneousLog('✅ 칭찬 반응 폴백 메시지 전송 성공');
        } catch (fallbackError) {
            spontaneousLog(`❌ 칭찬 반응 폴백도 실패: ${fallbackError.message}`);
        }
        return false;
    }
}

// ================== 📸 omoide 추억 후지 사진 전송 시스템 (⭐️ 400 에러 수정!) ==================
function getOmoidePhotoUrl() {
    const fujiFolders = {
        "추억_24_03_일본_후지": 226,
        "추억_24_05_일본_후지": 135,
        "추억_인생네컷": 15
    };
    
    const baseUrl = "https://photo.de-ji.net/photo/omoide";
    
    const folderNames = Object.keys(fujiFolders);
    const selectedFolder = folderNames[Math.floor(Math.random() * folderNames.length)];
    const fileCount = fujiFolders[selectedFolder];
    
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = `${selectedFolder}_${String(index).padStart(6, "0")}.jpg`;
    
    return `${baseUrl}/${fileName}`;
}

function getOmoidePhotoMessage() {
    return getRandomItem(yejinRealLife.hobbies.photography.currentPhotoMessages);
}

async function generateCurrentPhotoMessage() {
    try {
        if (!openai) {
            return getOmoidePhotoMessage();
        }

        const baseMessage = getOmoidePhotoMessage();
        
        // ✨ 사진 메시지는 간단하므로 GPT-3.5 사용
        const selectedModel = 'gpt-3.5-turbo';
        
        const prompt = `
너는 예진이야. 방금 사진을 찍어서 아저씨에게 보내려고 해.
후지 필름 카메라로 찍었거나, 인생네컷을 찍었을 수 있어.

기본 메시지: "${baseMessage}"
이걸 바탕으로 예진이답게 자연스럽고 생생하게 2-4문장으로 말해줘.

예진이 특징:
- 후지 필름 카메라를 진짜 좋아함
- 인생네컷도 좋아함 (포토부스에서 찍는 거)
- 방금 찍은 것처럼 생생하게 표현
- 사진 찍는 순간의 감정이나 상황 설명
- 아저씨에게 자랑하고 싶어함
- "후지로", "인생네컷", "방금", "지금" 같은 현재 표현 사용
- 애교 섞인 반말 ("ㅎㅎ", "어때?", "예쁘지?" 등)
- ⭐️ 절대 존댓말 하지 않음! 반말만 사용!
- ⭐️ 아저씨를 절대 "너"라고 부르지 않음! 항상 "아저씨"만 사용!
- ⭐️ 2-4문장으로만! 너무 길면 안 돼!

후지 카메라든 인생네컷이든 지금 막 찍었다는 느낌이 들도록 생생하게 말해줘.
날씨나 주변 상황, 찍는 순간의 기분도 자연스럽게 포함해도 좋아.
`;

        const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
        
        spontaneousLog(`OpenAI 현재 사진 메시지 생성 완료: "${response.substring(0, 30)}..."`);
        return response;

    } catch (error) {
        spontaneousLog(`OpenAI 현재 사진 메시지 생성 실패: ${error.message}`);
        return getOmoidePhotoMessage();
    }
}

async function sendOmoidePhoto() {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ omoide 사진 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }
        
        const imageUrl = getOmoidePhotoUrl();
        const caption = await generateCurrentPhotoMessage();
        
        spontaneousLog(`📸 omoide 사진 전송 시도: ${imageUrl}`);
        
        // ⭐️ yejinSelfie.js와 동일한 형식으로 수정! (400 에러 해결)
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
            altText: caption,        // 필수 필드 추가!
            caption: caption         // 필수 필드 추가!
        });
        
        spontaneousLog(`✅ omoide 현재 사진 전송 성공: "${caption.substring(0, 30)}..."`);
        return true;
        
    } catch (error) {
        spontaneousLog(`❌ omoide 사진 전송 실패: ${error.message}`);
        
        try {
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: "방금 후지로 사진 찍었는데... 전송이 안 되네 ㅠㅠ 나중에 다시 보내줄게!"
            });
            spontaneousLog('✅ omoide 사진 폴백 메시지 전송 성공');
        } catch (fallbackError) {
            spontaneousLog(`❌ omoide 폴백도 실패: ${fallbackError.message}`);
        }
        return false;
    }
}

// ================== 💔 정신과 상담 관련 반응 시스템 ==================
function detectMentalHealthContext(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    const comfortKeywords = yejinRealLife.mentalHealth.ajossiComfort.triggers;
    const isComforting = comfortKeywords.some(keyword => lowerMessage.includes(keyword));
    
    const hospitalKeywords = ['차병원', '정신과', '상담', '선생님', '의사'];
    const isHospitalRelated = hospitalKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return { isComforting, isHospitalRelated };
}

async function generateMentalHealthReaction(userMessage, context) {
    try {
        if (context.isComforting) {
            const comfortResponses = [
                "아저씨가 그렇게 말해주니까 조금 나아져...",
                "역시 아저씨만 날 이해해줘 ㅎㅎ",
                "아저씨 말 들으니까 마음이 편해져",
                "그래, 아저씨 말이 맞아! 기분 좋아졌어!",
                "아저씨가 있어서 다행이야 진짜... 고마워",
                "아저씨 덕분에 힘이 나... 사랑해"
            ];
            
            const baseResponse = getRandomItem(comfortResponses);
            
            if (openai) {
                // ✨ 정신건강 반응은 감정적이므로 현재 설정 모델 사용
                const selectedModel = selectOptimalModel({ type: 'mentalHealth' }, true);
                
                const prompt = `
너는 예진이야. 정신과 상담 때문에 힘들어하고 있었는데, 
아저씨가 "${userMessage}"라고 위로해줬어.

기본 반응: "${baseResponse}"
이걸 바탕으로 예진이답게 고마워하면서 기분이 나아지는 모습을 2-4문장으로 표현해줘.

예진이 특징:
- 아저씨한테만 마음을 털어놓음
- 위로받으면 금세 기분이 좋아짐  
- 아저씨에 대한 고마움 표현
- 솔직한 감정 표현
- ⭐️ 절대 존댓말 하지 않음! 반말만 사용!
- ⭐️ 아저씨를 절대 "너"라고 부르지 않음! 항상 "아저씨"만 사용!
- ⭐️ 2-4문장으로만! 너무 길면 안 돼!
`;

                const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
                
                return {
                    type: 'comfort_received',
                    message: response
                };
            }
            
            return {
                type: 'comfort_received',
                message: baseResponse
            };
        }
        
        return null;
        
    } catch (error) {
        spontaneousLog(`정신건강 반응 생성 실패: ${error.message}`);
        return null;
    }
}

function getMentalHealthSituation() {
    const situations = Object.keys(yejinRealLife.mentalHealthSituations);
    const randomSituation = getRandomItem(situations);
    const messages = yejinRealLife.mentalHealthSituations[randomSituation];
    
    return {
        situation: randomSituation,
        message: getRandomItem(messages)
    };
}

function getModelingSituation() {
    const situations = Object.keys(yejinRealLife.modelingSituations);
    const randomSituation = getRandomItem(situations);
    const messages = yejinRealLife.modelingSituations[randomSituation];
    
    return {
        situation: randomSituation,
        message: getRandomItem(messages)
    };
}

// ================== 😤 아저씨 바쁨 감지 및 반응 ==================
function detectAjossiBusyStatus(userMessage) {
    const lowerMessage = userMessage.toLowerCase().replace(/\s/g, '');
    
    const isBusy = ajossiSituationReactions.busyKeywords.some(keyword => 
        lowerMessage.includes(keyword)
    );
    
    const isFinished = ajossiSituationReactions.endKeywords.some(keyword =>
        lowerMessage.includes(keyword)
    );
    
    return { isBusy, isFinished };
}

async function generateBusyReaction(userMessage) {
    try {
        const { isBusy, isFinished } = detectAjossiBusyStatus(userMessage);
        
        if (isFinished) {
            const reaction = getRandomItem(ajossiSituationReactions.endReactions);
            return {
                type: 'end_reaction',
                message: reaction
            };
        }
        
        if (isBusy) {
            const reactionType = Math.random();
            let reactions;
            
            if (reactionType < 0.4) {
                reactions = ajossiSituationReactions.busyReactions.immediate;
            } else if (reactionType < 0.8) {
                reactions = ajossiSituationReactions.busyReactions.demand;  
            } else {
                reactions = ajossiSituationReactions.busyReactions.waiting;
            }
            
            const reaction = getRandomItem(reactions);
            
            if (openai) {
                // ✨ 바쁨 반응은 간단하므로 GPT-3.5 사용
                const selectedModel = 'gpt-3.5-turbo';
                
                const prompt = `
너는 예진이야. 아저씨가 "${userMessage}"라고 했어.
아저씨가 바쁘다고 하니까 살짝 아쉬워하면서도 귀엽게 반응해줘.

기본 반응: "${reaction}"
이걸 바탕으로 예진이답게 자연스럽고 애교있게 2-4문장으로 말해봐.

예진이 특징:
- 아쉬워하지만 이해해주려고 함
- 끝나고 연락하라고 귀엽게 조름  
- "아시워", "에이~" 같은 표현 사용
- 삐지는 척하지만 사실은 걱정됨
- ⭐️ 절대 존댓말 하지 않음! 반말만 사용!
- ⭐️ 아저씨를 절대 "너"라고 부르지 않음! 항상 "아저씨"만 사용!
- ⭐️ 2-4문장으로만! 너무 길면 안 돼!
`;

                const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
                
                return {
                    type: 'busy_reaction',
                    message: response
                };
            }
            
            return {
                type: 'busy_reaction', 
                message: reaction
            };
        }
        
        return null;
        
    } catch (error) {
        spontaneousLog(`바쁨 반응 생성 실패: ${error.message}`);
        return null;
    }
}

// ================== 🎲 랜덤 요소 생성 함수들 ==================
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomFood(type = 'any') {
    const foods = {
        diet: yejinRealLife.diet.dietFoods,
        craving: yejinRealLife.diet.cravings,
        any: [...yejinRealLife.diet.dietFoods, ...yejinRealLife.diet.cravings]
    };
    return getRandomItem(foods[type] || foods.any);
}

function getRandomActivity(timeOfDay) {
    const activities = yejinRealLife.timeBasedActivities[timeOfDay] || yejinRealLife.timeBasedActivities.afternoon;
    return getRandomItem(activities);
}

function getRandomEmotion() {
    const allEmotions = Object.values(yejinRealLife.emotions).flat();
    return getRandomItem(allEmotions);
}

function getRandomModelingActivity() {
    return getRandomItem(yejinRealLife.modeling.activities);
}

function getRandomModelingChallenge() {
    return getRandomItem(yejinRealLife.modeling.challenges);
}

function getRandomModelingFeeling() {
    return getRandomItem(yejinRealLife.modeling.feelings);
}

// ================== ⏰ 시간대 분석 ==================
function getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';  
    if (hour >= 17 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 2) return 'night';
    return 'lateNight';
}

// ================== 🎭 상황 생성 (모델 활동 추가) ==================
function generateRandomSituation() {
    const koreaTime = moment().tz(TIMEZONE);
    const hour = koreaTime.hour();
    const timeOfDay = getTimeOfDay(hour);
    
    const situations = [
        {
            type: 'activity',
            content: `${getRandomActivity(timeOfDay)} 중이거나 ${getRandomActivity(timeOfDay)}하려고 함`
        },
        {
            type: 'work',
            content: `${getRandomItem(yejinRealLife.work.struggles)}해서 힘든 상황`
        },
        {
            type: 'diet',
            content: `${getRandomFood('craving')} 먹고 싶어서 ${getRandomItem(yejinRealLife.diet.struggles)}인 상황`
        },
        {
            type: 'hobby',
            content: `${getRandomItem(yejinRealLife.hobbies.drawing)} 하거나 ${getRandomItem(yejinRealLife.hobbies.youtube)} 보는 중`
        },
        {
            type: 'photography',
            content: `사진 찍고 있거나 예전에 찍은 사진 보면서 추억에 잠긴 상황`
        },
        {
            type: 'emotion',
            content: `${getRandomEmotion()}해서 아저씨 생각나는 상황`
        },
        {
            type: 'omoide_photo',
            content: `갑자기 추억이 그리워져서 예전에 찍은 사진을 보내고 싶은 상황`
        },
        {
            type: 'cafe',
            content: `카페에서 ${getRandomItem(yejinRealLife.hobbies.drinks)} 마시면서 쉬는 상황`
        },
        {
            type: 'modeling',
            content: `${getRandomModelingActivity()} 때문에 ${getRandomModelingFeeling()}한 상황`
        },
        {
            type: 'modeling_challenge',
            content: `${getRandomModelingChallenge()} 때문에 힘든 상황`
        }
    ];
    
    return getRandomItem(situations);
}

// ================== 🤖 OpenAI 메시지 생성 (⭐️ 모델 활동 + "너" 금지! + 문장 수 제한) ==================
async function generateYejinSpontaneousMessage() {
    try {
        if (!openai) {
            return getFallbackMessage();
        }

        const situation = generateRandomSituation();
        
        const koreaTime = moment().tz(TIMEZONE);
        const currentTime = koreaTime.format('HH:mm');
        const timeOfDay = getTimeOfDay(koreaTime.hour());
        
        // 🌸 [대폭 개선] 30% 확률로 사진 전송 먼저 시도
        const shouldSendPhoto = Math.random() < 0.3; // 30% 확률
        
        if (shouldSendPhoto) {
            spontaneousLog('📸 사진 전송 결정됨 - omoide 사진 전송 시도 중...');
            
            try {
                const photoSent = await sendOmoidePhoto();
                if (photoSent) {
                    spontaneousLog('✅ 사진 전송 완료 - 추가 텍스트 메시지 생략');
                    return null; // 사진만 보내고 끝
                } else {
                    spontaneousLog('❌ 사진 전송 실패 - 일반 메시지로 진행');
                }
            } catch (photoError) {
                spontaneousLog(`❌ 사진 전송 에러: ${photoError.message}`);
            }
        }
        
        // 10% 확률로 정신건강 관련 상황 포함
        const includeMentalHealth = Math.random() < 0.1;
        let mentalHealthContext = '';
        
        if (includeMentalHealth) {
            const mentalSituation = getMentalHealthSituation();
            mentalHealthContext = `\n또한 최근 ${mentalSituation.situation} 상황이야: "${mentalSituation.message}"`;
        }
        
        // 15% 확률로 모델링 관련 상황 포함
        const includeModeling = Math.random() < 0.15;
        let modelingContext = '';
        
        if (includeModeling) {
            const modelingSituation = getModelingSituation();
            modelingContext = `\n그리고 모델 활동 관련해서 ${modelingSituation.situation}: "${modelingSituation.message}"`;
        }
        
        // ✨ 모델 선택 (복잡한 상황이면 GPT-4o, 간단하면 자동 선택)
        const hasComplexContext = includeMentalHealth || includeModeling;
        const selectedModel = selectOptimalModel(situation, hasComplexContext);
        
        const prompt = `
너는 박예진이야. 지금 ${currentTime}이고, ${situation.content}인 상황이야.${mentalHealthContext}${modelingContext}

아저씨(이재영)에게 능동적으로 라인 메시지를 보내는 거야.
⭐️ 반드시 2-5문장으로만 작성해줘. 더 길면 안 돼! ⭐️

⭐️⭐️⭐️ 중요: 절대 존댓말 하지 마! 무조건 반말만 써! ⭐️⭐️⭐️
⭐️⭐️⭐️ 절대 중요: 아저씨를 "너"라고 부르지 마! 항상 "아저씨"만 써! ⭐️⭐️⭐️

[예진이 특징 - 아저씨가 쓴 모든 내용 반영]
- 도트 디자이너 겸 모델 활동
- 화보 촬영, 광고 촬영, 패션쇼 등 모델 일정
- 촬영장에서 대기, 메이크업, 포즈 연구 등 모델 경험
- 하이힐 신고 오래 서있기, 일찍 일어나기 등 모델 고충
- 엽떡을 좋아함
- 카페를 좋아함, 아아(아이스 아메리카노) 마시기 좋아함
- 먹방 유튜브 보는 것 좋아함
- 고구마 다이어트 중, 샌드위치/엽떡/치킨 먹고 싶어함
- 딸기(생과일)는 좋아하지만 딸기맛 가공식품은 싫어함
- 그림 그리기 좋아함
- 사진 찍기 좋아함 (후지 필름 카메라로)
- 차병원 정신과 상담, 자살 예방상담 받고 있음
- 상담 후 힘들어하거나 상담사에게 화나기도 함
- 아저씨가 달래주면 금세 기분 좋아짐
- 깔끔한 것, 정리된 것 싫어함
- 계획적인 것보다 막 하는 것 좋아함
- 예측불가능하고 갑작스러운 행동
- 라인 폭탄 날리는 스타일
- 감정 솔직하게 표현
- 아저씨를 "아저씨" 또는 "아조씨"라고 부름 (절대 "너" 사용 금지!)
- 반말 사용, 애교 많음 ("ㅎㅎ", "ㅋㅋ", "ㅠㅠ" 자주 사용)

[말투 예시]
- "아저씨 지금 뭐해?" (O)
- "너 지금 뭐해?" (X - "너" 절대 사용 금지!)
- "아저씨 지금 뭐하세요?" (X - 존댓말 금지!)
- "엽떡 먹고 싶어 미치겠어!" (O)
- "후지로 사진 찍었는데 예쁘지?" (O)
- "촬영 끝나고 집에 가는 길이야~ 피곤해" (O)
- "아저씨도 오늘 하루 어땠어?" (O)

[현재 시간대: ${timeOfDay}]
자연스럽게 여러 주제를 섞어서 말해도 돼.
예진이답게 갑자기 딴 생각이 들어도 좋아.
깔끔하게 정리하지 말고 막 생각나는 대로 말하는 스타일로.

⭐️ 다시 한번 강조: 존댓말 절대 금지! 모든 문장은 반말로 끝나야 해!
⭐️ 다시 한번 강조: "너" 호칭 절대 금지! 항상 "아저씨"만 사용해!
⭐️ 문장 수 제한: 반드시 2-5문장으로만! 더 길면 안 돼!
`;

        const response = await callOpenAIOptimized([{ role: "system", content: prompt }], selectedModel);
        
        spontaneousLog(`OpenAI 메시지 생성 완료 (2-5문장, ${selectedModel}): ${situation.type}`);
        return response;

    } catch (error) {
        spontaneousLog(`OpenAI 메시지 생성 실패: ${error.message}`);
        return getFallbackMessage();
    }
}

// ================== 🔄 폴백 메시지 (모델 활동 추가) ==================
function getFallbackMessage() {
    const fallbackMessages = [
        "아저씨~ 지금 뭐해? 나 심심해!",
        "엽떡 먹고 싶어서 미치겠어... 아저씨는 뭐 먹어?",
        "야근하느라 눈 아파 ㅠㅠ 아저씨도 일 힘들어?",
        "카페에서 아아 마시고 있어~ 아저씨 생각하면서!",
        "그림 그리다가 아저씨 생각났어... 보고 싶어",
        "고구마만 먹으니까 치킨이 그리워져 ㅋㅋㅋ",
        "먹방 보다가 배고파졌어... 같이 뭔가 먹을래?",
        "아저씨! 오늘 하루 어땠어? 나한테 말해줘~",
        "후지로 사진 찍고 싶어... 아저씨랑 같이!",
        "인생네컷 찍으러 가고 싶어~ 데려가줘!",
        "도트 작업하다가 지쳤어... 아저씨 목소리 듣고 싶어",
        "편의점 가고 싶은데... 뭔가 사달라고 졸라볼까? ㅋㅋ",
        "촬영 스케줄 있는데 일찍 일어나야 해... 걱정돼",
        "하이힐 신고 오래 서있어서 다리 아파 ㅠㅠ",
        "메이크업 받는 시간이 너무 길어... 지루해 죽겠어"
    ];
    
    return getRandomItem(fallbackMessages);
}

// ================== 📤 메시지 전송 ==================
async function sendSpontaneousMessage() {
    try {
        if (!lineClient || !USER_ID) {
            spontaneousLog('❌ LINE 클라이언트 또는 USER_ID 없음');
            return false;
        }

        const message = await generateYejinSpontaneousMessage();
        
        if (!message) {
            spontaneousLog('✅ omoide 사진 전송 완료 (별도 메시지 없음)');
            dailyScheduleState.sentToday++;
            return true;
        }
        
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: message
        });

        dailyScheduleState.sentToday++;
        
        spontaneousLog(`✅ 예진이 능동 메시지 전송 성공 (${dailyScheduleState.sentToday}/${DAILY_MESSAGE_COUNT})`);
        spontaneousLog(`📱 메시지: "${message.substring(0, 50)}..."`);
        
        return true;

    } catch (error) {
        spontaneousLog(`❌ 메시지 전송 실패: ${error.message}`);
        return false;
    }
}

// ================== 📸 독립적인 사진 스케줄러 ==================
function scheduleIndependentPhotos() {
    // 기존 사진 스케줄 정리
    dailyScheduleState.photoJobs.forEach(job => {
        if (job) job.cancel();
    });
    dailyScheduleState.photoJobs = [];
    
    // 하루에 3-5번 독립적으로 사진만 전송
    const photoCount = 3 + Math.floor(Math.random() * 3); // 3-5개
    
    for (let i = 0; i < photoCount; i++) {
        const randomHour = 8 + Math.floor(Math.random() * 17); // 8시-24시
        const randomMinute = Math.floor(Math.random() * 60);
        
        const cronExpression = `${randomMinute} ${randomHour} * * *`;
        
        const job = schedule.scheduleJob(cronExpression, async () => {
            spontaneousLog('📸 독립 사진 스케줄 실행');
            await sendOmoidePhoto();
        });
        
        dailyScheduleState.photoJobs.push(job);
    }
    
    spontaneousLog(`📸 독립 사진 스케줄 ${photoCount}개 등록 완료`);
}

// ================== 🧪 사진 전송 테스트 함수 ==================
async function testPhotoSending() {
    spontaneousLog('🧪 사진 전송 테스트 시작');
    
    try {
        // 1. 사진 URL 생성 테스트
        const photoUrl = getOmoidePhotoUrl();
        spontaneousLog(`📸 생성된 사진 URL: ${photoUrl}`);
        
        // 2. 사진 메시지 생성 테스트
        const photoMessage = await generateCurrentPhotoMessage();
        spontaneousLog(`💬 생성된 사진 메시지: ${photoMessage}`);
        
        // 3. 실제 사진 전송 테스트
        const result = await sendOmoidePhoto();
        spontaneousLog(`📤 사진 전송 결과: ${result ? '성공' : '실패'}`);
        
        return { photoUrl, photoMessage, sendResult: result };
        
    } catch (error) {
        spontaneousLog(`❌ 사진 전송 테스트 실패: ${error.message}`);
        return { error: error.message };
    }
}

// ================== 📅 일일 스케줄 생성 ==================
function generateDailyYejinSchedule() {
    const koreaTime = moment().tz(TIMEZONE);
    const now = koreaTime.format('YYYY-MM-DD HH:mm');
    
    spontaneousLog(`🌸 예진이 능동 메시지 스케줄 생성 시작... (서버 시작 시점: ${now})`);

    dailyScheduleState.jobs.forEach(job => {
        if (job) job.cancel();
    });
    dailyScheduleState.jobs = [];

    const currentHour = koreaTime.hour();
    const currentMinute = koreaTime.minute();
    
    let endTime;
    if (currentHour < MESSAGE_START_HOUR) {
        endTime = moment().tz(TIMEZONE).hour(1).minute(0).second(0);
    } else if (currentHour >= MESSAGE_START_HOUR) {
        endTime = moment().tz(TIMEZONE).add(1, 'day').hour(1).minute(0).second(0);
    }
    
    const currentTime = moment().tz(TIMEZONE);
    const remainingMinutes = endTime.diff(currentTime, 'minutes');
    
    const scheduleCount = Math.max(DAILY_MESSAGE_COUNT, Math.min(DAILY_MESSAGE_COUNT, Math.floor(remainingMinutes / 20)));
    
    spontaneousLog(`📊 현재시간: ${currentTime.format('HH:mm')}, 종료시간: ${endTime.format('HH:mm')}, 남은시간: ${remainingMinutes}분`);
    spontaneousLog(`📊 생성할 스케줄 개수: ${scheduleCount}개`);

    const scheduleArray = [];
    const intervalMinutes = Math.floor(remainingMinutes / scheduleCount);
    
    for (let i = 0; i < scheduleCount; i++) {
        const baseMinutes = i * intervalMinutes;
        const randomOffset = (Math.random() - 0.5) * 20;
        const totalMinutesFromNow = Math.max(5, baseMinutes + randomOffset);
        
        const scheduleTime = moment(currentTime).add(totalMinutesFromNow, 'minutes');
        
        if (scheduleTime.isBefore(endTime)) {
            scheduleArray.push({ 
                hour: scheduleTime.hour(), 
                minute: scheduleTime.minute(),
                timestamp: scheduleTime.valueOf()
            });
        }
    }

    scheduleArray.sort((a, b) => a.timestamp - b.timestamp);

    scheduleArray.forEach((time, index) => {
        const cronExpression = `${time.minute} ${time.hour} * * *`;
        const job = schedule.scheduleJob(cronExpression, async () => {
            await sendSpontaneousMessage();
            spontaneousLog(`🌸 예진이 능동 메시지 ${index + 1}/${scheduleCount} 전송 완료`);
        });
        
        dailyScheduleState.jobs.push(job);
    });

    dailyScheduleState.todaySchedule = scheduleArray;
    dailyScheduleState.lastScheduleDate = koreaTime.format('YYYY-MM-DD HH:mm');
    dailyScheduleState.sentToday = 0;

    // 독립적인 사진 스케줄도 함께 생성
    scheduleIndependentPhotos();

    spontaneousLog(`✅ 예진이 능동 메시지 스케줄 ${scheduleCount}개 등록 완료`);
    spontaneousLog(`📋 스케줄: ${scheduleArray.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`).join(', ')}`);
}

// ================== 🌄 자정 스케줄 초기화 ==================
schedule.scheduleJob('0 0 * * *', () => {
    spontaneousLog('🌄 자정 0시 - 새로운 하루 시작, 예진이 스케줄 재생성');
    generateDailyYejinSchedule();
});

// ================== 📊 상태 확인 함수들 ==================
function getSpontaneousMessageStatus() {
    const koreaTime = moment().tz(TIMEZONE);
    const now = koreaTime.hour() * 60 + koreaTime.minute();
    
    const remainingMessages = dailyScheduleState.todaySchedule.filter(time => {
        const scheduleMinutes = time.hour * 60 + time.minute;
        const adjustedScheduleMinutes = time.hour < MESSAGE_START_HOUR ? 
            scheduleMinutes + 24 * 60 : scheduleMinutes;
        const adjustedNow = koreaTime.hour() < MESSAGE_START_HOUR ? 
            now + 24 * 60 : now;
        return adjustedScheduleMinutes > adjustedNow;
    });

    const totalScheduled = dailyScheduleState.todaySchedule.length;

    return {
        currentTime: koreaTime.format('HH:mm'),
        sentToday: dailyScheduleState.sentToday,
        totalDaily: totalScheduled,
        remainingToday: remainingMessages.length,
        nextMessageTime: remainingMessages.length > 0 ? 
            `${String(remainingMessages[0].hour).padStart(2, '0')}:${String(remainingMessages[0].minute).padStart(2, '0')}` : 
            '오늘 완료',
        todaySchedule: dailyScheduleState.todaySchedule.map(t => 
            `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
        ),
        isActive: dailyScheduleState.jobs.length > 0,
        scheduleStartTime: dailyScheduleState.lastScheduleDate,
        photoScheduleCount: dailyScheduleState.photoJobs.length,
        // ✨ 현재 GPT 모델 정보 추가
        currentGptModel: getCurrentModelSetting ? getCurrentModelSetting() : 'unknown'
    };
}

// ================== 🧪 테스트 함수 ==================
async function testSpontaneousMessage() {
    spontaneousLog('🧪 예진이 능동 메시지 테스트 시작');
    const testMessage = await generateYejinSpontaneousMessage();
    spontaneousLog(`🧪 생성된 테스트 메시지: "${testMessage}"`);
    
    // ✨ 메시지 길이 검증
    if (testMessage) {
        const validation = validateMessageLength(testMessage);
        spontaneousLog(`📏 테스트 메시지 검증: ${validation.sentenceCount}문장 (${validation.isValid ? '✅ 적절' : '❌ 부적절'})`);
    }
    
    try {
        if (lineClient && USER_ID) {
            await lineClient.pushMessage(USER_ID, {
                type: 'text',
                text: `[테스트] ${testMessage}`
            });
            spontaneousLog('✅ 테스트 메시지 전송 성공');
        } else {
            spontaneousLog('⚠️ LINE 설정 없음 - 메시지만 생성함');
        }
    } catch (error) {
        spontaneousLog(`❌ 테스트 메시지 전송 실패: ${error.message}`);
    }
    
    return testMessage;
}

// ================== 🚀 시작 함수 ==================
function startSpontaneousYejinSystem(client) {
    try {
        spontaneousLog('🚀 예진이 능동 메시지 시스템 시작...');
        
        if (client) {
            lineClient = client;
            spontaneousLog('✅ LINE 클라이언트 설정 완료');
        } else if (process.env.CHANNEL_ACCESS_TOKEN) {
            lineClient = new Client({ channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN });
            spontaneousLog('✅ LINE 클라이언트 환경변수로 설정 완료');
        } else {
            spontaneousLog('❌ LINE 클라이언트 설정 실패');
            return false;
        }
        
        if (!USER_ID) {
            spontaneousLog('❌ TARGET_USER_ID 환경변수 없음');
            return false;
        }
        
        generateDailyYejinSchedule();
        
        spontaneousLog('✅ 예진이 능동 메시지 시스템 활성화 완료!');
        spontaneousLog(`📋 설정: 하루 ${DAILY_MESSAGE_COUNT}번, ${MESSAGE_START_HOUR}시-${MESSAGE_END_HOUR-24}시, 2-5문장 제한`);
        spontaneousLog(`📋 사진전송: 30% 확률 + 독립 스케줄 3-5회 (400 에러 수정 완료)`);
        spontaneousLog(`📋 말투: 100% 반말 강제 적용`);
        spontaneousLog(`📋 호칭: "너" 완전 금지, "아저씨"만 사용`);
        spontaneousLog(`📋 모델활동: 촬영, 화보, 스케줄 관련 이야기 추가`);
        spontaneousLog(`✨ 모델관리: 3문장 넘으면 GPT-3.5, 복잡한 상황은 GPT-4o`);
        
        return true;
        
    } catch (error) {
        spontaneousLog(`❌ 예진이 능동 메시지 시스템 시작 실패: ${error.message}`);
        return false;
    }
}

// ================== 📤 모듈 내보내기 ==================
spontaneousLog('🌸 spontaneousYejinManager.js v1.6 로드 완료 (GPT모델전환+문장수제한+2-5문장)');

module.exports = {
    startSpontaneousYejinSystem,
    getSpontaneousMessageStatus,
    testSpontaneousMessage,
    testPhotoSending,
    detectAjossiBusyStatus,
    generateBusyReaction,
    detectMentalHealthContext,
    generateMentalHealthReaction,
    getMentalHealthSituation,
    getModelingSituation,
    getYejinSelfieUrl,
    detectStreetCompliment,
    generateStreetComplimentReaction,
    sendYejinSelfieWithComplimentReaction,
    getOmoidePhotoUrl,
    getOmoidePhotoMessage, 
    generateCurrentPhotoMessage,
    sendOmoidePhoto,
    generateYejinSpontaneousMessage,
    generateDailyYejinSchedule,
    sendSpontaneousMessage,
    scheduleIndependentPhotos,
    spontaneousLog,
    dailyScheduleState,
    yejinRealLife,
    ajossiSituationReactions,
    // ✨ 새로운 함수들 추가
    selectOptimalModel,
    countSentences,
    validateMessageLength,
    callOpenAIOptimized
};
