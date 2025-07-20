// ============================================================================
// muku-personLearningSystem.js v1.1 DISK_MOUNT - 사람 학습 및 기억 시스템 
// 💾 디스크 마운트 경로 적용: ./data → /data (완전 영구 저장!)
// 🧠 모르는 사람 감지 → 사용자 알려줌 → 기억 → 다음에 인식
// 💕 예진이가 점점 더 많은 사람들을 기억하고 관계를 이해하는 시스템
// 📸 투샷 + 장소/상황 기억으로 더 자연스러운 대화
// 🔧 디스크 마운트: 서버 재시작/재배포시에도 절대 사라지지 않는 완전한 영구 저장!
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ================== 📁 파일 경로 및 설정 (💾 디스크 마운트) ==================
// ⭐️ 디스크 마운트 경로로 변경! ⭐️
const PERSON_DB_PATH = '/data/learned_persons.json'; // 💾 ./data → /data 변경!
const PERSON_PHOTOS_DIR = '/data/person_photos'; // 💾 ./data → /data 변경!

const LEARNING_CONFIG = {
    MIN_CONFIDENCE_FOR_MATCH: 0.7,
    MAX_STORED_PHOTOS: 5,
    LEARNING_COOLDOWN: 60000,
    AUTO_SAVE_INTERVAL: 300000
};

// ================== 🎨 장소/상황별 예진이 반응 생성기 ==================
const LOCATION_KEYWORDS = {
    '가라오케': ['가라오케', '노래방', '노래', '마이크', '노래부르는', '노래하는', '코인노래방'],
    '카페': ['카페', '커피', '커피숍', '카페테리아', '스타벅스', '이디야', '커피전문점'],
    '술집': ['술집', '바', '펍', '맥주', '소주', '칵테일', '와인', '음주', '술마시는'],
    '식당': ['식당', '레스토랑', '음식점', '밥', '식사', '음식', '요리', '메뉴'],
    '야외': ['공원', '산', '바다', '해변', '강', '호수', '야외', '산책', '등산'],
    '쇼핑': ['쇼핑몰', '백화점', '마트', '쇼핑', '옷가게', '매장', '구매'],
    '사무실': ['사무실', '회사', '업무', '회의', '오피스', '직장'],
    '집': ['집', '집안', '거실', '부엌', '방', '집에서', '홈']
};

const PERSON_LOCATION_RESPONSES = {
    '가라오케': [
        "어? {name}이랑 가라오케 갔어? 노래 잘했어?",
        "{name}과 노래방이라니! 뭔 노래 불렀어?",
        "가라오케에서 {name}이랑 듀엣도 했어? 부럽다!",
        "{name}이랑 노래 부르는 모습 상상하니까 재밌겠다!",
        "노래방에서 {name}이랑 신나게 놀았구나! 목 안 아파?"
    ],
    '카페': [
        "어? {name}이랑 카페에서 만났네! 뭐 마셨어?",
        "{name}과 카페 데이트? 커피 맛있었어?",
        "카페에서 {name}이랑 수다 떨었구나! 뭔 얘기했어?",
        "{name}이랑 커피 마시면서 담소했어? 분위기 좋았겠다!",
        "카페에서 {name}이랑 여유로운 시간~ 부럽다!"
    ],
    '술집': [
        "어? {name}이랑 또 술 마셨어? 많이 마시지 마!",
        "{name}과 술자리! 취하지 않았지?",
        "술집에서 {name}이랑 뭔 얘기했어? 진솔한 대화했나?",
        "{name}이랑 술 마시면서 스트레스 풀었구나!",
        "또 {name}이랑 음주가무? 아저씨 간 걱정돼..."
    ],
    '식당': [
        "어? {name}이랑 맛있는 거 먹었어? 뭐 먹었는데?",
        "{name}과 식사! 음식 맛있었어?",
        "식당에서 {name}이랑 같이 밥 먹는 모습~ 보기 좋다!",
        "{name}이랑 뭐 먹었는지 궁금해! 나도 먹고 싶어!",
        "맛집에서 {name}이랑 식사했구나! 맛있었겠다!"
    ],
    '야외': [
        "어? {name}이랑 야외에서 만났네! 날씨 좋았어?",
        "{name}과 야외 데이트? 산책했어?",
        "밖에서 {name}이랑 시간 보냈구나! 상쾌했겠다!",
        "{name}이랑 자연 속에서~ 힐링됐겠다!",
        "야외에서 {name}이랑 활동적으로 보냈구나!"
    ],
    '기본': [
        "어? {name}이다! 또 만났네?",
        "{name}이랑 또 같이 있구나! 자주 만나네?",
        "{name}과 함께하는 시간~ 재밌어 보여!",
        "또 {name}이야! 정말 친한가 봐?",
        "{name}이랑 오늘은 뭐 했어?"
    ]
};

const MEETING_COUNT_RESPONSES = {
    1: "처음 보는 사람이네! 누구야?",
    2: "어? 이 사람 어디서 본 것 같은데... 누구였지?",
    3: "아! {name}이구나! 이제 기억했어!",
    4: "{name}이랑 꽤 자주 만나네? 친한가 봐!",
    5: "{name}은 이제 단골이네! ㅋㅋ",
    'many': "{name}이랑 정말 자주 만나는구나! 절친이야?"
};

// ================== 💾 데이터 구조 및 전역 변수 ==================
let personDatabase = new Map();
let lastLearningRequest = 0;
let pendingLearning = null;

// ================== 🛠️ 모든 함수를 최상위 레벨에서 정의 (구조 수정) ==================

function createPersonData(name, nationality = '한국인', relationship = '친구') {
    const now = new Date();
    return {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        nationality: nationality,
        relationship: relationship,
        firstMet: now,
        lastMet: now,
        meetingCount: 1,
        meetings: [],
        faceFeatures: [],
        confidence: 1.0,
        notes: [],
        favoriteLocations: new Map(),
        created: now,
        updated: now
    };
}

function createMeetingRecord(location, situation, photoAnalysis) {
    return {
        date: new Date(),
        location: location || '알 수 없음',
        situation: situation || '',
        photoId: `photo_${Date.now()}`,
        yejinReaction: '',
        photoAnalysis: photoAnalysis || {},
        timestamp: Date.now()
    };
}

async function loadPersonDatabase() {
    try {
        const data = await fs.readFile(PERSON_DB_PATH, 'utf8');
        const personArray = JSON.parse(data);
        personDatabase.clear();
        personArray.forEach(person => {
            personDatabase.set(person.id, person);
        });
        console.log(`🧠 [PersonLearning] 💾 데이터베이스 로드 완료: ${personDatabase.size}명 (디스크 마운트: /data/)`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('🧠 [PersonLearning] 💾 새로운 데이터베이스 생성 (디스크 마운트: /data/)');
            personDatabase = new Map();
            await savePersonDatabase();
        } else {
            console.error('🧠 [PersonLearning] 💾 데이터베이스 로드 실패:', error.message);
        }
    }
}

async function savePersonDatabase() {
    try {
        const personArray = Array.from(personDatabase.values());
        const jsonData = JSON.stringify(personArray, null, 2);
        const backupPath = PERSON_DB_PATH + '.backup';
        
        // 백업 생성
        if (await fs.access(PERSON_DB_PATH).then(() => true).catch(() => false)) {
            await fs.copyFile(PERSON_DB_PATH, backupPath);
        }
        
        await fs.writeFile(PERSON_DB_PATH, jsonData, 'utf8');
        console.log(`🧠 [PersonLearning] 💾 데이터베이스 저장 완료: ${personArray.length}명 (디스크 마운트: /data/)`);
    } catch (error) {
        console.error('🧠 [PersonLearning] 💾 데이터베이스 저장 실패:', error.message);
    }
}

function generatePersonLocationReaction(person, location) {
    const name = person.name;
    const meetingCount = person.meetingCount;
    let baseReaction = '';
    
    if (meetingCount <= 2) {
        baseReaction = MEETING_COUNT_RESPONSES[meetingCount];
    } else if (meetingCount <= 5) {
        baseReaction = MEETING_COUNT_RESPONSES[Math.min(meetingCount, 5)];
    } else {
        baseReaction = MEETING_COUNT_RESPONSES['many'];
    }
    
    const locationResponses = PERSON_LOCATION_RESPONSES[location] || PERSON_LOCATION_RESPONSES['기본'];
    const locationReaction = locationResponses[Math.floor(Math.random() * locationResponses.length)];
    const finalReaction = locationReaction.replace(/{name}/g, name);
    
    if (Math.random() < 0.3 && meetingCount > 2) {
        const countComment = meetingCount > 5 ?
            ` ${name}이랑 정말 자주 만나네!` :
            ` ${name}이랑 ${meetingCount}번째 만남이구나!`;
        return finalReaction + countComment;
    }
    
    return finalReaction;
}

async function findMatchingPerson(base64Image) {
    try {
        const imageSize = Buffer.from(base64Image, 'base64').length;
        const imageHash = base64Image.slice(0, 100);
        
        for (const person of personDatabase.values()) {
            for (const feature of person.faceFeatures) {
                if (Math.abs(feature.size - imageSize) < 50000 &&
                    feature.hash === imageHash) {
                    console.log(`🧠 [PersonMatching] 💾 매칭된 사람: ${person.name} (디스크 저장소)`);
                    return person;
                }
            }
        }
        
        console.log('🧠 [PersonMatching] 💾 매칭되는 사람 없음 (디스크 저장소)');
        return null;
    } catch (error) {
        console.error('🧠 [PersonMatching] 💾 매칭 실패:', error.message);
        return null;
    }
}

function addMeetingRecord(person, meetingRecord) {
    person.meetings.push(meetingRecord);
    person.meetingCount++;
    person.lastMet = meetingRecord.date;
    person.updated = new Date();
    
    const location = meetingRecord.location;
    const currentCount = person.favoriteLocations.get(location) || 0;
    person.favoriteLocations.set(location, currentCount + 1);
    
    console.log(`🧠 [PersonLearning] 💾 ${person.name} 만남 기록 추가: ${location} (총 ${person.meetingCount}회) (디스크 저장)`);
}

function extractNameFromInput(userInput) {
    const patterns = [
        /이\s*사람은\s*([가-힣a-zA-Z]+)/,
        /이건\s*([가-힣a-zA-Z]+)/,
        /이게\s*([가-힣a-zA-Z]+)/,
        /([가-힣a-zA-Z]+)이야/,
        /([가-힣a-zA-Z]+)야/,
        /([가-힣a-zA-Z]+)이지/,
        /([가-힣a-zA-Z]+)지/,
        /이름은\s*([가-힣a-zA-Z]+)/,
        /^([가-힣a-zA-Z]+)$/
    ];
    
    for (const pattern of patterns) {
        const match = userInput.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

function generateLearningSuccessMessage(name, location) {
    const messages = {
        '가라오케': [
            `아! ${name}이구나! 기억할게! 가라오케에서 만났네~ 노래 잘해?`,
            `${name}! 이름 예쁘다! 가라오케에서 처음 만났구나!`,
            `${name}이라고 하는구나! 가라오케 자주 가는 편이야?`
        ],
        '카페': [
            `아! ${name}이구나! 기억할게! 카페에서 만났네~ 커피 좋아해?`,
            `${name}! 카페에서 처음 만난 거네! 어떤 커피 마셔?`,
            `${name}이라는 이름이구나! 카페 데이트 자주 해?`
        ],
        '술집': [
            `아! ${name}이구나! 술집에서 만났네~ 술 잘 마셔?`,
            `${name}! 기억할게! 술자리에서 만난 친구구나!`,
            `${name}이라고 하는구나! 아저씨랑 술친구야?`
        ],
        '기본': [
            `아! ${name}이구나! 기억할게! 앞으로 자주 만날 것 같은데?`,
            `${name}! 이름 예쁘다! 아저씨 친구구나!`,
            `${name}이라는 이름이구나! 반가워!`
        ]
    };
    
    const locationMessages = messages[location] || messages['기본'];
    return locationMessages[Math.floor(Math.random() * locationMessages.length)];
}

async function getPhotoAnalysisFromFaceMatcher(base64Image) {
    try {
        const faceMatcher = require('./faceMatcher');
        
        if (faceMatcher.analyzePhotoWithOpenAI) {
            const result = await faceMatcher.analyzePhotoWithOpenAI(base64Image);
            if (result) {
                return {
                    type: result.classification,
                    content: result.content,
                    message: result.reaction
                };
            }
        }
        
        if (faceMatcher.detectFaceMatch) {
            const result = await faceMatcher.detectFaceMatch(base64Image);
            return {
                type: result.type,
                content: result.content || '',
                message: result.message
            };
        }
        
        throw new Error('faceMatcher 함수 없음');
    } catch (error) {
        console.error('🧠 [PhotoAnalysis] 💾 faceMatcher 연동 실패:', error.message);
        return {
            type: '기타',
            content: '',
            message: null
        };
    }
}

function detectLocationFromPhoto(photoAnalysis) {
    const content = photoAnalysis.content?.toLowerCase() || '';
    
    for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                console.log(`🧠 [LocationDetect] 💾 감지된 장소: ${location} (키워드: ${keyword}) (디스크 저장)`);
                return {
                    location: location,
                    confidence: 'detected',
                    description: `${location}에서`
                };
            }
        }
    }
    
    return {
        location: '기본',
        confidence: 'unknown',
        description: '어디선가'
    };
}

function requestPersonLearning(base64Image, locationInfo, photoAnalysis) {
    const now = Date.now();
    
    if (now - lastLearningRequest < LEARNING_CONFIG.LEARNING_COOLDOWN) {
        return {
            type: 'learning_cooldown',
            isLearning: false,
            message: "조금 전에 물어봤잖아~ 잠깐만 기다려줘!"
        };
    }
    
    pendingLearning = {
        base64Image: base64Image,
        locationInfo: locationInfo,
        photoAnalysis: photoAnalysis,
        timestamp: now
    };
    
    lastLearningRequest = now;
    
    const locationReactions = {
        '가라오케': "어? 누구야? 가라오케에서 만난 새로운 친구? 이름이 뭐야?",
        '카페': "모르는 사람이네! 카페에서 만났어? 누구야? 이름 알려줘!",
        '술집': "누구지? 술집에서 만난 사람? 이름이 뭐야?",
        '식당': "어? 이 사람 누구야? 같이 밥 먹은 친구? 이름 알려줘!",
        '기본': "어? 누구야? 새로운 친구? 이름이 뭔지 알려줘!"
    };
    
    const message = locationReactions[locationInfo.location] || locationReactions['기본'];
    
    console.log(`🧠 [PersonLearning] 💾 새로운 사람 학습 요청: ${locationInfo.location} (디스크 저장소 대기)`);
    
    return {
        type: 'learning_request',
        isLearning: true,
        location: locationInfo.location,
        message: message
    };
}

async function handleCouplePhotoWithUnknownPerson(base64Image, locationInfo, photoAnalysis) {
    const matchedPerson = await findMatchingPerson(base64Image);
    
    if (matchedPerson) {
        const meetingRecord = createMeetingRecord(
            locationInfo.location,
            photoAnalysis.content,
            photoAnalysis
        );
        
        addMeetingRecord(matchedPerson, meetingRecord);
        const reaction = generatePersonLocationReaction(matchedPerson, locationInfo.location);
        meetingRecord.yejinReaction = reaction;
        
        console.log(`🧠 [PersonLearning] 💾 알려진 사람과 만남: ${matchedPerson.name} @ ${locationInfo.location} (디스크 저장)`);
        
        return {
            type: 'known_person_meeting',
            isLearning: false,
            personName: matchedPerson.name,
            location: locationInfo.location,
            meetingCount: matchedPerson.meetingCount,
            message: reaction
        };
    } else {
        return requestPersonLearning(base64Image, locationInfo, photoAnalysis);
    }
}

async function handleUnknownPersonPhoto(base64Image, locationInfo, photoAnalysis) {
    const matchedPerson = await findMatchingPerson(base64Image);
    
    if (matchedPerson) {
        const reaction = `어? ${matchedPerson.name} 사진이네! ${matchedPerson.name}이 뭐 하는 거야?`;
        return {
            type: 'known_person_solo',
            isLearning: false,
            personName: matchedPerson.name,
            message: reaction
        };
    } else {
        return requestPersonLearning(base64Image, locationInfo, photoAnalysis);
    }
}

// 🌟 메인 함수들
async function initializePersonLearningSystem() {
    try {
        console.log('🧠 [PersonLearning] 💾 사람 학습 시스템 초기화 시작... (디스크 마운트: /data/)');
        
        // 💾 디스크 마운트 디렉토리 생성
        await fs.mkdir('/data', { recursive: true });
        await fs.mkdir(PERSON_PHOTOS_DIR, { recursive: true });
        
        await loadPersonDatabase();
        
        // 자동 저장 설정
        setInterval(savePersonDatabase, LEARNING_CONFIG.AUTO_SAVE_INTERVAL);
        
        console.log(`🧠 [PersonLearning] 💾 초기화 완료! 등록된 사람: ${personDatabase.size}명 (디스크 마운트로 완전 영구 저장!)`);
        return true;
    } catch (error) {
        console.error('🧠 [PersonLearning] 💾 초기화 실패:', error.message);
        return false;
    }
}

async function analyzeAndLearnPerson(base64Image, userId) {
    try {
        const photoAnalysis = await getPhotoAnalysisFromFaceMatcher(base64Image);
        
        if (!photoAnalysis.message) { 
            const locationInfo = detectLocationFromPhoto(photoAnalysis);
            
            if (photoAnalysis.type === 'couple_with_unknown' || photoAnalysis.type === 'new_person_group') {
                return await handleCouplePhotoWithUnknownPerson(base64Image, locationInfo, photoAnalysis);
            } else if (photoAnalysis.type === 'unknown_person_only') {
                return await handleUnknownPersonPhoto(base64Image, locationInfo, photoAnalysis);
            }
        }
        
        return {
            type: photoAnalysis.type,
            isLearning: false,
            message: photoAnalysis.message || "이 사진은 잘 모르겠어~"
        };
    } catch (error) {
        console.error('🧠 [PersonLearning] 💾 사람 식별 실패:', error.message);
        return {
            type: 'error',
            isLearning: false,
            message: "😅 사진 분석에 실패했어... 다시 보내줄래?"
        };
    }
}

async function learnPersonFromUserInput(userInput, userId) {
    try {
        if (!pendingLearning) {
            return {
                success: false,
                message: "🤔 지금은 새로 배울 사람이 없는데? 사진을 먼저 보내줘!"
            };
        }
        
        const name = extractNameFromInput(userInput);
        if (!name) {
            return {
                success: false,
                message: "🤔 이름을 정확히 알려줘! '이 사람은 OOO야' 이런 식으로!"
            };
        }
        
        const newPerson = createPersonData(name);
        
        const faceFeature = {
            hash: pendingLearning.base64Image.slice(0, 100),
            size: Buffer.from(pendingLearning.base64Image, 'base64').length,
            timestamp: Date.now()
        };
        newPerson.faceFeatures.push(faceFeature);
        
        const firstMeeting = createMeetingRecord(
            pendingLearning.locationInfo.location,
            pendingLearning.photoAnalysis.content,
            pendingLearning.photoAnalysis
        );
        
        const learningMessage = generateLearningSuccessMessage(name, pendingLearning.locationInfo.location);
        firstMeeting.yejinReaction = learningMessage;
        newPerson.meetings.push(firstMeeting);
        
        personDatabase.set(newPerson.id, newPerson);
        await savePersonDatabase();
        
        pendingLearning = null;
        
        console.log(`🧠 [PersonLearning] 💾 새로운 사람 학습 완료: ${name} @ ${firstMeeting.location} (디스크 마운트 저장)`);
        
        return {
            success: true,
            personName: name,
            location: firstMeeting.location,
            message: learningMessage
        };
    } catch (error) {
        console.error('🧠 [PersonLearning] 💾 사람 학습 실패:', error.message);
        return {
            success: false,
            message: "😅 학습에 실패했어... 다시 시도해볼래?"
        };
    }
}

// 📊 조회 및 관리 함수들
function getAllPersons() {
    return Array.from(personDatabase.values()).map(person => ({
        id: person.id,
        name: person.name,
        nationality: person.nationality,
        relationship: person.relationship,
        meetingCount: person.meetingCount,
        lastMet: person.lastMet,
        favoriteLocations: Object.fromEntries(person.favoriteLocations)
    }));
}

function getPersonByName(name) {
    for (const person of personDatabase.values()) {
        if (person.name === name) {
            return person;
        }
    }
    return null;
}

function getPersonLearningStats() {
    const totalPersons = personDatabase.size;
    const totalMeetings = Array.from(personDatabase.values())
        .reduce((sum, person) => sum + person.meetingCount, 0);
    
    const locationStats = {};
    for (const person of personDatabase.values()) {
        for (const [location, count] of person.favoriteLocations) {
            locationStats[location] = (locationStats[location] || 0) + count;
        }
    }
    
    return {
        totalPersons: totalPersons,
        totalMeetings: totalMeetings,
        averageMeetingsPerPerson: totalPersons > 0 ? Math.round(totalMeetings / totalPersons * 10) / 10 : 0,
        popularLocations: Object.entries(locationStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([location, count]) => ({ location, count })),
        isLearningActive: pendingLearning !== null,
        lastLearningRequest: lastLearningRequest,
        // 💾 디스크 마운트 정보 추가
        storagePath: '/data',
        persistentStorage: true,
        diskMounted: true,
        neverLost: true
    };
}

async function removePerson(name) {
    try {
        for (const [id, person] of personDatabase.entries()) {
            if (person.name === name) {
                personDatabase.delete(id);
                await savePersonDatabase();
                console.log(`🧠 [PersonLearning] 💾 사람 삭제: ${name} (디스크 마운트 저장)`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('🧠 [PersonLearning] 💾 사람 삭제 실패:', error.message);
        return false;
    }
}

function clearPendingLearning() {
    pendingLearning = null;
    console.log('🧠 [PersonLearning] 💾 학습 대기 상태 초기화');
}

module.exports = {
    // 🌟 핵심 기능
    initializePersonLearningSystem,
    analyzeAndLearnPerson,
    learnPersonFromUserInput,
    
    // 📊 조회 및 관리
    getAllPersons,
    getPersonByName,
    getPersonLearningStats,
    removePerson,
    clearPendingLearning,
    
    // 🎨 유틸리티
    generatePersonLocationReaction,
    detectLocationFromPhoto,
    createPersonData,
    createMeetingRecord
};
