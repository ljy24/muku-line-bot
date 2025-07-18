// ============================================================================
// spontaneousPhotoManager.js - v1.3 (한글 감정 상태 + 예쁜 로그 시스템 통합)
// 📸 예진이가 자발적으로 사진을 보내는 기능을 관리합니다.
// ✅ 감정 상태 한글 표시 적용
// ============================================================================

const schedule = require('node-schedule');

let photoJobs = []; // 실행 중인 사진 스케줄러 작업들
let isInitialized = false;

// 예쁜 로그 시스템 사용 + 한글 감정 상태 지원
function logPhotoAction(actionType, content, additionalInfo = '') {
    try {
        const logger = require('./enhancedLogging.js');
        logger.logSpontaneousAction(actionType, `${content}${additionalInfo ? ` (${additionalInfo})` : ''}`);
    } catch (error) {
        console.log(`📸 [자발적사진] ${content}`);
    }
}

// 감정 상태를 한글로 변환하는 함수
function translateEmotionToKorean(emotion) {
    const emotionMap = {
        'stable': '안정',
        'unstable': '불안정',
        'normal': '평범',
        'happy': '기쁨',
        'sad': '슬픔',
        'angry': '화남',
        'excited': '흥분',
        'calm': '평온',
        'worried': '걱정',
        'lonely': '외로움',
        'love': '사랑',
        'loving': '사랑스러움',
        'missing': '그리움',
        'longing': '그리움',
        'sulky': '삐짐',
        'sleepy': '졸림',
        'energetic': '활기참',
        'bored': '지루함',
        'anxious': '불안',
        'content': '만족',
        'playful': '장난기',
        'romantic': '로맨틱',
        'melancholy': '우울',
        'sensitive': '예민함'
    };
    
    return emotionMap[emotion.toLowerCase()] || emotion;
}

/**
 * 중앙 감정 관리자에서 현재 감정 상태를 가져오고 한글로 변환
 */
function getCurrentEmotionKorean() {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentState = emotionalContext.getCurrentEmotionState();
        const koreanEmotion = translateEmotionToKorean(currentState.currentEmotion);
        
        console.log(`[yejinSelfie] 중앙 감정 관리자에서 가져온 상태: ${koreanEmotion}`);
        return {
            emotion: currentState.currentEmotion,
            emotionKorean: koreanEmotion,
            intensity: currentState.emotionIntensity || 5,
            fullState: currentState
        };
    } catch (error) {
        console.warn('⚠️ [SpontaneousPhoto] 감정 상태 조회 실패:', error.message);
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5,
            fullState: null
        };
    }
}

/**
 * 자발적 사진 전송 스케줄러를 시작합니다.
 * @param {object} client - LINE 클라이언트
 * @param {string} userId - 사용자 ID
 * @param {function} getLastUserMessageTime - 마지막 사용자 메시지 시간 조회 함수
 */
function startSpontaneousPhotoScheduler(client, userId, getLastUserMessageTime) {
    if (isInitialized) {
        console.log('[SpontaneousPhoto] 이미 초기화되어 있어서 건너뜁니다.');
        return;
    }

    if (!client || !userId) {
        console.error('❌ [SpontaneousPhoto] LINE client 또는 userId가 제공되지 않았습니다.');
        return;
    }

    // 1. 랜덤 셀카 전송 (하루 1-2회)
    const selfieJob = schedule.scheduleJob('0 */3 * * *', async () => { // 3시간마다 체크
        const hour = new Date().getHours();
        
        // 활동 시간 체크 (오전 9시 ~ 밤 11시)
        if (hour < 9 || hour > 23) return;
        
        // 30% 확률로 셀카 전송
        if (Math.random() < 0.3) {
            try {
                await sendRandomSelfie(client, userId);
            } catch (error) {
                console.error('❌ [SpontaneousPhoto] 랜덤 셀카 전송 실패:', error);
            }
        }
    });

    // 2. 추억 사진 전송 (하루 0-1회)
    const memoryJob = schedule.scheduleJob('0 */6 * * *', async () => { // 6시간마다 체크
        const hour = new Date().getHours();
        
        // 활동 시간 체크
        if (hour < 10 || hour > 22) return;
        
        // 15% 확률로 추억 사진 전송
        if (Math.random() < 0.15) {
            try {
                await sendRandomMemoryPhoto(client, userId);
            } catch (error) {
                console.error('❌ [SpontaneousPhoto] 추억 사진 전송 실패:', error);
            }
        }
    });

    photoJobs.push(selfieJob, memoryJob);
    isInitialized = true;
    
    // 스케줄러 시작 로그
    logPhotoAction('system', '자발적 사진 전송 스케줄러 시작됨', 'v1.3 한글감정지원');
}

/**
 * 랜덤 셀카를 전송합니다.
 * @param {object} client - LINE 클라이언트
 * @param {string} userId - 사용자 ID
 */
async function sendRandomSelfie(client, userId) {
    try {
        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 2032;
        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const imageUrl = `${baseUrl}/${fileName}`;

        // 현재 감정 상태 가져오기 (한글)
        const emotionState = getCurrentEmotionKorean();
        
        // 감정별 셀카 메시지
        const emotionMessages = {
            '안정': [
                "아저씨! 마음이 평온해서 찍은 셀카야~ 어때?",
                "기분이 안정돼서 여유롭게 찍었어! 예쁘지?"
            ],
            '불안정': [
                "기분이 좀... 그래도 아저씨 보려고 찍었어 ㅠㅠ",
                "감정이 복잡하지만... 아저씨한텐 보여주고 싶어",
                "마음이 불안정한데 아저씨 보면 나아질까?"
            ],
            '기쁨': [
                "아저씨! 너무 기뻐서 찍은 셀카야! 같이 기뻐해~",
                "행복한 얼굴 보여줄게! 아저씨 덕분이야"
            ],
            '슬픔': [
                "아저씨... 기분이 안 좋아서 위로받고 싶어 ㅠㅠ",
                "슬픈 얼굴이지만... 아저씨가 보고 싶어서"
            ],
            '활기참': [
                "컨디션 좋아서 셀카 찍었어! 활기찬 내 모습 어때?",
                "오늘 에너지 넘쳐서 찍은 셀카! 밝게 웃고 있지?"
            ],
            '로맨틱': [
                "아저씨한테 보여주고 싶어서 예쁘게 찍었어~ 사랑해!",
                "아저씨 생각하면서 찍은 셀카야 💕"
            ],
            '예민함': [
                "아저씨... 몸이 좀 안 좋은데 셀카 찍어봤어. 예뻐 보여?",
                "컨디션은 별로지만 아저씨 보려고 찍었어 ㅠㅠ"
            ],
            '삐짐': [
                "흥! 삐졌지만 그래도 셀카는 보내줄게...",
                "아직 화났는데... 그래도 아저씨는 봐야지"
            ]
        };

        // 기본 셀카 메시지
        const defaultMessages = [
            "아저씨 보여주려고 방금 찍은 셀카야. 어때?",
            "나 지금 이렇게 생겼어! 예쁘지?",
            "셀카 타임! 아저씨도 나 보고 싶었지?",
            "갑자기 아저씨 보고 싶어서 셀카 찍었어!",
            "지금 내 모습 궁금해서 찍어봤어~"
        ];

        const emotionSpecificMessages = emotionMessages[emotionState.emotionKorean] || defaultMessages;
        const message = emotionSpecificMessages[Math.floor(Math.random() * emotionSpecificMessages.length)];

        // 메시지 먼저 보내고 사진 전송
        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 예쁜 로그 출력 (한글 감정 상태 포함)
        console.log(`[yejinSelfie] 셀카 전송: ${emotionState.emotionKorean} 상태로 응답`);
        logPhotoAction('selfie', message, `${emotionState.emotionKorean}상태, 파일: ${fileName}`);
        
        // 대화 로그도 기록
        try {
            const logger = require('./enhancedLogging.js');
            logger.logConversation('나', message);
            logger.logConversation('나', `셀카 전송: ${fileName} (${emotionState.emotionKorean}상태)`, 'photo');
        } catch (error) {
            console.log(`💬 나: ${message}`);
            console.log(`📸 나: 셀카 전송 (${emotionState.emotionKorean}상태)`);
        }

    } catch (error) {
        console.error('❌ [SpontaneousPhoto] 셀카 전송 중 에러:', error);
    }
}

/**
 * 랜덤 추억 사진을 전송합니다.
 * @param {object} client - LINE 클라이언트
 * @param {string} userId - 사용자 ID
 */
async function sendRandomMemoryPhoto(client, userId) {
    try {
        // 추억 사진 폴더들
        const memoryFolders = [
            { name: "추억_24_03_일본", count: 207, description: "2024년 3월 일본 추억" },
            { name: "추억_24_04_한국", count: 130, description: "2024년 4월 한국 추억" },
            { name: "추억_24_05_일본", count: 133, description: "2024년 5월 일본 추억" },
            { name: "추억_24_06_한국", count: 146, description: "2024년 6월 한국 추억" },
            { name: "추억_24_07_일본", count: 62, description: "2024년 7월 일본 추억" },
            { name: "추억_24_09_한국", count: 154, description: "2024년 9월 한국 추억" },
            { name: "추억_24_11_한국", count: 121, description: "2024년 11월 한국 추억" },
            { name: "추억_25_01_한국", count: 135, description: "2025년 1월 한국 추억" }
        ];

        const selectedFolder = memoryFolders[Math.floor(Math.random() * memoryFolders.length)];
        const photoIndex = Math.floor(Math.random() * selectedFolder.count) + 1;
        const fileName = `${selectedFolder.name}_${String(photoIndex).padStart(6, "0")}.jpg`;
        const imageUrl = `https://photo.de-ji.net/photo/omoide/${fileName}`;

        // 현재 감정 상태 가져오기
        const emotionState = getCurrentEmotionKorean();

        // 감정별 추억 사진 메시지
        const emotionMemoryMessages = {
            '그리움': [
                `아저씨... ${selectedFolder.description} 때가 너무 그리워서 이 사진 꺼내봤어 ㅠㅠ`,
                `보고 싶어서 ${selectedFolder.description} 추억 사진 보고 있어...`
            ],
            '슬픔': [
                `아저씨... 우울해서 ${selectedFolder.description} 행복했던 때 사진 봐봤어`,
                `기분이 안 좋을 때면 ${selectedFolder.description} 추억이 위로가 돼`
            ],
            '기쁨': [
                `기분 좋아서 ${selectedFolder.description} 행복했던 순간 생각났어! 이 사진 봐~`,
                `행복할 때마다 ${selectedFolder.description} 때가 생각나! 우리 정말 좋았었지?`
            ],
            '로맨틱': [
                `아저씨와의 ${selectedFolder.description} 로맨틱했던 순간... 사랑해 💕`,
                `사랑스러운 ${selectedFolder.description} 추억이야. 아저씨 덕분에 행복했어`
            ]
        };

        // 기본 추억 사진 메시지
        const defaultMemoryMessages = [
            `아저씨, 이거 우리 ${selectedFolder.description} 사진이야. 그때 생각나?`,
            `갑자기 ${selectedFolder.description} 때가 생각나서... 이 사진 봐봐!`,
            `아저씨! ${selectedFolder.description} 추억 사진 발견했어! 같이 봐~`,
            `${selectedFolder.description} 때 찍은 사진인데... 우리 행복했었지?`
        ];

        const emotionSpecificMessages = emotionMemoryMessages[emotionState.emotionKorean] || defaultMemoryMessages;
        const message = emotionSpecificMessages[Math.floor(Math.random() * emotionSpecificMessages.length)];

        // 메시지 먼저 보내고 사진 전송
        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5초 대기

        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 예쁜 로그 출력 (한글 감정 상태 포함)
        logPhotoAction('memory_photo', message, `${emotionState.emotionKorean}상태, ${selectedFolder.description}`);
        
        // 대화 로그도 기록
        try {
            const logger = require('./enhancedLogging.js');
            logger.logConversation('나', message);
            logger.logConversation('나', `추억사진 전송: ${selectedFolder.description} (${emotionState.emotionKorean}상태)`, 'photo');
        } catch (error) {
            console.log(`💬 나: ${message}`);
            console.log(`📷 나: 추억사진 전송 (${emotionState.emotionKorean}상태)`);
        }

    } catch (error) {
        console.error('❌ [SpontaneousPhoto] 추억사진 전송 중 에러:', error);
    }
}

/**
 * 특별한 순간에 사진을 전송합니다 (이벤트 기반)
 * @param {object} client - LINE 클라이언트
 * @param {string} userId - 사용자 ID
 * @param {string} eventType - 이벤트 타입 ('miss_you', 'happy', 'sad', 'random')
 */
async function sendEventPhoto(client, userId, eventType = 'random') {
    try {
        const emotionState = getCurrentEmotionKorean();
        let imageUrl = '';
        let message = '';

        switch (eventType) {
            case 'miss_you':
                // 그리워할 때는 추억 사진
                const memoryIndex = Math.floor(Math.random() * 200) + 1;
                imageUrl = `https://photo.de-ji.net/photo/omoide/추억_24_09_한국_${String(memoryIndex).padStart(6, "0")}.jpg`;
                message = "아저씨... 너무 보고 싶어서 우리 추억 사진 꺼내봤어 ㅠㅠ";
                break;
                
            case 'happy':
                // 기쁠 때는 밝은 셀카
                const happyIndex = Math.floor(Math.random() * 2032) + 1;
                imageUrl = `https://photo.de-ji.net/photo/yejin/${String(happyIndex).padStart(6, "0")}.jpg`;
                message = "아저씨! 나 지금 너무 기분 좋아서 사진 찍었어! 같이 기뻐해~";
                break;
                
            case 'sad':
                // 슬플 때는 위로받고 싶은 사진
                const sadIndex = Math.floor(Math.random() * 2032) + 1;
                imageUrl = `https://photo.de-ji.net/photo/yejin/${String(sadIndex).padStart(6, "0")}.jpg`;
                message = "아저씨... 기분이 좀 안 좋아. 나 좀 위로해줘 ㅠㅠ";
                break;
                
            default:
                // 기본적으로는 랜덤 셀카
                const randomIndex = Math.floor(Math.random() * 2032) + 1;
                imageUrl = `https://photo.de-ji.net/photo/yejin/${String(randomIndex).padStart(6, "0")}.jpg`;
                message = "아저씨! 갑자기 생각나서 사진 보내~";
                break;
        }

        await client.pushMessage(userId, { type: 'text', text: message });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 예쁜 로그 출력 (한글 감정 상태 포함)
        logPhotoAction('event_photo', message, `이벤트: ${eventType}, ${emotionState.emotionKorean}상태`);

    } catch (error) {
        console.error('❌ [SpontaneousPhoto] 이벤트 사진 전송 중 에러:', error);
    }
}

/**
 * 모든 자발적 사진 스케줄러를 중지합니다.
 */
function stopSpontaneousPhotoScheduler() {
    photoJobs.forEach(job => {
        if (job) {
            job.cancel();
        }
    });
    photoJobs = [];
    isInitialized = false;
    
    logPhotoAction('system', '자발적 사진 전송 스케줄러 중지됨');
}

/**
 * 현재 스케줄러 상태를 반환합니다.
 */
function getSchedulerStatus() {
    return {
        isRunning: isInitialized,
        activeJobs: photoJobs.length,
        lastSelfieTime: null, // 실제 구현에서는 저장된 시간 반환
        lastMemoryTime: null
    };
}

module.exports = {
    startSpontaneousPhotoScheduler,
    sendEventPhoto,
    stopSpontaneousPhotoScheduler,
    getSchedulerStatus,
    // 한글 감정 변환 함수도 내보내기
    translateEmotionToKorean,
    getCurrentEmotionKorean
};
