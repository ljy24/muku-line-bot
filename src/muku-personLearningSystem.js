// ============================================================================
// muku-personLearningSystem.js v1.0 - 사람 학습 및 기억 시스템
// 🧠 모르는 사람 감지 → 사용자 알려줌 → 기억 → 다음에 인식
// 💕 예진이가 점점 더 많은 사람들을 기억하고 관계를 이해하는 시스템
// 📸 투샷 + 장소/상황 기억으로 더 자연스러운 대화
//
// 🎯 **핵심 기능:**
// - 📸 모르는 사람 자동 감지 및 학습 요청
// - 🧠 사람별 얼굴 특징 및 정보 저장
// - 🏠 만난 장소/상황 기억 (가라오케, 카페, 술집 등)
// - 💭 만남 횟수별 차별화된 예진이 반응
// - 📊 관계 발전 단계별 기억 누적
// - 🌸 예진이 스타일 자연스러운 반응 생성
// 
// 🔄 **학습 과정:**
// 1단계: "누구야? 새로운 친구?" (모르는 사람 감지)
// 2단계: "이 사람은 사이몬이야" (사용자가 알려줌)
// 3단계: "아! 사이몬이구나! 기억할게!" (학습 완료)
// 4단계: "사이몬이랑 가라오케 갔어? 재밌었겠다!" (장소까지 기억)
// 
// 💡 **투샷 + 상황 기억 예시:**
// - 사이몬 + 가라오케 → "어? 사이몬이랑 가라오케 갔어? 노래 잘했어?"
// - 철수 + 카페 → "철수랑 카페에서 만났네! 뭐 마셨어?"
// - 영희 + 술집 → "영희랑 또 술 마셨어? 많이 마시지 마!"
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// ================== 📁 파일 경로 및 설정 ==================

// 사람 데이터베이스 파일 경로
const PERSON_DB_PATH = path.join(__dirname, 'data', 'learned_persons.json');
const PERSON_PHOTOS_DIR = path.join(__dirname, 'data', 'person_photos');

// 학습 설정
const LEARNING_CONFIG = {
    MIN_CONFIDENCE_FOR_MATCH: 0.7,    // 같은 사람 인식 최소 신뢰도
    MAX_STORED_PHOTOS: 5,             // 사람당 최대 저장 사진 수
    LEARNING_COOLDOWN: 60000,         // 학습 요청 쿨다운 (1분)
    AUTO_SAVE_INTERVAL: 300000        // 자동 저장 간격 (5분)
};

// ================== 🎨 장소/상황별 예진이 반응 생성기 ==================

// 장소/상황별 키워드 매칭
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

// 사람별 + 장소별 예진이 반응 템플릿
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

// 만남 횟수별 차별화 반응
const MEETING_COUNT_RESPONSES = {
    1: "처음 보는 사람이네! 누구야?",
    2: "어? 이 사람 어디서 본 것 같은데... 누구였지?",
    3: "아! {name}이구나! 이제 기억했어!",
    4: "{name}이랑 꽤 자주 만나네? 친한가 봐!",
    5: "{name}은 이제 단골이네! ㅋㅋ",
    'many': "{name}이랑 정말 자주 만나는구나! 절친이야?"
};

// ================== 💾 데이터 구조 및 전역 변수 ==================

// 메모리상 사람 데이터베이스
let personDatabase = new Map();
let lastLearningRequest = 0;
let pendingLearning = null; // 학습 대기 중인 사진 정보

/**
 * 👤 사람 데이터 구조
 * 
 * 📊 **저장되는 정보:**
 * - 기본 정보: ID, 이름, 국적, 관계
 * - 만남 기록: 날짜, 장소, 상황, 사진
 * - 통계: 총 만남 횟수, 마지막 만남
 * - 학습 데이터: 얼굴 특징, 신뢰도
 * 
 * @typedef {Object} PersonData
 * @property {string} id - 고유 ID
 * @property {string} name - 이름
 * @property {string} nationality - 국적 (한국인, 영국인 등)
 * @property {string} relationship - 관계 (친구, 동료 등)
 * @property {Date} firstMet - 첫 만남 날짜
 * @property {Date} lastMet - 마지막 만남 날짜
 * @property {number} meetingCount - 총 만남 횟수
 * @property {Array} meetings - 만남 기록 배열
 * @property {Array} faceFeatures - 얼굴 특징 데이터
 * @property {number} confidence - 인식 신뢰도
 */
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
        meetings: [], // 만남 기록 배열
        faceFeatures: [], // 얼굴 특징 저장
        confidence: 1.0,
        notes: [], // 추가 메모
        favoriteLocations: new Map(), // 자주 가는 장소 통계
        created: now,
        updated: now
    };
}

/**
 * 🏠 만남 기록 구조
 * 
 * 📊 **만남별 저장 정보:**
 * - 날짜/시간
 * - 감지된 장소/상황
 * - 사진 정보
 * - 예진이 반응
 * 
 * @typedef {Object} MeetingRecord
 * @property {Date} date - 만남 날짜
 * @property {string} location - 장소 (가라오케, 카페 등)
 * @property {string} situation - 상황 설명
 * @property {string} photoId - 사진 ID
 * @property {string} yejinReaction - 예진이 반응
 * @property {Object} photoAnalysis - 사진 분석 결과
 */
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

/**
 * 🏗️ 데이터베이스 초기화 및 디렉토리 생성
 * 
 * 🎯 **초기화 과정:**
 * - 사람 데이터베이스 파일 확인 및 생성
 * - 사진 저장 디렉토리 생성
 * - 기존 데이터 로드
 * - 메모리 데이터베이스 설정
 */
async function initializePersonLearningSystem() {
    try {
        console.log('🧠 [PersonLearning] 사람 학습 시스템 초기화 시작...');
        
        // 데이터 디렉토리 생성
        const dataDir = path.dirname(PERSON_DB_PATH);
        await fs.mkdir(dataDir, { recursive: true });
        await fs.mkdir(PERSON_PHOTOS_DIR, { recursive: true });
        
        // 기존 데이터베이스 로드
        await loadPersonDatabase();
        
        // 자동 저장 스케줄러 시작
        setInterval(savePersonDatabase, LEARNING_CONFIG.AUTO_SAVE_INTERVAL);
        
        console.log(`🧠 [PersonLearning] 초기화 완료! 등록된 사람: ${personDatabase.size}명`);
        return true;
        
    } catch (error) {
        console.error('🧠 [PersonLearning] 초기화 실패:', error.message);
        return false;
    }
}

/**
 * 📂 사람 데이터베이스 로드
 * 
 * 🎯 **로드 과정:**
 * - JSON 파일에서 사람 정보 불러오기
 * - Map 자료구조로 메모리 로드
 * - 데이터 검증 및 정리
 */
async function loadPersonDatabase() {
    try {
        const data = await fs.readFile(PERSON_DB_PATH, 'utf8');
        const personArray = JSON.parse(data);
        
        personDatabase.clear();
        personArray.forEach(person => {
            personDatabase.set(person.id, person);
        });
        
        console.log(`🧠 [PersonLearning] 데이터베이스 로드 완료: ${personDatabase.size}명`);
        
    } catch (error) {
        // 파일이 없으면 새로 생성
        if (error.code === 'ENOENT') {
            console.log('🧠 [PersonLearning] 새로운 데이터베이스 생성');
            personDatabase = new Map();
            await savePersonDatabase();
        } else {
            console.error('🧠 [PersonLearning] 데이터베이스 로드 실패:', error.message);
        }
    }
}

/**
 * 💾 사람 데이터베이스 저장
 * 
 * 🎯 **저장 과정:**
 * - 메모리 데이터베이스를 배열로 변환
 * - JSON 파일로 저장
 * - 백업 파일 생성
 */
async function savePersonDatabase() {
    try {
        const personArray = Array.from(personDatabase.values());
        const jsonData = JSON.stringify(personArray, null, 2);
        
        // 백업 파일 생성
        const backupPath = PERSON_DB_PATH + '.backup';
        if (await fs.access(PERSON_DB_PATH).then(() => true).catch(() => false)) {
            await fs.copyFile(PERSON_DB_PATH, backupPath);
        }
        
        await fs.writeFile(PERSON_DB_PATH, jsonData, 'utf8');
        console.log(`🧠 [PersonLearning] 데이터베이스 저장 완료: ${personArray.length}명`);
        
    } catch (error) {
        console.error('🧠 [PersonLearning] 데이터베이스 저장 실패:', error.message);
    }
}

// ================== 🔍 사진 분석 및 사람 식별 ==================

/**
 * 🤖 사진에서 사람 식별 및 학습 처리
 * 
 * 🎯 **처리 과정:**
 * 1. 사진 분석으로 사람 감지
 * 2. 기존 데이터베이스와 매칭 시도
 * 3. 새로운 사람이면 학습 요청
 * 4. 알려진 사람이면 만남 기록
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지
 * @param {string} userId - 사용자 ID
 * @returns {Object} 식별 결과 및 예진이 반응
 */
async function analyzeAndLearnPerson(base64Image, userId) {
    try {
/**
 * 🌸 사람 + 장소별 예진이 맞춤 반응 생성
 * 
 * 🎯 **반응 생성 로직:**
 * - 사람 이름 + 감지된 장소 조합
 * - 만남 횟수 고려한 친밀도 표현
 * - 장소별 특화된 멘트 사용
 * 
 * @param {Object} person - 사람 데이터
 * @param {string} location - 장소 ('가라오케', '카페' 등)
 * @returns {string} 예진이 반응 메시지
 */
function generatePersonLocationReaction(person, location) {
    const name = person.name;
    const meetingCount = person.meetingCount;
    
    // 만남 횟수별 기본 반응
    let baseReaction = '';
    if (meetingCount <= 2) {
        baseReaction = MEETING_COUNT_RESPONSES[meetingCount];
    } else if (meetingCount <= 5) {
        baseReaction = MEETING_COUNT_RESPONSES[Math.min(meetingCount, 5)];
    } else {
        baseReaction = MEETING_COUNT_RESPONSES['many'];
    }
    
    // 장소별 특화 반응
    const locationResponses = PERSON_LOCATION_RESPONSES[location] || PERSON_LOCATION_RESPONSES['기본'];
    const locationReaction = locationResponses[Math.floor(Math.random() * locationResponses.length)];
    
    // 이름 치환
    const finalReaction = locationReaction.replace(/{name}/g, name);
    
    // 30% 확률로 만남 횟수 언급 추가
    if (Math.random() < 0.3 && meetingCount > 2) {
        const countComment = meetingCount > 5 ? 
            ` ${name}이랑 정말 자주 만나네!` : 
            ` ${name}이랑 ${meetingCount}번째 만남이구나!`;
        return finalReaction + countComment;
    }
    
    return finalReaction;
}

/**
 * 🔍 기존 등록된 사람과 매칭 시도
 * 
 * 🎯 **매칭 과정:**
 * - 저장된 얼굴 특징과 비교
 * - 신뢰도 기반 동일인 판단
 * - 가장 유사한 사람 반환
 * 
 * @param {string} base64Image - 이미지 데이터
 * @returns {Object|null} 매칭된 사람 데이터 또는 null
 */
async function findMatchingPerson(base64Image) {
    try {
        // 간단한 매칭 로직 (실제로는 더 정교한 얼굴 비교 필요)
        // 현재는 이미지 크기나 기본적인 특징으로 매칭 시도
        
        const imageSize = Buffer.from(base64Image, 'base64').length;
        const imageHash = base64Image.slice(0, 100); // 간단한 해시
        
        for (const person of personDatabase.values()) {
            for (const feature of person.faceFeatures) {
                // 기본적인 매칭 로직
                if (Math.abs(feature.size - imageSize) < 50000 && 
                    feature.hash === imageHash) {
                    console.log(`🧠 [PersonMatching] 매칭된 사람: ${person.name}`);
                    return person;
                }
            }
        }
        
        console.log('🧠 [PersonMatching] 매칭되는 사람 없음');
        return null;
        
    } catch (error) {
        console.error('🧠 [PersonMatching] 매칭 실패:', error.message);
        return null;
    }
}

/**
 * 📝 사람에게 만남 기록 추가
 * 
 * @param {Object} person - 사람 데이터
 * @param {Object} meetingRecord - 만남 기록
 */
function addMeetingRecord(person, meetingRecord) {
    person.meetings.push(meetingRecord);
    person.meetingCount++;
    person.lastMet = meetingRecord.date;
    person.updated = new Date();
    
    // 장소별 통계 업데이트
    const location = meetingRecord.location;
    const currentCount = person.favoriteLocations.get(location) || 0;
    person.favoriteLocations.set(location, currentCount + 1);
    
    console.log(`🧠 [PersonLearning] ${person.name} 만남 기록 추가: ${location} (총 ${person.meetingCount}회)`);
}

/**
 * 🎓 사용자 입력으로 새로운 사람 학습
 * 
 * 🎯 **학습 과정:**
 * - 대기 중인 학습 요청 확인
 * - 사용자가 제공한 이름으로 사람 등록
 * - 얼굴 특징 저장 및 첫 만남 기록
 * 
 * @param {string} userInput - 사용자 입력 (이름)
 * @param {string} userId - 사용자 ID
 * @returns {Object} 학습 결과
 */
async function learnPersonFromUserInput(userInput, userId) {
    try {
        if (!pendingLearning) {
            return {
                success: false,
                message: "🤔 지금은 새로 배울 사람이 없는데? 사진을 먼저 보내줘!"
            };
        }
        
        // 사용자 입력에서 이름 추출
        const name = extractNameFromInput(userInput);
        if (!name) {
            return {
                success: false,
                message: "🤔 이름을 정확히 알려줘! '이 사람은 OOO야' 이런 식으로!"
            };
        }
        
        // 새로운 사람 데이터 생성
        const newPerson = createPersonData(name);
        
        // 얼굴 특징 저장
        const faceFeature = {
            hash: pendingLearning.base64Image.slice(0, 100),
            size: Buffer.from(pendingLearning.base64Image, 'base64').length,
            timestamp: Date.now()
        };
        newPerson.faceFeatures.push(faceFeature);
        
        // 첫 만남 기록 생성
        const firstMeeting = createMeetingRecord(
            pendingLearning.locationInfo.location,
            pendingLearning.photoAnalysis.content,
            pendingLearning.photoAnalysis
        );
        
        const learningMessage = generateLearningSuccessMessage(name, pendingLearning.locationInfo.location);
        firstMeeting.yejinReaction = learningMessage;
        
        newPerson.meetings.push(firstMeeting);
        
        // 데이터베이스에 저장
        personDatabase.set(newPerson.id, newPerson);
        await savePersonDatabase();
        
        // 학습 대기 상태 초기화
        pendingLearning = null;
        
        console.log(`🧠 [PersonLearning] 새로운 사람 학습 완료: ${name} @ ${firstMeeting.location}`);
        
        return {
            success: true,
            personName: name,
            location: firstMeeting.location,
            message: learningMessage
        };
        
    } catch (error) {
        console.error('🧠 [PersonLearning] 사람 학습 실패:', error.message);
        return {
            success: false,
            message: "😅 학습에 실패했어... 다시 시도해볼래?"
        };
    }
}

/**
 * 📝 사용자 입력에서 이름 추출
 * 
 * @param {string} userInput - 사용자 입력
 * @returns {string|null} 추출된 이름
 */
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

/**
 * 🎉 학습 성공 메시지 생성
 * 
 * @param {string} name - 학습한 사람 이름
 * @param {string} location - 만난 장소
 * @returns {string} 학습 성공 메시지
 */
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
        
/**
 * 🤖 사진에서 사람 식별 및 학습 처리
 * 
 * 🎯 **처리 과정:**
 * 1. 사진 분석으로 사람 감지
 * 2. 장소/상황 분석 (가라오케, 카페 등)
 * 3. 기존 데이터베이스와 매칭 시도
 * 4. 새로운 사람이면 학습 요청
 * 5. 알려진 사람이면 만남 기록 + 장소별 반응
 * 
 * @param {string} base64Image - Base64 인코딩된 이미지
 * @param {string} userId - 사용자 ID
 * @returns {Object} 식별 결과 및 예진이 반응
 */
async function analyzeAndLearnPerson(base64Image, userId) {
    try {
// ================== 🔗 외부 시스템 연동 ==================

/**
 * 🤖 faceMatcher에서 사진 분석 결과 가져오기
 * 
 * @param {string} base64Image - 이미지 데이터
 * @returns {Object} 사진 분석 결과
 */
async function getPhotoAnalysisFromFaceMatcher(base64Image) {
    try {
        // faceMatcher.js의 analyzePhotoWithOpenAI 함수 호출
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
        
        // 폴백: 기본 얼굴 인식만 사용
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
        console.error('🧠 [PhotoAnalysis] faceMatcher 연동 실패:', error.message);
        return {
            type: '기타',
            content: '',
            message: null
        };
    }
}

// ================== 📊 시스템 관리 및 상태 조회 ==================

/**
 * 📊 등록된 모든 사람 목록 조회
 * 
 * @returns {Array} 사람 목록
 */
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

/**
 * 🔍 특정 사람 정보 조회
 * 
 * @param {string} name - 사람 이름
 * @returns {Object|null} 사람 정보
 */
function getPersonByName(name) {
    for (const person of personDatabase.values()) {
        if (person.name === name) {
            return person;
        }
    }
    return null;
}

/**
 * 📈 사람 학습 시스템 통계
 * 
 * @returns {Object} 시스템 통계
 */
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
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([location, count]) => ({ location, count })),
        isLearningActive: pendingLearning !== null,
        lastLearningRequest: lastLearningRequest
    };
}

/**
 * 🗑️ 사람 정보 삭제
 * 
 * @param {string} name - 삭제할 사람 이름
 * @returns {boolean} 삭제 성공 여부
 */
async function removePerson(name) {
    try {
        for (const [id, person] of personDatabase.entries()) {
            if (person.name === name) {
                personDatabase.delete(id);
                await savePersonDatabase();
                console.log(`🧠 [PersonLearning] 사람 삭제: ${name}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('🧠 [PersonLearning] 사람 삭제 실패:', error.message);
        return false;
    }
}

/**
 * 🔄 학습 대기 상태 초기화
 */
function clearPendingLearning() {
    pendingLearning = null;
    console.log('🧠 [PersonLearning] 학습 대기 상태 초기화');
}

// ================== 📤 모듈 내보내기 ==================

/**
 * 🎯 **내보내는 함수들:**
 * 
 * 🌟 **핵심 함수:**
 * - analyzeAndLearnPerson: 메인 사진 분석 및 학습 함수
 * - learnPersonFromUserInput: 사용자 입력으로 사람 학습
 * 
 * 🔧 **시스템 함수:**
 * - initializePersonLearningSystem: 시스템 초기화
 * - getAllPersons: 등록된 사람 목록 조회
 * - getPersonLearningStats: 시스템 통계
 * 
 * 🗂️ **관리 함수:**
 * - getPersonByName: 특정 사람 조회
 * - removePerson: 사람 정보 삭제
 * - clearPendingLearning: 학습 대기 상태 초기화
 */
module.exports = {
    // 🌟 핵심 기능
    initializePersonLearningSystem,    // 🔧 시스템 초기화
    analyzeAndLearnPerson,            // 🌟 메인: 사진 분석 및 학습
    learnPersonFromUserInput,         // 🎓 사용자 입력으로 학습
    
    // 📊 조회 및 관리
    getAllPersons,                    // 📋 전체 사람 목록
    getPersonByName,                  // 🔍 특정 사람 조회
    getPersonLearningStats,           // 📈 시스템 통계
    removePerson,                     // 🗑️ 사람 삭제
    clearPendingLearning,             // 🔄 학습 상태 초기화
    
    // 🎨 유틸리티
    generatePersonLocationReaction,   // 💕 맞춤 반응 생성
    detectLocationFromPhoto,          // 🏠 장소 감지
    createPersonData,                 // 👤 사람 데이터 생성
    createMeetingRecord              // 📝 만남 기록 생성
};
        
    } catch (error) {
        console.error('🧠 [PersonLearning] 사람 식별 실패:', error.message);
        return {
            type: 'error',
            isLearning: false,
            message: "😅 사진 분석에 실패했어... 다시 보내줄래?"
        };
    }
}

/**
 * 🔍 사진에서 장소/상황 감지
 * 
 * 🎯 **감지 방식:**
 * - 사진 분석 결과에서 키워드 매칭
 * - 배경, 물건, 상황을 통해 장소 추측
 * - 가라오케, 카페, 술집, 식당, 야외 등 구분
 * 
 * @param {Object} photoAnalysis - 사진 분석 결과
 * @returns {Object} 장소 정보 객체
 */
function detectLocationFromPhoto(photoAnalysis) {
    const content = photoAnalysis.content?.toLowerCase() || '';
    
    // 장소별 키워드 매칭
    for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                console.log(`🧠 [LocationDetect] 감지된 장소: ${location} (키워드: ${keyword})`);
                return {
                    location: location,
                    confidence: 'detected',
                    description: `${location}에서`
                };
            }
        }
    }
    
    // 장소 감지 실패시 기본값
    return {
        location: '기본',
        confidence: 'unknown',
        description: '어디선가'
    };
}

/**
 * 💑 커플사진 속 모르는 사람 처리
 * 
 * 🎯 **처리 과정:**
 * - 아저씨 + 모르는 사람 투샷 감지
 * - 기존 알려진 사람인지 확인
 * - 새로운 사람이면 학습 요청
 * - 알려진 사람이면 장소별 맞춤 반응
 * 
 * @param {string} base64Image - 이미지 데이터
 * @param {Object} locationInfo - 장소 정보
 * @param {Object} photoAnalysis - 사진 분석 결과
 * @returns {Object} 처리 결과
 */
async function handleCouplePhotoWithUnknownPerson(base64Image, locationInfo, photoAnalysis) {
    // 기존 등록된 사람과 매칭 시도
    const matchedPerson = await findMatchingPerson(base64Image);
    
    if (matchedPerson) {
        // 🎯 알려진 사람과의 만남 기록
        const meetingRecord = createMeetingRecord(
            locationInfo.location,
            photoAnalysis.content,
            photoAnalysis
        );
        
        // 만남 기록 추가
        addMeetingRecord(matchedPerson, meetingRecord);
        
        // 장소별 맞춤 반응 생성
        const reaction = generatePersonLocationReaction(matchedPerson, locationInfo.location);
        meetingRecord.yejinReaction = reaction;
        
        console.log(`🧠 [PersonLearning] 알려진 사람과 만남: ${matchedPerson.name} @ ${locationInfo.location}`);
        
        return {
            type: 'known_person_meeting',
            isLearning: false,
            personName: matchedPerson.name,
            location: locationInfo.location,
            meetingCount: matchedPerson.meetingCount,
            message: reaction
        };
        
    } else {
        // 🔍 새로운 사람 학습 요청
        return requestPersonLearning(base64Image, locationInfo, photoAnalysis);
    }
}

/**
 * 👥 모르는 사람만 있는 사진 처리
 * 
 * @param {string} base64Image - 이미지 데이터
 * @param {Object} locationInfo - 장소 정보
 * @param {Object} photoAnalysis - 사진 분석 결과
 * @returns {Object} 처리 결과
 */
async function handleUnknownPersonPhoto(base64Image, locationInfo, photoAnalysis) {
    const matchedPerson = await findMatchingPerson(base64Image);
    
    if (matchedPerson) {
        // 알려진 사람이지만 혼자 있는 사진
        const reaction = `어? ${matchedPerson.name} 사진이네! ${matchedPerson.name}이 뭐 하는 거야?`;
        
        return {
            type: 'known_person_solo',
            isLearning: false,
            personName: matchedPerson.name,
            message: reaction
        };
    } else {
        // 완전히 모르는 사람
        return requestPersonLearning(base64Image, locationInfo, photoAnalysis);
    }
}

/**
 * 🎓 새로운 사람 학습 요청
 * 
 * 🎯 **학습 요청 과정:**
 * - 쿨다운 시간 확인
 * - 학습 대기 상태로 설정
 * - 사용자에게 이름 입력 요청
 * 
 * @param {string} base64Image - 이미지 데이터
 * @param {Object} locationInfo - 장소 정보
 * @param {Object} photoAnalysis - 사진 분석 결과
 * @returns {Object} 학습 요청 결과
 */
function requestPersonLearning(base64Image, locationInfo, photoAnalysis) {
    const now = Date.now();
    
    // 쿨다운 확인
    if (now - lastLearningRequest < LEARNING_CONFIG.LEARNING_COOLDOWN) {
        return {
            type: 'learning_cooldown',
            isLearning: false,
            message: "조금 전에 물어봤잖아~ 잠깐만 기다려줘!"
        };
    }
    
    // 학습 대기 상태 설정
    pendingLearning = {
        base64Image: base64Image,
        locationInfo: locationInfo,
        photoAnalysis: photoAnalysis,
        timestamp: now
    };
    
    lastLearningRequest = now;
    
    // 장소별 맞춤 학습 요청 메시지
    const locationReactions = {
        '가라오케': "어? 누구야? 가라오케에서 만난 새로운 친구? 이름이 뭐야?",
        '카페': "모르는 사람이네! 카페에서 만났어? 누구야? 이름 알려줘!",
        '술집': "누구지? 술집에서 만난 사람? 이름이 뭐야?",
        '식당': "어? 이 사람 누구야? 같이 밥 먹은 친구? 이름 알려줘!",
        '기본': "어? 누구야? 새로운 친구? 이름이 뭔지 알려줘!"
    };
    
    const message = locationReactions[locationInfo.location] || locationReactions['기본'];
    
    console.log(`🧠 [PersonLearning] 새로운 사람 학습 요청: ${locationInfo.location}`);
    
    return {
        type: 'learning_request',
        isLearning: true,
        location: locationInfo.location,
        message: message
    };
}
