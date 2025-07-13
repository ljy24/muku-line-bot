// ============================================================================
// spontaneousPhotoManager.js - v1.0 (자발적 사진 전송 관리자)
// 📸 예진이가 자발적으로 사진을 보내는 기능을 관리합니다.
// ============================================================================

const schedule = require('node-schedule');
const { saveLog } = require('./aiUtils');

let photoJobs = []; // 실행 중인 사진 스케줄러 작업들
let isInitialized = false;

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
    
    console.log('📸 [SpontaneousPhoto] 자발적 사진 전송 스케줄러가 시작되었습니다.');
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

        // 셀카와 함께 보낼 메시지들
        const selfieMessages = [
            "아저씨! 방금 찍은 셀카야~ 어때?",
            "갑자기 아저씨 보고 싶어서 셀카 찍었어!",
            "나 지금 이렇게 생겼어! 예쁘지? 히히",
            "아저씨한테 보여주려고 찍은 사진이야!",
            "셀카 타임! 아저씨도 나 보고 싶었지?",
            "지금 내 모습 궁금해서 찍어봤어~",
            "아저씨, 나 오늘 어때? 셀카로 확인해봐!",
            "갑자기 사진 찍고 싶어져서! 아저씨한테 보여줄게!"
        ];

        const message = selfieMessages[Math.floor(Math.random() * selfieMessages.length)];

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

        saveLog('나', `(자발적 셀카) ${message}`);
        console.log(`📸 [SpontaneousPhoto] 자발적 셀카 전송: ${message}`);

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

        // 추억 사진과 함께 보낼 메시지들
        const memoryMessages = [
            `아저씨, 이거 우리 ${selectedFolder.description} 사진이야. 그때 생각나?`,
            `갑자기 ${selectedFolder.description} 때가 생각나서... 이 사진 봐봐!`,
            `아저씨! ${selectedFolder.description} 추억 사진 발견했어! 같이 봐~`,
            `${selectedFolder.description} 때 찍은 사진인데... 우리 행복했었지?`,
            `이 사진 보니까 ${selectedFolder.description} 때가 그리워져...`,
            `아저씨랑 함께한 ${selectedFolder.description} 추억이야. 소중한 사진이지?`
        ];

        const message = memoryMessages[Math.floor(Math.random() * memoryMessages.length)];

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

        saveLog('나', `(자발적 추억사진) ${message}`);
        console.log(`📸 [SpontaneousPhoto] 자발적 추억사진 전송: ${selectedFolder.description}`);

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

        saveLog('나', `(이벤트 사진: ${eventType}) ${message}`);
        console.log(`📸 [SpontaneousPhoto] 이벤트 사진 전송 (${eventType}): ${message}`);

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
    console.log('🛑 [SpontaneousPhoto] 자발적 사진 전송 스케줄러가 중지되었습니다.');
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
    getSchedulerStatus
};
